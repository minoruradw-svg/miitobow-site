/* miitobow.com ページ遷移アニメーション（Motion Prompt #092 のタイミング・イージングを採用）
 * 上のメニュー（HOME / WHY FOLLOW / 読み物 / 作ったもの）を押すと、icon_ios_1024_soft_green と同じグラデの幕が
 * 左から入って画面全体を覆い（0.4秒・easeInOut 3乗）、覆っている間にページを切り替え、次のページで幕が右へ抜ける（0.45秒）。
 * 幕の上でミートボーとビビちゃんが右へ走る（papaクエのローディングと同じ素材 assets/loading/run.webp）。
 * 外から読み込む物は無し。動きを減らす設定（prefers-reduced-motion）の人には出さない。 */
(function () {
  if (window.__ptInit) return;
  window.__ptInit = 1;
  var D = document, H = D.documentElement;
  var KEY = "pt-transition";
  var IN = 400, OUT = 450;
  var GRAD = "linear-gradient(135deg,#1dcfaf 0%,#80eaa1 55%,#e0f18c 100%)";
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var arriving = false;
  try { arriving = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch (e) {}
  if (reduce) return;

  var css = D.createElement("style");
  css.textContent =
    ".pt-curtain{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100dvh;z-index:2147483647;background:" + GRAD +
    ";transform:translate3d(-101%,0,0);will-change:transform;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center}" +
    ".pt-run{width:min(520px,82vw,calc(52vh*1.63));aspect-ratio:668/410}" +
    ".pt-run img{display:block;width:100%;height:100%;-webkit-user-select:none;user-select:none;pointer-events:none}" +
    ".pt-load{margin-top:2.4vmin;display:flex;align-items:flex-end;justify-content:center;font:800 clamp(30px,6.2vmin,56px)/1 'Zen Maru Gothic','Hiragino Maru Gothic ProN','Yu Gothic UI','Meiryo',sans-serif;letter-spacing:.06em;color:#0b4a40;text-shadow:0 2px 0 rgba(255,255,255,.45)}" +
    ".pt-load span{display:inline-block;animation:pt-bounce 1.4s infinite}" +
    ".pt-load i{display:inline-block;width:.16em;height:.16em;border-radius:50%;background:#0b4a40;margin:0 .06em .22em;opacity:.25;animation:pt-dot 1.4s infinite}" +
    ".pt-load i:nth-of-type(1){margin-left:.35em}" +
    "@keyframes pt-bounce{0%{transform:translateY(0)}14%{transform:translateY(-.28em)}28%,100%{transform:translateY(0)}}" +
    "@keyframes pt-dot{0%,24%{opacity:.25}25%,100%{opacity:1}}" +
    "@keyframes pt-dot2{0%,49%{opacity:.25}50%,100%{opacity:1}}" +
    "@keyframes pt-dot3{0%,74%{opacity:.25}75%,100%{opacity:1}}" +
    ".pt-load i:nth-of-type(2){animation-name:pt-dot2}.pt-load i:nth-of-type(3){animation-name:pt-dot3}" +
    "@media (prefers-reduced-motion:reduce){.pt-load span,.pt-load i{animation:none}.pt-load i{opacity:1}}";
  var curtain = D.createElement("div");
  curtain.className = "pt-curtain";
  curtain.setAttribute("aria-hidden", "true");
  var runBox = D.createElement("div");
  runBox.className = "pt-run";
  var img = D.createElement("img");
  img.src = "/assets/loading/run-hd.webp";
  img.alt = "";
  img.decoding = "async";
  runBox.appendChild(img);
  var load = D.createElement("div");
  load.className = "pt-load";
  "Loading".split("").forEach(function (ch, i) {
    var sp = D.createElement("span");
    sp.textContent = ch;
    sp.style.animationDelay = (i * 0.07) + "s";
    load.appendChild(sp);
  });
  for (var d = 0; d < 3; d++) load.appendChild(D.createElement("i"));
  curtain.appendChild(runBox);
  curtain.appendChild(load);
  H.appendChild(css);
  H.appendChild(curtain);

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function W() { return Math.max(H.clientWidth || 0, window.innerWidth || 0) + 2; }
  function setX(x) { curtain.style.transform = "translate3d(" + x + "px,0,0)"; }
  function run(from, to, ms, done) {
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms);
      setX(from + (to - from) * ease(p));
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  var busy = false;
  window.__pt = { busy: function () { return busy; } };

  // 到着側：幕で覆った状態から始めて、ページが描ける状態になったら右へ抜ける
  if (arriving) {
    busy = true;
    setX(0);
    var started = false;
    var go = function () {
      if (started) return;
      started = true;
      requestAnimationFrame(function () {
        run(0, W(), OUT, function () { curtain.style.visibility = "hidden"; setX(-W()); busy = false; });
      });
    };
    // ページの骨組みが読み込めたら少しだけ待って抜ける（重い動画の読み込み完了までは待たない）
    if (D.readyState !== "loading") setTimeout(go, 250);
    else D.addEventListener("DOMContentLoaded", function () { setTimeout(go, 250); });
    setTimeout(go, 1800);
  }

  // 出発側：メニューを押したら幕が左から入ってきて、覆い終わったらページを切り替える
  D.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a.site-nav__link, a.site-nav__brand") : null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    if (busy) { e.preventDefault(); return; }
    e.preventDefault();
    busy = true;
    curtain.style.visibility = "visible";
    var w = W();
    setX(-w);
    run(-w, 0, IN, function () {
      try { sessionStorage.setItem(KEY, "1"); } catch (err) {}
      location.href = u.href;
      setTimeout(function () { busy = false; curtain.style.visibility = "hidden"; setX(-W()); try { sessionStorage.removeItem(KEY); } catch (err) {} }, 4000);
    });
  }, true);

  // 戻るボタン（ブラウザのキャッシュから復元）で幕が残らないようにする
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { busy = false; curtain.style.visibility = "hidden"; setX(-W()); }
  });
})();
