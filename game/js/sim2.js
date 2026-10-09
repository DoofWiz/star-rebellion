'use strict';
/* =====================================================================
   STAR REBELLION — space combat v2 sim (docs/ARENA-HANDOFF.md §3)
   The Arena's lab model: one PLAN step, then both sides fly and fight
   simultaneously and continuously for EXEC_LEN seconds of sim time.
   Moves are dragged inside each ship's envelope (from its dial) and chained;
   one action point meter per pilot per round pays for moves, actions and
   mid-exec interrupts (C-57); enemies fly doctrine and never interrupt.

   No DOM here: the Arena scene (arena.js) draws and drives it. All state
   lives in one object (S, the Arena's A.sim), rebuilt per scenario.
   It never reads or writes the campaign save.

   Copy, don't refactor (handoff §0): the space.js functions this needs are
   COPIED below, each block headed with its source. space.js is not loaded
   into this module, patched by it, or shared with it. Existing resolution
   maths is the control variable of the experiment and must not drift.
   ===================================================================== */
window.SIM2=(function(){
const UT=SR.util,C=SR.theme.C;

/* ---------- tuning: every number the designer panel touches ----------
   One named entry each; `// placeholder` marks the numbers this lab exists to tune
   (all listed in docs/DESIGN_BLOCKERS.md C-55). Tests read them back through tune(). */
const DEFAULTS={
  TICK:50,           // placeholder: ms of sim time per fixed tick
  EXEC_LEN:6,        // placeholder: seconds of sim time per EXEC (panel 2–10)
  SIM_SPEED:1,       // placeholder: wall-clock multiplier (panel 0.25–2)
  SEG_TIME:2,        // placeholder: seconds of sim time one dial manoeuvre takes to fly
  PATH_SEGS:3,       // placeholder: most dial manoeuvres an order or a doctrine chains in one round
  STRAIGHT_TOL:6,    // placeholder: degrees of heading change a move may have and still count (and fly) as straight
  GUN_SHOTS:2,       // placeholder: gun shots per default-length exec (WPN_CD = 6 / 2 = 3 s)
  MSL_SHOTS:1,       // placeholder: missile shots per default-length exec (WPN_CD = 6 s)
  LOCK_TIME:1.5,     // placeholder: seconds of target inside the lock zone per lock level
  CALM_GAIN:6,       // placeholder: nerve at the end of an exec for a ship not hit in it (space.js endRound's 6)
  LOCKIN_GAIN:35,    // nerve from the Lock in stance (space.js doAction 'lockin')
  SNAP_BONUS:2,      // placeholder: Snap Shot's ATK bonus
  /* action points (C-57): one meter per pilot per round for moves, actions, specials and interrupts */
  AP_BASE:6,         // placeholder: AP every pilot has each round
  AP_LEVELS:3,       // placeholder: +1 AP per this many pilot levels
  COOL_AP:2,         // placeholder: bonus AP while Cool; spending into it drops the pilot out of Cool
  COOL_SPENT_TO:69,  // placeholder: the nerve a pilot falls to when the Cool bonus is spent (just under Cool at 70)
  AP_STRAIGHT:1,     // placeholder: a straight move
  AP_BANK:2,         // placeholder: a bank (up to 45°)
  AP_TURN:3,         // placeholder: a turn (up to 90°)
  AP_KTURN:3,        // placeholder: a K-turn (pilots with the loop)
  AP_EVADE:2,        // placeholder: fly defensive this round (+3 to be hit, no lock acquisition)
  AP_LOCKIN:2,       // placeholder: lock in (+35 nerve at the round's end, no lock acquisition)
  AP_SHIFT:1,        // placeholder: angle a shield segment while planning
  AP_BOOST:2,        // placeholder: boost the weaker shield segment as the round starts
  AP_SNAP:3,         // placeholder: interrupt: Snap Shot
  AP_JUKE:1,         // placeholder: interrupt: Juke, on top of the new move's own cost
  AP_SHIFT_INT:2,    // placeholder: interrupt: Shield Shift
  INT_FLOOR:30,      // placeholder: at or below this nerve (panicking) a pilot cannot interrupt
  INT_CAP:0,         // placeholder: 0 = no cap (AP is the limit); 1–3 caps interrupts per exec
  NERVE_GAIN:1,      // placeholder: multiplier on every combat nerve gain
  NERVE_DRAIN:1,     // placeholder: multiplier on every combat nerve loss (not on interrupt costs)
  ENEMY_N:0,         // placeholder: 0 = each scenario's own count; otherwise ships per enemy flight
  AI_NOISE:0,        // placeholder: random cost added to each AI fitter candidate (0 = perfect doctrine)
  PREF_RANGE:340,    // pursuit's preferred range (space.js aiManeuver prefD)
  WING_FLOUNDER:4,   // placeholder: seconds a wingman drifts after losing its lead
  GUARD_R:900,       // placeholder: hold_asset's guard radius
  RALLY_D:1300,      // placeholder: firing_line regroups this far from the nearest rebel
  FORM_R:280,        // placeholder: firing_line runs in once every ship is this close to its slot
  OPP_FIRE:1,        // placeholder: 1 = a ship with no shot on its target fires at any other valid hostile
  PLAN_CLOCK:0,      // planning clock in seconds (0 = off; the panel offers 30 and 60)
};
const PREF_KEY='sr-arena-prefs';   // the Arena's own key; it never touches star-rebellion-campaign-v1
const T=Object.assign({},DEFAULTS);
const DOC_OFF={};                  // doctrine key -> true when the panel switches its behaviour off
/* Pilot quality presets (placeholder stat templates, handoff §2.3): skills 0–50 like a database pilot row. */
const PRESETS={
  green:  {level:1,aim:10,cunning:10,focus:0, presence:24,initiative:2},
  regular:{level:3,aim:20,cunning:20,focus:20,presence:30,initiative:3},
  veteran:{level:5,aim:35,cunning:35,focus:30,presence:36,initiative:4,mans:['loop']},
  ace:    {level:8,aim:50,cunning:50,focus:40,presence:42,initiative:5,mans:['loop']},
};
/* weapon cooldown (placeholder): the default exec length over shots per exec. Fixed against the DEFAULT
   EXEC_LEN, so an EXEC_LEN sweep (E2) changes the commitment window and not the rate of fire (C-56). */
function WPN_CD(kind){return DEFAULTS.EXEC_LEN/(kind==='missile'?T.MSL_SHOTS:T.GUN_SHOTS);}
function segsPerExec(){return Math.max(1,Math.min(T.PATH_SEGS,Math.ceil(T.EXEC_LEN/T.SEG_TIME-1e-9)));}

/* ---------- copied from space.js ~19–25 (constants) ---------- */
const W=4200,H=3000,MARGIN=120;
const RU=300,SU=150;
const ARCH=0.55;
const BULLS_LIM=0.21;
const LOCK_RNG=900,LOCK_ARC=ARCH;
const TURNS={L:-Math.PI/2,l:-Math.PI/4,S:0,r:Math.PI/4,R:Math.PI/2};
/* ---------- copied from space.js ~30–48 (wdefOf, WDEF, CLS, isDrone, isStruct) ---------- */
function wdefOf(r){
  return {id:r.id,name:r.name,kind:r.kind,rng:r.range,atk:r.accuracy_mod,skipShield:r.bypasses_shields,crit:r.crit_chance,
    needsLock:r.needs_lock,icon:r.kind,tags:r.special_rules.replace(/\.$/,''),dmg:[r.damage_min,r.damage_max],
    ammo:r.ammo==null?undefined:r.ammo};
}
const WDEF={};for(const id in SRDB.weapons)WDEF[id]=wdefOf(SRDB.weapons[id]);
const CLS={};
for(const r of SRDB.raw.ships){
  const keys=String(r.legacy_keys).split('|').filter(Boolean);
  const c=Object.assign({id:r.id,key:keys[0],label:r.name,role:r.role,kind:r.kind,dbSize:r.size,size:SRDB.visualSize(r.size),
    shdF:r.shield_front,shdR:r.shield_rear,arm:r.armour,hull:r.hull,dial:()=>SRDB.dial(r),
    minSpd:r.straight_min,maxSpd:r.straight_max,slots:r.weapon_slots,people:r.extra_people,
    loadout:[r.default_weapon_1,r.default_weapon_2].filter(Boolean),
    struct:r.kind==='structure'?1:0,mute:r.kind==='starship'?0:1});
  for(const k of keys)CLS[k]=c;
  CLS[r.id]=c;
}
const isDrone=s=>CLS[s.cls].kind==='drone';
function isStruct(s){return !!CLS[s.cls].struct;}
/* ---------- copied from space.js ~49–59 (CRITDEFS, hasTr) ---------- */
const CRITDEFS={
  engine:{name:'Secondary Engine Failure',desc:'Top-speed maneuvers unavailable.',stack:2},
  targeting:{name:'Targeting Array Damage',desc:'−2 aim until repaired.',stack:2},
  controls:{name:'Control Surfaces Shredded',desc:'Hard turns and loops unavailable.',stack:1},
  emitter:{name:'Shield Emitter Fried',desc:'Cannot boost shields.',stack:1},
  feed:{name:'Ammo Feed Jam',desc:'Ballistic and missile weapons offline.',stack:1},
  cockpit:{name:'Cockpit Breach',desc:'Nerve capped at 60.',stack:1},
};
const hasTr=(s,k)=>!!(s&&s.pilot&&s.pilot.tr&&s.pilot.tr.some(t=>t.k===k));

/* ---------- state ---------- */
let S=null;          // the sim (A.sim in arena.js)
let rng=Math.random; // seeded per scenario; tests may swap it (the DBGspace setRng pattern)
const rint=(lo,hi)=>UT.rint(lo,hi,rng);
const byId=id=>S&&S.ships.find(x=>x.id===id)||null;
function ev(type,o){if(S)S.events.push(Object.assign({type,at:S.time},o||{}));}
function addFloater(x,y,text,col){ev('float',{x,y,text,col});}
function log(text){ev('log',{text});}

/* ---------- copied from space.js ~102–136 (mkPilot, dbPilot, mkShip), plus the v2 fields ---------- */
function mkPilot(o){
  const p=Object.assign({friendLock:false,lastSay:0},o);
  p.level=Math.max(1,p.level||1);
  if(!p.skills){const a=(p.aim||0)*10;p.skills={aim:a,cunning:a,focus:a,presence:Math.round((p.cool||60)/2)};}
  p.aim=SRDB.skillBonus(p.skills.aim,p.level);
  p.focusBonus=SRDB.skillBonus(p.skills.focus,p.level);
  if(o.aimMod)p.aim=Math.max(0,p.aim+o.aimMod);
  if(p.init===undefined)p.init=3;
  p.tr=p.tr||[];
  return p;
}
function dbPilot(id,extra){
  const r=SRDB.pilots[id];
  const tr=r.traits.split('|').filter(Boolean).map(t=>{const [k,w]=t.split(':');return w?{k,with:w}:{k};});
  const rankName=r.kind==='rebel'?Rebel.rankName(Rebel.migrate({id:r.id,name:r.name,role:'Pilot',level:r.level})):(r.rank||'');
  return Object.assign({pname:r.name,who:r.id,skills:{aim:r.aim,cunning:r.cunning,focus:r.focus,presence:r.presence},
    cool:r.presence*2,level:r.level,xp:r.xp/100,init:r.initiative,tr,nv:Rebel.expNerveMul({traits:tr}),rankName,mans:[]},extra);
}
function mkShip(id,name,cls,faction,x,y,h,pilot,loadout){
  const c=CLS[cls];cls=c.key;
  const wpns=(loadout||c.loadout).filter(w=>WDEF[w]).slice(0,c.slots).map((w,i)=>({key:'w'+i,w:WDEF[w]}));
  const ammo={};for(const q of wpns)if(q.w.ammo!==undefined)ammo[q.key]=q.w.ammo;
  return {id,name,cls,faction,x,y,h,pilot,chatKey:pilot.chatKey||null,wpns,
    segs:{F:{val:c.shdF,max:c.shdF,at:'F'},R:{val:c.shdR,max:c.shdR,at:'R'}},
    arm:c.arm,hull:c.hull,maxArm:c.arm,maxHull:c.hull,
    size:c.size,ammo,
    tokens:{evade:false,broll:false},lock:null,crits:[],
    plan:{man:null},path:null,trail:[],alive:true,fledOut:false,
    visRoll:0,moveBoost:0,
    // v2
    run:[],plan2:{arcs:[],drawn:false},order:null,stance:{evade:false,lockin:false,boost:false},ap:null,shieldAt0:null,target:null,goal:null,
    cd:{},lockAcc:0,intUsed:0,doctrine:null,doc:{},hitThisExec:false,holdFire:false,vel:0,
    stats:{shots:0,hits:0,arcTicks:0,ints:0}};
}
/* ---------- copied from space.js ~137–151 (shields, crit count, speed cap, dial) ---------- */
function zoneShield(s,z){let v=0;for(const k of ['F','R'])if(s.segs[k].at===z)v+=s.segs[k].val;return v;}
function totalShield(s){return s.segs.F.val+s.segs.R.val;}
function maxShield(s){return s.segs.F.max+s.segs.R.max;}
function critCount(s,id){return s.crits.filter(c=>c===id).length;}
function maxSpeedOf(s){const c=CLS[s.cls];return Math.max(c.minSpd,c.maxSpd+((s.tune&&s.tune.spd)||0)-critCount(s,'engine')-(s.magClamp>0?2:0));}
function dialAvail(s){
  let d=CLS[s.cls].dial().slice();
  if(s.pilot.mans&&s.pilot.mans.includes('loop'))d.push([3,'K']);
  const ms=maxSpeedOf(s);
  d=d.filter(([sp,tk])=>sp<=ms);
  if(critCount(s,'controls'))d=d.filter(([sp,tk])=>tk!=='L'&&tk!=='R'&&tk!=='K');
  return d;
}
/* ---------- copied from space.js ~158–180 (coolState, adjCool) ----------
   Changes: floaters go out as events; the panel's gain/drain multipliers ride on top; `raw` pays an
   interrupt's price flat (no trait or experience scaling, no multipliers), so the price is the price. */
function coolState(s){return s.pilot.cool>=70?'cool':s.pilot.cool<=30?'panic':'steady';}
function adjCool(s,d,why,raw){
  if(CLS[s.cls].mute)return;
  const p=s.pilot,pre=coolState(s);
  if(!raw){
    if(d<0&&p.nv)d=Math.round(d*p.nv);
    d=Rebel.nerveScale(d,k=>hasTr(s,k));
    d=Math.round(d*(d<0?T.NERVE_DRAIN:T.NERVE_GAIN));
  }
  p.cool=Math.max(0,Math.min(100,p.cool+d));
  if(p.coolCap)p.cool=Math.min(p.coolCap,p.cool);
  if(critCount(s,'cockpit'))p.cool=Math.min(60,p.cool);
  if(p.friendLock)p.cool=Math.min(20,p.cool);
  const post=coolState(s);
  if(pre!=='panic'&&post==='panic'){
    if(s.faction==='reb')p.panics=(p.panics||0)+1;
    addFloater(s.x,s.y-40,'PANICKING',C.hazard);
    log(s.name+' is panicking ('+why+')');
  }
  if(pre==='panic'&&post!=='panic'){addFloater(s.x,s.y-40,'STEADIED',C.go);log(s.name+' steadies');}
}

/* ---------- copied from space.js ~373–412 (geometry, manPath, clampEnd) ---------- */
const dist=UT.dist;
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function bearing(s,t){return Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-s.h));}
function inArc(s,t){return bearing(s,t)<=ARCH;}
function inFrontHemi(s,t){return bearing(s,t)<=Math.PI/2;}
function hitsFront(attacker,t){return bearing(t,attacker)<=Math.PI/2;}
function inLockZone(s,t){return bearing(s,t)<=LOCK_ARC&&dist(s,t)<=LOCK_RNG;}
function band(d){return d<=RU?1:d<=2*RU?2:3;}
function bullsFactor(s,t){const b=bearing(s,t);return b>=BULLS_LIM?0:1-b/BULLS_LIM;}
function losBlocked(a,b){
  for(const r of S.rocks){
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

/* ---------- copied from space.js ~467–507 (d20: computeTN, computeATK, needFor, pctFor) ---------- */
function computeTN(s,t){
  const sz=CLS[t.cls].dbSize,e=[];let v=SRDB.baseTN(sz);
  e.push(['SIZE '+sz+' HULL',v,true]);
  if(t.pilot.focusBonus){v+=t.pilot.focusBonus;e.push(['PILOT FOCUS',t.pilot.focusBonus]);}
  const b=band(dist(s,t));
  if(b===2){v+=2;e.push(['RANGE 2',2]);} else if(b===3){v+=3;e.push(['LONG RANGE',3]);}
  if(t.tokens.evade){v+=3;e.push(['FLYING DEFENSIVE',3]);}
  if(t.tokens.broll){v+=2;e.push(['BARREL ROLL',2]);}
  if(t.tune&&t.tune.evade){v+=t.tune.evade;e.push(['TUNED',t.tune.evade]);}
  if(t.tight){v+=1;e.push(['TIGHT WING',1]);}
  const defl=Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-t.h));
  if(defl>Math.PI-0.6){v-=2;e.push(['TAIL SHOT',-2]);}
  else if(defl>0.9&&defl<Math.PI-0.9){v+=2;e.push(['DEFLECTION',2]);}
  if(losBlocked(s,t)){v+=3;e.push(['ROCK COVER',3]);}
  if(coolState(t)==='cool'){v+=1;e.push(['TARGET COOL',1]);}
  if(coolState(t)==='panic'){v-=2;e.push(['TARGET PANICKING',-2]);}
  return {total:v,entries:e};
}
function computeATK(s,t,wkey){
  const e=[];let v=0;const w=wslot(s,wkey).w;
  v+=s.pilot.aim;e.push(['PILOT AIM',s.pilot.aim,true]);
  const td=critCount(s,'targeting');
  if(td){v-=td*2;e.push(['TARGETING DMG',-td*2]);}
  if(w.atk){v+=w.atk;e.push([w.name.toUpperCase()+(w.atk<0?' (UNGUIDED)':''),w.atk]);}
  const lk=(s.lock&&s.lock.target===t.id)?s.lock.level:0;
  if(lk){v+=lk*2;e.push(['LOCK ×'+lk,lk*2]);}
  if(w.kind==='missile'&&lk){v+=lk;e.push(['GUIDANCE ×'+lk,lk]);}
  if(coolState(s)==='cool'){v+=2;e.push(['COOL',2]);}
  if(coolState(s)==='panic'){v-=3;e.push(['PANICKING',-3]);}
  if(band(dist(s,t))===1){v+=2;e.push(['CLOSE RANGE',2]);}
  const f=bullsFactor(s,t);
  if(f>0.05){const bb=Math.ceil(4*f);v+=bb;e.push(['BULLSEYE',bb]);}
  if(hasTr(s,'steady')){v+=1;e.push(['STEADY HANDS',1]);}
  if(hasTr(s,'veteran')){v+=1;e.push(['VETERAN',1]);}
  if(s.pilot.heroRound===S.turn){v+=4;e.push(['HEROIC SURGE',4]);}
  if(hasTr(s,'pilot')){v+=1;e.push(['FORMER PILOT',1]);}
  return {total:v,entries:e,bullsF:f};
}
function needFor(tn,atk){return Math.max(2,Math.min(19,tn-atk));}
function pctFor(need){return Math.round((21-need)/20*100);}
/* ---------- copied from space.js ~508–554 (applyDamage, applicableCrits, applyCritical) ---------- */
function applyDamage(t,dmg,skipShield,fromFront){
  let rem=dmg,sd=0,ad=0,hd=0;
  const zone=fromFront?'F':'R';
  if(!skipShield){
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
    if(id==='feed'&&!s.wpns.some(q=>q.w.kind!=='plasma'))continue;
    if(id==='emitter'&&maxShield(s)===0)continue;
    if(critCount(s,id)>=CRITDEFS[id].stack)continue;
    out.push(id);
  }
  return out;
}
function applyCritical(s,why){
  if(isStruct(s)){
    s.hull=Math.max(0,s.hull-4);
    addFloater(s.x,s.y-46,'TANK RUPTURE -4',C.hazard);
    return null;
  }
  const opts=applicableCrits(s);
  if(!opts.length){
    s.hull=Math.max(0,s.hull-2);
    addFloater(s.x,s.y-46,'STRUCTURE GRINDING -2',C.hazard);
    return null;
  }
  const id=opts[Math.floor(rng()*opts.length)];
  s.crits.push(id);
  if(id==='cockpit'){adjCool(s,-15,'cockpit breach');if(s.faction==='reb')s.pilot.cockpitHit=1;}
  addFloater(s.x,s.y-46,CRITDEFS[id].name.toUpperCase(),C.hazard);
  log(CRITDEFS[id].name+' on '+s.name+' ('+why+')');
  return id;
}
/* ---------- copied from space.js ~557–579 (wslot, validShot, slotOfKind, bestWeaponFor) ---------- */
function wslot(s,wkey){return s.wpns.find(q=>q.key===wkey)||null;}
function validShot(s,t,wkey){
  const sl=wslot(s,wkey);
  if(!sl)return false;
  const w=sl.w;
  if(w.kind!=='plasma'&&critCount(s,'feed'))return false;
  if(!inArc(s,t)||dist(s,t)>w.rng)return false;
  if(w.needsLock&&!(s.lock&&s.lock.target===t.id&&s.lock.level>=1))return false;
  if(s.ammo[wkey]!==undefined&&s.ammo[wkey]<=0)return false;
  return true;
}
function slotOfKind(s,t,kind){const q=s.wpns.find(x=>x.w.kind===kind&&validShot(s,t,x.key));return q?q.key:null;}
function bestWeaponFor(s,t){
  const hp=totalShield(t)+t.arm+t.hull;
  let k;
  if((k=slotOfKind(s,t,'missile'))&&hp>=20)return k;
  if((k=slotOfKind(s,t,'ballistic'))&&((s.lock&&s.lock.target===t.id)||bullsFactor(s,t)>0.3||band(dist(s,t))===1))return k;
  if((k=slotOfKind(s,t,'plasma')))return k;
  if((k=slotOfKind(s,t,'ballistic')))return k;
  if((k=slotOfKind(s,t,'missile')))return k;
  return null;
}
/* ---------- copied from space.js ~998–1005 (critChance, luckySave) ---------- */
function critChance(w,atk,t){return w.crit+0.25*((atk&&atk.bullsF)||0)+(hasTr(t,'unlucky')?0.05:0);}
function luckySave(t){
  if(t.hull>0||!hasTr(t,'lucky')||rng()>=0.05)return false;
  t.hull=1;addFloater(t.x,t.y-64,'LUCKY',C.go);
  return true;
}
/* ---------- copied from space.js ~1006–1043 (destroyShip): the nerve fallout, without campaign xp or salvage ---------- */
function destroyShip(t,killer){
  if(killer&&killer.faction==='reb'&&t.faction==='heg'&&!isStruct(t))killer.pilot.kills=(killer.pilot.kills||0)+1;
  t.alive=false;
  ev('kill',{id:t.id,x:t.x,y:t.y,h:t.h,by:killer&&killer.id});
  log(t.name+' destroyed'+(killer?' by '+killer.name:''));
  if(killer&&killer.alive)adjCool(killer,12,'kill');
  for(const m of S.ships){
    if(!m.alive||m.faction!==t.faction||m===t)continue;
    adjCool(m,-18,'wingman lost');
    const bond=m.pilot.tr.find(x=>(x.k==='friends'||x.k==='love')&&x.with===t.pilot.who);
    if(bond){m.pilot.friendLock=true;adjCool(m,-50,(t.pilot.first||t.name)+' is gone');}
  }
  if(t.lead)for(const m of S.ships)if(m.alive&&m.faction===t.faction&&m!==t&&!CLS[m.cls].mute)adjCool(m,-45,'their leader is down');
  for(const m of S.ships){   // doctrines that care who just died (a wingman's lead)
    const D=m.alive&&m.doctrine&&DOCTRINES[m.doctrine];
    if(D&&D.onAllyDown&&m.faction===t.faction)D.onAllyDown(m,t,WAPI);
  }
}

