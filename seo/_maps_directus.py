# -*- coding: utf-8 -*-
# Карты и атласы /maps-atlases (id 40, cat5, sheet). Спроса нет -> простая страница БЕЗ кластеров
# (как благодарности): стандартные вхождения вшиты в текст. Крупный формат (А1/А2) — по запросу.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=40
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

intro=('<p>Печать <strong>карт и атласов на заказ</strong> в Москве — изготовление географических, '
 'исторических, туристических и настенных карт, а также атласов и картографических альбомов. '
 'Печать карт А4 и А3, цветная, на плотной бумаге; крупные форматы (А2/А1) и ламинация — по запросу.</p>'
 '<p>Изготавливаем атласы с переплётом, настенные карты на заказ, карты для презентаций, методичек и '
 'учебных пособий. Печать по вашему макету, тираж от 1 экземпляра, срочно — в день обращения. '
 'Смежное: <a href="/books">печать книг</a>, <a href="/blueprints">печать чертежей и схем</a>, '
 '<a href="/docs">печать документов</a>.</p>')
req('PATCH', f'/items/products/{PID}', {'name':'Карты и атласы','strategy':'sheet','production':'sheet',
  'h1':'Печать карт и атласов на заказ',
  'meta_title':'Печать карт и атласов на заказ в Москве — изготовление | Printmos',
  'meta_description':'Печать карт и атласов на заказ: географические, исторические, настенные карты, атласы с переплётом. Форматы А4 и А3, цветная печать, тираж от 1. Москва.',
  'intro_text':intro,'lead_days':2,'preview_kind':'leaflet','double_sided':False,'show_in_menu':True,'status':'published'})
L('product 40 patched -> Карты и атласы')

WANT_PAPERS=[3,5,7]  # мелованная матовая 150/250/300 (цветная печать карт)
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'papers_id'}).get('data',[])
have={r['papers_id'] for r in cur}
for pid in WANT_PAPERS:
    if pid not in have: req('POST','/items/products_papers',{'products_id':PID,'papers_id':pid})
L('papers', WANT_PAPERS)

WANT_FIN=[1,2,8]  # ламинация гл/мат (настенные карты), биговка
curf=get('/items/products_finishing', **{'filter[product_id][_eq]':PID,'limit':-1,'fields':'finishing_id'}).get('data',[])
havef={r['finishing_id'] for r in curf}
for fid in WANT_FIN:
    if fid not in havef: req('POST','/items/products_finishing',{'product_id':PID,'finishing_id':fid})
L('finishing', WANT_FIN)

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('A4 (210×297)',210,297),('A3 (297×420)',297,420),('A2 (420×594) — по запросу',420,594)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes A4/A3/A2')

cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба')

FAQ=[
 ('Какие карты вы печатаете?','Географические, исторические, туристические и настенные карты, а также атласы и картографические альбомы. Печать по вашему макету, форматы А4 и А3, крупнее — по запросу.'),
 ('Делаете атласы с переплётом?','Да, изготавливаем атласы и картографические альбомы с переплётом — мягким или твёрдым, по вашему макету.'),
 ('Можно настенную карту с ламинацией?','Да, настенные карты печатаем на плотной бумаге с глянцевой или матовой ламинацией для защиты и долговечности.'),
 ('Какой минимальный тираж?','От 1 экземпляра. Срок — обычно 1–2 рабочих дня после согласования макета.'),
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
print('\nDONE maps-atlases (без кластеров)')
