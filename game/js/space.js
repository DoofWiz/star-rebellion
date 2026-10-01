'use strict';
(function(){
const ROOT=document.getElementById('sc-space');
const byId=id=>ROOT.querySelector('#'+id);
const A=SR.audio;
const osc=(...a)=>A.osc(...a);
const nz=(...a)=>A.nz(...a);
const HUD=SR.hud,T=SR.theme,C=T.C,FONT=T.FONT;   // shared HUD builders, canvas theme helpers, palette


/* =====================================================================
   STAR REBELLION — GDD combat variant, iteration 4
   Shield segments (fore/aft, angleable, boost follows the segment),
   one critical per attack, hemisphere lock acquisition, narrower guns,
   dossier/ship info windows on double-click, segmented readouts,
   ranked pilots with XP rings, missile guidance, heavier audio.
   ===================================================================== */

/* ---------- constants ---------- */
const W=4200,H=3000,MARGIN=120;
const RU=300,SU=150;
const ARCH=0.55;                       // narrowed firing arc (~31.5deg half)
const BULLS_LIM=0.21;
const LOCK_RNG=900,LOCK_ARC=ARCH; // lock: acquire in the firing cone; LOST only when target ends up behind
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TURNS={L:-Math.PI/2,l:-Math.PI/4,S:0,r:Math.PI/4,R:Math.PI/2};
const WPN={
  plasma:{name:'Plasma',rng:900,atk:+2,skipShield:false,crit:0,icon:'plasma',
    tags:'Unlimited charge · absorbed by shields'},
  ballistic:{name:'Ballistic',rng:600,atk:-5,skipShield:true,crit:0.25,icon:'ballistic',
    tags:'Bypasses shields · can crit through armor · wild unguided'},
  missile:{name:'Missile',rng:900,atk:0,skipShield:false,crit:0,needsLock:true,icon:'missile',
    tags:'Heavy warhead · needs lock · guidance bonus per lock level'},
};
function dialViper(){const d=[];for(let s=1;s<=4;s++)d.push([s,'S']);for(let s=1;s<=3;s++){d.push([s,'l']);d.push([s,'r']);}for(let s=1;s<=2;s++){d.push([s,'L']);d.push([s,'R']);}return d;}
function dialTalon(){const d=[];for(let s=2;s<=5;s++)d.push([s,'S']);for(let s=2;s<=4;s++){d.push([s,'l']);d.push([s,'r']);}for(let s=2;s<=3;s++){d.push([s,'L']);d.push([s,'R']);}return d;}
function dialFled(){const d=[];for(let s=1;s<=3;s++)d.push([s,'S']);for(let s=1;s<=2;s++){d.push([s,'l']);d.push([s,'r']);}d.push([1,'L']);d.push([1,'R']);return d;}
function dialGraf(){const d=[];for(let s=1;s<=2;s++)d.push([s,'S']);for(let s=1;s<=2;s++){d.push([s,'l']);d.push([s,'r']);}return d;}
function dialDrone(){const d=[];for(let s=1;s<=4;s++)d.push([s,'S']);for(let s=1;s<=3;s++){d.push([s,'l']);d.push([s,'r']);}d.push([1,'L']);d.push([1,'R']);return d;}
const CLS={
  viper:{label:'FT-4 Cross',role:'Multi-role Starfighter',init:3,tn:11,size:1.15,shdF:15,shdR:15,arm:20,hull:40,dial:dialViper,maxSpd:4,
    wpns:['plasma','ballistic','missile'],dmg:{plasma:[8,14],ballistic:[12,18],missile:[26,36]},ammo:{ballistic:6,missile:2}},
  talon:{label:'SF-11 Talon',role:'Interceptor',init:4,tn:13,size:1.0,shdF:8,shdR:8,arm:10,hull:25,dial:dialTalon,maxSpd:5,
    wpns:['plasma','missile'],dmg:{plasma:[9,15],missile:[26,36]},ammo:{missile:1}},
  scim:{label:'VK-3 Scimitar',role:'Multi-role Starfighter',init:3,tn:11,size:1.1,shdF:12,shdR:12,arm:20,hull:35,dial:dialViper,maxSpd:4,
    wpns:['plasma','ballistic','missile'],dmg:{plasma:[8,14],ballistic:[12,18],missile:[26,36]},ammo:{ballistic:4,missile:2}},
  fled:{label:'VT-2 Fledgling',role:'Trainer',init:2,tn:9,size:1.0,shdF:0,shdR:0,arm:10,hull:20,dial:dialFled,maxSpd:3,
    wpns:['plasma'],dmg:{plasma:[7,12]},ammo:{}},
  graf:{label:'Graf Type 1 Hauler',role:'Troop Transport (converted)',init:1,tn:9,size:1.4,shdF:10,shdR:10,arm:25,hull:60,dial:dialGraf,maxSpd:2,
    wpns:['ballistic'],dmg:{ballistic:[10,16]},ammo:{ballistic:10}},
  depot:{label:'Fuel Depot',role:'Hegemony Orbital Fuel Store',init:0,tn:8,size:1.7,shdF:0,shdR:0,arm:3,hull:24,dial:()=>[[1,'S']],maxSpd:1,
    wpns:[],dmg:{},ammo:{},struct:1,mute:1},
  drone:{label:'RQ-7 Sentry',role:'Combat Drone',init:2,tn:10,size:0.9,shdF:0,shdR:0,arm:2,hull:10,dial:dialDrone,maxSpd:4,
    wpns:['plasma'],dmg:{plasma:[3,7]},ammo:{},mute:1},
  monitor:{label:'Drone Monitor',role:'Patrol Drone',init:2,tn:11,size:0.85,shdF:0,shdR:0,arm:1,hull:8,dial:dialDrone,maxSpd:4,
    wpns:['plasma'],dmg:{plasma:[2,5]},ammo:{},mute:1,summons:1},
  pursuer:{label:'Drone Pursuer',role:'Hunter Drone',init:3,tn:11,size:0.95,shdF:0,shdR:0,arm:3,hull:16,dial:dialTalon,maxSpd:5,
    wpns:['plasma'],dmg:{plasma:[4,8]},ammo:{},mute:1},
  clamper:{label:'Drone Mag-Clamper',role:'Restraint Drone',init:1,tn:9,size:1.35,shdF:6,shdR:6,arm:8,hull:30,dial:dialGraf,maxSpd:2,
    wpns:['plasma'],dmg:{plasma:[3,6]},ammo:{},mute:1,clamp:1},
  mote:{label:'VC Mote Patrolcraft',role:'Manned Patrol Fighter',init:3,tn:12,size:1.0,shdF:6,shdR:6,arm:6,hull:22,dial:dialTalon,maxSpd:5,
    wpns:['plasma'],dmg:{plasma:[6,10]},ammo:{}},
};
const DRONES=['drone','monitor','pursuer','clamper'];
const isDrone=s=>DRONES.includes(s.cls);
function isStruct(s){return !!CLS[s.cls].struct;}
const TRAITDESC={
  'Drone':'A flight computer with a gun. Feels nothing, fears nothing, flees nothing.',
  'Lucky':'Things just miss them. −1 enemy difficulty, +1 to their own attacks.',
  'Ace Training':'Academy loop certification — the ↺ maneuver is on their dial.',
  'Friends: Joss':'Flies better knowing Joss is out there. Much worse if he isn’t.',
  'Veteran':'Decades in the drift. Nerve never fully breaks; +1 initiative.',
  'Green':'Nerve caps low. If the instructor falls, expect them to break.',
};
const CRITDEFS={
  engine:{name:'Secondary Engine Failure',desc:'Top-speed maneuvers unavailable.',stack:2},
  targeting:{name:'Targeting Array Damage',desc:'−2 aim until repaired.',stack:2},
  controls:{name:'Control Surfaces Shredded',desc:'Hard turns and loops unavailable.',stack:1},
  emitter:{name:'Shield Emitter Fried',desc:'Cannot boost shields.',stack:1},
  feed:{name:'Ammo Feed Jam',desc:'Ballistic and missile weapons offline.',stack:1},
  cockpit:{name:'Cockpit Breach',desc:'Nerve capped at 60.',stack:1},
};
const RANKS=['Cadet','2nd Lieutenant','1st Lieutenant','Captain','Major','Lt. Colonel','Colonel','Brig. General','Maj. General','Lt. General'];
const rankOf=lvl=>RANKS[Math.max(0,Math.min(RANKS.length-1,lvl))];

/* ---------- state ---------- */
let ships=[],rocks=[],phase='BRIEFING',round=1,selId=null,hoverMan=null;
let bolts=[],parts=[],floaters=[],missFx=[],bubbles=[];
let shake=0,flashT=0,worldT=0,ambT=0,lastFrame=0,started=false,rng=Math.random;
let exec=null,attackQ=null,awaitAction=null,lockPickMode=false,subMenu='root';
let cs=null,damagedThisRound=new Set();
let cam={x:W/2,y:H/2,z:0.3},camGoal=null,follow=true;
let infoShip=null; // ship id whose dossier/ship windows are open
let hudT=0;        // seconds for HUD pulses; 0 under prefers-reduced-motion

function mkPilot(o){return Object.assign({friendLock:false,lastSay:0},o);}
/* what a pilot did this mission, in raw points per skill; base.js turns it into experience */
function psk(s,k,n){if(s&&s.faction==='reb'&&s.pilot){const p=s.pilot;p.sk=p.sk||{};p.sk[k]=(p.sk[k]||0)+n;}}
function mkShip(id,name,cls,faction,x,y,h,pilot){
  const c=CLS[cls];
  return {id,name,cls,faction,x,y,h,pilot,chatKey:pilot.chatKey||null,
    segs:{F:{val:c.shdF,max:c.shdF,at:'F'},R:{val:c.shdR,max:c.shdR,at:'R'}},
    arm:c.arm,hull:c.hull,maxArm:c.arm,maxHull:c.hull,
    size:c.size,ammo:Object.assign({},c.ammo),
    tokens:{evade:false,broll:false},lock:null,crits:[],
    plan:{man:null},path:null,trail:[],alive:true,fledOut:false,
    visRoll:0,moveBoost:0};
}
function zoneShield(s,z){let v=0;for(const k of ['F','R'])if(s.segs[k].at===z)v+=s.segs[k].val;return v;}
function totalShield(s){return s.segs.F.val+s.segs.R.val;}
function maxShield(s){return s.segs.F.max+s.segs.R.max;}
function critCount(s,id){return s.crits.filter(c=>c===id).length;}
function maxSpeedOf(s){return Math.max(1,CLS[s.cls].maxSpd-critCount(s,'engine')-(s.magClamp>0?2:0));}
function dialAvail(s){
  let d=CLS[s.cls].dial().slice();
  if(s.pilot.mans&&s.pilot.mans.includes('loop'))d.push([3,'K']);
  const ms=maxSpeedOf(s);
  d=d.filter(([sp,tk])=>sp<=ms);
  if(critCount(s,'controls'))d=d.filter(([sp,tk])=>tk!=='L'&&tk!=='R'&&tk!=='K');
  return d;
}
function effInit(s){
  let i=CLS[s.cls].init;
  if(s.pilot.traits.includes('Veteran'))i+=1;
  if(coolState(s)==='cool')i+=1;
  if(coolState(s)==='panic')i-=1;
  return i;
}
function coolState(s){return s.pilot.cool>=70?'cool':s.pilot.cool<=30?'panic':'steady';}
function nerve(s){
  const st=coolState(s);
  return st==='cool'?['Cool','cool']:st==='panic'?['Panicking','panic']:['Steady','steady'];
}
function adjCool(s,d,why){
  if(CLS[s.cls].mute)return; // no nerve to rattle
  const p=s.pilot,pre=coolState(s);
  if(d<0&&p.nv)d=Math.round(d*p.nv);
  if(d<0){if(p.traits.includes('Brave'))d=Math.round(d*0.5);if(p.traits.includes('Cowardly'))d=Math.round(d*1.5);}
  p.cool=Math.max(0,Math.min(100,p.cool+d));
  if(p.traits.includes('Veteran'))p.cool=Math.max(40,p.cool);
  if(p.traits.includes('Green'))p.cool=Math.min(60,p.cool);
  if(critCount(s,'cockpit'))p.cool=Math.min(60,p.cool);
  if(p.friendLock)p.cool=Math.min(20,p.cool);
  const post=coolState(s);
  if(pre!=='panic'&&post==='panic'){
    addFloater(s.x,s.y-40,'PANICKING',C.hazard);
    log(nameSpan(s)+' <span class="b">is panicking</span> <span class="d">('+why+')</span>');
    say(s,'panic');
  }
  if(pre==='panic'&&post!=='panic'){addFloater(s.x,s.y-40,'STEADIED',C.go);log(nameSpan(s)+' <span class="g">steadies their nerves</span>');}
}

const DEPLOY=[
  ['P1','Vanguard','viper','reb',650,2450,-Math.PI/4,{chatKey:'sera',pname:'Sera Kest',first:'SERA',age:29,aim:3,cool:72,traits:['Lucky'],mans:[],level:3,xp:0.4,bio:'Ex-Hegemony survey pilot. Defected after Callis Reach; hasn’t missed a launch since.'}],
  ['P2','Dagger 1','talon','reb',430,2560,-Math.PI/4,{chatKey:'joss',pname:'Joss Marrek',first:'JOSS',age:26,aim:4,cool:76,traits:['Ace Training'],mans:['loop'],level:4,xp:0.65,bio:'Cocky, brilliant, insufferable. Flies like he’s owed the sky.'}],
  ['P3','Dagger 2','talon','reb',870,2620,-Math.PI/4,{chatKey:'petra',pname:'Petra Voss',first:'PETRA',age:24,aim:2,cool:60,traits:['Friends: Joss'],mans:[],level:2,xp:0.2,bio:'Steady hands, soft heart. Followed Joss into the rebellion.'}],
  ['E1','Vex','scim','heg',2950,1150,Math.PI*0.75,{pname:'Cmdt. Dral Vex',first:'VEX',age:51,aim:5,cool:85,traits:['Veteran'],mans:['loop','broll'],level:9,xp:0.8,bio:'The Hegemony’s schoolmaster of the void. His students never forget him.'}],
  ['E2','Cadet 1','fled','heg',3150,1000,Math.PI*0.75,{pname:'Cadet Ilo',first:'ILO',age:19,aim:2,cool:52,traits:['Green'],mans:[],level:0,xp:0.3,bio:'Top of the classroom. The classroom did not shoot back.'}],
  ['E3','Cadet 2','fled','heg',3180,1300,Math.PI*0.75,{pname:'Cadet Brann',first:'BRANN',age:20,aim:1,cool:48,traits:['Green'],mans:[],level:0,xp:0.15,bio:'Enlisted to get off-world. Getting more than he bargained for.'}],
  ['E4','Cadet 3','fled','heg',3400,1120,Math.PI*0.75,{pname:'Cadet Sooli',first:'SOOLI',age:21,aim:2,cool:55,traits:['Green'],mans:[],level:0,xp:0.5,bio:'The only cadet Vex has ever almost complimented.'}],
  ['E5','Cadet 4','fled','heg',3380,1420,Math.PI*0.75,{pname:'Cadet Werrin',first:'WERRIN',age:19,aim:1,cool:45,traits:['Green'],mans:[],level:0,xp:0,bio:'First live exercise. First time past the moons.'}],
];
/* ---------- scenarios ---------- */
const SCENS={
  instructor:{
    sub:'Veray Drift',
    banner:['Take Out Instructor','Eliminate Commandant Vex'],
    brief:{
      eyebrow:'Source Intel · Ferren Halt',
      title:'Take Out Instructor',
      flavour:'Commandant Dral Vex trains every Hegemony fighter pilot in this sector, and his cadets leave the academy shooting straight. Right now he’s running a live exercise in the Veray Drift with four green cadets and no escort. Kill the instructor and the Hegemony’s next class of pilots dies with him.',
      objectives:['Shoot down Commandant Vex',
        {sub:1,text:'His cadets are green — expect them to break when he falls.'}],
    },
  },
  depot:{
    sub:'Brakka Orbit',
    banner:['Cook the Depots','The patrols fly on what you burn'],
    brief:{
      eyebrow:'A Favour Returned · Maro Venn',
      title:'Cook the Depots',
      flavour:'Four Hegemony fuel depots hang in orbit over Brakka, feeding every patrol that squeezes the frontier. Tonight nothing guards them but patrol drones: Monitors that shout for help and Pursuers that answer. Burn the fuel and be gone before anything with a pilot shows up.',
      objectives:['Destroy all four fuel depots',
        {sub:1,text:'Monitors call in Pursuers, and the patrol answers with a manned Mote and a Mag-Clamper that slows you down. Do not linger.'}],
    },
  },
};
let SCEN='instructor';
const DEPLOY_DEPOT=[
  ['D1','Depot 1','depot','heg',1750,1500,0.3,{pname:'Fuel Depot 1',first:'D-1',age:'—',aim:0,cool:50,traits:[],mans:[],level:0,xp:0,bio:'Sixty thousand tonnes of patrol fuel in a can.'}],
  ['D2','Depot 2','depot','heg',2500,720,-0.4,{pname:'Fuel Depot 2',first:'D-2',age:'—',aim:0,cool:50,traits:[],mans:[],level:0,xp:0,bio:'The reason the drift patrols never run dry.'}],
  ['D3','Depot 3','depot','heg',3050,1950,0.8,{pname:'Fuel Depot 3',first:'D-3',age:'—',aim:0,cool:50,traits:[],mans:[],level:0,xp:0,bio:'Painted with a fading Hegemony crest and a NO SMOKING sign.'}],
  ['D4','Depot 4','depot','heg',3650,1050,-0.9,{pname:'Fuel Depot 4',first:'D-4',age:'—',aim:0,cool:50,traits:[],mans:[],level:0,xp:0,bio:'Topped off yesterday. Unfortunate timing.'}],
  ['R1','Monitor 1','monitor','heg',2300,1250,Math.PI*0.75,{pname:'Drone Monitor',first:'DM-1',age:'—',aim:1,cool:60,traits:['Drone'],mans:[],level:0,xp:0,bio:'A gun with a flight computer. It has never been afraid.'}],
  ['R2','Monitor 2','monitor','heg',2950,1000,Math.PI*0.75,{pname:'Drone Monitor',first:'DM-2',age:'—',aim:1,cool:60,traits:['Drone'],mans:[],level:0,xp:0,bio:'Its threat library lists you under VERMIN, ARMED.'}],
  ['R3','Pursuer 1','pursuer','heg',2800,2100,Math.PI*0.75,{pname:'Drone Pursuer',first:'DP-1',age:'—',aim:1,cool:60,traits:['Drone'],mans:[],level:0,xp:0,bio:'Patrols the same loop it has flown for nine years.'}],
];
let CTX=null; // mission spec from the base layer (null => sim/default cast)
function deploy(withCutscene){
  if(CTX&&CTX.flight&&CTX.flight.length){
    const P=[[650,2450],[430,2560],[870,2620],[540,2380]];
    const flight=CTX.flight.slice(0,4);
    ships=flight.map((f,i)=>{
      const sh=mkShip('P'+(i+1),f.fighterName||('Wing '+(i+1)),CLS[f.cls]?f.cls:'viper','reb',
        P[i][0],P[i][1],-Math.PI/4,
        mkPilot({chatKey:f.pilotId,pname:f.name,first:(f.first||f.name).toUpperCase(),age:22+(f.level||1)*3,
          aim:f.aim||2,cool:f.cool||60,foc:f.foc||0,cun:f.cun||1,nv:f.nv||1,traits:f.traits||[],mans:(f.level||0)>=4?['loop']:[],
          level:f.level||1,xp:0,bio:f.bio||'One of ours.'}));
      sh.fighterId=f.fighterId;
      if(f.hull!==undefined){sh.hull=Math.max(6,Math.round(sh.maxHull*f.hull/100));}
      return sh;
    });
    if(SCEN==='depot'){
      for(const d of DEPLOY_DEPOT)
        ships.push(mkShip(d[0],d[1],d[2],d[3],d[4],d[5],d[6],mkPilot(Object.assign({},d[7]))));
    } else {
      const nCad=Math.max(2,Math.min(4,flight.length));
      for(const d of DEPLOY){
        if(d[3]!=='heg')continue;
        if(d[0]!=='E1'&&(+d[0].slice(1)-1)>nCad)continue;
        ships.push(mkShip(d[0],d[1],d[2],d[3],d[4],d[5],d[6],mkPilot(Object.assign({},d[7]))));
      }
    }
  } else {
    ships=DEPLOY.map(d=>mkShip(d[0],d[1],d[2],d[3],d[4],d[5],d[6],mkPilot(Object.assign({},d[7]))));
  }
  makeRocks();
  round=1;selId='P1';bolts=[];parts=[];floaters=[];missFx=[];bubbles=[];
  exec=null;attackQ=null;awaitAction=null;lockPickMode=false;subMenu='root';infoShip=null;
  logEl.innerHTML='';feed.clear();damagedThisRound=new Set();
  if(withCutscene&&!RM)startCutscene();
  else {phase='PLANNING';camFitPlayers(true);log('<span class="a">— Round 1 · plot your maneuvers —</span>');saveSnap();}
  syncUI();
}
function makeRocks(){
  rocks=[];
  const clusters=[[1700,1900],[2450,2100],[2100,800],[3300,2300],[1200,1200]];
  for(const [cx,cy] of clusters){
    const n=3+Math.floor(rng()*4);
    for(let i=0;i<n;i++){
      const a=rng()*Math.PI*2,d=rng()*260,r=55+rng()*95;
      const x=Math.max(MARGIN+r,Math.min(W-MARGIN-r,cx+Math.cos(a)*d));
      const y=Math.max(MARGIN+r,Math.min(H-MARGIN-r,cy+Math.sin(a)*d));
      const verts=[];const vn=8+Math.floor(rng()*4);
      for(let k=0;k<vn;k++)verts.push(0.72+rng()*0.4);
      rocks.push({x,y,r,verts,rot:rng()*Math.PI*2});
    }
  }
}

/* ---------- cutscene ---------- */
function startCutscene(){
  phase='CUTSCENE';
  const now=performance.now();
  cs={t0:now,skipped:false,bannerShown:false,saidA:false,saidB:false};
  for(const s of ships){
    if(isStruct(s))continue; // stations don't fly in — they were always here
    const delay=s.faction==='reb'?({P1:0,P2:0.3,P3:0.55}[s.id]||0):({E1:2.3,E2:2.5,E3:2.65,E4:2.8,E5:2.95}[s.id]||2.3);
    s.cs={tx:s.x,ty:s.y,sx:s.x-Math.cos(s.h)*1500,sy:s.y-Math.sin(s.h)*1500,d0:delay,d1:delay+1.5};
    s.x=s.cs.sx;s.y=s.cs.sy;
  }
  cam={x:DEPLOY[0][4],y:DEPLOY[0][5],z:0.4};camGoal=null;clampCam();
  byId('stage').classList.add('cine');
  byId('csSkip').hidden=false;
}
function csUpdate(now){
  if(!cs)return;
  const t=(now-cs.t0)/1000;
  for(const s of ships){
    if(!s.cs)continue;
    const k=Math.max(0,Math.min(1,(t-s.cs.d0)/(s.cs.d1-s.cs.d0)));
    const e=1-Math.pow(1-k,3);
    s.x=s.cs.sx+(s.cs.tx-s.cs.sx)*e;
    s.y=s.cs.sy+(s.cs.ty-s.cs.sy)*e;
    s.moveBoost=k>0&&k<1?1:0;
    if(k>0&&k<1&&!RM&&rng()<0.8)parts.push({x:s.x-Math.cos(s.h)*20*s.size,y:s.y-Math.sin(s.h)*20*s.size,vx:-Math.cos(s.h)*60,vy:-Math.sin(s.h)*60,life:0,max:0.4,col:s.faction==='reb'?C.rebelHi:C.hegHi,size:2.4,drag:0.94});
  }
  if(t>1.1&&!cs.saidA){cs.saidA=true;const p=ships.find(x=>x.id==='P1');if(p)say(p,'start');}
  if(t>2.2&&t<2.3&&!cs.cut){cs.cut=true;cam={x:3200,y:1200,z:0.38};camGoal=null;clampCam();}
  if(t>3.5&&!cs.saidB){cs.saidB=true;if(SCEN==='instructor'){const v=ships.find(x=>x.id==='E1');if(v)say(v,'start');}}
  if(t>4.4&&!cs.fit){cs.fit=true;camGoal={x:W*0.47,y:H*0.6,z:Math.max(fitZoom()*0.95,0.24)};}
  if(t>4.8&&!cs.bannerShown){cs.bannerShown=true;byId('csBanner').classList.add('show');}
  if(t>6.6)endCutscene();
}
function endCutscene(){
  if(!cs)return;
  for(const s of ships){if(s.cs){s.x=s.cs.tx;s.y=s.cs.ty;delete s.cs;}s.moveBoost=0;}
  cs=null;
  byId('stage').classList.remove('cine');
  byId('csBanner').classList.remove('show');
  byId('csSkip').hidden=true;
  phase='PLANNING';
  camFitPlayers(false);
  log('<span class="a">— Round 1 · plot your maneuvers —</span>');
  const j=ships.find(x=>x.id==='P2');if(j)say(j,'plan');
  saveSnap();syncUI();
}

/* ---------- geometry ---------- */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function bearing(s,t){return Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-s.h));}
function inArc(s,t){return bearing(s,t)<=ARCH;}
function inFrontHemi(s,t){return bearing(s,t)<=Math.PI/2;}
function hitsFront(attacker,t){return bearing(t,attacker)<=Math.PI/2;}
function inLockZone(s,t){return bearing(s,t)<=LOCK_ARC&&dist(s,t)<=LOCK_RNG;}
function band(d){return d<=RU?1:d<=2*RU?2:3;}
function bullsFactor(s,t){const b=bearing(s,t);return b>=BULLS_LIM?0:1-b/BULLS_LIM;}
function losBlocked(a,b){
  for(const r of rocks){
    const dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy;
    if(L2<1)continue;
    let t=((r.x-a.x)*dx+(r.y-a.y)*dy)/L2;
    t=Math.max(0,Math.min(1,t));
    const px=a.x+dx*t,py=a.y+dy*t;
    if(Math.hypot(r.x-px,r.y-py)<r.r*0.85)return true;
  }
  return false;
}
function manPath(x0,y0,h0,man){
  const [sp,tk]=man,d=sp*SU;
  if(tk==='K')return t=>{
    const x=x0+Math.cos(h0)*d*t,y=y0+Math.sin(h0)*d*t;
    let h=h0;if(t>0.82)h=h0+Math.PI*((t-0.82)/0.18);if(t>=1)h=h0+Math.PI;
    return {x,y,h};
  };
  const turn=TURNS[tk];
  if(Math.abs(turn)<1e-6)return t=>({x:x0+Math.cos(h0)*d*t,y:y0+Math.sin(h0)*d*t,h:h0});
  const R=d/turn;
  return t=>({x:x0+R*(Math.sin(h0+turn*t)-Math.sin(h0)),y:y0-R*(Math.cos(h0+turn*t)-Math.cos(h0)),h:h0+turn*t});
}
function clampEnd(p){
  const cx=Math.min(Math.max(p.x,MARGIN),W-MARGIN);
  const cy=Math.min(Math.max(p.y,MARGIN),H-MARGIN);
  let h=p.h;const clamped=(cx!==p.x||cy!==p.y);
  if(clamped){const toC=Math.atan2(H/2-cy,W/2-cx);h=h+angNorm(toC-h)*0.6;}
  return {x:cx,y:cy,h,clamped};
}
function simMan(s,man){return clampEnd(manPath(s.x,s.y,s.h,[Math.min(man[0],maxSpeedOf(s)),man[1]])(1));}
function checkLocks(){
  for(const s of ships){
    if(!s.alive||!s.lock)continue;
    const t=ships.find(x=>x.id===s.lock.target);
    if(!t||!t.alive){s.lock=null;continue;}
    if(!inFrontHemi(s,t)){
      s.lock=null;
      addFloater(s.x,s.y-36,'LOCK BROKEN',C.text3);
      log(nameSpan(s)+'<span class="d">’s lock on </span>'+nameSpan(t)+'<span class="d"> breaks — target slipped behind</span>');
    }
  }
}

