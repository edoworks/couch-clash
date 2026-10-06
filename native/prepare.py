"""Deterministic native adaptations of the independently reviewed frozen web source."""
from pathlib import Path
import subprocess, shutil, re, hashlib, json, sys
root=Path(__file__).resolve().parent
src=root.parent
expected='65813dde8d24f70e7743282fa3d4a2c2167d3989'
assert subprocess.call(['git','-C',str(src),'merge-base','--is-ancestor',expected,'HEAD'])==0
# Read pinned git blobs, never potentially modified web working files.
dst=root/'CouchClash/Web';dst.mkdir(parents=True,exist_ok=True)
files=['index.html','home.js','legacy/index.html','legacy/legacy.js','mnf-2026-10-05/index.html','mnf-2026-10-05/app.js','mnf-2026-10-05/engagement.js','mnf-2026-10-05/definitions.js','mnf-2026-10-05/style.css','manual/index.html','manual/app.js','manual/definitions.js','manual/engagement.js','manual/style.css']
manifest={'web_commit':expected,'legacy_key':'couch-clash-native-v1','new_key':'couch-clash-native-mnf-2026-10-05-v1','source_read_from_pinned_git_blobs':True,'assets':{}}
for name in files:
 raw=subprocess.check_output(['git','-C',str(src),'show',expected+':'+name],text=True);text=raw
 text=re.sub(r"if\('serviceWorker' in navigator(?:&&location.protocol!=='file:')?\).*?;",'',text)
 text=re.sub(r'<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>','',text)
 text=re.sub(r'<details><summary>Add to your Home Screen</summary>.*?</details>','',text)
 text=text.replace('href="manual/"','href="manual/index.html"')
 text=text.replace("const KEY='couch-clash-host-defined-v1'","const KEY='couch-clash-native-host-defined-v1'")
 text=text.replace('<script type="module" src="scoreboard-boot.mjs"></script>','<script src="native-scores.js"></script>')
 text=text.replace('mnf-2026-10-05/?mode=','mnf-2026-10-05/index.html?mode=')
 text=text.replace('href="../legacy/"','href="../legacy/index.html"')
 text=text.replace('href="legacy/"','href="legacy/index.html"').replace('href="../"','href="../index.html"')
 text=text.replace("const KEY='couch-clash-web-mnf-2026-10-05-v1'","const KEY='couch-clash-native-mnf-2026-10-05-v1'")
 text=text.replace("const LEGACY_KEY='couch-clash-public-v1'","const LEGACY_KEY='couch-clash-native-v1'")
 text=text.replace('October 4 web saves','October 4 app saves').replace('SAVED WEB GAMES','SAVED APP GAMES').replace('original web store','original app store').replace('original browser data','original app data')
 text=text.replace('TestFlight saves stay in the native app; this website cannot read them.','Safari saves are separate and cannot be read here.')
 text=text.replace('Check the same browser and address used for that game. HTTP and HTTPS have separate saves. TestFlight app saves stay in the native app and cannot be read here.','These are saves from this app installation. Safari and other devices have separate saves. Deleting the app can remove its saved games.')
 text=text.replace('October 4 app saves and native-app saves are not affected.','October 4 app saves are not affected.')
 text=text.replace('October 4 and October 5 web saves and native-app saves are not affected.','October 4 legacy app saves and October 5 official app saves are not affected.')
 text=text.replace('October 4 and October 5 web saves','October 4 legacy app saves and October 5 official app saves')
 p=dst/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
 manifest['assets'][name]={'source_sha256':hashlib.sha256(raw.encode()).hexdigest(),'native_sha256':hashlib.sha256(text.encode()).hexdigest()}
# Fixed local bundle: keep reviewed score logic byte-mapped; only remove module syntax.
parts=['scores-integration/ui/config.mjs','scores-integration/src/transport.mjs','scores-integration/src/dto.mjs','scores-integration/ui/score-display.mjs','scoreboard-boot.mjs']
bundle=['(()=>{\n\"use strict\";\n',(root/'score-bridge.js').read_text()]
for name in parts:
 raw=subprocess.check_output(['git','-C',str(src),'show',expected+':'+name],text=True)
 text=re.sub(r'^import .*?;\n','',raw,flags=re.M).replace('export ','')
 if name=='scoreboard-boot.mjs':text=text.replace('mountScores(root);','mountScores(root,{fetcher:nativeScoreFetch});')
 bundle.append(text)
 manifest['assets'][name]={'source_sha256':hashlib.sha256(raw.encode()).hexdigest(),'bundle_part_sha256':hashlib.sha256(text.encode()).hexdigest()}
bundle.append('})();\n');native='\n'.join(bundle);(dst/'native-scores.js').write_text(native)
manifest['native_scores_sha256']=hashlib.sha256(native.encode()).hexdigest()
wrapper=root/'CouchClash/CouchClashApp.swift';text=wrapper.read_text()
old='"https://www.seahawks.com/game-day/2026/reg-week4/seahawks-vs-chargers/",'
if old in text and 'https://www.neworleanssaints.com/schedule/' not in text:text=text.replace(old,old+'\n            "https://www.neworleanssaints.com/schedule/",')
text=text.replace('16/255, green: 25/255, blue: 22/255','244/255, green: 235/255, blue: 216/255').replace('.preferredColorScheme(.dark)','.preferredColorScheme(.light)')
wrapper.write_text(text)
manifest['wrapper_sha256']=hashlib.sha256(wrapper.read_bytes()).hexdigest()
(root/'releases/source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Frozen web source bundled with explicit file routes, native stores and native installation copy.')
