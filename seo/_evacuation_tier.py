# -*- coding: utf-8 -*-
# Tier-разметка планов эвакуации. Хаб /evacuation-plans (sheet, фотолюминесцентная плёнка).
# EXCLUDE: ГОСТ/требования/ППР/инфо, DIY (нарисовать/онлайн), сигнализация, бренды, гео, мемы.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_evacuation_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
INFO=['что не указывается','что указывается','требовани','гост','12.2.143','34428','ппр','1479','782н',
 'при каком количестве','где размещать','где вешать','где должен','на какой высоте','нормативн','правила противопожарн',
 'постановление','следует разрабатывать','состоять из','состоят из','кто делает','кто должен','кто имеет право',
 'кто в организации','кто может','какие организации','какие объекты','в отношении каких','в каких здани','для чего нужен',
 'это требования','действующ','статус на','тест','ответ на','мероприятий по эвакуации','спасению работ','на высоте',
 'когда можно не','для каких помещ','необходимо размещать','необходим при','противопожарный режим']
DIY=['нарисовать','начертить','онлайн','в какой проге',' в проге','создать онлайн','шаблон','скачать','образец',
 'в чем нарисовать','нарисую','своими рук','как составить','как организовать','как сделать план']
SIGNAL=['сигнализаци','соуэ',' спс ','спс и',' апс','оповещен']
BRANDS=['tehpb','фэс','фаер акс','профи план','легис-тех','легис тех','net-print']
GEO=['уфа','уфе','спб','петербург','санкт','казан','новосиб','краснодар','екатеринб']
MEME=['ааа','мем','аааа','по кругу','какие планы на эвакуацию','а у вас какие']
def tier(q,cat):
    s=' '+q+' '
    if has(s,*MEME): return ('EXCLUDE','мем','')
    if has(s,*SIGNAL): return ('EXCLUDE','пож.сигнализация (другой продукт)','')
    if cat=='BRANDED' or has(s,*BRANDS): return ('EXCLUDE','бренд-конкурент','')
    if has(s,*GEO): return ('EXCLUDE','гео не-Москва','')
    if has(s,*DIY): return ('EXCLUDE','DIY/нарисовать/шаблон','')
    if has(s,*INFO) or cat=='INFO': return ('EXCLUDE','инфо/ГОСТ/регламент','')
    # покупка материала (плёнка/бумага сами по себе) — ритейл
    if (has(s,'фотолюминесцентная пленка','фотолюминесцентная бумага','люминесцентная пленка','люминесцентная бумага') and has(s,'купить')) or (has(s,'пленка') and not has(s,'план')):
        return ('EXCLUDE','ритейл материала (плёнка)','')
    # эвакуационные указатели/знаки -> знаки безопасности
    if has(s,'указател','эвакуационные знак','знаки эвакуац','световой указат'): return ('STANDALONE','эвакуац. указатели/знаки (→safety-signs)','')
    # разработка (проектирование по ГОСТ) -> кластер
    if has(s,'разработ','составлени','составить','проектиров','спроектир'): return ('Tier-1','','/evacuation-plans/development')
    return ('Tier-3','','/evacuation-plans (хаб)')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr=='Tier-1' else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':36s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/evacuation-plans/development','STANDALONE','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:36s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:36s} n={a['n']:4d} d={a['d']}")
lines.append("\n-- топ целевых (Tier-3 хаб) --")
for q,d,tr,page,flag,cat in sorted([o for o in out if o[2]=='Tier-3'],key=lambda x:-x[1])[:12]:
    lines.append(f"  {d:5d}  {q}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_evacuation_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','evacuation_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_планы-эвакуации_Tier.xlsx', out)
print('\nxlsx written')
