# -*- coding: utf-8 -*-
# Настройка продукта magazines (id 39) как multipage + кластеры. Идемпотентно.
import json, os, urllib.request, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=39
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

# A. газетная бумага
g=get('/items/papers', **{'filter[name][_icontains]':'азетн','limit':1}).get('data',[])
if g: GP=g[0]['id']; L('газетная exists', GP)
else:
    GP=req('POST','/items/papers',{'status':'published','name':'Газетная 48 г/м²','price':'2.00',
        'group':'Стандартные','material_type':'Газетная бумага',
        'description':'Лёгкая газетная бумага 48 г/м² — для малотиражных газет и недорогих журналов. Матовая, хорошо впитывает краску.'})['data']['id']
    L('газетная created', GP)

# B. 7БЦ переплёт (если ещё нет — создан в книгах)
b=get('/items/bindings', **{'filter[name][_contains]':'7БЦ','limit':1}).get('data',[])
HB=b[0]['id'] if b else None
L('7БЦ id', HB)

# C. PATCH product 39
intro=('<p>Печатаем <strong>журналы на заказ</strong> в Москве — корпоративные, рекламные, '
 '<a href="/magazines/glossy">глянцевые</a> издания и каталоги. Цифровая печать, скрепка или КБС, '
 'мелованная обложка с ламинацией. Формат, число полос и бумага — на выбор; точная цена в калькуляторе выше.</p>'
 '<p>От 1 экземпляра до тиража: малотиражные и периодические выпуски. Отдельно — '
 '<a href="/magazines/newspapers">печать газет</a> на газетной бумаге, '
 '<a href="/magazines/corporate">корпоративные журналы</a> для организаций, '
 '<a href="/magazines/urgent">срочная печать</a>. Макет — PDF (CMYK, 300 dpi, вылеты 3–5 мм).</p>'
 '<p>Смежное: <a href="/books">книги</a>, <a href="/catalogs">каталоги</a>, '
 '<a href="/brochures">брошюры</a>, <a href="/booklets">буклеты</a>.</p>')
req('PATCH', f'/items/products/{PID}', {
    'strategy':'multipage','h1':'Печать журналов',
    'meta_title':'Печать журналов на заказ в Москве | Printmos',
    'meta_description':'Печать журналов и газет в Москве: глянцевые и корпоративные издания, скрепка/КБС, форматы А4/А5/А3, от 1 экземпляра. Расчёт цены онлайн.',
    'intro_text':intro,'lead_days':3})
L('product 39 patched -> multipage + SEO')

# D. sizes A4/A5/A3 (A4 default index0; A3 index2 для газет)
exist=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1}).get('data',[])
if exist: L('sizes exist', len(exist),'- skip')
else:
    for lab,w,h,pps in [('A4 (210×297)',210,297,2),('A5 (148×210)',148,210,4),('A3 (297×420)',297,420,1)]:
        req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h,'pages_per_sheet':pps})
    L('sizes created A4/A5/A3')

# E. junctions
def ensure(coll, pf, rf, ids):
    cur=get(f'/items/{coll}', **{f'filter[{pf}][_eq]':PID,'limit':-1,'fields':rf}).get('data',[])
    have={r[rf] for r in cur}
    for i in ids:
        if i not in have: req('POST',f'/items/{coll}',{pf:PID, rf:i})
    L(coll,'->',ids,'had',have)
bind=[1,2,3]+([HB] if HB else [])
ensure('products_cover_papers','products_id','papers_id',[6,7,11])
ensure('products_inner_papers','products_id','papers_id',[1,2,3,GP])
ensure('products_bindings','products_id','bindings_id',bind)
ensure('products_finishing','product_id','finishing_id',[1,2,3,4])

# F. FAQ
FAQ=[
 ('Сколько стоит напечатать журнал?','Зависит от тиража, формата, числа полос, бумаги и переплёта. Точную стоимость считает калькулятор выше по реальным параметрам обложки и блока.'),
 ('Какой минимальный тираж журнала?','Печатаем от 1 экземпляра на цифре. Малотиражные и периодические выпуски — обычный заказ; большие тиражи газет (офсет) не делаем.'),
 ('На какой бумаге печатаете журналы?','Обложка — мелованная глянцевая или матовая (плотная), блок — мелованная или офсетная. Для газет — лёгкая газетная бумага.'),
 ('Какой переплёт у журнала?','Чаще всего скрепка (внакидку) для тонких журналов; КБС (клеевой) — для толстых. Подбирается автоматически по числу полос.'),
 ('Сколько занимает печать журнала?','От 3 рабочих дней в зависимости от тиража и отделки. Срочная печать — быстрее.'),
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

# G. clusters
CLUSTERS=[
 ('newspapers','Печать газет','газеты',True,{'formatIndex':2},
   '<p>Печать <strong>газет</strong> малым тиражом — на лёгкой газетной бумаге, формат А3. Корпоративные, рекламные и событийные газеты. Цифровая печать рентабельна на небольших тиражах; большие тиражи (офсет) не делаем. Конфигуратор открыт на формате А3 — выберите газетную бумагу в блоке.</p>'),
 ('glossy','Глянцевые журналы','глянцевые',True,{},
   '<p>Печать <strong>глянцевых журналов</strong> — мелованная обложка с глянцевой ламинацией, насыщенная цветопередача. Модные, рекламные и презентационные издания. В конфигураторе выберите мелованную глянцевую обложку и глянцевую ламинацию.</p>'),
 ('urgent','Срочная печать журналов','срочно',True,{},
   '<p><strong>Срочная печать журналов</strong> в Москве — изготовление в ускоренные сроки. Цифровая печать позволяет напечатать журнал быстро даже малым тиражом.</p>'),
 ('corporate','Корпоративные журналы','корпоративные',False,{},
   '<p>Печать <strong>корпоративных и рекламных журналов</strong> для организаций — фирменные, периодические и презентационные издания. Тираж от 1 экземпляра, фирменная обложка, отделка под бренд.</p>'),
]
for slug,h1,tile,is_tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,
             'icon':'tabler:news','show_as_tile':is_tile,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster updated', slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster created', slug, '(tile=%s)'%is_tile)

open(os.path.join(HERE,'_mag_directus.log'),'w',encoding='utf-8').write('\n'.join(log))
print('\nDONE')
