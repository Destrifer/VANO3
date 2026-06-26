# -*- coding: utf-8 -*-
# Знаки безопасности (safety-signs id 58, sheet): фотолюм. самоклейка + ГОСТ-размеры +
# ламинация + 4 кластера (fire/evacuation/warning/navigation). direction/info/signs -> draft.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=58
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

# фотолюминесцентные материалы (созданы для планов эвакуации)
film=get('/items/papers', **{'filter[name][_eq]':'Фотолюминесцентная плёнка','limit':1}).get('data',[])
paper=get('/items/papers', **{'filter[name][_eq]':'Фотолюминесцентная бумага','limit':1}).get('data',[])
FILM=film[0]['id'] if film else None; PAPER=paper[0]['id'] if paper else None
L('materials', FILM, PAPER)
# заменить бумаги на фотолюминесцентные
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'id,papers_id'}).get('data',[])
keep={FILM,PAPER}
for r in cur:
    if r['papers_id'] not in keep: req('DELETE', f"/items/products_papers/{r['id']}")
have={r['papers_id'] for r in cur}
for pid in (FILM,PAPER):
    if pid and pid not in have: req('POST','/items/products_papers',{'products_id':PID,'papers_id':pid})
L('papers -> фотолюминесцентные')

intro=('<p>Изготовление и печать <strong>знаков безопасности</strong> в Москве по ГОСТ 12.4.026‑2015 — '
 'на <strong>фотолюминесцентной самоклеящейся плёнке</strong> (светятся в темноте) с ламинацией. '
 '<a href="/safety-signs/fire">Пожарной безопасности</a>, '
 '<a href="/safety-signs/evacuation">эвакуационные и указатели выхода</a>, '
 '<a href="/safety-signs/warning">предупреждающие, запрещающие, предписывающие</a>.</p>'
 '<p>Также <a href="/safety-signs/navigation">навигационные указатели‑наклейки</a> для помещений. '
 'Любой стандартный размер, тираж от 1. Смежное: <a href="/evacuation-plans">планы эвакуации</a>. '
 'Макет — по ГОСТ или ваш. (Таблички из ПВХ/металла и уличные конструкции не изготавливаем.)</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','h1':'Знаки безопасности',
  'meta_title':'Знаки безопасности по ГОСТ в Москве — изготовление | Printmos',
  'meta_description':'Изготовление знаков безопасности на фотолюминесцентной плёнке по ГОСТ 12.4.026: пожарные, эвакуационные, предупреждающие. Самоклеящиеся, тираж от 1.',
  'intro_text':intro,'lead_days':2,'preview_kind':'sticker','double_sided':False})
L('product 58 patched')

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('200×200 мм',200,200),('150×150 мм',150,150),('100×100 мм',100,100),('300×300 мм',300,300),('Эвакуационный 300×150',300,150)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes ГОСТ')

ensure=lambda coll,pf,rf,ids: [req('POST',f'/items/{coll}',{pf:PID,rf:i}) for i in ids if i not in {r[rf] for r in get(f'/items/{coll}', **{f'filter[{pf}][_eq]':PID,'limit':-1,'fields':rf}).get('data',[])}]
ensure('products_finishing','product_id','finishing_id',[1,2,3])
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба')

FAQ=[
 ('На каком материале знаки безопасности?','На фотолюминесцентной самоклеящейся плёнке по ГОСТ 12.4.026‑2015 — знаки накапливают свет и светятся в темноте при отключении освещения. Сверху — защитная ламинация.'),
 ('Какие знаки изготавливаете?','Пожарной безопасности (F), эвакуационные (E, указатели выхода), запрещающие (P), предупреждающие (W), предписывающие (M), указательные. По ГОСТ или вашему макету.'),
 ('Какой минимальный тираж?','От 1 штуки; комплект знаков на объект — оперативно.'),
 ('Делаете таблички из ПВХ и металла?','Нет, изготавливаем знаки на самоклеящейся плёнке (в т.ч. фотолюминесцентной). Уличные конструкции, световые короба и металлические таблички — не наш профиль.'),
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
 ('fire','Знаки пожарной безопасности','пожарные',True,{},'<p>Печать <strong>знаков пожарной безопасности</strong> (F) по ГОСТ 12.4.026 — огнетушитель, пожарный кран, телефон, кнопка. На фотолюминесцентной плёнке, светятся в темноте.</p>'),
 ('evacuation','Эвакуационные знаки и указатели выхода','эвакуационные',True,{},'<p><strong>Эвакуационные знаки</strong> (E) — выход, запасной выход, направление к выходу, открывание дверей. Фотолюминесцентные, по ГОСТ. См. также <a href="/evacuation-plans">планы эвакуации</a>.</p>'),
 ('warning','Предупреждающие, запрещающие и предписывающие знаки','предупреждающие',True,{},'<p><strong>Запрещающие (P), предупреждающие (W) и предписывающие (M) знаки</strong> по ГОСТ — «не курить», «опасно», «работать в каске» и др. Для производств и охраны труда.</p>'),
 ('navigation','Навигационные указатели (наклейки)','навигация',True,{},'<p><strong>Навигационные указатели‑наклейки</strong> для помещений — стрелки, номера кабинетов, направления. Самоклеящаяся плёнка, по фирменному стилю. (Уличная навигация и стойки — не изготавливаем.)</p>'),
]
for slug,h1,tile,is_tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':'tabler:shield-check','show_as_tile':is_tile,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug)

# снять таблички ПВХ/металл с публикации (не делаем): direction-signs, info-signs, signs
for pid in (19,33,59):
    req('PATCH', f'/items/products/{pid}', {'status':'draft'}); L('draft product', pid)
print('\nDONE')
