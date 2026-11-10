# -*- coding: utf-8 -*-
"""IndexNow：更新したURLを、Bingなど対応する検索エンジンに、すぐ知らせる（2026-11-11新設）。
  鍵＝サイト直下の <32桁の16進>.txt（中身は鍵そのもの。公開されるもので秘密ではない）。公開済み(https://miitobow.com/<鍵>.txt が200)になってから実行すること。
使い方（P:\work\repos\miitobow-site で）:
  python -X utf8 tools/indexnow_ping.py --all                    # sitemap.xml の全URL（初回・大改修のとき）
  python -X utf8 tools/indexnow_ping.py --last                   # 直前のコミットで変わったページ(.html)のURL（通常の公開後はこれ）
  python -X utf8 tools/indexnow_ping.py --since <コミット>        # そのコミットより後に変わったページ
  python -X utf8 tools/indexnow_ping.py <URL> [<URL>...]          # URLを直接指定
  --dry を付けると、送らずに対象URLだけ表示する。
注意：同じURLを短時間に何度も送らない（スパム扱いを避ける）。1回の送信は最大10,000URL。"""
import glob, json, os, re, subprocess, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://miitobow.com"
ENDPOINT = "https://api.indexnow.org/indexnow"


def find_key():
    for p in glob.glob(os.path.join(ROOT, "*.txt")):
        n = os.path.basename(p)[:-4]
        if re.fullmatch(r"[0-9a-f]{32}", n) and open(p, encoding="utf-8").read().strip() == n:
            return n
    sys.exit("NG: サイト直下に鍵ファイル(<32桁16進>.txt)が見つからない")


def url_of(path):
    path = path.replace("\\", "/")
    if path.endswith("index.html"): path = path[: -len("index.html")]
    elif path.endswith(".html"): path = path[: -len(".html")]   # 拡張子なしで公開している(.htmlは308で転送される)
    return BASE + "/" + path.lstrip("/")


def from_git(rev_range):
    out = subprocess.run(["git", "diff", "--name-only", "--diff-filter=AM", rev_range], cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout
    return sorted({url_of(p) for p in out.splitlines() if p.endswith(".html") and not p.startswith(("preview/", "tools/"))})


def from_sitemap():
    s = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    return re.findall(r"<loc>(.*?)</loc>", s)


def main():
    a = sys.argv[1:]; dry = "--dry" in a; a = [x for x in a if x != "--dry"]
    if not a: sys.exit(__doc__)
    if a[0] == "--all": urls = from_sitemap()
    elif a[0] == "--last": urls = from_git("HEAD~1 HEAD")
    elif a[0] == "--since": urls = from_git(f"{a[1]} HEAD")
    else: urls = a
    urls = list(dict.fromkeys(urls))
    print(f"対象 {len(urls)} URL")
    for u in urls[:5]: print("  ", u)
    if dry or not urls: return
    key = find_key()
    body = json.dumps({"host": "miitobow.com", "key": key, "keyLocation": f"{BASE}/{key}.txt", "urlList": urls[:10000]}).encode("utf-8")
    req = urllib.request.Request(ENDPOINT, data=body, headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "miitobow-indexnow/1.0"})
    try:
        r = urllib.request.urlopen(req, timeout=60); print("送信OK", r.status)
    except urllib.error.HTTPError as e:
        print("NG", e.code, e.read().decode("utf-8", "replace")[:200]); sys.exit(1)


main()
