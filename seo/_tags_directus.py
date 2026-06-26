# -*- coding: utf-8 -*-
# Бирки и ярлыки: объединённый хаб /tags (id 63 «Бирки» -> «Бирки и ярлыки»), sheet.
# hang-tags (id 31 «Ярлыки») -> draft (дубль, сворачиваем в хаб).
# Capability: ТОЛЬКО ПЕЧАТЬ (картон/мелованка/ПВХ/самоклейка). Тканое/металл/кожа НЕ делаем.
# Кластеры: clothing/cable/cardboard/luggage/keys. Силикон — Tier-2 блок в intro.
import json, os, urllib.request, urllib.error, urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
def env(k):
    for line in open(os.path.join(ROOT,'.env'),encoding='utf-8'):
        if line.startswith(k+'='): return line.split('=',1)[1].strip().strip('"').strip('\r')
URL='http://localhost:8055'; TOKEN=env('DIRECTUS_ADMIN_TOKEN'); PID=63
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

intro=('<p>Печать и изготовление <strong>бирок и ярлыков на заказ</strong> в Москве — с логотипом, '
 'любой формы и тиража. <a href="/tags/clothing">Бирки для одежды и навесные ярлыки</a>, '
 '<a href="/tags/cardboard">картонные бирки</a>, '
 '<a href="/tags/cable">кабельные бирки‑маркеры</a>, '
 '<a href="/tags/luggage">багажные бирки</a>, '
 '<a href="/tags/keys">бирки для ключей</a>.</p>'
 '<p>Печать на картоне, дизайнерской бумаге, ПВХ и самоклейке; одно- и двусторонние, со сверлением '
 'под шнур/резинку, скруглением углов, ламинацией и фольгой. Делаем также <strong>силиконовые бирки</strong> '
 'с логотипом. Форма — прямоугольная, круглая или фигурная высечка. Тираж от 1. '
 'Смежное: <a href="/labels">этикетки</a>, <a href="/stickers">наклейки</a>. '
 '<em>Тканые (жаккардовые/сатиновые), пришивные, металлические и кожаные бирки не изготавливаем — только печать.</em></p>')
req('PATCH', f'/items/products/{PID}', {'name':'Бирки и ярлыки','strategy':'sheet','production':'sheet',
  'h1':'Бирки и ярлыки на заказ',
  'meta_title':'Бирки и ярлыки на заказ в Москве — печать с логотипом | Printmos',
  'meta_description':'Изготовление бирок и ярлыков на заказ: для одежды, картонные, кабельные, багажные, для ключей. Печать с логотипом, любая форма, тираж от 1. Москва.',
  'intro_text':intro,'lead_days':2,'preview_kind':'sticker','double_sided':True,
  'allow_round':True,'show_in_menu':True})
L('product 63 patched -> Бирки и ярлыки')

# материалы (только печать): мелованные 250/300, картон 2-стор., дизайнерская, ПВХ, самоклейка
WANT_PAPERS=[6,7,11,12,13,16,17]
cur=get('/items/products_papers', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'id,papers_id'}).get('data',[])
have={r['papers_id'] for r in cur}
for pid in WANT_PAPERS:
    if pid not in have: req('POST','/items/products_papers',{'products_id':PID,'papers_id':pid})
L('papers ensured', WANT_PAPERS)

# постпечать: ламинация гл/мат, фольга, биговка, скругление, сверление, еврослот
WANT_FIN=[1,2,4,8,9,11,12]
curf=get('/items/products_finishing', **{'filter[product_id][_eq]':PID,'limit':-1,'fields':'finishing_id'}).get('data',[])
havef={r['finishing_id'] for r in curf}
for fid in WANT_FIN:
    if fid not in havef: req('POST','/items/products_finishing',{'product_id':PID,'finishing_id':fid})
L('finishing ensured', WANT_FIN)

# размеры
old=get('/items/product_sizes', **{'filter[product][_eq]':PID,'limit':-1,'fields':'id'}).get('data',[])
for r in old: req('DELETE', f"/items/product_sizes/{r['id']}")
SIZES=[('30×50 мм','rectangular',30,50),('40×60 мм','rectangular',40,60),('50×80 мм','rectangular',50,80),
       ('60×90 мм','rectangular',60,90),('60×100 мм (багажная)','rectangular',60,100),
       ('25×25 мм (кабельная)','rectangular',25,25),('⌀ 40 мм (круглая)','round',40,40)]
