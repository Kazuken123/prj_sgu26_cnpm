"""Check intact high-resolution figures, bold text and visible thick arrows."""
from pathlib import Path
from PIL import Image
import xml.etree.ElementTree as ET
from generate_balanced_dfd_drawio import NAMES
from verify_lvl1_lvl2_balance import main as verify_business
ROOT=Path(__file__).resolve().parents[1]

def main():
    verify_business()
    for name in NAMES:
        tree=ET.parse(ROOT/'docs/diagram/dfd'/(name+'.drawio'))
        assert len(tree.findall('diagram'))==1,name+' must be one intact diagram'
        model=tree.find('.//mxGraphModel')
        for c in tree.findall('.//mxCell'):
            style=dict(v.split('=',1) for v in c.get('style','').split(';') if '=' in v)
            if c.get('vertex')=='1':
                assert int(style['fontSize'])>=28 and style['fontStyle']=='1'
            if c.get('edge')=='1':
                assert float(style['strokeWidth'])>=3.5
                label=tree.find(f'.//mxCell[@labelFor="{c.get("id")}"]')
                g=label.find('mxGeometry');src=tree.find(f'.//mxCell[@id="{c.get("source")}"]/mxGeometry')
                arrow_y=float(src.get('y'))+float(src.get('height'))*float(style['exitY'])
                assert float(g.get('y'))+float(g.get('height'))<=arrow_y-8
        with Image.open(ROOT/'docs/diagram/export'/(name+'.png')) as im:
            assert im.width*im.height<=25_000_000
            glyph_pixels=28*im.width/float(model.get('pageWidth'))
            assert glyph_pixels>=18,(name,glyph_pixels)
        print('PASS',name,': one image, bold text, thick visible arrows, high-resolution glyphs')

if __name__=='__main__':main()
