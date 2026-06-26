# -*- coding: utf-8 -*-
# Tier-разметка ядра бланков (Шаг 4.5). КРИТИЧНО: жёсткая модерация —
# мошеннические «купить справку/свидетельство/рецепт/диплом с печатями» = подделка
# документов, в EXCLUDE. Легитимное ядро: фирменные/самокопирующиеся/БСО.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_blanks_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)

CYR_BRANDS=['цопы','корал','coral','гарант','принт форум','принтомат','принт пост','yuppieprint','tipindigo',
 'pd master','пд мастер','prodv','prdv','icolorit','pmg','brauberg','mscomprint','enjoyprint','pronakleiki',
 'print-xp','printsreda','copy.ru','printology','docblagos','dispanser-narkolog','ситибланк','сити бланк','bso принт','бсо принт']
# 1) МОШЕННИЧЕСТВО / подделка документов (проверяем самым первым)
FRAUD=['купить справк','справку купить','куплю справк','купить свидетельств','свидетельство купить','куплю свидетельств',
 'купить рецепт','рецепт купить','купить диплом','диплом купить','купит диплом','купить удостоверение','продам бланк',
 'продам рецепт','достать печать','за плату','поддельн','с печатями купить','с печатью купить','купить бланк','бланк купить',
 'купить пустой бланк','купить рецептурн','рецептурный бланк','купить нд пнд','купить справку нд']
MED=['рецепт','рецептур','107','148','наркологич','наркодиспансер','психиатр',' пнд','психоневрологич','диспансер',
 ' нд ','086','095','медицинск','лекарств','антибиотик','габапентин','лирик','препарат','прерывани','выкидыш','аборт',
 'беременн','стоматолог','терапевт','педиатр','поликлиник','бассейн','медкниж','прививочн','о состоянии здоровья','диагноз','медсправк','медицинск']
DOCS=['свидетельств','паспорт','гражданств','загс','расторжени','о браке','о рождении','о смерти','военкомат','повестк',
 ' мвд','осужден','убежищ','временной регистрац','удостоверени','медал',' орден',' сво ','гербов',' герб ','герба',
 'государственн','гознак','министерств','трудов книж','трудовую книж','вкладыш в трудов']
EXAM=['егэ',' ппэ','экзамен','участник','организатор в аудитории','члена гэк',' гэк',' эм ',' дбо','калибровочн','токен','ик участнику','напечатанн']
TPL=['скачать','шаблон','образец',' word','ворд','в ворде','для печати на принтере','заполнить онлайн','европротокол',
 'купли продаж','купли-продаж',' дкп','договор','записки','здравии','упокоени','церков',' требы','дед мороз','грамот',
 'благодарств','благодарност','почетн','письмо от','распечатать на принтере','для редактирования']
INFOP=['ставится ли печать','ставят ли печать','ставят ли на','нужна ли печать','нужно ли ставить','надо ли став',
 'надо ли ставить','на каких документах','работать без печати','без печати','каким цветом','какого цвета','подделк',
 'криминалистик','327 ук','штраф за','обязательна ли печать','должна ли быть печать','сколько печатей','какая печать',
 'в каких случаях','правомерно ли','требования к','как правильно став','что должно быть','действует рецепт','какое суждение']
FIN=['счет на оплату','счет онлайн','сервис онлайн счет','кассовый ордер',' рко','товарный чек','карточка с образцами',
 'образцами подписей','оттиска печати','банковск','отчетность','двухмерным штрихкодом','pdf417','окуд','налогов']
CAP=['офсет','ризограф','водяными знаками','паспортов','паспорта','для паспорт']
EQUIP=['принтер','olivetti','термопечать','билетный принтер','насадк','оборудовани','станок','себестоимость','тиражирование на ризографе']
GEO=['спб',' петербург','петербурге','самар','ростов','нижнем новгород','нижнем новгороде','санкт']

def excluded(q):
    s=' '+q+' '
    if has(s,*CYR_BRANDS): return 'бренд-конкурент'
    if has(s,*FRAUD): return 'МОШЕННИЧЕСТВО (подделка документов)'
    if has(s,*MED): return 'мед/рецепт/справка (регулируемое)'
    if has(s,*DOCS): return 'офиц.документы/гос (регулируемое)'
    if has(s,*EXAM): return 'ЕГЭ/ППЭ (trivia)'
    if has(s,*INFOP): return 'инфо: оттиск печати/право'
    if has(s,*FIN): return 'финанс/онлайн-сервис'
    if has(s,*TPL): return 'шаблон/скачать (DIY)'
    if has(s,*CAP): return 'capability (офсет/ризо/гознак)'
    if has(s,*EQUIP): return 'оборудование'
    if has(s,*GEO): return 'гео не-Москва'
    return None

def tier1(q):
    s=' '+q+' '
    if has(s,'самокопир','копиркой','с копиркой','копировальн','самокопирк'): return '/forms/self-copy'
    if has(s,'строгой отчетност','бсо'): return '/forms/bso'
    if has(s,'фирменн','организации','компании','с логотипом','учреждени'): return '/forms/letterhead'
    return None

def standalone(q):
    s=' '+q+' '
    if has(s,'конверт'): return 'конверты'
    if has(s,'сертификат'): return 'сертификаты'
    if has(s,'билет'): return 'билеты'
    return None

def tier(q,cat):
    ex=excluded(q)
    if ex: return ('EXCLUDE',ex,'')
    if cat=='BRANDED': return ('EXCLUDE','бренд-конкурент','')
    t1=tier1(q)
    if t1: return ('Tier-1','',t1)
    st=standalone(q)
    if st: return ('STANDALONE',st,'')
    return ('Tier-3','','/forms (хаб)')

agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr=='Tier-1' else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page,flag,cat))

total=sum(int(r['demand'] or 0) for r in rows)
lines=[f"ВСЕГО {len(rows)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':34s} {'n':>5s} {'спрос':>8s} {'доля%':>6s}"]
order=['Tier-3','/forms/letterhead','/forms/self-copy','/forms/bso','STANDALONE','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:34s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0}); sr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
    if tr=='STANDALONE': sr[flag]['n']+=1; sr[flag]['d']+=d
lines.append("\n-- EXCLUDE по причинам --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:34s} n={a['n']:4d} спрос={a['d']}")
lines.append("\n-- STANDALONE --")
for k,a in sorted(sr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:34s} n={a['n']:4d} спрос={a['d']}")
rep='\n'.join(lines)
open(os.path.join(HERE,'report_blanks_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)

with open(os.path.join(HERE,'data','blanks_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
dst='C:/Users/user/Desktop/van2/seo/SEO-ядро_бланки_Tier.xlsx'
xlsx(dst,['Запрос','Спрос','Tier','Целевая страница','Флаг'],data)
print('\nxlsx ->',dst)
