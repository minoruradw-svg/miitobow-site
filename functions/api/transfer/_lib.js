// transfer系エンドポイント共通のPINチェック・キー検証ヘルパー。
// 掲示板(board)と同じ環境変数 BOARD_PIN を流用（新しい秘密情報を増やさない）。

export function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || new URL(request.url).searchParams.get("pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

// idは英数字とハイフンのみ（crypto.randomUUID()前提）。folder/nameはパストラバーサルを防ぐため
// スラッシュ・..を禁止する。
const SAFE_ID = /^[a-zA-Z0-9-]{8,64}$/;
const SAFE_SEGMENT = /^[^\/\\]{1,200}$/;

export function validId(id) {
  return typeof id === "string" && SAFE_ID.test(id);
}
export function validSegment(seg) {
  return typeof seg === "string" && seg.length > 0 && SAFE_SEGMENT.test(seg) && seg !== "." && seg !== "..";
}

// 転送1件（id単位）の合計容量上限。無料枠(R2 10GB)に対して十分小さく、かつ
// LINEスタンプ1セット(画像40枚+動画数本)を複数まとめて送っても収まるサイズ。
export const MAX_TRANSFER_BYTES = 130 * 1024 * 1024; // 130MB（125MB想定+マージン）
export const MAX_FILE_BYTES = 60 * 1024 * 1024; // 1ファイルあたりの安全上限
