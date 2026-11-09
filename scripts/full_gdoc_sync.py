"""Prepare scoped Google Docs synchronization data for the connected Docs tool.

This command never mutates a document itself. Consumers must read the current
revision, resize Table 3.19 to 21 rows, then apply cell/paragraph edits in reverse
index order and insert each local image with the connector image_uris sidecar.
"""
import argparse
import json
from pathlib import Path
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
DOC_ID='18w13JYpDX6dCXFww2o7HBQEDcMAaNlEQsbBBl3cL4Dk'
TAB_ID='t.0'
MD_PATH=ROOT/'docs/DFD_Report_Section_3_4.md'
def build_clean_gdoc_ops():
 lines=MD_PATH.read_text(encoding='utf-8').splitlines()
 ops=[]
 i=0
 while i<len(lines):
  line=lines[i].strip()
  if not line or line=='---': i+=1; continue
  if line.startswith('|'):
   rows=[]
   while i<len(lines) and lines[i].strip().startswith('|'):
    cells=[c.strip() for c in lines[i].split('|')[1:-1]]
    if not all(re.fullmatch(':?-+:?',c) for c in cells): rows.append(cells)
    i+=1
   ops.append({'kind':'table','rows':rows})
   continue
  if line.startswith('!['):
   match=re.search(r'\]\((.*?)\)',line)
   path=(ROOT/'docs'/match[1]).resolve()
   if not path.is_file(): raise FileNotFoundError(path)
   ops.append({'kind':'image','path':str(path)})
  else:
   ops.append({'kind':'paragraph','text':line.lstrip('#').strip().strip('*')})
  i+=1
 return ops
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--manifest',type=Path,help='Write structured data for the Docs connector; omit to print JSON')
 args=parser.parse_args()
 data={'documentId':DOC_ID,'tabId':TAB_ID,'elements':build_clean_gdoc_ops()}
 assert len([x for x in data['elements'] if x['kind']=='image'])==9
 assert len([x for x in data['elements'] if x['kind']=='table'])==10
 payload=json.dumps(data,ensure_ascii=False,indent=2)
 if args.manifest: args.manifest.write_text(payload,encoding='utf-8')
 else: print(payload)
