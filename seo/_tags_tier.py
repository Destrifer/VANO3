# -*- coding: utf-8 -*-
# Tier-разметка БИРКИ И ЯРЛЫКИ. Самостоятельный хаб /hangtags «Бирки и ярлыки на заказ».
# Capability (владелец 2026-06-23): ТОЛЬКО ПЕЧАТЬ. Тканое/жаккард/сатин/пришивные/металл/кожа -> EXCLUDE.
# Сильный мусор: какао «Золотой ярлык», «ярлык на княжение/что такое ярлык», майнкрафт-крафт,
# возврат товара без бирки, расшифровка значков стирки, принтеры/пистолеты-маркираторы (оборудование),
# ярлык на раб.столе/иконки. Кластеры: clothing/cable/luggage/cardboard/keys (+ silicone Tier-2 блок).
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(os.path.join(HERE,'data','queries_tags_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)
# --- мусор/нерелевант ---
FOOD=['какао','золотой ярлык','золотого ярлыка','чайной ложке','столовой ложке','порошок','калорийн','кбжу','грамм']
HIST=['княжение','древней руси','в истории','золотой орды','хана','грамота']
DEF=['ярлык это','что такое ярлык','что такое бирка','бирка это','бирка что это','в чем разница','чем разница',
 'что значит','что означает','с каким событием']
GAME=['майнкрафт','майнкрафте','minecraft','крафт бирк','бирка крафт','бирки крафт']
LAW=['вернуть товар','вернуть вещь','вернуть одежду','возврат товар','возврат вещ','возврат бракован','без бирки',
 'оторвал бирку','зозпп','сдать вещь','сдать одежду','можно ли вернуть','можно ли сдать']
WASH=['стирк','обозначения для','обозначения на','символы стирки','знаки стирки','значки стирки','значки для стирки',
 'значки на одежде','знаки на одежде','символы на','расшифровка','уход за одеждой','утюг','глажк','отбелив','сушк']
EQUIP=['принтер','пистолет','маркиратор','игловой','игольчат','этикет-пистолет','этикет пистолет','аппарат','станок',
 'машинк','оборудование','термотрансфер','риббон','для печати на лентах','для печати на атласн','для ленты атласн',
 'для текстильных лент','лента атласн','атласной ленте']
PC=['рабочем столе','рабочий стол','на рабочем','иконк','ярлыки маленьк','маленькими','значок на телефоне',
 'ярлык на телефон','удалить ярлык','создать ярлык','ярлык приложения','браузер','windows','виндовс']
NORM=['на каком расстоянии','испытание стеллаж','проверка стеллаж','нагрузку','правила маркировки кабел',
 'требования к маркировк','как заполнять','как заполнить','гост на бирки','периодичность']
# капабилити: НЕ печать (владелец: только печать)
MAT_NOPRINT=['жаккард','тканев','текстиль','сатин','атласн','нейлон','пришивн','вшивн','вшивая','пришивая',
 'металл','из металла','кожан','из кожи','шильд','вышит','вышив','тиснен ']
BIRK=['бирк','бирок','ярлык','ярлычк','ярлыч']  # стем (бирок! — род.падеж не содержит «бирк»)
STICKER=['наклейк','стикер','ламинированн']  # -> stickers product
LABELS=['этикетк']  # -> существующий продукт /labels
JUNK=['пломб','противокражн','дырокол','штамп для','стим не запуск','steam','книжк','паллетн','для вб','для wb',
 'зачеркнутый','виды этикет','что входило','московское княжество']
BRANDS=['авито','озон','ozon','вайлдберр','wildberr','aliexpress','алиэксп','beerka','торговая марка бирок']
GEO=['спб','петербург','санкт-п','казан','новосиб','краснодар','екатеринб','уфа','нижн','самар','ростов','челяб','пермь']
GARDEN=['садов','для растен','для рассад','для цветов','маркеры для рассад','таблички для растен']
def tier(q,cat):
    s=' '+q+' '
    if has(s,*FOOD): return ('EXCLUDE','какао/еда «Золотой ярлык»','')
    if has(s,*GAME): return ('EXCLUDE','майнкрафт-крафт','')
    if has(s,*LAW): return ('EXCLUDE','юр.возврат без бирки','')
    if has(s,*PC): return ('EXCLUDE','ярлык ПК/иконки','')
    if has(s,*HIST): return ('EXCLUDE','история (ярлык на княжение)','')
    if has(s,*WASH): return ('EXCLUDE','расшифровка значков стирки','')
    if has(s,*EQUIP): return ('EXCLUDE','оборудование (принтеры/пистолеты)','')
    if has(s,*NORM): return ('EXCLUDE','нормы/ГОСТ-инфо','')
    if has(s,*GARDEN): return ('EXCLUDE','садовые/для растений','')
    if has(s,*MAT_NOPRINT): return ('EXCLUDE','capability: не печать (ткань/металл/кожа)','')
    if has(s,*JUNK): return ('EXCLUDE','мусор (пломбы/штампы/прочее)','')
    if has(s,*DEF) or (cat=='INFO' and not has(s,'заказ','печать','изготов','купить','цена')):
        return ('EXCLUDE','инфо/определение','')
    if cat=='BRANDED' or has(s,*BRANDS): return ('EXCLUDE','бренд/маркетплейс','')
    if has(s,*GEO): return ('EXCLUDE','гео не-Москва','')
    if has(s,*STICKER) and not has(s,*BIRK): return ('EXCLUDE','наклейки -> /stickers','')
    if has(s,*LABELS) and not has(s,*BIRK): return ('EXCLUDE','этикетки -> /labels','')
    # --- целевые кластеры (печатные) ---
    if has(s,'кабел','провод','у-13','у 13','у-134','у-136','маркиров') and has(s,'бирк','маркер','кабел'):
        return ('Tier-1','','/hangtags/cable')
    if has(s,'багаж','чемодан'): return ('Tier-1','','/hangtags/luggage')
    if has(s,'ключ'): return ('Tier-1','','/hangtags/keys')
    if has(s,'силикон'): return ('Tier-2','силикон (блок в хабе)','/hangtags')
    if has(s,'картон','бумажн','из картона'): return ('Tier-1','','/hangtags/cardboard')
    if has(s,'одежд','навесн','носк','ювелир','именн','лейбл','для товар','навесная','подвесн','хенгер'):
        return ('Tier-1','','/hangtags/clothing')
    # --- хаб: generic бирки/ярлыки (включая стем «бирок») ---
    if has(s,*BIRK): return ('Tier-3','','/hangtags (хаб)')
    return ('EXCLUDE','прочее/ambiguous','')
agg=defaultdict(lambda:{'n':0,'d':0}); out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=page if tr in('Tier-1','Tier-2') else tr
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page or flag,flag,cat))
total=sum(d for _,d,*_ in out)
lines=[f"ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':40s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
order=['Tier-3','/hangtags (хаб)','/hangtags/clothing','/hangtags/cable','/hangtags/luggage','/hangtags/cardboard','/hangtags/keys','/hangtags','EXCLUDE']
seen=set()
def line(k):
    a=agg.get(k)
    if not a: return
    seen.add(k); lines.append(f"{k:40s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE (по причинам) --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:40s} n={a['n']:4d} d={a['d']}")
for grp in ['/hangtags/clothing','/hangtags/cable','/hangtags/luggage','/hangtags/cardboard','/hangtags/keys']:
    top=sorted([o for o in out if o[3]==grp],key=lambda x:-x[1])[:6]
    lines.append(f"\n-- топ {grp} --")
    for q,d,tr,page,flag,cat in top: lines.append(f"  {d:5d}  {q}")
lines.append("\n-- топ хаб (Tier-3) --")
for q,d,tr,page,flag,cat in sorted([o for o in out if o[2]=='Tier-3'],key=lambda x:-x[1])[:12]:
    lines.append(f"  {d:5d}  {q}")
rep='\n'.join(lines); open(os.path.join(HERE,'report_tags_tier.txt'),'w',encoding='utf-8').write(rep); print(rep)
with open(os.path.join(HERE,'data','tags_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
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
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_бирки-ярлыки_Tier.xlsx', out)
print('\nxlsx written')
