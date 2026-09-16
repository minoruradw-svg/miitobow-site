// PUT /api/transfer/upload?id=<id>&folder=<folder>&name=<filename>
// body = ファイルの生バイナリ。X-Board-Pin必須。
// R2キー: transfer/<id>/<folder>/<name>

import { checkPin, unauthorized, validId, validSegment, MAX_TRANSFER_BYTES, MAX_FILE_BYTES } from "./_lib.js";

export async function onRequestPut({ request, env }) {
  if (!checkPin(request, env)) return unauthorized();

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const folder = url.searchParams.get("folder") || "";
  const name = url.searchParams.get("name") || "";

  if (!validId(id) || !validSegment(folder) || !validSegment(name)) {
    return new Response(JSON.stringify({ error: "invalid_params" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES) {
    return new Response(
      JSON.stringify({ error: "file_too_large", message: `1ファイルは${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MBまでです` }),
      { status: 413, headers: { "content-type": "application/json" } }
    );
  }

  // 転送idごとの合計容量チェック（新規アップロード前に既存オブジェクトの合計を見る）
  const prefix = `${id}/`;
  let totalExisting = 0;
  let cursor;
  do {
    const listed = await env.MIITOBOW_TRANSFER.list({ prefix, cursor });
    for (const obj of listed.objects) totalExisting += obj.size;
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  if (totalExisting + contentLength > MAX_TRANSFER_BYTES) {
    return new Response(
      JSON.stringify({
        error: "transfer_too_large",
        message: `この転送の合計容量が上限(${Math.floor(MAX_TRANSFER_BYTES / 1024 / 1024)}MB)を超えます`,
      }),
      { status: 507, headers: { "content-type": "application/json" } }
    );
  }

  const key = `${id}/${folder}/${name}`;
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  await env.MIITOBOW_TRANSFER.put(key, request.body, {
    httpMetadata: { contentType },
  });

  return new Response(JSON.stringify({ ok: true, key }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}
