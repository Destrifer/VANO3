# -*- coding: utf-8 -*-
# Цвета материалов наклеек (product 62). Идемпотентно, всегда utf-8.
# Модель: «матовая/глянцевая» — фактура, она НЕ отменяет цвет. Поэтому обычные
# печатные плёнки, где цвет НЕ зашит в названии, получают ПАЛИТРУ выбора цвета
# (свотчи), а плитка материала сохраняет свою белую «нейтральную» фактурную фото.
# Превью красится в выбранный цвет. Фото под каждый цвет НЕ грузим.
#
#   python seo/_stickers_material_colors.py            # dry-run
#   python seo/_stickers_material_colors.py --apply
#
# Спецрендер превью — по ИМЕНИ материала/цвета (Preview.vue matSignature):
# «Прозрачная»→шахматка, «Серебро»→блик.
import json, os, io, sys, urllib.request, urllib.parse

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

# 1) ОДИН цвет-основы (палитра НЕ показывается — цвет/прозрачность зашиты в
#    названии, либо самоклейка = просто белая). Имя выбирает спецрендер.
BASE = {
    17: ('Белый', '#ffffff'),     18: ('Белый', '#fafaf8'),   # самоклейка — только белая
    23: ('Прозрачная', '#e9edf0'),                             # прозрачность в названии
    24: ('Серебро', '#c9ccce'),                                # цвет в названии
    25: ('Серебро', '#d6d8dc'),   29: ('Серебро', '#bfc3c6'),
    30: ('Прозрачная', '#eef1f3'),31: ('Серебро', '#cfd2d4'),
}

# 2) ПАЛИТРА выбора цвета — обычные печатные плёнки + пластик (цвет НЕ в названии).
#    Белый — первый (дефолт, совпадает с нейтральной фактурной фото); далее основные.
PALETTE_PAPERS = [19, 20, 21, 22, 26]  # Polylaser мат/глянец, Muflon глянец/мат, Пластик 3M
PALETTE = [
    ('Белый', '#ffffff'), ('Чёрный', '#1c1c1c'), ('Красный', '#e01b22'),
    ('Оранжевый', '#f36f21'), ('Жёлтый', '#ffd400'), ('Зелёный', '#009640'),
    ('Синий', '#0056a4'), ('Голубой', '#29abe2'), ('Фиолетовый', '#6d2f8f'),
    ('Розовый', '#e6007e'),
]
# 3) УДАЛИТЬ ошибочно заведённые отдельные материалы (не нужны — палитра крепится
#    к существующим). Ищем по группе «Цветные плёнки».
DELETE_GROUP = 'Цветные плёнки'

def colors_of(pid):
    return req('GET', '/items/paper_colors?filter[paper][_eq]=%d&limit=-1&fields=id,name' % pid)['data']

def add_color(pid, name, hx, sort):
    ex = req('GET', '/items/paper_colors?filter[paper][_eq]=%d&filter[name][_eq]=%s&limit=1'
             % (pid, urllib.parse.quote(name))).get('data', [])
    if ex: return False
    if APPLY: req('POST', '/items/paper_colors', {'paper': pid, 'name': name, 'hex': hx, 'sort': sort})
    return True

papers = {p['id']: p for p in req('GET', '/items/papers?limit=-1&fields=id,name,group')['data']}

print('=== 1) ЦВЕТ-ОСНОВЫ (по 1, без палитры) ===')
n1 = 0
for pid, (name, hx) in BASE.items():
    if pid not in papers: print('!! нет', pid); continue
    if colors_of(pid): print('=  id%-3s %s' % (pid, papers[pid]['name'][:36])); continue
    n1 += 1; print('%s id%-3s %s → %s' % ('→' if APPLY else '~', pid, papers[pid]['name'][:36], name))
    add_color(pid, name, hx, 10)

print('\n=== 2) ПАЛИТРА (свотчи выбора цвета) ===')
n2 = 0
for pid in PALETTE_PAPERS:
    if pid not in papers: print('!! нет', pid); continue
    have = {c['name'] for c in colors_of(pid)}
    add = [(n, h) for n, h in PALETTE if n not in have]
    if not add: print('=  id%-3s %-34s палитра полная' % (pid, papers[pid]['name'][:34])); continue
    print('%s id%-3s %-34s +%d цветов' % ('→' if APPLY else '~', pid, papers[pid]['name'][:34], len(add)))
    for i, (n, h) in enumerate(PALETTE):        # переписываем сорт по канону
        if n in [a[0] for a in add]:
            n2 += 1; add_color(pid, n, h, (i + 1) * 10)

print('\n=== 3) УДАЛЕНИЕ ошибочных материалов (группа «%s») ===' % DELETE_GROUP)
wrong = [p for p in papers.values() if p['group'] == DELETE_GROUP]
for p in wrong:
    pid = p['id']
    links = req('GET', '/items/products_papers?filter[papers_id][_eq]=%d&limit=-1&fields=id' % pid)['data']
    cols = colors_of(pid)
    print('%s удалить id%-3s «%s» (%d цветов, %d привязок)'
          % ('→' if APPLY else '~', pid, p['name'], len(cols), len(links)))
    if APPLY:
        for l in links: req('DELETE', '/items/products_papers/%d' % l['id'])
        for c in cols: req('DELETE', '/items/paper_colors/%d' % c['id'])
        req('DELETE', '/items/papers/%d' % pid)

print('\n%s: основы %d, свотчей +%d, удалить %d материалов'
      % ('Записано' if APPLY else 'dry-run', n1, n2, len(wrong)))
if not APPLY: print('Применить: python seo/_stickers_material_colors.py --apply')
