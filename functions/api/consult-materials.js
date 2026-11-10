// 相談の「材料フォーム」（/services/materials/）用のAPI。
//
// 流れ：運営者が受付ごとに専用リンクを作る（POST ?action=link ＋ 合言葉）→ お客様にメールで送る →
//       お客様がリンクを開いて材料を入力（GET で相談内容を表示／POST で保存）→ 運営者のLINEに「材料が届きました」。
//
// 鍵：受付ごとに、推測できない長いランダム文字列を作る。保存するのは「ハッシュ」だけ（保存棚が漏れても鍵は分からない）。
//     リンクの鍵は、URLの「#」より後ろに入れる（サーバーのログ・Refererに残らない）。
// 保存先：相談の受付データ（consult:r:<ID>）の中。約6か月で自動的に消える（consult.js と同じ）。
// 現在の対象：紹介ページ・LP（kind=lp）・コスプレ小道具・フィギュア（kind=prop）・小さなWebツール（kind=tool）。「まだ決まっていない」は、分野が決まってから。
// 個人情報（メール）は、お客様側の画面には返さない。ログに内容を出さない。

import { denyIfBadPin } from "./board/_lib.js";
import { sendLine } from "./consult.js";

const RETENTION_TTL = 60 * 60 * 24 * 183;   // consult.js と同じ（約6か月）
const RATE_MAX = 40;                         // 同じ接続元から1時間に40回まで（表示・保存の合計）
const RATE_TTL = 3600;
const ID_RE = /^C-\d{8}-[0-9a-f]{6}$/;
const TOKEN_RE = /^[0-9a-f]{64}$/;
// 分野ごとに、受け付ける欄と最大文字数（これ以外の欄は捨てる）。url=1つのURL／urls=1行に1つのURL
const SCHEMAS = {
  lp: {
    service_name: { max: 100 }, offer_detail: { max: 3000 }, features: { max: 2000 }, evidence: { max: 2000 },
    price_info: { max: 600 }, schedule: { max: 600 }, cta_url: { max: 300, url: true }, must_words: { max: 600 },
    ng_words: { max: 600 }, assets_urls: { max: 1200, urls: true }, ref_urls: { max: 1200, urls: true },
    publish_pref: { max: 600 }, extra: { max: 2000 },
    // 2026-11-10追加（LPの質問シートの観点を、自分の言葉で組み直した7欄）
    buyer: { max: 300 }, hesitation: { max: 800 }, guarantee: { max: 600 }, cta_after: { max: 600 },
    payment_flow: { max: 600 }, brand: { max: 400 }, feel: { max: 300 },
  },
  // コスプレ小道具・フィギュア。住所・電話番号の欄は作らない（受け渡しが決まってからメールで聞く）
  prop: {
    item_name: { max: 200 }, rights_status: { max: 200 }, rights_source: { max: 1000 },
    ref_images_urls: { max: 1500, urls: true }, ref_notes: { max: 1500 }, size_detail: { max: 600 },
    usage: { max: 600 }, finish_pref: { max: 200 }, colors: { max: 800 }, parts_pref: { max: 800 },
    extras: { max: 600 }, deadline: { max: 300 }, must_words: { max: 1500 }, ng_words: { max: 1000 }, extra: { max: 2000 },
  },
  // 小さなWebツール・試作品。「計算・判定の決まりごと」と「入力と結果の例」が、正確に作るための要。
  // 個人情報・ログイン・決済が絡むものは、受けられない場合がある（判断は運営者。画面では断定しない）。
  tool: {
    tool_name: { max: 150 }, purpose: { max: 2000 }, users: { max: 1000 }, inputs: { max: 2500 },
    outputs: { max: 2000 }, rules: { max: 3000 }, examples: { max: 3000 }, screen_idea: { max: 1500 },
    devices: { max: 200 }, data_handling: { max: 200 }, data_notes: { max: 1000 }, publish_pref: { max: 600 },
    deadline: { max: 300 }, ref_urls: { max: 1200, urls: true }, assets_urls: { max: 1200, urls: true },
    must_words: { max: 1500 }, ng_words: { max: 1000 }, extra: { max: 2000 },
  },
};
const KINDS_OK = new Set(Object.keys(SCHEMAS));

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
async function sha(text, len = 64) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, len);
}
function newToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function clean(s, max) {
  return typeof s === "string" ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}
