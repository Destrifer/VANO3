# -*- coding: utf-8 -*-
# Настройка продукта forms (id 29, sheet) — бланочная продукция. Идемпотентно.
# ТОЛЬКО легитимные бланки (фирменные/самокопир/БСО). Мошеннич./регулируемое — EXCLUDE.
import json, os, urllib.request, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=29
def req(method, path, body=None):
    data=json.dumps(body).encode('utf-8') if body is not None else None
    r=urllib.request.Request(URL+path, data=data, method=method,
        headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'})
    with urllib.request.urlopen(r) as resp:
        t=resp.read().decode('utf-8'); return json.loads(t) if t.strip() else {}
def get(path, **p):
    qs='&'.join(f"{k}={urllib.parse.quote(str(v))}" for k,v in p.items())
    return req('GET', path+('?'+qs if qs else ''))
log=[]
def L(*a): log.append(' '.join(str(x) for x in a)); print(*a)

# A. самокопирующаяся бумага (NCR) — черновая цена
g=get('/items/papers', **{'filter[name][_icontains]':'амокопир','limit':1}).get('data',[])
if g: NCR=g[0]['id']; L('NCR paper exists', NCR)
else:
    NCR=req('POST','/items/papers',{'status':'published','name':'Самокопирующаяся (NCR) 80 г/м²','price':'8.00',
        'group':'Специальные','material_type':'Самокопирующаяся бумага',
        'description':'Самокопирующаяся (NCR) бумага: текст с верхнего листа переносится на нижние без копирки. Для квитанций, накладных, актов в 2–3 слоя.'})['data']['id']
    L('NCR paper created', NCR)
# привязать к forms
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'papers_id'}).get('data',[])
if NCR not in {r['papers_id'] for r in cur}:
    req('POST','/items/products_papers',{'products_id':PID,'papers_id':NCR}); L('NCR linked to forms')

# B. PATCH product 29
intro=('<p>Печатаем <strong>бланки на заказ</strong> в Москве: '
 '<a href="/forms/letterhead">фирменные бланки</a> организаций с логотипом, '
 '<a href="/forms/self-copy">самокопирующиеся</a> бланки (квитанции, накладные, акты), '
 '<a href="/forms/bso">бланки строгой отчётности</a>. Формат А4/А5, цифровая печать, '
 'нумерация по запросу. Тираж от 100; точная цена в калькуляторе выше.</p>'
 '<p>Бумага — офсетная, мелованная или самокопирующаяся; печать в 1 или 4 краски. '
 'Макет принимаем в PDF (CMYK, 300 dpi, вылеты 3 мм). Смежное: '
 '<a href="/envelopes">конверты</a>, фирменный стиль.</p>')
req('PATCH', f'/items/products/{PID}', {
    'strategy':'sheet','h1':'Печать бланков',
    'meta_title':'Печать бланков на заказ в Москве | Printmos',
    'meta_description':'Печать фирменных, самокопирующихся бланков и БСО в Москве: формат А4/А5, нумерация, от 100 экз. Расчёт цены онлайн, срок от 2 дней.',
    'intro_text':intro,'lead_days':2})
L('product 29 patched -> SEO (sheet)')

# C. sizes A4/A5
exist=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1}).get('data',[])
if exist: L('sizes exist', len(exist),'- skip')
else:
    for lab,w,h in [('A4 (210×297)',210,297),('A5 (148×210)',148,210)]:
        req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
    L('sizes created A4/A5')

# D. FAQ
FAQ=[
 ('Какой минимальный тираж бланков?','Печатаем от 100 экземпляров. Для фирменных бланков и БСО малый тираж — обычная практика.'),
 ('Что такое самокопирующиеся бланки?','Это бланки на специальной NCR-бумаге: написанное на верхнем листе автоматически переносится на нижние без копирки. Удобно для квитанций, накладных и актов в 2–3 экземпляра.'),
 ('Делаете ли нумерацию бланков?','Да, возможна сквозная нумерация бланков и БСО. Уточните диапазон номеров при заказе.'),
 ('В каком виде присылать макет?','PDF, CMYK, 300 dpi, вылеты 3 мм. Для фирменного бланка достаточно логотипа и реквизитов — поможем с вёрсткой.'),
 ('Сколько занимает печать?','От 2 рабочих дней в зависимости от тиража. Срочная печать — быстрее.'),
]
faq_ids=[]
for q,a in FAQ:
    f=get('/items/faq_items', **{'filter[question][_eq]':q,'limit':1}).get('data',[])
    faq_ids.append(f[0]['id'] if f else req('POST','/items/faq_items',{'question':q,'answer':a})['data']['id'])
cur=get('/items/products_faq_items', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'faq_items_id'}).get('data',[])
have={r['faq_items_id'] for r in cur}
for fid in faq_ids:
    if fid not in have: req('POST','/items/products_faq_items',{'products_id':PID,'faq_items_id':fid})
L('faq linked', faq_ids)

# E. clusters (sheet, preset {} — дифференциация контентом)
CLUSTERS=[
 ('letterhead','Печать фирменных бланков','фирменные',
   '<p>Печать <strong>фирменных бланков</strong> организации — логотип, реквизиты, фирменные цвета на бумаге А4. Для писем, договоров и official-переписки. Цифровая печать в 1 или 4 краски, тираж от 100.</p>'),
 ('self-copy','Самокопирующиеся бланки','самокопир.',
   '<p>Печать <strong>самокопирующихся бланков</strong> (NCR) — квитанции, накладные, акты, заказ-наряды в 2–3 слоя без копирки. Возможна нумерация и проклейка в блоки. Выберите самокопирующуюся бумагу в конфигураторе.</p>'),
 ('bso','Бланки строгой отчётности (БСО)','БСО',
   '<p>Печать <strong>бланков строгой отчётности</strong> — со сквозной нумерацией, по типовым и индивидуальным формам. Для приёма оплаты без кассы (в разрешённых случаях). Тираж от 100, учётная нумерация.</p>'),
]
for slug,h1,tile,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,
             'icon':'tabler:file-text','show_as_tile':True,'preset':{},'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster updated', slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster created', slug)

open(os.path.join(HERE,'_blanks_directus.log'),'w',encoding='utf-8').write('\n'.join(log))
print('\nDONE')
