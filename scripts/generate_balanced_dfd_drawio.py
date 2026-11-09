"""Generate intact high-contrast DFD images from 18 report use cases."""
from collections import defaultdict
from pathlib import Path
import argparse,html,json,xml.etree.ElementTree as ET
from PIL import ImageFont
from dfd_business_model import ACTORS,STORES,PARENTS,PROCESSES,DECOMPOSED,FAMILIES,EDGES,parent,level_three
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/diagram/dfd'
NAMES=['DFD_Level_0_Context','DFD_Level_1_System','DFD_Level_2_P1_Online_Payment','DFD_Level_2_P3_Map_POI','DFD_Level_2_P8_Chatbot_RAG','DFD_Level_2_P13_Content_Pipeline','DFD_Level_2_P18_Monitoring','DFD_Level_3_P13_2_Pipeline_Translation_TTS','DFD_Level_3_P8_4_RAG_Answer_Generation']
STORE_DATA={'D1':'Tài khoản và quyền','D2':'Phiên nội bộ','D3':'Phiên và hạn vé','D4':'Dữ liệu thanh toán','D5':'Danh mục ngôn ngữ','D6':'POI và văn bản','D7':'Thông tin audio','D8':'Tác vụ và trạng thái','D9':'Tour và thứ tự POI','D10':'Tài liệu và vector','D11':'Nhật ký thao tác','D12':'Nhật ký hỏi đáp','D13':'Lượt cấp bundle','R1':'Mã tạm và hạn mức','M1':'Dữ liệu âm thanh WAV'}
FONT=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',28)

def number(pid):return pid[1:].replace('_','.')+('.0' if '_' not in pid and pid!='P0' else '')
def wrap(text,width):
    lines=[]
    for paragraph in text.split('\n'):
        line=''
        for word in paragraph.split():
            trial=(line+' '+word).strip()
            if line and FONT.getlength(trial)>width:lines.append(line);line=word
            else:line=trial
        lines.append(line)
    return lines

def aggregate(edges,level):
    groups=defaultdict(list)
    for e in edges:
        src,dst=e['source'],e['target']
        if level==0:
            if not e['family']:continue
            src=src if src in ACTORS else 'P0';dst=dst if dst in ACTORS else 'P0'
        else:
            src,dst=parent(src),parent(dst)
            if src==dst:continue
        groups[(src,dst,e['family'])].append(e)
    result=[]
    for (src,dst,family),items in groups.items():
        if level==0:label=FAMILIES[family]
        elif src in STORES or dst in STORES:label=STORE_DATA[src if src in STORES else dst]
        else:label='; '.join(dict.fromkeys(e['label'] for e in items))
        result.append({'id':f'G{level}_{len(result)+1:03}','source':src,'target':dst,'label':label,'family':family,
                       'ucs':sorted({u for e in items for u in e['ucs']}),'components':[e['id'] for e in items],
                       'source_section':'; '.join(sorted({e['source_section'] for e in items}))})
    return result

def definitions(index):
    if index==0:return {'P0':'Hệ thống thuyết minh đa ngôn ngữ Thảo Cầm Viên Sài Gòn'},aggregate(EDGES,0),'MỨC 0 — NGỮ CẢNH HỆ THỐNG',list(range(1,19))
    if index==1:return PARENTS,aggregate(EDGES,1),'MỨC 1 — 18 CHỨC NĂNG TƯƠNG ỨNG UC-01–UC-18',list(range(1,19))
    if index<7:
        pid=DECOMPOSED[index-2]
        nodes={k:v[0] for k,v in PROCESSES.items() if k.startswith(pid+'_')}
        edges=[e for e in EDGES if e['source'] in nodes or e['target'] in nodes]
        return nodes,edges,f'MỨC 2 — {number(pid)} {PARENTS[pid].upper()}',[int(pid[1:])]
    pid='P13_2' if index==7 else 'P8_4'
    nodes,edges=level_three(pid)
    return nodes,edges,f'MỨC 3 — {number(pid)} {PROCESSES[pid][0].upper()}',[13 if index==7 else 8]

