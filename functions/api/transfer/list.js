// GET /api/transfer/list?id=<id>
// idに紐づくR2オブジェクトを一覧し、フォルダ単位にグルーピングして返す。

import { checkPin, unauthorized, validId } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) return unauthorized();

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!validId(id)) {
    return new Response(JSON.stringify({ error: "invalid_id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const prefix = `${id}/`;
  const folders = {};
  let totalSize = 0;
  let cursor;
  do {
    const listed = await env.MIITOBOW_TRANSFER.list({ prefix, cursor, include: ["httpMetadata"] });
    for (const obj of listed.objects) {
      const rest = obj.key.slice(prefix.length); // "<folder>/<name>"
      const slashIdx = rest.indexOf("/");
      if (slashIdx === -1) continue;
      const folder = rest.slice(0, slashIdx);
      const name = rest.slice(slashIdx + 1);
      if (!folders[folder]) folders[folder] = [];
      folders[folder].push({
        key: obj.key,
        name,
        size: obj.size,
        contentType: obj.httpMetadata?.contentType || "application/octet-stream",
        uploaded: obj.uploaded,
      });
      totalSize += obj.size;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  for (const folder of Object.keys(folders)) {
    folders[folder].sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }

  return new Response(JSON.stringify({ id, folders, totalSize }), {
    headers: { "content-type": "application/json" },
  });
}
