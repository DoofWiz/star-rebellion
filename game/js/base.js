'use strict';
(function(){
const ROOT=document.getElementById('sc-base');
const byId=id=>ROOT.querySelector('#'+id);
const A=SR.audio;
const osc=(...a)=>A.osc(...a);
const nz=(...a)=>A.nz(...a);


/* =====================================================================
   STAR REBELLION — Haven Rock, iteration 2
   Rooms as single entities with walk-in interior views, glassy
   Revolution lamp, galaxy-map source network with comm-static
   transmissions, signal-driven mission generation, personnel files
   with vehicles and equipment, capacities, source-driven recruitment.
   ===================================================================== */

const RANKS=['Cadet','2nd Lieutenant','1st Lieutenant','Captain','Major','Lt. Colonel','Colonel','Brig. General','Maj. General','Lt. General'];
const RANKS_ENL=['Recruit','Private','Private First Class','Specialist','Corporal','Sergeant','Staff Sergeant','Sgt. First Class','Master Sergeant','Sergeant Major'];
const rankOf=lvl=>RANKS[Math.max(0,Math.min(RANKS.length-1,lvl))];
const rankFor=p=>((p.role==='Soldier'||p.role==='Marine')?RANKS_ENL:RANKS)[Math.max(0,Math.min(9,p.level))];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let rng=Math.random;
const C=n=>'<span class="rc" title="Credits">'+n+'⬡</span>';
const S=n=>'<span class="rs" title="Supplies">'+n+'▤</span>';
const I=n=>'<span class="ri" title="Intel">'+n+'◈</span>';

/* ---------- rooms & builds (copy in the commander's voice) ---------- */
const ROOMS={
  command:{name:'Command Center',col:'#ffb454',desc:'Where the revolution gets planned. Sources, missions, bad coffee.'},
  hangar:{name:'Hangar',col:'#57a8ff',desc:'The fighters live here. So does Joss, practically.'},
  barracks:{name:'Barracks',col:'#57d7e2',desc:'Bunks and quiet. People break without both.'},
  store:{name:'Storeroom',col:'#7dd97b',desc:'Everything we own, counted twice by Mira.'},
  comms:{name:'Comms Array',col:'#57d7e2',desc:'An ear on the galaxy. One more intel a day, room for one more source.'},
  workshop:{name:'Workshop',col:'#ffb454',desc:'Broken fighters go in. Working fighters come out. Three times the pace.'},
  infirmary:{name:'Infirmary',col:'#7dd97b',desc:'Beds and bacta. People mend twice as fast with someone on station.'},
  training:{name:'Training Hall',col:'#c987ff',desc:'Sweat now, live later.'},
  bay:{name:'Hangar Bay',col:'#57a8ff',desc:'One more berth for one more fighter. We’ll fill it.'},
  quarters:{name:'Barracks Annex',col:'#57d7e2',desc:'Three more bunks. The rebellion keeps growing.'},
};
const BUILDS={
  store:{c:50,s:20,days:1},
  comms:{c:120,s:30,days:2},
  workshop:{c:100,s:40,days:2},
  infirmary:{c:90,s:30,days:2},
  training:{c:80,s:25,days:1},
  bay:{c:60,s:50,days:1},
  quarters:{c:70,s:30,days:1},
};
const EXCAVATE={s:10,days:1};
const SHIPSTATS={
  cross:{label:'FT-4 Cross · Multi-role Starfighter',shd:'15F / 15A',arm:20,hull:40,wpns:[['Plasma','rc0'],['Ballistic ×6','rc1'],['Missile ×2','rc2']]},
  talon:{label:'SF-11 Talon · Interceptor',shd:'8F / 8A',arm:10,hull:25,wpns:[['Plasma','rc0'],['Missile ×1','rc2']]},
  graf:{label:'Graf Type 1 Hauler · Troop Transport (converted)',shd:'10F / 10A',arm:25,hull:60,wpns:[['Door guns','rc1']]},
};

/* ---------- state ---------- */
let G=null,tilePopAt=null,winMode=null,winArg=null,started=false,viewRoom=null,srcSel=null;

function newGame(){
  const rows=8,cols=11;
  const grid=[];
  for(let r=0;r<rows;r++){grid.push([]);for(let c=0;c<cols;c++)grid[r].push({t:'rock'});}
  const setT=(r,c,t)=>{grid[r][c]={t};};
  for(let c=1;c<=8;c++)setT(4,c,'floor');
  setT(3,3,'floor');setT(2,3,'floor');setT(5,3,'floor');setT(3,6,'floor');setT(5,6,'floor');
  [[4,0],[5,1],[5,2],[1,3],[5,7],[4,9],[3,7],[3,8],[6,4],[6,5],[2,6],[2,7],[1,4],[6,3]].forEach(([r,c])=>setT(r,c,'rubble'));
  const rooms=[
    {key:'command',r:2,c:4,w:2,h:2},
    {key:'hangar',r:2,c:1,w:2,h:2},
    {key:'barracks',r:5,c:4,w:2,h:1},
  ];
  for(const rm of rooms)for(let r=rm.r;r<rm.r+rm.h;r++)for(let c=rm.c;c<rm.c+rm.w;c++)grid[r][c]={t:'room',room:rm.key};
  return {
    day:1,credits:250,supplies:120,intel:3,renown:8,risk:10,morale:65,introDone:false,
    rows,cols,grid,rooms,
    fighters:[
      {id:'graf',name:'Marta',cls:'graf',hull:90,out:false},
    ],
    armory:[
      {id:'akli',name:'Akli AR',n:6,ic:'≠',desc:'Ballistic assault rifle. Common, cheap, effective — and it wears down fast.'},
      {id:'cowboy',name:'Cowboy',n:4,ic:'⌐',desc:'Ballistic revolver sidearm. Nothing special. Never jams when it matters.'},
    ],
    people:[
      {id:'sera',name:'Sera Kest',role:'Pilot',level:2,xp:0.3,assign:'rest',injured:0,ship:'',bio:'Flight lead, such as the flight is. Lucky, and knows it.'},
      {id:'joss',name:'Joss Marrek',role:'Pilot',level:3,xp:0.5,assign:'rest',injured:0,ship:'graf',bio:'Best stick in the sector, flying a converted hauler. Ask him about it. He’ll tell you anyway.'},
      {id:'dax',name:'Dax Ferro',role:'Soldier',level:1,xp:0.2,assign:'rest',injured:0,equip:['akli','cowboy'],bio:'Ex-dock enforcer. Good in a corridor.'},
      {id:'runa',name:'Runa Vel',role:'Soldier',level:1,xp:0.45,assign:'rest',injured:0,equip:['akli','cowboy'],bio:'Demolitions. Do not startle her.'},
      {id:'kel',name:'Kel Brasso',role:'Soldier',level:1,xp:0.1,assign:'rest',injured:0,equip:['akli','cowboy'],bio:'Poacher turned partisan. Knows every ridge on three moons.'},
    ],
    sources:[
      {id:'halt',name:'Ferren Halt',type:'Officer · Depot Manager',loc:'Veray Yards',level:1,cult:35,risk:55,
       inc:{s:6},alive:true,visited:false,contacted:false,pendingEvent:null,eventsSeen:0,signal:null,sigIdx:0,
       bio:'Passed over for promotion twice. Wants the yards to burn, quietly — as long as nobody sees him hold the match.'},
      {id:'vokk',name:'Sen. Adria Vokk',type:'Politician',loc:'via Relay Kess',level:1,cult:20,risk:15,
       inc:{c:25},alive:true,visited:false,contacted:false,pendingEvent:null,eventsSeen:0,signal:null,sigIdx:0,
       bio:'Votes loyal, funds otherwise. Terrified of audits.'},
    ],
    missions:[
      {id:'strider',name:'Steal the Strider',state:'locked',from:'—',
       desc:'A robotic mech, ours if we can walk it out of a warehouse. Needs a ground team with real gear. Not yet.'},
    ],
    planets:PLANETDEF.map(p=>({id:p.id,known:!!p.known,access:!!p.access,scouted:!!p.access&&!p.base})),
    recruitN:0,misPopQ:[],candQ:[],
    news:[],
  };
}

/* ---------- helpers ---------- */
const $=id=>byId(id);
function hasRoom(key){return G.rooms.some(r=>r.key===key&&!r.build);}
function roomsOf(key){return G.rooms.filter(r=>r.key===key&&!r.build);}
function sourceCap(){return 2+roomsOf('comms').length;}
function fighterCap(){return 2+roomsOf('bay').length;}
function bunkCap(){return 5+3*roomsOf('quarters').length;}
/* Support crew man stations; a room without its operator underperforms */
const STAFFABLE={
  command:{post:'Flight Coordinator',perk:'+5% mission success'},
  store:{post:'Quartermaster',perk:'repairs cost 1▤ instead of 2▤'},
  workshop:{post:'Crew Chief',perk:'repairs 15%/day instead of 8%'},
  infirmary:{post:'Medic',perk:'injuries heal twice as fast'},
  comms:{post:'Signals Operator',perk:'intel flows (+1/day per array)'},
  training:{post:'Drill Instructor',perk:'+50% training XP'},
};
const STLBL={command:'CMD',store:'STORES',workshop:'WKSHP',infirmary:'MEDBAY',comms:'COMMS',training:'DRILL'};
function staffOf(key){return G.people.filter(p=>p.assign==='station:'+key&&!p.injured);}
function medStaff(){return staffOf('infirmary');}
function news(html,cls){
  G.news.push({day:G.day,html,cls:cls||'d'});
  if(G.news.length>80)G.news.shift();
  renderNews();
}
function renderNews(){
  const el=$('log');
  el.innerHTML=G.news.map(n=>'<p><span class="day">D'+n.day+'</span> <span class="'+n.cls+'">'+n.html+'</span></p>').join('');
  el.scrollTop=el.scrollHeight;
}
function levelUp(p){
  while(p.xp>=1){p.xp-=1;p.level++;news('<b>'+p.name+'</b> promoted in the field — now '+rankFor(p)+'.','p');sAlert();}
}

/* ---------- source events (some open missions) ---------- */
const SRC_EVENTS={
  halt:[
    {text:'<b>HALT:</b> “Internal security walked the yards today. Random inspection, they said. Kessler looked at me twice. He looked at me TWICE.”',
     opts:[
       ['“Twice is nothing. You reported the loss like everyone else. Walk me through your day, slowly.”','strong'],
       ['“Stay off the comms for a while.”','neutral'],
       ['“If Kessler is a problem, we can make him disappear too.”','weak'],
     ]},
    {text:'<b>HALT:</b> “The replacement instructor requisitioned double fuel stocks. Double! Something big is moving through my yard and nobody tells me anything.”',
     mission:'tanker',
     opts:[
       ['“That’s exactly why we keep you where you are. Get me the manifests and we’ll do the rest.”','strong'],
       ['“Noted. Keep watching.”','neutral'],
       ['“Double fuel? Skim some for us.”','weak'],
     ]},
  ],
  vokk:[
    {text:'<b>VOKK:</b> “The Treasury audit passed my office by one floor. ONE floor. I have a family, you understand. I never agreed to be brave.”',
     opts:[
       ['“You’re not brave, Senator — you’re careful, and careful people survive. Next transfer runs through three shells.”','strong'],
       ['“Audits pass. Hold steady.”','neutral'],
       ['“Bravery wasn’t optional, Senator.”','weak'],
     ]},
    {text:'<b>VOKK:</b> “There is a vote next session — expanded drift patrols. If I vote no, someone asks why. If I vote yes, your little fleet feels it.”',
     mission:'skim',
     opts:[
       ['“Vote yes. Loudly. A patriot above suspicion is worth more than one patrol lane — and your next transfer needs an escort anyway.”','strong'],
       ['“Abstain. Be sick that day.”','neutral'],
       ['“Vote no. We need the lanes clear.”','weak'],
     ]},
  ],
  marr:[
    {text:'<b>MARR:</b> “My grant renewal requires a loyalty attestation this cycle. I’ve signed it, obviously. I need to know you people understand what that signature costs me.”',
     opts:[
       ['“It costs you nothing with us, Professor. Paper loyalty keeps you publishing, and publishing keeps you useful.”','strong'],
       ['“Sign whatever they put in front of you.”','neutral'],
       ['“Signatures are signatures. Results are what we pay for.”','weak'],
     ]},
  ],
};
/* ---------- signals: follow them up, get missions (or better) ---------- */
const MPOOL={
  toi:{name:'Take Out Instructor',from:'Ferren Halt',need:2,days:2,riskTxt:'High',lead:'space',leadTxt:'Fly it yourself',
    desc:'A Hegemony flight instructor — Commandant Dral Vex — trains the next class of killers over the drift, four cadets at a time. Kill the teacher before the lessons take.',
    rew:{c:100,i:2,xp:0.2}},
  intercept:{name:'Intercept Transport',from:'Ferren Halt',need:2,days:3,riskTxt:'Moderate',
    desc:'A Hegemony supply transport crosses the drift with light escort. Kill the escort, board her, take everything that isn’t bolted down.',
    rew:{c:150,s:35,xp:0.15}},
  tanker:{name:'Tanker Grab',from:'Ferren Halt',need:2,days:3,riskTxt:'Moderate',
    desc:'Halt’s manifests were real: a fuel tanker, twice the load, half the escort. Take it whole.',
    rew:{c:80,s:60,xp:0.15}},
  skim:{name:'Escort the Skim',from:'Sen. Vokk',need:2,days:2,riskTxt:'Low',
    desc:'Vokk’s shell-company transfer needs quiet guns for two days. Boring flying, beautiful money.',
    rew:{c:220,xp:0.1}},
  fighters:{name:'Steal Hegemony Fighters',from:'Ferren Halt',need:2,days:3,riskTxt:'High',
    desc:'Pad nine, every third night: two fueled Talons and one bored sentry. Fly one home.',
    rew:{fighter:1,xp:0.2}},
  chart:{name:'Chart the Cordon',from:'Prof. Marr',need:2,days:2,riskTxt:'Low',
    desc:'Fly Marr’s survey corridor and map what the Hegemony thinks is hidden.',
    rew:{i:4,xp:0.1}},
  garrison:{name:'Brakka Garrison Raid',from:'Scout Report · Brakka',need:2,days:2,riskTxt:'Low',
    desc:'Twelve conscripts, one armory, zero enthusiasm. Hit the garrison, empty the racks, be gone by dust-fall.',
    rew:{c:60,s:25,xp:0.12}},
  stealcross:{name:'Steal the Cross',from:'Scout Report · Brakka',need:3,days:2,riskTxt:'Moderate',
    lead:'ground',leadTxt:'Fight it on the ground',ground:true,
    desc:'Dustfall keeps one FT-4 Cross on the pad behind the sheriff’s HQ. The FT-4 is built for frontier sheriffs who need something cheap and reliable to deter smugglers and gangs in their turf. When you strap more guns and missiles to it however, it becomes rather useful in a pinch. Sheriff Reeve enforces Hegemony law here. Put Sera on the stick and walk her to the pad.',
    rew:{cross:1,c:120,s:30,xp:0.2}},
  orehaul:{name:'Dreymar Ore Heist',from:'Scout Report · Dreymar',need:2,days:3,riskTxt:'Moderate',
    desc:'A company ore barge runs unescorted on payday. The miners will swear they saw nothing.',
    rew:{c:90,s:50,xp:0.15}},
  foundry:{name:'Volund Manifest Job',from:'Scout Report · Volund',need:2,days:3,riskTxt:'High',
    desc:'Freight manifests from the Forge — every convoy, every escort, every gap. Worth more than the steel.',
    rew:{c:120,i:3,xp:0.2}},
};
const SIGNALS={
  halt:[
    {kind:'mission',mid:'toi',text:'“The flight instructor, Vex. Every pilot who’ll ever shoot at you learns it from him — and he runs his little academy over MY yard. Just saying.”'},
    {kind:'mission',mid:'intercept',text:'“A supply transport crosses my sector Thursday. Light escort. I have the schedule, if you have the nerve.”'},
    {kind:'recruit',text:'“There are dockhands here asking the right questions. Want me to point them somewhere?”'},
    {kind:'cache',text:'“Pallet miscount in bay six. Forty crates of it. Nobody misses what was never counted.”',
     apply(){G.supplies+=40;return 'Recovered '+S(40)+' from bay six. Mira is thrilled.';}},
    {kind:'recruitS',text:'“The tower coordinator got passed over, same as me. He’d run your flight deck better than theirs.”'},
    {kind:'mission',mid:'fighters',text:'“Pad nine, every third night. Two Talons, fueled, and a sentry who reads on shift.”'},
  ],
  vokk:[
    {kind:'credits',text:'“A discretionary fund has been… discreet. Consider it a donation from the Hegemony to itself.”',
     apply(){G.credits+=120;return 'The Senator’s laundering clears '+C(120)+'.';}},
    {kind:'recruitS',text:'“My aide has seen too much to stay and too little to be arrested. Take him before someone else does.”'},
    {kind:'intel',text:'“Committee minutes, pre-redaction. Read them before they don’t exist.”',
     apply(){G.intel+=2;return 'Parliament whispers become '+I(2)+'.';}},
  ],
  marr:[
    {kind:'intel',text:'“The survey satellites blink for six minutes on Thursdays. I may have caused that.”',
     apply(){G.intel+=3;return 'Marr’s blind spot yields '+I(3)+'.';}},
    {kind:'mission',mid:'chart'},
    {kind:'recruitS',text:'“My lab technician asks fewer questions than she answers. She’d be safer with you.”'},
  ],
};
/* ---------- the galaxy: worlds, access, scouting ----------
   Access means we can operate there: missions, sources, signals.
   Intel buys access — a wild rock costs pocket change, a core world
   costs a fortune. Unspent intel doubles as our early-warning buffer,
   which is what the GDD originally used it for. */
const PLANETDEF=[
  {id:'haven',name:'Haven Rock',kind:'Hidden Base',x:0.10,y:0.78,base:true,known:true,access:true,
   sit:'Home. Nobody knows it exists. Keep it that way.'},
  {id:'veray',name:'Veray Yards',kind:'Industrial World',pop:'40M',x:0.30,y:0.55,known:true,access:true,
   sit:'Shipyards, fuel farms, and Ferren Halt’s bruised ego. Our hunting ground.'},
  {id:'kess',name:'Relay Kess',kind:'Waystation',pop:'9,000',x:0.19,y:0.44,known:true,access:true,
   sit:'A refueling nowhere between nowheres. The Senator’s couriers like it that way.'},
  {id:'brakka',name:'Brakka',kind:'Backwater',pop:'120K',x:0.42,y:0.80,known:true,scout:3,
   sit:'Dust, herders, and the frontier town of Dustfall — where Sheriff Reeve keeps Hegemony law and one FT-4 Cross on the pad.'},
  {id:'callis',name:'Callis',kind:'Academic World',pop:'300M',x:0.55,y:0.30,known:true,scout:7,
   sit:'Universities, observatories, and a professor with a labor-camp grudge waiting for a signal.'},
  {id:'meridian',name:'Meridian',kind:'CORE · Capital',pop:'2.1B',x:0.86,y:0.30,known:true,scout:14,core:true,
   sit:'Parliament, the fleets, the Empress’ shadow. Every camera works. Every clerk has a price.'},
  {id:'volund',name:'Volund Forge',kind:'CORE · Foundry World',pop:'800M',x:0.76,y:0.62,known:true,scout:12,core:true,
   sit:'The Hegemony’s arsenal. Foundries the size of seas, and freight manifests worth more than gold.'},
  {id:'halcyon',name:'Halcyon',kind:'CORE · Resort World',pop:'60M',x:0.90,y:0.55,known:true,scout:10,core:true,
   sit:'Where Hegemony brass unbuckle their sidearms. The revolution isn’t ready for Halcyon. Yet.'},
  {id:'dreymar',name:'Dreymar',kind:'Mining World',pop:'2M',x:0.48,y:0.62,scout:4,
   sit:'Ore barges, company scrip, and miners who already hate the right people.'},
  {id:'sable',name:'Sable',kind:'Wild World',pop:'—',x:0.33,y:0.24,scout:3,
   sit:'Nothing but weather — and an abandoned Hegemony listening post, still warm.'},
  {id:'nyx',name:'Nyx Shadowport',kind:'Pirate Haven',pop:'50K',x:0.63,y:0.82,scout:5,
   sit:'Smugglers, deserters, and people who shoot well and ask late.'},
  {id:'tarsis',name:'Tarsis',kind:'Farm World',pop:'5M',x:0.68,y:0.14,scout:5,
   sit:'Grain oceans and quotas nobody meets. They hide food from the levy. They’d hide us.'},
  {id:'oubli',name:'Oubliette',kind:'Dead Colony',pop:'0',x:0.14,y:0.16,scout:4,
   sit:'A colony that stopped answering forty years ago. Empty streets. One transmitter, still powered.'},
];
const SRCPOS={halt:'veray',vokk:'kess',marr:'callis',renn:'meridian'};
const CANDS={
  marr:{id:'marr',name:'Prof. Etta Marr',type:'Scientist',loc:'Callis Institute',level:1,cult:10,risk:20,inc:{i:1},
    bio:'Astrophysicist with cordoned-sector clearance and a brother in a labor camp.',
    pitch:'<b>Prof. Etta Marr</b>, astrophysicist, Callis Institute. Cordoned-sector clearance, a brother in a labor camp, and a dead drop that found us the day we got eyes on Callis. She’s offering hers.'},
  renn:{id:'renn',name:'Customs Chief Renn',type:'Officer · Customs',loc:'Meridian Docks',level:1,cult:15,risk:30,inc:{c:30},
    bio:'Skims the skimmers at the Capital’s docks. Now skims for us.',
    pitch:'<b>Customs Chief Renn</b> runs Meridian’s freight inspections and a private retirement fund. Our scouts caught the fund. He’d rather pay us than the auditors.'},
};
const RECRUITS={
  Soldier:[['Tam Reyes','Loader by day. Angry always.'],['Vess Okoro','Talks little, hits precisely.'],['Juno Falk','Stole her first crawler at twelve.']],
  Support:[['Mira Osk','Quartermaster. Counts every bolt twice.'],['Odo Fenn','Ran a Hegemony flight tower for nine years. Defected with the manuals.'],['Aide Corso','Knows which forms make things disappear.'],['Tela Bryn','Lab tech. Fixes what she’s told is unfixable.']],
};
function rollSignal(src){
  if(src.signal||src.pendingEvent)return;
  const pool=SIGNALS[src.id];
  if(!pool)return;
  if(rng()<0.35+0.12*src.level){
    const sig=pool[src.sigIdx%pool.length];
    src.sigIdx++;
    src.signal=Object.assign({},sig);
    if(sig.kind==='mission'&&!sig.text)src.signal.text='“I have something. Too big for a dead drop. Come find out.”';
  }
}
function followSignal(src){
  const sig=src.signal;
  src.signal=null;
  if(!sig)return '';
  if(sig.kind==='mission'){
    addMission(sig.mid);
    return 'New mission on the board: <b>'+MPOOL[sig.mid].name+'</b>.';
  }
  if(sig.kind==='recruit'||sig.kind==='recruitS'){
    if(G.people.length>=bunkCap())return 'No bunks left. They stay where they are — build an annex first.';
    G.recruitN++;
    const role=sig.kind==='recruit'?'Soldier':'Support';
    const nm=RECRUITS[role][(G.recruitN-1)%RECRUITS[role].length];
    const p={id:'rec'+G.recruitN,name:nm[0],role,level:1,xp:0,assign:'rest',injured:0,bio:nm[1]};
    if(role==='Soldier')p.equip=['pistol'];
    G.people.push(p);
    news('<b>'+nm[0]+'</b> ('+role+') takes the oath in the storeroom. One more of us.','g');
    return '<b>'+nm[0]+'</b> is vetted and in. A bunk is theirs — '+(role==='Support'?'assign them a station from their file.':'arm them from the rack.');
  }
  return sig.apply?sig.apply():'';
}
function addMission(mid){
  if(G.missions.some(m=>m.id===mid))return;
  const m=Object.assign({id:mid,state:'avail',progress:null},MPOOL[mid]);
  G.missions.splice(G.missions.length-1,0,m);
  news('Mission available: <b>'+m.name+'</b> ('+m.from+').','a');
  G.misPopQ=G.misPopQ||[];
  G.misPopQ.push(mid);
  sAlert();
}
function maybeQueueEvent(src){
  if(src.pendingEvent||src.signal)return;
  const pool=SRC_EVENTS[src.id];
  if(!pool||!pool.length)return;
  if(rng()<0.3)src.pendingEvent=pool[src.eventsSeen%pool.length];
}

/* ---------- day advance ---------- */
function advanceDay(){
  if(!started)return;
  G.day++;
  closeTilePop();closeWin();exitRoomView();
  for(const rm of G.rooms){
    if(rm.build){
      rm.build.days--;
      if(rm.build.days<=0){delete rm.build;news(ROOMS[rm.key].name+' finished. Put it to work.','g');sBuild();}
    }
  }
  for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){
    const cell=G.grid[r][c];
    if(cell.t==='rubble'&&cell.dig){
      cell.dig--;
      if(cell.dig<=0){G.grid[r][c]={t:'floor'};news('Excavation done. One more chamber that’s ours.','g');}
    }
  }
  const rate=hasRoom('workshop')?(staffOf('workshop').length?15:8):5;
  const repCost=staffOf('store').length?1:2;
  for(const f of G.fighters){
    if(f.out||f.hull>=100)continue;
    if(G.supplies>=repCost){G.supplies-=repCost;f.hull=Math.min(100,f.hull+rate);}
  }
  const xpRate=staffOf('training').length?0.09:0.06;
  for(const p of G.people){
    if(p.injured>0){
      p.injured-=(hasRoom('infirmary')&&medStaff().length)?2:1;
      if(p.injured<=0){p.injured=0;news(p.name+' is back on their feet.','g');}
      continue;
    }
    if(p.assign==='train'&&hasRoom('training')){p.xp+=xpRate;levelUp(p);}
    if(p.assign==='rest')G.morale=Math.min(100,G.morale+0.5);
  }
  for(const src of G.sources){
    if(!src.alive)continue;
    src.visited=false;src.contacted=false;
    if(src.inc.c)G.credits+=src.inc.c;
    if(src.inc.s)G.supplies+=src.inc.s;
    if(src.inc.i)G.intel+=src.inc.i;
    src.risk=Math.min(100,src.risk+(src.level===1?2:src.level===2?1:0.5));
    maybeQueueEvent(src);
    if(src.risk>70&&rng()<(src.risk-70)/220){
      src.alive=false;
      G.risk=Math.min(100,G.risk+15);
      G.morale=Math.max(0,G.morale-6);
      news('<b>'+src.name+'</b> has been BURNED. Counter-intelligence took them at '+src.loc+'. Assume they talk.','h');
      sAlert();
    } else if(src.risk>70){
      news(src.name+' is running hot — risk '+Math.round(src.risk)+'. Decide something before the Hegemony does.','h');
    }
  }
  if(hasRoom('comms')&&staffOf('comms').length)G.intel+=roomsOf('comms').length;
  else if(hasRoom('comms'))news('The comms array hums to nobody. Assign a Signals Operator or it’s just furniture.','d');
  for(const m of G.missions){
    if(m.state!=='prog')continue;
    m.progress.daysLeft--;
    if(m.progress.daysLeft<=0)resolveMission(m);
    else news(m.name+' — strike team checks in. '+m.progress.daysLeft+' day'+(m.progress.daysLeft>1?'s':'')+' out.','d');
  }
  G.renown=Math.min(100,G.renown+2+G.sources.filter(s=>s.alive).reduce((a,s)=>a+s.level,0));
  if(G.renown>=100&&!G.revNoted){
    G.revNoted=true;
    news('Three worlds now whisper our name. <b>Revolution Level 2</b> is coming — and so is their intelligence agency. (Future build.)','p');
  }
  const FLAVOR=[
    'Hegemony patrols double in the drift. Coverage halves. Typical.',
    'A Hegemony cadet washed out and deserted. The stories he tells about his instructor are worth listening to.',
    'Grain barges late at the Capital again. Queues breed questions. Good.',
    'Mira recounts the storeroom. Finds three bolts missing. Opens an investigation into herself.',
    'Someone painted our mark on a water tower two systems over. Wasn’t us. That’s the point.',
  ];
  if(rng()<0.5)news(FLAVOR[Math.floor(rng()*FLAVOR.length)],'d');
  $('dayBannerTxt').textContent='Day '+G.day;
  $('dayBanner').classList.add('show');
  setTimeout(()=>$('dayBanner').classList.remove('show'),RM?400:1100);
  sDay();
  saveSnap();syncUI();
}

/* ---------- missions ---------- */
function launchMission(m,pilotIds){
  const pilots=G.people.filter(p=>pilotIds.includes(p.id));
  const usable=m.ground?
    G.fighters.filter(f=>f.cls==='graf'&&!f.out&&f.hull>=60).slice(0,1):
    G.fighters.filter(f=>!f.out&&f.hull>=60).slice(0,pilots.length);
  if(pilots.length<m.need||usable.length<(m.ground?1:m.need))return false;
  for(const p of pilots)p.assign='mission';
  for(const f of usable)f.out=true;
  m.state='prog';
  m.progress={daysLeft:m.days,pilots:pilotIds,fighters:usable.map(f=>f.id)};
  news('<b>'+m.name+'</b> — '+(m.ground?'ground team':'strike team')+' away: '+pilots.map(p=>p.name.split(' ')[0]).join(', ')+'.','a');
  sLaunch();
  closeWin();syncUI();
  return true;
}
function resolveMission(m){
  const pilots=G.people.filter(p=>m.progress.pilots.includes(p.id));
  const avgLvl=pilots.reduce((a,p)=>a+p.level,0)/Math.max(1,pilots.length);
  const cmdBonus=staffOf('command').length?0.05:0;
  const ok=rng()<Math.min(0.92,0.45+avgLvl*0.08+G.morale*0.002+cmdBonus);
  for(const p of pilots)p.assign='rest';
  for(const fid of m.progress.fighters){const f=G.fighters.find(x=>x.id===fid);if(f)f.out=false;}
  if(ok){
    let rew=[];
    if(m.rew.c){G.credits+=m.rew.c;rew.push(C(m.rew.c));}
    if(m.rew.s){G.supplies+=m.rew.s;rew.push(S(m.rew.s));}
    if(m.rew.i){G.intel+=m.rew.i;rew.push(I(m.rew.i));}
    if(m.rew.fighter){
      if(G.fighters.length<fighterCap()){
        G.fighters.push({id:'t'+(G.fighters.length+1),name:'Talon '+(G.fighters.length),cls:'talon',hull:70,out:false});
        rew.push('+1 fighter');
      } else {G.credits+=150;rew.push('no berth — sold for '+C(150));}
    }
    if(m.rew.cross){
      if(G.fighters.length<fighterCap()){
        G.fighters.push({id:'cross_'+(G.fighters.length+1),name:'Dustfall',cls:'cross',hull:85,out:false});
        rew.push('+FT-4 Cross');
      } else {G.credits+=200;rew.push('no berth — Cross fenced for '+C(200));}
    }
    for(const p of pilots){p.xp+=m.rew.xp||0.1;levelUp(p);}
    G.renown=Math.min(100,G.renown+20);
    G.morale=Math.min(100,G.morale+6);
    m.state='done';m.meta='SUCCESS';
    news('<b>'+m.name+'</b> — SUCCESS. '+rew.join(' · ')+'. '+(m.ground?'Squad':'Flight')+' XP awarded.','g');
    sBuild();
  } else {
    const hurt=pilots[Math.floor(rng()*pilots.length)];
    hurt.injured=(hasRoom('infirmary')&&medStaff().length)?2:4;
    const f=G.fighters.find(x=>x.id===m.progress.fighters[0]);
    if(f)f.hull=Math.max(15,f.hull-30);
    G.morale=Math.max(0,G.morale-8);
    m.state='avail';m.progress=null;
    news('<b>'+m.name+'</b> — FAILED. '+(m.ground?'The deputies were ready.':'The escort was waiting.')+' '+hurt.name+' hurt; '+(f?f.name+' shot up.':''),'h');
    sAlert();
  }
  m.progress=null;
}

/* ---------- source actions (results delivered over comms) ---------- */
function srcVisit(src){
  if(src.visited)return;
  src.visited=true;
  src.cult=Math.min(100,src.cult+10);
  src.risk=Math.min(100,src.risk+6);
  G.risk=Math.min(100,G.risk+1);
  const lvl=checkCultLevel(src);
  rollSignal(src);
  const lines=['You make the crossing to '+src.loc+' yourself. '+src.name.split(' ')[0]+' needed a face, not a frequency.',
    'Cultivation +10. Their risk +6 — being seen costs.'];
  if(lvl)lines.push(lvl);
  openComm(src,{lines,signal:src.signal});
  syncUI();
}
function srcContact(src){
  if(src.pendingEvent){openComm(src,{event:src.pendingEvent});return;}
  if(src.contacted&&!src.signal)return;
  if(!src.contacted){
    src.contacted=true;
    src.cult=Math.min(100,src.cult+3);
    rollSignal(src);
  }
  const lvl=checkCultLevel(src);
  const lines=['Coded burst to '+src.loc+'. '+src.name.split(' ')[0]+' answers on the second pass.','Cultivation +3. They know we’re listening.'];
  if(lvl)lines.push(lvl);
  openComm(src,{lines,signal:src.signal});
  syncUI();
}
function srcAnswer(src,idx){
  const ev=src.pendingEvent;
  const kind=ev.opts[idx][1];
  src.pendingEvent=null;
  src.eventsSeen++;
  src.contacted=true;
  const lines=[];
  if(kind==='strong'){
    src.cult=Math.min(100,src.cult+22);src.risk=Math.max(0,src.risk-5);
    lines.push(src.name.split(' ')[0]+' steadies. You can hear it. Cultivation +22, risk −5.');
    if(ev.mission){addMission(ev.mission);lines.push('And they came through: <b>'+MPOOL[ev.mission].name+'</b> is on the board.');}
  } else if(kind==='neutral'){
    src.cult=Math.min(100,src.cult+8);
    lines.push('Acknowledged. The line holds. Cultivation +8.');
  } else {
    src.cult=Math.max(0,src.cult-10);src.risk=Math.min(100,src.risk+8);
    lines.push('A long silence before the channel closes. That landed badly. Cultivation −10, risk +8.');
  }
  const lvl=checkCultLevel(src);
  if(lvl)lines.push(lvl);
  rollSignal(src);
  openComm(src,{lines,signal:src.signal});
  syncUI();
}
function checkCultLevel(src){
  if(src.cult>=100&&src.level<3){
    src.level++;src.cult=0;src.risk=Math.max(0,src.risk-15);
    for(const k in src.inc)src.inc[k]=Math.round(src.inc[k]*1.6);
    news('<b>'+src.name+'</b> climbs higher — source level '+src.level+'.','p');
    sBuild();
    return 'They’ve climbed higher on our behalf — <b>source level '+src.level+'</b>. Better access, better take.';
  }
  return null;
}
function srcSilence(src){
  src.alive=false;
  G.morale=Math.max(0,G.morale-10);
  news('The assassin reports in: <b>'+src.name+'</b> won’t be talking to anyone. The crew heard anyway.','h');
  sAlert();
  closeWin();openWin('sources');
  syncUI();
}
function srcCutLoose(src){
  src.alive=false;
  G.morale=Math.max(0,G.morale-6);
  for(const o of G.sources)if(o.alive&&o!==src)o.cult=Math.max(0,o.cult-20);
  news('<b>'+src.name+'</b> cut loose — codes burned, drops abandoned. The whole network feels the cold.','h');
  closeWin();openWin('sources');
  syncUI();
}
function acceptCandidate(id){
  const cd=CANDS[id];
  if(!cd)return closeWin();
  if(G.sources.some(s=>s.id===cd.id)){closeWin();return;}
  if(G.sources.filter(s=>s.alive).length>=sourceCap()){
    news('No capacity to run another source safely. '+cd.name+' walks.','h');
  } else {
    G.sources.push(Object.assign({alive:true,visited:false,contacted:false,pendingEvent:null,eventsSeen:0,signal:null,sigIdx:0},
      JSON.parse(JSON.stringify(cd))));
    news('<b>'+cd.name+'</b> joins the network.','g');
    G.risk=Math.min(100,G.risk+4);
  }
  closeWin();syncUI();
}
function openComm(src,payload){openWin('comm',{src,payload});}

/* ---------- scouting ---------- */
function pdef(id){return PLANETDEF.find(p=>p.id===id);}
function pst(id){return G.planets.find(p=>p.id===id);}
function srcMapPos(src,w,h){
  const pl=pdef(SRCPOS[src.id]||'veray');
  const i=G.sources.filter(s=>s.alive&&(SRCPOS[s.id]||'veray')===pl.id).findIndex(s=>s.id===src.id);
  return [w*pl.x+34+i*18,h*pl.y+2+i*12];
}
function scoutPlanet(id){
  const d=pdef(id),st=pst(id);
  if(!d||!st||st.access||G.intel<d.scout)return;
  G.intel-=d.scout;
  const wasKnown=st.known;
  st.known=true;st.access=true;st.scouted=true;
  news('Scout report: <b>'+d.name+'</b> charted. We have access.','r');
  const lines=[(wasKnown?'Eyes on '+d.name+' at last.':'The uncharted signal resolves: <b>'+d.name+'</b>, '+d.kind.toLowerCase()+'.'),d.sit];
  // what the scouts turned up
  if(id==='brakka'){addMission('stealcross');lines.push('A sheriff town called Dustfall. One FT-4 Cross on the pad, and the deputies patrol like the war’s already won. There’s a theft in this.');}
  else if(id==='dreymar'){addMission('orehaul');lines.push('Payday barge, no escort. The miners practically drew us a map.');}
  else if(id==='volund'){addMission('foundry');lines.push('A clerk in freight control sells manifests. There’s a job here.');}
  else if(id==='callis'){G.candQ.push('marr');lines.push('And a dead drop was waiting for us — someone at the Institute knew we’d come.');}
  else if(id==='meridian'){G.candQ.push('renn');lines.push('Our people flagged a customs chief with expensive habits and flexible loyalties.');}
  else if(id==='sable'){G.intel+=3;lines.push('The listening post still works. We stripped its logs: '+I(3)+' recovered.');}
  else if(id==='tarsis'){G.supplies+=40;G.morale=Math.min(100,G.morale+4);lines.push('The farmers hide grain from the levy. Some of it now hides with us: '+S(40)+'. The crew eats well tonight.');}
  else if(id==='nyx'){G.credits+=40;lines.push('The shadowport takes all kinds. First introductions cost us nothing and paid '+C(40)+' in fenced salvage. Recruits drink here.');}
  else if(id==='oubli'){G.intel+=1;lines.push('Empty streets. Forty years of dust. One transmitter, still powered, still listening. We left it that way. '+I(1)+'.');}
  else if(id==='halcyon'){G.renown=Math.min(100,G.renown+8);lines.push('Brass, beaches, and no idea we were there. Knowing Halcyon exists for us is worth renown alone.');}
  sBuild();
  openWin('comm',{src:{name:'Pathfinder Team',loc:d.name},payload:{lines}});
  saveSnap();syncUI();
}
/* ---------- audio ---------- */
function sDay(){osc('sine',90,45,0.28,0.5);nz('bandpass',400,2,0.1,0.5,0,1200);}
function sBuild(){osc('triangle',220,110,0.16,0.3);osc('triangle',330,165,0.1,0.34,0.05);}
function sAlert(){osc('square',880,880,0.06,0.08);osc('square',660,660,0.06,0.1,0.1);}
function sLaunch(){nz('bandpass',200,2,0.14,0.7,0,1800);osc('sine',60,140,0.14,0.6);}
function sClick(){osc('square',1400,1200,0.02,0.04);}
function sComm(){nz('bandpass',1800,1.4,0.05,0.5);osc('sine',1100,900,0.02,0.15,0.1);}

/* ---------- canvas & iso ---------- */
const cv=$('cv'),ctx=cv.getContext('2d');
let dpr=1,cssW=0,cssH=0,hoverRoomKey=null,hoverCell=null,worldT=0,lastTap={key:null,t:0};
const TW2=34,TH2=17;
function fitCanvas(){
  const r=cv.parentElement.getBoundingClientRect();
  dpr=Math.min(window.devicePixelRatio||1,2);
  cssW=r.width;cssH=r.height;
  cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);
}
addEventListener('resize',()=>{if(SR.active==='base')fitCanvas();});
function isoParams(){
  const extW=(G.cols+G.rows)*TW2+80,extH=(G.cols+G.rows)*TH2+120;
  const S=Math.max(0.7,Math.min(1.5,Math.min((cssW-40)/extW,(cssH-160)/extH)));
  const ox=cssW/2-((G.cols-1)-(G.rows-1))*TW2*S/2;
  const oy=(cssH-((G.cols-1+G.rows-1)*TH2)*S)/2+10;
  return {S,ox,oy};
}
function cellToCss(r,c){
  const {S,ox,oy}=isoParams();
  return [ox+(c-r)*TW2*S, oy+(c+r)*TH2*S, S];
}
function cssToCell(px,py){
  const {S,ox,oy}=isoParams();
  const u=(px-ox)/S,v=(py-oy)/S;
  const c=Math.round((u/TW2+v/TH2)/2);
  const r=Math.round((v/TH2-u/TW2)/2);
  if(r<0||r>=G.rows||c<0||c>=G.cols)return null;
  return {r,c};
}
function diamond(x,y,S,inset){
  const w=TW2*S-(inset||0),h=TH2*S-(inset||0)*0.5;
  ctx.beginPath();
  ctx.moveTo(x,y-h);ctx.lineTo(x+w,y);ctx.lineTo(x,y+h);ctx.lineTo(x-w,y);
  ctx.closePath();
}
function roomAt(r,c){
  const cell=G.grid[r]&&G.grid[r][c];
  if(!cell||cell.t!=='room')return null;
  return G.rooms.find(rm=>r>=rm.r&&r<rm.r+rm.h&&c>=rm.c&&c<rm.c+rm.w&&rm.key===cell.room);
}
function roomOutline(rm){
  const [tx,ty,S]=cellToCss(rm.r,rm.c);
  const [rx,ry]=cellToCss(rm.r,rm.c+rm.w-1);
  const [bx,by]=cellToCss(rm.r+rm.h-1,rm.c+rm.w-1);
  const [lx,ly]=cellToCss(rm.r+rm.h-1,rm.c);
  ctx.beginPath();
  ctx.moveTo(tx,ty-TH2*S);
  ctx.lineTo(rx+TW2*S,ry);
  ctx.lineTo(bx,by+TH2*S);
  ctx.lineTo(lx-TW2*S,ly);
  ctx.closePath();
}
function roomCenter(rm){
  const cr=rm.r+(rm.h-1)/2,cc=rm.c+(rm.w-1)/2;
  return cellToCss(cr,cc);
}
function shade(hex,f){
  const n=parseInt(hex.slice(1),16);
  return 'rgb('+Math.min(255,Math.round(((n>>16)&255)*f))+','+Math.min(255,Math.round(((n>>8)&255)*f))+','+Math.min(255,Math.round((n&255)*f))+')';
}
/* small standing figure */
function figure(x,y,S,name,col){
  ctx.fillStyle=col||'#8fd8e0';
  ctx.beginPath();ctx.roundRect(x-3*S,y-12*S,6*S,10*S,3*S);ctx.fill();
  ctx.beginPath();ctx.arc(x,y-15*S,3*S,0,Math.PI*2);ctx.fill();
  if(name){
    ctx.font='600 '+Math.round(9*S)+'px "Exo 2"';
    ctx.textAlign='center';ctx.fillStyle='rgba(160,220,230,0.8)';
    ctx.fillText(name,x,y+9*S);
  }
}
function fighterTop(x,y,S,rot,alive,col){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  ctx.fillStyle=col||'#8fa5c4';
  ctx.beginPath();ctx.moveTo(14*S,0);ctx.lineTo(-8*S,-8*S);ctx.lineTo(-4*S,0);ctx.lineTo(-8*S,8*S);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(200,219,245,0.7)';ctx.lineWidth=1;ctx.stroke();
  ctx.restore();
}
function craftTop(cls,x,y,S,rot,col){
  if(cls==='graf'){
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);
    ctx.fillStyle=col||'#98a68b';
    ctx.beginPath();ctx.roundRect(-14*S,-7*S,26*S,14*S,3*S);ctx.fill();
    ctx.strokeStyle='rgba(205,220,190,0.65)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#141820';
    ctx.beginPath();ctx.roundRect(7*S,-4*S,6*S,8*S,2*S);ctx.fill();
    ctx.strokeStyle='rgba(140,155,125,0.8)';
    ctx.beginPath();ctx.moveTo(-5*S,-7*S);ctx.lineTo(-5*S,7*S);ctx.stroke();
    ctx.restore();
  } else fighterTop(x,y,S,rot,true,col);
}

