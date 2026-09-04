// GET /api/board/image/<id>  -> 画像本体を返す（X-Board-Pin必須）
function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

export async function onRequestGet({ request, env, params }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await env.MIITOBOW_BOARD.getWithMetadata(`img:${params.id}`, { type: "arrayBuffer" });
  if (!result || !result.value) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  const mime = (result.metadata && result.metadata.mime) || "image/jpeg";
  return new Response(result.value, {
    headers: { "content-type": mime, "cache-control": "private, max-age=31536000, immutable" },
  });
}
