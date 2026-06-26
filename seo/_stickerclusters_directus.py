# -*- coding: utf-8 -*-
# Штрихкоды/упаковка/оборудование = виды этикеток/наклеек -> КЛАСТЕРЫ существующих хабов.
#   barcode    -> /labels/barcode   (этикетки со штрихкодом, ~3.2k)
#   packaging  -> /stickers/packaging (наклейки на упаковку/коробки, ~3-4k)
#   equipment  -> /stickers/equipment (наклейки на оборудование/шильдики, ~340)
# Пустые продукты-дубли barcodes(5)/barcode-stickers(4)/packaging-stickers(44)/equipment-stickers(23) -> draft.
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

# (product_id, slug, h1, tile_label, icon, intro)
CLUSTERS=[
 (35,'barcode','Этикетки со штрихкодом','со штрихкодом','tabler:barcode',
  '<p>Печать <strong>этикеток и наклеек со штрихкодом</strong> на заказ — EAN-13, Code-128 и др. На самоклеящейся бумаге и плёнке, для маркировки товаров, склада и маркетплейсов (Wildberries, Ozon). Чёткий считываемый код, тираж от 1 листа. См. также <a href="/stickers/qr">наклейки с QR-кодом</a>.</p>'),
 (62,'packaging','Наклейки на упаковку и коробки','на упаковку','tabler:package',
  '<p>Печать <strong>наклеек на упаковку и коробки</strong> с логотипом — брендированные, бумажные и плёночные, для товаров, посылок и магазинов. Информационные и маркировочные («хрупкое», состав, адрес). Любая форма, тираж от 1.</p>'),
 (62,'equipment','Наклейки на оборудование и шильдики','на оборудование','tabler:settings',
  '<p>Печать <strong>наклеек на оборудование</strong> и <strong>шильдиков</strong> — износостойкие технические и промышленные наклейки на станки, приборы и технику. Стойкие к истиранию плёнки, маркировка и таблички-наклейки. По вашему макету, тираж от 1.</p>'),
]
for pid,slug,h1,tile,icon,intro in CLUSTERS:
    exc=get('/items/promoted_pages', **{'filter[product][_eq]':pid,'filter[slug][_eq]':slug,'limit':1}).get('data',[])
    pl={'status':'published','product':pid,'slug':slug,'h1':h1,'tile_label':tile,'icon':icon,'show_as_tile':True,'preset':{},'intro_text':intro}
    if exc: req('PATCH', f"/items/promoted_pages/{exc[0]['id']}", pl); L('cluster~', f'product{pid}/{slug}')
    else: req('POST','/items/promoted_pages', pl); L('cluster+', f'product{pid}/{slug}')

# пустые продукты-дубли -> draft
for pid,nm in [(5,'barcodes'),(4,'barcode-stickers'),(44,'packaging-stickers'),(23,'equipment-stickers')]:
    req('PATCH', f'/items/products/{pid}', {'status':'draft'}); L('draft', pid, nm)
print('\nDONE sticker/label clusters')