/* ---------- base map render ---------- */
function renderBase(now){
  for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){
    const cell=G.grid[r][c];
    const [x,y,S]=cellToCss(r,c);
    if(cell.t==='rock'){
      diamond(x,y,S,2);
      ctx.fillStyle='#0d1322';ctx.fill();
      ctx.strokeStyle='rgba(40,55,90,0.25)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='rgba(60,80,120,0.12)';
      ctx.beginPath();ctx.arc(x+((r*7+c*13)%17-8)*S,y+((r*11+c*5)%9-4)*S,1.6*S,0,7);ctx.fill();
      continue;
    }
    if(cell.t==='rubble'){
      diamond(x,y,S,2);
      ctx.fillStyle='#161d30';ctx.fill();
      ctx.strokeStyle='rgba(90,110,150,0.35)';ctx.lineWidth=1;ctx.stroke();
      ctx.strokeStyle='rgba(120,140,180,0.3)';
      ctx.beginPath();
      ctx.moveTo(x-10*S,y-2*S);ctx.lineTo(x-2*S,y+3*S);ctx.moveTo(x+4*S,y-4*S);ctx.lineTo(x+11*S,y+1*S);
      ctx.stroke();
      if(cell.dig){
        ctx.strokeStyle='rgba(255,180,84,0.8)';ctx.lineWidth=1.4;
        diamond(x,y,S,5);ctx.stroke();
        ctx.fillStyle='#ffb454';ctx.font='700 9px "IBM Plex Mono"';ctx.textAlign='center';
        ctx.fillText(cell.dig+'d',x,y+3);
      }
      continue;
    }
    const rm=roomAt(r,c);
    const col=rm?ROOMS[rm.key].col:'#2a3654';
    diamond(x,y,S,1);
    const fg=ctx.createLinearGradient(x,y-TH2*S,x,y+TH2*S);
    if(rm){fg.addColorStop(0,shade(col,0.22));fg.addColorStop(1,shade(col,0.10));}
    else {fg.addColorStop(0,'#1b2440');fg.addColorStop(1,'#131a30');}
    ctx.fillStyle=fg;ctx.fill();
    if(!rm){ctx.strokeStyle='rgba(90,110,160,0.4)';ctx.lineWidth=1;ctx.stroke();}
    if(rm&&rm.build){
      ctx.save();ctx.clip();
      ctx.strokeStyle='rgba(255,180,84,0.35)';ctx.lineWidth=2;
      for(let k=-3;k<=3;k++){ctx.beginPath();ctx.moveTo(x+k*10*S-20,y-20);ctx.lineTo(x+k*10*S+20,y+20);ctx.stroke();}
      ctx.restore();
    }
  }
  // rooms as single entities: one outline, one feature, one label
  for(const rm of G.rooms){
    const col=ROOMS[rm.key].col;
    roomOutline(rm);
    ctx.strokeStyle=shade(col,0.6);ctx.lineWidth=1.4;ctx.stroke();
    const [x,y,S]=roomCenter(rm);
    const pul=0.6+0.4*Math.sin(worldT*0.002+rm.r+rm.c);
    if(!rm.build){
      if(rm.key==='command'){
        ctx.strokeStyle='rgba(255,180,84,'+(0.35+0.3*pul)+')';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.ellipse(x,y-6*S,11*S,5.5*S,0,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='rgba(255,180,84,0.25)';
        ctx.beginPath();ctx.ellipse(x,y-6*S,6*S,3*S,0,0,Math.PI*2);ctx.stroke();
      } else if(rm.key==='hangar'){
        for(let i=0;i<Math.min(3,G.fighters.length);i++){
          const f=G.fighters[i];
          ctx.globalAlpha=f.out?0.2:0.9;
          craftTop(f.cls,x+(i-1)*16*S,y+(i-1)*4*S-4*S,S*0.8,-0.5,f.out?'#3a4560':undefined);
          ctx.globalAlpha=1;
          if(!f.out){
            ctx.fillStyle=f.hull>=100?'#7dd97b':f.hull>=60?'#ffb454':'#ff4f5e';
            ctx.beginPath();ctx.arc(x+(i-1)*16*S-8*S,y+(i-1)*4*S-4*S,1.6*S,0,7);ctx.fill();
          }
        }
      } else if(rm.key==='comms'){
        ctx.strokeStyle='rgba(87,215,226,'+(0.3+0.4*pul)+')';ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(x,y-8*S,5*S,Math.PI*0.9,Math.PI*1.9);ctx.stroke();
        ctx.beginPath();ctx.arc(x,y-8*S,(8+3*pul)*S,Math.PI*1.15,Math.PI*1.65);ctx.stroke();
      } else if(rm.key==='barracks'||rm.key==='quarters'){
        ctx.fillStyle='rgba(87,215,226,0.25)';
        for(let i=0;i<3;i++)ctx.fillRect(x-12*S+i*9*S,y-3*S,6*S,4*S);
      } else if(rm.key==='store'){
        ctx.fillStyle='rgba(125,217,123,0.3)';
        ctx.fillRect(x-6*S,y-5*S,5*S,4*S);ctx.fillRect(x+1*S,y-3*S,5*S,4*S);
      } else if(rm.key==='workshop'){
        if(!RM&&rng()<0.06){ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(x+(rng()-0.5)*10*S,y-2*S,1.2,0,7);ctx.fill();}
        ctx.strokeStyle='rgba(255,180,84,0.5)';ctx.lineWidth=1.4;
        ctx.strokeRect(x-6*S,y-6*S,12*S,6*S);
      } else if(rm.key==='infirmary'){
        ctx.strokeStyle='rgba(125,217,123,0.7)';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x-4*S,y-4*S);ctx.lineTo(x+4*S,y-4*S);ctx.moveTo(x,y-8*S);ctx.lineTo(x,y);ctx.stroke();
      } else if(rm.key==='training'){
        ctx.strokeStyle='rgba(201,135,255,0.55)';ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(x,y-4*S,4.5*S,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.arc(x,y-4*S,1.6*S,0,Math.PI*2);ctx.stroke();
      } else if(rm.key==='bay'){
        ctx.strokeStyle='rgba(87,168,255,0.5)';ctx.lineWidth=1.2;
        ctx.strokeRect(x-8*S,y-5*S,16*S,7*S);
      }
    }
    ctx.font='700 '+Math.round(9.5*S)+'px "Exo 2"';
    ctx.textAlign='center';
    ctx.fillStyle=rm.build?'rgba(255,180,84,0.8)':shade(col,1.15);
    ctx.fillText(ROOMS[rm.key].name.toUpperCase()+(rm.build?' · '+rm.build.days+'d':''),x,y+TH2*(rm.h===1?0.9:1.6)*isoParams().S+8);
  }
  // hover / selection: whole-room outlines
  const hovRm=hoverCell?roomAt(hoverCell.r,hoverCell.c):null;
  if(hovRm){roomOutline(hovRm);ctx.strokeStyle='rgba(255,180,84,0.75)';ctx.lineWidth=1.8;ctx.stroke();}
  else if(hoverCell){
    const [x,y,S]=cellToCss(hoverCell.r,hoverCell.c);
    diamond(x,y,S,1);ctx.strokeStyle='rgba(255,180,84,0.7)';ctx.lineWidth=1.6;ctx.stroke();
  }
  if(tilePopAt){
    if(tilePopAt.room){roomOutline(tilePopAt.room);ctx.strokeStyle='rgba(255,180,84,0.95)';ctx.lineWidth=2;ctx.stroke();}
    else {const [x,y,S]=cellToCss(tilePopAt.r,tilePopAt.c);diamond(x,y,S,0);ctx.strokeStyle='rgba(255,180,84,0.95)';ctx.lineWidth=2;ctx.stroke();}
  }
}

