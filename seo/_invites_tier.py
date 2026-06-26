# -*- coding: utf-8 -*-
# Tier-разметка приглашений. Голова доминирует; шаблоны/электронные/виза/бренды — EXCLUDE.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_invites_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
BRANDS=['printkov','принтков','принткоф','digital-printing','icolorit','colorit','coral-print','корал принт','tipindigo',
 'printside','giprint','ги принт','pmg','galla-m','copytkks','unopress','унопресс','mospechat','моспечать','фолиопринт',
 'foliprint','bearprint','timer-print','printsreda','tas-izdat','yuppieprint','пройецторпринт','цопы','ипринт','енйоыпринт','smink','сминк']
DIY=['шаблон','скачать','онлайн создать','создать бесплатно','создать картинку','электронн','в электронном','распечат','образц','пустой','пустые','своими рук','макет для']
JUNK=['сургуч','штамп-нож','форд боярд','гарри поттер','оттиски','авито','для иностранца','в россию','из узбекистана','вызов','визы','для визы']
def tier(q,cat):
    s=' '+q+' '
    if cat=='BRANDED' or has(s,*BRANDS): return ('EXCLUDE','бренд-конкурент','')
    if has(s,*JUNK): return ('EXCLUDE','нерелевант (сургуч/виза/набор)','')
    if has(s,*DIY) or cat=='INFO': return ('EXCLUDE','шаблон/электронное/DIY','')
    if has(s,'офсет'): return ('EXCLUDE','capability (офсет)','')
    if has(s,' спб','петербург','санкт'): return ('EXCLUDE','гео не-Москва','')
    if has(s,'каталог','холст','наклейк','вывеск','пакет'): return ('EXCLUDE','другой продукт (бренд-мусор)','')
    if has(s,'свадьб','свадебн','на свадьбу','венчан','банкет'): return ('Tier-1','','/invites/wedding')
    if has(s,'день рожден','др ребен','днем рожден','дня рожден'): return ('Tier-1','','/invites/birthday')
    if has(s,'открыт') and not has(s,'приглаш','пригласит'): return ('STANDALONE','открытки (→/postcards)','')
    return ('Tier-3','','/invites (хаб)')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr in('Tier-1','Tier-2') else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or (flag if tr in('STANDALONE','EXCLUDE') else ''),flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':28s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/invites/wedding','/invites/birthday','/invites/corporate','STANDALONE','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:28s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:28s} n={a['n']:4d} d={a['d']}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_invites_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','invites_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_приглашения_Tier.xlsx', out)
print('\nxlsx written')
