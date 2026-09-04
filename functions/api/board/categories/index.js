// GET  /api/board/categories  -> カテゴリー一覧（未初期化なら初期カテゴリーで初期化）
// POST /api/board/categories  -> カテゴリーを新規作成 { name }
// どちらもX-Board-Pin必須。

const META_KEY = "meta:categories";
const MAX_CATEGORIES = 200;
const MAX_NAME_LENGTH = 30;

const DEFAULT_CATEGORIES = [
  { id: "prompt", name: "プロンプト" },
  { id: "image", name: "画像" },
  { id: "memo", name: "メモ" },
];

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

async function loadCategories(env) {
  const raw = await env.MIITOBOW_BOARD.get(META_KEY);
  if (!raw) {
    await env.MIITOBOW_BOARD.put(META_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES.slice();
  }
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : DEFAULT_CATEGORIES.slice();
  } catch (e) {
    return DEFAULT_CATEGORIES.slice();
  }
}

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const list = await loadCategories(env);
  return new Response(JSON.stringify(list), {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
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

  const list = await loadCategories(env);
  const dup = list.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (dup) {
    return new Response(
      JSON.stringify({ error: "duplicate", message: "そのカテゴリーは既にあります", category: dup }),
      { status: 409, headers: { "content-type": "application/json" } }
    );
  }
  if (list.length >= MAX_CATEGORIES) {
    return new Response(
      JSON.stringify({ error: "limit_reached", message: `カテゴリー数が上限(${MAX_CATEGORIES}件)に達しています` }),
      { status: 507, headers: { "content-type": "application/json" } }
    );
  }

  const category = { id: crypto.randomUUID(), name };
  list.push(category);
  await env.MIITOBOW_BOARD.put(META_KEY, JSON.stringify(list));
  return new Response(JSON.stringify(category), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}
