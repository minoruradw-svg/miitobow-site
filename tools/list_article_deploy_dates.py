# -*- coding: utf-8 -*-
"""articles/research-*.html 各記事の「初回コミット日」＝実質の公開日を一覧表示する。
git履歴が正なので、手動でメタデータを持たせて食い違うリスクが無い。

使い方：
  cd P:\\work\\repos\\miitobow-site
  python tools\\list_article_deploy_dates.py              # 全件、公開日順で表示
  python tools\\list_article_deploy_dates.py kettle         # スラッグでフィルタ
  python tools\\list_article_deploy_dates.py --json          # articles/deploy-history.jsonを書き出す
                                                              （調査部屋ページの「投稿履歴」パネル用データ。
                                                              新記事デプロイのたびに再実行して更新する）
"""
import subprocess
import sys
import json
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def collect():
    files = sorted(glob.glob(os.path.join(ROOT, "articles", "research-*.html")))
    rows = []
    for f in files:
        rel = os.path.relpath(f, ROOT).replace("\\", "/")
        out = subprocess.run(
            ["git", "log", "--diff-filter=A", "--format=%ad", "--date=short", "--", rel],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
        )
        date = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else None
        slug = os.path.basename(rel).replace("research-", "").replace(".html", "")
        rows.append({"slug": slug, "path": "/" + rel, "date": date})
    return rows


def main():
    if "--json" in sys.argv:
        rows = [r for r in collect() if r["date"]]
        rows.sort(key=lambda r: r["date"], reverse=True)
        out_path = os.path.join(ROOT, "articles", "deploy-history.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=1)
        print(f"OK: {len(rows)}件 -> {out_path}")
        return

    filt = sys.argv[1] if len(sys.argv) > 1 else None
    rows = collect()
    rows = [r for r in rows if not filt or filt in r["slug"]]
    rows.sort(key=lambda r: r["date"] or "?")
    for r in rows:
        print(f"{r['date']}\t{r['path']}")


if __name__ == "__main__":
    main()
