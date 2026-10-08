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
/* Ground pace. The Bobbleheads figures stand ~1.8x the old 30px tokens, so a Move of 180 read as 3 figure-heights
   against the original 4.5 (150 over a token); Steal the Cross needed 12 Moves to cross town. Everything on the
   ground moves 4/3 faster (2026-10-05): a Move is 4 figure-heights again. Patrol, civilian and vehicle speeds (the
   numbers in setRt calls, the vehicle rows' speed) follow the same factor, so stealth and chases keep their ratios. */
const MOVE_R=240,SPRINT_R=480,EXEC_MS=2600,LOOT_AOE=95,AUTO_LOOT=50,RT_SPEED=213,SNEAK_SPEED=115;
const PATROL_SPEED=77,CAR_PATROL_SPEED=120,CIV_SPEED=59,FLEE_SPEED=227;
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
const SANDBAG_ARC=1.15;              // half-angle of the sandbags in front of the Razorrat emplacement
const SANDBAG_COVER=3;                // what the sandbags add to a shot from the front
const RIOT_SHIELD_HP=SRDB.rules.riot_shield_hp||60;   // what a riot shield soaks from the front before it breaks
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
  title:'Steal the Cross',sub:'Dustfall · Akkaro',
  foesLabel:'Sheriff\u2019s Men',calmLabel:'Town is calm',alertLabel:'Town alerted',
  banner:['Steal the Cross','Escort the Pilot to the fighter and steal it'],
  brief:{
    eyebrow:'Ground Operation \u00b7 Dustfall, Akkaro',
    flavour:'Dustfall keeps one <b>FT-4 Cross</b> patrol fighter on the pad behind the sheriff’s HQ. Sheriff Reeve enforces Hegemony law here, so that makes him and his men targets.',
    objectives:[
      'Get the Pilot to the Ship on the landing pad north-east of town',
      'Cover the Pilot while they hotwire it.',
      'Release the docking clamps and pull the fuel line',
      'Get the squad back to the transport and extract',
      {sub:1,text:'Keep the Pilot alive.'},
    ],
  },
  csLine:'Dustfall, as promised. I\u2019ll be overhead till the Cross is up.',
  lzLabel:'GRAF LZ',
  LZ:{x:300,y:1330,r:130},PAD:{x:2130,y:330,r:95},
  TOWER:{x:1562,y:436,r:54},TURRET:{x:1965,y:540,r:26},   // the Razorrat sits clear of the Sheriff HQ's roof
  panTo:{x:1870,y:190},
  guardPt:{x:2130,y:370},
  hasGraf:true,
  bossTrigger:{x:2130,y:330,r:420},
  bossDoor:{x:1880,y:588},
  bossFloat:'THE SHERIFF',
  bossLog:'<span class="h">Sheriff Reeve kicks his office door open</span> shotgun first.',
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
      lines:['You picked the wrong town, drifters.','I ain\'t sufferin\' no disorder \'round my town.','Nobody touches that ship!']}),
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
  sub:'Redrock Flats · Akkaro',
  towerLabel:'WATCHTOWER',
  lamps:[[1640,360],[1810,540],[1260,560],[900,820],[1560,760]],
  LZ:{x:260,y:1190,r:130},PAD:{x:1700,y:440,r:150},
  TOWER:{x:1330,y:300,r:54},
  panTo:{x:1500,y:480},
  guardPt:{x:1700,y:470},
  work:[],
  waves:[
    {at:1,log:'<span class="h">A patrol crawler rolls in off the east road</span>.',
     foes:[
       foe('police-cruiser',{id:'pcw',x:2120,y:560,crew:[foe('security-patrolman',{seat:'drv',id:'pcwd'})]}),
       foe('depot-guard',{id:'dill',x:2150,y:640}),
       foe('depot-guard',{id:'corr',x:2150,y:720,wpns:['carbine']}),
     ]},
    {at:3,log:'<span class="h">The depot warden and a second crawler are arriving from the north road.</span>',
     foes:[
       foe('depot-warden',{id:'hask',x:1420,y:40}),
       foe('depot-guard',{id:'orsk',x:1520,y:40,wpns:['carbine']}),
       foe('depot-guard',{id:'vell',x:1320,y:40}),
     ]},
  ],
  bldgs:[
    {x:1100,y:340, w:280,h:200,name:'FUEL DEPOT',sign:1},
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
    {id:'strongbox',x:1236,y:510,label:'Outpost strongbox',take:'480 ◈ credits',c:480},
    {id:'guardcrate',x:880,y:830,label:'Guard post crate',take:'64 ▤ supplies',s:64},
    {id:'grain',x:560,y:620,label:'Grain store',take:'88 ▤ supplies',s:88},
    {id:'blamA',x:1560,y:800,label:'BLAM crate',take:'3× BLAM frag',nades:3},
    {id:'charges',x:800,y:760,label:'Depot blasting charges',take:'2× Explosive Charge',items:['charge','charge']},
  ],
  foes(){return [
    foe('depot-guard',{id:'holt',x:1250,y:620,wpns:['carbine'],patrol:[{x:1250,y:620},{x:1100,y:700},{x:1350,y:740}]}),
    foe('depot-guard',{id:'vane',x:1000,y:880,patrol:[{x:1000,y:880},{x:760,y:940}]}),
    foe('depot-guard',{id:'tull',x:720,y:600,patrol:[{x:720,y:600},{x:560,y:720}]}),
    foe('depot-guard',{id:'ruck',x:1780,y:300,wpns:['carbine'],guard:1,patrol:[{x:1780,y:300},{x:1890,y:430},{x:1770,y:560}]}),
    foe('depot-guard',{id:'pike2',x:1620,y:700,guard:1,patrol:[{x:1620,y:700},{x:1760,y:660}]}),
    foe('depot-guard',{id:'hale',x:1330,y:300,hp:55,aim:3,def:12,wpns:['longiron'],elev:1,fixed:1,title:'Tower'}),
  ];},
  civs(){return [
    {id:'civ1',name:'Herder',first:'herder',side:'civ',x:430,y:1000,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:430,y:1000},{x:540,y:1090},{x:380,y:1120}]},
    {id:'civ2',name:'Herder',first:'herder',side:'civ',x:900,y:1130,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:900,y:1130},{x:1040,y:1180},{x:800,y:1200}]},
  ];},
},
autofactory:{
  mode:'autofactory',W:2400,H:1600,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  sub:'Kiln Ridge · Menk',
  towerLabel:'',
  lamps:[[820,620],[1500,560],[1870,560],[700,980],[1620,1000]],
  LZ:{x:260,y:1280,r:130},PAD:{x:1860,y:512,r:60},
  plant:{x:1700,y:240,w:320,h:230,bx:1860,by:355},
  blastR:330,safeR:400,
  guardPt:{x:1860,y:560},
  work:[{id:'plant',x:1860,y:512,label:'MAIN BREAKER',verb:'plants the explosive charge on the main breaker',needCharge:1}],
  detWave:{log:'<span class="h">A Riot Transport Cruiser is coming in through the gate.</span>',
    foes:[
      foe('riot-transport-cruiser',{id:'rtc1',x:700,y:470,
       crew:[
        foe('security-patrolman',{seat:'drv',id:'rtcd'}),
        foe('security-riot-shieldman',{seat:'bay1',id:'rs2'}),
        foe('security-riot-rifleman',{seat:'bay2',id:'rr2'}),
        foe('security-riot-rifleman',{seat:'bay3',id:'rr3'}),
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
    foe('security-patrolman',{id:'drew',x:780,y:580,patrol:[{x:780,y:580},{x:760,y:700},{x:830,y:470}]}),
    foe('auto-policebot',{id:'pb12',x:830,y:900,patrol:[{x:830,y:900},{x:830,y:740}]}),
    foe('auto-policebot',{id:'pb07',x:1030,y:1080,patrol:[{x:1030,y:1080},{x:1300,y:1180}]}),
    foe('security-patrolman',{id:'soll',x:1560,y:860,patrol:[{x:1560,y:860},{x:1420,y:1000},{x:1700,y:800}]}),
    foe('auto-policebot',{id:'pb03',x:1680,y:560,guard:1,patrol:[{x:1680,y:560},{x:1780,y:600}]}),
    foe('security-riot-shieldman',{id:'rs1',x:1860,y:588,guard:1}),
    foe('security-riot-rifleman',{id:'rr1',x:2020,y:900,patrol:[{x:2020,y:900},{x:1960,y:760}]}),
    foe('strider-mk1',{id:'strid1',x:1180,y:950,patrol:[{x:1180,y:950},{x:1300,y:760},{x:1060,y:1100}]}),
  ];},
  civs(){return [
    {id:'civ1',name:'Line Worker',first:'worker',side:'civ',x:1150,y:1160,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1150,y:1160},{x:1000,y:1200},{x:1260,y:1130}]},
    {id:'civ2',name:'Line Worker',first:'worker',side:'civ',x:1400,y:1040,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1400,y:1040},{x:1500,y:1180}]},
  ];},
},
towers:{
  mode:'towers',W:2200,H:1400,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  sub:'Parity IV',
  towerLabel:'',
  lamps:[[760,420],[1300,360],[1760,560],[900,900],[1500,980]],
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
    const P=(id,x,y,pat)=>foe('security-patrolman',{id,x,y,patrol:pat||undefined});
    const B=(id,x,y,pat,guard)=>foe('auto-policebot',{id,x,y,guard:guard||0,patrol:pat||undefined});
    const RR=(id,x,y,pat,guard)=>foe('security-riot-rifleman',{id,x,y,guard:guard||0,patrol:pat||undefined});
    const RS=(id,x,y,guard)=>foe('security-riot-shieldman',{id,x,y,guard:guard||0});
    if(v==='dataflats')return [
      B('b1',820,640,[{x:820,y:640},{x:700,y:780}]),B('b2',1250,900,[{x:1250,y:900},{x:1100,y:1000}]),
      B('b3',1760,640,[{x:1760,y:640},{x:1860,y:600}],1),B('b4',1480,720,[{x:1480,y:720},{x:1620,y:800}]),
      RS('s1',1900,540,1),P('p1',600,980,[{x:600,y:980},{x:760,y:900}]),
      foe('police-cruiser',{id:'pc1',x:1050,y:1180,patrol:[{x:1050,y:1180},{x:1500,y:1120},{x:1250,y:1230}],crew:[foe('security-patrolman',{seat:'drv',id:'pc1d'})]}),
    ];
    if(v==='quota')return [
      RR('r1',860,640,[{x:860,y:640},{x:760,y:800}]),RR('r2',1300,880,[{x:1300,y:880},{x:1150,y:1000}]),
      RR('r3',1800,620,[{x:1800,y:620},{x:1960,y:640}],1),P('p1',1520,740,[{x:1520,y:740},{x:1620,y:820}]),
      foe('auto-riot-bruiser',{id:'bru1',x:1900,y:540,guard:1}),
      P('p2',620,1000,[{x:620,y:1000},{x:760,y:920}]),
    ];
    return [
      P('p1',820,620,[{x:820,y:620},{x:760,y:780},{x:900,y:540}]),P('p2',1240,900,[{x:1240,y:900},{x:1100,y:1000},{x:1380,y:860}]),
      P('p3',1560,720,[{x:1560,y:720},{x:1700,y:800}]),B('b1',1680,640,[{x:1680,y:640},{x:1780,y:600}],1),
      B('b2',900,1060,[{x:900,y:1060},{x:1200,y:1160}]),RR('r1',1900,540,null,1),
    ];
  },
  civs(){return [
    {id:'civ1',name:'Maintenance Clerk',first:'clerk',side:'civ',x:1150,y:1100,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1150,y:1100},{x:1000,y:1160},{x:1260,y:1080}]},
  ];},
},
rescue:{
  mode:'rescue',W:2200,H:1500,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  sub:'Tollgate Landing · Ballakan',
  towerLabel:'',
  lamps:[[700,520],[1300,470],[1720,560],[1100,900],[1600,930]],
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
    {id:'locker',x:1340,y:470,label:'Evidence locker',take:'EG-55 Peacekeeper Carbine',items:['carbine']},
    {id:'tollbox',x:1100,y:1050,label:'Toll box',take:'360 ◈ credits',c:360},
    {id:'rations',x:1650,y:990,label:'Barge rations',take:'72 ▤ supplies',s:72},
  ],
  foes(){return [
    foe('security-patrolman',{id:'fenn',x:720,y:470,patrol:[{x:720,y:470},{x:800,y:620},{x:640,y:480}]}),
    foe('auto-policebot',{id:'pb21',x:850,y:800,patrol:[{x:850,y:800},{x:960,y:660}]}),
    foe('auto-policebot',{id:'pb22',x:1600,y:520,guard:1,patrol:[{x:1600,y:520},{x:1660,y:560}]}),
    foe('security-riot-shieldman',{id:'rs3',x:1720,y:524,guard:1}),
    foe('security-riot-rifleman',{id:'rr4',x:1420,y:500,patrol:[{x:1420,y:500},{x:1520,y:620}]}),
    foe('security-patrolman',{id:'oake',x:1150,y:1000,patrol:[{x:1150,y:1000},{x:1000,y:850},{x:1250,y:900}]}),
    foe('security-patrolman',{id:'bray',x:1700,y:920,patrol:[{x:1700,y:920},{x:1850,y:840}]}),
    foe('auto-riot-bruiser',{id:'bru1',x:1640,y:524,guard:1}),
  ];},
  civs(){return [
    {id:'civ1',name:'Barge Hand',first:'barge hand',side:'civ',x:1250,y:1200,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1250,y:1200},{x:1120,y:1240},{x:1380,y:1180}]},
    {id:'civ2',name:'Barge Hand',first:'barge hand',side:'civ',x:800,y:1180,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:800,y:1180},{x:700,y:1100}]},
  ];},
},
intel:{
  mode:'intel',W:2400,H:1500,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  sub:'Data Flats · Parity IV',
  towerLabel:'',
  lamps:[[760,560],[1300,520],[1660,600],[1100,900],[1800,900]],
  LZ:{x:260,y:1200,r:130},PAD:{x:1660,y:540,r:60},
  guardPt:{x:1660,y:600},
  work:[{id:'hack',x:1660,y:540,label:'DATABANK TERMINAL',verb:'cracks the databank and copies the drive',needSpec:'fieldtech',rounds:3}],
  alarmWave:{log:'<span class="h">The trace trips the alarm and a security crawler pulls up at the gate</span>.',
    foes:[
      foe('security-riot-shieldman',{id:'rs5',x:640,y:560}),
      foe('security-riot-rifleman',{id:'rr5',x:600,y:640}),
      foe('security-riot-rifleman',{id:'rr6',x:600,y:480}),
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
    foe('security-patrolman',{id:'crane',x:760,y:600,patrol:[{x:760,y:600},{x:900,y:700},{x:720,y:470}]}),
    foe('auto-policebot',{id:'pb31',x:1150,y:640,patrol:[{x:1150,y:640},{x:1000,y:700}]}),
    foe('auto-policebot',{id:'pb32',x:1620,y:640,guard:1,patrol:[{x:1620,y:640},{x:1720,y:620}]}),
    foe('security-riot-shieldman',{id:'rs4',x:1660,y:600,guard:1}),
    foe('security-riot-rifleman',{id:'rr7',x:1400,y:540,patrol:[{x:1400,y:540},{x:1500,y:680}]}),
    foe('security-patrolman',{id:'elm',x:1200,y:1000,patrol:[{x:1200,y:1000},{x:1050,y:900},{x:1350,y:1050}]}),
    foe('auto-policebot',{id:'pb33',x:1800,y:940,patrol:[{x:1800,y:940},{x:1950,y:860}]}),
    foe('police-cruiser',{id:'pc1',x:1050,y:1180,patrol:[{x:1050,y:1180},{x:1500,y:1120},{x:1250,y:1230}],crew:[foe('security-patrolman',{seat:'drv',id:'pc1d'})]}),
  ];},
  civs(){return [
    {id:'civ1',name:'Data Clerk',first:'clerk',side:'civ',x:1150,y:1160,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1150,y:1160},{x:1000,y:1200},{x:1260,y:1130}]},
  ];},
},
strider:{
  mode:'strider',W:2400,H:1600,style:'town',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:true,tumbleweed:false,
  title:'Steal the Strider',sub:'Menk Crossing · Menk',
  foesLabel:'Security',calmLabel:'Yard is quiet',alertLabel:'Yard alerted',
  banner:['Steal the Strider','Walk it out'],
  brief:{
    eyebrow:'Ground Operation · Menk Crossing, Menk',
    flavour:'A <b>Strider Mk I</b>, the Hegemony’s friendly neighbourhood enforcement walker, is parked in a locked holding yard behind the AutoCom Plant’s Crossing depot, waiting for delivery. Its access panel can be found on site. Get in, override its loyalty subroutines, and walk it out.',
    objectives:[
      'Reach the holding yard behind the depot',
      'Override the Strider’s leash panel',
      'Guide the Strider and the squad back to the transport.',
      {sub:1,text:'(Optional) Do it without the enemy realising you were there.'},
      {sub:1,text:'The Strider must not be destroyed.'},
    ],
    hint:'The Strider is a powerful ally, but an equally powerful foe. Riot shields soak every shot from the front until they break, so flank them.',
  },
  towerLabel:'',
  lamps:[[760,640],[1300,560],[1720,600],[1200,980],[1800,1000]],
  csLine:'Menk Crossing ahead. I\u2019ll be back with the cargo bay open. Try not to scratch the paint!',
  lzLabel:'LZ',
  LZ:{x:260,y:1250,r:130},PAD:{x:1720,y:480,r:60},
  cage:{x:1640,y:340,w:160,h:140,dx:1720,dy:490,label:'HOLDING YARD'},
  guardPt:{x:1720,y:560},
  releaseText:{float:'STRIDER ONLINE',log:'The hack is successful. The Strider stands up, its face-screen cheerfully reading <b>“We’re all in this together.”</b> Get it and the squad back to the transport.',
    obj:['Reach the holding yard','Hack the Strider','(Optional) Stay unseen','Get the Strider and the squad aboard']},
  work:[{id:'release',x:1720,y:496,label:'ACCESS PANEL',verb:'accesses the Strider’s subroutines',rounds:2}],
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
    foe('security-patrolman',{id:'hask2',x:720,y:470,patrol:[{x:720,y:470},{x:800,y:620},{x:640,y:480}]}),
    foe('auto-policebot',{id:'pb41',x:850,y:800,patrol:[{x:850,y:800},{x:960,y:660}]}),
    foe('auto-policebot',{id:'pb42',x:1600,y:560,guard:1,patrol:[{x:1600,y:560},{x:1660,y:600}]}),
    foe('security-riot-shieldman',{id:'rs6',x:1720,y:540,guard:1}),
    foe('security-riot-rifleman',{id:'rr8',x:1420,y:500,patrol:[{x:1420,y:500},{x:1520,y:640}]}),
    foe('security-patrolman',{id:'elm2',x:1150,y:1000,patrol:[{x:1150,y:1000},{x:1000,y:850},{x:1250,y:900}]}),
    foe('auto-policebot',{id:'pb43',x:1700,y:940,patrol:[{x:1700,y:940},{x:1850,y:860}]}),
    foe('riot-dispersal-cruiser',{id:'rdc1',x:1450,y:690,guard:1,crew:[foe('security-patrolman',{seat:'drv',id:'rdcd'}),foe('security-riot-rifleman',{seat:'gun',id:'rdcg',aim:1,title:'Riot Gunner'})]}),
  ];},
  civs(){return [
    {id:'civ1',name:'Depot Hand',first:'depot hand',side:'civ',x:1250,y:1200,hp:40,maxhp:40,aim:0,def:8,wpns:[],haunt:[{x:1250,y:1200},{x:1120,y:1240},{x:1380,y:1180}]},
  ];},
},
haven:{
  mode:'haven',W:1600,H:1200,scale:1.45,style:'rock',fog:true,
  hasPad:false,hasTower:false,hasTurret:false,hasGraf:false,tumbleweed:false,tutorial:true,gen:1,
  title:'Take the Rock',sub:'Haven Rock · the Drift',
  foesLabel:'Squatters',calmLabel:'Camp is quiet',alertLabel:'Camp alerted',
  banner:['Take the Rock','Eliminate the criminal squatters from our new home'],
  brief:{
    eyebrow:'Prologue · The Drift',
    flavour:'Until now, you have been little more than disgruntled civilians. Angry at the Hegemony, willing to bend its laws, but never organised enough to do anything about it.<br><br><b>That ends here.</b><br><br>A smuggler’s bolt-hole has been carved into a mountain, hidden from the Hegemony and absent from every official chart. It has a hangar, a command room and enough bunks to house a small crew. Unfortunately, it’s already occupied by a handful of <b>Vult gang squatters</b>. Take the base, and you’ll have somewhere to build the revolution.',
    objectives:[
      'Clear the squatters out of the area.',
      'Eliminate the squatter leader.',
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
  bossLog:'<span class="h">Boss Craw storms out of the command room</span>, scattergun armed.',
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
      lines:['Vult gang runs this place!','Burn them out!','This is CLAIMED, you hear?!']}),
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
/* every transport drops the squad, lifts off and comes back for the pickup once the job is done (DESIGN_BLOCKERS C-30) */
for(const k in SCENARIOS)if(SCENARIOS[k].hasGraf)SCENARIOS[k].grafLeaves=true;
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
const KEY_BLDG={towers:'TOWER COMPOUND',intel:'EAST SERVER HALL',stealfuel:'FUEL DEPOT',autofactory:'AUTO ASSEMBLY',rescue:'GUARDHOUSE'};
/* a mission type replayed in a new narrative context: rename the place, relabel the key building, thicken security with the world's Security level */
function contextScenario(base,c,sec){
  const S=Object.assign({},base);
  if(c){
    if(c.title)S.title=c.title;
    if(c.sub)S.sub=c.sub;
    S.brief=Object.assign({},base.brief,{eyebrow:c.eyebrow||(base.brief||{}).eyebrow,flavour:c.flavour||(base.brief||{}).flavour});
    if(c.place&&base.csLine)S.csLine=c.place+'. '+String(base.csLine).replace(/^[^.]*\.\s*/,'');
    const key=KEY_BLDG[base.mode]||KEY_BLDG[base.id];
    if(key&&c.target&&base.bldgs)S.bldgs=base.bldgs.map(b=>b.name===key?Object.assign({},b,{name:c.target.toUpperCase()}):b);
    S.place=c.place||'';
    S.variant=c.variant||'';
  }
  const extra=Math.max(0,(sec||1)-2)*2;
  if(extra>0&&base.foes){
    const f0=base.foes;
    S.foes=function(){
      const L=f0.call(this),pool=L.filter(f=>!f.auto&&!f.veh&&!f.shield&&!f.tower&&!f.elev&&!f.office&&!f.manning);
      const out=L.slice();
      for(let i=0;i<extra&&pool.length;i++){
        const f=pool[i%pool.length];
        out.push(Object.assign({},f,{id:f.id+'x'+i,name:f.name?f.name.replace(/\S+$/,'Auxiliary'+(i+1)):undefined,first:f.name?'Aux'+(i+1):undefined,x:f.x+30+i*9,y:f.y+22,
          patrol:f.patrol?f.patrol.map(q=>({x:q.x+30,y:q.y+22})):undefined,guard:0}));
      }
      return out;
    };
  }
  return S;
}
/* a mission type's words on the scenario: title, banner, briefing, arrival call and labels all come from its text set
   (game/js/mission-text.js), filled in for this deployment. The scenario keeps the map. */
function typeText(base,c){
  const S=Object.assign({},base),mt=MT.forScenario(base.mode);
  S.mt=mt;
  S.place=(c&&c.place)||base.place||String(base.sub||'').split(' \u00b7 ')[0]||'the target';
  S.target=(c&&c.target)||mt.targets[0];
  const f=str=>MT.fill(str,mvars({target:S.target,place:S.place}));
  S.title=(c&&c.title)||mt.name;
  S.sub=(c&&c.sub)||base.sub;
  S.banner=[S.title,f(mt.banner)];
  S.foesLabel=f(mt.foes);S.calmLabel=f(mt.calm);S.alertLabel=f(mt.alert);
  S.brief={eyebrow:(c&&c.eyebrow)||'Ground Operation \u00b7 '+String(base.sub||S.place).replace(' \u00b7 ',', '),
    flavour:(c&&c.flavour)||f(mt.desc),
    objectives:mt.obj.filter(o=>!o.opt).map(o=>f(o.t)).concat(mt.obj.filter(o=>o.opt).map(o=>({sub:1,text:f(o.t)})),(mt.notes||[]).map(t=>({sub:1,text:f(t)}))),
    hint:f(mt.hint)};
  S.csLine=f(mt.arrive);
  S.lzLabel=f(MT.COMMON.lz);
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
   SCN=(CTX&&(CTX.ctx||CTX.sec>2))?contextScenario(b,CTX.ctx,CTX.sec):b;
   if(MT.forScenario(SCN.mode))SCN=typeText(SCN,CTX&&CTX.ctx);}
  W=SCN.W;H=SCN.H;
  LZ=SCN.LZ;
  PAD=SCN.PAD||OFFMAP;
  TOWER=SCN.TOWER||OFFMAP;
  TURRET=SCN.TURRET?Object.assign({bags:true},SCN.TURRET):{x:-99999,y:-99999,r:26};   // the pad's Razorrat sits behind sandbags
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
    autoType:o.autoType||(o.auto?'policebot':null),hackRounds:o.hackRounds||(o.auto&&!o.vehicle?1:0),arm:0,shdCap:0},o);
  u.cool0=u.cool;
  u.maxArm=u.arm=Math.max(0,u.arm||0);              // armour bar over health (worn kit, a vehicle's plating)
  u.maxShd=Math.max(0,u.shdCap||0);u.shd=0;         // a shield bar over both, empty until the shield is raised
  if(u.shield&&u.shieldHp===undefined)u.shieldHp=RIOT_SHIELD_HP;
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
const PILOT_LINES=['Just keep me in one piece.','I fly things. I don’t shoot things. Mostly.','This isn\'t my natural habitat. Keep them off me.'];
let CTX=null; // mission spec from the base layer
function defaultSpec(){
  return {kind:'ground',missionId:'stealcross',days:2,
    squad:[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['akli','cowboy']}],
    pilot:{id:'sera',name:'Sera Kest',first:'Sera'},
    grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},
    transport:{id:'graf',name:'Marta',cls:'graf'}};
}
/* a squad member's armour and shield: an Auto's own shell (sp.arm) plus the head and body kit they wear */
function squadProt(sp){
  const k=Items.protection([sp.head,sp.body]);
  return {arm:(sp.arm||0)+k.arm,shdCap:(sp.shdCap||0)+k.shd};
}
function initUnits(){
  chatT=6;
  const spec=CTX||defaultSpec();
  const spots=[[LZ.x-30,LZ.y-64],[LZ.x+42,LZ.y-52],[LZ.x-72,LZ.y+10],[LZ.x-96,LZ.y-40]];
  const squad=spec.squad.map((sp,i)=>mkU(Object.assign({id:sp.id,pid:sp.id,name:sp.name,first:sp.first,side:'reb',art:sp.art,
    x:spots[i%4][0],y:spots[i%4][1],hp:sp.hp||100,maxhp:sp.hp||100,aim:sp.aim||2,def:sp.def||12,cool:sp.cool||65,
    level:sp.level||1,tr:sp.tr||[],rels:sp.rels||[],ms:sp.ms||0,hero:sp.hero||0,nosprint:sp.nosprint||0,oneHand:sp.oneHand||0,cview:sp.cview||0,agi:sp.agi||1,nv:sp.nv||1,stims:sp.autoType?0:1,meds:sp.autoType?0:(sp.meds===undefined?1:sp.meds),packsUsed:0,spec:sp.spec||null,spec2:sp.spec2||null,big:sp.big?1:0,heavy:sp.heavy?1:0,auto:sp.autoType?1:0,autoType:sp.autoType||null,hackRounds:0,wpns:sp.wpns||['akli','cowboy'],back:sp.back||null,lines:REB_LINES[sp.id]||REB_LINES.generic},squadProt(sp))));
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
      wpns:spec.vip.wpns||['cowboy'],frail:big?0:1,big:big?1:0,auto:big?1:0,bot:big?'strider':undefined,autoType:big?'strider':undefined,vip:1,caged:1,away:1,lines:MT.type('rescue').vip.slice()}));
  }
  if(spec.pilot){
    roster.push(mkU({id:'sera',pid:spec.pilot.id,name:spec.pilot.name,first:spec.pilot.first,side:'reb',art:spec.pilot.art,
      x:LZ.x+16,y:LZ.y+34,hp:55,maxhp:55,aim:1,def:11,cool:45,level:(spec.pilot.level||2),stims:1,wpns:spec.pilot.wpns||['cowboy'],frail:1,lines:PILOT_LINES}));
  }
  U=[
    ...roster,
    ...nameFoes(expandUnits(SCN.foes()),[]),
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
const WRECK_BLAST=130,WRECK_DMG=[12,26];   // a destroyed vehicle's blast: radius, and damage at the centre (my numbers)
function mkVeh(o){
  const d=VEHDEF[o.veh];
  const v=mkU(Object.assign({name:d.name,first:d.first,hp:d.hp,maxhp:d.hp,def:d.def,arm:d.arm,shdCap:d.shdCap,aim:0,cool:55},o,
    {side:'veh',owner:o.owner||o.side||null,vehicle:1,wpns:[],seats:d.seats.map(x=>Object.assign({},x,{occ:null}))}));
  delete v.crew;
  return v;
}
/* roster entries: one with veh is a vehicle, and its crew list arrives already mounted */
/* Hegemony guards come unnamed from the scenario: each gets a name from their type's pool and their type's lines
   (game/js/mission-text.js). Story characters (Sheriff Reeve, Boss Craw, the squatters) arrive with their own. */
function nameFoes(list,others){
  const taken=new Set(others.concat(list).map(u=>u.name).filter(Boolean));
  for(const u of list){
    if(u.side!=='law'||u.veh||u.name)continue;
    const n=MT.foeName(u.type,taken,rng,u.title);
    if(!n)continue;
    u.name=n.name;u.first=n.first;taken.add(n.name);
    const T=MT.FOES.types[u.type];
    u.lines=T.alarm.map(x=>mtx(x));u.idle=T.idle.map(x=>mtx(x));u.pooled=1;
  }
  return list;
}
/* now and then, while all is quiet, a guard the squad can see mutters one of their type's idle lines */
let chatT=6;
function chatterUpdate(dt){
  if(town!=='calm')return;
  chatT-=dt;
  if(chatT>0)return;
  chatT=9+rng()*8;
  const l=U.filter(u=>u.side==='law'&&u.idle&&u.idle.length&&!u.down&&!u.surr&&visUnits.has(u.id));
  if(l.length){const u=l[rint(0,l.length-1)];say(u,u.idle[rint(0,u.idle.length-1)],3000);}
}
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
const emptyVeh=t=>!!(t&&t.veh&&!crewIn(t).length);
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
  sBoomBig();juice('rocket',v.x,v.y,{r:110});
  decals.push({x:v.x,y:v.y,r:58});
  for(let i=0;i<24;i++)parts.push({x:v.x+(rng()-0.5)*40,y:v.y+(rng()-0.5)*30,vx:(rng()-0.5)*220,vy:-rng()*160,r:3+rng()*5,a:0.8,col:i%3?'#ff9a3c':'#3a3430',t0:clock(),dur:900});
  addFloater(v.x,v.y-50,'DESTROYED',C.hazard);
  log('<span class="b">The '+v.name+' is destroyed</span>'+(by?' — '+nameSpan(by)+'’s shot':'')+'.');
  const crew=crewIn(v);
  for(const c of crew){
    dismount(c,true);
    const dmg=rint(10,22);
    log(nameSpan(c)+' is thrown from the wreck <span class="d">— -'+dmg+'</span>.');
    woundUnit(null,c,dmg,rng()<0.25,'explosive');
  }
  /* the wreck goes up: anyone standing close is caught in it, crewed or not (DESIGN_BLOCKERS C-7) */
  for(const u of U){
    if(u===v||crew.includes(u)||u.side==='civ'||u.down||u.extracted||u.away||u.office||(u.mnt&&enclosed(u)))continue;
    const d=dist(u,v);
    if(d>=WRECK_BLAST)continue;
    const dmg=Math.round(rint(WRECK_DMG[0],WRECK_DMG[1])*(1-d/WRECK_BLAST*0.6));
    woundUnit(null,u,dmg,false,'explosive');
    if(!u.down)log(nameSpan(u)+' is caught as the '+v.first+' goes up — <b>-'+dmg+'</b>.');
  }
  checkDefeat();
}
/* the transport's squad gets out as the alarm goes up */
function deployUnits(v){
  v.deployed=1;
  if(SUP().noReinf&&v.side==='law')return;   // Blackout: the transport never got the order to unload
  const bay=crewIn(v).filter(c=>{const st=seatOf(c);return st&&!st.drive&&!st.wkey;});
  if(!bay.length)return;
  for(const c of bay)dismount(c,true);
  log('<span class="h">'+v.name+' disgorges its riot squad.</span>');
  sAlert();
}