/* =====================================================================
   v2: movement — moves dragged and released inside the ship's envelope (the designer, 9 October: C-57)
   A move is one arc from the ship's pose, locked to one direction: straight, a bank (up to 45°) or a
   turn (up to 90°), of any length inside the band the ship's dial gives that type. The dial's whole
   speeds become continuous bands: a type flown at speeds lo..hi covers lengths (lo − 0.5)..hi × SU.
   A round's moves chain end to end and are flown at one steady speed across the exec. Together they may
   cover at most top speed × EXEC_LEN ÷ SEG_TIME; a ship never flies slower than its slowest straight,
   so a shorter chain is followed by flying straight on (drawn dashed). Positions are sampled per tick,
   each sample clamped to the map as space.js does.
   ===================================================================== */
const ANG={S:0,B:Math.PI/4,T:Math.PI/2};
/* the envelope: length bands (world units) per move type, from the dial after crits (dialAvail) */
function envOf(s){
  const e={S:null,B:null,T:null,K:false};
  for(const [sp,tk] of dialAvail(s)){
    const k=tk==='S'?'S':(tk==='l'||tk==='r')?'B':(tk==='L'||tk==='R')?'T':'K';
    if(k==='K'){e.K=true;continue;}
    const r=e[k]||[sp,sp];e[k]=[Math.min(r[0],sp),Math.max(r[1],sp)];
  }
  const ks=['S','B','T'].filter(k=>e[k]);
  for(const k of ks)e[k]=[Math.max(0.5,e[k][0]-0.5)*SU,e[k][1]*SU];
  e.lo=ks.length?Math.min(...ks.map(k=>e[k][0])):0;
  e.hi=ks.length?Math.max(...ks.map(k=>e[k][1])):0;
  return e;
}
const inBand=(r,len)=>!!r&&len>=r[0]-1e-6&&len<=r[1]+1e-6;
const tolRad=()=>T.STRAIGHT_TOL*Math.PI/180;
/* the widest heading change any type allows at this length (-1: no type flies it) */
function maxAng(e,len){let a=-1;if(inBand(e.S,len))a=tolRad();if(inBand(e.B,len))a=Math.max(a,ANG.B);if(inBand(e.T,len))a=Math.max(a,ANG.T);return a;}
function classify(e,len,turn){
  const a=Math.abs(turn);
  if(a<=tolRad()+1e-9&&inBand(e.S,len))return 'S';
  if(a<=ANG.B+1e-9&&inBand(e.B,len))return 'B';
  if(a<=ANG.T+1e-9&&inBand(e.T,len))return 'T';
  return null;
}
function moveCost(type){return type==='S'?T.AP_STRAIGHT:type==='B'?T.AP_BANK:type==='T'?T.AP_TURN:T.AP_KTURN;}
/* one arc as a function of t (0..1): manPath's geometry with a continuous length and heading change */
function arcFn(x0,y0,h0,a){
  if(a.k)return manPath(x0,y0,h0,[a.len/SU,'K']);
  if(Math.abs(a.turn)<1e-6)return t=>({x:x0+Math.cos(h0)*a.len*t,y:y0+Math.sin(h0)*a.len*t,h:h0});
  const R=a.len/a.turn;
  return t=>({x:x0+R*(Math.sin(h0+a.turn*t)-Math.sin(h0)),y:y0-R*(Math.cos(h0+a.turn*t)-Math.cos(h0)),h:h0+a.turn*t});
}
const arcEnd=(p,a)=>clampEnd(arcFn(p.x,p.y,p.h,a)(1));
/* the one arc from a pose, tangent to its heading, that ends on a point */
function arcToPoint(p,px,py){
  const dx=px-p.x,dy=py-p.y,c=Math.cos(p.h),sn=Math.sin(p.h);
  const fx=dx*c+dy*sn,fy=-dx*sn+dy*c;
  if(Math.abs(fy)<1e-6)return fx>0?{len:fx,turn:0}:null;
  const turn=2*Math.atan2(fy,fx),R=(fx*fx+fy*fy)/(2*fy);
  return {len:R*turn,turn};
}
/* round distance: the most a chain may cover, and the least the ship flies whatever it is told */
function roundMax(s){return maxSpeedOf(s)*SU*T.EXEC_LEN/T.SEG_TIME;}
function roundMin(s){return CLS[s.cls].minSpd*SU*T.EXEC_LEN/T.SEG_TIME;}
const chainLen=arcs=>(arcs||[]).reduce((n,a)=>n+a.len,0);
function chainEnd(s,arcs,pose){let p=pose||{x:s.x,y:s.y,h:s.h};for(const a of arcs||[])p=arcEnd(p,a);return p;}
/* The move under the pointer: the arc to it if the envelope allows, else the legal arc whose end is nearest
   (so the ghost slides along the envelope's edge). A turn inside the straight tolerance snaps to straight. */
