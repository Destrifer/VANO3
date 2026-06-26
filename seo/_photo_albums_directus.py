# -*- coding: utf-8 -*-
# Фотокниги (46): sheet->multipage. Выпускные альбомы: создать продукт graduation-albums
# (multipage, cat 6) + кластеры. Кросс-ссылки. Рыба-галерея. Идемпотентно.
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
        print('  ERR',e.code,m,p,e.read().decode()[:200]); return {}
def get(p,**kw):
    qs='&'.join(f"{k}={urllib.parse.quote(str(v))}" for k,v in kw.items()); return req('GET',p+('?'+qs if qs else ''))
def L(*a): print(*a)

hb=get('/items/bindings',**{'filter[name][_contains]':'7БЦ','limit':1}).get('data',[]); HB=hb[0]['id'] if hb else 4
L('7БЦ id',HB)

def ensure(coll, pf, rf, pid, ids):
    cur=get(f'/items/{coll}', **{f'filter[{pf}][_eq]':pid,'limit':-1,'fields':rf}).get('data',[])
    have={r[rf] for r in cur}
    for i in ids:
        if i not in have: req('POST',f'/items/{coll}',{pf:pid, rf:i})

def set_sizes(pid, sizes):
    old=get('/items/product_sizes', **{'filter[product][_eq]':pid,'limit':-1,'fields':'id'}).get('data',[])
    for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
    for lab,w,h,pps in sizes:
        req('POST','/items/product_sizes',{'product':pid,'label':lab,'shape':'rectangular','width':w,'height':h,'pages_per_sheet':pps})

def link_fish(pid):
    cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
    if pid not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':pid})

def faq(pid, items):
    ids=[]
    for q,a in items:
        f=get('/items/faq_items', **{'filter[question][_eq]':q,'limit':1}).get('data',[])
        ids.append(f[0]['id'] if f else req('POST','/items/faq_items',{'question':q,'answer':a})['data']['id'])
    cur=get('/items/products_faq_items', **{'filter[products_id][_eq]':pid,'limit':-1,'fields':'faq_items_id'}).get('data',[])
    have={r['faq_items_id'] for r in cur}
    for fid in ids:
        if fid not in have: req('POST','/items/products_faq_items',{'products_id':pid,'faq_items_id':fid})

