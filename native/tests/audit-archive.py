from pathlib import Path
import argparse,plistlib,subprocess,hashlib,json
p=argparse.ArgumentParser();p.add_argument('archive',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
app=a.archive/'Products/Applications/CouchClash.app';info=plistlib.load((app/'Info.plist').open('rb'))
files={str(p.relative_to(app)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(app.rglob('*')) if p.is_file()}
binary=app/'CouchClash';strings=subprocess.check_output(['strings',str(binary)],text=True)
assert not any(t in strings for t in ['--score-test-','testProtocolClasses','DebugScoreProbe'])
assert not (app/'embedded.mobileprovision').exists();assert not list(app.rglob('*.framework'))
libs=subprocess.check_output(['otool','-L',str(binary)],text=True).splitlines()[1:]
signing=subprocess.run(['codesign','-dv',str(app)],capture_output=True,text=True)
result={'candidateVersion':info['CFBundleShortVersionString'],'candidateBuild':info['CFBundleVersion'],'bundleIdentifier':info['CFBundleIdentifier'],'developerSigned':False,'codesignInspectionExit':signing.returncode,'installableOrUploadable':False,'webBase':'65813dde8d24f70e7743282fa3d4a2c2167d3989','appTreeSha256':hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest(),'binarySha256':files['CouchClash'],'bundledThirdPartyFrameworks':[],'debugFailureFlagsAndInjectionHooksPresent':False,'embeddedProvisioningProfile':False,'privacyManifest':plistlib.load((app/'PrivacyInfo.xcprivacy').open('rb')),'privacyManifestApproval':'pending review for connected behavior','xcodePrivacyReport':'not generated; remaining release review/tooling pass','systemLibraries':[s.strip().split(' (')[0] for s in libs],'files':files}
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,indent=2)+'\n');print('Unsigned candidate app tree:',result['appTreeSha256'])
