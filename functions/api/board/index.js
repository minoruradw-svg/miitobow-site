// GET  /api/board   -> 投稿一覧（新しい順）
// POST /api/board   -> 投稿を追加（text/imageのどちらか、または両方）
// どちらも X-Board-Pin ヘッダーがCloudflareの環境変数(BOARD_PIN)と一致しないと401。
//
// バグ等による無限投稿・容量肥大を防ぐための上限（KV無料枠：保存1GB・書き込み1日1000件に対し、
// 十分すぎるほど余裕を持たせた値。個人用メモとして通常使う分には絶対に到達しない）。
const MAX_POSTS = 500;
// note記事の全文コピペ（数千字）にも余裕を持たせつつ、事故で巨大なテキストが
// 入らないよう上限を設定（KVは1件25MBまで可能だが、そこまでは要らない）。
const MAX_TEXT_LENGTH = 20000;
// 画像はクライアント側でリサイズ済み（長辺1600px・JPEG）のdata URLを受け取る想定。
// 念のためのサーバー側上限（base64文字数。だいたい10MB前後のraw画像に相当）。
const MAX_IMAGE_DATA_LENGTH = 14 * 1024 * 1024;
// 画像は「直近N件の投稿」だけ残し、それより古い画像は自動で消してテキストだけ残す
// （携帯の写真をそのまま貼れるようにする代わりに、容量が際限なく増えないようにする安全弁）。
const MAX_IMAGE_POSTS = 3;

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

async function trimOldImages(env) {
  const list = await env.MIITOBOW_BOARD.list({ prefix: "post:" });
  const withImages = [];
  for (const k of list.keys) {
    const raw = await env.MIITOBOW_BOARD.get(k.name);
    if (!raw) continue;
    let post;
    try {
      post = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    if (post.image) withImages.push({ key: k.name, post });
  }
  withImages.sort((a, b) => b.post.createdAt - a.post.createdAt);
  const excess = withImages.slice(MAX_IMAGE_POSTS);
  for (const item of excess) {
    delete item.post.image;
    await env.MIITOBOW_BOARD.put(item.key, JSON.stringify(item.post));
  }
}

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const list = await env.MIITOBOW_BOARD.list({ prefix: "post:" });
  const posts = await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.MIITOBOW_BOARD.get(k.name);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    })
  );
  const valid = posts.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
  return new Response(JSON.stringify(valid), {
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
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const image = typeof body.image === "string" ? body.image : "";

  if (image && !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(image)) {
    return new Response(
      JSON.stringify({ error: "invalid_image", message: "画像の形式が正しくありません" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  if (image && image.length > MAX_IMAGE_DATA_LENGTH) {
    return new Response(
      JSON.stringify({ error: "invalid_image", message: "画像サイズが大きすぎます。別の画像を試してください" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  if ((!text && !image) || text.length > MAX_TEXT_LENGTH) {
    return new Response(
      JSON.stringify({ error: "invalid_text", message: `1件あたり${MAX_TEXT_LENGTH}文字までです（${text.length}文字）` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  // 現在の件数がMAX_POSTS以上なら新規投稿を拒否（limitに達した時点で打ち切って件数だけ見る＝軽量）
  const existing = await env.MIITOBOW_BOARD.list({ prefix: "post:", limit: MAX_POSTS });
  if (existing.keys.length >= MAX_POSTS) {
    return new Response(
      JSON.stringify({ error: "limit_reached", message: `投稿数が上限(${MAX_POSTS}件)に達しています。古い投稿を削除してください。` }),
      { status: 507, headers: { "content-type": "application/json" } }
    );
  }
  const createdAt = Date.now();
  const id = crypto.randomUUID();
  const post = image ? { id, text, image, createdAt } : { id, text, createdAt };
  await env.MIITOBOW_BOARD.put(`post:${createdAt}:${id}`, JSON.stringify(post));
  if (image) {
    await trimOldImages(env);
  }
  return new Response(JSON.stringify(post), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}
