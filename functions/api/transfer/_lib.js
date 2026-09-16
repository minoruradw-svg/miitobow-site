// transfer系エンドポイント共通のPINチェック・キー検証ヘルパー。
// 掲示板(board)と同じ環境変数 BOARD_PIN を流用（新しい秘密情報を増やさない）。

// ヘッダーでのPIN送信のみを許可する（クエリ文字列は閲覧履歴・サーバーログ・Referrerに
// 残ってしまうため、生のPINをURLに乗せない）。<img src>等ヘッダーを付けられない箇所は
// 代わりに下のsignToken/verifyTokenで発行する短命・id限定のトークンを使う。
export function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return !!env.BOARD_PIN && pin === env.BOARD_PIN;
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(env, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.BOARD_PIN),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

// id限定・有効期限付きの一時トークン発行（<img src>やダウンロードリンクなど、カスタム
// ヘッダーを付けられない箇所専用）。生のPINより漏えい時の被害範囲・寿命が小さい。
export async function signToken(env, id, expiresAt) {
  const sig = await hmac(env, `${id}:${expiresAt}`);
  return sig;
}

export async function verifyToken(env, id, token, expiresAt) {
  if (!token || !expiresAt) return false;
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmac(env, `${id}:${exp}`);
  return expected === token;
}

// リクエストがヘッダーPIN／クエリのid限定トークンのどちらか有効な方で認可されているか。
export async function checkAuth(request, env, id) {
  if (checkPin(request, env)) return true;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const exp = url.searchParams.get("exp") || "";
  if (!id) return false;
  return verifyToken(env, id, token, exp);
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
