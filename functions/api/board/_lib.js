// 掲示板APIの共有ヘルパー（KVのlist()を索引キー1本のget/putに置き換えるための共通ロジック）。
// ファイル名が"_"始まりなのでCloudflare Pages Functionsのルーティング対象にはならない
// （Cloudflareの規約＝"_"始まりのファイル/フォルダは共有コード用として自動除外される）。
//
// 2026-09-10、Workers KV無料枠の「1日list操作1,000回」を掲示板APIだけで超過しブロックされた事故の
// 恒久対策。GET/POST/PATCH/DELETEの全リクエストがpost:キーを毎回list()で全件スキャンしていたのを、
// 索引キー1本のget/putに置き換えて解消する（詳細はresearch-vault側
// `プロジェクト/miitobow公式サイト/進捗.md`2026-09-10エントリ・`lessons.md`2026-09-10エントリ参照）。

export const INDEX_KEY = "board:index";

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
