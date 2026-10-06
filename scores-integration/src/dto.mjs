// Pure shared boundary validation. No storage, credentials or network configuration.
const states=new Set(['scheduled','in_progress','final','postponed','canceled','delayed','suspended','abandoned','unknown']);
const reasons=new Set(['unauthorized','rate_limited','upstream','timeout','invalid_response','oversized','unavailable','disabled','age']);
const timestamp=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
const fail=()=>{throw Error('Invalid score data');};
function team(t){
 if(!t||typeof t.id!=='string'||!/^\d{1,16}$/.test(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>80||typeof t.abbreviation!=='string'||!/^[A-Z0-9]{2,5}$/.test(t.abbreviation)||!(t.score===null||Number.isInteger(t.score)&&t.score>=0&&t.score<=1000))fail();
 return {id:t.id,name:t.name,abbreviation:t.abbreviation,score:t.score};
}
function games(list){
 if(!Array.isArray(list)||list.length>100)fail();const ids=new Set();
 return list.map(g=>{if(!g||typeof g.id!=='string'||!/^bdl:nfl:\d{1,16}$/.test(g.id)||ids.has(g.id)||!timestamp(g.startTime)||!states.has(g.state)||typeof g.statusText!=='string'||g.statusText.length>80||!(g.providerUpdatedAt===null||timestamp(g.providerUpdatedAt)))fail();ids.add(g.id);return {id:g.id,startTime:g.startTime,home:team(g.home),away:team(g.away),state:g.state,statusText:g.statusText,providerUpdatedAt:g.providerUpdatedAt};});
}
function source(s){if(!s||s.provider!=='balldontlie'||!['mock','live'].includes(s.kind)||!timestamp(s.fetchedAt))fail();return {provider:s.provider,kind:s.kind,fetchedAt:s.fetchedAt};}
export function sanitizeSnapshot(s,scope){
 if(!s||s.schema!==1||s.scope?.season!==scope.season||s.scope?.week!==scope.week)fail();
 return {schema:1,scope:{season:scope.season,week:scope.week},source:source(s.source),games:games(s.games)};
}
export function sanitizePublicScore(s){
 if(!s||s.schema!==1||s.automaticSettlement!==false||!['manual','unavailable','live','mock','stale'].includes(s.mode)||!(s.reason===null||reasons.has(s.reason)))fail();
 if(['manual','unavailable'].includes(s.mode)){if(!Array.isArray(s.games)||s.games.length||s.source!==null||s.fetchedAt!==null)fail();return {schema:1,mode:s.mode,reason:s.reason,games:[],source:null,fetchedAt:null,automaticSettlement:false};}
 if(!timestamp(s.fetchedAt))fail();const src=source(s.source);
 if(s.mode==='live'&&src.kind!=='live'||s.mode==='mock'&&src.kind!=='mock')fail();
 return {schema:1,mode:s.mode,reason:s.reason,games:games(s.games),source:src,fetchedAt:s.fetchedAt,automaticSettlement:false};
}
