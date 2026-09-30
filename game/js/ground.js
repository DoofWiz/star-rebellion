'use strict';
(function(){
const ROOT=document.getElementById('sc-ground');
const byId=id=>ROOT.querySelector('#'+id);
const A=SR.audio;
const osc=(...a)=>A.osc(...a);
const nz=(...a)=>A.nz(...a);


/* =====================================================================
   STAR REBELLION — Ground Combat I: "Steal the Cross"
   WeGo real-time tactics, no grid. Plan free-aim orders for the whole
   squad, execute simultaneously, resolve fire on the shared d20 VS
   panel. Cover, line of sight, overwatch, a calm/alerted town, loot
   picked up by hand, and Akli rifles that jam on a natural 1.
   ===================================================================== */

/* ---------- constants ---------- */
let W=2400,H=1600;
const MOVE_R=150,SPRINT_R=300,EXEC_MS=2600,LOOT_AOE=95,AUTO_LOOT=50,RT_SPEED=135,SNEAK_SPEED=72;
const NADE_R=300,NADE_BLAST=110;
const HOT_ROUNDS=2;
const SHIELD_ARC=1.15;               // half-angle of the turret's frontal shield
const OFFMAP={x:-99999,y:-99999,r:1};
let PAD=OFFMAP,LZ={x:300,y:1330,r:130},TOWER=OFFMAP,TURRET={x:-99999,y:-99999,r:26};
let BLDGS=[],PROPS=[],LOOTS=[],WORKDEF=[],SCN=null;
let seed=(Date.now()^0x9e3779b9)>>>0;
function rng(){seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
function rint(lo,hi){return lo+Math.floor(rng()*(hi-lo+1));}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function lerp(a,b,t){return a+(b-a)*t;}
function ease(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

const WPN={
  akli:   {name:'Akli AR',            d0:24,d1:38,rng:540,atk:1,jam:true,shots:3},
  cowboy: {name:'Cowboy',             d0:18,d1:30,rng:280,atk:0,shots:1},
  carbine:{name:'Peacekeeper Carbine',d0:20,d1:33,rng:430,atk:1,shots:2},
  scatter:{name:'Scattergun',         d0:32,d1:55,rng:215,atk:2,shots:1,falloff:true,pellets:true},
  longiron:{name:'Long Iron',         d0:29,d1:46,rng:920,atk:2,shots:1},
  rocket: {name:'Makeshift Rocket',   d0:55,d1:85,rng:520,atk:0,shots:1},
  fists:  {name:'Riot Fists',          d0:22,d1:36,rng:70, atk:1,shots:2},
  cruiser:{name:'Cruiser Pulse Cannon',d0:18,d1:30,rng:480,atk:1,shots:2},
  dispersal:{name:'Dispersal Turret',  d0:14,d1:24,rng:340,atk:1,shots:3},
  strider:{name:'Strider Autocannon',d0:16,d1:26,rng:460,atk:0,shots:4},
  laser:  {name:'Laser Turret',       d0:42,d1:62,rng:720,atk:4,shots:1,beam:true},
};
const PROPDEF={
  barrel:  {r:15,cov:8,hp:55, lab:'FUEL DRUMS'},
  crate:   {r:19,cov:8,hp:45, lab:'CARGO CRATES'},
  trough:  {r:26,cov:8,hp:70, lab:'CHARGE STATION'},
  wagon:   {r:42,cov:10,hp:150,lab:'TRUCK'},
  canister:{r:12,cov:0,hp:1,  lab:'FUEL CANISTER'},
  rock:    {r:26,cov:9,       lab:'BOULDER'},   // no hp: stone does not shred
};

/* ---------- scenarios ---------- */
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
    {id:'locker',   x:1742,y:884, label:'HQ gun locker',  take:'Scattergun + shell box', items:['Scattergun','Shell box']},
    {id:'feed',     x:1312,y:1084,label:'Motor pool cache',take:'104 \u25c8 credits',     c:104},
    {id:'blamA',    x:1608,y:942, label:'BLAM crate',     take:'3\u00d7 BLAM frag',       nades:3},
    {id:'blamB',    x:1092,y:1112,label:'BLAM crate',     take:'3\u00d7 BLAM frag',       nades:3},
  ],
  foes(){return [
    {id:'reeve',name:'Sheriff Reeve',first:'Reeve',side:'law',x:1906,y:730,hp:140,maxhp:140,aim:3,def:11,cool:90,wpns:['scatter'],sheriff:1,office:1,
      lines:['You picked the wrong town, drifters.','Hegemony pays my wage. I earn it.','Nobody touches that ship!']},
    {id:'pell', name:'Dep. Pell', first:'Pell', side:'law',x:1150,y:790,hp:60,maxhp:60,aim:1,def:10,wpns:['carbine'],patrol:[{x:1150,y:790},{x:900,y:820},{x:1350,y:820}],
      lines:['Sheriff, movement by the bank!','Who fired? WHO FIRED?']},
    {id:'cobb', name:'Dep. Cobb', first:'Cobb', side:'law',x:700,y:788,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],patrol:[{x:700,y:788},{x:560,y:830}],
      lines:['Strangers on the west road!','I ain\u2019t paid enough for this.']},
    {id:'marsh',name:'Dep. Marsh',first:'Marsh',side:'law',x:520,y:860,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],patrol:[{x:520,y:860},{x:760,y:1100},{x:480,y:1180}],
      lines:['Something came down south of town\u2026','They\u2019re armed! Guns! GUNS!']},
    {id:'ruiz', name:'Dep. Ruiz', first:'Ruiz', side:'law',x:1300,y:1100,hp:60,maxhp:60,aim:1,def:10,wpns:['carbine'],guard:1,patrol:[{x:1300,y:1100},{x:1500,y:1120}],
      lines:['Motor pool clear\u2026 mostly.','Fall back to the pad!']},
    {id:'stack',name:'Dep. Stack',first:'Stack',side:'law',x:2080,y:540,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],guard:1,patrol:[{x:2080,y:540},{x:1990,y:470},{x:2160,y:460}],
      lines:['Pad\u2019s secure, Sheriff.','They want the ship! They want the ship!']},
    {id:'wren', name:'Dep. Wren', first:'Wren', side:'law',x:1562,y:436,hp:55,maxhp:55,aim:3,def:12,wpns:['longiron'],elev:1,fixed:1,
      lines:['I can see the whole street from up here.','Say when, Sheriff.']},
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
       {id:'pcw',name:'Police Cruiser',first:'Cruiser',side:'law',x:2120,y:560,hp:130,maxhp:130,aim:1,def:7,wpns:['cruiser'],vehicle:1,lines:['Unit 4, responding.']},
       {id:'dill',name:'Guard Dill',first:'Dill',side:'law',x:2150,y:640,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],lines:['Fuel thieves! At the apron!','Sheriff’ll have my head.']},
       {id:'corr',name:'Guard Corr',first:'Corr',side:'law',x:2150,y:720,hp:60,maxhp:60,aim:1,def:10,wpns:['carbine'],lines:['Contact! Contact!','Get that ship off my pumps!']},
     ]},
    {at:3,log:'<span class="h">The depot warden and a second crawler arrive from the north road.</span>',
     foes:[
       {id:'hask',name:'Warden Hask',first:'Hask',side:'law',x:1420,y:40,hp:95,maxhp:95,aim:2,def:11,cool:85,wpns:['scatter'],lines:['That tithe is the Hegemony’s!','Nobody drains my tanks.']},
       {id:'orsk',name:'Guard Orsk',first:'Orsk',side:'law',x:1520,y:40,hp:60,maxhp:60,aim:1,def:10,wpns:['carbine'],lines:['North road is ours!','Warden, they’re on the apron!']},
       {id:'vell',name:'Guard Vell',first:'Vell',side:'law',x:1320,y:40,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],lines:['Cover me!','Not the pumps!']},
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
    {id:'charges',x:800,y:760,label:'Depot blasting charges',take:'2× Explosive Charge',items:['Explosive Charge','Explosive Charge']},
  ],
  foes(){return [
    {id:'holt',name:'Guard Holt',first:'Holt',side:'law',x:1250,y:620,hp:60,maxhp:60,aim:1,def:10,wpns:['carbine'],patrol:[{x:1250,y:620},{x:1100,y:700},{x:1350,y:740}],lines:['Nothing on the east flats.','Who fired? WHO FIRED?']},
    {id:'vane',name:'Guard Vane',first:'Vane',side:'law',x:1000,y:880,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],patrol:[{x:1000,y:880},{x:760,y:940}],lines:['Dust and more dust…','They’re armed! GUNS!']},
    {id:'tull',name:'Guard Tull',first:'Tull',side:'law',x:720,y:600,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],patrol:[{x:720,y:600},{x:560,y:720}],lines:['Herders don’t come this way.','West road! Raiders!']},
    {id:'ruck',name:'Guard Ruck',first:'Ruck',side:'law',x:1780,y:300,hp:60,maxhp:60,aim:1,def:10,wpns:['carbine'],guard:1,patrol:[{x:1780,y:300},{x:1890,y:430},{x:1770,y:560}],lines:['Apron’s secure.','They want the tanks!']},
    {id:'pike2',name:'Guard Pike',first:'Pike',side:'law',x:1620,y:700,hp:60,maxhp:60,aim:1,def:10,wpns:['cowboy'],guard:1,patrol:[{x:1620,y:700},{x:1760,y:660}],lines:['Pumps are locked.','Fall back to the pumps!']},
    {id:'hale',name:'Tower Hale',first:'Hale',side:'law',x:1330,y:300,hp:55,maxhp:55,aim:3,def:12,wpns:['longiron'],elev:1,fixed:1,lines:['Clear view from up here.','Say when, Warden.']},
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
      {id:'rtc1',name:'Riot Transport Cruiser',first:'Cruiser',side:'law',x:700,y:470,hp:150,maxhp:150,aim:0,def:7,wpns:[],vehicle:1,
       deploy:[
        {id:'rs2',name:'Riot Shieldman Voss',first:'Voss',side:'law',hp:75,maxhp:75,aim:1,def:10,wpns:['cowboy'],shield:1,lines:['Riot line! Hold!','Disperse!']},
        {id:'rr2',name:'Riot Rifleman Tarn',first:'Tarn',side:'law',hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],lines:['Contact at the plant!','Shields forward!']},
        {id:'rr3',name:'Riot Rifleman Mek',first:'Mek',side:'law',hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],lines:['Suppressing!','Breach team, go!']},
       ],lines:[]},
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
    {id:'blasting',x:640,y:1040,label:'Blasting shed',take:'Explosive Charge',items:['Explosive Charge']},
  ],
  foes(){return [
    {id:'drew',name:'Patrolman Drew',first:'Drew',side:'law',x:780,y:580,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:780,y:580},{x:760,y:700},{x:830,y:470}],lines:['Gate\u2019s quiet.','Who goes there?']},
    {id:'pb12',name:'Policebot PB-12',first:'PB-12',side:'law',x:830,y:900,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,patrol:[{x:830,y:900},{x:830,y:740}],lines:['Please remain calm.','Citizen, drop the weapon.']},
    {id:'pb07',name:'Policebot PB-07',first:'PB-07',side:'law',x:1030,y:1080,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,patrol:[{x:1030,y:1080},{x:1300,y:1180}],lines:['You are in violation of Ordinance 9.','Please stand still.']},
    {id:'soll',name:'Patrolman Soll',first:'Soll',side:'law',x:1560,y:860,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:1560,y:860},{x:1420,y:1000},{x:1700,y:800}],lines:['Nothing on the east side.','Hands where I can see them!']},
    {id:'pb03',name:'Policebot PB-03',first:'PB-03',side:'law',x:1680,y:560,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,guard:1,patrol:[{x:1680,y:560},{x:1780,y:600}],lines:['Restricted area.','Please remain calm.']},
    {id:'rs1',name:'Riot Shieldman Kaan',first:'Kaan',side:'law',x:1860,y:588,hp:75,maxhp:75,aim:1,def:10,wpns:['cowboy'],shield:1,guard:1,lines:['Nobody touches the breaker.','Shields up!']},
    {id:'rr1',name:'Riot Rifleman Brenn',first:'Brenn',side:'law',x:2020,y:900,hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],patrol:[{x:2020,y:900},{x:1960,y:760}],lines:['Office perimeter clear.','Rifles up!']},
    {id:'strid1',name:'Strider Mk I',first:'Strider',side:'law',x:1180,y:950,hp:240,maxhp:240,aim:1,def:8,wpns:['strider'],auto:1,autoType:'strider',hackRounds:3,big:1,patrol:[{x:1180,y:950},{x:1300,y:760},{x:1060,y:1100}],lines:['We\u2019re all in this together.','Please remain calm.']},
  ];},
  civs(){return [
    {id:'civ1',name:'Line Worker',first:'worker',side:'civ',x:1150,y:1160,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1150,y:1160},{x:1000,y:1200},{x:1260,y:1130}]},
    {id:'civ2',name:'Line Worker',first:'worker',side:'civ',x:1400,y:1040,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1400,y:1040},{x:1500,y:1180}]},
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
    {id:'locker',x:1340,y:470,label:'Evidence locker',take:'Peacekeeper Carbine',items:['Peacekeeper Carbine']},
    {id:'tollbox',x:1100,y:1050,label:'Toll box',take:'360 ◈ credits',c:360},
    {id:'rations',x:1650,y:990,label:'Barge rations',take:'72 ▤ supplies',s:72},
  ],
  foes(){return [
    {id:'fenn',name:'Patrolman Fenn',first:'Fenn',side:'law',x:720,y:470,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:720,y:470},{x:800,y:620},{x:640,y:480}],lines:['Gate’s quiet.','Who goes there?']},
    {id:'pb21',name:'Policebot PB-21',first:'PB-21',side:'law',x:850,y:800,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,patrol:[{x:850,y:800},{x:960,y:660}],lines:['Please remain calm.','Citizen, you are in a restricted area.']},
    {id:'pb22',name:'Policebot PB-22',first:'PB-22',side:'law',x:1600,y:520,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,guard:1,patrol:[{x:1600,y:520},{x:1660,y:560}],lines:['Restricted area.','Please stand still.']},
    {id:'rs3',name:'Riot Shieldman Orla',first:'Orla',side:'law',x:1720,y:524,hp:75,maxhp:75,aim:1,def:10,wpns:['cowboy'],shield:1,guard:1,lines:['Nobody touches the prisoner.','Shields up!']},
    {id:'rr4',name:'Riot Rifleman Dace',first:'Dace',side:'law',x:1420,y:500,hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],patrol:[{x:1420,y:500},{x:1520,y:620}],lines:['Cell block is sealed.','Rifles up!']},
    {id:'oake',name:'Patrolman Oake',first:'Oake',side:'law',x:1150,y:1000,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:1150,y:1000},{x:1000,y:850},{x:1250,y:900}],lines:['Nothing at the toll office.','Hands where I can see them!']},
    {id:'bray',name:'Patrolman Bray',first:'Bray',side:'law',x:1700,y:920,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:1700,y:920},{x:1850,y:840}],lines:['Barge side is clear.','Stop right there!']},
    {id:'bru1',name:'Riot Bruiser Gorm',first:'Gorm',side:'law',x:1640,y:524,hp:95,maxhp:95,aim:1,def:10,wpns:['fists'],auto:1,autoType:'bruiser',hackRounds:2,heavy:1,guard:1,lines:['Please remain calm.','Non-compliance detected.']},
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
      {id:'rs5',name:'Riot Shieldman Kade',first:'Kade',side:'law',x:640,y:560,hp:75,maxhp:75,aim:1,def:10,wpns:['cowboy'],shield:1,lines:['Riot line! Hold!','Disperse!']},
      {id:'rr5',name:'Riot Rifleman Saul',first:'Saul',side:'law',x:600,y:640,hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],lines:['Contact at the databank!','Shields forward!']},
      {id:'rr6',name:'Riot Rifleman Petra',first:'Petra',side:'law',x:600,y:480,hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],lines:['Suppressing!','Breach team, go!']},
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
    {id:'crane',name:'Patrolman Crane',first:'Crane',side:'law',x:760,y:600,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:760,y:600},{x:900,y:700},{x:720,y:470}],lines:['Gate’s quiet.','Who goes there?']},
    {id:'pb31',name:'Policebot PB-31',first:'PB-31',side:'law',x:1150,y:640,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,patrol:[{x:1150,y:640},{x:1000,y:700}],lines:['Please remain calm.','Citizen, you are in a restricted area.']},
    {id:'pb32',name:'Policebot PB-32',first:'PB-32',side:'law',x:1620,y:640,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,guard:1,patrol:[{x:1620,y:640},{x:1720,y:620}],lines:['Restricted area.','Please stand still.']},
    {id:'rs4',name:'Riot Shieldman Bour',first:'Bour',side:'law',x:1660,y:600,hp:75,maxhp:75,aim:1,def:10,wpns:['cowboy'],shield:1,guard:1,lines:['Nobody touches the terminal.','Shields up!']},
    {id:'rr7',name:'Riot Rifleman Wick',first:'Wick',side:'law',x:1400,y:540,hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],patrol:[{x:1400,y:540},{x:1500,y:680}],lines:['East hall is sealed.','Rifles up!']},
    {id:'elm',name:'Patrolman Elm',first:'Elm',side:'law',x:1200,y:1000,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:1200,y:1000},{x:1050,y:900},{x:1350,y:1050}],lines:['Cooling plant clear.','Hands where I can see them!']},
    {id:'pb33',name:'Policebot PB-33',first:'PB-33',side:'law',x:1800,y:940,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,patrol:[{x:1800,y:940},{x:1950,y:860}],lines:['You are in violation of Ordinance 9.','Please stand still.']},
    {id:'pc1',name:'Police Cruiser',first:'Cruiser',side:'law',x:1050,y:1180,hp:130,maxhp:130,aim:1,def:7,wpns:['cruiser'],vehicle:1,patrol:[{x:1050,y:1180},{x:1500,y:1120},{x:1250,y:1230}],lines:['Unit 9, responding.']},
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
    {id:'hask2',name:'Patrolman Hale',first:'Hale',side:'law',x:720,y:470,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:720,y:470},{x:800,y:620},{x:640,y:480}],lines:['Gate’s quiet.','Who goes there?']},
    {id:'pb41',name:'Policebot PB-41',first:'PB-41',side:'law',x:850,y:800,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,patrol:[{x:850,y:800},{x:960,y:660}],lines:['Please remain calm.','Citizen, you are in a restricted area.']},
    {id:'pb42',name:'Policebot PB-42',first:'PB-42',side:'law',x:1600,y:560,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,guard:1,patrol:[{x:1600,y:560},{x:1660,y:600}],lines:['Restricted area.','Please stand still.']},
    {id:'rs6',name:'Riot Shieldman Ysel',first:'Ysel',side:'law',x:1720,y:540,hp:75,maxhp:75,aim:1,def:10,wpns:['cowboy'],shield:1,guard:1,lines:['Nobody touches the walker.','Shields up!']},
    {id:'rr8',name:'Riot Rifleman Garr',first:'Garr',side:'law',x:1420,y:500,hp:60,maxhp:60,aim:2,def:10,wpns:['carbine'],patrol:[{x:1420,y:500},{x:1520,y:640}],lines:['Yard is sealed.','Rifles up!']},
    {id:'elm2',name:'Patrolman Voss',first:'Voss',side:'law',x:1150,y:1000,hp:55,maxhp:55,aim:1,def:10,wpns:['cowboy'],patrol:[{x:1150,y:1000},{x:1000,y:850},{x:1250,y:900}],lines:['Nothing at the store.','Hands where I can see them!']},
    {id:'pb43',name:'Policebot PB-43',first:'PB-43',side:'law',x:1700,y:940,hp:45,maxhp:45,aim:1,def:9,wpns:['cowboy'],auto:1,patrol:[{x:1700,y:940},{x:1850,y:860}],lines:['You are in violation of Ordinance 9.','Please stand still.']},
    {id:'rdc1',name:'Riot Dispersal Cruiser',first:'Cruiser',side:'law',x:1450,y:690,hp:170,maxhp:170,aim:1,def:7,wpns:['dispersal'],vehicle:1,guard:1,lines:['Dispersal turret deployed.']},
  ];},
  civs(){return [
    {id:'civ1',name:'Depot Hand',first:'depot hand',side:'civ',x:1250,y:1200,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1250,y:1200},{x:1120,y:1240},{x:1380,y:1180}]},
  ];},
},
haven:{
  mode:'haven',W:1600,H:1200,style:'rock',fog:true,
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
    {id:'craw',name:'Boss Craw',first:'Craw',side:'law',x:1245,y:330,hp:120,maxhp:120,aim:3,def:10,cool:85,wpns:['scatter'],sheriff:1,office:1,
      lines:['Vult gang runs this drift!','Burn them out!','This rock is CLAIMED, you hear?!']},
    {id:'odo',name:'Odo',first:'Odo',side:'law',x:900,y:960,hp:70,maxhp:70,aim:2,def:9,wpns:['cowboy'],patrol:[{x:900,y:960},{x:1010,y:1000},{x:820,y:1000}],
      lines:['Trail\u2019s quiet. Too quiet. Nah, just quiet.','It\u2019s a raid! IT\u2019S A RAID!']},
    {id:'vult',name:'Vult',first:'Vult',side:'law',x:1000,y:900,hp:70,maxhp:70,aim:2,def:9,wpns:['cowboy'],patrol:[{x:1000,y:900},{x:880,y:930}],
      lines:['Somebody\u2019s sniffin\u2019 round the flat\u2026','WHO LIT THAT UP?!']},
    {id:'brek',name:'Brek',first:'Brek',side:'law',x:925,y:712,hp:75,maxhp:75,aim:2,def:10,wpns:['cowboy'],guard:1,patrol:[{x:925,y:712},{x:920,y:692}],
      lines:['Nobody comes through my door.','THE DOOR! They\u2019re at the DOOR!']},
    {id:'pike',name:'Pike',first:'Pike',side:'law',x:860,y:300,hp:75,maxhp:75,aim:2,def:9,wpns:['carbine'],patrol:[{x:860,y:300},{x:760,y:200},{x:980,y:390}],
      lines:['The wreck\u2019s mine, I called it.','They\u2019re INSIDE!'] },
    {id:'mox',name:'Mox',first:'Mox',side:'law',x:1000,y:210,hp:70,maxhp:70,aim:1,def:9,wpns:['cowboy'],patrol:[{x:1000,y:210},{x:700,y:170}],
      lines:['That hauler\u2019s worth more\u2019n all of us.','They\u2019re in the CAVE!']},
    {id:'rzek',name:'Rzek',first:'Rzek',side:'law',x:990,y:620,hp:70,maxhp:70,aim:1,def:9,wpns:['cowboy'],patrol:[{x:990,y:620},{x:870,y:610},{x:1120,y:640}],
      lines:['Heard somethin\u2019 down the hall\u2026','They\u2019ve got RIFLES!']},
    {id:'sarn',name:'Sarn',first:'Sarn',side:'law',x:1330,y:640,hp:75,maxhp:75,aim:2,def:10,wpns:['carbine'],guard:1,patrol:[{x:1330,y:640},{x:1270,y:600}],
      lines:['Bunks\u2019re ours. Boss said.','Boss! COMPANY!']},
    {id:'hasp',name:'Hasp',first:'Hasp',side:'law',x:1125,y:530,hp:70,maxhp:70,aim:2,def:9,wpns:['carbine'],guard:1,patrol:[{x:1125,y:530},{x:1120,y:458}],
      lines:['Boss said watch the hall. I watch the hall.','BOSS! GUNS IN THE HALL!']},
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
function initScenario(id){
  SCN=SCENARIOS[id]||SCENARIOS.stealcross;
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
  const squad=spec.squad.map((sp,i)=>mkU({id:sp.id,pid:sp.id,name:sp.name,first:sp.first,side:'reb',
    x:spots[i%4][0],y:spots[i%4][1],hp:sp.hp||100,maxhp:sp.hp||100,aim:sp.aim||2,def:sp.def||12,cool:65,
    level:sp.level||1,stims:sp.autoType?0:1,spec:sp.spec||null,big:sp.big?1:0,heavy:sp.heavy?1:0,auto:sp.autoType?1:0,autoType:sp.autoType||null,hackRounds:0,wpns:sp.wpns||['akli','cowboy'],lines:REB_LINES[sp.id]||REB_LINES.generic}));
  if(SCN.mode==='autofactory'&&(spec.charges||0)>0&&squad[0])squad[0].charge=1;
  const roster=[...squad];
  if((SCN.mode==='rescue'||SCN.mode==='strider')&&spec.vip){
    const big=!!spec.vip.strider;
    roster.push(mkU({id:'dissident',pid:'dissident',name:spec.vip.name,first:spec.vip.first,side:'reb',
      x:SCN.cage.x+SCN.cage.w/2,y:SCN.cage.y+SCN.cage.h/2,hp:spec.vip.hp||45,maxhp:spec.vip.hp||45,aim:big?2:1,def:spec.vip.def||11,cool:big?90:45,level:1,stims:0,
      wpns:spec.vip.wpns||['cowboy'],frail:big?0:1,big:big?1:0,auto:big?1:0,vip:1,caged:1,away:1,lines:['Thank God. Get me out of here.','I can\u2019t fight, but I can run.','Keep the shooting away from me!']}));
  }
  if(spec.pilot){
    roster.push(mkU({id:'sera',pid:spec.pilot.id,name:spec.pilot.name,first:spec.pilot.first,side:'reb',
      x:LZ.x+16,y:LZ.y+34,hp:55,maxhp:55,aim:1,def:11,cool:45,level:(spec.pilot.level||2),stims:1,wpns:['cowboy'],frail:1,lines:PILOT_LINES}));
  }
  U=[
    ...roster,
    ...SCN.foes().map(mkU),
    ...SCN.civs().map(mkU),
  ];
  for(const u of U)u.face=u.side==='reb'?-Math.PI/4:u.side==='civ'?Math.PI*Math.random():Math.PI*0.8;
}

/* ---------- state ---------- */
let phase='BRIEF';       // BRIEF, CUTSCENE, FREE, PLANNING, EXEC, ENGAGE, EXTRACT, GAMEOVER
let round=0,started=false,town='calm';
let hotT=0,rtPing=null,extractFx=null,freeHinted=false,lastSpotT=0,lastFrame=0;
let NADES=0,nades=[],dmgRound=new Set();
let sneak=false,turret={gunner:null,face:Math.PI},WORK=[],decals=[],exploQ=[];
let selId=null,pickMode=null,radialOn=false,radialSub=null;
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
let floaters=[],tracers=[],parts=[],bubbles=[],casings=[];
let cam={x:LZ.x,y:LZ.y,z:0.9},camGoal=null,follow=true;
let cs=null;             // cutscene state
let shake=0,alertFlash=0,tumble={x:-200,y:830,v:34,r:16,spin:0};
let gameEnd=null;

/* ---------- geometry, LOS, cover ---------- */
function inRect(px,py,b){return px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h;}
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
    addFloater(prop.x,prop.y-24,'COVER DESTROYED','#ff8f9a');
    log('<span class="h">'+PROPDEF[prop.kind].lab+' shot to pieces</span> — that cover is gone.');
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

/* ---------- logging & chatter ---------- */
const logEl=byId('log');
function log(html){
  const p=document.createElement('p');p.innerHTML=html;
  logEl.appendChild(p);logEl.scrollTop=logEl.scrollHeight;
  while(logEl.children.length>90)logEl.removeChild(logEl.firstChild);
}
function nameSpan(u){return '<span class="'+(u.side==='reb'?'r':'h')+'">'+u.name+'</span>';}
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
  if(gunner.shield&&!gunner.down){
    const a0=Math.atan2(shooter.y-gunner.y,shooter.x-gunner.x);
    if(Math.abs(angNorm(a0-gunner.face))<1.0)return true;
  }
  // the turret's frontal plate: no shot lands from inside its facing arc
  if(!gunner.manning)return false;
  const a=Math.atan2(shooter.y-TURRET.y,shooter.x-TURRET.x);
  return Math.abs(angNorm(a-turret.face))<SHIELD_ARC;
}
function wpnsOf(s){return s.manning?['laser']:s.wpns;}
function validShot(s,t,wkey){
  if(t.side==='civ')return false;
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
  if(coolStateG(t)==='cool'){v+=1;e.push(['TARGET COOL',1]);}
  if(coolStateG(t)==='panic'){v-=2;e.push(['TARGET PANICKING',-2]);}
  if(t.wound){v-=1;e.push(['TARGET WOUNDED',-1]);}
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
  if(w.atk){v+=w.atk;e.push([w.name.toUpperCase(),w.atk]);}
  if(s.braced&&!snap){v+=2;e.push(['BRACED',2]);}
  if(s.ambush&&!snap){v+=2;e.push(['AMBUSH',2]);}
  if(coolStateG(s)==='cool'){v+=1;e.push(['COOL',1]);}
  if(dist(s,t)<130){v+=2;e.push(['POINT BLANK',2]);}
  if(snap){v-=2;e.push(['SNAP SHOT',-2]);}
  if(s.wound){v-=1;e.push(['WOUNDED',-1]);}
  return {total:v,entries:e};
}
function needFor(tn,atk){return Math.max(2,Math.min(19,tn-atk));}
function pctFor(need){return Math.round((21-need)/20*100);}
function rollDamage(s,t,wkey,crit){
  const w=WPN[wkey];
  let d=rint(w.d0,w.d1);
  if(w.falloff)d=Math.round(d*(1-0.55*Math.min(1,dist(s,t)/w.rng)));
  if(s&&s.side==='law'&&!s.sheriff)d=Math.round(d*0.85); // rank-and-file shoot to scare
  if(crit)d=Math.round(d*1.5);
  return d;
}
function applyShot(s,t,wkey,snap){
  // full resolution used by overwatch + AI fast paths; returns record
  const tn=computeTN(s,t),atk=computeATK(s,t,wkey,snap);
  const need=needFor(tn.total,atk.total);
  const roll=rint(1,20);
  const jammed=(WPN[wkey].jam&&roll===1);
  const hit=!jammed&&(roll>=need);
  const crit=roll===20;
  let dmg=0;
  if(jammed){
    s.jam=2;
    addFloater(s.x,s.y-40,'AKLI JAMMED','#ffb454');
    log(nameSpan(s)+'’s <span class="a">Akli jams</span> — cheap iron runs dirty.');
    if(s.side==='reb')say(s,'Jam! Clearing it — cover me!');
  } else if(hit){
    dmg=rollDamage(s,t,wkey,crit);
    if(tn.cover&&tn.cover.prop)dmg=Math.max(1,Math.round(dmg*0.75));
    woundUnit(s,t,dmg,crit);
  } else if(tn.cover&&tn.cover.prop){
    chipCover(tn.cover.prop,Math.round(rollDamage(s,t,wkey,false)*0.7));
  }
  return {tn,atk,need,roll,hit,crit,dmg,jammed};
}
function woundUnit(s,t,dmg,crit){
  if(s&&s.side==='reb')s.xpGain=(s.xpGain||0)+0.04;
  t.hp-=dmg;
  dmgRound.add(t.id);
  adjCoolG(t,-16,'took a hit');
  if(crit&&!t.wound&&t.hp>0){t.wound=1;t.aim=Math.max(0,t.aim-1);addFloater(t.x,t.y-52,'WOUNDED','#ff8f9a');}
  addFloater(t.x,t.y-38,'-'+dmg,t.side==='reb'?'#ff6a75':'#ffd27d');
  if(t.hp<=0)downUnit(t,s);
}
function downUnit(t,by){
  if(by&&by.side==='reb'&&t.side==='law')by.xpGain=(by.xpGain||0)+0.2;
  if(by)adjCoolG(by,12,'confirmed kill');
  for(const m of U)if(m.side===t.side&&m!==t)adjCoolG(m,-15,t.first+' down');
  t.hp=0;t.down=1;t.order=null;t.braced=0;
  if(t.charge){
    t.charge=0;
    const heir=U.filter(u=>u.side==='reb'&&!u.down&&!u.extracted&&u.id!==t.id).sort((a,b)=>dist(a,t)-dist(b,t))[0];
    if(heir){heir.charge=1;log(nameSpan(heir)+' picks up the <b>explosive charge</b>.');}
  }
  if(t.manning){t.manning=0;turret.gunner=null;log('The <b>laser turret</b> stands unmanned.');}
  sThud();
  log(nameSpan(t)+' <span class="h">is down</span>'+(by?' — '+nameSpan(by)+'’s shot':'')+'.');
  addFloater(t.x,t.y-46,'DOWN','#ff4f5e');
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
function dropLoot(t){
  if(t.auto||t.vehicle)return;   // scrap, not spoils
  const m={id:'drop_'+t.id,x:t.x+10,y:t.y+10,label:t.name+'’s effects',drop:1};
  if(t.sheriff){m.c=136;m.items=['Scattergun'];m.take='Scattergun + 136 ◈';}
  else if(t.wpns[0]==='carbine'){m.c=rint(24,56);m.items=['Peacekeeper Carbine'];m.take='Carbine + credits';}
  else {m.c=rint(32,72);m.take=m.c+' ◈ credits';}
  lootMarks.push(m);
}

/* ---------- morale, alert, spotting ---------- */
function alertTown(why){
  if(town==='alerted')return;
  town='alerted';alertFlash=performance.now();
  if(fac&&!fac.detonated)fac.everAlerted=true;
  if(rs)rs.everAlerted=true;
  sAlert();
  log('<span class="h">The town is up.</span> '+why);
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
  shooters.sort((a,b)=>(b.aim*3+rint(0,4))-(a.aim*3+rint(0,4)));
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
    if(l.side!=='law'||l.down||l.surr||l.office)continue;
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
      if(l.side!=='law'||l.down||l.surr||l.office)continue;
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
    let r=VIEW_R;
    for(let d=26;d<VIEW_R;d+=16){
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
    if(t.side==='reb'){visUnits.add(t.id);continue;}
    for(const u2 of seers){
      if(dist(u2,t)<VIEW_R&&!losBlocked(u2,t)){visUnits.add(t.id);break;}
    }
  }
  for(const m of lootMarks){
    if(m.taken||m.spotted)continue;
    for(const u2 of seers){
      if(Math.hypot(u2.x-m.x,u2.y-m.y)<VIEW_R&&!segBlocked(u2.x,u2.y,m.x,m.y)){m.spotted=1;break;}
    }
  }
  if(engageQ&&engageQ.cur&&engageQ.cur.t&&engageQ.cur.t.id)visUnits.add(engageQ.cur.t.id);
}
function unitSeen(u){
  if(!SCN||!SCN.fog||phase==='CUTSCENE')return true;
  return u.side==='reb'||visUnits.has(u.id);
}
function drawFog(){
  if(!SCN.fog||phase==='CUTSCENE'||!fogCtx)return;
  fogCtx.setTransform(1,0,0,1,0,0);
  fogCtx.globalCompositeOperation='source-over';
  fogCtx.clearRect(0,0,fogCv.width,fogCv.height);
  fogCtx.fillStyle='rgba(4,7,13,0.93)';
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
  if(u&&u.auto)return;   // robots do not panic
  if(!u||u.side==='civ'||u.down||u.surr||u.extracted||u.away)return;
  const pre=coolStateG(u);
  u.cool=Math.max(0,Math.min(100,u.cool+d));
  if(u.sheriff)u.cool=Math.max(40,u.cool); // bosses do not break
  const post=coolStateG(u);
  if(pre!=='panic'&&post==='panic'){
    addFloater(u.x,u.y-52,'PANICKING','#ff4f5e');
    log(nameSpan(u)+' <span class="h">is panicking</span>'+(why?' <span class="d">('+why+')</span>':''));
    if(u.side==='reb'&&u.order&&u.order.type!=='lockin')u.order=null;
  }
  if(pre==='panic'&&post!=='panic')addFloater(u.x,u.y-52,'STEADIED','#7dd97b');
}
function moraleCheck(){
  const sheriffDown=U.some(u=>u.sheriff&&(u.down||u.surr));
  for(const u of U){
    if(u.side!=='law'||u.down||u.surr||u.sheriff||u.auto)continue;
    let broke=false;
    if(sheriffDown&&rint(1,20)+alliesUp('law')<13)broke=true;
    else if(u.hp<u.maxhp*0.3&&rint(1,20)<7)broke=true;
    if(broke){
      u.surr=1;u.order=null;u.braced=0;
      log(nameSpan(u)+' <span class="g">throws his gun down and surrenders.</span>');
      addFloater(u.x,u.y-46,'SURRENDERS','#7dd97b');
      say(u,'Don’t shoot! I’m done, I’m done!');
    }
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
  for(const u of U){
    if((u.side!=='law'&&!u.ally)||u.down||u.surr||u.office)continue;
    u.order=null;u.sprinted=0;u.owUsed=0;u.goingTurret=0;u.wkey=wpnsOf(u)[0];u.bunkered=0;
    if(!u.manning)u.braced=0;
    if(coolStateG(u)==='panic'&&town==='alerted'){u.order={type:'lockin'};continue;}
    if(u.manning){u.order={type:'hold'};u.braced=1;continue;}
    if(u.fixed){u.order={type:'hold'};u.braced=1;continue;}
    if(!wpnsOf(u).length){   // an unarmed transport cruiser: it unloads, then sits there
      if(u.deploy&&!u.deployed&&town==='alerted')deployUnits(u);
      u.order={type:'hold'};u.braced=1;continue;
    }
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
function setRt(u,tx,ty,spd){
  unstick(u);
  const d=moveDest(u,tx,ty,1e9)||{x:tx,y:ty};
  const p=pathFor(u,d.x,d.y);
  u.rtPath=p?p.slice(1):null;
  u.rtSpd=spd||RT_SPEED;
}
function squadMoveTo(pt){
  tutFlags.moved=1;
  const offs=[[0,0],[36,20],[-32,28],[22,-32]];
  let i=0;
  for(const u of U){
    if(u.side!=='reb'||u.down||u.extracted||u.away||u.manning)continue;
    const o=offs[i%offs.length];i++;
    setRt(u,pt.x+o[0],pt.y+o[1],sneak?SNEAK_SPEED:RT_SPEED);
    u.goingTurret=0;
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
  addFloater(m.x,m.y-30,'+ '+m.take,'#7dd97b');
  log(nameSpan(u)+' loots the <b>'+m.label+'</b> — <span class="g">'+m.take+'</span>.');
  syncUI();
}
function enterFree(msg){
  phase='FREE';
  selId=null;pickMode=null;radialOn=false;engageQ=null;hotT=0;
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
    log('<span class="d">Right-click (or tap the ground) and the squad follows, scooping up anything lootable on the way. Gunfire drops time into rounds.</span>');
  }
  saveSnap();
  syncUI();
}
function manTurret(u){
  turret.gunner=u.id;u.manning=1;u.goingTurret=0;
  u.x=TURRET.x;u.y=TURRET.y;u.rtPath=null;u.path=null;
  u.braced=1;u.order={type:'hold'};u.face=turret.face;
  log(nameSpan(u)+' mans the <b>laser turret</b>.');
  addFloater(TURRET.x,TURRET.y-42,'TURRET MANNED','#7de3ec');
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
    addFloater(wp.x,wp.y-46,(wp.id==='hack'?'HACK ':'WORK ')+Math.min(wp.prog,wp.rounds)+'/'+wp.rounds,'#7de3ec');
    sSpark();
    if(wp.prog<wp.rounds){log(nameSpan(u)+' works the terminal \u2014 <span class="a">'+wp.prog+'/'+wp.rounds+'</span>.');syncUI();return;}
  }
  completeWork(wp,u);
}
function completeWork(wp,u){
  u.xpGain=(u.xpGain||0)+0.1;
  wp.done=true;wp.t=0;
  addFloater(wp.x,wp.y-30,'✓ '+wp.label,'#7dd97b');
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
    addFloater(wp.x,wp.y-60,'DATA SECURED','#7dd97b');
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
      addFloater(wp.x,wp.y-46,(SCN.releaseText?SCN.releaseText.float:v.first.toUpperCase()+' IS FREE'),'#7dd97b');
      log(SCN.releaseText?'<span class="g">'+SCN.releaseText.log+'</span>':'<span class="g">'+v.name+' is out of the cell.</span> Get them and the squad back to the Marta.');
      say(v,v.lines[0]);
    }
    syncUI();
    return;
  }
  if(wp.id==='plant'){
    u.charge=0;fac.planted=true;
    addFloater(wp.x,wp.y-46,'CHARGE SET','#ff9a5c');
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
  addFloater(r.x,r.y-46,SCN.bossFloat,'#ff4f5e');
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
    const nm=a.mode==='strafe'?'Strafing Run':a.mode==='doorgun'?'Door Gunner':'Reinforcements';
    const sub=a.mode==='strafe'?'two taps: where the run starts, then its heading · hits at round end · danger close':
      a.mode==='doorgun'?'circles for 2 rounds, rakes up to 3 enemies a round':'lands '+a.soldiers.length+' soldier'+(a.soldiers.length===1?'':'s')+' at the start of the next planning';
    it.push({key:'s'+i,name:nm+' · '+a.name,sub});
  });
  return it;
}
function fsSeen(pt){return U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&!u.ally&&dist(u,pt)<VIEW_R&&!segBlocked(u.x,u.y,pt.x,pt.y));}
function fsPlace(key,pt){
  if(!fsSeen(pt)){addFloater(pt.x,pt.y-20,'NO VISUAL','#71809c');return false;}
  if(key==='drop'){
    FS.dropUsed=true;FS.orders.push({kind:'drop',x:pt.x,y:pt.y,landed:false});
    log('<span class="a">Supply drop called in.</span> It lands as the next round begins.');
    sTick();return true;
  }
  const i=+key.slice(1),a=FS.ships[i];
  if(!a)return true;
  if(a.mode==='doorgun'){
    a.state='active';a.left=2;
    log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> Door gunner on station for two rounds.');
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
    addFloater(o.x,o.y-34,'SUPPLY DROP','#7dd97b');sLand();
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
function dgAttack(a){
  const seen=hostilesActive().filter(t=>unitSeen(t)&&U.some(r=>r.side==='reb'&&!r.down&&!r.away&&dist(r,t)<VIEW_R&&!losBlocked(r,t)));
  const pick=[];
  while(pick.length<3&&seen.length)pick.push(seen.splice(rint(0,seen.length-1),1)[0]);
  if(!pick.length){log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> No targets in view.');return;}
  const t0=performance.now();
  for(const t of pick){
    const hit=rint(1,20)>=9;
    tracers.push({x1:t.x-260,y1:t.y-260,x2:t.x,y2:t.y,t0,dur:260,col:'#ffd27d'});
    if(hit){const dmg=rint(16,28);woundUnit(null,t,dmg,false);log('The door gunner hits '+nameSpan(t)+' — <b>'+dmg+'</b>.');}
    else log('The door gunner misses '+nameSpan(t)+'.');
  }
  sShot('carbine');
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
    dgAttack(a);
    a.left--;
    if(a.left<=0){a.state='spent';log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> Door gunner is bingo. Breaking off.');}
  }
}
function mkSquadUnit(sp,x,y){
  return mkU({id:sp.id,pid:sp.id,name:sp.name,first:sp.first,side:'reb',x,y,hp:sp.hp||100,maxhp:sp.hp||100,aim:sp.aim||2,def:sp.def||12,cool:65,
    level:sp.level||1,stims:sp.autoType?0:1,spec:sp.spec||null,big:sp.big?1:0,heavy:sp.heavy?1:0,auto:sp.autoType?1:0,autoType:sp.autoType||null,hackRounds:0,
    wpns:sp.wpns||['akli','cowboy'],lines:REB_LINES[sp.id]||REB_LINES.generic,reinf:1});
}
function fsPlanStart(){
  if(!FS)return;
  for(const o of FS.orders){
    if(o.kind!=='reinforce'||o.done||o.at>round)continue;
    o.done=true;
    const a=FS.ships[o.ship];a.state='spent';
    a.soldiers.forEach((sp,j)=>{
      const u=mkSquadUnit(sp,o.x+(j-0.5)*40,o.y+30);
      const d=moveDest(u,u.x,u.y,120);if(d){u.x=d.x;u.y=d.y;}
      u.face=-Math.PI/2;U.push(u);
    });
    sLand();
    addFloater(o.x,o.y-40,'REINFORCEMENTS','#7dd97b');
    log('<span class="g">'+a.name+' sets down and '+a.soldiers.length+' soldier'+(a.soldiers.length===1?'':'s')+' pile out.</span>');
  }
}
function drawFS(now){
  if(!FS)return;
  for(const o of FS.orders){
    if(o.done||(o.kind==='drop'&&o.landed))continue;
    ctx.save();
    if(o.kind==='strafe'){
      ctx.strokeStyle='rgba(255,170,90,0.7)';ctx.lineWidth=3;ctx.setLineDash([16,10]);
      ctx.beginPath();ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x1+Math.cos(o.ang)*900,o.y1+Math.sin(o.ang)*900);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(255,170,90,0.9)';ctx.font='700 12px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillText('STRAFING RUN',o.x1,o.y1-14);
    } else {
      ctx.strokeStyle='rgba(125,227,236,'+(0.5+0.3*Math.sin(now*0.006))+')';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(o.x,o.y,26,0,7);ctx.stroke();
      ctx.fillStyle='rgba(125,227,236,0.85)';ctx.font='700 11px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillText(o.kind==='drop'?'DROP':'REINFORCE',o.x,o.y-34);
    }
    ctx.restore();
  }
  if(fsDraft){
    ctx.save();ctx.fillStyle='rgba(255,170,90,0.9)';ctx.beginPath();ctx.arc(fsDraft.x1,fsDraft.y1,6,0,7);ctx.fill();ctx.restore();
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
  return !!(s&&t&&s.spec==='fieldtech'&&!s.down&&!s.extracted&&!s.away&&!s.manning&&
    t.side==='law'&&t.auto&&t.hackRounds&&!t.down&&!t.surr&&dist(s,t)<=HACK_R&&!losBlocked(s,t));
}
function hackTargets(s){return U.filter(t=>canHack(s,t));}
function hackFlip(s,t){
  t.side='reb';t.ally=1;t.hacked=1;t.order=null;t.hackProg=0;t.braced=0;t.path=null;t.rtPath=null;t.guard=0;t.patrol=null;
  addFloater(t.x,t.y-50,'HACKED','#7de3ec');
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
    addFloater(t.x,t.y-50,'HACK '+Math.min(t.hackProg,t.hackRounds)+'/'+t.hackRounds,'#7de3ec');
    if(t.hackProg>=t.hackRounds)hackFlip(u,t);
    else log(nameSpan(u)+' works on <b>'+t.name+'</b> — <span class="a">'+t.hackProg+'/'+t.hackRounds+'</span>.');
  }
  for(const t of U)if(t.hackProg>0&&!t.hackedNow&&t.side==='law')t.hackProg=0;
}
function startFreeHack(t){
  const tech=U.find(x=>canHack(x,t));
  hackArm=false;
  if(!tech){addFloater(t.x,t.y-40,'NO TECH IN RANGE','#71809c');syncUI();return;}
  tech.hackTid=t.id;t.hackT=0;tech.rtPath=null;
  log(nameSpan(tech)+' starts hacking <b>'+t.name+'</b>. Hold position.');
  syncUI();
}
function hackFreeStep(dt){
  for(const s of U){
    if(!s.hackTid)continue;
    const t=U.find(x=>x.id===s.hackTid);
    if(!t||!canHack(s,t)||s.rtPath){if(t)addFloater(t.x,t.y-50,'HACK BROKEN','#ff9a5c');s.hackTid=null;if(t)t.hackProg=0;continue;}
    t.hackT+=dt;
    if(t.hackT>=4){
      t.hackT=0;t.hackProg++;
      addFloater(t.x,t.y-50,'HACK '+Math.min(t.hackProg,t.hackRounds)+'/'+t.hackRounds,'#7de3ec');
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
    addFloater(PAD.x,PAD.y-70,'DEPOT REACHED','#7dd97b');
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
function deployUnits(v){
  v.deployed=1;
  spawnFoes(v.deploy.map((d,i)=>Object.assign({},d,{x:v.x+(i-1)*34,y:v.y+44})),'<span class="h">'+v.name+' disgorges its riot squad.</span>');
}
function spawnFoes(list,msg){
  for(const f of list){
    const u=mkU(Object.assign({},f));
    u.face=Math.PI;u.wave=1;
    U.push(u);
  }
  if(msg){log(msg);sAlert();}
}
function fuelPumpStep(){
  if(!fs||!fs.landed||fs.done)return;
  if(!fuelGuards()){
    addFloater(PAD.x,PAD.y-60,'PUMPS STALLED — NO ONE ON THE APRON','#ff9a5c');
    return;
  }
  fs.pump++;
  addFloater(PAD.x,PAD.y-60,'FUEL '+Math.min(fs.pump,FUEL_ROUNDS)+'/'+FUEL_ROUNDS,'#7de3ec');
  sSpark();
  for(const w of (SCN.waves||[])){
    if(w.at!==fs.pump)continue;
    spawnFoes(w.foes,w.log);
  }
  if(fs.pump>=FUEL_ROUNDS){
    fs.done=true;
    addFloater(PAD.x,PAD.y-88,'TANKS FULL','#7dd97b');
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
    addFloater(SCN.plant.bx,SCN.plant.by-130,'TOO CLOSE \u2014 CLEAR THE BLAST ZONE','#ff9a5c');
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
  if(cam.z>0.5){ctx.font='700 11px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='rgba(205,216,236,0.55)';ctx.fillText(c.label||'DETENTION',c.x+c.w/2,c.y-10);}
  ctx.restore();
}
function drawFactory(now){
  if(!fac)return;
  const P=SCN.plant;
  if(fac.planted&&!fac.detonated){
    ctx.save();
    ctx.strokeStyle='rgba(255,90,70,'+(0.35+0.25*Math.sin(now*0.008))+')';ctx.lineWidth=3;ctx.setLineDash([14,10]);
    ctx.beginPath();ctx.arc(P.bx,P.by,SCN.safeR,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,90,70,0.05)';ctx.beginPath();ctx.arc(P.bx,P.by,SCN.safeR,0,7);ctx.fill();
    if(cam.z>0.45){ctx.font='700 13px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='rgba(255,130,100,0.8)';ctx.fillText('BLAST ZONE',P.bx,P.by-SCN.safeR+22);}
    ctx.restore();
  }
  if(fac.detonated){
    ctx.save();
    ctx.fillStyle='rgba(8,6,4,0.55)';ctx.fillRect(P.x,P.y,P.w,P.h);
    const g=ctx.createRadialGradient(P.bx,P.by,10,P.bx,P.by,P.w*0.7);
    g.addColorStop(0,'rgba(255,140,60,'+(0.35+0.15*Math.sin(now*0.01))+')');g.addColorStop(1,'rgba(255,140,60,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(P.bx,P.by,P.w*0.7,0,7);ctx.fill();
    ctx.font='700 14px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='rgba(255,190,140,0.75)';
    ctx.fillText('OFFLINE',P.bx,P.by+4);
    ctx.restore();
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
    if(u.down||u.surr||u.extracted||u.away)continue;
    if(u.side==='reb'&&!u.manning){
      rtStep(u,dt);
      if(u.goingTurret&&!u.rtPath){
        u.goingTurret=0;
        if(!turret.gunner&&dist(u,TURRET)<52)manTurret(u);
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
    if(u.side!=='reb'||u.down||u.extracted||u.away)continue;
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
      addFloater(sera.x,sera.y-46,'HOTWIRE '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,'#ffb454');
      if(hot>=HOT_ROUNDS)tryLaunch();
    }
  } else hotT=0;
  for(const wp of WORK){
    if(wp.done)continue;
    if(wp.needClear&&hostilesActive().length)continue;
    const worker=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.vip&&!u.away&&!u.down&&!u.extracted&&!u.manning&&(!wp.needSpec||u.spec===wp.needSpec)&&(!wp.needCharge||u.charge)&&Math.hypot(u.x-wp.x,u.y-wp.y)<46);
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
  selId=null;pickMode=null;radialOn=false;
  const E=exitPt();
  camGoal={x:E.x+120,y:E.y-40,z:1.0};
  extractFx={stage:'board',t0:performance.now()};
  let i=0;
  for(const u of U){
    if(u.side!=='reb'||u.down||u.extracted||u.away)continue;
    if(u.manning)unmanTurret(u);
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
        addFloater(u.x,u.y-36,'ABOARD','#7dd97b');
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
    if(u.jam>0){u.jam--;if(u.jam===0){log(nameSpan(u)+' works the Akli’s action clear.');}}
  }
  aiPlan();
  haltSquad();
  selId=null;pickMode=null;radialOn=false;
  autoAdvance();
  saveSnap();
  syncUI();
}
function hotwiring(u){return u.id==='sera'&&!crossAway&&hot<HOT_ROUNDS&&dist(u,PAD)<PAD.r;}
function autoAdvance(){
  // hand the player the next rebel who still needs orders, like the space game
  const nxt=U.find(u=>u.side==='reb'&&!u.ally&&!u.down&&!u.extracted&&!u.away&&!u.manning&&!u.order&&!hotwiring(u));
  if(nxt){
    selId=nxt.id;radialOn=true;pickMode=null;
    camGoal={x:nxt.x,y:nxt.y,z:Math.max(cam.z,0.9)};
  } else {selId=null;radialOn=false;}
}
function plotted(){return U.filter(u=>u.side==='reb'&&!u.ally&&!u.down&&!u.extracted&&!u.away&&!hotwiring(u));}
function execute(){
  if(phase!=='PLANNING')return;
  tutFlags.executed=1;
  sTick();
  phase='EXEC';execT0=performance.now();
  fsExecute();
  selId=null;pickMode=null;radialOn=false;
  // armed grenades from earlier rounds go off as the round opens
  const armed=nades.filter(g=>g.armRound<round);
  nades=nades.filter(g=>g.armRound>=round);
  for(const g of armed){
    log('<span class="a">The BLAM cooks off!</span>');
    explode(g.x,g.y,{r:NADE_BLAST,d0:32,d1:52});
  }
  for(const u of U){
    u.px=u.x;u.py=u.y;u.path=null;
    if(u.down||u.surr||u.extracted||u.away)continue;
    if(u.manning){u.braced=1;u.sprinted=0;continue;}
    const o=u.order;
    if(o&&(o.type==='move'||o.type==='sprint')){
      u.path=pathFor(u,o.tx,o.ty);
      u.sprinted=o.type==='sprint'?1:0;
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
    } else if(o&&o.type==='lockin'){
      u.sprinted=0;u.braced=0;
      adjCoolG(u,35,'locked in');
      addFloater(u.x,u.y-40,'LOCKED IN','#7dd97b');
    } else if(o&&o.type==='cover'){
      u.sprinted=0;u.braced=0;u.bunkered=1;
      addFloater(u.x,u.y-40,'TAKING COVER','#7de3ec');
    } else if(o&&o.type==='hold'){u.braced=1;u.sprinted=0;}
    else u.sprinted=0;
  }
  lastOw=0;
  syncUI();
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
        log(nameSpan(h)+' <span class="a">snap-fires</span> at '+nameSpan(m)+' crossing open ground — '+(rec.jammed?'<span class="a">weapon jams!</span>':rec.hit?'<span class="h">hit</span> (-'+rec.dmg+')':'<span class="d">miss</span>')+'.');
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
    if(o&&(o.type==='loot'||o.type==='clear'||o.type==='work'||o.type==='lockin'||o.type==='cover'||o.type==='hack'))continue;
    if(coolStateG(s)==='panic')continue;
    if(s.side==='law'&&town!=='alerted')continue;
    if(s.side==='reb'&&s.id==='sera'&&dist(s,PAD)<PAD.r&&!crossAway)continue; // head down in the panel
    const anyT=U.some(t=>t.side!==s.side&&wpnsOf(s).some(w=>validShot(s,t,w)));
    if(!anyT)continue;
    list.push(s);
  }
  if(!list.length){endRound();return;}
  list.sort((a,b)=>(b.aim*3+rint(0,4))-(a.aim*3+rint(0,4)));
  engageQ={list,idx:0,cur:null,nextAt:performance.now()+350};
  phase='ENGAGE';
  syncUI();
}
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
    camGoal={x:(s.x+pk.t.x)/2,y:(s.y+pk.t.y)/2,z:Math.max(cam.z,0.95)};
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
      c.jammed=(WPN[c.wkey].jam&&c.roll===1);
      c.hit=!c.jammed&&c.roll>=c.need;
      c.crit=c.roll===20;
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
      if(c.t.obj){
        if(c.jammed){
          c.s.jam=2;
          addFloater(c.s.x,c.s.y-40,'AKLI JAMMED','#ffb454');
          log(nameSpan(c.s)+'’s <span class="a">Akli jams on the trigger.</span>');
        } else if(c.hit){
          log(nameSpan(c.s)+' puts a round through the <b>fuel canister</b>.');
          detonate(c.t.prop);
        } else {
          log(nameSpan(c.s)+'’s shot sparks off the ground beside the canister.');
        }
      } else if(c.jammed){
        c.s.jam=2;
        addFloater(c.s.x,c.s.y-40,'AKLI JAMMED','#ffb454');
        log(nameSpan(c.s)+'’s <span class="a">Akli jams on the trigger.</span>');
        if(c.s.side==='reb')say(c.s,'Jam! Of course it jams NOW.');
      } else if(c.hit){
        let dmg=rollDamage(c.s,c.t,c.wkey,c.crit);
        const soaked=!!(c.tn.cover&&c.tn.cover.prop);
        if(soaked)dmg=Math.max(1,Math.round(dmg*0.75));
        c.dmg=dmg;
        woundUnit(c.s,c.t,dmg,c.crit);
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
  sTick();c.stage='roll';c.stageAt=performance.now();sDice();syncUI();
}
function throwNade(s,gx,gy){
  NADES--;
  nades.push({x:gx,y:gy,fx:s.x,fy:s.y,t0:performance.now(),armRound:round});
  s.face=Math.atan2(gy-s.y,gx-s.x);
  log(nameSpan(s)+' lobs a <b>BLAM frag</b> — it lands, primed.');
  addFloater(gx,gy-14,'PRIMED','#ff9a5e');
  sTick();
  pickMode=null;
  if(engageQ&&engageQ.cur){engageQ.cur=null;engageQ.nextAt=performance.now()+500;}
  camGoal={x:gx,y:gy,z:Math.max(cam.z,0.9)};
  syncUI();
}
function useStim(s){
  if(!s.stims||s.hp>=s.maxhp)return;
  s.stims--;
  const heal=Math.round(s.maxhp*0.3);
  s.hp=Math.min(s.maxhp,s.hp+heal);
  addFloater(s.x,s.y-40,'+'+heal+' STIM','#7dd97b');
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
  if(!validShot(c.s,t,w)){addFloater(p.x,p.y-26,'NO SHOT','#71809c');return;}
  engageQ.cur=makeCur(c.s,t,w);
  engageQ.cur.reveal=engageQ.cur.tn.entries.length;
  engageQ.cur.revealA=engageQ.cur.atk.entries.length;
  engageQ.cur.need=needFor(engageQ.cur.tn.total,engageQ.cur.atk.total);
  engageQ.cur.stage='await';
  sTick();syncUI();
}
function retarget(t){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await'||t.side!=='law'||t.down||t.surr)return;
  if(t.manning&&shieldBlocks(c.s,t)){addFloater(t.x,t.y-30,'TURRET SHIELD','#57a8ff');return;}
  const w=bestWeapon(c.s,t)||c.wkey;
  if(!validShot(c.s,t,w))return;
  engageQ.cur=makeCur(c.s,t,w);
  engageQ.cur.reveal=engageQ.cur.tn.entries.length;
  engageQ.cur.revealA=engageQ.cur.atk.entries.length;
  engageQ.cur.need=needFor(engageQ.cur.tn.total,engageQ.cur.atk.total);
  engageQ.cur.stage='await';
  sTick();syncUI();
}
/* ---------- end of round ---------- */
function endRound(){
  for(const u of U)u.ambush=0; // surprise is spent with the first volley
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
    const worker=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.vip&&!u.away&&!u.down&&!u.extracted&&!u.manning&&(!wp.needSpec||u.spec===wp.needSpec)&&(!wp.needCharge||u.charge)&&
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
    addFloater(sera.x,sera.y-46,'HOTWIRE '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,'#ffb454');
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
          u.extracted=1;u.order=null;
          log(nameSpan(u)+' <span class="g">is up the Graf’s ramp.</span>');
          addFloater(u.x,u.y-40,'EXTRACTED','#7dd97b');
        } else {
          log('<span class="a">Lawmen too close to the Graf — ramp stays shut.</span>');
        }
      }
    }
    const soldiers=U.filter(u=>u.side==='reb'&&u.id!=='sera');
    if(soldiers.every(u=>u.extracted||u.down)&&soldiers.some(u=>u.extracted)){gameOver(true);return;}
  }
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
      lh2+='<div class="lootline"><span>Haven Rock</span><span>SECURED</span></div>';
      if(tally.c)lh2+='<div class="lootline"><span>Credits scavenged</span><span>◈ '+tally.c+'</span></div>';
      if(tally.s)lh2+='<div class="lootline"><span>Supplies scavenged</span><span>▤ '+tally.s+'</span></div>';
      for(const it of tally.items)lh2+='<div class="lootline"><span>'+it+'</span><span>TAKEN</span></div>';
    }
    byId('endLoot').innerHTML=lh2;
    byId('endRestartBtn').textContent='Continue';
    byId('endRetryBtn').hidden=true;
    byId('endscreen').hidden=false;
    pendingResult=buildResult(win);
    syncUI();
    return;
  }
  byId('endRestartBtn').textContent='Continue';
  byId('endRetryBtn').hidden=!((SCN.mode==='stealcross'||SCN.mode==='stealfuel'||SCN.mode==='autofactory'||SCN.mode==='rescue'||SCN.mode==='intel'||SCN.mode==='strider')&&!win);
  byId('endEyebrow').textContent=win?(ix?'Mission Report · Data Flats':SCN.mode==='strider'?'Mission Report · Menk Crossing':rs?'Mission Report · Tollgate Landing':fac?'Mission Report · Kiln Ridge':fs?'Mission Report · Redrock Flats':'Mission Report · Dustfall'):'Mission Report · It went wrong';
  byId('endTitle').textContent=win?(ix?'Data Secured':SCN.mode==='strider'?'The Strider Is Ours':rs?'Freed':fac?'Lights Out':fs?'Tanks Full':'The Cross Is Ours'):'Mission Failed';
  let txt;
  if(ix){
    txt=win?'The Field Technician walked off the Data Flats with the Bureau\u2019s registry backups on a single drive. Every name, every quota, every dissident file. Somewhere in the Hegemony a very quiet meeting has just started.'+(left.length?' It cost us: '+left.join(', ')+' left on the Flats. We don\u2019t forget that.':''):
      'The squad was overrun around the server farm and the Marta lifted with nothing. The databank is still sealed.';
  } else if(SCN.mode==='strider'){
    txt=win?'A Strider Mk I walked up the Marta\u2019s ramp with its face-screen still reading \u201cWe\u2019re all in this together\u201d and a fresh rebel badge scratched into its chest plate. The Hegemony is out one walker. We are in one.'+(rs.everAlerted?'':' Nobody at the Crossing saw it leave.')+(left.length?' It cost us: '+left.join(', ')+' left at the depot. We don\u2019t forget that.':''):
      (why==='vip'?'The Strider went down in the yard, and with it the whole plan. The squad pulled out with nothing to show for it.':'The squad was overrun around the depot and the Marta lifted empty. The Strider is still chained in its yard.');
  } else if(rs){
    const vn=(U.find(u=>u.vip)||{name:'The prisoner'}).name;
    txt=win?vn+' stepped aboard the Marta shaking, quiet and very much alive. '+(rs.everAlerted?'The outpost will spend a week working out what happened.':'The outpost will spend a week working out who opened the door, and never find out.')+(left.length?' It cost us: '+left.join(', ')+' left at the outpost. We don\u2019t forget that.':''):
      (why==='vip'?vn+' went down before the Marta was in reach. There is no bringing that back. The squad pulled out with nothing.':'The squad was overrun around the outpost and the Marta lifted empty. The cell is still locked.');
  } else if(fac){
    txt=win?(fac.quiet?'Nobody on Kiln Ridge saw us come or go. One moment the Autoworks was humming; the next the whole plant was dark and the night shift was standing outside wondering who to blame.':'The Power Plant is a crater and the Autoworks is dark. The alarm had already gone, but it made no difference: the line will not turn out another Policebot for a long time.')+(left.length?' It cost us: '+left.join(', ')+' left on the plant floor. We don\u2019t forget that.':''):
      (fac.planted&&!fac.detonated?'The charge never got its chance. The squad was pulled out before the plant could be dropped, and Security will find the charge by morning.':'The squad was overrun inside the Autoworks and the Marta lifted empty. The line keeps running.');
  } else if(fs){
    txt=win?'The Marta lifted off Redrock Flats heavy with the tithe: every drop the herders paid, pumped back out of the depot that took it. Somewhere a warden is writing a very long report.'+(left.length?' It cost us: '+left.join(', ')+' left on the apron. We don\u2019t forget that.':''):
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
  if(win&&ix){
    lh+='<div class="lootline"><span>Bureau registry backups</span><span>COPIED</span></div>';
    if(tally.c)lh+='<div class="lootline"><span>Credits looted</span><span>◈ '+tally.c+'</span></div>';
    if(tally.s)lh+='<div class="lootline"><span>Supplies looted</span><span>▤ '+tally.s+'</span></div>';
    for(const it of tally.items)lh+='<div class="lootline"><span>'+it+'</span><span>TAKEN</span></div>';
  } else if(win&&rs){
    const vn=(U.find(u=>u.vip)||{name:'Prisoner'}).name;
    lh+='<div class="lootline"><span>'+vn+'</span><span>'+(SCN.mode==='strider'?'STOLEN':'FREED')+'</span></div>';
    lh+='<div class="lootline"><span>Stayed unseen</span><span>'+(rs.everAlerted?'no':'YES \u2014 bonus')+'</span></div>';
    if(tally.c)lh+='<div class="lootline"><span>Credits looted</span><span>◈ '+tally.c+'</span></div>';
    if(tally.s)lh+='<div class="lootline"><span>Supplies looted</span><span>▤ '+tally.s+'</span></div>';
    for(const it of tally.items)lh+='<div class="lootline"><span>'+it+'</span><span>TAKEN</span></div>';
  } else if(win&&fac){
    lh+='<div class="lootline"><span>Kiln Ridge Power Plant</span><span>DESTROYED</span></div>';
    lh+='<div class="lootline"><span>Stayed unseen</span><span>'+(fac.quiet?'YES \u2014 bonus':'no')+'</span></div>';
    if(tally.c)lh+='<div class="lootline"><span>Credits looted</span><span>◈ '+tally.c+'</span></div>';
    if(tally.s)lh+='<div class="lootline"><span>Supplies looted</span><span>▤ '+tally.s+'</span></div>';
    for(const it of tally.items)lh+='<div class="lootline"><span>'+it+'</span><span>TAKEN</span></div>';
  } else if(win&&fs){
    lh+='<div class="lootline"><span>Marta\u2019s fuel tanks</span><span>FULL</span></div>';
    if(tally.c)lh+='<div class="lootline"><span>Credits looted</span><span>◈ '+tally.c+'</span></div>';
    if(tally.s)lh+='<div class="lootline"><span>Supplies looted</span><span>▤ '+tally.s+'</span></div>';
    for(const it of tally.items)lh+='<div class="lootline"><span>'+it+'</span><span>TAKEN</span></div>';
  } else if(win){
    lh+='<div class="lootline"><span>FT-4 Cross starfighter</span><span>SECURED</span></div>';
    if(tally.c)lh+='<div class="lootline"><span>Credits looted</span><span>◈ '+tally.c+'</span></div>';
    if(tally.s)lh+='<div class="lootline"><span>Supplies looted</span><span>▤ '+tally.s+'</span></div>';
    for(const it of tally.items)lh+='<div class="lootline"><span>'+it+'</span><span>TAKEN</span></div>';
    if(!tally.c&&!tally.s&&!tally.items.length)lh+='<div class="lootline"><span>Loot</span><span>none — clean and quiet</span></div>';
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
    if(u.side!=='reb')continue;
    let state='ok';
    if(u.down)state=haven?(win?'injured':'ok'):'injured'; // nobody is buried this early in the war
    const xp=Math.round(((u.xpGain||0)+(win?0.12:0.03))*100)/100;
    people.push({id:u.pid||u.id,xp,state,dur:haven?rint(1,3):rint(3,6)});
  }
  if(CTX&&CTX.grafPilot)people.push({id:CTX.grafPilot.id,xp:win?0.1:0.04,state:'ok'});
  const gained=win?U.filter(u=>u.hacked&&u.extracted&&!u.down).map(u=>({type:u.autoType,name:u.name})):[];
  return {gained,kind:'ground',missionId:(CTX&&CTX.missionId)||'stealcross',
    days:(CTX&&CTX.days!==undefined)?CTX.days:2,
    win,cross:SCN.mode==='stealcross'&&!!win,nades:NADES,quiet:!!((fac&&fac.detonated&&fac.quiet)||(rs&&rs.released&&!rs.everAlerted)),vipOut:!!(U.find(u=>u.vip&&u.extracted)),chargeUsed:(fac&&(fac.planted))?1:0,loot:{c:tally.c,s:tally.s,items:tally.items.slice()},people};
}
/* ---------- explosions ---------- */
function explode(x,y,opt){
  const R=(opt&&opt.r)||135,D0=(opt&&opt.d0)||45,D1=(opt&&opt.d1)||70;
  sBoomBig();shake=performance.now();
  decals.push({x,y,r:(R/135)*(52+rng()*14)});
  for(let k=0;k<26;k++)parts.push({x:x+(rng()-0.5)*40,y:y+(rng()-0.5)*40,vx:(rng()-0.5)*260,vy:-rng()*160,r:2.5+rng()*4,a:0.8,col:k%3?'#ff9a3c':'#ffd27d',t0:performance.now(),dur:520});
  for(let k=0;k<14;k++)parts.push({x:x+(rng()-0.5)*60,y:y+(rng()-0.5)*60,vx:(rng()-0.5)*90,vy:-30-rng()*60,r:5+rng()*7,a:0.4,col:'#3a3430',t0:performance.now(),dur:1300});
  parts.push({x,y,vx:0,vy:0,r:60,a:0.85,col:'#ffe9b0',t0:performance.now(),dur:160,flash:1});
  for(const u of U){
    if(u.side==='civ'||u.down||u.extracted||u.away||u.office)continue;
    const d=Math.hypot(u.x-x,u.y-y);
    if(d<R){
      const dmg=Math.round((D0+rng()*(D1-D0))*(1-d/R*0.55));
      woundUnit(null,u,dmg,false);
      if(!u.down)log(nameSpan(u)+' is caught in the blast — <b>-'+dmg+'</b>.');
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
    tracers.push({x1:s.x+Math.cos(ang)*30,y1:s.y+Math.sin(ang)*30,x2:end.x,y2:end.y,t0:performance.now(),dur:200,col:'#ff5e6e',beam:1});
    parts.push({x:end.x,y:end.y,vx:0,vy:0,r:12,a:0.8,col:'#ff8f9a',t0:performance.now(),dur:160,flash:1});
    sLaser();
    if(!hit)for(const p of PROPS)if(!p.dead&&p.kind==='canister'&&Math.hypot(p.x-end.x,p.y-end.y)<30)detonate(p);
    return;
  }
  const shots=w.pellets?5:(w.shots||1);
  for(let i=0;i<shots;i++){
    const spread=w.pellets?(i-2)*0.09:(hit?0:(rng()-0.5)*0.16)+(rng()-0.5)*0.03;
    const a=ang+spread;
    const d=dist(s,t)+(hit?0:rint(40,120));
    const mx=s.x+Math.cos(a)*14,my=s.y+Math.sin(a)*14;
    const end=clipShot(mx,my,s.x+Math.cos(a)*d,s.y+Math.sin(a)*d);
    const ex=end.x,ey=end.y;
    tracers.push({x1:mx,y1:my,x2:ex,y2:ey,
      t0:performance.now()+i*(w.pellets?0:90),dur:110,col:s.side==='reb'?'#ffe9b0':'#ffc9a0'});
    const dcol=end.wall?'#8a7a60':'#b09a78';
    for(let k=0;k<(end.wall?6:4);k++)parts.push({x:ex,y:ey,vx:(rng()-0.5)*60,vy:-rng()*50,r:1.5+rng()*2,a:0.5,col:dcol,t0:performance.now()+i*90,dur:500});
    // stray rounds find fuel canisters
    if(!hit&&!end.wall)for(const p of PROPS)if(!p.dead&&p.kind==='canister'&&Math.hypot(p.x-ex,p.y-ey)<28)detonate(p);
  }
  parts.push({x:s.x+Math.cos(ang)*16,y:s.y+Math.sin(ang)*16,vx:0,vy:0,r:9,a:0.9,col:'#ffd27d',t0:performance.now(),dur:90,flash:1});
  casings.push({x:s.x,y:s.y,vx:(rng()-0.5)*40-Math.cos(ang)*30,vy:-40-rng()*30,t0:performance.now()});
  sShot(wkey);
  if(!hit&&rng()<0.4)sRico();
  if(wkey==='scatter')shake=performance.now();
}
/* ---------- audio ---------- */
function sTick(){if(A.off())return;osc('square',1500,1300,0.02,0.045);}
function sShot(wkey){
  if(A.off())return;
  if(wkey==='akli'){
    for(let i=0;i<3;i++){nz('highpass',2400,1,0.16,0.06,i*0.09);osc('square',220,70,0.1,0.07,i*0.09);}
  } else if(wkey==='cowboy'){
    nz('highpass',1700,1,0.2,0.09);osc('triangle',170,55,0.16,0.13);nz('lowpass',500,1,0.12,0.2,0.02);
  } else if(wkey==='carbine'){
    for(let i=0;i<2;i++){nz('highpass',2600,1,0.15,0.06,i*0.11);osc('square',260,80,0.09,0.07,i*0.11);}
  } else if(wkey==='scatter'){
    osc('sine',120,30,0.42,0.5);nz('lowpass',800,0.8,0.4,0.55,0,60);nz('bandpass',320,1.2,0.16,0.3,0.03);
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
function sDice(){if(A.off())return;for(let i=0;i<5;i++)nz('bandpass',2200,3,0.04,0.03,i*0.12*(1+i*0.15));}
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
}
addEventListener('resize',()=>{if(SR.active==='ground')fitCanvas();});
function fitZoom(){return Math.min(cssW/W,cssH/H);}
function clampCam(){
  cam.z=Math.max(fitZoom()*0.92,Math.min(2.1,cam.z));
  const hw=cssW/(2*cam.z),hh=cssH/(2*cam.z);
  cam.x=Math.max(Math.min(cam.x,W+240-hw),hw-240);
  cam.y=Math.max(Math.min(cam.y,H+240-hh),hh-240);
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
function worldToCss(wx,wy){return [(wx-cam.x)*cam.z+cssW/2,(wy-cam.y)*cam.z+cssH/2];}
function cssToWorld(px,py){return {x:(px-cssW/2)/cam.z+cam.x,y:(py-cssH/2)/cam.z+cam.y};}
const MMW=190;
function mmRect(){const mmh=Math.round(MMW*H/W);return {x:14,y:cssH-14-mmh,w:MMW,h:mmh};}
/* ---------- ground detail (seeded once) ---------- */
const patches=[],scrub=[];
function genScatter(){
  patches.length=0;scrub.length=0;
  for(let i=0;i<210;i++)patches.push({x:Math.random()*W,y:Math.random()*H,w:40+Math.random()*160,h:26+Math.random()*90,a:0.03+Math.random()*0.05,warm:Math.random()<0.5});
  for(let i=0;i<160;i++)scrub.push({x:Math.random()*W,y:Math.random()*H,r:2+Math.random()*3.4});
}
/* ---------- drawing ---------- */
function drawGroundHaven(){
  const now=performance.now();
  ctx.fillStyle='#131820';
  ctx.fillRect(0,0,W,H);
  for(const p of patches){
    ctx.fillStyle=p.warm?'rgba(96,110,130,'+p.a+')':'rgba(10,14,20,'+(p.a+0.03)+')';
    ctx.fillRect(p.x,p.y,p.w,p.h);
  }
  // fissures in the rock
  ctx.strokeStyle='rgba(6,9,14,0.6)';ctx.lineWidth=3;
  for(let i=0;i<7;i++){
    const x0=(i*397)%W,y0=(i*263)%H;
    ctx.beginPath();ctx.moveTo(x0,y0);
    ctx.lineTo(x0+60+(i*37)%90,y0+40+(i*53)%70);
    ctx.lineTo(x0+140+(i*23)%60,y0+30+(i*31)%110);
    ctx.stroke();
  }
  for(const sc2 of scrub){
    ctx.fillStyle='rgba(90,110,96,0.22)';
    ctx.beginPath();ctx.arc(sc2.x,sc2.y,sc2.r,0,7);ctx.fill();
  }
  // worn trail: map edge -> squatter camp -> base mouth
  ctx.strokeStyle='rgba(70,80,96,0.4)';ctx.lineWidth=46;ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(LZ.x-30,H+20);
  ctx.quadraticCurveTo(LZ.x+40,LZ.y,620,940);
  ctx.quadraticCurveTo(SCN.camp.x-40,SCN.camp.y+40,SCN.door.x,SCN.door.y+10);
  ctx.stroke();ctx.lineCap='butt';
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
  // room names, faint stencils on the floor
  ctx.font='700 15px "IBM Plex Mono"';ctx.textAlign='center';
  for(const op of SCN.opens){
    if(!op.label)continue;
    ctx.fillStyle='rgba(160,175,200,0.22)';
    ctx.fillText(op.label,op.x+op.w/2,op.y+26);
  }
  // scorch marks
  for(const d of decals){
    const g=ctx.createRadialGradient(d.x,d.y,4,d.x,d.y,d.r);
    g.addColorStop(0,'rgba(8,6,4,0.75)');g.addColorStop(0.7,'rgba(12,9,6,0.45)');g.addColorStop(1,'rgba(12,9,6,0)');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fill();
  }
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
  ctx.fillStyle='rgba(87,215,226,0.4)';ctx.font='700 13px "IBM Plex Mono"';ctx.textAlign='center';
  ctx.fillText('\u25b2',LZ.x,LZ.y+40);
  ctx.fillText('APPROACH',LZ.x,LZ.y+58);
}
function drawGround(){
  if(SCN.style==='rock'){drawGroundHaven();return;}
  ctx.fillStyle='#221a12';
  ctx.fillRect(0,0,W,H);
  for(const p of patches){
    ctx.fillStyle=p.warm?'rgba(120,90,54,'+p.a+')':'rgba(30,24,16,'+(p.a+0.03)+')';
    ctx.fillRect(p.x,p.y,p.w,p.h);
  }
  if(SCN.mode==='stealcross'){
  // main street
  ctx.fillStyle='rgba(58,44,28,0.55)';
  ctx.fillRect(300,764,1560,120);
  ctx.fillStyle='rgba(58,44,28,0.4)';
  ctx.fillRect(1740,764,660,120);
  // wheel ruts
  ctx.strokeStyle='rgba(20,14,8,0.5)';ctx.lineWidth=4;
  for(const ry of [800,846]){
    ctx.beginPath();ctx.moveTo(300,ry);
    for(let x=340;x<2380;x+=60)ctx.lineTo(x,ry+Math.sin(x*0.013)*5);
    ctx.stroke();
  }
  // spur north to the pad
  ctx.strokeStyle='rgba(58,44,28,0.5)';ctx.lineWidth=54;
  ctx.beginPath();ctx.moveTo(2030,780);ctx.quadraticCurveTo(2110,560,PAD.x,PAD.y+70);ctx.stroke();
  // track from LZ
  ctx.beginPath();ctx.moveTo(LZ.x,LZ.y-90);ctx.quadraticCurveTo(400,1050,470,880);ctx.stroke();
  } else {
    // dirt roads: LZ to the depot gate, and the service spur onto the apron
    ctx.strokeStyle='rgba(58,44,28,0.5)';ctx.lineWidth=70;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(LZ.x,LZ.y-100);ctx.quadraticCurveTo(700,1000,1000,860);ctx.quadraticCurveTo(1300,760,1500,560);ctx.lineTo(PAD.x-60,PAD.y+80);ctx.stroke();
    ctx.lineWidth=44;
    ctx.beginPath();ctx.moveTo(1420,730);ctx.lineTo(2160,690);ctx.stroke();
    ctx.beginPath();ctx.moveTo(1440,80);ctx.quadraticCurveTo(1420,300,1430,420);ctx.stroke();
    ctx.lineCap='butt';
  }
  for(const s of scrub){
    ctx.fillStyle='rgba(74,86,44,0.3)';
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();
  }
  // scorch marks
  for(const d of decals){
    const g=ctx.createRadialGradient(d.x,d.y,4,d.x,d.y,d.r);
    g.addColorStop(0,'rgba(8,6,4,0.75)');g.addColorStop(0.7,'rgba(12,9,6,0.45)');g.addColorStop(1,'rgba(12,9,6,0)');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fill();
  }
  // street lamps — cold light in a dust town
  for(const lp of (SCN.mode==='stealcross'?[[600,772],[1104,880],[1590,772],[2044,880]]:(SCN.lamps||[]))){
    const g=ctx.createRadialGradient(lp[0],lp[1],4,lp[0],lp[1],90);
    g.addColorStop(0,'rgba(150,220,255,0.10)');g.addColorStop(1,'rgba(150,220,255,0)');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(lp[0],lp[1],90,0,7);ctx.fill();
    ctx.strokeStyle='#2a2a30';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(lp[0],lp[1]);ctx.lineTo(lp[0],lp[1]-30);ctx.stroke();
    ctx.fillStyle='rgba(190,235,255,0.9)';
    ctx.beginPath();ctx.arc(lp[0],lp[1]-32,3.2,0,7);ctx.fill();
  }
  // LZ
  ctx.strokeStyle='rgba(87,215,226,0.4)';ctx.lineWidth=3;ctx.setLineDash([16,12]);
  ctx.beginPath();ctx.arc(LZ.x,LZ.y,LZ.r,0,7);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='rgba(87,215,226,0.05)';
  ctx.beginPath();ctx.arc(LZ.x,LZ.y,LZ.r,0,7);ctx.fill();
  ctx.fillStyle='rgba(87,215,226,0.55)';ctx.font='700 15px "IBM Plex Mono"';ctx.textAlign='center';
  ctx.fillText(SCN.lzLabel,LZ.x,LZ.y+LZ.r+24);
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
  const col=g?(g.side==='reb'?'#57d7e2':'#ff4f5e'):'#71809c';
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
  ctx.strokeStyle='rgba(87,168,255,'+(0.55+0.3*pul)+')';ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(0,0,TURRET.r+9,-SHIELD_ARC,SHIELD_ARC);ctx.stroke();
  ctx.strokeStyle='rgba(159,214,255,0.9)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(0,0,TURRET.r+12,-SHIELD_ARC,SHIELD_ARC);ctx.stroke();
  ctx.restore();
  ctx.font='600 10px "IBM Plex Mono"';ctx.textAlign='center';
  ctx.fillStyle=g?col:'rgba(113,128,156,0.75)';
  ctx.fillText(g?'TURRET · '+g.first.toUpperCase():'LASER TURRET · UNMANNED',TURRET.x,TURRET.y+TURRET.r+22);
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
      ctx.strokeStyle='rgba(125,217,123,0.55)';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,10,0,7);ctx.stroke();
      ctx.font='800 12px "IBM Plex Mono"';ctx.textAlign='center';
      ctx.fillStyle='rgba(125,217,123,0.8)';ctx.fillText('✓',0,4);
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
    // progress while a soldier works it
    if(wp.rounds>1){
      for(let k=0;k<wp.rounds;k++){ctx.fillStyle=k<(wp.prog||0)?'rgba(125,227,236,0.95)':'rgba(125,227,236,0.25)';ctx.beginPath();ctx.arc(-12+k*12,-24,4,0,7);ctx.fill();}
    }
    if(wp.t>0){
      ctx.strokeStyle='rgba(255,180,84,0.9)';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(0,0,17,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,wp.t/4));ctx.stroke();
    }
    if(cam.z>0.55){
      ctx.font='600 9px "IBM Plex Mono"';ctx.textAlign='center';
      ctx.fillStyle='rgba(255,150,60,0.75)';
      ctx.fillText(wp.label,0,30);
    }
    ctx.restore();
  }
}
function drawVision(){
  if(phase!=='FREE'||town!=='calm')return;
  for(const l of U){
    if(l.side!=='law'||l.down||l.surr||l.office)continue;
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
    // full profile range
    ctx.fillStyle='rgba(255,120,80,0.05)';
    ctx.beginPath();ctx.moveTo(l.x,l.y);
    for(const r of rays)ctx.lineTo(r[0],r[1]);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,120,80,0.16)';ctx.lineWidth=1;ctx.stroke();
    // sneak-danger band (they see crouched runners this far)
    ctx.fillStyle='rgba(255,80,80,0.07)';
    ctx.beginPath();ctx.moveTo(l.x,l.y);
    for(const r of rays){
      const k=Math.min(1,0.55*R/r[2]);
      ctx.lineTo(l.x+(r[0]-l.x)*k,l.y+(r[1]-l.y)*k);
    }
    ctx.closePath();ctx.fill();
    // point-blank ring — inside it they notice you, cone or no cone
    ctx.fillStyle='rgba(255,80,80,0.06)';
    ctx.beginPath();ctx.arc(l.x,l.y,NEAR_R,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,80,80,0.3)';ctx.lineWidth=1;
    ctx.setLineDash([4,6]);
    ctx.beginPath();ctx.arc(l.x,l.y,NEAR_R,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
  }
}
function drawEngageFocus(now){
  const c=engageQ&&engageQ.cur;
  if(!c)return;
  if(pickMode==='nadeToss'&&c.stage==='await'){
    ctx.fillStyle='rgba(255,154,94,0.05)';
    ctx.beginPath();ctx.arc(c.s.x,c.s.y,NADE_R,0,7);ctx.fill();
    ctx.strokeStyle='rgba(255,154,94,0.6)';ctx.lineWidth=2;ctx.setLineDash([10,8]);
    ctx.beginPath();ctx.arc(c.s.x,c.s.y,NADE_R,0,7);ctx.stroke();ctx.setLineDash([]);
  }
  const sCol=c.s.side==='reb'?'#57a8ff':'#ff4f5e';
  // whose action it is
  const pr=16+Math.sin(now*0.007)*2.5;
  ctx.strokeStyle=sCol;ctx.lineWidth=2.6;ctx.globalAlpha=0.9;
  ctx.beginPath();ctx.arc(c.s.x,c.s.y,pr,0,7);ctx.stroke();
  ctx.globalAlpha=0.35;
  ctx.beginPath();ctx.arc(c.s.x,c.s.y,pr+7,0,7);ctx.stroke();
  ctx.globalAlpha=1;
  // who they're shooting at
  ctx.save();
  ctx.strokeStyle=sCol;ctx.lineWidth=1.8;ctx.globalAlpha=0.7;
  ctx.setLineDash([11,9]);ctx.lineDashOffset=-(now*0.06)%20;
  ctx.beginPath();ctx.moveTo(c.s.x,c.s.y);ctx.lineTo(c.t.x,c.t.y);ctx.stroke();
  ctx.restore();
  ctx.save();ctx.translate(c.t.x,c.t.y);ctx.rotate(now*0.0022);
  ctx.strokeStyle=sCol;ctx.lineWidth=2;ctx.globalAlpha=0.95;
  ctx.beginPath();ctx.arc(0,0,20,0,7);ctx.stroke();
  for(let i=0;i<4;i++){
    ctx.rotate(Math.PI/2);
    ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(26,0);ctx.stroke();
  }
  ctx.restore();ctx.globalAlpha=1;
}
function drawBldgs(){
  const now=performance.now();
  for(const b of BLDGS){
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
      ctx.font='700 13px "Exo 2"';ctx.textAlign='center';
      ctx.fillStyle='rgba(125,227,236,'+(0.9*flick)+')';
      ctx.fillText(b.name,b.x+b.w/2,b.y+b.h+20);
    }
    if(b.name&&!b.sign){
      ctx.font='700 13px "IBM Plex Mono"';ctx.textAlign='center';
      ctx.fillStyle='rgba(205,216,236,0.5)';
      ctx.fillText(b.name,b.x+b.w/2,b.y-10);
    }
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
  ctx.font='600 10px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='rgba(205,216,236,0.4)';
  ctx.fillText(SCN.towerLabel||'CONDENSER',0,-TOWER.r-8);
  ctx.restore();
  const wren=U.find(u=>u.elev&&u.fixed);
  if(wren&&unitSeen(wren))drawUnit(wren);
}
function drawDerelict(){
  const d=SCN.derelict;
  ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.a||0);
  ctx.globalAlpha=0.9;
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.roundRect(-74,-40,160,92,16);ctx.fill();
  ctx.fillStyle='#333b45';
  ctx.beginPath();ctx.roundRect(-80,-46,160,92,16);ctx.fill();
  ctx.strokeStyle='#161c24';ctx.lineWidth=3;ctx.stroke();
  // one engine pod gone, one hanging
  ctx.fillStyle='#2a323c';
  ctx.beginPath();ctx.roundRect(-88,36,60,22,8);ctx.fill();
  ctx.strokeStyle='rgba(120,90,54,0.5)';ctx.lineWidth=2;
  ctx.strokeRect(-84,-58,52,18); // the missing pod's mounting scar
  // rust streaks + missing panels
  ctx.fillStyle='rgba(122,74,40,0.45)';
  ctx.fillRect(-52,-30,34,10);ctx.fillRect(6,10,40,12);ctx.fillRect(-20,-46,14,20);
  ctx.fillStyle='#12161c';
  ctx.fillRect(-8,-30,26,16);ctx.fillRect(30,-10,20,14);
  ctx.fillStyle='rgba(159,214,255,0.15)';
  ctx.beginPath();ctx.roundRect(52,-18,24,36,6);ctx.fill();
  ctx.globalAlpha=1;
  ctx.rotate(-(d.a||0));
  ctx.font='700 10px "IBM Plex Mono"';ctx.textAlign='center';
  ctx.fillStyle='rgba(255,180,84,0.55)';
  ctx.fillText('DERELICT HAULER',0,-62);
  ctx.restore();
}
function drawGraf(){
  let sc=1,sh=8,ox=0,oy=0;
  if(extractFx&&extractFx.stage==='lift'){
    const t=Math.min(1,(performance.now()-extractFx.t0)/3200);
    const e=t*t;
    sc=1+t*0.3;sh=8+t*70;
    ox=-e*1500;oy=e*260;
    if(t>=1)return;
  }
  ctx.save();ctx.translate(grafPos.x+ox,grafPos.y+oy);ctx.rotate(grafPos.a);
  ctx.scale(sc,sc);
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath();ctx.roundRect(-80+sh,-46+sh,160,92,16);ctx.fill();
  ctx.fillStyle='#2b3a4c';
  ctx.beginPath();ctx.roundRect(-80,-46,160,92,16);ctx.fill();
  ctx.strokeStyle='#16202c';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#22303f';
  ctx.beginPath();ctx.roundRect(-88,-58,60,22,8);ctx.fill();
  ctx.beginPath();ctx.roundRect(-88,36,60,22,8);ctx.fill();
  ctx.fillStyle='#57d7e2';
  ctx.fillRect(-70,-6,120,4);
  ctx.fillStyle='#101821';
  ctx.beginPath();ctx.roundRect(52,-18,24,36,6);ctx.fill();
  // ramp (east side, open when landed)
  if(grafState!=='gone'){
    ctx.fillStyle='rgba(120,140,160,0.5)';
    ctx.beginPath();ctx.moveTo(80,-20);ctx.lineTo(120,-30);ctx.lineTo(120,30);ctx.lineTo(80,20);ctx.closePath();ctx.fill();
  }
  ctx.font='700 11px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='rgba(87,215,226,0.7)';
  ctx.rotate(-grafPos.a);
  ctx.fillText('MARTA',0,-64);
  ctx.restore();
}
function drawCross(now){
  if(crossAway&&!crossFx)return;
  let x=PAD.x,y=PAD.y,sc=1,sh=6;
  if(crossFx){
    const t=(now-crossFx.t0)/3200;
    if(t>=1){crossFx=null;return;}
    const e=t*t;
    x=PAD.x+e*1400;y=PAD.y-e*180;
    sc=1+t*0.25;sh=6+t*60;
    if(t<0.5)for(let i=0;i<2;i++)parts.push({x:PAD.x+(rng()-0.5)*120,y:PAD.y+(rng()-0.5)*90,vx:(rng()-0.5)*140,vy:-rng()*30,r:3+rng()*4,a:0.4,col:'#b09a78',t0:now,dur:700});
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(-0.5);
  ctx.scale(sc,sc);
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.moveTo(38+sh*0.3,sh);ctx.lineTo(-26+sh*0.3,-24+sh);ctx.lineTo(-14+sh*0.3,sh);ctx.lineTo(-26+sh*0.3,24+sh);ctx.closePath();ctx.fill();
  ctx.fillStyle='#3d4c60';
  ctx.beginPath();ctx.moveTo(38,0);ctx.lineTo(-26,-24);ctx.lineTo(-14,0);ctx.lineTo(-26,24);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#1a2430';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#9fd6ff';
  ctx.beginPath();ctx.arc(12,0,5,0,7);ctx.fill();
  if(crossFx){
    ctx.fillStyle='rgba(140,200,255,0.8)';
    ctx.beginPath();ctx.moveTo(-26,-6);ctx.lineTo(-48-rng()*16,0);ctx.lineTo(-26,6);ctx.closePath();ctx.fill();
  }
  ctx.restore();
  if(!crossAway){
    ctx.font='700 12px "IBM Plex Mono"';ctx.textAlign='center';
    ctx.fillStyle='rgba(87,168,255,0.75)';
    ctx.fillText('FT-4 CROSS',PAD.x,PAD.y+PAD.r+22);
  }
}
function drawLoots(){
  const now=performance.now();
  for(const m of lootMarks){
    if(m.taken)continue;
    const pul=0.6+0.4*Math.sin(now*0.005+m.x);
    ctx.save();ctx.translate(m.x,m.y);
    ctx.rotate(Math.PI/4);
    ctx.strokeStyle='rgba(255,180,84,'+(0.45+0.4*pul)+')';ctx.lineWidth=2.5;
    const r=8+pul*2;
    ctx.strokeRect(-r/2,-r/2,r,r);
    ctx.restore();
    ctx.fillStyle='rgba(255,180,84,'+(0.5+0.3*pul)+')';
    ctx.beginPath();ctx.arc(m.x,m.y,2.5,0,7);ctx.fill();
    if(cam.z>0.62){
      ctx.font='600 10px "IBM Plex Mono"';ctx.textAlign='center';
      ctx.fillStyle='rgba(255,180,84,0.6)';
      ctx.fillText(m.label.toUpperCase(),m.x,m.y+24);
    }
  }
}
function drawUnit(u){
  if(u.extracted||(u.away&&!u.caged)||u.office)return;
  const now=performance.now();
  if(u.side==='civ'){
    // unmistakably not a combatant: pale, unarmed, unbarred
    ctx.save();ctx.translate(u.x,u.y);
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath();ctx.ellipse(2,3,7,5,0,0,7);ctx.fill();
    const k=u.cower?0.8:1;
    ctx.scale(k,k);
    ctx.rotate(u.face);
    ctx.fillStyle='#3c4454';ctx.beginPath();ctx.arc(0,0,7,0,7);ctx.fill();
    ctx.strokeStyle='#c8d2e0';ctx.lineWidth=1.6;ctx.stroke();
    ctx.fillStyle='#dcc9a8';ctx.beginPath();ctx.arc(2.4,0,3,0,7);ctx.fill();
    ctx.rotate(-u.face);
    if(u.cower){
      ctx.fillStyle='#e8ecf4';
      ctx.beginPath();ctx.arc(-4.6,-9,1.9,0,7);ctx.fill();
      ctx.beginPath();ctx.arc(4.6,-9,1.9,0,7);ctx.fill();
    }
    ctx.scale(1/k,1/k);
    ctx.font='600 8px "IBM Plex Mono"';ctx.textAlign='center';
    ctx.fillStyle='rgba(200,210,224,0.55)';
    ctx.fillText(u.cower?'CIVILIAN — DOWN FLAT':'CIVILIAN',0,20);
    ctx.restore();
    return;
  }
  ctx.save();ctx.translate(u.x,u.y);
  if(u.down){
    ctx.rotate(0.9);
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(2,3,14,7,0,0,7);ctx.fill();
    ctx.fillStyle=u.side==='reb'?'#31555e':'#4a3a28';
    ctx.globalAlpha=0.8;
    ctx.beginPath();ctx.ellipse(0,0,13,6,0,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(15,0,4,0,7);ctx.fill();
    ctx.globalAlpha=1;
    ctx.rotate(-0.9);
    ctx.font='600 9px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='rgba(113,128,156,0.8)';
    ctx.fillText(u.first.toUpperCase()+' — DOWN',0,26);
    ctx.restore();
    return;
  }
  // selection / hotwire ring
  if(u.id===selId&&phase==='PLANNING'){
    ctx.strokeStyle='rgba(255,180,84,0.85)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,15+Math.sin(now*0.006)*1.6,0,7);ctx.stroke();
  }
  const sera=u.id==='sera';
  if(sera&&!crossAway&&dist(u,PAD)<PAD.r){
    const hp2=Math.min(1,(hot+(phase==='FREE'?hotT/4.5:0))/HOT_ROUNDS);
    ctx.strokeStyle='rgba(255,180,84,0.9)';ctx.lineWidth=3.4;
    ctx.beginPath();ctx.arc(0,0,18,-Math.PI/2,-Math.PI/2+Math.PI*2*hp2);ctx.stroke();
    ctx.strokeStyle='rgba(255,180,84,0.25)';ctx.lineWidth=3.4;
    ctx.beginPath();ctx.arc(0,0,18,0,7);ctx.stroke();
    if(rng()<0.15)parts.push({x:u.x+(rng()-0.5)*16,y:u.y-4,vx:(rng()-0.5)*40,vy:-30-rng()*30,r:1.2,a:0.9,col:'#ffe9a0',t0:now,dur:300});
  }
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath();ctx.ellipse(2,4,9,6,0,0,7);ctx.fill();
  const crouch=sneak&&u.side==='reb'&&phase==='FREE'&&town==='calm';
  if(crouch)ctx.scale(0.82,0.82);
  const R=u.vehicle?13:u.big?15:u.heavy?11:u.sheriff?9.5:8;
  let body,line;
  if(u.side==='reb'){body=sera?'#6b4a1c':'#1c4a56';line=sera?'#ffb454':'#57d7e2';}
  else if(u.auto){body='#2a3542';line='#7fb2ff';}
  else {body='#4a3320';line=u.sheriff?'#e8c56a':'#c9a06a';}
  if(u.surr){body='#3a3f4a';line='#9aa4b4';}
  ctx.rotate(u.face);
  ctx.fillStyle=body;
  ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fill();
  ctx.strokeStyle=line;ctx.lineWidth=2;ctx.stroke();
  // shoulders + weapon
  ctx.strokeStyle=line;ctx.lineWidth=2.4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,-R+1);ctx.lineTo(0,R-1);ctx.stroke();
  if(!u.surr){
    ctx.strokeStyle='#0c0f14';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(2,-3);ctx.lineTo(R+7,-3);ctx.stroke();
  }
  if(u.vehicle){
    ctx.fillStyle='#2b3440';ctx.beginPath();ctx.roundRect(-28,-15,56,30,6);ctx.fill();
    ctx.strokeStyle=line;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='rgba(255,90,80,0.7)';ctx.fillRect(-4,-17,8,3);ctx.fillStyle='rgba(90,140,255,0.7)';ctx.fillRect(-4,14,8,3);
  }
  if(u.hacked){ctx.strokeStyle='rgba(125,227,236,0.95)';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(0,0,R+5,0,7);ctx.stroke();ctx.setLineDash([]);}
  ctx.fillStyle='#dcc9a8';
  ctx.beginPath();ctx.arc(3,0,3.4,0,7);ctx.fill();
  if(u.shield){
    ctx.strokeStyle='rgba(170,205,255,0.9)';ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(0,0,R+5,-1.0,1.0);ctx.stroke();
  }
  if(u.sheriff){
    ctx.strokeStyle='rgba(232,197,106,0.9)';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.arc(0,0,R+3.4,0,7);ctx.stroke();
  }
  ctx.rotate(-u.face);
  if(u.surr){
    ctx.fillStyle='#e8ecf4';
    ctx.beginPath();ctx.arc(-6,-13,2.4,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(6,-13,2.4,0,7);ctx.fill();
    ctx.font='600 8.5px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='rgba(154,164,180,0.9)';
    ctx.fillText('SURRENDERED',0,30);
  }
  // brace / overwatch marker
  if(u.braced&&phase!=='BRIEF'){
    ctx.strokeStyle='rgba(125,217,123,0.7)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,13,u.face-0.5,u.face+0.5);ctx.stroke();
  }
  // in-cover pip
  if(!u.surr&&inCoverAt(u.x,u.y)){
    ctx.save();ctx.translate(-13,-13);ctx.scale(0.62,0.62);
    ctx.strokeStyle='rgba(125,217,123,0.95)';ctx.lineWidth=2.6;ctx.lineJoin='round';
    ctx.beginPath();
    ctx.moveTo(0,-10);ctx.lineTo(8,-6);ctx.lineTo(8,2);
    ctx.quadraticCurveTo(8,8,0,11);
    ctx.quadraticCurveTo(-8,8,-8,2);
    ctx.lineTo(-8,-6);ctx.closePath();ctx.stroke();
    ctx.restore();
  }
  if(u.jam){
    ctx.font='800 12px "IBM Plex Mono"';ctx.textAlign='center';ctx.fillStyle='#ffb454';
    ctx.fillText('!',13,-10);
  }
  if(town==='alerted'&&!u.down&&!u.surr&&coolStateG(u)==='panic'){
    const bl=0.5+0.5*Math.sin(performance.now()*0.012);
    ctx.font='800 13px "IBM Plex Mono"';ctx.textAlign='center';
    ctx.fillStyle='rgba(255,79,94,'+(0.5+0.5*bl).toFixed(2)+')';
    ctx.fillText('!!',-13,-10);
  }
  if(crouch)ctx.scale(1/0.82,1/0.82);
  // detection gauge — a lawman is getting curious
  if(u.side==='reb'&&u.det>0.5&&town==='calm'){
    const dk=u.det/100;
    ctx.strokeStyle='rgba(40,50,80,0.8)';ctx.lineWidth=3.2;
    ctx.beginPath();ctx.arc(0,-R-20,8,0,7);ctx.stroke();
    ctx.strokeStyle=dk>0.65?'#ff4f5e':dk>0.35?'#ffb454':'#e8ecf4';
    ctx.beginPath();ctx.arc(0,-R-20,8,-Math.PI/2,-Math.PI/2+Math.PI*2*dk);ctx.stroke();
    if(dk>0.65){
      ctx.font='800 11px "IBM Plex Mono"';ctx.textAlign='center';
      ctx.fillStyle='#ff4f5e';ctx.fillText('!',0,-R-16);
    }
  }
  // hp cells + name
  const cells=5,cw=5.4;
  for(let i=0;i<cells;i++){
    const on=u.hp>i*(u.maxhp/cells);
    ctx.fillStyle=on?(u.hp<u.maxhp*0.35?'#ff4f5e':'#7dd97b'):'rgba(32,41,74,0.9)';
    ctx.fillRect(-cells*cw/2+i*cw+0.5,-R-9,cw-1.5,3);
  }
  ctx.font='600 9px "IBM Plex Mono"';ctx.textAlign='center';
  ctx.fillStyle=u.side==='reb'?(sera?'rgba(255,180,84,0.9)':'rgba(87,215,226,0.85)'):'rgba(201,160,106,0.85)';
  ctx.fillText(u.first.toUpperCase(),0,R+14);
  ctx.restore();
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
    ctx.strokeStyle='rgba(255,120,80,'+(0.25+0.3*bl).toFixed(2)+')';
    ctx.lineWidth=1.5;ctx.setLineDash([5,6]);
    ctx.beginPath();ctx.arc(g.x,g.y,NADE_BLAST,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,120,80,'+(0.04+0.04*bl).toFixed(2)+')';
    ctx.beginPath();ctx.arc(g.x,g.y,NADE_BLAST,0,7);ctx.fill();
    ctx.fillStyle=bl>0.5?'#ff4f5e':'#d8e2f2';
    ctx.beginPath();ctx.arc(g.x,g.y,4.5,0,7);ctx.fill();
    ctx.font='700 8px "IBM Plex Mono"';ctx.textAlign='center';
    ctx.fillStyle='rgba(255,120,80,0.85)';ctx.fillText('BLAM',g.x,g.y-10);
  }
}
function drawOrders(){
  if(phase!=='PLANNING'){drawPing();return;}
  for(const u of U){
    if(u.side!=='reb'||!u.order||u.down||u.extracted||u.away)continue;
    const o=u.order;
    if(o.type==='move'||o.type==='sprint'){
      const path=pathFor(u,o.tx,o.ty)||[{x:u.x,y:u.y},{x:o.tx,y:o.ty}];
      ctx.strokeStyle=o.type==='move'?'rgba(255,180,84,0.7)':'rgba(255,120,80,0.75)';
      ctx.lineWidth=o.type==='move'?2:3;
      ctx.setLineDash(o.type==='move'?[8,7]:[3,6]);
      ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);
      for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);
      ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(o.tx,o.ty,6,0,7);ctx.stroke();
      ctx.font='600 9px "IBM Plex Mono"';ctx.textAlign='center';
      ctx.fillStyle=o.type==='move'?'rgba(255,180,84,0.85)':'rgba(255,120,80,0.85)';
      ctx.fillText(o.type.toUpperCase(),o.tx,o.ty-12);
    } else if(o.type==='loot'){
      ctx.strokeStyle='rgba(125,217,123,0.6)';ctx.lineWidth=2;ctx.setLineDash([4,5]);
      ctx.beginPath();ctx.arc(u.x,u.y,LOOT_AOE,0,7);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(125,217,123,0.06)';
      ctx.beginPath();ctx.arc(u.x,u.y,LOOT_AOE,0,7);ctx.fill();
    }
  }
  // pick rings
  const sel=U.find(x=>x.id===selId);
  if(sel&&pickMode){
    const r=pickMode==='move'?MOVE_R:SPRINT_R;
    ctx.fillStyle=pickMode==='move'?'rgba(255,180,84,0.06)':'rgba(255,120,80,0.05)';
    ctx.beginPath();ctx.arc(sel.x,sel.y,r,0,7);ctx.fill();
    ctx.strokeStyle=pickMode==='move'?'rgba(255,180,84,0.6)':'rgba(255,120,80,0.6)';
    ctx.lineWidth=2;ctx.setLineDash([10,8]);
    ctx.beginPath();ctx.arc(sel.x,sel.y,r,0,7);ctx.stroke();ctx.setLineDash([]);
    // show every cover pocket in reach
    for(const p of PROPS){
      const def=PROPDEF[p.kind];
      if(Math.hypot(p.x-sel.x,p.y-sel.y)>r+def.r+40)continue;
      ctx.strokeStyle='rgba(125,217,123,0.4)';ctx.lineWidth=1.6;ctx.setLineDash([3,5]);
      ctx.beginPath();ctx.arc(p.x,p.y,def.r+34,0,7);ctx.stroke();ctx.setLineDash([]);
    }
    if(hoverW){
      const d=moveDest(sel,hoverW.x,hoverW.y,r);
      if(d){
        const p=pathFor(sel,d.x,d.y);
        if(p){
          ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=1.6;ctx.setLineDash([4,5]);
          ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
          for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
          ctx.stroke();ctx.setLineDash([]);
          ctx.beginPath();ctx.arc(d.x,d.y,5,0,7);ctx.stroke();
          if(inCoverAt(d.x,d.y)){
            ctx.font='800 11px "IBM Plex Mono"';ctx.textAlign='center';
            ctx.fillStyle='rgba(125,217,123,0.95)';
            ctx.fillText('◖ COVER',d.x,d.y-14);
          }
        }
      }
    }
  }
  drawPing();
}
function drawPing(){
  if(!rtPing)return;
  const t=(performance.now()-rtPing.t0)/500;
  if(t<1){
    ctx.strokeStyle='rgba(255,180,84,'+(0.8*(1-t))+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(rtPing.x,rtPing.y,8+t*26,0,7);ctx.stroke();
  } else rtPing=null;
}
function drawFx(now){
  for(const tr of tracers){
    const t=(now-tr.t0)/tr.dur;
    if(t<0||t>1)continue;
    if(tr.beam){
      ctx.globalAlpha=0.9*(1-t*0.6);
      ctx.strokeStyle='rgba(255,94,110,0.5)';ctx.lineWidth=7;
      ctx.beginPath();ctx.moveTo(tr.x1,tr.y1);ctx.lineTo(tr.x2,tr.y2);ctx.stroke();
      ctx.strokeStyle='#ffe2e6';ctx.lineWidth=2.2;
      ctx.beginPath();ctx.moveTo(tr.x1,tr.y1);ctx.lineTo(tr.x2,tr.y2);ctx.stroke();
      ctx.globalAlpha=1;
      continue;
    }
    const hx=lerp(tr.x1,tr.x2,Math.min(1,t*1.6)),hy=lerp(tr.y1,tr.y2,Math.min(1,t*1.6));
    const tx=lerp(tr.x1,tr.x2,Math.max(0,t*1.6-0.35)),ty=lerp(tr.y1,tr.y2,Math.max(0,t*1.6-0.35));
    ctx.strokeStyle=tr.col;ctx.lineWidth=2;ctx.globalAlpha=0.9;
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(hx,hy);ctx.stroke();
    ctx.globalAlpha=1;
  }
  tracers=tracers.filter(tr=>now-tr.t0<tr.dur+80);
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
  for(const f of floaters){
    const t=(now-f.t0)/1500;
    if(t>1)continue;
    ctx.globalAlpha=t<0.1?t/0.1:1-Math.max(0,(t-0.6)/0.4);
    ctx.font='800 13px "IBM Plex Mono"';ctx.textAlign='center';
    ctx.fillStyle=f.col;
    ctx.fillText(f.text,f.x,f.y-34*t);
    ctx.globalAlpha=1;
  }
  floaters=floaters.filter(f=>now-f.t0<1500);
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
/* ---------- VS panel ---------- */
function swordIcon(x,y,col,pulse){
  ctx.save();ctx.translate(x,y);ctx.rotate(-Math.PI/4);
  const k=1+pulse*0.12;ctx.scale(k,k);
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-5,5);ctx.lineTo(5,5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(0,11);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(-2.4,-9);ctx.lineTo(2.4,-9);ctx.closePath();ctx.fill();
  ctx.restore();
}
function shieldIcon(x,y,col,pulse){
  ctx.save();ctx.translate(x,y);
  const k=1+pulse*0.12;ctx.scale(k,k);
  ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(0,-10);ctx.lineTo(8,-6);ctx.lineTo(8,2);
  ctx.quadraticCurveTo(8,8,0,11);
  ctx.quadraticCurveTo(-8,8,-8,2);
  ctx.lineTo(-8,-6);ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,7);ctx.stroke();
  ctx.restore();
}
function drawVsPanel(now){
  const c=engageQ&&engageQ.cur;
  if(!c)return;
  const PW=Math.min(430,cssW-20),colW=(PW-56)/2;
  const rowsL=c.atk?Math.min(c.revealA,c.atk.entries.length):0;
  const rowsR=Math.min(c.reveal,c.tn.entries.length);
  const maxRows=Math.max(rowsL,rowsR,1);
  const showPct=c.atk&&c.revealA>=c.atk.entries.length;
  const PH=44+maxRows*16+18+(showPct?34:8);
  const x=(cssW-PW)/2,y=10;
  ctx.save();
  ctx.fillStyle='rgba(8,12,26,0.93)';
  ctx.strokeStyle='rgba(60,80,130,0.75)';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x,y,PW,PH,6);ctx.fill();ctx.stroke();
  const aCol=c.s.side==='reb'?'#57a8ff':'#ff6a75';
  const dCol=c.t.side==='reb'?'#57a8ff':c.t.obj?'#ffb454':'#ff6a75';
  ctx.textAlign='left';ctx.font='800 11px "Exo 2"';
  swordIcon(x+16,y+16,aCol,0);
  ctx.fillStyle=aCol;ctx.fillText(c.s.name.toUpperCase(),x+30,y+20);
  ctx.textAlign='center';ctx.fillStyle='#71809c';ctx.font='800 12px "Exo 2"';
  ctx.fillText('VS',x+PW/2,y+20);
  ctx.textAlign='right';ctx.fillStyle=dCol;ctx.font='800 11px "Exo 2"';
  ctx.fillText(c.t.name.toUpperCase(),x+PW-30,y+20);
  shieldIcon(x+PW-16,y+16,dCol,0);
  ctx.strokeStyle='rgba(60,80,130,0.5)';
  ctx.beginPath();ctx.moveTo(x+10,y+28);ctx.lineTo(x+PW-10,y+28);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+PW/2,y+30);ctx.lineTo(x+PW/2,y+34+maxRows*16);ctx.stroke();
  ctx.font='600 10px "IBM Plex Mono"';
  for(let i=0;i<rowsL;i++){
    const [lab,val,base]=c.atk.entries[i];
    const ry=y+42+i*16;
    ctx.textAlign='left';ctx.fillStyle='#9fb0cc';ctx.fillText(lab,x+14,ry);
    ctx.textAlign='right';ctx.fillStyle=base?'#cdd8ec':(val>=0?'#7dd97b':'#ff8f9a');
    ctx.fillText((base?'':(val>=0?'+':''))+val,x+14+colW,ry);
  }
  for(let i=0;i<rowsR;i++){
    const [lab,val,base]=c.tn.entries[i];
    const ry=y+42+i*16;
    ctx.textAlign='left';ctx.fillStyle='#9fb0cc';ctx.fillText(lab,x+PW/2+14,ry);
    ctx.textAlign='right';ctx.fillStyle=base?'#cdd8ec':(val>=0?'#ff8f9a':'#7dd97b');
    ctx.fillText((base?'':(val>=0?'+':''))+val,x+PW-14,ry);
  }
  const ty=y+42+maxRows*16+4;
  ctx.font='800 11px "IBM Plex Mono"';
  ctx.textAlign='left';ctx.fillStyle='#7de3ec';
  if(c.atk)ctx.fillText('ATK '+c.atk.total,x+14,ty);
  ctx.textAlign='right';ctx.fillStyle='#ffb454';
  ctx.fillText('DEF '+c.tn.total,x+PW-14,ty);
  if(showPct){
    const need=c.need||needFor(c.tn.total,c.atk.total);
    const pct=pctFor(need);
    ctx.textAlign='center';
    if(c.stage==='roll'||c.stage==='verdict'||c.stage==='fire'){
      const settled=c.stage!=='roll';
      const shown=settled?c.roll:rint(1,20);
      ctx.font='800 13px "IBM Plex Mono"';
      ctx.fillStyle='#9fb0cc';
      ctx.fillText('HIT '+pct+'% · NEED '+need+'+',x+PW/2-60,ty+22);
      ctx.font='800 20px "IBM Plex Mono"';
      ctx.fillStyle=settled?(c.jammed?'#ffb454':c.hit?'#7dd97b':'#ff8f9a'):'#ffffff';
      ctx.fillText('d20: '+shown,x+PW/2+92,ty+23);
    } else {
      ctx.font='800 15px "IBM Plex Mono"';
      ctx.fillStyle=pct>=60?'#7dd97b':pct>=35?'#ffb454':'#ff8f9a';
      ctx.fillText('HIT CHANCE '+pct+'%  ·  NEED '+need+'+ ON D20',x+PW/2,ty+23);
    }
  }
  // engagement queue position
  ctx.font='600 10px "IBM Plex Mono"';ctx.textAlign='center';
  ctx.fillStyle='rgba(113,128,156,0.9)';
  ctx.fillText('ACTION '+Math.min(engageQ.idx,engageQ.list.length)+' OF '+engageQ.list.length,x+PW/2,y+PH+16);
  ctx.restore();
  const pulse=Math.sin(now*0.008)*0.5+0.5;
  const [ax,ay]=worldToCss(c.s.x,c.s.y);
  const [dx2,dy2]=worldToCss(c.t.x,c.t.y);
  swordIcon(ax,ay-36,c.s.side==='reb'?'#57a8ff':'#ff4f5e',pulse);
  shieldIcon(dx2,dy2-36,c.t.side==='reb'?'#57a8ff':c.t.obj?'#ffb454':'#ff4f5e',pulse);
  if(c.stage==='verdict'||(c.stage==='fire'&&!c.applied)){
    ctx.font='800 24px "Exo 2"';ctx.textAlign='center';
    ctx.fillStyle=c.jammed?'#ffb454':c.hit?'#7dd97b':'#7db8ff';
    ctx.fillText(c.jammed?'JAM!':c.hit?'HIT':'MISS',dx2,dy2-64);
  }
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
function drawBubbles(now){
  for(const b of bubbles){
    const t=(now-b.t0)/b.dur;
    if(t>=1)continue;
    const s=b.unit;
    if(!unitSeen(s))continue;
    const [px,py]=worldToCss(s.x,s.y);
    if(px<-100||px>cssW+100||py<-100||py>cssH+100)continue;
    const alpha=t<0.08?t/0.08:t>0.85?(1-t)/0.15:1;
    ctx.font='600 11px "Exo 2"';
    const name=s.first+' — ';
    const lines=wrapText(b.text,168);
    let wmax=ctx.measureText(name).width;
    for(const l of lines)wmax=Math.max(wmax,ctx.measureText(l).width);
    const bw=wmax+20,bh=16+lines.length*14+8;
    let bx=px+22,by=py-40-bh;
    bx=Math.max(6,Math.min(cssW-bw-6,bx));by=Math.max(6,by);
    ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(8,12,24,0.94)';
    ctx.strokeStyle=s.side==='reb'?'rgba(87,215,226,0.7)':'rgba(255,79,94,0.7)';
    ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,5);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(bx+14,by+bh);ctx.lineTo(bx+24,by+bh);ctx.lineTo(px+4,py-22);ctx.closePath();
    ctx.fillStyle='rgba(8,12,24,0.94)';ctx.fill();
    ctx.textAlign='left';
    ctx.fillStyle=s.side==='reb'?'#7de3ec':'#ff8f9a';
    ctx.fillText(name,bx+10,by+15);
    ctx.fillStyle='#cdd8ec';
    lines.forEach((l,i)=>ctx.fillText(l,bx+10,by+15+(i+1)*14));
    ctx.globalAlpha=1;
  }
  bubbles=bubbles.filter(b=>now-b.t0<b.dur);
}
function drawMinimap(){
  const r=mmRect(),sx=r.w/W,sy=r.h/H;
  ctx.save();
  ctx.fillStyle='rgba(6,9,18,0.88)';
  ctx.strokeStyle='rgba(60,80,130,0.6)';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,4);ctx.fill();ctx.stroke();
  if(SCN.style==='town'){
    ctx.fillStyle='rgba(90,68,40,0.5)';
    ctx.fillRect(r.x+300*sx,r.y+764*sy,1560*sx,120*sy);
  }
  for(const b of BLDGS){
    ctx.fillStyle=b.terrain?'rgba(58,68,84,0.9)':'rgba(70,54,34,0.9)';
    ctx.fillRect(r.x+b.x*sx,r.y+b.y*sy,b.w*sx,b.h*sy);
  }
  ctx.strokeStyle='rgba(87,215,226,0.7)';
  ctx.beginPath();ctx.arc(r.x+LZ.x*sx,r.y+LZ.y*sy,LZ.r*sx,0,7);ctx.stroke();
  ctx.strokeStyle='rgba(87,168,255,0.7)';
  ctx.beginPath();ctx.arc(r.x+PAD.x*sx,r.y+PAD.y*sy,PAD.r*sx,0,7);ctx.stroke();
  for(const m of lootMarks){
    if(m.taken||(SCN.fog&&!m.spotted))continue;
    ctx.fillStyle='rgba(255,180,84,0.8)';
    ctx.fillRect(r.x+m.x*sx-1.5,r.y+m.y*sy-1.5,3,3);
  }
  for(const u of U){
    if(u.extracted||u.away)continue;
    if(!unitSeen(u))continue;
    ctx.fillStyle=u.down?'rgba(120,120,130,0.6)':u.surr?'rgba(154,164,180,0.7)':u.side==='reb'?(u.id==='sera'?'#ffb454':'#57d7e2'):'#ff4f5e';
    ctx.beginPath();ctx.arc(r.x+u.x*sx,r.y+u.y*sy,u.down?1.6:2.6,0,7);ctx.fill();
  }
  const hw=cssW/(2*cam.z),hh=cssH/(2*cam.z);
  ctx.strokeStyle='rgba(205,216,236,0.5)';ctx.lineWidth=1;
  ctx.strokeRect(r.x+(cam.x-hw)*sx,r.y+(cam.y-hh)*sy,hw*2*sx,hh*2*sy);
  ctx.restore();
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
    csEvent('wb1',2.4,el,()=>{const l=U.find(u=>u.side==='reb');if(l)say(l,'That’s the rock. Squatters and all. Let’s go take our home.',3400);});
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
  enterFree(null);
}
/* ---------- main render ---------- */
let hoverW=null;
function render(now){
  try{
    const dt=Math.min(0.05,(now-(lastFrame||now))/1000);
    lastFrame=now;
    if(phase==='CUTSCENE'&&cs)csUpdate(now);
    if(phase!=='CUTSCENE')fuelUpdate(now);
    if(phase==='FREE')rtUpdate(now,dt);
    if(phase==='EXTRACT'&&extractFx)extractUpdate(now,dt);
    if(phase==='EXEC')execUpdate(now);
    if(phase==='ENGAGE'){try{attackUpdate(now);}catch(e){recover(e);}}
    if(phase==='FREE'||phase==='PLANNING'||phase==='EXEC'||phase==='ENGAGE'){civStep(dt);checkBoss();updateVision(now);}
    tutTick();
    exploTick(now);
    if(camGoal){
      cam.x=lerp(cam.x,camGoal.x,0.06);cam.y=lerp(cam.y,camGoal.y,0.06);cam.z=lerp(cam.z,camGoal.z,0.06);
      if(Math.abs(cam.x-camGoal.x)<3&&Math.abs(cam.y-camGoal.y)<3)camGoal=null;
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
    drawLoots();
    drawWork(now);
    drawFactory(now);
    drawCage(now);
    drawFS(now);
    drawNades(now);
    drawProps();
    if(SCN.hasTurret)drawTurret(now);
    if(SCN.hasTower)drawTowerBase();
    if(SCN.hasGraf)drawGraf();
    if(SCN.derelict)drawDerelict();
    if(SCN.hasPad)drawCross(now);
    // downed first, then live
    for(const u of U)if(u.down&&!u.fixed&&unitSeen(u))drawUnit(u);
    for(const u of U)if(!u.down&&!u.fixed&&!u.csHide&&unitSeen(u))drawUnit(u);
    drawBldgs();
    if(SCN.hasTower)drawTowerTop();
    drawFog();
    if(phase==='ENGAGE')drawEngageFocus(now);
    drawOrders();
    drawFx(now);
    ctx.restore();
    drawBubbles(now);
    if(phase==='ENGAGE')drawVsPanel(now);
    drawMinimap();
    if(now-alertFlash<900&&alertFlash){
      ctx.fillStyle='rgba(255,79,94,'+(0.16*(1-(now-alertFlash)/900))+')';
      ctx.fillRect(0,0,cssW,cssH);
    }
    // radial follows selected unit
    const rad=byId('radial');
    if(!rad.hidden&&selId){
      const s=U.find(x=>x.id===selId);
      if(s){const [px,py]=worldToCss(s.x,s.y);rad.style.left=px+'px';rad.style.top=py+'px';}
    }
  }catch(e){recover(e);}
}
let recovered=0;
function recover(e){
  if(recovered++>4)return;
  console.error(e);
  engageQ=null;
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
function unitAtCss(px,py){
  let best=null,bd=1e9;
  for(const u of U){
    if(u.down||u.extracted||u.away||u.csHide||u.office)continue;
    if(!unitSeen(u))continue;
    const [ux,uy]=worldToCss(u.x,u.y);
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
      if(hackArm&&u.side==='law'&&u.auto){startFreeHack(u);return;}
      if(u.side==='law'&&!u.surr&&town==='calm'){
        // the player picks the moment the shooting starts
        if(!startAmbush(u))addFloater(u.x,u.y-30,'NO SHOT','#71809c');
        return;
      }
      camGoal={x:u.x,y:u.y,z:Math.max(cam.z,0.9)};sTick();return;
    }
    squadMoveTo(cssToWorld(px,py));
    return;
  }
  if(phase==='PLANNING'){
    const sel=U.find(x=>x.id===selId);
    if(pickMode&&pickMode.startsWith('fs:')){
      const done=fsPlace(pickMode.slice(3),cssToWorld(px,py));
      if(done){pickMode=null;fsDraft=null;radialOn=!!selId;}
      syncUI();
      return;
    }
    if(pickMode==='hack'&&sel){
      const t=unitAtCss(px,py);
      if(t&&canHack(sel,t)){sel.order={type:'hack',tid:t.id};sTick();pickMode=null;autoAdvance();syncUI();}
      else addFloater(sel.x,sel.y-40,'PICK A HACKABLE AUTO IN RANGE','#71809c');
      return;
    }
    if(pickMode&&sel){
      const wpt=cssToWorld(px,py);
      const d=moveDest(sel,wpt.x,wpt.y,pickMode==='move'?MOVE_R:SPRINT_R);
      if(d&&pathFor(sel,d.x,d.y)){
        sel.order={type:pickMode,tx:d.x,ty:d.y};
        sTick();
        pickMode=null;
        autoAdvance();
        syncUI();
      }
      return;
    }
    const u=unitAtCss(px,py);
    if(u&&u.side==='reb'&&!u.down){
      selId=u.id;radialOn=true;pickMode=null;
      sTick();syncUI();
      return;
    }
    if(selId){selId=null;radialOn=false;pickMode=null;syncUI();}
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
      if(ptBlocked(gx,gy,8)){addFloater(gx,gy-16,'NO LANDING','#71809c');return;}
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
byId('radial').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-ract]');
  if(!b||b.disabled)return;
  const act=b.getAttribute('data-ract');
  const s=U.find(x=>x.id===selId);
  if(!s)return;
  sTick();
  if(act==='move'){pickMode='move';radialOn=false;}
  else if(act==='sprint'){pickMode='sprint';radialOn=false;}
  else if(act==='hack'){pickMode='hack';radialOn=false;}
  else if(act==='fs'){fsMenuOn=!fsMenuOn;radialOn=true;}
  else if(act==='hold'){s.order={type:'hold'};autoAdvance();}
  else if(act==='cover'){s.order={type:'cover'};autoAdvance();}
  else if(act==='lockin'){s.order={type:'lockin'};autoAdvance();}
  else if(act==='work'){
    const wp=WORK.find(w=>!w.done&&(!w.needSpec||s.spec===w.needSpec)&&(!w.needCharge||s.charge)&&!(w.needClear&&hostilesActive().length)&&Math.hypot(s.x-w.x,s.y-w.y)<MOVE_R+60);
    if(wp){s.order={type:'work',wp:wp.id};autoAdvance();}
  }
  else if(act==='loot'){
    if(lootsWithin(s,LOOT_AOE).length){s.order={type:'loot'};autoAdvance();}
  }
  else if(act==='man'){s.order={type:'man'};autoAdvance();}
  else if(act==='leave'){s.order={type:'leave'};autoAdvance();}
  else if(act==='clear'){s.order={type:'clear'};sJamClr();autoAdvance();}
  else if(act==='cancel'){s.order=null;selId=null;radialOn=false;}
  syncUI();
});
byId('pickPill').addEventListener('click',()=>{pickMode=null;fsDraft=null;radialOn=!!selId;syncUI();});
byId('fsMenu').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-fs]');
  if(!b)return;
  pickMode='fs:'+b.getAttribute('data-fs');fsDraft=null;fsMenuOn=false;radialOn=false;sTick();syncUI();
});
/* ---------- HUD sync ---------- */
function $(id){return byId(id);}
function radialHTML(s){
  if(s.manning){
    return [['hold','⌖','Hold',false],['leave','⏏','Leave Gun',false]].map((a,i)=>{
      const ang=-Math.PI/2+i*Math.PI;
      const x=Math.cos(ang)*86,y=Math.sin(ang)*86;
      return '<button class="rbtn" data-ract="'+a[0]+'" style="left:'+x+'px;top:'+y+'px"><span class="ric">'+a[1]+'</span>'+a[2]+'</button>';
    }).join('');
  }
  if(coolStateG(s)==='panic'){
    // panic: nothing works but gritting your teeth
    return [['lockin','◎','Lock In',false],['cancel','✕','Clear',false]].map((a,i)=>{
      const ang=-Math.PI/2+i*Math.PI;
      const x=Math.cos(ang)*86,y=Math.sin(ang)*86;
      return '<button class="rbtn" data-ract="'+a[0]+'" style="left:'+x+'px;top:'+y+'px"><span class="ric">'+a[1]+'</span>'+a[2]+'</button>';
    }).join('');
  }
  const nl=lootsWithin(s,LOOT_AOE).length;
  const acts=[
    ['move','⊕','Move',false],
    ['sprint','⇻','Sprint',false],
    ['hold','⌖','Hold',false],
    ['cover','▣','Take Cover',!inCoverAt(s.x,s.y)],
    ['lockin','◎','Lock In',false],
    ['loot','▤',nl>1?'Loot ×'+nl:'Loot',!nl],
  ];
  const wp=WORK.find(w=>!w.done&&(!w.needSpec||s.spec===w.needSpec)&&(!w.needCharge||s.charge)&&!(w.needClear&&hostilesActive().length)&&Math.hypot(s.x-w.x,s.y-w.y)<MOVE_R+60);
  if(wp&&s.id!=='sera'&&!s.vip)acts.push(['work','⚒','Work',false]);
  if(!turret.gunner&&dist(s,TURRET)<MOVE_R+60)acts.push(['man','⌬','Man Gun',false]);
  if(hackTargets(s).length)acts.push(['hack','⌨','Hack',false]);
  if(fsItems().length)acts.push(['fs','✦','Fire Support',false]);
  if(s.jam)acts.push(['clear','⚙','Un-jam',false]);
  acts.push(['cancel','✕','Clear',false]);
  const R=96;
  return acts.map((a,i)=>{
    const ang=-Math.PI/2+i*(Math.PI*2/acts.length);
    const x=Math.cos(ang)*R,y=Math.sin(ang)*R;
    return '<button class="rbtn" data-ract="'+a[0]+'" style="left:'+x+'px;top:'+y+'px" '+(a[3]?'disabled':'')+'>'+
      '<span class="ric">'+a[1]+'</span>'+a[2]+'</button>';
  }).join('');
}
function dockHTML(){
  if(phase==='FREE'){
    const hasTech=U.some(x=>x.spec==='fieldtech'&&!x.down&&!x.extracted&&!x.away);
    const sneakBtn='<button class="chipbtn" id="sneakBtn" aria-pressed="'+sneak+'" '+(town!=='calm'?'disabled':'')+'>'+(sneak?'Sneaking':'Sneak')+'</button>'+
      (hasTech&&U.some(x=>x.side==="law"&&x.auto&&x.hackRounds&&!x.down)?'<button class="chipbtn" id="hackBtn" aria-pressed="'+hackArm+'">'+(hackArm?'Tap an Auto…':'Hack')+'</button>':'');
    if(extractReady())return '<div class="dockcard">'+sneakBtn+'<button id="extractBtn">▲ Extract</button></div>';
    const callBtn=(fs&&fs.reached&&!fs.called)?'<button id="callBtn">▲ Call in the Marta</button>':'';
    const detBtn=(fac&&fac.planted&&!fac.detonated)?'<button id="detBtn" '+(facUnsafe()?'class="unsafe"':'')+'>✸ Detonate'+(facUnsafe()?' · clear the blast zone':'')+'</button>':'';
    return '<div class="dockcard">'+sneakBtn+callBtn+detBtn+'<span class="docklabel">right-click to move · tap an enemy to open fire'+(crossAway?'':' · watch the sight cones')+'</span></div>';
  }
  if(phase==='PLANNING'){
    const squad=plotted();
    const done=squad.filter(u=>u.order).length;
    const callBtn2=(fs&&fs.reached&&!fs.called)?'<button id="callBtn">▲ Call in the Marta</button>':'';
    const detBtn2=(fac&&fac.planted&&!fac.detonated)?'<button id="detBtn" '+(facUnsafe()?'class="unsafe"':'')+'>✸ Detonate'+(facUnsafe()?' · clear the blast zone':'')+'</button>':'';
    return '<div class="dockcard">'+callBtn2+detBtn2+'<span class="docklabel">'+done+'/'+squad.length+' plotted · unplotted stand fast'+(NADES>0?' · ✸ BLAM ×'+NADES:'')+'</span>'+
      '<button id="executeBtn">Execute Round</button></div>';
  }
  const c=engageQ&&engageQ.cur;
  if(c&&c.stage==='await'){
    const canNade=c.s.side==='reb'&&NADES>0&&!c.s.manning;
    let chips='';
    if(wpnsOf(c.s).length>1||canNade||c.s.stims>0){
      for(const w of wpnsOf(c.s)){
        const ok=validShot(c.s,c.t,w);
        chips+='<button class="wchip'+(w===c.wkey?' sel':'')+'" data-wsel="'+w+'" '+(ok?'':'disabled')+'>'+WPN[w].name+'</button>';
      }
      if(canNade)chips+='<button class="wchip'+(pickMode==='nadeToss'?' sel':'')+'" data-nade>✸ BLAM ×'+NADES+'</button>';
      if(c.s.side==='reb'&&c.s.stims>0)chips+='<button class="wchip" data-stim '+(c.s.hp>=c.s.maxhp?'disabled':'')+'>⚕ STIM ×'+c.s.stims+'</button>';
    }
    const pct=pctFor(c.need);
    return '<div class="dockcard"><span class="docklabel">'+c.s.first+' → <b>'+c.t.name+'</b></span>'+
      chips+'<button id="attackBtn">Attack · '+pct+'%</button><button id="holdBtn">Hold Fire</button></div>'+
      '<div class="docklabel" style="background:rgba(10,15,30,0.8);padding:4px 10px;border-radius:3px;">'+
      (pickMode==='nadeToss'?'tap the ground to throw the BLAM — it goes off next round':'tap another lawman — or a fuel canister — to retarget')+'</div>';
  }
  return '';
}
function statusOf(u){
  if(u.caged)return ['IN THE CELL','var(--amber)'];
  if(u.away)return ['IN THE AIR','var(--good)'];
  if(u.extracted)return ['EXTRACTED','var(--good)'];
  if(u.down)return ['DOWN','var(--heg)'];
  if(u.surr)return ['SURRENDERED','var(--dim)'];
  if(u.manning)return ['ON TURRET','var(--reb)'];
  if(u.office)return ['IN HIS OFFICE','var(--dim)'];
  if(u.id==='sera'&&!crossAway&&dist(u,PAD)<PAD.r)return ['HOTWIRING '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,'var(--amber)'];
  if(coolStateG(u)==='panic'&&!u.down&&!u.surr&&town==='alerted')return ['PANICKING','var(--heg)'];
  if(u.jam)return ['JAMMED','var(--amber)'];
  if(phase==='PLANNING'&&u.side==='reb')return u.order?[u.order.type.toUpperCase(),'var(--reb)']:['NO ORDERS','var(--dim)'];
  if(phase==='FREE'&&u.side==='reb')return u.rtPath?['MOVING','var(--reb)']:['READY','var(--dim)'];
  return ['','var(--dim)'];
}
function unitRow(u){
  const [st,stc]=statusOf(u);
  let cells='<span class="hcells">';
  for(let i=0;i<5;i++){
    const on=u.hp>i*(u.maxhp/5);
    cells+='<span class="hcell'+(on?(u.hp<u.maxhp*0.35?' on low':' on'):'')+'"></span>';
  }
  cells+='</span>';
  return '<div class="urow'+(u.side==='law'?' law':'')+(u.id===selId?' sel':'')+((u.down||u.extracted||u.away||u.surr)?' gone':'')+'" data-unit="'+u.id+'">'+
    '<span class="t"><span class="nm">'+u.name+(u.charge?' \u2738':'')+(u.spec==='fieldtech'?' \u2328':'')+'</span><span class="st" style="color:'+stc+'">'+st+'</span></span>'+cells+'</div>';
}
function syncUI(){
  $('phaseName').textContent=phase==='FREE'?'Free Move':phase==='PLANNING'?'Planning':phase==='EXEC'?'Execution':phase==='ENGAGE'?'Engagement':phase==='CUTSCENE'?'Insertion':phase==='EXTRACT'?'Extraction':phase==='GAMEOVER'?'Debrief':'Briefing';
  $('roundNum').textContent='ROUND '+Math.max(1,round);
  const tp=$('townPill');
  tp.textContent=town==='calm'?SCN.calmLabel:SCN.alertLabel;
  tp.classList.toggle('alert',town==='alerted');
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
      {t:'Clear the squatters off the rock \u2014 '+downN+'/'+foesAll.length,done:cleared,now:!cleared},
      {t:'Raise the signal in the command room',done:!!(flag&&flag.done),now:cleared},
    ];
  } else if(ix){
    const tech=U.find(u=>u.spec==='fieldtech'&&!u.down);
    const hk=WORK.find(w=>w.id==='hack');
    if(!ix.reached&&tech&&U.some(u=>u.side==='reb'&&!u.away&&!u.down&&dist(u,PAD)<260))ix.reached=true;
    objs=[
      {t:'Reach the databank terminal'+(tech?' \u2014 '+tech.first+' is the hacker':''),done:ix.reached||ix.hacked,now:!ix.reached&&!ix.hacked},
      {t:'Hack the databanks \u2014 '+Math.min((hk&&hk.prog)||0,3)+'/3',done:ix.hacked,now:ix.reached&&!ix.hacked},
      {t:'Extract with the stolen data \u2014 '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:ix.hacked},
    ];
  } else if(rs){
    const v=U.find(u=>u.vip);const nm=v?v.first:'the prisoner';const RO=SCN.releaseText?SCN.releaseText.obj:null;
    if(!rs.reached&&v&&U.some(u=>u.side==='reb'&&!u.away&&!u.down&&dist(u,{x:SCN.cage.dx,y:SCN.cage.dy})<260))rs.reached=true;
    objs=[
      {t:RO?RO[0]:'Reach the detention cage',done:rs.reached||rs.released,now:!rs.reached&&!rs.released},
      {t:RO?RO[1]:'Release '+nm+' from confinement',done:rs.released,now:rs.reached&&!rs.released},
      {t:(RO?RO[2]:'(Optional) Stay unseen'),done:rs.released&&!rs.everAlerted&&phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:false},
      {t:(RO?RO[3]:'Get '+nm+' and the squad aboard')+' \u2014 '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:rs.released},
    ];
  } else if(fac){
    const carrier=U.find(u=>u.charge&&!u.down);
    objs=[
      {t:'Get the charge to the Power Plant\u2019s main breaker'+(carrier?' \u2014 '+carrier.first+' carries it':''),done:fac.planted,now:!fac.planted},
      {t:'Plant it',done:fac.planted,now:false},
      {t:'Clear the blast zone, then detonate',done:fac.detonated,now:fac.planted&&!fac.detonated},
      {t:'(Optional) Stay unseen until it blows',done:fac.detonated&&fac.quiet,now:false,fail:fac.everAlerted&&!fac.detonated},
      {t:'Get the squad back to the Marta \u2014 '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:fac.detonated},
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
  $('objList').innerHTML=objs.map(o=>'<div class="objrow'+(o.done?' done':o.now?' now':'')+'"><span class="tick">'+(o.done?'✓':'▹')+'</span><span>'+o.t+'</span></div>').join('');
  $('rosterR').innerHTML=U.filter(u=>u.side==='reb').map(unitRow).join('');
  $('foeHead').textContent=SCN.foesLabel;
  if(town==='calm'){
    $('rosterE').innerHTML='<div class="objrow"><span class="tick">◌</span><span>'+(SCN.mode==='haven'?'The squatters don’t know you’re here — yet.':'No contacts. The town suspects nothing — yet.')+'</span></div>';
  } else {
    $('rosterE').innerHTML=U.filter(u=>u.side==='law').map(u=>{
      if(unitSeen(u)||u.down||u.surr)return unitRow(u);
      return '<div class="urow law gone"><span class="t"><span class="nm">Contact</span><span class="st" style="color:var(--dim)">NO VISUAL</span></span></div>';
    }).join('');
  }
  let lt='';
  if(tally.c)lt+='<b>◈ '+tally.c+'</b> credits · ';
  if(tally.s)lt+='<b>▤ '+tally.s+'</b> supplies · ';
  if(tally.items.length)lt+=tally.items.join(', ');
  $('lootTally').innerHTML=lt||'Nothing yet — check tills, crates and lockers.';
  const rad=$('radial');
  const showRad=phase==='PLANNING'&&radialOn&&selId;
  rad.hidden=!showRad;
  if(showRad){
    const s=U.find(x=>x.id===selId);
    if(s)rad.innerHTML=radialHTML(s);
  }
  $('pickPill').hidden=!pickMode;
  if(pickMode)$('pickPill').textContent=pickMode==='hack'?'Tap an Auto to hack \u00b7 tap to cancel':pickMode.startsWith('fs:')?(fsDraft?'Tap where the run ends \u00b7 tap to cancel':'Tap a visible spot \u00b7 tap to cancel'):'Pick a destination \u00b7 tap to cancel';
  const fsm=$('fsMenu');
  if(phase!=='PLANNING')fsMenuOn=false;
  const fsl=fsItems();
  fsm.hidden=!(fsMenuOn&&fsl.length);
  if(!fsm.hidden)fsm.innerHTML='<div class="fsh">Fire Support</div>'+fsl.map(i=>'<button class="fsbtn" data-fs="'+i.key+'"><b>'+i.name+'</b><small>'+i.sub+'</small></button>').join('');
  const dock=$('ctlDock');
  const dh=(phase==='PLANNING'||phase==='ENGAGE'||phase==='FREE')?dockHTML():'';
  dock.hidden=!dh;
  if(dh)dock.innerHTML=dh;
}
/* ---------- DOM events ---------- */
byId('ctlDock').addEventListener('click',ev=>{
  if(ev.target.id==='executeBtn')execute();
  else if(ev.target.id==='sneakBtn')setSneak(!sneak);
  else if(ev.target.id==='hackBtn'){hackArm=!hackArm;syncUI();}
  else if(ev.target.id==='extractBtn')startExtract();
  else if(ev.target.id==='callBtn')callTransport();
  else if(ev.target.id==='detBtn')facDetonate();
  else if(ev.target.id==='attackBtn')playerAttack();
  else if(ev.target.id==='holdBtn')playerHold();
  else if(ev.target.closest('[data-stim]')){
    const c=engageQ&&engageQ.cur;
    if(c&&c.stage==='await'&&!ev.target.closest('[data-stim]').disabled)useStim(c.s);
  }
  else if(ev.target.closest('[data-nade]')){
    if(engageQ&&engageQ.cur&&engageQ.cur.stage==='await'&&NADES>0){
      pickMode=(pickMode==='nadeToss')?null:'nadeToss';
      sTick();syncUI();
    }
  }
  else {
    const wc=ev.target.closest('[data-wsel]');
    if(wc&&!wc.disabled&&engageQ&&engageQ.cur&&engageQ.cur.stage==='await'){
      const c=engageQ.cur;
      engageQ.cur=makeCur(c.s,c.t,wc.getAttribute('data-wsel'));
      engageQ.cur.reveal=engageQ.cur.tn.entries.length;
      engageQ.cur.revealA=engageQ.cur.atk.entries.length;
      engageQ.cur.need=needFor(engageQ.cur.tn.total,engageQ.cur.atk.total);
      engageQ.cur.stage='await';
      sTick();syncUI();
    }
  }
});
byId('panel').addEventListener('click',ev=>{
  const r=ev.target.closest('[data-unit]');
  if(!r||phase!=='PLANNING')return;
  const u=U.find(x=>x.id===r.getAttribute('data-unit'));
  if(u&&u.side==='reb'&&!u.down&&!u.extracted&&!u.away){
    selId=u.id;radialOn=true;pickMode=null;
    camGoal={x:u.x,y:u.y,z:Math.max(cam.z,0.9)};
    sTick();syncUI();
  }
});
$('zoomIn').addEventListener('click',()=>{cam.z*=1.2;camGoal=null;clampCam();});
$('zoomOut').addEventListener('click',()=>{cam.z/=1.2;camGoal=null;clampCam();});
$('zoomFit').addEventListener('click',()=>{cam={x:W/2,y:H/2,z:fitZoom()*0.95};camGoal=null;clampCam();});
$('followBtn').addEventListener('click',ev=>{
  follow=!follow;
  ev.currentTarget.setAttribute('aria-pressed',follow);
  ev.currentTarget.textContent='Follow: '+(follow?'On':'Off');
});
$('muteBtn').addEventListener('click',ev=>{
  A.setMuted(!A.muted());
  ev.currentTarget.setAttribute('aria-pressed',A.muted());
  ev.currentTarget.textContent='Sound: '+(A.muted()?'Off':'On');
});
$('restartBtn').addEventListener('click',()=>{resetGame(false);});
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
  startCutscene();
});
$('csSkip').addEventListener('click',()=>{if(cs)endCutscene();});
/* ---------- debug menu ---------- */
$('dbgBtn').addEventListener('click',()=>{
  const m=$('dbgMenu');m.hidden=!m.hidden;
  $('dbgBtn').setAttribute('aria-pressed',String(!m.hidden));
});
$('dbgSkip').addEventListener('click',()=>{
  $('dbgMenu').hidden=true;$('dbgBtn').setAttribute('aria-pressed','false');
  if(phase==='GAMEOVER')return;
  if(cs)endCutscene();
  $('briefing').hidden=true;
  started=true;
  gameOver(true);
});
addEventListener('keydown',ev=>{
  if(SR.active!=='ground')return;
  if(ev.key==='Escape'){
    if(pickMode){pickMode=null;radialOn=!!selId;syncUI();}
    else if(selId){selId=null;radialOn=false;syncUI();}
  }
  if(ev.key==='Enter'&&phase==='PLANNING')execute();
  if((ev.key==='c'||ev.key==='C')&&phase==='FREE'&&town==='calm')setSneak(!sneak);
});
/* ---------- reset / snapshot / boot ---------- */
function initState(){
  initUnits();
  for(const u of U)if(u.side==='reb'){u.spawnX=u.x;u.spawnY=u.y;}
  round=0;town='calm';hot=0;hotT=0;crossAway=false;crossFx=null;grafState='landed';
  {const A=(CTX&&CTX.assets)||null;
   FS=A&&(A.drop||(A.ships&&A.ships.length))?{drop:!!A.drop,dropUsed:false,ships:(A.ships||[]).map(a=>Object.assign({state:'ready',left:0},a)),orders:[],n:0}:null;
   fsMenuOn=false;fsDraft=null;}
  ix=SCN.mode==='intel'?{hacked:false,reached:false}:null;
  rs=(SCN.mode==='rescue'||SCN.mode==='strider')?{released:false,everAlerted:false,reached:false}:null;
  fac=SCN.mode==='autofactory'?{planted:false,detonated:false,everAlerted:false,quiet:false,fx:null}:null;
  fs=SCN.mode==='stealfuel'?{reached:false,called:false,flying:null,landed:false,pump:0,pumpT:0,done:false}:null;
  tally={c:0,s:0,items:[]};
  lootMarks=LOOTS.map(l=>Object.assign({},l,{taken:false}));
  WORK=SCN.work.map(w=>Object.assign({},w,{done:false,t:0}));
  PROPS=SCN.props.map(pr=>Object.assign({},pr,{hp:PROPDEF[pr.kind].hp,dead:false}));
  turret={gunner:null,face:Math.PI};
  NADES=(CTX&&CTX.nades)||0;nades=[];dmgRound=new Set();
  sneak=false;launchNagged=false;
  floaters=[];tracers=[];parts=[];bubbles=[];casings=[];decals=[];exploQ=[];
  fogInit();
  tutReset();
  engageQ=null;gameEnd=null;selId=null;pickMode=null;radialOn=false;extractFx=null;
  grafPos.x=LZ.x;grafPos.y=LZ.y;grafPos.a=0.12;
  $('endscreen').hidden=true;
  logEl.innerHTML='';
  recovered=0;
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
let tutFlags={moved:0,sneaked:0,executed:0,attacked:0};
let tutIdx=0;
const TUT=[
  {text:'<b>Right-click</b> (or tap the ground) and the squad moves in real time. Walk them up the canyon toward the squatter camp at the base mouth.',
   done:()=>tutFlags.moved},
  {text:'Those <b>amber cones</b> are squatter sightlines — the red inner band still catches you while sneaking. Press <b>C</b> (or the Sneak button) to go low; the eye above a rebel fills as they’re noticed.',
   done:()=>tutFlags.sneaked||town==='alerted'},
  {text:'Start the fight on your terms: <b>click a squatter</b> and everyone with a clear shot opens fire — an <b>ambush</b>, with a bonus on the volley. Or let the detection eye fill. Either way, time drops into rounds.',
   done:()=>town==='alerted'},
  {text:'<b>Plan the round.</b> Each rebel takes one order — <b>Move</b> keeps the gun up, <b>Sprint</b> goes far but can’t shoot, <b>Hold</b> braces (+2 ATK) and fires on anyone crossing its lane. Green rings are cover. Then hit <b>Execute</b>.',
   done:()=>tutFlags.executed||hostilesActive().length===0},
  {text:'<b>Engagement:</b> shots resolve one at a time on the attack panel. Tap another squatter to retarget — or tap a <b>red canister</b> to blow it — then hit <b>ATTACK</b>.',
   done:()=>tutFlags.attacked||hostilesActive().length===0},
  {text:'Cover soaks fire and <b>shreds</b> — crates die, boulders don’t. Corridors are overwatch country: a held gun owns a hallway. Drop <b>Boss Craw</b> and the rest lose their nerve. Clear every squatter, outside and in.',
   done:()=>hostilesActive().length===0},
  {text:'The rock is yours. Push inside, walk a soldier to the command-room console, and <b>raise the signal</b>.',
   done:()=>false},
];
function tutReset(){tutFlags={moved:0,sneaked:0,executed:0,attacked:0};tutIdx=0;}
function tutTick(){
  const card=byId('tutCard');
  if(!SCN||!SCN.tutorial||phase==='BRIEF'||phase==='CUTSCENE'||phase==='GAMEOVER'){card.hidden=true;return;}
  while(tutIdx<TUT.length-1&&TUT[tutIdx].done())tutIdx++;
  card.hidden=false;
  const st=byId('tutStep'),tx=byId('tutText');
  const label='TUTORIAL '+(tutIdx+1)+'/'+TUT.length;
  if(st.textContent!==label||!tx.innerHTML){st.textContent=label;tx.innerHTML=TUT[tutIdx].text;}
}
/* ---------- scenario chrome ---------- */
function scenarioUI(){
  byId('gTitle').textContent=SCN.title;
  byId('gSub').textContent=SCN.sub;
  byId('foeHead').textContent=SCN.foesLabel;
  const B=SCN.brief||{};
  byId('gEyebrow').textContent=B.eyebrow||'Ground Operation';
  byId('gTitleB').textContent=SCN.title;
  byId('gFlavour').innerHTML=B.flavour||'';
  byId('gObj').innerHTML=SR.ui.objRows(B.objectives||[]);
  const hint=byId('gHint');
  hint.innerHTML=B.hint||'';
  hint.hidden=!B.hint;
  const spec=CTX||defaultSpec();
  const cards=(spec.squad||[]).map(sp=>SR.ui.squadCard({name:sp.name,role:'Soldier',chips:SR.ui.gearChips(sp.wpns||['akli','cowboy'])}));
  if(spec.pilot)cards.push(SR.ui.squadCard({name:spec.pilot.name,role:'Pilot',pilot:true,chips:SR.ui.gearChips(['cowboy'])}));
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
  $('muteBtn').textContent='Sound: '+(A.muted()?'Off':'On');
  $('muteBtn').setAttribute('aria-pressed',String(A.muted()));
  initState();
  pendingResult=null;
  byId('app').classList.remove('cine');
  $('csSkip').hidden=true;cs=null;
  if(params&&params.test){
    $('briefing').hidden=true;
    resetGame(false);
    return;
  }
  $('briefing').hidden=false;
  phase='BRIEF';
  for(const u of U)if(u.side==='reb')u.csHide=true;
  cam={x:LZ.x+180,y:LZ.y-160,z:0.9};clampCam();camGoal=null;
  syncUI();
}
function exit(){
  byId('app').classList.remove('cine');
  byId('csBanner').classList.remove('show');
  engageQ=null;cs=null;extractFx=null;
}
SR.register('ground',{enter,exit,frame:render});


if(location.hash==='#test'){
  window.DBGground={get U(){return U;},get phase(){return phase;},get town(){return town;},
    get hot(){return hot;},set hot(v){hot=v;},get WORK(){return WORK;},get tally(){return tally;},
    get gameEnd(){return gameEnd;},get pendingResult(){return pendingResult;},get crossAway(){return crossAway;},
    get PAD(){return PAD;},get LZ(){return LZ;},get SCN(){return SCN;},get fs(){return fs;},get fac(){return fac;},get rs(){return rs;},get hackArm(){return hackArm;},get FS(){return FS;},get ix(){return ix;},get grafPos(){return grafPos;},
    get engageQ(){return engageQ;},
    get NADES(){return NADES;},set NADES(v){NADES=v;},get nades(){return nades;},
    fn:{fsPlace,fsItems,fsExecute,fsRoundEnd,fsPlanStart,supplyDrop,startFreeHack,hackFlip,canHack,hackResolve,deployUnits,validShot,facDetonate,callTransport,fuelReach,fuelPumpStep,execute,enterFree,tryLaunch,startExtract,squadMoveTo,playerAttack,playerHold,
      completeWork,gameOver,alertTown,unitSeen,startAmbush,throwNade,useStim,
      seen(){return [...visUnits];},
      engageAwait(){return !!(engageQ&&engageQ.cur&&engageQ.cur.stage==='await');}}};
}
})();
