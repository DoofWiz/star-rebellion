'use strict';
(function(){
const ROOT=document.getElementById('sc-base');
const UT=SR.util,byId=UT.scoped(ROOT);            // shared helpers (core.js); ids are looked up inside this scene
const A=SR.audio,osc=A.osc,nz=A.nz;


/* =====================================================================
   STAR REBELLION — Haven Rock, iteration 2
   Rooms as single entities with walk-in interior views, glassy
   Revolution lamp, galaxy-map source network with comm-static
   transmissions, signal-driven mission generation, personnel files
   with vehicles and equipment, capacities, source-driven recruitment.
   ===================================================================== */

/* Autos: robots that fight for us, the robot equivalent of a character. A hacked one keeps the stats and weapon its
   type has in the enemy roster (game/data/db.json); the label and bio are the base's. */
const autoRow=t=>Enemies.owned(t);
const autoFrom=(t,label,bio)=>{const r=autoRow(t);return {label,hp:r.hp,def:r.def,arm:Enemies.protection(r).arm,wpn:r.weapon_1,big:r.big?1:0,heavy:r.heavy?1:0,bio};};
const AUTOS={
  policebot:autoFrom('policebot','Policebot','A Hegemony Policebot with a new master and a face-screen that still says \u201cfriendly and helpful\u201d.'),
  bruiser:autoFrom('bruiser','Bruiser','A riot Bruiser, reprogrammed. It still beats up anyone who does not comply. Now that means them.'),
};
const autoOf=p=>AUTOS[p.auto]||AUTOS.policebot;
const autoKey=p=>AUTOS[p.auto]?p.auto:'policebot';
/* Ground vehicles (G.vehicles). Not people: a Bot (robot equivalent of a vehicle) drives itself and cannot be manned,
   a vehicle needs crew. Either rides to a ground mission as a fire-support asset and is summoned from the Fire Support
   menu. G.vehicles[i] = {id, name, type, hp (0-100%)}; type is the enemy roster's owned_as, and the stats, seats and
   gun come from that roster row (game/data/db.json). The label and bio are the base's. */
const ownedVeh=(type,bio)=>{
  const r=Enemies.owned(type);
  const arm=Enemies.protection(r).arm;   // armour plating is mended between missions; hp carries the damage home
  if(r.kind==='bot')return {label:r.name,kind:'bot',hp:r.hp,def:r.def,arm,aim:r.aim,wpn:r.weapon_1,big:r.big?1:0,bio};   // an owned Bot is the enemy one, reprogrammed (C-21)
  return {label:r.name,kind:'vehicle',hp:r.hp,def:r.def,arm,seats:Enemies.seats(r.id).length,bio};
};
const GVEH={
  strider:ownedVeh('strider','A Hegemony enforcement Strider, reprogrammed. Its face-screen is permanently stuck on \u201cWe\u2019re all in this together.\u201d'),
  police:ownedVeh('police','A patrol car with a pulse cannon in the nose. One seat: the driver flies it and fires it.'),
  dispersal:ownedVeh('dispersal','A riot car with a dispersal turret on the roof. A driver and an exposed turret gunner.'),
  transport:ownedVeh('transport','Unarmed. A driver and a troop bay for three.'),
};
const gvehOf=v=>GVEH[v.type]||GVEH.strider;
const vehPool=()=>(G.vehicles||[]).filter(v=>v.hp>=40);
function addVehicle(type,name){
  G.vehicles=G.vehicles||[];
  const v={id:type+'_'+(G.vehicles.length+1)+'_'+G.day,name:name||GVEH[type].label,type,hp:100};
  G.vehicles.push(v);
  return v;
}
const rankFor=p=>p.auto?autoOf(p).label:Rebel.rankName(p);
const RM=SR.hud.reduced;
let rng=Math.random;
/* ---------- kit helpers: icons, cost chips, palette ---------- */
const TH=SR.theme,K=TH.C;                       // K is the live palette (re-synced from the CSS tokens at boot)
const HUD=SR.hud;                               // the UI kit (ui/sr-hud.js): chrome, menus, feedback
const IC=HUD.ico;
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
const esc=HUD.esc;
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
/* ---------- the shared item catalogue (KIT) ----------
   Personal kit: what it is, where it slots, its Storeroom footprint and what Sweet Tooth charges. Built from the
   `items` table in game/data/db.json through game/js/items.js (DESIGN_BLOCKERS C-10); ids match the saved armory
   ids. `live:false` means the game has no mechanics for the item yet: never stocked by the market and never carried
   (DESIGN_BLOCKERS M-17). `q` is the auto-equip quality, best first. Kit only reaches the armory through
   grantItem / Items.grant. */
const KIT=Items.kit();
const gearMeta=a=>KIT[a.id]||{cat:'other',w:2,h:1};
/* the Arsenal's line about an item: the table's description, else what an older save wrote on the stack, else where it came from */
const SRC_LINE={bought:'From Sweet Tooth\u2019s stall at Nyx. No receipts.',looted:'Taken off the Hegemony\u2019s people. Ours now.',
  made:'Made in our own workshops.',gift:'Put together by our own people.',start:'Part of what we started with.'};
const itemBlurb=a=>(Items.get(a.id)||{}).description||a.desc||SRC_LINE[a.src]||'';
const kitNameId=id=>(KIT[id]&&KIT[id].name)||((G&&G.armory.find(a=>a.id===id))||{}).name||id;
const kitName=a=>(KIT[a.id]&&KIT[a.id].name)||a.name;
/* the market pool rule (the Black Market draws from this once it lands) */
/* the Black Market's lot weights by category, from the market_weights table (the highest row at or below lvl) */
const MARKET_CATS=['weapon','gadget','merc','armour','shipwpn','vehicle','ship'];
function marketWeights(lvl){
  const rows=(SRDB.raw.market_weights||[]).filter(x=>x.rev<=lvl).sort((x,y)=>y.rev-x.rev);
  const row=rows[0]||{weapon:1};
  return MARKET_CATS.map(c=>[c,row[c]||0]);
}
const marketable=id=>{const m=KIT[id];return !!(m&&m.live&&!m.heg&&!m.dropOnly&&(m.rev||1)<=(G&&G.revLevel||1)&&m.price);};
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
const EXCAVATE={m:40,days:1};
/* Ships, fuel, seats and weapons come from the game database (SRDB). A fighter in G.fighters is one physical
   ship: {id,name,cls,hull,out,loadout}, where loadout lists the weapon ids fitted (any weapon fits any slot). */
const fuelPer=cls=>{const r=SRDB.ship(cls);return r&&r.fuel_per_sortie?r.fuel_per_sortie:5;};   // fuel burned per sortie
const fuelOf=f=>Math.ceil(fuelPer(f.cls)*(hangarUp('refuel')?0.75:1));
const wpnLabel=id=>{const w=SRDB.weapon(id);return w?w.name+(w.ammo?' ×'+w.ammo:''):id;};
function shipStats(f){
  const r=SRDB.ship(f.cls);
  return {label:r.name+' · '+r.role,shd:r.shield_front+'F / '+r.shield_rear+'A',arm:r.armour,hull:r.hull,
    wpns:(f.loadout&&f.loadout.length?f.loadout:[]).map(id=>[wpnLabel(id)])};
}
/* the weapons a ship starts with: the starting-fleet entry if it is one of those named ships, else the stock model's */
function defaultLoadout(f){
  const r=SRDB.ship(f.cls);
  const row=Object.values(SRDB.fleet).find(x=>x.name===f.name&&SRDB.ship(x.model)===r);
  return (row?[row.weapon_1,row.weapon_2]:[r.default_weapon_1,r.default_weapon_2]).filter(Boolean);
}
function newFighter(o){const f=Object.assign({out:false},o);f.loadout=defaultLoadout(f);return f;}
/* Door Gunner Support needs a gunner position and a weapon that enables it */
function hasDoorGun(f){
  const r=SRDB.ship(f.cls);
  return !!r&&r.gunner_positions>0&&(f.loadout||[]).some(id=>{const w=SRDB.weapon(id);return !!w&&w.fire_support==='door_gunner';});
}
// pilots carry an initiative of 1 to 6 and four skills of 0 to 50; the campaign has no skills yet, so derive them from level
const SEED_PILOT={sera:'sera-kest',joss:'joss-marrek',petra:'petra-voss'};
/* The opening cast are the same for every player but are built like any other rebel (Rebel.scripted); a pilot's
   level, experience, initiative and skills come from its database row. */
function castRebel(spec,dbId){return Rebel.scripted(spec,dbId?SRDB.pilots[dbId]:null);}
function pilotInit(p){
  if(p.init===undefined){const seed=SRDB.pilots[SEED_PILOT[p.id]];p.init=seed?seed.initiative:1+Math.floor(Math.random()*6);}
  return p.init;
}
/* a rebel's skills on the database's 0..50 scale, which is what the space scene reads */
function pilotSkills(p){return {aim:Rebel.dbSkill(p,'aim'),cunning:Rebel.dbSkill(p,'cun'),focus:Rebel.dbSkill(p,'foc'),presence:Rebel.dbSkill(p,'pre')};}
/* what sits on top of the database's skill-and-level bonus: mood, injury and the Dogfighter specialty */
function pilotAimMod(p){return Rebel.moraleFx(p).aim+Rebel.injFx(p).aim+Rebel.wearyFx(p).aim+(p.spec==='dogfighter'?1:0);}

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
    vehicles:[],
    wreck:{restored:false,restoring:0},
    armory:[],
    people:[
      castRebel({id:'joss',name:'Joss Marrek',role:'Pilot',charTrait:'reckless',equip:['cowboy'],bio:'Best stick in the sector, flying a converted hauler. Ask him about it. He’ll tell you anyway.'},'joss-marrek'),
      castRebel({id:'dax',name:'Dax Ferro',role:'Soldier',level:1,xp:0.2,charTrait:'cautious',equip:['akli','cowboy'],bio:'Ex-dock enforcer. Good in a corridor.'}),
      castRebel({id:'runa',name:'Runa Vel',role:'Soldier',level:1,xp:0.45,charTrait:'shortfuse',equip:['akli','cowboy'],bio:'Demolitions. Do not startle her.'}),
      castRebel({id:'kel',name:'Kel Brasso',role:'Soldier',level:1,xp:0.1,charTrait:'hunter',equip:['akli','cowboy'],bio:'Poacher turned partisan. Knows every ridge on three moons.'}),
    ],
    sources:[],
    onboard:'intro',
    missions:[
    ],
    planets:PLANETDEF.map(mkPlanet),
    recruitN:0,recSeq:0,recruit:{days:0},recWait:[],misPopQ:[],candQ:[],
    news:[],
    v:saveVersion(),   // born at the current save version: no migration runs on it (MIGRATIONS below)
  };
  for(const [id,n] of [['akli',6],['cowboy',4],['medpack',4]])Items.grant(g0.armory,id,n,'start');
  g0.people.forEach(p=>{Rebel.migrate(p);p.joined=1;});
  {const keep=G;G=g0;g0.people.forEach(gearFromEquip);autoEquip();G=keep;}
  g0.morale=Rebel.MORALE_START;
  return g0;
}

/* ---------- helpers ---------- */
const $=byId;
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
  barracks:{post:'Garrison Officer',perk:'wounded ground fighters recover faster (+1 day of recovery a day)'},
  hangar:{post:'Flight Deck Officer',perk:'ships repair 4% a day faster on the pads'},
  diplo:{post:'Chief Diplomat',perk:'runs diplomatic tasks that raise local Support'},
  store:{post:'Quartermaster',perk:'repairs cost 4⚙ instead of 8⚙'},
  workshop:{post:'Crew Chief',perk:'repairs 15%/day instead of 8%'},
  infirmary:{post:'Medic',perk:'injuries heal twice as fast'},
  comms:{post:'Signals Operator',perk:'intel flows (+1/day per array)'},
  training:{post:'Drill Instructor',perk:'+50% training XP'},
};
const STLBL={barracks:'Garrison',hangar:'Deck',diplo:'Diplo',command:'Command',store:'Stores',workshop:'Workshop',infirmary:'Medbay',comms:'Comms',training:'Drill'};
function staffOf(key){return G.people.filter(p=>p.assign==='station:'+key&&!laidUp(p)&&!Rebel.conked(p));}
function medStaff(){return staffOf('infirmary');}
const staffHas=(key,trait)=>staffOf(key).some(p=>Rebel.has(p,trait));
/* ---------- morale: every rebel has their own; G.morale is the base's mood, their average ---------- */
const crewOf=()=>G.people.filter(p=>!p.auto);
/* Heroes fight on the ground and in the cockpit: they count as both kinds */
const isGround=p=>p.role==='Soldier'||p.role==='Marine'||p.role==='Hero';
const isFlyer=p=>p.role==='Pilot'||p.role==='Hero';
function mood(){const c=crewOf();G.morale=c.length?c.reduce((a,p)=>a+(p.morale===undefined?Rebel.MORALE_START:p.morale),0)/c.length:Rebel.MORALE_START;}

/* ---------- carried gear ----------
   Each rebel with slots (see Rebel.gearSlots) carries items from the armory:
   p.gear = {primary, secondary, head, body, back, gad:[a,b]}. Old saves gain the newer slots in MIGRATIONS (and here, lazily).
   An item can only be carried by one rebel per unit in stock. New kit is handed out automatically to empty
   slots, best first to the most experienced; anything the player chose by hand is left alone. */
const SLOT_LABEL={primary:'Primary weapon',secondary:'Secondary weapon',back:'Back',head:'Head',body:'Body',gad:'Gadget'};
const gearSlots=p=>Rebel.gearSlots(p);
function gearHeld(p){
  const g=p.gear=p.gear||{primary:null,secondary:null,head:null,body:null,back:null,gad:[null,null]};
  if(!g.gad)g.gad=[null,null];
  if(g.head===undefined)g.head=null;
  if(g.body===undefined)g.body=null;
  if(g.back===undefined)g.back=null;
  return g;
}
const slotGet=(p,s)=>{const g=gearHeld(p);return s.k==='gad'?g.gad[s.i]:g[s.k];};
const slotSet=(p,s,id)=>{const g=gearHeld(p);if(s.k==='gad')g.gad[s.i]=id||null;else g[s.k]=id||null;};
const gearFits=(id,s)=>{const m=KIT[id];return !!m&&!!m.live&&m.slot===(s.k==='gad'?'gadget':s.k);};   // live:0 kit has no rules yet (M-17), so nobody can carry it
/* a mercenary's own kit fills their weapon slots: it is not in the armory, not counted, and not ours to take */
const isOwnSlot=(p,s)=>!!(p&&p.ownKit&&(s.k==='primary'||s.k==='secondary')&&p.ownKit[s.k]);
const carried=id=>crewOf().reduce((n,p)=>n+gearSlots(p).filter(s=>slotGet(p,s)===id&&!isOwnSlot(p,s)).length,0);
const stockOf=id=>{const a=G.armory.find(x=>x.id===id);return a?a.n:0;};
const freeOf=id=>Math.max(0,stockOf(id)-carried(id));
const holders=(id,not)=>crewOf().filter(p=>!not.includes(p)&&p.assign!=='mission'&&gearSlots(p).some(s=>slotGet(p,s)===id&&!isOwnSlot(p,s)));
/* the second gadget slot is the utility slot: ground rebels are handed a Med Pack there, and nobody else is handed one
   automatically (a pilot has no use for it, and the first gadget slot is for grenades); by hand it can go anywhere */
const wantsPack=(p,s)=>!!p&&isGround(p)&&s.k==='gad'&&s.i===1;
function bestFree(s,p){
  if(wantsPack(p,s)&&freeOf('medpack')>0)return 'medpack';
  let best=null;
  for(const a of G.armory)if(a.n>0&&gearFits(a.id,s)&&KIT[a.id].live&&a.id!=='medpack'&&freeOf(a.id)>0&&(!best||(KIT[a.id].q||0)>(KIT[best].q||0)))best=a.id;
  return best;
}
/* drop anything that no longer makes sense: items that were used up or lost, slots a rebel no longer has */
function reconcileGear(){
  for(const p of crewOf()){
    if(!gearSlots(p).length){p.gear=null;continue;}
    for(const s of gearSlots(p)){
      if(isOwnSlot(p,s)){if(slotGet(p,s)!==p.ownKit[s.k])slotSet(p,s,p.ownKit[s.k]);continue;}   // own kit stays put
      const id=slotGet(p,s);if(id&&(!gearFits(id,s)||stockOf(id)<=0))slotSet(p,s,null);
    }
  }
  const weakestFirst=crewOf().slice().sort((a,b)=>a.level-b.level);
  for(const a of G.armory){
    let over=carried(a.id)-a.n;
    for(const p of weakestFirst)for(const s of gearSlots(p)){if(over>0&&slotGet(p,s)===a.id&&!isOwnSlot(p,s)){slotSet(p,s,null);over--;}}
  }
}
/* fill every empty slot from what is free; `first` rebels (a mission squad) choose before the rest */
function autoEquip(first){
  if(!G||!G.people)return;
  reconcileGear();
  const rest=crewOf().filter(p=>!(first||[]).includes(p)).sort((a,b)=>b.level-a.level||(b.rank||0)-(a.rank||0));
  for(const p of (first||[]).concat(rest)){
    if(p.assign==='mission')continue;
    for(const s of gearSlots(p)){if(slotGet(p,s))continue;const id=bestFree(s,p);if(id)slotSet(p,s,id);}
  }
}
/* before a mission: the people going get kit even if it means taking it off someone staying home */
function outfitSquad(going){
  going=going.filter(p=>p&&!p.auto&&gearSlots(p).length);
  autoEquip(going);
  for(const p of going)for(const s of gearSlots(p)){
    if(slotGet(p,s))continue;
    const ids=G.armory.filter(a=>a.n>0&&gearFits(a.id,s)&&KIT[a.id].live&&(a.id!=='medpack'||wantsPack(p,s))).sort((a,b)=>(wantsPack(p,s)?(b.id==='medpack')-(a.id==='medpack'):0)||(KIT[b.id].q||0)-(KIT[a.id].q||0)).map(a=>a.id);
    for(const id of ids){
      const h=holders(id,going)[0];
      if(h){const hs=gearSlots(h).find(x=>slotGet(h,x)===id);slotSet(h,hs,null);slotSet(p,s,id);break;}
    }
  }
}
/* a manual pick (the personnel-file picker and the Arsenal share it): free stock first, else take it off a holder */
function applyGearPick(pid,k,i,id){
  const p=G.people.find(x=>x.id===pid),s=p&&gearSlots(p).find(x=>x.k===k&&(x.i||0)===+i);
  if(!p||!s||p.assign==='mission'||isOwnSlot(p,s))return false;
  if(!id)slotSet(p,s,null);
  else if(freeOf(id)>0||slotGet(p,s)===id)slotSet(p,s,id);
  else{
    const h=holders(id,[p])[0];
    if(!h)return false;
    slotSet(h,gearSlots(h).find(x=>slotGet(h,x)===id),null);slotSet(p,s,id);
    news('<b>'+h.name.split(' ')[0]+'</b> hands the <b>'+kitNameId(id)+'</b> to <b>'+p.name.split(' ')[0]+'</b>.','d');
  }
  saveSnap();
  return true;
}
const wpnsFromGear=p=>{const g=p.gear||{},w=[g.primary,g.secondary].filter(Boolean);return w.length?w:['unarmed'];};
const packsCarried=p=>gearSlots(p).filter(s=>s.k==='gad'&&slotGet(p,s)==='medpack').length;
const nadesCarried=squad=>squad.reduce((n,p)=>n+(p.auto?0:gearSlots(p).filter(s=>s.k==='gad'&&slotGet(p,s)==='blam').length),0);
/* old saves and the opening cast: read p.equip into slots once */
function gearFromEquip(p){
  const g=gearHeld(p);
  for(const id of p.equip||[]){
    const m=KIT[id];if(!m)continue;
    const s=gearSlots(p).find(x=>gearFits(id,x)&&!slotGet(p,x));
    if(s)slotSet(p,s,id);
  }
  return g;
}

/* a base-wide event: everybody feels it, those in `team` feel it differently.
   Mercenaries follow pay and winning, not the cause: they only feel it when they were on the team. */
