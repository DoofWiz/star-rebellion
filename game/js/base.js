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

/* Autos: robots that fight for us. Stats here seed the ground scene. */
const AUTOS={
  policebot:{label:'Policebot',hp:45,def:9,wpn:'cowboy',big:0,heavy:0,bio:'A Hegemony Policebot with a new master and a face-screen that still says \u201cfriendly and helpful\u201d.'},
  bruiser:{label:'Bruiser',hp:95,def:10,wpn:'fists',big:0,heavy:1,bio:'A riot Bruiser, reprogrammed. It still beats up anyone who does not comply. Now that means them.'},
  strider:{label:'Strider',hp:220,def:8,wpn:'strider',big:1,heavy:0,bio:'A Hegemony enforcement Strider, reprogrammed. Its face-screen is permanently stuck on \u201cWe\u2019re all in this together.\u201d'},
};
const autoOf=p=>AUTOS[p.auto]||AUTOS.strider;
const autoKey=p=>AUTOS[p.auto]?p.auto:'strider';
const rankFor=p=>p.auto?autoOf(p).label:Rebel.rankName(p);
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let rng=Math.random;
/* ---------- kit helpers: icons, cost chips, palette ---------- */
const TH=SR.theme,K=TH.C;                       // K is the live palette (re-synced from the CSS tokens at boot)
const IC=(n,c)=>'<svg class="sr-ico'+(c?' '+c:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>';
const RES={c:['credits','Credits'],s:['supplies','Supplies'],m:['materials','Materials'],f:['fuel','Fuel'],i:['intel','Intel']};
const resCost=(k,n,short)=>'<span class="sr-cost'+(short?' is-short':'')+'" style="--c:var(--sr-res-'+RES[k][0]+')" title="'+RES[k][1]+'">'+IC(RES[k][0])+n+'</span>';
const C=(n,s)=>resCost('c',n,s);
const S=(n,s)=>resCost('s',n,s);
const I=(n,s)=>resCost('i',n,s);
const M=(n,s)=>resCost('m',n,s);
const F=(n,s)=>resCost('f',n,s);
/* a reward/cost bundle → chips; `have` (optional) flags the ones we can't pay */
function bundleList(b,have){
  const o=[];
  for(const k of ['c','s','m','f','i'])if(b[k])o.push(resCost(k,b[k],have&&have[k]!==undefined&&have[k]<b[k]));
  return o;
}
function bundleHTML(b,have){return bundleList(b,have).join(' ');}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const WALLET=()=>({c:G.credits,s:G.supplies,m:G.materials,f:G.fuel,i:G.intel});
/* "Need 8 more materials": the reason a Build button is greyed */
function needWhy(b){
  const w=WALLET(),o=[];
  for(const k of ['c','s','m','f','i'])if(b[k]&&w[k]<b[k])o.push('Need '+Math.ceil(b[k]-w[k])+' more '+RES[k][1].toLowerCase());
  return o.join(', ');
}

/* ---------- rooms & builds (copy in the commander's voice) ---------- */
const ROOMS={
  command:{name:'Command Center',ck:'gold',ic:'base',desc:'Where the revolution gets planned. Sources, missions, bad coffee.'},
  hangar:{name:'Hangar',ck:'shield',ic:'hangar',desc:'The fighters live here. So does Joss, practically.'},
  barracks:{name:'Barracks',ck:'rebel',ic:'soldier',desc:'Bunks and quiet. People break without both.'},
  store:{name:'Storeroom',ck:'go',ic:'supplies',desc:'Everything we own, counted twice by Mira.'},
  comms:{name:'Intelligence Center',ck:'shield',ic:'comms',desc:'Officers keep an ear on the galaxy. One more intel a day per room, and room for one more source.'},
  diplo:{name:'Diplomatic Quarter',ck:'rebelHi',ic:'people',desc:'Diplomats and liaisons win hearts and minds without getting caught at it. A Chief Diplomat runs the tasks.'},
  workshop:{name:'Workshop',ck:'steel',ic:'work',desc:'Broken fighters go in. Working fighters come out. Three times the pace.'},
  infirmary:{name:'Infirmary',ck:'go',ic:'heart',desc:'Beds and bacta. People mend twice as fast with someone on station.'},
  training:{name:'Training Hall',ck:'psi',ic:'star',desc:'Sweat now, live later.'},
};
/* room colours come from the kit palette (resolved at draw time so the CSS tokens stay the single source) */
const rcol=key=>K[ROOMS[key].ck]||K.steel;
const BUILDS={
  store:{c:200,m:80,days:1},
  comms:{c:480,m:120,days:2},
  workshop:{c:400,m:160,days:2},
  infirmary:{c:360,m:80,s:60,days:2},
  training:{c:320,m:100,s:40,days:1},
  hangar:{c:240,m:200,days:1},
  barracks:{c:280,m:120,s:60,days:1},
  diplo:{c:500,m:160,s:60,days:2},
};
/* adjacent rooms of one type merge into a single bigger room; upgrades apply to the whole merged room */
const UPGRADES={
  barracks:[
    {k:'bunks',n:'Bunks',c:260,m:140,days:2,d:'Stack the beds: +2 beds in every barracks room.'},
    {k:'quarters',n:'Quarters',c:320,m:160,s:60,days:2,d:'Thin partitions, one more bed in each bay: +2 more beds per room.'},
    {k:'rec',n:'Rec Room',c:300,m:160,s:80,days:2,conv:1,minTiles:3,d:'Converts one barracks room (its beds) into a rec room: resting rebels recover morale twice as fast. Needs an expansion first.'},
  ],
  infirmary:[
    {k:'surgery',n:'Surgery Room',c:600,m:240,s:100,days:3,d:'When someone would be lost in the field, a staffed surgery gives them a 60% chance to be pulled back from the brink (out for 6 days).'},
  ],
  hangar:[
    {k:'refuel',n:'Refuelling Station',c:400,m:240,days:2,d:'Dedicated fuel storage and pumps: sorties burn 25% less fuel.'},
    {k:'arm',n:'Robot Maintenance Arm',c:440,m:260,days:3,d:'A robotic mechanic: ships repair 5% a day faster on the pads.'},
    {k:'lounge',n:'Ready Lounge',c:520,m:220,days:3,conv:1,minTiles:2,d:'Converts one landing pad into a standby lounge: pilots get to a mission a day sooner (every sortie takes 1 day less, minimum 1).'},
    {k:'mbay',n:'Maintenance Bay',c:560,m:320,days:3,conv:1,minTiles:2,d:'Converts one landing pad into a dedicated bay: the most damaged ship moves in and repairs 10% a day faster until it is whole.'},
  ],
};
const DIP_COST={c:400,s:60},DIP_DAYS=4;
const SPEC_COST=300;
/* gear grid: every item has a category and a footprint; duplicates stack as one entry ("x N") */
const GEAR_CATS=['All','Weapons','Explosives','Armour','Other'];
const GEAR_META={
  akli:{cat:'Weapons',sub:'Rifles',w:3,h:1},cowboy:{cat:'Weapons',sub:'Pistols',w:1,h:1},
  scatter:{cat:'Weapons',sub:'Rifles',w:3,h:1},carbine:{cat:'Weapons',sub:'Rifles',w:3,h:1},
  shells:{cat:'Other',sub:'Ammunition',w:1,h:1},blam:{cat:'Explosives',sub:'Grenades',w:1,h:1},
  charge:{cat:'Explosives',sub:'Explosive Charges',w:2,h:1},
};
const gearMeta=a=>GEAR_META[a.id]||{cat:'Other',sub:'Misc',w:2,h:1};
const GEAR_COLS=8;
function gearCapacity(){return 24+12*tilesOf('store');}
function gearLayout(items,cols){
  cols=cols||GEAR_COLS;   // phones lay the grid out four wide
  const rows=[];const fits=(r,c,w,h)=>{for(let y=r;y<r+h;y++)for(let x=c;x<c+w;x++){if(x>=cols||(rows[y]&&rows[y][x]))return false;}return true;};
  const out=[];
  for(const a of items){
    const m=gearMeta(a);let placed=false;
    for(let r=0;!placed;r++)for(let c=0;c<=cols-m.w&&!placed;c++)if(fits(r,c,m.w,m.h)){
      for(let y=r;y<r+m.h;y++){rows[y]=rows[y]||[];for(let x=c;x<c+m.w;x++)rows[y][x]=1;}
      out.push({a,m,r,c});placed=true;
    }
  }
  return out;
}
let GEARCAT='All';
const EXCAVATE={m:40,days:1};
/* fuel burned per ship on a sortie */
const FUEL_COST={graf:16,cross:24,talon:24};
const fuelOf=f=>Math.ceil((FUEL_COST[f.cls]||5)*(hangarUp('refuel')?0.75:1));
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
    {id:'rm_2_4',key:'command',r:2,c:4,w:2,h:2},
    {id:'rm_2_1',key:'hangar',r:2,c:1,w:2,h:2},
    {id:'rm_5_4',key:'barracks',r:5,c:4,w:2,h:1},
  ];
  for(const rm of rooms)for(let r=rm.r;r<rm.r+rm.h;r++)for(let c=rm.c;c<rm.c+rm.w;c++)grid[r][c]={t:'room',room:rm.key};
  const g0={
    day:1,credits:1000,supplies:480,materials:400,fuel:240,intel:3,renown:8,risk:10,morale:65,introDone:false,
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
    ],
    planets:PLANETDEF.map(mkPlanet),
    recruitN:0,misPopQ:[],candQ:[],
    news:[],
  };
  g0.people.forEach(Rebel.migrate);
  g0.morale=Rebel.MORALE_START;
  return g0;
}

