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

使い方:
  python tools/generate_sitemap.py          # sitemap.xml を再生成する
  python tools/generate_sitemap.py --check  # ファイルは書かず、現在の sitemap.xml と「あるべき内容」を比べる。
                                            # 差があれば差分を表示して終了コード1（デプロイ前チェック用）
"""
import glob
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


def git_lastmod(path):
    """git の最終コミット日付をlastmodに使う（無ければファイルのmtime）。"""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", path],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        if out:
            return out
    except Exception:
        pass
    return None


def collect_urls():
    """(loc, lastmod, priority) のリストと、除外したもの [(相対パス, 理由)] を返す。"""
    tracked = tracked_files()
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
            urls.append((SITE + url_path, git_lastmod(rel_file), priority))

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


def check():
    """現在の sitemap.xml が「あるべき内容」と同じURL集合か。違えば差分を出して1を返す。"""
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
        problems.append(f"sitemap.xml に載っていない公開ページが {len(missing)} 件ある（再生成が必要）:\n  " + "\n  ".join(missing))
    if extra:
        problems.append(f"sitemap.xml に載っているが、あるべき内容に無いURLが {len(extra)} 件ある（未コミット・noindex・除外リスト・ファイル無しのいずれか）:\n  " + "\n  ".join(extra))
    if problems:
        print("NG: sitemap.xml が最新ではありません。`python tools/generate_sitemap.py` で再生成してください。")
        print("\n".join(problems))
        return 1
    print(f"OK: sitemap.xml はあるべき内容と一致（{len(have)} URL、除外 {len(skipped)} 件）")
    return 0


def main():
    if "--check" in sys.argv[1:]:
        sys.exit(check())
    urls, skipped = collect_urls()
    xml = build_xml(urls)
    with open(SITEMAP, "w", encoding="utf-8", newline="") as f:
        f.write(xml)
    print(f"saved {SITEMAP} ({len(urls)} URLs)")
    for rel, why in skipped:
        print(f"  skip: {rel} — {why}")


if __name__ == "__main__":
    main()
