# -*- coding: utf-8 -*-
# Перевод notebooks(42) и planners(48): fixed -> multipage (зеркало книг/журналов).
# Печать на заказ: формат × переплёт × число полос × бумага. Идемпотентно.
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
        print('  ERR',e.code,p,e.read().decode()[:160]); return {}
def get(p,**kw):
    qs='&'.join(f"{k}={urllib.parse.quote(str(v))}" for k,v in kw.items())
    return req('GET',p+('?'+qs if qs else ''))
def L(*a): print(*a)

# 7БЦ binding id
hb=get('/items/bindings',**{'filter[name][_contains]':'7БЦ','limit':1}).get('data',[])
HB=hb[0]['id'] if hb else 4
L('7БЦ id',HB)

def ensure_junction(coll, pf, rf, pid, ids):
    cur=get(f'/items/{coll}', **{f'filter[{pf}][_eq]':pid,'limit':-1,'fields':rf}).get('data',[])
    have={r[rf] for r in cur}
    for i in ids:
        if i not in have: req('POST',f'/items/{coll}',{pf:pid, rf:i})

def setup(pid, h1, meta_title, meta_desc, intro, sizes, bindings, clusters):
    L(f'\n=== product {pid} -> multipage ===')
    # 1) strategy + SEO + очистить fixed_price
    req('PATCH', f'/items/products/{pid}', {
        'strategy':'multipage','h1':h1,'meta_title':meta_title,'meta_description':meta_desc,
        'intro_text':intro,'fixed_price':[]})
    L('  patched strategy/SEO, cleared fixed_price')
    # 2) пересоздать product_sizes (удалить старые «типы», добавить геометрические)
    old=get('/items/product_sizes', **{'filter[product][_eq]':pid,'limit':-1,'fields':'id'}).get('data',[])
    for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
    for lab,w,h,pps in sizes: req('POST','/items/product_sizes',{'product':pid,'label':lab,'shape':'rectangular','width':w,'height':h,'pages_per_sheet':pps})
    L('  sizes ->',[s[0] for s in sizes])
    # 3) бумаги (general 1..16 + cover + inner), переплёты, финиши
    ensure_junction('products_papers','products_id','papers_id',pid,list(range(1,17)))
    ensure_junction('products_cover_papers','products_id','papers_id',pid,[6,7,11])
    ensure_junction('products_inner_papers','products_id','papers_id',pid,[1,2,3])
    ensure_junction('products_bindings','products_id','bindings_id',pid,bindings)
    ensure_junction('products_finishing','product_id','finishing_id',pid,[1,2,3,4])
    L('  junctions: papers16, cover[6,7,11], inner[1,2,3], bindings',bindings,'fin[1,2,3,4]')
    # 4) пресеты кластеров
    for slug,preset,intro_c in clusters:
        ex=get('/items/promoted_pages', **{'filter[product][_eq]':pid,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
        if not ex: L('  cluster MISSING',slug); continue
        payload={'preset':preset}
        if intro_c: payload['intro_text']=intro_c
        req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('  cluster',slug,'preset',preset)

# ---------- NOTEBOOKS (42) ----------
nb_intro=('<p>Печатаем <strong>блокноты на заказ</strong> в Москве — фирменные, именные и промо. '
 'Переплёт <a href="/notebooks/spiral">на пружине</a>, на скрепке или склейке (КБС); форматы А4, А5, А6. '
 'Число листов, бумага блока и обложки — на выбор; точная цена в калькуляторе выше.</p>'
 '<p>Нанесём <a href="/notebooks/logo">логотип</a> на обложку, тиснение или фольгу. Тираж от единиц до сотен. '
 'Макет — PDF (CMYK, 300 dpi, вылеты 3 мм). Смежное: <a href="/planners">ежедневники</a>, '
 '<a href="/books">книги</a>.</p>')
setup(42,'Печать блокнотов','Печать блокнотов на заказ в Москве | Printmos',
 'Блокноты на заказ: на пружине, скрепке или КБС, форматы А4/А5/А6, печать логотипа. Расчёт цены онлайн, тираж от 1.',
 nb_intro,
 [('А5 (148×210)',148,210,4),('А6 (105×148)',105,148,8),('А4 (210×297)',210,297,2)],
 [2,1,3],  # пружина, скрепка, КБС
 [('logo',{},None),('spiral',{'bindingId':2},None)])

# ---------- PLANNERS (48) ----------
pl_intro=('<p>Изготавливаем <strong>ежедневники и планинги на заказ</strong> в Москве — фирменные и именные. '
 '<a href="/planners/dated">Датированные</a> и недатированные, твёрдый, интегральный или мягкий (КБС) переплёт; '
 'форматы А5, А6 и планинг А4. Число страниц, бумага блока и обложки — на выбор; точная цена в калькуляторе выше.</p>'
 '<p>Брендирование обложки: <a href="/planners/logo">логотип</a>, <a href="/planners/engraving">гравировка</a>, '
 'тиснение фольгой, <a href="/planners/leather">кожзам/балакрон</a>. Макет — PDF (CMYK, 300 dpi, вылеты 3 мм). '
 'Смежное: <a href="/notebooks">блокноты</a>, <a href="/books">книги</a>.</p>')
setup(48,'Ежедневники на заказ','Ежедневники на заказ в Москве — печать | Printmos',
 'Ежедневники и планинги на заказ: датированные/недатированные, твёрдый и мягкий переплёт, логотип, гравировка. Расчёт онлайн.',
 pl_intro,
 [('А5 (148×210)',148,210,4),('А6 (105×148)',105,148,8),('Планинг А4 (297×210)',297,210,2)],
 [HB,3,2],  # твёрдый 7БЦ, КБС, пружина
 [('logo',{},None),('engraving',{},None),('leather',{'bindingId':HB},None),('dated',{},None)])

print('\nDONE')
