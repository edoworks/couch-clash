"""Bundle exact accepted pilot source; adaptations stay isolated from social games."""
from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).resolve().parents[1]; repo=root.parent
accepted='461c81516ec3ff069dffeae1c9618c26763a84e3'
def source(name):
 p=repo/'forecast-review-pilot'/name
 expected=json.loads((root/'forecast/source-provenance.json').read_text())['testedFileSHA256']['forecast-review-pilot/'+name]
 assert hashlib.sha256(p.read_bytes()).hexdigest()==expected, 'Frozen pilot source changed'
 return p.read_text()
out=root/'CouchClash/ForecastWeb';out.mkdir(exist_ok=True)
model=source('model.mjs').replace('export ','').replace('couch-clash-forecast-journal-v1','couch-clash-ios-forecast-journal-v1')
app=source('app.mjs').split('\n',1)[1].replace('Deterministic review · AI unavailable','Deterministic review').replace('Forecast journal deleted from this browser.','Forecast journal deleted from this app.')
html=source('index.html').replace('<script type="module" src="app.mjs"></script>','<script src="pilot.js"></script>')
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; connect-src \'none\'; img-src \'none\'; frame-src \'none\'; form-action \'none\'; base-uri \'none\'">')
html=html.replace('Synthetic · local only · production OFF','Synthetic · private journal · research pilot').replace('No live feed, account, sync or real AI.','No live feed, account or sync. Optional on-device AI on eligible devices.').replace('Stored only in this browser profile; browser/OS backups may exist.','Stored separately in this app on this device. iOS-managed backups may include app data depending on your settings.').replace('No cold-load offline guarantee, cloud transfer, analytics or Safari/native portability.','This bundled journal works offline. No app-operated cloud sync or analytics. Safari and game saves remain separate.')
(out/'index.html').write_text(html);(out/'style.css').write_text(source('style.css')+'\n:root{font:-apple-system-body;line-height:1.55}.check{min-height:48px}\n')
(out/'pilot.js').write_text(model+'\n'+app+'\n'+(root/'forecast/bridge.js').read_text())
manifest={'accepted_pilot':accepted,'journal_key':'couch-clash-ios-forecast-journal-v1','website_store_uuid':'CCF02026-1006-4000-8000-000000000001','assets':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.iterdir())}}
(root/'forecast/bundle-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
