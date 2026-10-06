"""Seed an explicit synthetic legacy fixture on a disposable simulator. Refuses overwrite."""
import argparse,json,sqlite3,subprocess
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests'))
from store_snapshot import LEGACY,LAYOUT,FILE_ORIGIN
def database(root):
 found=[p for p in root.rglob('localstorage.sqlite3') if LAYOUT.fullmatch(p.relative_to(root).as_posix())]
 assert len(found)==1,'Expected one default social store'
 db=found[0];assert (db.parent.parent/'origin').read_bytes()==FILE_ORIGIN
 return db,db.relative_to(root).as_posix()
p=argparse.ArgumentParser();p.add_argument('--simulator',required=True);p.add_argument('--confirm-disposable-test-device',action='store_true',required=True);a=p.parse_args()
root=Path(subprocess.check_output(['xcrun','simctl','get_app_container',a.simulator,'com.foculoom.couchclash','data'],text=True).strip());db,_=database(root)
game={'version':2,'id':'synthetic-legacy-upgrade-fixture','mode':'host','phase':'picks','names':['Player 1','Player 2'],'players':[{'name':'Player 1','picks':{'0':1,'1':0,'2':0},'boost':None,'locked':[True,False]},{'name':'Player 2','picks':{'0':0},'boost':None,'locked':[False,False]}],'round':0,'active':1,'answers':{}}
final=json.loads(json.dumps(game));final.update(id='synthetic-legacy-final',phase='podium',round=1,answers={str(i):0 for i in range(5)})
for player in final['players']:player['picks']={str(i):-1 for i in range(5)};player['locked']=[True,True]
store={'version':2,'current':game,'history':[{'id':final['id'],'savedAt':1,'game':final}],'theme':'default','paused':False,'boardOpen':False,'savedAt':1}
c=sqlite3.connect(db)
try:
 assert c.execute('SELECT COUNT(*) FROM ItemTable WHERE key=?',(LEGACY,)).fetchone()[0]==0,'Refusing to overwrite an existing legacy value'
 c.execute('INSERT INTO ItemTable(key,value) VALUES (?,?)',(LEGACY,json.dumps(store,separators=(',',':')).encode('utf-16-le')));c.commit()
finally:c.close()
print('Seeded only the explicit synthetic legacy fixture; existing keys untouched')
