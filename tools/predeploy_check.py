# -*- coding: utf-8 -*-
"""デプロイ（git push）の直前に走らせる、公開前の機械チェック。1つでも NG なら終了コード1。

  1. sitemap.xml が「あるべき内容」と一致（tools/generate_sitemap.py --check）
  2. アフィリエイトのAmazonリンク（<a ... amazon.co.jp ... tag=miitobow-22>）が全て rel に sponsored を持つ（tag の無いAmazonリンクは警告のみ）
     - git で追跡されている記事（＝これから公開される記事）は NG で停止
     - 未コミットの記事は「警告」（公開前に tools/patch_rel_sponsored.py --files <記事> で直す）

使い方（サイトのリポジトリのルートで）:
  git add <公開する記事>      # 追跡対象にしてから
  python tools/predeploy_check.py
  （OK を確認してから git commit → git push）
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A_RE = re.compile(r"<a\b[^>]*>", re.I)
REL_RE = re.compile(r"""\brel=(["'])(.*?)\1""", re.I)
TAG = "tag=miitobow-22"


def tracked():
    out = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True).stdout
    return {p for p in out.decode("utf-8").split("\0") if p}


def check_amazon_links():
    trk = tracked()
    errors, warns, notag = [], [], []
    n_links = 0
    for name in sorted(os.listdir(os.path.join(ROOT, "articles"))):
        if not name.endswith(".html"):
            continue
        rel = "articles/" + name
        with open(os.path.join(ROOT, rel), encoding="utf-8", errors="replace") as f:
            html = f.read()
        bad = []
        for a in A_RE.findall(html):
            if "amazon.co.jp" not in a:
                continue
            if TAG not in a:
                notag.append((rel, a[:110]))   # tag の無い Amazon リンク（レビューページ参照など）は広告ではない＝警告のみ
                continue
            n_links += 1
            m = REL_RE.search(a)
            if not m or "sponsored" not in m.group(2).split():
                bad.append("sponsored無し: " + a[:110])
        if bad:
            (errors if rel in trk else warns).append((rel, bad))
    return n_links, errors, warns, notag


def main():
    rc = 0
    print("== 1. sitemap.xml ==")
    r = subprocess.run([sys.executable, "-X", "utf8", os.path.join(ROOT, "tools", "generate_sitemap.py"), "--check"],
                       cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    print(r.stdout.rstrip())
    if r.returncode:
        rc = 1
    print("== 2. Amazonリンクの rel=sponsored と tag ==")
    n, errors, warns, notag = check_amazon_links()
    for rel, bad in errors:
        print(f"NG  {rel}: {len(bad)} 件")
        for b in bad[:3]:
            print("      ", b)
        rc = 1
    for rel, bad in warns:
        print(f"警告 {rel}（未コミット）: {len(bad)} 件 — 公開前に tools/patch_rel_sponsored.py --files {rel} で直す")
    for rel, a in notag:
        print(f"警告 {rel}: tag の無い Amazon リンク（広告でなければ問題なし。アフィリエイトのつもりなら tag を付ける）: {a}")
    if not errors:
        print(f"OK: 追跡中の記事のアフィリエイトリンク（tag付きAmazonリンク {n} 本）は全て sponsored 付き（未コミット記事の警告 {len(warns)} 件、tag無しAmazonリンク {len(notag)} 本は警告のみ）")
    print("\n結果:", "NG（push しないこと）" if rc else "OK")
    return rc


if __name__ == "__main__":
    sys.exit(main())
