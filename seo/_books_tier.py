# -*- coding: utf-8 -*-
# Tier-разметка ядра книг (Шаг 4.5 PLAYBOOK). Вход: data/queries_books_master.csv.
# Выход: распределение в консоль/отчёт + data/books_tier.csv + van2/seo/SEO-ядро_книги_Tier.xlsx
import csv, os, re, zipfile
from collections import defaultdict

HERE=os.path.dirname(os.path.abspath(__file__))
SRC=os.path.join(HERE,'data','queries_books_master.csv')
rows=list(csv.DictReader(open(SRC,encoding='utf-8-sig')))

def has(s,*subs): return any(x in s for x in subs)

# --- цыр.бренды/спам-домены, фразы ---
CYR_BRANDS=['принт 24','принт24','полиграфмастер','полиграф мастер','цопы','тпс медиа','мы рядом',
 'гарант','элис групп','прожектор принт','пд мастер','принтбук','принбук','эдитус','ридеро','принтков',
 'зса-принт','капитал','вишневый пирог','информполиграф','файн арт','fineart','a-kem','capitalpress','bulanty',
 'pressfactor','print24','editus','cherrypie','gcprint','printsreda','des print','printside','printkov','printbook',
 'tprint','pm1','abscolor','kpole','tpsprint']
PHONE=['+7','642 46 17','7863830','5556513','499 642']

EXCLUDE_MEM=['пожирател','пятая печать','печать смерти','печать сумрака','печать демона','печать безумных',
 'печать нострадамуса','эльфийк','семью печат','семи печат','за семью','печати апокалипсиса','седьмая печать',
 'книга рекордов','черная печать','аристократ','найт печать','сокровище','скайрим','книга за семью']
EXCLUDE_DOC=['домовой','домовая','кассов','доходов и расходов','учета доходов','учёта доходов','трудов','книжек',
 'книга покупок','книга жалоб','прошито','прошнуров','пронумеров','сшито пронум','инвалидност','скреплено печатью']
EXCLUDE_STAMP=['экслибрис','личной библиотек','домашней библиотек','личную библиотек','библиотеки личной',
 'штамп','сургуч','для тиснения','рельефная печать','именная печать','библиотечный','библиотекар','17 стран',
 'на 17 стр','личной библиотеки','для книги из личной','книге домашней']
EXCLUDE_READ=['аудиокниг','читать','слушать','электронн','скачать','epub','fb2','самиздат','читалк','читалка',
 'народная читалка']
EXCLUDE_RETAIL=['купить книг','магазин','в наличии','книжная палата','дистрибуц','распространение','дом книги печать',
 'бумажном','бумажном носителе','в печатном виде','в бумажном']
EXCLUDE_CAP=['офсет','ризограф','в китае','китае']
EXCLUDE_DIY=['своими руками','в домашних','книгу дома','книги в домашних','принтер для печати','станок','оборудование',
 'из интернета','документа книгой','в ворде',' ворд','word','фотошоп','photoshop','двусторонняя печать','из pdf','книги из pdf','в виде книги pdf','pdf в виде','формате книги pdf']
EXCLUDE_TRIVIA=['на печать 99','формат бумаги','ширина листа','соотношению','фаворск','московский политех',
 'высшая школа печати','значение','означает','что значит','фразеологизм','сонник','приснил','о чем','краткое содержание',
 'отзывы','краткое']
EXCLUDE_GEO=['спб',' петербург','петербурге','екатеринбург','новосибирск','краснодар','иркутск','астрахань',
 'нижний новгород','нижнем новгороде']
EXCLUDE_FICTAUTHOR=['чехов','грибоедов','добролюбов','забелин','зернова','анатомии человека','архитектуры москвы',
 'панш','ференц шанта','лукьяненко','а.с.зернова','орнаментика','рецептов для мультиварки','грибоедов бумага']
