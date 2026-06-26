# -*- coding: utf-8 -*-
# Тетради (copybooks id 16): sheet->multipage (зеркало блокнотов) + 2 кластера. Идемпотентно.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=16
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

intro=('<p>Печатаем <strong>тетради на заказ</strong> в Москве — фирменные, '
 '<a href="/copybooks/logo">с логотипом и принтом</a>, с индивидуальной обложкой. '
 'Переплёт на скобе, <a href="/copybooks/rings">на кольцах</a> или КБС; форматы А4/А5/А6. '
 'Число листов, бумага блока (клетка/линейка) и обложки — на выбор; точная цена в калькуляторе.</p>'
 '<p>Тираж от единиц до оптовых партий. Макет — PDF (CMYK, 300 dpi, вылеты 3 мм). '
 'Смежное: <a href="/notebooks">блокноты</a>, <a href="/books">книги</a>.</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'multipage','h1':'Тетради на заказ',
  'meta_title':'Тетради на заказ в Москве — печать с логотипом | Printmos',
  'meta_description':'Печать тетрадей на заказ: фирменные, с логотипом и принтом, на кольцах или скобе, форматы А4/А5/А6. Тираж от 1, опт. Расчёт цены онлайн.',
  'intro_text':intro,'lead_days':3,'preview_kind':None})
L('product 16 -> multipage + SEO')

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h,pps in [('А5 (148×210)',148,210,4),('А4 (210×297)',210,297,2),('А6 (105×148)',105,148,8)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h,'pages_per_sheet':pps})
L('sizes А5/А4/А6')

ensure('products_papers','products_id','papers_id',list(range(1,17)))
ensure('products_cover_papers','products_id','papers_id',[6,7,11])
ensure('products_inner_papers','products_id','papers_id',[1,2,3])
ensure('products_bindings','products_id','bindings_id',[1,2,3])  # скоба/скрепка, пружина(кольца), КБС
ensure('products_finishing','product_id','finishing_id',[1,2,3,4])
L('junctions set')

# рыба
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба linked')

FAQ=[
 ('Какой минимальный тираж тетрадей?','Печатаем от единичных экземпляров; для фирменных тетрадей выгодны партии. Опт — по запросу.'),
 ('Можно тетрадь с логотипом и своим дизайном?','Да, печатаем обложку с логотипом, принтом или полным индивидуальным дизайном. Блок — в клетку, линейку или чистый.'),
 ('Какой переплёт у тетради?','На скобе (скрепке) для тонких, на кольцах/пружине или КБС — для толстых. Подбирается по числу листов.'),
 ('В каком виде присылать макет?','PDF, CMYK, 300 dpi, вылеты 3 мм. Поможем с вёрсткой обложки.'),
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
 ('logo','Тетради с логотипом','с логотипом',{},'<p>Печать <strong>тетрадей с логотипом</strong> — фирменные тетради с принтом или индивидуальным дизайном обложки. Для школ, вузов, промо и корпоративных подарков. Тираж от единиц.</p>'),
 ('rings','Тетради на кольцах','на кольцах',{'bindingId':2},'<p>Печать <strong>тетрадей на кольцах</strong> — удобное кольцевое скрепление, страницы раскрываются на 360°. Формат А5/А4, обложка с логотипом по желанию.</p>'),
]
for slug,h1,tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':'tabler:notebook','show_as_tile':True,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug)
print('\nDONE')