/* ---------- room interior view ---------- */
function enterRoomView(rm){
  if(rm.build)return;
  viewRoom=rm;closeTilePop();
  renderRoomBar();
  $('roomViewBar').hidden=false;
  syncUI();
}
function exitRoomView(){viewRoom=null;$('roomViewBar').hidden=true;}
function staffLine(key){
  if(!STAFFABLE[key])return '';
  const st=staffOf(key)[0];
  return st?('<br>'+STAFFABLE[key].post+': <b style="color:var(--good)">'+st.name+'</b>')
    :('<br><span style="color:var(--heg)">'+STAFFABLE[key].post+' post empty</span> — '+STAFFABLE[key].perk+' when filled');
}
function renderRoomBar(){
  const rm=viewRoom;if(!rm)return;
  const R=ROOMS[rm.key];
  let info='';
  if(rm.key==='hangar'||rm.key==='bay'){
    const rate=hasRoom('workshop')?(staffOf('workshop').length?15:8):5;
    info='Berths '+G.fighters.length+'/'+fighterCap()+' · repairs '+rate+'%/day at '+S(staffOf('store').length?1:2)+' each';
  } else if(rm.key==='barracks'||rm.key==='quarters'){
    info='Bunks '+G.people.length+'/'+bunkCap()+' · morale '+Math.round(G.morale)+
      '<br>Recruits come through the network. Work your sources; when one signals about people, follow it.';
  } else if(rm.key==='store'){
    info=C(Math.round(G.credits))+' · '+S(Math.round(G.supplies))+' · '+I(Math.round(G.intel))+
      '<br>Armory: '+G.armory.map(a=>a.name+' ×'+a.n).join(' · ')+staffLine('store');
  } else if(rm.key==='infirmary'){
    const patients=G.people.filter(p=>p.injured>0);
    info='Patients: '+(patients.length?patients.map(p=>p.name+' ('+p.injured+'d)').join(', '):'none')+staffLine('infirmary');
  } else if(rm.key==='training'){
    const tr=G.people.filter(p=>p.assign==='train');
    info='Training: '+(tr.length?tr.map(p=>p.name).join(', '):'nobody. The mats are lonely.')+staffLine('training');
  } else if(rm.key==='comms'){
    info='Source capacity '+G.sources.filter(s=>s.alive).length+'/'+sourceCap()+staffLine('comms');
  } else if(rm.key==='command'){
    info='Renown '+Math.round(G.renown)+'/100 · network exposure '+Math.round(G.risk)+staffLine('command');
  } else if(rm.key==='workshop'){
    info='Repair pace '+(staffOf('workshop').length?15:8)+'%/day'+staffLine('workshop');
  }
  let acts='';
  if(rm.key==='command')acts='<button class="pbtn" data-open="missions">Mission Board</button><button class="pbtn" data-open="sources">Source Network</button>';
  if(rm.key==='training')acts='<button class="pbtn" data-simulator>Simulator — dogfight exercise ▸</button>';
  $('roomViewBar').innerHTML='<div class="rvt">'+R.name+'</div><div class="rvd">'+R.desc+'</div>'+
    '<div class="rvinfo">'+info+'</div>'+acts+
    '<button class="pbtn" data-backbase>← Back to the base</button>'+
    '<div class="pophint">double-click a rebel in the room for their file</div>';
}
let rvFigs=[],rvParts=[],rvLast=0;
function renderRoomView(now){
  const rm=viewRoom;
  const Sx=Math.min(cssW,cssH*1.6)/560;
  const cx=cssW/2,cy=cssH*0.56;
  const col=ROOMS[rm.key].col;
  const dtv=Math.min(0.05,(now-(rvLast||now))/1000);rvLast=now;
  rvFigs=[];
  const addFig=(fx,fy,p,fcol)=>{
    figure(fx,fy,2,p?p.name.split(' ')[0]:'',fcol);
    if(p)rvFigs.push({x:cx+fx*Sx,y:cy+fy*Sx,r:18,pid:p.id});
  };
  const spark=(fx,fy,scol)=>{
    if(RM)return;
    rvParts.push({x:fx,y:fy,vx:(rng()-0.5)*60,vy:-20-rng()*50,life:0,max:0.4+rng()*0.3,col:scol||'#ffe08a'});
  };
  // big floor
  ctx.save();
  ctx.translate(cx,cy);
  ctx.scale(Sx,Sx);
  ctx.beginPath();
  ctx.moveTo(0,-130);ctx.lineTo(250,0);ctx.lineTo(0,130);ctx.lineTo(-250,0);ctx.closePath();
  const fg=ctx.createLinearGradient(0,-130,0,130);
  fg.addColorStop(0,shade(col,0.3));fg.addColorStop(1,shade(col,0.12));
  ctx.fillStyle=fg;ctx.fill();
  ctx.strokeStyle=shade(col,0.7);ctx.lineWidth=2;ctx.stroke();
  // back walls hint
  ctx.strokeStyle='rgba(120,150,200,0.2)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,-130);ctx.lineTo(0,-190);ctx.moveTo(250,0);ctx.lineTo(250,-60);ctx.moveTo(-250,0);ctx.lineTo(-250,-60);ctx.stroke();
  const pul=0.6+0.4*Math.sin(now*0.002);
  if(rm.key==='hangar'||rm.key==='bay'){
    const cap=fighterCap();
    for(let i=0;i<cap;i++){
      const bx=(i-(cap-1)/2)*130,by=i%2?40:-20;
      ctx.strokeStyle='rgba(87,168,255,0.35)';ctx.lineWidth=1.5;ctx.setLineDash([6,5]);
      ctx.beginPath();ctx.moveTo(bx,by-45);ctx.lineTo(bx+80,by);ctx.lineTo(bx,by+45);ctx.lineTo(bx-80,by);ctx.closePath();ctx.stroke();
      ctx.setLineDash([]);
      const f=G.fighters[i];
      if(f&&!f.out){
        craftTop(f.cls,bx,by,3.4,-0.5);
        ctx.font='700 12px "Exo 2"';ctx.textAlign='center';
        ctx.fillStyle='#a0dce6';ctx.fillText(f.name,bx,by+62);
        ctx.fillStyle='rgba(20,32,60,0.9)';ctx.fillRect(bx-26,by+68,52,5);
        ctx.fillStyle=f.hull>=100?'#7dd97b':f.hull>=60?'#ffb454':'#ff4f5e';
        ctx.fillRect(bx-26,by+68,52*f.hull/100,5);
        if(f.hull<100&&rng()<0.05)spark(bx+(rng()-0.5)*36,by+8);
      } else {
        ctx.font='700 11px "Exo 2"';ctx.textAlign='center';
        ctx.fillStyle='rgba(87,168,255,0.5)';
        ctx.fillText(f&&f.out?f.name+' — OUT':'EMPTY BERTH',bx,by+4);
      }
    }
  } else if(rm.key==='command'){
    ctx.strokeStyle='rgba(255,180,84,'+(0.4+0.3*pul)+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,-10,90,42,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(255,180,84,0.25)';
    ctx.beginPath();ctx.ellipse(0,-10,55,25,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<14;i++){
      ctx.fillStyle='rgba(255,220,160,'+(0.3+0.5*Math.abs(Math.sin(i*3+now*0.001)))+')';
      ctx.beginPath();ctx.arc(Math.cos(i*2.4)*60,-10-40-Math.sin(i*1.7)*18,1.4,0,7);ctx.fill();
    }
    staffOf('command').forEach((p,i)=>addFig(-120+i*40,50,p,'#9fe0a8'));
  } else if(rm.key==='barracks'||rm.key==='quarters'){
    const cap=bunkCap();
    const resters=G.people.filter(p=>p.assign==='rest'&&!p.injured);
    for(let i=0;i<cap;i++){
      const bx=(i%3-1)*140,by=Math.floor(i/3)*54-40;
      ctx.fillStyle='rgba(87,215,226,0.14)';
      ctx.fillRect(bx-40,by-12,80,24);
      ctx.strokeStyle='rgba(87,215,226,0.4)';ctx.lineWidth=1;ctx.strokeRect(bx-40,by-12,80,24);
      const p=resters[i];
      if(p){
        ctx.fillStyle='rgba(143,216,224,0.8)';
        ctx.beginPath();ctx.roundRect(bx-28,by-6,44,11,5);ctx.fill();
        ctx.beginPath();ctx.arc(bx+24,by,5,0,7);ctx.fill();
        ctx.font='600 10px "Exo 2"';ctx.textAlign='center';
        ctx.fillStyle='rgba(160,220,230,0.75)';ctx.fillText(p.name.split(' ')[0],bx,by+24);
        rvFigs.push({x:cx+bx*Sx,y:cy+by*Sx,r:22,pid:p.id});
      }
    }
  } else if(rm.key==='store'){
    const stacks=Math.max(2,Math.min(9,Math.round(G.supplies/25)));
    for(let i=0;i<stacks;i++){
      const bx=(i%3-1)*110+((i*37)%23-11),by=Math.floor(i/3)*46-40;
      ctx.fillStyle='rgba(125,217,123,'+(0.25+((i*7)%10)/40)+')';
      ctx.fillRect(bx-22,by-16,44,32);
      ctx.strokeStyle='rgba(125,217,123,0.5)';ctx.lineWidth=1;ctx.strokeRect(bx-22,by-16,44,32);
    }
    // weapon rack
    ctx.strokeStyle='rgba(255,180,84,0.6)';ctx.lineWidth=2;
    ctx.strokeRect(150,-80,80,50);
    G.armory.forEach((a,i)=>{
      ctx.font='700 12px "IBM Plex Mono"';ctx.textAlign='left';
      ctx.fillStyle='#ffb454';ctx.fillText(a.ic+' ×'+a.n,158,-60+i*16);
    });
    staffOf('store').forEach((p,i)=>addFig(-160+i*40,60,p,'#9fe0a8'));
  } else if(rm.key==='workshop'){
    const wounded=G.fighters.find(f=>!f.out&&f.hull<100);
    ctx.strokeStyle='rgba(255,180,84,0.5)';ctx.lineWidth=2;
    ctx.strokeRect(-70,-30,140,46);
    if(wounded){
      craftTop(wounded.cls,0,-8,3,-0.3);
      ctx.font='700 11px "Exo 2"';ctx.textAlign='center';
      ctx.fillStyle='#ffd9a0';ctx.fillText(wounded.name+' — '+wounded.hull+'%',0,44);
      if(rng()<0.12)spark((rng()-0.5)*80,-6);
    } else {
      ctx.font='700 11px "Exo 2"';ctx.textAlign='center';
      ctx.fillStyle='rgba(255,180,84,0.5)';ctx.fillText('LIFT EMPTY — nothing broken. For once.',0,0);
    }
    staffOf('workshop').forEach((p,i)=>addFig(-110+i*40,50,p,'#ffd9a0'));
  } else if(rm.key==='infirmary'){
    const patients=G.people.filter(p=>p.injured>0);
    for(let i=0;i<2;i++){
      const bx=(i-0.5)*160,by=-10;
      ctx.fillStyle='rgba(125,217,123,0.12)';ctx.fillRect(bx-45,by-14,90,28);
      ctx.strokeStyle='rgba(125,217,123,0.45)';ctx.strokeRect(bx-45,by-14,90,28);
      const p=patients[i];
      if(p){
        ctx.fillStyle='rgba(255,150,150,0.8)';
        ctx.beginPath();ctx.roundRect(bx-32,by-7,52,12,6);ctx.fill();
        ctx.beginPath();ctx.arc(bx+28,by-1,6,0,7);ctx.fill();
        ctx.font='600 10px "Exo 2"';ctx.textAlign='center';
        ctx.fillStyle='rgba(255,180,180,0.85)';ctx.fillText(p.name.split(' ')[0]+' · '+p.injured+'d',bx,by+28);
        rvFigs.push({x:cx+bx*Sx,y:cy+by*Sx,r:24,pid:p.id});
      }
    }
    const staff=medStaff();
    staff.forEach((p,i)=>addFig(-40+i*60,70,p,'#9fe0a8'));
    if(!staff.length){
      ctx.font='700 11px "Exo 2"';ctx.textAlign='center';
      ctx.fillStyle='rgba(255,120,120,0.6)';ctx.fillText('MEDIC POST EMPTY — post Support crew from their file',0,105);
    }
  } else if(rm.key==='training'){
    ctx.strokeStyle='rgba(201,135,255,0.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,70,0,Math.PI*2);ctx.stroke();
    const tr=G.people.filter(p=>p.assign==='train');
    tr.forEach((p,i)=>{
      const a=i*2.1+now*0.0012;
      addFig(Math.cos(a)*40,Math.sin(a)*20,p);
    });
    if(!tr.length){
      ctx.font='700 11px "Exo 2"';ctx.textAlign='center';
      ctx.fillStyle='rgba(201,135,255,0.5)';ctx.fillText('EMPTY MATS — assign rebels from their files',0,4);
    }
    staffOf('training').forEach((p,i)=>addFig(90+i*40,-50,p,'#c9a8ff'));
    // the simulator pod lives here
    ctx.strokeStyle='rgba(87,215,226,0.6)';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-190,-70,70,44,10);ctx.stroke();
    ctx.fillStyle='rgba(87,215,226,'+(0.15+0.12*pul)+')';
    ctx.beginPath();ctx.roundRect(-184,-64,58,32,8);ctx.fill();
    ctx.font='700 10px "Exo 2"';ctx.textAlign='center';
    ctx.fillStyle='rgba(87,215,226,0.85)';ctx.fillText('SIMULATOR',-155,-14);
  } else if(rm.key==='comms'){
    ctx.strokeStyle='rgba(87,215,226,0.7)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,-30,26,Math.PI*0.85,Math.PI*2.05);ctx.stroke();
    for(let k=1;k<=3;k++){
      ctx.strokeStyle='rgba(87,215,226,'+(0.5-k*0.13)*pul+')';
      ctx.beginPath();ctx.arc(0,-40,26+k*(16+6*pul),Math.PI*1.15,Math.PI*1.85);ctx.stroke();
    }
    // waveform
    ctx.strokeStyle='rgba(87,215,226,0.5)';ctx.lineWidth=1.4;
    ctx.beginPath();
    for(let px=-100;px<=100;px+=4){
      const vy=60+Math.sin(px*0.11+now*0.006)*8*Math.sin(px*0.023+now*0.001);
      px===-100?ctx.moveTo(px,vy):ctx.lineTo(px,vy);
    }
    ctx.stroke();
    staffOf('comms').forEach((p,i)=>addFig(120+i*40,30,p,'#8fd8e0'));
  }
  // room-local sparks (persistent particles, not per-frame flicker)
  for(const p of rvParts){p.life+=dtv;p.x+=p.vx*dtv;p.y+=p.vy*dtv;p.vy+=160*dtv;}
  rvParts=rvParts.filter(p=>p.life<p.max);
  for(const p of rvParts){
    const k=1-p.life/p.max;
    ctx.globalAlpha=Math.max(0,k);
    ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,1.4+k*1.4,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

/* ---------- galaxy + comm canvases (drawn while their windows are open) ---------- */
function drawGalaxy(now){
  const g=$('galaxyCv');
  if(!g)return;
  const r=g.getBoundingClientRect();
  if(g.width!==Math.round(r.width*dpr)){g.width=Math.round(r.width*dpr);g.height=Math.round(r.height*dpr);}
  const c2=g.getContext('2d');
  c2.setTransform(dpr,0,0,dpr,0,0);
  const w=r.width,h=r.height;
  c2.fillStyle='#05070f';c2.fillRect(0,0,w,h);
  // the core glows in the upper right; the verge is dark
  let cg=c2.createRadialGradient(w*0.86,h*0.38,20,w*0.86,h*0.38,w*0.5);
  cg.addColorStop(0,'rgba(255,180,120,0.10)');cg.addColorStop(1,'rgba(255,180,120,0)');
  c2.fillStyle=cg;c2.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){
    const a=i*0.53,rad=6+i*0.85;
    const x=w*0.55+Math.cos(a)*rad*1.7,y=h*0.45+Math.sin(a)*rad*0.6;
    if(x<0||x>w||y<0||y>h)continue;
    c2.fillStyle='rgba(140,170,230,'+(0.04+((i*13)%10)/110)+')';
    c2.beginPath();c2.arc(x,y,((i*7)%3)/2+0.4,0,7);c2.fill();
  }
  const pul=t=>0.5+0.5*Math.sin(now*0.004+t);
  // planets
  for(const d of PLANETDEF){
    const st=pst(d.id);
    const x=w*d.x,y=h*d.y;
    const selHere=srcSel&&srcSel.t==='p'&&srcSel.id===d.id;
    if(!st.known){
      // uncharted signal
      const p=pul(x);
      c2.strokeStyle='rgba(201,135,255,'+(0.25+0.3*p)+')';
      c2.lineWidth=1;
      c2.beginPath();c2.arc(x,y,5+3*p,0,7);c2.stroke();
      c2.font='700 10px "IBM Plex Mono"';c2.textAlign='center';
      c2.fillStyle='rgba(201,135,255,'+(0.5+0.3*p)+')';c2.fillText('?',x,y+3.5);
      c2.font='600 8px "Exo 2"';
      c2.fillStyle='rgba(113,128,156,0.6)';c2.fillText('UNCHARTED',x,y+18);
      if(selHere){c2.strokeStyle='#ffb454';c2.beginPath();c2.arc(x,y,14,0,7);c2.stroke();}
      continue;
    }
    if(d.base){
      c2.fillStyle='#ffb454';
      c2.beginPath();c2.moveTo(x,y-7);c2.lineTo(x+6,y+5);c2.lineTo(x-6,y+5);c2.closePath();c2.fill();
      c2.font='700 9px "Exo 2"';c2.textAlign='center';
      c2.fillStyle='rgba(255,180,84,0.9)';c2.fillText('HAVEN ROCK',x,y+18);
      continue;
    }
    const R=d.core?9:d.kind==='Waystation'?4:6;
    const bodyCol=d.core?'#ffca7a':st.access?'#7db8ff':'#5a6a8c';
    const glow=c2.createRadialGradient(x,y,1,x,y,R*2.4);
    glow.addColorStop(0,d.core?'rgba(255,200,130,0.5)':'rgba(87,168,255,'+(st.access?0.35:0.12)+')');
    glow.addColorStop(1,'rgba(0,0,0,0)');
    c2.fillStyle=glow;c2.beginPath();c2.arc(x,y,R*2.4,0,7);c2.fill();
    c2.fillStyle=bodyCol;
    c2.beginPath();c2.arc(x,y,R,0,7);c2.fill();
    if(d.core){c2.strokeStyle='rgba(255,200,130,0.55)';c2.lineWidth=1.2;
      c2.beginPath();c2.ellipse(x,y,R+6,R*0.4+2,-0.35,0,Math.PI*2);c2.stroke();}
    if(st.access){
      c2.strokeStyle='rgba(87,215,226,0.8)';c2.lineWidth=1.4;
      c2.beginPath();c2.arc(x,y,R+4,0,7);c2.stroke();
    } else {
      c2.strokeStyle='rgba(120,135,165,0.5)';c2.lineWidth=1.2;c2.setLineDash([3,4]);
      c2.beginPath();c2.arc(x,y,R+4,0,7);c2.stroke();c2.setLineDash([]);
      // tiny padlock
      c2.strokeStyle='rgba(160,175,205,0.8)';c2.lineWidth=1.1;
      c2.strokeRect(x+R+4,y-R-9,6,5);
      c2.beginPath();c2.arc(x+R+7,y-R-9,2.4,Math.PI,0);c2.stroke();
    }
    if(selHere){c2.strokeStyle='#ffb454';c2.lineWidth=1.6;c2.beginPath();c2.arc(x,y,R+9,0,7);c2.stroke();}
    c2.font='600 9.5px "Exo 2"';c2.textAlign='center';
    c2.fillStyle=st.access?'rgba(205,216,236,0.95)':'rgba(150,165,195,0.8)';
    c2.fillText(d.name,x,y-R-9);
    c2.font='600 7.5px "Exo 2"';
    c2.fillStyle='rgba(113,128,156,0.75)';
    c2.fillText(st.access?d.kind.toUpperCase():('SCOUT '+d.scout+'◈'),x,y+R+12);
  }
  // sources ride their worlds
  const hx=w*pdef('haven').x,hy=h*pdef('haven').y;
  for(const s of G.sources){
    if(!s.alive)continue;
    const [x,y]=srcMapPos(s,w,h);
    c2.strokeStyle='rgba(87,215,226,0.16)';c2.setLineDash([3,5]);
    c2.beginPath();c2.moveTo(hx,hy);c2.lineTo(x,y);c2.stroke();c2.setLineDash([]);
    const hot=s.risk>60,attn=s.pendingEvent||s.signal;
    const p=pul(x);
    c2.fillStyle=hot?'#ff4f5e':'#57d7e2';
    c2.beginPath();c2.arc(x,y,3.4,0,7);c2.fill();
    c2.strokeStyle=hot?'rgba(255,79,94,0.6)':'rgba(87,215,226,0.5)';
    c2.lineWidth=1.2;
    c2.beginPath();c2.arc(x,y,6+(attn?2.5*p:0),0,7);c2.stroke();
    if(attn){c2.strokeStyle='rgba(255,180,84,'+(0.4+0.5*p)+')';c2.beginPath();c2.arc(x,y,10+3*p,0,7);c2.stroke();}
    if(srcSel&&srcSel.t==='s'&&srcSel.id===s.id){c2.strokeStyle='#ffb454';c2.lineWidth=1.5;c2.beginPath();c2.arc(x,y,13,0,7);c2.stroke();}
    c2.font='600 8.5px "Exo 2"';c2.textAlign='center';
    c2.fillStyle='rgba(160,230,240,0.9)';c2.fillText(s.name.split(' ').pop(),x,y-10);
  }
}
function drawCommStatic(now){
  const g=$('commStatic');
  if(!g)return;
  const r=g.getBoundingClientRect();
  if(g.width!==Math.round(r.width*dpr)){g.width=Math.round(r.width*dpr);g.height=Math.round(r.height*dpr);}
  const c2=g.getContext('2d');
  c2.setTransform(dpr,0,0,dpr,0,0);
  const w=r.width,h=r.height;
  c2.fillStyle='#020409';c2.fillRect(0,0,w,h);
  for(let i=0;i<240;i++){
    c2.fillStyle='rgba(120,255,190,'+(rng()*0.22)+')';
    c2.fillRect(rng()*w,rng()*h,1.5,1.5);
  }
  const sy=(now*0.05)%h;
  c2.fillStyle='rgba(120,255,190,0.07)';c2.fillRect(0,sy,w,7);
  c2.strokeStyle='rgba(120,255,190,0.5)';c2.lineWidth=1.2;
  c2.beginPath();
  for(let x=0;x<w;x+=3){
    const y=h/2+Math.sin(x*0.08+now*0.01)*6*rng()+(rng()-0.5)*8;
    x===0?c2.moveTo(x,y):c2.lineTo(x,y);
  }
  c2.stroke();
  c2.font='700 8px "IBM Plex Mono"';c2.textAlign='left';
  c2.fillStyle='rgba(120,255,190,0.6)';
  c2.fillText('ENCRYPTED · REBEL NET · '+(winArg&&winArg.src?winArg.src.loc.toUpperCase():''),8,12);
}