/* ---------- logging & chatter ---------- */
/* log() keeps the full record (behind "All reports") and feeds the short-lived comms stack under the minimap.
   Span classes: r rebel, h hostile, a action, g good, b danger, d quiet, s shields, p psi. */
const logWin=HUD.win(ROOT,{id:'logWin',title:'All reports',size:'sm',body:'<div class="sr-log" id="log"></div>'});
const logEl=byId('log');
const feed=HUD.comms(byId('comms'),{max:3,ttl:6000});
function feedKind(html){
  const m=/class="([rhagbdsp])"/.exec(html);
  return m?({r:'friend',h:'foe',a:'action',g:'good',b:'bad',d:'',s:'',p:''})[m[1]]:'';
}
function log(html){
  const p=document.createElement('p');p.innerHTML=html;
  logEl.appendChild(p);
  while(logEl.children.length>90)logEl.removeChild(logEl.firstChild);
  if(!logWin.el.hidden)logWin.body.scrollTop=logWin.body.scrollHeight;
  feed.push(html,feedKind(html));
}
function openLog(){logWin.open();logWin.body.scrollTop=logWin.body.scrollHeight;}
const nameSpan=s=>'<span class="'+(s.faction==='reb'?'r':'h')+'">'+s.name+'</span>';
const CHAT={
  sera:{start:['Weapons hot. We hit them before they know it’s real.'],plan:[],kill:['Splash one.','Scratch one bandit.'],hit:['Taking fire — hull’s complaining.'],missile:['Fox two!'],victory:['Instructor’s down. Let’s vanish.'],repair:['Rerouting power — hold them off me.']},
  joss:{start:[],plan:['Four rookies and one old man? Almost fair.'],kill:['That’s how it’s done!','Tell your instructor. Oh. Right.'],hit:['Hey! Watch the paint!'],missile:['Fox two!']},
  petra:{start:[],kill:['Got one... I got one!'],hit:['I’m hit, I’m hit!'],panic:['I can’t— there’s too many—'],friendDown:['JOSS! No— no no no—'],missile:['Missile away!']},
  E1:{start:['Eyes up, cadets. The drift punishes the sloppy.'],kill:['Observe, cadets. THAT is how it’s done.'],hit:['So the rats have teeth.'],victory:['Rebels. Predictable to the last.']},
  cadet:{start:['Copy, Commandant. Holding formation.'],kill:['I— I hit one? I HIT ONE!'],hit:['They’re shooting at ME?!','My board’s all red — what does red mean?!'],panic:['I want out. I want OUT!','Where’s the jump lever?! WHERE’S THE LEVER?!'],vexdown:['The Commandant’s gone—','Who’s in charge?! WHO’S IN CHARGE?!']},
};
function say(s,key){
  if(!s)return;
  if(CLS[s.cls].mute)return; // drones and structures have nothing to say
  if(!s.alive&&key!=='victory')return;
  const now=performance.now();
  if(now-s.pilot.lastSay<3500)return;
  const bank=CHAT[s.chatKey]||CHAT[s.id]||CHAT.cadet;
  const lines=(bank[key]&&bank[key].length)?bank[key]:(CHAT.cadet[key]||[]);
  if(!lines.length)return;
  s.pilot.lastSay=now;
  bubbles.push({ship:s,text:lines[Math.floor(rng()*lines.length)],t0:now,dur:2900+Math.min(1600,lines[0].length*30)});
  if(bubbles.length>3)bubbles.shift();
}

/* ---------- d20 resolution ---------- */
function rint(lo,hi){return lo+Math.floor(rng()*(hi-lo+1));}
function computeTN(s,t){
  const e=[];let v=CLS[t.cls].tn;
  e.push(['EVASION PROFILE',CLS[t.cls].tn,true]);
  const b=band(dist(s,t));
  if(b===2){v+=2;e.push(['RANGE 2',2]);} else if(b===3){v+=3;e.push(['LONG RANGE',3]);}
  if(t.tokens.evade){v+=3;e.push(['FLYING DEFENSIVE',3]);}
  if(t.tokens.broll){v+=2;e.push(['BARREL ROLL',2]);}
  const defl=Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-t.h));
  if(defl>Math.PI-0.6){v-=2;e.push(['TAIL SHOT',-2]);}
  else if(defl>0.9&&defl<Math.PI-0.9){v+=2;e.push(['DEFLECTION',2]);}
  if(losBlocked(s,t)){v+=3;e.push(['ROCK COVER',3]);}
  if(coolState(t)==='cool'){v+=1;e.push(['TARGET COOL',1]);}
  if(coolState(t)==='panic'){v-=2;e.push(['TARGET PANICKING',-2]);}
  if(s.pilot.traits.includes('Lucky')){v-=1;e.push(['LUCKY',-1]);}
  if(t.pilot.foc){v+=t.pilot.foc;e.push(['FOCUS',t.pilot.foc]);}
  return {total:v,entries:e};
}
function computeATK(s,t,wkey){
  const e=[];let v=0;const w=WPN[wkey];
  v+=s.pilot.aim;e.push(['PILOT AIM',s.pilot.aim,true]);
  const td=critCount(s,'targeting');
  if(td){v-=td*2;e.push(['TARGETING DMG',-td*2]);}
  if(w.atk){v+=w.atk;e.push([w.name.toUpperCase()+(w.atk<0?' (UNGUIDED)':''),w.atk]);}
  const lk=(s.lock&&s.lock.target===t.id)?s.lock.level:0;
  if(lk){v+=lk*2;e.push(['LOCK ×'+lk,lk*2]);}
  if(wkey==='missile'&&lk){v+=lk;e.push(['GUIDANCE ×'+lk,lk]);}
  if(coolState(s)==='cool'){v+=2;e.push(['COOL',2]);}
  if(coolState(s)==='panic'){v-=3;e.push(['PANICKING',-3]);}
  if(band(dist(s,t))===1){v+=2;e.push(['CLOSE RANGE',2]);}
  const f=bullsFactor(s,t);
  if(f>0.05){const bb=Math.ceil(4*f);v+=bb;e.push(['BULLSEYE',bb]);}
  if(s.pilot.traits.includes('Lucky')){v+=1;e.push(['LUCKY',1]);}
  if(s.pilot.traits.includes('Steady Hands')){v+=1;e.push(['STEADY HANDS',1]);}
  if(s.pilot.traits.includes('Former Pilot')){v+=1;e.push(['FORMER PILOT',1]);}
  return {total:v,entries:e,bullsF:f};
}
function needFor(tn,atk){return Math.max(2,Math.min(19,tn-atk));}
function pctFor(need){return Math.round((21-need)/20*100);}
function applyDamage(t,dmg,skipShield,fromFront){
  let rem=dmg,sd=0,ad=0,hd=0;
  const zone=fromFront?'F':'R';
  if(!skipShield){
    // deplete the visiting (angled-in) segment first, then the zone's own
    const keys=['F','R'].filter(k=>t.segs[k].at===zone).sort((a,b)=>(a===zone?1:0)-(b===zone?1:0));
    for(const k of keys){
      if(rem<=0)break;
      const take=Math.min(t.segs[k].val,rem);
      t.segs[k].val-=take;rem-=take;sd+=take;
    }
  }
  if(rem>0&&t.arm>0){ad=Math.min(t.arm,rem);t.arm-=ad;rem-=ad;}
  if(rem>0){hd=rem;t.hull-=hd;}
  return {sd,ad,hd,zone};
}
function applicableCrits(s){
  const out=[];
  for(const id in CRITDEFS){
    if(id==='feed'&&CLS[s.cls].wpns.length<2)continue;
    if(id==='emitter'&&maxShield(s)===0)continue;
    if(critCount(s,id)>=CRITDEFS[id].stack)continue;
    out.push(id);
  }
  return out;
}
function applyCritical(s,why){
  if(isStruct(s)){ // a fuel can has no subsystems — a crit just bites deeper
    s.hull=Math.max(0,s.hull-4);
    addFloater(s.x,s.y-46,'TANK RUPTURE -4',C.hazard);
    log('<span class="b">⚠ Tank rupture</span> on '+nameSpan(s)+' — fuel bleeds into the dark.');
    return null;
  }
  const opts=applicableCrits(s);
  if(!opts.length){
    s.hull=Math.max(0,s.hull-2);
    addFloater(s.x,s.y-46,'STRUCTURE GRINDING -2',C.hazard);
    log(nameSpan(s)+' <span class="b">has nothing left to break — structure grinding (−2 hull)</span>');
    return null;
  }
  const id=opts[Math.floor(rng()*opts.length)];
  s.crits.push(id);
  if(id==='cockpit')adjCool(s,-15,'cockpit breach');
  addFloater(s.x,s.y-46,CRITDEFS[id].name.toUpperCase(),C.hazard);
  log('<span class="b">⚠ '+CRITDEFS[id].name+'</span> on '+nameSpan(s)+' <span class="d">('+why+')</span>');
  return id;
}

/* ---------- weapon/target selection ---------- */
function validShot(s,t,wkey){
  const w=WPN[wkey];
  if(!CLS[s.cls].wpns.includes(wkey))return false;
  if(wkey!=='plasma'&&critCount(s,'feed'))return false;
  if(!inArc(s,t)||dist(s,t)>w.rng)return false;
  if(w.needsLock&&!(s.lock&&s.lock.target===t.id&&s.lock.level>=1))return false;
  if(wkey!=='plasma'&&s.ammo[wkey]!==undefined&&s.ammo[wkey]<=0)return false;
  return true;
}
function bestWeaponFor(s,t){
  const hp=totalShield(t)+t.arm+t.hull;
  if(validShot(s,t,'missile')&&hp>=20)return 'missile';
  if(validShot(s,t,'ballistic')&&((s.lock&&s.lock.target===t.id)||bullsFactor(s,t)>0.3||band(dist(s,t))===1))return 'ballistic';
  if(validShot(s,t,'plasma'))return 'plasma';
  if(validShot(s,t,'ballistic'))return 'ballistic';
  if(validShot(s,t,'missile'))return 'missile';
  return null;
}
function chooseAttack(s){
  const foes=ships.filter(x=>x.alive&&x.faction!==s.faction);
  if(!foes.length)return null;
  let order=foes.slice().sort((a,b)=>dist(s,a)-dist(s,b));
  const lockT=foes.find(f=>s.lock&&s.lock.target===f.id);
  if(s.faction==='reb'){
    const prio=SCEN==='depot'?foes.filter(f=>isStruct(f)).sort((a,b)=>dist(s,a)-dist(s,b)):
      foes.filter(f=>f.id==='E1');
    order=[...(lockT?[lockT]:[]),...prio,...order].filter((v,i,a)=>a.indexOf(v)===i);
  } else {
    order.sort((a,b)=>(totalShield(a)+a.arm+a.hull)-(totalShield(b)+b.arm+b.hull));
    order=[...(lockT?[lockT]:[]),...order].filter((v,i,a)=>a.indexOf(v)===i);
  }
  for(const t of order){
    const w=bestWeaponFor(s,t);
    if(w)return {t,wkey:w};
  }
  return null;
}

