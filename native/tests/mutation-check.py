"""Build a disposable missing-guard mutant; the bridge test must fail after its positive control."""
from pathlib import Path
import argparse,shutil,subprocess,json
p=argparse.ArgumentParser();p.add_argument('--simulator',required=True);p.add_argument('--run-name',default='guard-mutation');a=p.parse_args();assert a.run_name.replace('-','').isalnum()
root=Path(__file__).resolve().parents[1];out=root/'build'/a.run_name;assert not out.exists(),'Use a new build directory for each mutation check';out.mkdir(parents=True)
for name in ['CouchClash','CouchClashUITests']:shutil.copytree(root/name,out/name)
shutil.copy2(root/'project.yml',out/'project.yml')
file=out/'CouchClash/CouchClashApp.swift';s=file.read_text()
start=s.index('            guard message.name == "couchScores", message.body as? String == "refresh",')
end=s.index('!scoreRequests.isBusy else {',start)
s=s[:start]+'            guard message.name == "couchScores", '+s[end:];file.write_text(s)
subprocess.run(['xcodegen','generate'],cwd=out,check=True)
log=out/'test.log';cmd=['xcodebuild','-project','CouchClash.xcodeproj','-scheme','CouchClash','-configuration','Debug','-destination','platform=iOS Simulator,id='+a.simulator,'-parallel-testing-enabled','NO','-collect-test-diagnostics','never','-derivedDataPath',str(out/'DerivedData'),'CODE_SIGNING_ALLOWED=NO','-only-testing:CouchClashUITests/NativeParityTests/testBridgeRejectsUntrustedCallsAndFileOrigin','-resultBundlePath',str(out/'result.xcresult'),'test']
with log.open('w') as f:result=subprocess.run(cmd,cwd=out,stdout=f,stderr=subprocess.STDOUT)
text=log.read_text()
assert result.returncode==65 and 'XCTAssertTrue failed' in text,'Mutation must fail an assertion, not merely fail build/launch'
# The preceding positive-control assertion must have succeeded; inspect the failed line's current source.
lines=(root/'CouchClashUITests/NativeParityTests.swift').read_text().splitlines()
import re
failures=re.findall(r'NativeParityTests.swift:(\d+): error:.*XCTAssertTrue failed',text)
assert failures and all('Payload rejected before transport' in lines[int(n)-1] for n in failures),'Expected precise payload guard failure after positive control'
report={'passed':True,'mutation':'Remove payload, main-frame and root-document guards; keep fixed endpoint and busy guard','expectedTestFailure':True,'failedAssertion':'Payload rejected before transport','positiveControlPassed':True,'nativeProductionFilesChanged':False,'testExitCode':result.returncode}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