EXCLUDE_3D=['3д печат','3d печат','3д модель','stl','подставка для книг','держатели книг','подставка под учебник']
EXCLUDE_DECOR=['муляж','имитация книг','декоративные книги','корешки книг для печати','книги муляж']

def excluded(q):
    s=' '+q+' '
    if has(s,*PHONE): return 'спам/телефон'
    if has(s,*CYR_BRANDS): return 'бренд-конкурент'
    if has(s,*EXCLUDE_MEM): return 'мем/худлит'
    if has(s,*EXCLUDE_DOC): return 'госдок/учёт'
    if has(s,*EXCLUDE_STAMP): return 'штамп/оттиск (не книга)'
    if has(s,*EXCLUDE_READ): return 'читать/аудио/электрон'
    if has(s,*EXCLUDE_RETAIL): return 'ритейл/магазин'
    if has(s,*EXCLUDE_CAP): return 'capability (офсет/ризо/китай)'
    if has(s,*EXCLUDE_DIY): return 'DIY/оборудование/word'
    if has(s,*EXCLUDE_TRIVIA): return 'инфо-trivia'
    if has(s,*EXCLUDE_GEO): return 'гео не-Москва'
    if has(s,*EXCLUDE_FICTAUTHOR): return 'автор/худлит'
    if has(s,*EXCLUDE_3D): return '3D/модель'
    if has(s,*EXCLUDE_DECOR): return 'муляж/декор'
    if 'красная книга' in s or 'красной книги' in s or 'обложка красн' in s: return 'красная книга (картинки)'
    return None

# Tier-1 плитки (своя ось)
def tier1(q):
    s=' '+q+' '
    if has(s,'малым тираж','малый тираж','маленьким тираж','небольшим тираж','малыми тираж','малых тираж','малый тираж'): return ('Tier-1','/books/small-batch')
    if has(s,'1 экземпляр','одном экземпляре','одного экземпляра','от 1 экз','1 экз','одну книгу','одной книги','авторск','для себя','собственн','по требованию','штучно','одного экз'): return ('Tier-1','/books/single-copy')
    if has(s,'твердом переплет','твердый переплет','твёрд','твердой обложк','7бц','твердом перепл','твердом','твёрдом'): return ('Tier-1','/books/hardcover')
    if has(s,'мягком переплет','мягкий переплет','мягкой обложк','мягкой','кбс'): return ('Tier-1','/books/softcover')
    if has(s,'детск'): return ('Tier-1','/books/children')
    if has(s,'кожан','подарочн','эксклюзивн','золочение','обреза','обрез','премиум','репринт','красивый переплет'): return ('Tier-1','/books/leather')
    if has(s,'срочн'): return ('Tier-1','/books/urgent')
    return None

# STANDALONE кросс-продукты (своя секция/раздел)
def standalone(q):
    s=' '+q+' '
    if has(s,'фотокниг','фото книг','фото книги','с фотографиями','альбом'): return 'фотокниги (photobooks)'
    if has(s,'закладк'): return 'закладки'
    if has(s,'тетрад'): return 'тетради (copybooks)'
    if has(s,'журнал'): return 'журналы (magazines)'
    if has(s,'каталог'): return 'каталоги'
    if has(s,'буклет','брошюр','флаер','листовк'): return 'брошюры/буклеты'
    if has(s,'суперобложк'): return 'суперобложка'
    return None

def tier(q,cat):
    ex=excluded(q)
    if ex: return ('EXCLUDE',ex,'')
    if cat=='BRANDED': return ('EXCLUDE','бренд-конкурент','')
    t1=tier1(q)
    if t1: return (t1[0],'',t1[1])
    st=standalone(q)
    if st: return ('STANDALONE',st,'')
    # Tier-3 вхождения (всё остальное коммерческое + инфо к хабу)
    return ('Tier-3','','/books (хаб)')

