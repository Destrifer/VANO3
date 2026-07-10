# -*- coding: utf-8 -*-
# Цвета материалов наклеек (product 62). Две задачи:
#  1) «цвет основы» — ОДНА запись paper_colors на материал (белая/прозрачная/
#     серебро). Красит превью; палитра НЕ показывается (PaperSelect: v-if >1).
#  2) «цветные плёнки» — новые материалы с базовой ПАЛИТРОЙ (палитра появляется).
# Идемпотентно, всегда utf-8. Имя цвета важно: «Прозрачная»/«Серебро» включают
# спецрендер превью (Preview.vue: matSignature).
#   python seo/_stickers_material_colors.py            # dry-run
#   python seo/_stickers_material_colors.py --apply
import json, os, io, sys, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith(k + '='): return line.split('=', 1)[1].strip().strip('"').strip('\r')
URL = os.environ.get('DIRECTUS_PROD_URL', 'https://admin.printmos.ru')
TOKEN = os.environ.get('DIRECTUS_PROD_TOKEN') or env('DIRECTUS_ADMIN_TOKEN')
APPLY = '--apply' in sys.argv
PID = 62

def req(method, path, body=None):
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
    r = urllib.request.Request(URL + path, data=data, method=method, headers={
        'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json; charset=utf-8'})
    with urllib.request.urlopen(r) as resp:
        t = resp.read().decode('utf-8'); return json.loads(t) if t.strip() else {}

# 1) цвет основы: paper_id -> (имя, hex). Имя выбирает спецрендер превью.
BASE = {
    17: ('Белый', '#ffffff'),        18: ('Белый', '#fafaf8'),
    19: ('Белый', '#ffffff'),        20: ('Белый', '#ffffff'),
    21: ('Белый', '#ffffff'),        22: ('Белый', '#ffffff'),
    23: ('Прозрачная', '#e9edf0'),   24: ('Серебро', '#c9ccce'),
    25: ('Серебро', '#d6d8dc'),      26: ('Белый', '#f4f5f6'),
    29: ('Серебро', '#bfc3c6'),      30: ('Прозрачная', '#eef1f3'),
    31: ('Серебро', '#cfd2d4'),
}

# 2) базовая палитра для цветных плёнок (10 основных; владелец расширит).
PALETTE = [
    ('Белый', '#ffffff'), ('Чёрный', '#1c1c1c'), ('Красный', '#e01b22'),
    ('Оранжевый', '#f36f21'), ('Жёлтый', '#ffd400'), ('Зелёный', '#009640'),
    ('Синий', '#0056a4'), ('Голубой', '#29abe2'), ('Фиолетовый', '#6d2f8f'),
    ('Розовый', '#e6007e'),
]
# новые цветные материалы: имя -> (цена-ЧЕРНОВАЯ, material_type, group)
# цена скопирована с Muflon мат/глянец (аналог цветного винила) — на выверку.
COLORED = [
    ('Плёнка цветная матовая (Oracal 641)', '120.00'),
    ('Плёнка цветная глянцевая (Oracal 641)', '80.00'),
]

def add_color(paper_id, name, hex_, sort):
    exist = req('GET', '/items/paper_colors?filter[paper][_eq]=%d&filter[name][_eq]=%s&limit=1'
                % (paper_id, urllib.parse.quote(name))).get('data', [])
    if exist: return False
    if APPLY:
        req('POST', '/items/paper_colors', {'paper': paper_id, 'name': name, 'hex': hex_, 'sort': sort})
    return True

import urllib.parse
papers = {p['id']: p for p in req('GET', '/items/papers?limit=-1&fields=id,name,colors.id')['data']}

print('=== 1) ЦВЕТ ОСНОВЫ (по 1 записи) ===')
n1 = 0
for pid, (name, hx) in BASE.items():
    p = papers.get(pid)
    if not p: print('!! нет материала', pid); continue
    if p['colors']:
        print('=  id%-3s %-38s уже есть цвет(а)' % (pid, p['name'][:38])); continue
    n1 += 1
    print('%s id%-3s %-38s → %s %s' % ('→' if APPLY else '~', pid, p['name'][:38], name, hx))
    add_color(pid, name, hx, 10)

print('\n=== 2) ЦВЕТНЫЕ ПЛЁНКИ + ПАЛИТРА ===')
existing = {p['name']: pid for pid, p in papers.items()}
linked = {r['papers_id'] for r in req('GET', '/items/products_papers?filter[products_id][_eq]=%d&limit=-1&fields=papers_id' % PID)['data']}
n2 = 0
for name, price in COLORED:
    pid = existing.get(name)
    if pid:
        print('=  «%s» уже есть (id %s)' % (name, pid))
    else:
        n2 += 1
        print('%s создать «%s» (цена %s ЧЕРНОВАЯ, palette %d)' % ('→' if APPLY else '~', name, price, len(PALETTE)))
        if APPLY:
            pid = req('POST', '/items/papers', {
                'status': 'published', 'name': name, 'price': price,
                'group': 'Цветные плёнки', 'material_type': 'Плёнка',
                'description': 'Цветная самоклеящаяся ПВХ-плёнка (Oracal 641): цвет плёнки выбирается из палитры, печать не требуется. Матовая/глянцевая поверхность.',
            })['data']['id']
            for i, (cn, ch) in enumerate(PALETTE):
                req('POST', '/items/paper_colors', {'paper': pid, 'name': cn, 'hex': ch, 'sort': (i + 1) * 10})
    if pid and pid not in linked:
        print('   %s привязать к product %d' % ('→' if APPLY else '~', PID))
        if APPLY: req('POST', '/items/products_papers', {'products_id': PID, 'papers_id': pid})

print('\n%s: цвет-основа %d, новых плёнок %d' % ('Записано' if APPLY else 'dry-run', n1, n2))
if not APPLY: print('Применить: python seo/_stickers_material_colors.py --apply')
