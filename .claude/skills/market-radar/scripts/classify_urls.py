# -*- coding: utf-8 -*-
# Классификация URL конкурентов по продуктовым темам.
# Темы = наши 34 хаба + известные пробелы + обнаружение нового через 'other'.
import sys, io, os, csv, re, collections, json
from urllib.parse import urlparse, unquote

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
SNAP = os.path.join(ROOT, 'seo', 'radar', 'snapshots')
# последний датированный снапшот (или явный путь через env RADAR_SNAPSHOT)
SM = os.environ.get('RADAR_SNAPSHOT') or os.path.join(SNAP, sorted(os.listdir(SNAP))[-1])

# тема -> regex по пути URL (слаги транслит + англ). Порядок важен: первое совпадение.
TOPICS = [
 ('визитки', r'vizitk|business-?card|bizcard|visitk'),
 ('наклейки', r'nakleik|nakleyk|sticker|stiker|samokleik|samoklei'),
 ('этикетки', r'etiket|label'),
 ('буклеты-листовки', r'buklet|listovk|flaer|flyer|leaflet|liflet|evrobuklet'),
 ('брошюры', r'broshur|brochure|broshyur'),
 ('каталоги', r'katalog|catalog(?!ue-request)'),
 ('меню', r'menu|menyu'),
 ('конверты', r'konvert|envelope'),
 ('папки', r'papk|papka|folder(?!s-for)|papka-schet|folders-for-bills'),
 ('блокноты', r'bloknot|notepad|notebook|notes'),
 ('ежедневники', r'ezhednevnik|planner|daily'),
 ('книги', r'\bknig|kniga|book(?!ing)|izdanie|avtorsk'),
 ('журналы-учёта★', r'zhurnal.*(instruktazh|registracii|ucheta|uchet|ohran|okhran|kassov|proverok)|instruktazh|gotovye-zhurnaly'),
 ('журналы-газеты', r'zhurnal|magazine|gazet|newspaper'),
 ('тетради', r'tetrad|copybook|propis'),
 ('бланки', r'blank|forms?\b|firmenn.*blank|kvitanc'),
 ('фотокниги', r'fotoknig|photobook|photo-?book'),
 ('выпускные альбомы', r'vypuskn|albom|album|graduation'),
 ('открытки', r'otkrytk|postcard|otkrytki'),
 ('приглашения', r'priglash|invit'),
 ('грамоты-дипломы', r'gramot|diplom|attestat'),
 ('сертификаты', r'sertifikat|certificat'),
 ('билеты', r'bilet|ticket'),
 ('благодарности', r'blagodar'),
 ('бейджи', r'beidzh|badge|beydzh|bedzh|bejdzh'),
 ('планы эвакуации', r'evakuac|evacuation|plan-evak'),
 ('знаки', r'znak|sign(?!ature)|ukazatel|tablichk|tablick'),
 ('бирки-ярлыки', r'birk|yarlyk|birka|hang-?tag|tag\b|tegi'),
 ('POS-материалы', r'wobbler|vobler|cennik|tsennik|pricetag|khenger|henger|hanger|kupon|coupon|shelftoker|shelf-?talker|nekhauzer|dispenser|monetnic',),
 ('чертежи-проектная', r'chertezh|blueprint|proektn|shirokoformat.*(kopir|pechat)|a0|a1\b'),
 ('документы', r'dokument|document|referat|kursov|diplomn.*rabot|dissert|avtoreferat|perepl[ey]t|broshirovk|broshyurovk'),
 ('презентации', r'prezentac|presentation'),
 ('карты-атласы', r'\bkart[ay]|atlas|nastenn.*kart'),
 ('штрихкоды', r'shtrikh|shtrih|barcode|datamatrix|chestn.*znak|markirovk'),
 ('трафареты', r'trafaret|stencil'),
 # ---- известные пробелы (у нас нет) ----
 ('календари★', r'kalendar|calendar'),
 ('магниты★', r'magnit|magnet'),
 ('фотопечать★', r'fotopechat|photo-?print|pechat-foto|fotografi|photos\b|polaroid|foto-?na-?dokument'),
 ('тейбл-тенты★', r'table-?tent|teibl|tejbl|teybl|domik.*stol|menu-?holder'),
 ('плейсметы★', r'placemat|pleysmet|plejsmet|podlozhk'),
 ('значки★', r'znachk|znachok|button-?badge|zakatn'),
 ('пропуска★', r'propusk|pass\b|vehicle'),
 ('пакеты-упаковка★', r'paket|package|packaging|korobk|box(?!ing)|upakovk|kraft-?paket|tuba|futlyar'),
 ('гостевые книги★', r'guestbook|gostev'),
 ('журналы-учёта★', r'zhurnal.*(instruktazh|registracii|ucheta|ohran|okhran)|instruktazh'),
 ('дипломные-ВКР★', r'vkr\b|dipl.*perepl'),
 ('лента-ланъярды★', r'lanyard|lent[ay]-.*(logo|beidzh|badge)|lanyard'),
 ('таблички-офисные★', r'tablichk|officetable|doorplate|kabinetn'),
 ('шелфтокеры★', r'shelftoker'),
 ('мерч-сувенирка⛔', r'suvenir|gift|kruzhk|futbolk|tolstovk|kepk|bejsbolk|ruchk[ai]|fleshk|brelok|zont|ezheviz|podarok|podarochn|merch|textil|odezhd|posud|termos|shopper|econom-?bag|sumk|promo-?odezhda'),
 ('широкоформат⛔', r'banner|shtender|rollup|roll-?up|plakat|poster|kholst|holst|kartin|stend|tabl(?:o)\b|vyvesk|svetov|neon|shirokoformat|interern|billbord|citylight'),
 ('печати-штампы⛔', r'pechat[iy]-(?:i-)?shtamp|shtamp|faksimile|ottisk-pechat'),
 ('дизайн-услуги', r'dizain|dizajn|design(?!er-card)|maket|layout|vyorstka|verstka|logotip|brendbook|brandbook'),
 ('DTF-термо⛔', r'dtf|termoperevod|termotransfer|shelkografi|silk'),
]