/* ---------- state ---------- */
let phase='BRIEF';       // BRIEF, CUTSCENE, FREE, PLANNING, EXEC, ENGAGE, EXTRACT, GAMEOVER
let round=0,started=false,town='calm';
let hotT=0,rtPing=null,extractFx=null,freeHinted=false,lastSpotT=0,lastFrame=0,lastReal=0;
let NADES=0,nades=[],dmgRound=new Set();
let quietRounds=0,shotRound=false,roundHot=false;   // is the fight still on? (stillFighting)
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
let floaters=[],tracers=[],parts=[],bubbles=[],casings=[],hits=[],boomFx=[],hitFx=[],fsFx=[];   // fsFx: strafing runs, supply drops, landings   // hitFx: armour, shield, sunder and pierce flashes
let cam={x:LZ.x,y:LZ.y,z:0.9},camGoal=null,follow=true;
let cs=null;             // cutscene state
let alertFlash=0,tumble={x:-200,y:830,v:34,r:16,spin:0};
let gameEnd=null;
/* ---------- juice (art handoff: Juice) ----------
   One trauma shake, one particle system, in-world pops, volleys and impacts for the scene. Hitstop freezes the game
   clock, clock(), for a beat while the screen keeps drawing; the shake runs on real time and moves the world, never
   the HUD. SR_ART.JUICE holds the numbers for each event: tune them there, not here. Reduced motion turns off the
   shake, hitstop and drifting particles. The #test harness has no hitstop, so its timings stay exact (fn.juiceOn
   turns it back on for the juice smoke test). */
const JUICE=window.SR_ART.JUICE,SHK=window.SR_ART.Shake(),PFX=window.SR_ART.Particles();
const HS={from:0,until:0,acc:0,last:0};
let juiceLive=!/test/.test(location.hash);
let pops=[],vols=[],impFx=[],jfx=[];   // damage numbers and callouts; volleys in flight; per-round impacts; rings, shield breaks, pickups
let woundQuiet=false;                   // a volley is showing this hit's numbers round by round
function clock(r){
  if(r==null)r=performance.now();
  if(HS.until){
    if(r>=HS.until){HS.acc+=HS.until-HS.from;HS.until=0;}
    else if(r>=HS.from)r=HS.from;
  }
  HS.last=Math.max(HS.last,r-HS.acc);
  return HS.last;
}
const stillMotion=()=>HUD.reduced||!!(SR.settings&&SR.settings.reduced());
const goreOn=()=>!SR.settings||SR.settings.get('gore')!==false;
function hitstop(ms){
  if(!ms||!juiceLive||stillMotion())return;
  const r=performance.now();clock(r);
  if(HS.until){HS.until=Math.max(HS.until,r+ms);return;}
  HS.from=r;HS.until=r+ms;
}
/* an event from the JUICE table: hitstop, trauma and its particles at (x, y). o.k scales it; o.dir aims sprays. */
function juice(ev,x,y,o){
  const J=JUICE[ev];if(!J)return;
  o=o||{};const k=o.k==null?1:o.k,calm=stillMotion();
  if(!o.noStop)hitstop(Math.round(J.hitstop*k));
  if(J.trauma&&x!=null){const p=worldToCss(x,y),off=p[0]<-80||p[0]>cssW+80||p[1]<-80||p[1]>cssH+80;SHK.add(J.trauma*k*(off?0.35:1));}
  else if(J.trauma)SHK.add(J.trauma*k);
  if(x==null)return;
  const em=(kind,o2)=>{if(calm&&(kind==='smoke'||kind==='ember'||kind==='dust'))return;PFX.emit(kind,x,y,o2);};
  if(ev==='shot'){if(o.brass!==false)em('casing',{n:1,dir:o.dir==null?-Math.PI/2:o.dir+Math.PI*0.6,spread:0.8,floor:y+20});em('smoke',{n:1,size:0.6});}
  else if(ev==='armourHit')em('spark',{n:5,dir:o.dir==null?undefined:o.dir+Math.PI,spread:1.6});
  else if(ev==='crit'){em('spark',{n:14,spread:Math.PI*2,size:1.3});jfx.push({k:'ring',x,y,t0:clock(),dur:600,col:C.goldHi,r:40});}
  else if(ev==='down')em('dust',{n:8,floor:y,spread:Math.PI,dir:-Math.PI/2,size:1.2});
  else if(ev==='grenade'||ev==='rocket'){
    const big=ev==='rocket'?1.3:1;
    em('debris',{n:Math.round(10*big),floor:y+8,speed:220*big});em('ember',{n:8});em('smoke',{n:6,size:1.6*big});em('dust',{n:10,floor:y,size:1.6});
    jfx.push({k:'ring',x,y,t0:clock(),dur:700,col:'#fffbe6',r:(o.r||135)*0.9});
  }
  else if(ev==='shieldBreak'){em('shard',{n:12});jfx.push({k:'shieldBreak',x,y:o.y0==null?y:o.y0,t0:clock(),dur:700});}
  else if(ev==='loot'){em('coin',{n:6,floor:y+6});if(o.item)jfx.push({k:'pickup',x,y,t0:clock(),dur:900,item:o.item});}
}
/* in-world numbers and callouts (SR_ART.popText); the HUD's plain floaters stay for everything else */
function addPop(x,y,text,col,o){pops.push(Object.assign({x,y,text,col,t0:clock(),dir:Math.random()<0.5?-1:1},o||{}));}
function hitPose(t){const n=clock();t._flashT=n;t._sqT=n;}

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
/* ---------- cover: what stands in the line of the shot ----------
   Cover is an object between the shooter and a target who is hugging it, never a ring round it:
   - a prop (crates, drums, a truck, a boulder) covers a target within HUG of it when the shot's line passes through it;
   - a building covers a target hugging its wall when the wall faces the shooter (within COVER_ARC): the shot has to
     come round its edge, which is a corner shot.
   A shot that comes from the side or behind misses the object: that target is flanked, and simply gets no cover. Take
   cover (pressing up against it) adds a small TAKE_COVER, only against shots the cover is in the way of, and they still
   shoot that round. */
const HUG=34,COVER_ARC=1.4,WALL_COVER=9,TAKE_COVER=2;
/* where p falls along the segment a-b (k: 0 at a, 1 at b) and how far it is from the segment */
function segPt(ax,ay,bx,by,px,py){
  const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy||1,k=((px-ax)*dx+(py-ay)*dy)/L,kc=Math.max(0,Math.min(1,k));
  return {k,d:Math.hypot(ax+dx*kc-px,ay+dy*kc-py)};
}
/* the nearest point of a building's footprint to (x, y), and how far it is */
function rectNear(b,x,y){const nx=Math.max(b.x,Math.min(b.x+b.w,x)),ny=Math.max(b.y,Math.min(b.y+b.h,y));return {x:nx,y:ny,d:Math.hypot(x-nx,y-ny)};}
const propsNear=(x,y)=>PROPS.filter(p=>!p.dead&&PROPDEF[p.kind].cov>0&&Math.hypot(p.x-x,p.y-y)<PROPDEF[p.kind].r+HUG);
const wallsNear=(x,y)=>BLDGS.filter(b=>{const n=rectNear(b,x,y);return n.d>0&&n.d<HUG;});
function inCoverAt(x,y){return propsNear(x,y).length>0||wallsNear(x,y).length>0;}
function coverOf(s,t){
  if(t.elev)return {v:2,lab:'TOWER RAILING'};
  if(t.veh||t.mnt)return null;
  let best=null;
  const take=(v,lab,o)=>{if(s.elev){v=Math.max(1,v-2);lab='COVER (HIGH ANGLE)';}if(!best||v>best.v)best=Object.assign({v,lab},o);};
  for(const p of propsNear(t.x,t.y)){
    const def=PROPDEF[p.kind],q=segPt(s.x,s.y,t.x,t.y,p.x,p.y);
    if(q.k>0&&q.k<1&&q.d<=def.r+6)take(def.cov,def.lab+' COVER',{prop:p});   // the line goes through it, between the two
  }
  for(const b of wallsNear(t.x,t.y)){
    const n=rectNear(b,t.x,t.y);
    if(Math.abs(angNorm(Math.atan2(n.y-t.y,n.x-t.x)-Math.atan2(s.y-t.y,s.x-t.x)))<=COVER_ARC)take(WALL_COVER,'WALL COVER',{wall:b});
  }
  return best;
}
/* the cover a spot gives against a set of shooters: the best level (0 none, 1 half, 2 full), from how many of them,
   and whether there is anything there to hug at all */
function coverVs(x,y,foes){   // only the ones who could fire on the spot count: in range, with a clear line
  const t={x,y};let lvl=0,n=0,tot=0;
  for(const f of foes){
    const w=WPN[(f.wpns&&f.wpns[0])||'akli'];
    if((w&&Math.hypot(f.x-x,f.y-y)>w.rng)||segBlocked(f.x,f.y,x,y))continue;
    tot++;
    const c=coverOf(f,t);if(c){n++;lvl=Math.max(lvl,c.v>=9?2:1);}
  }
  return {lvl,n,tot,hug:inCoverAt(x,y)};
}
/* who could shoot at someone on this side: for the squad, only the hostiles it has seen */
const threatsTo=side=>U.filter(o=>!o.veh&&!o.down&&!o.surr&&!o.extracted&&!o.away&&!o.office&&!o.caged&&
  (side==='reb'?o.side==='law'&&unitSeen(o):o.side==='reb'));
function chipCover(prop,dmg){
  if(!prop||prop.dead||PROPDEF[prop.kind].hp===undefined)return;
  prop.hp-=dmg;
  if(prop.hp<=0){
    prop.dead=true;
    addFloater(prop.x,prop.y-24,'COVER DESTROYED',C.hazard);
    log('<span class="b">'+sc(PROPDEF[prop.kind].lab)+' shot to pieces</span> — that cover is gone.');
    for(let k=0;k<10;k++)parts.push({x:prop.x,y:prop.y,vx:(rng()-0.5)*160,vy:-rng()*90,r:2+rng()*3,a:0.6,col:'#6a5636',t0:clock(),dur:700});
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
/* a squad member's Personnel File, on a double-click on them or their row (base.js SR.personFile) */
const fileWin=HUD.win(ROOT,{id:'fileWin',title:'Personnel file',body:'<div class="sr-pfile" id="pfileBody"></div>'});
function openFile(u){
  if(!u||u.side!=='reb'||u.veh)return false;
  const html=SR.personFile&&SR.personFile(u.pid||u.id);
  if(!html)return false;
  byId('pfileBody').innerHTML=html;fileWin.open();
  return true;
}
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
  bubbles.push({unit:u,text,t0:clock(),dur:dur||3600});
  if(bubbles.length>4)bubbles.shift();
}
function sayRandom(u){if(u&&u.lines&&u.lines.length)say(u,u.lines[rint(0,u.lines.length-1)]);}
function addFloater(x,y,text,col){floaters.push({x,y,text,col,t0:clock()});}

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
  return false;
}
/* ---------- deployables (Gear doc): carried in the Back slot, set up with the Deploy order ----------
   Razorrat LMG: set up where the rebel stands, facing the way they face, and they get behind it (Man gun /
   Leave gun as on the Steal the Cross pad; a field deployment has no sandbags). One emplacement per map.
   Riot Shield: moves from the back into the hands, replacing the primary weapon; it soaks hits from the front
   until it breaks (RIOT_SHIELD_HP), and a broken one is gone. */
const DEPLOY={
  razorrat(u){
    if(turretOn())return 'There is already a gun set up here.';
    TURRET={x:u.x,y:u.y,r:26,bags:false,field:u.pid||u.id};
    turret={gunner:null,face:u.face};
    u.back=null;u.deployed='razorrat';
    log(nameSpan(u)+' sets up the <b>Razorrat LMG</b>.');
    manTurret(u);
    return '';
  },
  riotshield(u){
    u.back=null;u.deployed='riotshield';
    const prim=u.wpns.find(w=>!(WPN[w]&&WPN[w].oneHand));
    if(prim){u.stowed=prim;u.wpns=u.wpns.filter(w=>w!==prim);}
    if(!u.wpns.length)u.wpns=['unarmed'];
    u.shield=1;u.shieldHp=RIOT_SHIELD_HP;
    addFloater(u.x,u.y-48,'SHIELD UP',C.shield);
    log(nameSpan(u)+' takes up the <b>riot shield</b>'+(prim?' and slings the '+WPN[prim].name:'')+'.');
    return '';
  },
};
const canDeploy=u=>!!(u&&u.back&&DEPLOY[u.back]&&!u.mnt&&!u.bot&&!u.auto&&!u.down&&!u.manning&&!stunned(u));
function deployWhy(u){return !u.back?'Nothing on their back to set up.':u.back==='razorrat'&&turretOn()?'There is already a gun set up here.':'';}
function doDeploy(u){
  const why=canDeploy(u)?DEPLOY[u.back](u):'Nothing to set up.';
  if(why){addFloater(u.x,u.y-40,why.toUpperCase(),C.text3);return false;}
  u._deployT=clock();
  return true;
}
/* the Razorrat emplacement (Steal the Cross, DESIGN_BLOCKERS C-9): a deployed LMG behind a ring of sandbags. A shot
   from inside the arc it faces meets the sandbags; from the side the gunner is in the open. */
const turretOn=()=>TURRET.x>-9000;
function sandbagged(shooter,gunner){
  if(!gunner.manning||!TURRET.bags)return false;
  const a=Math.atan2(shooter.y-TURRET.y,shooter.x-TURRET.x);
  return Math.abs(angNorm(a-turret.face))<SANDBAG_ARC;
}

/* ---------- critical injuries (see rebel-injury.js) ----------
   u.inj is [{k, treated}]. A critical hit on a rebel inflicts one; its combat effect lasts until a Treat Wound
   action patches it. Whatever was suffered is reported back so the base can run the recovery. */
const WDAM={},ONE_HAND=[];for(const k in WPN){WDAM[k]=WPN[k].dmg;if(WPN[k].oneHand)ONE_HAND.push(k);}
const TREAT_R=110;
const injOf=(u,k)=>!!u&&!!u.inj&&u.inj.some(i=>i.k===k&&!i.treated);
const hasInj=u=>!!u&&!!u.inj&&u.inj.some(i=>!i.treated);
/* a concussion stuns for the round after it lands (stunTo: the last round it holds), then wears off; the injury stays
   for the base to heal, and a Treat Wound still clears the stun at once */