/* ---------- main render ---------- */
function render(now){
  worldT=now;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const bg=ctx.createRadialGradient(cssW/2,cssH*0.45,60,cssW/2,cssH*0.45,Math.max(cssW,cssH)*0.75);
  bg.addColorStop(0,'#0a0f1e');bg.addColorStop(1,'#03050b');
  ctx.fillStyle=bg;ctx.fillRect(0,0,cssW,cssH);
  if(G){
    if(viewRoom)renderRoomView(now);
    else renderBase(now);
  }
  const vg=ctx.createRadialGradient(cssW/2,cssH/2,Math.min(cssW,cssH)*0.4,cssW/2,cssH/2,Math.max(cssW,cssH)*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,cssW,cssH);
  layoutTilePop();
  if(winMode==='sources')drawGalaxy(now);
  if(winMode==='comm')drawCommStatic(now);
}

/* ---------- tile popup ---------- */
function openTilePop(r,c){
  const rm=roomAt(r,c);
  tilePopAt=rm?{room:rm}:{r,c};
  renderTilePop();
}
function closeTilePop(){tilePopAt=null;$('tilePop').hidden=true;}
function renderTilePop(){
  if(!tilePopAt)return;
  const el=$('tilePop');
  let h='';
  if(tilePopAt.room){
    const rm=tilePopAt.room,R=ROOMS[rm.key];
    h='<div class="ptitle">'+R.name+(rm.build?' — building, '+rm.build.days+'d left':'')+'</div><div class="pdesc">'+R.desc+'</div>';
    if(!rm.build){
      if(rm.key==='command')h+='<button class="pbtn" data-open="missions">Mission Board</button><button class="pbtn" data-open="sources">Source Network</button>';
      if(rm.key==='hangar')h+='<div class="pdesc">Berths '+G.fighters.length+'/'+fighterCap()+'.</div>';
      if(rm.key==='barracks'||rm.key==='quarters')h+='<div class="pdesc">Bunks '+G.people.length+'/'+bunkCap()+'.</div>';
      if(rm.key==='store')h+='<div class="pdesc">'+C(Math.round(G.credits))+' · '+S(Math.round(G.supplies))+' · '+I(Math.round(G.intel))+'</div>';
      h+='<div class="pophint">double-click to step inside</div>';
    }
  } else {
    const {r,c}=tilePopAt;
    const cell=G.grid[r][c];
    if(cell.t==='rock'){
      h='<div class="ptitle">Bedrock</div><div class="pdesc">Nobody’s digging through that. Work the faces the rubble already opened.</div>';
    } else if(cell.t==='rubble'){
      h='<div class="ptitle">Collapsed Chamber</div>';
      if(cell.dig)h+='<div class="pdesc">Crew’s on it — '+cell.dig+' day'+(cell.dig>1?'s':'')+' to daylight. Figuratively.</div>';
      else h+='<div class="pdesc">Rubble from the old diggings. Clear it and we’ve got another room.</div>'+
        '<button class="pbtn" data-dig '+(G.supplies>=EXCAVATE.s?'':'disabled')+'>Excavate <span class="cost">'+S(EXCAVATE.s)+' · '+EXCAVATE.days+'d</span></button>';
    } else {
      h='<div class="ptitle">Empty Chamber</div><div class="pdesc">Cleared, powered, useless. Give it a job.</div>';
      for(const k in BUILDS){
        const b=BUILDS[k];
        const afford=G.credits>=b.c&&G.supplies>=b.s;
        h+='<button class="pbtn" data-build="'+k+'" '+(afford?'':'disabled')+'>'+ROOMS[k].name+
          '<span class="cost">'+C(b.c)+' '+S(b.s)+' · '+b.days+'d</span><small>'+ROOMS[k].desc+'</small></button>';
      }
    }
  }
  el.innerHTML=h;
  el.hidden=false;
  layoutTilePop();
}
function layoutTilePop(){
  if(!tilePopAt)return;
  const el=$('tilePop');
  if(el.hidden)return;
  let x,y;
  if(tilePopAt.room)[x,y]=roomCenter(tilePopAt.room);
  else [x,y]=cellToCss(tilePopAt.r,tilePopAt.c);
  const r=el.getBoundingClientRect();
  let px=x+50,py=y-r.height/2;
  if(px+r.width>cssW-8)px=x-r.width-50;
  px=Math.max(8,Math.min(cssW-r.width-8,px));
  py=Math.max(8,Math.min(cssH-r.height-8,py));
  el.style.left=px+'px';el.style.top=py+'px';
}

