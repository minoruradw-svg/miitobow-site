// 掲示板APIの共有ヘルパー（KVのlist()を索引キー1本のget/putに置き換えるための共通ロジック）。
// ファイル名が"_"始まりなのでCloudflare Pages Functionsのルーティング対象にはならない
// （Cloudflareの規約＝"_"始まりのファイル/フォルダは共有コード用として自動除外される）。
//
// 2026-09-10、Workers KV無料枠の「1日list操作1,000回」を掲示板APIだけで超過しブロックされた事故の
// 恒久対策。GET/POST/PATCH/DELETEの全リクエストがpost:キーを毎回list()で全件スキャンしていたのを、
// 索引キー1本のget/putに置き換えて解消する（詳細はresearch-vault側
// `プロジェクト/miitobow公式サイト/進捗.md`2026-09-10エントリ・`lessons.md`2026-09-10エントリ参照）。

export const INDEX_KEY = "board:index";
export const CACHE_KEY = "board:posts_cache";

// 索引エントリ: { id, key, createdAt, hasImages, hasVideo }（新しい順で保持）

async function rebuildIndexFromList(env) {
  // 索引が無い/壊れている時だけ通る復旧パス。post:キーを全件scanして索引を再構築し、
  // そのままputして次回以降はlist()が不要になるようにする（＝初回アクセス時の自動移行）。
  const list = await env.MIITOBOW_BOARD.list({ prefix: "post:" });
  const entries = [];
  for (const k of list.keys) {
    const raw = await env.MIITOBOW_BOARD.get(k.name);
    if (!raw) continue;
    let post;
    try {
      post = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    entries.push({
      id: post.id,
      key: k.name,
      createdAt: post.createdAt,
      hasImages: Array.isArray(post.images) && post.images.length > 0,
      hasVideo: !!post.video,
    });
  }
  entries.sort((a, b) => b.createdAt - a.createdAt);
  await env.MIITOBOW_BOARD.put(INDEX_KEY, JSON.stringify(entries));
  return entries;
}

export async function loadIndex(env) {
  const raw = await env.MIITOBOW_BOARD.get(INDEX_KEY);
  if (raw === null) {
    // 索引が無い＝旧データのまま or 初回。list()フォールバックで1回だけ復旧し、以降はget()のみになる。
    return rebuildIndexFromList(env);
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // 壊れていた場合もlist()から再構築して自己修復する。
  }
  return rebuildIndexFromList(env);
}

export async function saveIndex(env, entries) {
  await env.MIITOBOW_BOARD.put(INDEX_KEY, JSON.stringify(entries));
}

// ⚠️ 2026-09-11、索引化（list()解消）だけでは足りず、GET一覧取得が「索引1回＋投稿ごとに1回」の
// N+1回読み取りのままだったため、15秒間隔の自動更新（board.html）と組み合わさってKV無料枠の
// 1日読み取り上限に到達し続けた事故の恒久対策。一覧の中身（投稿本文まるごと）を1本の
// キャッシュキーに事前組み立てしておき、GETは常にこのキー1本のgetだけで完結させる
// （投稿件数が増えても・何回ポーリングされても読み取り回数が増えない設計）。
// キャッシュはPOST/PATCH/DELETEなど書き込み系の操作が起きた時だけ組み立て直す
// （書き込みは人間の操作起点で低頻度なので、そこでN回読むコストは無視できる）。
export async function rebuildCache(env, index) {
  const posts = await Promise.all(
    index.map(async (entry) => {
      const raw = await env.MIITOBOW_BOARD.get(entry.key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    })
  );
  const valid = posts.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
  await env.MIITOBOW_BOARD.put(CACHE_KEY, JSON.stringify(valid));
  return valid;
}

export async function loadCache(env, index) {
  const raw = await env.MIITOBOW_BOARD.get(CACHE_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // 壊れていたら下の再構築にフォールスルー。
    }
  }
  // キャッシュが無い/壊れている時だけ、その場でN+1回読み直して復旧する（自己修復・初回のみ）。
  return rebuildCache(env, index);
}

// ---- パスコード確認（2026-10-21：総当たり対策）----
// 同じIPから MAX_PIN_FAILS 回まちがえたら、LOCK_SECONDS 秒間は（正しいパスコードでも）受け付けない。
// 失敗回数はKVに「pinfail:<IP>」で持ち、最後の失敗から LOCK_SECONDS 秒で自動的に消える。
// 正しいパスコードで通れば回数は0に戻る。ヘッダーが空の要求（画面を開いただけ）は数えない。
export const MAX_PIN_FAILS = 10;
export const LOCK_SECONDS = 15 * 60;

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

// 通ればnull、通らなければ返すべきResponse（401＝違う／429＝まちがえすぎて一時停止中）を返す。
export async function denyIfBadPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = "pinfail:" + ip;
  let fails = 0;
  try {
    fails = parseInt((await env.MIITOBOW_BOARD.get(key)) || "0", 10) || 0;
  } catch (e) { fails = 0; }
  if (fails >= MAX_PIN_FAILS) {
    return jsonResponse({ error: "locked", retryAfterSeconds: LOCK_SECONDS }, 429);
  }
  if (env.BOARD_PIN && pin === env.BOARD_PIN) {
    if (fails > 0) { try { await env.MIITOBOW_BOARD.delete(key); } catch (e) {} }
    return null;
  }
  if (pin !== "") {
    try { await env.MIITOBOW_BOARD.put(key, String(fails + 1), { expirationTtl: LOCK_SECONDS }); } catch (e) {}
  }
  return jsonResponse({ error: "unauthorized" }, 401);
}
