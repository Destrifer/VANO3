# -*- coding: utf-8 -*-
# Бейджи (badges id 2, sheet): SEO + размеры + бейдж-финиши + рыба + 5 кластеров. Идемпотентно.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=2
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
intro=('<p>Изготавливаем <strong>бейджи на заказ</strong> в Москве — '
 '<a href="/badges/medical">для врачей и медработников</a>, для сотрудников, мероприятий и пропусков. '
 'С логотипом и именем, печать на плотной бумаге, ламинация и фольга, скругление углов. '
 'Крепление на выбор: <a href="/badges/magnet">магнит</a>, булавка, '
 '<a href="/badges/lanyard">лента/шнурок</a>. Тираж от 1; точная цена в калькуляторе.</p>'
 '<p>Также <a href="/badges/plastic">пластиковые</a> и <a href="/badges/metal">металлические</a> бейджи. '
 'Макет — PDF (CMYK, 300 dpi, вылеты 3 мм). Смежное: <a href="/business-cards">визитки</a>.</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','h1':'Бейджи на заказ',
  'meta_title':'Бейджи на заказ в Москве — изготовление | Printmos',
  'meta_description':'Изготовление бейджей на заказ: для медработников, сотрудников, мероприятий. С логотипом, на магните, ленте; пластиковые и металлические. Тираж от 1.',
  'intro_text':intro,'lead_days':2,'preview_kind':None,'double_sided':True})
L('product 2 patched')
old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('90×60 мм',90,60),('85×55 мм',85,55),('70×40 мм',70,40),('100×70 мм',100,70)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes 90×60/85×55/70×40/100×70')
ensure('products_finishing','product_id','finishing_id',[1,2,3,4,9,11,12])  # ламинация,фольга,скругление,сверление,еврослот
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба linked')
FAQ=[
 ('Какой минимальный тираж бейджей?','От 1 штуки; для мероприятий и компаний печатаем партии — на тираж скидка.'),
 ('Можно бейдж с логотипом и именем?','Да, печатаем бейджи с логотипом, именем и должностью. Сделаем комплект именных бейджей для сотрудников.'),
 ('Какое крепление у бейджа?','На выбор: магнит (не портит одежду), булавка, клипса, лента/шнурок (через еврослот или отверстие).'),
 ('Бумажные, пластиковые или металлические?','Бумажные с ламинацией (бюджетно), пластиковые (PVC) и металлические с гравировкой — уточните при заказе.'),
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
 ('medical','Бейджи для медработников','медицинские',True,{},'<p>Изготовление <strong>бейджей для врачей и медработников</strong> — имя, должность, отделение, логотип клиники. На магните (не портит халат) или клипсе. Влагостойкая ламинация.</p>'),
 ('metal','Металлические бейджи','металлические',True,{},'<p><strong>Металлические бейджи</strong> с гравировкой или полноцветной печатью, с окошком для сменного имени, на магните. Премиальный долговечный вариант.</p>'),
 ('plastic','Пластиковые бейджи','пластиковые',True,{},'<p><strong>Пластиковые бейджи</strong> (PVC) — прочные, влагостойкие, с логотипом и именем. Под ленту или клипсу, для постоянного ношения.</p>'),
 ('magnet','Бейджи на магните','на магните',True,{},'<p><strong>Бейджи на магните</strong> — крепление без прокола одежды, удобно для сотрудников и медиков. Бумажные, пластиковые или металлические.</p>'),
 ('lanyard','Бейджи на ленте и шнурке','на ленте',False,{},'<p>Бейджи <strong>на ленте/шнурке (ланъярде)</strong> — для мероприятий, конференций, пропусков. Ленты с нанесением логотипа на заказ, чехлы для пропусков.</p>'),
]
for slug,h1,tile,is_tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':'tabler:id-badge-2','show_as_tile':is_tile,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug)
print('\nDONE')
