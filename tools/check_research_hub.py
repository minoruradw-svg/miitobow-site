# -*- coding: utf-8 -*-
"""デプロイ前検査：公開する調査記事が https://miitobow.com/research/（調査ハブ）に載っているか（2026-11-13・ユーザー指示）。
  ・articles/research-*.html（research-room.html除く）が、research/index.html のカードと miitobow-research/articles.json の両方にあるか
  ・調査部屋の導線の「隠す／出す」の状態が、記録（tools/research_room_state.json）と全ファイルで一致しているか
    （新しい記事は調査部屋への導線を元のまま持つので、`python tools/toggle_research_room.py sync` を流して揃える）
使い方: python -X utf8 tools/check_research_hub.py [--only research-<slug>.html ...]   NGなら終了コード1（pushしない）"""
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.stdout.reconfigure(encoding="utf-8")


def tracked(rel):
    return subprocess.run(["git", "ls-files", "--error-unmatch", rel], capture_output=True).returncode == 0


def main():
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1:])
    hub = open("research/index.html", encoding="utf-8").read()
    arts = json.load(open("miitobow-research/articles.json", encoding="utf-8"))
    in_json = {a["url"].replace("https://miitobow.com", "") for a in arts}
    hrefs = set(re.findall(r'href="(/articles/research-[^"#?]+)"', hub))
    ng = []
    files = sorted(glob.glob("articles/research-*.html"))
    for p in files:
        base = os.path.basename(p)
        if base == "research-room.html" or (only and base not in only):
            continue
        # 未公開の在庫記事（gitに載っていない）は対象外。公開するもの（追跡済み or --only 指定）だけ見る
        if not only and not tracked(p.replace("\\", "/")):
            continue
        u = "/articles/" + base[:-5]
        miss = []
        if u not in in_json:
            miss.append("miitobow-research/articles.json")
        if u not in hrefs and u + ".html" not in hrefs:
            miss.append("research/index.html（調査ハブ）")
        if miss:
            ng.append((base, miss))
    # 調査部屋の導線の状態が記録と一致しているか
    sync = subprocess.run([sys.executable, "-X", "utf8", "tools/toggle_research_room.py", "sync", "--dry-run"], capture_output=True, text=True, encoding="utf-8")
    m = re.search(r"変更するファイル (\d+)", sync.stdout)
    unsynced = int(m.group(1)) if m else -1
    if ng:
        print("NG：調査ハブ /research/ に載っていない記事があります。")
        for base, miss in ng:
            print("  -", base, "←", "・".join(miss), "に未登録")
        print("  → 調査LPの build.py を流して research/ を更新（SKILL STEP10）。")
    if unsynced != 0:
        print(f"NG：調査部屋の導線の状態が記録とずれています（{unsynced}ファイル）。 python tools/toggle_research_room.py sync を実行してください。")
    if ng or unsynced != 0:
        sys.exit(1)
    print("OK：公開する調査記事はすべて /research/ に載っています。調査部屋の導線の状態も記録と一致しています。")


if __name__ == "__main__":
    main()
