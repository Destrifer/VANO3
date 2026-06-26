# -*- coding: utf-8 -*-
# Tier-разметка билетов. Хаб /tickets (печать билетов на мероприятие).
# EXCLUDE: студенческий/военный билет (документы), концерт/самолёт (покупка), оборудование.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_tickets_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
DOCS=['студенческ','военн','воинск','категория годности','категория в с красной','допущен в зато','предательству',
 'отпускн','недействительн','постановке на','карта москвича','проездн','зачетк','зачётк']
CONSUMER=['распечатать билет','распечатать электронн','купить билет','купить студенч','нужно ли','нужен ли','на самолет',
 'на самолёт','в поезд','электронный билет','билет на концерт купить','авиабилет','жд билет']
EQUIP=['прибор для печати','принтер','билетный принтер','нумератор','кроссворд','все инструменты','custom tk','оборудовани']
BR=['прожектор','пройецторпринт','гарант','саратов','корал','coral','pmg','tipindigo','моспечать']
DIY=['шаблон','картинки','распечатать картинки','номерки для новогодней','скачать']
def tier(q,cat):
    s=' '+q+' '
    if has(s,*DOCS): return ('EXCLUDE','документ (студ./военный билет)','')
    if has(s,*CONSUMER): return ('EXCLUDE','потребитель (купить/распечатать билет)','')
    if has(s,*EQUIP): return ('EXCLUDE','оборудование/кроссворд','')
    if cat=='BRANDED' or has(s,*BR): return ('EXCLUDE','бренд/гео','')
    if has(s,*DIY): return ('EXCLUDE','шаблон/картинки','')
    if has(s,'приглашен','пригласительн') and not has(s,'пригласительн билет','пригласительные билет'): return ('STANDALONE','приглашения (→/invites)','')
    if has(s,'лотерейн','лотере','скретч','защитным слоем','защитный слой','с защитой','билеты с защит'): return ('Tier-1','','/tickets/lottery')
    if has(s,'перфораци','нумераци','отрывн','номерн'): return ('Tier-1','','/tickets/numbered')
    return ('Tier-3','','/tickets (хаб)')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr=='Tier-1' else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':36s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/tickets/lottery','/tickets/numbered','STANDALONE','EXCLUDE']
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
rep='\n'.join(lines); open(os.path.join(HERE,'report_tickets_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','tickets_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_билеты_Tier.xlsx', out)
print('\nxlsx written')
