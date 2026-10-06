"""Compare synthetic simulator store bytes. Never run on an installation with real user data."""
from pathlib import Path
import argparse,json,sqlite3,subprocess
p=argparse.ArgumentParser();p.add_argument('operation',choices=['capture','verify']);p.add_argument('--simulator',required=True);p.add_argument('--baseline',type=Path,required=True);a=p.parse_args()
root=Path(subprocess.check_output(['xcrun','simctl','get_app_container',a.simulator,'com.foculoom.couchclash','data'],text=True).strip());report={}
for path in root.rglob('localstorage.sqlite3'):
 c=sqlite3.connect('file:'+str(path)+'?mode=ro',uri=True)
 report.update({k:v.hex() if isinstance(v,bytes) else v for k,v in c.execute('select key,value from ItemTable')});c.close()
keys=['couch-clash-native-v1','couch-clash-native-v1:v1-backup','couch-clash-native-mnf-2026-10-05-v1']
report={k:report.get(k) for k in keys}
if a.operation=='capture':a.baseline.parent.mkdir(parents=True,exist_ok=True);a.baseline.write_text(json.dumps(report,indent=2))
else:
 assert report==json.loads(a.baseline.read_text()),'Original native store bytes changed'
 print('PASS original native store and backup presence/bytes preserved')
