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
const M=n=>'<span class="rm" title="Materials">'+n+'⚙</span>';
const F=n=>'<span class="rf" title="Fuel">'+n+'◐</span>';
/* a reward/cost bundle → chips */
function bundleHTML(b){
  return [b.c?C(b.c):'',b.s?S(b.s):'',b.m?M(b.m):'',b.f?F(b.f):'',b.i?I(b.i):''].filter(Boolean).join(' ');
}

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
  store:{c:50,m:20,days:1},
  comms:{c:120,m:30,days:2},
  workshop:{c:100,m:40,days:2},
  infirmary:{c:90,m:20,s:15,days:2},
  training:{c:80,m:25,s:10,days:1},
  bay:{c:60,m:50,days:1},
  quarters:{c:70,m:30,s:15,days:1},
};
const EXCAVATE={m:10,days:1};
/* fuel burned per ship on a sortie */
const FUEL_COST={graf:4,cross:6,talon:6};
const fuelOf=f=>FUEL_COST[f.cls]||5;
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
    day:1,credits:250,supplies:120,materials:100,fuel:60,intel:3,renown:8,risk:10,morale:65,introDone:false,
    rows,cols,grid,rooms,
    fighters:[],
    wreck:{restored:false,restoring:0},
    armory:[
      {id:'akli',name:'Akli AR',n:6,ic:'≠',desc:'Ballistic assault rifle. Common, cheap, effective — and it wears down fast.'},
      {id:'cowboy',name:'Cowboy',n:4,ic:'⌐',desc:'Ballistic revolver sidearm. Nothing special. Never jams when it matters.'},
    ],
    people:[
      {id:'joss',name:'Joss Marrek',role:'Pilot',level:3,xp:0.5,assign:'rest',injured:0,ship:'',bio:'Best stick in the sector, flying a converted hauler. Ask him about it. He’ll tell you anyway.'},
      {id:'dax',name:'Dax Ferro',role:'Soldier',level:1,xp:0.2,assign:'rest',injured:0,equip:['akli','cowboy'],bio:'Ex-dock enforcer. Good in a corridor.'},
      {id:'runa',name:'Runa Vel',role:'Soldier',level:1,xp:0.45,assign:'rest',injured:0,equip:['akli','cowboy'],bio:'Demolitions. Do not startle her.'},
      {id:'kel',name:'Kel Brasso',role:'Soldier',level:1,xp:0.1,assign:'rest',injured:0,equip:['akli','cowboy'],bio:'Poacher turned partisan. Knows every ridge on three moons.'},
    ],
    sources:[],
    onboard:'intro',
    missions:[
      {id:'strider',name:'Steal the Strider',state:'locked',from:'—',
       desc:'A robotic mech, ours if we can walk it out of a warehouse. Needs a ground team with real gear. Not yet.'},
    ],
    planets:PLANETDEF.map(mkPlanet),
    recruitN:0,misPopQ:[],candQ:[],
    news:[],
  };
}

