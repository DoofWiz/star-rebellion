'use strict';
(function(){
const ROOT=document.getElementById('sc-ground');
const UT=SR.util,byId=UT.scoped(ROOT);            // shared helpers (core.js); ids are looked up inside this scene
const A=SR.audio,osc=A.osc,nz=A.nz;
const HUD=SR.hud,T=SR.theme,C=T.C,FONT=T.FONT;   // shared HUD builders, canvas theme helpers, palette


/* =====================================================================
   STAR REBELLION — Ground Combat I: "Steal the Cross"
   WeGo real-time tactics, no grid. Plan free-aim orders for the whole
   squad, execute simultaneously, resolve fire on the shared d20 VS
   panel. Cover, line of sight, overwatch, a calm/alerted town, loot
   picked up by hand, and Akli rifles that jam on a natural 1.
   ===================================================================== */

/* ---------- constants ---------- */
let W=2400,H=1600;
/* movement scaled up 20% for the Bobbleheads art (bigger figures made the old ranges read short) */
const MOVE_R=180,SPRINT_R=360,EXEC_MS=2600,LOOT_AOE=95,AUTO_LOOT=50,RT_SPEED=160,SNEAK_SPEED=86;
/* Character Traits (see rebel.js): units carry their trait keys in u.tr */
const hasT=(u,k)=>!!u&&!!u.tr&&u.tr.indexOf(k)>=0;
const speedMul=u=>(hasT(u,'restless')?1.2:1)*(hasT(u,'cautious')?0.9:1)*(u.agi||1)*(injOf(u,'brokenleg')?0.5:1)*(injOf(u,'burns')?0.7:1);
const viewMul=u=>(hasT(u,'hunter')?1.2:1)*(1+(u.cview||0))*(injOf(u,'eardrum')?0.75:1);
/* relationships: u.rels is [[kind, otherId]] from the rebel's earned traits */
const BONDS=['friends','oldfriends','battlebros','love'];
const relUp=(u,kinds)=>!!u&&!!u.rels&&u.rels.some(r=>kinds.indexOf(r[0])>=0&&U.some(x=>(x.pid||x.id)===r[1]&&x.side==='reb'&&!x.down&&!x.extracted&&!x.away));
/* what a rebel did this mission, in raw points per skill; base.js turns it into experience */
function sk(u,k,n){if(u&&u.side==='reb'&&!u.auto&&!u.ally){u.sk=u.sk||{};u.sk[k]=(u.sk[k]||0)+n;}}
const NADE_R=300,NADE_BLAST=110;
const HOT_ROUNDS=2;
const SHIELD_ARC=1.15;               // half-angle of the turret's frontal shield
const OFFMAP={x:-99999,y:-99999,r:1};
let PAD=OFFMAP,LZ={x:300,y:1330,r:130},TOWER=OFFMAP,TURRET={x:-99999,y:-99999,r:26};
let BLDGS=[],PROPS=[],LOOTS=[],WORKDEF=[],SCN=null;
let seed=(Date.now()^0x9e3779b9)>>>0;
function rng(){seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
const rint=(lo,hi)=>UT.rint(lo,hi,rng),dist=UT.dist;   // rolls use the scene's own seeded rng
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function lerp(a,b,t){return a+(b-a)*t;}
function ease(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

const WPN=Items.wpn();   // every weapon with combat stats, from the items table (game/data/db.json)
const PROPDEF={
  barrel:  {r:15,cov:8,hp:55, lab:'FUEL DRUMS'},
  crate:   {r:19,cov:8,hp:45, lab:'CARGO CRATES'},
  trough:  {r:26,cov:8,hp:70, lab:'CHARGE STATION'},
  wagon:   {r:42,cov:10,hp:150,lab:'TRUCK'},
  canister:{r:12,cov:0,hp:1,  lab:'FUEL CANISTER'},
  rock:    {r:26,cov:9,       lab:'BOULDER'},   // no hp: stone does not shred
};

/* ---------- scenarios ---------- */
/* every enemy spawn names its type in the enemy roster (game/js/enemies.js); the object is its placement and any one-off overrides */
const foe=(type,o)=>Enemies.spawn(type,o);
const SCENARIOS={
stealcross:{
  mode:'stealcross',W:2400,H:1600,style:'town',fog:true,
  hasPad:true,hasTower:true,hasTurret:true,tumbleweed:true,
  title:'Steal the Cross',sub:'Dustfall \u00b7 Brakka \u2014 Revolution I',
  foesLabel:'Sheriff\u2019s Men',calmLabel:'Town is calm',alertLabel:'Town alerted',
  banner:['Steal the Cross','Sheriff\u2019s law is Hegemony law'],
  brief:{
    eyebrow:'Ground Operation \u00b7 Dustfall, Brakka',
    flavour:'Dustfall keeps one <b>FT-4 Cross</b> patrol fighter on the pad behind the sheriff\u2019s HQ. Sheriff Reeve enforces Hegemony law here. We enforce ours.',
    objectives:[
      'Get Sera Kest to the Cross on the pad north-east of town',
      'Cover her while she hotwires it \u2014 two rounds at the panel',
      'Release the docking clamps and pull the fuel line',
      'Get the squad back to the Graf and lift off',
      {sub:1,text:'Sera carries only a sidearm \u2014 keep her clear of the shooting.'},
    ],
    hint:'While the town is calm, stay out of the lawmen\u2019s sight cones \u2014 Sneak keeps you low. The pad turret is armoured from the front; take it from the side. Stray shots set off the red fuel canisters.',
  },
  csLine:'Dustfall, as promised. I\u2019ll keep the engine warm.',
  lzLabel:'GRAF LZ',
  LZ:{x:300,y:1330,r:130},PAD:{x:2130,y:330,r:95},
  TOWER:{x:1562,y:436,r:54},TURRET:{x:1965,y:585,r:26},
  panTo:{x:1870,y:190},
  guardPt:{x:2130,y:370},
  hasGraf:true,
  bossTrigger:{x:2130,y:330,r:420},
  bossDoor:{x:1880,y:588},
  bossFloat:'THE SHERIFF',
  bossLog:'<span class="h">Sheriff Reeve kicks his office door open</span> \u2014 scattergun first.',
  bossAlert:'The Sheriff himself is on the boards.',
  work:[
    {id:'clamp',x:2022,y:360,label:'DOCKING CLAMPS',verb:'releases the docking clamps'},
    {id:'fuel', x:2192,y:426,label:'FUEL LINE',verb:'pulls the fuel line'},
  ],
  bldgs:[
    {x:560, y:552, w:330,h:212,name:'THE DRY COMET',sign:1},
    {x:1080,y:540, w:230,h:206,name:'ASSAY & CREDIT'},
    {x:378, y:614, w:152,h:126,name:'',solar:1},
    {x:700, y:884, w:262,h:168,name:'OUTFITTER',solar:1},
    {x:400, y:930, w:168,h:112,name:''},
    {x:1180,y:900, w:278,h:162,name:'MOTOR POOL'},
    {x:1760,y:610, w:292,h:242,name:'SHERIFF HQ',mast:1},
    {x:2124,y:512, w:150,h:112,name:'',solar:1},
  ],
  props:[
    {x:646, y:800, kind:'barrel'},{x:688,y:814,kind:'barrel'},
    {x:986, y:788, kind:'wagon', a:0.18},
    {x:1042,y:856, kind:'crate'},
    {x:1246,y:792, kind:'trough'},
    {x:1424,y:706, kind:'barrel'},{x:1458,y:722,kind:'barrel'},
    {x:1508,y:986, kind:'wagon', a:-0.28},
    {x:1642,y:872, kind:'crate'},{x:1688,y:912,kind:'crate'},
    {x:1902,y:948, kind:'barrel'},{x:1936,y:962,kind:'barrel'},
    {x:2048,y:1148,kind:'crate'},
    {x:566, y:1116,kind:'wagon', a:0.5},
    {x:1120,y:1120,kind:'trough'},
    {x:1330,y:640, kind:'crate'},
    {x:1782,y:452, kind:'crate'},{x:1836,y:478,kind:'crate'},
    {x:1638,y:352, kind:'wagon', a:0.42},
    {x:2242,y:560, kind:'barrel'},
    {x:1948,y:282, kind:'crate'},{x:1902,y:372,kind:'rock'},
    {x:1990,y:315, kind:'crate'},{x:2252,y:398,kind:'crate'},
    {x:2040,y:540, kind:'canister'},{x:1880,y:500,kind:'canister'},
    {x:2226,y:452, kind:'canister'},
    {x:1560,y:1010,kind:'canister'},
  ],
  loots:[
    {id:'till',     x:736, y:786, label:'Cantina till',   take:'344 \u25c8 credits',      c:344},
    {id:'strongbox',x:1196,y:768, label:'Assay strongbox',take:'560 \u25c8 credits',     c:560},
    {id:'crateA',   x:678, y:862, label:'Outfitter crates',take:'72 \u25a4 supplies',    s:72},
    {id:'crateB',   x:984, y:1076,label:'Outfitter crates',take:'56 \u25a4 supplies',    s:56},
    {id:'locker',   x:1742,y:884, label:'HQ gun locker',  take:'Scattergun + shell box', items:['scatter','shells']},
    {id:'feed',     x:1312,y:1084,label:'Motor pool cache',take:'104 \u25c8 credits',     c:104},
    {id:'blamA',    x:1608,y:942, label:'BLAM crate',     take:'3\u00d7 BLAM frag',       nades:3},
    {id:'blamB',    x:1092,y:1112,label:'BLAM crate',     take:'3\u00d7 BLAM frag',       nades:3},
  ],
  foes(){return [
    foe('frontier-sheriff',{id:'reeve',name:'Sheriff Reeve',first:'Reeve',x:1906,y:730,office:1,
      lines:['You picked the wrong town, drifters.','Hegemony pays my wage. I earn it.','Nobody touches that ship!']}),
    foe('frontier-deputy',{id:'pell', name:'Dep. Pell', first:'Pell', x:1150,y:790,wpns:['carbine'],patrol:[{x:1150,y:790},{x:900,y:820},{x:1350,y:820}],
      lines:['Sheriff, movement by the bank!','Who fired? WHO FIRED?']}),
    foe('frontier-deputy',{id:'cobb', name:'Dep. Cobb', first:'Cobb', x:700,y:788,patrol:[{x:700,y:788},{x:560,y:830}],
      lines:['Strangers on the west road!','I ain\u2019t paid enough for this.']}),
    foe('frontier-deputy',{id:'marsh',name:'Dep. Marsh',first:'Marsh',x:520,y:860,patrol:[{x:520,y:860},{x:760,y:1100},{x:480,y:1180}],
      lines:['Something came down south of town\u2026','They\u2019re armed! Guns! GUNS!']}),
    foe('frontier-deputy',{id:'ruiz', name:'Dep. Ruiz', first:'Ruiz', x:1300,y:1100,wpns:['carbine'],guard:1,patrol:[{x:1300,y:1100},{x:1500,y:1120}],
      lines:['Motor pool clear\u2026 mostly.','Fall back to the pad!']}),
    foe('frontier-deputy',{id:'stack',name:'Dep. Stack',first:'Stack',x:2080,y:540,guard:1,patrol:[{x:2080,y:540},{x:1990,y:470},{x:2160,y:460}],
      lines:['Pad\u2019s secure, Sheriff.','They want the ship! They want the ship!']}),
    foe('frontier-deputy',{id:'wren', name:'Dep. Wren', first:'Wren', x:1562,y:436,hp:55,aim:3,def:12,wpns:['longiron'],elev:1,fixed:1,
      lines:['I can see the whole street from up here.','Say when, Sheriff.']}),
  ];},
  civs(){return [
    {id:'civ1',name:'Townsfolk',first:'townsfolk',side:'civ',x:770, y:836,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:770,y:836},{x:640,y:790},{x:920,y:840}]},
    {id:'civ2',name:'Townsfolk',first:'townsfolk',side:'civ',x:1010,y:906,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1010,y:906},{x:1120,y:1100},{x:980,y:1080}]},
    {id:'civ3',name:'Townsfolk',first:'townsfolk',side:'civ',x:1240,y:850,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1240,y:850},{x:1360,y:800},{x:1180,y:780}]},
    {id:'civ4',name:'Townsfolk',first:'townsfolk',side:'civ',x:1500,y:1090,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1500,y:1090},{x:1320,y:1120},{x:1560,y:960}]},
  ];},
},
stealfuel:{
  mode:'stealfuel',W:2200,H:1500,style:'town',fog:true,
  hasPad:false,hasTower:true,hasTurret:false,hasGraf:true,tumbleweed:true,
  title:'Steal Fuel',sub:'Redrock Flats · Brakka — Revolution I',
  foesLabel:'Tithe Guard',calmLabel:'Depot is quiet',alertLabel:'Depot alerted',
  banner:['Steal Fuel','Nothing flies without it'],
  brief:{
    eyebrow:'Ground Operation · Redrock Flats, Brakka',
    flavour:'Every herder on Brakka pays the fuel tithe, and every drop of it ends up in the <b>Redrock tithe depot</b>: tanks, a pump house and a bored guard detail. Nobody has ever tried to take it back. Walk in, call the Marta down onto the loading apron, and keep the pumps safe while she drinks.',
    objectives:[
      'Reach the fuel depot on the east side of the flats',
      'Call in the Marta and bring her down on the loading apron',
      'Defend her while the fuel lines pump — five rounds',
      'Get the squad aboard and lift off',
      {sub:1,text:'The Marta’s engines will wake the whole depot. Expect company.'},
    ],
    hint:'Stay out of the guards’ sight cones on the way in. Once the Marta lands, at least one of you has to stand on the apron for the tanks to keep filling. The red drums around the pumps go up if a stray round finds them.',
  },
  towerLabel:'WATCHTOWER',
  lamps:[[1640,360],[1810,540],[1260,560],[900,820],[1560,760]],
  csLine:'Redrock Flats. I’ll keep her warm and stay out of sight — call me when you’re at the pumps.',
  lzLabel:'MARTA LZ',
  LZ:{x:260,y:1190,r:130},PAD:{x:1700,y:440,r:150},
  TOWER:{x:1330,y:300,r:54},
  panTo:{x:1500,y:480},
  guardPt:{x:1700,y:470},
  work:[],
  waves:[
    {at:1,log:'<span class="h">A patrol crawler rolls in off the east road</span> — a Police Cruiser and two guards, bailing out fast.',
     foes:[
       foe('police-cruiser',{id:'pcw',x:2120,y:560,crew:[foe('security-patrolman',{seat:'drv',id:'pcwd',name:'Patrolman Dace',first:'Dace',lines:['Unit 4, responding.','Pull over! All of you!']})]}),
       foe('depot-guard',{id:'dill',name:'Guard Dill',first:'Dill',x:2150,y:640,lines:['Fuel thieves! At the apron!','Sheriff’ll have my head.']}),
       foe('depot-guard',{id:'corr',name:'Guard Corr',first:'Corr',x:2150,y:720,wpns:['carbine'],lines:['Contact! Contact!','Get that ship off my pumps!']}),
     ]},
    {at:3,log:'<span class="h">The depot warden and a second crawler arrive from the north road.</span>',
     foes:[
       foe('depot-warden',{id:'hask',name:'Warden Hask',first:'Hask',x:1420,y:40,lines:['That tithe is the Hegemony’s!','Nobody drains my tanks.']}),
       foe('depot-guard',{id:'orsk',name:'Guard Orsk',first:'Orsk',x:1520,y:40,wpns:['carbine'],lines:['North road is ours!','Warden, they’re on the apron!']}),
       foe('depot-guard',{id:'vell',name:'Guard Vell',first:'Vell',x:1320,y:40,lines:['Cover me!','Not the pumps!']}),
     ]},
  ],
  bldgs:[
    {x:1100,y:340, w:280,h:200,name:'TITHE DEPOT',sign:1},
    {x:1480,y:640, w:220,h:150,name:'PUMP HOUSE',solar:1},
    {x:760, y:720, w:240,h:160,name:'GUARD POST'},
    {x:470, y:470, w:200,h:150,name:'GRAIN STORE',solar:1},
    {x:980, y:1000,w:260,h:150,name:'HAULAGE SHED'},
    {x:340, y:880, w:130,h:100,name:''},
    {x:1860,y:860, w:170,h:130,name:'',solar:1},
  ],
  props:[
    {x:1530,y:300,kind:'canister'},{x:1860,y:320,kind:'canister'},{x:1890,y:540,kind:'canister'},{x:1560,y:560,kind:'canister'},
    {x:900, y:940,kind:'canister'},
    {x:1620,y:250,kind:'barrel'},{x:1660,y:262,kind:'barrel'},{x:1800,y:590,kind:'barrel'},
    {x:1580,y:380,kind:'crate'},{x:1810,y:290,kind:'crate'},{x:1620,y:600,kind:'crate'},
    {x:1410,y:720,kind:'wagon',a:0.3},{x:880,y:590,kind:'wagon',a:-0.2},{x:1250,y:1110,kind:'wagon',a:0.6},
    {x:1300,y:880,kind:'trough'},{x:720,y:1000,kind:'trough'},
    {x:700,y:1100,kind:'rock'},{x:1100,y:1240,kind:'rock'},{x:1500,y:1000,kind:'rock'},{x:1950,y:760,kind:'rock'},
    {x:2000,y:1000,kind:'rock'},{x:620,y:290,kind:'rock'},{x:980,y:260,kind:'rock'},{x:480,y:760,kind:'rock'},
    {x:1180,y:700,kind:'crate'},{x:1120,y:780,kind:'crate'},
  ],
  loots:[
    {id:'strongbox',x:1236,y:510,label:'Tithe strongbox',take:'480 ◈ credits',c:480},
    {id:'guardcrate',x:880,y:830,label:'Guard post crate',take:'64 ▤ supplies',s:64},
    {id:'grain',x:560,y:620,label:'Grain store',take:'88 ▤ supplies',s:88},
    {id:'blamA',x:1560,y:800,label:'BLAM crate',take:'3× BLAM frag',nades:3},
    {id:'charges',x:800,y:760,label:'Depot blasting charges',take:'2× Explosive Charge',items:['charge','charge']},
  ],
  foes(){return [
    foe('depot-guard',{id:'holt',name:'Guard Holt',first:'Holt',x:1250,y:620,wpns:['carbine'],patrol:[{x:1250,y:620},{x:1100,y:700},{x:1350,y:740}],lines:['Nothing on the east flats.','Who fired? WHO FIRED?']}),
    foe('depot-guard',{id:'vane',name:'Guard Vane',first:'Vane',x:1000,y:880,patrol:[{x:1000,y:880},{x:760,y:940}],lines:['Dust and more dust…','They’re armed! GUNS!']}),
    foe('depot-guard',{id:'tull',name:'Guard Tull',first:'Tull',x:720,y:600,patrol:[{x:720,y:600},{x:560,y:720}],lines:['Herders don’t come this way.','West road! Raiders!']}),
    foe('depot-guard',{id:'ruck',name:'Guard Ruck',first:'Ruck',x:1780,y:300,wpns:['carbine'],guard:1,patrol:[{x:1780,y:300},{x:1890,y:430},{x:1770,y:560}],lines:['Apron’s secure.','They want the tanks!']}),
    foe('depot-guard',{id:'pike2',name:'Guard Pike',first:'Pike',x:1620,y:700,guard:1,patrol:[{x:1620,y:700},{x:1760,y:660}],lines:['Pumps are locked.','Fall back to the pumps!']}),
    foe('depot-guard',{id:'hale',name:'Tower Hale',first:'Hale',x:1330,y:300,hp:55,aim:3,def:12,wpns:['longiron'],elev:1,fixed:1,lines:['Clear view from up here.','Say when, Warden.']}),
  ];},
  civs(){return [
    {id:'civ1',name:'Herder',first:'herder',side:'civ',x:430,y:1000,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:430,y:1000},{x:540,y:1090},{x:380,y:1120}]},
    {id:'civ2',name:'Herder',first:'herder',side:'civ',x:900,y:1130,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:900,y:1130},{x:1040,y:1180},{x:800,y:1200}]},
  ];},
},
autofactory:{
  mode:'autofactory',W:2400,H:1600,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  title:'Blow Up Auto Factory',sub:'Kiln Ridge \u00b7 Menk \u2014 Revolution I',
  foesLabel:'Security',calmLabel:'Plant is quiet',alertLabel:'Plant alerted',
  banner:['Blow Up Auto Factory','Every Auto is a policeman we never meet'],
  brief:{
    eyebrow:'Ground Operation \u00b7 Kiln Ridge, Menk',
    flavour:'The Hegemony pours Menk\u2019s salt and labour into the <b>Kiln Ridge Autoworks</b>, turning out Policebots by the thousand. The whole line runs off one <b>Power Plant</b> on the north side. Put a charge on the main breaker, walk away, and let the lights go out.',
    objectives:[
      'Get the explosive charge to the Power Plant\u2019s main breaker',
      'Plant it',
      'Get clear of the blast zone, then detonate',
      'Get the squad back to the Marta',
      {sub:1,text:'(Optional) Do it without the plant ever raising the alarm.'},
    ],
    hint:'One of you carries the charge (marked \u2738). Only the carrier can plant it. Riot shields stop every shot from the front, so flank them. Policebots never panic, but they are flimsy. Stay out of the sight cones and the plant may never know you were here.',
  },
  towerLabel:'',
  lamps:[[820,620],[1500,560],[1870,560],[700,980],[1620,1000]],
  csLine:'Kiln Ridge. I\u2019ll be at the LZ with the engines warm. Light the fuse and come home.',
  lzLabel:'MARTA LZ',
  LZ:{x:260,y:1280,r:130},PAD:{x:1860,y:512,r:60},
  plant:{x:1700,y:240,w:320,h:230,bx:1860,by:355},
  blastR:330,safeR:400,
  guardPt:{x:1860,y:560},
  work:[{id:'plant',x:1860,y:512,label:'MAIN BREAKER',verb:'plants the explosive charge on the main breaker',needCharge:1}],
  detWave:{log:'<span class="h">A Riot Transport Cruiser screams in through the gate.</span>',
    foes:[
      foe('riot-transport-cruiser',{id:'rtc1',x:700,y:470,
       crew:[
        foe('security-patrolman',{seat:'drv',id:'rtcd',name:'Patrolman Gant',first:'Gant',lines:['Unloading!','Squad out, go go go!']}),
        foe('security-riot-shieldman',{seat:'bay1',id:'rs2',name:'Riot Shieldman Voss',first:'Voss',lines:['Riot line! Hold!','Disperse!']}),
        foe('security-riot-rifleman',{seat:'bay2',id:'rr2',name:'Riot Rifleman Tarn',first:'Tarn',lines:['Contact at the plant!','Shields forward!']}),
        foe('security-riot-rifleman',{seat:'bay3',id:'rr3',name:'Riot Rifleman Mek',first:'Mek',lines:['Suppressing!','Breach team, go!']}),
       ]}),
    ]},
  bldgs:[
    {x:1700,y:240, w:320,h:230,name:'POWER PLANT'},
    {x:900, y:520, w:560,h:320,name:'AUTO ASSEMBLY'},
    {x:1500,y:900, w:300,h:180,name:'PARTS STORE',solar:1},
    {x:560, y:860, w:230,h:150,name:'GUARD POST'},
    {x:700, y:400, w:150,h:110,name:'GATEHOUSE',solar:1},
    {x:980, y:1000,w:360,h:130,name:'LOADING DOCK'},
    {x:1980,y:700, w:210,h:150,name:'FACTORY OFFICE'},
  ],
  props:[
    {x:1580,y:280,kind:'canister'},{x:2060,y:330,kind:'canister'},{x:1640,y:520,kind:'barrel'},{x:2040,y:560,kind:'barrel'},
    {x:1760,y:560,kind:'crate'},{x:1960,y:540,kind:'crate'},{x:1520,y:620,kind:'crate'},
    {x:1100,y:900,kind:'crate'},{x:1200,y:900,kind:'crate'},{x:860,y:940,kind:'barrel'},
    {x:1000,y:880,kind:'wagon',a:0.1},{x:1560,y:760,kind:'wagon',a:-0.3},{x:800,y:600,kind:'wagon',a:0.5},{x:2200,y:900,kind:'wagon',a:0.2},
    {x:1350,y:1180,kind:'trough'},{x:720,y:1120,kind:'trough'},{x:1680,y:1000,kind:'trough'},
    {x:700,y:1250,kind:'rock'},{x:1100,y:1300,kind:'rock'},{x:1500,y:1250,kind:'rock'},{x:2000,y:1150,kind:'rock'},{x:500,y:700,kind:'rock'},{x:2250,y:500,kind:'rock'},
    {x:1250,y:440,kind:'crate'},{x:1400,y:880,kind:'crate'},
  ],
  loots:[
    {id:'safe',x:2080,y:880,label:'Factory office safe',take:'440 \u25c8 credits',c:440},
    {id:'scrap',x:1580,y:1100,label:'Parts crates',take:'80 \u25a4 supplies',s:80},
    {id:'blasting',x:640,y:1040,label:'Blasting shed',take:'Explosive Charge',items:['charge']},
  ],
  foes(){return [
    foe('security-patrolman',{id:'drew',name:'Patrolman Drew',first:'Drew',x:780,y:580,patrol:[{x:780,y:580},{x:760,y:700},{x:830,y:470}],lines:['Gate\u2019s quiet.','Who goes there?']}),
    foe('auto-policebot',{id:'pb12',name:'Policebot PB-12',first:'PB-12',x:830,y:900,patrol:[{x:830,y:900},{x:830,y:740}],lines:['Please remain calm.','Citizen, drop the weapon.']}),
    foe('auto-policebot',{id:'pb07',name:'Policebot PB-07',first:'PB-07',x:1030,y:1080,patrol:[{x:1030,y:1080},{x:1300,y:1180}],lines:['You are in violation of Ordinance 9.','Please stand still.']}),
    foe('security-patrolman',{id:'soll',name:'Patrolman Soll',first:'Soll',x:1560,y:860,patrol:[{x:1560,y:860},{x:1420,y:1000},{x:1700,y:800}],lines:['Nothing on the east side.','Hands where I can see them!']}),
    foe('auto-policebot',{id:'pb03',name:'Policebot PB-03',first:'PB-03',x:1680,y:560,guard:1,patrol:[{x:1680,y:560},{x:1780,y:600}],lines:['Restricted area.','Please remain calm.']}),
    foe('security-riot-shieldman',{id:'rs1',name:'Riot Shieldman Kaan',first:'Kaan',x:1860,y:588,guard:1,lines:['Nobody touches the breaker.','Shields up!']}),
    foe('security-riot-rifleman',{id:'rr1',name:'Riot Rifleman Brenn',first:'Brenn',x:2020,y:900,patrol:[{x:2020,y:900},{x:1960,y:760}],lines:['Office perimeter clear.','Rifles up!']}),
    foe('strider-mk1',{id:'strid1',name:'Strider Mk I',first:'Strider',x:1180,y:950,patrol:[{x:1180,y:950},{x:1300,y:760},{x:1060,y:1100}],lines:['We\u2019re all in this together.','Please remain calm.']}),
  ];},
  civs(){return [
    {id:'civ1',name:'Line Worker',first:'worker',side:'civ',x:1150,y:1160,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1150,y:1160},{x:1000,y:1200},{x:1260,y:1130}]},
    {id:'civ2',name:'Line Worker',first:'worker',side:'civ',x:1400,y:1040,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1400,y:1040},{x:1500,y:1180}]},
  ];},
},
towers:{
  mode:'towers',W:2200,H:1400,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  title:'Disrupt Comm Towers',sub:'Parity IV — Revolution I',
  foesLabel:'Security',calmLabel:'Compound is quiet',alertLabel:'Compound alerted',
  banner:['Disrupt Comm Towers','Take the tower, leave them listening'],
  brief:{
    eyebrow:'Ground Operation · Parity IV',
    flavour:'A comm tower, fenced and guarded. Get a device onto its base: an <b>Explosive Charge</b> drops it, a <b>Data Limpet</b> leaves it standing and lets us listen.',
    objectives:[
      'Reach the comm tower',
      'Attach the device to the tower base',
      'Get the squad back to the Marta',
      {sub:1,text:'(Optional) Do it without the compound raising the alarm.'},
    ],
    hint:'The carrier (marked ✸) is the only one who can attach the device. If two of you carry different devices, pick which one goes on the tower by who walks up. Stay out of the sight cones and the job is quiet.',
  },
  towerLabel:'',
  lamps:[[760,420],[1300,360],[1760,560],[900,900],[1500,980]],
  csLine:'Parity IV. Engines warm, lights off. Hang it on the tower and come home.',
  lzLabel:'MARTA LZ',
  LZ:{x:240,y:1180,r:130},PAD:{x:1900,y:470,r:60},
  plant:{x:1730,y:250,w:340,h:300,bx:1900,by:400},
  blastR:150,safeR:0,instant:1,
  guardPt:{x:1900,y:520},
  work:[{id:'plant',x:1900,y:470,label:'COMM TOWER',verb:'attaches the device to the tower base',needCharge:1}],
  bldgs:[
    {x:1730,y:250,w:340,h:300,name:'TOWER COMPOUND'},
    {x:760, y:520,w:260,h:170,name:'RELAY HUT',solar:1},
    {x:1180,y:820,w:300,h:180,name:'SERVICE DEPOT'},
    {x:500, y:900,w:220,h:140,name:'GUARD POST'},
    {x:1500,y:620,w:200,h:130,name:'PYLON SHED',solar:1},
    {x:1900,y:860,w:240,h:170,name:'CONTROL ANNEX'},
  ],
  props:[
    {x:1650,y:300,kind:'canister'},{x:2090,y:330,kind:'canister'},{x:1700,y:560,kind:'crate'},{x:2040,y:560,kind:'crate'},
    {x:1000,y:780,kind:'crate'},{x:1100,y:800,kind:'barrel'},{x:640,y:760,kind:'wagon',a:0.2},{x:1380,y:1100,kind:'wagon',a:-0.2},
    {x:900,y:1150,kind:'trough'},{x:1500,y:1180,kind:'trough'},{x:760,y:1240,kind:'rock'},{x:1250,y:1280,kind:'rock'},
    {x:1750,y:1100,kind:'rock'},{x:2100,y:1150,kind:'rock'},{x:560,y:520,kind:'rock'},{x:1400,y:480,kind:'barrel'},
  ],
  loots:[
    {id:'cash',x:1980,y:930,label:'Annex cash tin',take:'240 ◈ credits',c:240},
    {id:'parts',x:1230,y:930,label:'Depot parts bins',take:'60 ▤ supplies',s:60},
    {id:'cell',x:560,y:980,label:'Guard post locker',take:'Cowboy sidearm',items:['cowboy']},
  ],
  foes(){
    const v=this.variant||'ledger';
    const P=(id,nm,x,y,pat)=>foe('security-patrolman',{id,name:'Patrolman '+nm,first:nm,x,y,patrol:pat||undefined,lines:['Tower’s quiet.','Who goes there?']});
    const B=(id,n,x,y,pat,guard)=>foe('auto-policebot',{id,name:'Policebot PB-'+n,first:'PB-'+n,x,y,guard:guard||0,patrol:pat||undefined,lines:['Please remain calm.','Restricted area.']});
    const RR=(id,nm,x,y,pat,guard)=>foe('security-riot-rifleman',{id,name:'Riot Rifleman '+nm,first:nm,x,y,guard:guard||0,patrol:pat||undefined,lines:['Compound is sealed.','Rifles up!']});
    const RS=(id,nm,x,y,guard)=>foe('security-riot-shieldman',{id,name:'Riot Shieldman '+nm,first:nm,x,y,guard:guard||0,lines:['Shields up!','Nobody touches the tower.']});
    if(v==='dataflats')return [
      B('b1',41,820,640,[{x:820,y:640},{x:700,y:780}]),B('b2',42,1250,900,[{x:1250,y:900},{x:1100,y:1000}]),
      B('b3',43,1760,640,[{x:1760,y:640},{x:1860,y:600}],1),B('b4',44,1480,720,[{x:1480,y:720},{x:1620,y:800}]),
      RS('s1','Kade',1900,540,1),P('p1','Crane',600,980,[{x:600,y:980},{x:760,y:900}]),
      foe('police-cruiser',{id:'pc1',x:1050,y:1180,patrol:[{x:1050,y:1180},{x:1500,y:1120},{x:1250,y:1230}],crew:[foe('security-patrolman',{seat:'drv',id:'pc1d',name:'Patrolman Rusk',first:'Rusk',lines:['Unit 9, responding.','Stay where you are!']})]}),
    ];
    if(v==='quota')return [
      RR('r1','Wick',860,640,[{x:860,y:640},{x:760,y:800}]),RR('r2','Tarn',1300,880,[{x:1300,y:880},{x:1150,y:1000}]),
      RR('r3','Mek',1800,620,[{x:1800,y:620},{x:1960,y:640}],1),P('p1','Elm',1520,740,[{x:1520,y:740},{x:1620,y:820}]),
      foe('auto-riot-bruiser',{id:'bru1',name:'Riot Bruiser Gorm',first:'Gorm',x:1900,y:540,guard:1,lines:['Please remain calm.','Non-compliance detected.']}),
      P('p2','Soll',620,1000,[{x:620,y:1000},{x:760,y:920}]),
    ];
    return [
      P('p1','Drew',820,620,[{x:820,y:620},{x:760,y:780},{x:900,y:540}]),P('p2','Soll',1240,900,[{x:1240,y:900},{x:1100,y:1000},{x:1380,y:860}]),
      P('p3','Elm',1560,720,[{x:1560,y:720},{x:1700,y:800}]),B('b1',21,1680,640,[{x:1680,y:640},{x:1780,y:600}],1),
      B('b2',22,900,1060,[{x:900,y:1060},{x:1200,y:1160}]),RR('r1','Brenn',1900,540,null,1),
    ];
  },
  civs(){return [
    {id:'civ1',name:'Maintenance Clerk',first:'clerk',side:'civ',x:1150,y:1100,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1150,y:1100},{x:1000,y:1160},{x:1260,y:1080}]},
  ];},
},
rescue:{
  mode:'rescue',W:2200,H:1500,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  title:'Rescue Dissident',sub:'Tollgate Landing · Ballakan — Revolution I',
  foesLabel:'Security',calmLabel:'Outpost is quiet',alertLabel:'Outpost alerted',
  banner:['Rescue Dissident','Somebody has to open the door'],
  brief:{
    eyebrow:'Ground Operation · Tollgate Landing, Ballakan',
    flavour:'A well-known voice on the river has been locked in the <b>Tollgate security outpost</b>, waiting for a transfer nobody will ever hear about. Get in, open the cell, and bring them out.',
    objectives:[
      'Reach the detention cage behind the guardhouse',
      'Release the prisoner from confinement',
      'Bring them and the squad back to the Marta',
      {sub:1,text:'(Optional) Do it without the enemy realising you were there.'},
      {sub:1,text:'The prisoner is unarmed in all but name. If they go down, the mission fails.'},
    ],
    hint:'Stay out of the sight cones and the outpost may never know you were here. The prisoner follows your orders once freed, but is fragile. Riot shields stop every shot from the front, so flank them.',
  },
  towerLabel:'',
  lamps:[[700,520],[1300,470],[1720,560],[1100,900],[1600,930]],
  csLine:'Tollgate Landing. I’ll be here. Bring them out the way you went in.',
  lzLabel:'MARTA LZ',
  LZ:{x:250,y:1150,r:130},PAD:{x:1720,y:470,r:60},
  cage:{x:1660,y:330,w:120,h:120,dx:1720,dy:470},
  guardPt:{x:1720,y:540},
  work:[{id:'release',x:1720,y:476,label:'CELL LOCK',verb:'cuts the lock on the cell'}],
  bldgs:[
    {x:1240,y:250, w:260,h:180,name:'GUARDHOUSE'},
    {x:640, y:560, w:300,h:170,name:'BARRACKS'},
    {x:1040,y:900, w:280,h:160,name:'TOLL OFFICE'},
    {x:1560,y:800, w:320,h:180,name:'BARGE SHED',solar:1},
    {x:540, y:320, w:160,h:110,name:'GATEHOUSE'},
  ],
  props:[
    {x:1500,y:760,kind:'canister'},{x:1920,y:900,kind:'canister'},
    {x:1560,y:540,kind:'crate'},{x:1800,y:560,kind:'crate'},{x:1420,y:600,kind:'barrel'},{x:1850,y:420,kind:'barrel'},
    {x:980,y:640,kind:'crate'},{x:1140,y:760,kind:'crate'},{x:820,y:880,kind:'barrel'},
    {x:900,y:800,kind:'wagon',a:0.2},{x:1380,y:980,kind:'wagon',a:-0.3},{x:1980,y:700,kind:'wagon',a:0.4},
    {x:1250,y:1160,kind:'trough'},{x:720,y:1050,kind:'trough'},
    {x:600,y:950,kind:'rock'},{x:1100,y:1260,kind:'rock'},{x:1500,y:1200,kind:'rock'},{x:2050,y:1100,kind:'rock'},{x:400,y:700,kind:'rock'},{x:1900,y:300,kind:'rock'},
  ],
  loots:[
    {id:'locker',x:1340,y:470,label:'Evidence locker',take:'Peacekeeper Carbine',items:['carbine']},
    {id:'tollbox',x:1100,y:1050,label:'Toll box',take:'360 ◈ credits',c:360},
    {id:'rations',x:1650,y:990,label:'Barge rations',take:'72 ▤ supplies',s:72},
  ],
  foes(){return [
    foe('security-patrolman',{id:'fenn',name:'Patrolman Fenn',first:'Fenn',x:720,y:470,patrol:[{x:720,y:470},{x:800,y:620},{x:640,y:480}],lines:['Gate’s quiet.','Who goes there?']}),
    foe('auto-policebot',{id:'pb21',name:'Policebot PB-21',first:'PB-21',x:850,y:800,patrol:[{x:850,y:800},{x:960,y:660}],lines:['Please remain calm.','Citizen, you are in a restricted area.']}),
    foe('auto-policebot',{id:'pb22',name:'Policebot PB-22',first:'PB-22',x:1600,y:520,guard:1,patrol:[{x:1600,y:520},{x:1660,y:560}],lines:['Restricted area.','Please stand still.']}),
    foe('security-riot-shieldman',{id:'rs3',name:'Riot Shieldman Orla',first:'Orla',x:1720,y:524,guard:1,lines:['Nobody touches the prisoner.','Shields up!']}),
    foe('security-riot-rifleman',{id:'rr4',name:'Riot Rifleman Dace',first:'Dace',x:1420,y:500,patrol:[{x:1420,y:500},{x:1520,y:620}],lines:['Cell block is sealed.','Rifles up!']}),
    foe('security-patrolman',{id:'oake',name:'Patrolman Oake',first:'Oake',x:1150,y:1000,patrol:[{x:1150,y:1000},{x:1000,y:850},{x:1250,y:900}],lines:['Nothing at the toll office.','Hands where I can see them!']}),
    foe('security-patrolman',{id:'bray',name:'Patrolman Bray',first:'Bray',x:1700,y:920,patrol:[{x:1700,y:920},{x:1850,y:840}],lines:['Barge side is clear.','Stop right there!']}),
    foe('auto-riot-bruiser',{id:'bru1',name:'Riot Bruiser Gorm',first:'Gorm',x:1640,y:524,guard:1,lines:['Please remain calm.','Non-compliance detected.']}),
  ];},
  civs(){return [
    {id:'civ1',name:'Barge Hand',first:'barge hand',side:'civ',x:1250,y:1200,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1250,y:1200},{x:1120,y:1240},{x:1380,y:1180}]},
    {id:'civ2',name:'Barge Hand',first:'barge hand',side:'civ',x:800,y:1180,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:800,y:1180},{x:700,y:1100}]},
  ];},
},
intel:{
  mode:'intel',W:2400,H:1500,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  title:'Steal Intelligence',sub:'Data Flats · Parity IV — Revolution I',
  foesLabel:'Security',calmLabel:'Farm is quiet',alertLabel:'Farm alerted',
  banner:['Steal Intelligence','Everything they know, in one drive'],
  brief:{
    eyebrow:'Ground Operation · Data Flats, Parity IV',
    flavour:'The Bureau keeps its Parity IV registry backups on a <b>server farm</b> out on the Data Flats: fences, Policebots and a terminal bank in the east hall. Get your <b>Field Technician</b> to the databank terminal and keep them alive while they crack it.',
    objectives:[
      'Reach the databank terminal in the east server hall',
      'Hack into the Hegemony databanks — three rounds, your Field Technician only',
      'Extract with the stolen data',
      {sub:1,text:'Finishing the hack sets off the trace. Expect a response.'},
    ],
    hint:'Only the Field Technician (marked ⌨) can work the terminal. Stay out of the sight cones for as long as you can; the hack keeps running only while they stay on the terminal. Riot shields stop every shot from the front, so flank them.',
  },
  towerLabel:'',
  lamps:[[760,560],[1300,520],[1660,600],[1100,900],[1800,900]],
  csLine:'Data Flats. Engines warm, lights off. Copy fast and come home.',
  lzLabel:'MARTA LZ',
  LZ:{x:260,y:1200,r:130},PAD:{x:1660,y:540,r:60},
  guardPt:{x:1660,y:600},
  work:[{id:'hack',x:1660,y:540,label:'DATABANK TERMINAL',verb:'cracks the databank and copies the drive',needSpec:'fieldtech',rounds:3}],
  alarmWave:{log:'<span class="h">The trace trips the alarm and a security crawler pulls up at the gate</span> — a shield line and two riflemen.',
    foes:[
      foe('security-riot-shieldman',{id:'rs5',name:'Riot Shieldman Kade',first:'Kade',x:640,y:560,lines:['Riot line! Hold!','Disperse!']}),
      foe('security-riot-rifleman',{id:'rr5',name:'Riot Rifleman Saul',first:'Saul',x:600,y:640,lines:['Contact at the databank!','Shields forward!']}),
      foe('security-riot-rifleman',{id:'rr6',name:'Riot Rifleman Petra',first:'Petra',x:600,y:480,lines:['Suppressing!','Breach team, go!']}),
    ]},
  bldgs:[
    {x:1500,y:260, w:340,h:230,name:'EAST SERVER HALL'},
    {x:1000,y:300, w:260,h:200,name:'WEST SERVER HALL'},
    {x:1750,y:720, w:230,h:150,name:'CONTROL ROOM'},
    {x:1050,y:800, w:320,h:170,name:'COOLING PLANT',solar:1},
    {x:640, y:480, w:200,h:130,name:'GUARDHOUSE'},
    {x:560, y:900, w:220,h:140,name:'STORES'},
  ],
  props:[
    {x:1420,y:600,kind:'crate'},{x:1800,y:560,kind:'crate'},{x:1560,y:660,kind:'barrel'},{x:1900,y:420,kind:'barrel'},
    {x:900,y:620,kind:'crate'},{x:1300,y:640,kind:'crate'},{x:800,y:1000,kind:'barrel'},
    {x:1480,y:760,kind:'wagon',a:0.3},{x:780,y:760,kind:'wagon',a:-0.2},{x:1900,y:980,kind:'wagon',a:0.4},
    {x:1250,y:1160,kind:'trough'},{x:1650,y:1100,kind:'trough'},
    {x:1000,y:780,kind:'canister'},{x:1420,y:900,kind:'canister'},
    {x:500,y:700,kind:'rock'},{x:1100,y:1260,kind:'rock'},{x:1500,y:1250,kind:'rock'},{x:2100,y:1100,kind:'rock'},{x:2200,y:500,kind:'rock'},{x:700,y:300,kind:'rock'},
  ],
  loots:[
    {id:'cashbox',x:1830,y:860,label:'Bureau cash box',take:'360 ◈ credits',c:360},
    {id:'parts',x:700,y:1040,label:'Spare rack parts',take:'72 ▤ supplies',s:72},
  ],
  foes(){return [
    foe('security-patrolman',{id:'crane',name:'Patrolman Crane',first:'Crane',x:760,y:600,patrol:[{x:760,y:600},{x:900,y:700},{x:720,y:470}],lines:['Gate’s quiet.','Who goes there?']}),
    foe('auto-policebot',{id:'pb31',name:'Policebot PB-31',first:'PB-31',x:1150,y:640,patrol:[{x:1150,y:640},{x:1000,y:700}],lines:['Please remain calm.','Citizen, you are in a restricted area.']}),
    foe('auto-policebot',{id:'pb32',name:'Policebot PB-32',first:'PB-32',x:1620,y:640,guard:1,patrol:[{x:1620,y:640},{x:1720,y:620}],lines:['Restricted area.','Please stand still.']}),
    foe('security-riot-shieldman',{id:'rs4',name:'Riot Shieldman Bour',first:'Bour',x:1660,y:600,guard:1,lines:['Nobody touches the terminal.','Shields up!']}),
    foe('security-riot-rifleman',{id:'rr7',name:'Riot Rifleman Wick',first:'Wick',x:1400,y:540,patrol:[{x:1400,y:540},{x:1500,y:680}],lines:['East hall is sealed.','Rifles up!']}),
    foe('security-patrolman',{id:'elm',name:'Patrolman Elm',first:'Elm',x:1200,y:1000,patrol:[{x:1200,y:1000},{x:1050,y:900},{x:1350,y:1050}],lines:['Cooling plant clear.','Hands where I can see them!']}),
    foe('auto-policebot',{id:'pb33',name:'Policebot PB-33',first:'PB-33',x:1800,y:940,patrol:[{x:1800,y:940},{x:1950,y:860}],lines:['You are in violation of Ordinance 9.','Please stand still.']}),
    foe('police-cruiser',{id:'pc1',x:1050,y:1180,patrol:[{x:1050,y:1180},{x:1500,y:1120},{x:1250,y:1230}],crew:[foe('security-patrolman',{seat:'drv',id:'pc1d',name:'Patrolman Rusk',first:'Rusk',lines:['Unit 9, responding.','Stay where you are!']})]}),
  ];},
  civs(){return [
    {id:'civ1',name:'Data Clerk',first:'clerk',side:'civ',x:1150,y:1160,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1150,y:1160},{x:1000,y:1200},{x:1260,y:1130}]},
  ];},
},
strider:{
  mode:'strider',W:2400,H:1600,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  title:'Steal the Strider',sub:'Menk Crossing · Menk — Revolution I',
  foesLabel:'Security',calmLabel:'Yard is quiet',alertLabel:'Yard alerted',
  banner:['Steal the Strider','Walk it out'],
  brief:{
    eyebrow:'Ground Operation · Menk Crossing, Menk',
    flavour:'A <b>Strider Mk I</b> — the Hegemony’s friendly neighbourhood enforcement walker — is parked in a locked holding yard behind the Autoworks’ Crossing depot, waiting for delivery. Its leash panel can be overridden on site. Get in, wake it up, and walk it out.',
    objectives:[
      'Reach the holding yard behind the depot',
      'Override the Strider’s leash panel',
      'Guide the Strider and the squad back to the Marta',
      {sub:1,text:'(Optional) Do it without the enemy realising you were there.'},
      {sub:1,text:'If the Strider is destroyed, the mission fails.'},
    ],
    hint:'Once the leash is off the Strider follows your orders like any rebel: heavy, tough and loud. Keep it out of sight cones until you need it. Riot shields stop every shot from the front, so flank them.',
  },
  towerLabel:'',
  lamps:[[760,640],[1300,560],[1720,600],[1200,980],[1800,1000]],
  csLine:'Menk Crossing. I will keep the cargo bay open. Try not to scratch it.',
  lzLabel:'MARTA LZ',
  LZ:{x:260,y:1250,r:130},PAD:{x:1720,y:480,r:60},
  cage:{x:1640,y:340,w:160,h:140,dx:1720,dy:490,label:'HOLDING YARD'},
  guardPt:{x:1720,y:560},
  releaseText:{float:'STRIDER ONLINE',log:'The leash panel gives. The Strider stands up, its face-screen cheerfully reading <b>“We’re all in this together.”</b> Get it and the squad back to the Marta.',
    obj:['Reach the holding yard','Override the Strider’s leash panel','(Optional) Stay unseen','Get the Strider and the squad aboard']},
  work:[{id:'release',x:1720,y:496,label:'LEASH PANEL',verb:'overrides the Strider’s leash panel',rounds:2}],
  bldgs:[
    {x:1240,y:260, w:260,h:180,name:'CROSSING DEPOT'},
    {x:640, y:560, w:300,h:170,name:'PRECINCT HOUSE'},
    {x:1040,y:900, w:280,h:160,name:'COMPANY STORE'},
    {x:1560,y:820, w:320,h:180,name:'WAREHOUSE',solar:1},
    {x:540, y:330, w:160,h:110,name:'GATEHOUSE'},
    {x:1800,y:1100,w:200,h:130,name:''},
  ],
  props:[
    {x:1500,y:760,kind:'canister'},{x:1940,y:920,kind:'canister'},
    {x:1560,y:560,kind:'crate'},{x:1860,y:580,kind:'crate'},{x:1420,y:620,kind:'barrel'},{x:1900,y:380,kind:'barrel'},
    {x:980,y:660,kind:'crate'},{x:1140,y:780,kind:'crate'},{x:820,y:900,kind:'barrel'},
    {x:900,y:800,kind:'wagon',a:0.2},{x:1380,y:1000,kind:'wagon',a:-0.3},{x:2040,y:720,kind:'wagon',a:0.4},
    {x:1250,y:1180,kind:'trough'},{x:720,y:1080,kind:'trough'},
    {x:600,y:980,kind:'rock'},{x:1100,y:1300,kind:'rock'},{x:1500,y:1260,kind:'rock'},{x:2100,y:1140,kind:'rock'},{x:400,y:720,kind:'rock'},{x:2000,y:280,kind:'rock'},
  ],
  loots:[
    {id:'ledgers',x:1100,y:1050,label:'Company strongbox',take:'300 ◈ credits',c:300},
    {id:'rations',x:1650,y:1010,label:'Depot rations',take:'80 ▤ supplies',s:80},
  ],
  foes(){return [
    foe('security-patrolman',{id:'hask2',name:'Patrolman Hale',first:'Hale',x:720,y:470,patrol:[{x:720,y:470},{x:800,y:620},{x:640,y:480}],lines:['Gate’s quiet.','Who goes there?']}),
    foe('auto-policebot',{id:'pb41',name:'Policebot PB-41',first:'PB-41',x:850,y:800,patrol:[{x:850,y:800},{x:960,y:660}],lines:['Please remain calm.','Citizen, you are in a restricted area.']}),
    foe('auto-policebot',{id:'pb42',name:'Policebot PB-42',first:'PB-42',x:1600,y:560,guard:1,patrol:[{x:1600,y:560},{x:1660,y:600}],lines:['Restricted area.','Please stand still.']}),
    foe('security-riot-shieldman',{id:'rs6',name:'Riot Shieldman Ysel',first:'Ysel',x:1720,y:540,guard:1,lines:['Nobody touches the walker.','Shields up!']}),
    foe('security-riot-rifleman',{id:'rr8',name:'Riot Rifleman Garr',first:'Garr',x:1420,y:500,patrol:[{x:1420,y:500},{x:1520,y:640}],lines:['Yard is sealed.','Rifles up!']}),
    foe('security-patrolman',{id:'elm2',name:'Patrolman Voss',first:'Voss',x:1150,y:1000,patrol:[{x:1150,y:1000},{x:1000,y:850},{x:1250,y:900}],lines:['Nothing at the store.','Hands where I can see them!']}),
    foe('auto-policebot',{id:'pb43',name:'Policebot PB-43',first:'PB-43',x:1700,y:940,patrol:[{x:1700,y:940},{x:1850,y:860}],lines:['You are in violation of Ordinance 9.','Please stand still.']}),
    foe('riot-dispersal-cruiser',{id:'rdc1',x:1450,y:690,guard:1,crew:[foe('security-patrolman',{seat:'drv',id:'rdcd',name:'Patrolman Lusk',first:'Lusk',lines:['Yard car, rolling.','Turret, light them up!']}),foe('security-riot-rifleman',{seat:'gun',id:'rdcg',name:'Riot Gunner Pell',first:'Pell',aim:1,lines:['Dispersal turret deployed.','Disperse!']})]}),
  ];},
  civs(){return [
    {id:'civ1',name:'Depot Hand',first:'depot hand',side:'civ',x:1250,y:1200,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1250,y:1200},{x:1120,y:1240},{x:1380,y:1180}]},
  ];},
},
haven:{
  mode:'haven',W:1600,H:1200,scale:1.45,style:'rock',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:false,tumbleweed:false,tutorial:true,gen:1,
  title:'Take the Rock',sub:'Haven Rock \u00b7 the Drift \u2014 Prologue',
  foesLabel:'Squatters',calmLabel:'Camp is quiet',alertLabel:'Camp alerted',
  banner:['Take the Rock','Every war starts with a kicked-in door'],
  brief:{
    eyebrow:'Prologue · The Drift',
    flavour:'Until now, you have been little more than disgruntled civilians. Angry at the Hegemony, willing to bend its laws, but never organised enough to do anything about it.<br><br><b>That ends here.</b><br><br>A smuggler’s bolt-hole has been carved into a mountain, hidden from the Hegemony and absent from every official chart. It has a hangar, a command room and enough bunks to house a small crew. Unfortunately, it’s already occupied by a handful of <b>Vult gang squatters</b>. Take the base, and you’ll have somewhere to build the revolution.',
    objectives:[
      'Clear the squatters holding the rock — outside, then room by room',
      'Take the command room from Boss Craw',
      'Raise the rebel signal at the command console',
    ],
    hint:'',
  },
  lzLabel:'',
  LZ:{x:250,y:1060,r:90},
  camp:{x:920,y:960},
  panTo:{x:925,y:640},
  guardPt:{x:990,y:620},
  door:{x:925,y:788},
  derelict:{x:850,y:280,a:-0.35},
  bossTrigger:{x:1125,y:470,r:280},
  bossDoor:{x:1125,y:480},
  bossFloat:'BOSS CRAW',
  bossLog:'<span class="h">Boss Craw storms out of the command room</span> \u2014 scattergun and spit.',
  bossAlert:'Craw\u2019s roar rattles the corridors.',
  solids:[{x:620,y:80,w:900,h:710},{x:0,y:40,w:620,h:180}],
  opens:[
    {x:660, y:140,w:380,h:290,label:'HANGAR CAVE'},
    {x:880, y:430,w:110,h:130},
    {x:820, y:560,w:340,h:120,label:'MAIN HALL'},
    {x:880, y:680,w:90, h:110},
    {x:1160,y:600,w:90, h:60},
    {x:1250,y:560,w:190,h:140,label:'BARRACKS'},
    {x:1080,y:430,w:90, h:130},
    {x:1090,y:200,w:310,h:230,label:'COMMAND'},
  ],
  bldgs:[],
  work:[
    {id:'flag',x:1245,y:300,label:'RAISE THE SIGNAL',verb:'patches the rebel signal through the base antenna',needClear:1},
  ],
  props:[
    {x:350, y:700, kind:'rock'},{x:500,y:900,kind:'rock'},{x:300,y:500,kind:'rock'},
    {x:1200,y:950, kind:'rock'},{x:1440,y:880,kind:'rock'},{x:180,y:820,kind:'rock'},
    {x:700, y:1080,kind:'rock'},{x:1560,y:1050,kind:'rock'},{x:1100,y:850,kind:'rock'},
    {x:890, y:940, kind:'crate'},{x:960,y:975,kind:'crate'},
    {x:840, y:985, kind:'barrel'},
    {x:1010,y:925, kind:'canister'},
    {x:1130,y:1000,kind:'wagon',a:0.4},
    {x:760, y:380, kind:'crate'},{x:980,y:180,kind:'crate'},
    {x:700, y:200, kind:'barrel'},
    {x:960, y:400, kind:'canister'},
    {x:1000,y:620, kind:'crate'},
    {x:1380, y:600,kind:'crate'},
    {x:1150,y:260, kind:'crate'},
  ],
  loots:[
    {id:'stash',  x:920, y:905, label:'Squatter stash',take:'224 \u25c8 credits',c:224},
    {id:'scrap',  x:700, y:360, label:'Hauler parts',  take:'72 \u25a4 supplies',s:72},
    {id:'rations',x:1395,y:660, label:'Ration crates', take:'48 \u25a4 supplies',s:48},
    {id:'lockbox',x:1330,y:240, label:'Smuggler lockbox',take:'120 \u25c8 credits',c:120},
  ],
  foes(){return [
    foe('squatter-boss',{id:'craw',name:'Boss Craw',first:'Craw',x:1245,y:330,office:1,
      lines:['Vult gang runs this drift!','Burn them out!','This rock is CLAIMED, you hear?!']}),
    foe('squatter',{id:'odo',name:'Odo',first:'Odo',x:900,y:960,patrol:[{x:900,y:960},{x:1010,y:1000},{x:820,y:1000}],
      lines:['Trail\u2019s quiet. Too quiet. Nah, just quiet.','It\u2019s a raid! IT\u2019S A RAID!']}),
    foe('squatter',{id:'vult',name:'Vult',first:'Vult',x:1000,y:900,patrol:[{x:1000,y:900},{x:880,y:930}],
      lines:['Somebody\u2019s sniffin\u2019 round the flat\u2026','WHO LIT THAT UP?!']}),
    foe('squatter',{id:'brek',name:'Brek',first:'Brek',x:925,y:712,hp:75,def:10,guard:1,patrol:[{x:925,y:712},{x:920,y:692}],
      lines:['Nobody comes through my door.','THE DOOR! They\u2019re at the DOOR!']}),
    foe('squatter',{id:'pike',name:'Pike',first:'Pike',x:860,y:300,hp:75,wpns:['carbine'],patrol:[{x:860,y:300},{x:760,y:200},{x:980,y:390}],
      lines:['The wreck\u2019s mine, I called it.','They\u2019re INSIDE!'] }),
    foe('squatter',{id:'mox',name:'Mox',first:'Mox',x:1000,y:210,aim:1,patrol:[{x:1000,y:210},{x:700,y:170}],
      lines:['That hauler\u2019s worth more\u2019n all of us.','They\u2019re in the CAVE!']}),
    foe('squatter',{id:'rzek',name:'Rzek',first:'Rzek',x:990,y:620,aim:1,patrol:[{x:990,y:620},{x:870,y:610},{x:1120,y:640}],
      lines:['Heard somethin\u2019 down the hall\u2026','They\u2019ve got RIFLES!']}),
    foe('squatter',{id:'sarn',name:'Sarn',first:'Sarn',x:1330,y:640,hp:75,def:10,wpns:['carbine'],guard:1,patrol:[{x:1330,y:640},{x:1270,y:600}],
      lines:['Bunks\u2019re ours. Boss said.','Boss! COMPANY!']}),
    foe('squatter',{id:'hasp',name:'Hasp',first:'Hasp',x:1125,y:530,wpns:['carbine'],guard:1,patrol:[{x:1125,y:530},{x:1120,y:458}],
      lines:['Boss said watch the hall. I watch the hall.','BOSS! GUNS IN THE HALL!']}),
  ];},
  civs(){return [];},
},
};
function genWalls(solids,opens){
  const out=[];
  for(const so of solids){
    let act=[];
    const flush=keep=>{
      for(const t of act)if(!keep||!keep.includes(t))out.push({x:t.x,y:t.y0,w:t.w,h:t.y1-t.y0,terrain:1});
      act=keep||[];
    };
    for(let y=so.y;y<so.y+so.h;y+=10){
      const y2=Math.min(so.y+so.h,y+10);
      let iv=[[so.x,so.x+so.w]];
      for(const op of opens){
        if(op.y>=y2||op.y+op.h<=y)continue;
        const niv=[];
        for(const [a2,b2] of iv){
          if(op.x>=b2||op.x+op.w<=a2){niv.push([a2,b2]);continue;}
          if(op.x>a2)niv.push([a2,op.x]);
          if(op.x+op.w<b2)niv.push([op.x+op.w,b2]);
        }
        iv=niv;
      }
      const nact=[];
      for(const [a2,b2] of iv){
        const m=act.find(t=>t.x===a2&&t.w===b2-a2&&t.y1===y);
        if(m){m.y1=y2;nact.push(m);}
        else nact.push({x:a2,w:b2-a2,y0:y,y1:y2});
      }
      flush(nact);
    }
    flush(null);
  }
  return out;
}
const KEY_BLDG={towers:'TOWER COMPOUND',intel:'EAST SERVER HALL',stealfuel:'TITHE DEPOT',autofactory:'AUTO ASSEMBLY',rescue:'GUARDHOUSE'};
/* a mission type replayed in a new narrative context: rename the place, relabel the key building, thicken security with the world's Security level */
function contextScenario(base,c,sec){
  const S=Object.assign({},base);
  if(c){
    if(c.title)S.title=c.title;
    if(c.sub)S.sub=c.sub;
    S.brief=Object.assign({},base.brief,{eyebrow:c.eyebrow||base.brief.eyebrow,flavour:c.flavour||base.brief.flavour});
    if(c.place)S.csLine=c.place+'. '+String(base.csLine).replace(/^[^.]*\.\s*/,'');
    const key=KEY_BLDG[base.mode]||KEY_BLDG[base.id];
    if(key&&c.target&&base.bldgs)S.bldgs=base.bldgs.map(b=>b.name===key?Object.assign({},b,{name:c.target.toUpperCase()}):b);
    S.place=c.place||'';
    S.variant=c.variant||'';
  }
  const extra=Math.max(0,(sec||1)-2)*2;
  if(extra>0&&base.foes){
    const f0=base.foes;
    S.foes=function(){
      const L=f0.call(this),pool=L.filter(f=>!f.auto&&!f.veh&&!f.shield&&!f.tower&&!f.manning);
      const out=L.slice();
      for(let i=0;i<extra&&pool.length;i++){
        const f=pool[i%pool.length];
        out.push(Object.assign({},f,{id:f.id+'x'+i,name:f.name.replace(/\S+$/,'Auxiliary'+(i+1)),first:'Aux'+(i+1),x:f.x+30+i*9,y:f.y+22,
          patrol:f.patrol?f.patrol.map(q=>({x:q.x+30,y:q.y+22})):undefined,guard:0}));
      }
      return out;
    };
  }
  return S;
}
/* The Bobbleheads stand bigger than the old tokens, so a scenario can ask to be laid out larger:
   set scale on its definition and every coordinate grows while the art and the gameplay ranges
   keep their own size. Handles the spatial fields the scenarios use; extend the lists if a new
   scenario adds one. Never mutates the registry copy. */
function scaleScenario(S0,k){
  const S=Object.assign({},S0);
  const pt=p=>p&&Object.assign({},p,{x:p.x*k,y:p.y*k},p.r!==undefined?{r:p.r*k}:{});
  const rect=b=>Object.assign({},b,{x:b.x*k,y:b.y*k,w:b.w*k,h:b.h*k});
  const units=list=>list.map(u=>Object.assign({},u,{x:u.x*k,y:u.y*k},
    u.patrol?{patrol:u.patrol.map(p=>({x:p.x*k,y:p.y*k}))}:{}));
  S.layoutK=k;
  S.W=S0.W*k;S.H=S0.H*k;
  for(const key of ['LZ','PAD','TOWER','TURRET','camp','panTo','guardPt','door','derelict','bossTrigger','bossDoor'])
    if(S0[key])S[key]=pt(S0[key]);
  for(const key of ['solids','opens','bldgs'])if(S0[key])S[key]=S0[key].map(rect);
  for(const key of ['props','loots','work'])if(S0[key])S[key]=S0[key].map(pt);
  if(S0.foes)S.foes=function(){return units(S0.foes.call(this));};
  if(S0.civs)S.civs=function(){return units(S0.civs.call(this));};
  if(S0.waves)S.waves=S0.waves.map(w=>Object.assign({},w,{foes:units(w.foes)}));
  return S;
}
function initScenario(id){
  {const b0=SCENARIOS[id]||SCENARIOS.stealcross;
   const b=b0.scale?scaleScenario(b0,b0.scale):b0;
   SCN=(CTX&&(CTX.ctx||CTX.sec>2))?contextScenario(b,CTX.ctx,CTX.sec):b;}
  W=SCN.W;H=SCN.H;
  LZ=SCN.LZ;
  PAD=SCN.PAD||OFFMAP;
  TOWER=SCN.TOWER||OFFMAP;
  TURRET=SCN.TURRET||{x:-99999,y:-99999,r:26};
  BLDGS=SCN.gen?genWalls(SCN.solids,SCN.opens).concat(SCN.bldgs||[]):SCN.bldgs;
  LOOTS=SCN.loots;
  genScatter();
}

/* ---------- units ---------- */
function mkU(o){
  const u=Object.assign({face:0,down:0,surr:0,jam:0,wound:0,braced:0,sprinted:0,owUsed:0,xpGain:0,
    order:null,extracted:0,away:0,elev:0,frail:0,sheriff:0,fixed:0,guard:0,
    manning:0,cower:0,det:0,office:0,scanT:Math.random()*7,cool:55,bunkered:0,
    px:0,py:0,path:null,wkey:null,ally:0,hacked:0,hackProg:0,hackT:0,hackTid:null,heavy:0,vehicle:0,big:0,
    autoType:o.autoType||(o.auto?'policebot':null),hackRounds:o.hackRounds||(o.auto&&!o.vehicle?1:0)},o);
  u.cool0=u.cool;
  if(u.wpns&&u.wpns.some(x=>!WPN[x])){const w=u.wpns.filter(x=>WPN[x]);u.wpns=w.length?w:['unarmed'];}   // kit with no combat stats yet fights bare-handed
  return u;
}
let U=[];
const REB_LINES={
  dax:['Move quiet. Sheriff’s law is Hegemony law out here.','Corridors, alleys — same job.','On me. Short steps.'],
  runa:['If it ticks me off, it goes bang.','Wagon there. Good iron between us and them.','This Akli better not choke on me.'],
  kel:['I’ve poached under worse moons than this.','Tower. Rifle. Watch the tower.','Wind’s with us. Take the shot.'],
  generic:['Eyes open. This is their town.','Cover to cover. No heroes.','Quiet feet, loud rifle.'],
};
const PILOT_LINES=['Just get me to that Cross in one piece.','I fly things. I don’t shoot things. Mostly.','Two rounds at the panel. Keep them off me.'];
let CTX=null; // mission spec from the base layer
function defaultSpec(){
  return {kind:'ground',missionId:'stealcross',days:2,
    squad:[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['akli','cowboy']}],
    pilot:{id:'sera',name:'Sera Kest',first:'Sera'},
    grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'}};
}
function initUnits(){
  const spec=CTX||defaultSpec();
  const spots=[[LZ.x-30,LZ.y-64],[LZ.x+42,LZ.y-52],[LZ.x-72,LZ.y+10],[LZ.x-96,LZ.y-40]];
  const squad=spec.squad.map((sp,i)=>mkU({id:sp.id,pid:sp.id,name:sp.name,first:sp.first,side:'reb',art:sp.art,
    x:spots[i%4][0],y:spots[i%4][1],hp:sp.hp||100,maxhp:sp.hp||100,aim:sp.aim||2,def:sp.def||12,cool:sp.cool||65,
    level:sp.level||1,tr:sp.tr||[],rels:sp.rels||[],ms:sp.ms||0,hero:sp.hero||0,nosprint:sp.nosprint||0,oneHand:sp.oneHand||0,cview:sp.cview||0,agi:sp.agi||1,nv:sp.nv||1,stims:sp.autoType?0:1,meds:sp.autoType?0:(sp.meds===undefined?1:sp.meds),packsUsed:0,spec:sp.spec||null,big:sp.big?1:0,heavy:sp.heavy?1:0,auto:sp.autoType?1:0,autoType:sp.autoType||null,hackRounds:0,wpns:sp.wpns||['akli','cowboy'],lines:REB_LINES[sp.id]||REB_LINES.generic}));
  if(SCN.mode==='autofactory'&&(spec.charges||0)>0&&squad[0])squad[0].charge=1;
  if(SCN.mode==='towers'){
    const devs=[];
    if((spec.charges||0)>0)devs.push('charge');
    if((spec.limpets||0)>0)devs.push('limpet');
    devs.forEach((d,i)=>{if(squad[i]){squad[i].charge=1;squad[i].device=d;}});
  }
  const roster=[...squad];
  if((SCN.mode==='rescue'||SCN.mode==='strider')&&spec.vip){
    const big=!!spec.vip.strider;
    roster.push(mkU({id:'dissident',pid:'dissident',name:spec.vip.name,first:spec.vip.first,side:'reb',
      x:SCN.cage.x+SCN.cage.w/2,y:SCN.cage.y+SCN.cage.h/2,hp:spec.vip.hp||45,maxhp:spec.vip.hp||45,aim:big?2:1,def:spec.vip.def||11,cool:big?90:45,level:1,stims:0,
      wpns:spec.vip.wpns||['cowboy'],frail:big?0:1,big:big?1:0,auto:big?1:0,bot:big?'strider':undefined,autoType:big?'strider':undefined,vip:1,caged:1,away:1,lines:['Thank God. Get me out of here.','I can\u2019t fight, but I can run.','Keep the shooting away from me!']}));
  }
  if(spec.pilot){
    roster.push(mkU({id:'sera',pid:spec.pilot.id,name:spec.pilot.name,first:spec.pilot.first,side:'reb',art:spec.pilot.art,
      x:LZ.x+16,y:LZ.y+34,hp:55,maxhp:55,aim:1,def:11,cool:45,level:(spec.pilot.level||2),stims:1,wpns:spec.pilot.wpns||['cowboy'],frail:1,lines:PILOT_LINES}));
  }
  U=[
    ...roster,
    ...expandUnits(SCN.foes()),
    ...SCN.civs().map(mkU),
  ];
  for(const u of U)u.face=u.side==='reb'?-Math.PI/4:u.side==='civ'?Math.PI*Math.random():Math.PI*0.8;
}

/* ---------- vehicles and bots ----------
   A vehicle is not a character. It is a unit in U with side 'veh', the side it answers to in .owner, and seats;
   it never acts on its own. A character mounts it (u.mnt={v,seat}) and acts through the seat: the driver moves
   it at the vehicle's speed, a gunner fires the seat's weapon. An enclosed seat cannot be targeted, so the
   vehicle takes the fire. Destroyed, it throws its crew clear and hurts them. An empty vehicle sits inert until
   someone climbs in, and then it answers to their side.
   A Bot (the Strider) is the robot equivalent of a vehicle: it drives itself and cannot be manned, and it takes
   the vehicle action list (no sprint, cover, loot or work). */
const VEHDEF=Enemies.vehicles();   // by owned_as (police, dispersal, transport): stats, speed and seats from the enemy roster
const ENTER_R=50;                     // close enough to climb in
const HATCH_COVER=3;                  // an open gun seat still has the hull around it
function mkVeh(o){
  const d=VEHDEF[o.veh];
  const v=mkU(Object.assign({name:d.name,first:d.first,hp:d.hp,maxhp:d.hp,def:d.def,aim:0,cool:55},o,
    {side:'veh',owner:o.owner||o.side||null,vehicle:1,wpns:[],seats:d.seats.map(x=>Object.assign({},x,{occ:null}))}));
  delete v.crew;
  return v;
}
/* roster entries: one with veh is a vehicle, and its crew list arrives already mounted */
function expandUnits(list){
  const out=[];
  for(const o of list){
    if(!o.veh){out.push(mkU(o));continue;}
    const v=mkVeh(o);out.push(v);
    for(const c of o.crew||[]){
      const st=v.seats.find(x=>x.k===c.seat&&!x.occ)||v.seats.find(x=>!x.occ);
      if(!st)continue;
      const u=mkU(Object.assign({side:v.owner},c,{x:v.x,y:v.y}));
      delete u.seat;
      st.occ=u.id;u.mnt={v:v.id,seat:st.k};
      out.push(u);
    }
  }
  return out;
}
const vehOf=u=>(u&&u.mnt)?U.find(v=>v.id===u.mnt.v)||null:null;
const seatOf=u=>{const v=vehOf(u);return v?v.seats.find(x=>x.k===u.mnt.seat)||null:null;};
const enclosed=u=>{const st=seatOf(u);return !!(st&&st.enc);};
const crewIn=v=>(v&&v.seats)?v.seats.map(x=>x.occ&&U.find(u=>u.id===x.occ)).filter(Boolean):[];
const vehSpd=u=>u.veh?VEHDEF[u.veh].spd*(u.wound?0.75:1):u.bot?((Enemies.owned(u.bot)||{}).speed||MOVE_R):MOVE_R;
/* a bay passenger sees nothing worth reporting; a driver or gunner keeps watch */
const lookout=u=>{const st=seatOf(u);return !st||!!st.drive||!!st.wkey;};
/* how far a Move reaches: the driver's seat moves the vehicle at its speed, a Bot moves at its own, a person on foot by order */
function reachOf(u,mode){
  if(u.mnt){const v=vehOf(u),st=seatOf(u);return v&&st&&st.drive?vehSpd(v):0;}
  if(u.bot)return vehSpd(u);
  return (mode==='sprint'?SPRINT_R:MOVE_R)*speedMul(u);
}
/* who can climb into v: a character (not a Bot) on their feet, a free seat, and nobody from the other side aboard */
function canEnter(u,v,near){
  if(!u||!v||!v.veh||v.down||u.mnt||u.bot||u.veh||u.down||u.surr||u.extracted||u.away||u.caged||u.manning||stunned(u))return false;
  if(u.side!=='reb'&&u.side!=='law')return false;
  if(!v.seats.some(x=>!x.occ))return false;
  if(crewIn(v).some(c=>c.side!==u.side))return false;
  return dist(u,v)<=(near||ENTER_R);
}
/* the Enter order appears when a vehicle is within a walk */
function enterTargets(u){return U.filter(v=>v.veh&&canEnter(u,v,MOVE_R*speedMul(u)+ENTER_R)).sort((a,b)=>dist(u,a)-dist(u,b));}
/* driver first, then a gun, then a bay */
function bestSeat(v){
  return v.seats.find(x=>!x.occ&&x.drive)||v.seats.find(x=>!x.occ&&x.wkey)||v.seats.find(x=>!x.occ)||null;
}
function mount(u,v,k){
  const st=(k&&v.seats.find(x=>x.k===k&&!x.occ))||bestSeat(v);
  if(!st)return false;
  st.occ=u.id;u.mnt={v:v.id,seat:st.k};
  v.owner=u.side;
  u.x=v.x;u.y=v.y;u.path=null;u.rtPath=null;u.braced=0;u.sprinted=0;u.bunkered=0;u.goingVeh=null;u.exitAt=null;
  if(u.order&&u.order.type==='enter')u.order=null;
  addFloater(v.x,v.y-46,st.drive?'DRIVER':st.wkey?'ON THE GUN':'ABOARD',u.side==='reb'?C.rebel:C.heg);
  log(nameSpan(u)+' climbs into the <b>'+v.name+'</b> <span class="d">('+st.n.toLowerCase()+')</span>.');
  sTick();
  return true;
}
/* step out beside the vehicle (people getting out together spread round it) */
function dismount(u,quiet){
  const v=vehOf(u),st=seatOf(u);
  if(st)st.occ=null;
  u.mnt=null;u.braced=0;
  if(!v)return;
  const n=U.filter(x=>x!==u&&x.exitAt===v.id).length;
  u.exitAt=v.id;
  for(let k=0;k<8;k++){
    const a=(v.face||0)+Math.PI*0.5+(n+k)*0.9;
    const d=moveDest(v,v.x+Math.cos(a)*48,v.y+Math.sin(a)*48,60);
    if(d){u.x=d.x;u.y=d.y;break;}
  }
  unstick(u);
  if(!quiet){
    addFloater(u.x,u.y-40,'OUT',u.side==='reb'?C.rebel:C.heg);
    log(nameSpan(u)+' gets out of the <b>'+v.name+'</b>.');
  }
}
function switchSeat(u,k){
  const v=vehOf(u),st=seatOf(u),to=v&&v.seats.find(x=>x.k===k&&!x.occ);
  if(!to||!st)return false;
  st.occ=null;to.occ=u.id;u.mnt.seat=k;u.braced=0;
  addFloater(v.x,v.y-46,to.n.toUpperCase(),u.side==='reb'?C.rebel:C.heg);
  log(nameSpan(u)+' moves to the <b>'+to.n.toLowerCase()+'</b> of the '+v.name+'.');
  return true;
}
/* seats a character could move to: one choice per kind of seat (three troop bays are one choice) */
function switchTargets(u){
  const v=vehOf(u),st=seatOf(u);if(!v||!st)return [];
  const out=[],names=new Set([st.n]);
  for(const x of v.seats)if(!x.occ&&!names.has(x.n)){names.add(x.n);out.push(x);}
  return out;
}
/* the crew ride with the vehicle */
function vehSync(){
  for(const u of U){
    if(!u.mnt)continue;
    const v=vehOf(u);
    if(!v){u.mnt=null;continue;}
    u.x=v.x;u.y=v.y;
    const st=seatOf(u);
    if(st&&st.drive&&!(st.wkey&&phase==='ENGAGE'))u.face=v.face;
  }
}
function vehDestroyed(v,by){
  v.hp=0;v.down=1;v.order=null;v.path=null;v.rtPath=null;v.wound=1;
  if(by&&by.side==='reb'&&v.owner==='law'){by.xpGain=(by.xpGain||0)+0.25;by.kills=(by.kills||0)+1;}
  if(by)adjCoolG(by,12,'vehicle kill');
  for(const m of U)if(m.side===v.owner&&!m.mnt)adjCoolG(m,-12,v.first+' destroyed');
  sBoomBig();shake=performance.now();
  decals.push({x:v.x,y:v.y,r:58});
  for(let i=0;i<24;i++)parts.push({x:v.x+(rng()-0.5)*40,y:v.y+(rng()-0.5)*30,vx:(rng()-0.5)*220,vy:-rng()*160,r:3+rng()*5,a:0.8,col:i%3?'#ff9a3c':'#3a3430',t0:performance.now(),dur:900});
  addFloater(v.x,v.y-50,'DESTROYED',C.hazard);
  log('<span class="b">The '+v.name+' is destroyed</span>'+(by?' — '+nameSpan(by)+'’s shot':'')+'.');
  for(const c of crewIn(v)){
    dismount(c,true);
    const dmg=rint(10,22);
    log(nameSpan(c)+' is thrown from the wreck <span class="d">— -'+dmg+'</span>.');
    woundUnit(null,c,dmg,rng()<0.25,'explosive');
  }
  checkDefeat();
}
/* the transport's squad gets out as the alarm goes up */
function deployUnits(v){
  v.deployed=1;
  const bay=crewIn(v).filter(c=>{const st=seatOf(c);return st&&!st.drive&&!st.wkey;});
  if(!bay.length)return;
  for(const c of bay)dismount(c,true);
  log('<span class="h">'+v.name+' disgorges its riot squad.</span>');
  sAlert();
}

/* ---------- state ---------- */
let phase='BRIEF';       // BRIEF, CUTSCENE, FREE, PLANNING, EXEC, ENGAGE, EXTRACT, GAMEOVER
let round=0,started=false,town='calm';
let hotT=0,rtPing=null,extractFx=null,freeHinted=false,lastSpotT=0,lastFrame=0;
let NADES=0,nades=[],dmgRound=new Set();
let sneak=false,turret={gunner:null,face:Math.PI},WORK=[],decals=[],exploQ=[];
let selId=null,pickMode=null;
let execT0=0,engageQ=null;
let hot=0,crossAway=false,crossFx=null,grafState='landed';
/* Steal Fuel: reach the depot, call the Marta down, hold the pumps five rounds, get out */
let fs=null;
/* Blow Up Auto Factory: carry the charge, plant it, clear the blast zone, detonate */
let fac=null;
/* Rescue Dissident: free the prisoner, bring them home; every rescued NPC is a recruit from the pool */
let rs=null;
/* Steal Intelligence: a Field Technician cracks the databank (3 rounds), then the trace trips the alarm */
let ix=null;
const exitOpen=()=>crossAway||(fac&&fac.detonated)||(rs&&rs.released)||(ix&&ix.hacked);
const FUEL_ROUNDS=5;
const exitPt=()=>(fs&&fs.landed)?PAD:LZ;
let tally={c:0,s:0,items:[]};
let lootMarks=[];        // includes LOOTS refs + dynamic drops
let floaters=[],tracers=[],parts=[],bubbles=[],casings=[],hits=[],boomFx=[];
let cam={x:LZ.x,y:LZ.y,z:0.9},camGoal=null,follow=true;
let cs=null;             // cutscene state
let shake=0,alertFlash=0,tumble={x:-200,y:830,v:34,r:16,spin:0};
let gameEnd=null;

/* ---------- geometry, LOS, cover ---------- */
function ptBlocked(px,py,pad){
  for(const b of BLDGS)if(px>=b.x-(pad||0)&&px<=b.x+b.w+(pad||0)&&py>=b.y-(pad||0)&&py<=b.y+b.h+(pad||0))return true;
  return false;
}
function segBlocked(x1,y1,x2,y2){
  const d=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.ceil(d/15));
  for(let i=1;i<n;i++){
    const t=i/n;
    if(ptBlocked(x1+(x2-x1)*t,y1+(y2-y1)*t,0))return true;
  }
  return false;
}
function losBlocked(a,b){return segBlocked(a.x,a.y,b.x,b.y);}
function inCoverAt(x,y){
  for(const p of PROPS)if(!p.dead&&PROPDEF[p.kind].cov>0&&Math.hypot(p.x-x,p.y-y)<PROPDEF[p.kind].r+34)return true;
  return false;
}
function coverOf(s,t){
  // best prop hugging the target that sits between shooter and target
  if(t.elev)return {v:2,lab:'TOWER RAILING'};
  if(t.veh||t.mnt)return null;
  let best=null;
  const angST=Math.atan2(s.y-t.y,s.x-t.x);
  for(const p of PROPS){
    const def=PROPDEF[p.kind];
    if(p.dead||def.cov<=0)continue;
    const dt=Math.hypot(p.x-t.x,p.y-t.y);
    if(dt>def.r+34)continue;
    const angPT=Math.atan2(p.y-t.y,p.x-t.x);
    if(Math.abs(angNorm(angPT-angST))>1.25)continue;
    if(dt>dist(s,t))continue;
    let v=def.cov;
    if(s.elev)v=Math.max(1,v-2);
    if(!best||v>best.v)best={v,lab:(s.elev?'COVER (HIGH ANGLE)':def.lab+' COVER'),prop:p};
  }
  return best;
}
function chipCover(prop,dmg){
  if(!prop||prop.dead||PROPDEF[prop.kind].hp===undefined)return;
  prop.hp-=dmg;
  if(prop.hp<=0){
    prop.dead=true;
    addFloater(prop.x,prop.y-24,'COVER DESTROYED',C.hazard);
    log('<span class="b">'+sc(PROPDEF[prop.kind].lab)+' shot to pieces</span> — that cover is gone.');
    for(let k=0;k<10;k++)parts.push({x:prop.x,y:prop.y,vx:(rng()-0.5)*160,vy:-rng()*90,r:2+rng()*3,a:0.6,col:'#6a5636',t0:performance.now(),dur:700});
    sThud();
  }
}
/* nav grid: coarse BFS with string-pulled smoothing, so any point in town
   can route to any other around the buildings */
const NAV_CS=40;
let NAV_W=0,NAV_H=0,navBlocked=null;
function navInit(){
  NAV_W=Math.ceil(W/NAV_CS);NAV_H=Math.ceil(H/NAV_CS);
  navBlocked=new Uint8Array(NAV_W*NAV_H);
  for(let cy=0;cy<NAV_H;cy++)for(let cx=0;cx<NAV_W;cx++){
    navBlocked[cy*NAV_W+cx]=ptBlocked(cx*NAV_CS+NAV_CS/2,cy*NAV_CS+NAV_CS/2,14)?1:0;
  }
}
function freeCellNear(x,y){
  const cx0=Math.min(NAV_W-1,Math.max(0,Math.floor(x/NAV_CS)));
  const cy0=Math.min(NAV_H-1,Math.max(0,Math.floor(y/NAV_CS)));
  if(!navBlocked[cy0*NAV_W+cx0])return cy0*NAV_W+cx0;
  for(let r=1;r<9;r++){
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      const cx=cx0+dx,cy=cy0+dy;
      if(cx<0||cy<0||cx>=NAV_W||cy>=NAV_H)continue;
      if(!navBlocked[cy*NAV_W+cx])return cy*NAV_W+cx;
    }
  }
  return -1;
}
function navPath(x0,y0,x1,y1){
  const s=freeCellNear(x0,y0),g=freeCellNear(x1,y1);
  if(s<0||g<0)return null;
  const prev=new Int32Array(NAV_W*NAV_H).fill(-1);
  prev[s]=s;
  let q=[s],found=(s===g);
  while(q.length&&!found){
    const nq=[];
    for(const c of q){
      const cx=c%NAV_W,cy=(c/NAV_W)|0;
      for(let dy=-1;dy<=1&&!found;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=cx+dx,ny=cy+dy;
        if(nx<0||ny<0||nx>=NAV_W||ny>=NAV_H)continue;
        const n=ny*NAV_W+nx;
        if(prev[n]!==-1||navBlocked[n])continue;
        if(dx&&dy&&(navBlocked[cy*NAV_W+nx]||navBlocked[ny*NAV_W+cx]))continue;
        prev[n]=c;
        if(n===g){found=true;break;}
        nq.push(n);
      }
      if(found)break;
    }
    q=nq;
  }
  if(!found)return null;
  const pts=[];
  for(let c=g;c!==s;c=prev[c])pts.push({x:(c%NAV_W)*NAV_CS+NAV_CS/2,y:((c/NAV_W)|0)*NAV_CS+NAV_CS/2});
  pts.reverse();
  pts.push({x:x1,y:y1});
  // string-pull: greedily skip to the furthest visible waypoint
  const out=[];
  let cur={x:x0,y:y0},i=0;
  while(i<pts.length){
    let j=pts.length-1;
    while(j>i&&segBlocked(cur.x,cur.y,pts[j].x,pts[j].y))j--;
    cur=pts[j];out.push(cur);i=j+1;
  }
  return out;
}
function pathFor(u,tx,ty){
  if(!segBlocked(u.x,u.y,tx,ty))return [{x:u.x,y:u.y},{x:tx,y:ty}];
  // one graceful detour first (keeps short hops curvy), then the nav grid
  const mx=(u.x+tx)/2,my=(u.y+ty)/2;
  const ang=Math.atan2(ty-u.y,tx-u.x)+Math.PI/2;
  for(const off of [90,-90,170,-170]){
    const wx=mx+Math.cos(ang)*off,wy=my+Math.sin(ang)*off;
    if(wx<20||wx>W-20||wy<20||wy>H-20)continue;
    if(ptBlocked(wx,wy,14))continue;
    if(!segBlocked(u.x,u.y,wx,wy)&&!segBlocked(wx,wy,tx,ty))return [{x:u.x,y:u.y},{x:wx,y:wy},{x:tx,y:ty}];
  }
  const p=navPath(u.x,u.y,tx,ty);
  if(!p)return null;
  return [{x:u.x,y:u.y},...p];
}
function pathLen(p){let L=0;for(let i=1;i<p.length;i++)L+=Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y);return L;}
function pathPoint(p,t){
  const L=pathLen(p);let want=L*t;
  for(let i=1;i<p.length;i++){
    const seg=Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y);
    if(want<=seg||i===p.length-1){
      const k=seg?Math.min(1,want/seg):1;
      return {x:p[i-1].x+(p[i].x-p[i-1].x)*k,y:p[i-1].y+(p[i].y-p[i-1].y)*k,
        ang:Math.atan2(p[i].y-p[i-1].y,p[i].x-p[i-1].x)};
    }
    want-=seg;
  }
  const e=p[p.length-1];return {x:e.x,y:e.y,ang:0};
}
function moveDest(u,px,py,r){
  // clamp to ring + push out of buildings/props/world edge
  let dx=px-u.x,dy=py-u.y;
  const d=Math.hypot(dx,dy)||1;
  if(d>r){dx*=r/d;dy*=r/d;}
  let tx=u.x+dx,ty=u.y+dy;
  tx=Math.max(24,Math.min(W-24,tx));ty=Math.max(24,Math.min(H-24,ty));
  for(let k=0;k<6&&ptBlocked(tx,ty,12);k++){
    const a=Math.atan2(ty-u.y,tx-u.x);
    tx-=Math.cos(a)*18;ty-=Math.sin(a)*18;
  }
  if(ptBlocked(tx,ty,12))return null;
  return {x:tx,y:ty};
}

/* ---------- logging & chatter ----------
   log() keeps the full record (behind "All reports") and feeds the short-lived
   comms stack under the minimap. Span classes: r rebel, h hostile, a action, g good, b danger, d quiet. */
const logWin=HUD.win(ROOT,{id:'logWin',title:'All reports',size:'sm',body:'<div class="sr-log" id="log"></div>'});
const logEl=byId('log');
const feed=HUD.comms(byId('comms'),{max:3,ttl:6000});
function feedKind(html){
  if(/\(comms\)/.test(html))return 'friend';
  const m=/class="([rhagbd])"/.exec(html);
  return m?({r:'friend',h:'foe',a:'action',g:'good',b:'bad',d:''})[m[1]]:'';
}
function log(html){
  const p=document.createElement('p');p.innerHTML=html;
  logEl.appendChild(p);
  while(logEl.children.length>90)logEl.removeChild(logEl.firstChild);
  if(!logWin.el.hidden)logWin.body.scrollTop=logWin.body.scrollHeight;
  feed.push(html,feedKind(html));
}
function openLog(){logWin.open();logWin.body.scrollTop=logWin.body.scrollHeight;}
function nameSpan(u){return '<span class="'+(u.side==='reb'||(u.veh&&u.owner==='reb')?'r':'h')+'">'+u.name+'</span>';}
function say(u,text,dur){
  if(!u||u.down||u.extracted)return;
  bubbles.push({unit:u,text,t0:performance.now(),dur:dur||3600});
  if(bubbles.length>4)bubbles.shift();
}
function sayRandom(u){if(u&&u.lines&&u.lines.length)say(u,u.lines[rint(0,u.lines.length-1)]);}
function addFloater(x,y,text,col){floaters.push({x,y,text,col,t0:performance.now()});}

/* ---------- d20 resolution ---------- */
function bestWeapon(s,t){
  let best=null,bp=-1;
  for(const w of wpnsOf(s)){
    if(!validShot(s,t,w))continue;
    s.wkey=w;
    const p=pctFor(needFor(computeTN(s,t).total,computeATK(s,t,w).total));
    if(p>bp){bp=p;best=w;}
  }
  return best;
}
function shieldBlocks(shooter,gunner){
  if(gunner.shield&&!gunner.down&&!gunner.mnt){
    const a0=Math.atan2(shooter.y-gunner.y,shooter.x-gunner.x);
    if(Math.abs(angNorm(a0-gunner.face))<1.0)return true;
  }
  // the turret's frontal plate: no shot lands from inside its facing arc
  if(!gunner.manning)return false;
  const a=Math.atan2(shooter.y-TURRET.y,shooter.x-TURRET.x);
  return Math.abs(angNorm(a-turret.face))<SHIELD_ARC;
}

/* ---------- critical injuries (see rebel-injury.js) ----------
   u.inj is [{k, treated}]. A critical hit on a rebel inflicts one; its combat effect lasts until a Treat Wound
   action patches it. Whatever was suffered is reported back so the base can run the recovery. */
const WDAM={},ONE_HAND=[];for(const k in WPN){WDAM[k]=WPN[k].dmg;if(WPN[k].oneHand)ONE_HAND.push(k);}
const TREAT_R=110;
const injOf=(u,k)=>!!u&&!!u.inj&&u.inj.some(i=>i.k===k&&!i.treated);
const hasInj=u=>!!u&&!!u.inj&&u.inj.some(i=>!i.treated);
const stunned=u=>injOf(u,'concussion');
const cantSprint=u=>!!u&&(u.nosprint||injOf(u,'brokenleg')||!!u.bot||!!u.mnt);
function inflictInjury(t,src,force){
  if(!t||t.side!=='reb'||t.auto||t.vip||t.caged||t.hp<=0)return null;
  const have=(t.inj||[]).map(i=>i.k);
  if(have.length>=3)return null;
  const def=force?Rebel.INJK[force]:Rebel.injRoll(src||'ballistic',rng,have);
  if(!def||have.includes(def.k))return null;
  (t.inj=t.inj||[]).push({k:def.k,treated:false});
  t.wound=1;
  addFloater(t.x,t.y-52,def.n.toUpperCase(),C.hazard);
  log(nameSpan(t)+' <span class="b">suffers '+def.n+'</span> <span class="d">— '+def.combat+'</span>');
  if(def.k==='concussion')t.order=null;
  else if(def.k==='brokenarm'){addFloater(t.x,t.y-66,'DROPS WEAPON',C.hazard);}
  else if(def.k==='internal'){t.maxhp0=t.maxhp;t.maxhp=Math.max(10,Math.round(t.maxhp*0.7));t.hp=Math.min(t.hp,t.maxhp);}
  else if(def.k==='spinal'||def.k==='maimed'){
    const keep=Math.max(1,t.hp);
    downUnit(t,null);
    t.hp=keep;t.hpSave=keep;t.downInj=1;   // down, but not shot to zero: a Treat Wound can stand them back up
  }
  return def;
}
/* who a Treat Wound could help right now: the incapacitated first, then the bleeding, then whoever is closest */
/* Treating a wound uses a Med Pack from the rebel's gadget slots (one pack, one action). Anyone can do it; a Combat
   Medic reaches further and makes one pack cover two wounds. */
const medic=u=>!!u&&u.spec==='medic';
function treatTarget(h){
  if(!h||h.down||stunned(h)||h.extracted||h.away)return null;
  const rank=x=>(x.down?0:stunned(x)?1:injOf(x,'bleeding')?2:3);
  const reach=medic(h)?TREAT_R*1.5:TREAT_R;
  const ok=x=>x.side==='reb'&&!x.auto&&!x.vip&&!x.mnt&&hasInj(x)&&(!x.down||x.downInj)&&!x.extracted&&!x.away&&(x===h?true:dist(h,x)<=reach);
  return U.filter(ok).sort((a,b)=>rank(a)-rank(b)||dist(h,a)-dist(h,b))[0]||null;
}
const treatPick=h=>h&&h.meds>0?treatTarget(h):null;
function doTreat(h){
  const t=treatPick(h);
  if(!t)return;
  const sev=['spinal','maimed','concussion','bleeding','internal','brokenleg','brokenarm','burns','shrapnel','eye','eardrum','facial'];
  const wasIncap=!!t.down||stunned(t);
  h.meds--;h.packsUsed=(h.packsUsed||0)+1;
  for(let n=medic(h)?2:1;n>0;n--){
    const inj=t.inj.filter(i=>!i.treated).sort((a,b)=>sev.indexOf(a.k)-sev.indexOf(b.k))[0];
    if(!inj)break;
    inj.treated=true;
    if(inj.k==='internal'&&t.maxhp0){t.maxhp=t.maxhp0;}
    if((inj.k==='spinal'||inj.k==='maimed')&&t.down&&t.downInj){
      t.down=0;t.downInj=0;t.hp=Math.max(t.hpSave||1,Math.round(t.maxhp*0.25));t.order=null;
    }
    t.wound=hasInj(t)?1:0;
    h.treats=(h.treats||0)+1;h.xpGain=(h.xpGain||0)+0.06;
    addFloater(t.x,t.y-52,'TREATED',C.go);
    log(nameSpan(h)+' <span class="g">treats '+(t===h?'their own':nameSpan(t)+'’s')+' '+Rebel.INJK[inj.k].n.toLowerCase()+'</span> <span class="d">— '+Rebel.INJK[inj.k].treat+'</span>');
  }
  if(wasIncap&&t!==h){h.rescued=h.rescued||[];const id=t.pid||t.id;if(h.rescued.indexOf(id)<0)h.rescued.push(id);}
}
function wpnsOf(s){
  if(s.manning)return ['laser'];
  if(s.veh)return [];
  if(s.mnt){const st=seatOf(s);return st&&st.wkey?[st.wkey]:[];}
  if(s.oneHand||injOf(s,'brokenarm')){const w=s.wpns.filter(x=>ONE_HAND.indexOf(x)>=0);return w.length?w:['unarmed'];}
  return s.wpns;
}
function validShot(s,t,wkey){
  if(t.side==='civ'||s.veh)return false;
  if(t.veh&&(t.owner===s.side||!crewIn(t).length))return false;   // an empty vehicle is scenery until someone climbs in
  if(t.mnt&&enclosed(t))return false;                              // shoot the vehicle, not the people inside
  if(stunned(s))return false;
  if(s.office||t.office)return false;
  if(!wpnsOf(s).includes(wkey))return false;
  if(wkey==='akli'&&s.jam)return false;
  if(t.down||t.surr||t.extracted||t.away)return false;
  if(dist(s,t)>WPN[wkey].rng)return false;
  if(losBlocked(s,t))return false;
  if(shieldBlocks(s,t))return false;
  return true;
}
function computeTN(s,t){
  const e=[];let v=t.def;
  e.push(['TARGET PROFILE',t.def,true]);
  const d=dist(s,t),w=WPN[s.wkey||wpnsOf(s)[0]];
  if(d>w.rng*0.7){v+=3;e.push(['LONG RANGE',3]);}
  else if(d>w.rng*0.4){v+=2;e.push(['RANGE',2]);}
  if(t.sprinted){v+=2;e.push(['SPRINTING',2]);}
  const cov=coverOf(s,t);
  if(cov){const cv=cov.v*(t.bunkered?2:1);v+=cv;e.push([t.bunkered?cov.lab+' ×2':cov.lab,cv]);}
  if(t.manning){v+=2;e.push(['GUN SHIELD EDGE',2]);}
  if(t.mnt){v+=HATCH_COVER;e.push(['VEHICLE HATCH',HATCH_COVER]);}
  if(coolStateG(t)==='cool'){v+=1;e.push(['TARGET COOL',1]);}
  if(coolStateG(t)==='panic'){v-=2;e.push(['TARGET PANICKING',-2]);}
  if(t.wound){v-=1;e.push([t.veh?'HULL DAMAGED':'TARGET WOUNDED',-1]);}
  if(t.frail){v-=1;e.push(['UNTRAINED',-1]);}
  if(t.side==='reb'&&(t.level||1)>=2){
    const xb=Math.min(3,Math.floor((t.level||1)/2));
    v+=xb;e.push(['COMBAT EXPERIENCE',xb]);
  }
  return {total:v,entries:e,cover:cov};
}
function computeATK(s,t,wkey,snap){
  const e=[];let v=0;const w=WPN[wkey];
  v+=s.aim;e.push(['TRIGGER SKILL',s.aim,true]);
  if(w.atk){v+=w.atk;e.push([w.name,w.atk]);}
  if(s.braced&&!snap){v+=2;e.push(['BRACED',2]);}
  if(s.ambush&&!snap){v+=2;e.push(['AMBUSH',2]);}
  if(coolStateG(s)==='cool'){v+=1;e.push(['COOL',1]);}
  if(dist(s,t)<130){v+=2;e.push(['POINT BLANK',2]);}
  if(snap){v-=2;e.push(['SNAP SHOT',-2]);}
  if(s.wound){v-=1;e.push(['WOUNDED',-1]);}
  if(s.inj&&s.inj.length){
    if(injOf(s,'eye')){v-=3;e.push(['EYE INJURY',-3]);}
    if(injOf(s,'burns')){v-=2;e.push(['BURNS',-2]);}
    if(injOf(s,'facial')){v-=2;e.push(['DAZED',-2]);}
  }
  if((s.tr&&s.tr.length)||s.ms||s.rivalEdge||s.rally||(s.rels&&s.rels.length)){
    if(hasT(s,'steady')){v+=1;e.push(['STEADY HANDS',1]);}
    if(hasT(s,'perfectionist')){v+=3;e.push(['PERFECTIONIST',3]);}
    if(s.braced&&hasT(s,'patient')){v+=2;e.push(['PATIENT',2]);}
    if(s.braced&&hasT(s,'restless')){v-=2;e.push(['RESTLESS',-2]);}
    if(t&&t.side==='law'&&hasT(s,'hegsoldier')){v+=2;e.push(['KNOWS THE HEGEMONY',2]);}
    if(s.wound&&hasT(s,'selfpres')){v-=1;e.push(['PROTECTING THEMSELVES',-1]);}
    if(hasT(s,'veteran')){v+=1;e.push(['VETERAN',1]);}
    if(hasT(s,'broken')){v-=2;e.push(['BROKEN',-2]);}
    if(wkey==='rocket'&&hasT(s,'firesupport')){v+=1;e.push(['HEAVY WEAPONS HAND',1]);}
    if(s.ms){v+=1;e.push(['MISSION SPECIALIST',1]);}
    if(t&&t.side==='law'){
      if(hasT(s,'nemesis')){v+=1;e.push(['HEGEMONY NEMESIS',1]);}
      if(hasT(s,'avenging')){v+=1;e.push(['AVENGING',1]);}
    }
    if(hasT(s,'laststanding')&&hostilesActive().length>=2*Math.max(1,U.filter(x=>x.side==='reb'&&!x.down&&!x.extracted&&!x.away&&!x.vip).length)){v+=2;e.push(['LAST ONE STANDING',2]);}
    if(relUp(s,['battlebros'])){v+=2;e.push(['BATTLE BROTHERS',2]);}
    else if(relUp(s,['oldfriends'])){v+=1;e.push(['OLD FRIENDS',1]);}
    if(s.rivalEdge){v+=1;e.push(['RIVALRY',1]);}
    if(s.rally){v+=2;e.push(['RALLIED',2]);}
    if(relUp(s,['owes'])){v+=1;e.push(['OWES A LIFE',1]);}
  }
  return {total:v,entries:e};
}
/* a natural 1 jams a jam-prone weapon (Neat Freak sometimes clears it); Clumsy can jam it any time */
function jamRoll(s,wkey,roll){
  if(!WPN[wkey].jam)return false;
  if(roll===1)return !(hasT(s,'neatfreak')&&rng()<0.25);
  return hasT(s,'clumsy')&&rng()<0.05;
}
function critRoll(roll,t){
  if(roll===20)return true;
  if(roll===19&&hasT(t,'unlucky'))return true;
  return roll>=18&&hasT(t,'reckless')&&t.reck>0;
}
function needFor(tn,atk){return Math.max(2,Math.min(19,tn-atk));}
function pctFor(need){return Math.round((21-need)/20*100);}
function rollDamage(s,t,wkey,crit){
  const w=WPN[wkey];
  let d=rint(w.d0,w.d1);
  if(w.falloff)d=Math.round(d*(1-0.55*Math.min(1,dist(s,t)/w.rng)));
  if(s&&s.side==='law'&&!s.sheriff)d=Math.round(d*0.85); // rank-and-file shoot to scare
  if(crit)d=Math.round(d*1.5);
  if(s&&s.tr&&s.tr.length){
    if(s.fuse>0&&hasT(s,'shortfuse'))d=Math.round(d*1.1);
    if(s.reck>0&&hasT(s,'reckless'))d=Math.round(d*1.2);
    if(t&&t.side==='law'&&hasT(s,'hegsoldier'))d=Math.round(d*1.05);
    if(t&&t.side==='law'&&hasT(s,'nemesis'))d=Math.round(d*1.05);
    if(t&&t.side==='law'&&hasT(s,'vengeful'))d=Math.round(d*1.1);
  }
  return d;
}
function applyShot(s,t,wkey,snap){
  // full resolution used by overwatch + AI fast paths; returns record
  const tn=computeTN(s,t),atk=computeATK(s,t,wkey,snap);
  const need=needFor(tn.total,atk.total);
  const roll=rint(1,20);
  sk(s,'aim',1);
  if(hasT(s,'hothead'))adjCoolG(s,3,'in the fight');
  const jammed=jamRoll(s,wkey,roll);
  const hit=!jammed&&(roll>=need);
  const crit=critRoll(roll,t);
  let dmg=0;
  if(jammed){
    s.jam=2;
    addFloater(s.x,s.y-40,'AKLI JAMMED',C.hazard);
    log(nameSpan(s)+'’s <span class="a">Akli jams</span> — cheap iron runs dirty.');
    if(s.side==='reb')say(s,'Jam! Clearing it — cover me!');
  } else if(hit){
    dmg=rollDamage(s,t,wkey,crit);
    if(tn.cover&&tn.cover.prop)dmg=Math.max(1,Math.round(dmg*0.75));
    woundUnit(s,t,dmg,crit,WDAM[wkey]);
  } else if(tn.cover&&tn.cover.prop){
    chipCover(tn.cover.prop,Math.round(rollDamage(s,t,wkey,false)*0.7));
  }
  return {tn,atk,need,roll,hit,crit,dmg,jammed};
}
function woundUnit(s,t,dmg,crit,dsrc){
  if(s&&s.side==='reb')s.xpGain=(s.xpGain||0)+0.04;
  sk(s,'aim',1);
  if(t.tr&&t.tr.length){
    if(hasT(t,'cautious'))dmg=Math.max(1,Math.round(dmg*0.9));
    if(t.hp-dmg<=0&&((hasT(t,'lucky')&&rng()<0.05)||(hasT(t,'luckyesc')&&rng()<0.03))){t.luckySaved=1;dmg=Math.max(0,t.hp-1);addFloater(t.x,t.y-64,'LUCKY',C.go);log(nameSpan(t)+' <span class="g">shrugs off a killing blow</span> <span class="d">(lucky)</span>.');}
    if(crit&&hasT(t,'selfpres')&&rng()<0.6)crit=false;
    if(hasT(t,'shortfuse'))t.fuse=2;
  }
  t.hp-=dmg;
  if(t.side==='reb')t.minHp=Math.min(t.minHp===undefined?1:t.minHp,Math.max(0,t.hp)/t.maxhp);
  sk(t,'con',dmg/10);
  dmgRound.add(t.id);
  adjCoolG(t,-16,'took a hit');
  if(crit&&t.hp>0){
    if(t.side==='reb'&&!t.auto&&!t.vip)inflictInjury(t,dsrc);
    else if(!t.wound&&t.veh){t.wound=1;addFloater(t.x,t.y-52,'DRIVE DAMAGED',C.hazard);log('The <b>'+t.name+'</b> is limping <span class="d">— a quarter off its speed</span>.');}
    else if(!t.wound){t.wound=1;t.aim=Math.max(0,t.aim-1);addFloater(t.x,t.y-52,'WOUNDED',C.hazard);}
  }
  addFloater(t.x,t.y-38,'-'+dmg,t.side==='reb'?C.hazard:C.goldHi);
  if(t.hp<=0)downUnit(t,s);
}
function downUnit(t,by){
  if(t.veh){vehDestroyed(t,by);return;}
  if(t.mnt)dismount(t,true);
  if(by&&by.side==='reb'&&t.side==='law'){by.xpGain=(by.xpGain||0)+0.2;by.kills=(by.kills||0)+1;}
  if(by)adjCoolG(by,12,'confirmed kill');
  for(const m of U)if(m.side===t.side&&m!==t)adjCoolG(m,-15,t.first+' down');
  if(t.side==='reb')for(const m of U)if(m.side==='reb'&&m!==t&&m.rels&&m.rels.some(r=>BONDS.indexOf(r[0])>=0&&r[1]===(t.pid||t.id))){addFloater(m.x,m.y-64,'HEARTBREAK',C.hazard);adjCoolG(m,-60,t.first+' down');}
  t.hp=0;t.down=1;t.order=null;t.braced=0;
  if(t.charge){
    t.charge=0;
    const heir=U.filter(u=>u.side==='reb'&&!u.down&&!u.extracted&&u.id!==t.id).sort((a,b)=>dist(a,t)-dist(b,t))[0];
    if(heir){heir.charge=1;log(nameSpan(heir)+' picks up the <b>explosive charge</b>.');}
  }
  if(t.manning){t.manning=0;turret.gunner=null;log('The <b>laser turret</b> stands unmanned.');}
  sThud();
  log(nameSpan(t)+' <span class="b">is down</span>'+(by?' — '+nameSpan(by)+'’s shot':'')+'.');
  addFloater(t.x,t.y-46,'DOWN',C.hazard);
  if(t.side==='law'){
    dropLoot(t);
    if(t.sheriff){
      log('<span class="a">The Sheriff is down.</span> Watch the deputies’ nerve.');
      const dep=U.find(u=>u.side==='law'&&!u.down&&!u.surr&&!u.sheriff);
      if(dep)say(dep,'Sheriff’s down… Sheriff’s DOWN!');
    }
  } else {
    const mate=U.find(u=>u.side==='reb'&&!u.down&&!u.extracted&&u.id!==t.id);
    if(mate)say(mate,t.first+'’s hit! '+t.first+' is down!');
  }
  checkDefeat();
}
/* a downed enemy leaves what they carried (the roster's kit, DESIGN_BLOCKERS M-24): every usable item, at the
   rules' enemy_drop_chance, plus the credits on them. Kit with no rules yet (live:false: batons, riot shields)
   and built-in weapons stay with the body. */
const DROP_CHANCE=SRDB.rules.enemy_drop_chance===undefined?1:SRDB.rules.enemy_drop_chance;
function dropLoot(t){
  if(t.vehicle)return;
  const items=(t.kit||[]).filter(id=>{const r=Items.get(id);return r&&r.category!=='builtin'&&r.live&&Math.random()<DROP_CHANCE;});
  const c=t.cr?rint(t.cr[0],t.cr[1]):0;
  if(!items.length&&!c)return;
  const what=items.map(Items.name);
  if(c)what.push(c+' ◈');
  lootMarks.push({id:'drop_'+t.id,x:t.x+10,y:t.y+10,label:t.name+'’s effects',drop:1,c,items,take:what.join(' + ')});
}

/* ---------- morale, alert, spotting ---------- */
function alertTown(why){
  if(town==='alerted')return;
  town='alerted';alertFlash=performance.now();
  if(fac&&!fac.detonated)fac.everAlerted=true;
  if(rs)rs.everAlerted=true;
  sAlert();
  log('<span class="b">The town is up.</span> '+why);
  const caller=U.find(u=>u.side==='law'&&!u.down&&!u.surr);
  if(caller&&caller.lines)say(caller,caller.lines[caller.lines.length-1]);
  const reeve=U.find(u=>u.id==='reeve');
  if(reeve&&!reeve.down)setTimeout(()=>sayRandom(reeve),1400);
  // townsfolk scatter or hit the dirt
  for(const c of U){
    if(c.side!=='civ'||c.extracted)continue;
    if(rng()<0.5){
      c.fleeing=1;
      const ex=c.x<W/2?30:W-30;
      setRt(c,ex,Math.max(60,Math.min(H-60,c.y+rint(-160,160))),170);
      if(!c.rtPath){c.fleeing=0;c.cower=1;}
    } else {c.cower=1;c.rtPath=null;}
  }
  if(phase==='FREE'){
    haltSquad();
    log('<span class="a">Time drops into rounds — plan every rebel’s move.</span>');
    startPlanning();
    return;
  }
  syncUI();
}
function startAmbush(t){
  // the attack action out of free move: everyone with a shot opens fire first
  const shooters=U.filter(s=>s.side==='reb'&&!s.down&&!s.extracted&&!s.away&&
    wpnsOf(s).some(w=>validShot(s,t,w)));
  if(!shooters.length)return false;
  haltSquad();
  for(const s of shooters)s.ambush=1;
  shooters.sort((a,b)=>initKey(b)-initKey(a));
  phase='ENGAGE'; // set before the alert so time doesn't skip straight to planning
  engageQ={list:shooters,idx:0,cur:null,nextAt:performance.now()+300,forceT:t};
  log('<span class="a">'+(shooters.length>1?'The squad opens':nameSpan(shooters[0])+' opens')+
    ' fire from ambush.</span>');
  alertTown('Rebel guns spoke first.');
  camGoal={x:t.x,y:t.y,z:Math.max(cam.z,0.95)};
  syncUI();
  return true;
}
function spotCheck(){
  if(town==='alerted')return;
  for(const l of U){
    if(l.side!=='law'||l.down||l.surr||l.office||!lookout(l))continue;
    const see=l.elev?460:320;
    for(const r of U){
      if(r.side!=='reb'||r.down||r.extracted||r.away)continue;
      if(dist(l,r)<see&&!losBlocked(l,r)){
        alertTown(nameSpan(l)+' spotted '+nameSpan(r)+'.');
        return;
      }
    }
  }
}
/* ---------- stealth & detection (free move) ---------- */
const VIS_ARC=0.95;
const NEAR_R=120,NEAR_SNEAK=70; // point-blank: noticed cone or no cone
function sightRange(l){return l.elev?520:360;}
function seesPoint(l,x,y,sneaking){
  const d=Math.hypot(x-l.x,y-l.y);
  if(d<(sneaking?NEAR_SNEAK:NEAR_R)&&!segBlocked(l.x,l.y,x,y))return 1;
  const R=sightRange(l)*(sneaking?0.55:1);
  if(d>R)return 0;
  if(Math.abs(angNorm(Math.atan2(y-l.y,x-l.x)-l.face))>VIS_ARC)return 0;
  if(segBlocked(l.x,l.y,x,y))return 0;
  return 1-d/R;
}
function detUpdate(dt){
  if(town!=='calm')return;
  for(const r of U){
    if(r.side!=='reb'||r.down||r.extracted||r.away)continue;
    let rate=0,seer=null;
    for(const l of U){
      if(l.side!=='law'||l.down||l.surr||l.office||!lookout(l))continue;
      const f=seesPoint(l,r.x,r.y,sneak);
      if(f>0){
        // quadratic in proximity: brushing past someone fills the eye fast
        const rr=(40+60*f+130*f*f)*(inCoverAt(r.x,r.y)?0.6:1);
        if(rr>rate){rate=rr;seer=l;}
      }
    }
    if(rate>0){r.det=Math.min(100,r.det+rate*dt);r.seer=seer;}
    else r.det=Math.max(0,r.det-38*dt);
    if(r.det>=100){
      alertTown(nameSpan(r.seer)+' made '+nameSpan(r)+'.');
      return;
    }
  }
}
/* ---------- fog of war ---------- */
const VIEW_R=560,FOG_SCALE=0.5;
let fogCv=null,fogCtx=null,memCv=null,memCtx=null,visPolys=[],visT=0,visUnits=new Set();
function fogInit(){
  fogCv=document.createElement('canvas');
  fogCv.width=Math.ceil(W*FOG_SCALE);fogCv.height=Math.ceil(H*FOG_SCALE);
  fogCtx=fogCv.getContext('2d');
  memCv=document.createElement('canvas');
  memCv.width=fogCv.width;memCv.height=fogCv.height;
  memCtx=memCv.getContext('2d');
  visPolys=[];visUnits=new Set();visT=0;
}
function castPoly(u){
  const pts=[];
  for(let i=0;i<=56;i++){
    const a=i/56*Math.PI*2;
    const ca=Math.cos(a),sa=Math.sin(a);
    const VR=VIEW_R*viewMul(u);
    let r=VR;
    for(let d=26;d<VR;d+=16){
      if(ptBlocked(u.x+ca*d,u.y+sa*d,0)){r=d+10;break;}
    }
    pts.push([u.x+ca*r,u.y+sa*r]);
  }
  return pts;
}
function updateVision(now){
  if(!SCN||!SCN.fog||!fogCtx)return;
  if(now-visT<130)return;
  visT=now;
  visPolys=[];
  const seers=U.filter(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&!u.csHide);
  for(const u of seers)visPolys.push(castPoly(u));
  memCtx.setTransform(FOG_SCALE,0,0,FOG_SCALE,0,0);
  memCtx.fillStyle='#fff';
  for(const p of visPolys){
    memCtx.beginPath();
    p.forEach((q,i)=>i?memCtx.lineTo(q[0],q[1]):memCtx.moveTo(q[0],q[1]));
    memCtx.closePath();memCtx.fill();
  }
  memCtx.setTransform(1,0,0,1,0,0);
  visUnits=new Set();
  for(const t of U){
    if(t.side==='reb'||(t.veh&&t.owner==='reb')){visUnits.add(t.id);continue;}
    for(const u2 of seers){
      if(dist(u2,t)<VIEW_R*viewMul(u2)&&!losBlocked(u2,t)){visUnits.add(t.id);break;}
    }
  }
  for(const m of lootMarks){
    if(m.taken||m.spotted)continue;
    for(const u2 of seers){
      if(Math.hypot(u2.x-m.x,u2.y-m.y)<VIEW_R*viewMul(u2)&&!segBlocked(u2.x,u2.y,m.x,m.y)){m.spotted=1;break;}
    }
  }
  if(engageQ&&engageQ.cur&&engageQ.cur.t&&engageQ.cur.t.id)visUnits.add(engageQ.cur.t.id);
}
function unitSeen(u){
  if(!SCN||!SCN.fog||phase==='CUTSCENE')return true;
  return u.side==='reb'||(u.veh&&u.owner==='reb')||visUnits.has(u.id);
}
function drawFog(){
  if(!SCN.fog||phase==='CUTSCENE'||!fogCtx)return;
  fogCtx.setTransform(1,0,0,1,0,0);
  fogCtx.globalCompositeOperation='source-over';
  fogCtx.clearRect(0,0,fogCv.width,fogCv.height);
  fogCtx.fillStyle=T.ROLE.fog;
  fogCtx.fillRect(0,0,fogCv.width,fogCv.height);
  fogCtx.globalCompositeOperation='destination-out';
  fogCtx.globalAlpha=0.55;
  fogCtx.drawImage(memCv,0,0);
  fogCtx.globalAlpha=1;
  fogCtx.setTransform(FOG_SCALE,0,0,FOG_SCALE,0,0);
  for(const p of visPolys){
    fogCtx.beginPath();
    p.forEach((q,i)=>i?fogCtx.lineTo(q[0],q[1]):fogCtx.moveTo(q[0],q[1]));
    fogCtx.closePath();fogCtx.fill();
  }
  fogCtx.setTransform(1,0,0,1,0,0);
  fogCtx.globalCompositeOperation='source-over';
  ctx.drawImage(fogCv,0,0,fogCv.width,fogCv.height,0,0,W,H);
}
function setSneak(on){
  if(sneak===on)return;
  tutFlags.sneaked=1;
  sneak=on;
  for(const u of U)if(u.side==='reb'&&u.rtPath)u.rtSpd=sneak?SNEAK_SPEED:RT_SPEED;
  log(sneak?'<span class="d">Squad goes low and slow — harder to spot, half the pace.</span>':
            '<span class="d">Squad moves upright — full pace, full profile.</span>');
  sTick();syncUI();
}
function coolStateG(u){return u.cool>=70?'cool':u.cool<=30?'panic':'steady';}
function adjCoolG(u,d,why){
  if(u&&(u.auto||u.veh))return;   // robots and machines do not panic
  if(!u||u.side==='civ'||u.down||u.surr||u.extracted||u.away)return;
  const pre=coolStateG(u);
  if(d<0&&u.nv)d=Math.round(d*u.nv);
  if(d<0&&u.tr&&u.tr.length){
    d=Rebel.nerveScale(d,k=>hasT(u,k));   // Brave and Cowardly, the same rule as in space
    if(hasT(u,'loyal')&&why&&/ down$/.test(why))d=Math.round(d*0.5);
    if(hasT(u,'panicky')&&why&&/ down$/.test(why))d=Math.round(d*1.3);
    if(hasT(u,'nearlydead')&&u.wound)d=Math.round(d*0.7);
    if(hasT(u,'broken'))d=Math.round(d*1.3);
  }
  u.cool=Math.max(0,Math.min(100,u.cool+d));
  if(u.sheriff)u.cool=Math.max(40,u.cool); // bosses do not break
  const post=coolStateG(u);
  if(pre!=='panic'&&post==='panic'){
    if(u.side==='reb')u.panics=(u.panics||0)+1;
    addFloater(u.x,u.y-52,'PANICKING',C.hazard);
    log(nameSpan(u)+' <span class="b">is panicking</span>'+(why?' <span class="d">('+why+')</span>':''));
    if(u.side==='reb'&&u.order&&u.order.type!=='lockin')u.order=null;
  }
  if(pre==='panic'&&post!=='panic'){addFloater(u.x,u.y-52,'STEADIED',C.go);sk(u,'pre',1);}
  else if(d<0&&post!=='panic')sk(u,'pre',0.25);
}
function moraleCheck(){
  const sheriffDown=U.some(u=>u.sheriff&&(u.down||u.surr));
  for(const u of U){
    if(u.side!=='law'||u.down||u.surr||u.sheriff||u.auto||u.mnt)continue;
    let broke=false;
    if(sheriffDown&&rint(1,20)+alliesUp('law')<13)broke=true;
    else if(u.hp<u.maxhp*0.3&&rint(1,20)<7)broke=true;
    if(broke){
      u.surr=1;u.order=null;u.braced=0;
      log(nameSpan(u)+' <span class="g">throws his gun down and surrenders.</span>');
      addFloater(u.x,u.y-46,'SURRENDERS',C.go);
      say(u,'Don’t shoot! I’m done, I’m done!');
    }
  }
  // a crew whose vehicle is burning bails out and fights on foot; the empty wreck-to-be is anyone's
  for(const v of U){
    if(!v.veh||v.down||v.owner!=='law'||v.hp>=v.maxhp*0.3)continue;
    const crew=crewIn(v).filter(c=>c.side==='law');
    if(!crew.length||rint(1,20)>=7)continue;
    for(const c of crew)dismount(c,true);
    addFloater(v.x,v.y-50,'CREW BAILS OUT',C.go);
    log('<span class="g">The '+v.name+'’s crew bail out</span> <span class="d">— it stands empty, and anyone can take it</span>.');
  }
}
function alliesUp(side){return U.filter(u=>u.side===side&&!u.down&&!u.surr).length;}
function hostilesActive(){return U.filter(u=>u.side==='law'&&!u.down&&!u.surr);}

/* ---------- law AI ---------- */
function coverPoints(){
  const out=[];
  for(const p of PROPS){
    if(PROPDEF[p.kind].cov<=0)continue;
    const r=PROPDEF[p.kind].r+22;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+0.4;
      const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;
      if(x>20&&x<W-20&&y>20&&y<H-20&&!ptBlocked(x,y,12))out.push({x,y});
    }
  }
  return out;
}
const COVER_PTS=[];
function aiPlan(){
  let turretClaimed=false;
  for(const v of U)if(v.veh){v.order=null;v.sprinted=0;v.owUsed=0;}
  for(const u of U){
    if(u.veh)continue;
    if((u.side!=='law'&&!u.ally)||u.down||u.surr||u.office)continue;
    u.order=null;u.sprinted=0;u.owUsed=0;u.goingTurret=0;u.wkey=wpnsOf(u)[0];u.bunkered=0;
    if(!u.manning)u.braced=0;
    // the transport's squad gets out once the alarm is up, then plans like anyone else on foot
    if(u.mnt&&town==='alerted'&&!lookout(u)){const v=vehOf(u);if(v&&!v.deployed)deployUnits(v);}
    if(u.mnt){aiCrew(u);continue;}
    if(coolStateG(u)==='panic'&&town==='alerted'){u.order={type:'lockin'};continue;}
    if(u.manning){u.order={type:'hold'};u.braced=1;continue;}
    if(u.fixed){u.order={type:'hold'};u.braced=1;continue;}
    if(!wpnsOf(u).length){u.order={type:'hold'};u.braced=1;continue;}
    if(u.ally&&town==='calm'){u.order=null;continue;}
    if(town==='calm'){
      if(u.patrol&&rng()<0.7){
        const p=u.patrol[rint(0,u.patrol.length-1)];
        const d=moveDest(u,p.x+rint(-30,30),p.y+rint(-30,30),MOVE_R);
        if(d&&pathFor(u,d.x,d.y)){u.order={type:'move',tx:d.x,ty:d.y};continue;}
      }
      u.order={type:'hold'};
      continue;
    }
    // alerted
    const targets=u.ally?U.filter(r=>r.side==='law'&&!r.down&&!r.surr&&!r.office):U.filter(r=>r.side==='reb'&&!r.down&&!r.extracted&&!r.away&&!(r.manning&&shieldBlocks(u,r)));
    if(!targets.length){u.order={type:'hold'};u.braced=1;continue;}
    // one guard runs for the empty turret
    if(u.guard&&!u.sheriff&&!turret.gunner&&!turretClaimed&&dist(u,TURRET)<620){
      turretClaimed=true;
      const near=dist(u,TURRET)<52;
      if(near){u.order={type:'man'};continue;}
      const seat=moveDest(u,TURRET.x,TURRET.y+6,SPRINT_R);
      if(seat&&pathFor(u,seat.x,seat.y)){
        u.order={type:'sprint',tx:seat.x,ty:seat.y};u.sprinted=1;u.goingTurret=1;
        continue;
      }
    }
    let tgt=targets[0],bd=1e9;
    for(const t of targets){
      let d=dist(u,t);
      if(u.sheriff&&t.id==='sera')d*=0.55;   // Reeve knows what they came for
      if(d<bd){bd=d;tgt=t;}
    }
    if(u.shield)u.face=Math.atan2(tgt.y-u.y,tgt.x-u.x);   // the riot shield always turns to the threat
    const w=WPN[wpnsOf(u)[0]];
    const inRng=dist(u,tgt)<=w.rng&&!losBlocked(u,tgt);
    const hurt=u.hp<u.maxhp*0.42;
    // guards fall back on the objective when the fight is elsewhere
    const GP=SCN.guardPt||PAD;
    if(u.guard&&!inRng&&!crossAway&&dist(u,GP)>260){
      const d=pickCoverMove(u,{x:GP.x,y:GP.y+40},SPRINT_R,true);
      if(d){u.order={type:'sprint',tx:d.x,ty:d.y};u.sprinted=1;continue;}
    }
    if(u.guard&&!inRng&&!crossAway&&dist(u,GP)<=260){u.order={type:'hold'};u.braced=1;continue;}
    if(inRng&&(!hurt||rng()<0.5)){
      if(rng()<(u.sheriff?0.35:0.5)){u.order={type:'hold'};u.braced=1;}
      else {
        // sidestep toward nearer cover, still shooting afterwards
        const d=pickCoverMove(u,tgt,MOVE_R,!hurt);
        u.order=d?{type:'move',tx:d.x,ty:d.y}:{type:'hold'};
        if(!d)u.braced=1;
      }
    } else {
      const r=u.sheriff?SPRINT_R:(rng()<0.5?SPRINT_R:MOVE_R);
      const d=pickCoverMove(u,tgt,r,!hurt);
      if(d){u.order={type:(r===SPRINT_R?'sprint':'move'),tx:d.x,ty:d.y};u.sprinted=(r===SPRINT_R)?1:0;}
      else u.order={type:'hold'},u.braced=1;
    }
  }
}
/* crew: the driver moves the vehicle into its gun's range, a gunner holds and fires, the bay waits */
function aiCrew(u){
  const v=vehOf(u),st=seatOf(u);
  if(!v||!st||v.down){u.order={type:'hold'};return;}
  if(coolStateG(u)==='panic'&&town==='alerted'){u.order={type:'lockin'};return;}
  if(!st.drive){u.order={type:'hold'};u.braced=st.wkey?1:0;return;}
  const reach=vehSpd(v);
  if(town==='calm'){
    if(v.patrol&&rng()<0.6){
      const p=v.patrol[rint(0,v.patrol.length-1)];
      const d=moveDest(v,p.x+rint(-30,30),p.y+rint(-30,30),reach*0.6);
      if(d&&pathFor(v,d.x,d.y)){u.order={type:'move',tx:d.x,ty:d.y};return;}
    }
    u.order={type:'hold'};return;
  }
  const hold=()=>{u.order={type:'hold'};u.braced=st.wkey?1:0;};
  const targets=U.filter(r=>r.side==='reb'&&!r.down&&!r.extracted&&!r.away);
  const gun=v.seats.find(x=>x.wkey&&x.occ);
  if(!targets.length||!gun)return hold();
  const GP=SCN.guardPt||PAD;
  if(v.guard&&!crossAway&&dist(v,GP)>320){
    const d=moveDest(v,GP.x,GP.y+60,reach);
    if(d&&pathFor(v,d.x,d.y)){u.order={type:'move',tx:d.x,ty:d.y};return;}
  }
  const tgt=targets.reduce((a,b)=>dist(v,b)<dist(v,a)?b:a);
  const R=WPN[gun.wkey].rng;
  if(dist(v,tgt)<=R*0.85&&!losBlocked(v,tgt)&&rng()<0.6)return hold();
  // close to a comfortable firing distance, not point blank
  const a=Math.atan2(v.y-tgt.y,v.x-tgt.x);
  const d=moveDest(v,tgt.x+Math.cos(a)*R*0.6,tgt.y+Math.sin(a)*R*0.6,reach);
  if(d&&Math.hypot(d.x-v.x,d.y-v.y)>30&&pathFor(v,d.x,d.y)){u.order={type:'move',tx:d.x,ty:d.y};return;}
  hold();
}
function pickCoverMove(u,tgt,r,toward){
  let best=null,bs=-1e9;
  const cand=COVER_PTS.slice();
  for(let i=0;i<8;i++){
    const a=rng()*Math.PI*2;
    cand.push({x:u.x+Math.cos(a)*r*0.8,y:u.y+Math.sin(a)*r*0.8});
  }
  for(const c of cand){
    if(Math.hypot(c.x-u.x,c.y-u.y)>r)continue;
    if(c.x<20||c.x>W-20||c.y<20||c.y>H-20||ptBlocked(c.x,c.y,12))continue;
    if(!pathFor(u,c.x,c.y))continue;
    const dNow=dist(u,tgt),dNew=Math.hypot(c.x-tgt.x,c.y-tgt.y);
    let s=toward?(dNow-dNew):(dNew-dNow);
    const covered=coverOf(tgt,{x:c.x,y:c.y,def:10,elev:0,sprinted:0,wound:0,frail:0,bunkered:0,cool:50});
    if(covered)s+=90;
    for(const g of nades)if(Math.hypot(c.x-g.x,c.y-g.y)<NADE_BLAST+24)s-=170; // nobody stands on a live grenade twice
    const w=WPN[u.wpns[0]];
    if(dNew<w.rng*0.9&&!segBlocked(c.x,c.y,tgt.x,tgt.y))s+=70;
    if(dNew<90)s-=120; // don't hug the enemy
    if(s>bs){bs=s;best=c;}
  }
  return best;
}

/* ---------- free move (real time, out of combat) ---------- */
function combatActive(){return town==='alerted'&&hostilesActive().length>0;}
function haltSquad(){for(const u of U){u.rtPath=null;}}
function unstick(u){
  if(!ptBlocked(u.x,u.y,0))return;
  for(let r=18;r<240;r+=18){
    for(let k=0;k<10;k++){
      const a=k*0.628+r;
      const x=u.x+Math.cos(a)*r,y=u.y+Math.sin(a)*r;
      if(x>20&&x<W-20&&y>20&&y<H-20&&!ptBlocked(x,y,6)){u.x=x;u.y=y;return;}
    }
  }
}
/* free move: a tap on a vehicle. Hostile crew: open fire. Ours with a free seat: the nearest rebel on foot climbs in.
   Ours and full: everyone gets out. */
function freeVehClick(v){
  if(v.down){camGoal=focusGoal(v);return;}
  const crew=crewIn(v);
  if(crew.some(c=>c.side==='law')){
    if(town==='calm'){if(!startAmbush(v))addFloater(v.x,v.y-30,'NO SHOT',C.text3);}
    else camGoal=focusGoal(v);
    return;
  }
  let best=null,bd=1e9;
  for(const u of U){
    if(u.side!=='reb'||u.id==='sera'||u.vip||!canEnter(u,v,1e9))continue;
    const d=dist(u,v);if(d<bd){bd=d;best=u;}
  }
  if(!best){
    const mine=crew.filter(c=>c.side==='reb');
    if(mine.length){for(const c of mine)dismount(c);sTick();syncUI();}
    else addFloater(v.x,v.y-30,'NOBODY CAN GET IN',C.text3);
    return;
  }
  if(canEnter(best,v)){mount(best,v);vehSync();syncUI();return;}
  best.goingVeh=v.id;best.goingTurret=0;setRt(best,v.x,v.y,sneak?SNEAK_SPEED:RT_SPEED);sTick();
  log(nameSpan(best)+' heads for the <b>'+v.name+'</b>.');
}
function freeAllOut(){
  for(const u of U)if(u.side==='reb'&&u.mnt)dismount(u);
  sTick();syncUI();
}
function setRt(u,tx,ty,spd){
  unstick(u);
  const d=moveDest(u,tx,ty,1e9)||{x:tx,y:ty};
  const p=pathFor(u,d.x,d.y);
  u.rtPath=p?p.slice(1):null;
  u.rtSpd=(spd||RT_SPEED)*speedMul(u);
}
function squadMoveTo(pt){
  if(tutFrozen())return;   // the simulation is frozen on a tutorial card: no orders until Got it
  tutFlags.moved=1;
  const offs=[[0,0],[36,20],[-32,28],[22,-32]];
  let i=0;
  for(const u of U){
    if(u.side!=='reb'||u.down||u.extracted||u.away||u.manning)continue;
    // a driver takes the vehicle; everyone else in a seat rides along
    let m=u;
    if(u.mnt){const st=seatOf(u);if(!st||!st.drive)continue;m=vehOf(u);}
    const o=offs[i%offs.length];i++;
    setRt(m,pt.x+o[0],pt.y+o[1],m.veh?RT_SPEED*vehSpd(m)/MOVE_R:sneak?SNEAK_SPEED:RT_SPEED);
    u.goingTurret=0;u.goingVeh=null;
  }
  rtPing={x:pt.x,y:pt.y,t0:performance.now()};
  sTick();
}
function lootsWithin(u,r){
  return lootMarks.filter(m=>!m.taken&&Math.hypot(u.x-m.x,u.y-m.y)<r);
}
function collectLoot(u,m){
  u.xpGain=(u.xpGain||0)+0.05;
  m.taken=true;sLoot();
  if(m.c)tally.c+=m.c;
  if(m.s)tally.s+=m.s;
  if(m.nades){NADES+=m.nades;}
  if(m.supply)supplyDrop(u);
  if(m.items)tally.items.push(...m.items);
  addFloater(m.x,m.y-30,'+ '+m.take,C.go);
  log(nameSpan(u)+' loots the <b>'+m.label+'</b> — <span class="g">'+m.take+'</span>.');
  syncUI();
}
function enterFree(msg){
  phase='FREE';
  selId=null;pickMode=null;engageQ=null;hotT=0;
  for(const g of nades.splice(0)){
    log('<span class="a">A primed BLAM cooks off in the quiet.</span>');
    explode(g.x,g.y,{r:NADE_BLAST,d0:32,d1:52});
  }
  for(const u of U){
    u.bunkered=0;
    u.cool=Math.max(u.cool,u.cool0);
    if(u.manning){u.braced=1;u.order={type:'hold'};u.path=null;u.rtPath=null;continue;}
    u.order=null;u.braced=0;u.sprinted=0;u.path=null;u.rtPath=null;
  }
  if(msg)log(msg);
  if(!freeHinted){
    freeHinted=true;
    log('<span class="d">'+(SR.touch?'Tap the ground':'Right-click (or tap the ground)')+' and the squad follows, scooping up anything lootable on the way. Gunfire drops time into rounds.</span>');
  }
  saveSnap();
  syncUI();
}
function manTurret(u){
  turret.gunner=u.id;u.manning=1;u.goingTurret=0;
  u.x=TURRET.x;u.y=TURRET.y;u.rtPath=null;u.path=null;
  u.braced=1;u.order={type:'hold'};u.face=turret.face;
  log(nameSpan(u)+' mans the <b>laser turret</b>.');
  addFloater(TURRET.x,TURRET.y-42,'TURRET MANNED',C.shield);
  sTick();syncUI();
}
function unmanTurret(u){
  turret.gunner=null;u.manning=0;u.braced=0;u.order=null;
  let ox=TURRET.x+Math.cos(turret.face+Math.PI)*44,oy=TURRET.y+Math.sin(turret.face+Math.PI)*44;
  const d=moveDest(u,ox,oy,60);
  if(d){u.x=d.x;u.y=d.y;}
  log(nameSpan(u)+' steps off the turret.');
  syncUI();
}
function workDone(){return WORK.every(w=>w.done);}
function workStep(wp,u){
  if(wp.rounds>1){
    wp.prog=(wp.prog||0)+1;wp.t=0;
    addFloater(wp.x,wp.y-46,(wp.id==='hack'?'HACK ':'WORK ')+Math.min(wp.prog,wp.rounds)+'/'+wp.rounds,C.shield);
    sSpark();
    if(wp.prog<wp.rounds){log(nameSpan(u)+' works the terminal \u2014 <span class="a">'+wp.prog+'/'+wp.rounds+'</span>.');syncUI();return;}
  }
  completeWork(wp,u);
}
function completeWork(wp,u){
  u.xpGain=(u.xpGain||0)+0.1;
  wp.done=true;wp.t=0;
  addFloater(wp.x,wp.y-30,'✓ '+wp.label,C.go);
  log(nameSpan(u)+' <span class="g">'+wp.verb+'</span>.');
  sSpark();
  if(wp.id==='flag'){
    log('<span class="g">The rebel signal snaps in the wind over Haven Rock.</span>');
    sBuildup();
    gameOver(true);
    return;
  }
  if(wp.id==='hack'){
    ix.hacked=true;
    addFloater(wp.x,wp.y-60,'DATA SECURED',C.go);
    log('<span class="g">The databank is cracked and the drive is in '+u.first+'\u2019s hand.</span> The trace is already running. Get out.');
    say(u,'Got it! Drive is in my hand, the trace is live!');
    sSpark();
    if(SCN.alarmWave)spawnFoes(SCN.alarmWave.foes,SCN.alarmWave.log);
    if(town==='calm')alertTown('The databank trace raises the alarm.');
    camGoal={x:LZ.x+240,y:LZ.y-160,z:0.85};
    syncUI();
    return;
  }
  if(wp.id==='release'){
    const v=U.find(x=>x.vip);
    if(v){
      v.caged=0;v.away=0;v.order=null;
      v.x=SCN.cage.dx;v.y=SCN.cage.dy+34;v.spawnX=v.x;v.spawnY=v.y;
      rs.released=true;
      addFloater(wp.x,wp.y-46,(SCN.releaseText?SCN.releaseText.float:v.first.toUpperCase()+' IS FREE'),C.go);
      log(SCN.releaseText?'<span class="g">'+SCN.releaseText.log+'</span>':'<span class="g">'+v.name+' is out of the cell.</span> Get them and the squad back to the Marta.');
      say(v,v.lines[0]);
    }
    syncUI();
    return;
  }
  if(wp.id==='plant'&&SCN.mode==='towers'){
    const method=u.device||'charge';
    u.charge=0;u.device=null;fac.planted=true;fac.method=method;fac.quiet=!fac.everAlerted;
    fac.detonated=true;fac.fx={t0:performance.now()};
    if(method==='charge'){
      addFloater(wp.x,wp.y-46,'TOWER DOWN',C.hazard);
      log('<span class="g">The charge drops the tower.</span> The compound goes dark. Back to the Marta.');
      explode(wp.x,wp.y-90,{r:SCN.blastR,d0:1,d1:2});
    } else {
      addFloater(wp.x,wp.y-46,'LIMPET ATTACHED',C.shield);
      log('<span class="g">The data limpet latches on.</span> The tower stays up and every packet it carries is ours. Back to the Marta.');
      sSpark();
    }
    say(u,method==='charge'?'Tower’s coming down. Move!':'We’re listening. Go quiet and go home.');
    if(town==='calm'&&method==='charge')alertTown('A comm tower is destroyed.');
    syncUI();
    return;
  }
  if(wp.id==='plant'){
    u.charge=0;fac.planted=true;
    addFloater(wp.x,wp.y-46,'CHARGE SET',C.hazard);
    log('<span class="a">The charge is set.</span> Get everyone out of the blast zone, then detonate.');
    say(u,'Charge is set. Clear the zone, then blow it.');
    syncUI();
    return;
  }
  tryLaunch();
  syncUI();
}
function sBuildup(){
  if(A.off())return;
  for(let i=0;i<4;i++)osc('triangle',220+i*110,180+i*110,0.12,0.4,i*0.16);
}
let launchNagged=false;
function tryLaunch(){
  if(crossAway)return;
  const sera=U.find(u=>u.id==='sera');
  if(!sera||sera.down)return;
  if(hot>=HOT_ROUNDS&&workDone())doCrossAway();
  else if(hot>=HOT_ROUNDS&&!launchNagged){
    launchNagged=true;
    log('<span class="a">The Cross is hot — but still shackled.</span> Clamps and fuel line before she flies.');
    say(sera,'She’s ready! Get those clamps and the fuel line off her!');
    syncUI();
  }
}
function checkBoss(){
  const r=U.find(u=>u.side==='law'&&u.office&&!u.down);
  if(!r||!SCN.bossTrigger)return;
  const tp=SCN.bossTrigger;
  const threat=U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&Math.hypot(u.x-tp.x,u.y-tp.y)<tp.r);
  const lastMan=alliesUp('law')===1;
  if(!threat&&!lastMan&&!crossAway)return;
  r.office=0;
  r.x=SCN.bossDoor.x;r.y=SCN.bossDoor.y;
  unstick(r);
  const near=U.find(u=>u.side==='reb'&&!u.down&&!u.extracted);
  if(near)r.face=Math.atan2(near.y-r.y,near.x-r.x);
  addFloater(r.x,r.y-46,SCN.bossFloat,C.hazard);
  log(SCN.bossLog);
  say(r,r.lines[r.lines.length-1],3600);
  if(town==='calm')alertTown(SCN.bossAlert);
  syncUI();
}
/* ---------- fire support ---------- */
function fsItems(){
  if(!FS)return [];
  const it=[];
  if(FS.drop&&!FS.dropUsed)it.push({key:'drop',name:'Supply Drop',sub:'lands as the next round begins · 5 stims, 2 BLAM, 2 rockets'});
  FS.ships.forEach((a,i)=>{
    if(a.state!=='ready')return;
    if(a.cassAir&&!tutFlags.fsCard)return;   // Cass stays off the menu until her tutorial card is up (A5)
    const nm=a.mode==='strafe'?'Strafing Run':a.mode==='doorgun'?'Door Gunner Cover':'Reinforcements';
    const sub=a.mode==='strafe'?'two taps: where the run starts, then its heading · hits at round end · danger close':
      a.mode==='doorgun'?'pick a zone: the hauler holds a high, wide orbit and the gunner works up to 3 enemies inside it · 2 passes · enemy rockets can bring it down':'lands '+a.soldiers.length+' soldier'+(a.soldiers.length===1?'':'s')+' at the start of the next planning';
    it.push({key:'s'+i,name:nm+' · '+a.name,sub});
  });
  (FS.vehicles||[]).forEach((a,i)=>{
    if(a.state!=='ready')return;
    it.push({key:'v'+i,name:(a.kind==='bot'?'Bot':'Vehicle')+' · '+a.name,
      sub:a.kind==='bot'?'set down where you call it at the start of the next planning · takes orders like a squad member':'set down empty where you call it at the start of the next planning · someone has to get in'});
  });
  return it;
}
function fsSeen(pt){return U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&!u.ally&&dist(u,pt)<VIEW_R&&!segBlocked(u.x,u.y,pt.x,pt.y));}
function fsPlace(key,pt){
  if(!fsSeen(pt)){addFloater(pt.x,pt.y-20,'NO VISUAL',C.text3);return false;}
  if(key==='drop'){
    FS.dropUsed=true;FS.orders.push({kind:'drop',x:pt.x,y:pt.y,landed:false});
    log('<span class="a">Supply drop called in.</span> It lands as the next round begins.');
    sTick();return true;
  }
  if(key[0]==='v'){
    const va=FS.vehicles[+key.slice(1)];
    if(!va)return true;
    va.state='called';FS.orders.push({kind:'vehicle',veh:+key.slice(1),x:pt.x,y:pt.y,at:round+1,done:false});
    log('<b>'+grafName()+'</b> <span class="d">(comms):</span> '+va.name+' is on the hook. Down at the start of the next planning.');
    sTakeoff();return true;
  }
  const i=+key.slice(1),a=FS.ships[i];
  if(!a)return true;
  if(a.mode==='doorgun'){
    a.state='active';a.left=2;a.mark={x:pt.x,y:pt.y};
    if(a.cassAir){
      tutFlags.fs=1;   // the Fire Support tutorial card is done once Cass is called (A4/A5)
      log('<b>Cass</b> <span class="d">('+a.name+'):</span> Door gun’s hot. Keep your heads down — I’ll hold a wide orbit over your mark, two passes.');
    } else log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> Zone marked. I’ll hold a wide orbit upstairs and the gun will work anything inside it — two passes.');
    sTakeoff();return true;
  }
  if(a.mode==='reinforce'){
    a.state='called';FS.orders.push({kind:'reinforce',ship:i,x:pt.x,y:pt.y,at:round+1,done:false});
    log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> Reinforcements inbound. Down at the start of the next planning.');
    sTakeoff();return true;
  }
  if(!fsDraft){fsDraft={key,x1:pt.x,y1:pt.y};sTick();return false;}
  const ang=Math.atan2(pt.y-fsDraft.y1,pt.x-fsDraft.x1);
  a.state='called';FS.orders.push({kind:'strafe',ship:i,x1:fsDraft.x1,y1:fsDraft.y1,ang,done:false});
  fsDraft=null;
  log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> Strafing run plotted. Keep your heads down at the end of the round.');
  sTakeoff();return true;
}
function fsExecute(){
  if(!FS)return;
  for(const o of FS.orders){
    if(o.kind!=='drop'||o.landed)continue;
    o.landed=true;FS.n++;
    lootMarks.push({id:'supply'+FS.n,x:o.x,y:o.y,label:'Supply drop',take:'5 stims · 2 BLAM · 2 rockets',supply:1,taken:false});
    addFloater(o.x,o.y-34,'SUPPLY DROP',C.go);sLand();
    log('<span class="g">The supply drop lands.</span> Somebody go and get it.');
  }
}
function supplyDrop(u){
  const crew=U.filter(x=>x.side==='reb'&&!x.down&&!x.extracted&&!x.away&&!x.auto&&!x.vip);
  if(!crew.length)return;
  for(let k=0;k<5;k++)crew[(crew.indexOf(u)<0?0:crew.indexOf(u)+k)%crew.length].stims++;
  NADES+=2;
  crew.slice(0,2).forEach(c=>{if(!c.wpns.includes('rocket'))c.wpns.push('rocket');});
  log('The crate holds <b>5 stims</b>, <b>2 BLAM frags</b> and <b>2 makeshift rocket launchers</b> (one shot each, anti-vehicle).');
}
/* up to 3 visible hostiles near the player's mark; the choice of where to put the mark is the skill */
const DG_ZONE=240;   // the circle the player places IS the kill zone: the gunner works what's inside it
const dgZone=()=>DG_ZONE*((SCN&&SCN.layoutK)||1);   // it grows with a scaled-up layout, like the rooms do
function dgTargets(mark){
  const seen=hostilesActive().filter(t=>unitSeen(t)&&U.some(r=>r.side==='reb'&&!r.down&&!r.away&&dist(r,t)<VIEW_R&&!losBlocked(r,t)));
  if(mark)return seen.filter(t=>Math.hypot(t.x-mark.x,t.y-mark.y)<dgZone())
    .sort((a,b)=>(Math.hypot(a.x-mark.x,a.y-mark.y))-(Math.hypot(b.x-mark.x,b.y-mark.y))).slice(0,3);
  const pick=[];
  while(pick.length<3&&seen.length)pick.push(seen.splice(rint(0,seen.length-1),1)[0]);
  return pick;
}
/* who gets to shoot back: any hostile on their feet with a rocket launcher near the orbit */
const DG_FLAK_TN=14;   // a shoulder rocket brings the gunship down on 14+
function dgFlakers(at){
  if(!at)return [];
  return U.filter(u=>u.side==='law'&&!u.down&&!u.surr&&!u.veh&&!u.mnt&&coolStateG(u)!=='panic'&&
    (u.wpns||[]).includes('rocket')&&Math.hypot(u.x-at.x,u.y-at.y)<700);
}
function dgShotDown(a){
  a.left=0;a.state='spent';a.downed=1;
}
/* reduced motion only: the pass resolves instantly, no fly-by — same rolls, same counterfire */
function dgAttack(a){
  const pick=dgTargets(a.mark);
  if(!pick.length)log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> No targets at the mark.');
  else{
    const t0=performance.now();
    for(const t of pick){
      const hit=rint(1,20)>=9;
      tracers.push({x1:t.x-260,y1:t.y-260,x2:t.x,y2:t.y,t0,dur:260,heavy:1});
      if(hit){const dmg=rint(16,28);woundUnit(null,t,dmg,false);log('The door gunner hits '+nameSpan(t)+' — <b>'+dmg+'</b>.');}
      else log('The door gunner misses '+nameSpan(t)+'.');
    }
    sShot('doorgun');
    for(const f of dgFlakers(a.mark||pick[0])){
      const hit=rint(1,20)>=DG_FLAK_TN;
      log(nameSpan(f)+' puts a rocket up at '+a.name+(hit?' — <span class="b">direct hit!</span>':' — it goes wide.'));
      if(hit){
        dgShotDown(a);
        log('<span class="b">'+a.name+' goes down</span> beyond the fight. '+a.pilot.first+' walks away from the wreck — the bird won’t fly again.');
        return;
      }
    }
  }
}
function dgSpend(a){
  a.left--;
  if(a.left<=0&&a.state!=='spent'){a.state='spent';log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> Door gunner is bingo. Breaking off.');}
}
/* ---------- the gun run: the gunship rolls in from off the map, orbits the player's mark with the
   heavy door gun working, then climbs away until its next pass. It plays as its own beat between
   the engagement and the next planning, under letterbox bars — and rocketeers get to answer. ---------- */
let dgRun=null,dgQueue=[];
const DG_TURNS=0.6;    // a long arc of the standoff circle per pass, not a tight circle over the zone
function dgOrbP(R,th){return {x:R.ax+Math.cos(th)*R.rad,y:R.ay+Math.sin(th)*R.rad*R.squash};}
function dgTan(R,th){return Math.atan2(Math.cos(th)*R.squash*R.dir,-Math.sin(th)*R.dir);}
/* the ship's place at any time: run-in along the tangent, the orbit, the climb-out — or the fall */
function dgShipPos(R,now){
  if(R.down){
    const k=Math.min(1,(now-R.down.t0)/R.down.dur);
    return {x:R.down.x+Math.cos(R.down.ang)*k*980,y:R.down.y+Math.sin(R.down.ang)*k*980,
      ang:R.down.ang,alt:R.alt*(1-k*k),k:-1,crash:k>=1};
  }
  const e=now-R.t0;
  const p0=dgOrbP(R,R.th0),tn0=dgTan(R,R.th0);
  if(e<=0)return {x:p0.x-Math.cos(tn0)*1050,y:p0.y-Math.sin(tn0)*1050,ang:tn0,alt:R.alt,k:-1,boost:1};
  if(e<R.IN){const k=e/R.IN,ke=k*(2-k);
    return {x:p0.x-Math.cos(tn0)*(1-ke)*1050,y:p0.y-Math.sin(tn0)*(1-ke)*1050,ang:tn0,alt:R.alt,k:-1,boost:1};}
  if(e<R.IN+R.ORBIT){const k=(e-R.IN)/R.ORBIT;const th=R.th0+R.dir*k*Math.PI*2*DG_TURNS;
    const p=dgOrbP(R,th);return {x:p.x,y:p.y,ang:dgTan(R,th),alt:R.alt,k};}
  const k2=Math.min(1,(e-R.IN-R.ORBIT)/R.OUT);const th1=R.th0+R.dir*Math.PI*2*DG_TURNS;
  const p1=dgOrbP(R,th1),tn1=dgTan(R,th1);
  return {x:p1.x+Math.cos(tn1)*k2*k2*1300,y:p1.y+Math.sin(tn1)*k2*k2*1300,ang:tn1,alt:R.alt,k:2,boost:1};
}
function dgNext(){
  const a=dgQueue.shift();
  if(!a){roundWrap();return;}
  const mark=a.mark;
  const pick=dgTargets(mark);
  if(!mark||!pick.length){
    log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> No targets at the mark.');
    dgSpend(a);dgNext();return;
  }
  const R={a,ax:mark.x,ay:mark.y,rad:780,squash:0.55,dir:rng()<0.5?1:-1,th0:rng()*Math.PI*2,
    IN:1100,ORBIT:3000,OUT:900,alt:235,t0:performance.now()+420,
    targets:pick.map((u,i)=>({u,at:0.16+i*0.28,done:0})),
    flak:dgFlakers(mark).map(u=>({u,at:0.12+rng()*0.55,state:'wait'})),
    apply:[],down:null,crashed:0,endAt:0};
  dgRun=R;
  if(phase==='EXEC')phase='ENGAGE';                   // hold the round open; execUpdate must not re-run
  byId('app').classList.add('cine');
  camGoal={x:R.ax,y:R.ay,z:0.75};
  log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> <span class="a">On the mark.</span> Rolling in — heads down.');
  sTakeoff();
  syncUI();
}
/* one working of the heavy door gun: five big slugs, pockmarks in the dirt, brass from altitude */
function dgBurst(R,u,now){
  const hit=rint(1,20)>=9;
  for(let i=0;i<5;i++){
    const ft=now+i*95;
    const S=dgShipPos(R,ft);
    const jx=u.x+(rng()-0.5)*(hit?22:64),jy=u.y+(rng()-0.5)*(hit?16:46);
    tracers.push({x1:S.x,y1:S.y-S.alt,x2:jx,y2:jy-6,t0:ft,dur:240,heavy:1});
    parts.push({x:S.x,y:S.y-S.alt,vx:0,vy:0,r:15,a:0.95,col:'#ffe9a8',t0:ft,dur:95,flash:1});
    if(hit&&i%2===0)hits.push({x:jx,y:jy-6,t0:ft+210,dur:300});
    if(i===2)boomFx.push({x:jx,y:jy,t0:ft+210,dur:380,R:30});
    for(let q=0;q<4;q++)parts.push({x:jx,y:jy,vx:(rng()-0.5)*120,vy:-rng()*90,r:2+rng()*2.5,a:0.6,col:'#8a7a60',t0:ft+210,dur:520});
    decals.push({x:jx+(rng()-0.5)*10,y:jy+(rng()-0.5)*8,r:7+rng()*5});
    casings.push({x:S.x,y:S.y-S.alt,vx:(rng()-0.5)*60,vy:30+rng()*50,t0:ft});
  }
  sShot('doorgun');
  R.apply.push({at:now+520,u,hit});
}
function dgUpdate(now){
  const R=dgRun;if(!R)return;
  if(phase==='GAMEOVER'){dgRun=null;dgQueue.length=0;byId('app').classList.remove('cine');return;}
  const P=dgShipPos(R,now);
  R.px=P.x;R.py=P.y;R.pang=P.ang;R.palt=P.alt;R.pk=P.k;R.pboost=!!P.boost;
  camGoal={x:R.ax+(P.x-R.ax)*0.32,y:R.ay+(P.y-R.ay)*0.32,z:0.7};
  if(R.down){
    // shedding fire and smoke all the way in
    parts.push({x:P.x+(rng()-0.5)*20,y:P.y-P.alt+(rng()-0.5)*14,vx:(rng()-0.5)*30,vy:-20-rng()*30,r:4+rng()*4,a:0.5,col:'#6a6a72',t0:now,dur:700});
    if(rng()<0.6)parts.push({x:P.x+(rng()-0.5)*14,y:P.y-P.alt,vx:(rng()-0.5)*40,vy:-rng()*20,r:2.5+rng()*2,a:0.8,col:'#ff9a3a',t0:now,dur:260,flash:1});
    if(P.crash&&!R.crashed){
      R.crashed=1;
      boomFx.push({x:P.x,y:P.y,t0:now,dur:800,R:120});
      decals.push({x:P.x,y:P.y,r:70});
      shake=now;sBoomBig();
      log('<span class="b">'+R.a.name+' goes in hard</span> beyond the fight. '+R.a.pilot.first+' walks away from the wreck — the bird won’t fly again.');
      R.endAt=now+1000;
    }
    if(R.endAt&&now>=R.endAt)dgFinish();
    return;
  }
  if(P.k>=0&&P.k<=1){
    for(const tg of R.targets){
      if(tg.done||P.k<tg.at)continue;
      tg.done=1;
      if(!tg.u.down&&!tg.u.surr)dgBurst(R,tg.u,now);
    }
    for(const f of R.flak){
      if(f.state!=='wait'||P.k<f.at)continue;
      if(f.u.down||f.u.surr){f.state='done';continue;}
      f.state='fly';f.t0=now;f.from={x:f.u.x,y:f.u.y};f.hit=rint(1,20)>=DG_FLAK_TN;
      f.dur=Math.max(550,Math.min(1200,Math.hypot(R.px-f.u.x,R.py-R.palt-f.u.y)/0.95));
      f.u.face=Math.atan2((R.py-R.palt)-f.u.y,R.px-f.u.x);
      addFloater(f.u.x,f.u.y-46,'ROCKET!',C.hazard);
      log(nameSpan(f.u)+' shoulders a rocket launcher and <span class="a">fires at '+R.a.name+'</span>!');
      sThud();
    }
  }
  for(const f of R.flak){
    if(f.state!=='fly')continue;
    const kf=(now-f.t0)/(f.dur||650);
    if(kf<1){
      const mx=lerp(f.from.x,R.px,kf),my=lerp(f.from.y,R.py-R.palt,kf);
      parts.push({x:mx,y:my,vx:(rng()-0.5)*14,vy:(rng()-0.5)*14,r:2.5+rng()*2,a:0.4,col:'#9a948c',t0:now,dur:420});
      continue;
    }
    f.state='done';
    if(f.hit&&!R.down){
      boomFx.push({x:R.px,y:R.py-R.palt,t0:now,dur:450,R:60});
      shake=now;
      R.down={t0:now,x:R.px,y:R.py,ang:R.pang,dur:1900};
      log('<span class="b">Direct hit!</span> <b>'+R.a.name+'</b> staggers in the air, trailing fire.');
    } else if(!f.hit){
      boomFx.push({x:R.px+(rng()-0.5)*90,y:R.py-R.palt-30-rng()*40,t0:now,dur:380,R:34});
      log('The rocket bursts wide — '+R.a.pilot.first+' jinks her through the smoke.');
    }
  }
  for(const ap of R.apply){
    if(ap.done||now<ap.at)continue;
    ap.done=1;
    if(ap.hit&&!ap.u.down){
      const dmg=rint(16,28);
      woundUnit(null,ap.u,dmg,false);
      log('The door gunner hits '+nameSpan(ap.u)+' — <b>'+dmg+'</b>.');
      shake=now;
    } else if(!ap.hit)log('The door gunner misses '+nameSpan(ap.u)+'.');
  }
  if(now-R.t0>R.IN+R.ORBIT+R.OUT+180)dgFinish();
}
function dgFinish(){
  const R=dgRun;if(!R)return;
  const a=R.a;dgRun=null;
  byId('app').classList.remove('cine');
  if(R.crashed)dgShotDown(a);
  else dgSpend(a);
  if(phase==='GAMEOVER')return;
  if(dgQueue.length)dgNext();else roundWrap();
}
function drawDgRun(now){
  const R=dgRun;if(!R||R.px===undefined)return;
  const alt=R.palt,x=R.px,y=R.py;
  // its shadow stays on the deck, closing under the ship as it loses height
  ctx.save();
  ctx.fillStyle='rgba(20,14,10,'+(0.3-0.14*(alt/R.alt))+')';
  ctx.beginPath();ctx.ellipse(x+alt*0.18,y+alt*0.24,88,30,0,0,7);ctx.fill();
  ctx.restore();
  const bank=R.down?Math.min(0.85,0.5+(now-R.down.t0)/R.down.dur*0.4):(R.pk>=0&&R.pk<=1?0.38:0.26);
  const bob=Math.sin(now/95)*3;
  SA.ship(ctx,'graf',x,y-alt+bob,R.pang,4.3,now/1000,
    {livery:'civ',boost:!R.down&&R.pboost,roll:bank,damage:R.down?0.85:0});
  // rockets on the way up
  for(const f of R.flak){
    if(f.state!=='fly')continue;
    const kf=Math.min(1,(now-f.t0)/(f.dur||650));
    const mx=lerp(f.from.x,x,kf),my=lerp(f.from.y,y-alt,kf);
    ctx.save();ctx.translate(mx,my);ctx.rotate(Math.atan2((y-alt)-f.from.y,x-f.from.x));
    ctx.fillStyle='#ffb347';ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-18,-4);ctx.lineTo(-18,4);ctx.closePath();ctx.fill();
    SA.util.rr(ctx,-9,-2.9,17,5.8,2.9);ctx.fillStyle='#d8dde8';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#1a1a22';ctx.stroke();
    ctx.restore();
  }
}
function strafeRun(o){
  const a=FS.ships[o.ship];a.state='spent';o.done=true;
  const t0=performance.now();
  for(let k=0;k<10;k++){
    const x=o.x1+Math.cos(o.ang)*k*90+(rng()-0.5)*70,y=o.y1+Math.sin(o.ang)*k*90+(rng()-0.5)*70;
    exploQ.push({x,y,at:t0+400+k*140,opt:{r:70,d0:28,d1:44}});
  }
  log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> <span class="a">Here she comes.</span> Strafing run!');
  sTakeoff();
  camGoal={x:o.x1+Math.cos(o.ang)*400,y:o.y1+Math.sin(o.ang)*400,z:0.8};
}
function fsRoundEnd(){
  if(!FS)return;
  for(const o of FS.orders)if(o.kind==='strafe'&&!o.done)strafeRun(o);
  for(const a of FS.ships){
    if(a.state!=='active')continue;
    if(HUD.reduced){dgAttack(a);dgSpend(a);continue;}  // reduced motion keeps the instant resolution
    dgQueue.push(a);                                   // the gun run plays as its own beat after the round's bookkeeping
  }
}
function mkSquadUnit(sp,x,y){
  return mkU({id:sp.id,pid:sp.id,name:sp.name,first:sp.first,side:'reb',x,y,hp:sp.hp||100,maxhp:sp.hp||100,aim:sp.aim||2,def:sp.def||12,cool:sp.cool||65,
    level:sp.level||1,tr:sp.tr||[],rels:sp.rels||[],ms:sp.ms||0,hero:sp.hero||0,nosprint:sp.nosprint||0,oneHand:sp.oneHand||0,cview:sp.cview||0,agi:sp.agi||1,nv:sp.nv||1,stims:sp.autoType?0:1,meds:sp.autoType?0:(sp.meds===undefined?1:sp.meds),packsUsed:0,spec:sp.spec||null,big:sp.big?1:0,heavy:sp.heavy?1:0,auto:sp.autoType?1:0,autoType:sp.autoType||null,hackRounds:0,
    wpns:sp.wpns||['akli','cowboy'],lines:REB_LINES[sp.id]||REB_LINES.generic,reinf:1});
}
/* a summoned vehicle or Bot: the transport sets it down where it was called */
function summonVehicle(va,x,y){
  let u;
  if(va.kind==='bot'){
    u=mkU({id:'veh_'+va.id,pid:va.id,name:va.name,first:va.first||va.name.split(' ')[0],side:'reb',x,y,hp:va.hp,maxhp:va.maxhp,aim:va.aim||2,def:va.def||8,cool:90,
      wpns:[va.wpn],auto:1,autoType:va.type,bot:va.type,big:va.big?1:0,stims:0,level:1,lines:va.lines||['We’re all in this together.'],asset:va.id});
  } else {
    u=mkVeh({id:'veh_'+va.id,veh:va.type,owner:'reb',name:va.name,x,y,asset:va.id});
    u.hp=Math.max(1,Math.round(u.maxhp*va.hp/va.maxhp));
  }
  const d=moveDest(u,x,y,120);if(d){u.x=d.x;u.y=d.y;}
  unstick(u);
  u.face=-Math.PI/2;U.push(u);
  va.uid=u.id;va.state='spent';
  sLand();
  addFloater(u.x,u.y-44,va.kind==='bot'?'BOT DOWN':'VEHICLE DOWN',C.go);
  log('<span class="g">The '+va.name+' is down'+(va.kind==='bot'?' and walking.':'. Somebody get in it.')+'</span>');
  return u;
}
function fsPlanStart(){
  if(!FS)return;
  for(const o of FS.orders){
    if(o.kind!=='vehicle'||o.done||o.at>round)continue;
    o.done=true;
    summonVehicle(FS.vehicles[o.veh],o.x,o.y);
  }
  for(const o of FS.orders){
    if(o.kind!=='reinforce'||o.done||o.at>round)continue;
    o.done=true;
    const a=FS.ships[o.ship];a.state='spent';
    a.soldiers.forEach((sp,j)=>{
      const u=mkSquadUnit(sp,o.x+(j-(a.soldiers.length-1)/2)*40,o.y+30);
      const d=moveDest(u,u.x,u.y,120);if(d){u.x=d.x;u.y=d.y;}
      u.face=-Math.PI/2;U.push(u);
    });
    sLand();
    addFloater(o.x,o.y-40,'REINFORCEMENTS',C.go);
    log('<span class="g">'+a.name+' sets down and '+a.soldiers.length+' soldier'+(a.soldiers.length===1?'':'s')+' pile out.</span>');
  }
}
function drawFS(now){
  if(!FS)return;
  for(const o of FS.orders){
    if(o.done||(o.kind==='drop'&&o.landed))continue;
    ctx.save();
    if(o.kind==='strafe'){
      ctx.strokeStyle=T.rgba(C.hazard,0.75);ctx.lineWidth=3;ctx.setLineDash([16,10]);
      ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x1+Math.cos(o.ang)*900,o.y1+Math.sin(o.ang)*900);ctx.stroke();ctx.setLineDash([]);
      plb('STRAFING RUN',o.x1,o.y1-18,C.hazard,12);
    } else {
      ctx.strokeStyle=T.rgba(C.shield,0.5+0.3*Math.sin(now*0.006));ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(o.x,o.y,26,0,7);ctx.stroke();
      plb(o.kind==='drop'?'DROP':o.kind==='vehicle'?'VEHICLE':'REINFORCE',o.x,o.y-38,C.shield,12);
    }
    ctx.restore();
  }
  if(fsDraft){
    ctx.save();ctx.fillStyle=C.hazard;ctx.beginPath();ctx.arc(fsDraft.x1,fsDraft.y1,6,0,7);ctx.fill();ctx.restore();
  }
  // the zone preview while the player is still picking where the door gunner works (A5)
  if(pickMode&&pickMode.startsWith('fs:s')&&hoverW){
    const a=FS.ships[+pickMode.slice(4)];
    if(a&&a.mode==='doorgun'){
      ctx.save();
      const dz=dgZone();
      ctx.strokeStyle=T.rgba(C.gold,0.8);ctx.lineWidth=2.5;ctx.setLineDash([10,8]);
      ctx.beginPath();ctx.ellipse(hoverW.x,hoverW.y,dz,dz*0.55,0,0,7);ctx.stroke();ctx.setLineDash([]);
      ctx.restore();
    }
  }
  for(const a of FS.ships){
    if(a.state!=='active'||!a.mark)continue;
    ctx.save();
    const dz=dgZone();
    ctx.strokeStyle=T.rgba(C.shield,0.45+0.25*Math.sin(now*0.006));ctx.lineWidth=2.5;ctx.setLineDash([10,8]);
    ctx.beginPath();ctx.ellipse(a.mark.x,a.mark.y,dz,dz*0.55,0,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=T.rgba(C.shield,0.05);ctx.fill();
    plb('DOOR GUNNER COVER',a.mark.x,a.mark.y-dz*0.55-14,C.shield,12);
    ctx.restore();
  }
}
/* ---------- hacking Autos (Field Technician) ----------
   A Field Technician within range and in line of sight can hack an enemy Auto (Policebot, Bruiser,
   Strider). It takes 1-3 rounds, or ~4 real seconds a round in free move. A hacked Auto fights for
   us on its own; if it survives and extracts it joins the roster. */
const HACK_R=300;
let hackArm=false;
/* fire support: Supply Drop, Strafing Run, Door Gunner, Reinforcements (World in Conflict style) */
let FS=null,fsMenuOn=false,fsDraft=null;
function canHack(s,t){
  return !!(s&&t&&s.spec==='fieldtech'&&!s.down&&!s.extracted&&!s.away&&!s.manning&&!s.mnt&&
    t.side==='law'&&t.auto&&t.hackRounds&&!t.down&&!t.surr&&dist(s,t)<=HACK_R&&!losBlocked(s,t));
}
function hackTargets(s){return U.filter(t=>canHack(s,t));}
function hackFlip(s,t){
  t.side='reb';t.ally=1;t.hacked=1;t.order=null;t.hackProg=0;t.braced=0;t.path=null;t.rtPath=null;t.guard=0;t.patrol=null;
  addFloater(t.x,t.y-50,'HACKED',C.shield);
  log(nameSpan(s)+' <span class="g">takes control of</span> <b>'+t.name+'</b>. It fights for us now.');
  say(s,t.first+' is ours.');
  sSpark();
  s.xpGain=(s.xpGain||0)+0.15;
  s.order=null;s.hackTid=null;
  syncUI();
}
function hackResolve(){
  for(const t of U)t.hackedNow=0;
  for(const u of U){
    if(u.side!=='reb'||!u.order||u.order.type!=='hack')continue;
    const t=U.find(x=>x.id===u.order.tid);
    if(u.down||!t||!canHack(u,t)){u.order=null;continue;}
    t.hackedNow=1;
    t.hackProg=(t.hackProg||0)+1;
    addFloater(t.x,t.y-50,'HACK '+Math.min(t.hackProg,t.hackRounds)+'/'+t.hackRounds,C.shield);
    if(t.hackProg>=t.hackRounds)hackFlip(u,t);
    else log(nameSpan(u)+' works on <b>'+t.name+'</b> — <span class="a">'+t.hackProg+'/'+t.hackRounds+'</span>.');
  }
  for(const t of U)if(t.hackProg>0&&!t.hackedNow&&t.side==='law')t.hackProg=0;
}
function startFreeHack(t){
  const tech=U.find(x=>canHack(x,t));
  hackArm=false;
  if(!tech){addFloater(t.x,t.y-40,'NO TECH IN RANGE',C.text3);syncUI();return;}
  tech.hackTid=t.id;t.hackT=0;tech.rtPath=null;
  log(nameSpan(tech)+' starts hacking <b>'+t.name+'</b>. Hold position.');
  syncUI();
}
function hackFreeStep(dt){
  for(const s of U){
    if(!s.hackTid)continue;
    const t=U.find(x=>x.id===s.hackTid);
    if(!t||!canHack(s,t)||s.rtPath){if(t)addFloater(t.x,t.y-50,'HACK BROKEN',C.hazard);s.hackTid=null;if(t)t.hackProg=0;continue;}
    t.hackT+=dt;
    if(t.hackT>=4){
      t.hackT=0;t.hackProg++;
      addFloater(t.x,t.y-50,'HACK '+Math.min(t.hackProg,t.hackRounds)+'/'+t.hackRounds,C.shield);
      if(t.hackProg>=t.hackRounds)hackFlip(s,t);
    }
  }
}
/* ---------- Steal Fuel objectives ---------- */
function fuelGuards(){return U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&dist(u,PAD)<PAD.r+40);}
function fuelReach(){
  if(!fs||fs.reached)return;
  if(U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&dist(u,PAD)<PAD.r+70)){
    fs.reached=true;
    addFloater(PAD.x,PAD.y-70,'DEPOT REACHED',C.go);
    log('<span class="g">The squad is at the pumps.</span> Call the Marta down onto the apron when you are ready.');
    const lead=U.find(u=>u.side==='reb'&&!u.down);
    if(lead)say(lead,'Pumps are right there. Call her in.');
    sTick();syncUI();
  }
}
function callTransport(){
  if(!fs||!fs.reached||fs.called||phase==='CUTSCENE'||phase==='EXTRACT'||phase==='GAMEOVER')return;
  fs.called=true;
  fs.flying={t0:performance.now(),dur:3800,from:{x:grafPos.x,y:grafPos.y}};
  grafState='flying';
  sTakeoff();
  log('<b>'+grafName()+'</b> <span class="d">(comms):</span> Inbound to the apron. Keep it clear, I do not land on people.');
  syncUI();
}
function fuelUpdate(now){
  if(!fs||!fs.flying)return;
  const t=Math.min(1,(now-fs.flying.t0)/fs.flying.dur),e=ease(t);
  grafPos.x=lerp(fs.flying.from.x,PAD.x-40,e);
  grafPos.y=lerp(fs.flying.from.y,PAD.y,e);
  grafPos.a=lerp(0.12,-0.2,e);
  if(t>=1){
    fs.flying=null;fs.landed=true;grafState='landed';
    sLand();shake=now;
    for(let i=0;i<26;i++)parts.push({x:PAD.x+(rng()-0.5)*220,y:PAD.y+(rng()-0.5)*170,vx:(rng()-0.5)*180,vy:-rng()*40,r:3+rng()*5,a:0.5,col:'#b09a78',t0:now,dur:900});
    log('<span class="g">The Marta is down on the apron and the fuel lines are out.</span> Hold the pumps: '+FUEL_ROUNDS+' rounds.');
    camGoal={x:PAD.x-100,y:PAD.y+40,z:0.85};
    alertTown('The Marta’s engines wake the whole depot.');
  }
}
function spawnFoes(list,msg){
  for(const u of expandUnits(list.map(f=>Object.assign({},f)))){
    u.face=Math.PI;u.wave=1;
    U.push(u);
  }
  if(msg){log(msg);sAlert();}
}
function fuelPumpStep(){
  if(!fs||!fs.landed||fs.done)return;
  if(!fuelGuards()){
    addFloater(PAD.x,PAD.y-60,'PUMPS STALLED — NO ONE ON THE APRON',C.hazard);
    return;
  }
  fs.pump++;
  addFloater(PAD.x,PAD.y-60,'FUEL '+Math.min(fs.pump,FUEL_ROUNDS)+'/'+FUEL_ROUNDS,C.shield);
  sSpark();
  for(const w of (SCN.waves||[])){
    if(w.at!==fs.pump)continue;
    spawnFoes(w.foes,w.log);
  }
  if(fs.pump>=FUEL_ROUNDS){
    fs.done=true;
    addFloater(PAD.x,PAD.y-88,'TANKS FULL',C.go);
    log('<span class="g">The Marta’s tanks are full.</span> '+(hostilesActive().length?'Clear the apron, then everyone aboard.':'Everyone aboard.'));
    const lead=U.find(u=>u.side==='reb'&&!u.down);
    if(lead)say(lead,'That is her full! Everybody on the ramp!');
  } else log('Fuel pumping — <span class="a">'+fs.pump+'/'+FUEL_ROUNDS+'</span>.');
  syncUI();
}
/* ---------- Blow Up Auto Factory ---------- */
function facUnsafe(){
  const c={x:SCN.plant.bx,y:SCN.plant.by};
  return U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&dist(u,c)<SCN.safeR);
}
function facDetonate(){
  if(!fac||!fac.planted||fac.detonated)return;
  if(phase==='CUTSCENE'||phase==='EXTRACT'||phase==='GAMEOVER')return;
  if(facUnsafe()){
    addFloater(SCN.plant.bx,SCN.plant.by-130,'TOO CLOSE \u2014 CLEAR THE BLAST ZONE',C.hazard);
    log('<span class="a">Too close.</span> Everyone out of the blast zone before you detonate.');
    return;
  }
  fac.quiet=!fac.everAlerted;
  fac.detonated=true;fac.fx={t0:performance.now()};
  log('<span class="g">The charge goes up.</span> The Power Plant tears itself apart and the whole Autoworks goes dark.');
  explode(SCN.plant.bx,SCN.plant.by,{r:SCN.blastR,d0:80,d1:120});
  camGoal={x:SCN.plant.bx-80,y:SCN.plant.by+120,z:0.8};
  const lead=U.find(u=>u.side==='reb'&&!u.down);
  if(lead)say(lead,'Plant\u2019s gone! Back to the Marta!');
  if(SCN.detWave)spawnFoes(SCN.detWave.foes,SCN.detWave.log);
  if(town==='calm')alertTown('The Autoworks goes dark.');
  syncUI();
}
function drawCage(now){
  if(!rs)return;
  const c=SCN.cage;
  ctx.save();
  ctx.fillStyle='rgba(10,12,16,0.5)';ctx.fillRect(c.x,c.y,c.w,c.h);
  ctx.strokeStyle=rs.released?'rgba(125,217,123,0.5)':'rgba(200,170,120,0.85)';ctx.lineWidth=3;
  ctx.strokeRect(c.x,c.y,c.w,c.h);
  if(!rs.released){
    ctx.lineWidth=2;
    for(let x=c.x+20;x<c.x+c.w;x+=20){ctx.beginPath();ctx.moveTo(x,c.y);ctx.lineTo(x,c.y+c.h);ctx.stroke();}
  }
  ctx.restore();
  plb(c.label||'DETENTION',c.x+c.w/2,c.y-14,C.text2,12);
}
function drawFactory(now){
  if(!fac)return;
  const P=SCN.plant;
  if(SCN.mode==='towers'){
    const down=fac.method==='charge';
    ctx.save();
    ctx.translate(P.bx,P.by);
    ctx.strokeStyle=down?'rgba(120,110,100,0.6)':'rgba(190,205,225,0.9)';ctx.lineWidth=3;
    if(down){ctx.beginPath();ctx.moveTo(-70,70);ctx.lineTo(10,40);ctx.moveTo(-40,70);ctx.lineTo(40,52);ctx.stroke();}
    else{
      ctx.beginPath();ctx.moveTo(-30,70);ctx.lineTo(0,-110);ctx.lineTo(30,70);ctx.moveTo(-22,30);ctx.lineTo(22,30);ctx.moveTo(-14,-30);ctx.lineTo(14,-30);ctx.moveTo(-30,70);ctx.lineTo(22,30);ctx.lineTo(-14,-30);ctx.moveTo(30,70);ctx.lineTo(-22,30);ctx.lineTo(14,-30);ctx.stroke();
      const on=fac.method==='limpet'?'#7de3ec':(Math.sin(now*0.006)>0?'#ff4f4f':'#5a2a2a');
      ctx.fillStyle=on;ctx.beginPath();ctx.arc(0,-112,6,0,7);ctx.fill();
    }
    ctx.restore();
  }
  if(fac.planted&&!fac.detonated){
    ctx.save();
    ctx.strokeStyle=T.rgba(C.hazard,0.45+0.25*Math.sin(now*0.008));ctx.lineWidth=3;ctx.setLineDash([14,10]);
    ctx.beginPath();ctx.arc(P.bx,P.by,SCN.safeR,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=T.rgba(C.hazard,0.06);ctx.beginPath();ctx.arc(P.bx,P.by,SCN.safeR,0,7);ctx.fill();
    ctx.restore();
    plb('BLAST ZONE',P.bx,P.by-SCN.safeR+22,C.hazard,13);
  }
  if(fac.detonated){
    ctx.save();
    ctx.fillStyle='rgba(8,6,4,0.55)';ctx.fillRect(P.x,P.y,P.w,P.h);
    const g=ctx.createRadialGradient(P.bx,P.by,10,P.bx,P.by,P.w*0.7);
    g.addColorStop(0,'rgba(255,140,60,'+(0.35+0.15*Math.sin(now*0.01))+')');g.addColorStop(1,'rgba(255,140,60,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(P.bx,P.by,P.w*0.7,0,7);ctx.fill();
    ctx.restore();
    plb(fac.method==='limpet'?'TAPPED':'OFFLINE',P.bx,P.by+4,fac.method==='limpet'?C.shield:C.text2,14);
    if(rng()<0.25)parts.push({x:P.x+rng()*P.w,y:P.y+rng()*P.h,vx:(rng()-0.5)*30,vy:-30-rng()*40,r:4+rng()*6,a:0.35,col:'#3a3430',t0:now,dur:1600});
  }
}
function extractReady(){
  if(ix)return ix.hacked&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away);
  if(rs)return rs.released&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away);
  if(fac)return fac.detonated&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted);
  if(fs)return fs.done&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted);
  return crossAway&&hostilesActive().length===0&&
    U.some(u=>u.side==='reb'&&u.id!=='sera'&&!u.down&&!u.extracted);
}
function rtStep(u,dt){
  if(!u.rtPath||!u.rtPath.length)return;
  let remain=(u.rtSpd||RT_SPEED)*dt;
  while(remain>0&&u.rtPath&&u.rtPath.length){
    const nxt=u.rtPath[0];
    const dx=nxt.x-u.x,dy=nxt.y-u.y;
    const d=Math.hypot(dx,dy);
    if(d<=remain){u.x=nxt.x;u.y=nxt.y;u.rtPath.shift();remain-=d;}
    else {u.x+=dx/d*remain;u.y+=dy/d*remain;u.face=Math.atan2(dy,dx);remain=0;}
  }
  if(u.rtPath&&!u.rtPath.length)u.rtPath=null;
}
function rtUpdate(now,dt){
  for(const u of U){
    if(u.down||u.surr||u.extracted||u.away||u.mnt)continue;   // the crew ride
    if(u.veh){
      if(u.owner==='law'&&town==='calm'&&crewIn(u).some(c=>c.side==='law'&&lookout(c))){
        // a crewed patrol car drifts its beat and the crew sweep their eyes
        if(u.rtPath){rtStep(u,dt);u.baseFace=undefined;}
        else {
          if(u.baseFace===undefined)u.baseFace=u.face;
          u.scanT+=dt;u.face=u.baseFace+Math.sin(u.scanT*0.4)*0.6;
          if(u.patrol&&rng()<0.003){const p=u.patrol[rint(0,u.patrol.length-1)];setRt(u,p.x+rint(-26,26),p.y+rint(-26,26),90);}
        }
      } else if(u.rtPath)rtStep(u,dt);
      continue;
    }
    if(u.side==='reb'&&!u.manning){
      rtStep(u,dt);
      if(u.goingTurret&&!u.rtPath){
        u.goingTurret=0;
        if(!turret.gunner&&dist(u,TURRET)<52)manTurret(u);
      }
      if(u.goingVeh&&!u.rtPath){
        const v=U.find(x=>x.id===u.goingVeh);u.goingVeh=null;
        if(v&&canEnter(u,v,ENTER_R+20)){mount(u,v);vehSync();syncUI();}
      }
    }
    else if(u.side==='law'&&phase==='FREE'&&!u.fixed&&!u.manning&&town==='calm'){
      // lawmen drift their beats and sweep their eyes in real time
      if(u.rtPath){rtStep(u,dt);u.baseFace=undefined;}
      else {
        if(u.baseFace===undefined)u.baseFace=u.face;
        u.scanT+=dt;
        u.face=u.baseFace+Math.sin(u.scanT*0.55)*0.85;
        if(u.patrol&&rng()<0.003){
          const p=u.patrol[rint(0,u.patrol.length-1)];
          setRt(u,p.x+rint(-26,26),p.y+rint(-26,26),58);
        }
      }
    }
  }
  if(phase!=='FREE')return;
  // auto-loot on the walk
  for(const u of U){
    if(u.side!=='reb'||u.down||u.extracted||u.away||u.mnt||u.bot)continue;
    for(const m of lootsWithin(u,AUTO_LOOT))collectLoot(u,m);
  }
  hackFreeStep(dt);
  fuelReach();
  if(fs&&fs.landed&&!fs.done){
    if(fuelGuards()){fs.pumpT+=dt;if(fs.pumpT>=6){fs.pumpT=0;fuelPumpStep();}}
    else fs.pumpT=0;
  }
  // pad work runs on timers out of combat
  const sera=U.find(x=>x.id==='sera');
  if(!crossAway&&sera&&!sera.down&&!sera.extracted&&hot<HOT_ROUNDS&&dist(sera,PAD)<PAD.r){
    if(!sera.reached){sera.reached=true;log('<span class="g">Sera is at the Cross.</span>');say(sera,'I’m at the panel. Give me a minute.');syncUI();}
    hotT+=dt;
    if(hotT>=4.5){
      hotT=0;hot++;sSpark();
      addFloater(sera.x,sera.y-46,'HOTWIRE '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,C.gold);
      if(hot>=HOT_ROUNDS)tryLaunch();
    }
  } else hotT=0;
  for(const wp of WORK){
    if(wp.done)continue;
    if(wp.needClear&&hostilesActive().length)continue;
    const worker=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.vip&&!u.away&&!u.down&&!u.extracted&&!u.manning&&!u.bot&&(!u.mnt||wp.inVeh)&&(!wp.needSpec||u.spec===wp.needSpec)&&(!wp.needCharge||u.charge)&&Math.hypot(u.x-wp.x,u.y-wp.y)<46);
    if(worker){
      wp.t+=dt;
      if(wp.t>=4){wp.t=0;workStep(wp,worker);}
    }
  }
  detUpdate(dt);
}
function civStep(dt){
  for(const u of U){
    if(u.side!=='civ'||u.extracted||u.cower)continue;
    if(u.rtPath){
      rtStep(u,dt);
      if(!u.rtPath&&u.fleeing){u.extracted=1;} // made it indoors / out of town
    } else if(town==='calm'&&u.haunt&&rng()<0.0025){
      const p=u.haunt[rint(0,u.haunt.length-1)];
      setRt(u,p.x+rint(-20,20),p.y+rint(-20,20),44);
    }
  }
}
/* ---------- extraction cinematic ---------- */
function startExtract(){
  if(phase!=='FREE'||!extractReady())return;
  phase='EXTRACT';
  byId('app').classList.add('cine');
  selId=null;pickMode=null;
  const E=exitPt();
  camGoal={x:E.x+120,y:E.y-40,z:1.0};
  extractFx={stage:'board',t0:performance.now()};
  let i=0;
  for(const u of U){
    if(u.side!=='reb'||u.down||u.extracted||u.away)continue;
    if(u.manning)unmanTurret(u);
    if(u.mnt)dismount(u,true);
    setRt(u,E.x+96+(i%2)*22,E.y-18+i*20,RT_SPEED*2);i++;   // double time to the ramp
  }
  log('<b>'+grafName()+'</b> <span class="d">(comms):</span> Ramp’s down. All aboard — double time!');
  sTick();syncUI();
}
function extractUpdate(now,dt){
  const E=exitPt();
  for(const u of U){
    if(u.side!=='reb'||u.down||u.extracted||u.away)continue;
    rtStep(u,dt);
    if(!u.rtPath){
      if(Math.hypot(u.x-E.x,u.y-E.y)<130){
        u.extracted=1;
        addFloater(u.x,u.y-36,'ABOARD',C.go);
        sThud();
        syncUI();
      } else if(!u.rtRetryAt||now>u.rtRetryAt){
        // path came up short — try again for the ramp
        u.rtRetryAt=now+800;
        setRt(u,E.x+96,E.y,RT_SPEED*2);
      }
    }
  }
  const aboard=U.filter(u=>u.side==='reb'&&u.id!=='sera').every(u=>u.extracted||u.down);
  if(extractFx.stage==='board'&&aboard){
    extractFx={stage:'lift',t0:now};
    grafState='gone';
    sTakeoff();
    for(let i=0;i<30;i++)parts.push({x:E.x+(rng()-0.5)*220,y:E.y+(rng()-0.5)*170,vx:(rng()-0.5)*200,vy:-rng()*50,r:3+rng()*5,a:0.5,col:'#b09a78',t0:now,dur:1000});
    camGoal={x:E.x,y:E.y-80,z:0.85};
  }
  if(extractFx.stage==='lift'&&now-extractFx.t0>3400){
    byId('app').classList.remove('cine');
    gameOver(true);
  }
}
/* ---------- round flow ---------- */
function startPlanning(){
  phase='PLANNING';round++;
  fsPlanStart();
  for(const u of U){
    if(u.side!=='reb')continue;
    u.order=null;u.braced=0;u.sprinted=0;u.owUsed=0;u.path=null;u.bunkered=0;
    if(u.reck>0)u.reck--;
    if(u.fuse>0)u.fuse--;
    u.rally=0;
    u.rivalEdge=(u.rels&&u.rels.length&&relUp(u,['rivals'])&&rng()<0.15)?1:0;
    if(u.jam>0){u.jam--;if(u.jam===0){log(nameSpan(u)+' works the Akli’s action clear.');}}
  }
  aiPlan();
  haltSquad();
  selId=null;pickMode=null;
  autoAdvance();
  saveSnap();
  syncUI();
}
function hotwiring(u){return u.id==='sera'&&!crossAway&&hot<HOT_ROUNDS&&dist(u,PAD)<PAD.r;}
function autoAdvance(){
  // hand the player the next rebel who still needs orders, like the space game
  const nxt=U.find(u=>u.side==='reb'&&!u.ally&&!u.down&&!u.extracted&&!u.away&&!u.manning&&!u.order&&!hotwiring(u)&&!stunned(u));
  if(nxt){
    selId=nxt.id;pickMode=null;
    camGoal=focusGoal(nxt);
  } else {selId=null;}
}
function plotted(){return U.filter(u=>u.side==='reb'&&!u.ally&&!u.down&&!u.extracted&&!u.away&&!hotwiring(u));}
function execute(){
  if(phase!=='PLANNING')return;
  tutFlags.executed=1;
  sTick();
  phase='EXEC';execT0=performance.now();
  fsExecute();
  selId=null;pickMode=null;
  // armed grenades from earlier rounds go off as the round opens
  const armed=nades.filter(g=>g.armRound<round);
  nades=nades.filter(g=>g.armRound>=round);
  for(const g of armed){
    log('<span class="a">The BLAM cooks off!</span>');
    explode(g.x,g.y,{r:NADE_BLAST,d0:32,d1:52});
  }
  for(const u of U){u.px=u.x;u.py=u.y;u.path=null;}
  for(const u of U){
    if(u.down||u.surr||u.extracted||u.away)continue;
    if(u.manning){u.braced=1;u.sprinted=0;continue;}
    if(u.mnt&&!stunned(u)&&execSeat(u))continue;
    if(stunned(u)){u.order=null;u.sprinted=0;u.braced=0;continue;}
    if(u.order&&u.order.type!=='hold'&&u.side==='reb'&&injOf(u,'eardrum')&&rng()<0.35){log(nameSpan(u)+' <span class="b">cannot hear the order</span> <span class="d">\u2014 ruptured eardrum, holding position</span>');u.order={type:'hold'};}
    const o=u.order;
    if(o&&o.type==='sprint'&&cantSprint(u)){o.type='move';}
    if(o&&o.type==='move'&&u.bot){const d=moveDest(u,o.tx,o.ty,reachOf(u,'move')+1);if(d){o.tx=d.x;o.ty=d.y;}}
    if(o&&o.type==='enter'){
      const v=U.find(x=>x.id===o.vid);
      const d=v&&moveDest(u,v.x,v.y,MOVE_R*speedMul(u)+ENTER_R);
      if(d)u.path=pathFor(u,d.x,d.y);
      u.sprinted=0;u.braced=0;
    } else if(o&&(o.type==='move'||o.type==='sprint')){
      u.path=pathFor(u,o.tx,o.ty);
      u.sprinted=o.type==='sprint'?1:0;
      sk(u,'agi',u.sprinted?1:0.5);
      if(u.sprinted&&hasT(u,'reckless'))u.reck=2;
      u.braced=0;
    } else if(o&&o.type==='man'&&dist(u,TURRET)>40){
      const seat=moveDest(u,TURRET.x,TURRET.y+6,MOVE_R+60);
      if(seat)u.path=pathFor(u,seat.x,seat.y);
      u.sprinted=0;u.braced=0;
    } else if(o&&o.type==='work'){
      const wp=WORK.find(w=>w.id===o.wp);
      if(wp&&Math.hypot(u.x-wp.x,u.y-wp.y)>40){
        const d=moveDest(u,wp.x,wp.y,MOVE_R+60);
        if(d)u.path=pathFor(u,d.x,d.y);
      }
      u.sprinted=0;u.braced=0;
    } else if(o&&o.type==='treat'){
      u.sprinted=0;u.braced=0;doTreat(u);
    } else if(o&&o.type==='rally'&&u.hero&&!u.heroUsed&&!injOf(u,'shrapnel')){
      u.sprinted=0;u.braced=0;u.heroUsed=1;
      addFloater(u.x,u.y-48,'RALLY!',C.go);
      log(nameSpan(u)+' <span class="g">rallies the squad</span> <span class="d">\u2014 everyone steadies, +2 to hit this round</span>');
      for(const m of U)if(m.side==='reb'&&!m.down&&!m.surr&&!m.extracted&&!m.away&&!m.auto&&!m.vip){m.rally=1;adjCoolG(m,Math.max(0,75-m.cool),'rallied');}
    } else if(o&&o.type==='lockin'){
      u.sprinted=0;u.braced=0;
      adjCoolG(u,35,'locked in');
      addFloater(u.x,u.y-40,'LOCKED IN',C.go);
    } else if(o&&o.type==='cover'){
      u.sprinted=0;u.braced=0;u.bunkered=1;
      addFloater(u.x,u.y-40,'TAKING COVER',C.shield);
    } else if(o&&o.type==='hold'){u.braced=1;u.sprinted=0;}
    else u.sprinted=0;
  }
  lastOw=0;
  syncUI();
}
/* a seat's order: the driver steers the vehicle, Exit and Switch happen as the round opens */
function execSeat(u){
  const o=u.order,v=vehOf(u),st=seatOf(u);
  if(!v||!st)return false;
  u.sprinted=0;
  if(!o)return true;
  if(o.type==='exit'){dismount(u);u.braced=0;return true;}
  if(o.type==='switch'){switchSeat(u,o.seat);u.braced=0;return true;}
  if(o.type==='move'){
    u.braced=0;
    if(st.drive&&!v.down){
      const d=moveDest(v,o.tx,o.ty,vehSpd(v)+1)||{x:o.tx,y:o.ty};
      v.path=pathFor(v,d.x,d.y);
      sk(u,'agi',0.5);
    }
    return true;
  }
  if(o.type==='work'){u.braced=0;return true;}
  return false;   // hold and lock in run the usual way
}
/* end of the movement: anyone who walked up to a vehicle climbs in */
function execArrivals(){
  for(const u of U){
    if(!u.order||u.order.type!=='enter'||u.down||u.mnt)continue;
    const v=U.find(x=>x.id===u.order.vid);
    if(v&&canEnter(u,v,ENTER_R+12))mount(u,v);
    else addFloater(u.x,u.y-40,'CAN\u2019T REACH IT',C.text3);
  }
  vehSync();
}
let lastOw=0;
function execUpdate(now){
  const t=Math.min(1,(now-execT0)/EXEC_MS);
  const tt=ease(t);
  for(const u of U){
    if(!u.path||u.down)continue;
    const p=pathPoint(u.path,tt);
    u.x=p.x;u.y=p.y;
    if(tt>0.02&&tt<0.98)u.face=p.ang;
  }
  // overwatch interrupts, checked in slices
  const slice=Math.floor(tt*10);
  if(slice>lastOw&&tt>0.12&&tt<0.95){
    lastOw=slice;
    for(const h of U){
      if(!h.braced||h.owUsed||h.down||h.surr||h.extracted||h.away)continue;
      if(coolStateG(h)==='panic')continue;
      if(h.side==='law'&&town!=='alerted')continue;
      for(const m of U){
        if(m.side===h.side||m.down||m.surr||m.extracted||m.away||!m.path)continue;
        const wkey=bestWeapon(h,m);
        if(!wkey)continue;
        h.owUsed=1;h.wkey=wkey;
        h.face=Math.atan2(m.y-h.y,m.x-h.x);
        const rec=applyShot(h,m,wkey,true);
        fireFx(h,m,wkey,rec.hit);
        log(nameSpan(h)+' <span class="a">snap-fires</span> at '+nameSpan(m)+' crossing open ground — '+(rec.jammed?'<span class="a">weapon jams!</span>':rec.hit?'<span class="b">hit</span> (-'+rec.dmg+')':'<span class="d">miss</span>')+'.');
        if(town==='calm')alertTown('Gunfire on the main street.');
        if(m.down&&m.path){m.path=null;}
        break;
      }
    }
  }
  if(t>=1){
    for(const u of U){
      if(u.path&&!u.down){const e=u.path[u.path.length-1];u.x=e.x;u.y=e.y;}
      u.path=null;
    }
    execArrivals();
    spotCheck();
    buildEngage();
  }
}
/* ---------- engagement ---------- */
function buildEngage(){
  const list=[];
  for(const s of U){
    if(s.down||s.surr||s.extracted||s.away)continue;
    if(s.sprinted)continue;
    const o=s.order;
    if(o&&(o.type==='loot'||o.type==='clear'||o.type==='work'||o.type==='lockin'||o.type==='cover'||o.type==='hack'||o.type==='enter'||o.type==='exit'||o.type==='switch'))continue;
    if(coolStateG(s)==='panic')continue;
    if(s.side==='law'&&town!=='alerted')continue;
    if(s.side==='reb'&&s.id==='sera'&&dist(s,PAD)<PAD.r&&!crossAway)continue; // head down in the panel
    const anyT=U.some(t=>t.side!==s.side&&wpnsOf(s).some(w=>validShot(s,t,w)));
    if(!anyT)continue;
    list.push(s);
  }
  if(!list.length){endRound();return;}
  list.sort((a,b)=>initKey(b)-initKey(a));
  engageQ={list,idx:0,cur:null,nextAt:performance.now()+350};
  phase='ENGAGE';
  syncUI();
}
/* who shoots first: aim with a little noise; Nervous rebels hang back in round one, Perfectionists go last */
function initKey(u){return u.aim*3+rint(0,4)-(hasT(u,'nervous')&&round<=1?3:0)-(hasT(u,'perfectionist')?100:0);}
function pickTarget(s){
  let best=null,bp=-1e9,bw=null;
  const hasOther=s.side==='law'&&U.some(t=>t.side==='reb'&&t.id!=='sera'&&!t.down&&!t.extracted&&wpnsOf(s).some(w=>validShot(s,t,w)));
  for(const t of U){
    if(t.side===s.side||t.down||t.surr||t.extracted||t.away)continue;
    for(const w of wpnsOf(s)){
      if(!validShot(s,t,w))continue;
      s.wkey=w;
      let p=pctFor(needFor(computeTN(s,t).total,computeATK(s,t,w).total));
      // deputies shoot at the guns pointed at them; only Reeve hunts the pilot
      if(s.side==='law'&&!s.sheriff&&t.id==='sera'&&hasOther)p-=18;
      if(p>bp){bp=p;best=t;bw=w;}
    }
  }
  return best?{t:best,wkey:bw}:null;
}
function makeCur(s,t,wkey){
  s.wkey=wkey;
  s.face=Math.atan2(t.y-s.y,t.x-s.x);
  return {s,t,wkey,tn:computeTN(s,t),atk:computeATK(s,t,wkey,false),
    reveal:0,revealA:0,stage:'reveal',stageAt:performance.now(),roll:0,hit:false,crit:false,applied:false,need:0};
}
function attackUpdate(now){
  const q=engageQ;if(!q)return;
  if(!q.cur){
    if(now<q.nextAt)return;
    if(q.idx>=q.list.length){engageQ=null;endRound();return;}
    const s=q.list[q.idx++];
    if(s.down||s.surr||(s.jam&&wpnsOf(s).length===1&&wpnsOf(s)[0]==='akli')){return;}
    let pk=null;
    // an ambush volley concentrates on the mark the player picked while they still stand
    if(q.forceT&&!q.forceT.down&&!q.forceT.surr){
      const w=bestWeapon(s,q.forceT);
      if(w)pk={t:q.forceT,wkey:w};
    }
    if(!pk)pk=pickTarget(s);
    if(!pk)return;
    q.cur=makeCur(s,pk.t,pk.wkey);
    camGoal=frameGoalOf(s,pk.t);
    syncUI();
    return;
  }
  const c=q.cur,el=now-c.stageAt;
  if(c.stage==='reveal'){
    const rows=Math.floor(el/230);
    c.reveal=Math.min(rows,c.tn.entries.length);
    if(c.reveal>=c.tn.entries.length&&el>c.tn.entries.length*230+120){c.stage='revealA';c.stageAt=now;}
  } else if(c.stage==='revealA'){
    const rows=Math.floor(el/230);
    c.revealA=Math.min(rows,c.atk.entries.length);
    if(c.revealA>=c.atk.entries.length&&el>c.atk.entries.length*230+140){
      c.need=needFor(c.tn.total,c.atk.total);
      if(c.s.side==='reb'&&!c.s.ally){c.stage='await';syncUI();}
      else {c.stage='think';c.stageAt=now;}
    }
  } else if(c.stage==='think'){
    if(el>650){c.stage='roll';c.stageAt=now;sDice();}
  } else if(c.stage==='await'){
    // waits for the ATTACK button
  } else if(c.stage==='roll'){
    if(el>780){
      c.roll=rint(1,20);
      c.jammed=jamRoll(c.s,c.wkey,c.roll);
      c.hit=!c.jammed&&c.roll>=c.need;
      c.crit=critRoll(c.roll,c.t);
      c.stage='verdict';c.stageAt=now;
    }
  } else if(c.stage==='verdict'){
    if(el>620){c.stage='fire';c.stageAt=now;
      fireFx(c.s,c.t,c.wkey,c.hit);
      if(town==='calm')alertTown('Gunfire in the street.');
    }
  } else if(c.stage==='fire'){
    if(el>420&&!c.applied){
      c.applied=true;
      sk(c.s,'aim',1);
      if(c.wkey==='rocket'&&c.s.side==='reb')c.s.rockets=(c.s.rockets||0)+1;
      if(hasT(c.s,'hothead'))adjCoolG(c.s,3,'in the fight');
      if(c.t.obj){
        if(c.jammed){
          c.s.jam=2;
          addFloater(c.s.x,c.s.y-40,'AKLI JAMMED',C.hazard);
          log(nameSpan(c.s)+'’s <span class="a">Akli jams on the trigger.</span>');
        } else if(c.hit){
          log(nameSpan(c.s)+' puts a round through the <b>fuel canister</b>.');
          detonate(c.t.prop);
        } else {
          log(nameSpan(c.s)+'’s shot sparks off the ground beside the canister.');
        }
      } else if(c.jammed){
        c.s.jam=2;
        addFloater(c.s.x,c.s.y-40,'AKLI JAMMED',C.hazard);
        log(nameSpan(c.s)+'’s <span class="a">Akli jams on the trigger.</span>');
        if(c.s.side==='reb')say(c.s,'Jam! Of course it jams NOW.');
      } else if(c.hit){
        let dmg=rollDamage(c.s,c.t,c.wkey,c.crit);
        const soaked=!!(c.tn.cover&&c.tn.cover.prop);
        if(soaked)dmg=Math.max(1,Math.round(dmg*0.75));
        c.dmg=dmg;
        woundUnit(c.s,c.t,dmg,c.crit,WDAM[c.wkey]);
        if(c.wkey==='rocket')c.s.wpns=c.s.wpns.filter(w=>w!=='rocket');
        log(nameSpan(c.s)+' hits '+nameSpan(c.t)+' — <b>'+dmg+'</b>'+(soaked?' <span class="d">(cover soaked it)</span>':'')+(c.crit?' <span class="a">(critical)</span>':'')+'.');
      } else {
        if(c.wkey==='rocket')c.s.wpns=c.s.wpns.filter(w=>w!=='rocket');
        log(nameSpan(c.s)+' misses '+nameSpan(c.t)+'.');
        if(c.tn.cover&&c.tn.cover.prop)chipCover(c.tn.cover.prop,Math.round(rollDamage(c.s,c.t,c.wkey,false)*0.7));
      }
    }
    if(el>900){q.cur=null;q.nextAt=now+320;syncUI();}
  }
}
function playerAttack(){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await')return;
  tutFlags.attacked=1;
  if(tutIdx>=4)tutFlags.shot=1;   // the Take the shot card only counts a shot taken once it is the current card
  sTick();c.stage='roll';c.stageAt=performance.now();sDice();syncUI();
}
function throwNade(s,gx,gy){
  s._throwT=performance.now();
  if(injOf(s,'shrapnel')){addFloater(s.x,s.y-48,'SUPPRESSED',C.hazard);return;}
  NADES--;
  if(hasT(s,'clumsy')&&rng()<0.25){
    gx=s.x;gy=s.y;
    log(nameSpan(s)+' <span class="b">fumbles the BLAM</span> <span class="d">(clumsy)</span> \u2014 it drops at their feet.');
  }
  nades.push({x:gx,y:gy,fx:s.x,fy:s.y,t0:performance.now(),armRound:round});
  s.face=Math.atan2(gy-s.y,gx-s.x);
  log(nameSpan(s)+' lobs a <b>BLAM frag</b> — it lands, primed.');
  addFloater(gx,gy-14,'PRIMED',C.hazard);
  sTick();
  pickMode=null;
  if(engageQ&&engageQ.cur){engageQ.cur=null;engageQ.nextAt=performance.now()+500;}
  camGoal={x:gx,y:gy,z:Math.max(cam.z,0.9)};
  syncUI();
}
function useStim(s){
  if(injOf(s,'shrapnel')){addFloater(s.x,s.y-48,'SUPPRESSED',C.hazard);return;}
  if(!s.stims||s.hp>=s.maxhp)return;
  s.stims--;
  const heal=Math.round(s.maxhp*0.3);
  s.hp=Math.min(s.maxhp,s.hp+heal);
  addFloater(s.x,s.y-40,'+'+heal+' STIM',C.go);
  log(nameSpan(s)+' <span class="g">slams a stim</span> — +'+heal+' hp.');
  sLoot();
  if(engageQ&&engageQ.cur){engageQ.cur=null;engageQ.nextAt=performance.now()+450;}
  syncUI();
}
function playerHold(){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await')return;
  sTick();
  log(nameSpan(c.s)+' <span class="d">holds fire.</span>');
  engageQ.cur=null;engageQ.nextAt=performance.now()+220;syncUI();
}
function mkObjTarget(p){
  return {obj:true,prop:p,name:'FUEL CANISTER',first:'canister',side:'obj',x:p.x,y:p.y,
    def:5,elev:0,sprinted:0,wound:0,frail:0,manning:0,down:0,surr:0,extracted:0,away:0};
}
function retargetCanister(p){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await'||p.dead)return;
  const t=mkObjTarget(p);
  const w=bestWeapon(c.s,t)||c.wkey;
  if(!validShot(c.s,t,w)){addFloater(p.x,p.y-26,'NO SHOT',C.text3);return;}
  engageQ.cur=makeCur(c.s,t,w);
  engageQ.cur.reveal=engageQ.cur.tn.entries.length;
  engageQ.cur.revealA=engageQ.cur.atk.entries.length;
  engageQ.cur.need=needFor(engageQ.cur.tn.total,engageQ.cur.atk.total);
  engageQ.cur.stage='await';
  camGoal=frameGoalOf(c.s,t);
  sTick();syncUI();
}
function retarget(t){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await'||!(t.side==='law'||(t.veh&&t.owner==='law'))||t.down||t.surr)return;
  if(t.manning&&shieldBlocks(c.s,t)){addFloater(t.x,t.y-30,'TURRET SHIELD',C.shield);return;}
  const w=bestWeapon(c.s,t)||c.wkey;
  if(!validShot(c.s,t,w))return;
  engageQ.cur=makeCur(c.s,t,w);
  engageQ.cur.reveal=engageQ.cur.tn.entries.length;
  engageQ.cur.revealA=engageQ.cur.atk.entries.length;
  engageQ.cur.need=needFor(engageQ.cur.tn.total,engageQ.cur.atk.total);
  engageQ.cur.stage='await';
  camGoal=frameGoalOf(c.s,t);
  sTick();syncUI();
}
/* ---------- end of round ---------- */
function endRound(){
  for(const u of U)u.ambush=0; // surprise is spent with the first volley
  for(const u of U){
    if(u.side!=='reb'||u.down||u.extracted||u.away||!injOf(u,'bleeding'))continue;
    u.hp-=6;u.minHp=Math.min(u.minHp===undefined?1:u.minHp,Math.max(0,u.hp)/u.maxhp);
    addFloater(u.x,u.y-38,'-6',C.hazard);
    log(nameSpan(u)+' <span class="b">bleeds</span> <span class="d">\u2014 -6</span>');
    if(u.hp<=0)downUnit(u,null);
  }
  for(const h of U){
    if(h.side!=='reb'||h.down||h.extracted||h.away||!hasT(h,'empathetic'))continue;
    for(const m of U)if(m!==h&&m.side==='reb'&&!m.down&&!m.extracted&&!m.away&&dist(h,m)<240)adjCoolG(m,3,'steadied by '+h.first);
  }
  hackResolve();
  fsRoundEnd();
  // loot pickups
  for(const u of U){
    if(u.side!=='reb'||u.down||!u.order)continue;
    if(u.order.type==='loot'){
      for(const m of lootsWithin(u,LOOT_AOE))collectLoot(u,m);
    }
    if(u.order.type==='clear'&&u.jam){u.jam=0;log(nameSpan(u)+' strips and clears the Akli.');}
  }
  // turret seats change hands at the end of the round
  for(const u of U){
    if(u.down||u.surr||u.extracted||u.away)continue;
    if(u.order&&u.order.type==='leave'&&u.manning){unmanTurret(u);continue;}
    if(!turret.gunner&&!u.manning&&dist(u,TURRET)<52&&
       ((u.order&&u.order.type==='man')||u.goingTurret)){manTurret(u);}
    u.goingTurret=0;
  }
  // pad work: one round with a soldier on the point (Work order, Hold, or standing fast)
  for(const wp of WORK){
    if(wp.done)continue;
    if(wp.needClear&&hostilesActive().length)continue;
    const worker=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.vip&&!u.away&&!u.down&&!u.extracted&&!u.manning&&!u.bot&&(!u.mnt||wp.inVeh)&&(!wp.needSpec||u.spec===wp.needSpec)&&(!wp.needCharge||u.charge)&&
      (!u.order||u.order.type==='hold'||(u.order.type==='work'&&u.order.wp===wp.id))&&Math.hypot(u.x-wp.x,u.y-wp.y)<46);
    if(worker)workStep(wp,worker);
  }
  // a round without taking fire steadies the nerve
  for(const u of U){
    if(u.side==='civ'||u.down||u.surr||u.extracted||u.away)continue;
    if(!dmgRound.has(u.id))adjCoolG(u,6,null);
  }
  dmgRound=new Set();
  fuelReach();
  fuelPumpStep();
  // hotwire
  const sera=U.find(u=>u.id==='sera');
  if(!crossAway&&sera&&!sera.down&&!sera.extracted&&hot<HOT_ROUNDS&&dist(sera,PAD)<PAD.r){
    if(!sera.reached){sera.reached=true;log('<span class="g">Sera is at the Cross.</span> Keep them off her.');say(sera,'I’m at the panel. Two rounds. Keep them OFF me.');}
    hot++;
    addFloater(sera.x,sera.y-46,'HOTWIRE '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,C.gold);
    sSpark();
    if(hot>=HOT_ROUNDS)tryLaunch();
    else log('Sera works the ignition bypass — <span class="a">'+hot+'/'+HOT_ROUNDS+'</span>.');
  }
  moraleCheck();
  spotCheck();
  // extraction
  if(exitOpen()){
    const clear=!hostilesActive().some(l=>Math.hypot(l.x-LZ.x,l.y-LZ.y)<300);
    for(const u of U){
      if(u.side!=='reb'||u.id==='sera'||u.down||u.extracted)continue;
      if(Math.hypot(u.x-LZ.x,u.y-LZ.y)<LZ.r){
        if(clear){
          if(u.mnt)dismount(u,true);
          u.extracted=1;u.order=null;
          log(nameSpan(u)+' <span class="g">is up the Graf’s ramp.</span>');
          addFloater(u.x,u.y-40,'EXTRACTED',C.go);
        } else {
          log('<span class="a">Lawmen too close to the Graf — ramp stays shut.</span>');
        }
      }
    }
    const soldiers=U.filter(u=>u.side==='reb'&&u.id!=='sera');
    if(soldiers.every(u=>u.extracted||u.down)&&soldiers.some(u=>u.extracted)){gameOver(true);return;}
  }
  if(phase==='GAMEOVER'){dgQueue.length=0;return;}
  if(dgQueue.length){dgNext();return;}   // the gun run is its own moment; roundWrap plays when the pass is done
  roundWrap();
}
/* where every round lands once its beats have played: free time or the next planning */
function roundWrap(){
  if(phase==='GAMEOVER')return;
  if(!combatActive()){
    enterFree(town==='alerted'?'<span class="g">The street is clear.</span> Time runs free again — sweep the town, then bring everyone home.':null);
    return;
  }
  startPlanning();
}
function doCrossAway(){
  crossAway=true;
  const sera=U.find(u=>u.id==='sera');
  if(sera)sera.xpGain=(sera.xpGain||0)+0.25;
  sera.away=1;sera.order=null;
  crossFx={t0:performance.now()};
  sTakeoff();
  camGoal={x:PAD.x-120,y:PAD.y,z:0.85};
  log('<span class="g">The Cross is up!</span> Sera takes her low over the rooftops and gone.');
  log('<b>'+grafName()+'</b> <span class="d">(comms):</span> There she goes. Ramp’s down — get my ground-pounders home.');
  const lead=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.down);
  if(lead)say(lead,'Bird’s away! Everyone back to the Graf!');
  syncUI();
}
function checkDefeat(){
  const vipU=U.find(u=>u.vip);
  if(vipU&&vipU.down){gameOver(false,'vip');return;}
  const sera=U.find(u=>u.id==='sera');
  if(sera&&sera.down&&!sera.away){gameOver(false,'sera');return;}
  const soldiers=U.filter(u=>u.side==='reb'&&u.id!=='sera');
  if(soldiers.length&&soldiers.every(u=>u.down))gameOver(false,'squad');
}
/* end screen furniture: loot rows, stamp, which button is the gold one */
function LL(label,val,icon){return '<div class="sr-loot" style="--c:'+(icon==='credits'?'var(--sr-res-credits)':icon==='supplies'?'var(--sr-res-supplies)':'var(--sr-go)')+'">'+HUD.ico(icon||'check')+label+'<b>'+val+'</b></div>';}
function tagText(t){return String(t).replace(/Mission Report/,'Mission report').replace(/Ground Operation/,'Ground operation').replace(/\s*\u00b7\s*/,', ');}
function endChrome(win,retry){
  const st=byId('endStamp');
  st.textContent=win?'Secured':'Mission failed';
  st.className='sr-stamp '+(win?'sr-stamp--action':'sr-stamp--bad');
  byId('endRetryBtn').hidden=!retry;
  const go=byId('endRestartBtn');
  go.className='sr-btn'+(retry?'':' sr-btn--primary sr-btn--lg');
  go.textContent='Continue';
  byId('endEyebrow').textContent=tagText(byId('endEyebrow').textContent);
}
function gameOver(win,why){
  if(phase==='GAMEOVER')return;
  phase='GAMEOVER';gameEnd={win};
  engageQ=null;
  const soldiers=U.filter(u=>u.side==='reb'&&u.id!=='sera');
  const left=soldiers.filter(u=>u.down).map(u=>u.name);
  if(SCN.mode==='haven'){
    byId('endEyebrow').textContent='Prologue · Haven Rock';
    byId('endTitle').textContent=win?'Haven Rock Is Ours':'Thrown Back';
    byId('endText').textContent=win?
      'The squatters are gone and the rebel signal hums through the mountain’s own antenna. It isn’t much — a command centre, bunks for five, a hangar cave — but it’s ours, and nobody knows it exists. And under a decade of dust in that cave: a derelict Graf Type 1 Hauler. Joss is already talking to it. Day one of the rest of the war starts now.':
      'The squatters held. The squad fell back down the canyon — bruised, furious, and alive. Catch your breath, come around, and take the rock. There is no revolution without a home.';
    let lh2='';
    if(win){
      lh2+=LL('Haven Rock','Secured');
      if(tally.c)lh2+=LL('Credits scavenged','+'+tally.c,'credits');
      if(tally.s)lh2+=LL('Supplies scavenged','+'+tally.s,'supplies');
      for(const it of tally.items)lh2+=LL(Items.name(it),'Taken','loot');
    }
    byId('endLoot').innerHTML=lh2;
    endChrome(win,false);
    byId('endscreen').hidden=false;
    pendingResult=buildResult(win);
    syncUI();
    return;
  }
  endChrome(win,(SCN.mode==='stealcross'||SCN.mode==='stealfuel'||SCN.mode==='autofactory'||SCN.mode==='towers'||SCN.mode==='rescue'||SCN.mode==='intel'||SCN.mode==='strider')&&!win);
  const place=SCN.place||({intel:'Data Flats',autofactory:'Kiln Ridge',stealfuel:'Redrock Flats',rescue:'Tollgate Landing',towers:'Parity IV'})[SCN.mode]||'the target';
  byId('endEyebrow').textContent=tagText(win?(ix||fac||fs||(rs&&SCN.mode==='rescue')?'Mission Report · '+place:SCN.mode==='strider'?'Mission Report · Menk Crossing':'Mission Report · Dustfall'):'Mission Report · It went wrong');
  byId('endTitle').textContent=win?(ix?'Data Secured':SCN.mode==='strider'?'The Strider Is Ours':rs?'Freed':fac?(SCN.mode==='towers'?(fac.method==='limpet'?'Tower Tapped':'Tower Down'):'Lights Out'):fs?'Tanks Full':'The Cross Is Ours'):'Mission Failed';
  let txt;
  if(ix){
    txt=win?'The Field Technician walked out of '+place+' with the Bureau\u2019s registry backups on a single drive. Every name, every quota, every dissident file. Somewhere in the Hegemony a very quiet meeting has just started.'+(left.length?' It cost us: '+left.join(', ')+' left behind. We don\u2019t forget that.':''):
      'The squad was overrun around the target and the Marta lifted with nothing. The databank is still sealed.';
  } else if(SCN.mode==='strider'){
    txt=win?'A Strider Mk I walked up the Marta\u2019s ramp with its face-screen still reading \u201cWe\u2019re all in this together\u201d and a fresh rebel badge scratched into its chest plate. The Hegemony is out one walker. We are in one.'+(rs.everAlerted?'':' Nobody at the Crossing saw it leave.')+(left.length?' It cost us: '+left.join(', ')+' left at the depot. We don\u2019t forget that.':''):
      (why==='vip'?'The Strider went down in the yard, and with it the whole plan. The squad pulled out with nothing to show for it.':'The squad was overrun around the depot and the Marta lifted empty. The Strider is still chained in its yard.');
  } else if(rs){
    const vn=(U.find(u=>u.vip)||{name:'The prisoner'}).name;
    txt=win?vn+' stepped aboard the Marta shaking, quiet and very much alive. '+(rs.everAlerted?'The outpost will spend a week working out what happened.':'The outpost will spend a week working out who opened the door, and never find out.')+(left.length?' It cost us: '+left.join(', ')+' left at the outpost. We don\u2019t forget that.':''):
      (why==='vip'?vn+' went down before the Marta was in reach. There is no bringing that back. The squad pulled out with nothing.':'The squad was overrun around the outpost and the Marta lifted empty. The cell is still locked.');
  } else if(fac&&SCN.mode==='towers'){
    txt=win?(fac.method==='limpet'?'The limpet is on the tower and the tower does not know it. Every packet that crosses '+place+' now crosses our desk first.':'The tower came down in a shower of sparks and the whole compound went quiet. Somewhere in '+place+' a technician is shouting into a dead handset.')+(fac.quiet?' Nobody saw us come or go.':'')+(left.length?' It cost us: '+left.join(', ')+' left at the compound. We don\u2019t forget that.':''):
      'The squad was overrun before the device was on the tower and the Marta lifted empty. The tower is still talking.';
  } else if(fac){
    txt=win?(fac.quiet?'Nobody in '+place+' saw us come or go. One moment the plant was humming; the next the whole plant was dark and the night shift was standing outside wondering who to blame.':'The Power Plant is a crater and the plant is dark. The alarm had already gone, but it made no difference: the line will not turn out another Auto for a long time.')+(left.length?' It cost us: '+left.join(', ')+' left on the plant floor. We don\u2019t forget that.':''):
      (fac.planted&&!fac.detonated?'The charge never got its chance. The squad was pulled out before the plant could be dropped, and Security will find the charge by morning.':'The squad was overrun inside the plant and the Marta lifted empty. The line keeps running.');
  } else if(fs){
    txt=win?'The Marta lifted off '+place+' heavy with the tithe: every drop the herders paid, pumped back out of the depot that took it. Somewhere a warden is writing a very long report.'+(left.length?' It cost us: '+left.join(', ')+' left on the apron. We don\u2019t forget that.':''):
      'The squad was overrun around the apron and the Marta lifted empty. The depot is still full and the warden is still smug.';
  } else if(win){
    txt='Sera put the FT-4 down at Haven Rock with the fuel light on and a grin she won’t drop for a week. '+
      'Sheriff Reeve’s Hegemony masters will want an explanation he doesn’t have.';
    if(left.length)txt+=' It cost us: '+left.join(', ')+' left on the street. We don’t forget that.';
  } else if(why==='sera'){
    txt='Sera went down in the dust a stone’s throw from the Cross. Without a pilot the ship is just sheet metal. The squad pulled back to the Graf with nothing but her sidearm.';
  } else {
    txt='The squad was shot to pieces on Dustfall’s main street. The Graf lifted empty. Reeve gets to write the report he always wanted.';
  }
  byId('endText').textContent=txt;
  let lh='';
  const tail=()=>{
    let t='';
    if(tally.c)t+=LL('Credits looted','+'+tally.c,'credits');
    if(tally.s)t+=LL('Supplies looted','+'+tally.s,'supplies');
    for(const it of tally.items)t+=LL(Items.name(it),'Taken','loot');
    return t;
  };
  if(win&&ix){
    lh+=LL('Bureau registry backups','Copied')+tail();
  } else if(win&&rs){
    const vn=(U.find(u=>u.vip)||{name:'Prisoner'}).name;
    lh+=LL(vn,SCN.mode==='strider'?'Stolen':'Freed')+LL('Stayed unseen',rs.everAlerted?'No':'Yes, bonus')+tail();
  } else if(win&&fac){
    lh+=(SCN.mode==='towers'?LL('Comm tower',fac.method==='limpet'?'Tapped':'Destroyed'):LL('Power Plant','Destroyed'))+
      LL('Stayed unseen',fac.quiet?'Yes, bonus':'No')+tail();
  } else if(win&&fs){
    lh+=LL('Marta\u2019s fuel tanks','Full')+tail();
  } else if(win){
    lh+=LL('FT-4 Cross starfighter','Secured')+tail();
    if(!tally.c&&!tally.s&&!tally.items.length)lh+=LL('Loot','None. Clean and quiet.');
  }
  byId('endLoot').innerHTML=lh;
  byId('endscreen').hidden=false;
  pendingResult=buildResult(win);
  syncUI();
}
let pendingResult=null;
function grafName(){return (CTX&&CTX.grafPilot&&CTX.grafPilot.first)||'Joss';}
function buildResult(win){
  const haven=SCN.mode==='haven';
  const people=[];
  for(const u of U){
    if(u.side!=='reb'||u.asset)continue;
    let state='ok';
    if(u.down)state=haven?(win?'injured':'ok'):'injured'; // nobody is buried this early in the war
    const xp=Math.round(((u.xpGain||0)+(win?0.12:0.03))*100)/100;
    const rec={id:u.pid||u.id,xp,state,dur:haven?rint(1,3):rint(3,6)};
    if(u.sk){rec.sk={};for(const k in u.sk)rec.sk[k]=Math.round(u.sk[k]*10)/10;}
    if(u.kills)rec.kills=u.kills;
    if(u.down)rec.down=1;
    if(u.inj&&u.inj.length)rec.inj=u.inj.map(i=>({k:i.k,treated:!!i.treated}));
    if(u.treats)rec.treats=u.treats;
    if(u.packsUsed)rec.packs=u.packsUsed;
    if(u.rescued&&u.rescued.length)rec.rescued=u.rescued.slice();
    if(u.minHp!==undefined)rec.minHp=Math.round(u.minHp*100)/100;
    if(u.rockets)rec.heavy=u.rockets;
    if(u.panics)rec.panics=u.panics;
    if(u.luckySaved)rec.lucky=1;
    people.push(rec);
  }
  if(CTX&&CTX.grafPilot)people.push({id:CTX.grafPilot.id,xp:win?0.1:0.04,state:'ok'});
  const gained=win?U.filter(u=>u.hacked&&u.extracted&&!u.down).map(u=>({type:u.autoType,name:u.name})):[];
  // owned vehicles and Bots: the transport collects whatever is still running; a wreck is lost
  const vehicles=((FS&&FS.vehicles)||[]).filter(va=>va.uid).map(va=>{
    const u=U.find(x=>x.id===va.uid);
    return {id:va.id,lost:!!(u&&u.down),hp:u?Math.max(0,Math.round(u.hp/u.maxhp*100)):va.hpPct};
  });
  return {gained,kind:'ground',missionId:(CTX&&CTX.missionId)||'stealcross',
    days:(CTX&&CTX.days!==undefined)?CTX.days:2,
    win,cross:SCN.mode==='stealcross'&&!!win,nades:NADES,quiet:!!((fac&&fac.detonated&&fac.quiet)||(rs&&rs.released&&!rs.everAlerted)),vipOut:!!(U.find(u=>u.vip&&u.extracted)),chargeUsed:(fac&&fac.planted&&fac.method!=='limpet')?1:0,limpetUsed:(fac&&fac.planted&&fac.method==='limpet')?1:0,method:fac?fac.method:null,vehicles,loot:{c:tally.c,s:tally.s,items:tally.items.slice()},people};
}
/* ---------- explosions ---------- */
function explode(x,y,opt){
  const R=(opt&&opt.r)||135,D0=(opt&&opt.d0)||45,D1=(opt&&opt.d1)||70;
  sBoomBig();shake=performance.now();
  decals.push({x,y,r:(R/135)*(52+rng()*14)});
  boomFx.push({x,y,t0:performance.now(),dur:700,R});
  for(let k=0;k<10;k++)parts.push({x:x+(rng()-0.5)*60,y:y+(rng()-0.5)*60,vx:(rng()-0.5)*90,vy:-30-rng()*60,r:5+rng()*7,a:0.35,col:'#3a3430',t0:performance.now(),dur:1300});
  for(const u of U){
    if(u.side==='civ'||u.down||u.extracted||u.away||u.office||(u.mnt&&enclosed(u)))continue;
    const d=Math.hypot(u.x-x,u.y-y);
    if(d<R){
      const dmg=Math.round((D0+rng()*(D1-D0))*(1-d/R*0.55));
      woundUnit(null,u,dmg,false,'explosive');
      if(!u.down)log(nameSpan(u)+' is caught in the blast — <b>-'+dmg+'</b>.');
      if(!u.down&&d<R*0.6&&u.side==='reb'&&rng()<0.2)inflictInjury(u,'explosive');
    }
  }
  for(const p of PROPS){
    if(p.dead)continue;
    const d=Math.hypot(p.x-x,p.y-y);
    if(d<10)continue; // the one that just went up
    if(p.kind==='canister'&&d<R+15){p.dead=true;exploQ.push({x:p.x,y:p.y,at:performance.now()+120+rng()*160});}
    else if(d<R+5&&PROPDEF[p.kind].hp!==undefined)chipCover(p,120);
  }
  if(town==='calm')alertTown('Half the town heard that.');
}
function detonate(p){
  if(p.dead)return;
  p.dead=true;
  log('<span class="a">A fuel canister goes up!</span>');
  explode(p.x,p.y);
}
function exploTick(now){
  for(let i=exploQ.length-1;i>=0;i--){
    if(now>=exploQ[i].at){const q=exploQ.splice(i,1)[0];explode(q.x,q.y,q.opt);}
  }
}
/* ---------- effects ---------- */
function clipShot(x1,y1,x2,y2){
  // stop a tracer at the first wall it meets
  const d=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.ceil(d/9));
  for(let i=1;i<=n;i++){
    const t=i/n;
    if(ptBlocked(x1+(x2-x1)*t,y1+(y2-y1)*t,0)){
      const tb=(i-0.5)/n;
      return {x:x1+(x2-x1)*tb,y:y1+(y2-y1)*tb,wall:true};
    }
  }
  return {x:x2,y:y2,wall:false};
}
function fireFx(s,t,wkey,hit){
  const w=WPN[wkey];
  const ang=Math.atan2(t.y-s.y,t.x-s.x);
  if(s.manning)turret.face=ang; // the gun (and its shield) tracks where it shoots
  if(w.beam){
    const end=hit?{x:t.x,y:t.y}:clipShot(s.x,s.y,s.x+Math.cos(ang+0.06)*(dist(s,t)+90),s.y+Math.sin(ang+0.06)*(dist(s,t)+90));
    tracers.push({x1:s.x+Math.cos(ang)*30,y1:s.y+Math.sin(ang)*30,x2:end.x,y2:end.y,t0:performance.now(),dur:200,col:s.side==='reb'?C.rebel:C.heg,beam:1});
    parts.push({x:end.x,y:end.y,vx:0,vy:0,r:12,a:0.8,col:'#ff8f9a',t0:performance.now(),dur:160,flash:1});
    sLaser();
    if(!hit)for(const p of PROPS)if(!p.dead&&p.kind==='canister'&&Math.hypot(p.x-end.x,p.y-end.y)<30)detonate(p);
    return;
  }
  const shots=w.pellets?5:(w.shots||1);
  const bkind=(wkey==='carbine'||WDAM[wkey]==='plasma')?'plasma':'ballistic';   // the carbine draws as plasma though it hits as ballistic (C-23)
  const bside=s.side==='reb'?'reb':'heg';
  const h0=26*actorScale(s);   // bolts leave at the muzzle, not the feet
  for(let i=0;i<shots;i++){
    const spread=w.pellets?(i-2)*0.09:(hit?0:(rng()-0.5)*0.16)+(rng()-0.5)*0.03;
    const a=ang+spread;
    const d=dist(s,t)+(hit?0:rint(40,120));
    const mx=s.x+Math.cos(a)*14,my=s.y+Math.sin(a)*14;
    const end=clipShot(mx,my,s.x+Math.cos(a)*d,s.y+Math.sin(a)*d);
    const ex=end.x,ey=end.y;
    tracers.push({x1:mx,y1:my-h0,x2:ex,y2:ey-(end.wall?0:h0*0.6),
      t0:performance.now()+i*(w.pellets?0:90),dur:110,kind:bkind,side:bside});
    if(end.wall){
      for(let k=0;k<6;k++)parts.push({x:ex,y:ey,vx:(rng()-0.5)*60,vy:-rng()*50,r:1.5+rng()*2,a:0.5,col:'#8a7a60',t0:performance.now()+i*90,dur:500});
    } else hits.push({x:ex,y:ey-h0*0.6,t0:performance.now()+i*(w.pellets?0:90)+90,dur:260});
    // stray rounds find fuel canisters
    if(!hit&&!end.wall)for(const p of PROPS)if(!p.dead&&p.kind==='canister'&&Math.hypot(p.x-ex,p.y-ey)<28)detonate(p);
  }
  // the muzzle flash comes from the firing pose; only the brass stays here
  casings.push({x:s.x,y:s.y-h0*0.5,vx:(rng()-0.5)*40-Math.cos(ang)*30,vy:-40-rng()*30,t0:performance.now()});
  sShot(wkey);
  if(!hit&&rng()<0.4)sRico();
  if(wkey==='scatter')shake=performance.now();
}
/* ---------- audio ---------- */
const sTick=A.tick;
function sShot(wkey){
  if(A.off())return;
  if(wkey==='akli'){
    for(let i=0;i<3;i++){nz('highpass',2400,1,0.16,0.06,i*0.09);osc('square',220,70,0.1,0.07,i*0.09);}
  } else if(wkey==='cowboy'||wkey==='hg40'||wkey==='autohand'){
    nz('highpass',1700,1,0.2,0.09);osc('triangle',170,55,0.16,0.13);nz('lowpass',500,1,0.12,0.2,0.02);
  } else if(wkey==='carbine'){
    for(let i=0;i<2;i++){nz('highpass',2600,1,0.15,0.06,i*0.11);osc('square',260,80,0.09,0.07,i*0.11);}
  } else if(wkey==='scatter'){
    osc('sine',120,30,0.42,0.5);nz('lowpass',800,0.8,0.4,0.55,0,60);nz('bandpass',320,1.2,0.16,0.3,0.03);
  } else if(wkey==='doorgun'){ // the heavy door gun: five slow, deep reports
    for(let i=0;i<5;i++){osc('sine',100,34,0.3,0.12,i*0.095);nz('lowpass',700,0.9,0.22,0.16,i*0.095);nz('highpass',2000,1,0.08,0.04,i*0.095);}
  } else { // longiron
    nz('highpass',3100,1,0.22,0.07);osc('square',300,60,0.13,0.1);
    nz('bandpass',900,2,0.09,0.35,0.1,180); // canyon echo
  }
}
function sRico(){if(A.off())return;osc('sine',1500+rng()*600,300,0.06,0.28,0.06);}
function sThud(){if(A.off())return;osc('sine',110,40,0.25,0.3);nz('lowpass',300,1,0.18,0.25);}
function sAlert(){
  if(A.off())return;
  for(let i=0;i<3;i++){osc('sawtooth',540,760,0.12,0.22,i*0.26);osc('square',270,380,0.06,0.22,i*0.26);}
}
function sLoot(){if(A.off())return;for(let i=0;i<3;i++)osc('sine',1900+i*420,1400,0.07,0.09,i*0.07);}
function sSpark(){if(A.off())return;for(let i=0;i<4;i++)nz('highpass',4200,2,0.05,0.03,i*0.08);}
function sJamClr(){if(A.off())return;osc('square',150,90,0.1,0.06);osc('square',180,110,0.1,0.06,0.1);}
const sDice=A.dice;
function sBoomBig(){
  if(A.off())return;
  osc('sine',140,24,0.55,0.9);
  nz('lowpass',900,0.8,0.5,1.2,0,55);
  nz('bandpass',300,1.2,0.2,0.5,0.05);
  for(let i=0;i<5;i++)nz('bandpass',700+rng()*900,2,0.09,0.08,0.15+i*0.09);
}
function sLaser(){
  if(A.off())return;
  osc('sawtooth',1250,140,0.16,0.22);
  osc('square',830,110,0.08,0.2);
  nz('highpass',3200,1,0.06,0.06);
}
function sTakeoff(){
  if(A.off())return;
  osc('sawtooth',60,340,0.22,2.4);nz('bandpass',300,1.5,0.2,2.2,0,2400);osc('sine',45,180,0.2,2.2);
}
function sLand(){if(A.off())return;nz('bandpass',1400,1.5,0.2,1.4,0,160);osc('sine',180,40,0.22,1.6);}
/* ---------- camera & canvas ---------- */
const cv=byId('cv'),ctx=cv.getContext('2d');
let dpr=1,cssW=0,cssH=0;
function fitCanvas(){
  const r=cv.parentElement.getBoundingClientRect();
  dpr=Math.min(window.devicePixelRatio||1,2);
  cssW=r.width;cssH=r.height;
  cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);
  clampCam();
  HUD.fitBar(DOCK);
  measureHud();
}
addEventListener('resize',()=>{if(SR.active==='ground')fitCanvas();});
function fitZoom(){return Math.min(cssW/W,cssH/H);}
function clampCam(){
  cam.z=Math.max(fitZoom()*0.92,Math.min(2.1,cam.z));
  const hw=cssW/(2*cam.z),hh=cssH/(2*cam.z);
  cam.x=Math.max(Math.min(cam.x,W+240-hw),hw-240);
  // the bottom dock hides part of the stage, so the map may scroll that much further up past its edge
  cam.y=Math.max(Math.min(cam.y,H+240+Math.max(0,cssH-FR.y1)/cam.z-hh),hh-240);
  if(hw*2>W+480)cam.x=W/2;
  if(hh*2>H+480)cam.y=H/2;
}
function camFitSquad(snap){
  const ps=U.filter(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away);
  if(!ps.length)return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const s of ps){x0=Math.min(x0,s.x);y0=Math.min(y0,s.y);x1=Math.max(x1,s.x);y1=Math.max(y1,s.y);}
  const cx=(x0+x1)/2,cy=(y0+y1)/2;
  const z=Math.max(fitZoom()*0.95,Math.min(1.0,Math.min(cssW/(x1-x0+700),cssH/(y1-y0+700))));
  if(snap){cam={x:cx,y:cy,z};clampCam();camGoal=null;}
  else camGoal={x:cx,y:cy,z};
}
/* ---------- camera framing that knows where the HUD is ----------
   FR is the part of the stage the HUD leaves free (css px): above the bottom dock, and between the
   side stacks on desktop. Engagement frames attacker and target inside it; on phones the followed
   rebel sits at ~45% of the stage height (portrait) or ~28% (landscape) so the bar never covers them. */
let FR={x0:0,y0:0,x1:0,y1:0};
const BOT=byId('gBottom');
function isPhone(){return ROOT.clientWidth<=900||ROOT.clientHeight<=520;}
function measureHud(){
  const st=cv.parentElement.getBoundingClientRect();
  FR={x0:0,y0:0,x1:cssW,y1:cssH};
  if(!st.width)return;
  const vis=e=>!e.hidden&&e.getClientRects().length>0;
  const rect=sel=>[...ROOT.querySelectorAll(sel)].filter(vis).map(e=>e.getBoundingClientRect());
  const bb=BOT.getBoundingClientRect();
  if(bb.height>4)FR.y1=Math.max(cssH*0.3,bb.top-st.top-12);
  const tl=rect('.sr-stage .sr-slot-tl>*'),tr=rect('.sr-stage .sr-slot-tr>*');
  const lr=Math.max(0,...tl.map(r=>r.right-st.left)),lb=Math.max(0,...tl.map(r=>r.bottom-st.top));
  const rl=Math.min(cssW,...tr.map(r=>r.left-st.left)),rb=Math.max(0,...tr.map(r=>r.bottom-st.top));
  /* largest clear rectangle around the HUD stacks: below both, between them, or beside one of them */
  const y1=FR.y1,cand=[
    [0,Math.max(lb,rb)+8,cssW,y1],
    [lr+8,16,rl-8,y1],
    [0,lb+8,rl-8,y1],
    [lr+8,rb+8,cssW,y1]];
  let best=null,bs=0;
  for(const [x0,y0,x1,y1b] of cand){
    const w=x1-x0,h=y1b-y0;
    if(w<160||h<90)continue;
    const sc2=Math.min(w,h*1.6)*h;
    if(sc2>bs){bs=sc2;best=[x0,y0,x1,y1b];}
  }
  if(best){FR.x0=best[0];FR.y0=best[1];FR.x1=best[2];FR.y1=best[3];}
  else FR.y0=16;
}
function focusFrac(){
  if(isPhone())return ROOT.clientHeight<=520&&ROOT.clientWidth>ROOT.clientHeight?0.28:0.45;
  return Math.max(0.3,Math.min(0.5,((FR.y0+FR.y1)/2)/(cssH||1)));
}
function focusGoal(u){return {focus:u,x:u.x,y:u.y,z:Math.max(cam.z,0.9)};}
function frameGoalOf(a,b){return {pts:[a,b],z0:Math.max(cam.z,0.95),x:cam.x,y:cam.y,z:cam.z};}
function resolveGoal(g){
  if(g.focus){g.x=g.focus.x;g.y=g.focus.y+(0.5-focusFrac())*cssH/g.z;}
  else if(g.pts){
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const p of g.pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
    const pad=isPhone()?44:56;
    const lab=16;                       // names sit under the tokens
    const fw=Math.max(60,FR.x1-FR.x0-2*pad),fh=Math.max(60,FR.y1-lab-FR.y0-2*pad);
    const z=Math.max(fitZoom()*0.92,Math.min(g.z0,fw/Math.max(1,x1-x0),fh/Math.max(1,y1-y0)));
    g.z=z;
    g.x=(x0+x1)/2-((FR.x0+FR.x1)/2-cssW/2)/z;
    g.y=(y0+y1)/2-((FR.y0+FR.y1-lab)/2-cssH/2)/z;
  }
}
function worldToCss(wx,wy){return [(wx-cam.x)*cam.z+cssW/2,(wy-cam.y)*cam.z+cssH/2];}
function cssToWorld(px,py){return {x:(px-cssW/2)/cam.z+cam.x,y:(py-cssH/2)/cam.z+cam.y};}
/* ---------- ground detail (seeded once) ---------- */
let floorCv=null,floorKey='';
function groundBiome(){return SCN&&SCN.style==='rock'?'rock':'dust';}
function floorCache(){
  const key=(SCN.mode||'')+'|'+W+'x'+H+'|'+groundBiome();
  if(floorKey===key&&floorCv)return floorCv;
  floorCv=document.createElement('canvas');floorCv.width=W;floorCv.height=H;
  SA.floor(floorCv.getContext('2d'),0,0,W,H,groundBiome(),SA.util.hashStr(key));
  floorKey=key;
  return floorCv;
}
const patches=[],scrub=[];
function genScatter(){
  patches.length=0;scrub.length=0;
  for(let i=0;i<210;i++)patches.push({x:Math.random()*W,y:Math.random()*H,w:40+Math.random()*160,h:26+Math.random()*90,a:0.03+Math.random()*0.05,warm:Math.random()<0.5});
  for(let i=0;i<160;i++)scrub.push({x:Math.random()*W,y:Math.random()*H,r:2+Math.random()*3.4});
}
/* ---------- drawing ---------- */
function drawGroundHaven(){
  const now=performance.now();
  ctx.drawImage(floorCache(),0,0);
  for(const sc2 of scrub){
    ctx.fillStyle='rgba(90,110,96,0.22)';
    ctx.beginPath();ctx.arc(sc2.x,sc2.y,sc2.r,0,7);ctx.fill();
  }
  // worn trail: map edge -> squatter camp -> base mouth
  const lk=SCN.layoutK||1;
  SA.trail(ctx,[[LZ.x-30,H+20],[LZ.x+40,LZ.y],[620*lk,940*lk],[SCN.camp.x-40,SCN.camp.y+40],[SCN.door.x,SCN.door.y+10]],'rock',46);
  // carved interior: plated floors under the mountain
  for(const op of SCN.opens){
    ctx.fillStyle='#171d26';
    ctx.fillRect(op.x,op.y,op.w,op.h);
    ctx.strokeStyle='rgba(87,168,255,0.06)';ctx.lineWidth=1;
    for(let gx=op.x+40;gx<op.x+op.w;gx+=40){ctx.beginPath();ctx.moveTo(gx,op.y);ctx.lineTo(gx,op.y+op.h);ctx.stroke();}
    for(let gy=op.y+40;gy<op.y+op.h;gy+=40){ctx.beginPath();ctx.moveTo(op.x,gy);ctx.lineTo(op.x+op.w,gy);ctx.stroke();}
    ctx.strokeStyle='rgba(120,140,170,0.14)';ctx.lineWidth=2;
    ctx.strokeRect(op.x+1,op.y+1,op.w-2,op.h-2);
    // stains
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();ctx.ellipse(op.x+op.w*0.3,op.y+op.h*0.6,op.w*0.12,op.h*0.1,0.4,0,7);ctx.fill();
  }
  // dying interior striplights
  for(const op of SCN.opens){
    if(op.w<120)continue;
    const flick=Math.sin(now*0.017+op.x)>-0.85?1:0.2;
    ctx.fillStyle='rgba(150,220,255,'+(0.05*flick)+')';
    ctx.fillRect(op.x+8,op.y+6,op.w-16,4);
  }
  // room names
  for(const op of SCN.opens){
    if(!op.label)continue;
    plb(op.label,op.x+op.w/2,op.y+26,C.text3,13);
  }
  for(const d of decals)SA.scorch(ctx,d.x,d.y,d.r);
  // blast door mouth
  const dr=SCN.door;
  ctx.fillStyle='#0e1218';
  ctx.fillRect(dr.x-52,dr.y-8,104,18);
  ctx.strokeStyle='rgba(255,180,84,0.6)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(dr.x-52,dr.y+10);ctx.lineTo(dr.x-52,dr.y-26);ctx.stroke();
  ctx.beginPath();ctx.moveTo(dr.x+52,dr.y+10);ctx.lineTo(dr.x+52,dr.y-26);ctx.stroke();
  const dg=ctx.createRadialGradient(dr.x,dr.y+14,6,dr.x,dr.y+14,110);
  dg.addColorStop(0,'rgba(255,190,110,0.10)');dg.addColorStop(1,'rgba(255,190,110,0)');
  ctx.fillStyle=dg;
  ctx.beginPath();ctx.arc(dr.x,dr.y+14,110,0,7);ctx.fill();
  // squatter campfire
  const fg=ctx.createRadialGradient(SCN.camp.x,SCN.camp.y,4,SCN.camp.x,SCN.camp.y,120);
  const fl=0.10+0.04*Math.sin(now*0.013)+0.02*Math.sin(now*0.031);
  fg.addColorStop(0,'rgba(255,150,60,'+fl+')');fg.addColorStop(1,'rgba(255,150,60,0)');
  ctx.fillStyle=fg;ctx.beginPath();ctx.arc(SCN.camp.x,SCN.camp.y,120,0,7);ctx.fill();
  ctx.fillStyle='#2a2018';
  for(let k=0;k<5;k++){const a2=k*1.256;ctx.beginPath();ctx.arc(SCN.camp.x+Math.cos(a2)*16,SCN.camp.y+Math.sin(a2)*13,4,0,7);ctx.fill();}
  ctx.fillStyle='rgba(255,190,90,'+(0.6+0.3*Math.sin(now*0.02))+')';
  ctx.beginPath();ctx.arc(SCN.camp.x,SCN.camp.y-2,5,0,7);ctx.fill();
  // the way in, marked
  plb('APPROACH',LZ.x,LZ.y+46,C.shield,13);
}
function drawGround(){
  if(SCN.style==='rock'){drawGroundHaven();return;}
  ctx.drawImage(floorCache(),0,0);
  const biome=groundBiome();
  if(SCN.mode==='stealcross'){
    SA.trail(ctx,[[300,824],[1200,824],[2400,824]],biome,110);
    SA.trail(ctx,[[2030,780],[2110,560],[PAD.x,PAD.y+70]],biome,54);
    SA.trail(ctx,[[LZ.x,LZ.y-90],[400,1050],[470,880]],biome,48);
  } else {
    SA.trail(ctx,[[LZ.x,LZ.y-100],[700,1000],[1000,860],[1300,760],[1500,560],[PAD.x-60,PAD.y+80]],biome,70);
    SA.trail(ctx,[[1420,730],[2160,690]],biome,44);
    SA.trail(ctx,[[1440,80],[1420,300],[1430,420]],biome,44);
  }
  for(const s of scrub){
    ctx.fillStyle='rgba(74,86,44,0.3)';
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();
  }
  for(const d of decals)SA.scorch(ctx,d.x,d.y,d.r);
  // street lamps — warm pools in a dust town
  const lampT=HUD.reduced?0:performance.now()/1000;
  for(const lp of (SCN.mode==='stealcross'?[[600,772],[1104,880],[1590,772],[2044,880]]:(SCN.lamps||[]))){
    SA.lampLight(ctx,lp[0],lp[1]-56,120);
    SA.prop(ctx,'lamp',lp[0],lp[1],{t:lampT});
  }
  // LZ
  ctx.strokeStyle=T.rgba(C.shield,0.55);ctx.lineWidth=3;ctx.setLineDash([16,12]);
  ctx.beginPath();ctx.arc(LZ.x,LZ.y,LZ.r,0,7);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=T.rgba(C.shield,0.06);
  ctx.beginPath();ctx.arc(LZ.x,LZ.y,LZ.r,0,7);ctx.fill();
  if(SCN.lzLabel)plb(SCN.lzLabel,LZ.x,LZ.y+LZ.r+24,C.shield,13);
  // pad
  ctx.fillStyle='#1a1d22';
  ctx.beginPath();
  for(let i=0;i<6;i++){const a=i*Math.PI/3+0.26;const px=PAD.x+Math.cos(a)*110,py=PAD.y+Math.sin(a)*110;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(87,168,255,0.5)';ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='rgba(87,168,255,0.25)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(PAD.x,PAD.y,PAD.r*0.62,0,7);ctx.stroke();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3+0.26;
    const px=PAD.x+Math.cos(a)*110,py=PAD.y+Math.sin(a)*110;
    ctx.fillStyle='rgba(120,190,255,'+(0.5+0.4*Math.sin(performance.now()*0.004+i))+')';
    ctx.beginPath();ctx.arc(px,py,4,0,7);ctx.fill();
  }
}
function drawProps(){
  /* retired: props draw in drawActors' depth sort; dead props leave kit scorch on the ground */
  return;
  const now=performance.now();
  for(const p of PROPS){
    const d=PROPDEF[p.kind];
    ctx.save();ctx.translate(p.x,p.y);
    if(p.dead){
      // rubble — the cover it gave is gone
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.beginPath();ctx.ellipse(3,4,d.r*0.9,d.r*0.6,0,0,7);ctx.fill();
      ctx.fillStyle='#3a3026';
      for(let k=0;k<5;k++){
        const a=k*1.4+p.x;
        ctx.fillRect(Math.cos(a)*d.r*0.5-4,Math.sin(a)*d.r*0.4-3,8+k,5);
      }
      ctx.restore();continue;
    }
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath();ctx.ellipse(4,5,d.r,d.r*0.7,0,0,7);ctx.fill();
    if(p.kind==='barrel'){
      // sealed fuel drum
      ctx.fillStyle='#3c4048';ctx.beginPath();ctx.arc(0,0,d.r,0,7);ctx.fill();
      ctx.strokeStyle='#1c2026';ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle='#ffb454';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(0,0,d.r*0.62,0.4,2.2);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,d.r*0.62,3.5,5.3);ctx.stroke();
      ctx.fillStyle='#181c22';ctx.beginPath();ctx.arc(0,0,3,0,7);ctx.fill();
    } else if(p.kind==='crate'){
      // poly cargo crate, powered seam
      ctx.rotate(0.12);
      ctx.fillStyle='#39404e';ctx.fillRect(-d.r,-d.r,d.r*2,d.r*2);
      ctx.strokeStyle='#181c24';ctx.lineWidth=2;ctx.strokeRect(-d.r,-d.r,d.r*2,d.r*2);
      ctx.strokeStyle='rgba(87,215,226,0.35)';ctx.lineWidth=1.5;
      ctx.strokeRect(-d.r+5,-d.r+5,d.r*2-10,d.r*2-10);
      ctx.fillStyle='rgba(87,215,226,0.7)';
      ctx.fillRect(-2,-d.r+2,4,4);
    } else if(p.kind==='trough'){
      // vehicle charge station
      ctx.fillStyle='#2c3038';ctx.beginPath();ctx.roundRect(-d.r,-13,d.r*2,26,5);ctx.fill();
      ctx.strokeStyle='#14181e';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#0e2434';ctx.beginPath();ctx.roundRect(-d.r+5,-8,d.r*2-10,16,3);ctx.fill();
      for(let k=0;k<3;k++){
        ctx.fillStyle='rgba(87,168,255,'+(0.5+0.4*Math.sin(now*0.004+k*2))+')';
        ctx.beginPath();ctx.arc(-d.r+12+k*16,0,2.6,0,7);ctx.fill();
      }
    } else if(p.kind==='rock'){
      ctx.fillStyle='#39404c';
      ctx.beginPath();
      for(let k=0;k<7;k++){
        const a2=k*0.897+p.x*0.01;
        const rr=d.r*(0.75+0.3*Math.abs(Math.sin(a2*3+p.y)));
        const px2=Math.cos(a2)*rr,py2=Math.sin(a2)*rr*0.85;
        k?ctx.lineTo(px2,py2):ctx.moveTo(px2,py2);
      }
      ctx.closePath();ctx.fill();
      ctx.strokeStyle='#1c2028';ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle='rgba(140,155,175,0.3)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(-d.r*0.4,-d.r*0.3);ctx.lineTo(d.r*0.2,-d.r*0.5);ctx.stroke();
    } else if(p.kind==='canister'){
      const pul=0.55+0.45*Math.sin(now*0.006+p.x);
      ctx.fillStyle='#6e2418';ctx.beginPath();ctx.arc(0,0,d.r,0,7);ctx.fill();
      ctx.strokeStyle='#ff6a3c';ctx.lineWidth=2;ctx.stroke();
      ctx.save();ctx.rotate(Math.PI/4);
      ctx.strokeStyle='rgba(255,210,125,'+(0.5+0.4*pul)+')';ctx.lineWidth=1.6;
      ctx.strokeRect(-4.5,-4.5,9,9);
      ctx.restore();
      ctx.fillStyle='rgba(255,106,60,'+(0.25*pul)+')';
      ctx.beginPath();ctx.arc(0,0,d.r+5,0,7);ctx.fill();
    } else { // utility truck
      ctx.rotate(p.a||0);
      ctx.fillStyle='#2a2c30';
      for(const wx of [-d.r+13,d.r-13]){
        ctx.beginPath();ctx.arc(wx,-21,8,0,7);ctx.fill();
        ctx.beginPath();ctx.arc(wx,21,8,0,7);ctx.fill();
      }
      ctx.fillStyle='#4c5568';ctx.beginPath();ctx.roundRect(-d.r,-18,d.r*1.35,36,5);ctx.fill();   // bed
      ctx.strokeStyle='#20242e';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#5a6478';ctx.beginPath();ctx.roundRect(d.r*0.38,-16,d.r*0.62,32,6);ctx.fill(); // cab
      ctx.stroke();
      ctx.fillStyle='rgba(159,214,255,0.55)';ctx.beginPath();ctx.roundRect(d.r*0.44,-10,8,20,2);ctx.fill();
      ctx.strokeStyle='rgba(255,180,84,0.5)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-d.r+6,0);ctx.lineTo(d.r*0.3,0);ctx.stroke();
    }
    ctx.restore();
  }
}
function drawTurret(now){
  const g=turret.gunner&&U.find(x=>x.id===turret.gunner);
  const col=g?(g.side==='reb'?C.rebel:C.heg):C.text3;
  ctx.save();ctx.translate(TURRET.x,TURRET.y);
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath();ctx.ellipse(4,6,TURRET.r+6,(TURRET.r+6)*0.7,0,0,7);ctx.fill();
  // mount
  ctx.fillStyle='#262a32';ctx.beginPath();ctx.arc(0,0,TURRET.r,0,7);ctx.fill();
  ctx.strokeStyle='#12151c';ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='#3c4250';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,0,TURRET.r*0.62,0,7);ctx.stroke();
  // barrel
  ctx.rotate(turret.face);
  ctx.strokeStyle='#0c0f14';ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(TURRET.r+26,0);ctx.stroke();
  ctx.strokeStyle=col;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(TURRET.r+24,0);ctx.stroke();
  // frontal shield — flank it or eat laser
  const pul=0.5+0.3*Math.sin(now*0.005);
  ctx.strokeStyle=T.rgba(C.shield,0.55+0.3*pul);ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(0,0,TURRET.r+9,-SHIELD_ARC,SHIELD_ARC);ctx.stroke();
  ctx.strokeStyle=T.rgba(C.shield,0.9);ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(0,0,TURRET.r+12,-SHIELD_ARC,SHIELD_ARC);ctx.stroke();
  ctx.restore();
}
function drawWork(now){
  for(const wp of WORK){
    ctx.save();ctx.translate(wp.x,wp.y);
    if(wp.done&&wp.id==='plant'){
      const bl=fac&&!fac.detonated&&Math.sin(now*0.012)>0;
      ctx.fillStyle='#2b2f36';ctx.beginPath();ctx.roundRect(-11,-8,22,16,3);ctx.fill();
      ctx.strokeStyle='#ff9a5c';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=bl?'#ff4f4f':'#5a2a2a';ctx.beginPath();ctx.arc(0,0,3,0,7);ctx.fill();
      ctx.restore();continue;
    }
    if(wp.done){
      ctx.strokeStyle=T.rgba(C.go,0.55);ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,10,0,7);ctx.stroke();
      ctx.restore();continue;
    }
    const pul=0.5+0.5*Math.sin(now*0.005+wp.x);
    if(wp.id==='clamp'){
      ctx.strokeStyle='rgba(255,150,60,'+(0.6+0.3*pul)+')';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(-10,-8);ctx.lineTo(-14,-8);ctx.lineTo(-14,8);ctx.lineTo(-10,8);ctx.stroke();
      ctx.beginPath();ctx.moveTo(10,-8);ctx.lineTo(14,-8);ctx.lineTo(14,8);ctx.lineTo(10,8);ctx.stroke();
      ctx.fillStyle='rgba(255,150,60,0.8)';ctx.beginPath();ctx.arc(0,0,3,0,7);ctx.fill();
    } else if(wp.id==='hack'){
      ctx.strokeStyle='rgba(125,227,236,'+(0.6+0.3*pul)+')';ctx.lineWidth=3;
      ctx.beginPath();ctx.roundRect(-13,-10,26,18,3);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-7,-3);ctx.lineTo(7,-3);ctx.moveTo(-7,2);ctx.lineTo(3,2);ctx.stroke();
    } else if(wp.id==='plant'){
      ctx.strokeStyle='rgba(255,150,60,'+(0.6+0.3*pul)+')';ctx.lineWidth=3;
      ctx.beginPath();ctx.roundRect(-13,-10,26,20,3);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-7,-3);ctx.lineTo(7,-3);ctx.moveTo(-7,3);ctx.lineTo(7,3);ctx.stroke();
    } else if(wp.id==='fuel'){
      // fuel skid + line running to the ship
      ctx.fillStyle='#33383f';ctx.beginPath();ctx.roundRect(-14,-9,28,18,3);ctx.fill();
      ctx.strokeStyle='#181c22';ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle='rgba(255,150,60,'+(0.55+0.3*pul)+')';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(0,-9);
      ctx.quadraticCurveTo(-18,-40,PAD.x-wp.x-14,PAD.y-wp.y+12);
      ctx.stroke();
    } else {
      // the signal mast, waiting for its flag
      const gated=wp.needClear&&hostilesActive().length;
      const al=gated?0.3:(0.6+0.3*pul);
      ctx.strokeStyle='rgba(160,175,200,'+(gated?0.4:0.9)+')';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(0,-26);ctx.stroke();
      ctx.fillStyle='rgba(87,215,226,'+al+')';
      ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(16,-20);ctx.lineTo(0,-14);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
}
function drawVision(){
  if(phase!=='FREE'||town!=='calm')return;
  for(const l of U){
    if(l.side!=='law'||l.down||l.surr||l.office||!lookout(l))continue;
    if(!unitSeen(l))continue;
    const R=sightRange(l);
    const rays=[];
    for(let i=0;i<=12;i++){
      const a=l.face-VIS_ARC+(i/12)*VIS_ARC*2;
      let rr=R;
      for(let d=30;d<R;d+=26){
        if(ptBlocked(l.x+Math.cos(a)*d,l.y+Math.sin(a)*d,0)){rr=d;break;}
      }
      rays.push([l.x+Math.cos(a)*rr,l.y+Math.sin(a)*rr,rr]);
    }
    /* the cone is clipped at walls; blue searchlight, orange band where they spot even sneakers */
    ctx.save();
    ctx.translate(0,-26*actorScale(l));
    ctx.beginPath();ctx.moveTo(l.x,l.y);
    for(const r of rays)ctx.lineTo(r[0],r[1]);
    ctx.closePath();ctx.clip();
    T.sightCone(ctx,l.x,l.y,l.face,VIS_ARC*2,R,R*0.55,{});
    ctx.restore();
    /* point-blank ring: inside it they notice you, cone or no cone */
    ctx.fillStyle=T.rgba(C.hazard,0.07);
    ctx.beginPath();ctx.arc(l.x,l.y,NEAR_R,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=T.rgba(C.hazard,0.45);ctx.lineWidth=1.5;
    ctx.setLineDash([4,6]);
    ctx.beginPath();ctx.arc(l.x,l.y,NEAR_R,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
  }
}
function drawEngageFocus(now){
  const c=engageQ&&engageQ.cur;
  if(!c)return;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  const [ax,ay]=worldToCss(c.s.x,c.s.y-(c.s.veh||c.s.bot?0:26*actorScale(c.s))),[bx,by]=worldToCss(c.t.x,c.t.y-(c.t.obj||c.t.veh||c.t.bot?0:26*actorScale(c.t)));
  if(pickMode==='nadeToss'&&c.stage==='await'){
    ctx.beginPath();ctx.arc(ax,ay,NADE_R*cam.z,0,7);ctx.fillStyle=T.rgba(C.hazard,0.06);ctx.fill();
    ctx.setLineDash([10,8]);ctx.lineWidth=2.5;ctx.strokeStyle=T.rgba(C.hazard,0.7);ctx.stroke();ctx.setLineDash([]);
  }
  T.fireLine(ctx,ax,ay,bx,by,c.s.side==='reb'?'friend':'foe',hudT);
  if(c.t.obj)T.reticle(ctx,bx,by,18,hudT);   // units get their reticle from the token; the canister has no token
  ctx.restore();
}
function drawWallActor(b,now){
  const biome=groundBiome();
  let fade=0;
  for(const u of actorList()){
    if((u.side==='reb'||u.vip)&&u.x>b.x-10&&u.x<b.x+b.w+10&&u.y<b.y+b.h&&u.y>b.y+b.h-40){fade=1;break;}
  }
  SA.wall(ctx,b.x,b.y,b.w,b.h,biome,{fade});
  // the pieces the town still reads: the HQ mast and the cantina's holo-sign
  if(b.mast){
    const mx=b.x+b.w*0.82,my=b.y+b.h*0.3-SA.WALL_H;
    ctx.strokeStyle='#3a3a44';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(mx-12,my+12);ctx.lineTo(mx,my-16);ctx.lineTo(mx+12,my+12);ctx.stroke();
    ctx.beginPath();ctx.moveTo(mx,my-16);ctx.lineTo(mx,my+8);ctx.stroke();
    ctx.fillStyle='rgba(255,80,90,'+(0.35+0.6*(Math.sin(now*0.003)>0.4?1:0))+')';
    ctx.beginPath();ctx.arc(mx,my-18,3,0,7);ctx.fill();
  }
  if(b.sign){
    const flick=Math.sin(now*0.02)>-0.92?1:0.3;
    ctx.fillStyle='rgba(8,12,24,0.85)';
    ctx.beginPath();ctx.roundRect(b.x+b.w/2-74,b.y+b.h+4,148,22,4);ctx.fill();
    ctx.strokeStyle='rgba(87,215,226,'+(0.6*flick)+')';ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 13px '+FONT.ui;ctx.textAlign='center';
    ctx.fillStyle='rgba(125,227,236,'+(0.9*flick)+')';
    ctx.fillText(b.name,b.x+b.w/2,b.y+b.h+20);
  }
  if(b.name&&!b.sign)plb(b.name,b.x+b.w/2,b.y-12,C.text2,13);
}
function drawBldgs(){
  const now=performance.now();
  for(const b of BLDGS){
    if(!b.terrain)continue;
    if(b.terrain){
      const v=(b.x*7+b.y*13)%3;
      ctx.fillStyle=v===0?'#262d38':v===1?'#242b35':'#28303b';
      ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle='rgba(10,14,20,0.4)';ctx.lineWidth=1.5;
      ctx.strokeRect(b.x+0.5,b.y+0.5,b.w-1,b.h-1);
      // speckle
      ctx.fillStyle='rgba(150,165,185,0.07)';
      for(let k=0;k<Math.min(10,(b.w*b.h)/6000);k++){
        const px2=b.x+((b.x*31+k*137)%Math.max(1,b.w-8))+4;
        const py2=b.y+((b.y*17+k*211)%Math.max(1,b.h-8))+4;
        ctx.fillRect(px2,py2,5,3);
      }
      continue;
    }
  }
}
function drawBldgsOld(){
  for(const b of BLDGS){
    const now=performance.now();
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.fillRect(b.x+8,b.y+10,b.w,b.h);
    ctx.fillStyle='#15120e';
    ctx.fillRect(b.x,b.y,b.w,b.h);
    const g=ctx.createLinearGradient(b.x,b.y,b.x+b.w*0.4,b.y+b.h);
    g.addColorStop(0,'#232028');g.addColorStop(1,'#181419');
    ctx.fillStyle=g;
    ctx.fillRect(b.x+5,b.y+5,b.w-10,b.h-10);
    // corrugated sheet roofing
    ctx.strokeStyle='rgba(0,0,0,0.45)';ctx.lineWidth=1;
    for(let px=b.x+14;px<b.x+b.w-8;px+=11){
      ctx.beginPath();ctx.moveTo(px,b.y+6);ctx.lineTo(px,b.y+b.h-6);ctx.stroke();
    }
    // a couple of patched panels
    ctx.fillStyle='rgba(120,110,90,0.10)';
    ctx.fillRect(b.x+b.w*0.14,b.y+b.h*0.18,b.w*0.2,b.h*0.24);
    ctx.fillRect(b.x+b.w*0.6,b.y+b.h*0.55,b.w*0.24,b.h*0.3);
    // solar array quarter
    if(b.solar){
      const sx=b.x+b.w*0.55,sy=b.y+10,sw=b.w*0.38,sh2=b.h*0.4;
      ctx.fillStyle='#122438';ctx.fillRect(sx,sy,sw,sh2);
      ctx.strokeStyle='rgba(87,168,255,0.35)';ctx.lineWidth=1;
      for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(sx+sw*k/4,sy);ctx.lineTo(sx+sw*k/4,sy+sh2);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(sx,sy+sh2/2);ctx.lineTo(sx+sw,sy+sh2/2);ctx.stroke();
      ctx.strokeStyle='#0a1826';ctx.strokeRect(sx,sy,sw,sh2);
    }
    ctx.strokeStyle='#2e2a30';ctx.lineWidth=3;
    ctx.strokeRect(b.x,b.y,b.w,b.h);
    ctx.strokeStyle='rgba(110,100,110,0.4)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(b.x+8,b.y+b.h/2);ctx.lineTo(b.x+b.w-8,b.y+b.h/2);ctx.stroke();
    // comms mast on the HQ
    if(b.mast){
      const mx=b.x+b.w*0.82,my=b.y+b.h*0.3;
      ctx.strokeStyle='#3a3a44';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(mx-12,my+12);ctx.lineTo(mx,my-16);ctx.lineTo(mx+12,my+12);ctx.stroke();
      ctx.beginPath();ctx.moveTo(mx,my-16);ctx.lineTo(mx,my+8);ctx.stroke();
      ctx.fillStyle='rgba(255,80,90,'+(0.35+0.6*(Math.sin(now*0.003)>0.4?1:0))+')';
      ctx.beginPath();ctx.arc(mx,my-18,3,0,7);ctx.fill();
    }
    // window glow along the street side
    const streetSide=b.y<800?b.y+b.h:b.y;
    ctx.fillStyle='rgba(255,180,84,0.5)';
    for(let px=b.x+30;px<b.x+b.w-20;px+=54){
      ctx.beginPath();ctx.arc(px,streetSide+(b.y<800?6:-6),3,0,7);ctx.fill();
    }
    // cantina holo-sign, flickering
    if(b.sign){
      const flick=Math.sin(now*0.02)>-0.92?1:0.3;
      ctx.fillStyle='rgba(8,12,24,0.85)';
      ctx.beginPath();ctx.roundRect(b.x+b.w/2-74,b.y+b.h+4,148,22,4);ctx.fill();
      ctx.strokeStyle='rgba(87,215,226,'+(0.6*flick)+')';ctx.lineWidth=1;ctx.stroke();
      ctx.font='700 13px '+FONT.ui;ctx.textAlign='center';
      ctx.fillStyle='rgba(125,227,236,'+(0.9*flick)+')';
      ctx.fillText(b.name,b.x+b.w/2,b.y+b.h+20);
    }
    if(b.name&&!b.sign)plb(b.name,b.x+b.w/2,b.y-12,C.text2,13);
  }
}
function drawTowerBase(){
  ctx.save();ctx.translate(TOWER.x,TOWER.y);
  ctx.strokeStyle='#241a10';ctx.lineWidth=7;
  ctx.beginPath();
  ctx.moveTo(-40,-40);ctx.lineTo(40,40);ctx.moveTo(40,-40);ctx.lineTo(-40,40);
  ctx.stroke();
  ctx.restore();
}
function drawTowerTop(){
  ctx.save();ctx.translate(TOWER.x,TOWER.y);
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(10,12,TOWER.r,TOWER.r*0.8,0,0,7);ctx.fill();
  ctx.fillStyle='#3a2c1a';ctx.beginPath();ctx.arc(0,0,TOWER.r,0,7);ctx.fill();
  ctx.strokeStyle='#241a10';ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle='#503c24';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,TOWER.r*0.66,0,7);ctx.stroke();
  // condenser vanes
  ctx.strokeStyle='rgba(87,168,255,0.25)';ctx.lineWidth=2;
  for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(0,0,TOWER.r*0.66,k*2.1,k*2.1+1.2);ctx.stroke();}
  ctx.restore();
  plb(SCN.towerLabel||'CONDENSER',TOWER.x,TOWER.y-TOWER.r-10,C.text2,12);
}
/* a landed ship sits on the dirt: a hard ground shadow under the hull so it reads as parked, not hovering */
function groundShadow(x,y,rx,ry){
  ctx.save();ctx.fillStyle='rgba(20,14,10,0.28)';
  ctx.beginPath();ctx.ellipse(x+6,y+10,rx,ry,0,0,7);ctx.fill();ctx.restore();
}
function drawDerelict(now){
  const d=SCN.derelict;
  groundShadow(d.x,d.y,110,38);
  SA.ship(ctx,'graf',d.x,d.y,d.a||0,5.0,HUD.reduced?0:(now||performance.now())/1000,{livery:'civ',damage:0.5,pilot:null,dark:true,off:true});
  plb('DERELICT HAULER',d.x,d.y-94,C.text2,12);
}
function drawGraf(now){
  now=now||performance.now();
  let sc=1,ox=0,oy=0;
  const lifting=!!(extractFx&&extractFx.stage==='lift');
  if(lifting){
    const t=Math.min(1,(now-extractFx.t0)/3200);
    const e=t*t;
    sc=1+t*0.3;
    ox=-e*1500;oy=e*260;
    if(t>=1)return;
  }
  if(!lifting)groundShadow(grafPos.x,grafPos.y,110,38);
  SA.ship(ctx,'graf',grafPos.x+ox,grafPos.y+oy,grafPos.a,5.0*sc,HUD.reduced?0:now/1000,
    {livery:'rebel',dark:true,boost:lifting,off:!lifting});
  if(!(extractFx&&extractFx.stage==='lift'))plb('MARTA',grafPos.x,grafPos.y-96,C.shield,12);
}
function drawCross(now){
  if(crossAway&&!crossFx)return;
  let x=PAD.x,y=PAD.y,sc=1;
  if(crossFx){
    const t=(now-crossFx.t0)/3200;
    if(t>=1){crossFx=null;return;}
    const e=t*t;
    x=PAD.x+e*1400;y=PAD.y-e*180;
    sc=1+t*0.25;
    if(t<0.5)for(let i=0;i<2;i++)parts.push({x:PAD.x+(rng()-0.5)*120,y:PAD.y+(rng()-0.5)*90,vx:(rng()-0.5)*140,vy:-rng()*30,r:3+rng()*4,a:0.4,col:'#b09a78',t0:now,dur:700});
  }
  if(!crossFx)groundShadow(x,y,51,18);
  SA.ship(ctx,'cross',x,y,-0.5,2.2*sc,HUD.reduced?0:now/1000,{livery:'law',dark:true,boost:!!crossFx,off:!crossFx});
  if(!crossAway)plb('FT-4 CROSS',PAD.x,PAD.y+PAD.r+22,C.shield,12);
}

/* ---------- world art: who someone is (artSpec) and what they're doing (artPose) ---------- */
const SA=window.SR_ART;
const actorScale=u=>Math.max(1,0.9/cam.z);
/* item ids to the art kit's gear keys; anything the kit cannot draw is skipped */
const ART_GEAR={riotshield:'shield',blam:'frags'};
const kitArt=kit=>(kit||[]).map(id=>ART_GEAR[id]||id).filter(k=>SA.GEAR&&SA.GEAR[k]);
function artSpec(u){
  const A=SA;
  if(u.art)return u.art;                                 // any rebel, via squadEntry / the pilot entry
  if(u.side==='civ')return A.ARCH.civ;
  if(u.vip&&!u.bot)return A.ARCH.prisoner;
  if(u.autoType==='bruiser')return Object.assign({},A.ARCH.bot,{big:1.25});   // no Bruiser art in the Enemies doc yet
  if(u.arch&&A.ARCH[u.arch])return u._spec||(u._spec=Object.assign({},A.ARCH[u.arch],{gear:kitArt(u.kit)}));   // roster spawns
  if(u.auto)return A.ARCH.bot;
  if(u.shield)return A.ARCH.riot;
  if(u.sheriff)return A.ARCH.sheriff;
  if(u.id==='craw'||/craw/i.test(u.name||''))return A.ARCH.craw;
  if(u.side==='law')return SCN.style==='rock'?A.ARCH.squatter:A.ARCH.deputy;   // Take the Rock's opposition is the Vult gang
  return A.recruit(u.name||u.id);                       // last resort for a rebel with no record (debug spawns)
}
const ORDER_POSE={hack:'hack',work:'work',loot:'loot',man:'man',lockin:'lockin',leave:'extract',treat:'treat'};
/* a fixed per-unit phase so units don't blink and bob in sync — never the live
   position: an offset that moves with the unit speeds the cycle up one way and
   runs it backwards the other */
const animPhase=u=>u._ph!==undefined?u._ph:(u._ph=(SA.util.hashStr(String(u.id||u.name||''))%97)*0.1);
function artPose(u,now){
  const c=engageQ&&engageQ.cur;
  const t=(HUD.reduced?0:now/1000)+animPhase(u);
  const moved=u._ax!==undefined&&Math.hypot(u.x-u._ax,u.y-u._ay)>0.45;
  const sneaking=u.side==='reb'&&!u.auto&&sneak&&phase==='FREE'&&town==='calm';
  let state='idle';
  if(u.down)state='down';
  else if(u.surr)state='surrender';
  else if(u.side==='civ')state=u.cower?'cower':moved?'walk':'idle';
  else if(now-(u._throwT||0)<650)state='throw';
  else if(town==='alerted'&&coolStateG(u)==='panic'&&!u.auto)state='panic';
  else if(c&&c.s===u)state=c.stage==='fire'?'fire':'aim';
  else if(u.jam&&u.order&&u.order.type==='clear')state='reload';
  else if(u.manning)state='man';
  else if((phase==='EXEC'||phase==='ENGAGE')&&u.order&&ORDER_POSE[u.order.type])state=ORDER_POSE[u.order.type];
  else if(moved)state=sneaking?'sneak':(u.order&&u.order.type==='sprint'&&phase==='EXEC'?'run':'walk');
  else if(u.braced)state='overwatch';
  else if(u.bunkered)state='crouch';
  else if(sneaking)state='crouch';
  const vd=SA.viewFor(u.face);
  const pose={state,view:vd.view,dir:vd.dir,t,s:actorScale(u)};
  if(c&&c.s===u&&!u.down)pose.aim=Math.atan2(c.t.y-u.y,c.t.x-u.x);   // pupils and gun track the target exactly
  const wk=u.wkey||(u.wpns&&u.wpns[0]);
  pose.weapon=(wk&&SA.WEAPONS[wk])?wk:null;              // unarmed, fists and the vehicle weapons draw nothing
  const base=(u.art&&u.art.gear)||(u.arch&&!u.art?artSpec(u).gear:null)||[];   // a rebel's kit, or what a roster enemy wears
  const g=[];
  if(u.shield)g.push('shield');
  if(u.side==='reb'&&!u.auto&&!u.vip&&!u.frail&&NADES>0)g.push('frags');
  if(u.stims>0)g.push('stim');
  if(u.charge)g.push('charge');
  if(g.length||base.length)pose.gear=[...new Set(base.concat(g))];
  const conds=(u.inj||[]).filter(i=>!i.treated).map(i=>i.k);
  if(conds.length)pose.conds=conds;                      // a Broken Arm from this fight shows a sling straight away
  return pose;
}
const actorList=()=>U.filter(u=>!u.extracted&&!(u.away&&!u.caged)&&!u.office&&!u.csHide&&!(u.mnt&&enclosed(u))&&unitSeen(u));
function drawActors(now){
  const t=HUD.reduced?0:now/1000;
  const biome=groundBiome();
  /* dead props are scorch on the ground, under everything */
  for(const p of PROPS)if(p.dead)SA.scorch(ctx,p.x,p.y,PROPDEF[p.kind].r*1.5);
  const items=[];
  const list=actorList();
  for(const u of list)items.push({y:u.y,f:()=>drawUnitActor(u,now)});
  for(const p of PROPS)if(!p.dead)items.push({y:p.y,f:()=>SA.prop(ctx,p.kind,p.x,p.y,{t,biome})});
  for(const b of BLDGS)if(!b.terrain)items.push({y:b.y+b.h,f:()=>drawWallActor(b,now)});
  if(SCN.hasGraf)items.push({y:grafPos.y+50,f:()=>drawGraf(now)});
  if(SCN.derelict)items.push({y:SCN.derelict.y+50,f:()=>drawDerelict(now)});
  if(SCN.hasPad)items.push({y:PAD.y+36,f:()=>drawCross(now)});
  items.sort((a,b)=>a.y-b.y);                            // one depth sort by anchor y
  for(const it of items)it.f();
  for(const u of list){u._ax=u.x;u._ay=u.y;}             // cached for next frame's "moved"; never saved
}
function drawUnitActor(u,now){
  const t=(HUD.reduced?0:now/1000)+animPhase(u);
  const sc2=actorScale(u);
  if(u.veh){
    const vd=VEHDEF[u.veh],key=vd.art;
    const c=engageQ&&engageQ.cur;
    const turret=vd.seats.some(x=>x.wkey&&!x.enc);   // an exposed gun seat is a turret that rises when it fires
    const gunnerShot=c&&c.s&&c.s.mnt&&c.s.mnt.v===u.id&&(st=>!!(st&&st.wkey&&!st.enc))(seatOf(c.s));
    if(turret){
      if(gunnerShot)u._tEng=1;
      u._tUp=Math.min(1,(u._tUp||0)+(u._tEng?0.04:0));   // the turret rises once it first engages, and stays up
      if(gunnerShot)u._tAng=Math.atan2(c.t.y-u.y,c.t.x-u.x);
    }
    SA.vehicle(ctx,key,u.x,u.y,u.face,sc2*1.3,t,{livery:'heg',damage:1-u.hp/(u.maxhp||1),
      siren:town==='alerted'&&!u.down,turretUp:u._tUp||0,turretAng:u._tAng,fire:gunnerShot&&c.stage==='fire'});
    return;
  }
  if(u.bot==='strider'||u.autoType==='strider'){
    const vd=SA.viewFor(u.face);
    const p=artPose(u,now);
    SA.strider(ctx,u.x,u.y,{view:vd.view,dir:vd.dir,
      state:p.state==='run'?'walk':['idle','walk','aim','fire','down'].indexOf(p.state)>=0?p.state:'idle',
      mood:u.hacked||u.side==='reb'?'hacked':town==='alerted'?'angry':'friendly',
      damage:1-u.hp/(u.maxhp||1),t,s:sc2*0.85});
    return;
  }
  let x=u.x,y=u.y;
  if(u.mnt&&!enclosed(u)){x+=17;y-=31;}                  // an open gun seat perches on the hull
  SA.character(ctx,x,y,artSpec(u),artPose(u,now));
}
/* rings, pulses and arcs under the feet, flattened into the ground plane */
function hudUnderlay(now){
  hudT=HUD.reduced?0:now/1000;
  const c=engageQ&&engageQ.cur;
  const sel=phase==='PLANNING'?U.find(q=>q.id===selId):null;
  for(const u of actorList()){
    const sc2=actorScale(u);
    const R=(u.veh?48:u.bot?40:u.big?26:20)*sc2;
    const mine=x2=>!!(x2&&(x2===u||(u.veh&&x2.mnt&&x2.mnt.v===u.id)));
    const flat=fn=>{ctx.save();ctx.translate(u.x,u.y);ctx.scale(1,0.5);fn();ctx.restore();};
    if(sel&&!u.down&&mine(sel))flat(()=>{
      ctx.beginPath();ctx.arc(0,0,R+7,0,7);ctx.lineWidth=5;ctx.strokeStyle=C.ink;ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle=C.gold;ctx.stroke();
      for(let i=0;i<4;i++){const a=hudT*1.4+i*Math.PI/2;ctx.beginPath();ctx.arc(0,0,R+12,a-0.18,a+0.18);ctx.lineWidth=4;ctx.strokeStyle=C.gold;ctx.stroke();}
    });
    if(c&&mine(c.s)&&!u.down)flat(()=>{
      const k=(Math.sin(hudT*5)+1)/2;
      ctx.beginPath();ctx.arc(0,0,R+8+k*5,0,7);ctx.strokeStyle=T.rgba(u.side==='law'||(u.veh&&u.owner==='law')?C.heg:C.rebel,0.55-k*0.35);ctx.lineWidth=3;ctx.stroke();
    });
    if(c&&mine(c.t)&&!u.down&&!u.surr)flat(()=>T.reticle(ctx,0,0,R+10,hudT));
    if(u.hacked&&!u.down)flat(()=>{ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(0,0,R+8,0,7);ctx.lineWidth=2.5;ctx.strokeStyle=C.shield;ctx.stroke();ctx.setLineDash([]);});
    if(u.braced&&!u.down&&phase!=='BRIEF')flat(()=>{ctx.beginPath();ctx.arc(0,0,R+5,u.face-0.6,u.face+0.6);ctx.lineWidth=3;ctx.strokeStyle=T.ROLE.hold;ctx.stroke();});
    if(u.id==='sera'&&!crossAway&&!u.down&&dist(u,PAD)<PAD.r){
      const hp2=Math.min(1,(hot+(phase==='FREE'?hotT/4.5:0))/HOT_ROUNDS);
      flat(()=>{
        ctx.beginPath();ctx.arc(0,0,R+10,0,7);ctx.lineWidth=6;ctx.strokeStyle=C.ink;ctx.stroke();
        ctx.beginPath();ctx.arc(0,0,R+10,-Math.PI/2,-Math.PI/2+Math.PI*2*hp2);ctx.lineWidth=3.5;ctx.strokeStyle=C.gold;ctx.stroke();
      });
      if(rng()<0.15)parts.push({x:u.x+(rng()-0.5)*16,y:u.y-4,vx:(rng()-0.5)*40,vy:-30-rng()*30,r:1.2,a:0.9,col:'#ffe9a0',t0:now,dur:300});
    }
  }
}
/* ---------- canvas HUD layer (SR.theme helpers) ----------
   Terrain, buildings, props and FX keep their own art. Everything the player reads
   (unit tokens, pips, cones, rings, markers, labels) is drawn here in screen space:
   pass A before the fog (so the fog still hides what you have not seen), pass B after it. */
let hudT=0;                                   // seconds for pulses; 0 under prefers-reduced-motion
const PLB=[];                                 // place labels queued by the world pass
function plb(text,x,y,col,size){PLB.push({text,x,y,col:col||C.text2,size:size||13});}
const NAMED=/\b(blam|akli|craw|reeve|sera|joss|marta|graf|cross|auto|autos|ar|ft-4)\b/gi;
function sc(t){                               // all-caps game strings read as sentences in the HUD
  t=String(t);
  if(t!==t.toUpperCase()||!/[A-Z]/.test(t))return t;
  t=t.toLowerCase().replace(/^\s*[a-z]/,m=>m.toUpperCase());
  return t.replace(NAMED,w=>{const l=w.toLowerCase();return l==='ft-4'?'FT-4':l==='blam'||l==='ar'?l.toUpperCase():w[0].toUpperCase()+l.slice(1);});
}
function tokR(u){
  let r=Math.max(11,Math.min(15,15*cam.z/0.9));
  if(u.side==='civ')r*=0.62;else if(u.vehicle)r*=1.3;else if(u.big)r*=1.2;
  return r;
}
function coverLevelAt(x,y){                   // 0 none, 1 half (crates, drums), 2 full (rock, truck)
  let best=0;
  for(const p of PROPS){
    const d=PROPDEF[p.kind];
    if(p.dead||d.cov<=0||Math.hypot(p.x-x,p.y-y)>=d.r+34)continue;
    best=Math.max(best,d.cov>=9?2:1);
  }
  return best;
}
const WORK_ICON={clamp:'work',fuel:'work',hack:'hack',plant:'grenade',release:'lock',flag:'star'};
function hudA(now){
  hudT=HUD.reduced?0:now/1000;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  const L=T.labelLayer();
  const inView=(x,y,m)=>x>-m&&x<cssW+m&&y>-m&&y<cssH+m;
  const us=U.filter(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&!u.csHide).map(u=>worldToCss(u.x,u.y));
  /* place names: quiet, and they step back when someone walks under them */
  if(cam.z>0.45){
    for(const p of PLB){
      const [x,y]=worldToCss(p.x,p.y);
      if(!inView(x,y,120))continue;
      ctx.globalAlpha=us.some(q=>Math.hypot(q[0]-x,q[1]-y)<120)?0.4:1;
      T.label(ctx,p.text,x,y,{kind:'place',color:p.col,size:p.size});
    }
    ctx.globalAlpha=1;
  }
  PLB.length=0;
  /* loot (green) and jobs (gold) */
  for(const m of lootMarks){
    if(m.taken)continue;
    const [x,y]=worldToCss(m.x,m.y);
    if(!inView(x,y,60))continue;
    T.marker(ctx,x,y,{icon:'loot',color:C.go,t:hudT,size:24});
    if(cam.z>0.62)L.add(m.label,x,y+30,{color:C.go,size:12,kind:'loot'},1);
  }
  for(const wp of WORK){
    const [x,y]=worldToCss(wp.x,wp.y);
    if(!inView(x,y,60))continue;
    if(wp.done){if(wp.id!=='plant')T.icon(ctx,'check',x,y,18,C.go,{outline:true});continue;}
    const gated=wp.needClear&&hostilesActive().length;
    T.marker(ctx,x,y-6,{icon:WORK_ICON[wp.id]||'work',color:gated?C.seam:C.gold,t:hudT,size:28});
    if(wp.rounds>1){
      for(let k=0;k<wp.rounds;k++){ctx.beginPath();ctx.arc(x-12+k*12,y-42,4.5,0,7);ctx.fillStyle=k<(wp.prog||0)?C.shield:C.ink;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.shield;ctx.stroke();}
    }
    if(wp.t>0){
      ctx.beginPath();ctx.arc(x,y-6,20,0,7);ctx.lineWidth=5;ctx.strokeStyle=C.ink;ctx.stroke();
      ctx.beginPath();ctx.arc(x,y-6,20,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,wp.t/4));ctx.lineWidth=3;ctx.strokeStyle=C.gold;ctx.stroke();
    }
    if(cam.z>0.55)L.add(sc(wp.label),x,y+32,{color:gated?C.text3:C.gold,size:12},2);
  }
  if(SCN.hasTurret&&cam.z>0.55){
    const g=turret.gunner&&U.find(x=>x.id===turret.gunner);
    const [x,y]=worldToCss(TURRET.x,TURRET.y+TURRET.r+22);
    L.add(g?'Turret · '+g.first:'Laser turret · unmanned',x,y,{color:g?(g.side==='reb'?C.rebel:C.heg):C.text3,size:12},1);
  }
  hudUnits(L,now);
  L.flush(ctx);
  ctx.restore();
}
function hudUnits(L,now){
  /* the figures themselves are drawn by drawActors; this pass keeps the readouts */
  for(const u of actorList()){
    const [x,y]=tokCss(u);
    if(x<-70||x>cssW+70||y<-120||y>cssH+70)continue;
    const crew=u.veh?crewIn(u):null;
    const reb=u.side==='reb'||(u.veh&&u.owner==='reb'),civ=u.side==='civ',sera=u.id==='sera';
    const sc2=actorScale(u);
    const topY=u.veh||u.bot?y-(96*sc2+6)*cam.z:y-(60*sc2+6)*cam.z;
    if(!u.down&&!civ){
      if(!u.surr&&!u.veh&&!u.mnt){const cl=u.bunkered?Math.max(1,coverLevelAt(u.x,u.y)):coverLevelAt(u.x,u.y);if(cl)T.coverPip(ctx,x-16*cam.z,y+8,u.bunkered?2:cl);}
      if(!u.surr)T.hpPips(ctx,x,topY,{hp:u.hp,max:u.maxhp});
      if(reb&&u.det>0.5&&town==='calm')T.detectGauge(ctx,x,topY-20*cam.z,Math.min(1,u.det/100));
    }
    if(u.veh&&!u.down){
      /* one pip per seat under the hull: filled when someone is in it */
      const n=u.seats.length;
      u.seats.forEach((st,k)=>{
        const px=x+(k-(n-1)/2)*11,py=y+16*cam.z;
        ctx.beginPath();ctx.arc(px,py,4,0,7);ctx.fillStyle=st.occ?(reb?C.rebel:C.heg):C.ink;ctx.fill();
        ctx.lineWidth=1.5;ctx.strokeStyle=st.wkey?C.gold:C.text3;ctx.stroke();
      });
    }
    /* the gold "ordered" dot stays at the feet; view, face and pose carry the rest */
    if(phase==='PLANNING'&&reb&&!u.down&&(u.veh?crew.some(q=>q.side==='reb'&&q.order):!!u.order)){
      ctx.beginPath();ctx.arc(x+12*cam.z,y+7,5,0,7);ctx.fillStyle=C.gold;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.ink;ctx.stroke();
    }
    const nm=u.veh?(u.down?u.first+' · wreck':crew.length?u.first:u.first+' · empty'):civ?(u.cower?'Civilian · down flat':'Civilian'):u.down?u.first+' · down':u.surr?u.first+' · surrendered':u.first;
    if(u.mnt)continue;   // the gunner's name would sit on the vehicle's
    L.add(nm,x,y+(u.veh?26:16)*cam.z,{color:civ||u.down||u.surr||(u.veh&&!crew.length)?C.text3:sera?C.gold:reb?C.rebel:C.heg,size:civ?11:12},civ?1:3);
  }
}
function drawNades(now){
  for(const g of nades){
    const fl=Math.min(1,(now-g.t0)/650);
    const ax=lerp(g.fx,g.x,fl),ay=lerp(g.fy,g.y,fl)-Math.sin(fl*Math.PI)*46;
    if(fl<1){
      ctx.fillStyle='#d8e2f2';
      ctx.beginPath();ctx.arc(ax,ay,4,0,7);ctx.fill();
      continue;
    }
    const bl=0.5+0.5*Math.sin(now*0.01);
    ctx.strokeStyle=T.rgba(C.hazard,0.35+0.35*bl);
    ctx.lineWidth=2;ctx.setLineDash([5,6]);
    ctx.beginPath();ctx.arc(g.x,g.y,NADE_BLAST,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=T.rgba(C.hazard,0.05+0.05*bl);
    ctx.beginPath();ctx.arc(g.x,g.y,NADE_BLAST,0,7);ctx.fill();
    ctx.fillStyle=bl>0.5?C.hazard:'#d8e2f2';
    ctx.beginPath();ctx.arc(g.x,g.y,4.5,0,7);ctx.fill();
    plb('BLAM',g.x,g.y-22,C.hazard,12);
  }
}
function drawOrders(now){
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  const P=(x,y)=>worldToCss(x,y);
  if(phase==='PLANNING'){
    for(const u of U){
      if(u.side!=='reb'||!u.order||u.down||u.extracted||u.away)continue;
      const o=u.order;
      if(o.type==='move'||o.type==='sprint'){
        const path=pathFor(u,o.tx,o.ty)||[{x:u.x,y:u.y},{x:o.tx,y:o.ty}];
        for(let i=1;i<path.length;i++){
          const a=P(path[i-1].x,path[i-1].y),b=P(path[i].x,path[i].y);
          T.plotLine(ctx,a[0],a[1],b[0],b[1],o.type,hudT);
        }
        const e=P(o.tx,o.ty);
        T.label(ctx,u.mnt?'Drive':o.type==='move'?'Move':'Sprint',e[0],e[1]-20,{kind:'float',color:o.type==='move'?C.rebel:C.gold,size:12});
        const cl=coverLevelAt(o.tx,o.ty);
        if(cl)T.coverPip(ctx,e[0]+18,e[1]-4,cl);
      } else if(o.type==='enter'){
        const v=U.find(x=>x.id===o.vid);
        if(v){const a=P(u.x,u.y),b=P(v.x,v.y);T.plotLine(ctx,a[0],a[1],b[0],b[1],'move',hudT);T.label(ctx,'Get in',b[0],b[1]-tokR(v)-22,{kind:'float',color:C.rebel,size:12});}
      } else if(o.type==='loot'){
        const [x,y]=P(u.x,u.y);
        ctx.beginPath();ctx.arc(x,y,LOOT_AOE*cam.z,0,7);ctx.fillStyle=T.rgba(C.go,0.07);ctx.fill();
        ctx.setLineDash([5,6]);ctx.lineWidth=2.5;ctx.strokeStyle=T.rgba(C.go,0.8);ctx.stroke();ctx.setLineDash([]);
      }
    }
    const sel=U.find(x=>x.id===selId);
    if(sel&&(pickMode==='move'||pickMode==='sprint')){
      const [sx,sy]=P(sel.x,sel.y);
      const reach=reachOf(sel,pickMode),mv=sel.mnt?vehOf(sel)||sel:sel;
      T.moveRing(ctx,sx,sy,reach*cam.z,pickMode);
      /* every cover pocket in reach (a vehicle has no use for them) */
      for(const p of (sel.mnt||sel.bot)?[]:PROPS){
        const def=PROPDEF[p.kind];
        if(p.dead||def.cov<=0||Math.hypot(p.x-sel.x,p.y-sel.y)>reach+def.r+40)continue;
        const [px,py]=P(p.x,p.y);
        ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(px,py,(def.r+34)*cam.z,0,7);ctx.lineWidth=2;ctx.strokeStyle=T.rgba(C.go,0.5);ctx.stroke();ctx.setLineDash([]);
      }
      if(hoverW){
        const d=moveDest(mv,hoverW.x,hoverW.y,reach);
        const p=d&&pathFor(mv,d.x,d.y);
        if(p){
          ctx.globalAlpha=0.6;
          for(let i=1;i<p.length;i++){const a=P(p[i-1].x,p[i-1].y),b=P(p[i].x,p[i].y);T.plotLine(ctx,a[0],a[1],b[0],b[1],pickMode,hudT);}
          ctx.globalAlpha=1;
          const e=P(d.x,d.y),cl=coverLevelAt(d.x,d.y);
          if(cl){T.coverPip(ctx,e[0]+18,e[1]-4,cl);T.label(ctx,'Cover',e[0],e[1]-22,{kind:'float',color:C.go,size:12});}
        }
      }
    } else if(sel&&pickMode==='hack'){
      const [sx,sy]=P(sel.x,sel.y);
      ctx.setLineDash([10,8]);ctx.beginPath();ctx.arc(sx,sy,HACK_R*cam.z,0,7);ctx.lineWidth=2.5;ctx.strokeStyle=T.rgba(C.shield,0.7);ctx.stroke();ctx.setLineDash([]);
    }
  }
  drawPing(now);
  ctx.restore();
}
function drawPing(){
  if(!rtPing)return;
  const t=(performance.now()-rtPing.t0)/500;
  if(t<1){
    const [x,y]=worldToCss(rtPing.x,rtPing.y);
    ctx.beginPath();ctx.arc(x,y,8+t*28,0,7);ctx.lineWidth=3;ctx.strokeStyle=T.rgba(C.gold,0.85*(1-t));ctx.stroke();
  } else rtPing=null;
}
function drawFloaters(now){
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  for(const f of floaters){
    const t=(now-f.t0)/1500;
    if(t>1)continue;
    const [x,y]=worldToCss(f.x,f.y);
    if(x<-100||x>cssW+100||y<-60||y>cssH+60)continue;
    ctx.globalAlpha=t<0.1?t/0.1:1-Math.max(0,(t-0.6)/0.4);
    T.label(ctx,sc(f.text),x,y-34*t,{kind:'float',color:f.col,size:13});
  }
  ctx.globalAlpha=1;ctx.restore();
  floaters=floaters.filter(f=>now-f.t0<1500);
}
function drawFx(now){
  for(const tr of tracers){
    const t=(now-tr.t0)/tr.dur;
    if(t<0||t>1)continue;
    if(tr.beam){
      ctx.globalAlpha=0.9*(1-t*0.6);
      ctx.strokeStyle=T.rgba(tr.col,0.55);ctx.lineWidth=7;
      ctx.beginPath();ctx.moveTo(tr.x1,tr.y1);ctx.lineTo(tr.x2,tr.y2);ctx.stroke();
      ctx.strokeStyle='#fff';ctx.lineWidth=2.2;
      ctx.beginPath();ctx.moveTo(tr.x1,tr.y1);ctx.lineTo(tr.x2,tr.y2);ctx.stroke();
      ctx.globalAlpha=1;
      continue;
    }
    if(tr.heavy){   // the door gun's slugs: long, fat and orange-hot
      const hx=lerp(tr.x1,tr.x2,Math.min(1,t*1.25)),hy=lerp(tr.y1,tr.y2,Math.min(1,t*1.25));
      const bx=lerp(tr.x1,tr.x2,Math.max(0,t*1.25-0.18)),by=lerp(tr.y1,tr.y2,Math.max(0,t*1.25-0.18));
      ctx.lineCap='round';
      ctx.strokeStyle='rgba(255,122,42,0.75)';ctx.lineWidth=7.5;
      ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(hx,hy);ctx.stroke();
      ctx.strokeStyle='#fff3c8';ctx.lineWidth=3.2;
      ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(hx,hy);ctx.stroke();
      continue;
    }
    const hx=lerp(tr.x1,tr.x2,Math.min(1,t*1.6)),hy=lerp(tr.y1,tr.y2,Math.min(1,t*1.6));
    SA.bolt(ctx,tr.x1,tr.y1,hx,hy,tr.kind||'ballistic',tr.side||'heg');
  }
  tracers=tracers.filter(tr=>now-tr.t0<tr.dur+80);
  for(const h of hits){
    const k=(now-h.t0)/h.dur;
    if(k<0||k>1)continue;
    SA.hit(ctx,h.x,h.y,k);
  }
  hits=hits.filter(h=>now-h.t0<h.dur);
  for(const b of boomFx){
    const k=(now-b.t0)/b.dur;
    if(k<0||k>1)continue;
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.R/52,b.R/52);
    SA.explosion(ctx,0,0,k);
    ctx.restore();
  }
  boomFx=boomFx.filter(b=>now-b.t0<b.dur);
  for(const p of parts){
    const t=(now-p.t0)/p.dur;
    if(t<0||t>1)continue;
    ctx.globalAlpha=p.a*(1-t);
    ctx.fillStyle=p.col;
    const px=p.x+p.vx*t*(p.dur/1000),py=p.y+p.vy*t*(p.dur/1000)+(p.flash?0:40*t*t);
    ctx.beginPath();ctx.arc(px,py,p.r*(p.flash?(1-t):1),0,7);ctx.fill();
    ctx.globalAlpha=1;
  }
  parts=parts.filter(p=>now-p.t0<p.dur);
  for(const c of casings){
    const t=(now-c.t0)/700;
    if(t>1)continue;
    ctx.globalAlpha=0.7*(1-t);
    ctx.fillStyle='#d8b25e';
    ctx.fillRect(c.x+c.vx*t,c.y+c.vy*t+120*t*t,2.4,1.4);
    ctx.globalAlpha=1;
  }
  casings=casings.filter(c=>now-c.t0<700);
}
function drawTumbleweed(now){
  tumble.x+=tumble.v*0.016;
  tumble.spin+=0.05;
  tumble.y=830+Math.abs(Math.sin(tumble.x*0.02))*-14;
  if(tumble.x>W+220){tumble.x=-220;tumble.v=26+rng()*22;}
  ctx.save();ctx.translate(tumble.x,tumble.y);ctx.rotate(tumble.spin);
  ctx.strokeStyle='rgba(150,124,72,0.5)';ctx.lineWidth=1.4;
  ctx.beginPath();
  for(let i=0;i<7;i++){const a=i*0.9;ctx.moveTo(0,0);ctx.quadraticCurveTo(Math.cos(a)*10,Math.sin(a)*10,Math.cos(a+0.8)*tumble.r,Math.sin(a+0.8)*tumble.r);}
  ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,tumble.r,0,7);ctx.stroke();
  ctx.restore();
}
/* ---------- VS panel (DOM, docked above the command bar) ---------- */
const vsHost=byId('vsHost');
let vsCtl=null;
function vsModel(now){
  const q=engageQ,c=q.cur;
  const rows=a=>a.map(([lab,val,base])=>({label:sc(lab),val,base:!!base}));
  const side=(u,entries,shown,total,role,icon,totalLabel)=>({
    name:sc(u.name),initials:u.obj?'FC':HUD.initials(u.side==='reb'?u.name:u.first),role,roleIcon:icon,foe:u.side!=='reb',
    mods:rows(entries),shown,total:shown>=entries.length?total:null,totalLabel});
  const showPct=c.revealA>=c.atk.entries.length;
  const need=c.need||needFor(c.tn.total,c.atk.total);
  const rolling=c.stage==='roll',settled=c.stage==='verdict'||c.stage==='fire';
  const face=rolling?(HUD.reduced?null:((Math.floor(now/70)*7)%20)+1):settled?c.roll:null;
  return {
    a:side(c.s,c.atk.entries,c.revealA,c.atk.total,'Attacking','sword','Attack'),
    d:side(c.t,c.tn.entries,c.reveal,c.tn.total,'Defending','shield','Defence'),
    odds:showPct?{pct:pctFor(need),need}:null,
    die:{face,state:rolling?'rolling':settled?(c.hit?'hit':'miss'):'idle'},
    step:'Shot '+Math.min(q.idx,q.list.length)+' of '+q.list.length,
    stamp:settled?{text:c.jammed?'Jam':c.hit?'Hit':'Miss',kind:c.hit?'':'bad'}:null};
}
function vsSync(now){
  const c=engageQ&&engageQ.cur;
  if(phase!=='ENGAGE'||!c){if(!vsHost.hidden){vsHost.hidden=true;measureHud();}return;}
  if(vsHost.hidden){vsHost.hidden=false;if(!vsCtl)vsCtl=HUD.vs(vsHost);vsCtl.set(vsModel(now));measureHud();return;}
  vsCtl.set(vsModel(now));
}
function wrapText(text,maxW){
  const words=text.split(' ');const lines=[];let cur='';
  for(const w of words){
    const t=cur?cur+' '+w:w;
    if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}
    else cur=t;
  }
  if(cur)lines.push(cur);
  return lines.slice(0,3);
}
/* speech bubbles: ink-outlined, with a faction-coloured edge */
function drawBubbles(now){
  for(const b of bubbles){
    const t=(now-b.t0)/b.dur;
    if(t>=1)continue;
    const s=b.unit;
    if(!unitSeen(s))continue;
    const [px,py]=worldToCss(s.x,s.y);
    if(px<-100||px>cssW+100||py<-100||py>cssH+100)continue;
    const alpha=t<0.08?t/0.08:t>0.85?(1-t)/0.15:1;
    const col=s.side==='reb'?C.rebel:C.heg;
    ctx.font='600 12px '+FONT.ui;
    const name=s.first;
    const lines=wrapText(b.text,190);
    ctx.font='800 12px '+FONT.ui;
    let wmax=ctx.measureText(name).width;
    ctx.font='600 12px '+FONT.ui;
    for(const l of lines)wmax=Math.max(wmax,ctx.measureText(l).width);
    const bw=wmax+22,bh=22+lines.length*15,r=tokR(s);
    let bx=px+r+6,by=py-r-24-bh;
    bx=Math.max(6,Math.min(cssW-bw-6,bx));by=Math.max(6,by);
    ctx.globalAlpha=alpha;
    ctx.beginPath();ctx.moveTo(bx+14,by+bh-2);ctx.lineTo(bx+28,by+bh-2);ctx.lineTo(px+r*0.4,py-r-4);ctx.closePath();
    ctx.fillStyle=C.hull;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.ink;ctx.stroke();
    T.chunky(ctx,bx,by,bw,bh,9,C.hull,{drop:3,line:2});
    T.rr(ctx,bx+3,by+3,bw-6,bh-6,7);ctx.lineWidth=2;ctx.strokeStyle=T.rgba(col,0.85);ctx.stroke();
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.font='800 12px '+FONT.ui;ctx.fillStyle=col;ctx.fillText(name,bx+11,by+17);
    ctx.font='600 12px '+FONT.ui;ctx.fillStyle=C.text;
    lines.forEach((l,i)=>ctx.fillText(l,bx+11,by+17+(i+1)*15));
    ctx.globalAlpha=1;
  }
  bubbles=bubbles.filter(b=>now-b.t0<b.dur);
}
/* minimap: its own canvas in the top-right slot */
const mmCv=byId('mm'),mmCtx=mmCv.getContext('2d');
let mmT=0,mmW=0,mmH=0;
function drawMinimap(now){
  if(!mmCv.offsetParent||now-mmT<90)return;
  mmT=now;
  const cw=mmCv.clientWidth,ch=mmCv.clientHeight;
  if(!cw||!ch)return;
  if(mmW!==Math.round(cw*dpr)||mmH!==Math.round(ch*dpr)){mmW=mmCv.width=Math.round(cw*dpr);mmH=mmCv.height=Math.round(ch*dpr);}
  const g=mmCtx;
  g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle=C.void;g.fillRect(0,0,cw,ch);
  const k=Math.min((cw-8)/W,(ch-8)/H),ox=(cw-W*k)/2,oy=(ch-H*k)/2;
  g.fillStyle='#161b30';g.fillRect(ox,oy,W*k,H*k);
  if(SCN.style==='town'){g.fillStyle='rgba(90,68,40,0.5)';g.fillRect(ox+300*k,oy+764*k,1560*k,120*k);}
  for(const b of BLDGS){g.fillStyle=b.terrain?'rgba(58,68,84,0.9)':'rgba(70,54,34,0.9)';g.fillRect(ox+b.x*k,oy+b.y*k,b.w*k,b.h*k);}
  g.lineWidth=1.5;
  g.strokeStyle=T.rgba(C.shield,0.8);g.beginPath();g.arc(ox+LZ.x*k,oy+LZ.y*k,Math.max(3,LZ.r*k),0,7);g.stroke();
  if(PAD!==OFFMAP){g.strokeStyle=T.rgba(C.shield,0.6);g.beginPath();g.arc(ox+PAD.x*k,oy+PAD.y*k,Math.max(3,PAD.r*k),0,7);g.stroke();}
  for(const m of lootMarks){
    if(m.taken||(SCN.fog&&!m.spotted))continue;
    g.fillStyle=C.go;g.fillRect(ox+m.x*k-1.5,oy+m.y*k-1.5,3,3);
  }
  for(const u of U){
    if(u.extracted||u.away)continue;
    if(!unitSeen(u))continue;
    g.fillStyle=u.down||u.surr?C.text3:u.side==='reb'?(u.id==='sera'?C.gold:C.rebel):u.side==='civ'?C.steel:C.heg;
    g.beginPath();g.arc(ox+u.x*k,oy+u.y*k,u.down?2:3.2,0,7);g.fill();
    if(!u.down){g.lineWidth=1.2;g.strokeStyle=C.ink;g.stroke();}
  }
  const hw=cssW/(2*cam.z),hh=cssH/(2*cam.z);
  g.lineWidth=2;g.strokeStyle=C.gold;
  g.strokeRect(ox+(cam.x-hw)*k,oy+(cam.y-hh)*k,hw*2*k,hh*2*k);
}
/* ---------- cutscene ---------- */
const grafPos={x:LZ.x,y:LZ.y,a:0.12};
function startCutscene(){
  phase='CUTSCENE';
  byId('app').classList.add('cine');
  const bn=byId('csBanner');
  bn.querySelector('.big').textContent=SCN.banner[0];
  bn.querySelector('.small').textContent=SCN.banner[1];
  byId('csSkip').hidden=false;
  cs={t0:performance.now(),fired:{}};
  if(SCN.hasGraf){grafPos.x=-500;grafPos.y=H+300;grafState='flying';}
  else {grafPos.x=-99999;grafPos.y=-99999;grafState='landed';}
  for(const u of U)if(u.side==='reb'){u.csHide=true;}
  cam={x:LZ.x,y:LZ.y,z:Math.max(fitZoom()*0.95,0.85)};clampCam();camGoal=null;
  syncUI();
}
function csEvent(key,t,el,fn){if(el>=t&&!cs.fired[key]){cs.fired[key]=1;fn();}}
function csUpdate(now){
  const el=(now-cs.t0)/1000;
  if(!SCN.hasGraf){
    // no ship yet: the squad walks in from the map edge on foot
    const walkers=U.filter(u=>u.side==='reb');
    for(let wi=0;wi<walkers.length;wi++){
      const u=walkers[wi];
      const st=0.5+wi*0.6;
      if(el>st){
        u.csHide=false;
        const t=Math.min(1,(el-st)/2.2);
        u.x=u.spawnX;
        u.y=lerp(H+70,u.spawnY,ease(t));
        u.face=-Math.PI/2;
      }
    }
    // no soldier dialogue in the prologue cinematic; the lead's line plays as a quip after the briefing (A3)
    csEvent('pan',3.8,el,()=>{camGoal={x:SCN.panTo.x,y:SCN.panTo.y,z:0.8};});
    csEvent('banner',4.6,el,()=>{byId('csBanner').classList.add('show');});
    csEvent('banneroff',7.4,el,()=>{byId('csBanner').classList.remove('show');});
    csEvent('back',7.6,el,()=>{camGoal={x:LZ.x+240,y:LZ.y-160,z:0.9};});
    if(el>8.8)endCutscene();
    return;
  }
  // Graf flies in and settles
  if(el<3.2){
    const t=ease(Math.min(1,el/3.2));
    grafPos.x=lerp(-500,LZ.x,t);
    grafPos.y=lerp(H+300,LZ.y,t);
    grafPos.a=lerp(0.5,0.12,t);
  } else {grafPos.x=LZ.x;grafPos.y=LZ.y;grafState='landed';}
  csEvent('land',2.9,el,()=>{
    sLand();shake=now;
    for(let i=0;i<26;i++)parts.push({x:LZ.x+(rng()-0.5)*200,y:LZ.y+(rng()-0.5)*150,vx:(rng()-0.5)*180,vy:-rng()*40,r:3+rng()*5,a:0.5,col:'#b09a78',t0:now,dur:900});
  });
  // squad walks out
  const walkers=U.filter(u=>u.side==='reb');
  for(let wi=0;wi<walkers.length;wi++){
    const u=walkers[wi];
    const st=3.6+wi*0.7;
    if(el>st){
      u.csHide=false;
      const t=Math.min(1,(el-st)/1.6);
      u.x=lerp(LZ.x+70,u.spawnX,ease(t));
      u.y=lerp(LZ.y,u.spawnY,ease(t));
      u.face=Math.atan2(u.spawnY-LZ.y,u.spawnX-(LZ.x+70))||u.face;
      if(t>=1)u.face=-Math.PI/6;
    }
  }
  csEvent('b1',4.4,el,()=>{const l=U.find(u=>u.side==='reb');if(l)say(l,(l.lines&&l.lines[0])||'Move quiet.',3400);});
  csEvent('b2',6.2,el,()=>log('<b>'+grafName()+'</b> <span class="d">(comms):</span> '+SCN.csLine));
  csEvent('b3',7.0,el,()=>say(U.find(u=>u.id==='sera'),'Just get me to that Cross in one piece.',3400));
  csEvent('pan',8.4,el,()=>{camGoal={x:SCN.panTo.x,y:SCN.panTo.y,z:0.8};});
  csEvent('banner',9.4,el,()=>{byId('csBanner').classList.add('show');});
  csEvent('banneroff',12.2,el,()=>{byId('csBanner').classList.remove('show');});
  csEvent('back',12.4,el,()=>{camGoal={x:LZ.x+240,y:LZ.y-160,z:0.9};});
  if(el>13.6)endCutscene();
}
function endCutscene(){
  byId('app').classList.remove('cine');
  byId('csBanner').classList.remove('show');
  byId('csSkip').hidden=true;
  grafPos.x=LZ.x;grafPos.y=LZ.y;grafState='landed';
  for(const u of U)if(u.side==='reb'){u.csHide=false;u.x=u.spawnX;u.y=u.spawnY;u.face=-Math.PI/6;}
  cs=null;
  camGoal={x:LZ.x+240,y:LZ.y-180,z:0.9};
  if(SCN.mode==='haven'&&SCN.tutorial&&phase==='CUTSCENE'){
    // prologue: hold the scene (nothing moves, HUD hidden) and open the Cass comm (A1/A2)
    // Cass's door-gun announcement waits for the Fire Support tutorial card (A5)
    phase='INTRO';
    byId('gCassComm').hidden=false;
    syncUI();
    return;
  }
  fsCassIntro();
  enterFree(null);
}
/* ---------- prologue: Cass's comm window and the soldier quips (A2/A3) ---------- */
function drawGroundStatic(now){
  const g=byId('gCommStatic');
  if(!g)return;
  const r=g.getBoundingClientRect();
  if(!r.width)return;
  if(g.width!==Math.round(r.width*dpr)){g.width=Math.round(r.width*dpr);g.height=Math.round(r.height*dpr);}
  const c2=g.getContext('2d');
  c2.setTransform(dpr,0,0,dpr,0,0);
  const w=r.width,h=r.height;
  const RM=HUD.reduced;
  const t=RM?0:now,nz2=RM?()=>0.5:rng;     // reduced motion: a steady line, no flicker
  c2.fillStyle='#04060d';c2.fillRect(0,0,w,h);
  for(let i=0;i<240;i++){
    c2.fillStyle=T.rgba(C.rebel,nz2()*0.2);
    c2.fillRect(nz2()*w,nz2()*h,1.5,1.5);
  }
  const sy=(t*0.05)%h;
  c2.fillStyle=T.rgba(C.rebel,0.08);c2.fillRect(0,sy,w,7);
  c2.strokeStyle=C.rebel;c2.lineWidth=2;
  c2.beginPath();
  for(let x=0;x<w;x+=3){
    const y=h/2+Math.sin(x*0.08+t*0.01)*6*nz2()+(nz2()-0.5)*8;
    x===0?c2.moveTo(x,y):c2.lineTo(x,y);
  }
  c2.stroke();
  c2.font='700 11px '+FONT.ui;c2.textAlign='left';
  c2.fillStyle=C.text2;
  c2.fillText('Encrypted · rebel net · the Drift',10,15);
}
/* placeholder lines reused from the cinematic and REB_LINES; the designer rewrites them here (A3) */
const PROLOGUE_QUIPS=[
  'That’s the rock. Squatters and all. Let’s go take our home.',
  'If it ticks me off, it goes bang.',
  'Wind’s with us. Take the shot.',
];
let quipsQueued=0;
function prologueQuips(){
  const reb=U.filter(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away);
  quipsQueued=0;
  PROLOGUE_QUIPS.forEach((line,i)=>{
    const u=reb[i];
    if(!u)return;
    quipsQueued++;
    setTimeout(()=>{if(SR.active==='ground'&&!u.down)say(u,line,3200);},i*1600);
  });
}
/* ---------- main render ---------- */
let hoverW=null;
function render(now){
  try{
    const dt=Math.min(0.05,(now-(lastFrame||now))/1000);
    lastFrame=now;
    if(phase==='CUTSCENE'&&cs)csUpdate(now);
    if(phase!=='CUTSCENE')fuelUpdate(now);
    if(phase==='FREE'&&!tutFrozen())rtUpdate(now,dt);   // a pause-card freeze stops movement, detection, AI and timers (A4)
    if(phase==='EXTRACT'&&extractFx)extractUpdate(now,dt);
    if(phase==='EXEC')execUpdate(now);
    vehSync();
    if(phase==='ENGAGE'){try{attackUpdate(now);}catch(e){recover(e);}}
    if(dgRun){try{dgUpdate(now);}catch(e){recover(e);}}
    if(phase==='FREE'||phase==='PLANNING'||phase==='EXEC'||phase==='ENGAGE'){civStep(dt);checkBoss();updateVision(now);}
    if(phase==='INTRO')updateVision(now);   // the held scene stays lit; nothing moves and nothing detects
    tutTick();
    exploTick(now);
    if(camGoal&&camGoal.pts&&phase!=='ENGAGE')camGoal=null;
    if(camGoal){
      resolveGoal(camGoal);
      cam.x=lerp(cam.x,camGoal.x,0.06);cam.y=lerp(cam.y,camGoal.y,0.06);cam.z=lerp(cam.z,camGoal.z,0.06);
      if(!camGoal.pts&&Math.abs(cam.x-camGoal.x)<3&&Math.abs(cam.y-camGoal.y)<3)camGoal=null;
      clampCam();
    } else if(follow&&(phase==='EXEC')){
      camFitSquad(false);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#04060d';ctx.fillRect(0,0,cssW,cssH);
    let shx=0,shy=0;
    if(now-shake<300){const k=(1-(now-shake)/300)*5;shx=(rng()-0.5)*k;shy=(rng()-0.5)*k;}
    ctx.save();
    ctx.translate(cssW/2+shx,cssH/2+shy);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
    drawGround();
    if(SCN.tumbleweed)drawTumbleweed(now);
    drawVision();
    drawWork(now);
    drawFactory(now);
    drawCage(now);
    drawFS(now);
    drawNades(now);
    if(SCN.hasTurret)drawTurret(now);
    if(SCN.hasTower)drawTowerBase();
    drawBldgs();                    // terrain plates only; walls join the actor sort
    hudUnderlay(now);               // rings and arcs under the feet
    drawActors(now);                // props, walls, landed ships and the Bobbleheads, one depth sort
    if(SCN.hasTower)drawTowerTop();
    hudA(now);                      // pips, markers, names: before the fog, so unseen ground stays dark
    drawFog();
    drawFx(now);
    drawDgRun(now);                 // the gun run flies above the fog: everyone watches this
    ctx.restore();
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(phase==='ENGAGE')drawEngageFocus(now);
    drawOrders(now);
    drawFloaters(now);
    drawBubbles(now);
    vsSync(now);
    drawMinimap(now);
    if(phase==='INTRO'&&!byId('gCassComm').hidden)drawGroundStatic(now);
    if(now-alertFlash<900&&alertFlash){
      ctx.fillStyle=T.rgba(C.hazard,0.16*(1-(now-alertFlash)/900));
      ctx.fillRect(0,0,cssW,cssH);
    }
  }catch(e){recover(e);}
}
let recovered=0;
function recover(e){
  if(recovered++>4)return;
  console.error(e);
  engageQ=null;
  if(dgRun||dgQueue.length){dgRun=null;dgQueue.length=0;byId('app').classList.remove('cine');}
  if(phase==='ENGAGE'||phase==='EXEC'){phase='PLANNING';syncUI();}
}
/* ---------- input ---------- */
let drag=null,pinch=null,moved=false;
const ptrs=new Map();
cv.addEventListener('contextmenu',ev=>ev.preventDefault());
cv.addEventListener('pointerdown',ev=>{
  cv.setPointerCapture(ev.pointerId);
  if(ev.button===2){moved=false;return;}
  ptrs.set(ev.pointerId,{x:ev.offsetX,y:ev.offsetY});
  if(ptrs.size===1){drag={x:ev.offsetX,y:ev.offsetY,cx:cam.x,cy:cam.y};moved=false;}
  else if(ptrs.size===2){
    const [a,b]=[...ptrs.values()];
    pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z};drag=null;
  }
});
cv.addEventListener('pointermove',ev=>{
  const p=ptrs.get(ev.pointerId);
  if(p){p.x=ev.offsetX;p.y=ev.offsetY;}
  hoverW=cssToWorld(ev.offsetX,ev.offsetY);
  if(pinch&&ptrs.size===2){
    const [a,b]=[...ptrs.values()];
    const d=Math.hypot(a.x-b.x,a.y-b.y);
    cam.z=pinch.z*(d/pinch.d);clampCam();
    return;
  }
  if(drag){
    const dx=ev.offsetX-drag.x,dy=ev.offsetY-drag.y;
    if(Math.hypot(dx,dy)>7)moved=true;
    if(moved){cam.x=drag.cx-dx/cam.z;cam.y=drag.cy-dy/cam.z;camGoal=null;clampCam();}
  }
});
/* where a unit's token sits on screen: whoever is in an open gun seat perches on the vehicle's roof */
function tokCss(u){
  const p=worldToCss(u.x,u.y);
  if(u.mnt&&!enclosed(u)){const v=vehOf(u),r=v?tokR(v):14;p[0]+=r*0.95;p[1]-=r*0.95;}
  return p;
}
function unitAtCss(px,py){
  let best=null,bd=1e9;
  for(const u of U){
    if(u.down||u.extracted||u.away||u.csHide||u.office||(u.mnt&&enclosed(u)))continue;
    if(!unitSeen(u))continue;
    const [ux,uy]=tokCss(u);
    const d=Math.hypot(px-ux,py-uy);
    if(d<22&&d<bd){bd=d;best=u;}
  }
  return best;
}
cv.addEventListener('pointerup',ev=>{
  ptrs.delete(ev.pointerId);
  if(ptrs.size<2)pinch=null;
  const wasDrag=moved;drag=null;
  if(wasDrag)return;
  A.wake();
  const px=ev.offsetX,py=ev.offsetY;
  if(phase==='FREE'){
    if(tutFrozen())return;   // frozen on a tutorial card: the world takes no clicks until Got it
    // the turret is a clickable station: man it, or step off it
    const wpt0=cssToWorld(px,py);
    if(Math.hypot(wpt0.x-TURRET.x,wpt0.y-TURRET.y)<TURRET.r+14){
      const g=turret.gunner&&U.find(x=>x.id===turret.gunner);
      if(g&&g.side==='reb'){unmanTurret(g);return;}
      if(!g){
        let best=null,bd=1e9;
        for(const u2 of U){
          if(u2.side!=='reb'||u2.id==='sera'||u2.down||u2.extracted||u2.manning)continue;
          const d=dist(u2,TURRET);
          if(d<bd){bd=d;best=u2;}
        }
        if(best){best.goingTurret=1;setRt(best,TURRET.x,TURRET.y+6,sneak?SNEAK_SPEED:RT_SPEED);sTick();}
        return;
      }
    }
    // right-click or a tap on open ground sends the squad; the walk is real time
    const u=unitAtCss(px,py);
    if(ev.button!==2&&u){
      if(u.veh){freeVehClick(u);return;}
      if(hackArm&&u.side==='law'&&u.auto){startFreeHack(u);return;}
      if(u.side==='law'&&!u.surr&&town==='calm'){
        // the player picks the moment the shooting starts
        if(!startAmbush(u))addFloater(u.x,u.y-30,'NO SHOT',C.text3);
        return;
      }
      camGoal=focusGoal(u);sTick();return;
    }
    squadMoveTo(cssToWorld(px,py));
    return;
  }
  if(phase==='PLANNING'){
    const sel=U.find(x=>x.id===selId);
    if(pickMode&&pickMode.startsWith('fs:')){
      const done=fsPlace(pickMode.slice(3),cssToWorld(px,py));
      if(done){pickMode=null;fsDraft=null;}
      syncUI();
      return;
    }
    if(pickMode==='hack'&&sel){
      const t=unitAtCss(px,py);
      if(t&&canHack(sel,t)){sel.order={type:'hack',tid:t.id};sTick();pickMode=null;autoAdvance();syncUI();}
      else addFloater(sel.x,sel.y-40,'PICK A HACKABLE AUTO IN RANGE',C.text3);
      return;
    }
    if(pickMode&&sel){
      const wpt=cssToWorld(px,py);
      const mv=sel.mnt?vehOf(sel):sel;
      const d=moveDest(mv,wpt.x,wpt.y,reachOf(sel,pickMode));
      if(d&&pathFor(mv,d.x,d.y)){
        sel.order={type:pickMode,tx:d.x,ty:d.y};
        sTick();
        pickMode=null;
        autoAdvance();
        syncUI();
      }
      return;
    }
    let u=unitAtCss(px,py);
    if(u&&u.veh){   // a vehicle answers with its crew: the next one still waiting for orders
      const crew=crewIn(u).filter(c=>c.side==='reb'&&!c.ally&&!c.down);
      const at=crew.findIndex(c=>c.id===selId);
      u=crew.find(c=>!c.order&&c.id!==selId)||crew[(at+1)%Math.max(1,crew.length)]||null;
    }
    if(u&&u.side==='reb'&&!u.down){
      selId=u.id;pickMode=null;
      sTick();syncUI();
      return;
    }
    if(selId){selId=null;pickMode=null;syncUI();}
    return;
  }
  if(phase==='ENGAGE'){
    const wpt=cssToWorld(px,py);
    if(pickMode==='nadeToss'&&engageQ&&engageQ.cur&&engageQ.cur.stage==='await'&&NADES>0){
      const s=engageQ.cur.s;
      let dx=wpt.x-s.x,dy=wpt.y-s.y;
      const dd=Math.hypot(dx,dy)||1;
      if(dd>NADE_R){dx*=NADE_R/dd;dy*=NADE_R/dd;}
      const gx=s.x+dx,gy=s.y+dy;
      if(ptBlocked(gx,gy,8)){addFloater(gx,gy-16,'NO LANDING',C.text3);return;}
      throwNade(s,gx,gy);
      return;
    }
    for(const p of PROPS){
      if(p.kind==='canister'&&!p.dead&&Math.hypot(wpt.x-p.x,wpt.y-p.y)<20){retargetCanister(p);return;}
    }
    const u=unitAtCss(px,py);
    if(u)retarget(u);
  }
});
cv.addEventListener('wheel',ev=>{
  ev.preventDefault();
  const k=ev.deltaY<0?1.12:0.89;
  cam.z*=k;camGoal=null;clampCam();
},{passive:false});
/* ---------- HUD sync ---------- */
function $(id){return byId(id);}
const DOCK=$('ctlDock'),PILL=$('pickPill'),FSM=$('fsMenu'),APP=$('app'),STAGE=cv.parentElement;
let barH=104;                 // last measured command-bar height, kept while shots resolve so the camera frame holds still
let lastPhase=null;
/* order cards: label, icon, family and keyboard key are fixed by the design; the tooltip carries the rule */
const OM={
  move:{label:'Move',icon:'move',family:'move',key:'1',rule:'Walk to a spot within reach. The gun stays up, so you can still fire.'},
  sprint:{label:'Sprint',icon:'sprint',family:'move',key:'2',rule:'Run twice as far. No shot this round, but you are harder to hit.'},
  hold:{label:'Hold',icon:'hold',family:'stance',key:'3',rule:'Brace and watch. Fire on anyone who crosses your lane.',
    nums:[{t:'+2 attack braced',kind:'good'},{t:'−2 snap shot',kind:'bad'}]},
  cover:{label:'Take cover',icon:'cover',family:'stance',key:'4',rule:'Dive behind cover you are standing next to. It counts double this round.'},
  lockin:{label:'Lock in',icon:'lockin',family:'nerve',key:'5',rule:'Steady your nerve. A panicking rebel can do nothing else.'},
  loot:{label:'Loot',icon:'loot',family:'util',key:'6',rule:'Grab anything lootable within reach at the end of the round.'},
  work:{label:'Work',icon:'work',family:'util',key:'7',rule:'Finish a job at a panel, clamp or fuel line.'},
  man:{label:'Man gun',icon:'turret',family:'stance',key:'8',rule:'Take the laser turret. Its front plate stops every shot.'},
  leave:{label:'Leave gun',icon:'leave',family:'stance',key:'8',rule:'Step off the turret at the end of the round.'},
  clear:{label:'Un-jam',icon:'unjam',family:'util',key:'8',rule:'Strip and clear a jammed Akli.'},
  hack:{label:'Hack',icon:'hack',family:'util',key:'8',rule:'Take control of an enemy Auto in range. It takes a few rounds.'},
  fs:{label:'Fire support',icon:'firesupport',family:'fight',key:'9',rule:'Call in a supply drop, a strafing run, a gunship, reinforcements, or a vehicle or Bot you brought.'},
  treat:{label:'Treat wound',icon:'patch',family:'util',key:'',rule:'Use a Med Pack to patch the worst untreated injury on yourself or an ally within reach. A stunned or downed ally can only be treated by someone else. A Combat Medic reaches further and a pack covers two wounds.'},
  enter:{label:'Enter',icon:'enter',family:'move',key:'8',rule:'Walk to a vehicle within reach and climb in at the end of the move. Inside an enclosed seat you cannot be shot: the vehicle takes the hits.'},
  exit:{label:'Exit',icon:'leave',family:'move',key:'8',rule:'Get out of the vehicle as the round opens. No shot this round.'},
  switch:{label:'Switch position',icon:'switch',family:'stance',key:'',rule:'Move to another free position in this vehicle as the round opens. No shot this round.'},
  rally:{label:'Rally cry',icon:'firesupport',family:'fight',key:'0',rule:'Hero action, once per mission. Every rebel still on their feet steadies and takes +2 to hit this round.',nums:[{t:'+2 attack, all allies',kind:'good'}]},
  cancel:{label:'Clear',icon:'clear',family:'',key:'X',rule:'Cancel this rebel’s order.'}};
const WICON={};for(const k in WPN)WICON[k]=WPN[k].icon;
function activeWork(s){
  return WORK.find(w=>!w.done&&(!s.mnt||w.inVeh)&&(!w.needSpec||s.spec===w.needSpec)&&(!w.needCharge||s.charge)&&!(w.needClear&&hostilesActive().length)&&Math.hypot(s.x-w.x,s.y-w.y)<MOVE_R+60);
}
function ordersFor(s){
  const used=new Set();
  const card=(ract,extra)=>{
    const m=OM[ract],ex=extra||{};
    const key=used.has(m.key)?'':m.key;used.add(m.key);
    return HUD.order(Object.assign({ract,label:m.label,icon:m.icon,family:m.family,key,
      tip:{title:m.label,rule:m.rule,nums:m.nums}},ex));
  };
  const cur=s.order&&s.order.type;
  const pm=pickMode;
  if(s.manning)return [card('hold',{active:cur==='hold'}),card('leave',{active:cur==='leave'})];
  if(stunned(s))return [card('hold',{disabled:true,why:'Stunned. Another rebel has to treat the wound before they can act.'})];
  if(coolStateG(s)==='panic')return [card('lockin',{active:cur==='lockin'}),card('cancel')];
  if(s.mnt||s.bot)return vehOrders(s,card,cur,pm);
  const nl=lootsWithin(s,LOOT_AOE).length;
  const wp=activeWork(s);
  const g1=[card('move',{active:pm==='move'||(!pm&&cur==='move')}),card('sprint',{active:pm==='sprint'||(!pm&&cur==='sprint'),disabled:cantSprint(s),why:'A leg injury rules out sprinting.'}),
    card('hold',{active:!pm&&cur==='hold'}),
    card('cover',{active:!pm&&cur==='cover',disabled:!inCoverAt(s.x,s.y),why:'Stand next to cover first.'})];
  const g2=[card('lockin',{active:!pm&&cur==='lockin'}),
    card('loot',{active:!pm&&cur==='loot',disabled:!nl,why:'Nothing lootable within reach.',tip:{title:'Loot',rule:OM.loot.rule+(nl?' '+nl+' in reach.':'')}}),
    card('work',{active:!pm&&cur==='work',disabled:!(wp&&s.id!=='sera'&&!s.vip)||injOf(s,'shrapnel'),
      why:injOf(s,'shrapnel')?'Suppressed by shrapnel.':(s.id==='sera'||s.vip)?'This one stays out of the work.':'Get within reach of a job first.'})];
  const g3=[];
  if(!turret.gunner&&dist(s,TURRET)<MOVE_R+60)g3.push(card('man',{active:!pm&&cur==='man'}));
  if(hackTargets(s).length)g3.push(card('hack',{active:pm==='hack'||(!pm&&cur==='hack'),disabled:injOf(s,'shrapnel'),why:'Suppressed by shrapnel.'}));
  if(s.jam)g3.push(card('clear',{active:!pm&&cur==='clear'}));
  {const et=enterTargets(s);if(et.length)g3.push(card('enter',{active:!pm&&cur==='enter',tip:{title:'Enter',rule:OM.enter.rule+' Nearest: '+et[0].name+'.'}}));}
  if(fsItems().length)g3.push(card('fs',{active:fsMenuOn||(pm&&pm.startsWith('fs:'))}));
  if(s.hero)g3.push(card('rally',{active:!pm&&cur==='rally',disabled:!!s.heroUsed||injOf(s,'shrapnel'),why:injOf(s,'shrapnel')?'Suppressed by shrapnel.':'Already used this mission.'}));
  {const tp=treatPick(s),tt=treatTarget(s);g3.push(card('treat',{label:'Treat wound ×'+(s.meds||0),active:!pm&&cur==='treat',disabled:!tp,why:tt&&!s.meds?'No med pack left.':'Nobody within reach has a wound to treat.',tip:{title:'Treat wound',rule:OM.treat.rule+(tp?' Next: '+(tp===s?'yourself':tp.first)+'.':'')}}));}
  const out=[...g1,HUD.sep(),...g2];
  if(g3.length)out.push(HUD.sep(),...g3);
  out.push(HUD.sep(),card('cancel'));
  return out;
}
/* in a seat (or a Bot): Move only from the driver's seat and at the vehicle's speed, Hold only on a gun,
   Lock in still works on the person; no Sprint or Take cover; Loot and Work are out of reach */
function vehOrders(s,card,cur,pm){
  const st=seatOf(s),v=vehOf(s);
  const g1=[],g2=[],g3=[];
  const why=s.bot?'A Bot cannot do that.':'Not from inside a vehicle.';
  if(s.bot||(st&&st.drive))g1.push(card('move',{active:pm==='move'||(!pm&&cur==='move'),
    tip:{title:'Move',rule:s.bot?'Walk up to the Bot\u2019s speed. It keeps its gun up.':'Drive the '+v.name+' up to its speed. The crew can still fire.'}}));
  g1.push(card('hold',{active:!pm&&cur==='hold',disabled:!wpnsOf(s).length,why:'No gun at this position.'}));
  if(!s.bot)g2.push(card('lockin',{active:!pm&&cur==='lockin'}));
  g2.push(card('loot',{disabled:true,why}));
  {const wp=s.mnt&&activeWork(s);g2.push(card('work',{active:!pm&&cur==='work',disabled:!wp,why:wp?'':why}));}
  if(s.mnt){
    for(const x of switchTargets(s))g3.push(card('switch',{label:'Switch to '+x.n.toLowerCase(),active:!pm&&cur==='switch'&&s.order.seat===x.k,attrs:'data-seat="'+x.k+'"',
      tip:{title:'Switch position',rule:OM.switch.rule+' '+x.n+(x.wkey?': '+WPN[x.wkey].name+'.':x.drive?': drives the vehicle.':': a seat, no gun.')}}));
    g3.push(card('exit',{active:!pm&&cur==='exit'}));
  }
  if(fsItems().length)g3.push(card('fs',{active:fsMenuOn||(pm&&pm.startsWith('fs:'))}));
  if(s.hero)g3.push(card('rally',{active:!pm&&cur==='rally',disabled:!!s.heroUsed||injOf(s,'shrapnel'),why:injOf(s,'shrapnel')?'Suppressed by shrapnel.':'Already used this mission.'}));
  const out=[...g1,HUD.sep(),...g2];
  if(g3.length)out.push(HUD.sep(),...g3);
  out.push(HUD.sep(),card('cancel'));
  return out;
}
function whoLead(u){return HUD.avatar({name:u.name,cls:u.id==='sera'?'sr-avatar--pilot':u.side==='law'?'sr-avatar--foe':''});}
function dockHTML(){
  const callBtn=(fs&&fs.reached&&!fs.called)?true:false;
  const detOn=!!(fac&&fac.planted&&!fac.detonated);
  const detBtn=()=>HUD.btn({id:'detBtn',label:'Detonate',icon:'grenade',variant:'danger',size:'lg',soft:facUnsafe(),why:facUnsafe()?'Clear the blast zone first.':'',tip:{title:'Detonate',rule:'Blow the planted charge once everyone is clear.'}});
  if(phase==='FREE'){
    const hasTech=U.some(x=>x.spec==='fieldtech'&&!x.down&&!x.extracted&&!x.away);
    const calm=town==='calm';
    const orders=[HUD.order({id:'sneakBtn',label:'Sneak',icon:'sneak',family:'stance',key:'C',active:sneak,disabled:!calm,why:calm?'':'The alarm is up. Sneaking no longer helps.',
      tip:{title:'Sneak',rule:'Go low and slow: half the pace, but much harder to spot.'}})];
    if(hasTech&&U.some(x=>x.side==='law'&&x.auto&&x.hackRounds&&!x.down))
      orders.push(HUD.order({id:'hackBtn',label:'Hack',icon:'hack',family:'util',active:hackArm,tip:{title:'Hack',rule:OM.hack.rule}}));
    if(U.some(x=>x.side==='reb'&&x.mnt))
      orders.push(HUD.order({id:'vehOutBtn',label:'Exit',icon:'leave',family:'move',tip:{title:'Exit',rule:'Everyone in a vehicle gets out. Tap a vehicle to send the nearest rebel in.'}}));
    let go='';
    if(extractReady())go=HUD.btn({id:'extractBtn',label:'Extract',icon:'extract',variant:'primary',size:'lg',go:true,iconAfter:true});
    else if(callBtn)go=HUD.btn({id:'callBtn',label:'Call in the Marta',icon:'ship',variant:'primary',size:'lg',go:true,iconAfter:true});
    else if(detOn)go=detBtn();
    const hint=(SR.touch?'Tap to move. Tap an enemy to open fire.':'Right-click to move. Click an enemy to ambush.')+(crossAway?'':' Watch the sight cones.');
    return HUD.cmdbar({
      who:{lead:'<span class="sr-avatar">'+HUD.ico('soldier')+'</span>',name:sneak?'Sneaking':'Walking',hint},
      orders,go:go?{html:go}:null});
  }
  if(phase==='PLANNING'){
    const s=U.find(x=>x.id===selId);
    const squad=plotted(),done=squad.filter(u=>u.order).length;
    const extra=(callBtn?HUD.btn({id:'callBtn',label:'Call in the Marta',icon:'ship',size:'sm'}):'')+(detOn?detBtn().replace('sr-btn--lg','sr-btn--sm'):'');
    return HUD.cmdbar({
      who:s?{lead:whoLead(s),name:s.name,hint:'Choose an order'}:
        {lead:'<span class="sr-avatar">'+HUD.ico('soldier')+'</span>',name:'Squad orders',hint:SR.touch?'Tap a rebel to give orders':'Pick a rebel to give orders'},
      orders:s?ordersFor(s):[],
      go:{html:extra+HUD.btn({id:'executeBtn',label:'Execute',icon:'execute',variant:'primary',size:'lg',go:true,iconAfter:true}),
        count:'<b>'+done+'</b> of '+squad.length+' ordered',countTip:{title:'Orders',rule:'Rebels without orders stand fast.'}}});
  }
  const c=engageQ&&engageQ.cur;
  if(c&&c.stage==='await'){
    const canNade=c.s.side==='reb'&&NADES>0&&!c.s.manning&&!c.s.mnt&&!c.s.bot;
    let n=0;
    const key=()=>{n++;return n<=9?String(n):'';};
    const orders=[];
    for(const w of wpnsOf(c.s)){
      const ok=validShot(c.s,c.t,w);
      let why='';
      if(!ok){
        if(w==='akli'&&c.s.jam)why='The Akli is jammed.';
        else if(dist(c.s,c.t)>WPN[w].rng)why='Out of range.';
        else if(losBlocked(c.s,c.t))why='No clear line of sight.';
        else why='No shot from here.';
      }
      orders.push(HUD.order({label:WPN[w].name,icon:WICON[w]||'gun',family:'fight',key:key(),active:w===c.wkey&&pickMode!=='nadeToss',
        disabled:!ok,why,attrs:'data-wsel="'+w+'"',tip:{title:WPN[w].name,rule:'Damage '+WPN[w].d0+' to '+WPN[w].d1+', range '+WPN[w].rng+'.'}}));
    }
    if(canNade)orders.push(HUD.order({label:'Grenade ×'+NADES,icon:'grenade',family:'fight',key:key(),active:pickMode==='nadeToss',attrs:'data-nade',
      tip:{title:'BLAM frag',rule:'Tap the ground to throw. It lands primed and goes off next round.'}}));
    if(c.s.side==='reb'&&c.s.stims>0)orders.push(HUD.order({label:'Stim ×'+c.s.stims,icon:'stim',family:'util',key:key(),attrs:'data-stim',
      disabled:c.s.hp>=c.s.maxhp,why:'Already at full health.',tip:{title:'Stim',rule:'Heal 30% of max health. Costs the shot.'}}));
    return HUD.cmdbar({
      who:{lead:whoLead(c.s),name:c.s.name,hint:pickMode==='nadeToss'?'Tap the ground to throw. It goes off next round.':'Pick a weapon or retarget'},
      orders,go:{html:HUD.btn({id:'attackBtn',label:'Attack',icon:'attack',variant:'primary',size:'lg'})+
        HUD.btn({id:'holdBtn',label:'Hold fire',variant:'ghost',size:'sm'}),
        count:'Shot <b>'+Math.min(engageQ.idx,engageQ.list.length)+'</b> of '+engageQ.list.length}});
  }
  return '';
}
/* rail rows */
const ORDER_TAG={move:['move','Move'],sprint:['sprint','Sprint'],hold:['hold','Hold'],cover:['cover','Cover'],lockin:['lockin','Lock in'],rally:['firesupport','Rally'],treat:['patch','Treat'],loot:['loot','Loot'],work:['work','Work'],man:['turret','Man gun'],leave:['leave','Leave gun'],enter:['enter','Enter'],exit:['leave','Exit'],switch:['switch','Switch'],clear:['unjam','Un-jam'],hack:['hack','Hack']};
const tag=HUD.tag;
function statusTag(u){
  if(u.veh){
    if(u.down)return tag('Wrecked','bad');
    const n=crewIn(u).length;
    return n?tag(n+' aboard',u.owner==='reb'?'friend':'','vehicle'):tag('Empty','');
  }
  if(u.caged)return tag('In the cell','action');
  if(u.away)return tag('In the air','good');
  if(u.extracted)return tag('Extracted','good');
  if(u.down)return tag('Down','bad');
  if(u.surr)return tag('Surrendered','');
  if(u.manning)return tag('On turret','friend','turret');
  if(u.office)return tag('In his office','');
  if(u.id==='sera'&&!crossAway&&dist(u,PAD)<PAD.r)return tag('Hotwiring '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,'action');
  if(u.jam)return tag('Jammed','bad','unjam');
  if(stunned(u))return tag('Stunned','bad');
  if(hasInj(u))return tag(Rebel.INJK[u.inj.find(i=>!i.treated).k].n,'bad');
  if(u.side==='reb'&&phase==='PLANNING'){
    if(!u.order)return '<span class="sr-ordertag sr-ordertag--none">No orders</span>';
    const m=ORDER_TAG[u.order.type]||['move',u.order.type];
    return '<span class="sr-ordertag">'+HUD.ico(m[0])+m[1]+'</span>';
  }
  if(u.mnt){const st=seatOf(u),v=vehOf(u);if(st&&v)return tag(st.n+' \u00b7 '+v.first,u.side==='reb'?'friend':'',st.wkey?'turret':'vehicle');}
  if(u.side==='reb'&&phase==='FREE'&&u.rtPath)return tag('Moving','',null);
  if(u.side==='law'&&inCoverAt(u.x,u.y))return tag('Cover','good','cover');
  return '';
}
function nerveHtml(u){
  if(u.auto||u.veh||u.down||u.surr||u.extracted||u.away||u.side==='civ')return '';
  const st=coolStateG(u);
  if(st==='panic'){
    if(town!=='alerted')return '';
    return '<span class="sr-nerve sr-nerve--panic"'+HUD.tip('Panicking','Lock in only.')+'>'+HUD.ico('panic')+'Panicking</span>';
  }
  if(u.side==='law')return '';
  return st==='cool'?'<span class="sr-nerve sr-nerve--cool">'+HUD.ico('cool')+'Cool</span>':'<span class="sr-nerve sr-nerve--steady">Steady</span>';
}
function unitRow(u){
  const foe=u.side==='law'||(u.veh&&u.owner==='law'),c=engageQ&&engageQ.cur;
  const frac=u.maxhp?u.hp/u.maxhp:0;
  let cells='';
  for(let i=0;i<5;i++)cells+='<i class="sr-hp__cell'+(u.hp>i*(u.maxhp/5)?' is-on':'')+'"></i>';
  const hp='<span class="sr-hp'+(frac<0.35?' sr-hp--low':frac<0.6?' sr-hp--mid':'')+'"><span class="sr-hp__cells">'+cells+'</span>'+
    (foe?'':'<span class="sr-hp__num">'+Math.max(0,Math.round(u.hp))+'</span>')+'</span>';
  const nm=u.name+(u.charge?' ✸':'')+(u.spec==='fieldtech'?' ⌨':'');
  const gone=u.down||u.extracted||u.away||u.surr;
  const cls='sr-unit'+(foe?' sr-unit--foe':'')+(u.id===selId?' is-selected':'')+(gone?' is-down':'')+(c&&c.s===u?' is-acting':'');
  const av=foe?HUD.avatar({initials:HUD.initials(u.first),cls:'sr-avatar--foe'}):
    HUD.avatar({name:u.name,cls:u.id==='sera'?'sr-avatar--pilot':'',badge:u.id==='sera'?'pilot':(u.auto||u.vip)?null:'soldier'});
  const body='<span class="sr-unit__main"><span class="sr-unit__top"><span class="sr-unit__name">'+nm+'</span>'+
    (foe||u.vip||u.veh?'':'<span class="sr-unit__role">Lv '+(u.level||1)+'</span>')+'</span>'+hp+'</span>'+
    '<span class="sr-unit__side">'+statusTag(u)+nerveHtml(u)+'</span>';
  const st=u.id==='sera'?' style="--c:var(--sr-gold)"':'';
  return (foe||u.veh)?'<div class="'+cls+'"'+st+'>'+av+body+'</div>':
    '<button type="button" class="'+cls+'"'+st+' data-unit="'+u.id+'">'+av+body+'</button>';
}
function lootRow(icon,label,val,col){return '<div class="sr-loot" style="--c:'+col+'">'+HUD.ico(icon)+label+'<b>'+val+'</b></div>';}
function lootHtml(){
  let h='';
  if(tally.c)h+=lootRow('credits','Credits','+'+tally.c,'var(--sr-res-credits)');
  if(tally.s)h+=lootRow('supplies','Supplies','+'+tally.s,'var(--sr-res-supplies)');
  const cnt={};for(const it of tally.items)cnt[it]=(cnt[it]||0)+1;
  for(const k in cnt)h+=lootRow('loot',Items.name(k),'×'+cnt[k],'var(--sr-go)');
  if(NADES>0)h+=lootRow('grenade','BLAM frag grenade','×'+NADES,'var(--sr-hazard)');
  return h||'<div class="sr-empty">Nothing yet. Check tills, crates and lockers.</div>';
}
const PHASE_UI={FREE:['free','Free move'],PLANNING:['plan','Planning'],EXEC:['exec','Moving'],ENGAGE:['fight','Engagement'],CUTSCENE:['exec','Insertion'],EXTRACT:['exec','Extraction'],GAMEOVER:['exec','Debrief'],BRIEF:['exec','Briefing'],INTRO:['exec','Briefing']};
const BANNER_PHASES={FREE:1,PLANNING:1,EXEC:1,ENGAGE:1,EXTRACT:1};
function objRow(o){
  let t=o.t,count='';
  const m=/^(.*?)\s+—\s+(\d+\/\d+)$/.exec(t);
  if(m){t=m[1];count=m[2];}
  return '<div class="sr-obj'+(o.done?' is-done':o.cur?' is-current':'')+'"><span class="sr-obj__mark">'+(o.done?HUD.ico('check'):'')+'</span><span>'+t+'</span>'+
    (count?'<span class="sr-obj__count">'+count+'</span>':'')+'</div>';
}
function syncTop(){
  const [ph,name]=PHASE_UI[phase]||PHASE_UI.BRIEF;
  const alerted=town==='alerted';
  HUD.phase($('phasePlate'),{phase:ph,status:alerted?'alert':'calm',name,text:alerted?SCN.alertLabel:SCN.calmLabel,
    round:phase==='FREE'&&sneak?'Sneaking':'Round '+Math.max(1,round),icon:alerted?'panic':'eye'});
  if(phase!==lastPhase){
    if(lastPhase&&BANNER_PHASES[phase]){
      HUD.banner(STAGE,{text:name,sub:phase==='FREE'?(alerted?SCN.alertLabel:SCN.calmLabel):'Round '+Math.max(1,round),color:'var(--sr-phase-'+ph+')'});
    }
    lastPhase=phase;
  }
}
function syncUI(){
  syncTop();
  // objectives
  const sera=U.find(u=>u.id==='sera');
  const soldiers=U.filter(u=>u.side==='reb'&&u.id!=='sera');
  const ext=soldiers.filter(u=>u.extracted).length;
  let objs;
  if(SCN.mode==='haven'){
    const foesAll=U.filter(u=>u.side==='law');
    const downN=foesAll.filter(u=>u.down||u.surr).length;
    const flag=WORK.find(w=>w.id==='flag');
    const cleared=downN>=foesAll.length&&foesAll.length>0;
    objs=[
      {t:'Move up the canyon to the base mouth',done:tutFlags.moved||town==='alerted',now:!(tutFlags.moved||town==='alerted')},
      {t:'Clear the squatters off the rock — '+downN+'/'+foesAll.length,done:cleared,now:!cleared},
      {t:'Raise the signal in the command room',done:!!(flag&&flag.done),now:cleared},
    ];
  } else if(ix){
    const tech=U.find(u=>u.spec==='fieldtech'&&!u.down);
    const hk=WORK.find(w=>w.id==='hack');
    if(!ix.reached&&tech&&U.some(u=>u.side==='reb'&&!u.away&&!u.down&&dist(u,PAD)<260))ix.reached=true;
    objs=[
      {t:'Reach the databank terminal'+(tech?' — '+tech.first+' is the hacker':''),done:ix.reached||ix.hacked,now:!ix.reached&&!ix.hacked},
      {t:'Hack the databanks — '+Math.min((hk&&hk.prog)||0,3)+'/3',done:ix.hacked,now:ix.reached&&!ix.hacked},
      {t:'Extract with the stolen data — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:ix.hacked},
    ];
  } else if(rs){
    const v=U.find(u=>u.vip);const nm=v?v.first:'the prisoner';const RO=SCN.releaseText?SCN.releaseText.obj:null;
    if(!rs.reached&&v&&U.some(u=>u.side==='reb'&&!u.away&&!u.down&&dist(u,{x:SCN.cage.dx,y:SCN.cage.dy})<260))rs.reached=true;
    objs=[
      {t:RO?RO[0]:'Reach the detention cage',done:rs.reached||rs.released,now:!rs.reached&&!rs.released},
      {t:RO?RO[1]:'Release '+nm+' from confinement',done:rs.released,now:rs.reached&&!rs.released},
      {t:(RO?RO[2]:'(Optional) Stay unseen'),done:rs.released&&!rs.everAlerted&&phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:false},
      {t:(RO?RO[3]:'Get '+nm+' and the squad aboard')+' — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:rs.released},
    ];
  } else if(fac&&SCN.mode==='towers'){
    const carrier=U.find(u=>u.charge&&!u.down);
    objs=[
      {t:'Reach the comm tower'+(carrier?' — '+carrier.first+' carries the '+(carrier.device==='limpet'?'data limpet':'charge'):''),done:fac.planted,now:!fac.planted},
      {t:'Attach the device to the tower base',done:fac.planted,now:false},
      {t:'(Optional) Stay unseen',done:fac.planted&&fac.quiet&&phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:false,fail:fac.everAlerted&&!fac.planted},
      {t:'Get the squad back to the Marta — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:fac.detonated},
    ];
  } else if(fac){
    const carrier=U.find(u=>u.charge&&!u.down);
    objs=[
      {t:'Get the charge to the Power Plant’s main breaker'+(carrier?' — '+carrier.first+' carries it':''),done:fac.planted,now:!fac.planted},
      {t:'Plant it',done:fac.planted,now:false},
      {t:'Clear the blast zone, then detonate',done:fac.detonated,now:fac.planted&&!fac.detonated},
      {t:'(Optional) Stay unseen until it blows',done:fac.detonated&&fac.quiet,now:false,fail:fac.everAlerted&&!fac.detonated},
      {t:'Get the squad back to the Marta — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:fac.detonated},
    ];
  } else if(fs){
    objs=[
      {t:'Reach the fuel depot',done:fs.reached,now:!fs.reached},
      {t:'Call in the Marta and land her on the apron',done:fs.landed,now:fs.reached&&!fs.landed},
      {t:'Defend her while the tanks fill — '+Math.min(fs.pump,FUEL_ROUNDS)+'/'+FUEL_ROUNDS,done:fs.done,now:fs.landed&&!fs.done},
      {t:'Get the squad aboard — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:fs.done},
    ];
  } else {
  const wClamp=WORK.find(w=>w.id==='clamp'),wFuel=WORK.find(w=>w.id==='fuel');
  objs=[
    {t:'Get Sera to the Cross on the north pad',done:!!(sera&&(sera.reached||sera.away)),now:!(sera&&sera.reached)},
    {t:'Protect her while she hotwires — '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,done:hot>=HOT_ROUNDS||crossAway,now:!!(sera&&sera.reached&&hot<HOT_ROUNDS&&!crossAway)},
    {t:'Release the docking clamps',done:!!(wClamp&&wClamp.done)||crossAway,now:!!(sera&&sera.reached&&wClamp&&!wClamp.done)},
    {t:'Pull the fuel line',done:!!(wFuel&&wFuel.done)||crossAway,now:!!(sera&&sera.reached&&wFuel&&!wFuel.done)},
    {t:'Cross in the air',done:crossAway,now:false},
    {t:'Extract the squad at the Graf — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:crossAway},
  ];
  }
  {
    const first=objs.find(o=>o.now&&!o.done)||objs.find(o=>!o.done);
    for(const o of objs)o.cur=!o.done&&(o.now||(!objs.some(x=>x.now&&!x.done)&&o===first));
    const ob=$('objBox'),hideO=phase==='BRIEF'||phase==='CUTSCENE'||phase==='INTRO'||phase==='GAMEOVER';
    ob.hidden=hideO;
    ob.classList.toggle('is-compact',phase==='PLANNING'||phase==='EXEC'||phase==='ENGAGE');
    HUD.render($('objList'),objs.map(objRow).join(''));
  }
  // rail
  const reb=U.filter(u=>u.side==='reb');
  const rebV=U.filter(v=>v.veh&&v.owner==='reb'&&!v.extracted);
  $('squadCount').textContent=reb.filter(u=>!u.down).length+'/'+reb.length;
  HUD.render($('rosterR'),reb.map(unitRow).join('')+rebV.map(unitRow).join(''));
  $('foeHead').textContent=SCN.foesLabel;
  if(town==='calm'){
    $('foeCount').textContent='';
    HUD.render($('rosterE'),'<div class="sr-empty">'+(SCN.mode==='haven'?'The squatters don’t know you’re here — yet.':'No contacts. The town suspects nothing — yet.')+'</div>');
  } else {
    const law=U.filter(u=>u.side==='law'||(u.veh&&u.owner==='law'));
    const seen=law.filter(u=>unitSeen(u)||u.down||u.surr),hidden=law.length-seen.length;
    $('foeCount').textContent=seen.length+' seen';
    HUD.render($('rosterE'),seen.map(unitRow).join('')+(hidden?'<div class="sr-unit sr-unit--ghost">'+HUD.ico('signal')+'<span><b>'+hidden+' contact'+(hidden===1?'':'s')+'</b> out of sight</span></div>':''));
  }
  HUD.render($('lootTally'),lootHtml());
  $('drawerBadge').hidden=!reb.some(u=>!u.extracted&&(u.down||(town==='alerted'&&!u.surr&&coolStateG(u)==='panic')));
  syncBar();
  measureHud();
}
function pickText(){
  if(pickMode==='nadeToss')return 'Tap where the BLAM lands';
  if(pickMode==='hack'||(hackArm&&phase==='FREE'))return 'Tap an Auto to hack';
  if(pickMode&&pickMode.startsWith('fs:')){
    if(fsDraft)return 'Tap where the run ends';
    const key=pickMode.slice(3);
    const fa=key[0]==='s'&&FS?FS.ships[+key.slice(1)]:null;
    return fa&&fa.mode==='doorgun'?'Tap where you want door gunner cover':'Tap a visible spot';
  }
  const s=U.find(x=>x.id===selId);
  return 'Pick a destination for '+(s?s.first:'the squad');
}
function syncBar(){
  const c=engageQ&&engageQ.cur;
  const pick=!!pickMode||(hackArm&&phase==='FREE');
  PILL.hidden=!pick;
  if(pick)HUD.render(PILL,pickText()+' <span class="sr-kbd">Esc</span>');
  if(phase!=='PLANNING')fsMenuOn=false;
  const fsl=fsItems();
  const fsBox=byId('fsBox'),fsLive=!!FS&&phase!=='BRIEF'&&phase!=='CUTSCENE'&&phase!=='GAMEOVER';
  fsBox.hidden=!fsLive;
  if(fsLive){
    const canCall=phase==='PLANNING'&&fsl.length>0;
    HUD.render(byId('fsBtnHost'),HUD.btn({id:'fsBtn',label:'Fire support',icon:'firesupport',size:'sm',soft:!canCall,
      pressed:canCall?fsMenuOn:null,
      tip:{title:'Fire support',rule:'Call in the support you arranged: a supply drop, a strafing run, a door gunner or reinforcements.'},
      why:canCall?'':fsl.length?'Calls are made while planning the round.':'Everything arranged for this run has been used.'})+
      (fsl.length?'<span class="sr-badge">'+fsl.length+'</span>':''));
  }
  FSM.hidden=!(fsMenuOn&&fsl.length);
  if(!FSM.hidden)HUD.render(FSM,'<div class="sr-window__head"><span class="sr-window__title">Fire support</span></div><div class="sr-window__body sr-stack">'+
    fsl.map(i=>'<button type="button" class="sr-choice" data-fs="'+i.key+'"><b>'+i.name+'</b><span class="sr-fine">'+i.sub+'</span></button>').join('')+'</div>');
  let html=(phase==='PLANNING'||phase==='ENGAGE'||phase==='FREE')?dockHTML():'';
  if(!html&&phase==='ENGAGE'&&c)html='<div class="sr-dockspacer" style="height:'+barH+'px"></div>';   // hold the dock's height while a shot resolves
  DOCK.hidden=!html;
  HUD.render(DOCK,html);
  HUD.fitBar(DOCK);
  const cb=DOCK.querySelector('.sr-cmdbar');
  if(cb&&cb.offsetHeight)barH=cb.offsetHeight;
}
/* ---------- DOM events ---------- */
function orderAct(act,el){
  const s=U.find(x=>x.id===selId);
  if(!s)return;
  sTick();
  if(act==='move'){pickMode='move';}
  else if(act==='sprint'){if(!cantSprint(s))pickMode='sprint';}
  else if(act==='hack'){pickMode='hack';}
  else if(act==='fs'){fsMenuOn=!fsMenuOn;}
  else if(act==='hold'){s.order={type:'hold'};autoAdvance();}
  else if(act==='cover'){s.order={type:'cover'};autoAdvance();}
  else if(act==='lockin'){s.order={type:'lockin'};autoAdvance();}
  else if(act==='treat'){if(treatPick(s)){s.order={type:'treat'};autoAdvance();}}
  else if(act==='rally'){if(s.hero&&!s.heroUsed){s.order={type:'rally'};autoAdvance();}}
  else if(act==='work'){
    const wp=activeWork(s);
    if(wp){s.order={type:'work',wp:wp.id};autoAdvance();}
  }
  else if(act==='loot'){
    if(lootsWithin(s,LOOT_AOE).length){s.order={type:'loot'};autoAdvance();}
  }
  else if(act==='man'){s.order={type:'man'};autoAdvance();}
  else if(act==='enter'){const v=enterTargets(s)[0];if(v){s.order={type:'enter',vid:v.id};autoAdvance();}}
  else if(act==='exit'){if(s.mnt){s.order={type:'exit'};autoAdvance();}}
  else if(act==='switch'){const k=el&&el.getAttribute('data-seat');if(s.mnt&&k){s.order={type:'switch',seat:k};autoAdvance();}}
  else if(act==='leave'){s.order={type:'leave'};autoAdvance();}
  else if(act==='clear'){s.order={type:'clear'};sJamClr();autoAdvance();}
  else if(act==='cancel'){s.order=null;selId=null;}
  syncUI();
}
DOCK.addEventListener('click',ev=>{
  const b=ev.target.closest('button');
  if(!b||b.disabled)return;
  const act=b.getAttribute('data-ract');
  if(act){orderAct(act,b);return;}
  if(b.id==='executeBtn')execute();
  else if(b.id==='sneakBtn')setSneak(!sneak);
  else if(b.id==='hackBtn'){hackArm=!hackArm;syncUI();}
  else if(b.id==='vehOutBtn')freeAllOut();
  else if(b.id==='extractBtn')startExtract();
  else if(b.id==='callBtn')callTransport();
  else if(b.id==='detBtn')facDetonate();
  else if(b.id==='attackBtn')playerAttack();
  else if(b.id==='holdBtn')playerHold();
  else if(b.hasAttribute('data-stim')){
    const c=engageQ&&engageQ.cur;
    if(c&&c.stage==='await')useStim(c.s);
  }
  else if(b.hasAttribute('data-nade')){
    if(engageQ&&engageQ.cur&&engageQ.cur.stage==='await'&&NADES>0){
      pickMode=(pickMode==='nadeToss')?null:'nadeToss';
      sTick();syncUI();
    }
  }
  else if(b.hasAttribute('data-wsel')&&engageQ&&engageQ.cur&&engageQ.cur.stage==='await'){
    const c=engageQ.cur;
    engageQ.cur=makeCur(c.s,c.t,b.getAttribute('data-wsel'));
    engageQ.cur.reveal=engageQ.cur.tn.entries.length;
    engageQ.cur.revealA=engageQ.cur.atk.entries.length;
    engageQ.cur.need=needFor(engageQ.cur.tn.total,engageQ.cur.atk.total);
    engageQ.cur.stage='await';
    sTick();syncUI();
  }
});
PILL.addEventListener('click',()=>{pickMode=null;fsDraft=null;hackArm=false;syncUI();});
byId('fsBox').addEventListener('click',ev=>{
  const b=ev.target.closest('#fsBtn');
  if(!b||b.getAttribute('aria-disabled')==='true'||phase!=='PLANNING')return;
  sTick();fsMenuOn=!fsMenuOn;syncUI();
});
FSM.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-fs]');
  if(!b)return;
  pickMode='fs:'+b.getAttribute('data-fs');fsDraft=null;fsMenuOn=false;sTick();syncUI();
});
byId('panel').addEventListener('click',ev=>{
  const r=ev.target.closest('[data-unit]');
  if(!r||phase!=='PLANNING')return;
  const u=U.find(x=>x.id===r.getAttribute('data-unit'));
  if(u&&u.side==='reb'&&!u.down&&!u.extracted&&!u.away){
    selId=u.id;pickMode=null;
    camGoal=focusGoal(u);
    sTick();syncUI();
  }
});
/* phones: the rail is a drawer */
const drawerOpen=on=>APP.classList.toggle('is-drawer-open',on);
$('drawerBtn').addEventListener('click',()=>drawerOpen(!APP.classList.contains('is-drawer-open')));
$('railClose').addEventListener('click',()=>drawerOpen(false));
cv.addEventListener('pointerdown',()=>drawerOpen(false));
$('zoomIn').addEventListener('click',()=>{cam.z*=1.2;camGoal=null;clampCam();});
$('zoomOut').addEventListener('click',()=>{cam.z/=1.2;camGoal=null;clampCam();});
$('zoomFit').addEventListener('click',()=>{cam={x:W/2,y:H/2,z:fitZoom()*0.95};camGoal=null;clampCam();});
$('followBtn').addEventListener('click',ev=>{
  follow=!follow;
  ev.currentTarget.setAttribute('aria-pressed',follow);
});
function syncSound(){
  const m=A.muted();
  $('muteBtn').setAttribute('aria-label',m?'Sound off':'Sound on');
  for(const u of ROOT.querySelectorAll('#muteBtn use,#menuSound use'))u.setAttribute('href','#i-'+(m?'soundoff':'soundon'));
}
function toggleSound(){A.setMuted(!A.muted());syncSound();}
$('muteBtn').addEventListener('click',toggleSound);
$('logBtn').addEventListener('click',openLog);
/* menu: sound, reports, controls, restart (asks first), debug */
const menuEl=$('gMenu');
menuEl.innerHTML=HUD.menuHtml([
  {id:'menuSound',icon:'soundon',label:'Sound',kbd:'M'},
  {id:'menuLog',icon:'comms',label:'All reports'},
  {id:'menuControls',icon:'help',label:'Controls'},
  {sep:1},
  {id:'restartBtn',icon:'restart',label:'Restart mission',kind:'danger'},
  {id:'dbgSkip',icon:'debug',label:'Debug: skip mission',kind:'debug'}]);
HUD.menuBind(menuEl,$('menuBtn'));
const ctlWin=HUD.win(ROOT,{id:'ctlWin',title:'Controls',size:'sm',body:
  '<div class="sr-stack">'+[
    [SR.touch?'Tap the ground':'Right-click the ground','Send the squad (free move)'],
    ['Click an enemy','Open fire while the town is calm'],
    ['1–9','Pick an order or a weapon'],
    ['X','Clear this rebel’s order'],
    ['Esc','Cancel a pick or close a window'],
    ['Enter','Press the gold button'],
    ['C','Toggle sneak'],
    ['M','Toggle sound'],
    ['Drag, wheel, pinch','Pan and zoom']].map(r=>'<div class="sr-mod"><span>'+r[1]+'</span><b><span class="sr-kbd">'+r[0]+'</span></b></div>').join('')+'</div>'});
$('menuSound').addEventListener('click',toggleSound);
$('menuLog').addEventListener('click',openLog);
$('menuControls').addEventListener('click',()=>ctlWin.open());
$('restartBtn').addEventListener('click',()=>{
  HUD.confirm(ROOT,{id:'restartConfirm',title:'Restart mission?',body:'This run ends and the mission starts over from the landing zone. Nothing from it is kept.',
    ok:'Restart mission',cancel:'Keep playing',danger:true,onOk:()=>resetGame(false)});
});
$('endRetryBtn').addEventListener('click',()=>{
  // the failed run never happened: reset the town and go again
  byId('endscreen').hidden=true;
  byId('endRetryBtn').hidden=true;
  enter({mission:CTX});
});
$('endRestartBtn').addEventListener('click',()=>{
  if(SCN&&SCN.mode==='haven'&&gameEnd&&!gameEnd.win){
    // no base to fall back to until the rock falls — set up and go again
    byId('endscreen').hidden=true;
    enter({mission:CTX});
    return;
  }
  SR.endMission(pendingResult||buildResult(false));
});
$('enterBtn').addEventListener('click',()=>{
  A.wake();
  $('briefing').hidden=true;
  started=true;
  if(SCN.mode==='haven'&&SCN.tutorial&&phase==='INTRO'){
    // prologue: the cutscene already ran before the briefing — start the quips and play (A1/A3)
    prologueQuips();
    enterFree(null);
    return;
  }
  startCutscene();
});
$('csSkip').addEventListener('click',()=>{if(cs)endCutscene();});
$('tutGotIt').addEventListener('click',()=>{
  A.wake();sTick();
  tutAck[tutIdx]=1;
  tutTick();syncUI();
});
$('cassAckBtn').addEventListener('click',()=>{
  A.wake();
  byId('gCassComm').hidden=true;
  $('briefing').hidden=false;
  $('enterBtn').focus({preventScroll:true});
});
$('dbgSkip').addEventListener('click',()=>{
  if(phase==='GAMEOVER')return;
  if(cs)endCutscene();
  byId('gCassComm').hidden=true;
  $('briefing').hidden=true;
  started=true;
  gameOver(true);
});
HUD.tips(ROOT);
addEventListener('keydown',ev=>{
  if(SR.active!=='ground')return;
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  const tg=ev.target&&ev.target.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;
  const k=ev.key,onBtn=!!(ev.target&&ev.target.closest&&ev.target.closest('button'));
  const win=HUD.topWin(ROOT);
  if(k==='Escape'){
    if(win){const x=win.querySelector('[data-close]');if(x)x.click();return;}
    if(!menuEl.hidden){menuEl.hidden=true;$('menuBtn').setAttribute('aria-expanded','false');return;}
    if(pickMode){pickMode=null;fsDraft=null;syncUI();}
    else if(hackArm&&phase==='FREE'){hackArm=false;syncUI();}
    else if(fsMenuOn){fsMenuOn=false;syncUI();}
    else if(selId){selId=null;syncUI();}
    return;
  }
  if(!$('gCassComm').hidden){
    // Enter and Space acknowledge; Esc does not close it (A2)
    if((k==='Enter'||k===' ')&&!onBtn){ev.preventDefault();$('cassAckBtn').click();}
    return;
  }
  if(!$('briefing').hidden){if(k==='Enter'&&!onBtn){ev.preventDefault();$('enterBtn').click();}return;}
  if(!$('endscreen').hidden){
    if(k==='Enter'&&!onBtn){const b=$('endRetryBtn').hidden?$('endRestartBtn'):$('endRetryBtn');b.click();}
    return;
  }
  if(win||!menuEl.hidden)return;
  if(/^[1-9]$/.test(k)){
    const b=[...DOCK.querySelectorAll('.sr-order')].find(e=>{const kk=e.querySelector('.sr-order__key');return kk&&kk.textContent===k&&!e.disabled;});
    if(b){ev.preventDefault();b.click();}
    return;
  }
  if(k==='x'||k==='X'){const b=DOCK.querySelector('[data-ract="cancel"]:not(:disabled)');if(b)b.click();return;}
  if(k==='m'||k==='M'){toggleSound();return;}
  if((k==='c'||k==='C')&&phase==='FREE'&&town==='calm'){setSneak(!sneak);return;}
  if(k==='Enter'&&!onBtn){
    const b=DOCK.querySelector('#attackBtn,#executeBtn,#extractBtn,#callBtn,#detBtn');
    if(b)b.click();
  }
});
/* ---------- reset / snapshot / boot ---------- */
function initState(){
  initUnits();
  for(const u of U)if(u.side==='reb'){u.spawnX=u.x;u.spawnY=u.y;}
  round=0;town='calm';hot=0;hotT=0;crossAway=false;crossFx=null;grafState='landed';
  {const A=(CTX&&CTX.assets)||null;
   FS=A&&(A.drop||(A.ships&&A.ships.length)||(A.vehicles&&A.vehicles.length))?{drop:!!A.drop,dropUsed:false,ships:(A.ships||[]).map(a=>Object.assign({state:'ready',left:0},a)),
     vehicles:(A.vehicles||[]).map(a=>Object.assign({state:'ready'},a)),orders:[],n:0}:null;
   fsMenuOn=false;fsDraft=null;
   /* Take the Rock only: Cass, the smuggler who set the squad down in the canyon, keeps his own
      freighter upstairs as a Door Gunner. No other mission grants this — fire support after the
      prologue means earning a Graf of your own, with a pilot and a Door Mounted Gun fitted.
      It stays off the Fire Support menu until its tutorial card appears (A5). */
   if(CTX&&CTX.missionId==='haven'&&SCN.mode==='haven'){
     FS=FS||{drop:false,dropUsed:false,ships:[],vehicles:[],orders:[],n:0};
     FS.ships.push({state:'ready',left:0,mode:'doorgun',cls:'graf',name:'Cass’s freighter',
       pilot:{name:'Cass Wender',first:'Cass'},soldiers:[],cassAir:1});
   }}
  ix=SCN.mode==='intel'?{hacked:false,reached:false}:null;
  rs=(SCN.mode==='rescue'||SCN.mode==='strider')?{released:false,everAlerted:false,reached:false}:null;
  fac=(SCN.mode==='autofactory'||SCN.mode==='towers')?{planted:false,detonated:false,everAlerted:false,quiet:false,fx:null,method:null}:null;
  fs=SCN.mode==='stealfuel'?{reached:false,called:false,flying:null,landed:false,pump:0,pumpT:0,done:false}:null;
  tally={c:0,s:0,items:[]};
  lootMarks=LOOTS.map(l=>Object.assign({},l,{taken:false}));
  WORK=SCN.work.map(w=>Object.assign({},w,{done:false,t:0}));
  PROPS=SCN.props.map(pr=>Object.assign({},pr,{hp:PROPDEF[pr.kind].hp,dead:false}));
  turret={gunner:null,face:Math.PI};
  NADES=(CTX&&CTX.nades)||0;nades=[];dmgRound=new Set();
  sneak=false;launchNagged=false;
  floaters=[];tracers=[];parts=[];bubbles=[];casings=[];decals=[];exploQ=[];hits=[];boomFx=[];
  fogInit();
  tutReset();
  engageQ=null;gameEnd=null;selId=null;pickMode=null;extractFx=null;
  dgRun=null;dgQueue.length=0;
  grafPos.x=LZ.x;grafPos.y=LZ.y;grafPos.a=0.12;
  $('endscreen').hidden=true;
  logEl.innerHTML='';feed.clear();
  recovered=0;
}
/* Cass announces his door gun the moment it unlocks — when the Fire Support tutorial card comes up (A5) */
function fsCassIntro(){
  const a=FS&&FS.ships.find(s=>s.cassAir&&!s.introduced);
  if(!a)return;
  a.introduced=1;
  log('<b>Cass</b> <span class="d">('+a.name+'):</span> I’m staying upstairs with the big gun in the door — this run only, so spend me well. Mark a zone through <span class="a">Fire support</span> and I’ll hold a wide orbit over it, gun working.');
}
function resetGame(withCine){
  initState();
  if(withCine)startCutscene();
  else {
    started=true;
    cam={x:LZ.x+240,y:LZ.y-180,z:0.9};clampCam();camGoal=null;
    log(SCN.mode==='haven'?
      '<span class="d">Three of you, on foot, at the bottom of the canyon. The base mouth is up the trail past the squatter camp.</span>':
      '<span class="d">Squad on the ground at the Graf LZ. The Cross is on the pad behind the sheriff’s HQ, far side of town.</span>');
    enterFree(null);
  }
}
function saveSnap(){/* combat runs are not persisted; reloading resumes at Haven Rock */}
/* ---------- tutorial (prologue only) ---------- */
/* Each card can carry when() \u2014 it waits, hidden, until that is true \u2014 and pause:true: during real-time
   play (FREE) the simulation freezes until the player clicks Got it; in PLANNING/ENGAGE the game already
   waits, so the button shows without a freeze. An acknowledged card stays up until its done() fires. (A4) */
let tutFlags={moved:0,sneaked:0,executed:0,attacked:0,shot:0,fs:0,fsCard:0};
let tutIdx=0,tutAck=[];
const TUT=[
  {title:'Move out',pause:true,text:'<b>Out of combat, you can move your squad in real time.</b> <b>'+(SR.touch?'Tap the ground':'Right-click')+'</b>'+(SR.touch?'':' (or tap the ground)')+' to move your squad. Walk them up the canyon toward the squatter camp at the base mouth.',
   done:()=>tutFlags.moved},
  {title:'Sneak past',pause:true,when:()=>town==='alerted'||U.some(r=>r.side==='reb'&&!r.down&&!r.extracted&&!r.away&&hostilesActive().some(l=>lookout(l)&&dist(r,l)<sightRange(l)+180)),
   text:'Those <b>blue searchlights</b> are enemy sightlines. The orange inner band catches your characters while sneaking. Press <span class="sr-kbd">C</span> (or the Sneak button) to go low.',
   done:()=>tutFlags.sneaked||town==='alerted'},
  {title:'Start the fight',pause:true,when:()=>town==='alerted'||U.some(r=>r.side==='reb'&&!r.down&&!r.extracted&&!r.away&&hostilesActive().some(l=>unitSeen(l)&&dist(r,l)<520)),
   text:'Ambushing gives you the opportunity to swing a fight in your favour from the first turn. <b>Click a squatter</b> and everyone with a clear shot can open fire with a bonus to hit.',
   done:()=>town==='alerted'},
  {title:'Plan the round',when:()=>phase==='PLANNING'||hostilesActive().length===0,
   text:'Each rebel takes one order. <b>Move</b> relocates a character, <b>Sprint</b> increases move distance but the character can\u2019t shoot, <b>Hold</b> braces (+2 ATK) and fires on anyone crossing its lane. Green rings indicate cover to make your characters harder to hit. Press <b>Execute</b> when you have finished giving orders.',
   done:()=>tutFlags.executed||hostilesActive().length===0},
  {title:'Take the shot',when:()=>phase==='ENGAGE'||hostilesActive().length===0,
   text:'Shots resolve one at a time on the attack panel in initiative order. Tap another squatter to retarget \u2014 or tap a <b>red canister</b> to blow it \u2014 then hit <b>Attack</b>.',
   done:()=>tutFlags.shot||hostilesActive().length===0},
  {title:'Fire Support',pause:true,when:()=>round>=1&&phase==='PLANNING',
   text:'Fire Support can help turn the tide of battle. Select the <b>Fire Support</b> action from the action menu and click on an area to summon Cass to provide door gunner cover there.',
   done:()=>tutFlags.fs||hostilesActive().length===0},
  {title:'Cover and nerve',text:'Cover soaks incoming damage. Some cover like crates can be destroyed.<br>Eliminate <b>Boss Craw</b> and other enemies might lose their nerve and panic. Panicking characters cannot use actions.',
   done:()=>hostilesActive().length===0},
  {title:'Raise the signal',text:'The rock is yours. Push inside, walk a soldier to the command-room console, and <b>raise the signal</b>.',
   done:()=>false},
];
function tutReset(){tutFlags={moved:0,sneaked:0,executed:0,attacked:0,shot:0,fs:0,fsCard:0};tutIdx=0;tutAck=[];tutShown=-1;tutAckShown=null;tutStage=-1;tutGateT=0;}
let tutShown=-1,tutAckShown=null,tutStage=-1,tutGateT=0;
const TUT_GAP=1400;   // breathing room before the next card comes up; the first card shows at once
function tutNeedsAck(){const t=TUT[tutIdx];return !!(t&&t.pause&&!tutAck[tutIdx]&&!t.done());}
/* a card is ready to show once its when() is met and the breathing gap since the last card has passed */
function tutReady(){
  const t=TUT[tutIdx];
  if(!t||(t.when&&!t.when()))return false;
  return performance.now()>=tutGateT;
}
function tutFrozen(){
  if(!SCN||!SCN.tutorial||phase!=='FREE')return false;
  return tutNeedsAck()&&tutReady();
}
function tutTick(){
  const card=byId('tutCard');
  if(!SCN||!SCN.tutorial||phase==='BRIEF'||phase==='CUTSCENE'||phase==='INTRO'||phase==='GAMEOVER'){if(!card.hidden){card.hidden=true;measureHud();}return;}
  while(tutIdx<TUT.length-1&&TUT[tutIdx].done())tutIdx++;
  if(tutStage!==tutIdx){tutStage=tutIdx;tutGateT=performance.now()+(tutIdx?TUT_GAP:0);}
  // a card waits unseen until its when() is met and it has had a beat to breathe
  if(!tutReady()){if(!card.hidden){card.hidden=true;measureHud();}tutShown=-1;return;}
  if(tutIdx===5&&!tutFlags.fsCard){tutFlags.fsCard=1;fsCassIntro();syncUI();}   // the Fire Support card is up: Cass unlocks and pipes up (A5)
  if(card.hidden){card.hidden=false;tutShown=-1;}
  const fold=phase==='ENGAGE'&&cssW<1000;           // the VS panel is already teaching; give the fight the room
  if(card.classList.contains('is-folded')!==fold){card.classList.toggle('is-folded',fold);measureHud();}
  const needAck=tutNeedsAck();
  if(tutShown!==tutIdx||tutAckShown!==needAck){
    tutShown=tutIdx;tutAckShown=needAck;
    byId('tutStep').textContent=TUT[tutIdx].title;
    byId('tutDots').innerHTML=TUT.map((t,i)=>'<i'+(i<=tutIdx?' class="is-on"':'')+'></i>').join('');
    byId('tutText').innerHTML=TUT[tutIdx].text;
    byId('tutFoot').hidden=!needAck;
    measureHud();
  }
}
/* ---------- scenario chrome ---------- */
function scenarioUI(){
  byId('gTitle').textContent=SCN.title;
  byId('gSub').textContent=SCN.sub;
  byId('foeHead').textContent=SCN.foesLabel;
  const B=SCN.brief||{};
  byId('gEyebrow').textContent=tagText(B.eyebrow||'Ground Operation');
  byId('gTitleB').textContent=SCN.title;
  byId('gFlavour').innerHTML=B.flavour||'';
  byId('gObj').innerHTML=SR.ui.objRows(B.objectives||[]);
  const hint=byId('gHint');
  hint.innerHTML=B.hint||'';
  hint.hidden=!B.hint;
  const spec=CTX||defaultSpec();
  const cards=(spec.squad||[]).map(sp=>SR.ui.squadCard({name:sp.name,role:'Soldier',chips:SR.ui.gearChips(sp.wpns||['akli','cowboy'])}));
  if(spec.pilot)cards.push(SR.ui.squadCard({name:spec.pilot.name,role:'Pilot',pilot:true,chips:SR.ui.gearChips(spec.pilot.wpns||['cowboy'])}));
  byId('gSquad').innerHTML=cards.join('');
}
let navFor=null;
function enter(params){
  CTX=(params&&params.mission)||SR.mission||null;
  initScenario((CTX&&CTX.scenario)||'stealcross');
  fitCanvas();
  scenarioUI();
  if(navFor!==SCN.mode){
    navFor=SCN.mode;
    PROPS=SCN.props.map(pr=>Object.assign({},pr,{hp:PROPDEF[pr.kind].hp,dead:false}));
    navInit();
    COVER_PTS.length=0;COVER_PTS.push(...coverPoints());
  }
  syncSound();drawerOpen(false);menuEl.hidden=true;lastPhase=null;
  initState();
  pendingResult=null;
  byId('app').classList.remove('cine');
  $('csSkip').hidden=true;cs=null;
  if(params&&params.test){
    $('briefing').hidden=true;
    resetGame(false);
    return;
  }
  if(SCN.mode==='haven'&&SCN.tutorial){
    // prologue: straight into the insertion cinematic; the Cass comm and the briefing follow it (A1)
    // the New Game click is the user gesture that lets audio start
    A.wake();
    $('briefing').hidden=true;
    started=true;
    startCutscene();
    syncUI();
    return;
  }
  $('briefing').hidden=false;
  $('enterBtn').focus({preventScroll:true});
  phase='BRIEF';
  for(const u of U)if(u.side==='reb')u.csHide=true;
  cam={x:LZ.x+180,y:LZ.y-160,z:0.9};clampCam();camGoal=null;
  syncUI();
}
function exit(){
  byId('app').classList.remove('cine');
  byId('csBanner').classList.remove('show');
  byId('gCassComm').hidden=true;
  drawerOpen(false);menuEl.hidden=true;
  for(const w of ROOT.querySelectorAll('[data-srwin]'))w.hidden=true;
  engageQ=null;cs=null;extractFx=null;
}
SR.register('ground',{enter,exit,frame:render});


if(location.hash==='#test'){
  window.DBGground={get U(){return U;},get phase(){return phase;},get town(){return town;},
    get hot(){return hot;},set hot(v){hot=v;},get WORK(){return WORK;},get tally(){return tally;},
    get gameEnd(){return gameEnd;},get pendingResult(){return pendingResult;},get crossAway(){return crossAway;},
    get PAD(){return PAD;},get LZ(){return LZ;},get SCN(){return SCN;},get fs(){return fs;},get fac(){return fac;},get rs(){return rs;},get hackArm(){return hackArm;},get FS(){return FS;},get ix(){return ix;},get grafPos(){return grafPos;},
    get engageQ(){return engageQ;},get cam(){return cam;},get camGoal(){return camGoal;},get FR(){return FR;},
    get dgRun(){return dgRun;},get dgQueue(){return dgQueue;},
    get NADES(){return NADES;},set NADES(v){NADES=v;},get nades(){return nades;},
    get round(){return round;},get bubbles(){return bubbles;},get tutIdx(){return tutIdx;},get tutFlags(){return tutFlags;},get quipsQueued(){return quipsQueued;},
    fn:{SCENARIOS_:()=>SCENARIOS,WPN_:()=>WPN,lootMarks_:()=>lootMarks,artSpec,artPose,dropLoot,applyShot,fireFx,WDAM_:()=>WDAM,WICON_:()=>WICON,tutFrozen,tutTick,prologueQuips,fsPlace,fsItems,fsExecute,fsRoundEnd,fsPlanStart,supplyDrop,startFreeHack,hackFlip,canHack,hackResolve,deployUnits,validShot,facDetonate,callTransport,fuelReach,fuelPumpStep,execute,enterFree,tryLaunch,startExtract,squadMoveTo,playerAttack,playerHold,
      completeWork,gameOver,alertTown,unitSeen,startAmbush,throwNade,useStim,
      mount,dismount,canEnter,enterTargets,switchSeat,switchTargets,vehSync,crewIn,vehOf,seatOf,reachOf,aiPlan,summonVehicle,moraleCheck,explode,startPlanning,expandUnits,
      computeATK,computeTN,rollDamage,woundUnit,jamRoll,critRoll,initKey,speedMul,viewMul,adjCoolG,coolStateG,mkU,endRound,downUnit,relUp,buildResult,ordersFor,inflictInjury,doTreat,treatPick,treatTarget,injOf,wpnsOf,cantSprint,stunned,useStim,statusTag,
      seen(){return [...visUnits];},
      engageAwait(){return !!(engageQ&&engageQ.cur&&engageQ.cur.stage==='await');}}};
}
})();