function moveTo(s,pose,px,py,budget){
  const e=envOf(s),hi=Math.min(e.hi,budget==null?e.hi:budget);
  if(hi<e.lo-1e-6)return null;
  const fin=(len,turn)=>{
    let type=classify(e,len,turn);
    if(type==='S')turn=0;
    if(!type)return null;
    const a={len,turn,k:false,type,cost:moveCost(type)};a.end=arcEnd(pose,a);return a;
  };
  const d=arcToPoint(pose,px,py);
  if(d&&d.len>=e.lo-1e-6&&d.len<=hi+1e-6&&Math.abs(d.turn)<=Math.PI){const a=fin(d.len,d.turn);if(a)return a;}
  let best=null,bd=1e18;
  const NL=40,NA=24;
  for(let i=0;i<=NL;i++){
    const len=e.lo+(hi-e.lo)*i/NL,ma=maxAng(e,len);
    if(ma<0)continue;
    for(let j=0;j<=NA;j++){
      const turn=-ma+2*ma*j/NA,q=arcFn(pose.x,pose.y,pose.h,{len,turn})(1),dd=Math.hypot(q.x-px,q.y-py);
      if(dd<bd){bd=dd;best=[len,turn];}
    }
  }
  return best?fin(best[0],best[1]):null;
}
function manToArc(s,m){
  const sp=Math.min(m[0],maxSpeedOf(s)),tk=m[1],type=tk==='S'?'S':(tk==='l'||tk==='r')?'B':(tk==='L'||tk==='R')?'T':'K';
  return {len:sp*SU,turn:TURNS[tk]||0,k:tk==='K',type,cost:moveCost(type)};
}
/* the run: arcs with start times, flown at one steady speed; `coast` marks the straight-on filler */
function buildRun(s,arcs,pose,t0,tEnd,speed){
  const run=[];
  const span=tEnd-t0;
  if(isStruct(s)||span<=1e-9)return run;
  const u=speed!=null?speed:Math.max(chainLen(arcs),roundMin(s)*span/T.EXEC_LEN)/span;
  if(u<=0)return run;
  let p={x:pose.x,y:pose.y,h:pose.h},t=t0;
  const push=(a,coast)=>{const fn=arcFn(p.x,p.y,p.h,a),dur=a.len/u;run.push({arc:a,t0:t,dur,fn,x:p.x,y:p.y,h:p.h,coast:!!coast});p=clampEnd(fn(1));t+=dur;};
  for(const a of arcs||[]){if(t>=tEnd-1e-9)break;push(a,false);}
  if(t<tEnd-1e-9)push({len:u*(tEnd-t),turn:0,k:false,type:'S'},true);
  run.speed=u;
  return run;
}
function poseAt(s,tau){
  const run=s.run;
  if(!run||!run.length)return {x:s.x,y:s.y,h:s.h};
  let seg=run[0];
  for(const r of run)if(r.t0<=tau+1e-9)seg=r;else break;
  const k=Math.max(0,Math.min(1,(tau-seg.t0)/(seg.dur||1)));
  return clampEnd(seg.fn(k));
}
/* sampled points of a run, for drawing and for the leash check; `knot` marks the end of each planned move */
function sampleRun(run,per){
  const pts=[];per=per||10;
  for(const r of run)for(let i=0;i<=per;i++){const q=clampEnd(r.fn(i/per));pts.push({x:q.x,y:q.y,h:q.h,coast:r.coast,knot:i===per&&!r.coast,t:r.t0+r.dur*i/per});}
  return pts;
}

