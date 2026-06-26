# -*- coding: utf-8 -*-
# Настройка продукта books (id 8) как multipage + кластеры. Идемпотентно.
import json, os, urllib.request, urllib.parse

HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL=env('DIRECTUS_URL') or 'http://localhost:8055'
if URL.startswith('***') or not URL.startswith('http'): URL='http://localhost:8055'
TOKEN=env('DIRECTUS_ADMIN_TOKEN')
PID=8

def req(method, path, body=None):
    data=json.dumps(body).encode('utf-8') if body is not None else None
    r=urllib.request.Request(URL+path, data=data, method=method,
        headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'})
    with urllib.request.urlopen(r) as resp:
        t=resp.read().decode('utf-8')
        return json.loads(t) if t.strip() else {}

def get(path, **params):
    qs='&'.join(f"{k}={urllib.parse.quote(str(v))}" for k,v in params.items())
    return req('GET', path+('?'+qs if qs else ''))

log=[]
def L(*a): log.append(' '.join(str(x) for x in a)); print(*a)

# ---- A. Твёрдый переплёт 7БЦ ----
b=get('/items/bindings', **{'filter[name][_contains]':'7БЦ','limit':5}).get('data',[])
if b:
    HB=b[0]['id']; L('binding 7БЦ exists id', HB)
else:
    res=req('POST','/items/bindings',{
        'status':'published','name':'Твёрдый переплёт 7БЦ','setup':2500,'per_copy':120,
        'page_step':2,'min_pages':32,'max_pages':600,
        'price':[{'price':180,'to':50},{'price':150,'to':100},{'price':130,'to':200},
                 {'price':110,'to':300},{'price':95,'to':500},{'price':85,'to':999999}]})
    HB=res['data']['id']; L('binding 7БЦ created id', HB)

# ---- B. PATCH product 8 (hub) ----
intro=('<p>Печатаем <strong>книги на заказ</strong> в Москве — от единичного авторского экземпляра до '
 '<a href="/books/small-batch">малых тиражей</a>. Цифровая печать блока, '
 '<a href="/books/hardcover">твёрдый переплёт (7БЦ)</a> или <a href="/books/softcover">мягкий (КБС)</a>, '
 'форматы А5, А4 и А6. Число полос, бумага обложки и блока — на выбор; точная цена в калькуляторе выше.</p>'
 '<p>Напечатать книгу можно <a href="/books/single-copy">в одном экземпляре</a> (печать по требованию) '
 'или тиражом 50–1000+. Отдельные направления: <a href="/books/children">детские книги</a>, '
 '<a href="/books/leather">подарочные в кожаном переплёте</a> с золочением обреза, '
 '<a href="/books/urgent">срочная печать</a>. Макет принимаем в PDF (CMYK, 300 dpi, вылеты 3–5 мм, шрифты в кривых).</p>'
 '<p>Смежное: <a href="/catalogs">каталоги</a>, <a href="/brochures">брошюры</a>, '
 '<a href="/magazines">журналы</a>, <a href="/photobooks">фотокниги</a>.</p>')
req('PATCH', f'/items/products/{PID}', {
    'strategy':'multipage',
    'h1':'Печать книг',
    'meta_title':'Печать книг на заказ в Москве | Printmos',
    'meta_description':'Печать книг малым тиражом и от 1 экземпляра: твёрдый и мягкий переплёт, форматы А4/А5/А6, цифровая печать. Расчёт цены онлайн, срок от 3 дней.',
    'intro_text':intro,
    'lead_days':3,
})
L('product 8 patched -> multipage + SEO')

# ---- C. product_sizes (A5, A4, A6) ----
exist=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1}).get('data',[])
if exist:
    L('product_sizes exist:', len(exist),'- skip')
else:
    for lab,w,h,pps in [('A5 (148×210)',148,210,4),('A4 (210×297)',210,297,2),('A6 (105×148)',105,148,8)]:
        req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular',
            'width':w,'height':h,'pages_per_sheet':pps})
    L('product_sizes created: A5/A4/A6')

# ---- D. junctions ----
def ensure_junction(coll, prod_field, ref_field, ref_ids):
    cur=get(f'/items/{coll}', **{f'filter[{prod_field}][_eq]':PID,'limit':-1,'fields':ref_field}).get('data',[])
    have={r[ref_field] for r in cur}
    for rid in ref_ids:
        if rid not in have:
            req('POST',f'/items/{coll}',{prod_field:PID, ref_field:rid})
    L(coll,'-> ids', ref_ids, '(had',have,')')

