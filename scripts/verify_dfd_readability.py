"""Check readable report views against the unchanged approved DFDs."""
from collections import Counter
from pathlib import Path
import html
import json
import re
import xml.etree.ElementTree as ET
from PIL import Image
from generate_balanced_dfd_drawio import definitions, NAMES
from verify_lvl1_lvl2_balance import validate_business_sources, geometry

ROOT=Path(__file__).resolve().parents[1]


def main():
    validate_business_sources()
    records=json.loads((ROOT/'docs/diagram/dfd/report/dfd_report_pages.json').read_text(encoding='utf-8'))
    count=0
    for index,record in enumerate(records):
        _,expected,_,_=definitions(index)
        seen=[]
        diagrams=ET.parse(ROOT/'docs/diagram/dfd/report'/(NAMES[index]+'.drawio')).findall('diagram')
        assert len(diagrams)==len(record['pages'])
        for diagram,page in zip(diagrams,record['pages']):
            cells={c.get('id'):c for c in diagram.findall('.//mxCell')}
            assert not geometry(cells),geometry(cells)
            for edge in cells.values():
                if edge.get('edge')!='1':continue
                match=next(e for e in expected if e['id']==edge.get('id'))
                assert cells[edge.get('source')].get('logicalId')==match['source']
                assert cells[edge.get('target')].get('logicalId')==match['target']
                assert edge.get('flowLabel')==match['label']
                seen.append(edge.get('id'))
                label=cells['label_'+edge.get('id')]
                text=html.unescape(re.sub('<br/>',' ',label.get('value')))
                assert re.sub(r'\s+',' ',match['label']) in re.sub(r'\s+',' ',text)
                lg=label.find('mxGeometry')
                assert float(lg.get('height'))>=label.get('value').count('<br/>')*30+30
                style=dict(v.split('=',1) for v in edge.get('style').split(';') if '=' in v)
                sg=cells[edge.get('source')].find('mxGeometry')
                arrow_y=float(sg.get('y'))+float(sg.get('height'))*float(style['exitY'])
                assert float(lg.get('y'))+float(lg.get('height'))<=arrow_y-4
            with Image.open(ROOT/page['image']) as im:
                printed_font=24*2*page['width_pt']/im.width
                assert printed_font>=10,(record['name'],page['part'],printed_font)
                assert page['height_pt']<=504 and page['width_pt']<=446.4
                assert abs(page['height_pt']/page['width_pt']-im.height/im.width)<0.001
            for c in cells.values():
                if c.get('vertex')=='1':
                    assert float(re.search(r'fontSize=(\d+)',c.get('style')).group(1))>=24
            count+=1
        assert Counter(seen)==Counter(e['id'] for e in expected)
        print('PASS',record['name'],':',len(diagrams),'parts, all flows unchanged')
    print(f'PASS {count} report images at minimum 10 pt, valid arrows and exact flow coverage')


if __name__=='__main__':main()
