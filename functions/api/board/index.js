// GET  /api/board   -> 投稿一覧（新しい順）
// POST /api/board   -> 投稿を追加
// どちらも X-Board-Pin ヘッダーがCloudflareの環境変数(BOARD_PIN)と一致しないと401。
//
// バグ等による無限投稿・容量肥大を防ぐための上限（KV無料枠：保存1GB・書き込み1日1000件に対し、
// 十分すぎるほど余裕を持たせた値。個人用メモとして通常使う分には絶対に到達しない）。
const MAX_POSTS = 500;
// note記事の全文コピペ（数千字）にも余裕を持たせつつ、事故で巨大なテキストが
// 入らないよう上限を設定（KVは1件25MBまで可能だが、そこまでは要らない）。
const MAX_TEXT_LENGTH = 20000;

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const list = await env.MIITOBOW_BOARD.list({ prefix: "post:" });
  const posts = await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.MIITOBOW_BOARD.get(k.name);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    })
  );
  const valid = posts.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
  return new Response(JSON.stringify(valid), {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_TEXT_LENGTH) {
    return new Response(
      JSON.stringify({ error: "invalid_text", message: `1件あたり${MAX_TEXT_LENGTH}文字までです（${text.length}文字）` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  // 現在の件数がMAX_POSTS以上なら新規投稿を拒否（limitに達した時点で打ち切って件数だけ見る＝軽量）
  const existing = await env.MIITOBOW_BOARD.list({ prefix: "post:", limit: MAX_POSTS });
  if (existing.keys.length >= MAX_POSTS) {
    return new Response(
      JSON.stringify({ error: "limit_reached", message: `投稿数が上限(${MAX_POSTS}件)に達しています。古い投稿を削除してください。` }),
      { status: 507, headers: { "content-type": "application/json" } }
    );
  }
  const createdAt = Date.now();
  const id = crypto.randomUUID();
  const post = { id, text, createdAt };
  await env.MIITOBOW_BOARD.put(`post:${createdAt}:${id}`, JSON.stringify(post));
  return new Response(JSON.stringify(post), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}
