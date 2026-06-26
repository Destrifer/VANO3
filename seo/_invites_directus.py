# -*- coding: utf-8 -*-
# Приглашения (invites id 34, sheet): SEO + размеры + фальц + финиши + 2 кластера + рыба.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=34
def req(m,p,b=None):
    data=json.dumps(b).encode('utf-8') if b is not None else None
    r=urllib.request.Request(URL+p,data=data,method=m,headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(r) as resp:
            t=resp.read().decode('utf-8'); return json.loads(t) if t.strip() else {}
    except urllib.error.HTTPError as e:
        print('  ERR',e.code,p,e.read().decode()[:160]); return {}
def get(p,**kw):
    qs='&'.join(f"{k}={urllib.parse.quote(str(v))}" for k,v in kw.items()); return req('GET',p+('?'+qs if qs else ''))
def L(*a): print(*a)
def ensure(coll,pf,rf,ids):
    cur=get(f'/items/{coll}', **{f'filter[{pf}][_eq]':PID,'limit':-1,'fields':rf}).get('data',[])
    have={r[rf] for r in cur}
    for i in ids:
        if i not in have: req('POST',f'/items/{coll}',{pf:PID, rf:i})

intro=('<p>Печатаем <strong>приглашения и пригласительные на заказ</strong> в Москве — '
 '<a href="/invites/wedding">свадебные</a>, <a href="/invites/birthday">на день рождения</a>, '
 'на юбилей, корпоративные и на мероприятия. Плоские и складные, плотный картон или дизайнерская бумага, '
 'фольгирование и тиснение. Тираж от 1; точная цена в калькуляторе.</p>'
 '<p>Печать односторонняя и двухсторонняя, любой формат (Евро, А6, квадрат). Макет — PDF (CMYK, 300 dpi, вылеты 3 мм). '
 'Смежное: <a href="/postcards">открытки</a>, <a href="/envelopes">конверты</a>.</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','name':'Приглашения','h1':'Печать приглашений',
  'meta_title':'Печать приглашений на заказ в Москве | Printmos',
  'meta_description':'Печать приглашений и пригласительных: свадебные, на день рождения, юбилей. Плоские и складные, дизайнерский картон, фольга. Тираж от 1. Расчёт онлайн.',
  'intro_text':intro,'lead_days':2,'preview_kind':'leaflet','double_sided':True,
  'fold_types':[{'kind':'flat','name':'Плоское (без сложения)','folds':0},
                {'kind':'book','name':'Складное («книжка»), 1 сгиб','folds':1}]})
L('product 34 patched (Приглашения, sheet+fold+SEO)')

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('А6 (105×148)',105,148),('Евро (99×210)',99,210),('А5 (148×210)',148,210),('Квадрат 150×150',150,150)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes А6/Евро/А5/квадрат')

ensure('products_finishing','product_id','finishing_id',[1,2,3,4])
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба linked')

FAQ=[
 ('Какой минимальный тираж приглашений?','Печатаем от 1 штуки; на тираж от 30–50 — выгоднее. Свадебные часто печатают комплектом с конвертом.'),
 ('Приглашения плоские или складные?','И те, и другие: плоская карточка или складное приглашение «книжка». Выбирается в калькуляторе.'),
 ('Можно фольгу и тиснение?','Да, для свадебных и премиальных приглашений доступны фольгирование, тиснение и дизайнерский картон.'),
 ('В каком виде присылать макет?','PDF, CMYK, 300 dpi, вылеты 3 мм. Поможем с вёрсткой по вашему тексту и оформлению.'),
]
ids=[]
for q,a in FAQ:
    f=get('/items/faq_items', **{'filter[question][_eq]':q,'limit':1}).get('data',[])
    ids.append(f[0]['id'] if f else req('POST','/items/faq_items',{'question':q,'answer':a})['data']['id'])
curf=get('/items/products_faq_items', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'faq_items_id'}).get('data',[])
havef={r['faq_items_id'] for r in curf}
for fid in ids:
    if fid not in havef: req('POST','/items/products_faq_items',{'products_id':PID,'faq_items_id':fid})
L('faq linked')

CLUSTERS=[
 ('wedding','Свадебные приглашения','свадебные',{},'<p>Печать <strong>свадебных приглашений</strong> — на дизайнерском картоне, с фольгой, тиснением и индивидуальным дизайном. Плоские и складные, под конверт. Соберём по вашему тексту.</p>'),
 ('birthday','Приглашения на день рождения','день рождения',{},'<p>Печать <strong>приглашений на день рождения</strong> — детские и взрослые, яркая печать, любой формат. Тираж от 1 штуки, срочно.</p>'),
]
for slug,h1,tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':'tabler:mail-opened','show_as_tile':True,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug)
print('\nDONE')