/* ---------- helpers ---------- */
const $=id=>byId(id);
function hasRoom(key){return G.rooms.some(r=>r.key===key&&!r.build);}
function roomsOf(key){return G.rooms.filter(r=>r.key===key&&!r.build);}
/* rooms are rectangles of tiles; same-type rooms that touch are one merged room */
const roomTiles=rm=>rm.w*rm.h;
function tilesOf(key){return roomsOf(key).reduce((n,r)=>n+roomTiles(r),0);}
function roomsAdj(a,b){
  const rowOv=a.r<b.r+b.h&&b.r<a.r+a.h,colOv=a.c<b.c+b.w&&b.c<a.c+a.w;
  return (rowOv&&(a.c+a.w===b.c||b.c+b.w===a.c))||(colOv&&(a.r+a.h===b.r||b.r+b.h===a.r));
}
function clusterOf(rm){
  if(rm.build)return [rm];
  const out=[rm];
  for(let i=0;i<out.length;i++)for(const o of G.rooms)if(o.key===rm.key&&!o.build&&!out.includes(o)&&roomsAdj(out[i],o))out.push(o);
  return out.sort((a,b)=>G.rooms.indexOf(a)-G.rooms.indexOf(b));
}
const clusterTiles=cl=>cl.reduce((n,r)=>n+roomTiles(r),0);
function upOf(rm,k){return clusterOf(rm).some(r=>(r.up||[]).includes(k));}
function upAny(key,k){return G&&G.rooms&&G.rooms.some(r=>r.key===key&&!r.build&&(r.up||[]).includes(k));}
function hangarUp(k){return G&&G.rooms&&G.rooms.some(r=>r.key==='hangar'&&!r.build&&(r.up||[]).includes(k));}
function upQueued(rm,k){return (G.upq||[]).some(u=>u.key===rm.key&&u.k===k&&clusterOf(rm).some(r=>u.ids.includes(r.id)));}
function sourceCap(){return 2+tilesOf('comms');}
function clustersOf(key){
  const seen=[],out=[];
  for(const r of roomsOf(key)){if(seen.includes(r))continue;const cl=clusterOf(r);cl.forEach(q=>seen.push(q));out.push(cl);}
  return out;
}
const clUp=(cl,k)=>cl.some(r=>(r.up||[]).includes(k));
/* conversions (Ready Lounge, Maintenance Bay, Rec Room) turn one tile of a merged room into something else */
function fighterCap(){return clustersOf('hangar').reduce((n,cl)=>n+clusterTiles(cl)-(clUp(cl,'lounge')?1:0)-(clUp(cl,'mbay')?1:0),0);}   // one landing pad per hangar tile; four from the start
const bedsPerTile=cl=>3+(clUp(cl,'bunks')?2:0)+(clUp(cl,'quarters')?2:0);
function bunkCap(){return clustersOf('barracks').reduce((n,cl)=>n+(clusterTiles(cl)-(clUp(cl,'rec')?1:0))*bedsPerTile(cl),0);}
const missionDays=m=>Math.max(1,(m.days||1)-(hangarUp('lounge')?1:0));
function supCap(){const t=tilesOf('store');return Math.round(1000+250*t*(1+0.05*Math.max(0,t-1)));}
function postSlots(key){return key==='infirmary'?Math.max(1,tilesOf('infirmary')):1;}
function clampSupplies(){
  if(!G)return;
  const cap=supCap();
  if(G.supplies>cap){
    const lost=Math.round(G.supplies-cap);G.supplies=cap;
    if(lost>=10)news('The storerooms are full. '+S(lost)+' spoiled or walked off. Build another Storeroom.','d');
  }
}
const bunksUsed=()=>G.people.filter(p=>!p.auto).length;   // Autos don't sleep
/* Support crew man stations; a room without its operator underperforms */
const STAFFABLE={
  command:{post:'Flight Coordinator',perk:'+5% mission success'},
  barracks:{post:'Garrison Officer',perk:'wounded soldiers recover a day faster'},
  hangar:{post:'Flight Deck Officer',perk:'ships repair 4% a day faster on the pads'},
  diplo:{post:'Chief Diplomat',perk:'runs diplomatic tasks that raise local Support'},
  store:{post:'Quartermaster',perk:'repairs cost 4⚙ instead of 8⚙'},
  workshop:{post:'Crew Chief',perk:'repairs 15%/day instead of 8%'},
  infirmary:{post:'Medic',perk:'injuries heal twice as fast'},
  comms:{post:'Signals Operator',perk:'intel flows (+1/day per array)'},
  training:{post:'Drill Instructor',perk:'+50% training XP'},
};
const STLBL={barracks:'Garrison',hangar:'Deck',diplo:'Diplo',command:'Command',store:'Stores',workshop:'Workshop',infirmary:'Medbay',comms:'Comms',training:'Drill'};
function staffOf(key){return G.people.filter(p=>p.assign==='station:'+key&&!p.injured);}
function medStaff(){return staffOf('infirmary');}
const staffHas=(key,trait)=>staffOf(key).some(p=>Rebel.has(p,trait));
/* ---------- morale: every rebel has their own; G.morale is the base's mood, their average ---------- */
const crewOf=()=>G.people.filter(p=>!p.auto);
function mood(){const c=crewOf();G.morale=c.length?c.reduce((a,p)=>a+(p.morale===undefined?Rebel.MORALE_START:p.morale),0)/c.length:Rebel.MORALE_START;}
/* a base-wide event: everybody feels it, those in `team` feel it differently */
function moraleAll(d,kind,team,dTeam){
  for(const p of crewOf())Rebel.moraleBump(p,team&&team.includes(p.id)?dTeam:d,kind);
  mood();
}
/* news classes (saved as d/a/g/h/r/p) → kit tones */
const NEWS_TONE={d:'',a:'action',g:'good',h:'bad',r:'info',p:'progress'};
const newsTone=cls=>NEWS_TONE[cls]!==undefined?NEWS_TONE[cls]:'';
function news(html,cls){
  G.news.push({day:G.day,html,cls:cls||'d'});
  if(G.news.length>80)G.news.shift();
  feedPush(G.news[G.news.length-1]);
  renderNews();
}
/* the full log lives in the "All news" window; #log exists only while it is open */
function renderNews(){
  const el=$('log');
  if(!el)return;
  let day=null,h='';
  for(const n of G.news){
    if(n.day!==day){day=n.day;h+='<span class="sr-log__day">Day '+n.day+'</span>';}
    const tn=newsTone(n.cls);
    h+='<p'+(tn?' class="is-'+tn+'"':'')+'>'+n.html+'</p>';
  }
  el.innerHTML=h;
  const body=el.parentElement,down=()=>{body.scrollTop=body.scrollHeight;};
  down();requestAnimationFrame(down);
}
/* comms feed: the newest lines surface bottom-left for a few seconds, the log keeps everything */
const FEED_MS=6000;
let feed=[],feedTO=null;
function feedPush(n){
  feed.push({html:n.html,tone:newsTone(n.cls),t:performance.now()});
  while(feed.length>3)feed.shift();
  renderFeed();
}
function renderFeed(){
  const box=byId('feedLines');
  if(!box)return;
  const now=performance.now();
  box.innerHTML=feed.map((f,i)=>'<div class="sr-comm'+(f.tone?' sr-comm--'+f.tone:'')+(i<feed.length-1?' is-old':'')+(now-f.t>=FEED_MS?' is-expired':'')+'">'+f.html+'</div>').join('');
  clearTimeout(feedTO);
  const live=feed.filter(f=>now-f.t<FEED_MS);
  if(live.length)feedTO=setTimeout(renderFeed,Math.max(60,FEED_MS-(now-live[0].t)+40));
}
/* a completed mission counts toward the next rank */
function creditMission(p){
  if(Rebel.credit(p))news('<b>'+p.name+'</b> has earned a promotion. Say the word in their file.','p');
}
function gainXp(p,x){
  const n=Rebel.gainXp(p,x);
  for(let i=p.level-n+1;i<=p.level;i++){news('<b>'+p.name+'</b> reached level '+i+'.','p');sAlert();}
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
    rew:{c:400,i:2,xp:0.2}},
  intercept:{name:'Intercept Transport',from:'Ferren Halt',need:2,days:3,riskTxt:'Moderate',
    desc:'A Hegemony supply transport crosses the drift with light escort. Kill the escort, board her, take everything that isn’t bolted down.',
    rew:{c:600,s:140,xp:0.15}},
  tanker:{name:'Tanker Grab',from:'Ferren Halt',need:2,days:3,riskTxt:'Moderate',
    desc:'Halt’s manifests were real: a fuel tanker, twice the load, half the escort. Take it whole.',
    rew:{c:320,s:240,xp:0.15}},
  skim:{name:'Escort the Skim',from:'Sen. Vokk',need:2,days:2,riskTxt:'Low',
    desc:'Vokk’s shell-company transfer needs quiet guns for two days. Boring flying, beautiful money.',
    rew:{c:700,xp:0.1}},
  fighters:{name:'Steal Hegemony Fighters',from:'Ferren Halt',need:2,days:3,riskTxt:'High',
    desc:'Pad nine, every third night: two fueled Talons and one bored sentry. Fly one home.',
    rew:{fighter:1,xp:0.2}},
  chart:{name:'Chart the Cordon',from:'Prof. Marr',need:2,days:2,riskTxt:'Low',
    desc:'Fly Marr’s survey corridor and map what the Hegemony thinks is hidden.',
    rew:{i:4,xp:0.1}},
  garrison:{name:'Brakka Garrison Raid',from:'Scout Report · Brakka',need:2,days:2,riskTxt:'Low',
    desc:'Twelve conscripts, one armory, zero enthusiasm. Hit the garrison, empty the racks, be gone by dust-fall.',
    rew:{c:240,s:100,xp:0.12}},
  depotrun:{name:'Cook the Depots',from:'Maro Venn',need:1,days:2,riskTxt:'Low',lead:'space',leadTxt:'Fly it yourself',fighterReq:'starfighter',
    desc:'Four Hegemony fuel depots hang in orbit over Brakka, feeding every patrol that squeezes the frontier. A handful of sentry drones watch them. One fast ship, in and out before anything with a pilot shows up.',
    rew:{i:5,xp:0.2}},
  stealcross:{name:'Steal the Cross',from:'Cass Wender',need:3,days:2,riskTxt:'Moderate',
    lead:'ground',leadTxt:'Fight it on the ground',ground:true,
    desc:'Dustfall keeps one FT-4 Cross on the pad behind the sheriff’s HQ. The FT-4 is built for frontier sheriffs who need something cheap and reliable to deter smugglers and gangs in their turf. When you strap more guns and missiles to it however, it becomes rather useful in a pinch. Sheriff Reeve enforces Hegemony law here. Walk a pilot to the pad and fly it home.',
    rew:{cross:1,c:500,s:120,xp:0.2}},
  orehaul:{name:'Dreymar Ore Heist',from:'Scout Report · Dreymar',need:2,days:3,riskTxt:'Moderate',
    desc:'A company ore barge runs unescorted on payday. The miners will swear they saw nothing.',
    rew:{c:360,s:200,xp:0.15}},
  foundry:{name:'Volund Manifest Job',from:'Scout Report · Volund',need:2,days:3,riskTxt:'High',
    desc:'Freight manifests from the Forge — every convoy, every escort, every gap. Worth more than the steel.',
    rew:{c:480,i:3,xp:0.2}},
};
const SIGNALS={
  halt:[
    {kind:'mission',mid:'toi',text:'“The flight instructor, Vex. Every pilot who’ll ever shoot at you learns it from him — and he runs his little academy over MY yard. Just saying.”'},
    {kind:'mission',mid:'intercept',text:'“A supply transport crosses my sector Thursday. Light escort. I have the schedule, if you have the nerve.”'},
    {kind:'recruit',text:'“There are dockhands here asking the right questions. Want me to point them somewhere?”'},
    {kind:'recruitP',text:'\u201cOne of the yard\u2019s test pilots just got written up for landing too gently. Wants out. Wants to fly something that matters.\u201d'},
    {kind:'cache',text:'“Pallet miscount in bay six. Forty crates of it. Nobody misses what was never counted.”',
     apply(){G.supplies+=160;return 'Recovered '+S(160)+' from bay six. Mira is thrilled.';}},
    {kind:'recruitS',text:'“The tower coordinator got passed over, same as me. He’d run your flight deck better than theirs.”'},
    {kind:'mission',mid:'fighters',text:'“Pad nine, every third night. Two Talons, fueled, and a sentry who reads on shift.”'},
  ],
  vokk:[
    {kind:'credits',text:'“A discretionary fund has been… discreet. Consider it a donation from the Hegemony to itself.”',
     apply(){G.credits+=480;return 'The Senator’s laundering clears '+C(480)+'.';}},
    {kind:'recruitS',text:'“My aide has seen too much to stay and too little to be arrested. Take him before someone else does.”'},
    {kind:'intel',text:'“Committee minutes, pre-redaction. Read them before they don’t exist.”',
     apply(){G.intel+=2;return 'Parliament whispers become '+I(2)+'.';}},
  ],
  marr:[
    {kind:'intel',text:'“The survey satellites blink for six minutes on Thursdays. I may have caused that.”',
     apply(){G.intel+=3;return 'Marr’s blind spot yields '+I(3)+'.';}},
    {kind:'mission',mid:'chart'},
    {kind:'recruitS',text:'“My lab technician asks fewer questions than she answers. She’d be safer with you.”'},
    {kind:'recruitP',text:'\u201cThe Institute\u2019s survey pilots are bored out of their minds. One of them keeps asking what we would pay.\u201d'},
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
const SRCPOS={doran:'parity',brook:'dreymar',ostrander:'callis',varr:'veray',cass:'haven',venn:'brakka',halt:'veray',vokk:'kess',marr:'callis',renn:'meridian',tess:'menk',pell:'ballakan',cask:'parity'};

/* ---------- location model (Security / Access / Support / Liberation) ----------
   Access (0–5 eyes): Intel buys it. Support (0–5 flags): raised by source events.
   Liberation (0–100% per region): local ops add it, capped by the LOWER of the
   Access cap and the Support cap. Tuning values live in ACC_CAP. */
const ACC_CAP=[0,20,40,60,80,100];
const supCol=i=>[K.hegDeep,K.heg,K.steel,K.rebelHi,K.rebel][Math.max(0,Math.min(4,i))];   // low support = Hegemony blue … high = rebel red
const MLOC={toi:'veray',intercept:'veray',tanker:'veray',fighters:'veray',skim:'kess',chart:'callis',
  garrison:'brakka',depotrun:'brakka',stealcross:'brakka',orehaul:'dreymar',foundry:'volund'};
for(const k in MLOC)if(MPOOL[k])MPOOL[k].loc=MLOC[k];
MPOOL.stealcross.region='dustfall';MPOOL.stealcross.lib=10;   // a first foothold, not a liberation
// space combat happens in orbit over a world, never in a region: Cook the Depots has none
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
/* Steal the Strider (Tier 1): free a Strider Mk I and walk it out; it joins the roster as an Auto */
MPOOL.stealstrider={name:'Steal the Strider',from:'Tessaly Brandt',src:'tess',need:3,days:2,riskTxt:'High',
  lead:'ground',ground:true,type:'ground',scenario:'strider',
  loc:'menk',region:'menkcross',lib:15,
  vip:{name:'Strider SK-1',first:'Strider',hp:220,def:8,wpns:['strider'],strider:1},
  req:{team:3,teamRole:'Soldier',transport:1,prize:0},
  desc:'With the Power Plant gone, the Autoworks is shipping its last Strider Mk I out of the Crossing depot. It is parked in a locked holding yard, waiting for a hauler. A robotic mech like that could be reprogrammed to fight for us, if we can steal it and guide it out of there on its own two legs.',
  objectives:['Override the Strider\u2019s leash panel in the holding yard','(Optional) Do it without the enemy realising you were there','Guide the Strider and the squad back to the Marta'],
  rew:{c:450,m:200,xp:0.3},bonus:{c:300},
  after:['<b>BRANDT:</b> \u201cThe whole Crossing came out to watch a Hegemony walker stroll off with a rebel badge on it. The foreman is pretending he was asleep. You have a machine now, Commander. Try not to get it shot.\u201d']};
const typeOf=m=>m.type||(m.ground?'ground':m.lead==='space'?'space':'abstract');
const SEATS={graf:4};     // troop seats per transport
/* ---------- mission types ----------
   A TYPE fixes objectives, requirements, the scenario and the base reward. A mission is a type plus a
   narrative CONTEXT (source, location, region, target variant, NPC). Any source or intelligence lead can
   offer any type, again and again: nothing here is used up by being done once. */
const SPEC_FT={key:'fieldtech',label:'Field Technician',hint:'Missing Field Technician: train a soldier to level 3 and use the Training Center to give them the Field Technician specialty to attempt this mission.'};
const MTYPE_DEFS={
  fuel:{name:'Steal Fuel',scenario:'stealfuel',days:2,riskTxt:'Moderate',lib:10,
    variants:['fuel depot','fuel store','refuelling yard'],
    req:{team:3,teamRole:'Soldier',transport:1,prize:0},
    rew:{f:240,c:300,xp:0.2},
    hook:'The {target} at {place} holds fuel for the whole district, guarded by people who would rather be somewhere else. We could be gone before they finish the paperwork.',
    desc:'We need fuel to keep our ships running and operating. The {target} at {place} is thinly guarded. Get in, call the Marta down onto the apron, hold the pumps while she drinks, and get out before they figure anything out.',
    obj:['Reach the {target} at {place}','Call in the Marta and land her on the apron','Defend her while the tanks fill (5 rounds)','Board and lift off'],
    after:['<b>{SRC}:</b> “Full tanks, and a {target} that will spend a month explaining where the fuel went. Nice work.”']},
  intel:{name:'Steal Intelligence',scenario:'intel',days:2,riskTxt:'Moderate',lib:15,
    variants:['listening post','satellite array','communications array','server farm'],
    req:{team:3,teamRole:'Soldier',transport:1,prize:0,spec:SPEC_FT},
    rew:{c:400,i:6,xp:0.3},
    hook:'The {target} at {place} sees everything the Hegemony says about this district. If somebody who knows what they are doing could crack its databank, we would know what they know.',
    desc:'A covert operation to infiltrate the {target} at {place} could yield valuable intelligence we could turn against the Heggies. Someone who knows their way around a databank has to break in and crack it.',
    obj:['Hack into the Hegemony databanks at the {target}','Extract with the stolen data'],
    after:['<b>{SRC}:</b> “The drive came through. I have been reading for six hours and I cannot stop shaking. There are names in there we can protect. Thank you.”']},
  autofactory:{name:'Blow Up Auto Factory',scenario:'autofactory',days:2,riskTxt:'Moderate',lib:20,
    variants:['Auto Factory','Autoworks','Bot Assembly Plant'],
    req:{team:3,teamRole:'Soldier',transport:1,prize:0,items:[{id:'charge',n:1,label:'Explosive Charge'}]},
    rew:{c:450,m:160,xp:0.2},bonus:{i:2,c:250},
    hook:'Vast local resources are being poured into the {target} at {place}. The whole line runs off one power plant. If somebody had a charge and a little nerve, it would all go dark.',
    desc:'Vast local resources are being poured into building Autos at the {target} in {place}. If we could make it stop doing its thing, we could gain a big advantage in this region. The whole line runs off one Power Plant: plant a charge on the main breaker, get clear, and let the lights go out.',
    obj:['Plant the explosive at the Power Plant’s main breaker','Detonate it from a safe distance','(Optional) Do it without the enemy realising you were there','Board the Marta'],
    after:['<b>{SRC}:</b> “The night shift walked out to watch it burn and nobody went back in. The foreman is asking who gave the orders, and nobody can remember there being any.”']},
  rescue:{name:'Rescue Dissident',scenario:'rescue',days:2,riskTxt:'Moderate',lib:15,npcRole:'Support',
    variants:['security outpost','police station','detention annex'],
    req:{team:3,teamRole:'Soldier',transport:1,prize:0},
    rew:{c:500,xp:0.35},bonus:{i:2},
    hook:'They picked up a voice off the street and put it in the {target} at {place}. A lot of people would follow that voice, and the Hegemony knows it. The place is thin on guards and thick on locks.',
    desc:'{npc} has been arrested and is being held in the {target} at {place}. A voice like theirs has a following, and the Hegemony knows it. If we rescue them, they could add real value to our cause.',
    obj:['Release {npc} from the {target}','(Optional) Do it without the enemy realising you were there','Bring {npc1} and the squad back to the Marta'],
    after:['<b>{SRC}:</b> “{npc} is out, and the whole district knows it by breakfast. Nobody is saying who did it, which is how I know it worked. They will want to meet you.”']},
};
MTYPE_DEFS.towers={name:'Disrupt Comm Towers',scenario:'towers',days:2,riskTxt:'Moderate',lib:15,
  variants:['comm tower'],
  req:{team:3,teamRole:'Soldier',transport:1,prize:0,items:[{ids:['charge','limpet'],n:1,label:'Explosive Charge or Data Limpet'}]},
  rew:{i:5,xp:0.3},
  hook:'The {target} at {place} carries more than it should.',
  desc:'The data we were given puts a {target} at {place}. It is remote, but it is still guarded. Get a device onto its base before they raise the alarm: an Explosive Charge drops it, a Data Limpet leaves it standing and lets us listen.',
  obj:['Reach the {target} at {place}','Attach the device to the tower base','Return to the Marta'],
  after:['<b>{SRC}:</b> \u201cThe tower at {place} has changed. I can hear it in the logs. Two to go.\u201d']};
/* the first, scripted offer of each type keeps its original story context */
const MSTORY={stealfuel:'fuel',rescue:'rescue',autofactory:'autofactory',stealintel:'intel'};
const CTXDEF={
  stealfuel:{src:'cass',loc:'brakka',region:'flats',target:'fuel depot'},
  autofactory:{src:'tess',loc:'menk',region:'kilnridge',target:'Autoworks'},
  rescue:{src:'pell',loc:'ballakan',region:'tollgate',target:'security outpost'},
  stealintel:{src:'cask',loc:'parity',region:'dataflats',target:'server farm'},
};
/* which types a source will offer once its first story job is done */
const SRC_OFFERS={cass:['fuel'],venn:['fuel','rescue'],halt:['fuel','intel'],vokk:['intel'],marr:['intel'],renn:['intel','rescue'],
  tess:['autofactory','fuel','rescue'],pell:['rescue','fuel','intel'],cask:['intel','rescue']};
const hasStory=a=>G.missions.some(m=>m.story===a);
const storyDone=a=>G.missions.some(m=>m.story===a&&m.state==='done');
function missionName(mid){return (MPOOL[mid]||{}).name||(MTYPE_DEFS[MSTORY[mid]]||{}).name||'a new job';}
function srcInfo(id){return G.sources.find(x=>x.id===id)||CANDS[id]||STORY_SRC[id]||null;}
function fillMission(m,str){
  const c=m.ctx||{},sn=(m.srcName||'').split(' ');
  return String(str).replace(/\{npc\}/g,m.npc?m.npc.name:'').replace(/\{npc1\}/g,m.npc?m.npc.first:'')
    .replace(/\{target\}/g,c.target||'target').replace(/\{place\}/g,c.place||'the target')
    .replace(/\{SRC\}/g,(sn[sn.length-1]||'CONTACT').toUpperCase());
}
function spawnMission(tid,ctx){
  const T=MTYPE_DEFS[tid];
  if(!T)return null;
  G.mseq=(G.mseq||0)+1;
  const d=pdef(ctx.loc),reg=d&&d.regions&&ctx.region?d.regions.find(r=>r.id===ctx.region):null;
  const si=ctx.src?srcInfo(ctx.src):null;
  const target=ctx.target||T.variants[Math.floor(rng()*T.variants.length)];
  const sec=d?d.sec:1,k=1+0.12*Math.max(0,sec-1);
  const rew={};
  for(const key in T.rew)rew[key]=(key==='xp'||key==='i')?T.rew[key]:Math.round(T.rew[key]*k);
  const m={id:tid+'_'+G.mseq,tid,story:ctx.story||null,state:'avail',progress:null,name:T.name,
    from:ctx.oppId?'Intelligence · '+(d?d.name:''):(si?si.name:'the network'),srcName:si?si.name:'',src:ctx.src||null,oppId:ctx.oppId||null,
    need:3,days:T.days,riskTxt:sec>=3?'High':T.riskTxt,lead:'ground',ground:true,type:'ground',scenario:T.scenario,
    loc:ctx.loc,region:ctx.region||undefined,lib:Math.max(5,Math.round(T.lib*REV_W.libMul/5)*5),req:JSON.parse(JSON.stringify(T.req)),rew,bonus:T.bonus,
    npcRole:T.npcRole,ctx:{target,place:reg?reg.name:(d?d.name:'the target'),locName:d?d.name:'',sec}};
  m.tpl={desc:T.desc,obj:T.obj,after:T.after};
  if(T.npcRole)m.npc=holdRecruit(T.npcRole);
  bindNpc(m);
  return m;
}
function pushMission(m,quiet){
  if(!m)return null;
  G.missions.splice(G.missions.length-1,0,m);
  news('Mission available: <b>'+m.name+'</b> ('+m.from+').','a');
  if(!quiet){G.misPopQ=G.misPopQ||[];G.misPopQ.push(m.id);sAlert();}
  return m;
}
/* where a source's next job is: its own world if it has regions, otherwise any accessible world that does */
function offerCtx(src){
  let d=pdef(SRCPOS[src.id]||'haven');
  if(!d||!d.regions||!pst(d.id)||!pst(d.id).access){
    const opts=PLANETDEF.filter(x=>x.regions&&pst(x.id)&&pst(x.id).access);
    if(!opts.length)return null;
    d=opts[Math.floor(rng()*opts.length)];
  }
  const st=pst(d.id);
  const reg=pickRegion(d,st)||d.regions[0];
  return {src:src.id,loc:d.id,region:reg.id};
}
/* the front line has momentum: new work tends to land in the region we are already winning,
   unless Access or Support already caps it */
function pickRegion(d,st){
  const lib=r=>(st.lib&&st.lib[r.id])||0,cap=Math.min(100,locCap(st));
  const open=d.regions.filter(r=>lib(r)<100);
  const room=open.filter(r=>lib(r)<cap);
  const pool=room.length?room:open;
  if(!pool.length)return null;
  if(pool.length>1&&rng()<REV_W.momentum)return pool.slice().sort((a,b)=>lib(b)-lib(a))[0];
  return pool[Math.floor(rng()*pool.length)];
}
function makeOffer(src){
  const types=(SRC_OFFERS[src.id]||[]).filter(t=>!G.missions.some(m=>m.src===src.id&&m.tid===t&&(m.state==='avail'||m.state==='prog')));
  if(!types.length)return null;
  const tid=types[Math.floor(rng()*types.length)],T=MTYPE_DEFS[tid];
  const ctx=offerCtx(src);
  if(!ctx)return null;
  ctx.target=T.variants[Math.floor(rng()*T.variants.length)];
  const d=pdef(ctx.loc),reg=d.regions.find(r=>r.id===ctx.region);
  const text='“'+T.hook.replace(/\{target\}/g,ctx.target).replace(/\{place\}/g,reg.name)+'”';
  return {kind:'offer',tid,ctx,text};
}

MPOOL.tanker.rew.f=240;MPOOL.intercept.rew.m=100;MPOOL.orehaul.rew.m=180;MPOOL.foundry.rew.m=120;MPOOL.garrison.rew.m=80;
for(const d of PLANETDEF)if(d.regions)for(const r of d.regions)if(r.op){
  MPOOL['op_'+d.id+'_'+r.id]={name:r.op.name,from:'Local network · '+d.name,need:2,days:2,
    riskTxt:d.sec>=3?'Moderate':'Low',desc:r.op.desc,rew:{c:r.op.c*4,s:(r.op.s||0)*4,xp:0.12},loc:d.id,region:r.id,lib:20,
    objectives:['Reach the target in '+r.name,'Strike, then get clear'],type:'abstract'};
}
const OPX={op_menk_saltreach:{m:120},op_menk_kilnridge:{m:140},op_ballakan_canopy:{m:180},op_ballakan_sawmill:{m:120},op_brakka_flats:{m:100}};
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
  cass:{id:'cass',name:'Cass Wender',type:'Smuggler · Freight',loc:'the Drift',level:1,cult:20,risk:20,inc:{s:16},
    bio:'Flew you in and didn’t ask questions. Knows every pad, every price, and every sheriff’s bad habit between here and the core.'},
  venn:{id:'venn',name:'Maro Venn',type:'Cantina Keeper · The Dry Comet',loc:'Dustfall, Brakka',level:1,cult:30,risk:15,inc:{c:48},
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
  halt:{id:'halt',name:'Ferren Halt',type:'Officer · Depot Manager',loc:'Veray Yards',level:1,cult:35,risk:55,inc:{s:24},
    bio:'Passed over for promotion twice. Wants the yards to burn, quietly — as long as nobody sees him hold the match.',
    pitch:'<b>Ferren Halt</b> manages the Veray fuel yards and heard what happened to the Brakka depots. He was passed over for promotion twice, and he wants in — quietly, expensively, usefully.'},
  vokk:{id:'vokk',name:'Sen. Adria Vokk',type:'Politician',loc:'via Relay Kess',level:1,cult:20,risk:15,inc:{c:100},
    bio:'Votes loyal, funds otherwise. Terrified of audits.',
    pitch:'<b>Senator Adria Vokk</b> votes loyal and funds otherwise. Her courier found ours at Relay Kess with a first payment and one condition: no one ever says her name aloud.'},
  marr:{id:'marr',name:'Prof. Etta Marr',type:'Scientist',loc:'Callis Institute',level:1,cult:10,risk:20,inc:{i:1},
    bio:'Astrophysicist with cordoned-sector clearance and a brother in a labor camp.',
    pitch:'<b>Prof. Etta Marr</b>, astrophysicist, Callis Institute. Cordoned-sector clearance, a brother in a labor camp, and a dead drop that found us the day we got eyes on Callis. She’s offering hers.'},
  renn:{id:'renn',name:'Customs Chief Renn',type:'Officer · Customs',loc:'Meridian Docks',level:1,cult:15,risk:30,inc:{c:120},
    bio:'Skims the skimmers at the Capital’s docks. Now skims for us.',
    pitch:'<b>Customs Chief Renn</b> runs Meridian’s freight inspections and a private retirement fund. Our scouts caught the fund. He’d rather pay us than the auditors.'},
};
STORY_SRC.cass.inc.f=8;CANDS.halt.inc.f=12;
CANDS.tess={id:'tess',name:'Tessaly Brandt',type:'Union Steward · Saltreach',loc:'Saltreach, Menk',level:1,cult:15,risk:25,inc:{s:20},
  bio:'Runs the quarry workers’ mutual-aid fund out of a crawler cab. Has buried more friends than she can name.',
  pitch:'<b>Tessaly Brandt</b> stewards an illegal mutual-aid fund in the Saltreach pits. Her crews have heard rumours of a rebellion and want to know if it’s real. She would like to be the first to find out.'};
CANDS.pell={id:'pell',name:'Orrin Pell',type:'Harbourmaster · Tollgate Landing',loc:'Tollgate Landing, Ballakan',level:1,cult:20,risk:15,inc:{c:60},
  bio:'Collects tolls for the Hegemony and forgets half of them. Knows every barge clan by name.',
  pitch:'<b>Orrin Pell</b> runs the tollgate at Tollgate Landing and quietly loses about a third of what he collects. A rebellion that remembers him kindly would be worth more than the tolls.'};
CANDS.cask={id:'cask',name:'Registrar Ione Cask',type:'Registry Clerk · Ledger Town',loc:'Ledger Town, Parity IV',level:1,cult:10,risk:35,inc:{i:1},
  bio:'Files the files. Has read every one. Hasn’t slept properly since she found the quota schedules.',
  pitch:'<b>Ione Cask</b> is a registry clerk with access to every name on Parity IV and a conscience she has just discovered. She has copied something. She would like to talk about what happens next.'};
CANDS.tess.inc.m=12;CANDS.pell.inc.m=12;
/* the other source types from the Sources doc: CEO, Professor, Double Agent (the Engineer arrives through a chain) */
CANDS.brook={id:'brook',name:'Director Ansel Brook',type:'CEO \u00b7 Deep Mining Concern',loc:'Dreymar',level:1,cult:10,risk:30,inc:{c:140},
  bio:'Runs the Dreymar Deep Mining Concern for a board that has never seen a mine. Has been quietly passed over for a rival, and keeps a list.',
  pitch:'<b>Ansel Brook</b> runs the Deep Mining Concern on Dreymar and would very much like his rival ruined. He will fund anybody who can do it without leaving fingerprints.'};
CANDS.ostrander={id:'ostrander',name:'Prof. Nell Ostrander',type:'Professor \u00b7 Callis Academy',loc:'Callis Academy',level:1,cult:10,risk:15,inc:{i:1},
  bio:'Teaches the children of the privileged and has been listening to what they repeat at the dinner table.',
  pitch:'<b>Nell Ostrander</b> teaches at the Callis Academy for privileged children. The children repeat what their parents say at dinner. She has been writing it all down.'};
CANDS.varr={id:'varr',name:'Constable Iko Varr',type:'Double Agent \u00b7 Dock Police',loc:'Veray Yards',level:1,cult:10,risk:40,inc:{s:28},
  bio:'Sworn to the Hegemony, paid by both sides. Reports to us first.',
  pitch:'<b>Iko Varr</b> is a Hegemony dock constable who has been selling patrol schedules to smugglers for years. He heard we were buying better, and would like to know which side he is on.'};
for(const k in SRCPOS){const o=CANDS[k]||STORY_SRC[k];if(o)o.locId=SRCPOS[k];}
SRC_EVENTS.doran=[
  {text:'<b>DORAN:</b> \u201cThe SHOK squad rotated out and a new one rotated in. They have a very particular opinion of my coffee. I think they are measuring me for a cell.\u201d',
   opts:[['\u201cThen keep making it. Be the most boring man on Parity IV, and let us worry about the rest.\u201d','strong'],['\u201cStay low.\u201d','neutral'],['\u201cThen get out. Leave the towers.\u201d','weak']]},
  {text:'<b>DORAN:</b> \u201cThe Bureau rebuilt a relay faster than I thought they could. Somebody is learning from us.\u201d',
   opts:[['\u201cThen we move faster, Hale. Tell me where they are weak.\u201d','strong'],['\u201cWatch and report.\u201d','neutral'],['\u201cYou should have stopped them.\u201d','weak']]},
];
SRC_OFFERS.doran=['autofactory','intel'];
SRC_OFFERS.brook=['autofactory','fuel'];SRC_OFFERS.ostrander=['intel'];SRC_OFFERS.varr=['fuel','rescue'];
CANDS.doran={id:'doran',name:'Hale Doran',type:'Engineer \u00b7 Signals Authority',loc:'Parity IV',locId:'parity',level:1,cult:10,risk:40,inc:{m:16},
  bio:'A line engineer who maintains the Parity relay towers and finally read what they carry. Frightened, precise, and out of time.'};

/* ---------- sources as quest chains (authored, location-tied, multi-mission) ----------
   A chain is a unique source tied to a world. Steps run in order:
     alert    a lead the player may answer (yes / not yet)
     contact  the source's first transmission; acknowledging adds them to the network
     decode   wait N days, then a branching choice (each choice may hand over items)
     missions spawn one instance of a mission type per listed region; done when all are done
     checkin  the source's next check-in, answered like any source event; the ending depends on how the missions went */
const CHAINS={
  parity_towers:{
    name:'The Listening Towers',loc:'parity',src:'doran',trigger:{acc:2},
    steps:[
      {k:'alert',title:'A voice on the Signals Authority channel',
       text:['Your Intelligence Officer slides a printout across the table.',
        '\u201cCommander, one of our listeners on <b>Parity IV</b> caught a hand-keyed request on a Signals Authority maintenance channel. It is addressed to \u2018the ones standing up\u2019. The sender is a line engineer, mid-level, and the channel is monitored. If we answer, we risk being heard answering.\u201d'],
       yes:'Make contact. Carefully.',no:'Not yet. Let them wait.'},
      {k:'contact',title:'Incoming transmission',
       text:['\u201cYou will not trust me. I would not trust anyone from the Signals Authority either, which is why I am calling you.\u201d',
        'The voice goes quiet. Static, then a rattle that might be a coffee cup.',
        '\u201cEvery census packet on Parity IV, every labour roster, every name on every quota block \u2014 it all runs through three relay towers, and the Bureau reads it before the clerks do. I maintain them. I have maintained them for eleven years, and only learned last spring what I was maintaining.\u201d',
        'Somewhere behind him a door opens and closes.',
        '\u201cI cannot take them down. There is a SHOK squad billeted in the compound since last month, and they drink all the tea. But I can show you where to climb. Please. My daughter is on Quota Block 9 and her name is on the schedule.\u201d',
        'A burst of encoded data follows. It will take our people about three days to decode.'],
       ok:'Acknowledge. Start the decode.'},
      {k:'decode',days:3,title:'The decode is back',
       text:['Your Intelligence Officer comes out of a dark room full of tired-looking people.',
        '\u201cThey found coordinates inside Doran\u2019s data. Three relay towers: one outside <b>Ledger Town</b>, one on the <b>Data Flats</b>, one by the <b>Quota Blocks</b>. All three carry the Bureau\u2019s census feed.\u201d',
        '\u201cOne of the team wants to clamp a data limpet on each, sit on the feed and read it. The rest say blow them, and make the Bureau deaf. Doran would take either.\u201d'],
       choices:[
        ['\u201cWe are here to make life hell for the Hegemony. We blow the towers.\u201d','blow','Three Explosive Charges, cobbled together from the decode lab\u2019s spare parts.',{items:['Explosive Charge','Explosive Charge','Explosive Charge']}],
        ['\u201cThere is more in those feeds than a bang. We tap them.\u201d','hack','Three Data Limpets, still warm from the lab.',{items:['Data Limpet','Data Limpet','Data Limpet']}]]},
      {k:'missions',tid:'towers',regions:['ledger','dataflats','quota'],news:'Three towers, three jobs on the board: Ledger Town, the Data Flats and the Quota Blocks.'},
      {k:'checkin',
       text:{
        blow:'<b>DORAN:</b> \u201cThe census feed went dark across the planet for two days. Nobody in Ledger Town could say how many people lived there. The Bureau will rebuild, but for a week they are guessing. Use the week.\u201d',
        hack:'<b>DORAN:</b> \u201cI have been reading the Bureau\u2019s mail for three days and I have never felt so frightened or so useful. The towers are still up. They have no idea we are in the room.\u201d'},
       opts:[['\u201cYou did this, Hale. Tell me what you want, and tell me who is on that schedule.\u201d','strong'],['\u201cWell done. Keep your head down.\u201d','neutral'],['\u201cDon\u2019t get comfortable. We will want more.\u201d','weak']],
       end:{blow:{intel:5,support:1,line:'The census blackout shakes Parity IV: <b>Support +1</b>, and a quiet <b>5 Intel</b> from the confusion.'},
            hack:{intel:3,income:{i:2},line:'The taps pay out: <b>3 Intel</b> now, and Doran\u2019s source now brings in <b>+2 Intel a day</b>.'}}},
    ]},
};
const chainState=id=>(G.chains||(G.chains={}))[id];
const chainSrc=id=>G.sources.find(x=>x.id===CHAINS[id].src);
const chainMissions=id=>G.missions.filter(m=>m.chain===id);
function chainTick(){
  G.chains=G.chains||{};
  for(const id in CHAINS){
    const C=CHAINS[id],c=G.chains[id];
    if(!c){
      const st=pst(C.loc);
      if(st&&st.access&&(st.acc||0)>=(C.trigger.acc||1)&&G.day>=(C.trigger.day||1)){
        G.chains[id]={i:0,show:true,flags:{},snooze:0,wait:0};
        news('<b>'+pdef(C.loc).name+'</b>: someone on the ground is trying to reach us.','a');sAlert();
      }
      continue;
    }
    if(c.done)continue;
    const step=C.steps[c.i];
    if(step.k==='alert'&&!c.show&&c.snooze&&G.day>=c.snooze){c.show=true;c.snooze=0;}
    if(step.k==='decode'&&c.wait>0){c.wait--;if(c.wait<=0){c.show=true;news('The decode for <b>'+C.name+'</b> is ready.','a');sAlert();}}
    if(step.k==='missions'){
      const ms=chainMissions(id);
      if(ms.length&&ms.every(m=>m.state==='done'))chainAdvance(id);
    }
  }
}
function chainPrompt(){
  if(!G||!G.chains||winMode)return false;
  for(const id in G.chains){const c=G.chains[id];if(c.show&&!c.done){openWin('chain',{id});return true;}}
  return false;
}
function chainEnter(id){
  const C=CHAINS[id],c=G.chains[id],step=C.steps[c.i];
  if(step.k==='decode'){c.wait=step.days;c.show=false;}
  else if(step.k==='missions'){
    c.show=false;
    const si=srcInfo(C.src);
    for(const reg of step.regions){
      const m=pushMission(spawnMission(step.tid,{loc:C.loc,region:reg,src:C.src,story:'chain:'+id}),true);
      if(m){m.chain=id;c.mids=(c.mids||[]).concat(m.id);m.from=(si?si.name:'')+' \u00b7 '+C.name;}
    }
    news(step.news||'New jobs on the board.','a');sAlert();
  }
  else if(step.k==='checkin'){
    c.show=false;
    const src=chainSrc(id);
    const meth=chainMissions(id).map(m=>m.method).filter(Boolean);
    c.flags.ending=meth.filter(x=>x==='limpet').length>=2?'hack':(meth.length?'blow':(c.flags.stance||'blow'));
    if(src){
      src.pendingEvent={text:step.text[c.flags.ending],opts:step.opts,chain:id};
      news('<b>'+src.name+'</b> wants to talk. The towers are done.','a');sAlert();
    }
  }
}
function chainAdvance(id){
  const c=G.chains[id];
  c.i++;
  if(c.i>=CHAINS[id].steps.length){c.done=true;return;}
  chainEnter(id);
}
function chainAct(id,act,idx){
  const C=CHAINS[id],c=G.chains[id];
  if(!c||c.done)return;
  const step=C.steps[c.i];
  if(step.k==='alert'){
    if(act==='no'){c.show=false;c.snooze=G.day+3;closeWin();return;}
    chainAdvance(id);
    renderWin();return;      // the contact window follows straight away
  }
  if(step.k==='contact'){
    const full=G.sources.filter(x=>x.alive).length>=sourceCap();
    if(full){return;}
    const def=Object.assign({},CANDS[C.src]);
    if(!G.sources.some(x=>x.id===C.src))G.sources.push(Object.assign({alive:true,visited:false,contacted:false,pendingEvent:null,eventsSeen:0,signal:null,sigIdx:0,unique:true,chain:id},JSON.parse(JSON.stringify(def))));
    news('<b>'+def.name+'</b> joins the network.','g');
    chainAdvance(id);
    closeWin();syncUI();return;
  }
  if(step.k==='decode'){
    const ch=step.choices[idx];
    if(!ch)return;
    c.flags.stance=ch[1];
    const gift=ch[3]||{};
    for(const it of (gift.items||[]))addArmoryItem(it);
    news(ch[2],'g');
    chainAdvance(id);
    closeWin();syncUI();return;
  }
}
function chainResolve(id,kind){
  const C=CHAINS[id],c=G.chains[id],step=C.steps[c.i];
  const end=step.end[c.flags.ending]||{};
  const src=chainSrc(id),lines=[];
  if(end.intel){G.intel+=end.intel;}
  if(end.support)addSupport(C.loc,end.support);
  if(end.income&&src)for(const k in end.income)src.inc[k]=(src.inc[k]||0)+end.income[k];
  if(end.line)lines.push(end.line);
  c.done=true;c.i=C.steps.length;
  revGain(REV_W.chain);
  news('<b>'+C.name+'</b> is complete.','g');
  return lines;
}

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
  Soldier:[['Tam Reyes','Loader by day. Angry always.'],['Vess Okoro','Talks little, hits precisely.'],['Juno Falk','Stole her first crawler at twelve.'],
    ['Brix Halloran','Dockyard foreman with a temper and a very good left hook.'],['Nima Sol','Ran salt for a smuggler ring until the ring ran out.'],
    ['Corvan Pike','Ex-militia, discharged for telling a captain where to put his orders.'],['Dessa Wray','Herder’s daughter. Can hit a moving crawler at four hundred paces.'],['Ruck Andel','Lost his shop to a Hegemony levy. Kept the shotgun.']],
  Support:[['Mira Osk','Quartermaster. Counts every bolt twice.'],['Odo Fenn','Ran a Hegemony flight tower for nine years. Defected with the manuals.'],['Aide Corso','Knows which forms make things disappear.'],['Tela Bryn','Lab tech. Fixes what she’s told is unfixable.'],
    ['Prof. Ishe Quell','Banned from three universities for asking the wrong questions in the right order.'],['Dov Areth','Pamphleteer. Has been arrested twice and printed both times.'],['Pia Sunde','Union organiser. Knows how to get two hundred people to do one thing quietly.'],
    ['Yusef Lorne','Registry clerk who read everything he was supposed to file.'],['Dr. Halla Maro','Physician struck off for treating the wrong patients.']],
  Pilot:[['Kito Vale','Crop-duster, grounded for flying under a Hegemony bridge. Twice.'],['Ansa Pryor','Ferry pilot with a thousand hours and zero patience for protocol.'],['Roan Tideway','Ex-patrol cadet who left the day they asked him to fire on a barge.'],
    ['Lise Harrow','Salvage hauler. Can set down a freighter on a cargo pad the size of a tablecloth.'],['Dmitri Okun','Racing circuit washout. Fast, rude, and very good.'],['Sable Quinn','Smuggler\u2019s co-pilot. Knows every back channel in the drift.']],
};
/* the recruit pool: anyone we offer, hold for a mission, or rescue comes out of here, once */
function drawRecruit(role){
  G.poolHeld=G.poolHeld||[];
  const names=new Set(G.people.map(p=>p.name));
  return (RECRUITS[role]||[]).find(r=>!names.has(r[0])&&!G.poolHeld.includes(r[0]))||null;
}
function holdRecruit(role){
  G.poolHeld=G.poolHeld||[];
  const r=drawRecruit(role);
  if(!r){   // the authored names are used up: generate one nobody has met
    const taken=new Set(G.people.map(p=>p.name).concat(G.poolHeld));
    const g=Rebel.gen(role,taken,rng);
    G.poolHeld.push(g.name);
    return g;
  }
  if(!G.poolHeld.includes(r[0]))G.poolHeld.push(r[0]);
  const s=Rebel.split(r[0]);
  return {name:r[0],first:s.first,last:s.last,role,bio:r[1]};
}
function bindNpc(m){
  if(m.tpl){
    m.desc=fillMission(m,m.tpl.desc);
    m.objectives=m.tpl.obj.map(x=>fillMission(m,x));
    m.after=(m.tpl.after||[]).map(x=>fillMission(m,x));
    return;
  }
  const t=MPOOL[m.id];
  if(!t||!m.npc)return;
  const sub=x=>String(x).replace(/\{npc\}/g,m.npc.name).replace(/\{npc1\}/g,m.npc.first);
  m.desc=sub(t.desc);
  if(t.objectives)m.objectives=t.objectives.map(sub);
  if(t.after)m.after=t.after.map(sub);
}

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
  if(src.id==='cask'&&!hasStory('stealintel')){
    src.signal={kind:'mission',mid:'stealintel',text:'\u201cThe Data Flats farm holds the registry backups: every name, every quota, every dissident file. There is a fence, some Policebots, and a terminal bank in the east hall that nobody patrols at night. You will need someone who can actually crack a databank.\u201d'};
    return true;
  }
  if(src.id==='pell'&&!hasStory('rescue')){
    src.signal={kind:'mission',mid:'rescue',text:'\u201cThey picked up a voice off the river last night and put it in the tollgate lockup. A lot of barge clans would follow that voice, and the Hegemony knows it. The outpost is thin on guards and thick on locks. If someone could open one, I would make sure nobody saw a thing.\u201d'};
    return true;
  }
  if(src.id==='tess'&&!hasStory('autofactory')){
    src.signal={kind:'mission',mid:'autofactory',text:'\u201cThe Autoworks at Kiln Ridge runs off one power plant. One. If somebody had a charge and a little nerve, the whole line would go dark. Half my crews have cousins inside. We would rather they were out of work than out of luck.\u201d'};
    return true;
  }
  if(src.id==='cass'&&G.postDepot&&!hasStory('stealfuel')){
    src.signal={kind:'mission',mid:'stealfuel',
      text:'“Your ships are drinking more than my friends do. Redrock Flats, east of Dustfall: the herders’ fuel tithe all ends up in one depot with a pump house and a bored guard detail. Call your hauler down on their apron and let her drink.”'};
    return true;
  }
  if(src.id==='tess'&&storyDone('autofactory')&&!G.missions.some(m=>m.id==='stealstrider')){
    src.signal={kind:'mission',mid:'stealstrider',
      text:'\u201cThe Autoworks is shutting down for repairs, and they are moving the last Strider out through the Crossing depot. Nobody thinks the thing needs a proper guard; it is bigger than the guards. If somebody can get to its leash panel, it will walk wherever you tell it.\u201d'};
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
  const pool=SIGNALS[src.id]||[];
  if(pool.length&&rng()<0.35+0.12*src.level){
    const sig=pool[src.sigIdx%pool.length];
    src.sigIdx++;
    src.signal=Object.assign({},sig);
    if(sig.kind==='mission'&&!sig.text)src.signal.text='“I have something. Too big for a dead drop. Come find out.”';
    return;
  }
  // now and then a source points us at people who want to fight (only while there is a bunk for them)
  if(rng()<0.16&&bunksUsed()<bunkCap()){
    const K=[['recruit','\u201cSome of my people have had enough of the Hegemony. They know which end of a rifle is which. Shall I send them your way?\u201d'],
      ['recruit','\u201cA few dockhands asked the right questions today. Better they ask you than the sheriff.\u201d'],
      ['recruitS','\u201cThere is someone here with a very good memory and a very bad employer. I think they would be safer with you.\u201d'],
      ['recruitP','\u201cA freight pilot told me, three drinks in, that she would rather fly for us. I believed her.\u201d']];
    const k=K[Math.floor(rng()*K.length)];
    src.signal={kind:k[0],text:k[1]};
    return;
  }
  // after the story jobs, a source can offer any type it is able to, again and again
  if(rng()<0.35+0.1*src.level){const off=makeOffer(src);if(off)src.signal=off;}
}
function followSignal(src){
  const sig=src.signal;
  src.signal=null;
  if(!sig)return '';
  if(sig.kind==='mission'){
    const nm=addMission(sig.mid);
    let txt='New mission on the board: <b>'+missionName(sig.mid)+'</b>'+(nm&&nm.ctx?' ('+nm.ctx.place+')':'')+'.';
    if(sig.mid==='stealcross'&&(G.onboard==='revealed'||G.onboard==='contact')){
      G.onboard='pilotwait';
      txt+=' One catch — the plan needs two pilots and we have one. Cass is already asking around; give him a day.';
    }
    if(sig.mid==='depotrun')G.onboard='done';
    return txt;
  }
  if(sig.kind==='offer'){
    const nm=pushMission(spawnMission(sig.tid,sig.ctx));
    return nm?'New mission on the board: <b>'+nm.name+'</b> ('+nm.ctx.place+').':'';
  }
  return sig.apply?sig.apply():'';
}
function openRecruitOffer(src,sig){
  let p,must=false,line;
  if(sig.kind==='recruitSera'){
    must=true;
    p=Rebel.migrate({id:'sera',name:'Sera Kest',role:'Pilot',level:2,xp:0.3,assign:'rest',injured:0,ship:'',
      bio:'Ex-Hegemony survey pilot. Defected after Callis Reach; hasn’t missed a launch since.'});
    line='Cass’s freighter is inbound. On the ramp, one bag over her shoulder: your new pilot.';
  } else {
    const role=sig.kind==='recruit'?'Soldier':sig.kind==='recruitP'?'Pilot':'Support';
    const nm=holdRecruit(role);
    p=Rebel.migrate({id:'rec'+(G.recruitN+1),name:nm.name,first:nm.first,last:nm.last,charTrait:nm.charTrait,role,level:1,xp:0,assign:'rest',injured:0,bio:nm.bio});
    if(role==='Soldier')p.equip=['pistol'];
    if(role==='Pilot')p.ship='';
    line=src.name.split(' ')[0]+' vouches for them. The rest is your call.';
  }
  openWin('recruit',{p,must,line});
}
function addMission(mid,quiet){
  if(MSTORY[mid]){
    if(hasStory(mid))return null;
    return pushMission(spawnMission(MSTORY[mid],Object.assign({story:mid},CTXDEF[mid])),quiet);
  }
  if(G.missions.some(m=>m.id===mid))return null;
  const m=Object.assign({id:mid,state:'avail',progress:null},MPOOL[mid]);
  if(m.npcRole){m.npc=holdRecruit(m.npcRole);bindNpc(m);}
  return pushMission(m,quiet);
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
  {
    G.upq=G.upq||[];
    for(const u of G.upq)u.days--;
    for(const u of G.upq.filter(x=>x.days<=0))for(const id of u.ids){
      const rm=G.rooms.find(r=>r.id===id);
      if(rm){rm.up=rm.up||[];if(!rm.up.includes(u.k))rm.up.push(u.k);}
      if(id===u.ids[0]){const d=(UPGRADES[u.key]||[]).find(x=>x.k===u.k);news('<b>'+(d?d.n:'Upgrade')+'</b> finished in the '+ROOMS[u.key].name+'.','g');sBuild();}
    }
    G.upq=G.upq.filter(u=>u.days>0);
    G.dip=G.dip||[];
    for(const t of G.dip)t.days--;
    for(const t of G.dip.filter(x=>x.days<=0))finishDip(t);
    G.dip=G.dip.filter(t=>t.days>0);
    chainTick();
  }
  const rate=((hasRoom('workshop')?(staffOf('workshop').length?15:8):5)+(staffOf('hangar').length?4:0)+(hangarUp('arm')?5:0))*(staffHas('workshop','mechanic')?1.15:1);
  G.fuel+=4;   // the old hangar-cave tanks weep a little every day
  const repCost=staffOf('store').length?4:8;
  const worst=hangarUp('mbay')?G.fighters.filter(f=>!f.out&&f.hull<100).sort((a,b)=>a.hull-b.hull)[0]:null;
  for(const f of G.fighters){
    if(f.out||f.hull>=100)continue;
    if(G.materials>=repCost){G.materials-=repCost;f.hull=Math.min(100,f.hull+rate+(f===worst?10:0));}
  }
  patrolTick();
  specTick();
  const xpRate=staffOf('training').length?0.09:0.06;
  moraleTick();
  for(const p of G.people){
    if(p.injured>0){
      Rebel.moraleBump(p,-0.5,'injury');
      p.injured-=((hasRoom('infirmary')&&medStaff().length)?2:1)+((p.role==='Soldier'&&staffOf('barracks').length)?1:0)+(hasRoom('infirmary')?(staffHas('infirmary','medic')?1:0)+(staffHas('infirmary','doctor')?2:0):0);
      if(p.injured<=0){p.injured=0;news(p.name+' is back on their feet.','g');}
      continue;
    }
    if(p.assign==='train'&&hasRoom('training'))gainXp(p,xpRate);
    if(p.assign==='rest')Rebel.moraleBump(p,upAny('barracks','rec')?0.6:0.3,'rest');
  }
  mood();
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
      moraleAll(-6,'loss');
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
  if(hasRoom('comms')&&staffOf('comms').length)G.intel+=tilesOf('comms');
  else if(hasRoom('comms'))news('The Intelligence Center hums to nobody. Assign a Signals Operator or it’s just furniture.','d');
  {
    const cass2=G.sources.find(x=>x.id==='cass'&&x.alive);
    if(cass2&&G.postDepot&&!cass2.signal&&!hasStory('stealfuel')&&storySignal(cass2)){
      news('<b>Cass Wender</b> is on the wire again: he has a fuel job.','a');sAlert();
    }
    const tess2=G.sources.find(x=>x.id==='tess'&&x.alive);
    if(tess2&&!tess2.signal&&!G.missions.some(m=>m.id==='stealstrider')&&storySignal(tess2)){
      news('<b>Tessaly Brandt</b> is on the wire: the Autoworks is moving something big.','a');sAlert();
    }
  }
  genOpportunities();
  for(const m of G.missions){
    if(m.state!=='prog')continue;
    m.progress.daysLeft--;
    if(m.progress.daysLeft<=0)resolveMission(m);
    else news(m.name+' — strike team checks in. '+m.progress.daysLeft+' day'+(m.progress.daysLeft>1?'s':'')+' out.','d');
  }
  const newAttn=G.sources.find(x=>x.alive&&(x.pendingEvent||x.signal)&&!attn0.has(x.id));
  if(newAttn){flashMsg('<b>'+newAttn.name+'</b> wants to talk','friend');sAlert();}
  const FLAVOR=[
    'Hegemony patrols double in the drift. Coverage halves. Typical.',
    'A Hegemony cadet washed out and deserted. The stories he tells about his instructor are worth listening to.',
    'Grain barges late at the Capital again. Queues breed questions. Good.',
    'Mira recounts the storeroom. Finds three bolts missing. Opens an investigation into herself.',
    'Someone painted our mark on a water tower two systems over. Wasn’t us. That’s the point.',
  ];
  if(rng()<0.5)news(FLAVOR[Math.floor(rng()*FLAVOR.length)],'d');
  showDayBanner();
  sDay();
  if(!HOLD)chainPrompt();
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
  m.progress={daysLeft:missionDays(m),pilots:pilots.map(p=>p.id),fighters:ships.map(f=>f.id)};
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
/* ---------- specialties (Training Center) ----------
   At level 3 a soldier or pilot can train into a specialty. Only some have effects yet. */
const SPECS={
  Soldier:[
    {k:'fieldtech',n:'Field Technician',live:1,d:'Sets up field tech, hacks terminals and technical objectives.'},
    {k:'vanguard',n:'Vanguard',live:1,d:'Expert in all small arms: +1 aim.'},
    {k:'gunner',n:'Gunner',d:'Heavy, portable or fixed weaponry such as machine guns.'},
    {k:'commando',n:'Commando',d:'Stealth, attacking from stealth and evading attacks.'},
    {k:'assault',n:'Assault',d:'Projectile explosive, anti-vehicle and anti-ship weapons.'},
    {k:'medic',n:'Combat Medic',d:'Healing and reviving downed squad mates.'},
    {k:'demolitions',n:'Demolitions Specialist',d:'Explosives in missions and for specific objectives.'},
    {k:'marksman',n:'Marksman',d:'Long-range ballistic and plasma weaponry.'},
    {k:'commander',n:'Commander',d:'Bonuses for the rest of the mission team.'},
    {k:'driver',n:'Driver',d:'Handling vehicles.'},
  ],
  Pilot:[
    {k:'dogfighter',n:'Dogfighter',live:1,d:'Combat with other starfighters: +1 aim.'},
    {k:'leader',n:'Leader',d:'Synergy bonuses for every ship in the wing.'},
    {k:'bomber',n:'Bomber',d:'Bombs and the ships that carry them.'},
    {k:'firesupport',n:'Fire Support',d:'Enhanced fire support for ground allies.'},
    {k:'flighteng',n:'Flight Engineer',d:'Technical buffs to their ship and others.'},
    {k:'shipbuster',n:'Shipbuster',d:'Torpedoes and attacks on fixed points.'},
  ],
};
const SPEC_DAYS=3;
const SPECNAME={};for(const r in SPECS)for(const x of SPECS[r])SPECNAME[x.k]=x.n;
const specRole=p=>(p.role==='Pilot'?'Pilot':(p.role==='Soldier'||p.role==='Marine')?'Soldier':null);
const specOf=p=>p.spec?SPECNAME[p.spec]:'';
const inTraining=role=>G.people.find(p=>p.assign==='spec'&&specRole(p)===role);
function startSpec(pid,k){
  const p=G.people.find(x=>x.id===pid);
  if(!p||!hasRoom('training'))return;
  const role=specRole(p);
  if(!role||p.level<3||p.spec||p.injured||p.assign==='mission'||inTraining(role))return;
  const sp=SPECS[role].find(x=>x.k===k);
  if(!sp||!sp.live||G.credits<SPEC_COST)return;
  G.credits-=SPEC_COST;
  p.assign='spec';p.specTrain={k,days:SPEC_DAYS};
  news('<b>'+p.name+'</b> begins <b>'+sp.n+'</b> training, '+SPEC_DAYS+' days.','a');
  sBuild();saveSnap();syncUI();renderWin();
}
/* the daily pulse of morale: the desperate leave, the rest drift back toward steady, charisma spreads */
function moraleTick(){
  const charm=crewOf().filter(p=>Rebel.has(p,'charismatic')&&!p.injured&&p.assign!=='mission');
  for(const p of crewOf().slice()){
    if(p.morale===undefined)p.morale=Rebel.MORALE_START;
    if(p.morale<=0&&p.assign!=='mission'){
      G.people=G.people.filter(x=>x!==p);
      news('<b>'+p.name+'</b> has had enough and walks out of the revolution. Their bunk is empty by morning.','h');
      for(const q of crewOf())Rebel.moraleBump(q,-3,'loss');
      sAlert();continue;
    }
    if(p.assign==='mission')continue;   // away: nothing changes until they are back
    if(p.morale<=20&&!p.mwarn){p.mwarn=1;news('<b>'+p.name+'</b>\u2019s morale has collapsed. Rest, wins or a lift from the others, or they will leave.','h');}
    if(p.morale>30)p.mwarn=0;
    Rebel.moraleBump(p,(Rebel.MORALE_START-p.morale)*0.04,'rest');
    const others=charm.length-(charm.includes(p)?1:0);
    if(others>0)Rebel.moraleBump(p,0.15*others,'misc');
  }
  mood();
}
function specTick(){
  for(const p of G.people){
    if(p.assign!=='spec'||!p.specTrain)continue;
    if(p.injured){p.assign='rest';p.specTrain=null;continue;}
    p.specTrain.days--;
    if(p.specTrain.days<=0){
      p.spec=p.specTrain.k;p.specTrain=null;p.assign='rest';
      news('<b>'+p.name+'</b> graduates: <b>'+SPECNAME[p.spec]+'</b>.','g');
      sBuild();
    }
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
  else if(n.t==='recruit'){
    const nm=n.m.npc;
    const p=Rebel.migrate({id:'rec'+(G.recruitN+1),name:nm.name,first:nm.first,last:nm.last,charTrait:nm.charTrait,role:nm.role,level:1,xp:0,assign:'rest',injured:0,bio:nm.bio});
    openWin('recruit',{p,must:false,line:'<b>'+nm.name+'</b>, freed and still catching their breath, asks to stay and fight.'});
  }
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
      } else {G.credits+=600;rew.push('no berth — sold for '+C(600));}
    }
    if(m.rew.cross){
      if(G.fighters.length<fighterCap()){
        G.fighters.push({id:'cross_'+(G.fighters.length+1),name:'Dustfall',cls:'cross',hull:85,out:false});
        rew.push('+FT-4 Cross');
      } else {G.credits+=800;rew.push('no berth — Cross fenced for '+C(800));}
    }
    for(const p of pilots){gainXp(p,m.rew.xp||0.1);creditMission(p);}
    moraleAll(1,'win',pilots.map(p=>p.id),3);
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
    moraleAll(-3,'loss',pilots.map(p=>p.id),-8);Rebel.moraleBump(hurt,-5,'injury');mood();
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
    if(ev.mission){addMission(ev.mission);lines.push('And they came through: <b>'+missionName(ev.mission)+'</b> is on the board.');}
  } else if(kind==='neutral'){
    src.cult=Math.min(100,src.cult+8);
    lines.push('Acknowledged. The line holds. Cultivation +8.');
  } else {
    src.cult=Math.max(0,src.cult-10);src.risk=Math.min(100,src.risk+8);
    lines.push('A long silence before the channel closes. That landed badly. Cultivation −10, risk +8.');
  }
  if(ev.chain)for(const l of chainResolve(ev.chain,kind))lines.push(l);
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
    revGain(REV_W.srcLevel);
    if(SRCPOS[src.id])addSupport(SRCPOS[src.id],1);
    sBuild();
    return 'They’ve climbed higher on our behalf — <b>source level '+src.level+'</b>. Better access, better take.';
  }
  return null;
}
function srcSilence(src){
  src.alive=false;
  moraleAll(-10,'loss');
  news('The assassin reports in: <b>'+src.name+'</b> won’t be talking to anyone. The crew heard anyway.','h');
  sAlert();
  closeWin();openWin('sources');
  syncUI();
}
function srcCutLoose(src){
  src.alive=false;
  moraleAll(-6,'loss');
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
    news('No capacity to run another source safely. <b>'+cd.name+'</b> will wait — grow the network (an Intelligence Center room adds capacity) and they’ll come back around.','h');
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
  revGain(REV_W.scout);
  news('Scout report: <b>'+d.name+'</b> charted. We have access.','r');
  const lines=[(wasKnown?'Eyes on '+d.name+' at last.':'The uncharted signal resolves: <b>'+d.name+'</b>, '+d.kind.toLowerCase()+'.'),d.sit];
  // what the scouts turned up
  if(id==='dreymar'){addMission('orehaul');G.candQ.push('brook');lines.push('Payday barge, no escort. The miners practically drew us a map.');}
  else if(id==='volund'){addMission('foundry');lines.push('A clerk in freight control sells manifests. There’s a job here.');}
  else if(id==='callis'){G.candQ.push('marr');lines.push('And a dead drop was waiting for us — someone at the Institute knew we’d come.');}
  else if(id==='meridian'){G.candQ.push('renn');lines.push('Our people flagged a customs chief with expensive habits and flexible loyalties.');}
  else if(id==='sable'){G.intel+=3;lines.push('The listening post still works. We stripped its logs: '+I(3)+' recovered.');}
  else if(id==='tarsis'){G.supplies+=160;moraleAll(4,'win');lines.push('The farmers hide grain from the levy. Some of it now hides with us: '+S(160)+'. The crew eats well tonight.');}
  else if(id==='nyx'){G.credits+=160;lines.push('The shadowport takes all kinds. First introductions cost us nothing and paid '+C(160)+' in fenced salvage. Recruits drink here.');}
  else if(id==='oubli'){G.intel+=1;lines.push('Empty streets. Forty years of dust. One transmitter, still powered, still listening. We left it that way. '+I(1)+'.');}
  else if(id==='halcyon'){revGain(4);lines.push('Brass, beaches, and no idea we were there. Knowing Halcyon exists for us is worth progress alone.');}
  else if(d.lib){
    G.candQ.push(d.src);
    syncLocalOps(id,true);
    lines.push('Our pathfinders mapped '+d.regions.length+' fronts worth contesting: '+d.regions.map(r=>'<b>'+r.name+'</b>').join(', ')+'. Someone on the ground is asking to talk, and they will have work for us.');
  }
  sBuild();
  openWin('locBrief',{id,lines});
  saveSnap();syncUI();
}
/* ---------- Opportunities: leads our own intelligence turns up ----------
   Need Access 2+ in a world and a staffed Intelligence Center.
   A lead shows on the galaxy map; click it to read it and put it on the mission board.
   The marker stays until the job is done. */
