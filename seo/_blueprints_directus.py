# -*- coding: utf-8 -*-
# Чертежи: хаб /blueprints (id 6, cat5, sheet). Формат-нейтральный head, на странице А4/А3,
# крупный формат — по запросу (через партнёров, не афишируем). Смежное: фальцовка, копирование А3, ч/б.
# Кластеры: project-docs (проектная документация), a3, folding (фальцовка), copy (копирование).
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=6
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

intro=('<p>Печать <strong>чертежей в Москве</strong> — быстро и недорого, форматы <strong>А4 и А3</strong>, '
 'чёрно-белая и цветная инженерная печать. '
 '<a href="/blueprints/project-docs">Печать проектной документации</a> с брошюровкой, '
 '<a href="/blueprints/a3">чертежи А3</a>, '
 '<a href="/blueprints/folding">фальцовка</a> и '
 '<a href="/blueprints/copy">копирование чертежей</a>.</p>'
 '<p>Печатаем со сшивкой и фальцовкой комплекта, по ГОСТ-форматам. Тираж от 1 листа, '
 'приём файлов PDF/DWG. Форматы крупнее А3 — по запросу под конкретный заказ. '
 'Смежное: <a href="/booklets">буклеты</a>, <a href="/folders">папки</a> для проектов.</p>')
req('PATCH', f'/items/products/{PID}', {'name':'Чертежи','strategy':'sheet','production':'sheet',
  'h1':'Печать чертежей в Москве',
  'meta_title':'Печать чертежей в Москве — А4 и А3, недорого | Printmos',
  'meta_description':'Печать чертежей и проектной документации: форматы А4 и А3, чёрно-белая и цветная инженерная печать, фальцовка, копирование. Тираж от 1 листа.',
  'intro_text':intro,'lead_days':1,'preview_kind':'leaflet','double_sided':False,'show_in_menu':True,'status':'published'})
L('product 6 patched -> Чертежи / Печать чертежей')

# бумаги: офсетная 80 (ч/б инженерная), мелованная матовая 150 (цветная)
WANT_PAPERS=[1,3]
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'papers_id'}).get('data',[])
have={r['papers_id'] for r in cur}
for pid in WANT_PAPERS:
    if pid not in have: req('POST','/items/products_papers',{'products_id':PID,'papers_id':pid})
L('papers', WANT_PAPERS)

# постпечать: ламинация (опц.) — фальцовка/сшивка идут осями продукта, не finishing
WANT_FIN=[1,2,8]
curf=get('/items/products_finishing', **{'filter[product_id][_eq]':PID,'limit':-1,'fields':'finishing_id'}).get('data',[])
havef={r['finishing_id'] for r in curf}
for fid in WANT_FIN:
    if fid not in havef: req('POST','/items/products_finishing',{'product_id':PID,'finishing_id':fid})
L('finishing', WANT_FIN)

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('A4 (210×297)',210,297),('A3 (297×420)',297,420)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes A4/A3')

cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба')

FAQ=[
 ('Какие форматы чертежей вы печатаете?','Стандартно А4 и А3 — чёрно-белая и цветная инженерная печать. Форматы крупнее А3 (А2/А1/А0) — по запросу под конкретный заказ.'),
 ('Печатаете проектную документацию?','Да, печатаем проектную и рабочую документацию комплектом — со сшивкой, фальцовкой и брошюровкой. Принимаем PDF и DWG.'),
 ('Делаете фальцовку и копирование чертежей?','Да. Фальцовка (складывание) распечатанных чертежей в комплект и копирование/ксерокс чертежей в пределах А3.'),
 ('Какой минимальный тираж и срок?','От 1 листа. Чертежи и схемы — обычно в день обращения; комплект проектной документации — 1 рабочий день.'),
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
 ('project-docs','Печать проектной документации','проектная документация','tabler:files',
  '<p>Печать <strong>проектной и рабочей документации</strong> в Москве — комплектом, со сшивкой, фальцовкой и брошюровкой. Форматы А4 и А3, чёрно-белая и цветная. Принимаем PDF/DWG, тираж от 1 комплекта.</p>'),
 ('a3','Печать чертежей А3','формат А3','tabler:file',
  '<p>Печать <strong>чертежей формата А3</strong> — чёрно-белая и цветная инженерная печать. Чёткие линии, плотная бумага, тираж от 1 листа, срочно в день обращения.</p>'),
 ('folding','Фальцовка чертежей','фальцовка','tabler:fold',
  '<p><strong>Фальцовка чертежей</strong> — складывание распечатанных листов в формат А4 для подшивки в папку или альбом проекта. По ГОСТ, аккуратный комплект. Также брошюровка документации.</p>'),
 ('copy','Копирование чертежей','копирование','tabler:copy',
  '<p><strong>Копирование и ксерокопия чертежей</strong> в пределах А3 — быстро и недорого. Копии и печать со сшивкой, чёрно-белые и цветные.</p>'),
]
for slug,h1,tile,icon,intro_c in CLUSTERS:
    exc=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    pl={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':icon,'show_as_tile':True,'preset':{},'intro_text':intro_c}
    if exc: req('PATCH', f"/items/promoted_pages/{exc[0]['id']}", pl); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', pl); L('cluster+',slug)
print('\nDONE blueprints')
