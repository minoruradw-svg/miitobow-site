(() => {
  "use strict";
  const $ = id => document.getElementById(id), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const io5 = t => { t = clamp(t); return t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
  const io3 = t => { t = clamp(t); return t < .5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const o4 = t => 1 - Math.pow(1 - clamp(t), 4), o5 = t => 1 - Math.pow(1 - clamp(t), 5);
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
  const G = { XL: 0, car: { x: 0, y: 60 }, rq: { x: 0, y: 0 }, P2x: 1500, P2y: 0, s4: 1.12, sx0: 0, scrW: 0, scrH: 0, sq: { x: 0, y: -60, w: 200, h: 80 }, wg: { x: 80, y: -130 }, ig: { x: -20, y: 30 } };

  /* ---------- 文字ごとのグラデ ---------- */
  function paintGradient(box) {
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
    { const px = parseFloat(getComputedStyle(document.querySelector('.pin')).paddingLeft) || 0, cw = cards[IDX.s3] ? cards[IDX.s3].offsetWidth : 520; G.XL = (px + (W - px - cw - 28)) / 2; }
    G.tl5 = cards[IDX.s5] ? cards[IDX.s5].getBoundingClientRect().left : W * .6;
    const sy = scrollY = window.scrollY;
    tops = chEls.map(e => e.getBoundingClientRect().top + sy); hs = chEls.map(e => e.offsetHeight);
    afterTop = $("after").getBoundingClientRect().top + sy;
    W = innerWidth; H = innerHeight; M = W < 1000; PW = ph1.offsetWidth; PH = ph1.offsetHeight; MW = mas.offsetWidth; MH = mas.offsetHeight;
    MB = {}; if (M) ["s2", "s3", "s4", "s5"].forEach(id => { const c = cards[IDX[id]]; MB[id] = 76 + (c ? c.offsetHeight : 180); });
    G.s4 = M ? 1.0 : 1.02; G.P2x = M ? 0 : 1500; G.P2y = M ? 900 : 0;
    G.sx0 = .042 * PW; G.scrW = PW - 2 * G.sx0; G.scrH = PH - 2 * G.sx0;
    const so = screenEl.offsetTop, sl = screenEl.offsetLeft;                      // 画面(.screen)のスマホ内位置
    G.sq = { x: sl + sendQ.offsetLeft + sendQ.offsetWidth / 2 - PW / 2, y: so + sendQ.offsetTop + sendQ.offsetHeight / 2 - PH / 2, w: sendQ.offsetWidth, h: sendQ.offsetHeight };
    { const rq = $("recvQ"); G.rq = { x: sl + rq.offsetLeft + rq.offsetWidth / 2 - PW / 2, y: so + rq.offsetTop + rq.offsetHeight / 2 - PH / 2 }; }
    { sheet.style.transform = 'none'; const c = $("car"); G.car = { x: sl + sheet.offsetLeft + c.offsetLeft + c.offsetWidth / 2 - PW / 2, y: so + sheet.offsetTop + c.offsetTop + c.offsetHeight / 2 - PH / 2 }; sheet.style.transform = ''; }
    G.wg = { x: G.sx0 + .74 * G.scrW - PW / 2, y: G.sx0 + .31 * G.scrH - PH / 2 };
    G.ig = { x: G.sx0 + .40 * G.scrW - PW / 2, y: G.sx0 + .562 * G.scrH - PH / 2 };
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
  function heroState(p) {
    const s = sm(p), o = base(), c = heroCam(), lift = M ? Math.max(0, (MFV + PH) - (H - 28)) : 0;
    setCam(o, c); o.cy += 40 * s + lift * s; o.p1ry = -14 + 14 * s; o.p1rx = 4 * (1 - s * .5); o.glow = 1 - s; o.lB = 1;
    if (M) { o.mx = PW * .52 - MW / 2; o.my = -PH / 2 + 16 - MH * .97; } else { o.mx = -PW / 2 - MW * .86; o.my = c.cy + H / 2 - MH + 8; }   // スマホ版：ボタンの横に立ち、スマホの上端に足を乗せる／PC版：スマホの左下の外
    o.mop = 1 - s; o.ms = 1; return o;
  }
  const S2P = [{ x: -332, y: 6, r: -3, dz: 1.2, sc: 1.5, sy: -.20 }, { x: -215, y: -232, r: 6, dz: .95, sc: .92, sy: .06 }, { x: -258, y: 262, r: -5, dz: .9, sc: .92, sy: .30 }];
  const S2M = [{ x: -110, y: 60, r: -7, dz: 1, sc: .62, sy: -.20 }, { x: 110, y: 70, r: 6, dz: 1, sc: .62, sy: .06 }, { x: 0, y: 200, r: 0, dz: 1, sc: .62, sy: .30 }];
  const S2S = () => M ? { x: 0, y: 150 } : { x: -300, y: 40 };
  function cam2(p) { const t = io5(seg(p, .30, .62));
    if (M) { const cs = lerp(1, 1.06, t), y0 = yPhone("s2", .9, 30); return { cx: 0, cy: -(y0 - H / 2) / cs - 20 * t, cs, cr: 0 }; }
    const a = camFor(.78 * W, .5 * H, 1, 0, 0), b = camFor(.78 * W, .5 * H, 1.08, 0, 40); return { cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), cs: lerp(1, 1.08, t), cr: 0 }; }
  function S2(p) { const o = base(); setCam(o, cam2(p)); o.p1s = M ? .9 : .94; o.p1ry = lerp(-8, 0, sm(seg(p, 0, .3))); o.p1dim = .8 * sm(seg(p, .06, .30)); o.p1op = 1 - sm(seg(p, .86, 1));
    o.lpar = .55 * sm(seg(p, 0, .5)) * (1 - sm(seg(p, .88, 1))); o.ca = 1 - sm(seg(p, .84, .93)); return o; }
  function DEMO() { const o = S2(1); o.p1op = 0; o.ca = 0; o.lpar = 0; return o; }
  function base3() { return M ? camFor(.5 * W, yPhone("s3", .92, 26), 1, 0, 0) : camFor(G.XL, .5 * H, 1, 0, 0); }
  function base4() { return M ? camFor(.5 * W, yPhone("s4", G.s4, 54), 1, 0, 0) : camFor(.64 * W, .5 * H + 32, 1, 0, 0); }
  function S3(p) { const o = base3 && base(), s = M ? .92 : 1.10, s1 = lerp(s, G.s4, sm(seg(p, .86, 1)));
    const A = base3(); let B, C;
    if (M) { const csM = clamp((H - MB.s3 - 24) / (PH * s), 1.0, 1.3), camM = { cx: 0, cy: -PH * s / 2 - (MB.s3 + 12 - H / 2) / csM, cs: csM, cr: 0 }; B = camM; C = camM; }
    else { const fx_ = G.XL - .06 * W, fy_ = .5 * H; B = Object.assign(camFor(fx_, fy_, 1.45, G.wg.x * s, G.wg.y * s), { cr: RM ? 0 : -1 }); C = camFor(fx_, fy_, 1.30, G.ig.x * s, G.ig.y * s); }
    let c = mixCam(A, B, io5(seg(p, .18, .36))); c = mixCam(c, C, io3(seg(p, .34, .46))); c = mixCam(c, A, io5(seg(p, .62, .70))); c = mixCam(c, base4(), io3(seg(p, .86, 1)));
    setCam(o, c); o.p1s = s1; o.p1ry = -6 * (1 - sm(seg(p, .2, .34))); o.p1rx = 2 * (1 - sm(seg(p, .2, .34))); o.lB = 0; const to = sm(seg(p, .34, .46)), tp = sm(seg(p, .86, 1));
    o.lL = 1 - to; o.lA = to * (1 - tp); o.lP = tp; o.lpar = .45 * bell(seg(p, .70, .82)); return o; }
  // S4：飛ぶカードの軌道（ワールド座標）
  function flightPts() { const s = G.s4, a = { x: G.sq.x * s, y: G.sq.y * s }, b = { x: G.P2x + a.x, y: G.P2y + a.y };
    const c = M ? { x: a.x + 110, y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2, y: a.y - 390 }; return [a, c, b]; }
  const bez = (P, e) => { const k = 1 - e; return { x: k * k * P[0].x + 2 * k * e * P[1].x + e * e * P[2].x, y: k * k * P[0].y + 2 * k * e * P[1].y + e * e * P[2].y }; };
  const bezT = (P, e) => { const k = 1 - e; return Math.atan2(2 * k * (P[1].y - P[0].y) + 2 * e * (P[2].y - P[1].y), 2 * k * (P[1].x - P[0].x) + 2 * e * (P[2].x - P[1].x)); };
  function camD() { return M ? camFor(.5 * W, yPhone("s4", G.s4, 54), 1, G.P2x, G.P2y) : camFor(.64 * W, .5 * H + 32, 1, G.P2x, G.P2y); }
  function S4(p) { const o = base(), A = base4(), D = camD(), P = flightPts(), e = io5(seg(p, .32, .64)), ec = io5(seg(p, .35, .66));
    let cx = lerp(A.cx, D.cx, ec), cy = lerp(A.cy, D.cy, ec), cs = 1, cr = 0; const B = bez(P, e);
    if (!M) cy = lerp(A.cy, D.cy, 0) + (B.y - P[0].y) * .35 * (e > 0 && e < 1 ? 1 : (e >= 1 ? 1 : 0)); else cx = (B.x - P[0].x) * .4 * bell(e);
    cs = p < .32 ? lerp(1, M ? .96 : .94, io3(seg(p, .22, .32))) : (M ? 1 - .12 * bell(e) : .94 - .16 * bell(e));
    if (p >= .64) { cs = lerp(M ? .96 : .94, 1, io3(seg(p, .64, .74))); }
    if (!RM && !M) cr = p < .64 ? -1.2 + 2.4 * e : lerp(1.2, 0, io3(seg(p, .64, .74)));
    if (!M && p >= .64) cy = lerp(cy, 0, io3(seg(p, .64, .74)));
    const z = io3(seg(p, .74, .84)); cs = lerp(cs, M ? 1 : 1.15, z); if (!M) cy = lerp(cy, -60, z);
    setCam(o, { cx, cy, cs, cr }); o.p1s = G.s4; o.p1ry = 0; o.p1rx = 0; o.p1dim = sm(seg(p, .22, .32)) * .9; o.lB = 0; o.lP = 1; o.p2op = 1; o.p2y = G.P2y + 4 * bell(seg(p, .74, .78));
    o.lgrn = .5 * bell(seg(p, .32, .64)); o.lpar = p >= .64 ? .4 * bell(seg(p, .64, .82)) : 0; o.lparx = G.P2x; o.lpary = G.P2y; return o; }
  // S5：ハンコ→ありがとうスタンプ
  const w5 = x => x < .035 ? x / .035 * .11 : x < .28 ? .11 + (x - .035) / .245 * .23 : x < .80 ? .34 + (x - .28) / .52 * .60 : .94 + (x - .80) / .20 * .06;   // 巻物が出たら、すぐハンコ（待ちを詰める）   // 外側のスクロール量→内部の進行（「ありがとう」の場面に長い尺）
  const kP = () => M ? Math.min(1.3, (W - 36) / 230) : Math.max(1.1, Math.min(1.9, 2 * (G.tl5 - 24 - G.XL) / 230));
  const popC5 = () => ({ x: G.P2x, y: G.P2y - .04 * PH * G.s4 });
  const stampPos = () => { const c = popC5(), k = kP(); return { x: c.x + .21 * 230 * k, y: c.y - (M ? 16 : 0) }; };   // 実際のハンコのように、カードの角へ少しずらして押す（カード名を読めるように）
  function S5(p) { const o = base(), xs = G.XL / W, D = M ? camD() : camFor(xs * W, .5 * H + 32, 1, G.P2x, G.P2y), Sp = stampPos(), A = M ? base4() : camFor(xs * W, .5 * H + 32, 1, 0, 0), s4e = S4(1);
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
    o.lgld = (.5 * sm(seg(p, .185, .22)) * lerp(1, .4, sm(seg(p, .22, .40)))) * (1 - sm(seg(p, .94, 1))); o.lgrn = Math.min(.5, .4 * bell(seg(p, .36, .50)) + .5 * bell(seg(p, .58, .80)));
    o.mx = G.P2x - PW * G.s4 / 2 - MW * .66; o.my = G.P2y + PH * G.s4 / 2 - MH * .85 + 4; o.mop = sm(seg(p, .95, .985)); o.ms = .85; return o; }
  function OUT() { const o = S5(1); o.p1op = 0; o.p2op = 0; o.mop = 0; o.ca = 0; o.lgld = 0; o.lgrn = 0; return o; }
  const FN = { s2: S2, demo: DEMO, s3: S3, s4: S4, s5: p => S5(w5(p)), s6: OUT, s7: OUT };
  function mix(a, b, t) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o; }
  function globalState() {
    const heroP = clamp((scrollY - .35 * H) / (.35 * H)), first = tops[0] - H;
    if (scrollY <= first) return heroState(heroP);
    let i = 0; for (let k = 0; k < tops.length; k++) if (scrollY >= tops[k] - H) i = k;
    const id = ids[i], p = pin(id), enter = sm(1 - (tops[i] - scrollY) / H), cur = FN[id](p);
    if (enter >= 1 || scrollY >= tops[i]) return cur;
    const prev = i === 0 ? heroState(1) : FN[ids[i - 1]](1), tgt = FN[id](0);
    const fast = tgt.p1op < .01 && tgt.p2op < .01 ? sm(clamp(enter * 3)) : ((prev.p1op < .01 && prev.p2op < .01) ? sm(seg(enter, .6, 1)) : enter);   // スマホのない場面からは、スマホの登場を後ろ40%へ（デモに残像を出さない）
    return mix(prev, tgt, fast);
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
  const pp3 = $("pp3"), pp3L = $$(".c", pp3), qlL = $$("#qh .ql"), rv = $("rv"), word = $("word"), wordfly = $("wordfly");
  const gobtn = $("gobtn"), newq = $("newq"), ripple = $("ripple"), s3step = $("s3step"), s4step = $("s4step"), s4steps = $("s4steps"), s4bar = $("s4bar"), okRipple = $("okRipple"), s4barSteps = $("s4barSteps"), tag1e = $("tag1"), s5step = $("s5step");
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
    const p2 = pin("s2"), p3 = pin("s3"), p4 = pin("s4"), p5 = w5(pin("s5"));
    // ---- S2：スマホ画面から巻物が浮かび、ほどけ、奥行きをもって広がり、1本に巻き戻る ----
    const cam = { cx: S.cx, cy: S.cy };
    qcs.forEach((c, i) => { const g = (M ? S2M : S2P)[i], k = o4(seg(p2, .06 + .16 * i, .30 + .16 * i)), ku = sm(seg(k, 0, .3)), rb = io3(seg(p2, .78 + .03 * i, .90 + .03 * i)), Sv = S2S();
      const sx = 0, sy = g.sy * PH * (M ? .9 : 1), fxp = g.x + cam.cx * (1 - g.dz), fyp = g.y + cam.cy * (1 - g.dz);
      const x = lerp(lerp(sx, fxp, k), Sv.x, rb), y = lerp(lerp(sy, fyp, k), Sv.y, rb), sc = lerp(lerp(.8, g.sc, k), (M ? .5 : .78), rb);
      const roll = 62 * clamp(1 - ku), rx = 28 * (1 - ku) - 6 * bell(seg(k, .2, 1)), sh = k;   // 終わりは切らずに、すっと消える（体験デモの巻物は押すまで出さない）
      c.style.zIndex = String(3 - i); c.style.display = S.ca * clamp(k * 6) > .01 ? "" : "none"; c.style.opacity = String(S.ca * clamp(k * 6)); c.style.clipPath = `inset(-70px -70px calc(${roll}% - 70px) -70px)`;
      c.style.transform = `translate3d(${x}px,${y}px,0) perspective(900px) rotateX(${rx}deg) rotate(${g.r * k * (1 - rb)}deg) scale(${sc})`;
      });
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
    papScrub(pp3L, p3 / .22); pp3.style.transform = `scale(${1 - .04 * bell(seg(p3, .16, .28))})`;
    ripple.style.opacity = String(Math.sin(seg(p3, .16, .28) * Math.PI)); ripple.style.transform = `scale(${.4 + 1.2 * seg(p3, .16, .28)})`;
    const wIn = o4(seg(p3, .40, .48)), wFly = io3(seg(p3, .48, .60));
    word.style.opacity = String(wFly > 0 ? 0 : wIn); word.style.transform = `translateY(${14 * (1 - wIn)}px)`;
    if (p3 > .47 && p3 < .62) {
      const a = word.getBoundingClientRect(), b = typed.getBoundingClientRect(), fs = parseFloat(getComputedStyle(word).fontSize), lh = fs * 1.2;
      wordfly.style.fontSize = fs + "px"; wordfly.style.lineHeight = "1.2"; const sc = lerp(1, Math.max(.2, b.height / lh), wFly), x = lerp(a.left, b.left, wFly), y = lerp(a.top, b.top, wFly) - Math.sin(wFly * Math.PI) * 24;
      wordfly.style.transform = `translate3d(${x}px,${y}px,0) scale(${sc}) rotate(${-3 * bell(wFly)}deg)`; wordfly.style.opacity = wFly > 0 && wFly < 1 ? "1" : "0";
    } else wordfly.style.opacity = "0";
    typed.textContent = p3 >= .60 ? "筋トレ" : ""; typed.style.visibility = p3 >= .60 ? "visible" : "hidden";
    gobtn.style.opacity = String(p3 > .64 && p3 < .70 ? .9 : 0);
    newq.style.opacity = "0";
    { const u3 = o4(seg(p3, .70, .80)), out3 = io3(seg(p3, .84, .90)), sc3 = S.p1s, cs3 = S.cs, phX = W / 2 + (0 - S.cx) * cs3, tl = cards[IDX.s3].getBoundingClientRect().left;
      const kmax = M ? Math.min(1.3, (W - 36) / (230 * cs3)) : Math.max(.9, Math.min(1.9, 2 * Math.min(tl - 24 - phX, phX - 16) / (230 * cs3)));
      const k3 = lerp(.35, kmax, u3) * lerp(1, .35, out3), sx = G.ig.x * sc3, sy = G.ig.y * sc3, ex = 0, ey = -.03 * PH * sc3, px3 = lerp(lerp(sx, ex, u3), sx, out3), py3 = lerp(lerp(sy, ey, u3), sy, out3);
      pop3.style.display = p3 > .70 && p3 < .91 ? "" : "none"; pop3.style.opacity = String(clamp(u3 * 3) * (1 - sm(seg(p3, .87, .905))));
      pop3.style.clipPath = `inset(-70px -70px calc(${62 * (1 - u3)}% - 70px) -70px)`; pop3.style.transform = `translate3d(${px3}px,${py3}px,0) perspective(900px) rotateX(${24 * (1 - u3)}deg) scale(${k3})`; }
    setText(s3step, p3 < .3 ? "ロック画面で、タップ" : p3 < .7 ? "名前を入れる" : "受注。クエストができた");
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
    setText(sendStatus, p4 < .22 ? "お願いを送る" : (p4 < .82 && p5 === 0 ? "返事を待っています" : "受けてもらいました"));
    s2Idle.style.opacity = String(1 - sm(seg(p4, .64, .68))); const swapped = p4 >= .72;
    s2Recv.style.opacity = String(sm(seg(p4, .68, .74)) * (1 - sm(seg(p5, .78, .84)))); recvQ.style.opacity = swapped ? "1" : "0";
    okBtn.classList.toggle("on", p4 > .82 && p4 < .88); okRipple.style.opacity = String(Math.sin(seg(p4, .79, .88) * Math.PI)); okRipple.style.transform = `scale(${.4 + 1.2 * seg(p4, .79, .88)})`; recvStatus.style.opacity = String(p4 > .86 || p5 > 0 ? 1 : 0); setText(recvStatus, p5 > .1 ? "達成しました" : "受けました");
    const tg = true;
    tag1.style.opacity = String(tg ? sm(seg(p4, 0, .08)) * (1 - sm(seg(p4, .26, .32))) * (p5 === 0 ? 1 : 0) * (scrollY > tops[IDX.s4] - H * .5 ? 1 : 0) : 0);
    tag2.style.opacity = String(tg ? sm(seg(p4, .60, .68)) * (1 - sm(seg(p5, .04, .10))) : 0);
    tag1.style.transform = `translate3d(${0}px,${-PH * s / 2 - (M ? 28 : 34) - 8 * (1 - o4(seg(p4, 0, .08)))}px,0) translateX(-50%)`; tag2.style.transform = `translate3d(${G.P2x}px,${G.P2y - PH * s / 2 - (M ? 28 : 34)}px,0) translateX(-50%)`;
    const st4 = p4 < .30 ? 0 : p4 < .80 ? 1 : 2;
    if (st4 !== lastSt4) { lastSt4 = st4; [s4steps, s4barSteps].forEach(ol => [...ol.children].forEach((li, i) => { li.className = i === st4 ? "on" : (i < st4 ? "done" : ""); })); }
    s4bar.style.opacity = String(sm(seg(p4, .30, .35)) * (1 - sm(seg(p4, .63, .68))) * (p5 === 0 ? 1 : 0));
    setText(s4step, p4 < .32 ? "あなたが「ゴミ出し」をお願いする" : p4 < .72 ? "お願いが、相手の画面へ届く" : "相手が「了解」して、受けてもらえた");
    // ---- S5：CLEARハンコ→紙吹雪→ありがとうスタンプ ----
    const Sp = stampPos(), sz = M ? 150 : 190, k5 = seg(p5, .12, .20), fall = o5(k5), land5 = seg(p5, .185, .21);
    stampBig.style.width = stampBig.style.height = sz + "px"; stampBig.style.margin = `${-sz / 2}px 0 0 ${-sz / 2}px`;
    const gone = 1 - sm(seg(p5, .30, .35)); stampBig.style.opacity = String(clamp(seg(p5, .12, .135)) * gone); stampBig.style.display = (p5 > .1 && gone > .01) ? "" : "none"; ink.style.display = (p5 > .18 && gone > .01) ? "" : "none"; cf.style.display = (p5 >= .19 && p5 <= .44) ? "" : "none";
    const kk = 0;
    stampBig.style.transform = `translate3d(${Sp.x + sz * .14 * kk}px,${Sp.y + sz * .09 * kk}px,0) scale(${lerp(3, 1, fall) * (1 + .04 * bell(land5)) * lerp(1, .6, kk)}) rotate(${lerp(-24, -12, fall)}deg)`;
    stampBig.firstElementChild.style.filter = `drop-shadow(0 ${lerp(40, 2, fall)}px ${lerp(50, 4, fall)}px rgba(120,20,15,${lerp(.25, .35, fall)}))`;
    const u185 = seg(p5, .185, .26); ink.style.opacity = String(p5 > .185 ? lerp(.25, 0, u185) * gone : 0); ink.style.transform = `translate3d(${Sp.x}px,${Sp.y}px,0) scale(${lerp(.6, 1.3, u185)})`;
    flash.style.opacity = String(p5 > .185 && p5 < .23 ? (1 - seg(p5, .185, .23)) * .28 : 0);
    { const pre5 = clamp((scrollY - (tops[IDX.s5] - H * .8)) / (H * .8)), u5 = Math.max(o4(seg(p5, 0, .10)), o4(pre5)), out5 = io3(seg(p5, .30, .36)), k = kP(), C5 = popC5(), rqx = G.P2x + G.rq.x * G.s4, rqy = G.P2y + G.rq.y * G.s4;
      const pk = lerp(.35, k, u5) * lerp(1, .35, out5), qx = lerp(lerp(rqx, C5.x, u5), rqx, out5), qy = lerp(lerp(rqy, C5.y, u5), rqy, out5);
      pop5.style.display = (p5 > 0 || pre5 > 0) && p5 < .365 ? "" : "none"; pop5.style.opacity = String(clamp(u5 * 3) * (1 - sm(seg(p5, .33, .36))));
      pop5.style.clipPath = `inset(-70px -70px calc(${62 * (1 - u5)}% - 70px) -70px)`; pop5.style.transform = `translate3d(${qx}px,${qy + 3 * bell(seg(p5, .185, .21)) * k}px,0) perspective(900px) rotateX(${24 * (1 - u5)}deg) scale(${pk})`;
      pop5ok.classList.toggle("on", p5 > .105 && p5 < .15); recvQ.style.opacity = String(1 - sm(clamp(u5 * 1.6)) * (1 - sm(seg(p5, .35, .37)))); }
    ltGld.style.transform = `translate3d(${Sp.x}px,${Sp.y}px,0)`; ltGrn.style.transform = `translate3d(${M ? 0 : G.P2x / 2}px,${M ? 450 : -200}px,0)`;
    cf.style.transform = `translate3d(${Sp.x - cf.width / 2}px,${Sp.y - cf.height * .45}px,0)`; drawConfetti(p5 >= .19 && p5 <= .44 ? seg(p5, .19, .44) : 0);
    // ---- 後半：いいね・ありがとうを伝える → スタンプを選ぶ → 押す → 相手に届く ----
    const askIn = sm(seg(p5, .42, .47)), up = io5(seg(p5, .50, .57)), down = io5(seg(p5, .76, .80)), shW = up * (1 - down);
    thxBtnEl.style.opacity = String(askIn * (1 - sm(seg(p5, .50, .52)))); thxBtnEl.classList.toggle("on", p5 > .485 && p5 < .505);
    askRip.style.opacity = String(Math.sin(seg(p5, .475, .51) * Math.PI)); askRip.style.transform = `scale(${.4 + 1.2 * seg(p5, .475, .51)})`;
    sheet.style.transform = `translateY(${(1 - shW) * 103}%)`;
    const pg = io3(seg(p5, .60, .68)); car0.style.transform = `translateX(${-pg * 11}em) scale(${lerp(1, .66, pg)})`; car0.style.opacity = String(lerp(1, .5, pg));
    car1.style.transform = `translateX(${(1 - pg) * 11}em) scale(${lerp(.66, 1, pg)})`; car1.style.opacity = String(lerp(.5, 1, pg)); setText(curl, pg > .5 ? "ありがとう" : "いいね");
    nchips.children[1].classList.toggle("on", p5 > .69); sbtn.classList.toggle("on", p5 > .735 && p5 < .765);
    sendRip.style.opacity = String(Math.sin(seg(p5, .725, .765) * Math.PI)); sendRip.style.transform = `scale(${.4 + 1.2 * seg(p5, .725, .765)})`;
    sendStatus.style.opacity = String(p5 > 0 ? 1 - sm(seg(p5, .44, .46)) : 1);
    if (p5 > .44) setText(sendStatus, "お願いが達成されました");
    rv.style.backgroundPosition = `${100 * (1 - o4(seg(p5, .44, .56)))}% 0`;
    const P5 = flightPts(), e5 = io5(seg(p5, .79, .90)), tk = o4(seg(p5, .765, .80)), sizeT = .62 * G.scrW * G.s4, start = { x: G.car.x * G.s4, y: G.car.y * G.s4 };
    thxFly.style.width = thxFly.style.height = sizeT + "px"; thxFly.style.margin = `${-sizeT / 2}px 0 0 ${-sizeT / 2}px`;
    const tp = p5 < .79 ? start : bez([start, P5[1], { x: G.P2x, y: G.P2y }], e5);
    const ts = p5 < .79 ? lerp(.6, 1, tk) : 1 + .15 * bell(e5), vis = p5 >= .765 && p5 < .93;
    thxFly.style.display = vis ? "" : "none"; thxFly.style.opacity = vis ? String(clamp(seg(p5, .765, .78))) : "0"; thxFly.style.transform = `translate3d(${tp.x}px,${tp.y}px,0) scale(${ts}) rotate(${p5 >= .79 && p5 < .90 ? Math.sin(e5 * 2 * Math.PI) * 4 : 0}deg)`;
    s2Arrive.style.opacity = String(sm(seg(p5, .90, .94))); thxCap.style.opacity = String(sm(seg(p5, .95, .985)));
    thxImg.style.opacity = String(sm(seg(p5, .93, .95))); thxImg.style.transform = "none";
    setText(s5step, p5 < .30 ? "お願いが達成された" : p5 < .56 ? "ありがとうを伝える" : "スタンプが届く");
    if (S.mop > .5 && p5 > .955 && !s5Greeted) { s5Greeted = true; playGreeting(); }
    if (p5 < .5) s5Greeted = false;
    // ---- 章テキストの出入り ----
    chEls.forEach((el, i) => { const c = cards[i]; if (!c || !el.classList.contains("chapter")) return; const p = clamp((scrollY - tops[i]) / Math.max(1, hs[i] - H));
      let a = sm(clamp((scrollY - tops[i] + H * .14) / (H * .14))), out = ids[i] === 's5' ? 1 - sm(seg(p, .97, 1)) : ids[i] === 's3' ? 1 - sm(seg(p, .86, .91)) : 1 - sm(seg(p, .93, 1));
      if (ids[i] === 's4') a *= 1 - .98 * sm(seg(p, .24, .30)) * (1 - sm(seg(p, .68, .74)));
      if (ids[i] === 's5') { const q = w5(p); a *= q < .43 ? sm(seg(q, .21, .26)) * (1 - sm(seg(q, .33, .38))) : Math.min(sm(seg(q, .47, .52)), 1 - .98 * sm(seg(q, .76, .80)) * (1 - sm(seg(q, .915, .94)))); const sa = $('s5a'), sb = $('s5b'); sa.style.display = q < .43 ? '' : 'none'; sb.style.display = q < .43 ? 'none' : ''; }
      c.style.setProperty("--vis", (a * out).toFixed(3)); });
  }
  let s5Greeted = false;

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
    setTimeout(prepareGreeting, 800); setTimeout(() => playGreeting(), 2650);
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

  /* ---------- 体験デモ ---------- */
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
  let smY = window.scrollY, lastT = 0;   // 描画に使うスクロール位置：実際の位置へなめらかに追従（止めると余韻でぴたっと止まる。逆スクロールも同じ道をたどる）
  function frame(now) {
    requestAnimationFrame(frame);
    const real = window.scrollY;
    if (RM || !lastT) smY = real; else { smY += (real - smY) * (1 - Math.exp(-Math.min(.3, (now - lastT) / 1000) * 22)); if (Math.abs(real - smY) < .5) smY = real; }
    lastT = now; scrollY = smY;
    if (t0) introP = RM ? 1 : clamp(((now - t0) / 1000 - 1.55) / 1.1);
    px += (tx - px) * .08; py += (ty - py) * .08;
    const heroP = clamp((scrollY - .35 * H) / (.35 * H)), hs_ = sm(heroP);
    copy.style.transform = `translate3d(0,${-12 * hs_}px,0)`; copy.style.opacity = String(1 - hs_); ctam.style.opacity = String(1 - hs_); ctam.style.pointerEvents = hs_ > .6 ? "none" : "auto"; cue.style.setProperty("--co", String(Math.max(0, 1 - heroP * 4)));
    if (scrollY > afterTop - H * .2) { fx.classList.add("off"); return; }
    S = globalState(); const ease = apply(S); details(S, now);
    fx.classList.toggle("off", S.p1op * ease < .01 && S.p2op < .01 && S.ca < .01 && S.mop < .01 && handOp < .01);
  }
  window.addEventListener("resize", () => { measure(); paintGradient($("pp")); paintGradient(pp3); });
  if (CAN_HOVER && !LOW && !RM) window.addEventListener("pointermove", e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  const imgs = $$("#ph1 img, #mStill").slice(0, 3);
  const ready = Promise.all([document.fonts ? document.fonts.ready : 0, ...imgs.map(i => i.decode ? i.decode().catch(() => 0) : 0)]);
  Promise.race([ready, new Promise(r => setTimeout(r, 2000))]).then(() => { measure(); paintGradient($("pp")); paintGradient(pp3); t0 = performance.now(); window.__pkT0 = t0; document.documentElement.classList.add("ready"); intro(); });
  window.addEventListener("load", () => { measure(); paintGradient($("pp")); paintGradient(pp3); });
  requestAnimationFrame(frame);
  window.__pk = { get S() { return S; }, get smY() { return smY; }, get cfLast() { return cfLast; }, pin5: () => pin('s5'), tops: () => tops, pin };
})();
