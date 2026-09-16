// GET /api/transfer/file?key=<id>/<folder>/<name>
// 1ファイルをそのままストリーム返却する（プレビュー表示・個別ダウンロード用）。

import { checkPin, unauthorized, validId, validSegment } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) return unauthorized();

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const parts = key.split("/");
  if (parts.length < 3 || !validId(parts[0]) || !parts.slice(1).every(validSegment)) {
    return new Response(JSON.stringify({ error: "invalid_key" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const obj = await env.MIITOBOW_TRANSFER.get(key);
  if (!obj) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const name = parts[parts.length - 1];
  // Content-Typeはアップロード時に呼び出し側が指定した値（=信用できない）なので、
  // 画像・動画の安全な型だけを許可し、それ以外は強制的にoctet-stream+添付扱いにする
  // （text/html等を返してしまうとstored XSSになるため）。
  const SAFE_TYPES = new Set([
    "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif",
    "video/mp4", "video/webm", "video/quicktime",
  ]);
  const storedType = obj.httpMetadata?.contentType || "";
  const isSafe = SAFE_TYPES.has(storedType);
  const headers = new Headers();
  headers.set("content-type", isSafe ? storedType : "application/octet-stream");
  headers.set("content-length", String(obj.size));
  headers.set("x-content-type-options", "nosniff");
  if (!isSafe || url.searchParams.get("download") === "1") {
    headers.set("content-disposition", `attachment; filename="${encodeURIComponent(name)}"`);
  }
  return new Response(obj.body, { headers });
}
