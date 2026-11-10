// POST /api/consult -> 制作サービスの「気軽な相談」ミニフォームの受付。
// GET  /api/consult -> 受付一覧（X-Board-Pinヘッダー必須。既存の掲示板PINを流用）。
//                      ?retry=1 を付けると、LINE通知が未送信の受付を再通知する。
//
// 保存先: 既存のMIITOBOW_BOARD KV（新しいネームスペースは作らない）。キーは「consult:r:<受付ID>」。
// 順序: 先に保存 → あとでLINE通知。通知が失敗しても受付データは失われない（notifyに状態を残す）。
// LINE通知: 環境変数LINE_TOKEN（Cloudflareのシークレット）がある時だけ送る。無ければ「未接続」と記録し、
//           受付成功の表示とは切り離す（通知の成否を偽装しない）。
// 通知本文は受付IDと相談の種類だけ。メールアドレスと相談内容は載せない。
// 個人情報（メール等）はログに出さない。

// 相談の分野（/services/ の実際のメニュー3本＋まだ決まっていない）。ミニフォームと整理ページで共通。
import { denyIfBadPin } from "./board/_lib.js";   // 合言葉の失敗回数でロックする、掲示板と共通の仕組み

const KINDS = {
  lp: "紹介ページ・LPを作りたい",
  tool: "小さなWebツール（試作品）を作りたい",
  prop: "コスプレ小道具・フィギュアを作りたい",
  undecided: "まだ決まっていない",
};
const SOURCES = { form: "ミニフォーム", organize: "整理シート" };   // 受付の経路（通知に載せる）
const MAX_BODY = 4000, MAX_URL = 300, MAX_NAME = 50, MAX_EMAIL = 254;
const RATE_MAX = 5;            // 同じ接続元から1時間に5件まで
const RATE_TTL = 3600;
const NL = String.fromCharCode(10);
const NOTIFY_DAILY_CAP = 30;   // 1日にLINEへ送る通知の上限（超えても受付は保存。LINEの月間の送信枠を守る）
const RETENTION_TTL = 60 * 60 * 24 * 183;   // 受付データの保管期間＝約6か月で自動的に消える（個人情報ページの記載と一致させること）
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
async function sha(text) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
function newId() {
  const d = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  const r = [...crypto.getRandomValues(new Uint8Array(3))].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `C-${d}-${r}`;
}
function cleanText(s, max) {
  return typeof s === "string" ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}
function validUrl(s) {
  if (!s) return true;
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch (e) { return false; }
}

// LINEへ1通送る共通の処理（1日の上限つき）。戻り値＝sent / failed / unconfigured / capped
export async function sendLine(env, text) {
  if (!env.LINE_TOKEN) return "unconfigured";
  // 1日の通知回数の上限（日付ごとのカウンタ。2日で消える）
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  const ckey = "consult:nc:" + day;
  let n = 0;
  try { n = parseInt((await env.MIITOBOW_BOARD.get(ckey)) || "0", 10) || 0; } catch (e) { n = 0; }
  if (n >= NOTIFY_DAILY_CAP) return "capped";
  try { await env.MIITOBOW_BOARD.put(ckey, String(n + 1), { expirationTtl: 172800 }); } catch (e) { /* 数えられなくても続行 */ }
  // 宛先：LINE_ADMIN_TO（運営者のユーザーID等）があれば、その宛先だけに送る。無ければ、既存のGoogleフォーム通知と同じ「友だち全員」への配信。
  const push = !!env.LINE_ADMIN_TO;
  const url = push ? "https://api.line.me/v2/bot/message/push" : "https://api.line.me/v2/bot/message/broadcast";
  const payload = push ? { to: env.LINE_ADMIN_TO, messages: [{ type: "text", text }] } : { messages: [{ type: "text", text }] };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + env.LINE_TOKEN },
      body: JSON.stringify(payload),
    });
    return res.ok ? "sent" : "failed";
  } catch (e) {
    return "failed";
  }
}

async function notifyLine(env, rec) {
  const text = `【新しいWeb制作の相談】${NL}受付ID：${rec.id}${NL}相談の種類：${KINDS[rec.kind]}${NL}経路：${SOURCES[rec.source] || SOURCES.form}${NL}（内容は秘書セッションで確認できます）`;
  return sendLine(env, text);
}

