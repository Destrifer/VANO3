# -*- coding: utf-8 -*-
# Tier-разметка фотокниг и выпускных альбомов. Только печать/дизайн:
# фотосъёмка/фотограф/позы и AR/«живой альбом» — EXCLUDE (решение владельца).
import csv, os, zipfile
from collections import defaultdict
HERE=os.path.dirname(os.path.abspath(__file__))
def load(tag): return list(csv.DictReader(open(os.path.join(HERE,'data',f'queries_{tag}_master.csv'),encoding='utf-8-sig')))
def has(s,*subs): return any(x in s for x in subs)

# ---- общие EXCLUDE ----
SHOOT=['фотосъёмк','фотосесс','фотограф','фотостуди','позы для','поза для','съёмка','съемка','образ на','фотосет','ретушь','обработка фото']
AR=['дополненной реальностью','дополненная реальность','живой альбом','живые альбом','живые фотоальбом','живой фотоальбом','оживающ','оживающий','ожившие','ар альбом']
EDITOR=['конструктор','редактор','создать онлайн','онлайн создать','создать фотокнигу','собрать фотокниг','программа для','скачать','приложени']
GEO=['спб',' петербург','петербург','санкт','краснодар','самар','новосибирск','екатеринбург','казан','иркутск','ростов']
INFOX=['что такое','как сделать','как создать','идеи','своими руками','цитаты','цитата','виньетк','примеры выпускных','образцы','примеры оформлен']

def tier_photobooks(rows):
    BRANDS=['фабрика фотокниг','периодика','net-print','netprint','mybook','фотокнига ру','соутурообок','флексбук','empturti']
    out=[]
    for r in rows:
        q=r['query']; d=int(r['demand'] or 0); cat=r['category']; s=' '+q+' '
        page=''; tier='Tier-3'; flag=''
        if has(s,*BRANDS) or cat=='BRANDED': tier,flag='EXCLUDE','бренд-конкурент'
        elif has(s,*SHOOT): tier,flag='EXCLUDE','фотосъёмка (не наша услуга)'
        elif has(s,*AR): tier,flag='EXCLUDE','AR/живой альбом'
        elif has(s,*EDITOR): tier,flag='EXCLUDE','онлайн-редактор/DIY'
        elif has(s,*GEO): tier,flag='EXCLUDE','гео не-Москва'
        elif has(s,*INFOX) or cat in('INFO','NONTARGET'): tier,flag='EXCLUDE','инфо/нерелевант'
        elif has(s,'выпускн','школьн','детский сад','детсад',' класс','4 класс','9 класс','11 класс','садик'): tier,flag='STANDALONE','выпускные альбомы (→/graduation-albums)'
        elif has(s,'свадебн','свадьб','венчан'): tier,page='Tier-1','/photobooks/wedding'
        elif has(s,'премиум','premium','vip','люкс','эксклюзив'): tier,page='Tier-1','/photobooks/premium'
        elif has(s,'первый год','ребен','ребён','детск','новорожд','малыш','для девочки','для мальчика','годик','года ребенку'): tier,page='Tier-1','/photobooks/baby'
        elif has(s,'семейн','семья','родител'): tier,page='Tier-1','/photobooks/family'
        elif has(s,'срочн','быстро','за 1 день','за один день','экспресс'): tier,page='Tier-1','/photobooks/urgent'
        elif has(s,'путешеств','travel'): tier,flag='Tier-2','/photobooks/travel'
        elif has(s,'корпоратив'): tier,flag='Tier-2','/photobooks/corporate'
        elif has(s,'книг') and not has(s,'фотокн'): tier,flag='STANDALONE','книги (→/books)'
        # иначе Tier-3 (хаб): фотокнига/на заказ/печать/дизайн/переплёт/формат/юбилей/цена
        key=page if tier=='Tier-1' else (flag if tier in('Tier-2',) else tier)
        out.append((q,d,tier,page or (flag if tier=='Tier-2' else ('/photobooks (хаб)' if tier=='Tier-3' else '')),flag,cat))
    return out

