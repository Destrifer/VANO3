# -*- coding: utf-8 -*-
# Агрегатор конкурентов по 83 сырым выгрузкам Вебмастера (webmaster-raw).
# Скоринг: score(host) = sum по разделам [ вес_раздела * сила_присутствия ],
#   сила = 0.6*rank_score(HostsTable) + 0.4*url_score(UrlsTable),
#   вес раздела = sqrt(суммарный demand кластеров) нормированный.
import sys, io, os, re, zipfile, collections, json, math
from xml.etree import ElementTree as ET
from urllib.parse import urlparse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RAW = os.environ.get('RADAR_RAW', r'C:\Users\user\Desktop\van2\seo\webmaster-raw')
M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'

SECTION = {  # сид (из имени файла) -> раздел
 'визитки':'визитки','печать визиток':'визитки','изготовление визиток':'визитки','заказ визиток':'визитки',
 'срочная печать визиток':'визитки','пластиковые визитки':'визитки','прозрачные визитки':'визитки',
 'визитки с тиснением':'визитки','визитки с фольгированием':'визитки',
 'наклейки':'наклейки','этикетки':'этикетки','буклеты':'буклеты','брошюры':'брошюры',
 'листовки':'листовки-флаеры','флаеры':'листовки-флаеры',
 'каталоги':'каталоги','печать каталогов':'каталоги',
 'печать меню':'меню','изготовление меню':'меню',
 'печать конвертов':'конверты','печать папок':'папки','изготовление папок':'папки',
 'блокноты':'блокноты','ежедневники':'ежедневники','печать книг':'книги',
 'печать журналов':'журналы','изготовление журналов':'журналы',
 'тетради на заказ':'тетради','печать бланков':'бланки','фотокниги':'фотокниги',
 'выпускной альбом':'выпускные альбомы',
 'печать открыток':'открытки','изготовление открыток':'открытки',
 'печать приглашений':'приглашения','печать пригласительных':'приглашения',
 'печать грамот':'грамоты','печать дипломов':'дипломы','печать сертификатов':'сертификаты',
 'печать билетов':'билеты','благодарственное письмо':'благодарности',
 'бейджи':'бейджи','эмблемы':'эмблемы',
 'план эвакуации':'планы эвакуации','заказать план эвакуации':'планы эвакуации','эвакуационные указатели':'планы эвакуации',
 'знаки безопасности':'знаки','указатели':'знаки','информационные знаки':'знаки',
 'бирки':'бирки-ярлыки','бирки на заказ':'бирки-ярлыки','печать бирок':'бирки-ярлыки','ярлыки':'бирки-ярлыки',
 'воблеры':'POS','воблер рекламный':'POS','печать воблеров':'POS','хенгеры':'POS','печать хенгеров':'POS',
 'ценники':'POS','печать ценников':'POS','купоны':'POS','печать купонов':'POS',
 'чертежи':'чертежи','печать чертежей в москве':'чертежи',
 'документация':'проектная документация','печать проектной документации москва':'проектная документация',
 'печать документов':'документы','печать курсовых':'документы','печать рефератов':'документы',
 'презентация':'презентации','печать презентаций':'презентации',
 'карты':'карты-атласы','печать карт':'карты-атласы','атлас':'карты-атласы',
 'штрихкоды':'штрихкоды','печать штрих кодов':'штрихкоды',
 'наклейки на упаковку':'наклейки-упаковка','печать наклеек для упаковки':'наклейки-упаковка',
 'наклейки на оборудование':'наклейки-оборудование',
 'квартальные календари':'календари','печать квартальных календарей':'календари',
}