/* ---------- action points (the designer, 9 October: C-57) ----------
   One meter per pilot per round pays for everything: moves, stances, shield work, specials and interrupts.
   AP left when the exec starts is the reserve for interrupts; it does not carry into the next round.
   A Cool pilot gets COOL_AP bonus points; spending into them drops the pilot out of Cool, so the bonus is
   gone until they earn Cool back. */
function apMax(s){return T.AP_BASE+Math.floor((s.pilot.level||1)/T.AP_LEVELS);}
function freshAp(s){return {max:apMax(s),bonus:(!CLS[s.cls].mute&&coolState(s)==='cool')?T.COOL_AP:0,used:0,bonusSpent:false};}
function apPlanned(s){
  let n=0;
  for(const a of (s.plan2&&s.plan2.arcs)||[])n+=a.cost||0;
  if(s.stance.evade)n+=T.AP_EVADE;
  if(s.stance.lockin)n+=T.AP_LOCKIN;
  if(s.stance.boost)n+=T.AP_BOOST;
  if(s.shieldAt0)for(const k of ['F','R'])if(s.segs[k].at!==s.shieldAt0[k])n+=T.AP_SHIFT;
  return n;
}
function apLeft(s){if(!s.ap)return 0;return s.ap.max+s.ap.bonus-apPlanned(s)-s.ap.used;}
/* spending past the base pool uses the Cool bonus: the pilot drops just out of Cool */
function settleBonus(s){
  if(!s.ap||s.ap.bonusSpent||!s.ap.bonus)return;
  if(apPlanned(s)+s.ap.used>s.ap.max){
    s.ap.bonusSpent=true;
    if(s.pilot.cool>T.COOL_SPENT_TO){s.pilot.cool=T.COOL_SPENT_TO;addFloater(s.x,s.y-40,'COOL SPENT',C.gold);log(s.name+' spends their Cool');}
  }
}
/* Goals: what a standing order or a doctrine asks of the same fitter (handoff §3.2, §3.5). A goal is
   {kind, ...}; the cost of a candidate end pose is lower the better. Enemies plan without seeing the
   player's plan: other ships are predicted flying straight on at their last speed. */
function predict(t,secs){
  if(!t)return null;
  return clampEnd({x:t.x+Math.cos(t.h)*t.vel*secs,y:t.y+Math.sin(t.h)*t.vel*secs,h:t.h});
}
function foes(s){return S.ships.filter(x=>x.alive&&x.faction!==s.faction);}
function allies(s){return S.ships.filter(x=>x.alive&&x.faction===s.faction&&x!==s);}
function nearestFoe(s,pool){let b=null,bd=1e18;for(const f of pool||foes(s)){if(isStruct(f)&&s.faction==='heg')continue;const d=dist(s,f);if(d<bd){bd=d;b=f;}}return b||(pool||foes(s))[0]||null;}
/* pursuit's cost: space.js aiManeuver's scoring (~618–629), copied and negated */
function pursueCost(s,e,P,prefD){
  let sc=0;const d=dist(e,P);
  sc-=Math.abs(d-prefD)*0.5;
  if(inArc(e,P)&&d<=900){sc+=240;if(bearing(e,P)<=LOCK_ARC)sc+=60;}
  if(e.clamped)sc-=500;
  sc+=Math.cos(angNorm(Math.atan2(P.y-e.y,P.x-e.x)-e.h))*70;
  for(const f of foes(s)){if(!isStruct(f)&&inArc(f,e)&&dist(f,e)<=600)sc-=45;}
  if(losBlocked(e,P))sc-=60;
  return -sc;
}
function goalCost(s,g,e,secs,m){
  switch(g.kind){
    case 'pursue':{const t=byId(g.target);if(!t||!t.alive)return holdCost(s,e,m,s);return pursueCost(s,e,predict(t,secs),g.range||T.PREF_RANGE);}
    case 'follow':{
      const l=byId(g.leader);if(!l||!l.alive)return holdCost(s,e,m,s);
      const P=predict(l,secs),c=Math.cos(P.h),sn=Math.sin(P.h);
      const gx=P.x+c*g.dx-sn*g.dy,gy=P.y+sn*g.dx+c*g.dy;
      return Math.hypot(e.x-gx,e.y-gy)+60*Math.abs(angNorm(e.h-P.h))+(e.clamped?300:0);
    }
    case 'point':return Math.hypot(e.x-g.x,e.y-g.y)+(g.h!=null?60*Math.abs(angNorm(e.h-g.h)):0)+(e.clamped?300:0);
    case 'flee':{   // space.js aiManeuver's flee scoring (~603–612), copied and negated
      const ex=s.x<W/2?MARGIN:W-MARGIN,ey=s.y<H/2?MARGIN:H-MARGIN;
      const tgtA=Math.abs(s.x-ex)<Math.abs(s.y-ey)?Math.atan2(0,ex-s.x>0?1:-1):Math.atan2(ey-s.y>0?1:-1,0);
      return -(m[0]*30-Math.abs(angNorm(tgtA-e.h))*80);
    }
    case 'evade':{
      let c=(e.clamped?400:0)+m[0]*12;
      for(const f of foes(s)){if(isStruct(f))continue;const d=dist(f,e);if(inArc(f,e)&&d<=900)c+=220;c-=Math.min(d,1400)*0.15;}
      return c;
    }
    case 'hold':default:return holdCost(s,e,m,g.at||s.anchor||s);
  }
}
function holdCost(s,e,m,at){return Math.hypot(e.x-at.x,e.y-at.y)*0.6+m[0]*20+(e.clamped?300:0);}
/* the farthest a candidate segment strays from a leash centre (hold_asset's guard radius) */
function leashCost(fn,lz){let c=0;for(const k of [0.25,0.5,0.75,1]){const q=clampEnd(fn(k));c=Math.max(c,Math.hypot(q.x-lz.x,q.y-lz.y)-lz.r);}return c>0?3000+c*20:0;}
const BEAM=10;   // fitter beam width for goals (later segment ends weigh more)
/* Orders and doctrines plan in whole dial manoeuvres, within the same AP and round distance as the player. */
function fitGoal(s,g,pose,n,noise,ap){
  pose=pose||{x:s.x,y:s.y,h:s.h};n=n||segsPerExec();
  const dial=dialAvail(s),maxLen=roundMax(s)+1e-6;
  ap=ap==null?Infinity:ap;
  let beam=[{arcs:[],pose,cost:0,ap:0,len:0}];
  for(let i=0;i<n;i++){
    const next=[];
    for(const b of beam)for(const m of dial){
      const a=manToArc(s,m);
      if(b.ap+a.cost>ap||b.len+a.len>maxLen)continue;
      const man=[a.len/SU,m[1]],fn=manPath(b.pose.x,b.pose.y,b.pose.h,man),e=clampEnd(fn(1));
      let c=goalCost(s,g,e,(i+1)*T.SEG_TIME,man);
      if(g.leash)c+=leashCost(fn,g.leash);
      if(noise)c+=noise*rng();
      next.push({arcs:b.arcs.concat([a]),pose:e,cost:b.cost+c*(i+1)/n,ap:b.ap+a.cost,len:b.len+a.len});
    }
    if(!next.length)break;   // out of AP or distance: the chain so far stands
    next.sort((a,b)=>a.cost-b.cost);
    beam=next.slice(0,BEAM);
  }
  return beam[0].arcs;
}

/* ---------- standing orders (player ships; handoff §3.2) ---------- */
const ORDERS=['none','pursue','escort','follow','hold'];
function orderGoal(s){
  const o=s.order;
  if(!o||o.kind==='none')return null;   // no order and no moves: the ship flies straight on, for no AP
  if(o.kind==='hold')return {kind:'hold',at:s.anchor};
  if(o.kind==='pursue')return {kind:'pursue',target:o.target,range:T.PREF_RANGE,fire:o.target};
  if(o.kind==='escort'){const a=byId(o.target);const th=a&&threatTo(a,s);return {kind:'follow',leader:o.target,dx:-200,dy:170,fire:th&&th.id};}
  if(o.kind==='follow')return {kind:'follow',leader:o.target,dx:o.dx==null?-220:o.dx,dy:o.dy==null?0:o.dy};
  return {kind:'hold'};
}
/* the hostile that most threatens an ally: one with the ally in its arc, else the nearest to it */
function threatTo(a,by){
  const fs=foes(by||a).filter(f=>!isStruct(f));
  const inA=fs.filter(f=>inArc(f,a)&&dist(f,a)<=900).sort((p,q)=>dist(p,a)-dist(q,a));
  if(inA.length)return inA[0];
  const near=fs.filter(f=>dist(f,a)<=600).sort((p,q)=>dist(p,a)-dist(q,a));
  return near[0]||null;
}

/* =====================================================================
   Doctrine AI (handoff §3.5). A module is {key, label, plan(s,W) -> goal, tell(s,D,W)} plus optional
   init(ships,W) at scenario load, tick(s,dt,W) and onAllyDown(s,dead,W). Doctrine plans through the
   same fitter as the player, so an enemy can never fly anything the player couldn't. Adding a doctrine
   means adding one module (addDoctrine). A goal may also carry fire (target id), holdFire, evade, leash.
   tell() draws the doctrine's always-on tell through the Arena's draw kit D (no canvas code in here).
   ===================================================================== */
const DOCTRINES={};
function addDoctrine(m){
  if(!m||!m.key||typeof m.plan!=='function')throw new Error('a doctrine needs a key and a plan(s,W)');
  DOCTRINES[m.key]=m;return m;
}
addDoctrine({key:'pursuit',label:'Pursuit',
  plan(s,W){
    const lk=s.lock&&W.byId(s.lock.target);
    const t=(lk&&lk.alive)?lk:W.nearestFoe(s);
    return t?{kind:'pursue',target:t.id,range:T.PREF_RANGE,fire:t.id}:{kind:'hold'};
  },
  tell(s,D){const t=s.goal&&D.byId(s.goal.target);if(t)D.chevron(s,t);}});
