// PUT /api/board/categories/<id>  -> カテゴリー名を修正 { name }
// X-Board-Pin必須。

const META_KEY = "meta:categories";
const MAX_NAME_LENGTH = 30;

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

export async function onRequestPut({ request, env, params }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return new Response(
      JSON.stringify({ error: "invalid_name", message: `カテゴリー名は1〜${MAX_NAME_LENGTH}文字です` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const raw = await env.MIITOBOW_BOARD.get(META_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const target = list.find((c) => c.id === params.id);
  if (!target) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  const dup = list.find((c) => c.id !== params.id && c.name.toLowerCase() === name.toLowerCase());
  if (dup) {
    return new Response(
      JSON.stringify({ error: "duplicate", message: "そのカテゴリー名は既に使われています" }),
      { status: 409, headers: { "content-type": "application/json" } }
    );
  }

  target.name = name;
  await env.MIITOBOW_BOARD.put(META_KEY, JSON.stringify(list));
  return new Response(JSON.stringify(target), {
    headers: { "content-type": "application/json" },
  });
}
