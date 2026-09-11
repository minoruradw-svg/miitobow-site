// DELETE /api/board/<id>  -> 該当の投稿を削除。X-Board-Pin必須。
// PATCH  /api/board/<id>  -> 投稿にカテゴリーを1件追加 { categoryId }。X-Board-Pin必須。
//
// ⚠️ idからの検索はKVのlist()を使わず、_lib.jsの索引キー(board:index)で引く
// （2026-09-10、list()の1日1,000回無料枠を掲示板だけで超過した事故の恒久対策）。

import { loadIndex, saveIndex } from "./_lib.js";

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

async function findPost(env, id, index) {
  const entry = index.find((e) => e.id === id);
  if (!entry) return null;
  const raw = await env.MIITOBOW_BOARD.get(entry.key);
  if (!raw) return null;
  try {
    return { key: entry.key, post: JSON.parse(raw) };
  } catch (e) {
    return null;
  }
}

export async function onRequestPatch({ request, env, params }) {
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
  const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
  if (!categoryId) {
    return new Response(JSON.stringify({ error: "invalid_category", message: "カテゴリーが指定されていません" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const index = await loadIndex(env);
  const found = await findPost(env, params.id, index);
  if (!found) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  const post = found.post;
  const categories = Array.isArray(post.categories) ? post.categories : [];
  if (!categories.includes(categoryId)) categories.push(categoryId);
  post.categories = categories;
  await env.MIITOBOW_BOARD.put(found.key, JSON.stringify(post));
  return new Response(JSON.stringify(post), {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestDelete({ request, env, params }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const index = await loadIndex(env);
  const found = await findPost(env, params.id, index);
  if (found) {
    if (Array.isArray(found.post.images)) {
      for (const imgId of found.post.images) {
        await env.MIITOBOW_BOARD.delete(`img:${imgId}`);
      }
    }
    if (found.post.video) {
      await env.MIITOBOW_BOARD.delete(`vid:${found.post.video}`);
    }
    await env.MIITOBOW_BOARD.delete(found.key);
    await saveIndex(env, index.filter((e) => e.id !== params.id));
  }
  return new Response(null, { status: 204 });
}