function validUrl(s) {
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch (e) { return false; }
}
function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function rateLimited(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = "consult:rlm:" + (await sha(ip, 24));
  let n = 0;
  try { n = parseInt((await env.MIITOBOW_BOARD.get(key)) || "0", 10) || 0; } catch (e) { n = 0; }
  if (n >= RATE_MAX) return true;
  try { await env.MIITOBOW_BOARD.put(key, String(n + 1), { expirationTtl: RATE_TTL }); } catch (e) { /* 続行 */ }
  return false;
}
async function loadRec(env, id) {
  if (!ID_RE.test(id || "")) return null;
  const raw = await env.MIITOBOW_BOARD.get("consult:r:" + id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
async function saveRec(env, rec) {
  await env.MIITOBOW_BOARD.put("consult:r:" + rec.id, JSON.stringify(rec), { expirationTtl: RETENTION_TTL });
}
// 鍵の確認。合っていれば記録を返す。間違い・無い・期限切れは、どれも同じ「無効」（理由は教えない）
async function authed(env, id, token) {
  if (!TOKEN_RE.test(token || "")) return null;
  const rec = await loadRec(env, id);
  if (!rec || !rec.mat || !rec.mat.token_hash) return null;
  const h = await sha(token);
  return safeEq(h, rec.mat.token_hash) ? rec : null;
}

// ---- 運営者：専用リンクを作る（合言葉つき） ----
async function makeLink(request, env) {
  const denied = await denyIfBadPin(request, env);
  if (denied) return denied;
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "invalid_body" }, 400); }
  const id = String((b && b.id) || "");
  const rec = await loadRec(env, id);
  if (!rec) return json({ error: "not_found" }, 404);
  if (!KINDS_OK.has(rec.kind)) return json({ error: "unsupported_kind", kind: rec.kind }, 400);
  const token = newToken();
  rec.mat = { token_hash: await sha(token), created_at: new Date().toISOString(), opened_at: null };
  await saveRec(env, rec);
  const origin = new URL(request.url).origin;
  return json({ ok: true, id, link: `${origin}/services/materials/?id=${id}#t=${token}` });
}

export async function onRequestPost({ request, env }) {
  if (!env.MIITOBOW_BOARD) return json({ error: "storage_unavailable" }, 503);
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "link") return makeLink(request, env);

  // ---- お客様：材料を保存 ----
  if (await rateLimited(request, env)) return json({ error: "rate_limited" }, 429);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "invalid_body" }, 400); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return json({ error: "invalid_body" }, 400);
  if (b.hp) return json({ ok: true });   // 罠の欄
  const rec = await authed(env, String(b.id || ""), String(b.t || ""));
  if (!rec) return json({ error: "invalid_link" }, 404);

  const input = b.materials && typeof b.materials === "object" ? b.materials : {};
  const fields = {};
  const errors = {};
  const schema = SCHEMAS[rec.kind] || {};
  for (const [k, def] of Object.entries(schema)) {
    const v = clean(input[k], def.max);
    if (!v) continue;
    if (def.url && !validUrl(v)) { errors[k] = "URLは http:// または https:// で始まる形式で入力してください。"; continue; }
    if (def.urls) {
      const bad = v.split(/\s+/).filter((x) => x && !validUrl(x));
      if (bad.length) { errors[k] = "URLは、1行に1つ、http:// または https:// で始まる形式で入力してください。"; continue; }
    }
    fields[k] = v;
  }
  if (Object.keys(errors).length) return json({ error: "validation", fields: errors }, 400);
  if (!Object.keys(fields).length) return json({ error: "validation", fields: { all: "1つ以上、入力してください。" } }, 400);

  const first = !rec.materials;
  rec.materials = { at: new Date().toISOString(), count: ((rec.materials && rec.materials.count) || 0) + 1, fields };
  rec.status = "materials";
  try { await saveRec(env, rec); } catch (e) { return json({ error: "save_failed" }, 500); }
  const NL = String.fromCharCode(10);
  const label = first ? "【材料が届きました】" : "【材料が更新されました】";
  const st = await sendLine(env, `${label}${NL}受付ID：${rec.id}${NL}（内容は秘書セッションで確認できます）`);
  rec.materials.notify = st;
  try { await saveRec(env, rec); } catch (e) { /* 保存済み */ }
  return json({ ok: true });
}

// ---- お客様：リンクを開いたとき（相談内容と、保存済みの材料を返す。メールは返さない） ----
export async function onRequestGet({ request, env }) {
  if (!env.MIITOBOW_BOARD) return json({ error: "storage_unavailable" }, 503);
  if (await rateLimited(request, env)) return json({ error: "rate_limited" }, 429);
  const url = new URL(request.url);
  const rec = await authed(env, url.searchParams.get("id") || "", request.headers.get("X-Materials-Token") || "");
  if (!rec) return json({ error: "invalid_link" }, 404);
  if (!rec.mat.opened_at) {
    rec.mat.opened_at = new Date().toISOString();
    try { await saveRec(env, rec); } catch (e) { /* 続行 */ }
  }
  return json({
    ok: true,
    id: rec.id,
    kind: rec.kind,
    name: rec.name || "",
    brief: rec.body || "",
    materials: rec.materials ? rec.materials.fields : {},
    updated_at: rec.materials ? rec.materials.at : null,
  });
}