/* ---------- windows ---------- */
function openWin(mode,arg){winMode=mode;winArg=arg||null;renderWin();$('winsB').hidden=false;}
function closeWin(){
  winMode=null;winArg=null;$('winsB').hidden=true;
  // a freshly discovered mission announces itself once the channel closes
  if(started&&G&&G.misPopQ&&G.misPopQ.length){
    const mid=G.misPopQ.shift();
    const m=G.missions.find(x=>x.id===mid);
    if(m&&m.state==='avail'){openWin('newmission',m);return;}
  }
  if(started&&G&&G.candQ&&G.candQ.length){
    openWin('candidate',G.candQ.shift());
  }
}
function meter(cls,label,val){
  return '<div class="meter '+cls+'"><span class="ml">'+label+'</span><span class="mt"><i style="width:'+Math.min(100,val)+'%"></i></span><span class="mv">'+Math.round(val)+'</span></div>';
}
function incStr(s){
  return [s.inc.c?C(s.inc.c):null,s.inc.s?S(s.inc.s):null,s.inc.i?I(s.inc.i):null].filter(Boolean).join(' · ')+' <span style="color:var(--dim)">per day</span>';
}
function sourceDetailHTML(s){
  return '<div class="scard'+(s.risk>60?' warn':'')+'">'+
    '<div class="srow"><span class="sname">'+s.name+'</span><span class="stype">'+s.type+' · '+s.loc+'</span><span class="slvl">LVL '+s.level+'</span></div>'+
    '<div class="sbio">“'+s.bio+'”</div>'+
    meter('cult','Cultivation',s.cult)+meter('srisk','Risk',s.risk)+
    '<div class="sinc">'+incStr(s)+'</div>'+
    '<div class="sacts">'+
    '<button class="sbtn'+((s.pendingEvent||s.signal)?' attn':'')+'" data-sc="'+s.id+'" '+((s.contacted&&!s.pendingEvent&&!s.signal)?'disabled':'')+'>'+
      (s.pendingEvent?'✉ Contact — they need an answer':s.signal?'✉ Contact — signal waiting':'Contact')+'</button>'+
    '<button class="sbtn" data-sv="'+s.id+'" '+(s.visited?'disabled':'')+'>Visit</button>'+
    (s.risk>=50?'<button class="sbtn danger" data-ss="'+s.id+'">Silence…</button>':'')+
    '<button class="sbtn danger" data-sl="'+s.id+'">Cut Loose</button>'+
    '</div></div>';
}
function renderWin(){
  const card=$('winCardB');
  card.classList.remove('narrow');
  let h='';
  if(winMode==='sources'){
    card.classList.add('wide');
    const alive=G.sources.filter(s=>s.alive);
    const accessN=G.planets.filter(p=>p.access).length;
    if(!srcSel)srcSel={t:'s',id:alive.length?alive[0].id:null};
    let detail='';
    if(srcSel.t==='s'){
      const s=alive.find(x=>x.id===srcSel.id);
      detail=s?sourceDetailHTML(s):'<div class="pdesc">No sources. We’re blind out there.</div>';
    } else {
      const d=pdef(srcSel.id),st=pst(srcSel.id);
      if(d&&st){
        const cls=st.access?'':st.known?' locked':' unknown';
        detail='<div class="plcard'+cls+'"><div class="prow2">'+
          '<span class="plname">'+(st.known?d.name:'Uncharted Signal')+'</span>'+
          '<span class="plkind">'+(st.known?(d.kind+(d.pop?' · pop '+d.pop:'')):'the Verge · origin unknown')+'</span>'+
          '<span class="placcess" style="color:'+(st.access?'var(--reb)':'var(--dim)')+'">'+(st.access?'ACCESS':'NO ACCESS')+'</span></div>'+
          '<div class="plsit">'+(st.scouted?d.sit:st.known?'Everyone’s heard of it. Nobody’s told us what matters. Scouts would.':'A world out there we know nothing about. Yet.')+'</div>'+
          (st.access?'':'<button class="sbtn'+(G.intel>=d.scout?' attn':'')+'" data-scout="'+d.id+'" '+(G.intel>=d.scout?'':'disabled')+'>Scout & gain access · '+I(d.scout)+'</button>'+
            (G.intel<d.scout?'<span class="pdesc" style="margin-left:8px">not enough intel — work the network</span>':''))+
          '</div>';
        // sources stationed there
        const here=alive.filter(s2=>(SRCPOS[s2.id]||'veray')===d.id);
        if(st.access&&here.length)detail+=here.map(sourceDetailHTML).join('');
      }
    }
    h='<div class="winHead"><span class="wt">Galaxy · '+accessN+' worlds accessible · network '+alive.length+'/'+sourceCap()+'</span><button class="winX" data-close>✕</button></div>'+
      '<div class="winBody"><canvas id="galaxyCv"></canvas>'+
      '<div class="maphint">core worlds burn bright and cost dear · faint signals are uncharted · '+I('')+' buys access</div>'+
      detail+'</div>';
  }
  else if(winMode==='comm'){
    const {src,payload}=winArg;
    card.classList.add('narrow');
    let body='';
    if(payload.event){
      body='<div class="commline">'+payload.event.text+'</div>'+
        payload.event.opts.map((o,i)=>'<button class="dbtn" data-ans="'+i+'">'+o[0]+'</button>').join('');
    } else {
      body=payload.lines.map(l=>'<div class="commline">'+l+'</div>').join('');
      if(payload.signal){
        body+='<div class="commline warn" style="margin-top:9px"><b>SIGNAL:</b> '+payload.signal.text+'</div>'+
          '<button class="dbtn" data-follow>Follow it up.</button>'+
          '<button class="dbtn" data-ignore>Let it lie.</button>';
      } else {
        body+='<button class="dbtn" data-close style="margin-top:9px">Close channel.</button>';
      }
    }
    h='<div class="winHead"><span class="wt">Comm Burst · '+src.name+'</span><button class="winX" data-close>✕</button></div>'+
      '<div class="winBody"><canvas id="commStatic"></canvas><div class="commBody"><div class="commline sys">carrier locked · lag 4.2s · voices masked</div>'+body+'</div></div>';
  }
  else if(winMode==='newmission'){
    const m=winArg;
    card.classList.add('narrow');
    const rew=[m.rew&&m.rew.cross?'+FT-4 Cross':null,m.rew&&m.rew.c?C(m.rew.c):null,m.rew&&m.rew.s?S(m.rew.s):null,m.rew&&m.rew.i?I(m.rew.i):null,m.rew&&m.rew.fighter?'+1 fighter':null].filter(Boolean).join(' ');
    h='<div class="winHead"><span class="wt">New Mission · '+(m.from||'the network')+'</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
      '<div class="mcard" style="margin-bottom:10px"><div class="mrow"><span class="mname">'+m.name+'</span></div>'+
      '<div class="mdesc">'+m.desc+'</div>'+
      '<div class="mmeta">'+m.need+(m.ground?' soldiers':' pilots')+' · '+m.days+' days · risk '+m.riskTxt+' · '+rew+' +XP</div></div>'+
      (m.lead?'<button class="dbtn" data-mlead="'+m.id+'"><b>'+(m.leadTxt||'Fly it yourself')+'</b> — take command in the field.</button>':'')+
      '<button class="dbtn" data-mplan="'+m.id+'">Send a team without you.</button>'+
      '<button class="dbtn" data-close>Noted. It’ll keep on the board.</button>'+
      '</div>';
  }
  else if(winMode==='candidate'){
    const cd=CANDS[winArg]||CANDS.marr;
    card.classList.add('narrow');
    const inc=[cd.inc.c?C(cd.inc.c):null,cd.inc.s?S(cd.inc.s):null,cd.inc.i?I(cd.inc.i):null].filter(Boolean).join(' · ');
    h='<div class="winHead"><span class="wt">Approach · Potential Source</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
      '<div class="commline" style="color:var(--text)">'+cd.pitch+' Network capacity '+G.sources.filter(s=>s.alive).length+'/'+sourceCap()+'.</div>'+
      '<button class="dbtn" data-cand="'+cd.id+'">Take them on. ('+inc+'/day · exposure +4)</button>'+
      '<button class="dbtn" data-cand="no">Too dangerous. Burn the contact.</button>'+
      '</div>';
  }
  else if(winMode==='missions'){
    h='<div class="winHead"><span class="wt">Mission Board</span><button class="winX" data-close>✕</button></div><div class="winBody">';
    for(const m of G.missions){
      const cls=m.state==='done'?'done':m.state==='locked'?'locked':m.state==='prog'?'prog':'';
      h+='<div class="mcard '+cls+'"><div class="mrow"><span class="mname">'+m.name+'</span><span class="mfrom">'+(m.from||'')+'</span>'+
        '<span class="mstate">'+(m.state==='done'?(m.meta||'COMPLETE'):m.state==='prog'?(m.progress.daysLeft+'d remaining'):m.state==='locked'?'LOCKED':m.state==='sim'?'SIMULATOR':'AVAILABLE')+'</span></div>'+
        '<div class="mdesc">'+m.desc+'</div>';
      if(m.state==='avail'){
        const rew=[m.rew.cross?'+FT-4 Cross':null,m.rew.c?C(m.rew.c):null,m.rew.s?S(m.rew.s):null,m.rew.i?I(m.rew.i):null,m.rew.fighter?'+1 fighter':null].filter(Boolean).join(' ');
        h+='<div class="mmeta">'+m.need+(m.ground?' soldiers':' pilots')+' · '+m.days+' days · risk '+m.riskTxt+' · '+rew+' +XP</div>'+
          (m.lead?'<button class="sbtn" data-mlead="'+m.id+'">'+(m.leadTxt||'Fly it yourself')+'</button> ':'')+
          '<button class="sbtn" data-plan="'+m.id+'">Send a Team</button>';
      }
      if(m.state==='sim')h+='<button class="sbtn" data-simulator>Enter Simulator ▸</button>';
      h+='</div>';
    }
    h+='<div class="pdesc" style="margin-top:4px">Missions come from the network. Work your sources; follow their signals.</div></div>';
  }
  else if(winMode==='plan'){
    const m=winArg;
    card.classList.add('narrow');
    const eligible=m.ground?
      G.people.filter(p=>(p.role==='Soldier'||p.role==='Marine')&&!p.injured&&p.assign!=='mission'):
      G.people.filter(p=>p.role==='Pilot'&&!p.injured&&p.assign!=='mission');
    const usable=m.ground?
      G.fighters.filter(f=>f.cls==='graf'&&!f.out&&f.hull>=60).length:
      G.fighters.filter(f=>!f.out&&f.hull>=60).length;
    const pilotsOk=!m.ground||ablePilots().length>=2;
    h='<div class="winHead"><span class="wt">'+(planLead?'Lead · ':'Plan · ')+m.name+'</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
      '<div class="pdesc">'+(m.ground?
        'Needs '+m.need+' soldiers, the Graf flight-ready (hull ≥ 60%), and two able pilots — one flies the Graf, one comes home in the Cross. Graf ready: <b style="color:var(--text)">'+(usable?'yes':'no')+'</b> · pilots: <b style="color:var(--text)">'+(pilotsOk?'yes':'no')+'</b>.':
        'Needs '+m.need+' pilots and '+m.need+' flight-ready fighters (hull ≥ 60%). Ready: <b style="color:var(--text)">'+usable+'</b>.')+
      (planLead?' You run it on the ground yourself — what happens out there is on you.':'')+'</div>';
    for(const p of eligible){
      h+='<label class="prow" style="cursor:pointer"><input type="checkbox" class="pcheck" data-pk="'+p.id+'">'+
        '<span class="pl">'+p.name.split(' ').map(w=>w[0]).join('')+'</span>'+
        '<span class="pinfo"><span class="pname">'+p.name+'</span><br><span class="psub">'+rankFor(p)+' · lvl '+p.level+'</span></span></label>';
    }
    h+='<button class="sbtn" id="launchBtn" style="width:100%;margin-top:8px;padding:10px" disabled>'+(planLead?'Go — take the field':'Launch')+'</button></div>';
  }
  else if(winMode==='person'){
    const p=winArg;
    card.classList.add('narrow');
    const pct=Math.round(p.xp*100);
    h='<div class="winHead"><span class="wt">Personnel File</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
      '<div class="dz-head">'+
      '<div class="lvlring" style="background:conic-gradient(var(--purple) '+pct+'%, #232f4e 0)"><div class="lvlin"><span class="n">'+p.level+'</span><span class="l">LVL</span></div></div>'+
      '<div><div class="dz-name">'+p.name+'</div>'+
      '<div class="dz-rank">'+rankFor(p)+'</div>'+
      '<div class="dz-sub">'+p.role+(p.injured?' · <span style="color:var(--heg)">INJURED '+p.injured+'d</span>':'')+'</div>'+
      '</div></div>'+
      '<div class="dz-bio">“'+p.bio+'”</div>';
    if(p.role==='Pilot'){
      const f=G.fighters.find(x=>x.id===p.ship);
      if(f){
        const st=SHIPSTATS[f.cls];
        let cells='<span class="hcells">';
        for(let i=0;i<10;i++)cells+='<span class="hcell'+(i*10<f.hull?' on':'')+'"></span>';
        cells+='</span>';
        h+='<div class="dz-sec">Assigned Craft</div><div class="vcard"><div class="vinfo">'+
          '<div class="vname">'+f.name+(f.out?' · <span style="color:var(--blue)">ON MISSION</span>':'')+'</div>'+
          '<div class="vstats">'+st.label+'<br>SHD '+st.shd+' · ARM '+st.arm+' · HULL '+st.hull+'<br>'+
          st.wpns.map(w=>w[0]).join(' · ')+'</div></div>'+cells+'</div>';
      }
    } else if(p.role==='Soldier'){
      h+='<div class="dz-sec">Equipment</div>';
      for(const eq of (p.equip||[])){
        const a=G.armory.find(x=>x.id===eq);
        if(a)h+='<div class="eqrow"><span class="eqi">'+a.ic+'</span><span><b>'+a.name+'</b>'+
          (a.desc?'<br><span style="font-size:9.5px;color:var(--dim)">'+a.desc+'</span>':'')+'</span></div>';
      }
      if(!(p.equip||[]).length)h+='<div class="pdesc">Empty-handed. Fix that before the ground war.</div>';
    } else {
      const st=p.assign.startsWith('station:')?p.assign.slice(8):null;
      h+='<div class="dz-sec">Station</div><div class="pdesc">'+
        (st?('On station: <b style="color:var(--good)">'+ROOMS[st].name+'</b> — '+STAFFABLE[st].post+'. '+STAFFABLE[st].perk+'.')
           :'Unassigned. A room without its operator underperforms — post them somewhere.')+'</div>';
    }
    if(!p.injured&&p.assign!=='mission'){
      h+='<div class="dz-sec">Assignment</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+
        '<button class="achip'+(p.assign==='rest'?' on':'')+'" data-as="rest:'+p.id+'">Rest</button>'+
        '<button class="achip'+(p.assign==='train'?' on':'')+'" data-as="train:'+p.id+'" '+(hasRoom('training')?'':'disabled title="Needs a Training Hall"')+'>Train</button>';
      if(p.role==='Support'){
        for(const key in STAFFABLE){
          if(!hasRoom(key))continue;
          const holder=staffOf(key)[0];
          const mine=p.assign==='station:'+key;
          const taken=holder&&holder.id!==p.id;
          h+='<button class="achip'+(mine?' on':'')+'" data-as="station:'+key+':'+p.id+'" '+
            (taken?'disabled title="'+holder.name+' holds this post"':'title="'+STAFFABLE[key].perk+'"')+'>'+
            STAFFABLE[key].post+'</button>';
        }
      }
      h+='</div>';
    }
    h+='<div class="dz-sub" style="margin-top:12px">XP '+pct+'% to next grade · manual promotion arrives with the persistent campaign</div></div>';
  }
  else if(winMode==='silence'){
    const s=winArg;
    card.classList.add('narrow');
    h='<div class="winHead"><span class="wt">Silence · '+s.name+'</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
      '<div class="commline" style="color:var(--text)">The assassin waits by the airlock, helmet under one arm.<br><br>“Say the word, Commander. '+
      s.name.split(' ')[0]+' stops being a risk tonight — and stops being anything else, too.”</div>'+
      '<button class="dbtn" data-kill="'+s.id+'">Do it. The rebellion is bigger than one frightened '+s.type.split(' ')[0].toLowerCase()+'.</button>'+
      '<button class="dbtn" data-close>Not yet. Back into the shadows.</button>'+
      '</div>';
  }
  card.innerHTML=h;
}

