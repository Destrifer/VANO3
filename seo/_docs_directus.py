# -*- coding: utf-8 -*-
# Единый хаб ПЕЧАТЬ ДОКУМЕНТОВ /docs (id 20, cat5, sheet). Объединяет печать документов + презентаций.
# Кластеры: presentations (печать презентаций ~3.3k), color (цветная), binding (копирование/брошюровка).
# presentations(51) — дубль-скелет -> draft (свёрнут в /docs/presentations).
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=20
def req(m,p,b=None):
    data=json.dumps(b).encode('utf-8') if b is not None else None
    r=urllib.request.Request(URL+p,data=data,method=m,headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(r) as resp:
            t=resp.read().decode('utf-8'); return json.loads(t) if t.strip() else {}
    except urllib.error.HTTPError as e:
        print('  ERR',e.code,p,e.read().decode()[:200]); return {}
def get(p,**kw):
    qs='&'.join(f"{k}={urllib.parse.quote(str(v))}" for k,v in kw.items()); return req('GET',p+('?'+qs if qs else ''))
def L(*a): print(*a)

intro=('<p>Печать <strong>документов в Москве</strong> — быстро, недорого, форматы А4 и А3, '
 'чёрно-белая и цветная. Печать со скана, с флешки, телефона или электронной почты; '
 'копирование, сшивка и брошюровка. '
 '<a href="/docs/presentations">Печать презентаций</a>, '
 '<a href="/docs/color">цветная печать</a>, '
 '<a href="/docs/binding">копирование и брошюровка</a>.</p>'
 '<p>Печатаем рефераты, доклады, отчёты, договоры, инструкции и любые документы. '
 'Тираж от 1 листа, срочно — в день обращения. Смежное: '
 '<a href="/blueprints">печать чертежей</a>, <a href="/diplomas">дипломы и ВКР</a>, '
 '<a href="/folders">папки для документов</a>. '
 '<em>Изготовление печатей и штампов организаций не выполняем — только печать (распечатку) документов.</em></p>')
req('PATCH', f'/items/products/{PID}', {'name':'Документы','strategy':'sheet','production':'sheet',
  'h1':'Печать документов в Москве',
  'meta_title':'Печать документов в Москве — А4 и А3, цветная и ч/б | Printmos',
  'meta_description':'Печать документов: форматы А4 и А3, чёрно-белая и цветная, со скана и с флешки, копирование и брошюровка. Печать презентаций. Тираж от 1, срочно.',
  'intro_text':intro,'lead_days':1,'preview_kind':'leaflet','double_sided':True,'show_in_menu':True,'status':'published'})
L('product 20 patched -> Документы / Печать документов')

WANT_PAPERS=[1,3]  # офсетная 80 (ч/б), мелованная матовая 150 (цветная)
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'papers_id'}).get('data',[])
have={r['papers_id'] for r in cur}
for pid in WANT_PAPERS:
    if pid not in have: req('POST','/items/products_papers',{'products_id':PID,'papers_id':pid})
L('papers', WANT_PAPERS)

WANT_FIN=[8]  # биговка (для буклетных документов); сшивка/брошюровка — ось продукта
curf=get('/items/products_finishing', **{'filter[product_id][_eq]':PID,'limit':-1,'fields':'finishing_id'}).get('data',[])
havef={r['finishing_id'] for r in curf}
for fid in WANT_FIN:
    if fid not in havef: req('POST','/items/products_finishing',{'product_id':PID,'finishing_id':fid})
L('finishing', WANT_FIN)

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('A4 (210×297)',210,297),('A3 (297×420)',297,420),('A5 (148×210)',148,210)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes A4/A3/A5')

cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба')

FAQ=[
 ('Что вы печатаете в разделе документов?','Любые документы: рефераты, доклады, отчёты, договоры, инструкции, презентации. Форматы А4 и А3, чёрно-белая и цветная печать, со скана, с флешки, телефона или e-mail.'),
 ('Делаете печати и штампы организаций?','Нет. Мы печатаем (распечатываем) документы, но не изготавливаем печати и штампы (оттиски) для организаций и ИП.'),
 ('Можно копирование и брошюровку?','Да — копирование/ксерокопия, сшивка, переплёт и брошюровка комплекта документов. Удобно для отчётов, договоров, методичек.'),
 ('Какой минимальный тираж и срок?','От 1 листа. Обычно печатаем в день обращения; комплект с брошюровкой — в течение дня.'),
]
ids=[]
for q,a in FAQ:
    f=get('/items/faq_items', **{'filter[question][_eq]':q,'limit':1}).get('data',[])
    ids.append(f[0]['id'] if f else req('POST','/items/faq_items',{'question':q,'answer':a})['data']['id'])
curf=get('/items/products_faq_items', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'faq_items_id'}).get('data',[])
havef={r['faq_items_id'] for r in curf}
for fid in ids:
    if fid not in havef: req('POST','/items/products_faq_items',{'products_id':PID,'faq_items_id':fid})
L('faq')

CLUSTERS=[
 ('presentations','Печать презентаций','презентации','tabler:presentation',
  '<p>Печать <strong>презентаций</strong> в Москве — форматы А4 и А3, цветная печать слайдов, по 1–6 слайдов на лист, с брошюровкой. Раздаточные материалы для защиты, питча, выступления. Принимаем PDF и PowerPoint, тираж от 1.</p>'),
 ('color','Цветная печать документов','цветная печать','tabler:palette',
  '<p><strong>Цветная печать документов</strong> А4 и А3 — отчёты, презентации, графики, фото в документах. Насыщенные цвета, плотная бумага. Тираж от 1 листа, срочно в день обращения.</p>'),
 ('binding','Копирование и брошюровка документов','брошюровка','tabler:books',
  '<p><strong>Копирование, сшивка и брошюровка документов</strong> — ксерокопия, печать со скана, переплёт комплекта на пружину или клей. Для отчётов, договоров, методичек и проектов.</p>'),
]
for slug,h1,tile,icon,intro_c in CLUSTERS:
    exc=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    pl={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':icon,'show_as_tile':True,'preset':{},'intro_text':intro_c}
    if exc: req('PATCH', f"/items/promoted_pages/{exc[0]['id']}", pl); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', pl); L('cluster+',slug)

# presentations (id 51) дубль-скелет -> draft (свёрнут в /docs/presentations)
req('PATCH', '/items/products/51', {'status':'draft'}); L('presentations(51) -> draft')
print('\nDONE docs hub')
