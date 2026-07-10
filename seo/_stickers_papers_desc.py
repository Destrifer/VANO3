# -*- coding: utf-8 -*-
# Восстановление описаний материалов наклеек (product 62): у papers 17–26
# description в БД состоял из литеральных «?» — текст был утрачен при записи
# в неверной кодировке. Пишем заново, ЯВНО в utf-8. Идемпотентно.
#   python seo/_stickers_papers_desc.py            # dry-run (показать diff)
#   python seo/_stickers_papers_desc.py --apply    # записать на прод
import json, os, io, sys, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith(k + '='): return line.split('=', 1)[1].strip().strip('"').strip('\r')
URL = os.environ.get('DIRECTUS_PROD_URL', 'https://admin.printmos.ru')
TOKEN = os.environ.get('DIRECTUS_PROD_TOKEN') or env('DIRECTUS_ADMIN_TOKEN')
APPLY = '--apply' in sys.argv

# Стиль эталона (papers 29–31): 1–2 предложения, «свойство → применение».
# Без выдуманных ТТХ (сроков службы, стойкости к УФ) — только то, что верно
# для самого класса материала.
DESC = {
    17: 'Бумажная самоклейка с лёгким блеском: цвета выглядят насыщеннее, чем на матовой. '
        'Для наклеек внутри помещения — маркировка, стикеры на упаковку, промо.',
    18: 'Матовая бумажная самоклейка без покрытия: не бликует, поверх печати можно писать ручкой. '
        'Для инвентарных, складских и адресных наклеек.',
    19: 'Матовая полимерная плёнка: не боится влаги и не даёт бликов под лампой. '
        'Для наклеек, которые протирают и часто трогают руками.',
    20: 'Глянцевая полимерная плёнка: влагостойкая основа, яркие контрастные цвета. '
        'Для товарных этикеток и наклеек, контактирующих с влагой.',
    21: 'Глянцевая самоклеящаяся плёнка Muflon: влагостойкая, с насыщенным цветом. '
        'Бюджетный вариант для тиражных наклеек и этикеток.',
    22: 'Матовая плёнка Muflon: спокойная поверхность без бликов, приятная на ощупь. '
        'Для этикеток и наклеек, где важен сдержанный вид.',
    23: 'Прозрачная плёнка Muflon: печать выглядит нанесённой прямо на поверхность. '
        'Для стекла, витрин и прозрачной упаковки; белый цвет не печатается — остаётся прозрачным.',
    24: 'Металлизированная плёнка Oracal с серебряной основой: цвета получают металлический отлив. '
        'Для шильдиков, премиальных этикеток и технической маркировки.',
    25: 'Световозвращающая плёнка: в свете фар или фонаря изображение ярко отсвечивает. '
        'Для знаков безопасности, указателей и наклеек, заметных в темноте.',
    26: 'Плотный плёночный материал 3M повышенной стойкости: держит форму и не рвётся при наклеивании. '
        'Для долговечной маркировки техники и оборудования.',
}

def req(method, path, body=None):
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
    r = urllib.request.Request(URL + path, data=data, method=method, headers={
        'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json; charset=utf-8'})
    with urllib.request.urlopen(r) as resp:
        t = resp.read().decode('utf-8'); return json.loads(t) if t.strip() else {}

cur = {p['id']: p for p in req('GET', '/items/papers?limit=-1&fields=id,name,description')['data']}
changed = 0
for pid, text in DESC.items():
    old = cur[pid]['description'] or ''
    if old == text:
        print('=  %d %s — уже актуально' % (pid, cur[pid]['name'])); continue
    changed += 1
    print('%s %d %s' % ('→' if APPLY else '~', pid, cur[pid]['name']))
    print('   было: %s' % (old[:70] + ('…' if len(old) > 70 else '')))
    print('   стало: %s' % (text[:70] + '…'))
    if APPLY:
        req('PATCH', '/items/papers/%d' % pid, {'description': text})

print('\n%s: %d из %d' % ('Записано' if APPLY else 'К записи (dry-run)', changed, len(DESC)))
if not APPLY and changed:
    print('Применить: python seo/_stickers_papers_desc.py --apply')
