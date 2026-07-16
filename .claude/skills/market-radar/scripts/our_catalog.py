# -*- coding: utf-8 -*-
# Снимок нашего каталога с прода: продукты (хабы) + кластеры. По образцу seo/_preset_audit.py
import json, os, io, sys, collections, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))

def env(k):
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith(k + '='): return line.split('=', 1)[1].strip().strip('"').strip('\r')

URL = os.environ.get('DIRECTUS_PROD_URL', 'https://admin.printmos.ru')
TOKEN = os.environ.get('DIRECTUS_PROD_TOKEN') or env('DIRECTUS_ADMIN_TOKEN')

def get(path):
    req = urllib.request.Request(URL + path, headers={'Authorization': 'Bearer ' + TOKEN})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))['data']

prods = get('/items/products?limit=-1&fields=slug,name,status,strategy')
pages = get('/items/promoted_pages?limit=-1&fields=slug,status,product.slug')

clusters = collections.defaultdict(list)
for p in pages:
    if p.get('status') == 'published' and p.get('product'):
        clusters[p['product']['slug']].append(p['slug'])

out = {'hubs': [], 'draft': []}
for pr in sorted(prods, key=lambda x: x['slug'] or ''):
    row = {'slug': pr['slug'], 'name': pr['name'], 'strategy': pr.get('strategy'),
           'clusters': sorted(clusters.get(pr['slug'], []))}
    (out['hubs'] if pr['status'] == 'published' else out['draft']).append(row)

with open(os.path.join(ROOT, 'seo', 'radar', 'our_catalog.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

print('published hubs:', len(out['hubs']), '| clusters:', sum(len(h['clusters']) for h in out['hubs']))
for h in out['hubs']:
    print('/%s (%s, %s): %s' % (h['slug'], h['name'], h['strategy'], ', '.join(h['clusters']) or '—'))
print('\ndraft:', ', '.join(d['slug'] for d in out['draft']))