/* ---------- enemy AI ---------- */
function aiManeuver(s){
  const foes=ships.filter(x=>x.alive&&x.faction!==s.faction);
  if(coolState(s)==='panic'&&s.cls==='fled'){
    const ex=s.x<W/2?MARGIN:W-MARGIN,ey=s.y<H/2?MARGIN:H-MARGIN;
    const tgtA=Math.abs(s.x-ex)<Math.abs(s.y-ey)?Math.atan2(0,ex-s.x>0?1:-1):Math.atan2(ey-s.y>0?1:-1,0);
    let best=null,bs=-1e9;
    for(const m of dialAvail(s)){
      const e=simMan(s,m);
      const sc=m[0]*30-Math.abs(angNorm(tgtA-e.h))*80+rng()*10;
      if(sc>bs){bs=sc;best=m;}
    }
    return best;
  }
  if(!foes.length)return dialAvail(s)[0];
  let target=foes[0],bt=1e9;
  for(const f of foes){const v=dist(s,f)+(totalShield(f)+f.arm+f.hull)*4;if(v<bt){bt=v;target=f;}}
  let best=null,bs=-1e9;
  for(const m of dialAvail(s)){
    const e=simMan(s,m);let sc=0;
    const d=dist(e,target),prefD=s.id==='E1'?450:340;
    sc-=Math.abs(d-prefD)*0.5;
    const fake={x:e.x,y:e.y,h:e.h};
    if(inArc(fake,target)&&d<=900){sc+=240;if(bearing(fake,target)<=LOCK_ARC)sc+=60;}
    if(e.clamped)sc-=500;
    sc+=Math.cos(angNorm(Math.atan2(target.y-e.y,target.x-e.x)-e.h))*70;
    for(const f of foes){if(inArc(f,fake)&&dist(f,e)<=600)sc-=45;}
    if(losBlocked(fake,target))sc-=60;
    sc+=rng()*40;
    if(sc>bs){bs=sc;best=m;}
  }
  return best||dialAvail(s)[0];
}
function aiAction(s){
  const foes=ships.filter(x=>x.alive&&x.faction!==s.faction);
  if(coolState(s)==='panic')return {a:'flydef'};
  if(CLS[s.cls].clamp){
    const ct=foes.filter(f=>dist(s,f)<=650&&!losBlocked(s,f)&&!f.magClamp).sort((a,b)=>dist(s,a)-dist(s,b))[0];
    if(ct)return {a:'clamp',t:ct};
  }
  const tailed=foes.some(f=>inArc(f,s)&&dist(f,s)<=450);
  const safe=!foes.some(f=>inArc(f,s)&&dist(f,s)<=700);
  if(s.id==='E1'&&safe){
    if(s.crits.length)return {a:'fixcrit',crit:s.crits[0]};
    if(maxShield(s)>0&&totalShield(s)<maxShield(s)*0.35&&!critCount(s,'emitter'))
      return {a:s.segs.F.val<=s.segs.R.val?'boostF':'boostR'};
  }
  const zone=foes.filter(f=>inLockZone(s,f)&&!losBlocked(s,f));
  if(zone.length&&CLS[s.cls].wpns.length>1){
    const t=zone.sort((a,b)=>dist(s,a)-dist(s,b))[0];
    const lv=(s.lock&&s.lock.target===t.id)?s.lock.level:0;
    if(lv<3&&!(tailed&&s.pilot.mans.includes('broll')))return {a:'lock',t};
  }
  if(tailed&&s.pilot.mans.includes('broll'))return {a:'broll'};
  if(tailed)return {a:'flydef'};
  if(s.pilot.cool<55)return {a:'lockin'};
  if(zone.length)return {a:'lock',t:zone[0]};
  return {a:'flydef'};
}
function doAction(s,act){
  if(act.a==='clamp'&&act.t){
    act.t.magClamp=2;
    addFloater(act.t.x,act.t.y-40,'MAG-CLAMPED',C.hazard);
    log(nameSpan(s)+' <span class="a">mag-clamps</span> '+nameSpan(act.t)+' <span class="d">\u2014 top speed −2 for two rounds</span>');
    sLock();
  } else if(act.a==='lock'&&act.t){
    if(!inLockZone(s,act.t)||losBlocked(s,act.t)){
      log(nameSpan(s)+' <span class="d">lock failed — '+(losBlocked(s,act.t)?'rocks in the way':'target not ahead / out of range')+'</span>');
    } else {
      if(s.lock&&s.lock.target===act.t.id)s.lock.level=Math.min(3,s.lock.level+1);
      else s.lock={target:act.t.id,level:1};
      addFloater(s.x,s.y-36,'LOCK '+s.lock.level,s.faction==='reb'?C.gold:C.heg);
      log(nameSpan(s)+' <span class="d">locks</span> '+nameSpan(act.t)+' <span class="a">[lvl '+s.lock.level+']</span>');
      sLock();
    }
  } else if(act.a==='flydef'){psk(s,'cun',1);s.tokens.evade=true;addFloater(s.x,s.y-36,'FLYING DEFENSIVE',C.shield);}
  else if(act.a==='lockin'){psk(s,'pre',1);adjCool(s,35,'locked in');addFloater(s.x,s.y-36,'LOCKED IN',C.go);}
  else if(act.a==='broll'){
    const side=rng()<0.5?1:-1;
    const e=clampEnd({x:s.x-Math.sin(s.h)*70*side,y:s.y+Math.cos(s.h)*70*side,h:s.h});
    s.x=e.x;s.y=e.y;s.tokens.broll=true;
    addFloater(s.x,s.y-36,'BARREL ROLL',C.psi);
    log(nameSpan(s)+' <span class="p">barrel rolls</span>');
    checkLocks();
  }
  else if(act.a==='shiftF'||act.a==='shiftR'){
    psk(s,'cun',1);
    const seg=s.segs[act.a==='shiftF'?'F':'R'];
    seg.at=seg.at==='F'?'R':'F';
    s.shieldFx=performance.now();s.shieldFxZone=seg.at;
    const home=act.a==='shiftF'?'fore':'aft';
    const now2=seg.at===(act.a==='shiftF'?'F':'R')?'home':'angled '+(seg.at==='F'?'forward':'aft');
    addFloater(s.x,s.y-36,'SHIELDS ANGLED',C.shield);
    log(nameSpan(s)+' <span class="s">angles the '+home+' shield ('+now2+')</span>');
    sShield();
  }
  else if(act.a==='boostF'||act.a==='boostR'){
    psk(s,'cun',1);
    const seg=s.segs[act.a==='boostF'?'F':'R'];
    const amt=Math.min(seg.max-seg.val,Math.ceil(0.15*maxShield(s)*(s.pilot.cun||1)));
    if(amt>0){
      seg.val+=amt;
      s.shieldFx=performance.now();s.shieldFxZone=seg.at;
      addFloater(s.x,s.y-36,'SHIELD +'+amt,C.shield);
      log(nameSpan(s)+' <span class="s">boosts the '+(act.a==='boostF'?'fore':'aft')+' segment +'+amt+
        (seg.at!==(act.a==='boostF'?'F':'R')?' (angled '+(seg.at==='F'?'forward':'aft')+')':'')+'</span>');
      sShield();
    }
  }
  else if(act.a==='fieldrep'){
    psk(s,'cun',1);
    const amt=Math.ceil(0.15*s.maxHull*(s.pilot.cun||1));
    s.hull=Math.min(s.maxHull,s.hull+amt);
    addFloater(s.x,s.y-36,'HULL +'+amt,C.go);
    log(nameSpan(s)+' <span class="g">field-repairs the hull +'+amt+'</span>');
    say(s,'repair');
  }
  else if(act.a==='fixcrit'&&act.crit){
    psk(s,'cun',1);
    const i=s.crits.indexOf(act.crit);
    if(i>=0){
      s.crits.splice(i,1);
      addFloater(s.x,s.y-36,'REPAIRED',C.go);
      log(nameSpan(s)+' <span class="g">clears</span> <span class="h">'+CRITDEFS[act.crit].name+'</span>');
      say(s,'repair');
    }
  }
}

/* ---------- round flow ---------- */
function executeRound(){
  if(phase!=='PLANNING')return;
  if(ships.some(s=>s.alive&&s.faction==='reb'&&!s.plan.man))return;
  for(const s of ships){if(s.alive&&s.faction==='heg'&&!isStruct(s))s.plan.man=aiManeuver(s);}
  const order=ships.filter(s=>s.alive&&!isStruct(s)).sort((a,b)=>effInit(a)-effInit(b)||(a.faction==='heg'?-1:1)-(b.faction==='heg'?-1:1));
  exec={order,idx:0,stage:'focus',t0:performance.now()};
  hoverMan=null;lockPickMode=false;subMenu='root';
  phase='EXEC';
  syncUI();
}
function execUpdate(now){
  if(!exec)return;
  const s=exec.order[exec.idx];
  if(!s||!s.alive){nextExec();return;}
  if(exec.stage==='focus'){
    if(follow)camGoal=focusGoal(s,Math.max(cam.z,0.55));
    if(now-exec.t0>(RM?60:330)){
      const [sp,tk]=s.plan.man;
      s.path=manPath(s.x,s.y,s.h,[Math.min(sp,maxSpeedOf(s)),tk]);
      s.moveTurn=TURNS[tk]||0;
      s.moveSpd=Math.min(sp,maxSpeedOf(s));
      s.trail=[];
      exec.stage='move';exec.t0=now;
    }
    return;
  }
  if(exec.stage==='move'){
    const dur=RM?350:1000;
    const raw=Math.min(1,(now-exec.t0)/dur);
    const t=raw*raw*(3-2*raw);
    const q=clampEnd(s.path(t));
    s.x=q.x;s.y=q.y;s.h=q.h;
    s.visRoll=Math.sin(raw*Math.PI)*Math.max(-1,Math.min(1,s.moveTurn*1.1));
    s.moveBoost=Math.sin(raw*Math.PI)*(0.4+0.15*s.moveSpd);
    s.trail.push({x:q.x,y:q.y,t:now});
    if(follow)camGoal=focusGoal(s,cam.z);
    if(!RM&&rng()<0.7)parts.push({x:s.x-Math.cos(s.h)*18*s.size,y:s.y-Math.sin(s.h)*18*s.size,vx:-Math.cos(s.h)*40+(rng()-0.5)*16,vy:-Math.sin(s.h)*40+(rng()-0.5)*16,life:0,max:0.35,col:s.faction==='reb'?C.rebelHi:C.hegHi,size:2,drag:0.94});
    if(!RM&&s.moveSpd>=3&&rng()<0.5)parts.push({x:s.x-Math.cos(s.h)*26*s.size,y:s.y-Math.sin(s.h)*26*s.size,vx:-Math.cos(s.h)*220,vy:-Math.sin(s.h)*220,life:0,max:0.22,col:'streak:'+(s.faction==='reb'?C.rebelHi:C.hegHi),size:1,drag:0.97});
    if(raw>=1){
      s.path=null;s.visRoll=0;s.moveBoost=0;
      checkLocks();
      if(s.faction==='reb'){exec.stage='action';awaitAction=s;lockPickMode=false;subMenu='root';syncUI();}
      else {doAction(s,aiAction(s));exec.stage='pause';exec.t0=now;syncUI();}
    }
    return;
  }
  if(exec.stage==='action')return;
  if(exec.stage==='pause'){if(now-exec.t0>(RM?120:520))nextExec();}
}
function playerAction(act){
  const s=awaitAction;
  if(!s)return;
  awaitAction=null;lockPickMode=false;subMenu='root';
  if(act.a!=='none')doAction(s,act);
  exec.stage='pause';exec.t0=performance.now();
  syncUI();
}
function nextExec(){
  exec.idx++;
  if(exec.idx>=exec.order.length){exec=null;startAttackPhase();return;}
  exec.stage='focus';exec.t0=performance.now();
}
function startAttackPhase(){
  const order=ships.filter(s=>s.alive&&!isStruct(s)).sort((a,b)=>effInit(b)-effInit(a)||(a.faction==='reb'?-1:1)-(b.faction==='reb'?-1:1));
  attackQ={order,idx:0,cur:null,nextAt:performance.now()+350};
  phase='ATTACK';
  syncUI();
}
function buildCtx(s,t,wkey){
  return {s,t,wkey,tn:computeTN(s,t),atk:null,stage:'tn',t0:performance.now(),
    reveal:0,revealA:0,roll:0,need:0,hit:false,applied:false,dmg:0,crit:false};
}
function retargetCtx(ctx,t,wkey){
  ctx.t=t;ctx.wkey=wkey;
  ctx.tn=computeTN(ctx.s,t);
  ctx.reveal=ctx.tn.entries.length;
  syncUI();
}
function attackUpdate(now){
  if(!attackQ)return;
  const q=attackQ;
  if(!q.cur){
    if(now<q.nextAt)return;
    while(q.idx<q.order.length){
      const s=q.order[q.idx++];
      if(!s.alive)continue;
      if(coolState(s)==='panic'&&s.cls==='fled'){log(nameSpan(s)+' <span class="d">is running, not fighting</span>');continue;}
      const sel=chooseAttack(s);
      if(!sel){log(nameSpan(s)+' <span class="d">holds fire — no firing solution</span>');continue;}
      q.cur=buildCtx(s,sel.t,sel.wkey);
      if(follow){
        const d=dist(s,sel.t);
        camGoal=frameGoalOf([s,sel.t],Math.max(0.42,Math.min(0.85,560/Math.max(d,300))),70,0);
      }
      syncUI();
      return;
    }
    attackQ=null;endRound();return;
  }
  const c=q.cur;
  const step=c.s.faction==='reb'?(RM?40:360):(RM?30:240);
  if(c.stage==='tn'){
    const target=Math.min(c.tn.entries.length,1+Math.floor((now-c.t0)/step));
    if(target>c.reveal){c.reveal=target;sTick();}
    if(c.reveal>=c.tn.entries.length&&now-c.t0>c.tn.entries.length*step+420){
      if(c.s.faction==='reb'){c.stage='await';syncUI();}
      else {c.atk=computeATK(c.s,c.t,c.wkey);c.stage='mods';c.t0=now;c.revealA=0;}
    }
    return;
  }
  if(c.stage==='await')return;
  if(c.stage==='mods'){
    const target=Math.min(c.atk.entries.length,1+Math.floor((now-c.t0)/step));
    if(target>c.revealA){c.revealA=target;sTick();}
    if(c.revealA>=c.atk.entries.length&&now-c.t0>c.atk.entries.length*step+420){
      c.need=needFor(c.tn.total,c.atk.total);
      c.roll=rint(1,20);
      c.hit=c.roll>=c.need;
      c.stage='roll';c.t0=now;
      sDice();
    }
    return;
  }
  if(c.stage==='roll'){
    if(now-c.t0>(RM?200:900)){
      c.stage='verdict';c.t0=now;
      if(c.hit)sLock();else sHit();
    }
    return;
  }
  if(c.stage==='verdict'){
    if(now-c.t0>(RM?150:520))fireCtx(c,now);
    return;
  }
  if(c.stage==='fire'){
    if(!c.applied&&now>=c.tApply){c.applied=true;applyCtx(c);}
    if(now>=c.tEnd){q.cur=null;q.nextAt=now+160;syncUI();}
    return;
  }
  if(c.stage==='end'){
    if(now>=c.tEnd){q.cur=null;q.nextAt=now+120;syncUI();}
  }
}
function holdFire(){
  const c=attackQ&&attackQ.cur;
  if(!c||c.stage!=='await')return;
  log(nameSpan(c.s)+' <span class="d">holds fire</span>');
  c.stage='end';c.tEnd=performance.now()+250;
  syncUI();
}
function confirmAttack(){
  const c=attackQ&&attackQ.cur;
  if(!c||c.stage!=='await')return;
  c.atk=computeATK(c.s,c.t,c.wkey);
  c.stage='mods';c.t0=performance.now();c.revealA=0;
  syncUI();
}
function fireCtx(c,now){
  const {s,t,wkey}=c,w=WPN[wkey];
  if(wkey!=='plasma'&&s.ammo[wkey]!==undefined)s.ammo[wkey]--;
  if(wkey==='missile'&&s.lock){s.lock.level--;if(s.lock.level<=0)s.lock=null;}
  if(c.hit){
    c.dmg=rint(CLS[s.cls].dmg[wkey][0],CLS[s.cls].dmg[wkey][1]);
    c.crit=rng()<(w.crit+0.25*(c.atk.bullsF||0));
  }
  const d=dist(s,t);
  if(wkey==='missile'){
    const fly=RM?350:Math.max(500,d/0.55);
    missFx.push({x:s.x+Math.cos(s.h)*18,y:s.y+Math.sin(s.h)*18,tx:t.x,ty:t.y,t0:now,dur:fly});
    c.tApply=now+fly;c.tEnd=c.tApply+(RM?300:750);
    sWhoosh();say(s,'missile');
    muzzleFlash(s,C.psi);
  } else {
    const n=wkey==='ballistic'?10:5;
    const fly=RM?180:Math.max(220,d/1.15);
    const stag=wkey==='ballistic'?(RM?25:50):(RM?40:85);
    for(let i=0;i<n;i++){
      const hitB=c.hit&&i>=n-Math.ceil(n*0.6);
      const sp=(rng()-0.5)*(wkey==='ballistic'?26:12);
      const px=-Math.sin(s.h)*sp,py=Math.cos(s.h)*sp;
      let ex=t.x+px,ey=t.y+py;
      if(!hitB){
        const off=(22+rng()*34)*(rng()<0.5?-1:1);
        ex=t.x-Math.sin(s.h)*off+Math.cos(s.h)*180;
        ey=t.y+Math.cos(s.h)*off+Math.sin(s.h)*180;
      }
      bolts.push({x0:s.x+Math.cos(s.h)*16,y0:s.y+Math.sin(s.h)*16,x1:ex,y1:ey,
        t0:now+i*stag,dur:fly*(hitB?1:1.25),hit:hitB,done:false,
        col:wkey==='ballistic'?C.goldHi:(s.faction==='reb'?C.rebel:C.heg),thin:wkey==='ballistic'});
    }
    if(wkey==='ballistic')sRattle();else sZap(s.faction==='heg');
    muzzleFlash(s,wkey==='ballistic'?C.goldHi:(s.faction==='reb'?C.rebelHi:C.hegHi));
    c.tApply=now+fly+n*stag*0.4;c.tEnd=c.tApply+(RM?280:650);
  }
  c.stage='fire';
  syncUI();
}
function applyCtx(c){
  const {s,t}=c;
  const math='<span class="d">need '+c.need+'+ ('+pctFor(c.need)+'%) · d20='+c.roll+'</span>';
  const wname=c.wkey==='plasma'?'plasma':c.wkey==='ballistic'?'<span class="a">ballistic</span>':'<span class="p">missile</span>';
  if(!c.hit){
    addFloater(t.x,t.y-30,'MISS',C.hazard);
    log(nameSpan(s)+' ['+wname+'] → '+nameSpan(t)+' · '+math+' · <span class="d">MISS</span>');
    psk(s,'aim',1);psk(t,'foc',1);
  } else {
    const fromFront=hitsFront(s,t);
    const {sd,ad,hd,zone}=applyDamage(t,c.dmg,WPN[c.wkey].skipShield,fromFront);
    damagedThisRound.add(t.id);
    impactBurst(t,c.wkey,sd>0);
    let fy=t.y-30;
    if(sd>0){t.shieldFx=performance.now();t.shieldFxZone=zone;addFloater(t.x,fy,'-'+sd+' SHD '+(zone==='F'?'FWD':'AFT'),C.shield);fy-=18;}
    if(ad>0){armorHit(t);addFloater(t.x,fy,'-'+ad+' ARM',C.steel);fy-=18;}
    if(hd>0){hullHitFx(t,hd);addFloater(t.x,fy,'-'+hd+' HULL',C.gold);fy-=18;}
    if(WPN[c.wkey].skipShield&&totalShield(t)>0)addFloater(t.x,fy,'SHIELDS BYPASSED',C.goldHi);
    adjCool(t,(ad>0||hd>0)?-12:-5,'taking fire');
    psk(t,'foc',0.3);
    if(hd>=8&&t.alive)say(t,'hit');
    shake=Math.max(shake,RM?0:(c.wkey==='missile'?14:6));
    if(c.wkey==='missile'){flashT=performance.now();sBoom(true);}
    else if(sd>0&&ad===0&&hd===0)sShield();
    else sHit();
    log(nameSpan(s)+' ['+wname+'] → '+nameSpan(t)+' · '+math+' · <span class="a">HIT '+c.dmg+'</span>');
    if(s.faction==='reb')s.pilot.xpGain=(s.pilot.xpGain||0)+0.03;
    psk(s,'aim',1);
    /* exactly one critical per attack: hull damage grants one, or a
       through-armor crit proc grants one — never both */
    if(t.alive&&t.hull>0&&(hd>0||c.crit))
      applyCritical(t,hd>0?'hull damage':'critical hit');
    if(t.hull<=0)destroyShip(t,s);
  }
  syncUI();
}
function destroyShip(t,killer){
  if(killer&&killer.faction==='reb'&&t.faction==='heg')
    killer.pilot.xpGain=(killer.pilot.xpGain||0)+((SCEN==='instructor'&&t.id==='E1')?0.45:isStruct(t)?0.3:0.22);
  t.alive=false;
  if(infoShip===t.id)closeInfo();
  if(selId===t.id)selId=killer&&killer.faction==='reb'?killer.id:selId;
  explode(t.x,t.y,t.size*(isStruct(t)?1.5:1));
  flashT=performance.now();
  shake=Math.max(shake,RM?0:isStruct(t)?26:18);
  sBoom(isStruct(t));
  if(isStruct(t))log('<span class="a">✦ </span>'+nameSpan(t)+' <span class="a">goes up</span> — the fuel cooks off in a fireball they’ll see from Dustfall.');
  else log('<span class="a">✦ </span>'+nameSpan(t)+' <span class="a">destroyed!</span>');
  if(killer&&killer.alive){psk(killer,'pre',1);adjCool(killer,12,'kill');say(killer,'kill');}
  for(const m of ships){
    if(!m.alive||m.faction!==t.faction||m===t)continue;
    adjCool(m,-18,'wingman lost');
    if(m.pilot.traits.includes('Friends: Joss')&&t.id==='P2'){
      m.pilot.friendLock=true;adjCool(m,-50,'Joss is gone');
      say(m,'friendDown');
      log(nameSpan(m)+' <span class="h">watches their friend die — they will not recover</span>');
    }
  }
  if(SCEN==='instructor'&&t.id==='E1'){
    for(const m of ships)if(m.alive&&m.faction==='heg'&&m.pilot.traits.includes('Green'))adjCool(m,-45,'instructor down');
    const cad=ships.filter(m=>m.alive&&m.faction==='heg'&&m.id!=='E1');
    if(cad.length)say(cad[Math.floor(rng()*cad.length)],'vexdown');
    log('<span class="g">The instructor is down — the cadets’ formation dissolves.</span>');
  }
}
function recoverPhase(e){
  log('<span class="b">⚠ engagement computer fault — step skipped</span>');
  try{
    if(phase==='ATTACK'&&attackQ){attackQ.cur=null;attackQ.nextAt=performance.now()+150;}
    else if(phase==='ATTACK'){endRound();}
    else if(phase==='EXEC'&&exec){awaitAction=null;lockPickMode=false;nextExec();}
  }catch(e2){phase='PLANNING';exec=null;attackQ=null;awaitAction=null;syncUI();}
}
function mkDronePilot(first,name,aim){return mkPilot({pname:name,first,age:'—',aim:aim||1,cool:60,traits:['Drone'],mans:[],level:0,xp:0,bio:'A gun with a flight computer. It has never been afraid.'});}
let summonN=0,patrolCalled=false;
function summonShip(cls,x,y,h,label){
  summonN++;
  const id='Z'+summonN,nm=CLS[cls].label;
  const sh=mkShip(id,nm+' '+summonN,cls,'heg',x,y,h,cls==='mote'?mkPilot({pname:'Patrol Pilot',first:'MOTE-'+summonN,age:27,aim:2,cool:60,traits:[],mans:[],level:1,xp:0,bio:'Local Hegemony patrol pilot. Good at his job, bad at staying calm.'}):mkDronePilot(nm.split(' ').pop().toUpperCase()+'-'+summonN,nm,cls==='pursuer'?2:1));
  ships.push(sh);
  addFloater(x,y-30,label||'INBOUND',C.hazard);
  return sh;
}
function reinforceStep(){
  // a Drone Monitor that sees us calls in a Pursuer, once
  for(const s of ships.slice()){
    if(!s.alive||!CLS[s.cls].summons||s.called)continue;
    if(ships.some(r=>r.alive&&r.faction==='reb'&&dist(s,r)<900)){
      s.called=true;
      const ex=s.x<W/2?W-MARGIN-260:MARGIN+260,ey=Math.max(MARGIN+260,Math.min(H-MARGIN-260,s.y+(rng()-0.5)*600));
      const n=summonShip('pursuer',ex,ey,ex>W/2?Math.PI:0,'PURSUER INBOUND');
      log(nameSpan(s)+' <span class="a">calls for help</span> \u2014 '+nameSpan(n)+' drops out of the dark.');
    }
  }
  // on the depot run, the patrol answers after a few rounds if anything is still burning
  if(SCEN==='depot'&&!patrolCalled&&round>=5&&ships.some(s=>isStruct(s)&&s.alive)){
    patrolCalled=true;
    const m=summonShip('mote',W-MARGIN-300,MARGIN+400,Math.PI*0.8,'PATROL ANSWERS');
    const c=summonShip('clamper',W-MARGIN-200,MARGIN+700,Math.PI*0.8,'MAG-CLAMPER');
    log('<span class="h">The depot patrol answers:</span> '+nameSpan(m)+' and '+nameSpan(c)+' are inbound.');
  }
}
function endRound(){
  for(const s of ships){s.tokens.evade=false;s.tokens.broll=false;s.plan={man:null};if(s.magClamp>0)s.magClamp--;}
  reinforceStep();
  for(const s of ships){if(s.alive&&!damagedThisRound.has(s.id))adjCool(s,6,'breathing room');}
  damagedThisRound=new Set();
  for(const s of ships){
    if(s.alive&&s.cls==='fled'&&coolState(s)==='panic'&&
       (s.x<MARGIN+120||s.x>W-MARGIN-120||s.y<MARGIN+120||s.y>H-MARGIN-120)){
      s.alive=false;s.fledOut=true;
      addFloater(s.x,s.y,'JUMPED OUT',C.text3);
      log(nameSpan(s)+' <span class="d">spools their drive and flees the sector</span>');
    }
  }
  const rebAlive=ships.some(s=>s.alive&&s.faction==='reb');
  if(SCEN==='depot'){
    if(!ships.some(s=>isStruct(s)&&s.alive)){gameOver(true);return;}
    if(!rebAlive){gameOver(false);return;}
  } else {
    const vex=ships.find(s=>s.id==='E1');
    if(!vex.alive){gameOver(true);return;}
    if(!rebAlive){gameOver(false);return;}
  }
  round++;
  phase='PLANNING';
  camFitPlayers(false);
  log('<span class="a">— Round '+round+' · plot your maneuvers —</span>');
  if(selId){const s=ships.find(x=>x.id===selId);if(!s||!s.alive)selId=(ships.find(x=>x.alive&&x.faction==='reb')||{}).id||null;}
  saveSnap();syncUI();
}
function gameOver(win){
  phase='GAMEOVER';
  closeInfo();
  const t=byId('endTitle'),x=byId('endText');
  const fled=ships.filter(s=>s.fledOut).length;
  const killedCadets=ships.filter(s=>s.faction==='heg'&&!s.alive&&!s.fledOut&&s.id!=='E1').length;
  if(SCEN==='depot'){
    if(win){
      t.textContent='Depots Burned';
      const drones=ships.filter(s=>isDrone(s)&&!s.alive).length;
      x.textContent='Four fireballs over Brakka after '+round+' rounds, and every patrol in the sector suddenly counting its fuel. '
        +(drones?drones+' patrol drone'+(drones>1?'s':'')+' shot down along the way. ':'')
        +'Venn’s intel was good — and what the depots’ manifests told us on the way in is worth even more.';
      log('<span class="g">— MISSION COMPLETE · all depots destroyed —</span>');
    } else {
      t.textContent='Flight Lost';
      x.textContent='The drones did exactly what they were built to do. The depots stand, the patrols fly on, and the Cross is scrap over Brakka.';
      log('<span class="b">— MISSION FAILED · flight lost —</span>');
    }
  } else if(win){
    const p=ships.find(s=>s.id==='P1');if(p&&p.alive)say(p,'victory');
    t.textContent='Instructor Down';
    const lost=ships.filter(s=>s.faction==='reb'&&!s.alive).map(s=>s.name);
    x.textContent='Commandant Vex is dead after '+round+' rounds; the Hegemony’s pilot pipeline in this sector dies with him. '
      +(killedCadets?killedCadets+' cadet'+(killedCadets>1?'s':'')+' destroyed, ':'')
      +(fled?fled+' fled the sector in panic. ':'')
      +(lost.length?'Lost with all hands: '+lost.join(', ')+'.':'The whole flight is coming home.');
    log('<span class="g">— MISSION COMPLETE · instructor eliminated —</span>');
  } else {
    const v=ships.find(s=>s.id==='E1');if(v&&v.alive)say(v,'victory');
    t.textContent='Flight Lost';
    x.textContent='The strike flight has been wiped out. Vex will dine on this story for years — and his cadets just got their first kills.';
    log('<span class="b">— MISSION FAILED · flight lost —</span>');
  }
  const st=byId('endStamp');
  st.textContent=win?'Secured':'Mission failed';
  st.className='sr-stamp '+(win?'sr-stamp--action':'sr-stamp--bad');
  byId('endscreen').hidden=false;
  pendingResult=buildResult(win);
  byId('endRestartBtn').textContent='Continue';
  byId('endRestartBtn').focus({preventScroll:true});
  syncUI();
}
let pendingResult=null;
function buildResult(win){
  if(!CTX||CTX.sim)return {sim:true,win};
  const people=(CTX.flight||[]).map((f,i)=>{
    const sh=ships.find(x=>x.id==='P'+(i+1));
    const dead=sh&&!sh.alive&&!sh.fledOut;
    return {id:f.pilotId,
      xp:Math.round((((sh&&sh.pilot.xpGain)||0)+(win?0.15:0.05))*100)/100,
      state:dead?'shotdown':'ok',sk:sh&&sh.pilot.sk?Object.fromEntries(Object.entries(sh.pilot.sk).map(([k,v])=>[k,Math.round(v*10)/10])):undefined};
  });
  const fighters=(CTX.flight||[]).map((f,i)=>{
    const sh=ships.find(x=>x.id==='P'+(i+1));
    if(!sh)return null;
    return {fighterId:f.fighterId,
      hull:Math.round(sh.hull/sh.maxHull*100),
      destroyed:!sh.alive&&!sh.fledOut};
  }).filter(Boolean);
  return {kind:'space',missionId:CTX.missionId,days:CTX.days||2,win,people,fighters};
}

