# -*- coding: utf-8 -*-
# Обработка НЕСКОЛЬКИХ xlsx-выгрузок Я.Вебмастера в один набор.
# Использование: python _pipeline.py <tag> <file1.xlsx> <file2.xlsx> ...
import zipfile, re, json, sys, os, csv
from xml.etree import ElementTree as ET
from urllib.parse import urlparse
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
M='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def parse_xlsx(path):
    z=zipfile.ZipFile(path)
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        t=ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in t.findall('m:si',NS):
            shared.append(''.join(n.text or '' for n in si.iter(M+'t')))
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    sheets=[(s.get('name'), s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')) for s in wb.find('m:sheets',NS).findall('m:sheet',NS)]
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rid={r.get('Id'):r.get('Target') for r in rels}
    def cidx(ref):
        m=re.match(r'([A-Z]+)\d+',ref); n=0
        for c in m.group(1): n=n*26+(ord(c)-64)
        return n-1
    def val(c):
        t=c.get('t'); v=c.find('m:v',NS)
        if t=='s': return shared[int(v.text)] if v is not None else ''
        if t=='inlineStr':
            is_=c.find('m:is',NS)
            return ''.join(n.text or '' for n in is_.iter(M+'t')) if is_ is not None else ''
        return v.text if v is not None else ''
    out={}
    for name,r in sheets:
        tgt=rid[r];  tgt= tgt if tgt.startswith('xl/') else 'xl/'+tgt
        ws=ET.fromstring(z.read(tgt)); rows=[]
        for row in ws.iter(M+'row'):
            cells={}; mx=0
            for c in row.findall('m:c',NS):
                ci=cidx(c.get('r')); cells[ci]=val(c); mx=max(mx,ci)
            rows.append([cells.get(i,'') for i in range(mx+1)])
        out[name]=rows
    return out

def num(x):
    try: return int(float(x))
    except: return 0

# ---- classify ----
NONTARGET=['сайт','лендинг',' веб','верстк','бесплатно','конструктор','генератор','редактор','нейросет','нейро ','продвижени','раскрутк','seo','сео ','электронн','виртуальн','цифровая визитка','цифровую визитку','видеовизит','видео визит',' qr','нфс',' nfc ','генерац','генерир','скачать','шаблон','программа для','приложени','фотошоп','photoshop','ворд','word','corel','иллюстратор','паблишер','canva','андроид','айфон','iphone','кальмар','психопат','яроша','сонник','приснил','матрица суд','значение','означает',' счет ','учете','бухгалтерск','создать','создание','сгенерир','нарисовать','мокап',' ии ','ии для','ии визит','искусственный интеллект','умная визитка']
INFO=['как сделать','как создать','как нарисовать','как оформить','как распечат','как печатать','размер визит','размеры визит','формат визит','что такое','что писать','образец','идеи','пример визит','примеры визит']
LATIN_OK={'nfc','qr','usb','vip','touche','touch','cover','soft','a3','a4','a5','html','b2b','ego'}

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

# ---- load all files ----
tag=sys.argv[1]
files=sys.argv[2:]
queries={}
url_rows=[]
for f in files:
    seed=os.path.basename(f).replace('wordcraft-tables-info-','').split('-2026')[0]
    data=parse_xlsx(f)
    for sheet in ('Queries','AdditionalQueries'):
        if sheet not in data: continue
        for r in data[sheet][1:]:
            if not r or not r[0].strip(): continue
            q=r[0].strip()
            rec=queries.get(q)
            cl=(r[1].strip() if len(r)>1 else '')
            ck=num(r[2]) if len(r)>2 else 0
            dm=num(r[3]) if len(r)>3 else 0
            cp=(r[4].strip() if len(r)>4 else '')
            if not rec:
                queries[q]={'query':q,'cluster':cl,'clicks':ck,'demand':dm,'comp':cp,'seeds':{seed}}
            else:
                rec['clicks']=max(rec['clicks'],ck); rec['demand']=max(rec['demand'],dm)
                rec['seeds'].add(seed)
    if 'UrlsTable' in data:
        for r in data['UrlsTable'][1:]:
            if not r or not r[0].strip(): continue
            url_rows.append((r[0].strip(),(r[1].strip() if len(r)>1 else ''),num(r[2]) if len(r)>2 else 0))

qs=list(queries.values())
for q in qs: q['cat']=classify(q['query'])

# ---- aggregate clusters ----
def agg(cat):
    by=defaultdict(lambda:{'n':0,'demand':0,'clicks':0,'qs':[]})
    for q in qs:
        if q['cat']!=cat: continue
        c=by[q['cluster'] or '(пусто)']; c['n']+=1; c['demand']+=q['demand']; c['clicks']+=q['clicks']; c['qs'].append(q)
    out=[]
    for n,c in by.items(): c['qs'].sort(key=lambda x:-x['clicks']); out.append((n,c))
    out.sort(key=lambda x:-x[1]['clicks']); return out

with open(os.path.join(HERE,f'report_clusters_{tag}.txt'),'w',encoding='utf-8') as f:
    for cat,lab in [('PRINT','=== PRINT ==='),('INFO','=== INFO ==='),('BRANDED','=== BRANDED ==='),('NONTARGET','=== NONTARGET ===')]:
        a=agg(cat); td=sum(c['demand'] for _,c in a); tc=sum(c['clicks'] for _,c in a); tn=sum(c['n'] for _,c in a)
        f.write(f"{lab}  [кластеров={len(a)} запросов={tn} спрос={td} клики={tc}]\n\n")
        for n,c in a:
            top=' | '.join(f"{x['query']} ({x['demand']}/{x['clicks']})" for x in c['qs'][:7])
            f.write(f"CLUSTER: {n}\n  n={c['n']} спрос={c['demand']} клики={c['clicks']}\n  {top}\n\n")

# ---- competitors ----
def host(u):
    try: return urlparse(u if u.startswith('http') else 'https://'+u).netloc.replace('www.','')
    except: return u
hs=defaultdict(lambda:{'urls':0,'q':0})
url_best={}
for u,t,nq in url_rows:
    h=host(u); hs[h]['urls']+=1; hs[h]['q']+=nq
    if u not in url_best or nq>url_best[u][1]: url_best[u]=(t,nq,h)
comps=sorted(hs.items(),key=lambda x:-x[1]['q'])
with open(os.path.join(HERE,f'report_competitors_{tag}.txt'),'w',encoding='utf-8') as f:
    f.write(f"хостов={len(hs)} url={len(url_best)}\n\n=== ТОП ХОСТОВ (sum queries) ===\n")
    for h,s in comps[:45]: f.write(f"{h:34s} стр={s['urls']:3d} q={s['q']}\n")
    f.write("\n=== ТОП-45 СТРАНИЦ ===\n")
    for u,(t,nq,h) in sorted(url_best.items(),key=lambda x:-x[1][1])[:45]:
        f.write(f"{nq:5d} {u}\n      {t[:95]}\n")

# ---- CSV ----
os.makedirs(os.path.join(HERE,'data'),exist_ok=True)
with open(os.path.join(HERE,'data',f'queries_{tag}.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['query','cluster','demand','clicks','competitiveness','category','seeds'])
    for q in sorted(qs,key=lambda x:-x['clicks']):
        w.writerow([q['query'],q['cluster'],q['demand'],q['clicks'],q['comp'],q['cat'],'|'.join(sorted(q['seeds']))])
with open(os.path.join(HERE,'data',f'competitors_{tag}.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['host','pages_count','queries_sum'])
    for h,s in comps: w.writerow([h,s['urls'],s['q']])

from collections import Counter
print("files:",len(files),"unique queries:",len(qs))
print("by category:",dict(Counter(q['cat'] for q in qs)))
print("PRINT clusters:",len(agg('PRINT')))