export async function onRequestPost({ request, env }) {
  if (!env.MIITOBOW_BOARD) return json({ error: "storage_unavailable" }, 503);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "invalid_body" }, 400); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return json({ error: "invalid_body" }, 400);

  // 迷惑送信対策: 見えない欄（honeypot）に値が入っていたら、受け付けたふりをして捨てる
  if (b && b.hp) return json({ ok: true, id: "C-ignored" });

  const kind = String(b.kind || "");
  const source = SOURCES[b.source] ? String(b.source) : "form";
  const body = cleanText(b.body, MAX_BODY);
  const url = cleanText(b.url, MAX_URL);
  const name = cleanText(b.name, MAX_NAME);
  const email = cleanText(b.email, MAX_EMAIL);
  const idem = /^[0-9a-f-]{16,64}$/i.test(String(b.key || "")) ? String(b.key) : "";

  const errors = {};
  if (!Object.prototype.hasOwnProperty.call(KINDS, kind)) errors.kind = "相談の種類を選んでください。";
  if (!EMAIL_RE.test(email)) errors.email = "メールアドレスの形式を確認してください。";
  if (!validUrl(url)) errors.url = "URLは http:// または https:// で始まる形式で入力してください。";
  if (b.agree !== true) errors.agree = "個人情報の取り扱いへの同意が必要です。";
  if (Object.keys(errors).length) return json({ error: "validation", fields: errors }, 400);

  // 二重送信の防止: 同じ送信キーなら、前回の受付をそのまま返す
  if (idem) {
    const prev = await env.MIITOBOW_BOARD.get("consult:k:" + idem);
    if (prev) return json({ ok: true, id: prev, duplicate: true });
  }

  // 短時間の大量送信の制限（接続元はハッシュ化して保持。1時間で消える）
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rkey = "consult:rl:" + (await sha(ip));
  const cnt = parseInt((await env.MIITOBOW_BOARD.get(rkey)) || "0", 10);
  if (cnt >= RATE_MAX) return json({ error: "rate_limited" }, 429);
  await env.MIITOBOW_BOARD.put(rkey, String(cnt + 1), { expirationTtl: RATE_TTL });

  const rec = {
    id: newId(), at: new Date().toISOString(), kind, source, body, url, name, email,
    notify: "pending", status: "new",
  };
  // 1) 保存（これに失敗したら、受付成功とは言わない）
  try {
    await env.MIITOBOW_BOARD.put("consult:r:" + rec.id, JSON.stringify(rec), { expirationTtl: RETENTION_TTL });
    if (idem) await env.MIITOBOW_BOARD.put("consult:k:" + idem, rec.id, { expirationTtl: 86400 });
  } catch (e) {
    return json({ error: "save_failed" }, 500);
  }
  // 2) 通知（失敗しても受付は成功のまま。状態だけ残す）
  rec.notify = await notifyLine(env, rec);
  try { await env.MIITOBOW_BOARD.put("consult:r:" + rec.id, JSON.stringify(rec), { expirationTtl: RETENTION_TTL }); } catch (e) { /* 保存済みなので続行 */ }
  return json({ ok: true, id: rec.id });
}

export async function onRequestGet({ request, env }) {
  const denied = await denyIfBadPin(request, env);   // 失敗が続くと一定時間ロック
  if (denied) return denied;
  const url = new URL(request.url);
  const list = await env.MIITOBOW_BOARD.list({ prefix: "consult:r:" });
  const out = [];
  for (const k of list.keys) {
    const raw = await env.MIITOBOW_BOARD.get(k.name);
    if (!raw) continue;
    let rec = JSON.parse(raw);
    if (url.searchParams.get("retry") === "1" && (rec.notify === "pending" || rec.notify === "failed" || rec.notify === "unconfigured" || rec.notify === "capped")) {
      const st = await notifyLine(env, rec);
      if (st !== rec.notify) { rec.notify = st; await env.MIITOBOW_BOARD.put(k.name, JSON.stringify(rec), { expirationTtl: RETENTION_TTL }); }
    }
    if (rec.mat) rec.mat = { created_at: rec.mat.created_at, opened_at: rec.mat.opened_at || null };   // 材料フォームの鍵(ハッシュ)は一覧に出さない
    out.push(rec);
  }
  out.sort((a, b) => (a.at < b.at ? 1 : -1));
  return json({ count: out.length, items: out });
}
