# -*- coding: utf-8 -*-
"""articles/research-*.html 各記事の「初回コミット日」＝実質の公開日を一覧表示する。
git履歴が正なので、手動でメタデータを持たせて食い違うリスクが無い。

使い方：
  cd P:\\work\\repos\\miitobow-site
  python tools\\list_article_deploy_dates.py           # 全件、公開日順
  python tools\\list_article_deploy_dates.py kettle      # スラッグでフィルタ
"""
import subprocess
import sys
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    filt = sys.argv[1] if len(sys.argv) > 1 else None
    files = sorted(glob.glob(os.path.join(ROOT, "articles", "research-*.html")))
    rows = []
    for f in files:
        rel = os.path.relpath(f, ROOT).replace("\\", "/")
        if filt and filt not in rel:
            continue
        out = subprocess.run(
            ["git", "log", "--diff-filter=A", "--format=%ad", "--date=short", "--", rel],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
        )
        date = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else "?"
        rows.append((date, rel))
    rows.sort()
    for date, rel in rows:
        print(f"{date}\t{rel}")


if __name__ == "__main__":
    main()
