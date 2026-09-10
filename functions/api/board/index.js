// GET  /api/board   -> 投稿一覧（新しい順・画像本体は含まない。各画像は/api/board/image/<id>で個別取得）
// POST /api/board   -> 投稿を追加（text/imagesのどちらか、または両方。1投稿で複数枚OK）
// どちらも X-Board-Pin ヘッダーがCloudflareの環境変数(BOARD_PIN)と一致しないと401。
//
// ⚠️ post:キーの一覧はKVのlist()を毎回叩かず、_lib.jsの索引キー(board:index)で管理する
// （2026-09-10、list()の1日1,000回無料枠を掲示板だけで超過した事故の恒久対策）。

import { loadIndex, saveIndex } from "./_lib.js";

// バグ等による無限投稿・容量肥大を防ぐための上限（KV無料枠：保存1GB・書き込み1日1000件に対し、
// 十分すぎるほど余裕を持たせた値。個人用メモとして通常使う分には絶対に到達しない）。
const MAX_POSTS = 500;
// note記事の全文コピペ（数千字）にも余裕を持たせつつ、事故で巨大なテキストが
// 入らないよう上限を設定（KVは1件25MBまで可能だが、そこまでは要らない）。
const MAX_TEXT_LENGTH = 20000;
const MAX_TITLE_LENGTH = 200;
// 画像は元画質のままdata URLとして受け取る（リサイズ・圧縮なし）。1枚ずつ個別のKVキーに
// 保存するので、投稿本体（テキスト+画像ID一覧）のJSONが25MB上限に触れる心配はない。
const MAX_IMAGE_DATA_LENGTH = 21 * 1024 * 1024;
// 画像は「直近N枚」だけ残し、それより古い画像は自動で消してテキストだけ残す
// （元画質のまま複数枚貼れるようにする代わりに、容量が際限なく増えないようにする安全弁）。
const MAX_IMAGES = 20;

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

function base64ToBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// 画像は「直近20枚」だけ残す。旧形式（投稿に直接埋め込まれたdata URLの`image`フィールド）は
// 対象外（過去の投稿を壊さないよう触らない）。新形式の`images`（画像ID配列）だけを対象に、
// 新しい投稿から数えて20枚を超えた分の画像実体を削除し、投稿側の参照も外す。
// index引数＝呼び出し元が既に読み込み済みの索引（新しい順）。画像付きエントリ(hasImages)だけを
// 対象に、そのkeyからpost本体をgetする（list()は使わない）。
async function trimOldImages(env, index) {
  const candidates = index.filter((e) => e.hasImages);
  const items = [];
  for (const entry of candidates) {
    const raw = await env.MIITOBOW_BOARD.get(entry.key);
    if (!raw) continue;
    let post;
    try {
      post = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    if (Array.isArray(post.images) && post.images.length) items.push({ key: entry.key, post, entry });
  }
  items.sort((a, b) => b.post.createdAt - a.post.createdAt);

  let kept = 0;
  const toDelete = [];
  let indexChanged = false;
  for (const item of items) {
    const imgs = item.post.images;
    if (kept >= MAX_IMAGES) {
      toDelete.push(...imgs);
      item.post.images = [];
      await env.MIITOBOW_BOARD.put(item.key, JSON.stringify(item.post));
      // 画像を全て間引いたので索引のhasImagesも倒しておく（放置すると次回以降の
      // trimOldImagesが毎回この投稿を無駄にgetし続ける＝読み取り回数の緩やかな増加を招く）。
      item.entry.hasImages = false;
      indexChanged = true;
    } else if (kept + imgs.length <= MAX_IMAGES) {
      kept += imgs.length;
    } else {
      const keepCount = MAX_IMAGES - kept;
      toDelete.push(...imgs.slice(keepCount));
      item.post.images = imgs.slice(0, keepCount);
      await env.MIITOBOW_BOARD.put(item.key, JSON.stringify(item.post));
      kept = MAX_IMAGES;
    }
  }
  for (const id of toDelete) {
    await env.MIITOBOW_BOARD.delete(`img:${id}`);
  }
  if (indexChanged) {
    await saveIndex(env, index);
  }
}

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const index = await loadIndex(env);
  const posts = await Promise.all(
    index.map(async (entry) => {
      const raw = await env.MIITOBOW_BOARD.get(entry.key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    })
  );
  // indexは既に新しい順で保持しているが、フォーマット揺れに備えてここでも念のため並べ替える。
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
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const rawImages = Array.isArray(body.images) ? body.images : [];
  if (title.length > MAX_TITLE_LENGTH) {
    return new Response(
      JSON.stringify({ error: "invalid_title", message: `題名は${MAX_TITLE_LENGTH}文字までです（${title.length}文字）` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  const rawCategories = Array.isArray(body.categories)
    ? body.categories.filter((c) => typeof c === "string" && c.length && c.length <= 64).slice(0, 20)
    : [];

  for (const img of rawImages) {
    if (typeof img !== "string" || !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(img)) {
      return new Response(
        JSON.stringify({ error: "invalid_image", message: "画像の形式が正しくありません" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
    if (img.length > MAX_IMAGE_DATA_LENGTH) {
      return new Response(
        JSON.stringify({ error: "invalid_image", message: "画像サイズが大きすぎます。別の画像を試してください" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
  }
  if (rawImages.length > MAX_IMAGES) {
    return new Response(
      JSON.stringify({ error: "invalid_image", message: `1回に選べる画像は${MAX_IMAGES}枚までです` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  if ((!text && !rawImages.length && !title) || text.length > MAX_TEXT_LENGTH) {
    return new Response(
      JSON.stringify({ error: "invalid_text", message: `1件あたり${MAX_TEXT_LENGTH}文字までです（${text.length}文字）` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  // 現在の件数がMAX_POSTS以上なら新規投稿を拒否（索引の長さを見るだけ＝list()不要）
  const index = await loadIndex(env);
  if (index.length >= MAX_POSTS) {
    return new Response(
      JSON.stringify({ error: "limit_reached", message: `投稿数が上限(${MAX_POSTS}件)に達しています。古い投稿を削除してください。` }),
      { status: 507, headers: { "content-type": "application/json" } }
    );
  }

  const imageIds = [];
  for (const dataUrl of rawImages) {
    const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bytes = base64ToBytes(dataUrl);
    const imgId = crypto.randomUUID();
    await env.MIITOBOW_BOARD.put(`img:${imgId}`, bytes, { metadata: { mime } });
    imageIds.push(imgId);
  }

  // 画像を貼った投稿には「画像」カテゴリー(id: image)を自動付与する
  // （クライアント側でも自動選択するが、念のためサーバー側でも保証する）。
  const categories = Array.from(new Set(rawCategories));
  if (imageIds.length && !categories.includes("image")) {
    categories.push("image");
  }

  const createdAt = Date.now();
  const id = crypto.randomUUID();
  const post = { id, text, createdAt };
  if (title) post.title = title;
  if (imageIds.length) post.images = imageIds;
  if (categories.length) post.categories = categories;
  const key = `post:${createdAt}:${id}`;
  await env.MIITOBOW_BOARD.put(key, JSON.stringify(post));

  const newIndex = [{ id, key, createdAt, hasImages: imageIds.length > 0 }, ...index];
  await saveIndex(env, newIndex);
  if (imageIds.length) {
    await trimOldImages(env, newIndex);
  }
  return new Response(JSON.stringify(post), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}
