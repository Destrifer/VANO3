import zipfile, re, json, sys, os
from xml.etree import ElementTree as ET

path = sys.argv[1]
NS = {
    'm':'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'pr':'http://schemas.openxmlformats.org/package/2006/relationships',
}

z = zipfile.ZipFile(path)

# shared strings
shared = []
if 'xl/sharedStrings.xml' in z.namelist():
    t = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in t.findall('m:si', NS):
        # concatenate all text nodes
        txt = ''.join(node.text or '' for node in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
        shared.append(txt)

# workbook sheets -> name + r:id
wb = ET.fromstring(z.read('xl/workbook.xml'))
sheets = []
for s in wb.find('m:sheets', NS).findall('m:sheet', NS):
    name = s.get('name')
    rid = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
    sheets.append((name, rid))

# rels rId -> target
rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
rid_target = {}
for rel in rels:
    rid_target[rel.get('Id')] = rel.get('Target')

def col_to_idx(ref):
    m = re.match(r'([A-Z]+)(\d+)', ref)
    col = m.group(1)
    n = 0
    for c in col:
        n = n*26 + (ord(c)-64)
    return n-1

def cell_val(c):
    t = c.get('t')
    v = c.find('m:v', NS)
    if t == 's':
        if v is None: return ''
        return shared[int(v.text)]
    if t == 'inlineStr':
        is_ = c.find('m:is', NS)
        if is_ is not None:
            return ''.join(node.text or '' for node in is_.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
        return ''
    if v is None: return ''
    return v.text

result = {}
for name, rid in sheets:
    target = rid_target[rid]
    if not target.startswith('xl/'):
        target = 'xl/' + target
    ws = ET.fromstring(z.read(target))
    rows_out = []
    for row in ws.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        cells = {}
        maxc = 0
        for c in row.findall('m:c', NS):
            ref = c.get('r')
            ci = col_to_idx(ref)
            cells[ci] = cell_val(c)
            maxc = max(maxc, ci)
        rowlist = [cells.get(i,'') for i in range(maxc+1)]
        rows_out.append(rowlist)
    result[name] = rows_out

out = os.path.join(os.path.dirname(path) if os.path.dirname(path) else '.', 'dump.json')
outpath = sys.argv[2] if len(sys.argv) > 2 else 'dump.json'
with open(outpath, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)

# summary
print("SHEETS:")
for name in result:
    rows = result[name]
    print(f"  - {name!r}: {len(rows)} rows")
    for r in rows[:3]:
        print("      ", r)
