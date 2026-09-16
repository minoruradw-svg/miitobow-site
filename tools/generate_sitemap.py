# -*- coding: utf-8 -*-
"""miitobow.com の sitemap.xml を再生成する。
記事を追加・更新したら、このスクリプトを再実行してから commit・push する。
（Cloudflare Pagesにはビルドステップが無い静的サイトのため、完全自動生成ではなく
 「1コマンドで再生成→コミット」の運用にしている。新規記事はglobで自動的に拾われるので、
 記事ごとにこのスクリプトを書き換える必要は無い。）

使い方: python tools/generate_sitemap.py
"""
import glob
import os
import subprocess
import xml.sax.saxutils as sx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://miitobow.com"

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
]


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
    urls = []

    for url_path, rel_file, priority in STATIC_PAGES:
        abs_file = os.path.join(ROOT, rel_file)
        if not os.path.exists(abs_file):
            continue
        lastmod = git_lastmod(rel_file)
        urls.append((SITE + url_path, lastmod, priority))

    # articles/ 配下の全 .html（アセットフォルダは対象外）を自動収集
    articles_dir = os.path.join(ROOT, "articles")
    for abs_file in sorted(glob.glob(os.path.join(articles_dir, "*.html"))):
        rel_file = os.path.relpath(abs_file, ROOT).replace("\\", "/")
        slug = os.path.splitext(os.path.basename(abs_file))[0]
        priority = "0.8" if slug.startswith("research-") and slug != "research-room" else "0.5"
        if slug == "research-room":
            priority = "0.9"
        lastmod = git_lastmod(rel_file)
        urls.append((f"{SITE}/articles/{slug}", lastmod, priority))

    return urls


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


def main():
    urls = collect_urls()
    xml = build_xml(urls)
    out_path = os.path.join(ROOT, "sitemap.xml")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(xml)
    print(f"saved {out_path} ({len(urls)} URLs)")


if __name__ == "__main__":
    main()