STOP = {  # автостоп-лист: агрегаторы/маркетплейсы/справочники/соцсети/биржи
 'avito.ru','ozon.ru','wildberries.ru','market.yandex.ru','yandex.ru','2gis.ru','zoon.ru','yell.ru',
 'profi.ru','youdo.com','vk.com','dzen.ru','youtube.com','pinterest.com','ok.ru','livemaster.ru',
 'aliexpress.ru','tiu.ru','pulscen.ru','blizko.ru','satom.ru','irr.ru','flagma.ru','regmarkets.ru',
 'instagram.com','wikipedia.org','hh.ru','rutube.ru','ya.ru','yandex.com','t.me','telegram.org',
 'onlinetrade.ru','sima-land.ru','vseinstrumenti.ru','leroymerlin.ru','komus.ru','officemag.ru',
 'joom.ru','kazanexpress.ru','megamarket.ru','sbermegamarket.ru','lenta.com','fix-price.ru',
 'etsy.com','ebay.com','amazon.com','banggood.com','dns-shop.ru','citilink.ru','mvideo.ru',
 # инфо/сервисы/не рынок (по результатам первого прогона)
 'mail.ru','freepik.com','habr.com','google.com','apple.com','rustore.ru','otzovik.com','ruwiki.ru',
 'rbc.ru','chitai-gorod.ru','tbank.ru','vbr.ru','banki.ru','sravni.ru','t-j.ru','gosuslugi.ru',
 'infourok.ru','drive2.ru','mos.ru','klerk.ru','irecommend.ru','consultant.ru','rambler.ru',
 'canva.com','canva.site','wordwall.net','uchi.ru','nsportal.ru','multiurok.ru','prodlenka.org',
 'maam.ru','solncesvet.ru','urokitvorchestva.ru','labirint.ru','book24.ru','litres.ru','buk24.ru',
 'wb.ru','kufar.by','shutterstock.com','istockphoto.com','adobe.com','фотобанки.рф','lovepik.com',
 'ozone.ru','microsoft.com','office.com','garant.ru','normativ.kontur.ru','kontur.ru','glavbukh.ru',
 'gost.ru','docs.cntd.ru','cntd.ru','minstroyrf.gov.ru','stroi.mos.ru','mchs.gov.ru','edu.ru',
 'ficbook.net','author.today','proza.ru','stihi.ru','litmir.me','flibusta.is','royallib.com',
}

def sheets(path):
    z = zipfile.ZipFile(path)
    ss = []
    try:
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(M+'si'):
            ss.append(''.join(t.text or '' for t in si.iter(M+'t')))
    except KeyError:
        pass
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rmap = {r.get('Id'): r.get('Target') for r in rels}
    out = {}
    for sh in wb.find(M+'sheets'):
        tgt = rmap[sh.get(R+'id')]
        tgt = tgt if tgt.startswith('xl/') else 'xl/'+tgt
        rows = []
        for row in ET.fromstring(z.read(tgt)).find(M+'sheetData').findall(M+'row'):
            vals = []
            for c in row.findall(M+'c'):
                t = c.get('t'); v = c.find(M+'v'); isn = c.find(M+'is')
                if isn is not None: val = ''.join(x.text or '' for x in isn.iter(M+'t'))
                elif v is None: val = ''
                elif t == 's': val = ss[int(v.text)]
                else: val = v.text
                vals.append(val)
            rows.append(vals)
        out[sh.get('name')] = rows
    return out

def norm_host(h):
    h = h.strip().lower()
    h = re.sub(r'^https?://', '', h).split('/')[0]
    for pre in ('www.', 'm.'):
        if h.startswith(pre): h = h[len(pre):]
    if h.startswith('xn--') or '.xn--' in h:
        try: h = h.encode('ascii').decode('idna')
        except Exception: pass
    return h

def root_host(h):
    # avito.ru и m.avito.ru -> avito.ru; поддомены типа msk.foo.ru схлопываем до foo.ru
    parts = h.split('.')
    return '.'.join(parts[-2:]) if len(parts) > 2 else h

# --- агрегация ---
# section -> host -> {'best_rank': int, 'urls': set, 'url_queries': float}
sec_host = collections.defaultdict(lambda: collections.defaultdict(lambda: {'best_rank': 10**9, 'urls': set(), 'uq': 0.0}))
sec_demand = collections.defaultdict(dict)  # section -> cluster -> demand (dedupe по имени кластера)
host_titles = collections.defaultdict(list)
files = [f for f in os.listdir(RAW) if f.endswith('.xlsx')]
unmapped = []
for f in files:
    seed = re.sub(r'^wordcraft-tables-info-', '', re.sub(r'-\d{8}-\d{6}\.xlsx$', '', f))
    sec = SECTION.get(seed)
    if not sec:
        unmapped.append(seed); continue
    sh = sheets(os.path.join(RAW, f))
    for rows_name in ('Queries',):
        for r in sh.get(rows_name, [])[1:]:
            if len(r) >= 4 and r[1] and r[3]:
                try: d = float(r[3])
                except ValueError: continue
                cl = r[1]
                sec_demand[sec][cl] = max(sec_demand[sec].get(cl, 0), d and sec_demand[sec].get(cl, 0) + 0)  # placeholder
                # суммируем demand по кластеру аккуратно: кластер встречается многострочно -> суммируем запросы
    # пересчёт: суммируем demand ПО ЗАПРОСАМ, дедуп по (query)
    for r in sh.get('Queries', [])[1:]:
        if len(r) >= 4 and r[0] and r[3]:
            try: d = float(r[3])
            except ValueError: continue
            key = r[0]
            cur = sec_demand[sec].get(key)
            if cur is None or d > cur: sec_demand[sec][key] = d
    for i, r in enumerate(sh.get('HostsTable', [])[1:], start=1):
        if not r or not r[0]: continue
        h = root_host(norm_host(r[0]))
        st = sec_host[sec][h]
        if i < st['best_rank']: st['best_rank'] = i
    for r in sh.get('UrlsTable', [])[1:]:
        if len(r) >= 3 and r[0]:
            try: h = root_host(norm_host(urlparse(r[0]).netloc))
            except Exception: continue
            st = sec_host[sec][h]
            st['urls'].add(r[0].rstrip('/'))
            try: st['uq'] += float(r[2] or 0)
            except ValueError: pass
            if len(host_titles[h]) < 8 and r[1]: host_titles[h].append(r[1])

