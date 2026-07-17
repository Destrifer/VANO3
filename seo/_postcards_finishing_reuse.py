"""
Реюз премиум-отделки визиток на открытки (аудит /postcards, 2026-07-17).

Добавляет в калькулятор открыток (product id 49):
  - finishing 5  = УФ-лак
  - finishing 6  = Конгрев
  - finishing 9  = Скругление углов
  - allow_complex = true  → плитка формы «Вырубка» (фигурная высечка)

⚠️ Junction products_finishing использует поле product_id (ЕД. число!),
   в отличие от products_cover_papers (там products_id). Иначе строки осиротеют.
Существующие ламинация+фольга (finishing 1–4) не трогаются.
allow_round НЕ включаем (он даёт «Круглую» открытку, а не скругление углов).
Правки — значения поля + строки джанкшна, НЕ схема → снапшот-грабли не грозят.

Идемпотентно: чистит осиротевшие строки (product_id пустой) и дубли перед вставкой.
Запуск:  python seo/_postcards_finishing_reuse.py
"""
import json, urllib.request

BASE = "https://admin.printmos.ru"
POSTCARDS_ID = 49
ADD_FINISHING = [5, 6, 9]  # УФ-лак, Конгрев, Скругление углов

tok = [l.split("=", 1)[1].strip().strip('"')
       for l in open(".env", encoding="utf-8")
       if l.startswith("DIRECTUS_ADMIN_TOKEN=")][0]


def api(path, method="GET", payload=None):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Authorization": "Bearer " + tok,
                 "Content-Type": "application/json; charset=utf-8"})
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        return {"ERR": e.code, "body": e.read().decode()[:300]}
    except Exception:
        return None  # DELETE отдаёт пустой ответ


# 0) подчистить осиротевшие строки, созданные ошибочным POST с products_id
all_rows = api("/items/products_finishing?fields=id,product_id,finishing_id&limit=-1")
orphans = [r["id"] for r in all_rows.get("data", [])
           if r["product_id"] is None and r["finishing_id"] in ADD_FINISHING]
if orphans:
    api("/items/products_finishing", "DELETE", orphans)
    print("удалены осиротевшие строки:", orphans)

# 1) существующая отделка открыток — чтобы не задублировать
cur = api("/items/products?filter[slug][_eq]=postcards&fields=finishing.finishing_id&limit=1")
have = {x["finishing_id"] for x in cur["data"][0]["finishing"]}
todo = [f for f in ADD_FINISHING if f not in have]
print("уже есть finishing:", sorted(have), "| добавляю:", todo)

# 2) строки отделки — ПРАВИЛЬНОЕ поле product_id
if todo:
    r = api("/items/products_finishing", "POST",
            [{"product_id": POSTCARDS_ID, "finishing_id": f} for f in todo])
    print("finishing POST:", "OK" if "data" in r else r)

# 3) флаг вырубки
r = api(f"/items/products/{POSTCARDS_ID}", "PATCH", {"allow_complex": True})
print("allow_complex PATCH:", "OK" if "data" in r else r)

# 4) проверка
v = api("/items/products?filter[slug][_eq]=postcards&fields=allow_complex,allow_round,finishing.finishing_id&limit=1")
d = v["data"][0]
print("ИТОГ: allow_complex =", d["allow_complex"], "| allow_round =", d.get("allow_round"))
print("      finishing fids =", sorted(x["finishing_id"] for x in d["finishing"]))