def tier_albums(rows):
    BRANDS=['страна знаний','яркий кадр','яркое детство','периодика','фабрика фотокниг','школа выпускник','выпускник.ру']
    out=[]
    for r in rows:
        q=r['query']; d=int(r['demand'] or 0); cat=r['category']; s=' '+q+' '
        page=''; tier='Tier-3'; flag=''
        if has(s,*BRANDS) or cat=='BRANDED': tier,flag='EXCLUDE','бренд-конкурент'
        elif has(s,*SHOOT): tier,flag='EXCLUDE','фотосъёмка (не наша услуга)'
        elif has(s,*AR): tier,flag='EXCLUDE','AR/живой альбом'
        elif has(s,*GEO): tier,flag='EXCLUDE','гео не-Москва'
        elif has(s,*INFOX) or cat in('INFO','NONTARGET'): tier,flag='EXCLUDE','инфо/цитаты/виньетки'
        # классы — ДО детсада и в порядке 11→9→4 (иначе «1 класс» внутри «11 класс»)
        elif has(s,'11 класс','11 класса','11класс','11-класс','выпускник 11','11 классов'): tier,page='Tier-1','/graduation-albums/grade-11'
        elif has(s,'9 класс','9 класса','9класс','9-класс','выпускник 9'): tier,page='Tier-1','/graduation-albums/grade-9'
        elif has(s,'4 класс','4 класса','4класс','4-класс','начальн','начальной школ'): tier,page='Tier-1','/graduation-albums/grade-4'
        elif has(s,'детск','детсад','детский сад','садик',' сад ','сада','саду','дошкол'): tier,page='Tier-1','/graduation-albums/kindergarten'
        elif has(s,'фотокниг') and not has(s,'выпускн','школьн',' класс','сад'): tier,flag='STANDALONE','фотокниги (→/photobooks)'
        key=page if tier=='Tier-1' else (flag if tier=='Tier-2' else tier)
        out.append((q,d,tier,page or ('/graduation-albums (хаб)' if tier=='Tier-3' else ''),flag,cat))
    return out

def report(tag, out, hub_order):
    agg=defaultdict(lambda:{'n':0,'d':0})
    for q,d,tr,page,flag,cat in out:
        key=page if tr in('Tier-1','Tier-2') else tr
        agg[key]['n']+=1; agg[key]['d']+=d
    total=sum(d for _,d,*_ in out)
    lines=[f"[{tag}] ВСЕГО {len(out)} запросов, спрос {total}\n",f"{'КАТЕГОРИЯ':40s} {'n':>5s} {'спрос':>8s} {'%':>6s}"]
    seen=set()
    def line(k):
        a=agg.get(k)
        if not a:return
        seen.add(k); lines.append(f"{k:40s} {a['n']:5d} {a['d']:8d} {100*a['d']/total:6.1f}")
    for k in hub_order: line(k)
    for k in sorted(agg,key=lambda x:-agg[x]['d']):
        if k not in seen: line(k)
    exr=defaultdict(lambda:{'n':0,'d':0}); sr=defaultdict(lambda:{'n':0,'d':0})
    for q,d,tr,page,flag,cat in out:
        if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
        if tr=='STANDALONE': sr[flag]['n']+=1; sr[flag]['d']+=d
    lines.append("\n-- EXCLUDE --")
    for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:40s} n={a['n']:4d} d={a['d']}")
    lines.append("\n-- STANDALONE --")
    for k,a in sorted(sr.items(),key=lambda x:-x[1]['d']): lines.append(f"  {k:40s} n={a['n']:4d} d={a['d']}")
    rep='\n'.join(lines); open(os.path.join(HERE,f'report_{tag}_tier.txt'),'w',encoding='utf-8').write(rep); print(rep,'\n')
    with open(os.path.join(HERE,'data',f'{tag}_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f); w.writerow(['Запрос','Спрос','Tier','Целевая страница','Флаг','ИсхКатегория'])
        for q,d,tr,page,flag,cat in sorted(out,key=lambda x:-x[1]): w.writerow([q,d,tr,page,flag,cat])
    return out

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

pb=tier_photobooks(load('photobooks'))
report('photobooks', pb, ['Tier-3','/photobooks/wedding','/photobooks/premium','/photobooks/baby','/photobooks/family','/photobooks/urgent','/photobooks/travel','/photobooks/corporate','STANDALONE','EXCLUDE'])
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_фотокниги_Tier.xlsx', pb)
al=tier_albums(load('albums'))
report('albums', al, ['Tier-3','/graduation-albums/kindergarten','/graduation-albums/grade-4','/graduation-albums/grade-9','/graduation-albums/grade-11','STANDALONE','EXCLUDE'])
xlsx('C:/Users/user/Desktop/van2/seo/SEO-ядро_выпускные-альбомы_Tier.xlsx', al)
print('xlsx written')
