# -*- coding: utf-8 -*-
"""記事HTML内の Amazon アフィリエイトリンク（<a ... amazon.co.jp ... tag=...>）の rel に sponsored を足す。

方針（2026-11-03 承認）:
  - 対象は affiliate tag（tag=）付きの amazon.co.jp リンクだけ。tag の無い Amazon リンク（商品レビューページへの参照）は広告ではないので触らない。
  - 変えるのは rel 属性の値だけ。既存のトークン（noopener / noreferrer / nofollow など）は削除せず、末尾に ` sponsored` を足す。
  - href・tag・ASIN・class・target・属性の順序・改行コード（CRLF/LF）・その他のバイトは変えない。
  - 既に sponsored があれば何もしない（何度実行しても同じ結果＝冪等）。
  - 既定の対象は「git で追跡されている」 articles/*.html。未コミットの記事は触らない（--files で明示した時だけ）。
  - rel 属性が無い Amazon リンクは自動では直さず、報告して終了コード2（手で確認する）。

使い方（サイトのリポジトリのルートで）:
  python tools/patch_rel_sponsored.py --dry-run     # 何をどれだけ変えるかを表示（ファイルは変更しない）
  python tools/patch_rel_sponsored.py               # 適用
  python tools/patch_rel_sponsored.py --verify      # 適用後の検証（git HEAD との差分が rel の sponsored だけか）
  python tools/patch_rel_sponsored.py --files articles/research-xxx.html   # 指定ファイルだけ
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A_RE = re.compile(rb"<a\b[^>]*>", re.I)
REL_RE = re.compile(rb"""\brel=(["'])(.*?)\1""", re.I)
HREF_RE = re.compile(rb"""\bhref=(["'])(.*?)\1""", re.I)


def is_amazon(tag):
    """アフィリエイトリンク＝amazon.co.jp 宛てで affiliate tag（tag=）が付いているもの。
    tag の無い Amazon リンク（商品レビューページへの参照リンクなど）は広告ではないので対象外。"""
    return b"amazon.co.jp" in tag and b"tag=" in tag


def fix_tag(tag):
    """1つの <a ...> タグの rel に sponsored を足す。返り値 (新タグ, 状態)。状態は changed / already / norel。"""
    if not is_amazon(tag):
        return tag, "skip"
    m = REL_RE.search(tag)
    if not m:
        return tag, "norel"
    if b"sponsored" in m.group(2).split():
        return tag, "already"
    return tag[: m.end(2)] + b" sponsored" + tag[m.end(2):], "changed"


def patch_bytes(data):
    stats = {"changed": 0, "already": 0, "norel": 0, "skip": 0}

    def repl(m):
        new, st = fix_tag(m.group(0))
        stats[st] += 1
        return new

    return A_RE.sub(repl, data), stats


def tracked_articles():
    out = subprocess.run(["git", "ls-files", "-z", "articles"], cwd=ROOT, capture_output=True, check=True).stdout
    return sorted(p for p in out.decode("utf-8").split("\0") if p.endswith(".html") and p.count("/") == 1)


def strip_sponsored(data):
    """検証用の正規化：Amazonリンクの rel 値から sponsored トークンだけを取り除く。"""
    def repl(m):
        tag = m.group(0)
        if not is_amazon(tag):
            return tag
        r = REL_RE.search(tag)
        if not r:
            return tag
        toks = [t for t in r.group(2).split() if t != b"sponsored"]
        return tag[: r.start(2)] + b" ".join(toks) + tag[r.end(2):]
    return A_RE.sub(repl, data)


def git_head_bytes(rel):
    r = subprocess.run(["git", "show", "HEAD:" + rel], cwd=ROOT, capture_output=True)
    return r.stdout if r.returncode == 0 else None


def verify(files):
    """適用後の検証。git HEAD の内容と比べ、差分が「Amazonリンクの rel に sponsored を足しただけ」であることを確かめる。"""
    ok = True
    tot_links = tot_spons = 0
    for rel in files:
        with open(os.path.join(ROOT, rel), "rb") as f:
            new = f.read()
        old = git_head_bytes(rel)
        if old is None:
            print(f"NG  {rel}: git HEAD に無い（未コミットのファイル）")
            ok = False
            continue
        new_n, old_n = new.replace(b"\r\n", b"\n"), old.replace(b"\r\n", b"\n")
        # 1. sponsored を無視すれば、ファイル全体がバイト単位で同一
        if strip_sponsored(new_n) != strip_sponsored(old_n):
            print(f"NG  {rel}: rel の sponsored 以外の差分がある")
            ok = False
        # 2. リンクの href（順序つき）・Amazonリンク本数が同一
        hn = [m.group(2) for t in A_RE.findall(new_n) for m in [HREF_RE.search(t)] if m]
        ho = [m.group(2) for t in A_RE.findall(old_n) for m in [HREF_RE.search(t)] if m]
        if hn != ho:
            print(f"NG  {rel}: href の並び・本数が変わった")
            ok = False
        # 3. Amazon以外のリンクの rel は不変／Amazonリンクは全て sponsored 付き、かつ既存 rel トークンは減っていない
        for tn, to in zip(A_RE.findall(new_n), A_RE.findall(old_n)):
            rn, ro = REL_RE.search(tn), REL_RE.search(to)
            if not is_amazon(tn):
                if (rn.group(2) if rn else None) != (ro.group(2) if ro else None):
                    print(f"NG  {rel}: Amazon以外のリンクの rel が変わった: {tn[:80]!r}")
                    ok = False
                continue
            tot_links += 1
            if not rn or b"sponsored" not in rn.group(2).split():
                print(f"NG  {rel}: sponsored が無いAmazonリンク: {tn[:100]!r}")
                ok = False
            else:
                tot_spons += 1
            if ro and not set(ro.group(2).split()) <= set(rn.group(2).split() if rn else []):
                print(f"NG  {rel}: 既存の rel トークンが失われた: {to[:100]!r}")
                ok = False
    print(f"verify: ファイル {len(files)} 件 / Amazonリンク {tot_links} 本 / sponsored付き {tot_spons} 本 → {'OK' if ok and tot_links == tot_spons else 'NG'}")
    return ok and tot_links == tot_spons


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--files", nargs="*")
    args = ap.parse_args()
    files = args.files if args.files else tracked_articles()
    if args.verify:
        sys.exit(0 if verify(files) else 1)
    total = {"changed": 0, "already": 0, "norel": 0, "skip": 0}
    changed_files = 0
    for rel in files:
        path = os.path.join(ROOT, rel)
        with open(path, "rb") as f:
            data = f.read()
        new, st = patch_bytes(data)
        for k in total:
            total[k] += st[k]
        if st["norel"]:
            print(f"要確認: {rel} に rel の無いAmazonリンクが {st['norel']} 本ある（自動では直さない）")
        if new != data:
            changed_files += 1
            if not args.dry_run:
                with open(path, "wb") as f:
                    f.write(new)
    mode = "dry-run（変更なし）" if args.dry_run else "適用"
    print(f"{mode}: 変更ファイル {changed_files} / 変更リンク {total['changed']} 本 / 既にsponsored {total['already']} 本 / rel無し {total['norel']} 本")
    sys.exit(2 if total["norel"] else 0)


if __name__ == "__main__":
    main()
