// GET  /api/board   -> 投稿一覧（新しい順）
// POST /api/board   -> 投稿を追加
// どちらも X-Board-Pin ヘッダーがCloudflareの環境変数(BOARD_PIN)と一致しないと401。

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
  if (!text || text.length > 5000) {
    return new Response(JSON.stringify({ error: "invalid_text" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
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