/* ---------- effects ---------- */
function addFloater(x,y,text,col){floaters.push({x,y,text,col,t0:performance.now()});}
function spawnP(n,x,y,speed,life,col,size,drag){
  if(RM)n=Math.ceil(n/3);
  for(let i=0;i<n;i++){
    const a=rng()*Math.PI*2,v=speed*(0.3+rng()*0.7);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:life*(0.6+rng()*0.8),col,size:size*(0.5+rng()),drag:drag||0.99});
  }
}
function muzzleFlash(s,col){
  spawnP(8,s.x+Math.cos(s.h)*18,s.y+Math.sin(s.h)*18,150,0.2,col,3,0.9);
  parts.push({x:s.x+Math.cos(s.h)*20,y:s.y+Math.sin(s.h)*20,vx:0,vy:0,life:0,max:0.14,col:'flash:'+col,size:1.6,drag:1});
}
function impactBurst(t,wkey,shielded){
  const col=wkey==='ballistic'?C.goldHi:wkey==='missile'?C.psi:C.shield;
  parts.push({x:t.x,y:t.y,vx:0,vy:0,life:0,max:0.18,col:'flash:'+(shielded?C.shield:col),size:shielded?2.2:1.8,drag:1});
  spawnP(shielded?12:16,t.x,t.y,shielded?120:200,0.45,shielded?C.shield:col,2.4,0.94);
  if(!shielded)spawnP(6,t.x,t.y,90,0.8,'#8a93a8',2.2,0.97);
}
function armorHit(t){spawnP(10,t.x,t.y,140,0.45,C.steel,2.4,0.95);}
function hullHitFx(t,n){
  spawnP(10+n*2,t.x,t.y,190,0.55,'#ffb454',2.6,0.95);
  spawnP(6,t.x,t.y,70,1.1,'#666e80',3,0.97);
}
function explode(x,y,size){
  parts.push({x,y,vx:0,vy:0,life:0,max:0.22,col:'flash:#fff2d0',size:4*size,drag:1});
  spawnP(56*size,x,y,320*size,0.95,'#ffb454',3.4,0.96);
  spawnP(36*size,x,y,220*size,1.15,'#ff6a3d',3.8,0.96);
  spawnP(22,x,y,140,1.6,'#8a93a8',3,0.975);
  parts.push({x,y,vx:0,vy:0,life:0,max:0.6,col:'ring',size,drag:1});
  parts.push({x,y,vx:0,vy:0,life:0,max:0.9,col:'ring2',size:size*0.8,drag:1});
}

/* ---------- audio: layered synth engine ---------- */
function sTick(){if(A.off())return;osc('square',1500,1300,0.02,0.045);}
function sZap(heg){
  if(A.off())return;
  osc('sawtooth',heg?950:1350,heg?110:170,0.14,0.18);
  osc('square',heg?640:900,heg?90:130,0.07,0.16);
  nz('highpass',3000,1,0.06,0.05);
}
function sRattle(){
  if(A.off())return;
  for(let i=0;i<8;i++){
    nz('bandpass',1500+rng()*500,2,0.1,0.05,i*0.05);
    osc('sine',95,55,0.11,0.07,i*0.05);
  }
}
function sHit(){
  if(A.off())return;
  nz('bandpass',800,1.4,0.22,0.22,0,300);
  osc('triangle',260,90,0.14,0.28);
  nz('highpass',2500,1,0.08,0.06);
}
function sShield(){
  if(A.off())return;
  osc('sine',520,780,0.1,0.22);
  osc('sine',655,430,0.08,0.26);
  nz('bandpass',1200,4,0.05,0.2);
}
function sLock(){
  if(A.off())return;
  osc('square',880,880,0.06,0.06);
  osc('square',1320,1320,0.06,0.09,0.08);
}
function sDice(){
  if(A.off())return;
  for(let i=0;i<5;i++)nz('bandpass',2200,3,0.04,0.03,i*0.12*(1+i*0.15));
}
function sBoom(big){
  if(A.off())return;
  osc('sine',big?150:120,26,big?0.55:0.4,big?0.9:0.6);
  nz('lowpass',big?900:650,0.8,big?0.5:0.35,big?1.3:0.85,0,55);
  nz('bandpass',300,1.2,0.2,0.5,0.05);
  for(let i=0;i<(big?5:3);i++)nz('bandpass',700+rng()*900,2,0.09,0.08,0.15+i*0.09);
}
function sWhoosh(){
  if(A.off())return;
  nz('bandpass',220,2,0.16,0.6,0,1600);
  osc('sine',70,120,0.16,0.5);
}
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
addEventListener('resize',()=>{if(SR.active==='space')fitCanvas();});
function fitZoom(){return Math.min(cssW/W,cssH/H);}
function clampCam(){
  cam.z=Math.max(fitZoom()*0.92,Math.min(1.7,cam.z));
  const hw=cssW/(2*cam.z),hh=cssH/(2*cam.z);
  cam.x=Math.max(Math.min(cam.x,W+300-hw),hw-300);
  // the bottom dock hides part of the stage, so the map may scroll that much further up past its edge
  cam.y=Math.max(Math.min(cam.y,H+300+Math.max(0,cssH-FR.y1)/cam.z-hh),hh-300);
  if(hw*2>W+600)cam.x=W/2;
  if(hh*2>H+600)cam.y=H/2;
}
/* ---------- camera framing that knows where the HUD is ----------
   FR is the part of the stage the HUD leaves free (css px): above the bottom dock (command bar + VS panel),
   and clear of the objective / minimap stacks on desktop. Attack frames both fighters inside it; on phones the
   followed ship sits at ~45% of the stage height (portrait) or ~28% (landscape) so the bar never covers it. */
let FR={x0:0,y0:0,x1:0,y1:0};
const BOT=byId('sBottom');
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
/* goals are re-resolved every frame against FR, so they stay right while the dock grows and shrinks */
function focusGoal(s,z){return {focus:s,x:s.x,y:s.y,z};}
function frameGoalOf(pts,z0,padPx,padW){return {pts,z0,padPx:padPx||0,padW:padW||0,x:cam.x,y:cam.y,z:cam.z};}
function resolveGoal(g){
  if(g.focus){g.x=g.focus.x;g.y=g.focus.y+(0.5-focusFrac())*cssH/g.z;}
  else if(g.pts){
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const p of g.pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
    const fw=Math.max(60,FR.x1-FR.x0-2*g.padPx),fh=Math.max(60,FR.y1-FR.y0-2*g.padPx);
    const z=Math.max(fitZoom()*0.95,Math.min(g.z0,fw/Math.max(1,x1-x0+g.padW),fh/Math.max(1,y1-y0+g.padW)));
    g.z=z;
    g.x=(x0+x1)/2-((FR.x0+FR.x1)/2-cssW/2)/z;
    g.y=(y0+y1)/2-((FR.y0+FR.y1)/2-cssH/2)/z;
  }
}
function camFitPlayers(snap){
  const ps=ships.filter(s=>s.alive&&s.faction==='reb');
  const es=ships.filter(s=>s.alive&&s.faction==='heg');
  const all=ps.length?ps.concat(es.slice(0,1)):ships.filter(s=>s.alive);
  if(!all.length)return;
  const g=frameGoalOf(all,0.7,36,900);
  if(snap){resolveGoal(g);cam={x:g.x,y:g.y,z:g.z};clampCam();camGoal=g;}   // the goal stays, so the first frame re-frames once the bar has been measured
  else camGoal=g;
}
function worldToCss(wx,wy){return [(wx-cam.x)*cam.z+cssW/2,(wy-cam.y)*cam.z+cssH/2];}
function cssToWorld(px,py){return {x:(px-cssW/2)/cam.z+cam.x,y:(py-cssH/2)/cam.z+cam.y};}
function slowmo(){
  return phase==='PLANNING'||awaitAction||(attackQ&&attackQ.cur&&attackQ.cur.stage==='await');
}

/* ---------- starfield & dust ---------- */
const stars=[],farStars=[],dust=[];
(function(){
  for(let i=0;i<520;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:0.9+Math.random()*1.2,a:0.3+Math.random()*0.4,tw:Math.random()*6});
  for(let i=0;i<60;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:2+Math.random()*1.4,a:0.8,tw:Math.random()*6,glint:true});
  for(let i=0;i<260;i++)farStars.push({x:Math.random()*(W*0.4+2400)-1200,y:Math.random()*(H*0.4+2400)-1200,r:0.6+Math.random(),a:0.2+Math.random()*0.25});
  for(let i=0;i<70;i++)dust.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*26,vy:(Math.random()-0.5)*26,r:1+Math.random()*1.6,a:0.1+Math.random()*0.16});
})();