agg=defaultdict(lambda:{'n':0,'d':0})
out=[]
for r in rows:
    q=r['query']; d=int(r['demand'] or 0); cat=r['category']
    tr,flag,page=tier(q,cat)
    key=tr if tr!='Tier-1' else page
    agg[key]['n']+=1; agg[key]['d']+=d
    out.append((q,d,tr,page,flag,cat))

# отчёт
lines=[]
order=['Tier-3','/books/small-batch','/books/single-copy','/books/hardcover','/books/softcover','/books/children','/books/leather','/books/urgent','STANDALONE','EXCLUDE']
total_d=sum(int(r['demand'] or 0) for r in rows)
lines.append(f"ВСЕГО {len(rows)} запросов, спрос {total_d}\n")
lines.append(f"{'КАТЕГОРИЯ':28s} {'n':>5s} {'спрос':>8s} {'доля%':>6s}")
seen=set()
def line(k):
    a=agg.get(k);
    if not a: return
    seen.add(k)
    lines.append(f"{k:28s} {a['n']:5d} {a['d']:8d} {100*a['d']/total_d:6.1f}")
for k in order: line(k)
for k in agg:
    if k not in seen: line(k)
# EXCLUDE по причинам
exr=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='EXCLUDE': exr[flag]['n']+=1; exr[flag]['d']+=d
lines.append("\n-- EXCLUDE по причинам --")
for k,a in sorted(exr.items(),key=lambda x:-x[1]['d']):
    lines.append(f"  {k:30s} n={a['n']:4d} спрос={a['d']}")
# STANDALONE по типам
str_=defaultdict(lambda:{'n':0,'d':0})
for q,d,tr,page,flag,cat in out:
    if tr=='STANDALONE': str_[flag]['n']+=1; str_[flag]['d']+=d
lines.append("\n-- STANDALONE по типам --")
for k,a in sorted(str_.items(),key=lambda x:-x[1]['d']):
    lines.append(f"  {k:30s} n={a['n']:4d} спрос={a['d']}")
rep='\n'.join(lines)
open(os.path.join(HERE,'report_books_tier.txt'),'w',encoding='utf-8').write(rep)
print(rep)

# CSV
with open(os.path.join(HERE,'data','books_tier.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['Запрос','Спрос','Tier','Целевая страница','Флаг','ИсхКатегория'])
    for q,d,tr,page,flag,cat in sorted(out,key=lambda x:-x[1]):
        w.writerow([q,d,tr,page,flag,cat])

# --- минимальный xlsx writer ---
def xlsx(path, header, data):
    def esc(x): return str(x).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')
    def cell(v):
        if isinstance(v,(int,)) or (isinstance(v,str) and v.isdigit()):
            return f'<c t="n"><v>{int(v)}</v></c>'
        return f'<c t="inlineStr"><is><t xml:space="preserve">{esc(v)}</t></is></c>'
    rows_xml=[]
    allrows=[header]+data
    for ri,row in enumerate(allrows,1):
        cells=''.join(cell(v) for v in row)
        rows_xml.append(f'<row r="{ri}">{cells}</row>')
    sheet=('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      f'<sheetData>{"".join(rows_xml)}</sheetData></worksheet>')
    wb=('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      '<sheets><sheet name="Tier" sheetId="1" r:id="rId1"/></sheets></workbook>')
    wbrels=('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
    ct=('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      '<Default Extension="xml" ContentType="application/xml"/>'
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
    rels=('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',ct)
        z.writestr('_rels/.rels',rels)
        z.writestr('xl/workbook.xml',wb)
        z.writestr('xl/_rels/workbook.xml.rels',wbrels)
        z.writestr('xl/worksheets/sheet1.xml',sheet)

data=[[q,d,tr,page,flag] for q,d,tr,page,flag,cat in sorted(out,key=lambda x:-x[1])]
dst='C:/Users/user/Desktop/van2/seo/SEO-ядро_книги_Tier.xlsx'
xlsx(dst,['Запрос','Спрос','Tier','Целевая страница','Флаг'],data)
print('\nxlsx ->',dst)
