#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Нормализация product_sizes.label к единой структуре.

Зачем: лейблы заведены вразнобой (латиница/кириллица A4, «мм» то есть то нет,
именные префиксы, размеры в скобках). Плитки калькулятора показывают ИМЯ сверху
и габариты (из width/height) снизу, поэтому label достаточно привести к короткому
каноничному имени; сами размеры в нижней строке рисуются из width/height.

Канон:
  - круг                    → «⌀{w} мм»
  - A/C-форматы (лат.)      → «A4» / «C5» (+ «(по запросу)», + именной префикс)
  - чистые размеры          → «{w}×{h} мм» (единый × и одно « мм», + префикс/суффикс)

Запуск:  python seo/_sizes_normalize.py            # dry-run, только показать
         python seo/_sizes_normalize.py --apply    # записать в Directus
"""
import os, re, sys, json, urllib.request, urllib.error

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://localhost:8055")


def token():
    # токен из .env (DIRECTUS_ADMIN_TOKEN=...)
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for line in open(os.path.join(here, ".env"), encoding="utf-8"):
        if line.startswith("DIRECTUS_ADMIN_TOKEN="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("DIRECTUS_ADMIN_TOKEN не найден в .env")


def api(path, method="GET", body=None, tok=""):
    req = urllib.request.Request(
        DIRECTUS + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)


# кириллические А/С → латиница (только как формат-токены A/C)
CYR = {"А": "A", "а": "A", "С": "C", "с": "C"}


def canon(label: str, w: int, h: int, shape: str) -> str:
    s = re.sub(r"\s+", " ", label).strip().replace("x", "×").replace("*", "×")
    if shape == "round":
        return f"⌀{int(w)} мм"
    # A/C-формат: вытащить токен, латинизировать букву, отбросить размеры в скобках
    m = re.search(r"([AА])\s*([2-7])\b", s)
    if m:
        pre = re.sub(r"[—\-(]\s*$", "", s[: m.start()]).strip()
        tail = " (по запросу)" if "запрос" in s.lower() else ""
        return (pre + " " if pre else "") + "A" + m.group(2) + tail
    cm = re.search(r"([CС])\s*([4-6])\b", s)
    if cm:
        pre = re.sub(r"[—\-(]\s*$", "", s[: cm.start()]).strip()
        return (pre + " " if pre else "") + "C" + cm.group(2)
    # размеры W×H → «[префикс ]W×H мм[ суффикс]»
    dm = re.search(r"(\d+)\s*×\s*(\d+)", s)
    if dm:
        pre = re.sub(r"[(\s]+$", "", s[: dm.start()]).strip()
        post = re.sub(r"^\s*мм", "", s[dm.end():]).strip().lstrip(")").strip()
        base = f"{dm.group(1)}×{dm.group(2)} мм"
        if pre:
            base = pre + " " + base
        if post:
            base = base + " " + post
        return base
    return s


def main():
    apply = "--apply" in sys.argv
    tok = token()
    rows = api("/items/product_sizes?limit=-1&fields=id,label,width,height,shape", tok=tok)["data"]
    changes = []
    for r in rows:
        new = canon(r["label"], r["width"], r["height"], r["shape"])
        if new != r["label"]:
            changes.append((r["id"], r["label"], new))
    # печать (utf-8, чтобы не падать на × в cp1251-консоли)
    out = sys.stdout
    try:
        out.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print(f"Всего строк: {len(rows)} | к изменению: {len(changes)}\n")
    for _id, old, new in sorted(changes, key=lambda x: x[1]):
        print(f"  {old:36} ->  {new}")
    if not apply:
        print("\n(dry-run) — запусти с --apply, чтобы записать.")
        return
    for _id, _old, new in changes:
        api(f"/items/product_sizes/{_id}", method="PATCH", body={"label": new}, tok=tok)
    print(f"\nЗаписано: {len(changes)} строк.")


if __name__ == "__main__":
    main()
