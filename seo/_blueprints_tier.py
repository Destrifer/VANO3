# -*- coding: utf-8 -*-
# Tier ЧЕРТЕЖИ. Хаб /blueprints «Печать чертежей» (формат-нейтральный head; на странице А4/А3,
# крупный формат — по запросу через партнёров, НЕ афишируем -> в primary targeting EXCLUDE).
# Capability: печать/копирование/фальцовка А3 и меньше. НЕ делаем: ШФ А0/А1/А2 (афиш.),
# сканирование/оцифровка (услуга), черчение/проектирование (создание), изготовление по чертежам (производство), ГОСТ-инфо.
# Кластеры: project-docs (проектная документация ~25k), a3, folding (фальцовка), copy (копирование А3).
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_blueprints_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
# производство по чертежам
MANUF=['изготовлен','изготовить','деталь','детали','деталей','металлообраб','металлоконстру','металлоиздел','токарн',
 'фрезеров','муфт','гидроцилиндр','мебел','ворота','калитк','из металла','из стали','стальн','чпу','сварн','литье',
 'литьё','штамповк','производство и монтаж','на станке','механическ','изделий по черт','изделия по черт','корпус',
 'вал ','втулк','шестерн','редуктор','насос','форму для','пресс-форм','раскрой','лазерн резк','гибк металл',
 'кронштейн','профил','фланц','обечайк','резка метал','резку метал','анкерн','витраж','скворечник','коробок',
 'коробк','упаковк','капсульн дом','крыш','кровл','забор','навес','лестниц','каркас','теплиц','беседк']
JUNK=['треугольник','какой угол','калькулятор кры','размеры скворечник','капсульн','скворечник','фото',
 'википед','что называется','градус','геометри']
# черчение/проектирование (создание чертежа — не печать)
DESIGN=['начерт','черчени','выполнить черт','выполнение черт','заказать черт','купить черт','чертеж купить','чертежи купить',
 'чертить','в компас','в автокад','автокад','autocad','компас','нарисовать черт','создать черт','создание черт','чертеж онлайн',
 'онлайн черт','разработка черт','разработать черт','проектирование','спроектир','моделирован','3д модел','3d модел','деталировк',
 'эскиз','оцифровка черт','оцифровать','перевод в электрон','по фото','по образцу','дизайн черт','чертеж по размер','рисунок черт']
SCAN=['сканир','сканы','отскан','скан чертеж','сканер','планшетное скан','широкоформатное скан','оцифров']
INFO=['гост','оформлени','правила оформлен','чертеж это','что такое','требовани','условные обознач','масштаб',
 'как читать','как чертить','виды чертеж','основная надпись','форматы чертеж','рамка чертеж','штамп чертеж',
 'обозначения на черт','спецификац гост','en iso','единая система','ескд','размеры форматов','что значит']
BRAND=['цопы','фолиопринт','архив ру','копировалня ру','копировальня ру','тис','реглет','print','принт ру',
 'wikipedia','википед','ту 160','ту-160']
# крупный формат — НЕ афишируем (через партнёров по запросу) -> EXCLUDE из targeting
LARGE=['а0','a0','а1','a1','а2','a2','широкоформат','большой формат','большого формата','больших форматов',
 'большие формат','крупн формат','плоттер','плоттерн','ватман']
def tier(q,cat):
    s=' '+q+' '
    if has(s,*MANUF): return ('EXCLUDE','производство по чертежам','')
    if has(s,*JUNK): return ('EXCLUDE','DIY/геометрия/прочее','')
    if has(s,*DESIGN): return ('EXCLUDE','черчение/проектирование (создание)','')
    if has(s,*SCAN): return ('EXCLUDE','сканирование/оцифровка (услуга)','')
    if has(s,*INFO) or cat=='INFO': return ('EXCLUDE','ГОСТ/инфо','')
    if cat=='BRANDED' or has(s,*BRAND): return ('EXCLUDE','бренд/конкурент/нерелевант','')
    if has(s,*LARGE): return ('EXCLUDE','крупный формат А0/А1/А2 (по запросу, не афишируем)','')
    # целевые (печать/копир/фальц А3 и меньше)
    if has(s,'фальц','сложение черт','брошюров'): return ('Tier-1','','/blueprints/folding')
    if has(s,'проектн','проектов','проекта','проекты','проект ','документац'):
        return ('Tier-1','','/blueprints/project-docs')
    if has(s,'копир','копия черт','копию черт','ксерокоп','ксерокс','копицентр','копировальн'):
        return ('Tier-1','','/blueprints/copy')
    if has(s,'а3','a3'): return ('Tier-1','','/blueprints/a3')
    if has(s,'а4','a4'): return ('Tier-2','формат А4 (в хабе)','/blueprints')
    # хаб: формат-нейтральная печать чертежей/схем
    if has(s,'чертеж','чертёж','черт ','схем') and has(s,'печат','распечат','напечат','типограф','инженерн','стоимость','цена','недорог','срочн','заказ','услуг'):
        return ('Tier-3','','/blueprints (хаб)')
    if has(s,'инженерн') and has(s,'печат','типограф'): return ('Tier-3','','/blueprints (хаб)')
    if has(s,'чертеж','чертёж'): return ('Tier-3','','/blueprints (хаб)')
    return ('EXCLUDE','прочее/ambiguous','')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr in('Tier-1','Tier-2') else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':46s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/blueprints (хаб)','/blueprints/project-docs','/blueprints/a3','/blueprints/folding','/blueprints/copy','/blueprints','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:46s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE (по причинам) --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:46s} n={a['n']:4d} d={a['d']}")
for grp in ['/blueprints/project-docs','/blueprints/a3','/blueprints/folding','/blueprints/copy']:
    top=sorted([o for o in out if o[3]==grp],key=lambda x:-x[1])[:7]
    lines.append(f"\n-- топ {grp} --")
    for q,d,*_ in top: lines.append(f"  {d:5d}  {q}")
lines.append("\n-- топ хаб (Tier-3) --")
for q,d,tr,page,flag,cat in sorted([o for o in out if o[2]=='Tier-3'],key=lambda x:-x[1])[:12]:
    lines.append(f"  {d:5d}  {q}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_blueprints_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','blueprints_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_чертежи_Tier.xlsx', out)
print('\nxlsx written')
