// GET /api/transfer/zip?id=<id>&folder=<folder>
// 指定フォルダの中身を無圧縮ZIPにまとめて1ファイルとして返す（携帯側の「全部保存」用）。

import { checkPin, unauthorized, validId, validSegment } from "./_lib.js";
import { zipStore } from "./_ziplib.js";

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) return unauthorized();

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const folder = url.searchParams.get("folder") || "";
  if (!validId(id) || !validSegment(folder)) {
    return new Response(JSON.stringify({ error: "invalid_params" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const prefix = `${id}/${folder}/`;
  const files = [];
  let cursor;
  do {
    const listed = await env.MIITOBOW_TRANSFER.list({ prefix, cursor });
    for (const obj of listed.objects) {
      const name = obj.key.slice(prefix.length);
      if (!name) continue;
      const body = await env.MIITOBOW_TRANSFER.get(obj.key);
      if (!body) continue;
      const bytes = new Uint8Array(await body.arrayBuffer());
      files.push({ name, data: bytes });
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  if (!files.length) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const zipBytes = zipStore(files);
  const headers = new Headers();
  headers.set("content-type", "application/zip");
  headers.set("content-disposition", `attachment; filename="${encodeURIComponent(folder)}.zip"`);
  headers.set("content-length", String(zipBytes.length));
  return new Response(zipBytes, { headers });
}