/* ---------- sidebar ---------- */
function syncUI(){
  $('dayLbl').textContent='Day '+G.day;
  $('resC').textContent=Math.round(G.credits);
  $('resS').textContent=Math.round(G.supplies);
  $('resI').textContent=Math.round(G.intel);
  $('revNum').textContent='1';
  $('revTip').innerHTML='<b>Revolution Level 1</b> — criminals, as far as the Hegemony cares.<br>Renown '+Math.round(G.renown)+'/100 toward Level 2.<br>Network exposure: '+Math.round(G.risk)+'.';
  $('revLamp').classList.toggle('hot',G.renown>=90);
  const srcAttn=G.sources.filter(s=>s.alive&&(s.pendingEvent||s.signal||s.risk>70)).length;
  $('srcBadge').hidden=!srcAttn;$('srcBadge').textContent=srcAttn;
  const misAvail=G.missions.filter(m=>m.state==='avail').length;
  $('misBadge').hidden=!misAvail;$('misBadge').textContent=misAvail;
  const prog=G.missions.filter(m=>m.state==='prog').length;
  const building=G.rooms.filter(r=>r.build).length;
  $('dockNote').textContent=[prog?prog+' mission'+(prog>1?'s':'')+' out':null,building?building+' building':null].filter(Boolean).join(' · ');
  const crewRow=(p,cls)=>{
    const st=p.injured?'INJURED':p.assign.startsWith('station:')?(STLBL[p.assign.slice(8)]||'POST'):p.assign.toUpperCase();
    const stc=p.injured?'var(--heg)':p.assign==='mission'?'var(--blue)':p.assign==='train'?'var(--purple)':p.assign.startsWith('station:')?'var(--good)':'var(--dim)';
    return '<div class="rrow'+(cls?' '+cls:'')+'" data-person="'+p.id+'" tabindex="0"><span class="rname">'+p.name+'</span>'+
      '<span class="rsub">L'+p.level+'</span><span class="rsub" style="color:'+stc+'">'+st+'</span></div>';
  };
  $('pilotList').innerHTML=G.people.filter(p=>p.role==='Pilot').map(p=>crewRow(p,'')).join('');
  $('soldierList').innerHTML=G.people.filter(p=>p.role==='Soldier').map(p=>crewRow(p,'rSol')).join('');
  const marines=G.people.filter(p=>p.role==='Marine');
  $('marHead').hidden=$('marineList').hidden=!marines.length;
  $('marineList').innerHTML=marines.map(p=>crewRow(p,'rMar')).join('');
  $('supportList').innerHTML=G.people.filter(p=>p.role!=='Pilot'&&p.role!=='Soldier'&&p.role!=='Marine').map(p=>crewRow(p,'rSup')).join('');
  $('fleetList').innerHTML=G.fighters.map(f=>{
    let cells='<span class="hcells">';
    for(let i=0;i<10;i++)cells+='<span class="hcell'+(i*10<f.hull?' on':'')+'"></span>';
    cells+='</span>';
    return '<div class="frow" data-fighter="'+f.id+'"><span class="fname">'+f.name+'</span>'+(f.out?'<span class="fout">OUT</span>':cells)+'</div>';
  }).join('');
  if(viewRoom)renderRoomBar();
  if(winMode)renderWin();
  if(tilePopAt)renderTilePop();
}