const stunned=u=>!!u&&!!u.inj&&u.inj.some(i=>i.k==='concussion'&&!i.treated&&!i.shook);
function stunTick(){
  for(const u of U){
    const i=(u.inj||[]).find(x=>x.k==='concussion'&&!x.treated&&!x.shook);
    if(!i||(i.stunTo!==undefined&&i.stunTo>round))continue;
    i.shook=1;
    if(u.down||u.dead)continue;
    addFloater(u.x,u.y-52,'SHAKES IT OFF',C.go);
    log(nameSpan(u)+' <span class="g">shakes off the stun</span> <span class="d">\u2014 still concussed, but back in the fight</span>.');
  }
}
const cantSprint=u=>!!u&&(u.nosprint||injOf(u,'brokenleg')||!!u.bot||!!u.mnt);
function inflictInjury(t,src,force){
  if(!t||t.side!=='reb'||t.auto||t.vip||t.caged||t.hp<=0)return null;
  const have=(t.inj||[]).map(i=>i.k);
  if(have.length>=3)return null;
  const def=force?Rebel.INJK[force]:Rebel.injRoll(src||'ballistic',rng,have);
  if(!def||have.includes(def.k))return null;
  (t.inj=t.inj||[]).push(def.k==='concussion'?{k:def.k,treated:false,stunTo:round+1}:{k:def.k,treated:false});
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
/* a specialty, their own or one they were cross-trained in (Instructor, Cross-Training) */
const hasSp=(u,k)=>!!u&&!!k&&(u.spec===k||u.spec2===k);
const medic=u=>!!u&&hasSp(u,'medic');
const treatReach=h=>medic(h)?TREAT_R*1.5:TREAT_R;
function treatCands(h){
  if(!h||h.down||stunned(h)||h.extracted||h.away)return [];
  const rank=x=>(x.down?0:stunned(x)?1:injOf(x,'bleeding')?2:3);
  const reach=treatReach(h);
  const ok=x=>x.side==='reb'&&!x.auto&&!x.mnt&&!x.dead&&(hasInj(x)||x.down)&&!x.extracted&&!x.away&&(x===h?true:dist(h,x)<=reach);
  return U.filter(ok).sort((a,b)=>rank(a)-rank(b)||dist(h,a)-dist(h,b));
}
const treatTarget=h=>treatCands(h)[0]||null;
/* who this medic will treat: the one picked while planning (o.tid) while they still need it, else the most urgent */
function treatPick(h,tid){
  if(!h||!(h.meds>0))return null;
  const cs=treatCands(h);
  return (tid&&cs.find(x=>x.id===tid))||cs[0]||null;
}
function doTreat(h){
  const t=treatPick(h,h&&h.order&&h.order.type==='treat'?h.order.tid:null);
  if(!t){
    if(h&&h.order&&h.order.type==='treat'){addFloater(h.x,h.y-44,h.meds>0?'NOBODY TO TREAT':'NO MED PACK',C.text3);log(nameSpan(h)+' <span class="d">has nobody within reach to treat.</span>');}
    return;
  }
  jfx.push({k:'ring',x:t.x,y:t.y-20,t0:clock(),dur:800,col:C.go,r:54});   // a green pulse on the patient: it worked
  if(t!==h)addFloater(h.x,h.y-44,'MED PACK \u2212'+(medic(h)?'1 (\u00d72)':'1'),C.text2);
  const sev=['spinal','maimed','concussion','bleeding','internal','brokenleg','brokenarm','burns','shrapnel','eye','eardrum','facial'];
  const wasIncap=!!t.down||stunned(t);
  h.meds--;h.packsUsed=(h.packsUsed||0)+1;
  if(t.down&&!t.downInj){   // brought round: back on their feet at a quarter health
    t.down=0;t.bleedOut=0;t.hp=Math.max(1,Math.round(t.maxhp*0.25));t.order=null;
    addFloater(t.x,t.y-64,'REVIVED',C.go);
    log(nameSpan(h)+' <span class="g">brings '+nameSpan(t)+' round</span> <span class="d">\u2014 back up at a quarter health</span>.');
    h.treats=(h.treats||0)+1;h.xpGain=(h.xpGain||0)+0.08;
  }
  for(let n=medic(h)?2:1;n>0;n--){
    const rk=i=>i.k==='concussion'&&i.shook?sev.length:sev.indexOf(i.k);   // a stun already shaken off can wait
    const inj=(t.inj||[]).filter(i=>!i.treated).sort((a,b)=>rk(a)-rk(b))[0];
    if(!inj)break;
    inj.treated=true;
    if(inj.k==='internal'&&t.maxhp0){t.maxhp=t.maxhp0;}
    if((inj.k==='spinal'||inj.k==='maimed')&&t.down&&t.downInj){
      t.down=0;t.downInj=0;t.bleedOut=0;t.hp=Math.max(t.hpSave||1,Math.round(t.maxhp*0.25));t.order=null;
    }
    t.wound=hasInj(t)?1:0;
    h.treats=(h.treats||0)+1;h.xpGain=(h.xpGain||0)+0.06;
    addFloater(t.x,t.y-52,'TREATED',C.go);
    log(nameSpan(h)+' <span class="g">treats '+(t===h?'their own':nameSpan(t)+'’s')+' '+Rebel.INJK[inj.k].n.toLowerCase()+'</span> <span class="d">— '+Rebel.INJK[inj.k].treat+'</span>');
  }
  if(wasIncap&&t!==h){h.rescued=h.rescued||[];const id=t.pid||t.id;if(h.rescued.indexOf(id)<0)h.rescued.push(id);}
  checkDefeat();   // that may have been the last Med Pack
}
function wpnsOf(s){
  if(s.manning)return ['razorrat'];
  if(s.veh)return [];
  if(s.mnt){const st=seatOf(s);return st&&st.wkey?[st.wkey]:[];}
  if(s.oneHand||injOf(s,'brokenarm')){const w=s.wpns.filter(x=>ONE_HAND.indexOf(x)>=0);return w.length?w:['unarmed'];}
  return s.wpns;
}
function validShot(s,t,wkey){
  if(t.side==='civ'||s.veh)return false;
  if(t.veh&&(crewIn(t).length?t.owner===s.side:s.side!=='reb'))return false;   // an empty vehicle: only the player shoots it, to blow it up (C-7)
  if(t.mnt&&enclosed(t))return false;                              // shoot the vehicle, not the people inside
  if(stunned(s))return false;
  if(s.office||t.office)return false;
  if(!wpnsOf(s).includes(wkey))return false;
  if(wkey==='akli'&&s.jam)return false;
  if(t.down||t.surr||t.extracted||t.away)return false;
  if(dist(s,t)>WPN[wkey].rng)return false;
  if(losBlocked(s,t))return false;
  return true;
}
function computeTN(s,t){
  const e=[];let v=t.def;
  e.push(['TARGET PROFILE',t.def,true]);
  const d=dist(s,t),w=WPN[s.wkey||wpnsOf(s)[0]];
  if(d>w.rng*0.7){v+=3;e.push(['LONG RANGE',3]);}
  else if(d>w.rng*0.4){v+=2;e.push(['RANGE',2]);}
  if(t.sprinted){v+=2;e.push(['SPRINTING',2]);}
  const cov=t.obj?null:coverOf(s,t);
  if(cov){
    v+=cov.v;e.push([cov.lab,cov.v]);
    if(t.bunkered){v+=TAKE_COVER;e.push(['TAKING COVER',TAKE_COVER]);}
  }
  if(t.manning&&sandbagged(s,t)){v+=SANDBAG_COVER;e.push(['SANDBAGS',SANDBAG_COVER]);}
  if(t.mnt){v+=HATCH_COVER;e.push(['VEHICLE HATCH',HATCH_COVER]);}
  if(coolStateG(t)==='cool'){v+=1;e.push(['TARGET COOL',1]);}
  if(coolStateG(t)==='panic'){v-=2;e.push(['TARGET PANICKING',-2]);}
  if(t.wound){v-=1;e.push([t.veh?'HULL DAMAGED':'TARGET WOUNDED',-1]);}
  if(t.frail){v-=1;e.push(['UNTRAINED',-1]);}
  if(hasT(t,'weak')){v+=2;e.push(['SCRAWNY',2]);}   // a small target (Rebels & Recruits doc: Scrawny)
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
  const md=modeOf(s,wkey);
  if(md==='auto'){const ap=autoPen(s,wkey);v+=ap;e.push([ap===AUTO_PEN?'AUTOMATIC':'AUTOMATIC (DEPLOYED)',ap]);}
  else if(md==='fan'){v+=FAN_PEN;e.push(['FAN HAMMER',FAN_PEN]);}
  else if(md==='semi'&&t&&s.semiT===t.id&&s.semiN>0){v+=s.semiN;e.push(['SEMI-AUTO',s.semiN]);}
  if(w.steady&&!snap&&(s.braced||(t&&s.steadyT===t.id))){v+=STEADY_BONUS;e.push(['STEADY',STEADY_BONUS]);}
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
/* ---------- fire modes and weapon traits (Gear doc; DESIGN_BLOCKERS M-27) ----------
   Automatic: -5 to hit (-2 from a deployed Razorrat), and a hit rolls straight away for a second one at -10. Semi-auto: +1 for every round in a
   row spent on the same target, until the shooter moves or panics. Single shot: nothing. Fan hammer: -5 to hit,
   double damage. A weapon starts on its first mode with no penalty (Items.defaultMode); the AI never switches.
   Steady: +2 when braced (Hold) or on a target held fire on with the Hold fire button; holding is Steady's alone. */
const AUTO_PEN=-5,AUTO_DEPLOYED=-2,AUTO_AGAIN=-10,FAN_PEN=-5,STEADY_BONUS=2,KNOCK_DIST=60;
/* a Razorrat fired from its tripod (a field deployment or the pad's emplacement) keeps Automatic at -2, not -5 */
const autoPen=(s,wkey)=>s&&s.manning&&wkey==='razorrat'?AUTO_DEPLOYED:AUTO_PEN;
const modesOf=wkey=>(WPN[wkey]&&WPN[wkey].modes)||[];
function modeOf(s,wkey){
  const m=modesOf(wkey);if(!m.length)return null;
  const pick=s&&s.fmode&&s.fmode[wkey];
  return m.includes(pick)?pick:Items.defaultMode(wkey);
}
function setMode(s,wkey,m){if(modesOf(wkey).includes(m))(s.fmode=s.fmode||{})[wkey]=m;}
function resetChain(u){u.semiT=null;u.semiN=0;u.steadyT=null;}
/* after a shot lands or misses: the semi-auto chain, Steady spent, the automatic follow-up, Knockback */
function afterShot(s,t,wkey,hit,tn,atk){
  const md=modeOf(s,wkey),w=WPN[wkey]||{};
  if(md==='semi'){if(s.semiT===t.id)s.semiN=(s.semiN||0)+1;else{s.semiT=t.id;s.semiN=1;}}
  else resetChain(s);
  if(s.steadyT===t.id)s.steadyT=null;
  if(!hit||t.obj)return;
  if(md==='auto'&&!t.down&&!t.surr){
    const need=needFor(tn.total,atk.total-autoPen(s,wkey)+AUTO_AGAIN),roll=rint(1,20);
    if(roll>=need){
      const dmg=rollDamage(s,t,wkey,false);
      log(nameSpan(s)+' <span class="a">keeps the trigger down</span> and hits again — <b>'+dmg+'</b> <span class="d">(rolled '+roll+', needed '+need+')</span>.');
      addFloater(t.x,t.y-62,'AUTO',C.gold);
      woundUnit(s,t,dmg,false,WDAM[wkey],wkey);
    } else log(nameSpan(s)+'’s second burst goes wide <span class="d">(rolled '+roll+', needed '+need+')</span>.');
  }
  if(w.knock&&!t.down&&!t.veh&&!t.mnt&&!t.manning&&!t.big)knockBack(s,t);
}
function knockBack(s,t){
  const a=Math.atan2(t.y-s.y,t.x-s.x),d=moveDest(t,t.x+Math.cos(a)*KNOCK_DIST,t.y+Math.sin(a)*KNOCK_DIST,KNOCK_DIST);
  if(d){t.x=d.x;t.y=d.y;unstick(t);}
  t._knockT=clock();t.bunkered=0;t.braced=0;t.rtPath=null;
  addFloater(t.x,t.y-56,'KNOCKED BACK',C.hazard);
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
  if(s&&modeOf(s,wkey)==='fan')d*=2;   // fan hammer: double damage on a hit
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
    woundQuiet=true;try{woundUnit(s,t,dmg,crit,WDAM[wkey],wkey);}finally{woundQuiet=false;}
  } else if(tn.cover&&tn.cover.prop){
    chipCover(tn.cover.prop,Math.round(rollDamage(s,t,wkey,false)*0.7));
  }
  if(!jammed)afterShot(s,t,wkey,hit,tn,atk);
  return {tn,atk,need,roll,hit,crit,dmg,jammed};
}
/* ---------- armour and shields (Ground Combat doc) ----------
   A hit drains the shield bar first, then the armour bar, then health. Sundering weapons tear armour faster
   (armour_sunder_mult); Piercing ones send a share of each hit past the armour (armour_pierce_frac). Whatever a
   broken bar cannot hold spills on to the next. There are no arcs on the ground. */
const SUNDER=SRDB.rules.armour_sunder_mult||1,PIERCE=SRDB.rules.armour_pierce_frac||0;
function soak(t,dmg,wkey){
  const w=wkey&&WPN[wkey];
  let rem=dmg,sd=0,ad=0,pass=0;
  if(t.shd>0&&rem>0){sd=Math.min(t.shd,rem);t.shd-=sd;rem-=sd;}
  if(t.arm>0&&rem>0){
    const mult=w&&w.sunder?SUNDER:1;
    pass=w&&w.pierce?Math.round(rem*PIERCE):0;
    const want=(rem-pass)*mult;
    ad=Math.min(t.arm,Math.round(want));
    t.arm-=ad;
    rem=pass+Math.round(Math.max(0,want-ad)/mult);
  }
  return {sd,ad,hd:Math.max(0,rem),pass};
}
/* raising a shield fills its bar; enemies raise theirs when the alarm goes up, rebels with the Shield order */
function raiseShield(u){
  if(!u||!u.maxShd||u.down||u.shd>=u.maxShd)return false;
  u.shd=u.maxShd;u.shdUp=1;
  addFloater(u.x,u.y-48,'SHIELD UP',C.shield);
  log(nameSpan(u)+' <span class="g">raises a shield</span> <span class="d">('+u.maxShd+')</span>.');
  return true;
}
function woundUnit(s,t,dmg,crit,dsrc,wkey){
  if(s&&s.side==='reb')s.xpGain=(s.xpGain||0)+0.04;
  sk(s,'aim',1);
  const sk0=t._soak={riot:0,sd:0,ad:0,hd:0};   // what took the hit, for the volley's per-round impacts
  const quiet=woundQuiet,hy0=t.y-30*actorScale(t);
  hitPose(t);
  if(!quiet&&dmg>0)juice(crit?'crit':'hit',t.x,hy0,{k:0.6});
  if(s&&t.shield&&t.shieldHp>0&&shieldBlocks(s,t)){   // a riot shield takes a hit from the front until it breaks (Gear doc)
    const take=Math.min(t.shieldHp,dmg);
    t.shieldHp-=take;dmg-=take;sk0.riot=take;
    if(!quiet)addPop(t.x,t.y-50,'-'+take,C.shield);
    if(t.shieldHp<=0){t.shield=0;t.shieldBroke=1;juice('shieldBreak',t.x,hy0,{y0:t.y});addFloater(t.x,t.y-64,'SHIELD BROKEN',C.hazard);log(nameSpan(t)+'’s <b>riot shield</b> shatters.');}
    if(dmg<=0){dmgRound.add(t.id);adjCoolG(t,-6,'took a hit');return;}
  }
  if(t.tr&&t.tr.length&&hasT(t,'cautious'))dmg=Math.max(1,Math.round(dmg*0.9));
  if(t.shd>0||t.arm>0){
    const sk2=soak(t,dmg,wkey),now=clock(),hy=hy0;
    sk0.sd=sk2.sd;sk0.ad=sk2.ad;
    if(sk2.sd){t._shHitT=now;hitFx.push({k:'shield',x:t.x,y:hy,t0:now,dur:420});}
    if(sk2.ad&&WPN[wkey]&&WPN[wkey].sunder)hitFx.push({k:'sunder',x:t.x,y:hy,t0:now,dur:520});
    else if(sk2.ad&&!quiet)impFx.push({x:t.x,y:hy,t0:now,dur:420,o:{surface:'armour',dir:s?Math.atan2(t.y-s.y,t.x-s.x):0,seed:rint(1,999)}});
    if(sk2.ad&&!quiet)juice('armourHit',t.x,hy,{k:0.6,noStop:true});
    if(sk2.pass&&s)hitFx.push({k:'pierce',x0:s.x,y0:s.y-26,x:t.x,y:hy,t0:now,dur:380});
    if(sk2.sd&&!quiet)addPop(t.x+14,t.y-50,'-'+sk2.sd,C.shield);
    if(sk2.ad&&!quiet)addPop(t.x-14,t.y-50,'-'+sk2.ad,C.steel);
    if(sk2.ad&&!t.arm)log(nameSpan(t)+(t.veh?'’s armour plating gives way.':'’s armour is spent.'));
    if(sk2.sd&&!t.shd){log(nameSpan(t)+'’s shield collapses.');juice('shieldBreak',t.x,hy,{y0:t.y});}
    dmg=sk2.hd;
    if(dmg<=0){                     // the bars took all of it: no wound, no critical injury
      dmgRound.add(t.id);
      adjCoolG(t,-8,'took a hit');
      return;
    }
  }
  // a rebel already down dies to any more harm (the doc: unconscious and hit again)
  if(t.down&&!t.dead){if(canDie(t))killUnit(t,s,'while down');return;}
  const fromFull=t.hp>=t.maxhp;   // one-shot: their whole health gone to a single hit
  if(t.tr&&t.tr.length){
    if(t.hp-dmg<=0&&((hasT(t,'lucky')&&rng()<0.05)||(hasT(t,'luckyesc')&&rng()<0.03))){t.luckySaved=1;dmg=Math.max(0,t.hp-1);addFloater(t.x,t.y-64,'LUCKY',C.go);log(nameSpan(t)+' <span class="g">shrugs off a killing blow</span> <span class="d">(lucky)</span>.');}
    if(crit&&hasT(t,'selfpres')&&rng()<0.6)crit=false;
    if(hasT(t,'shortfuse'))t.fuse=2;
  }
  if(t.side==='reb'&&!t.vip&&!t.auto&&!t.veh&&SUP().ironcon&&!t.ironUsed&&t.hp-dmg<=0&&t.hp>1){   // Iron Constitution (Physio)
    t.ironUsed=1;dmg=t.hp-1;addFloater(t.x,t.y-64,'IRON',C.go);log(nameSpan(t)+' <span class="g">shrugs off a hit that should have dropped them.</span>');
  }
  t.hp-=dmg;sk0.hd=dmg;
  if(t.side==='reb')t.minHp=Math.min(t.minHp===undefined?1:t.minHp,Math.max(0,t.hp)/t.maxhp);
  sk(t,'con',dmg/10);
  dmgRound.add(t.id);
  adjCoolG(t,-16,'took a hit');
  if(crit&&t.hp>0){
    if(t.side==='reb'&&!t.auto&&!t.vip)inflictInjury(t,dsrc);
    else if(!t.wound&&t.veh){t.wound=1;addFloater(t.x,t.y-52,'DRIVE DAMAGED',C.hazard);log('The <b>'+t.name+'</b> is limping <span class="d">— a quarter off its speed</span>.');}
    else if(!t.wound){t.wound=1;t.aim=Math.max(0,t.aim-1);addFloater(t.x,t.y-52,'WOUNDED',C.hazard);}
  }
  if(!quiet)addPop(t.x,t.y-38,'-'+dmg,t.side==='reb'?C.hazard:C.goldHi,{crit});
  if(!quiet&&!machine(t)&&goreOn()&&(Math.random()<0.5||dmg>20))bleed(t,null,dmg);
  if(t.hp<=0){
    // the Hegemony's people die; a rebel dies to a critical hit that drops them, or a single hit from full health,
    // and otherwise goes down unconscious, for a Treat Wound to bring back (DESIGN_BLOCKERS C-29)
    if(t.side==='law'||(canDie(t)&&(crit||fromFull)))killUnit(t,s,crit?'crit':fromFull?'oneshot':'');
    else downUnit(t,s);
  }
}
/* who can die: every enemy; rebels, the VIP, Autos and hacked allies too, except in Take the Rock */
const canDie=t=>!t.veh&&!t.dead&&(t.side==='law'||(t.side==='reb'&&SCN.mode!=='haven'));
function killUnit(t,by,how){
  const was=t.down;
  if(!was)downUnit(t,by,true);
  t.dead=1;t.down=1;t.hp=0;t.downInj=0;t.order=null;
  if(was){
    if(t.side==='reb')for(const m of U)if(m.side==='reb'&&m!==t&&!m.down)adjCoolG(m,-20,t.first+' killed');
    log(nameSpan(t)+' <span class="b">is dead</span>'+(how==='bleed'?' \u2014 bled out where they lay':by?' \u2014 '+nameSpan(by)+' finished them':'')+'.');
    addPop(t.x,t.y-60,t.side==='reb'?'KILLED':'DEAD',C.hazard,{size:20});
  }
  if(t.side==='reb'&&!t.ally){const mate=U.find(u=>u.side==='reb'&&!u.down&&!u.extracted&&u.id!==t.id);if(mate)say(mate,'No! '+t.first+'\u2019s dead!');}
  checkDefeat();
}
function downUnit(t,by,dead){
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
  if(t.manning){t.manning=0;turret.gunner=null;log('The <b>Razorrat</b> stands unmanned.');}
  sThud();
  t._downT=clock();juice('down',t.x,t.y);
  log(nameSpan(t)+' <span class="b">'+(dead?(t.side==='reb'?'is killed':'is dead'):'is down')+'</span>'+(by?' — '+nameSpan(by)+'’s shot':'')+'.');
  addPop(t.x,t.y-60,dead?(t.side==='reb'?'KILLED':'DEAD'):'DOWN',C.hazard,{size:20});
  if(t.side==='law'){
    dropLoot(t);
    if(t.sheriff){
      log('<span class="a">The Sheriff is down.</span> Watch the deputies’ nerve.');
      const dep=U.find(u=>u.side==='law'&&!u.down&&!u.surr&&!u.sheriff);
      if(dep)say(dep,'Sheriff’s down… Sheriff’s DOWN!');
    }
  } else if(!dead){
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
  const items=(t.kit||[]).filter(id=>{const r=Items.get(id);return r&&r.category!=='builtin'&&r.live&&!(id==='riotshield'&&t.shieldBroke)&&Math.random()<DROP_CHANCE;});
  const c=t.cr?rint(t.cr[0],t.cr[1]):0;
  if(!items.length&&!c)return;
  const what=items.map(Items.name);
  if(c)what.push(c+' ◈');
  lootMarks.push({id:'drop_'+t.id,x:t.x+10,y:t.y+10,label:t.name+'’s effects',drop:1,c,items,take:what.join(' + ')});
}

/* ---------- morale, alert, spotting ---------- */
function alertTown(why){
  if(town==='alerted')return;
  town='alerted';alertFlash=clock();
  if(fac&&!fac.detonated)fac.everAlerted=true;
  if(rs)rs.everAlerted=true;
  sAlert();
  log('<span class="b">The town is up.</span> '+why);
  const caller=U.find(u=>u.side==='law'&&!u.down&&!u.surr);
  if(caller&&caller.lines)say(caller,caller.pooled?caller.lines[rint(0,caller.lines.length-1)]:caller.lines[caller.lines.length-1]);
  const reeve=U.find(u=>u.id==='reeve');
  if(reeve&&!reeve.down)setTimeout(()=>sayRandom(reeve),1400);
  for(const u of U)if(u.side==='law'&&u.maxShd&&!u.down&&!u.surr)raiseShield(u);   // shields go up with the alarm
  // townsfolk scatter or hit the dirt
  for(const c of U){
    if(c.side!=='civ'||c.extracted)continue;
    if(rng()<0.5){
      c.fleeing=1;
      const ex=c.x<W/2?30:W-30;
      setRt(c,ex,Math.max(60,Math.min(H-60,c.y+rint(-160,160))),FLEE_SPEED);
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
  engageQ={list:shooters,idx:0,cur:null,nextAt:clock()+300,forceT:t};
  log('<span class="a">'+(shooters.length>1?'The squad ambushed the enemy.':nameSpan(shooters[0])+' opens fire from ambush.')+'</span>');
  alertTown('');
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
      alertTown(nameSpan(r.seer)+' saw '+nameSpan(r)+'.');
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
  // a muzzle flash gives the shooter away: they stay marked through the next round, so the squad can answer
  if(engageQ&&engageQ.cur&&engageQ.cur.s&&engageQ.cur.s.side==='law')engageQ.cur.s.flashR=round+1;
  for(const t of U)if(t.flashR>=round&&!t.dead)visUnits.add(t.id);
}
/* what the base sent with the mission (base.js supportStart; the Support Specialties doc) */
const SUP=()=>(CTX&&CTX.sup)||{};
let scanRound=null;   // Overwatch (Tactician): every enemy shows for the round it is called
/* Map Theft (Slicer): the layout is known, so the terrain fog lifts; enemies still need to be seen */
const fogOn=()=>!!SCN&&!!SCN.fog&&!SUP().mapAll;
/* Battle Plan / Perfect Plan (Tactician): the Hegemony neither moves nor fires for the first round or two */
const lawHolds=()=>round>0&&round<=(SUP().free||0);
function unitSeen(u){
  if(!SCN||!SCN.fog||phase==='CUTSCENE')return true;
  if(scanRound!==null&&scanRound===round)return true;
  return u.side==='reb'||(u.veh&&u.owner==='reb')||visUnits.has(u.id);
}
function drawFog(){
  if(!fogOn()||phase==='CUTSCENE'||!fogCtx)return;
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
  log(sneak?'<span class="d">Squad in stealth.</span>':
            '<span class="d">Squad out of stealth</span>');
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
    log('<span class="g">The '+v.name+'’s crew bail out.</span>');
  }
}
function alliesUp(side){return U.filter(u=>u.side===side&&!u.down&&!u.surr).length;}
function hostilesActive(){return U.filter(u=>u.side==='law'&&!u.down&&!u.surr);}

/* ---------- law AI ---------- */
function coverPoints(){   // the building corners: cover from anyone round the corner (pickCoverMove adds the props)
  const out=[];
  for(const b of BLDGS)for(const [x,y] of [[b.x-18,b.y-18],[b.x+b.w+18,b.y-18],[b.x-18,b.y+b.h+18],[b.x+b.w+18,b.y+b.h+18]])
    if(x>20&&x<W-20&&y>20&&y<H-20&&!ptBlocked(x,y,12))out.push({x,y});
  return out;
}
const COVER_PTS=[];
function aiPlan(){
  let turretClaimed=false;
  aiClaims=U.filter(o=>o.side==='law'&&!o.down&&!o.surr).map(o=>({u:o,x:o.x,y:o.y}));   // where everyone stands now
  for(const v of U)if(v.veh){v.order=null;v.sprinted=0;v.owUsed=0;}
  for(const u of U){
    if(u.veh)continue;
    if((u.side!=='law'&&!u.ally)||u.down||u.surr||u.office)continue;
    u.order=null;u.sprinted=0;u.owUsed=0;u.goingTurret=0;u.wkey=wpnsOf(u)[0];u.bunkered=0;
    if(!u.manning)u.braced=0;
    if(u.side==='law'&&lawHolds())continue;   // a free round for a supported squad
    // the transport's squad gets out once the alarm is up, then plans like anyone else on foot
    if(u.mnt&&town==='alerted'&&!lookout(u)){const v=vehOf(u);if(v&&!v.deployed)deployUnits(v);}
    if(u.mnt){aiCrew(u);continue;}
    if(coolStateG(u)==='panic'&&town==='alerted'){u.order={type:'lockin'};continue;}
    if(u.manning){u.order={type:'hold'};u.braced=1;continue;}
    if(u.fixed){u.order=u.elev?null:{type:'hold'};u.braced=u.elev?0:1;continue;}   // a tower guard no longer holds a braced, Steady aim every round
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
    const targets=u.ally?U.filter(r=>r.side==='law'&&!r.down&&!r.surr&&!r.office):U.filter(r=>r.side==='reb'&&!r.down&&!r.extracted&&!r.away);
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
/* where to move: a spot that puts cover between them and their target (behind a prop, as the target sees it, or round
   a building's corner), within reach and in range. They keep their distance from the other side (nobody walks up to
   share a crate with the enemy) and spread out from their own (two of them do not claim the same spot). */
let aiClaims=[];
const AI_NOSE=140;   // closer than this to anyone on the other side scores badly
function pickCoverMove(u,tgt,r,toward){
  let best=null,bs=-1e9;
  const foes=U.filter(o=>(u.side==='law'?o.side==='reb':o.side==='law')&&!o.veh&&!o.down&&!o.surr&&!o.extracted&&!o.away&&!o.office);
  const cand=[];
  for(const p of PROPS){   // behind each prop in reach, from where the target stands (and a little either side)
    const def=PROPDEF[p.kind];
    if(p.dead||def.cov<=0||Math.hypot(p.x-u.x,p.y-u.y)>r+def.r+HUG)continue;
    const a=Math.atan2(p.y-tgt.y,p.x-tgt.x);
    for(const da of [0,-0.45,0.45])cand.push({x:p.x+Math.cos(a+da)*(def.r+16),y:p.y+Math.sin(a+da)*(def.r+16),prop:p});
  }
  cand.push(...COVER_PTS);   // building corners
  for(let i=0;i<8;i++){
    const a=rng()*Math.PI*2;
    cand.push({x:u.x+Math.cos(a)*r*0.8,y:u.y+Math.sin(a)*r*0.8});
  }
  const wkey=wpnsOf(u)[0],w=WPN[wkey]||WPN[u.wpns[0]];
  for(const c of cand){
    if(Math.hypot(c.x-u.x,c.y-u.y)>r)continue;
    if(c.x<20||c.x>W-20||c.y<20||c.y>H-20||ptBlocked(c.x,c.y,12))continue;
    if(!pathFor(u,c.x,c.y))continue;
    const dNow=dist(u,tgt),dNew=Math.hypot(c.x-tgt.x,c.y-tgt.y);
    let s=toward?(dNow-dNew):(dNew-dNow);
    const cv=coverOf(tgt,{x:c.x,y:c.y});
    if(cv)s+=60+cv.v*4;
    for(const o of foes){
      if(o===tgt)continue;
      if(dist(o,c)<(w?w.rng:400)&&!segBlocked(o.x,o.y,c.x,c.y))s+=coverOf(o,{x:c.x,y:c.y})?12:-12;   // covered or flanked by the rest
    }
    for(const g of nades)if(Math.hypot(c.x-g.x,c.y-g.y)<NADE_BLAST+24)s-=170; // nobody stands on a live grenade twice
    if(w&&dNew<w.rng*0.9&&!segBlocked(c.x,c.y,tgt.x,tgt.y))s+=70;
    for(const o of foes){
      const d=Math.hypot(c.x-o.x,c.y-o.y);
      if(d<AI_NOSE)s-=160*(1-d/AI_NOSE)+40;   // don't walk up to the enemy
      if(c.prop&&Math.hypot(o.x-c.prop.x,o.y-c.prop.y)<PROPDEF[c.prop.kind].r+HUG)s-=150;   // nor share their cover with them
    }
    for(const q of aiClaims){if(q.u===u)continue;const d=Math.hypot(c.x-q.x,c.y-q.y);if(d<44)s-=220;else if(d<80)s-=60;}   // spread out
    if(s>bs){bs=s;best=c;}
  }
  if(best)aiClaims.push({u,x:best.x,y:best.y});
  return best;
}

/* ---------- free move (real time, out of combat) ---------- */
function combatActive(){return town==='alerted'&&hostilesActive().length>0;}
/* contact: a hostile on their feet who can see a rebel, or a rebel who can see them. After every round the game asks
   whether the fight is still on: QUIET_ROUNDS rounds in a row with no shot fired, nobody hit, no grenade waiting and
   nobody in sight of the other side, and time runs free again (the alarm stays up, so no sneaking). In free time, the
   moment either side sees the other, it drops back into rounds. A rebel bleeding out keeps the clock in rounds. */
const QUIET_ROUNDS=2;
function inContact(){
  const foes=hostilesActive().filter(l=>!l.office&&!l.away&&!l.extracted&&!l.caged);
  const rebs=U.filter(r=>r.side==='reb'&&!r.down&&!r.extracted&&!r.away&&!r.csHide);
  for(const l of foes)for(const r of rebs){
    const d=dist(l,r);
    if((d<sightRange(l)||d<VIEW_R*viewMul(r))&&!losBlocked(l,r))return true;
  }
  return false;
}
const bleedingOut=()=>U.some(u=>u.side==='reb'&&u.down&&!u.dead&&!u.extracted&&injOf(u,'bleeding'));
/* end of a round with the enemy still about: is this still a fight? */
function stillFighting(hot){
  if(hot||nades.length||inContact()||bleedingOut()){quietRounds=0;return true;}
  quietRounds++;
  if(quietRounds>=QUIET_ROUNDS){quietRounds=0;return false;}
  log('<span class="d">No contact this round.</span> '+(QUIET_ROUNDS-quietRounds>1?'A few':'One')+' more quiet round'+(QUIET_ROUNDS-quietRounds>1?'s':'')+' and time runs free.');
  return true;
}
/* free time with the alarm up: someone comes into view, and it is rounds again */
function contactCheck(){
  if(town!=='alerted'||!hostilesActive().length||!inContact())return false;
  haltSquad();
  log('<span class="b">Contact!</span> <span class="a">Time drops into rounds — plan every rebel’s move.</span>');
  sAlert();
  startPlanning();
  return true;
}
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
  rtPing={x:pt.x,y:pt.y,t0:clock()};
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
  juice('loot',m.x,m.y,{item:(m.items||[]).find(k=>SA.ITEMS&&SA.ITEMS[k])});   // the item pops out of the crate
  log(nameSpan(u)+' loots the <b>'+m.label+'</b> — <span class="g">'+m.take+'</span>.');
  syncUI();
}
function enterFree(msg){
  phase='FREE';
  selId=null;pickMode=null;engageQ=null;hotT=0;
  for(const g of nades.splice(0)){
    log('<span class="a">A grenade went off.</span>');
    explode(g.x,g.y,{r:NADE_BLAST,d0:32,d1:52});
  }
  for(const u of U){
    u.bunkered=0;
    u.cool=Math.max(u.cool,u.cool0);
    for(const i of u.inj||[])if(i.k==='concussion')i.shook=1;   // time runs free: the stun has worn off
    if(u.manning){u.braced=1;u.order={type:'hold'};u.path=null;u.rtPath=null;continue;}
    u.order=null;u.braced=0;u.sprinted=0;u.path=null;u.rtPath=null;
  }
  if(msg)log(msg);
  if(!freeHinted){
    freeHinted=true;
    log('<span class="d">'+(SR.touch?'Tap the ground':'Right-click (or tap the ground)')+' and the squad follows.</span>');
  }
  saveSnap();
  syncUI();
}
function manTurret(u){
  turret.gunner=u.id;u.manning=1;u.goingTurret=0;
  u.x=TURRET.x;u.y=TURRET.y;u.rtPath=null;u.path=null;
  u.braced=1;u.order={type:'hold'};u.face=turret.face;
  log(nameSpan(u)+' gets behind the <b>Razorrat</b>.');
  addFloater(TURRET.x,TURRET.y-42,'GUN MANNED',C.shield);
  sTick();syncUI();
}
function unmanTurret(u){
  turret.gunner=null;u.manning=0;u.braced=0;u.order=null;u.wkey=null;resetChain(u);   // back to their own weapons
  let ox=TURRET.x+Math.cos(turret.face+Math.PI)*44,oy=TURRET.y+Math.sin(turret.face+Math.PI)*44;
  const d=moveDest(u,ox,oy,60);
  if(d){u.x=d.x;u.y=d.y;}
  log(nameSpan(u)+' leaves the gun.');
  syncUI();
}
/* Pack up gun: a Razorrat set up in the field (not the pad's sandbagged one) folds back onto the back of whoever packs it:
   its gunner, or a rebel beside it with nothing on their back */
function canPack(u){
  if(!u||!turretOn()||!TURRET.field||u.back||u.mnt||u.bot||u.auto||u.down||u.surr||stunned(u))return false;
  if(u.manning)return true;
  return !turret.gunner&&dist(u,TURRET)<60;
}
function packTurret(u){
  if(!canPack(u))return false;
  if(u.manning){turret.gunner=null;u.manning=0;u.braced=0;}
  u.order=null;u.wkey=null;resetChain(u);
  u.back='razorrat';u.deployed=null;u._deployT=clock();
  TURRET={x:-99999,y:-99999,r:26};turret={gunner:null,face:Math.PI};
  addFloater(u.x,u.y-42,'GUN PACKED',C.shield);
  log(nameSpan(u)+' packs up the <b>Razorrat LMG</b> and slings it on their back.');
  sTick();syncUI();
  return true;
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
    addFloater(wp.x,wp.y-60,mtx(SCN.mt.float.secured),C.go);
    log(mtx(SCN.mt.log.hacked,{hacker:u.first}));
    say(u,mtx(SCN.mt.say.hacked));
    sSpark();
    if(SCN.alarmWave)spawnFoes(SCN.alarmWave.foes,SCN.alarmWave.log);
    if(town==='calm')alertTown(mtx(SCN.mt.alarm.hacked));
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
      addFloater(wp.x,wp.y-46,(SCN.releaseText?SCN.releaseText.float:mtx(SCN.mt.float.free).toUpperCase()),C.go);
      log(SCN.releaseText?'<span class="g">'+SCN.releaseText.log+'</span>':mtx(SCN.mt.log.free));
      say(v,v.lines[0]);
    }
    syncUI();
    return;
  }
  if(wp.id==='plant'&&SCN.mode==='towers'){
    const method=u.device||'charge';
    u.charge=0;u.device=null;fac.planted=true;fac.method=method;fac.quiet=!fac.everAlerted;
    fac.detonated=true;fac.fx={t0:clock()};
    const K=method==='charge'?'down':'limpet';
    addFloater(wp.x,wp.y-46,mtx(SCN.mt.float[K]),method==='charge'?C.hazard:C.shield);
    log(mtx(SCN.mt.log[K]));
    if(method==='charge')explode(wp.x,wp.y-90,{r:SCN.blastR,d0:1,d1:2});
    else sSpark();
    say(u,mtx(SCN.mt.say[K]));
    if(town==='calm'&&method==='charge')alertTown(mtx(SCN.mt.alarm.down));
    syncUI();
    return;
  }
  if(wp.id==='plant'){
    u.charge=0;fac.planted=true;
    addFloater(wp.x,wp.y-46,mtx(SCN.mt.float.set),C.hazard);
    log(mtx(SCN.mt.log.set));
    say(u,mtx(SCN.mt.say.set));
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
  if(FS.bombard===1)it.push({key:'bombard',name:'Heavy bombardment',sub:'Mission Control calls in everything it has on a spot the squad can see · once · danger close'});
  if(FS.evac===1&&U.some(u=>u.side==='reb'&&u.down&&!u.dead&&!u.extracted&&!u.away&&!u.veh))it.push({key:'evac',name:'Evac on call',sub:'tap a downed squad mate: a support pilot pulls them out · once'});
  if(FS.scan&&!FS.scanUsed)it.push({key:'scan',name:'Overwatch scan',sub:'Mission Control patches in every sensor they can reach: every enemy shows for this round · once'});
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
    it.push({key:'v'+i,name:'Deploy '+a.name,
      sub:a.kind==='bot'?'set down where you call it at the start of the next planning · takes orders like a squad member':'set down empty where you call it at the start of the next planning · someone has to get in'});
  });
  return it;
}
/* The Fire support menu, grouped by where each call comes from (the planning board's assets: the transport, any
   other ship, Mission Control, vehicles). A row: the call's icon in its colour, its name, when it lands and whether
   it's danger close, and a little footprint of how you aim it. Calls already on their way stay listed with their
   status; spent ones drop off. While sneaking, the loud calls show, locked. The full rule sits in the row's tip. */
const FS_KIND={
  drop:{ic:'supplies',c:'var(--sr-res-supplies)',fp:'drop',when:'Drops at start of next round',
    rule:'Mark a spot the squad can see. A crate drops in as the next round begins: 5 stims, 2 BLAM and 2 rockets.'},
  strafe:{ic:'firesupport',c:'var(--sr-rebel)',fp:'line',when:'Hits at round end',danger:1,
    rule:'Two taps: where the run starts, then where it ends. The ship rakes everything along that line at the end of the round, our people included.'},
  doorgun:{ic:'turret',c:'var(--sr-rebel)',fp:'ring',when:'2 passes · up to 3 targets',
    rule:'Mark a zone. The ship holds a high, wide orbit over it and the door gunner works up to 3 enemies inside it, for 2 passes. Enemy rockets can bring it down.'},
  reinforce:{ic:'people',c:'var(--sr-rebel)',fp:'land',when:'Lands at the next planning',
    rule:'Mark a landing spot. The ship sets its soldiers down at the start of the next planning.'},
  bombard:{ic:'missile',c:'var(--sr-rebel)',fp:'burst',when:'Once',danger:1,
    rule:'Mission Control calls in everything it has on a spot the squad can see. Once a mission.'},
  scan:{ic:'eye',c:'var(--sr-shield)',fp:'scan',when:'Every enemy shows this round',
    rule:'No target needed. Mission Control patches in every sensor they can reach: every enemy on the map shows for this round. Once a mission.'},
  evac:{ic:'extract',c:'var(--sr-go)',fp:'evac',when:'Once',
    rule:'Tap a downed squad mate: a support pilot sets down and pulls them out. Once a mission.'},
  vehicle:{ic:'vehicle',c:'var(--sr-fuel)',fp:'land',when:'Sets down at the next planning',
    rule:'Mark where it sets down. It arrives at the start of the next planning.'},
  bot:{ic:'vehicle',c:'var(--sr-fuel)',fp:'land',when:'Sets down at the next planning',
    rule:'Mark where it sets down. It arrives at the start of the next planning and takes orders like a squad member.'},
};
const FS_FP={   // the footprint: how the call is aimed, drawn on a 56×40 well
  drop:'<circle cx="28" cy="27" r="7" stroke-dasharray="3 3"/><path d="M28 5v14M23 14l5 5 5-5"/>',
  line:'<path d="M9 33 45 9" stroke-dasharray="4 3"/><path d="M38 9h7v7"/><circle cx="9" cy="33" r="2.5" fill="currentColor"/>',
  ring:'<circle cx="28" cy="20" r="15" stroke-dasharray="4 3"/><path d="M21 15l4 4M25 15l-4 4M31 22l4 4M35 22l-4 4"/>',
  burst:'<circle cx="28" cy="20" r="5"/><circle cx="17" cy="13" r="3.5"/><circle cx="39" cy="14" r="3.5"/><circle cx="18" cy="29" r="3.5"/><circle cx="38" cy="28" r="3.5"/>',
  scan:'<path d="M10 34a18 18 0 0 1 36 0M16 34a12 12 0 0 1 24 0M22 34a6 6 0 0 1 12 0"/><circle cx="28" cy="34" r="1.8" fill="currentColor"/>',
  land:'<rect x="17" y="22" width="22" height="13" rx="2" stroke-dasharray="3 3"/><path d="M28 4v13M23 12l5 5 5-5"/>',
  evac:'<circle cx="28" cy="30" r="4"/><path d="M28 24V6M23 11l5-5 5 5"/>',
};
function fsRows(){
  if(!FS)return [];
  const free=phase==='FREE',rows=[],tr=CTX&&CTX.transport;
  const R=(group,key,kind,name,o)=>rows.push(Object.assign({group,key,kind,name},o||{}));
  const trName=tr&&tr.name;
  if(FS.drop){
    const inbound=FS.dropUsed&&FS.orders.some(o=>o.kind==='drop'&&!o.landed);
    if(!FS.dropUsed)R(trName||'Supply','drop','drop','Supply Drop');
    else if(inbound)R(trName||'Supply','drop','drop','Supply Drop',{status:'Inbound · next round'});
  }
  FS.ships.forEach((a,i)=>{
    if(a.cassAir&&!tutFlags.fsCard)return;
    const grp=a.own?a.name:a.name,nm=a.mode==='strafe'?'Strafing Run':a.mode==='doorgun'?'Door Gunner Cover':'Reinforcements';
    const st=a.state==='ready'?null:a.state==='active'?'Overhead · '+a.left+' pass'+(a.left===1?'':'es')+' left':a.state==='called'?(a.mode==='strafe'?'Inbound · round end':'Inbound · next planning'):'gone';
    if(st==='gone')return;
    R(grp,'s'+i,a.mode==='strafe'?'strafe':a.mode==='doorgun'?'doorgun':'reinforce',nm,{status:st,pilot:a.pilot&&a.pilot.name,
      when:a.mode==='reinforce'?a.soldiers.length+' soldier'+(a.soldiers.length===1?'':'s')+' · next planning':null});
  });
  (FS.vehicles||[]).forEach((a,i)=>{
    if(a.state!=='ready'&&a.state!=='called')return;
    R('Vehicles','v'+i,a.kind==='bot'?'bot':'vehicle','Deploy '+a.name,{status:a.state==='called'?'Inbound · next planning':null});
  });
  const MC='Mission Control';
  if(FS.bombard===1)R(MC,'bombard','bombard','Heavy Bombardment');
  if(FS.scan&&!FS.scanUsed)R(MC,'scan','scan','Overwatch Scan');
  else if(FS.scan&&scanRound===round)R(MC,'scan','scan','Overwatch Scan',{status:'Live this round'});
  if(FS.evac===1&&U.some(u=>u.side==='reb'&&u.down&&!u.dead&&!u.extracted&&!u.away&&!u.veh))R(MC,'evac','evac','Evac on Call');
  for(const r of rows)if(free&&!r.status&&!FREE_FS.includes(r.key))r.locked='Too loud while the squad is sneaking. It opens up once the shooting starts.';
  return rows;
}
function fsMenuHTML(){
  const rows=fsRows(),groups=[];
  for(const r of rows){let g=groups.find(x=>x.name===r.group);if(!g)groups.push(g={name:r.group,rows:[]});g.rows.push(r);}
  const tr=CTX&&CTX.transport;
  const sub=g=>g.name==='Mission Control'?'Command Center':g.name==='Vehicles'?'Brought along':
    (tr&&g.name===tr.name)?'Your transport':(g.rows.find(r=>r.pilot)||{}).pilot||'';
  const gIc=g=>g.name==='Mission Control'?'base':g.name==='Vehicles'?'vehicle':g.name==='Supply'?'supplies':'ship';
  const row=r=>{
    const k=FS_KIND[r.kind],off=!!(r.status||r.locked);
    const meta=r.status?'<span class="fsm-status">'+HUD.esc(r.status)+'</span>':
      '<span class="fsm-when">'+HUD.esc(r.when||k.when)+'</span>'+(k.danger?'<span class="fsm-danger">'+HUD.ico('skull')+'Danger close</span>':'');
    return '<button type="button" class="fsm-row'+(off?' is-off':'')+(r.locked?' is-locked':'')+'" style="--k:'+k.c+'"'+(off?' aria-disabled="true"':' data-fs="'+r.key+'"')+
      HUD.tip(r.name,k.rule,r.locked||'')+' data-tip-right>'+
      '<span class="fsm-ic">'+HUD.ico(r.locked?'lock':k.ic)+'</span>'+
      '<span class="fsm-txt"><b>'+HUD.esc(r.name)+'</b><span class="fsm-meta">'+meta+'</span></span>'+
      '<svg class="fsm-fp" viewBox="0 0 56 40" aria-hidden="true">'+FS_FP[k.fp]+'</svg></button>';
  };
  return '<div class="sr-window__head"><span class="sr-window__title">Fire support</span></div><div class="sr-window__body fsm-body">'+
    groups.map(g=>'<section class="fsm-group"><div class="fsm-src">'+HUD.ico(gIc(g))+'<b>'+HUD.esc(g.name)+'</b>'+(sub(g)?'<span>'+HUD.esc(sub(g))+'</span>':'')+'</div>'+g.rows.map(row).join('')+'</section>').join('')+'</div>';
}
function fsSeen(pt){return U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&!u.ally&&dist(u,pt)<VIEW_R&&!segBlocked(u.x,u.y,pt.x,pt.y));}
function fsPlace(key,pt){
  if(key==='evac'){   // Evac on Call (Combat Support): a downed rebel near the tap is flown out
    const u=U.filter(x=>x.side==='reb'&&x.down&&!x.dead&&!x.extracted&&!x.away&&!x.veh).sort((a,b)=>dist(a,pt)-dist(b,pt))[0];
    if(!u||dist(u,pt)>140){addFloater(pt.x,pt.y-20,'NO ONE DOWN HERE',C.text3);return false;}
    FS.evac=2;u.extracted=1;u.order=null;
    fsFx.push({k:'landing',x:u.x,y:u.y,t0:clock(),dur:LAND_MS+500});sLand();
    addFloater(u.x,u.y-50,'EVAC',C.go);
    log('<span class="g">Evac on call:</span> a support pilot sets down beside '+nameSpan(u)+' and pulls them out.');
    return true;
  }
  if(!fsSeen(pt)){addFloater(pt.x,pt.y-20,'NO VISUAL',C.text3);return false;}
  if(key==='bombard'){   // Heavy Bombardment (Combat Support)
    FS.bombard=2;const t0=clock();
    for(let k=0;k<6;k++){const a=k*1.05,r=k?60+rng()*70:0;exploQ.push({x:pt.x+Math.cos(a)*r,y:pt.y+Math.sin(a)*r,at:t0+500+k*260,opt:{r:150,d0:50,d1:80,fs:1}});}
    log('<span class="a">Mission Control:</span> <b>heavy bombardment</b> inbound. Heads down!');
    sTakeoff();return true;
  }
  if(key==='drop'){
    if(FS.extra>0){FS.extra--;log('<span class="g">Fire Coordination:</span> Mission Control has another drop lined up after this one.');}
    else FS.dropUsed=true;
    const free=phase==='FREE';   // in free move the chute comes down a few seconds later, quietly
    FS.orders.push({kind:'drop',x:pt.x,y:pt.y,landed:false,at:free&&!SUP().rapid?clock()+4000:0});
    log('<span class="a">Supply drop called in.</span> '+(SUP().rapid?'Rapid Response: it is already on its way down.':free?'A quiet chute, down in a few seconds.':'It lands as the next round begins.'));
    if(SUP().rapid)fsExecute();
    sTick();return true;
  }
  if(key[0]==='v'){
    const va=FS.vehicles[+key.slice(1)];
    if(!va)return true;
    va.state='called';FS.orders.push({kind:'vehicle',veh:+key.slice(1),x:pt.x,y:pt.y,at:SUP().rapid?round:round+1,done:false});
    if(SUP().rapid)setTimeout(fsPlanStart,0);   // Rapid Response: down now
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
    a.state='called';FS.orders.push({kind:'reinforce',ship:i,x:pt.x,y:pt.y,at:SUP().rapid?round:round+1,done:false});
    if(SUP().rapid)setTimeout(fsPlanStart,0);
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
const FREE_FS=['drop','scan'];   // what can be called in free move (stealth): nothing that makes noise
function fsExecute(){
  if(!FS)return;
  for(const o of FS.orders){
    if(o.kind!=='drop'||o.landed||(o.at&&clock()<o.at))continue;
    o.landed=true;FS.n++;
    lootMarks.push({id:'supply'+FS.n,x:o.x,y:o.y,label:'Supply drop',take:'5 stims · 2 BLAM · 2 rockets',supply:1,taken:false});
    fsFx.push({k:'drop',x:o.x,y:o.y,t0:clock(),dur:1500});
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
const dgZone=()=>DG_ZONE*((SCN&&SCN.layoutK)||1)*(SUP().saturate?1.5:1);   // it grows with a scaled-up layout, like the rooms do; Saturation (Combat Support) widens it
const dgTN=()=>SUP().precise?6:9;   // Precision Strikes (Combat Support): the door gunner hits more often
function dgTargets(mark){
  const seen=hostilesActive().filter(t=>unitSeen(t)&&U.some(r=>r.side==='reb'&&!r.down&&!r.away&&dist(r,t)<VIEW_R&&!losBlocked(r,t)));
  if(mark)return seen.filter(t=>Math.hypot(t.x-mark.x,t.y-mark.y)<dgZone())
    .sort((a,b)=>(Math.hypot(a.x-mark.x,a.y-mark.y))-(Math.hypot(b.x-mark.x,b.y-mark.y))).slice(0,SUP().saturate?5:3);
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
/* a fire support ship has done its job: with Fire Coordination it can be called once more */
function fsSpent(a){
  if(FS&&FS.extra>0&&!a.downed){
    FS.extra--;a.state='ready';a.left=0;
    log('<span class="g">Fire Coordination:</span> Mission Control re-tasks <b>'+a.name+'</b>. One more call.');
    return;
  }
  a.state='spent';
}
function dgShotDown(a){
  a.left=0;a.state='spent';a.downed=a.own?0:1;   // the squad's own transport limps off: it still has a pickup to make
}
const ownHitLine=a=>'<span class="b">'+a.name+' takes the hit</span> and breaks off trailing smoke. '+a.pilot.first+' will still make the pickup.';
/* the transport stops working its gun when it comes down for the squad (or to the pumps) */
function ownGunDone(){if(FS)for(const a of FS.ships)if(a.own&&a.state!=='spent'){a.state='spent';a.left=0;}}
/* reduced motion only: the pass resolves instantly, no fly-by — same rolls, same counterfire */
function dgAttack(a){
  const pick=dgTargets(a.mark);
  if(!pick.length)log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> No targets at the mark.');
  else{
    const t0=clock();
    for(const t of pick){
      const hit=rint(1,20)>=dgTN();
      tracers.push({x1:t.x-260,y1:t.y-260,x2:t.x,y2:t.y,t0,dur:260,heavy:1});
      if(hit){const dmg=rint(16,28);woundUnit(null,t,dmg,false);log('The door gunner hits '+nameSpan(t)+' — <b>'+dmg+'</b>.');}
      else log('The door gunner misses '+nameSpan(t)+'.');
    }
    sShot('doorgun',{rounds:pick.map((t,i)=>({fire:i*0.07}))});
    for(const f of dgFlakers(a.mark||pick[0])){
      const hit=rint(1,20)>=DG_FLAK_TN;
      log(nameSpan(f)+' puts a rocket up at '+a.name+(hit?' — <span class="b">direct hit!</span>':' — it goes wide.'));
      if(hit){
        dgShotDown(a);
        log(a.own?ownHitLine(a):'<span class="b">'+a.name+' goes down</span> beyond the fight. '+a.pilot.first+' walks away from the wreck — the bird won’t fly again.');
        return;
      }
    }
  }
}
function dgSpend(a){
  a.left--;
  if(a.left<=0&&a.state!=='spent'){fsSpent(a);if(a.state==='ready')return;log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> Door gunner is bingo. Breaking off.');}
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
      ang:R.down.ang,alt:R.a.own?R.alt:R.alt*(1-k*k),k:-1,crash:k>=1};   // the squad's own transport holds its height and limps off
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
  roundHot=true;   // a gun run is shooting
  const mark=a.mark;
  const pick=dgTargets(mark);
  if(!mark||!pick.length){
    log('<b>'+a.pilot.first+'</b> <span class="d">('+a.name+'):</span> No targets at the mark.');
    dgSpend(a);dgNext();return;
  }
  const R={a,ax:mark.x,ay:mark.y,rad:780,squash:0.55,dir:rng()<0.5?1:-1,th0:rng()*Math.PI*2,
    IN:1100,ORBIT:3000,OUT:900,alt:235,t0:clock()+420,
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
  const hit=rint(1,20)>=dgTN();
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
  sShot('doorgun',{rounds:[0,1,2,3,4].map(i=>({fire:i*0.095}))});   // the five slugs above
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
      if(!R.a.own){boomFx.push({x:P.x,y:P.y,t0:now,dur:800,R:120});decals.push({x:P.x,y:P.y,r:70});juice('rocket',P.x,P.y);sBoomBig();}
      log(R.a.own?ownHitLine(R.a):'<span class="b">'+R.a.name+' goes in hard</span> beyond the fight. '+R.a.pilot.first+' walks away from the wreck — the bird won’t fly again.');
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
      juice('grenade',null,null,{k:0.6});
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
      SHK.add(0.15);
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
    {livery:'civ',boost:!R.down&&R.pboost,roll:bank,damage:R.down?0.85:0,loadout:{attach:['doorgun']}});
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
/* the run is drawn by SR_ART.strafe (the ship overhead and ten impacts walking up the ladder); each impact's blast
   is scheduled to land as its explosion shows, at the same spot */
const STRAFE_LEN=900,STRAFE_MS=2400;
function strafeRun(o){
  const a=FS.ships[o.ship];fsSpent(a);o.done=true;
  const t0=clock(),ca=Math.cos(o.ang),sa=Math.sin(o.ang),R0=SUP().saturate?100:70;
  for(let k=0;k<10;k++){
    const u=(k+0.5)/10,jx=Math.sin(k*7.3)*12,jy=Math.cos(k*4.1)*10;   // SR_ART.strafe's own ladder
    const x=o.x1+ca*STRAFE_LEN*u-sa*jx,y=o.y1+sa*STRAFE_LEN*u+ca*jy;
    exploQ.push({x,y,at:t0+STRAFE_MS*(u*0.8+0.06),opt:{r:R0,d0:28,d1:44,quiet:1,fs:1}});
  }
  fsFx.push({k:'strafe',x:o.x1,y:o.y1,ang:o.ang,t0,dur:STRAFE_MS+400,ship:SA.SHIP_FOR_GAME[a.cls]||(SA.SHIPS[a.cls]?a.cls:'talon')});
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
  return mkU(Object.assign({id:sp.id,pid:sp.id,name:sp.name,first:sp.first,side:'reb',x,y,hp:sp.hp||100,maxhp:sp.hp||100,aim:sp.aim||2,def:sp.def||12,cool:sp.cool||65,
    level:sp.level||1,tr:sp.tr||[],rels:sp.rels||[],ms:sp.ms||0,hero:sp.hero||0,nosprint:sp.nosprint||0,oneHand:sp.oneHand||0,cview:sp.cview||0,agi:sp.agi||1,nv:sp.nv||1,stims:sp.autoType?0:1,meds:sp.autoType?0:(sp.meds===undefined?1:sp.meds),packsUsed:0,spec:sp.spec||null,spec2:sp.spec2||null,big:sp.big?1:0,heavy:sp.heavy?1:0,auto:sp.autoType?1:0,autoType:sp.autoType||null,hackRounds:0,
    wpns:sp.wpns||['akli','cowboy'],back:sp.back||null,lines:REB_LINES[sp.id]||REB_LINES.generic,reinf:1},squadProt(sp)));
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
  u.face=-Math.PI/2;u.landAt=clock()+LAND_MS*0.85;U.push(u);
  fsFx.push({k:'landing',x:u.x,y:u.y,t0:clock(),dur:LAND_MS+500});   // the transport sets it down
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
    const a=FS.ships[o.ship];fsSpent(a);
    const landAt=clock()+LAND_MS*0.85;
    fsFx.push({k:'landing',x:o.x,y:o.y,t0:clock(),dur:LAND_MS+500});
    a.soldiers.forEach((sp,j)=>{
      const u=mkSquadUnit(sp,o.x+(j-(a.soldiers.length-1)/2)*40,o.y+30);
      const d=moveDest(u,u.x,u.y,120);if(d){u.x=d.x;u.y=d.y;}
      u.face=-Math.PI/2;u.landAt=landAt;U.push(u);   // they step off once the transport is down
    });
    sLand();
    addFloater(o.x,o.y-40,'REINFORCEMENTS',C.go);
    log('<span class="g">'+a.name+' sets down and '+a.soldiers.length+' soldier'+(a.soldiers.length===1?'':'s')+' pile out.</span>');
  }
}
const LAND_MS=1400;
/* fire support seen from the ground (art handoff): SR_ART.strafe, supplyDrop and landing; a dropped crate stays */
function drawFsFx(now){
  const t=HUD.reduced?0:now/1000;
  fsFx=fsFx.filter(f=>now-f.t0<f.dur);
  for(const f of fsFx){
    const k=Math.min(1,Math.max(0,(now-f.t0)/(f.k==='strafe'?STRAFE_MS:f.k==='landing'?LAND_MS:f.dur)));
    if(f.k==='strafe')SA.strafe(ctx,f.x,f.y,f.ang,STRAFE_LEN,k,t,{ship:f.ship,livery:'rebel'});
    else if(f.k==='drop')SA.supplyDrop(ctx,f.x,f.y,Math.min(0.999,k),t,{});
    else if(f.k==='landing')SA.landing(ctx,f.x,f.y,k,t,{});
  }
}
function drawFS(now){
  if(!FS)return;
  {const t=HUD.reduced?0:now/1000;   // a landed crate stays on the ground, open once it has been looted
   for(const m of lootMarks)if(m.supply&&!fsFx.some(f=>f.k==='drop'&&f.x===m.x&&f.y===m.y))SA.supplyDrop(ctx,m.x,m.y,1,t,{open:!!m.taken});}
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
  return !!(s&&t&&hasSp(s,'fieldtech')&&!s.down&&!s.extracted&&!s.away&&!s.manning&&!s.mnt&&
    t.side==='law'&&t.auto&&t.hackRounds&&!t.down&&!t.surr&&dist(s,t)<=HACK_R&&!losBlocked(s,t));
}
/* rounds a hack takes: one with a Slicer on Overwatch */
const hackNeed=t=>SUP().hack1?1:t.hackRounds;
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
    addFloater(t.x,t.y-50,'HACK '+Math.min(t.hackProg,hackNeed(t))+'/'+hackNeed(t),C.shield);
    if(t.hackProg>=hackNeed(t))hackFlip(u,t);
    else log(nameSpan(u)+' works on <b>'+t.name+'</b> — <span class="a">'+t.hackProg+'/'+hackNeed(t)+'</span>.');
  }
  if(!SUP().backdoors)for(const t of U)if(t.hackProg>0&&!t.hackedNow&&t.side==='law')t.hackProg=0;   // Backdoors (Slicer) keep it
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
    if(!t||!canHack(s,t)||s.rtPath){if(t)addFloater(t.x,t.y-50,'HACK BROKEN',C.hazard);s.hackTid=null;if(t&&!SUP().backdoors)t.hackProg=0;continue;}
    t.hackT+=dt;
    if(t.hackT>=4){
      t.hackT=0;t.hackProg++;
      addFloater(t.x,t.y-50,'HACK '+Math.min(t.hackProg,hackNeed(t))+'/'+hackNeed(t),C.shield);
      if(t.hackProg>=hackNeed(t))hackFlip(s,t);
    }
  }
}
/* ---------- Steal Fuel objectives ---------- */
function fuelGuards(){return U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&dist(u,PAD)<PAD.r+40);}
function fuelReach(){
  if(!fs||fs.reached)return;
  if(U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away&&dist(u,PAD)<PAD.r+70)){
    fs.reached=true;
    addFloater(PAD.x,PAD.y-70,mtx(SCN.mt.float.reached),C.go);
    log(mtx(SCN.mt.log.reached));
    const lead=U.find(u=>u.side==='reb'&&!u.down);
    if(lead)say(lead,mtx(SCN.mt.say.reached));
    sTick();syncUI();
  }
}
function callTransport(){
  if(!fs||!fs.reached||fs.called||phase==='CUTSCENE'||phase==='EXTRACT'||phase==='GAMEOVER')return;
  fs.called=true;
  if(grafState==='gone'){grafPos.x=-600;grafPos.y=H+400;}
  grafFx=null;   // whatever it was doing up there, it comes to the pumps now
  ownGunDone();
  fs.flying={t0:clock(),dur:3800,from:{x:grafPos.x,y:grafPos.y}};
  grafState='flying';
  sTakeoff();
  log('<b>'+grafName()+'</b> <span class="d">(comms):</span> '+mtx(SCN.mt.log.inbound));
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
    sLand();SHK.add(0.3);
    for(let i=0;i<26;i++)parts.push({x:PAD.x+(rng()-0.5)*220,y:PAD.y+(rng()-0.5)*170,vx:(rng()-0.5)*180,vy:-rng()*40,r:3+rng()*5,a:0.5,col:'#b09a78',t0:now,dur:900});
    log(mtx(SCN.mt.log.landed,{total:FUEL_ROUNDS}));
    camGoal={x:PAD.x-100,y:PAD.y+40,z:0.85};
    alertTown(mtx(SCN.mt.alarm.landed));
  }
}
function spawnFoes(list,msg){
  if(SUP().noReinf){log('<span class="g">Blackout:</span> the Hegemony calls for help and nobody answers.');return;}
  for(const u of nameFoes(expandUnits(list.map(f=>Object.assign({},f))),U)){
    u.face=Math.PI;u.wave=1;
    U.push(u);
  }
  if(msg){log(msg);sAlert();}
}
function fuelPumpStep(){
  if(!fs||!fs.landed||fs.done)return;
  if(!fuelGuards()){
    addFloater(PAD.x,PAD.y-60,mtx(SCN.mt.float.stalled),C.hazard);
    return;
  }
  fs.pump++;
  addFloater(PAD.x,PAD.y-60,mtx(SCN.mt.float.pump,{n:Math.min(fs.pump,FUEL_ROUNDS),total:FUEL_ROUNDS}),C.shield);
  sSpark();
  for(const w of (SCN.waves||[])){
    if(w.at!==fs.pump)continue;
    spawnFoes(w.foes,w.log);
  }
  if(fs.pump>=FUEL_ROUNDS){
    fs.done=true;
    addFloater(PAD.x,PAD.y-88,mtx(SCN.mt.float.full),C.go);
    log(mtx(hostilesActive().length?SCN.mt.log.full:SCN.mt.log.fullClear));
    const lead=U.find(u=>u.side==='reb'&&!u.down);
    if(lead)say(lead,mtx(SCN.mt.say.full));
  } else log(mtx(SCN.mt.log.pumping,{n:fs.pump,total:FUEL_ROUNDS}));
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
    addFloater(SCN.plant.bx,SCN.plant.by-130,mtx(SCN.mt.float.tooClose),C.hazard);
    log(mtx(SCN.mt.log.tooClose));
    return;
  }
  fac.quiet=!fac.everAlerted;
  fac.detonated=true;fac.fx={t0:clock()};
  log(mtx(SCN.mt.log.blown));
  explode(SCN.plant.bx,SCN.plant.by,{r:SCN.blastR,d0:80,d1:120});
  camGoal={x:SCN.plant.bx-80,y:SCN.plant.by+120,z:0.8};
  const lead=U.find(u=>u.side==='reb'&&!u.down);
  if(lead)say(lead,mtx(SCN.mt.say.blown));
  if(SCN.detWave)spawnFoes(SCN.detWave.foes,SCN.detWave.log);
  if(town==='calm')alertTown(mtx(SCN.mt.alarm.blown));
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
const grafHome=()=>!SCN.grafLeaves||grafState==='landed';   // a transport that left has to be back on the LZ for the pickup
/* nobody leaves while the VIP lies on the ground: bring them round first */
const vipDown=()=>U.some(u=>u.vip&&u.down&&!u.dead&&!u.extracted&&!u.away);
function extractReady(){
  if(vipDown())return false;
  if(!fs&&!grafHome())return false;   // the transport has to be back on the LZ
  if(ix)return ix.hacked&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away);
  if(rs)return rs.released&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away);
  if(fac)return fac.detonated&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted);
  if(fs)return fs.done&&hostilesActive().length===0&&U.some(u=>u.side==='reb'&&!u.down&&!u.extracted);
  return crossAway&&grafHome()&&hostilesActive().length===0&&
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
  if(FS&&FS.orders.some(o=>o.kind==='drop'&&!o.landed&&o.at))fsExecute();   // a free-move drop lands on its timer
  for(const u of U){
    if(u.down||u.surr||u.extracted||u.away||u.mnt)continue;   // the crew ride
    if(u.veh){
      if(u.owner==='law'&&town==='calm'&&crewIn(u).some(c=>c.side==='law'&&lookout(c))){
        // a crewed patrol car drifts its beat and the crew sweep their eyes
        if(u.rtPath){rtStep(u,dt);u.baseFace=undefined;}
        else {
          if(u.baseFace===undefined)u.baseFace=u.face;
          u.scanT+=dt;u.face=u.baseFace+Math.sin(u.scanT*0.4)*0.6;
          if(u.patrol&&rng()<0.003){const p=u.patrol[rint(0,u.patrol.length-1)];setRt(u,p.x+rint(-26,26),p.y+rint(-26,26),CAR_PATROL_SPEED);}
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
          setRt(u,p.x+rint(-26,26),p.y+rint(-26,26),PATROL_SPEED);
        }
      }
    }
  }
  if(phase!=='FREE')return;
  if(contactCheck())return;
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
    const worker=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.vip&&!u.away&&!u.down&&!u.extracted&&!u.manning&&!u.bot&&(!u.mnt||wp.inVeh)&&(!wp.needSpec||hasSp(u,wp.needSpec))&&(!wp.needCharge||u.charge)&&Math.hypot(u.x-wp.x,u.y-wp.y)<46);
    if(worker){
      wp.t+=dt;
      if(wp.t>=4){wp.t=0;workStep(wp,worker);}
    }
  }
  detUpdate(dt);
  chatterUpdate(dt);
}
function civStep(dt){
  for(const u of U){
    if(u.side!=='civ'||u.extracted||u.cower)continue;
    if(u.rtPath){
      rtStep(u,dt);
      if(!u.rtPath&&u.fleeing){u.extracted=1;} // made it indoors / out of town
    } else if(town==='calm'&&u.haunt&&rng()<0.0025){
      const p=u.haunt[rint(0,u.haunt.length-1)];
      setRt(u,p.x+rint(-20,20),p.y+rint(-20,20),CIV_SPEED);
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
  extractFx={stage:'board',t0:clock()};
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
  if(lawHolds())log('<span class="g">Mission Control called it:</span> the Hegemony is caught flat-footed. <b>A free round.</b>');
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
  phase='EXEC';execT0=clock();
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
      resetChain(u);   // moving breaks a semi-auto chain and a Steady aim
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
    } else if(o&&o.type==='stim'){   // an Action like Treat Wound: they still shoot this round
      u.sprinted=0;u.braced=0;useStim(u);
    } else if(o&&o.type==='rally'&&u.hero&&!u.heroUsed&&!injOf(u,'shrapnel')){
      u.sprinted=0;u.braced=0;u.heroUsed=1;
      addFloater(u.x,u.y-48,'RALLY!',C.go);
      log(nameSpan(u)+' <span class="g">rallies the squad</span> <span class="d">\u2014 everyone steadies, +2 to hit this round</span>');
      for(const m of U)if(m.side==='reb'&&!m.down&&!m.surr&&!m.extracted&&!m.away&&!m.auto&&!m.vip){m.rally=1;adjCoolG(m,Math.max(0,75-m.cool),'rallied');}
    } else if(o&&o.type==='deploy'){
      u.sprinted=0;u.braced=0;doDeploy(u);
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
      if(h.side==='law'&&(town!=='alerted'||lawHolds()))continue;
      for(const m of U){
        if(m.side===h.side||m.down||m.surr||m.extracted||m.away||!m.path)continue;
        const wkey=bestWeapon(h,m);
        if(!wkey)continue;
        h.owUsed=1;h.wkey=wkey;
        h.face=Math.atan2(m.y-h.y,m.x-h.x);
        const rec=applyShot(h,m,wkey,true);
        if(!rec.jammed)fireFx(h,m,wkey,rec.hit,rec.dmg,{done:true,crit:rec.crit});
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
    if(o&&(o.type==='loot'||o.type==='clear'||o.type==='work'||o.type==='lockin'||o.type==='deploy'||o.type==='pack'||o.type==='hack'||o.type==='enter'||o.type==='exit'||o.type==='switch'))continue;
    if(coolStateG(s)==='panic')continue;
    if(s.side==='law'&&(town!=='alerted'||lawHolds()))continue;
    if(s.side==='reb'&&s.id==='sera'&&dist(s,PAD)<PAD.r&&!crossAway)continue; // head down in the panel
    const anyT=U.some(t=>t.side!==s.side&&!emptyVeh(t)&&wpnsOf(s).some(w=>validShot(s,t,w)));
    if(!anyT)continue;
    list.push(s);
  }
  if(!list.length){endRound();return;}
  list.sort((a,b)=>initKey(b)-initKey(a));
  engageQ={list,idx:0,cur:null,nextAt:clock()+350};
  phase='ENGAGE';
  syncUI();
}
/* who shoots first: aim with a little noise; Nervous rebels hang back in round one, Perfectionists go last */
function initKey(u){return u.aim*3+rint(0,4)-(hasT(u,'nervous')&&round<=1?3:0)-(hasT(u,'perfectionist')?100:0);}
function pickTarget(s){
  let best=null,bp=-1e9,bw=null;
  const hasOther=s.side==='law'&&U.some(t=>t.side==='reb'&&t.id!=='sera'&&!t.down&&!t.extracted&&wpnsOf(s).some(w=>validShot(s,t,w)));
  for(const t of U){
    if(t.side===s.side||t.down||t.surr||t.extracted||t.away||emptyVeh(t))continue;   // an empty vehicle only when the player picks it
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
  s.wkey=wkey;shotRound=true;
  s.face=Math.atan2(t.y-s.y,t.x-s.x);
  return {s,t,wkey,tn:computeTN(s,t),atk:computeATK(s,t,wkey,false),
    reveal:0,revealA:0,stage:'reveal',stageAt:clock(),roll:0,hit:false,crit:false,applied:false,need:0};
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
    if(s.side==='reb'&&!s.ally)selId=s.id;   // the rebel whose turn it is is the selected one
    else {   // an enemy (or an ally) shoots straight away: the card opens on the result while the shot flies
      const c=q.cur;
      c.fast=1;selId=null;c.reveal=c.tn.entries.length;c.revealA=c.atk.entries.length;c.need=needFor(c.tn.total,c.atk.total);
      rollShot(c);startFire(c,now);
    }
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
    if(el>780){rollShot(c);c.stage='verdict';c.stageAt=now;}
  } else if(c.stage==='verdict'){
    if(el>620)startFire(c,now);
  } else if(c.stage==='fire'){
    if(el>(c.applyAt==null?420:c.applyAt)&&!c.applied){
      c.applied=true;c.done=true;
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
        const dmg=c.dmg,soaked=c.soaked;
        woundQuiet=true;try{woundUnit(c.s,c.t,dmg,c.crit,WDAM[c.wkey],c.wkey);}finally{woundQuiet=false;}
        log(nameSpan(c.s)+' hits '+nameSpan(c.t)+' — <b>'+dmg+'</b>'+(modeOf(c.s,c.wkey)==='fan'?' <span class="a">(fan hammer)</span>':'')+(soaked?' <span class="d">(cover soaked it)</span>':'')+(c.crit?' <span class="a">(critical)</span>':'')+'.');
        afterShot(c.s,c.t,c.wkey,true,c.tn,c.atk);
        if(c.wkey==='rocket')c.s.wpns=c.s.wpns.filter(w=>w!=='rocket');
      } else {
        if(c.wkey==='rocket')c.s.wpns=c.s.wpns.filter(w=>w!=='rocket');
        log(nameSpan(c.s)+' misses '+nameSpan(c.t)+'.');
        if(c.tn.cover&&c.tn.cover.prop)chipCover(c.tn.cover.prop,Math.round(rollDamage(c.s,c.t,c.wkey,false)*0.7));
        afterShot(c.s,c.t,c.wkey,false,c.tn,c.atk);
      }
    }
    // a fast (enemy) shot hands over as its last rounds land; the tracers finish on their own
    if(el>(c.endAt||900)||(c.fast&&c.applied&&el>(c.applyAt||420)+FAST_TAIL)){q.cur=null;q.nextAt=now+(c.fast?120:320);if(!c.fast)selId=null;syncUI();}
  }
}
const FAST_TAIL=380;   // ms an enemy's result stays up after the hit lands before the next shooter goes
function rollShot(c){
  c.roll=rint(1,20);
  c.jammed=jamRoll(c.s,c.wkey,c.roll);
  c.hit=!c.jammed&&c.roll>=c.need;
  c.crit=critRoll(c.roll,c.t);
}
function startFire(c,now){
  c.stage='fire';c.stageAt=now;
  if(c.hit&&!c.jammed&&!c.t.obj){
    let dmg=rollDamage(c.s,c.t,c.wkey,c.crit);
    c.soaked=!!(c.tn.cover&&(c.tn.cover.prop||c.tn.cover.wall));
    if(c.soaked)dmg=Math.max(1,Math.round(dmg*0.75));
    c.dmg=dmg;
  }
  if(!c.jammed){const f=fireFx(c.s,c.t,c.wkey,c.hit,c.dmg||0,c);c.applyAt=Math.max(40,Math.min(700,f.first));c.endAt=Math.max(900,f.last+520);}
  if(town==='calm')alertTown('Gunfire in the street.');
}
function playerAttack(){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await')return;
  tutFlags.attacked=1;
  if(tutIdx>=4)tutFlags.shot=1;   // the Take the shot card only counts a shot taken once it is the current card
  sTick();c.stage='roll';c.stageAt=clock();sDice();syncUI();
}
function throwNade(s,gx,gy){
  s._throwT=clock();
  if(injOf(s,'shrapnel')){addFloater(s.x,s.y-48,'SUPPRESSED',C.hazard);return;}
  NADES--;
  if(hasT(s,'clumsy')&&rng()<0.25){
    gx=s.x;gy=s.y;
    log(nameSpan(s)+' <span class="b">fumbles the BLAM</span> <span class="d">(clumsy)</span> \u2014 it drops at their feet.');
  }
  nades.push({x:gx,y:gy,fx:s.x,fy:s.y,t0:clock(),armRound:round});
  s.face=Math.atan2(gy-s.y,gx-s.x);
  log(nameSpan(s)+' lobs a <b>BLAM frag</b> — it lands, primed.');
  addFloater(gx,gy-14,'PRIMED',C.hazard);
  sTick();
  pickMode=null;
  if(engageQ&&engageQ.cur){engageQ.cur=null;engageQ.nextAt=clock()+500;}
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
  if(engageQ&&engageQ.cur){engageQ.cur=null;engageQ.nextAt=clock()+450;}
  syncUI();
}
function playerHold(){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await')return;
  sTick();
  if(WPN[c.wkey]&&WPN[c.wkey].steady){c.s.steadyT=c.t.id;log(nameSpan(c.s)+' <span class="d">holds fire and settles the sights on</span> '+nameSpan(c.t)+' <span class="d">(Steady: +'+STEADY_BONUS+' next shot at them)</span>.');}
  else log(nameSpan(c.s)+' <span class="d">holds fire.</span>');
  engageQ.cur=null;engageQ.nextAt=clock()+220;syncUI();
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
  if(!c||c.stage!=='await'||!(t.side==='law'||(t.veh&&(t.owner==='law'||!crewIn(t).length)))||t.down||t.surr)return;
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
    if(u.side!=='reb'||u.dead||u.extracted||u.away||!injOf(u,'bleeding'))continue;
    if(u.down){   // unconscious and bleeding: two rounds for someone to treat them
      if(!canDie(u))continue;
      u.bleedOut=(u.bleedOut||0)+1;
      if(u.bleedOut>=2)killUnit(u,null,'bleed');
      else{addFloater(u.x,u.y-52,'BLEEDING OUT',C.hazard);log(nameSpan(u)+' <span class="b">is bleeding out</span> <span class="d">\u2014 treat them this round or lose them</span>.');}
      continue;
    }
    u.hp-=6;u.minHp=Math.min(u.minHp===undefined?1:u.minHp,Math.max(0,u.hp)/u.maxhp);
    addFloater(u.x,u.y-38,'-6',C.hazard);
    log(nameSpan(u)+' <span class="b">bleeds</span> <span class="d">\u2014 -6</span>');
    if(u.hp<=0)downUnit(u,null);
  }
  for(const h of U){
    if(h.side!=='reb'||h.down||h.extracted||h.away||!hasT(h,'empathetic'))continue;
    for(const m of U)if(m!==h&&m.side==='reb'&&!m.down&&!m.extracted&&!m.away&&dist(h,m)<240)adjCoolG(m,3,'steadied by '+h.first);
  }
  stunTick();
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
    if(u.order&&u.order.type==='pack'){packTurret(u);continue;}
    if(!turret.gunner&&!u.manning&&dist(u,TURRET)<52&&
       ((u.order&&u.order.type==='man')||u.goingTurret)){manTurret(u);}
    u.goingTurret=0;
  }
  // pad work: one round with a soldier on the point (Work order, Hold, or standing fast)
  for(const wp of WORK){
    if(wp.done)continue;
    if(wp.needClear&&hostilesActive().length)continue;
    const worker=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.vip&&!u.away&&!u.down&&!u.extracted&&!u.manning&&!u.bot&&(!u.mnt||wp.inVeh)&&(!wp.needSpec||hasSp(u,wp.needSpec))&&(!wp.needCharge||u.charge)&&
      (!u.order||u.order.type==='hold'||(u.order.type==='work'&&u.order.wp===wp.id))&&Math.hypot(u.x-wp.x,u.y-wp.y)<46);
    if(worker)workStep(wp,worker);
  }
  for(const u of U)if(u.semiT&&coolStateG(u)==='panic')resetChain(u);   // panic breaks a semi-auto chain
  // a round without taking fire steadies the nerve
  for(const u of U){
    if(u.side==='civ'||u.down||u.surr||u.extracted||u.away)continue;
    if(!dmgRound.has(u.id))adjCoolG(u,6,null);
  }
  roundHot=shotRound||dmgRound.size>0;shotRound=false;
  dmgRound=new Set();
  fuelReach();
  fuelPumpStep();
  // hotwire
  const sera=U.find(u=>u.id==='sera');
  if(!crossAway&&sera&&!sera.down&&!sera.extracted&&hot<HOT_ROUNDS&&dist(sera,PAD)<PAD.r){
    if(!sera.reached){sera.reached=true;log('<span class="g">Pilot is at the Cross.</span> Keep them off them.');say(sera,'I’m at the panel. Two rounds. Keep them OFF me.');}
    hot++;
    addFloater(sera.x,sera.y-46,'HOTWIRE '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,C.gold);
    sSpark();
    if(hot>=HOT_ROUNDS)tryLaunch();
    else log('Pilot works the ignition bypass: <span class="a">'+hot+'/'+HOT_ROUNDS+'</span>.');
  }
  moraleCheck();
  spotCheck();
  // extraction
  if(exitOpen()&&grafHome()&&vipDown())log('<span class="a">'+(U.find(u=>u.vip)||{}).first+' is down.</span> Nobody leaves without them: treat them first.');
  else if(exitOpen()&&grafHome()){
    const clear=!hostilesActive().some(l=>Math.hypot(l.x-LZ.x,l.y-LZ.y)<300);
    for(const u of U){
      if(u.side!=='reb'||u.id==='sera'||u.down||u.extracted)continue;
      if(Math.hypot(u.x-LZ.x,u.y-LZ.y)<LZ.r){
        if(clear){
          if(u.mnt)dismount(u,true);
          u.extracted=1;u.order=null;
          log(nameSpan(u)+' '+mtx(MT.COMMON.aboard));
          addFloater(u.x,u.y-40,'EXTRACTED',C.go);
        } else {
          log('<span class="a">Hostiles too close to the transport. Eliminate them.</span>');
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
    quietRounds=0;
    enterFree(town==='alerted'?'<span class="g">The street is clear.</span> Time runs free again — sweep the town, then bring everyone home.':null);
    return;
  }
  const hot=roundHot;roundHot=false;
  if(!stillFighting(hot)){
    const n=hostilesActive().length;
    enterFree('<span class="g">Contact lost.</span> Time runs free again, but '+n+' hostile'+(n>1?'s are':' is')+' still out there and the alarm is up: the moment either side sees the other, it is rounds again.');
    return;
  }
  startPlanning();
}
function doCrossAway(){
  crossAway=true;
  const sera=U.find(u=>u.id==='sera');
  if(sera)sera.xpGain=(sera.xpGain||0)+0.25;
  sera.away=1;sera.order=null;
  crossFx={t0:clock()};
  sTakeoff();
  camGoal={x:PAD.x-120,y:PAD.y,z:0.85};
  log('<span class="g">The Cross is up!</span> Our Pilot takes her low over the rooftops and out into space.');
  if(SCN.grafLeaves){grafReturn();log('<b>'+grafName()+'</b> <span class="d">(comms):</span> There she goes. I’m coming back for you. Get to the LZ.');}
  else log('<b>'+grafName()+'</b> <span class="d">(comms):</span> There she goes. Ramp’s down. Get my ground-pounders home.');
  const lead=U.find(u=>u.side==='reb'&&u.id!=='sera'&&!u.down);
  if(lead)say(lead,'Bird’s away! Everyone back to the transport!');
  syncUI();
}
/* who the objective needs: the VIP being rescued, and the Pilot in Steal the Cross. Going down does not end the
   mission; dying does, and so does lying down with no way left to bring them round (DESIGN_BLOCKERS C-31). */
const needed=u=>!!u&&(!!u.vip||u.id==='sera');
let lostHow='';   // 'dead' or 'nomeds', for the end screen
function canRevive(t){
  if(!t||t.dead)return false;
  if(t.auto||t.bot)return false;   // a walker is not patched up with a Med Pack
  const up=U.filter(u=>u.side==='reb'&&u!==t&&!u.down&&!u.extracted&&!u.away&&!u.auto&&!u.vip);
  if(up.some(u=>u.meds>0))return true;
  if(!up.length)return false;
  if(t.vip&&FS&&FS.evac===1)return true;   // Evac on Call flies a downed VIP out
  return false;
}
function checkDefeat(){
  for(const u of U){
    if(!needed(u)||u.away||u.extracted)continue;
    if(u.dead||(u.down&&!canRevive(u))){lostHow=u.dead?'dead':'nomeds';gameOver(false,u.vip?'vip':'sera');return;}
  }
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
      'The squatters are gone and the signal of the revolution hums through the antenna. It isn’t much, yet. A command centre, bunks for five, a hangar cave, but it’s ours, and it\'s hidden from the Hegemony. We also found, under a decade of dust in that cave, a derelict Graf Type 1 Hauler. We should restore it to working condition as a priority. Day one of the war starts today.':
      'The squatters repelled our attack. The squad fell back down the canyon. Catch your breath, come around, and try again. There is no revolution without a home base.';
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
  endChrome(win,(SCN.mt||SCN.mode==='stealcross'||SCN.mode==='strider')&&!win);
  if(SCN.mt){typeEnd(win,why,left);return;}
  byId('endEyebrow').textContent=tagText(win?(SCN.mode==='strider'?'Mission Report · Menk Crossing':'Mission Report · Dustfall'):'Mission Report · It went wrong');
  byId('endTitle').textContent=win?(SCN.mode==='strider'?'The Strider Is Ours':'The Cross Is Ours'):'Mission Failed';
  let txt;
  if(SCN.mode==='strider'){
    txt=win?'A Strider Mk I walked up the transport\'s ramp with its face-screen still reading “We’re all in this together” and a fresh rebel badge scratched into its chest plate. The Hegemony is out one walker. We\'ve got one of our own.'+(rs.everAlerted?'':' Nobody at the Crossing saw it leave.')+(left.length?' It cost us: '+left.join(', ')+' left at the depot. We don\u2019t forget that.':''):
      (why==='vip'?'The Strider went down in the yard, and with it the whole plan. The squad pulled out with nothing to show for it.':'The squad was overrun around the depot and the transport lifted empty. The Strider is still chained in its yard.');
  } else if(win){
    txt='Sera put the FT-4 down at Haven Rock with the fuel light on and a grin she won’t drop for a week. '+
      'Sheriff Reeve’s Hegemony masters will want an explanation he doesn’t have.';
    if(left.length)txt+=' It cost us: '+left.join(', ')+' left on the street. We don’t forget that.';
  } else if(why==='sera'){
    txt=(lostHow==='dead'?'Sera died in the dust a stone’s throw from the Cross.':'Sera went down a stone’s throw from the Cross, and nobody had a Med Pack left to bring her round.')+' Without a pilot the ship is just sheet metal. The squad pulled back to the '+trName()+' with nothing but her sidearm.';
  } else {
    txt='The squad was shot to pieces on Dustfall’s main street. The '+trName()+' lifted empty. Reeve gets to write the report he always wanted.';
  }
  byId('endText').textContent=txt;
  let lh='';
  if(win&&rs){
    const vn=(U.find(u=>u.vip)||{name:'Prisoner'}).name;
    lh+=LL(vn,'Stolen')+LL('Stayed unseen',rs.everAlerted?'No':'Yes, bonus')+lootTail();
  } else if(win){
    lh+=LL('FT-4 Cross starfighter','Secured')+lootTail();
    if(!tally.c&&!tally.s&&!tally.items.length)lh+=LL('Loot','None. Clean and quiet.');
  }
  byId('endLoot').innerHTML=lh;
  byId('endscreen').hidden=false;
  pendingResult=buildResult(win);
  syncUI();
}
/* what the squad carried off, for any end screen */
function lootTail(){
  let t='';
  if(tally.c)t+=LL('Credits looted','+'+tally.c,'credits');
  if(tally.s)t+=LL('Supplies looted','+'+tally.s,'supplies');
  for(const it of tally.items)t+=LL(Items.name(it),'Taken','loot');
  return t;
}
/* a mission type's end screen: the words come from its text set (game/js/mission-text.js), the choice of words from
   how it went */
function typeEnd(win,why,left){
  const k=MT.keyForScenario(SCN.mode),E=SCN.mt.end,K=MT.COMMON;
  const cost=left.length?mtx(E.cost,{fallen:left.join(', ')}):'';
  let title=E.title,txt,loot=[],unseen=null;
  if(k==='fuel'||k==='intel'){txt=win?mtx(E.win)+cost:mtx(E.lose);loot=[[E.loot,E.lootDone]];}
  else if(k==='autofactory'){
    txt=win?mtx(fac.quiet?E.winQuiet:E.winLoud)+cost:mtx(fac.planted&&!fac.detonated?E.loseUnblown:E.lose);
    loot=[[E.loot,E.lootDone]];unseen=fac.quiet;
  } else if(k==='towers'){
    const L=fac.method==='limpet';
    title=L?E.titleLimpet:E.titleDown;
    txt=win?mtx(L?E.winLimpet:E.winDown)+(fac.quiet?mtx(E.quiet):'')+cost:mtx(E.lose);
    loot=[[E.loot,L?E.lootLimpet:E.lootDown]];unseen=fac.quiet;
  } else if(k==='rescue'){
    txt=win?mtx(E.win)+mtx(rs.everAlerted?E.winLoud:E.winQuiet)+cost:mtx(why==='vip'?(lostHow==='nomeds'&&E.loseVipDown?E.loseVipDown:E.loseVip):E.lose);
    loot=[['{npc}',E.lootDone]];unseen=!rs.everAlerted;
  }
  byId('endEyebrow').textContent=tagText(mtx(win?K.eyebrowWin:K.eyebrowLose));
  byId('endTitle').textContent=mtx(win?title:K.titleLose);
  byId('endText').textContent=txt;
  let lh='';
  if(win){
    for(const [a,b] of loot)lh+=LL(HUD.esc(mtx(a)),HUD.esc(mtx(b)));
    if(unseen!==null)lh+=LL(HUD.esc(mtx(K.unseen)),HUD.esc(mtx(unseen?K.unseenYes:K.unseenNo)));
    lh+=lootTail();
  }
  byId('endLoot').innerHTML=lh;
  byId('endscreen').hidden=false;
  pendingResult=buildResult(win);
  syncUI();
}
let pendingResult=null;
function grafName(){return (CTX&&CTX.grafPilot&&CTX.grafPilot.first)||'Joss';}
/* the transport the player picked for this mission (DESIGN_BLOCKERS C-26) */
function trName(){const t=(CTX||defaultSpec()).transport;return (t&&t.name)||'transport';}
/* the variables a mission type's text uses (game/js/mission-text.js) */
function mvars(extra){
  const sp=CTX||defaultSpec(),v=U.find(u=>u.vip)||sp.vip;
  return Object.assign({transport:trName(),pilot:grafName(),target:SCN.target||'target',place:SCN.place||'the target',
    npc:v?v.name:'the prisoner',npc1:v?v.first:'the prisoner'},extra||{});
}
const mtx=(str,extra)=>MT.fill(str,mvars(extra));
function buildResult(win){
  const haven=SCN.mode==='haven';
  const people=[];
  for(const u of U){
    if(u.side!=='reb'||u.asset)continue;
    let state='ok';
    if(u.down)state=haven?(win?'injured':'ok'):u.dead?'lost':'injured'; // nobody is buried this early in the war
    const xp=Math.round(((u.xpGain||0)+(win?0.12:0.03))*100)/100;
    const rec={id:u.pid||u.id,xp,state,dur:haven?rint(1,3):rint(3,6)};
    if(u.sk){rec.sk={};for(const k in u.sk)rec.sk[k]=Math.round(u.sk[k]*10)/10;}
    if(u.kills)rec.kills=u.kills;
    if(u.down)rec.down=1;
    if(u.inj&&u.inj.length)rec.inj=u.inj.map(i=>({k:i.k,treated:!!i.treated}));
    if(u.treats)rec.treats=u.treats;
    if(u.packsUsed)rec.packs=u.packsUsed;
    if(u.deployed==='riotshield'&&u.shieldBroke)rec.broke=['riotshield'];
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
    dropUsed:!!(FS&&FS.dropUsed),
    win,cross:SCN.mode==='stealcross'&&!!win,nades:NADES,quiet:!!((fac&&fac.detonated&&fac.quiet)||(rs&&rs.released&&!rs.everAlerted)),vipOut:!!(U.find(u=>u.vip&&u.extracted)),chargeUsed:(fac&&fac.planted&&fac.method!=='limpet')?1:0,limpetUsed:(fac&&fac.planted&&fac.method==='limpet')?1:0,method:fac?fac.method:null,vehicles,loot:{c:tally.c,s:tally.s,items:tally.items.slice()},people,
    objs:(lastObjs||[]).filter(o=>!/^\(/.test(o.t)).map(o=>({t:o.t.replace(/\s+—\s+\d+\/\d+$/,''),done:!!o.done}))};
}
/* ---------- explosions ---------- */
function explode(x,y,opt){
  shotRound=true;
  const R=(opt&&opt.r)||135,D0=(opt&&opt.d0)||45,D1=(opt&&opt.d1)||70;
  sBoomBig();
  juice(opt&&opt.rocket?'rocket':'grenade',x,y,{r:R});   // freeze, shake, debris, embers, smoke and a shockwave
  decals.push({x,y,r:(R/135)*(52+rng()*14)});
  if(!(opt&&opt.quiet))boomFx.push({x,y,t0:clock(),dur:700,R});   // quiet: the art kit draws this one (a strafing run)
  for(const u of U){
    if(u.side==='civ'||u.dead||(u.down&&u.side!=='reb')||u.extracted||u.away||u.office||(u.mnt&&enclosed(u)))continue;
    if(opt&&opt.fs&&SUP().dangerClose&&u.side==='reb')continue;   // Danger Close (Combat Support)
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
    if(p.kind==='canister'&&d<R+15){p.dead=true;exploQ.push({x:p.x,y:p.y,at:clock()+120+rng()*160});}
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
/* A trigger pull on screen (art handoff: Volleys). SR_ART.volley turns the one roll into a burst of rounds, re-rolled
   every time; the rounds that land split the damage between them, so the numbers always add up to the roll. Misses
   fly past and strike the ground or a wall behind. res is the attack being resolved: its rounds wait to land until its
   damage is in (res.done). Returns when the first and last rounds land, in ms from now. */
const machine=u=>!!(u&&(u.auto||u.bot||u.veh||u.obj));
function fireFx(s,t,wkey,hit,dmg,res){
  const w=WPN[wkey]||{},P=SA.PROJ[wkey],now=clock();
  const ang=Math.atan2(t.y-s.y,t.x-s.x);
  if(s.manning)turret.face=ang; // the gun (and its sandbags' open side) tracks where it shoots
  const h0=26*actorScale(s),ht=t.obj?8:t.veh?16:30*actorScale(t);
  const x0=s.x+Math.cos(ang)*14,y0=s.y-h0,x1=t.x,y1=t.y-ht;
  dmg=hit?Math.max(0,dmg||0):0;
  let mode=modeOf(s,wkey)||'semi',plan,lands;
  if(!P||P.type==='melee'||(hit&&dmg<3)){   // fists, a beam with no art, or a hit too small to split: one round
    plan={key:wkey,mode:'single',hit,rounds:[{fire:0,hit,dmg,dAng:hit?0:(Math.random()<0.5?-1:1)*0.1,range:hit?1:1.25,jx:0,jy:0}]};
  } else {
    if(hit&&dmg<8&&mode==='auto')mode='semi';
    plan=SA.volley(wkey,mode,{hit,damage:dmg});
  }
  // misses that would fly through a wall stop at it
  const D=Math.hypot(x1-x0,y1-y0)||1;
  plan.rounds.forEach(r=>{
    if(r.hit)return;
    const a=ang+r.dAng,far=D*r.range,e=clipShot(x0,s.y,x0+Math.cos(a)*far,s.y+Math.sin(a)*far);
    if(e.wall){r.range=Math.max(0.2,Math.hypot(e.x-x0,e.y-s.y)/D);r.wall=1;}
  });
  lands=P?SA.volleyImpacts(plan,x0,y0,x1,y1):plan.rounds.map(r=>({at:0.08,x:x1,y:y1,hit:r.hit,dmg:r.dmg}));
  lands.forEach((L,i)=>{L.wall=plan.rounds[i].wall;});
  if(w.beam&&!P)tracers.push({x1:x0,y1:y0,x2:lands[0].x,y2:lands[0].y,t0:now,dur:200,col:s.side==='reb'?C.rebel:C.heg,beam:1});
  const ats=lands.map(L=>L.at),hitAts=lands.filter(L=>L.hit).map(L=>L.at);
  const first=Math.round(1000*Math.min(...(hitAts.length?hitAts:ats))),last=Math.round(1000*Math.max(...ats));
  vols.push({s,t,key:wkey,plan,lands,x0,y0,x1,y1,ht,t0:now,dur:last+600,draw:!!P&&P.type!=='melee',mode:plan.mode,res:res||null,
    cum:0,crit:!!(res&&res.crit),dtype:WDAM[wkey]||'ballistic',dir:ang,first:true});
  if(P&&P.type!=='melee'){
    juice('shot',s.x,y0+h0*0.4,{dir:ang,noStop:true,brass:WDAM[wkey]==='ballistic'});   // energy weapons throw no brass
  }
  if(wkey==='scatter'||wkey==='rocket')SHK.add(0.14);
  sShot(wkey,plan);
  return {first,last};
}
/* rounds land when their time comes (on the game clock, so hitstop holds them too) */
function juiceTick(now){
  for(const v of vols){
    if(v.res&&!v.res.done)continue;
    for(const L of v.lands)if(!L.done&&now>=v.t0+L.at*1000){L.done=1;landRound(v,L,now);}
  }
  vols=vols.filter(v=>now<v.t0+v.dur||(v.res&&!v.res.done&&now<v.t0+10000));   // an attack still resolving keeps its rounds
}
function landRound(v,L,now){
  const t=v.t,P=SA.PROJ[v.key],style=P&&P.style;
  if(v.key==='rocket'){   // the rocket bursts where it lands; the damage is the attack's
    const gx=L.hit?t.x:L.x,gy=L.hit?t.y:L.y+v.ht;
    boomFx.push({x:gx,y:gy,t0:now,dur:600,R:70});decals.push({x:gx,y:gy,r:26});
    juice('rocket',gx,gy,{r:70,k:0.7});sBoomBig();
  }
  if(!L.hit){
    if(v.dtype==='plasma'){if(rng()<0.35)sSizzle();}
    else if(v.dtype!=='explosive'&&rng()<(L.wall?0.5:0.2))sRico();   // the rocket's own burst covers it
    impFx.push({x:L.x,y:L.y,t0:now,dur:380,o:{dtype:v.dtype,surface:'cover',dir:v.dir,style,seed:(Math.random()*999)|0}});
    if(!v.plan.hit&&!v.missed){v.missed=1;addPop(t.x,t.y-58,'MISS','#c8d0dc');}
    if(!L.wall)for(const p of PROPS)if(!p.dead&&p.kind==='canister'&&Math.hypot(p.x-L.x,p.y-(L.y+v.ht))<30)detonate(p);   // stray rounds find fuel canisters
    return;
  }
  // which layer took this round: the riot shield, the energy shield and the armour soak first, in that order
  const k=t._soak||{},c0=v.cum;v.cum+=L.dmg;
  const r1=k.riot||0,r2=r1+(k.sd||0),r3=r2+(k.ad||0);
  const surf=t.obj?'cover':c0<r1?'armour':c0<r2?'shield':c0<r3?'armour':machine(t)?'robot':'flesh';
  const col=surf==='shield'?C.shield:(surf==='armour'&&c0<r3)?C.steel:t.side==='reb'?C.hazard:C.goldHi;
  impFx.push({x:L.x,y:L.y,t0:now,dur:surf==='flesh'?520:420,o:{dtype:v.dtype,surface:surf,dir:v.dir,style,seed:(Math.random()*999)|0,size:v.key==='scatter'?1.3:1,gore:goreOn()}});
  if(L.dmg>0)addPop(L.x+(Math.random()-0.5)*10,L.y-16,'-'+L.dmg,col,{crit:v.crit&&v.first});
  if(!t.obj)hitPose(t);
  if(surf==='shield')t._shHitT=now;
  const ev=v.first&&v.crit?'crit':surf==='armour'?'armourHit':'hit';
  juice(ev,L.x,L.y,{dir:v.dir,k:v.first?1:0.4,noStop:!v.first});
  if(surf==='flesh'&&goreOn())bleed(t,v.dir,L.dmg);
  v.first=false;
}
/* blood on the ground for the rest of the mission (the Blood setting hides it) */
function bleed(t,dir,dmg){
  const a=dir==null?Math.random()*Math.PI*2:dir;
  decals.push({blood:1,x:t.x+Math.cos(a)*(6+Math.random()*16),y:t.y+Math.sin(a)*(4+Math.random()*8),r:4+Math.min(9,(dmg||8)*0.3),seed:(Math.random()*9999)|0});
  const b=decals.filter(d=>d.blood);
  if(b.length>160)decals.splice(decals.indexOf(b[0]),1);
}
function drawDecals(){
  const gore=goreOn();
  for(const d of decals){
    if(d.blood){if(gore)SA.bloodSplat(ctx,d.x,d.y,d.r,d.seed,0.85);}
    else SA.scorch(ctx,d.x,d.y,d.r);
  }
}
function drawJuice(now){
  for(const v of vols){
    if(!v.draw)continue;
    const tt=(now-v.t0)/1000;
    if(tt>=0)SA.shot(ctx,v.key,v.x0,v.y0,v.x1,v.y1,tt,{mode:v.mode,plan:v.plan});
  }
  impFx=impFx.filter(f=>now-f.t0<f.dur);
  for(const f of impFx)SA.impact(ctx,f.x,f.y,Math.max(0,(now-f.t0)/f.dur),f.o);
  PFX.draw(ctx);
  jfx=jfx.filter(f=>now-f.t0<f.dur);
  for(const f of jfx){
    const k=Math.max(0,(now-f.t0)/f.dur);
    if(f.k==='ring')SA.ring(ctx,f.x,f.y,k,f.col,{r:f.r});
    else if(f.k==='shieldBreak')SA.shieldBreak(ctx,f.x,f.y,k);
    else if(f.k==='pickup')SA.pickup(ctx,f.item,f.x,f.y,k,now/1000);
  }
}
/* damage numbers, MISS and DOWN: drawn on screen over the world, anchored to it */
function drawPops(now){
  if(!pops.length)return;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  for(const p of pops){
    const k=(now-p.t0)/900;
    if(k<0||k>1)continue;
    const [x,y]=worldToCss(p.x,p.y);
    if(x<-100||x>cssW+100||y<-60||y>cssH+60)continue;
    SA.popText(ctx,p.text,x,y,k,p.col,{crit:p.crit,dir:p.dir,size:p.size||17});
  }
  ctx.restore();
  pops=pops.filter(p=>now-p.t0<900);
}
/* ---------- audio ---------- */
const sTick=A.tick;
/* ---------- a voice for every weapon ----------
   One VOICE entry per weapon: it plays a single round's report at `at` seconds. fireFx hands
   sShot the same volley plan the tracers draw from, so the burst you hear is the burst you
   see — eight tracers, eight reports, on the same clock. Ballistic reports are noise-led
   cracks; plasma is oscillator-led, and each plasma weapon sweeps its own way. ONCE layers
   play once per trigger pull, after the last round (the longiron's canyon echo). jt() wobbles
   each report a little so long bursts don't sound stamped out. */
const jt=f=>f*(0.95+rng()*0.1);
const VOICE={
  /* ballistic */
  akli:at=>{nz('highpass',2400,1,0.13,0.055,at);osc('square',jt(225),70,0.08,0.065,at);},
  razorrat:at=>{nz('highpass',2000,1,0.12,0.05,at);osc('square',jt(180),60,0.09,0.06,at);nz('lowpass',520,1,0.06,0.09,at);},
  hg40:at=>{nz('highpass',2900,1,0.14,0.05,at);osc('triangle',jt(330),95,0.08,0.06,at);},
  cowboy:at=>{nz('highpass',1700,1,0.17,0.08,at);osc('triangle',jt(170),55,0.13,0.11,at);nz('lowpass',520,1,0.09,0.15,at+0.02);},
  longiron:at=>{nz('highpass',3100,1,0.22,0.07,at);osc('square',jt(300),60,0.13,0.1,at);},
  scatter:at=>{osc('sine',jt(120),30,0.4,0.5,at);nz('lowpass',800,0.8,0.38,0.5,at,60);nz('bandpass',320,1.2,0.15,0.28,at+0.03);},
  strider:at=>{osc('sine',jt(115),40,0.2,0.1,at);nz('lowpass',900,1,0.15,0.12,at);nz('highpass',2200,1,0.07,0.04,at);},
  doorgun:at=>{osc('sine',jt(100),34,0.3,0.12,at);nz('lowpass',700,0.9,0.22,0.16,at);nz('highpass',2000,1,0.08,0.04,at);},
  rocket:at=>{nz('bandpass',260,1.6,0.22,0.6,at,1400);osc('sawtooth',jt(70),160,0.12,0.55,at);},   // the launch; the burst sounds when it lands
  /* plasma */
  carbine:at=>{osc('sawtooth',jt(1250),140,0.13,0.2,at);osc('square',jt(830),110,0.07,0.18,at);nz('highpass',3200,1,0.05,0.05,at);},   // EG-55: the military two-tone zap
  stiletto:at=>{osc('sawtooth',jt(1650),320,0.1,0.12,at);osc('sine',jt(2300),950,0.05,0.1,at);},   // sporting dart: cleaner, higher, shorter
  autohand:at=>{osc('square',jt(640),240,0.09,0.16,at);osc('square',jt(676),215,0.07,0.17,at);},   // Policebot arm-gun: two detuned squares beat against each other
  cruiser:at=>{osc('sawtooth',jt(700),90,0.12,0.22,at);osc('sine',jt(175),58,0.09,0.2,at);},   // Cruiser pulse cannon: deep and heavy
  dispersal:at=>{osc('sawtooth',jt(950),260,0.08,0.14,at);nz('bandpass',1500,2,0.08,0.12,at,500);},   // Dispersal turret: an airy splatter
  plasmasmg:at=>{osc('sawtooth',jt(1050),160,0.1,0.14,at);nz('bandpass',700,3,0.07,0.1,at+0.02);},   // unstable core: it crackles
  /* melee: the swing and the weight behind it */
  unarmed:at=>{nz('bandpass',500,2,0.08,0.13,at,1500);osc('sine',150,65,0.09,0.1,at+0.05);},
  fists:at=>{nz('bandpass',380,2,0.1,0.16,at,1200);osc('sine',120,45,0.14,0.14,at+0.05);},   // Riot Fists: heavier
  /* beams (mining laser, arclight): a sustained burn */
  mininglaser:at=>{osc('sawtooth',jt(320),180,0.1,0.3,at);osc('sine',jt(640),360,0.06,0.3,at);nz('highpass',3000,2,0.04,0.25,at);},
};
VOICE.arclight=VOICE.mininglaser;
const ONCE={
  longiron:at=>nz('bandpass',900,2,0.09,0.35,at+0.1,180),   // canyon echo
};
/* one report per round of the plan, on the plan's own clock; returns the report count */
function sShot(wkey,plan){
  const rounds=plan&&plan.rounds?plan.rounds:[{fire:0}];
  if(A.off())return rounds.length;
  const v=VOICE[wkey]||(WDAM[wkey]==='plasma'?VOICE.carbine:VOICE.akli);
  for(const r of rounds)v(r.fire||0);
  const o=ONCE[wkey];if(o)o(rounds[rounds.length-1].fire||0);
  return rounds.length;
}
function sRico(){if(A.off())return;osc('sine',1500+rng()*600,300,0.06,0.28,0.06);}
function sSizzle(){if(A.off())return;nz('bandpass',2600,4,0.06,0.18,0,900);osc('sawtooth',900,2200,0.03,0.14);}
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
  const now=clock();
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
  drawDecals();
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
  drawDecals();
  // street lamps — warm pools in a dust town
  const lampT=HUD.reduced?0:clock()/1000;
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
    ctx.fillStyle='rgba(120,190,255,'+(0.5+0.4*Math.sin(clock()*0.004+i))+')';
    ctx.beginPath();ctx.arc(px,py,4,0,7);ctx.fill();
  }
}
function drawProps(){
  /* retired: props draw in drawActors' depth sort; dead props leave kit scorch on the ground */
  return;
  const now=clock();
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
  if(!turretOn())return;
  const g=turret.gunner&&U.find(x=>x.id===turret.gunner);
  const c=engageQ&&engageQ.cur,t=HUD.reduced?0:now/1000;
  if(TURRET.bags)for(let i=-2;i<=2;i++){   // sandbags across the front: flank it or eat lead
    const a=turret.face+i*SANDBAG_ARC/2.4,R=TURRET.r+16;
    SA.prop(ctx,'sandbags',TURRET.x+Math.cos(a)*R,TURRET.y+Math.sin(a)*R*0.7,{t,biome:groundBiome()});
  }
  SA.deployable(ctx,'razorrat',TURRET.x,TURRET.y,turret.face,t,{gunner:g?artSpec(g):null,fire:!!(g&&c&&c.s===g&&c.stage==='fire'),s:actorScale(g||{})});
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
  const now=clock();
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
    const now=clock();
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
  SA.ship(ctx,'graf',d.x,d.y,d.a||0,5.0,HUD.reduced?0:(now||clock())/1000,{livery:'civ',damage:0.5,pilot:null,dark:true,off:true});
  plb('DERELICT HAULER',d.x,d.y-94,C.text2,12);
}
function drawGraf(now){
  now=now||clock();
  let sc=1,ox=0,oy=0;
  const lifting=!!(extractFx&&extractFx.stage==='lift');
  if(lifting){
    const t=Math.min(1,(now-extractFx.t0)/3200);
    const e=t*t;
    sc=1+t*0.3;
    ox=-e*1500;oy=e*260;
    if(t>=1)return;
  }
  if(grafState==='gone'&&!lifting)return;   // left the LZ (SCN.grafLeaves); the extraction lift draws itself
  const flying=grafState==='flying'&&!lifting;
  if(!lifting&&!flying)groundShadow(grafPos.x,grafPos.y,110,38);
  SA.ship(ctx,'graf',grafPos.x+ox,grafPos.y+oy,grafPos.a,5.0*sc*(flying?1.15:1),HUD.reduced?0:now/1000,
    {livery:'rebel',dark:true,boost:lifting||flying,off:!lifting&&!flying});
  if(!(extractFx&&extractFx.stage==='lift')&&!flying)plb(trName().toUpperCase(),grafPos.x,grafPos.y-96,C.shield,12);
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
  if(!crossFx)groundShadow(x,y,79,28);
  SA.ship(ctx,'cross',x,y,-0.5,3.4*sc,HUD.reduced?0:now/1000,{livery:'law',dark:true,boost:!!crossFx,off:!crossFx});
  if(!crossAway)plb('FT-4 CROSS',PAD.x,PAD.y+PAD.r+22,C.shield,12);
}

/* ---------- world art: who someone is (artSpec) and what they're doing (artPose) ---------- */
const SA=window.SR_ART;
const actorScale=u=>Math.max(1,0.9/cam.z);
/* item ids to the art kit's gear keys; anything the kit cannot draw is skipped */
const ART_GEAR={riotshield:'shield',blam:'frags'};
const kitArt=kit=>(kit||[]).map(id=>ART_GEAR[id]||id).filter(k=>(SA.GEAR&&SA.GEAR[k])||(SA.ITEMS[k]&&SA.ITEMS[k].cat==='armour'));   // head items draw too
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
const ORDER_POSE={deploy:'deploy',pack:'deploy',hack:'hack',work:'work',loot:'loot',man:'man',lockin:'lockin',leave:'extract',treat:'treat',stim:'treat'};
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
  if(u.dead)pose.dead=1;   // no stars over the dead
  if(c&&c.s===u&&!u.down)pose.aim=Math.atan2(c.t.y-u.y,c.t.x-u.x);   // pupils and gun track the target exactly
  let wk=u.wkey||(u.wpns&&u.wpns[0]);
  if(wk==='razorrat'&&!u.manning)wk=u.wpns&&u.wpns[0];   // the LMG stays on its tripod (or on their back)
  pose.weapon=(wk&&SA.WEAPONS[wk])?wk:null;              // unarmed, fists and the vehicle weapons draw nothing
  const base=(u.art&&u.art.gear)||(u.arch&&!u.art?artSpec(u).gear:null)||[];   // a rebel's kit, or what a roster enemy wears
  const g=[];
  if(u.shield)g.push('shield');
  if(u.side==='reb'&&!u.auto&&!u.vip&&!u.frail&&NADES>0)g.push('frags');
  if(u.stims>0)g.push('stim');
  if(u.charge)g.push('charge');
  if(g.length||base.length)pose.gear=[...new Set(base.concat(g))];
  const conds=(u.inj||[]).filter(i=>!i.treated).map(i=>i.k);
  if(conds.length)pose.conds=conds;
  if(u.art)pose.back=u.back||null;                       // a deployed back item leaves the back
  if(state==='fire'&&pose.weapon){const md=modeOf(u,pose.weapon);if(md)pose.mode=md;}
  if(now-(u._knockT||0)<700&&!u.down)pose.state='knocked';
  else if(stunned(u)&&!u.down&&!u.mnt)pose.state='stunned';   // concussed: spiral eyes and stars
  if(u.shd>0&&u.maxShd){pose.shield=u.shd/u.maxShd;const k=(now-(u._shHitT||0))/400;if(k<1)pose.shieldHit=1-k;}
  if(now-(u._deployT||0)<900&&!u.down)pose.state='deploy';
  if(!u.down){   // hit feedback: a white flash decaying at 5 a second, a squash at 6
    const fl=1-(now-(u._flashT||-1e9))/200,sq=1-(now-(u._sqT||-1e9))/167;
    if(fl>0)pose.flash=fl*0.85;
    if(sq>0&&!HUD.reduced)pose.squash=sq;
  } else if(u._downT)pose.fall=Math.min(1,(now-u._downT)/600);   // the topple, with its bounce                      // a Broken Arm from this fight shows a sling straight away
  return pose;
}
const actorList=()=>U.filter(u=>!u.extracted&&!(u.away&&!u.caged)&&!u.office&&!u.csHide&&!(u.landAt&&clock()<u.landAt)&&!(u.mnt&&enclosed(u))&&unitSeen(u));
function drawActors(now){
  const t=HUD.reduced?0:now/1000;
  const biome=groundBiome();
  /* dead props are scorch on the ground, under everything */
  for(const p of PROPS)if(p.dead)SA.scorch(ctx,p.x,p.y,PROPDEF[p.kind].r*1.5);
  const items=[];
  const list=actorList();
  for(const u of list)if(!u.elev)items.push({y:u.y,f:()=>drawUnitActor(u,now)});   // anyone on the tower stands on its deck (render)
  for(const p of PROPS)if(!p.dead)items.push({y:p.y,f:()=>SA.prop(ctx,p.kind,p.x,p.y,{t,biome})});
  for(const b of BLDGS)if(!b.terrain)items.push({y:b.y+b.h,f:()=>drawWallActor(b,now)});
  if(SCN.hasGraf)items.push({y:grafPos.y+50,f:()=>drawGraf(now)});
  if(SCN.derelict)items.push({y:SCN.derelict.y+50,f:()=>drawDerelict(now)});
  if(SCN.hasPad)items.push({y:PAD.y+36,f:()=>drawCross(now)});
  if(turretOn())items.push({y:TURRET.y,f:()=>drawTurret(now)});   // the Razorrat draws its own crouching gunner
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
  if(u.manning)return;                                    // drawn crouched behind the Razorrat (drawTurret)
  let x=u.x,y=u.y;
  if(u.mnt&&!enclosed(u)){x+=17;y-=31;}                  // an open gun seat perches on the hull
  SA.character(ctx,x,y,artSpec(u),artPose(u,now));
}
/* the layered vitals bar (art handoff): 5 health pips, an armour plate and a shield hex per 10 points (up to 5) */
const segs=(v,max,n)=>max>0?Math.ceil(Math.max(0,v)/max*n-0.001):0;
function vitalsOf(u){
  const armMax=u.maxArm?Math.min(5,Math.ceil(u.maxArm/10)):0,shMax=u.maxShd&&u.shd>0?Math.min(5,Math.ceil(u.maxShd/10)):0;
  return {hp:segs(u.hp,u.maxhp,5),hpMax:5,arm:segs(u.arm,u.maxArm,armMax),armMax,sh:segs(u.shd,u.maxShd,shMax),shMax};
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
function coverLevelAt(x,y){                   // what is there to hug, whatever the angle: 0 none, 1 half (crates, drums), 2 full (rock, truck, a wall)
  let best=wallsNear(x,y).length?2:0;
  for(const p of propsNear(x,y))best=Math.max(best,PROPDEF[p.kind].cov>=9?2:1);
  return best;
}
/* what a spot is worth to someone on this side against the shooters they know about: Covered (from all of them),
   Cover n/m (from some), Flanked (hugging cover that faces the wrong way), or just Cover when nobody is in sight */
function coverHint(x,y,side){
  const cv=coverVs(x,y,threatsTo(side));
  if(!cv.hug)return null;
  if(!cv.tot)return {lvl:coverLevelAt(x,y),text:'Cover',col:C.go};
  if(cv.n===cv.tot)return {lvl:cv.lvl,text:'Covered',col:C.go};
  if(cv.n)return {lvl:cv.lvl,text:'Cover from '+cv.n+' of '+cv.tot,col:C.gold};
  return {lvl:0,text:'Flanked',col:C.hazard};
}
/* a token's cover pip, worked out a few times a second (or when they move), not every frame */
function unitCoverHint(u){
  const now=clock();
  if(u._cvH===undefined||now-u._cvT>250||u._cvX!==u.x||u._cvY!==u.y){u._cvH=coverHint(u.x,u.y,u.side==='reb'?'reb':'law');u._cvT=now;u._cvX=u.x;u._cvY=u.y;}
  return u._cvH;
}
/* the spots in reach worth moving to: round every prop, and at every building corner (a corner is cover from round it) */
function coverSpots(x,y,reach,sparse){   // sparse: four round each prop, not eight (nobody in sight to judge them by)
  const out=[];
  for(const p of PROPS){
    const def=PROPDEF[p.kind];
    if(p.dead||def.cov<=0||Math.hypot(p.x-x,p.y-y)>reach+def.r+20)continue;
    for(let i=0;i<8;i+=sparse?2:1){const a=i*Math.PI/4;out.push({x:p.x+Math.cos(a)*(def.r+16),y:p.y+Math.sin(a)*(def.r+16)});}
  }
  for(const b of BLDGS)for(const [cx,cy,dx,dy] of [[b.x,b.y,-1,-1],[b.x+b.w,b.y,1,-1],[b.x,b.y+b.h,-1,1],[b.x+b.w,b.y+b.h,1,1]])
    for(const [ox,oy] of [[dx*16,dy*4],[dx*4,dy*16]])out.push({x:cx+ox,y:cy+oy});
  return out.filter(q=>Math.hypot(q.x-x,q.y-y)<=reach&&q.x>20&&q.x<W-20&&q.y>20&&q.y<H-20&&!ptBlocked(q.x,q.y,6));
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
  if(turretOn()&&cam.z>0.55){
    const g=turret.gunner&&U.find(x=>x.id===turret.gunner);
    const [x,y]=worldToCss(TURRET.x,TURRET.y+TURRET.r+22);
    L.add(g?'Razorrat · '+g.first:'Razorrat LMG · unmanned',x,y,{color:g?(g.side==='reb'?C.rebel:C.heg):C.text3,size:12},1);
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
      if(!u.surr&&!u.veh&&!u.mnt){const h=unitCoverHint(u);if(h&&h.lvl)T.coverPip(ctx,x-16*cam.z,y+8,h.lvl);}
      if(!u.surr){const v=vitalsOf(u),extra=(v.armMax?1:0)+(v.shMax?1:0);SA.vitals(ctx,x,topY-4-extra*8,Object.assign(v,{s:1}));}
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
    const nm=u.veh?(u.down?u.first+' · wreck':crew.length?u.first:u.first+' · empty'):civ?(u.cower?'Civilian · down flat':'Civilian'):u.dead?u.first+' · dead':u.down?u.first+' · down':u.surr?u.first+' · surrendered':u.first;
    if(u.mnt)continue;   // the gunner's name would sit on the vehicle's
    // allies and live enemies keep their tags; civilians, the fallen and wrecks only show theirs under the pointer
    const quietTag=civ||(u.down&&!reb)||(u.veh&&u.down);
    if(quietTag&&!(hoverCss&&Math.hypot(x-hoverCss.x,y-hoverCss.y)<34))continue;
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
let spotCache=null;   // the move picker's cover spots (drawOrders)
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
        const h=coverHint(o.tx,o.ty,'reb');
        if(h){if(h.lvl)T.coverPip(ctx,e[0]+18,e[1]-4,h.lvl);T.label(ctx,h.text,e[0],e[1]+22,{kind:'float',color:h.col,size:11});}
      } else if(o.type==='enter'){
        const v=U.find(x=>x.id===o.vid);
        if(v){const a=P(u.x,u.y),b=P(v.x,v.y);T.plotLine(ctx,a[0],a[1],b[0],b[1],'move',hudT);T.label(ctx,'Get in',b[0],b[1]-tokR(v)-22,{kind:'float',color:C.rebel,size:12});}
      } else if(o.type==='treat'){
        const t=treatPick(u,o.tid);
        if(t)treatMark(P,u,t,now);
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
      /* the cover spots in reach, judged against the hostiles in sight: bright where they cover from all of them,
         faint where only from some; a spot every one of them flanks is left out (a vehicle has no use for any) */
      if(!sel.mnt&&!sel.bot){
        const key=sel.id+':'+pickMode+':'+round+':'+Math.round(sel.x)+','+Math.round(sel.y);
        if(!spotCache||spotCache.key!==key||clock()-spotCache.t>400){   // worked out a few times a second, not every frame
          const th=threatsTo('reb');
          spotCache={key,t:clock(),list:coverSpots(sel.x,sel.y,reach,!th.length).map(q=>{
            const cv=coverVs(q.x,q.y,th),judged=cv.tot>0;
            return {x:q.x,y:q.y,lvl:judged?cv.lvl:coverLevelAt(q.x,q.y),a:!judged?0.4:cv.n===cv.tot?0.95:0.5};}).filter(q=>q.lvl)};
        }
        for(const q of spotCache.list){const [qx,qy]=P(q.x,q.y);ctx.globalAlpha=q.a;T.coverPip(ctx,qx,qy,q.lvl);}
        ctx.globalAlpha=1;
      }
      if(hoverW){
        const d=moveDest(mv,hoverW.x,hoverW.y,reach);
        const p=d&&pathFor(mv,d.x,d.y);
        if(p){
          ctx.globalAlpha=0.6;
          for(let i=1;i<p.length;i++){const a=P(p[i-1].x,p[i-1].y),b=P(p[i].x,p[i].y);T.plotLine(ctx,a[0],a[1],b[0],b[1],pickMode,hudT);}
          ctx.globalAlpha=1;
          const e=P(d.x,d.y),h=coverHint(d.x,d.y,'reb');
          if(h){if(h.lvl)T.coverPip(ctx,e[0]+18,e[1]-4,h.lvl);T.label(ctx,h.text,e[0],e[1]-22,{kind:'float',color:h.col,size:12});}
        }
      }
    } else if(sel&&pickMode==='treat'){
      const [sx,sy]=P(sel.x,sel.y);
      ctx.setLineDash([6,6]);ctx.beginPath();ctx.arc(sx,sy,treatReach(sel)*cam.z,0,7);ctx.lineWidth=2;ctx.strokeStyle=T.rgba(C.go,0.55);ctx.stroke();ctx.setLineDash([]);
      for(const t of treatCands(sel)){
        const [x,y]=P(t.x,t.y),r=(tokR(t)+12)*cam.z,pulse=0.5+0.5*Math.sin(now/200);
        ctx.beginPath();ctx.arc(x,y,r+pulse*4,0,7);ctx.lineWidth=3;ctx.strokeStyle=T.rgba(C.go,0.55+0.4*pulse);ctx.stroke();
      }
    } else if(sel&&pickMode==='hack'){
      const [sx,sy]=P(sel.x,sel.y);
      ctx.setLineDash([10,8]);ctx.beginPath();ctx.arc(sx,sy,HACK_R*cam.z,0,7);ctx.lineWidth=2.5;ctx.strokeStyle=T.rgba(C.shield,0.7);ctx.stroke();ctx.setLineDash([]);
    }
  }
  drawPing(now);
  ctx.restore();
}
/* a planned Treat wound: a green line from the medic to the patient, a ring and a cross on the patient, and their name */
function treatMark(P,u,t,now){
  const [x,y]=P(t.x,t.y),r=(tokR(t)+10)*cam.z,pulse=0.5+0.5*Math.sin(now/260);
  if(t!==u){const [ax,ay]=P(u.x,u.y);T.plotLine(ctx,ax,ay,x,y,'move',hudT);}
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=T.rgba(C.go,0.10+0.08*pulse);ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle=T.rgba(C.go,0.9);ctx.stroke();
  const cy=y-r-14,a=7,b=2.6;   // the cross
  ctx.fillStyle=C.go;ctx.strokeStyle=C.ink||'#0b0f1a';ctx.lineWidth=2;
  ctx.beginPath();ctx.rect(x-b,cy-a,b*2,a*2);ctx.rect(x-a,cy-b,a*2,b*2);ctx.stroke();ctx.fill();
  T.label(ctx,t===u?'Treat self':'Treat '+(t.first||t.name),x,cy-14,{kind:'float',color:C.go,size:12});
}
function drawPing(){
  if(!rtPing)return;
  const t=(clock()-rtPing.t0)/500;
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
  hitFx=hitFx.filter(f=>now-f.t0<f.dur);
  for(const f of hitFx){
    const k=Math.max(0,(now-f.t0)/f.dur);
    if(f.k==='shield')SA.shieldHit(ctx,f.x,f.y,k);
    else if(f.k==='armour')SA.armourHit(ctx,f.x,f.y,k);
    else if(f.k==='sunder')SA.sunder(ctx,f.x,f.y,k);
    else if(f.k==='pierce')SA.pierce(ctx,f.x0,f.y0,f.x,f.y,k);
  }
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
    if(m.taken||(fogOn()&&!m.spotted))continue;
    g.fillStyle=C.go;g.fillRect(ox+m.x*k-1.5,oy+m.y*k-1.5,3,3);
  }
  for(const u of U){
    if(u.extracted||u.away)continue;
    if(!unitSeen(u)&&!(SUP().minimap&&u.side==='law'))continue;   // Mission Intel (Analyst): every enemy on the minimap
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
/* a transport that leaves the LZ after the drop and comes back for the pickup (SCN.grafLeaves) */
let grafFx=null;
function grafFly(k,to,dur){grafState='flying';grafFx={k,t0:clock(),dur,from:{x:grafPos.x,y:grafPos.y},to};sTakeoff();}
function grafLeave(){
  grafFly('leave',{x:-600,y:H+400},3200);
  log('<b>'+grafName()+'</b> <span class="d">(comms):</span> You’re down. I’m off the deck before someone notices a hauler parked in town. I’ll be back for the pickup when the job’s done.');
}
function grafReturn(line){
  if(!SCN.grafLeaves||fs||grafState==='landed'||(grafFx&&grafFx.k==='return'))return;
  if(grafState==='gone'){grafPos.x=-600;grafPos.y=H+400;}
  ownGunDone();
  grafFly('return',{x:LZ.x,y:LZ.y},3800);
  if(line)log('<b>'+grafName()+'</b> <span class="d">(comms):</span> '+line);
}
function grafUpdate(now){
  // the job is done: the transport comes back for the squad
  if(SCN.grafLeaves&&!fs&&exitOpen()&&grafState!=='landed'&&!(grafFx&&grafFx.k==='return')&&phase!=='GAMEOVER'&&phase!=='CUTSCENE')
    grafReturn('That’s the job done. I’m coming back for you. Get to the LZ.');
  if(!grafFx)return;
  const t=Math.min(1,(now-grafFx.t0)/grafFx.dur),e=ease(t);
  grafPos.x=lerp(grafFx.from.x,grafFx.to.x,e);grafPos.y=lerp(grafFx.from.y,grafFx.to.y,e);
  grafPos.a=grafFx.k==='leave'?lerp(0.12,0.6,e):lerp(0.6,0.12,e);
  if(t>=1){
    const back=grafFx.k==='return';grafFx=null;grafState=back?'landed':'gone';
    if(back){sLand();log('<b>'+grafName()+'</b> <span class="d">(comms):</span> On the LZ. Ramp’s down. Get aboard.');syncUI();}
  }
}
function startCutscene(){
  phase='CUTSCENE';
  byId('app').classList.add('cine');
  const bn=byId('csBanner');
  bn.querySelector('.big').textContent=SCN.banner[0];
  bn.querySelector('.small').textContent=SCN.banner[1];
  byId('csSkip').hidden=false;
  cs={t0:clock(),fired:{}};
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
    sLand();SHK.add(0.3);
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
  if(SCN.grafLeaves)grafLeave();
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
let hoverW=null,hoverCss=null;
function render(rnow){
  try{
    const now=clock(rnow);
    const dt=Math.min(0.05,Math.max(0,now-(lastFrame||now))/1000),rdt=Math.min(0.05,Math.max(0,rnow-(lastReal||rnow))/1000);
    lastFrame=now;lastReal=rnow;
    SHK.enabled=!!(!SR.settings||SR.settings.shake())&&!HUD.reduced;SHK.update(rdt);
    PFX.update(dt);
    if(phase==='CUTSCENE'&&cs)csUpdate(now);
    if(phase!=='CUTSCENE'){fuelUpdate(now);grafUpdate(now);}
    if(phase==='FREE'&&!tutFrozen())rtUpdate(now,dt);   // a pause-card freeze stops movement, detection, AI and timers (A4)
    if(phase==='EXTRACT'&&extractFx)extractUpdate(now,dt);
    if(phase==='EXEC')execUpdate(now);
    vehSync();
    if(phase==='ENGAGE'){try{attackUpdate(now);}catch(e){recover(e);}}
    juiceTick(now);
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
    const sh=SHK.offset(rnow/1000);
    ctx.save();
    ctx.translate(cssW/2+sh.x,cssH/2+sh.y);ctx.rotate(sh.a);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
    drawGround();
    if(SCN.tumbleweed)drawTumbleweed(now);
    drawVision();
    drawWork(now);
    drawFactory(now);
    drawCage(now);
    drawFS(now);
    drawNades(now);
    if(SCN.hasTower)drawTowerBase();
    drawBldgs();                    // terrain plates only; walls join the actor sort
    hudUnderlay(now);               // rings and arcs under the feet
    drawActors(now);                // props, walls, landed ships and the Bobbleheads, one depth sort
    if(SCN.hasTower){
      drawTowerTop();
      for(const u of actorList())if(u.elev){   // drawn over the tower top, so the guard up there is seen and can be picked
        const c=engageQ&&engageQ.cur;
        if(c&&c.t===u&&!u.down){ctx.save();ctx.translate(u.x,u.y);ctx.scale(1,0.5);T.reticle(ctx,0,0,30,hudT);ctx.restore();}
        drawUnitActor(u,now);
      }
    }
    hudA(now);                      // pips, markers, names: before the fog, so unseen ground stays dark
    drawFog();
    drawFx(now);
    drawJuice(now);                 // volleys, impacts, particles, rings, shield breaks, pickups
    drawDgRun(now);                 // the gun run flies above the fog: everyone watches this
    drawFsFx(now);                  // strafing runs, supply drops and landings, likewise
    ctx.restore();
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(phase==='ENGAGE')drawEngageFocus(now);
    drawOrders(now);
    drawFloaters(now);
    drawPops(now);
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
cv.addEventListener('pointerleave',()=>{hoverCss=null;});
cv.addEventListener('dblclick',ev=>{
  const u=unitAtCss(ev.offsetX,ev.offsetY)||U.find(x=>x.side==='reb'&&x.down&&!x.veh&&(()=>{const [px,py]=tokCss(x);return Math.hypot(px-ev.offsetX,py-ev.offsetY)<26;})());
  if(u)openFile(u);
});
cv.addEventListener('pointermove',ev=>{
  const p=ptrs.get(ev.pointerId);
  if(p){p.x=ev.offsetX;p.y=ev.offsetY;}
  hoverW=cssToWorld(ev.offsetX,ev.offsetY);
  hoverCss={x:ev.offsetX,y:ev.offsetY};
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
    if(pickMode&&pickMode.startsWith('fs:')){   // a supply drop called before the shooting starts
      const done=fsPlace(pickMode.slice(3),cssToWorld(px,py));
      if(done){pickMode=null;fsDraft=null;}
      syncUI();return;
    }
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
    if(pickMode==='treat'&&sel){
      const t=unitAtCss(px,py),cs=treatCands(sel);
      if(t&&cs.includes(t)){sel.order={type:'treat',tid:t.id};sTick();pickMode=null;addFloater(t.x,t.y-56,t===sel?'TREAT SELF':'TREAT '+(t.first||t.name).toUpperCase(),C.go);autoAdvance();syncUI();}
      else addFloater(sel.x,sel.y-40,'TAP A WOUNDED REBEL IN REACH',C.text3);
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
  hold:{label:'Hold',icon:'hold',family:'stance',key:'3',rule:'Brace and watch. Fire on anyone who crosses your lane. A Steady weapon (the Longhorn) takes +2 while braced.',
    nums:[{t:'+2 attack with a Steady weapon',kind:'good'},{t:'−2 snap shot',kind:'bad'}]},
  cover:{label:'Take cover',icon:'cover',family:'stance',key:'4',rule:'Press up against the cover you are next to: +'+TAKE_COVER+' Defence on top of it this round, against shots it stands in the way of. Cover only counts when it is between you and the shooter; from the side you are flanked. You still shoot this round.'},
  lockin:{label:'Lock in',icon:'lockin',family:'nerve',key:'5',rule:'Steady your nerve. A panicking rebel can do nothing else.'},
  loot:{label:'Loot',icon:'loot',family:'util',key:'6',rule:'Grab anything lootable within reach at the end of the round.'},
  work:{label:'Work',icon:'work',family:'util',key:'7',rule:'Finish a job at a panel, clamp or fuel line.'},
  deploy:{label:'Deploy',icon:'turret',family:'util',key:'8',rule:'Set up what is on your back as the round opens: a Razorrat LMG where you stand (you get behind it), or a riot shield in your hands in place of your primary weapon. No shot this round.'},
  man:{label:'Man gun',icon:'turret',family:'stance',key:'8',rule:'Get behind the Razorrat LMG. Its sandbags cover shots from the front (+'+SANDBAG_COVER+' TN).'},
  leave:{label:'Leave gun',icon:'leave',family:'stance',key:'8',rule:'Step off the gun at the end of the round and go back to your own weapons. The gun stays set up for anyone to man.'},
  pack:{label:'Pack up gun',icon:'turret',family:'stance',key:'9',rule:'Fold the Razorrat LMG up at the end of the round and sling it on your back, ready to set up somewhere else. No shot this round.'},
  clear:{label:'Un-jam',icon:'unjam',family:'util',key:'8',rule:'Strip and clear a jammed Akli.'},
  hack:{label:'Hack',icon:'hack',family:'util',key:'8',rule:'Take control of an enemy Auto in range. It takes a few rounds.'},
  fs:{label:'Fire support',icon:'firesupport',family:'fight',key:'9',rule:'Call in a supply drop, a strafing run, a gunship, reinforcements, or a vehicle or Bot you brought.'},
  treat:{label:'Treat wound',icon:'patch',family:'util',key:'',rule:'Use a Med Pack to patch the worst untreated injury on yourself or an ally within reach. A stunned or downed ally can only be treated by someone else. A Combat Medic reaches further and a pack covers two wounds.'},
  stim:{label:'Stim',icon:'stim',family:'util',key:'',rule:'Slam a stim as the round opens: heal 30% of max health. An Action, so you still shoot this round.'},
  enter:{label:'Enter',icon:'enter',family:'move',key:'8',rule:'Walk to a vehicle within reach and climb in at the end of the move. Inside an enclosed seat you cannot be shot: the vehicle takes the hits.'},
  exit:{label:'Exit',icon:'leave',family:'move',key:'8',rule:'Get out of the vehicle as the round opens. No shot this round.'},
  switch:{label:'Switch position',icon:'switch',family:'stance',key:'',rule:'Move to another free position in this vehicle as the round opens. No shot this round.'},
  rally:{label:'Rally cry',icon:'firesupport',family:'fight',key:'0',rule:'Hero action, once per mission. Every rebel still on their feet steadies and takes +2 to hit this round.',nums:[{t:'+2 attack, all allies',kind:'good'}]},
  cancel:{label:'Clear',icon:'clear',family:'',key:'X',rule:'Cancel this rebel’s order.'}};
const WICON={};for(const k in WPN)WICON[k]=WPN[k].icon;
function activeWork(s){
  return WORK.find(w=>!w.done&&(!s.mnt||w.inVeh)&&(!w.needSpec||hasSp(s,w.needSpec))&&(!w.needCharge||s.charge)&&!(w.needClear&&hostilesActive().length)&&Math.hypot(s.x-w.x,s.y-w.y)<MOVE_R+60);
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
  if(s.manning){const c=[card('hold',{active:cur==='hold'}),card('leave',{active:cur==='leave'})];
    if(TURRET.field)c.push(card('pack',{active:cur==='pack',disabled:!canPack(s),why:'Stunned.'}));
    return c;}
  if(stunned(s))return [card('hold',{disabled:true,why:'Stunned for this round. It wears off as the round ends, or another rebel can treat it now.'})];
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
  if(turretOn()&&!turret.gunner&&dist(s,TURRET)<MOVE_R+60)g3.push(card('man',{active:!pm&&cur==='man'}));
  if(canPack(s))g3.push(card('pack',{active:!pm&&cur==='pack'}));
  if(s.back&&DEPLOY[s.back])g3.push(card('deploy',{active:!pm&&cur==='deploy',disabled:!canDeploy(s)||!!deployWhy(s),why:deployWhy(s)||'Not now.',
    tip:{title:'Deploy '+Items.name(s.back),rule:OM.deploy.rule}}));
  if(hackTargets(s).length)g3.push(card('hack',{active:pm==='hack'||(!pm&&cur==='hack'),disabled:injOf(s,'shrapnel'),why:'Suppressed by shrapnel.'}));
  if(s.jam)g3.push(card('clear',{active:!pm&&cur==='clear'}));
  {const et=enterTargets(s);if(et.length)g3.push(card('enter',{active:!pm&&cur==='enter',tip:{title:'Enter',rule:OM.enter.rule+' Nearest: '+et[0].name+'.'}}));}
  if(fsItems().length)g3.push(card('fs',{active:fsMenuOn||(pm&&pm.startsWith('fs:'))}));
  if(s.hero)g3.push(card('rally',{active:!pm&&cur==='rally',disabled:!!s.heroUsed||injOf(s,'shrapnel'),why:injOf(s,'shrapnel')?'Suppressed by shrapnel.':'Already used this mission.'}));
  if(s.side==='reb'&&!s.auto)g3.push(card('stim',{label:'Stim ×'+(s.stims||0),active:!pm&&cur==='stim',disabled:!s.stims||s.hp>=s.maxhp||!!injOf(s,'shrapnel'),
    why:!s.stims?'No stim left.':injOf(s,'shrapnel')?'Suppressed by shrapnel.':'Already at full health.'}));
  {const tp=treatPick(s),tt=treatTarget(s);g3.push(card('treat',{label:'Treat wound ×'+(s.meds||0),active:pm==='treat'||(!pm&&cur==='treat'),disabled:!tp,why:tt&&!s.meds?'No med pack left.':'Nobody within reach has a wound to treat.',tip:{title:'Treat wound',rule:OM.treat.rule+(tp?' Next: '+(tp===s?'yourself':tp.first)+'.':'')}}));}
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
    const hasTech=U.some(x=>hasSp(x,'fieldtech')&&!x.down&&!x.extracted&&!x.away);
    const calm=town==='calm';
    const orders=[HUD.order({id:'sneakBtn',label:'Sneak',icon:'sneak',family:'stance',key:'C',active:sneak,disabled:!calm,why:calm?'':'The alarm is up. Sneaking no longer helps.',
      tip:{title:'Sneak',rule:'Go low and slow: half the pace, but much harder to spot.'}})];
    if(hasTech&&U.some(x=>x.side==='law'&&x.auto&&x.hackRounds&&!x.down))
      orders.push(HUD.order({id:'hackBtn',label:'Hack',icon:'hack',family:'util',active:hackArm,tip:{title:'Hack',rule:OM.hack.rule}}));
    const gunner=U.find(x=>x.side==='reb'&&x.manning&&!x.down);
    if(gunner){
      orders.push(HUD.order({id:'leaveBtn',label:'Leave gun',icon:'leave',family:'stance',tip:{title:'Leave gun',rule:OM.leave.rule}}));
      if(TURRET.field)orders.push(HUD.order({id:'packBtn',label:'Pack up gun',icon:'turret',family:'stance',disabled:!canPack(gunner),why:'Not now.',tip:{title:'Pack up gun',rule:'Fold the Razorrat LMG up and sling it on '+gunner.first+'’s back.'}}));
    }
    if(U.some(x=>x.side==='reb'&&x.mnt))
      orders.push(HUD.order({id:'vehOutBtn',label:'Exit',icon:'leave',family:'move',tip:{title:'Exit',rule:'Everyone in a vehicle gets out. Tap a vehicle to send the nearest rebel in.'}}));
    let go='';
    if(extractReady())go=HUD.btn({id:'extractBtn',label:'Extract',icon:'extract',variant:'primary',size:'lg',go:true,iconAfter:true});
    else if(callBtn)go=HUD.btn({id:'callBtn',label:mtx(SCN.mt.button),icon:'ship',variant:'primary',size:'lg',go:true,iconAfter:true});
    else if(detOn)go=detBtn();
    const hint=(SR.touch?'Tap to move. Tap an enemy to open fire.':'Right-click to move. Click an enemy to ambush.')+(crossAway?'':' Watch the sight cones.');
    return HUD.cmdbar({
      who:{lead:'<span class="sr-avatar">'+HUD.ico('soldier')+'</span>',name:sneak?'Sneaking':'Walking',hint},
      orders,go:go?{html:go}:null});
  }
  if(phase==='PLANNING'){
    const s=U.find(x=>x.id===selId);
    const squad=plotted(),done=squad.filter(u=>u.order).length;
    const extra=(callBtn?HUD.btn({id:'callBtn',label:mtx(SCN.mt.button),icon:'ship',size:'sm'}):'')+(detOn?detBtn().replace('sr-btn--lg','sr-btn--sm'):'');
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
        disabled:!ok,why,attrs:'data-wsel="'+w+'"',tip:{title:WPN[w].name,rule:'Damage '+WPN[w].d0+' to '+WPN[w].d1+', range '+WPN[w].rng+'.'+traitText(w)}}));
    }
    if(c.s.side==='reb'&&modesOf(c.wkey).length>1)orders.push(modeToggleHTML(c.s,c.wkey));
    if(canNade)orders.push(HUD.order({label:'Grenade ×'+NADES,icon:'grenade',family:'fight',key:key(),active:pickMode==='nadeToss',attrs:'data-nade',
      tip:{title:'BLAM frag',rule:'Tap the ground to throw. It lands primed and goes off next round.'}}));
    if(c.s.side==='reb'&&c.s.maxShd>0)orders.push(HUD.order({label:'Shield up',icon:'shield',family:'util',key:key(),attrs:'data-shield',
      disabled:c.s.shd>=c.s.maxShd,why:'The shield is already up.',tip:{title:'Shield up',rule:'Raise a '+c.s.maxShd+'-point shield over armour and health. It takes hits first. Costs the shot.'}}));
    return HUD.cmdbar({
      who:{lead:whoLead(c.s),name:c.s.name,hint:pickMode==='nadeToss'?'Tap the ground to throw. It goes off next round.':'Pick a weapon or retarget'},
      orders,go:{html:HUD.btn({id:'attackBtn',label:'Attack',icon:'attack',variant:'primary',size:'lg'})+
        HUD.btn({id:'holdBtn',label:'Hold fire',variant:'ghost',size:'sm'}),
        count:'Shot <b>'+Math.min(engageQ.idx,engageQ.list.length)+'</b> of '+engageQ.list.length}});
  }
  return '';
}
/* the fire-mode toggle (art handoff): a segmented control in the attack window, shown when the weapon has two
   or more modes; the selected one is gold and pressed in, and F cycles through them */
const traitImgCache={};
function traitImg(k){
  if(traitImgCache[k]!==undefined)return traitImgCache[k];
  let u='';
  try{const c2=document.createElement('canvas');c2.width=c2.height=96;const g=c2.getContext('2d');g.scale(2,2);SA.icon(g,k,24,24,40,{bare:true});u=c2.toDataURL();}catch(e){u='';}
  return traitImgCache[k]=u;
}
function traitText(w){
  const ks=(Items.traits(w)||[]).filter(k=>SA.TRAITS[k]);
  return ks.length?' '+ks.map(k=>SA.TRAITS[k].name+': '+SA.TRAITS[k].text).join(' '):'';
}
function modeToggleHTML(s,wkey){
  const cur=modeOf(s,wkey);
  return '<div class="fm-toggle" role="group" aria-label="Fire mode, F to cycle"><span class="fm-toggle__lab">Fire mode · F</span><span class="fm-toggle__row">'+
    modesOf(wkey).map(m=>{const T2=SA.TRAITS[m]||{name:m,text:''},on=m===cur;
      return '<button type="button" class="fm-btn'+(on?' is-on':'')+'" data-fmode="'+m+'" aria-pressed="'+on+'" title="'+T2.name+': '+T2.text+'">'+
        (traitImg(m)?'<img src="'+traitImg(m)+'" alt="">':'')+'<span>'+T2.name+'</span></button>';}).join('')+'</span></div>';
}
function pickFireMode(m){
  const c=engageQ&&engageQ.cur;
  if(!c||c.stage!=='await')return;
  setMode(c.s,c.wkey,m);
  c.atk=computeATK(c.s,c.t,c.wkey,false);c.revealA=c.atk.entries.length;c.need=needFor(c.tn.total,c.atk.total);
  sTick();syncUI();
}
/* rail rows */
const ORDER_TAG={deploy:['turret','Deploy'],move:['move','Move'],sprint:['sprint','Sprint'],hold:['hold','Hold'],cover:['cover','Cover'],lockin:['lockin','Lock in'],rally:['firesupport','Rally'],treat:['patch','Treat'],loot:['loot','Loot'],work:['work','Work'],man:['turret','Man gun'],leave:['leave','Leave gun'],pack:['turret','Pack up'],enter:['enter','Enter'],exit:['leave','Exit'],switch:['switch','Switch'],clear:['unjam','Un-jam'],hack:['hack','Hack']};
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
  if(u.manning)return tag('On the gun','friend','turret');
  if(u.office)return tag('In his office','');
  if(u.id==='sera'&&!crossAway&&dist(u,PAD)<PAD.r)return tag('Hotwiring '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,'action');
  if(u.jam)return tag('Jammed','bad','unjam');
  if(stunned(u))return tag('Stunned','bad');
  if(hasInj(u))return tag(Rebel.INJK[u.inj.find(i=>!i.treated).k].n,'bad');
  if(u.side==='reb'&&phase==='PLANNING'){
    if(!u.order)return '<span class="sr-ordertag sr-ordertag--none">No orders</span>';
    const m=ORDER_TAG[u.order.type]||['move',u.order.type];
    if(u.order.type==='treat'){const t=treatPick(u,u.order.tid);return '<span class="sr-ordertag">'+HUD.ico(m[0])+(t?'Treat '+(t===u?'self':HUD.esc(t.first||t.name)):'Treat')+'</span>';}
    return '<span class="sr-ordertag">'+HUD.ico(m[0])+m[1]+'</span>';
  }
  if(u.mnt){const st=seatOf(u),v=vehOf(u);if(st&&v)return tag(st.n+' \u00b7 '+v.first,u.side==='reb'?'friend':'',st.wkey?'turret':'vehicle');}
  if(u.side==='reb'&&phase==='FREE'&&u.rtPath)return tag('Moving','',null);
  if(u.side==='law'&&coverVs(u.x,u.y,threatsTo('law')).n)return tag('Cover','good','cover');
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
  const bar=(v,max,c,lab)=>{let g='';for(let i=0;i<5;i++)g+='<i class="sr-hp__cell'+(v>i*(max/5)?' is-on':'')+'"></i>';
    return '<span class="sr-hp sr-hp--layer" style="--hp:var('+c+')"'+HUD.tip(lab,Math.max(0,Math.round(v))+' of '+max)+'><span class="sr-hp__cells">'+g+'</span>'+
      (foe?'':'<span class="sr-hp__num">'+Math.max(0,Math.round(v))+'</span>')+'</span>';};
  const hp=(u.maxShd&&u.shd>0?bar(u.shd,u.maxShd,'--sr-shield','Shield').replace('sr-hp--layer','sr-hp--layer sr-hp--shd'):'')+(u.maxArm?bar(u.arm,u.maxArm,'--sr-steel','Armour').replace('sr-hp--layer','sr-hp--layer sr-hp--arm'):'')+
    '<span class="sr-hp'+(frac<0.35?' sr-hp--low':frac<0.6?' sr-hp--mid':'')+'"><span class="sr-hp__cells">'+cells+'</span>'+
    (foe?'':'<span class="sr-hp__num">'+Math.max(0,Math.round(u.hp))+'</span>')+'</span>';
  const nm=u.name+(u.charge?' ✸':'')+(hasSp(u,'fieldtech')?' ⌨':'');
  const gone=u.down||u.extracted||u.away||u.surr;
  const cls='sr-unit'+(foe?' sr-unit--foe':'')+(u.id===selId?' is-selected':'')+(gone?' is-down':'')+(c&&c.s===u?' is-acting':'');
  // faces, as on the base's crew list and the briefing; initials only where there is no art (vehicles)
  const face=u.veh?null:portraitImg({id:foe?'foe:'+(u.arch||u.type||u.id):u.id,art:u.art||(u.arch||u.auto?artSpec(u):null)});
  const av=foe?HUD.avatar({initials:HUD.initials(u.first),img:face,cls:'sr-avatar--foe'}):
    HUD.avatar({name:u.name,img:face,cls:u.id==='sera'?'sr-avatar--pilot':'',badge:u.id==='sera'?'pilot':(u.auto||u.vip)?null:'soldier'});
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
let lastObjs=null;   // the objectives as last shown; the debrief reports which were met
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
/* a mission type's live objectives: the words from its text set (game/js/mission-text.js), what is done and what is
   current from the scene, and a progress count where there is one */
function typeObjectives(soldiers,ext){
  const k=MT.keyForScenario(SCN.mode),won=!!(phase==='GAMEOVER'&&gameEnd&&gameEnd.win),aboard=[ext,soldiers.length];
  let st={};
  if(k==='fuel'){
    st={reach:{done:fs.reached,now:!fs.reached},call:{done:fs.landed,now:fs.reached&&!fs.landed},
      defend:{done:fs.done,now:fs.landed&&!fs.done,prog:[Math.min(fs.pump,FUEL_ROUNDS),FUEL_ROUNDS]},aboard:{done:won,now:fs.done,prog:aboard}};
  } else if(k==='intel'){
    const tech=U.find(u=>hasSp(u,'fieldtech')&&!u.down),hk=WORK.find(w=>w.id==='hack'),R=(hk&&hk.rounds)||3;
    if(!ix.reached&&tech&&U.some(u=>u.side==='reb'&&!u.away&&!u.down&&dist(u,PAD)<260))ix.reached=true;
    st={reach:{done:ix.reached||ix.hacked,now:!ix.reached&&!ix.hacked,who:tech&&{hacker:tech.first}},
      hack:{done:ix.hacked,now:ix.reached&&!ix.hacked,prog:[Math.min((hk&&hk.prog)||0,R),R]},
      extract:{done:won,now:ix.hacked,prog:aboard}};
  } else if(k==='autofactory'){
    const carrier=U.find(u=>u.charge&&!u.down);
    st={carry:{done:fac.planted,now:!fac.planted,who:carrier&&{carrier:carrier.first}},plant:{done:fac.planted,now:false},
      detonate:{done:fac.detonated,now:fac.planted&&!fac.detonated},
      quiet:{done:fac.detonated&&fac.quiet,now:false,fail:fac.everAlerted&&!fac.detonated},
      extract:{done:won,now:fac.detonated,prog:aboard}};
  } else if(k==='towers'){
    const carrier=U.find(u=>u.charge&&!u.down);
    st={reach:{done:fac.planted,now:!fac.planted,who:carrier&&{carrier:carrier.first,device:MT.COMMON.devices[carrier.device==='limpet'?'limpet':'charge']}},
      attach:{done:fac.planted,now:false},
      quiet:{done:fac.planted&&fac.quiet&&won,now:false,fail:fac.everAlerted&&!fac.planted},
      extract:{done:won,now:fac.detonated,prog:aboard}};
  } else if(k==='rescue'){
    const v=U.find(u=>u.vip);
    if(!rs.reached&&v&&U.some(u=>u.side==='reb'&&!u.away&&!u.down&&dist(u,{x:SCN.cage.dx,y:SCN.cage.dy})<260))rs.reached=true;
    st={reach:{done:rs.reached||rs.released,now:!rs.reached&&!rs.released},release:{done:rs.released,now:rs.reached&&!rs.released},
      quiet:{done:rs.released&&!rs.everAlerted&&won,now:false},extract:{done:won,now:rs.released,prog:aboard}};
  }
  return SCN.mt.obj.map(o=>{
    const x=st[o.k]||{};
    return {t:mtx(o.t)+(x.who&&o.who?' — '+mtx(o.who,x.who):'')+(x.prog?' — '+x.prog[0]+'/'+x.prog[1]:''),done:!!x.done,now:!!x.now,fail:!!x.fail};
  });
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
  } else if(SCN.mt){
    objs=typeObjectives(soldiers,ext);
  } else if(rs){
    const v=U.find(u=>u.vip);const nm=v?v.first:'the prisoner';const RO=SCN.releaseText?SCN.releaseText.obj:null;
    if(!rs.reached&&v&&U.some(u=>u.side==='reb'&&!u.away&&!u.down&&dist(u,{x:SCN.cage.dx,y:SCN.cage.dy})<260))rs.reached=true;
    objs=[
      {t:RO?RO[0]:'Reach the detention cage',done:rs.reached||rs.released,now:!rs.reached&&!rs.released},
      {t:RO?RO[1]:'Release '+nm+' from confinement',done:rs.released,now:rs.reached&&!rs.released},
      {t:(RO?RO[2]:'(Optional) Stay unseen'),done:rs.released&&!rs.everAlerted&&phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:false},
      {t:(RO?RO[3]:'Get '+nm+' and the squad aboard')+' — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:rs.released},
    ];
  } else {
  const wClamp=WORK.find(w=>w.id==='clamp'),wFuel=WORK.find(w=>w.id==='fuel');
  objs=[
    {t:'Get Sera to the Cross on the north pad',done:!!(sera&&(sera.reached||sera.away)),now:!(sera&&sera.reached)},
    {t:'Protect her while she hotwires — '+Math.min(hot,HOT_ROUNDS)+'/'+HOT_ROUNDS,done:hot>=HOT_ROUNDS||crossAway,now:!!(sera&&sera.reached&&hot<HOT_ROUNDS&&!crossAway)},
    {t:'Release the docking clamps',done:!!(wClamp&&wClamp.done)||crossAway,now:!!(sera&&sera.reached&&wClamp&&!wClamp.done)},
    {t:'Pull the fuel line',done:!!(wFuel&&wFuel.done)||crossAway,now:!!(sera&&sera.reached&&wFuel&&!wFuel.done)},
    {t:'Cross in the air',done:crossAway,now:false},
    {t:'Extract the squad at the '+trName()+' — '+ext+'/'+soldiers.length,done:phase==='GAMEOVER'&&gameEnd&&gameEnd.win,now:crossAway},
  ];
  }
  {
    const first=objs.find(o=>o.now&&!o.done)||objs.find(o=>!o.done);
    for(const o of objs)o.cur=!o.done&&(o.now||(!objs.some(x=>x.now&&!x.done)&&o===first));
    const ob=$('objBox'),hideO=phase==='BRIEF'||phase==='CUTSCENE'||phase==='INTRO'||phase==='GAMEOVER';
    ob.hidden=hideO;
    ob.classList.toggle('is-compact',phase==='PLANNING'||phase==='EXEC'||phase==='ENGAGE');
    HUD.render($('objList'),objs.map(objRow).join(''));
    lastObjs=objs;
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
  if(pickMode==='treat')return 'Tap the rebel to treat';
  if(pickMode&&pickMode.startsWith('fs:')){
    const key=pickMode.slice(3),r=fsRows().find(x=>x.key===key);
    const fa=key[0]==='s'&&FS?FS.ships[+key.slice(1)]:null;
    const nm=r?'<b class="fsm-pick" style="--k:'+FS_KIND[r.kind].c+'">'+HUD.ico(FS_KIND[r.kind].ic)+r.name+'</b> ':'';
    if(fsDraft)return nm+'Tap where the run ends <span class="fsm-step">2 of 2</span>';
    if(fa&&fa.mode==='strafe')return nm+'Tap where the run starts <span class="fsm-step">1 of 2</span>';
    return nm+(fa&&fa.mode==='doorgun'?'Tap the zone to cover':key==='evac'?'Tap a downed squad mate':key[0]==='v'||(fa&&fa.mode==='reinforce')?'Tap where it sets down':'Tap a spot the squad can see');
  }
  const s=U.find(x=>x.id===selId);
  return 'Pick a destination for '+(s?s.first:'the squad');
}
function syncBar(){
  const c=engageQ&&engageQ.cur;
  const pick=!!pickMode||(hackArm&&phase==='FREE');
  PILL.hidden=!pick;
  if(pick)HUD.render(PILL,pickText()+' <span class="sr-kbd">Esc</span>');
  if(phase!=='PLANNING'&&phase!=='FREE')fsMenuOn=false;
  const fsl=fsItems().filter(i=>phase!=='FREE'||FREE_FS.includes(i.key));
  const fsBox=byId('fsBox'),fsLive=!!FS&&phase!=='BRIEF'&&phase!=='CUTSCENE'&&phase!=='GAMEOVER';
  fsBox.hidden=!fsLive;
  if(fsLive){
    const canCall=(phase==='PLANNING'||(phase==='FREE'&&!tutFrozen()))&&fsl.length>0;
    HUD.render(byId('fsBtnHost'),HUD.btn({id:'fsBtn',label:'Fire support',icon:'firesupport',size:'sm',soft:!canCall,
      pressed:canCall?fsMenuOn:null,
      tip:{title:'Fire support',rule:'Call in the support you arranged: a supply drop, a strafing run, a door gunner or reinforcements.'},
      why:canCall?'':fsl.length?'Calls are made while planning the round.':phase==='FREE'&&fsItems().length?'Only the supply drop and a scan can be called before the shooting starts.':'Everything arranged for this run has been used.'})+
      (fsl.length?'<span class="sr-badge">'+fsl.length+'</span>':''));
  }
  FSM.hidden=!(fsMenuOn&&fsl.length);
  if(!FSM.hidden)HUD.render(FSM,fsMenuHTML());
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
  else if(act==='deploy'){if(canDeploy(s)&&!deployWhy(s)){s.order={type:'deploy'};autoAdvance();}}
  else if(act==='treat'){   // one patient in reach: treat them; more: tap the one to treat
    const cs=s.meds>0?treatCands(s):[];
    if(cs.length===1){s.order={type:'treat',tid:cs[0].id};autoAdvance();}
    else if(cs.length>1)pickMode='treat';
  }
  else if(act==='stim'){if(s.stims>0&&s.hp<s.maxhp){s.order={type:'stim'};autoAdvance();}}
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
  else if(act==='pack'){if(canPack(s)){s.order={type:'pack'};autoAdvance();}}
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
  else if(b.id==='leaveBtn'||b.id==='packBtn'){const g=U.find(x=>x.side==='reb'&&x.manning);if(g){if(b.id==='packBtn')packTurret(g);else unmanTurret(g);}}
  else if(b.id==='extractBtn')startExtract();
  else if(b.id==='callBtn')callTransport();
  else if(b.id==='detBtn')facDetonate();
  else if(b.id==='attackBtn')playerAttack();
  else if(b.id==='holdBtn')playerHold();
  else if(b.hasAttribute('data-stim')){
    const c=engageQ&&engageQ.cur;
    if(c&&c.stage==='await')useStim(c.s);
  }
  else if(b.hasAttribute('data-shield')){
    const c=engageQ&&engageQ.cur;
    if(c&&c.stage==='await'&&raiseShield(c.s)){sTick();engageQ.cur=null;engageQ.nextAt=clock()+450;syncUI();}
  }
  else if(b.hasAttribute('data-nade')){
    if(engageQ&&engageQ.cur&&engageQ.cur.stage==='await'&&NADES>0){
      pickMode=(pickMode==='nadeToss')?null:'nadeToss';
      sTick();syncUI();
    }
  }
  else if(b.hasAttribute('data-fmode')&&engageQ&&engageQ.cur&&engageQ.cur.stage==='await'){
    pickFireMode(b.getAttribute('data-fmode'));
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
  if(!b||b.getAttribute('aria-disabled')==='true'||(phase!=='PLANNING'&&phase!=='FREE'))return;
  sTick();fsMenuOn=!fsMenuOn;syncUI();
});
FSM.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-fs]');
  if(!b)return;
  if(b.getAttribute('data-fs')==='scan'){   // no target: it covers the whole map
    FS.scanUsed=1;scanRound=round;fsMenuOn=false;sTick();
    log('<span class="g">Overwatch:</span> Mission Control lights up every contact on the map. <b>This round only.</b>');
    syncUI();return;
  }
  pickMode='fs:'+b.getAttribute('data-fs');fsDraft=null;fsMenuOn=false;sTick();syncUI();
});
byId('panel').addEventListener('dblclick',ev=>{
  const r=ev.target.closest('[data-unit]');
  if(r)openFile(U.find(u=>u.id===r.getAttribute('data-unit')));
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
$('logBtn').addEventListener('click',openLog);
/* menu: sound, reports, controls, restart (asks first), debug */
const menuEl=$('gMenu');
menuEl.innerHTML=HUD.menuHtml([
  {id:'menuSound',icon:'soundon',label:'Sound',kbd:'M'},
  {id:'menuLog',icon:'comms',label:'All reports'},
  {id:'menuControls',icon:'help',label:'Controls'},
  ...SR.settings.menuItems(),
  {sep:1},
  {id:'restartBtn',icon:'restart',label:'Restart mission',kind:'danger'},
  {id:'dbgSkip',icon:'debug',label:'Debug: skip mission',kind:'debug'}]);
HUD.menuBind(menuEl,$('menuBtn'));
SR.settings.bind(menuEl);
A.bindSound(ROOT,'muteBtn');   // the top-bar button and the menu's Sound row (shared wiring, persisted)
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
  if(k==='m'||k==='M'){A.toggle();return;}
  if(k==='f'||k==='F'){   // cycle the fire mode in the attack window
    const c=engageQ&&engageQ.cur;
    if(c&&c.stage==='await'&&c.s.side==='reb'){const ms=modesOf(c.wkey);if(ms.length>1){ev.preventDefault();pickFireMode(ms[(ms.indexOf(modeOf(c.s,c.wkey))+1)%ms.length]);}}
    return;
  }
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
  round=0;town='calm';hot=0;quietRounds=0;shotRound=false;roundHot=false;hotT=0;lostHow='';crossAway=false;crossFx=null;grafState='landed';grafFx=null;grafPos.x=LZ.x;grafPos.y=LZ.y;grafPos.a=0.12;
  {const A=(CTX&&CTX.assets)||null;
   FS=A&&(A.drop||(A.ships&&A.ships.length)||(A.vehicles&&A.vehicles.length))?{drop:!!A.drop,dropUsed:false,ships:(A.ships||[]).map(a=>Object.assign({state:'ready',left:0},a)),
     vehicles:(A.vehicles||[]).map(a=>Object.assign({state:'ready'},a)),orders:[],n:0}:null;
   if(SUP().scan||SUP().evac||SUP().bombard)FS=FS||{drop:false,dropUsed:false,ships:[],vehicles:[],orders:[],n:0};
   // the transport that set the squad down works its own Door Mounted Gun from the air (the planning board's
   // Door Gunner Cover): no second ship needed
   if(CTX&&CTX.transport&&CTX.transport.doorgun&&SCN.grafLeaves){
     FS=FS||{drop:false,dropUsed:false,ships:[],vehicles:[],orders:[],n:0};
     const gp=CTX.grafPilot||{name:'Joss Marrek',first:'Joss'};
     FS.ships.push({state:'ready',left:0,mode:'doorgun',cls:CTX.transport.cls||'graf',name:CTX.transport.name,pilot:{name:gp.name,first:gp.first},soldiers:[],own:1});
   }
   if(FS){FS.scan=SUP().scan?1:0;FS.scanUsed=0;FS.extra=SUP().fsExtra?1:0;FS.evac=SUP().evac?1:0;FS.bombard=SUP().bombard?1:0;}
   scanRound=null;
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
  for(const w of WORK)if(w.needSpec==='fieldtech'&&w.rounds>1){
    if(SUP().hack1)w.rounds=1;                         // Overwatch (Slicer): a hack takes one round
    else if(SUP().prehack)w.prog=w.rounds-1;           // Pre-hack (Slicer): one round from done
  }
  PROPS=SCN.props.map(pr=>Object.assign({},pr,{hp:PROPDEF[pr.kind].hp,dead:false}));
  turret={gunner:null,face:Math.PI};
  NADES=(CTX&&CTX.nades)||0;nades=[];dmgRound=new Set();
  sneak=false;launchNagged=false;
  floaters=[];tracers=[];parts=[];bubbles=[];casings=[];decals=[];exploQ=[];hits=[];boomFx=[];hitFx=[];fsFx=[];
  pops=[];vols=[];impFx=[];jfx=[];PFX.list.length=0;SHK.trauma=0;
  fogInit();
  supportStartScene();
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
      SCN.mt?'<span class="d">Squad on the ground at the '+trName()+' LZ.</span> '+SCN.csLine:
      '<span class="d">Squad on the ground at the '+trName()+' LZ. The Cross is on the pad behind the sheriff’s HQ, far side of town.</span>');
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
  return clock()>=tutGateT;
}
function tutFrozen(){
  if(!SCN||!SCN.tutorial||phase!=='FREE')return false;
  return tutNeedsAck()&&tutReady();
}
function tutTick(){
  const card=byId('tutCard');
  if(!SCN||!SCN.tutorial||phase==='BRIEF'||phase==='CUTSCENE'||phase==='INTRO'||phase==='GAMEOVER'){if(!card.hidden){card.hidden=true;measureHud();}return;}
  while(tutIdx<TUT.length-1&&TUT[tutIdx].done())tutIdx++;
  if(tutStage!==tutIdx){tutStage=tutIdx;tutGateT=clock()+(tutIdx?TUT_GAP:0);}
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
/* the base's work, in the scene as it starts: Pre-hack hands over the first Auto (DESIGN_BLOCKERS C-28) */
function supportStartScene(){
  if(SUP().prehack&&!WORK.some(w=>w.needSpec==='fieldtech')){
    const t=U.find(u=>u.side==='law'&&u.auto&&u.hackRounds&&!u.veh);
    if(t){t.side='reb';t.ally=1;t.hacked=1;t.order=null;t.hackProg=0;t.guard=0;t.patrol=null;
      log('<span class="g">Pre-hack:</span> <b>'+t.name+'</b> wakes up on our side. The Tech Lab sends its regards.');}
  }
  oppBrief();
}
/* Briefings (Mission Control), Battle Briefing (Tactician), Mission Intel (Analyst): the opposition on the briefing */
function oppBrief(){
  const lv=SUP().brief||0,hint=byId('gHint');
  if(!lv||!hint)return;
  const foes=U.filter(u=>u.side==='law'&&!u.ally&&!(u.veh&&u.empty));
  const by={};for(const u of foes){const r=window.Enemies&&Enemies.get(u.type);const n=(r&&r.name)||u.type||'Unknown';by[n]=(by[n]||0)+1;}
  const line=lv>=2?Object.keys(by).map(n=>by[n]+' \u00d7 '+n).join(', '):foes.length+' on the ground';
  const base=(SCN.brief||{}).hint||'';   // rebuilt from the scenario's own hint, so a restart does not repeat it
  hint.innerHTML=(base?base+'<br>':'')+'<b>Mission Control:</b> opposition at the start: '+line+'. Reinforcements not counted.';
  hint.hidden=false;
}
/* a squad member's face for the briefing, as on the base's crew list (a 48px portrait as a data URL) */
const portraitCacheG=new Map();
function portraitImg(sp){
  if(!sp||!sp.art)return null;
  const key=sp.id||sp.name;
  if(portraitCacheG.has(key))return portraitCacheG.get(key);
  try{
    const c=document.createElement('canvas');c.width=c.height=48;
    window.SR_ART.portrait(c.getContext('2d'),24,24,22,sp.art,{t:0});
    const u=c.toDataURL();portraitCacheG.set(key,u);return u;
  }catch(e){return null;}
}
function scenarioUI(){
  portraitCacheG.clear();   // faces change between missions (injuries, rank)
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
  const cards=(spec.squad||[]).map(sp=>SR.ui.squadCard({name:sp.name,role:sp.autoType?'Auto':'Soldier',img:portraitImg(sp),chips:SR.ui.gearChips(sp.wpns||['akli','cowboy'])}));
  if(spec.pilot)cards.push(SR.ui.squadCard({name:spec.pilot.name,role:'Pilot',pilot:true,img:portraitImg(spec.pilot),chips:SR.ui.gearChips(spec.pilot.wpns||['cowboy'])}));
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
  drawerOpen(false);menuEl.hidden=true;lastPhase=null;
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
    get round(){return round;},get quietRounds(){return quietRounds;},get pickMode(){return pickMode;},get selId(){return selId;},set selId(v){selId=v;},get TURRET(){return TURRET;},get PROPS(){return PROPS;},get BLDGS(){return BLDGS;},set engageQ(v){engageQ=v;},get bubbles(){return bubbles;},get tutIdx(){return tutIdx;},get tutFlags(){return tutFlags;},get quipsQueued(){return quipsQueued;},
    fn:{SCENARIOS_:()=>SCENARIOS,trName,mvars,typeObjectives,syncUI,vitalsOf,modeOf,setMode,modesOf,afterShot,knockBack,pickFireMode,modeToggleHTML,doDeploy,canDeploy,turretOn,traitText,unitRow,pickTarget,retarget,manTurret,sandbagged,emptyVeh,WPN_:()=>WPN,lootMarks_:()=>lootMarks,artSpec,artPose,dropLoot,applyShot,fireFx,sShot,VOICE_:()=>VOICE,WDAM_:()=>WDAM,WICON_:()=>WICON,tutFrozen,tutTick,prologueQuips,fsPlace,fsItems,fsExecute,fsRoundEnd,fsPlanStart,supplyDrop,startFreeHack,hackFlip,canHack,hackResolve,deployUnits,validShot,facDetonate,callTransport,fuelReach,fuelPumpStep,execute,enterFree,tryLaunch,startExtract,squadMoveTo,playerAttack,playerHold,
      completeWork,gameOver,alertTown,unitSeen,startAmbush,throwNade,useStim,fsItems,spawnFoes,lawHolds,fogOn,hackNeed,hackResolve,fsPlace,fsExecute,killUnit,canDie,endCutscene,doCrossAway,extractReady,grafUpdate,openFile,orderAct,execute,setPhase:v=>{phase=v;},grafState_:()=>grafState,scanRound_:()=>scanRound,updateVision,dgShotDown,canRevive,checkDefeat,needed,
      mount,dismount,canEnter,enterTargets,switchSeat,switchTargets,vehSync,crewIn,vehOf,seatOf,reachOf,aiPlan,summonVehicle,moraleCheck,explode,startPlanning,expandUnits,
      computeATK,computeTN,rollDamage,woundUnit,soak,raiseShield,jamRoll,critRoll,initKey,speedMul,viewMul,adjCoolG,coolStateG,mkU,endRound,downUnit,relUp,buildResult,ordersFor,inflictInjury,doTreat,treatPick,treatTarget,injOf,wpnsOf,cantSprint,stunned,useStim,statusTag,
      coverOf,coverVs,coverHint,inCoverAt,pickCoverMove,attackUpdate,buildEngage,
      stunTick,canPack,packTurret,unmanTurret,treatCands,inContact,stillFighting,roundWrap,contactCheck,
      seen(){return [...visUnits];},
      clock,hitstop,juice,juiceTick,decals_:()=>decals,juice_:()=>({pops,vols,impFx,jfx,parts:PFX.list,trauma:SHK.trauma,stopped:!!HS.until&&performance.now()<HS.until}),
      juiceOn(v){juiceLive=v!==false;},
      engageAwait(){return !!(engageQ&&engageQ.cur&&engageQ.cur.stage==='await');}}};
}
})();
