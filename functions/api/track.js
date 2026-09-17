// POST /api/track -> ストアボタンのクリック計測（UTM付き）。認証なしの公開エンドポイント。
// GET  /api/track -> 集計結果の閲覧（X-Board-Pinヘッダー必須、既存の掲示板PINを流用）。
//
// 新規KVネームスペースは作らず、既存のMIITOBOW_BOARD KVに専用キー(track:log)で
// ローリングログとして追記する（1キーにJSON配列、上限件数を超えたら古い方から間引く）。

const LOG_KEY = "track:log";
const MAX_ENTRIES = 3000;
const ALLOWED_EVENTS = new Set(["store_click"]);
const ALLOWED_TARGETS = new Set(["ios", "android", "windows"]);
const MAX_FIELD_LEN = 200;

function clip(s) {
  return typeof s === "string" ? s.slice(0, MAX_FIELD_LEN) : "";
}

function checkPin(request, env) {
  const pin = request.headers.get("X-Board-Pin") || "";
  return env.BOARD_PIN && pin === env.BOARD_PIN;
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const event = clip(body.event);
  const target = clip(body.target);
  if (!ALLOWED_EVENTS.has(event) || !ALLOWED_TARGETS.has(target)) {
    return new Response(JSON.stringify({ error: "invalid_event_or_target" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const entry = {
    ts: Date.now(),
    event,
    target,
    page: clip(body.page),
    utm_source: clip(body.utm_source),
    utm_medium: clip(body.utm_medium),
    utm_campaign: clip(body.utm_campaign),
    utm_content: clip(body.utm_content),
  };

  const raw = await env.MIITOBOW_BOARD.get(LOG_KEY);
  let log = [];
  if (raw) {
    try {
      log = JSON.parse(raw);
      if (!Array.isArray(log)) log = [];
    } catch (e) {
      log = [];
    }
  }
  log.push(entry);
  if (log.length > MAX_ENTRIES) {
    log = log.slice(log.length - MAX_ENTRIES);
  }
  await env.MIITOBOW_BOARD.put(LOG_KEY, JSON.stringify(log));

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestGet({ request, env }) {
  if (!checkPin(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const raw = await env.MIITOBOW_BOARD.get(LOG_KEY);
  let log = [];
  if (raw) {
    try {
      log = JSON.parse(raw);
      if (!Array.isArray(log)) log = [];
    } catch (e) {
      log = [];
    }
  }

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || "30");
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => e.ts >= since);

  const byTarget = {};
  const bySource = {};
  const byCampaign = {};
  for (const e of recent) {
    byTarget[e.target] = (byTarget[e.target] || 0) + 1;
    const src = e.utm_source || "(none)";
    bySource[src] = (bySource[src] || 0) + 1;
    const camp = e.utm_campaign || "(none)";
    byCampaign[camp] = (byCampaign[camp] || 0) + 1;
  }

  return new Response(
    JSON.stringify({
      total: recent.length,
      totalAllTime: log.length,
      byTarget,
      bySource,
      byCampaign,
      recent: recent.slice(-200).reverse(),
    }),
    { headers: { "content-type": "application/json" } }
  );
}