# веса разделов: log-демпфирование, чтобы «карты» (гео/банковские, нецелевой спрос)
# не задавили полиграфические разделы
w = {s: math.log10(1 + sum(v.values())) for s, v in sec_demand.items()}
mx = max(w.values())
w = {s: v/mx for s, v in w.items()}

def rank_score(rank):
    if rank >= 10**9: return 0.0
    if rank <= 20: return 1.0
    return max(0.0, 1.0 - (rank - 20) / 180.0)  # 0 при ранге 200+

def url_score(n):
    return min(n, 12) / 12.0

hosts = collections.defaultdict(lambda: {'score': 0.0, 'secs': [], 'urls': 0})
for sec, hh in sec_host.items():
    for h, st in hh.items():
        rs = rank_score(st['best_rank']); us = url_score(len(st['urls']))
        strength = 0.6*rs + 0.4*us
        if strength <= 0: continue
        hosts[h]['score'] += w[sec] * strength
        hosts[h]['secs'].append((sec, round(strength, 2), st['best_rank'] if st['best_rank'] < 10**9 else None, len(st['urls'])))
        hosts[h]['urls'] += len(st['urls'])

rows = []
for h, d in hosts.items():
    stopped = h in STOP
    secs = sorted(d['secs'], key=lambda x: -x[1])
    upsec = d['urls'] / max(1, len(d['secs']))  # посадочных на раздел: <1.5 = «морда»
    rows.append({'host': h, 'score': round(d['score'], 3), 'n_secs': len(d['secs']),
                 'urls': d['urls'], 'upsec': round(upsec, 1), 'stop': stopped,
                 'top_secs': [s[0] for s in secs[:6]],
                 'titles': host_titles.get(h, [])[:5]})
rows.sort(key=lambda r: -r['score'])

print('files:', len(files), 'unmapped seeds:', unmapped)
print('sections:', len(sec_demand), '| section weights:')
for s, v in sorted(w.items(), key=lambda x: -x[1]):
    print('  %-22s %.2f' % (s, v))
print()
print('=== TOP-50 БЕЗ стоп-листа ===')
print('%-28s %6s %4s %5s %6s %s' % ('host', 'score', 'sec', 'urls', 'u/sec', 'top sections'))
shown = 0
for r in rows:
    if r['stop']: continue
    print('%-28s %6.2f %4d %5d %6.1f  %s' % (r['host'], r['score'], r['n_secs'], r['urls'], r['upsec'], ','.join(r['top_secs'])))
    shown += 1
    if shown >= 50: break

# нишевые лидеры: сильнейшие хосты каждого раздела, не входящие в общий топ
print('\n=== Нишевые лидеры по разделам (top-5 каждого, вне общего топ-25) ===')
general_top = {r['host'] for r in rows if not r['stop']}
general_top = set(list(r['host'] for r in rows if not r['stop'])[:25])
for sec in sorted(sec_host):
    ranked = sorted(((h, st) for h, st in sec_host[sec].items() if h not in STOP),
                    key=lambda x: (x[1]['best_rank'], -len(x[1]['urls'])))
    niche = [(h, st['best_rank'], len(st['urls'])) for h, st in ranked[:8] if h not in general_top][:5]
    if niche:
        print('%-22s %s' % (sec, '; '.join('%s(r%d,u%d)' % n for n in niche)))

with open(os.path.join(ROOT, 'seo', 'radar', 'hosts-scoring.json'), 'w', encoding='utf-8') as fp:
    json.dump(rows, fp, ensure_ascii=False, indent=1)
print('\nsaved seo/radar/hosts-scoring.json')
