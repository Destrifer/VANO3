# -*- coding: utf-8 -*-
# Благодарности (gratitudes id 30, sheet): хаб БЕЗ кластеров (ядра нет, мало запросов).
# Типовые запросы вплетены в intro/FAQ как Tier-3 вхождения. Идемпотентно.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=30
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

# Вхождения (типовые запросы) вплетены в текст: печать/изготовление благодарностей,
# благодарственные письма на заказ, наградные, с логотипом, на бумаге, А4.
intro=('<p><strong>Печать благодарностей и благодарственных писем</strong> на заказ в Москве. '
 'Изготовление благодарностей для сотрудников, партнёров, волонтёров и участников мероприятий — '
 'наградные и именные, с логотипом организации, печатью и подписью. Плотная дизайнерская бумага, '
 'тиснение и фольгирование; формат А4 или А5, тираж от 1 штуки. Точную цену покажет калькулятор выше.</p>'
 '<p>Благодарственное письмо оформим по вашему тексту: подберём шрифт, рамку и фирменные цвета, '
 'добавим логотип и реквизиты. Печать односторонняя на плотной бумаге 250–300 г/м². '
 'Смежные награды: <a href="/awards">грамоты</a>, <a href="/diplomas">дипломы</a>, '
 '<a href="/certificates">сертификаты</a>. Макет — PDF (CMYK, 300 dpi, вылеты 3 мм), поможем с вёрсткой.</p>')
req('PATCH', f'/items/products/{PID}', {'strategy':'sheet','h1':'Печать благодарностей',
  'meta_title':'Печать благодарностей и благодарственных писем | Printmos',
  'meta_description':'Печать благодарностей и благодарственных писем на заказ в Москве: наградные, именные, с логотипом. Плотная бумага, тиснение, фольга. Формат А4/А5, тираж от 1.',
  'intro_text':intro,'lead_days':2,'preview_kind':'letterhead','double_sided':False})
L('product 30 patched (хаб без кластеров)')

old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
for lab,w,h in [('А4 (210×297)',210,297),('А5 (148×210)',148,210)]:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':'rectangular','width':w,'height':h})
L('sizes А4/А5')

ensure('products_finishing','product_id','finishing_id',[1,2,3,4])
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба linked')

FAQ=[
 ('Чем благодарность отличается от грамоты?','Благодарственное письмо — за конкретный вклад или участие; грамота — за достижение или победу. Печатаем и то, и другое на плотной бумаге с фирменным оформлением.'),
 ('Можно благодарность с логотипом организации?','Да, печатаем наградные и именные благодарности с логотипом, печатью и подписью. Текст и оформление соберём по вашим данным.'),
 ('Какой минимальный тираж?','От 1 штуки. На комплект к мероприятию — скидка; печатаем оперативно.'),
 ('На какой бумаге печатаете?','Плотная мелованная или дизайнерская бумага 250–300 г/м²; по желанию — тиснение и фольгирование.'),
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
print('\nDONE (без кластеров)')
