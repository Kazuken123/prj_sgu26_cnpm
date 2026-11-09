"""Validate source scope, business contracts, DFD conservation and geometry."""
from collections import Counter
from pathlib import Path
import re
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile
from dfd_business_model import ACTORS, STORES, PARENTS, DECOMPOSED, PROCESSES, EDGES, parent, level_three
ROOT=Path(__file__).resolve().parents[1]
DFD=ROOT/'docs/diagram/dfd'
NAMES=['DFD_Level_0_Context','DFD_Level_1_System','DFD_Level_2_P1_Online_Payment','DFD_Level_2_P3_Map_POI','DFD_Level_2_P8_Chatbot_RAG','DFD_Level_2_P13_Content_Pipeline','DFD_Level_2_P18_Monitoring','DFD_Level_3_P13_2_Pipeline_Translation_TTS','DFD_Level_3_P8_4_RAG_Answer_Generation']

def source_snapshot():
 ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
 with ZipFile(ROOT/'docs/CNPM_BAOCAO.docx') as z:body=ET.fromstring(z.read('word/document.xml')).find('w:body',ns)
 digest=lambda b:hashlib.sha256(b).hexdigest()
 snapshot={'schema':digest((ROOT/'database/init_db.sql').read_bytes()),'use_cases':{},'use_case_diagrams':{}}
 outside=[];in_dfd=False
 for node in body:
  text=' '.join(t.text or '' for t in node.findall('.//w:t',ns))
  if text.startswith('3.4. Sơ đồ luồng dữ liệu'):in_dfd=True
  if text.startswith('CHƯƠNG 4: THIẾT KẾ HỆ THỐNG'):in_dfd=False
  if not in_dfd:outside.append(text)
  if node.tag.endswith('}tbl'):
   rows=node.findall('w:tr',ns)
   if not rows:continue
   first=[''.join(t.text or '' for t in c.findall('.//w:t',ns)) for c in rows[0].findall('w:tc',ns)]
   if first and first[0].startswith('Mã Use Case'):snapshot['use_cases'][first[1]]=digest(re.sub(r'\s+',' ',text).encode())
 snapshot['report_business_text']=digest(re.sub(r'\s+',' ',' '.join(outside)).encode())
 for path in sorted((ROOT/'docs/diagram/use case').glob('*.draw*')):snapshot['use_case_diagrams'][path.name]=digest(path.read_bytes())
 return snapshot

def validate_business_sources():
 manifest=DFD/'dfd_source_manifest.json'
 if manifest.exists():assert source_snapshot()==json.loads(manifest.read_text(encoding='utf-8')),'Business sources changed; review UC/report/schema before drawing'
 schema=set(re.findall(r'^CREATE TABLE (\w+)\s*\(', (ROOT/'database/init_db.sql').read_text(),re.M))
 mapped=[t for _,tables in STORES.values() for t in tables]
 assert set(mapped)==schema and len(mapped)==len(schema)==16,'Store mapping must cover the 16 report tables exactly once'
 assert not any(t.startswith('ANALYTICS_') for t in mapped),'No unapproved GPS/analytics scope'
 with ZipFile(ROOT/'docs/CNPM_BAOCAO.docx') as z:body=ET.fromstring(z.read('word/document.xml'))
 ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
 active=' '.join(t.text or '' for t in body.findall('.//w:t',ns))
 uc_names={}
 for tb in body.findall('.//w:tbl',ns):
  rows=tb.findall('w:tr',ns)
  if not rows:continue
  cells=rows[0].findall('w:tc',ns)
  values=[''.join(t.text or '' for t in c.findall('.//w:t',ns)).strip() for c in cells]
  if not values or not values[0].startswith('Mã Use Case'):continue
  code=values[1]
  for row in rows:
   cs=row.findall('w:tc',ns)
   if cs and 'Use Case Name' in ''.join(t.text or '' for t in cs[0].findall('.//w:t',ns)):
    uc_names['P'+str(int(code[3:]))]=''.join(t.text or '' for t in cs[1].findall('.//w:t',ns)).strip()
 assert len(PARENTS)==18 and PARENTS==uc_names,'Level 1 must match all 18 source use cases one-to-one'
 assert not re.search(r'\bMP3\b',active,re.I),'Report audio format has not been unified'
 for c in (ROOT/'docs/diagram/use case').glob('*.draw*'):
  assert 'CHÙA LINH ỨNG' not in c.read_text(encoding='utf-8'),c.name
 codes={u for e in EDGES for u in e['ucs']}
 assert codes=={f'UC-{i:02}' for i in range(1,19)},'Missing UC traceability'
 # Independent business contracts, deliberately not generated from the model.
 triples={(e['source'],e['target'],e['family']) for e in EDGES}
 for required in [('P8_2','E6','F25'),('E6','P8_2','F26'),('P8_2','P8_3',None),('P8_3','P8_4',None),('P8_4','E6','F27'),('E6','P8_4','F28'),('E2','P9','F11'),('E2','P10','F11'),('E3','P16','F19'),('E3','P17','F19'),('E3','P18_1','F19'),('E2','P14','F09'),('E2','P15','F09')]:
  assert required in triples,f'Missing required UC flow {required}'
 stats={e['source'] for e in EDGES if e['target']=='P18_2'}
 assert {'D3','D4','D7','D8','D12','D13'}<=stats,'Monitoring must read its real business sources'
 assert not any(e['source']=='P7' and e['target'] in STORES for e in EDGES),'UC-07 cannot persist a visitor-specific tour'
 assert not any(parent(e['source']) in ('P3','P4') and e['target']=='D11' for e in EDGES),'Bundle access is D13, not audit'
 assert not any(e['source']=='P17' and e['target'] in STORES for e in EDGES),'UC-17 is read-only'
 assert not any(parent(e['source'])=='P18' and e['target'] in STORES for e in EDGES),'UC-18 is read-only'
 for e in EDGES:
  assert e['source'] in ACTORS or e['source'] in STORES or e['source'] in PROCESSES,e
  assert e['target'] in ACTORS or e['target'] in STORES or e['target'] in PROCESSES,e
  assert e['source'] in PROCESSES or e['target'] in PROCESSES,'Direct entity/store connection'
 return True

