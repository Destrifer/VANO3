# -*- coding: utf-8 -*-
# Tier-разметка сертификатов. Хаб /certificates. EXCLUDE: «тату сертификат» (потребит.
# интент покупки, не печать), бренды, шаблоны, копицентры. Подарочные — Tier-1.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_certificates_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
BRANDS=['чехов','аврора принт','аврорапринт','гарант','нетпринт','netprint','net-print','этикетки ру','губернский',
 'корал','coral','pmg','icolorit','tipindigo','принт престиж','copy']
DIY=['шаблон','скачать','распечатать грамоту','распечатать грамот','пустые','пустой','для печати на принтере','нарисовать']
COPY=['распечатать документ','распечатка документов','рядом со мной','с телефона','ксерокопия','где можно распечатать']
def tier(q,cat):
    s=' '+q+' '
    if has(s,'тату'): return ('EXCLUDE','тату-сертификат (потребит., не печать)','')
    if has(s,'антидвойка','антидвойк'): return ('EXCLUDE','мем/нерелевант','')
    if cat=='BRANDED' or has(s,*BRANDS): return ('EXCLUDE','бренд-конкурент','')
    if has(s,*COPY): return ('EXCLUDE','копицентр/документы','')
    if has(s,*DIY): return ('EXCLUDE','шаблон/DIY','')
    if has(s,'офсет'): return ('EXCLUDE','capability (офсет)','')
    # соседние продукты
    if has(s,'фотокниг','печать фото','фотографий','на фото'): return ('STANDALONE','фотокниги (→/photobooks)','')
    if has(s,'грамот') and not has(s,'сертификат'): return ('STANDALONE','грамоты (→/awards)','')
    if has(s,'диплом') and not has(s,'сертификат'): return ('STANDALONE','дипломы (→/diplomas)','')
    # кластеры
    if has(s,'подарочн'): return ('Tier-1','','/certificates/gift')
    if has(s,'рельефн','тиснени','конгрев','уф печать','прозрачн','из пластика','пластиков'): return ('Tier-2','рельеф/тиснение/материалы','/certificates/relief')
    return ('Tier-3','','/certificates (хаб)')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr in('Tier-1','Tier-2') else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':36s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/certificates/gift','/certificates/relief','STANDALONE','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:36s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0}); sr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
    if tr=='STANDALONE': sr[flag]['n']+=1; sr[flag]['d']+=d
lines.append("\n-- EXCLUDE --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:36s} n={a['n']:4d} d={a['d']}")
lines.append("\n-- STANDALONE --")
for k,a in sorted(sr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:36s} n={a['n']:4d} d={a['d']}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_certificates_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','certificates_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_сертификаты_Tier.xlsx', out)
print('\nxlsx written')
