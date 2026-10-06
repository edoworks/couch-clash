'use strict';
function freezeTree(x){Object.values(x).forEach(v=>{if(v&&typeof v==='object')freezeTree(v)});return Object.freeze(x);}
const FIVE_CALL_TEMPLATE=freezeTree({"schema":1,"ruleset":"couch-football-five-v1","questions":[{"id":"first-half-first-team","title":"First-half first score?","opts":["Away team","Home team","No score"],"optionIds":["away","home","no-score"],"points":100,"when":"First team to score before halftime"},{"id":"first-half-first-play","title":"First points come from…","opts":["Touchdown","Field goal","Safety","No score"],"optionIds":["touchdown","field-goal","safety","no-score"],"points":100,"when":"First scoring play before halftime · excludes extra points"},{"id":"final-winner","title":"Who gets the last laugh?","opts":["Away team","Home team","Tie"],"optionIds":["away","home","tie"],"points":100,"when":"Final winner · includes overtime"},{"id":"after-halftime-leader","title":"Who owns the second half?","opts":["Away team","Home team","Even"],"optionIds":["away","home","even"],"points":200,"when":"Most points after halftime · includes overtime"},{"id":"after-halftime-total-band","title":"Second-half point party?","opts":["0–20","21–35","36+"],"optionIds":["0-20","21-35","36-plus"],"points":200,"when":"Both teams combined · includes overtime"}]});

function cleanTeam(v){return typeof v==='string'?v.trim().replace(/\s+/g,' '):'';}
function validTeam(v){return typeof v==='string'&&v===cleanTeam(v)&&v.length>=1&&v.length<=24&&/^[\p{L}\p{N} .’'-]+$/u.test(v)&&!['no score','tie','even'].includes(v.toLowerCase());}
function validTeams(away,home){return validTeam(away)&&validTeam(home)&&away.toLowerCase()!==home.toLowerCase();}
function newManualDefinition(id,away,home){
 if(!/^[a-z0-9-]{8,80}$/.test(id)||!validTeams(away,home))throw Error('Invalid host-defined fixture');
 const questions=JSON.parse(JSON.stringify(FIVE_CALL_TEMPLATE.questions));
 for(const i of [0,2,3]){questions[i].opts[0]=away;questions[i].opts[1]=home;questions[i].optionIds[0]='away';questions[i].optionIds[1]='home';}
 return freezeTree({schema:2,ruleset:'couch-football-five-v1',fixture:{id:'manual-'+id,kind:'host_defined',away,home,awayId:'away',homeId:'home',kickoff:null,timezone:null,source:null,verifiedAt:null},questions});
}
function validDefinition(d){
 try{return d?.schema===2&&d.fixture?.kind==='host_defined'&&d.fixture.id.startsWith('manual-')&&JSON.stringify(d)===JSON.stringify(newManualDefinition(d.fixture.id.slice(7),d.fixture.away,d.fixture.home));}catch{return false;}
}
