# -*- coding: utf-8 -*-
# ХАБ 2: POS-материалы /pos-materials (реклама в местах продаж). Объединяет 4 ядра:
# wobblers/pricetags/hangers/coupons. Кластеры-плитки: wobblers, pricetags, hangers.
# Купоны -> Tier-2 (секция в хабе, без отдельной страницы). Тяжёлая модерация:
# воблер=рыболовная приманка, ценникодержатели/DIY-онлайн, клиффхенгер(нарратив), купоны=промокоды.
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
def load(t): return [dict(r, src=t) for r in csv.DictReader(open(os.path.join(HERE,'data','queries_pos_%s_master.csv'%t),encoding='utf-8-sig'))]
rows=load('wobblers')+load('pricetags')+load('hangers')+load('coupons')
def has(s,*subs): return any(x in s for x in subs)
COM=['печать','заказ','изготов','производств','типограф','полиграф','оптом','под ключ','макет','с логотип',
 'рекламн','срочн','дизайн','цена','купить','стоимость']  # коммерч.интент печати
# --- WOBBLERS ---
FISH=['рыбалк','рыбол','рыбу','на щук','щуку','щуки','окун','судак','жерех','голавл','форел','лосос','басс','хищник',
 'спиннинг','троллинг','блесн','приманк','уловист','проводк','минноу','suspender','суспендер','тонущ','плавающ',
 'crankbait','кренк','поппер','составн','диповый','миноу','джерк','раттлин','silver creek','megabass','strike',
 'воблер на ','лучшие воблер','топ воблер','набор воблер','магазин','летний','зимн','глубин','заглубл','твичинг',
 'для троллинга','для ловли','ловли','поводок','крючк','тройник']
WDEF=['воблер это','воблер что','что такое воблер','виды воблер','разновидн','маркировк','значение слова']
# --- PRICETAGS ---
PHOLD=['ценникодержат','держатель для ценник','держатели для ценник','подставк под ценник','рамк','карман для ценник',
 'планшет для ценник','наклонн','зажим для ценник','стойк для ценник','кассет','профиль ценоч','ценникодержатель',
 'клипса','подставк']
PDIY=['онлайн','распечат','шаблон','скачать','в word','в ворд','в excel','в эксель','программа','генератор','конструктор',
 'самому','бесплатно','своими руками','как сделать','в 1с','в гугл','редактор','сервис для созд','приложение']
PEQUIP=['принтер','этикет-пистолет','этикет пистолет','маркиратор','термоэтикет','весы','аппарат','машинк','сканер']
PDEF=['ценник это','что такое ценник','как оформить','требования к ценник','правила','закон','оформление ценник',
 'обязательн','штраф','госта','по госту','как должен','реквизит']
# --- HANGERS ---
HNAR=['клиффхенгер','клифхенгер','клифхэнгер','клиф хенгер','клиффхэнгер','cliffhanger','клиффхенг','клифхенг',
 'ева хенгер','хенгер это','хенгер что','хенгеры что','хенгеры это','хенгер значени','стейк','рибай','мясник',
 'говядин','часть туши','eva хенгер','что это такое']
# --- COUPONS ---
CPROMO=['промокод','промо-код','промо код','фрибет','фонбет','бетсити','1xbet','1хбет','винлайн','лига ставок',
 'теремок','тануки','яндекс','озон','ozon','wildberr','вайлдберр','aliexpress','алиэксп','казино','ставк','букмекер',
 'на сегодня','действующ','бонус','скидочные коды','промокоды','купон на скидк','app store','стим','steam','делимобиль',
 'самокат','купер','сбермаркет','литрес','ивыbörse','golden','кэшбэк','летуаль','золотое яблоко','мвидео','днс',
 '2024','2025','новых пользоват','первый заказ','бесплатн','активир','ввести промо']
CTARGET=['печать купон','купоны на заказ','изготовление купон','отрывн','отрывные талон','талон','с отрывной',
 'нумерац','скидочный купон печать','купоны с логотип','купоны типограф','купоны для розыгрыш','подарочный купон печать']