def clusters(pid, icon, items):
    for slug,h1,tile,is_tile,preset,intro in items:
        ex=get('/items/promoted_pages', **{'filter[product][_eq]':pid,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
        payload={'status':'published','product':pid,'slug':slug,'h1':h1,'tile_label':tile,'icon':icon,'show_as_tile':is_tile,'preset':preset,'intro_text':intro}
        if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('  cluster~',slug)
        else: req('POST','/items/promoted_pages', payload); L('  cluster+',slug)

def full_setup(pid, sizes, bindings):
    ensure('products_papers','products_id','papers_id',pid,list(range(1,17)))
    ensure('products_cover_papers','products_id','papers_id',pid,[6,7,11])
    ensure('products_inner_papers','products_id','papers_id',pid,[1,2,3])
    ensure('products_bindings','products_id','bindings_id',pid,bindings)
    ensure('products_finishing','product_id','finishing_id',pid,[1,2,3,4])
    set_sizes(pid, sizes); link_fish(pid)

# ===================== ФОТОКНИГИ (46) =====================
L('\n=== photobooks (46) -> multipage ===')
pb_intro=('<p>Печатаем <strong>фотокниги на заказ</strong> в Москве — премиальная печать разворотов, '
 'твёрдый, кожаный или мягкий переплёт, форматы от квадрата 20×20 до альбомного 30×20. '
 'Виды: <a href="/photobooks/wedding">свадебная</a>, <a href="/photobooks/baby">детская</a>, '
 '<a href="/photobooks/family">семейная</a>, <a href="/photobooks/premium">премиум</a>. '
 'Соберём дизайн по вашим фото; точная цена в калькуляторе выше.</p>'
 '<p><a href="/photobooks/urgent">Срочно</a> — за 1 день. Делаем печать и дизайн по готовым фото; '
 'фотосъёмку не проводим. Смежное: <a href="/graduation-albums">выпускные альбомы</a>, '
 '<a href="/books">книги</a>.</p>')
req('PATCH','/items/products/46',{'strategy':'multipage','h1':'Печать фотокниг',
  'meta_title':'Печать фотокниг на заказ в Москве | Printmos',
  'meta_description':'Печать фотокниг на заказ: свадебные, детские, семейные, премиум. Твёрдый/кожаный переплёт, форматы 20×20–30×30, дизайн по вашим фото. Срочно за 1 день.',
  'intro_text':pb_intro,'lead_days':3,'preview_kind':None})
full_setup(46,
  [('Квадрат 20×20',200,200,2),('Квадрат 30×30',300,300,2),('Книжная 20×30',200,300,2),('Альбомная 30×20',300,200,2),('А4 (210×297)',210,297,2)],
  [HB,3,2])
faq(46,[
  ('Сколько стоит фотокнига?','Зависит от формата, числа разворотов, переплёта и тиража. Точную цену покажет калькулятор выше.'),
  ('Вы делаете дизайн фотокниги?','Да, соберём вёрстку по вашим фотографиям. Фотосъёмку не проводим — печатаем по готовым фото или макету.'),
  ('Какой переплёт у фотокниги?','Твёрдый (премиальный), кожаный для подарочных и мягкий — на выбор. Развороты на плотной мелованной бумаге.'),
  ('Можно срочно?','Да, срочная печать фотокниги — до 1 дня. См. «срочная печать фотокниг».'),
])
clusters(46,'tabler:photo',[
  ('wedding','Свадебная фотокнига','свадебная',True,{},'<p>Печать <strong>свадебной фотокниги</strong> — премиальные развороты, твёрдый или кожаный переплёт, золочение обреза. Соберём дизайн по вашим свадебным фото.</p>'),
  ('baby','Детская фотокнига','детская',True,{},'<p><strong>Детская фотокнига</strong> — первый год жизни, для мальчика или девочки. Плотные развороты, безопасные материалы, яркая печать.</p>'),
  ('premium','Премиум фотокниги','премиум',True,{'bindingId':HB},'<p><strong>Премиум фотокниги</strong> для фотографов и подарков — кожа/лён, кашированная обложка, золочение обреза, твёрдый переплёт.</p>'),
  ('urgent','Срочная печать фотокниг','срочно',True,{},'<p><strong>Срочная печать фотокниги</strong> — за 1 день в Москве. Цифровая печать разворотов без потери качества.</p>'),
  ('family','Семейная фотокнига','семейная',True,{},'<p><strong>Семейная фотокнига</strong> — история семьи, подарок родителям. Соберём развороты по вашим фото.</p>'),
  ('travel','Фотокнига о путешествии','путешествия',False,{},'<p><strong>Фотокнига о путешествии</strong> — оформим снимки из поездки в книгу. Любой формат и переплёт.</p>'),
  ('corporate','Корпоративная фотокнига','корпоративная',False,{},'<p><strong>Корпоративная фотокнига</strong> — юбилей компании, отчётная книга, презентация. Фирменное оформление.</p>'),
])

# ===================== ВЫПУСКНЫЕ АЛЬБОМЫ (создать) =====================
L('\n=== graduation-albums (create) -> multipage ===')
ex=get('/items/products', **{'filter[slug][_eq]':'graduation-albums','limit':1}).get('data',[])
if ex: GA=ex[0]['id']; L('exists',GA)
else:
    GA=req('POST','/items/products',{'status':'published','name':'Выпускные альбомы','slug':'graduation-albums',
      'category':6,'strategy':'multipage','show_in_menu':True,'icon':'tabler:school','sort':70,'production':'sheet','lead_days':5})['data']['id']
    L('created',GA)
ga_intro=('<p>Печатаем <strong>выпускные альбомы на заказ</strong> в Москве — для '
 '<a href="/graduation-albums/kindergarten">детского сада</a>, '
 '<a href="/graduation-albums/grade-4">4 класса</a> (начальная школа), '
 '<a href="/graduation-albums/grade-9">9</a> и <a href="/graduation-albums/grade-11">11 класса</a>. '
 'Твёрдый переплёт, индивидуальный дизайн обложки и разворотов, виньетки. Соберём по вашим фото; точная цена в калькуляторе.</p>'
 '<p>Делаем печать и дизайн по готовым фотографиям; фотосъёмку класса/группы не проводим. '
 'Смежное: <a href="/photobooks">фотокниги</a>.</p>')
req('PATCH', f'/items/products/{GA}',{'strategy':'multipage','h1':'Выпускные альбомы',
  'meta_title':'Выпускные альбомы на заказ в Москве — печать | Printmos',
  'meta_description':'Печать выпускных альбомов: детский сад, 4, 9, 11 класс. Твёрдый переплёт, индивидуальный дизайн, виньетки. Расчёт цены онлайн.',
  'intro_text':ga_intro,'lead_days':5,'preview_kind':None,'show_in_menu':True,'icon':'tabler:school'})
full_setup(GA,
  [('А4 (210×297)',210,297,2),('Книжная 20×30',200,300,2),('Альбомная 30×20',300,200,2),('Квадрат 20×20',200,200,2)],
  [HB,3])
faq(GA,[
  ('Сколько стоит выпускной альбом?','Зависит от ступени (сад/класс), формата, числа разворотов и тиража класса. Точную цену покажет калькулятор выше.'),
  ('Вы делаете фотосъёмку класса?','Нет, мы печатаем и верстаем альбом по вашим готовым фотографиям. Дизайн обложки и разворотов — сделаем.'),
  ('Какой переплёт у выпускного альбома?','Твёрдый переплёт — прочный и презентабельный; на выбор формат и оформление под ступень.'),
  ('За сколько изготовите?','Ориентировочно от 5 рабочих дней; в сезон закладывайте время заранее.'),
])
clusters(GA,'tabler:school',[
  ('kindergarten','Выпускные альбомы для детского сада','детский сад',True,{},'<p>Печать <strong>выпускных альбомов для детского сада</strong> — мягкие/твёрдые развороты, индивидуальный дизайн, фото группы и каждого ребёнка. Печатаем по готовым фото.</p>'),
  ('grade-4','Выпускные альбомы 4 класс','4 класс',True,{},'<p><strong>Выпускной альбом 4 класс</strong> (начальная школа) — современный дизайн, обложка, виньетка класса. Собираем по вашим фотографиям.</p>'),
  ('grade-9','Выпускные альбомы 9 класс','9 класс',True,{},'<p><strong>Выпускной альбом 9 класс</strong> — стильное оформление, твёрдый переплёт, индивидуальные развороты.</p>'),
  ('grade-11','Выпускные альбомы 11 класс','11 класс',True,{},'<p><strong>Выпускной альбом 11 класс</strong> — премиальный выпускной альбом с дизайном под класс, обложкой и виньеткой.</p>'),
])
print('\nDONE GA id =',GA)
