# -*- coding: utf-8 -*-
# Tier-разметка тетрадей (Шаг 4.5). Маленькое чистое ядро (48), B2B на заказ.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_copybooks_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']; s=' '+q+' '
    page='/copybooks (хаб)'; tier='Tier-3'; flag=''
    if cat=='BRANDED' or has(s,' pmg','pmg '): tier,flag,page='EXCLUDE','бренд-конкурент',''
    elif has(s,'26 июля 1976','сталелитейн','гидроузл') or cat=='NONTARGET': tier,flag,page='EXCLUDE','мусор/нерелевант',''
    elif has(s,'на кольцах','на кольца','блочная'): tier,page='Tier-1','/copybooks/rings'
    elif has(s,'логотип','с принтом','принтом','со своим дизайном','индивидуальной обложкой','фирменн','брендир','с обложкой'): tier,page='Tier-1','/copybooks/logo'
    elif has(s,'блокнот') and not has(s,'тетрад'): tier,flag,page='STANDALONE','блокноты (→/notebooks)',''
    out.append((q,d,tier,page,flag,cat))

agg=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    key=page if tr=='Tier-1' else tr
    agg[key]['n']+=1; agg[key]['d']+=d
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':26s} {'n':>4s} {'спрос':>7s} {'%':>6s}"]
order=['Tier-3','/copybooks/logo','/copybooks/rings','STANDALONE','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:26s} {a['n']:4d} {a['d']:7d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
rep='\n'.join(lines); open(os.path.join(HERE,'report_copybooks_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','copybooks_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_тетради_Tier.xlsx', out)
print('\nxlsx written')