/* ---------- input ---------- */
function figAt(px,py){
  let best=null,bd=1e9;
  for(const f of rvFigs){
    const d=Math.hypot(px-f.x,py-f.y);
    if(d<f.r&&d<bd){bd=d;best=f;}
  }
  return best;
}
cv.addEventListener('pointermove',ev=>{
  const r=cv.getBoundingClientRect();
  const px=ev.clientX-r.left,py=ev.clientY-r.top;
  if(viewRoom){
    hoverCell=null;
    cv.style.cursor=figAt(px,py)?'pointer':'default';
    return;
  }
  cv.style.cursor='pointer';
  hoverCell=cssToCell(px,py);
});
cv.addEventListener('pointerleave',()=>{hoverCell=null;});
cv.addEventListener('click',ev=>{
  if(!started)return;
  if(viewRoom){
    const r=cv.getBoundingClientRect();
    const f=figAt(ev.clientX-r.left,ev.clientY-r.top);
    if(f){
      sClick();
      const key='fig:'+f.pid,now=performance.now();
      if(lastTap.key===key&&now-lastTap.t<380){
        lastTap={key:null,t:0};
        const p=G.people.find(x=>x.id===f.pid);
        if(p)openWin('person',p);
      } else lastTap={key,t:now};
    }
    return;
  }
  const r=cv.getBoundingClientRect();
  const cell=cssToCell(ev.clientX-r.left,ev.clientY-r.top);
  sClick();
  if(!cell){closeTilePop();return;}
  const rm=roomAt(cell.r,cell.c);
  const key=rm?('room:'+rm.key+':'+rm.r+':'+rm.c):('cell:'+cell.r+':'+cell.c);
  const now=performance.now();
  if(lastTap.key===key&&now-lastTap.t<380){
    lastTap={key:null,t:0};
    if(rm&&!rm.build){enterRoomView(rm);return;}
  } else lastTap={key,t:now};
  openTilePop(cell.r,cell.c);
});
$('tilePop').addEventListener('click',ev=>{
  const t=ev.target.closest('button');
  if(!t||t.disabled)return;
  sClick();
  if(t.hasAttribute('data-dig')&&tilePopAt&&!tilePopAt.room){
    const {r,c}=tilePopAt;
    G.supplies-=EXCAVATE.s;
    G.grid[r][c].dig=EXCAVATE.days;
    news('Excavation crew breaks ground. Dust everywhere.','d');
    renderTilePop();syncUI();return;
  }
  const bk=t.getAttribute('data-build');
  if(bk&&tilePopAt&&!tilePopAt.room){
    const {r,c}=tilePopAt;
    const b=BUILDS[bk];
    G.credits-=b.c;G.supplies-=b.s;
    G.grid[r][c]={t:'room',room:bk};
    G.rooms.push({key:bk,r,c,w:1,h:1,build:{days:b.days}});
    news('Construction starts: '+ROOMS[bk].name+' ('+b.days+'d).','a');
    sBuild();
    closeTilePop();syncUI();return;
  }
  const open=t.getAttribute('data-open');
  if(open){closeTilePop();openWin(open);return;}
});
$('roomViewBar').addEventListener('click',ev=>{
  const t=ev.target.closest('button');
  if(!t)return;
  sClick();
  if(t.hasAttribute('data-backbase')){exitRoomView();syncUI();return;}
  const open=t.getAttribute('data-open');
  if(open){openWin(open);return;}
});
$('winsB').addEventListener('click',ev=>{
  if(ev.target.id==='winsB'||ev.target.closest('[data-close]')){closeWin();return;}
  // galaxy map source pick
  if(ev.target.id==='galaxyCv'){
    const g=ev.target,r=g.getBoundingClientRect();
    const px=ev.clientX-r.left,py=ev.clientY-r.top;
    let best=null,bd=1e9;
    for(const s of G.sources){
      if(!s.alive)continue;
      const [sx2,sy2]=srcMapPos(s,r.width,r.height);
      const d=Math.hypot(px-sx2,py-sy2);
      if(d<16&&d<bd){bd=d;best={t:'s',id:s.id};}
    }
    if(!best){
      for(const pd of PLANETDEF){
        if(pd.base)continue;
        const d=Math.hypot(px-r.width*pd.x,py-r.height*pd.y);
        if(d<26&&d<bd){bd=d;best={t:'p',id:pd.id};}
      }
    }
    if(best){srcSel=best;sClick();renderWin();}
    return;
  }
  const t=ev.target.closest('button,a,input');
  if(!t)return;
  if(t.classList.contains('pcheck')){
    const m=winArg;
    const n=[...ROOT.querySelectorAll('.pcheck:checked')].length;
    const pilotsOk=!m.ground||ablePilots().length>=2;
    const usable=m.ground?
      G.fighters.filter(f=>f.cls==='graf'&&!f.out&&f.hull>=60).length:
      G.fighters.filter(f=>!f.out&&f.hull>=60).length;
    const btn=$('launchBtn');
    if(btn)btn.disabled=!(n===m.need&&usable>=(m.ground?1:m.need)&&pilotsOk);
    return;
  }
  if(t.id==='launchBtn'){
    const ids=[...ROOT.querySelectorAll('.pcheck:checked')].map(x=>x.getAttribute('data-pk'));
    if(planLead)leadMission(winArg,ids);
    else launchMission(winArg,ids);
    return;
  }
  sClick();
  const sc=t.getAttribute('data-sc');
  if(sc){const s=G.sources.find(x=>x.id===sc);if(s){sComm();srcContact(s);}return;}
  const sv=t.getAttribute('data-sv');
  if(sv){const s=G.sources.find(x=>x.id===sv);if(s){sComm();srcVisit(s);}return;}
  const ss=t.getAttribute('data-ss');
  if(ss){const s=G.sources.find(x=>x.id===ss);if(s)openWin('silence',s);return;}
  const sl=t.getAttribute('data-sl');
  if(sl){const s=G.sources.find(x=>x.id===sl);if(s)srcCutLoose(s);return;}
  const kill=t.getAttribute('data-kill');
  if(kill){const s=G.sources.find(x=>x.id===kill);if(s)srcSilence(s);return;}
  if(winMode==='comm'){
    const {src,payload}=winArg;
    const ans=t.getAttribute('data-ans');
    if(ans!==null&&payload.event){srcAnswer(src,+ans);return;}
    if(t.hasAttribute('data-follow')){
      const line=followSignal(src);
      openComm(src,{lines:[line]});
      syncUI();return;
    }
    if(t.hasAttribute('data-ignore')){
      src.signal=null;
      openComm(src,{lines:['You let it lie. Some doors are better left shut — or opened later.']});
      syncUI();return;
    }
  }
  const cand=t.getAttribute('data-cand');
  if(cand){if(cand==='no'){news('The contact is burned. They never hear back.','d');closeWin();}else acceptCandidate(cand);return;}
  const scout=t.getAttribute('data-scout');
  if(scout){scoutPlanet(scout);return;}
  const plan=t.getAttribute('data-plan');
  if(plan){const m=G.missions.find(x=>x.id===plan);if(m){planLead=false;openWin('plan',m);}return;}
  const mplan=t.getAttribute('data-mplan');
  if(mplan){const m=G.missions.find(x=>x.id===mplan);if(m){planLead=false;openWin('plan',m);}return;}
  const mlead=t.getAttribute('data-mlead');
  if(mlead){const m=G.missions.find(x=>x.id===mlead);if(m){planLead=true;openWin('plan',m);}return;}
  const as=t.getAttribute('data-as');
  if(as){
    const parts=as.split(':');
    const mode=parts[0]==='station'?'station:'+parts[1]:parts[0];
    const pid=parts[parts.length-1];
    const p=G.people.find(x=>x.id===pid);
    if(p&&!p.injured&&p.assign!=='mission'){p.assign=mode;syncUI();}
    return;
  }
});
byId('panel').addEventListener('click',ev=>{
  const pr=ev.target.closest('[data-person]');
  const fr=ev.target.closest('[data-fighter]');
  const key=pr?('p:'+pr.getAttribute('data-person')):fr?('f:'+fr.getAttribute('data-fighter')):null;
  if(!key)return;
  sClick();
  const now=performance.now();
  if(lastTap.key===key&&now-lastTap.t<380){
    lastTap={key:null,t:0};
    if(pr){
      const p=G.people.find(x=>x.id===pr.getAttribute('data-person'));
      if(p)openWin('person',p);
    } else {
      const hg=G.rooms.find(r=>r.key==='hangar');
      if(hg)enterRoomView(hg);
    }
    return;
  }
  lastTap={key,t:now};
});
$('navSources').addEventListener('click',()=>{sClick();openWin('sources');});
$('navMissions').addEventListener('click',()=>{sClick();openWin('missions');});
$('dayBtn').addEventListener('click',()=>{if(started)advanceDay();});
addEventListener('keydown',ev=>{
  if(SR.active!=='base')return;
  if(ev.key==='Escape'){
    if(winMode)closeWin();
    else if(viewRoom){exitRoomView();syncUI();}
    else closeTilePop();
  }
});
$('muteBtn').addEventListener('click',()=>{
  A.setMuted(!A.muted());
  $('muteBtn').textContent='Sound: '+(A.muted()?'Off':'On');
  $('muteBtn').setAttribute('aria-pressed',String(A.muted()));
});
$('restartBtn').addEventListener('click',()=>{
  if(!started)return;
  SR.wipeSave();
  G=newGame();closeWin();closeTilePop();exitRoomView();
  news('Command log reset. Day 1 at Haven Rock.','a');
  saveSnap();syncUI();
});
$('enterBtn').addEventListener('click',()=>{
  A.wake();
  if(!G.introDone){launchIntro();return;}
  $('debrief').hidden=true;
  started=true;
  seedNews();
  saveSnap();syncUI();
});
function introSpec(){
  const soldiers=G.people.filter(p=>p.role==='Soldier').slice(0,3);
  const pilots=G.people.filter(p=>p.role==='Pilot');
  const spare=pilots.find(p=>p.id==='sera')||pilots[0];
  const grafP=pilots.find(p=>p.id!==spare.id)||pilots[0];
  return {kind:'ground',missionId:'haven',scenario:'haven',days:0,
    squad:soldiers.map(p=>({id:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,
      aim:soldierAim(p),hp:100,wpns:['akli','cowboy']})),
    pilot:{id:spare.id,name:spare.name,first:spare.name.split(' ')[0]},
    grafPilot:{id:grafP.id,name:grafP.name,first:grafP.name.split(' ')[0]}};
}
function launchIntro(){
  $('debrief').hidden=true;
  closeWin();closeTilePop();
  SR.mission=introSpec();
  SR.go('ground',{mission:SR.mission});
}
function seedNews(){
  news('Haven Rock is powered, pressurized, and off every chart. Day one of the rest of the war.','g');
  news('Inventory logged: one converted Graf hauler, six Aklis, four Cowboys, and a rock with our name on it. No starfighter. Yet.','d');
  news('Two contacts on the wire: Halt at the Veray yards, the Senator through Relay Kess. Scraps, for now.','d');
  news('The board is empty. Work the sources — missions, supplies and recruits all come through the network.','a');
}