addDoctrine({key:'wingman',label:'Wingman',
  init(ships){   // pair them in order within each flight: lead, wing, lead, wing
    const by={};for(const s of ships)(by[s.flight]=by[s.flight]||[]).push(s);
    for(const k in by){const f=by[k];for(let i=0;i<f.length;i++){const s=f[i];
      if(i%2===0){s.doc={role:'lead',mate:f[i+1]?f[i+1].id:null};}
      else {s.doc={role:'wing',mate:f[i-1].id,side:(i>>1)%2?-1:1};}}}
  },
  plan(s,W){
    const d=s.doc;
    if(d.role==='flee')return {kind:'flee',holdFire:true};
    if(d.role==='flounder')return {kind:'evade',evade:true,holdFire:true};
    if(d.role==='wing'){
      const l=W.byId(d.mate);
      if(l&&l.alive){const th=threatTo(l,s);return {kind:'follow',leader:l.id,dx:-200,dy:170*(d.side||1),fire:th&&th.id,holdFire:true};}
    }
    const t=W.nearestFoe(s);
    return t?{kind:'pursue',target:t.id,range:T.PREF_RANGE,fire:t.id}:{kind:'hold'};
  },
  onAllyDown(s,dead){
    if(s.doc.role==='wing'&&s.doc.mate===dead.id){s.doc={role:'flounder',until:S.time+T.WING_FLOUNDER,was:dead.id};
      s.stance.evade=true;s.tokens.evade=true;s.holdFire=true;addFloater(s.x,s.y-40,'FLOUNDERING',C.text3);}
    else if(s.doc.role==='lead'&&s.doc.mate===dead.id)s.doc.mate=null;
  },
  tick(s,dt,W){   // after the flounder: re-pair with a lone wingman of its side, else run
    const d=s.doc;
    if(d.role!=='flounder'||S.time<d.until)return;
    const lone=W.allies(s).find(a=>a.doctrine==='wingman'&&((a.doc.role==='lead'&&!a.doc.mate)||a.doc.role==='flounder'));
    if(lone){
      if(lone.doc.role==='flounder')lone.doc={role:'lead',mate:s.id};else lone.doc.mate=s.id;
      s.doc={role:'wing',mate:lone.id,side:1,repaired:true};addFloater(s.x,s.y-40,'RE-PAIRED',C.text3);
    } else {s.doc={role:'flee'};addFloater(s.x,s.y-40,'BREAKING OFF',C.text3);}
    s.stance.evade=false;
  },
  tell(s,D){
    if(s.doc.role==='wing'){const l=D.byId(s.doc.mate);if(l&&l.alive)D.pairLine(s,l);}
    if(s.doc.role==='flounder')D.badge(s,'?');
  }});
addDoctrine({key:'hold_asset',label:'Hold asset',
  plan(s,W){
    const a=W.asset(s),r=T.GUARD_R;
    const threats=W.foes(s).filter(f=>!isStruct(f)&&dist(f,a)<=r).sort((p,q)=>dist(p,s)-dist(q,s));
    const lz={x:a.x,y:a.y,r};
    if(threats.length)return {kind:'pursue',target:threats[0].id,range:T.PREF_RANGE,fire:threats[0].id,leash:lz,holdFire:true};
    const ang=Math.atan2(s.y-a.y,s.x-a.x)+0.9;   // patrol: orbit the asset at half the radius
    return {kind:'point',x:a.x+Math.cos(ang)*r*0.5,y:a.y+Math.sin(ang)*r*0.5,leash:lz,holdFire:true};
  },
  tell(s,D,W){const a=W.asset(s);D.ring(a.x,a.y,T.GUARD_R,s);}});
addDoctrine({key:'firing_line',label:'Firing line',
  plan(s,W){
    const fl=W.flight(s),mem=fl.members.map(W.byId).filter(m=>m&&m.alive),me=mem.indexOf(s);
    if(fl.planned!==S.turn){   // once per turn per flight: decide regroup or run
      fl.planned=S.turn;
      const reb=W.foes(s).filter(f=>!isStruct(f));
      if(!reb.length||!mem.length){fl.mode='regroup';}
      else if(fl.mode==='run')fl.mode='regroup';          // one exec of running in, then form again
      else {
        const cx=mem.reduce((a,m)=>a+m.x,0)/mem.length,cy=mem.reduce((a,m)=>a+m.y,0)/mem.length;
        const t=reb.reduce((a,b)=>Math.hypot(a.x-cx,a.y-cy)<Math.hypot(b.x-cx,b.y-cy)?a:b);
        const ang=Math.atan2(cy-t.y,cx-t.x);
        fl.rally={x:UT.clamp(t.x+Math.cos(ang)*T.RALLY_D,MARGIN+200,W.W-MARGIN-200),y:UT.clamp(t.y+Math.sin(ang)*T.RALLY_D,MARGIN+200,W.H-MARGIN-200),face:ang+Math.PI,target:t.id};
        const formed=mem.every((m,i)=>{const p=slotOf(fl,i,mem.length);return Math.hypot(m.x-p.x,m.y-p.y)<=T.FORM_R;});
        fl.mode=formed?'run':'regroup';
      }
    }
    if(fl.mode==='run'){const t=W.nearestFoe(s);return t?{kind:'pursue',target:t.id,range:180,fire:t.id}:{kind:'hold'};}
    if(!fl.rally)return {kind:'hold'};
    const p=slotOf(fl,Math.max(0,me),mem.length);
    return {kind:'point',x:p.x,y:p.y,h:fl.rally.face};
  },
  tell(s,D,W){const fl=W.flight(s);if(fl.mode==='regroup'&&fl.rally&&fl.members[0]===firstAlive(fl,W))D.rally(fl.rally.x,fl.rally.y,s);}});
function slotOf(fl,i,n){const r=fl.rally,px=-Math.sin(r.face),py=Math.cos(r.face),o=(i-(n-1)/2)*220;return {x:r.x+px*o,y:r.y+py*o};}
function firstAlive(fl,W){return fl.members.find(id=>{const m=W.byId(id);return m&&m.alive;});}

/* the doctrine world: what a module may read */
const WAPI={
  get ships(){return S.ships;},get T(){return T;},W,H,MARGIN,
  byId,foes,allies,nearestFoe,predict,dist,bearing,inArc,coolState,threatTo,
  time:()=>S.time,turn:()=>S.turn,
  flight(s){const k=s.flight;S.flights[k]=S.flights[k]||{members:S.ships.filter(x=>x.flight===k).map(x=>x.id),mode:'regroup'};return S.flights[k];},
  asset(s){const a=s.asset&&byId(s.asset);return a?{x:a.x,y:a.y}:(s.anchor||{x:s.x,y:s.y});},
};

/* the plan for one ship for the coming exec: drawn paths win, then panic, then doctrine or standing order */
function goalOf(s){
  if(s.faction==='heg'&&coolState(s)==='panic'&&!CLS[s.cls].mute)return s.flees?{kind:'flee',holdFire:true}:{kind:'evade',evade:true};   // space.js: panic flies defensive; flees types run
  if(s.doctrine){const D=DOCTRINES[s.doctrine];return (D&&!DOC_OFF[s.doctrine])?D.plan(s,WAPI):{kind:'hold'};}
  return orderGoal(s);
}
function planShip(s){
  if(!s.alive||isStruct(s))return;
  if(s.plan2.drawn)return;
  const g=goalOf(s);
  s.goal=g;
  if(!g){s.plan2={arcs:[],drawn:false};return;}
  s.stance.evade=!!g.evade&&s.faction==='heg';
  s.plan2={arcs:[],drawn:false};
  const ap=s.ap?s.ap.max-apPlanned(s):Infinity;   // auto-planning never spends the Cool bonus
  s.plan2={arcs:fitGoal(s,g,null,segsPerExec(),s.faction==='heg'?T.AI_NOISE:0,ap),drawn:false};
  if(s.faction==='heg'){
    if(g.fire!==undefined)s.target=g.fire||null;
    else if(!s.target||!byId(s.target)||!byId(s.target).alive){const t=nearestFoe(s);s.target=t?t.id:null;}
    s.holdFire=!!g.holdFire;
  } else if(g.fire)s.target=g.fire;
}

/* =====================================================================
   The loop (handoff §3.1): PLAN (paused) -> EXEC (fixed ticks for EXEC_LEN) -> PLAN ... -> OVER
   ===================================================================== */
function newSim(){return {ships:[],rocks:[],flights:{},events:[],metrics:[],phase:'PLAN',turn:1,time:0,execT:0,acc:0,
  paused:null,result:null,seed:1,scen:null,variant:0,planMs:0,objective:null};}
