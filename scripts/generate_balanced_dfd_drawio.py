"""Generate DFDs after validating the approved report/use-case baseline."""
from collections import defaultdict
from pathlib import Path
import argparse
import html
import json
import re
import textwrap
import xml.etree.ElementTree as ET
from dfd_business_model import ACTORS, STORES, PARENTS, PROCESSES, FAMILIES, EDGES, parent, level_three
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/diagram/dfd'
NAMES=['DFD_Level_0_Context','DFD_Level_1_System','DFD_Level_2_P1_Payment_Session','DFD_Level_2_P2_Visitor_Content_Audio','DFD_Level_2_P3_Chatbot_RAG','DFD_Level_2_P4_Content_Knowledge_Admin','DFD_Level_2_P5_Auth_Admin_Monitoring','DFD_Level_3_P4_2_Pipeline_Translation_TTS','DFD_Level_3_P3_4_RAG_Answer_Generation']
def number(pid): return pid[1:].replace('_','.')+('.0' if '_' not in pid and pid!='P0' else '')
def aggregate(edges,level):
 groups=defaultdict(list)
 for e in edges:
  src,dst=e['source'],e['target']
  if level==0:
   if not e['family']:continue
   src=src if src in ACTORS else 'P0';dst=dst if dst in ACTORS else 'P0'
   key=(src,dst,e['family'])
  else:
   src,dst=parent(src),parent(dst)
   if src==dst:continue
   key=(src,dst,e['family'] or 'store')
  groups[key].append(e)
 result=[]
 for (src,dst,family),items in groups.items():
  if family in FAMILIES: label=FAMILIES[family]
  else:
   sid=src if src in STORES else dst
   label=('Tra cứu ' if src==sid else 'Ghi/cập nhật ')+STORES[sid][0].lower()
  result.append({'id':f'G{level}_{len(result)+1:03}','source':src,'target':dst,'label':label,
   'family':family if family in FAMILIES else None,'ucs':sorted({u for e in items for u in e['ucs']}),
   'components':[e['id'] for e in items], 'source_section':'; '.join(sorted({e['source_section'] for e in items}))})
 return result

def definitions(index):
 if index==0:return {'P0':'Hệ thống thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn'},aggregate(EDGES,0),'MỨC 0 — NGỮ CẢNH HỆ THỐNG',list(range(1,19))
 if index==1:return PARENTS,aggregate(EDGES,1),'MỨC 1 — CÁC NHÓM CHỨC NĂNG',list(range(1,19))
 if index<7:
  pid=f'P{index-1}'
  nodes={k:v[0] for k,v in PROCESSES.items() if parent(k)==pid}
  edges=[e for e in EDGES if parent(e['source'])==pid or parent(e['target'])==pid]
  ucs=sorted({int(u[3:]) for e in edges for u in e['ucs']})
  return nodes,edges,f'MỨC 2 — {number(pid)} {PARENTS[pid].upper()}',ucs
 pid='P4_2' if index==7 else 'P3_4'
 nodes,edges=level_three(pid)
 return nodes,edges,f'MỨC 3 — {number(pid)} {PROCESSES[pid][0].upper()}',[13 if index==7 else 8]

class Diagram:
 def __init__(self,name,title):
  self.name=name;self.root=ET.Element('root');ET.SubElement(self.root,'mxCell',id='0');ET.SubElement(self.root,'mxCell',id='1',parent='0');self.boxes={};self.width=1940;self.height=900
  self.box('title',title,20,10,1900,35,'title','title')
 def box(self,cid,label,x,y,w,h,kind,logical):
  style='whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#17202A;strokeWidth=1.7;fontFamily=Arial;fontSize=13;align=center;verticalAlign=middle;'
  if kind=='process':style+='rounded=1;arcSize=12;fontStyle=1;'
  elif kind=='store':style+='shape=partialRectangle;left=1;right=0;top=1;bottom=1;fillColor=#F5F6F7;'
  elif kind=='title':style+='strokeColor=none;fontSize=17;fontStyle=1;'
  else:style+='rounded=0;fontStyle=1;'
  c=ET.SubElement(self.root,'mxCell',id=cid,parent='1',vertex='1',style=style,value=label,logicalId=logical)
  ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
  self.boxes[cid]=(x,y,w,h)
 def arrow(self,e,src,dst,points,labelpoint):
  def port(cid,p):
   x,y,w,h=self.boxes[cid];return ((p[0]-x)/w,(p[1]-y)/h)
  a,b=port(src,points[0]),port(dst,points[-1])
  style=f'edgeStyle=none;rounded=0;html=1;strokeColor=#34495E;strokeWidth=1.3;endArrow=block;endFill=1;exitX={a[0]:.12f};exitY={a[1]:.12f};entryX={b[0]:.12f};entryY={b[1]:.12f};exitPerimeter=0;entryPerimeter=0;'
  c=ET.SubElement(self.root,'mxCell',id=e['id'],parent='1',edge='1',source=src,target=dst,style=style,value='',flowLabel=e['label'],flowFamily=e.get('family') or '',components=','.join(e.get('components',[e['id']])),useCases=','.join(e['ucs']),basis=e['source_section'])
  g=ET.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
  arr=ET.SubElement(g,'Array',attrib={'as':'points'})
  for x,y in points[1:-1]:ET.SubElement(arr,'mxPoint',x=str(x),y=str(y))
  prefix=(e['family']+': ') if e.get('family') else ''
  lines=textwrap.wrap(prefix+e['label'],width=43,break_long_words=False)
  lab=ET.SubElement(self.root,'mxCell',id='label_'+e['id'],parent='1',vertex='1',style='text;html=1;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=none;fontFamily=Arial;fontSize=12;align=center;verticalAlign=middle;spacing=1;',value='<br/>'.join(html.escape(line) for line in lines),labelFor=e['id'])
  h=max(21,len(lines)*16)
  width=min(380,max(60,max(len(line) for line in lines)*6.6+12))
  ET.SubElement(lab,'mxGeometry',x=str(labelpoint[0]-width/2),y=str(labelpoint[1]-h/2),width=str(width),height=str(h),attrib={'as':'geometry'})
 def save(self):
  mx=ET.Element('mxfile',host='app.diagrams.net',version='24.7.17')
  d=ET.SubElement(mx,'diagram',id=self.name,name=self.name)
  m=ET.SubElement(d,'mxGraphModel',page='1',pageWidth=str(self.width),pageHeight=str(self.height),grid='1',gridSize='10',math='0',shadow='0')
  m.append(self.root);ET.indent(mx,space='  ')
  OUT.mkdir(parents=True,exist_ok=True)
  ET.ElementTree(mx).write(OUT/(self.name+'.drawio'),encoding='utf-8',xml_declaration=True)
  print(f'Generated {self.name}: {len([e for e in self.root if e.get("edge")=="1"])} flows, {self.width}x{self.height}')