SERVICE = re.compile(r'/(blog|news|stati|articles?|o-nas|about|contact|kontakt|dostavka|delivery|oplata|payment|otzyv|review|portfolio|raboty|gallery|galere|vacanc|vakans|polit|privacy|price\b|prais|karta-saita|sitemap|faq|voprosy|copycenter|filial|adres|kak-|instrukc|trebovani|sposoby|garanti|akci|sale|skidk|partner|franshiz|arenda|uslugi$|catalogue-request|search|login|cart|basket|compare|wishlist|account)', re.I)

CONTAINERS = {'catalog','katalog','products','product','shop','printing','prints','uslugi',
              'services','pechat','poligrafiya','poligrafia','production','tovary','gifts'}

def classify(path):
    p = unquote(path).lower()
    if SERVICE.search(p): return '_service'
    segs = [s for s in p.split('/') if s]
    # срезаем контейнерные сегменты, чтобы /catalog/kruzhki не падал в «каталоги»
    while segs and segs[0] in CONTAINERS:
        segs = segs[1:]
    if not segs: return '_service'
    rest = '/' + '/'.join(segs)
    for name, rx in TOPICS:
        if re.search(rx, rest): return name
    return '_other'

REGIONS = {  # host -> первые сегменты-регионы, которые срезаем (дедуп региональных копий)
 'copy.ru': {'sankt-peterburg','tyumen','sochi','nizhnij-novgorod','ekaterinburg','yaroslavl'},
 'kopirka.ru': {'city','spb','offices','offices-spb'},
}
CITY_AS_FIRST = {'multifoto.ru'}  # первый сегмент = город, продукт со второго

def load(host):
    fn = os.path.join(SM, host.replace('.', '_') + '.csv')
    if not os.path.exists(fn): return None
    seen, out = set(), []
    with open(fn, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            path = urlparse(r['url']).path
            segs = [s for s in path.split('/') if s]
            if host in REGIONS and segs and segs[0] in REGIONS[host]:
                if segs[0] in ('city','offices','offices-spb'): continue  # чисто гео-страницы
                segs = segs[1:]  # региональная копия -> канонический путь
            if host in CITY_AS_FIRST and len(segs) >= 2:
                segs = segs[1:]
            key = '/' + '/'.join(segs)
            if key in seen: continue
            seen.add(key)
            out.append('https://%s%s' % (host, key))
    return out

def main(hosts):
    res = {}   # host -> topic -> [paths]
    for h in hosts:
        urls = load(h)
        if urls is None:
            print('NO SITEMAP:', h); continue
        by = collections.defaultdict(list)
        for u in urls:
            try: path = urlparse(u).path
            except Exception: continue
            if not path or path == '/': continue
            by[classify(path)].append(path)
        res[h] = by
    with open(os.path.join(ROOT, 'seo', 'radar', 'classified.json'), 'w', encoding='utf-8') as f:
        json.dump({h: {t: v for t, v in d.items()} for h, d in res.items()}, f, ensure_ascii=False)
    # сводная матрица: тема x хост = число страниц
    topics = [t for t, _ in TOPICS] + ['_other', '_service']
    print('%-22s' % 'тема', ' '.join('%8s' % h.split('.')[0][:8] for h in res))
    for t in topics:
        row = [len(res[h].get(t, [])) for h in res]
        if sum(row) == 0: continue
        print('%-22s' % t, ' '.join('%8d' % c for c in row))

if __name__ == '__main__':
    hosts = sys.argv[1:] or ['copy.ru']
    main(hosts)