function resetExecStats(){for(const s of S.ships)s.stats={shots:0,hits:0,arcTicks:0,ints:0};}
function beginPlan(){
  S.phase='PLAN';
  for(const s of S.ships){
    if(!s.alive)continue;
    s.plan2={arcs:[],drawn:false};s.anchor={x:s.x,y:s.y};
    s.stance={evade:false,lockin:false,boost:false};s.tokens.evade=false;
    s.ap=freshAp(s);s.shieldAt0={F:s.segs.F.at,R:s.segs.R.at};
    if(s.faction==='reb'){
      const t=s.target&&byId(s.target);
      if(!t||!t.alive){const n=nearestFoe(s);s.target=n?n.id:null;}
      planShip(s);   // standing orders auto-plan (the plan stays undrawn: drawing replaces it)
    } else if(!isStruct(s))s.goal=goalOf(s);   // the doctrine's intent, so its tell shows while the player plans (fitted at go)

  }
  ev('phase',{phase:'PLAN',turn:S.turn});
}
/* PLAN -> EXEC. planMs: how long the player planned (for metrics). Enemies plan now, from the same state. */
function go(planMs){
  if(!S||S.phase!=='PLAN')return false;
  S.planMs=planMs||0;
  for(const s of S.ships)if(s.alive&&s.faction==='heg')planShip(s);
  for(const s of S.ships)if(s.alive&&s.faction==='reb'&&!s.plan2.drawn&&!s.plan2.arcs.length)planShip(s);
  for(const s of S.ships){
    if(!s.alive)continue;
    s.run=buildRun(s,s.plan2.arcs,s,0,T.EXEC_LEN);
    s.tokens.evade=!!s.stance.evade;s.intUsed=0;s.hitThisExec=false;
    if(s.run.length)s.vel=s.run.speed;
    if(s.stance.boost)boostShield(s);
    settleBonus(s);
  }
  resetExecStats();
  S.execT=0;S.acc=0;S.phase='EXEC';
  ev('phase',{phase:'EXEC',turn:S.turn});
  return true;
}
/* wall-clock driver: ms of real time (scaled by SIM_SPEED) -> fixed ticks */
function advance(ms){
  if(!S||S.phase!=='EXEC'||S.paused)return;
  S.acc+=ms*T.SIM_SPEED;
  let n=0;
  while(S.acc>=T.TICK&&S.phase==='EXEC'&&!S.paused&&n++<400){S.acc-=T.TICK;tick(T.TICK/1000);}
}
function runExec(){let n=0;while(S&&S.phase==='EXEC'&&!S.paused&&n++<100000)tick(T.TICK/1000);}
function runUntil(tau){let n=0;while(S&&S.phase==='EXEC'&&!S.paused&&S.execT<tau-1e-9&&n++<100000)tick(T.TICK/1000);}
function tick(dt){
  S.execT+=dt;S.time+=dt;
  const tau=S.execT;
  // 1. move: everything flies at once
  for(const s of S.ships){
    if(!s.alive||isStruct(s))continue;
    const q=poseAt(s,tau);
    s.x=q.x;s.y=q.y;s.h=q.h;
  }
  // 2. cooldowns, doctrine ticks
  for(const s of S.ships){
    if(!s.alive)continue;
    for(const k in s.cd)s.cd[k]=Math.max(0,s.cd[k]-dt);
    const D=s.doctrine&&DOCTRINES[s.doctrine];
    if(D&&D.tick)D.tick(s,dt,WAPI);
  }
  // 3. locks: continuous acquisition, broken by the rear hemisphere (space.js checkLocks, per tick)
  for(const s of S.ships){
    if(!s.alive||isStruct(s))continue;
    if(s.lock){
      const t=byId(s.lock.target);
      if(!t||!t.alive)s.lock=null;
      else if(!inFrontHemi(s,t)){s.lock=null;s.lockAcc=0;addFloater(s.x,s.y-36,'LOCK BROKEN',C.text3);ev('lockbreak',{id:s.id,t:t.id});}
    }
    const t=s.target&&byId(s.target);
    if(!t||!t.alive||coolState(s)==='panic'||s.stance.evade||s.stance.lockin||(s.lock&&s.lock.target===t.id&&s.lock.level>=3)){s.lockAcc=0;continue;}
    if(inLockZone(s,t)&&!losBlocked(s,t)){
      s.lockAcc+=dt;
      if(s.lockAcc>=T.LOCK_TIME-1e-9){
        s.lockAcc=0;
        if(s.lock&&s.lock.target===t.id)s.lock.level=Math.min(3,s.lock.level+1);else s.lock={target:t.id,level:1};
        addFloater(s.x,s.y-36,'LOCK '+s.lock.level,s.faction==='reb'?C.gold:C.heg);
        ev('lock',{id:s.id,t:t.id,level:s.lock.level});
      }
    } else s.lockAcc=0;
  }
  // 4. time in arc (metrics): a rebel ship with a hostile in its guns
  for(const s of S.ships){
    if(!s.alive||s.faction!=='reb')continue;
    if(foes(s).some(f=>inArc(s,f)&&dist(s,f)<=900))s.stats.arcTicks++;
  }
  // 5. auto-fire: every shot is chosen from the same instant, then all resolve (simultaneous)
  const shots=[];
  for(const s of S.ships){
    if(!s.alive||isStruct(s)||!s.wpns.length)continue;
    if(coolState(s)==='panic'&&s.flees)continue;   // space.js: running, not fighting
    for(const q of s.wpns){
      if((s.cd[q.key]||0)>0)continue;
      const t=pickShot(s,q);
      if(t)shots.push([s,t,q.key]);
    }
  }
  for(const [s,t,k] of shots){if(t.alive)resolveAttack(s,t,k,{});}
  // 6. objectives
  checkObjective();
  if(S.phase==='EXEC'&&S.execT>=T.EXEC_LEN-1e-9)endExec();
}
/* which hostile this weapon shoots now: the planned target, else (OPP_FIRE) any other in its arc */
function pickShot(s,q){
  const want=(t)=>{
    if(!validShot(s,t,q.key))return false;
    if(q.w.kind==='missile'&&totalShield(t)+t.arm+t.hull<20&&s.wpns.some(o=>o!==q&&validShot(s,t,o.key)))return false;   // bestWeaponFor's warhead rule
    return true;
  };
  const t=s.target&&byId(s.target);
  if(t&&t.alive&&t.faction!==s.faction&&want(t))return t;
  if(!T.OPP_FIRE||s.holdFire)return null;
  let best=null,bd=1e18;
  for(const f of foes(s)){if(!want(f))continue;const d=dist(s,f);if(d<bd){bd=d;best=f;}}
  return best;
}
/* one attack, at this instant: space.js fireCtx + applyCtx resolution (~896–996), without the staging */
function resolveAttack(s,t,wkey,o){
  const w=wslot(s,wkey).w;
  const tn=computeTN(s,t),atk=computeATK(s,t,wkey);
  if(o.snap){atk.total+=T.SNAP_BONUS;atk.entries.push(['SNAP SHOT',T.SNAP_BONUS]);}
  const need=needFor(tn.total,atk.total),roll=rint(1,20),hit=roll>=need;
  if(s.ammo[wkey]!==undefined)s.ammo[wkey]--;
  if(w.kind==='missile'&&s.lock){s.lock.level--;if(s.lock.level<=0)s.lock=null;}
  let dmg=0,crit=false;
  if(hit){dmg=rint(w.dmg[0],w.dmg[1]);crit=rng()<critChance(w,atk,t);}
  s.cd[wkey]=WPN_CD(w.kind);
  s.stats.shots++;
  const rec={s:s.id,t:t.id,wkey,kind:w.kind,wid:w.id,hit,roll,need,pct:pctFor(need),tn:tn.total,atk:atk.total,dmg,crit,snap:!!o.snap,
    sx:s.x,sy:s.y,sh:s.h,tx:t.x,ty:t.y,sd:0,ad:0,hd:0,critId:null,killed:false,turn:S.turn};
  if(hit){
    s.stats.hits++;
    const r=applyDamage(t,dmg,w.skipShield,hitsFront(s,t));
    rec.sd=r.sd;rec.ad=r.ad;rec.hd=r.hd;rec.zone=r.zone;rec.zoneLeft=zoneShield(t,r.zone);
    adjCool(t,(r.ad>0||r.hd>0)?-12:-5,'taking fire');
    t.hitThisExec=true;
    if(t.alive&&t.hull>0&&(r.hd>0||crit))rec.critId=applyCritical(t,r.hd>0?'hull damage':'critical hit');
    luckySave(t);
    if(t.hull<=0){rec.killed=true;ev('shot',rec);destroyShip(t,s);return rec;}
  }
  ev('shot',rec);
  return rec;
}
/* end-of-exec housekeeping (space.js endRound analogue) */
function endExec(){
  for(const s of S.ships){
    if(!s.alive)continue;
    if(!s.hitThisExec)adjCool(s,T.CALM_GAIN,'breathing room');
    if(s.stance.lockin){adjCool(s,T.LOCKIN_GAIN,'locked in');addFloater(s.x,s.y-36,'LOCKED IN',C.go);s.stance.lockin=false;}
    s.hitThisExec=false;
    if(s.magClamp>0)s.magClamp--;
  }
  // fled ships leave (space.js endRound, plus a wingman that broke off)
  for(const s of S.ships){
    const running=(s.flees&&coolState(s)==='panic')||(s.doc&&s.doc.role==='flee');
    if(s.alive&&running&&(s.x<MARGIN+120||s.x>W-MARGIN-120||s.y<MARGIN+120||s.y>H-MARGIN-120)){
      s.alive=false;s.fledOut=true;addFloater(s.x,s.y,'JUMPED OUT',C.text3);ev('fled',{id:s.id});
    }
  }
  pushMetrics();
  checkObjective(true);
  if(S.phase==='OVER')return;
  S.turn++;
  beginPlan();
}

/* ---------- objectives (handoff §2.3): destroy, survive, exit; a chain runs them in order ---------- */
const EDGE_ZONE=180;
/* 'all' means every Hegemony ship that flies (a ship that fled counts as gone) */
function targetsOf(st){return st.targets==='all'?S.ships.filter(x=>x.faction==='heg'&&!isStruct(x)).map(x=>x.id):st.targets;}
function objSteps(o){return o?(o.kind==='chain'?o.steps:[o]):[];}
function objState(){
  const o=S.objective;if(!o)return {kind:'none'};
  const steps=objSteps(o),i=Math.min(S.objStep,steps.length-1),st=steps[i];
  const out={kind:o.kind,step:i,of:steps.length,cur:st.kind,done:!!S.result&&S.result.win,failed:!!S.result&&!S.result.win};
  if(st.kind==='survive')out.left=Math.max(0,st.secs-S.time);
  if(st.kind==='destroy')out.left=targetsOf(st).filter(id=>{const t=byId(id);return t&&t.alive;}).length;
  return out;
}
function checkObjective(execEnd){
  if(!S||S.phase==='OVER'||!S.objective)return;
  const reb=S.ships.filter(s=>s.faction==='reb');
  if(!reb.some(s=>s.alive)){finish(false,'flight lost');return;}
  const steps=objSteps(S.objective);
  while(S.objStep<steps.length){
    const st=steps[S.objStep];let done=false;
    if(st.kind==='destroy')done=targetsOf(st).every(id=>{const t=byId(id);return !t||!t.alive;});
    else if(st.kind==='survive')done=S.time>=st.secs-1e-9;
    else if(st.kind==='exit'){
      const at=s=>st.edge==='E'?s.x>=W-MARGIN-EDGE_ZONE:st.edge==='W'?s.x<=MARGIN+EDGE_ZONE:st.edge==='N'?s.y<=MARGIN+EDGE_ZONE:s.y>=H-MARGIN-EDGE_ZONE;
      done=reb.some(s=>s.alive&&at(s));
    }
    if(!done)break;
    S.objStep++;ev('objective',{step:S.objStep});
  }
  if(S.objStep>=steps.length){finish(true,'objective complete');return;}
  void execEnd;
}
function finish(win,why){
  S.result={win,why,turn:S.turn,time:Math.round(S.time*100)/100};
  if(S.phase==='EXEC')pushMetrics();
  S.phase='OVER';S.paused=null;
  ev('over',S.result);
}

/* ---------- metrics (handoff §7): one record per exec, to A.metrics and the console ---------- */
function pushMetrics(){
  if(S.metricsTurn===S.turn)return;
  S.metricsTurn=S.turn;
  const rec={scenario:S.scen&&S.scen.id,variant:S.variantLabel||null,seed:S.seed,turn:S.turn,planningMs:Math.round(S.planMs),
    execLen:T.EXEC_LEN,planClock:T.PLAN_CLOCK,time:Math.round(S.time*100)/100,
    ships:S.ships.map(s=>({id:s.id,side:s.faction,shots:s.stats.shots,hits:s.stats.hits,arcTicks:s.stats.arcTicks,interrupts:s.stats.ints,
      apMax:s.ap?s.ap.max+s.ap.bonus:0,apSpent:s.ap?apPlanned(s)+s.ap.used:0,nerve:Math.round(s.pilot.cool),hull:Math.max(0,s.hull),alive:s.alive})),
    objective:objState()};
  S.metrics.push(rec);
  try{console.log('ARENA_METRICS '+JSON.stringify(rec));}catch(e){}
  ev('metrics',{rec});
}

/* =====================================================================
   Interrupts (handoff §3.4; paid in AP since C-57): player-only, mid-exec.
   interrupt(id) pauses the sim on that ship; one verb (or cancel) resumes it.
   ===================================================================== */