ensure_junction('products_cover_papers','products_id','papers_id',[6,7,11])
ensure_junction('products_inner_papers','products_id','papers_id',[1,2,3])
ensure_junction('products_bindings','products_id','bindings_id',[1,2,3,HB])  # скрепка,пружина,КБС,7БЦ
ensure_junction('products_finishing','product_id','finishing_id',[1,2,3,4])

# ---- E. FAQ ----
FAQ=[
 ('Сколько стоит напечатать книгу?','Цена зависит от тиража, формата, переплёта и числа страниц. Точную стоимость покажет калькулятор выше — он считает по реальным параметрам блока и обложки.'),
 ('Какой минимальный тираж?','Печатаем от 1 экземпляра — цифровая печать рентабельна и на единичных книгах. Малые тиражи (10–100 экз.) — самый частый заказ.'),
 ('Какой переплёт выбрать?','Мягкий (КБС) — универсален для большинства книг; твёрдый (7БЦ) — для подарочных и долговечных изданий; скрепка или пружина — для тонких книг и брошюр.'),
 ('В каком виде присылать макет?','PDF, CMYK, 300 dpi, вылеты 3–5 мм, шрифты в кривых. Отдельно обложка (разворот с корешком) и блок постранично.'),
 ('Сколько занимает печать книги?','От 3 рабочих дней в зависимости от тиража и переплёта. Срочная печать — быстрее, см. «срочная печать книг».'),
]
faq_ids=[]
for q,a in FAQ:
    f=get('/items/faq_items', **{'filter[question][_eq]':q,'limit':1}).get('data',[])
    if f: fid=f[0]['id']
    else: fid=req('POST','/items/faq_items',{'question':q,'answer':a})['data']['id']
    faq_ids.append(fid)
cur=get('/items/products_faq_items', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'faq_items_id'}).get('data',[])
have={r['faq_items_id'] for r in cur}
for fid in faq_ids:
    if fid not in have: req('POST','/items/products_faq_items',{'products_id':PID,'faq_items_id':fid})
L('faq linked:', faq_ids)

# ---- F. promoted_pages (7 кластеров) ----
CLUSTERS=[
 ('small-batch','Печать книг малым тиражом','малым тиражом',{},
   '<p>Печать <strong>книг малым тиражом</strong> — от 1 до сотен экземпляров без переплаты за тираж. Цифровая печать блока, переплёт на выбор. Калькулятор выше открыт для расчёта малого тиража; укажите формат, число полос и переплёт.</p>'),
 ('single-copy','Печать книги в 1 экземпляре','1 экземпляр',{'quantity':1},
   '<p>Напечатаем <strong>книгу в одном экземпляре</strong> — авторский экземпляр, печать по требованию, книга «для себя». Конфигуратор выше посчитан на 1 экземпляр; тираж можно увеличить.</p>'),
 ('hardcover','Книги в твёрдом переплёте','твёрдый переплёт',{'bindingId':HB},
   '<p>Печать <strong>книг в твёрдом переплёте 7БЦ</strong> — прочная обложка из переплётного картона, кашированная бумагой с ламинацией. Подходит для подарочных и долговечных изданий. Конфигуратор открыт на твёрдом переплёте.</p>'),
 ('softcover','Книги в мягком переплёте','мягкий переплёт',{'bindingId':3},
   '<p>Печать <strong>книг в мягком переплёте (КБС)</strong> — клеевое бесшвейное скрепление, обложка из плотной бумаги. Универсальный и экономичный вариант для большинства книг. Конфигуратор открыт на КБС.</p>'),
 ('children','Детские книги','детские',{},
   '<p>Печать <strong>детских книг</strong> — плотная бумага блока, прочный переплёт, насыщенная цветопередача иллюстраций. От 1 экземпляра до тиража. Поможем с подготовкой макета под детское издание.</p>'),
 ('leather','Подарочные книги в кожаном переплёте','подарочные',{'bindingId':HB},
   '<p>Изготовление <strong>подарочных книг в кожаном переплёте</strong> — премиальные материалы, золочение обреза, тиснение на обложке. Эксклюзивные издания и репринты в единичных экземплярах.</p>'),
 ('urgent','Срочная печать книг','срочно',{},
   '<p><strong>Срочная печать книг</strong> в Москве — изготовление в ускоренные сроки без потери качества. Цифровая печать позволяет напечатать книгу быстро даже малым тиражом.</p>'),
]
ICON='tabler:book'
for slug,h1,tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,
             'icon':ICON,'show_as_tile':True,'preset':preset,'intro_text':intro_c}
    if ex:
        req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster updated', slug)
    else:
        req('POST','/items/promoted_pages', payload); L('cluster created', slug)

open(os.path.join(HERE,'_books_directus.log'),'w',encoding='utf-8').write('\n'.join(log))
print('\nDONE')