/* ---------- ship drawing ---------- */
function shipPath(cls){
  switch(cls){
    case 'viper':return {body:[[17,0],[7,-4.5],[-9,-5.5],[-14,-2.5],[-14,2.5],[-9,5.5],[7,4.5]],
      extra:c=>{c.moveTo(2,-4);c.lineTo(-6,-14);c.lineTo(-1,-14);c.lineTo(6,-5);c.moveTo(2,4);c.lineTo(-6,14);c.lineTo(-1,14);c.lineTo(6,5);},canopy:[3,0,3.4,2.2]};
    case 'talon':return {body:[[19,0],[-2,-4],[-9,-11],[-13,-9],[-7,-1.5],[-7,1.5],[-13,9],[-9,11],[-2,4]],extra:null,canopy:[6,0,3,1.8]};
    case 'scim':return {body:[[17,0],[3,-9],[-11,-6.5],[-7,0],[-11,6.5],[3,9]],
      extra:c=>{c.moveTo(3,-9);c.lineTo(-3,-14);c.lineTo(-9,-12);c.moveTo(3,9);c.lineTo(-3,14);c.lineTo(-9,12);},canopy:[4,0,3,2]};
    case 'fled':return {body:[[13,0],[6,-5],[-8,-6],[-12,-3],[-12,3],[-8,6],[6,5]],
      extra:c=>{c.moveTo(0,-6);c.lineTo(-3,-11);c.lineTo(-8,-10);c.moveTo(0,6);c.lineTo(-3,11);c.lineTo(-8,10);},canopy:[4,0,3.2,2.2]};
    case 'graf':return {body:[[15,-4],[15,4],[10,7],[-13,7],[-16,4],[-16,-4],[-13,-7],[10,-7]],
      extra:c=>{c.moveTo(-6,-7);c.rect(-14,-11,10,4);c.moveTo(-6,7);c.rect(-14,7,10,4);},canopy:[11,0,2.4,3.2]};
    case 'depot':return {body:[[11,-5],[5,-11],[-5,-11],[-11,-5],[-11,5],[-5,11],[5,11],[11,5]],
      extra:c=>{c.moveTo(11,-3);c.rect(11,-3,5,6);c.moveTo(-16,-3);c.rect(-16,-3,5,6);c.moveTo(-3,-16);c.rect(-3,-16,6,5);c.moveTo(-3,11);c.rect(-3,11,6,5);},canopy:[0,0,3.4,3.4]};
    case 'drone':case 'monitor':return {body:[[11,0],[3,-3],[-5,-8],[-9,-6],[-6,0],[-9,6],[-5,8],[3,3]],
      extra:null,canopy:[3,0,2,1.4]};
    case 'pursuer':return {body:[[14,0],[4,-4],[-6,-9],[-11,-5],[-8,0],[-11,5],[-6,9],[4,4]],
      extra:c=>{c.moveTo(6,-3);c.lineTo(-3,-12);c.moveTo(6,3);c.lineTo(-3,12);},canopy:[4,0,2,1.4]};
    case 'clamper':return {body:[[12,-7],[12,7],[2,11],[-12,9],[-14,0],[-12,-9],[2,-11]],
      extra:c=>{c.moveTo(12,-7);c.lineTo(17,-11);c.moveTo(12,7);c.lineTo(17,11);},canopy:[5,0,3,2.4]};
    case 'mote':return {body:[[12,0],[5,-5],[-7,-6],[-11,-3],[-11,3],[-7,6],[5,5]],
      extra:c=>{c.moveTo(0,-6);c.lineTo(-4,-10);c.moveTo(0,6);c.lineTo(-4,10);},canopy:[4,0,3,2]};
  }
}
const pre=hex=>T.rgba(hex,1).slice(0,-2);   // 'rgba(r,g,b,' prefix, for building alpha strings
function shipColors(s){
  if(s.faction==='reb')return {hull:C.plateHi,edge:C.rebelHi,acc:C.rebel,glow:pre(C.rebel)};
  if(s.cls==='depot')return {hull:'#6a6146',edge:C.hegHi,acc:C.gold,glow:pre(C.heg)};   // fuel store: the objective, so gold
  return {hull:isDrone(s)?C.night:C.hull,edge:C.hegHi,acc:C.heg,glow:pre(C.heg)};
}
function iconBoost(){return Math.max(1,Math.min(2.8,0.55/cam.z));}
const shipR=s=>24*s.size*cam.z*iconBoost();    // on-screen radius of a ship's shield ring
function paintShipBody(c2,s,sc,glow){
  const SC=shipColors(s),P=shipPath(s.cls);
  c2.scale(sc,sc);
  c2.lineJoin='round';
  const stroke=()=>{                              // ink outline (icy glow on hostiles), hull, faction edge
    c2.lineWidth=3.4;c2.strokeStyle=C.ink;
    if(glow){c2.shadowColor=T.rgba(C.heg,.85);c2.shadowBlur=14;}
    c2.stroke();c2.shadowBlur=0;c2.shadowColor='transparent';
    c2.fillStyle=SC.hull;c2.fill();
    c2.lineWidth=1.3;c2.strokeStyle=SC.edge;c2.stroke();
  };
  c2.beginPath();P.body.forEach((p,i)=>i?c2.lineTo(p[0],p[1]):c2.moveTo(p[0],p[1]));c2.closePath();
  stroke();
  if(P.extra){c2.beginPath();P.extra(c2);stroke();}
  c2.beginPath();c2.moveTo(10,0);c2.lineTo(2,-2.6);c2.lineTo(2,2.6);c2.closePath();
  c2.fillStyle=SC.acc;c2.fill();
  const [cx2,cy2,cw2,ch2]=P.canopy;
  c2.beginPath();c2.ellipse(cx2,cy2,cw2,ch2,0,0,Math.PI*2);
  c2.fillStyle=C.void;c2.fill();
  c2.strokeStyle=SC.glow+'0.8)';c2.lineWidth=0.7;c2.stroke();
}
function drawShip(s,alpha,gx,gy,gh){
  const x=gx!==undefined?gx:s.x,y=gy!==undefined?gy:s.y,h=gh!==undefined?gh:s.h;
  const SC=shipColors(s),sc=s.size*1.6*iconBoost();
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.rotate(h);
  ctx.scale(1,1-0.38*Math.abs(s.visRoll||0));
  const pul=0.75+0.25*Math.sin(ambT*0.006+x*0.05);
  const boost=s.moveBoost||0;
  let g=ctx.createRadialGradient(-14*sc,0,1,(-14-boost*16)*sc,0,(10+boost*18)*sc);
  g.addColorStop(0,SC.glow+(0.75*pul+boost*0.25)+')');g.addColorStop(1,SC.glow+'0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse((-14-boost*8)*sc,0,(10+boost*18)*sc,(7+boost*4)*sc,0,0,Math.PI*2);ctx.fill();
  paintShipBody(ctx,s,sc,s.faction==='heg');
  ctx.restore();
  // shield zone arcs (from segments): cyan, the stacked guest segment violet
  if(gx===undefined&&maxShield(s)>0){
    const r=24*s.size*iconBoost();
    const fx=s.shieldFx?Math.max(0,1-(worldT-s.shieldFx)/450):0;
    ctx.save();ctx.translate(x,y);ctx.rotate(h);ctx.globalAlpha=alpha;
    for(const z of ['F','R']){
      const segsAt=['F','R'].filter(k=>s.segs[k].at===z&&s.segs[k].val>0);
      const val=zoneShield(s,z);
      const ref=Math.max(s.segs.F.max,s.segs.R.max,1);
      const base=val>0?0.12+0.5*Math.min(1,val/ref):0;
      const flash=(fx>0&&s.shieldFxZone===z)?fx*0.8:0;
      if(base+flash<0.02)continue;
      const from=z==='F'?-Math.PI/2:Math.PI/2,to=z==='F'?Math.PI/2:Math.PI*1.5;
      const lw=(2+flash*2)*Math.max(0.6,iconBoost()*0.8);
      ctx.lineCap='round';
      ctx.strokeStyle=T.rgba(C.ink,0.55*Math.min(1,base+flash+0.3));ctx.lineWidth=lw+2.4;
      ctx.beginPath();ctx.arc(0,0,r,from,to);ctx.stroke();
      ctx.strokeStyle=T.rgba(C.shield,Math.min(1,base+flash));ctx.lineWidth=lw;
      ctx.beginPath();ctx.arc(0,0,r,from,to);ctx.stroke();
      if(segsAt.length>1){ // stacked: second ring, violet for the guest
        ctx.strokeStyle=T.rgba(C.psi,Math.min(1,base+flash));
        ctx.beginPath();ctx.arc(0,0,r+4,from,to);ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
/* firing arc: gold wash for yours (hostiles in their own blue), range bands, lock envelope, dashed bullseye line */
function drawArcFor(s){
  const reb=s.faction==='reb',col=reb?C.gold:C.heg;
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.h);
  ctx.fillStyle=T.rgba(col,reb?0.12:0.08);
  ctx.strokeStyle=T.rgba(col,0.42);ctx.lineWidth=1.4/cam.z;
  ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,3*RU,-ARCH,ARCH);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.setLineDash([4/cam.z,8/cam.z]);
  for(let b=1;b<=2;b++){ctx.beginPath();ctx.arc(0,0,b*RU,-ARCH,ARCH);ctx.stroke();}
  // lock envelope: front hemisphere out to weapons range
  ctx.strokeStyle=T.rgba(C.hazard,0.4);
  ctx.beginPath();ctx.arc(0,0,LOCK_RNG,-LOCK_ARC,LOCK_ARC);ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle=T.rgba(col,0.8);ctx.lineWidth=1.8/cam.z;
  ctx.setLineDash([10/cam.z,9/cam.z]);
  ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(3*RU,0);ctx.stroke();
  ctx.setLineDash([]);
  for(let b=1;b<=3;b++){ctx.beginPath();ctx.moveTo(b*RU,-9/cam.z);ctx.lineTo(b*RU,9/cam.z);ctx.stroke();}
  ctx.restore();
  let best=null,bf=0.05;
  for(const t of ships){
    if(!t.alive||t.faction===s.faction)continue;
    if(dist(s,t)>3*RU)continue;
    const f=bullsFactor(s,t);
    if(f>bf){bf=f;best=t;}
  }
  if(best){
    ctx.save();ctx.translate(best.x,best.y);
    const r=(30+8*Math.sin(ambT*0.008))*iconBoost();
    ctx.strokeStyle=T.rgba(col,0.35+0.6*bf);
    ctx.lineWidth=(1.4+bf)*1.2/Math.max(cam.z,0.4);
    const a0=ambT*0.002;
    for(let k=0;k<4;k++){const a=a0+k*Math.PI/2;ctx.beginPath();ctx.arc(0,0,r,a,a+0.5);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(-r*0.5,0);ctx.lineTo(r*0.5,0);ctx.moveTo(0,-r*0.5);ctx.lineTo(0,r*0.5);ctx.stroke();
    ctx.restore();
  }
}
/* planned maneuver: ink halo, dotted line (gold when it is the one being plotted), destination dot, ghost ship */
function drawPlanPath(s,man,strong){
  const p=manPath(s.x,s.y,s.h,[Math.min(man[0],maxSpeedOf(s)),man[1]]);
  const col=strong?C.gold:T.rgba(C.rebel,0.8),k=1/cam.z;
  const e=clampEnd(p(1));
  ctx.save();ctx.lineCap='round';
  ctx.beginPath();
  for(let i=0;i<=24;i++){const q=p(i/24);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);}
  ctx.lineWidth=6*k;ctx.strokeStyle=T.rgba(C.ink,strong?0.8:0.5);ctx.stroke();
  ctx.setLineDash([2*k,9*k]);ctx.lineDashOffset=-hudT*20*k;ctx.lineWidth=4*k;ctx.strokeStyle=col;ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(e.x,e.y,8*k,0,Math.PI*2);ctx.fillStyle=C.ink;ctx.fill();
  ctx.beginPath();ctx.arc(e.x,e.y,5*k,0,Math.PI*2);ctx.fillStyle=strong?C.gold:C.rebel;ctx.fill();
  drawShip(s,strong?0.42:0.25,e.x,e.y,e.h);
  ctx.restore();
}
function drawRock(r){
  ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.rot);
  ctx.beginPath();
  const n=r.verts.length;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,rr=r.r*r.verts[i];
    i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);
  }
  ctx.closePath();
  const g=ctx.createRadialGradient(-r.r*0.35,-r.r*0.35,r.r*0.1,0,0,r.r*1.1);
  g.addColorStop(0,'#3a4150');g.addColorStop(0.6,'#272c38');g.addColorStop(1,'#1a1f29');
  ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(120,140,180,0.25)';ctx.lineWidth=1.4/Math.max(cam.z,0.3);ctx.stroke();
  ctx.fillStyle='rgba(10,14,20,0.5)';
  ctx.beginPath();ctx.arc(r.r*0.25,r.r*0.15,r.r*0.2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(-r.r*0.2,r.r*0.3,r.r*0.12,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
/* locks: yours in gold, locks on you in Hegemony blue; ink under the dashes so they read over anything */
function drawLockLines(){
  for(const s of ships){
    if(!s.alive||!s.lock)continue;
    const t=ships.find(x=>x.id===s.lock.target&&x.alive);
    if(!t)continue;
    const col=s.faction==='reb'?C.gold:C.heg;
    const mx=(s.x+t.x)/2,my=(s.y+t.y)/2;
    const dx=t.x-s.x,dy=t.y-s.y,L=Math.hypot(dx,dy)||1;
    const ox=-dy/L*40,oy=dx/L*40;
    ctx.save();ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.quadraticCurveTo(mx+ox,my+oy,t.x,t.y);
    ctx.lineWidth=5/cam.z;ctx.strokeStyle=T.rgba(C.ink,0.6);ctx.stroke();
    ctx.setLineDash([7/cam.z,7/cam.z]);ctx.lineDashOffset=-worldT*0.02/cam.z;
    ctx.lineWidth=2.2/cam.z;ctx.strokeStyle=T.rgba(col,0.9);ctx.stroke();
    ctx.setLineDash([]);
    const r=(30*t.size)*iconBoost();
    ctx.translate(t.x,t.y);ctx.rotate(Math.PI/4);
    ctx.lineWidth=4.6/Math.max(cam.z,0.4);ctx.strokeStyle=C.ink;ctx.strokeRect(-r*0.8,-r*0.8,r*1.6,r*1.6);
    ctx.lineWidth=2.2/Math.max(cam.z,0.4);ctx.strokeStyle=col;ctx.strokeRect(-r*0.8,-r*0.8,r*1.6,r*1.6);
    ctx.restore();
  }
}
function drawLockBadges(){
  for(const s of ships){
    if(!s.alive||!s.lock)continue;
    const t=ships.find(x=>x.id===s.lock.target&&x.alive);
    if(!t)continue;
    const mx=(s.x+t.x)/2,my=(s.y+t.y)/2;
    const dx=t.x-s.x,dy=t.y-s.y,L=Math.hypot(dx,dy)||1;
    const [bx,by]=worldToCss(mx-dy/L*30,my+dx/L*30);
    T.label(ctx,String(s.lock.level),bx,by,{icon:'targetlock',color:s.faction==='reb'?C.gold:C.heg,border:s.faction==='reb'?C.gold:C.heg,size:12,pad:5});
  }
}
/* nerve and critical icons beside a ship: panic (orange), cool (cyan), crits (orange wrench with a count) */
function drawStateIcon(s,px,py,r){
  const st=coolState(s);
  if(st==='steady')return;
  const x=px-r-12,y=py-r-8;
  if(st==='panic')T.icon(ctx,'panic',x,y,19,C.hazard,{outline:true});
  else T.icon(ctx,'cool',x,y,19,C.shield,{outline:true});
}
function drawCritPip(s,px,py,r){
  if(!s.crits.length)return;
  T.label(ctx,String(s.crits.length),px+r+14,py-r-8,{icon:'work',color:C.hazard,size:12,pad:4});
}
/* sword over the attacker, shield over the defender (faction colours) */
function drawCombatIcons(c,now){
  const pulse=Math.sin(now*0.008)*0.5+0.5,k=1+pulse*0.12;
  const aCol=c.s.faction==='reb'?C.rebel:C.heg;
  const dCol=c.t.faction==='reb'?C.rebel:C.heg;
  const [ax,ay]=worldToCss(c.s.x,c.s.y);
  const [dx2,dy2]=worldToCss(c.t.x,c.t.y);
  T.icon(ctx,'sword',ax,ay-shipR(c.s)-30,24*k,aCol,{outline:true});
  T.icon(ctx,'shield',dx2,dy2-shipR(c.t)-30,24*k,dCol,{outline:true});
}
/* names, hull and armour pips, state icons and crit counts: one label layer so nothing stacks on anything */
function drawShipHud(now){
  const L=T.labelLayer(),curAtk=attackQ&&attackQ.cur;
  for(const s of ships){
    if(!s.alive)continue;
    const [px,py]=worldToCss(s.x,s.y);
    if(px<-60||px>cssW+60||py<-80||py>cssH+60)continue;
    const reb=s.faction==='reb',r=shipR(s);
    const hot=s.id===selId||(exec&&exec.order[exec.idx]===s)||(curAtk&&(curAtk.s===s||curAtk.t===s));
    L.add((s.id==='E1'?'★ ':'')+s.name,px,py+r+14,{color:reb?C.rebel:C.heg,size:12},hot?3:2);
    let by=py-r-12;
    T.hpPips(ctx,px,by,{hp:s.hull,max:s.maxHull});
    if(s.maxArm>0){
      by-=10;
      const cells=5,cw=8,ch=4,gap=2,w=cells*cw+(cells-1)*gap+4,lit=Math.ceil(Math.max(0,s.arm/s.maxArm)*cells-0.001);
      T.rr(ctx,px-w/2,by-ch/2-2,w,ch+4,2.5);ctx.fillStyle=C.ink;ctx.fill();
      for(let i=0;i<cells;i++){T.rr(ctx,px-w/2+2+i*(cw+gap),by-ch/2,cw,ch,1.2);ctx.fillStyle=i<lit?C.steel:'#1b1f40';ctx.fill();}
    }
    drawStateIcon(s,px,py,r);
    drawCritPip(s,px,py,r);
  }
  L.flush(ctx);
}
/* the fight in progress: dashed fire line, reticle on the target, sword and shield */
function drawCombatFocus(now){
  const c=attackQ&&attackQ.cur;
  if(c&&c.stage!=='fire'&&c.stage!=='end'){
    const [ax,ay]=worldToCss(c.s.x,c.s.y),[bx,by]=worldToCss(c.t.x,c.t.y);
    T.fireLine(ctx,ax,ay,bx,by,c.s.faction==='reb'?'friend':'foe',hudT);
    T.reticle(ctx,bx,by,shipR(c.t)+10,hudT);
    drawCombatIcons(c,now);
  }
  if(lockPickMode&&awaitAction){
    for(const t of ships){
      if(!t.alive||t.faction!=='heg')continue;
      if(!(inLockZone(awaitAction,t)&&!losBlocked(awaitAction,t)))continue;
      const [tx,ty]=worldToCss(t.x,t.y);
      T.reticle(ctx,tx,ty,shipR(t)+10+3*Math.sin(now*0.01),hudT);
    }
  }
}
/* ---------- VS panel (DOM, docked above the command bar) ---------- */
const vsHost=byId('vsHost');
let vsCtl=null;
function sent(t){          // all-caps game strings read as sentences in the HUD
  t=String(t);
  if(t!==t.toUpperCase()||!/[A-Z]/.test(t))return t;
  t=t.replace(/\bSHD\b/g,'shield').replace(/\bFWD\b/g,'fore').replace(/\bARM\b/g,'armour');
  t=t.toLowerCase().replace(/[a-z]/,m=>m.toUpperCase());
  return t.replace(/\b(ft-4|sf-11|vk-3|vt-2|rq-7|vc)\b/g,m=>m.toUpperCase());
}
function vsModel(now){
  const q=attackQ,c=q.cur;
  const rows=a=>a.map(([lab,val,base])=>({label:sent(lab),val,base:!!base}));
  const reb=c.s.faction==='reb';
  /* the shooter's side: a live preview while a rebel picks a weapon, the revealed rows once the shot is on */
  let atk=c.atk,aShown=atk?c.revealA:0;
  if(!atk&&reb&&c.stage==='await'){atk=computeATK(c.s,c.t,c.wkey);aShown=atk.entries.length;}
  const side=(sh,entries,shown,total,role,icon,totalLabel)=>({
    name:sh.name,initials:HUD.initials(sh.faction==='reb'?sh.pilot.pname:sh.name),role,roleIcon:icon,foe:sh.faction!=='reb',
    mods:rows(entries),shown,total:entries.length&&shown>=entries.length?total:null,totalLabel});
  const aEntries=atk?atk.entries:[];
  const showPct=!!atk&&aShown>=aEntries.length;
  const need=c.need||(atk?needFor(c.tn.total,atk.total):0);
  const rolling=c.stage==='roll',settled=c.stage==='verdict'||(c.stage==='fire');
  const face=rolling?(HUD.reduced?null:((Math.floor(now/70)*7)%20)+1):settled?c.roll:null;
  return {
    a:side(c.s,aEntries,aShown,atk?atk.total:null,'Attacking','sword','Attack'),
    d:side(c.t,c.tn.entries,Math.min(c.reveal,c.tn.entries.length),c.tn.total,'Defending','shield','Defence'),
    odds:showPct?{pct:pctFor(need),need}:null,
    die:{face,state:rolling?'rolling':settled?(c.hit?'hit':'miss'):'idle'},
    step:'Shot '+Math.min(q.idx,q.order.length)+' of '+q.order.length,
    stamp:(c.stage==='verdict'||(c.stage==='fire'&&!c.applied))?{text:c.hit?'Hit':'Miss',kind:c.hit?'':'bad'}:null};
}
function vsSync(now){
  const c=attackQ&&attackQ.cur;
  if(phase!=='ATTACK'||!c){if(!vsHost.hidden){vsHost.hidden=true;measureHud();}return;}
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
    const s=b.ship;
    const [px,py]=worldToCss(s.x,s.y);
    if(px<-100||px>cssW+100||py<-100||py>cssH+100)continue;
    const alpha=t<0.08?t/0.08:t>0.85?(1-t)/0.15:1;
    const col=s.faction==='reb'?C.rebel:C.heg;
    ctx.font='600 12px '+FONT.ui;
    const name=s.pilot.first;
    const lines=wrapText(b.text,190);
    ctx.font='800 12px '+FONT.ui;
    let wmax=ctx.measureText(name).width;
    ctx.font='600 12px '+FONT.ui;
    for(const l of lines)wmax=Math.max(wmax,ctx.measureText(l).width);
    const bw=wmax+22,bh=22+lines.length*15,r=shipR(s);
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
function drawFloaters(now){
  for(const f of floaters){
    const t=(now-f.t0)/1200;if(t>=1)continue;
    const [px,py]=worldToCss(f.x,f.y);
    if(px<-100||px>cssW+100||py<-60||py>cssH+60)continue;
    ctx.globalAlpha=t<0.1?t/0.1:1-Math.max(0,(t-0.6)/0.4);
    T.label(ctx,sent(f.text),px,py-t*32,{kind:'float',color:f.col,size:13});
  }
  ctx.globalAlpha=1;
  floaters=floaters.filter(f=>now-f.t0<1200);
}
/* minimap: its own canvas in the top-right slot; click or drag it to jump the camera */
const mmCv=byId('mm'),mmCtx=mmCv.getContext('2d');
let mmT=0,mmW=0,mmH=0,mmDragging=false;
function mmGeom(){const cw=mmCv.clientWidth,ch=mmCv.clientHeight,k=Math.min((cw-8)/W,(ch-8)/H);return {cw,ch,k,ox:(cw-W*k)/2,oy:(ch-H*k)/2};}
function drawMinimap(now){
  if(!mmCv.offsetParent||now-mmT<90)return;
  mmT=now;
  const {cw,ch,k,ox,oy}=mmGeom();
  if(!cw||!ch)return;
  if(mmW!==Math.round(cw*dpr)||mmH!==Math.round(ch*dpr)){mmW=mmCv.width=Math.round(cw*dpr);mmH=mmCv.height=Math.round(ch*dpr);}
  const g=mmCtx;
  g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle=C.void;g.fillRect(0,0,cw,ch);
  g.fillStyle=C.night;g.fillRect(ox,oy,W*k,H*k);
  g.fillStyle=T.rgba(C.steel,0.3);
  for(const r of rocks){g.beginPath();g.arc(ox+r.x*k,oy+r.y*k,Math.max(1.2,r.r*k),0,Math.PI*2);g.fill();}
  for(const s of ships){
    if(!s.alive)continue;
    const mark=(SCEN==='instructor'&&s.id==='E1')||isStruct(s);
    g.fillStyle=s.faction==='reb'?C.rebel:(mark?C.gold:C.heg);
    g.beginPath();g.arc(ox+s.x*k,oy+s.y*k,mark?3.4:3,0,Math.PI*2);g.fill();
    g.lineWidth=1.2;g.strokeStyle=C.ink;g.stroke();
  }
  const hw=cssW/(2*cam.z),hh=cssH/(2*cam.z);
  g.lineWidth=2;g.strokeStyle=C.gold;
  g.strokeRect(ox+(cam.x-hw)*k,oy+(cam.y-hh)*k,hw*2*k,hh*2*k);
}
function mmJump(ev){
  const r=mmCv.getBoundingClientRect(),{k,ox,oy}=mmGeom();
  cam.x=(ev.clientX-r.left-ox)/k;cam.y=(ev.clientY-r.top-oy)/k;
  camGoal=null;clampCam();
}
mmCv.addEventListener('pointerdown',ev=>{mmCv.setPointerCapture(ev.pointerId);mmDragging=true;mmJump(ev);});
mmCv.addEventListener('pointermove',ev=>{if(mmDragging)mmJump(ev);});
mmCv.addEventListener('pointerup',()=>{mmDragging=false;});
mmCv.addEventListener('pointercancel',()=>{mmDragging=false;});

/* ---------- main render ---------- */
function render(now){
  const dt=Math.min(0.05,(now-(lastFrame||now))/1000);
  lastFrame=now;
  worldT=now;
  ambT+=dt*1000*(slowmo()?0.32:1);
  hudT=RM?0:now/1000;
  if(camGoal){
    resolveGoal(camGoal);
    const k=RM?1:0.12;
    cam.x+=(camGoal.x-cam.x)*k;cam.y+=(camGoal.y-cam.y)*k;cam.z+=(camGoal.z-cam.z)*k;
    /* a frame goal holds through the whole attack phase, so it follows the dock as it grows */
    if(!(camGoal.pts&&phase==='ATTACK')&&Math.abs(camGoal.x-cam.x)<2&&Math.abs(camGoal.y-cam.y)<2&&Math.abs(camGoal.z-cam.z)<0.01)camGoal=null;
    clampCam();
  }
  let sx=0,sy=0;
  if(shake>0){sx=(rng()-0.5)*shake;sy=(rng()-0.5)*shake;shake*=0.88;if(shake<0.4)shake=0;}
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#04060d';ctx.fillRect(0,0,cv.width,cv.height);
  ctx.setTransform(cam.z*dpr,0,0,cam.z*dpr,dpr*(cssW/2-(cam.x*0.35)*cam.z+sx),dpr*(cssH/2-(cam.y*0.35)*cam.z+sy));
  let g=ctx.createRadialGradient(W*0.14,H*0.30,60,W*0.14,H*0.30,900);
  g.addColorStop(0,'rgba(64,42,120,0.14)');g.addColorStop(1,'rgba(64,42,120,0)');
  ctx.fillStyle=g;ctx.fillRect(-1200,-1200,W*0.4+2400,H*0.4+2400);
  g=ctx.createRadialGradient(W*0.30,H*0.05,60,W*0.30,H*0.05,1100);
  g.addColorStop(0,'rgba(28,90,110,0.12)');g.addColorStop(1,'rgba(28,90,110,0)');
  ctx.fillStyle=g;ctx.fillRect(-1200,-1200,W*0.4+2400,H*0.4+2400);
  g=ctx.createRadialGradient(-950,H*0.12,200,-950,H*0.12,650);
  g.addColorStop(0,'#0c1730');g.addColorStop(0.8,'#081022');g.addColorStop(0.99,'#0b1834');g.addColorStop(1,'rgba(20,45,90,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(-950,H*0.12,650,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#cfe0ff';
  for(const s of farStars){ctx.globalAlpha=s.a;ctx.beginPath();ctx.arc(s.x,s.y,s.r/Math.max(cam.z,0.35),0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  ctx.setTransform(cam.z*dpr,0,0,cam.z*dpr,dpr*(cssW/2-cam.x*cam.z+sx),dpr*(cssH/2-cam.y*cam.z+sy));
  for(const s of stars){
    const a=s.a*(0.7+0.3*Math.sin(ambT*0.001+s.tw));
    ctx.globalAlpha=a;ctx.fillStyle='#cfe0ff';
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    if(s.glint){
      ctx.globalAlpha=a*0.5;ctx.strokeStyle='#cfe0ff';ctx.lineWidth=0.8;
      ctx.beginPath();ctx.moveTo(s.x-s.r*3.2,s.y);ctx.lineTo(s.x+s.r*3.2,s.y);
      ctx.moveTo(s.x,s.y-s.r*3.2);ctx.lineTo(s.x,s.y+s.r*3.2);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  const dscale=slowmo()?0.32:1;
  ctx.fillStyle='#9fb6d8';
  for(const d of dust){
    d.x+=d.vx*dt*dscale;d.y+=d.vy*dt*dscale;
    if(d.x<0)d.x+=W;if(d.x>W)d.x-=W;if(d.y<0)d.y+=H;if(d.y>H)d.y-=H;
    ctx.globalAlpha=d.a;
    ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(90,130,200,0.05)';ctx.lineWidth=1/cam.z;
  ctx.beginPath();
  for(let x=MARGIN;x<=W-MARGIN+1;x+=RU){ctx.moveTo(x,MARGIN);ctx.lineTo(x,H-MARGIN);}
  for(let y=MARGIN;y<=H-MARGIN+1;y+=RU){ctx.moveTo(MARGIN,y);ctx.lineTo(W-MARGIN,y);}
  ctx.stroke();
  ctx.strokeStyle='rgba(120,150,220,0.22)';ctx.lineWidth=1.6/cam.z;
  ctx.strokeRect(MARGIN,MARGIN,W-2*MARGIN,H-2*MARGIN);
  ctx.strokeStyle=T.rgba(C.gold,0.35);ctx.lineWidth=2.2/cam.z;
  const cc=44;
  ctx.beginPath();
  [[MARGIN,MARGIN,1,1],[W-MARGIN,MARGIN,-1,1],[MARGIN,H-MARGIN,1,-1],[W-MARGIN,H-MARGIN,-1,-1]].forEach(([x,y,dx,dy])=>{
    ctx.moveTo(x+dx*cc,y);ctx.lineTo(x,y);ctx.lineTo(x,y+dy*cc);
  });
  ctx.stroke();
  for(const r of rocks)drawRock(r);

  if(phase==='CUTSCENE')csUpdate(now);

  const sel=ships.find(s=>s.id===selId&&s.alive);
  if(sel&&(phase==='PLANNING'||phase==='GAMEOVER'))drawArcFor(sel);
  const curAtk=attackQ&&attackQ.cur;
  if(curAtk&&curAtk.s.faction==='reb'&&curAtk.stage==='await')drawArcFor(curAtk.s);
  if(phase==='PLANNING'){
    for(const s of ships){
      if(!s.alive||s.faction!=='reb')continue;
      if(s.plan.man&&s.id!==selId)drawPlanPath(s,s.plan.man,false);
    }
    if(sel&&sel.faction==='reb'){
      if(hoverMan)drawPlanPath(sel,hoverMan,true);
      else if(sel.plan.man)drawPlanPath(sel,sel.plan.man,true);
    }
  }
  drawLockLines();
  for(const s of ships){
    if(!s.alive)continue;
    if(s.trail.length>1){
      ctx.beginPath();let first=true;
      for(const p of s.trail){if(now-p.t>800)continue;first?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);first=false;}
      ctx.strokeStyle=T.rgba(s.faction==='reb'?C.rebel:C.heg,0.3);
      ctx.lineWidth=2/cam.z;ctx.stroke();
      s.trail=s.trail.filter(p=>now-p.t<=800);
    }
    if(!RM&&s.hull<s.maxHull*0.5&&rng()<0.12)
      parts.push({x:s.x-Math.cos(s.h)*10,y:s.y-Math.sin(s.h)*10,vx:(rng()-0.5)*20,vy:(rng()-0.5)*20,life:0,max:1.2,col:'#5a616e',size:2.6,drag:0.985});
    const active=(s.id===selId)||(exec&&exec.order[exec.idx]===s)||(curAtk&&curAtk.s===s);
    if(active){
      ctx.save();ctx.translate(s.x,s.y);
      ctx.strokeStyle=T.rgba(s.faction==='reb'?C.gold:C.heg,0.9);
      ctx.lineWidth=1.6/cam.z;
      const r=26*s.size*iconBoost(),a0=now*0.001;
      for(let k=0;k<4;k++){ctx.beginPath();ctx.arc(0,0,r,a0+k*Math.PI/2,a0+k*Math.PI/2+0.7);ctx.stroke();}
      ctx.restore();
    }
    drawShip(s,1);
  }
  for(const m of missFx){
    const t=Math.min(1,Math.max(0,(now-m.t0)/m.dur));
    if(t<=0)continue;
    const x=m.x+(m.tx-m.x)*t,y=m.y+(m.ty-m.y)*t;
    const a=Math.atan2(m.ty-m.y,m.tx-m.x);
    const wob=Math.sin(t*20)*5*(1-t);
    const wx=x-Math.sin(a)*wob,wy=y+Math.cos(a)*wob;
    if(!RM){
      parts.push({x:wx,y:wy,vx:(rng()-0.5)*14,vy:(rng()-0.5)*14,life:0,max:0.55,col:C.psi,size:2.6,drag:0.95});
      parts.push({x:wx-Math.cos(a)*8,y:wy-Math.sin(a)*8,vx:(rng()-0.5)*10,vy:(rng()-0.5)*10,life:0,max:0.8,col:'#6e6a80',size:2,drag:0.97});
    }
    let gg=ctx.createRadialGradient(wx,wy,0.5,wx,wy,12);
    gg.addColorStop(0,'#ffffff');gg.addColorStop(0.3,C.psi);gg.addColorStop(1,T.rgba(C.psi,0));
    ctx.fillStyle=gg;ctx.beginPath();ctx.arc(wx,wy,12,0,Math.PI*2);ctx.fill();
  }
  missFx=missFx.filter(m=>now-m.t0<m.dur);
  for(const b of bolts){
    const t=(now-b.t0)/b.dur;
    if(t<0)continue;
    if(t>=1){b.done=true;if(b.hit&&!b.fx){b.fx=true;spawnP(6,b.x1,b.y1,130,0.3,b.col,2.2,0.93);}continue;}
    const x=b.x0+(b.x1-b.x0)*t,y=b.y0+(b.y1-b.y0)*t;
    const a=Math.atan2(b.y1-b.y0,b.x1-b.x0),L=b.thin?14:26;
    ctx.save();ctx.globalCompositeOperation='lighter';
    const gg=ctx.createLinearGradient(x-Math.cos(a)*L,y-Math.sin(a)*L,x,y);
    gg.addColorStop(0,'rgba(0,0,0,0)');gg.addColorStop(1,b.col);
    ctx.strokeStyle=gg;ctx.lineWidth=b.thin?9:12;ctx.lineCap='round';ctx.globalAlpha=0.22;
    ctx.beginPath();ctx.moveTo(x-Math.cos(a)*L,y-Math.sin(a)*L);ctx.lineTo(x,y);ctx.stroke();
    ctx.globalAlpha=1;
    ctx.lineWidth=b.thin?2.6:4.4;
    ctx.beginPath();ctx.moveTo(x-Math.cos(a)*L,y-Math.sin(a)*L);ctx.lineTo(x,y);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.lineWidth=b.thin?1.2:2;
    ctx.beginPath();ctx.moveTo(x-Math.cos(a)*7,y-Math.sin(a)*7);ctx.lineTo(x,y);ctx.stroke();
    ctx.restore();
  }
  bolts=bolts.filter(b=>!b.done);
  for(const p of parts){p.life+=dt;if(p.col!=='ring'&&p.col!=='ring2'&&!p.col.startsWith('flash:')){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=p.drag;p.vy*=p.drag;}}
  for(const p of parts){
    const k=1-p.life/p.max;if(k<=0)continue;
    if(p.col==='ring'||p.col==='ring2'){
      const r=(1-k)*(p.col==='ring'?115:180)*p.size+10;
      ctx.strokeStyle=(p.col==='ring'?'rgba(255,196,120,':'rgba(180,210,255,')+(k*0.7)+')';
      ctx.lineWidth=(2.8*k+0.6)/Math.max(cam.z,0.4);
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();continue;
    }
    if(p.col.startsWith('flash:')){
      const col=p.col.slice(6);
      const r=(1-k)*70*p.size+8;
      const gg=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,r);
      gg.addColorStop(0,col);gg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=k;
      ctx.fillStyle=gg;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
      ctx.restore();continue;
    }
    if(p.col.startsWith('streak:')){
      ctx.globalAlpha=Math.max(0,k*0.7);
      ctx.strokeStyle=p.col.slice(7);ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*0.09,p.y-p.vy*0.09);ctx.stroke();
      ctx.globalAlpha=1;continue;
    }
    ctx.globalAlpha=Math.max(0,k);ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size*k+0.4,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  parts=parts.filter(p=>p.life<p.max);

  /* ---- screen space ---- */
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawCombatFocus(now);
  drawShipHud(now);
  drawLockBadges();
  drawFloaters(now);
  drawBubbles(now);
  vsSync(now);
  drawMinimap(now);
  if(slowmo()&&started){
    const tg=ctx.createRadialGradient(cssW/2,cssH/2,Math.min(cssW,cssH)*0.35,cssW/2,cssH/2,Math.max(cssW,cssH)*0.72);
    tg.addColorStop(0,T.rgba(C.shield,0));tg.addColorStop(1,T.rgba(C.shield,0.08));
    ctx.fillStyle=tg;ctx.fillRect(0,0,cssW,cssH);
  }
  if(flashT){
    const fk=1-(now-flashT)/220;
    if(fk>0){ctx.fillStyle='rgba(255,246,230,'+(fk*0.16)+')';ctx.fillRect(0,0,cssW,cssH);}
    else flashT=0;
  }
  const vg=ctx.createRadialGradient(cssW/2,cssH/2,Math.min(cssW,cssH)*0.42,cssW/2,cssH/2,Math.max(cssW,cssH)*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,cssW,cssH);

  if(phase==='EXEC'){try{execUpdate(now);}catch(e){recoverPhase(e);}}
  if(phase==='ATTACK'){try{attackUpdate(now);}catch(e){recoverPhase(e);}}
}

/* ---------- input ---------- */
const pointers=new Map();
let panState=null,pinch0=null,lastTap={id:null,t:0};
function evCss(ev){const r=cv.getBoundingClientRect();return [ev.clientX-r.left,ev.clientY-r.top];}
function shipAtCss(px,py){
  const w=cssToWorld(px,py);
  let best=null,bd=1e9;
  for(const s of ships){
    if(!s.alive)continue;
    const d=Math.hypot(s.x-w.x,s.y-w.y);
    if(d*cam.z<38&&d<bd){bd=d;best=s;}
  }
  return best;
}
cv.addEventListener('pointerdown',ev=>{
  cv.setPointerCapture(ev.pointerId);
  const [px,py]=evCss(ev);
  pointers.set(ev.pointerId,{x:px,y:py});
  if(pointers.size===2){
    const pts=[...pointers.values()];
    pinch0={d:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),z:cam.z};
    panState=null;return;
  }
  panState={x:px,y:py,moved:false};
});
cv.addEventListener('pointermove',ev=>{
  const [px,py]=evCss(ev);
  if(pointers.has(ev.pointerId))pointers.set(ev.pointerId,{x:px,y:py});
  if(pinch0&&pointers.size===2){
    const pts=[...pointers.values()];
    const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    if(d>10){cam.z=pinch0.z*(d/pinch0.d);camGoal=null;clampCam();}
    return;
  }
  if(panState){
    const dx=px-panState.x,dy=py-panState.y;
    if(Math.abs(dx)+Math.abs(dy)>6)panState.moved=true;
    if(panState.moved){
      cam.x-=dx/cam.z;cam.y-=dy/cam.z;camGoal=null;clampCam();
      panState.x=px;panState.y=py;
    }
    return;
  }
  const s=shipAtCss(px,py);
  cv.style.cursor=s?'pointer':'crosshair';
});
function endPointer(ev){
  const [px,py]=evCss(ev);
  pointers.delete(ev.pointerId);
  if(pointers.size<2)pinch0=null;
  if(panState){
    if(!panState.moved)canvasClick(px,py);
    panState=null;
  }
}
function canvasClick(px,py){
  if(phase==='CUTSCENE')return;
  const s=shipAtCss(px,py);
  // double-tap opens the dossier + ship windows
  if(s){
    const now=performance.now();
    if(lastTap.id===s.id&&now-lastTap.t<380){lastTap={id:null,t:0};openInfo(s.id);return;}
    lastTap={id:s.id,t:now};
  }
  if(lockPickMode&&awaitAction){
    if(s&&s.faction==='heg'&&inLockZone(awaitAction,s)&&!losBlocked(awaitAction,s)){playerAction({a:'lock',t:s});}
    else {lockPickMode=false;syncUI();}
    return;
  }
  const c=attackQ&&attackQ.cur;
  if(c&&c.stage==='await'&&s&&s.faction==='heg'&&s!==c.t){
    const w=bestWeaponFor(c.s,s);
    if(w)retargetCtx(c,s,w);
    else log('<span class="d">No firing solution on '+s.name+'</span>');
    return;
  }
  if(s){selId=s.id;hoverMan=null;syncUI();}
}
cv.addEventListener('pointerup',endPointer);
cv.addEventListener('pointercancel',ev=>{pointers.delete(ev.pointerId);pinch0=null;panState=null;});
cv.addEventListener('wheel',ev=>{
  ev.preventDefault();
  const [px,py]=evCss(ev);
  const w0=cssToWorld(px,py);
  cam.z*=Math.exp(-ev.deltaY*0.0011);
  clampCam();
  const w1=cssToWorld(px,py);
  cam.x+=w0.x-w1.x;cam.y+=w0.y-w1.y;
  camGoal=null;clampCam();
},{passive:false});
/* ---------- info windows ---------- */
const $=id=>byId(id);
const {esc,ico}=HUD;
const tag=(txt,kind,icon)=>'<span class="sr-tag'+(kind?' sr-tag--'+kind:'')+'">'+(icon?ico(icon):'')+txt+'</span>';
const CRIT_SHORT={engine:'Engine',targeting:'Targeting',controls:'Controls',emitter:'Emitter',feed:'Ammo feed',cockpit:'Cockpit'};
/* cells for a durability bar: one per `per` points, lit while below the current value */
function hpCells(val,max,per,guest){
  const n=Math.ceil(max/per);let h='<span class="sr-hp__cells">';
  for(let i=0;i<n;i++)h+='<i class="sr-hp__cell'+(i*per<val?' is-on':'')+(guest?' is-guest':'')+'"></i>';
  return h+'</span>';
}
const winHead=t=>'<div class="sr-window__head"><span class="sr-window__title">'+t+'</span><button type="button" class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost" data-close aria-label="Close">'+ico('clear')+'</button></div>';
function nerveHtml(s,tip){
  const nv=nerve(s);
  return '<span class="sr-nerve sr-nerve--'+nv[1]+'"'+(tip&&nv[1]==='panic'?HUD.tip('Panicking','Lock in only.'):'')+'>'+(nv[1]==='panic'?ico('panic'):nv[1]==='cool'?ico('cool'):'')+nv[0]+'</span>';
}
function dossierHTML(s){
  const p=s.pilot,nv=nerve(s);
  const pctXP=Math.round(p.xp*100);
  const state=s.alive?nerveHtml(s):s.fledOut?tag('Fled the sector',''):tag('KIA','bad');
  const nc=nv[1]==='panic'?'var(--sr-c-bad)':nv[1]==='cool'?'var(--sr-shield)':'var(--sr-text-2)';
  return winHead('Pilot dossier')+
    '<div class="sr-window__body">'+
    '<div class="sp-dz"><span class="sr-level" style="--p:'+pctXP+'" aria-label="Level '+p.level+'"><b>'+p.level+'</b></span>'+
    '<div class="sp-dz__id"><div class="sp-dz__name">'+esc(p.pname)+'</div>'+
    '<div class="sp-dz__tags">'+tag(rankOf(p.level),'progress','star')+state+'</div>'+
    '<div class="sp-dz__sub">'+esc(s.name)+' · age '+p.age+'</div></div></div>'+
    '<div class="sr-meter sp-nerve" style="--c:'+nc+'"><span>Nerve</span><span class="sr-meter__track"><span class="sr-meter__fill" style="display:block;width:'+Math.round(p.cool)+'%"></span></span><span class="sr-meter__val">'+Math.round(p.cool)+'</span></div>'+
    '<p class="sr-p sp-bio">“'+esc(p.bio)+'”</p>'+
    (p.traits.length?'<div class="sr-h3">Traits</div><div class="sr-stack">'+p.traits.map(t=>'<div class="sr-card sr-card--progress sp-trait"><div class="sr-card__title">'+esc(t)+'</div><div class="sr-card__body">'+esc(TRAITDESC[t]||(Rebel.CT.find(x=>x.n===t)||{}).e||'')+'</div></div>').join('')+'</div>':'')+
    (p.mans&&p.mans.length?'<div class="sr-h3">Pilot maneuvers</div><div class="sp-tags">'+p.mans.map(m=>tag(m==='loop'?'Loop ↺':'Barrel Roll ⇹','progress')).join('')+'</div>':'')+
    '<p class="sr-fine">XP '+pctXP+'% to next grade · manual promotion arrives with the persistent campaign</p>'+
    '</div>';
}
function segState(s,k){
  const seg=s.segs[k];
  if(seg.max===0)return null;
  const home=k==='F'?'Fore':'Aft';
  const at=seg.at===k?'':' → angled '+(seg.at==='F'?'forward':'aft');
  return {label:home+' segment'+at,val:seg.val,max:seg.max,guest:seg.at!==k};
}
function durRow(label,cells,num,hp,note){
  return '<div class="sp-dur"><div class="sr-hp"'+(hp?' style="--hp:'+hp+'"':'')+'><span class="sp-dur__l">'+label+'</span>'+cells+'<span class="sr-hp__num">'+num+'</span></div>'+
    (note?'<div class="sp-dur__note">'+note+'</div>':'')+'</div>';
}
const WCOL={plasma:'var(--sr-shield)',ballistic:'var(--sr-gold)',missile:'var(--sr-psi)'};
function shipHTML(s){
  const c=CLS[s.cls];
  let h=winHead('Ship systems')+'<div class="sr-window__body">';
  h+='<div class="sp-sw"><canvas id="shipIconCv" width="208" height="152"></canvas>'+
    '<div><div class="sp-sw__cls">'+c.label+'</div><div class="sp-sw__role">'+c.role+'</div>'+
    '<div class="sp-tags">'+tag('Max speed '+maxSpeedOf(s),'')+tag('Initiative '+effInit(s),'')+'</div></div></div>';
  h+='<div class="sr-h3">Durability</div><div class="sp-durs">';
  for(const k of ['F','R']){
    const st=segState(s,k);
    if(!st)continue;
    h+=durRow('Shield',hpCells(st.val,st.max,5,st.guest),st.val+'/'+st.max,st.guest?'var(--sr-psi)':'var(--sr-shield)',st.label);
  }
  h+=durRow('Armour',hpCells(s.arm,s.maxArm,5),s.arm+'/'+s.maxArm,'var(--sr-steel)');
  h+=durRow('Hull',hpCells(s.hull,s.maxHull,5),s.hull+'/'+s.maxHull,null);
  h+='</div>';
  if(maxShield(s)>0){
    const ex=['F','R'].filter(z=>zoneShield(s,z)===0&&!['F','R'].some(k=>s.segs[k].at===z&&s.segs[k].max>0));
    if(ex.length)h+='<div class="sp-tags sp-exp">'+ex.map(z=>tag((z==='F'?'Fore':'Aft')+' zone exposed','bad')).join('')+'</div>';
  }
  h+='<div class="sr-h3">Weapons</div><div class="sr-stack">';
  const jam=critCount(s,'feed');
  for(const w of c.wpns){
    const wd=WPN[w],dmg=c.dmg[w];
    const hit=s.pilot.aim-critCount(s,'targeting')*2+wd.atk;
    const off=jam&&w!=='plasma';
    const ammo=s.ammo[w];
    h+='<div class="sr-card sp-wcard'+(off?' is-off':'')+'" style="--c:'+WCOL[w]+'">'+
      '<span class="sp-wicon">'+ico(wd.icon)+'</span>'+
      '<div class="sp-winfo"><div class="sr-card__title">'+wd.name+(off?' '+tag('Jammed','bad'):'')+'</div>'+
      '<div class="sp-wtags">'+wd.tags+'</div>'+
      (ammo!==undefined?'<div class="sr-hp sp-ammo" style="--hp:var(--sr-gold-hi)">'+hpCells(ammo,c.ammo[w],1)+'<span class="sr-hp__num">'+ammo+'/'+c.ammo[w]+'</span></div>':'')+
      '</div>'+
      '<div class="sp-wnums"><span class="sr-mod '+(hit>=0?'is-plus':'is-minus')+'"><b>'+(hit>=0?'+':'−')+Math.abs(hit)+'</b></span>'+
      '<small>to hit · damage '+dmg[0]+'–'+dmg[1]+'</small></div>'+
      '</div>';
  }
  h+='</div>';
  if(s.crits.length){
    h+='<div class="sr-h3">Critical damage</div><div class="sr-stack">'+
      s.crits.map(id=>'<div class="sp-crit">'+tag(CRITDEFS[id].name,'bad','work')+'<span>'+CRITDEFS[id].desc+'</span></div>').join('')+'</div>';
  }
  if(s.lock){
    const t=ships.find(x=>x.id===s.lock.target);
    h+='<div class="sr-h3">Sensors</div><div class="sp-tags">'+tag('Lock: '+esc(t?t.name:'?')+', level '+s.lock.level,s.faction==='reb'?'action':'foe','targetlock')+'</div>';
  }
  h+='</div>';
  return h;
}
let infoBack=null;
function openInfo(id){
  infoShip=id;
  const was=byId('infoWins').hidden;
  renderInfo();
  byId('infoWins').hidden=false;
  if(was){infoBack=document.activeElement;const x=byId('shipWin').querySelector('[data-close]');if(x)x.focus({preventScroll:true});}
}
function closeInfo(){
  infoShip=null;
  byId('infoWins').hidden=true;
  if(infoBack&&infoBack.focus)try{infoBack.focus();}catch(e){}
  infoBack=null;
}
function renderInfo(){
  const s=ships.find(x=>x.id===infoShip);
  if(!s){closeInfo();return;}
  const reb=s.faction==='reb';
  for(const id of ['dossierWin','shipWin']){const w=byId(id);w.classList.toggle('sr-window--friend',reb);w.classList.toggle('sr-window--foe',!reb);}
  HUD.render(byId('dossierWin'),dossierHTML(s));
  if(HUD.render(byId('shipWin'),shipHTML(s))||!byId('shipWin').__painted){
    byId('shipWin').__painted=1;
    const icv=byId('shipIconCv');
    if(icv){
      const c2=icv.getContext('2d');
      c2.clearRect(0,0,icv.width,icv.height);
      c2.save();
      c2.translate(icv.width/2,icv.height/2);
      c2.scale(2,2);
      c2.rotate(-Math.PI/2);
      paintShipBody(c2,s,1.9*s.size,s.faction==='heg');
      c2.restore();
    }
  }
}
byId('infoWins').addEventListener('click',ev=>{
  if(ev.target.closest('[data-close]')||ev.target.id==='infoWins'||ev.target.classList.contains('sp-wins'))closeInfo();
});

/* ---------- HUD sync ---------- */
const DOCK=$('ctlDock'),PILL=$('lockPill'),APP=$('app'),STAGE=cv.parentElement;
let barH=104;                 // last measured command-bar height, kept while shots resolve so the camera frame holds still
let lastPhase=null;
const DIAL_COLS=['L','l','S','r','R','K'],DIAL_NAMES={L:'Hard L',l:'Bank L',S:'Ahead',r:'Bank R',R:'Hard R',K:'K-turn'};
const manText=m=>DIAL_NAMES[m[1]]+' '+m[0];
/* ----- rail rows ----- */
function rosterRow(s){
  const reb=s.faction==='reb',nv=nerve(s),mute=!!CLS[s.cls].mute;
  const cur=attackQ&&attackQ.cur;
  const acting=s.alive&&((exec&&exec.order&&exec.order[exec.idx]===s)||(cur&&cur.s===s));
  const cls='sr-unit'+(reb?'':' sr-unit--foe')+(s.id===selId?' is-selected':'')+(s.alive?'':' is-down')+(acting?' is-acting':'');
  const av=reb?HUD.avatar({initials:HUD.initials(s.pilot.pname),cls:'sr-avatar--pilot',badge:'ship'}):
    HUD.avatar({initials:HUD.initials(s.name),cls:'sr-avatar--foe'});
  let side='';
  if(!s.alive)side=s.fledOut?tag('Fled',''):tag('Lost','bad');
  else {
    if(!isStruct(s))side+=tag('Init '+effInit(s),'');
    if(reb&&phase==='PLANNING')
      side+=s.plan.man?'<span class="sr-ordertag">'+ico('move')+manText(s.plan.man)+'</span>':'<span class="sr-ordertag sr-ordertag--none">No orders</span>';
    if(!mute)side+=nerveHtml(s,true);
  }
  let rows='',tags='';
  if(s.alive){
    const hullF=s.maxHull?s.hull/s.maxHull:0;
    const per=m=>Math.max(5,Math.ceil(m/8));            // at most 8 cells a bar, so the row never outgrows the rail
    const cells=(v,m,guest)=>{let g='';for(let i=0;i<Math.ceil(m/per(m));i++)g+='<i class="sr-hp__cell'+(i*per(m)<v?' is-on':'')+(guest?' is-guest':'')+'"></i>';return g;};
    const row=(l,body,style,tip,xc)=>'<span class="sp-row"><span class="sp-row__l">'+l+'</span><span class="sr-hp'+(xc||'')+'"'+(style||'')+(tip||'')+'>'+body+'</span></span>';
    if(maxShield(s)>0){
      let body='';
      for(const z of ['F','R']){
        const segsAt=['F','R'].filter(k=>s.segs[k].at===z);
        const cap=segsAt.reduce((a,k)=>a+s.segs[k].max,0);
        if(cap===0){tags+=tag((z==='F'?'Fore':'Aft')+' exposed','bad');continue;}
        let g='';
        for(const k of segsAt.sort((a,b)=>(a===z?-1:1)))g+=cells(s.segs[k].val,s.segs[k].max,k!==z);
        body+='<span class="sr-hp__cells">'+g+'</span>';
      }
      rows+=row('S',body,' style="--hp:var(--sr-shield)"',
        HUD.tip('Shields','Fore '+s.segs.F.val+'/'+s.segs.F.max+(s.segs.R.max?', aft '+s.segs.R.val+'/'+s.segs.R.max:'')+'. An angled segment counts for the zone it covers.'));
    }
    if(s.maxArm>0)rows+=row('A','<span class="sr-hp__cells">'+cells(s.arm,s.maxArm)+'</span>',' style="--hp:var(--sr-steel)"',HUD.tip('Armour',s.arm+' of '+s.maxArm));
    rows+=row('H','<span class="sr-hp__cells">'+cells(s.hull,s.maxHull)+'</span>','',HUD.tip('Hull',s.hull+' of '+s.maxHull),hullF<0.35?' sr-hp--low':hullF<0.6?' sr-hp--mid':'');
    for(const id of s.crits)tags+=tag(CRIT_SHORT[id],'bad');
  }
  return '<button type="button" class="'+cls+'" data-ship="'+s.id+'" title="Double-click for dossier">'+av+
    '<span class="sr-unit__main"><span class="sr-unit__top"><span class="sr-unit__name">'+(s.id==='E1'?'★ ':'')+esc(s.name)+'</span>'+
    (mute?'':'<span class="sr-unit__role">'+esc(s.pilot.pname)+'</span>')+'</span>'+
    (rows?'<span class="sp-rows">'+rows+'</span>':'')+(tags?'<span class="sp-tags">'+tags+'</span>':'')+'</span>'+
    '<span class="sr-unit__side">'+side+'</span></button>';
}
/* ----- maneuver dial: lives in the command bar, between the pilot and Execute ----- */
function dialWhy(s,sp,t){
  if(critCount(s,'controls')&&(t==='L'||t==='R'||t==='K'))return 'Control surfaces are shredded: no hard turns or loops.';
  const ms=maxSpeedOf(s);
  if(sp>ms)return (critCount(s,'engine')?'Engine damage':'Mag-clamped')+': top speed is '+ms+'.';
  return 'Unavailable.';
}
function dialHTML(s){
  const speeds=[5,4,3,2,1];
  const availSet={};for(const [sp,t] of dialAvail(s))availSet[t+sp]=true;
  const fullSet={};for(const [sp,t] of CLS[s.cls].dial())fullSet[t+sp]=true;
  if(s.pilot.mans.includes('loop'))fullSet['K3']=true;
  let h='<div class="sr-dial" style="--cols:6" role="group" aria-label="Maneuver dial">';
  for(const t of DIAL_COLS)h+='<span class="sr-dial__h">'+DIAL_NAMES[t]+'</span>';
  for(const sp of speeds){
    let row='',any=false;
    for(const t of DIAL_COLS){
      if(fullSet[t+sp]){
        any=true;
        const ok=availSet[t+sp];
        const on=s.plan.man&&s.plan.man[0]===sp&&s.plan.man[1]===t;
        const nm=DIAL_NAMES[t]+', speed '+sp;
        row+='<button type="button" class="sr-dial__k'+(on?' is-active':'')+(t==='K'?' is-pilot':'')+'" data-man="'+sp+t+'" aria-label="'+nm+(t==='K'?', pilot maneuver':'')+'"'+
          (on?' aria-pressed="true"':'')+(ok?'':' disabled')+
          (!ok?HUD.tip(nm,'',dialWhy(s,sp,t)):t==='K'?HUD.tip(nm,'A pilot-only maneuver: fly ahead, then turn right around.'):'')+'>'+sp+'</button>';
      } else row+='<span class="sr-dial__k is-empty" aria-hidden="true"></span>';
    }
    if(any)h+=row;
  }
  return h+'</div>';
}
/* ----- activation cards (the old radial and its submenus) ----- */
const AM={
  lock:{label:'Lock',icon:'targetlock',family:'fight',rule:'Lock a hostile ahead, in range and clear of rocks. Each lock level adds +2 to hit and arms your missiles.'},
  evmenu:{label:'Evade ▸',icon:'evade',family:'stance',rule:'Fly defensive, or swing a shield segment round to the other side.'},
  flydef:{label:'Fly defensive',icon:'evade',family:'stance',rule:'Enemy shots need 3 more to hit you this round.',nums:[{t:'+3 enemy difficulty',kind:'good'}]},
  shiftF:{icon:'angle',family:'stance',rule:'Angle the fore shield segment over your aft zone. Recall it later.'},
  shiftR:{icon:'angle',family:'stance',rule:'Angle the aft shield segment over your fore zone. Recall it later.'},
  lockin:{label:'Lock in',icon:'lockin',family:'nerve',rule:'Steady your nerve (+35). A panicking pilot can barely do anything else.'},
  repmenu:{label:'Repair ▸',icon:'work',family:'util',rule:'Boost shields, patch the hull or fix a critical hit.'},
  boostF:{label:'Boost fore',icon:'boost',family:'util',rule:'Restore 15% of your total shield to the fore segment.'},
  boostR:{label:'Boost aft',icon:'boost',family:'util',rule:'Restore 15% of your total shield to the aft segment.'},
  fieldrep:{label:'Patch hull',icon:'patch',family:'util',rule:'Restore 15% of your hull.'},
  fixcrit:{label:'Fix critical',icon:'work',family:'util',rule:'Clear one critical hit.'},
  broll:{label:'Barrel roll',icon:'roll',family:'move',rule:'Slide sideways out of the line of fire. Enemy shots need 2 more to hit you.',nums:[{t:'+2 enemy difficulty',kind:'good'}]},
  pass:{label:'Pass',icon:'pass',family:'',rule:'Hold your action this turn.'},
  back:{label:'Back',icon:'back',family:'',rule:'Return to the main actions.'}};
function actOrders(s){
  const sub=subMenu;                          // root | evade | repair | fixpick
  let n=0;const nk=()=>(++n<=9?String(n):'');
  const mk=(ract,ex)=>{
    ex=ex||{};const m=AM[ract]||{};
    return HUD.order(Object.assign({ract,label:m.label,icon:m.icon,family:m.family,key:ex.nokey?'':nk(),
      tip:{title:ex.label||m.label,rule:m.rule,nums:m.nums}},ex));
  };
  const panic=coolState(s)==='panic';
  const noTgt=!ships.some(t=>t.alive&&t.faction!==s.faction&&inLockZone(s,t)&&!losBlocked(s,t));
  const rk=sub==='root'?{}:{nokey:true};          // while a submenu is open the digits belong to it
  const parent=sub==='evade'?'evmenu':sub==='root'?'':'repmenu';
  const out=[
    mk('lock',Object.assign({active:lockPickMode,disabled:panic||noTgt,why:panic?'Too rattled to lock on. Lock in first.':'No target ahead, in range and clear of rocks.'},rk)),
    mk('evmenu',Object.assign({active:parent==='evmenu'},rk)),
    mk('lockin',rk),
    mk('repmenu',Object.assign({active:parent==='repmenu'},rk))];
  if(s.pilot.mans.includes('broll'))out.push(mk('broll',rk));
  if(sub==='root')out.push(HUD.sep(),mk('pass'));
  else {
    out.push(HUD.sep(),mk('back',{key:'X',nokey:true}));
    if(sub==='evade'){
      const F=s.segs.F,R=s.segs.R;
      out.push(mk('flydef'),
        mk('shiftF',{label:F.at==='F'?'Fore → aft':'Recall fore',disabled:F.max===0||F.val===0,why:F.max===0?'No fore shield to angle.':'The fore shield is down.'}),
        mk('shiftR',{label:R.at==='R'?'Aft → fore':'Recall aft',disabled:R.max===0||R.val===0,why:R.max===0?'No aft shield to angle.':'The aft shield is down.'}));
    } else if(sub==='repair'){
      const em=critCount(s,'emitter')>0;
      out.push(
        mk('boostF',{disabled:em||s.segs.F.max===0||s.segs.F.val>=s.segs.F.max,why:em?'The shield emitter is fried.':s.segs.F.max===0?'No fore shield.':'The fore shield is full.'}),
        mk('boostR',{disabled:em||s.segs.R.max===0||s.segs.R.val>=s.segs.R.max,why:em?'The shield emitter is fried.':s.segs.R.max===0?'No aft shield.':'The aft shield is full.'}),
        mk('fieldrep',{disabled:s.hull>=s.maxHull,why:'The hull is already at full strength.'}),
        mk('fixcrit',{disabled:s.crits.length===0,why:'No critical damage to fix.'}));
    } else if(sub==='fixpick'){
      s.crits.slice(0,4).forEach((id,i)=>out.push(mk('fix:'+i,{label:CRIT_SHORT[id],icon:'work',family:'util',tip:{title:CRITDEFS[id].name,rule:CRITDEFS[id].desc}})));
    }
  }
  return out;
}
const pilotLead=s=>HUD.avatar({initials:HUD.initials(s.pilot.pname),cls:'sr-avatar--pilot',badge:'ship'});
const WICON={plasma:'plasma',ballistic:'ballistic',missile:'missile'};
function whyNoShot(s,t,w){
  if(w!=='plasma'&&critCount(s,'feed'))return 'The ammo feed is jammed.';
  if(!inArc(s,t))return 'The target is outside the firing arc.';
  if(dist(s,t)>WPN[w].rng)return 'Out of range.';
  if(WPN[w].needsLock&&!(s.lock&&s.lock.target===t.id&&s.lock.level>=1))return 'Needs a lock on this target first.';
  if(w!=='plasma'&&s.ammo[w]!==undefined&&s.ammo[w]<=0)return 'Out of ammo.';
  return 'No shot from here.';
}
function dockHTML(){
  if(phase==='PLANNING'){
    const rebs=ships.filter(s=>s.alive&&s.faction==='reb');
    const need=rebs.filter(s=>!s.plan.man).length,total=rebs.length;
    const sel=ships.find(s=>s.id===selId&&s.alive&&s.faction==='reb');
    const nc=sel?sel.crits.length:0;
    return HUD.cmdbar({
      who:sel?{lead:pilotLead(sel),name:sel.pilot.pname,hint:esc(sel.name)+'. Plot a maneuver'+(nc?' <span class="sp-bad">· '+nc+' critical'+(nc>1?'s':'')+'</span>':'')}:
        {lead:'<span class="sr-avatar">'+ico('ship')+'</span>',name:'Flight orders',hint:SR.touch?'Tap a fighter to plot it':'Pick a fighter to plot a maneuver'},
      mid:sel?dialHTML(sel):'',
      go:{html:HUD.btn({id:'executeBtn',label:'Execute',icon:'execute',variant:'primary',size:'lg',go:true,iconAfter:true,disabled:need>0,
          why:need>0?'Plot a maneuver for every fighter first.':'',tip:{title:'Execute',rule:'Every fighter flies its plotted maneuver.'}}),
        count:'<b>'+(total-need)+'</b> of '+total+' plotted',countTip:{title:'Plotted',rule:'Every fighter needs a maneuver before the round can run.'}}});
  }
  if(phase==='EXEC'&&awaitAction){
    const s=awaitAction;
    return HUD.cmdbar({who:{lead:pilotLead(s),name:s.pilot.pname,hint:lockPickMode?'Pick a lock target':'Pick an action'},orders:actOrders(s)});
  }
  const c=attackQ&&attackQ.cur;
  if(c&&c.stage==='await'){
    let n=0;
    const orders=[];
    for(const w of CLS[c.s.cls].wpns){
      const ok=validShot(c.s,c.t,w),a=c.s.ammo[w];
      orders.push(HUD.order({label:WPN[w].name+(a!==undefined?' ×'+a:''),icon:WICON[w],family:'fight',key:++n<=9?String(n):'',
        active:w===c.wkey,disabled:!ok,why:ok?'':whyNoShot(c.s,c.t,w),attrs:'data-wsel="'+w+'"',
        tip:{title:WPN[w].name,rule:'Damage '+CLS[c.s.cls].dmg[w][0]+' to '+CLS[c.s.cls].dmg[w][1]+', range '+WPN[w].rng+'. '+WPN[w].tags+'.'}}));
    }
    return HUD.cmdbar({
      who:{lead:pilotLead(c.s),name:c.s.pilot.pname,hint:'Pick a weapon or retarget'},
      orders,go:{html:HUD.btn({id:'attackBtn',label:'Attack',icon:'attack',variant:'primary',size:'lg'})+
        HUD.btn({id:'holdBtn',label:'Hold fire',variant:'ghost',size:'sm'}),
        count:'Shot <b>'+Math.min(attackQ.idx,attackQ.order.length)+'</b> of '+attackQ.order.length}});
  }
  return '';
}
const PHASE_UI={PLANNING:['plan','Planning'],EXEC:['exec','Moving'],ATTACK:['fight','Engagement'],CUTSCENE:['exec','Approach'],GAMEOVER:['exec','Debrief'],BRIEFING:['exec','Briefing']};
const BANNER_PHASES={PLANNING:1,EXEC:1,ATTACK:1};
function syncTop(){
  const [ph,name]=PHASE_UI[phase]||PHASE_UI.BRIEFING;
  HUD.phase($('phasePlate'),{phase:ph,status:'alert',name,round:'Round '+Math.max(1,round)});
  if(phase!==lastPhase){
    if(lastPhase&&BANNER_PHASES[phase])HUD.banner(STAGE,{text:name,sub:'Round '+round,color:'var(--sr-phase-'+ph+')'});
    lastPhase=phase;
  }
}
function syncObjective(){
  let t,done=false,count='';
  if(SCEN==='depot'){
    const tot=ships.filter(s=>isStruct(s)).length;
    const down=ships.filter(s=>isStruct(s)&&!s.alive).length;
    done=tot>0&&down>=tot;
    t=done?'All depots destroyed':'Destroy the fuel depots';
    count=done?'':down+'/'+(tot||4);
  } else {
    const vex=ships.find(s=>s.id==='E1');
    if(!vex)return;
    done=!vex.alive;
    t=done?'Instructor eliminated':'Eliminate Cmdt. Dral Vex';
  }
  const ob=$('objBox');
  ob.hidden=phase==='BRIEFING'||phase==='CUTSCENE'||phase==='GAMEOVER';
  HUD.render($('objList'),'<div class="sr-obj '+(done?'is-done':'is-current')+'"><span class="sr-obj__mark">'+(done?ico('check'):'')+'</span><span>'+t+'</span>'+
    (count?'<span class="sr-obj__count">'+count+'</span>':'')+'</div>');
}
function syncBar(){
  const c=attackQ&&attackQ.cur;
  const pick=!!(awaitAction&&lockPickMode);
  PILL.hidden=!pick;
  if(pick)HUD.render(PILL,'Pick a lock target <span class="sr-kbd">Esc</span>');
  let html=(phase==='PLANNING'||phase==='EXEC'||phase==='ATTACK')?dockHTML():'';
  if(!html&&phase==='ATTACK'&&c)html='<div class="sr-dockspacer" style="height:'+barH+'px"></div>';   // hold the dock's height while a shot resolves
  DOCK.hidden=!html;
  HUD.render(DOCK,html);
  HUD.fitBar(DOCK);
  const cb=DOCK.querySelector('.sr-cmdbar');
  if(cb&&cb.offsetHeight)barH=cb.offsetHeight;
}
function syncUI(){
  syncTop();
  syncObjective();
  const reb=ships.filter(s=>s.faction==='reb'),heg=ships.filter(s=>s.faction==='heg');
  $('flightCount').textContent=reb.filter(s=>s.alive).length+'/'+reb.length;
  $('foeCount').textContent=heg.filter(s=>s.alive).length+'/'+heg.length;
  HUD.render($('rosterR'),reb.map(rosterRow).join(''));
  HUD.render($('rosterE'),heg.map(rosterRow).join(''));
  $('drawerBadge').hidden=!reb.some(s=>(s.alive&&coolState(s)==='panic')||(!s.alive&&!s.fledOut));
  syncBar();
  if(infoShip)renderInfo();
  measureHud();
}

/* ---------- DOM events ---------- */
function setMan(str){
  const s=ships.find(x=>x.id===selId);
  if(phase!=='PLANNING'||!s||s.faction!=='reb'||!s.alive)return;
  s.plan.man=[parseInt(str,10),str.replace(/[^A-Za-z]/g,'')];
  hoverMan=null;
  const next=ships.find(x=>x.alive&&x.faction==='reb'&&!x.plan.man);
  if(next){selId=next.id;camGoal=focusGoal(next,Math.max(cam.z,0.45));}
  sTick();
  syncUI();
}
function actionPick(a){
  if(!awaitAction)return;
  sTick();
  if(a==='lock'){lockPickMode=true;subMenu='root';syncUI();return;}
  if(a==='evmenu'){subMenu=subMenu==='evade'?'root':'evade';syncUI();return;}
  if(a==='repmenu'){subMenu=subMenu==='repair'||subMenu==='fixpick'?'root':'repair';syncUI();return;}
  if(a==='fixcrit'){subMenu='fixpick';syncUI();return;}
  if(a==='back'){subMenu=subMenu==='fixpick'?'repair':'root';syncUI();return;}
  if(a.startsWith('fix:')){
    const id=awaitAction.crits[parseInt(a.slice(4),10)];
    if(id)playerAction({a:'fixcrit',crit:id});
    return;
  }
  if(a==='pass'){playerAction({a:'none'});return;}
  playerAction({a});
}
DOCK.addEventListener('click',ev=>{
  const b=ev.target.closest('button');
  if(!b||b.disabled)return;
  const act=b.getAttribute('data-ract');
  if(b.hasAttribute('data-man')){
    setMan(b.getAttribute('data-man'));
    if(ev.detail===0){                                  // keyboard: keep the focus in the bar
      const k=DOCK.querySelector('.sr-dial__k.is-active')||DOCK.querySelector('button.sr-dial__k:not(:disabled)');
      const go=DOCK.querySelector('#executeBtn:not(:disabled)');
      const nx=ships.some(x=>x.alive&&x.faction==='reb'&&!x.plan.man);
      const f=(!nx&&go)?go:k;if(f)f.focus();
    }
    return;
  }
  if(act){actionPick(act);return;}
  if(b.hasAttribute('data-wsel')){
    const c=attackQ&&attackQ.cur,w=b.getAttribute('data-wsel');
    if(c&&c.stage==='await'&&validShot(c.s,c.t,w)){c.wkey=w;sTick();syncUI();}
    return;
  }
  if(b.id==='attackBtn')confirmAttack();
  else if(b.id==='holdBtn')holdFire();
  else if(b.id==='executeBtn')executeRound();
});
/* hover or focus on a dial key previews its path on the map */
DOCK.addEventListener('mouseover',ev=>{
  const mv=ev.target.closest('.sr-dial__k[data-man]');
  if(mv&&phase==='PLANNING'&&!mv.disabled){const str=mv.getAttribute('data-man');hoverMan=[parseInt(str,10),str.replace(/[^A-Za-z]/g,'')];}
});
DOCK.addEventListener('mouseout',ev=>{if(ev.target.closest('.sr-dial__k'))hoverMan=null;});
DOCK.addEventListener('focusin',ev=>{
  const mv=ev.target.closest('.sr-dial__k[data-man]');
  if(mv&&phase==='PLANNING'){const str=mv.getAttribute('data-man');hoverMan=[parseInt(str,10),str.replace(/[^A-Za-z]/g,'')];}
});
DOCK.addEventListener('focusout',ev=>{if(ev.target.closest('.sr-dial__k'))hoverMan=null;});
PILL.addEventListener('click',()=>{lockPickMode=false;syncUI();});
$('csSkip').addEventListener('click',()=>{endCutscene();});
byId('panel').addEventListener('click',ev=>{
  const row=ev.target.closest('[data-ship]');
  if(row){
    const s=ships.find(x=>x.id===row.dataset.ship);
    if(s&&s.alive){
      const c=attackQ&&attackQ.cur;
      if(lockPickMode&&awaitAction&&s.faction==='heg'&&inLockZone(awaitAction,s)&&!losBlocked(awaitAction,s)){playerAction({a:'lock',t:s});return;}
      if(c&&c.stage==='await'&&s.faction==='heg'&&s!==c.t){const w=bestWeaponFor(c.s,s);if(w){retargetCtx(c,s,w);return;}}
      if(SR.touch&&selId===s.id){openInfo(s.id);return;}
      selId=s.id;hoverMan=null;
      if(phase==='PLANNING'||phase==='GAMEOVER')camGoal=focusGoal(s,Math.max(cam.z,0.5));
      syncUI();
    }
  }
});
byId('panel').addEventListener('dblclick',ev=>{
  const row=ev.target.closest('[data-ship]');
  if(row){
    const s=ships.find(x=>x.id===row.dataset.ship);
    if(s)openInfo(s.id);
  }
});
/* phones: the rail is a drawer */
const drawerOpen=on=>APP.classList.toggle('is-drawer-open',on);
$('drawerBtn').addEventListener('click',()=>drawerOpen(!APP.classList.contains('is-drawer-open')));
$('railClose').addEventListener('click',()=>drawerOpen(false));
cv.addEventListener('pointerdown',()=>drawerOpen(false));
$('zoomIn').addEventListener('click',()=>{cam.z*=1.25;camGoal=null;clampCam();});
$('zoomOut').addEventListener('click',()=>{cam.z/=1.25;camGoal=null;clampCam();});
$('zoomFit').addEventListener('click',()=>{cam={x:W/2,y:H/2,z:fitZoom()*0.95};camGoal=null;clampCam();});
$('followBtn').addEventListener('click',ev=>{
  follow=!follow;
  ev.currentTarget.setAttribute('aria-pressed',String(follow));
});
function syncSound(){
  const m=A.muted();
  $('muteBtn').setAttribute('aria-label',m?'Sound off':'Sound on');
  for(const u of ROOT.querySelectorAll('#muteBtn use,#menuSound use'))u.setAttribute('href','#i-'+(m?'soundoff':'soundon'));
}
function toggleSound(){A.setMuted(!A.muted());syncSound();}
$('muteBtn').addEventListener('click',toggleSound);
$('logBtn').addEventListener('click',openLog);
function restart(){closeInfo();byId('endscreen').hidden=true;lastPhase=null;deploy(true);}
/* menu: sound, reports, controls, restart (asks first), debug */
const menuEl=$('sMenu');
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
    ['Click a fighter','Select it'],
    ['Double-click a fighter','Open its pilot and ship systems'],
    ['1–9','Pick a card: an action or a weapon'],
    ['X','Back out of a submenu'],
    ['Esc','Cancel a pick or close a window'],
    ['Enter','Press the gold button'],
    ['Tab','Move through the maneuver dial'],
    ['M','Toggle sound'],
    ['Drag, wheel, pinch','Pan and zoom'],
    ['W A S D, + −','Pan and zoom from the keyboard']].map(r=>'<div class="sr-mod"><span>'+r[1]+'</span><b><span class="sr-kbd">'+r[0]+'</span></b></div>').join('')+'</div>'});
$('menuSound').addEventListener('click',toggleSound);
$('menuLog').addEventListener('click',openLog);
$('menuControls').addEventListener('click',()=>ctlWin.open());
$('restartBtn').addEventListener('click',()=>{
  HUD.confirm(ROOT,{id:'restartConfirm',title:'Restart mission?',body:'This run ends and the mission starts over from the approach. Nothing from it is kept.',
    ok:'Restart mission',cancel:'Keep playing',danger:true,onOk:()=>{if(started)restart();}});
});
$('dbgSkip').addEventListener('click',()=>{
  if(phase==='GAMEOVER')return;
  byId('briefing').hidden=true;
  if(!started){started=true;deploy(false);}
  else if(cs)endCutscene();
  gameOver(true);
});
$('endRestartBtn').addEventListener('click',()=>{SR.endMission(pendingResult||buildResult(false));});
$('deployBtn').addEventListener('click',()=>{
  A.wake();
  byId('briefing').hidden=true;
  started=true;deploy(true);
});
HUD.tips(ROOT);
addEventListener('keydown',ev=>{
  if(SR.active!=='space')return;
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  const tg=ev.target&&ev.target.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;
  const key=ev.key,onBtn=!!(ev.target&&ev.target.closest&&ev.target.closest('button'));
  const win=HUD.topWin(ROOT);
  if(key==='Escape'){
    if(win){const x=win.querySelector('[data-close]');if(x)x.click();return;}
    if(infoShip){closeInfo();return;}
    if(!menuEl.hidden){menuEl.hidden=true;$('menuBtn').setAttribute('aria-expanded','false');return;}
    if(awaitAction&&lockPickMode){lockPickMode=false;syncUI();return;}
    if(awaitAction&&subMenu!=='root'){actionPick('back');return;}
    return;
  }
  if(!$('briefing').hidden){if(key==='Enter'&&!onBtn){ev.preventDefault();$('deployBtn').click();}return;}
  if(!$('endscreen').hidden){if(key==='Enter'&&!onBtn)$('endRestartBtn').click();return;}
  if(infoShip||win||!menuEl.hidden)return;
  if(/^[1-9]$/.test(key)){
    const b=[...DOCK.querySelectorAll('.sr-order')].find(e=>{const kk=e.querySelector('.sr-order__key');return kk&&kk.textContent===key&&!e.disabled;});
    if(b){ev.preventDefault();b.click();}
    return;
  }
  const k=key.toLowerCase();
  if(k==='x'){const b=DOCK.querySelector('[data-ract="back"]:not(:disabled)');if(b)b.click();return;}
  if(k==='m'){toggleSound();return;}
  if(key==='Enter'&&!onBtn){
    const b=DOCK.querySelector('#attackBtn:not(:disabled),#executeBtn:not(:disabled)');
    if(b)b.click();
    return;
  }
  const step=60/cam.z;
  if(k==='w'||k==='arrowup'){cam.y-=step;camGoal=null;clampCam();}
  else if(k==='s'||k==='arrowdown'){cam.y+=step;camGoal=null;clampCam();}
  else if(k==='a'||k==='arrowleft'){cam.x-=step;camGoal=null;clampCam();}
  else if(k==='d'||k==='arrowright'){cam.x+=step;camGoal=null;clampCam();}
  else if(k==='+'||k==='='){cam.z*=1.15;camGoal=null;clampCam();}
  else if(k==='-'){cam.z/=1.15;camGoal=null;clampCam();}
});

/* ---------- scene lifecycle ---------- */
function flightChips(cls){
  const c=CLS[cls]||CLS.viper;
  return c.wpns.map(w=>{
    const g=SR.ui.gearChips([w])[0];
    if(c.ammo[w])g.label+=' ×'+c.ammo[w];
    return g;
  });
}
function tagText(t){return String(t).replace(/\s*·\s*/,', ');}
function briefUI(){
  const B=SCENS[SCEN].brief;
  byId('spEyebrow').textContent=tagText(B.eyebrow);
  byId('spTitle').textContent=B.title;
  byId('spFlavour').textContent=B.flavour;
  byId('spObj').innerHTML=SR.ui.objRows(B.objectives);
  let cards;
  if(CTX&&CTX.flight&&CTX.flight.length){
    cards=CTX.flight.slice(0,4).map(f=>{
      const cls=CLS[f.cls]?f.cls:'viper';
      return SR.ui.squadCard({name:f.name,pilot:true,chips:flightChips(cls),
        role:(f.fighterName?f.fighterName+' · ':'')+CLS[cls].label});
    });
  } else {
    cards=DEPLOY.filter(d=>d[3]==='reb').map(d=>
      SR.ui.squadCard({name:d[7].pname,pilot:true,chips:flightChips(d[2]),
        role:d[1]+' · '+CLS[d[2]].label}));
  }
  byId('spFlight').innerHTML=cards.join('');
}
function saveSnap(){/* combat runs are not persisted; reloading resumes at Haven Rock */}
function enter(params){
  CTX=(params&&params.mission)||SR.mission||null;
  SCEN=(CTX&&CTX.missionId==='depotrun')?'depot':'instructor';
  byId('spTop').textContent=SCENS[SCEN].brief.title;
  byId('spSub').textContent=SCENS[SCEN].sub;
  const bn=byId('csBanner');
  bn.querySelector('.big').textContent=SCENS[SCEN].banner[0];
  bn.querySelector('.small').textContent=SCENS[SCEN].banner[1];
  fitCanvas();
  syncSound();drawerOpen(false);menuEl.hidden=true;lastPhase=null;
  pendingResult=null;
  byId('endscreen').hidden=true;
  closeInfo();
  started=false;
  phase='BRIEFING';
  briefUI();
  byId('briefing').hidden=false;
  byId('deployBtn').focus({preventScroll:true});
  if(params&&params.test){
    byId('briefing').hidden=true;
    started=true;deploy(false);
    return;
  }
  syncUI();
}
function exit(){
  cs=null;exec=null;attackQ=null;
  drawerOpen(false);menuEl.hidden=true;
  byId('stage').classList.remove('cine');
  byId('csBanner').classList.remove('show');
  for(const w of ROOT.querySelectorAll('[data-srwin]'))w.hidden=true;
  byId('infoWins').hidden=true;
  byId('endscreen').hidden=true;
}
SR.register('space',{enter,exit,frame:render});


if(location.hash==='#test'){
  window.DBGspace={get ships(){return ships;},get phase(){return phase;},get round(){return round;},
    get pendingResult(){return pendingResult;},get SCEN(){return SCEN;},
    fn:{deploy,gameOver,destroyShip,endRound,reinforceStep,doAction,aiAction,maxSpeedOf,summonShip,
      setRound(n){round=n;},
      forceEnd(win){gameOver(win);}}};
}
})();