class Diagram:
    def __init__(self,name):
        self.name=name;self.root=ET.Element('root');ET.SubElement(self.root,'mxCell',id='0');ET.SubElement(self.root,'mxCell',id='1',parent='0');self.boxes={}
    def box(self,cid,label,x,y,w,h,kind,logical):
        style='whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=3.5;fontFamily=Arial;fontSize=28;fontStyle=1;align=center;verticalAlign=middle;spacing=8;'
        if kind=='process':style+='rounded=1;arcSize=10;'
        elif kind=='store':style+='shape=partialRectangle;left=1;right=0;top=1;bottom=1;'
        elif kind=='connector':style+='shape=ellipse;'
        elif kind=='title':style+='strokeColor=none;fontSize=36;spacing=0;'
        elif kind=='text':style+='strokeColor=none;spacing=0;'
        c=ET.SubElement(self.root,'mxCell',id=cid,parent='1',vertex='1',style=style,
                        value='<br/>'.join(html.escape(s) for s in wrap(label,w-18)),logicalId=logical,kind=kind)
        if kind=='process':c.set('primaryProcess','1')
        ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
        self.boxes[cid]=(x,y,w,h)
    def arrow(self,e,src,dst,yy,label_x,label_w):
        sx,sy,sw,sh=self.boxes[src];tx,ty,tw,th=self.boxes[dst]
        ax=sx+sw if sx<tx else sx;bx=tx if sx<tx else tx+tw
        a=((ax-sx)/sw,(yy-sy)/sh);b=((bx-tx)/tw,(yy-ty)/th)
        style=f'edgeStyle=none;rounded=0;strokeColor=#000000;strokeWidth=3.5;endArrow=block;endSize=14;endFill=1;exitX={a[0]};exitY={a[1]};entryX={b[0]};entryY={b[1]};exitPerimeter=0;entryPerimeter=0;'
        c=ET.SubElement(self.root,'mxCell',id=e['id'],parent='1',edge='1',source=src,target=dst,style=style,value='',flowLabel=e['label'],flowFamily=e.get('family') or '',components=','.join(e.get('components',[e['id']])),useCases=','.join(e['ucs']),basis=e['source_section'])
        ET.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
        shown=(e['family']+': ' if e.get('family') else '')+e['label']
        lines=wrap(shown,label_w-18);h=len(lines)*36+8
        self.box('label_'+e['id'],'\n'.join(lines),label_x,yy-h-12,label_w,h,'text','label')
        self.root[-1].set('labelFor',e['id'])
    def save(self,width,height):
        mx=ET.Element('mxfile',host='app.diagrams.net',version='24.7.17');d=ET.SubElement(mx,'diagram',id=self.name,name=self.name)
        m=ET.SubElement(d,'mxGraphModel',page='1',pageWidth=str(width),pageHeight=str(height),grid='1',gridSize='10');m.append(self.root)
        ET.indent(mx,space='  ');OUT.mkdir(parents=True,exist_ok=True);ET.ElementTree(mx).write(OUT/(self.name+'.drawio'),encoding='utf-8',xml_declaration=True)
        print(f'{self.name}: one image, {width}x{height}, {sum(e.get("edge")=="1" for e in self.root)} flows')

