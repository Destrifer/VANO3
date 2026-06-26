# -*- coding: utf-8 -*-
# Tier ДОКУМЕНТЫ. Единый хаб /docs «Печать документов» (id 20, cat5, sheet).
# ГЛАВНАЯ ловушка — омонимия «печать»: печатание VS штамп/печать-организации.
#   «печать ДОКУМЕНТОВ/документа», «распечатать», «печать А4/цветная/скан» = ПЕЧАТЬ (наше).
#   «печать ДЛЯ документов», «печать ИП/круглая/гербовая/мокрая», «купить/изготовить печать», «штамп», «оттиск» = ШТАМП (EXCLUDE).
# Прочий EXCLUDE: копирка (бренд-сеть 14.6k), яндекс таблицы/документы (софт), онлайн-пдф/подпись,
#   принтер/мфу/сканер (оборудование), штамп о гражданстве (гос-инфо), перевод/экспертиза печати, фото на документы, А2/А1 (>А3).
# Кластеры: presentations (печать презентаций ~3.3k из отд.ядра), color (цветная), binding (брошюровка/переплёт/копирование).
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_docs_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
# ШТАМП/ПЕЧАТЬ-ОТТИСК (не печатание)
SEAL=['печать для документ','печать для ип','печать ип','печать организац','печать компании','печать с надписью',
 'круглая печать','печать круглая','гербов','наборн','мокрая печать','оттиск','факсимиле','штамп','купить печать',
 'изготов печат','изготовление печати','заказать печать','создать печать','создание печат','макет печат',
 'электронная печать','печать по оттиску','печать школы','печать с доставкой','доставкой печать','виды печат',
 'нужна ли печать','нужна ли для','обязательна печать','обязательно ли','печать на прозрачном','печать предприят',
 'печать ооо','где ставится печать','как ставить печать','как правильно ставить','правила оттиск','должна ли печать',
 'можно ли ставить печать','куда ставить печать','печать наборная','печать на подпис','печать заходить','что значит печать',
 'что такое мокрая','для чего можно использ','когда применя','разница','на каких документ','на какие документ']
BRAND=['копирка','коприка','копирака','копираа','цопы','фолиопринт','моипечати','точка ру','copy.ru','kopirka']
SOFT=['яндекс таблиц','яндекс документ','ядокумент','яндекс печать','поставить печать','вставить печать','наложить печать',
 'добавить печать','перенести печать','печать в пдф','печать на пдф','печать онлайн','подпись','факсимиле','повер поинт',
 'pdf','пдф онлайн','конвертир','онлайн создать','word','ворд','excel','эксель','гугл']
EQUIP=['принтер','мфу','сканер','купить для дома','для домашнего','рейтинг','какой лучше','выбрать для дома','картридж','тонер']
INFO=['какие документы нужны','штамп о гражданстве','печать о гражданстве','свидетельств','гражданств','экспертиза печат',
 'перевод печати','подлинност','нотариальн','что это','что значит','для чего','госуслуг','мвд','загранпаспорт','прописк',
 'заверя','копия верна','залезать','заверение','заверка','в каких случаях','нужно ли']
PHOTO=['фото на документ','фото для документ','фотографий на документ','фото документ','на документы фото']
LARGE=['а2','a2','а1','a1','а0','a0','большой формат','широкоформат','плакат']
def tier(q,cat):
    s=' '+q+' '
    if has(s,'папк','папок'): return ('STANDALONE','печать папок -> /folders','')
    if has(s,*PHOTO): return ('EXCLUDE','фото на документы (фотоуслуга)','')
    if has(s,*BRAND) or cat=='BRANDED': return ('EXCLUDE','бренд/конкурент (копирка и пр.)','')
    if has(s,*SOFT): return ('EXCLUDE','софт/онлайн (яндекс/пдф/подпись)','')
    if has(s,*EQUIP): return ('EXCLUDE','оборудование (принтер/мфу/сканер)','')
    if has(s,*INFO) or cat=='INFO': return ('EXCLUDE','гос-инфо/экспертиза/перевод печати','')
    if has(s,*SEAL): return ('EXCLUDE','штамп/печать-оттиск (не печатание)','')
    if has(s,*LARGE): return ('EXCLUDE','формат >А3 (А2/А1, не делаем)','')
    # целевые (печатание документов)
    if has(s,'брошюров','переплет','переплёт','сшивк','копирован','ксерокоп','ксерокс','копия','копий'):
        return ('Tier-1','','/docs/binding')
    if has(s,'цветн','цвет ','полноцвет'): return ('Tier-1','','/docs/color')
    if has(s,'презентац'): return ('Tier-1','','/docs/presentations')
    # хаб: печать/распечатка документов (head + формат/флешка/гео/срочно/дешево)
    if has(s,'документ') and has(s,'печат','распечат','напечат','распечатк','типограф','а4','a4','а3','a3','скан',
            'флешк','телефон','почт','дешев','недорог','срочн','стоимост','цена','рядом','услуг','качествен','любых'):
        return ('Tier-3','','/docs (хаб)')
    if has(s,'распечат') and not has(s,*SEAL): return ('Tier-3','','/docs (хаб)')
    return ('EXCLUDE','прочее/ambiguous','')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr=='Tier-1' else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':44s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/docs (хаб)','/docs/presentations','/docs/color','/docs/binding','STANDALONE','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:44s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE (по причинам) --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:44s} n={a['n']:4d} d={a['d']}")
for grp in ['/docs/color','/docs/binding','/docs/presentations']:
    top=sorted([o for o in out if o[3]==grp],key=lambda x:-x[1])[:6]
    lines.append(f"\n-- топ {grp} --")
    for q,d,*_ in top: lines.append(f"  {d:5d}  {q}")
lines.append("\n-- топ хаб (Tier-3) --")
for q,d,tr,page,flag,cat in sorted([o for o in out if o[2]=='Tier-3'],key=lambda x:-x[1])[:14]:
    lines.append(f"  {d:5d}  {q}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_docs_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','docs_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_документы_Tier.xlsx', out)
print('\nxlsx written')
