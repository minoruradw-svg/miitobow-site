(() => {
  "use strict";
  const $ = id => document.getElementById(id), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const io5 = t => { t = clamp(t); return t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
  const io3 = t => { t = clamp(t); return t < .5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const o3 = t => 1 - Math.pow(1 - clamp(t), 3), o4 = t => 1 - Math.pow(1 - clamp(t), 4), o5 = t => 1 - Math.pow(1 - clamp(t), 5);
  const bell = t => Math.sin(Math.PI * clamp(t));
  const settle = t => { t = clamp(t); return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); };
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LOW = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const CAN_HOVER = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const SAFARI = /Apple/.test(navigator.vendor || "") && !/Chrome|Chromium|CriOS|FxiOS|Edg/.test(navigator.userAgent);
  const EASE = { expo: "cubic-bezier(.16,1,.3,1)", p4out: "cubic-bezier(.23,1,.32,1)", p2io: "cubic-bezier(.45,0,.55,1)" };
  const canAnimate = typeof Element.prototype.animate === "function";

  const fx = $("fx"), world = $("world"), ph1 = $("ph1"), ph1r = $("ph1r"), ph2 = $("ph2"), ph2r = $("ph2r"), glow = $("glow"), mas = $("mas"), top = $("top"), copy = $("copy"), cue = $("cue");
  const tag1 = $("tag1"), tag2 = $("tag2"), qcs = [$("qc0"), $("qc1"), $("qc2")], fly = $("fly"), thxFly = $("thxFly"), stampBig = $("stampBig"), ink = $("ink"), cf = $("confetti"), hand = $("hand"), pop3 = $("pop3"), pop5 = $("pop5"), pop5ok = $("pop5ok"), sheet = $("sheet"), car0 = $("car0"), car1 = $("car1"), curl = $("curl"), nchips = $("nchips"), sbtn = $("sbtn"), askRip = $("askRip"), sendRip = $("sendRip"), thxBtnEl = $("thxBtn");
  const ctam = $("ctam"), gridc = $("gridc"), ltPar = $("ltPar"), ltGrn = $("ltGrn"), ltGld = $("ltGld");
  const L = { B: $("s1Board"), L: $("s1Lock"), A: $("s1Add"), P: $("s1Party") };
  let W = innerWidth, H = innerHeight, M = W < 1000, PW = 330, PH = 680, MW = 155, MH = 150, MB = {};
  /* ミートボーの生活の場面：画像・セリフは、ここ1か所で差し替える（秘書が新しい生活シーン画像を作ったら src だけ変える） */
  const LIFE = {   // ミートボーの生活の場面。src を差し替えれば絵が変わる（キー＝章：s2=01 QUEST／s3=02 ADD／s5=03 REQUEST／s6=04 THANKS／s7=夜）
    s2: { src: "assets/mascot_still.webp", alt: "", label: "洗濯物を干しながら", bubble: "やること、いっぱい" },
    s3: { src: "assets/life/life_s3.webp", alt: "", label: "買い物の途中で", bubble: "あ！牛乳！" },
    s5: { src: "assets/life/life_s5.webp", alt: "", label: "朝、外から", bubble: "ゴミ出し、お願い！" },
    s6: { src: "assets/life/life_s6.webp", alt: "", label: "ゴミ出しが終わった", bubble: "ゴミ出し、助かった！" },
    s7: { src: "assets/life/life_s7.webp", alt: "", label: "寝る前に", bubble: "なんか忘れてないっけ？" } };
  const LIFE_CH = { s3: "s3", s4: "s5", s5: "s6", bed: "s7" };   // 章ID→LIFEのキー
  const LIFE_WIN = { s2: [.24, .32, .44, .52], s3: [.27, .34, .50, .60], s4: [.20, .28, .42, .50], s5: [.20, .28, .42, .50], bed: [.10, .18, .84, .94] };   // [出始め, 出きる, 消え始め, 消えきる]
  /* 触れる場面の窓（スクロール進行度）。文字の場面が縮んで消える窓 hv／スマホが入る窓 ph／スマホが出ていく開始 out */
  const WIN = { s2: { hv: [.18, .26] }, s3: { hv: [.20, .30] }, s4: { hv: [.10, .18], ph: [.50, .62], out: .95 }, s5: { hv: [.10, .18], ph: [.50, .62], out: .95 }, bed: { hv: [0, 0] } };
  /* 文字の場面＝よそおいモーションで書き出した動画（PC=16:9 / スマホ=9:16）。構成表は v10/zukai/ */
  const ZV = { req: { pc: "assets/zm/req_pc.mp4", sp: "assets/zm/req_sp.mp4", end: "assets/zm/req_pc_end.jpg", endSp: "assets/zm/req_sp_end.jpg" }, thx: { pc: "assets/zm/thx_pc.mp4?v=20261108e", sp: "assets/zm/thx_sp.mp4?v=20261108e", end: "assets/zm/thx_pc_end.jpg?v=20261108e", endSp: "assets/zm/thx_sp_end.jpg?v=20261108e" }, dl: { pc: "assets/zm/dl_pc.mp4", sp: "assets/zm/dl_sp.mp4", end: "assets/zm/dl_pc_end.jpg", endSp: "assets/zm/dl_sp_end.jpg" }, fv: { pc: "assets/zm/fv_pc.mp4?v=20261108a", sp: "assets/zm/fv_sp.mp4?v=20261108a", end: "assets/zm/fv_pc_end.jpg?v=20261108a", endSp: "assets/zm/fv_sp_end.jpg?v=20261108a" }, add: { pc: "assets/zm/add_pc.mp4", sp: "assets/zm/add_sp.mp4", end: "assets/zm/add_pc_end.jpg", endSp: "assets/zm/add_sp_end.jpg" } };
  /* 触れる体験（02 ADD＝ロック画面の「クエスト追加」を押す）の時間管理 */
  const TAP = { sheet: 0, st: 0, t0: 0, add: 0, last: 0, ring: 0, ringT: 0, goRip: 0, goT: 0, go: 0, chars: 0, u3: 0, out3: 0, nq: 0, pop: 0 };
  let fixY = null; const rawY = () => fixY !== null ? fixY : window.scrollY;   // ロック中（iOSは body 固定）は、固定した位置を返す
  const G = { XL: 0, car: { x: 0, y: 60 }, rq: { x: 0, y: 0 }, P2x: 1500, P2y: 0, s4: 1.12, sx0: 0, scrW: 0, scrH: 0, sq: { x: 0, y: -60, w: 200, h: 80 }, wg: { x: 80, y: -130 }, ig: { x: -20, y: 30 }, nq: { x: 0, y: 120 }, sc: 1, yc: 450 };

  /* ---------- 文字ごとのグラデ ---------- */
  function paintGradient(box) {
    if (!box) return;
    const r0 = box.getBoundingClientRect(), w = Math.max(1, r0.width), h = Math.max(1, r0.height);
    $$(".c", box).forEach(l => { const r = l.getBoundingClientRect();
      Object.assign(l.style, { background: "linear-gradient(135deg,#10a98c 0%,#2e9f5f 52%,#4c8f20 100%)", backgroundSize: `${w}px ${h}px`, backgroundPosition: `${-(r.left - r0.left)}px 0`, webkitBackgroundClip: "text", backgroundClip: "text", webkitTextFillColor: "transparent", color: "transparent" }); });
  }
  const PAP = [
    { t: 0.00, y: 46, x: 0, s0: .70, s1: 1.07, r: -5, d1: .22, d2: .16 }, { t: 0.10, y: 38, x: 0, s0: .72, s1: 1.07, r: 4, d1: .22, d2: .16 },
    { t: 0.22, y: 20, x: 0, s0: .55, s1: 1.20, r: 0, d1: .18, d2: .18 }, { t: 0.36, y: 26, x: -22, s0: .86, s1: 1.04, r: 0, d1: .32, d2: .34 }
  ];
  const e4 = t => 1 - Math.pow(1 - t, 4), e2io = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function papScrub(letters, p) {
    letters.forEach((l, i) => { const k = PAP[i], tot = k.d1 + k.d2, u = clamp((p - (k.t / .7) * .45) / .55) * tot, t1 = clamp(u / k.d1);
      const a = e4(t1), t2 = clamp((u - k.d1) / k.d2), sc = u < k.d1 ? lerp(k.s0, k.s1, a) : lerp(k.s1, 1, e2io(t2)), op = clamp(u / (k.d1 * .5));
      l.style.opacity = op; l.style.transform = `translate(${(1 - a) * k.x}px,${(1 - a) * k.y}px) scale(${sc}) rotate(${(1 - a) * k.r}deg)`; });
  }

  /* ---------- 計測 ---------- */
  const chEls = $$("[data-ch]"), ids = chEls.map(e => e.dataset.ch), IDX = Object.fromEntries(ids.map((k, i) => [k, i]));
  const cards = chEls.map(e => e.querySelector(".card"));
  let tops = [], hs = [], scrollY = 0, afterTop = 1e9;
  const pin = id => { const i = IDX[id]; return clamp((scrollY - tops[i]) / Math.max(1, hs[i] - H)); };
  const sendQ = $("sendQ"), typed = $("typed"), screenEl = $("s1Party").parentElement;
  function measure() {
    ph1.style.display = ph2.style.display = mas.style.display = "";   // 寸法を測る間だけ表示に戻す（次のフレームで必要なものだけ隠す）
    const dc0 = $("dcard"); hand.style.width = dc0.offsetWidth + "px"; hand.style.height = dc0.offsetHeight + "px"; hand.style.margin = `${-dc0.offsetHeight / 2}px 0 0 ${-dc0.offsetWidth / 2}px`;
    W = innerWidth; H = innerHeight; M = W < 1000; PW = ph1.offsetWidth; PH = ph1.offsetHeight; MW = mas.offsetWidth; MH = mas.offsetHeight;
    { const px = parseFloat(getComputedStyle(document.querySelector('[data-ch="s4"] .pin')).paddingLeft) || 0, cw = Math.min(520, .42 * W); G.XL = (px + (W - px - cw - 28)) / 2; }   // S4・S5（v9のまま）用
    if (!M) G.XL = W / 2;   // v10：どの章でもスマホは真ん中
    G.tl5 = M ? W * .6 : G.XL + 520;
    const sy = scrollY = rawY();
    tops = chEls.map(e => e.getBoundingClientRect().top + sy); hs = chEls.map(e => e.offsetHeight);
    afterTop = $("after").getBoundingClientRect().top + sy;
    MB = {};
    { const hdr = M ? 56 : 64; G.sc = M ? Math.min((H - hdr - 84) / PH, .92 * W / PW) : Math.min(.82 * H / PH, 1.5); G.yc = M ? hdr + 8 + PH * G.sc / 2 : .5 * H + 24; }   // スマホの場面：主役が真ん中（PCは画面高の約84％）
    if (M) ["s2", "s3", "s4", "s5"].forEach(id => { const c = cards[IDX[id]]; MB[id] = 76 + (c ? c.offsetHeight : 180); });
    if (M) { MB.s4 = 156; MB.s5 = 150; }   // 文字の場面は動画になったので、スマホ幅のS4/S5は v9 と同じ位置に固定
    G.s4 = M ? 1.0 : 1.02; G.P2x = M ? 0 : 1500; G.P2y = M ? 900 : 0;
    G.sx0 = .042 * PW; G.scrW = PW - 2 * G.sx0; G.scrH = PH - 2 * G.sx0;
    const so = screenEl.offsetTop, sl = screenEl.offsetLeft;                      // 画面(.screen)のスマホ内位置
    G.sq = { x: sl + sendQ.offsetLeft + sendQ.offsetWidth / 2 - PW / 2, y: so + sendQ.offsetTop + sendQ.offsetHeight / 2 - PH / 2, w: sendQ.offsetWidth, h: sendQ.offsetHeight };
    { const rq = $("recvQ"); G.rq = { x: sl + rq.offsetLeft + rq.offsetWidth / 2 - PW / 2, y: so + rq.offsetTop + rq.offsetHeight / 2 - PH / 2 }; }
    { sheet.style.display = ''; sheet.style.transform = 'none'; const c = $("car"); G.car = { x: sl + sheet.offsetLeft + c.offsetLeft + c.offsetWidth / 2 - PW / 2, y: so + sheet.offsetTop + c.offsetTop + c.offsetHeight / 2 - PH / 2 }; sheet.style.transform = ''; }
    G.nq = { x: sl + newq.offsetLeft + newq.offsetWidth / 2 - PW / 2, y: so + newq.offsetTop + newq.offsetHeight / 2 - PH / 2 };
    G.wg = { x: G.sx0 + .74 * G.scrW - PW / 2, y: G.sx0 + .31 * G.scrH - PH / 2 };
    G.ig = { x: G.sx0 + .5 * G.scrW - PW / 2, y: G.sx0 + .84 * G.scrH - PH / 2 };
    const sz = M ? 480 : 720; if (cf.width !== sz) { cf.width = cf.height = sz; cfLast = -1; }
    cf.style.width = cf.style.height = sz + "px";
  }
  const camFor = (sx, sy, cs, wx, wy) => ({ cx: wx - (sx - W / 2) / cs, cy: wy - (sy - H / 2) / cs, cs, cr: 0 });
  const mixCam = (a, b, t) => ({ cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), cs: lerp(a.cs, b.cs, t), cr: lerp(a.cr, b.cr, t) });

  /* ---------- 章ごとの状態（カメラ＋物の置き場） ---------- */
  const base = () => ({ cx: 0, cy: 0, cs: 1, cr: 0, p1s: 1, p1ry: 0, p1rx: 2, p1op: 1, p1dim: 0, p2x: G.P2x, p2y: G.P2y, p2s: G.s4, p2op: 0, lB: 1, lL: 0, lA: 0, lP: 0, ca: 0, lpar: 0, lparx: 0, lpary: 0, lgrn: 0, lgld: 0, glow: 0, mx: 0, my: 0, mop: 0, ms: .85 });
  const setCam = (o, c) => { o.cx = c.cx; o.cy = c.cy; o.cs = c.cs; o.cr = c.cr; return o; };
  const yPhone = (id, s, gap) => MB[id] + gap + PH * s / 2;
  const MFV = 442;   // スマホ版：スマホの上端（文字→App Storeボタン→スマホ）
  function heroCam() { return M ? camFor(.5 * W, MFV + PH / 2, 1, 0, 0) : camFor(.715 * W, .56 * H, 1, 0, 0); }
  function heroState(y) {   // FV：文字の場面（動画）だけ。スマホは次の章で巻物と一緒に出る
    const o = base(), c = camFor(.5 * W, G.yc, 1, 0, 0); setCam(o, c); o.p1s = G.sc; o.p1op = 0; o.lB = 1; o.mop = 0; o.ms = 1; return o;
  }
  const S2P = [{ side: -1, y: 20, r: -5, sc: 1.45 }, { side: 1, y: -215, r: 6, sc: 1.1 }, { side: 1, y: 205, r: -4, sc: 1.1 }];
  const S2M = [{ x: -62, y: -92, r: -6, sc: .72 }, { x: 72, y: 22, r: 5, sc: .72 }, { x: -52, y: 124, r: -3, sc: .72 }];
  const S2S = () => M ? { x: 0, y: 150 } : { x: -300, y: 40 };
  function S2(p) {   // FV直後：スマホ＋巻物3枚が飛び出す（空きスペースに必要な一言）。2026-11-07：入場の上下の往復をやめた＝スマホは入場で下から1回だけ上がり、章が始まる位置(p=0)で最終位置に着いている（a=1固定）
    const o = base(), a = 1; setCam(o, camFor(.5 * W, G.yc + (M ? 12 : 0), 1, 0, 0)); o.cy += (1 - a) * .2 * H;
    o.p1s = G.sc * (M ? .78 : 1) * lerp(.85, 1, a); o.p1ry = -9 * (1 - sm(seg(p, .1, .5))) - 14 * (1 - a); o.p1rx = 0;
    o.p1op = 1 - sm(seg(p, .96, 1)); o.p1dim = .4 * sm(seg(p, .1, .3)); o.lB = 1; o.glow = .6 * (1 - sm(seg(p, .1, .3)));
    o.lpar = .5 * sm(seg(p, .1, .4)) * (1 - sm(seg(p, .9, 1))); o.ca = 1 - sm(seg(p, .93, .985)); return o; }
  function DEMO() { const o = S2(1); o.p1op = 0; o.ca = 0; o.lpar = 0; return o; }
  function base3() { return M ? camFor(.5 * W, yPhone("s3", .92, 26), 1, 0, 0) : camFor(G.XL, .5 * H, 1, 0, 0); }
  function base4() { return M ? camFor(.5 * W, yPhone("s4", G.s4, 84), 1, 0, 0) : camFor(.5 * W, .5 * H + 32, 1, 0, 0); }
  function S3(p) {   // 02 ADD：文字の場面 → ミートボーの生活の場面 → スマホの場面（押してみる）
    const o = base(), a = o4(seg(p, .52, .66)); setCam(o, camFor(.5 * W, G.yc, 1, 0, 0)); o.cy += (1 - a) * .30 * H;
    o.p1s = lerp(.6, 1, a) * G.sc; o.p1ry = -34 * (1 - a); o.p1rx = 6 * (1 - a); o.p1op = sm(seg(p, .54, .68)) * (1 - sm(seg(p, .92, 1)));
    o.lB = 0; o.lL = 1 - TAP.add; o.lA = TAP.add; o.lP = 0; o.lpar = .45 * TAP.pop; return o; }
  // S4：飛ぶカードの軌道（ワールド座標）
  function flightPts() { const s = G.s4, a = { x: G.sq.x * s, y: G.sq.y * s }, b = { x: G.P2x + a.x, y: G.P2y + a.y };
    const c = M ? { x: a.x + 110, y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2, y: a.y - 390 }; return [a, c, b]; }
  const bez = (P, e) => { const k = 1 - e; return { x: k * k * P[0].x + 2 * k * e * P[1].x + e * e * P[2].x, y: k * k * P[0].y + 2 * k * e * P[1].y + e * e * P[2].y }; };
  const bezT = (P, e) => { const k = 1 - e; return Math.atan2(2 * k * (P[1].y - P[0].y) + 2 * e * (P[2].y - P[1].y), 2 * k * (P[1].x - P[0].x) + 2 * e * (P[2].x - P[1].x)); };
  function camD() { return M ? camFor(.5 * W, yPhone("s4", G.s4, 84), 1, G.P2x, G.P2y) : camFor(.5 * W, .5 * H + 32, 1, G.P2x, G.P2y); }
  function S4(p) { const o = base(), A = base4(), D = camD(), P = flightPts(), e = io5(seg(p, .32, .64)), ec = io5(seg(p, .35, .66));
    let cx = lerp(A.cx, D.cx, ec), cy = lerp(A.cy, D.cy, ec), cs = 1, cr = 0; const B = bez(P, e);
    if (!M) cy = lerp(A.cy, D.cy, 0) + (B.y - P[0].y) * .35 * (e > 0 && e < 1 ? 1 : (e >= 1 ? 1 : 0)); else cx = (B.x - P[0].x) * .4 * bell(e);
    cs = p < .32 ? lerp(1, M ? .96 : .94, io3(seg(p, .22, .32))) : (M ? 1 - .12 * bell(e) : .94 - .16 * bell(e));
    if (p >= .64) { cs = lerp(M ? .96 : .94, 1, io3(seg(p, .64, .74))); }
    if (!RM && !M) cr = p < .64 ? (-1.2 + 2.4 * e) * sm(seg(p, .12, .3)) : lerp(1.2, 0, io3(seg(p, .64, .74)));
    if (!M && p >= .64) cy = lerp(cy, 0, io3(seg(p, .64, .74)));
    const z = io3(seg(p, .74, .84)); cs = lerp(cs, M ? 1 : 1.05, z); if (!M) cy = lerp(cy, -20, z);
    setCam(o, { cx, cy, cs, cr }); o.p1s = G.s4; o.p1ry = 0; o.p1rx = 0; o.p1dim = sm(seg(p, .22, .32)) * .9; o.lB = 0; o.lP = 1; o.p2op = 1; o.p2y = G.P2y + 4 * bell(seg(p, .74, .78));
    o.lgrn = .5 * bell(seg(p, .32, .64)); o.lpar = p >= .64 ? .4 * bell(seg(p, .64, .82)) : 0; o.lparx = G.P2x; o.lpary = G.P2y; return o; }
  // S5：ハンコ→ありがとうスタンプ
  const w5 = x => x < .035 ? x / .035 * .11 : x < .28 ? .11 + (x - .035) / .245 * .23 : x < .80 ? .34 + (x - .28) / .52 * .60 : .94 + (x - .80) / .20 * .06;   // 巻物が出たら、すぐハンコ（待ちを詰める）   // 外側のスクロール量→内部の進行（「ありがとう」の場面に長い尺）
  const kP = () => M ? Math.min(1.3, (W - 36) / 230) : Math.max(1.1, Math.min(1.9, 2 * (G.tl5 - 24 - G.XL) / 230));
  const popC5 = () => ({ x: G.P2x, y: G.P2y - .04 * PH * G.s4 });
  const stampPos = () => { const c = popC5(), k = kP(); return { x: c.x + .21 * 230 * k, y: c.y - (M ? 16 : 0) }; };   // 実際のハンコのように、カードの角へ少しずらして押す（カード名を読めるように）
  function S5(p) { const o = base(), xs = G.XL / W, D = M ? camFor(.5 * W, yPhone("s5", G.s4, 54), 1, G.P2x, G.P2y) : camFor(xs * W, .5 * H + 32, 1, G.P2x, G.P2y), Sp = stampPos(), A = M ? camFor(.5 * W, yPhone("s5", G.s4, 54), 1, 0, 0) : camFor(xs * W, .5 * H + 32, 1, 0, 0), s4e = S4(1);
    const stcs = 1, C5 = popC5(), st = camFor(M ? .5 * W : G.XL, M ? MB.s5 + (H - MB.s5) * .5 + 18 : .5 * H, stcs, C5.x, C5.y);
    let c = { cx: s4e.cx, cy: s4e.cy, cs: s4e.cs, cr: 0 };
    c = mixCam(c, st, io5(seg(p, .04, .14))); c = mixCam(c, D, io5(seg(p, .22, .36)));
    const t3 = io5(seg(p, .36, .50)); c = mixCam(c, A, t3); c.cs *= 1 - .08 * bell(seg(p, .36, .50));
    { const zm = io3(seg(p, .46, .53)) * (1 - io3(seg(p, .74, .79))); c.cs *= 1 + (M ? .14 : .34) * zm; c.cy += zm * (M ? .08 : .10) * PH; }   // スタンプを選ぶ場面は、画面の文字が読める大きさまで寄る
    const t4 = io5(seg(p, .78, .92)); c = mixCam(c, D, t4); c.cs *= 1 - .14 * bell(t4); if (!RM && !M) c.cr = -1 + 2 * t4 * (p > .76 ? 1 : 0); if (p < .76) c.cr = 0;
    if (p > .92) { c.cs = lerp(c.cs, 1.04, o4(seg(p, .92, .97))); c.cy = lerp(c.cy, D.cy - 10, o4(seg(p, .92, .97))); c.cr = lerp(c.cr, 0, o4(seg(p, .92, .97))); }
    if (p > .985) c.cs = lerp(c.cs, 1, sm(seg(p, .985, 1)));
    if (!RM) { const u = seg(p, .185, .23); if (u > 0 && u < 1) c.cy += Math.sin(u * 3 * Math.PI) * (1 - u) * 4; }
    setCam(o, c); o.p1s = G.s4; o.p1ry = 0; o.p1rx = 0; o.p1dim = 0; o.lB = 0; o.lP = 1; o.p2op = 1;
    o.lgld = 0; o.lgrn = Math.min(.5, .4 * bell(seg(p, .36, .50)) + .5 * bell(seg(p, .58, .80)));
    o.mx = G.P2x - PW * G.s4 / 2 - MW * .66; o.my = G.P2y + PH * G.s4 / 2 - MH * .85 + 4; o.mop = 0; o.ms = .85; return o; }
  function OUT() { const o = S5(1); o.p1op = 0; o.p2op = 0; o.mop = 0; o.ca = 0; o.lgld = 0; o.lgrn = 0; return o; }
  /* 押して進める：v9の時間軸(0〜1)を、スクロールでなく「押した」あとの時間で進める。stops＝止まる位置、dur＝各区間の秒数、auto＝自動で進む区間 */
  const STG = {
    s4: { v: 0, i: 0, anim: null, stops: [0, .78, 1], dur: [5.2, 3.2], auto: [false, false], lab: ["ここ押してみてね", "「受ける」を押してみてね"], done: "お願いが届いた！", tgt: () => [sendStatus, okBtn] },
    s5: { v: 0, i: 0, anim: null, stops: [0, .10, .47, .73, 1], dur: [1.3, 4.6, 4.4, 4.6], auto: [true, false, false, false], lab: ["", "「完了にする」を押してみてね", "ここ押してみてね", "ここ押してみてね"], done: "ありがとうが届いた！", tgt: () => [null, pop5ok, thxBtnEl, sbtn] } };
  const vReq = () => (scrollY > tops[IDX.s5] - H) ? 1 : STG.s4.v;
  const phWin = (u, id) => { const w = WIN[id]; return o4(seg(u, w.ph[0], w.ph[1])) * (1 - sm(seg(u, w.out, 1))); };
  function scene45(o, u, id) { const w = WIN[id], a = o4(seg(u, w.ph[0], w.ph[1])), k = a * (1 - sm(seg(u, w.out, 1))); o.p1op *= k; o.p2op *= k; o.cy += (1 - a) * .28 * H; o.ca = 0; return o; }
  const FN = { s2: S2, demo: DEMO, s3: S3, s4: u => scene45(S4(vReq()), u, "s4"), s5: u => scene45(S5(STG.s5.v), u, "s5"), bed: OUT, s6: OUT, s7: OUT };
  function mix(a, b, t) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o; }
  function globalState() {
    const first = tops[0] - H;
    if (scrollY <= first) return heroState(scrollY / H);
    let i = 0; for (let k = 0; k < tops.length; k++) if (scrollY >= tops[k] - H) i = k;
    const id = ids[i], p = pin(id), enter = sm(1 - (tops[i] - scrollY) / H), cur = FN[id](p);
    if (enter >= 1 || scrollY >= tops[i]) return cur;
    const prev = i === 0 ? heroState(9) : FN[ids[i - 1]](1), tgt = FN[id](0);
    const fast = id === "s2" ? sm(seg(enter, .3, 1)) : tgt.p1op < .01 && tgt.p2op < .01 ? sm(clamp(enter * 3)) : ((prev.p1op < .01 && prev.p2op < .01) ? sm(seg(enter, .6, 1)) : enter);   // スマホのない場面からは、スマホの登場を後ろ40%へ（デモに残像を出さない）
    const r = mix(prev, tgt, fast); if (id === "s2") r.cy -= (1 - fast) * .2 * H;   // スマホが下から1回だけ上がって、最終位置で止まる
    return r;
  }

  /* ---------- 描画 ---------- */
  let introP = 0, t0 = 0, px = 0, py = 0, tx = 0, ty = 0, S = base(), handOp = 0;
  let gkey = "";
  function drawGrid(cx, cy, cs) {   // 点の方眼：ワールド座標に固定（カメラと一緒に動く）。画面サイズのcanvasに、見える点だけ描く
    const key = `${W}|${H}|${cx.toFixed(1)}|${cy.toFixed(1)}|${cs.toFixed(3)}`; if (key === gkey) return; gkey = key;
    if (gridc.width !== W || gridc.height !== H) { gridc.width = W; gridc.height = H; }
    const g = gridc.getContext("2d"); g.clearRect(0, 0, W, H);
    const dots = (step, r, a, par) => { const ccx = cx * par, ccy = cy * par, s2 = 1 + (cs - 1) * par; g.fillStyle = `rgba(31,34,35,${a})`;
      const x0 = Math.floor((ccx - W / 2 / s2) / step) * step, x1 = ccx + W / 2 / s2 + step, y0 = Math.floor((ccy - H / 2 / s2) / step) * step, y1 = ccy + H / 2 / s2 + step;
      for (let x = x0; x < x1; x += step) for (let y = y0; y < y1; y += step) { const px_ = W / 2 + (x - ccx) * s2, py_ = H / 2 + (y - ccy) * s2; g.beginPath(); g.arc(px_, py_, r * s2, 0, 6.2832); g.fill(); } };
    dots(46, 1.2, .06, 1); if (!LOW) dots(92, 1.6, .04, .5);
  }
  function apply(S) {
    const ip = RM ? 1 : introP, ease = 1 - Math.pow(1 - ip, 3), cs = RM ? 1 : S.cs, cr = RM ? 0 : S.cr;
    world.style.transform = `translate(${W / 2}px,${H / 2}px) rotate(${cr}deg) scale(${cs}) translate(${-S.cx}px,${-S.cy}px)`;
    drawGrid(S.cx, S.cy, cs);
    ph1.style.opacity = S.p1op * ease; ph1.style.transform = `translate3d(0,${(1 - ease) * 60}px,0) scale(${S.p1s})`;
    ph1r.style.transform = `rotateY(${S.p1ry - 8 * (1 - ease) + (S.p1op > .5 ? px * 4 : 0)}deg) rotateX(${S.p1rx - py * 3}deg)`;
    ph1.style.filter = S.p1dim > .01 ? `brightness(${1 - .22 * S.p1dim})` : "";
    ph2.style.display = S.p2op > .01 ? "" : "none"; ph1.style.display = S.p1op * ease > .01 ? "" : "none"; mas.style.display = S.mop > .01 ? "" : "none"; glow.style.display = S.glow > .01 ? "" : "none"; ltPar.style.display = S.lpar > .01 ? "" : "none"; ltGrn.style.display = S.lgrn > .01 ? "" : "none"; ltGld.style.display = S.lgld > .01 ? "" : "none";
    ph2.style.opacity = S.p2op; ph2.style.transform = `translate3d(${S.p2x}px,${S.p2y}px,0) scale(${S.p2s})`; ph2r.style.transform = "rotateY(0deg) rotateX(0deg)";
    glow.style.opacity = S.glow * ease; glow.style.transform = `scale(${S.p1s})`;
    L.B.style.opacity = S.lB; L.L.style.opacity = S.lL; L.A.style.opacity = S.lA; L.P.style.opacity = S.lP;
    ltPar.style.opacity = S.lpar; ltPar.style.transform = `translate3d(${S.lparx}px,${S.lpary}px,0)`; ltGrn.style.opacity = S.lgrn; ltGld.style.opacity = S.lgld;
    const mi = (RM || !t0 || scrollY > 40) ? 1 : clamp(((performance.now() - t0) / 1000 - 2.35) / .5);   // ミートボーは最後に登場
    mas.style.opacity = S.mop * mi; mas.style.transform = `translate3d(${S.mx}px,${S.my + (M ? (1 - mi) * 40 : 0)}px,0) scale(${S.ms})`; mas.style.zIndex = (M && scrollY < tops[0] - H * .5) ? 0 : 2;
    return ease;
  }

  /* ---------- 章の中身 ---------- */
  const pp3 = document.createElement("i"), pp3L = [], qlL = [], rv = $("rv");
  const gobtn = $("gobtn"), newq = $("newq"), ripple = $("ripple"), goRip = $("goRip"), s4step = $("s4step"), s4steps = $("s4steps"), s4bar = $("s4bar"), okRipple = $("okRipple"), s4barSteps = $("s4barSteps"), tag1e = $("tag1"), s5step = $("s5step");
  const sendStatus = $("sendStatus"), thxBtn = $("thxBtn"), s2Recv = $("s2Recv"), s2Arrive = $("s2Arrive"), s2Idle = $("s2Idle"), recvStatus = $("recvStatus"), okBtn = $("okBtn"), thxImg = $("thxImg"), thxCap = $("thxCap"), recvQ = $("recvQ"), clearSt = $("clearSt");
  const flash = (() => { const d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0;background:#fff;opacity:0;z-index:19"; $("s2Recv").parentElement.appendChild(d); return d; })();
  clearSt.style.display = "none";
  const setText = (el, t) => { if (el.textContent !== t) { el.textContent = t; if (canAnimate && !RM) el.animate([{ opacity: 0, transform: "translateX(16px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: EASE.expo }); } };
  const cardStyle = (el, k, rollIn, rollOut) => {};   // 予約
  const stepTxt = $$(".step span");
  let cfLast = -1;
  const cfRnd = (() => { let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: M ? 24 : 36 }, () => ({ th: -Math.PI / 2 + (r() - .5) * 2.4, v: 520 + r() * 260, rot: 540 + r() * 360, w: 10 + r() * 6, h: 6 + r() * 3, c: r() })); })();
  const CFC = ["#D6BD7B", "#D6BD7B", "#D6BD7B", "#D6BD7B", "#F8EED9", "#F8EED9", "#F8EED9", "#2E9F5F", "#2E9F5F", "#B3362B"];
  function drawConfetti(t) {
    if (LOW || RM) return; const key = Math.round(t * 400) / 400; if (key === cfLast) return; cfLast = key; t = key;   // 丸めた値そのもので描く（順方向・逆方向で同じ絵になる）
    const g = cf.getContext("2d"), n = cf.width, sc = n / 720; g.clearRect(0, 0, n, n); if (t <= 0 || t >= 1) return;
    cfRnd.forEach((q, i) => { const x = n / 2 + Math.cos(q.th) * q.v * t * sc * .6, y = n * .45 + (Math.sin(q.th) * q.v * t + 900 * t * t) * sc * .6, a = 1 - sm((t - .65) / .35); if (a <= 0) return;
      g.save(); g.translate(x, y); g.rotate((q.rot * t) * Math.PI / 180); g.globalAlpha = a; g.fillStyle = CFC[Math.floor(q.c * 10)]; g.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); g.restore(); });
  }
  let sqSwap = false;
  function details(S, now) {
    const p2 = pin("s2"), p3 = pin("s3"), p4 = vReq(), p5 = STG.s5.v, u4 = pin("s4"), u5 = pin("s5"), ub = pin("bed");
    // ---- S2：スマホ画面から巻物が浮かび、ほどけ、奥行きをもって広がり、1本に巻き戻る ----
    const cam = { cx: S.cx, cy: S.cy };
    qcs.forEach((c, i) => { const g = (M ? S2M : S2P)[i], k = o4(seg(p2, .04 + .20 * i, .18 + .20 * i)), ku = sm(seg(k, 0, .3)), Hs = M ? 1 : clamp(H / 900, .8, 1.3), PWs = PW * G.sc;
      const fxp = M ? g.x : g.side * (PWs / 2 + 115 * g.sc * Hs - 95), fyp = M ? g.y : g.y * Hs, x = lerp(0, fxp, k), y = lerp(0, fyp, k), sc = lerp(.8, g.sc * (M ? 1 : Hs), k);
      const roll = 62 * clamp(1 - ku), rx = 28 * (1 - ku) - 6 * bell(seg(k, .2, 1));
      c.style.zIndex = String(3 - i); c.style.display = S.ca * clamp(k * 6) > .01 ? "" : "none"; c.style.opacity = String(S.ca * clamp(k * 6)); c.style.clipPath = `inset(-70px -70px calc(${roll}% - 70px) -70px)`;
      c.style.transform = `translate3d(${x}px,${y}px,0) perspective(900px) rotateX(${rx}deg) rotate(${g.r * k}deg) scale(${sc})`; });
        const raw2 = (scrollY - tops[IDX.s2]) / Math.max(1, hs[IDX.s2] - H);
    qlL.forEach((l, i) => { const u = o4(seg(raw2, -.10 + .012 * i, .03 + .012 * i)); l.style.opacity = String(u); l.style.transform = `perspective(500px) rotateX(${40 * (1 - u)}deg) translateY(${8 * (1 - u)}px)`; });
    // 手渡し：1本に巻き戻った巻物が、体験デモの舞台へ
    const s2End = tops[IDX.s2] + hs[IDX.s2] - H, uH = clamp((scrollY - s2End) / (.5 * H)), dcardEl = $("dcard"), dTop = $("dstage").getBoundingClientRect().top + scrollY;
    const handIn = sm(seg(p2, .92, .96)), st = (() => { const Sv = S2S(), cs = S.cs; return { x: W / 2 + (Sv.x - S.cx) * cs, y: H / 2 + (Sv.y - S.cy) * cs }; })();
    const toDemo = sm(uH), dyScreen = dTop - scrollY + dcardEl.offsetHeight / 2, hx = lerp(lerp(st.x, W / 2, io3(seg(p2, .92, 1))), W / 2, 1), hy = lerp(lerp(st.y, .70 * H, io3(seg(p2, .92, 1))), dyScreen, toDemo);
    handOp = 0; const dsc = M ? .92 : 1;
    hand.style.opacity = String(handOp); hand.style.transform = `translate3d(${hx}px,${hy}px,0) scale(${lerp(.5, 1, toDemo)})`;
    if (dState === 0) dcardEl.style.opacity = "0";
    // ---- S3 ----
    ripple.style.opacity = String(TAP.ring); ripple.style.transform = `scale(${.4 + 1.2 * TAP.ringT})`;
    goRip.style.opacity = String(TAP.goRip); goRip.style.transform = `scale(${.4 + 1.2 * TAP.goT})`;
    typed.textContent = "牛乳".slice(0, TAP.chars); $("qph").style.display = TAP.chars > 0 ? "none" : "";
    gobtn.classList.toggle("on", !!TAP.go); { const q = $("qsheet"), sh = TAP.sheet; q.style.opacity = sh > .01 ? "1" : "0"; q.style.transform = `translateY(${(1 - sh) * 100}%)`; $("scrimq").style.opacity = String(sh); }
    newq.style.opacity = String(TAP.nq); newq.style.transform = `translateY(${(1 - TAP.nq) * 18}px)`;
    { const u3 = TAP.u3, out3 = TAP.out3, sc3 = S.p1s, kmax = M ? Math.min(1.3, (W - 36) / 230) : Math.min(2.1, Math.max(1, .3 * W / 230)), k3 = lerp(.35, kmax, u3) * lerp(1, .35, out3);
      const sx = G.ig.x * sc3, sy = G.ig.y * sc3, nx = G.nq.x * sc3, ny = G.nq.y * sc3, px3 = lerp(lerp(sx, 0, u3), nx, out3), py3 = lerp(lerp(sy, -.03 * PH * sc3, u3), ny, out3);
      pop3.style.display = TAP.st === 1 && u3 > 0 && out3 < 1 ? "" : "none"; pop3.style.opacity = String(clamp(u3 * 3) * (1 - sm(seg(out3, .5, 1))));
      pop3.style.clipPath = `inset(-70px -70px calc(${62 * (1 - u3)}% - 70px) -70px)`; pop3.style.transform = `translate3d(${px3}px,${py3}px,0) perspective(900px) rotateX(${24 * (1 - u3)}deg) scale(${k3})`; }
    // ---- S4：1枚のカードが私→相手へ。カメラが追う ----
    const P = flightPts(), s = G.s4, takeoff = o4(seg(p4, .22, .32)), e = io5(seg(p4, .32, .64)), land = o5(seg(p4, .64, .74));
    const sw = G.sq.w * s, sh_ = G.sq.h * s, fs = PW * .042 * s;
    fly.style.width = sw + "px"; fly.style.height = sh_ + "px"; fly.style.margin = `${-sh_ / 2}px 0 0 ${-sw / 2}px`; fly.style.fontSize = fs + "px"; fly.style.padding = `${.04 * PW * s}px ${.05 * PW * s}px`;
    const inFlight = p4 >= .22 && p4 < .72; let pos = p4 < .32 ? P[0] : bez(P, e);
    const FS = M ? 1.5 : 1.28, scl = p4 < .32 ? lerp(1, FS, takeoff) : (p4 < .64 ? FS + .12 * bell(e) : lerp(FS, 1.0, land)), rot = p4 >= .32 && p4 < .64 ? Math.max(-10, Math.min(10, (bezT(P, e) * 180 / Math.PI - (M ? 90 : 0)) * .30)) : 0;
    const rx = p4 < .64 ? -8 * takeoff : lerp(-8, 0, land) + 4 * bell(land), hh = Math.max(takeoff * (p4 < .64 ? 1 : 1 - land), bell(e));
    fly.style.display = inFlight ? "" : "none"; fly.style.opacity = inFlight ? "1" : "0"; fly.style.transform = `translate3d(${pos.x}px,${pos.y}px,0) perspective(900px) rotateX(${rx}deg) rotate(${rot}deg) scale(${scl})`;
    fly.style.boxShadow = `0 ${14 + 76 * hh}px ${22 + 88 * hh}px rgba(0,0,0,${.25 - .12 * hh})`;
    sendQ.style.opacity = p4 >= .22 && p4 < 1 && p5 < 1 ? "0" : "1"; sendQ.style.transform = `scale(${1 + .04 * sm(seg(p4, .08, .16)) * (1 - sm(seg(p4, .16, .22)))})`;
    const press = (p4 > .16 && p4 < .22) ? 1 : 0; sendStatus.style.transform = `scale(${press ? .96 : 1})`;
    setText(sendStatus, p4 < .22 ? "おねがいを送る" : (p4 < .82 && p5 === 0 ? "返事を待っています" : "受けてもらいました"));
    s2Idle.style.opacity = String(1 - sm(seg(p4, .64, .68))); const swapped = p4 >= .72;
    s2Recv.style.opacity = String(sm(seg(p4, .68, .74)) * (1 - sm(seg(p5, .78, .84)))); recvQ.style.opacity = swapped ? "1" : "0";
    okBtn.classList.toggle("on", p4 > .82 && p4 < .88); okRipple.style.opacity = String(Math.sin(seg(p4, .79, .88) * Math.PI)); okRipple.style.transform = `scale(${.4 + 1.2 * seg(p4, .79, .88)})`; recvStatus.style.opacity = String(p4 > .86 || p5 > 0 ? 1 : 0); setText(recvStatus, p5 > .1 ? "完了しました。おつかれさま！" : "受けています");
    const tg = true;
    tag1.style.opacity = String(tg ? sm(seg(p4, 0, .08)) * (1 - sm(seg(p4, .26, .32))) * (p5 === 0 ? 1 : 0) * (scrollY > tops[IDX.s4] - H * .5 ? 1 : 0) : 0);
    tag2.style.opacity = String(tg ? sm(seg(p4, .60, .68)) * (1 - sm(seg(p5, .04, .10))) : 0);
    tag1.style.transform = `translate3d(${0}px,${-PH * s / 2 - 48 - 8 * (1 - o4(seg(p4, 0, .08)))}px,0) translateX(-50%)`; tag2.style.transform = `translate3d(${G.P2x}px,${G.P2y - PH * s / 2 - 48}px,0) translateX(-50%)`;
    const st4 = p4 < .30 ? 0 : p4 < .80 ? 1 : 2;
    if (st4 !== lastSt4) { lastSt4 = st4; [s4steps, s4barSteps].forEach(ol => [...ol.children].forEach((li, i) => { li.className = i === st4 ? "on" : (i < st4 ? "done" : ""); })); }
    if (M) { updateCaps(p4, s4Vis); s4bar.style.opacity = String(s4Vis * (p5 === 0 ? 1 : 0)); s4bar.style.top = (MB.s4 - 8) + "px"; }
    else s4bar.style.opacity = String(sm(seg(p4, .30, .35)) * (1 - sm(seg(p4, .63, .68))) * (p5 === 0 ? 1 : 0));
    setText(s4step, p4 < .32 ? "あなたが「ゴミ出し」をお願いする" : p4 < .72 ? "お願いが、相手の画面へ届く" : "相手が「受ける」。受けてもらえた");
    // ---- S5：CLEARハンコ→紙吹雪→ありがとうスタンプ ----
    const Sp = stampPos(), sz = M ? 150 : 190, k5 = seg(p5, .12, .20), fall = o5(k5), land5 = seg(p5, .185, .21);
    stampBig.style.width = stampBig.style.height = sz + "px"; stampBig.style.margin = `${-sz / 2}px 0 0 ${-sz / 2}px`;
    const gone = 1 - sm(seg(p5, .30, .35)); const tp5 = o3(k5), dr5 = Math.pow(clamp(tp5 / .55), 2), bn5 = tp5 < .55 ? 0 : Math.sin((tp5 - .55) / .45 * Math.PI) * .08; stampBig.style.opacity = String(clamp(p5 > .12 ? tp5 / .3 : 0) * gone); stampBig.style.display = (p5 > .1 && gone > .01) ? "" : "none"; ink.style.display = "none"; cf.style.display = "none";
    const kk = 0;
    stampBig.style.transform = `translate3d(${Sp.x + sz * .14 * kk}px,${Sp.y + sz * .09 * kk}px,0) scale(${2.4 - 1.4 * dr5 + bn5}) rotate(-12deg)`;
    stampBig.firstElementChild.style.filter = `drop-shadow(0 ${lerp(40, 2, fall)}px ${lerp(50, 4, fall)}px rgba(120,20,15,${lerp(.25, .35, fall)}))`;
    const u185 = seg(p5, .185, .26); ink.style.opacity = String(p5 > .185 ? lerp(.25, 0, u185) * gone : 0); ink.style.transform = `translate3d(${Sp.x}px,${Sp.y}px,0) scale(${lerp(.6, 1.3, u185)})`;
    flash.style.opacity = "0";
    { const pre5 = clamp((scrollY - (tops[IDX.s5] - H * .8)) / (H * .8)), u5 = Math.max(o4(seg(p5, 0, .10)), o4(seg(pre5, .35, 1))), out5 = io3(seg(p5, .30, .36)), k = kP(), C5 = popC5(), rqx = G.P2x + G.rq.x * G.s4, rqy = G.P2y + G.rq.y * G.s4;
      const pk = lerp(.35, k, u5) * lerp(1, .35, out5), qx = lerp(lerp(rqx, C5.x, u5), rqx, out5), qy = lerp(lerp(rqy, C5.y, u5), rqy, out5);
      const kPh = phWin(pin("s5"), "s5"); pop5.style.display = (p5 > 0 || pre5 > .35) && p5 < .365 && kPh > .01 ? "" : "none"; pop5.style.opacity = String(clamp(u5 * 3) * (1 - sm(seg(p5, .33, .36))) * kPh);
      pop5.style.clipPath = `inset(-70px -70px calc(${62 * (1 - u5)}% - 70px) -70px)`; pop5.style.transform = `translate3d(${qx}px,${qy + 3 * bell(seg(p5, .185, .21)) * k}px,0) perspective(900px) rotateX(${24 * (1 - u5)}deg) scale(${pk})`;
      pop5ok.classList.toggle("on", p5 > .105 && p5 < .15); recvQ.style.opacity = String(1 - sm(clamp(u5 * 1.6)) * (1 - sm(seg(p5, .35, .37)))); }
    ltGld.style.transform = `translate3d(${Sp.x}px,${Sp.y}px,0)`; ltGrn.style.transform = `translate3d(${M ? 0 : G.P2x / 2}px,${M ? 450 : -200}px,0)`;
    cf.style.transform = `translate3d(${Sp.x - cf.width / 2}px,${Sp.y - cf.height * .45}px,0)`; 
    // ---- 後半：いいね・ありがとうを伝える → スタンプを選ぶ → 押す → 相手に届く ----
    const askIn = sm(seg(p5, .42, .47)), up = io5(seg(p5, .50, .57)), down = io5(seg(p5, .76, .80)), shW = up * (1 - down);
    thxBtnEl.style.opacity = String(askIn * (1 - sm(seg(p5, .50, .52)))); thxBtnEl.classList.toggle("on", p5 > .485 && p5 < .505);
    askRip.style.opacity = String(Math.sin(seg(p5, .475, .51) * Math.PI)); askRip.style.transform = `scale(${.4 + 1.2 * seg(p5, .475, .51)})`;
    sheet.style.display = shW > .002 ? "" : "none"; sheet.style.transform = `translateY(${(1 - shW) * 103}%)`;   // 出番以外は描かない
    const pg = io3(seg(p5, .60, .68)); car0.style.transform = `translateX(${-pg * 11}em) scale(${lerp(1, .66, pg)})`; car0.style.opacity = String(lerp(1, .5, pg));
    car1.style.transform = `translateX(${(1 - pg) * 11}em) scale(${lerp(.66, 1, pg)})`; car1.style.opacity = String(lerp(.5, 1, pg)); setText(curl, pg > .5 ? "ありがとう" : "いいね");
    nchips.children[1].classList.toggle("on", p5 > .69); sbtn.classList.toggle("on", p5 > .735 && p5 < .765);
    sendRip.style.opacity = String(Math.sin(seg(p5, .725, .765) * Math.PI)); sendRip.style.transform = `scale(${.4 + 1.2 * seg(p5, .725, .765)})`;
    sendStatus.style.opacity = String(p5 > 0 ? 1 - sm(seg(p5, .44, .46)) : 1);
    if (p5 > .44) setText(sendStatus, "完了しました。おつかれさま！");
    rv.style.backgroundPosition = `${100 * (1 - o4(seg(p5, .44, .56)))}% 0`;
    const P5 = flightPts(), e5 = io5(seg(p5, .79, .90)), tk = o4(seg(p5, .765, .80)), sizeT = .62 * G.scrW * G.s4, start = { x: G.car.x * G.s4, y: G.car.y * G.s4 };
    thxFly.style.width = thxFly.style.height = sizeT + "px"; thxFly.style.margin = `${-sizeT / 2}px 0 0 ${-sizeT / 2}px`;
    const tp = p5 < .79 ? start : bez([start, P5[1], { x: G.P2x, y: G.P2y }], e5);
    const ts = p5 < .79 ? lerp(.6, 1, tk) : 1 + .15 * bell(e5), vis = p5 >= .765 && p5 < .93;
    thxFly.style.display = vis ? "" : "none"; thxFly.style.opacity = vis ? String(clamp(seg(p5, .765, .78))) : "0"; thxFly.style.transform = `translate3d(${tp.x}px,${tp.y}px,0) scale(${ts}) rotate(${p5 >= .79 && p5 < .90 ? Math.sin(e5 * 2 * Math.PI) * 4 : 0}deg)`;
    s2Arrive.style.opacity = String(sm(seg(p5, .90, .93))); celeFrame(p5, now);
    setText(s5step, p5 < .30 ? "お願いが達成された" : p5 < .56 ? "ありがとうを伝える" : "スタンプが届く");
    if (S.mop > .5 && p5 > .955 && !s5Greeted) { s5Greeted = true; playGreeting(); }
    if (p5 < .5) s5Greeted = false;
    { const ry = rawY(); if (Math.abs(ry - hLast) > .5) hDown = ry > hLast; hLast = ry; }
    // ---- 章テキストの出入り ----
    chEls.forEach((el, i) => { const c = cards[i]; if (!c || !el.classList.contains("chapter")) return; const id = ids[i], p = clamp((scrollY - tops[i]) / Math.max(1, hs[i] - H));
      const scn = id === "s2" || id === "s3" || id === "s4" || id === "s5" || id === "bed";
      const a = scn ? sm(clamp((scrollY - tops[i] + .8 * H) / (.4 * H))) : sm(clamp((scrollY - tops[i] + H * .14) / (H * .14)));
      let out = 1 - sm(seg(p, .93, 1));
      if (scn) { const hv = sm(seg(p, WIN[id].hv[0], WIN[id].hv[1])); out = id === "bed" ? 0 : 1 - hv; c.style.setProperty("--hv", hv.toFixed(3)); }
      if (id === "s4") s4Vis = phWin(p, "s4");
      const vv = a * out; if (id === "s5") thxVis = vv;
      if (vv > .5 && !c.classList.contains("on")) { c.classList.add("on"); zvPlay(id, true); if (id === "s5") holdStart("thx"); } else if (vv < .05 && c.classList.contains("on")) { c.classList.remove("on"); zvPlay(id, false); }
      if (id === "s2") { const ex = 1 - sm(seg(p, .93, .985)), q = (a0, a1) => (sm(seg(p, a0, a1)) * ex).toFixed(3); c.style.setProperty("--q1", q(.06, .14)); c.style.setProperty("--q2", q(.26, .34)); c.style.setProperty("--q3", q(.46, .54)); }
      c.style.setProperty("--vis", vv.toFixed(3)); });
    lifeFrame({ s3: p3, s4: u4, s5: u5, bed: ub }); biviFrame(S, p4, p5, u5, now); hintFrame(S, p3, u4, u5); zvScroll(); { const tb = zvBox.thx && zvBox.thx.box; if (tb) { tb.style.opacity = String(thxVis); tb.style.visibility = thxVis > .01 ? "visible" : "hidden"; } }
  }
  let thxVis = 0;
  /* ---------- スタンプ受信の演出（実アプリ stamp_celebration.dart の式どおり：光の筋・衝撃の輪・閃光・ハート／星／丸・またたく星。音と振動は無し） ---------- */
  const cele = $("cele"), celeG = cele.getContext("2d"); let celeT0 = 0, celeW = 0;
  const CC = ["#FF6F91", "#FFC75F", "#FFFFFF", "#9BE7FF", "#FF9671", "#D65DB1"], lcg = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const PART = (() => { const r = lcg(7); return Array.from({ length: LOW ? 56 : 96 }, (_, i) => ({ a: r() * 6.2832, sp: 340 + r() * 420, sz: 12 + r() * 18, sh: i % 3, c: CC[Math.floor(r() * 6)], d: .38 + r() * .18, life: 1.8 + r() * 1.3, spin: (r() - .5) * 8 })); })();
  const TWK = (() => { const r = lcg(11); return Array.from({ length: 18 }, () => ({ a: r() * 6.2832, d: 1.05 + r(), ph: r() * 6.2832, sp: 2.2 + r() * 2.2, b: 8 + r() * 10 })); })();
  const heartP = (g, q) => { g.beginPath(); g.moveTo(0, q * .35); g.bezierCurveTo(-q * .9, -q * .2, -q * .45, -q * .85, 0, -q * .35); g.bezierCurveTo(q * .45, -q * .85, q * .9, -q * .2, 0, q * .35); g.closePath(); };
  const starP = (g, q, n, inner) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const rad = i % 2 === 0 ? q : q * inner, a = -Math.PI / 2 + i * Math.PI / n, x = Math.cos(a) * rad, y = Math.sin(a) * rad; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
  function drawCele(t) {
    const w = cele.clientWidth || 1, dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(w * dpr), ch = Math.round((cele.clientHeight || 1) * dpr);
    if (cele.width !== cw || cele.height !== ch) { cele.width = cw; cele.height = ch; }
    const K = cw / 390, g = celeG, ox = cw / 2, oy = ch / 2, r = 120 * K; g.clearRect(0, 0, cw, ch);
    const fade = clamp(t / .5); g.save(); g.translate(ox, oy); g.rotate(t * .35);
    for (let i = 0; i < 14; i++) { const a = i * 6.2832 / 14, len = r * (2.7 + .25 * Math.sin(t * 2 + i)), gr = g.createRadialGradient(0, 0, 0, 0, 0, len); gr.addColorStop(0, `rgba(255,243,196,${.55 * fade})`); gr.addColorStop(1, "rgba(255,182,200,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - .09) * len, Math.sin(a - .09) * len); g.lineTo(Math.cos(a + .09) * len, Math.sin(a + .09) * len); g.closePath(); g.fill(); }
    g.restore();
    for (let k = 0; k < 3; k++) { const lt = t - .4 - k * .14; if (lt < 0 || lt > 1.1) continue; const u = lt / 1.1, rad = r * (.9 + 2.2 * o3(u)), m = k / 2;
      g.strokeStyle = `rgba(${Math.round(255 + (185 - 255) * m)},${Math.round(224 + (68 - 224) * m)},${Math.round(138 + (64 - 138) * m)},${.85 * (1 - u)})`; g.lineWidth = (7 * (1 - u) + 1) * K; g.beginPath(); g.arc(ox, oy, rad, 0, 6.2832); g.stroke(); }
    const fl = t - .38; if (fl >= 0 && fl < .35) { const u = fl / .35, gr = g.createRadialGradient(ox, oy, 0, ox, oy, r * 1.8); gr.addColorStop(0, `rgba(255,255,255,${.85 * (1 - u)})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, r * (.8 + .9 * u), 0, 6.2832); g.fill(); }
    for (const p of PART) { const tau = t - p.d; if (tau < 0 || tau > p.life) continue; const u = tau / p.life, drag = 1 - Math.exp(-2.4 * tau), dist = p.sp * drag / 2.4, x = ox + Math.cos(p.a) * dist * K, y = oy + (Math.sin(p.a) * dist + 200 * tau * tau) * K, al = u < .65 ? 1 : 1 - (u - .65) / .35, sc = u < .12 ? u / .12 : 1;
      g.save(); g.translate(x, y); g.rotate(p.spin * tau); g.globalAlpha = clamp(al); g.fillStyle = p.c; const q = p.sz * sc * K;
      if (p.sh === 1) { heartP(g, q); g.fill(); } else if (p.sh === 0) { starP(g, q, 5, .45); g.fill(); } else { g.beginPath(); g.arc(0, 0, q * .35, 0, 6.2832); g.fill(); } g.restore(); }
    for (let i = 0; i < 18; i++) { const q = TWK[i], appear = clamp((t - .5 - i * .04) / .3), tw = (.5 + .5 * Math.sin(t * q.sp + q.ph)) * appear; if (tw < .05) continue;
      g.save(); g.translate(ox + Math.cos(q.a) * r * q.d, oy + Math.sin(q.a) * r * q.d); g.fillStyle = `rgba(255,255,255,${.5 + .5 * tw})`; starP(g, q.b * tw * K, 4, .22); g.fill(); g.restore(); }
  }
  function celeFrame(p5, now) {
    const on = p5 >= .93;
    if (on && !celeT0) celeT0 = now; else if (!on && celeT0) { celeT0 = 0; celeG.clearRect(0, 0, cele.width, cele.height); thxImg.style.opacity = "0"; }
    if (!celeT0) { thxImg.style.opacity = "0"; return; }
    const t = (now - celeT0) / 1000;
    if (RM) { thxImg.style.opacity = "1"; thxImg.style.transform = "none"; return; }
    const tt = o3(clamp(t / .7)), drop = Math.pow(clamp(tt / .55), 2), bounce = tt < .55 ? 0 : Math.sin((tt - .55) / .45 * Math.PI) * .08;   // StampPop：2.4倍→1倍・少しはずむ・0.7秒
    thxImg.style.opacity = String(clamp(tt / .3)); thxImg.style.transform = `scale(${2.4 - 1.4 * drop + bounce})`; drawCele(t);
  }
  let s5Greeted = false;
  if (!RM) $$(".card h2").forEach(h2 => { let n = 0; h2.setAttribute("aria-label", h2.textContent); [...h2.childNodes].forEach(nd => { if (nd.nodeType !== 3) return; const f = document.createDocumentFragment(); [...nd.textContent].forEach(ch => { const s = document.createElement("span"); s.className = "ch" + (ch === " " ? " sp" : ""); s.setAttribute("aria-hidden", "true"); s.style.setProperty("--i", n++); s.textContent = ch === " " ? "\u00a0" : ch; f.appendChild(s); }); nd.replaceWith(f); }); });

  /* ---------- 登場（FV・時間駆動） ---------- */
  const letters = $$("#pp .c");
  function intro() {
    $$("[data-in]").forEach(el => el.style.opacity = ""); top.style.opacity = "";
    if (RM || !canAnimate) { letters.forEach(l => { l.style.opacity = 1; }); introP = 1; return; }
    top.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out", fill: "both" });
    $$("[data-in]").forEach(el => { const d = (+el.dataset.t || 0) * 1000, glide = el.dataset.in === "glide";
      el.animate(glide ? [{ opacity: 0, transform: "translateY(46px)" }, { opacity: 1, transform: "none" }] : [{ opacity: 0 }, { opacity: 1 }], { duration: glide ? 550 : 600, delay: d, easing: EASE.expo, fill: "both" }); });
    letters.forEach((l, i) => { const p = PAP[i], tot = p.d1 + p.d2, o1 = p.d1 / tot;
      l.animate([{ opacity: 0, transform: `translate(${p.x}px,${p.y}px) scale(${p.s0}) rotate(${p.r}deg)`, offset: 0, easing: EASE.p4out }, { opacity: 1, transform: `translate(0,0) scale(${p.s1}) rotate(0deg)`, offset: o1, easing: EASE.p2io }, { opacity: 1, transform: "none", offset: 1 }], { duration: tot * 1000, delay: (0.90 + p.t) * 1000, fill: "both" }); });
  }
  const mStill = $("mStill"), mAnim = $("mAnim"), conn = navigator.connection || {};
  const LITE = /[?&]mascot=lite/.test(location.search) || conn.saveData === true || /(^|-)(2g|3g)$/.test(conn.effectiveType || "");
  const ANIM = LITE ? "assets/mascot_wave_360_12fps.webp" : "assets/mascot_wave_360.webp";
  let greet = null, vid = null;
  function prepareGreeting() {
    if (RM || LOW || greet) return;
    const probe = document.createElement("video"), webm = !!probe.canPlayType && probe.canPlayType('video/webm; codecs="vp9"') !== "";
    if (SAFARI || !webm) { const im = new Image(); im.src = ANIM; greet = { img: true }; }
    else { vid = document.createElement("video"); vid.muted = true; vid.playsInline = true; vid.preload = "auto"; vid.src = "assets/mascot_wave.webm"; vid.setAttribute("aria-hidden", "true"); vid.load(); greet = { v: true }; }
  }
  function playGreeting() {
    prepareGreeting(); if (!greet) return;
    if (greet.img) { mAnim.onload = () => { mAnim.style.visibility = "visible"; mStill.style.visibility = "hidden"; }; mAnim.src = ""; mAnim.src = ANIM; }
    else { if (!vid.isConnected) mas.appendChild(vid); vid.currentTime = 0; vid.style.visibility = "visible"; vid.play().then(() => { mStill.style.visibility = "hidden"; }).catch(() => {}); }
  }

  /* ---------- 文字の場面＝動画（必要になった時にJSで作る。muted / playsinline / preload=metadata） ---------- */
  const zvBox = {}; $$("[data-zm]").forEach(b => { zvBox[b.dataset.zm] = { box: b, v: null }; });
  const zvKey = { fv: "fv", s3: "add", s4: "req", s5: "thx" }; const zvOn = {};
  function zvEnsure(k) {
    const z = zvBox[k]; if (!z || z.v || !ZV[k]) return z;
    if (RM) { const im = new Image(); im.alt = ""; im.src = M ? ZV[k].endSp : ZV[k].end; z.box.appendChild(im); z.v = im; return z; }
    const v = document.createElement("video"); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "metadata"; v.setAttribute("aria-hidden", "true");
    v.src = M ? ZV[k].sp : ZV[k].pc; v.addEventListener("error", () => zvFallback(k)); z.box.appendChild(v); z.v = v; return z; }
  function zvFallback(k) { const z = zvBox[k]; if (!z || !z.v || z.v.tagName !== "VIDEO" || !ZV[k]) return; const im = new Image(); im.alt = ""; im.src = M ? ZV[k].endSp : ZV[k].end; try { z.box.replaceChild(im, z.v); } catch (e) { return; } z.v = im; }   // 動画が読めない・自動再生できない時でも、見出しの最後の絵が出る
  function zvPlay(id, on) {
    const k = zvKey[id]; if (!k) return; const z = zvEnsure(k); if (!z || !z.v || RM) return;
    if (on) { try { z.v.currentTime = 0; const pr = z.v.play(); if (pr && pr.catch) pr.catch(err => { if (err && err.name === "NotAllowedError") zvFallback(k); }); } catch (e) {} } else { try { z.v.pause(); z.v.currentTime = 0; } catch (e) {} }
  }
  function zvPrepare() { ["add", "req", "thx"].forEach(k => { const el = zvBox[k] && (zvBox[k].box.closest(".chapter") || document.querySelector('[data-ch="s5"]')); if (el && !zvBox[k].v && el.getBoundingClientRect().top < H * 2.2) zvEnsure(k); }); }
  function zvScroll() { [["dl", document.querySelector(".closing")]].forEach(([k, el]) => { if (!zvBox[k] || !el) return; const r = el.getBoundingClientRect(), near = r.top < H * 1.6 && r.bottom > -H * .5; if (near) zvEnsure(k); const on = r.top < H * .6 && r.bottom > H * .35; if (on !== !!zvOn[k]) { zvOn[k] = on; const z = zvEnsure(k); if (z && z.v && !RM) { try { if (on) { z.v.currentTime = 0; const pr = z.v.play(); if (pr && pr.catch) pr.catch(() => {}); } else { z.v.pause(); z.v.currentTime = 0; } } catch (e) {} } } }); }

  /* ---------- 最後の場面：ミートボー＋ビビちゃんが跳ね込み、アイコンがポン、ハートと星が弾ける（入るたびに1回） ---------- */
  (function closingFx() {
    const sec = document.getElementById("closing"), cv = document.getElementById("clFx"), mit = document.getElementById("clMit");
    if (!sec || !cv || !("IntersectionObserver" in window)) return;
    sec.classList.add("cl-js");
    let raf = 0, t0 = 0, parts = [];
    const rnd = lcg(23), ico = () => { const r = sec.querySelector(".app").getBoundingClientRect(), s = sec.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }; };
    function emit(x, y, n, spread, up) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (rnd() - .5) * spread, sp = 340 + rnd() * 520; parts.push({ x, y, vx: Math.cos(a) * sp * (up ? 1 : 1.2), vy: Math.sin(a) * sp, sz: 9 + rnd() * 13, sh: i % 3, c: CC[Math.floor(rnd() * 6)], spin: (rnd() - .5) * 9, life: 1.7 + rnd() * 1.1, age: 0 }); } }
    function tick(now) {
      const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
      const w = sec.clientWidth, h = sec.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      parts = parts.filter(p => p.age < p.life);
      for (const p of parts) { p.age += dt; p.vy += 900 * dt; p.vx *= (1 - 1.1 * dt); p.x += p.vx * dt; p.y += p.vy * dt; const u = p.age / p.life, al = u < .7 ? 1 : 1 - (u - .7) / .3;
        g.save(); g.translate(p.x, p.y); g.rotate(p.spin * p.age); g.globalAlpha = clamp(al); g.fillStyle = p.c; const q = p.sz;
        if (p.sh === 1) { heartP(g, q); g.fill(); } else if (p.sh === 0) { starP(g, q, 5, .45); g.fill(); } else { g.beginPath(); g.arc(0, 0, q * .32, 0, 6.2832); g.fill(); } g.restore(); }
      if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; g.clearRect(0, 0, w, h); }
    }
    function burst() { if (RM || LOW && false) return; const c = ico(); emit(c.x, c.y, LOW ? 46 : 84, 2.9, true); setTimeout(() => { const w = sec.clientWidth, y = sec.clientHeight - 130; emit(w * .16, y, 26, 1.6, true); emit(w * .84, y, 26, 1.6, true); }, 650); t0 = performance.now(); if (!raf) raf = requestAnimationFrame(tick); }
    let shown = false;
    const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && mit && !mit.src) mit.src = "assets/mascot_wave_360_12fps.webp"; }), { rootMargin: "700px 0px" }); near.observe(sec);
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= .3) { if (!shown) { shown = true; sec.classList.add("in"); burst(); } }
      else if (!e.isIntersecting && shown) { shown = false; sec.classList.remove("in"); }
    }), { threshold: [0, .3] }).observe(sec);
  })();

  /* ---------- ミートボーの生活の場面（全章共通の1枚。いちばん出ている章の絵を出す） ---------- */
  const life = $("life"), lfImg = $("lfImg"), lfBub = $("lfBub"), lfLab = $("lfLab"), lfLock = $("lfLock"), lfCap = $("lfCap"), lfQ = $("lfQ"), lfTx = $("lfTx"), lfTxV = $("lfTxV"), lfTxI = $("lfTxI"), lkCard = $("lkCard"); let txOn = false; let lifeKey = "";
  function lifeFrame(ps) {
    let best = { op: 0 };
    Object.keys(LIFE_CH).forEach(ch => { const w = LIFE_WIN[ch], p = ps[ch], a = o4(seg(p, w[0], w[1])), out = sm(seg(p, w[2], w[3])), op = sm(seg(p, w[0], w[0] + .07)) * (1 - out);
      if (op > best.op) best = { op, a, out, pop: o4(seg(p, w[0] + .08, w[0] + .14)), key: LIFE_CH[ch], p, t: w[0] + .13 }; });
    if (best.op <= .01) { life.style.visibility = "hidden"; life.style.opacity = "0"; return; }
    if (lifeKey !== best.key) { lifeKey = best.key; const c = LIFE[best.key]; lfImg.src = c.src; lfImg.alt = c.alt; lfBub.textContent = c.bubble; lfLab.textContent = c.label; }
    life.style.visibility = "visible"; life.style.opacity = String(best.op);
    life.style.transform = `translateX(${-best.out * W * .35}px) scale(${1 - .25 * best.out})`; lfImg.parentElement.style.transform = `scale(${lerp(.78, 1, best.a)}) translateY(${(1 - best.a) * 30}px)`;
    /* 夜の場面：ミートボーが左へスライド → 大きなスマホ（実機のロック画面）が「ドン」と出て、吹き出しが「残ってた！」に。キャプション「ロック画面で、確認できます」 */
    /* 夜の場面（物語）：①ミートボー「なんか忘れてないっけ？」→②真ん中にドン「こんな経験ありませんか？」→③ミートボーが左へ・スマホがドン・「パパクエなら／ロック画面で確認できます」 */
    const night = best.key === "s7", qa = night ? sm(seg(best.p, .30, .36)) : 0, qIn = night ? o4(seg(best.p, .35, .42)) : 0, qOut = night ? sm(seg(best.p, .50, .55)) : 0, back = night ? sm(seg(best.p, .53, .58)) : 0;
    const lk = night ? o4(seg(best.p, .58, .64)) : 0, don = night ? o4(seg(best.p, .58, .65)) : 0, mv = night ? clamp(1 - qa * (1 - back)) : 1;
    /* ①ミートボーが真ん中（主役）→ ③左の端へ。スマホが真ん中にドン */
    const sh = lk * W * (M ? .23 : .33), sN = 1 - lk * (M ? .30 : .16);
    lfImg.parentElement.style.opacity = String(mv.toFixed(3));
    lfImg.parentElement.style.transform = `translateX(${-sh.toFixed(1)}px) scale(${(lerp(.78, 1, best.a) * sN).toFixed(3)}) translateY(${(1 - best.a) * 30}px)`;
    if (lfQ) { lfQ.style.opacity = String(night ? (qIn * (1 - qOut)).toFixed(3) : 0); lfQ.style.transform = `translateY(-50%) scale(${(lerp(1.7, 1, qIn) * (1 + .05 * bell(seg(best.p, .38, .5)))).toFixed(3)})`; }
    if (lfLock) {
      const area = life.clientHeight || (H - 64), ph = M ? Math.min(.38 * H, 300) : Math.min(.8 * H, 720), pw = ph * 481 / 960, cx = W * (M ? .74 : .5);
      lfLock.style.height = ph.toFixed(1) + "px"; lfLock.style.width = pw.toFixed(1) + "px"; lfLock.style.left = (cx - pw / 2).toFixed(1) + "px"; lfLock.style.top = (M ? 6 : Math.max(6, (area - ph) / 2 - 8)).toFixed(1) + "px";
      lfLock.style.opacity = String(night ? clamp(seg(best.p, .58, .605)) : 0);
      lfLock.style.transform = `translateY(${(-(1 - don) * 70).toFixed(1)}px) scale(${(lerp(1.4, 1, don) + (night ? .035 * bell(seg(best.p, .64, .74)) : 0)).toFixed(3)})`;
      if (lkCard) { lkCard.style.opacity = String(night ? clamp(seg(best.p, .67, .70)) : 0); lkCard.classList.toggle("on", night && best.p > .70 && !RM); }
      /* 右に大きく「ロック画面で【確認】できます。」（スマホは下に） */
      if (lfTx) {
        let tw, tx, ty;
        if (M) { tw = Math.min(.8 * W, 320); tx = (W - tw) / 2; ty = area - tw * 490 / 870 - 10; }
        else { const x0 = cx + pw / 2 + W * .02; tw = Math.min(W * .98 - x0, 820); tx = x0 + (W * .98 - x0 - tw) / 2; ty = (area - tw * 490 / 870) / 2 + 6; }
        const cs = M ? Math.min(15 * W / 100, 60) : Math.min(tw * .17, 150); if (!M) ty += cs * .55;
        lfTx.style.width = tw.toFixed(1) + "px"; lfTx.style.left = tx.toFixed(1) + "px"; lfTx.style.top = ty.toFixed(1) + "px";
        const want = night && best.p > .64;
        if (want !== txOn) { txOn = want;
          if (RM) { lfTxV.style.display = "none"; lfTxI.style.display = "block"; }
          else if (want) { try { lfTxV.currentTime = 0; const pr = lfTxV.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {} } else { try { lfTxV.pause(); } catch (e) {} } }
        lfTx.style.opacity = txOn ? "1" : "0";
        if (lfCap) { const cp = night ? o4(seg(best.p, .63, .68)) : 0; lfCap.style.cssText = `left:${tx.toFixed(1)}px;width:${tw.toFixed(1)}px;top:${(ty - cs * 1.15).toFixed(1)}px;bottom:auto;right:auto;font-size:${cs.toFixed(1)}px;opacity:${(night ? clamp(seg(best.p, .63, .655)) : 0).toFixed(3)};transform:scale(${lerp(1.7, 1, cp).toFixed(3)});transform-origin:50% 100%`; } }
      if (night) { const sw = best.p > .60; const txt = sw ? "残ってた！" : LIFE.s7.bubble; if (lfBub.textContent !== txt) lfBub.textContent = txt; } }
    lfLab.style.opacity = String(best.a * (1 - lk) * mv); lfBub.style.opacity = String(clamp(best.pop * 2) * mv); lfBub.style.transform = `scale(${lerp(.2, 1, best.pop) * (1 + .08 * bell(seg(best.p, best.t, best.t + .1)) + (best.key === "s7" ? .1 * bell(seg(best.p, .60, .68)) : 0))}) rotate(${(1 - best.pop) * -10}deg)`;
  }

  /* ---------- ビビちゃん（相手のスマホの右の空きに）：受け取った → ゴミ出し中 → スタンプで喜ぶ ---------- */
  const bivi = $("bivi"), bvThx = $("bvThx"), BV = { look: $("bvLook"), trash: $("bvTrash"), happy: $("bvHappy") }; let bvKey = "", bvT0 = 0;
  function biviFrame(S, p4, p5, u5, now) {
    if (!bivi) return;
    const key = p5 >= .93 ? "happy" : (u5 > .02 ? "trash" : (p4 >= .72 ? "look" : "")), vis = (M || !key) ? 0 : clamp(S.p2op * 1.5);
    if (vis <= .01) { bivi.style.visibility = "hidden"; bivi.style.opacity = "0"; bvKey = ""; if (bvThx) bvThx.classList.remove("on"); return; }
    const img = BV[key], ratio = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1.02, r = ph2.getBoundingClientRect();
    const left = r.right + 18 + (key === "trash" ? 76 : 0), availW = W - left - 14; /* ゴミ出しの場面は、広がる巻物の右端をよける */ let hh = Math.min(.46 * H, 420); if (hh * ratio > availW) hh = availW / ratio;
    if (hh < 150) { bivi.style.visibility = "hidden"; bivi.style.opacity = "0"; if (bvThx) bvThx.classList.remove("on"); return; }
    if (bvKey !== key) { bvKey = key; bvT0 = now; Object.keys(BV).forEach(k => { BV[k].style.opacity = k === key ? "1" : "0"; }); }
    const t = RM ? 9 : (now - bvT0) / 1000;
    let sc = 1, tx = 0, ty = 0;
    if (key === "look") { const e = o4(clamp(t / .5)); sc = lerp(.82, 1, e) + .06 * bell(clamp((t - .35) / .35)); ty = (1 - e) * 24; }
    else if (key === "trash") { const e = o4(clamp(t / .7)); tx = (1 - e) * 90; sc = 1; }
    else { sc = 1 + .17 * Math.abs(Math.sin(t * Math.PI / .42)) * Math.exp(-2.3 * t); }   // 喜ぶ：パンパン（2回はずんで落ち着く）
    bivi.style.width = (hh * ratio).toFixed(1) + "px"; bivi.style.height = hh.toFixed(1) + "px";
    bivi.style.left = left.toFixed(1) + "px"; bivi.style.top = Math.max(74, r.bottom - hh - 26).toFixed(1) + "px";
    bivi.style.visibility = "visible"; bivi.style.opacity = String(vis);
    if (bvThx) { const topY = Math.max(74, r.bottom - hh - 26), need = 62 + 96 - topY; bvThx.style.marginBottom = need > 0 ? (-need).toFixed(0) + "px" : "0"; bvThx.classList.toggle("on", key === "happy" && t > .12); }
    bivi.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
  }

  /* ---------- 触れる体験（02 ADD） ---------- */
  const tapHint = $("tapHint"), tapDone = $("tapDone"), tapAgain = $("tapAgain"); let hintW = 0;
  const TAPEND = 5.3;
  function tapStart() { if (TAP.st === 1) return; TAP.st = RM ? 2 : 1; TAP.t0 = performance.now(); }
  function tapTick(now) {
    const dt = Math.min(.1, (now - (TAP.last || now)) / 1000); TAP.last = now;
    let T = TAP.st === 1 ? (now - TAP.t0) / 1000 : TAP.st === 2 ? 99 : -1; if (T >= TAPEND) { TAP.st = 2; T = 99; }
    const run = TAP.st === 1;
    TAP.ringT = run ? seg(T, 0, .6) : 0; TAP.ring = run && T < .6 ? Math.sin(TAP.ringT * Math.PI) : 0;
    const target = (run && T > .35) || TAP.st === 2 ? 1 : 0; TAP.add = RM ? target : TAP.add + (target - TAP.add) * (1 - Math.exp(-dt * 9)); if (Math.abs(target - TAP.add) < .003) TAP.add = target;
    TAP.chars = run && T > .9 && T < 2.45 ? Math.min(2, Math.floor((T - .9) / .28) + 1) : 0;
    TAP.sheet = run ? (T < 2.55 ? sm(seg(T, .4, .8)) : 1 - sm(seg(T, 2.55, 2.85))) : 0;
    TAP.go = run && T > 2.0 && T < 2.5; TAP.goT = run ? seg(T, 2.0, 2.5) : 0; TAP.goRip = TAP.go ? Math.sin(TAP.goT * Math.PI) : 0;
    TAP.u3 = run ? o4(seg(T, 2.5, 3.3)) : 0; TAP.out3 = run ? io3(seg(T, 4.4, 5.0)) : (TAP.st === 2 ? 1 : 0);
    TAP.nq = TAP.st === 2 ? 1 : run ? sm(seg(T, 4.7, 5.2)) : 0; TAP.pop = run ? bell(seg(T, 2.5, 5.0)) : 0;
  }
  const stgActive = k => { const g = STG[k]; return !g.anim && !g.auto[g.i] && g.i < g.stops.length - 1; };
  function stgStart(k) { const g = STG[k]; if (g.anim || g.i >= g.stops.length - 1) return; g.anim = { from: g.v, to: g.stops[g.i + 1], t0: performance.now(), dur: g.dur[g.i] * 1000 }; if (RM) { g.v = g.anim.to; g.i++; g.anim = null; } }
  function stgTick(k, now, active) { const g = STG[k];
    if (g.anim) { const f = clamp((now - g.anim.t0) / g.anim.dur); g.v = lerp(g.anim.from, g.anim.to, f); if (f >= 1) { g.v = g.anim.to; g.i++; g.anim = null; } }
    else if (active && g.auto[g.i] && g.i < g.stops.length - 1) stgStart(k); }
  let hintOwner = "", doneOwner = "";
  function hintFrame(S, p3, u4, u5) {
    stgTick("s4", performance.now(), phWin(u4, "s4") > .5); stgTick("s5", performance.now(), phWin(u5, "s5") > .5);
    let best = { op: 0 };
    { const idle = TAP.st === 0, win = o4(seg(p3, .64, .72)) * (1 - sm(seg(p3, .90, .95))), op = idle ? win * S.p1op : 0;
      if (op > best.op) { const r = ripple.getBoundingClientRect(); best = { key: "s3", op, x: r.left + r.width / 2, y: r.top + r.height / 2, lab: "ここ押してみてね" }; } }
    [["s4", u4], ["s5", u5]].forEach(([k, u]) => { const g = STG[k], el = stgActive(k) ? g.tgt()[g.i] : null; if (!el) return; const wv = phWin(u, k) * o4(seg(u, WIN[k].ph[1], WIN[k].ph[1] + .05)); if (wv > best.op) { const r = el.getBoundingClientRect(); best = { key: k, op: wv, x: r.left + r.width / 2, y: r.top + r.height / 2, lab: g.lab[g.i] }; } });
    hintOwner = best.op > .02 ? best.key : ""; { const al = best.lab || "クエスト追加を押してみる"; if (tapHint.getAttribute("aria-label") !== al) tapHint.setAttribute("aria-label", al); }
    tapHint.style.opacity = String(best.op); tapHint.style.visibility = best.op > .02 ? "visible" : "hidden";
    if (best.op > .02) { const lt = tapHint.querySelector(".lbt"); if (lt.textContent !== best.lab) { lt.textContent = best.lab; hintW = 0; }
      tapHint.style.transform = `translate3d(${best.x}px,${best.y}px,0)`; const lb = tapHint.querySelector(".lb"); if (!hintW) hintW = lb.offsetWidth; const l = best.x - hintW / 2, rt = best.x + hintW / 2, sh = l < 8 ? 8 - l : rt > W - 8 ? W - 8 - rt : 0; tapHint.style.setProperty("--sh", sh.toFixed(1) + "px"); }
    let dk = "", dt = "";
    if (TAP.st === 2 && p3 > .66 && p3 < .92) { dk = "s3"; dt = "クエストができた！"; }
    else [["s4", u4], ["s5", u5]].forEach(([k, u]) => { const g = STG[k]; if (g.i >= g.stops.length - 1 && phWin(u, k) > .5) { dk = k; dt = g.done; } });
    doneOwner = dk; tapDone.classList.toggle("on", !!dk); { const tdt = $("tdText"); if (dk && tdt.textContent !== dt) tdt.textContent = dt; }
    const wOn = { s3: o4(seg(p3, .64, .72)) * (1 - sm(seg(p3, .90, .95))) > .5, s4: phWin(u4, "s4") > .5, s5: phWin(u5, "s5") > .5 };
    const playing = (TAP.st === 1 && wOn.s3) || (!!STG.s4.anim && wOn.s4) || (!!STG.s5.anim && wOn.s5);
    const ph = dk ? 0 : (hintOwner ? 1 : (playing ? 2 : 0)), sb = $("stateBar"); sb.className = "statebar" + (ph ? " on sb" + ph : ""); if (ph) { const tx = ph === 1 ? "光っている所を押してね" : "見ていてね…"; if ($("sbT").textContent !== tx) $("sbT").textContent = tx; sb.querySelector(".fing").style.display = ph === 1 ? "" : "none"; }
  }
  tapHint.onclick = () => { const kb = document.activeElement === tapHint, o = hintOwner; if (o === "s3") tapStart(); else if (o) stgStart(o); if (kb) setTimeout(() => { if (tapDone.classList.contains("on")) tapAgain.focus(); }, 60); };
  tapAgain.onclick = () => { if (doneOwner === "s3") { TAP.st = RM ? 2 : 1; TAP.t0 = performance.now(); } else if (doneOwner) { const g = STG[doneOwner]; g.v = 0; g.i = 0; g.anim = null; } };
  window.__tap = TAP; window.__stg = STG;

  /* ---------- 押す場面のスクロール制御：押す番の間は、下へ進めない（上は動く） ----------
     ・押す場面が画面の正位置（LK[k].p）に来たらロック。wheel／touchmove／キーで下向きだけ止め、scrollイベントでも位置に戻す（慣性・つまみ操作の保険）。
     ・解除：押し終わった／「スキップして先へ」／Escape／上へ戻った／ヘッダーのナビ／reduced-motion／極端に小さい画面／動画の読み込み失敗。
     ・一度「完了・スキップ・上へ戻った」場面は、二度とロックしない（「もう一度」もロック無し）。 */
  const LK = { s3: { p: .76, done: () => TAP.st === 2 }, s4: { p: .70, done: () => STG.s4.i >= 2 }, s5: { p: .70, done: () => STG.s5.i >= 4 } };
  const LS = { cur: null, y: 0, off: {}, vid: false }, skipBtn = $("lockSkip"), lockMsg = $("lockMsg"), mainEl = document.querySelector("main"); let lockPrev = rawY(), navUntil = performance.now() + 2500;   // 読み込み直後（#ハッシュ・戻るの復元）は対象外
  window.__LS = LS; window.__lockOff = list => list.forEach(k => { LS.off[k] = "test"; }); window.__rawY = rawY;
  const LOCKFIX = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const NOLOCK = /[?&]nolock/.test(location.search), lockOk = () => !NOLOCK && !RM && W >= 300 && H >= 560 && !LS.vid, lockYof = k => tops[IDX[k]] + (hs[IDX[k]] - H) * LK[k].p;
  /* ロック＝ページのスクロールそのものを無効にする：html/body に overflow:hidden＋touch-action:none＋overscroll-behavior:none（スクロールバーは消え、幅は scrollbar-gutter で確保）。
     iOS Safari は body を position:fixed にして位置を保持する。ロック中は main を inert にして、Tab のフォーカス移動によるスクロールも防ぐ。 */
  function lockSet(k) { const ly = k === "hold" ? rawY() : lockYof(k); if (k !== "hold") window.scrollTo(0, ly); LS.cur = k; LS.y = ly; const de = document.documentElement; if (LOCKFIX) { fixY = ly; document.body.style.top = -ly + "px"; de.classList.add("lockfix"); } de.classList.add("locked"); mainEl.inert = true; skipBtn.hidden = false; skipBtn.textContent = k === "hold" ? "このまま先へ" : "スキップして先へ"; lockMsg.textContent = k === "hold" ? "文字が出そろうまで、少しお待ちください" : "ボタンを押すと次へ進めます"; if (document.activeElement && mainEl.contains(document.activeElement)) document.activeElement.blur(); }
  function lockRelease(why) { const k = LS.cur; if (!k) return; LS.cur = null; if (why) LS.off[k] = why; document.documentElement.classList.remove("locked", "lockfix"); mainEl.inert = false; const y = LS.y; if (fixY !== null) { fixY = null; document.body.style.top = ""; window.scrollTo(0, y); } lockPrev = y; skipBtn.hidden = true; lockMsg.textContent = why === "done" ? "先へ進めます" : ""; }
  window.addEventListener("scroll", () => {   // 保険：ロック中に位置が動いたら戻す／ロック前は、押す場面の位置を下へ越えた瞬間にロック（つまみドラッグ・ホイール・キー・タッチ・慣性のどれでも）
    const y = rawY(), prev = lockPrev, now = performance.now(); lockPrev = y; if (!lockOk()) { if (LS.cur) lockRelease(null); return; }
    if (LS.cur) { if (fixY === null) { if (y < LS.y - 2) { lockRelease("up"); return; } if (Math.abs(y - LS.y) > 1) window.scrollTo(0, LS.y); } return; }
    if (y <= prev || navUntil > now) return;
    Object.keys(LK).sort((a, b) => lockYof(a) - lockYof(b)).some(k => { if (LS.off[k]) return false; const ly = lockYof(k); if (prev <= ly && y >= ly) { lockSet(k); return true; } return false; });
  }, { passive: true });
  window.addEventListener("wheel", e => { if (!LS.cur || e.ctrlKey) return; if (e.deltaY < 0) { lockRelease("up"); if (e.cancelable) e.preventDefault(); window.scrollBy(0, e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY); return; } if (e.cancelable) e.preventDefault(); }, { passive: false });   // 下向きだけ止める。上へ戻す操作はロックを解く（コメントどおり「上は動く」）
  window.addEventListener("mousedown", e => { if (LS.cur && e.button === 1) e.preventDefault(); });   // ホイールクリックのオートスクロール
  let tsY = 0; window.addEventListener("touchstart", e => { if (e.touches.length === 1) tsY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchmove", e => { if (!LS.cur || e.touches.length !== 1) return; if (fixY === null && e.touches[0].clientY - tsY > 8) { lockRelease("up"); return; } if (e.cancelable) e.preventDefault(); }, { passive: false });   // 指を下へ動かす＝上へ戻る操作は、ロックを解いて通す（iOSの固定方式は除く）
  window.addEventListener("keydown", e => {
    if (!LS.cur) return;
    if (e.key === "Escape") { lockRelease("escaped"); return; }
    if (["PageUp", "ArrowUp", "Home"].includes(e.key) && fixY === null) { lockRelease("up"); return; }
    const t = e.target && e.target.tagName, inter = t === "BUTTON" || t === "A" || t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
    if ([" ", "PageDown", "ArrowDown", "End"].includes(e.key) && !(e.key === " " && inter)) e.preventDefault();
  });
  document.addEventListener("click", e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) { navUntil = performance.now() + 2500; lockRelease(null); if (a.getAttribute("href") === "#top") { e.preventDefault(); window.scrollTo(0, 0); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } } });
  window.addEventListener("hashchange", () => { navUntil = performance.now() + 2500; lockRelease(null); });
  window.addEventListener("popstate", () => { navUntil = performance.now() + 2500; lockRelease(null); });
  document.addEventListener("focusin", () => { navUntil = performance.now() + 800; });   // Tab でのフォーカス移動によるスクロールでは、ロックしない
  const goNext = k => { navUntil = performance.now() + 2500; window.scrollTo({ top: tops[IDX[k]] + (hs[IDX[k]] - H) * .97, behavior: RM ? "auto" : "smooth" }); };
  skipBtn.onclick = () => { const k = LS.cur; if (!k) return; lockRelease("skip"); if (k !== "hold") goNext(k); };
  $("nextGo").onclick = () => { const k = doneOwner; if (k) { if (LS.cur) lockRelease("done"); goNext(k); } };
  window.addEventListener("resize", () => { if (LS.cur && LS.cur !== "hold") requestAnimationFrame(() => { LS.y = lockYof(LS.cur); if (fixY !== null) { fixY = LS.y; document.body.style.top = -LS.y + "px"; } else window.scrollTo(0, LS.y); }); });
  /* 見出し動画の「短い言葉が次々出る間」は、スクロールを止める（全文が出そろうまで）。全文が出たら自由。下へ入った時だけ・最大7秒・動画が動かなければ解除。 */
  const HOLD = { thx: 5.1 }; let hold = null, hLast = rawY(), hDown = false;
  function holdStart(k) { if (hold || LS.cur || !hDown || !lockOk() || LS.off.hold || !HOLD[k]) return; const z = zvBox[k]; if (!z || !z.v || z.v.tagName !== "VIDEO") return; hold = { k, t0: performance.now() }; lockSet("hold"); }
  function holdDone() { const z = zvBox[hold.k], v = z && z.v, t = performance.now() - hold.t0; return !v || v.tagName !== "VIDEO" || v.ended || v.currentTime >= HOLD[hold.k] || t > 7000 || (t > 3000 && v.currentTime < .2); }
  function lockFrame() { if (hold && LS.cur !== "hold") hold = null; if (hold && holdDone()) { hold = null; lockRelease("done"); return; } if (LS.cur && LS.cur !== "hold" && LK[LS.cur].done()) lockRelease("done"); }


  /* ---------- 体験デモ ---------- */
  const CAPS = [["あなた", "が、", "お願い", "を送る"], ["相手の画面", "に、", "届く", ""], ["相手が", "「", "受ける", "」。受けてもらえた"]];
  let capEls = null, s4Vis = 0;
  function buildCaps() { const box = $("capstack"); if (!box || capEls) return; capEls = CAPS.map(([a1, a2, k, a3]) => { const d = document.createElement("div"); d.className = "cl"; d.innerHTML = `${a1}${a2}<span class="mk">${k}</span>${a3}`; box.appendChild(d); return d; }); }
  const expo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x));
  function updateCaps(p4, vis) {
    buildCaps(); const e1 = expo(seg(p4, .26, .36)), e2 = expo(seg(p4, .76, .86));
    capEls.forEach((el, i) => { const enter = i === 0 ? expo(vis) : i === 1 ? e1 : e2, depth = i === 0 ? e1 + e2 : i === 1 ? e2 : 0;
      el.style.transform = `translateY(${((1 - enter) * 36 - depth * 30).toFixed(1)}px) scale(${Math.pow(.76, depth).toFixed(3)})`;
      el.style.opacity = (clamp(enter * 1.4) * clamp(1.9 - depth) * Math.max(.35, 1 - .62 * depth)).toFixed(3);
      el.style.color = depth > .5 ? "#7d857f" : "#1f2223"; el.style.setProperty("--mk", (enter * (1 - clamp(depth * 1.4))).toFixed(3)); }); }
  let lastSt4 = -1; const dtxt = $("dtxt");
  const dcard = $("dcard"), dname = $("dname"), dok = $("dok"), dstamp = $("dstamp"), dreset = $("dreset"), dinput = $("dinput");
  let dState = 0;
  function dAnim(el, kf, o) { if (RM || !canAnimate) { Object.assign(el.style, kf[kf.length - 1]); return; } el.animate(kf, { fill: "forwards", ...o }); }
  $$("#chips .chip").forEach(b => b.onclick = () => { $$("#chips .chip").forEach(x => x.classList.toggle("on", x === b)); dinput.value = b.textContent; });
  $("dform").onsubmit = e => { e.preventDefault(); const v = (dinput.value || "").trim().slice(0, 10) || "買い物"; dname.textContent = v; dok.disabled = false; dstamp.style.opacity = 0; dreset.style.opacity = 0;
    dcard.getAnimations().forEach(a => a.cancel()); dstamp.getAnimations().forEach(a => a.cancel()); dcard.style.opacity = "1";
    dAnim(dcard, [{ clipPath: "inset(0 0 62% 0)", transform: "perspective(900px) rotateX(28deg) scale(.94)" }, { clipPath: "inset(-80px -80px -80px -80px)", transform: "perspective(900px) rotateX(-7deg) scale(1.05)", offset: .62 }, { clipPath: "inset(-80px -80px -80px -80px)", transform: "perspective(900px) rotateX(0deg) scale(1)" }], { duration: 950, easing: EASE.expo }); dState = 1; $("dform").parentElement.classList.add("opened"); $("dform").parentElement.classList.remove("done"); dtxt.textContent = "「達成」を押す"; };
  dok.onclick = () => { if (dState !== 1) return; dState = 2; dok.disabled = true; $("dform").parentElement.classList.add("done"); dtxt.textContent = "達成！";
    dAnim(dstamp, [{ opacity: 0, transform: "scale(2.8) rotate(-24deg)" }, { opacity: .96, transform: "scale(1) rotate(-12deg)", offset: .6 }, { opacity: .96, transform: "scale(1.04) rotate(-12deg)", offset: .78 }, { opacity: .96, transform: "scale(1) rotate(-12deg)" }], { duration: 650, easing: "cubic-bezier(.2,.9,.3,1)" });
    dAnim(dcard, [{ transform: "translateY(0)" }, { transform: "translateY(5px)", offset: .6 }, { transform: "translateY(0)" }], { duration: 650 }); dreset.style.opacity = 1; };
  dreset.onclick = () => { dState = 0; $("dform").parentElement.classList.remove("opened", "done"); dtxt.textContent = "「クエストにする」を押す"; dcard.getAnimations().forEach(a => a.cancel()); dstamp.getAnimations().forEach(a => a.cancel()); dcard.style.clipPath = "inset(0 0 62% 0)"; dcard.style.opacity = "0"; dcard.style.transform = ""; dstamp.style.opacity = 0; dreset.style.opacity = 0; dok.disabled = false; dinput.focus(); };
  $("vplay").onclick = () => { const v = document.createElement("video"); v.controls = true; v.playsInline = true; v.preload = "auto"; v.poster = "assets/pr_poster.jpg";
    v.innerHTML = '<source src="assets/pr_720.mp4" type="video/mp4">'; const vin = $("vin"); vin.innerHTML = ""; vin.appendChild(v); v.play().catch(() => {}); v.focus(); };

  /* ---------- ループ ---------- */
  let smY = rawY(), lastT = 0;   // 描画に使うスクロール位置：実際の位置へなめらかに追従（止めると余韻でぴたっと止まる。逆スクロールも同じ道をたどる）
  function frame(now) {
    requestAnimationFrame(frame);
    const real = rawY();
    if (RM || !lastT) smY = real; else { smY += (real - smY) * (1 - Math.exp(-Math.min(.3, (now - lastT) / 1000) * 22)); if (Math.abs(real - smY) < .5) smY = real; }
    lastT = now; scrollY = smY;
    if (t0) introP = RM ? 1 : clamp(((now - t0) / 1000 - 1.55) / 1.1);
    px += (tx - px) * .08; py += (ty - py) * .08;
    const hy = scrollY / H, hs_ = sm(seg(hy, .55, 1.0));
    copy.style.transform = `scale(${1 - .55 * hs_})`; copy.style.opacity = String(1 - hs_); copy.style.visibility = hs_ > .98 ? "hidden" : ""; cue.style.setProperty("--co", String(Math.max(0, 1 - hy * 4)));
    if (scrollY > afterTop - H * .2) { fx.classList.add("off"); return; }
    tapTick(now); zvPrepare(); lockFrame(); S = globalState(); const ease = apply(S); details(S, now);
    fx.classList.toggle("off", S.p1op * ease < .01 && S.p2op < .01 && S.ca < .01 && S.mop < .01 && handOp < .01);
  }
  window.addEventListener("resize", () => { measure();  });
  if (CAN_HOVER && !LOW && !RM) window.addEventListener("pointermove", e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  const imgs = $$("#ph1 img, #mStill").slice(0, 3);
  const ready = Promise.all([document.fonts ? document.fonts.ready : 0, ...imgs.map(i => i.decode ? i.decode().catch(() => 0) : 0)]);
  Promise.race([ready, new Promise(r => setTimeout(r, 1000))]).then(() => { measure();  t0 = performance.now(); window.__pkT0 = t0; document.documentElement.classList.add("ready"); intro(); setTimeout(() => { zvEnsure("fv"); zvPlay("fv", true); }, 500); });
  window.addEventListener("load", () => { measure();  });
  requestAnimationFrame(frame);
  window.__pk = { get S() { return S; }, get smY() { return smY; }, get cfLast() { return cfLast; }, pin5: () => pin('s5'), tops: () => tops, pin };
})();
