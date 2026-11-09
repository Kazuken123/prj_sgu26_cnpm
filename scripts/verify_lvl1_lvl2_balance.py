"""Check conservation, store directions, decomposition boundaries and geometry."""
from collections import Counter
from pathlib import Path
import html
import re
import sys
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
DFD = ROOT / 'docs/diagram/dfd'
NAMES = ['DFD_Level_0_Context', 'DFD_Level_1_System',
 'DFD_Level_2_P1_Payment_Session', 'DFD_Level_2_P2_Visitor_Content_Audio',
 'DFD_Level_2_P3_Chatbot_RAG', 'DFD_Level_2_P4_Content_Knowledge_Admin',
 'DFD_Level_2_P5_Auth_Admin_Monitoring',
 'DFD_Level_3_P4_2_Pipeline_Translation_TTS', 'DFD_Level_3_P3_4_RAG_Answer_Generation']
def clean(value):
 return re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', html.unescape(value))).strip()
def logical(identifier):
 return re.match(r'[ED]\d+', identifier)[0] if identifier.startswith(('E','D')) else re.sub(r'_In$', '', identifier)
def parse(name):
 return {c.get('id'):c for c in ET.parse(DFD/(name+'.drawio')).findall('.//mxCell')}
def edges(cells):
 return [(c.get('id'),c.get('source'),c.get('target'),clean(c.get('value',''))) for c in cells.values() if c.get('edge')=='1']
def external(arrows):
 return Counter((cid.upper(),logical(src) if src.startswith('E') else logical(dst),'in' if src.startswith('E') else 'out',label) for cid,src,dst,label in arrows if src.startswith('E') or dst.startswith('E'))
def stores(arrows,process):
 return {(logical(src),'read') if src.startswith('D') else (logical(dst),'write') for _,src,dst,_ in arrows if (src.startswith('D') and process(dst)) or (dst.startswith('D') and process(src))}
def boundary(arrows,inside):
 return Counter((logical(dst),'out',label) if inside(src) else (logical(src),'in',label) for _,src,dst,label in arrows if inside(src)!=inside(dst))
def geometry(cells):
 errors=[]
 for cid,src,dst,_ in edges(cells):
  c=cells[cid]
  style=dict(x.split('=',1) for x in c.get('style','').split(';') if '=' in x)
  route=[]
  for bid,prefix in ((src,'exit'),(dst,'entry')):
   g=cells[bid].find('mxGeometry')
   x,y,w,h=(float(g.get(k,0)) for k in ('x','y','width','height'))
   ax,ay=(float(style[prefix+k]) for k in ('X','Y'))
   if not (-1e-8<=ax<=1+1e-8 and -1e-8<=ay<=1+1e-8): errors.append(f'{cid}: port outside {bid}')
   route.append((x+w*ax,y+h*ay))
  route[1:1]=[(float(p.get('x')),float(p.get('y'))) for p in c.findall('./mxGeometry/Array/mxPoint')]
  for a,b in zip(route,route[1:]):
   if abs(a[0]-b[0])>.02 and abs(a[1]-b[1])>.02: errors.append(f'{cid}: diagonal {a} -> {b}')
 return errors
def main():
 failures=[]
 def check(ok,label,details=''):
  print(('PASS ' if ok else 'FAIL ')+label)
  if not ok: failures.append(label+': '+str(details))
 diagrams=[parse(n) for n in NAMES]
 flows=[edges(c) for c in diagrams]
 canonical=external(flows[0])
 check(sum(canonical.values())==20 and sum(v for k,v in canonical.items() if k[2]=='in')==10 and {k[0] for k in canonical}=={f'F{i:02}' for i in range(1,21)},'Level 0: F01-F20, 10 in / 10 out')
 check(external(flows[1])==canonical,'Level 0 = Level 1 external IDs, actors, directions and labels')
 check(external(sum(flows[2:7],[]))==canonical,'Level 0 = combined Level 2 external flows')
 for i,a2 in enumerate(flows[2:7],1):
  pid=f'P{i}'
  a1=[a for a in flows[1] if pid in a[1:3]]
  check(external(a1)==external(a2),pid+': external balance')
  check(stores(a1,lambda p:p==pid)==stores(a2,lambda p:p.startswith(pid+'_')),pid+': store read/write balance')
 for parent,pi,ci in [('P4_2',5,7),('P3_4',4,8)]:
  a=boundary(flows[pi],lambda p:p==parent)
  b=boundary(flows[ci],lambda p:p.startswith(parent+'_') and not p.endswith('_In'))
  check(a==b,parent+': exact Level 2 / Level 3 boundary multiset',{'parent':list(a.elements()),'child':list(b.elements())})
 for name,cells in zip(NAMES,diagrams):
  errors=geometry(cells)
  check(not errors,name+': axial segments and valid ports',errors)
 if failures:
  print('\n'.join(failures))
  return 1
 print('All DFD conservation and geometry checks passed.')
 return 0
if __name__=='__main__':
 sys.exit(main())
