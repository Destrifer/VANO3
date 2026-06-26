# -*- coding: utf-8 -*-
# Разбор консолидированного ядра книг (формат владельца) -> читаемый отчёт + csv.
import zipfile, re, os, csv, json
from xml.etree import ElementTree as ET
from collections import defaultdict

M='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
HERE=os.path.dirname(os.path.abspath(__file__))

def parse(path):
    z=zipfile.ZipFile(path); shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        t=ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in t.findall('m:si',NS): shared.append(''.join(n.text or '' for n in si.iter(M+'t')))
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    sheets=[(s.get('name'),s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')) for s in wb.find('m:sheets',NS).findall('m:sheet',NS)]
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels')); rid={r.get('Id'):r.get('Target') for r in rels}
    def cidx(ref):
        m=re.match(r'([A-Z]+)\d+',ref); n=0
        for c in m.group(1): n=n*26+(ord(c)-64)
        return n-1
    def val(c):
        t=c.get('t'); v=c.find('m:v',NS)
        if t=='s': return shared[int(v.text)] if v is not None else ''
        if t=='inlineStr':
            is_=c.find('m:is',NS); return ''.join(n.text or '' for n in is_.iter(M+'t')) if is_ is not None else ''
        return v.text if v is not None else ''
    out={}
    for name,r in sheets:
        tgt=rid[r]; tgt=tgt if tgt.startswith('xl/') else 'xl/'+tgt
        ws=ET.fromstring(z.read(tgt)); rows=[]
        for row in ws.iter(M+'row'):
            cells={}; mx=-1
            for c in row.findall('m:c',NS):
                ci=cidx(c.get('r')); cells[ci]=val(c); mx=max(mx,ci)
            rows.append([cells.get(i,'') for i in range(mx+1)])
        out[name]=rows
    return out

def num(x):
    try: return int(float(x))
    except: return 0

d=parse('C:/Users/user/Desktop/van2/seo/SEO-ядро_книги.xlsx')

# Собираем запросы из всех листов с данными. Структура по dump:
#  'SEO-ядро': [Кластер, Запрос, Запрос(норм), demandA, demandB, comp]
#  'Запросы' : [Кластер, Запрос, Клики, Спрос(месяц), comp]
#  'Кластеры': [Группа, Запрос, Кластер, Спрос(месяц)]
queries={}  # query -> {query, cluster, demand, comp, group}
def add(q, cluster, demand, comp='', group=''):
    q=(q or '').strip()
    if not q: return
    r=queries.get(q)
    if not r:
        queries[q]={'query':q,'cluster':cluster or '','demand':demand,'comp':comp or '','group':group or ''}
    else:
        r['demand']=max(r['demand'],demand)
        if cluster and not r['cluster']: r['cluster']=cluster
        if comp and not r['comp']: r['comp']=comp
        if group and not r['group']: r['group']=group

for name,rows in d.items():
    if not rows: continue
    hdr=rows[0]
    # эвристика по числу колонок и заголовкам
    H=[h.strip() for h in hdr]
    for r in rows[1:]:
        if not r or not (len(r)>1 and str(r[1]).strip()):
            # некоторые листы запрос в колонке 1
            pass
        # определить индексы
    # обрабатываем по имени листа через сопоставление известным схемам
# вместо эвристики — явная обработка по позиции, проверяя заголовок наличием 'Спрос'
def col_with(hdr, *subs):
    for i,h in enumerate(hdr):
        for s in subs:
            if s in h: return i
    return -1

for name,rows in d.items():
    if len(rows)<2: continue
    hdr=rows[0]
    qi=col_with(hdr,'апрос')   # Запрос
    di=col_with(hdr,'прос (')   # Спрос (месяц)
    if di<0: di=col_with(hdr,'прос')
    ci=col_with(hdr,'онкурент')
    cli=col_with(hdr,'ластер')
    gi=col_with(hdr,'руппа')
    if qi<0 or di<0:
        continue
    for r in rows[1:]:
        if len(r)<=max(qi,di): continue
        add(r[qi] if qi<len(r) else '',
            r[cli] if (cli>=0 and cli<len(r)) else '',
            num(r[di]) if di<len(r) else 0,
            r[ci] if (ci>=0 and ci<len(r)) else '',
            r[gi] if (gi>=0 and gi<len(r)) else '')

qs=list(queries.values())

# ---- classify (база из _pipeline + книги-специфика) ----
NONTARGET=['сайт ','лендинг','верстк','бесплатно','конструктор','генератор','редактор','нейросет','нейро ','продвижени','раскрутк',' seo','сео ','электронн','аудиокниг','скачать','читать онлайн','читать книг','книга жалоб','жалоб и предложен','программа для','приложени','фотошоп','photoshop','word','ворд','corel','иллюстратор','canva','андроид','айфон','iphone','значение','означает','сонник','приснил','к чему снится','книга рекордов','библия','коран','купить книгу','магазин','читалк','epub','fb2','pdf скач']
INFO=['как сделать','как создать','как нарисовать','как оформить','как распечат','как печатать','как сшить','как переплест','как сверстать','что такое','чем отличается','своими руками','в домашних','распечатать страниц','распечатать книг','в ворде','шаблон','образец','пример оформлен','idea','идеи']
LATIN_OK={'a3','a4','a5','a6','b2b','pos','pur','kbs'}
def is_branded(q):
    toks=[t for t in re.findall(r'[a-z][a-z0-9.\-]*',q.lower()) if t not in LATIN_OK]
    return len(toks)>0
def classify(q):
    s=' '+q.lower()+' '
    for w in NONTARGET:
        if w in s: return 'NONTARGET'
    if is_branded(q): return 'BRANDED'
    for w in INFO:
        if w in s: return 'INFO'
    return 'PRINT'
for q in qs: q['cat']=classify(q['query'])

# ---- агрегаты ----
def agg(cat):
    by=defaultdict(lambda:{'n':0,'demand':0,'qs':[]})
    for q in qs:
        if q['cat']!=cat: continue
        c=by[q['cluster'] or '(пусто)']; c['n']+=1; c['demand']+=q['demand']; c['qs'].append(q)
    out=[]
    for n,c in by.items(): c['qs'].sort(key=lambda x:-x['demand']); out.append((n,c))
    out.sort(key=lambda x:-x[1]['demand']); return out

lines=[]
lines.append(f"ВСЕГО уникальных запросов: {len(qs)}  суммарный спрос: {sum(q['demand'] for q in qs)}")
from collections import Counter
cnt=Counter(q['cat'] for q in qs)
dem=defaultdict(int)
for q in qs: dem[q['cat']]+=q['demand']
lines.append("По категориям (n / спрос):")
for c in ['PRINT','INFO','BRANDED','NONTARGET']:
    lines.append(f"  {c:9s} n={cnt.get(c,0):4d}  спрос={dem.get(c,0)}")
lines.append("")
for cat in ['PRINT','INFO','BRANDED','NONTARGET']:
    a=agg(cat)
    lines.append(f"================= {cat}  [кластеров={len(a)}] =================")
    for n,c in a:
        top=' | '.join(f"{x['query']}({x['demand']})" for x in c['qs'][:10])
        lines.append(f"CLUSTER: {n}  [n={c['n']} спрос={c['demand']}]")
        lines.append(f"   {top}")
    lines.append("")

open(os.path.join(HERE,'report_books.txt'),'w',encoding='utf-8').write('\n'.join(lines))

# csv всех запросов
os.makedirs(os.path.join(HERE,'data'),exist_ok=True)
with open(os.path.join(HERE,'data','queries_books_master.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['query','cluster','group','demand','comp','category'])
    for q in sorted(qs,key=lambda x:-x['demand']):
        w.writerow([q['query'],q['cluster'],q['group'],q['demand'],q['comp'],q['cat']])
print('done', len(qs))
