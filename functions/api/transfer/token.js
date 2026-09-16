// POST /api/transfer/token  body: {id}
// 正規のPINヘッダーを持つリクエストだけが、そのid限定・15分間有効な閲覧用トークンを取得できる。
// <img src>やZIPダウンロードリンクなど、カスタムヘッダーを付けられない箇所はこのトークンを使う。

import { checkPin, unauthorized, validId, signToken } from "./_lib.js";

const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function onRequestPost({ request, env }) {
  if (!checkPin(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const id = body.id;
  if (!validId(id)) {
    return new Response(JSON.stringify({ error: "invalid_id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const exp = Date.now() + TOKEN_TTL_MS;
  const token = await signToken(env, id, exp);
  return new Response(JSON.stringify({ token, exp }), {
    headers: { "content-type": "application/json" },
  });
}