/* ---------- leading missions in person ---------- */
let planLead=false;
function ablePilots(){return G.people.filter(p=>p.role==='Pilot'&&!p.injured&&p.assign!=='mission');}
function soldierAim(p){return Math.max(1,Math.min(5,2+Math.floor(p.level/3)));}
function pilotAim(p){return Math.max(1,Math.min(5,1+Math.ceil(p.level/2)));}
function leadMission(m,ids){
  sClick();
  if(m.ground){
    const squad=G.people.filter(p=>ids.includes(p.id));
    const pilots=ablePilots();
    const graf=G.fighters.find(f=>f.cls==='graf'&&!f.out&&f.hull>=60);
    if(squad.length<m.need||pilots.length<2||!graf)return;
    const grafPilot=pilots.find(p=>p.ship==='graf')||pilots[1];
    const spare=pilots.find(p=>p.id!==grafPilot.id);
    const scatter=G.armory.find(a=>a.id==='scatter'&&a.n>0);
    SR.mission={kind:'ground',missionId:m.id,days:m.days,
      squad:squad.map((p,i)=>({id:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,
        aim:soldierAim(p),hp:100,wpns:(scatter&&i===0)?['scatter','akli','cowboy']:['akli','cowboy']})),
      pilot:{id:spare.id,name:spare.name,first:spare.name.split(' ')[0]},
      grafPilot:{id:grafPilot.id,name:grafPilot.name,first:grafPilot.name.split(' ')[0]}};
  } else {
    const pilots=G.people.filter(p=>ids.includes(p.id));
    const ready=G.fighters.filter(f=>!f.out&&f.hull>=60);
    if(pilots.length<m.need||ready.length<pilots.length)return;
    const used=new Set();
    const flight=pilots.map(p=>{
      const f=ready.find(x=>x.id===p.ship&&!used.has(x.id))||ready.find(x=>!used.has(x.id));
      used.add(f.id);
      return {pilotId:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,
        aim:pilotAim(p),cool:Math.min(85,55+p.level*4),traits:p.id==='sera'?['Lucky']:[],
        cls:f.cls,fighterId:f.id,fighterName:f.name,hull:f.hull};
    });
    SR.mission={kind:'space',missionId:m.id,days:m.days,flight};
  }
  closeWin();closeTilePop();
  saveSnap();
  SR.go(m.ground?'ground':'space',{mission:SR.mission});
}
function addArmoryItem(name){
  const map={'Scattergun':['scatter','Scattergun'],'Sheriff\u2019s Scattergun':['scatter','Scattergun'],
    'Peacekeeper Carbine':['carbine','Peacekeeper Carbine'],'Shell box':['shells','Shell box']};
  const hit=map[name]||[name.toLowerCase().replace(/[^a-z0-9]+/g,''),name];
  const a=G.armory.find(x=>x.id===hit[0]);
  if(a)a.n=(a.n||0)+1;
  else G.armory.push({id:hit[0],name:hit[1],n:1,desc:'Taken off Dustfall\u2019s lawmen. Ours now.'});
}
function applyDebrief(r){
  if(!r)return;
  SR.mission=null;
  if(r.missionId==='haven'){
    if(r.win){
      G.introDone=true;started=true;
      $('debrief').hidden=true;
      for(const pr of r.people||[]){
        const p=G.people.find(x=>x.id===pr.id);
        if(!p)continue;
        if(pr.xp){p.xp+=pr.xp;levelUp(p);}
        if(pr.state==='injured'){
          p.injured=pr.dur||2;
          news('<b>'+p.name+'</b> took the rock the hard way \u2014 out '+p.injured+' day'+(p.injured>1?'s':'')+'.','h');
        }
      }
      if(r.loot){
        if(r.loot.c)G.credits+=r.loot.c;
        if(r.loot.s)G.supplies+=r.loot.s;
        for(const it of r.loot.items||[])addArmoryItem(it);
      }
      news('<b>Haven Rock is ours.</b> The squatters are gone; the signal is up. Day one of the rest of the war.','g');
      seedNews();
      sBuild();
      saveSnap();syncUI();
      return;
    }
    // thrown back: no lasting harm, the Marta pulls everyone out. Go again.
    news('The squatters held the rock. Everyone made it back to the Marta \u2014 patch up and go again.','h');
    started=false;
    const ov=$('debrief');ov.hidden=false;
    const h2=ov.querySelector('h2');if(h2)h2.innerHTML='Take the <span class="k">Rock</span> \u2014 Again';
    const eb=ov.querySelector('#enterBtn');if(eb)eb.textContent='Go Again';
    saveSnap();syncUI();
    return;
  }
  if(r.sim){
    news('Sim deck run logged \u2014 '+(r.win?'clean sweep of the drone flight.':'the drones took the round.'),'d');
    saveSnap();syncUI();return;
  }
  const m=G.missions.find(x=>x.id===r.missionId);
  // the mission days pass while they are in the field
  for(const pr of r.people||[]){const p=G.people.find(x=>x.id===pr.id);if(p)p.assign='mission';}
  for(let d=0;d<(r.days===undefined?1:r.days);d++)advanceDay();
  for(const pr of r.people||[]){
    const p=G.people.find(x=>x.id===pr.id);
    if(!p)continue;
    p.assign='rest';
    if(pr.xp){p.xp+=pr.xp;levelUp(p);}
    let state=pr.state;
    if(state==='shotdown')state=(rng()<0.15)?'lost':'injured';
    if(state==='lost'){
      G.people=G.people.filter(x=>x.id!==p.id);
      G.morale=Math.max(0,G.morale-10);
      news('<b>'+p.name+'</b> did not come home. Their name goes on the wall.','h');
    } else if(state==='injured'){
      p.injured=(hasRoom('infirmary')&&medStaff().length)?(pr.dur||3):(pr.dur||3)+2;
      news('<b>'+p.name+'</b> came back on a stretcher \u2014 out '+p.injured+' day'+(p.injured>1?'s':'')+'.','h');
    }
  }
  const got=[];
  if(r.loot){
    if(r.loot.c){G.credits+=r.loot.c;got.push(C(r.loot.c));}
    if(r.loot.s){G.supplies+=r.loot.s;got.push(S(r.loot.s));}
    for(const it of r.loot.items||[]){addArmoryItem(it);got.push(it);}
  }
  if(r.win&&r.cross){
    if(G.fighters.length<fighterCap()){
      G.fighters.push({id:'dustfall',name:'Dustfall',cls:'cross',hull:85,out:false});
      const orphan=G.people.find(p=>p.role==='Pilot'&&!G.fighters.some(f=>f.id===p.ship));
      if(orphan)orphan.ship='dustfall';
      got.push('the FT-4 Cross \u201cDustfall\u201d');
    } else {G.credits+=200;got.push('no berth \u2014 the Cross fenced for '+C(200));}
  }
  for(const fr of r.fighters||[]){
    const f=G.fighters.find(x=>x.id===fr.fighterId);
    if(!f)continue;
    if(fr.destroyed){
      G.fighters=G.fighters.filter(x=>x.id!==f.id);
      news('<b>'+f.name+'</b> was lost over the drift.','h');
    } else f.hull=Math.max(5,Math.min(100,Math.round(fr.hull)));
  }
  if(r.win&&m&&r.kind==='space'){
    if(m.rew.c){G.credits+=m.rew.c;got.push(C(m.rew.c));}
    if(m.rew.s){G.supplies+=m.rew.s;got.push(S(m.rew.s));}
    if(m.rew.i){G.intel+=m.rew.i;got.push(I(m.rew.i));}
  }
  if(m){
    if(r.win){
      m.state='done';m.meta='SUCCESS';
      G.renown=Math.min(100,G.renown+20);
      G.morale=Math.min(100,G.morale+6);
      news('<b>'+m.name+'</b> \u2014 SUCCESS, and you were there. '+(got.length?got.join(' \u00b7 ')+'.':''),'g');
      sBuild();
    } else {
      m.state='avail';m.progress=null;
      G.morale=Math.max(0,G.morale-8);
      news('<b>'+m.name+'</b> \u2014 the field op failed. The board keeps the job open.','h');
      sAlert();
    }
  }
  saveSnap();syncUI();
}
ROOT.addEventListener('click',ev=>{
  const sim=ev.target.closest('[data-simulator]');
  if(sim){
    sClick();closeWin();closeTilePop();
    SR.mission={kind:'space',sim:true,missionId:'sim',days:0,flight:null};
    SR.go('space',{mission:SR.mission});
  }
});

/* ---------- save / scene lifecycle ---------- */
function saveSnap(){
  try{SR.persist({campaign:JSON.parse(JSON.stringify(G)),started});}catch(e){}
}
let booted=false;
function restoreCampaign(data){
  if(data&&data.campaign&&data.started){
    G=data.campaign;started=true;
    if(G.introDone===undefined)G.introDone=true;
    $('debrief').hidden=true;
    G.misPopQ=G.misPopQ||[];
    G.candQ=G.candQ||[];
    if(!G.planets)G.planets=PLANETDEF.map(p=>({id:p.id,known:!!p.known,access:!!p.access,scouted:!!p.access&&!p.base}));
    for(const p of G.people)if(p.assign==='medbay')p.assign='station:infirmary';
    for(const f of G.fighters)if(f.cls==='viper')f.cls='cross';
    // refresh static mission fields (play links, ground flags) from the pool
    for(const m of G.missions)if(MPOOL[m.id])for(const k in MPOOL[m.id])if(!(k in {state:1,progress:1,meta:1}))m[k]=MPOOL[m.id][k];
    const bk=G.planets&&G.planets.find(p=>p.id==='brakka');
    if(bk&&bk.scouted&&!G.missions.some(m=>m.id==='stealcross'))addMission('stealcross');
    // event/signal functions can't survive serialization — rebind from pools
    for(const s of G.sources){
      if(s.pendingEvent){
        const pool=SRC_EVENTS[s.id];
        s.pendingEvent=pool?pool[s.eventsSeen%pool.length]:null;
      }
      if(s.signal&&s.signal.kind&&!s.signal.apply){
        const pool=SIGNALS[s.id]||[];
        const match=pool.find(x=>x.kind===s.signal.kind&&(x.mid||'')===(s.signal.mid||''));
        if(match)s.signal=Object.assign({},match,{text:s.signal.text||match.text});
      }
    }
    renderNews();
    return true;
  }
  return false;
}
function enter(params){
  fitCanvas();
  $('muteBtn').textContent='Sound: '+(A.muted()?'Off':'On');
  if(!booted){
    booted=true;
    if(!restoreCampaign(SR.loadSave())){
      G=newGame();
      if(location.hash==='#deploy'||location.hash==='#test'){
        $('debrief').hidden=true;started=true;G.introDone=true;seedNews();
      }
    }
  }
  if(params&&params.debrief)applyDebrief(params.debrief);
  saveSnap();
  syncUI();renderNews();
}
function exit(){
  closeWin();closeTilePop();
  saveSnap();
}
SR.register('base',{enter,exit,frame:render});


if(location.hash==='#test'){
  window.DBGbase={get G(){return G;},set G(v){G=v;},get started(){return started;},
    fn:{addMission,leadMission,applyDebrief,advanceDay,scoutPlanet,syncUI,saveSnap,
      ablePilots,openWin,closeWin}};
}
})();
