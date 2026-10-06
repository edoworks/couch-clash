import json,sqlite3,tempfile,unittest,subprocess,sys
from pathlib import Path
from store_snapshot import PRIMARY,LEGACY,FILE_ORIGIN,capture,verify
class SnapshotTests(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
 def tearDown(self):self.tmp.cleanup()
 def seed(self,name='fixture',origin=FILE_ORIGIN,empty=False):
  folder=self.root/'Library/WebKit/com.foculoom.couchclash/WebsiteData/Default'/name/name;folder.mkdir(parents=True);(folder/'origin').write_bytes(origin);(folder/'LocalStorage').mkdir();c=sqlite3.connect(folder/'LocalStorage/localstorage.sqlite3');c.execute('CREATE TABLE ItemTable (key TEXT UNIQUE,value BLOB)')
  if not empty:
   value=json.dumps({'version':1,'current':{'id':'synthetic-game','players':[{'name':'One'},{'name':'Two'}]}}).encode('utf-16-le')
   for key in [PRIMARY,LEGACY]:c.execute('INSERT INTO ItemTable VALUES (?,?)',(key,value))
  c.commit();c.close()
 def test_optimized_execution_fails(self):
  r=subprocess.run([sys.executable,'-O','-c','import store_snapshot'],cwd=Path(__file__).parent,capture_output=True)
  self.assertNotEqual(r.returncode,0)
 def test_empty_container_fails(self):
  with self.assertRaises(AssertionError):capture(self.root)
 def test_empty_database_fails(self):
  self.seed(empty=True)
  with self.assertRaises(AssertionError):capture(self.root)
 def test_wrong_origin_fails(self):
  self.seed(origin=b'https://example.invalid')
  with self.assertRaises(AssertionError):capture(self.root)
 def test_duplicate_origins_fail(self):
  self.seed('one');self.seed('two')
  with self.assertRaises(AssertionError):capture(self.root)
 def test_wrong_database_identity_fails(self):
  self.seed();p=next(self.root.rglob('localstorage.sqlite3'));p.rename(p.parent/'wrong.sqlite3')
  with self.assertRaises(AssertionError):capture(self.root)
 def test_valid_seeded_control_and_hashes(self):
  self.seed();a=capture(self.root);r=verify(a,capture(self.root));self.assertTrue(r['passed']);self.assertGreater(r['keys'][PRIMARY]['before']['bytes'],0)
 def test_unverified_null_baseline_fails(self):
  self.seed()
  with self.assertRaises(AssertionError):verify({'keys':{PRIMARY:None,LEGACY:None}},capture(self.root))
 def test_changed_value_fails(self):
  self.seed();a=capture(self.root);p=next(self.root.rglob('localstorage.sqlite3'));c=sqlite3.connect(p);value=json.dumps({'current':{'id':'changed','players':[{},{}]}}).encode('utf-16-le');c.execute('UPDATE ItemTable SET value=? WHERE key=?',(value,PRIMARY));c.commit();c.close()
  with self.assertRaises(AssertionError):verify(a,capture(self.root))
if __name__=='__main__':unittest.main()
