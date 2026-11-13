# -*- coding: utf-8 -*-
"""3D「ミートボーの調査部屋」への導線を、まとめて「隠す／戻す」道具（2026-11-13・ユーザー指示）。

背景：調査は https://miitobow.com/research/ に集約する。調査部屋(/articles/research-room)は消さず、導線だけを一旦非表示にする。
      強化・作り直しして再公開する日が来たら `show` で元に戻せる。

仕組み：各導線を 2つの版（A＝調査部屋の元の導線／B＝/research/ への代わりの導線）で並べて持ち、使わない方を
        <template data-rr>…</template> で包む（templateの中身は表示もスクリプト実行もされない・コードは残る）。
          <!--rr:ID:A-->…元の導線…<!--/rr:ID:A-->
          <!--rr:ID:B-->…代わりの導線…<!--/rr:ID:B-->      ← Bが無い導線もある（隠すだけ）
使い方：
  python tools/toggle_research_room.py status            現在の状態（隠している／出している）と対象数
  python tools/toggle_research_room.py hide [--dry-run]  調査部屋を隠し、/research/ の導線を出す
  python tools/toggle_research_room.py show [--dry-run]  調査部屋を元どおり出し、代わりの導線を隠す
  python tools/toggle_research_room.py sync [--dry-run]  新しい記事（マーカー未付与）にもマーカーを付けて、今の状態に合わせる
                                                         ＝記事をデプロイしたら毎回これを実行する
状態は tools/research_room_state.json（hidden: true/false）。冪等（何度実行しても同じ結果）。
「戻して」と言われたら： python tools/toggle_research_room.py show  → 差分を確認 → commit → push。
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, "tools", "research_room_state.json")
TPL_OPEN, TPL_CLOSE = "<template data-rr>", "</template>"
NAV_A = '<a href="/articles/research-room" class="site-nav__link">調査部屋</a>'
NAV_B = '<a href="/research/" class="site-nav__link">調査</a>'

# (id, 対象ファイル(glob), Aの正規表現, B（Noneなら隠すだけ）)
RULES = [
    ("nav", ["index.html", "reading.html", "made.html", "background.html", "why.html"], re.escape(NAV_A), NAV_B),
    ("picks-sec", ["index.html"], r'<section class="today-picks" id="todayPicks"[^>]*>.*?</section>', None),
    ("picks-js", ["index.html"], r"<script[^>]*>(?:(?!</script>).)*?getElementById\('todayPicks'\)(?:(?!</script>).)*?</script>", None),
    ("book3", ["reading.html"], r'<a class="bookshelf__hotspot bookshelf__hotspot--3".*?</a>',
     '<a class="bookshelf__hotspot bookshelf__hotspot--3" style="left:68%;width:23%;" href="/research/" aria-label="ミートボーの調査を読む"><span class="bookshelf__pullbook" style="background:#3ec2d1;"></span></a>'),
    ("book3-panel", ["reading.html"], r'<div class="bookshelf__panel-item bookshelf__panel-item--3">.*?</div>',
     '<div class="bookshelf__panel-item bookshelf__panel-item--3"><span class="bookshelf__panel-tag" style="color:#12889a;">ミートボーの調査</span>'
     '<p>デスク周り・キャンプ・暮らしの商品を比べた記事を、商品名で探せます。</p><span class="bookshelf__panel-cta">← この本をクリック</span></div>'),
    ("room-card", ["reading.html"], r'<h3 class="glass-chip"[^>]*>ミートボーの調査部屋</h3>\s*<div class="ai-news-card">.*?</script>', None),
    ("hub-footer", ["research/index.html"], re.escape('<a href="/articles/research-room">3D調査部屋</a>'), None),
    ("art-home", ["articles/research-*.html"], r'<a class="home-link" href="/articles/research-room">&larr; ミートボーの調査部屋に戻る</a>',
     '<a class="home-link" href="/research/">&larr; ミートボーの調査に戻る</a>'),
    ("art-hub", ["articles/research-*.html"], r'<a class="related-hub-link" href="/articles/research-room">ミートボーの調査部屋で他の記事も見る（全<span id="related-hub-count">(?:…|&hellip;)</span>本）</a>',
     '<a class="related-hub-link" href="/research/">ミートボーの調査で他の記事も見る（全<span id="related-hub-count">…</span>本）</a>'),
]
SKIP = {"articles/research-room.html"}  # 調査部屋そのもののページには触らない


def files_for(globs):
    out = []
    for g in globs:
        for p in sorted(glob.glob(os.path.join(ROOT, g))):
            rel = os.path.relpath(p, ROOT).replace("\\", "/")
            if rel not in SKIP:
                out.append(rel)
    return out


def load_state():
    try:
        return bool(json.load(open(STATE, encoding="utf-8")).get("hidden"))
    except Exception:
        return False


def pair_re(rid, ab):
    return re.compile(r"<!--rr:%s:%s-->(.*?)<!--/rr:%s:%s-->" % (re.escape(rid), ab, re.escape(rid), ab), re.S)


def wrap(inner):
    return inner if inner.startswith(TPL_OPEN) else TPL_OPEN + inner + TPL_CLOSE


def unwrap(inner):
    if inner.startswith(TPL_OPEN) and inner.endswith(TPL_CLOSE):
        return inner[len(TPL_OPEN):-len(TPL_CLOSE)]
    return inner


def init_markers(text, rid, a_re, b_html):
    """マーカー未付与の導線に、A（元）とB（代わり）のマーカーを付ける（Bは最初はtemplateで包んだ状態＝今の見た目を変えない）。"""
    if pair_re(rid, "A").search(text):
        return text, False
    rx = re.compile(a_re, re.S)
    m = rx.search(text)
    if not m:
        return text, False
    a = m.group(0)
    new = "<!--rr:%s:A-->%s<!--/rr:%s:A-->" % (rid, a, rid)
    if b_html:
        new += "<!--rr:%s:B-->%s<!--/rr:%s:B-->" % (rid, wrap(b_html), rid)
    return text[:m.start()] + new + text[m.end():], True


def apply_state(text, rid, hidden):
    changed = False
    for ab in ("A", "B"):
        rx = pair_re(rid, ab)
        m = rx.search(text)
        if not m:
            continue
        inner = m.group(1)
        want_live = (not hidden) if ab == "A" else hidden
        new_inner = unwrap(inner) if want_live else wrap(inner)
        if new_inner != inner:
            text = text[:m.start(1)] + new_inner + text[m.end(1):]
            changed = True
    return text, changed


def process(hidden, write, do_init):
    report = {"files": 0, "changed": 0, "markers_added": 0}
    details = []
    for rid, globs, a_re, b_html in RULES:
        for rel in files_for(globs):
            p = os.path.join(ROOT, rel)
            raw = open(p, "rb").read().decode("utf-8")
            text, added = (init_markers(raw, rid, a_re, b_html) if do_init else (raw, False))
            text, ch = apply_state(text, rid, hidden)
            if added:
                report["markers_added"] += 1
            if text != raw:
                report["changed"] += 1
                details.append((rel, rid, "マーカー追加" if added else "切替"))
                if write:
                    open(p, "wb").write(text.encode("utf-8"))
    report["files"] = len({d[0] for d in details})
    return report, details


def status():
    n_a = n_b = live_a = live_b = 0
    for rid, globs, a_re, b_html in RULES:
        for rel in files_for(globs):
            raw = open(os.path.join(ROOT, rel), "rb").read().decode("utf-8")
            for ab in ("A", "B"):
                m = pair_re(rid, ab).search(raw)
                if m:
                    live = not m.group(1).startswith(TPL_OPEN)
                    if ab == "A":
                        n_a += 1
                        live_a += live
                    else:
                        n_b += 1
                        live_b += live
    print(f"記録されている状態：{'隠している' if load_state() else '出している'}（tools/research_room_state.json）")
    print(f"A（調査部屋の元の導線）：マーカーあり {n_a}か所／表示中 {live_a}か所")
    print(f"B（/research/ への代わりの導線）：マーカーあり {n_b}か所／表示中 {live_b}か所")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    cmd = args[0] if args else "status"
    if cmd == "status":
        status()
        return
    if cmd not in ("hide", "show", "sync"):
        print(__doc__)
        sys.exit(2)
    hidden = {"hide": True, "show": False, "sync": load_state()}[cmd]
    rep, details = process(hidden, write=not dry, do_init=True)
    print(("ドライラン：" if dry else "") + f"{cmd}（隠す={hidden}）→ 変更するファイル {rep['files']}／変更箇所 {rep['changed']}（うちマーカー新規追加 {rep['markers_added']}）")
    for rel, rid, kind in details[:12]:
        print("  ", rel, rid, kind)
    if len(details) > 12:
        print(f"   …ほか {len(details) - 12}件")
    if not dry and cmd in ("hide", "show"):
        json.dump({"hidden": hidden}, open(STATE, "w", encoding="utf-8"))


if __name__ == "__main__":
    main()
