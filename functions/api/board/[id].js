// DELETE /api/board/<id>  -> 該当の投稿を削除。X-Board-Pin必須。

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

export async function onRequestDelete({ request, env, params }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const id = params.id;
  const list = await env.MIITOBOW_BOARD.list({ prefix: "post:" });
  const match = list.keys.find((k) => k.name.endsWith(":" + id));
  if (match) {
    const raw = await env.MIITOBOW_BOARD.get(match.name);
    if (raw) {
      try {
        const post = JSON.parse(raw);
        if (Array.isArray(post.images)) {
          for (const imgId of post.images) {
            await env.MIITOBOW_BOARD.delete(`img:${imgId}`);
          }
        }
      } catch (e) {}
    }
    await env.MIITOBOW_BOARD.delete(match.name);
  }
  return new Response(null, { status: 204 });
}
