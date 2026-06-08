# -*- coding: utf-8 -*-
import json, re, csv, os
from urllib.parse import urlparse
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE,'dump.json'), encoding='utf-8'))

def rows(sheet):
    r = data[sheet]
    hdr = r[0]
    return hdr, r[1:]

def num(x):
    try: return int(float(x))
    except: return 0

# ---- merge query sheets ----
def load_queries(sheet):
    hdr, rs = rows(sheet)
    out=[]
    for r in rs:
        if not r or not r[0].strip(): continue
        out.append({
            'query': r[0].strip(),
            'cluster': (r[1].strip() if len(r)>1 else ''),
            'clicks': num(r[2]) if len(r)>2 else 0,
            'demand': num(r[3]) if len(r)>3 else 0,
            'comp':  (r[4].strip() if len(r)>4 else ''),
        })
    return out

q_main = load_queries('Queries')
q_add  = load_queries('AdditionalQueries')
# de-dup by query, keep max metrics, prefer main
seen={}
for q in q_main + q_add:
    k=q['query']
    if k not in seen:
        seen[k]=q
    else:
        s=seen[k]
        s['clicks']=max(s['clicks'],q['clicks'])
        s['demand']=max(s['demand'],q['demand'])
queries=list(seen.values())

# ---- stop-list: NON-TARGET (not our business) ----
NONTARGET = [
    'сайт', 'онлайн', 'бесплатно', 'мокап', 'mockup', 'mock',
    'электронн', 'виртуальн', 'цифровая визитка', 'цифровую визитку',
    'qr', 'нейросет', ' ии ', 'ии для', 'генератор',
    'canva', 'фотошоп', 'photoshop', 'ворд', 'word', 'corel',
    'своими руками', 'самому', 'в домашних',
    'продвижение', 'разработка сайт', 'верстк', 'лендинг',
    'приснил', 'сонник', 'значение', 'что означает',
]
# INFORMATIONAL (guide, not commercial landing)
INFO = [
    'как сделать', 'как создать', 'как нарисовать', 'как оформить',
    'размер визит', 'размеры визит', 'что такое', 'что писать',
    'шаблон', 'образец', 'идеи', 'примеры визит', 'дизайн идеи',
]

# latin tech terms that are NOT competitor brands
LATIN_OK = {'nfc','qr','usb','vip','touche','touch','cover','soft','a3','a4','a5','html','b2b'}

def is_branded(query):
    low = query.lower()
    toks = re.findall(r'[a-z][a-z0-9.\-]*', low)
    toks = [t for t in toks if t not in LATIN_OK]
    return len(toks) > 0  # любой не-тех латинский токен → бренд/транслит конкурента

def classify(q):
    s = ' '+q['query'].lower()+' '
    for w in NONTARGET:
        if w in s: return 'NONTARGET'
    if is_branded(q['query']): return 'BRANDED'
    for w in INFO:
        if w in s: return 'INFO'
    return 'PRINT'

for q in queries:
    q['cat']=classify(q)

# ---- aggregate by cluster within category ----
def agg(cat):
    by=defaultdict(lambda:{'n':0,'demand':0,'clicks':0,'qs':[]})
    for q in queries:
        if q['cat']!=cat: continue
        c=by[q['cluster'] or '(пусто)']
        c['n']+=1; c['demand']+=q['demand']; c['clicks']+=q['clicks']
        c['qs'].append(q)
    out=[]
    for name,c in by.items():
        c['qs'].sort(key=lambda x:-x['clicks'])
        out.append((name,c))
    out.sort(key=lambda x:-x[1]['clicks'])
    return out

# ---- write cluster report ----
def write_clusters(path):
    with open(path,'w',encoding='utf-8') as f:
        for cat,label in [('PRINT','=== РЕЛЕВАНТНЫЕ (печать) ==='),
                          ('INFO','=== ИНФОРМАЦИОННЫЕ (гайды) ==='),
                          ('BRANDED','=== БРЕНДОВЫЕ (конкуренты) ==='),
                          ('NONTARGET','=== НЕ НАШЕ (отбраковка) ===')]:
            f.write(label+'\n')
            tot_d=tot_c=tot_n=0
            for name,c in agg(cat):
                tot_d+=c['demand']; tot_c+=c['clicks']; tot_n+=c['n']
            f.write(f"[итого {cat}: кластеров={len(agg(cat))}, запросов={tot_n}, спрос={tot_d}, клики={tot_c}]\n\n")
            for name,c in agg(cat):
                top=' | '.join(f"{x['query']} ({x['demand']}/{x['clicks']})" for x in c['qs'][:6])
                f.write(f"CLUSTER: {name}\n  n={c['n']}  спрос={c['demand']}  клики={c['clicks']}\n  top: {top}\n\n")

write_clusters(os.path.join(HERE,'report_clusters.txt'))

# ---- competitors ----
def host_of(u):
    try:
        h=urlparse(u if u.startswith('http') else 'https://'+u).netloc
        return h.replace('www.','')
    except: return u

hdr,urls = rows('UrlsTable')
host_stats=defaultdict(lambda:{'urls':0,'queries':0,'pages':[]})
url_list=[]
for r in urls:
    if not r or not r[0].strip(): continue
    u=r[0].strip(); title=(r[1].strip() if len(r)>1 else ''); nq=num(r[2]) if len(r)>2 else 0
    h=host_of(u)
    hs=host_stats[h]; hs['urls']+=1; hs['queries']+=nq; hs['pages'].append((u,title,nq))
    url_list.append((u,title,nq,h))

comps=sorted(host_stats.items(), key=lambda x:-x[1]['queries'])
with open(os.path.join(HERE,'report_competitors.txt'),'w',encoding='utf-8') as f:
    f.write(f"ВСЕГО хостов={len(host_stats)}, url={len(url_list)}\n\n")
    f.write("=== ТОП КОНКУРЕНТОВ (по сумме queries их страниц) ===\n")
    for h,s in comps[:40]:
        f.write(f"{h:35s} страниц={s['urls']:3d}  queries(сумма)={s['queries']}\n")
    f.write("\n=== ТОП-40 СТРАНИЦ (по queries) ===\n")
    url_list.sort(key=lambda x:-x[2])
    for u,t,nq,h in url_list[:40]:
        f.write(f"{nq:5d}  {u}\n        {t[:90]}\n")

# ---- persist normalized CSVs ----
os.makedirs(os.path.join(HERE,'data'),exist_ok=True)
with open(os.path.join(HERE,'data','queries_vizitki.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['query','cluster','demand','clicks','competitiveness','category'])
    for q in sorted(queries,key=lambda x:-x['clicks']):
        w.writerow([q['query'],q['cluster'],q['demand'],q['clicks'],q['comp'],q['cat']])
with open(os.path.join(HERE,'data','competitors_vizitki.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['host','pages_count','queries_sum'])
    for h,s in comps:
        w.writerow([h,s['urls'],s['queries']])
with open(os.path.join(HERE,'data','competitor_urls_vizitki.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['url','title','queries','host'])
    for u,t,nq,h in url_list:
        w.writerow([u,t,nq,h])

print("done")
print("queries total:", len(queries))
from collections import Counter
print("by category:", dict(Counter(q['cat'] for q in queries)))
