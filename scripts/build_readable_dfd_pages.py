"""Paginate the approved DFDs without changing their business data flows.

Each report page is a window onto the same diagram, not another DFD level.
Shared process/entity/store identifiers retain their meaning across pages.
"""
from collections import Counter, defaultdict
from pathlib import Path
import argparse
import html
import json
import sys
import xml.etree.ElementTree as ET
from PIL import Image, ImageFont
from generate_balanced_dfd_drawio import definitions, number, NAMES
from dfd_business_model import ACTORS, STORES, PROCESSES
from verify_lvl1_lvl2_balance import validate_business_sources

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/diagram/dfd/report'
EXPORT = ROOT / 'docs/diagram/export/dfd-report'
WORK = ROOT / '.local-data/dfd-readable'
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
WIDTH = 1040
MAX_COLUMN = 880


def wrap(text, width, font=FONT):
    lines = []
    for paragraph in text.split('\n'):
        line = ''
        for word in paragraph.split():
            candidate = (line + ' ' + word).strip()
            if line and font.getlength(candidate) > width:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    return lines


def label(e):
    return (e['family'] + ': ' if e.get('family') else '') + e['label']


def neighbor_label(other, nodes):
    if other in ACTORS:
        return ACTORS[other], 'actor'
    if other in STORES:
        return other + '\n' + STORES[other][0], 'store'
    # A peer process is a reference, not a duplicate new subprocess.
    return number(other) + '\nTham chiếu tiến trình', 'reference'


def split_groups(groups):
    def group_minimum(other):
        name, _ = neighbor_label(other, {})
        return len(wrap(name, 150))*30+24
    def height(rows):
        total = 0
        for other in dict.fromkeys(r[0] for r in rows):
            group = [r for r in rows if r[0]==other]
            total += max(sum(r[2]+14 for r in group)-14, group_minimum(other))+14
        return total-14
    pages = [[]]
    for other, edges in groups:
        for e in edges:
            row_height = max(84, len(wrap(label(e), 218)) * 30 + 40)
            candidate = (other,e,row_height)
            if height(pages[-1]+[candidate]) > MAX_COLUMN and pages[-1]:
                pages.append([])
            pages[-1].append(candidate)
    for rows in pages:
        for other in dict.fromkeys(r[0] for r in rows):
            positions = [i for i,r in enumerate(rows) if r[0]==other]
            actual = sum(rows[i][2]+14 for i in positions)-14
            if actual < group_minimum(other):
                i = positions[-1]
                rows[i] = (other,rows[i][1],rows[i][2]+group_minimum(other)-actual)
    return pages


def vertex(root, cid, logical, text, x, y, w, h, kind):
    style = ('whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111111;'
             'strokeWidth=2;fontFamily=Arial;fontSize=24;align=center;'
             'verticalAlign=middle;spacing=8;')
    if kind == 'process':
        style += 'rounded=1;arcSize=12;fontStyle=1;'
    elif kind == 'store':
        style += 'shape=partialRectangle;left=1;right=0;top=1;bottom=1;'
    elif kind == 'reference':
        style += 'rounded=1;dashed=1;'
    elif kind == 'text':
        style += 'strokeColor=none;spacing=0;'
    elif kind == 'title':
        style += 'strokeColor=none;fontStyle=1;spacing=0;'
    c = ET.SubElement(root, 'mxCell', id=cid, parent='1', vertex='1',
                      logicalId=logical, style=style,
                      value='<br/>'.join(html.escape(v) for v in wrap(text, w if kind=='text' else w-18)))
    ET.SubElement(c, 'mxGeometry', x=str(x), y=str(y), width=str(w),
                  height=str(h), attrib={'as': 'geometry'})
    return c


