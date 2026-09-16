// 一時デバッグ用：バケット内の全オブジェクトを一覧する（トラブルシュート後に削除予定）。
import { checkPin, unauthorized } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) return unauthorized();
  const all = [];
  let cursor;
  do {
    const listed = await env.MIITOBOW_TRANSFER.list({ cursor });
    for (const obj of listed.objects) all.push({ key: obj.key, size: obj.size, uploaded: obj.uploaded });
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return new Response(JSON.stringify({ count: all.length, objects: all }, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
