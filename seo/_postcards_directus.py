# -*- coding: utf-8 -*-
# Открытки (postcards id 49, sheet): SEO + размеры + фальц(плоская/складная) + финиши
# + 5 кластеров + new-year(Tier-2) + рыба. Идемпотентно.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=49
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

intro=('<p>Печатаем <strong>открытки на заказ</strong> в Москве — поздравительные, '
 '<a href="/postcards/logo">корпоративные с логотипом</a>, <a href="/postcards/photo">с фото</a>, '
 '<a href="/postcards/designer">на дизайнерской бумаге</a>. Плоские и складные, форматы А6/А5/100×150, '
 'плотный картон, ламинация и фольга. Тираж от 1 штуки; точная цена в калькуляторе.</p>'
 '<p><a href="/postcards/postal">Почтовые открытки</a> стандартного формата, '
 '<a href="/postcards/urgent">срочно</a> — за час. Печать односторонняя и двухсторонняя. '
 'Макет — PDF (CMYK, 300 dpi, вылеты 3 мм). Смежное: <a href="/invites">приглашения</a>, '
 '<a href="/business-cards">визитки</a>.</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','h1':'Печать открыток',
  'meta_title':'Печать открыток на заказ в Москве | Printmos',
  'meta_description':'Печать открыток на заказ: с фото, логотипом, почтовые, дизайнерские. Плоские и складные, А6/А5, картон, фольга. Тираж от 1 шт, срочно. Расчёт онлайн.',
  'intro_text':intro,'lead_days':2,'preview_kind':'leaflet','double_sided':True,
  'fold_types':[{'kind':'flat','name':'Плоская (без сложения)','folds':0},
                {'kind':'book','name':'Складная («книжка»), 1 сгиб','folds':1}]})
L('product 49 patched (sheet + fold + SEO)')

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('А6 (105×148)',105,148),('А5 (148×210)',148,210),('100×150',100,150),('Квадрат 150×150',150,150)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes А6/А5/100×150/150×150')

ensure('products_finishing','product_id','finishing_id',[1,2,3,4])
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба linked')

FAQ=[
 ('Какой минимальный тираж открыток?','Печатаем от 1 штуки. Малые тиражи и поштучная печать — обычная практика; на большой тираж — скидка.'),
 ('Можно открытку с моим фото или логотипом?','Да, печатаем открытки с вашим фото, логотипом или полным индивидуальным дизайном. Поможем с вёрсткой.'),
 ('Открытки плоские или складные?','И те, и другие: плоская карточка или складная «книжка» с одним сгибом. Выбирается в калькуляторе.'),
 ('На какой бумаге печатаете?','Плотный мелованный картон, дизайнерская бумага; по желанию — ламинация и фольгирование.'),
 ('Сколько занимает печать?','От 2 рабочих дней, срочно — в день обращения.'),
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
 ('photo','Открытки с фото','с фото',True,{},'<p>Печать <strong>открыток с фото</strong> — ваша фотография на плотном картоне, поздравительная или подарочная. Односторонние и двухсторонние, любой формат.</p>'),
 ('logo','Открытки с логотипом','с логотипом',True,{},'<p>Печать <strong>корпоративных открыток с логотипом</strong> — фирменные поздравления партнёрам и клиентам. Логотип, брендовые цвета, фольгирование.</p>'),
 ('urgent','Срочная печать открыток','срочно',True,{},'<p><strong>Срочная печать открыток</strong> в Москве — за час/в день обращения. Цифровая печать малых тиражей без потери качества.</p>'),
 ('postal','Почтовые открытки','почтовые',True,{'sizeIndex':0},'<p>Печать <strong>почтовых открыток</strong> стандартного формата А6 — лицевая иллюстрация и адресная оборотная сторона. Плотный картон, тираж от 1.</p>'),
 ('designer','Дизайнерские открытки','дизайнерские',True,{},'<p>Печать <strong>открыток на дизайнерской бумаге</strong> — фактурный картон, тиснение, фольга, кашировка. Премиальные поздравительные открытки.</p>'),
 ('new-year','Новогодние открытки','новогодние',False,{},'<p>Печать <strong>новогодних и рождественских открыток</strong> — корпоративные и поздравительные, с логотипом, фольгой и блёстками. Заказывайте заранее к сезону.</p>'),
]
for slug,h1,tile,is_tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':'tabler:mail','show_as_tile':is_tile,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug,'tile' if is_tile else 'Tier2')
print('\nDONE')
