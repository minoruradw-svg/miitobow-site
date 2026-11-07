# -*- coding: utf-8 -*-
"""miitobow.com の sitemap.xml を再生成する／現在の sitemap.xml が正しいか検査する。
記事を追加・更新したら、このスクリプトを再実行してから commit・push する。
（Cloudflare Pagesにはビルドステップが無い静的サイトのため、完全自動生成ではなく
 「1コマンドで再生成→コミット」の運用にしている。新規記事はglobで自動的に拾われるので、
 記事ごとにこのスクリプトを書き換える必要は無い。）

登録する条件（2026-11-03 改修）:
  1. git で追跡されている（＝コミット済みの）ファイルだけ。未コミット・未公開の記事は入らない。
  2. <meta name="robots"> に noindex を含むページは入らない。
  3. EXCLUDED に理由つきで書いたページは入らない。

lastmod の決め方（2026-11-03・実質的な内容の更新だけを反映する）:
  - 調査記事（articles/research-*.html）: 「本文テキスト＋title＋description」が最後に変わったコミットの日付。
    rel属性・href・class・CSS・JS・画像パスだけの変更（形式的な変更）と、サイト共通の「こんな記事も書いてます」ブロックの
    変更では動かない。既にサイトマップにある日付より古い／同じなら、既存の日付を維持する（再生成しても変わらない）。
  - それ以外のページ（トップ・バスマップ・LINEスタンプ記事など）: 共通のナビ・フッター等の変更と内容の更新を機械的に
    区別できないので、既にサイトマップにある日付をそのまま維持する。新規に追加するページは lastmod を省略する。
    内容を実際に更新した時は `--touch URLパス ...` でそのURLの lastmod を今日にする（意図して更新を宣言する）。

使い方:
  python tools/generate_sitemap.py                   # sitemap.xml を再生成する
  python tools/generate_sitemap.py --touch bus/      # 指定URLの lastmod を今日にして再生成（内容を更新した時）。
                                                     # Git Bash では先頭の / がパスに変換されるので `bus/` のように / を付けずに書く（完全なURLでも可）
  python tools/generate_sitemap.py --check           # ファイルは書かず、現在の sitemap.xml と「あるべき内容」を比べる。
                                                     # URLの過不足・lastmodの古さがあれば差分を表示して終了コード1（デプロイ前チェック用）
"""
import datetime
import glob
import hashlib
import html
import os
import re
import subprocess
import sys
import xml.sax.saxutils as sx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://miitobow.com"
SITEMAP = os.path.join(ROOT, "sitemap.xml")

# (URLパス, 対応するファイル, 優先度) — 優先度はGoogleが公式にはほぼ無視するが、
# サイト内での相対的な重要度メモとして残す。
STATIC_PAGES = [
    ("/", "index.html", "1.0"),
    ("/why", "why.html", "0.6"),
    ("/reading", "reading.html", "0.6"),
    ("/made", "made.html", "0.6"),
    ("/room/", "room/index.html", "0.5"),
    ("/support", "support.html", "0.3"),
    ("/android", "android.html", "0.5"),
    ("/android-en", "android-en.html", "0.4"),
    ("/android-ko", "android-ko.html", "0.4"),
    ("/privacy/", "privacy/index.html", "0.2"),
    ("/privacy/privacy-policy", "privacy/privacy-policy.html", "0.2"),
    ("/privacy/pinterest", "privacy/pinterest.html", "0.2"),
    ("/privacy/ja-en/", "privacy/ja-en/index.html", "0.2"),
    ("/game/", "game/index.html", "0.4"),
    ("/bus/", "bus/index.html", "0.5"),
    ("/start/", "start/index.html", "0.7"),
    ("/services/", "services/index.html", "0.7"),
]

# サイトマップに載せないページ（公開はされている）。載せない理由を必ず書く。
# ここに無く、かつ STATIC_PAGES・bus・articles にも無いページは、そもそも収集の対象外。
EXCLUDED = {
    "miitobow-research/index.html": "3Dアプリの外枠だけで本文テキストがほぼ無い。クロール可能なハブは /articles/research-room",
    "support-papakue.html": "パパクエ（未公開アプリ）のサポート窓口。検索対象ではない。アプリ公開後に再検討",
    "privacy/papakue/index.html": "パパクエ（未公開アプリ）のプライバシーポリシー。アプリ公開後に再検討",
    "game/artbook.html": "素材の図鑑（本文247字）。薄いページで検索対象にしない",
    "background.html": "背景を選ぶ機能ページ（検索対象ではない）",
    "send.html": "PCとスマホ間のファイル転送ツール（検索対象ではない）",
    "ui-guide.html": "自分用のUI辞典（検索対象ではない）",
    "miitobow-research/embed-example.html": "埋め込み例（薄いページ）",
}

