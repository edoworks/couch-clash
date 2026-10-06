from pathlib import Path
import subprocess,hashlib,json
r=Path(__file__).resolve().parents[1]; repo=r.parent
base='e38d6a3972533d3b2d1f14c23d08ec760990b478'
assert not subprocess.check_output(['git','-C',str(repo),'diff',base,'--','native/CouchClash/Web','native/CouchClash/ScoreTransport.swift','native/CouchClash/ScoreRequestGate.swift'])
provenance=json.loads((r/'forecast/source-provenance.json').read_text())
for name,digest in provenance['testedFileSHA256'].items():
 if name not in provenance['portableToolingChanges']:
  assert hashlib.sha256((repo/name).read_bytes()).hexdigest()==digest,name
m=json.loads((r/'forecast/bundle-manifest.json').read_text())
for file,digest in m['assets'].items():assert hashlib.sha256((r/'CouchClash/ForecastWeb'/file).read_bytes()).hexdigest()==digest
assert (r/'CouchClash/Forecast/BridgeCore.swift').read_bytes()==(repo/'forecast-review-pilot/native-harness/BridgeCore.swift').read_bytes()
s=(r/'CouchClash/Forecast/OnDeviceSelector.swift').read_text()
assert 'guard #available(iOS 26.0' in s and 'SystemLanguageModel.default' in s
assert 'tools: []' in s and 'maximumResponseTokens: 64' in s
assert 'https://' not in s and 'journal' not in s.lower()
print('PASS accepted pilot untouched, game/score assets unchanged, iOS bundle hashes and reviewed gate')
