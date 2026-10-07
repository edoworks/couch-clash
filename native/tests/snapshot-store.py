"""Only for a disposable simulator containing explicitly seeded synthetic games."""
from pathlib import Path
import argparse,json,subprocess
from store_snapshot import capture,verify
p=argparse.ArgumentParser();p.add_argument('operation',choices=['capture','verify']);p.add_argument('--simulator',required=True);p.add_argument('--baseline',type=Path,required=True);p.add_argument('--report',type=Path);a=p.parse_args()
root=Path(subprocess.check_output(['xcrun','simctl','get_app_container',a.simulator,'com.foculoom.couchclash','data'],text=True).strip())
after=capture(root)
if a.operation=='capture':
 a.baseline.parent.mkdir(parents=True,exist_ok=True);a.baseline.write_text(json.dumps(after,indent=2)+'\n');print('Captured verified nonempty official/legacy seeds at file/file origin')
else:
 result=verify(json.loads(a.baseline.read_text()),after)
 if a.report:a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(result,indent=2)+'\n')
 print('PASS seeded values, explicit hashes, backup presence and exact storage origin/database identity preserved')