NOINDEX_RE = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', re.I)


def tracked_files():
    """git で追跡されているファイルの集合（リポジトリ相対・スラッシュ区切り）。"""
    out = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True).stdout
    return {p for p in out.decode("utf-8").split("\0") if p}


def is_noindex(rel_file):
    try:
        with open(os.path.join(ROOT, rel_file), encoding="utf-8", errors="replace") as f:
            return bool(NOINDEX_RE.search(f.read()))
    except OSError:
        return False


# サイト共通の「こんな記事も書いてます」ブロック（旧：リンク1本のリスト／新：関連記事カード5枚＋調査部屋リンク）。本文ではないので指紋から外す。
_RELATED_RE = re.compile(
    r"<h2>こんな記事も書いてます</h2>\s*(?:<ul class=\"related-list\">.*?</ul>|<div class=\"related-grid\">.*?class=\"related-hub-link\".*?</a>)", re.S)


def content_signature(data, article=True):
    """本文テキスト＋title＋description の指紋。形式的な変更（属性・CSS・JS・共通の関連記事ブロック）は含めない。"""
    t = data.decode("utf-8", "replace")
    title = (re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I) or [None, ""])[1]
    desc = (re.search(r"""<meta[^>]+name=["']description["'][^>]*content=["'](.*?)["']""", t, re.S | re.I) or [None, ""])[1]
    if article:
        t = _RELATED_RE.sub(" ", t)
    t = re.sub(r"<!--.*?-->|<script.*?</script>|<style.*?</style>", " ", t, flags=re.S | re.I)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    t = re.sub(r"\s+", "", t)
    return hashlib.sha1((title + "|" + desc + "|" + t).encode("utf-8")).hexdigest()


def content_lastmod(path):
    """そのファイルの『本文の指紋』が最後に変わったコミットの日付（無ければ None）。"""
    log = subprocess.run(["git", "log", "--format=%H %cs", "--", path], cwd=ROOT, capture_output=True, text=True).stdout
    prev, last = None, None
    for line in reversed([l.split() for l in log.splitlines() if l.strip()]):
        sha, day = line
        blob = subprocess.run(["git", "show", f"{sha}:{path}"], cwd=ROOT, capture_output=True).stdout
        sig = content_signature(blob)
        if sig != prev:
            last = day
        prev = sig
    return last


def current_lastmods():
    """現在の sitemap.xml の {URL: lastmod}（lastmod が無いURLは載せない）。"""
    try:
        with open(SITEMAP, encoding="utf-8") as f:
            items = re.findall(r"<url>(.*?)</url>", f.read(), re.S)
    except OSError:
        return {}
    out = {}
    for it in items:
        loc = re.search(r"<loc>(.*?)</loc>", it)
        lm = re.search(r"<lastmod>(.*?)</lastmod>", it)
        if loc and lm:
            out[loc.group(1)] = lm.group(1)
    return out


def decide_lastmod(loc, rel_file, prev, touch):
    if loc in touch:
        return datetime.date.today().isoformat()
    if os.path.basename(rel_file).startswith("research-") and rel_file.startswith("articles/"):
        day = content_lastmod(rel_file)
        if loc in prev and (not day or day <= prev[loc]):
            return prev[loc]
        return day
    return prev.get(loc)   # 既存は維持。新規の非記事ページは省略（None）


