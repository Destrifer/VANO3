# -*- coding: utf-8 -*-
# Грамоты (awards id1) + Дипломы (diplomas id18), sheet: SEO + размеры + финиши + рыба
# + кластер /diplomas/thesis. Кросс-ссылки. Идемпотентно.
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
    qs='&'.join(f"{k}={urllib.parse.quote(str(v))}" for k,v in kw.items()); return req('GET',p+('?'+qs if qs else ''))
def L(*a): print(*a)
def ensure(coll,pf,rf,pid,ids):
    cur=get(f'/items/{coll}', **{f'filter[{pf}][_eq]':pid,'limit':-1,'fields':rf}).get('data',[])
    have={r[rf] for r in cur}
    for i in ids:
        if i not in have: req('POST',f'/items/{coll}',{pf:pid, rf:i})
def setup(pid, h1, mt, md, intro, faq):
    req('PATCH', f'/items/products/{pid}', {'strategy':'sheet','h1':h1,'meta_title':mt,'meta_description':md,
        'intro_text':intro,'lead_days':2,'preview_kind':'letterhead','double_sided':False})
    old=get('/items/product_sizes', **{'filter[product][_eq]':pid,'limit':-1,'fields':'id'}).get('data',[])
    for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
    for lab,w,h in [('А4 (210×297)',210,297),('А5 (148×210)',148,210)]:
        req('POST','/items/product_sizes',{'product':pid,'label':lab,'shape':'rectangular','width':w,'height':h})
    ensure('products_finishing','product_id','finishing_id',pid,[1,2,3,4])
    cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
    if pid not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':pid})
    ids=[]
    for q,a in faq:
        f=get('/items/faq_items', **{'filter[question][_eq]':q,'limit':1}).get('data',[])
        ids.append(f[0]['id'] if f else req('POST','/items/faq_items',{'question':q,'answer':a})['data']['id'])
    curf=get('/items/products_faq_items', **{'filter[products_id][_eq]':pid,'limit':-1,'fields':'faq_items_id'}).get('data',[])
    havef={r['faq_items_id'] for r in curf}
    for fid in ids:
        if fid not in havef: req('POST','/items/products_faq_items',{'products_id':pid,'faq_items_id':fid})
    L(f'product {pid} done')

# ---- ГРАМОТЫ (awards id1) ----
aw_intro=('<p>Печатаем <strong>грамоты на заказ</strong> в Москве — почётные, наградные, именные, '
 'с логотипом организации. Плотная дизайнерская бумага, фольгирование и тиснение, печать с печатью и подписью. '
 'Формат А4/А5, тираж от 1; точная цена в калькуляторе.</p>'
 '<p>Смежное: <a href="/diplomas">дипломы</a>, <a href="/certificates">сертификаты</a>, '
 '<a href="/gratitudes">благодарности</a>. Макет — PDF (CMYK, 300 dpi, вылеты 3 мм).</p>')
setup(1,'Печать грамот','Печать грамот на заказ в Москве | Printmos',
 'Печать грамот: почётные, наградные, именные, с логотипом. Плотная бумага, фольга, тиснение. Формат А4/А5, тираж от 1. Расчёт онлайн.',
 aw_intro,[
  ('На какой бумаге печатаете грамоты?','Плотная мелованная или дизайнерская бумага 200–300 г/м²; по желанию — фольгирование и тиснение.'),
  ('Можно грамоту с логотипом и текстом?','Да, печатаем грамоты с логотипом организации, индивидуальным текстом, печатью и подписью. Поможем с вёрсткой.'),
  ('Какой минимальный тираж?','От 1 штуки. На тираж — скидка; наградные комплекты к мероприятиям печатаем оперативно.'),
 ])

# ---- ДИПЛОМЫ (diplomas id18) ----
dp_intro=('<p>Печатаем <strong>дипломы на заказ</strong> в Москве — наградные и именные, для конкурсов, '
 'спорта и мероприятий, с логотипом. Плотная бумага, фольга, нумерация. Формат А4/А5, тираж от 1.</p>'
 '<p>Отдельно — <a href="/diplomas/thesis">печать и переплёт дипломной работы (ВКР)</a> в твёрдом переплёте. '
 'Смежное: <a href="/awards">грамоты</a>, <a href="/certificates">сертификаты</a>. Макет — PDF (CMYK, 300 dpi).</p>')
setup(18,'Печать дипломов','Печать дипломов на заказ в Москве | Printmos',
 'Печать дипломов: наградные, именные, для конкурсов и спорта, с логотипом. Плюс переплёт дипломной работы (ВКР). Формат А4/А5. Расчёт онлайн.',
 dp_intro,[
  ('Печатаете наградные дипломы для конкурсов?','Да, печатаем наградные и именные дипломы для конкурсов, спорта и мероприятий — с логотипом, нумерацией, на плотной бумаге.'),
  ('Делаете переплёт дипломной работы?','Печать и твёрдый переплёт дипломной работы (ВКР) — см. страницу «диплом в твёрдом переплёте». Прошивка, брошюровка, тиснение на обложке.'),
  ('Какой минимальный тираж?','От 1 штуки. На тираж — скидка.'),
 ])

# кластер thesis на /diplomas
ex=get('/items/promoted_pages', **{'filter[product][_eq]':18,'filter[slug][_eq]':'thesis','limit':1}).get('data',[])
payload={'status':'published','product':18,'slug':'thesis','h1':'Диплом в твёрдом переплёте (переплёт дипломной работы)',
 'tile_label':'Переплёт ВКР','icon':'tabler:book','show_as_tile':True,'preset':{},
 'intro_text':('<p>Печать и <strong>переплёт дипломной работы (ВКР)</strong> в твёрдый переплёт — '
  'прошивка, брошюровка, тиснение надписи на обложке. Срочно, от 1 экземпляра. '
  'Многостраничный блок печатаем и сшиваем; см. также <a href="/books">книги в твёрдом переплёте</a>.</p>')}
if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~ thesis')
else: req('POST','/items/promoted_pages', payload); L('cluster+ thesis')
print('\nDONE')
