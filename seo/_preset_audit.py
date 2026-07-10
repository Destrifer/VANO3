# -*- coding: utf-8 -*-
# Снимок пресетов кластеров с ПРОДА: какие заданы, какие пусты.
# Печатает markdown-таблицу для seo/cluster-preset-audit.md (колонку «Проверен»
# ведём вручную — скрипт знает про пресет, но не про то, что мы его обдумали).
#   python seo/_preset_audit.py
import json, os, io, sys, collections, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith(k + '='): return line.split('=', 1)[1].strip().strip('"').strip('\r')
URL = os.environ.get('DIRECTUS_PROD_URL', 'https://admin.printmos.ru')
TOKEN = os.environ.get('DIRECTUS_PROD_TOKEN') or env('DIRECTUS_ADMIN_TOKEN')

req = urllib.request.Request(
    URL + '/items/promoted_pages?limit=-1&fields=slug,status,preset,'
          'product.slug,product.name,product.strategy',
    headers={'Authorization': 'Bearer ' + TOKEN})
with urllib.request.urlopen(req) as r:
    rows = json.loads(r.read().decode('utf-8'))['data']

by_product = collections.defaultdict(list)
for p in rows:
    pr = p.get('product') or {}
    by_product[(pr.get('slug'), pr.get('name'), pr.get('strategy'))].append(p)

empty_total = 0
print('| Продукт | Стратегия | Кластеров | С пресетом | Пустые |')
print('|---|---|---|---|---|')
for (slug, name, strategy), pages in sorted(by_product.items(), key=lambda x: -len(x[1])):
    empty = sorted(p['slug'] for p in pages if not p['preset'])
    empty_total += len(empty)
    mark = '—' if not empty else ', '.join('`%s`' % s for s in empty)
    print('| `/%s` %s | %s | %d | %d | %s |' % (slug, name, strategy, len(pages), len(pages) - len(empty), mark))
print('\nВсего кластеров: %d, продуктов: %d, пустых пресетов: %d'
      % (len(rows), len(by_product), empty_total))