def parse(name):return {c.get('id'):c for c in ET.parse(DFD/(name+'.drawio')).findall('.//mxCell')}
def edges(cells):return [c for c in cells.values() if c.get('edge')=='1']
def logical(cells,cid):return cells[cid].get('logicalId',cid)
def components(c):return c.get('components','').split(',')
def external(cells):
 out=Counter()
 for e in edges(cells):
  src,dst=logical(cells,e.get('source')),logical(cells,e.get('target'))
  if src in ACTORS or dst in ACTORS:
   for token in components(e):out[(token,src if src in ACTORS else dst,'in' if src in ACTORS else 'out')]+=1
 return out

def stores(cells,pid):
 result=set()
 for e in edges(cells):
  src,dst=logical(cells,e.get('source')),logical(cells,e.get('target'))
  if src in STORES and parent(dst)==pid:result.add((src,'read'))
  if dst in STORES and parent(src)==pid:result.add((dst,'write'))
 return result

def boundary(cells,inside):
 result=Counter()
 for e in edges(cells):
  src,dst=logical(cells,e.get('source')),logical(cells,e.get('target'))
  if inside(src)!=inside(dst):
   for token in components(e):result[(token,dst if inside(src) else src,'out' if inside(src) else 'in')]+=1
 return result

def geometry(cells):
 errors=[]
 for e in edges(cells):
  style=dict(x.split('=',1) for x in e.get('style','').split(';') if '=' in x);route=[]
  for key,prefix in [('source','exit'),('target','entry')]:
   box=cells[e.get(key)].find('mxGeometry');x,y,w,h=[float(box.get(k,0)) for k in ['x','y','width','height']]
   ax,ay=float(style[prefix+'X']),float(style[prefix+'Y'])
   if not (0<=ax<=1 and 0<=ay<=1):errors.append(e.get('id')+': port outside box')
   route.append((x+w*ax,y+h*ay))
  route[1:1]=[(float(p.get('x')),float(p.get('y'))) for p in e.findall('./mxGeometry/Array/mxPoint')]
  if any(abs(a[0]-b[0])>.001 and abs(a[1]-b[1])>.001 for a,b in zip(route,route[1:])):errors.append(e.get('id')+': diagonal')
 return errors

def main():
 validate_business_sources();print('PASS approved report, 18 UC, 16 SQL tables and business contracts')
 docs=[parse(n) for n in NAMES]
 assert external(docs[0])==external(docs[1]),'Level 0/1 external component conservation failed'
 primary=[c for c in docs[1].values() if c.get('primaryProcess')=='1']
 assert {c.get('logicalId') for c in primary}==set(PARENTS) and len(primary)==18
 print('PASS Level 1: exactly 18 primary functions, one per UC; context data conserved')
 for i,pid in enumerate(DECOMPOSED,2):
  a=boundary(docs[1],lambda p:p==pid)
  b=boundary(docs[i],lambda p:p.startswith(pid+'_'))
  # Peer children at level 2 are compared by their level-1 parent.
  normalized=Counter()
  for (token,other,direction),count in b.items():normalized[(token,parent(other),direction)]+=count
  assert a==normalized,(pid,a-normalized,normalized-a)
  assert stores(docs[1],pid)==stores(docs[i],pid),pid+' store mismatch'
 print('PASS boundaries and store directions for all 5 decomposed functions; other 13 are level-1 leaves')
 for pid,pi,ci in [('P13_2',5,7),('P8_4',4,8)]:
  a=boundary(docs[pi],lambda p:p==pid);b=boundary(docs[ci],lambda p:p.startswith(pid+'_'))
  assert a==b,(pid,a-b,b-a)
 print('PASS both Level 3 boundary component multisets')
 for name,cells in zip(NAMES,docs):
  assert not geometry(cells),(name,geometry(cells))
  assert all(e.get('useCases') and e.get('basis') for e in edges(cells)),name+' has untraced flow'
  print('PASS '+name+': ports, axial segments and UC provenance')
 return 0
if __name__=='__main__':sys.exit(main())
