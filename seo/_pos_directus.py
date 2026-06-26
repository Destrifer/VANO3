# -*- coding: utf-8 -*-
# ХАБ 2: POS-материалы. Создаёт новый продукт /pos-materials (cat3, sheet) как объединённый хаб.
# Кластеры: wobblers (воблеры рекламные), pricetags (ценники), hangers (хенгеры/дорхенгеры).
# Купоны/отрывные талоны — секция в intro (Tier-2, без отдельной страницы).
# Дубли-скелеты wobblers(67)/pricetags(52)/hangers(32)/coupons(17) -> draft.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN')
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

# --- найти/создать продукт pos-materials ---
ex=get('/items/products', **{'filter[slug][_eq]':'pos-materials','limit':1,'fields':'id'}).get('data',[])
intro=('<p>Печать <strong>POS-материалов на заказ</strong> в Москве — рекламные носители для точек продаж. '
 '<a href="/pos-materials/wobblers">Рекламные воблеры</a> (на гибкой ножке к полке), '
 '<a href="/pos-materials/pricetags">ценники</a> для магазина, '
 '<a href="/pos-materials/hangers">хенгеры и дорхенгеры</a> (подвесы на ручку/полку).</p>'
 '<p>А также <strong>купоны и отрывные талоны</strong> — скидочные и подарочные, с нумерацией и отрывной частью. '
 'Печать на картоне, мелованной бумаге и самоклейке; высечка любой формы, биговка, сверление, ламинация. '
 'Тираж от 1, макет по вашему логотипу. Смежное: <a href="/tags">бирки и ярлыки</a>, '
 '<a href="/stickers">наклейки</a>, <a href="/labels">этикетки</a>.</p>')
payload={'slug':'pos-materials','name':'POS-материалы','status':'published','category':3,
  'strategy':'sheet','production':'sheet','show_in_menu':True,'show_on_home':False,
  'icon':'tabler:building-store','allow_round':True,'double_sided':True,'preview_kind':'leaflet','lead_days':2,
  'h1':'POS-материалы на заказ',
  'meta_title':'POS-материалы на заказ в Москве — печать для точек продаж | Printmos',
  'meta_description':'Печать POS-материалов: рекламные воблеры, ценники, хенгеры и дорхенгеры, купоны и отрывные талоны. Любая форма, тираж от 1. Москва.',
  'intro_text':intro}
if ex:
    PID=ex[0]['id']; req('PATCH', f'/items/products/{PID}', payload); L('product pos-materials patched id',PID)
else:
    r=req('POST','/items/products', payload); PID=r['data']['id']; L('product pos-materials created id',PID)

# материалы (печать): мелов.250/300 мат+гл, картон 2-стор., ПВХ, самоклейка
WANT_PAPERS=[6,7,11,12,16,17]
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'papers_id'}).get('data',[])
have={r['papers_id'] for r in cur}
for pid in WANT_PAPERS:
    if pid not in have: req('POST','/items/products_papers',{'products_id':PID,'papers_id':pid})
L('papers', WANT_PAPERS)

# постпечать: ламинация гл/мат, фольга, биговка, скругление, сверление, еврослот
WANT_FIN=[1,2,4,8,9,11,12]
curf=get('/items/products_finishing', **{'filter[product_id][_eq]':PID,'limit':-1,'fields':'finishing_id'}).get('data',[])
havef={r['finishing_id'] for r in curf}
for fid in WANT_FIN:
    if fid not in havef: req('POST','/items/products_finishing',{'product_id':PID,'finishing_id':fid})
L('finishing', WANT_FIN)

# размеры (POS-разнобой)
old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
SIZES=[('Ценник A7 (74×105)','rectangular',74,105),('Ценник A6 (105×148)','rectangular',105,148),
       ('Ценник 60×40','rectangular',60,40),('Воблер 80×80','rectangular',80,80),
       ('Воблер 100×100','rectangular',100,100),('Хенгер дверной 95×280','rectangular',95,280),
       ('Хенгер 100×210','rectangular',100,210),('⌀ 90 мм (круглый воблер)','round',90,90)]
for lab,sh,w,h in SIZES:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':sh,'width':w,'height':h})
L('sizes', len(SIZES))

# галерея-рыба
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба')

FAQ=[
 ('Что относится к POS-материалам?','Рекламные носители для точек продаж: воблеры (на гибкой ножке к полке), ценники, хенгеры и дорхенгеры (подвесы на ручку или полку), купоны и отрывные талоны. Печатаем на картоне, мелованной бумаге и самоклейке.'),
 ('Что такое рекламный воблер?','Воблер — рекламная табличка на гибкой пластиковой ножке, которая крепится к полке и «качается», привлекая внимание к товару. Печать на плотном картоне, любая форма по высечке.'),
 ('Делаете ценники и хенгеры на заказ?','Да. Ценники любых размеров (A7/A6 и нестандарт) — бумажные, на самоклейке. Хенгеры и дорхенгеры — с вырубным отверстием под дверную ручку или полкодержатель.'),
 ('Можно ли купоны с нумерацией и отрывной частью?','Да, печатаем купоны и отрывные талоны со сквозной нумерацией, перфорацией и отрывной частью — скидочные, подарочные, для розыгрышей.'),
 ('Какой минимальный тираж и срок?','Тираж от 1 штуки. Стандартно 1–2 рабочих дня после согласования макета; срочно — в день обращения.'),
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
 ('wobblers','Рекламные воблеры','воблеры','tabler:wave-sine',
  '<p>Печать <strong>рекламных воблеров</strong> — табличек на гибкой ножке, крепятся к полке и привлекают внимание к товару. На плотном картоне, любая форма по высечке, с логотипом. Типография, тираж от 1.</p>'),
 ('pricetags','Ценники','ценники','tabler:tag',
  '<p>Печать <strong>ценников для магазина</strong> на заказ — бумажные и на самоклейке, форматы A7/A6 и нестандарт. С логотипом и фирменным стилем, ламинация для влагостойкости. (Электронные ценники и держатели не поставляем — только печать.)</p>'),
 ('hangers','Хенгеры и дорхенгеры','хенгеры','tabler:door',
  '<p>Печать <strong>хенгеров и дорхенгеров</strong> — рекламных подвесов с вырубным отверстием под дверную ручку или полкодержатель. Для отелей, магазинов, акций. Плотный картон, высечка, тираж от 1.</p>'),
]
for slug,h1,tile,icon,intro_c in CLUSTERS:
    exc=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    pl={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':icon,'show_as_tile':True,'preset':{},'intro_text':intro_c}
    if exc: req('PATCH', f"/items/promoted_pages/{exc[0]['id']}", pl); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', pl); L('cluster+',slug)

# дубли-скелеты -> draft (свёрнуты в хаб)
for pid in (67,52,32,17):
    req('PATCH', f'/items/products/{pid}', {'status':'draft'}); L('draft', pid)
print('\nDONE pos-materials id', PID)