def render(index):
 # Source evidence is verified BEFORE laying out this diagram, not after all files.
 from verify_lvl1_lvl2_balance import validate_business_sources
 validate_business_sources()
 nodes,edges,title,ucs=definitions(index)
 d=Diagram(NAMES[index],'DFD '+title)
 d.box('note','UC: '+', '.join(f'{n:02}' for n in ucs)+' | Kho cùng mã là cùng một kho; * = Could Have',20,47,1900,32,'title','note')
 # Duplicate only external entities, stores, and outside-scope peer processes.
 # Real subprocesses have one vertex each; their internal edges are routed below.
 top=105;layouts={}
 for pid,label in nodes.items():
  incident=[e for e in edges if pid in (e['source'],e['target'])]
  neighbors=defaultdict(list)
  for e in incident:
   other=e['target'] if e['source']==pid else e['source']
   if other not in nodes:neighbors[other].append(e)
  left=[(n,es) for n,es in neighbors.items() if n not in STORES]
  right=[(n,es) for n,es in neighbors.items() if n in STORES]
  if index==0:
   left=[(n,es) for n,es in neighbors.items() if n in ('E1','E2','E3')]
   right=[(n,es) for n,es in neighbors.items() if n not in ('E1','E2','E3')]
  size=lambda pairs:sum(max(72,len(es)*44+20)+18 for n,es in pairs)
  height=max(125,size(left)-18,size(right)-18)
  d.box(pid,number(pid)+'\n\n'+label,800,top,300,height,'process',pid)
  layouts[pid]=(top,height)
  for side,pairs in [('left',left),('right',right)]:
   y=top
   for other,es in pairs:
    h=max(72,len(es)*44+20);alias=other+'__'+pid
    if other in ACTORS:kind='actor';name=ACTORS[other]
    elif other in STORES:kind='store';name=other+' | '+STORES[other][0]
    else:kind='process';name=number(other)+' | '+PROCESSES[other][0]+'\n(tham chiếu mức cha)'
    x=30 if side=='left' else 1580
    d.box(alias,name,x,y,300,h,kind,other)
    for k,e in enumerate(es):
     yy=y+20+(k+.5)*(h-40)/len(es)
     if side=='left': a=(330,yy);b=(800,yy);lp=(565,yy)
     else:a=(1100,yy);b=(1580,yy);lp=(1340,yy)
     src,dst=(alias,pid) if e['source']==other else (pid,alias)
     pts=[a,b] if src==alias and side=='left' or src==pid and side=='right' else [b,a]
     d.arrow(e,src,dst,pts,lp)
    y+=h+18
  top+=height+125
 # Internal data flows, independent of persistence/shared neighbors.
 interior=[e for e in edges if e['source'] in nodes and e['target'] in nodes]
 for i,e in enumerate(interior):
  src,dst=e['source'],e['target'];sy,sh=layouts[src];ty,th=layouts[dst]
  if list(nodes).index(dst)==list(nodes).index(src)+1:
   x=945+(i%2)*35;pts=[(x,sy+sh),(x,ty)];lp=(x,sy+sh+(ty-sy-sh)/2)
  else:
   gutter=735+(i%5)*10;yy=sy+sh+30+(i%2)*28;end=ty+th-20
   pts=[(850,sy+sh),(850,yy),(gutter,yy),(gutter,end),(800,end)];lp=(740,yy)
  d.arrow(e,src,dst,pts,lp)
 d.height=top-60
 d.save()
 return nodes,edges

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--only',type=int,choices=range(9));args=parser.parse_args()
 for index in ([args.only] if args.only is not None else range(9)):render(index)
 (OUT/'dfd_data_dictionary.json').write_text(json.dumps({'actors':ACTORS,'stores':STORES,'processes':PROCESSES,'families':FAMILIES,'flows':EDGES},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
