// PUT    /api/board/categories/<id>  -> カテゴリー名を修正 { name }
// DELETE /api/board/categories/<id>  -> カテゴリーを削除（image・videoは消せない）。X-Board-Pin必須。
//   投稿側のidは書き換えない（KVの書き込み回数を抑えるため）。消したidは `deleted:true` の印として一覧に残し、
//   画面（board.html）が、その印のidを投稿から隠す。
import { denyIfBadPin } from "../_lib.js";

const META_KEY = "meta:categories";
const MAX_NAME_LENGTH = 30;


export async function onRequestPut({ request, env, params }) {
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
  const dup = list.find((c) => !c.deleted && c.id !== params.id && c.name.toLowerCase() === name.toLowerCase());
  if (dup) {
    return new Response(
      JSON.stringify({ error: "duplicate", message: "そのカテゴリー名は既に使われています" }),
      { status: 409, headers: { "content-type": "application/json" } }
    );
  }

  if (target.deleted) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  target.name = name;
  await env.MIITOBOW_BOARD.put(META_KEY, JSON.stringify(list));
  return new Response(JSON.stringify(target), {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestDelete({ request, env, params }) {
  const denied = await denyIfBadPin(request, env);
  if (denied) return denied;
  if (params.id === "image" || params.id === "video") {
    return new Response(
      JSON.stringify({ error: "protected", message: "このカテゴリーは、画像・動画の投稿に自動で付くので削除できません" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  const raw = await env.MIITOBOW_BOARD.get(META_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const target = list.find((c) => c.id === params.id && !c.deleted);
  if (!target) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  target.deleted = true;
  target.name = "";
  await env.MIITOBOW_BOARD.put(META_KEY, JSON.stringify(list));
  return new Response(null, { status: 204 });
}
