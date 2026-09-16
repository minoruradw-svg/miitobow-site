// GET /api/transfer/zip?id=<id>&folder=<folder>
// 指定フォルダの中身を無圧縮ZIPにまとめて1ファイルとして返す（携帯側の「全部保存」用）。

import { checkAuth, unauthorized, validId, validSegment, MAX_TRANSFER_BYTES } from "./_lib.js";
import { zipStore } from "./_ziplib.js";

// ZIP化は全ファイルをメモリ上に保持してから固めるため（Workerのメモリ上限は128MB程度）、
// アップロード時の上限(MAX_TRANSFER_BYTES)とは別に、ここでも実測サイズで打ち切る
// 多重防御を入れる（アップロード側の上限チェックをすり抜けるレースや将来の変更に備える）。
const ZIP_MEMORY_CAP = MAX_TRANSFER_BYTES;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const folder = url.searchParams.get("folder") || "";
  if (!validId(id) || !validSegment(folder)) {
    return new Response(JSON.stringify({ error: "invalid_params" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!(await checkAuth(request, env, id))) return unauthorized();

  const prefix = `${id}/${folder}/`;
  const files = [];
  let totalBytes = 0;
  let cursor;
  do {
    const listed = await env.MIITOBOW_TRANSFER.list({ prefix, cursor });
    for (const obj of listed.objects) {
      const name = obj.key.slice(prefix.length);
      if (!name) continue;
      if (totalBytes + obj.size > ZIP_MEMORY_CAP) {
        return new Response(
          JSON.stringify({ error: "too_large", message: "このフォルダはまとめて保存するには大きすぎます。個別に保存してください" }),
          { status: 413, headers: { "content-type": "application/json" } }
        );
      }
      const body = await env.MIITOBOW_TRANSFER.get(obj.key);
      if (!body) continue;
      const bytes = new Uint8Array(await body.arrayBuffer());
      totalBytes += bytes.length;
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
