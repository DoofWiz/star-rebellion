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
  bruiser:autoFrom('bruiser','Bruiser','A reprogrammed riot Bruiser. It beats up anyone who does not comply. That just means the Heggies now.'),
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
  strider:ownedVeh('strider','A reprogrammed Hegemony enforcement Strider. Its face-screen is permanently stuck on “We’re all in this together.”'),
  police:ownedVeh('police','A patrol car with a pulse cannon in the nose.'),
  dispersal:ownedVeh('dispersal','A riot car with a dispersal turret on the roof. Seats a driver and an exposed turret gunner.'),
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
  hangar:{name:'Hangar',ck:'shield',ic:'hangar',desc:'The hanger bay holds berths for all of our smaller craft: fighters, gunships & transports.'},
  barracks:{name:'Barracks',ck:'rebel',ic:'soldier',desc:'The barracks accommodates our soldiers, marines and pilots, and serves as a R&R spot.'},
  store:{name:'Storeroom',ck:'go',ic:'supplies',desc:'The storeroom expands our supplies and materials resource capacity.'},
  comms:{name:'Intelligence Center',ck:'shield',ic:'comms',desc:'The intelligence center is the nerve center of our galactic network of espionage.'},
  diplo:{name:'Diplomatic Quarter',ck:'rebelHi',ic:'people',desc:'The diplomatic quarter is the hub of work for winning the hearts & minds of the galaxy.'},
  workshop:{name:'Workshop',ck:'steel',ic:'work',desc:'The workshop fixes up damaged ships and vehicles, getting them back into fighting shape.'},
  infirmary:{name:'Infirmary',ck:'go',ic:'heart',desc:'The infirmary accommodates wounded revolutionaries and aids in their recovery.'},
  training:{name:'Training Hall',ck:'psi',ic:'star',desc:'The training hall turns the experience of rebels into specialties and new abilities.'},
  techlab:{name:'Tech Lab',ck:'hazard',ic:'signal',desc:'The tech lab is where our Technicians slice Hegemony systems, build gadgets and keep our electronics alive.'},
};
/* room colours come from the kit palette (resolved at draw time so the CSS tokens stay the single source) */
const rcol=key=>K[ROOMS[key].ck]||K.steel;
const BUILDS={
  store:{c:200,m:80,days:1},
  comms:{c:480,m:120,days:2},
  workshop:{c:400,m:160,days:2},
  infirmary:{c:360,m:80,s:60,days:2},
  training:{c:320,m:100,s:40,days:1},
  hangar:{c:960,m:800,days:4},   // a 4 × 4 section: four small pads' worth of the old one-pad tile (C-32)
  barracks:{c:280,m:120,s:60,days:1},
  diplo:{c:500,m:160,s:60,days:2},
  techlab:{c:400,m:160,days:2},
};
/* adjacent rooms of one type merge into a single bigger room; upgrades apply to the whole merged room */
const UPGRADES={
  barracks:[
    {k:'bunks',n:'Bunks',c:260,m:140,days:2,d:'Bunkbeds: +2 beds in every barracks room.'},
    {k:'quarters',n:'Quarters',c:320,m:160,s:60,days:2,d:'Sub-partitions: +2 more beds per room.'},
    {k:'rec',n:'Rec Room',c:300,m:160,s:80,days:2,conv:1,minTiles:3,d:'Convert into a rec room: resting rebels recover from exhaustion twice as fast.'},
  ],
  infirmary:[
    {k:'surgery',n:'Surgery Room',c:600,m:240,s:100,days:3,d:'A proper theatre: everyone in the Infirmary recovers half a day faster each day.'},
  ],
  hangar:[
    {k:'refuel',n:'Refuelling Station',c:400,m:240,days:2,d:'Dedicated fuel storage and pumps: sorties burn 25% less fuel.'},
    {k:'arm',n:'Robot Maintenance Arm',c:440,m:260,days:3,d:'A robotic mechanic: ships repair 5% a day faster on the pads.'},
    {k:'lounge',n:'Ready Lounge',c:520,m:220,days:3,conv:1,minTiles:2,d:'Convert into standby lounge: pilots get to a mission a day sooner (every sortie takes 1 day less, minimum 1).'},
    {k:'mbay',n:'Maintenance Bay',c:560,m:320,days:3,conv:1,minTiles:2,d:'Converts into a dedicated bay: the most damaged ship in the hanger enters and repairs 10% a day faster until fully fixed.'},
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
const SRC_LINE={bought:'From the Black Market',looted:'Stolen',
  made:'Crafted',gift:'Gifted'};
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
function gearCapacity(){return 24+12*tilesOf('store')+Math.round(headScale('store',RU.inventory_min,RU.inventory_max));}   // + Inventory Control (Logistics)
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
function pilotAimMod(p){return Rebel.moraleFx(p).aim+Rebel.injFx(p).aim+Rebel.wearyFx(p).aim+(hasSpec(p,'dogfighter')?1:0);}

/* ---------- state ---------- */
let G=null,tilePopAt=null,winMode=null,winArg=null,started=false,viewRoom=null,srcSel=null;

/* Haven Rock's ground (DESIGN_BLOCKERS C-32): 14 rows × 18 columns. The first 8 rows and 11 columns are the old map, and
   its bedrock can never have changed, so the new ground reaches into it freely; old saves get the same ground (MIGRATIONS
   5 -> 6). The Hangar's sections sit along the east side: the first is built, the next two are rubble caverns. */
const BASE_ROWS=14,BASE_COLS=18,HANGAR_SITES=[[2,13],[6,13],[10,13]];
function havenGround(){
  const g=[];for(let r=0;r<BASE_ROWS;r++){g.push([]);for(let c=0;c<BASE_COLS;c++)g[r].push('rock');}
  const set=(t,cells)=>cells.forEach(([r,c])=>{g[r][c]=t;});
  const rect=(t,r0,c0,h,w)=>{for(let r=r0;r<r0+h;r++)for(let c=c0;c<c0+w;c++)g[r][c]=t;};
  // the old caves; the old cave hangar (rows 2-3, columns 1-2) is open floor now
  rect('floor',4,1,1,8);
  set('floor',[[3,3],[2,3],[5,3],[3,6],[5,6],[2,1],[2,2],[3,1],[3,2]]);
  set('rubble',[[4,0],[5,1],[5,2],[1,3],[5,7],[4,9],[3,7],[3,8],[6,4],[6,5],[2,6],[2,7],[1,4],[6,3]]);
  // tunnels east to the Hangar and south to the lower caves
  set('floor',[[4,10],[4,11],[4,12],[7,3],[8,3],[9,3]]);
  rect('floor',5,12,6,1);rect('floor',10,1,1,12);
  // rubble pockets to dig out for rooms
  rect('rubble',2,9,2,2);set('rubble',[[5,8],[5,9],[5,10],[6,9],[6,10]]);
  rect('rubble',8,1,2,2);rect('rubble',8,5,2,2);rect('rubble',8,8,2,3);
  rect('rubble',11,1,2,3);rect('rubble',11,5,2,3);rect('rubble',11,9,2,3);
  for(const [r,c] of HANGAR_SITES.slice(1))rect('rubble',r,c,HANGAR_N,HANGAR_N);
  return g;
}
const hangarSection=(r,c,halves)=>({id:'rm_'+r+'_'+c,key:'hangar',r,c,w:HANGAR_N,h:HANGAR_N,up:[],halves});
function newGame(){
  const rows=BASE_ROWS,cols=BASE_COLS;
  const grid=havenGround().map(row=>row.map(t=>({t})));
  const rooms=[
    {id:'rm_2_4',key:'command',r:2,c:4,w:2,h:2},
    hangarSection(HANGAR_SITES[0][0],HANGAR_SITES[0][1],['L','S']),   // the derelict Graf's large pad and two fighter pads
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
      castRebel({id:'joss',name:'Joss Marrek',role:'Pilot',charTrait:'reckless',equip:['cowboy']},'joss-marrek'),
      castRebel({id:'dax',name:'Dax Ferro',role:'Soldier',level:1,xp:0.2,charTrait:'cautious',equip:['akli','cowboy']}),
      castRebel({id:'runa',name:'Runa Vel',role:'Soldier',level:1,xp:0.45,charTrait:'shortfuse',equip:['akli','cowboy']}),
      castRebel({id:'kel',name:'Kel Brasso',role:'Soldier',level:1,xp:0.1,charTrait:'hunter',equip:['akli','cowboy']}),
    ],
    sources:[],
    onboard:'intro',
    missions:[
    ],
    planets:PLANETDEF.map(mkPlanet),
    recruitN:0,recSeq:0,recruit:{days:0},recWait:[],misPopQ:[],candQ:[],standby:[],
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
/* ---------- the Hangar: 4 × 4 sections of landing pads (DESIGN_BLOCKERS C-32) ----------
   A Hangar room is a 4 × 4-tile section. Each half of it (two rows of four tiles) is either two small pads (2 × 2 tiles:
   a fighter, size 6 or under) or one large pad (4 × 2: a hauler or light freighter, size 7-8); rm.halves holds 'S' or 'L'
   per half. The Ready Lounge and the Maintenance Bay each take the front-most small pad of their Hangar. */
const HANGAR_N=4,LARGE_SIZE=7;
const shipSize=cls=>((SRDB.ship(cls)||{}).size)||5;
const isLargeShip=cls=>shipSize(cls)>=LARGE_SIZE;
function sectionPads(rm){
  const out=[];
  (rm.halves||['S','S']).forEach((k,h)=>{
    const r=rm.r+h*2;
    if(k==='L')out.push({rm,half:h,kind:'large',r,c:rm.c,w:4,h:2});
    else for(let i=0;i<2;i++)out.push({rm,half:h,kind:'small',r,c:rm.c+i*2,w:2,h:2});
  });
  return out;
}
function clusterPads(cl){
  const pads=cl.flatMap(sectionPads);
  const small=pads.filter(p=>p.kind==='small').sort((a,b)=>(b.r+b.c)-(a.r+a.c)||b.c-a.c);
  let i=0;
  for(const k of ['lounge','mbay'])if(clUp(cl,k)&&small[i])small[i++].conv=k;
  return pads;
}
const hangarPads=()=>clustersOf('hangar').flatMap(clusterPads);
function padCounts(pads){let L=0,S=0;for(const p of pads||hangarPads())if(!p.conv){if(p.kind==='large')L++;else S++;}return {L,S};}
function fighterCap(){const {L,S}=padCounts();return L+S;}   // every berth, large and small; three from the start
/* what holds a pad: the fleet, ships on their way from Nyx, and the derelict Graf while it waits on its large pad */
const wreckClass=()=>G.wreck&&!G.wreck.restored?['graf']:[];
const fleetClasses=()=>G.fighters.map(f=>f.cls).concat((G.inbound||[]).filter(x=>x.kind==='ship').map(x=>x.cls),wreckClass());
/* large ships need large pads; small ships take small pads first, then any large pad left over */
function fleetFits(classes,counts){const {L,S}=counts||padCounts(),big=classes.filter(isLargeShip).length;return big<=L&&classes.length<=L+S;}
const berthFree=(cls,n)=>fleetFits(fleetClasses().concat(Array(n||1).fill(cls)));
function padsFree(){
  const {L,S}=padCounts(),cl=fleetClasses(),big=cl.filter(isLargeShip).length,small=cl.length-big;
  return {small:Math.max(0,S-small),large:Math.max(0,L-big-Math.max(0,small-S))};
}
/* flipping half a section between two small pads and one large pad: free, as long as every ship still has a pad */
function flipBlocked(rm,h){
  if(rm.build)return 'Still being built.';
  const keep=rm.halves[h];rm.halves[h]=keep==='L'?'S':'L';
  const cl=clusterOf(rm),need=['lounge','mbay'].filter(k=>clUp(cl,k)).length;
  const small=clusterPads(cl).filter(p=>p.kind==='small').length,fits=fleetFits(fleetClasses());
  rm.halves[h]=keep;
  if(small<need)return 'The '+(clUp(cl,'lounge')?'Ready Lounge':'Maintenance Bay')+' needs a small pad.';
  if(!fits)return keep==='L'?'A hauler needs that large pad.':'Our ships need those pads.';
  return '';
}
function flipHalf(rm,h){
  if(flipBlocked(rm,h))return false;
  rm.halves[h]=rm.halves[h]==='L'?'S':'L';
  news('The Hangar crew repaint the deck: '+(rm.halves[h]==='L'?'one large pad':'two small pads')+' where '+(rm.halves[h]==='L'?'two small ones were':'the large one was')+'.','a');
  return true;
}
/* a new section needs a 4 × 4 block of cleared floor; one beside the Hangar we have is best (it joins it) */
function hangarBlockAt(r,c){
  let best=null,bs=-1;
  for(let r0=r-3;r0<=r;r0++)for(let c0=c-3;c0<=c;c0++){
    if(r0<0||c0<0||r0+HANGAR_N>G.rows||c0+HANGAR_N>G.cols)continue;
    let ok=true;
    for(let i=r0;i<r0+HANGAR_N&&ok;i++)for(let j=c0;j<c0+HANGAR_N;j++)if(G.grid[i][j].t!=='floor'){ok=false;break;}
    if(!ok)continue;
    const bl={r:r0,c:c0,w:HANGAR_N,h:HANGAR_N},adj=G.rooms.some(o=>o.key==='hangar'&&!o.build&&roomsAdj(bl,o));
    const score=(adj?100:0)-(r-r0)-(c-c0);
    if(score>bs){bs=score;best=Object.assign(bl,{adj});}
  }
  return best;
}
const bedsPerTile=cl=>3+(clUp(cl,'bunks')?2:0)+(clUp(cl,'quarters')?2:0);
function bunkCap(){return clustersOf('barracks').reduce((n,cl)=>n+(clusterTiles(cl)-(clUp(cl,'rec')?1:0))*bedsPerTile(cl),0);}
const missionDays=m=>Math.max(1,(m.days||1)-(hangarUp('lounge')?1:0));
function supCap(){const t=tilesOf('store');return Math.round(1000+250*t*(1+0.05*Math.max(0,t-1)));}
function clampSupplies(){
  if(!G)return;
  const cap=supCap();
  if(G.supplies>cap){
    const lost=Math.round(G.supplies-cap);G.supplies=cap;
    if(lost>=10)news('The storerooms are full. '+S(lost)+' spoiled. Build another Storeroom.','d');
  }
}
const bunksUsed=()=>G.people.filter(p=>!p.auto).length;   // Autos don't sleep
/* ---------- Support specialties: who works where (game/js/support.js, the Support Specialties doc) ----------
   A Support rebel works in the home room of their base specialty (p.assign 'room:KEY'); a room holds
   Support.capacity(tiles). In it, the Department Head (highest level of the room's specialty) sets the base
   specialty's Rules, each niche's Lead Specialist sets that niche's Rules, and everyone runs Jobs. The old staff posts
   (Garrison Officer, Flight Deck Officer, Medic...) are gone (DESIGN_BLOCKERS C-28). The numbers live in the
   database's Rules tab (RU), so the text on screen always says what the game does. */
const RU=SRDB.rules;
const SP=window.Support;
const pctOf=x=>Math.round(x*100);
const isSupport=p=>!!p&&p.role==='Support'&&!p.auto;
const roomCap=key=>hasRoom(key)&&SP.specOfRoom(key)?SP.capacity(tilesOf(key)):0;   // only a specialty's home room takes Support
const postedTo=key=>G.people.filter(p=>isSupport(p)&&p.assign==='room:'+key);
/* working the room today: posted there, on their feet and awake */
function crewIn(key){return hasRoom(key)?postedTo(key).filter(p=>!laidUp(p)&&!Rebel.conked(p)):[];}
const headOf=key=>SP.head(crewIn(key),key);
const headLv=key=>{const h=headOf(key);return h?h.level:0;};
const nicheRoom=n=>SP.SPEC[SP.NICHE[n].spec].room;
const ROOMTAG={infirmary:'Medbay',comms:'Intel',workshop:'Workshop',techlab:'Tech Lab',store:'Stores',training:'Classroom',diplo:'Diplo',command:'Mission Ctl'};
/* the Lead Specialist of a niche, in its home room. One the player names takes over the next day; until then the
   previous Lead's Rules stay on (doc: a day to hand over). */
function leadOf(niche){
  const crew=crewIn(nicheRoom(niche)),d=(G.leads||{})[niche];
  if(d&&G.day<d.from){const prev=d.prev&&crew.find(p=>p.id===d.prev&&p.niche===niche);if(prev)return prev;}
  return SP.lead(crew,niche,d&&d.id);
}
/* a niche unlock ('niche.key') is on when its Lead has reached it (Rules; and Jobs that work without a target) */
function on(id){const u=SP.UK[id];return !!u&&u.niche&&SP.ruleOn(leadOf(u.niche),u);}
/* who in the room can run a niche Job (doc: Staff ride on the Lead's unlocks, plus fork Jobs of their own) */
function runnersOf(id){
  const u=SP.UK[id];if(!u||!u.niche)return [];
  const ld=leadOf(u.niche);
  return crewIn(nicheRoom(u.niche)).filter(p=>SP.canRun(p,u,ld));
}
const staffHas=(key,trait)=>crewIn(key).some(p=>Rebel.has(p,trait));
/* a Rule of the base specialty: its strength follows the Department Head's level (0 when the room has none) */
const headScale=(key,a,b)=>{const h=headOf(key);return h?SP.scale(h.level,a,b):0;};
/* ---- standing Jobs: capacity that fills itself each day, most urgent first ---- */
/* who needs care: laid up first, then anyone still carrying a condition, longest to go first */
const careNeed=p=>Rebel.laidUp(p)*10+(p.cond||[]).reduce((a,c)=>a+Math.max(0,c.days),0);
const patientsAll=()=>G.people.filter(p=>!p.auto&&p.assign!=='mission'&&(p.cond||[]).length).sort((a,b)=>careNeed(b)-careNeed(a));
/* Treatment: each Doctor in the Infirmary takes `treatment_patients`; returns {pid: the treating Doctor} */
function treatedBy(){
  const docs=crewIn('infirmary').filter(p=>p.sspec==='doctor').sort((a,b)=>b.level-a.level),out={};
  let i=0;
  for(const d of docs)for(let k=0;k<RU.treatment_patients;k++){const pt=patientsAll()[i++];if(pt)out[pt.id]=d;}
  return out;
}
/* Rehab (Physio): two patients each, the same order */
function inRehab(){
  const ph=runnersOf('physio.rehab'),out={};
  let i=0;
  for(const d of ph)for(let k=0;k<2;k++){const pt=patientsAll()[i++];if(pt)out[pt.id]=d;}
  return out;
}
/* Processing / Supply Handling: each officer takes N Sources with that yield; returns the Source ids covered */
function coveredSources(spec,key,n,res){
  const k=crewIn(key).filter(p=>p.sspec===spec).length*n;
  return new Set(G.sources.filter(s=>s.alive&&s.inc&&s.inc[res]).slice(0,k).map(s=>s.id));
}
/* Tutoring: each Academic tutors one other Support rebel, the least experienced first */
function tutored(){
  const ac=crewIn('training').filter(p=>p.sspec==='academic'),out=new Set();
  const pupils=G.people.filter(p=>isSupport(p)&&!ac.includes(p)&&p.assign.startsWith('room:')).sort((a,b)=>(a.level+a.xp)-(b.level+b.xp));
  pupils.slice(0,ac.length).forEach(p=>out.add(p.id));
  return out;
}
/* repair % a day for a ship or vehicle nobody is working on, and Materials per repair day */
function repairBase(){return hasRoom('workshop')?RU.repair_rate_workshop:RU.repair_rate_no_workshop;}
function repairCost(){return RU.repair_cost;}
/* Repairs: each Mechanic in the Workshop takes one damaged craft (worst first); returns Map craft -> Mechanic */
function repairCrew(){
  const mechs=crewIn('workshop').filter(p=>p.sspec==='mechanic').sort((a,b)=>b.level-a.level),out=new Map();
  const hurt=G.fighters.filter(f=>!f.out&&f.hull<100).concat((G.vehicles||[]).filter(v=>v.hp<100))
    .sort((a,b)=>(a.hull!==undefined?a.hull:a.hp)-(b.hull!==undefined?b.hull:b.hp));
  mechs.forEach((m,i)=>{if(hurt[i])out.set(hurt[i],m);});
  return out;
}
const mechRate=m=>Math.round(SP.scale(m.level,RU.mechanic_repair_min,RU.mechanic_repair_max));
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
/* the one recovery rate (days of recovery per day; DESIGN_BLOCKERS C-20): slow without an Infirmary, 1 with one.
   Treatment (a Doctor's patient, two each) heals 50% faster, up to 100% at level 19; Rehab (a Physio's) adds 25%.
   The Former Medic and Former Doctor traits of anyone working the Infirmary, and the Surgery Room, add to it. */
function healRate(p,tb,rh){
  const base=hasRoom('infirmary')?1:Rebel.NO_INFIRMARY;
  const room=hasRoom('infirmary')?(staffHas('infirmary','medic')?0.5:0)+(staffHas('infirmary','doctor')?1:0)+(upAny('infirmary','surgery')?0.5:0):0;
  if(!p)return base+room;   // the untreated rate
  const doc=(tb||treatedBy())[p.id],phys=(rh||inRehab())[p.id];
  return base*(1+(doc?SP.scale(doc.level,RU.treatment_min,RU.treatment_max):0)+(phys?RU.rehab_bonus:0))+room;
}
/* under a Doctor's Treatment today (Critical Condition only heals then) */
const underTreatment=(p,tb)=>!!(tb||treatedBy())[p.id];
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
    '<span class="sr-tag sr-tag--warn" title="Weary: needs '+d+' of rest. If sent on a mission in this state, they will lose morale and fight worse." aria-label="Weary, '+d+' of rest">Zz Weary</span>';
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
      msgs.push('comes back with '+def.n.toLowerCase()+(i.treated?'':' It will take a while to heal.')+'.');
    }
    Rebel.moraleBump(p,-3,'injury');
  }
  if(msgs.length&&!hadState)p.injuries=(p.injuries||0)+1;
  return msgs;
}
/* Infirmary: who has lost a limb or an eye, and who can fit them (a Cyberneticist's Prosthetics Job) */
function prostheticCards(){
  const lost=[];
  for(const p of crewOf())for(const part of PARTS)if(p.body&&p.body[part]===1)lost.push([p,part]);
  if(!lost.length)return '';
  const cy=runnersOf('cyberneticist.prosthetics').length;
  return lost.map(([p,part])=>'<div class="sr-card sr-card--foe"><div class="sr-card__title">'+esc(p.name)+' \u00b7 '+(part==='eye'?'blinded eye':'lost '+part)+'</div><div class="sr-card__body" style="margin-bottom:0">'+
    (inSurgery(p)?'Being fitted now.':cy?'A Cyberneticist here can fit a prosthetic: start <b>Prosthetics</b> under Jobs below.':'Only a Cyberneticist (a Doctor trained in the classroom) can fit a prosthetic.')+'</div></div>').join('');
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
    if(b[part]===1)rows.push('<div class="sr-card sr-card--foe"><div class="sr-card__top"><span class="sr-card__title">'+(part==='eye'?'Blinded in one eye':'Lost '+(part==='arm'?'an arm':'a leg'))+'</span>'+wTag('Permanent','bad')+'</div><div class="sr-card__body">'+(part==='eye'?'A significant accuracy penalty.':part==='arm'?'No two-handed weapons.':'Slowed and cannot sprint.')+' A Cyberneticist\u2019s prosthetic would fix it.</div></div>');
    else if(b[part]===2){
      const kind=(p.pros||{})[part]||'fitted',fx=(Rebel.PROS_FX[kind]||{})[part]||{};
      const what=fx.aim?(fx.aim>0?'+':'')+fx.aim+' aim.':fx.spd?(fx.spd>1?'A little faster on their feet.':'A little slower on their feet.'):'It works. Mostly.';
      rows.push('<div class="sr-card sr-card--good"><div class="sr-card__top"><span class="sr-card__title">'+sentence(Rebel.PROS_NAME[kind])+' prosthetic '+part+'</span>'+wTag('Fitted','good')+'</div><div class="sr-card__body">'+what+'</div></div>');
    }
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
  if(Rebel.credit(p))news('<b>'+p.name+'</b> is eligible a promotion.','p');
}
function gainXp(p,x){
  const n=Rebel.gainXp(p,x);
  for(let i=p.level-n+1;i<=p.level;i++){news('<b>'+p.name+'</b> reached level '+i+'!','p');sGood();}
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
    desc:'A Hegemony flight instructor, Commandant Dral Vex, trains the next class of Hegemony aces in this location. Kill the instructor to set their flight school back.',
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
    {kind:'mission',mid:'toi',text:'“There\'s a flight instructor, named Vex. A lot of the Hegemony pilot\'s who shoot at you around here will have learned it from this guy. And he\'s been running practices for his latest students over MY yard. Just passing it along...”'},
    {kind:'mission',mid:'intercept',text:'“A supply transport is crossing my location soon. There\'s only going to be a light escort. I have the schedule, and if you have the nerve, maybe I can pass it along.”'},
    {kind:'recruit',text:'“There are dockhands here asking some questions about joining up with \'the struggle\'. Want me to point them somewhere?”'},
    {kind:'recruitP',text:'“One of the yard’s test pilots just got written up for insubordination. Wants out. Wants to fly for something that matters. Are you interested?”'},
    {kind:'cache',text:'“Pallet miscount in bay six, forty crates of it.”',
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
    // the holo-table's callouts (docs/ui/SCREENS-HANDOFF.md §4); missions without `holo` show their first two objectives
    holo:[{k:'Target',t:'FT-4 Cross on the pad behind the sheriff’s HQ'},{k:'Opposition',t:'Sheriff Reeve enforces Hegemony law here',foe:1},{k:'Extract',t:'Walk a pilot to the pad and fly it home'}],
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
  fuel:{scenario:'stealfuel',days:2,riskTxt:'Moderate',lib:10,
    req:{team:3,teamRole:'Soldier',transport:1,prize:0},
    rew:{f:240,c:300,xp:0.2}},
  intel:{scenario:'intel',days:2,riskTxt:'Moderate',lib:15,
    req:{team:3,teamRole:'Soldier',transport:1,prize:0,spec:SPEC_FT},
    rew:{c:400,i:6,xp:0.3}},
  autofactory:{scenario:'autofactory',days:2,riskTxt:'Moderate',lib:20,
    req:{team:3,teamRole:'Soldier',transport:1,prize:0,items:[{id:'charge',n:1,label:'Explosive Charge'}]},
    rew:{c:450,m:160,xp:0.2},bonus:{i:2,c:250}},
  rescue:{scenario:'rescue',days:2,riskTxt:'Moderate',lib:15,npcRole:'Support',
    req:{team:3,teamRole:'Soldier',transport:1,prize:0},
    rew:{c:500,xp:0.35},bonus:{i:2}},
};
MTYPE_DEFS.towers={scenario:'towers',days:2,riskTxt:'Moderate',lib:15,
  req:{team:3,teamRole:'Soldier',transport:1,prize:0,items:[{ids:['charge','limpet'],n:1,label:'Explosive Charge or Data Limpet'}]},
  rew:{i:5,xp:0.3}};
/* the words of each type (name, target names, offer, objectives, follow-up line) are in game/js/mission-text.js */
for(const k in MTYPE_DEFS){const t=MT.type(k);Object.assign(MTYPE_DEFS[k],{name:t.name,variants:t.targets,hook:t.hook,desc:t.desc,obj:MT.objList(k),after:t.after});}
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
  // the transport is picked at planning, so on the board it is just "the transport"
  return MT.fill(str,{npc:m.npc?m.npc.name:'',npc1:m.npc?m.npc.first:'',target:c.target||'target',place:c.place||'the target',
    SRC:(sn[sn.length-1]||'CONTACT').toUpperCase(),transport:'transport'});
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
    if(step.k==='decode'&&c.wait>0){
      c.wait-=runnersOf('analyst.decryption').length?2:1;   // Decryption (Analyst): double speed
      if(c.wait<=0){
        c.show=true;news('The decode for <b>'+C.name+'</b> is ready.','a');sAlert();
        if(on('analyst.datamining')&&rng()<0.3){G.intel+=3;news('Data Mining: the analysts squeeze '+I(3)+' more out of the same data.','g');}
      }
    }
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
    ['Yusef Lorne','Registry clerk who read everything he was supposed to file.'],['Dr. Halla Maro','Physician struck off for treating the wrong patients.'],['Gus Tarrow','Mechanic. Kept a Hegemony ore-hauler fleet flying on spit and stolen parts, then stopped.']],
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
  const T=m.tid&&MTYPE_DEFS[m.tid];   // a type's words are read live, so an edit reaches missions already on the board
  if(T){
    m.desc=fillMission(m,T.desc);
    m.objectives=T.obj.map(x=>fillMission(m,x));
    m.after=(T.after||[]).map(x=>fillMission(m,x));
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
  let n=1+(crewIn('command').length?1:0)+(crewOf().some(p=>Rebel.has(p,'charismatic')&&!laidUp(p)&&p.assign!=='mission')&&rng()<0.5?1:0);
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
  sGood();
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
  if(G.packClock<(headOf('infirmary')?2:3)||G.supplies<PACK_COST)return;
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
  G.fuel+=4;   // the old hangar-cave tanks weep a little every day
  /* Repairs (Mechanic): each Mechanic in the Workshop works one damaged craft at their own pace; the rest repair at
     the untended rate. The Hangar's arm, the Maintenance Bay and a Former Mechanic in the Workshop add to it. */
  for(const f of G.fighters)if(f.refit>0&&--f.refit<=0){delete f.refit;news('<b>'+f.name+'</b>\u2019s refit is done.','g');}
  const repCost=repairCost(),crew=repairCrew(),fmech=staffHas('workshop','mechanic')?1.15:1;
  const rateOf=x=>((crew.get(x)?mechRate(crew.get(x)):repairBase())+(hangarUp('arm')?5:0))*fmech;
  const worst=bayShip();
  for(const f of G.fighters){
    if(f.out||f.hull>=100)continue;
    if(G.materials>=repCost){G.materials-=repCost;f.hull=Math.min(100,Math.round(f.hull+rateOf(f)+(f===worst?10:0)));}
  }
  for(const v of G.vehicles||[]){   // ground vehicles patch up in the hangar the same way
    if(v.hp>=100)continue;
    if(G.materials>=repCost){G.materials-=repCost;v.hp=Math.min(100,Math.round(v.hp+rateOf(v)));}
  }
  patrolTick();
  specTick();
  supportTick();
  const xpRate=RU.train_xp_rate*(drillOn()?RU.drill_xp_mult:1);
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
      if(!fleetFits(G.fighters.map(f=>f.cls).concat(wreckClass(),[dv.cls]))){   // the pad it held got converted away: it waits overhead
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
  const tb=treatedBy(),rh=inRehab();   // today's Treatment and Rehab, fixed before anyone heals
  for(const p of G.people){
    const wasUp=laidUp(p);
    if(wasUp)Rebel.moraleBump(p,-0.5,'injury');
    if(p.cond&&p.cond.length&&p.assign!=='mission'){
      const res=Rebel.condRecover(p,healRate(p,tb,rh),rng,!!tb[p.id]);
      for(const k of res.done)news('<b>'+p.name+'</b> has recovered from '+Rebel.CONDK[k].n.toLowerCase()+'.','g');
      if(rh[p.id]&&(res.done.length||res.up.length))rehabDone(p,rh[p.id]);
      if(res.scar&&Rebel.expGrant(p,'scarred'))news('<b>'+p.name+'</b>\u2019s face will carry the scar for good.','p');
      if(res.blind)news('<b>'+p.name+'</b> has lost the sight in an eye for good. Only a prosthetic will bring it back.','h');
      for(const c of res.up){
        const def=Rebel.CONDK[c.k];
        if(def.after==='prosthetic'){
          p.body=p.body||{};p.body[c.part]=2;p.pros=p.pros||{};p.pros[c.part]=c.kind||'fitted';
          news('<b>'+p.name+'</b>\u2019s '+Rebel.PROS_NAME[p.pros[c.part]]+' prosthetic '+c.part+' is fitted and working.','g');continue;
        }
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
  // Processing (Intelligence Officers) and Supply Handling (Logistics Specialists): each covers a few Sources
  const procd=coveredSources('intel','comms',RU.processing_sources,'i'),handled=coveredSources('logistics','store',RU.handling_sources,'s');
  for(const src of G.sources){
    if(!src.alive)continue;
    src.visited=false;src.contacted=false;
    if(src.inc.c)G.credits+=src.inc.c;
    if(src.inc.s)G.supplies+=src.inc.s*(handled.has(src.id)?1+RU.handling_bonus:1);
    if(src.inc.m)G.materials+=src.inc.m;
    if(src.inc.f)G.fuel+=src.inc.f;
    if(src.inc.i)G.intel+=src.inc.i*(procd.has(src.id)?1+RU.processing_bonus:1);
    src.risk=Math.min(100,src.risk+(src.level===1?2:src.level===2?1:0.5));
    maybeQueueEvent(src);
    if(src.risk>70&&rng()<(src.risk-70)/220){
      src.alive=false;
      G.risk=Math.min(100,G.risk+15);
      moraleAll(-6,'loss');
      news('<b>'+src.name+'</b> has been BURNED. Counter-intelligence took them at '+src.loc+'. Assume they talk.','h');
      sWarn();
    } else if(src.risk>70){
      news(src.name+' is running hot — risk '+Math.round(src.risk)+'. Decide something before the Hegemony does.','h');
    }
  }
  // standby contacts wait on the Galaxy map (docs/ui/SCREENS-HANDOFF-2.md §2); the player reopens them there
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
  if(hasRoom('comms')&&headOf('comms'))G.intel+=tilesOf('comms')*RU.comms_intel;
  else if(hasRoom('comms'))news('The Intelligence Center hums to nobody. Put an Intelligence Officer to work there or it’s just furniture.','d');
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
  const pslots=PL.slots.filter(sl=>sl.acc==='pilot'&&!(sl.opt&&!(PL.v[sl.key]&&PL.v['rs'+sl.key.slice(2)])));
  const pilots=pslots.map(sl=>G.people.find(p=>p.id===PL.v[sl.key]));
  const ships=pslots.map(sl=>G.fighters.find(f=>f.id===PL.v['rs'+sl.key.slice(2)]));
  if(pilots.some(x=>!x)||ships.some(x=>!x))return false;
  for(const p of pilots)p.assign='mission';
  for(const f of ships)f.out=true;
  m.state='prog';
  m.progress={daysLeft:missionDays(m),pilots:pilots.map(p=>p.id),fighters:ships.map(f=>f.id)};
  supportStart(m,'auto',[]);   // Mission Support: a better chance for a mission nobody flies
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
    sGood();
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
const specOf=p=>isSupport(p)?SP.title(p):p.spec?SPECNAME[p.spec]+(p.spec2?' / '+SPECNAME[p.spec2]:''):'';   // Support: their niche, else their base specialty
/* a specialty, their own or a second one from Cross-Training (Instructor) */
const hasSpec=(p,k)=>!!p&&!!k&&(p.spec===k||p.spec2===k);
function startSpec(pid,k){
  const p=G.people.find(x=>x.id===pid);
  if(!p||!hasRoom('training'))return;
  const role=specRole(p);
  if(!role||p.level<3||p.spec||laidUp(p)||p.assign==='mission'||spaceFull(role))return;
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
      sWarn();continue;
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
/* ---------- Support specialties at work (game/js/support.js; the Support Specialties doc) ----------
   The Training Hall's spaces (practice range, flight simulator, classroom), niche training and forks, Lead
   hand-overs, the timed Jobs a specialist starts from their room (G.sjobs), the Jobs they run for a mission from the
   planning board, and what a day of work teaches them. Standing Jobs (Treatment, Repairs...) fill themselves each
   day and live with the systems they touch. A specialist runs one niche Job at a time; their base specialty's
   standing Job runs alongside it (DESIGN_BLOCKERS C-28). */
const nicheLive=n=>SP.unlocksOf(n).some(u=>u.live);
const sjobs=()=>(G.sjobs=G.sjobs||[]);
const busyJob=p=>sjobs().find(j=>j.pid===p.id)||null;
/* busy for a mission: supporting it (Mission Control) or running a Job for it */
const onMissionJob=p=>G.missions.some(m=>m.state==='prog'&&(m.ctl===p.id||(m.sjobs||[]).some(j=>j.pid===p.id)));
const jobFree=p=>!busyJob(p)&&!onMissionJob(p);
const cdReady=k=>G.day>=((G.cd||{})[k]||0);
/* --- the Training Hall: one trainee per space (two with Expanded Range) --- */
const spaceCap=()=>1+(on('instructor.range')?1:0);
function trainees(role){
  return role==='Support'?G.people.filter(p=>isSupport(p)&&p.nicheTrain):G.people.filter(p=>p.assign==='spec'&&p.specTrain&&specRole(p)===role);
}
const spaceFull=role=>trainees(role).length>=spaceCap();
const spaceOf=p=>p.nicheTrain?'Support':specRole(p);
/* Drill: each Instructor (and with Veteran Mentors, each level 11+ rebel resting at base) supervises one space that
   has someone in it: the range, the simulator, the classroom, then the mats (the Hall's everyday training) */
function drillers(){
  const out=runnersOf('instructor.drill');
  if(on('instructor.mentors'))out.push(...G.people.filter(p=>!p.auto&&p.level>=11&&p.assign==='rest'&&!offDuty(p)));
  return out;
}
function supervised(){
  const sp=['Soldier','Pilot','Support'].filter(r=>trainees(r).length);
  if(G.people.some(p=>p.assign==='train'))sp.push('mats');
  return new Set(sp.slice(0,drillers().length));
}
const drillOn=()=>hasRoom('training')&&supervised().has('mats');
/* Conditioning (Physio): each takes one trainee; their training goes 25% faster */
function conditioned(){
  const n=runnersOf('physio.conditioning').length;
  return new Set(['Soldier','Pilot','Support'].flatMap(trainees).slice(0,n).map(p=>p.id));
}
function specTick(){
  const sup=supervised(),cond=conditioned(),ft=runnersOf('instructor.fasttrack').length>0;
  for(const p of G.people){
    const tr=p.nicheTrain||p.specTrain;
    if(!tr)continue;
    const niche=!!p.nicheTrain;
    if(!niche&&p.assign!=='spec'){p.specTrain=null;continue;}
    if(laidUp(p)){if(!niche)p.assign='rest';p.specTrain=null;p.nicheTrain=null;news('<b>'+p.name+'</b>’s training stops: they are laid up.','h');continue;}
    const drill=sup.has(spaceOf(p));
    const cut=Math.min(0.6,(drill?RU.drill_time:0)+(cond.has(p.id)?RU.drill_time:0));
    tr.days-=1/(1-cut);
    if(drill){tr.taught=1;if(ft)gainXp(p,RU.train_xp_rate);}   // Fast-Track
    if(cond.has(p.id))tr.cond=1;
    if(tr.days>0.001)continue;
    if(tr.taught)p.taught=1;   // Battle Lessons remembers who trained under an Instructor
    if(tr.cond&&on('physio.peak'))p.peak=1;
    if(niche){
      p.niche=tr.k;p.nicheTrain=null;
      news('<b>'+p.name+'</b> finishes the classroom: <b>'+SP.NICHE[p.niche].n+'</b>.','g');
    } else {
      if(tr.cross){p.spec2=tr.k;news('<b>'+p.name+'</b> is cross-trained: <b>'+SPECNAME[tr.k]+'</b> as well.','g');}
      else{p.spec=tr.k;news('<b>'+p.name+'</b> graduates: <b>'+SPECNAME[p.spec]+'</b>.','g');}
      p.specTrain=null;p.assign='rest';
    }
    sBuild();
  }
}
/* --- the classroom: a Support rebel at level 3 trains a niche of their base specialty and keeps working meanwhile --- */
const curriculum=()=>{const lv=headLv('training');return lv>=15?2:lv>=7?1:0;};   // Curriculum (Academic)
const nicheDays=()=>Math.max(1,RU.niche_train_days-curriculum());
function nicheWhy(p,k){
  if(!hasRoom('training'))return 'needs a Training Hall';
  if(p.level<3)return 'needs level 3';
  if(p.niche||p.nicheTrain)return 'already trained';
  if(!SP.SPEC[p.sspec]||!SP.SPEC[p.sspec].niches.includes(k))return 'not their specialty';
  if(!nicheLive(k))return 'nothing it does works yet';
  if(laidUp(p))return 'injured';
  if(spaceFull('Support'))return 'the classroom is full';
  if(G.credits<RU.niche_train_cost)return 'needs '+RU.niche_train_cost+' credits';
  return '';
}
function startNiche(pid,k){
  const p=G.people.find(x=>x.id===pid);
  if(!p||nicheWhy(p,k))return false;
  G.credits-=RU.niche_train_cost;
  p.nicheTrain={k,days:nicheDays()};
  news('<b>'+p.name+'</b> starts the classroom: <b>'+SP.NICHE[k].n+'</b>, '+nicheDays()+' day'+(nicheDays()>1?'s':'')+'. They keep working meanwhile.','a');
  sBuild();saveSnap();syncUI();renderWin();
  return true;
}
/* forks at 7 and 15: chosen on the day, for good */
function chooseFork(pid,lv,f){
  const p=G.people.find(x=>x.id===pid);
  if(!p||SP.forkDue(p)!==lv||(f!=='A'&&f!=='B'))return false;
  p.forks=p.forks||{};p.forks[lv]=f;
  const u=SP.unlocksOf(p.niche).find(x=>x.lv===lv&&x.f===f);
  news('<b>'+p.name+'</b> chooses <b>'+(u?u.n:f)+'</b>.','g');
  sBuild();saveSnap();syncUI();renderWin();
  return true;
}
/* name a Lead Specialist: they take over tomorrow */
function setLead(niche,pid){
  const cur=leadOf(niche);
  if(!cur||cur.id===pid||!crewIn(nicheRoom(niche)).some(p=>p.id===pid&&p.niche===niche))return false;
  G.leads=G.leads||{};
  G.leads[niche]={id:pid,prev:cur.id,from:G.day+1};
  news('<b>'+G.people.find(p=>p.id===pid).name+'</b> will lead the '+SP.NICHE[niche].n+'s from tomorrow.','a');
  saveSnap();syncUI();
  return true;
}
/* --- timed Jobs, started from the room by a specialist who can run them --- */
const PARTS=['arm','leg','eye'];
const partLbl=x=>x==='eye'?'eye':x;
const inSurgery=p=>(p.cond||[]).some(c=>c.k==='surgery');
const jobTargeted=id=>sjobs().some(j=>j.tid===id||String(j.tid).split(':')[0]===id);
const freeRebel=p=>!p.auto&&p.assign!=='mission'&&p.assign!=='spec'&&!laidUp(p)&&!jobTargeted(p.id);
const isHauler=f=>(SRDB.ship(f.cls)||{}).role==='Light Hauler';
const modCap=()=>on('aerogineer.hotrod')?2:1;   // Hot-Rodded
const worldsOpen=()=>dipTargets();
const campaignAt=loc=>sjobs().some(j=>j.loc===loc&&/^propagandist\./.test(j.k));
const blackoutAt=loc=>!!loc&&sjobs().some(j=>j.k==='slicer.blackout'&&j.tid===loc);
/* fit a prosthetic: the patient is laid up for the job's days (the condition is the job's, it heals with it) */
const prosJob=(kind,cost,days)=>({
  targets:()=>G.people.filter(p=>!p.auto&&!inSurgery(p)&&p.assign!=='mission'&&!jobTargeted(p.id)).flatMap(p=>PARTS.filter(x=>(p.body||{})[x]===1||(kind==='combat'&&(p.body||{})[x]===2&&!['stab','runner'].includes((p.pros||{})[x])))
    .map(x=>({id:p.id+':'+x,label:p.name+' · '+((p.body||{})[x]===2?'refit the '+partLbl(x):'lost '+partLbl(x)),opts:kind==='combat'?(x==='arm'?[['stab','Stabilised arm (+1 aim)']]:x==='leg'?[['runner','Runner’s leg (faster)']]:[['fitted','Eye, no penalty']]):null}))),
  cost,days,
  start(j){const [pid,part]=j.tid.split(':'),p=G.people.find(x=>x.id===pid);Rebel.layUp(p,'surgery',j.days,{part,kind:j.opt||'basic',job:j.id});},
  finish(j){
    const [pid,part]=j.tid.split(':'),p=G.people.find(x=>x.id===pid);if(!p)return;
    p.cond=(p.cond||[]).filter(c=>c.k!=='surgery');
    p.body=p.body||{};p.body[part]=2;p.pros=p.pros||{};p.pros[part]=j.opt||'basic';
    news('<b>'+p.name+'</b>’s '+Rebel.PROS_NAME[p.pros[part]]+' prosthetic '+partLbl(part)+' is fitted and working.','g');
  },
});
const campaign=(fin)=>({targets:()=>worldsOpen().filter(d=>!campaignAt(d.id)).map(d=>({id:d.id,label:d.name})),cost:()=>({c:150,s:30}),days:()=>RU.campaign_days,loc:1,finish:fin});
/* a recruit answers a campaign: they wait on the New Recruits screen like a Command Center draft */
function campaignRecruit(lvl){
  const x=rng(),role=x<0.5?'Soldier':x<0.8?'Support':'Pilot';
  const r=holdRecruit(role);
  const p=Rebel.migrate({id:'rcb'+(++G.recSeq),name:r.name,first:r.first,last:r.last,charTrait:r.charTrait,role,level:lvl||1,xp:0,assign:'rest',bio:r.bio});
  if(role==='Soldier')p.equip=['pistol'];
  if(role==='Pilot')p.ship='';
  G.recWait.push(p);
  return p;
}
const viral=n=>{if(!on('propagandist.viral'))return;for(const d of worldsOpen())if(d.id!==n.loc)addSupport(d.id,n.amt/2);};
const JOBS={
  'cyberneticist.prosthetics':prosJob('basic',()=>({s:RU.prosthetic_supplies}),()=>RU.prosthetic_days),
  'cyberneticist.rapidfit':prosJob('basic',()=>({s:Math.ceil(RU.prosthetic_supplies/2)}),()=>Math.ceil(RU.prosthetic_days/2)),
  'cyberneticist.combatlimbs':prosJob('combat',()=>({s:RU.prosthetic_supplies,c:150}),()=>RU.prosthetic_days),
  'physio.strength':{
    targets:()=>G.people.filter(p=>isGround(p)&&freeRebel(p)&&!(p.cond||[]).length&&(p.sbN||0)<2).map(p=>({id:p.id,label:p.name+' · programme '+((p.sbN||0)+1)+' of 2',opts:[['agi','+'+RU.strength_skill+' Agility'],['con','+'+RU.strength_skill+' Constitution']]})),
    cost:()=>({s:30}),days:()=>RU.strength_days,
    finish(j){const p=G.people.find(x=>x.id===j.tid);if(!p)return;p.sb=p.sb||{};p.sb[j.opt]=(p.sb[j.opt]||0)+RU.strength_skill;p.sbN=(p.sbN||0)+1;
      if(on('physio.peak'))p.peak=1;news('<b>'+p.name+'</b> finishes a Strength Programme: +'+RU.strength_skill+' '+Rebel.SKILLS[j.opt].n+'.','g');},
  },
  'aerogineer.tuning':{
    targets:()=>G.fighters.filter(f=>!isHauler(f)&&(f.mods||0)<modCap()&&!jobTargeted(f.id)).map(f=>({id:f.id,label:f.name,opts:[['evade','Harder to hit (+1)'],['spd','Faster (+1 top speed)']]})),
    cost:()=>({m:120}),days:()=>RU.tune_days,
    finish(j){const f=G.fighters.find(x=>x.id===j.tid);if(!f)return;f.tune=f.tune||{};f.tune[j.opt]=(f.tune[j.opt]||0)+1;f.mods=(f.mods||0)+1;news('<b>'+f.name+'</b> comes out of the Workshop tuned.','g');},
  },
  'aerogineer.frames':{
    targets:()=>G.fighters.filter(f=>isHauler(f)&&(f.mods||0)<modCap()&&!jobTargeted(f.id)).map(f=>({id:f.id,label:f.name})),
    cost:()=>({m:160}),days:()=>RU.tune_days,
    finish(j){const f=G.fighters.find(x=>x.id===j.tid);if(!f)return;f.frame=(f.frame||0)+RU.frames_hull;f.mods=(f.mods||0)+1;news('<b>'+f.name+'</b>’s frame is reinforced: +'+RU.frames_hull+' hull.','g');},
  },
  'slicer.datatap':{
    targets:()=>worldsOpen().filter(d=>!sjobs().some(j=>j.k==='slicer.datatap'&&j.tid===d.id)).map(d=>({id:d.id,label:d.name})),
    cost:()=>({}),days:()=>0,ongoing:1,
    day(){G.intel+=RU.datatap_intel;if(!on('slicer.ghost'))G.risk=Math.min(100,G.risk+RU.datatap_exposure);},
  },
  'slicer.blackout':{
    targets:()=>worldsOpen().map(d=>({id:d.id,label:d.name})),
    cost:()=>({}),days:()=>5,cd:30,
    finish(j){news('The Hegemony network at <b>'+pdef(j.tid).name+'</b> comes back up.','d');},
  },
  'smuggler.specialorder':{
    targets:()=>sjobs().some(j=>j.k==='smuggler.specialorder')?[]:MARKET_CATS.map(c=>({id:c,label:BM_CAT[c].lab})),
    cost:()=>({c:60}),days:()=>0,ongoing:1,
  },
  'propagandist.broadcasts':campaign(j=>{
    addSupport(j.tid,0.5);viral({loc:j.tid,amt:0.5});
    if(rng()<0.5){const p=campaignRecruit();RQ.push({t:'recruits'});news('A broadcast in <b>'+pdef(j.tid).name+'</b> brings <b>'+p.name+'</b> to the door.','g');}
    else news('The broadcasts in <b>'+pdef(j.tid).name+'</b> end. Support +½.','p');
  }),
  'propagandist.drive':campaign(j=>{
    const a=campaignRecruit(2),b=campaignRecruit(1);RQ.push({t:'recruits'});viral({loc:j.tid,amt:0});
    news('The recruitment drive in <b>'+pdef(j.tid).name+'</b> brings in <b>'+a.name+'</b> and <b>'+b.name+'</b>.','g');
  }),
  'propagandist.herostories':Object.assign(campaign(j=>{
    addSupport(j.tid,1);viral({loc:j.tid,amt:1});G.risk=Math.min(100,G.risk+5);
    news('<b>'+pdef(j.tid).name+'</b> hears what the revolution did there. Support +1, and the Hegemony is listening too.','p');
  }),{targets:()=>worldsOpen().filter(d=>(G.wins||{})[d.id]&&!campaignAt(d.id)).map(d=>({id:d.id,label:d.name+' · won day '+G.wins[d.id]}))}),
  'instructor.crosstrain':{
    targets:()=>G.people.filter(p=>p.spec&&!p.spec2&&p.level>=3&&freeRebel(p)&&specRole(p)&&!spaceFull(specRole(p))).map(p=>({id:p.id,label:p.name+' · '+specOf(p),
      opts:SPECS[specRole(p)].filter(x=>x.live&&x.k!==p.spec).map(x=>[x.k,x.n])})),
    cost:()=>({c:SPEC_COST}),days:()=>SPEC_DAYS,
    start(j){const p=G.people.find(x=>x.id===j.tid);p.assign='spec';p.specTrain={k:j.opt,days:SPEC_DAYS,cross:1};},
    finish(){},
  },
};
/* the Jobs `p` can start now (their niche's, the ones built) */
function jobsFor(p){
  if(!nicheOf(p)||!crewIn(nicheRoom(p.niche)).includes(p))return [];
  const ld=leadOf(p.niche);
  return SP.unlocksOf(p.niche).filter(u=>JOBS[u.niche+'.'+u.k]&&u.live&&SP.canRun(p,u,ld)).map(u=>u.niche+'.'+u.k);
}
const nicheOf=p=>SP.nicheOf(p);
function jobWhy(p,k,t,opt){
  const d=JOBS[k];
  if(!d||!jobsFor(p).includes(k))return 'they cannot run it';
  if(!jobFree(p))return 'already busy';
  if(d.cd&&!cdReady(k))return 'ready on day '+G.cd[k];
  if(t){
    const tt=d.targets().find(x=>x.id===t);
    if(!tt)return 'not a target';
    if(tt.opts&&!tt.opts.some(o=>o[0]===opt))return 'pick an option';
  }
  const c=d.cost();
  if(needWhy(c))return needWhy(c);
  return '';
}
function startJob(pid,k,t,opt){
  const p=G.people.find(x=>x.id===pid),d=JOBS[k];
  if(!p||jobWhy(p,k,t,opt))return false;
  const c=d.cost();
  for(const r in c){const key={c:'credits',s:'supplies',m:'materials',f:'fuel',i:'intel'}[r];G[key]-=c[r];}
  G.sjSeq=(G.sjSeq||0)+1;
  const u=SP.UK[k],tt=d.targets().find(x=>x.id===t);
  const j={id:'sj'+G.sjSeq,k,pid,tid:t,opt:opt||null,days:d.days(),label:tt?tt.label:'',loc:d.loc?t:undefined};
  sjobs().push(j);
  if(d.cd){G.cd=G.cd||{};G.cd[k]=G.day+d.cd;}
  if(d.start)d.start(j);
  news('<b>'+p.name+'</b> starts <b>'+u.n+'</b>'+(j.label?': '+j.label:'')+(d.ongoing?'.':', '+j.days+' day'+(j.days>1?'s':'')+'.'),'a');
  sBuild();saveSnap();syncUI();
  return j;
}
function stopJob(id){
  const j=sjobs().find(x=>x.id===id);if(!j)return;
  G.sjobs=sjobs().filter(x=>x!==j);
  if(j.k.startsWith('cyberneticist.')){const p=G.people.find(x=>x.id===String(j.tid).split(':')[0]);if(p)p.cond=(p.cond||[]).filter(c=>c.k!=='surgery');}
  saveSnap();syncUI();
}
/* --- Jobs for a mission, picked on the planning board (ground missions; the specialist is busy until it ends) --- */
const MJOBS=['slicer.prehack','slicer.maptheft','slicer.overwatch','analyst.missionintel'];
function mjobRunners(k){return runnersOf(k).filter(jobFree);}
/* --- Mission Control: a free specialist supports each mission at launch (Mission Support), with what they bring --- */
function pickControl(kind){
  const pref=kind==='space'?['flightctl']:['tactician','combatsupport'];   // the niche that suits the mission, first
  const rank=p=>{const i=pref.indexOf(p.niche);return i<0?9:i;};
  return crewIn('command').filter(p=>p.sspec==='control'&&jobFree(p)).sort((a,b)=>rank(a)-rank(b)||b.level-a.level)[0]||null;
}
/* what the base sends with a mission; stored on the mission (m.supFx) for the debrief */
function supportStart(m,kind,picked){
  const ctl=pickControl(kind);
  m.ctl=ctl?ctl.id:null;
  m.sjobs=(picked||[]).filter(j=>{const p=G.people.find(x=>x.id===j.pid);return p&&jobFree(p)&&runnersOf(j.k).includes(p);});
  const ld=leadOf('tactician'),tac=u=>!!ctl&&SP.canRun(ctl,SP.UK['tactician.'+u],ld);
  const has=k=>m.sjobs.some(j=>j.k===k);
  const fx={cool:ctl?RU.mission_support_cool:0,brief:headLv('command')>=7?2:headLv('command')?1:0};
  if(tac('battlebrief')||has('analyst.missionintel'))fx.brief=2;
  if(has('analyst.missionintel'))fx.minimap=1;
  if(tac('extraction'))fx.extraction=1;
  if(tac('tacoverwatch'))fx.scan=1;
  if(ctl&&on('tactician.battleplan'))fx.free=1;
  if(ctl&&on('tactician.perfectplan')&&cdReady('tactician.perfectplan')){fx.free=2;G.cd=G.cd||{};G.cd['tactician.perfectplan']=G.day+30;}
  if(on('propagandist.rallying')&&m.loc&&campaignAt(m.loc))fx.cool+=RU.mission_support_cool;
  if(has('slicer.prehack'))fx.prehack=1;
  if(has('slicer.maptheft'))fx.mapAll=1;
  if(has('slicer.overwatch'))fx.hack1=1;
  if(on('slicer.backdoors'))fx.backdoors=1;
  if(blackoutAt(m.loc))fx.noReinf=1;
  if(on('physio.ironcon'))fx.ironcon=1;
  // Combat Support: the supporting specialist's fire support Jobs; the Lead's Rules
  const cs=u=>!!ctl&&SP.canRun(ctl,SP.UK['combatsupport.'+u],leadOf('combatsupport'));
  if(cs('firecoord'))fx.fsExtra=1;
  if(cs('precision'))fx.precise=1;
  if(cs('rapidresp'))fx.rapid=1;
  if(cs('evac'))fx.evac=1;
  if(ctl&&on('combatsupport.saturation'))fx.saturate=1;
  if(ctl&&on('combatsupport.dangerclose'))fx.dangerClose=1;
  if(ctl&&on('combatsupport.bombard'))fx.bombard=1;
  // Flight Controller: the same for a space mission
  const fc=u=>!!ctl&&SP.canRun(ctl,SP.UK['flightctl.'+u],leadOf('flightctl'));
  if(fc('vectoring'))fx.vector=1;
  if(fc('interceptplot')&&PL&&PL.plot)fx.plot=PL.plot;
  if(ctl&&on('flightctl.turnaround'))fx.turnaround=1;
  if(ctl&&on('flightctl.tightwing'))fx.tight=1;
  if(ctl&&on('flightctl.emergencyjump'))fx.jump=1;
  m.supFx=fx;
  if(ctl||m.sjobs.length)news('Base support for <b>'+m.name+'</b>: '+[ctl?ctl.name+' on Mission Control':null].concat(m.sjobs.map(j=>G.people.find(x=>x.id===j.pid).name+' ('+SP.UK[j.k].n+')')).filter(Boolean).join(', ')+'.','a');
  return fx;
}
/* the mission is over: the specialists who supported it learn from it and are free again */
function supportDone(m){
  const ids=[m.ctl].concat((m.sjobs||[]).map(j=>j.pid)).filter(Boolean);
  for(const id of ids){const p=G.people.find(x=>x.id===id);if(p)gainXp(p,RU.support_job_xp*Math.max(1,m.days||1));}
  m.ctl=null;m.sjobs=[];m.supFx=null;
}
/* Peak Condition: their next mission starts steadier and quicker on their feet */
function peakOf(p){if(!p.peak)return null;p.peak=0;return {cool:RU.mission_support_cool,agi:1.05};}
/* Rehab finished a condition: Scar Tissue may leave a small bonus; Peak Condition once they are clear */
function rehabDone(p){
  if(on('physio.scartissue')&&rng()<0.25){
    const ks=Rebel.skillKeys(p);
    if(ks.length){const k=ks[Math.floor(rng()*ks.length)];p.sb=p.sb||{};p.sb[k]=(p.sb[k]||0)+2;news('<b>'+p.name+'</b> healed tougher where it broke: +2 '+Rebel.SKILLS[k].n+'.','g');}
  }
  if(!(p.cond||[]).length&&on('physio.peak'))p.peak=1;
}
/* Salvage (Mechanic, Department Head): more Materials from a mission's reward */
function salvaged(rw){
  if(!rw||!rw.m||!headOf('workshop'))return rw;
  return Object.assign({},rw,{m:Math.round(rw.m*(1+headScale('workshop',RU.salvage_min,RU.salvage_max)))});
}
/* Maintenance (Technician, Department Head): a used Med Pack, grenade or charge may come back */
function maintenance(r,got){
  const ch=headScale('techlab',RU.maintenance_min,RU.maintenance_max);
  if(!ch)return;
  const used={medpack:(r.people||[]).reduce((a,pr)=>a+(pr.packs||0),0),blam:r.nadesUsed||0,charge:r.chargeUsed||0,limpet:r.limpetUsed||0};
  let back=[];
  for(const id in used)for(let i=0;i<used[id];i++)if(rng()<ch){grantItem(id,1,'made');back.push(Items.name(id));}
  for(const id of back)gotLoot(got,{id,n:1});
  if(back.length)news('The Tech Lab gets '+back.join(', ')+' working again.','g');
}
/* Walk It Off (Physio): laid up with a little time to go, they can still be picked, a little slower */
const walkItOff=p=>on('physio.walkitoff')&&laidUp(p)&&Rebel.laidUp(p)<=3&&!(p.cond||[]).some(c=>['spinal','amputation','surgery','critical'].includes(c.k));
/* the day's work: jobs move on, specialists learn, the market's Inside Line, forks and the classroom announced */
function supportTick(){
  const working=new Set();
  for(const j of sjobs().slice()){
    const p=G.people.find(x=>x.id===j.pid),d=JOBS[j.k];
    const room=SP.UK[j.k]&&SP.UK[j.k].niche?nicheRoom(SP.UK[j.k].niche):null;
    if(p&&room&&!crewIn(room).includes(p))continue;   // paused while they are away from the room
    if(p)working.add(p.id);
    if(!d)continue;
    if(d.ongoing){if(d.day)d.day(j);continue;}
    j.days--;
    if(j.k.startsWith('cyberneticist.')){const pt=G.people.find(x=>x.id===String(j.tid).split(':')[0]);const c=pt&&(pt.cond||[]).find(x=>x.k==='surgery');if(c)c.days=Math.max(0,j.days);}
    if(j.days<=0){G.sjobs=sjobs().filter(x=>x!==j);if(d.finish)d.finish(j);sBuild();}
  }
  for(const j of G.dip||[])working.add(j.pid);
  const tut=tutored();
  for(const p of G.people.filter(isSupport)){
    if(!p.assign.startsWith('room:')||!crewIn(p.assign.slice(5)).includes(p))continue;
    let x=working.has(p.id)?RU.support_job_xp:RU.support_room_xp;
    if(nicheOf(p)&&SP.underLead(p,leadOf(p.niche)))x*=RU.support_staff_xp_mult;
    if(tut.has(p.id))x*=RU.tutoring_mult;
    gainXp(p,x);
  }
  for(const p of G.people.filter(isSupport)){
    const fd=SP.forkDue(p);
    if(fd&&p.forkNoted!==fd){p.forkNoted=fd;news('<b>'+p.name+'</b> has a choice to make as a '+SP.NICHE[p.niche].n+' (level '+fd+'). Open their file.','p');sGood();}
    if(p.level>=3&&!p.niche&&!p.nicheTrain&&!p.nicheNoted&&hasRoom('training')){p.nicheNoted=1;news('<b>'+p.name+'</b> is ready for the classroom: a '+SP.SPEC[p.sspec].n+' niche at level 3. Train them in the Training Hall.','p');}
  }
  // Inside Line (Smuggler): every 3 days two lots change, besides the weekly restock
  if(on('smuggler.insideline')&&G.market&&G.market.lots&&G.day%3===0&&G.day<G.market.next)marketSwap(2);
}
/* ---------- mission flow: arrive → reward screen → the source calls back ---------- */
let RQ=[],HOLD=false;
/* what a mission brought home, for the report window (docs/ui/SCREENS-HANDOFF.md §1):
   res[k] = {pay, found, ...}: each resource by where it came from (one diamond row per non-zero source);
   loot = [{id|type, name, n, kind:'item'|'ship'|'vehicle'|'bot'|'unit', foe}]: everything else that came home */
const newGot=()=>({res:{},loot:[]});
function gotRes(got,k,n,src){
  if(!n)return;
  const r=got.res[k]=got.res[k]||{};
  r[src||'pay']=(r[src||'pay']||0)+n;
}
function gotLoot(got,e){
  e=Object.assign({kind:'item',n:1},e);
  if(e.kind==='item'){
    e.name=e.name||Items.name(e.id);
    e.foe=!!(KIT[e.id]&&KIT[e.id].heg);
    const had=got.loot.find(x=>x.kind==='item'&&x.id===e.id);
    if(had){had.n+=e.n;return;}
  }
  got.loot.push(e);
}
const gotTotal=r=>Object.values(r||{}).reduce((a,n)=>a+n,0);
/* the same haul as one line for the news log */
function gotText(got){
  const tot={};for(const k in got.res)tot[k]=gotTotal(got.res[k]);
  const o=[bundleHTML(tot)].filter(Boolean);
  for(const e of got.loot)o.push(esc(e.name)+(e.n>1?' ×'+e.n:''));
  return o.join(' · ');
}
function buildReport(m,win,got,people,cr,arrive){
  let follow=null;
  if(win&&m.src){
    const src=G.sources.find(x=>x.id===m.src&&x.alive);
    if(src)follow={src:src.id,lines:m.after||['<b>'+src.name.split(' ').pop().toUpperCase()+':</b> “Word travels. Well done.”']};
  }
  return {m,win,got:got||newGot(),people:people||[],cr:cr||null,arrive:!!arrive,follow};
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
    sGood();openWin('newhero',n.id);
  }
  else if(n.t==='contract'){
    const p=G.people.find(x=>x.id===n.id);
    if(!p||!p.merc||G.day<p.merc.until)return nextReport();
    sGood();openWin('contract',n.id);
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
/* pay out a mission's fixed reward (ships are handled by each caller); src names the report row ('pay' by default) */
function applyRew(rw,got,src){
  if(!rw)return;
  if(rw.c)G.credits+=rw.c;
  if(rw.s)G.supplies+=rw.s;
  if(rw.m)G.materials+=rw.m;
  if(rw.f)G.fuel+=rw.f;
  if(rw.i)G.intel+=rw.i;
  for(const k of ['c','s','m','f','i'])gotRes(got,k,rw[k],src);
}
/* a rebel's XP before and after a gain, for the report's crew rows */
function xpInfo(p,x){
  const o={id:p.id,who:p,name:p.name,role:p.role,lvl0:p.level,xp0:p.xp};
  if(x)gainXp(p,x);
  o.lvl1=p.level;o.xp1=p.xp;
  return o;
}
function resolveMission(m){
  const pilots=G.people.filter(p=>m.progress.pilots.includes(p.id));
  const avgLvl=pilots.reduce((a,p)=>a+p.level,0)/Math.max(1,pilots.length);
  const cmdBonus=m.ctl?RU.mission_support_success:0;   // Mission Support
  const ok=rng()<Math.min(0.92,0.45+avgLvl*0.08+G.morale*0.002+cmdBonus);
  for(const p of pilots){p.assign='rest';tireNews(p);}
  for(const fid of m.progress.fighters){const f=G.fighters.find(x=>x.id===fid);if(f)f.out=false;}
  supportDone(m,{win:ok});
  if(ok){
    const rew=newGot();
    applyRew(salvaged(m.rew),rew);
    if(m.rew.fighter){
      if(berthFree('talon')){
        const f=newFighter({id:'t'+(G.fighters.length+1),name:'Talon '+(G.fighters.length),cls:'talon',hull:70});
        G.fighters.push(f);gotLoot(rew,{type:'talon',name:f.name,kind:'ship'});
      } else {G.credits+=600;gotRes(rew,'c',600,'fenced');}
    }
    if(m.rew.cross){
      if(berthFree('cross')){
        G.fighters.push(newFighter({id:'cross_'+(G.fighters.length+1),name:'Dustfall',cls:'cross',hull:85}));
        gotLoot(rew,{type:'cross',name:'FT-4 Cross',kind:'ship'});
      } else {G.credits+=800;gotRes(rew,'c',800,'fenced');}
    }
    const xg=m.rew.xp||0.1;
    const pinfo=pilots.map(p=>Object.assign(xpInfo(p,xg),{xp:xg*Rebel.xpMult(p)}));
    for(const p of pilots)creditMission(p);
    moraleAll(1,'win',pilots.map(p=>p.id),3);
    m.state='done';m.meta='SUCCESS';
    const cr=missionCredit(m);
    queueReport(buildReport(m,true,rew,pinfo,cr,false));
    news('<b>'+m.name+'</b> — SUCCESS. '+gotText(rew)+'. '+(m.ground?'Squad':'Flight')+' XP awarded.','g');
    sBuild();
    missionAftermath(m.id);
  } else {
    const hurt=pilots[Math.floor(rng()*pilots.length)];
    Rebel.layUp(hurt,'downed',2);
    const f=G.fighters.find(x=>x.id===m.progress.fighters[0]);
    if(f)f.hull=Math.max(15,f.hull-30);
    moraleAll(-3,'loss',pilots.map(p=>p.id),-8);hurt.injuries=(hurt.injuries||0)+1;Rebel.moraleBump(hurt,-5,'injury');mood();
    m.state='avail';m.progress=null;
    queueReport(buildReport(m,false,newGot(),pilots.map(p=>Object.assign(xpInfo(p,0),{xp:0,state:p===hurt?'injured':'ok'})),null,false));
    news('<b>'+m.name+'</b> — FAILED. '+(m.ground?'The deputies were ready.':'The escort was waiting.')+' '+hurt.name+' hurt; '+(f?f.name+' shot up.':''),'h');
    sWarn();
  }
  m.progress=null;
}

/* ---------- source actions (results delivered over comms) ---------- */
/* cultivation before and after, for the comm burst's meter (a level-up fills it) */
const cultOf=(src,c0,l0)=>({from:c0,to:src.level>l0?100:src.cult,lvl0:l0,lvl1:src.level});
function srcVisit(src){
  if(src.visited)return;
  src.visited=true;
  const c0=src.cult,l0=src.level;
  src.cult=Math.min(100,src.cult+10);
  src.risk=Math.min(100,src.risk+6);
  G.risk=Math.min(100,G.risk+1);
  const lvl=checkCultLevel(src);
  rollSignal(src);
  const lines=['You make the crossing to '+src.loc+' yourself. '+src.name.split(' ')[0]+' needed a face, not a frequency.',
    'Their risk +6: being seen costs.'];
  if(lvl)lines.push(lvl);
  openComm(src,{lines,signal:src.signal,cult:cultOf(src,c0,l0)});
  syncUI();
}
function srcContact(src){
  if(src.pendingEvent){openComm(src,{event:src.pendingEvent});return;}
  if(src.contacted&&!src.signal)return;
  const c0=src.cult,l0=src.level;
  if(!src.contacted){
    src.contacted=true;
    src.cult=Math.min(100,src.cult+3);
    rollSignal(src);
  }
  const lvl=checkCultLevel(src);
  const lines=['Coded burst to '+src.loc+'. '+src.name.split(' ')[0]+' is responding on our secure channel.'];
  if(lvl)lines.push(lvl);
  openComm(src,{lines,signal:src.signal,cult:cultOf(src,c0,l0)});
  syncUI();
}
function srcAnswer(src,idx){
  const ev=src.pendingEvent;
  const kind=ev.opts[idx][1],c0=src.cult,l0=src.level;
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
  openComm(src,{lines,signal:src.signal,cult:cultOf(src,c0,l0)});
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
  sWarn();
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
  if(G.sources.filter(s=>s.alive).length>=sourceCap())return standbyCandidate(id);   // the window disables Take on when full
  G.standby=(G.standby||[]).filter(x=>x!==id);
  G.sources.push(Object.assign({alive:true,visited:false,contacted:false,pendingEvent:null,eventsSeen:0,signal:null,sigIdx:0},
    JSON.parse(JSON.stringify(cd))));
  news('<b>'+cd.name+'</b> joins the network.','g');
  G.risk=Math.min(100,G.risk+4);
  closeWin();syncUI();
}
/* the network is full: the candidate stays on the Galaxy map as a potential contact until a slot frees up */
function standbyCandidate(id){
  const cd=CANDS[id];
  if(!cd)return closeWin();
  G.standby=G.standby||[];
  if(!G.standby.includes(id)&&!G.sources.some(s=>s.id===id)){
    G.standby.push(id);
    news('<b>'+cd.name+'</b> waits on standby — a potential contact on the Galaxy map until the network has room.','d');
  }
  closeWin();syncUI();
}
function declineCandidate(id){
  G.standby=(G.standby||[]).filter(x=>x!==id);
  news('The contact is burned. They never hear back.','d');
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
function oppsEligible(){return hasRoom('comms')&&!!headOf('comms');}
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
function patrolReady(f){return !f.out&&!(f.refit>0)&&f.hull>=60&&G.fuel>=fuelOf(f)&&!!patrolPilot(f);}
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
  if(rm.key==='hangar'){   // the Ready Lounge and Maintenance Bay each take a small pad (C-32)
    const queued=['lounge','mbay'].filter(k=>!clUp(cl,k)&&upQueued(rm,k)).length;
    const small=clusterPads(cl).filter(p=>p.kind==='small'&&!p.conv).length-queued;
    if(small<1)return 'Needs a small pad to convert: split a large pad first.';
    const n=padCounts();n.S-=1+queued;
    return fleetFits(fleetClasses(),n)?'':'Every pad is spoken for.';
  }
  if(t<(d.minTiles||2))return d.minTiles>2?'Needs an expansion first.':'Needs a second room to convert.';
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
/* Outreach (Diplomat): each Diplomat working the Quarter runs one team at a time */
const diplomats=()=>crewIn('diplo').filter(p=>p.sspec==='diplomat');
const freeDiplomat=()=>diplomats().find(p=>!(G.dip||[]).some(t=>t.pid===p.id));
function dipCapacity(){return diplomats().length;}
const outreachGain=()=>RU.outreach_support*(1+RU.outreach_bonus);
function canDip(id){
  const st=pst(id);
  if(!st||!dipCapacity())return 'The Quarter needs a Diplomat working there.';
  if(!freeDiplomat())return 'Every diplomat is already out.';
  if((G.dip||[]).some(t=>t.loc===id))return 'A team is already there.';
  if((st.sup||0)>=5)return 'Support is already at its peak.';
  if(G.credits<DIP_COST.c||G.supplies<DIP_COST.s)return 'Cannot afford it.';
  return '';
}
function startDip(id){
  if(canDip(id))return false;
  const dip=freeDiplomat();
  G.credits-=DIP_COST.c;G.supplies-=DIP_COST.s;
  G.dip=G.dip||[];
  G.dip.push({loc:id,days:DIP_DAYS,pid:dip.id,by:dip.name,n:outreachGain()});
  news('Diplomats leave for <b>'+pdef(id).name+'</b> ('+DIP_DAYS+'d).','a');sBuild();
  return true;
}
function finishDip(t){
  const d=pdef(t.loc);
  addSupport(t.loc,t.n);
  news('<b>'+t.by+'</b>\u2019s people did the rounds in '+d.name+'. Quiet dinners, louder opinions: Support +'+fmtFlags(t.n)+'.','p');
}
const fmtFlags=n=>n===0.5?'\u00bd':n===1?'1':(Math.round(n*100)/100)+'';
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
  G.renown=Math.min(100,G.renown+n*(on('propagandist.symbol')?1+RU.symbol_bonus:1));   // Symbol of the Revolution
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
  openWin('escalate');sWarn();
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
  const info={gain:0,lib:null,first:false,renown0:G.renown||0,parts:{mission:REV_W.mission}};
  if(m.opp||m.oppId){const o=(G.opps||[]).find(x=>x.id===(m.oppId||m.id));if(o)o.done=true;}
  const st=m.loc?pst(m.loc):null,d=m.loc?pdef(m.loc):null;
  if(st){
    st.ops=(st.ops||0)+1;
    info.first=st.ops===1;
    info.parts.mission=REV_W.mission*(st.ops<=2?1:st.ops<=5?REV_W.midRepeat:REV_W.lateRepeat);
    if(st.ops===1)info.parts.first=REV_W.firstLoc;
    else if(st.ops===2)info.parts.second=REV_W.secondLoc;
    gain=info.parts.mission+(info.parts.first||0)+(info.parts.second||0);
    if(m.region&&m.lib&&d&&d.regions){
      const r=d.regions.find(x=>x.id===m.region);
      const cur=st.lib[m.region]||0,cap=locCap(st);
      const to=Math.max(cur,Math.min(cap,cur+m.lib));
      st.lib[m.region]=to;
      info.lib={region:r.name,from:cur,to,capped:to>=cap&&to<100};
      if(to>cur){
        gain+=info.parts.lib=(to-cur)*REV_W.lib;
        news('<b>'+r.name+'</b> ('+d.name+'): liberation '+to+'%'+(to>=cap&&to<100?' — capped by '+(ACC_CAP[st.acc]<=ACC_CAP[Math.floor(st.sup)]?'Access':'Support')+'.':'.'),'p');
        if(to>=100){gain+=info.parts.libFull=REV_W.libFull;news('<b>'+r.name+'</b> is LIBERATED. The flag goes up.','g');moraleAll(4,'win');flashMsg('<b>'+r.name+'</b> liberated','good');SR.transition('flag',{text:'LIBERATED'});}
      }
    }
  }
  revGain(gain);
  info.renown1=G.renown||0;
  const sym=info.renown1-info.renown0-gain;   // Symbol of the Revolution adds its share on top
  if(sym>0.05)info.parts.symbol=sym;
  news('Revolution progress +'+(Math.round(gain*10)/10)+' ('+Math.round(G.renown)+'/100).','d');
  if(m.loc)syncLocalOps(m.loc);
  info.gain=Math.round(gain*10)/10;
  return info;
}
/* ---------- audio ----------
   Layered like the combat scenes' engines, and split the way the news feed already is:
   sAlert pings for news that waits ('a'), sGood rises for good news ('p'/'g'), sWarn falls for bad ('h'). */
function sDay(){
  if(A.off())return;
  osc('sine',90,45,0.28,0.5);
  nz('bandpass',400,2,0.1,0.5,0,1200);
  osc('triangle',180,90,0.05,0.4,0.04);   // a low horn under the day turning over
}
function sBuild(){
  if(A.off())return;
  osc('triangle',220,110,0.16,0.3);
  osc('triangle',330,165,0.1,0.34,0.05);
  nz('bandpass',1100,2.5,0.05,0.1,0.02);   // the wrench on the frame
}
function sAlert(){
  if(A.off())return;
  osc('square',880,880,0.06,0.08);
  osc('square',660,660,0.06,0.1,0.1);
  nz('bandpass',1800,3,0.03,0.14);
}
function sGood(){
  if(A.off())return;
  osc('triangle',523,523,0.08,0.09);
  osc('triangle',659,659,0.08,0.09,0.09);
  osc('triangle',880,880,0.1,0.18,0.18);
  nz('highpass',3800,1,0.03,0.08,0.18);   // a glint on the last note
}
function sWarn(){
  if(A.off())return;
  osc('sawtooth',320,190,0.1,0.32);
  osc('square',160,95,0.07,0.36,0.02);
  nz('lowpass',600,1,0.08,0.32,0.04);
}
function sLaunch(){
  if(A.off())return;
  nz('bandpass',200,2,0.14,0.7,0,1800);
  osc('sine',60,140,0.14,0.6);
  osc('sawtooth',48,110,0.05,0.65);   // engine growl under the wash
}
function sClick(){if(A.off())return;osc('square',1400,1200,0.02,0.04);}
function sComm(){
  if(A.off())return;
  nz('bandpass',1800,1.4,0.05,0.5);
  osc('sine',1100,900,0.02,0.15,0.1);
  nz('highpass',4200,2,0.02,0.06,0.32);   // the carrier crackle at the end
}

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
/* the base map's camera: zoom 1 fits the whole mountain; drag to pan, wheel or pinch to zoom (per session, not saved) */
const baseCam={z:1,x:0,y:0};
function isoFit(){
  const extW=(G.cols+G.rows)*TW2+80,extH=(G.cols+G.rows)*TH2+120;
  return Math.max(0.45,Math.min(1.5,Math.min((cssW-40)/extW,(cssH-160)/extH)));
}
function isoParams(){
  const S=isoFit()*baseCam.z;
  const ox=cssW/2-((G.cols-1)-(G.rows-1))*TW2*S/2+baseCam.x;
  const oy=(cssH-((G.cols-1+G.rows-1)*TH2)*S)/2+10+baseCam.y;
  return {S,ox,oy};
}
/* keep some of the mountain on screen whatever the pan */
function clampCam(){
  const S=isoFit()*baseCam.z,mx=(G.cols+G.rows)*TW2*S/2,my=(G.cols+G.rows)*TH2*S/2;
  baseCam.x=Math.max(-mx,Math.min(mx,baseCam.x));baseCam.y=Math.max(-my,Math.min(my,baseCam.y));
}
/* zoom by f about a screen point, so what is under it stays under it */
function zoomCam(f,px,py){
  const a=isoParams(),z=Math.max(1,Math.min(3,baseCam.z*f));
  if(z===baseCam.z)return;
  const u=(px-a.ox)/a.S,v=(py-a.oy)/a.S;
  baseCam.z=z;baseCam.x=0;baseCam.y=0;
  const b=isoParams();
  baseCam.x=px-u*b.S-b.ox;baseCam.y=py-v*b.S-b.oy;
  clampCam();
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
/* the Personnel File for a mission window (ground.js opens it on a double-click): the same file, read-only */
SR.personFile=pid=>{
  const p=G&&G.people.find(x=>x.id===pid);
  if(!p)return null;
  const gear=gearSection(p).replace(/<button class="bs-gearslot"/g,'<button class="bs-gearslot" disabled');
  return '<div class="bs-file">'+dollHTML(p)+'<div class="bs-file__main">'+dossierHead(p,'')+gear+'</div></div>';
};
/* the whole rebel, front and back, in the kit they carry now (the style guide's equipment-slots plate):
   the Personnel File's paper doll, re-drawn whenever their gear changes */
const figureCache=new Map();
function figureURL(p){
  if(p.auto||!p.id)return null;
  const key=portraitKey(p)+'|'+JSON.stringify(p.gear||{})+'|'+(p.spec2||'');
  const hit=figureCache.get(p.id);
  if(hit&&hit.key===key)return hit.url;
  try{
    const W=340,H=300,c=document.createElement('canvas');c.width=W*2;c.height=H*2;
    const g=c.getContext('2d');g.scale(2,2);
    const sp=personSpec(p),back=!!(p.gear&&p.gear.back);
    SA.character(g,back?W*0.28:W/2,H-22,sp,{view:'front',t:0,s:3.3});
    if(back)SA.character(g,W*0.73,H-22,sp,{view:'back',t:0,s:3.3});
    const url=c.toDataURL();
    figureCache.set(p.id,{key,url});
    return url;
  }catch(e){return null;}
}
function dollHTML(p){
  const u=figureURL(p);
  return u?'<div class="bs-doll"><img src="'+u+'" alt="'+esc(p.name)+' in their kit"></div>':'';
}
function faceHTML(p){
  const u=portraitURL(p);
  return u?'<img class="bs-face" src="'+u+'" alt="">':ini(p.name);
}
/* who someone is, read live from their record; nothing saved (docs/art/HANDOFF.md) */
function personSpec(p){return SA.lookOf(p);}
/* what a room's crew are doing */
function jobPose(key){return key==='workshop'?'work':key==='comms'||key==='techlab'?'hack':key==='store'?'loot':key==='training'?'aim':'idle';}
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
/* a ship seen from above, nose up, as a data URL: a small one for roster avatars (like crew portraits) and a big
   one for the ship window. Cached by what it looks like: class, door gun, damage. */
const shipTopCache=new Map();
function shipTopURL(f,W,H,k){
  const dmg=Math.round((1-Math.max(0,Math.min(100,f.hull===undefined?100:f.hull))/100)*4)/4;
  const lo=hasDoorGun(f)?{attach:['doorgun']}:undefined;
  const key=[f.cls,W,H,dmg,lo?1:0].join('|');
  if(shipTopCache.has(key))return shipTopCache.get(key);
  try{
    const c=document.createElement('canvas');c.width=W*2;c.height=H*2;
    const g=c.getContext('2d');g.scale(2,2);
    SA.ship(g,artShipId(f.cls),W/2,H/2,-Math.PI/2,k*(f.cls==='graf'?0.8:1),0,{livery:'rebel',off:true,damage:dmg,loadout:lo});
    const u=c.toDataURL();shipTopCache.set(key,u);return u;
  }catch(e){return null;}
}
/* a ship parked in an isometric space (the hangar's walk-in view, the workshop, the hangar on the base map): the art
   kit's 3D hangar model (SR_ART.hangarShip), engines cold; door guns show when the Graf has them fitted. Ships with no
   model fall back to shipIso inside the kit. ISO_K is the room view's isometric scale; s is hangarShip's size. */
const ISO_K=1.25;
function craftIso(cls,x,y,s,o){
  o=Object.assign({},o||{});
  const id=artShipId(cls),f=o.fighter;delete o.fighter;
  if(f&&hasDoorGun(f))o.loadout={attach:['doorgun']};
  SA.hangarShip(ctx,id,x,y,s,ISO_K,RM?0:worldT/1000,Object.assign({livery:'rebel',cold:true},o));
}
/* ships at true scale (C-32): the database's size class gives a length in metres, and a tile is about 10 m (100 floor
   units). A ship shrinks only as far as it must to sit inside its pad. shipFit is floor units per model unit; shipSWalk
   and shipSMap turn that into hangarShip's size in a walk-in view of scale k, or on the base map at scale S. */
const hmDims={};
function hmDim(id){
  if(hmDims[id])return hmDims[id];
  const M=SA.HM&&SA.HM[id],xs=[],ys=[1];
  if(M)for(const p of M.parts){for(const q of p.pts||[]){xs.push(q[0]);ys.push(Math.abs(q[1]));}if(p.x0!=null)xs.push(p.x0,p.x1);}
  return hmDims[id]=xs.length?{len:Math.max(...xs)-Math.min(...xs),wid:2*Math.max(...ys)}:{len:40,wid:30};
}
const shipMetres=cls=>{const row=(SRDB.raw.size_scale||[]).find(x=>x.size===shipSize(cls));return row?row.approx_length_m:16;};
function shipFit(cls,pad){
  const d=hmDim(artShipId(cls)),want=shipMetres(cls)*10/d.len;
  const fit=pad.kind==='large'?Math.min(0.9*pad.w/d.len,0.9*pad.d/d.wid):0.86*Math.min(pad.w,pad.d)/Math.max(d.len,d.wid);
  return Math.min(want,fit);
}
const shipSWalk=(f,k)=>1.426*f*k,shipSMap=(f,S)=>0.385*f*S;
const padHeading=pad=>pad.kind==='large'?{heading:0}:{};   // a hauler parks along its large pad
const hullCol=h=>h>=100?K.go:h>=60?K.gold:K.hazard;

/* ---------- Haven Rock: who is where on the map and in the walk-in views (docs/art/HANDOFF.md, "Haven Rock") ----------
   Everything here is read from the save at draw time; nothing is stored. */
const BASE_ALERT_RISK=70;   // network exposure at which the whole base pulses red (DESIGN_BLOCKERS M-33)
const baseAlert=()=>(G.risk||0)>=BASE_ALERT_RISK;
/* a cluster's real tiles as [[r,c],...] and its finished upgrades (the art reads both; upgrades still queued aren't drawn) */
function clusterCells(cl){const out=[];for(const q of cl)for(let r=q.r;r<q.r+q.h;r++)for(let c=q.c;c<q.c+q.w;c++)out.push([r,c]);return out;}
const clusterUps=cl=>[...new Set(cl.flatMap(q=>q.up||[]))];
/* the Maintenance Bay takes the most damaged ship in the hangar (advanceDay repairs it faster) */
const bayShip=()=>hangarUp('mbay')?G.fighters.filter(f=>!f.out&&f.hull<100).sort((a,b)=>a.hull-b.hull)[0]:null;
/* the kit's tile-taking upgrades (Rec Room, Surgery) only claim a tile in a room of two or more */
const convTile=(cl,k)=>clUp(cl,k)&&clusterTiles(cl)>1?1:0;
/* how many beds the art lays out in a cluster, so each cluster of a key takes the next share of sleepers */
const bedSlots=(cl,key)=>key==='barracks'?3*(clusterTiles(cl)-convTile(cl,'rec')):key==='infirmary'?2*(clusterTiles(cl)-convTile(cl,'surgery')):0;
function slotOffset(cl,key,slots){
  let n=0;
  for(const o of clustersOf(key)){if(o.includes(cl[0]))return n;n+=slots(o,key);}
  return n;
}
/* who is on which pad (pads from hangarPads()): haulers on the large pads, fighters on the small ones and then on any
   large pad left; the Maintenance Bay holds the most damaged fighter; the derelict Graf waits on a large pad; a ship on
   its way from Nyx has its pad held */
function padOccupants(pads){
  const occ=new Map(),bay=bayShip(),bayPad=pads.find(p=>p.conv==='mbay');
  const inBay=bay&&bayPad&&!isLargeShip(bay.cls)?bay:null;
  if(inBay)occ.set(bayPad,{f:inBay});
  const list=G.fighters.filter(f=>f!==inBay).map(f=>({f,cls:f.cls}));
  if(G.wreck&&!G.wreck.restored)list.push({wreck:true,cls:'graf'});
  for(const dv of (G.inbound||[]).filter(x=>x.kind==='ship'))list.push({inbound:dv,cls:dv.cls});
  const free=k=>pads.find(p=>!p.conv&&p.kind===k&&!occ.has(p));
  for(const o of list.filter(o=>isLargeShip(o.cls))){const p=free('large');if(p)occ.set(p,o);}
  for(const o of list.filter(o=>!isLargeShip(o.cls))){const p=free('small')||free('large');if(p)occ.set(p,o);}
  return occ;
}
/* a cluster's pads for the art kit, in floor units from the cluster's top-left tile */
function padsRel(cl,pads){
  const r0=Math.min(...cl.map(q=>q.r)),c0=Math.min(...cl.map(q=>q.c));
  return pads.map((p,i)=>({id:i,x:(p.c-c0)*100,y:(p.r-r0)*100,w:p.w*100,d:p.h*100,kind:p.conv==='lounge'?'lounge':p.conv==='mbay'?'bay':p.kind}));
}
/* resting and conked-out rebels sleep in the Barracks; the laid-up lie in the Infirmary */
const sleepers=()=>G.people.filter(p=>!p.auto&&((p.assign==='rest'&&!laidUp(p))||(Rebel.conked(p)&&!laidUp(p))));
const patients=()=>G.people.filter(laidUp);
const bedsFor=key=>key==='barracks'?sleepers():key==='infirmary'?patients():[];
/* the Tech Lab has no furniture in the art kit yet (DESIGN_BLOCKERS M-33): a bench of screens per tile, drawn through the
   kit's own walk-in projection so it sits on the room's real floor */
function rvProjFor(cells){
  const r0=Math.min(...cells.map(q=>q[0])),c0=Math.min(...cells.map(q=>q[1]));
  const rel=cells.map(q=>[q[1]-c0,q[0]-r0]);
  const W=(Math.max(...rel.map(q=>q[0]))+1)*100,D=(Math.max(...rel.map(q=>q[1]))+1)*100,k=400/(Math.max(W,200)+Math.max(D,200));
  return {rel,k,proj:(fx,fy,z)=>[((fx-W/2)-(fy-D/2))*1.25*k,((fx-W/2)+(fy-D/2))*0.65*k-(z||0)*k]};
}
function techBenches(proj,rel,k,t,unit){
  const col=rcol('techlab'),posts=[];
  const quad=pts=>{ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();};
  rel.slice().sort((a,b)=>(a[0]+a[1])-(b[0]+b[1])).forEach(([tx,ty],i)=>{
    const x=tx*100+22,y=ty*100+34,w=56,d=20,h=12;
    quad([proj(x,y+d,0),proj(x+w,y+d,0),proj(x+w,y+d,h),proj(x,y+d,h)]);ctx.fillStyle='#3e4250';ctx.fill();
    quad([proj(x+w,y,0),proj(x+w,y+d,0),proj(x+w,y+d,h),proj(x+w,y,h)]);ctx.fillStyle='#30333e';ctx.fill();
    quad([proj(x,y,h),proj(x+w,y,h),proj(x+w,y+d,h),proj(x,y+d,h)]);ctx.fillStyle='#4a4e5a';ctx.fill();
    ctx.lineWidth=Math.max(0.6,1.4*unit);ctx.strokeStyle=K.ink;ctx.stroke();
    for(let s=0;s<2;s++){
      const sx=x+6+s*26;
      quad([proj(sx,y+4,h+2),proj(sx+20,y+4,h+2),proj(sx+20,y+4,h+20),proj(sx,y+4,h+20)]);
      ctx.fillStyle=TH.rgba(col,0.35+0.25*Math.abs(Math.sin(t*3+i+s)));ctx.fill();ctx.stroke();
    }
    posts.push({x:x+w/2,y:y+d+16,pose:'hack',emote:'💻',sparks:i===0?1:0});
  });
  return posts.map(q=>{const p=proj(q.x,q.y,0);return Object.assign({},q,{x:p[0],y:p[1]});});
}
/* free rebels wander the corridors: the longest straight runs of floor tiles */
function corridorRuns(){
  const runs=[],fl=(r,c)=>G.grid[r]&&G.grid[r][c]&&G.grid[r][c].t==='floor';
  for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){
    if(fl(r,c)&&!fl(r,c-1)){let e=c;while(fl(r,e+1))e++;if(e>c)runs.push({r0:r,c0:c,r1:r,c1:e,n:e-c});}
    if(fl(r,c)&&!fl(r-1,c)){let e=r;while(fl(e+1,c))e++;if(e>r)runs.push({r0:r,c0:c,r1:e,c1:c,n:e-r});}
  }
  return runs.sort((a,b)=>b.n-a.n);
}
/* far to near. Rock is raised, so its cliffs must overlap the rooms behind it, and room walls must overlap the rock
   behind them: a tile south or east of a room is drawn after it, one north or west before it, and the rest by depth */
function baseDrawOrder(items){
  const roomAtCell=new Map();
  items.forEach((it,i)=>{if(it.cells)for(const [r,c] of it.cells)roomAtCell.set(r+','+c,i);});
  const after=items.map(()=>new Set()),need=items.map(()=>0);
  const edge=(a,b)=>{if(a!==b&&!after[a].has(b)){after[a].add(b);need[b]++;}};
  const near=(r,c,dirs)=>{const s=new Set();for(const [dr,dc] of dirs){const i=roomAtCell.get((r+dr)+','+(c+dc));if(i!==undefined)s.add(i);}return s;};
  const BEHIND=[[-1,0],[0,-1],[-1,-1]],AHEAD=[[1,0],[0,1],[1,1]];
  items.forEach((it,i)=>{
    const cells=it.cells||(it.r!==undefined?[[it.r,it.c]]:[]);
    const back=new Set(),front=new Set();
    for(const [r,c] of cells){near(r,c,BEHIND).forEach(j=>back.add(j));near(r,c,AHEAD).forEach(j=>front.add(j));}
    for(const j of back)if(!front.has(j))edge(j,i);   // a room behind it is drawn first, one ahead of it after it
    for(const j of front)if(!back.has(j))edge(i,j);   // (a tile in an L's inside corner, both at once, falls back on depth)
  });
  const out=[],done=items.map(()=>false);
  for(let n=0;n<items.length;n++){
    let best=-1;
    for(let i=0;i<items.length;i++)if(!done[i]&&!need[i]&&(best<0||items[i].d<items[best].d))best=i;
    if(best<0)for(let i=0;i<items.length;i++)if(!done[i]&&(best<0||items[i].d<items[best].d))best=i;   // a cycle: break it by depth
    done[best]=true;out.push(items[best]);
    for(const j of after[best])need[j]--;
  }
  return out;
}

/* ---------- base map render ---------- */
function renderBase(now){
  const t=RM?0:now/1000,Lb=TH.labelLayer(),{S}=isoParams(),alert=baseAlert();
  const cn=[cellToCss(-0.5,-0.5),cellToCss(-0.5,G.cols-0.5),cellToCss(G.rows-0.5,G.cols-0.5),cellToCss(G.rows-0.5,-0.5)];
  SA.baseBackdrop(ctx,cssW,cssH,t,{alert,mountain:[[cn[0][0],cn[0][1]-60*S],[cn[1][0]+40*S,cn[1][1]-20*S],[cn[1][0]+40*S,cn[1][1]+30*S],
    [cn[2][0],cn[2][1]+40*S],[cn[3][0]-40*S,cn[3][1]+30*S],[cn[3][0]-40*S,cn[3][1]-20*S]]});
  const crew=G.people.filter(p=>!p.auto&&p.assign!=='mission'&&!offDuty(p));
  const digger=(r,c)=>crew.length?personSpec(crew[(r*3+c)%crew.length]):undefined;
  const items=[];
  const notRock=(r,c)=>!G.grid[r]||!G.grid[r][c]||G.grid[r][c].t!=='rock';
  for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){
    const cell=G.grid[r][c];
    if(cell.t==='room')continue;
    items.push({d:r+c,r,c,fn:()=>{
      const [x,y]=cellToCss(r,c);
      if(cell.t==='rock')SA.baseTile(ctx,'rock',x,y,S,{r,c,openS:notRock(r+1,c),openE:notRock(r,c+1)});
      else if(cell.t==='rubble'){
        SA.baseTile(ctx,'rubble',x,y,S,{r,c,dig:cell.dig||0,t,digger:cell.dig?digger(r,c):undefined});
        if(cell.dig)Lb.add(cell.dig+'d',x,y+16*S+4,{color:K.go,size:12},1);
      }
      else SA.baseTile(ctx,'floor',x,y,S,{r,c});
    }});
  }
  const allPads=hangarPads(),occ=padOccupants(allPads);
  for(const rm of G.rooms.filter(rm=>clusterOf(rm)[0]===rm)){
    const cl=clusterOf(rm),cells=clusterCells(cl);   // a merged room is drawn once, on its real tiles
    cl.h=Math.max(...cl.map(q=>q.r+q.h))-Math.min(...cl.map(q=>q.r));
    const r0=Math.min(...cells.map(q=>q[0])),c0=Math.min(...cells.map(q=>q[1]));
    const myPads=rm.key==='hangar'?allPads.filter(p=>cl.includes(p.rm)):[],rel=padsRel(cl,myPads);
    items.push({d:r0+c0+0.1,cells,fn:()=>{
      const res=SA.baseRoom(ctx,cells,rm.key,cellToCss,S,{up:clusterUps(cl),build:rm.build,t,pads:rm.key==='hangar'?rel:undefined,
        fill:rm.key==='store'?G.supplies/supCap():undefined,worker:crew.length?personSpec(crew[0]):undefined});
      const [x,y]=roomCenter(rm);
      if(rm.build){TH.marker(ctx,x,y-2*S,{icon:'work',color:K.gold,t,size:26});}
      else{
        if(rm.key==='techlab'){const P=cellToCss;   // the kit has no Tech Lab furniture yet: two glowing screens per tile
          for(const [r,c] of cells){const [tx,ty]=P(r,c);for(let s=0;s<2;s++){ctx.fillStyle=TH.rgba(rcol('techlab'),0.35+0.3*Math.abs(Math.sin(t*3+r+c+s)));ctx.fillRect(tx-9*S+s*10*S,ty-8*S,7*S,5*S);ctx.strokeStyle=K.ink;ctx.lineWidth=1;ctx.strokeRect(tx-9*S+s*10*S,ty-8*S,7*S,5*S);}}}
        if(rm.key==='hangar')for(const pad of res.pads){
          const b=occ.get(myPads[pad.id]),rp=rel[pad.id];
          if(!b||b.inbound||(b.f&&b.f.out))continue;
          const cls=b.wreck?'graf':b.f.cls,s=shipSMap(shipFit(cls,rp),S);
          if(b.wreck)craftIso('graf',pad.x,pad.y,s,Object.assign({livery:'civ',damage:0.5},padHeading(rp)));
          else craftIso(cls,pad.x,pad.y,s,Object.assign({damage:1-b.f.hull/100,fighter:b.f},padHeading(rp)));
        }
        const staff=crewIn(rm.key);
        if(staff.length&&res.posts.length&&clustersOf(rm.key)[0].includes(rm)){const p=res.posts[0];
          SA.character(ctx,p.x,p.y,personSpec(staff[0]),{view:'front',state:p.pose||'idle',t:t+rm.c,s:0.42*S});}
        const lying=bedsFor(rm.key),bo=slotOffset(cl,rm.key,bedSlots);
        res.beds.forEach((b,i)=>{const p=lying[bo+i];if(p)SA.character(ctx,b.x,b.y,personSpec(p),{view:'front',state:'down',fall:1,t,s:0.36*S,weapon:null});});
      }
      const ly=y+TH2*(cl.h===1?0.9:1.6)*S+12;
      Lb.add(ROOMS[rm.key].name+(rm.build?' · '+rm.build.days+'d':''),x,ly,{color:rm.build?K.gold:rcol(rm.key),size:12},rm.build?1:2);
    }});
  }
  // ambient life: free rebels walking the corridors, back and forth
  const free=crew.filter(p=>!p.assign),runs=corridorRuns();
  free.slice(0,Math.min(2,runs.length)).forEach((p,i)=>{
    const run=runs[i],len=run.n,ph=((t*0.6/Math.max(1,len))+i*0.37)%2,k=ph<1?ph:2-ph,back=ph>=1;
    const rr=run.r0+(run.r1-run.r0)*k,cc=run.c0+(run.c1-run.c0)*k,along=run.c1>run.c0;
    items.push({d:rr+cc+0.5,fn:()=>{const [wx,wy]=cellToCss(rr,cc);
      SA.character(ctx,wx,wy+4*S,personSpec(p),{view:'side',dir:(along?1:-1)*(back?-1:1),state:'walk',t:t+i,s:0.4*S});}});
  });
  for(const it of baseDrawOrder(items))it.fn();
  Lb.flush(ctx);   // room names after every tile
  // hover / selection: whole-room outlines
  const hovRm=hoverCell?roomAt(hoverCell.r,hoverCell.c):null;
  if(hovRm){roomOutline(hovRm);ctx.lineWidth=2.5;ctx.strokeStyle=TH.rgba(K.gold,0.85);ctx.stroke();}
  else if(hoverCell){
    const [x,y,S]=cellToCss(hoverCell.r,hoverCell.c);
    diamond(x,y,S,1);ctx.strokeStyle=TH.rgba(K.gold,0.8);ctx.lineWidth=2;ctx.stroke();
  }
  if(tilePopAt){
    if(tilePopAt.room){roomOutline(tilePopAt.room);ctx.strokeStyle=K.gold;ctx.lineWidth=3;ctx.stroke();}
    else {
      const [x,y,S]=cellToCss(tilePopAt.r,tilePopAt.c);diamond(x,y,S,0);ctx.strokeStyle=K.gold;ctx.lineWidth=3;ctx.stroke();
      const bl=G.grid[tilePopAt.r][tilePopAt.c].t==='floor'&&hangarBlockAt(tilePopAt.r,tilePopAt.c);   // where a Hangar section would go
      if(bl){
        const P=(r,c)=>cellToCss(r,c),a=P(bl.r-0.5,bl.c-0.5),b=P(bl.r-0.5,bl.c+3.5),c2=P(bl.r+3.5,bl.c+3.5),d=P(bl.r+3.5,bl.c-0.5);
        ctx.save();ctx.setLineDash([6,5]);ctx.lineWidth=2;ctx.strokeStyle=TH.rgba(K.shield,0.8);
        ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c2[0],c2[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();ctx.stroke();ctx.restore();
      }
    }
  }
}

/* ---------- Support specialties on screen: the room's crew and Jobs, the personnel file, the job window ---------- */
const TYPE_TAG={job:['Job','info'],rule:['Rule','progress'],posting:['Posting','friend']};
const typeTag=u=>wTag(TYPE_TAG[u.t][0],TYPE_TAG[u.t][1]);
const needsLine=u=>u.live?'':'<br><span class="sr-faint">Not working yet: needs '+esc(SP.NEEDS[u.needs]||'a later build')+'.</span>';
/* their place in the room: Department Head, Lead Specialist, Staff */
function roomRole(p){
  const key=p.assign.startsWith('room:')?p.assign.slice(5):null;
  if(!key||!crewIn(key).includes(p))return '';
  const r=[];
  if(headOf(key)===p)r.push('Department Head');
  if(nicheOf(p))r.push(leadOf(p.niche)===p?'Lead '+SP.NICHE[p.niche].n:'Staff');
  return r.join(' · ');
}
/* what they are doing today */
function doingLine(p){
  const j=busyJob(p);
  if(j){const u=SP.UK[j.k];return u.n+(j.label?': '+j.label:'')+(JOBS[j.k]&&JOBS[j.k].ongoing?'':' · '+Math.max(1,Math.ceil(j.days))+'d');}
  const m=G.missions.find(x=>x.state==='prog'&&(x.ctl===p.id||(x.sjobs||[]).some(j=>j.pid===p.id)));
  if(m)return 'Supporting '+m.name;
  const t=(G.dip||[]).find(x=>x.pid===p.id);
  if(t)return 'Outreach: '+pdef(t.loc).name+' · '+t.days+'d';
  if(p.nicheTrain)return 'In the classroom: '+SP.NICHE[p.nicheTrain.k].n+' · '+Math.max(1,Math.ceil(p.nicheTrain.days))+'d';
  return '';
}
/* the standing Jobs a home room is running today, in a line */
function standingLine(key){
  const nm=id=>{const q=G.people.find(x=>x.id===id);return q?q.name.split(' ')[0]:'?';};
  if(key==='infirmary'){
    const tb=treatedBy(),rh=inRehab(),ids=Object.keys(tb);
    return (ids.length?'Treating: '+ids.map(id=>nm(id)+(rh[id]?' (+rehab)':'')).join(', '):(crewIn(key).some(p=>p.sspec==='doctor')?'No patients.':''));
  }
  if(key==='workshop'){const c=repairCrew();return c.size?'Repairing: '+[...c].map(([x,m])=>x.name+' ('+m.name.split(' ')[0]+', '+mechRate(m)+'%/day)').join(', '):'';}
  if(key==='comms'){const n=coveredSources('intel','comms',RU.processing_sources,'i').size;return n?'Processing '+n+' Source'+(n>1?'s':'')+' (+'+pctOf(RU.processing_bonus)+'% Intel)':'';}
  if(key==='store'){const n=coveredSources('logistics','store',RU.handling_sources,'s').size;return n?'Handling '+n+' Source'+(n>1?'s':'')+' (+'+pctOf(RU.handling_bonus)+'% Supplies)':'';}
  if(key==='training'){const t=[...tutored()].map(nm);return t.length?'Tutoring: '+t.join(', '):'';}
  return '';
}
function crewSection(key){
  const spec=SP.specOfRoom(key);
  if(!spec)return '';
  const cap=roomCap(key),all=postedTo(key);
  let h='<div class="sr-h3">'+esc(SP.SPEC[spec].n)+'s at work <span class="sr-faint">'+all.length+'/'+cap+'</span></div>';
  if(!all.length)return h+'<p class="sr-p sr-faint">Nobody works here. Put a '+esc(SP.SPEC[spec].n)+' to work from their file.</p>';
  h+='<div class="sr-stack">'+all.map(p=>{
    const off=!crewIn(key).includes(p);
    const n=nicheOf(p),many=n&&crewIn(key).filter(q=>q.niche===n).length>1,lead=n&&leadOf(n)===p;
    const pend=n&&(G.leads||{})[n]&&G.leads[n].id===p.id&&G.day<G.leads[n].from;
    return '<div class="sr-card'+(off?' is-locked':'')+'"><div class="sr-card__top"><button class="sr-btn sr-btn--sm sr-btn--ghost" data-pfile="'+p.id+'" title="Open their file">'+esc(p.name)+'</button>'+
      wTag(SP.title(p)+' · L'+p.level,'friend')+'</div>'+
      '<div class="sr-card__body" style="margin-bottom:0">'+(roomRole(p)?'<b class="bs-good">'+esc(roomRole(p))+'</b><br>':'')+(off?'Off duty today.':esc(doingLine(p)||'At their desk.'))+
      (many&&!lead&&!off?' '+rbtn('data-lead="'+n+':'+p.id+'"',pend?'Takes over tomorrow':'Make Lead',!!pend,'sr-btn--sm sr-btn--ghost'):'')+'</div></div>';
  }).join('')+'</div>';
  const st=standingLine(key);
  if(st)h+='<p class="sr-fine">'+esc(st)+'</p>';
  return h;
}
/* Jobs in this room: what is running, and what each free specialist can start */
function jobsSection(key){
  const run=sjobs().filter(j=>SP.UK[j.k]&&SP.UK[j.k].niche&&nicheRoom(SP.UK[j.k].niche)===key);
  let h='';
  for(const j of run){
    const p=G.people.find(x=>x.id===j.pid),u=SP.UK[j.k],d=JOBS[j.k];
    h+='<div class="sr-tag sr-tag--progress">'+esc(u.n)+(j.label?' · '+esc(j.label):'')+(p?' · '+esc(p.name.split(' ')[0]):'')+(d&&d.ongoing?'':' · '+Math.max(1,Math.ceil(j.days))+'d')+'</div>'+
      (d&&d.ongoing?rbtn('data-sjstop="'+j.id+'"','Stop',false,'sr-btn--sm sr-btn--ghost'):'');
  }
  const btns=[];
  for(const p of crewIn(key))if(jobFree(p))for(const k of jobsFor(p)){
    const d=JOBS[k],ready=!d.cd||cdReady(k),any=d.targets().length>0;
    btns.push(rbtn('data-sjob="'+p.id+'|'+k+'" title="'+esc(SP.UK[k].d)+'"',esc(p.name.split(' ')[0])+': '+esc(SP.UK[k].n),!ready||!any,'sr-btn--sm'));
  }
  if(!h&&!btns.length)return '';
  return '<div class="sr-h3">Jobs</div>'+(h?'<div class="sr-stack">'+h+'</div>':'')+(btns.length?'<div class="bs-chips">'+btns.join('')+'</div>':'');
}
/* the job window: pick what the Job works on */
function sjobHTML(a){
  const p=G.people.find(x=>x.id===a.pid),d=JOBS[a.k],u=SP.UK[a.k];
  if(!p||!d)return '';
  const ts=d.targets(),c=d.cost();
  const meta=(bundleHTML(c,WALLET())||'')+(d.ongoing?wTag('Until stopped'):wTag(d.days()+'d'));
  const list=ts.length?ts.map(t=>{
    const opts=t.opts||[[null,u.n]];
    return '<div class="sr-card"><div class="sr-card__top"><span class="sr-card__title">'+esc(t.label)+'</span></div><div class="sr-card__acts">'+
      opts.map(o=>{const why=jobWhy(p,a.k,t.id,o[0]);return rbtn('data-sjgo="'+p.id+'|'+a.k+'|'+t.id+'|'+(o[0]||'')+'"'+(why?' title="'+esc(why)+'"':''),esc(o[1]),!!why,'sr-btn--sm sr-btn--primary');}).join('')+'</div></div>';
  }).join(''):'<div class="sr-empty">Nothing to work on right now.</div>';
  return wHead(u.n,{tags:typeTag(u)})+wBody('<p class="sr-p">'+esc(u.d)+'</p><p class="sr-p"><b>'+esc(p.name)+'</b> runs it. '+meta+'</p><div class="sr-stack">'+list+'</div>');
}
/* the personnel file's Specialty section for a Support rebel */
function supportCard(p){
  const S=SP.SPEC[p.sspec];
  if(!S)return '';
  const n=nicheOf(p);
  let h='<div class="sr-h3">Specialty</div><div class="sr-card sr-card--friend"><div class="sr-card__top"><span class="sr-card__title">'+esc(S.n)+(n?' · '+esc(SP.NICHE[n].n):'')+'</span>'+(roomRole(p)?wTag(roomRole(p),'good'):'')+'</div>'+
    '<div class="sr-card__body">'+esc(n?SP.NICHE[n].d:S.d)+'<br><span class="sr-faint">Works in the '+esc(ROOMS[S.room].name)+(hasRoom(S.room)?'':' (not built yet)')+'.</span>'+
    (doingLine(p)?'<br>Now: '+esc(doingLine(p)):'')+'</div></div>';
  h+='<div class="sr-stack">'+SP.baseOf(p.sspec).map(u=>'<div class="sr-card'+(u.live?'':' is-locked')+'"><div class="sr-card__top"><span class="sr-card__title">'+esc(u.n)+'</span>'+typeTag(u)+'</div><div class="sr-card__body" style="margin-bottom:0">'+esc(u.d)+needsLine(u)+'</div></div>').join('')+'</div>';
  if(n){
    const fd=SP.forkDue(p);
    h+='<div class="sr-h3">'+esc(SP.NICHE[n].n)+' unlocks</div><div class="sr-stack">'+SP.unlocksOf(n).map(u=>{
      const got=SP.reached(p,u),other=u.f&&p.forks&&p.forks[u.lv]&&p.forks[u.lv]!==u.f,due=fd===u.lv;
      const state=got?wTag('Unlocked','good'):other?wTag('Not chosen'):due?wTag('Choose','action'):wTag('Level '+u.lv);
      return '<div class="sr-card'+(got?' sr-card--good':other||!u.live?' is-locked':'')+'"><div class="sr-card__top"><span class="sr-card__title">'+u.lv+(u.f||'')+' · '+esc(u.n)+'</span>'+typeTag(u)+state+'</div>'+
        '<div class="sr-card__body" style="margin-bottom:0">'+esc(u.d)+(u.lead?' <span class="sr-faint">(Lead only)</span>':'')+needsLine(u)+
        (due?'<div class="sr-card__acts" style="margin-top:8px">'+rbtn('data-fork="'+p.id+':'+u.lv+':'+u.f+'"','Choose '+esc(u.n),false,'sr-btn--sm sr-btn--primary')+'</div>':'')+'</div></div>';
    }).join('')+'</div>';
    if(fd)h+='<p class="sr-fine">A fork: the choice is for good. A Lead’s Rule fork applies in the room; a Job fork stays with whoever chose it.</p>';
  } else if(p.nicheTrain){
    h+='<p class="sr-p">In the classroom: <b>'+esc(SP.NICHE[p.nicheTrain.k].n)+'</b>, '+Math.max(1,Math.ceil(p.nicheTrain.days))+' day'+(Math.ceil(p.nicheTrain.days)>1?'s':'')+' to go. They keep working meanwhile.</p>';
  } else {
    h+='<div class="sr-h3">Niche</div><p class="sr-p">'+(p.level<3?'At level 3 they can train a niche in the Training Hall’s classroom ('+C(RU.niche_train_cost)+', '+nicheDays()+' day'+(nicheDays()>1?'s':'')+'; they keep working meanwhile).':'Ready for the classroom: '+C(RU.niche_train_cost)+', '+nicheDays()+' day'+(nicheDays()>1?'s':'')+'. They keep working meanwhile.')+'</p>'+
      '<div class="sr-stack">'+S.niches.map(k=>{const why=nicheWhy(p,k);
        return '<div class="sr-card'+(nicheLive(k)?'':' is-locked')+'"><div class="sr-card__top"><span class="sr-card__title">'+esc(SP.NICHE[k].n)+'</span>'+wTag(SP.unlocksOf(k).filter(u=>u.live).length+'/5 working')+'</div><div class="sr-card__body" style="margin-bottom:0">'+esc(SP.NICHE[k].d)+
          (p.level>=3?'<div class="sr-card__acts" style="margin-top:8px">'+rbtn('data-niche="'+p.id+':'+k+'"'+(why?' title="'+esc(why)+'"':''),'Train',!!why,'sr-btn--sm')+(why?'<span class="sr-fine bs-inline">'+esc(sentence(why))+'</span>':'')+'</div>':'')+'</div></div>';
      }).join('')+'</div>';
  }
  return h;
}
/* the classroom row of the Specialty Training window */
function classroomHTML(){
  const tr=trainees('Support'),cap=spaceCap();
  let h='<div class="sr-h3">Classroom · support</div>';
  h+=Array.from({length:cap},(_,i)=>{const t=tr[i];return '<div class="sr-slot'+(t?' is-filled':'')+'" style="cursor:default"><span><span class="sr-slot__label">Classroom</span>'+(t?'<span class="sr-slot__name">'+t.name+'</span><span class="bs-sub">'+SP.NICHE[t.nicheTrain.k].n+' · '+Math.max(1,Math.ceil(t.nicheTrain.days))+' day'+(Math.ceil(t.nicheTrain.days)>1?'s':'')+' left</span>':'Free')+'</span></div>';}).join('');
  const els=G.people.filter(p=>isSupport(p)&&p.level>=3&&!p.niche&&!p.nicheTrain);
  if(!els.length)return h+'<div class="sr-empty">Nobody ready. A niche needs level 3.</div>';
  return h+'<div class="sr-stack">'+els.map(p=>'<div class="sr-card sr-card--progress"><div class="sr-card__top"><span class="sr-card__title">'+p.name+'</span><span class="bs-from">'+esc(SP.SPEC[p.sspec].n)+' · level '+p.level+'</span></div>'+
    '<div class="sr-card__acts" style="margin-top:8px">'+SP.SPEC[p.sspec].niches.filter(nicheLive).map(k=>{const why=nicheWhy(p,k);return rbtn('data-niche="'+p.id+':'+k+'" title="'+esc(why||SP.NICHE[k].d)+'"',SP.NICHE[k].n,!!why,'sr-btn--sm');}).join('')+'</div></div>').join('')+'</div>';
}
/* the planning board: what the base sends with this mission */
function plJobPicks(){return Object.keys((PL&&PL.sj)||{}).filter(k=>PL.sj[k]).map(k=>({k,pid:PL.sj[k]}));}
/* ---------- room interior view ---------- */
function enterRoomView(rm){
  if(rm.build)return;
  viewRoom=rm;closeTilePop();
  renderRoomBar();
  $('roomViewBar').hidden=false;
  syncUI();
}
function exitRoomView(){viewRoom=null;$('roomViewBar').hidden=true;}
/* an action button that opens a window / runs a room job */
const rbtn=(attrs,label,dis,cls)=>'<button class="sr-btn'+(cls?' '+cls:'')+'" '+attrs+(dis?' disabled':'')+'>'+label+'</button>';
function renderRoomBar(){
  const rm=viewRoom;if(!rm)return;
  const R=ROOMS[rm.key],bar=$('roomViewBar');
  let info='';
  if(rm.key==='hangar'){
    const rate=repairBase();
    const pc=padCounts();
    info='Pads '+pc.L+' large · '+pc.S+' small · '+G.fighters.length+' ship'+(G.fighters.length===1?'':'s')+' · repairs '+(rate+(hangarUp('arm')?5:0))+'%/day at '+M(repairCost())+' each'+(hasRoom('workshop')?' (faster for a craft a Mechanic is working on)':'');
    if(rm.key==='hangar'&&G.wreck&&!G.wreck.restored)info+='<br>A derelict <b>Graf Hauler</b> sits under ten years of dust. Joss swears she’ll fly.';
  } else if(rm.key==='barracks'){
    info='Bunks '+bunksUsed()+'/'+bunkCap()+' · '+clusterTiles(clusterOf(rm))+' rooms · morale '+Math.round(G.morale)+
      '<br>Recruits come through the network. Work your sources; when one signals about people, follow it.';
  } else if(rm.key==='store'){
    info=C(Math.round(G.credits))+' '+S(Math.round(G.supplies))+'/'+supCap()+' '+I(Math.round(G.intel))+
      '<br>Armory: '+G.armory.map(a=>a.name+' ×'+a.n).join(' · ');
  } else if(rm.key==='infirmary'){
    const patients=G.people.filter(laidUp);
    const treating=G.people.filter(p=>!laidUp(p)&&(p.cond||[]).length);
    info='Med Packs '+stockOf('medpack')+'/'+packCap()+' (8 supplies each, a new one every '+(headOf('infirmary')?2:3)+' days) · Patients: '+(patients.length?patients.map(p=>p.name+' ('+outDays(p)+'d)').join(', '):'none')+(treating.length?' · Recovering: '+treating.map(p=>p.name.split(' ')[0]+' ('+p.cond.map(c=>Rebel.CONDK[c.k].n).join(', ')+')').join('; '):'')+' · recovery '+(Math.round(healRate()*100)/100)+'/day untreated';
  } else if(rm.key==='training'){
    const tr=G.people.filter(p=>p.assign==='train');
    info='Training: '+(tr.length?tr.map(p=>p.name).join(', '):'nobody. The mats are lonely.')+(drillOn()?' · an Instructor drills them (+'+pctOf(RU.drill_xp_mult-1)+'% XP)':'');
  } else if(rm.key==='comms'){
    info='Source capacity '+G.sources.filter(s=>s.alive).length+'/'+sourceCap()+' · '+tilesOf('comms')+' room'+(tilesOf('comms')>1?'s':'')+(headOf('comms')?' · +'+tilesOf('comms')*RU.comms_intel+' Intel a day':' · <span class="bs-bad">no Intelligence Officer: no Intel</span>');
  } else if(rm.key==='diplo'){
    info='Teams out '+(G.dip||[]).length+'/'+dipCapacity();
  } else if(rm.key==='command'){
    info='Revolution progress '+Math.round(G.renown)+'/100 · network exposure '+Math.round(G.risk);
  } else if(rm.key==='workshop'){
    info='Repair pace '+repairBase()+'%/day untended';
  } else if(rm.key==='techlab'){
    info='Electronics, hacking and comms.'+(headOf('techlab')?' Maintenance: a used Med Pack, grenade or charge comes back '+pctOf(headScale('techlab',RU.maintenance_min,RU.maintenance_max))+'% of the time.':'');
  }
  info+=crewSection(rm.key);
  /* cards (upgrades, patrols, the derelict) sit in the body; window-openers sit in the foot */
  let cards='',acts='';
  if(rm.key==='command')acts=rbtn('data-open="missions"','Mission Board')+rbtn('data-open="sources"','Source Network');
  if(rm.key==='command')cards+=recruitCard();
  if(rm.key==='infirmary')cards+=prostheticCards();
  cards+=jobsSection(rm.key);
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
  if(rm.key==='hangar'){   // each half of a section: two small pads or one large pad (C-32)
    for(const sec of clusterOf(rm))(sec.halves||[]).forEach((k,h)=>{
      const blk=flipBlocked(sec,h),many=clusterOf(rm).length>1;
      cards+='<div class="sr-card bs-build"><div class="sr-card__top"><span class="sr-card__title">'+(many?'Section '+(clusterOf(rm).indexOf(sec)+1)+', ':'')+(h?'near':'far')+' half: '+(k==='L'?'one large pad':'two small pads')+'</span></div>'+
        '<div class="sr-card__body">'+(k==='L'?'Room for a hauler or light freighter.':'Room for two fighters.')+(blk?' <span class="bs-bad">'+blk+'</span>':'')+'</div>'+
        '<div class="bs-build__row"><span class="sr-card__meta">Free</span>'+rbtn('data-flip="'+sec.id+':'+h+'"'+(blk?' title="'+esc(blk)+'"':''),k==='L'?'Split into two small pads':'Make one large pad',!!blk,'sr-btn--sm')+'</div></div>';
    });
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
  const fnt=(px,wt)=>(wt||700)+' '+Math.max(px,Math.ceil(11/Sx))+'px '+TH.FONT.ui;   // never below 11 screen px
  const dtv=Math.min(0.05,(now-(rvLast||now))/1000);rvLast=now;
  if(RM)now=0;   // reduced motion: the room holds still
  const t=now/1000;
  rvFigs=[];
  const spark=(fx,fy,scol)=>{
    if(RM)return;
    rvParts.push({x:fx,y:fy,vx:(rng()-0.5)*60,vy:-20-rng()*50,life:0,max:0.4+rng()*0.3,col:scol||K.goldHi});
  };
  const label=(txt,x,y,col,px,wt)=>{ctx.font=fnt(px||12,wt);ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText(txt,x,y);};
  /* the room itself: walls, floor, lamps and furniture on the cluster's real tiles, from the art kit (docs/art/HANDOFF.md) */
  const cl=clusterOf(rm),cells=clusterCells(cl);
  const allPads=rm.key==='hangar'?hangarPads():[],myPads=allPads.filter(p=>cl.includes(p.rm)),rel=padsRel(cl,myPads);
  ctx.save();
  ctx.translate(cx,cy);
  ctx.scale(Sx,Sx);
  const res=SA.roomInterior(ctx,rm.key,{tiles:cells,up:clusterUps(cl),build:rm.build,t,alert:baseAlert(),pads:rm.key==='hangar'?rel:undefined,
    fill:rm.key==='store'?G.supplies/supCap():undefined});
  const k=res.scale;
  let posts=res.posts;
  if(rm.key==='techlab'){const P=rvProjFor(cells);posts=techBenches(P.proj,P.rel,P.k,t,P.k);}
  /* a Bobblehead in the room; S matches the old stick-figure scale, so the kit's s = 1.05 × the room's scale */
  const addFig=(fx,fy,p,pose)=>{
    figure(fx,fy,2.2*k,p.name.split(' ')[0],null,p,pose||jobPose(rm.key));
    rvFigs.push({x:cx+fx*Sx,y:cy+fy*Sx,r:24,pid:p.id});
  };
  /* staff take the kit's posts in order, with each post's pose and emote; anyone past the last post stands beside one */
  const staffRoom=(list)=>{
    if(!posts.length)return;
    list.forEach((p,i)=>{
      const q=posts[i%posts.length],n=Math.floor(i/posts.length),fx=q.x+n*26*k,fy=q.y+n*14*k;
      addFig(fx,fy,p,q.pose);
      if(q.emote&&!n)SA.emote(ctx,fx+18*k,fy-58*k,q.emote,t,i);
      if(q.sparks&&!n&&rng()<0.1)spark(fx+14*k,fy-14*k);
    });
  };
  /* the resting (Barracks) and the laid up (Infirmary) lie on the kit's beds */
  const layOnBeds=(list,tag)=>{
    res.beds.forEach((b,i)=>{
      const p=list[i];if(!p)return;
      SA.character(ctx,b.x,b.y,personSpec(p),{view:'front',state:'down',fall:1,t,s:0.85*k,weapon:null});
      label(tag(p),b.x,b.y+18*k+4,rm.key==='infirmary'?K.hazard:K.text2,11,600);
      rvFigs.push({x:cx+b.x*Sx,y:cy+b.y*Sx,r:22,pid:p.id});
    });
  };
  if(rm.build){/* scaffolding and a builder: the kit draws it all */}
  else if(rm.key==='hangar'){
    /* the pads of this Hangar's sections (C-32): haulers on large pads, fighters on small ones, the most damaged fighter
       in the Maintenance Bay; every ship drawn at its true size, shrunk only to fit its pad */
    const occ=padOccupants(allPads);
    for(const pad of res.pads){
      const rp=rel[pad.id],b=occ.get(myPads[pad.id]),ly=pad.y+(rp.kind==='large'?24*k:(rp.w+rp.d)*0.65*k*0.3);   // a large pad's label stays clear of the near half
      if(b&&b.wreck){
        craftIso('graf',pad.x,pad.y,shipSWalk(shipFit('graf',rp),k),Object.assign({livery:'civ',damage:0.5},padHeading(rp)));
        label(G.wreck.restoring?'Restoring · '+G.wreck.restoring+'d':'Derelict',pad.x,ly+6,K.gold,11);
        continue;
      }
      if(b&&b.inbound){label('Held for '+b.inbound.name,pad.x,pad.y+4,K.text3,11);continue;}
      const f=b&&b.f;
      if(f&&!f.out){
        craftIso(f.cls,pad.x,pad.y,shipSWalk(shipFit(f.cls,rp),k),Object.assign({damage:1-f.hull/100,fighter:f},padHeading(rp)));
        label(f.name+(pad.bay?' · bay':''),pad.x,ly+2,K.text);
        ctx.fillStyle=K.ink;ctx.fillRect(pad.x-27,ly+7,54,7);
        ctx.fillStyle=hullCol(f.hull);
        ctx.fillRect(pad.x-25,ly+9,50*f.hull/100,3);
        if(f.hull<100&&rng()<0.05)spark(pad.x+(rng()-0.5)*36*k,pad.y+8*k);
        rvFigs.push({x:cx+pad.x*Sx,y:cy+pad.y*Sx,r:Math.max(26,30*k*Sx),fid:f.id});
      } else label(f&&f.out?f.name+' — out':pad.bay?'Maintenance Bay':rp.kind==='large'?'Empty large pad':'Empty pad',pad.x,pad.y+4,K.text3,11);
    }
    staffRoom(crewIn('hangar'));
  } else if(rm.key==='barracks'){
    layOnBeds(sleepers().slice(slotOffset(cl,'barracks',bedSlots)),p=>p.name.split(' ')[0]);
  } else if(rm.key==='infirmary'){
    layOnBeds(patients().slice(slotOffset(cl,'infirmary',bedSlots)),p=>p.name.split(' ')[0]+' · '+outDays(p)+'d');
    const staff=crewIn('infirmary');
    staffRoom(staff);
    if(!staff.length)label('No Doctor at work — put one to work from their file',0,118,K.hazard);
  } else if(rm.key==='workshop'){
    /* the worst-hit ship in the hangar sits on the lift (the kit puts the lift on the front-most tile of a bigger room) */
    const wounded=G.fighters.find(f=>!f.out&&f.hull<100);
    const sh=SA.shapeOf(rvProjFor(cells).rel),lt=cells.length>1?sh.front[0]:sh.centre,P=rvProjFor(cells).proj;
    const [lx,ly]=P(lt.tx*100+50,lt.ty*100+50,36);
    if(wounded){
      craftIso(wounded.cls,lx,ly,shipSWalk(shipFit(wounded.cls,{w:110,d:110,kind:'small'}),k),{damage:1-wounded.hull/100,fighter:wounded});
      label(wounded.name+' — '+wounded.hull+'%',lx,ly+44*k,K.text);
      if(rng()<0.12)spark(lx+(rng()-0.5)*60*k,ly-6*k);
    } else label('Lift empty — nothing broken. For once.',lx,ly+30*k,K.text2);
    staffRoom(crewIn('workshop'));
  } else if(rm.key==='training'){
    /* trainees work the mat in front of the instructor's post */
    const tr=G.people.filter(p=>p.assign==='train'),q=posts[0]||{x:0,y:0};
    tr.forEach((p,i)=>{const a=i*2.1+now*0.0012;addFig(q.x+Math.cos(a)*44*k,q.y-26*k+Math.sin(a)*14*k,p);});
    if(!tr.length)label('Empty mats — assign rebels from their files',q.x,q.y+40*k,K.text2);
    staffRoom(crewIn('training'));
  } else staffRoom(crewIn(rm.key));   // command, store, comms, diplo, techlab
  // room-local sparks (persistent particles, not per-frame flicker)
  for(const p of rvParts){p.life+=dtv;p.x+=p.vx*dtv;p.y+=p.vy*dtv;p.vy+=160*dtv;}
  rvParts=rvParts.filter(p=>p.life<p.max);
  for(const p of rvParts){
    const a=1-p.life/p.max;
    ctx.globalAlpha=Math.max(0,a);
    ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,1.4+a*1.4,0,Math.PI*2);ctx.fill();
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
/* a potential contact on standby: dashed gold ring, not one of ours yet; clicking reopens the Approach window */
function drawCandBadge(x,y){
  ctx.beginPath();ctx.arc(x+1.5,y+2.5,11,0,7);ctx.fillStyle=TH.rgba(K.ink,.6);ctx.fill();
  ctx.beginPath();ctx.arc(x,y,11,0,7);ctx.fillStyle=TH.rgba(K.ink,.85);ctx.fill();
  ctx.save();ctx.setLineDash([3.5,3.5]);ctx.lineWidth=2.2;ctx.strokeStyle=K.gold;
  ctx.beginPath();ctx.arc(x,y,11,0,7);ctx.stroke();ctx.restore();
  TH.icon(ctx,'sneak',x,y,12,K.gold,{weight:2.4});
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
  /* sources ride a ring around their worlds; standby contacts wait beside them as un-recruited markers */
  if(gxLayers.network){
    const byW={};
    for(const sc of G.sources){if(!sc.alive)continue;const w=SRCPOS[sc.id]||'veray';(byW[w]=byW[w]||[]).push({sc});}
    for(const id of G.standby||[]){
      const cd=CANDS[id];if(!cd||G.sources.some(s=>s.id===id))continue;
      const w=SRCPOS[id]||cd.locId||'veray';(byW[w]=byW[w]||[]).push({sc:cd,stand:1});
    }
    for(const w in byW){
      const pd=pdef(w);if(!pd)continue;
      const[px,py]=gxPos(pd),R=gxR(w);
      byW[w].forEach((e,i)=>{
        const sc=e.sc;
        const a=-0.65+i*0.95;
        const x=px+Math.cos(a)*(R+18),y=py+Math.sin(a)*(R+18);
        gxSrcPos[sc.id]=[x,y];
        hold(x,y,14);
        if(e.stand){
          drawCandBadge(x,y);
          lab(sc.name.split(' ').pop(),[[x+17,y+4,'left'],[x-17,y+4,'right'],[x,y+30,'center']],K.gold,11,700,6);
          gxHitL.push({t:'c',id:sc.id,x,y,r:17});
          return;
        }
        drawSrcBadge(x,y,sc,t);
        if(srcSel&&srcSel.t==='s'&&srcSel.id===sc.id)gxSelRing(x,y,18,t);
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
    flights.push('<div class="sr-unit" style="--c:var(--sr-shield)">'+shipAvatar('',f)+
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
  c2.clearRect(0,0,w,h);   // the channel strip is the background; the flavour text lives in the strip
  for(let i=0;i<60;i++){
    c2.fillStyle=TH.rgba(K.rebel,nz()*0.18);
    c2.fillRect(nz()*w,nz()*h,1.5,1.5);
  }
  c2.strokeStyle=K.rebel;c2.lineWidth=1.5;
  c2.beginPath();
  for(let x=0;x<w;x+=3){
    const y=h/2+Math.sin(x*0.08+t*0.01)*(h*0.22)*nz()+(nz()-0.5)*h*0.25;
    x===0?c2.moveTo(x,y):c2.lineTo(x,y);
  }
  c2.stroke();
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
  const m=k==='hangar'?1+0.35*Math.max(0,roomsOf('hangar').length-1):adj?1+0.35*Math.max(0,tilesOf(k)-1):1;   // a Hangar section costs 35% more for each one past the first
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
  let nr;
  if(bk==='hangar'){   // a whole 4 × 4 section at once, four small pads to start
    const bl=hangarBlockAt(r,c);
    if(!bl)return false;
    for(let i=bl.r;i<bl.r+HANGAR_N;i++)for(let j=bl.c;j<bl.c+HANGAR_N;j++)G.grid[i][j]={t:'room',room:bk};
    nr=Object.assign(hangarSection(bl.r,bl.c,['S','S']),{build:{days:b.days}});
  } else {
    G.grid[r][c]={t:'room',room:bk};
    nr={id:'rm_'+r+'_'+c,key:bk,r,c,w:1,h:1,up:[],build:{days:b.days}};
  }
  G.credits-=b.c;G.materials-=(b.m||0);G.supplies-=(b.s||0);
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
      if(rm.key==='hangar')body+='<p class="bs-info">Pads '+padCounts().L+' large · '+padCounts().S+' small · '+G.fighters.length+' ship'+(G.fighters.length===1?'':'s')+(G.wreck&&!G.wreck.restored?' · one derelict hauler'+(G.wreck.restoring?' (restoring, '+G.wreck.restoring+'d)':''):'')+'.</p>';
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
        let adj=G.rooms.some(o=>o.key===k&&!o.build&&roomsAdj({r,c,w:1,h:1},o)),name=ROOMS[k].name,note='',why=afford?'':needWhy(b);
        if(k==='hangar'){   // a whole 4 × 4 section (C-32)
          const bl=hangarBlockAt(r,c);
          adj=!!(bl&&bl.adj);name=adj?'Hangar':'Hangar section';
          note=' <span class="sr-fine">A section takes 4 × 4 tiles: four small pads, and any half can become a large pad for a hauler.</span>';
          if(!bl){note+=' <span class="bs-bad">Needs a 4 × 4 block of cleared floor here.</span>';why='Needs a 4 × 4 block of cleared floor';}
        }
        body+='<div class="sr-card sr-card--good bs-build"><div class="sr-card__top"><span class="sr-card__title">'+(adj?'Expand the ':'')+name+'</span><span class="sr-tag">'+b.days+'d</span></div>'+
          '<div class="sr-card__body">'+ROOMS[k].desc+note+'</div>'+
          '<div class="bs-build__row"><span class="sr-card__meta">'+bundleHTML(b,WALLET())+'</span>'+rbtn('data-build="'+k+'"'+(why?' title="'+esc(why)+'"':''),'Build',!!why,'sr-btn--primary sr-btn--sm')+'</div></div>';
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
    if(!winMode&&!viewRoom&&baseView!=='galaxy'&&!arOpen&&!bmOpen&&!msOpen){pointAt($('navSources').getBoundingClientRect(),'Open the Galaxy');return;}
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
  // the Mission Board popup became the Missions tab (docs/ui/SCREENS-HANDOFF.md §4): every opener lands there
  if(mode==='missions'){if(winMode)closeWin();if(baseView!=='base')setView('base');openMissions(arg&&arg.id);return;}
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
const sizeOf={newhero:'sm',plan:'lg',srcTutIntro:'sm',srcTut:'sm',comm:'sm',newmission:'sm',opp:'sm',arrive:'sm',reward:'sm',spec:'sm',chain:'sm',locBrief:'sm',escalate:'sm',cassIntro:'sm',ship:'',recruit:'sm',candidate:'sm',person:'',silence:'sm',contract:'sm'};

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
  const tags=(p.role==='Hero'?wTag('Hero','action','star'):'')+(p.auto&&!noRank?wTag(rankFor(p),'action'):'')+(p.auto?'':wTag(specOf(p)||'Rookie',p.spec||isSupport(p)?'friend':''))+
    (!p.auto&&p.merc?wTag('Mercenary · '+Math.max(0,p.merc.until-G.day)+'d left','progress'):'')+
    (mb&&mb.k!=='mid'?wTag(mb.n+' morale',mb.tone):'')+(extra||'');
  return '<div class="bs-dz">'+(p.auto?'':'<span class="sr-avatar bs-dz__av">'+faceHTML(p)+'</span>')+'<span class="sr-level" style="--p:'+Math.round(p.xp*100)+'" aria-label="Level '+p.level+'"><b>'+p.level+'</b></span>'+
    '<div><div class="bs-dz__name">'+p.name+'</div><div class="bs-dz__tags">'+tags+'</div><div class="sr-faint bs-dz__role">'+p.role+'</div></div></div>'+
    meterBlock(p,noRank?'':rankRow(p))+heroCard(p)+traitCard(p)+expCards(p,noRank)+medicalSection(p)+skillsCard(p);
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
  if(!l.length)return quiet?'':'<div class="sr-h3">Experiences</div><p class="sr-p sr-faint">None</p>';
  return '<div class="sr-h3">Experiences <span class="sr-faint">'+l.length+'/'+Rebel.EXP_MAX+'</span></div><div class="sr-stack">'+l.map(t=>{
    const d=Rebel.RTK[t.k];
    return '<div class="sr-card sr-card--progress"><div class="sr-card__top"><span class="sr-card__title">'+esc(Rebel.expTitle(t,nameOfRebel))+'</span>'+(d.temp?wTag('Temporary','info'):'')+'</div>'+
      '<div class="sr-card__body">'+esc(Rebel.expText(t,p,nameOfRebel))+'<br><span class="sr-faint">'+esc(d.e.replace(/\{partner\}/g,t.with?nameOfRebel(t.with):'them'))+'</span></div></div>';
  }).join('')+'</div>';
}
/* a labelled bar: label, fill 0..1, value, tooltip */
const meter=(label,frac,val,color,tip)=>'<div class="sr-meter" style="--c:'+color+'"'+(tip?' title="'+esc(tip)+'"':'')+'><span>'+label+'</span><span class="sr-meter__track"><span class="sr-meter__fill" style="display:block;width:'+Math.round(Math.max(0,Math.min(1,frac))*100)+'%"></span></span><span class="sr-meter__val">'+val+'</span></div>';
/* morale and experience: the two numbers a rebel's mood and growth come down to */
function meterBlock(p,rank){
  if(p.auto||p.morale===undefined)return '';
  const b=Rebel.mband(p);
  const col=b.tone==='bad'?'var(--sr-c-bad)':b.tone==='good'?'var(--sr-go)':'var(--sr-gold)';
  return '<div class="bs-meters">'+(rank||'')+
    meter('Morale',p.morale/100,Math.round(p.morale),col,'Morale ('+b.n+') rises with wins and rest, falls with injuries and losses. At 0 they leave.')+
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
      const state=mine?'<span class="bs-good">Carrying</span>':free>0?'<span class="bs-good">'+free+' free</span>':hold.length?'':'<span class="sr-faint">All away on missions</span>';
      return pick(a.id,'<span class="bs-gearpick__n">'+IC(gearIcon(a))+'<span>'+esc(kitName(a))+'</span></span>'+((Items.get(a.id)||{}).description?'<span class="bs-sub">'+esc(Items.get(a.id).description)+'</span>':'')+state,!mine&&free<=0&&!hold.length);
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
  let h='',size=sizeOf[winMode]||'',accent=accentOf[winMode]||'',cls='';
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
    h=commHTML(winArg.src,winArg.payload);
    size='';cls=' cm-win';
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
    h=reportHTML(winArg);
    size='';cls=' rp-win'+(winArg.win?'':' rp-win--fail');
  }
  else if(winMode==='spec'){
    const row=(role,label)=>Array.from({length:spaceCap()},(_,i)=>{
      const t=trainees(role)[i];
      return '<div class="sr-slot'+(t?' is-filled':'')+'" style="cursor:default"><span><span class="sr-slot__label">'+label+'</span>'+(t?'<span class="sr-slot__name">'+t.name+'</span><span class="bs-sub">'+(t.specTrain.cross?'Cross-training: ':'')+SPECNAME[t.specTrain.k]+' · '+Math.max(1,Math.ceil(t.specTrain.days))+' day'+(Math.ceil(t.specTrain.days)>1?'s':'')+' left</span>':'Free')+'</span></div>';
    }).join('');
    const cards=role=>{
      const busy=spaceFull(role);
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
      '<div class="sr-h3">Flight simulator · pilots</div>'+row('Pilot','Flight simulator')+cards('Pilot')+later('Pilot')+classroomHTML());
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
    const dp=headOf('diplo');
    h=wHead('Diplomatic Tasks',{tags:wTag('Teams out '+out.length+'/'+cap,'info')})+wBody(
      '<p class="sr-p">'+(dp?'<b>'+dp.name+'</b> heads the Quarter. Each Diplomat working here runs one team at a time (Outreach)':'<span class="bs-bad">No Diplomat works the Quarter.</span> Put a Diplomat to work here from their file')+
      '. Each task costs '+bundleHTML(DIP_COST)+' and takes '+DIP_DAYS+' days; it raises local Support by '+fmtFlags(outreachGain())+' of a flag.</p>'+
      (out.length?'<div class="sr-h3">Out in the field</div><div class="sr-stack">'+out.map(t=>'<div class="sr-tag sr-tag--info">'+esc(t.by)+' · '+pdef(t.loc).name+' · '+t.days+' day'+(t.days>1?'s':'')+' left</div>').join('')+'</div>':'')+
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
    h=wHead('Incoming transmission',{x:false})+'<div class="sr-window__body cm-body">'+cmChan('Unregistered freighter · voices masked')+
      cmSay('CW','Cass Wender','“Told you the rock was worth it. You and your revolution, huh? Crazy! I might just stick around for a while and see where this goes. I might know some people who hate the Hegemony as much as you do. Raise me when you’re ready to listen.”')+
      cmLog('First contact on the wire: <b>Cass Wender</b>, the smuggler who flew you in. Open the <b>Galaxy</b> and raise him.')+'</div>'+
      wFoot(rbtn('data-close','Got it',false,'sr-btn--primary'));
    size='';cls=' cm-win';
  }
  else if(winMode==='recruit'){
    const cards=winArg.cards,multi=cards.length>1,batch=!!winArg.batch;
    if(!cards.length){closeWin();return;}
    const full=bunksUsed()>=bunkCap();
    const anyMust=cards.some(c=>c.must);
    /* one card keeps the classic layout (buttons in the foot); several sit side by side, each with its own */
    const cardHTML=(c,i)=>{
      const p=c.p,terms=full?'<p class="sr-p bs-bad">No bunks free — build a quarters annex first.</p>':'';
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
    size='';cls=' cm-win';
    h=candHTML(CANDS[winArg]||CANDS.marr);
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
    size='';cls=' pl-win';
    h=planHTML(m);
  }
  else if(winMode==='sjob'){
    h=sjobHTML(winArg);
    if(!h){closeWin();return;}
  }
  else if(winMode==='person'){
    const p=winArg;
    h=wHead('Personnel file')+personHTML(p)+wFoot(rbtn('data-close','Close',false,'sr-btn--primary'))+
      (rankOverlay===p.id&&!p.auto?rankOverlayHTML(p):'')+(gearOverlay&&gearOverlay.pid===p.id&&!p.auto?gearOverlayHTML(p):'');
    size='';cls=' pf-win';
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
    size='';cls=' sf-win';
    h=SS.html(shipSheetShip,f.name)+wFoot(rbtn('data-visithangar','Visit the hangar',false,'sr-btn--ghost')+rbtn('data-close','Close',false,'sr-btn--primary'),f.out?'On a mission right now':'');
  }
  else if(winMode==='news'){
    h=wHead('All news')+wBody('<div class="sr-log" id="log" aria-live="polite"></div>');
  }
  card.className='sr-window'+(size?' sr-window--'+size:'')+(accent?' sr-window--'+accent:'')+cls;
  $('winsB').classList.toggle('bs-winfull',/\b(rp|pf)-win\b/.test(cls));   // full screen on a phone
  $('winsB').classList.toggle('bs-winwide',/\bpf-win\b/.test(cls));   // the personnel file needs the whole stage
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
  card.innerHTML=h;
  const ttl=card.querySelector('.sr-window__title');if(ttl)card.setAttribute('aria-label',ttl.textContent);
  if(winMode==='news')renderNews();
  if(winMode==='ship')SR.shipSheet.paint(card,shipSheetShip);   // the stage's big top-down ship
  markWin();
}

/* ---------- the Missions tab: the briefing room (docs/ui/SCREENS-HANDOFF.md §4) ----------
   A stage view like the Galaxy and the Arsenal: the board on the left, the holo-table in the middle, the briefing
   in the rail. No command bar: Advance day stands alone bottom-right. */
let msOpen=false,msSel=null,msFilter='all';
const msList=()=>G.missions.filter(m=>m.state==='avail'||m.state==='prog'||m.state==='locked');
const msKind=m=>opKind(m);
const msRisk=m=>/high/i.test(m.riskTxt)?3:/moder/i.test(m.riskTxt)?2:1;
const MS_RISK_C=['','var(--sr-go)','var(--sr-gold)','var(--sr-hazard)'];
const msLocked=m=>m.state==='locked';
function openMissions(id){
  closeTilePop();exitRoomView();closeArsenal();closeMarket();
  msOpen=true;
  if(id)msSel=id;
  $('msView').hidden=false;
  shell.classList.add('is-missions');
  $('railBase').classList.add('bf-rail');
  setDrawer(false);
  setTopbar('Missions','Briefing room · Haven Rock');
  drawerLabel();
  renderMissions();syncTabs();
}
function closeMissions(){
  if(!msOpen)return;
  msOpen=false;
  $('msView').hidden=true;
  shell.classList.remove('is-missions');
  $('railBase').classList.remove('bf-rail');
  $('railMissions').hidden=true;
  msGo(false);
  setDrawer(false);
  setTopbar('Haven Rock','Hidden base');
  drawerLabel();syncTabs();
  if(started&&G)syncUI();   // the command bar gets its parts back
}
/* Advance day on its own: the command bar's wrapper becomes the bare .bf-go, everything else in it hidden */
function msGo(on){
  const cb=$('baseCmdbar');
  cb.classList.toggle('sr-cmdbar',!on);cb.classList.toggle('bf-go',!!on);
  for(const id of ['arWho','arOrders','gxOrders','dockNote'])if(on)$(id).hidden=true;
}
function renderMissions(){
  if(!msOpen||!G)return;
  const all=msList(),list=all.filter(m=>msFilter==='all'||msKind(m)===msFilter);
  if(!list.some(m=>m.id===msSel))msSel=(list[0]||{}).id||null;
  const m=list.find(x=>x.id===msSel)||null;
  $('msBoard').innerHTML=msBoardHTML(list,m);
  if(m&&!msLocked(m))m.seen=1;   // looking at it is reading it: its New flag goes on the next look
  $('msHolo').innerHTML=m?msHoloHTML(m):'';
  $('railMissions').innerHTML=m?msBriefHTML(m):'<div class="bf-railtitle">'+IC('missions')+'Briefing</div><div class="sr-empty">No jobs on the board. Work your sources; follow their signals.</div>';
  $('railMissions').hidden=false;
  msGo(true);
  msFit();
}
/* the briefing never scrolls: clamp the pitch (always), then the objectives to one line each, then drop their notes */
function msFit(){
  const rail=$('railBase'),b=$('railMissions').querySelector('.bf-brief');
  if(!b)return;
  b.classList.remove('is-tight','is-tighter');
  if(rail.scrollHeight>rail.clientHeight+1)b.classList.add('is-tight');
  if(rail.scrollHeight>rail.clientHeight+1)b.classList.add('is-tighter');
}
function msBoardHTML(list,sel){
  const chip=(k,l)=>rbtn('data-msfilter="'+k+'" aria-pressed="'+(msFilter===k)+'"',l,false,'sr-btn--sm');
  const cards=list.map(m=>{
    const k=msKind(m),lock=msLocked(m),r=msRisk(m);
    const src=(m.src&&srcInfo(m.src)||{}).name||m.from||'';
    const flag=lock?'<span class="bf-card__flag" style="background:var(--sr-seam);color:var(--sr-text-2)">Locked</span>':
      m.state==='prog'?'<span class="bf-card__flag" style="background:var(--sr-shield);color:var(--sr-ink)">Under way</span>':
      !m.seen?'<span class="bf-card__flag" style="background:var(--sr-gold);color:var(--sr-ink)">New</span>':'';
    return '<button class="bf-card'+(sel&&m.id===sel.id?' is-sel':'')+(lock?' is-locked':'')+(flag?' has-flag':'')+'" type="button" data-msel="'+m.id+'" aria-pressed="'+(!!sel&&m.id===sel.id)+'">'+
      '<span class="bf-card__ico">'+IC(OPKIND[k].icon)+'</span><span class="bf-card__name">'+esc(lock?'Signal encrypted':m.name)+'</span>'+
      '<span class="bf-card__meta">'+OPKIND[k].label+'<span class="bf-risk" style="--rc:'+MS_RISK_C[r]+'" title="'+esc(m.riskTxt||'')+' risk">'+[1,2,3].map(i=>'<i'+(i<=r?' class="is-on"':'')+'></i>').join('')+'</span>'+esc(src)+'</span>'+flag+'</button>';
  }).join('');
  return '<div class="bf-board__head">'+IC('missions')+'Mission board</div><div class="bf-filters">'+chip('all','All')+chip('ground','Ground')+chip('space','Space')+'</div>'+
    '<div class="bf-list">'+(cards||'<div class="sr-empty">Nothing here. Work your sources; follow their signals.</div>')+'</div>';
}
/* the label over the table: world and region (or orbit), encrypted when locked */
function msPlace(m){
  const d=m.loc&&pdef(m.loc);
  if(!d)return msKind(m)==='space'?'Open space':'Unknown';
  if(msKind(m)==='space')return d.name+' · Orbit';
  return whereHTML(m)||d.name;
}
/* where the region sits on the projected disc: the hand-tuned anchor, else a seeded spot */
function msAnchor(m){
  const a=m.region&&REGION_DECOR[m.region];
  if(a){const t=a.find(x=>x[0]==='town'||x[0]==='job')||a[0];return [t[1],t[2]];}
  const h=SR.util.hashStr((m.loc||'')+'|'+(m.region||m.id));
  return [((h%1000)/1000-0.5)*1.1,(((h>>>10)%1000)/1000-0.5)*1.1];
}
/* the world's texture as holo lines, seeded so a world always looks the same */
function msTexture(id,tex,R,cx,cy){
  let h=SR.util.hashStr(id||'x');
  const rnd=()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return (h>>>0)/4294967296;};
  const P=(u,v)=>(cx+u*R).toFixed(1)+' '+(cy+v*R).toFixed(1);
  let o='';
  if(tex==='bands')for(const v of [-.55,-.2,.15,.5])o+='<path d="M'+P(-1,v)+' Q'+P(-.5,v-.08)+' '+P(0,v)+' T'+P(1,v)+'"/>';
  else if(tex==='dunes')for(let i=0;i<9;i++){const u=rnd()*1.4-.7,v=rnd()*1.4-.7;o+='<path d="M'+P(u-.12,v)+' q'+(R*.06)+' '+(-R*.05)+' '+(R*.12)+' 0 t'+(R*.12)+' 0"/>';}
  else if(tex==='craters')for(let i=0;i<8;i++){const u=rnd()*1.4-.7,v=rnd()*1.4-.7;o+='<circle cx="'+(cx+u*R).toFixed(1)+'" cy="'+(cy+v*R).toFixed(1)+'" r="'+(R*(.05+rnd()*.07)).toFixed(1)+'"/>';}
  else if(tex==='cap')o+='<ellipse cx="'+cx+'" cy="'+(cy-R*.78)+'" rx="'+(R*.5)+'" ry="'+(R*.16)+'"/><ellipse cx="'+cx+'" cy="'+(cy+R*.82)+'" rx="'+(R*.38)+'" ry="'+(R*.12)+'"/>';
  else if(tex==='islands')for(let i=0;i<5;i++){const u=rnd()*1.2-.6,v=rnd()*1.2-.6;o+='<ellipse cx="'+(cx+u*R).toFixed(1)+'" cy="'+(cy+v*R).toFixed(1)+'" rx="'+(R*(.1+rnd()*.12)).toFixed(1)+'" ry="'+(R*(.06+rnd()*.08)).toFixed(1)+'"/>';}
  else if(tex==='cracks')for(let i=0;i<4;i++){let u=rnd()*1.2-.6,v=rnd()*1.2-.6,d='M'+P(u,v);for(let j=0;j<4;j++){u+=rnd()*.3-.1;v+=rnd()*.3-.15;d+=' L'+P(u,v);}o+='<path d="'+d+'"/>';}
  else if(tex==='river')o+='<path d="M'+P(-.9,-.3)+' C'+P(-.4,.2)+' '+P(.1,-.5)+' '+P(.9,.3)+'"/>';
  else if(tex==='grid'||tex==='flats')for(const v of [-.6,-.3,0,.3,.6])o+='<path d="M'+P(-1,v+.3)+' L'+P(1,v-.3)+'"/>';
  return o;
}
function msHoloHTML(m){
  const lock=msLocked(m),k=msKind(m),lk=WORLD_LOOK[m.loc]||{col:'#9aa6c4'};
  const cx=320,cy=250,R=k==='space'?118:150;
  const cyan='var(--sr-shield)',foe='#7aaaff';
  let svg='<defs><clipPath id="bfClip"><circle cx="'+cx+'" cy="'+cy+'" r="'+R+'"/></clipPath></defs>'+
    '<circle class="bf-spin" cx="'+cx+'" cy="'+cy+'" r="'+(R+40)+'" fill="none" stroke="'+cyan+'" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 10"/>'+
    '<circle class="bf-spin2" cx="'+cx+'" cy="'+cy+'" r="'+(R+56)+'" fill="none" stroke="'+cyan+'" stroke-opacity=".25" stroke-width="2" stroke-dasharray="30 8"/>';
  const pts=[];   // what the callouts point at
  if(lock){
    let h=SR.util.hashStr(m.id);const rnd=()=>{h=Math.imul(h^(h>>>15),2246822507);h^=h>>>13;return (h>>>0)/4294967296;};
    for(let i=0;i<16;i++){const w=60+rnd()*220,y=cy-R+i*(2*R/16);svg+='<rect x="'+(cx-w/2+(rnd()-.5)*60).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(6+rnd()*6).toFixed(1)+'" fill="'+cyan+'" fill-opacity="'+(.15+rnd()*.35).toFixed(2)+'"/>';}
  } else {
    // the world as a wireframe sphere: rim, meridians, latitudes and its texture
    let g='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="'+cyan+'" fill-opacity=".06" stroke="'+cyan+'" stroke-width="2.5"/>';
    for(const q of [.28,.62,.9])g+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(R*q).toFixed(1)+'" ry="'+R+'" fill="none"/>';
    g+='<path d="M'+cx+' '+(cy-R)+' V'+(cy+R)+'" fill="none"/>';
    for(const lat of [-.66,-.33,0,.33,.66]){const rx=R*Math.sqrt(1-lat*lat);g+='<ellipse cx="'+cx+'" cy="'+(cy+lat*R).toFixed(1)+'" rx="'+rx.toFixed(1)+'" ry="'+(rx*.16).toFixed(1)+'" fill="none"/>';}
    svg+='<g stroke="'+cyan+'" stroke-opacity=".38" stroke-width="1.4">'+g+'</g>'+
      '<g clip-path="url(#bfClip)" fill="none" stroke="'+cyan+'" stroke-opacity=".55" stroke-width="1.6">'+msTexture(m.loc,lk.tex,R,cx,cy)+'</g>';
    if(k==='space'){
      // a tilted orbit with the targets (diamonds) and the threats (Hegemony-blue triangles) on it
      const ox=R*2,oy=R*.52,tilt=-14*Math.PI/180;
      const on=t=>{const x=ox*Math.cos(t),y=oy*Math.sin(t);return [cx+x*Math.cos(tilt)-y*Math.sin(tilt),cy+x*Math.sin(tilt)+y*Math.cos(tilt)];};
      svg+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+ox+'" ry="'+oy+'" transform="rotate(-14 '+cx+' '+cy+')" fill="none" stroke="'+cyan+'" stroke-width="2" stroke-opacity=".8"/>';
      const [tx,ty]=on(.55);
      svg+='<g class="bf-pulse"><path d="M'+tx+' '+(ty-11)+' l11 11 -11 11 -11 -11z" fill="'+cyan+'" fill-opacity=".35" stroke="'+cyan+'" stroke-width="2"/></g>'+
        '<path d="M'+tx+' '+(ty-9)+' l9 9 -9 9 -9 -9z" fill="'+cyan+'"/>';
      pts.target=[tx,ty];
      const thr=[2.3,3.4].map(on);
      for(const [x,y] of thr)svg+='<path d="M'+x.toFixed(1)+' '+(y-10).toFixed(1)+' l10 17 h-20z" fill="'+foe+'" fill-opacity=".35" stroke="'+foe+'" stroke-width="2"/>';
      pts.threat=thr[0];pts.other=on(4.6);
    } else {
      // the region as a highlighted patch, and a pulsing pin
      const [u,v]=msAnchor(m),px=cx+u*R*.85,py=cy+v*R*.85;
      svg+='<ellipse cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" rx="'+(R*.32).toFixed(1)+'" ry="'+(R*.2).toFixed(1)+'" fill="'+cyan+'" fill-opacity=".2" stroke="'+cyan+'" stroke-width="2" stroke-dasharray="6 4"/>'+
        '<circle class="bf-pulse" cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="10" fill="none" stroke="'+cyan+'" stroke-width="3"/>'+
        '<path d="M'+px.toFixed(1)+' '+py.toFixed(1)+' c-8 -10 -11 -14 -11 -19 a11 11 0 0 1 22 0 c0 5 -3 9 -11 19z" fill="'+cyan+'" stroke="#06202a" stroke-width="2"/>'+
        '<circle cx="'+px.toFixed(1)+'" cy="'+(py-19).toFixed(1)+'" r="4" fill="#06202a"/>';
      pts.target=pts.threat=pts.other=[px,py-12];
    }
  }
  // callouts: the mission's own holo lines, else the first two objectives as Target and Extract
  const objs=(m.objectives||[]).filter(o=>o[0]!=='(');
  const lines=lock?[]:(m.holo&&m.holo.length?m.holo:[{k:'Target',t:objs[0]},{k:'Extract',t:objs[1]}].filter(x=>x.t)).slice(0,3);
  const SLOTS=[{x:4,y:36,w:190,side:'l'},{x:446,y:26,w:190,side:'r'},{x:446,y:330,w:190,side:'r'}];
  let calls='',leads='';
  lines.forEach((c,i)=>{
    const sl=SLOTS[i],foeC=!!c.foe||/oppos|threat/i.test(c.k);
    const at=foeC?pts.threat:/target/i.test(c.k)?pts.target:pts.other;
    calls+='<div class="bf-callout'+(foeC?' is-foe':'')+'" style="left:'+sl.x+'px;top:'+sl.y+'px;width:'+sl.w+'px"><b>'+esc(c.k)+'</b><span>'+c.t+'</span></div>';
    if(at){const ex=sl.side==='l'?sl.x+sl.w:sl.x,ey=sl.y+22;
      leads+='<polyline points="'+ex+','+ey+' '+(ex+(sl.side==='l'?24:-24))+','+ey+' '+at[0].toFixed(1)+','+at[1].toFixed(1)+'" fill="none" stroke="'+(foeC?foe:cyan)+'" stroke-width="1.6" stroke-opacity=".8"/>';}
  });
  const table='<svg class="bf-table" viewBox="0 0 520 120" aria-hidden="true"><ellipse cx="260" cy="70" rx="250" ry="44" fill="#0b1430" stroke="#070818" stroke-width="4"/>'+
    '<ellipse cx="260" cy="56" rx="230" ry="36" fill="#121d44" stroke="rgba(54,227,242,.55)" stroke-width="3"/>'+
    '<ellipse cx="260" cy="56" rx="120" ry="18" fill="rgba(54,227,242,.25)" stroke="var(--sr-shield)" stroke-width="2"/></svg>';
  return table+'<div class="bf-beam"></div><div class="bf-proj'+(lock?' is-locked':'')+'" data-holo="'+(lock?'locked':k)+'"><svg viewBox="0 0 640 520" aria-hidden="true">'+svg+leads+'</svg><div class="bf-scan"></div>'+calls+'</div>'+
    '<div class="bf-title"><i></i>'+esc(lock?'Signal encrypted':msPlace(m))+'</div>';
}
/* the reward chips: assets first, then resources, then what it does for the region */
function msRewards(m){
  const r=m.rew||{},o=[];
  const chip=(c,ico,t)=>'<span style="--c:'+c+'">'+IC(ico)+t+'</span>';
  if(r.cross)o.push(chip('var(--sr-gold)','ship','FT-4 Cross'));
  if(r.fighter)o.push(chip('var(--sr-gold)','ship','+1 fighter'));
  if(m.vip&&m.vip.strider)o.push(chip('var(--sr-gold)','vehicle',esc(m.vip.name)));
  if(m.npc)o.push(chip('var(--sr-rebel)','people',esc(m.npc.name)));
  for(const k of ['c','s','m','f','i'])if(r[k])o.push(chip('var(--sr-res-'+RES[k][0]+')',RES[k][0],r[k]));
  if(m.region&&m.lib){const d=pdef(m.loc),rg=d&&d.regions&&d.regions.find(x=>x.id===m.region);if(rg)o.push(chip('var(--sr-rebel)','revflame',esc(rg.name)+' +'+m.lib+'%'));}
  return o.join('');
}
function msBriefHTML(m){
  const lock=msLocked(m),k=msKind(m),si=m.src?srcInfo(m.src):null;
  const place=msPlace(m),d=m.loc&&pdef(m.loc);
  const srcName=si?si.name:(m.from||'The network'),srcSub=si?[si.type,si.loc].filter(Boolean).join(' · '):(m.from?'':'');
  const r=reqOf(m),risk=msRisk(m);
  const squad=r.transport?String(r.team):(r.ships||r.team)+' ship'+((r.ships||r.team)>1?'s':'');
  const plain=String(m.desc||'').replace(/<[^>]*>/g,'');
  let h='<div class="bf-railtitle">'+IC('missions')+'Briefing</div><div class="bf-brief" data-mid="'+m.id+'">'+
    '<div><div class="bf-brief__title">'+esc(lock?'Signal encrypted':m.name)+'</div><div class="bf-loc">'+IC('targetlock')+'<span>'+esc(lock?'Unknown':place)+'</span>'+
      (d&&!lock?rbtn('data-msmap="'+m.loc+'"','Show on map',false,'sr-btn--ghost sr-btn--sm'):'')+'</div></div>'+
    '<div class="bf-src"><div class="bf-src__ava">'+esc(ini(srcName))+'</div><div style="min-width:0"><b>'+esc(srcName)+'</b>'+(srcSub?'<span>'+esc(srcSub)+'</span>':'')+'</div></div>';
  if(lock)return h+'<p class="bf-quote">The source holding this job has not been raised yet. Raise them to decrypt it.</p></div>';
  h+='<p class="bf-quote" title="'+esc(plain)+'">'+m.desc+'</p>'+
    '<div class="bf-facts"><div class="bf-fact" style="--c:'+MS_RISK_C[risk]+'"><b>'+esc(m.riskTxt||'Low')+'</b><span>Risk</span></div>'+
    '<div class="bf-fact"><b>'+m.days+' day'+(m.days===1?'':'s')+'</b><span>Travel time</span></div>'+
    '<div class="bf-fact"><b>'+squad+'</b><span>Max squad size</span></div></div>';
  const pc=precondList(m);
  h+='<section class="bf-sec" data-sec="req"><div class="bf-sec__h">'+IC('lock')+'Requirements</div>'+pc.map(c=>
    '<div class="bf-req '+(c.ok?'is-ok':'is-no')+'">'+IC(c.ok?'check':'lock')+'<span>'+esc(c.brief)+'</span>'+(!c.ok&&c.detail?'<em>'+esc(c.detail)+'</em>':'')+'</div>').join('')+'</section>';
  h+='<section class="bf-sec" data-sec="obj"><div class="bf-sec__h">'+IC('missions')+'Objectives</div>'+(m.objectives||['Complete the operation']).map(o=>'<div class="bf-obj"><i></i><span>'+o+'</span></div>').join('')+'</section>';
  const rw=msRewards(m);
  if(rw)h+='<section class="bf-sec" data-sec="rew"><div class="bf-sec__h">'+IC('loot')+'Rewards</div><div class="bf-rew">'+rw+'</div></section>';
  let plan;
  if(m.state==='prog')plan=rbtn('disabled','Under way · '+m.progress.daysLeft+' day'+(m.progress.daysLeft===1?'':'s')+' left',true,'sr-btn--primary sr-btn--lg');
  else{
    const ok=canPlan(m),why=ok?'':(pc.find(c=>!c.ok&&!c.soft)||{}).why||'';
    plan=rbtn('data-mplan="'+m.id+'"','Plan mission',!ok,'sr-btn--primary sr-btn--lg')+(why?'<div class="bf-plan__why">'+IC('lock')+esc(why)+'</div>':'');
  }
  return h+'<div class="bf-plan">'+plan+'</div></div>';
}
function msClick(ev){
  const t=ev.target.closest('button');
  if(!t||t.disabled)return;
  const sel=t.getAttribute('data-msel');
  if(sel){sClick();msSel=sel;renderMissions();if(ROOT.clientWidth<=900)setDrawer(true);return;}   // phones: the briefing is in the drawer
  const f=t.getAttribute('data-msfilter');
  if(f){sClick();msFilter=f;renderMissions();return;}
  const map=t.getAttribute('data-msmap');
  if(map){sClick();closeMissions();setView('galaxy');enterWorld(map);return;}
  const mp=t.getAttribute('data-mplan');
  if(mp){const m=G.missions.find(x=>x.id===mp);if(m&&canPlan(m)){sClick();openPlan(m);}return;}
}

/* ---------- the comm burst (docs/ui/SCREENS-HANDOFF.md §3) ----------
   Each kind of information has one home: who (and their cultivation), the channel and its flavour, our narration
   as log lines, the source's own words in one bubble, and what acknowledging does. */
const cmChan=flavour=>'<div class="cm-chan"><div class="cm-chan__top"><b>Carrier locked</b><span>'+flavour+'</span></div><canvas id="commStatic" class="cm-wave" aria-hidden="true"></canvas></div>';
const cmLog=t=>'<div class="cm-log"><span>'+t+'</span></div>';
const cmSay=(ini2,name,text,tag)=>'<div class="cm-say"><span class="cm-say__ava" aria-hidden="true">'+esc(ini2)+'</span><div class="cm-bubble">'+
  '<div class="cm-bubble__top">'+esc(name)+(tag?wTag(tag,'action'):'')+'</div><p>'+text+'</p></div></div>';
/* the mission a signal would put on the board, read without putting it there */
function signalLead(sig){
  let m=null;
  if(sig.kind==='mission'){
    if(MSTORY[sig.mid]){const T=MTYPE_DEFS[MSTORY[sig.mid]],c=CTXDEF[sig.mid]||{};if(T)m={name:T.name,ground:true,type:'ground',riskTxt:T.riskTxt,loc:c.loc,region:c.region};}
    else if(MPOOL[sig.mid])m=Object.assign({id:sig.mid},MPOOL[sig.mid]);
  } else if(sig.kind==='offer'){
    const T=MTYPE_DEFS[sig.tid],d=sig.ctx&&pdef(sig.ctx.loc);
    if(T)m={name:T.name,ground:true,type:'ground',riskTxt:d&&d.sec>=3?'High':T.riskTxt,loc:sig.ctx.loc,region:sig.ctx.region};
  }
  if(!m)return null;
  const k=opKind(m),d=m.loc&&pdef(m.loc);
  const where=k==='space'?(d?d.name+' orbit':''):whereHTML(m);
  return {name:m.name,kind:k,meta:esc([OPKIND[k].label,m.riskTxt?m.riskTxt+' risk':'',where].filter(Boolean).join(' · '))};
}
function commHTML(src,payload){
  const cu=payload.cult||{from:src.cult,to:src.cult,lvl1:src.level};
  const gain=Math.round(cu.to-cu.from);
  const who='<div class="cm-who"><span class="cm-ava">'+esc(ini(src.name))+'<i>'+IC('signal')+'</i></span>'+
    '<div style="min-width:0"><div class="cm-name">'+esc(src.name)+'</div><div class="cm-role">'+esc([src.type,src.loc].filter(Boolean).join(' · '))+'</div></div>'+
    '<div class="cm-who__end"><span class="cm-lvl">Source · Level '+(cu.lvl1||src.level)+'</span>'+
    '<span class="cm-meter" style="--from:'+Math.round(cu.from)+';--to:'+Math.round(cu.to)+'" title="Cultivation '+Math.round(src.cult)+' / 100 toward the next level"><i class="was"></i><i class="now"></i></span>'+
    (gain>0?'<span class="cm-gain">Cultivation +'+gain+'</span>':'')+'</div></div>';
  let body=cmChan('Encrypted · rebel net · lag 4.2s · voices masked'),foot;
  if(payload.event){
    const said=String(payload.event.text).replace(/^<b>[^<]*<\/b>\s*/,'');   // the bubble names the speaker
    body+=cmSay(ini(src.name),src.name,said)+'<div class="cm-choices">'+payload.event.opts.map((o,i)=>choice(i+1,'data-ans="'+i+'"',o[0])).join('')+'</div>';
    foot='';
  } else {
    body+=(payload.lines||[]).filter(Boolean).map(cmLog).join('');
    const sig=payload.signal;
    if(sig){
      body+=cmSay(ini(src.name),src.name,sig.text||'',"Signal");
      const ld=signalLead(sig);
      if(ld)body+='<div class="cm-lead"><span class="cm-lead__ico">'+IC(OPKIND[ld.kind].icon)+'</span><div style="min-width:0"><div class="cm-lead__k">New Lead – Added to Mission Board</div>'+
        '<div class="cm-lead__n">'+esc(ld.name)+'</div><div class="cm-lead__m">'+ld.meta+'</div></div></div>';
      foot=rbtn('data-follow','Acknowledge',false,'sr-btn--primary');
    } else {
      body+='<div class="cm-quiet">No signal waiting.</div>';
      foot=rbtn('data-close','Close channel',false,'sr-btn--primary');
    }
  }
  return wHead('Comm burst')+who+'<div class="sr-window__body cm-body">'+body+'</div>'+(foot?wFoot(foot):'');
}

/* ---------- the source approach (docs/ui/SCREENS-HANDOFF-2.md §2) ----------
   The Comm burst's window family for someone who isn't ours yet: gold ring, "Potential source" kicker, their
   starting Cultivation and Risk, the courier strip, the pitch, the network capacity row, then the choices.
   With room: Take them on / Send no reply. Full: Standby (they wait on the Galaxy map) / Take on disabled / no reply. */
const CAND_RES={c:['credits','var(--sr-res-credits)'],s:['supplies','var(--sr-res-supplies)'],m:['materials','var(--sr-res-materials)'],
  f:['fuel','var(--sr-res-fuel)'],i:['Intel','var(--sr-res-intel)']};
function candHTML(cd){
  const alive=G.sources.filter(s=>s.alive).length,cap=sourceCap(),full=alive>=cap;
  const mini=(lbl,v,c)=>'<span class="cm-mini" style="--c:'+c+'"><span>'+lbl+'</span><i style="--v:'+Math.round(v)+'"></i><b>'+Math.round(v)+'</b></span>';
  const who='<div class="cm-who"><span class="cm-ava cm-ava--potential">'+esc(ini(cd.name))+'<i>'+IC('sneak')+'</i></span>'+
    '<div style="min-width:0"><div class="cm-kicker">Potential source</div><div class="cm-name">'+esc(cd.name)+'</div>'+
    '<div class="cm-role">'+esc([cd.type,cd.loc].filter(Boolean).join(' · '))+'</div></div>'+
    '<div class="cm-who__end">'+mini('Cultivation',cd.cult,'var(--sr-psi)')+mini('Risk',cd.risk,'var(--sr-hazard)')+'</div></div>';
  const chan='<div class="cm-chan cm-chan--courier"><div class="cm-chan__top"><b>Courier contact</b><span>'+esc(cd.loc)+' · dead drop · unsigned</span></div></div>';
  let pips='';for(let i=0;i<cap;i++)pips+='<i'+(i<alive?'':' class="is-free"')+'></i>';
  const capRow='<div class="cm-cap'+(full?' is-full':'')+'">'+IC('people')+'<span class="cm-cap__lbl">Network capacity</span>'+
    (full?'<span class="cm-cap__full">Full</span>':'')+'<span class="cm-cap__pips">'+pips+'</span><b>'+alive+'/'+cap+'</b></div>';
  const drow=(c,txt,val)=>'<span class="cm-drow" style="--c:'+c+'"><i></i>'+(val!==undefined?'<b>'+val+'</b>&nbsp;':'')+txt+'</span>';
  const incRows=Object.keys(cd.inc||{}).filter(k=>CAND_RES[k]&&cd.inc[k]).map(k=>drow(CAND_RES[k][1],CAND_RES[k][0]+' a day','+'+cd.inc[k])).join('')+
    drow('var(--sr-hazard)','exposure','+4');
  const cmChoice=(n,attrs,title,rows,primary,dis)=>'<button type="button" class="cm-choice'+(primary?' is-primary':'')+'" '+attrs+(dis?' disabled':'')+'>'+
    '<span class="sr-kbd sr-choice__key">'+n+'</span><span class="cm-choice__t">'+title+'</span>'+(rows?'<span class="cm-choice__rows">'+rows+'</span>':'')+'</button>';
  const take=(n,dis)=>cmChoice(n,'data-cand="'+cd.id+'"','Take them on.',
    dis?'<span class="cm-choice__why">'+IC('lock')+'Network full</span>':incRows,!dis,dis);
  const noReply=n=>cmChoice(n,'data-cand="no"','Too dangerous. Send no reply.','');
  const choices=full?
    cmChoice(1,'data-cand="standby"','Standby.',
      drow('var(--sr-gold)','Stays on the Galaxy map as a potential contact')+drow('var(--sr-gold)','Recruit them once the network has room'),true)+
    take(2,true)+noReply(3):
    take(1)+noReply(2);
  return wHead('Approach')+who+'<div class="sr-window__body cm-body">'+chan+cmLog(cd.pitch)+capRow+
    '<div class="cm-choices">'+choices+'</div></div>';
}

/* ---------- the Personnel File (docs/ui/SCREENS-HANDOFF.md §2) ----------
   A stage with the rebel's figure and gear pegs, a header plate, then the middle column (medical, morale, character,
   experiences, skills or specialty) and the side column (craft, service record, assignment). Detail buttons open a
   popover to their right on hover, focus or tap. */
const PEG_LABEL={primary:'Primary',secondary:'Sidearm',back:'Back',head:'Head',body:'Body',gad:'Gadget'};
const ROLE_ICO={Soldier:'soldier',Marine:'marine',Pilot:'pilot',Support:'support',Hero:'star'};
const SPEC_ICO={doctor:'heart',intel:'intel',mechanic:'work',support_technician:'hack',logistics:'supplies',academic:'help',diplomat:'comms',control:'dial'};
const UNIT_ICO={job:'work',rule:'shield',posting:'galaxy'};
const EXP_ICO={Relationships:'people',Battlefield:'sword',Psychological:'panic',Successes:'star',Injuries:'patch',Rebellion:'revflame',Consequences:'skull',Positive:'heart'};
const GOOD='var(--sr-go)',BAD='var(--sr-hazard)';
/* the figure drawn large for the stage (the smaller figureURL serves the mission window) */
const figureBigCache=new Map();
function figureBigURL(p){
  if(p.auto||!p.id)return null;
  const key=portraitKey(p)+'|'+JSON.stringify(p.gear||{})+'|'+(p.spec2||'');
  const hit=figureBigCache.get(p.id);
  if(hit&&hit.key===key)return hit.url;
  try{
    const W=420,H=460,c=document.createElement('canvas');c.width=W*2;c.height=H*2;
    const g=c.getContext('2d');g.scale(2,2);
    SA.character(g,W/2,H-34,personSpec(p),{view:'front',t:0,s:6.2});
    const url=c.toDataURL();
    figureBigCache.set(p.id,{key,url});
    return url;
  }catch(e){return null;}
}
const pfFx=(t,good)=>'<span style="--c:'+(good?GOOD:BAD)+'">'+esc(t)+'</span>';
const pfDots=list=>list.length?'<span class="pf-dots">'+list.map(g=>'<i style="--c:'+(g?GOOD:BAD)+'"></i>').join('')+'</span>':'';
const pfPop=(name,kind,body,fx)=>'<div class="pf-pop" role="tooltip"><div class="pf-pop__name">'+name+'</div><div class="pf-pop__kind">'+kind+'</div>'+
  (body?'<p>'+body+'</p>':'')+(fx?'<div class="pf-fx">'+fx+'</div>':'')+'</div>';
const pfTip=(btn,pop,wide)=>'<div class="pf-tip'+(wide?' is-wide':'')+'">'+btn+pop+'</div>';
/* a compact detail button: icon disc, name, kind, then markers and a chevron */
function pfBtn(o){
  return '<button class="pf-btn'+(o.dashed?' is-dashed':'')+'" type="button" data-pftip'+(o.attrs||'')+'><span class="pf-btn__ico" style="--c:'+(o.c||'var(--sr-psi)')+'">'+IC(o.ico)+'</span>'+
    '<span style="min-width:0"><span class="pf-btn__name">'+o.name+'</span><span class="pf-btn__kind">'+o.kind+'</span></span><span class="pf-btn__end">'+(o.dots||'')+IC('chevron')+'</span></button>';
}
const pfH=(ico,t,right)=>'<div class="pf-h">'+IC(ico)+t+(right?'<b>'+right+'</b>':'')+'</div>';
const pfSec=(key,h)=>h?'<section class="pf-sec" data-sec="'+key+'">'+h+'</section>':'';
/* the header plate: level ring, name, role and what sets them apart, the rank button */
function pfPlate(p){
  const tags=[];
  if(!p.auto)tags.push('<em>'+esc(specOf(p)||'Rookie')+'</em>');
  else tags.push('<em>'+esc(rankFor(p))+'</em>');
  if(p.merc)tags.push('<em>Mercenary · '+Math.max(0,p.merc.until-G.day)+'d left</em>');
  if(laidUp(p))tags.push('<em style="color:var(--sr-hazard)">Injured</em>');
  else if(Rebel.weary(p))tags.push('<em style="color:var(--sr-hazard)" title="Needs '+Rebel.restDays(p)+' day'+(Rebel.restDays(p)>1?'s':'')+' of rest">'+(conked(p)?'Conked out':'Weary')+'</em>');
  let rank='';
  if(!p.auto&&p.rank!==undefined){
    const ready=Rebel.canPromote(p),com=!ready&&Rebel.canCommission(p),nx=Rebel.nextRank(p),need=Rebel.needMissions(p),have=Math.min(need,p.rankMissions||0);
    const hint=ready?'Ready for promotion to '+nx:com?'Can be commissioned as an officer':nx?have+' of '+need+' missions toward '+nx:'Top of the ladder';
    rank='<button class="pf-rank'+(ready||com?' is-ready':'')+'" type="button" data-rank-open="'+p.id+'" title="'+esc(hint+'. Tap for details.')+'" aria-label="Rank: '+esc(rankFor(p))+'. '+esc(hint)+'. Open rank details">'+
      insignia(p,26)+'<b>'+esc(rankFor(p))+'</b>'+(ready?'<em class="pf-rank__flag">\u25b2 Promotion ready</em>':com?'<em class="pf-rank__flag">\u2605 Can be commissioned</em>':'')+(nx?'<span>'+Array.from({length:need},(_,i)=>'<i'+(i<have?' class="is-on"':'')+'></i>').join('')+'</span>':'')+'</button>';
  }
  return '<div class="pf-plate"><span class="pf-lvl" style="--xp:'+Math.round((p.xp||0)*100)+'" aria-label="Level '+p.level+', '+Math.round((p.xp||0)*100)+'% to the next"><b>'+p.level+'</b><small>LVL</small></span>'+
    '<div style="min-width:0"><div class="pf-name">'+esc(p.name)+'</div><div class="pf-role">'+IC(ROLE_ICO[p.role]||'people')+esc(p.role)+tags.join('')+'</div></div>'+rank+'</div>';
}
/* the stage: the figure, gear pegs either side, and what has happened to them */
function pfStage(p){
  const slots=gearSlots(p),key=s=>s.k==='gad'?'gad'+(s.i||0):s.k;
  const pilot=p.role==='Pilot';
  const sides=[pilot?['secondary','gad0']:['primary','secondary','back'],pilot?['head','body','gad1']:['head','body','gad0','gad1']];
  const away=p.assign==='mission';
  const peg=s=>{
    const id=slotGet(p,s),own=isOwnSlot(p,s);
    const why=own?'Their own kit: not ours to reassign':away?'Away on a mission':'';
    return '<button class="pf-peg'+(id?'':' is-empty')+'" type="button" data-gear-slot="'+p.id+':'+s.k+':'+(s.i||0)+'"'+(why?' disabled':'')+' title="'+esc(why||SLOT_LABEL[s.k]+': '+(id?kitNameId(id):'empty'))+'">'+
      '<span class="pf-peg__box">'+(id?itArt(id):'')+'</span><span class="pf-peg__lbl">'+PEG_LABEL[s.k]+'</span><span class="pf-peg__name">'+(id?esc(kitNameId(id)):'Empty')+'</span></button>';
  };
  const col=(list,side)=>{const ss=list.map(k=>slots.find(s=>key(s)===k)).filter(Boolean);return ss.length?'<div class="pf-pegs pf-pegs--'+side+'">'+ss.map(peg).join('')+'</div>':'';};
  const u=figureBigURL(p);
  const post=isSupport(p)?pfPost(p):'';
  return '<div class="pf-stage'+(laidUp(p)?' is-hurt':'')+'">'+
    '<svg class="pf-flag" viewBox="0 0 46 62" aria-hidden="true"><path d="M4 2v58" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M6 6h34l-8 11 8 11H6z" fill="currentColor"/></svg>'+
    (u?'<img class="pf-doll" src="'+u+'" alt="'+esc(p.name)+' in their kit">':'')+
    (slots.length?col(sides[0],'l')+col(sides[1],'r'):'')+
    (post?'<span class="pf-stagebadge">'+IC('star')+esc(post)+'</span>':'')+
    (laidUp(p)?'<div class="pf-ribbon">Injured</div>':'')+'</div>';
}
/* a Support rebel's post in their room: Department Head, else the Lead of their niche */
function pfPost(p){
  const key=SP.homeOf(p);
  if(!key||p.assign!=='room:'+key||!crewIn(key).includes(p))return '';
  if(headOf(key)===p)return 'Department Head';
  return nicheOf(p)&&leadOf(p.niche)===p?'Niche Lead':'';
}
/* off duty, with the conditions behind it in the popover; permanent changes as buttons below */
function pfMedical(p){
  let h='';
  if(laidUp(p)){
    const d=outDays(p);
    const conds=(p.cond||[]).map(c=>{
      const D=Rebel.CONDK[c.k];if(!D)return '';
      return '<b>'+esc(D.n)+'</b> · '+(c.k==='eye'&&c.age>=8?'getting worse':Math.max(1,Math.ceil(c.days))+' day'+(Math.ceil(c.days)>1?'s':'')+' to go')+'<br>'+esc(D.text);
    }).filter(Boolean).join('<br><br>');
    const warn=(p.cond||[]).length&&!hasRoom('infirmary')?'<br><br>No Infirmary: wounds mend very slowly, and an eye injury can become permanent.':'';
    h+=pfTip('<div class="pf-medical" role="button" tabindex="0" data-pftip>'+IC('patch')+'<div><b>Injured</b><span>This character is off duty until they have recovered from their injuries.</span></div>'+
      '<strong>'+d+'<small>day'+(d>1?'s':'')+' to go</small></strong></div>',pfPop('Injured','Medical',(conds||'Laid up.')+warn));
  }
  else for(const c of p.cond||[]){   // on their feet with something still mending
    const D=Rebel.CONDK[c.k];if(!D)continue;
    const left=c.k==='eye'&&c.age>=8?'Getting worse':Math.max(1,Math.ceil(c.days))+' day'+(Math.ceil(c.days)>1?'s':'')+' to go';
    h+=pfTip(pfBtn({ico:'patch',c:BAD,name:esc(D.n),kind:left}),pfPop(esc(D.n),'Medical · '+left.toLowerCase(),esc(D.text)),true);
  }
  const b=p.body||{},perm=[];
  for(const part of ['arm','leg','eye']){
    if(b[part]===1){
      const n=part==='eye'?'Blinded in one eye':'Lost '+(part==='arm'?'an arm':'a leg');
      perm.push(pfTip(pfBtn({ico:'patch',c:BAD,name:n,kind:'Permanent'}),pfPop(n,'Permanent',(part==='eye'?'A significant accuracy penalty.':part==='arm'?'No two-handed weapons.':'Slowed and cannot sprint.')+' A Cyberneticist’s prosthetic would fix it.')));
    } else if(b[part]===2){
      const kind=(p.pros||{})[part]||'fitted',fx=(Rebel.PROS_FX[kind]||{})[part]||{};
      const n=sentence(Rebel.PROS_NAME[kind])+' prosthetic '+part;
      const what=fx.aim?(fx.aim>0?'+':'')+fx.aim+' aim.':fx.spd?(fx.spd>1?'A little faster on their feet.':'A little slower on their feet.'):'It works. Mostly.';
      perm.push(pfTip(pfBtn({ico:'patch',c:GOOD,name:esc(n),kind:'Prosthetic'}),pfPop(esc(n),'Prosthetic · fitted',what)));
    }
  }
  if(perm.length)h+='<div class="pf-btngrid">'+perm.join('')+'</div>';
  return h;
}
function pfMorale(p){
  if(p.auto||p.morale===undefined)return '';
  const b=Rebel.mband(p),col=b.tone==='bad'?'var(--sr-c-bad)':b.tone==='good'?'var(--sr-go)':'var(--sr-gold)';
  return '<div class="pf-morale" style="--c:'+col+'" title="Morale '+Math.round(p.morale)+' / 100"><span class="pf-morale__lbl">Morale</span>'+
    '<div class="pf-bar" style="--v:'+Math.round(p.morale)+'"><i></i></div><span class="pf-morale__v">'+b.n+'</span></div>';
}
function pfCharacter(p){
  const t=Rebel.CTK[p.charTrait];
  if(!t)return '';
  const g=t.g||[],b=t.b||[];
  let h=pfTip(pfBtn({ico:'d20',name:esc(t.n),kind:'Character trait',dots:pfDots(g.map(()=>1).concat(b.map(()=>0)))}),
    pfPop(esc(t.n),'Character trait'+(t.live?'':' · effect soon'),'<em>'+esc(Rebel.traitText(t,p))+'</em>',g.map(x=>pfFx(x,1)).join('')+b.map(x=>pfFx(x,0)).join('')));
  if(p.role==='Hero')h+=pfTip(pfBtn({ico:'star',c:'var(--sr-gold)',name:'Hero of the Rebellion',kind:'Hero'}),
    pfPop('Hero of the Rebellion','Hero','+'+Rebel.HERO_SKILL+' to every skill and +'+Rebel.HERO_HP+' health. <b>Rally cry</b> (ground): the squad steadies and takes +2 to hit for a round. <b>Heroic surge</b> (space): shields full, half the hull back, +4 to hit for a round. Each once per mission.'));
  return pfH('d20','Character')+h;
}
function pfExperiences(p){
  if(p.auto||p.charTrait===undefined)return '';
  const l=p.traits||[];
  const body=l.length?'<div class="pf-btngrid">'+l.map(t=>{
    const d=Rebel.RTK[t.k];if(!d)return '';
    const name=esc(Rebel.expTitle(t,nameOfRebel)),e=d.e.replace(/\{partner\}/g,t.with?nameOfRebel(t.with):'them');
    return pfTip(pfBtn({ico:EXP_ICO[d.cat]||'star',c:d.bad?BAD:'var(--sr-psi)',name,kind:esc(d.cat)+(d.temp?' · for now':''),dots:pfDots([!d.bad])}),
      pfPop(name,esc(d.cat)+(d.temp?' · temporary':''),'<em>'+esc(Rebel.expText(t,p,nameOfRebel))+'</em>',pfFx(e,!d.bad)));
  }).join('')+'</div>':'<div class="pf-none">None yet. Missions write these.</div>';
  return pfH('star','Experiences',l.length+' / '+Rebel.EXP_MAX)+body;
}
/* what each point of a skill actually does, from the numbers the scenes use: on foot Aim is soldierAim; in the
   cockpit Aim and Focus are the database's skill-and-level bonus the space scene reads (DESIGN_BLOCKERS C-35) */
function skillFx(p,k){
  const sp=p.role==='Pilot';
  if(k==='aim')return '+'+(sp?pilotAim(p):soldierAim(p))+' to hit'+(sp?' in space':'');
  if(k==='con')return Rebel.hpOf(p)+' health';
  if(k==='agi')return '+'+Math.round((Rebel.moveMul(p)-1)*100)+'% move speed';
  if(k==='pre')return Rebel.coolOf(p,sp?'s':'g')+' Cool'+(sp?' in space':'');
  if(k==='cun')return '+'+Math.round((Rebel.cunMul(p)-1)*100)+'% repairs & shields';
  if(k==='foc')return '+'+SRDB.skillBonus(Rebel.dbSkill(p,'foc'),p.level)+' harder to hit';
  return '';
}
function pfSkills(p){
  const ks=Rebel.skillKeys(p);
  if(!ks.length)return '';
  return pfH('d20','Skills','max '+Rebel.SKILL_CAP)+'<div class="pf-skills">'+ks.map(k=>{
    const v=Rebel.skill(p,k),S=Rebel.SKILLS[k];
    return '<div class="pf-skill" data-skill="'+k+'" title="'+esc(S.d+' '+v+' of '+Rebel.SKILL_CAP+'.')+'"><div class="pf-skill__top">'+S.n+'<b>'+v+'</b></div>'+
      '<div class="pf-bar" style="--v:'+Math.round(v/Rebel.SKILL_CAP*100)+'"><i></i></div><div class="pf-skill__fx">'+skillFx(p,k)+'</div></div>';
  }).join('')+'</div>';
}
/* Support: their specialty and its Jobs and Rules, then the niche they actually have and its next fork */
function pfUnit(u,got,p,ld){
  const tag=TYPE_TAG[u.t][0];
  const live=u.live?'':'<br><br>Not working yet: needs '+esc(SP.NEEDS[u.needs]||'a later build')+'.';
  return pfTip(pfBtn({ico:UNIT_ICO[u.t]||'work',c:u.live?'var(--sr-psi)':'var(--sr-seam)',name:esc(u.n),kind:tag+(u.lv>1?' · level '+u.lv+(u.f||''):'')}),
    pfPop(esc(u.n),tag+(u.lead?' · Lead only':''),esc(u.d)+live));
}
function pfSupport(p){
  const S=SP.SPEC[p.sspec];
  if(!S)return '';
  const key=S.room,head=hasRoom(key)&&headOf(key)===p&&p.assign==='room:'+key;
  const headBtn=(cls,ico,name,sub,post)=>'<div class="pf-spec__head'+cls+'" role="button" tabindex="0" data-pftip>'+IC(ico)+'<div style="min-width:0"><div class="pf-spec__name">'+name+'</div><div class="pf-spec__sub">'+sub+'</div></div>'+(post?wTag(post,'good'):'')+'</div>';
  let h='<section class="pf-sec" data-sec="spec">'+pfH('support','Specialty')+'<div class="pf-btngrid">'+
    pfTip(headBtn('',SPEC_ICO[p.sspec]||'support',esc(S.n),'Works in the '+esc(ROOMS[key].name)+(hasRoom(key)?'':' (not built yet)'),head?'Department Head':''),
      pfPop(esc(S.n),'Specialty',esc(S.d)+(doingLine(p)?'<br><br>Now: '+esc(doingLine(p)):'')),true)+
    SP.baseOf(p.sspec).map(u=>pfUnit(u,true,p)).join('')+'</div></section>';
  const n=nicheOf(p);
  h+='<section class="pf-sec" data-sec="niche">'+pfH('help','Niche');
  if(!n){
    h+='<div class="pf-none">No niche yet'+(p.nicheTrain?'. In the classroom: '+esc(SP.NICHE[p.nicheTrain.k].n)+', '+Math.max(1,Math.ceil(p.nicheTrain.days))+' day'+(Math.ceil(p.nicheTrain.days)>1?'s':'')+' to go.':'.')+'</div></section>';
    return h;
  }
  const N=SP.NICHE[n],lead=leadOf(n)===p&&crewIn(key).includes(p);
  const got=SP.unlocksOf(n).filter(u=>SP.reached(p,u));
  const fork=[7,15].find(lv=>!(p.forks&&p.forks[lv])),due=SP.forkDue(p);
  let forkTip='';
  if(fork){
    const opts=SP.unlocksOf(n).filter(u=>u.lv===fork&&u.f);
    forkTip=pfTip(pfBtn({ico:'d20',c:due?'var(--sr-gold)':'var(--sr-seam)',name:'Level '+fork+': pick one',kind:opts.map(u=>esc(u.n)).join(' or '),dashed:true}),
      pfPop('Level '+fork+': pick one',due?'Choose now · for good':'A fork at level '+fork,opts.map(u=>'<b>'+esc(u.n)+'</b> ('+TYPE_TAG[u.t][0]+'): '+esc(u.d)+(u.live?'':' <span class="sr-faint">Not working yet.</span>')+
        (due===fork?'<br>'+rbtn('data-fork="'+p.id+':'+u.lv+':'+u.f+'"','Choose '+esc(u.n),false,'sr-btn--sm sr-btn--primary'):'')).join('<br><br>')),true);
  }
  h+='<div class="pf-btngrid">'+pfTip(headBtn(' pf-spec__head--niche','support',esc(N.n),esc(S.n)+' niche',lead?'Niche Lead':''),pfPop(esc(N.n),'Niche',esc(N.d)),true)+
    got.map(u=>pfUnit(u,true,p)).join('')+forkTip+'</div></section>';
  return h;
}
/* the side column */
function pfCraft(p){
  if(p.role!=='Pilot'&&p.role!=='Hero')return '';
  const f=G.fighters.find(x=>x.id===p.ship);
  if(!f)return '';
  const r=SRDB.ship(f.cls)||{},mk=(SRDB.raw.manufacturers||[]).find(x=>x.id===r.manufacturer),n=Math.round(f.hull/20);
  return pfH('ship','Assigned craft')+'<div class="pf-craft"><div class="pf-craft__top">'+shipArt(f.cls)+'<div style="min-width:0"><b>'+esc(f.name)+'</b><span>'+esc([r.role,mk&&mk.name].filter(Boolean).join(' · '))+(f.out?' · on a mission':'')+'</span></div></div>'+
    '<span class="sr-hp'+(f.hull<35?' sr-hp--low':f.hull<60?' sr-hp--mid':'')+'"><span class="sr-hp__cells">'+[0,1,2,3,4].map(i=>'<i class="sr-hp__cell'+(i<n?' is-on':'')+'"></i>').join('')+'</span><span class="sr-hp__num">Hull '+Math.round(f.hull)+'%</span></span></div>';
}
function pfRecord(p){
  if(p.auto)return '';
  const medal=(c,ico,l,n)=>'<div class="pf-medal" style="--c:'+c+'"><span class="pf-medal__ico">'+IC(ico)+'</span><span class="pf-medal__lbl">'+l+'</span><b class="pf-medal__n">'+n+'</b></div>';
  return pfH('star','Service record')+'<div class="pf-record">'+medal('var(--sr-gold)','missions','Missions served',p.missions||0)+medal('var(--sr-rebel)','attack','Confirmed kills',p.kills||0)+medal('var(--sr-hazard)','patch','Times injured',p.injuries||0)+'</div>';
}
function pfAssign(p){
  const hurt=laidUp(p),away=p.assign==='mission',lock=hurt||away;
  let b=rbtn('data-as="rest:'+p.id+'" aria-pressed="'+(hurt||p.assign==='rest')+'"','Rest',lock,'sr-btn--sm')+
    rbtn('data-as="train:'+p.id+'" aria-pressed="'+(!hurt&&p.assign==='train')+'"'+(hasRoom('training')?'':' title="Needs a Training Hall"'),'Train',lock||!hasRoom('training'),'sr-btn--sm');
  if(isSupport(p)&&SP.homeOf(p)){   // a Support rebel works in their specialty's home room
    const key=SP.homeOf(p),mine=!hurt&&p.assign==='room:'+key,full=!mine&&postedTo(key).length>=roomCap(key);
    const why=!hasRoom(key)?'Build a '+ROOMS[key].name+' first':full?'The '+ROOMS[key].name+' is full ('+roomCap(key)+'): expand it':'';
    b+=rbtn('data-as="room:'+key+':'+p.id+'" aria-pressed="'+mine+'"'+(why?' title="'+esc(why)+'"':''),'Work in the '+ROOMS[key].name,lock||!!why,'sr-btn--sm sr-btn--wide');
  }
  return pfH('day','Assignment')+'<div class="pf-assign">'+b+'</div>'+(hurt?'<p class="pf-assign__note">Resting until recovered.</p>':away?'<p class="pf-assign__note">Away on a mission.</p>':'');
}
function personHTML(p){
  const mid=pfSec('medical',pfMedical(p))+pfMorale(p)+pfSec('character',pfCharacter(p))+pfSec('exp',pfExperiences(p))+
    (isSupport(p)?pfSupport(p):pfSec('skills',p.auto?pfH('d20','Equipment')+'<div class="pf-none">Integral autocannon arm. The face-screen is permanently, cheerfully, on.</div>':pfSkills(p)));
  const side=pfSec('craft',pfCraft(p))+pfSec('record',pfRecord(p))+pfSec('assign',pfAssign(p));
  return '<div class="pf-body">'+pfPlate(p)+'<div class="pf-col pf-col--stage">'+pfStage(p)+'</div>'+
    '<div class="pf-col pf-col--mid">'+mid+'</div><div class="pf-col pf-col--side">'+side+'</div></div>';
}

/* ---------- the mission report (docs/ui/SCREENS-HANDOFF.md §1) ---------- */
const fmtN=n=>Math.round(n).toLocaleString('en-US');
const fmt1=n=>String(Math.round(n*10)/10);
const RP_SRC={pay:'pay',found:'found',bonus:'stealth bonus',salvaged:'salvaged',fenced:'fenced, no berth'};
const rpDrow=(c,n,label)=>'<div class="rp-drow" style="--c:'+c+'"><i></i><b>+'+n+'</b>'+label+'</div>';
const rpSec=(d,ico,title,count,body,cls)=>'<section class="rp-sec'+(cls?' '+cls:'')+'" style="--d:'+d+'s"><div class="rp-sec__head">'+IC(ico)+title+(count||'')+'</div>'+body+'</section>';
/* the hero's skyline: mesas over the dusk (darker for a failure; the gradient is the stylesheet's) */
function rpSkyline(){
  return '<svg class="rp-hero__land" viewBox="0 0 880 76" preserveAspectRatio="none" aria-hidden="true">'+
    '<path d="M0 76V44h60l12-14h70l10 14h40l8-22h96l10 22h120l14-30h84l12 30h70l10-10h90l8 10h80l14-18h60l12 18v32Z" fill="rgba(20,12,40,.45)"/>'+
    '<path d="M0 76V58h120l14-20h110l12 20h150l10-12h70l8 12h160l16-26h96l10 26h104v18Z" fill="rgba(11,8,26,.8)"/></svg>';
}
/* the location block: the world as a small planet, a dotted line, a red pin over the region */
function rpLoc(m){
  const d=m.loc&&pdef(m.loc);
  if(!d)return '<div class="rp-loc"><div class="rp-loc__item"><span class="rp-loc__lbl">Haven Rock</span></div></div>';
  const r=m.region&&d.regions&&d.regions.find(x=>x.id===m.region);
  const pin='<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 33C11 24 8 19 8 14a10 10 0 0 1 20 0c0 5-3 10-10 19Z" fill="var(--sr-rebel)" stroke="var(--sr-ink)" stroke-width="3" stroke-linejoin="round"/><circle cx="18" cy="14" r="4" fill="var(--sr-ink)"/></svg>';
  return '<div class="rp-loc"><div class="rp-loc__item"><img src="'+planetURL(d.id)+'" alt="" width="36" height="36" style="display:block;width:36px;height:36px"><span class="rp-loc__lbl">'+esc(d.name)+'</span></div>'+
    (r?'<span class="rp-loc__dots"></span><div class="rp-loc__item">'+pin+'<span class="rp-loc__lbl">'+esc(r.name)+'</span></div>':'')+'</div>';
}
/* one tile per resource gained, the total and a diamond row per source */
function rpRes(got){
  return ['c','s','m','f','i'].filter(k=>gotTotal(got.res[k])>0).map((k,i)=>{
    const r=got.res[k],c='var(--sr-res-'+RES[k][0]+')';
    const rows=Object.keys(RP_SRC).concat(Object.keys(r).filter(x=>!RP_SRC[x])).filter(x=>r[x]>0).map(x=>rpDrow(c,fmtN(r[x]),RP_SRC[x]||x)).join('');
    return '<div class="rp-tile" data-res="'+k+'" style="--c:'+c+';--d:'+(0.2+i*0.06).toFixed(2)+'s"><span class="rp-tile__top">'+IC(RES[k][0])+RES[k][1]+'</span>'+
      '<b class="rp-tile__n">'+fmtN(gotTotal(r))+'</b><div class="rp-drows">'+rows+'</div></div>';
  }).join('');
}
/* everything else that came home: assets first, two rows of four at most, the last cell counts the rest */
const RP_KIND={ship:'Ship',vehicle:'Vehicle',bot:'Bot',unit:'Bot'};
function rpLootArt(e){
  if(e.kind==='item')return itArt(e.id);
  if(e.kind==='ship')return shipArt(e.type);
  if(e.kind==='bot'||e.kind==='vehicle')return vehArt(e.type);
  return '<span class="it-art">'+IC('people')+'</span>';
}
function rpLoot(got,max){
  const all=got.loot.filter(e=>e.kind!=='item').concat(got.loot.filter(e=>e.kind==='item'));
  const cut=all.length>max?max-1:all.length;
  return all.slice(0,cut).map((e,i)=>{
    const asset=e.kind!=='item';
    return '<div class="rp-loot__tile'+(asset?' is-asset':'')+(e.foe&&!asset?' is-foe':'')+'" style="--d:'+(0.3+i*0.05).toFixed(2)+'s" title="'+esc(e.name)+'">'+
      (asset?'<span class="rp-loot__badge">'+(e.kind==='bot'||e.kind==='unit'?'Bot':RP_KIND[e.kind])+'</span>':'')+
      (e.n>1?'<span class="rp-loot__q">×'+e.n+'</span>':'')+rpLootArt(e)+'<span class="rp-loot__name">'+esc(e.name)+'</span></div>';
  }).join('')+(all.length>cut?'<div class="rp-loot__more"><b>+'+(all.length-cut)+' more</b><span>in the Arsenal</span></div>':'');
}
/* one crew row: portrait with a state badge, the XP bar growing from the old fill, the gain */
function rpMate(pi,i){
  const p=pi.who||{},lost=pi.state==='lost',hurt=pi.state==='injured',up=(pi.lvl1||0)>(pi.lvl0||0);
  const d=(0.35+i*0.08).toFixed(2)+'s';
  const u=p.id?portraitURL(p):null;
  const badge=lost?'<span class="rp-mate__badge" style="--c:var(--sr-text-3)">'+IC('skull')+'</span>':hurt?'<span class="rp-mate__badge" style="--c:var(--sr-c-warn)">'+IC('patch')+'</span>':'';
  const state=lost?'<span class="rp-mate__state" style="--c:var(--sr-text-3)">Lost</span>':hurt?'<span class="rp-mate__state" style="--c:var(--sr-c-warn)">Injured</span>':'';
  const pct=x=>Math.round(Math.max(0,Math.min(1,x||0))*100);
  const from=up?0:pct(pi.xp0),gain=up?100:Math.max(0,pct(pi.xp1)-pct(pi.xp0));
  const role=(pi.role||p.role||'')+(pi.lvl1?' · Lv '+pi.lvl1:'');
  return '<div class="rp-mate'+(lost?' is-lost':'')+'" style="--d:'+d+'" data-pid="'+esc(pi.id||'')+'">'+
    '<span class="rp-mate__ava"><span class="kf">'+(u?'<img src="'+u+'" alt="">':'')+'</span>'+badge+'</span>'+
    '<div><div class="rp-mate__name">'+esc(pi.name)+'<span>'+esc(role)+'</span>'+state+(up&&!lost?'<span class="rp-lvl">Level '+pi.lvl1+'</span>':'')+'</div>'+
    (lost?'':'<div class="rp-xp'+(up?' is-up':'')+'" style="--from:'+from+'%;--gain:'+gain+'%"><i class="was"></i><i class="now"></i></div>')+'</div>'+
    (lost?'<span></span>':'<div class="rp-mate__gain">+'+Math.round((pi.xp||0)*100)+'% XP<small>Lv '+pi.lvl1+' · '+pct(pi.xp1)+'%</small></div>')+'</div>';
}
/* Revolution progress in the hub's ember, then the region's liberation on the rebel-red wheel */
function rpRev(m,cr){
  const lvl=G.revLevel||1,r0=cr.renown0||0,r1=cr.renown1===undefined?r0+cr.gain:cr.renown1;
  const where=(pdef(m.loc)||{}).name||'';
  const P=cr.parts||{mission:cr.gain};
  const lines=[[P.mission,'mission'],[P.first,'first operation in '+where],[P.second,'second operation in '+where],[P.lib,'liberation'],
    [P.libFull,cr.lib?cr.lib.region+' liberated':'region liberated'],[P.symbol,'Symbol of the Revolution']]
    .filter(x=>x[0]>0).map(x=>rpDrow('var(--sr-ember-hi)',fmt1(x[0]),x[1])).join('');
  let h='<div class="rp-meter is-rev" style="--c:var(--sr-ember-hi);--from:'+fmt1(r0)+';--to:'+fmt1(r1)+';--d:.5s">'+
    '<span class="rp-revring" style="--to:'+fmt1(r1)+'"><span>'+IC('revflame')+'<b>'+ROMAN[Math.max(0,Math.min(4,lvl-1))]+'</b></span></span>'+
    '<div><div class="rp-meter__top">Revolution progress<em>+'+fmt1(r1-r0)+'</em></div><div class="rp-bar"><i class="was"></i><i class="now"></i></div>'+
    '<div class="rp-meter__sub">'+fmt1(r0)+' → '+fmt1(r1)+' of 100'+(lvl<5?' to Level '+ROMAN[lvl]:'')+'</div>'+
    (lines?'<div class="rp-drows">'+lines+'</div>':'')+'</div></div>';
  if(cr.lib){
    const L=cr.lib;
    h+='<div class="rp-meter is-lib" style="--c:var(--sr-rebel);--from:'+L.from+';--to:'+L.to+';--d:.6s">'+
      '<span class="gx-wheel" style="--p:'+L.to+'" role="img" aria-label="'+L.to+'% liberated">'+IC('revflame')+'</span>'+
      '<div><div class="rp-meter__top">'+esc(L.region)+' liberation<em>+'+(L.to-L.from)+'%</em></div><div class="rp-bar"><i class="was"></i><i class="now"></i></div>'+
      '<div class="rp-meter__sub">'+L.from+'% → '+L.to+'%'+(L.capped?' (capped)':'')+'</div></div></div>';
  }
  return '<div class="rp-rev">'+h+'</div>';
}
function reportHTML(rp){
  const m=rp.m,got=rp.got||newGot();
  const objs=(m.objectives||['Complete the operation']).filter(o=>o[0]!=='(');
  const hero='<div class="rp-hero">'+rpSkyline()+'<div class="rp-hero__txt">'+rpLoc(m)+'<h3 class="sr-brief__title">'+m.name+'</h3>'+
    (rp.win?'<div class="rp-hero__meta"><span class="rp-objpill">'+IC('check')+'All '+objs.length+' objective'+(objs.length===1?'':'s')+'</span></div>':'')+'</div>'+
    '<span class="sr-stamp '+(rp.win?'sr-stamp--action':'sr-stamp--bad')+'">'+(rp.win?'Secured':'Mission failed')+'</span></div>';
  const res=rpRes(got);
  const nLoot=got.loot.length;
  const left=[];
  if(!rp.win){
    const list=rp.objs&&rp.objs.length?rp.objs:objs.map(t=>({t,done:false}));
    const done=list.filter(o=>o.done).length;
    left.push(rpSec(0.1,'missions','Objectives','<b class="is-bad">'+done+' / '+list.length+'</b>','<div class="rp-objs">'+list.map(o=>o.done?
      '<div class="sr-obj is-done"><span class="sr-obj__mark">'+IC('check')+'</span><span>'+o.t+'</span></div>':
      '<div class="sr-obj rp-obj-fail"><span class="sr-obj__mark">'+IC('clear')+'</span><span>'+o.t+'</span></div>').join('')+'</div>'));
  }
  if(res)left.push(rpSec(0.15,'credits',rp.win?'Resources':'Recovered','','<div class="rp-res">'+res+'</div>'));
  if(nLoot)left.push(rpSec(0.25,'loot','Loot','<b>'+got.loot.reduce((a,e)=>a+e.n,0)+'</b>','<div class="rp-loot">'+rpLoot(got,RP_LOOT_MAX())+'</div>'));
  if(!rp.win&&!res&&!nLoot)left.push(rpSec(0.15,'loot','Recovered','','<div class="pf-none">Nothing.</div>'));
  if(rp.win&&rp.cr)left.push(rpSec(0.4,'revolution','The revolution','',rpRev(m,rp.cr)));
  if(!rp.win)left.push('<section class="rp-sec" style="--d:.4s"><div class="rp-next">'+IC('missions')+'<span><b>'+m.name+'</b> stays on the Mission Board. Regroup and try again.</span></div></section>');
  const crew=rp.people.length?rpSec(0.2,'people','Crew','','<div class="rp-crew">'+rp.people.map(rpMate).join('')+'</div>'):'';
  return wHead(rp.win?'Mission Complete':'Mission Failed')+hero+
    '<div class="sr-window__body rp-body"><div class="rp-col">'+left.join('')+'</div><div class="rp-col">'+crew+'</div></div>'+
    wFoot(rbtn('data-close','Continue',false,'sr-btn--primary'));
}
/* loot cells: two rows of four, of three on a phone */
const RP_LOOT_MAX=()=>ROOT.clientWidth&&ROOT.clientWidth<=900?6:8;

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
    {const tv=plTransport();if(tv&&canSupplyDrop(tv)&&G.supplies<DROP_COST)short.s=1;}   // a drop the stores can't cover
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
  if(msOpen&&!winMode)sel='navMissions';
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
    else if(p.assign.startsWith('room:'))tag='<span class="sr-tag sr-tag--good" title="'+esc(SP.title(p))+'">'+(ROOMTAG[p.assign.slice(5)]||'Working')+'</span>';
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
    return '<button class="sr-unit" data-fighter="'+f.id+'" style="--c:var(--sr-shield)">'+shipAvatar('',f)+
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
  if(msOpen)renderMissions();
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
const sellPrice=id=>{const m=KIT[id];return m&&m.price?Math.floor(m.price*0.3*(runnersOf('smuggler.fence').length?RU.fence_mult:1)):0;};   // Fence (Smuggler)
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
  const lbl=arOpen?'Loadouts':bmOpen?'Sweet Tooth':msOpen?'Briefing':'Crew and flight';
  btn.setAttribute('aria-label',lbl);btn.title=lbl;
}
function openArsenal(){
  closeWin();closeTilePop();exitRoomView();closeMarket();closeMissions();
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
    const pf=padsFree(),free=pf.small+pf.large;
    cards+='<div class="ar-baynew">'+(free?'<b>'+free+' landing pad'+(free>1?'s':'')+' free'+(pf.large?' ('+pf.large+' large)':'')+'</b><span>A ship from Sweet Tooth needs one. Haulers need a large pad.</span>':'<b>No landing pads free</b><span>A ship from Sweet Tooth would need one — expand the Hangar.</span>')+'</div>';
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
/* Refit (Aerogineer): with one in the Workshop a weapon change is done at once; without, the ship is laid up 2 days */
function refitTime(f){
  if(runnersOf('aerogineer.refit').length)return '';
  f.refit=2;
  return ' Without an Aerogineer it takes the mechanics 2 days: the ship is grounded meanwhile.';
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
    news('<b>'+esc(wpnLabel(id))+'</b> fitted to the <b>'+esc(f.name)+'</b>.'+refitTime(f),'d');
  } else if(mi<f.loadout.length){
    const old=f.loadout[mi];
    f.loadout.splice(mi,1);
    const oe=G.shipKit.find(x=>x.id===old);
    if(oe)oe.n++;else G.shipKit.push({id:old,n:1});
    news('The <b>'+esc(wpnLabel(old))+'</b> comes off the <b>'+esc(f.name)+'</b> and onto the racks.'+refitTime(f),'d');
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
$('msView').addEventListener('click',msClick);
$('railMissions').addEventListener('click',msClick);
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
  mercTpl:'{first} shoots for money, not for flags. Pay {them} well and {they} might start caring. Comes with {their} own {weapon}.',   // Phase 3
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
const padFree=(cls,n)=>berthFree(cls||'talon',n);   // a bought ship needs a pad of its size held for it (C-32)
const shipSerial=cls=>{
  const n=G.fighters.filter(f=>f.cls===cls).length+(G.inbound||[]).filter(x=>x.kind==='ship'&&x.cls===cls).length+1;
  return (SHIP_SHORT[cls]||((SRDB.ship(cls)||{}).name||cls))+' '+n;   // the class's short name plus a number
};
/* a small deterministic RNG: the campaign seed and the week decide the stock, so a reload never rerolls */
const mulberry32=UT.mulberry32;
const marketWeek=()=>Math.floor((G.day-1)/7)+1;   // week k covers days 7k-6 .. 7k
const nyxAccess=()=>{const st=pst('nyx');return !!(st&&st.access);};
const lotPrice=l=>Math.round(l.price*(nyxAccess()?0.9:1)*(on('smuggler.haggler')?1-RU.haggler:1));   // the Regulars' discount and Haggler (Smuggler), at display and purchase time
/* salt: a fresh roll inside the week (Inside Line); it does not replace the market or use up a Special Order */
function rollMarket(salt){
  if(!G.seed)G.seed=1+Math.floor(Math.random()*0x7fffffff);   // the campaign seed (added lazily to old saves)
  const week=marketWeek();
  const r=mulberry32((G.seed^Math.imul(week,0x9E3779B9)^Math.imul(salt||0,0x85EBCA6B))>>>0);
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
  const CATW=marketWeights(G.revLevel||1).map(([c,w])=>[c,(c==='ship'||c==='vehicle')&&on('smuggler.rarefinds')?w*2:w]);   // Rare Finds (Smuggler)
  const notTaken=keys=>keys.filter(k2=>!taken.includes(k2));
  const eligible=c=>
    (c==='weapon'||c==='gadget'||c==='armour')?byCat(c).filter(id=>!taken.includes(id)):
    c==='ship'?notTaken(Object.keys(SHIP_PRICE)):
    c==='shipwpn'?notTaken(Object.keys(SHIPWPN_PRICE)):
    c==='vehicle'?notTaken(Object.keys(VEH_PRICE).filter(t=>GVEH[t])):
    [];
  const addOf=(cat,id,k)=>{
    if(cat==='merc')addMerc(k);
    else if(id&&cat==='ship')addBig('ship',id,SHIP_PRICE[id]);
    else if(id&&cat==='shipwpn')addBig('shipwpn',id,SHIPWPN_PRICE[id]);
    else if(id&&cat==='vehicle')addBig('vehicle',id,VEH_PRICE[id]);
    else addKit(id||pickFrom(pool));
  };
  // Special Order (Smuggler): the kind of item asked for takes the last lot
  const ord=!salt&&sjobs().find(j=>j.k==='smuggler.specialorder');
  for(let k=0;k<3;k++){
    let id=null,cat=null,guard=0;
    if(ord&&k===2){
      const el=eligible(ord.tid);
      if(ord.tid==='merc'||el.length){addOf(ord.tid,ord.tid==='merc'?null:el[Math.floor(r()*el.length)],k);continue;}
    }
    while(!id&&cat!=='merc'&&guard++<40){
      let x=r()*CATW.reduce((a,b)=>a+b[1],0);
      cat=CATW[CATW.length-1][0];
      for(const [c,w] of CATW){x-=w;if(x<0){cat=c;break;}}
      if(cat==='merc')break;
      const el=eligible(cat);
      if(el.length)id=el[Math.floor(r()*el.length)];
      else cat=null;
    }
    addOf(cat,id,k);
  }
  if(salt)return {lots};
  if(ord){G.sjobs=sjobs().filter(j=>j!==ord);news('<b>Sweet Tooth</b> came through on the Special Order: a '+BM_CAT[ord.tid].lab.toLowerCase()+' is on the stall.','g');}
  G.market={week,next:week*7+1,lots,unseen:lots.length};
  bmLine=null;
  return G.market;
}
/* Smuggling Runs (Smuggler): deliveries take half the time */
const runsDays=()=>runnersOf('smuggler.runs').length?1:2;
/* Inside Line (Smuggler): `n` of the lots change mid-week */
function marketSwap(n){
  const fresh=rollMarket(G.day).lots.slice(-n);
  G.market.lots.splice(-n,n,...fresh);
  G.market.unseen=(G.market.unseen||0)+n;bmLine=null;
  news('Inside Line: <b>Sweet Tooth</b> has swapped '+n+' lots at Nyx.','g');
}
/* saves: additive only — a campaign without a market (new game or old save) rolls the current week once */
function ensureMarket(){
  if(!G)return;
  if(!G.market||!G.market.lots)rollMarket();
}
function openMarket(){
  closeWin();closeTilePop();exitRoomView();closeArsenal();closeMissions();
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
  if(l.kind==='ship'&&!padFree(l.key,all?l.stock:1))return false;
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
    G.inbound.push({kind:'ship',cls:l.key,name:shipSerial(l.key),days:runsDays()});   // the pad stays held for it
    news('<b>'+esc((SRDB.ship(l.key)||{}).name||l.key)+'</b> is on its way from Nyx. Lands in '+runsDays()+' day'+(runsDays()>1?'s':'')+'.','g');
  } else if(l.kind==='vehicle'){
    G.inbound=G.inbound||[];
    G.inbound.push({kind:'vehicle',type:l.key,days:runsDays()});
    news('<b>'+esc((GVEH[l.key]||{}).label||l.key)+'</b> is on its way from Nyx. Arrives in '+runsDays()+' day'+(runsDays()>1?'s':'')+'.','g');
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
    pitch=MT.fill(ST_LINES.mercTpl,{first:m.first||m.name.split(' ')[0],them:'them',they:'they',their:'their',weapon:kitNameId(wk)});
    if(!mercBunkFree())return pitch+' '+ST_LINES.needBunk;   // the blocked reason lives in her line (no hint text)
  } else {
    pitch=ST_LINES.pitch[l.key]||ST_LINES.pitchCat[l.kind==='kit'?(KIT[l.key]||{}).cat:l.kind]||ST_LINES.greet;
    if(l.kind==='ship'&&!padFree(l.key))return pitch+' '+ST_LINES.needPad;
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
  const whyBuy=sold?'Sold out':merc&&!mercBunkFree()?'Needs a free bunk':l.kind==='ship'&&!padFree(l.key)?(isLargeShip(l.key)?'Needs a free large pad':'Needs a free landing pad'):G.credits<price?'Need '+Math.ceil(price-G.credits)+' more credits':'';
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
addEventListener('resize',()=>{if(arOpen)renderArsenal();if(bmOpen)renderMarket();if(msOpen)msFit();});

/* ---------- input ---------- */
function figAt(px,py){
  let best=null,bd=1e9;
  for(const f of rvFigs){
    const d=Math.hypot(px-f.x,py-f.y);
    if(d<f.r&&d<bd){bd=d;best=f;}
  }
  return best;
}
/* the base map pans with a drag and zooms with the wheel or a pinch; a drag never counts as a click */
const camPtrs=new Map();let camDrag=null,camSwallow=false;
const onBaseMap=()=>started&&G&&baseView!=='galaxy'&&!viewRoom;
cv.addEventListener('pointerdown',ev=>{
  if(!onBaseMap())return;
  if(!camPtrs.size)camSwallow=false;
  camPtrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  camDrag={x:ev.clientX,y:ev.clientY,moved:false,d:camPtrs.size>1?camSpread():0};
});
function camSpread(){const p=[...camPtrs.values()];return p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;}
addEventListener('pointerup',ev=>{camPtrs.delete(ev.pointerId);if(!camPtrs.size)camDrag=null;else if(camDrag)camDrag.d=camSpread();});
addEventListener('pointercancel',ev=>{camPtrs.delete(ev.pointerId);if(!camPtrs.size)camDrag=null;});
cv.addEventListener('wheel',ev=>{
  if(!onBaseMap())return;
  ev.preventDefault();
  const r=cv.getBoundingClientRect();
  zoomCam(Math.exp(-ev.deltaY*0.0015),ev.clientX-r.left,ev.clientY-r.top);layoutTilePop();
},{passive:false});
cv.addEventListener('pointermove',ev=>{
  if(camDrag&&camPtrs.has(ev.pointerId)&&onBaseMap()){
    const prev=camPtrs.get(ev.pointerId);camPtrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(!camDrag.moved&&Math.hypot(ev.clientX-camDrag.x,ev.clientY-camDrag.y)>6)camDrag.moved=true;
    if(camDrag.moved){
      if(camPtrs.size>1){
        const d=camSpread(),r=cv.getBoundingClientRect(),p=[...camPtrs.values()];
        if(camDrag.d)zoomCam(d/camDrag.d,(p[0].x+p[1].x)/2-r.left,(p[0].y+p[1].y)/2-r.top);
        camDrag.d=d;
      } else {baseCam.x+=ev.clientX-prev.x;baseCam.y+=ev.clientY-prev.y;clampCam();}
      camSwallow=true;layoutTilePop();
      return;
    }
  }
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
  if(camSwallow){camSwallow=false;return;}   // the end of a pan or a pinch
  if(shell.classList.contains('is-drawer-open'))setDrawer(false);
  if(baseView==='galaxy'){
    const r=cv.getBoundingClientRect();
    const px=ev.clientX-r.left,py=ev.clientY-r.top;
    sClick();
    if(gxWorld){gxWorldClick(px,py);return;}
    let best=null,bd=1e9;
    const pri={o:0,s:1,c:1,p:2};
    for(const h of gxHitL){
      const d2=Math.hypot(px-h.x,py-h.y);
      if(d2<h.r){const score=pri[h.t]*1000+d2;if(score<bd){bd=score;best=h;}}
    }
    if(!best){if(srcSel){srcSel=null;syncUI();}return;}
    if(best.t==='o'){openOpp(best.id);return;}
    if(best.t==='c'){openWin('candidate',best.id);return;}
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
/* the Support specialties' buttons, wherever they show (room panel, file, windows, planning board) */
function supportClick(t){
  const g=a=>t.getAttribute(a);
  if(g('data-pfile')){const p=G.people.find(x=>x.id===g('data-pfile'));if(p){sClick();openWin('person',p);}return true;}
  if(g('data-sjob')){const [pid,k]=g('data-sjob').split('|');sClick();openWin('sjob',{pid,k});return true;}
  if(g('data-sjgo')){const [pid,k,tid,opt]=g('data-sjgo').split('|');if(startJob(pid,k,tid,opt||null)){sClick();closeWin();if(viewRoom)renderRoomBar();}return true;}
  if(g('data-sjstop')){stopJob(g('data-sjstop'));sClick();if(viewRoom)renderRoomBar();return true;}
  if(g('data-lead')){const [n,pid]=g('data-lead').split(':');setLead(n,pid);sClick();if(viewRoom)renderRoomBar();return true;}
  if(g('data-fork')){const [pid,lv,f]=g('data-fork').split(':');chooseFork(pid,+lv,f);sClick();return true;}
  if(g('data-niche')){const [pid,k]=g('data-niche').split(':');startNiche(pid,k);sClick();return true;}
  if(g('data-plot')&&PL){PL.plot=g('data-plot');sClick();renderWin();return true;}
  if(g('data-pljob')&&PL){const [k,pid]=g('data-pljob').split('|');PL.sj=PL.sj||{};PL.sj[k]=PL.sj[k]===pid?null:pid;sClick();renderWin();return true;}
  return false;
}
$('roomViewBar').addEventListener('click',ev=>{
  const t=ev.target.closest('button');
  if(!t)return;
  sClick();
  if(t.hasAttribute('data-backbase')){exitRoomView();syncUI();return;}
  if(supportClick(t))return;
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
    const un=ev.target.closest('[data-unslot]');
    if(un){delete PL.v[un.getAttribute('data-unslot')];PL.pick=null;sClick();renderWin();return;}
    const rma=ev.target.closest('[data-rmasset]');
    if(rma){plRemoveAsset(+rma.getAttribute('data-rmasset'));PL.pick=null;sClick();renderWin();return;}
    const pv=ev.target.closest('[data-pickval]');
    if(pv){
      if(pv.disabled)return;
      const rid=pv.getAttribute('data-pickval'),key=PL.pick;
      PL.pick=null;
      if(key==='addasset'){
        if(rid[0]==='v')plSet('gv0',rid);
        else{const i=plAddAsset();if(i>=0)plSet('as'+i+'s',rid);}
      } else plDrop(key,rid);
      sClick();renderWin();return;
    }
    const pk=ev.target.closest('[data-pick]');
    if(pk){const k=pk.getAttribute('data-pick');PL.pick=PL.pick===k?null:k;sClick();renderWin();return;}
    const gt=ev.target.closest('[data-goto]');
    if(gt){
      const el=$('winCardB').querySelector('[data-slot="'+gt.getAttribute('data-goto')+'"]');
      if(el){el.scrollIntoView({block:'nearest'});el.classList.remove('is-pulse');void el.offsetWidth;el.classList.add('is-pulse');}
      return;
    }
    if(PL.pick&&!ev.target.closest('.pl-pick')){PL.pick=null;renderWin();return;}
  }
  if(winMode==='person'||winMode==='plan'){   // detail buttons: a tap pins the popover open; another tap, or a tap elsewhere, closes it
    const tip=ev.target.closest('[data-pftip]'),open=$('winCardB').querySelectorAll('.pf-tip.is-open');
    if(tip){const w=tip.closest('.pf-tip'),was=w.classList.contains('is-open');open.forEach(x=>x.classList.remove('is-open'));if(!was)w.classList.add('is-open');return;}
    if(!ev.target.closest('.pf-pop'))open.forEach(x=>x.classList.remove('is-open'));
  }
  const t=ev.target.closest('button,a,input');
  if(!t)return;
  if(t.id==='launchBtn'){startPlan();return;}
  if(supportClick(t))return;
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
    if(on('instructor.academy')&&(p.level||1)<2){p.level=2;p.rank=Math.max(p.rank||0,0);}   // Academy (Instructor)
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
  if(t.hasAttribute('data-gocommand')){   // the unstaffed Mission Control card points at the Command Center
    const rm=G.rooms.find(r=>r.key==='command'&&!r.build);
    closeWin();
    if(rm)enterRoomView(rm);
    syncUI();return;
  }
  const cand=t.getAttribute('data-cand');
  if(cand){if(cand==='no')declineCandidate(winArg);else if(cand==='standby')standbyCandidate(winArg);else acceptCandidate(cand);return;}
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
    if(now){Rebel.moraleBump(p,5,'promo');mood();news('<b>'+p.name+'</b> promoted from '+was+' to <b>'+now+'</b>.','g');sGood();sBuild();saveSnap();syncUI();renderWin();}
    return;
  }
  const comId=t.getAttribute('data-commission');
  if(comId){
    const p=G.people.find(x=>x.id===comId),was=p&&rankFor(p),now=p&&Rebel.commission(p);
    if(now){Rebel.moraleBump(p,8,'promo');mood();news('<b>'+p.name+'</b> is commissioned: '+was+' to <b>'+now+'</b>.','g');sGood();sBuild();saveSnap();syncUI();renderWin();}
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
    const mode=parts[0]==='room'?'room:'+parts[1]:parts[0];
    const pid=parts[parts.length-1];
    const p=G.people.find(x=>x.id===pid);
    if(p&&mode.startsWith('room:')){const key=mode.slice(5);if(!isSupport(p)||SP.homeOf(p)!==key||!hasRoom(key)||(p.assign!==mode&&postedTo(key).length>=roomCap(key)))return;}
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
  if(msOpen){closeMissions();return;}
  if(winMode)closeWin();
  showView('base');
});
$('navSources').addEventListener('click',()=>{sClick();closeArsenal();closeMarket();closeMissions();if(winMode)closeWin();showView('galaxy');});
$('navMissions').addEventListener('click',()=>{sClick();if(winMode)closeWin();if(baseView!=='base')setView('base');openMissions();});
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
A.bindSound(ROOT,'soundBtn');   // the top-bar button and the menu's Sound row (shared wiring, persisted)
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
    else if(msOpen)closeMissions();
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
    const opts=[...$('winCardB').querySelectorAll('.sr-choice,.cm-choice')];
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
function ablePilots(){return G.people.filter(p=>isFlyer(p)&&(!offDuty(p)||(walkItOff(p)&&!conked(p)))&&p.assign!=='mission'&&p.assign!=='spec'&&!Rebel.expHas(p,'grieving'));}
function grafReady(){return G.fighters.some(f=>f.cls==='graf'&&!f.out&&!(f.refit>0)&&f.hull>=60);}
/* ---------- mission requirements & the planning board ---------- */
function reqOf(m){return m.req||MTYPES[typeOf(m)].req(m);}
function soldierPool(){return G.people.filter(p=>isGround(p)&&(!offDuty(p)||(walkItOff(p)&&!conked(p)))&&p.assign!=='mission'&&p.assign!=='spec'&&!Rebel.expHas(p,'grieving'));}
function transportPool(){return G.fighters.filter(f=>SEATS[f.cls]&&!f.out&&!(f.refit>0)&&f.hull>=60);}
function shipPool(r){return G.fighters.filter(f=>!f.out&&!(f.refit>0)&&f.hull>=60&&(!r.starfighter||!SEATS[f.cls]));}
function transportSlots(r){return Math.ceil(r.team/SEATS.graf);}
function minFuel(m){
  const r=reqOf(m);
  const costs=(r.transport?transportPool():shipPool(r)).map(fuelOf).sort((a,b)=>a-b);
  const n=r.transport?transportSlots(r):(r.ships||r.team);
  return costs.slice(0,n).reduce((a,b)=>a+b,0)||fuelPer('cross')*n;
}
/* what a mission needs. label: the planning board's line; brief: the briefing's count-first label ("3 Soldiers"),
   detail: a generic reason when unmet (it never names anyone), why: what the Plan button says when blocked */
function precondList(m){
  const r=reqOf(m),out=[];
  const pl=(n,w)=>n+' '+w+(n>1?'s':'');
  const short=(have,n)=>have?'Only '+have+' available':'None available';
  const needs=(n,w)=>'Needs '+(n>1?n+' '+w+'s':(/^[aeiou]/i.test(w)?'an ':'a ')+w.toLowerCase());
  if(r.transport){
    const T=transportSlots(r),np=T+(r.prize||0),sp=soldierPool().length,ap=ablePilots().length,tp=transportPool().length;
    out.push({ok:sp>=r.team,label:r.team+' rebel soldier'+(r.team>1?'s':'')+' available',brief:pl(r.team,'Soldier'),detail:short(sp,r.team),why:needs(r.team,'soldier')});
    out.push({ok:ap>=np,label:np+' pilot'+(np>1?'s':'')+' available'+(r.prize?' — one to fly the hauler, one for the prize':''),brief:pl(np,'Pilot'),detail:short(ap,np),why:needs(np,'pilot')});
    out.push({ok:tp>=T,label:T+' hauler'+(T>1?'s':'')+' available',brief:pl(T,'Transport'),
      detail:G.wreck&&!G.wreck.restored&&!G.wreck.restoring?'Restore the hauler in the Hangar':short(tp,T),why:needs(T,'transport')});   // the onboarding hauler step
  } else {
    const n=r.ships||r.team,ap=ablePilots().length,shp=shipPool(r).length,w=r.starfighter?'Starfighter':'Ship';
    out.push({ok:ap>=r.team,label:r.team+' starfighter pilot'+(r.team>1?'s':'')+' available',brief:pl(r.team,'Pilot'),detail:short(ap,r.team),why:needs(r.team,'pilot')});
    out.push({ok:shp>=n,label:n+' '+(r.starfighter?'starfighter':'ship')+(n>1?'s':'')+' available'+(r.starfighter?' — a transport won’t do':''),brief:pl(n,w),
      detail:r.starfighter&&!shp&&G.fighters.length?'A transport won’t do':short(shp,n),why:needs(n,w.toLowerCase())});
  }
  for(const it of r.items||[]){
    const have=(it.ids||[it.id]).reduce((n,id)=>n+((G.armory.find(a=>a.id===id)||{}).n||0),0);
    out.push({ok:have>=it.n,label:it.n+' '+it.label+(it.n>1?'s':'')+' in the armory <span class="sr-faint">(have '+have+')</span>',brief:pl(it.n,it.label),detail:'Have '+have,why:needs(it.n,it.label)});
  }
  if(r.spec){
    out.push({ok:soldierPool().some(p=>hasSpec(p,r.spec.key)),soft:true,label:'1 '+r.spec.label+' available',hint:r.spec.hint,brief:'1 '+r.spec.label,detail:r.spec.hint||'None available',why:needs(1,r.spec.label)});
  }
  const need=minFuel(m);
  out.push({ok:G.fuel>=need,label:'Fuel for the sortie: '+F(need,G.fuel<need)+' <span class="sr-faint">(have '+Math.floor(G.fuel)+')</span>',brief:need+' Fuel',detail:'Have '+Math.floor(G.fuel),why:'Needs more fuel'});
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
let PL=null;
function openPlan(m){
  const r=reqOf(m);
  PL={m,req:r,v:{},slots:[],assets:[],pick:null};
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
    // Scramble (Flight Controller): one more ship if a free one supports the mission
    const fcl=m.lead&&pickControl('space');
    if(fcl&&n<4&&SP.canRun(fcl,SP.UK['flightctl.scramble'],leadOf('flightctl'))){
      PL.slots.push({key:'rp'+n,acc:'pilot',label:'Scrambled pilot',opt:true});
      PL.slots.push({key:'rs'+n,acc:'ship',label:'Scrambled ship',opt:true});
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
  return slot.acc==='vehicle'?!!SEATS[f.cls]:slot.acc==='ship'?shipPool(PL.req).some(x=>x.id===id):slot.acc==='assetship'?(!f.out&&!(f.refit>0)&&f.hull>=60):false;
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
  return PL.slots.some(sl=>sl.acc==='soldier'&&PL.v[sl.key]&&hasSpec(G.people.find(p=>p.id===PL.v[sl.key])||{},sp.key));
}
function plAddAsset(){
  if(!PL.req.transport||PL.assets.length>=2)return -1;
  const i=PL.assets.length;
  PL.assets.push({});
  PL.slots.push({key:'as'+i+'s',acc:'assetship',label:'Support ship'},{key:'as'+i+'p',acc:'apilot',label:'Support pilot'});
  return i;
}
function plRemoveAsset(i){
  if(i===undefined)i=PL.assets.length-1;
  if(i<0||i>=PL.assets.length)return;
  const keep=[];
  PL.assets.forEach((a,k)=>{if(k!==i)keep.push({s:PL.v['as'+k+'s'],p:PL.v['as'+k+'p']});});
  PL.slots=PL.slots.filter(sl=>!/^as\d/.test(sl.key));
  for(const k of Object.keys(PL.v))if(/^as\d/.test(k))delete PL.v[k];
  PL.assets=[];
  for(const kv of keep){const j=plAddAsset();if(j>=0){if(kv.s)PL.v['as'+j+'s']=kv.s;if(kv.p)PL.v['as'+j+'p']=kv.p;}}
}
/* what an asset grants is its nature's, not a toggle's: a starfighter strafes, a transport with a Door Mounted Gun
   covers the squad from the door. (What a spare gunless transport grants — the old Reinforce mode — is a blocker.) */
function plAssetMode(i){
  const f=G.fighters.find(x=>x.id===PL.v['as'+i+'s']);
  if(!f)return null;
  if(!SEATS[f.cls])return 'strafe';
  return hasDoorGun(f)?'doorgun':null;
}
/* fire support is granted by the assets assigned, with no toggles: a Supply Drop if the transport's type can fly
   one (the Ships table's supply_drop) and the supplies are there, Door Gunner Cover if a Door Mounted Gun is fitted */
const plTransport=()=>PL&&PL.req.transport?G.fighters.find(x=>x.id===PL.v.tv0)||null:null;
const canSupplyDrop=f=>{const r=f&&SRDB.ship(f.cls);return !!(r&&r.supply_drop);};
const plDropOn=()=>{const tv=plTransport();return !!tv&&canSupplyDrop(tv)&&G.supplies>=DROP_COST;};
const plGunOn=()=>{const tv=plTransport();return !!tv&&hasDoorGun(tv);};
/* the squad size: the mission's, capped by the seats of the transports actually assigned */
function plSquadMax(){
  const r=PL.req;
  if(!r.transport)return 0;
  const tvs=PL.slots.filter(sl=>sl.acc==='vehicle'&&PL.v[sl.key]).map(sl=>G.fighters.find(f=>f.id===PL.v[sl.key])).filter(Boolean);
  if(!tvs.length)return r.team;
  return Math.max(1,Math.min(r.team,tvs.reduce((n,f)=>n+(SEATS[f.cls]||0),0)));
}
/* the slots this plan actually needs: soldier slots beyond the seat cap don't count */
function plActiveSlots(){
  const max=plSquadMax();let si=0;
  return PL.slots.filter(sl=>sl.acc!=='soldier'||si++<max);
}
function plComplete(){return plActiveSlots().every(sl=>PL.v[sl.key]||sl.opt)&&plSpecOk();}
function plFuel(){
  let t=0;
  for(const sl of PL.slots)if(sl.acc==='vehicle'||sl.acc==='ship'||sl.acc==='assetship'){const f=G.fighters.find(x=>x.id===PL.v[sl.key]);if(f)t+=fuelOf(f);}
  return t;
}
function plAutoFill(){
  for(const k of Object.keys(PL.v))if(!/^as/.test(k))delete PL.v[k];
  const m=PL.m;
  for(const sl of plActiveSlots()){
    if(PL.v[sl.key]||/^as/.test(sl.key)||sl.acc==='gveh')continue;
    const used=plUsedIds();
    let pool=[];
    if(sl.acc==='soldier')pool=soldierPool().sort((a,b)=>(hasSpec(b,(PL.req.spec||{}).key)?1:0)-(hasSpec(a,(PL.req.spec||{}).key)?1:0)).map(p=>'p:'+p.id);
    else if(sl.acc==='pilot')pool=ablePilots().map(p=>'p:'+p.id);
    else if(sl.acc==='vehicle')pool=transportPool().map(f=>'f:'+f.id);
    else pool=shipPool(PL.req).map(f=>'f:'+f.id);
    const pick=pool.find(r=>!used.has(r.slice(2)));
    if(pick)plSet(sl.key,pick);
  }
}
const shipAvatar=(extra,f)=>{const u=f&&shipTopURL(f,48,48,1.15);return '<span class="sr-avatar" style="--c:var(--sr-shield)'+(extra||'')+'">'+(u?'<img class="bs-face bs-shipface" src="'+u+'" alt="">':IC('ship'))+'</span>';};
const personAvatar=p=>'<span class="sr-avatar'+(p.role==='Pilot'||p.role==='Hero'?' sr-avatar--pilot':'')+'">'+faceHTML(p)+'</span>';
const personSub=p=>rankFor(p)+', level '+p.level+(p.spec?' · '+specOf(p):'');
const shipSub=f=>SRDB.ship(f.cls).name;
const vehAvatar=()=>'<span class="sr-avatar" style="--c:var(--sr-gold)">'+IC('vehicle')+'</span>';
const vehSub=v=>gvehOf(v).label+' \u00b7 '+(gvehOf(v).kind==='bot'?'Bot':'vehicle, '+gvehOf(v).seats+' seat'+(gvehOf(v).seats>1?'s':''))+' \u00b7 '+Math.round(v.hp)+'%';
/* ---------- the planning window (docs/ui/SCREENS-HANDOFF-2.md §4) ----------
   Built around filling slots: the briefing strip, the squad cards with a seat counter, the asset cards with
   their pilots layered on, fire support granted by the assets (no toggles), Mission Control, and a footer whose
   blocker names the empty slots. No roster column, no checklist; a click on any empty slot opens a picker. */
const plFace=p=>'<span class="kf">'+faceHTML(p)+'</span>';
const plLvl=p=>'<span class="pl-lvl" style="--xp:'+Math.round((p.xp||0)*100)+'" title="Level '+p.level+'"><b>'+p.level+'</b></span>';
/* who or what fits a slot, with the reason when they can't come */
function plWhyPerson(p,used){
  if(used.has(p.id))return 'In squad';
  if(laidUp(p))return 'Injured · '+outDays(p)+' day'+(outDays(p)>1?'s':'');
  if(conked(p))return 'Resting · '+Rebel.restDays(p)+' day'+(Rebel.restDays(p)>1?'s':'');
  if(p.assign==='mission')return 'On a mission';
  if(p.assign==='spec')return 'Training';
  if(Rebel.expHas(p,'grieving'))return 'Grieving';
  return null;
}
function plWhyShip(f,used,sl){
  if(used.has(f.id))return 'Assigned';
  if(f.out)return 'On a mission';
  if(f.refit>0)return 'In refit';
  if(f.hull<60)return 'Hull '+f.hull+'%';
  if(sl.acc==='ship'&&PL.req.starfighter&&SEATS[f.cls])return 'A transport won’t do';
  if(sl.acc==='vehicle'&&!SEATS[f.cls])return 'No seats';
  return null;
}
function plPickHTML(key){
  const used=plUsedIds();
  const opts=[];
  const opt=(rid,art,name,sub,why)=>opts.push('<button type="button" class="pl-opt" data-pickval="'+rid+'"'+(why?' disabled':'')+'>'+art+
    '<span><b>'+esc(name)+'</b><small>'+esc(sub)+'</small></span><em style="--c:'+(why?'var(--sr-text-3)':'var(--sr-go)')+'">'+esc(why||'Available')+'</em></button>');
  const people=list=>{for(const p of list)opt('p:'+p.id,plFace(p),p.name,personSub(p),plWhyPerson(p,used));};
  const ships=(list,sl)=>{for(const f of list){const u=shipTopURL(f,48,48,1.15);
    opt('f:'+f.id,'<span class="kf">'+(u?'<img class="bs-face bs-shipface" src="'+u+'" alt="">':IC('ship'))+'</span>',
      f.name,shipSub(f)+' · '+F(fuelOf(f))+(SEATS[f.cls]?' · '+SEATS[f.cls]+' seats':''),plWhyShip(f,used,sl));}};
  const vehs=()=>{for(const v of vehPool())opt('v:'+v.id,'<span class="kf">'+IC('vehicle')+'</span>',v.name,vehSub(v),used.has(v.id)?'Assigned':null);};
  let title='Pick';
  if(key==='addasset'){
    title='Add an asset';
    if(PL.assets.length<2)ships(G.fighters,{acc:'assetship'});
    if(PL.slots.some(sl=>sl.acc==='gveh'&&!PL.v[sl.key]))vehs();
  } else {
    const sl=PL.slots.find(x=>x.key===key);
    if(!sl)return '';
    title=sl.label;
    if(sl.acc==='soldier')people(G.people.filter(isGround));
    else if(sl.acc==='pilot'||sl.acc==='apilot')people(G.people.filter(isFlyer));
    else if(sl.acc==='gveh')vehs();
    else ships(G.fighters.filter(f=>sl.acc!=='vehicle'||SEATS[f.cls]),sl);
  }
  return '<div class="pl-pick" style="left:0;top:calc(100% + 8px)"><div class="pl-pick__t">'+esc(title)+'<span>'+opts.length+' to pick</span></div>'+
    (opts.join('')||'<div class="pf-none">Nobody fits this slot.</div>')+'</div>';
}
/* the briefing strip: where, what, the odds and the pay */
function plBriefHTML(m){
  const d=m.loc&&pdef(m.loc),lk=d?(WORLD_LOOK[d.id]||{col:'#9aa6c4'}):null;
  const reg=m.region&&d&&d.regions&&d.regions.find(x=>x.id===m.region);
  const place=reg?reg.name:(m.ctx&&m.ctx.place)||'';
  const loc=d?'<div class="pl-loc"><span class="pl-loc__it"><svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="'+lk.col+'" stroke="var(--sr-ink)" stroke-width="2.5"/></svg><span class="pl-loc__lbl">'+esc(d.name)+'</span></span>'+
    '<span class="pl-loc__dots"></span>'+
    '<span class="pl-loc__it"><svg viewBox="0 0 34 34" aria-hidden="true"><path d="M17 31c6.4-8.4 9.6-13 9.6-18A9.6 9.6 0 1 0 7.4 13c0 5 3.2 9.6 9.6 18Z" fill="var(--sr-rebel)" stroke="var(--sr-ink)" stroke-width="2.5"/><circle cx="17" cy="13.4" r="3.4" fill="var(--sr-ink)"/></svg><span class="pl-loc__lbl">'+esc(place||'Target')+'</span></span></div>':'';
  const objs=(m.objectives||['Complete the operation']);
  const nObjs=objs.filter(o=>o[0]!=='(').length;
  const objBtn='<div class="pf-tip">'+rbtn('type="button" data-pftip',nObjs+' objective'+(nObjs>1?'s':''),false,'sr-btn--ghost sr-btn--sm')+
    '<div class="pf-pop" role="tooltip"><div class="pf-pop__name">Objectives</div><div class="pf-pop__kind">'+esc(m.name)+'</div>'+
    objs.map(o=>'<div class="sr-obj'+(o[0]==='('?' sr-obj--note':'')+'"><span class="sr-obj__mark"></span><span>'+o+'</span></div>').join('')+'</div></div>';
  const kind=OPKIND[opKind(m)];
  const rl=/high/i.test(m.riskTxt)?3:/moder/i.test(m.riskTxt)?2:1;
  const rcol=rl===3?'var(--sr-c-bad)':rl===2?'var(--sr-hazard)':'var(--sr-go)';
  let rpips='';for(let i=0;i<3;i++)rpips+='<i'+(i<rl?' class="is-on"':'')+'></i>';
  const facts='<span class="pl-fact"><b>'+IC(kind.icon)+'</b><span>'+kind.label+'</span></span>'+
    '<span class="pl-fact" style="--c:'+rcol+'"><span class="pl-pips">'+rpips+'</span><b>'+esc(m.riskTxt||'Low')+'</b><span>Risk</span></span>'+
    '<span class="pl-fact"><b>'+m.days+' day'+(m.days>1?'s':'')+'</b><span>Travel time</span></span>';
  const RES3={c:['credits','var(--sr-res-credits)'],s:['supplies','var(--sr-res-supplies)'],m:['materials','var(--sr-res-materials)'],f:['fuel','var(--sr-res-fuel)'],i:['intel','var(--sr-res-intel)']};
  const rr=m.rew||{},rews=[];
  if(rr.cross||rr.fighter)rews.push('<span style="--c:var(--sr-shield)">'+IC('ship')+(rr.cross?'FT-4 Cross':'+1 fighter')+'</span>');
  for(const k in RES3)if(rr[k])rews.push('<span style="--c:'+RES3[k][1]+'">'+IC(RES3[k][0])+'+'+rr[k]+'</span>');
  rews.push('<span style="--c:var(--sr-psi)">'+IC('star')+'+XP</span>');
  const rew='<span class="pl-rew"><span class="pl-rew__row">'+rews.join('')+'</span></span>';
  return '<div class="pl-brief"><div class="pl-brief__left">'+loc+
    '<div style="min-width:0"><p class="pl-desc" title="'+esc(String(m.desc).replace(/<[^>]+>/g,''))+'">'+m.desc+'</p>'+
    '<div class="pl-meta">'+(m.from?'<span>From <b>'+esc(m.from)+'</b></span>':'')+objBtn+'</div></div></div>'+
    '<div class="pl-facts">'+facts+rew+'</div></div>';
}
/* one squad card per seat; empty seats are slots to fill, never "optional" */
function plSoldCard(sl,sub,emptyLbl,slotLine){
  const p=PL.v[sl.key]&&G.people.find(x=>x.id===PL.v[sl.key]);
  const pick=PL.pick===sl.key?plPickHTML(sl.key):'';
  if(!p)return '<div class="pl-sold pl-sold--empty pl-sold--need" data-slot="'+sl.key+'" data-pick="'+sl.key+'" role="button" tabindex="0">'+
    '<span class="pl-plus">+</span><span class="pl-sub">'+emptyLbl+'</span><span class="pl-sold__slot">'+esc(slotLine)+'</span>'+pick+'</div>';
  const kit=['primary','secondary'].map(k=>(p.gear||{})[k]).filter(Boolean).map(id=>itArt(id)).join('');
  return '<div class="pl-sold" data-slot="'+sl.key+'" data-pick="'+sl.key+'" role="button" tabindex="0" draggable="true" data-rid="p:'+p.id+'">'+
    '<span class="pl-sold__face">'+plFace(p)+plLvl(p)+'</span>'+
    '<span class="pl-name">'+esc(p.name)+'</span><span class="pl-sub">'+esc(sub||rankFor(p))+'</span>'+
    (kit?'<span class="pl-kit">'+kit+'</span>':'')+
    '<button type="button" class="pl-card__x" data-unslot="'+sl.key+'" aria-label="Remove '+esc(p.name)+'">'+IC('clear')+'</button>'+pick+'</div>';
}
function plSquadHTML(){
  const max=plSquadMax();
  const sls=PL.slots.filter(sl=>sl.acc==='soldier').slice(0,max);
  const n=sls.filter(sl=>PL.v[sl.key]).length;
  let pips='';for(let i=0;i<max;i++)pips+='<i'+(i<n?'':' class="is-free"')+'></i>';
  const count='<span class="pl-count'+(n>=max?' is-full':'')+'"><b>'+n+'/'+max+'</b><span><small>Squad size</small><span class="pl-seats">'+pips+'</span></span></span>';
  const cards=sls.map((sl,i)=>plSoldCard(sl,null,'+ Soldier','Slot '+(i+1)+' of '+max)).join('')+
    PL.slots.filter(sl=>/^pz/.test(sl.key)).map(sl=>plSoldCard(sl,sl.label,'+ Pilot',sl.label)).join('');
  return '<div><div class="pl-h">'+IC('soldier')+'Squad<span class="pl-h__end">'+count+'</span></div><div class="pl-soldiers">'+cards+'</div></div>';
}
/* an asset card: the craft with its pilot layered on; the transport is the primary */
function plAssetCard(o){
  const f=o.sKey&&PL.v[o.sKey]&&G.fighters.find(x=>x.id===PL.v[o.sKey]);
  const pick=PL.pick===o.sKey?plPickHTML(o.sKey):PL.pick===o.pKey?plPickHTML(o.pKey):'';
  const badge=k=>{
    if(!k)return '';
    const p=PL.v[k]&&G.people.find(x=>x.id===PL.v[k]);
    if(!p)return '<button type="button" class="pl-pilot pl-pilot--empty" data-pick="'+k+'" data-slot="'+k+'">+ Pilot</button>';
    return '<button type="button" class="pl-pilot" data-pick="'+k+'" data-slot="'+k+'" draggable="true" data-rid="p:'+p.id+'">'+plFace(p)+
      '<span><b>'+esc(p.name.split(' ')[0])+'</b><small>Pilot</small></span></button>';
  };
  if(!f)return '<div class="pl-asset'+(o.primary?' pl-asset--primary':'')+'" data-slot="'+o.sKey+'">'+
    '<span class="pl-asset__kick"'+(o.primary?' style="--c:var(--sr-shield)"':'')+'>'+esc(o.kicker)+'</span>'+
    '<button type="button" class="pl-asset__art pl-asset__art--empty" data-pick="'+o.sKey+'">+ '+esc(o.kicker)+'</button>'+pick+'</div>';
  const u=shipTopURL(f,150,94,2.6);
  const stats='<span class="pl-shipstats"><span>'+IC('cover')+f.hull+'%</span><span style="--c:var(--sr-res-fuel)">'+IC('fuel')+Math.round(fuelOf(f))+'</span>'+
    (SEATS[f.cls]?'<span>'+IC('people')+SEATS[f.cls]+' seats</span>':'')+'</span>';
  return '<div class="pl-asset'+(o.primary?' pl-asset--primary':'')+'" data-slot="'+o.sKey+'" draggable="true" data-rid="f:'+f.id+'">'+
    '<span class="pl-asset__kick"'+(o.primary?' style="--c:var(--sr-shield)"':'')+'>'+esc(o.kicker)+'</span>'+
    '<span class="pl-asset__art" role="button" tabindex="0" data-pick="'+o.sKey+'">'+(u?'<img class="it-art" src="'+u+'" alt="" style="object-fit:contain">':IC('ship'))+badge(o.pKey)+'</span>'+
    '<span class="pl-asset__name">'+esc(f.name)+'</span><span class="pl-sub">'+esc(shipSub(f))+'</span>'+stats+
    (o.rm!==undefined?'<button type="button" class="pl-card__x" data-rmasset="'+o.rm+'" aria-label="Remove asset">'+IC('clear')+'</button>':'')+pick+'</div>';
}
function plVehCard(sl){
  const v=PL.v[sl.key]&&G.vehicles.find(x=>x.id===PL.v[sl.key]);
  if(!v)return '';
  const pick=PL.pick===sl.key?plPickHTML(sl.key):'';
  return '<div class="pl-asset" data-slot="'+sl.key+'" draggable="true" data-rid="v:'+v.id+'">'+
    '<span class="pl-asset__kick">'+(gvehOf(v).kind==='bot'?'Bot':'Vehicle')+'</span>'+
    '<span class="pl-asset__art" role="button" tabindex="0" data-pick="'+sl.key+'">'+vehArt(v.type)+'</span>'+
    '<span class="pl-asset__name">'+esc(v.name)+'</span><span class="pl-sub">'+esc(vehSub(v))+'</span>'+
    '<button type="button" class="pl-card__x" data-unslot="'+sl.key+'" aria-label="Remove">'+IC('clear')+'</button>'+pick+'</div>';
}
function plAssetsHTML(){
  const r=PL.req;
  let cards='';
  if(r.transport){
    PL.slots.filter(sl=>sl.acc==='vehicle').forEach(sl=>{
      cards+=plAssetCard({kicker:'Transport',sKey:sl.key,pKey:'tp'+sl.key.slice(2),primary:true});
    });
    PL.assets.forEach((a,i)=>{cards+=plAssetCard({kicker:'Support ship',sKey:'as'+i+'s',pKey:'as'+i+'p',rm:i});});
    cards+=PL.slots.filter(sl=>sl.acc==='gveh').map(plVehCard).join('');
    const room=PL.assets.length<2||PL.slots.some(sl=>sl.acc==='gveh'&&!PL.v[sl.key]);
    if(room)cards+='<div style="position:relative;display:flex" data-slot="addasset"><button type="button" class="pl-asset__add" data-pick="addasset"><span>+</span>+ Add asset</button>'+(PL.pick==='addasset'?plPickHTML('addasset'):'')+'</div>';
  } else {
    PL.slots.filter(sl=>sl.acc==='ship').forEach((sl,i)=>{
      cards+=plAssetCard({kicker:sl.opt?'Scrambled':'Starfighter '+(i+1),sKey:sl.key,pKey:'rp'+sl.key.slice(2),primary:i===0});
    });
  }
  return '<div><div class="pl-h">'+IC('ship')+'Assets</div><div class="pl-assets">'+cards+'</div></div>';
}
/* fire support comes with the assets; an unpiloted asset's ability waits greyed out */
function plSupportChips(){
  const chips=[];
  const chip=(ico2,name,from,o)=>chips.push('<span class="pl-ab'+(o&&o.off?' is-off':'')+'" style="--c:'+((o&&o.c)||'var(--sr-gold)')+'"><span>'+IC(ico2)+'</span>'+name+
    '<small>'+esc(from)+'</small>'+(o&&o.cost?'<small class="pl-ab__cost">'+IC('supplies')+DROP_COST+'</small>':'')+'</span>');
  const tv=plTransport(),tvP=!!PL.v.tp0;
  if(tv){
    if(canSupplyDrop(tv)){
      const can=G.supplies>=DROP_COST;
      chip('supplies','Supply Drop','from '+tv.name+(!tvP?' · needs a pilot':can?'':' · Not enough supplies'),{off:!tvP||!can,cost:can,c:'var(--sr-res-supplies)'});
    }
    if(hasDoorGun(tv))chip('gun','Door Gunner Cover','from '+tv.name+(tvP?'':' · needs a pilot'),{off:!tvP});
  }
  PL.assets.forEach((a,i)=>{
    const f=G.fighters.find(x=>x.id===PL.v['as'+i+'s']);if(!f)return;
    const hasP=!!PL.v['as'+i+'p'],mode=plAssetMode(i);
    if(mode==='strafe')chip('firesupport','Strafing Run','from '+f.name+(hasP?'':' · needs a pilot'),{off:!hasP,c:'var(--sr-hazard)'});
    else if(mode==='doorgun')chip('gun','Door Gunner Cover','from '+f.name+(hasP?'':' · needs a pilot'),{off:!hasP});
  });
  for(const sl of PL.slots.filter(x=>x.acc==='gveh')){
    const v=PL.v[sl.key]&&G.vehicles.find(x=>x.id===PL.v[sl.key]);
    if(v)chip('vehicle','Deploy','from '+v.name,{c:'var(--sr-gold)'});
  }
  return '<div><div class="pl-h">'+IC('firesupport')+'Fire support</div>'+
    (chips.length?'<div class="pl-abil">'+chips.join('')+'</div>':'<p class="sr-fine" style="margin:0">Assign the transport: what the assets can do from the air shows here.</p>')+'</div>';
}
/* Mission Control as its own card; a free Controller steadies the squad */
function plBaseHTML(){
  const ground=!!PL.req.transport,ctl=pickControl(ground?'ground':'space');
  const line='A free Controller in the Command Center backs this mission: the squad starts steadier, <em>+'+RU.mission_support_cool+' Cool</em>.';
  let card;
  if(!ctl)card='<div class="pl-base"><span class="pl-base__disc">'+IC('people')+'</span><div style="min-width:0"><b>Mission Control <small>Unstaffed</small></b><p>'+line+'</p></div>'+
    rbtn('type="button" data-gocommand','Command Center',false,'sr-btn--ghost sr-btn--sm')+'</div>';
  else card='<div class="pl-base is-staffed"><span class="pl-base__disc pl-base__disc--face">'+faceHTML(ctl)+'</span><div style="min-width:0">'+
    '<b>'+esc(ctl.name)+' <small>Mission Control</small></b><p>The squad starts steadier, <em>+'+RU.mission_support_cool+' Cool</em>'+(nicheOf(ctl)==='tactician'?', with their Tactician’s calls':'')+'.</p></div></div>';
  return '<div><div class="pl-h">'+IC('base')+'Base support</div>'+card+plSupportJobsHTML(ground)+'</div>';
}
/* the Support crew's mission jobs and the Flight Controller's plot ride under the Mission Control card */
function plSupportJobsHTML(ground){
  let h='';
  if(ground){
    PL.sj=PL.sj||{};
    for(const k of MJOBS){
      const rs=mjobRunners(k);
      if(!rs.length)continue;
      const u=SP.UK[k];
      h+='<div class="bs-chips" title="'+esc(u.d)+'"><span class="sr-fine" style="margin-right:6px">'+esc(u.n)+'</span>'+rs.map(p=>{
        const taken=Object.keys(PL.sj).some(x=>x!==k&&PL.sj[x]===p.id);
        return rbtn('data-pljob="'+k+'|'+p.id+'" aria-pressed="'+(PL.sj[k]===p.id)+'"',esc(p.name.split(' ')[0]),taken,'sr-btn--sm');
      }).join('')+'</div>';
    }
  } else {
    const fcl=pickControl('space');
    if(fcl&&PL.m.lead&&SP.canRun(fcl,SP.UK['flightctl.interceptplot'],leadOf('flightctl'))){
      PL.plot=PL.plot||'centre';
      h+='<div class="bs-chips" title="'+esc(SP.UK['flightctl.interceptplot'].d)+'"><span class="sr-fine" style="margin-right:6px">Intercept Plot</span>'+
        [['left','Flank left'],['centre','Head on'],['right','Flank right'],['close','Close in']].map(([k,n])=>rbtn('data-plot="'+k+'" aria-pressed="'+(PL.plot===k)+'"',n,false,'sr-btn--sm')).join('')+'</div>';
    }
    const n=runnersOf('aerogineer.preflight').filter(jobFree).length*2;
    if(n)h+='<p class="sr-fine" style="margin:0">Pre-flight Checks: up to '+n+' ship'+(n>1?'s':'')+' start with +'+RU.preflight_shield+' front shield.</p>';
  }
  return h;
}
/* what the footer's blocker calls a slot */
function plSlotName(sl){
  if(sl.acc==='soldier')return sl.label;
  if(sl.acc==='vehicle')return 'Transport';
  if(sl.acc==='pilot'&&/^tp/.test(sl.key)){const tv=plTransport();return tv?tv.name+'’s pilot':'Transport pilot';}
  if(sl.acc==='apilot'){const f=G.fighters.find(x=>x.id===PL.v['as'+sl.key[2]+'s']);return f?f.name+'’s pilot':'Support pilot';}
  if(sl.acc==='pilot'&&/^rp/.test(sl.key)){const f=G.fighters.find(x=>x.id===PL.v['rs'+sl.key.slice(2)]);return f?f.name+'’s pilot':sl.label;}
  if(sl.acc==='assetship')return 'Support ship';
  return sl.label;
}
function planHTML(m){
  const r=PL.req;
  const act=plActiveSlots();
  const missing=act.filter(sl=>!PL.v[sl.key]&&!sl.opt);
  const fuel=plFuel(),ok=plComplete()&&canAttempt(m)&&G.fuel>=fuel;
  const needHangar=r.transport&&!grafReady()&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring;
  const going=act.filter(sl=>PL.v[sl.key]&&(sl.acc==='soldier'||sl.acc==='pilot'||sl.acc==='apilot')).length;
  let blocker;
  if(missing.length)blocker='<span class="pl-ready" style="--c:var(--sr-hazard)">'+IC('lock')+missing.length+' slot'+(missing.length>1?'s':'')+' empty: '+
    missing.map(sl=>'<u data-goto="'+sl.key+'">'+esc(plSlotName(sl))+'</u>').join(', ')+'</span>';
  else if(!plSpecOk())blocker='<span class="pl-ready" style="--c:var(--sr-hazard)">'+IC('lock')+'The team needs a '+esc(r.spec.label)+'</span>';
  else if(!canAttempt(m))blocker='<span class="pl-ready" style="--c:var(--sr-hazard)">'+IC('lock')+esc((precondList(m).find(c=>!c.ok)||{}).why||'Blocked')+'</span>';
  else if(G.fuel<fuel)blocker='<span class="pl-ready" style="--c:var(--sr-hazard)">'+IC('lock')+'Not enough fuel</span>';
  else blocker='<span class="pl-ready" style="--c:var(--sr-go)">'+IC('check')+'Squad ready</span>';
  const sum='<span class="pl-sum"><span>'+IC('fuel')+'Fuel&nbsp;<b>'+Math.round(fuel)+'</b>&nbsp;of '+Math.floor(G.fuel)+'</span><span>'+IC('people')+'<b>'+going+'</b>&nbsp;rebel'+(going===1?'':'s')+' going</span></span>';
  return wHead('Plan: '+m.name)+
    '<div class="pl-body">'+plBriefHTML(m)+(r.transport?plSquadHTML():'')+plAssetsHTML()+
    '<div class="pl-supportrow"'+(r.transport?'':' style="grid-template-columns:minmax(0,1fr)"')+'>'+(r.transport?plSupportChips():'')+plBaseHTML()+'</div></div>'+
    '<div class="pl-foot">'+blocker+sum+'<span style="margin-left:auto;display:flex;gap:10px;align-items:center">'+
    (needHangar?rbtn('data-gohangar','Go to the hangar',false,'sr-btn--attn'):'')+
    rbtn('data-autofill','Auto-fill',false,'sr-btn--ghost')+
    rbtn('id="launchBtn"','Start mission',!ok,'sr-btn--primary sr-btn--lg')+'</span></div>';
}
/* the injury penalties a rebel takes into a fight: halved in Rehab (Physio) */
function fxOf(p){
  const f=Rebel.injFx(p);
  if(!inRehab()[p.id])return f;
  return Object.assign({},f,{aim:Math.ceil(f.aim/2),cool:Math.ceil(f.cool/2),hpPct:f.hpPct/2,spd:1-(1-f.spd)/2});
}
function squadEntry(p,scatterFirst){
  return {id:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,spec:p.spec,spec2:p.spec2,art:p.auto?undefined:SA.lookOf(p),tr:Rebel.keys(p),rels:(p.traits||[]).filter(t=>t.with&&BOND_KINDS.indexOf(t.k)>=0).map(t=>[t.k,t.with]),hero:p.role==='Hero'?1:0,
    aim:p.auto?soldierAim(p):Math.max(0,soldierAim(p)+fxOf(p).aim+Rebel.wearyFx(p).aim),hp:p.auto?autoOf(p).hp:Math.round(Rebel.hpOf(p)*(1+fxOf(p).hpPct)),agi:p.auto?1:Rebel.moveMul(p)*fxOf(p).spd,nv:p.auto?1:Rebel.nerveMul(p),cool:p.auto?undefined:Math.max(15,Rebel.coolOf(p,'g')+fxOf(p).cool+Rebel.wearyFx(p).cool),nosprint:p.auto?0:fxOf(p).nosprint,oneHand:p.auto?0:fxOf(p).oneHand,cview:p.auto?0:fxOf(p).view,def:p.auto?autoOf(p).def:undefined,big:p.auto?autoOf(p).big:0,heavy:p.auto?autoOf(p).heavy:0,autoType:p.auto?autoKey(p):undefined,
    meds:p.auto?0:packsCarried(p),
    /* head and body kit give the armour bar in a fight (Items.protection); an Auto brings its own shell */
    head:p.auto?undefined:(p.gear||{}).head||undefined,body:p.auto?undefined:(p.gear||{}).body||undefined,arm:p.auto?autoOf(p).arm:undefined,
    back:p.auto?undefined:(p.gear||{}).back||undefined,
    wpns:p.auto?[autoOf(p).wpn]:wpnsFromGear(p)};
}
function startPlan(){
  const m=PL.m;
  if(!plComplete()||!canAttempt(m)||G.fuel<plFuel())return;
  sClick();
  if(!m.lead){launchMission(m);return;}
  const fuel=plFuel();
  if(PL.req.transport){
    const squad=PL.slots.filter(sl=>sl.acc==='soldier').slice(0,plSquadMax()).map(sl=>G.people.find(p=>p.id===PL.v[sl.key])).filter(Boolean);
    const grafPilot=G.people.find(p=>p.id===PL.v.tp0);
    const tv=G.fighters.find(f=>f.id===PL.v.tv0);
    const prizeId=PL.v.pz0,prize=prizeId&&G.people.find(p=>p.id===prizeId);
    outfitSquad(squad.concat(prize?[prize]:[]));
    squadTension(squad);
    const fx=supportStart(m,'ground',plJobPicks());
    G.nadesOut=nadesCarried(squad);
    G.fuel-=fuel;
    if(plDropOn())G.supplies-=DROP_COST;
    SR.mission={kind:'ground',missionId:m.id,scenario:m.scenario,days:missionDays(m),nades:nadesCarried(squad),
      charges:(PL.req.items||[]).some(i=>i.ids)?Math.min(1,((G.armory.find(a=>a.id==='charge')||{}).n)||0):((PL.req.items||[]).find(i=>i.id==='charge')||{}).n||0,
      limpets:(PL.req.items||[]).some(i=>i.ids)?Math.min(1,((G.armory.find(a=>a.id==='limpet')||{}).n)||0):0,
      vip:m.vip||(m.npc?{name:m.npc.name,first:m.npc.first}:undefined),
      sec:m.ctx?m.ctx.sec:undefined,
      ctx:m.ctx?{title:m.name,place:m.ctx.place,target:m.ctx.target,variant:m.region,
        sub:m.ctx.place+' \u00b7 '+m.ctx.locName,
        eyebrow:'Ground Operation \u00b7 '+m.ctx.place+', '+m.ctx.locName,flavour:m.desc}:undefined,
      squad:squad.map(p=>{const e=squadEntry(p,false);if(Rebel.expHas(p,'mspec',m.tid||m.id))e.ms=1;
        const pk=peakOf(p);e.cool=Math.min(95,e.cool+fx.cool+(pk?pk.cool:0));if(pk)e.agi*=pk.agi;   // Mission Support, Rallying Cry, Peak Condition
        if(walkItOff(p))e.agi*=0.9;
        return e;}),
      sup:fx,
      assets:{drop:plDropOn(),ships:PL.assets.map((a,k)=>{
        const f=G.fighters.find(x=>x.id===PL.v['as'+k+'s']),pl=G.people.find(x=>x.id===PL.v['as'+k+'p']);
        const mode=plAssetMode(k);
        return f&&pl&&mode?{cls:f.cls,name:f.name,mode,pilot:{name:pl.name,first:pl.name.split(' ')[0]},soldiers:[]}:null;
      }).filter(Boolean),vehicles:PL.slots.filter(sl=>sl.acc==='gveh'&&PL.v[sl.key]).map(sl=>{
        const v=G.vehicles.find(x=>x.id===PL.v[sl.key]),d=gvehOf(v);
        return {id:v.id,name:v.name,first:v.name.split(' ')[0],type:v.type,kind:d.kind,hp:Math.max(1,Math.round((d.hp||100)*v.hp/100)),maxhp:d.hp||100,hpPct:v.hp,def:d.def,arm:d.arm,aim:d.aim,wpn:d.wpn,big:d.big};
      })},
      pilot:prize?{id:prize.id,name:prize.name,first:prize.name.split(' ')[0],level:prize.level,wpns:wpnsFromGear(prize),art:SA.lookOf(prize)}:undefined,
      grafPilot:{id:grafPilot.id,name:grafPilot.name,first:grafPilot.name.split(' ')[0]},
      transport:tv?{id:tv.id,name:tv.name,cls:tv.cls,doorgun:plGunOn()?1:0}:undefined};
  } else {
    const flight=[];
    const sfx=supportStart(m,'space',[]);
    let prepared=runnersOf('aerogineer.preflight').filter(jobFree).length*2;   // Pre-flight Checks: two ships each
    for(const sl of PL.slots.filter(x=>x.acc==='pilot')){
      const p=G.people.find(x=>x.id===PL.v[sl.key]),f=G.fighters.find(x=>x.id===PL.v['rs'+sl.key.slice(2)]);
      if(!p||!f)continue;   // an optional (scrambled) slot left empty
      flight.push({pilotId:p.id,name:p.name,first:p.name.split(' ')[0],level:p.level,art:SA.lookOf(p),
        rankName:rankFor(p),hero:p.role==='Hero'?1:0,skills:pilotSkills(p),aimMod:pilotAimMod(p),init:pilotInit(p),
        cool:Math.max(15,Rebel.coolOf(p,'s')+Rebel.injFx(p).cool),cun:Rebel.cunMul(p),nv:Rebel.nerveMul(p),
        tr:Rebel.traitsFor(p,'s'),charTrait:p.charTrait,
        cls:f.cls,fighterId:f.id,fighterName:f.name,hull:f.hull,loadout:f.loadout,
        tune:f.tune,frame:f.frame||0,shield:(prepared-->0)?RU.preflight_shield:0,tight:sfx.tight?1:0});
    }
    G.fuel-=fuel;
    SR.mission={kind:'space',missionId:m.id,days:missionDays(m),flight,sup:sfx};
  }
  // the scene is not saved: if the page reloads mid-mission, restoreCampaign hands this back
  G.sortie={name:m.name,f:fuel,s:(PL.req.transport&&plDropOn())?DROP_COST:0};
  closeWin();closeTilePop();
  saveSnap();
  // into a ground mission through an iris on the target; out to a space fight through hyperspace
  const cvr=cv.getBoundingClientRect();
  SR.transition(PL.req.transport?'iris':'hyperspace',{x:cvr.left+cvr.width/2,y:cvr.top+cvr.height/2},()=>SR.go(PL.req.transport?'ground':'space',{mission:SR.mission}));
}
function soldierAim(p){return Math.min(6,Rebel.aimOf(p,'g')+(hasSpec(p,'vanguard')?1:0));}
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
  // the Supply Drop is paid at launch; if it was never called in, the crates come home (SCREENS-HANDOFF-2 §4)
  if(G.sortie&&G.sortie.s&&r.kind==='ground'&&!r.dropUsed){
    G.supplies+=G.sortie.s;
    news('The supply drop was never called in — '+S(G.sortie.s)+' back in stores.','r');
  }
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
    const xg=(pr.xp||0)*(mt&&teamIds.includes(mt.with)?1.3:1)*(p.taught&&on('instructor.lessons')?1.25:1);   // Battle Lessons
    const pi=xpInfo(p,xg);Rebel.trainSkills(p,pr.sk);
    p.kills=(p.kills||0)+(pr.kills||0);
    let state=pr.state;
    if(state==='shotdown')state=(rng()<0.15)?'lost':'injured';
    pi.xp=xg*Rebel.xpMult(p);pi.state=state;   // what gainXp actually added
    pinfo.push(pi);
    if(r.win&&state!=='lost')creditMission(p);
    let critical=false;
    if(state==='lost'&&headOf('infirmary')&&rng()<headScale('infirmary',RU.stabilise_min,RU.stabilise_max)){   // Stabilise
      state='injured';critical=true;nearIds.push(p.id);pi.state=state;
      news('<b>'+p.name+'</b> should not have made it. <b>'+headOf('infirmary').name+'</b> kept them breathing: Critical Condition.','g');
    }
    const noNewInj=!r.win&&m&&m.supFx&&m.supFx.extraction;   // Extraction Plan
    if(state!=='lost'&&!noNewInj&&pr.inj&&pr.inj.length)for(const m of applyInjuries(p,pr.inj,state==='injured'))news('<b>'+p.name+'</b> '+m,'h');
    const fr=(r.fighters||[]).find(x=>x.fighterId===p.ship);
    const turned=r.kind==='space'&&m&&m.supFx&&m.supFx.turnaround&&fr&&!fr.destroyed&&fr.hull>=100;   // Rapid Turnaround
    if(state!=='lost'&&!turned)tireNews(p);
    if(state==='lost'){
      G.people=G.people.filter(x=>x.id!==p.id);lostP.push(p);
      const martyr=on('propagandist.martyrs')&&m&&m.loc;   // Martyrs: their name rallies the world where they fell
      moraleAll(martyr?-3:-6,'death',(r.people||[]).map(x=>x.id),martyr?-5:-10);
      if(martyr)addSupport(m.loc,0.5);
      news('<b>'+p.name+'</b> did not come home. Their name goes on the wall.'+(martyr?' In '+pdef(m.loc).name+' it goes on the walls too.':''),'h');
    } else if(state==='injured'){
      if(critical)Rebel.layUp(p,'critical',RU.critical_days);
      else Rebel.layUp(p,'downed',pr.dur||3);   // the recovery rate decides how long (slower with no Infirmary, faster with a Doctor)
      p.injuries=(p.injuries||0)+1;
      Rebel.moraleBump(p,-5,'injury');
      for(const q of crewOf())if(q!==p&&!(q.merc&&!(r.people||[]).some(x=>x.id===q.id)))Rebel.moraleBump(q,(r.people||[]).some(x=>x.id===q.id)?-2:-0.5,'injury');
      mood();
      news('<b>'+p.name+'</b> came back on a stretcher \u2014 out '+outDays(p)+' day'+(outDays(p)>1?'s':'')+'.','h');
    }
  }
  const got=newGot();
  if(r.loot){
    if(r.loot.c){G.credits+=r.loot.c;gotRes(got,'c',r.loot.c,'found');}
    if(r.loot.s){G.supplies+=r.loot.s;gotRes(got,'s',r.loot.s,'found');}
    for(const it of r.loot.items||[]){grantItem(it,1,'looted');gotLoot(got,{id:it});}
  }
  if(r.win&&r.kind==='ground'&&(r.people||[]).some(pr=>pr.state!=='lost'&&Rebel.has(G.people.find(x=>x.id===pr.id),'smuggler'))&&rng()<0.25){
    const it=rng()<0.5?'cowboy':'shells';
    grantItem(it,1,'looted');gotLoot(got,{id:it});
    news('A former smuggler\u2019s instincts paid off: an extra <b>'+Items.name(it)+'</b> in the haul.','g');
  }
  if(r.kind==='ground'&&r.nades!==undefined){
    const a=G.armory.find(x=>x.id==='blam');
    const given=G.nadesOut===undefined?(a?a.n:0):G.nadesOut;G.nadesOut=undefined;
    const had=a?a.n:0,want=Math.max(0,had-given+r.nades);   // unused frags (the drop's and the crates') join the stores
    if(want>had)Items.grant(G.armory,'blam',want-had,'looted');else if(want<had)Items.take(G.armory,'blam',had-want);
    if(r.nades>0&&!a)gotLoot(got,{id:'blam',n:r.nades});
    r.nadesUsed=Math.max(0,given-r.nades);
  }
  if(r.win&&r.cross){
    if(berthFree('cross')){
      G.fighters.push(newFighter({id:'dustfall',name:'Dustfall',cls:'cross',hull:85}));
      const flew=(r.people||[]).map(pr=>pr.id);
      const orphan=G.people.find(p=>p.role==='Pilot'&&flew.includes(p.id)&&!G.fighters.some(f=>f.id===p.ship))
        ||G.people.find(p=>p.role==='Pilot'&&!G.fighters.some(f=>f.id===p.ship));
      if(orphan)orphan.ship='dustfall';
      gotLoot(got,{type:'cross',name:'FT-4 Cross',kind:'ship'});
    } else {G.credits+=800;gotRes(got,'c',800,'fenced');}
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
  if(r.win&&m)applyRew(salvaged(m.rew),got);
  if(r.salvage&&on('aerogineer.scavenger')){G.materials+=r.salvage;gotRes(got,'m',r.salvage,'salvaged');}   // Scavenger's Eye
  maintenance(r,got);
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
    gotLoot(got,{type:'strider',name:m.vip.name,kind:'bot'});
    news('<b>'+m.vip.name+'</b>, a reprogrammed Strider Mk I, joins the rebellion as a Bot. Bring it to a ground mission as fire support.','g');
  }
  for(const g of r.gained||[]){
    if(GVEH[g.type]&&GVEH[g.type].kind==='bot'){
      if((G.vehicles||[]).some(v=>v.name===g.name))continue;
      const v=addVehicle(g.type,g.name);
      gotLoot(got,{type:g.type,name:v.name,kind:'bot'});
      news('<b>'+v.name+'</b>, a hacked '+GVEH[g.type].label+', joins the rebellion as a Bot.','g');
      continue;
    }
    const A=AUTOS[g.type];if(!A)continue;
    if(G.people.some(p=>p.name===g.name))continue;
    G.people.push({id:'auto'+(G.people.length+1)+'_'+g.type,name:g.name,role:'Soldier',level:1,xp:0,assign:'rest',auto:g.type,bio:A.bio});
    gotLoot(got,{type:g.type,name:g.name,kind:'unit'});
    news('<b>'+g.name+'</b>, a hacked '+A.label+', joins the rebellion. It does not need a bunk.','g');
  }
  if(r.win&&m&&m.bonus&&r.quiet)applyRew(m.bonus,got,'bonus');
  if(m){
    supportDone(m,r);
    if(r.win){
      m.state='done';m.meta='SUCCESS';
      if(m.loc){G.wins=G.wins||{};G.wins[m.loc]=G.day;}   // for Hero Stories
      const cr=missionCredit(m);
      queueReport(buildReport(m,true,got,pinfo,cr,true));
      if(m.npc)RQ.push({t:'recruit',m});
      moraleAll(1,'win',(r.people||[]).map(x=>x.id),3);
      const gt=gotText(got);
      news('<b>'+m.name+'</b> \u2014 SUCCESS, and you were there. '+(gt?gt+'.':''),'g');
      sBuild();
      missionAftermath(m.id);
    } else {
      m.state='avail';m.progress=null;
      moraleAll(-3,'loss',(r.people||[]).map(x=>x.id),-8);
      const rpt=buildReport(m,false,got,pinfo,null,true);rpt.objs=r.objs;
      queueReport(rpt);
      news('<b>'+m.name+'</b> \u2014 the field op failed. The board keeps the job open.','h');
      sWarn();
    }
  }
  heroCheck(r,m,runExperiences(r,m,{lostP,nearIds}));
  autoEquip();
  saveSnap();syncUI();
  nextReport();
}
ROOT.addEventListener('click',ev=>{
  const flp=ev.target.closest('[data-flip]');
  if(flp&&!flp.disabled){
    const [id,h]=flp.dataset.flip.split(':'),sec=G.rooms.find(r=>r.id===id);
    if(sec&&flipHalf(sec,+h)){sClick();saveSnap();syncUI();if(viewRoom)renderRoomBar();}
    return;
  }
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
  /* 3 -> 4: a mission of a type no longer carries its own copy of the type's words (m.tpl); bindNpc reads the type
     (game/js/mission-text.js), so text edits reach missions already on the board (DESIGN_BLOCKERS C-26) */
  function(){
    for(const m of G.missions)delete m.tpl;
  },
  /* 4 -> 5: the Support specialties replace the staff posts (DESIGN_BLOCKERS C-28). Every Support rebel has a base
     specialty (Rebel.migrate reads it from their origin line; one who held a post keeps that room's specialty), and
     works in its home room if they were on that post; the Barracks and Hangar posts are gone. A prosthetic fitting
     under way becomes a Job of its own (it heals with the Job now), and prosthetics already fitted carry no penalty. */
  function(){
    const POST_SPEC={infirmary:'doctor',comms:'intel',workshop:'mechanic',store:'logistics',training:'academic',diplo:'diplomat',command:'control'};
    G.leads=G.leads||{};G.sjobs=G.sjobs||[];G.cd=G.cd||{};
    for(const p of G.people){
      const post=p.assign&&p.assign.startsWith('station:')?p.assign.slice(8):null;
      if(p.role==='Support'&&!p.auto){
        if(post&&POST_SPEC[post])p.sspec=POST_SPEC[post];   // the post they held says what they do
        Rebel.migrate(p);
        p.niche=p.niche||null;p.forks=p.forks||{};
      }
      if(post)p.assign=(p.role==='Support'&&POST_SPEC[post]&&SP.SPEC[p.sspec].room===post)?'room:'+post:'rest';
      for(const c of p.cond||[])if(c.k==='surgery'){
        G.sjSeq=(G.sjSeq||0)+1;
        G.sjobs.push({id:'sj'+G.sjSeq,k:'cyberneticist.prosthetics',pid:null,tid:p.id+':'+(c.part||'arm'),opt:'fitted',days:Math.max(1,Math.ceil(c.days)),label:p.name});
      }
      if(p.body)for(const part of ['arm','leg','eye'])if(p.body[part]===2){p.pros=p.pros||{};if(!p.pros[part])p.pros[part]='fitted';}
    }
    for(const t of G.dip||[])if(!t.pid){const d=G.people.find(q=>q.name===t.by);t.pid=d?d.id:null;}
  },
  /* 5 -> 6: the bigger base and the 4 × 4 Hangar (DESIGN_BLOCKERS C-32). The map grows to 14 × 18 with the new ground
     (havenGround; the old bedrock is the only ground it replaces, and that never changes). The old cave hangar closes:
     its tiles become open floor, a tile still being built is refunded, and its ships, upgrades and queued upgrades move
     to the new Hangar's first section (a large pad and two small), with more sections if the fleet needs them. */
  function(){
    const tpl=havenGround(),old=G.grid,oR=G.rows,oC=G.cols;
    const oldH=G.rooms.filter(r=>r.key==='hangar'),ups=[...new Set(oldH.flatMap(r=>r.up||[]))];
    for(const rm of oldH){
      if(rm.build){G.credits+=240;G.materials+=200;}
      for(let r=rm.r;r<rm.r+rm.h;r++)for(let c=rm.c;c<rm.c+rm.w;c++)if(old[r]&&old[r][c])old[r][c]={t:'floor'};
    }
    G.rooms=G.rooms.filter(r=>r.key!=='hangar');
    G.grid=tpl.map((row,r)=>row.map((t,c)=>r<oR&&c<oC&&old[r][c].t!=='rock'?old[r][c]:{t}));
    G.rows=BASE_ROWS;G.cols=BASE_COLS;
    const ids=oldH.map(r=>r.id);
    HANGAR_SITES.forEach(([r,c],i)=>{
      if(i&&fleetFits(fleetClasses()))return;
      const sec=hangarSection(r,c,i?['S','S']:['L','S']);sec.up=ups.slice();
      for(let y=r;y<r+HANGAR_N;y++)for(let x=c;x<c+HANGAR_N;x++)G.grid[y][x]={t:'room',room:'hangar'};
      G.rooms.push(sec);
    });
    for(const u of G.upq||[])if(u.key==='hangar'&&u.ids.some(id=>ids.includes(id)))u.ids=[G.rooms.find(r=>r.key==='hangar').id];
    if(oldH.length)G.news.push({day:G.day,html:'The ships move out of the old cave into the east cavern: a proper Hangar at last, with a large pad for the hauler.',cls:'g'});
  },
  /* 6 -> 7: the Missions tab (docs/ui/SCREENS-HANDOFF.md §4): a mission flags itself New until it has been looked at
     (m.seen). Jobs already on an older save's board have been seen in the old popup. */
  function(){
    for(const m of G.missions||[])m.seen=1;
  },
  /* 7 -> 8: standby contacts (docs/ui/SCREENS-HANDOFF-2.md §2). G.standby lists candidates waiting on the Galaxy
     map as potential contacts; the silent candWait queue becomes it. */
  function(){
    G.standby=(G.candWait||[]).filter((id,i,a)=>a.indexOf(id)===i&&CANDS[id]&&!G.sources.some(s=>s.id===id));
    delete G.candWait;
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
  setDrawer(false);
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
  closeMenu();setDrawer(false);closeMissions();
  closeWin();closeTilePop();
  saveSnap();
}
SR.register('base',{enter,exit,frame:render});


if(location.hash==='#test'){
  window.DBGbase={get G(){return G;},set G(v){G=v;},get started(){return started;},
    fn:{castRebel,enterRoomView,pilotAimMod,ctxNames,restTag,tireNews,packTick,packsCarried,usePacks,pilotAim,buildCostAt,UPGRADES_:()=>UPGRADES,REV_W_:()=>REV_W,startRestore,digAt,buildAt,srcContact,srcVisit,acceptCandidate,startSpec,openWin,getWin:()=>winMode,standbyCandidate,declineCandidate,gxHitL_:()=>gxHitL,gainXp,sGood,sWarn,sAlert,dossierHead,squadEntry,soldierAim,pilotAim,moraleAll,mood,moraleTick,crewOf,applyInjuries,medicalSection,healRate,recordCard,meterBlock,rankRow,insignia,getRankOverlay:()=>rankOverlay,getGearOverlay:()=>gearOverlay,setRng:f=>{rng=f;},heroCheck,heroCard,isGround,isFlyer,runExperiences,squadTension,nameOfRebel,expCards,autoEquip,outfitSquad,gearSection,carried,freeOf,slotGet,slotSet,gearSlots,wpnsFromGear,nadesCarried,reconcileGear,startRecruit,recruitTick,canRecruit,recruitCard,rankFor,creditMission,rankCard,roomsAdj,PLANETDEF_:()=>PLANETDEF,BUILDS_:()=>BUILDS,srcAnswer,CHAINS_:()=>CHAINS,chainTick,chainPrompt,chainAct,chainState,startPatrol,patrolTick,upBlocked,gearLayout,startUpgrade,startDip,canDip,clusterOf,bunkCap,fighterCap,supCap,sourceCap,tilesOf,openTilePop,roomAt,fuelOf,addMission,spawnMission,pushMission,makeOffer,openPlan,plPlace,plComplete,plFuel,startPlan,applyDebrief,advanceDay,scoutPlanet,syncUI,saveSnap,
      ablePilots,openWin,closeWin,launchIntro,precondList,canAttempt,
      newFighter,defaultLoadout,shipStats,hasDoorGun,fuelPer,pilotInit,pilotSkills,plAddAsset,plRemoveAsset,plAssetMode,plSquadMax,plActiveSlots,plDropOn,plTransport,plComplete,SEATS_:()=>SEATS,
      restoreCampaign,restartCampaign,upgradeSave,saveVersion,MIGRATIONS_:()=>MIGRATIONS,padCounts,fleetFits,berthFree,padsFree,flipBlocked,flipHalf,hangarBlockAt,hangarPads,padOccupants,havenGround,isLargeShip,shipFit,zoomCam,baseCam_:()=>baseCam,isoParams,saveSnap,newGame,addVehicle,vehPool,GVEH_:()=>GVEH,soldierPool,crewIn,headOf,leadOf,on,runnersOf,treatedBy,inRehab,startNiche,chooseFork,setLead,startJob,stopJob,jobsFor,JOBS_:()=>JOBS,supportStart,supportTick,specTick,trainees,supervised,roomCap,postedTo,repairCrew,coveredSources,tutored,salvaged,gearCapacity,outDays,
      openArsenal,closeArsenal,renderArsenal,sellItem,sellWhy,sellPrice,applyGearPick,kitNameId,marketable,KIT_:()=>KIT,
      getArOpen:()=>arOpen,getArCat:()=>arCat,getArSel:()=>arSel,setArSel:(t,id)=>{arSel={t,id};arLast[arCat]=arSel;renderArsenal();},setArCat:c=>{arCat=c;arSel=arLast[c]||null;renderArsenal();},
      openMarket,closeMarket,renderMarket,ensureMarket,rollMarket,buyLot,lotPrice,marketWeek,nyxAccess,stLine,isOwnSlot,mercBunkFree,freeBunks,
      padFree,inboundShips,shipSerial,arFit,SHIP_PRICE_:()=>SHIP_PRICE,SHIPWPN_PRICE_:()=>SHIPWPN_PRICE,
      getBmOpen:()=>bmOpen,getBmSel:()=>bmSel,setBmSel:i=>{bmSel=i;bmLine=null;renderMarket();},
      raiseAccess,addSupport,revGain,missionCredit,syncLocalOps,pst,pdef,locCap,renderWin,getPL:()=>PL,canAttempt,precondList,
      enterRoom:key=>{const rm=G.rooms.find(r=>r.key===key&&!r.build);if(rm)enterRoomView(rm);return !!rm;},exitRoomView}};
}
})();