for lab,sh,w,h in SIZES:
    req('POST','/items/product_sizes',{'product':PID,'label':lab,'shape':sh,'width':w,'height':h})
L('sizes set', len(SIZES))

# галерея-рыба
cur=get('/items/works_products', **{'filter[works_id][_eq]':3,'limit':-1,'fields':'products_id'}).get('data',[])
if PID not in {r['products_id'] for r in cur}: req('POST','/items/works_products',{'works_id':3,'products_id':PID}); L('рыба linked')

FAQ=[
 ('Какие бирки и ярлыки вы изготавливаете?','Печатные: для одежды и навесные ярлыки, картонные, кабельные бирки‑маркеры, багажные, для ключей. С логотипом, на картоне, дизайнерской бумаге, ПВХ или самоклейке. Также силиконовые бирки.'),
 ('Делаете тканые (жаккардовые) или металлические бирки?','Нет. Мы выполняем только печать на бумаге/картоне/ПВХ/плёнке и силиконовые бирки. Тканые (жаккардовые, сатиновые), пришивные, металлические и кожаные бирки не изготавливаем.'),
 ('Можно ли сделать отверстие под шнур?','Да, делаем сверление отверстия или еврослот под шнур, ленту или резинку — навесные бирки крепятся к товару, чемодану или ключам.'),
 ('Какой минимальный тираж и форма?','Тираж от 1 штуки. Форма — прямоугольная, круглая или фигурная высечка по вашему контуру. Печать одно- и двусторонняя.'),
 ('Сколько занимает изготовление?','Стандартно 1–2 рабочих дня после согласования макета; срочно — в день обращения. Макет сделаем по вашему логотипу.'),
]
ids=[]
for q,a in FAQ:
    f=get('/items/faq_items', **{'filter[question][_eq]':q,'limit':1}).get('data',[])
    ids.append(f[0]['id'] if f else req('POST','/items/faq_items',{'question':q,'answer':a})['data']['id'])
curf=get('/items/products_faq_items', **{'filter[products_id][_eq]':PID,'limit':-1,'fields':'faq_items_id'}).get('data',[])
havef={r['faq_items_id'] for r in curf}
for fid in ids:
    if fid not in havef: req('POST','/items/products_faq_items',{'products_id':PID,'faq_items_id':fid})
L('faq ensured')

CLUSTERS=[
 ('clothing','Бирки для одежды и навесные ярлыки','для одежды','tabler:hanger',
  '<p>Печать <strong>бирок для одежды и навесных ярлыков</strong> с логотипом — на картоне и дизайнерской бумаге, со сверлением под шнур. Именные, для брендов и маркетплейсов, ювелирные. Также для носков и аксессуаров.</p>'),
 ('cable','Кабельные бирки‑маркеры','кабельные','tabler:plug',
  '<p><strong>Кабельные бирки‑маркеры</strong> для маркировки кабелей и проводов: У‑134 (квадрат 55×55), У‑136 (треугольная), маркировочные. Печать на ПВХ/самоклейке, влагостойкие.</p>'),
 ('cardboard','Картонные бирки','картонные','tabler:rectangle',
  '<p><strong>Картонные и бумажные бирки</strong> на заказ — плотный картон 300 г/м² или дизайнерская бумага, с логотипом. Навесные и вкладыши, любая форма и высечка.</p>'),
 ('luggage','Багажные бирки','багажные','tabler:luggage',
  '<p><strong>Багажные бирки</strong> для чемодана и багажа — с логотипом, адресные, влагостойкие на ПВХ. С отверстием и петлёй для крепления.</p>'),
 ('keys','Бирки для ключей','для ключей','tabler:key',
  '<p><strong>Бирки для ключей</strong> — пластиковые с бумажной вставкой, картонные, номерные. Для офиса, гостиниц, автопарка. С отверстием под кольцо.</p>'),
]
for slug,h1,tile,icon,intro_c in CLUSTERS:
    ex=get('/items/promoted_pages', **{'filter[product][_eq]':PID,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    payload={'status':'published','product':PID,'slug':slug,'h1':h1,'tile_label':tile,'icon':icon,'show_as_tile':True,'preset':{},'intro_text':intro_c}
    if ex: req('PATCH', f"/items/promoted_pages/{ex[0]['id']}", payload); L('cluster~',slug)
    else: req('POST','/items/promoted_pages', payload); L('cluster+',slug)

# hang-tags (id 31, дубль «Ярлыки») -> draft
req('PATCH', '/items/products/31', {'status':'draft'}); L('hang-tags(31) -> draft')
print('\nDONE')
