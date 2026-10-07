from pathlib import Path
import hashlib,json,re,subprocess
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'releases/source-manifest.json').read_text())
for name,entry in manifest['assets'].items():
 raw=subprocess.check_output(['git','-C',str(root.parent),'show',manifest['web_commit']+':'+name])
 assert hashlib.sha256(raw).hexdigest()==entry['source_sha256'],name
 if 'native_sha256' in entry:
  assert hashlib.sha256((root/'CouchClash/Web'/name).read_bytes()).hexdigest()==entry['native_sha256'],name
assert hashlib.sha256((root/'CouchClash/Web/native-scores.js').read_bytes()).hexdigest()==manifest['native_scores_sha256']
assert hashlib.sha256((root/'CouchClash/CouchClashApp.swift').read_bytes()).hexdigest()==manifest['wrapper_sha256']
web=root/'CouchClash/Web'
for p in web.rglob('*'):
 if p.is_file():
  s=p.read_text();assert 'navigator.serviceWorker' not in s,str(p);assert 'type="module"' not in s,str(p)
  for href in re.findall(r'(?:src|href)="([^"#?]+)',s):
   if '://' not in href and not href.startswith('mailto:') and '${' not in href:
    assert (p.parent/href).exists(),(p,href)
assert "const KEY='couch-clash-native-mnf-2026-10-05-v1'" in (web/'mnf-2026-10-05/app.js').read_text()
assert "const KEY='couch-clash-native-host-defined-v1'" in (web/'manual/app.js').read_text()
assert "const LEGACY_KEY='couch-clash-native-v1'" in (web/'legacy/legacy.js').read_text()
print('PASS pinned source/native hashes, all local file links, no worker/ESM, unchanged old storage namespaces')
