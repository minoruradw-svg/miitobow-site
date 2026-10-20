// GET /api/board/image/<id>  -> 画像本体を返す（X-Board-Pin必須）
import { denyIfBadPin } from "../_lib.js";

export async function onRequestGet({ request, env, params }) {
  const denied = await denyIfBadPin(request, env);
  if (denied) return denied;
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
