# -*- coding: utf-8 -*-
# Планы эвакуации (evacuation-plans id 24, sheet): фотолюм. материалы + ГОСТ-размеры +
# ламинация + SEO + рыба + кластер development. Идемпотентно.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=24
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

# A. фотолюминесцентные материалы
def ensure_paper(name, price, mt, desc):
    g=get('/items/papers', **{'filter[name][_eq]':name,'limit':1}).get('data',[])
    if g: return g[0]['id']
    return req('POST','/items/papers',{'status':'published','name':name,'price':price,'group':'Специальные','material_type':mt,'description':desc})['data']['id']
FILM=ensure_paper('Фотолюминесцентная плёнка','350','Фотолюминесцентная плёнка',
  'Самосветящаяся в темноте плёнка для планов эвакуации и знаков безопасности по ГОСТ. Накапливает свет и светится при отключении освещения.')
PAPER=ensure_paper('Фотолюминесцентная бумага','180','Фотолюминесцентная бумага',
  'Фотолюминесцентная бумага для планов эвакуации (бюджетный вариант), под ламинацию.')
L('materials', FILM, PAPER)
# заменить бумаги продукта на фотолюминесцентные
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'id,papers_id'}).get('data',[])
for r in cur:
    if r['papers_id'] not in (FILM,PAPER): req('DELETE', f"/items/products_papers/{r['id']}")
have={r['papers_id'] for r in cur}
for pid in (FILM,PAPER):
    if pid not in have: req('POST','/items/products_papers',{'products_id':PID,'papers_id':pid})
L('papers -> фотолюминесцентные')

# B. PATCH product
intro=('<p><strong>Изготовление планов эвакуации</strong> при пожаре в Москве по ГОСТ Р 12.2.143 и ГОСТ 34428‑2018. '
 'Печать на <strong>фотолюминесцентной плёнке</strong> (светится в темноте при отключении света) с защитной ламинацией. '
 'Этажные, секционные, локальные и сводные планы; форматы по назначению. '
 'Также <a href="/evacuation-plans/development">разработка плана</a> по вашему объекту.</p>'
 '<p>Заказать план эвакуации для офиса, магазина, школы, склада или предприятия — тираж от 1, '
 'дубликаты. Макет — по вашему чертежу или разработаем по экспликации помещений. '
 'Смежное: знаки безопасности, эвакуационные указатели.</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','h1':'Изготовление планов эвакуации',
  'meta_title':'Изготовление планов эвакуации по ГОСТ в Москве | Printmos',
  'meta_description':'Изготовление и печать планов эвакуации при пожаре на фотолюминесцентной плёнке по ГОСТ Р 12.2.143. Этажные, секционные, локальные. Разработка, тираж от 1.',
  'intro_text':intro,'lead_days':3,'preview_kind':'leaflet','double_sided':False})
L('product 24 patched')

# C. ГОСТ-размеры
old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('Этажный/секционный 600×400',600,400),('Локальный 400×300',400,300),('Сводный 800×600',800,600),('Большой 1000×700',1000,700)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes ГОСТ')

# D. ламинация
ensure=lambda coll,pf,rf,ids: [req('POST',f'/items/{coll}',{pf:PID,rf:i}) for i in ids if i not in {r[rf] for r in get(f'/items/{coll}', **{f'filter[{pf}][_eq]':PID,'limit':-1,'fields':rf}).get('data',[])}]
ensure('products_finishing','product_id','finishing_id',[1,2,3])
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба')

FAQ=[
 ('На каком материале делаете планы эвакуации?','На фотолюминесцентной плёнке (светится в темноте при отключении освещения) с защитной ламинацией — по ГОСТ Р 12.2.143 и ГОСТ 34428‑2018.'),
 ('Какие бывают планы эвакуации?','Этажные, секционные (для больших этажей), локальные (для номеров/кабинетов) и сводные. Размер — по назначению и площади.'),
 ('Вы разрабатываете план или только печатаете?','Можем и разработать план по экспликации вашего объекта, и напечатать по готовому макету. См. «разработка планов эвакуации».'),
 ('Какой минимальный тираж?','От 1 экземпляра; дубликаты и комплекты на здание — оперативно.'),
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

# E. кластер development
ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':'development','limit':1}).get('data',[])
payload={'status':'published','product':PID,'slug':'development','h1':'Разработка планов эвакуации',
 'tile_label':'Разработка','icon':'tabler:map-2','show_as_tile':True,'preset':{},
 'intro_text':('<p><strong>Разработка планов эвакуации</strong> при пожаре по ГОСТ Р 12.2.143 — '
  'составим план по экспликации и обмерам вашего объекта: пути эвакуации, выходы, знаки, '
  'графическая и текстовая части. Сразу изготовим на фотолюминесцентной плёнке. '
  'Для офисов, школ, ТЦ, складов и производств.</p>')}
if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~ development')
else: req('POST','/items/promoted_pages', payload); L('cluster+ development')
print('\nDONE')
