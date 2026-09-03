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
    await env.MIITOBOW_BOARD.delete(match.name);
  }
  return new Response(null, { status: 204 });
}