const OPP_TYPES=['fuel','intel','autofactory','rescue'];
function oppText(t,o){
  const d=pdef(o.loc),r=o.region&&d.regions&&d.regions.find(x=>x.id===o.region);
  return t.replace(/\{target\}/g,o.target).replace(/\{place\}/g,r?r.name:d.name).replace(/\{loc\}/g,d.name);
}
function oppsEligible(){return hasRoom('comms')&&staffOf('comms').length>0;}
function genOpportunities(){
  G.opps=(G.opps||[]).filter(o=>!o.done);
  G.missions=G.missions.filter(m=>!((m.opp||m.oppId)&&m.state==='done'));
  if(!oppsEligible()||G.opps.length>=4)return;
  for(const d of PLANETDEF){
    const st=pst(d.id);
    if(!st||d.base||!st.access||(st.acc||0)<2)continue;
    if(G.opps.some(o=>o.loc===d.id))continue;
    if(rng()>0.10+0.04*((st.acc||0)-2))continue;
    const tid=OPP_TYPES[Math.floor(rng()*OPP_TYPES.length)],T=MTYPE_DEFS[tid];
    let region=null;
    if(d.regions){
      const open=d.regions.filter(r=>((st.lib&&st.lib[r.id])||0)<Math.min(100,locCap(st)));
      if(open.length)region=pickRegion(d,st);
    }
    G.oppN=(G.oppN||0)+1;
    G.opps.push({id:'opp'+G.oppN,loc:d.id,region:region?region.id:null,tid,target:T.variants[Math.floor(rng()*T.variants.length)],found:false,done:false});
    news('Intelligence: a lead has surfaced at <b>'+d.name+'</b>. It is marked on the galaxy map.','a');
    flashMsg('New lead at <b>'+d.name+'</b>','action');sAlert();
    break;
  }
}
function openOpp(id){
  const o=(G.opps||[]).find(x=>x.id===id);
  if(o)openWin('opp',o);
}
/* ---------- Patrol Local Space (Hangar task) ---------- */
const PATROL_DAYS=2;
function patrolPilot(f){return G.people.find(p=>p.role==='Pilot'&&p.ship===f.id&&!p.injured&&p.assign!=='mission'&&p.assign!=='spec');}
function patrolReady(f){return !f.out&&f.hull>=60&&G.fuel>=fuelOf(f)&&!!patrolPilot(f);}
function startPatrol(fid){
  const f=G.fighters.find(x=>x.id===fid);
  if(!f||!patrolReady(f))return false;
  const p=patrolPilot(f);
  G.fuel-=fuelOf(f);f.out=true;p.assign='mission';
  G.patrols=G.patrols||[];
  G.patrols.push({fid:f.id,pid:p.id,days:PATROL_DAYS});
  news('<b>'+f.name+'</b> goes out on patrol with '+p.name+' ('+PATROL_DAYS+'d).','a');sBuild();
  return true;
}
function patrolTick(){
  G.patrols=G.patrols||[];
  for(const t of G.patrols)t.days--;
  for(const t of G.patrols.filter(x=>x.days<=0)){
    const f=G.fighters.find(x=>x.id===t.fid),p=G.people.find(x=>x.id===t.pid);
    if(f)f.out=false;
    if(p&&p.assign==='mission')p.assign='rest';
    const bits=['<b>'+(f?f.name:'The patrol')+'</b> is back.'];
    G.intel+=1;bits.push(I(1)+' from what the sensors heard');
    if(rng()<0.5){const m=60+Math.floor(rng()*5)*10;G.materials+=m;bits.push(M(m)+' salvaged off a drifting wreck');}
    if(f&&rng()<0.25){const dmg=10+Math.floor(rng()*3)*5;f.hull=Math.max(10,f.hull-dmg);bits.push('a scrap with a Hegemony drone cost '+dmg+'% hull');}
    news(bits.join(' \u00b7 ')+'.','g');
  }
  G.patrols=G.patrols.filter(t=>t.days>0);
}
/* ---------- room upgrades and diplomatic tasks ---------- */
function upBlocked(rm,d){
  if(!d.conv)return '';
  const cl=clusterOf(rm),t=clusterTiles(cl);
  if(t<(d.minTiles||2))return d.minTiles>2?'Needs an expansion first.':'Needs a second room to convert.';
  const convs=['lounge','mbay'].filter(k=>clUp(cl,k)||upQueued(rm,k)).length;
  if(rm.key==='hangar'&&(G.fighters.length>fighterCap()-1||t-convs<2))return 'The pad is in use or it is the last one.';
  if(rm.key==='barracks'&&bunksUsed()>bunkCap()-bedsPerTile(cl))return 'Everyone needs their bunk.';
  return '';
}
function startUpgrade(rm,k){
  const d=(UPGRADES[rm.key]||[]).find(x=>x.k===k);
  if(!d||rm.build||upOf(rm,k)||upQueued(rm,k))return false;
  if(G.credits<d.c||G.materials<(d.m||0)||G.supplies<(d.s||0))return false;
  if(upBlocked(rm,d))return false;
  G.credits-=d.c;G.materials-=(d.m||0);G.supplies-=(d.s||0);
  G.upq=G.upq||[];
  G.upq.push({key:rm.key,k,ids:clusterOf(rm).map(r=>r.id),days:d.days});
  news('Upgrade started: <b>'+d.n+'</b> ('+d.days+'d).','a');sBuild();
  return true;
}
function dipTargets(){
  return PLANETDEF.filter(d=>{const st=pst(d.id);return st&&st.access&&!d.base&&d.pop&&d.pop!=='\u2014'&&d.pop!=='0';});
}
function dipCapacity(){return hasRoom('diplo')&&staffOf('diplo').length?tilesOf('diplo'):0;}
function canDip(id){
  const st=pst(id);
  if(!st||!dipCapacity())return 'The Quarter needs a Chief Diplomat.';
  if((G.dip||[]).length>=dipCapacity())return 'Every diplomat is already out.';
  if((G.dip||[]).some(t=>t.loc===id))return 'A team is already there.';
  if((st.sup||0)>=5)return 'Support is already at its peak.';
  if(G.credits<DIP_COST.c||G.supplies<DIP_COST.s)return 'Cannot afford it.';
  return '';
}
function startDip(id){
  if(canDip(id))return false;
  const dip=staffOf('diplo')[0];
  G.credits-=DIP_COST.c;G.supplies-=DIP_COST.s;
  G.dip=G.dip||[];
  G.dip.push({loc:id,days:DIP_DAYS,by:dip?dip.name:'The diplomats',n:(dip&&dip.level>=3)?1:0.5});
  news('Diplomats leave for <b>'+pdef(id).name+'</b> ('+DIP_DAYS+'d).','a');sBuild();
  return true;
}
function finishDip(t){
  const d=pdef(t.loc);
  addSupport(t.loc,t.n);
  news('<b>'+t.by+'</b>\u2019s people did the rounds in '+d.name+'. Quiet dinners, louder opinions: Support '+(t.n>=1?'+1':'+\u00bd')+'.','p');
}
/* ---------- Access, Support, Liberation, and the road to Level 2 ---------- */
function raiseAccess(id){
  const d=pdef(id),st=pst(id);
  if(!d||!st||!st.access||(st.acc||0)>=5)return;
  const cost=accessCost(d,st);
  if(G.intel<cost)return;
  G.intel-=cost;st.acc++;
  if(st.acc===2){const cid={callis:'ostrander',veray:'varr'}[id];if(cid&&!G.sources.some(x=>x.id===cid)&&!(G.candQ||[]).includes(cid)){G.candQ.push(cid);news('Word reached us from <b>'+d.name+'</b>: someone inside wants to talk.','a');}}
  revGain(REV_W.access);
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
    revGain(REV_W.support);
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
    news('The Hegemony has noticed. <b>Revolution Level 2</b>.','p');moraleAll(8,'win');
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
  return;   // regional placeholder ops are retired: sources and intelligence offer real missions now
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
/* Revolution progress weights (tuning values; see docs/GDD.md). Repeats in one location are worth less. */
const REV_W={momentum:0.55,libMul:1.6,mission:1.2,firstLoc:3,secondLoc:1,midRepeat:0.5,lateRepeat:0.3,lib:0.05,libFull:4,access:0.5,support:0.5,srcLevel:2,scout:1,chain:3};
/* every finished mission feeds the progress meter; a new location is worth the most */
function missionCredit(m){
  let gain=REV_W.mission;
  const info={gain:0,lib:null,first:false};
  if(m.opp||m.oppId){const o=(G.opps||[]).find(x=>x.id===(m.oppId||m.id));if(o)o.done=true;}
  const st=m.loc?pst(m.loc):null,d=m.loc?pdef(m.loc):null;
  if(st){
    st.ops=(st.ops||0)+1;
    info.first=st.ops===1;
    gain=REV_W.mission*(st.ops<=2?1:st.ops<=5?REV_W.midRepeat:REV_W.lateRepeat)+(st.ops===1?REV_W.firstLoc:st.ops===2?REV_W.secondLoc:0);
    if(m.region&&m.lib&&d&&d.regions){
      const r=d.regions.find(x=>x.id===m.region);
      const cur=st.lib[m.region]||0,cap=locCap(st);
      const to=Math.max(cur,Math.min(cap,cur+m.lib));
      st.lib[m.region]=to;
      info.lib={region:r.name,from:cur,to,capped:to>=cap&&to<100};
      if(to>cur){
        gain+=(to-cur)*REV_W.lib;
        news('<b>'+r.name+'</b> ('+d.name+'): liberation '+to+'%'+(to>=cap&&to<100?' — capped by '+(ACC_CAP[st.acc]<=ACC_CAP[Math.floor(st.sup)]?'Access':'Support')+'.':'.'),'p');
        if(to>=100){gain+=REV_W.libFull;news('<b>'+r.name+'</b> is LIBERATED. The flag goes up.','g');moraleAll(4,'win');flashMsg('<b>'+r.name+'</b> liberated','good');}
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
/* a merged room is drawn as one shape: outline only the tile edges that face outside it */
function roomOutline(rm){
  const cl=clusterOf(rm);
  const has=(r,c)=>cl.some(q=>r>=q.r&&r<q.r+q.h&&c>=q.c&&c<q.c+q.w);
  ctx.beginPath();
  for(const q of cl)for(let r=q.r;r<q.r+q.h;r++)for(let c=q.c;c<q.c+q.w;c++){
    const [x,y,S]=cellToCss(r,c),w=TW2*S,h=TH2*S;
    if(!has(r-1,c)){ctx.moveTo(x,y-h);ctx.lineTo(x+w,y);}
    if(!has(r,c+1)){ctx.moveTo(x+w,y);ctx.lineTo(x,y+h);}
    if(!has(r+1,c)){ctx.moveTo(x,y+h);ctx.lineTo(x-w,y);}
    if(!has(r,c-1)){ctx.moveTo(x-w,y);ctx.lineTo(x,y-h);}
  }
}
function roomCenter(rm){
  const cl=clusterOf(rm);
  let sr=0,sc=0,n=0;
  for(const q of cl)for(let r=q.r;r<q.r+q.h;r++)for(let c=q.c;c<q.c+q.w;c++){sr+=r;sc+=c;n++;}
  return cellToCss(sr/n,sc/n);
}
/* small standing figure */
function figure(x,y,S,name,col){
  ctx.fillStyle=col||K.rebelHi;
  ctx.beginPath();ctx.roundRect(x-3*S,y-12*S,6*S,10*S,3*S);ctx.fill();
  ctx.beginPath();ctx.arc(x,y-15*S,3*S,0,Math.PI*2);ctx.fill();
  if(name){
    ctx.font='700 '+Math.max(Math.round(9*S),Math.ceil(11/rvSx))+'px '+TH.FONT.ui;
    ctx.textAlign='center';ctx.fillStyle=TH.rgba(K.text2,0.9);
    ctx.fillText(name,x,y+9*S+3);
  }
}
function fighterTop(x,y,S,rot,alive,col){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  ctx.fillStyle=col||K.steel;
  ctx.beginPath();ctx.moveTo(14*S,0);ctx.lineTo(-8*S,-8*S);ctx.lineTo(-4*S,0);ctx.lineTo(-8*S,8*S);ctx.closePath();ctx.fill();
  ctx.strokeStyle=K.ink;ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
}
function craftTop(cls,x,y,S,rot,col){
  if(cls==='graf'){
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);
    ctx.fillStyle=col||K.steel;
    ctx.beginPath();ctx.roundRect(-14*S,-7*S,26*S,14*S,3*S);ctx.fill();
    ctx.strokeStyle=K.ink;ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle=K.ink;
    ctx.beginPath();ctx.roundRect(7*S,-4*S,6*S,8*S,2*S);ctx.fill();
    ctx.strokeStyle=TH.rgba(K.ink,0.8);
    ctx.beginPath();ctx.moveTo(-5*S,-7*S);ctx.lineTo(-5*S,7*S);ctx.stroke();
    ctx.restore();
  } else fighterTop(x,y,S,rot,true,col);
}
const hullCol=h=>h>=100?K.go:h>=60?K.gold:K.hazard;

/* ---------- base map render ---------- */
function renderBase(now){
  const t=RM?0:now/1000,Lb=TH.labelLayer();
  for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){
    const cell=G.grid[r][c];
    const [x,y,S]=cellToCss(r,c);
    if(cell.t==='rock'){
      diamond(x,y,S,2);
      ctx.fillStyle=TH.rgba(K.ink,0.55);ctx.fill();
      ctx.strokeStyle=TH.rgba(K.seam,0.22);ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle=TH.rgba(K.seam,0.18);
      ctx.beginPath();ctx.arc(x+((r*7+c*13)%17-8)*S,y+((r*11+c*5)%9-4)*S,1.6*S,0,7);ctx.fill();
      continue;
    }
    if(cell.t==='rubble'){
      diamond(x,y,S,2);
      ctx.fillStyle=K.night;ctx.fill();
      ctx.strokeStyle=TH.rgba(K.seam,0.6);ctx.lineWidth=1;ctx.stroke();
      ctx.strokeStyle=TH.rgba(K.text3,0.45);
      ctx.beginPath();
      ctx.moveTo(x-10*S,y-2*S);ctx.lineTo(x-2*S,y+3*S);ctx.moveTo(x+4*S,y-4*S);ctx.lineTo(x+11*S,y+1*S);
      ctx.stroke();
      if(cell.dig){
        ctx.strokeStyle=TH.rgba(K.go,0.8);ctx.lineWidth=1.6;ctx.setLineDash([4,4]);
        diamond(x,y,S,5);ctx.stroke();ctx.setLineDash([]);
        TH.marker(ctx,x,y+4*S,{icon:'work',color:K.go,t,size:26});
        Lb.add(cell.dig+'d',x,y+30*S+4,{color:K.go,size:12},1);
      }
      continue;
    }
    const rm=roomAt(r,c);
    const col=rm?rcol(rm.key):null;
    diamond(x,y,S,1);
    ctx.fillStyle=(r+c)%2?'#141838':'#171b3f';ctx.fill();
    if(rm){diamond(x,y,S,1);ctx.fillStyle=TH.rgba(col,rm.build?0.1:0.22);ctx.fill();}
    diamond(x,y,S,1);ctx.strokeStyle=TH.rgba(K.ink,0.9);ctx.lineWidth=1;ctx.stroke();
    if(rm&&rm.build){
      ctx.save();diamond(x,y,S,1);ctx.clip();
      ctx.strokeStyle=TH.rgba(K.gold,0.35);ctx.lineWidth=2;
      for(let k=-3;k<=3;k++){ctx.beginPath();ctx.moveTo(x+k*10*S-20,y-20);ctx.lineTo(x+k*10*S+20,y+20);ctx.stroke();}
      ctx.restore();
    }
  }
  // rooms as single entities: one outline, one feature, one marker, one label
  const leaders=G.rooms.filter(rm=>clusterOf(rm)[0]===rm).map(rm=>({rm,y:roomCenter(rm)[1]})).sort((a,b)=>a.y-b.y);   // far rooms first, so near markers sit on top
  for(const {rm} of leaders){
    const cl=clusterOf(rm);   // a merged room is drawn once
    cl.h=Math.max(...cl.map(q=>q.r+q.h))-Math.min(...cl.map(q=>q.r));
    const col=rcol(rm.key);
    roomOutline(rm);
    ctx.lineWidth=5;ctx.strokeStyle=K.ink;ctx.stroke();
    ctx.lineWidth=2.5;ctx.strokeStyle=rm.build?TH.rgba(col,0.6):col;ctx.stroke();
    const [x,y,S]=roomCenter(rm);
    const pul=RM?0.8:0.6+0.4*Math.sin(worldT*0.002+rm.r+rm.c);   // reduced motion: no pulsing
    if(!rm.build){
      // room-specific furniture sits low in the room; the icon marker rides above it
      ctx.save();ctx.translate(0,7*S);
      if(rm.key==='command'){
        ctx.strokeStyle=TH.rgba(col,0.35+0.3*pul);ctx.lineWidth=1.6;
        ctx.beginPath();ctx.ellipse(x,y-6*S,11*S,5.5*S,0,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle=TH.rgba(col,0.25);
        ctx.beginPath();ctx.ellipse(x,y-6*S,6*S,3*S,0,0,Math.PI*2);ctx.stroke();
      } else if(rm.key==='hangar'){
        if(G.wreck&&!G.wreck.restored){
          ctx.globalAlpha=0.55;
          craftTop('graf',x+6*S,y-2*S,S*0.8,-0.5,K.seam);
          ctx.globalAlpha=1;
        }
        for(let i=0;i<Math.min(3,G.fighters.length);i++){
          const f=G.fighters[i];
          ctx.globalAlpha=f.out?0.25:0.95;
          craftTop(f.cls,x+(i-1)*16*S,y+(i-1)*4*S-4*S,S*0.8,-0.5,f.out?K.seam:undefined);
          ctx.globalAlpha=1;
          if(!f.out){
            ctx.fillStyle=hullCol(f.hull);
            ctx.beginPath();ctx.arc(x+(i-1)*16*S-8*S,y+(i-1)*4*S-4*S,1.8*S,0,7);ctx.fill();
          }
        }
      } else if(rm.key==='comms'){
        ctx.strokeStyle=TH.rgba(col,0.3+0.4*pul);ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(x,y-8*S,5*S,Math.PI*0.9,Math.PI*1.9);ctx.stroke();
        ctx.beginPath();ctx.arc(x,y-8*S,(8+3*pul)*S,Math.PI*1.15,Math.PI*1.65);ctx.stroke();
      } else if(rm.key==='barracks'){
        ctx.fillStyle=TH.rgba(col,0.4);
        for(let i=0;i<3;i++)ctx.fillRect(x-12*S+i*9*S,y-3*S,6*S,4*S);
      } else if(rm.key==='store'){
        ctx.fillStyle=TH.rgba(col,0.45);
        ctx.fillRect(x-6*S,y-5*S,5*S,4*S);ctx.fillRect(x+1*S,y-3*S,5*S,4*S);
      } else if(rm.key==='workshop'){
        if(!RM&&rng()<0.06){ctx.fillStyle=K.goldHi;ctx.beginPath();ctx.arc(x+(rng()-0.5)*10*S,y-2*S,1.2,0,7);ctx.fill();}
        ctx.strokeStyle=TH.rgba(col,0.6);ctx.lineWidth=1.4;
        ctx.strokeRect(x-6*S,y-6*S,12*S,6*S);
      } else if(rm.key==='infirmary'){
        ctx.strokeStyle=TH.rgba(col,0.7);ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x-4*S,y-4*S);ctx.lineTo(x+4*S,y-4*S);ctx.moveTo(x,y-8*S);ctx.lineTo(x,y);ctx.stroke();
      } else if(rm.key==='training'){
        ctx.strokeStyle=TH.rgba(col,0.6);ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(x,y-4*S,4.5*S,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.arc(x,y-4*S,1.6*S,0,Math.PI*2);ctx.stroke();
      } else if(rm.key==='diplo'){
        ctx.strokeStyle=TH.rgba(col,0.35+0.3*pul);ctx.lineWidth=1.4;
        ctx.beginPath();ctx.ellipse(x,y-4*S,8*S,4*S,0,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle=TH.rgba(col,0.45);
        for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.fillRect(x+Math.cos(a)*11*S-1.5*S,y-4*S+Math.sin(a)*5.5*S-1.5*S,3*S,3*S);}
      }
      ctx.restore();
      // the room's icon marker
      const bs=Math.max(22,Math.round(18+8*S));
      TH.chunky(ctx,x-bs/2,y-bs*1.05,bs,bs,8,col,{drop:3,line:2.5});
      TH.icon(ctx,ROOMS[rm.key].ic,x,y-bs*0.55,bs*0.62,K.ink,{weight:2.6});
    } else {
      TH.marker(ctx,x,y-2*S,{icon:'work',color:K.gold,t,size:26});
    }
    const ly=y+TH2*(cl.h===1?0.9:1.6)*S+12;
    Lb.add(ROOMS[rm.key].name+(rm.build?' · '+rm.build.days+'d':''),x,ly,{color:rm.build?K.gold:col,size:12},rm.build?1:2);
  }
  Lb.flush(ctx);
  // hover / selection: whole-room outlines
  const hovRm=hoverCell?roomAt(hoverCell.r,hoverCell.c):null;
  if(hovRm){roomOutline(hovRm);ctx.lineWidth=2.5;ctx.strokeStyle=TH.rgba(K.gold,0.85);ctx.stroke();}
  else if(hoverCell){
    const [x,y,S]=cellToCss(hoverCell.r,hoverCell.c);
    diamond(x,y,S,1);ctx.strokeStyle=TH.rgba(K.gold,0.8);ctx.lineWidth=2;ctx.stroke();
  }
  if(tilePopAt){
    if(tilePopAt.room){roomOutline(tilePopAt.room);ctx.strokeStyle=K.gold;ctx.lineWidth=3;ctx.stroke();}
    else {const [x,y,S]=cellToCss(tilePopAt.r,tilePopAt.c);diamond(x,y,S,0);ctx.strokeStyle=K.gold;ctx.lineWidth=3;ctx.stroke();}
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
  return st?('<br>'+STAFFABLE[key].post+': <b class="bs-good">'+st.name+'</b>')
    :('<br><span class="bs-bad">'+STAFFABLE[key].post+' post empty</span> — '+STAFFABLE[key].perk+' when filled');
}
/* an action button that opens a window / runs a room job */
const rbtn=(attrs,label,dis,cls)=>'<button class="sr-btn'+(cls?' '+cls:'')+'" '+attrs+(dis?' disabled':'')+'>'+label+'</button>';
function renderRoomBar(){
  const rm=viewRoom;if(!rm)return;
  const R=ROOMS[rm.key],bar=$('roomViewBar');
  let info='';
  if(rm.key==='hangar'){
    const rate=hasRoom('workshop')?(staffOf('workshop').length?15:8):5;
    info='Berths '+G.fighters.length+'/'+fighterCap()+' · repairs '+(rate+(staffOf('hangar').length?4:0)+(hangarUp('arm')?5:0))+'%/day at '+M(staffOf('store').length?4:8)+' each'+staffLine('hangar');
    if(rm.key==='hangar'&&G.wreck&&!G.wreck.restored)info+='<br>A derelict <b>Graf Type 1 Hauler</b> sits under ten years of dust. Joss swears she’ll fly.';
  } else if(rm.key==='barracks'){
    info='Bunks '+bunksUsed()+'/'+bunkCap()+' · '+clusterTiles(clusterOf(rm))+' rooms · morale '+Math.round(G.morale)+staffLine('barracks')+
      '<br>Recruits come through the network. Work your sources; when one signals about people, follow it.';
  } else if(rm.key==='store'){
    info=C(Math.round(G.credits))+' '+S(Math.round(G.supplies))+'/'+supCap()+' '+I(Math.round(G.intel))+
      '<br>Armory: '+G.armory.map(a=>a.name+' ×'+a.n).join(' · ')+staffLine('store');
  } else if(rm.key==='infirmary'){
    const patients=G.people.filter(p=>p.injured>0);
    info='Patients: '+(patients.length?patients.map(p=>p.name+' ('+p.injured+'d)').join(', '):'none')+staffLine('infirmary');
  } else if(rm.key==='training'){
    const tr=G.people.filter(p=>p.assign==='train');
    info='Training: '+(tr.length?tr.map(p=>p.name).join(', '):'nobody. The mats are lonely.')+staffLine('training');
  } else if(rm.key==='comms'){
    info='Source capacity '+G.sources.filter(s=>s.alive).length+'/'+sourceCap()+' · '+tilesOf('comms')+' room'+(tilesOf('comms')>1?'s':'')+staffLine('comms');
  } else if(rm.key==='diplo'){
    info='Teams out '+(G.dip||[]).length+'/'+dipCapacity()+staffLine('diplo');
  } else if(rm.key==='command'){
    info='Revolution progress '+Math.round(G.renown)+'/100 · network exposure '+Math.round(G.risk)+staffLine('command');
  } else if(rm.key==='workshop'){
    info='Repair pace '+(staffOf('workshop').length?15:8)+'%/day'+staffLine('workshop');
  }
  /* cards (upgrades, patrols, the derelict) sit in the body; window-openers sit in the foot */
  let cards='',acts='';
  if(rm.key==='command')acts=rbtn('data-open="missions"','Mission Board')+rbtn('data-open="sources"','Source Network');
  if(rm.key==='training')acts=rbtn('data-open="spec"','Specialty Training')+rbtn('data-simulator','Simulator — dogfight exercise');
  if(rm.key==='hangar'&&G.wreck&&!G.wreck.restored){
    if(G.wreck.restoring)cards+='<div class="sr-card sr-card--info"><div class="sr-card__title">Restoring the hauler</div><div class="sr-card__body" style="margin-bottom:0">'+G.wreck.restoring+'d left. Joss hasn’t slept.</div></div>';
    else{
      const can=G.credits>=240&&G.materials>=160;
      cards+='<div class="sr-card sr-card--info bs-build"><div class="sr-card__top"><span class="sr-card__title">Restore the derelict hauler</span><span class="sr-tag">2 days</span></div>'+
        '<div class="bs-build__row" style="margin-top:8px"><span class="sr-card__meta">'+C(240,G.credits<240)+' '+M(160,G.materials<160)+'</span>'+rbtn('data-restore'+(can?'':' title="'+esc(needWhy({c:240,m:160}))+'"'),'Restore',!can,'sr-btn--primary sr-btn--sm')+'</div></div>';
    }
  }
  if(rm.key==='diplo')acts=rbtn('data-open="diplo"','Diplomatic Tasks');
  if(rm.key==='store')acts=rbtn('data-open="gear"','Gear Grid');
  if(rm.key==='hangar'){
    for(const t of (G.patrols||[])){const f=G.fighters.find(x=>x.id===t.fid);cards+='<div class="sr-tag sr-tag--info">'+IC('ship')+(f?f.name:'A ship')+' on patrol · '+t.days+'d left</div>';}
    for(const f of G.fighters.filter(x=>!x.out)){
      const ok=patrolReady(f);
      cards+='<div class="sr-card bs-build"><div class="sr-card__top"><span class="sr-card__title">Patrol local space — '+f.name+'</span><span class="sr-tag">'+PATROL_DAYS+'d</span></div>'+
        '<div class="sr-card__body">'+(ok?'Listen for leads and scavenge what drifts by. Small risk to the hull.':(patrolPilot(f)?(f.hull<60?'Too damaged to fly.':'Not enough fuel.'):'Needs its pilot free.'))+'</div>'+
        '<div class="bs-build__row"><span class="sr-card__meta">'+F(fuelOf(f),G.fuel<fuelOf(f))+'</span>'+rbtn('data-patrol="'+f.id+'"'+(ok?'':' title="'+esc(patrolPilot(f)?(f.hull<60?'Too damaged to fly':'Not enough fuel'):'Needs its pilot free')+'"'),'Patrol',!ok,'sr-btn--sm')+'</div></div>';
    }
  }
  for(const u of (UPGRADES[rm.key]||[])){
    const has=upOf(rm,u.k),q=upQueued(rm,u.k);
    const afford=G.credits>=u.c&&G.materials>=(u.m||0)&&G.supplies>=(u.s||0);
    const blk=upBlocked(rm,u);
    cards+=has?'<div class="sr-tag sr-tag--good">'+IC('check')+u.n+' installed</div>'
      :'<div class="sr-card sr-card--good bs-build"><div class="sr-card__top"><span class="sr-card__title">'+u.n+'</span><span class="sr-tag">'+u.days+'d</span></div>'+
        '<div class="sr-card__body">'+u.d+(blk?' <span class="bs-bad">'+blk+'</span>':'')+'</div>'+
        '<div class="bs-build__row"><span class="sr-card__meta">'+bundleHTML(u,WALLET())+'</span>'+(q?'<span class="sr-tag sr-tag--progress">Building</span>':rbtn('data-up="'+u.k+'"'+(!afford?' title="'+esc(needWhy(u))+'"':blk?' title="'+esc(blk)+'"':''),'Build',!afford||blk,'sr-btn--primary sr-btn--sm'))+'</div></div>';
  }
  bar.style.setProperty('--accent',rcol(rm.key));
  bar.innerHTML='<div class="sr-window__head"><span class="sr-window__title">'+R.name+'</span><button class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost" data-backbase aria-label="Back to the base">'+IC('clear')+'</button></div>'+
    '<div class="sr-window__body"><p class="bs-desc">'+R.desc+'</p><div class="bs-info">'+info+'</div>'+(cards?'<div class="sr-stack bs-cards">'+cards+'</div>':'')+
    '<p class="sr-fine">'+(SR.touch?'Double-tap':'Double-click')+' a rebel in the room for their file</p></div>'+
    '<div class="sr-window__foot bs-foot">'+acts+'<span class="sr-spacer"></span>'+rbtn('data-backbase',IC('back')+'Back to the base','', 'sr-btn--ghost')+'</div>';
}
let rvFigs=[],rvParts=[],rvLast=0,rvSx=1;
function renderRoomView(now){
  const rm=viewRoom;
  /* the docked room window owns a corner of the stage; the room lives in the rest (beside it, or below it on a phone) */
  let rx=0,ry=0,rw=cssW,rh=cssH;
  const bar=$('roomViewBar');
  if(!bar.hidden){
    const cr=cv.getBoundingClientRect(),br=bar.getBoundingClientRect();
    if(br.width&&br.width<cssW*0.55){rx=br.right-cr.left+12;rw=Math.max(240,cssW-rx);}
    else if(br.height){ry=br.bottom-cr.top+8;rh=Math.max(200,cssH-ry-84);}
  }
  const Sx=Math.min(rw/560,rh/340);
  rvSx=Sx;
  const cx=rx+rw/2,cy=ry+rh*0.6;
  const col=rcol(rm.key);
  const fnt=(px,wt)=>(wt||700)+' '+Math.max(px,Math.ceil(11/Sx))+'px '+TH.FONT.ui;   // never below 11 screen px
  const dtv=Math.min(0.05,(now-(rvLast||now))/1000);rvLast=now;
  if(RM)now=0;   // reduced motion: the room holds still
  rvFigs=[];
  const addFig=(fx,fy,p,fcol)=>{
    figure(fx,fy,2,p?p.name.split(' ')[0]:'',fcol);
    if(p)rvFigs.push({x:cx+fx*Sx,y:cy+fy*Sx,r:18,pid:p.id});
  };
  const spark=(fx,fy,scol)=>{
    if(RM)return;
    rvParts.push({x:fx,y:fy,vx:(rng()-0.5)*60,vy:-20-rng()*50,life:0,max:0.4+rng()*0.3,col:scol||K.goldHi});
  };
  // big floor
  ctx.save();
  ctx.translate(cx,cy);
  ctx.scale(Sx,Sx);
  ctx.beginPath();
  ctx.moveTo(0,-130);ctx.lineTo(250,0);ctx.lineTo(0,130);ctx.lineTo(-250,0);ctx.closePath();
  const fg=ctx.createLinearGradient(0,-130,0,130);
  fg.addColorStop(0,TH.rgba(col,0.26));fg.addColorStop(1,TH.rgba(col,0.1));
  ctx.fillStyle=K.night;ctx.fill();
  ctx.fillStyle=fg;ctx.fill();
  ctx.lineWidth=7;ctx.strokeStyle=K.ink;ctx.stroke();
  ctx.lineWidth=3;ctx.strokeStyle=col;ctx.stroke();
  // back walls hint
  ctx.strokeStyle=TH.rgba(K.seam,0.7);ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,-130);ctx.lineTo(0,-190);ctx.moveTo(250,0);ctx.lineTo(250,-60);ctx.moveTo(-250,0);ctx.lineTo(-250,-60);ctx.stroke();
  const pul=RM?0.8:0.6+0.4*Math.sin(now*0.002);
  if(rm.key==='hangar'){
    const cap=fighterCap();
    for(let i=0;i<cap;i++){
      const bx=(i-(cap-1)/2)*130,by=i%2?40:-20;
      ctx.strokeStyle=TH.rgba(col,0.45);ctx.lineWidth=1.5;ctx.setLineDash([6,5]);
      ctx.beginPath();ctx.moveTo(bx,by-45);ctx.lineTo(bx+80,by);ctx.lineTo(bx,by+45);ctx.lineTo(bx-80,by);ctx.closePath();ctx.stroke();
      ctx.setLineDash([]);
      const f=G.fighters[i];
      if(!f&&i===G.fighters.length&&rm.key==='hangar'&&G.wreck&&!G.wreck.restored){
        ctx.globalAlpha=0.6;
        craftTop('graf',bx,by,3.4,-0.5,K.seam);
        ctx.globalAlpha=1;
        ctx.font=fnt(11);ctx.textAlign='center';
        ctx.fillStyle=K.gold;
        ctx.fillText(G.wreck.restoring?'Restoring · '+G.wreck.restoring+'d':'Derelict',bx,by+62);
        continue;
      }
      if(f&&!f.out){
        craftTop(f.cls,bx,by,3.4,-0.5);
        ctx.font=fnt(12);ctx.textAlign='center';
        ctx.fillStyle=K.text;ctx.fillText(f.name,bx,by+62);
        ctx.fillStyle=K.ink;ctx.fillRect(bx-27,by+67,54,7);
        ctx.fillStyle=hullCol(f.hull);
        ctx.fillRect(bx-25,by+69,50*f.hull/100,3);
        if(f.hull<100&&rng()<0.05)spark(bx+(rng()-0.5)*36,by+8);
      } else {
        ctx.font=fnt(11);ctx.textAlign='center';
        ctx.fillStyle=K.text3;
        ctx.fillText(f&&f.out?f.name+' — out':'Empty berth',bx,by+4);
      }
    }
  } else if(rm.key==='command'){
    ctx.strokeStyle=TH.rgba(col,0.4+0.3*pul);ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,-10,90,42,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=TH.rgba(col,0.25);
    ctx.beginPath();ctx.ellipse(0,-10,55,25,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<14;i++){
      ctx.fillStyle=TH.rgba(K.goldHi,0.3+0.5*Math.abs(Math.sin(i*3+now*0.001)));
      ctx.beginPath();ctx.arc(Math.cos(i*2.4)*60,-10-40-Math.sin(i*1.7)*18,1.4,0,7);ctx.fill();
    }
    staffOf('command').forEach((p,i)=>addFig(-120+i*40,50,p,col));
  } else if(rm.key==='barracks'){
    const cap=Math.min(bunkCap(),12);
    const resters=G.people.filter(p=>p.assign==='rest'&&!p.injured);
    for(let i=0;i<cap;i++){
      const bx=(i%3-1)*140,by=Math.floor(i/3)*54-40;
      ctx.fillStyle=TH.rgba(col,0.16);
      ctx.fillRect(bx-40,by-12,80,24);
      ctx.strokeStyle=TH.rgba(col,0.5);ctx.lineWidth=1.5;ctx.strokeRect(bx-40,by-12,80,24);
      const p=resters[i];
      if(p){
        ctx.fillStyle=K.rebelHi;
        ctx.beginPath();ctx.roundRect(bx-28,by-6,44,11,5);ctx.fill();
        ctx.beginPath();ctx.arc(bx+24,by,5,0,7);ctx.fill();
        ctx.font=fnt(11,600);ctx.textAlign='center';
        ctx.fillStyle=K.text2;ctx.fillText(p.name.split(' ')[0],bx,by+26);
        rvFigs.push({x:cx+bx*Sx,y:cy+by*Sx,r:22,pid:p.id});
      }
    }
  } else if(rm.key==='store'){
    const stacks=Math.max(2,Math.min(9,Math.round(G.supplies/25)));
    for(let i=0;i<stacks;i++){
      const bx=(i%3-1)*110+((i*37)%23-11),by=Math.floor(i/3)*46-40;
      ctx.fillStyle=TH.rgba(col,0.25+((i*7)%10)/40);
      ctx.fillRect(bx-22,by-16,44,32);
      ctx.strokeStyle=TH.rgba(col,0.6);ctx.lineWidth=1.5;ctx.strokeRect(bx-22,by-16,44,32);
    }
    // weapon rack
    ctx.strokeStyle=TH.rgba(K.gold,0.7);ctx.lineWidth=2;
    ctx.strokeRect(150,-80,80,50);
    G.armory.forEach((a,i)=>{
      ctx.font=fnt(12);ctx.textAlign='left';
      ctx.fillStyle=K.gold;ctx.fillText(a.ic+' ×'+a.n,158,-60+i*Math.max(16,Math.ceil(13/Sx)));
    });
    staffOf('store').forEach((p,i)=>addFig(-160+i*40,60,p,K.go));
  } else if(rm.key==='workshop'){
    const wounded=G.fighters.find(f=>!f.out&&f.hull<100);
    ctx.strokeStyle=TH.rgba(col,0.6);ctx.lineWidth=2;
    ctx.strokeRect(-70,-30,140,46);
    if(wounded){
      craftTop(wounded.cls,0,-8,3,-0.3);
      ctx.font=fnt(12);ctx.textAlign='center';
      ctx.fillStyle=K.text;ctx.fillText(wounded.name+' — '+wounded.hull+'%',0,46);
      if(rng()<0.12)spark((rng()-0.5)*80,-6);
    } else {
      ctx.font=fnt(12);ctx.textAlign='center';
      ctx.fillStyle=K.text2;ctx.fillText('Lift empty — nothing broken. For once.',0,0);
    }
    staffOf('workshop').forEach((p,i)=>addFig(-110+i*40,50,p,K.steel));
  } else if(rm.key==='infirmary'){
    const patients=G.people.filter(p=>p.injured>0);
    for(let i=0;i<2;i++){
      const bx=(i-0.5)*160,by=-10;
      ctx.fillStyle=TH.rgba(col,0.14);ctx.fillRect(bx-45,by-14,90,28);
      ctx.strokeStyle=TH.rgba(col,0.55);ctx.lineWidth=1.5;ctx.strokeRect(bx-45,by-14,90,28);
      const p=patients[i];
      if(p){
        ctx.fillStyle=K.hazard;
        ctx.beginPath();ctx.roundRect(bx-32,by-7,52,12,6);ctx.fill();
        ctx.beginPath();ctx.arc(bx+28,by-1,6,0,7);ctx.fill();
        ctx.font=fnt(11,600);ctx.textAlign='center';
        ctx.fillStyle=K.hazard;ctx.fillText(p.name.split(' ')[0]+' · '+p.injured+'d',bx,by+30);
        rvFigs.push({x:cx+bx*Sx,y:cy+by*Sx,r:24,pid:p.id});
      }
    }
    const staff=medStaff();
    staff.forEach((p,i)=>addFig(-40+i*60,70,p,K.go));
    if(!staff.length){
      ctx.font=fnt(12);ctx.textAlign='center';
      ctx.fillStyle=K.hazard;ctx.fillText('Medic post empty — post Support crew from their file',0,108);
    }
  } else if(rm.key==='training'){
    ctx.strokeStyle=TH.rgba(col,0.6);ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,70,0,Math.PI*2);ctx.stroke();
    const tr=G.people.filter(p=>p.assign==='train');
    tr.forEach((p,i)=>{
      const a=i*2.1+now*0.0012;
      addFig(Math.cos(a)*40,Math.sin(a)*20,p);
    });
    if(!tr.length){
      ctx.font=fnt(12);ctx.textAlign='center';
      ctx.fillStyle=K.text2;ctx.fillText('Empty mats — assign rebels from their files',0,4);
    }
    staffOf('training').forEach((p,i)=>addFig(90+i*40,-50,p,K.psi));
    // the simulator pod lives here
    ctx.strokeStyle=TH.rgba(K.shield,0.8);ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-190,-70,70,44,10);ctx.stroke();
    ctx.fillStyle=TH.rgba(K.shield,0.15+0.12*pul);
    ctx.beginPath();ctx.roundRect(-184,-64,58,32,8);ctx.fill();
    ctx.font=fnt(11);ctx.textAlign='center';
    ctx.fillStyle=K.shield;ctx.fillText('Simulator',-155,-12);
  } else if(rm.key==='comms'){
    ctx.strokeStyle=TH.rgba(col,0.8);ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,-30,26,Math.PI*0.85,Math.PI*2.05);ctx.stroke();
    for(let k=1;k<=3;k++){
      ctx.strokeStyle=TH.rgba(col,(0.5-k*0.13)*pul);
      ctx.beginPath();ctx.arc(0,-40,26+k*(16+6*pul),Math.PI*1.15,Math.PI*1.85);ctx.stroke();
    }
    // waveform
    ctx.strokeStyle=TH.rgba(col,0.6);ctx.lineWidth=1.6;
    ctx.beginPath();
    for(let px=-100;px<=100;px+=4){
      const vy=60+Math.sin(px*0.11+now*0.006)*8*Math.sin(px*0.023+now*0.001);
      px===-100?ctx.moveTo(px,vy):ctx.lineTo(px,vy);
    }
    ctx.stroke();
    staffOf('comms').forEach((p,i)=>addFig(120+i*40,30,p,K.shield));
  } else if(rm.key==='diplo'){
    ctx.strokeStyle=TH.rgba(col,0.7);ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,90,40,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=TH.rgba(col,0.10+0.08*pul);ctx.fill();
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillStyle=TH.rgba(col,0.55);ctx.beginPath();ctx.arc(Math.cos(a)*104,Math.sin(a)*48,5,0,7);ctx.fill();}
    staffOf('diplo').forEach((p,i)=>addFig(-40+i*40,-30,p,col));
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
/* cell pips on the kit's health-cell component; colour is a token, or a fn(i,n) for per-level tints */
function pipRow(n,max,color){
  let h='<span class="sr-hp" style="--hp:'+(typeof color==='function'?color(n-1,n):color)+'"><span class="sr-hp__cells">';
  for(let i=0;i<max;i++)h+='<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>';
  return h+'</span></span>';
}
function libWheel(pct){return '<span class="bs-wheel" style="--p:'+pct+'" title="'+pct+'% liberated"><b>'+pct+'</b></span>';}
function locStatsHTML(d,st){
  const sup=Math.floor(st.sup||0),cap=locCap(st),lib=locLib(d,st);
  let h='<div class="bs-stats">'+
    '<div class="bs-stat"><span class="bs-stat__l">Security</span>'+pipRow(d.sec,5,'var(--sr-heg)')+'</div>'+
    '<div class="bs-stat"><span class="bs-stat__l">Access</span>'+pipRow(st.acc||0,5,'var(--sr-shield)')+'</div>'+
    '<div class="bs-stat"><span class="bs-stat__l">Support</span>'+(d.pop&&d.pop!=='0'&&d.pop!=='—'?pipRow(sup,5,supCol(sup-1)):'<span class="sr-faint">no population</span>')+'</div>'+
    '<div class="bs-stat"><span class="bs-stat__l">Liberation</span>'+(lib===null?'<span class="sr-faint">no liberation front charted</span>':libWheel(lib))+'</div>'+
  '</div>';
  if(!d.base&&(st.acc||0)>=2)h+='<p class="sr-fine" style="margin:2px 0 6px">'+(oppsEligible()?'Our intelligence is watching this world for leads.':'Leads from our own intelligence need a <b>staffed Comms Array</b>.')+'</p>';
  if(d.regions){
    h+='<div class="sr-h3">Regions</div>'+d.regions.map(r=>{
      const pct=(st.lib&&st.lib[r.id])||0;
      const state=pct>=100?'liberated':pct>0?'contested':'hegemony';
      const tag=pct>=100?'<span class="sr-tag sr-tag--friend">Liberated</span>':pct>0?'<span class="sr-tag sr-tag--warn">Contested</span>':'<span class="sr-tag sr-tag--foe">Hegemony</span>';
      return '<div class="bs-region is-'+state+'"><span class="bs-region__n">'+r.name+' <em>'+r.kind+'</em></span>'+tag+
        '<span class="sr-meter__track bs-region__bar"><span class="sr-meter__fill" style="display:block;width:'+pct+'%;--c:var(--sr-rebel)"></span><u style="left:'+cap+'%"></u></span><span class="bs-region__p">'+pct+'%</span></div>';
    }).join('');
    const bind=ACC_CAP[st.acc||0]<=ACC_CAP[Math.min(5,sup)]?'Access':'Support';
    if(cap<100)h+='<p class="sr-fine">Liberation is capped at <b>'+cap+'%</b> by '+bind+' (the lower of Access and Support). '+(bind==='Access'?'Spend Intel to deepen Access.':'Local Sources win hearts and minds.')+'</p>';
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
  const t=RM?0:now;
  /* text with an ink halo so it reads over rings and starfield */
  const txt=(s,x,y,col,size,wt,al)=>{
    c2.font=(wt||700)+' '+size+'px '+TH.FONT.ui;c2.textAlign=al||'center';c2.textBaseline='alphabetic';
    c2.lineJoin='round';c2.lineWidth=4;c2.strokeStyle=TH.rgba(K.ink,0.9);c2.strokeText(s,x,y);
    c2.fillStyle=col;c2.fillText(s,x,y);
  };
  /* labels are queued, then placed by priority at the first spot that doesn't collide with an icon or another label */
  const labs=[],occ=[];
  const lab=(s,cands,col,size,wt,pri)=>labs.push({s,cands,col,size,wt,pri});
  const hold=(x,y,r)=>occ.push({x:x-r,y:y-r,w:2*r,h:2*r});
  c2.fillStyle=K.void;c2.fillRect(0,0,w,h);
  // the core glows in the upper right; the verge is dark
  let cg=c2.createRadialGradient(w*0.86,h*0.38,20,w*0.86,h*0.38,w*0.5);
  cg.addColorStop(0,TH.rgba(K.goldHi,0.10));cg.addColorStop(1,TH.rgba(K.goldHi,0));
  c2.fillStyle=cg;c2.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){
    const a=i*0.53,rad=6+i*0.85;
    const x=w*0.55+Math.cos(a)*rad*1.7,y=h*0.45+Math.sin(a)*rad*0.6;
    if(x<0||x>w||y<0||y>h)continue;
    c2.fillStyle=TH.rgba(K.steel,0.05+((i*13)%10)/110);
    c2.beginPath();c2.arc(x,y,((i*7)%3)/2+0.4,0,7);c2.fill();
  }
  const pul=q=>0.5+0.5*Math.sin(t*0.004+q);
  // planets
  for(const d of PLANETDEF){
    const st=pst(d.id);
    const x=w*d.x,y=h*d.y;
    const selHere=srcSel&&srcSel.t==='p'&&srcSel.id===d.id;
    if(!st.known){
      // uncharted signal
      const p=pul(x);
      c2.strokeStyle=TH.rgba(K.psi,0.35+0.4*p);
      c2.lineWidth=1.6;
      c2.beginPath();c2.arc(x,y,6+3*p,0,7);c2.stroke();
      txt('?',x,y+4,TH.rgba(K.psi,0.7+0.3*p),12,800);
      hold(x,y,11);
      lab('Uncharted',[[x,y+24,'center'],[x,y-16,'center'],[x+14,y+4,'left']],K.psi,11,700,4);
      if(selHere){c2.strokeStyle=K.gold;c2.lineWidth=2;c2.beginPath();c2.arc(x,y,16,0,7);c2.stroke();}
      continue;
    }
    if(d.base){
      c2.fillStyle=K.rebel;c2.strokeStyle=K.ink;c2.lineWidth=2;c2.lineJoin='round';
      c2.beginPath();c2.moveTo(x,y-8);c2.lineTo(x+7,y+6);c2.lineTo(x-7,y+6);c2.closePath();c2.stroke();c2.fill();
      hold(x,y,10);
      lab('Haven Rock',[[x,y+22,'center'],[x+14,y+4,'left']],K.rebelHi,12,800,8);
      continue;
    }
    const R=d.core?9:d.kind==='Waystation'?4:6;
    const bodyCol=d.core?K.goldHi:st.access?K.shield:TH.rgba(K.text3,0.8);
    const glow=c2.createRadialGradient(x,y,1,x,y,R*2.4);
    glow.addColorStop(0,d.core?TH.rgba(K.goldHi,0.5):TH.rgba(K.shield,st.access?0.35:0.12));
    glow.addColorStop(1,'rgba(0,0,0,0)');
    c2.fillStyle=glow;c2.beginPath();c2.arc(x,y,R*2.4,0,7);c2.fill();
    c2.fillStyle=bodyCol;
    c2.beginPath();c2.arc(x,y,R,0,7);c2.fill();
    c2.lineWidth=1.5;c2.strokeStyle=K.ink;c2.stroke();
    if(d.core){c2.strokeStyle=TH.rgba(K.goldHi,0.6);c2.lineWidth=1.4;
      c2.beginPath();c2.ellipse(x,y,R+6,R*0.4+2,-0.35,0,Math.PI*2);c2.stroke();}
    if(st.access){
      c2.strokeStyle=TH.rgba(K.shield,0.85);c2.lineWidth=1.6;
      c2.beginPath();c2.arc(x,y,R+4,0,7);c2.stroke();
    } else {
      c2.strokeStyle=TH.rgba(K.text3,0.6);c2.lineWidth=1.4;c2.setLineDash([3,4]);
      c2.beginPath();c2.arc(x,y,R+4,0,7);c2.stroke();c2.setLineDash([]);
      // tiny padlock
      c2.strokeStyle=TH.rgba(K.text2,0.85);c2.lineWidth=1.3;
      c2.strokeRect(x+R+4,y-R-9,6,5);
      c2.beginPath();c2.arc(x+R+7,y-R-9,2.4,Math.PI,0);c2.stroke();
    }
    if(d.regions&&st.access){
      const lb=locLib(d,st)/100;
      c2.strokeStyle=TH.rgba(K.rebel,0.3);c2.lineWidth=2.6;
      c2.beginPath();c2.arc(x,y,R+8,0,7);c2.stroke();
      if(lb>0){c2.strokeStyle=K.rebel;c2.beginPath();c2.arc(x,y,R+8,-Math.PI/2,-Math.PI/2+lb*Math.PI*2);c2.stroke();}
    }
    if(selHere){c2.strokeStyle=K.gold;c2.lineWidth=2;c2.beginPath();c2.arc(x,y,R+13,0,7);c2.stroke();}
    hold(x,y,R+5);
    lab(d.name,[[x,y-R-10,'center'],[x,y+R+16,'center'],[x+R+12,y+4,'left'],[x-R-12,y+4,'right']],st.access?K.text:K.text2,12,700,selHere?9:7);
    lab(st.access?d.kind:('Scout '+d.scout+' intel'),[[x,y+R+17,'center'],[x,y-R-24,'center']],K.text3,11,600,2);
  }
  // intelligence leads: gold diamonds that stay until the job is done
  for(const o of (G.opps||[])){
    if(o.done)continue;
    const pd=pdef(o.loc),x=w*pd.x+20,y=h*pd.y-16,p=pul(x+y);
    c2.fillStyle=TH.rgba(K.gold,0.75+0.25*p);c2.strokeStyle=K.ink;c2.lineWidth=1.5;
    c2.beginPath();c2.moveTo(x,y-7);c2.lineTo(x+5.5,y);c2.lineTo(x,y+7);c2.lineTo(x-5.5,y);c2.closePath();c2.stroke();c2.fill();
    if(!o.found){c2.strokeStyle=TH.rgba(K.gold,0.3+0.3*p);c2.lineWidth=1.2;c2.beginPath();c2.arc(x,y,10+3*p,0,7);c2.stroke();}
    hold(x,y,8);
    lab(o.found?'Lead · on board':'New lead',[[x+11,y+4,'left'],[x-11,y+4,'right'],[x,y+22,'center'],[x,y-12,'center']],K.goldHi,11,700,5);
  }
  // sources ride their worlds
  const hx=w*pdef('haven').x,hy=h*pdef('haven').y;
  for(const s of G.sources){
    if(!s.alive)continue;
    const [x,y]=srcMapPos(s,w,h);
    c2.strokeStyle=TH.rgba(K.go,0.2);c2.lineWidth=1.2;c2.setLineDash([3,5]);
    c2.beginPath();c2.moveTo(hx,hy);c2.lineTo(x,y);c2.stroke();c2.setLineDash([]);
    const hot=s.risk>60,attn=s.pendingEvent||s.signal;
    // a source is a voice, not a world: radio-mast icon (green; orange when it is running hot)
    const col=hot?K.hazard:K.go;
    c2.fillStyle=col;
    c2.beginPath();c2.arc(x,y,2.8,0,7);c2.fill();
    c2.lineWidth=1.6;c2.lineCap='round';
    c2.strokeStyle=TH.rgba(col,0.9);
    for(const rr of [5.5,9]){c2.beginPath();c2.arc(x,y,rr,-Math.PI/4-0.55,-Math.PI/4+0.55);c2.stroke();}
    if(attn){ // signal waiting: waves emanate
      const tt=(t*0.0011)%1;
      for(const k of [0,0.5]){
        const q=(tt+k)%1;
        c2.strokeStyle=TH.rgba(K.go,0.7*(1-q));
        c2.beginPath();c2.arc(x,y,10+q*13,-Math.PI/4-0.75,-Math.PI/4+0.75);c2.stroke();
      }
    }
    c2.lineCap='butt';
    if(srcSel&&srcSel.t==='s'&&srcSel.id===s.id){c2.strokeStyle=K.gold;c2.lineWidth=2;c2.beginPath();c2.arc(x,y,14,0,7);c2.stroke();}
    hold(x,y,10);
    lab(s.name.split(' ').pop(),[[x+15,y+4,'left'],[x-15,y+4,'right'],[x,y+24,'center'],[x,y-14,'center']],hot?K.hazard:K.go,11,700,6);
  }
  labs.sort((a,b)=>b.pri-a.pri);
  const placed=occ.slice();
  for(const l of labs){
    c2.font=l.wt+' '+l.size+'px '+TH.FONT.ui;
    const tw=c2.measureText(l.s).width;
    for(const [x,y,al] of l.cands){
      const rx=al==='left'?x:al==='right'?x-tw:x-tw/2,r={x:rx-3,y:y-l.size,w:tw+6,h:l.size+5};
      if(r.x<2||r.x+r.w>w-2||r.y<2||r.y+r.h>h-2)continue;
      if(placed.some(q=>r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y))continue;
      placed.push(r);txt(l.s,x,y,l.col,l.size,l.wt,al);break;
    }
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
  const t=RM?0:now,nz=RM?()=>0.5:rng;     // reduced motion: a steady line, no flicker
  c2.fillStyle=K.void;c2.fillRect(0,0,w,h);
  for(let i=0;i<240;i++){
    c2.fillStyle=TH.rgba(K.rebel,nz()*0.2);
    c2.fillRect(nz()*w,nz()*h,1.5,1.5);
  }
  const sy=(t*0.05)%h;
  c2.fillStyle=TH.rgba(K.rebel,0.08);c2.fillRect(0,sy,w,7);
  c2.strokeStyle=K.rebel;c2.lineWidth=2;
  c2.beginPath();
  for(let x=0;x<w;x+=3){
    const y=h/2+Math.sin(x*0.08+t*0.01)*6*nz()+(nz()-0.5)*8;
    x===0?c2.moveTo(x,y):c2.lineTo(x,y);
  }
  c2.stroke();
  c2.font='700 11px '+TH.FONT.ui;c2.textAlign='left';
  c2.fillStyle=K.text2;
  c2.fillText('Encrypted · rebel net'+(winArg&&winArg.src?' · '+winArg.src.loc:''),10,15);
}

/* ---------- main render ---------- */
function render(now){
  worldT=now;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const bg=ctx.createRadialGradient(cssW/2,cssH*0.45,60,cssW/2,cssH*0.45,Math.max(cssW,cssH)*0.75);
  bg.addColorStop(0,K.night);bg.addColorStop(1,K.void);
  ctx.fillStyle=bg;ctx.fillRect(0,0,cssW,cssH);
  if(G){
    if(viewRoom)renderRoomView(now);
    else renderBase(now);
  }
  const vg=ctx.createRadialGradient(cssW/2,cssH/2,Math.min(cssW,cssH)*0.4,cssW/2,cssH/2,Math.max(cssW,cssH)*0.75);
  vg.addColorStop(0,TH.rgba(K.ink,0));vg.addColorStop(1,TH.rgba(K.ink,0.5));
  ctx.fillStyle=vg;ctx.fillRect(0,0,cssW,cssH);
  layoutTilePop();
  if(winMode==='sources')drawGalaxy(now);
  if(winMode==='comm'||winMode==='cassIntro')drawCommStatic(now);
  updateGuide();
}

/* ---------- tile popup ---------- */
function startRestore(){
  if(!(G.wreck&&!G.wreck.restored&&!G.wreck.restoring&&G.credits>=240&&G.materials>=160))return false;
  G.credits-=240;G.materials-=160;G.wreck.restoring=2;G.guideHangar=0;
  news('Joss has the hauler’s guts across the cave floor. Two days, he says. “She has a name. It’s Marta.”','a');
  return true;
}
/* expanding a room costs more with every room already in it (+35% per extra tile) */
function buildCostAt(k,r,c){
  const b=BUILDS[k];
  const adj=G.rooms.some(o=>o.key===k&&!o.build&&roomsAdj({r,c,w:1,h:1},o));
  const m=adj?1+0.35*Math.max(0,tilesOf(k)-1):1;
  const out={days:b.days};
  for(const key of ['c','m','s'])if(b[key])out[key]=Math.round(b[key]*m/5)*5;
  return out;
}
function digAt(r,c){
  G.materials-=EXCAVATE.m;
  G.grid[r][c].dig=EXCAVATE.days;
  news('Excavation crew breaks ground. Dust everywhere.','d');
}
function buildAt(r,c,bk){
  const b=buildCostAt(bk,r,c);
  G.credits-=b.c;G.materials-=(b.m||0);G.supplies-=(b.s||0);
  G.grid[r][c]={t:'room',room:bk};
  const nr={id:'rm_'+r+'_'+c,key:bk,r,c,w:1,h:1,up:[],build:{days:b.days}};
  const nb=G.rooms.find(o=>o.key===bk&&!o.build&&roomsAdj(nr,o));
  if(nb)nr.up=(clusterOf(nb).find(x=>(x.up||[]).length)||{up:[]}).up.slice();
  G.rooms.push(nr);
  news('Construction starts: '+ROOMS[bk].name+' ('+b.days+'d).','a');
  sBuild();
}
function openTilePop(r,c){
  const rm=roomAt(r,c);
  tilePopAt=rm?{room:rm}:{r,c};
  renderTilePop();
}
function closeTilePop(){tilePopAt=null;$('tilePop').hidden=true;}
function renderTilePop(){
  if(!tilePopAt)return;
  const el=$('tilePop');
  const head=(title,tag)=>'<div class="sr-window__head"><span class="sr-window__title">'+title+'</span>'+(tag||'')+'<button class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost" data-popclose aria-label="Close">'+IC('clear')+'</button></div>';
  let h='',accent=K.gold;
  if(tilePopAt.room){
    const rm=tilePopAt.room,R=ROOMS[rm.key];
    accent=rcol(rm.key);
    let body='<p class="bs-desc">'+R.desc+'</p>',foot='';
    if(!rm.build){
      if(rm.key==='command')foot+=rbtn('data-open="missions"','Mission Board')+rbtn('data-open="sources"','Source Network');
      if(rm.key==='hangar')body+='<p class="bs-info">Berths '+G.fighters.length+'/'+fighterCap()+(G.wreck&&!G.wreck.restored?' · one derelict hauler'+(G.wreck.restoring?' (restoring, '+G.wreck.restoring+'d)':''):'')+'.</p>';
      if(rm.key==='training')foot+=rbtn('data-open="spec"','Specialty Training');
      if(rm.key==='barracks')body+='<p class="bs-info">Bunks '+bunksUsed()+'/'+bunkCap()+'.</p>';
      if(rm.key==='diplo')foot+=rbtn('data-open="diplo"','Diplomatic Tasks');
      if(rm.key==='store'){
        foot+=rbtn('data-open="gear"','Gear Grid');
        body+='<p class="bs-info">'+C(Math.round(G.credits))+' '+S(Math.round(G.supplies))+' '+M(Math.round(G.materials))+' '+F(Math.round(G.fuel))+' '+I(Math.round(G.intel))+'</p>';
      }
      foot+='<span class="sr-spacer"></span>'+rbtn('data-enterroom','Step inside'+IC('chevron'),'','sr-btn--ghost');
    }
    h=head(R.name,rm.build?'<span class="sr-tag sr-tag--progress">Building, '+rm.build.days+'d left</span>':'')+
      '<div class="sr-window__body">'+body+'</div>'+(foot?'<div class="sr-window__foot bs-foot">'+foot+'</div>':'');
  } else {
    const {r,c}=tilePopAt;
    const cell=G.grid[r][c];
    if(cell.t==='rock'){
      h=head('Bedrock')+'<div class="sr-window__body"><p class="bs-desc">Nobody’s digging through that. Work the faces the rubble already opened.</p></div>';
    } else if(cell.t==='rubble'){
      let body='';
      if(cell.dig)body='<p class="bs-desc">Crew’s on it — '+cell.dig+' day'+(cell.dig>1?'s':'')+' to daylight. Figuratively.</p>';
      else{
        const can=G.materials>=EXCAVATE.m;
        body='<p class="bs-desc">Rubble from the old diggings. Clear it and we’ve got another room.</p>'+
          '<div class="sr-card sr-card--info"><div class="sr-card__top"><span class="sr-card__title">Excavate</span><span class="sr-tag">'+EXCAVATE.days+'d</span></div>'+
          '<div class="bs-build__row"><span class="sr-card__meta">'+M(EXCAVATE.m,!can)+'</span>'+rbtn('data-dig'+(can?'':' title="'+esc(needWhy({m:EXCAVATE.m}))+'"'),'Excavate',!can,'sr-btn--primary sr-btn--sm')+'</div></div>';
      }
      h=head('Collapsed Chamber')+'<div class="sr-window__body">'+body+'</div>';
    } else {
      let body='<p class="bs-desc">Cleared, powered, useless. Give it a job.</p><div class="sr-stack bs-cards">';
      for(const k in BUILDS){
        const b=buildCostAt(k,r,c);
        const afford=G.credits>=b.c&&G.materials>=(b.m||0)&&G.supplies>=(b.s||0);
        const adj=G.rooms.some(o=>o.key===k&&!o.build&&roomsAdj({r,c,w:1,h:1},o));
        body+='<div class="sr-card sr-card--good bs-build"><div class="sr-card__top"><span class="sr-card__title">'+(adj?'Expand the ':'')+ROOMS[k].name+'</span><span class="sr-tag">'+b.days+'d</span></div>'+
          '<div class="sr-card__body">'+ROOMS[k].desc+'</div>'+
          '<div class="bs-build__row"><span class="sr-card__meta">'+bundleHTML(b,WALLET())+'</span>'+rbtn('data-build="'+k+'"'+(afford?'':' title="'+esc(needWhy(b))+'"'),'Build',!afford,'sr-btn--primary sr-btn--sm')+'</div></div>';
      }
      body+='</div>';
      h=head('Empty Chamber')+'<div class="sr-window__body">'+body+'</div>';
    }
  }
  el.style.setProperty('--accent',accent);
  const keep=el.querySelector('.sr-window__body');
  const sc=keep?keep.scrollTop:0;
  el.innerHTML=h;
  const nb=el.querySelector('.sr-window__body');
  if(nb)nb.scrollTop=sc;
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
  {   // clear of the Revolution hub that hangs below the bar (it sits at the screen centre, not the stage centre)
    const hr=$('revHub').getBoundingClientRect(),cr=cv.getBoundingClientRect();
    const hl=hr.left-cr.left-8,hh=hr.right-cr.left+8,hb=hr.bottom-cr.top+8;
    if(px<hh&&px+r.width>hl&&py<hb)py=Math.min(hb,Math.max(8,cssH-r.height-8));
  }
  el.style.left=px+'px';el.style.top=py+'px';
}

/* ---------- flash banner + guided pointers ---------- */
let flashTO=null;
const TOAST={friend:['signal','sr-toast--friend'],action:['star','sr-toast--action'],good:['check','']};
function flashMsg(html,kind){
  const el=$('flashB'),tk=TOAST[kind||'friend']||TOAST.friend;
  el.className='sr-toast'+(tk[1]?' '+tk[1]:'');
  $('flashIco').innerHTML='<use href="#i-'+tk[0]+'"/>';
  $('flashTxt').innerHTML=html;
  el.hidden=false;
  el.style.animation='none';void el.offsetWidth;el.style.animation='';   // restart the pop-in
  clearTimeout(flashTO);
  flashTO=setTimeout(()=>{el.hidden=true;},2800);
}
/* day banner: slams in once per day, then hides itself */
let bannerTO=null;
function showDayBanner(){
  const b=$('dayBanner'),t=$('dayBannerTxt');
  t.textContent='Day '+G.day;
  b.hidden=false;
  t.style.animation='none';void t.offsetWidth;t.style.animation='';
  clearTimeout(bannerTO);
  bannerTO=setTimeout(()=>{b.hidden=true;},RM?400:1400);
}
function pointAt(rc,label){
  const el=$('tutPtr');
  el.hidden=false;
  el.querySelector('.sr-pointer__label').textContent=label;
  el.style.left=(rc.left+rc.width/2)+'px';
  // targets low on the screen get the pointer beneath them, arrow up
  const below=rc.top>innerHeight*0.62;
  el.classList.toggle('below',below);
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
  winMode=mode;winArg=arg||null;cutArm=null;renderWin();$('winsB').hidden=false;syncTabs();
  if(mode==='arrive')setTimeout(()=>{if(winMode==='arrive')closeWin();},RM?400:2800);
}
function closeWin(){
  winMode=null;winArg=null;cutArm=null;$('winsB').hidden=true;syncTabs();markShort();
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
  if(started&&G&&chainPrompt())return;
  if(started&&G&&G.escPending)openEscalation();
}
/* ---------- window furniture (kit chrome; actions live in the foot, primary rightmost) ---------- */
const wX=(attr)=>'<button class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost" '+(attr||'data-close')+' aria-label="Close">'+IC('clear')+'</button>';
const wQ=(attr,title)=>'<button class="sr-btn sr-btn--icon sr-btn--sm" style="--c:var(--sr-go);--ct:var(--sr-ink)" '+attr+' aria-label="'+title+'" title="'+title+'">'+IC('help')+'</button>';
const wHead=(title,o)=>{o=o||{};return '<div class="sr-window__head"><span class="sr-window__title">'+title+'</span>'+(o.tags?'<span class="bs-headtags">'+o.tags+'</span>':'')+(o.q||'')+(o.x===false?'':wX(o.x))+'</div>';};
const wBody=h=>'<div class="sr-window__body">'+h+'</div>';
const wFoot=(btns,note)=>'<div class="sr-window__foot">'+(note?'<span class="sr-window__note">'+note+'</span>':'')+'<span class="sr-spacer"></span>'+(btns||'')+'</div>';
const wTag=(label,tone,icon)=>'<span class="sr-tag'+(tone?' sr-tag--'+tone:'')+'">'+(icon?IC(icon):'')+label+'</span>';
const tutP=t=>'<p class="sr-p">'+t+'</p>';
const tutS=(hd,b)=>'<div class="sr-h3">'+hd+'</div><p class="sr-p">'+b+'</p>';
const choice=(n,attrs,html,dis)=>'<button class="sr-choice" '+attrs+(dis?' disabled':'')+'><span class="sr-kbd sr-choice__key">'+n+'</span><span>'+html+'</span></button>';
const sentence=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1).toLowerCase():s;
const ini=name=>String(name).split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
/* a mission's reward line as chips/tags */
function rewList(m){
  const r=m.rew||{},o=[];
  if(r.cross)o.push(wTag('FT-4 Cross','info','ship'));
  if(r.fighter)o.push(wTag('+1 fighter','info','ship'));
  o.push(...bundleList(r));
  o.push(wTag('+XP','progress'));
  return o;
}
const rewHTML=m=>rewList(m).join(' ');
const riskTag=m=>wTag('Risk '+String(m.riskTxt).toLowerCase(),/high/i.test(m.riskTxt)?'bad':/low/i.test(m.riskTxt)?'good':'warn');
/* gear glyphs are saved with the armory; the kit icon is chosen from the item id */
const GEAR_ICON={akli:'gun',cowboy:'pistol',scatter:'gun',carbine:'gun',shells:'ballistic',blam:'grenade',charge:'grenade',limpet:'hack'};
const gearIcon=a=>GEAR_ICON[a.id]||'loot';
let cutArm=null;
const accentOf={comm:'friend',cassIntro:'friend',candidate:'friend',recruit:'friend',chain:'friend',person:'friend',escalate:'foe',reward:'progress',arrive:'good'};
const sizeOf={sources:'lg',plan:'lg',gear:'lg',srcTutIntro:'sm',srcTut:'sm',comm:'sm',newmission:'sm',opp:'sm',arrive:'sm',reward:'sm',spec:'sm',chain:'sm',locBrief:'sm',escalate:'sm',cassIntro:'sm',recruit:'sm',candidate:'sm',person:'sm',silence:'sm'};

function meterRow(label,val,cls){
  return '<div class="sr-meter'+(cls?' '+cls:'')+'"><span>'+label+'</span><span class="sr-meter__track"><span class="sr-meter__fill" style="display:block;width:'+Math.min(100,val)+'%"></span></span><span class="sr-meter__val">'+Math.round(val)+'</span></div>';
}
function sourceDetailHTML(s){
  const sig=!!(s.pendingEvent||s.signal),hot=s.risk>60;
  const armed=cutArm===s.id;
  return '<div class="sr-card sr-card--friend bs-src"'+(hot?' style="--c:var(--sr-c-warn)"':'')+'>'+
    '<div class="sr-card__top"><span class="sr-avatar" style="width:32px;height:32px">'+IC('signal')+'</span><span class="sr-card__title">'+s.name+'</span>'+wTag('Level '+s.level,'progress')+'</div>'+
    '<div class="sr-card__meta" style="margin:8px 0 0">'+wTag(s.type)+wTag(s.loc)+'</div>'+
    '<div class="sr-card__body bs-bio">“'+s.bio+'”</div>'+
    '<div class="bs-meters">'+meterRow('Cultivation',s.cult)+meterRow('Risk',s.risk,'sr-meter--risk'+(hot?' is-hot':''))+'</div>'+
    '<div class="sr-card__meta">'+bundleHTML(s.inc)+'<span class="sr-faint bs-per">per day</span></div>'+
    '<div class="sr-card__acts">'+
    rbtn('data-sc="'+s.id+'"',IC('signal')+(s.pendingEvent?'Contact — they need an answer':s.signal?'Contact — signal waiting':'Contact'),(s.contacted&&!s.pendingEvent&&!s.signal),'sr-btn--friend'+(sig?' sr-btn--attn':''))+
    rbtn('data-sv="'+s.id+'"','Visit',s.visited)+
    (s.risk>=50?rbtn('data-ss="'+s.id+'"','Silence',false,'sr-btn--danger'):'')+
    rbtn('data-sl="'+s.id+'"',armed?'Confirm: cut loose':'Cut loose',false,'sr-btn--danger')+
    '</div></div>';
}
/* ---------- sources field manual (the ? button) ---------- */
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
/* dossier header shared by the personnel file and the recruit offer */
function dossierHead(p,extra,noRank){
  return '<div class="bs-dz"><span class="sr-level" style="--p:'+Math.round(p.xp*100)+'" aria-label="Level '+p.level+'"><b>'+p.level+'</b></span>'+
    '<div><div class="bs-dz__name">'+p.name+'</div><div class="bs-dz__tags">'+(noRank?'':wTag(rankFor(p),'action'))+(extra||'')+'</div><div class="sr-faint bs-dz__role">'+p.role+'</div></div></div>'+
    '<p class="sr-p bs-bio">“'+p.bio+'”</p>'+moraleRow(p)+traitCard(p)+skillsCard(p);
}
/* rank, progress toward the next one, and the buttons that hand it out */
function rankCard(p){
  if(p.auto)return '';
  const nx=Rebel.nextRank(p),need=Rebel.needMissions(p),have=Math.min(need,p.rankMissions||0);
  let body=nx?('Missions toward <b>'+nx+'</b>: '+have+' / '+need):'Top of the ladder.';
  const acts=[];
  if(Rebel.canPromote(p))acts.push(rbtn('data-promote="'+p.id+'"','Promote to '+nx,false,'sr-btn--sm sr-btn--primary'));
  if(Rebel.canCommission(p))acts.push(rbtn('data-commission="'+p.id+'" title="One-way: they restart on the officer ladder as '+Rebel.OFFICER[0]+'"','Commission as officer',false,'sr-btn--sm'));
  else if(!p.off&&(p.rank||0)>=4&&p.level<5)body+='<br><span class="sr-faint">Officer commission needs level 5.</span>';
  else if(!p.off&&p.level>=5)body+='<br><span class="sr-faint">Officer commission needs the rank of Sergeant or better.</span>';
  return '<div class="sr-h3">Rank</div><div class="sr-card sr-card--action"><div class="sr-card__top"><span class="sr-card__title">'+rankFor(p)+'</span>'+(p.off?wTag('Officer','friend'):'')+'<span class="bs-from">'+(p.missions||0)+' mission'+((p.missions||0)===1?'':'s')+' served</span></div>'+
    '<div class="sr-card__body">'+body+'</div>'+(acts.length?'<div class="sr-card__acts" style="margin-top:8px">'+acts.join('')+'</div>':'')+'</div>';
}
/* morale out of 100 with its band; it nudges aim and Cool in the field */
function moraleRow(p){
  if(p.auto||p.morale===undefined)return '';
  const b=Rebel.mband(p);
  return '<div class="sr-loot" style="margin:0 0 12px" title="Morale rises with wins and rest, falls with injuries and losses. At 0 they leave."><span>Morale</span><b'+(b.tone?' class="bs-'+b.tone+'"':'')+'>'+Math.round(p.morale)+' <span class="sr-faint">'+b.n+'</span></b></div>';
}
/* skill bars out of 50: the level sets the base, mission experience adds the rest */
function skillsCard(p){
  const ks=Rebel.skillKeys(p);
  if(!ks.length)return '';
  return '<div class="sr-h3">Skills</div><div class="sr-stack">'+ks.map(k=>{
    const v=Rebel.skill(p,k),S=Rebel.SKILLS[k];
    return '<div class="sr-loot" title="'+esc(S.d)+'"><span>'+S.n+'</span><b>'+v+'<span class="sr-faint"> / '+Rebel.SKILL_CAP+'</span></b></div>';
  }).join('')+'</div>';
}
/* the Character Trait card: designer copy plus a plain-language effect (greyed until the effect is wired in) */
function traitCard(p){
  const t=Rebel.CTK[p.charTrait];
  if(!t)return '';
  return '<div class="sr-h3">Character</div><div class="sr-card sr-card--progress"><div class="sr-card__top"><span class="sr-card__title">'+esc(t.n)+'</span>'+(t.live?'':wTag('Effect soon','info'))+'</div>'+
    '<div class="sr-card__body">'+esc(Rebel.traitText(t,p))+'<br><span class="sr-faint">'+esc(t.e)+'</span></div></div>';
}
function renderWin(){
  const card=$('winCardB');
  let h='',size=sizeOf[winMode]||'',accent=accentOf[winMode]||'';
  if(winMode==='sources'){
    const alive=G.sources.filter(s=>s.alive);
    const accessN=G.planets.filter(p=>p.access).length;
    if(!srcSel)srcSel={t:'s',id:alive.length?alive[0].id:null};
    let detail='';
    if(srcSel.t==='s'){
      const s=alive.find(x=>x.id===srcSel.id);
      detail=s?sourceDetailHTML(s):'<div class="sr-empty">No sources. We’re blind out there.</div>';
    } else {
      const d=pdef(srcSel.id),st=pst(srcSel.id);
      if(d&&st){
        const cls=st.access?' sr-card--info':st.known?' sr-card--info is-locked':' sr-card--progress';
        const canScout=G.intel>=d.scout,canRaise=G.intel>=accessCost(d,st);
        detail='<div class="sr-card'+cls+' bs-planet"><div class="sr-card__top">'+
          '<span class="sr-card__title">'+(st.known?d.name:'Uncharted Signal')+'</span>'+wTag(st.access?'Access':'No access',st.access?'good':'')+'</div>'+
          '<div class="sr-card__meta" style="margin:8px 0 0">'+(st.known?wTag(d.kind)+(d.pop?wTag('pop '+d.pop):''):wTag('the Verge · origin unknown'))+'</div>'+
          '<div class="sr-card__body bs-bio">'+(st.scouted?d.sit:st.known?'Everyone’s heard of it. Nobody’s told us what matters. Scouts would.':'A world out there we know nothing about. Yet.')+'</div>'+
          (st.access?locStatsHTML(d,st):'')+
          '<div class="sr-card__acts">'+
          (st.access?'':rbtn('data-scout="'+d.id+'"','Scout & gain access'+I(d.scout,!canScout),!canScout,'sr-btn--primary'+(canScout?' sr-btn--attn':''))+
            (canScout?'':'<span class="sr-fine bs-inline">not enough intel — work the network</span>'))+
          (st.access&&(st.acc||0)<5?rbtn('data-raise="'+d.id+'"','Raise Access to '+((st.acc||0)+1)+I(accessCost(d,st),!canRaise),!canRaise)+
            (canRaise?'':'<span class="sr-fine bs-inline">more Hegemony presence, more Intel</span>'):'')+
          '</div></div>';
        // sources stationed there
        const here=alive.filter(s2=>(SRCPOS[s2.id]||'veray')===d.id);
        if(st.access&&here.length)detail+=here.map(sourceDetailHTML).join('');
      }
    }
    h=wHead('Galaxy',{tags:wTag(accessN+' worlds accessible','info')+wTag('Network '+alive.length+'/'+sourceCap()),q:wQ('data-srchelp','How sources work')})+
      wBody('<canvas id="galaxyCv"></canvas>'+
      '<p class="sr-fine bs-center">core worlds burn bright and cost dear · faint signals are uncharted · gold diamonds are intelligence leads · '+I('')+' buys access</p>'+
      '<div class="sr-stack bs-cards">'+detail+'</div>');
  }
  else if(winMode==='srcTutIntro'){
    h=wHead('Build Your Network',{q:wQ('data-srchelp','Learn more'),x:false})+wBody(
      tutP('Your Sources are the foundation of your intelligence network.')+
      tutS('1. Find Sources','Discover people willing to help the rebellion.')+
      tutS('2. Cultivate Them','Build their trust to increase their level and improve what they provide.')+
      tutS('3. Use Their Access','Gain Money, Supplies, Intel and new opportunities.')+
      tutS('4. Take the Risk','The more valuable a Source becomes, the more important it is to keep them safe.')+
      tutS('5. Know When to Let Go','A Source who has become too dangerous may need to be Cut Loose — or Silenced.')+
      tutP('A strong intelligence network will give the rebellion the information and resources it needs to survive.')+
      tutP('But every person in that network is a person who can be discovered...')+
      '<p class="sr-fine">Click the '+wTag('?','good')+' button to learn more.</p>')+
      wFoot(rbtn('data-srchelp','Field manual',false,'sr-btn--ghost')+rbtn('data-srctut-done','Got it',false,'sr-btn--primary'));
  }
  else if(winMode==='srcTut'){
    const pg=Math.max(0,Math.min(TUT_PAGES.length-1,(winArg&&winArg.page)||0));
    const P=TUT_PAGES[pg];
    h=wHead(P.t,{x:'data-tut-close'})+wBody(P.h)+
      wFoot('<div class="sr-btngroup">'+rbtn('data-tut-prev aria-label="Previous page"',IC('back'),pg===0,'sr-btn--icon')+rbtn('data-tut-next aria-label="Next page"',IC('chevron'),pg===TUT_PAGES.length-1,'sr-btn--icon')+'</div>','Page '+(pg+1)+' of '+TUT_PAGES.length);
  }
  else if(winMode==='comm'){
    const {src,payload}=winArg;
    let body='<canvas id="commStatic" class="sr-signal"></canvas>',foot='';
    const q=t=>'<div class="sr-quote">'+(/^<b>/.test(t)?'':'<div class="sr-quote__who">'+IC('signal')+src.name+'</div>')+t+'</div>';
    if(payload.event){
      body+=q(payload.event.text)+payload.event.opts.map((o,i)=>choice(i+1,'data-ans="'+i+'"',o[0])).join('');
    } else {
      body+=q(payload.lines[0])+payload.lines.slice(1).map(l=>'<p class="sr-p" style="margin:12px 0 0">'+l+'</p>').join('');
      if(payload.signal){
        body+='<div class="sr-tag sr-tag--bad bs-tagwrap"><span><b>Signal:</b> '+payload.signal.text+'</span></div>';
        foot=rbtn('data-follow','Acknowledge',false,'sr-btn--primary');
      } else foot=rbtn('data-close','Close channel.',false,'sr-btn--primary');
    }
    h=wHead('Comm burst',{tags:wTag(src.name,'friend')})+wBody(body)+wFoot(foot,'carrier locked · lag 4.2s · voices masked');
  }
  else if(winMode==='newmission'){
    const m=winArg;
    h=wHead('New mission',{tags:wTag(m.from||'the network')})+wBody(
      '<div class="sr-card"><div class="sr-card__top"><span class="sr-card__title">'+m.name+'</span></div>'+
      '<div class="sr-card__body">'+m.desc+'</div>'+
      '<div class="sr-card__meta" style="margin-bottom:0">'+(whereHTML(m)?wTag(whereHTML(m)):'')+wTag(m.days+' days','action')+riskTag(m)+rewHTML(m)+'</div></div>'+
      (canAttempt(m)?'':precondHTML(m)))+
      wFoot(rbtn('data-close','Later',false,'sr-btn--ghost')+rbtn('data-mplan="'+m.id+'"','Plan mission',!canPlan(m),'sr-btn--primary'));
  }
  else if(winMode==='opp'){
    const o=winArg,d=pdef(o.loc),mm=G.missions.find(x=>x.oppId===o.id);
    if(o.tid&&MTYPE_DEFS[o.tid]){
      const T=MTYPE_DEFS[o.tid];
      h=wHead('Intelligence lead',{tags:wTag(d.name)})+wBody(
        '<div class="sr-card"><div class="sr-card__top"><span class="sr-card__title">'+T.name+'</span></div>'+
        '<div class="sr-card__meta" style="margin:8px 0 0">'+wTag(whereHTML({loc:o.loc,region:o.region}))+wTag('from our own intelligence','info')+'</div>'+
        '<div class="sr-card__body">'+oppText(T.hook,o)+'</div></div>'+
        '<div class="sr-h3">Expected</div><div class="sr-card__meta">'+bundleHTML(T.rew)+wTag('+XP','progress')+(o.region?wTag('pushes liberation in '+d.regions.find(r=>r.id===o.region).name,'friend'):'')+'</div>')+
        wFoot(rbtn('data-close','Later',false,'sr-btn--ghost')+(mm?rbtn('data-mplan="'+mm.id+'"','Plan mission',false,'sr-btn--primary'):rbtn('data-oppadd="'+o.id+'"','Add to the Mission Board',false,'sr-btn--primary')));
    } else h=wHead('Intelligence lead')+wBody('<p class="sr-p">This lead has gone cold.</p>')+wFoot(rbtn('data-close','Close',false,'sr-btn--primary'));
  }
  else if(winMode==='arrive'){
    h=wHead(winArg.win?'Returning to Haven Rock':'Limping back to Haven Rock',{x:false})+
      wBody('<div class="bs-arrsky"><i class="bs-arrstar s1"></i><i class="bs-arrstar s2"></i><i class="bs-arrstar s3"></i><div class="bs-arrship">'+IC('ship')+'</div><div class="bs-arrrock"></div></div>')+
      wFoot(rbtn('data-close','Skip'));
  }
  else if(winMode==='reward'){
    const rp=winArg,m=rp.m;
    const gotHTML=a=>/^<span class="sr-cost/.test(a)?a:wTag(a,'info');
    const crew=rp.people.map(p=>'<div class="sr-loot"><span>'+p.name+'</span><b class="bs-rowtags">'+(p.state==='lost'?wTag('Lost','bad'):p.state==='injured'?wTag('Injured','bad'):'')+(p.xp?wTag('XP +'+Math.round(p.xp*100)+'%','progress'):'')+'</b></div>').join('');
    h=wHead(rp.win?'Mission Complete':'Mission Failed')+
      '<div class="sr-brief__hero bs-hero"><div>'+wTag(whereHTML(m)||'Haven Rock','progress')+'<h3 class="sr-brief__title">'+m.name+'</h3></div>'+
      '<span class="sr-stamp '+(rp.win?'sr-stamp--action':'sr-stamp--bad')+'">'+(rp.win?'Secured':'Mission failed')+'</span></div>'+
      wBody(
      (rp.win?'<div class="sr-h3">Objectives</div>'+(m.objectives||['Complete the operation']).filter(o=>o[0]!=='(').map(o=>'<div class="sr-obj is-done"><span class="sr-obj__mark">'+IC('check')+'</span><span>'+o+'</span></div>').join(''):
        '<p class="sr-p">The job stays on the board. Regroup and try again.</p>')+
      '<div class="sr-h3">'+(rp.win?'Rewards':'Recovered')+'</div><div class="sr-card__meta">'+(rp.got.length?rp.got.map(gotHTML).join(' '):'<span class="sr-faint">Nothing.</span>')+'</div>'+
      (crew?'<div class="sr-h3">Crew</div><div class="sr-stack">'+crew+'</div>':'')+
      (rp.cr?'<div class="sr-h3">The revolution</div><div class="sr-stack"><div class="sr-loot"><span>Revolution progress</span><b>+'+rp.cr.gain+'</b></div>'+
        (rp.cr.first?'<div class="sr-loot"><span>First operation in '+(pdef(m.loc)||{}).name+'</span><b>noticed</b></div>':'')+
        (rp.cr.lib?'<div class="sr-loot"><span>'+rp.cr.lib.region+' liberation</span><b>'+rp.cr.lib.from+'% → '+rp.cr.lib.to+'%'+(rp.cr.lib.capped?' (capped)':'')+'</b></div>':'')+'</div>':''))+
      wFoot(rbtn('data-close','Continue',false,'sr-btn--primary'));
  }
  else if(winMode==='spec'){
    const row=(role,label)=>{
      const t=inTraining(role);
      return '<div class="sr-slot'+(t?' is-filled':'')+'" style="cursor:default"><span><span class="sr-slot__label">'+label+'</span>'+(t?'<span class="sr-slot__name">'+t.name+'</span><span class="bs-sub">'+SPECNAME[t.specTrain.k]+' · '+t.specTrain.days+' day'+(t.specTrain.days>1?'s':'')+' left</span>':'Free')+'</span></div>';
    };
    const cards=role=>{
      const busy=!!inTraining(role);
      const els=G.people.filter(p=>specRole(p)===role&&p.level>=3&&!p.spec&&p.assign!=='spec');
      if(!els.length)return '<div class="sr-empty">Nobody ready. A specialty needs level 3.</div>';
      return '<div class="sr-stack">'+els.map(p=>{
        const why=p.injured?'injured':p.assign==='mission'?'on mission':busy?'the slot is busy':G.credits<SPEC_COST?'needs '+SPEC_COST+' credits':'';
        return '<div class="sr-card sr-card--progress"><div class="sr-card__top"><span class="sr-card__title">'+p.name+'</span><span class="bs-from">'+rankFor(p)+' · level '+p.level+'</span></div>'+
          '<div class="sr-card__acts" style="margin-top:8px">'+SPECS[role].filter(x=>x.live).map(x=>rbtn('data-spec="'+p.id+':'+x.k+'" title="'+esc(x.d)+'"',x.n,!!why,'sr-btn--sm')).join('')+'</div>'+
          (why?'<p class="sr-fine" style="margin-top:8px">'+sentence(why)+'</p>':'')+'</div>';
      }).join('')+'</div>';
    };
    const later=role=>'<p class="sr-fine">Later: '+SPECS[role].filter(x=>!x.live).map(x=>x.n).join(', ')+'.</p>';
    h=wHead('Specialty Training')+wBody(
      '<p class="sr-p">At level 3 a rebel can train into a specialty ('+SPEC_DAYS+' days, '+C(SPEC_COST)+'). They are out of action while they train.</p>'+
      (hasRoom('training')?'':'<p class="sr-p bs-bad">No Training Hall built yet.</p>')+
      '<div class="sr-h3">Practice range · soldiers</div>'+row('Soldier','Practice range')+cards('Soldier')+later('Soldier')+
      '<div class="sr-h3">Flight simulator · pilots</div>'+row('Pilot','Flight simulator')+cards('Pilot')+later('Pilot'));
  }
  else if(winMode==='chain'){
    const id=winArg.id,CH=CHAINS[id],c=G.chains[id],step=CH.steps[c.i];
    const paras=step.text.map(t=>'<p class="sr-p">'+t+'</p>').join('');
    let btns='',foot='';
    if(step.k==='alert')btns=choice(1,'data-chain="'+id+':yes"','<b>'+step.yes+'</b>')+choice(2,'data-chain="'+id+':no"',step.no);
    else if(step.k==='contact'){
      const full=G.sources.filter(x=>x.alive).length>=sourceCap();
      foot=rbtn('data-chain="'+id+':ok"',step.ok,full,'sr-btn--primary');
      if(full)btns='<p class="sr-fine bs-bad">The network is full. Build another Intelligence Center room or let a source go, then answer.</p>';
    } else if(step.k==='decode')btns=step.choices.map((ch,i)=>choice(i+1,'data-chain="'+id+':pick:'+i+'"','<b>'+ch[0]+'</b><br><span class="sr-faint">'+ch[2]+'</span>')).join('');
    h=wHead(CH.name,{tags:wTag(step.title,'friend'),x:false})+wBody(paras+btns)+(foot?wFoot(foot):'');
  }
  else if(winMode==='gear'){
    const all=G.armory.filter(a=>a.n>0);
    const used=all.reduce((n,a)=>{const m=gearMeta(a);return n+m.w*m.h;},0),cap=gearCapacity();
    const shown=all.filter(a=>GEARCAT==='All'||gearMeta(a).cat===GEARCAT);
    const gcols=ROOT.clientWidth<=900?4:GEAR_COLS;
    const lay=gearLayout(shown,gcols);
    h=wHead('Gear Grid')+wBody(
      '<p class="sr-p">Slots used '+used+'/'+cap+(used>cap?' <span class="bs-bad">— overflowing; build another Storeroom</span>':'')+'. Bigger kit takes more slots; duplicates stack.</p>'+
      '<div class="bs-chips">'+GEAR_CATS.map(c=>rbtn('data-gearcat="'+c+'" aria-pressed="'+(GEARCAT===c)+'"',c,false,'sr-btn--sm')).join('')+'</div>'+
      '<div class="bs-geargrid" style="grid-template-columns:repeat('+gcols+',1fr)">'+
      lay.map(x=>'<div class="bs-gearcell" title="'+esc(x.a.desc||'')+'" style="grid-column:'+(x.c+1)+' / span '+x.m.w+';grid-row:'+(x.r+1)+' / span '+x.m.h+'">'+
        '<span class="bs-gearcell__n">'+IC(gearIcon(x.a))+'<span>'+x.a.name+'</span></span><span class="bs-sub">'+(x.m.w>1?x.m.sub+' · ':'')+'×'+x.a.n+'</span></div>').join('')+
      '</div>'+(lay.length?'':'<div class="sr-empty">Nothing in this category.</div>'));
  }
  else if(winMode==='diplo'){
    const cap=dipCapacity(),out=G.dip||[];
    const dp=staffOf('diplo')[0];
    h=wHead('Diplomatic Tasks',{tags:wTag('Teams out '+out.length+'/'+cap,'info')})+wBody(
      '<p class="sr-p">'+(dp?'<b>'+dp.name+'</b> runs the Quarter':'<span class="bs-bad">No Chief Diplomat posted.</span> Assign a Support rebel to the post from their file.')+
      '. Each task costs '+bundleHTML(DIP_COST)+' and takes '+DIP_DAYS+' days; it raises local Support by ½ a flag ('+(dp&&dp.level>=3?'a whole flag with a seasoned diplomat':'a level 3 diplomat earns a whole flag')+').</p>'+
      (out.length?'<div class="sr-h3">Out in the field</div><div class="sr-stack">'+out.map(t=>'<div class="sr-tag sr-tag--info">'+pdef(t.loc).name+' · '+t.days+' day'+(t.days>1?'s':'')+' left</div>').join('')+'</div>':'')+
      '<div class="sr-h3">Worlds where we have Access</div><div class="sr-stack">'+
      dipTargets().map(d=>{
        const st=pst(d.id),why=canDip(d.id);
        return '<div class="sr-card sr-card--friend"><div class="sr-card__top"><span class="sr-card__title">'+d.name+'</span><span style="margin-left:auto">'+pipRow(Math.floor(st.sup||0),5,supCol(Math.floor(st.sup||0)-1))+'</span></div>'+
          '<div class="sr-card__meta" style="margin:8px 0">'+bundleHTML(DIP_COST,WALLET())+wTag(DIP_DAYS+'d')+'</div>'+
          '<div class="sr-card__acts">'+rbtn('data-dip="'+d.id+'"'+(why?' title="'+esc(why)+'"':''),'Send diplomats',!!why)+(why?'<span class="sr-fine bs-inline">'+why+'</span>':'')+'</div></div>';
      }).join('')+'</div>');
  }
  else if(winMode==='locBrief'){
    const d=pdef(winArg.id),st=pst(winArg.id);
    h=wHead('Location briefing',{tags:wTag(d.name)})+wBody(
      '<div class="sr-card sr-card--info"><p class="bs-quote">'+(d.brief||d.sit)+'</p>'+
      '<div class="sr-card__meta">'+wTag('Population '+(d.pop||'—'))+(d.regions?wTag('Regions '+d.regions.length):'')+wTag(d.kind)+'</div>'+
      locStatsHTML(d,st)+'</div>'+
      '<div class="sr-h3">Pathfinder report</div>'+
      winArg.lines.map(l=>'<p class="sr-p">'+l+'</p>').join(''))+
      wFoot(rbtn('data-close','Continue',false,'sr-btn--primary'));
  }
  else if(winMode==='escalate'){
    h=wHead('Revolution Level 2')+wBody('<div class="bs-esc"><div class="bs-escrings"><i></i><i></i><i></i><span class="bs-escn">2</span></div>'+
      '<span class="sr-stamp sr-stamp--foe">Noticed</span>'+
      '<p class="sr-p" style="margin:18px auto 10px">Somewhere in the Hegemony’s bloated institutions, a report has reached the wrong desk. Your raids were never just crime. The Bureau has a file on you now, and the file has a name.</p>'+
      '<p class="sr-fine">Level 2 content is coming in a future build. Keep building the revolution.</p></div>')+
      wFoot(rbtn('data-close','Continue',false,'sr-btn--primary'));
  }
  else if(winMode==='cassIntro'){
    h=wHead('Incoming transmission',{x:false})+wBody(
      '<canvas id="commStatic" class="sr-signal"></canvas>'+
      '<div class="sr-quote"><div class="sr-quote__who">'+IC('signal')+'Cass Wender</div>“Told you the rock was worth it. This channel stays open — I hear things worth hearing, and now you’re somebody worth telling. Raise me when you’re ready to listen.”</div>'+
      '<p class="sr-p" style="margin-top:14px">First contact on the wire: <b>Cass Wender</b>, the smuggler who flew you in. Open the <b>Source Network</b> and raise him.</p>')+
      wFoot(rbtn('data-close','Got it',false,'sr-btn--primary'),'carrier locked · unregistered freighter · voice known');
  }
  else if(winMode==='recruit'){
    const {p,must,line}=winArg;
    const full=bunksUsed()>=bunkCap();
    h=wHead('New Recruit!',{x:must?false:'data-rec-no'})+wBody(
      (line?'<div class="sr-quote" style="margin:0 0 16px">'+line+'</div>':'')+
      dossierHead(p,'',true)+
      '<div class="sr-h3">Terms</div><p class="sr-p">One bunk ('+bunksUsed()+'/'+bunkCap()+' filled)'+
        (p.role==='Support'?' · will run a station once assigned.':p.role==='Soldier'?' · arms from the rack.':' · a stick looking for a ship.')+'</p>'+
      (full?'<p class="sr-p bs-bad">No bunks free — build a quarters annex first.</p>':''))+
      wFoot((must?'':rbtn('data-rec-no','Dismiss',false,'sr-btn--ghost'))+rbtn('data-rec-accept','Recruit',full&&!must,'sr-btn--primary'));
  }
  else if(winMode==='candidate'){
    const cd=CANDS[winArg]||CANDS.marr;
    const inc=bundleHTML(cd.inc);
    h=wHead('Approach',{tags:wTag('Potential source','friend')})+wBody(
      '<div class="sr-quote" style="margin-top:0"><div class="sr-quote__who">'+IC('signal')+cd.name+'</div>'+cd.pitch+' Network capacity '+G.sources.filter(s=>s.alive).length+'/'+sourceCap()+'.</div>'+
      choice(1,'data-cand="'+cd.id+'"','Take them on. ('+inc+'<span class="bs-per">/day · exposure +4</span>)')+
      choice(2,'data-cand="no"','Too dangerous. Burn the contact.'));
  }
  else if(winMode==='missions'){
    let list='';
    for(const m of G.missions){
      const cls=m.state==='done'?' sr-card--good':m.state==='locked'?' is-locked':m.state==='prog'?' sr-card--info':'';
      const tag=m.state==='done'?wTag(sentence(m.meta||'COMPLETE'),'good'):m.state==='prog'?wTag(m.progress.daysLeft+'d remaining','info'):m.state==='locked'?wTag('Locked'):m.state==='sim'?wTag('Simulator','progress'):wTag('Available','friend');
      list+='<div class="sr-card'+cls+'"><div class="sr-card__top"><span class="sr-card__title">'+m.name+'</span>'+(m.from?'<span class="bs-from">'+m.from+'</span>':'')+tag+'</div>'+
        '<div class="sr-card__body">'+m.desc+'</div>';
      if(m.state==='avail'){
        list+='<div class="sr-card__meta">'+(whereHTML(m)?wTag(whereHTML(m)):'')+wTag(m.days+' days','action')+riskTag(m)+rewHTML(m)+'</div>'+
          '<div class="sr-card__acts">'+rbtn('data-mplan="'+m.id+'"','Plan mission',false,'sr-btn--primary')+'</div>';
      }
      if(m.state==='sim')list+='<div class="sr-card__acts">'+rbtn('data-simulator','Enter simulator')+'</div>';
      list+='</div>';
    }
    h=wHead('Mission Board')+wBody('<div class="sr-stack bs-cards">'+list+'</div><p class="sr-fine">Missions come from the network. Work your sources; follow their signals.</p>');
  }
  else if(winMode==='plan'){
    const m=winArg;
    h=planHTML(m);
  }
  else if(winMode==='person'){
    const p=winArg;
    const pct=Math.round(p.xp*100);
    let b=dossierHead(p,(p.spec?wTag(specOf(p),'friend'):'')+(p.injured?wTag('Injured '+p.injured+' days','bad'):''));
    if(p.role==='Pilot'){
      const f=G.fighters.find(x=>x.id===p.ship);
      if(f){
        const st=SHIPSTATS[f.cls],n=Math.round(f.hull/20);
        b+='<div class="sr-h3">Assigned craft</div><div class="sr-card sr-card--info"><div class="sr-card__top"><span class="sr-card__title">'+f.name+'</span>'+(f.out?wTag('On mission','info'):'')+'</div>'+
          '<div class="sr-card__body" style="margin-bottom:8px">'+st.label+'<br>Shields '+st.shd+' · Armour '+st.arm+' · Hull '+st.hull+'<br>'+st.wpns.map(w=>w[0]).join(' · ')+'</div>'+
          '<span class="sr-hp'+(f.hull<35?' sr-hp--low':f.hull<60?' sr-hp--mid':'')+'"><span class="sr-hp__cells">'+[0,1,2,3,4].map(i=>'<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>').join('')+'</span><span class="sr-hp__num">Hull '+Math.round(f.hull)+'%</span></span></div>';
      }
    } else if(p.role==='Soldier'){
      b+='<div class="sr-h3">Equipment</div><div class="sr-stack">';
      for(const eq of (p.equip||[])){
        const a=G.armory.find(x=>x.id===eq);
        if(a)b+='<div class="sr-loot"><span style="display:flex;gap:10px;align-items:center">'+IC(gearIcon(a))+'<span><b>'+a.name+'</b>'+(a.desc?'<span class="bs-sub">'+a.desc+'</span>':'')+'</span></span></div>';
      }
      b+='</div>';
      if(p.auto)b+='<p class="sr-p">Integral autocannon arm. The face-screen is permanently, cheerfully, on.</p>';
      else if(!(p.equip||[]).length)b+='<div class="sr-empty">Empty-handed. Fix that before the ground war.</div>';
    } else {
      const st=p.assign.startsWith('station:')?p.assign.slice(8):null;
      b+='<div class="sr-h3">Station</div><p class="sr-p">'+
        (st?('On station: <b class="bs-good">'+ROOMS[st].name+'</b> — '+STAFFABLE[st].post+'. '+STAFFABLE[st].perk+'.')
           :'Unassigned. A room without its operator underperforms — post them somewhere.')+'</p>';
    }
    b+=rankCard(p);
    if(!p.injured&&p.assign!=='mission'){
      b+='<div class="sr-h3">Assignment</div><div class="bs-chips">'+
        rbtn('data-as="rest:'+p.id+'" aria-pressed="'+(p.assign==='rest')+'"','Rest',false,'sr-btn--sm')+
        rbtn('data-as="train:'+p.id+'" aria-pressed="'+(p.assign==='train')+'"'+(hasRoom('training')?'':' title="Needs a Training Hall"'),'Train',!hasRoom('training'),'sr-btn--sm');
      if(p.role==='Support'){
        for(const key in STAFFABLE){
          if(!hasRoom(key))continue;
          const holders=staffOf(key);
          const mine=p.assign==='station:'+key;
          const taken=!mine&&holders.length>=postSlots(key);
          b+=rbtn('data-as="station:'+key+':'+p.id+'" aria-pressed="'+mine+'" '+
            (taken?'title="'+esc(holders.map(x=>x.name).join(', '))+' hold'+(holders.length>1?'':'s')+' this post"':'title="'+esc(STAFFABLE[key].perk)+'"'),STAFFABLE[key].post,taken,'sr-btn--sm');
        }
      }
      b+='</div>';
    }
    h=wHead('Personnel file')+wBody(b)+wFoot(rbtn('data-close','Close',false,'sr-btn--primary'),'XP '+pct+'% to level '+Math.min(Rebel.LEVEL_CAP,p.level+1)+(p.level>=Rebel.LEVEL_CAP?' (maxed)':''));
  }
  else if(winMode==='silence'){
    const s=winArg;
    h=wHead('Silence',{tags:wTag(s.name)})+wBody(
      '<div class="sr-quote" style="margin-top:0"><div class="sr-quote__who">'+IC('signal')+'The assassin</div>The assassin waits by the airlock, helmet under one arm.<br><br>“Say the word, Commander. '+
      s.name.split(' ')[0]+' stops being a risk tonight — and stops being anything else, too.”</div>'+
      choice(1,'data-kill="'+s.id+'"','Do it. The rebellion is bigger than one frightened '+s.type.split(' ')[0].toLowerCase()+'.')+
      choice(2,'data-close','Not yet. Back into the shadows.'));
  }
  else if(winMode==='news'){
    h=wHead('All news')+wBody('<div class="sr-log" id="log" aria-live="polite"></div>');
  }
  card.className='sr-window'+(size?' sr-window--'+size:'')+(accent?' sr-window--'+accent:'');
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
  card.innerHTML=h;
  const ttl=card.querySelector('.sr-window__title');if(ttl)card.setAttribute('aria-label',ttl.textContent);
  if(winMode==='news')renderNews();
  markWin();
}

/* ---------- top bar, rail, tabs ---------- */
const ROMAN=['I','II','III','IV','V'];
const RESKEYS=[['c','credits','resC','resCW'],['s','supplies','resS','resSW'],['m','materials','resM','resMW'],['f','fuel','resF','resFW'],['i','intel','resI','resIW']];
let lastRes=null,lastRenown=null,risingTO=null;
/* a value that rose floats its delta above the pill for a moment */
function resDelta(wrapId,n){
  const w=$(wrapId);
  const old=w.querySelector('.sr-res__delta');if(old)old.remove();
  const d=document.createElement('span');d.className='sr-res__delta';d.textContent='+'+n;
  w.appendChild(d);
  setTimeout(()=>d.remove(),1200);
}
/* pills turn orange while a cost on screen can't be paid (a plan's fuel, a scouting cost) */
function markShort(){
  if(!G)return;
  const short={};
  if(winMode==='plan'&&PL){
    const need=plFuel()||minFuel(PL.m);
    if(G.fuel<need)short.f=1;
    if(PL.drop&&G.supplies<DROP_COST)short.s=1;
  } else if(winMode==='newmission'&&winArg){
    if(G.fuel<minFuel(winArg))short.f=1;
  } else if(winMode==='sources'&&srcSel&&srcSel.t==='p'){
    const d=pdef(srcSel.id),st=pst(srcSel.id);
    if(d&&st){
      if(!st.access){if(G.intel<d.scout)short.i=1;}
      else if((st.acc||0)<5&&G.intel<accessCost(d,st))short.i=1;
    }
  }
  for(const [k,,,wid] of RESKEYS)$(wid).classList.toggle('is-short',!!short[k]);
}
function markWin(){markShort();}
/* the three tabs show where the player is; Base is "no window open" */
function syncTabs(){
  const sel=winMode?(winMode==='missions'?'navMissions':(winMode==='sources'||winMode==='srcTutIntro'||winMode==='srcTut')?'navSources':null):'navBase';
  for(const id of ['navBase','navSources','navMissions'])$(id).setAttribute('aria-selected',String(id===sel));
}
const roleIcon={Pilot:'pilot',Soldier:'soldier',Marine:'marine'};
function syncUI(){
  clampSupplies();
  $('resSW').title='Supplies '+Math.round(G.supplies)+' / '+supCap()+' (Storerooms raise the cap)';
  $('dayLbl').textContent=G.day;
  const cur={c:Math.round(G.credits),s:Math.round(G.supplies),m:Math.round(G.materials),f:Math.round(G.fuel),i:Math.round(G.intel)};
  for(const [k,,vid,wid] of RESKEYS){
    $(vid).textContent=cur[k];
    if(lastRes&&cur[k]>lastRes[k])resDelta(wid,cur[k]-lastRes[k]);
  }
  lastRes=cur;
  // Revolution hub: level numeral, progress ring, tooltip
  const lvl=G.revLevel||1,hub=$('revHub'),pr=Math.max(0,Math.min(100,G.renown||0));
  $('revNum').textContent=ROMAN[Math.max(0,Math.min(4,lvl-1))];
  hub.style.setProperty('--p',pr);
  hub.setAttribute('aria-label','Revolution Level '+lvl+(lvl>=2?'':', '+Math.round(pr)+'% toward Level 2'));
  $('revTip').innerHTML=lvl>=2?
    '<b>Revolution Level 2</b>The Hegemony has noticed. Level 2 content is a future build.<br>Network exposure: '+Math.round(G.risk)+'.':
    '<b>Revolution Level 1</b>Criminals, as far as the Hegemony cares.<br>Progress '+Math.round(G.renown)+'/100 toward Level 2: missions across many worlds, liberated regions, local Support and a growing network.<br>Network exposure: '+Math.round(G.risk)+'.';
  if(lastRenown!==null&&(G.renown||0)>lastRenown){
    hub.classList.remove('is-rising');void hub.offsetWidth;hub.classList.add('is-rising');
    clearTimeout(risingTO);risingTO=setTimeout(()=>hub.classList.remove('is-rising'),1200);
  }
  lastRenown=G.renown||0;
  const srcAttn=G.sources.filter(s=>s.alive&&(s.pendingEvent||s.signal||s.risk>70)).length
    +(G.onboard==='contact'?1:0); // the first contact is waiting — point the new player at the network
  $('srcBadge').hidden=!srcAttn;$('srcBadge').textContent=srcAttn;
  $('navSources').classList.toggle('is-calling',srcAttn>0);
  const misAvail=G.missions.filter(m=>m.state==='avail').length;
  $('misBadge').hidden=!misAvail;$('misBadge').textContent=misAvail;
  const prog=G.missions.filter(m=>m.state==='prog').length;
  const building=G.rooms.filter(r=>r.build).length;
  const note=[prog?'<b>'+prog+'</b> mission'+(prog>1?'s':'')+' out':null,building?'<b>'+building+'</b> building':null].filter(Boolean).join(' · ');
  $('dockNote').innerHTML=note;$('dockNote').hidden=!note;
  /* crew rail */
  const crewRow=p=>{
    const pilot=p.role==='Pilot',marine=p.role==='Marine',sup=!pilot&&!marine&&p.role!=='Soldier';
    const tone=pilot?'var(--sr-gold)':marine?'var(--sr-c-progress)':sup?'var(--sr-c-good)':'';
    const ico=roleIcon[p.role]||'support';
    let tag;
    if(p.injured)tag='<span class="sr-tag sr-tag--bad" title="Injured, '+p.injured+' day'+(p.injured>1?'s':'')+'" aria-label="Injured, '+p.injured+' days">'+IC('heart')+p.injured+' day'+(p.injured>1?'s':'')+'</span>';
    else if(p.assign==='mission')tag='<span class="sr-tag sr-tag--info">On mission</span>';
    else if(p.assign==='train'||p.assign==='spec')tag='<span class="sr-tag sr-tag--progress">Training</span>';
    else if(p.assign.startsWith('station:'))tag='<span class="sr-tag sr-tag--good">'+(STLBL[p.assign.slice(8)]||'Post')+'</span>';
    else tag='<span class="sr-tag">Resting</span>';
    return '<button class="sr-unit" data-person="'+p.id+'"'+(tone?' style="--c:'+tone+'"':'')+'><span class="sr-avatar'+(pilot?' sr-avatar--pilot':'')+'"'+(tone&&!pilot?' style="--c:'+tone+'"':'')+'>'+ini(p.name)+'<span class="sr-avatar__role">'+IC(ico)+'</span></span>'+
      '<span class="sr-unit__main"><span class="sr-unit__top"><span class="sr-unit__name">'+p.name+'</span>'+(Rebel.canPromote(p)?'<span class="bs-good" title="Due a promotion" aria-label="Due a promotion">\u25b2</span>':'')+(!p.auto&&p.morale<=40?'<span class="bs-bad" title="'+(p.morale<=20?'Very low':'Low')+' morale" aria-label="'+(p.morale<=20?'Very low':'Low')+' morale">\u25bc</span>':'')+'</span><span class="sr-unit__role" title="'+esc(rankFor(p))+', level '+p.level+'">'+rankFor(p)+', level '+p.level+'</span></span><span class="sr-unit__side">'+tag+'</span></button>';
  };
  const grp=(listId,countId,people,emptyMsg)=>{
    $(listId).innerHTML=people.length?people.map(crewRow).join(''):'<div class="sr-empty">'+emptyMsg+'</div>';
    $(countId).textContent=people.length||'';
  };
  grp('pilotList','pilotCount',G.people.filter(p=>p.role==='Pilot'),'No pilots yet. Recruit them through your sources in the Galaxy.');
  grp('soldierList','soldierCount',G.people.filter(p=>p.role==='Soldier'),'No soldiers yet. Recruit them through your sources in the Galaxy.');
  const marines=G.people.filter(p=>p.role==='Marine');
  $('marSec').hidden=!marines.length;
  grp('marineList','marineCount',marines,'');
  grp('supportList','supportCount',G.people.filter(p=>p.role!=='Pilot'&&p.role!=='Soldier'&&p.role!=='Marine'),'No support crew yet. Recruit them through your sources in the Galaxy.');
  $('fleetList').innerHTML=G.fighters.length?G.fighters.map(f=>{
    const n=Math.round(f.hull/20),hc=f.hull<35?' sr-hp--low':f.hull<60?' sr-hp--mid':'';
    const cells='<span class="sr-hp'+hc+'"><span class="sr-hp__cells">'+[0,1,2,3,4].map(i=>'<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>').join('')+'</span><span class="sr-hp__num">Hull '+Math.round(f.hull)+'%</span></span>';
    const tag=f.out?'<span class="sr-tag sr-tag--friend">Out</span>':f.hull<100?'<span class="sr-tag sr-tag--warn">'+IC('work')+'Repairing</span>':'';
    return '<button class="sr-unit" data-fighter="'+f.id+'" style="--c:var(--sr-shield)"><span class="sr-avatar" style="--c:var(--sr-shield)">'+IC('ship')+'</span>'+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+f.name+'</span>'+(f.out?'':cells)+'</span><span class="sr-unit__side">'+tag+'</span></button>';
  }).join(''):'<div class="sr-empty">'+(G.wreck&&!G.wreck.restored?'No ships yet. Restore the derelict hauler from the Hangar.':'No ships yet. A mission can win us one.')+'</div>';
  $('fleetCount').textContent=G.fighters.length||'';
  $('crewHint').textContent=SR.touch?'Tap anyone for their file':'Double-click anyone for their file';
  $('fleetHint').textContent=SR.touch?'Tap a ship to step into the hangar':'Double-click a ship to step into the hangar';
  if(viewRoom)renderRoomBar();
  if(winMode)renderWin();
  if(tilePopAt)renderTilePop();
  syncTabs();markShort();
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
  if(shell.classList.contains('is-drawer-open'))setDrawer(false);
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
  if(t.hasAttribute('data-popclose')){closeTilePop();return;}
  if(t.hasAttribute('data-dig')&&tilePopAt&&!tilePopAt.room){
    const {r,c}=tilePopAt;
    digAt(r,c);
    renderTilePop();syncUI();return;
  }
  const bk=t.getAttribute('data-build');
  if(bk&&tilePopAt&&!tilePopAt.room){
    const {r,c}=tilePopAt;
    buildAt(r,c,bk);
    closeTilePop();syncUI();return;
  }
  if(t.hasAttribute('data-enterroom')&&tilePopAt&&tilePopAt.room){const rm=tilePopAt.room;closeTilePop();enterRoomView(rm);return;}
  const open=t.getAttribute('data-open');
  if(open){closeTilePop();openWin(open);return;}
});
$('roomViewBar').addEventListener('click',ev=>{
  const t=ev.target.closest('button');
  if(!t)return;
  sClick();
  if(t.hasAttribute('data-backbase')){exitRoomView();syncUI();return;}
  const pat=t.getAttribute('data-patrol');
  if(pat){startPatrol(pat);renderRoomBar();syncUI();return;}
  const up=t.getAttribute('data-up');
  if(up&&viewRoom){startUpgrade(viewRoom,up);renderRoomBar();syncUI();return;}
  const open=t.getAttribute('data-open');
  if(open){openWin(open);return;}
});
$('winsB').addEventListener('dragstart',ev=>{
  const c=ev.target.closest('[data-rid]');
  if(c){
    const rid=c.getAttribute('data-rid');
    ev.dataTransfer.setData('text/plain',rid);ev.dataTransfer.effectAllowed='move';
    if(winMode==='plan'&&PL)for(const sl of PL.slots)if(!PL.v[sl.key]&&plAccepts(sl,rid)){const el=$('winCardB').querySelector('[data-slot="'+sl.key+'"]');if(el)el.classList.add('is-target');}
  }
});
$('winsB').addEventListener('dragend',()=>{for(const el of $('winCardB').querySelectorAll('.sr-slot.is-target'))el.classList.remove('is-target');});
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
    if(best){srcSel=best;cutArm=null;sClick();renderWin();}
    return;
  }
  if(winMode==='plan'&&PL){
    const slotEl=ev.target.closest('[data-slot]');
    if(slotEl){const k=slotEl.getAttribute('data-slot');if(PL.v[k]){delete PL.v[k];sClick();renderWin();}return;}
    const chip=ev.target.closest('[data-rid]');
    if(chip){plPlace(chip.getAttribute('data-rid'));sClick();renderWin();return;}
    const dc=ev.target.closest('[data-drop]');
    if(dc){PL.drop=!PL.drop;sClick();renderWin();return;}
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
  if(sl){
    const s=G.sources.find(x=>x.id===sl);
    if(!s)return;
    // cutting a source loose is permanent: the first click arms the button, the second does it
    if(cutArm!==sl){cutArm=sl;renderWin();setTimeout(()=>{if(cutArm===sl){cutArm=null;if(winMode==='sources')renderWin();}},4000);return;}
    cutArm=null;srcCutLoose(s);return;
  }
  const kill=t.getAttribute('data-kill');
  if(kill){const s=G.sources.find(x=>x.id===kill);if(s)srcSilence(s);return;}
  if(winMode==='comm'){
    const {src,payload}=winArg;
    const ans=t.getAttribute('data-ans');
    if(ans!==null&&payload.event){srcAnswer(src,+ans);return;}
    if(t.hasAttribute('data-follow')){
      const sig=src.signal;
      if(sig&&(sig.kind==='recruit'||sig.kind==='recruitS'||sig.kind==='recruitP'||sig.kind==='recruitSera')){
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
    if(bunksUsed()>=bunkCap()&&!must){news('No bunks free. '+p.name+' can’t stay.','h');closeWin();syncUI();return;}
    if(p.id&&p.id.indexOf('rec')===0)G.recruitN++;
    G.people.push(Rebel.migrate(p));mood();
    if(Rebel.has(p,'wealthy')){G.credits+=250;news('<b>'+p.name+'</b> arrives with family money: '+C(250)+' into the war chest.','g');}
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
  if(t.hasAttribute('data-addasset')&&PL){plAddAsset();renderWin();return;}
  if(t.hasAttribute('data-rmasset')&&PL){plRemoveAsset();renderWin();return;}
  const amode=t.getAttribute('data-assetmode');
  if(amode&&PL){const [i,md]=amode.split(':');PL.assets[+i].mode=md;renderWin();return;}
  const chn=t.getAttribute('data-chain');
  if(chn){const [cid,act,idx]=chn.split(':');chainAct(cid,act,idx===undefined?undefined:+idx);return;}
  const gcat=t.getAttribute('data-gearcat');
  if(gcat){GEARCAT=gcat;renderWin();return;}
  const dipBtn=t.getAttribute('data-dip');
  if(dipBtn){startDip(dipBtn);saveSnap();syncUI();renderWin();return;}
  const promoId=t.getAttribute('data-promote');
  if(promoId){
    const p=G.people.find(x=>x.id===promoId),was=p&&rankFor(p),now=p&&Rebel.promote(p);
    if(now){Rebel.moraleBump(p,5,'promo');mood();news('<b>'+p.name+'</b> promoted from '+was+' to <b>'+now+'</b>.','g');sAlert();sBuild();saveSnap();syncUI();renderWin();}
    return;
  }
  const comId=t.getAttribute('data-commission');
  if(comId){
    const p=G.people.find(x=>x.id===comId),was=p&&rankFor(p),now=p&&Rebel.commission(p);
    if(now){Rebel.moraleBump(p,8,'promo');mood();news('<b>'+p.name+'</b> is commissioned: '+was+' to <b>'+now+'</b>.','g');sAlert();sBuild();saveSnap();syncUI();renderWin();}
    return;
  }
  const specBtn=t.getAttribute('data-spec');
  if(specBtn){const [pid,k]=specBtn.split(':');startSpec(pid,k);return;}
  const oppadd=t.getAttribute('data-oppadd');
  if(oppadd){
    const o=(G.opps||[]).find(x=>x.id===oppadd);
    if(o&&o.tid&&!G.missions.some(m=>m.oppId===o.id)){
      o.found=true;
      const m=spawnMission(o.tid,{loc:o.loc,region:o.region,target:o.target,oppId:o.id});
      pushMission(m,true);sAlert();
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
  if(SR.touch||(lastTap.key===key&&now-lastTap.t<380)){
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
$('navBase').addEventListener('click',()=>{
  sClick();
  if(winMode)closeWin();
  else if(viewRoom){exitRoomView();syncUI();}
  else closeTilePop();
});
$('navSources').addEventListener('click',()=>{sClick();openWin('sources');});
$('navMissions').addEventListener('click',()=>{sClick();openWin('missions');});
$('newsBtn').addEventListener('click',()=>{sClick();openWin('news');});
$('dayBtn').addEventListener('click',()=>{if(started)advanceDay();});
/* phones: the rail is a drawer behind the people tab */
const shell=ROOT.querySelector('.sr-shell');
function setDrawer(on){shell.classList.toggle('is-drawer-open',!!on);$('drawerBtn').setAttribute('aria-expanded',String(!!on));}
$('drawerBtn').addEventListener('click',()=>{sClick();setDrawer(!shell.classList.contains('is-drawer-open'));});
/* top-bar menu: all news, sound, restart (which asks first) */
let restartArm=false;
const menu=$('baseMenu');
function closeMenu(){
  menu.hidden=true;$('menuBtn').setAttribute('aria-expanded','false');
  restartArm=false;$('restartBtn').querySelector('span').textContent='Restart';
}
$('menuBtn').addEventListener('click',ev=>{
  sClick();
  if(menu.hidden){menu.hidden=false;$('menuBtn').setAttribute('aria-expanded','true');if(ev.detail===0)$('menuNews').focus();}
  else closeMenu();
});
document.addEventListener('click',ev=>{
  if(!menu.hidden&&!ev.target.closest('#baseMenu')&&!ev.target.closest('#menuBtn'))closeMenu();
});
$('menuNews').addEventListener('click',()=>{closeMenu();sClick();openWin('news');});
function syncSound(){
  const off=A.muted();
  $('soundBtn').setAttribute('aria-label',off?'Sound off':'Sound on');
  $('soundBtn').title=off?'Sound off':'Sound on';
  $('soundBtn').querySelector('use').setAttribute('href','#i-sound'+(off?'off':'on'));
  $('menuSound').querySelector('use').setAttribute('href','#i-sound'+(off?'off':'on'));
  $('menuSound').querySelector('span').textContent='Sound: '+(off?'off':'on');
}
function toggleSound(){A.setMuted(!A.muted());syncSound();}
$('soundBtn').addEventListener('click',toggleSound);
$('menuSound').addEventListener('click',toggleSound);
addEventListener('keydown',ev=>{
  if(SR.active!=='base')return;
  if(ev.key==='Escape'){
    if(!menu.hidden){closeMenu();return;}
    if(winMode)closeWin();
    else if(shell.classList.contains('is-drawer-open'))setDrawer(false);
    else if(viewRoom){exitRoomView();syncUI();}
    else closeTilePop();
    return;
  }
  // Enter presses the window's gold button
  if(winMode&&ev.key==='Enter'&&!(document.activeElement&&/^(BUTTON|A|INPUT)$/.test(document.activeElement.tagName))){
    const pb=$('winCardB').querySelector('.sr-window__foot .sr-btn--primary:not(:disabled)');
    if(pb){ev.preventDefault();pb.click();}
    return;
  }
  // 1-4 pick dialogue answers
  if(winMode&&/^[1-4]$/.test(ev.key)&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){
    const opts=[...$('winCardB').querySelectorAll('.sr-choice')];
    const b=opts[+ev.key-1];
    if(b&&!b.disabled){ev.preventDefault();b.click();}
  }
});
$('restartBtn').addEventListener('click',()=>{
  if(!started){closeMenu();return;}
  if(!restartArm){restartArm=true;$('restartBtn').querySelector('span').textContent='Click again to erase your save';return;}
  closeMenu();
  SR.wipeSave();
  G=newGame();closeWin();closeTilePop();exitRoomView();
  feed=[];renderFeed();lastRes=null;lastRenown=null;
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
function ablePilots(){return G.people.filter(p=>p.role==='Pilot'&&!p.injured&&p.assign!=='mission'&&p.assign!=='spec');}
function grafReady(){return G.fighters.some(f=>f.cls==='graf'&&!f.out&&f.hull>=60);}
/* ---------- mission requirements & the planning board ---------- */
function reqOf(m){return m.req||MTYPES[typeOf(m)].req(m);}
function soldierPool(){return G.people.filter(p=>(p.role==='Soldier'||p.role==='Marine')&&!p.injured&&p.assign!=='mission'&&p.assign!=='spec');}
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
    out.push({ok:soldierPool().length>=r.team,label:r.team+' rebel soldier'+(r.team>1?'s':'')+' available'});
    out.push({ok:ablePilots().length>=np,label:np+' pilot'+(np>1?'s':'')+' available'+(r.prize?' — one to fly the hauler, one for the prize':'')});
    out.push({ok:transportPool().length>=T,label:T+' hauler'+(T>1?'s':'')+' available'});
  } else {
    const n=r.ships||r.team;
    out.push({ok:ablePilots().length>=r.team,label:r.team+' starfighter pilot'+(r.team>1?'s':'')+' available'});
    out.push({ok:shipPool(r).length>=n,label:n+' '+(r.starfighter?'starfighter':'ship')+(n>1?'s':'')+' available'+(r.starfighter?' — the Marta won’t do':'')});
  }
  for(const it of r.items||[]){
    const have=(it.ids||[it.id]).reduce((n,id)=>n+((G.armory.find(a=>a.id===id)||{}).n||0),0);
    out.push({ok:have>=it.n,label:it.n+' '+it.label+(it.n>1?'s':'')+' in the armory <span class="sr-faint">(have '+have+')</span>'});
  }
  if(r.spec){
    out.push({ok:soldierPool().some(p=>p.spec===r.spec.key),soft:true,label:'1 '+r.spec.label+' available',hint:r.spec.hint});
  }
  const need=minFuel(m);
  out.push({ok:G.fuel>=need,label:'Fuel for the sortie: '+F(need,G.fuel<need)+' <span class="sr-faint">(have '+Math.floor(G.fuel)+')</span>'});
  return out;
}
function canAttempt(m){return precondList(m).every(c=>c.ok);}
/* a missing specialty does not block opening the briefing; it explains itself there */
function canPlan(m){return precondList(m).every(c=>c.ok||c.soft);}
function precondHTML(m){
  return '<div class="sr-h3">Before you can go</div>'+precondList(m).map(c=>
    '<div class="sr-check'+(c.ok?'':' is-no')+'"><span class="sr-check__box">'+IC(c.ok?'check':'clear')+'</span><span>'+c.label+'</span>'+
    (!c.ok&&c.hint?'<span class="sr-check__why">'+c.hint+'</span>':'')+'</div>').join('');
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
const DROP_COST=160;   // supplies for a Supply Drop
const ridPre=acc=>(acc==='soldier'||acc==='rsoldier'||acc==='pilot'||acc==='apilot')?'p:':'f:';
let PL=null;
function openPlan(m){
  const r=reqOf(m);
  PL={m,req:r,v:{},slots:[],drop:false,assets:[]};
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
    return (slot.acc==='soldier'||slot.acc==='rsoldier')?(p.role==='Soldier'||p.role==='Marine'):(slot.acc==='pilot'||slot.acc==='apilot')?p.role==='Pilot':false;
  }
  const f=G.fighters.find(x=>x.id===id);if(!f)return false;
  return slot.acc==='vehicle'?!!SEATS[f.cls]:slot.acc==='ship'?shipPool(PL.req).some(x=>x.id===id):slot.acc==='assetship'?(!f.out&&f.hull>=60):false;
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
function plSpecOk(){
  const sp=PL.req.spec;
  if(!sp)return true;
  return PL.slots.some(sl=>sl.acc==='soldier'&&PL.v[sl.key]&&(G.people.find(p=>p.id===PL.v[sl.key])||{}).spec===sp.key);
}
function plAddAsset(){
  if(!PL.req.transport||PL.assets.length>=2)return;
  const i=PL.assets.length;
  PL.assets.push({mode:'doorgun'});
  PL.slots.push({key:'as'+i+'s',acc:'assetship',label:'Support ship'},{key:'as'+i+'p',acc:'apilot',label:'Support pilot'});
}
function plRemoveAsset(){
  if(!PL.assets.length)return;
  const i=PL.assets.length-1;
  PL.slots=PL.slots.filter(sl=>!sl.key.startsWith('as'+i));
  for(const k of Object.keys(PL.v))if(k.startsWith('as'+i))delete PL.v[k];
  PL.assets.pop();
}
/* a spare Graf can reinforce (carries up to 2 soldiers); a starfighter strafes; otherwise a door gunner */
function plAssetMode(i){
  const f=G.fighters.find(x=>x.id===PL.v['as'+i+'s']);
  if(!f)return null;
  return SEATS[f.cls]?PL.assets[i].mode:'strafe';
}
function plSyncAssets(){
  PL.assets.forEach((a,i)=>{
    const want=plAssetMode(i)==='reinforce';
    const has=PL.slots.some(sl=>sl.key==='as'+i+'r0');
    if(want&&!has)for(let k=0;k<2;k++)PL.slots.push({key:'as'+i+'r'+k,acc:'rsoldier',label:'Reinforcement '+(k+1)});
    if(!want&&has){
      PL.slots=PL.slots.filter(sl=>!sl.key.startsWith('as'+i+'r'));
      for(const k of Object.keys(PL.v))if(k.startsWith('as'+i+'r'))delete PL.v[k];
    }
  });
}
const plDropOk=()=>!PL.drop||G.supplies>=DROP_COST;
function plComplete(){return PL.slots.every(sl=>PL.v[sl.key])&&plSpecOk();}
function plFuel(){
  let t=0;
  for(const sl of PL.slots)if(sl.acc==='vehicle'||sl.acc==='ship'||sl.acc==='assetship'){const f=G.fighters.find(x=>x.id===PL.v[sl.key]);if(f)t+=fuelOf(f);}
  return t;
}
function plAutoFill(){
  for(const k of Object.keys(PL.v))if(!/^as/.test(k))delete PL.v[k];
  const m=PL.m;
  for(const sl of PL.slots){
    if(PL.v[sl.key]||/^as/.test(sl.key))continue;
    const used=plUsedIds();
    let pool=[];
    if(sl.acc==='soldier')pool=soldierPool().sort((a,b)=>((b.spec===(PL.req.spec||{}).key)?1:0)-((a.spec===(PL.req.spec||{}).key)?1:0)).map(p=>'p:'+p.id);
    else if(sl.acc==='pilot')pool=ablePilots().map(p=>'p:'+p.id);
    else if(sl.acc==='vehicle')pool=transportPool().map(f=>'f:'+f.id);
    else pool=shipPool(PL.req).map(f=>'f:'+f.id);
    const pick=pool.find(r=>!used.has(r.slice(2)));
    if(pick)plSet(sl.key,pick);
  }
}
const shipAvatar=(extra)=>'<span class="sr-avatar" style="--c:var(--sr-shield)'+(extra||'')+'">'+IC('ship')+'</span>';
const personAvatar=p=>'<span class="sr-avatar'+(p.role==='Pilot'?' sr-avatar--pilot':'')+'">'+ini(p.name)+'</span>';
const personSub=p=>rankFor(p)+', level '+p.level+(p.spec?' · '+specOf(p):'');
const shipSub=f=>SHIPSTATS[f.cls].label.split(' · ')[0];
/* a filled slot: avatar, label, name, a line of detail */
function slotOccHTML(sl){
  const id=PL.v[sl.key];
  if(!id)return null;
  if(sl.acc==='vehicle'||sl.acc==='ship'||sl.acc==='assetship'){
    const f=G.fighters.find(x=>x.id===id);
    return shipAvatar()+'<span><span class="sr-slot__label">'+sl.label+'</span><span class="sr-slot__name">'+f.name+'</span><span class="bs-sub">'+shipSub(f)+' · hull '+f.hull+'% · '+F(fuelOf(f))+(SEATS[f.cls]?' · seats '+SEATS[f.cls]:'')+'</span></span>';
  }
  const p=G.people.find(x=>x.id===id);
  return personAvatar(p)+'<span><span class="sr-slot__label">'+sl.label+'</span><span class="sr-slot__name">'+p.name+'</span><span class="bs-sub">'+personSub(p)+'</span></span>';
}
const slotHTML=sl=>{
  const occ=slotOccHTML(sl);
  return '<div class="sr-slot'+(occ?' is-filled':'')+'" data-slot="'+sl.key+'"'+(occ?' draggable="true" data-rid="'+ridPre(sl.acc)+PL.v[sl.key]+'"':'')+'>'+
    (occ?occ+'<button class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost sr-slot__clear" aria-label="Remove" tabindex="-1">'+IC('clear')+'</button>':
      '<span><span class="sr-slot__label">'+sl.label+'</span>Click or drag a roster entry here</span>')+'</div>';
};
/* roster entries: draggable, one click places them in the first slot that takes them */
function chipHTML(rid){
  const kind=rid[0],id=rid.slice(2);
  if(kind==='f'){
    const f=G.fighters.find(x=>x.id===id);
    return '<div class="sr-unit" role="button" tabindex="0" draggable="true" data-rid="'+rid+'" style="--c:var(--sr-shield)">'+shipAvatar()+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+f.name+'</span><span class="sr-unit__role">'+shipSub(f)+'</span></span><span class="sr-unit__side">'+F(fuelOf(f))+'</span></div>';
  }
  const p=G.people.find(x=>x.id===id);
  return '<div class="sr-unit" role="button" tabindex="0" draggable="true" data-rid="'+rid+'"'+(p.role==='Pilot'?' style="--c:var(--sr-gold)"':'')+'>'+personAvatar(p)+
    '<span class="sr-unit__main"><span class="sr-unit__name">'+p.name+'</span><span class="sr-unit__role">'+personSub(p)+'</span></span><span class="sr-unit__side"><span class="sr-tag sr-tag--friend">Available</span></span></div>';
}
/* people who can't go right now stay on the list, greyed, with the reason */
function offHTML(p){
  const why=p.injured?'Injured, '+p.injured+' day'+(p.injured>1?'s':''):p.assign==='mission'?'On mission':p.assign==='spec'?'Training':'';
  return '<div class="sr-unit is-down"'+(p.role==='Pilot'?' style="--c:var(--sr-gold)"':'')+'>'+personAvatar(p)+
    '<span class="sr-unit__main"><span class="sr-unit__name">'+p.name+'</span><span class="sr-unit__role">'+personSub(p)+'</span></span><span class="sr-unit__side"><span class="sr-tag sr-tag--bad">'+why+'</span></span></div>';
}
function planHTML(m){
  plSyncAssets();
  const r=PL.req,used=plUsedIds();
  const objs=(m.objectives||['Complete the operation']).map(o=>'<div class="sr-obj'+(o[0]==='('?' sr-obj--note':'')+'"><span class="sr-obj__mark"></span><span>'+o+'</span></div>').join('');
  const hangarNote=(r.transport&&!grafReady()&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring)?
      '<p class="sr-fine bs-gold">The derelict hauler in the hangar can fly again — restoring it is a base job: '+C(240)+' '+M(160)+' and two days.</p>':
    (r.transport&&!grafReady()&&G.wreck&&G.wreck.restoring)?
      '<p class="sr-fine bs-gold">Hauler restoration under way — '+G.wreck.restoring+' day'+(G.wreck.restoring>1?'s':'')+' left. Advance the day.</p>':'';
  const slotBox=(keys,title)=>{
    const sls=PL.slots.filter(sl=>keys.includes(sl.acc));
    if(!sls.length)return '';
    return '<div class="sr-h3">'+title+'</div><div class="sr-stack">'+sls.map(slotHTML).join('')+'</div>';
  };
  const avail=(list,pre)=>list.filter(x=>!used.has(x.id)).map(x=>chipHTML(pre+x.id)).join('')||'<div class="sr-empty">None available.</div>';
  const away=list=>list.map(offHTML).join('');
  const soldiersAll=G.people.filter(p=>p.role==='Soldier'||p.role==='Marine'),pilotsAll=G.people.filter(p=>p.role==='Pilot');
  const roster='<div class="sr-h3">Roster</div><div class="sr-stack">'+
    (r.transport?'<span class="bs-rh">Soldiers</span>'+avail(soldierPool(),'p:')+away(soldiersAll.filter(p=>!soldierPool().includes(p)&&(p.injured||p.assign==='mission'||p.assign==='spec'))):'')+
    '<span class="bs-rh">Pilots</span>'+avail(ablePilots(),'p:')+away(pilotsAll.filter(p=>!ablePilots().includes(p)&&(p.injured||p.assign==='mission'||p.assign==='spec')))+
    '<span class="bs-rh">'+(r.transport?'Transports':'Ships')+'</span>'+avail(r.transport?transportPool():shipPool(r),'f:')+
    (PL.assets.length?'<span class="bs-rh">Support ships</span>'+avail(G.fighters.filter(f=>!f.out&&f.hull>=60),'f:'):'')+
    '</div>';
  const left='<div class="planL">'+
    '<p class="sr-p">'+m.desc+'</p>'+
    '<div class="sr-card__meta">'+(whereHTML(m)?wTag(whereHTML(m)+' · '+MTYPES[typeOf(m)].label,'info'):'')+(m.from?wTag(m.from):'')+'</div>'+
    '<div class="sr-h3">Objectives</div>'+objs+
    precondHTML(m)+
    '<div class="sr-h3">Reward</div><div class="sr-card__meta">'+rewHTML(m)+'</div>'+hangarNote+
    '</div><div class="planRo">'+roster+'</div>';
  const right='<div class="planR">'+
    (r.transport?slotBox(['soldier'],'Team'):'')+
    (r.transport?slotBox(['vehicle','pilot'],'Transport & pilots'):slotBox(['pilot','ship'],'Flight'))+
    (r.transport?assetsHTML():'')+
    '</div>';
  const fuel=plFuel(),ok=plComplete()&&canAttempt(m)&&G.fuel>=fuel&&plDropOk();
  const empty=PL.slots.filter(sl=>!PL.v[sl.key]).length;
  const note=plComplete()?'Fuel burned: '+F(fuel,G.fuel<fuel)+' of '+Math.floor(G.fuel):(PL.slots.every(sl=>PL.v[sl.key])&&!plSpecOk()?'The team needs a '+PL.req.spec.label+'.':'Fill every slot to go. '+empty+' slot'+(empty>1?'s':'')+' empty.');
  const needHangar=r.transport&&!grafReady()&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring;
  return wHead('Plan: '+m.name,{tags:riskTag(m)+wTag(m.days+' day'+(m.days>1?'s':''),'action')})+
    '<div class="sr-window__body bs-plan">'+left+right+'</div>'+
    wFoot((needHangar?rbtn('data-gohangar','Go to the hangar',false,'sr-btn--attn'):'')+
      rbtn('data-autofill','Auto-fill')+
      rbtn('id="launchBtn"'+(ok?'':' title="'+esc(note.replace(/<[^>]+>/g,''))+'"'),(m.lead?'Start':'Launch'),!ok,'sr-btn--primary sr-btn--lg'),note);
}
function assetsHTML(){
  let h='<div class="sr-h3">Fire support</div><div class="sr-stack">';
  const can=G.supplies>=DROP_COST;
  h+='<div class="sr-slot'+(PL.drop?' is-filled':'')+(can||PL.drop?'':' is-off')+'" '+(can||PL.drop?'data-drop':'')+'><span><span class="sr-slot__label">Supply drop</span><span class="sr-slot__name">Supply Drop</span>'+
    '<span class="bs-sub">'+S(DROP_COST,!can)+' · 5 stims, 2 BLAM frags, 2 makeshift rocket launchers'+(can?'':' · not enough supplies')+'</span></span></div>';
  PL.assets.forEach((a,i)=>{
    const mode=plAssetMode(i);
    h+=PL.slots.filter(sl=>sl.key.startsWith('as'+i)).map(slotHTML).join('');
    if(mode)h+=(mode==='strafe'?'<p class="sr-fine" style="margin:0">Strafing Run: a starfighter rakes a line of the battlefield.</p>':
      '<div class="bs-chips">'+rbtn('data-assetmode="'+i+':doorgun" aria-pressed="'+(a.mode==='doorgun')+'"','Door Gunner',false,'sr-btn--sm')+rbtn('data-assetmode="'+i+':reinforce" aria-pressed="'+(a.mode==='reinforce')+'"','Reinforcements',false,'sr-btn--sm')+'</div>'+
      '<p class="sr-fine" style="margin:0">'+(a.mode==='doorgun'?'Circles for two rounds and rakes up to three enemies a round.':'Lands up to two more soldiers where you call it.')+'</p>');
  });
  h+='<div class="bs-chips">'+(PL.assets.length<2&&G.fighters.filter(f=>!f.out&&f.hull>=60).length>1?rbtn('data-addasset','+ Support ship',false,'sr-btn--sm'):'')+(PL.assets.length?rbtn('data-rmasset','Remove last',false,'sr-btn--sm'):'')+'</div></div>';
  return h;
}
function squadEntry(p,scatterFirst){
  return {id:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,spec:p.spec,tr:Rebel.keys(p),
    aim:soldierAim(p),hp:p.auto?autoOf(p).hp:Rebel.hpOf(p),agi:p.auto?1:Rebel.moveMul(p),nv:p.auto?1:Rebel.nerveMul(p),cool:p.auto?undefined:Rebel.coolOf(p,'g'),def:p.auto?autoOf(p).def:undefined,big:p.auto?autoOf(p).big:0,heavy:p.auto?autoOf(p).heavy:0,autoType:p.auto?autoKey(p):undefined,
    wpns:p.auto?[autoOf(p).wpn]:scatterFirst?['scatter','akli','cowboy']:['akli','cowboy']};
}
function startPlan(){
  const m=PL.m;
  if(!plComplete()||!canAttempt(m)||G.fuel<plFuel()||!plDropOk())return;
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
    if(PL.drop)G.supplies-=DROP_COST;
    SR.mission={kind:'ground',missionId:m.id,scenario:m.scenario,days:missionDays(m),nades:blam?blam.n:0,
      charges:(PL.req.items||[]).some(i=>i.ids)?Math.min(1,((G.armory.find(a=>a.id==='charge')||{}).n)||0):((PL.req.items||[]).find(i=>i.id==='charge')||{}).n||0,
      limpets:(PL.req.items||[]).some(i=>i.ids)?Math.min(1,((G.armory.find(a=>a.id==='limpet')||{}).n)||0):0,
      vip:m.vip||(m.npc?{name:m.npc.name,first:m.npc.first}:undefined),
      sec:m.ctx?m.ctx.sec:undefined,
      ctx:m.ctx?{title:m.name,place:m.ctx.place,target:m.ctx.target,variant:m.region,
        sub:m.ctx.place+' \u00b7 '+m.ctx.locName+' \u2014 Revolution I',
        eyebrow:'Ground Operation \u00b7 '+m.ctx.place+', '+m.ctx.locName,flavour:m.desc}:undefined,
      squad:squad.map((p,i)=>squadEntry(p,!!scatter&&i===squad.findIndex(q=>!q.auto))),
      assets:{drop:PL.drop,ships:PL.assets.map((a,k)=>{
        const f=G.fighters.find(x=>x.id===PL.v['as'+k+'s']),pl=G.people.find(x=>x.id===PL.v['as'+k+'p']);
        const mode=SEATS[f.cls]?a.mode:'strafe';
        return {cls:f.cls,name:f.name,mode,pilot:{name:pl.name,first:pl.name.split(' ')[0]},
          soldiers:mode==='reinforce'?[0,1].map(q=>G.people.find(x=>x.id===PL.v['as'+k+'r'+q])).filter(Boolean).map(p=>squadEntry(p,false)):[]};
      })},
      pilot:prize?{id:prize.id,name:prize.name,first:prize.name.split(' ')[0],level:prize.level}:undefined,
      grafPilot:{id:grafPilot.id,name:grafPilot.name,first:grafPilot.name.split(' ')[0]}};
  } else {
    const flight=[];
    for(const sl of PL.slots.filter(x=>x.acc==='pilot')){
      const p=G.people.find(x=>x.id===PL.v[sl.key]),f=G.fighters.find(x=>x.id===PL.v['rs'+sl.key.slice(2)]);
      flight.push({pilotId:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,
        rankName:rankFor(p),aim:pilotAim(p),cool:Rebel.coolOf(p,'s'),foc:Rebel.focusTN(p),cun:Rebel.cunMul(p),nv:Rebel.nerveMul(p),traits:Rebel.namesFor(p,'s'),
        cls:f.cls,fighterId:f.id,fighterName:f.name,hull:f.hull});
    }
    G.fuel-=fuel;
    SR.mission={kind:'space',missionId:m.id,days:missionDays(m),flight};
  }
  closeWin();closeTilePop();
  saveSnap();
  SR.go(PL.req.transport?'ground':'space',{mission:SR.mission});
}
function soldierAim(p){return Math.min(6,Rebel.aimOf(p,'g')+(p.spec==='vanguard'?1:0));}
function pilotAim(p){return Math.min(6,Rebel.aimOf(p,'s')+(p.spec==='dogfighter'?1:0));}
function addArmoryItem(name){
  const map={'Scattergun':['scatter','Scattergun'],'Sheriff\u2019s Scattergun':['scatter','Scattergun'],
    'Peacekeeper Carbine':['carbine','Peacekeeper Carbine'],'Shell box':['shells','Shell box'],
    'Explosive Charge':['charge','Explosive Charge'],'Data Limpet':['limpet','Data Limpet']};
  const hit=map[name]||[name.toLowerCase().replace(/[^a-z0-9]+/g,''),name];
  const a=G.armory.find(x=>x.id===hit[0]);
  if(a)a.n=(a.n||0)+1;
  else if(hit[0]==='limpet')G.armory.push({id:'limpet',name:'Data Limpet',n:1,ic:'\u25c9',desc:'A palm-sized tap that clamps onto a comm tower and copies every packet that passes. Needs no fuse.'});
  else if(hit[0]==='charge')G.armory.push({id:'charge',name:'Explosive Charge',n:1,ic:'\u2738',desc:'A shaped demolition charge with a remote fuse. Plant it, walk away, then detonate.'});
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
        if(pr.xp)gainXp(p,pr.xp);Rebel.trainSkills(p,pr.sk);
        creditMission(p);
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
    if(pr.xp)gainXp(p,pr.xp);Rebel.trainSkills(p,pr.sk);
    let state=pr.state;
    if(state==='shotdown')state=(rng()<0.15)?'lost':'injured';
    pinfo.push({name:p.name,xp:pr.xp||0,state});
    if(r.win&&state!=='lost')creditMission(p);
    if(state==='lost'&&upAny('infirmary','surgery')&&medStaff().length&&rng()<0.6){
      state='injured';pr.dur=6;
      news('<b>'+p.name+'</b> should not have made it. The surgery room says otherwise.','g');
    }
    if(state==='lost'){
      G.people=G.people.filter(x=>x.id!==p.id);
      moraleAll(-6,'death',(r.people||[]).map(x=>x.id),-10);
      news('<b>'+p.name+'</b> did not come home. Their name goes on the wall.','h');
    } else if(state==='injured'){
      p.injured=(hasRoom('infirmary')&&medStaff().length)?(pr.dur||3):(pr.dur||3)+2;
      Rebel.moraleBump(p,-5,'injury');
      for(const q of crewOf())if(q!==p)Rebel.moraleBump(q,(r.people||[]).some(x=>x.id===q.id)?-2:-0.5,'injury');
      mood();
      news('<b>'+p.name+'</b> came back on a stretcher \u2014 out '+p.injured+' day'+(p.injured>1?'s':'')+'.','h');
    }
  }
  const got=[];
  if(r.loot){
    if(r.loot.c){G.credits+=r.loot.c;got.push(C(r.loot.c));}
    if(r.loot.s){G.supplies+=r.loot.s;got.push(S(r.loot.s));}
    for(const it of r.loot.items||[]){addArmoryItem(it);got.push(it);}
  }
  if(r.win&&r.kind==='ground'&&(r.people||[]).some(pr=>pr.state!=='lost'&&Rebel.has(G.people.find(x=>x.id===pr.id),'smuggler'))&&rng()<0.25){
    const it=rng()<0.5?'Cowboy':'Shell box';
    addArmoryItem(it);got.push(it);
    news('A former smuggler\u2019s instincts paid off: an extra <b>'+it+'</b> in the haul.','g');
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
    } else {G.credits+=800;got.push('no berth \u2014 the Cross fenced for '+C(800));}
  }
  for(const fr of r.fighters||[]){
    const f=G.fighters.find(x=>x.id===fr.fighterId);
    if(!f)continue;
    if(fr.destroyed){
      G.fighters=G.fighters.filter(x=>x.id!==f.id);
      news('<b>'+f.name+'</b> was lost over the drift.','h');
    } else f.hull=Math.max(5,Math.min(100,Math.round(fr.hull)));
  }
  if(r.limpetUsed){
    const lm=G.armory.find(a=>a.id==='limpet');
    if(lm){lm.n=Math.max(0,lm.n-r.limpetUsed);if(!lm.n)G.armory=G.armory.filter(a=>a!==lm);}
  }
  if(r.win&&m&&r.method)m.method=r.method;
  if(r.chargeUsed){
    const ch=G.armory.find(a=>a.id==='charge');
    if(ch){ch.n=Math.max(0,ch.n-r.chargeUsed);if(!ch.n)G.armory=G.armory.filter(a=>a!==ch);}
  }
  if(r.win&&m)applyRew(m.rew,got);
  if(r.win&&m&&m.vip&&m.vip.strider&&r.vipOut&&!G.people.some(p=>p.id==='strider')){
    G.people.push({id:'strider',name:m.vip.name,role:'Soldier',level:1,xp:0,assign:'rest',injured:0,auto:'strider',bio:AUTOS.strider.bio});
    got.push('<b>'+m.vip.name+'</b> joins the roster');
    news('<b>'+m.vip.name+'</b>, a reprogrammed Strider Mk I, joins the rebellion. It does not need a bunk.','g');
  }
  for(const g of r.gained||[]){
    const A=AUTOS[g.type];if(!A)continue;
    if(G.people.some(p=>p.name===g.name))continue;
    G.people.push({id:'auto'+(G.people.length+1)+'_'+g.type,name:g.name,role:'Soldier',level:1,xp:0,assign:'rest',injured:0,auto:g.type,bio:A.bio});
    got.push('<b>'+g.name+'</b> (hacked) joins the roster');
    news('<b>'+g.name+'</b>, a hacked '+A.label+', joins the rebellion. It does not need a bunk.','g');
  }
  if(r.win&&m&&m.bonus&&r.quiet){applyRew(m.bonus,got);got.push('<b>stealth bonus</b>');}
  if(m){
    if(r.win){
      m.state='done';m.meta='SUCCESS';
      const cr=missionCredit(m);
      queueReport(buildReport(m,true,got,pinfo,cr,true));
      if(m.npc)RQ.push({t:'recruit',m});
      moraleAll(1,'win',(r.people||[]).map(x=>x.id),3);
      news('<b>'+m.name+'</b> \u2014 SUCCESS, and you were there. '+(got.length?got.join(' \u00b7 ')+'.':''),'g');
      sBuild();
      missionAftermath(m.id);
    } else {
      m.state='avail';m.progress=null;
      moraleAll(-3,'loss',(r.people||[]).map(x=>x.id),-8);
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
  if(rst&&startRestore()){
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
    for(const p of G.people){Rebel.migrate(p);if(p.level>Rebel.LEVEL_CAP)p.level=Rebel.LEVEL_CAP;}
    mood();
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
    G.upq=G.upq||[];G.dip=G.dip||[];G.patrols=G.patrols||[];G.chains=G.chains||{};
    for(const rm of G.rooms){
      if(rm.key==='bay')rm.key='hangar';
      if(rm.key==='quarters')rm.key='barracks';
      if(!rm.id)rm.id='rm_'+rm.r+'_'+rm.c;
      if(!rm.up)rm.up=[];
    }
    for(const row of G.grid)for(const cell of row){if(cell.room==='bay')cell.room='hangar';if(cell.room==='quarters')cell.room='barracks';}
    for(const p of G.people)if(p.auto===1)p.auto='strider';
    for(const m of G.missions){
      if(MSTORY[m.id]&&!m.tid){m.tid=MSTORY[m.id];m.story=m.id;m.ctx=Object.assign({place:'',locName:'',sec:1},CTXDEF[m.id]);}
    }
    G.opps=(G.opps||[]).filter(o=>o.tid||o.found);
    G.missions=G.missions.filter(m=>!(m.id==='strider'&&m.state==='locked'));
    if(G.materials===undefined)G.materials=80;
    if(G.fuel===undefined)G.fuel=40;
    if(!G.econ4){   // economy rescaled ×4 (Intel is unchanged)
      G.econ4=1;
      for(const k of ['credits','supplies','materials','fuel'])G[k]=Math.round(G[k]*4);
      for(const src of G.sources)for(const k of ['c','s','m','f'])if(src.inc[k])src.inc[k]*=4;
      for(const o of G.opps)for(const k of ['c','s','m','f'])if(o.rew&&o.rew[k])o.rew[k]*=4;
      for(const m of G.missions)if(m.opp)for(const k of ['c','s','m','f'])if(m.rew&&m.rew[k])m.rew[k]*=4;
    }
    if(G.missions.some(m=>(m.story||m.id)==='stealfuel'&&m.state==='done')&&!G.armory.some(a=>a.id==='charge')&&!G.missions.some(m=>(m.story||m.id)==='autofactory'))addArmoryItem('Explosive Charge');
    if(!G.locModel){G.locModel=1;G.renown=Math.min(G.renown,40);G.revNoted=false;G.revLevel=1;}
    for(const p of G.people)if(p.assign==='medbay')p.assign='station:infirmary';
    for(const f of G.fighters)if(f.cls==='viper')f.cls='cross';
    // refresh static mission fields (play links, ground flags) from the pool
    for(const m of G.missions)if(MPOOL[m.id])for(const k in MPOOL[m.id])if(!(k in {state:1,progress:1,meta:1}))m[k]=MPOOL[m.id][k];
    for(const m of G.missions)bindNpc(m);
    // event/signal functions can't survive serialization — rebind from pools
    for(const s of G.sources){
      if(s.pendingEvent&&!s.pendingEvent.chain){
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
  syncSound();setDrawer(false);
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
  closeMenu();setDrawer(false);
  closeWin();closeTilePop();
  saveSnap();
}
SR.register('base',{enter,exit,frame:render});


if(location.hash==='#test'){
  window.DBGbase={get G(){return G;},set G(v){G=v;},get started(){return started;},
    fn:{buildCostAt,UPGRADES_:()=>UPGRADES,REV_W_:()=>REV_W,startRestore,digAt,buildAt,srcContact,srcVisit,acceptCandidate,startSpec,openWin,getWin:()=>winMode,gainXp,dossierHead,squadEntry,soldierAim,pilotAim,moraleAll,mood,moraleTick,crewOf,rankFor,creditMission,rankCard,roomsAdj,PLANETDEF_:()=>PLANETDEF,BUILDS_:()=>BUILDS,srcAnswer,CHAINS_:()=>CHAINS,chainTick,chainPrompt,chainAct,chainState,startPatrol,patrolTick,upBlocked,gearLayout,startUpgrade,startDip,canDip,clusterOf,bunkCap,fighterCap,supCap,sourceCap,tilesOf,openTilePop,roomAt,fuelOf,addMission,spawnMission,pushMission,makeOffer,openPlan,plPlace,plComplete,plFuel,startPlan,applyDebrief,advanceDay,scoutPlanet,syncUI,saveSnap,
      ablePilots,openWin,closeWin,launchIntro,precondList,canAttempt,
      raiseAccess,addSupport,revGain,missionCredit,syncLocalOps,pst,pdef,locCap,renderWin,getPL:()=>PL,canAttempt,precondList}};
}
})();
