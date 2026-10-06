"""Local unsigned review artifact audit; not an upload authorization."""
from pathlib import Path
import subprocess,hashlib,plistlib,json,sys
root=Path(__file__).resolve().parents[1];app=Path(sys.argv[1])
info=plistlib.loads((app/'Info.plist').read_bytes());binary=app/'CouchClash'
assert info['MinimumOSVersion']=='18.0'
strings=subprocess.check_output(['strings',str(binary)],text=True)
for marker in ['--forecast-probe','--forecast-fake','--forecast-qa','Forecast native probe PASS']:assert marker not in strings,marker
loads=subprocess.check_output(['otool','-l',str(binary)],text=True)
assert 'cmd LC_LOAD_WEAK_DYLIB\n      cmdsize 96\n         name /System/Library/Frameworks/FoundationModels.framework/FoundationModels' in loads
for directory in ['Web','ForecastWeb']:
 for p in (root/'CouchClash'/directory).rglob('*'):
  if p.is_file():assert p.read_bytes()==(app/p.relative_to(root/'CouchClash')).read_bytes(),str(p)
source={str(p.relative_to(root.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/'CouchClash').rglob('*')) if p.is_file()}
source['native/project.yml']=hashlib.sha256((root/'project.yml').read_bytes()).hexdigest()
Path(sys.argv[2]).write_text(json.dumps({'unsigned':True,'uploadCandidate':False,'buildNumberNotFinal':info['CFBundleVersion'],'minimumOS':info['MinimumOSVersion'],'FoundationModelsWeakLinked':True,'debugForecastHooksAbsent':True,'runtimeResourcesMatch':True,'binarySHA256':hashlib.sha256(binary.read_bytes()).hexdigest(),'sourceSHA256':source},indent=2)+'\n')
print('PASS unsigned device artifact: iOS18, weak model framework, no debug forecast hooks, exact resources')
