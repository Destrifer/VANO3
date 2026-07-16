# -*- coding: utf-8 -*-
# Радар: вежливый сборщик sitemap конкурентов из seo/radar/competitors.json.
# Снапшот: seo/radar/snapshots/<YYYY-MM-DD>/<host>.csv (url,lastmod).
# Печатает дельту к предыдущему снапшоту (новые/исчезнувшие URL по хостам).
#   python .claude/skills/market-radar/scripts/fetch_sitemaps.py [--watchlist] [host ...]
import sys, io, os, time, gzip, random, csv, re, json, datetime
import urllib.request
from xml.etree import ElementTree as ET

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RADAR = os.path.join(ROOT, 'seo', 'radar')
SNAP = os.path.join(RADAR, 'snapshots')
TODAY = datetime.date.today().isoformat()
OUT = os.path.join(SNAP, TODAY)
os.makedirs(OUT, exist_ok=True)

cfg = json.load(open(os.path.join(RADAR, 'competitors.json'), encoding='utf-8'))
args = sys.argv[1:]
hosts = [h['host'] for h in cfg['tier_a']] + [h['host'] for h in cfg.get('tier_a_border', [])]
if '--watchlist' in args:
    args.remove('--watchlist')
    hosts += [h['host'] for h in cfg.get('watchlist', [])]
hosts.append('printmos.ru')
if args: hosts = args  # явный список хостов перекрывает конфиг

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

def fetch(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'ru,en;q=0.8',
                'Accept-Encoding': 'gzip'})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
                if r.headers.get('Content-Encoding') == 'gzip' or url.endswith('.gz') or data[:2] == b'\x1f\x8b':
                    try: data = gzip.decompress(data)
                    except OSError: pass
                return data
        except Exception as e:
            print('  retry %d %s: %s' % (i + 1, url, e))
            time.sleep(4 * (i + 1) + random.uniform(0, 2))
    return None

def parse_sm(data):
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return None, []
    if 'sitemapindex' in root.tag.lower():
        out = []
        for sm in root:
            loc = next((c for c in sm if c.tag.endswith('loc')), None)
            if loc is not None and loc.text: out.append(loc.text.strip())
        return 'index', out
    urls = []
    for u in root:
        loc = next((c for c in u if c.tag.endswith('loc')), None)
        lm = next((c for c in u if c.tag.endswith('lastmod')), None)
        if loc is not None and loc.text:
            urls.append((loc.text.strip(), lm.text.strip() if lm is not None and lm.text else ''))
    return 'urlset', urls

def sitemaps_from_robots(host):
    data = fetch('https://%s/robots.txt' % host, tries=2)
    out = []
    if data:
        for line in data.decode('utf-8', 'ignore').splitlines():
            m = re.match(r'(?i)sitemap:\s*(\S+)', line.strip())
            if m: out.append(m.group(1))
    return out

def crawl_host(host):
    fn = os.path.join(OUT, host.replace('.', '_') + '.csv')
    if os.path.exists(fn):
        print('SKIP (уже скачан сегодня)', host); return
    cands = sitemaps_from_robots(host) or ['https://%s/sitemap.xml' % host]
    time.sleep(random.uniform(2, 4))
    seen, rows, queue = set(), [], list(dict.fromkeys(cands))
    while queue and len(seen) < 40 and len(rows) < 60000:
        sm = queue.pop(0)
        if sm in seen: continue
        seen.add(sm)
        data = fetch(sm)
        time.sleep(random.uniform(2.0, 4.5))
        if not data:
            print('  FAIL', sm); continue
        kind, items = parse_sm(data)
        if kind == 'index': queue.extend(items)
        elif kind == 'urlset': rows.extend(items)
        else: print('  not xml:', sm, data[:80])
    with open(fn, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['url', 'lastmod'])
        for r in rows: w.writerow(r)
    print('DONE %s: %d urls' % (host, len(rows)))

def prev_snapshot_dir():
    if not os.path.isdir(SNAP): return None
    dates = sorted(d for d in os.listdir(SNAP) if d < TODAY)
    return os.path.join(SNAP, dates[-1]) if dates else None

def load_urls(path):
    with open(path, encoding='utf-8') as f:
        return {r['url'] for r in csv.DictReader(f)}

for h in hosts:
    print('=== HOST', h)
    try: crawl_host(h)
    except Exception as e: print('HOST ERROR', h, e)
    time.sleep(random.uniform(3, 6))

prev = prev_snapshot_dir()
print('\n=== ДЕЛЬТА к %s ===' % (os.path.basename(prev) if prev else '— (первый снапшот, дельты нет)'))
if prev:
    for h in hosts:
        fn = h.replace('.', '_') + '.csv'
        cur_f, prev_f = os.path.join(OUT, fn), os.path.join(prev, fn)
        if not (os.path.exists(cur_f) and os.path.exists(prev_f)): continue
        cur, old = load_urls(cur_f), load_urls(prev_f)
        added, gone = sorted(cur - old), sorted(old - cur)
        if not added and not gone:
            print('%-24s без изменений (%d url)' % (h, len(cur))); continue
        print('%-24s +%d / -%d' % (h, len(added), len(gone)))
        for u in added[:20]: print('   + %s' % u)
        if len(added) > 20: print('   + … ещё %d' % (len(added) - 20))
        for u in gone[:8]: print('   - %s' % u)
        if len(gone) > 8: print('   - … ещё %d' % (len(gone) - 8))