def render(index):
    from verify_lvl1_lvl2_balance import validate_business_sources
    validate_business_sources() # Re-read report/UC/schema BEFORE each drawing.
    nodes,edges,title,ucs=definitions(index)
    owned=defaultdict(list)
    for e in edges:
        owner=e['source'] if e['source'] in nodes else e['target'];owned[owner].append(e)
    layouts=[]
    for pid,label in nodes.items():
        groups={'left':defaultdict(list),'right':defaultdict(list)}
        for e in owned[pid]:
            other=e['target'] if e['source']==pid else e['source']
            side=('left' if other in ('E1','E2','E3') else 'right') if index==0 else ('right' if other in STORES else 'left')
            groups[side][other].append(e)
        cols={}
        for side,neighbors in groups.items():
            rows=[]
            for other,es in neighbors.items():
                for e in es:
                    shown=(e['family']+': ' if e.get('family') else '')+e['label']
                    h=max(136 if other.startswith('P') else 110,len(wrap(shown,252 if side=='left' else 272))*36+(84 if other.startswith('P') else 48))
                    rows.append((other,e,h))
            for other in dict.fromkeys(r[0] for r in rows):
                if other.startswith('P'):continue
                positions=[j for j,r in enumerate(rows) if r[0]==other]
                label2=other+'\n'+(ACTORS[other] if other in ACTORS else STORES[other][0])
                needed=len(wrap(label2,172))*36+24
                actual=sum(rows[j][2]+16 for j in positions)-16
                if needed>actual:
                    j=positions[-1];rows[j]=(other,rows[j][1],rows[j][2]+needed-actual)
            cols[side]=rows
        height=max(300,len(wrap(number(pid)+'\n'+label,242))*36+36,max(sum(r[2]+16 for r in col)-16 for col in cols.values()))
        layouts.append((pid,label,cols,height))
    count=1 if index==0 else 4 if index==1 else 2
    width=count*1280+40;d=Diagram(NAMES[index]);d.box('title','DFD '+title,20,12,width-40,62,'title','title')
    note='UC: '+', '.join(f'{u:02}' for u in ucs)+' | * = Could Have'
    d.box('note',note,20,82,width-40,48,'text','note')
    y=160
    for offset in range(0,len(layouts),count):
        row=layouts[offset:offset+count];row_height=max(v[3] for v in row)
        for col,(pid,label,columns,height) in enumerate(row):
            x=col*1280
            d.box(pid,number(pid)+'\n\n'+label,x+490,y,260,height,'process',pid)
            if index==1:d.root[-1].set('useCase',f'UC-{int(pid[1:]):02}')
            for side,items in columns.items():
                cy=y;aliases={}
                for n,(other,e,h) in enumerate(items):
                    is_peer=other.startswith('P')
                    if is_peer:
                        alias=f'{other}__{pid}_{n}';d.box(alias,number(other),x+110,cy+h-100,100,100,'connector',other)
                    elif other not in aliases:
                        alias=f'{other}__{pid}';total=sum(r[2]+16 for r in items[n:] if r[0]==other)-16
                        label2=(other+'\n'+ACTORS[other]) if other in ACTORS else other+'\n'+STORES[other][0]
                        d.box(alias,label2,x+(20 if side=='left' else 1050),cy,190,total,'actor' if other in ACTORS else 'store',other);aliases[other]=alias
                    else:alias=aliases[other]
                    src,dst=(alias,pid) if e['source']==other else (pid,alias)
                    d.arrow(e,src,dst,cy+h-(50 if is_peer else 16),x+(218 if side=='left' else 758),272 if side=='left' else 292)
                    cy+=h+16
        y+=row_height+120
    footer='Vòng tròn đánh số là đầu nối đến tiến trình cùng mã. Tác nhân và kho cùng mã là cùng một phần tử.'
    d.box('legend',footer,20,y-40,width-40,110,'text','legend');d.save(width,y+90)

def main():
    p=argparse.ArgumentParser();p.add_argument('--only',type=int,choices=range(9));args=p.parse_args()
    for i in ([args.only] if args.only is not None else range(9)):render(i)
    (OUT/'dfd_data_dictionary.json').write_text(json.dumps({'actors':ACTORS,'stores':STORES,'functions':PARENTS,'decomposed':DECOMPOSED,'processes':PROCESSES,'families':FAMILIES,'flows':EDGES},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