function moraleAll(d,kind,team,dTeam){
  for(const p of crewOf()){
    const onTeam=team&&team.includes(p.id);
    if(p.merc&&!onTeam)continue;
    Rebel.moraleBump(p,onTeam?dTeam:d,kind);
  }
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
/* comms feed: the newest lines surface bottom-left for a few seconds (the kit's comms), the log keeps everything */
const comms=HUD.comms(byId('feedLines'),{max:3,ttl:6000});
function feedPush(n){comms.push(n.html,newsTone(n.cls));}
/* a completed mission counts toward the next rank */


/* ---------- injuries and recovery ----------
   What a mission leaves on a rebel: new medical conditions, lost limbs, long stays in the Infirmary. Conditions
   recover over time, slowly without an Infirmary, faster with one, faster still with a medic on the post. */
const PROS_COST={c:300,m:120};
/* the one recovery rate (days of recovery per day): slow without an Infirmary, faster with staff on it; a Garrison
   Officer in the Barracks speeds up the ground fighters (its post's perk). DESIGN_BLOCKERS C-20. */
function healRate(p){
  const garrison=(p&&isGround(p)&&staffOf('barracks').length)?1:0;
  if(!hasRoom('infirmary'))return Rebel.NO_INFIRMARY+garrison;
  return 1+(medStaff().length?1:0)+(staffHas('infirmary','medic')?0.5:0)+(staffHas('infirmary','doctor')?1:0)+(upAny('infirmary','surgery')?0.5:0)+garrison;
}
/* off duty (laid up), and how many days until they are back at today's rate */
const laidUp=p=>Rebel.laidUp(p)>0;
const outDays=p=>Math.ceil(Rebel.laidUp(p)/healRate(p));
/* rest (rebel-rest.js): a Weary rebel can still go, at a cost; a Conked one is in their bunk until rested */
const conked=p=>Rebel.conked(p);
const offDuty=p=>laidUp(p)||conked(p);
const restTag=p=>{
  if(!Rebel.weary(p))return '';
  const n=Rebel.restDays(p),d=n+' day'+(n>1?'s':'');
  return conked(p)?'<span class="sr-tag sr-tag--bad" title="Conked out: in their bunk for '+d+'" aria-label="Conked out, '+d+'">Zz '+d+'</span>':
    '<span class="sr-tag sr-tag--warn" title="Weary: needs '+d+' of rest. Sent out now, they lose morale and fight worse." aria-label="Weary, '+d+' of rest">Zz Weary</span>';
};
function applyInjuries(p,list,hadState){
  const msgs=[];
  for(const i of list||[]){
    const def=Rebel.INJK[i.k];if(!def)continue;
    if(def.k==='maimed'){
      p.body=p.body||{};
      const free=['arm','leg'].filter(x=>p.body[x]!==1);
      const part=free.length?free[Math.floor(rng()*free.length)]:'arm';
      p.body[part]=1;Rebel.layUp(p,'amputation',6);
      msgs.push('has lost '+Rebel.PART_NAME[part]+'. A prosthetic would give it back.');
    } else if(def.k==='spinal'){
      Rebel.layUp(p,'spinal',10+(i.treated?0:4));
      msgs.push('has a spinal injury and will need prolonged treatment.');
    } else {
      Rebel.addCond(p,def.cond,i.treated?0:2);
      msgs.push('comes back with '+def.n.toLowerCase()+(i.treated?'':' — never patched in the field, it will take longer')+'.');
    }
    Rebel.moraleBump(p,-3,'injury');
  }
  if(msgs.length&&!hadState)p.injuries=(p.injuries||0)+1;
  return msgs;
}
/* Infirmary: a prosthetic for every rebel who has lost a limb or an eye, once there is a Surgery Room */
function prostheticCards(){
  const lost=[];
  for(const p of crewOf())for(const part of ['arm','leg','eye'])if(p.body&&p.body[part]===1)lost.push([p,part]);
  if(!lost.length)return '';
  const surg=upAny('infirmary','surgery');
  return lost.map(([p,part])=>{
    const why=!surg?'Needs a Surgery Room.':p.assign==='mission'?'On a mission.':laidUp(p)?'Still recovering.':G.credits<PROS_COST.c||G.materials<PROS_COST.m?'Not enough credits or materials.':'';
    return '<div class="sr-card sr-card--foe"><div class="sr-card__title">'+esc(p.name)+' \u00b7 '+(part==='eye'?'blinded eye':'lost '+part)+'</div><div class="sr-card__body">A prosthetic '+part+' takes 5 days in the Surgery Room and removes the penalty.</div>'+
      '<div class="bs-build__row"><span class="sr-card__meta">'+C(PROS_COST.c,G.credits<PROS_COST.c)+M(PROS_COST.m,G.materials<PROS_COST.m)+'</span>'+rbtn('data-pros="'+p.id+':'+part+'"'+(why?' title="'+esc(why)+'"':''),'Fit prosthetic',!!why,'sr-btn--sm sr-btn--primary')+'</div></div>';
  }).join('');
}
function startProsthetic(pid,part){
  const p=G.people.find(x=>x.id===pid);
  if(!p||!upAny('infirmary','surgery')||!p.body||p.body[part]!==1||p.assign==='mission'||laidUp(p))return false;
  if(G.credits<PROS_COST.c||G.materials<PROS_COST.m)return false;
  G.credits-=PROS_COST.c;G.materials-=PROS_COST.m;
  Rebel.layUp(p,'surgery',5,{part});
  news('<b>'+p.name+'</b> goes under the knife for a prosthetic '+part+'. Five days.','a');
  sBuild();saveSnap();syncUI();
  return true;
}
/* the file: conditions with time left, and what is permanently different */
function medicalSection(p){
  if(p.auto)return '';
  const rows=[];
  for(const c of p.cond||[]){
    const d=Rebel.CONDK[c.k];if(!d)continue;
    rows.push('<div class="sr-card sr-card--foe"><div class="sr-card__top"><span class="sr-card__title">'+esc(d.n)+'</span>'+wTag(c.k==='eye'&&c.age>=8?'Getting worse':Math.max(1,Math.ceil(c.days))+' day'+(Math.ceil(c.days)>1?'s':'')+' to go','info')+'</div><div class="sr-card__body">'+esc(d.text)+'</div></div>');
  }
  const b=p.body||{};
  for(const part of ['arm','leg','eye']){
    if(b[part]===1)rows.push('<div class="sr-card sr-card--foe"><div class="sr-card__top"><span class="sr-card__title">'+(part==='eye'?'Blinded in one eye':'Lost '+(part==='arm'?'an arm':'a leg'))+'</span>'+wTag('Permanent','bad')+'</div><div class="sr-card__body">'+(part==='eye'?'A significant accuracy penalty.':part==='arm'?'No two-handed weapons.':'Slowed and cannot sprint.')+' A prosthetic from a Surgery Room would fix it.</div></div>');
    else if(b[part]===2)rows.push('<div class="sr-card sr-card--good"><div class="sr-card__top"><span class="sr-card__title">Prosthetic '+part+'</span>'+wTag('Fitted','good')+'</div><div class="sr-card__body">It works. Mostly.</div></div>');
  }
  if(!rows.length)return '';
  return '<div class="sr-h3">Medical</div><div class="sr-stack">'+rows.join('')+'</div>'+((p.cond||[]).length&&!hasRoom('infirmary')?'<p class="sr-p bs-bad">No Infirmary: wounds mend very slowly, and an eye injury can become permanent.</p>':'');
}

/* ---------- experiences: what a mission did to the people who went ---------- */
const BOND_KINDS=['friends','oldfriends','battlebros','love','rivals','owes'];
const nameOfRebel=id=>{const q=G.people.find(x=>x.id===id);return q?(q.first||q.name.split(' ')[0]):(id==='Hegemony'?'the Hegemony':'someone');};
function runExperiences(r,m,ev){
  const win=!!r.win,sec=(m&&m.ctx&&m.ctx.sec)||0,tid=m?(m.tid||m.id):null,entries=r.people||[];
  const downed=pr=>!!(pr.down||pr.state==='injured'||pr.state==='lost'||pr.state==='shotdown');
  const hurt=id=>{const x=entries.find(e=>e.id===id);return !!x&&(downed(x)||(x.minHp!==undefined&&x.minHp<0.5));};
  const here=entries.map(pr=>({pr,p:G.people.find(x=>x.id===pr.id)})).filter(x=>x.p&&!x.p.auto);
  const teamIds=entries.map(x=>x.id);
  const nm=p=>'<b>'+p.name+'</b> ';
  const squadmates=id=>entries.filter(e=>e.id!==id&&(ev.lostP.some(q=>q.id===e.id)||G.people.some(q=>q.id===e.id&&!q.auto)));
  const ctxs={};
  for(const {pr,p} of here){
    const others=squadmates(p.id);
    const ctx={win,quiet:!!r.quiet,sec,tid,down:downed(pr),minHp:pr.minHp,heavy:pr.heavy,panics:pr.panics,lucky:!!pr.lucky,
      nearDeath:ev.nearIds.includes(p.id),alone:others.length>=2&&others.every(downed)&&!downed(pr),alliesLost:ev.lostP.length};
    ctxs[p.id]=ctx;
    for(const g of Rebel.review(p,ctx,rng)){
      news(nm(p)+g.msg,'p');
      if(g.k==='lostsquad')Rebel.moraleBump(p,-15,'loss');
    }
    if(win&&Rebel.expHas(p,'decorated'))Rebel.moraleBump(p,1,'win');
    if(ev.lostP.length&&Rebel.expHas(p,'guilt')&&!ctx.down)Rebel.moraleBump(p,-4,'death');
    const lv=Rebel.expGet(p,'love');
    if(lv&&teamIds.includes(lv.with))Rebel.moraleBump(p,4,'win');
    const sv=Rebel.expGet(p,'saved');
    if(sv&&teamIds.includes(sv.with))Rebel.moraleBump(p,2,'win');
    for(const tid of pr.rescued||[]){
      const t=G.people.find(x=>x.id===tid);
      if(t&&Rebel.expRoom(p,'saved')&&Rebel.expRoom(t,'owes')&&!Rebel.expHas(p,'saved',tid)){
        Rebel.expGrant(p,'saved',tid);Rebel.expGrant(t,'owes',p.id);
        news(nm(p)+'pulled <b>'+t.name+'</b> out of it. They will not forget.','p');
      }
    }
    if(Rebel.breakCheck(p,ctx))news(nm(p)+'is broken by what happened. They need rest.','h');
  }
  for(let i=0;i<here.length;i++)for(let j=i+1;j<here.length;j++){
    const a=here[i].p,b=here[j].p;
    for(const g of Rebel.pairReview(a,b,{win,hurt},rng))news('<b>'+a.name+'</b> and <b>'+b.name+'</b> '+g.msg,'p');
  }
  for(const gone of ev.lostP)for(const q of crewOf())
    for(const h of Rebel.bereave(q,gone.id,'died')){
      if(h.d)Rebel.moraleBump(q,h.d,'death');
      if(h.grief)news(nm(q)+'is grieving for <b>'+gone.name+'</b>. They will sit the next few missions out.','h');
      if(h.avenge)news(nm(q)+'swears to avenge <b>'+gone.name+'</b>.','h');
    }
  mood();
  return ctxs;
}
/* the hidden Hero chance creeps up with what each rebel did; one of them may be made a Hero (a single one in all of
   Revolution Level 1, whether or not they survive; from Level 2 the usual rules apply) */
function heroCheck(r,m,ctxs){
  const entries=r.people||[],sec=(m&&m.ctx&&m.ctx.sec)||0;
  const part=entries.map(pr=>({pr,p:G.people.find(x=>x.id===pr.id)})).filter(x=>x.p&&!x.p.auto);
  const topKills=Math.max(0,...part.map(x=>x.pr.kills||0));
  for(const {pr,p} of part){
    const c=(ctxs&&ctxs[p.id])||{};
    Rebel.heroGain(p,{win:!!r.win,kills:pr.kills||0,danger:!!(c.down||(pr.minHp!==undefined&&pr.minHp<0.5)),alone:!!c.alone,top:topKills>=2&&(pr.kills||0)===topKills,notable:!!r.quiet||sec>=3});
  }
  if((G.revLevel||1)<2&&(G.heroesMade||0)>=1)return null;   // Revolution Level 1 allows one Hero, ever: if they fall, that is it
  const hero=Rebel.heroRoll(part.map(x=>x.p).filter(p=>!p.merc),rng,crewOf().filter(p=>p.role==='Hero').length);   // no Hero promotion on a contract
  if(!hero)return null;
  const was=hero.role;
  Rebel.heroMake(hero,crewOf());G.heroesMade=(G.heroesMade||0)+1;
  Rebel.moraleBump(hero,10,'win');mood();
  news('<b>'+hero.name+'</b>, once a '+was.toLowerCase()+', is now a <b>Hero</b> of the Rebellion.','p');
  autoEquip();sBuild();
  RQ.push({t:'hero',id:hero.id});
  return hero;
}
/* going out together: rivals wind each other up, the last one standing dislikes a full squad */
function squadTension(squad){
  const crew=squad.filter(p=>p&&!p.auto);
  for(const p of crew){
    const rv=Rebel.expGet(p,'rivals');
    if(rv&&crew.some(q=>q.id===rv.with)){Rebel.moraleBump(p,-3,'loss');news(nm0(p)+'bristles at having to go out with <b>'+nameOfRebel(rv.with)+'</b>.','d');}
    if(crew.length>=3&&Rebel.expHas(p,'laststanding'))Rebel.moraleBump(p,-2,'misc');
  }
  mood();
}
const nm0=p=>'<b>'+p.name+'</b> ';

/* back from a mission: one more without rest (rebel-rest.js), and the news when it tips them over */
function tireNews(p){
  const t=Rebel.tire(p);
  if(t==='weary')news('<b>'+p.name+'</b> is weary and needs a break: '+Rebel.restDays(p)+' days at the base. Send someone else.','a');
  else if(t==='conked')news('<b>'+p.name+'</b> has collapsed in their bunk in the Barracks. Out for '+Rebel.restDays(p)+' days.','h');
  return t;
}
function creditMission(p){
  if(p&&p.merc)p.merc.missions=(p.merc.missions||0)+1;   // contract missions count toward "join the cause"
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

/* ---------- galaxy view statics (docs/ui/GALAXY-HANDOFF.md §7; cosmetic, never saved) ---------- */
/* hyperlanes: a static picture of how the drift hangs together; no travel rules */
const LANES=[['haven','kess'],['haven','brakka'],['haven','veray'],['kess','veray'],['veray','menk'],['brakka','menk'],
 ['kess','oubli'],['oubli','sable'],['sable','parity'],['veray','parity'],['parity','callis'],['parity','ballakan'],
 ['menk','dreymar'],['dreymar','ballakan'],['ballakan','volund'],['menk','nyx'],['nyx','volund'],['callis','tarsis'],
 ['callis','meridian'],['tarsis','meridian'],['meridian','halcyon'],['halcyon','volund'],['ballakan','callis']];
/* how each world looks on the map: radius at scale 1, body colour, SR_ART.planet texture; region fills for the world view */
const WORLD_LOOK={
  haven:{R:12,col:'#7a6656',tex:'craters',home:true},
  veray:{R:12,col:'#c0623a',tex:'bands'},
  kess:{R:8,col:'#9aa6c4'},
  brakka:{R:12,col:'#c99a5a',tex:'dunes',regions:{flats:'#b9743f',dustfall:'#a88a62'}},
  callis:{R:12,col:'#4fb0a0',tex:'cap'},
  meridian:{R:17,col:'#ffd866',tex:'bands',ring:true,heg:true},
  volund:{R:16,col:'#d0563a',tex:'cracks',heg:true},
  halcyon:{R:14,col:'#7fc8d8',tex:'islands',heg:true},
  dreymar:{R:11,col:'#a8743a',tex:'craters'},
  sable:{R:11,col:'#5d8a4a',tex:'islands'},
  nyx:{R:10,col:'#8a5aa8',tex:'craters'},
  tarsis:{R:12,col:'#d8b860',tex:'bands'},
  oubli:{R:10,col:'#6a6f7a',tex:'craters'},
  menk:{R:12,col:'#e6dcc8',tex:'flats',regions:{saltreach:'#ece5d6',kilnridge:'#bfae94',menkcross:'#a99a80'}},
  ballakan:{R:13,col:'#3f8a5a',tex:'river'},
  parity:{R:12,col:'#8a94b0',tex:'grid'},
};
/* which region a source lives in (others fall back to the planet's first settlement) */
const SRC_REGION={venn:'dustfall',tess:'saltreach',pell:'tollgate',cask:'ledger'};
/* the Hegemony's visible presence per region (cosmetic; keyed by the game's region ids) */
const HEG_SITE={dustfall:'Sheriff’s office',flats:'Tithe depot and garrison',saltreach:'Company crawlers',
  kilnridge:'Foundry contract office',menkcross:'Precinct house',tollgate:'Toll office',ledger:'Bureau registry',quota:'Labour wardens'};
/* hand-tuned decor and marker anchors per region, [kind,u,v] in planet unit-disc coordinates;
   regions without an entry get a seeded scatter from their name and blurb */
const REGION_DECOR={
  dustfall:[['town',0,0],['pad',.14,.1],['source',-.1,-.08],['heg',.08,-.1]],
  flats:[['mesa',-.55,-.35],['well',-.3,.15],['well',.1,-.55],['depot',-.45,.45],['mesa',.35,-.7],['heg',-.45,.45],['job',-.2,-.3]],
  saltreach:[['flats',-.5,-.3],['crawler',-.35,-.05],['crawler',-.6,.15],['source',-.4,-.2],['heg',-.35,-.05]],
  kilnridge:[['ridge',.45,-.4],['kiln',.3,-.55],['kiln',.55,-.25],['road',.4,-.1],['heg',.5,-.45]],
  menkcross:[['town',0,.42],['pad',.12,.5],['heg',-.08,.4]],
};

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
  vip:{name:'Strider SK-1',first:'Strider',hp:Enemies.owned('strider').hp,def:Enemies.owned('strider').def,wpns:[Enemies.owned('strider').weapon_1],strider:1},
  req:{team:3,teamRole:'Soldier',transport:1,prize:0},
  desc:'With the Power Plant gone, the AutoCom Plant is shipping its last Strider Mk I out of the Crossing depot. It is parked in a locked holding yard, waiting for a hauler. A robotic mech like that could be reprogrammed to fight for us, if we can steal it and guide it out of there on its own two legs.',
  objectives:['Override the Strider\u2019s leash panel in the holding yard','(Optional) Do it without the enemy realising you were there','Guide the Strider and the squad back to the Marta'],
  rew:{c:450,m:200,xp:0.3},bonus:{c:300},
  after:['<b>BRANDT:</b> \u201cThe whole Crossing came out to watch a Hegemony walker stroll off with a rebel badge on it. The foreman is pretending he was asleep. You have a machine now, Commander. Try not to get it shot.\u201d']};
const typeOf=m=>m.type||(m.ground?'ground':m.lead==='space'?'space':'abstract');
const SEATS={};for(const r of SRDB.raw.ships)if(r.extra_people>0)for(const k of String(r.legacy_keys).split('|'))if(k)SEATS[k]=r.extra_people;     // troop seats per transport
/* who carries the job: soldiers and marines (ground combat) or pilots (space combat). Colour and icon match the crew rail. */
const opKind=m=>{let r=null;try{r=reqOf(m);}catch(e){}return (typeOf(m)==='ground'||(r&&r.teamRole==='Soldier'))?'ground':'space';};
const OPKIND={ground:{label:'Ground',icon:'soldier',tone:'friend',card:' sr-card--friend'},space:{label:'Space',icon:'ship',tone:'action',card:''}};
const opTag=m=>{const k=OPKIND[opKind(m)];return '<span class="sr-tag bs-op sr-tag--'+k.tone+'" title="'+(opKind(m)==='ground'?'Soldiers lead this mission':'Pilots lead this mission')+'">'+IC(k.icon)+k.label+'</span>';};
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
    variants:['Auto Factory','AutoCom Plant','Bot Assembly Plant'],
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
  autofactory:{src:'tess',loc:'menk',region:'kilnridge',target:'AutoCom Plant'},
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
/* a mission's place names from its world and region ids (m.loc, m.region): names are display only, ids are kept */
function ctxNames(m){
  const d=m&&m.ctx&&m.loc&&pdef(m.loc);
  if(!d||m.ctx.locName===undefined)return;
  const reg=d.regions&&m.region?d.regions.find(r=>r.id===m.region):null;
  m.ctx.place=reg?reg.name:d.name;m.ctx.locName=d.name;
  if(m.oppId)m.from='Intelligence \u00b7 '+d.name;
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
    bio:'Flew you in and didn’t ask questions. Knows every port, every price, and every sheriff’s bad habit between here and the core.'},
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
        ['\u201cWe are here to make life hell for the Hegemony. We blow the towers.\u201d','blow','Three Explosive Charges, cobbled together from the decode lab\u2019s spare parts.',{items:['charge','charge','charge']}],
        ['\u201cThere is more in those feeds than a bang. We tap them.\u201d','hack','Three Data Limpets, still warm from the lab.',{items:['limpet','limpet','limpet']}]]},
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
    for(const it of (gift.items||[]))grantItem(it,1,'gift');
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
      text:'“So you and your revolutionaries want to matter out here, want to survive? Then you need some wings, and I don’t mean that bucket of bolts hauler in your new hangar. I mean something with some teeth! Dustfall, a frontier town on Brakka, keeps one has-been FT-4 Cross on the pad behind the HQ. And you can’t afford to be picky when you’re just a group of idealists with nothing but dreams to pay for things with. I can get you the pad layout, but the rest will be up to you. Put your team together, and restore that old Graf in your hangar to get them there. You’ll need a second pilot for the job. I’ll ask around. You’re welcome, by the way!”'};
    G.onboard='revealed';
    return true;
  }
  if(src.id==='cass'&&G.onboard==='seraoffered'&&!G.people.some(p=>p.id==='sera')){
    src.signal={kind:'recruitSera',
      text:'“Don’t thank me too fast, but I’ve found your stick. Sera Kest — ex-Hegemony survey pilot. She’s been asking around unsavoury types for any jobs going to put some dirt in the Empress’ eye and I think she’ll appreciate a real cause like yours. They say she’s grounded for attitude and hungry to fly a fighter again. She’s on my next run over to you if you’ll have her.”'};
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
    src.signal={kind:'mission',mid:'autofactory',text:'\u201cThe AutoCom Plant at Kiln Ridge runs off one power plant. One. If somebody had a charge and a little nerve, the whole line would go dark. Half my crews have cousins inside. We would rather they were out of work than out of luck.\u201d'};
    return true;
  }
  if(src.id==='cass'&&G.postDepot&&!hasStory('stealfuel')){
    src.signal={kind:'mission',mid:'stealfuel',
      text:'“Your ships are drinking more than my friends do. Redrock Flats, east of Dustfall: the herders’ fuel tithe all ends up in one depot with a pump house and a bored guard detail. Call your hauler down on their apron and let her drink.”'};
    return true;
  }
  if(src.id==='tess'&&storyDone('autofactory')&&!G.missions.some(m=>m.id==='stealstrider')){
    src.signal={kind:'mission',mid:'stealstrider',
      text:'\u201cThe AutoCom Plant is shutting down for repairs, and they are moving the last Strider out through the Crossing depot. Nobody thinks the thing needs a proper guard; it is bigger than the guards. If somebody can get to its leash panel, it will walk wherever you tell it.\u201d'};
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
      txt+=' The mission requires two pilots and we have one. Cass is already asking around; advance a day to see what he has found.';
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
/* ---------- recruiting: the Command Center task ----------
   Issue it, wait a few days, and a handful of candidates turn up to be looked over on the New Recruit screen.
   A staffed Command Center and a Charismatic rebel both bring more people through the door. */
const RECRUIT_DAYS=3,RECRUIT_COST=200;
const freeBunks=()=>Math.max(0,bunkCap()-bunksUsed());
function canRecruit(){return hasRoom('command')&&!G.recruit.days&&!G.recWait.length&&G.credits>=RECRUIT_COST&&freeBunks()>0;}
function recruitWhy(){
  if(G.recruit.days)return 'Already out looking: '+G.recruit.days+' day'+(G.recruit.days>1?'s':'')+' left.';
  if(G.recWait.length)return 'Candidates are waiting for your decision.';
  if(G.credits<RECRUIT_COST)return 'Needs '+RECRUIT_COST+' credits.';
  if(!freeBunks())return 'No bunks free. Build a quarters annex first.';
  return '';
}
function startRecruit(){
  if(!canRecruit())return;
  G.credits-=RECRUIT_COST;G.recruit={days:RECRUIT_DAYS};
  news('Word goes out through the docks and the dormitories. In <b>'+RECRUIT_DAYS+' days</b> we will see who answers.','a');
  sBuild();saveSnap();syncUI();
}
function recruitTick(){
  if(!G.recruit.days)return;
  if(--G.recruit.days>0)return;
  const taken=new Set(G.people.map(p=>p.name).concat(G.poolHeld||[],G.recWait.map(p=>p.name)));
  let n=1+(staffOf('command').length?1:0)+(crewOf().some(p=>Rebel.has(p,'charismatic')&&!laidUp(p)&&p.assign!=='mission')&&rng()<0.5?1:0);
  n=Math.min(3,n,Math.max(1,freeBunks()));
  for(let i=0;i<n;i++){
    const x=rng(),role=x<0.45?'Soldier':x<0.8?'Support':'Pilot';
    const g=Rebel.gen(role,taken,rng);taken.add(g.name);
    const p=Rebel.migrate({id:'rcb'+(++G.recSeq),name:g.name,first:g.first,last:g.last,charTrait:g.charTrait,role,level:1,xp:0,assign:'rest',bio:g.bio});
    if(role==='Soldier')p.equip=['pistol'];
    if(role==='Pilot')p.ship='';
    G.recWait.push(p);
  }
  news('<b>'+G.recWait.length+' '+(G.recWait.length>1?'people have':'person has')+'</b> answered the call. They are waiting at the Command Center.','p');
  sAlert();
  RQ.push({t:'recruits'});
}
/* the Command Center card: start the task, watch it run, or review who turned up */
function recruitCard(){
  let body,acts='';
  if(G.recruit.days)body='Out looking. <b>'+G.recruit.days+' day'+(G.recruit.days>1?'s':'')+'</b> until someone turns up.';
  else if(G.recWait.length){body='<b>'+G.recWait.length+'</b> candidate'+(G.recWait.length>1?'s are':' is')+' waiting for your decision.';acts=rbtn('data-recruit-review','Review candidates',false,'sr-btn--sm sr-btn--primary');}
  else{
    const why=recruitWhy();
    body='Put the word out and see who answers. Takes '+RECRUIT_DAYS+' days; a staffed Command Center brings more people.';
    acts='<span class="sr-card__meta">'+C(RECRUIT_COST,G.credits<RECRUIT_COST)+'</span>'+rbtn('data-recruit-start'+(why?' title="'+esc(why)+'"':''),'Recruit new Revolutionaries',!!why,'sr-btn--sm sr-btn--primary');
  }
  return '<div class="sr-card sr-card--friend"><div class="sr-card__title">Recruit new Revolutionaries</div><div class="sr-card__body">'+body+'</div>'+(acts?'<div class="bs-build__row">'+acts+'</div>':'')+'</div>';
}
function openRecruitOffer(src,sig){
  let p,must=false,line;
  if(sig.kind==='recruitSera'){
    must=true;
    p=castRebel({id:'sera',name:'Sera Kest',role:'Pilot',charTrait:'lucky',ship:'',
      bio:'Ex-Hegemony survey pilot. Deserted after an incident at Callis Reach. Looking to put her skills against the Hegemony, ideally for a cause that means something.'},'sera-kest');
    line='Cass’s freighter is inbound. He sets down and down comes the boarding ramp. Walking down, one bag over her shoulder: your new pilot.';
  } else {
    const role=sig.kind==='recruit'?'Soldier':sig.kind==='recruitP'?'Pilot':'Support';
    const nm=holdRecruit(role);
    p=Rebel.migrate({id:'rec'+(G.recruitN+1),name:nm.name,first:nm.first,last:nm.last,charTrait:nm.charTrait,role,level:1,xp:0,assign:'rest',bio:nm.bio});
    if(role==='Soldier')p.equip=['pistol'];
    if(role==='Pilot')p.ship='';
    line=src.name.split(' ')[0]+' vouches for them. The rest is your call.';
  }
  openWin('recruit',{cards:[{p,must,line}]});
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
/* The Infirmary rolls a Med Pack every three days (two with someone on station) for 8 supplies, up to a small stock. */
const PACK_COST=8;
const packCap=()=>4+2*tilesOf('infirmary');
function packTick(){
  if(!hasRoom('infirmary'))return;
  const have=G.armory.find(x=>x.id==='medpack');
  if((have?have.n:0)>=packCap()){G.packClock=0;return;}
  G.packClock=(G.packClock||0)+1;
  if(G.packClock<(medStaff().length?2:3)||G.supplies<PACK_COST)return;
  G.packClock=0;G.supplies-=PACK_COST;
  Items.grant(G.armory,'medpack',1,'made');
  autoEquip();
}
function advanceDay(){
  if(!started)return;
  const attn0=new Set(G.sources.filter(x=>x.alive&&(x.pendingEvent||x.signal)).map(x=>x.id));
  G.day++;
  // Sweet Tooth's stall: a full restock every 7 days; unbought stock is discarded
  if(!G.market||!G.market.lots)ensureMarket();
  else if(G.day>=G.market.next){
    rollMarket();
    news('<b>Sweet Tooth</b> has new stock at Nyx. Six lots, gone by Day '+(G.market.week*7)+'.','g');
  }
  closeTilePop();closeWin();exitRoomView();
  for(const rm of G.rooms){
    if(rm.build){
      rm.build.days--;
      if(rm.build.days<=0){delete rm.build;news(ROOMS[rm.key].name+' finished. Put it to work.','g');sBuild();}
    }
  }
  packTick();
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
      G.fighters.push(newFighter({id:'graf',name:'Marta',cls:'graf',hull:70}));
      const joss=G.people.find(p=>p.id==='joss');
      if(joss&&!G.fighters.some(f=>f.id===joss.ship))joss.ship='graf';
      news('<b>The Marta flies.</b> Joss brought the derelict back from the dead — a Graf Hauler with door guns and opinions.','g');
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
  for(const v of G.vehicles||[]){   // ground vehicles patch up in the hangar at the same rate
    if(v.hp>=100)continue;
    if(G.materials>=repCost){G.materials-=repCost;v.hp=Math.min(100,v.hp+rate);}
  }
  patrolTick();
  specTick();
  const xpRate=staffOf('training').length?0.09:0.06;
  // hired mercenaries arrive the morning after the handshake, their own kit already on their backs
  for(const q of (G.mercQ||[])){
    const p=Rebel.migrate(Object.assign({assign:'rest',injured:0,xp:0},q.rec));
    p.joined=G.day;
    p.merc={until:G.day+14,fee:q.fee,missions:0};
    p.ownKit=q.rec.ownKit||{};
    const g=gearHeld(p);
    if(p.ownKit.primary)g.primary=p.ownKit.primary;
    if(p.ownKit.secondary)g.secondary=p.ownKit.secondary;
    G.people.push(p);
    news('<b>'+p.name+'</b> steps off the morning freighter, kit on their back. Fourteen days on the clock.','g');
  }
  if(G.mercQ&&G.mercQ.length){G.mercQ=[];mood();autoEquip();sBuild();}
  // deliveries from Nyx: a bought ship or vehicle takes two days to reach the pad
  for(const dv of (G.inbound||[]))dv.days--;
  for(const dv of (G.inbound||[]).filter(x=>x.days<=0)){
    if(dv.kind==='ship'){
      if(G.fighters.length>=fighterCap()){   // the pad it held got converted away: it waits overhead
        if(!dv.noted){dv.noted=1;news('<b>'+dv.name+'</b> circles overhead — no landing pad free.','h');}
        continue;
      }
      G.fighters.push(newFighter({id:'bm_'+dv.cls+'_'+G.day+'_'+G.fighters.length,cls:dv.cls,hull:100,name:dv.name}));
      news('<b>'+dv.name+'</b> sets down on the pad. Ours now.','g');
      G.inbound=G.inbound.filter(x=>x!==dv);
      sBuild();
    } else if(dv.kind==='vehicle'){
      const v=addVehicle(dv.type);
      news('<b>'+v.name+'</b> rolls off the freighter ramp and into the vehicle pool.','g');
      G.inbound=G.inbound.filter(x=>x!==dv);
      sBuild();
    }
  }
  // a contract that has run out waits for the commander's word (the window re-queues daily until decided)
  for(const p of crewOf())if(p.merc&&G.day>=p.merc.until)RQ.push({t:'contract',id:p.id});
  moraleTick();
  recruitTick();
  for(const p of G.people){
    const wasUp=laidUp(p);
    if(wasUp)Rebel.moraleBump(p,-0.5,'injury');
    if(p.cond&&p.cond.length&&p.assign!=='mission'){
      const res=Rebel.condRecover(p,healRate(p),rng);
      for(const k of res.done)news('<b>'+p.name+'</b> has recovered from '+Rebel.CONDK[k].n.toLowerCase()+'.','g');
      if(res.scar&&Rebel.expGrant(p,'scarred'))news('<b>'+p.name+'</b>\u2019s face will carry the scar for good.','p');
      if(res.blind)news('<b>'+p.name+'</b> has lost the sight in an eye for good. Only a prosthetic will bring it back.','h');
      for(const c of res.up){
        const def=Rebel.CONDK[c.k];
        if(def.after==='prosthetic'){p.body=p.body||{};p.body[c.part]=2;news('<b>'+p.name+'</b>\u2019s prosthetic '+c.part+' is fitted and working.','g');continue;}
        if(!laidUp(p))news(p.name+' is back on their feet.','g');
        if((c.days0||0)>=5&&Rebel.expGrant(p,'scarred'))news('<b>'+p.name+'</b> will carry the scars of this one.','p');
        if(def.after==='nearlydead'&&Rebel.expGrant(p,'nearlydead'))news('<b>'+p.name+'</b> was not expected to walk again, and does.','p');
      }
    }
    if(p.assign!=='mission'&&Rebel.restDay(p)==='rested')news('<b>'+p.name+'</b> has slept it off and is fit for duty again.','g');
    if(wasUp)continue;   // off duty: no training, no rest bonus
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
      if(first&&cass.signal){news('<b>Cass Wender</b> is on the wire — he has something for us. Raise him from the Galaxy.','a');sAlert();}
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
      news('<b>Tessaly Brandt</b> is on the wire: the AutoCom Plant is moving something big.','a');sAlert();
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
    {k:'medic',n:'Combat Medic',live:1,d:'Treats wounds from further away and stretches one Med Pack over two wounds. +3 Presence.'},
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
const specRole=p=>{const r=p.role==='Hero'?p.heroOf:p.role;return r==='Pilot'?'Pilot':(r==='Soldier'||r==='Marine')?'Soldier':null;};
const specOf=p=>p.spec?SPECNAME[p.spec]:'';
const inTraining=role=>G.people.find(p=>p.assign==='spec'&&specRole(p)===role);
function startSpec(pid,k){
  const p=G.people.find(x=>x.id===pid);
  if(!p||!hasRoom('training'))return;
  const role=specRole(p);
  if(!role||p.level<3||p.spec||laidUp(p)||p.assign==='mission'||inTraining(role))return;
  const sp=SPECS[role].find(x=>x.k===k);
  if(!sp||!sp.live||G.credits<SPEC_COST)return;
  G.credits-=SPEC_COST;
  p.assign='spec';p.specTrain={k,days:SPEC_DAYS};
  news('<b>'+p.name+'</b> begins <b>'+sp.n+'</b> training, '+SPEC_DAYS+' days.','a');
  sBuild();saveSnap();syncUI();renderWin();
}
/* the daily pulse of morale: the desperate leave, the rest drift back toward steady, charisma spreads */
function moraleTick(){
  const charm=crewOf().filter(p=>Rebel.has(p,'charismatic')&&!laidUp(p)&&p.assign!=='mission');
  for(const p of crewOf().slice()){
    if(p.morale===undefined)p.morale=Rebel.MORALE_START;
    if(p.morale<=0&&p.assign!=='mission'){
      G.people=G.people.filter(x=>x!==p);
      news('<b>'+p.name+'</b> has had enough and walks out of the revolution. Their bunk is empty by morning.','h');
      for(const q of crewOf()){Rebel.moraleBump(q,-3,'loss');Rebel.bereave(q,p.id,'left');}
      sAlert();continue;
    }
    if(p.assign==='mission')continue;   // away: nothing changes until they are back
    if(p.morale<=20&&!p.mwarn){p.mwarn=1;news('<b>'+p.name+'</b>\u2019s morale has collapsed. Rest, wins or a lift from the others, or they will leave.','h');}
    if(p.morale>30)p.mwarn=0;
    for(const msg of Rebel.expDaily(p,rng))news('<b>'+p.name+'</b> '+msg,'g');
    if(Rebel.expHas(p,'grieving'))Rebel.moraleBump(p,-0.5,'misc');
    Rebel.moraleBump(p,(Rebel.driftTarget(p)-p.morale)*0.04,'rest');
    const others=charm.length-(charm.includes(p)?1:0);
    if(others>0)Rebel.moraleBump(p,0.15*others,'misc');
  }
  mood();
}
function specTick(){
  for(const p of G.people){
    if(p.assign!=='spec'||!p.specTrain)continue;
    if(laidUp(p)){p.assign='rest';p.specTrain=null;continue;}
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
  if(!$('estSplash').hidden)return false;   // reports hold until the splash closes
  const n=RQ.shift();
  if(!n)return false;
  if(n.t==='arrive')openWin('arrive',n.rpt);
  else if(n.t==='reward')openWin('reward',n.rpt);
  else if(n.t==='recruit'){
    const nm=n.m.npc;
    const p=Rebel.migrate({id:'rec'+(G.recruitN+1),name:nm.name,first:nm.first,last:nm.last,charTrait:nm.charTrait,role:nm.role,level:1,xp:0,assign:'rest',bio:nm.bio});
    openWin('recruit',{cards:[{p,must:false,line:'<b>'+nm.name+'</b>, freed and still catching their breath, asks to stay and fight.'}]});
  }
  else if(n.t==='hero'){
    if(!G.people.some(p=>p.id===n.id))return nextReport();
    sAlert();openWin('newhero',n.id);
  }
  else if(n.t==='contract'){
    const p=G.people.find(x=>x.id===n.id);
    if(!p||!p.merc||G.day<p.merc.until)return nextReport();
    sAlert();openWin('contract',n.id);
  }
  else if(n.t==='recruits'){
    if(!G.recWait.length)return nextReport();
    openWin('recruit',{cards:G.recWait.map(p=>({p})),batch:true});
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
  for(const p of pilots){p.assign='rest';tireNews(p);}
  for(const fid of m.progress.fighters){const f=G.fighters.find(x=>x.id===fid);if(f)f.out=false;}
  if(ok){
    let rew=[];
    applyRew(m.rew,rew);
    if(m.rew.fighter){
      if(G.fighters.length<fighterCap()){
        G.fighters.push(newFighter({id:'t'+(G.fighters.length+1),name:'Talon '+(G.fighters.length),cls:'talon',hull:70}));
        rew.push('+1 fighter');
      } else {G.credits+=600;rew.push('no berth — sold for '+C(600));}
    }
    if(m.rew.cross){
      if(G.fighters.length<fighterCap()){
        G.fighters.push(newFighter({id:'cross_'+(G.fighters.length+1),name:'Dustfall',cls:'cross',hull:85}));
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
    Rebel.layUp(hurt,'downed',2);
    const f=G.fighters.find(x=>x.id===m.progress.fighters[0]);
    if(f)f.hull=Math.max(15,f.hull-30);
    moraleAll(-3,'loss',pilots.map(p=>p.id),-8);hurt.injuries=(hurt.injuries||0)+1;Rebel.moraleBump(hurt,-5,'injury');mood();
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
  const lines=['Coded burst to '+src.loc+'. '+src.name.split(' ')[0]+' is responding on our secure channel.','Cultivation increased.'];
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
  if(srcSel&&srcSel.t==='s'&&srcSel.id===src.id)srcSel=null;
  closeWin();showView('galaxy');
  syncUI();
}
function srcCutLoose(src){
  src.alive=false;
  moraleAll(-6,'loss');
  for(const o of G.sources)if(o.alive&&o!==src)o.cult=Math.max(0,o.cult-20);
  news('<b>'+src.name+'</b> cut loose — codes burned, drops abandoned. The whole network feels the cold.','h');
  if(srcSel&&srcSel.t==='s'&&srcSel.id===src.id)srcSel=null;
  closeWin();showView('galaxy');
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
function patrolPilot(f){return G.people.find(p=>isFlyer(p)&&p.ship===f.id&&!offDuty(p)&&p.assign!=='mission'&&p.assign!=='spec'&&!Rebel.expHas(p,'grieving'));}
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
        if(to>=100){gain+=REV_W.libFull;news('<b>'+r.name+'</b> is LIBERATED. The flag goes up.','g');moraleAll(4,'win');flashMsg('<b>'+r.name+'</b> liberated','good');SR.transition('flag',{text:'LIBERATED'});}
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
/* ---------- world art: the Bobbleheads kit (game/art/sr-art.js) ---------- */
const SA=window.SR_ART;
/* a rebel's face for crew lists, rosters and the dossier; cached as a data URL and
   re-rendered when the record changes (rank, role, conditions, body, traits, morale band) */
const portraitCache=new Map();
function portraitKey(p){
  const band=!p.auto&&p.morale!==undefined?Rebel.mband(p).k:'';
  return [p.rank||0,p.off?1:0,p.role,p.heroOf||'',p.spec||'',(p.cond||[]).map(c=>c.k).join(','),
    JSON.stringify(p.body||{}),(p.traits||[]).map(t=>t.k).join(','),p.charTrait||'',band].join('|');
}
function portraitURL(p){
  if(p.auto||!p.id)return null;
  const key=portraitKey(p);
  const hit=portraitCache.get(p.id);
  if(hit&&hit.key===key)return hit.url;
  try{
    const c=document.createElement('canvas');c.width=c.height=48;
    SA.portrait(c.getContext('2d'),24,24,22,personSpec(p),{t:0});
    const url=c.toDataURL();
    portraitCache.set(p.id,{key,url});
    return url;
  }catch(e){return null;}
}
function faceHTML(p){
  const u=portraitURL(p);
  return u?'<img class="bs-face" src="'+u+'" alt="">':ini(p.name);
}
/* who someone is, read live from their record; nothing saved (docs/art/HANDOFF.md) */
function personSpec(p){return SA.lookOf(p);}
/* what a room's crew are doing */
function jobPose(key){return key==='workshop'?'work':key==='comms'?'hack':key==='store'?'loot':key==='training'?'aim':'idle';}
/* a Bobblehead standing in a room view (local coordinates); S matches the old stick-figure scale */
function figure(x,y,S,name,col,p,pose){
  if(p)SA.character(ctx,x,y,personSpec(p),{view:'front',state:pose||'idle',t:(RM?0:worldT/1000)+x*0.013,s:S*0.48});
  else{
    ctx.fillStyle=col||K.rebelHi;
    ctx.beginPath();ctx.roundRect(x-3*S,y-12*S,6*S,10*S,3*S);ctx.fill();
    ctx.beginPath();ctx.arc(x,y-15*S,3*S,0,Math.PI*2);ctx.fill();
  }
  if(name){
    ctx.font='700 '+Math.max(Math.round(9*S),Math.ceil(11/rvSx))+'px '+TH.FONT.ui;
    ctx.textAlign='center';ctx.fillStyle=TH.rgba(K.text2,0.9);
    ctx.fillText(name,x,y+9*S+3);
  }
}
/* game ship class -> art hull id (the fleet's 'cross' and the db's 'viper' are the same hull) */
function artShipId(cls){return SA.SHIP_FOR_GAME[cls]||(SA.SHIPS[cls]?cls:'cross');}
/* a ship parked in an isometric space (the hangar's walk-in view, the workshop, the hangar on the base map): the art
   kit's 3D hangar model (SR_ART.hangarShip), engines cold, facing the viewer's left; door guns show when the Graf has
   them fitted. Ships with no model fall back to shipIso inside the kit. ISO_K is the room view's isometric scale;
   s is a size a little under the guide's (the Graf 2.2, a fighter 2.6, so ships sit inside their berths) times the caller's room scale. */
const ISO_K=1.25;
function craftIso(cls,x,y,k,o){
  o=Object.assign({},o||{});
  const id=artShipId(cls),f=o.fighter;delete o.fighter;
  if(f&&hasDoorGun(f))o.loadout={attach:['doorgun']};
  SA.hangarShip(ctx,id,x,y,(id==='graf'?2.2:2.6)*k,ISO_K,RM?0:worldT/1000,Object.assign({livery:'rebel',cold:true},o));
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
          craftIso('graf',x+6*S,y-2*S,S*0.32,{livery:'civ',damage:0.5});
          ctx.globalAlpha=1;
        }
        for(let i=0;i<Math.min(3,G.fighters.length);i++){
          const f=G.fighters[i];
          ctx.globalAlpha=f.out?0.25:0.95;
          craftIso(f.cls,x+(i-1)*16*S,y+(i-1)*4*S-4*S,S*0.32,{damage:1-f.hull/100,fighter:f});
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
    if(rm.key==='hangar'&&G.wreck&&!G.wreck.restored)info+='<br>A derelict <b>Graf Hauler</b> sits under ten years of dust. Joss swears she’ll fly.';
  } else if(rm.key==='barracks'){
    info='Bunks '+bunksUsed()+'/'+bunkCap()+' · '+clusterTiles(clusterOf(rm))+' rooms · morale '+Math.round(G.morale)+staffLine('barracks')+
      '<br>Recruits come through the network. Work your sources; when one signals about people, follow it.';
  } else if(rm.key==='store'){
    info=C(Math.round(G.credits))+' '+S(Math.round(G.supplies))+'/'+supCap()+' '+I(Math.round(G.intel))+
      '<br>Armory: '+G.armory.map(a=>a.name+' ×'+a.n).join(' · ')+staffLine('store');
  } else if(rm.key==='infirmary'){
    const patients=G.people.filter(laidUp);
    const treating=G.people.filter(p=>!laidUp(p)&&(p.cond||[]).length);
    info='Med Packs '+stockOf('medpack')+'/'+packCap()+' (8 supplies each, a new one every '+(medStaff().length?2:3)+' days) · Patients: '+(patients.length?patients.map(p=>p.name+' ('+outDays(p)+'d)').join(', '):'none')+(treating.length?' · Recovering: '+treating.map(p=>p.name.split(' ')[0]+' ('+p.cond.map(c=>Rebel.CONDK[c.k].n).join(', ')+')').join('; '):'')+' · recovery '+(Math.round(healRate()*100)/100)+'/day'+staffLine('infirmary');
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
  if(rm.key==='command')cards+=recruitCard();
  if(rm.key==='infirmary')cards+=prostheticCards();
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
  if(rm.key==='store')acts=rbtn('data-open="gear"','Arsenal');
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
  const addFig=(fx,fy,p,fcol,pose)=>{
    figure(fx,fy,2,p?p.name.split(' ')[0]:'',fcol,p,pose||jobPose(rm.key));
    if(p)rvFigs.push({x:cx+fx*Sx,y:cy+fy*Sx,r:24,pid:p.id});
  };
  const POST_EMOTE={command:'\u2615',workshop:'\ud83d\udd27',comms:'\ud83d\udce1',store:'\ud83d\udce6'};
  const addStaff=(fx,fy,p,i)=>{addFig(fx,fy,p);if(POST_EMOTE[rm.key])SA.emote(ctx,fx,fy-66,POST_EMOTE[rm.key],RM?0:now/1000,i||0);};
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
    // berths tile the floor: a g×g grid in floor space, each pad a diamond that exactly fits its cell
    const g=Math.max(2,Math.ceil(Math.sqrt(cap))),bw=250/g*0.86,bh=130/g*0.86,csz=2.4*Math.min(1,2/g);
    for(let i=0;i<cap;i++){
      const ga=((i%g)+0.5)*2/g-1,gb=(Math.floor(i/g)+0.5)*2/g-1;
      const bx=(ga-gb)*125,by=(ga+gb)*65;
      ctx.strokeStyle=TH.rgba(col,0.45);ctx.lineWidth=1.5;ctx.setLineDash([6,5]);
      ctx.beginPath();ctx.moveTo(bx,by-bh);ctx.lineTo(bx+bw,by);ctx.lineTo(bx,by+bh);ctx.lineTo(bx-bw,by);ctx.closePath();ctx.stroke();
      ctx.setLineDash([]);
      const f=G.fighters[i],ly=by+bh*0.74,cy0=by-bh*0.2;
      if(!f&&i===G.fighters.length&&rm.key==='hangar'&&G.wreck&&!G.wreck.restored){
        craftIso('graf',bx,by,csz/2.4,{livery:'civ',damage:0.5});
        ctx.font=fnt(11);ctx.textAlign='center';
        ctx.fillStyle=K.gold;
        ctx.fillText(G.wreck.restoring?'Restoring · '+G.wreck.restoring+'d':'Derelict',bx,ly+6);
        continue;
      }
      if(f&&!f.out){
        craftIso(f.cls,bx,by,csz/2.4,{damage:1-f.hull/100,fighter:f});
        ctx.font=fnt(12);ctx.textAlign='center';
        ctx.fillStyle=K.text;ctx.fillText(f.name,bx,ly+2);
        ctx.fillStyle=K.ink;ctx.fillRect(bx-27,ly+7,54,7);
        ctx.fillStyle=hullCol(f.hull);
        ctx.fillRect(bx-25,ly+9,50*f.hull/100,3);
        if(f.hull<100&&rng()<0.05)spark(bx+(rng()-0.5)*36,by+8);
        rvFigs.push({x:cx+bx*Sx,y:cy+by*Sx,r:Math.max(26,bh*Sx*0.9),fid:f.id});
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
    staffOf('command').forEach((p,i)=>addStaff(-120+i*40,50,p,i));
  } else if(rm.key==='barracks'){
    const cap=Math.min(bunkCap(),12);
    const resters=G.people.filter(p=>p.assign==='rest'&&!laidUp(p));
    for(let i=0;i<cap;i++){
      const bx=(i%3-1)*140,by=Math.floor(i/3)*54-40;
      ctx.fillStyle=TH.rgba(col,0.16);
      ctx.fillRect(bx-40,by-12,80,24);
      ctx.strokeStyle=TH.rgba(col,0.5);ctx.lineWidth=1.5;ctx.strokeRect(bx-40,by-12,80,24);
      const p=resters[i];
      if(p){
        ctx.fillStyle=K.rebelHi;
        ctx.beginPath();ctx.roundRect(bx-28,by-6,44,11,5);ctx.fill();
        SA.portrait(ctx,bx+26,by-1,9,personSpec(p),{t:0});
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
    staffOf('store').forEach((p,i)=>addStaff(-160+i*40,60,p,i));
  } else if(rm.key==='workshop'){
    const wounded=G.fighters.find(f=>!f.out&&f.hull<100);
    ctx.strokeStyle=TH.rgba(col,0.6);ctx.lineWidth=2;
    ctx.strokeRect(-70,-30,140,46);
    if(wounded){
      craftIso(wounded.cls,0,-8,0.9,{damage:1-wounded.hull/100,fighter:wounded});
      ctx.font=fnt(12);ctx.textAlign='center';
      ctx.fillStyle=K.text;ctx.fillText(wounded.name+' — '+wounded.hull+'%',0,46);
      if(rng()<0.12)spark((rng()-0.5)*80,-6);
    } else {
      ctx.font=fnt(12);ctx.textAlign='center';
      ctx.fillStyle=K.text2;ctx.fillText('Lift empty — nothing broken. For once.',0,0);
    }
    staffOf('workshop').forEach((p,i)=>addStaff(-110+i*40,50,p,i));
  } else if(rm.key==='infirmary'){
    const patients=G.people.filter(laidUp);
    for(let i=0;i<2;i++){
      const bx=(i-0.5)*160,by=-10;
      ctx.fillStyle=TH.rgba(col,0.14);ctx.fillRect(bx-45,by-14,90,28);
      ctx.strokeStyle=TH.rgba(col,0.55);ctx.lineWidth=1.5;ctx.strokeRect(bx-45,by-14,90,28);
      const p=patients[i];
      if(p){
        ctx.fillStyle=K.hazard;
        ctx.beginPath();ctx.roundRect(bx-32,by-7,52,12,6);ctx.fill();
        SA.portrait(ctx,bx+30,by-1,10,personSpec(p),{face:'worried',t:0});
        ctx.font=fnt(11,600);ctx.textAlign='center';
        ctx.fillStyle=K.hazard;ctx.fillText(p.name.split(' ')[0]+' · '+outDays(p)+'d',bx,by+30);
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
    staffOf('comms').forEach((p,i)=>addStaff(120+i*40,30,p,i));
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

/* =====================================================================
   GALAXY VIEW — the galaxy is a full view beside Base; selecting a world
   with access dives into a World view (docs/ui/GALAXY-HANDOFF.md).
   All UI state here is per-session; nothing is added to G or the save.
   ===================================================================== */
let baseView='base',gxWorld=null,gxRegion=null,gxDiveT=0,gxLegend=false,gxLoreOpen=false;
let gxZoom=1,gxCam=null,gxCamLastT=0,gxHitL=[],gxSrcPos={};
const GXL_KEY='sr-galaxy-layers';
function loadGxLayers(){const d={network:1,leads:1,missions:1,lib:1,heg:0,flights:1};try{const v=localStorage.getItem(GXL_KEY);if(v)Object.assign(d,JSON.parse(v));}catch(e){}return d;}
let gxLayers=loadGxLayers();
function saveGxLayers(){try{localStorage.setItem(GXL_KEY,JSON.stringify(gxLayers));}catch(e){}}
/* navigation */
function showView(v){
  if(started&&v!==baseView){SR.transition('stripes',{},()=>setView(v));return;}   // the base and the galaxy: a stripe wipe
  setView(v);
}
function setView(v){
  baseView=v;
  if(v!=='galaxy'){gxWorld=null;gxRegion=null;srcSel=null;}
  exitRoomView();closeTilePop();
  if(v==='galaxy'&&G&&!G.srcTutSeen){G.srcTutSeen=1;saveSnap();openWin('srcTutIntro');}
  syncTabs();syncUI();
}
let gxDiveFrom=null;
function enterWorld(id,fx,fy){gxWorld=id;gxRegion=null;srcSel=null;gxLoreOpen=false;gxDiveT=performance.now();gxDiveFrom=(fx!=null)?[fx,fy]:null;syncTabs();syncUI();}
function openRegion(rid){gxRegion=rid;syncUI();}
function gxBack(){gxSheetOpen=false;if(gxRegion)gxRegion=null;else if(gxWorld)gxWorld=null;else if(srcSel)srcSel=null;syncTabs();syncUI();}
/* ---------- camera: fit the galaxy into the clear rect, ease on change ---------- */
const GXSP=[1000,700];   // the 0..1 PLANETDEF coordinates stretch into this abstract space
function gxRect(){
  const cvr=cv.getBoundingClientRect();
  let top=130;
  const tabs=ROOT.querySelector('.sr-tabs');
  if(tabs&&!gxWorld){const r=tabs.getBoundingClientRect();if(r.height)top=r.bottom-cvr.top+16;}
  let bottom=120;
  const cb=$('baseCmdbar');
  if(cb){const r=cb.getBoundingClientRect();if(r.height)bottom=cssH-(r.top-cvr.top)+32;}
  const left=16+(((srcSel&&!gxWorld)||gxWorld)&&!gxPhone()?388:0);   // phones: the panel is a bottom sheet
  const right=88;
  return {x:left,y:Math.max(16,top),w:Math.max(120,cssW-left-right),h:Math.max(120,cssH-Math.max(16,top)-Math.max(60,bottom))};
}
function gxFit(now){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const d of PLANETDEF){x0=Math.min(x0,d.x*GXSP[0]);x1=Math.max(x1,d.x*GXSP[0]);y0=Math.min(y0,d.y*GXSP[1]);y1=Math.max(y1,d.y*GXSP[1]);}
  x0-=70;x1+=70;y0-=60;y1+=70;
  const r=gxRect();
  const sc=Math.min(r.w/(x1-x0),r.h/(y1-y0))*gxZoom;
  const t={s:sc,x:r.x+r.w/2-(x0+x1)/2*sc,y:r.y+r.h/2-(y0+y1)/2*sc};
  if(!gxCam||RM)gxCam={s:t.s,x:t.x,y:t.y};
  else{
    const dt=Math.min(0.1,(now-gxCamLastT)/1000)||0.016;
    const k=1-Math.exp(-dt/0.08);   // ~240ms ease
    gxCam.s+=(t.s-gxCam.s)*k;gxCam.x+=(t.x-gxCam.x)*k;gxCam.y+=(t.y-gxCam.y)*k;
  }
  gxCamLastT=now;
}
const gxPos=d=>[gxCam.x+d.x*GXSP[0]*gxCam.s,gxCam.y+d.y*GXSP[1]*gxCam.s];
const gxR=id=>((WORLD_LOOK[id]||{}).R||8)*gxCam.s;
function gxSelRing(x,y,r,t){
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.lineWidth=6;ctx.strokeStyle=K.ink;ctx.stroke();
  ctx.setLineDash([7,5]);ctx.lineDashOffset=RM?0:-t*10;
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.lineWidth=3;ctx.strokeStyle=K.gold;ctx.stroke();ctx.setLineDash([]);
}
/* §5.1 the source badge: rebel-red disc, signal icon, level numeral on an ink tab */
function drawSrcBadge(x,y,sc,t){
  const hot=sc.risk>60,col=hot?K.hazard:K.rebel,attn=sc.pendingEvent||sc.signal;
  if(attn){
    const q=RM?0:((t*1.2)%1)*5;
    for(const[r0,a] of [[17,.75],[24,.4]]){
      ctx.globalAlpha=a*(RM?1:1-((t*1.2)%1)*.5);
      ctx.beginPath();ctx.arc(x,y,r0+q,Math.PI*1.15,Math.PI*1.85);ctx.lineWidth=2.6;ctx.lineCap='round';ctx.strokeStyle=K.rebel;ctx.stroke();ctx.lineCap='butt';
    }
    ctx.globalAlpha=1;
  }
  ctx.beginPath();ctx.arc(x+1.5,y+2.5,11,0,7);ctx.fillStyle=K.ink;ctx.fill();
  ctx.beginPath();ctx.arc(x,y,11,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=2.2;ctx.strokeStyle=K.ink;ctx.stroke();
  TH.icon(ctx,'signal',x,y-3,12,K.ink,{weight:2.6});
  ctx.beginPath();ctx.roundRect?ctx.roundRect(x-9,y+4,18,13,4):ctx.rect(x-9,y+4,18,13);ctx.fillStyle=K.ink;ctx.fill();
  ctx.font='400 11px '+TH.FONT.display;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff4e6';ctx.fillText(ROMAN[Math.max(0,Math.min(4,(sc.level||1)-1))],x,y+11);
  ctx.textBaseline='alphabetic';
}
function drawGalaxy(now){
  const t=RM?0:now/1000;
  gxFit(now);
  const s=gxCam.s;
  gxHitL=[];gxSrcPos={};
  ctx.fillStyle=K.void;ctx.fillRect(0,0,cssW,cssH);
  /* deterministic starfield, flat dots, no gradients */
  const rand=SA.util.mkRng(42);
  for(let i=0;i<230;i++){
    const x=rand()*cssW,y=rand()*cssH,big=rand()<0.3;
    ctx.fillStyle=TH.rgba(K.steel,0.12+rand()*0.43);
    ctx.fillRect(x,y,big?2:1.2,big?2:1.2);
  }
  /* stepped flat glow around Meridian */
  {const[mx,my]=gxPos(pdef('meridian'));
   for(const[r0,a] of [[340,.035],[230,.045],[130,.05]]){ctx.beginPath();ctx.arc(mx,my,r0*s,0,7);ctx.fillStyle=TH.rgba(K.goldHi,a);ctx.fill();}}
  /* Hegemony security territory: two flat steps, one path per step so overlaps don't darken */
  if(gxLayers.heg)for(const[f,a] of [[1,.085],[.55,.09]]){
    ctx.beginPath();
    for(const d of PLANETDEF){const st=pst(d.id);if(!d.sec||!st||!st.known)continue;const[x,y]=gxPos(d);const r=(18+d.sec*24)*s*f;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,7);}
    ctx.globalAlpha=a;ctx.fillStyle=K.heg;ctx.fill();ctx.globalAlpha=1;
  }
  /* our reach: access and liberation, rebel red as one group */
  {ctx.beginPath();
   for(const d of PLANETDEF){const st=pst(d.id);if(!st)continue;const[x,y]=gxPos(d);
     if(st.access&&!d.base){const r=(22+(st.acc||0)*11)*s;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,7);}
     const lib=d.regions&&st.access?(locLib(d,st)||0):0;
     if(lib>0){const r=(20+lib*0.9)*s;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,7);}}
   ctx.globalAlpha=.12;ctx.fillStyle=K.rebel;ctx.fill();ctx.globalAlpha=1;}
  /* region names */
  if(cssW>700){
    ctx.save();ctx.font='28px '+TH.FONT.display;ctx.textAlign='center';ctx.globalAlpha=.26;
    for(const[nm,fx,fy,col] of [['THE DRIFT',.19,.76,K.rebelHi],['THE CORE',.83,.45,K.hegHi],['THE VERGE',.23,.13,K.psi]]){
      const[x,y]=gxPos({x:fx,y:fy});ctx.fillStyle=col;ctx.fillText(nm,x,y);
    }
    ctx.restore();
  }
  /* hyperlanes: dots, stopping short of each world */
  for(const[a,b] of LANES){
    const da=pdef(a),db=pdef(b);if(!da||!db)continue;
    const sa2=pst(a),sb=pst(b);
    const[xa,ya]=gxPos(da),[xb,yb]=gxPos(db);
    const Ra=gxR(a)+8,Rb=gxR(b)+8;
    const dx=xb-xa,dy=yb-ya,len=Math.hypot(dx,dy);
    if(len<Ra+Rb+14)continue;
    const ux=dx/len,uy=dy/len;
    const x0=xa+ux*Ra,y0=ya+uy*Ra,x1=xb-ux*Rb,y1=yb-uy*Rb;
    const acc=sa2&&sb&&sa2.access&&sb.access,known=sa2&&sb&&sa2.known&&sb.known;
    const step=acc||known?15:19,col=acc?K.rebelHi:known?'#4a5598':'#2c3372';
    const n=Math.max(2,Math.floor(Math.hypot(x1-x0,y1-y0)/step));
    for(let i=0;i<=n;i++){
      const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;
      ctx.beginPath();ctx.arc(x,y,2.6,0,7);ctx.fillStyle=col;ctx.fill();
      if(acc||known){ctx.lineWidth=1.4;ctx.strokeStyle=K.ink;ctx.stroke();}
    }
  }
  /* label queue with collision placement */
  const labs=[],occ=[];
  const txt=(str,x,y,col,size,wt,al)=>{
    ctx.font=(wt||700)+' '+size+'px '+TH.FONT.ui;ctx.textAlign=al||'center';ctx.textBaseline='alphabetic';
    ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle=TH.rgba(K.ink,0.9);ctx.strokeText(str,x,y);
    ctx.fillStyle=col;ctx.fillText(str,x,y);
  };
  const lab=(str,cands,col,size,wt,pri)=>labs.push({s:str,cands,col,size,wt,pri});
  const hold=(x,y,r)=>occ.push({x:x-r,y:y-r,w:2*r,h:2*r});
  const pul=q=>RM?0.5:0.5+0.5*Math.sin(now*0.004+q);
  /* worlds */
  for(const d of PLANETDEF){
    const st=pst(d.id);if(!st)continue;
    const[x,y]=gxPos(d);const lk=WORLD_LOOK[d.id]||{R:8,col:'#9aa6c4'};
    const R=lk.R*s;
    const selHere=srcSel&&srcSel.t==='p'&&srcSel.id===d.id;
    if(!st.known){
      const p=pul(x);
      ctx.beginPath();ctx.arc(x,y,7.5,0,7);ctx.lineWidth=2;ctx.strokeStyle=K.psi;ctx.stroke();
      txt('?',x,y+4,K.psi,11,800);
      ctx.globalAlpha=.25+.3*p;ctx.beginPath();ctx.arc(x,y,13+(RM?0:p*2),0,7);ctx.lineWidth=1.4;ctx.strokeStyle=K.psi;ctx.stroke();ctx.globalAlpha=1;
      if(selHere)gxSelRing(x,y,19,t);
      hold(x,y,15);
      lab('Uncharted',[[x,y+28,'center'],[x,y-20,'center'],[x+19,y+4,'left']],K.psi,11,700,4);
      gxHitL.push({t:'p',id:d.id,x,y,r:22});
      continue;
    }
    if(!st.access&&!d.base){
      ctx.globalAlpha=.62;
      SA.planet(ctx,x,y,R,lk.col,{tex:lk.tex,ring:lk.ring,heg:lk.heg});
      ctx.globalAlpha=1;
      ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(x,y,R+6,0,7);ctx.lineWidth=1.6;ctx.strokeStyle=K.text3;ctx.stroke();ctx.setLineDash([]);
      TH.icon(ctx,'lock',x+R+10,y-R-6,12,K.text2,{outline:1});
    } else {
      SA.planet(ctx,x,y,R,lk.col,{tex:lk.tex,ring:lk.ring,heg:lk.heg,home:lk.home});
    }
    if(gxLayers.lib&&d.regions&&st.access){
      const lb=(locLib(d,st)||0)/100;
      ctx.lineCap='round';
      ctx.beginPath();ctx.arc(x,y,R+8,0,7);ctx.lineWidth=3;ctx.strokeStyle=TH.rgba(K.rebel,.28);ctx.stroke();
      if(lb>0){ctx.beginPath();ctx.arc(x,y,R+8,-Math.PI/2,-Math.PI/2+lb*Math.PI*2);ctx.strokeStyle=K.rebel;ctx.stroke();}
      ctx.lineCap='butt';
    }
    if(selHere)gxSelRing(x,y,R+15,t);
    hold(x,y,R+6);
    lab(d.base?'Haven Rock':d.name,
      [[x,y-R-12,'center'],[x,y+R+18,'center'],[x+R+16,y+4,'left'],[x-R-16,y+4,'right']],
      d.base?K.rebelHi:st.access?K.text:K.text2,d.base||st.access?13:12,d.base?800:700,selHere?9:7);
    lab(st.access?d.kind:'Scout '+d.scout+' intel',[[x,y+R+19,'center'],[x,y-R-27,'center']],K.text3,11,600,2);
    if(!d.base)gxHitL.push({t:'p',id:d.id,x,y,r:Math.max(24,R+10)});
  }
  /* intelligence leads */
  if(gxLayers.leads)for(const o of (G.opps||[])){
    if(o.done)continue;
    const pd=pdef(o.loc);if(!pd)continue;
    const[px,py]=gxPos(pd),R=gxR(o.loc);
    const x=px+R+16,y=py-R-8,p=pul(x+y);
    ctx.fillStyle=K.gold;ctx.strokeStyle=K.ink;ctx.lineWidth=1.8;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+6,y);ctx.lineTo(x,y+8);ctx.lineTo(x-6,y);ctx.closePath();ctx.fill();ctx.stroke();
    if(!o.found){ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(x,y,12+(RM?0:p*2),0,7);ctx.lineWidth=2;ctx.strokeStyle=K.gold;ctx.stroke();ctx.globalAlpha=1;}
    hold(x,y,10);
    lab(o.found?'Lead':'New lead',[[x-12,y+4,'right'],[x+12,y+4,'left'],[x,y-14,'center']],K.goldHi,11,700,5);
    gxHitL.push({t:'o',id:o.id,x,y,r:14});
  }
  /* available missions: gold pins */
  if(gxLayers.missions){
    const by={};
    for(const m of G.missions)if(m.state==='avail'&&m.loc)(by[m.loc]=by[m.loc]||[]).push(m);
    for(const loc in by){
      const pd=pdef(loc);if(!pd)continue;
      const[px,py]=gxPos(pd),R=gxR(loc);
      by[loc].slice(0,2).forEach((m,i)=>{
        const x=px-R-18-i*24,y=py-R-8;
        TH.marker(ctx,x,y+8,{icon:typeOf(m)==='space'?'ship':'soldier',color:K.gold,t,size:24});
        hold(x,y,13);
      });
    }
  }
  /* sources ride a ring around their worlds */
  if(gxLayers.network){
    const byW={};
    for(const sc of G.sources){if(!sc.alive)continue;const w=SRCPOS[sc.id]||'veray';(byW[w]=byW[w]||[]).push(sc);}
    for(const w in byW){
      const pd=pdef(w);if(!pd)continue;
      const[px,py]=gxPos(pd),R=gxR(w);
      byW[w].forEach((sc,i)=>{
        const a=-0.65+i*0.95;
        const x=px+Math.cos(a)*(R+18),y=py+Math.sin(a)*(R+18);
        drawSrcBadge(x,y,sc,t);
        gxSrcPos[sc.id]=[x,y];
        if(srcSel&&srcSel.t==='s'&&srcSel.id===sc.id)gxSelRing(x,y,18,t);
        hold(x,y,14);
        lab(sc.name.split(' ').pop(),[[x+17,y+4,'left'],[x-17,y+4,'right'],[x,y+30,'center']],sc.risk>60?K.hazard:K.rebelHi,11,700,6);
        gxHitL.push({t:'s',id:sc.id,x,y,r:17});
      });
    }
  }
  /* ships on their way home */
  if(gxLayers.flights){
    const[hx,hy]=gxPos(pdef('haven'));
    for(const m of G.missions){
      if(m.state!=='prog'||!m.progress)continue;
      const pd=pdef(m.loc||'veray');if(!pd)continue;
      const f=G.fighters.find(x=>x.id===(m.progress.fighters||[])[0]);
      const[px,py]=gxPos(pd);
      const total=m.days||1,left=m.progress.daysLeft||0;
      const k=0.3+0.45*Math.max(0,Math.min(1,1-left/total));
      const x=px+(hx-px)*k,y=py+(hy-py)*k;
      const ang=Math.atan2(hy-py,hx-px);
      ctx.save();ctx.setLineDash([5,7]);ctx.strokeStyle=TH.rgba(K.gold,.6);ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(px+(x-px)*.3,py+(y-py)*.3);ctx.lineTo(x-Math.cos(ang)*18,y-Math.sin(ang)*18);ctx.stroke();ctx.restore();
      SA.ship(ctx,artShipId(f?f.cls:'cross'),x,y,ang,1.05,t,{livery:'rebel'});
      hold(x,y,16);
      lab((f?f.name:'Flight')+' · '+(left<=1?'home tomorrow':left+' days'),[[x,y+28,'center'],[x,y-20,'center']],K.text2,11,700,3);
    }
  }
  /* place labels by priority, skipping collisions */
  labs.sort((a,b)=>b.pri-a.pri);
  const placed=occ.slice();
  for(const l of labs){
    ctx.font=l.wt+' '+l.size+'px '+TH.FONT.ui;
    const tw=ctx.measureText(l.s).width;
    for(const[x,y,al] of l.cands){
      const rx=al==='left'?x:al==='right'?x-tw:x-tw/2,r={x:rx-3,y:y-l.size,w:tw+6,h:l.size+5};
      if(r.x<2||r.x+r.w>cssW-2||r.y<2||r.y+r.h>cssH-2)continue;
      if(placed.some(q=>r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y))continue;
      placed.push(r);txt(l.s,x,y,l.col,l.size,l.wt,al);break;
    }
  }
}
/* =====================================================================
   WORLD VIEW — the planet fills the stage, divided into its regions.
   Region geometry is generated deterministically from the planet id
   (GALAXY-HANDOFF §7.4); no art files, nothing saved.
   ===================================================================== */
const regionShapeCache={};
function regionShapes(pid){
  if(regionShapeCache[pid])return regionShapeCache[pid];
  const d=pdef(pid);
  const regions=(d&&d.regions)||[];
  const rng2=SA.util.mkRng(SA.util.hashStr(pid)||7);
  const terrs=regions.filter(r=>r.kind!=='Settlement');
  const setts=regions.filter(r=>r.kind==='Settlement');
  const hub=[(rng2()-.5)*.24,(rng2()-.5)*.24];
  const out={hub,terr:[],setts:[]};
  const N=terrs.length;
  const a0=rng2()*Math.PI*2;
  const borders=[];
  for(let i=0;i<Math.max(1,N);i++){
    const a=a0+i*2*Math.PI/Math.max(1,N)+(rng2()-.5)*(24*Math.PI/180);
    const npt=4+Math.floor(rng2()*3);
    const pts=[[hub[0],hub[1]]];
    for(let k=1;k<=npt;k++){
      const f=k/npt,ax=a+(k===npt?0:(rng2()-.5)*.16);
      pts.push([hub[0]+Math.cos(ax)*f*1.06,hub[1]+Math.sin(ax)*f*1.06]);
    }
    borders.push({a,pts});
  }
  if(N<=1){
    const pts=[];
    for(let k=0;k<28;k++){const a=k/28*2*Math.PI;pts.push([Math.cos(a)*1.04,Math.sin(a)*1.04]);}
    if(N===1){
      const ca=rng2()*Math.PI*2;
      out.terr.push({id:terrs[0].id,pts,chip:[Math.cos(ca)*.5,Math.sin(ca)*.5]});
    }
  } else for(let i=0;i<N;i++){
    const b0=borders[i],b1=borders[(i+1)%N];
    let aA=b0.a,aB=b1.a;while(aB<=aA)aB+=2*Math.PI;
    const rim=[];
    const steps=Math.max(2,Math.round((aB-aA)/.3));
    for(let k=1;k<steps;k++){const a=aA+(aB-aA)*k/steps;rim.push([hub[0]+Math.cos(a)*1.06,hub[1]+Math.sin(a)*1.06]);}
    const pts=b0.pts.concat(rim,b1.pts.slice().reverse());
    const midA=(aA+aB)/2;
    out.terr.push({id:terrs[i].id,pts,chip:[(hub[0]+Math.cos(midA)*.55)*1.15,(hub[1]+Math.sin(midA)*.55)*1.15]});
  }
  const placed=[];
  setts.forEach((rg,i)=>{
    let c;
    if(N>=2){const b=borders[i%borders.length];const f=.4+rng2()*.15;c=[hub[0]+Math.cos(b.a)*f,hub[1]+Math.sin(b.a)*f];}
    else{const a=rng2()*2*Math.PI,f=.35+rng2()*.15;c=[hub[0]+Math.cos(a)*f,hub[1]+Math.sin(a)*f];}
    for(let tries=0;tries<9&&placed.some(p=>Math.hypot(p[0]-c[0],p[1]-c[1])<.52);tries++){
      const a=rng2()*2*Math.PI,f=.35+rng2()*.2;c=[hub[0]+Math.cos(a)*f,hub[1]+Math.sin(a)*f];
    }
    placed.push(c);
    const R0=.24+rng2()*.03;
    const pts=[];
    for(let k=0;k<11;k++){
      const a=k/11*2*Math.PI;
      const rr2=R0*(.82+rng2()*.3);
      pts.push([c[0]+Math.cos(a)*rr2,c[1]+Math.sin(a)*rr2*.92]);
    }
    const away=Math.atan2(c[1]-hub[1],c[0]-hub[0]);
    out.setts.push({id:rg.id,pts,c,r:R0,chip:[c[0]+Math.cos(away)*(R0+.16),c[1]+Math.sin(away)*(R0+.16)]});
  });
  if(out.terr.length===1&&out.setts.length){
    const c0=out.setts[0].c,aw=Math.atan2(c0[1]-hub[1],c0[0]-hub[0])+Math.PI;
    out.terr[0].chip=[hub[0]+Math.cos(aw)*.55,hub[1]+Math.sin(aw)*.55];
  }
  return regionShapeCache[pid]=out;
}
function ptInPoly(px,py,pts){
  let c=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))c=!c;
  }
  return c;
}
function regState(st,rid){const p=(st.lib&&st.lib[rid])||0;return p>=100?'liberated':p>0?'contested':'hegemony';}
function firstSettId(d){const r=(d.regions||[]).find(x=>x.kind==='Settlement');return r?r.id:null;}
function missionRegion(d,m){if(typeOf(m)==='space')return null;return m.region||firstSettId(d);}
function regionFill(d,rid,i,sett){
  const lk=WORLD_LOOK[d.id]||{col:'#777'};
  if(lk.regions&&lk.regions[rid])return lk.regions[rid];
  const sh=SA.util.shade;
  return sett?sh(lk.col,-.2):sh(lk.col,i%2?.08:-.08);
}
/* decor glyphs, drawn flat with ink outlines; (x,y) world px, k = planet px per unit */
function drawDecor(kind,x,y,k){
  const U=SA.util,c=ctx;
  c.save();c.lineJoin='round';
  if(kind==='mesa'){U.poly(c,[[x-k*.09,y+k*.03],[x-k*.05,y-k*.05],[x+k*.05,y-k*.05],[x+k*.09,y+k*.03]]);U.ink(c,'rgba(60,40,28,.55)',2);}
  else if(kind==='well'){c.beginPath();c.arc(x,y,k*.028,0,7);U.ink(c,'rgba(40,60,90,.8)',2);}
  else if(kind==='depot'||kind==='garrison'){U.rr(c,x-k*.05,y-k*.035,k*.1,k*.07,3);U.ink(c,'rgba(70,70,86,.8)',2);}
  else if(kind==='flats'){c.beginPath();c.ellipse(x,y,k*.12,k*.05,0,0,7);c.fillStyle='rgba(255,255,255,.25)';c.fill();}
  else if(kind==='crawler'){U.rr(c,x-k*.045,y-k*.025,k*.09,k*.05,2);U.ink(c,'rgba(120,110,80,.9)',2);c.fillStyle='rgba(0,0,0,.4)';c.fillRect(x-k*.045,y+k*.012,k*.09,k*.014);}
  else if(kind==='ridge'){c.beginPath();for(let i=0;i<=4;i++)c.lineTo(x-k*.12+i*k*.06,y+((i%2)?-k*.045:0));c.lineWidth=2.6;c.strokeStyle='rgba(40,28,20,.6)';c.stroke();}
  else if(kind==='kiln'){U.poly(c,[[x-k*.035,y+k*.03],[x,y-k*.05],[x+k*.035,y+k*.03]]);U.ink(c,'rgba(90,60,40,.8)',2);}
  else if(kind==='road'){c.beginPath();c.moveTo(x-k*.1,y+k*.03);c.quadraticCurveTo(x,y-k*.02,x+k*.1,y+k*.02);c.lineWidth=3;c.strokeStyle='rgba(30,22,16,.4)';c.stroke();}
  else if(kind==='pad'){c.beginPath();c.arc(x,y,k*.045,0,7);c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.4)';c.stroke();}
  else if(kind==='tree'){c.beginPath();c.arc(x,y,k*.03,0,7);U.ink(c,'rgba(24,60,34,.8)',1.6);}
  else if(kind==='block'){U.rr(c,x-k*.04,y-k*.04,k*.08,k*.08,2);U.ink(c,'rgba(70,80,110,.6)',1.6);}
  c.restore();
}
function scatterFor(r){
  const t=(r.name+' '+(r.blurb||'')).toLowerCase();
  if(/quarry|salt|crusher|pit/.test(t))return['flats','crawler','crawler'];
  if(/ridge|kiln|smelt|foundry/.test(t))return['ridge','kiln','kiln'];
  if(/river|canopy|timber|mill|barge/.test(t))return['tree','tree','road','tree'];
  if(/data|server|cool|registry|census/.test(t))return['block','block','block'];
  if(/flat|herder|well|tithe/.test(t))return['mesa','well','well','mesa'];
  return['mesa','mesa'];
}
let gxRegScreen=[],gxChipPts={},gxWorldDiveK=1;
function drawWorld(now){
  const t=RM?0:now/1000;
  const d=pdef(gxWorld),st=gxWorld&&pst(gxWorld);
  if(!d||!st){gxWorld=null;return;}
  const lk=WORLD_LOOK[d.id]||{col:'#8a8a9a'};
  ctx.fillStyle=K.void;ctx.fillRect(0,0,cssW,cssH);
  const rand=SA.util.mkRng(42);
  for(let i=0;i<180;i++){
    const x=rand()*cssW,y=rand()*cssH,big=rand()<0.3;
    ctx.fillStyle=TH.rgba(K.steel,0.1+rand()*0.3);
    ctx.fillRect(x,y,big?1.8:1.1,big?1.8:1.1);
  }
  const rect=gxRect();
  const cx=rect.x+rect.w/2,cy=rect.y+rect.h/2;
  const R=Math.max(90,Math.min(cssH*0.26,rect.h*0.4,rect.w*0.3));
  const ORX=R*1.51,ORY=R*0.33,OTH=-10*Math.PI/180;
  /* dive-in: the planet scales up from its map position */
  let k=RM?1:Math.min(1,(now-gxDiveT)/420);
  const e=1-Math.pow(1-k,3);
  gxWorldDiveK=k;
  ctx.save();
  if(k<1){
    ctx.globalAlpha=Math.min(1,k/0.6);
    const fx=gxDiveFrom?gxDiveFrom[0]:cx,fy=gxDiveFrom?gxDiveFrom[1]:cy;
    const ox=fx+(cx-fx)*e,oy=fy+(cy-fy)*e,sc=0.16+0.84*e;
    ctx.translate(ox,oy);ctx.scale(sc,sc);ctx.translate(-cx,-cy);
  }
  const shapes=regionShapes(d.id);
  const P=(u,v)=>[cx+u*R,cy+v*R];
  const path=pts=>{ctx.beginPath();pts.forEach((p,i)=>{const[x,y]=P(p[0],p[1]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();};
  const clipDisc=()=>{ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.clip();};
  const hatch=(col,alpha)=>{
    ctx.save();ctx.clip();ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=4;
    ctx.beginPath();
    for(let q=-R*2.2;q<R*2.2;q+=11){ctx.moveTo(cx+q-R*1.6,cy+R*1.6);ctx.lineTo(cx+q+R*1.6,cy-R*1.6);}
    ctx.stroke();ctx.restore();
  };
  const overlay=state=>{
    if(state==='hegemony')hatch(K.heg,.2);
    else if(state==='contested')hatch(K.hazard,.18);
    else{ctx.save();ctx.clip();ctx.globalAlpha=.25;ctx.fillStyle=K.rebel;ctx.fillRect(cx-R,cy-R,R*2,R*2);ctx.restore();}
  };
  gxRegScreen=[];gxChipPts={};
  /* 1. orbit, back half */
  ctx.save();
  ctx.beginPath();ctx.ellipse(cx,cy,ORX,ORY,OTH,Math.PI,Math.PI*2);
  ctx.lineWidth=6;ctx.strokeStyle=K.ink;ctx.stroke();
  ctx.setLineDash([4,6]);ctx.lineWidth=2;ctx.strokeStyle='#5a64a8';ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
  const orbPt=a=>{const ca=Math.cos(a)*ORX,sa=Math.sin(a)*ORY;return[cx+ca*Math.cos(OTH)-sa*Math.sin(OTH),cy+ca*Math.sin(OTH)+sa*Math.cos(OTH)];};
  /* orbit objects behind the planet */
  const spaceMs=G.missions.filter(m=>m.state==='avail'&&m.loc===d.id&&typeOf(m)==='space');
  if((d.sec||0)>=2){
    const[ox2,oy2]=orbPt(Math.PI*1.35+((RM?0:t*0.06)%1));
    SA.ship(ctx,'mote',ox2,oy2,0.5,0.9,t,{livery:'heg'});
    ctx.font='700 11px '+TH.FONT.ui;ctx.textAlign='center';ctx.lineWidth=4;ctx.lineJoin='round';ctx.strokeStyle=TH.rgba(K.ink,.9);
    ctx.strokeText('Hegemony patrol',ox2,oy2-20);ctx.fillStyle=K.hegHi;ctx.fillText('Hegemony patrol',ox2,oy2-20);
  }
  /* 2. ink drop disc */
  ctx.beginPath();ctx.arc(cx+8,cy+12,R,0,7);ctx.fillStyle=K.ink;ctx.fill();
  /* base surface */
  ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fillStyle=lk.col;ctx.fill();
  /* 3. territories */
  ctx.save();clipDisc();
  const terrDefs=(d.regions||[]).filter(r=>r.kind!=='Settlement');
  shapes.terr.forEach((tr,i)=>{
    const rg=terrDefs.find(r=>r.id===tr.id);if(!rg)return;
    path(tr.pts);ctx.fillStyle=regionFill(d,tr.id,i,false);ctx.fill();
    const dec=REGION_DECOR[tr.id];
    const list=dec?dec.filter(x=>!/^(source|job|heg)$/.test(x[0])):null;
    if(list)for(const[kind,u,v]of list){const[x,y]=P(u,v);drawDecor(kind,x,y,R);}
    else{
      const rn=SA.util.mkRng(SA.util.hashStr(tr.id)||3);
      for(const kind of scatterFor(rg)){
        const[chU,chV]=tr.chip;
        const u=chU*.7+(rn()-.5)*.5,v=chV*.7+(rn()-.5)*.5;
        const[x,y]=P(u,v);drawDecor(kind,x,y,R);
      }
    }
    path(tr.pts);overlay(regState(st,tr.id));
    gxRegScreen.push({id:tr.id,pts:tr.pts.map(p=>P(p[0],p[1])),sett:false});
    gxChipPts[tr.id]=P(tr.chip[0],tr.chip[1]);
  });
  ctx.restore();
  /* 4. settlements on top */
  const settDefs=(d.regions||[]).filter(r=>r.kind==='Settlement');
  for(const sp of shapes.setts){
    const rg=settDefs.find(r=>r.id===sp.id);if(!rg)continue;
    ctx.save();clipDisc();
    ctx.save();ctx.translate(2,3);ctx.globalAlpha=.5;path(sp.pts);ctx.fillStyle=K.ink;ctx.fill();ctx.restore();
    path(sp.pts);ctx.fillStyle=regionFill(d,sp.id,0,true);ctx.fill();
    {const[bx,by]=P(sp.c[0],sp.c[1]);
     const rn=SA.util.mkRng(SA.util.hashStr(sp.id)||5);
     const n=5+Math.floor(rn()*2);
     for(let i2=0;i2<n;i2++){
       const a=rn()*Math.PI*2,f=rn()*sp.r*.5*R;
       SA.isoBox(ctx,-4,-4,8,8,7+rn()*7,1,bx+Math.cos(a)*f,by+Math.sin(a)*f*.6,['#b8a888','#6a5c48','#8a7a60'],1.4);
     }}
    path(sp.pts);overlay(regState(st,sp.id));
    ctx.restore();
    gxRegScreen.unshift({id:sp.id,pts:sp.pts.map(p=>P(p[0],p[1])),sett:true});
    gxChipPts[sp.id]=P(sp.chip[0],sp.chip[1]);
  }
  /* 5. veil every other region while one is open */
  if(gxRegion){
    ctx.save();clipDisc();
    for(const rs of gxRegScreen){
      if(rs.id===gxRegion)continue;
      ctx.beginPath();rs.pts.forEach((pp,i)=>i?ctx.lineTo(pp[0],pp[1]):ctx.moveTo(pp[0],pp[1]));ctx.closePath();
      ctx.globalAlpha=.38;ctx.fillStyle=K.ink;ctx.fill();ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  /* 6. cel shade: one ink tone, light from the top left */
  ctx.save();clipDisc();
  ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.arc(cx-R*.20,cy-R*.24,R*1.04,0,7);
  ctx.globalAlpha=.26;ctx.fillStyle=K.ink;ctx.fill('evenodd');ctx.restore();
  /* 7. borders */
  ctx.save();clipDisc();
  for(const tr of shapes.terr){path(tr.pts);ctx.lineWidth=3.2;ctx.strokeStyle=K.ink;ctx.lineJoin='round';ctx.stroke();}
  for(const sp of shapes.setts){
    path(sp.pts);ctx.lineWidth=5;ctx.strokeStyle=K.ink;ctx.stroke();
    const stc=regState(st,sp.id);
    path(sp.pts);ctx.lineWidth=2;ctx.strokeStyle=stc==='liberated'?K.rebel:stc==='contested'?K.hazard:K.heg;ctx.stroke();
  }
  if(gxRegion){
    const rs=gxRegScreen.find(x=>x.id===gxRegion);
    if(rs){ctx.beginPath();rs.pts.forEach((pp,i)=>i?ctx.lineTo(pp[0],pp[1]):ctx.moveTo(pp[0],pp[1]));ctx.closePath();
      ctx.setLineDash([9,6]);ctx.lineWidth=3;ctx.strokeStyle=K.gold;ctx.stroke();ctx.setLineDash([]);}
  }
  ctx.restore();
  /* 8. disc outline and atmosphere */
  ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.lineWidth=4;ctx.strokeStyle=K.ink;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,R+6,0,7);ctx.lineWidth=2;ctx.strokeStyle=TH.rgba(lk.col,.3);ctx.stroke();
  /* 9. markers from live data */
  const anchorFor=(rid,kind)=>{
    const dec=REGION_DECOR[rid];
    if(dec){const hitDec=dec.find(x=>x[0]===kind);if(hitDec)return P(hitDec[1],hitDec[2]);}
    const cp=gxChipPts[rid];
    if(cp)return[cp[0]*.5+cx*.5,cp[1]*.5+cy*.5+14];
    return[cx,cy];
  };
  for(const rid in HEG_SITE){
    if(!(d.regions||[]).some(r=>r.id===rid))continue;
    if(regState(st,rid)==='liberated')continue;
    const[x,y]=anchorFor(rid,'heg');
    ctx.beginPath();ctx.arc(x,y,11,0,7);ctx.fillStyle=K.heg;ctx.fill();ctx.lineWidth=2.2;ctx.strokeStyle=K.ink;ctx.stroke();
    TH.icon(ctx,'shield',x,y,13,K.ink,{weight:2.6});
  }
  const srcHere=G.sources.filter(x=>x.alive&&(SRCPOS[x.id])===d.id);
  gxSrcPos={};
  srcHere.forEach((sc,i)=>{
    const rid=SRC_REGION[sc.id]||firstSettId(d);
    const[x,y]=rid?anchorFor(rid,'source'):[cx-R*.4+i*30,cy-R*.5];
    drawSrcBadge(x,y-18,sc,t);
    gxSrcPos[sc.id]=[x,y-18];
  });
  const groundMs=G.missions.filter(m=>m.state==='avail'&&m.loc===d.id&&typeOf(m)!=='space');
  groundMs.forEach((m,i)=>{
    const rid=missionRegion(d,m);
    const[x,y]=rid?anchorFor(rid,'job'):[cx+R*.3+i*26,cy+R*.4];
    TH.marker(ctx,x+(i%2)*22,y,{icon:'soldier',color:K.gold,t,size:26});
  });
  for(const o of (G.opps||[])){
    if(o.done||o.loc!==d.id)continue;
    const[x,y]=o.region?anchorFor(o.region,'job'):[cx,cy-R*.6];
    ctx.fillStyle=K.gold;ctx.strokeStyle=K.ink;ctx.lineWidth=1.8;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(x,y-8-18);ctx.lineTo(x+6,y-18);ctx.lineTo(x,y+8-18);ctx.lineTo(x-6,y-18);ctx.closePath();ctx.fill();ctx.stroke();
  }
  /* 10. orbit, front half and front objects */
  ctx.save();
  ctx.beginPath();ctx.ellipse(cx,cy,ORX,ORY,OTH,0,Math.PI);
  ctx.lineWidth=6;ctx.strokeStyle=K.ink;ctx.stroke();
  ctx.setLineDash([4,6]);ctx.lineWidth=2;ctx.strokeStyle='#5a64a8';ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
  spaceMs.forEach((m,i)=>{
    const[x,y]=orbPt(0.45+i*0.55);
    TH.marker(ctx,x,y,{icon:'ship',color:K.gold,t,size:26});
  });
  {let i=0;
   for(const m of G.missions){
     if(m.state!=='prog'||!m.progress||m.loc!==d.id)continue;
     const f=G.fighters.find(x=>x.id===(m.progress.fighters||[])[0]);
     const[x,y]=orbPt(2.4+i*0.5);
     SA.ship(ctx,artShipId(f?f.cls:'cross'),x,y,0.3,1.0,t,{livery:'rebel'});
     i++;
   }}
  ctx.restore();   // dive transform
  /* region chips follow the planet */
  {const ids=Object.keys(gxChipPts).sort((a,b)=>gxChipPts[a][1]-gxChipPts[b][1]);
   for(let i=0;i<ids.length;i++)for(let j=0;j<i;j++){
     const A=gxChipPts[ids[i]],B=gxChipPts[ids[j]];
     if(Math.abs(A[0]-B[0])<160&&Math.abs(A[1]-B[1])<42)A[1]=B[1]+44;
   }}
  const chipBox=$('gxChips');
  if(chipBox&&!chipBox.hidden){
    chipBox.style.opacity=k>=1?'1':'0';
    for(const b of chipBox.querySelectorAll('[data-gxchip]')){
      const pt=gxChipPts[b.getAttribute('data-gxchip')];
      if(pt){b.style.left=pt[0]+'px';b.style.top=pt[1]+'px';}
    }
  }
  /* the galaxy minimap button */
  const mini=document.getElementById('gxMiniCv');
  if(mini){
    const mc=mini.getContext('2d');
    mc.setTransform(1,0,0,1,0,0);
    mc.fillStyle=K.void;mc.fillRect(0,0,200,130);
    for(const pd2 of PLANETDEF){
      const st2=pst(pd2.id);if(!st2||!st2.known)continue;
      const x=14+pd2.x*172,y=10+pd2.y*110;
      mc.beginPath();mc.arc(x,y,pd2.id===d.id?4:2.4,0,7);
      mc.fillStyle=pd2.id===d.id?K.gold:st2.access?K.text2:K.text3;mc.fill();
      if(pd2.id===d.id){mc.beginPath();mc.arc(x,y,7,0,7);mc.lineWidth=2;mc.strokeStyle=K.gold;mc.stroke();}
    }
  }
}
/* ---------- galaxy DOM: dock panel, rail, tools, command bar ---------- */
const planetURLs={};
function planetURL(id){
  if(planetURLs[id])return planetURLs[id];
  const lk=WORLD_LOOK[id]||{R:10,col:'#9aa6c4'};
  const c=document.createElement('canvas');c.width=c.height=80;
  const c2=c.getContext('2d');
  SA.planet(c2,40,42,lk.ring?20:26,lk.col,{tex:lk.tex,ring:lk.ring,heg:lk.heg});
  return planetURLs[id]=c.toDataURL();
}
function srcAvatarHTML(s){
  const hot=s.risk>60,attn=s.pendingEvent||s.signal;
  return '<span class="sr-avatar gx-src" style="--c:var(--sr-'+(hot?'hazard':'rebel')+')">'+IC('signal')+
    '<span class="gx-lvl"><b>'+ROMAN[Math.max(0,Math.min(4,(s.level||1)-1))]+'</b></span>'+
    (attn?'<span class="sr-badge">!</span>':'')+'</span>';
}
function gxMiniStats(d,st){
  const sup=Math.floor(st.sup||0),lib=locLib(d,st);
  return '<div class="gx-sheet__stats">'+
    '<div class="gx-mini"><span class="gx-mini__l">Security</span>'+pipRow(d.sec||0,5,'var(--sr-heg)')+'</div>'+
    '<div class="gx-mini"><span class="gx-mini__l">Access</span>'+pipRow(st.acc||0,5,'var(--sr-shield)')+'</div>'+
    '<div class="gx-mini"><span class="gx-mini__l">Support</span>'+(d.pop&&d.pop!=='0'&&d.pop!=='—'?pipRow(sup,5,supCol(sup-1)):'<span class="sr-faint">—</span>')+'</div>'+
    '<div class="gx-mini"><span class="gx-mini__l">Freed</span>'+(lib===null?'<span class="sr-faint">—</span>':'<span class="gx-wheel" style="--p:'+lib+'" role="img" aria-label="'+lib+'% liberated"><b>'+lib+'</b></span>')+'</div></div>';
}
function gxLoreHTML(text){
  if(!text)return '';
  return '<p class="gx-bio'+(gxLoreOpen?'':' gx-bio--clamp')+'">'+text+'</p>'+
    (String(text).length>150?'<button class="gx-more" data-gxlore>'+(gxLoreOpen?'Less':'Read all')+'</button>':'');
}
function gxSourcePanel(s){
  const hot=s.risk>60;
  const jobs=G.missions.filter(m=>m.src===s.id&&(m.state==='avail'||m.state==='prog'));
  return '<div class="sr-window sr-window--sm gx-dossier" style="--accent:var(--sr-'+(hot?'hazard':'rebel')+')">'+
    '<div class="sr-window__head">'+srcAvatarHTML(s)+'<span class="sr-window__title">'+esc(s.name)+'</span>'+wTag('Level '+s.level,'progress')+wX('data-gxclose')+'</div>'+
    '<div class="sr-window__body">'+
    '<div class="gx-tags">'+wTag(s.type)+(hot?wTag('Running hot','bad'):'')+'</div>'+
    gxLoreHTML('“'+esc(s.bio)+'”')+
    '<div class="gx-meters">'+meterRow('Cultivation',s.cult)+meterRow('Risk',s.risk,'sr-meter--risk'+(hot?' is-hot':''))+'</div>'+
    (hot?'<p class="sr-fine">Risk '+Math.round(s.risk)+': they’re being watched.</p>':'')+
    '<div class="gx-income">'+bundleHTML(s.inc)+'<span class="sr-faint">per day</span></div>'+
    (jobs.length?'<div class="sr-h3">Missions from '+esc(s.name.split(' ')[0])+'</div><div class="gx-here">'+jobs.map(m=>
      '<button class="sr-unit" data-gxplan="'+m.id+'"><span class="sr-avatar" style="--c:var(--sr-gold)">'+IC(typeOf(m)==='space'?'ship':'soldier')+'</span>'+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+esc(m.name)+'</span><span class="sr-unit__role">'+esc(whereHTML(m)||'')+'</span></span>'+
      '<span class="sr-unit__side">'+(m.state==='prog'?wTag(m.progress.daysLeft+'d','info'):wTag('Available','friend'))+'</span></button>').join('')+'</div>':'')+
    '</div></div>';
}
function gxRevealList(items){
  return '<div class="sr-h3">Scouting reveals</div><ul class="gx-reveal">'+items.map(([ic,txt])=>'<li>'+IC(ic)+esc(txt)+'</li>').join('')+'</ul>';
}
function gxLockedPanel(d,st){
  return '<div class="sr-window sr-window--sm gx-dossier">'+
    '<div class="sr-window__head"><span class="sr-avatar gx-avatar-world"><img src="'+planetURL(d.id)+'" alt=""></span><span class="sr-window__title">'+esc(d.name)+'</span>'+wTag('No access')+wX('data-gxclose')+'</div>'+
    '<div class="sr-window__body">'+
    '<div class="gx-tags">'+wTag(d.kind)+(d.pop?wTag('Pop '+d.pop):'')+'</div>'+
    '<p class="gx-bio">Everyone’s heard of it. Nobody’s told us what matters. Scouts would.</p>'+
    '<div class="gx-stats"><div class="gx-stat"><span class="gx-stat__l">Security</span>'+pipRow(d.sec||0,5,'var(--sr-heg)')+'</div>'+
    '<div class="gx-stat"><span class="gx-stat__l">Access</span>'+pipRow(st.acc||0,5,'var(--sr-shield)')+'</div></div>'+
    gxRevealList([['eye','The lie of the land: Security and Support'],['intel','Leads and work for the network'],['people','People who might talk to us']])+
    '</div></div>';
}
function gxUnchartedPanel(d,st){
  return '<div class="sr-window sr-window--sm gx-dossier" style="--accent:var(--sr-psi)">'+
    '<div class="sr-window__head"><span class="sr-window__title">Uncharted signal</span>'+wX('data-gxclose')+'</div>'+
    '<div class="sr-window__body">'+
    '<div class="gx-tags">'+wTag('The Verge · origin unknown')+'</div>'+
    '<p class="gx-bio">A world out there we know nothing about. Yet.</p>'+
    gxRevealList([['galaxy','What the signal is coming from'],['eye','Who holds it, and how hard'],['intel','Whether there is work for us']])+
    '</div></div>';
}
function renderGxDock(){
  const el=$('gxDock');
  let h='';
  if(baseView==='galaxy'&&!gxWorld&&srcSel){
    if(srcSel.t==='s'){
      const s=G.sources.find(x=>x.id===srcSel.id&&x.alive);
      if(s)h=gxSourcePanel(s);else srcSel=null;
    } else if(srcSel.t==='p'){
      const d=pdef(srcSel.id),st=pst(srcSel.id);
      if(d&&st&&!st.access)h=st.known?gxLockedPanel(d,st):gxUnchartedPanel(d,st);
      else srcSel=null;
    } else if(srcSel.t==='o'){srcSel=null;}
  }
  if(baseView==='galaxy'&&gxWorld)h=gxWorldPanels();
  if(h&&gxPhone()){
    if(!gxSheetOpen)h=gxSheetHTML()||h;
    else h='<button class="sr-btn sr-btn--sm sr-btn--ghost" data-gxsheetclose style="align-self:flex-end">'+IC('clear')+'Close</button>'+h;
  }
  el.innerHTML=h;el.hidden=!h;
}
function gxCapMark(cap){
  return '<span class="gx-region__cap" style="left:'+Math.min(100,cap)+'%" data-tip="Current limit based on level of access and support." aria-label="Current limit based on level of access and support."></span>';
}
function gxRegionRow(d,st,r,cap){
  const pct=(st.lib&&st.lib[r.id])||0,state=regState(st,r.id);
  const tag=state==='liberated'?wTag('Liberated','friend'):state==='contested'?wTag('Contested','warn'):wTag('Hegemony','foe');
  return '<button class="gx-region is-'+state+'" data-gxregion="'+r.id+'">'+
    '<span class="gx-region__n">'+esc(r.name)+' <em>'+esc(r.kind)+'</em></span>'+tag+
    '<span class="gx-region__bar"><span class="gx-region__track"><span class="gx-region__fill" style="width:'+pct+'%"></span>'+gxCapMark(cap)+'</span><span class="gx-region__p">'+pct+'%</span></span></button>';
}
function gxRegionJobs(d,st,r){
  const out=[];
  for(const m of G.missions)if(m.state==='avail'&&m.loc===d.id&&missionRegion(d,m)===r.id)out.push(m);
  for(const o of (G.opps||[]))if(!o.done&&o.loc===d.id&&o.region===r.id&&!G.missions.some(m=>m.oppId===o.id))out.push(Object.assign({opp:1,name:(MTYPE_DEFS[o.tid]||{}).name||'Lead'},o));
  return out;
}
function gxRegionSrcs(d,r){
  return G.sources.filter(x=>x.alive&&SRCPOS[x.id]===d.id&&(SRC_REGION[x.id]||firstSettId(d))===r.id);
}
function gxJobHTML(m){
  if(m.opp){
    const T=MTYPE_DEFS[m.tid]||{};
    return '<div class="gx-job"><div class="gx-job__t">'+IC('intel')+esc(T.name||'Lead')+'</div>'+
      '<div class="gx-job__d">'+esc(oppText(T.hook||'A lead from our own intelligence.',m))+'</div>'+
      '<div class="gx-job__meta">'+bundleList(T.rew||{}).join(' ')+'</div></div>';
  }
  return '<div class="gx-job"><div class="gx-job__t">'+IC(typeOf(m)==='space'?'ship':'soldier')+esc(m.name)+'</div>'+
    '<div class="gx-job__d">'+esc(String(m.desc||'').replace(/<[^>]+>/g,''))+'</div>'+
    '<div class="gx-job__meta">'+bundleList(m.rew||{}).join(' ')+(m.lib?wTag('+'+m.lib+'% liberation','friend'):'')+'</div>'+
    '<div class="sr-fine">'+(m.need||3)+' rebels · '+(m.days||2)+' day'+((m.days||2)>1?'s':'')+' · '+esc(String(m.riskTxt||'moderate').toLowerCase())+' risk</div></div>';
}
function gxLocPanel(d,st,compact){
  const cap=locCap(st);
  const head='<div class="sr-window__head"><button class="sr-btn sr-btn--sm sr-btn--ghost gx-back" data-gxback aria-label="Back to the galaxy">'+IC('back')+'Galaxy</button>'+
    '<span class="sr-window__title">'+esc(d.name)+'</span>'+wQ('data-srchelp','How this works')+'</div>';
  let body;
  if(compact)body=gxMiniStats(d,st);
  else body='<div class="gx-tags">'+wTag(d.kind)+(d.pop?wTag('Pop '+d.pop):'')+'</div>'+
    gxLoreHTML(esc(d.brief||d.sit||''))+
    gxMiniStats(d,st)+
    (d.regions?'<div class="sr-h3">Regions</div><div class="gx-regions">'+d.regions.map(r=>gxRegionRow(d,st,r,cap)).join('')+'</div>':'');
  return '<div class="sr-window sr-window--sm gx-dossier'+(compact?' gx-dossier--compact':'')+'">'+head+'<div class="sr-window__body">'+body+'</div></div>';
}
function gxRegionCard(d,st,r){
  const pct=(st.lib&&st.lib[r.id])||0,cap=locCap(st),state=regState(st,r.id);
  const jobs=gxRegionJobs(d,st,r);
  const srcs=gxRegionSrcs(d,r);
  const moreMs=jobs.length>1?jobs.length-1:0;
  const heg=HEG_SITE[r.id];
  let h='<div class="sr-window sr-window--sm gx-regioncard">'+
    '<div class="sr-window__head"><span class="sr-window__title"><span class="gx-dossier__kicker">Region of '+esc(d.name)+'</span>'+esc(r.name)+'</span>'+wX('data-gxregclose')+'</div>'+
    '<div class="sr-window__body">'+
    '<div class="gx-tags">'+wTag(r.kind)+(state==='liberated'?wTag('Liberated','friend'):state==='contested'?wTag('Contested','warn'):wTag('Hegemony','foe'))+'</div>'+
    '<p class="gx-bio">'+esc(r.blurb||'')+'</p>'+
    '<div class="gx-libline" style="grid-template-columns:auto 1fr 40px"><span class="gx-wheel" style="--p:'+pct+'" role="img" aria-label="'+pct+'% liberated"><b>'+pct+'</b></span>'+
    '<span class="gx-region__track"><span class="gx-region__fill" style="width:'+pct+'%"></span>'+gxCapMark(cap)+'</span><span class="gx-region__p">'+pct+'%</span></div>'+
    '<div class="sr-h3">Local job</div>'+
    (jobs.length?gxJobHTML(jobs[0])+(moreMs?'<button class="gx-more" data-gxmissions>+'+moreMs+' more</button>':''):
      '<div class="sr-empty">No jobs here yet. Leads need Access 2 and a staffed Comms Array; sources offer the rest.</div>');
  if(srcs.length)h+='<div class="sr-h3">Sources</div><div class="gx-here">'+srcs.map(sc=>
    '<button class="sr-unit" data-gxcontact="'+sc.id+'">'+srcAvatarHTML(sc)+'<span class="sr-unit__main"><span class="sr-unit__name">'+esc(sc.name)+'</span><span class="sr-unit__role">'+esc(String(sc.type).split(' · ')[0])+'</span></span></button>').join('')+'</div>';
  if(heg&&state!=='liberated')h+='<div class="sr-h3">'+(jobs.length>1?'Missions and Hegemony':'Hegemony')+'</div>'+
    '<div class="gx-here"><div class="sr-unit" style="--c:var(--sr-heg)"><span class="sr-avatar" style="--c:var(--sr-heg)">'+IC('shield')+'</span>'+
    '<span class="sr-unit__main"><span class="sr-unit__name">'+esc(heg)+'</span><span class="sr-unit__role">Hegemony presence</span></span></div></div>';
  return h+'</div></div>';
}
function gxWorldPanels(){
  const d=pdef(gxWorld),st=pst(gxWorld);
  if(!d||!st)return '';
  const reg=gxRegion&&d.regions?d.regions.find(r=>r.id===gxRegion):null;
  return gxLocPanel(d,st,!!reg)+(reg?gxRegionCard(d,st,reg):'');
}
/* phones: a compact sheet above the command bar replaces the docked panel (provisional) */
const gxPhone=()=>ROOT.clientWidth<=700;
let gxSheetOpen=false;
function gxSheetHTML(){
  const more='<button class="sr-btn sr-btn--icon gx-sheet__more" data-gxmore aria-label="Open the full panel">'+IC('chevron')+'</button>';
  if(gxWorld){
    const d=pdef(gxWorld),st=pst(gxWorld);if(!d||!st)return '';
    const reg=gxRegion&&d.regions?d.regions.find(r=>r.id===gxRegion):null;
    return '<div class="gx-sheet"><div class="gx-sheet__top">'+
      '<button class="sr-btn sr-btn--sm sr-btn--ghost" data-gxback aria-label="Back to the galaxy">'+IC('back')+'</button>'+
      '<div><div class="gx-sheet__name">'+esc(reg?reg.name:d.name)+'</div><div class="gx-sheet__sub">'+esc(reg?'Region of '+d.name:d.kind)+'</div></div>'+more+'</div>'+
      gxMiniStats(d,st)+'</div>';
  }
  if(srcSel&&srcSel.t==='s'){
    const sc=G.sources.find(x=>x.id===srcSel.id&&x.alive);if(!sc)return '';
    return '<div class="gx-sheet"><div class="gx-sheet__top">'+srcAvatarHTML(sc)+
      '<div><div class="gx-sheet__name">'+esc(sc.name)+'</div><div class="gx-sheet__sub">'+esc(String(sc.type))+'</div></div>'+more+'</div></div>';
  }
  if(srcSel&&srcSel.t==='p'){
    const d=pdef(srcSel.id),st=pst(srcSel.id);if(!d||!st)return '';
    return '<div class="gx-sheet"><div class="gx-sheet__top"><span class="sr-avatar gx-avatar-world"><img src="'+planetURL(d.id)+'" alt=""></span>'+
      '<div><div class="gx-sheet__name">'+esc(st.known?d.name:'Uncharted signal')+'</div><div class="gx-sheet__sub">'+esc(st.known?d.kind:'The Verge · origin unknown')+'</div></div>'+more+'</div></div>';
  }
  return '';
}
function renderGxRail(){
  const alive=G.sources.filter(s=>s.alive);
  const srcRow=s=>{
    const hot=s.risk>60;
    return '<button class="sr-unit'+(srcSel&&srcSel.t==='s'&&srcSel.id===s.id?' is-selected':'')+(hot?' gx-hotrow':'')+'" data-gxsrc="'+s.id+'" style="--c:var(--sr-'+(hot?'hazard':'rebel')+')">'+
      srcAvatarHTML(s)+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+esc(s.name)+'</span><span class="sr-unit__role">'+esc(String(s.type).split(' · ')[0]+' · '+s.loc)+'</span></span>'+
      '<span class="sr-unit__side gx-income">'+bundleHTML(s.inc)+'</span></button>';
  };
  const worldRow=d=>{
    const st=pst(d.id);
    const lib=locLib(d,st);
    const side=d.regions?'<span class="gx-wheel gx-rail-wheel" style="--p:'+(lib||0)+'" role="img" aria-label="'+(lib||0)+'% liberated">'+IC('revflame')+'</span>':pipRow(st.acc||0,5,'var(--sr-shield)');
    return '<button class="sr-unit'+(gxWorld===d.id?' is-selected':'')+'" data-gxworld="'+d.id+'" style="--c:var(--sr-shield)">'+
      '<span class="sr-avatar gx-avatar-world"><img src="'+planetURL(d.id)+'" alt=""></span>'+
      '<span class="sr-unit__main"><span class="sr-unit__top"><span class="sr-unit__name">'+esc(d.name)+'</span>'+(d.base?wTag('Home','friend'):'')+'</span><span class="sr-unit__role">'+esc(d.kind)+(d.regions?' · '+d.regions.length+' regions':'')+'</span></span>'+
      '<span class="sr-unit__side">'+side+'</span></button>';
  };
  const accW=PLANETDEF.filter(d=>!d.base&&pst(d.id)&&pst(d.id).access);
  const uncharted=G.planets.filter(p=>!p.known).length;
  const noAccess=G.planets.filter(p=>p.known&&!p.access).length;
  const flights=[];
  for(const m of G.missions){
    if(m.state!=='prog'||!m.progress)continue;
    const f=G.fighters.find(x=>x.id===(m.progress.fighters||[])[0]);
    const left=m.progress.daysLeft||0;
    flights.push('<div class="sr-unit" style="--c:var(--sr-shield)">'+shipAvatar()+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+esc(f?f.name:'Flight')+'</span><span class="sr-unit__role">Mission · '+esc((pdef(m.loc)||{name:'the drift'}).name)+'</span></span>'+
      '<span class="sr-unit__side">'+wTag(left<=1?'Home tomorrow':left+' days','info')+'</span></div>');
  }
  $('railGx').innerHTML=
    '<section><div class="sr-section__head sr-section__head--friend">'+IC('signal')+'Network<span class="sr-section__count">'+alive.length+' of '+sourceCap()+'</span></div>'+
    '<div class="sr-stack">'+(alive.map(srcRow).join('')||'<div class="sr-empty">No sources. We’re blind out there.</div>')+'</div></section>'+
    '<section><div class="sr-section__head sr-section__head--info">'+IC('galaxy')+'Worlds<span class="sr-section__count">'+accW.length+' with access</span></div>'+
    '<div class="sr-stack">'+worldRow(pdef('haven'))+accW.map(worldRow).join('')+
    ((uncharted||noAccess)?'<div class="sr-empty">'+[uncharted?uncharted+' uncharted signal'+(uncharted>1?'s':''):null,noAccess?noAccess+' more world'+(noAccess>1?'s':'')+' known, no access':null].filter(Boolean).join(' · ')+'</div>':'')+
    '</div></section>'+
    '<section><div class="sr-section__head sr-section__head--info">'+IC('ship')+'In flight<span class="sr-section__count">'+flights.length+'</span></div>'+
    '<div class="sr-stack">'+(flights.join('')||'<div class="sr-empty">Every ship is on the pads.</div>')+'</div></section>'+
    '<div class="sr-railhint">Click any row to find it on the map</div>';
}
const GX_LAYERDEF=[['network','signal','Network','Sources and their signals'],['leads','intel','Leads','Gold diamonds from our own intelligence'],
  ['missions','missions','Missions','Jobs waiting on the board'],['lib','revolution','Liberation','How far each front has come'],
  ['heg','eye','Hegemony security','Their reach, in blue'],['flights','ship','Flights','Our ships out on missions']];
function renderGxTools(){
  let h='<div class="gx-tools">';
  if(gxWorld){
    h+='<button class="gx-minimap" data-gxminimap aria-label="Back to the galaxy"><canvas id="gxMiniCv" width="200" height="130"></canvas><span class="gx-minimap__lbl">'+IC('back')+'Galaxy</span></button>';
  } else if(gxLegend){
    h+='<div class="gx-legend"><div class="gx-legend__h">Layers<button class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost" data-gxlegend aria-label="Collapse the key">'+IC('clear')+'</button></div>'+
      GX_LAYERDEF.map(([k,ic,lbl,sub])=>'<button class="gx-legend__row" data-gxlayer="'+k+'" aria-pressed="'+!!gxLayers[k]+'">'+IC(ic)+'<span><b>'+lbl+'</b><span>'+sub+'</span></span><span class="gx-switch'+(gxLayers[k]?' is-on':'')+'"></span></button>').join('')+'</div>';
  } else {
    h+='<div class="gx-layers"><button class="gx-layers__h sr-btn sr-btn--sm sr-btn--ghost" data-gxlegend>Layers</button>'+
      GX_LAYERDEF.map(([k,ic,lbl])=>'<button class="sr-btn sr-btn--icon" data-gxlayer="'+k+'" aria-pressed="'+!!gxLayers[k]+'" aria-label="'+lbl+'" title="'+lbl+'">'+IC(ic)+'</button>').join('')+'</div>'+
      '<div class="gx-zoom"><button class="sr-btn sr-btn--icon" data-gxzoom="in" aria-label="Zoom in">'+IC('zoomin')+'</button>'+
      '<button class="sr-btn sr-btn--icon" data-gxzoom="out" aria-label="Zoom out">'+IC('zoomout')+'</button>'+
      '<button class="sr-btn sr-btn--icon" data-gxzoom="fit" aria-label="Fit the map">'+IC('fit')+'</button></div>';
  }
  $('gxTools').innerHTML=h+'</div>';
}
/* order cards in the command bar; one cost line is allowed under the label */
function gxOrder(o){
  return '<button type="button" class="sr-order'+(o.family?' sr-order--'+o.family:'')+(o.danger?' gx-order--danger':'')+(o.attn?' gx-order--attn':'')+'" data-gxo="'+o.act+'"'+
    (o.disabled?' disabled aria-disabled="true"':'')+HUD.tip(o.label,o.rule||'',o.disabled?o.why||'':'',o.key)+' aria-label="'+esc(o.label)+(o.disabled&&o.why?'. '+esc(o.why):'')+'">'+
    (o.key?'<span class="sr-kbd sr-order__key">'+o.key+'</span>':'')+IC(o.icon)+'<span class="gx-order-label">'+o.label+'</span>'+(o.cost||'')+
    (o.badge?'<span class="sr-badge">!</span>':'')+'</button>';
}
function gxOrdersFor(){
  const orders=[];
  if(gxWorld)return gxWorldOrders();
  if(!srcSel)return orders;
  if(srcSel.t==='s'){
    const s=G.sources.find(x=>x.id===srcSel.id&&x.alive);
    if(!s)return orders;
    const sig=!!(s.pendingEvent||s.signal);
    orders.push(gxOrder({act:'contact',key:'1',icon:'signal',family:'util',label:s.pendingEvent?'Contact — answer them':s.signal?'Contact — signal waiting':'Contact',attn:sig,badge:sig,
      disabled:s.contacted&&!sig,why:'Already contacted today. Try again tomorrow.',rule:'Raise them on an encrypted burst.'}));
    orders.push(gxOrder({act:'visit',key:'2',icon:'people',label:'Visit',disabled:s.visited,why:'Already visited.',rule:'Meet them in person: more trust, more risk.'}));
    orders.push('<span class="sr-orders__sep"></span>');
    if(s.risk>=50)orders.push(gxOrder({act:'silence',key:'3',icon:'skull',danger:1,label:'Silence',rule:'Send the assassin. Permanent.'}));
    orders.push(gxOrder({act:'cutloose',key:s.risk>=50?'4':'3',icon:'clear',danger:1,label:cutArm===srcSel.id?'Confirm: cut loose':'Cut loose',rule:'Burn the codes and walk away. Permanent.'}));
  } else if(srcSel.t==='p'){
    const d=pdef(srcSel.id),st=pst(srcSel.id);
    if(d&&st&&!st.access){
      const can=G.intel>=d.scout;
      orders.push(gxOrder({act:'scout',key:'1',icon:'eye',family:'util',label:st.known?'Scout & gain access':'Scout the signal',cost:I(d.scout,!can),
        disabled:!can,why:'Need '+Math.ceil(d.scout-G.intel)+' more Intel. Work the network, or wait a day.',rule:'Put pathfinders on the ground and open the way in.'}));
    }
  }
  return orders;
}
function gxWorldOrders(){
  const d=pdef(gxWorld),st=pst(gxWorld);
  if(!d||!st)return [];
  const orders=[];let n=0;const nk=()=>String(++n);
  const reg=gxRegion&&d.regions?d.regions.find(r=>r.id===gxRegion):null;
  if(reg){
    const jobs=gxRegionJobs(d,st,reg);
    if(jobs.length){
      const j=jobs[0];
      orders.push(gxOrder({act:j.opp?'opp:'+j.id:'plan:'+j.id,key:nk(),icon:j.opp?'intel':'missions',family:'util',label:'Run the job',rule:j.name}));
    }
    const srcs=gxRegionSrcs(d,reg);
    if(srcs.length){
      const sc=srcs[0],sig=!!(sc.pendingEvent||sc.signal);
      orders.push(gxOrder({act:'contact:'+sc.id,key:nk(),icon:'signal',label:'Contact '+sc.name.split(' ')[0],attn:sig,badge:sig,
        disabled:sc.contacted&&!sig,why:'Already contacted today.'}));
    }
    if(jobs.length>1){
      const j=jobs[1];
      orders.push(gxOrder({act:j.opp?'opp:'+j.id:'plan:'+j.id,key:nk(),icon:'missions',label:j.name,rule:j.name}));
    }
    orders.push('<span class="sr-orders__sep"></span>');
    orders.push(gxOrder({act:'back',key:'',icon:'back',label:'Back to '+d.name,rule:'Esc also steps back.'}));
  } else {
    if((st.acc||0)<5){
      const cost=accessCost(d,st),can=G.intel>=cost;
      orders.push(gxOrder({act:'raise',key:nk(),icon:'intel',family:'util',label:'Raise access',cost:I(cost,!can),
        disabled:!can,why:'Need '+Math.ceil(cost-G.intel)+' more Intel. Work the network, or wait a day.',rule:'Deepen the network’s reach here.'}));
    }
    const sigs=G.sources.filter(x=>x.alive&&SRCPOS[x.id]===d.id&&(x.signal||x.pendingEvent));
    if(sigs.length)orders.push(gxOrder({act:'contact:'+sigs[0].id,key:nk(),icon:'signal',label:'Contact '+sigs[0].name.split(' ')[0],attn:1,badge:1,rule:'A signal is waiting.'}));
    const ms=G.missions.filter(m=>m.state==='avail'&&m.loc===d.id&&!missionRegion(d,m));
    if(ms.length){
      orders.push('<span class="sr-orders__sep"></span>');
      ms.slice(0,3).forEach(m=>orders.push(gxOrder({act:'plan:'+m.id,key:nk(),icon:typeOf(m)==='space'?'ship':'missions',label:m.name,rule:m.riskTxt?String(m.riskTxt)+' risk':''})));
    }
  }
  return orders;
}
function renderGxBar(){
  const host=$('gxOrders');
  const orders=baseView==='galaxy'?gxOrdersFor():[];
  host.innerHTML=orders.join('');
  host.hidden=!orders.length;
}
function syncGxDOM(){
  const gal=baseView==='galaxy';
  ROOT.classList.toggle('gx-view',gal);
  $('railBase').hidden=gal;$('railGx').hidden=!gal;
  $('gxTools').hidden=!gal;
  const tabs=ROOT.querySelector('.sr-tabs');
  if(tabs)tabs.style.display=(gal&&gxWorld)?'none':'';
  const ttl=ROOT.querySelector('.sr-topbar__title'),sub=ROOT.querySelector('.sr-topbar__sub');
  if(gal){
    if(gxWorld){
      const d=pdef(gxWorld);
      const reg=gxRegion&&d&&d.regions?d.regions.find(r=>r.id===gxRegion):null;
      ttl.textContent=d?d.name:'World';
      sub.textContent=reg?reg.name+' · '+d.name:'World view · Galaxy';
    } else {
      const accessN=G.planets.filter(p=>p.access&&p.id!=='haven').length;
      ttl.textContent='Galaxy';sub.textContent=accessN+' worlds with access';
    }
    $('drawerBtn').setAttribute('aria-label','Network and worlds');
  } else {
    ttl.textContent='Haven Rock';sub.textContent='Hidden base';
    $('drawerBtn').setAttribute('aria-label','Crew and flight');
  }
  if(gal){renderGxRail();renderGxTools();}
  renderGxDock();renderGxBar();renderGxChips();
}
function renderGxChips(){
  const el=$('gxChips');
  if(!(baseView==='galaxy'&&gxWorld)){el.hidden=true;el.innerHTML='';return;}
  const d=pdef(gxWorld),st=pst(gxWorld);
  if(!d||!d.regions||!st){el.hidden=true;el.innerHTML='';return;}
  el.innerHTML=d.regions.map(r=>{
    const pct=(st.lib&&st.lib[r.id])||0,state=regState(st,r.id);
    return '<button class="gx-rchip is-'+state+'" data-gxchip="'+r.id+'" aria-pressed="'+(gxRegion===r.id)+'">'+
      '<span class="gx-rchip__dot"></span>'+(r.kind==='Settlement'?IC('base'):'')+esc(r.name)+
      '<span class="gx-wheel gx-rail-wheel" style="--p:'+pct+'" role="img" aria-label="'+pct+'% liberated">'+IC('revflame')+'</span></button>';
  }).join('');
  el.hidden=false;
}
function gxOrderAct(act){
  if(!act)return;
  const s=srcSel&&srcSel.t==='s'?G.sources.find(x=>x.id===srcSel.id&&x.alive):null;
  if(act==='contact'&&s){sComm();srcContact(s);return;}
  if(act==='visit'&&s){if(!s.visited){sComm();srcVisit(s);}return;}
  if(act==='silence'&&s){openWin('silence',s);return;}
  if(act==='cutloose'&&s){
    if(cutArm!==s.id){cutArm=s.id;renderGxBar();setTimeout(()=>{if(cutArm===s.id){cutArm=null;if(baseView==='galaxy')renderGxBar();}},4000);return;}
    cutArm=null;srcCutLoose(s);return;
  }
  if(act==='scout'&&srcSel&&srcSel.t==='p'){scoutPlanet(srcSel.id);return;}
  gxWorldAct(act);
}
function gxWorldAct(act){
  if(act==='back'){gxBack();return;}
  if(act==='raise'){raiseAccess(gxWorld);return;}
  if(act.indexOf('contact:')===0){const sc=G.sources.find(x=>x.id===act.slice(8)&&x.alive);if(sc){sComm();srcContact(sc);}return;}
  if(act.indexOf('plan:')===0){const m=G.missions.find(x=>x.id===act.slice(5));if(m&&m.state==='avail')openPlan(m);return;}
  if(act.indexOf('opp:')===0){openOpp(act.slice(4));return;}
}
function gxWorldHover(px,py){
  if(!gxWorld)return false;
  return gxRegScreen.some(rs=>ptInPoly(px,py,rs.pts));
}
function gxWorldClick(px,py){
  if(gxWorldDiveK<1)return;
  for(const rs of gxRegScreen){        // settlements first: they sit on top
    if(ptInPoly(px,py,rs.pts)){openRegion(rs.id);return;}
  }
}
$('gxTools').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;sClick();
  if(b.hasAttribute('data-gxminimap')){gxBack();return;}
  if(b.hasAttribute('data-gxlegend')){gxLegend=!gxLegend;renderGxTools();return;}
  const lay=b.getAttribute('data-gxlayer');
  if(lay){gxLayers[lay]=gxLayers[lay]?0:1;saveGxLayers();renderGxTools();return;}
  const z=b.getAttribute('data-gxzoom');
  if(z){gxZoom=z==='in'?Math.min(2.5,gxZoom*1.3):z==='out'?Math.max(0.5,gxZoom/1.3):1;return;}
});
$('gxDock').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;sClick();
  if(b.hasAttribute('data-gxclose')){srcSel=null;syncUI();return;}
  if(b.hasAttribute('data-gxregclose')){gxRegion=null;syncUI();return;}
  if(b.hasAttribute('data-gxback')){gxRegion=null;gxWorld=null;syncTabs();syncUI();return;}
  if(b.hasAttribute('data-gxlore')){gxLoreOpen=!gxLoreOpen;renderGxDock();return;}
  if(b.hasAttribute('data-gxmore')){gxSheetOpen=true;renderGxDock();return;}
  if(b.hasAttribute('data-gxsheetclose')){gxSheetOpen=false;renderGxDock();return;}
  if(b.hasAttribute('data-gxmissions')){openWin('missions');return;}
  if(b.hasAttribute('data-srchelp')){openWin('srcTut',{page:0});return;}
  const ct=b.getAttribute('data-gxcontact');
  if(ct){const sc=G.sources.find(x=>x.id===ct&&x.alive);if(sc){sComm();srcContact(sc);}return;}
  const plan=b.getAttribute('data-gxplan');
  if(plan){const m=G.missions.find(x=>x.id===plan);if(m&&m.state==='avail')openPlan(m);return;}
  const reg=b.getAttribute('data-gxregion');
  if(reg){openRegion(reg);return;}
});
$('gxChips').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-gxchip]');
  if(!b)return;sClick();openRegion(b.getAttribute('data-gxchip'));
});
$('gxOrders').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b||b.disabled)return;sClick();
  gxOrderAct(b.getAttribute('data-gxo'));
});
$('railGx').addEventListener('click',ev=>{
  const sb=ev.target.closest('[data-gxsrc]');
  if(sb){
    sClick();
    const id=sb.getAttribute('data-gxsrc');
    const key='gxs:'+id,now2=performance.now();
    if(lastTap.key===key&&now2-lastTap.t<380){
      lastTap={key:null,t:0};
      const s=G.sources.find(x=>x.id===id&&x.alive);
      if(s){sComm();srcContact(s);}
      return;
    }
    lastTap={key,t:now2};
    gxWorld=null;gxRegion=null;srcSel={t:'s',id};cutArm=null;syncTabs();syncUI();
    return;
  }
  const wb=ev.target.closest('[data-gxworld]');
  if(wb){sClick();enterWorld(wb.getAttribute('data-gxworld'));return;}
});

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
  if(G&&baseView==='galaxy'){
    if(gxWorld)drawWorld(now);else drawGalaxy(now);   // no base vignette in the galaxy views
    if(winMode==='comm'||winMode==='cassIntro')drawCommStatic(now);
    updateGuide();
    return;
  }
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
      if(rm.key==='command')body+='<p class="bs-info">'+(G.recruit.days?'Recruiting: '+G.recruit.days+'d left.':G.recWait.length?G.recWait.length+' candidate'+(G.recWait.length>1?'s':'')+' waiting.':'Step inside to put out a call for recruits.')+'</p>';
      if(rm.key==='hangar')body+='<p class="bs-info">Berths '+G.fighters.length+'/'+fighterCap()+(G.wreck&&!G.wreck.restored?' · one derelict hauler'+(G.wreck.restoring?' (restoring, '+G.wreck.restoring+'d)':''):'')+'.</p>';
      if(rm.key==='training')foot+=rbtn('data-open="spec"','Specialty Training');
      if(rm.key==='barracks')body+='<p class="bs-info">Bunks '+bunksUsed()+'/'+bunkCap()+'.</p>';
      if(rm.key==='diplo')foot+=rbtn('data-open="diplo"','Diplomatic Tasks');
      if(rm.key==='store'){
        foot+=rbtn('data-open="gear"','Arsenal');
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
function flashMsg(html,kind){HUD.toast($('flashB'),{html,kind:kind||'friend'});}
/* day banner: the kit's slam, once per day */
function showDayBanner(){
  if(!$('estSplash').hidden)return;   // nothing over the BASE ESTABLISHED splash
  HUD.banner(ROOT.querySelector('.sr-stage'),{text:'Day '+G.day,color:'var(--sr-gold)'});
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
  if(!started||!G||SR.active!=='base'||!$('estSplash').hidden||HUD.topWin(ROOT)){el.hidden=true;return;}   // nothing points over a kit dialog
  // step 1: the sources tutorial — walk the player to Cass
  if(G.onboard==='contact'){
    if(baseView==='galaxy'&&!winMode&&!gxWorld){
      const cass=G.sources.find(x=>x.id==='cass'&&x.alive);
      if(cass){
        if(!(srcSel&&srcSel.t==='s'&&srcSel.id==='cass')){
          const pos=gxSrcPos.cass;
          if(pos){
            const r=cv.getBoundingClientRect();
            pointAt({left:r.left+pos[0]-10,top:r.top+pos[1]-10,width:20,height:20},'Select Cass Wender');
            return;
          }
        } else {
          const btn=ROOT.querySelector('#gxOrders [data-gxo="contact"]');
          if(btn){pointAt(btn.getBoundingClientRect(),'Contact');return;}
        }
      }
      el.hidden=true;return;
    }
    if(!winMode&&!viewRoom&&baseView!=='galaxy'&&!arOpen&&!bmOpen){pointAt($('navSources').getBoundingClientRect(),'Open the Galaxy');return;}
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
  // the old sources window became the Galaxy view: every opener lands there
  if(mode==='sources'){winMode=null;winArg=null;cutArm=null;rankOverlay=null;gearOverlay=null;$('winsB').hidden=true;showView('galaxy');return;}
  winMode=mode;winArg=arg||null;cutArm=null;rankOverlay=null;gearOverlay=null;renderWin();$('winsB').hidden=false;syncTabs();
  if(mode==='arrive')setTimeout(()=>{if(winMode==='arrive')closeWin();},RM?400:2800);
}
function closeWin(){
  winMode=null;winArg=null;cutArm=null;rankOverlay=null;gearOverlay=null;$('winsB').hidden=true;syncTabs();markShort();
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
const wX=HUD.closeBtn;
const wQ=(attr,title)=>'<button class="sr-btn sr-btn--icon sr-btn--sm" style="--c:var(--sr-go);--ct:var(--sr-ink)" '+attr+' aria-label="'+title+'" title="'+title+'">'+IC('help')+'</button>';
const wHead=(title,o)=>{o=o||{};return HUD.winHead(title,{tags:o.tags,extra:o.q,close:o.x});};
const wBody=h=>HUD.winBody(h);
const wFoot=(btns,note)=>HUD.winFoot(btns,note);
const wTag=HUD.tag;
const tutP=t=>'<p class="sr-p">'+t+'</p>';
const tutS=(hd,b)=>'<div class="sr-h3">'+hd+'</div><p class="sr-p">'+b+'</p>';
const choice=(n,attrs,html,dis)=>'<button class="sr-choice" '+attrs+(dis?' disabled':'')+'><span class="sr-kbd sr-choice__key">'+n+'</span><span>'+html+'</span></button>';
const sentence=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1).toLowerCase():s;
const ini=HUD.initials;
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
const gearIconId=id=>(Items.get(id)||{}).icon||'loot';   // the items table picks the icon
const gearIcon=a=>gearIconId(a.id);
let cutArm=null;
let shipSheetShip=null;
const accentOf={newhero:'progress',comm:'friend',ship:'friend',cassIntro:'friend',candidate:'friend',recruit:'friend',chain:'friend',person:'friend',escalate:'foe',reward:'progress',arrive:'good',contract:'progress'};
const sizeOf={newhero:'sm',plan:'lg',srcTutIntro:'sm',srcTut:'sm',comm:'sm',newmission:'sm',opp:'sm',arrive:'sm',reward:'sm',spec:'sm',chain:'sm',locBrief:'sm',escalate:'sm',cassIntro:'sm',ship:'sm',recruit:'sm',candidate:'sm',person:'sm',silence:'sm',contract:'sm'};

function meterRow(label,val,cls){
  return '<div class="sr-meter'+(cls?' '+cls:'')+'"><span>'+label+'</span><span class="sr-meter__track"><span class="sr-meter__fill" style="display:block;width:'+Math.min(100,val)+'%"></span></span><span class="sr-meter__val">'+Math.round(val)+'</span></div>';
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
  const mb=!p.auto&&p.morale!==undefined?Rebel.mband(p):null;
  const tags=(p.role==='Hero'?wTag('Hero','action','star'):'')+(p.auto&&!noRank?wTag(rankFor(p),'action'):'')+(p.auto?'':wTag(specOf(p)||'Rookie',p.spec?'friend':''))+
    (!p.auto&&p.merc?wTag('Mercenary · '+Math.max(0,p.merc.until-G.day)+'d left','progress'):'')+
    (mb&&mb.k!=='mid'?wTag(mb.n+' morale',mb.tone):'')+(extra||'');
  return '<div class="bs-dz">'+(p.auto?'':'<span class="sr-avatar bs-dz__av">'+faceHTML(p)+'</span>')+'<span class="sr-level" style="--p:'+Math.round(p.xp*100)+'" aria-label="Level '+p.level+'"><b>'+p.level+'</b></span>'+
    '<div><div class="bs-dz__name">'+p.name+'</div><div class="bs-dz__tags">'+tags+'</div><div class="sr-faint bs-dz__role">'+(p.role==='Hero'?'Hero · was '+p.heroOf:p.role)+(p.joined&&!p.auto?' · with us since day '+p.joined:'')+'</div></div></div>'+
    '<p class="sr-p bs-bio">“'+p.bio+'”</p>'+meterBlock(p,noRank?'':rankRow(p))+heroCard(p)+traitCard(p)+expCards(p,noRank)+medicalSection(p)+skillsCard(p);
}
/* what being a Hero means, on the file */
function heroCard(p){
  if(p.role!=='Hero')return '';
  return '<div class="sr-h3">Hero</div><div class="sr-card sr-card--action"><div class="sr-card__top"><span class="sr-card__title">Hero of the Rebellion</span></div>'+
    '<div class="sr-card__body">+'+Rebel.HERO_SKILL+' to every skill and +'+Rebel.HERO_HP+' health. Fights on the ground, in boarding actions and in the cockpit.<br>'+
    '<b>Rally cry</b> (ground): the whole squad steadies and takes +2 to hit for a round.<br><b>Heroic surge</b> (space): shields full, half the hull back, +4 to hit for a round.<br><span class="sr-faint">Each once per mission.</span></div></div>';
}
/* earned traits: what has happened to them, up to three at a time */
function expCards(p,quiet){
  if(p.auto||p.charTrait===undefined)return '';
  const l=p.traits||[];
  if(!l.length)return quiet?'':'<div class="sr-h3">Experiences</div><p class="sr-p sr-faint">Nothing yet. What happens on missions, good and bad, leaves its mark.</p>';
  return '<div class="sr-h3">Experiences <span class="sr-faint">'+l.length+'/'+Rebel.EXP_MAX+'</span></div><div class="sr-stack">'+l.map(t=>{
    const d=Rebel.RTK[t.k];
    return '<div class="sr-card sr-card--progress"><div class="sr-card__top"><span class="sr-card__title">'+esc(Rebel.expTitle(t,nameOfRebel))+'</span>'+(d.temp?wTag('Temporary','info'):'')+'</div>'+
      '<div class="sr-card__body">'+esc(Rebel.expText(t,p,nameOfRebel))+'<br><span class="sr-faint">'+esc(d.e.replace(/\[B\]/g,t.with?nameOfRebel(t.with):'them'))+'</span></div></div>';
  }).join('')+'</div>';
}
/* a labelled bar: label, fill 0..1, value, tooltip */
const meter=(label,frac,val,color,tip)=>'<div class="sr-meter" style="--c:'+color+'"'+(tip?' title="'+esc(tip)+'"':'')+'><span>'+label+'</span><span class="sr-meter__track"><span class="sr-meter__fill" style="display:block;width:'+Math.round(Math.max(0,Math.min(1,frac))*100)+'%"></span></span><span class="sr-meter__val">'+val+'</span></div>';
/* morale and experience: the two numbers a rebel's mood and growth come down to */
function meterBlock(p,rank){
  if(p.auto||p.morale===undefined)return '';
  const b=Rebel.mband(p);
  const col=b.tone==='bad'?'var(--sr-c-bad)':b.tone==='good'?'var(--sr-go)':'var(--sr-gold)';
  const maxed=p.level>=Rebel.LEVEL_CAP;
  return '<div class="bs-meters">'+(rank||'')+
    meter('Morale',p.morale/100,Math.round(p.morale),col,'Morale ('+b.n+') rises with wins and rest, falls with injuries and losses. At 0 they leave.')+
    meter('Experience',maxed?1:p.xp,maxed?'MAX':Math.round(p.xp*100),'var(--sr-c-progress)',maxed?'Level '+Rebel.LEVEL_CAP+', the top of the ladder.':'Experience toward level '+(p.level+1)+': '+Math.round(p.xp*100)+' of 100.')+
    '</div>';
}
/* kills, injuries and missions: what this rebel has been through */
function recordCard(p){
  if(p.auto)return '';
  const row=(a,b)=>'<div class="sr-loot"><span>'+a+'</span><b>'+b+'</b></div>';
  return '<div class="sr-h3">Service record</div><div class="sr-stack">'+
    row('Missions served',p.missions||0)+row('Confirmed kills',p.kills||0)+row('Times injured',p.injuries||0)+'</div>';
}
/* ---------- rank insignia ----------
   Enlisted ranks are stacked chevrons with rockers beneath and a device at the top for the senior grades;
   officers get bars, leaves, an eagle and stars. Drawn inline so they take the rank's colour. */
function insignia(p,size){
  const S=size||24,i=Math.max(0,Math.min(8,p.rank||0)),role=p.rankRole||p.role;
  const GOLD='#ffd45a',SILVER='#cfd8e8';
  const star=(cx,cy,r)=>{let pts='';for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?r*0.42:r;pts+=(cx+Math.cos(a)*rr).toFixed(2)+','+(cy+Math.sin(a)*rr).toFixed(2)+' ';}return '<polygon points="'+pts+'" fill="currentColor"/>';};
  let g='',col=GOLD;
  if(p.off){
    if(i===0){g='<rect x="9" y="4" width="6" height="16" rx="1.2" fill="currentColor"/>';}
    else if(i===1){col=SILVER;g='<rect x="9" y="4" width="6" height="16" rx="1.2" fill="currentColor"/>';}
    else if(i===2){col=SILVER;g='<rect x="5" y="4" width="5.5" height="16" rx="1.2" fill="currentColor"/><rect x="13.5" y="4" width="5.5" height="16" rx="1.2" fill="currentColor"/>';}
    else if(i===3||i===4){col=i===3?GOLD:SILVER;g='<path d="M12 2.5C18 6 20 12 12 21.5 4 12 6 6 12 2.5Z" fill="currentColor"/><path d="M12 7v13" stroke="#0b1020" stroke-width="1.3" stroke-linecap="round"/>';}
    else if(i===5){col=SILVER;g='<path d="M12 4l1.7 3.3 8-1.6-3.6 5.4-3.2.5 1.1 4.6L12 13.4 8 16.2l1.1-4.6-3.2-.5L2.3 5.7l8 1.6z" fill="currentColor"/><circle cx="12" cy="5" r="1.6" fill="currentColor"/><path d="M10 19.5h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';}
    else{col=SILVER;const n=i-5;g=n===1?star(12,12,8):n===2?star(7,12,6)+star(17,12,6):star(12,6.5,5.6)+star(6,16.5,5.6)+star(18,16.5,5.6);}
  } else {
    col=role==='Pilot'?'#7fd0ff':role==='Marine'?'#ff9a8a':GOLD;
    const tbl=[[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[3,2],[3,2],[3,2]],[c,r]=tbl[i];
    const top=i>=6?7:3,sp=i>=6?2.6:3;
    for(let k=0;k<c;k++){const a=top+k*sp;g+='<path d="M3.5 '+(a+4.2)+'L12 '+a+'l8.5 '+4.2+'" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>';}
    const rb=top+(c-1)*sp+4.2+(i>=6?2.8:3.2);
    for(let k=0;k<r;k++){const y=rb+k*2.4;g+='<path d="M3.5 '+y+'Q12 '+(y+3.2)+' 20.5 '+y+'" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>';}
    if(i===6)g+='<path d="M12 .8l2.8 2.8-2.8 2.8-2.8-2.8z" fill="currentColor"/>';
    else if(i===7)g+=star(12,3.6,3.3);
    else if(i===8)g+=star(12,3.6,3.3)+'<path d="M6 5.2C7 1.8 9 1.4 9.3 1.4M18 5.2C17 1.8 15 1.4 14.7 1.4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>';
  }
  return '<svg class="bs-insig" viewBox="0 0 24 24" width="'+S+'" height="'+S+'" aria-hidden="true" style="color:'+col+'">'+g+'</svg>';
}
/* the rank line that sits with the bars: insignia, name, and a flag when they can move up; opens the details */
function rankRow(p){
  if(p.auto||p.rank===undefined)return '';
  const ready=Rebel.canPromote(p),com=!ready&&Rebel.canCommission(p);
  const nx=Rebel.nextRank(p),need=Rebel.needMissions(p),have=Math.min(need,p.rankMissions||0);
  const hint=ready?'Ready for promotion to '+nx:com?'Can be commissioned as an officer':nx?have+' of '+need+' missions toward '+nx:'Top of the ladder';
  return '<button class="bs-rank'+(ready||com?' is-ready':'')+'" data-rank-open="'+p.id+'" title="'+esc(hint+'. Tap for details.')+'" aria-label="Rank: '+esc(rankFor(p))+'. '+esc(hint)+'. Open rank details">'+
    '<span class="bs-rank__ico">'+insignia(p,26)+'</span><span class="bs-rank__name">'+esc(rankFor(p))+'</span>'+
    (ready?'<span class="bs-rank__flag">\u25b2 Promotion ready</span>':com?'<span class="bs-rank__flag">\u2605 Can be commissioned</span>':nx?'<span class="bs-rank__prog">'+have+'/'+need+'</span>':'')+
    '<span class="bs-rank__go">'+IC('chevron')+'</span></button>';
}
/* rank details: progress toward the next one, and the buttons that hand it out (shown in the overlay) */
function rankCard(p){
  if(p.auto)return '';
  const nx=Rebel.nextRank(p),need=Rebel.needMissions(p),have=Math.min(need,p.rankMissions||0);
  let body=nx?('Missions toward <b>'+nx+'</b>: '+have+' / '+need):'Top of the ladder.';
  const acts=[];
  if(Rebel.canPromote(p))acts.push(rbtn('data-promote="'+p.id+'"','Promote to '+nx,false,'sr-btn--sm sr-btn--primary'));
  if(Rebel.canCommission(p))acts.push(rbtn('data-commission="'+p.id+'" title="One-way: they restart on the officer ladder as '+Rebel.OFFICER[0]+'"','Commission as officer',false,'sr-btn--sm'));
  else if(!p.off&&(p.rank||0)>=4&&p.level<5)body+='<br><span class="sr-faint">Officer commission needs level 5.</span>';
  else if(!p.off&&p.level>=5)body+='<br><span class="sr-faint">Officer commission needs the rank of Sergeant or better.</span>';
  return '<div class="sr-card sr-card--action"><div class="sr-card__top"><span class="bs-rank__ico">'+insignia(p,30)+'</span><span class="sr-card__title">'+esc(rankFor(p))+'</span>'+(p.off?wTag('Officer','friend'):'')+'<span class="bs-from">'+(p.missions||0)+' mission'+((p.missions||0)===1?'':'s')+' served</span></div>'+
    '<div class="sr-card__body">'+body+'</div>'+(acts.length?'<div class="sr-card__acts" style="margin-top:8px">'+acts.join('')+'</div>':'')+'</div>';
}
/* the rank details float over the personnel file; dismiss them and the file is still there */
let rankOverlay=null,gearOverlay=null;
function rankOverlayHTML(p){
  return '<div class="bs-overlay"><button class="bs-overlay__scrim" data-rank-close aria-label="Close rank details"></button>'+
    '<div class="bs-overlay__panel" role="dialog" aria-label="Rank details"><div class="sr-window__head"><span class="sr-window__title">'+esc(p.name)+' \u00b7 Rank</span>'+wX('data-rank-close')+'</div>'+
    '<div class="sr-window__body">'+rankCard(p)+'</div></div></div>';
}
/* the gear a rebel carries, one tappable row per slot; the picker opens as an overlay */
function gearSection(p){
  const slots=gearSlots(p);
  if(!slots.length)return '';
  const away=p.assign==='mission';
  const rows=slots.map(s=>{
    const id=slotGet(p,s),own=isOwnSlot(p,s);
    return '<button class="bs-gearslot" data-gear-slot="'+p.id+':'+s.k+':'+(s.i||0)+'"'+
      (own?' disabled title="Their own kit — not ours to reassign"':away?' disabled title="Away on a mission"':'')+'>'+
      '<span class="bs-gearslot__k">'+SLOT_LABEL[s.k]+'</span><span class="bs-gearslot__v">'+(id?IC(gearIconId(id))+'<span>'+esc(kitNameId(id))+(own?' <span class="sr-faint">· their own</span>':'')+'</span>':'<span class="sr-faint">Empty</span>')+'</span>'+
      '<span class="bs-rank__go">'+IC('chevron')+'</span></button>';
  }).join('');
  return '<div class="sr-h3">Gear</div><div class="bs-gearslots">'+rows+'</div>';
}
function gearOverlayHTML(p,ov){
  ov=ov||gearOverlay;
  const s=gearSlots(p).find(x=>x.k===ov.k&&(x.i||0)===ov.i);
  if(!s)return '';
  const cur=slotGet(p,s);
  const opts=G.armory.filter(a=>a.n>0&&gearFits(a.id,s)).sort((a,b)=>(KIT[b.id].q||0)-(KIT[a.id].q||0));
  const pick=(id,body,dis)=>'<button class="bs-gearpick'+(id===cur?' is-on':'')+'" data-gear-pick="'+p.id+':'+s.k+':'+(s.i||0)+':'+id+'"'+(dis?' disabled':'')+'>'+body+'</button>';
  const list=(cur?pick('','<span class="bs-gearpick__n">Leave empty</span><span class="sr-faint">Back to the armory</span>'):'')+
    opts.map(a=>{
      const free=freeOf(a.id),hold=holders(a.id,[p]),mine=cur===a.id;
      const state=mine?'<span class="bs-good">Carrying</span>':free>0?'<span class="bs-good">'+free+' free</span>':hold.length?'<span class="sr-faint">Take from '+esc(hold[0].name.split(' ')[0])+'</span>':'<span class="sr-faint">All away on missions</span>';
      return pick(a.id,'<span class="bs-gearpick__n">'+IC(gearIcon(a))+'<span>'+esc(kitName(a))+'</span></span><span class="bs-sub">'+esc(itemBlurb(a))+'</span>'+state,!mine&&free<=0&&!hold.length);
    }).join('')||'<div class="sr-empty">Nothing in the armory fits this slot.</div>';
  return '<div class="bs-overlay"><button class="bs-overlay__scrim" data-rank-close aria-label="Close"></button>'+
    '<div class="bs-overlay__panel" role="dialog" aria-label="Choose gear"><div class="sr-window__head"><span class="sr-window__title">'+esc(p.name.split(' ')[0])+' \u00b7 '+SLOT_LABEL[s.k]+'</span>'+wX('data-rank-close')+'</div>'+
    '<div class="sr-window__body"><div class="bs-gearpicks">'+list+'</div></div></div></div>';
}
/* skill bars out of 50: the level sets the base, mission experience adds the rest */
function skillsCard(p){
  const ks=Rebel.skillKeys(p);
  if(!ks.length)return '';
  return '<div class="sr-h3">Skills</div><div class="bs-meters">'+ks.map(k=>{
    const v=Rebel.skill(p,k),S=Rebel.SKILLS[k];
    return meter(S.n,v/Rebel.SKILL_CAP,v,'var(--sr-psi)',S.d+' '+v+' of '+Rebel.SKILL_CAP+'.');
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
  if(winMode==='srcTutIntro'){
    h=wHead('Build Your Network',{q:wQ('data-srchelp','Learn more'),x:false})+wBody(
      tutP('Your Sources are the foundation of your intelligence network.')+
      tutS('1. Find Sources','Discover people willing to help the rebellion.')+
      tutS('2. Cultivate Them','Build their trust to increase their level and improve what they provide.')+
      tutS('3. Use Their Access','Gain Money, Supplies, Intel and new opportunities.')+
      tutS('4. Manage the Risk','The more valuable a Source becomes, the more important it is to keep them safe.')+
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
      '<div class="sr-card'+OPKIND[opKind(m)].card+'"><div class="sr-card__top"><span class="sr-card__title">'+m.name+'</span>'+opTag(m)+'</div>'+
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
  else if(winMode==='newhero'){
    const p=G.people.find(x=>x.id===winArg);
    if(!p){closeWin();return;}
    h=wHead('New Hero!',{x:false})+wBody(
      '<div class="sr-quote" style="margin:0 0 16px"><div class="sr-quote__who">'+IC('star')+'The word goes round the base</div>'+
      '“'+esc(p.first||p.name.split(' ')[0])+' did the thing nobody else could. People are already telling it wrong, and better.”</div>'+
      dossierHead(p))+
      wFoot(rbtn('data-close','Continue',false,'sr-btn--primary'),'The rebellion has a Hero.');
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
        const why=laidUp(p)?'injured':p.assign==='mission'?'on mission':busy?'the slot is busy':G.credits<SPEC_COST?'needs '+SPEC_COST+' credits':'';
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
      '<div class="sr-quote"><div class="sr-quote__who">'+IC('signal')+'Cass Wender</div>“Told you the rock was worth it. You and your revolution, huh? Crazy! I might just stick around for a while and see where this goes. I might know some people who hate the Hegemony as much as you do. Raise me when you’re ready to listen.”</div>'+
      '<p class="sr-p" style="margin-top:14px">First contact on the wire: <b>Cass Wender</b>, the smuggler who flew you in. Open the <b>Galaxy</b> and raise him.</p>')+
      wFoot(rbtn('data-close','Got it',false,'sr-btn--primary'),'carrier locked · unregistered freighter');
  }
  else if(winMode==='recruit'){
    const cards=winArg.cards,multi=cards.length>1,batch=!!winArg.batch;
    if(!cards.length){closeWin();return;}
    const full=bunksUsed()>=bunkCap();
    const anyMust=cards.some(c=>c.must);
    /* one card keeps the classic layout (buttons in the foot); several sit side by side, each with its own */
    const cardHTML=(c,i)=>{
      const p=c.p,terms='<div class="sr-h3">Terms</div><p class="sr-p">One bunk ('+bunksUsed()+'/'+bunkCap()+' filled)'+
        (p.role==='Support'?' · will run a station once assigned.':p.role==='Soldier'?' · arms from the rack.':' · a stick looking for a ship.')+'</p>'+
        (full?'<p class="sr-p bs-bad">No bunks free — build a quarters annex first.</p>':'');
      const inner=(c.line?'<div class="sr-quote" style="margin:0 0 16px">'+c.line+'</div>':'')+dossierHead(p,'',true)+terms;
      if(!multi)return inner;
      return '<div class="sr-card sr-card--friend bs-reccard">'+inner+'<div class="sr-card__acts" style="margin-top:10px">'+
        rbtn('data-rec-no="'+i+'"','Dismiss',false,'sr-btn--ghost sr-btn--sm')+rbtn('data-rec-accept="'+i+'"','Recruit',full&&!c.must,'sr-btn--primary sr-btn--sm')+'</div></div>';
    };
    if(multi)size='lg';
    h=wHead(multi?'New Recruits!':'New Recruit!',{x:anyMust?false:'data-rec-later'})+wBody(multi?'<div class="bs-recgrid">'+cards.map(cardHTML).join('')+'</div>':cardHTML(cards[0],0))+
      (multi?wFoot(batch?rbtn('data-rec-later','Decide later',false,'sr-btn--ghost'):'', batch?'Anyone you leave waits at the Command Center.':''):
        wFoot((cards[0].must?'':rbtn('data-rec-no="0"','Dismiss',false,'sr-btn--ghost'))+rbtn('data-rec-accept="0"','Recruit',full&&!cards[0].must,'sr-btn--primary')));
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
      const cls=m.state==='done'?' sr-card--good':m.state==='locked'?' is-locked':m.state==='prog'?' sr-card--info':OPKIND[opKind(m)].card;
      const tag=m.state==='done'?wTag(sentence(m.meta||'COMPLETE'),'good'):m.state==='prog'?wTag(m.progress.daysLeft+'d remaining','info'):m.state==='locked'?wTag('Locked'):m.state==='sim'?wTag('Simulator','progress'):wTag('Available');
      list+='<div class="sr-card'+cls+'"><div class="sr-card__top"><span class="sr-card__title">'+m.name+'</span>'+opTag(m)+(m.from?'<span class="bs-from">'+m.from+'</span>':'')+tag+'</div>'+
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
    let b=dossierHead(p,laidUp(p)?wTag('Injured '+outDays(p)+' days','bad'):restTag(p));
    if(p.role==='Pilot'||p.role==='Hero'){
      const f=G.fighters.find(x=>x.id===p.ship);
      if(f){
        const st=shipStats(f),n=Math.round(f.hull/20);
        b+='<div class="sr-h3">Assigned craft</div><div class="sr-card sr-card--info"><div class="sr-card__top"><span class="sr-card__title">'+f.name+'</span>'+(f.out?wTag('On mission','info'):'')+'</div>'+
          '<div class="sr-card__body" style="margin-bottom:8px">'+st.label+'<br>Shields '+st.shd+' · Armour '+st.arm+' · Hull '+st.hull+'<br>'+(st.wpns.length?st.wpns.map(w=>w[0]).join(' · '):'No weapons fitted')+'</div>'+
          '<span class="sr-hp'+(f.hull<35?' sr-hp--low':f.hull<60?' sr-hp--mid':'')+'"><span class="sr-hp__cells">'+[0,1,2,3,4].map(i=>'<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>').join('')+'</span><span class="sr-hp__num">Hull '+Math.round(f.hull)+'%</span></span></div>';
      }
      b+=gearSection(p);
    } else if(p.role==='Soldier'||p.role==='Marine'){
      if(p.auto)b+='<div class="sr-h3">Equipment</div><p class="sr-p">Integral autocannon arm. The face-screen is permanently, cheerfully, on.</p>';
      else b+=gearSection(p);
    } else {
      const st=p.assign.startsWith('station:')?p.assign.slice(8):null;
      b+='<div class="sr-h3">Station</div><p class="sr-p">'+
        (st?('On station: <b class="bs-good">'+ROOMS[st].name+'</b> — '+STAFFABLE[st].post+'. '+STAFFABLE[st].perk+'.')
           :'Unassigned. A room without its operator underperforms — post them somewhere.')+'</p>';
    }
    b+=recordCard(p);
    if(!laidUp(p)&&p.assign!=='mission'){
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
    h=wHead('Personnel file')+wBody(b)+wFoot(rbtn('data-close','Close',false,'sr-btn--primary'))+(rankOverlay===p.id&&!p.auto?rankOverlayHTML(p):'')+(gearOverlay&&gearOverlay.pid===p.id&&!p.auto?gearOverlayHTML(p):'');
  }
  else if(winMode==='contract'){
    const p=G.people.find(x=>x.id===winArg);
    if(!p||!p.merc){closeWin();return;}
    const fee=p.merc.fee,can=G.credits>=fee;
    const served=p.merc.missions||0;
    const canJoin=served>=3&&(p.morale||0)>=70;
    h=wHead('Contract’s up',{tags:wTag('Mercenary','progress'),x:false})+wBody(
      '<div class="bs-dz"><span class="sr-avatar" style="width:48px;height:48px">'+faceHTML(p)+'</span>'+
      '<div><div class="bs-dz__name">'+esc(p.name)+'</div><div class="sr-faint bs-dz__role">'+esc(rankFor(p))+' · '+esc(p.role)+(specOf(p)?' · '+esc(specOf(p)):'')+' · '+served+' mission'+(served===1?'':'s')+' on the contract</div></div></div>'+
      '<p class="sr-p">Fourteen days are up. '+esc(p.first||p.name.split(' ')[0])+' stands by the pad, kit packed either way.</p>'+
      choice(1,'data-mercrenew="'+p.id+'"','<b>Renew</b> — 14 more days for '+C(fee,!can)+(can?'':'<br><span class="sr-faint">'+esc(needWhy({c:fee}))+'</span>'),!can)+
      choice(2,'data-mercgo="'+p.id+'"','<b>Let them go</b> — they leave, and their own kit goes with them.')+
      (canJoin?choice(3,'data-mercjoin="'+p.id+'"','<b>Join the cause</b> — they tear up the contract. No fee. Ours for good.'):
        '<p class="sr-fine">A merc who has fought three missions on the contract and likes how it’s going (morale 70+) can be asked to join the cause.</p>'));
  }
  else if(winMode==='silence'){
    const s=winArg;
    h=wHead('Silence',{tags:wTag(s.name)})+wBody(
      '<div class="sr-quote" style="margin-top:0"><div class="sr-quote__who">'+IC('signal')+'The assassin</div>The assassin waits by the airlock, helmet under one arm.<br><br>“Say the word, Commander. '+
      s.name.split(' ')[0]+' stops being a risk tonight — and stops being anything else, too.”</div>'+
      choice(1,'data-kill="'+s.id+'"','Do it. The rebellion is bigger than one frightened '+s.type.split(' ')[0].toLowerCase()+'.')+
      choice(2,'data-close','Not yet. Back into the shadows.'));
  }
  else if(winMode==='ship'){
    const f=winArg,SS=SR.shipSheet;
    const pilots=G.people.filter(p=>p.role==='Pilot'&&!laidUp(p));
    shipSheetShip=SS.make(f.cls,f.name,f.out?100:f.hull,pilots.length?Math.max(...pilots.map(pilotAim)):2);
    h=SS.html(shipSheetShip,f.name)+wFoot(rbtn('data-visithangar','Visit the hangar',false,'sr-btn--ghost')+rbtn('data-close','Close',false,'sr-btn--primary'),f.out?'On a mission right now':'');
  }
  else if(winMode==='news'){
    h=wHead('All news')+wBody('<div class="sr-log" id="log" aria-live="polite"></div>');
  }
  card.className='sr-window'+(size?' sr-window--'+size:'')+(accent?' sr-window--'+accent:'');
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
  card.innerHTML=h;
  const ttl=card.querySelector('.sr-window__title');if(ttl)card.setAttribute('aria-label',ttl.textContent);
  if(winMode==='news')renderNews();
  if(winMode==='ship')SR.shipSheet.paint(card,shipSheetShip);
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
  } else if(!winMode&&baseView==='galaxy'&&srcSel&&srcSel.t==='p'){
    const d=pdef(srcSel.id),st=pst(srcSel.id);
    if(d&&st){
      if(!st.access){if(G.intel<d.scout)short.i=1;}
      else if((st.acc||0)<5&&G.intel<accessCost(d,st))short.i=1;
    }
  }
  for(const [k,,,wid] of RESKEYS)$(wid).classList.toggle('is-short',!!short[k]);
}
function markWin(){markShort();}
/* the tabs show where the player is; Base is "no window open and no view up" */
function syncTabs(){
  let sel;
  if(winMode==='missions')sel='navMissions';
  else if(winMode==='srcTutIntro'||winMode==='srcTut')sel=baseView==='galaxy'?'navSources':null;
  else if(winMode)sel=null;
  else if(arOpen)sel='navArsenal';
  else if(bmOpen)sel='navMarket';
  else sel=baseView==='galaxy'?'navSources':'navBase';
  for(const id of ['navBase','navSources','navMissions','navArsenal','navMarket'])$(id).setAttribute('aria-selected',String(id===sel));
}
const roleIcon={Pilot:'pilot',Soldier:'soldier',Marine:'marine',Hero:'star'};
function syncUI(){
  clampSupplies();
  ensureMarket();   // a new game rolls week 1 on day 1; an old save rolls its current week once
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
  if(bmOpen&&G.market)G.market.unseen=0;   // looking at the stall counts as seen
  const bmN=(G.market&&G.market.unseen)||0;
  $('bmBadge').hidden=!bmN;$('bmBadge').textContent=bmN;
  const prog=G.missions.filter(m=>m.state==='prog').length;
  const building=G.rooms.filter(r=>r.build).length;
  let note=[prog?'<b>'+prog+'</b> mission'+(prog>1?'s':'')+' out':null,building?'<b>'+building+'</b> building':null].filter(Boolean).join(' · ');
  if(bmOpen&&G.market){const d=G.market.next-G.day;note='Restock in <b>'+d+' day'+(d===1?'':'s')+'</b>';}
  $('dockNote').innerHTML=note;$('dockNote').hidden=!note;
  /* crew rail */
  const crewRow=p=>{
    const pilot=p.role==='Pilot'||p.role==='Hero',marine=p.role==='Marine',sup=!pilot&&!marine&&p.role!=='Soldier';
    const tone=pilot?'var(--sr-gold)':marine?'var(--sr-c-progress)':sup?'var(--sr-c-good)':'';
    const ico=roleIcon[p.role]||'support';
    let tag;
    if(laidUp(p))tag='<span class="sr-tag sr-tag--bad" title="Injured, '+outDays(p)+' day'+(outDays(p)>1?'s':'')+'" aria-label="Injured, '+outDays(p)+' days">'+IC('heart')+outDays(p)+' day'+(outDays(p)>1?'s':'')+'</span>';
    else if(p.assign==='mission')tag='<span class="sr-tag sr-tag--info">On mission</span>';
    else if(Rebel.weary(p))tag=restTag(p);
    else if(p.assign==='train'||p.assign==='spec')tag='<span class="sr-tag sr-tag--progress">Training</span>';
    else if(p.assign.startsWith('station:'))tag='<span class="sr-tag sr-tag--good">'+(STLBL[p.assign.slice(8)]||'Post')+'</span>';
    else tag='<span class="sr-tag">Resting</span>';
    return '<button class="sr-unit" data-person="'+p.id+'"'+(tone?' style="--c:'+tone+'"':'')+'><span class="sr-avatar'+(pilot?' sr-avatar--pilot':'')+'"'+(tone&&!pilot?' style="--c:'+tone+'"':'')+'>'+faceHTML(p)+'<span class="sr-avatar__role">'+IC(ico)+'</span></span>'+
      '<span class="sr-unit__main"><span class="sr-unit__top"><span class="sr-unit__name">'+p.name+'</span>'+(Rebel.canPromote(p)?'<span class="bs-good" title="Due a promotion" aria-label="Due a promotion">\u25b2</span>':'')+((p.cond&&p.cond.length)||(p.body&&Object.values(p.body).some(v=>v===1))?'<span class="bs-bad" title="'+esc(Rebel.medSummary(p).join(', '))+'" aria-label="Injuries: '+esc(Rebel.medSummary(p).join(', '))+'">\u271a</span>':'')+(!p.auto&&p.morale<=40?'<span class="bs-bad" title="'+(p.morale<=20?'Very low':'Low')+' morale" aria-label="'+(p.morale<=20?'Very low':'Low')+' morale">\u25bc</span>':'')+'</span><span class="sr-unit__role" title="'+esc(rankFor(p))+', level '+p.level+'">'+rankFor(p)+', level '+p.level+'</span></span><span class="sr-unit__side">'+tag+'</span></button>';
  };
  const grp=(listId,countId,people,emptyMsg)=>{
    $(listId).innerHTML=people.length?people.map(crewRow).join(''):'<div class="sr-empty">'+emptyMsg+'</div>';
    $(countId).textContent=people.length||'';
  };
  grp('pilotList','pilotCount',G.people.filter(p=>p.role==='Pilot'),'No pilots yet. Recruit them through your sources in the Galaxy.');
  grp('soldierList','soldierCount',G.people.filter(p=>p.role==='Soldier'),'No soldiers yet. Recruit them through your sources in the Galaxy.');
  const heroes=G.people.filter(p=>p.role==='Hero');
  $('heroSec').hidden=!heroes.length;
  grp('heroList','heroCount',heroes,'');
  const marines=G.people.filter(p=>p.role==='Marine');
  $('marSec').hidden=!marines.length;
  grp('marineList','marineCount',marines,'');
  grp('supportList','supportCount',G.people.filter(p=>p.role!=='Pilot'&&p.role!=='Soldier'&&p.role!=='Marine'&&p.role!=='Hero'),'No support crew yet. Recruit them through your sources in the Galaxy.');
  $('fleetList').innerHTML=G.fighters.length?G.fighters.map(f=>{
    const n=Math.round(f.hull/20),hc=f.hull<35?' sr-hp--low':f.hull<60?' sr-hp--mid':'';
    const cells='<span class="sr-hp'+hc+'"><span class="sr-hp__cells">'+[0,1,2,3,4].map(i=>'<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>').join('')+'</span><span class="sr-hp__num">Hull '+Math.round(f.hull)+'%</span></span>';
    const tag=f.out?'<span class="sr-tag sr-tag--friend">Out</span>':f.hull<100?'<span class="sr-tag sr-tag--warn">'+IC('work')+'Repairing</span>':'';
    return '<button class="sr-unit" data-fighter="'+f.id+'" style="--c:var(--sr-shield)"><span class="sr-avatar" style="--c:var(--sr-shield)">'+IC('ship')+'</span>'+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+f.name+'</span>'+(f.out?'':cells)+'</span><span class="sr-unit__side">'+tag+'</span></button>';
  }).join(''):'<div class="sr-empty">'+(G.wreck&&!G.wreck.restored?'No ships yet. Restore the derelict hauler from the Hangar.':'No ships yet. A mission can win us one.')+'</div>';
  $('fleetCount').textContent=G.fighters.length||'';
  {const vs=G.vehicles||[];
   $('vehSec').hidden=!vs.length;
   $('vehList').innerHTML=vs.map(v=>{
     const n=Math.round(v.hp/20),hc=v.hp<35?' sr-hp--low':v.hp<60?' sr-hp--mid':'';
     const cells='<span class="sr-hp'+hc+'"><span class="sr-hp__cells">'+[0,1,2,3,4].map(i=>'<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>').join('')+'</span><span class="sr-hp__num">'+Math.round(v.hp)+'%</span></span>';
     const tag=v.hp<100?'<span class="sr-tag sr-tag--warn">'+IC('work')+'Repairing</span>':'<span class="sr-tag">'+(gvehOf(v).kind==='bot'?'Bot':'Vehicle')+'</span>';
     return '<div class="sr-unit" title="'+esc(gvehOf(v).bio)+'" style="--c:var(--sr-gold)">'+vehAvatar()+'<span class="sr-unit__main"><span class="sr-unit__name">'+v.name+'</span>'+cells+'</span><span class="sr-unit__side">'+tag+'</span></div>';
   }).join('');
   $('vehCount').textContent=vs.length||'';}
  $('crewHint').textContent=SR.touch?'Tap anyone for their file':'Double-click anyone for their file';
  $('fleetHint').textContent=SR.touch?'Tap a ship for its stats':'Double-click a ship for its stats';
  if(viewRoom)renderRoomBar();
  if(winMode)renderWin();
  if(tilePopAt)renderTilePop();
  if(arOpen)renderArsenal();
  if(bmOpen)renderMarket();
  syncGxDOM();
  syncTabs();markShort();
}

/* ---------- Arsenal (a full stage view; replaces the Gear Grid window) ----------
   Everything we own in one place: personal kit on the footprint grid, ships and vehicles as bay cards,
   ship weapons on the hangar racks. The rail swaps to Loadouts; the command bar carries Give to… and Sell. */
const AR_CATS=[['all','All kit'],['weapon','Weapons'],['armour','Armour'],['gadget','Gadgets'],['vehicles','Vehicles'],['ships','Ships'],['shipkit','Ship kit']];
const AR_CATLBL={weapon:'Weapon',armour:'Armour',gadget:'Gadget',other:'Other'};
const START_IDS=['akli','cowboy','medpack'];   // the day-one armory, for saves from before stacks recorded their source
let arOpen=false,arCat='all',arSel=null,arOverlay=null,arGive=false,arRefit=null;
const arLast={};   // last selection per category chip (module state, not saved)
/* ---------- Arsenal/Market art bridge ----------
   SR_ART drawn once to data URLs and cached; anything the kit can't draw keeps its sr-icons glyph.
   Maker badges (SR_ART.makerBadge) and Gear doc trait and damage-type icons (SR_ART.icon) go the same way. */
const ART_SWPN={'bls-t-light-repeaters':'repeaters','missiles':'missiles','door-mounted-gun':'doorgun'};
const ART_GVEH={police:'police',dispersal:'riotdispersal',transport:'riottransport',truck:'truck'};
const artURLCache=new Map();
function artURL(kind,key){
  const ck=kind+':'+key;
  if(artURLCache.has(ck))return artURLCache.get(ck);
  let url=null;
  try{
    const W=192,H=120,d=2;
    const c2=document.createElement('canvas');c2.width=W*d;c2.height=H*d;
    const g=c2.getContext('2d');g.scale(d,d);
    if(kind==='item'){
      const k2=key,it=SA.ITEMS[k2];
      if(it){
        const[bx0,by0,bx1,by1]=it.box;
        const sc=Math.min(W*0.84/(bx1-bx0),H*0.84/(by1-by0));
        SA.item(g,k2,W/2,H/2,0,0,{scale:sc});
        url=c2.toDataURL();
      }
    } else if(kind==='ship'){
      SA.ship(g,artShipId(key),W/2,H*0.54,-0.45,3.6,0,{livery:'rebel',off:true});
      url=c2.toDataURL();
    } else if(kind==='veh'){
      if(key==='strider'){SA.strider(g,W/2,H*0.86,{s:1.5,mood:'hacked',t:0});url=c2.toDataURL();}
      else if(ART_GVEH[key]&&SA.VEHICLES[ART_GVEH[key]]){SA.vehicle(g,ART_GVEH[key],W/2,H*0.6,-0.5,1.1,0,{});url=c2.toDataURL();}
    } else if(kind==='mk'||kind==='trait'){
      const c3=document.createElement('canvas');c3.width=c3.height=96;
      const g3=c3.getContext('2d');g3.scale(2,2);
      if(kind==='mk'){if(!SA.MAKERS[key])throw 0;SA.makerBadge(g3,key,24,23,40);}
      else SA.icon(g3,key,24,24,47,{bare:true});
      url=c3.toDataURL();
    } else if(kind==='swpn'){
      const sw=SA.SHIP_WEAPONS[ART_SWPN[key]];
      if(sw){g.translate(W/2,H/2);g.scale(9,9);sw.draw(g,0,false,1);url=c2.toDataURL();}
    }
  }catch(e){url=null;}
  artURLCache.set(ck,url);
  return url;
}
const artImg=u=>'<img src="'+u+'" alt="">';
/* a maker chip: the art kit's badge and the maker's name */
function makerChip(id,name){
  if(!name)return '';
  const u=id&&artURL('mk',id);
  return '<span class="kit-mk">'+(u?'<img class="kit-mk__badge" src="'+u+'" alt="">':'<i></i>')+esc(name)+'</span>';
}
/* the Gear doc's damage type and traits as icons, with the rule in the tooltip */
function traitIcons(id){
  const m=KIT[id]||{},keys=(m.dtype?[m.dtype==='blunt'?'melee':m.dtype]:[]).concat(Items.traits(id));
  const out=keys.map(k=>{
    const T=SA.TRAITS[k],D=SA.DTYPES[k],u=artURL('trait',k);if(!u||!(T||D))return '';
    const tip=T?T.name+': '+T.text:D.name+' damage';
    return '<img class="kit-trait" src="'+u+'" alt="'+esc(tip)+'" title="'+esc(tip)+'">';
  }).join('');
  return out?'<span class="kit-traits">'+out+'</span>':'';
}
const itArt=(id,cls)=>{
  const u=artURL('item',id);
  return '<span class="it-art'+(cls?' '+cls:'')+'">'+(u?artImg(u):IC(gearIconId(id)))+'</span>';
};
const shipArt=(cls,cl2)=>{const u=artURL('ship',cls);return '<span class="it-art'+(cl2?' '+cl2:'')+'">'+(u?artImg(u):IC('ship'))+'</span>';};
const vehArt=(type,cl2)=>{const u=artURL('veh',type);return '<span class="it-art'+(cl2?' '+cl2:'')+'">'+(u?artImg(u):IC('vehicle'))+'</span>';};
const swpnArt=(id,cl2)=>{const u=artURL('swpn',id);return '<span class="it-art'+(cl2?' '+cl2:'')+'">'+(u?artImg(u):IC('turret'))+'</span>';};
const avat=(p,px)=>'<span class="sr-avatar" style="width:'+px+'px;height:'+px+'px">'+faceHTML(p)+'</span>';
const sellPrice=id=>{const m=KIT[id];return m&&m.price?Math.floor(m.price*0.3):0;};
function sellWhy(id){   // '' when sellable, otherwise the reason Sell is greyed
  const m=KIT[id]||{};
  if(m.heg)return 'Sweet Tooth won’t touch Hegemony kit';
  if(!m.price)return 'Sweet Tooth has no price for it';
  if(freeOf(id)<=0)return 'All of them are being carried';
  return '';
}
function sellItem(id){
  if(sellWhy(id))return false;
  const a=G.armory.find(x=>x.id===id);
  if(!a||a.n<=0)return false;
  const got=sellPrice(id);
  const nm=kitName(a);
  Items.take(G.armory,id,1);
  G.credits+=got;
  reconcileGear();
  if(arSel&&arSel.t==='kit'&&arSel.id===id&&!stockOf(id)){arSel=null;arLast[arCat]=null;}
  news('<b>Sweet Tooth</b> takes the '+esc(nm)+' off our hands. +'+got+'.','g');
  saveSnap();syncUI();
  return true;
}
function setTopbar(title,sub){
  ROOT.querySelector('.sr-topbar__id .sr-topbar__title').textContent=title;
  ROOT.querySelector('.sr-topbar__id .sr-topbar__sub').textContent=sub;
}
/* the phone drawer button says what the drawer holds: Loadouts in the Arsenal, the fence at the market */
function drawerLabel(){
  const btn=$('drawerBtn');
  const lbl=arOpen?'Loadouts':bmOpen?'Sweet Tooth':'Crew and flight';
  btn.setAttribute('aria-label',lbl);btn.title=lbl;
}
function openArsenal(){
  closeWin();closeTilePop();exitRoomView();closeMarket();
  arOpen=true;arOverlay=null;arGive=false;arRefit=null;
  $('arView').hidden=false;
  shell.classList.add('is-arsenal');
  setDrawer(false);
  setTopbar('Arsenal','Haven Rock · everything we own');
  drawerLabel();
  renderArsenal();syncTabs();
}
function closeArsenal(){
  if(!arOpen)return;
  arOpen=false;arOverlay=null;arGive=false;arRefit=null;
  $('arView').hidden=true;
  shell.classList.remove('is-arsenal');
  $('railArsenal').hidden=true;
  setDrawer(false);
  setTopbar('Haven Rock','Hidden base');
  drawerLabel();
  arCmdbar();syncTabs();
}
/* the items a kit chip shows: category order, then largest footprint first */
function arKitItems(cat){
  const ord={weapon:0,armour:1,gadget:2,other:3};
  return G.armory.filter(a=>a.n>0&&(cat==='all'||gearMeta(a).cat===cat)).slice().sort((a,b)=>{
    const ma=gearMeta(a),mb=gearMeta(b);
    const oa=ord[ma.cat]===undefined?3:ord[ma.cat],ob=ord[mb.cat]===undefined?3:ord[mb.cat];
    return oa-ob||mb.w*mb.h-ma.w*ma.h||kitName(a).localeCompare(kitName(b));
  });
}
/* ship weapons: what the racks hold (G.shipKit, once the market lands) plus what the fleet has fitted */
function arShipWpns(){
  const rows={};
  for(const e of G.shipKit||[])rows[e.id]={n:e.n||0,fitted:0,ships:[]};
  for(const f of G.fighters)for(const id of f.loadout||[]){
    rows[id]=rows[id]||{n:0,fitted:0,ships:[]};
    rows[id].fitted++;
    if(!rows[id].ships.includes(f.name))rows[id].ships.push(f.name);
  }
  return rows;
}
function arExists(sel){
  if(!sel)return false;
  if(sel.t==='kit')return stockOf(sel.id)>0;
  if(sel.t==='ship')return G.fighters.some(f=>f.id===sel.id);
  if(sel.t==='veh')return (G.vehicles||[]).some(v=>v.id===sel.id);
  if(sel.t==='shipwpn')return !!arShipWpns()[sel.id];
  return false;
}
function arDefaultSel(){
  if(arCat==='ships')arSel=G.fighters.length?{t:'ship',id:G.fighters[0].id}:null;
  else if(arCat==='vehicles')arSel=(G.vehicles||[]).length?{t:'veh',id:G.vehicles[0].id}:null;
  else if(arCat==='shipkit'){const k=Object.keys(arShipWpns());arSel=k.length?{t:'shipwpn',id:k[0]}:null;}
  else{const it=arKitItems(arCat);arSel=it.length?{t:'kit',id:it[0].id}:null;}   // the top-left tile
  arLast[arCat]=arSel;
}
function renderArsenal(){
  if(!arOpen)return;
  if(!arExists(arSel))arDefaultSel();
  $('arDossier').innerHTML=arDossierHTML();
  $('arMain').innerHTML=arMainHTML();
  renderArRail();
  arCmdbar();
  const old=$('arView').querySelector('.bs-overlay');
  if(old)old.remove();
  let ov='';
  if(arOverlay){const p=G.people.find(x=>x.id===arOverlay.pid);ov=p?gearOverlayHTML(p,arOverlay):'';}
  else if(arGive&&arSel&&arSel.t==='kit')ov=arGiveHTML();
  else if(arRefit)ov=arRefitHTML();
  if(ov)$('arView').insertAdjacentHTML('beforeend',ov);
}
const statRow=(dt,dd)=>'<dt>'+dt+'</dt><dd>'+dd+'</dd>';
function arDossierHTML(){
  if(!arSel)return '<div class="sr-empty">Nothing here yet. Missions and Sweet Tooth fill these shelves.</div>';
  const well=inner=>'<div class="kit-well">'+inner+'</div>';
  if(arSel.t==='kit'){
    const a=G.armory.find(x=>x.id===arSel.id);if(!a)return '';
    const m=gearMeta(a);
    const mk=makerChip(m.makerId,m.maker);
    const prov=m.heg
      ?wTag('Looted','foe')+wTag(IC('lock')+'Hegemony issue','foe')
      :a.src==='bought'?wTag('Bought from Sweet Tooth','action')
      :wTag((a.src?a.src==='start':START_IDS.includes(a.id))?'Starting kit':a.src==='made'?'Made at base':'Stolen','friend');
    const stats='<dl class="kit-stat">'+
      statRow('Kind',(AR_CATLBL[m.cat]||'Other')+(m.origin&&m.origin!=='factory'?' · '+m.origin:''))+
      statRow('Slot',m.slot?SLOT_LABEL[m.slot==='gadget'?'gad':m.slot]:'Mission stores — not carried in a slot')+
      (m.cat==='armour'?statRow('Armour',m.arm?m.arm+' over health in a fight':'None — cosmetic'):'')+
      (m.shd?statRow('Shield',m.shd+' when raised'):'')+
      statRow('Size',m.w+'×'+m.h+' storeroom slot'+(m.w*m.h>1?'s':''))+
      (m.price?statRow('Street value',m.price+' credits'):'')+
      '</dl>';
    const hold=holders(a.id,[]);
    return well(itArt(a.id))+
      '<div><div class="ar-dossier__name">'+esc(kitName(a))+'</div><div class="ar-dossier__kind">'+mk+prov+'</div></div>'+
      (itemBlurb(a)?'<p class="ar-blurb">'+esc(itemBlurb(a))+'</p>':'')+traitIcons(a.id)+stats+
      '<div class="ar-count"><div><b>'+a.n+'</b><span>Owned</span></div><div><b>'+carried(a.id)+'</b><span>Carried</span></div><div><b>'+freeOf(a.id)+'</b><span>In store</span></div></div>'+
      (hold.length?'<div class="sr-h3" style="margin:0">Carried by</div><div class="ar-holders">'+hold.map(p=>'<span class="ar-holder">'+avat(p,24)+esc(p.name.split(' ')[0])+'</span>').join('')+'</div>':'');
  }
  if(arSel.t==='ship'){
    const f=G.fighters.find(x=>x.id===arSel.id);if(!f)return '';
    const r=SRDB.ship(f.cls)||{},pilot=G.people.find(p=>p.ship===f.id);
    return well(shipArt(f.cls))+
      '<div><div class="ar-dossier__name">'+esc(f.name)+'</div><div class="ar-dossier__kind">'+wTag(esc(r.name||f.cls),'info')+(f.out?wTag('Out','info'):'')+'</div></div>'+
      '<dl class="kit-stat">'+statRow('Class',esc((r.name||f.cls)+(r.role?' · '+r.role:'')))+statRow('Hull',Math.round(f.hull)+'%')+
      statRow('Shields',(r.shield_front||0)+'F / '+(r.shield_rear||0)+'A')+statRow('Weapons',(f.loadout||[]).map(wpnLabel).join(', ')||'None fitted')+
      statRow('Pilot',pilot?esc(pilot.name):'Unassigned')+'</dl>'+
      '<p class="ar-blurb">Refit swaps weapons with the hangar racks; repairs happen on the pads.</p>';
  }
  if(arSel.t==='veh'){
    const v=(G.vehicles||[]).find(x=>x.id===arSel.id);if(!v)return '';
    const d=gvehOf(v);
    return well(vehArt(v.type))+
      '<div><div class="ar-dossier__name">'+esc(v.name)+'</div><div class="ar-dossier__kind">'+wTag(d.kind==='bot'?'Bot':'Vehicle','info')+'</div></div>'+
      (d.bio?'<p class="ar-blurb">'+esc(d.bio)+'</p>':'')+
      '<dl class="kit-stat">'+statRow('Type',esc(d.label))+statRow('Health',Math.round(v.hp)+'%')+(d.arm?statRow('Armour',String(d.arm)):'')+
      statRow('Crew',d.kind==='bot'?'Drives itself':(d.seats||1)+' seat'+((d.seats||1)>1?'s':''))+'</dl>'+
      '<p class="ar-blurb">Bring it to a ground mission from the plan’s Fire support area.</p>';
  }
  if(arSel.t==='shipwpn'){
    const rows=arShipWpns(),row=rows[arSel.id];if(!row)return '';
    const w=SRDB.weapon(arSel.id);
    return well(swpnArt(arSel.id))+
      '<div><div class="ar-dossier__name">'+esc(w?w.name:arSel.id)+'</div><div class="ar-dossier__kind">'+wTag('Ship weapon','info')+'</div></div>'+
      '<dl class="kit-stat">'+statRow('On the racks',String(row.n))+statRow('Fitted',row.fitted+(row.ships.length?' · '+row.ships.map(esc).join(', '):''))+'</dl>'+
      '<p class="ar-blurb">Hangar racks · no limit. Fit them from a ship’s Refit order in the Ships view.</p>';
  }
  return '';
}
function arMainHTML(){
  let i=0;
  const chips=AR_CATS.map(([k,l])=>((i++)===4?'<span class="ar-sep"></span>':'')+rbtn('data-arcat="'+k+'" aria-pressed="'+(arCat===k)+'"',l,false,'sr-btn--sm')).join('');
  let cap='';
  if(arCat==='ships')cap='<span>Landing pads <b>'+G.fighters.length+'</b> / '+fighterCap()+'</span>';
  else if(arCat==='vehicles'){const n=(G.vehicles||[]).length;cap='<span><b>'+n+'</b> vehicle'+(n===1?'':'s')+' and Bots</span>';}
  else if(arCat==='shipkit')cap='<span>Hangar racks · no limit</span>';
  else{
    const used=arKitItems('all').reduce((n,a)=>{const m=gearMeta(a);return n+m.w*m.h;},0),capn=gearCapacity();
    cap='<span>Storeroom <b>'+used+'</b> / '+capn+' slots</span>'+
      '<span class="sr-meter__track" style="--c:var(--sr-gold)"><span class="sr-meter__fill" style="display:block;width:'+Math.min(100,Math.round(used/capn*100))+'%"></span></span>'+
      (used>capn?'<span class="bs-bad">overflowing — build another Storeroom</span>':'');
  }
  return '<div class="ar-bar"><div class="ar-chips">'+chips+'</div><div class="ar-cap" id="arCap">'+cap+'</div></div>'+arGridHTML();
}
function arGridHTML(){
  if(arCat==='ships'||arCat==='vehicles')return arBaysHTML();
  if(arCat==='shipkit')return arShipKitHTML();
  const items=arKitItems(arCat);
  const cols=ROOT.clientWidth<=900?4:GEAR_COLS;
  const lay=gearLayout(items,cols);
  let cells=lay.map(x=>{
    const id=x.a.id,m=x.m,c=carried(id),heg=!!(KIT[id]&&KIT[id].heg);
    const sel=arSel&&arSel.t==='kit'&&arSel.id===id;
    return '<button class="ar-tile'+(sel?' is-sel':'')+(heg?' is-foe':'')+(m.w>1&&m.h>1?' is-big':m.w>2?' is-wide':'')+'" data-arsel="kit:'+id+'" aria-pressed="'+sel+'" title="'+esc(itemBlurb(x.a)||kitName(x.a))+'" style="grid-column:'+(x.c+1)+' / span '+m.w+';grid-row:'+(x.r+1)+' / span '+m.h+'">'+
      itArt(id)+'<span class="ar-tile__q">×'+x.a.n+'</span>'+
      (c?'<span class="ar-tile__c'+(heg?' is-foe':'')+'" title="'+c+' carried">'+IC('people')+c+'</span>':'')+
      '<span class="ar-tile__n">'+esc(kitName(x.a))+'</span></button>';
  }).join('');
  if(arCat==='all'){
    /* free cells continue the packing lattice up to capacity; the rest of the last row is the locked block */
    const cap=gearCapacity();
    const used=items.reduce((n,a)=>{const m=gearMeta(a);return n+m.w*m.h;},0);
    const occ=[];
    for(const x of lay)for(let r=x.r;r<x.r+x.m.h;r++){occ[r]=occ[r]||[];for(let c=x.c;c<x.c+x.m.w;c++)occ[r][c]=1;}
    let r=0,c=0;
    const step=()=>{while(occ[r]&&occ[r][c]){c++;if(c>=cols){c=0;r++;}}};
    for(let n=0;n<Math.max(0,cap-used);n++){
      step();
      cells+='<i class="ar-free" style="grid-column:'+(c+1)+';grid-row:'+(r+1)+'"></i>';
      occ[r]=occ[r]||[];occ[r][c]=1;
    }
    step();
    cells+='<div class="ar-locked" style="grid-column:'+(c+1)+' / -1;grid-row:'+(r+1)+'">'+IC('lock')+'Another Storeroom: +12 slots</div>';
  }
  return '<div class="ar-grid" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+cells+'</div>'+
    (items.length?'':'<div class="sr-empty">Nothing in this category.</div>');
}
function arBaysHTML(){
  const ships=arCat==='ships';
  const hp10=(pct,label)=>{
    const n=Math.max(0,Math.min(10,Math.round(pct/10)));
    return '<span class="sr-hp'+(pct<35?' sr-hp--low':pct<60?' sr-hp--mid':'')+'"><span class="sr-hp__cells">'+
      Array.from({length:10},(_,i)=>'<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>').join('')+'</span><span class="sr-hp__num">'+label+' '+Math.round(pct)+'%</span></span>';
  };
  let cards='';
  if(ships){
    for(const f of G.fighters){
      const r=SRDB.ship(f.cls)||{},pilot=G.people.find(p=>p.ship===f.id);
      const sel=arSel&&arSel.t==='ship'&&arSel.id===f.id;
      const mounts=(f.loadout||[]).map(id=>'<span class="ar-mount">'+IC('turret')+esc(wpnLabel(id))+'</span>').join('')||'<span class="ar-mount is-empty">No weapons fitted</span>';
      const seats=SEATS[f.cls]||0;
      const crew=(pilot?'Pilot: '+esc(pilot.name.split(' ')[0]):'<span class="bs-bad">No pilot assigned</span>')+
        (r.gunner_positions?' · '+r.gunner_positions+' gunner seat'+(r.gunner_positions>1?'s':''):'')+
        (seats?' · '+seats+' passenger'+(seats>1?'s':''):'');
      cards+='<button class="ar-bay'+(sel?' is-sel':'')+'" data-arsel="ship:'+f.id+'" aria-pressed="'+sel+'"><div class="kit-well">'+shipArt(f.cls)+'</div>'+
        '<div class="ar-bay__body"><div class="ar-bay__name">'+esc(f.name)+(f.out?' '+wTag('Out','info'):'')+'</div>'+
        '<div class="ar-bay__sub">'+esc((r.name||f.cls)+(r.role?' · '+r.role:'')+(r.manufacturer?' · '+makerName(r.manufacturer):''))+'</div>'+hp10(f.hull,'Hull')+
        '<div class="ar-mounts">'+mounts+'</div><div class="ar-bay__sub">'+crew+'</div></div></button>';
    }
    const free=Math.max(0,fighterCap()-G.fighters.length);
    cards+='<div class="ar-baynew">'+(free?'<b>'+free+' landing pad'+(free>1?'s':'')+' free</b><span>A ship from Sweet Tooth needs one.</span>':'<b>No landing pads free</b><span>A ship from Sweet Tooth would need one — expand the Hangar.</span>')+'</div>';
  } else {
    for(const v of G.vehicles||[]){
      const d=gvehOf(v);
      const sel=arSel&&arSel.t==='veh'&&arSel.id===v.id;
      cards+='<button class="ar-bay'+(sel?' is-sel':'')+'" data-arsel="veh:'+v.id+'" aria-pressed="'+sel+'"><div class="kit-well">'+vehArt(v.type)+'</div>'+
        '<div class="ar-bay__body"><div class="ar-bay__name">'+esc(v.name)+'</div>'+
        '<div class="ar-bay__sub">'+esc(d.label)+' · '+(d.kind==='bot'?'Bot':'Vehicle')+'</div>'+hp10(v.hp,'Health')+
        '<div class="ar-bay__sub">'+(d.kind==='bot'?'Drives itself':(d.seats||1)+' seat'+((d.seats||1)>1?'s':'')+' · crewed on the mission plan')+'</div></div></button>';
    }
    cards+='<div class="ar-baynew"><b>Room for more</b><span>Sweet Tooth sometimes has a Frontier Floatin’ Truck.</span></div>';
  }
  return '<div class="ar-bays">'+cards+'</div>';
}
function arShipKitHTML(){
  const rows=arShipWpns(),ids=Object.keys(rows);
  if(!ids.length)return '<div class="sr-empty">The hangar racks are bare. Ship weapons from Sweet Tooth stack here.</div>';
  const tiles=ids.map(id=>{
    const w=SRDB.weapon(id),row=rows[id];
    const sel=arSel&&arSel.t==='shipwpn'&&arSel.id===id;
    return '<button class="ar-tile is-wide'+(sel?' is-sel':'')+'" data-arsel="shipwpn:'+id+'" aria-pressed="'+sel+'" style="grid-column:span 2">'+
      swpnArt(id)+'<span class="ar-tile__q">×'+row.n+'</span>'+
      (row.fitted?'<span class="ar-tile__c is-foe" title="Fitted: '+esc(row.ships.join(', '))+'">'+IC('ship')+row.fitted+'</span>':'')+
      '<span class="ar-tile__n">'+esc(w?w.name:id)+'</span></button>';
  }).join('');
  const cols=ROOT.clientWidth<=900?4:GEAR_COLS;
  return '<div class="ar-grid" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+tiles+'</div>';
}
/* the rail: one Loadouts card per carrying rebel, six slots wide */
const AR_SLOT6=[{k:'primary',l:'Pri'},{k:'secondary',l:'Side'},{k:'head',l:'Head'},{k:'body',l:'Body'},{k:'back',l:'Back'},{k:'gad',i:0,l:'Gad'},{k:'gad',i:1,l:'Gad'}];
function renderArRail(){
  const host=$('railArsenal');
  if(!arOpen){host.hidden=true;return;}
  host.hidden=false;
  const selId=arSel&&arSel.t==='kit'?arSel.id:null;
  const carriers=crewOf().filter(p=>gearSlots(p).length&&gearSlots(p).some(s=>slotGet(p,s)));
  const rows=carriers.map(p=>{
    const slots=AR_SLOT6.map(d=>{
      const s=gearSlots(p).find(x=>x.k===d.k&&(x.i||0)===(d.i||0));
      if(!s)return '<span class="ar-slot is-none" aria-hidden="true">—</span>';   // a slot this role doesn't have
      const id=slotGet(p,s);
      if(isOwnSlot(p,s))return '<span class="ar-slot is-lock" title="'+esc(SLOT_LABEL[s.k]+': '+kitNameId(id)+' — their own kit')+'">'+itArt(id)+'</span>';
      return '<button class="ar-slot'+(id?'':' is-empty')+(id&&id===selId?' is-match':'')+'" data-arslot="'+p.id+':'+s.k+':'+(s.i||0)+'" title="'+esc(SLOT_LABEL[s.k]+(id?': '+kitNameId(id):' — empty'))+'">'+
        (id?itArt(id):'<span>'+d.l+'</span>')+'</button>';
    }).join('');
    const days=p.merc?Math.max(0,p.merc.until-G.day):0;
    return '<div class="ar-row'+(p.merc?' is-merc':'')+'"><div class="ar-row__top">'+avat(p,34)+'<span><span class="ar-row__name">'+esc(p.name.split(' ')[0])+'</span><br><span class="ar-row__role">'+esc(rankFor(p))+' · '+esc(p.role)+'</span></span>'+
      (p.merc?'<span class="sr-tag sr-tag--progress">'+(days?days+' days left':'Contract up')+'</span>':'')+'</div>'+
      '<div class="ar-slots">'+slots+'</div></div>';
  }).join('');
  host.innerHTML='<section><div class="sr-section__head sr-section__head--action">'+IC('loot')+'Loadouts<span class="sr-section__count">'+carriers.length+' carrying</span></div>'+
    '<p class="sr-fine" style="margin:0 0 8px">Auto-equip fills empty slots. Anything you set by hand stays put. Tap a slot to swap.</p>'+
    '<div class="ar-slothead"><span>Primary</span><span>Side</span><span>Head</span><span>Body</span><span>Back</span><span>Gad</span><span>Gad</span></div>'+
    '<div class="ar-crew">'+rows+'</div>'+(carriers.length?'':'<div class="sr-empty">Nobody is carrying anything.</div>')+'</section>';
}
/* a command-bar order button on a number key (shared by the Arsenal and the Black Market) */
const cmdOrder=(key,icon,label,attrs,dis,title)=>'<button class="sr-order sr-order--util" '+attrs+(dis?' disabled':'')+(title?' title="'+esc(title)+'"':'')+'><span class="sr-kbd sr-order__key">'+key+'</span>'+IC(icon)+label+'</button>';
/* the command bar while the Arsenal is up: selected thing on the left, orders on keys 1-2 */
function arCmdbar(){
  if(bmOpen)return;
  const who=$('arWho'),orders=$('arOrders');
  if(!arOpen||!arSel){who.hidden=true;orders.hidden=true;who.innerHTML='';orders.innerHTML='';return;}
  let lead='',name='',hint='',btns='';
  const order=cmdOrder;
  if(arSel.t==='kit'){
    const a=G.armory.find(x=>x.id===arSel.id);
    if(a){
      const m=gearMeta(a),why=sellWhy(a.id);
      lead=itArt(a.id,'kit-who-art');name=esc(kitName(a));
      hint=freeOf(a.id)+' in store · '+carried(a.id)+' carried'+(m.heg?' · Sweet Tooth won’t buy it':'');
      const giveable=!!m.slot&&crewOf().some(p=>p.assign!=='mission'&&gearSlots(p).some(s=>gearFits(a.id,s)));
      btns=order(1,'people','Give to…','data-argive',!giveable,giveable?'':'Nobody has a slot for it')+
        order(2,'credits',why?'Sell':'Sell +'+sellPrice(a.id),'data-arsell',!!why,why);
    }
  } else if(arSel.t==='ship'){
    const f=G.fighters.find(x=>x.id===arSel.id);
    if(f){
      lead=shipArt(f.cls,'kit-who-art');name=esc(f.name);
      hint='Hull '+Math.round(f.hull)+'% · '+((f.loadout||[]).length?(f.loadout||[]).map(wpnLabel).join(' · '):'no weapons fitted');
      btns=order(1,'hangar','Hangar','data-arhangar',false,'Step into the Hangar')+
        order(2,'turret','Refit','data-arrefit',f.out,f.out?'Out on a mission':'Swap weapons with the hangar racks');
    }
  } else if(arSel.t==='veh'){
    const v=(G.vehicles||[]).find(x=>x.id===arSel.id);
    if(v){lead=vehArt(v.type,'kit-who-art');name=esc(v.name);hint='Health '+Math.round(v.hp)+'% · assigned on the mission plan';}
  } else if(arSel.t==='shipwpn'){
    const w=SRDB.weapon(arSel.id),row=arShipWpns()[arSel.id]||{n:0,fitted:0};
    lead=swpnArt(arSel.id,'kit-who-art');name=esc(w?w.name:arSel.id);
    hint=row.n+' on the racks · '+row.fitted+' fitted';
  }
  who.innerHTML=lead+'<div><div class="sr-cmdbar__name">'+name+'</div><div class="sr-cmdbar__hint">'+hint+'</div></div>';
  orders.innerHTML=btns;
  who.hidden=!name;orders.hidden=!btns;
}
/* Give to…: hand the selected item to a rebel with a fitting slot */
function arGiveHTML(){
  const id=arSel.id;
  const cands=crewOf().filter(p=>p.assign!=='mission'&&gearSlots(p).some(s=>gearFits(id,s)&&!isOwnSlot(p,s)));
  const list=cands.map(p=>{
    const s=gearSlots(p).find(x=>gearFits(id,x)&&!isOwnSlot(p,x)&&!slotGet(p,x))||gearSlots(p).find(x=>gearFits(id,x)&&!isOwnSlot(p,x));
    const cur=slotGet(p,s);
    const already=gearSlots(p).some(x=>slotGet(p,x)===id);
    return '<button class="bs-gearpick" data-argiveto="'+p.id+'"'+(already?' disabled':'')+'>'+
      '<span class="bs-gearpick__n">'+avat(p,24)+'<span>'+esc(p.name)+'</span></span>'+
      '<span class="bs-sub">'+esc(rankFor(p))+' · '+esc(p.role)+(already?' · already carrying one':cur?' · swaps out the '+esc(kitNameId(cur)):' · '+SLOT_LABEL[s.k].toLowerCase()+' slot is empty')+'</span></button>';
  }).join('')||'<div class="sr-empty">Nobody has a slot for it.</div>';
  return '<div class="bs-overlay"><button class="bs-overlay__scrim" data-rank-close aria-label="Close"></button>'+
    '<div class="bs-overlay__panel" role="dialog" aria-label="Give to"><div class="sr-window__head"><span class="sr-window__title">Give the '+esc(kitNameId(id))+' to…</span>'+wX('data-rank-close')+'</div>'+
    '<div class="sr-window__body"><div class="bs-gearpicks">'+list+'</div></div></div></div>';
}
/* Refit: swap a ship's mounted weapons with the hangar racks (G.shipKit). A cleared mount goes back
   to the racks; fitting takes one off them. Mount count comes from the db's weapon_slots. */
function arRefitHTML(){
  const f=G.fighters.find(x=>x.id===arRefit.sid);
  if(!f)return '';
  const slots=(SRDB.ship(f.cls)||{}).weapon_slots||2;
  const panel=(title,body)=>'<div class="bs-overlay"><button class="bs-overlay__scrim" data-rank-close aria-label="Close"></button>'+
    '<div class="bs-overlay__panel" role="dialog" aria-label="Refit"><div class="sr-window__head"><span class="sr-window__title">'+title+'</span>'+wX('data-rank-close')+'</div>'+
    '<div class="sr-window__body"><div class="bs-gearpicks">'+body+'</div></div></div></div>';
  if(arRefit.mi===null){
    const rows=Array.from({length:slots},(_,i)=>{
      const id=(f.loadout||[])[i];
      return '<button class="bs-gearpick" data-armount="'+i+'"><span class="bs-gearpick__n">'+IC('turret')+'<span>Mount '+(i+1)+'</span></span>'+
        '<span class="bs-sub">'+(id?esc(wpnLabel(id)):'Empty')+'</span></button>';
    }).join('');
    return panel(esc(f.name)+' · Refit',rows+'<p class="sr-fine" style="margin:8px 0 0">Swapped-out weapons go back on the hangar racks.</p>');
  }
  const cur=(f.loadout||[])[arRefit.mi];
  const rack=(G.shipKit||[]).filter(e=>e.n>0);
  const rows=(cur?'<button class="bs-gearpick" data-arfit=""><span class="bs-gearpick__n">Leave empty</span><span class="bs-sub">The '+esc(wpnLabel(cur))+' goes back on the racks</span></button>':'')+
    rack.map(e=>{
      const w=SRDB.weapon(e.id);
      return '<button class="bs-gearpick'+(cur===e.id?' is-on':'')+'" data-arfit="'+e.id+'"><span class="bs-gearpick__n">'+IC('turret')+'<span>'+esc(w?w.name:e.id)+'</span></span><span class="bs-sub">×'+e.n+' on the racks</span></button>';
    }).join('')||(cur?'':'<div class="sr-empty">The racks are bare. Sweet Tooth sometimes has ship weapons.</div>');
  return panel(esc(f.name)+' · Mount '+(arRefit.mi+1),rows);
}
function arFit(id){
  const f=G.fighters.find(x=>x.id===arRefit.sid);
  if(!f)return false;
  const mi=arRefit.mi;
  f.loadout=f.loadout||[];
  G.shipKit=G.shipKit||[];
  if(id){
    const e=G.shipKit.find(x=>x.id===id);
    if(!e||e.n<=0)return false;
    if(mi<f.loadout.length&&f.loadout[mi]===id)return true;   // already fitted there
    e.n--;
    if(mi<f.loadout.length){
      const old=f.loadout[mi];
      const oe=G.shipKit.find(x=>x.id===old);
      if(oe)oe.n++;else G.shipKit.push({id:old,n:1});
      f.loadout[mi]=id;
    } else f.loadout.push(id);
    news('<b>'+esc(wpnLabel(id))+'</b> fitted to the <b>'+esc(f.name)+'</b>.','d');
  } else if(mi<f.loadout.length){
    const old=f.loadout[mi];
    f.loadout.splice(mi,1);
    const oe=G.shipKit.find(x=>x.id===old);
    if(oe)oe.n++;else G.shipKit.push({id:old,n:1});
    news('The <b>'+esc(wpnLabel(old))+'</b> comes off the <b>'+esc(f.name)+'</b> and onto the racks.','d');
  }
  saveSnap();
  return true;
}
function arGiveTo(pid){
  const id=arSel.id,p=G.people.find(x=>x.id===pid);
  if(!p)return;
  const s=gearSlots(p).find(x=>gearFits(id,x)&&!isOwnSlot(p,x)&&!slotGet(p,x))||gearSlots(p).find(x=>gearFits(id,x)&&!isOwnSlot(p,x));
  if(!s)return;
  applyGearPick(pid,s.k,s.i||0,id);
  arGive=false;
  syncUI();
}
function arClick(ev){
  const t=ev.target.closest('button');
  if(!t||t.disabled)return;
  sClick();
  const cat=t.getAttribute('data-arcat');
  if(cat){arCat=cat;arSel=arLast[cat]||null;renderArsenal();return;}
  const sel=t.getAttribute('data-arsel');
  if(sel){const q=sel.indexOf(':');arSel={t:sel.slice(0,q),id:sel.slice(q+1)};arLast[arCat]=arSel;renderArsenal();return;}
  const slot=t.getAttribute('data-arslot');
  if(slot){const [pid,k,i]=slot.split(':');arOverlay={pid,k,i:+i};arGive=false;arRefit=null;setDrawer(false);renderArsenal();return;}   // the picker lives on the view, not in the drawer
  if(t.hasAttribute('data-rank-close')){arOverlay=null;arGive=false;arRefit=null;renderArsenal();return;}
  const mount=t.getAttribute('data-armount');
  if(mount!==null&&arRefit){arRefit.mi=+mount;renderArsenal();return;}
  const fit=t.getAttribute('data-arfit');
  if(fit!==null&&arRefit&&arRefit.mi!==null){
    arFit(fit||null);
    arRefit.mi=null;   // back to the mount list to keep refitting
    syncUI();return;
  }
  const pick=t.getAttribute('data-gear-pick');
  if(pick){
    const [pid,k,i,id]=pick.split(':');
    applyGearPick(pid,k,i,id);
    arOverlay=null;
    syncUI();return;
  }
  const give=t.getAttribute('data-argiveto');
  if(give){arGiveTo(give);return;}
}
$('arView').addEventListener('click',arClick);
$('railArsenal').addEventListener('click',arClick);   // the Loadouts slots live in the rail
$('arOrders').addEventListener('click',ev=>{
  const t=ev.target.closest('button');
  if(!t||t.disabled)return;
  if(bmOpen){
    sClick();
    if(t.hasAttribute('data-bmbuy'))buyLot(bmSel,false);
    else if(t.hasAttribute('data-bmbuyall'))buyLot(bmSel,true);
    return;
  }
  if(!arOpen||!arSel)return;
  sClick();
  if(t.hasAttribute('data-argive')){arGive=true;arOverlay=null;arRefit=null;renderArsenal();return;}
  if(t.hasAttribute('data-arrefit')){arRefit={sid:arSel.id,mi:null};arOverlay=null;arGive=false;renderArsenal();return;}
  if(t.hasAttribute('data-arsell')){sellItem(arSel.id);return;}
  if(t.hasAttribute('data-arhangar')){
    const rm=G.rooms.find(r=>r.key==='hangar'&&!r.build);
    closeArsenal();
    if(rm)enterRoomView(rm);
    syncUI();return;
  }
});

/* ---------- the Black Market (a full stage view; Sweet Tooth's stall at Nyx Shadowport) ----------
   Six lots, a full restock every 7 days, no Hegemony kit. Phase 2 sells personal kit only: the weighted
   categories for mercenaries, ships, vehicles and ship weapons have nothing eligible yet (their phases and
   DESIGN_BLOCKERS M-19), so the reroll rule drops their weight onto kit. */
let bmOpen=false,bmSel=null,bmLine=null;
/* Sweet Tooth's lines live in one table so they can be rewritten easily. Her pet name is "sugar". */
const ST_LINES={
  greet:'Six lots this week, sugar. When they’re gone, they’re gone.',
  broke:'…Which is more than you’ve got. I don’t do credit, I do credits.',
  boughtKit:'Pleasure, sugar. It’s already in your Arsenal. Don’t ask how.',
  hiredMerc:'They’ll be at your door by morning. Feed them, pay them, and don’t ask about the name.',   // the handoff says to use the merc's pronoun; rebels carry none, so they/them
  needBunk:'…And sugar, they’ll want a bunk waiting. Build one first.',
  needPad:'…And it needs a pad to land on, sugar. Clear one first.',
  boughtShip:'Done. My lads will fly it to you in two days. Try not to crash it before it lands.',       // Phase 4
  soldOut:'Gone. Should’ve been quicker, sugar.',
  noHeg:'It’s serial-stamped, sugar. It gets stalls burned.',   // optional flavour: why no Hegemony kit
  mercTpl:'[First] shoots for money, not for flags. Pay [them] well and [they] might start caring. Comes with [their] own [weapon].',   // Phase 3
  pitch:{
    longiron:'Off a poacher who won’t be needing it. Not my doing. Mostly. Reaches further than anything else on this table.',
    akli:'Bhord build them to be dropped in mud. These fell off a garrison truck. Twice.',
    blam:'BLAMCo. Accept no imitations. I’ve got four, and I’ve stopped counting fingers.',
    angel:'Some tinkerer’s pet project. It’ll take a bullet for you. Once. Then it’s a paperweight.',
    cross:'A MenDon Cross, barely shot at. Patrol markings sanded off, mostly. Two days to fly it in, and you’ll want a pad.',
  },
  pitchCat:{
    weapon:'Clean, oiled, and nobody is asking where it came from. Which is how you want it, sugar.',
    armour:'It stopped something once. Wash it off and it will stop another.',
    gadget:'Small, useful and off the books. My favourite kind of merchandise.',
    merc:'Works for credits, sugar. Loyalty costs extra, and I don’t stock it.',
    ship:'Flies better than it looks. Most things do.',
    vehicle:'Runs, stops, and doesn’t ask questions.',
    shipwpn:'Bolt it on and point it away from me.',
  },
};
const BM_CAT={
  weapon:{ic:'gun',cc:'var(--sr-rebel-hi)',lab:'Weapon'},
  armour:{ic:'shield',cc:'var(--sr-shield)',lab:'Armour'},
  gadget:{ic:'grenade',cc:'var(--sr-go)',lab:'Gadget'},
  merc:{ic:'people',cc:'var(--sr-psi)',lab:'Mercenary'},
  vehicle:{ic:'vehicle',cc:'var(--sr-text-2)',lab:'Vehicle'},
  ship:{ic:'ship',cc:'var(--sr-shield)',lab:'Ship'},
  shipwpn:{ic:'turret',cc:'var(--sr-text-2)',lab:'Ship weapon'},
};
/* what the command bar shows per gadget (weapons read the ground scene's WPN table) */
const BM_GSTATS={
  medpack:[['Effect','Treats a wound'],['Health','One wound per pack'],['Use','Anyone, in the field']],
  blam:[['Effect','Frag blast'],['Best vs','Infantry in a bunch'],['Use','Thrown']],
  charge:[['Effect','Demolition'],['Best vs','Walls and objectives'],['Use','Planted, remote fuse']],
};
/* ships, vehicles and ship weapons Sweet Tooth sells: prices from the handoff §1; their data stays in the db.
   Varrondow and AutoCom craft, drones, structures and Hegemony-issue vehicles never reach her table. */
const SHIP_PRICE={talon:2200,cross:2600,graf:3200};
const SHIPWPN_PRICE={'bls-t-light-repeaters':380,'missiles':520,'door-mounted-gun':300};
const VEH_PRICE={truck:1100};   // listed, but only sellable once GVEH.truck exists (stats are a blocker: M-17)
const SHIP_SHORT={talon:'Talon',cross:'Cross',graf:'Hauler'};
const makerName=id=>{const m=(SRDB.raw.manufacturers||[]).find(x=>x.id===id);return m?m.name:'';};
const inboundShips=()=>((G.inbound||[]).filter(x=>x.kind==='ship').length);
const padFree=()=>G.fighters.length+inboundShips()<fighterCap();   // a bought ship needs a pad held for it
const shipSerial=cls=>{
  const n=G.fighters.filter(f=>f.cls===cls).length+(G.inbound||[]).filter(x=>x.kind==='ship'&&x.cls===cls).length+1;
  return (SHIP_SHORT[cls]||((SRDB.ship(cls)||{}).name||cls))+' '+n;   // the class's short name plus a number
};
/* a small deterministic RNG: the campaign seed and the week decide the stock, so a reload never rerolls */
const mulberry32=UT.mulberry32;
const marketWeek=()=>Math.floor((G.day-1)/7)+1;   // week k covers days 7k-6 .. 7k
const nyxAccess=()=>{const st=pst('nyx');return !!(st&&st.access);};
const lotPrice=l=>nyxAccess()?Math.round(l.price*0.9):l.price;   // the Regulars' discount, at display and purchase time
function rollMarket(){
  if(!G.seed)G.seed=1+Math.floor(Math.random()*0x7fffffff);   // the campaign seed (added lazily to old saves)
  const week=marketWeek();
  const r=mulberry32((G.seed^Math.imul(week,0x9E3779B9))>>>0);
  const pool=Object.keys(KIT).filter(marketable);
  const byCat=c=>pool.filter(id=>KIT[id].cat===c);
  const lots=[],taken=[];
  const pickFrom=list=>{
    const left=list.filter(id=>!taken.includes(id));
    return left.length?left[Math.floor(r()*left.length)]:null;
  };
  const swingPrice=base=>{
    const swing=0.85+r()*0.40;
    return {price:Math.max(2,Math.round(base*swing/2)*2),deal:swing<=0.95?'good':swing>=1.10?'steep':'fair'};   // base × swing, to the nearest 2
  };
  const addKit=id=>{
    if(!id)return;
    taken.push(id);
    const m=KIT[id];
    const stock=m.cat==='gadget'?2+Math.floor(r()*3):1;   // gadgets 2-4, everything else 1
    const sp=swingPrice(m.price);
    lots.push({kind:'kit',key:id,stock,price:sp.price,deal:sp.deal});
  };
  const addBig=(kind,key,base)=>{   // ships, vehicles and ship weapons: stock 1
    taken.push(key);
    const sp=swingPrice(base);
    lots.push({kind,key,stock:1,price:sp.price,deal:sp.deal});
  };
  // mercenaries: generated like any recruit (Rebel.gen with the seeded rng), the record stored in the lot
  const takenNames=new Set(G.people.map(p=>p.name));
  const addMerc=idx=>{
    const role=r()<0.7?'Soldier':'Pilot';
    const spec=Rebel.gen(role,takenNames,r);
    takenNames.add(spec.name);
    const level=2+Math.floor(r()*2);
    const sPool=role==='Soldier'?['marksman','commando','gunner','demolitions']:['leader','flighteng'];
    const specialty=r()<0.5?sPool[Math.floor(r()*sPool.length)]:null;
    const fee=380+(level-2)*140+(specialty?80:0);   // 380-600, scaled by level and specialty
    // their own kit: rolled from live, non-Hegemony weapons; it never enters the armory
    const ownKit={primary:role==='Soldier'?['akli','scatter','longiron'][Math.floor(r()*3)]:null,secondary:'cowboy'};
    const rec=Object.assign(spec,{id:'merc'+week+'x'+idx,level,xp:0,assign:'rest',injured:0,ownKit});
    if(specialty)rec.spec=specialty;
    lots.push({kind:'merc',key:rec.id,stock:1,price:fee,deal:'fair',merc:rec});
  };
  // lots 1-3: always personal kit; the first is a weapon
  addKit(pickFrom(byCat('weapon')));
  addKit(pickFrom(pool));
  addKit(pickFrom(pool));
  // lots 4-6: weighted, no duplicate keys; a category with nothing eligible rerolls. The weights are the
  // market_weights table in db.json, the highest row at or below the Revolution Level (Rev 2+ rows: M-18)
  const CATW=marketWeights(G.revLevel||1);
  const notTaken=keys=>keys.filter(k2=>!taken.includes(k2));
  const eligible=c=>
    (c==='weapon'||c==='gadget'||c==='armour')?byCat(c).filter(id=>!taken.includes(id)):
    c==='ship'?notTaken(Object.keys(SHIP_PRICE)):
    c==='shipwpn'?notTaken(Object.keys(SHIPWPN_PRICE)):
    c==='vehicle'?notTaken(Object.keys(VEH_PRICE).filter(t=>GVEH[t])):
    [];
  for(let k=0;k<3;k++){
    let id=null,cat=null,guard=0;
    while(!id&&cat!=='merc'&&guard++<40){
      let x=r()*CATW.reduce((a,b)=>a+b[1],0);
      cat=CATW[CATW.length-1][0];
      for(const [c,w] of CATW){x-=w;if(x<0){cat=c;break;}}
      if(cat==='merc')break;
      const el=eligible(cat);
      if(el.length)id=el[Math.floor(r()*el.length)];
      else cat=null;
    }
    if(cat==='merc')addMerc(k);
    else if(id&&cat==='ship')addBig('ship',id,SHIP_PRICE[id]);
    else if(id&&cat==='shipwpn')addBig('shipwpn',id,SHIPWPN_PRICE[id]);
    else if(id&&cat==='vehicle')addBig('vehicle',id,VEH_PRICE[id]);
    else addKit(id||pickFrom(pool));
  }
  G.market={week,next:week*7+1,lots,unseen:lots.length};
  bmLine=null;
  return G.market;
}
/* saves: additive only — a campaign without a market (new game or old save) rolls the current week once */
function ensureMarket(){
  if(!G)return;
  if(!G.market||!G.market.lots)rollMarket();
}
function openMarket(){
  closeWin();closeTilePop();exitRoomView();closeArsenal();
  ensureMarket();
  bmOpen=true;bmSel=null;bmLine=null;
  G.market.unseen=0;
  $('bmView').hidden=false;
  shell.classList.add('is-market');
  setDrawer(false);
  setTopbar('Black Market','Nyx Shadowport · Sweet Tooth');
  drawerLabel();
  $('bmBadge').hidden=true;
  renderMarket();syncTabs();
}
function closeMarket(){
  if(!bmOpen)return;
  bmOpen=false;bmSel=null;bmLine=null;
  $('bmView').hidden=true;
  shell.classList.remove('is-market');
  $('railMarket').hidden=true;
  setDrawer(false);
  setTopbar('Haven Rock','Hidden base');
  drawerLabel();
  bmCmdbar();syncTabs();
}
const mercBunkFree=()=>freeBunks()-((G.mercQ||[]).length)>0;   // inbound hires hold their bunks
function buyLot(i,all){
  const M=G.market,l=M&&M.lots[i];
  if(!l||l.stock<=0)return false;
  if(all&&l.stock<2)return false;
  if(l.kind==='merc'&&!mercBunkFree())return false;
  if(l.kind==='ship'&&!padFree())return false;
  const n=all?l.stock:1;
  const cost=lotPrice(l)*n;
  if(G.credits<cost)return false;
  G.credits-=cost;
  l.stock-=n;
  if(l.kind==='kit'){
    grantItem(l.key,n,'bought').src='bought';   // the whole stack reads as bought in the Arsenal dossier
    news('<b>'+esc(kitNameId(l.key))+'</b> bought. It’s in the Arsenal.','g');
  } else if(l.kind==='merc'){
    G.mercQ=G.mercQ||[];
    G.mercQ.push({rec:JSON.parse(JSON.stringify(l.merc)),fee:cost});   // the renew fee is what was actually paid
    news('<b>'+esc(l.merc.name)+'</b> signs a 14-day contract. Arrives tomorrow.','g');
  } else if(l.kind==='ship'){
    G.inbound=G.inbound||[];
    G.inbound.push({kind:'ship',cls:l.key,name:shipSerial(l.key),days:2});   // the pad stays held for it
    news('<b>'+esc((SRDB.ship(l.key)||{}).name||l.key)+'</b> is on its way from Nyx. Lands in 2 days.','g');
  } else if(l.kind==='vehicle'){
    G.inbound=G.inbound||[];
    G.inbound.push({kind:'vehicle',type:l.key,days:2});
    news('<b>'+esc((GVEH[l.key]||{}).label||l.key)+'</b> is on its way from Nyx. Arrives in 2 days.','g');
  } else if(l.kind==='shipwpn'){
    G.shipKit=G.shipKit||[];
    const e=G.shipKit.find(x=>x.id===l.key);
    if(e)e.n+=n;else G.shipKit.push({id:l.key,n});
    news('<b>'+esc((SRDB.weapon(l.key)||{}).name||l.key)+'</b> bought. It’s on the hangar racks.','g');
  }
  bmLine={k:'bought',kind:l.kind};
  saveSnap();syncUI();
  return true;
}
/* which of her lines fits the moment */
function stLine(){
  if(bmLine&&bmLine.k==='bought')return (bmLine.kind==='kit'||bmLine.kind==='shipwpn')?ST_LINES.boughtKit:bmLine.kind==='merc'?ST_LINES.hiredMerc:ST_LINES.boughtShip;
  const l=bmSel!==null&&G.market?G.market.lots[bmSel]:null;
  if(!l)return ST_LINES.greet;
  if(l.stock<=0)return ST_LINES.soldOut;
  let pitch;
  if(l.kind==='merc'){
    const m=l.merc,wk=m.ownKit.primary||m.ownKit.secondary;
    pitch=ST_LINES.mercTpl.replace(/\[First\]/g,m.first||m.name.split(' ')[0]).replace(/\[them\]/g,'them').replace(/\[they\]/g,'they').replace(/\[their\]/g,'their').replace(/\[weapon\]/g,kitNameId(wk));
    if(!mercBunkFree())return pitch+' '+ST_LINES.needBunk;   // the blocked reason lives in her line (no hint text)
  } else {
    pitch=ST_LINES.pitch[l.key]||ST_LINES.pitchCat[l.kind==='kit'?(KIT[l.key]||{}).cat:l.kind]||ST_LINES.greet;
    if(l.kind==='ship'&&!padFree())return pitch+' '+ST_LINES.needPad;
  }
  return lotPrice(l)>G.credits?pitch+' '+ST_LINES.broke:pitch;
}
/* Sweet Tooth's portrait: her art-kit character (teal headscarf with gold dots, eye patch, gold tooth and earring,
   pink jacket, always grinning) */
const ST_SPEC=SA.ARCH.sweettooth;
function stHead(){
  const ck='st:head';
  let u=artURLCache.get(ck);
  if(u===undefined){
    try{
      const c2=document.createElement('canvas');c2.width=c2.height=320;
      SA.portrait(c2.getContext('2d'),160,160,152,ST_SPEC,{t:0,face:'grin'});
      u=c2.toDataURL();
    }catch(e){u=null;}
    artURLCache.set(ck,u);
  }
  return '<span class="kf">'+(u?'<img class="bs-face" src="'+u+'" alt="">':'<span class="sr-avatar">ST</span>')+'</span>';
}
function bmCardHTML(l,i){
  const merc=l.kind==='merc'?l.merc:null;
  const m=l.kind==='kit'?(KIT[l.key]||{}):{};
  const sel=bmSel===i,sold=l.stock<=0;
  const price=lotPrice(l),short=price>G.credits;
  let cm,name,sub,well;
  if(merc){
    cm=BM_CAT.merc;name=merc.name;
    sub=merc.role+' · Level '+merc.level+(merc.spec?' · '+(SPECNAME[merc.spec]||merc.spec):'');
    well='<div class="bm-merc"><span class="kf"><span class="sr-avatar">'+faceHTML(merc)+'</span></span><div class="bm-merc__kit">'+itArt(merc.ownKit.primary||merc.ownKit.secondary)+'<span>Brings own kit</span></div></div>';
  } else if(l.kind==='ship'){
    const s=SRDB.ship(l.key)||{};
    cm=BM_CAT.ship;name=s.name||l.key;
    sub=(s.role||'Starship')+(s.manufacturer?' · '+makerName(s.manufacturer):'');
    well=shipArt(l.key);
  } else if(l.kind==='vehicle'){
    const d2=GVEH[l.key]||{};
    cm=BM_CAT.vehicle;name=d2.label||l.key;
    sub=(d2.kind==='bot'?'Bot':'Vehicle')+' · '+(d2.seats||1)+' seat'+((d2.seats||1)>1?'s':'');
    well=vehArt(l.key);
  } else if(l.kind==='shipwpn'){
    const w2=SRDB.weapon(l.key)||{};
    cm=BM_CAT.shipwpn;name=w2.name||l.key;
    sub='Ship weapon'+(w2.kind?' · '+sentence(w2.kind):'');
    well=swpnArt(l.key);
  } else {
    cm=BM_CAT[m.cat]||BM_CAT.weapon;name=kitNameId(l.key);
    sub=(m.sub||'')+(m.maker?(m.sub?' · ':'')+m.maker:'');
    well=itArt(l.key);
  }
  return '<button class="bm-card'+(sel?' is-sel':'')+(sold?' is-sold':'')+(l.kind==='ship'?' is-rare':'')+'" data-bmlot="'+i+'" aria-pressed="'+sel+'">'+
    (l.kind==='ship'?'<span class="bm-ribbon">Rare</span>':'')+
    '<div class="bm-card__top"><span class="bm-cat" style="--cc:'+cm.cc+'">'+IC(l.key==='medpack'?'patch':cm.ic)+cm.lab+'</span><span class="bm-stock">'+(sold?'Gone':'×'+l.stock)+'</span></div>'+
    '<div class="kit-well">'+well+'</div>'+
    '<div><div class="bm-name">'+esc(name)+'</div><div class="bm-sub">'+esc(sub)+'</div>'+(l.kind==='kit'?traitIcons(l.key):'')+'</div>'+
    '<div class="bm-foot"><span class="kit-price'+(short&&!sold?' is-short':'')+'">'+IC('credits')+price+(merc?'<small>/ 14 days</small>':'')+'</span><span class="kit-deal kit-deal--'+l.deal+'">'+(l.deal==='good'?'Good price':l.deal==='steep'?'Steep':'Fair')+'</span></div>'+
    (sold?'<span class="sr-stamp sr-stamp--bad bm-soldstamp">Sold</span>':'')+
    '</button>';
}
function renderMarket(){
  if(!bmOpen)return;
  ensureMarket();
  const M=G.market,w=M.week,line=stLine();
  const header='<div class="bm-head"><div class="bm-sign"><b>Sweet Tooth’s Unclaimed Goods</b></div>'+
    '<div class="bm-week"><span>This week’s stock · <b>Day '+(w*7-6)+'–'+(w*7)+'</b></span>'+wTag('Fixed until Day '+M.next,'action','lock')+'</div></div>';
  const strip='<div class="bm-strip">'+stHead()+'<p>'+line+'</p></div>';   // phones only (CSS)
  $('bmStall').innerHTML=header+strip+'<div class="bm-grid">'+M.lots.map(bmCardHTML).join('')+'</div>';
  renderBmRail(line);
  bmCmdbar();
}
function renderBmRail(line){
  const host=$('railMarket');
  if(!bmOpen){host.hidden=true;return;}
  host.hidden=false;
  const M=G.market,w=M.week,days=M.next-G.day;
  const nyx=nyxAccess();
  const pips=Array.from({length:7},(_,k)=>{const d=w*7-6+k;return '<i class="'+(d===G.day?'is-now':d<G.day?'is-on':'')+'"></i>';}).join('');
  host.innerHTML='<section class="bm-fence">'+stHead()+
    '<div><div class="bm-fence__name">Sweet Tooth</div><div class="bm-fence__role">Fence · Nyx Shadowport</div></div>'+
    '<div class="bm-say" id="bmSay">'+line+'</div>'+
    '<div class="bm-box"><div class="bm-restock"><i class="bm-restock__n">'+days+'</i><div><b>Days to new stock</b><span>Stock will be replaced at refresh</span></div></div><div class="kit-pips">'+pips+'</div></div>'+
    '<div class="bm-perk'+(nyx?' is-on':'')+'">'+IC(nyx?'check':'lock')+'<span><b>Regulars’ discount: 10% off.</b> '+(nyx?'Access to Nyx Shadowport — prices shown with the discount.':'Get Access to Nyx Shadowport.')+'</span></div>'+
    '</section>';
}
/* the command bar: lot stats where the Arsenal shows a hint; affordability is the red price + a disabled order */
function lotStats(l){
  const m=KIT[l.key]||{};
  const st=[];
  if(l.kind==='merc'){
    const mr=l.merc;
    st.push(['Level',String(mr.level)]);
    st.push(['Specialty',mr.spec?(SPECNAME[mr.spec]||mr.spec):'None']);
    st.push(['Kit','Brings own']);
  } else if(l.kind==='ship'){
    const s=SRDB.ship(l.key)||{};
    st.push(['Hull',String(s.hull||'?')]);
    st.push(['Shields',(s.shield_front||0)+'F / '+(s.shield_rear||0)+'A']);
    st.push(['Speed',String(s.straight_max||'?')]);   // top straight speed
  } else if(l.kind==='vehicle'){
    const d2=GVEH[l.key]||{};
    st.push(['Health',String(d2.hp||'?')]);
    st.push(['Seats',d2.kind==='bot'?'Drives itself':String(d2.seats||1)]);
    st.push(['Role',d2.kind==='bot'?'Bot':'Vehicle']);
  } else if(l.kind==='shipwpn'){
    const w2=SRDB.weapon(l.key)||{};
    st.push(['Damage',(w2.damage_min||'?')+'–'+(w2.damage_max||'?')]);
    st.push(['Ammo',w2.ammo?String(w2.ammo):'Unlimited']);
    st.push(['Kind',sentence(w2.kind||'ship weapon')]);
  } else if(m.cat==='weapon'){
    const wp=Items.get(l.key);
    if(wp&&wp.damage_min!=null){
      st.push(['Damage',wp.damage_min+'–'+wp.damage_max]);
      st.push(['Range',wp.range<300?'Short':wp.range<500?'Medium':wp.range<800?'Long':'Very long']);
      st.push(['Shots',wp.shots+(wp.jams?', can jam':'')]);
    }
  } else if(m.cat==='armour'){
    st.push(['Armour',m.arm?String(m.arm):'None — style']);
    st.push(['Slot',m.slot==='head'?'Head':'Body']);
  } else {
    for(const row of BM_GSTATS[l.key]||[])st.push(row);
  }
  return st.map(x=>'<div><span>'+x[0]+'</span><b>'+esc(x[1])+'</b></div>').join('');
}
function bmCmdbar(){
  if(arOpen)return;
  const who=$('arWho'),orders=$('arOrders');
  const l=bmOpen&&bmSel!==null&&G.market?G.market.lots[bmSel]:null;
  if(!l){if(!arOpen){who.hidden=true;orders.hidden=true;who.innerHTML='';orders.innerHTML='';}return;}
  const merc=l.kind==='merc'?l.merc:null;
  const price=lotPrice(l),sold=l.stock<=0;
  const whyBuy=sold?'Sold out':merc&&!mercBunkFree()?'Needs a free bunk':l.kind==='ship'&&!padFree()?'Needs a free landing pad':G.credits<price?'Need '+Math.ceil(price-G.credits)+' more credits':'';
  const allCost=price*l.stock;
  const whyAll=sold?'Sold out':l.stock<2?'Only one in the lot':G.credits<allCost?'Need '+Math.ceil(allCost-G.credits)+' more credits':'';
  const lead=merc?'<span class="kf kit-who" style="width:40px;height:40px"><span class="sr-avatar">'+faceHTML(merc)+'</span></span>'
    :l.kind==='ship'?shipArt(l.key,'kit-who-art')
    :l.kind==='vehicle'?vehArt(l.key,'kit-who-art')
    :l.kind==='shipwpn'?swpnArt(l.key,'kit-who-art')
    :itArt(l.key,'kit-who-art');
  const bmName=merc?merc.name:l.kind==='ship'?((SRDB.ship(l.key)||{}).name||l.key):l.kind==='vehicle'?((GVEH[l.key]||{}).label||l.key):l.kind==='shipwpn'?((SRDB.weapon(l.key)||{}).name||l.key):kitNameId(l.key);
  who.innerHTML=lead+'<div><div class="sr-cmdbar__name">'+esc(bmName)+'</div><div class="kit-cstats">'+lotStats(l)+'</div></div>';
  orders.innerHTML=cmdOrder(1,'credits',merc?'Hire':'Buy','data-bmbuy',!!whyBuy,whyBuy)+cmdOrder(2,'loot','Buy all','data-bmbuyall',!!whyAll,whyAll);
  who.hidden=false;orders.hidden=false;
}
$('bmView').addEventListener('click',ev=>{
  const t=ev.target.closest('button');
  if(!t)return;
  const lot=t.getAttribute('data-bmlot');
  if(lot!==null){sClick();bmSel=+lot;bmLine=null;renderMarket();}
});
/* phones re-pick their column counts when the viewport changes */
addEventListener('resize',()=>{if(arOpen)renderArsenal();if(bmOpen)renderMarket();});

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
  if(baseView==='galaxy'){
    hoverCell=null;
    cv.style.cursor=(!gxWorld&&gxHitL.some(h=>Math.hypot(px-h.x,py-h.y)<h.r))||gxWorldHover(px,py)?'pointer':'default';
    return;
  }
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
  if(baseView==='galaxy'){
    const r=cv.getBoundingClientRect();
    const px=ev.clientX-r.left,py=ev.clientY-r.top;
    sClick();
    if(gxWorld){gxWorldClick(px,py);return;}
    let best=null,bd=1e9;
    const pri={o:0,s:1,p:2};
    for(const h of gxHitL){
      const d2=Math.hypot(px-h.x,py-h.y);
      if(d2<h.r){const score=pri[h.t]*1000+d2;if(score<bd){bd=score;best=h;}}
    }
    if(!best){if(srcSel){srcSel=null;syncUI();}return;}
    if(best.t==='o'){openOpp(best.id);return;}
    if(best.t==='s'){srcSel={t:'s',id:best.id};cutArm=null;syncUI();return;}
    const st=pst(best.id);
    if(st&&st.access)enterWorld(best.id,best.x,best.y);
    else{srcSel={t:'p',id:best.id};syncUI();}
    return;
  }
  if(viewRoom){
    const r=cv.getBoundingClientRect();
    const f=figAt(ev.clientX-r.left,ev.clientY-r.top);
    if(f){
      sClick();
      const key='fig:'+(f.pid||f.fid),now=performance.now();
      if(lastTap.key===key&&now-lastTap.t<380){
        lastTap={key:null,t:0};
        if(f.fid){const sh=G.fighters.find(x=>x.id===f.fid);if(sh)openWin('ship',sh);}
        else{const p=G.people.find(x=>x.id===f.pid);if(p)openWin('person',p);}
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
  if(open==='gear'){closeTilePop();openArsenal();return;}   // the Gear Grid window became the Arsenal tab
  if(open==='sources'){closeTilePop();showView('galaxy');return;}   // the Source Network window became the Galaxy view
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
  if(open==='gear'){openArsenal();return;}   // the Gear Grid window became the Arsenal tab
  if(open==='sources'){exitRoomView();showView('galaxy');return;}   // the Source Network window became the Galaxy view
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
  if(t.hasAttribute('data-srctut-done')||t.hasAttribute('data-tut-close')){closeWin();return;}
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
    const i=+t.getAttribute('data-rec-accept')||0,card=winArg.cards[i];
    if(!card)return;
    const {p,must}=card;
    if(bunksUsed()>=bunkCap()&&!must){news('No bunks free. '+p.name+' can’t stay.','h');syncUI();return;}
    if(p.id&&p.id.indexOf('rec')===0&&p.id.indexOf('rcb')!==0)G.recruitN++;
    p.joined=G.day;
    G.people.push(Rebel.migrate(p));mood();autoEquip();
    G.recWait=G.recWait.filter(x=>x!==p);
    if(Rebel.has(p,'wealthy')){G.credits+=250;news('<b>'+p.name+'</b> arrives with family money: '+C(250)+' into the war chest.','g');}
    if(p.id==='sera')G.onboard='crossready';
    news('<b>'+p.name+'</b> ('+p.role+') takes the oath. One more of us.','g');
    winArg.cards.splice(i,1);
    if(!winArg.cards.length)closeWin();
    sBuild();saveSnap();syncUI();
    return;
  }
  if(t.hasAttribute('data-rec-no')&&winMode==='recruit'){
    const i=+t.getAttribute('data-rec-no')||0,card=winArg.cards[i];
    if(!card)return;
    news('You passed on '+card.p.name+'. They never knew.','d');
    G.recWait=G.recWait.filter(x=>x!==card.p);
    winArg.cards.splice(i,1);
    if(!winArg.cards.length)closeWin();
    saveSnap();syncUI();
    return;
  }
  if(t.hasAttribute('data-rec-later')&&winMode==='recruit'){
    if(!winArg.batch)for(const c of winArg.cards)news('You passed on '+c.p.name+'. They never knew.','d');
    closeWin();syncUI();return;
  }
  if(t.hasAttribute('data-recruit-start')){startRecruit();if(viewRoom)renderRoomBar();renderTilePop();return;}
  if(t.hasAttribute('data-recruit-review')){
    if(G.recWait.length){closeTilePop();openWin('recruit',{cards:G.recWait.map(p=>({p})),batch:true});}
    return;
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
  const dipBtn=t.getAttribute('data-dip');
  if(dipBtn){startDip(dipBtn);saveSnap();syncUI();renderWin();return;}
  if(t.hasAttribute('data-rank-open')){rankOverlay=t.getAttribute('data-rank-open');sClick();renderWin();return;}
  if(t.hasAttribute('data-rank-close')){rankOverlay=null;gearOverlay=null;renderWin();return;}
  if(t.hasAttribute('data-gear-slot')){
    const [pid,k,i]=t.getAttribute('data-gear-slot').split(':');
    gearOverlay={pid,k,i:+i};sClick();renderWin();return;
  }
  if(t.hasAttribute('data-gear-pick')){
    const [pid,k,i,id]=t.getAttribute('data-gear-pick').split(':');
    applyGearPick(pid,k,i,id);
    gearOverlay=null;syncUI();renderWin();return;
  }
  const prosId=t.getAttribute('data-pros');
  if(prosId){const [pid,part]=prosId.split(':');if(startProsthetic(pid,part)){if(viewRoom)renderRoomBar();}return;}
  const mr=t.getAttribute('data-mercrenew');
  if(mr){
    const p=G.people.find(x=>x.id===mr);
    if(p&&p.merc&&G.credits>=p.merc.fee){
      G.credits-=p.merc.fee;
      p.merc.until=G.day+14;
      Rebel.moraleBump(p,4,'misc');mood();   // pay lands: mercs follow the money
      news('<b>'+p.name+'</b> signs on for another 14 days. '+C(p.merc.fee)+' changes hands.','g');
      closeWin();saveSnap();syncUI();
    }
    return;
  }
  const mg=t.getAttribute('data-mercgo');
  if(mg){
    const p=G.people.find(x=>x.id===mg);
    if(p&&p.merc){
      G.people=G.people.filter(x=>x!==p);
      mood();reconcileGear();
      news('<b>'+p.name+'</b> collects the balance and walks to the pad. The kit goes with them.','d');
      closeWin();saveSnap();syncUI();
    }
    return;
  }
  const mj=t.getAttribute('data-mercjoin');
  if(mj){
    const p=G.people.find(x=>x.id===mj);
    if(p&&p.merc&&(p.merc.missions||0)>=3&&(p.morale||0)>=70){
      delete p.merc;
      const own=p.ownKit||{};
      p.ownKit=null;
      for(const k of ['primary','secondary'])if(own[k])grantItem(own[k],1,'gift');   // their kit joins the armory
      Rebel.moraleBump(p,6,'misc');mood();autoEquip();
      news('<b>'+p.name+'</b> tears up the contract. No fee, no clock — one of us now.','g');
      closeWin();saveSnap();syncUI();
    }
    return;
  }
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
  if(t.hasAttribute('data-visithangar')){
    const hg=G.rooms.find(r=>r.key==='hangar');
    closeWin();
    if(hg)enterRoomView(hg);
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
    if(p&&!laidUp(p)&&p.assign!=='mission'){p.assign=mode;syncUI();}
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
      const f=G.fighters.find(x=>x.id===fr.getAttribute('data-fighter'));
      if(f)openWin('ship',f);
    }
    return;
  }
  lastTap={key,t:now};
});
$('navBase').addEventListener('click',()=>{
  sClick();
  if(arOpen){closeArsenal();return;}
  if(bmOpen){closeMarket();return;}
  if(winMode)closeWin();
  showView('base');
});
$('navSources').addEventListener('click',()=>{sClick();closeArsenal();closeMarket();if(winMode)closeWin();showView('galaxy');});
$('navMissions').addEventListener('click',()=>{sClick();closeArsenal();closeMarket();openWin('missions');});
$('navArsenal').addEventListener('click',()=>{sClick();if(baseView!=='base')showView('base');openArsenal();});
$('navMarket').addEventListener('click',()=>{sClick();if(baseView!=='base')showView('base');openMarket();});
$('newsBtn').addEventListener('click',()=>{sClick();openWin('news');});
$('dayBtn').addEventListener('click',()=>{if(started)advanceDay();});
/* phones: the rail is a drawer behind the people tab */
const shell=ROOT.querySelector('.sr-shell');
function setDrawer(on){shell.classList.toggle('is-drawer-open',!!on);$('drawerBtn').setAttribute('aria-expanded',String(!!on));}
$('drawerBtn').addEventListener('click',()=>{sClick();setDrawer(!shell.classList.contains('is-drawer-open'));});
/* top-bar menu: all news, sound, restart (which asks first) */
HUD.tips(ROOT);   // the kit's floating tooltip for every [data-tip] (the galaxy orders' rules and reasons)
/* the topbar menu: the kit's (toggle, outside press, Esc and item picks close it) */
const menu=$('baseMenu');
HUD.menuBind(menu,$('menuBtn'));
SR.settings.bind(menu);   // screen shake and blood (art handoff: Juice)
$('menuBtn').addEventListener('click',sClick);
function closeMenu(){menu.hidden=true;$('menuBtn').setAttribute('aria-expanded','false');}
$('menuNews').addEventListener('click',()=>{sClick();openWin('news');});
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
    const kw=HUD.topWin(ROOT);if(kw){kw.querySelector('[data-close]').click();return;}   // a kit dialog (the restart question)
    if(rankOverlay||gearOverlay){rankOverlay=null;gearOverlay=null;renderWin();return;}
    if(!winMode&&arOpen&&(arOverlay||arGive||arRefit)){arOverlay=null;arGive=false;arRefit=null;renderArsenal();return;}
    if(winMode)closeWin();
    else if(shell.classList.contains('is-drawer-open'))setDrawer(false);
    else if(arOpen)closeArsenal();
    else if(bmOpen)closeMarket();
    else if(baseView==='galaxy'&&(gxRegion||gxWorld||srcSel))gxBack();
    else if(viewRoom){exitRoomView();syncUI();}
    else closeTilePop();
    return;
  }
  // Arsenal / Black Market: keys 1-2 press the command-bar orders
  if((arOpen||bmOpen)&&!winMode&&!arOverlay&&!arGive&&!arRefit&&/^[12]$/.test(ev.key)&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){
    const btn=[...$('arOrders').querySelectorAll('.sr-order')][+ev.key-1];
    if(btn&&!btn.disabled){ev.preventDefault();btn.click();}
    return;
  }
  // Enter presses the window's gold button
  if(winMode&&ev.key==='Enter'&&!(document.activeElement&&/^(BUTTON|A|INPUT)$/.test(document.activeElement.tagName))){
    const pb=$('winCardB').querySelector('.sr-window__foot .sr-btn--primary:not(:disabled)');
    if(pb){ev.preventDefault();pb.click();}
    return;
  }
  // 1-9 drive the galaxy command bar
  if(!winMode&&baseView==='galaxy'&&/^[1-9]$/.test(ev.key)&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){
    const b=[...$('gxOrders').querySelectorAll('.sr-order')].find(x=>{const k=x.querySelector('.sr-order__key');return k&&k.textContent===ev.key&&!x.disabled;});
    if(b){ev.preventDefault();b.click();}
    return;
  }
  // 1-4 pick dialogue answers
  if(winMode&&/^[1-4]$/.test(ev.key)&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){
    const opts=[...$('winCardB').querySelectorAll('.sr-choice')];
    const b=opts[+ev.key-1];
    if(b&&!b.disabled){ev.preventDefault();b.click();}
  }
});
/* Restart asks first (the kit's confirm window), then erases the save and starts the war again */
$('restartBtn').addEventListener('click',()=>{
  if(!started)return;
  HUD.confirm(ROOT.querySelector('.sr-stage'),{id:'bsRestart',title:'Restart the campaign?',danger:true,ok:'Restart',cancel:'Keep playing',   // in the stage, like the base's own windows
    body:'This erases your save: Haven Rock, every rebel and every day so far. The war starts again from the first mission.',
    onOk:restartCampaign,onClose:updateGuide});
  updateGuide();
});
function restartCampaign(){
  SR.wipeSave();
  G=newGame();closeWin();closeTilePop();exitRoomView();
  comms.clear();lastRes=null;lastRenown=null;
  started=false;
  launchIntro();
}
function introSpec(){
  const soldiers=G.people.filter(p=>p.role==='Soldier').slice(0,3);
  return {kind:'ground',missionId:'haven',scenario:'haven',days:0,
    squad:soldiers.map(p=>squadEntry(p,false))};
}
function launchIntro(){
  closeWin();closeTilePop();
  SR.mission=introSpec();
  SR.transition('iris',{},()=>SR.go('ground',{mission:SR.mission}));
}
/* BASE ESTABLISHED splash (A6): dims the base scene after the prologue win, then hands over to Cass.
   While it is up, the day banner, queued reports and the guided pointer all hold. */
let estTO=null;
function showEstSplash(){
  const el=$('estSplash');
  el.hidden=false;el.classList.remove('is-out');
  clearTimeout(estTO);
  estTO=setTimeout(closeEstSplash,RM?1000:2400);
}
function closeEstSplash(){
  const el=$('estSplash');
  if(el.hidden)return;
  clearTimeout(estTO);
  el.classList.add('is-out');
  setTimeout(()=>{el.classList.remove('is-out');el.hidden=true;openWin('cassIntro');},RM?0:400);
}
$('estSplash').addEventListener('click',closeEstSplash);
function discoverCass(){
  if(G.sources.some(s=>s.id==='cass'))return;
  addStorySource('cass');
  if(G.onboard==='intro'||G.onboard===undefined)G.onboard='contact';
}
function seedNews(){
  news('Haven Rock is powered, pressurized, and off every chart. We’re well hidden from the Hegemony here.','g');
  news('Inventory logged: six Aklis, four Cowboys, four Med Packs, one derelict hauler in the cave.','d');
  news('First contact on the wire: <b>Cass Wender</b>, the smuggler who flew us in.','a');
}

/* ---------- leading missions in person ---------- */
function ablePilots(){return G.people.filter(p=>isFlyer(p)&&!offDuty(p)&&p.assign!=='mission'&&p.assign!=='spec'&&!Rebel.expHas(p,'grieving'));}
function grafReady(){return G.fighters.some(f=>f.cls==='graf'&&!f.out&&f.hull>=60);}
/* ---------- mission requirements & the planning board ---------- */
function reqOf(m){return m.req||MTYPES[typeOf(m)].req(m);}
function soldierPool(){return G.people.filter(p=>isGround(p)&&!offDuty(p)&&p.assign!=='mission'&&p.assign!=='spec'&&!Rebel.expHas(p,'grieving'));}
function transportPool(){return G.fighters.filter(f=>SEATS[f.cls]&&!f.out&&f.hull>=60);}
function shipPool(r){return G.fighters.filter(f=>!f.out&&f.hull>=60&&(!r.starfighter||!SEATS[f.cls]));}
function transportSlots(r){return Math.ceil(r.team/SEATS.graf);}
function minFuel(m){
  const r=reqOf(m);
  const costs=(r.transport?transportPool():shipPool(r)).map(fuelOf).sort((a,b)=>a-b);
  const n=r.transport?transportSlots(r):(r.ships||r.team);
  return costs.slice(0,n).reduce((a,b)=>a+b,0)||fuelPer('cross')*n;
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
const ridPre=acc=>(acc==='soldier'||acc==='rsoldier'||acc==='pilot'||acc==='apilot')?'p:':acc==='gveh'?'v:':'f:';
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
    if((G.vehicles||[]).length)PL.slots.push({key:'gv0',acc:'gveh',label:'Vehicle or Bot',opt:true});
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
  if(kind==='v'||slot.acc==='gveh')return kind==='v'&&slot.acc==='gveh'&&vehPool().some(v=>v.id===id);
  if(kind==='p'){
    const p=G.people.find(x=>x.id===id);if(!p)return false;
    return (slot.acc==='soldier'||slot.acc==='rsoldier')?isGround(p):(slot.acc==='pilot'||slot.acc==='apilot')?isFlyer(p):false;
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
      const p=G.people.find(x=>x.role==='Pilot'&&x.ship===id&&!laidUp(x)&&x.assign!=='mission');
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
/* a spare transport can reinforce (up to its seats, filling them is optional); a starfighter strafes; a transport with a door gun can be a door gunner */
function plAssetMode(i){
  const f=G.fighters.find(x=>x.id===PL.v['as'+i+'s']);
  if(!f)return null;
  if(!SEATS[f.cls])return 'strafe';
  return PL.assets[i].mode==='doorgun'&&!hasDoorGun(f)?'reinforce':PL.assets[i].mode;
}
function plSyncAssets(){
  PL.assets.forEach((a,i)=>{
    const want=plAssetMode(i)==='reinforce';
    const has=PL.slots.some(sl=>sl.key==='as'+i+'r0');
    const af=G.fighters.find(x=>x.id===PL.v['as'+i+'s']);
    if(want&&!has)for(let k=0;k<(af?SEATS[af.cls]||0:0);k++)PL.slots.push({key:'as'+i+'r'+k,acc:'rsoldier',label:'Reinforcement '+(k+1),opt:true});
    if(!want&&has){
      PL.slots=PL.slots.filter(sl=>!sl.key.startsWith('as'+i+'r'));
      for(const k of Object.keys(PL.v))if(k.startsWith('as'+i+'r'))delete PL.v[k];
    }
  });
}
const plDropOk=()=>!PL.drop||G.supplies>=DROP_COST;
function plComplete(){return PL.slots.every(sl=>PL.v[sl.key]||sl.opt)&&plSpecOk();}
function plFuel(){
  let t=0;
  for(const sl of PL.slots)if(sl.acc==='vehicle'||sl.acc==='ship'||sl.acc==='assetship'){const f=G.fighters.find(x=>x.id===PL.v[sl.key]);if(f)t+=fuelOf(f);}
  return t;
}
function plAutoFill(){
  for(const k of Object.keys(PL.v))if(!/^as/.test(k))delete PL.v[k];
  const m=PL.m;
  for(const sl of PL.slots){
    if(PL.v[sl.key]||/^as/.test(sl.key)||sl.acc==='gveh')continue;
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
const personAvatar=p=>'<span class="sr-avatar'+(p.role==='Pilot'||p.role==='Hero'?' sr-avatar--pilot':'')+'">'+faceHTML(p)+'</span>';
const personSub=p=>rankFor(p)+', level '+p.level+(p.spec?' · '+specOf(p):'');
const shipSub=f=>SRDB.ship(f.cls).name;
const vehAvatar=()=>'<span class="sr-avatar" style="--c:var(--sr-gold)">'+IC('vehicle')+'</span>';
const vehSub=v=>gvehOf(v).label+' \u00b7 '+(gvehOf(v).kind==='bot'?'Bot':'vehicle, '+gvehOf(v).seats+' seat'+(gvehOf(v).seats>1?'s':''))+' \u00b7 '+Math.round(v.hp)+'%';
/* a filled slot: avatar, label, name, a line of detail */
function slotOccHTML(sl){
  const id=PL.v[sl.key];
  if(!id)return null;
  if(sl.acc==='gveh'){
    const v=G.vehicles.find(x=>x.id===id);
    return vehAvatar()+'<span><span class="sr-slot__label">'+sl.label+'</span><span class="sr-slot__name">'+v.name+'</span><span class="bs-sub">'+vehSub(v)+'</span></span>';
  }
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
  if(kind==='v'){
    const v=G.vehicles.find(x=>x.id===id);
    return '<div class="sr-unit" role="button" tabindex="0" draggable="true" data-rid="'+rid+'" style="--c:var(--sr-gold)">'+vehAvatar()+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+v.name+'</span><span class="sr-unit__role">'+vehSub(v)+'</span></span></div>';
  }
  if(kind==='f'){
    const f=G.fighters.find(x=>x.id===id);
    return '<div class="sr-unit" role="button" tabindex="0" draggable="true" data-rid="'+rid+'" style="--c:var(--sr-shield)">'+shipAvatar()+
      '<span class="sr-unit__main"><span class="sr-unit__name">'+f.name+'</span><span class="sr-unit__role">'+shipSub(f)+'</span></span><span class="sr-unit__side">'+F(fuelOf(f))+'</span></div>';
  }
  const p=G.people.find(x=>x.id===id);
  return '<div class="sr-unit" role="button" tabindex="0" draggable="true" data-rid="'+rid+'"'+(p.role==='Pilot'||p.role==='Hero'?' style="--c:var(--sr-gold)"':'')+'>'+personAvatar(p)+
    '<span class="sr-unit__main"><span class="sr-unit__name">'+p.name+'</span><span class="sr-unit__role">'+personSub(p)+'</span></span><span class="sr-unit__side">'+(restTag(p)||'<span class="sr-tag sr-tag--friend">Available</span>')+'</span></div>';
}
/* people who can't go right now stay on the list, greyed, with the reason */
function offHTML(p){
  const why=laidUp(p)?'Injured, '+outDays(p)+' day'+(outDays(p)>1?'s':''):conked(p)?'Conked out, '+Rebel.restDays(p)+' day'+(Rebel.restDays(p)>1?'s':''):p.assign==='mission'?'On mission':p.assign==='spec'?'Training':Rebel.expHas(p,'grieving')?'Grieving':'';
  return '<div class="sr-unit is-down"'+(p.role==='Pilot'||p.role==='Hero'?' style="--c:var(--sr-gold)"':'')+'>'+personAvatar(p)+
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
  const soldiersAll=G.people.filter(isGround),pilotsAll=G.people.filter(isFlyer);
  const roster='<div class="sr-h3">Roster</div><div class="sr-stack">'+
    (r.transport?'<span class="bs-rh">Soldiers</span>'+avail(soldierPool(),'p:')+away(soldiersAll.filter(p=>!soldierPool().includes(p)&&(offDuty(p)||p.assign==='mission'||p.assign==='spec'))):'')+
    '<span class="bs-rh">Pilots</span>'+avail(ablePilots(),'p:')+away(pilotsAll.filter(p=>!ablePilots().includes(p)&&(offDuty(p)||p.assign==='mission'||p.assign==='spec')))+
    '<span class="bs-rh">'+(r.transport?'Transports':'Ships')+'</span>'+avail(r.transport?transportPool():shipPool(r),'f:')+
    (PL.assets.length?'<span class="bs-rh">Support ships</span>'+avail(G.fighters.filter(f=>!f.out&&f.hull>=60),'f:'):'')+
    (r.transport&&(G.vehicles||[]).length?'<span class="bs-rh">Vehicles and Bots</span>'+avail(vehPool(),'v:'):'')+
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
  const empty=PL.slots.filter(sl=>!PL.v[sl.key]&&!sl.opt).length;
  const note=plComplete()?'Fuel burned: '+F(fuel,G.fuel<fuel)+' of '+Math.floor(G.fuel):(PL.slots.every(sl=>PL.v[sl.key]||sl.opt)&&!plSpecOk()?'The team needs a '+PL.req.spec.label+'.':'Fill every slot to go. '+empty+' slot'+(empty>1?'s':'')+' empty.');
  const needHangar=r.transport&&!grafReady()&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring;
  return wHead('Plan: '+m.name,{tags:opTag(m)+riskTag(m)+wTag(m.days+' day'+(m.days>1?'s':''),'action')})+
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
    const af=G.fighters.find(x=>x.id===PL.v['as'+i+'s']),gun=!!af&&hasDoorGun(af),cap=af?SEATS[af.cls]||0:0;
    h+=PL.slots.filter(sl=>sl.key.startsWith('as'+i)).map(slotHTML).join('');
    if(mode)h+=(mode==='strafe'?'<p class="sr-fine" style="margin:0">Strafing Run: a starfighter rakes a line of the battlefield.</p>':
      '<div class="bs-chips">'+(gun?rbtn('data-assetmode="'+i+':doorgun" aria-pressed="'+(mode==='doorgun')+'"','Door Gunner',false,'sr-btn--sm'):'')+rbtn('data-assetmode="'+i+':reinforce" aria-pressed="'+(mode==='reinforce')+'"','Reinforcements',false,'sr-btn--sm')+'</div>'+
      '<p class="sr-fine" style="margin:0">'+(mode==='doorgun'?'Circles for two rounds and rakes up to three enemies a round.':'Lands up to '+cap+' more soldier'+(cap===1?'':'s')+' where you call it (fill as many seats as you like).')+(gun?'':' No Door Mounted Gun fitted, so no door gunner.')+'</p>');
  });
  {const gv=PL.slots.filter(sl=>sl.acc==='gveh');
   if(gv.length)h+=gv.map(slotHTML).join('')+'<p class="sr-fine" style="margin:0">Adds <b>Deploy</b> to the Fire Support menu: once the shooting starts, call it down where you can see. A vehicle needs someone to get in it, a Bot drives itself.</p>';}
  h+='<div class="bs-chips">'+(PL.assets.length<2&&G.fighters.filter(f=>!f.out&&f.hull>=60).length>1?rbtn('data-addasset','+ Support ship',false,'sr-btn--sm'):'')+(PL.assets.length?rbtn('data-rmasset','Remove last',false,'sr-btn--sm'):'')+'</div></div>';
  return h;
}
function squadEntry(p,scatterFirst){
  return {id:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,spec:p.spec,art:p.auto?undefined:SA.lookOf(p),tr:Rebel.keys(p),rels:(p.traits||[]).filter(t=>t.with&&BOND_KINDS.indexOf(t.k)>=0).map(t=>[t.k,t.with]),hero:p.role==='Hero'?1:0,
    aim:p.auto?soldierAim(p):Math.max(0,soldierAim(p)+Rebel.injFx(p).aim+Rebel.wearyFx(p).aim),hp:p.auto?autoOf(p).hp:Math.round(Rebel.hpOf(p)*(1+Rebel.injFx(p).hpPct)),agi:p.auto?1:Rebel.moveMul(p)*Rebel.injFx(p).spd,nv:p.auto?1:Rebel.nerveMul(p),cool:p.auto?undefined:Math.max(15,Rebel.coolOf(p,'g')+Rebel.injFx(p).cool+Rebel.wearyFx(p).cool),nosprint:p.auto?0:Rebel.injFx(p).nosprint,oneHand:p.auto?0:Rebel.injFx(p).oneHand,cview:p.auto?0:Rebel.injFx(p).view,def:p.auto?autoOf(p).def:undefined,big:p.auto?autoOf(p).big:0,heavy:p.auto?autoOf(p).heavy:0,autoType:p.auto?autoKey(p):undefined,
    meds:p.auto?0:packsCarried(p),
    /* head and body kit give the armour bar in a fight (Items.protection); an Auto brings its own shell */
    head:p.auto?undefined:(p.gear||{}).head||undefined,body:p.auto?undefined:(p.gear||{}).body||undefined,arm:p.auto?autoOf(p).arm:undefined,
    back:p.auto?undefined:(p.gear||{}).back||undefined,
    wpns:p.auto?[autoOf(p).wpn]:wpnsFromGear(p)};
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
    const reinforce=[];PL.assets.forEach((a,k)=>{if(plAssetMode(k)!=='reinforce')return;const f=G.fighters.find(x=>x.id===PL.v['as'+k+'s']);
      for(let q=0;q<((f&&SEATS[f.cls])||0);q++){const rp=G.people.find(x=>x.id===PL.v['as'+k+'r'+q]);if(rp)reinforce.push(rp);}});
    outfitSquad(squad.concat(reinforce,prize?[prize]:[]));
    squadTension(squad);
    G.nadesOut=nadesCarried(squad);
    G.fuel-=fuel;
    if(PL.drop)G.supplies-=DROP_COST;
    SR.mission={kind:'ground',missionId:m.id,scenario:m.scenario,days:missionDays(m),nades:nadesCarried(squad),
      charges:(PL.req.items||[]).some(i=>i.ids)?Math.min(1,((G.armory.find(a=>a.id==='charge')||{}).n)||0):((PL.req.items||[]).find(i=>i.id==='charge')||{}).n||0,
      limpets:(PL.req.items||[]).some(i=>i.ids)?Math.min(1,((G.armory.find(a=>a.id==='limpet')||{}).n)||0):0,
      vip:m.vip||(m.npc?{name:m.npc.name,first:m.npc.first}:undefined),
      sec:m.ctx?m.ctx.sec:undefined,
      ctx:m.ctx?{title:m.name,place:m.ctx.place,target:m.ctx.target,variant:m.region,
        sub:m.ctx.place+' \u00b7 '+m.ctx.locName+' \u2014 Revolution I',
        eyebrow:'Ground Operation \u00b7 '+m.ctx.place+', '+m.ctx.locName,flavour:m.desc}:undefined,
      squad:squad.map(p=>{const e=squadEntry(p,false);if(Rebel.expHas(p,'mspec',m.tid||m.id))e.ms=1;return e;}),
      assets:{drop:PL.drop,ships:PL.assets.map((a,k)=>{
        const f=G.fighters.find(x=>x.id===PL.v['as'+k+'s']),pl=G.people.find(x=>x.id===PL.v['as'+k+'p']);
        const mode=plAssetMode(k);
        return {cls:f.cls,name:f.name,mode,pilot:{name:pl.name,first:pl.name.split(' ')[0]},
          soldiers:mode==='reinforce'?Array.from({length:SEATS[f.cls]||0},(_,q)=>G.people.find(x=>x.id===PL.v['as'+k+'r'+q])).filter(Boolean).map(p=>squadEntry(p,false)):[]};
      }),vehicles:PL.slots.filter(sl=>sl.acc==='gveh'&&PL.v[sl.key]).map(sl=>{
        const v=G.vehicles.find(x=>x.id===PL.v[sl.key]),d=gvehOf(v);
        return {id:v.id,name:v.name,first:v.name.split(' ')[0],type:v.type,kind:d.kind,hp:Math.max(1,Math.round((d.hp||100)*v.hp/100)),maxhp:d.hp||100,hpPct:v.hp,def:d.def,arm:d.arm,aim:d.aim,wpn:d.wpn,big:d.big};
      })},
      pilot:prize?{id:prize.id,name:prize.name,first:prize.name.split(' ')[0],level:prize.level,wpns:wpnsFromGear(prize),art:SA.lookOf(prize)}:undefined,
      grafPilot:{id:grafPilot.id,name:grafPilot.name,first:grafPilot.name.split(' ')[0]}};
  } else {
    const flight=[];
    for(const sl of PL.slots.filter(x=>x.acc==='pilot')){
      const p=G.people.find(x=>x.id===PL.v[sl.key]),f=G.fighters.find(x=>x.id===PL.v['rs'+sl.key.slice(2)]);
      flight.push({pilotId:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,art:SA.lookOf(p),
        rankName:rankFor(p),hero:p.role==='Hero'?1:0,skills:pilotSkills(p),aimMod:pilotAimMod(p),init:pilotInit(p),
        cool:Math.max(15,Rebel.coolOf(p,'s')+Rebel.injFx(p).cool),cun:Rebel.cunMul(p),nv:Rebel.nerveMul(p),
        tr:Rebel.traitsFor(p,'s'),
        cls:f.cls,fighterId:f.id,fighterName:f.name,hull:f.hull,loadout:f.loadout});
    }
    G.fuel-=fuel;
    SR.mission={kind:'space',missionId:m.id,days:missionDays(m),flight};
  }
  // the scene is not saved: if the page reloads mid-mission, restoreCampaign hands this back
  G.sortie={name:m.name,f:fuel,s:(PL.req.transport&&PL.drop)?DROP_COST:0};
  closeWin();closeTilePop();
  saveSnap();
  // into a ground mission through an iris on the target; out to a space fight through hyperspace
  const cvr=cv.getBoundingClientRect();
  SR.transition(PL.req.transport?'iris':'hyperspace',{x:cvr.left+cvr.width/2,y:cvr.top+cvr.height/2},()=>SR.go(PL.req.transport?'ground':'space',{mission:SR.mission}));
}
function soldierAim(p){return Math.min(6,Rebel.aimOf(p,'g')+(p.spec==='vanguard'?1:0));}
function pilotAim(p){return Math.max(0,SRDB.skillBonus(Rebel.dbSkill(p,'aim'),p.level)+pilotAimMod(p));}
/* every way kit enters the armory: loot, gifts, the market, migrations (src: start, looted, bought, made, gift) */
function grantItem(id,n,src){
  const a=Items.grant(G.armory,id,n,src);
  autoEquip();
  return a;
}
/* each Med Pack used in the field is gone from the armory */
function usePacks(r){
  const used=(r.people||[]).reduce((n,pr)=>n+(pr.packs||0),0);
  const broke=(r.people||[]).reduce((a,pr)=>a.concat(pr.broke||[]),[]);   // kit used up in the field: a riot shield that shattered
  for(const id of broke)Items.take(G.armory,id,1);
  if(!used&&!broke.length)return 0;
  if(used)Items.take(G.armory,'medpack',used);
  reconcileGear();
  return used;
}
function applyDebrief(r){
  if(!r)return;
  SR.mission=null;G.sortie=undefined;
  usePacks(r);
  if(r.missionId==='haven'){
    if(r.win){
      G.introDone=true;started=true;
      for(const pr of r.people||[]){
        const p=G.people.find(x=>x.id===pr.id);
        if(!p)continue;
        if(pr.xp)gainXp(p,pr.xp);Rebel.trainSkills(p,pr.sk);
        p.kills=(p.kills||0)+(pr.kills||0);
        creditMission(p);
        if(pr.state==='injured'){
          Rebel.layUp(p,'downed',pr.dur||2);
          news('<b>'+p.name+'</b> took the rock the hard way \u2014 out '+outDays(p)+' day'+(outDays(p)>1?'s':'')+'.','h');
        }
      }
      if(r.loot){
        if(r.loot.c)G.credits+=r.loot.c;
        if(r.loot.s)G.supplies+=r.loot.s;
        for(const it of r.loot.items||[])grantItem(it,1,'looted');
      }
      news('<b>The abandoned base at Haven Rock is ours.</b> The squatters are gone; the signal is up. Day one of the rest of the war. The Revolution begins today!','g');
      news('In the hangar cave, under a decade of dust: a <b>derelict Graf Hauler</b>. Joss is already inspecting it. Restore it from the hangar.','a');
      discoverCass();
      seedNews();
      showEstSplash();
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
  const pinfo=[],lostP=[],nearIds=[];
  const teamIds=(r.people||[]).map(x=>x.id);
  for(const pr of r.people||[]){
    const p=G.people.find(x=>x.id===pr.id);
    if(!p)continue;
    p.assign='rest';
    const mt=Rebel.expGet(p,'mentored');
    const xg=(pr.xp||0)*(mt&&teamIds.includes(mt.with)?1.3:1);
    if(xg)gainXp(p,xg);Rebel.trainSkills(p,pr.sk);
    p.kills=(p.kills||0)+(pr.kills||0);
    let state=pr.state;
    if(state==='shotdown')state=(rng()<0.15)?'lost':'injured';
    pinfo.push({name:p.name,xp:xg*Rebel.xpMult(p),state});   // what gainXp actually added
    if(r.win&&state!=='lost')creditMission(p);
    if(state==='lost'&&upAny('infirmary','surgery')&&medStaff().length&&rng()<0.6){
      state='injured';pr.dur=6;nearIds.push(p.id);
      news('<b>'+p.name+'</b> should not have made it. The surgery room says otherwise.','g');
    }
    if(state!=='lost'&&pr.inj&&pr.inj.length)for(const m of applyInjuries(p,pr.inj,state==='injured'))news('<b>'+p.name+'</b> '+m,'h');
    if(state!=='lost')tireNews(p);
    if(state==='lost'){
      G.people=G.people.filter(x=>x.id!==p.id);lostP.push(p);
      moraleAll(-6,'death',(r.people||[]).map(x=>x.id),-10);
      news('<b>'+p.name+'</b> did not come home. Their name goes on the wall.','h');
    } else if(state==='injured'){
      Rebel.layUp(p,'downed',pr.dur||3);   // the recovery rate decides how long (slower with no Infirmary or no one on it)
      p.injuries=(p.injuries||0)+1;
      Rebel.moraleBump(p,-5,'injury');
      for(const q of crewOf())if(q!==p&&!(q.merc&&!(r.people||[]).some(x=>x.id===q.id)))Rebel.moraleBump(q,(r.people||[]).some(x=>x.id===q.id)?-2:-0.5,'injury');
      mood();
      news('<b>'+p.name+'</b> came back on a stretcher \u2014 out '+outDays(p)+' day'+(outDays(p)>1?'s':'')+'.','h');
    }
  }
  const got=[];
  if(r.loot){
    if(r.loot.c){G.credits+=r.loot.c;got.push(C(r.loot.c));}
    if(r.loot.s){G.supplies+=r.loot.s;got.push(S(r.loot.s));}
    for(const it of r.loot.items||[]){grantItem(it,1,'looted');got.push(Items.name(it));}
  }
  if(r.win&&r.kind==='ground'&&(r.people||[]).some(pr=>pr.state!=='lost'&&Rebel.has(G.people.find(x=>x.id===pr.id),'smuggler'))&&rng()<0.25){
    const it=rng()<0.5?'cowboy':'shells';
    grantItem(it,1,'looted');got.push(Items.name(it));
    news('A former smuggler\u2019s instincts paid off: an extra <b>'+Items.name(it)+'</b> in the haul.','g');
  }
  if(r.kind==='ground'&&r.nades!==undefined){
    const a=G.armory.find(x=>x.id==='blam');
    const given=G.nadesOut===undefined?(a?a.n:0):G.nadesOut;G.nadesOut=undefined;
    const had=a?a.n:0,want=Math.max(0,had-given+r.nades);   // unused frags (the drop's and the crates') join the stores
    if(want>had)Items.grant(G.armory,'blam',want-had,'looted');else if(want<had)Items.take(G.armory,'blam',had-want);
    if(r.nades>0&&!a)got.push('BLAM frags ×'+r.nades);
  }
  if(r.win&&r.cross){
    if(G.fighters.length<fighterCap()){
      G.fighters.push(newFighter({id:'dustfall',name:'Dustfall',cls:'cross',hull:85}));
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
    Items.take(G.armory,'limpet',r.limpetUsed);
  }
  if(r.win&&m&&r.method)m.method=r.method;
  if(r.chargeUsed){
    Items.take(G.armory,'charge',r.chargeUsed);
  }
  if(r.win&&m)applyRew(m.rew,got);
  for(const vr of r.vehicles||[]){
    const v=(G.vehicles||[]).find(x=>x.id===vr.id);
    if(!v)continue;
    if(vr.lost){
      G.vehicles=G.vehicles.filter(x=>x!==v);
      news('The <b>'+v.name+'</b> was wrecked in the field. There was nothing left to bring home.','h');
    } else v.hp=Math.max(5,Math.min(100,vr.hp));
  }
  if(r.win&&m&&m.vip&&m.vip.strider&&r.vipOut&&!(G.vehicles||[]).some(v=>v.id==='strider')){
    G.vehicles=G.vehicles||[];
    G.vehicles.push({id:'strider',name:m.vip.name,type:'strider',hp:100});
    got.push('<b>'+m.vip.name+'</b> joins the vehicle pool');
    news('<b>'+m.vip.name+'</b>, a reprogrammed Strider Mk I, joins the rebellion as a Bot. Bring it to a ground mission as fire support.','g');
  }
  for(const g of r.gained||[]){
    if(GVEH[g.type]&&GVEH[g.type].kind==='bot'){
      if((G.vehicles||[]).some(v=>v.name===g.name))continue;
      const v=addVehicle(g.type,g.name);
      got.push('<b>'+v.name+'</b> (hacked) joins the vehicle pool');
      news('<b>'+v.name+'</b>, a hacked '+GVEH[g.type].label+', joins the rebellion as a Bot.','g');
      continue;
    }
    const A=AUTOS[g.type];if(!A)continue;
    if(G.people.some(p=>p.name===g.name))continue;
    G.people.push({id:'auto'+(G.people.length+1)+'_'+g.type,name:g.name,role:'Soldier',level:1,xp:0,assign:'rest',auto:g.type,bio:A.bio});
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
  heroCheck(r,m,runExperiences(r,m,{lostP,nearIds}));
  autoEquip();
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
    SR.transition('hyperspace',{},()=>SR.go('space',{mission:SR.mission}));
  }
});

/* ---------- save / scene lifecycle ---------- */
function saveSnap(){
  try{SR.persist({campaign:JSON.parse(JSON.stringify(G)),started});}catch(e){}
}
let booted=false;
/* ---------- save versions ----------
   G.v is the save's schema version; a save from before versioning has none (version 0). MIGRATIONS[i] upgrades a
   save from version i to i+1, exactly once, and they run in order on load. To change the shape of G: add a function
   at the end (saveVersion() follows, and newGame() is born at it). Work every load needs (rebinding functions,
   picking up new content, the market) belongs in restoreCampaign itself, not here. */
const MIGRATIONS=[
  /* 0 -> 1: everything patched into older saves before saves had a version (2026-09-27 to 2026-10-05) */
  function(){
    if(G.introDone===undefined)G.introDone=true;
    if(G.wreck===undefined)G.wreck={restored:true,restoring:0};
    if(G.onboard===undefined)G.onboard='done';
    G.misPopQ=G.misPopQ||[];
    G.recruit=G.recruit||{days:0};G.recWait=G.recWait||[];G.recSeq=G.recSeq||0;
    for(const p of G.people){Rebel.migrate(p);if(p.level>Rebel.LEVEL_CAP)p.level=Rebel.LEVEL_CAP;if(!p.auto&&p.joined===undefined)p.joined=G.day;}
    G.heroesMade=Math.max(G.heroesMade||0,G.people.filter(p=>p.role==='Hero').length);
    if(!G.medSeeded){G.medSeeded=1;if(!G.armory.some(x=>x.id==='medpack'))Items.grant(G.armory,'medpack',4,'start');}
    for(const p of crewOf())if(!p.gear)gearFromEquip(p);
    G.candQ=G.candQ||[];
    G.opps=G.opps||[];
    G.mercQ=G.mercQ||[];G.inbound=G.inbound||[];G.shipKit=G.shipKit||[];
    G.upq=G.upq||[];G.dip=G.dip||[];G.patrols=G.patrols||[];G.chains=G.chains||{};
    for(const rm of G.rooms){
      if(rm.key==='bay')rm.key='hangar';
      if(rm.key==='quarters')rm.key='barracks';
      if(!rm.id)rm.id='rm_'+rm.r+'_'+rm.c;
      if(!rm.up)rm.up=[];
    }
    for(const row of G.grid)for(const cell of row){if(cell.room==='bay')cell.room='hangar';if(cell.room==='quarters')cell.room='barracks';}
    for(const p of G.people)if(p.auto===1)p.auto='strider';
    // the Strider is a Bot (a vehicle that drives itself), not a person: it moves off the roster into the vehicle pool
    G.vehicles=G.vehicles||[];
    for(const p of G.people.filter(x=>x.auto==='strider')){
      if(!G.vehicles.some(v=>v.id===p.id))G.vehicles.push({id:p.id,name:p.name,type:'strider',hp:100});
    }
    G.people=G.people.filter(x=>x.auto!=='strider');
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
    if(G.missions.some(m=>(m.story||m.id)==='stealfuel'&&m.state==='done')&&!G.armory.some(a=>a.id==='charge')&&!G.missions.some(m=>(m.story||m.id)==='autofactory'))grantItem('charge',1,'looted');
    if(!G.locModel){G.locModel=1;G.renown=Math.min(G.renown,40);G.revNoted=false;G.revLevel=1;}
    for(const p of G.people)if(p.assign==='medbay')p.assign='station:infirmary';
    for(const f of G.fighters)if(f.cls==='viper')f.cls='cross';
    {const WNAMES={cowboy:'Cowboy No.4',longiron:'Longhorn \u201928 Hunting Rifle',scatter:'Varmint Shotgun',rocket:'Improvised Rocket Launcher'};
     for(const a of G.armory)if(WNAMES[a.id])a.name=WNAMES[a.id];}
    for(const f of G.fighters)if(!f.loadout)f.loadout=defaultLoadout(f);   // saves from before weapons were per ship
  },
  /* 1 -> 2: rest (rebel-rest.js): everyone starts rested (missions without rest, Weary, Conked). And the Kiln Ridge
     factory is AutoCom's (DESIGN_BLOCKERS C-18): mission and lead text saved as "Autoworks" is renamed. */
  function(){
    for(const p of G.people){p.tired=p.tired||0;p.weary=p.weary||0;p.conked=p.conked||0;}
    const ren=o=>{if(!o||typeof o!=='object')return;for(const k in o){const v=o[k];
      if(typeof v==='string')o[k]=v.replace(/Autoworks\u2019|Autoworks'/g,'AutoCom Plant\u2019s').replace(/Autoworks/g,'AutoCom Plant');else ren(v);}};
    ren(G.missions);ren(G.opps);
  },
  /* 2 -> 3: the Back slot (DESIGN_BLOCKERS C-25): everyone with gear gets an empty one */
  function(){
    for(const p of G.people)if(p.gear&&p.gear.back===undefined)p.gear.back=null;
  },
];
const saveVersion=()=>MIGRATIONS.length;   // the version this build writes
/* bring the loaded campaign (global G) up to saveVersion(); returns the version it came in at */
function upgradeSave(){
  const from=G.v||0,to=saveVersion();
  if(from>to)console.warn('Star Rebellion: this save is from a newer build (version '+from+', this build reads '+to+'); loading it as it is.');
  for(let v=from;v<to;v++){MIGRATIONS[v]();G.v=v+1;}
  return from;
}
function restoreCampaign(data){
  if(data&&data.campaign&&data.started){
    G=data.campaign;started=true;
    upgradeSave();
    // every load: rebels pick up fields newer rebel code relies on (Rebel.migrate is idempotent), and the mood follows them
    for(const p of G.people)Rebel.migrate(p);
    mood();
    autoEquip();   // empty slots (new ones too, like Head and Body) fill from free stock
    // every load: worlds added to PLANETDEF since the save appear
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
    // every load: a mission keeps its world and region by id; the names it shows come from PLANETDEF, so a world or
    // region renamed there is renamed in missions already on the board (DESIGN_BLOCKERS C-17)
    for(const m of G.missions)ctxNames(m);
    if(G.sortie){   // the page closed mid-mission: the sortie never flew, so its fuel and supply drop come back
      G.fuel+=G.sortie.f||0;G.supplies+=G.sortie.s||0;G.nadesOut=undefined;
      G.news.push({day:G.day,html:'<b>'+G.sortie.name+'</b> was called off before it left. The fuel'+(G.sortie.s?' and the supply drop are':' is')+' back in stores.',cls:'r'});
      G.sortie=undefined;
    }
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
    ensureMarket();   // old saves with no G.market roll the current week (next restock at the next 7k+1 day)
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
    fn:{castRebel,enterRoomView,pilotAimMod,ctxNames,restTag,tireNews,packTick,packsCarried,usePacks,pilotAim,buildCostAt,UPGRADES_:()=>UPGRADES,REV_W_:()=>REV_W,startRestore,digAt,buildAt,srcContact,srcVisit,acceptCandidate,startSpec,openWin,getWin:()=>winMode,gainXp,dossierHead,squadEntry,soldierAim,pilotAim,moraleAll,mood,moraleTick,crewOf,applyInjuries,startProsthetic,medicalSection,healRate,recordCard,meterBlock,rankRow,insignia,getRankOverlay:()=>rankOverlay,getGearOverlay:()=>gearOverlay,setRng:f=>{rng=f;},heroCheck,heroCard,isGround,isFlyer,runExperiences,squadTension,nameOfRebel,expCards,autoEquip,outfitSquad,gearSection,carried,freeOf,slotGet,slotSet,gearSlots,wpnsFromGear,nadesCarried,reconcileGear,startRecruit,recruitTick,canRecruit,recruitCard,rankFor,creditMission,rankCard,roomsAdj,PLANETDEF_:()=>PLANETDEF,BUILDS_:()=>BUILDS,srcAnswer,CHAINS_:()=>CHAINS,chainTick,chainPrompt,chainAct,chainState,startPatrol,patrolTick,upBlocked,gearLayout,startUpgrade,startDip,canDip,clusterOf,bunkCap,fighterCap,supCap,sourceCap,tilesOf,openTilePop,roomAt,fuelOf,addMission,spawnMission,pushMission,makeOffer,openPlan,plPlace,plComplete,plFuel,startPlan,applyDebrief,advanceDay,scoutPlanet,syncUI,saveSnap,
      ablePilots,openWin,closeWin,launchIntro,precondList,canAttempt,
      newFighter,defaultLoadout,shipStats,hasDoorGun,fuelPer,pilotInit,pilotSkills,plAddAsset,plSyncAssets,plAssetMode,SEATS_:()=>SEATS,
      restoreCampaign,restartCampaign,upgradeSave,saveVersion,MIGRATIONS_:()=>MIGRATIONS,saveSnap,newGame,addVehicle,vehPool,GVEH_:()=>GVEH,soldierPool,staffOf,outDays,
      openArsenal,closeArsenal,renderArsenal,sellItem,sellWhy,sellPrice,applyGearPick,kitNameId,marketable,KIT_:()=>KIT,
      getArOpen:()=>arOpen,getArCat:()=>arCat,getArSel:()=>arSel,setArSel:(t,id)=>{arSel={t,id};arLast[arCat]=arSel;renderArsenal();},setArCat:c=>{arCat=c;arSel=arLast[c]||null;renderArsenal();},
      openMarket,closeMarket,renderMarket,ensureMarket,rollMarket,buyLot,lotPrice,marketWeek,nyxAccess,stLine,isOwnSlot,mercBunkFree,freeBunks,
      padFree,inboundShips,shipSerial,arFit,SHIP_PRICE_:()=>SHIP_PRICE,SHIPWPN_PRICE_:()=>SHIPWPN_PRICE,
      getBmOpen:()=>bmOpen,getBmSel:()=>bmSel,setBmSel:i=>{bmSel=i;bmLine=null;renderMarket();},
      raiseAccess,addSupport,revGain,missionCredit,syncLocalOps,pst,pdef,locCap,renderWin,getPL:()=>PL,canAttempt,precondList,
      enterRoom:key=>{const rm=G.rooms.find(r=>r.key===key&&!r.build);if(rm)enterRoomView(rm);return !!rm;},exitRoomView}};
}
})();