/* ---------- helpers ---------- */
const $=id=>byId(id);
function hasRoom(key){return G.rooms.some(r=>r.key===key&&!r.build);}
function roomsOf(key){return G.rooms.filter(r=>r.key===key&&!r.build);}
function sourceCap(){return 2+roomsOf('comms').length;}
function fighterCap(){return 4+roomsOf('bay').length;}   // four landing pads from the start, one per hangar tile
function bunkCap(){return 5+3*roomsOf('quarters').length;}
/* Support crew man stations; a room without its operator underperforms */
const STAFFABLE={
  command:{post:'Flight Coordinator',perk:'+5% mission success'},
  store:{post:'Quartermaster',perk:'repairs cost 1⚙ instead of 2⚙'},
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
  depotrun:{name:'Cook the Depots',from:'Maro Venn',need:1,days:2,riskTxt:'Low',lead:'space',leadTxt:'Fly it yourself',fighterReq:'starfighter',
    desc:'Four Hegemony fuel depots hang in orbit over Brakka, feeding every patrol that squeezes the frontier. A handful of sentry drones watch them. One fast ship, in and out before anything with a pilot shows up.',
    rew:{i:5,xp:0.2}},
  stealcross:{name:'Steal the Cross',from:'Cass Wender',need:3,days:2,riskTxt:'Moderate',
    lead:'ground',leadTxt:'Fight it on the ground',ground:true,
    desc:'Dustfall keeps one FT-4 Cross on the pad behind the sheriff’s HQ. The FT-4 is built for frontier sheriffs who need something cheap and reliable to deter smugglers and gangs in their turf. When you strap more guns and missiles to it however, it becomes rather useful in a pinch. Sheriff Reeve enforces Hegemony law here. Walk a pilot to the pad and fly it home.',
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
  {id:'veray',sec:2,sup:2,name:'Veray Yards',kind:'Industrial World',pop:'40M',x:0.25,y:0.66,known:true,access:true,
   sit:'Shipyards, fuel farms, and Ferren Halt’s bruised ego. Our hunting ground.'},
  {id:'kess',sec:1,sup:2,name:'Relay Kess',kind:'Waystation',pop:'9,000',x:0.13,y:0.58,known:true,access:true,
   sit:'A refueling nowhere between nowheres. The Senator’s couriers like it that way.'},
  {id:'brakka',sec:1,sup:3,name:'Brakka',kind:'Backwater',pop:'120K',x:0.23,y:0.85,known:true,access:true,gate:'postDepot',
   sit:'Dust, herders and a scatter of frontier towns the Hegemony never bothered to garrison properly. The law is whoever wears the badge. Small stakes, soft targets, and a good place for a rebellion to learn its trade.',
   regions:[
    {id:'dustfall',name:'Dustfall',kind:'Settlement',blurb:'A frontier town: one cantina, one landing pad and one sheriff.',
     op:{name:'Rattle the Dustfall Deputies',desc:'A few well-aimed bottles through the right windows, and the deputies spend a week watching their backs instead of the street.',c:50,s:15}},
    {id:'flats',name:'Redrock Flats',kind:'Region',blurb:'Herder country, lonely wells and the depot they’re taxed at.',
     op:{name:'Empty the Tithe Depot',desc:'The tithe depot holds the herders’ forced levy: grain, water credits and ammunition, guarded by people who would rather be somewhere else.',c:60,s:40}},
    {id:'orbit',name:'Brakka Orbit',kind:'Region',blurb:'Fuel depots and nav beacons in low orbit, feeding every patrol.',
     op:{name:'Jam the Orbital Beacons',desc:'Four nav beacons keep the patrols on schedule. Without them, the schedule becomes a suggestion.',c:70,s:20}},
   ]},
  {id:'callis',sec:2,sup:3,name:'Callis',kind:'Academic World',pop:'300M',x:0.55,y:0.30,known:true,scout:7,
   sit:'Universities, observatories, and a professor with a labor-camp grudge waiting for a signal.'},
  {id:'meridian',sec:5,sup:1,name:'Meridian',kind:'CORE · Capital',pop:'2.1B',x:0.86,y:0.30,known:true,scout:14,core:true,
   sit:'Parliament, the fleets, the Empress’ shadow. Every camera works. Every clerk has a price.'},
  {id:'volund',sec:5,sup:1,name:'Volund Forge',kind:'CORE · Foundry World',pop:'800M',x:0.76,y:0.62,known:true,scout:12,core:true,
   sit:'The Hegemony’s arsenal. Foundries the size of seas, and freight manifests worth more than gold.'},
  {id:'halcyon',sec:4,sup:1,name:'Halcyon',kind:'CORE · Resort World',pop:'60M',x:0.90,y:0.55,known:true,scout:10,core:true,
   sit:'Where Hegemony brass unbuckle their sidearms. The revolution isn’t ready for Halcyon. Yet.'},
  {id:'dreymar',sec:2,sup:4,name:'Dreymar',kind:'Mining World',pop:'2M',x:0.48,y:0.62,scout:4,
   sit:'Ore barges, company scrip, and miners who already hate the right people.'},
  {id:'sable',sec:0,sup:0,name:'Sable',kind:'Wild World',pop:'—',x:0.33,y:0.24,scout:3,
   sit:'Nothing but weather — and an abandoned Hegemony listening post, still warm.'},
  {id:'nyx',sec:1,sup:3,name:'Nyx Shadowport',kind:'Pirate Haven',pop:'50K',x:0.63,y:0.82,scout:5,
   sit:'Smugglers, deserters, and people who shoot well and ask late.'},
  {id:'tarsis',sec:2,sup:3,name:'Tarsis',kind:'Farm World',pop:'5M',x:0.68,y:0.14,scout:5,
   sit:'Grain oceans and quotas nobody meets. They hide food from the levy. They’d hide us.'},
  {id:'oubli',sec:0,sup:0,name:'Oubliette',kind:'Dead Colony',pop:'0',x:0.14,y:0.16,scout:4,
   sit:'A colony that stopped answering forty years ago. Empty streets. One transmitter, still powered.'},
  /* liberation-ready outworlds: their regions can be won, one local op at a time */
  {id:'menk',name:'Menk',kind:'Quarry World',pop:'1.4M',x:0.38,y:0.74,scout:4,sec:2,sup:2,lib:true,src:'tess',
   sit:'Salt flats the colour of bone, and company towns built to feed the crushers. The Hegemony wants the flux salt for its foundries and has never asked what it costs.',
   brief:'Remote salt-quarry world. Thin air, endless white flats, and a population bound to the crushers by debts their grandparents signed. The Hegemony is grinding Menk down to smelt its warships. Nobody here has ever been asked what they think.',
   regions:[
    {id:'saltreach',name:'Saltreach Quarries',kind:'Region',blurb:'Open pits and the crawlers that bleed them.',
     op:{name:'Jam the Saltreach Crushers',desc:'Sand in the gearboxes, a bad-tempered foreman and a shift that goes home early. Every hour the crushers sit idle is an hour the foundries wait.',c:70,s:20}},
    {id:'kilnridge',name:'Kiln Ridge',kind:'Region',blurb:'Smelting kilns and the ore convoys that feed them.',
     op:{name:'Hit the Kiln Ridge Convoy',desc:'Ore convoys crawl the ridge road with a two-man escort and a radio they never answer. They will tonight.',c:90,s:30}},
    {id:'menkcross',name:'Menk Crossing',kind:'Settlement',blurb:'Transit town: one precinct house, one company store.',
     op:{name:'Lose the Company Ledgers',desc:'The company store keeps every miner’s debt in a paper ledger. Somebody should misplace them.',c:40,s:40}},
   ]},
  {id:'ballakan',name:'Ballakan',kind:'River World',pop:'6M',x:0.60,y:0.50,scout:4,sec:1,sup:3,lib:true,src:'pell',
   sit:'Jungle the size of continents, one brown river, and the timber barges that carry it to Hegemony shipyards. The law stops at the tollgates.',
   brief:'Humid river world under unbroken canopy. Timber concessions, barge clans, and a Hegemony that only really governs the tollgates. The forest swallows patrols. The people have never needed a reason to dislike the tolls.',
   regions:[
    {id:'canopy',name:'Drowned Canopy',kind:'Region',blurb:'Logging concessions under the flooded canopy.',
     op:{name:'Cut the Canopy Lines',desc:'Winch lines, feller crawlers and a concession manager who counts trees like credits. Quietly, the lines fail.',c:60,s:35}},
    {id:'tollgate',name:'Tollgate Landing',kind:'Settlement',blurb:'The river port where every barge pays.',
     op:{name:'Sink the Tollgate Barge',desc:'The toll barge holds a week of fees. It is scheduled to have an accident.',c:100,s:15}},
    {id:'sawmill',name:'Sawmill Reach',kind:'Region',blurb:'Mills, dormitories and a payroll run by hand.',
     op:{name:'Raid the Sawmill Payroll',desc:'The mill pays in cash on the last river day, and the guard changes at noon.',c:110,s:10}},
   ]},
  {id:'parity',name:'Parity IV',kind:'Administrative World',pop:'12M',x:0.42,y:0.42,scout:6,sec:3,sup:2,lib:true,src:'cask',
   sit:'Census towers, archive vaults and cooling fields the size of cities. Everyone on Parity IV is counted, and most of them are counted twice.',
   brief:'Bureaucratic colony world. Registries, data farms and labour blocks, every citizen catalogued against a quota. The Hegemony’s paperwork is thick here, and so are its patrols.',
   regions:[
    {id:'ledger',name:'Ledger Town',kind:'Settlement',blurb:'The registry seat, run by clerks and watched by the Bureau.',
     op:{name:'Corrupt the Census',desc:'A clerk on the inside, a dozen forged stamps and a quota sheet that suddenly adds up to nothing.',c:70,s:20}},
    {id:'dataflats',name:'Data Flats',kind:'Region',blurb:'Server farms and cooling fields on the salt plain.',
     op:{name:'Pull the Data Flats Coolant',desc:'Cut the coolant lines and the servers throttle themselves. The repair crews arrive slowly.',c:50,s:30}},
    {id:'quota',name:'Quota Blocks',kind:'Region',blurb:'Labour housing, scheduled for ‘reassignment’.',
     op:{name:'Free the Quota Block',desc:'A night transfer, a locked dormitory and a hundred names someone wants off the list.',c:30,s:50}},
   ]},
];
const SRCPOS={cass:'haven',venn:'brakka',halt:'veray',vokk:'kess',marr:'callis',renn:'meridian',tess:'menk',pell:'ballakan',cask:'parity'};

/* ---------- location model (Security / Access / Support / Liberation) ----------
   Access (0–5 eyes): Intel buys it. Support (0–5 flags): raised by source events.
   Liberation (0–100% per region): local ops add it, capped by the LOWER of the
   Access cap and the Support cap. Tuning values live in ACC_CAP. */
const ACC_CAP=[0,20,40,60,80,100];
const SUP_COL=['#2b4a9a','#3f6a9a','#8a6a48','#a24a3a','#b02a2a'];   // low support = dark blue … high = dark red
const MLOC={toi:'veray',intercept:'veray',tanker:'veray',fighters:'veray',skim:'kess',chart:'callis',
  garrison:'brakka',depotrun:'brakka',stealcross:'brakka',orehaul:'dreymar',foundry:'volund'};
for(const k in MLOC)if(MPOOL[k])MPOOL[k].loc=MLOC[k];
MPOOL.stealcross.region='dustfall';MPOOL.stealcross.lib=20;
MPOOL.depotrun.region='orbit';MPOOL.depotrun.lib=20;
/* a mission TYPE fixes its shape (what it needs, how it plays); each mission adds its own story.
   `req` can override the type's default: team size, transports, prize pilots, ship class. */
const MTYPES={
  ground:{label:'Ground operation',req:m=>({team:m.need,teamRole:'Soldier',transport:1,prize:0})},
  space:{label:'Space sortie',req:m=>({team:m.need,teamRole:'Pilot',ships:m.need,starfighter:m.fighterReq==='starfighter'})},
  abstract:{label:'Off-screen job',req:m=>({team:m.need,teamRole:'Pilot',ships:m.need,starfighter:false})},
};
const MEXTRA={
  stealcross:{src:'cass',req:{team:3,teamRole:'Soldier',transport:1,prize:1},
    objectives:['Reach the FT-4 Cross on the pad behind the sheriff’s HQ','Hotwire her, release the clamps and pull the fuel line','Get the Cross and the squad out of Dustfall']},
  depotrun:{src:'venn',objectives:['Destroy all four orbital fuel depots','Survive the sentry drones']},
  toi:{src:'halt',objectives:['Eliminate Commandant Dral Vex','(Optional) Bring every pilot home']},
  intercept:{src:'halt',objectives:['Destroy or scatter the escort','Board the transport and strip her cargo']},
  tanker:{src:'halt',objectives:['Disable the tanker’s escort','Take the tanker whole']},
  skim:{src:'vokk',objectives:['Escort the transfer for two days']},
  fighters:{src:'halt',objectives:['Reach pad nine unseen','Fly a Talon out']},
  chart:{src:'marr',objectives:['Fly the survey corridor','Map the cordon']},
  garrison:{objectives:['Breach the garrison','Empty the armory racks']},
  orehaul:{objectives:['Intercept the ore barge','Take the payroll and the ore']},
  foundry:{objectives:['Copy the Forge freight manifests']},
};
MEXTRA.stealcross.after=['<b>WENDER:</b> “You actually did it. A Cross, flying, and a sheriff who will never live it down. The cantinas are already talking. Keep your head down and your ears open. Somebody in Dustfall is going to want to thank you.”'];
MEXTRA.depotrun.after=['<b>VENN:</b> “Half of Brakka watched those depots burn from my roof. Nobody stopped cheering until the patrols came through. Come by the Comet. The first round is on the house, the second is on whoever the Hegemony sends next.”'];
MEXTRA.toi.after=['<b>HALT:</b> “The academy is in uproar. Vex is dead and nobody at the yards will say his name. Let me see what they do next.”'];
MEXTRA.intercept.after=['<b>HALT:</b> “Supply transport missing, manifest clerk drinking at noon. You are a natural disaster, Commander.”'];
MEXTRA.tanker.after=['<b>HALT:</b> “They are blaming the weather. The weather has an alibi. More soon.”'];
MEXTRA.skim.after=['<b>VOKK:</b> “The transfer cleared. I will pretend I do not know why. Please do not contact me this week.”'];
MEXTRA.fighters.after=['<b>HALT:</b> “Pad nine is a crime scene and I am a witness. Keep the Talon. I never saw it.”'];
MEXTRA.chart.after=['<b>MARR:</b> “Your charts are better than ours. I will lose my own copy. Thank you.”'];
for(const k in MEXTRA)Object.assign(MPOOL[k],MEXTRA[k]);
const typeOf=m=>m.type||(m.ground?'ground':m.lead==='space'?'space':'abstract');
const SEATS={graf:4};     // troop seats per transport
MPOOL.tanker.rew.f=60;MPOOL.intercept.rew.m=25;MPOOL.orehaul.rew.m=45;MPOOL.foundry.rew.m=30;MPOOL.garrison.rew.m=20;
for(const d of PLANETDEF)if(d.regions)for(const r of d.regions)if(r.op){
  MPOOL['op_'+d.id+'_'+r.id]={name:r.op.name,from:'Local network · '+d.name,need:2,days:2,
    riskTxt:d.sec>=3?'Moderate':'Low',desc:r.op.desc,rew:{c:r.op.c,s:r.op.s||0,xp:0.12},loc:d.id,region:r.id,lib:20,
    objectives:['Reach the target in '+r.name,'Strike, then get clear'],type:'abstract'};
}
const OPX={op_menk_saltreach:{m:30},op_menk_kilnridge:{m:35},op_ballakan_canopy:{m:45},op_ballakan_sawmill:{m:30},op_brakka_flats:{m:25},op_brakka_orbit:{f:25}};
for(const k in OPX)if(MPOOL[k])Object.assign(MPOOL[k].rew,OPX[k]);

function mkPlanet(d){
  const acc=d.access&&!d.base?1:0;
  return {id:d.id,known:!!d.known,access:!!d.access,scouted:!!d.access&&!d.base,acc,sup:d.sup||0,lib:{},ops:0};
}
function locCap(st){return Math.min(ACC_CAP[st.acc||0],ACC_CAP[Math.min(5,Math.floor(st.sup||0))]);}
function locLib(d,st){
  if(!d.regions)return null;
  return Math.round(d.regions.reduce((a,r)=>a+((st.lib&&st.lib[r.id])||0),0)/d.regions.length);
}
function accessCost(d,st){return d.sec+(st.acc||0)+1;}
/* the scripted first contacts of the campaign */
const STORY_SRC={
  cass:{id:'cass',name:'Cass Wender',type:'Smuggler · Freight',loc:'the Drift',level:1,cult:20,risk:20,inc:{s:4},
    bio:'Flew you in and didn’t ask questions. Knows every pad, every price, and every sheriff’s bad habit between here and the core.'},
  venn:{id:'venn',name:'Maro Venn',type:'Cantina Keeper · The Dry Comet',loc:'Dustfall, Brakka',level:1,cult:30,risk:15,inc:{c:12},
    bio:'Poured drinks under Reeve’s boot for ten years. Watched the Cross lift off the pad and laughed until he cried.'},
};
function addStorySource(id){
  if(G.sources.some(s=>s.id===id))return G.sources.find(s=>s.id===id);
  const src=Object.assign({alive:true,visited:false,contacted:false,pendingEvent:null,eventsSeen:0,signal:null,sigIdx:0},
    JSON.parse(JSON.stringify(STORY_SRC[id])));
  G.sources.push(src);
  return src;
}
const CANDS={
  halt:{id:'halt',name:'Ferren Halt',type:'Officer · Depot Manager',loc:'Veray Yards',level:1,cult:35,risk:55,inc:{s:6},
    bio:'Passed over for promotion twice. Wants the yards to burn, quietly — as long as nobody sees him hold the match.',
    pitch:'<b>Ferren Halt</b> manages the Veray fuel yards and heard what happened to the Brakka depots. He was passed over for promotion twice, and he wants in — quietly, expensively, usefully.'},
  vokk:{id:'vokk',name:'Sen. Adria Vokk',type:'Politician',loc:'via Relay Kess',level:1,cult:20,risk:15,inc:{c:25},
    bio:'Votes loyal, funds otherwise. Terrified of audits.',
    pitch:'<b>Senator Adria Vokk</b> votes loyal and funds otherwise. Her courier found ours at Relay Kess with a first payment and one condition: no one ever says her name aloud.'},
  marr:{id:'marr',name:'Prof. Etta Marr',type:'Scientist',loc:'Callis Institute',level:1,cult:10,risk:20,inc:{i:1},
    bio:'Astrophysicist with cordoned-sector clearance and a brother in a labor camp.',
    pitch:'<b>Prof. Etta Marr</b>, astrophysicist, Callis Institute. Cordoned-sector clearance, a brother in a labor camp, and a dead drop that found us the day we got eyes on Callis. She’s offering hers.'},
  renn:{id:'renn',name:'Customs Chief Renn',type:'Officer · Customs',loc:'Meridian Docks',level:1,cult:15,risk:30,inc:{c:30},
    bio:'Skims the skimmers at the Capital’s docks. Now skims for us.',
    pitch:'<b>Customs Chief Renn</b> runs Meridian’s freight inspections and a private retirement fund. Our scouts caught the fund. He’d rather pay us than the auditors.'},
};
STORY_SRC.cass.inc.f=2;CANDS.halt.inc.f=3;
CANDS.tess={id:'tess',name:'Tessaly Brandt',type:'Union Steward · Saltreach',loc:'Saltreach, Menk',level:1,cult:15,risk:25,inc:{s:5},
  bio:'Runs the quarry workers’ mutual-aid fund out of a crawler cab. Has buried more friends than she can name.',
  pitch:'<b>Tessaly Brandt</b> stewards an illegal mutual-aid fund in the Saltreach pits. Her crews have heard rumours of a rebellion and want to know if it’s real. She would like to be the first to find out.'};
CANDS.pell={id:'pell',name:'Orrin Pell',type:'Harbourmaster · Tollgate Landing',loc:'Tollgate Landing, Ballakan',level:1,cult:20,risk:15,inc:{c:15},
  bio:'Collects tolls for the Hegemony and forgets half of them. Knows every barge clan by name.',
  pitch:'<b>Orrin Pell</b> runs the tollgate at Tollgate Landing and quietly loses about a third of what he collects. A rebellion that remembers him kindly would be worth more than the tolls.'};
CANDS.cask={id:'cask',name:'Registrar Ione Cask',type:'Registry Clerk · Ledger Town',loc:'Ledger Town, Parity IV',level:1,cult:10,risk:35,inc:{i:1},
  bio:'Files the files. Has read every one. Hasn’t slept properly since she found the quota schedules.',
  pitch:'<b>Ione Cask</b> is a registry clerk with access to every name on Parity IV and a conscience she has just discovered. She has copied something. She would like to talk about what happens next.'};
CANDS.tess.inc.m=3;CANDS.pell.inc.m=3;
SRC_EVENTS.tess=[
  {text:'<b>BRANDT:</b> “The company posted a new quota. Ten percent up, same crews, same crushers. People keep asking if you’re real. I told them you were. Don’t make a liar of me.”',
   opts:[['“Tell them the crushers will be quiet by the end of the week. Tell them who is coming, not when.”','strong'],['“Keep them steady. We’re working on it.”','neutral'],['“Real enough. Get them to stop asking.”','weak']]},
  {text:'<b>BRANDT:</b> “A foreman beat a boy half to death at Saltreach for dropping a sample tray. Half the pit walked off. If you ever wanted them angry, it’s now.”',
   opts:[['“Stand with them, Tessaly. Get the boy to a clinic and keep the walkout through shift-change. We’ll make it cost them.”','strong'],['“Keep it peaceful for now.”','neutral'],['“Anger is a resource. Let it burn a few more days.”','weak']]},
];
SRC_EVENTS.pell=[
  {text:'<b>PELL:</b> “The inspectors doubled the barge fees this week. Every hauler on the river is bleeding, and they’d follow a rumour of anyone who’d stop it.”',
   opts:[['“Then let them hear the rumour, Orrin. Let a few barges ‘lose’ their papers at your gate and see what follows.”','strong'],['“Sit tight. Word travels.”','neutral'],['“Double the fees further. Let them get angry.”','weak']]},
  {text:'<b>PELL:</b> “A timber agent asked me to keep a manifest ‘unlost’. I said I lose manifests all the time. He said he would check.”',
   opts:[['“Then lose a real one. Put it somewhere the agent finds it, and let him explain the gap.”','strong'],['“Be careful, Orrin.”','neutral'],['“Leave the barge gate. Come to us.”','weak']]},
];
SRC_EVENTS.cask=[
  {text:'<b>CASK:</b> “The Bureau audited my floor. They read everything. If my records have a hole, the hole has a name, and it’s mine.”',
   opts:[['“Then we fill the hole, Ione. Tell me which file, and I’ll tell you what goes in it.”','strong'],['“Act normal. Audits end.”','neutral'],['“Burn the evidence. All of it.”','weak']]},
  {text:'<b>CASK:</b> “I found the labour quota schedule. Blocks of names, all scheduled for ‘reassignment’. Do you want copies, or do you want me to lose the file?”',
   opts:[['“Copies. And tell the people on them, carefully, who to trust.”','strong'],['“Lose the file, and don’t look at it again.”','neutral'],['“Sell it. Somebody will pay.”','weak']]},
];
const RECRUITS={
  Soldier:[['Tam Reyes','Loader by day. Angry always.'],['Vess Okoro','Talks little, hits precisely.'],['Juno Falk','Stole her first crawler at twelve.']],
  Support:[['Mira Osk','Quartermaster. Counts every bolt twice.'],['Odo Fenn','Ran a Hegemony flight tower for nine years. Defected with the manuals.'],['Aide Corso','Knows which forms make things disappear.'],['Tela Bryn','Lab tech. Fixes what she’s told is unfixable.']],
};
/* the campaign's scripted first signals — they re-arm if let lie */
function storySignal(src){
  if(src.signal||src.pendingEvent)return false;
  if(src.id==='cass'&&(G.onboard==='contact'||G.onboard==='revealed')&&!G.missions.some(m=>m.id==='stealcross')){
    src.signal={kind:'mission',mid:'stealcross',
      text:'“You want to matter out here, you need wings. Dustfall — sheriff town on Brakka — keeps one FT-4 Cross on the pad behind the HQ and a fat opinion of itself. I can get you the pad layout.”'};
    G.onboard='revealed';
    return true;
  }
  if(src.id==='cass'&&G.onboard==='seraoffered'&&!G.people.some(p=>p.id==='sera')){
    src.signal={kind:'recruitSera',
      text:'“Found your stick. Sera Kest — ex-Hegemony survey pilot, grounded for attitude, hungrier to fly than anyone I ever hauled. She’s on my next run if you’ll have her.”'};
    return true;
  }
  if(src.id==='venn'&&G.onboard==='friend'&&!G.missions.some(m=>m.id==='depotrun')){
    src.signal={kind:'mission',mid:'depotrun',
      text:'“You gave Reeve the worst day of his life — drinks ran free till dawn. Let me return the favour: the fuel depots over Brakka feed every patrol that bleeds us. Somebody with a fast ship could cook them off.”'};
    return true;
  }
  return false;
}
function rollSignal(src){
  if(storySignal(src))return;
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
    let txt='New mission on the board: <b>'+MPOOL[sig.mid].name+'</b>.';
    if(sig.mid==='stealcross'&&(G.onboard==='revealed'||G.onboard==='contact')){
      G.onboard='pilotwait';
      txt+=' One catch — the plan needs two pilots and we have one. Cass is already asking around; give him a day.';
    }
    if(sig.mid==='depotrun')G.onboard='done';
    return txt;
  }
  return sig.apply?sig.apply():'';
}
function openRecruitOffer(src,sig){
  let p,must=false,line;
  if(sig.kind==='recruitSera'){
    must=true;
    p={id:'sera',name:'Sera Kest',role:'Pilot',level:2,xp:0.3,assign:'rest',injured:0,ship:'',
      bio:'Ex-Hegemony survey pilot. Defected after Callis Reach; hasn’t missed a launch since.'};
    line='Cass’s freighter is inbound. On the ramp, one bag over her shoulder: your new pilot.';
  } else {
    const role=sig.kind==='recruit'?'Soldier':'Support';
    const nm=RECRUITS[role][G.recruitN%RECRUITS[role].length];
    p={id:'rec'+(G.recruitN+1),name:nm[0],role,level:1,xp:0,assign:'rest',injured:0,bio:nm[1]};
    if(role==='Soldier')p.equip=['pistol'];
    line=src.name.split(' ')[0]+' vouches for them. The rest is your call.';
  }
  openWin('recruit',{p,must,line});
}
function addMission(mid,quiet){
  if(G.missions.some(m=>m.id===mid))return;
  const m=Object.assign({id:mid,state:'avail',progress:null},MPOOL[mid]);
  G.missions.splice(G.missions.length-1,0,m);
  news('Mission available: <b>'+m.name+'</b> ('+m.from+').','a');
  if(quiet)return;
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
  const attn0=new Set(G.sources.filter(x=>x.alive&&(x.pendingEvent||x.signal)).map(x=>x.id));
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
  if(G.wreck&&!G.wreck.restored&&G.wreck.restoring){
    G.wreck.restoring--;
    if(G.wreck.restoring<=0){
      G.wreck.restored=true;
      G.fighters.push({id:'graf',name:'Marta',cls:'graf',hull:70,out:false});
      const joss=G.people.find(p=>p.id==='joss');
      if(joss&&!G.fighters.some(f=>f.id===joss.ship))joss.ship='graf';
      news('<b>The Marta flies.</b> Joss brought the derelict back from the dead — a Graf Type 1 Hauler with door guns and opinions.','g');
      sBuild();
    }
  }
  const rate=hasRoom('workshop')?(staffOf('workshop').length?15:8):5;
  G.fuel+=1;   // the old hangar-cave tanks weep a little every day
  const repCost=staffOf('store').length?1:2;
  for(const f of G.fighters){
    if(f.out||f.hull>=100)continue;
    if(G.materials>=repCost){G.materials-=repCost;f.hull=Math.min(100,f.hull+rate);}
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
    if(src.inc.m)G.materials+=src.inc.m;
    if(src.inc.f)G.fuel+=src.inc.f;
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
  // candidates who found the network full try again when a slot opens
  if(G.candWait&&G.candWait.length&&G.sources.filter(s=>s.alive).length<sourceCap()){
    G.candQ.push(...G.candWait);G.candWait=[];
  }
  // the network comes through: Cass finds the pilot the Dustfall job needs
  if((G.onboard==='pilotwait'||G.onboard==='seraoffered')&&!G.people.some(p=>p.id==='sera')){
    const cass=G.sources.find(s=>s.id==='cass'&&s.alive);
    if(cass){
      const first=G.onboard==='pilotwait';
      G.onboard='seraoffered';
      storySignal(cass);
      if(first&&cass.signal){news('<b>Cass Wender</b> is on the wire — he has something for us. Raise him from the Source Network.','a');sAlert();}
    }
  }
  if(hasRoom('comms')&&staffOf('comms').length)G.intel+=roomsOf('comms').length;
  else if(hasRoom('comms'))news('The comms array hums to nobody. Assign a Signals Operator or it’s just furniture.','d');
  genOpportunities();
  for(const m of G.missions){
    if(m.state!=='prog')continue;
    m.progress.daysLeft--;
    if(m.progress.daysLeft<=0)resolveMission(m);
    else news(m.name+' — strike team checks in. '+m.progress.daysLeft+' day'+(m.progress.daysLeft>1?'s':'')+' out.','d');
  }
  const newAttn=G.sources.find(x=>x.alive&&(x.pendingEvent||x.signal)&&!attn0.has(x.id));
  if(newAttn){flashMsg('◉ <b>'+newAttn.name+'</b> wants to talk');sAlert();}
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
  if(!HOLD&&!winMode)nextReport();
}

/* ---------- missions ---------- */
function launchMission(m){
  const pslots=PL.slots.filter(sl=>sl.acc==='pilot');
  const pilots=pslots.map(sl=>G.people.find(p=>p.id===PL.v[sl.key]));
  const ships=pslots.map(sl=>G.fighters.find(f=>f.id===PL.v['rs'+sl.key.slice(2)]));
  if(pilots.some(x=>!x)||ships.some(x=>!x))return false;
  for(const p of pilots)p.assign='mission';
  for(const f of ships)f.out=true;
  m.state='prog';
  m.progress={daysLeft:m.days,pilots:pilots.map(p=>p.id),fighters:ships.map(f=>f.id)};
  G.fuel-=plFuel();
  news('<b>'+m.name+'</b> \u2014 strike team away: '+pilots.map(p=>p.name.split(' ')[0]).join(', ')+'. '+F(plFuel())+' burned.','a');
  sLaunch();
  closeWin();syncUI();
  return true;
}
/* story consequences of finished jobs — fires however the mission was run */
function missionAftermath(mid){
  if(mid==='stealcross'&&!G.sources.some(s=>s.id==='venn')){
    const venn=addStorySource('venn');
    G.onboard='friend';
    storySignal(venn);
    news('Word crosses the drift ahead of us: <b>Maro Venn</b>, keeper of the Dry Comet cantina in Dustfall, is asking after the crew that humbled Reeve. A new source — and he’s already signalling.','g');
    sAlert();
  }
  if(mid==='depotrun'&&!G.postDepot){
    G.postDepot=true;
    news('The depot fires were visible from three worlds. Word spreads — and people who hate the Hegemony start looking for us. Carefully.','p');
    G.candQ.push('halt');
    G.candQ.push('vokk');
    syncLocalOps('brakka',true);
  }
}
/* ---------- mission flow: arrive → reward screen → the source calls back ---------- */
let RQ=[],HOLD=false;
function buildReport(m,win,got,people,cr,arrive){
  let follow=null;
  if(win&&m.src){
    const src=G.sources.find(x=>x.id===m.src&&x.alive);
    if(src)follow={src:src.id,lines:m.after||['<b>'+src.name.split(' ').pop().toUpperCase()+':</b> “Word travels. Well done.”']};
  }
  return {m,win,got,people:people||[],cr:cr||null,arrive:!!arrive,follow};
}
function queueReport(rpt){
  if(rpt.arrive)RQ.push({t:'arrive',rpt});
  RQ.push({t:'reward',rpt});
  if(rpt.follow)RQ.push({t:'follow',rpt});
}
function nextReport(){
  const n=RQ.shift();
  if(!n)return false;
  if(n.t==='arrive')openWin('arrive',n.rpt);
  else if(n.t==='reward')openWin('reward',n.rpt);
  else{
    const src=G.sources.find(x=>x.id===n.rpt.follow.src&&x.alive);
    if(!src)return nextReport();
    sComm();openComm(src,{lines:n.rpt.follow.lines});
  }
  return true;
}
/* pay out a mission's fixed reward (ships are handled by each caller) */
function applyRew(rw,got){
  if(!rw)return;
  if(rw.c)G.credits+=rw.c;
  if(rw.s)G.supplies+=rw.s;
  if(rw.m)G.materials+=rw.m;
  if(rw.f)G.fuel+=rw.f;
  if(rw.i)G.intel+=rw.i;
  const b=bundleHTML(rw);
  if(b)got.push(b);
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
    applyRew(m.rew,rew);
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
    G.morale=Math.min(100,G.morale+6);
    m.state='done';m.meta='SUCCESS';
    const cr=missionCredit(m);
    queueReport(buildReport(m,true,rew,pilots.map(p=>({name:p.name,xp:m.rew.xp||0.1})),cr,false));
    news('<b>'+m.name+'</b> — SUCCESS. '+rew.join(' · ')+'. '+(m.ground?'Squad':'Flight')+' XP awarded.','g');
    sBuild();
    missionAftermath(m.id);
  } else {
    const hurt=pilots[Math.floor(rng()*pilots.length)];
    hurt.injured=(hasRoom('infirmary')&&medStaff().length)?2:4;
    const f=G.fighters.find(x=>x.id===m.progress.fighters[0]);
    if(f)f.hull=Math.max(15,f.hull-30);
    G.morale=Math.max(0,G.morale-8);
    m.state='avail';m.progress=null;
    queueReport(buildReport(m,false,[],[{name:hurt.name,xp:0,state:'injured'}],null,false));
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
    if(SRCPOS[src.id])addSupport(SRCPOS[src.id],0.5);
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
    revGain(3);
    if(SRCPOS[src.id])addSupport(SRCPOS[src.id],1);
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
    news('No capacity to run another source safely. <b>'+cd.name+'</b> will wait — grow the network (a comms array adds capacity) and they’ll come back around.','h');
    (G.candWait=G.candWait||[]).push(cd.id);
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
  st.known=true;st.access=true;st.scouted=true;st.acc=Math.max(1,st.acc||0);
  revGain(2);
  news('Scout report: <b>'+d.name+'</b> charted. We have access.','r');
  const lines=[(wasKnown?'Eyes on '+d.name+' at last.':'The uncharted signal resolves: <b>'+d.name+'</b>, '+d.kind.toLowerCase()+'.'),d.sit];
  // what the scouts turned up
  if(id==='dreymar'){addMission('orehaul');lines.push('Payday barge, no escort. The miners practically drew us a map.');}
  else if(id==='volund'){addMission('foundry');lines.push('A clerk in freight control sells manifests. There’s a job here.');}
  else if(id==='callis'){G.candQ.push('marr');lines.push('And a dead drop was waiting for us — someone at the Institute knew we’d come.');}
  else if(id==='meridian'){G.candQ.push('renn');lines.push('Our people flagged a customs chief with expensive habits and flexible loyalties.');}
  else if(id==='sable'){G.intel+=3;lines.push('The listening post still works. We stripped its logs: '+I(3)+' recovered.');}
  else if(id==='tarsis'){G.supplies+=40;G.morale=Math.min(100,G.morale+4);lines.push('The farmers hide grain from the levy. Some of it now hides with us: '+S(40)+'. The crew eats well tonight.');}
  else if(id==='nyx'){G.credits+=40;lines.push('The shadowport takes all kinds. First introductions cost us nothing and paid '+C(40)+' in fenced salvage. Recruits drink here.');}
  else if(id==='oubli'){G.intel+=1;lines.push('Empty streets. Forty years of dust. One transmitter, still powered, still listening. We left it that way. '+I(1)+'.');}
  else if(id==='halcyon'){revGain(4);lines.push('Brass, beaches, and no idea we were there. Knowing Halcyon exists for us is worth progress alone.');}
  else if(d.lib){
    G.candQ.push(d.src);
    syncLocalOps(id,true);
    lines.push('Our pathfinders mapped '+d.regions.length+' fronts worth contesting: '+d.regions.map(r=>'<b>'+r.name+'</b>').join(', ')+'. Local operations are on the board, and someone on the ground is asking to talk.');
  }
  sBuild();
  openWin('locBrief',{id,lines});
  saveSnap();syncUI();
}
/* ---------- Opportunities: leads our own intelligence turns up ----------
   Need Access 2+ in a world and a staffed Comms Array (our Intelligence Center for now).
   A lead shows on the galaxy map; click it to read it and put it on the mission board.
   The marker stays until the job is done. */
const OPP_TPL=[
  {name:'Ambush the Supply Convoy',days:2,rew:{s:40,m:20},obj:['Intercept the convoy near {where}','Take the cargo'],
   intro:'Our listeners caught a convoy schedule out of {loc}: two haulers, one escort and a driver who hums. It passes {where} at dusk.',
   desc:'A supply convoy on a predictable route through {where}. Hit it, take the cargo, and be gone before the escort calls it in.'},
  {name:'Skim a Fuel Hauler',days:2,rew:{f:35,c:30},obj:['Shadow the hauler out of {where}','Siphon her tanks'],
   intro:'A fuel hauler out of {loc} runs light on escorts every third night, and someone in the depot sells us the timing.',
   desc:'A fuel hauler with a thin escort near {where}. Take what she carries before the depot notices the shortfall.'},
  {name:'Tap a Comm Relay',days:2,rew:{i:3},obj:['Reach the relay above {where}','Plant the tap and leave'],
   intro:'A relay above {loc} carries patrol traffic almost in the clear. A tap would tell us where they are going next.',
   desc:'A patrol relay over {where}. Plant a tap and we read their traffic for weeks.'},
  {name:'Loot the Customs Shed',days:2,rew:{c:90,m:15},obj:['Reach the customs shed at {where}','Empty the impound lockers'],
   intro:'Impounded goods pile up in a shed at {where}, guarded by a clerk and a padlock. Half of it was stolen from people like us.',
   desc:'An impound shed at {where}. Take the valuables and be gone before inventory day.'},
  {name:'Hit a Prisoner Transfer',days:2,rew:{c:40,s:25},obj:['Intercept the transfer','Free the prisoners'],
   intro:'A transport of detained dissidents leaves {where} at midnight. The guards are bored and the locks are cheap.',
   desc:'A prisoner transfer out of {where}. Free the detainees, and take whatever the guards were carrying.'},
];
function oppText(t,o){
  const d=pdef(o.loc),r=o.region&&d.regions&&d.regions.find(x=>x.id===o.region);
  return t.replace(/\{loc\}/g,d.name).replace(/\{where\}/g,r?r.name:d.name);
}
function oppsEligible(){return hasRoom('comms')&&staffOf('comms').length>0;}
function genOpportunities(){
  G.opps=(G.opps||[]).filter(o=>!o.done);
  G.missions=G.missions.filter(m=>!(m.opp&&m.state==='done'));
  if(!oppsEligible()||G.opps.length>=4)return;
  for(const d of PLANETDEF){
    const st=pst(d.id);
    if(!st||d.base||!st.access||(st.acc||0)<2)continue;
    if(G.opps.some(o=>o.loc===d.id))continue;
    if(rng()>0.10+0.04*((st.acc||0)-2))continue;
    const ti=Math.floor(rng()*OPP_TPL.length);
    const scale=1+0.25*((st.acc||0)-2);
    const rew={};for(const k in OPP_TPL[ti].rew)rew[k]=Math.round(OPP_TPL[ti].rew[k]*scale);
    let region=null;
    if(d.regions){
      const open=d.regions.filter(r=>((st.lib&&st.lib[r.id])||0)<Math.min(100,locCap(st)));
      if(open.length)region=open[Math.floor(rng()*open.length)];
    }
    G.oppN=(G.oppN||0)+1;
    G.opps.push({id:'opp'+G.oppN,loc:d.id,region:region?region.id:null,tpl:ti,found:false,done:false,rew});
    news('Intelligence: a lead has surfaced at <b>'+d.name+'</b>. It is marked on the galaxy map.','a');
    flashMsg('\u25c6 New lead at <b>'+d.name+'</b>');sAlert();
    break;
  }
}
function oppMission(o){
  const t=OPP_TPL[o.tpl],d=pdef(o.loc);
  return {id:o.id,state:'avail',progress:null,opp:true,name:t.name,from:'Intelligence \u00b7 '+d.name,need:2,days:t.days,
    riskTxt:d.sec>=3?'Moderate':'Low',desc:oppText(t.desc,o),objectives:t.obj.map(x=>oppText(x,o)),
    rew:Object.assign({xp:0.12},o.rew),loc:o.loc,region:o.region||undefined,lib:o.region?15:undefined,type:'abstract'};
}
function openOpp(id){
  const o=(G.opps||[]).find(x=>x.id===id);
  if(o)openWin('opp',o);
}
/* ---------- Access, Support, Liberation, and the road to Level 2 ---------- */
function raiseAccess(id){
  const d=pdef(id),st=pst(id);
  if(!d||!st||!st.access||(st.acc||0)>=5)return;
  const cost=accessCost(d,st);
  if(G.intel<cost)return;
  G.intel-=cost;st.acc++;
  revGain(1);
  news('<b>'+d.name+'</b>: network Access raised to '+st.acc+'/5.','r');
  sBuild();
  syncLocalOps(id);
  saveSnap();syncUI();renderWin();
}
function addSupport(id,n){
  const d=pdef(id),st=pst(id);
  if(!d||!st||!st.access||!d.pop||d.pop==='—'||d.pop==='0')return;
  const before=Math.floor(st.sup||0);
  st.sup=Math.min(5,(st.sup||0)+n);
  if(Math.floor(st.sup)>before){
    revGain(1);
    news('<b>'+d.name+'</b>: local Support rises to '+Math.floor(st.sup)+'/5.','p');
    syncLocalOps(id);
  }
}
function revGain(n){
  if(!G||!(n>0))return;
  G.renown=Math.min(100,G.renown+n);
  checkEscalation();
}
function checkEscalation(){
  if(G.renown>=100&&!G.revNoted){
    G.revNoted=true;G.escPending=true;
    news('The Hegemony has noticed. <b>Revolution Level 2</b>.','p');
    if(!winMode)openEscalation();
  }
}
function openEscalation(){
  if(!G.escPending)return false;
  G.escPending=false;G.revLevel=2;
  openWin('escalate');sAlert();
  return true;
}
/* a local op waits on the board for every region that can still move */
function syncLocalOps(id,quiet){
  const d=pdef(id),st=pst(id);
  if(!d||!d.regions||!st||!st.access)return;
  if(d.gate&&!G[d.gate])return;
  for(const r of d.regions){
    if(!r.op)continue;
    const mid='op_'+id+'_'+r.id;
    const cur=G.missions.find(m=>m.id===mid);
    if(cur&&cur.state==='done')G.missions.splice(G.missions.indexOf(cur),1);
    if(G.missions.some(m=>m.id===mid))continue;
    const pct=(st.lib&&st.lib[r.id])||0;
    if(pct>=100||pct>=locCap(st))continue;
    addMission(mid,true);
    if(!quiet)news('New local op in <b>'+r.name+'</b>, '+d.name+'.','a');
  }
}
/* every finished mission feeds the progress meter; a new location is worth the most */
function missionCredit(m){
  let gain=3;
  const info={gain:0,lib:null,first:false};
  if(m.opp){const o=(G.opps||[]).find(x=>x.id===m.id);if(o)o.done=true;}
  const st=m.loc?pst(m.loc):null,d=m.loc?pdef(m.loc):null;
  if(st){
    st.ops=(st.ops||0)+1;
    info.first=st.ops===1;
    gain+=st.ops===1?5:st.ops===2?2:0;
    if(m.region&&m.lib&&d&&d.regions){
      const r=d.regions.find(x=>x.id===m.region);
      const cur=st.lib[m.region]||0,cap=locCap(st);
      const to=Math.max(cur,Math.min(cap,cur+m.lib));
      st.lib[m.region]=to;
      info.lib={region:r.name,from:cur,to,capped:to>=cap&&to<100};
      if(to>cur){
        gain+=(to-cur)*0.08;
        news('<b>'+r.name+'</b> ('+d.name+'): liberation '+to+'%'+(to>=cap&&to<100?' — capped by '+(ACC_CAP[st.acc]<=ACC_CAP[Math.floor(st.sup)]?'Access':'Support')+'.':'.'),'p');
        if(to>=100){gain+=6;news('<b>'+r.name+'</b> is LIBERATED. The flag goes up.','g');flashMsg('⚑ <b>'+r.name+'</b> liberated');}
      }
    }
  }
  revGain(gain);
  news('Revolution progress +'+(Math.round(gain*10)/10)+' ('+Math.round(G.renown)+'/100).','d');
  if(m.loc)syncLocalOps(m.loc);
  info.gain=Math.round(gain*10)/10;
  return info;
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
        if(G.wreck&&!G.wreck.restored){
          ctx.globalAlpha=0.55;
          craftTop('graf',x+6*S,y-2*S,S*0.8,-0.5,'#3a3f46');
          ctx.globalAlpha=1;
        }
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
    info='Berths '+G.fighters.length+'/'+fighterCap()+' · repairs '+rate+'%/day at '+M(staffOf('store').length?1:2)+' each';
    if(rm.key==='hangar'&&G.wreck&&!G.wreck.restored)info+='<br>A derelict <b>Graf Type 1 Hauler</b> sits under ten years of dust. Joss swears she’ll fly.';
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
    info='Revolution progress '+Math.round(G.renown)+'/100 · network exposure '+Math.round(G.risk)+staffLine('command');
  } else if(rm.key==='workshop'){
    info='Repair pace '+(staffOf('workshop').length?15:8)+'%/day'+staffLine('workshop');
  }
  let acts='';
  if(rm.key==='command')acts='<button class="pbtn" data-open="missions">Mission Board</button><button class="pbtn" data-open="sources">Source Network</button>';
  if(rm.key==='training')acts='<button class="pbtn" data-simulator>Simulator — dogfight exercise ▸</button>';
  if(rm.key==='hangar'&&G.wreck&&!G.wreck.restored){
    if(G.wreck.restoring)acts='<button class="pbtn" disabled>Restoring the hauler — '+G.wreck.restoring+'d left. Joss hasn’t slept.</button>';
    else acts='<button class="pbtn" data-restore '+((G.credits>=60&&G.materials>=40)?'':'disabled')+'>Restore the derelict hauler — 60⬡ 40⚙ · 2 days</button>';
  }
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
      if(!f&&i===G.fighters.length&&rm.key==='hangar'&&G.wreck&&!G.wreck.restored){
        ctx.globalAlpha=0.6;
        craftTop('graf',bx,by,3.4,-0.5,'#3a3f46');
        ctx.globalAlpha=1;
        ctx.font='700 11px "IBM Plex Mono"';ctx.textAlign='center';
        ctx.fillStyle='rgba(255,180,84,0.75)';
        ctx.fillText(G.wreck.restoring?'RESTORING · '+G.wreck.restoring+'D':'DERELICT',bx,by+62);
        continue;
      }
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

/* ---------- location stats (Security / Access / Support / Liberation) ---------- */
function pipRow(n,max,glyph,colFn){
  let h='';
  for(let i=0;i<max;i++)h+='<i class="pip'+(i<n?' on':'')+'"'+(i<n&&colFn?' style="color:'+colFn(i,n)+'"':'')+'>'+glyph+'</i>';
  return h;
}
function libWheel(pct){return '<span class="libwheel" style="--p:'+pct+'%" title="'+pct+'% liberated"><b>'+pct+'</b></span>';}
function locStatsHTML(d,st){
  const sup=Math.floor(st.sup||0),cap=locCap(st),lib=locLib(d,st);
  let h='<div class="locstats">'+
    '<div class="lstat"><span class="ll">Security</span><span class="lp sec">'+pipRow(d.sec,5,'⛨')+'</span></div>'+
    '<div class="lstat"><span class="ll">Access</span><span class="lp acc">'+pipRow(st.acc||0,5,'◉')+'</span></div>'+
    '<div class="lstat"><span class="ll">Support</span><span class="lp sup">'+(d.pop&&d.pop!=='0'&&d.pop!=='—'?pipRow(sup,5,'⚑',i=>SUP_COL[Math.max(0,sup-1)]):'<span class="pdesc">no population</span>')+'</span></div>'+
    '<div class="lstat"><span class="ll">Liberation</span><span class="lp">'+(lib===null?'<span class="pdesc">no liberation front charted</span>':libWheel(lib))+'</span></div>'+
  '</div>';
  if(!d.base&&(st.acc||0)>=2)h+='<div class="pdesc" style="margin:2px 0 6px">'+(oppsEligible()?'Our intelligence is watching this world for leads.':'Leads from our own intelligence need a <b>staffed Comms Array</b>.')+'</div>';
  if(d.regions){
    h+='<div class="dz-sec">Regions</div>'+d.regions.map(r=>{
      const pct=(st.lib&&st.lib[r.id])||0;
      const state=pct>=100?'liberated':pct>0?'contested':'Hegemony';
      return '<div class="regrow '+state+'"><span class="rn">'+r.name+' <em>'+r.kind+'</em></span><span class="rs">'+(pct>=100?'LIBERATED':pct>0?'CONTESTED':'HEGEMONY')+'</span>'+
        '<span class="rbar"><i style="width:'+pct+'%"></i><u style="left:'+cap+'%"></u></span><span class="rp">'+pct+'%</span></div>';
    }).join('');
    const bind=ACC_CAP[st.acc||0]<=ACC_CAP[Math.min(5,sup)]?'Access':'Support';
    if(cap<100)h+='<div class="pdesc capnote">Liberation is capped at <b>'+cap+'%</b> by '+bind+' (the lower of Access and Support). '+(bind==='Access'?'Spend Intel to deepen Access.':'Local Sources win hearts and minds.')+'</div>';
  }
  return h;
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
    if(d.regions&&st.access){
      const lb=locLib(d,st)/100;
      c2.strokeStyle='rgba(255,90,80,0.25)';c2.lineWidth=2.4;
      c2.beginPath();c2.arc(x,y,R+8,0,7);c2.stroke();
      if(lb>0){c2.strokeStyle='#ff5a50';c2.beginPath();c2.arc(x,y,R+8,-Math.PI/2,-Math.PI/2+lb*Math.PI*2);c2.stroke();}
    }
    if(selHere){c2.strokeStyle='#ffb454';c2.lineWidth=1.6;c2.beginPath();c2.arc(x,y,R+12,0,7);c2.stroke();}
    c2.font='600 9.5px "Exo 2"';c2.textAlign='center';
    c2.fillStyle=st.access?'rgba(205,216,236,0.95)':'rgba(150,165,195,0.8)';
    c2.fillText(d.name,x,y-R-9);
    c2.font='600 7.5px "Exo 2"';
    c2.fillStyle='rgba(113,128,156,0.75)';
    c2.fillText(st.access?d.kind.toUpperCase():('SCOUT '+d.scout+'◈'),x,y+R+12);
  }
  // intelligence leads: amber diamonds that stay until the job is done
  for(const o of (G.opps||[])){
    if(o.done)continue;
    const pd=pdef(o.loc),x=w*pd.x+20,y=h*pd.y-16,p=pul(x+y);
    c2.fillStyle='rgba(255,180,84,'+(0.65+0.3*p)+')';
    c2.beginPath();c2.moveTo(x,y-7);c2.lineTo(x+5.5,y);c2.lineTo(x,y+7);c2.lineTo(x-5.5,y);c2.closePath();c2.fill();
    if(!o.found){c2.strokeStyle='rgba(255,180,84,'+(0.25+0.3*p)+')';c2.lineWidth=1;c2.beginPath();c2.arc(x,y,9+3*p,0,7);c2.stroke();}
    c2.font='700 8px "Exo 2"';c2.textAlign='center';c2.fillStyle='rgba(255,200,130,.9)';c2.fillText(o.found?'LEAD · ON BOARD':'NEW LEAD',x,y+19);
  }
  // sources ride their worlds
  const hx=w*pdef('haven').x,hy=h*pdef('haven').y;
  for(const s of G.sources){
    if(!s.alive)continue;
    const [x,y]=srcMapPos(s,w,h);
    c2.strokeStyle='rgba(87,215,226,0.16)';c2.setLineDash([3,5]);
    c2.beginPath();c2.moveTo(hx,hy);c2.lineTo(x,y);c2.stroke();c2.setLineDash([]);
    const hot=s.risk>60,attn=s.pendingEvent||s.signal;
    // a source is a voice, not a world: green radio-mast icon
    const col=hot?'#ff4f5e':'#7dd97b';
    c2.fillStyle=col;
    c2.beginPath();c2.arc(x,y,2.6,0,7);c2.fill();
    c2.lineWidth=1.4;c2.lineCap='round';
    c2.strokeStyle=hot?'rgba(255,79,94,0.85)':'rgba(125,217,123,0.85)';
    for(const rr of [5.5,9]){c2.beginPath();c2.arc(x,y,rr,-Math.PI/4-0.55,-Math.PI/4+0.55);c2.stroke();}
    if(attn){ // signal waiting: waves emanate
      const tt=(now*0.0011)%1;
      for(const k of [0,0.5]){
        const q=(tt+k)%1;
        c2.strokeStyle='rgba(125,217,123,'+(0.6*(1-q)).toFixed(3)+')';
        c2.beginPath();c2.arc(x,y,10+q*13,-Math.PI/4-0.75,-Math.PI/4+0.75);c2.stroke();
      }
    }
    c2.lineCap='butt';
    if(srcSel&&srcSel.t==='s'&&srcSel.id===s.id){c2.strokeStyle='#ffb454';c2.lineWidth=1.5;c2.beginPath();c2.arc(x,y,13,0,7);c2.stroke();}
    c2.font='600 8.5px "Exo 2"';c2.textAlign='left';
    c2.fillStyle=hot?'rgba(255,150,160,0.9)':'rgba(190,240,190,0.92)';c2.fillText(s.name.split(' ').pop(),x+13,y+4);
    c2.textAlign='center';
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
  updateGuide();
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
      if(rm.key==='hangar')h+='<div class="pdesc">Berths '+G.fighters.length+'/'+fighterCap()+(G.wreck&&!G.wreck.restored?' · one derelict hauler'+(G.wreck.restoring?' (restoring, '+G.wreck.restoring+'d)':''):'')+'.</div>';
      if(rm.key==='barracks'||rm.key==='quarters')h+='<div class="pdesc">Bunks '+G.people.length+'/'+bunkCap()+'.</div>';
      if(rm.key==='store')h+='<div class="pdesc">'+C(Math.round(G.credits))+' · '+S(Math.round(G.supplies))+' · '+M(Math.round(G.materials))+' · '+F(Math.round(G.fuel))+' · '+I(Math.round(G.intel))+'</div>';
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
        '<button class="pbtn" data-dig '+(G.materials>=EXCAVATE.m?'':'disabled')+'>Excavate <span class="cost">'+M(EXCAVATE.m)+' · '+EXCAVATE.days+'d</span></button>';
    } else {
      h='<div class="ptitle">Empty Chamber</div><div class="pdesc">Cleared, powered, useless. Give it a job.</div>';
      for(const k in BUILDS){
        const b=BUILDS[k];
        const afford=G.credits>=b.c&&G.materials>=(b.m||0)&&G.supplies>=(b.s||0);
        h+='<button class="pbtn" data-build="'+k+'" '+(afford?'':'disabled')+'>'+ROOMS[k].name+
          '<span class="cost">'+bundleHTML(b)+' · '+b.days+'d</span><small>'+ROOMS[k].desc+'</small></button>';
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

/* ---------- flash banner + guided pointers ---------- */
let flashTO=null;
function flashMsg(html){
  const el=$('flashB');
  $('flashTxt').innerHTML=html;
  el.classList.add('show');
  clearTimeout(flashTO);
  flashTO=setTimeout(()=>el.classList.remove('show'),2800);
}
function pointAt(rc,label){
  const el=$('tutPtr');
  el.hidden=false;
  el.querySelector('.tp-label').textContent=label;
  el.style.left=(rc.left+rc.width/2)+'px';
  // targets low on the screen get the pointer beneath them, arrow up
  const below=rc.top>innerHeight*0.62;
  el.classList.toggle('below',below);
  el.querySelector('.tp-arrow').textContent=below?'\u25b2':'\u25bc';
  el.style.top=below?(rc.top+rc.height+8)+'px':Math.max(4,rc.top-58)+'px';
}
function updateGuide(){
  const el=$('tutPtr');
  if(!el)return;
  if(!started||!G||SR.active!=='base'){el.hidden=true;return;}
  // step 1: the sources tutorial — walk the player to Cass
  if(G.onboard==='contact'){
    if(winMode==='sources'){
      const cass=G.sources.find(x=>x.id==='cass'&&x.alive);
      const g=$('galaxyCv');
      if(cass&&g){
        if(!(srcSel&&srcSel.t==='s'&&srcSel.id==='cass')){
          const r=g.getBoundingClientRect();
          const [sx,sy]=srcMapPos(cass,r.width,r.height);
          pointAt({left:r.left+sx-8,top:r.top+sy-4,width:16,height:8},'Select Cass Wender');
          return;
        }
        const btn=ROOT.querySelector('[data-sc="cass"]');
        if(btn){pointAt(btn.getBoundingClientRect(),'Contact');return;}
      }
      el.hidden=true;return;
    }
    if(!winMode&&!viewRoom){pointAt($('navSources').getBoundingClientRect(),'Open the Source Network');return;}
    el.hidden=true;return;
  }
  // the hangar guide: the derelict hauler is a base mission of its own
  if(G.guideHangar&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring&&!winMode){
    if(viewRoom&&viewRoom.key==='hangar'){
      const rb=ROOT.querySelector('[data-restore]');
      if(rb){pointAt(rb.getBoundingClientRect(),'Restore the hauler');return;}
    } else if(!viewRoom){
      const rm=G.rooms.find(r=>r.key==='hangar'&&!r.build);
      if(rm){
        const [x,y]=cellToCss(rm.r+(rm.h-1)/2,rm.c+(rm.w-1)/2);
        const cvr=$('cv').getBoundingClientRect();
        pointAt({left:cvr.left+x-10,top:cvr.top+y-14,width:20,height:20},'The Hangar');
        return;
      }
    }
  }
  el.hidden=true;
}
/* ---------- windows ---------- */
function openWin(mode,arg){
  // first look at the galaxy: the network primer comes up once, then never again
  if(mode==='sources'&&G&&!G.srcTutSeen){G.srcTutSeen=1;saveSnap();mode='srcTutIntro';arg=null;}
  winMode=mode;winArg=arg||null;renderWin();$('winsB').hidden=false;
  if(mode==='arrive')setTimeout(()=>{if(winMode==='arrive')closeWin();},RM?400:2800);
}
function closeWin(){
  winMode=null;winArg=null;$('winsB').hidden=true;
  if(started&&G&&RQ.length&&nextReport())return;
  // a freshly discovered mission announces itself once the channel closes
  if(started&&G&&G.misPopQ&&G.misPopQ.length){
    const mid=G.misPopQ.shift();
    const m=G.missions.find(x=>x.id===mid);
    if(m&&m.state==='avail'){openWin('newmission',m);return;}
  }
  if(started&&G&&G.candQ&&G.candQ.length){
    openWin('candidate',G.candQ.shift());
    return;
  }
  if(started&&G&&G.escPending)openEscalation();
}
function meter(cls,label,val){
  return '<div class="meter '+cls+'"><span class="ml">'+label+'</span><span class="mt"><i style="width:'+Math.min(100,val)+'%"></i></span><span class="mv">'+Math.round(val)+'</span></div>';
}
function incStr(s){
  return bundleHTML(s.inc).split(' ').join(' · ')+' <span style="color:var(--dim)">per day</span>';
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
/* ---------- sources field manual (the ? button) ---------- */
const tutP=t=>'<div class="tutP">'+t+'</div>';
const tutS=(hd,b)=>'<div class="tutStep"><div class="th">'+hd+'</div><div class="tb">'+b+'</div></div>';
const TUT_PAGES=[
  {t:'Sources',h:
    tutP('You can\'t build a rebellion without knowing what\'s happening.')+
    tutP('Across the galaxy, there are people who have access to information, resources and opportunities that the rebellion could never reach on its own.')+
    tutP('These people are your <b>Sources</b>.')+
    tutP('A Source is someone inside Hegemony society who is willing to help your cause. They might be a politician, an officer, a scientist, a smuggler — or simply someone with access to something you need.')+
    tutP('Every Source is tied to a location. The more Sources you find, the more of the galaxy you can see and influence.')},
  {t:'What Sources Provide',h:
    tutP('Every Source provides something useful to the rebellion.')+
    tutP('Depending on who they are and what access they have, a Source may provide:')+
    tutS('Money','Funding for the rebellion. Some Sources can provide regular income, but doing so may put them at greater risk.')+
    tutS('Supplies','Food, medicine and other basic comforts that your people need to keep going.')+
    tutS('Materials','Spare parts and raw material for building rooms and repairing ships.')+
    tutS('Fuel','Burned by every ship you send out. No fuel, no sorties.')+
    tutS('Intel','Information about Hegemony activity. More Intel gives you greater warning of what the Hegemony is planning, and can also be spent to gain access to new locations.')+
    tutP('Sources can also generate <b>Missions</b>. The right Source might give you an opportunity that would otherwise be impossible to find.')},
  {t:'Cultivation',h:
    tutP('A Source isn\'t useful just because they are willing to help.')+
    tutP('The more you work with a Source, the more they trust you — and the more they are willing to risk for the rebellion.')+
    tutP('This is <b>Cultivation</b>.')+
    tutP('Visit or contact your Sources to build your relationship with them. They may have requests, doubts or demands of their own. How you respond can improve — or damage — their trust in the rebellion.')+
    tutP('Fill their Cultivation meter and the Source will gain a level.')+
    tutP('A higher-level Source can provide greater benefits, unlock new opportunities and gain access to more valuable information.')+
    tutP('The more you cultivate a Source, the more useful they become.')},
  {t:'Risk',h:
    tutP('Every Source is taking a risk by helping you.')+
    tutP('The <b>Risk</b> meter represents how close a Source is to being discovered by the Hegemony. The more attention they attract, the higher their Risk becomes.')+
    tutP('A nervous Source may make mistakes. The Hegemony may start asking questions. Eventually, the Source may be <b>Burned</b>.')+
    tutP('A Burned Source has been discovered as a traitor and is no longer safe to use. Their loss also increases the risk to the wider rebellion.')+
    tutP('Cultivation makes a Source more valuable — but keeping them involved also means keeping them alive.')},
  {t:'Making Contact',h:
    tutP('When you need to deal with a Source, you have two options:')+
    tutS('Visit','Meet the Source in person. This gives you more opportunities to build trust, but puts you at greater risk.')+
    tutS('Contact','Communicate remotely. This is safer, but may not be possible forever as the Revolution grows and Hegemony surveillance increases.')+
    tutP('Either way, speaking with a Source can lead to new opportunities, requests or Missions.')+
    tutP('Keep an eye on your Sources. They may have something important to tell you.')},
  {t:'When a Source Is Burned',h:
    tutP('Sometimes, a Source becomes too dangerous to keep alive.')+
    tutP('If their Risk becomes critical, you can <b>Cut Loose</b> the Source before the Hegemony discovers them.')+
    tutP('This ends the relationship and removes the immediate danger — but you lose the Source permanently, along with everything they could have provided.')+
    tutP('There is another option.')+
    tutP('An <b>Assassin</b> can be sent to silence a Source. This removes them and eliminates their Risk, but the Source is gone forever.')+
    tutP('There is no getting them back.')+
    tutP('Every Source you cultivate is an asset to the rebellion. Every asset can become a liability.')},
];
function renderWin(){
  const card=$('winCardB');
  card.classList.remove('narrow','wide');
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
          (st.access?locStatsHTML(d,st):'')+
          (st.access?'':'<button class="sbtn'+(G.intel>=d.scout?' attn':'')+'" data-scout="'+d.id+'" '+(G.intel>=d.scout?'':'disabled')+'>Scout & gain access · '+I(d.scout)+'</button>'+
            (G.intel<d.scout?'<span class="pdesc" style="margin-left:8px">not enough intel — work the network</span>':''))+
          (st.access&&(st.acc||0)<5?'<button class="sbtn'+(G.intel>=accessCost(d,st)?'':'')+'" data-raise="'+d.id+'" '+(G.intel>=accessCost(d,st)?'':'disabled')+'>Raise Access to '+((st.acc||0)+1)+' · '+I(accessCost(d,st))+'</button>'+
            (G.intel<accessCost(d,st)?'<span class="pdesc" style="margin-left:8px">more Hegemony presence, more Intel</span>':''):'')+
          '</div>';
        // sources stationed there
        const here=alive.filter(s2=>(SRCPOS[s2.id]||'veray')===d.id);
        if(st.access&&here.length)detail+=here.map(sourceDetailHTML).join('');
      }
    }
    h='<div class="winHead"><span class="wt">Galaxy · '+accessN+' worlds accessible · network '+alive.length+'/'+sourceCap()+'</span><button class="winQ" data-srchelp title="How sources work">?</button><button class="winX" data-close>✕</button></div>'+
      '<div class="winBody"><canvas id="galaxyCv"></canvas>'+
      '<div class="maphint">core worlds burn bright and cost dear · faint signals are uncharted · \u25c6 amber diamonds are intelligence leads · '+I('')+' buys access</div>'+
      detail+'</div>';
  }
  else if(winMode==='srcTutIntro'){
    card.classList.add('narrow');
    h='<div class="winHead"><span class="wt">Build Your Network</span><button class="winQ" data-srchelp title="Learn more">?</button></div><div class="winBody">'+
      tutP('Your Sources are the foundation of your intelligence network.')+
      tutS('1. Find Sources','Discover people willing to help the rebellion.')+
      tutS('2. Cultivate Them','Build their trust to increase their level and improve what they provide.')+
      tutS('3. Use Their Access','Gain Money, Supplies, Intel and new opportunities.')+
      tutS('4. Take the Risk','The more valuable a Source becomes, the more important it is to keep them safe.')+
      tutS('5. Know When to Let Go','A Source who has become too dangerous may need to be Cut Loose — or Silenced.')+
      tutP('A strong intelligence network will give the rebellion the information and resources it needs to survive.')+
      tutP('But every person in that network is a person who can be discovered...')+
      '<div class="pdesc">Click the <b style="color:var(--good)">?</b> button to learn more.</div>'+
      '<button class="dbtn" data-srctut-done style="margin-top:6px"><b>Understood</b></button></div>';
  }
  else if(winMode==='srcTut'){
    card.classList.add('narrow');
    const pg=Math.max(0,Math.min(TUT_PAGES.length-1,(winArg&&winArg.page)||0));
    const P=TUT_PAGES[pg];
    h='<div class="winHead"><span class="wt">'+P.t+'</span><button class="winX" data-tut-close>✕</button></div><div class="winBody">'+P.h+
      '<div class="tutNav"><button class="tutArr" data-tut-prev '+(pg===0?'disabled':'')+'>◀</button>'+
      '<span class="pgs">'+(pg+1)+' / '+TUT_PAGES.length+'</span>'+
      '<button class="tutArr" data-tut-next '+(pg===TUT_PAGES.length-1?'disabled':'')+'>▶</button></div></div>';
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
          '<button class="dbtn" data-follow><b>Acknowledge</b></button>';
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
    h='<div class="winHead"><span class="wt">New Mission · '+(m.from||'the network')+'</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
      '<div class="mcard" style="margin-bottom:10px"><div class="mrow"><span class="mname">'+m.name+'</span></div>'+
      '<div class="mdesc">'+m.desc+'</div>'+
      '<div class="mmeta">'+(whereHTML(m)?whereHTML(m)+' · ':'')+m.days+' days · risk '+m.riskTxt+' · '+rewHTML(m)+'</div></div>'+
      (canAttempt(m)?'':precondHTML(m))+
      '<button class="dbtn" data-mplan="'+m.id+'" '+(canAttempt(m)?'':'disabled')+' style="margin-top:9px"><b>Arrange Mission</b></button>'+
      '<button class="dbtn" data-close>Later</button>'+
      '</div>';
  }
  else if(winMode==='opp'){
    const o=winArg,t=OPP_TPL[o.tpl],d=pdef(o.loc),mm=G.missions.find(x=>x.id===o.id);
    card.classList.add('narrow');
    h='<div class="winHead"><span class="wt">Intelligence Lead \u00b7 '+d.name+'</span><button class="winX" data-close>\u2715</button></div><div class="winBody">'+
      '<div class="mcard" style="margin-bottom:8px"><div class="mrow"><span class="mname">'+t.name+'</span></div>'+
      '<div class="mwhere">'+whereHTML({loc:o.loc,region:o.region})+' \u00b7 from our own intelligence</div>'+
      '<div class="mdesc">'+oppText(t.intro,o)+'</div></div>'+
      '<div class="mmeta">Expected: '+bundleHTML(o.rew)+' +XP'+(o.region?' \u00b7 pushes liberation in '+d.regions.find(r=>r.id===o.region).name:'')+'</div>'+
      (mm?'<button class="dbtn" data-mplan="'+mm.id+'"><b>Brief & Plan</b></button>':
        '<button class="dbtn" data-oppadd="'+o.id+'"><b>Add to the Mission Board</b></button>')+
      '<button class="dbtn" data-close>Later</button></div>';
  }
  else if(winMode==='arrive'){
    card.classList.add('narrow');
    h='<div class="winBody arrive"><div class="arrsky"><i class="arrstar s1"></i><i class="arrstar s2"></i><i class="arrstar s3"></i><div class="arrship">\u25b2</div><div class="arrrock"></div></div>'+
      '<div class="arrtxt">'+(winArg.win?'Returning to Haven Rock':'Limping back to Haven Rock')+'</div>'+
      '<button class="sbtn" data-close style="margin:8px auto 0;display:block">Skip</button></div>';
  }
  else if(winMode==='reward'){
    const rp=winArg,m=rp.m;
    card.classList.add('narrow');
    const crew=rp.people.map(p=>'<div class="rwrow"><span>'+p.name+'</span><span>'+(p.state==='lost'?'<b style="color:var(--heg)">LOST</b>':p.state==='injured'?'<span style="color:var(--heg)">injured</span>':'')+(p.xp?' <span class="rxp">XP +'+Math.round(p.xp*100)+'%</span>':'')+'</span></div>').join('');
    h='<div class="winHead"><span class="wt">'+(rp.win?'Mission Complete':'Mission Failed')+'</span><button class="winX" data-close>\u2715</button></div><div class="winBody">'+
      '<div class="mcard '+(rp.win?'done':'')+'" style="margin-bottom:8px"><div class="mrow"><span class="mname">'+m.name+'</span></div>'+
      (whereHTML(m)?'<div class="mwhere">'+whereHTML(m)+'</div>':'')+'</div>'+
      (rp.win?'<div class="dz-sec">Objectives</div>'+(m.objectives||['Complete the operation']).filter(o=>o[0]!=='(').map(o=>'<div class="orow"><span class="tick" style="color:var(--good)">\u2713</span>'+o+'</div>').join(''):
        '<div class="pdesc" style="margin:6px 0">The job stays on the board. Regroup and try again.</div>')+
      '<div class="dz-sec">'+(rp.win?'Rewards':'Recovered')+'</div><div class="mmeta">'+(rp.got.length?rp.got.join(' \u00b7 '):'Nothing.')+'</div>'+
      (crew?'<div class="dz-sec">Crew</div>'+crew:'')+
      (rp.cr?'<div class="dz-sec">The revolution</div><div class="rwrow"><span>Revolution progress</span><span class="rxp">+'+rp.cr.gain+'</span></div>'+
        (rp.cr.first?'<div class="rwrow"><span>First operation in '+(pdef(m.loc)||{}).name+'</span><span class="rxp">noticed</span></div>':'')+
        (rp.cr.lib?'<div class="rwrow"><span>'+rp.cr.lib.region+' liberation</span><span class="rxp">'+rp.cr.lib.from+'% \u2192 '+rp.cr.lib.to+'%'+(rp.cr.lib.capped?' (capped)':'')+'</span></div>':''):'')+
      '<button class="dbtn" data-close style="margin-top:10px"><b>Continue</b></button></div>';
  }
  else if(winMode==='locBrief'){
    const d=pdef(winArg.id),st=pst(winArg.id);
    card.classList.add('narrow');
    h='<div class="winHead"><span class="wt">Location Briefing · '+d.name+'</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
      '<div class="locbrief"><div class="lbquote">'+(d.brief||d.sit)+'</div>'+
      '<div class="lbmeta"><span>Population <b>'+(d.pop||'—')+'</b></span>'+(d.regions?'<span>Regions <b>'+d.regions.length+'</b></span>':'')+'<span>'+d.kind+'</span></div>'+
      locStatsHTML(d,st)+'</div>'+
      '<div class="dz-sec">Pathfinder report</div>'+
      winArg.lines.map(l=>'<p class="pdesc" style="margin:0 0 7px;font-size:11.5px;line-height:1.5">'+l+'</p>').join('')+
      '<button class="dbtn" data-close style="margin-top:8px"><b>Continue</b></button></div>';
  }
  else if(winMode==='escalate'){
    card.classList.add('narrow');
    h='<div class="winBody escal"><div class="escrings"><i></i><i></i><i></i><span class="escn">2</span></div>'+
      '<div class="esct">Revolution Level 2</div>'+
      '<div class="escs">NOTICED</div>'+
      '<p class="pdesc" style="font-size:12px;line-height:1.6;margin:10px 0">Somewhere in the Hegemony’s bloated institutions, a report has reached the wrong desk. Your raids were never just crime. The Bureau has a file on you now, and the file has a name.</p>'+
      '<p class="pdesc" style="font-size:10.5px;opacity:.7;margin:0 0 10px">Level 2 content is coming in a future build. Keep building the revolution.</p>'+
      '<button class="dbtn" data-close><b>Continue</b></button></div>';
  }
  else if(winMode==='cassIntro'){
    card.classList.add('narrow');
    h='<div class="winHead"><span class="wt">Incoming Transmission</span></div><div class="winBody">'+
      '<div class="commline sys">carrier locked · unregistered freighter · voice known</div>'+
      '<div class="commline" style="color:var(--text)">“Told you the rock was worth it. This channel stays open — I hear things worth hearing, and now you’re somebody worth telling. Raise me when you’re ready to listen.”</div>'+
      '<div class="pdesc" style="margin-top:9px">First contact on the wire: <b style="color:var(--text)">Cass Wender</b>, the smuggler who flew you in. Open the <b style="color:var(--good)">Source Network</b> and raise him.</div>'+
      '<button class="dbtn" data-close style="margin-top:9px">Understood</button></div>';
  }
  else if(winMode==='recruit'){
    const {p,must,line}=winArg;
    card.classList.add('narrow');
    const pct=Math.round(p.xp*100);
    const full=G.people.length>=bunkCap();
    h='<div class="winHead"><span class="wt">New Recruit!</span>'+(must?'':'<button class="winX" data-rec-no>✕</button>')+'</div><div class="winBody">'+
      (line?'<div class="commline" style="margin-bottom:11px">'+line+'</div>':'')+
      '<div class="dz-head">'+
      '<div class="lvlring" style="background:conic-gradient(var(--purple) '+pct+'%, #232f4e 0)"><div class="lvlin"><span class="n">'+p.level+'</span><span class="l">LVL</span></div></div>'+
      '<div><div class="dz-name">'+p.name+'</div><div class="dz-rank">'+rankFor(p)+'</div><div class="dz-sub">'+p.role+'</div></div></div>'+
      '<div class="dz-bio">“'+p.bio+'”</div>'+
      '<div class="dz-sec">Terms</div><div class="pdesc">One bunk ('+G.people.length+'/'+bunkCap()+' filled)'+
        (p.role==='Support'?' · will run a station once assigned.':p.role==='Soldier'?' · arms from the rack.':' · a stick looking for a ship.')+'</div>'+
      (full?'<div class="pdesc" style="color:var(--heg)">No bunks free — build a quarters annex first.</div>':'')+
      '<button class="dbtn" data-rec-accept '+(full&&!must?'disabled':'')+'><b>Recruit</b></button>'+
      (must?'':'<button class="dbtn" data-rec-no>Dismiss</button>')+
      '</div>';
  }
  else if(winMode==='candidate'){
    const cd=CANDS[winArg]||CANDS.marr;
    card.classList.add('narrow');
    const inc=bundleHTML(cd.inc).split(' ').join(' · ');
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
        h+='<div class="mmeta">'+(whereHTML(m)?whereHTML(m)+' · ':'')+m.days+' days · risk '+m.riskTxt+' · '+rewHTML(m)+'</div>'+
          '<button class="sbtn" data-mplan="'+m.id+'">'+(m.lead?'Brief & Start':'Brief & Plan')+'</button>';
      }
      if(m.state==='sim')h+='<button class="sbtn" data-simulator>Enter Simulator ▸</button>';
      h+='</div>';
    }
    h+='<div class="pdesc" style="margin-top:4px">Missions come from the network. Work your sources; follow their signals.</div></div>';
  }
  else if(winMode==='plan'){
    card.classList.add('wide');
    h=planHTML(winArg);
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
  $('resM').textContent=Math.round(G.materials);
  $('resF').textContent=Math.round(G.fuel);
  $('resI').textContent=Math.round(G.intel);
  const lvl=G.revLevel||1;
  $('revNum').textContent=lvl;
  $('revTip').innerHTML=lvl>=2?
    '<b>Revolution Level 2</b> — the Hegemony has noticed. Level 2 content is a future build.<br>Network exposure: '+Math.round(G.risk)+'.':
    '<b>Revolution Level 1</b> — criminals, as far as the Hegemony cares.<br>Progress '+Math.round(G.renown)+'/100 toward Level 2: missions across many worlds, liberated regions, local Support and a growing network.<br>Network exposure: '+Math.round(G.risk)+'.';
  $('revLamp').classList.toggle('hot',G.renown>=90);
  const srcAttn=G.sources.filter(s=>s.alive&&(s.pendingEvent||s.signal||s.risk>70)).length
    +(G.onboard==='contact'?1:0); // the first contact is waiting — point the new player at the network
  $('srcBadge').hidden=!srcAttn;$('srcBadge').textContent=srcAttn;
  $('navSources').classList.toggle('wire',srcAttn>0);
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
    G.materials-=EXCAVATE.m;
    G.grid[r][c].dig=EXCAVATE.days;
    news('Excavation crew breaks ground. Dust everywhere.','d');
    renderTilePop();syncUI();return;
  }
  const bk=t.getAttribute('data-build');
  if(bk&&tilePopAt&&!tilePopAt.room){
    const {r,c}=tilePopAt;
    const b=BUILDS[bk];
    G.credits-=b.c;G.materials-=(b.m||0);G.supplies-=(b.s||0);
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
$('winsB').addEventListener('dragstart',ev=>{
  const c=ev.target.closest('[data-rid]');
  if(c){ev.dataTransfer.setData('text/plain',c.getAttribute('data-rid'));ev.dataTransfer.effectAllowed='move';}
});
$('winsB').addEventListener('dragover',ev=>{if(winMode==='plan'&&ev.target.closest('[data-slot]'))ev.preventDefault();});
$('winsB').addEventListener('drop',ev=>{
  const sl=ev.target.closest('[data-slot]');
  if(!sl||winMode!=='plan'||!PL)return;
  ev.preventDefault();
  plDrop(sl.getAttribute('data-slot'),ev.dataTransfer.getData('text/plain'));
  sClick();renderWin();
});
$('winsB').addEventListener('click',ev=>{
  if(ev.target.id==='winsB'||ev.target.closest('[data-close]')){closeWin();return;}
  // galaxy map source pick
  if(ev.target.id==='galaxyCv'){
    const g=ev.target,r=g.getBoundingClientRect();
    const px=ev.clientX-r.left,py=ev.clientY-r.top;
    let best=null,bd=1e9;
    for(const o of (G.opps||[])){
      if(o.done)continue;
      const pd=pdef(o.loc),d=Math.hypot(px-(r.width*pd.x+20),py-(r.height*pd.y-16));
      if(d<14&&d<bd){bd=d;best={t:'o',id:o.id};}
    }
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
    if(best&&best.t==='o'){sClick();openOpp(best.id);return;}
    if(best){srcSel=best;sClick();renderWin();}
    return;
  }
  if(winMode==='plan'&&PL){
    const slotEl=ev.target.closest('[data-slot]');
    if(slotEl){const k=slotEl.getAttribute('data-slot');if(PL.v[k]){delete PL.v[k];sClick();renderWin();}return;}
    const chip=ev.target.closest('[data-rid]');
    if(chip){plPlace(chip.getAttribute('data-rid'));sClick();renderWin();return;}
  }
  const t=ev.target.closest('button,a,input');
  if(!t)return;
  if(t.id==='launchBtn'){startPlan();return;}
  if(t.hasAttribute('data-autofill')){sClick();plAutoFill();renderWin();return;}
  sClick();
  if(t.hasAttribute('data-srchelp')){openWin('srcTut',{page:0});return;}
  if(t.hasAttribute('data-srctut-done')||t.hasAttribute('data-tut-close')){openWin('sources');return;}
  if(t.hasAttribute('data-tut-prev')){openWin('srcTut',{page:((winArg&&winArg.page)||0)-1});return;}
  if(t.hasAttribute('data-tut-next')){openWin('srcTut',{page:((winArg&&winArg.page)||0)+1});return;}
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
      const sig=src.signal;
      if(sig&&(sig.kind==='recruit'||sig.kind==='recruitS'||sig.kind==='recruitSera')){
        src.signal=null;
        openRecruitOffer(src,sig);
        syncUI();return;
      }
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
  if(t.hasAttribute('data-rec-accept')&&winMode==='recruit'){
    const {p,must}=winArg;
    if(G.people.length>=bunkCap()&&!must){news('No bunks free. '+p.name+' can’t stay.','h');closeWin();syncUI();return;}
    if(p.id&&p.id.indexOf('rec')===0)G.recruitN++;
    G.people.push(p);
    if(p.id==='sera')G.onboard='crossready';
    news('<b>'+p.name+'</b> ('+p.role+') takes the oath. One more of us.','g');
    sBuild();saveSnap();closeWin();syncUI();return;
  }
  if(t.hasAttribute('data-rec-no')&&winMode==='recruit'){
    news('You passed on '+winArg.p.name+'. They never knew.','d');
    closeWin();syncUI();return;
  }
  if(t.hasAttribute('data-gohangar')){
    const rm=G.rooms.find(r=>r.key==='hangar'&&!r.build);
    closeWin();
    if(rm){G.guideHangar=1;enterRoomView(rm);}
    syncUI();return;
  }
  const cand=t.getAttribute('data-cand');
  if(cand){if(cand==='no'){news('The contact is burned. They never hear back.','d');closeWin();}else acceptCandidate(cand);return;}
  const scout=t.getAttribute('data-scout');
  if(scout){scoutPlanet(scout);return;}
  const raise=t.getAttribute('data-raise');
  if(raise){raiseAccess(raise);return;}
  const oppadd=t.getAttribute('data-oppadd');
  if(oppadd){
    const o=(G.opps||[]).find(x=>x.id===oppadd);
    if(o&&!G.missions.some(m=>m.id===o.id)){
      o.found=true;
      const m=oppMission(o);
      G.missions.splice(G.missions.length-1,0,m);
      news('Mission available: <b>'+m.name+'</b> ('+m.from+').','a');
      sAlert();
      openWin('opp',o);
    }
    return;
  }
  const mplan=t.getAttribute('data-mplan');
  if(mplan){const m=G.missions.find(x=>x.id===mplan);if(m)openPlan(m);return;}
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
  started=false;
  launchIntro();
});
function introSpec(){
  const soldiers=G.people.filter(p=>p.role==='Soldier').slice(0,3);
  return {kind:'ground',missionId:'haven',scenario:'haven',days:0,
    squad:soldiers.map(p=>({id:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,
      aim:soldierAim(p),hp:100,wpns:['akli','cowboy']}))};
}
function launchIntro(){
  closeWin();closeTilePop();
  SR.mission=introSpec();
  SR.go('ground',{mission:SR.mission});
}
function discoverCass(){
  if(G.sources.some(s=>s.id==='cass'))return;
  addStorySource('cass');
  if(G.onboard==='intro'||G.onboard===undefined)G.onboard='contact';
}
function seedNews(){
  news('Haven Rock is powered, pressurized, and off every chart. Day one of the rest of the war.','g');
  news('Inventory logged: six Aklis, four Cowboys, one derelict hauler in the cave, and a rock with our name on it. Nothing flies. Yet.','d');
  news('First contact on the wire: <b>Cass Wender</b>, the smuggler who flew us in.','a');
}

/* ---------- leading missions in person ---------- */
function ablePilots(){return G.people.filter(p=>p.role==='Pilot'&&!p.injured&&p.assign!=='mission');}
function availSoldiers(){return G.people.filter(p=>(p.role==='Soldier'||p.role==='Marine')&&!p.injured&&p.assign!=='mission').length;}
function readyFighters(){return G.fighters.filter(f=>!f.out&&f.hull>=60).length;}
function readyStarfighters(){return G.fighters.filter(f=>f.cls!=='graf'&&!f.out&&f.hull>=60).length;}
function grafReady(){return G.fighters.some(f=>f.cls==='graf'&&!f.out&&f.hull>=60);}
/* ---------- mission requirements & the planning board ---------- */
function reqOf(m){return m.req||MTYPES[typeOf(m)].req(m);}
function soldierPool(){return G.people.filter(p=>(p.role==='Soldier'||p.role==='Marine')&&!p.injured&&p.assign!=='mission');}
function transportPool(){return G.fighters.filter(f=>SEATS[f.cls]&&!f.out&&f.hull>=60);}
function shipPool(r){return G.fighters.filter(f=>!f.out&&f.hull>=60&&(!r.starfighter||!SEATS[f.cls]));}
function transportSlots(r){return Math.ceil(r.team/SEATS.graf);}
function minFuel(m){
  const r=reqOf(m);
  const costs=(r.transport?transportPool():shipPool(r)).map(fuelOf).sort((a,b)=>a-b);
  const n=r.transport?transportSlots(r):(r.ships||r.team);
  return costs.slice(0,n).reduce((a,b)=>a+b,0)||FUEL_COST.cross*n;
}
function precondList(m){
  const r=reqOf(m),out=[];
  if(r.transport){
    const T=transportSlots(r),np=T+(r.prize||0);
    out.push({ok:soldierPool().length>=r.team,label:r.team+' Rebel Soldier'+(r.team>1?'s':'')+' Available'});
    out.push({ok:ablePilots().length>=np,label:np+' Pilot'+(np>1?'s':'')+' Available'+(r.prize?' — one to fly the hauler, one for the prize':'')});
    out.push({ok:transportPool().length>=T,label:T+' Hauler'+(T>1?'s':'')+' Available'});
  } else {
    const n=r.ships||r.team;
    out.push({ok:ablePilots().length>=r.team,label:r.team+' Starfighter Pilot'+(r.team>1?'s':'')+' Available'});
    out.push({ok:shipPool(r).length>=n,label:n+' '+(r.starfighter?'Starfighter':'Ship')+(n>1?'s':'')+' Available'+(r.starfighter?' — the Marta won’t do':'')});
  }
  const need=minFuel(m);
  out.push({ok:G.fuel>=need,label:'Fuel for the sortie: '+F(need)+' <span style="color:var(--dim)">(have '+Math.floor(G.fuel)+')</span>'});
  return out;
}
function canAttempt(m){return precondList(m).every(c=>c.ok);}
function precondHTML(m){
  return '<div class="dz-sec">Pre Conditions</div>'+precondList(m).map(c=>
    '<div class="pcRow '+(c.ok?'ok':'no')+'"><span class="pcbox">'+(c.ok?'✓':'✗')+'</span><span>'+c.label+'</span></div>').join('');
}
function rewHTML(m){
  const r=m.rew||{};
  return [r.cross?'+FT-4 Cross':'',r.fighter?'+1 fighter':'',bundleHTML(r),'+XP'].filter(Boolean).join(' ');
}
function whereHTML(m){
  const d=m.loc&&pdef(m.loc);
  if(!d)return '';
  const r=m.region&&d.regions&&d.regions.find(x=>x.id===m.region);
  return d.name+(r?' · '+r.name:'');
}

/* PL: the plan in progress. PL.v maps slot key -> person/ship id.
   Slots: team0.. (soldiers) · tv0/tp0.. (transport + its pilot) · pz0.. (prize pilot)
          rp0/rs0.. (pilot + ship rows for space sorties) */
let PL=null;
function openPlan(m){
  const r=reqOf(m);
  PL={m,req:r,v:{},slots:[]};
  if(r.transport){
    for(let i=0;i<r.team;i++)PL.slots.push({key:'team'+i,acc:'soldier',label:'Soldier '+(i+1)});
    for(let i=0;i<transportSlots(r);i++){
      PL.slots.push({key:'tv'+i,acc:'vehicle',label:'Transport'+(transportSlots(r)>1?' '+(i+1):'')});
      PL.slots.push({key:'tp'+i,acc:'pilot',label:'Transport pilot'});
    }
    for(let i=0;i<(r.prize||0);i++)PL.slots.push({key:'pz'+i,acc:'pilot',label:'Pilot for the prize'});
  } else {
    const n=r.ships||r.team;
    for(let i=0;i<n;i++){
      PL.slots.push({key:'rp'+i,acc:'pilot',label:'Pilot '+(i+1)});
      PL.slots.push({key:'rs'+i,acc:'ship',label:'Ship '+(i+1)});
    }
  }
  openWin('plan',m);
}
function plUsedIds(){return new Set(Object.values(PL.v));}
function plAccepts(slot,rid){
  const kind=rid[0],id=rid.slice(2);
  if(kind==='p'){
    const p=G.people.find(x=>x.id===id);if(!p)return false;
    return slot.acc==='soldier'?(p.role==='Soldier'||p.role==='Marine'):slot.acc==='pilot'?p.role==='Pilot':false;
  }
  const f=G.fighters.find(x=>x.id===id);if(!f)return false;
  return slot.acc==='vehicle'?!!SEATS[f.cls]:slot.acc==='ship'?shipPool(PL.req).some(x=>x.id===id):false;
}
function plSet(key,rid){
  const id=rid.slice(2);
  for(const k in PL.v)if(PL.v[k]===id)delete PL.v[k];
  PL.v[key]=id;
  // a pilot brings their ship, a ship brings its pilot (when both are free)
  const pairs={rp:'rs',rs:'rp',tp:'tv',tv:'tp'};
  const pre=key.replace(/\d+$/,''),n=key.slice(pre.length),mate=pairs[pre];
  if(mate&&!PL.v[mate+n]){
    if(pre==='rp'||pre==='tp'){
      const p=G.people.find(x=>x.id===id),f=p&&G.fighters.find(x=>x.id===p.ship);
      const slot=PL.slots.find(x=>x.key===mate+n);
      if(f&&slot&&plAccepts(slot,'f:'+f.id)&&!plUsedIds().has(f.id))PL.v[mate+n]=f.id;
    } else {
      const p=G.people.find(x=>x.role==='Pilot'&&x.ship===id&&!x.injured&&x.assign!=='mission');
      if(p&&!plUsedIds().has(p.id))PL.v[mate+n]=p.id;
    }
  }
}
function plPlace(rid){
  const slot=PL.slots.find(sl=>!PL.v[sl.key]&&plAccepts(sl,rid));
  if(slot)plSet(slot.key,rid);
}
function plDrop(key,rid){
  const slot=PL.slots.find(sl=>sl.key===key);
  if(slot&&plAccepts(slot,rid))plSet(key,rid);
}
function plComplete(){return PL.slots.every(sl=>PL.v[sl.key]);}
function plFuel(){
  let t=0;
  for(const sl of PL.slots)if(sl.acc==='vehicle'||sl.acc==='ship'){const f=G.fighters.find(x=>x.id===PL.v[sl.key]);if(f)t+=fuelOf(f);}
  return t;
}
function plAutoFill(){
  PL.v={};
  const m=PL.m;
  for(const sl of PL.slots){
    if(PL.v[sl.key])continue;
    const used=plUsedIds();
    let pool=[];
    if(sl.acc==='soldier')pool=soldierPool().map(p=>'p:'+p.id);
    else if(sl.acc==='pilot')pool=ablePilots().map(p=>'p:'+p.id);
    else if(sl.acc==='vehicle')pool=transportPool().map(f=>'f:'+f.id);
    else pool=shipPool(PL.req).map(f=>'f:'+f.id);
    const pick=pool.find(r=>!used.has(r.slice(2)));
    if(pick)plSet(sl.key,pick);
  }
}
function slotOccHTML(sl){
  const id=PL.v[sl.key];
  if(!id)return null;
  if(sl.acc==='vehicle'||sl.acc==='ship'){
    const f=G.fighters.find(x=>x.id===id);
    return '<b>'+f.name+'</b><small>'+SHIPSTATS[f.cls].label.split(' · ')[0]+' · hull '+f.hull+'% · '+F(fuelOf(f))+(SEATS[f.cls]?' · seats '+SEATS[f.cls]:'')+'</small>';
  }
  const p=G.people.find(x=>x.id===id);
  return '<b>'+p.name+'</b><small>'+rankFor(p)+' · lvl '+p.level+'</small>';
}
function chipHTML(rid){
  const kind=rid[0],id=rid.slice(2);
  if(kind==='f'){
    const f=G.fighters.find(x=>x.id===id);
    return '<div class="rchip ship" draggable="true" data-rid="'+rid+'"><b>'+f.name+'</b><small>'+SHIPSTATS[f.cls].label.split(' · ')[0]+' · '+F(fuelOf(f))+'</small></div>';
  }
  const p=G.people.find(x=>x.id===id);
  return '<div class="rchip" draggable="true" data-rid="'+rid+'"><span class="pl">'+p.name.split(' ').map(w=>w[0]).join('')+'</span><span><b>'+p.name+'</b><small>'+rankFor(p)+' · lvl '+p.level+'</small></span></div>';
}
function planHTML(m){
  const r=PL.req,used=plUsedIds();
  const left='<div class="planL">'+
    '<div class="mcard" style="margin-bottom:8px"><div class="mrow"><span class="mname">'+m.name+'</span><span class="mfrom">'+(m.from||'')+'</span></div>'+
    (whereHTML(m)?'<div class="mwhere">'+whereHTML(m)+' · '+MTYPES[typeOf(m)].label+'</div>':'')+
    '<div class="mdesc">'+m.desc+'</div></div>'+
    '<div class="dz-sec">Objectives</div>'+
    (m.objectives||['Complete the operation']).map((o,i)=>'<div class="orow"><span class="tick">'+(o[0]==='('?'○':'■')+'</span>'+o+'</div>').join('')+
    '<div class="dz-sec">Reward</div><div class="mmeta">'+rewHTML(m)+' · '+m.days+' day'+(m.days>1?'s':'')+' · risk '+m.riskTxt+'</div>'+
    precondHTML(m)+
    (r.transport&&!grafReady()&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring?
      '<div class="pdesc" style="color:var(--amber);margin-top:8px">The derelict hauler in the hangar can fly again — restoring it is a base job: 60⬡ 40⚙ and two days.</div>'+
      '<button class="dbtn" data-gohangar>Go to the Hangar ▸</button>':'')+
    (r.transport&&!grafReady()&&G.wreck&&G.wreck.restoring?
      '<div class="pdesc" style="color:var(--amber);margin-top:8px">Hauler restoration under way — '+G.wreck.restoring+' day'+(G.wreck.restoring>1?'s':'')+' left. Advance the day.</div>':'')+
    '</div>';
  const slotBox=(keys,title)=>{
    const sls=PL.slots.filter(sl=>keys.includes(sl.acc));
    if(!sls.length)return '';
    return '<div class="dz-sec">'+title+'</div>'+sls.map(sl=>{
      const occ=slotOccHTML(sl);
      return '<div class="slot'+(occ?' filled':'')+'" data-slot="'+sl.key+'"'+(occ?' draggable="true" data-rid="'+(sl.acc==='soldier'||sl.acc==='pilot'?'p:':'f:')+PL.v[sl.key]+'"':'')+'><span class="sl">'+sl.label+'</span><span class="sv">'+(occ||'<em>click or drag a roster entry here</em>')+'</span></div>';
    }).join('');
  };
  const avail=(list,pre)=>list.filter(x=>!used.has(x.id)).map(x=>chipHTML(pre+x.id)).join('')||'<div class="pdesc">None available.</div>';
  const right='<div class="planR">'+
    (r.transport?slotBox(['soldier'],'Team'):'')+
    (r.transport?slotBox(['vehicle','pilot'],'Transport & pilots'):slotBox(['pilot','ship'],'Flight'))+
    '<div class="dz-sec">Roster</div><div class="rosterBox">'+
    (r.transport?'<div class="rh">Soldiers</div>'+avail(soldierPool(),'p:'):'')+
    '<div class="rh">Pilots</div>'+avail(ablePilots(),'p:')+
    '<div class="rh">'+(r.transport?'Transports':'Ships')+'</div>'+avail(r.transport?transportPool():shipPool(r),'f:')+
    '</div></div>';
  const fuel=plFuel(),ok=plComplete()&&canAttempt(m)&&G.fuel>=fuel;
  return '<div class="winHead"><span class="wt">Mission Briefing</span><button class="winX" data-close>✕</button></div><div class="winBody">'+
    '<div class="planGrid">'+left+right+'</div>'+
    '<div class="planFoot"><span class="pdesc">'+(plComplete()?'Fuel burned: '+F(fuel)+' of '+Math.floor(G.fuel):'Fill every slot to go.')+'</span>'+
    '<button class="sbtn" data-autofill>Auto-fill</button>'+
    '<button class="sbtn go" id="launchBtn" '+(ok?'':'disabled')+'>'+(m.lead?'Start':'Launch')+'</button></div></div>';
}
function startPlan(){
  const m=PL.m;
  if(!plComplete()||!canAttempt(m)||G.fuel<plFuel())return;
  sClick();
  if(!m.lead){launchMission(m);return;}
  const fuel=plFuel();
  if(PL.req.transport){
    const squad=PL.slots.filter(sl=>sl.acc==='soldier').map(sl=>G.people.find(p=>p.id===PL.v[sl.key]));
    const grafPilot=G.people.find(p=>p.id===PL.v.tp0);
    const prizeId=PL.v.pz0,prize=prizeId&&G.people.find(p=>p.id===prizeId);
    const scatter=G.armory.find(a=>a.id==='scatter'&&a.n>0);
    const blam=G.armory.find(a=>a.id==='blam');
    G.fuel-=fuel;
    SR.mission={kind:'ground',missionId:m.id,days:m.days,nades:blam?blam.n:0,
      squad:squad.map((p,i)=>({id:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,
        aim:soldierAim(p),hp:100,wpns:(scatter&&i===0)?['scatter','akli','cowboy']:['akli','cowboy']})),
      pilot:prize?{id:prize.id,name:prize.name,first:prize.name.split(' ')[0],level:prize.level}:undefined,
      grafPilot:{id:grafPilot.id,name:grafPilot.name,first:grafPilot.name.split(' ')[0]}};
  } else {
    const flight=[];
    for(const sl of PL.slots.filter(x=>x.acc==='pilot')){
      const p=G.people.find(x=>x.id===PL.v[sl.key]),f=G.fighters.find(x=>x.id===PL.v['rs'+sl.key.slice(2)]);
      flight.push({pilotId:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,
        aim:pilotAim(p),cool:Math.min(85,55+p.level*4),traits:p.id==='sera'?['Lucky']:[],
        cls:f.cls,fighterId:f.id,fighterName:f.name,hull:f.hull});
    }
    G.fuel-=fuel;
    SR.mission={kind:'space',missionId:m.id,days:m.days,flight};
  }
  closeWin();closeTilePop();
  saveSnap();
  SR.go(PL.req.transport?'ground':'space',{mission:SR.mission});
}
function soldierAim(p){return Math.max(1,Math.min(5,2+Math.floor(p.level/3)));}
function pilotAim(p){return Math.max(1,Math.min(5,1+Math.ceil(p.level/2)));}
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
      news('In the hangar cave, under a decade of dust: a <b>derelict Graf Type 1 Hauler</b>. Joss is already talking to it. Restore it from the hangar.','a');
      discoverCass();
      seedNews();
      openWin('cassIntro');
      sBuild();
      saveSnap();syncUI();
      return;
    }
    // thrown back: no lasting harm, no base to return to. The mission retries in place.
    news('The squatters held the rock. Everyone made it back down the canyon \u2014 patch up and go again.','h');
    started=false;
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
  HOLD=true;
  for(let d=0;d<(r.days===undefined?1:r.days);d++)advanceDay();
  HOLD=false;
  const pinfo=[];
  for(const pr of r.people||[]){
    const p=G.people.find(x=>x.id===pr.id);
    if(!p)continue;
    p.assign='rest';
    if(pr.xp){p.xp+=pr.xp;levelUp(p);}
    let state=pr.state;
    if(state==='shotdown')state=(rng()<0.15)?'lost':'injured';
    pinfo.push({name:p.name,xp:pr.xp||0,state});
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
  if(r.kind==='ground'&&r.nades!==undefined){
    const a=G.armory.find(x=>x.id==='blam');
    if(a)a.n=r.nades;
    else if(r.nades>0)G.armory.push({id:'blam',name:'BLAM Frag Grenade',n:r.nades,ic:'✸',
      desc:'Cheap, loud, and honest about it. Thrown one round, felt the next.'});
    if(r.nades>0&&!a)got.push('BLAM frags ×'+r.nades);
  }
  if(r.win&&r.cross){
    if(G.fighters.length<fighterCap()){
      G.fighters.push({id:'dustfall',name:'Dustfall',cls:'cross',hull:85,out:false});
      const flew=(r.people||[]).map(pr=>pr.id);
      const orphan=G.people.find(p=>p.role==='Pilot'&&flew.includes(p.id)&&!G.fighters.some(f=>f.id===p.ship))
        ||G.people.find(p=>p.role==='Pilot'&&!G.fighters.some(f=>f.id===p.ship));
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
  if(r.win&&m)applyRew(m.rew,got);
  if(m){
    if(r.win){
      m.state='done';m.meta='SUCCESS';
      const cr=missionCredit(m);
      queueReport(buildReport(m,true,got,pinfo,cr,true));
      G.morale=Math.min(100,G.morale+6);
      news('<b>'+m.name+'</b> \u2014 SUCCESS, and you were there. '+(got.length?got.join(' \u00b7 ')+'.':''),'g');
      sBuild();
      missionAftermath(m.id);
    } else {
      m.state='avail';m.progress=null;
      G.morale=Math.max(0,G.morale-8);
      queueReport(buildReport(m,false,got,pinfo,null,true));
      news('<b>'+m.name+'</b> \u2014 the field op failed. The board keeps the job open.','h');
      sAlert();
    }
  }
  saveSnap();syncUI();
  nextReport();
}
ROOT.addEventListener('click',ev=>{
  const rst=ev.target.closest('[data-restore]');
  if(rst&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring&&G.credits>=60&&G.materials>=40){
    G.credits-=60;G.materials-=40;G.wreck.restoring=2;G.guideHangar=0;
    news('Joss has the hauler’s guts across the cave floor. Two days, he says. “She has a name. It’s Marta.”','a');
    sBuild();saveSnap();syncUI();
    if(viewRoom)renderRoomBar();
    return;
  }
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
    if(G.wreck===undefined)G.wreck={restored:true,restoring:0};
    if(G.onboard===undefined)G.onboard='done';
    G.misPopQ=G.misPopQ||[];
    G.candQ=G.candQ||[];
    if(!G.planets)G.planets=PLANETDEF.map(mkPlanet);
    for(const d of PLANETDEF){
      let st=G.planets.find(x=>x.id===d.id);
      if(!st){st=mkPlanet(d);G.planets.push(st);}
      if(d.access&&!d.base&&!st.access){st.known=st.access=st.scouted=true;}
      if(st.acc===undefined||(st.access&&!d.base&&!st.acc))st.acc=st.access&&!d.base?1:0;
      if(st.sup===undefined)st.sup=d.sup||0;
      if(!st.lib)st.lib={};
      if(st.ops===undefined)st.ops=0;
    }
    G.opps=G.opps||[];
    if(G.materials===undefined)G.materials=80;
    if(G.fuel===undefined)G.fuel=40;
    if(!G.locModel){G.locModel=1;G.renown=Math.min(G.renown,40);G.revNoted=false;G.revLevel=1;}
    for(const p of G.people)if(p.assign==='medbay')p.assign='station:infirmary';
    for(const f of G.fighters)if(f.cls==='viper')f.cls='cross';
    // refresh static mission fields (play links, ground flags) from the pool
    for(const m of G.missions)if(MPOOL[m.id])for(const k in MPOOL[m.id])if(!(k in {state:1,progress:1,meta:1}))m[k]=MPOOL[m.id][k];
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
        started=true;G.introDone=true;
        discoverCass();seedNews();
      }
    }
  }
  if(params&&params.debrief)applyDebrief(params.debrief);
  // a campaign that hasn't taken the rock yet lives in the mission, not the base
  if(!G.introDone){launchIntro();return;}
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
    fn:{addMission,openPlan,plPlace,plComplete,plFuel,startPlan,applyDebrief,advanceDay,scoutPlanet,syncUI,saveSnap,
      ablePilots,openWin,closeWin,launchIntro,precondList,canAttempt,
      raiseAccess,addSupport,revGain,missionCredit,syncLocalOps,pst,pdef,locCap,renderWin,getPL:()=>PL,canAttempt,precondList}};
}
})();
