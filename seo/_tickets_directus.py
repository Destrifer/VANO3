# -*- coding: utf-8 -*-
# Билеты (tickets id 64, sheet): SEO + размеры + финиши + рыба + lottery/numbered. Идемпотентно.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=64
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
intro=('<p>Печатаем <strong>билеты на заказ</strong> в Москве — входные и на мероприятия, концерты, '
 'выставки. <a href="/tickets/numbered">С нумерацией, перфорацией и отрывным контролем</a>, '
 '<a href="/tickets/lottery">лотерейные со скретч-слоем</a>. Плотная бумага или картон, тираж от 1; '
 'точная цена в калькуляторе.</p>'
 '<p>Смежное: <a href="/invites">пригласительные</a>, <a href="/postcards">открытки</a>. '
 'Макет — PDF (CMYK, 300 dpi, вылеты 3 мм).</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','h1':'Печать билетов',
  'meta_title':'Печать билетов на заказ в Москве | Printmos',
  'meta_description':'Печать билетов на мероприятие: входные, с нумерацией и перфорацией, лотерейные со скретч-слоем. Плотная бумага, тираж от 1. Расчёт онлайн.',
  'intro_text':intro,'lead_days':2,'preview_kind':'leaflet','double_sided':True})
L('product 64 patched')
old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('Евро (99×210)',99,210),('А6 (105×148)',105,148),('Отрывной (70×150)',70,150),('100×150',100,150)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes')
ensure('products_finishing','product_id','finishing_id',[1,2,3,4])
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба')
FAQ=[
 ('Какой минимальный тираж билетов?','От 1 штуки; обычно билеты печатают тиражом на мероприятие — на партию скидка.'),
 ('Делаете нумерацию и перфорацию?','Да, сквозная нумерация, перфорация и отрывной контроль (корешок) — для входных и контрольных билетов.'),
 ('Можно лотерейные билеты со скретч-слоем?','Да, печатаем лотерейные билеты с защитным скретч-слоем и нумерацией.'),
 ('На какой бумаге печатаете билеты?','Плотная мелованная бумага или картон; по желанию — ламинация и нумерация.'),
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
 ('lottery','Лотерейные билеты','лотерейные',{},'<p>Печать <strong>лотерейных билетов</strong> со скретч-слоем (защитное стираемое покрытие) и нумерацией. Для розыгрышей, акций и мероприятий. Тираж от 1.</p>'),
 ('numbered','Билеты с нумерацией и перфорацией','нумерация/перфорация',{},'<p>Печать <strong>билетов с нумерацией, перфорацией и отрывным корешком</strong> — входные и контрольные билеты на мероприятия. Сквозная нумерация тиража.</p>'),
]
for slug,h1,tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':'tabler:ticket','show_as_tile':True,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug)
print('\nDONE')