function verbCost(v){return v==='snap'?T.AP_SNAP:v==='shift'?T.AP_SHIFT_INT:T.AP_JUKE+T.AP_STRAIGHT;}
function canInterrupt(s){
  if(!S||S.phase!=='EXEC')return {ok:false,why:'only during execution'};
  if(!s||!s.alive)return {ok:false,why:'no such ship'};
  if(s.faction!=='reb')return {ok:false,why:'the Hegemony commits'};
  if(s.pilot.cool<=T.INT_FLOOR)return {ok:false,why:'nerve too low (panicking)'};
  if(T.INT_CAP>0&&s.intUsed>=T.INT_CAP)return {ok:false,why:'interrupts used up this exec'};
  if(apLeft(s)<Math.min(verbCost('snap'),verbCost('shift'),verbCost('juke')))return {ok:false,why:'no action points left'};
  return {ok:true};
}
function interrupt(id){
  const s=byId(id),c=canInterrupt(s);
  if(!c.ok){ev('refused',{id,why:c.why});return c;}
  S.paused={id};ev('interrupt',{id,stage:'open'});
  return {ok:true};
}
function pausedShip(){return S&&S.paused&&byId(S.paused.id);}
function afford(s,cost){return apLeft(s)>=cost;}
function pay(s,cost,verb){
  s.ap.used+=cost;settleBonus(s);
  s.intUsed++;s.stats.ints++;
  ev('interrupt',{id:s.id,stage:'done',verb,cost});
  S.paused=null;
}
function snapShotTarget(s){
  const t=s.target&&byId(s.target);
  if(t&&t.alive&&bestWeaponFor(s,t))return t;
  let best=null,bd=1e18;for(const f of foes(s)){if(!bestWeaponFor(s,f))continue;const d=dist(s,f);if(d<bd){bd=d;best=f;}}
  return best;
}
function canSnap(){
  const s=pausedShip();if(!s)return {ok:false,why:'nothing paused'};
  if(!afford(s,T.AP_SNAP))return {ok:false,why:'not enough AP'};
  return snapShotTarget(s)?{ok:true}:{ok:false,why:'no firing solution'};
}
function intSnap(){
  const s=pausedShip();if(!s)return {ok:false,why:'nothing paused'};
  const c=canSnap();if(!c.ok)return c;
  const t=snapShotTarget(s),k=bestWeaponFor(s,t);
  pay(s,T.AP_SNAP,'snap');
  const rec=resolveAttack(s,t,k,{snap:true});
  checkObjective();
  return {ok:true,rec};
}
/* Juke: the rest of this exec becomes one new move from where the ship is, flown at its current speed */
function jukeMove(s,px,py){
  const left=s.vel*(T.EXEC_LEN-S.execT);
  return moveTo(s,{x:s.x,y:s.y,h:s.h},px,py,left);
}
function previewJuke(px,py){
  const s=pausedShip();if(!s)return null;
  const a=jukeMove(s,px,py);if(!a)return null;
  a.ok=afford(s,T.AP_JUKE+a.cost);
  return {arc:a,pts:sampleRun(buildRun(s,[a],{x:s.x,y:s.y,h:s.h},S.execT,T.EXEC_LEN,s.vel))};
}
function intJuke(px,py){
  const s=pausedShip();if(!s)return {ok:false,why:'nothing paused'};
  const a=jukeMove(s,px,py);
  if(!a)return {ok:false,why:'no room left to move'};
  if(!afford(s,T.AP_JUKE+a.cost))return {ok:false,why:'not enough AP'};
  s.run=buildRun(s,[a],{x:s.x,y:s.y,h:s.h},S.execT,T.EXEC_LEN,s.vel);
  pay(s,T.AP_JUKE+a.cost,'juke');
  return {ok:true,arc:a};
}
function intShift(which){
  const s=pausedShip();if(!s)return {ok:false,why:'nothing paused'};
  if(!afford(s,T.AP_SHIFT_INT))return {ok:false,why:'not enough AP'};
  shiftShield(s,which);
  pay(s,T.AP_SHIFT_INT,'shift');
  return {ok:true};
}
function intCancel(){if(S&&S.paused){ev('interrupt',{id:S.paused.id,stage:'cancel'});S.paused=null;}}
/* space.js doAction shiftF/shiftR: the segment swings to the other zone and back */
function shiftShield(s,which){const seg=s.segs[which==='R'?'R':'F'];seg.at=seg.at==='F'?'R':'F';ev('shield',{id:s.id,seg:which,at:seg.at});}
/* space.js doAction boostF/boostR, on the weaker segment */
function boostShield(s){
  if(critCount(s,'emitter')||maxShield(s)<=0)return;
  const seg=s.segs.F.val/(s.segs.F.max||1)<=s.segs.R.val/(s.segs.R.max||1)?s.segs.F:s.segs.R;
  const amt=Math.min(seg.max-seg.val,Math.ceil(0.15*maxShield(s)*(s.pilot.cun||1)));
  if(amt>0){seg.val+=amt;addFloater(s.x,s.y-36,'SHIELD +'+amt,C.shield);}
}

/* ---------- PLAN orders (the Arena's input calls these) ---------- */
function planShipOf(id){const s=byId(id);return s&&s.alive&&S.phase==='PLAN'&&!isStruct(s)?s:null;}
/* where the next move starts, and how much distance the round has left */
function planEnd(id){
  const s=byId(id);if(!s)return null;
  const arcs=s.plan2.drawn?s.plan2.arcs:[];
  return Object.assign(chainEnd(s,arcs),{left:roundMax(s)-chainLen(arcs),ap:apLeft(s)+(s.plan2.drawn?0:chainCost(s.plan2.arcs))});   // ap: what the next move may spend (an order's plan is replaced by it)
}
/* the move a drag to (px,py) would make: {arc, ok, why} (ok false when the AP is short) */
function previewMove(id,px,py){
  const s=byId(id);if(!s||S.phase!=='PLAN')return null;
  const st=planEnd(id),a=moveTo(s,st,px,py,st.left);
  if(!a)return {arc:null,ok:false,why:'no distance left this round'};
  return {arc:a,ok:st.ap>=a.cost,why:st.ap>=a.cost?'':'not enough AP',start:st};
}
const chainCost=arcs=>(arcs||[]).reduce((n,a)=>n+(a.cost||0),0);
/* release: the move is set and the next drag starts from its end. A first move replaces the order's plan. */
function addMove(id,px,py){
  const s=planShipOf(id);if(!s)return null;
  const pv=previewMove(id,px,py);
  if(!pv||!pv.arc||!pv.ok)return null;
  if(!s.plan2.drawn)s.plan2={arcs:[],drawn:true};
  s.plan2.arcs.push(pv.arc);s.goal=null;
  return pv.arc;
}
function addKturn(id){
  const s=planShipOf(id);if(!s)return null;
  const e=envOf(s),st=planEnd(id),a={len:3*SU,turn:0,k:true,type:'K',cost:T.AP_KTURN};
  if(!e.K||st.left<a.len-1e-6||st.ap<a.cost)return null;
  if(!s.plan2.drawn)s.plan2={arcs:[],drawn:true};
  s.plan2.arcs.push(a);s.goal=null;
  return a;
}
function undoMove(id){const s=planShipOf(id);if(!s||!s.plan2.drawn)return;s.plan2.arcs.pop();if(!s.plan2.arcs.length)clearPath(id);}
function clearPath(id){const s=planShipOf(id);if(!s)return;s.plan2={arcs:[],drawn:false};if(s.faction==='reb')planShip(s);}
function preview(id){
  const s=byId(id);if(!s)return null;
  const arcs=s.plan2.arcs||[];
  return {arcs,pts:sampleRun(buildRun(s,arcs,s,0,T.EXEC_LEN))};
}
function setOrder(id,order){
  const s=planShipOf(id);if(!s)return;
  s.order=order&&order.kind!=='none'?Object.assign({},order):null;
  s.plan2={arcs:[],drawn:false};planShip(s);
}
function setTarget(id,tid){const s=byId(id),t=byId(tid);if(!s||!t||t.faction===s.faction)return false;s.target=tid;if(s.order&&s.order.kind==='pursue'&&S.phase==='PLAN'){s.order.target=tid;s.plan2.drawn||planShip(s);}return true;}
/* stances cost AP for the round (evade, lock in, boost); turning one on is refused when the AP is short */
function setStance(id,k,v){
  const s=planShipOf(id);if(!s)return false;
  const cost={evade:T.AP_EVADE,lockin:T.AP_LOCKIN,boost:T.AP_BOOST}[k];
  if(cost==null)return false;
  if(v&&!s.stance[k]){
    const free=(k==='evade'&&s.stance.lockin)?T.AP_LOCKIN:(k==='lockin'&&s.stance.evade)?T.AP_EVADE:0;   // the two exclude each other
    if(apLeft(s)+free<cost)return false;
  }
  s.stance[k]=!!v;
  if(v&&k==='evade')s.stance.lockin=false;
  if(v&&k==='lockin')s.stance.evade=false;
  s.tokens.evade=s.stance.evade;
  if(!s.plan2.drawn&&s.faction==='reb')planShip(s);   // an order's plan re-fits to the AP left
  return true;
}
/* angling a shield in PLAN costs AP_SHIFT per segment away from where it started the round (swinging back refunds) */
function planShift(id,which){
  const s=planShipOf(id);if(!s)return false;
  const seg=s.segs[which==='R'?'R':'F'],back=seg.at!==s.shieldAt0[which==='R'?'R':'F'];
  if(!back&&apLeft(s)<T.AP_SHIFT)return false;
  shiftShield(s,which);
  if(!s.plan2.drawn&&s.faction==='reb')planShip(s);
  return true;
}

