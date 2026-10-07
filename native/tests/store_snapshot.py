"""Fail-closed inspection for synthetic file-origin native upgrade fixtures."""
from pathlib import Path
import hashlib,json,re,sqlite3
if not __debug__: raise RuntimeError("Refuse optimized execution: snapshot proof checks must remain enabled")
PRIMARY='couch-clash-native-mnf-2026-10-05-v1'
LEGACY='couch-clash-native-v1'
BACKUP=LEGACY+':v1-backup'
# Observed file/file SecurityOriginData on the tested iOS26.5 WebKit runtime.
# A new format must be inspected explicitly; never guess an origin from its folder hash.
FILE_ORIGIN=bytes.fromhex('040000000166696c65000000000100040000000166696c65000000000100')
LAYOUT=re.compile(r'Library/WebKit/com\.foculoom\.couchclash/WebsiteData/Default/([^/]+)/\1/LocalStorage/localstorage\.sqlite3')
def database(root):
 root=Path(root).resolve();candidates=list(root.rglob('localstorage.sqlite3'))
 assert len(candidates)==1,'Expected exactly one seeded storage database; absent or ambiguous'
 db=candidates[0];assert db.resolve().is_relative_to(root),'Database escapes app container'
 relative=db.relative_to(root).as_posix();assert LAYOUT.fullmatch(relative),'Unexpected app/database identity'
 origin=db.parent.parent/'origin';assert origin.is_file() and origin.read_bytes()==FILE_ORIGIN,'Wrong or unverified storage origin'
 return db,relative

def capture(root):
 db,relative=database(root)
 c=sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True)
 try:
  rows=c.execute('SELECT key,value FROM ItemTable').fetchall();assert len(rows)==len({k for k,_ in rows}),'Duplicate storage keys'
  values=dict(rows)
 finally:c.close()
 keys={}
 for key in [PRIMARY,LEGACY,BACKUP]:
  value=values.get(key)
  if key==BACKUP and key not in values:keys[key]={'present':False};continue
  assert isinstance(value,bytes) and value,'Expected nonempty seeded key: '+key
  try:obj=json.loads(value.decode('utf-16-le'))
  except (ValueError,UnicodeError) as e:raise AssertionError('Invalid seeded JSON: '+key) from e
  assert isinstance(obj,dict),'Expected seeded object'
  if key!=BACKUP:
   game=obj.get('current');assert isinstance(game,dict) and isinstance(game.get('id'),str) and game['id'],'Missing seeded current game'
   assert isinstance(game.get('players'),list) and len(game['players'])>=2,'Missing seeded players'
  keys[key]={'present':True,'bytes':len(value),'sha256':hashlib.sha256(value).hexdigest()}
 return {'schema':2,'bundle':'com.foculoom.couchclash','origin':'file/file','originMetadataSha256':hashlib.sha256(FILE_ORIGIN).hexdigest(),'database':relative,'keys':keys}

def verify(before,after):
 assert before.get('schema')==2 and after.get('schema')==2,'Unverified baseline format'
 for snapshot in [before,after]:
  for key in [PRIMARY,LEGACY]:
   item=snapshot['keys'][key];assert item.get('present') is True and item.get('bytes',0)>0 and re.fullmatch('[a-f0-9]{64}',item.get('sha256','')),'Baseline lacks nonempty seed evidence'
 assert before==after,'Seeded values/origin/database identity changed'
 return {'passed':True,'origin':after['origin'],'originMetadataSha256':after['originMetadataSha256'],'sameDatabaseIdentity':True,'keys':{k:{'before':before['keys'][k],'after':after['keys'][k]} for k in before['keys']}}