BRANDS_GEO=['спб','петербург','санкт','казан','новосиб','краснодар','екатеринб']
def tier(q,cat,src):
    s=' '+q+' '
    if src=='wobblers':
        if has(s,*WDEF): return ('EXCLUDE','воблер: определение','')
        # кластер ТОЛЬКО при явном рекламно-полиграфическом интенте (иначе «воблер» = приманка)
        WCOM=['рекламн','pos','печать','типограф','полиграф','изготов','на заказ','заказать воблер','макет','под ключ','оптом']
        if has(s,'воблер','воблеры') and has(s,*WCOM) and not has(s,*FISH):
            return ('Tier-1','','/pos-materials/wobblers')
        if has(s,*FISH): return ('EXCLUDE','воблер: рыболовная приманка','')
        if has(s,'воблер','воблеры'): return ('EXCLUDE','воблер: рыболовный (generic)','')
        return ('EXCLUDE','прочее','')
    if src=='pricetags':
        if has(s,*PHOLD): return ('EXCLUDE','ценникодержатели (товар)','')
        if has(s,*PEQUIP): return ('EXCLUDE','оборудование (принтеры/весы)','')
        if has(s,'электронн','цифров','смарт','e-ink','дисплей','табло'): return ('EXCLUDE','электронные ценники (железо)','')
        if has(s,'магнитн','мелов','грифельн','многоразов','пластиковые ценник','с держателем','держателем'): return ('EXCLUDE','ценники-товар (магнит/мел/держатель)','')
        if has(s,'обознач','собственной торговой марк','стм','маркетплейс','что должно быть на','викторин','бзмж','что это на','что значит на','расшифров','инфляц','можно ли','потреб','разрезать','за 100','несоответств','чек и ценник','не соответствует'): return ('EXCLUDE','ценник: инфо/потребитель','')
        if has(s,*PDIY): return ('EXCLUDE','DIY ценники (онлайн/шаблон)','')
        if has(s,*PDEF): return ('EXCLUDE','ценник: инфо/закон','')
        if has(s,'таганск','ресторан','бар ','кафе'): return ('EXCLUDE','бренд (Таганский ценник и пр.)','')
        if cat=='BRANDED' or has(s,*BRANDS_GEO): return ('EXCLUDE','бренд/гео','')
        if has(s,'ценник','ценоч','ценик'): return ('Tier-1','','/pos-materials/pricetags')
        return ('EXCLUDE','прочее','')
    if src=='hangers':
        if has(s,*HNAR): return ('EXCLUDE','хенгер: нарратив/определение/прочее','')
        if has(s,'дорхенгер','door hanger','хенгер','хэнгер'): return ('Tier-1','','/pos-materials/hangers')
        return ('EXCLUDE','прочее','')
    if src=='coupons':
        # SMM-накрутка/сервисы — НЕ печать
        if has(s,'втопе','лайкест','likest','босслайк','bosslike','турболайк','директ','накрут','смм','подписчик','лайк'):
            return ('EXCLUDE','купоны: SMM-накрутка','')
        if has(s,*CTARGET): return ('Tier-2','купоны (секция хаба)','/pos-materials')
        return ('EXCLUDE','купоны: промокоды/прочее','')
    return ('EXCLUDE','прочее','')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']; src=r['src']
    tr,flag,page=tier(q,cat,src)
    key=page if tr in('Tier-1','Tier-2') else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat,src))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':40s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['/pos-materials/wobblers','/pos-materials/pricetags','/pos-materials/hangers','/pos-materials','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:40s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat,src in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE (по причинам) --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:40s} n={a['n']:4d} d={a['d']}")
for grp in ['/pos-materials/wobblers','/pos-materials/pricetags','/pos-materials/hangers','/pos-materials']:
    top=sorted([o for o in out if o[3]==grp],key=lambda x:-x[1])[:8]
    lines.append(f"\n-- топ {grp} --")
    for q,d,*_ in top: lines.append(f"  {d:5d}  {q}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_pos_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','pos_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['Запрос','Спрос','Tier','Целевая страница','Флаг','ИсхКатегория','Источник'])
    for q,d,tr,page,flag,cat,src in sorted(out,key=lambda x:-x[1]): w.writerow([q,d,tr,page,flag,cat,src])
def xlsx(path, rows):
    def esc(x): return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')
    def cell(v):
        if isinstance(v,int) or (isinstance(v,str) and v.isdigit()): return f'<c t="n"><v>{int(v)}</v></c>'
        return f'<c t="inlineStr"><is><t xml:space="preserve">{esc(v)}</t></is></c>'
    data=[['Запрос','Спрос','Tier','Целевая страница','Флаг','Источник']]+[[q,d,tr,page,flag,src] for q,d,tr,page,flag,cat,src in sorted(rows,key=lambda x:-x[1])]
    rx=[f'<row r="{i}">'+''.join(cell(v) for v in row)+'</row>' for i,row in enumerate(data,1)]
    sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(rx)+'</sheetData></worksheet>'
    wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tier" sheetId="1" r:id="rId1"/></sheets></workbook>'
    wbrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
    rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',ct); z.writestr('_rels/.rels',rels); z.writestr('xl/workbook.xml',wb)
        z.writestr('xl/_rels/workbook.xml.rels',wbrels); z.writestr('xl/worksheets/sheet1.xml',sheet)
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_POS-материалы_Tier.xlsx', out)
print('\nxlsx written')