/* ---------- scenarios ---------- */
const ROCKS={
  open:{seed:1,clusters:[]},
  belt1:{seed:11,belt:[[1500,450],[2750,2550]],n:24,spread:280},
  scatter:{seed:7,clusters:[[1700,1900],[2450,2100],[2100,800],[3300,2300],[1200,1200]]},
  field:{seed:23,box:[1300,600,3000,2400],n:18},
};
function makeRocks(key){
  const L=ROCKS[key]||ROCKS.open,r0=UT.mulberry32(L.seed),out=[];   // a layout's own seed: the same rocks whatever the fight's seed
  const add=(cx,cy)=>{const r=55+r0()*95;const verts=[];const vn=8+Math.floor(r0()*4);for(let k=0;k<vn;k++)verts.push(0.72+r0()*0.4);
    out.push({x:UT.clamp(cx,MARGIN+r,W-MARGIN-r),y:UT.clamp(cy,MARGIN+r,H-MARGIN-r),r,verts,rot:r0()*Math.PI*2});};
  for(const [cx,cy] of L.clusters||[]){const n=3+Math.floor(r0()*4);for(let i=0;i<n;i++){const a=r0()*Math.PI*2,d=r0()*260;add(cx+Math.cos(a)*d,cy+Math.sin(a)*d);}}
  if(L.belt){const [[x0,y0],[x1,y1]]=L.belt;for(let i=0;i<L.n;i++){const k=(i+r0()*0.6)/L.n,a=r0()*Math.PI*2,d=r0()*L.spread;add(x0+(x1-x0)*k+Math.cos(a)*d,y0+(y1-y0)*k+Math.sin(a)*d);}}
  if(L.box){const [bx0,by0,bx1,by1]=L.box;for(let i=0;i<L.n;i++)add(bx0+r0()*(bx1-bx0),by0+r0()*(by1-by0));}
  return out;
}
function presetPilot(spec,fallbackName){
  spec=spec||{};
  if(spec.id&&SRDB.pilots[spec.id])return mkPilot(dbPilot(spec.id,{first:(spec.first||SRDB.pilots[spec.id].name).toUpperCase()}));
  const P=Object.assign({},PRESETS[spec.preset||'regular']||PRESETS.regular,spec);
  return mkPilot({pname:spec.name||fallbackName,first:(spec.name||fallbackName).toUpperCase(),who:null,preset:spec.preset||'regular',
    skills:{aim:P.aim,cunning:P.cunning,focus:P.focus,presence:P.presence},cool:P.presence*2,level:P.level,init:P.initiative,
    tr:(P.traits||'').split('|').filter(Boolean).map(k=>({k})),nv:1,mans:(P.mans||[]).slice()});
}
function formation(at,i,n){const [x,y,h]=at,px=-Math.sin(h),py=Math.cos(h),o=(i-(n-1)/2)*170,back=Math.abs(i-(n-1)/2)*60;return [x+px*o-Math.cos(h)*back,y+py*o-Math.sin(h)*back,h];}
function resolveScenario(scn,vi){
  const v=(scn.variants&&scn.variants[vi])||null;
  const out=Object.assign({},scn,v||{});
  out.tune=Object.assign({},scn.tune||{},(v&&v.tune)||{});
  out.variantLabel=v?v.label:null;
  return out;
}
let globalPrefs={};
try{globalPrefs=JSON.parse(localStorage.getItem(PREF_KEY))||{};}catch(e){globalPrefs={};}
function load(scn,opts){
  opts=opts||{};
  const R=resolveScenario(scn,opts.variant||0);
  S=newSim();
  S.scen=scn;S.variant=opts.variant||0;S.variantLabel=R.variantLabel;
  S.seed=opts.seed==null?1:opts.seed>>>0;
  rng=UT.mulberry32(S.seed);
  for(const k in T)delete T[k];
  Object.assign(T,DEFAULTS,globalPrefs.tune||{},R.tune||{});
  for(const k in DOC_OFF)delete DOC_OFF[k];
  Object.assign(DOC_OFF,globalPrefs.docOff||{});
  S.rocks=makeRocks(R.rocks||'open');
  // the player's flight
  const pl=R.player||[];
  pl.forEach((p,i)=>{
    const at=p.at||formation(R.playerAt||[700,H*0.62,-0.35],i,pl.length);
    const c=CLS[p.cls]||CLS.talon,nm=p.name||('Fox '+(i+1));
    const sh=mkShip('P'+(i+1),nm,p.cls||'talon','reb',at[0],at[1],at[2],presetPilot(p.pilot,nm),p.loadout);
    if(p.order)sh.order=Object.assign({},p.order);
    sh.vel=Math.round((c.minSpd+c.maxSpd)/2)*SU/T.SEG_TIME;
    S.ships.push(sh);
  });
  // the enemy flights
  let eN=0;
  (R.enemies||[]).forEach((e,fi)=>{
    const n=e.id?1:(T.ENEMY_N>0?T.ENEMY_N:(e.n||1));
    const row=Enemies.space(e.type);
    for(let i=0;i<n;i++){
      eN++;
      const at=e.at&&n===1?e.at:formation(e.at||[W-800,H*0.38,Math.PI-0.35],i,n);
      const id=e.id&&n===1?e.id:'E'+eN;
      const label=CLS[row.ship].label.split(' ').pop();
      const extra={first:label.toUpperCase()+'-'+eN};
      const pid=e.pilot||row.pilot;
      const pilot=e.preset?presetPilot({preset:e.preset},label+' '+eN):mkPilot(dbPilot(pid,Object.assign({mans:row.maneuvers?row.maneuvers.split('|'):[]},extra)));
      const sh=mkShip(id,e.name||(label+' '+eN),row.ship,'heg',at[0],at[1],at[2],pilot,e.loadout);
      if(row.nerve_cap!=null)sh.pilot.coolCap=row.nerve_cap;
      Object.assign(sh,{type:e.type,lead:row.lead,flees:e.flees!=null?e.flees:row.flees,calls:null,clamps:false});
      sh.doctrine=isStruct(sh)?null:(e.doctrine||'pursuit');
      sh.flight='f'+fi;sh.asset=e.asset||null;
      sh.vel=Math.round((CLS[row.ship].minSpd+CLS[row.ship].maxSpd)/2)*SU/T.SEG_TIME;
      S.ships.push(sh);
    }
  });
  for(const k in DOCTRINES){const D=DOCTRINES[k];if(D.init)D.init(S.ships.filter(s=>s.doctrine===k),WAPI);}
  S.objective=R.objective||null;S.objStep=0;
  beginPlan();
  return S;
}
function spawn(spec){
  if(!S)return null;
  spec=spec||{};
  const side=spec.side==='heg'?'heg':'reb',n=S.spawnN=(S.spawnN||0)+1;   // X1, X2...: ids never reused after a despawn
  let sh;
  if(side==='heg'){
    const row=Enemies.space(spec.type||'vc-mote-patrol'),label=CLS[row.ship].label.split(' ').pop();
    sh=mkShip('X'+n,label+' X'+n,row.ship,'heg',spec.x||W/2,spec.y||H/2,spec.h||Math.PI,presetPilot({preset:spec.preset||'regular'},label+' X'+n));
    Object.assign(sh,{type:spec.type||'vc-mote-patrol',lead:false,flees:row.flees});
    sh.doctrine=isStruct(sh)?null:(spec.doctrine||'pursuit');sh.flight='x'+n;
  } else {
    const nm=spec.name||('Fox X'+n);
    sh=mkShip('X'+n,nm,spec.cls||'talon','reb',spec.x||W/2,spec.y||H/2,spec.h||0,presetPilot({preset:spec.preset||'regular'},nm));
  }
  sh.anchor={x:sh.x,y:sh.y};sh.ap=freshAp(sh);sh.shieldAt0={F:sh.segs.F.at,R:sh.segs.R.at};
  S.ships.push(sh);
  if(sh.doctrine&&DOCTRINES[sh.doctrine]&&DOCTRINES[sh.doctrine].init&&sh.doctrine!=='wingman')DOCTRINES[sh.doctrine].init([sh],WAPI);
  if(sh.doctrine==='wingman')sh.doc={role:'lead',mate:null};
  if(S.phase==='PLAN'&&side==='reb'){const t=nearestFoe(sh);sh.target=t?t.id:null;planShip(sh);}
  return sh;
}
function despawn(id){if(!S)return;const i=S.ships.findIndex(s=>s.id===id);if(i>=0)S.ships.splice(i,1);}
function possess(id,px,py){return addMove(id,px,py);}   // stage an enemy's next turn with the player's own move tools

/* ---------- tuning access (the panel and the tests) ---------- */
function setTune(k,v){if(!(k in DEFAULTS))return;T[k]=+v;globalPrefs.tune=Object.assign({},globalPrefs.tune||{},{[k]:+v});savePrefs();}
function setDoctrineOn(k,on){if(on)delete DOC_OFF[k];else DOC_OFF[k]=true;globalPrefs.docOff=Object.assign({},DOC_OFF);savePrefs();}
function resetTune(){globalPrefs={};savePrefs();Object.assign(T,DEFAULTS);for(const k in DOC_OFF)delete DOC_OFF[k];}
function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(globalPrefs));}catch(e){}}
/* the end state as one number: positions, hull and nerve (the determinism test) */
function hash(){
  if(!S)return 0;
  return UT.hashStr(S.ships.map(s=>[s.id,s.x.toFixed(2),s.y.toFixed(2),s.h.toFixed(4),s.hull,s.arm,s.segs.F.val,s.segs.R.val,s.pilot.cool,s.alive?1:0].join(',')).join('|'));
}
function drain(){if(!S)return [];const e=S.events;S.events=[];return e;}

return {
  get S(){return S;},T,DEFAULTS,PRESETS,DOCTRINES,DOC_OFF,ORDERS,CLS,WDEF,CRITDEFS,W,H,MARGIN,RU,SU,ARCH,LOCK_RNG,LOCK_ARC,
  load,go,advance,tick,runExec,runUntil,drain,hash,spawn,despawn,possess,
  previewMove,addMove,addKturn,undoMove,planEnd,clearPath,preview,setOrder,setTarget,setStance,planShift,apLeft,apPlanned,apMax,
  interrupt,canInterrupt,canSnap,intSnap,intJuke,intShift,intCancel,previewJuke,pausedShip,
  addDoctrine,setTune,setDoctrineOn,resetTune,segsPerExec,WPN_CD,WAPI,verbCost,
  setRng:f=>{rng=f;},
  // the copied maths, for tests and the Arena's read-outs
  fn:{dialAvail,maxSpeedOf,coolState,adjCool,computeTN,computeATK,validShot,bestWeaponFor,applyDamage,fitGoal,buildRun,poseAt,envOf,maxAng,classify,moveTo,arcToPoint,arcFn,roundMax,roundMin,chainEnd,
    sampleRun,manPath,clampEnd,arcEnd,inArc,inLockZone,bearing,dist,totalShield,maxShield,zoneShield,critCount,isStruct,isDrone,threatTo,objState,
    resolveAttack,pickShot,kill:id=>{const t=byId(id);if(t&&t.alive)destroyShip(t,null);}},
  // getters for every tunable (the SALVAGE_PER_HP_ pattern)
  TICK_:()=>T.TICK,EXEC_LEN_:()=>T.EXEC_LEN,SIM_SPEED_:()=>T.SIM_SPEED,SEG_TIME_:()=>T.SEG_TIME,PATH_SEGS_:()=>T.PATH_SEGS,
  STRAIGHT_TOL_:()=>T.STRAIGHT_TOL,AP_BASE_:()=>T.AP_BASE,COOL_AP_:()=>T.COOL_AP,AP_SNAP_:()=>T.AP_SNAP,AP_JUKE_:()=>T.AP_JUKE,AP_SHIFT_INT_:()=>T.AP_SHIFT_INT,LOCK_TIME_:()=>T.LOCK_TIME,CALM_GAIN_:()=>T.CALM_GAIN,
  SNAP_BONUS_:()=>T.SNAP_BONUS,
  INT_FLOOR_:()=>T.INT_FLOOR,WING_FLOUNDER_:()=>T.WING_FLOUNDER,GUARD_R_:()=>T.GUARD_R,
};
})();