def make_page(name, pid, nodes, left, right, index, part, total, title):
    root = ET.Element('root')
    ET.SubElement(root, 'mxCell', id='0')
    ET.SubElement(root, 'mxCell', id='1', parent='0')
    fig = f'Hình 3.{38+index}'
    heading = f'{fig} — DFD mức {0 if index == 0 else 1 if index == 1 else 2 if index < 7 else 3}'
    subtitle = f'Phần {part}/{total} · Tiến trình {number(pid)} · ' + nodes[pid]
    h1 = len(wrap(heading, 982)) * 30
    h2 = len(wrap(subtitle, 982)) * 30
    vertex(root, 'title', 'title', heading, 20, 12, 1000, h1, 'title')
    vertex(root, 'subtitle', 'subtitle', subtitle, 20, 18+h1, 1000, h2, 'title')
    top = 38+h1+h2
    height = max(230, len(wrap(number(pid)+'\n\n'+nodes[pid],182))*30+32,
                 sum(r[2]+14 for r in left)-14,
                 sum(r[2]+14 for r in right)-14)
    vertex(root, pid, pid, number(pid)+'\n\n'+nodes[pid],
           420, top, 200, height, 'process')
    for side, rows in [('left', left), ('right', right)]:
        y = top
        aliases = {}
        for n, (other, e, row_height) in enumerate(rows):
            x = 20 if side == 'left' else 850
            if other not in aliases:
                alias = f'{other}__{pid}_{side}_{n}'
                text, kind = neighbor_label(other, nodes)
                group_height=sum(r[2]+14 for r in rows[n:] if r[0]==other)-14
                vertex(root,alias,other,text,x,y,170,group_height,kind)
                aliases[other]=(alias,y,group_height)
            alias, alias_y, alias_height = aliases[other]
            # Put the label above a fully visible arrow. A white label placed
            # on the centre of a short arrow hides almost the entire line.
            yy = y + row_height-16
            src, dst = (alias, pid) if e['source'] == other else (pid, alias)
            outward = e['source'] == pid
            ax, bx = ((420, 190) if outward else (190, 420)) if side == 'left' else ((620, 850) if outward else (850, 620))
            def port(cid, px):
                bx0, by0, bw, bh = ((420, top, 200, height) if cid == pid
                                    else (x, alias_y, 170, alias_height))
                return (px-bx0)/bw, (yy-by0)/bh
            a, b = port(src, ax), port(dst, bx)
            style = (f'edgeStyle=none;rounded=0;html=1;strokeColor=#111111;'
                     f'strokeWidth=2;endArrow=block;endFill=1;'
                     f'exitX={a[0]};exitY={a[1]};entryX={b[0]};entryY={b[1]};'
                     'exitPerimeter=0;entryPerimeter=0;')
            edge = ET.SubElement(root, 'mxCell', id=e['id'], parent='1', edge='1',
                                 source=src, target=dst, style=style, value='',
                                 flowLabel=e['label'], components=','.join(e.get('components',[e['id']])),
                                 useCases=','.join(e['ucs']))
            ET.SubElement(edge, 'mxGeometry', relative='1', attrib={'as':'geometry'})
            lines = wrap(label(e), 218)
            label_height = len(lines)*30+6
            vertex(root, 'label_'+e['id'], 'label', '\n'.join(lines),
                   196 if side=='left' else 626, yy-label_height-10,
                   218, label_height, 'text')
            y += row_height+14
    footer = 'Các khối cùng mã là cùng một phần tử trong sơ đồ. Khối nét đứt là tham chiếu tiến trình.'
    foot_h = len(wrap(footer, 982))*30+8
    vertex(root, 'note', 'note', footer, 20, top+height+22, 1000, foot_h, 'text')
    page_height = top+height+foot_h+60
    assert page_height <= 1180, (name, pid, page_height)
    diagram = ET.Element('diagram', id=f'{name}_{part:02}', name=f'{fig} - {part}/{total}')
    model = ET.SubElement(diagram, 'mxGraphModel', page='1', pageWidth=str(WIDTH),
                          pageHeight=str(page_height), grid='1', gridSize='10')
    model.append(root)
    return diagram, page_height


def build(index, render=False):
    validate_business_sources()  # Re-read approved UC/report/schema before each diagram.
    nodes, edges, title, _ = definitions(index)
    buckets = defaultdict(list)
    for e in edges:
        owner = e['source'] if e['source'] in nodes else e['target']
        buckets[owner].append(e)
    planned = []
    for pid in nodes:
        groups = {'left': defaultdict(list), 'right': defaultdict(list)}
        for e in buckets[pid]:
            other = e['target'] if e['source'] == pid else e['source']
            side = ('left' if other in ('E1','E2','E3') else 'right') if index==0 else ('right' if other in STORES else 'left')
            groups[side][other].append(e)
        left = split_groups(groups['left'].items())
        right = split_groups(groups['right'].items())
        for j in range(max(len(left), len(right))):
            planned.append((pid, left[j] if j<len(left) else [], right[j] if j<len(right) else []))
    mx = ET.Element('mxfile', host='app.diagrams.net', version='24.7.17')
    records = []
    for part, (pid, left, right) in enumerate(planned, 1):
        diagram, height = make_page(NAMES[index],pid,nodes,left,right,index,part,len(planned),title)
        mx.append(diagram)
        page_name = NAMES[index] + f'_part_{part:02}'
        page_path = WORK / (page_name+'.drawio')
        single = ET.Element('mxfile', host='app.diagrams.net')
        single.append(ET.fromstring(ET.tostring(diagram)))
        ET.indent(single, space='  ')
        ET.ElementTree(single).write(page_path,encoding='utf-8',xml_declaration=True)
        png = EXPORT / (page_name+'.png')
        record = {'image':png.relative_to(ROOT).as_posix(), 'part':part,
                  'total':len(planned), 'process':pid,
                  'flows':[e['id'] for _,e,_ in left+right],
                  'width_units':WIDTH,'height_units':height,'font_units':24,
                  'width_pt':446.4,'max_height_pt':504}
        if render:
            from render_all_drawio_png import render_diagram
            assert render_diagram(page_name, str(page_path), str(png)), page_name
        if png.exists():
            with Image.open(png) as im:
                record['height_pt']=min(504,446.4*im.height/im.width)
                record['width_pt']=min(446.4,504*im.width/im.height)
                # Small pages are tightly cropped by the PNG renderer. Its
                # 2x pixel scale, rather than the uncropped canvas height,
                # determines the actual printed glyph size.
                record['min_font_pt']=round(24*2*record['width_pt']/im.width,2)
                assert record['min_font_pt']>=10, record
        records.append(record)
    expected = Counter(e['id'] for e in edges)
    assert Counter(f for r in records for f in r['flows'])==expected
    ET.indent(mx,space='  ')
    ET.ElementTree(mx).write(OUT/(NAMES[index]+'.drawio'),encoding='utf-8',xml_declaration=True)
    print(f'{NAMES[index]}: {len(records)} readable parts, {len(edges)} unchanged flows')
    return {'figure':f'Hình 3.{38+index}', 'name':NAMES[index], 'pages':records}


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    p=argparse.ArgumentParser();p.add_argument('--render',action='store_true');p.add_argument('--only',type=int)
    args=p.parse_args()
    for path in (OUT,EXPORT,WORK):path.mkdir(parents=True,exist_ok=True)
    records=[build(i,args.render) for i in ([args.only] if args.only is not None else range(9))]
    if args.only is None:
        (OUT/'dfd_report_pages.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
