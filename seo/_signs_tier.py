# -*- coding: utf-8 -*-
# Tier-разметка знаков/указателей. Хаб /safety-signs (фотолюминесцентные самоклеящ. знаки).
# Жёсткий EXCLUDE: честный знак, ПДД, курсоры/си/напряжение, металл/световые/уличные/стойки,
# дорожные знаки, картинки, ГОСТ-инфо, отказные письма. Capability: НЕ делаем ПВХ/металл/LED.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_signs_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
HONEST=['честный знак','честного знака','чз лк','чз войти','маркировк','личный кабинет']
CURSOR=['курсор','указатель мыши','указатели мыши','для пк','для мышк','виндовс','windows','мод на курсор','указатели в си',
 'указатели в с','указатель в си','указатели с++','указатели с+','зачем нужны указатели','указатели в программ']
VOLT=['напряжени','до 1000','вольт','двухполюсн','индикатор нал']
PDD=['поворотник','поворота','поворот','перекрест','обгон','кольцо','круговое движение','круговом','разворот',
 'эксплуатация транспортн','водитель','полос','траектори','дорожн знак','дорожн указат','дорожного движения','пдд',
 'знаки дорожн','въезд','выполнять обгон','опереж','встречн','подавать сигнал']
PICS=['картинк','пнг','png','без фона','для презентац','стрелка картинка','значок','иконк','раскрас','clipart',
 'фото стрелк','стрелочк','что они обознач','что обознач','что они означ']
DOCS=['отказное письмо','отказное','декларац','сертификат соответств','заявка на отказ']
INFO=['гост 12.4.026','12.4.026','какие факторы','какой формы','в каких случаях','в какой момент','окрашивают',
 'правила','что такое','нормативн','требовани','выбрать правильный','ответ','в какие цвета','переносные знаки',
 'устанавлива','на производстве правила']
# Capability: НЕ делаем — МАТЕРИАЛ/конструкция (исключаем ДО позитивов)
CAP_MAT=['световой','световые','светодиодн','led','уличн','дорожн','металл','композит','столб','стойк','напольн',
 'на ножке','пвх','алюмин','объемные буквы','объёмные буквы','лайтбокс','короб','тулуп','неон','акрил']
# Capability: НЕ делаем — ФОРМАТ (таблички/вывески/аренда — после позитивов, чтобы «табличка эвакуац» ушла в кластер)
CAP_FMT=['табличк','вывеск','аренда','прокат']
BRANDS=['авито','озон','вайлдберр','wildberr','aliexpress','али','леруа']
GEO=['спб','петербург','санкт','казан','новосиб','краснодар','екатеринб','уфа','нижн']
def tier(q,cat):
    s=' '+q+' '
    if has(s,*HONEST): return ('EXCLUDE','честный знак (маркировка)','')
    if has(s,*CURSOR): return ('EXCLUDE','курсор/указатель ПК/Си','')
    if has(s,*VOLT): return ('EXCLUDE','указатель напряжения (прибор)','')
    if has(s,*PDD): return ('EXCLUDE','ПДД/вождение','')
    if has(s,*PICS): return ('EXCLUDE','картинки/клипарт','')
    if has(s,*DOCS): return ('EXCLUDE','отказное/сертификация','')
    if has(s,*CAP_MAT): return ('EXCLUDE','capability (металл/световые/уличные/стойки)','')
    if cat=='BRANDED' or has(s,*BRANDS): return ('EXCLUDE','бренд/маркетплейс','')
    if has(s,*GEO): return ('EXCLUDE','гео не-Москва','')
    if has(s,*INFO) or cat=='INFO': return ('EXCLUDE','инфо/ГОСТ-регламент','')
    # целевые кластеры (фотолюминесцентные самоклеящиеся знаки)
    if has(s,'пожарн'): return ('Tier-1','','/safety-signs/fire')
    if has(s,'эвакуац','аварийн',' выход','выхода'): return ('Tier-1','','/safety-signs/evacuation')
    if has(s,'предупрежд','запрещающ','предписыв','охране труда','охрана труда','производств'): return ('Tier-1','','/safety-signs/warning')
    if has(s,'навигац'): return ('Tier-1','','/safety-signs/navigation')
    # формат-capability (таблички/вывески/аренда) — после позитивов
    if has(s,*CAP_FMT): return ('EXCLUDE','capability (таблички/вывески/аренда)','')
    # знак безопасности head -> хаб; прочие generic указатель/знак -> EXCLUDE
    if has(s,'безопасн') or (has(s,'знак') and has(s,'изготовлен','производств','заказ','печать','купить')):
        return ('Tier-3','','/safety-signs (хаб)')
    return ('EXCLUDE','generic указатель/знак (ambiguous/металл)','')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr=='Tier-1' else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':34s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/safety-signs/fire','/safety-signs/evacuation','/safety-signs/warning','/safety-signs/navigation','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:34s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:34s} n={a['n']:4d} d={a['d']}")
lines.append("\n-- топ целевых (Tier-3 хаб) --")
for q,d,tr,page,flag,cat in sorted([o for o in out if o[2]=='Tier-3'],key=lambda x:-x[1])[:12]:
    lines.append(f"  {d:5d}  {q}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_signs_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','signs_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['Запрос','Спрос','Tier','Целевая страница','Флаг','ИсхКатегория'])
    for q,d,tr,page,flag,cat in sorted(out,key=lambda x:-x[1]): w.writerow([q,d,tr,page,flag,cat])
def xlsx(path, rows):
    def esc(x): return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')
    def cell(v):
        if isinstance(v,int) or (isinstance(v,str) and v.isdigit()): return f'<c t="n"><v>{int(v)}</v></c>'
        return f'<c t="inlineStr"><is><t xml:space="preserve">{esc(v)}</t></is></c>'
    data=[['Запрос','Спрос','Tier','Целевая страница','Флаг']]+[[q,d,tr,page,flag] for q,d,tr,page,flag,cat in sorted(rows,key=lambda x:-x[1])]
    rx=[f'<row r="{i}">'+''.join(cell(v) for v in row)+'</row>' for i,row in enumerate(data,1)]
    sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(rx)+'</sheetData></worksheet>'
    wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tier" sheetId="1" r:id="rId1"/></sheets></workbook>'
    wbrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
    rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',ct); z.writestr('_rels/.rels',rels); z.writestr('xl/workbook.xml',wb)
        z.writestr('xl/_rels/workbook.xml.rels',wbrels); z.writestr('xl/worksheets/sheet1.xml',sheet)
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_знаки-указатели_Tier.xlsx', out)
print('\nxlsx written')
