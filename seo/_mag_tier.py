# -*- coding: utf-8 -*-
# Tier-разметка ядра журналов (Шаг 4.5). Вход: data/queries_magazines_master.csv
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_magazines_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)

CYR_BRANDS=['копирка','принт 24','принт24','полиграфмастер','полиграф мастер','супервейв','superwave','прожектор принт',
 'пройецторпринт','корал принт','coral','аврора принт','аврорапринт','вишневый пирог','cherrypie','гарант','пд мастер',
 'пдмастер','цопы','зса-принт','zsa','печата4','фолиопринт','квпринт','icolorit','capitalpress','pressfactor','printside',
 'a-kem','prkompaniya','a-format','pmg','print24','printhit','printsreda','tprint','pm1','viptip','shtrih','print-xp',
 'tformat','copy.ru','vozrod','printshop','tgrafika','tipindigo','printology','avroraprint','gcprint','tipindigo']
PHONE=['+7','642 46 17','7863830','5556513','499 642']
EX_DOC=['прошито','прошнуров','пронумеров','скреплено печатью','опечатано печатью','журнал учета','журнал учёта',
 'журнал регистрации','инструктаж','охране труда','охраны труда','буронабивн','буроинъекц','арматурн','свай',
 'журнал работ','общий журнал','армир','журнал контрол','температурн','холодильник','средств защиты','лабораторн',
 'инъекц','рецептов','журнал выдачи','реестр печат','карточка образцов','образцами подписей','госту','прошивать',
 'прошнуровыв','сшивать','сшито','бирка','наклейка на','ярлык прошито','учета печатей','учёта печатей','выдачи печатей',
 'регистрации печатей','печатей и штампов','требования к учету','какие журналы','должны быть прош','скреплять печатью',
 'ведомстве регистрируют','лекарственн','аптечн','заготовк','фасовочн']
EX_ACAD=['публикаци','научн','статью в журнал','статьи в журнал','статью в научн','выложить науч','опубликовать','подать статью','куда публик']
EX_TITLE=['трамвай','мурзилка','форбс','forbes','vogue','революция','литературн','толстые журналы','сербский',
 'природные и техногенные','печать и революция']
EX_READ=['читать','смотреть онлайн','электронн','эжд','дневник','windows','истории печати','историю печати','журнал печати windows']
EX_MATH=['коллектив из 18','наборщик','дипломн','чем печать журналов отличается','что относится к периодической',
 'периодическая печать в литературе','что такое периодическая','кто издает журнал']
EX_CAP=['офсет','офсетн','в китае','китае']
EX_EQUIP=['принтер','оборудование','биговщик','станок','какие принтеры','препресс','предпечатн','подготовка журнала к печати','подготовить журнал к печати']
EX_GEO=['спб',' петербург','петербурге','санкт','волгоград','иваново',' киров','кирове','челябинск','ростов','краснодар']
EX_DIY=['в ворде',' ворд','word','своими руками','создать журнал','шаблон','образец','подписк','подписат']

def excluded(q):
    s=' '+q+' '
    if has(s,*PHONE): return 'спам/телефон'
    if has(s,*CYR_BRANDS): return 'бренд-конкурент'
    if has(s,*EX_DOC): return 'госдок/бланк-журнал'
    if has(s,*EX_ACAD): return 'научн.публикация'
    if has(s,*EX_TITLE): return 'издание/худлит'
    if has(s,*EX_READ): return 'читать/электрон'
    if has(s,*EX_MATH): return 'trivia/математика'
    if has(s,*EX_CAP): return 'capability (офсет/Китай)'
    if has(s,*EX_EQUIP): return 'оборудование/препресс'
    if has(s,*EX_GEO): return 'гео не-Москва'
    if has(s,*EX_DIY): return 'DIY/word/шаблон'
    return None

def tier1(q):
    s=' '+q+' '
    if has(s,'глянц'): return '/magazines/glossy'
    if has(s,'газет'): return '/magazines/newspapers'
    if has(s,'срочн'): return '/magazines/urgent'
    return None

def standalone(q):
    s=' '+q+' '
    if has(s,'книг'): return 'книги'
    if has(s,'каталог'): return 'каталоги'
    if has(s,'буклет','брошюр','листовк','флаер'): return 'брошюры/буклеты'
    return None

def tier(q,cat):
    ex=excluded(q)
    if ex: return ('EXCLUDE',ex,'')
    if cat=='BRANDED': return ('EXCLUDE','бренд-конкурент','')
    t1=tier1(q)
    if t1: return ('Tier-1','',t1)
    s=' '+q+' '
    if has(s,'корпоратив','рекламн журнал','рекламного журнал','рекламных журнал','для организаций','для сотрудников','для производства','медицинск','периодическ'): return ('Tier-2','корпоративные','/magazines/corporate')
    st=standalone(q)
    if st: return ('STANDALONE',st,'')
    return ('Tier-3','','/magazines (хаб)')

agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr in ('Tier-1','Tier-2') else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page,flag,cat))

total=sum(int(r['demand'] or 0) for r in rows)
lines=[f"ВСЕГО {len(rows)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':30s} {'n':>5s} {'спрос':>8s} {'доля%':>6s}"]
order=['Tier-3','/magazines/glossy','/magazines/newspapers','/magazines/urgent','/magazines/corporate','STANDALONE','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:30s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0}); sr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
    if tr=='STANDALONE': sr[flag]['n']+=1; sr[flag]['d']+=d
lines.append("\n-- EXCLUDE по причинам --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:28s} n={a['n']:4d} спрос={a['d']}")
lines.append("\n-- STANDALONE --")
for k,a in sorted(sr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:28s} n={a['n']:4d} спрос={a['d']}")
rep='\n'.join(lines)
open(os.path.join(HERE,'report_magazines_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)

with open(os.path.join(HERE,'data','magazines_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['Запрос','Спрос','Tier','Целевая страница','Флаг','ИсхКатегория'])
    for q,d,tr,page,flag,cat in sorted(out,key=lambda x:-x[1]): w.writerow([q,d,tr,page,flag,cat])

def xlsx(path, header, data):
    def esc(x): return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')
    def cell(v):
        if isinstance(v,int) or (isinstance(v,str) and v.isdigit()): return f'<c t="n"><v>{int(v)}</v></c>'
        return f'<c t="inlineStr"><is><t xml:space="preserve">{esc(v)}</t></is></c>'
    rx=[f'<row r="{i}">'+''.join(cell(v) for v in row)+'</row>' for i,row in enumerate([header]+data,1)]
    sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(rx)+'</sheetData></worksheet>'
    wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tier" sheetId="1" r:id="rId1"/></sheets></workbook>'
    wbrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
    rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',ct); z.writestr('_rels/.rels',rels)
        z.writestr('xl/workbook.xml',wb); z.writestr('xl/_rels/workbook.xml.rels',wbrels)
        z.writestr('xl/worksheets/sheet1.xml',sheet)

data=[[q,d,tr,page,flag] for q,d,tr,page,flag,cat in sorted(out,key=lambda x:-x[1])]
dst='C:/Users/user/Desktop/van2/seo/SEO-ядро_журналы_Tier.xlsx'
xlsx(dst,['Запрос','Спрос','Tier','Целевая страница','Флаг'],data)
print('\nxlsx ->',dst)
