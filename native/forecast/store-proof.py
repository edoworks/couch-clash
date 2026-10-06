"""Inspect only the default social-game store; named forecast stores are separate."""
import argparse,sys,subprocess,sqlite3,json,hashlib,re
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests'))
from store_snapshot import FILE_ORIGIN,LAYOUT,PRIMARY,LEGACY,BACKUP,verify
p=argparse.ArgumentParser();p.add_argument('operation',choices=['capture','verify']);p.add_argument('--simulator',required=True);p.add_argument('--baseline',type=Path,required=True);p.add_argument('--report',type=Path);a=p.parse_args()
root=Path(subprocess.check_output(['xcrun','simctl','get_app_container',a.simulator,'com.foculoom.couchclash','data'],text=True).strip()).resolve()
found=[x for x in root.rglob('localstorage.sqlite3') if LAYOUT.fullmatch(x.relative_to(root).as_posix())]
assert len(found)==1,'Expected exactly one default social-game DB'
db=found[0];assert db.resolve().is_relative_to(root)
assert (db.parent.parent/'origin').read_bytes()==FILE_ORIGIN
with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as c: values=dict(c.execute('select key,value from ItemTable'))
keys={}
for k in [PRIMARY,LEGACY,BACKUP]:
 if k==BACKUP and k not in values:keys[k]={'present':False};continue
 v=values[k];assert isinstance(v,bytes) and v
 obj=json.loads(v.decode('utf-16-le'));assert isinstance(obj,dict)
 if k!=BACKUP:assert isinstance(obj['current']['id'],str) and len(obj['current']['players'])>=2
 keys[k]={'present':True,'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest()}
assert 'couch-clash-ios-forecast-journal-v1' not in values,'Journal leaked into social store'
snapshot={'schema':2,'bundle':'com.foculoom.couchclash','origin':'file/file','originMetadataSha256':hashlib.sha256(FILE_ORIGIN).hexdigest(),'database':db.relative_to(root).as_posix(),'keys':keys}
if a.operation=='capture':a.baseline.write_text(json.dumps(snapshot,indent=2)+'\n')
else:
 result=verify(json.loads(a.baseline.read_text()),snapshot)
 if a.report:a.report.write_text(json.dumps(result,indent=2)+'\n')
print('PASS',a.operation,'nonempty default social-store bytes and file/file identity; forecast key absent')
