// DELETE /api/board/<id>  -> 該当の投稿を削除。X-Board-Pin必須。
// PATCH  /api/board/<id>  -> { categoryId }=カテゴリーを1件追加／{ removeCategoryId }=カテゴリーを1件外す／
//                            { title, text }=題名・本文の編集／{ hidden: true|false }=一覧で「非表示」にする・やめる。X-Board-Pin必須。
//
// ⚠️ idからの検索はKVのlist()を使わず、_lib.jsの索引キー(board:index)で引く
// （2026-09-10、list()の1日1,000回無料枠を掲示板だけで超過した事故の恒久対策）。

import { loadIndex, saveIndex, rebuildCache, loadCache, denyIfBadPin } from "./_lib.js";

const MAX_TEXT_LENGTH = 20000; // index.jsと同じ値
const MAX_TITLE_LENGTH = 200;  // index.jsと同じ値


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
  const denied = await denyIfBadPin(request, env);
  if (denied) return denied;
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
  const removeCategoryId = typeof body.removeCategoryId === "string" ? body.removeCategoryId.trim() : "";
  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
  const hasText = Object.prototype.hasOwnProperty.call(body, "text");
  const hasHidden = typeof body.hidden === "boolean";
  if (!categoryId && !removeCategoryId && !hasTitle && !hasText && !hasHidden) {
    return new Response(JSON.stringify({ error: "invalid_body", message: "変更する内容が指定されていません" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const newTitle = hasTitle ? (typeof body.title === "string" ? body.title.trim() : null) : undefined;
  const newText = hasText ? (typeof body.text === "string" ? body.text.trim() : null) : undefined;
  if (newTitle === null || newText === null) {
    return new Response(JSON.stringify({ error: "invalid_body", message: "題名・本文は文字で指定してください" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (newTitle !== undefined && newTitle.length > MAX_TITLE_LENGTH) {
    return new Response(JSON.stringify({ error: "invalid_title", message: `題名は${MAX_TITLE_LENGTH}文字までです（${newTitle.length}文字）` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (newText !== undefined && newText.length > MAX_TEXT_LENGTH) {
    return new Response(JSON.stringify({ error: "invalid_text", message: `1件あたり${MAX_TEXT_LENGTH}文字までです（${newText.length}文字）` }), {
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
  if (categoryId && !categories.includes(categoryId)) categories.push(categoryId);
  post.categories = removeCategoryId ? categories.filter((c) => c !== removeCategoryId) : categories;
  if (newTitle !== undefined) {
    if (newTitle) post.title = newTitle; else delete post.title;
  }
  if (newText !== undefined) post.text = newText;
  if (hasHidden) { if (body.hidden) post.hidden = true; else delete post.hidden; }
  // 空の投稿（題名も本文も画像も動画も無い）にはさせない
  const hasMedia = (Array.isArray(post.images) && post.images.length > 0) || !!post.image || !!post.video;
  if (!post.title && !post.text && !hasMedia) {
    return new Response(JSON.stringify({ error: "invalid_text", message: "題名か本文のどちらかは入れてください" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  await env.MIITOBOW_BOARD.put(found.key, JSON.stringify(post));
  await rebuildCache(env, index);
  return new Response(JSON.stringify(post), {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestDelete({ request, env, params }) {
  const denied = await denyIfBadPin(request, env);
  if (denied) return denied;
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
    // この投稿の「続き」は消さずに残し、ひも付け(parentId)だけ外す（独立した投稿に戻る）
    const cache = await loadCache(env, index);
    for (const child of cache) {
      if (child && child.parentId === params.id) {
        const ce = index.find((e) => e.id === child.id);
        if (!ce) continue;
        const craw = await env.MIITOBOW_BOARD.get(ce.key);
        if (!craw) continue;
        try {
          const cp = JSON.parse(craw);
          delete cp.parentId;
          await env.MIITOBOW_BOARD.put(ce.key, JSON.stringify(cp));
        } catch (e) { /* 壊れた投稿は触らない */ }
      }
    }
    const newIndex = index.filter((e) => e.id !== params.id);
    await saveIndex(env, newIndex);
    await rebuildCache(env, newIndex);
  }
  return new Response(null, { status: 204 });
}