def collect_urls(touch=()):
    """(loc, lastmod, priority) のリストと、除外したもの [(相対パス, 理由)] を返す。"""
    tracked = tracked_files()
    prev = current_lastmods()
    urls = []
    skipped = []

    def add(url_path, rel_file, priority):
        rel_file = rel_file.replace("\\", "/")
        if rel_file in EXCLUDED:
            skipped.append((rel_file, "EXCLUDED: " + EXCLUDED[rel_file]))
        elif rel_file not in tracked:
            skipped.append((rel_file, "未コミット（gitで追跡されていない）"))
        elif is_noindex(rel_file):
            skipped.append((rel_file, "noindex"))
        else:
            urls.append((SITE + url_path, decide_lastmod(SITE + url_path, rel_file, prev, set(touch)), priority))

    for url_path, rel_file, priority in STATIC_PAGES:
        if os.path.exists(os.path.join(ROOT, rel_file)):
            add(url_path, rel_file, priority)

    # バスマップ: bus/<県>/index.html（県ページ）と bus/<県>/<地域>/index.html（地域マップ）、
    # 英語版 bus/en/<県>/<地域>/index.html（深さ3）を自動収集
    for depth, priority in ((1, "0.5"), (2, "0.7"), (3, "0.5")):
        pattern = os.path.join(ROOT, "bus", *(["*"] * depth), "index.html")
        for abs_file in sorted(glob.glob(pattern)):
            rel_file = os.path.relpath(abs_file, ROOT).replace("\\", "/")
            add("/" + os.path.dirname(rel_file) + "/", rel_file, priority)

    # articles/ 配下の全 .html（アセットフォルダは対象外）を自動収集
    for abs_file in sorted(glob.glob(os.path.join(ROOT, "articles", "*.html"))):
        rel_file = os.path.relpath(abs_file, ROOT).replace("\\", "/")
        slug = os.path.splitext(os.path.basename(abs_file))[0]
        priority = "0.8" if slug.startswith("research-") and slug != "research-room" else "0.5"
        if slug == "research-room":
            priority = "0.9"
        add(f"/articles/{slug}", rel_file, priority)

    # 同じURLを2回出さない（深さのパターンが重なった場合の保険）。
    # 既にサイトマップにあるURLの priority は、手で調整された値を尊重して変えない。
    keep = current_priorities()
    seen, uniq = set(), []
    for loc, lastmod, priority in urls:
        if loc in seen:
            continue
        seen.add(loc)
        uniq.append((loc, lastmod, keep.get(loc, priority)))
    # 並び順は現在の sitemap.xml の順を保つ（新しいURLは末尾）。再生成しても差分が最小になる。
    pos = {loc: i for i, loc in enumerate(current_locs())}
    uniq.sort(key=lambda u: pos.get(u[0], len(pos)))   # sort は安定なので、新URL同士は生成順のまま
    return uniq, skipped


def build_xml(urls):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, priority in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{sx.escape(loc)}</loc>")
        if lastmod:
            lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def current_priorities():
    """現在の sitemap.xml の {URL: priority}。"""
    try:
        with open(SITEMAP, encoding="utf-8") as f:
            return dict(re.findall(r"<loc>(.*?)</loc>\s*(?:<lastmod>.*?</lastmod>\s*)?<priority>(.*?)</priority>", f.read()))
    except OSError:
        return {}


def current_locs():
    try:
        with open(SITEMAP, encoding="utf-8") as f:
            return re.findall(r"<loc>(.*?)</loc>", f.read())
    except OSError:
        return []


NL = chr(10)


def _lines(head, items):
    return head + NL + NL.join("  " + x for x in items)


def check():
    """現在の sitemap.xml が「あるべき内容」と同じか。URLの過不足・lastmodの古さがあれば差分を出して1を返す。"""
    urls, skipped = collect_urls()
    want = [u[0] for u in urls]
    have = current_locs()
    problems = []
    dup = sorted({u for u in have if have.count(u) > 1})
    if dup:
        problems.append(f"sitemap.xml にURLの重複がある: {dup}")
    missing = sorted(set(want) - set(have))
    extra = sorted(set(have) - set(want))
    if missing:
        problems.append(_lines(f"sitemap.xml に載っていない公開ページが {len(missing)} 件ある（再生成が必要）:", missing))
    if extra:
        problems.append(_lines(f"sitemap.xml に載っているが、あるべき内容に無いURLが {len(extra)} 件ある（未コミット・noindex・除外リスト・ファイル無しのいずれか）:", extra))
    prev = current_lastmods()
    stale = sorted(f"{loc}  現在={prev.get(loc)} → あるべき={lm}" for loc, lm, _ in urls if loc in have and lm != prev.get(loc))
    if stale:
        problems.append(_lines(f"本文が更新されたのに lastmod が古い（または不要）ページが {len(stale)} 件ある:", stale))
    if problems:
        print("NG: sitemap.xml が最新ではありません。`python tools/generate_sitemap.py` で再生成してください。")
        print(NL.join(problems))
        return 1
    print(f"OK: sitemap.xml はあるべき内容と一致（{len(have)} URL、lastmodも一致、除外 {len(skipped)} 件）")
    return 0


def main():
    args = sys.argv[1:]
    if "--check" in args:
        sys.exit(check())
    touch = []
    if "--touch" in args:
        for a in args[args.index("--touch") + 1:]:
            if a.startswith("--"):
                break
            touch.append(a if a.startswith("http") else SITE + (a if a.startswith("/") else "/" + a))
    urls, skipped = collect_urls(touch)
    unknown = [u for u in touch if u not in {x[0] for x in urls}]
    if unknown:
        print("警告: --touch に指定されたURLがサイトマップの対象に無い:", unknown)
    xml = build_xml(urls)
    with open(SITEMAP, "w", encoding="utf-8", newline="") as f:
        f.write(xml)
    print(f"saved {SITEMAP} ({len(urls)} URLs)")
    for rel, why in skipped:
        print(f"  skip: {rel} — {why}")


if __name__ == "__main__":
    main()
