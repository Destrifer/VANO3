# -*- coding: utf-8 -*-
# Сертификаты (certificates id 15, sheet): SEO + размеры + финиши + рыба
# + gift(Tier-1) + relief(Tier-2). Кросс-ссылки. Идемпотентно.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=15
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

intro=('<p>Печатаем <strong>сертификаты на заказ</strong> в Москве — '
 '<a href="/certificates/gift">подарочные</a>, именные, сертификаты качества, наградные. '
 'Плотная дизайнерская бумага, тиснение и фольга, нумерация. Формат А4/А5, тираж от 1; точная цена в калькуляторе.</p>'
 '<p>Премиальная отделка — <a href="/certificates/relief">рельефная печать и тиснение</a>. '
 'Смежное: <a href="/awards">грамоты</a>, <a href="/diplomas">дипломы</a>, '
 '<a href="/gratitudes">благодарности</a>. Макет — PDF (CMYK, 300 dpi, вылеты 3 мм).</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','h1':'Печать сертификатов',
  'meta_title':'Печать сертификатов на заказ в Москве | Printmos',
  'meta_description':'Печать сертификатов: подарочные, именные, качества. Плотная бумага, тиснение, фольга, нумерация. Формат А4/А5, тираж от 1. Расчёт онлайн.',
  'intro_text':intro,'lead_days':2,'preview_kind':'letterhead','double_sided':False})
L('product 15 patched (sheet + SEO)')

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('А4 (210×297)',210,297),('А5 (148×210)',148,210)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes А4/А5')

ensure('products_finishing','product_id','finishing_id',[1,2,3,4])
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба linked')

FAQ=[
 ('Что входит в подарочный сертификат?','Печатаем подарочный сертификат на плотной бумаге, по желанию — с конвертом, именной надписью, тиснением и номиналом. Дизайн соберём по вашим данным.'),
 ('Какой минимальный тираж сертификатов?','От 1 штуки; на тираж — скидка. Возможна сквозная нумерация.'),
 ('Какая бумага и отделка?','Плотная мелованная или дизайнерская бумага; тиснение, фольгирование, рельефная (конгревная) печать.'),
 ('В каком виде присылать макет?','PDF, CMYK, 300 dpi, вылеты 3 мм. Поможем с вёрсткой по вашему тексту и логотипу.'),
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
 ('gift','Подарочные сертификаты','подарочные',True,{},'<p>Печать <strong>подарочных сертификатов</strong> на заказ — для салонов, магазинов и услуг. Плотная бумага, именная надпись, номинал, конверт, тиснение. Тираж от 1 штуки.</p>'),
 ('relief','Сертификаты с тиснением и рельефной печатью','тиснение/рельеф',False,{},'<p><strong>Рельефная (конгревная) печать и тиснение</strong> на сертификатах — объёмный логотип, фольга, премиальный вид. Также прозрачные и пластиковые сертификаты.</p>'),
]
for slug,h1,tile,is_tile,preset,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':'tabler:certificate','show_as_tile':is_tile,'preset':preset,'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug)
print('\nDONE')
