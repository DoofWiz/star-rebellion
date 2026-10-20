'use strict';
/* =====================================================================
   STAR REBELLION — Arena Type 3: High Command (docs/ARENA-HC-HANDOFF.md)
   The Arena's third ruleset. The player does not fly ships: they are
   Mission Control. Ships fly themselves in real time, grouped into wings;
   the player issues each wing an order and a tactic, sets standing mission
   rules, and spends scarce command points on interventions. Pause is free.

   This file is the sim: no DOM, no drawing. game/js/arena-hc.js is its HUD
   and renderer. Nothing below the Arena chassis is shared with sim2.js or
   sim-sb.js: what this module needs from them (or from space.js through
   them) is copied, each block naming its source (copy-don't-refactor).

   Real time on a fixed step: step() advances TICK ms of sim time; the
   driver calls it as often as the timescale (0 / 0.3 / 1 / 3) asks, so a
   seed and the same orders at the same ticks replay identically however
   long the player sat paused.
   ===================================================================== */
window.SIMHC=(function(){
const Math=window.SR_DMATH;   // deterministic maths: a run computes the same in every browser and in node (det-math.js)
const TH=SR.theme,C=TH.C;
const SIM_VERSION='hc-2';   // bump in any commit that changes how the sim plays (the flight recorder's harness warns on a mismatch)

/* ---------- the world (space.js ~20: W, H, MARGIN, RU, SU), set bigger: HC_MAP × space.js's 4200 × 3000 ---------- */
const W0=4200,H0=3000,MARGIN=120,RU=300,SU=150;
let HC_MAP=16;            // the map's size × space.js's (was 2 until playtest 1, C-69; 4 until playtest 2, C-70; 8 until playtest 3, C-71; 32 until playtest 4, C-72). placeholder (each scenario may set its own)
let HC_SPREAD=4;          // how far apart a scenario's places are, × space.js's map: the layout fills this much of the middle of the map, with open space round it (C-70). placeholder
let W=W0*HC_MAP,H=H0*HC_MAP;
const TICK=50;            // ms of sim time per step (copied from sim-sb.js). placeholder
const TIMESCALES=[0,0.3,1,3];   // pause / slow / play / fast (slow and fast on the panel). placeholder
let THINK_SECS=0.5;       // how often each ship re-decides what to do. placeholder
let ROUND_SECS=3;         // a ship's top speed covers its top dial move (straight_max SU) in this long (sim-sb.js's EXEC_LEN). placeholder
let SPEED_SCALE=4;        // every craft's speed range × this (was SB's 1.25 until playtest 1, C-69; 2.5 until playtest 2, C-70). placeholder
let CRUISE=0.7;           // the speed a ship flies when nothing presses it, × its top speed. placeholder
let CONVOY_SPD=0.55;      // a convoy's speed, × its top speed. placeholder
let THRUST_K=0.7;         // thrust, × top speed a second (was 1.6 until the turn model, C-69). placeholder
let BOOST_MULT=1.6;       // a boosting ship's top speed ×. placeholder
let ENGAGE_FRAC=1;        // the range a ship tries to fight at, × its longest gun (the designer maxed it, C-69). placeholder
let RANGE_MULT=1;         // every weapon's range (and the lock range) × this, on the next load (SB's RANGE_MULT). placeholder
let JUMP_R=350;           // within this of the jump point (extraction) a ship jumps out. placeholder
let FORM_GAP=320;         // world units between formation slots at a tactic's spacing 1 (was 120, C-69). placeholder
let SPAWN_GAP=340;        // spacing of the ships a scenario places in a group. placeholder
const LAYOUT_MAP=2;       // the map size the scenarios are written for; they are scaled to HC_MAP

/* ---------- copied from space.js ~20–30 (via sim-sb.js) ---------- */
const ARCH=0.55;
const TURNS={L:-Math.PI/2,l:-Math.PI/4,S:0,r:Math.PI/4,R:Math.PI/2};
const LOCK_RNG=900;       // copied from space.js ~23
const CALM_GAIN=6;        // copied from space.js endRound ~1082 ('breathing room')
let NERVE_K=0.6;          // every nerve loss × this (High Command only). placeholder
let CALM_SECS=3;          // ...given each this many seconds a ship goes unhurt (a round's length under SB). placeholder

let S=null;
/* hooks for a layer over this sim (Type 3.5, docs/ARENA-HC35-HANDOFF.md §5.1; exported as SIMHC.hooks). Each one is
   absent unless a layer sets it, and absent, High Command runs exactly as before: tools/arena-smoke.js HC35 1 checks
   the hc1–hc3 hashes. classExtra{cls: row} · loadoutExtra(row, list) · think(s) → true skips · goal(s) → a goal ·
   damage(t, dmg, skipShield, fromFront, hit) → a result · canJump(s) → false blocks · canFire(s, t, q) → false blocks ·
   step(dt) · event(kind, text, o, e) · noCollide(a, b) and noAvoid(s, o) → true exempts the pair · noSep(s) → true: it
   ignores its wingmates' spacing · floater(s, text, kind) → false drops a floating word · assess(s) → its line for a job
   of the layer's own */
const HK={};
const rowOf=cls=>(HK.classExtra&&HK.classExtra[cls])||SRDB.ship(cls);

/* ---------- seeded RNG (copied from arena-sb.js mulberry) ---------- */
function mulberry(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

/* ---------- geometry: copied from sim-sb.js (itself from space.js ~372–380) ---------- */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function bearing(s,t){return Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-s.h));}
function inArc(s,t){return bearing(s,t)<=ARCH;}
function inFrontHemi(s,t){return bearing(s,t)<=Math.PI/2;}
function critCount(s,id){return s.crits.filter(c=>c===id).length;}
function maxSpeedOf(s){return Math.max(s.row.straight_min,s.row.straight_max-critCount(s,'engine'));}

/* ---------- the envelope: copied from sim-sb.js kappaOf / dialOf (momentum dropped: a flown body carries its own) ----------
   The dial's fields set what a ship can do: its speed range (straight_min/max) and its tightest turn (the slowest
   hard turn, else bank). In real time that is a speed band and a turn-rate cap of speed × curvature. */
function kappaOf(s){
  const r=s.row;let k=0;
  if(r.turn_min!=null&&!critCount(s,'controls'))k=Math.max(k,Math.abs(TURNS.R)/(r.turn_min*SU));   // Control Surfaces: no hard turns
  if(r.bank_min!=null)k=Math.max(k,Math.abs(TURNS.r)/(r.bank_min*SU));
  return k;
}
function capsOf(s){
  const sc=SU*SPEED_SCALE/ROUND_SECS,vMax=maxSpeedOf(s)*sc,kap=(kappaOf(s)||0.004)*(HC_TURN[s.row.id]||1),vc=CORNER*vMax;
  return {vMax,vMin:s.row.straight_min*sc,kap,vc,wc:vc*kap/TURN_SCALE};
}
/* turning (C-69, playtest 1): the corner-speed model. A ship turns best at its corner speed (CORNER × top speed), on
   the dial's tightest radius × TURN_SCALE. Slower, the turn weakens with the square of speed (a slow ship is a sitting
   duck); faster, it widens (turn rate falls with speed). The dial still ranks who is nimble. */
let CORNER=0.7;           // corner speed, × top speed. placeholder
let TURN_SCALE=4;         // the tightest turn, at corner speed, is the dial's radius × this. placeholder
/* a class's turn × here (C-71, playtest 3): the dial gives the Cross half a Mote's or a Talon's tightest turn, which
   under the corner-speed model left it far too slow to be useful. × 1.6 makes it turn at 80% of their rate */
const HC_TURN={'ft-4-cross':1.6};   // placeholder (the panel's "Cross turn ×")
let TURN_BLEED=1.2;       // a turn at the full corner rate costs this × top speed a second. placeholder
function turnCap(c,v){const r=v/c.vc;return v<c.vc?c.wc*r*r:c.wc/r;}

/* ---------- pilots: copied from arena-sb.js presetPilot / dbPilotOf (v2's presets) ---------- */
function presetPilot(spec,name){
  spec=spec||{};
  const PRESETS=window.SIM2.PRESETS;
  if(spec.id&&SRDB.pilots[spec.id])return dbPilotOf(spec.id,name,spec);
  const P=Object.assign({},PRESETS[spec.preset||'regular']||PRESETS.regular,spec);
  return {preset:spec.preset||'regular',pname:name,level:P.level,skills:{aim:P.aim,cunning:P.cunning,focus:P.focus,presence:P.presence},
    init:P.initiative,cool:P.presence*2,tr:(P.traits||'').split('|').filter(Boolean).map(k=>({k}))};
}
function dbPilotOf(id,name,spec){
  const r=SRDB.pilots[id];
  return {preset:(spec&&spec.preset)||null,pname:name||r.name,level:r.level,skills:{aim:r.aim,cunning:r.cunning,focus:r.focus,presence:r.presence},
    init:r.initiative,cool:r.presence*2,tr:String(r.traits||'').split('|').filter(Boolean).map(t=>{const [k,w]=t.split(':');return w?{k,with:w}:{k};})};
}
const hasTr=(s,k)=>!!(s.pilot.tr&&s.pilot.tr.some(t=>t.k===k));
/* personality (§2.3 item 4): sim2.js's doctrine AI has no per-pilot weights to copy, so a pilot's personality is read
   from their traits (reckless / brave → eager, steady / cautious / veteran → steady) and is a weight set on the
   same scoring. Placeholder table. */
const PERSONALITY={
  eager: {engage:1.25,form:0.6,disengage:0.6,stale:1.5,label:'eager'},    // over-commits: fights closer, holds formation loosely, stays in hurt, hangs on in a turning fight
  steady:{engage:1.0,form:1.4,disengage:1.0,stale:0.7,label:'steady'},    // holds formation, breaks off a bad fight sooner
  even:  {engage:1.0,form:1.0,disengage:1.0,stale:1,label:'even'},
};
function personalityOf(p){
  const has=k=>p.tr&&p.tr.some(t=>t.k===k);
  if(has('reckless')||has('brave')||has('hothead'))return 'eager';
  if(has('steady')||has('cautious')||has('veteran'))return 'steady';
  return 'even';
}

/* ---------- weapons, shields, damage, criticals: copied from sim-sb.js ~340–405 (itself from space.js ~31, ~508–560) ---------- */
function wdefOf(r){
  return {id:r.id,name:r.name,kind:r.kind,rng:r.range,skipShield:r.bypasses_shields,crit:r.crit_chance,
    needsLock:r.needs_lock,dmg:[r.damage_min,r.damage_max],ammo:r.ammo==null?undefined:r.ammo};
}
/* High Command's own stock loadouts (C-70, playtest 2): the Cross carries missiles in its empty second slot here; the
   database's stock Cross (no missiles) is unchanged, so v2, SB and the campaign are too. A scenario's loadout wins */
const HC_LOADOUT={'ft-4-cross':['bls-t-light-repeaters','missiles']};
function loadout(row,list){
  if(HK.loadoutExtra){const x=HK.loadoutExtra(row,list);if(x)return x;}
  const ids=(list||HC_LOADOUT[row.id]||[row.default_weapon_1,row.default_weapon_2]).filter(id=>id&&SRDB.weapons[id]).slice(0,row.weapon_slots||2);
  return ids.map((id,i)=>{const w=wdefOf(SRDB.weapons[id]);w.rng*=RANGE_MULT;return {key:'w'+i,w,ammo:w.ammo,cd:0};});
}
const CRITDEFS={
  engine:{name:'Secondary Engine Failure',stack:2},
  targeting:{name:'Targeting Array Damage',stack:2},
  controls:{name:'Control Surfaces Shredded',stack:1},
  emitter:{name:'Shield Emitter Fried',stack:1},
  feed:{name:'Ammo Feed Jam',stack:1},
  cockpit:{name:'Cockpit Breach',stack:1},
};
const maxShield=s=>s.segs.F.max+s.segs.R.max;
const totalShield=s=>s.segs.F.val+s.segs.R.val;
const mute=s=>s.row.kind!=='starship';
function applyDamage(t,dmg,skipShield,fromFront,hit){
  if(HK.damage){const r=HK.damage(t,dmg,skipShield,fromFront,hit);if(r)return r;}
  let rem=dmg,sd=0,ad=0,hd=0;
  const zone=fromFront?'F':'R';
  if(!skipShield){
    const keys=['F','R'].filter(k=>t.segs[k].at===zone).sort((a,b)=>(a===zone?1:0)-(b===zone?1:0));
    for(const k of keys){if(rem<=0)break;const take=Math.min(t.segs[k].val,rem);t.segs[k].val-=take;rem-=take;sd+=take;}
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
function applyCritical(s){
  if(s.struct){s.hull=Math.max(0,s.hull-4);floater(s,'TANK RUPTURE -4',C.hazard);return null;}
  const opts=applicableCrits(s);
  if(!opts.length){s.hull=Math.max(0,s.hull-2);floater(s,'STRUCTURE GRINDING -2',C.hazard);return null;}
  const id=opts[Math.floor(S.rng()*opts.length)];
  s.crits.push(id);
  if(id==='cockpit')adjCool(s,-15);
  floater(s,CRITDEFS[id].name.toUpperCase(),C.hazard);
  return id;
}
/* ---------- nerve, read as morale here: copied from sim-sb.js adjCool (space.js ~158–181) ---------- */
function adjCool(s,d){
  if(mute(s))return;
  const p=s.pilot;
  if(d<0)d*=NERVE_K;   // High Command: real time keeps a pilot under fire for longer than a round
  if(d<0&&p.nv)d=Math.round(d*p.nv);
  d=Rebel.nerveScale(d,k=>hasTr(s,k));
  p.cool=Math.max(0,Math.min(100,p.cool+d));
  if(p.coolCap)p.cool=Math.min(p.coolCap,p.cool);
  if(critCount(s,'cockpit'))p.cool=Math.min(60,p.cool);
}

/* ---------- the hull, intersection and impact: copied from sim-sb.js ~419–449 ---------- */
let HULL_LEN=22,HULL_WID=10,SHIP_SCALE=1.35;   // copied from sim-sb.js (placeholders there)
function hullAxes(s){const v=SRDB.visualSize(s.row.size)*SHIP_SCALE*(s.row.hitK||1),k=s.evadeT&&S.t<s.evadeT?Math.SQRT1_2:1;return {a:HULL_LEN*v*k,b:(s.struct?HULL_LEN*v:HULL_WID*v)*k};}   // a Barrel Roll halves the profile
function hullHit(t,p0,p1){
  const {a,b}=hullAxes(t);
  const c=Math.cos(-t.h),sn=Math.sin(-t.h);
  const lx0=(p0.x-t.x)*c-(p0.y-t.y)*sn,ly0=(p0.x-t.x)*sn+(p0.y-t.y)*c;
  const lx1=(p1.x-t.x)*c-(p1.y-t.y)*sn,ly1=(p1.y-t.y)*c+(p1.x-t.x)*sn;
  const k=a/b,X0=lx0,Y0=ly0*k,DX=lx1-lx0,DY=(ly1-ly0)*k;
  const A2=DX*DX+DY*DY,B2=2*(X0*DX+Y0*DY),C2=X0*X0+Y0*Y0-a*a;
  if(A2<1e-9)return null;
  const disc=B2*B2-4*A2*C2;if(disc<0)return null;
  const sq=Math.sqrt(disc);let u=(-B2-sq)/(2*A2);
  if(u<0||u>1){if(C2<0)u=0;else return null;}
  const hx=lx0+(lx1-lx0)*u,hy=ly0+(ly1-ly0)*u;
  let nx=hx/(a*a),ny=hy/(b*b);const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  const cw=Math.cos(t.h),sw=Math.sin(t.h);
  return {u,x:t.x+hx*cw-hy*sw,y:t.y+hx*sw+hy*cw,nx:nx*cw-ny*sw,ny:nx*sw+ny*cw};
}
let IMPACT_MIN=0.2;       // copied from sim-sb.js. placeholder
function impactOf(vx,vy,hit){const vl=Math.hypot(vx,vy)||1;return IMPACT_MIN+(1-IMPACT_MIN)*Math.max(0,-(vx*hit.nx+vy*hit.ny)/vl);}
function rockHit(a,b){   // copied from sim-sb.js (space.js losBlocked ~382, as a segment test)
  for(const r of S.rocks){
    const dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy;if(L2<1)continue;
    let t=((r.x-a.x)*dx+(r.y-a.y)*dy)/L2;t=Math.max(0,Math.min(1,t));
    if(Math.hypot(r.x-(a.x+dx*t),r.y-(a.y+dy*t))<r.r*0.85)return true;
  }
  return false;
}

/* ---------- guns: copied from sim-sb.js ~270–640 (streams of bolts, spread, lock as a dial, missiles) ---------- */
let BURST_N=8,BURST_EVERY=0.75,BURST_GAP=0.06,GUN_DPS=0.5,MISSILE_EVERY=2.0;   // copied placeholders (C-65)
let PROJ_SPD=2000,SPREAD_BASE=6,RANGE_SPREAD=3,SPREAD_AIM_K=0.1,SPREAD_NERVE_K=1.5,SPREAD_CRIT=3;
let MISSILE_LOCK=0.6,MISSILE_MINR=1.5,MISSILE_SPD=800,MISSILE_TURN=2.4,LOCK_GAIN=0.4,LOCK_DECAY=0.5,LOCK_DMG_MAX=1.0,CRIT_DIRECT=0.10;
const CRIT_REF=0.25,KIND_SPD={plasma:1,laser:1,ballistic:1.25};
const shotShare=()=>GUN_DPS*BURST_EVERY/Math.max(1,BURST_N);
const projSpd=w=>PROJ_SPD*(KIND_SPD[w&&w.kind]||1)*(w&&w.spdK||1);   // a layer's weapon may be slower (Type 3.5's plasma)
const PROJ_OF={'bls-t-light-repeaters':'repeaters','missiles':'missiles','door-mounted-gun':'doorgun','pursuer-pulse-cannon':'cruiser',
  'sentry-pulse-emitter':'dronegun','monitor-pulse-emitter':'dronegun','clamper-pulse-emitter':'dronegun'};
const gunRange=s=>Math.max(300,...s.wpns.map(q=>q.w.rng));
function lockOf(s,id){return (s.locks&&s.locks[id])||0;}
/* the lock (C-70, playtest 2; was sim-sb.js's lock as a dial). A ship with missiles locks its target while it holds it
   inside LOCK_CONE of its nose and inside missile range, clear of rocks: the lock fills in about 1 / LOCK_RATE s
   (an ace's a little faster), and falls away at LOCK_LOSS a second once it slips out. At MISSILE_LOCK a missile can
   go; a fuller lock still hits harder (LOCK_DMG_MAX). Ships without missiles don't lock. */
let LOCK_CONE=0.75;       // the seeker's half-angle, radians (the guns' arc is 0.55). placeholder
let LOCK_RATE=1.1;        // lock gained a second, dead ahead (a full lock in under a second). placeholder
let LOCK_LOSS=1.4;        // lock lost a second out of the cone. placeholder
let MIS_RANGE_K=1.6;      // a missile's reach and the lock range, × the missile's listed range. placeholder
let MIS_SPD_K=13;         // a missile's speed, in dial units a round (a Talon's top is 5): 2,600 a second at speed 4. placeholder
let MIS_TURN=6;           // a missile's turn, radians a second. placeholder
let MIS_BREAK_T=1.1;      // a target breaks hard when a missile is this many seconds out. placeholder
let MIS_SHAKE=1;          // the chance a break shakes a missile, × the lock it was fired without (40% at a 60% lock). placeholder
let MIS_LIFE=6;           // a missile explodes this long after launch, hit or not (C-72). placeholder
let MIS_ARM_SECS=10;      // MANUAL: a missile you arm fires at the next lock within this. placeholder
const misWpn=s=>s.wpns.find(q=>q.w.needsLock&&(q.ammo===undefined||q.ammo>0))||null;
const misRange=q=>q.w.rng*MIS_RANGE_K;
const misSpd=()=>MIS_SPD_K*SU*SPEED_SCALE/ROUND_SECS;
/* every ship locks since C-72 (playtest 4): a ship with missiles out to missile reach, any other out to LOCK_GUN_K ×
   its gun reach. A lock tightens the guns' spread (LOCK_AIM at a full lock); the damage bonus is the missiles' alone */
let LOCK_GUN_K=1.3;       // a lock's reach without missiles, × gun reach. placeholder
let LOCK_AIM=0.6;         // a full lock takes this share off the guns' spread. placeholder
function lockRange(s){const q=misWpn(s);return q?misRange(q):gunRange(s)*LOCK_GUN_K;}
function lockTarget(s,R){   // its target if it has one, else the hostile nearest its nose in the cone
  const t=byId(s.fireAt);
  if(t&&t.alive)return t;
  let best=null,bb=LOCK_CONE;
  for(const o of foesOf(s)){const b=bearing(s,o);if(b<bb&&dist(s,o)<=R){bb=b;best=o;}}
  return best;
}
function lockTick(s,dt){
  const R=lockRange(s),t=lockTarget(s,R);
  if(t&&t.alive&&bearing(s,t)<=LOCK_CONE&&dist(s,t)<=R&&!rockHit(s,t)){
    const ace=1+0.04*aimBonus(s),c=1-0.4*bearing(s,t)/LOCK_CONE;
    s.locks[t.id]=Math.min(1,lockOf(s,t.id)+LOCK_RATE*ace*c*dt);s.lockOn=t.id;
    for(const id in s.locks)if(id!==t.id)s.locks[id]=Math.max(0,s.locks[id]-LOCK_LOSS*dt);
  } else s.lockOn=null;
  for(const id in s.locks){
    const x=byId(id);
    if(!x||!x.alive){delete s.locks[id];continue;}
    if(s.lockOn!==id&&(bearing(s,x)>LOCK_CONE||dist(s,x)>R))s.locks[id]=Math.max(0,s.locks[id]-LOCK_LOSS*dt);
    if(s.locks[id]<=0)delete s.locks[id];
  }
}
/* the missile a ship could fire now: a lock of MISSILE_LOCK on a target in range and past the minimum */
function missileShot(s){
  const q=misWpn(s);if(!q||s.holdFire||q.cd>0||critCount(s,'feed'))return null;
  const t=byId(s.lockOn);if(!t||!t.alive)return null;
  if(HK.canFire&&HK.canFire(s,t,q)===false)return null;
  const d=dist(s,t);
  return lockOf(s,t.id)>=MISSILE_LOCK&&d<=misRange(q)&&d>=MISSILE_MINR*RU?{q,t}:null;
}
function fireMissile(s,q,t){
  q.ammo--;q.cd=MISSILE_EVERY;s.st.missiles++;
  S.missiles.push({x:s.x,y:s.y,px:s.px,py:s.py,h:s.h,owner:s.id,faction:s.faction,target:t.id,w:q.w,lock:lockOf(s,t.id),life:MIS_LIFE,trail:[],id:++S.misN});
  pushEvent('missile',s.name+' fires a missile at '+(t.label||t.name),{ship:s.faction==='reb'?s.id:t.id,x:s.x,y:s.y,tone:s.faction==='reb'?'info':'hazard'});
  floater(s,'FOX',C.psi);
  if(s.faction==='reb')say(s,pickLine(s,'fox'),'info',true);
}
/* the Missile ability's doctrine, every step (a lock can come and go inside one think): AUTO fires on a lock, EMERG
   only when the pilot is pinned or hurt, MANUAL only once you arm it */
function missileDoctrine(s){
  const shot=missileShot(s);if(!shot)return;
  const doc=(s.doct&&s.doct.missile)||'AUTO';
  const tr=abilityTriggers(s,'missile');
  const go=doc==='MANUAL'?(s.misArm||0)>S.t:doc==='EMERG'?tr.emerg:true;
  if(!go)return;
  if(doc==='MANUAL')s.misArm=0;
  fireMissile(s,shot.q,shot.t);
  (s.abLog=s.abLog||[]).push({k:'missile',t:+S.t.toFixed(2),how:doc==='MANUAL'?'manual':tr.emerg?'emerg':'want'});
}
function aimBonus(s){return SRDB.skillBonus(s.pilot.skills?s.pilot.skills.aim:0,s.pilot.level);}
function spreadOf(s,w,d,lk){
  let deg=SPREAD_BASE;
  if(w.kind!=='missile'){const ru=d/RU;if(ru>1)deg+=RANGE_SPREAD*(ru-1);}
  deg*=1/(1+SPREAD_AIM_K*aimBonus(s));
  if(!mute(s))deg*=1+SPREAD_NERVE_K*(1-s.pilot.cool/100);
  deg+=SPREAD_CRIT*critCount(s,'targeting');
  deg*=1-LOCK_AIM*Math.min(1,lk||0);   // a lock steadies the guns (C-72)
  return deg*(w.spreadK||1)*Math.PI/180;   // a layer's weapon may scatter more (Type 3.5's plasma)
}
function aimAngle(s,t,w){
  const rx=t.x-s.x,ry=t.y-s.y,vx=t.vx||0,vy=t.vy||0,V=projSpd(w);
  const a=vx*vx+vy*vy-V*V,b=2*(rx*vx+ry*vy),c=rx*rx+ry*ry;
  let tau=0;const disc=b*b-4*a*c;
  if(Math.abs(a)>1e-6&&disc>=0){const t1=(-b-Math.sqrt(disc))/(2*a),t2=(-b+Math.sqrt(disc))/(2*a);tau=Math.max(t1,t2);if(tau<0)tau=0;}
  const ang=Math.atan2(ry+vy*tau,rx+vx*tau);
  return s.h+Math.max(-ARCH,Math.min(ARCH,angNorm(ang-s.h)));
}
function canFire(s,q,t){
  if(!t||!t.alive||s.struct||s.holdFire)return false;
  if(HK.canFire&&HK.canFire(s,t,q)===false)return false;
  if(q.w.kind!=='plasma'&&critCount(s,'feed'))return false;
  if(q.ammo!==undefined&&q.ammo<=0)return false;
  const d=dist(s,t);
  if(!inArc(s,t)||d>q.w.rng)return false;
  if(q.w.needsLock)return lockOf(s,t.id)>=MISSILE_LOCK&&d>=MISSILE_MINR*RU;
  return true;
}
function fireTick(s,dt){
  for(const q of s.wpns)q.cd=Math.max(0,q.cd-dt);
  const t=byId(s.fireAt);
  for(const q of s.wpns){
    if(q.w.needsLock)continue;   // missiles go by the Missile ability's doctrine (missileDoctrine), not with the guns
    if(q.cd>0||!canFire(s,q,t))continue;
    q.cd=BURST_EVERY;
    S.bursts.push({owner:s.id,faction:s.faction,w:q.w,left:q.w.bolts||BURST_N,next:0,target:t.id,fired:0,hits:0,live:0,hitT:{},id:++S.burstN,q});
  }
}
function muzzleAt(s,i){   // sim-sb.js muzzleAt, simplified: a bolt leaves the nose, alternating sides
  const v=SRDB.visualSize(s.row.size)*SHIP_SCALE,side=(i%2?1:-1)*HULL_WID*v*0.5,c=Math.cos(s.h),sn=Math.sin(s.h),f=HULL_LEN*v;
  return {x:s.x+f*c-side*sn,y:s.y+f*sn+side*c};
}
function emitBursts(dt){
  for(const B of S.bursts){
    if(B.left<=0)continue;
    const s=byId(B.owner),t=byId(B.target);
    if(!s||!s.alive){B.left=0;continue;}
    B.next-=dt;
    while(B.left>0&&B.next<=0){
      const tt=t&&t.alive?t:null;
      const ang=tt?aimAngle(s,tt,B.w):s.h,d=tt?dist(s,tt):B.w.rng;
      const h=ang+(S.rng()-0.5)*spreadOf(s,B.w,d,tt?lockOf(s,tt.id):0),V=projSpd(B.w),m=muzzleAt(s,B.fired);
      S.proj.push({x:m.x,y:m.y,x0:m.x,y0:m.y,vx:Math.cos(h)*V,vy:Math.sin(h)*V,owner:s.id,faction:s.faction,w:B.w,burst:B.id,life:B.w.rng/V*1.15,age:0,style:B.w.style||PROJ_OF[B.w.id]});
      B.left--;B.fired++;B.live++;s.st.shots++;B.next+=BURST_GAP;
    }
  }
}
function hitShip(t,shooterId,w,vx,vy,hit,homing,lockAt){
  const s=byId(shooterId);
  const imp=impactOf(vx,vy,hit);
  const lk=homing?(lockAt!=null?lockAt:(s?lockOf(s,t.id):0)):0;   // the lock's damage bonus is the missiles' alone (C-72: every ship locks now)
  const roll=w.dmg[0]+Math.floor(S.rng()*(w.dmg[1]-w.dmg[0]+1));
  const share=homing?1:shotShare()*(w.boltK||1),raw=roll*share*imp*(1+lk*LOCK_DMG_MAX);
  const dmg=homing?Math.max(1,Math.round(raw)):raw;
  const fromFront=(-vx*Math.cos(t.h)-vy*Math.sin(t.h))>0;
  const r=applyDamage(t,dmg,w.skipShield,fromFront,HK.damage?Object.assign({by:shooterId},hit):hit);   // a damage hook is told who fired
  if(imp>=0.8&&S.rng()<(CRIT_DIRECT+(w.crit||0))*(homing?1:share/CRIT_REF))applyCritical(t);
  t.hitT=S.t;t.lastHitBy=shooterId;
  if(s){s.st.hits++;s.st.dmg+=dmg;}
  t.dmgAcc=(t.dmgAcc||0)+(r.sd||0)+(r.ad||0)+(r.hd||0);   // what it actually took (a capital hull's guns-vs-hull cut included)
  S.fx.push({x:hit.x,y:hit.y,t0:S.t,ship:t.id,kind:r.sd>0&&r.ad+r.hd===0?'shield':'hull',h:Math.atan2(vy,vx),   // surface, style, homing, whose: for the
    surface:r.sd>0&&r.ad+r.hd===0?'shield':r.hd>0?'hull':'armour',style:PROJ_OF[w.id]||null,homing:!!homing});   // visual pass (C-73)
  if(r.sd>0){t.shFx={zone:r.zone,t:S.t};(t.zoneHitT||(t.zoneHitT={}))[r.zone]=S.t;}
  if(t.hull<=0&&t.alive)destroyShip(t,s);
  return {dmg,imp,r};
}
function projTick(dt){
  const kept=[];
  for(const p of S.proj){
    const p0={x:p.x,y:p.y},p1={x:p.x+p.vx*dt,y:p.y+p.vy*dt};
    p.age+=dt;
    let best=null,bu=2;
    for(const t of S.ships){
      if(!t.alive||t.faction===p.faction)continue;
      if(Math.abs(t.x-p0.x)>400||Math.abs(t.y-p0.y)>400)continue;   // a cheap reject before the ellipse
      const h=hullHit(t,p0,p1);
      if(h&&h.u<bu){bu=h.u;best={t,h};}
    }
    if(best&&rockHit(p0,{x:best.h.x,y:best.h.y}))best=null;
    const B=S.bursts.find(b=>b.id===p.burst);
    if(best){
      const r=hitShip(best.t,p.owner,p.w,p.vx,p.vy,best.h,false,null);
      if(B){B.hits++;B.live--;
        if(!B.hitT[best.t.id]){B.hitT[best.t.id]=1;adjCool(best.t,((r.r.ad>0||r.r.hd>0)?-12:-5)*BURST_EVERY/2);}}
      continue;
    }
    if(rockHit(p0,p1)||p.age>=p.life){if(B)B.live--;continue;}
    p.x=p1.x;p.y=p1.y;kept.push(p);
  }
  S.proj=kept;
  for(const t of S.ships)if(t.dmgAcc>0&&S.t-(t.dmgT==null?(t.dmgT=S.t):t.dmgT)>=0.35){
    if(t.alive&&SHOW_DMG)floater(t,'-'+(t.dmgAcc<10?t.dmgAcc.toFixed(1):Math.round(t.dmgAcc)),C.hazard,'dmg');   // off unless the panel asks (feedback 1, §3.3)
    t.dmgAcc=0;t.dmgT=null;
  }
  S.bursts=S.bursts.filter(B=>B.left>0||B.live>0);
}
function missileTick(dt){
  const kept=[];
  for(const m of S.missiles){
    let t=byId(m.target);
    m.life-=dt;
    // the target breaks once it is MIS_BREAK_T out: a weak lock can be shaken (MIS_SHAKE × the lock it lacks); a
    // missile that overshoots and comes round again gets another roll (C-72: missiles fly MIS_LIFE now)
    if(t&&t.alive){
      const tt=dist(m,t)/misSpd();
      if(!m.rolled&&tt<MIS_BREAK_T&&!(t.beh&&t.beh.kind==='freeze')){
        m.rolled=true;
        if(S.rng()<MIS_SHAKE*(1-m.lock)){floater(t,'SHOOK IT',C.steel);m.target=null;t=null;m.lost=true;}
      } else if(m.rolled&&tt>MIS_BREAK_T*2)m.rolled=false;
    }
    // chaff (C-72): a missile drawn off flies into the cloud and bursts there
    if(m.decoy!=null){
      const cf=S.chaff.find(c=>c.id===m.decoy);
      if(cf){const dh=angNorm(Math.atan2(cf.y-m.y,cf.x-m.x)-m.h),cap=MIS_TURN*dt;m.h+=Math.max(-cap,Math.min(cap,dh));
        if(Math.hypot(cf.x-m.x,cf.y-m.y)<misSpd()*dt*1.5){S.fx.push({x:cf.x,y:cf.y,t0:S.t,kind:'boom',size:0.5,src:'mmiss'});S.m.misChaff=(S.m.misChaff||0)+1;S.m.misMiss=(S.m.misMiss||0)+1;continue;}}
    }
    else if(t&&t.alive){const V=misSpd(),tau=Math.min(1.5,dist(m,t)/V),want=Math.atan2(t.y+(t.vy||0)*tau*0.5-m.y,t.x+(t.vx||0)*tau*0.5-m.x),dh=angNorm(want-m.h),cap=MIS_TURN*dt;m.h+=Math.max(-cap,Math.min(cap,dh));}   // leads its target a little
    const p0={x:m.x,y:m.y},p1={x:m.x+Math.cos(m.h)*misSpd()*dt,y:m.y+Math.sin(m.h)*misSpd()*dt};
    if(t&&t.alive){
      const h=hullHit(t,p0,p1);
      if(h&&!rockHit(p0,{x:h.x,y:h.y})){
        const r=hitShip(t,m.owner,m.w,p1.x-p0.x,p1.y-p0.y,h,true,m.lock);
        adjCool(t,(r.r.ad>0||r.r.hd>0)?-12:-5);
        S.fx.push({x:h.x,y:h.y,t0:S.t,kind:'boom',size:0.7,src:'mhit'});
        S.m.misHit=(S.m.misHit||0)+1;if(t.alive)floater(t,'MISSILE HIT -'+Math.round(r.dmg),C.hazard);
        continue;
      }
    }
    if(rockHit(p0,p1)||m.life<=0||(t&&!t.alive&&m.life>0.4&&(m.life=0.4),false)){S.fx.push({x:p1.x,y:p1.y,t0:S.t,kind:'boom',size:0.5,src:'mmiss'});S.m.misMiss=(S.m.misMiss||0)+1;continue;}
    m.px=m.x;m.py=m.y;m.x=p1.x;m.y=p1.y;m.trail.push({x:m.x,y:m.y});if(m.trail.length>14)m.trail.shift();
    kept.push(m);
  }
  S.missiles=kept;
}
/* chaff (C-72, playtest 4): a cloud a ship throws out behind it; every missile on its way to that ship within CHAFF_R
   takes the cloud for it (CHAFF_P of the time) and bursts in it. CHAFF_N to a sortie, CHAFF_SECS a cloud */
let CHAFF_N=2,CHAFF_R=3000,CHAFF_P=1,CHAFF_SECS=3,CHAFF_T=1.2;   // placeholders (CHAFF_T: AUTO throws it a missile this many s out)
function throwChaff(s){
  const c={id:++S.chaffN,x:s.x-Math.cos(s.vh)*60,y:s.y-Math.sin(s.vh)*60,vx:s.vx*0.25,vy:s.vy*0.25,t0:S.t,until:S.t+CHAFF_SECS,owner:s.id};
  S.chaff.push(c);s.chaffLeft=(s.chaffLeft==null?CHAFF_N:s.chaffLeft)-1;
  let n=0;
  for(const m of S.missiles)if(m.target===s.id&&dist(m,s)<=CHAFF_R&&S.rng()<CHAFF_P){m.target=null;m.decoy=c.id;n++;}
  pushEvent('chaff',s.name+' throws chaff'+(n?': '+n+' missile'+(n>1?'s':'')+' drawn off':''),{ship:s.faction==='reb'?s.id:null,x:s.x,y:s.y,tone:s.faction==='reb'?'good':'info'});
  return n;
}
function chaffTick(dt){
  for(const c of S.chaff){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=0.98;c.vy*=0.98;}
  S.chaff=S.chaff.filter(c=>c.until>S.t);
}
function destroyShip(t,killer){   // sim-sb.js destroyShip (space.js ~1026–1037), plus the feed and the wing
  t.alive=false;t.hull=Math.min(t.hull,0);t.deadT=S.t;
  S.fx.push({x:t.x,y:t.y,t0:S.t,kind:'boom',size:SRDB.visualSize(t.row.size),src:'kill'});
  floater(t,t.struct?'DESTROYED':'SPLASH',C.gold);
  if(killer&&killer.alive){killer.st.kills++;killer.killT=S.t;adjCool(killer,12);say(killer,pickLine(killer,'winning'),'good',true);}
  for(const m of S.ships){
    if(!m.alive||m.faction!==t.faction||m===t)continue;
    adjCool(m,-18);
    if(t.lead&&!mute(m)&&(!t.wing||m.wing===t.wing))adjCool(m,-45);
  }
  const mine=t.faction==='reb';
  pushEvent(mine?'loss':'kill',(mine?t.name+' is down':(killer?killer.name+' downs ':'')+t.name+(mine?'':killer?'':' is destroyed')),{x:t.x,y:t.y,ship:t.id,tone:mine?'hazard':'good'});
  if(t.wing)onWingLoss(t);
}

/* =====================================================================
   Wings (§2.2): 2–5 ships, one order, one tactic, a leader
   ===================================================================== */
/* the leader: highest level unless the scenario names one (C-66 item 9: by level, pending the meta layer) */
function pickLeader(w,named){
  const live=w.ships.map(byId).filter(s=>s&&s.alive);
  if(named){const n=live.find(s=>s.id===named);if(n)return n.id;}
  let best=null;for(const s of live)if(!best||s.pilot.level>best.pilot.level)best=s;
  return best?best.id:null;
}
function setLeader(w,id){
  for(const sid of w.ships){const s=byId(sid);if(s)s.lead=sid===id;}
  w.leader=id;
}
function onWingLoss(t){
  const w=wingOf(t.wing);if(!w)return;
  if(w.leader===t.id){w.leader=null;w.leadLostT=S.t;w.cohesion=LEAD_LOSS;}
}
let LEAD_LOSS=0.5;        // a wing's tactic works at this × while it has no leader. placeholder
let PROMOTE_SECS=8;       // seconds before the next pilot takes the lead. placeholder
function wingTick(){
  autoTick();
  for(const w of S.wings){
    if(w.leader==null&&w.leadLostT!=null&&S.t-w.leadLostT>=PROMOTE_SECS-1e-9){
      const id=pickLeader(w,null);
      if(id){setLeader(w,id);w.cohesion=1;w.leadLostT=null;pushEvent('leader',byId(id).name+' takes the lead of '+w.name,{ship:id,x:byId(id).x,y:byId(id).y,tone:'info'});}
      else w.leadLostT=null;
    }
  }
}
const wingOf=id=>S&&S.wings.find(w=>w.id===id)||null;
const wingShips=w=>w.ships.map(byId).filter(s=>s&&s.alive);

/* ---------- orders (§4.1) and tactics (§4.2) ---------- */
const ORDERS={
  attack:   {name:'Attack',   targeted:true, line:'Engage a designated target: click the objective, a ship class, or a station. Ships will attempt to attack and destroy the target.'},
  defend:   {name:'Defend',   targeted:true, line:'Guard an ally, an installation or an area: engage anything that comes for it.'},
  intercept:{name:'Intercept',targeted:true, line:'Pursue one particular enemy ship until it is down.'},
  escort:   {name:'Escort',   targeted:true, line:'Stay with an ally and protect it; engage only what threatens it.'},
  withdraw: {name:'Withdraw', targeted:false,line:'Disengage and fly for the extraction point; each ship jumps out on arrival.'},
  regroup:  {name:'Regroup',  targeted:false,line:'Rally on the leader and re-form; fire only at what crosses the guns.'},
  hold:     {name:'Hold Position',targeted:false,line:'Hold here, orbiting, and engage what comes within reach.'},
  capture:  {name:'Capture',  targeted:true, line:'Fly to a capturable objective and hold close to it until it is taken.'},
  board:    {name:'Board',    targeted:true, line:'Marine-carrying ships dock with a station or platform and board it.'},
};
const ORDER_KEYS=Object.keys(ORDERS);
const ORDERS_LIVE=ORDER_KEYS;   // every order is live (T1 built three; T2 the rest)
/* the wing tactics: each a weight set on the same scoring (placeholders, every number on the panel) */
/* (C-69, playtest 1) Every ship fights in attack runs now; a tactic shapes the runs and the formation the wing travels
   in, never a turning fight. Weights: form/space (travel formation), engage (fighting range), focus (one target for
   the wing), flank (pincer approach), screen, extend (how far a run carries past the target), pass (how close it goes
   before breaking), pursue (may sit on a slower target's tail), sync (passes together, re-forms between them),
   harass (one ship in the target's guns at a time), disengage (falls back under this hull), leash (reach) */
const HC_TACTICS={
  auto:     {name:'AUTO',           line:'The wing picks its own tactic, moment to moment: Pincer on a lone target, Tight on a station or a big ship, Screen when its charge is threatened, Defensive when hurt or outnumbered, Spread otherwise.',form:0.5,space:2,engage:1,focus:0,flank:0,screen:0,extend:1,pass:1,pursue:1,sync:0,harass:0,disengage:0.3,leash:1},
  tight:    {name:'Tight Formation',line:'Runs together: the wing makes its passes on one target in a close trail, extends together and re-forms between passes.',form:1.0,space:1.0,engage:1.0,focus:1,flank:0,screen:0,extend:1,pass:1,pursue:0,sync:1,harass:0,disengage:0.25,leash:1},
  spread:   {name:'Spread Out',     line:'Each pilot picks their own target and makes their own runs; wide spacing while travelling.',form:0.5,space:3.4,engage:1.1,focus:0,flank:0,screen:0,extend:1,pass:1,pursue:1,sync:0,harass:0,disengage:0.25,leash:1.4},
  screen:   {name:'Screen',         line:'Hang between the protected and the threat; intercept what comes through.',form:0.8,space:2.0,engage:0.9,focus:0,flank:0,screen:1,extend:0.7,pass:1,pursue:1,sync:0,harass:0,disengage:0.3,leash:0.8},
  pincer:   {name:'Pincer',         line:'Split in two and run in on the target from about 90° apart, then both extend.',form:0.4,space:2.4,engage:1.0,focus:1,flank:1,screen:0,extend:1,pass:1,pursue:0,sync:0,harass:0,disengage:0.25,leash:1.2},
  hitrun:   {name:'Hit and Run',    line:'Harass: break off early, extend long, and only one ship in the target\'s guns at a time. Low risk, low damage.',form:0.6,space:1.6,engage:1.0,focus:1,flank:0,screen:0,extend:1.8,pass:1.8,pursue:0,sync:0,harass:1,disengage:0.3,leash:1.2},
  defensive:{name:'Defensive',      line:'Stay close to the charge or the leader, take only short safe passes, and break off early when hurt.',form:1.2,space:1.4,engage:0.8,focus:1,flank:0,screen:0,extend:0.7,pass:1.3,pursue:0,sync:0,harass:0,disengage:0.5,leash:0.7},
};
const TACTIC_KEYS=Object.keys(HC_TACTICS);
const PICKABLE=TACTIC_KEYS.filter(k=>k!=='auto');
/* the attack run (C-69): RUN in at speed with the guns on it → PASS through → EXTEND out past EXTEND_K × gun reach →
   TURN back at corner speed → RUN again. A pilot who spends STALE_SECS turning without the target in its guns, or
   finds something on its six, breaks off (extends) and comes back with a fresh run */
let EXTEND_K=1.4;         // a run carries this × gun reach past the target before turning back. placeholder
let PASS_K=0.3;           // ...and breaks into its extension this × gun reach from the target. placeholder
let EXT_MAX=9;            // an extension ends after this long, whatever the distance (s). placeholder
let STALE_SECS=4;         // turning this long without the target in the guns is a stalemate: break off. placeholder
let AUTO_SECS=1,AUTO_HOLD=4;   // AUTO re-thinks the wing's tactic this often, and holds a choice at least this long (s). placeholders
let THREAT_R=1.1;         // a hostile this close (× gun range) with its guns on a ship is a threat it turns on. placeholder     // Hit and Run: seconds on a pass, seconds extending. placeholder
let ESCORT_R=2200;        // an escort engages what comes this close to its charge (at least a patrol's detection, so it moves first). placeholder

/* a tactic as this wing flies it: the leaderless wing's cohesion pulls every weight back toward a loose neutral */
function tacticOf(w){
  const key=w.tactic==='auto'?(w.autoPick||'spread'):w.tactic;
  const T=HC_TACTICS[key]||HC_TACTICS.spread,k=w.cohesion==null?1:w.cohesion;
  if(k>=1)return T;
  const N={form:0.3,space:2.5,engage:1.0,focus:0,flank:0,screen:0,sync:0,harass:0,disengage:T.disengage,leash:T.leash};
  const out=Object.assign({},T);
  for(const kk of ['form','space','engage','focus','flank','screen','sync','harass'])out[kk]=N[kk]+(T[kk]-N[kk])*k;
  return out;
}
/* AUTO (C-69): the leader picks the wing's tactic from the situation, and holds a choice AUTO_HOLD s at least */
function autoPick(w){
  const ships=wingShips(w);if(!ships.length)return 'spread';
  const lead=byId(w.leader)||ships[0],c=wingCentre(w),reach=gunRange(lead);
  const foes=S.ships.filter(t=>t.alive&&t.faction==='heg'&&!t.struct);
  const near=foes.filter(t=>dist(t,c)<reach*4);
  const hurt=ships.reduce((a,s)=>a+Math.max(0,s.hull)/s.maxHull,0)/ships.length<AUTO_HURT;
  if(hurt||near.length>=ships.length*AUTO_ODDS)return 'defensive';
  const o=w.order;
  if(o.kind==='escort'||o.kind==='defend'){const a=o.kind==='escort'?byId(o.target&&o.target.id):anchorOf(o.target);if(a&&foes.some(t=>dist(t,a)<ESCORT_R))return 'screen';}
  let t=null;
  if(o.kind==='attack'||o.kind==='intercept'||o.kind==='board'){const pool=S.ships.filter(x=>x.alive&&x.faction==='heg'&&(o.kind==='attack'?matches(o.target,x):x.id===(o.target&&o.target.id)));t=bestTarget(lead,pool,{distW:0.6});}
  if(!t)t=bestTarget(lead,near);
  if(t&&(t.struct||t.row.size>=7))return 'tight';
  if(t&&ships.length>=2&&!foes.some(x=>x!==t&&dist(x,t)<reach*1.6))return 'pincer';
  return 'spread';
}
let AUTO_HURT=0.5,AUTO_ODDS=1.5;   // AUTO goes Defensive under this average hull, or at these odds. placeholders
function autoTick(){
  for(const w of S.wings){
    if(w.tactic!=='auto')continue;
    if(w.autoT!=null&&S.t-w.autoT<AUTO_SECS-1e-9)continue;
    const want=autoPick(w);
    if(!w.autoPick||(want!==w.autoPick&&S.t-(w.autoSince||0)>=AUTO_HOLD)){if(w.autoPick&&want!==w.autoPick)S.m.autoSwitches=(S.m.autoSwitches||0)+1;w.autoPick=want;w.autoSince=S.t;}
    w.autoT=S.t;
  }
}

/* =====================================================================
   Ships
   ===================================================================== */
const keyOf=row=>String(row.legacy_keys).split('|')[0]||row.id;
function mkShip(d){
  const r=d.row;
  const s={id:d.id,name:d.name,faction:d.faction,row:r,cls:keyOf(r),struct:r.kind==='structure',x:d.x,y:d.y,h:d.h,px:d.x,py:d.y,ph:d.h,vh:d.h,vx:0,vy:0,w:0,
    pilot:d.pilot,lead:false,wing:d.wing||null,role:d.role||null,quiet:!!d.quiet,marines:!!d.marines,
    segs:{F:{val:r.shield_front,max:r.shield_front,at:'F'},R:{val:r.shield_rear,max:r.shield_rear,at:'R'}},
    arm:r.armour,hull:r.hull,maxArm:r.armour,maxHull:r.hull,crits:[],
    alive:true,jumped:false,trail:[],wpns:loadout(r,d.loadout),fireAt:null,locks:{},
    goal:null,beh:{kind:'idle'},intent:null,thinkT:0,calmT:0,hitT:-99,mv:null,mvT:0,
    st:{shots:0,hits:0,dmg:0,missiles:0,kills:0},
    doctrine:d.doctrine||null,asset:d.asset||null,home:d.home||null,to:d.to||null,flees:!!d.flees,label:d.label||null};
  if(d.stats){for(const k of ['hull','arm']){if(d.stats[k]!=null){s[k]=d.stats[k];s['max'+(k==='hull'?'Hull':'Arm')]=d.stats[k];}}}
  if(!s.struct){const c=capsOf(s);s.vx=Math.cos(s.h)*c.vMax*CRUISE;s.vy=Math.sin(s.h)*c.vMax*CRUISE;}
  s.persona=personalityOf(s.pilot);
  s.pilot.rest=s.pilot.cool;   // the nerve a pilot settles back to
  s.spawn={x:s.x,y:s.y};
  return s;
}
const byId=id=>S&&id!=null?S.ships.find(s=>s.id===id)||null:null;
const foesOf=s=>S.ships.filter(t=>t.alive&&t.faction!==s.faction&&!t.unseen);   // unseen: a layer's (Type 3.5: a boarder inside a hangar)

/* ---------- the cast from an HC scenario entry (the v2 entry shape, grouped into wings) ---------- */
function formation(at,i,n){const [x,y,h]=at,px=-Math.sin(h),py=Math.cos(h),o=(i-(n-1)/2)*SPAWN_GAP,back=Math.abs(i-(n-1)/2)*SPAWN_GAP*0.35;return [x+px*o-Math.cos(h)*back,y+py*o-Math.sin(h)*back,h];}   // copied from arena-sb.js (170 apart there)
function resolveScenario(scn,vi){   // copied from arena-sb.js
  const v=(scn.variants&&scn.variants[vi])||null;
  const out=Object.assign({},scn,v||{});
  out.variantLabel=v?v.label:null;
  return out;
}
/* the scenarios are written for a LAYOUT_MAP map; every place in one is scaled to the map it loads on, so a bigger
   map (with faster ships) keeps the same shape and the same travel times (C-69) */
/* the play area: where the scenario's layout sits (edges for waves and reinforcements are its edges, not the map's) */
let Z={x0:0,y0:0,x1:W,y1:H};
function zoneEdge(e,off){   // a point off one edge of the play area (off: outward), kept on the map
  const cx=(Z.x0+Z.x1)/2,cy=(Z.y0+Z.y1)/2,m=MARGIN+60;
  return e==='E'?{x:Math.min(W-m,Z.x1+off),y:cy}:e==='W'?{x:Math.max(m,Z.x0-off),y:cy}:e==='N'?{x:cx,y:Math.max(m,Z.y0-off)}:{x:cx,y:Math.min(H-m,Z.y1+off)};
}
function scaleLayout(R,k,ox,oy){
  ox=ox||0;oy=oy||0;
  if(k===1&&!ox&&!oy)return R;
  const P=a=>a?[a[0]*k+ox,a[1]*k+oy,a[2]]:a,X=o=>o?Object.assign({},o,{x:o.x*k+ox,y:o.y*k+oy}):o;
  const out=Object.assign({},R);
  out.wings=(R.wings||[]).map(w=>Object.assign({},w,{at:P(w.at),ships:w.ships.map(sd=>Object.assign({},sd,{at:P(sd.at)}))}));
  out.allies=(R.allies||[]).map(a=>Object.assign({},a,{at:P(a.at)}));
  out.enemies=(R.enemies||[]).map(e=>Object.assign({},e,{at:P(e.at)}));
  out.rocks=(R.rocks||[]).map(r=>Object.assign({},r,{x:r.x*k+ox,y:r.y*k+oy,r:r.r*(1+(k-1)*0.5)}));
  out.points={};for(const key in R.points||{})out.points[key]=X(R.points[key]);
  out.objectives=(R.objectives||[]).map(o=>o.at?Object.assign({},o,{at:X(o.at)}):o);
  if(R.reserves)out.reserves=Object.assign({},R.reserves,{at:P(R.reserves.at),ships:(R.reserves.ships||[]).map(sd=>Object.assign({},sd,{at:P(sd.at)}))});
  return out;
}
function build(scn,opt){
  opt=opt||{};
  const R0=resolveScenario(scn,opt.variant||0);
  // the map (HC_MAP) and the layout's spread (HC_SPREAD) are separate since C-70: the layout sits in the middle
  const sp=R0.spread||Math.min(HC_SPREAD,R0.map||HC_MAP),ms=Math.max(R0.map||HC_MAP,sp);W=Math.round(W0*ms);H=Math.round(H0*ms);
  const ox=Math.round((ms-sp)/2*W0),oy=Math.round((ms-sp)/2*H0);
  Z={x0:ox,y0:oy,x1:ox+Math.round(sp*W0),y1:oy+Math.round(sp*H0)};
  const R=scaleLayout(R0,sp/(R0.layoutMap||LAYOUT_MAP),ox,oy);
  S={scn,R,seed:opt.seed>>>0,rng:mulberry(opt.seed>>>0),t:0,tick:0,ships:[],wings:[],rocks:(R.rocks||[]).map(r=>Object.assign({},r)),
    points:JSON.parse(JSON.stringify(R.points||{})),objectives:[],events:[],evN:0,proj:[],bursts:[],missiles:[],fx:[],floaters:[],burstN:0,
    reinforce:Object.assign({secs:240,edge:'E',force:[]},R.reinforce||{},{spawned:false}),getOut:false,
    waves:(R.waves||[]).map(w=>Object.assign({},w,{spawned:false})),
    cp:R.cp!=null?R.cp:HC_CP,cpMax:R.cp!=null?R.cp:HC_CP,rules:[],over:null,
    m:{orders:0,byOrder:{},tactics:0,byTactic:{},cpSpent:0,byCommand:{},ruleTriggers:0,byRule:{},emergencies:[],alerts:[]},
    variantLabel:R.variantLabel};
  for(const r of S.rocks)if(!r.verts){const rr=mulberry(Math.round(r.x*7+r.y*13));r.verts=[];const n=8+Math.floor(rr()*4);for(let k=0;k<n;k++)r.verts.push(0.72+rr()*0.4);r.rot=rr()*Math.PI*2;}
  S.barks=[];S.barkN=0;
  S.pn=0;S.misN=0;S.chaff=[];S.chaffN=0;S.decoys=[];S.decoyN=0;S.reconUntil=0;S.reservesUsed=false;
  for(const wd of R.wings||[])addWing(wd);
  for(const a of R.allies||[]){   // quiet friendlies: not in a wing, not commandable (Convoy Lark); an installation (a station row) is yours to defend
    const row=rowOf(a.cls||'graf'),inst=row.kind==='structure';
    S.ships.push(mkShip({id:a.id,name:a.name,faction:'reb',row,x:a.at[0],y:a.at[1],h:a.at[2],pilot:presetPilot(a.pilot,a.name),role:a.role||(inst?'station':'convoy'),quiet:!inst,to:a.to,stats:a.stats,label:a.label,loadout:a.loadout||[]}));
  }
  let eN=0;
  S.grpN=0;
  for(const e of R.enemies||[])spawnEnemies(Object.assign({grp:++S.grpN},e),()=>++eN);
  S.eN=eN;
  for(const o of R.objectives||[])S.objectives.push(Object.assign({state:'live',prog:0},o));
  S.ruleN=0;
  for(const r of R.rules||[])S.rules.push({id:++S.ruleN,rule:r.rule,scope:r.scope||'all',param:r.param||null,on:true,t:0});
  for(const s of S.ships)s.thinkT=THINK_SECS;   // everyone decides on the first step
  return S;
}
function addWing(wd){
  const w={id:wd.id,name:wd.name,ships:[],leader:null,leadLostT:null,cohesion:1,
    order:Object.assign({kind:'regroup',target:null},wd.order||{}),tactic:wd.tactic||'auto',hold:null};
  wd.ships.forEach((sd,i)=>{
    S.pn++;
    const at=sd.at||formation(wd.at||[Z.x0+900,(Z.y0+Z.y1)/2,0],i,wd.ships.length);
    const row=rowOf(sd.cls||'talon')||SRDB.ship('talon'),nm=sd.name||(wd.name+' '+(i+1));
    const s=mkShip({id:sd.id||('P'+S.pn),name:nm,faction:'reb',row,x:at[0],y:at[1],h:at[2],pilot:presetPilot(sd.pilot,nm),wing:w.id,marines:sd.marines,loadout:sd.loadout,stats:sd.stats});
    s.thinkT=THINK_SECS;
    S.ships.push(s);w.ships.push(s.id);
  });
  setLeader(w,pickLeader(w,wd.leader));
  w.rally=wingCentre(w);
  S.wings.push(w);
  return w;
}
function spawnEnemies(e,nextN){
  const n=e.id?1:(e.n||1),r=HK.classExtra&&HK.classExtra[e.type]?{ship:e.type}:Enemies.space(e.type),row=rowOf(r.ship);
  const out=[];
  for(let i=0;i<n;i++){
    const k=nextN();
    const at=e.at&&n===1?e.at:formation(e.at||[Z.x1-900,Z.y0+(Z.y1-Z.y0)*0.4,Math.PI],i,n);
    const label=row.name.split(' ').pop(),nm=e.name&&n===1?e.name:(e.name||label)+' '+k;
    const pilot=e.preset?presetPilot({preset:e.preset},nm):dbPilotOf(e.pilot||r.pilot,nm);
    if(r.nerve_cap!=null)pilot.coolCap=r.nerve_cap;
    const s=mkShip({id:e.id&&n===1?e.id:'E'+k,name:nm,faction:'heg',row,x:at[0],y:at[1],h:at[2],pilot,doctrine:row.kind==='structure'?null:(e.role||'patrol'),
      asset:e.asset,home:e.home||{x:at[0],y:at[1]},flees:e.flees!=null?!!e.flees:!!r.flees,stats:e.stats,label:e.label,loadout:e.loadout});
    if(e.flagship)s.flagship=true;
    if(r.lead)s.lead=true;
    s.grp=e.grp||0;   // its squadron: one scenario entry or one wave (C-72)
    S.ships.push(s);out.push(s);
  }
  return out;
}

/* =====================================================================
   The event feed (§3.1): kills, emergencies, objective progress; each with a place to look
   ===================================================================== */
function pushEvent(kind,text,o){
  o=o||{};
  const e={id:++S.evN,t:+S.t.toFixed(2),kind,text,x:o.x!=null?o.x:null,y:o.y!=null?o.y:null,ship:o.ship||null,tone:o.tone||'info',viewed:false,opts:o.opts||null,key:o.key||null};
  S.events.push(e);if(S.events.length>200)S.events.shift();
  if(HK.event)HK.event(kind,text,o,e);
  return e;
}
/* the pilots' voices (C-69, playtest 1): a line becomes a speech bubble by the ship for 2 s (the HUD draws it). Only
   your pilots speak; each speaks at most every BARK_GAP s unless it matters (an emergency, a kill, a rule, steadying) */
let BARK_GAP=4;           // placeholder
function say(s,text,tone,urgent){
  if(!s||!s.alive||s.faction!=='reb'||s.quiet||!text)return false;
  if(!urgent&&S.t-(s.barkT==null?-99:s.barkT)<BARK_GAP)return false;
  s.barkT=S.t;
  S.barks.push({id:++S.barkN,ship:s.id,text,tone:tone||'info',t:+S.t.toFixed(2)});
  if(S.barks.length>60)S.barks.shift();
  return true;
}
function floater(s,text,col,kind){if(HK.floater&&HK.floater(s,text,kind||null)===false)return;S.floaters.push({x:s.x,y:s.y-40,text,col,kind:kind||null,id:s.id,t:S.t});if(S.floaters.length>60)S.floaters.shift();}

/* =====================================================================
   Autonomy (§2.3): every THINK_SECS each ship scores what it could do and takes the best
   ===================================================================== */
/* target scoring, copied in shape from sim-sb.js aiPickTarget (the nearest, favouring one already in the guns and
   one already hurt; sticky), weighted by the order's designation and the pilot's personality */
function scoreTarget(s,t,o){
  o=o||{};
  let sc=-dist(s,t)/1000*(o.distW||1);
  if(inArc(s,t))sc+=0.6;
  sc+=(1-Math.max(0,t.hull)/t.maxHull)*0.8;
  if(t.id===s.fireAt)sc+=0.5;
  if(o.prefer&&o.prefer(t))sc+=3;
  if(t.struct)sc-=1.5;   // a station is a target only by order
  return sc;
}
function bestTarget(s,pool,o){let b=null,bs=-1e9;for(const t of pool){const v=scoreTarget(s,t,o);if(v>bs){bs=v;b=t;}}return b;}
/* what an attack designation matches: an objective or station by id, a ship class, or one ship */
function matches(spec,t){
  if(!spec||!t.alive)return false;
  if(spec.type==='class')return t.cls===spec.cls&&!t.struct;
  return t.id===spec.id;
}
const nearPoint=(pool,p,R)=>pool.filter(t=>Math.hypot(t.x-p.x,t.y-p.y)<=R);
function extractPoint(){const p=S.points[S.R.extract||'jump'];return p||zoneEdge('W',600);}
/* where a withdrawing ship goes: the extraction point, or (while it is jammed) its wing's rally point, where it
   arrived, to wait out of the fight until the way is open (C-67 item 23) */
function withdrawPoint(s){
  const key=S.R.extract||'jump';
  if(!jammed(key))return extractPoint();
  const w=wingOf(s.wing);return (w&&w.rally)||s.spawn||extractPoint();
}
function jammed(pointKey){const j=S.R.jam;if(!j||j.point!==pointKey)return false;const b=byId(j.by);return !!(b&&b.alive);}

/* the behaviours a ship can be in: what it is doing and why (the order, a rule, an emergency, a command) */
function think(s){
  if(s.struct||!s.alive)return;
  if(HK.think){const was=s.beh;if(HK.think(s)){if(s.faction==='reb'&&!s.quiet&&s.wing&&s.beh)afterThink(s,was);return;}}   // a layer's ship still assesses, speaks and uses its abilities (feedback 1, §3.4)
  if(s.faction==='heg'){thinkEnemy(s);return;}
  if(s.quiet){thinkConvoy(s);return;}
  const w=wingOf(s.wing);if(!w)return;
  const T=tacticOf(w),P=PERSONALITY[s.persona],o=w.order;
  let beh=null;
  const stamp=b=>{if(b)b.orderT=o.t||0;return b;};
  // the ladder: an emergency (a panicking pilot) outranks a mission rule, which outranks the wing order; a command
  // (Recall, Override: T3) outranks everything
  beh=commandBehaviour(s,w);
  if(!beh)beh=panicBehaviour(s);
  if(!beh)beh=ruleBehaviour(s,w,T,P);
  if(!beh)beh=stamp(orderBehaviour(s,w,o,T,P));
  const was=s.beh;
  setBeh(s,beh);
  afterThink(s,was);
}
function afterThink(s,was){
  s.assess=(HK.assess&&HK.assess(s))||assessOf(s);   // a layer's own jobs have its own words
  // a new job is worth a word: a new target, or a change of what it is doing (rate-limited, so a furball stays quiet)
  if(s.beh!==was&&(!was||was.kind!==s.beh.kind||was.target!==s.beh.target)&&s.beh.kind!=='form'&&!s.beh.rule)say(s,s.assess,'info',false);
  abilityTick(s);
}
/* a command or a free response holds a ship until it runs out: Recall flies it out, Override holds it to its
   designation (and steady), a wingmate sent to help goes for whoever has the friend pinned */
function commandBehaviour(s,w){
  if(s.recall)return {kind:'withdraw',dest:withdrawPoint(s),why:'command: recall',hard:true};
  if(s.override&&S.t>=s.override.until)s.override=null;
  if(s.helping){
    const x=byId(s.helping.id);
    if(!x||!x.alive||S.t>=s.helping.until||!x.emerg){s.helping=null;}
    else{
      const a=bestTarget(s,pinnedBy(x).concat(x.lastHitBy&&byId(x.lastHitBy)&&byId(x.lastHitBy).alive?[byId(x.lastHitBy)]:[]),{distW:0.4});
      return a?{kind:'engage',target:a.id,why:'helping '+x.name,hard:true}:{kind:'escort',charge:x.id,why:'helping '+x.name,hard:true};
    }
  }
  if(s.override&&s.override.target){const t=byId(s.override.target);if(t&&t.alive)return {kind:'engage',target:t.id,why:'command: override',hard:true};}
  return null;
}
/* commitment: a ship that has just turned onto a target stays on it for COMMIT_SECS unless it dies, the order
   changes, or something outranks the order (a rule, an emergency, a command), so wings don't thrash between targets */
let COMMIT_SECS=2.5;      // placeholder
function setBeh(s,beh){
  const cur=s.beh;
  if(cur&&cur.kind==='engage'&&beh.kind==='engage'&&cur.target!==beh.target&&!beh.hard&&S.t-(s.engT||0)<COMMIT_SECS&&(cur.orderT===beh.orderT)){
    const t=byId(cur.target);if(t&&t.alive&&dist(s,t)<gunRange(s)*2.5)return;
  }
  if(beh.kind==='engage'&&(!cur||cur.kind!=='engage'||cur.target!==beh.target))s.engT=S.t;
  s.beh=beh;
}
/* 2. the wing order supplies the goal */
function orderBehaviour(s,w,o,T,P){
  const foes=foesOf(s);
  const combat=foes.filter(t=>!t.struct);
  const engR=gunRange(s)*1.6;
  const local=bestTarget(s,combat.filter(t=>dist(s,t)<engR));   // whatever is near
  // the "better local target": a hostile close by with its guns on this ship (or the one that just hit it)
  const threat=bestTarget(s,combat.filter(t=>dist(s,t)<gunRange(s)*THREAT_R&&(inArc(t,s)||(s.lastHitBy===t.id&&S.t-s.hitT<1.5))));
  if(o.kind==='withdraw')return {kind:'withdraw',why:'order',dest:withdrawPoint(s)};
  // the tactic's disengage: a ship hurt past its threshold falls back on the wing (a shaken pilot sooner)
  const hf=Math.max(0,s.hull)/s.maxHull,mor=moraleOf(s);
  if(hf<T.disengage*P.disengage*(mor==='SHAKEN'?SHAKEN_DISENGAGE:1)&&(o.kind==='attack'||o.kind==='intercept'||o.kind==='defend'||o.kind==='hold')&&threat)
    return {kind:'fallback',from:threat.id,why:'tactic: falling back hurt'};
  if(o.kind==='attack'){
    const pool=foes.filter(t=>matches(o.target,t));
    if(pool.length){
      // a focused wing all take the leader's target; otherwise each the best of the designation
      const lead=byId(w.leader);
      let t=null;
      if(T.focus>=0.5&&lead&&lead!==s&&lead.beh&&lead.beh.target&&pool.some(p=>p.id===lead.beh.target))t=byId(lead.beh.target);
      if(!t)t=bestTarget(s,pool,{distW:0.6});
      // a ship under close attack turns on its attacker first, unless that is the target anyway (Patriot Override
      // holds it to the designation)
      if(threat&&threat!==t&&!s.override&&(t.struct||dist(s,t)>gunRange(s)*1.2))return {kind:'engage',target:threat.id,why:'self-defence'};
      if(mor==='SHAKEN'&&!s.override&&outnumbered(s,t))return {kind:'form',why:'shaken: hangs back'};
      return {kind:'engage',target:t.id,why:'order'};
    }
    if(local)return {kind:'engage',target:local.id,why:'order: no targets left'};
    return {kind:'form',why:'order: no targets left'};
  }
  if(o.kind==='escort'){
    const ch=byId(o.target&&o.target.id);
    if(!ch||!ch.alive||ch.jumped)return local?{kind:'engage',target:local.id,why:'escort: charge gone'}:{kind:'form',why:'escort: charge gone'};
    const gb=guardBehaviour(s,w,ch,threat,ESCORT_R*(T.leash||1));if(gb)return gb;
    return {kind:'escort',charge:ch.id,why:'order'};
  }
  if(o.kind==='intercept'){
    const t=byId(o.target&&o.target.id);
    if(!t||!t.alive)return local?{kind:'engage',target:local.id,why:'order: target gone'}:{kind:'form',why:'order: target gone'};
    if(mor==='SHAKEN'&&!s.override&&outnumbered(s,t))return {kind:'form',why:'shaken: hangs back'};
    return {kind:'engage',target:t.id,why:'order',hard:true};   // an intercept never trades its target for a closer one
  }
  if(o.kind==='defend'){
    const a=anchorOf(o.target);
    if(!a)return {kind:'form',why:'order: nothing to defend'};
    const gb=guardBehaviour(s,w,a,threat,DEFEND_R*(T.leash||1));if(gb)return gb;
    return {kind:'defend',anchor:a,why:'order'};
  }
  if(o.kind==='hold'){
    if(!w.hold)w.hold=wingCentre(w);
    const t=bestTarget(s,nearPoint(combat,w.hold,HOLD_R*(T.leash||1)),{distW:0.5});
    if(t)return {kind:'engage',target:t.id,why:'hold'};
    return {kind:'hold',anchor:w.hold,why:'order'};
  }
  if(o.kind==='regroup'){
    if(threat&&inArc(s,threat))return {kind:'engage',target:threat.id,why:'self-defence'};
    return {kind:'form',why:'regroup'};
  }
  if(o.kind==='capture'){
    const k=o.target&&o.target.id,p=S.points[k];
    if(!p||p.owner==='reb')return local?{kind:'engage',target:local.id,why:'order: captured'}:{kind:'form',why:'order: captured'};
    if(threat&&dist(threat,p)<CAPTURE_R*2)return {kind:'engage',target:threat.id,why:'capture: clearing the point'};
    return {kind:'capture',point:k,anchor:p,why:'order'};
  }
  if(o.kind==='board'){
    const st=byId(o.target&&o.target.id);
    if(!st||!st.alive)return local?{kind:'engage',target:local.id,why:'order: boarded'}:{kind:'form',why:'order: boarded'};
    if(s.marines)return {kind:'board',station:st.id,anchor:st,why:'order'};
    const t=bestTarget(s,nearPoint(combat,st,ESCORT_R),{distW:0.5});   // the rest of the wing covers the boarders
    if(t)return {kind:'engage',target:t.id,why:'board: covering'};
    return {kind:'defend',anchor:st,why:'board: covering'};
  }
  return {kind:'form',why:'order'};
}
/* guarding (Defend and Escort, C-72, playtest 4): defenders watch DEFEND_WATCH out from what they guard. A hostile
   heading for it (within 60°), going for it, or already inside the guard reach is a threat, the soonest to arrive
   first. Each threat gets up to two of the wing's ships, the nearest; the rest stay on station. A defender flies to a
   point between its threat and its charge (INTERPOSE_K of the way out, kept 700 to 3,000 from the charge) and
   engages once the threat is inside its guns' reach × 1.5, or inside the guard reach. A hostile shooting at a
   defender inside the watch gets fought too (what a lure plays on) */
let DEFEND_WATCH=6000;    // placeholder
let INTERPOSE_K=0.45;     // placeholder
function guardThreats(a,foes,reach){
  const out=[];
  for(const t of foes){
    if(t.struct||!t.alive)continue;
    const d=dist(t,a);if(d>DEFEND_WATCH)continue;
    const v=Math.hypot(t.vx||0,t.vy||0),hx=(a.x-t.x)/(d||1),hy=(a.y-t.y)/(d||1),closing=v>1?((t.vx||0)*hx+(t.vy||0)*hy)/v:0;
    const going=t.beh&&t.beh.target===a.id;
    if(d<=reach||going||closing>0.5)out.push({t,eta:d/Math.max(150,v*Math.max(0.2,closing))*(going?0.7:1)});
  }
  return out.sort((x,y)=>x.eta-y.eta);
}
function guardBehaviour(s,w,a,threat,reach){
  if(!w)return null;
  if(!w.guardT||S.t-w.guardT>=0.5||w.guardA!==a){   // the wing's assignments, refreshed twice a second
    w.guardT=S.t;w.guardA=a;w.guardOf={};
    const th=guardThreats(a,foesOf(s),reach),free=wingShips(w).slice();
    for(const x of th){for(let k=0;k<2&&free.length;k++){free.sort((p,q)=>dist(p,x.t)-dist(q,x.t));w.guardOf[free.shift().id]=x.t.id;}if(!free.length)break;}
  }
  const t=byId(w.guardOf[s.id]);
  if(t&&t.alive){
    if(dist(t,a)<=reach||dist(s,t)<=gunRange(s)*1.5)return {kind:'engage',target:t.id,why:'guarding '+(a.name||'the point'),guard:a.id};
    return {kind:'interpose',target:t.id,anchor:a,why:'getting between '+(t.name)+' and '+(a.name||'the point')};
  }
  if(threat&&dist(threat,a)<DEFEND_WATCH)return {kind:'engage',target:threat.id,why:'self-defence'};
  return null;
}
/* outnumbered: the target has company (SHAKEN_ODDS or more hostiles near it): a marginal fight */
function outnumbered(s,t){return foesOf(s).filter(x=>!x.struct&&dist(x,t)<gunRange(s)*1.5).length>=SHAKEN_ODDS;}
function wingCentre(w){const l=wingShips(w);if(!l.length)return {x:W/2,y:H/2};let x=0,y=0;for(const q of l){x+=q.x;y+=q.y;}return {x:x/l.length,y:y/l.length};}
/* what a Defend designation guards: a ship (its live position), a named point, or a place */
function anchorOf(tg){
  if(!tg)return null;
  if(tg.type==='point')return S.points[tg.id]||null;
  if(tg.type==='pos')return {x:tg.x,y:tg.y};
  const s=byId(tg.id);return s&&s.alive?s:null;
}
let DEFEND_R=2000;        // a defending wing engages what comes this close to what it guards. placeholder
let HOLD_R=1800;          // a holding wing engages what comes this close to its point. placeholder
let CAPTURE_R=550;        // a capturing ship must be this close to the point. placeholder
let CAPTURE_SECS=10;      // seconds of uncontested presence to take a point. placeholder
let BOARD_R=550;          // a marine ship must be this close to the station (plus its size). placeholder
let BOARD_SECS=12;        // marine-ship seconds to board a station (two boarders take half as long). placeholder
let SHAKEN_ODDS=2;        // a SHAKEN pilot hangs back from a target with this many hostiles round it. placeholder
let SHAKEN_DISENGAGE=1.6; // ...and falls back hurt at the tactic's threshold × this. placeholder

/* =====================================================================
   Morale (§2.4): nerve, read as a ladder. STEADY is the middle; EAGER above, SHAKEN and PANICKED below
   ===================================================================== */
let MORALE_EAGER=80,MORALE_SHAKEN=45,MORALE_PANIC=25;   // nerve thresholds. placeholders
let PANIC_FLEE=0.6;       // a panicking pilot flees (else freezes) with this chance. placeholder
let STEADY_AT=35;         // a panicking pilot steadies once nerve is back above this. placeholder
function moraleOf(s){
  if(mute(s))return 'STEADY';   // drones and stations have no nerve
  const c=s.pilot.cool;
  return c>=MORALE_EAGER?'EAGER':c>=MORALE_SHAKEN?'STEADY':c>=MORALE_PANIC?'SHAKEN':'PANICKED';
}
/* a pilot who panics may flee (run from the nearest threat, guns silent) or freeze (fly straight on, slow, guns
   silent): a pilot emergency, pushed to the feed */
function moraleTick(){
  for(const s of S.ships){
    if(!s.alive||s.struct||mute(s))continue;
    const m=moraleOf(s);
    if(!s.panic&&m==='PANICKED'){
      s.panic={mode:S.rng()<PANIC_FLEE?'flee':'freeze',t0:S.t};
      if(s.faction==='reb'&&!s.quiet)raiseEmergency(s,'panic');
    } else if(s.panic&&s.pilot.cool>STEADY_AT){
      s.panic=null;
      if(s.faction==='reb'&&!s.quiet){pushEvent('steady',s.name+' steadies',{ship:s.id,x:s.x,y:s.y,tone:'good'});clearEmergency(s,'steadied');say(s,pickLine(s,'steady'),'good',true);}
    }
  }
}
function panicBehaviour(s){
  if(!s.panic||s.override)return null;
  const th=nearestThreat(s);
  return s.panic.mode==='flee'?{kind:'flee',from:th?th.id:null,why:'panic',hard:true}:{kind:'freeze',why:'panic',hard:true};
}
function nearestThreat(s){let b=null,bd=1e18;for(const t of foesOf(s)){if(t.struct)continue;const d=dist(s,t);if(d<bd){bd=d;b=t;}}return b;}
/* the emergency record: the feed entry carries the response options (T3 fills them in) */
function raiseEmergency(s,kind){
  if(s.emerg&&s.emerg.kind===kind)return;
  s.emerg={kind,t0:S.t,resp:null};
  const quote=assessOf(s);
  const e=pushEvent('emergency',s.name+(kind==='panic'?(s.panic&&s.panic.mode==='flee'?' is panicking: fleeing':' is panicking: frozen'):' is pinned')+' · "'+quote+'"',
    {ship:s.id,x:s.x,y:s.y,tone:'hazard',opts:emergencyOpts(s)});
  s.emerg.ev=e.id;
  say(s,quote,'hazard',true);
  S.m.emergencies.push({ship:s.id,kind,t:+S.t.toFixed(2),resp:null});
  S.m.alerts.push({t:S.t,ship:s.id,answered:null});
}
function clearEmergency(s,how){if(s.emerg){s.emerg=null;s.unpinT=null;}}
/* the response options for a pilot in an emergency (§3.2): the CP interventions that fit, the recommended one
   first, then the free ones (send a wingmate, ride it out) */
function emergencyOpts(s){
  if(!s||!s.alive)return [];
  const hf=s.hull/s.maxHull,sf=maxShield(s)?totalShield(s)/maxShield(s):1,panic=!!s.panic;
  let rec=panic?'override':hf<RECALL_HULL?'recall':sf<0.3&&maxShield(s)>0?'support':'override';
  const cmds=['override','recall'].concat(maxShield(s)>0?['support']:[]);
  const out=[rec].concat(cmds.filter(k=>k!==rec)).map(k=>({key:k,name:COMMANDS[k].name,cost:COMMANDS[k].cost(),rec:k===rec,ok:S.cp>=COMMANDS[k].cost()}));
  const mate=wingmateFor(s);
  out.push({key:'wingmate',name:'Send a wingmate',cost:0,free:true,ok:!!mate,why:mate?null:'no wingmate free',mate:mate?mate.name:null});
  out.push({key:'ride',name:'Ride it out',cost:0,free:true,ok:true});
  return out;
}
let RECALL_HULL=0.4;      // under this hull, Recall is the recommended response. placeholder
let PIN_CLEAR=3;          // a pinned emergency clears this long after the pin breaks. placeholder
function wingmateFor(s){
  const w=wingOf(s.wing);if(!w)return null;
  let b=null,bd=1e18;
  for(const m of wingShips(w)){if(m===s||m.emerg||m.panic||m.recall||m.helping)continue;const d=dist(m,s);if(d<bd){bd=d;b=m;}}
  return b;
}
/* a pinned pilot (PIN_N hostiles with their guns on them, and taking hits) is an emergency too */
function pinTick(){
  for(const s of S.ships){
    if(!s.alive||s.faction!=='reb'||s.quiet||s.struct)continue;
    const pinned=pinnedBy(s).length>=PIN_N&&S.t-s.hitT<2;
    if(pinned){s.unpinT=null;if(!s.emerg)raiseEmergency(s,'pinned');}
    else if(s.emerg&&s.emerg.kind==='pinned'){
      if(s.unpinT==null)s.unpinT=S.t;
      else if(S.t-s.unpinT>=PIN_CLEAR){pushEvent('steady',s.name+' is clear',{ship:s.id,x:s.x,y:s.y,tone:'good'});clearEmergency(s,'clear');}
    }
  }
}

/* =====================================================================
   Commands (§3.3, §4.4): scarce command points spent on interventions. v1 builds Override, Recall, Emergency
   Support (shields only), Recon Sweep, Decoy Signal and Abort; the rest are DESIGN OPEN stubs (C-67)
   ===================================================================== */
let CMD_COST={override:1,recall:2,reinforce:3,support:1,recon:1,scramble:2,hack:3,decoy:1,abort:0};   // placeholders
let OVERRIDE_SECS=12;     // Patriot Override holds a pilot to the designation (and steady) this long. placeholder
let OVERRIDE_COOL=55;     // ...and lifts their nerve to at least this. placeholder
let RECON_SECS=25;        // Recon Sweep shows every Hegemony intent and the reinforcements' edge this long. placeholder
let DECOY_SECS=12,DECOY_R=2500;   // Decoy Signal: how long it draws, and from how far. placeholders
let HELP_SECS=15;         // a wingmate sent to help stays on it this long at most. placeholder
const COMMANDS={
  override:{name:'Patriot Override',target:'ship',cost:()=>CMD_COST.override,line:()=>'One of your pilots steadies (nerve to '+OVERRIDE_COOL+') and holds to the wing\'s designation for '+OVERRIDE_SECS+' s, ignoring closer targets and fear.'},
  recall:{name:'Emergency Recall',target:'ship',cost:()=>CMD_COST.recall,line:()=>'Pull a ship (or a whole wing) out at full burn to the extraction point.'},
  reinforce:{name:'Reinforcement Request',target:'none',cost:()=>CMD_COST.reinforce,line:()=>'Call in the scenario\'s reserve wing at your edge.'},
  support:{name:'Emergency Support',target:'ship',cost:()=>CMD_COST.support,line:()=>'Recharge one ship\'s shields to full. (v1: shields only.)'},
  recon:{name:'Recon Sweep',target:'none',cost:()=>CMD_COST.recon,line:()=>'For '+RECON_SECS+' s, see every Hegemony pilot\'s intent and target, and where their reinforcements will come from.'},
  scramble:{name:'Comm Scramble',target:'none',cost:()=>CMD_COST.scramble,open:true,line:()=>'Jam the Hegemony\'s comms. // DESIGN OPEN: what it does to their coordination.'},
  hack:{name:'Comm Hack',target:'none',cost:()=>CMD_COST.hack,open:true,line:()=>'Feed the Hegemony false orders. // DESIGN OPEN: v2 stub.'},
  decoy:{name:'Decoy Signal',target:'point',cost:()=>CMD_COST.decoy,line:()=>'Plant a false contact on the map: Hegemony pilots within '+DECOY_R+' chase it for '+DECOY_SECS+' s.'},
  abort:{name:'Abort Mission',target:'none',cost:()=>CMD_COST.abort,line:()=>'End the mission now. Always free: the honourable way out.'},
};
const COMMAND_KEYS=Object.keys(COMMANDS);
/* why a command can't be used right now (null: it can) */
function commandRefusal(k,tg){
  const C2=COMMANDS[k];if(!C2)return 'no such command';
  if(S.over)return 'the mission is over';
  if(C2.open)return 'DESIGN OPEN: not built in v1';
  if(k==='reinforce'&&(!S.R.reserves||S.reservesUsed))return S.R.reserves?'the reserves are already in':'no reserves in this scenario';
  if(S.cp<C2.cost())return 'not enough command points';
  if(C2.target==='ship'){
    const ids=tg&&tg.wing?(wingOf(tg.wing)?wingShips(wingOf(tg.wing)).map(x=>x.id):[]):[tg&&tg.id];
    if(k==='recall'&&tg&&tg.wing)return ids.length?null:'that wing has no ships';
    const x=byId(ids[0]);if(!x||!x.alive||x.faction!=='reb'||x.quiet)return 'pick one of your ships';
    if(k==='support'&&maxShield(x)<=0)return x.name+' has no shields';
    if(k==='recall'&&x.recall)return x.name+' is already recalled';
  }
  if(C2.target==='point'&&!(tg&&tg.x!=null))return 'pick a place on the map';
  return null;
}
function command(k,tg){
  const why=commandRefusal(k,tg);if(why)return {ok:false,why};
  const cost=COMMANDS[k].cost();
  S.cp-=cost;S.m.cpSpent+=cost;S.m.byCommand[k]=(S.m.byCommand[k]||0)+1;
  answerAlert();
  const x=tg&&tg.id?byId(tg.id):null;
  if(k==='override'){
    adjCool(x,Math.max(0,OVERRIDE_COOL-x.pilot.cool));x.panic=null;
    const w=wingOf(x.wing),o=w&&w.order,t=tg.on?byId(tg.on):null;
    let des=t&&t.alive?t.id:null;
    if(!des&&o&&(o.kind==='attack'||o.kind==='intercept')){const pool=foesOf(x).filter(f=>o.kind==='intercept'?f.id===o.target.id:matches(o.target,f));const b=bestTarget(x,pool,{distW:0.6});if(b)des=b.id;}
    x.override={until:S.t+OVERRIDE_SECS,target:des};x.thinkT=THINK_SECS;
    respondLog(x,'override');
    pushEvent('command','Patriot Override: '+x.name+' holds'+(des?' on '+byId(des).name:''),{ship:x.id,x:x.x,y:x.y,tone:'info',key:k});
  } else if(k==='recall'){
    const list=tg.wing?wingShips(wingOf(tg.wing)):[x];
    for(const y of list){y.recall=true;y.boostT=Math.max(y.boostT||0,RECALL_BOOST);y.thinkT=THINK_SECS;respondLog(y,'recall');}
    pushEvent('command','Emergency Recall: '+(tg.wing?wingOf(tg.wing).name:x.name)+' pulls out',{ship:list[0].id,x:list[0].x,y:list[0].y,tone:'info',key:k});
  } else if(k==='support'){
    x.segs.F.val=x.segs.F.max;x.segs.R.val=x.segs.R.max;x.shFx={zone:'F',t:S.t};
    respondLog(x,'support');
    pushEvent('command','Emergency Support: '+x.name+'\'s shields recharged',{ship:x.id,x:x.x,y:x.y,tone:'info',key:k});
  } else if(k==='recon'){
    S.reconUntil=S.t+RECON_SECS;
    const RF=S.reinforce,f=RF.force.map(e=>(e.n||1)+' '+(e.name||e.type)).join(', ');
    const {x:ex,y:ey}=zoneEdge(RF.edge||'E',-400);
    pushEvent('command','Recon Sweep: every Hegemony intent shown'+(RF.spawned?'':'; reinforcements due from the '+({E:'east',W:'west',N:'north',S:'south'}[RF.edge])+' ('+f+')'),{tone:'info',x:ex,y:ey,key:k});
  } else if(k==='decoy'){
    S.decoys.push({x:tg.x,y:tg.y,until:S.t+DECOY_SECS,id:++S.decoyN});
    pushEvent('command','Decoy Signal planted',{x:tg.x,y:tg.y,tone:'info',key:k});
  } else if(k==='reinforce'){
    S.reservesUsed=true;addWing(S.R.reserves);
    pushEvent('command','Reinforcements: '+S.R.reserves.name+' arrives',{x:S.R.reserves.at[0],y:S.R.reserves.at[1],tone:'good',key:k});
  } else if(k==='abort'){
    endMission('abort');
  }
  return {ok:true};
}
let RECALL_BOOST=6;       // a recalled ship burns at boost this long. placeholder
function respondLog(x,how){
  if(!x||!x.emerg)return;
  const r=S.m.emergencies.slice().reverse().find(e=>e.ship===x.id&&e.resp==null);
  if(r){r.resp=how;r.after=+(S.t-r.t).toFixed(2);}
  x.emerg.resp=how;
}
function answerAlert(){const a=S.m.alerts.find(x=>x.answered==null);if(a)a.answered=+(S.t-a.t).toFixed(2);}
/* the free responses: send the nearest free wingmate to help, or let the pilot ride it out */
function respond(id,key){
  const x=byId(id);if(!x||!x.alive)return {ok:false,why:'no such ship'};
  if(key==='wingmate'){
    const m=wingmateFor(x);if(!m)return {ok:false,why:'no wingmate free'};
    m.helping={id:x.id,until:S.t+HELP_SECS};m.thinkT=THINK_SECS;
    answerAlert();respondLog(x,'wingmate');
    pushEvent('command',m.name+' goes to help '+x.name,{ship:m.id,x:m.x,y:m.y,tone:'info'});
    return {ok:true,mate:m.id};
  }
  if(key==='ride'){answerAlert();respondLog(x,'ride');return {ok:true};}
  return command(key,{id});
}

/* =====================================================================
   Abilities and doctrine (§2.3 item 4): pilots keep their abilities; the AI decides when, gated by the player's
   3-way doctrine per ability: AUTO (whenever it helps), EMERG (only under its emergency trigger), MANUAL (never
   by itself; the pilot panel's Use button)
   ===================================================================== */
const ARENA_MOVESETS={green:[],regular:['boost'],veteran:['boost','drift'],ace:['boost','drift','kturn','barrel']};   // copied from sim-sb.js
const ABILITIES={
  shields:{name:'Boost Shields',get cd(){return SHIELD_CD;},line:'Push power to the weaker shield. Auto: a shield half under 30% and hit in the last 2 s. Emergency: shields gone and still taking hits.'},
  lockin:{name:'Lock In',cd:14,line:'Breathe, focus: nerve +35. Auto: SHAKEN. Emergency: PANICKED.'},
  boost:{name:'Boost',cd:10,line:'Burn hard for 2 s. Auto: closing on a far target or getting out. Emergency: pinned and hurt.'},
  drift:{name:'Drift',cd:10,line:'Swing the nose (and guns) onto a pursuer while flying on. Auto: withdrawing with something behind. Emergency: withdrawing and hit.'},
  kturn:{name:'K-Turn',cd:12,line:'Flip end for end. Auto: something on its six. Emergency: on its six and hurt.'},
  barrel:{name:'Barrel Roll',cd:9,line:'Jink hard: half the hit profile for 1.5 s. Auto: pinned. Emergency: pinned under 40% hull.'},
  fieldrep:{name:'Field Repair',cd:25,line:'The leader patches the hull (+15%). Auto: under 60% hull. Emergency: under 30%.'},
  chaff:{name:'Chaff',cd:6,line:'Throw a chaff cloud: every missile on its way in takes the cloud for this ship. Two a sortie. Auto: a missile closing. Emergency: a missile about to hit.'},
  missile:{name:'Missile',cd:2,line:'A guided missile at a locked target (60% lock, past 450). Auto: fires on a lock. Emergency: only pinned or under half hull. Manual: press to arm it; it fires at the next lock.'},
};
const DOCTRINES=['AUTO','EMERG','MANUAL'];
function abilitiesOf(s){
  if(s.struct||mute(s))return [];
  const out=[];
  if(maxShield(s)>0)out.push('shields');
  out.push('lockin');
  if(s.wpns.some(q=>q.w.needsLock))out.push('missile');
  out.push('chaff');
  if(s.faction==='reb'&&!s.quiet){
    for(const k of (ARENA_MOVESETS[s.pilot.preset]||(s.pilot.level>=8?ARENA_MOVESETS.ace:s.pilot.level>=5?ARENA_MOVESETS.veteran:ARENA_MOVESETS.regular)))out.push(k);
    if(s.lead)out.push('fieldrep');
  }
  return out;
}
function onSix(s){return foesOf(s).find(t=>!t.struct&&inArc(t,s)&&!inFrontHemi(s,t)&&dist(s,t)<gunRange(t)*1.2)||null;}
/* the two triggers per ability: want (AUTO uses it) and emerg (EMERG and AUTO use it) */
function abilityTriggers(s,k){
  const hf=s.hull/s.maxHull,sf=maxShield(s)?totalShield(s)/maxShield(s):1,hitNow=S.t-s.hitT<1,pinned=pinnedBy(s).length>=PIN_N,mor=moraleOf(s);
  const b=s.beh||{},t=byId(b.target);
  const mis=incomingMissile(s),misT=mis?dist(mis,s)/misSpd():1e9,misFar=!!mis&&misT>=MIS_BREAK_T,misClose=!!mis&&misT<MIS_BREAK_T;
  switch(k){
    case 'shields':{const hz=['F','R'].some(z=>s.segs[z].max>0&&s.segs[z].val/s.segs[z].max<0.3&&s.zoneHitT&&s.zoneHitT[z]!=null&&S.t-s.zoneHitT[z]<2);   // a half under 30% and just hit (feedback 1, §3.2)
      return {want:hz,emerg:sf<=0.01&&hitNow};}
    case 'lockin':return {want:mor==='SHAKEN',emerg:mor==='PANICKED'};
    case 'boost':return {want:(b.kind==='engage'&&t&&dist(s,t)>gunRange(s)*2)||b.kind==='withdraw'||(s.mv==='extend'&&!!onSix(s))||misFar,emerg:(pinned&&hf<0.5)||misFar};   // C-72: boost away from a missile
    case 'drift':{const D=HK.slideDrift&&HK.slideDrift(s);
      if(D){   // a layer's drift (Type 3.5): a slide in a turning fight, to bring the guns round early; never to run
        if(b.kind!=='engage'||!t||!t.alive||t.struct)return {want:false,emerg:false};
        const off=Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-s.h)),c=capsOf(s),v=Math.hypot(s.vx,s.vy);
        return {want:dist(s,t)<gunRange(s)*D.reach&&off>D.offMin&&off<D.offMax&&v>c.vc*D.vMin,emerg:false};}
      const six=onSix(s);return {want:b.kind==='withdraw'&&!!six,emerg:b.kind==='withdraw'&&hitNow};}
    case 'kturn':{const six=onSix(s);return {want:!!six,emerg:!!six&&hf<0.5};}
    case 'barrel':return {want:pinned||misClose,emerg:(pinned&&hf<0.4)||misClose};   // C-72: jink as a missile closes
    case 'fieldrep':return {want:hf<0.6,emerg:hf<0.3};
    case 'missile':return {want:!!missileShot(s),emerg:!!missileShot(s)&&(pinned||hf<0.5)};
    case 'chaff':return {want:misT<CHAFF_T,emerg:misT<MIS_BREAK_T*0.7};
  }
  return {want:false,emerg:false};
}
function useAbility(s,k,manual){
  if(!s.alive||!abilitiesOf(s).includes(k))return {ok:false,why:'not this pilot\'s'};
  if(HK.abilityOk){const why=HK.abilityOk(s,k);if(why)return {ok:false,why};}   // a layer's say (Type 3.5: a subsystem that's down)
  if(k==='chaff'&&(s.chaffLeft!=null?s.chaffLeft:CHAFF_N)<=0)return {ok:false,why:'no chaff left'};
  if(k==='missile'){   // pressed: fire now if locked, else arm it for the next lock
    const q=misWpn(s);if(!q)return {ok:false,why:'no missiles left'};
    const shot=missileShot(s);
    if(shot){fireMissile(s,shot.q,shot.t);(s.abLog=s.abLog||[]).push({k,t:+S.t.toFixed(2),how:'manual'});return {ok:true,fired:true};}
    s.misArm=S.t+MIS_ARM_SECS;floater(s,'MISSILE ARMED',C.psi);return {ok:true,armed:true};
  }
  s.abCd=s.abCd||{};
  if((s.abCd[k]||0)>S.t)return {ok:false,why:'recharging'};
  s.abCd[k]=S.t+ABILITIES[k].cd;
  if(k==='shields'){const z=s.segs.F.val<=s.segs.R.val?'F':'R',seg=s.segs[z];seg.val=Math.min(seg.max,seg.val+Math.ceil(0.15*maxShield(s)));s.shFx={zone:z,t:S.t};}
  else if(k==='lockin')adjCool(s,35);
  else if(k==='boost')s.boostT=2;
  else if(k==='drift'){const D=HK.slideDrift&&HK.slideDrift(s);
    if(D){s.driftT=S.t+D.secs;s.driftAt=s.beh&&s.beh.target||null;s.abCd[k]=S.t+D.cd;}else s.driftT=S.t+3;}
  else if(k==='kturn'){const sp=Math.hypot(s.vx,s.vy)*0.5;s.vh=angNorm(s.vh+Math.PI);s.vx=Math.cos(s.vh)*sp;s.vy=Math.sin(s.vh)*sp;}
  else if(k==='barrel')s.evadeT=S.t+1.5;
  else if(k==='fieldrep')s.hull=Math.min(s.maxHull,s.hull+Math.ceil(0.15*s.maxHull));
  else if(k==='chaff')throwChaff(s);
  (s.abLog=s.abLog||[]).push({k,t:+S.t.toFixed(2),how:manual?'manual':s.abWhy||'auto'});
  if(k!=='shields')floater(s,ABILITIES[k].name.toUpperCase(),C.shield);   // Boost Shields shows as the shield's refill (feedback 1, §3.3)
  return {ok:true};
}
function abilityTick(s){
  for(const k of abilitiesOf(s)){
    if(k==='missile')continue;   // missileDoctrine, every step
    const doc=(s.doct&&s.doct[k])||'AUTO';
    if(doc==='MANUAL')continue;
    if(((s.abCd&&s.abCd[k])||0)>S.t)continue;
    const tr=abilityTriggers(s,k);
    const go=doc==='EMERG'?tr.emerg:(tr.want||tr.emerg);
    if(go){s.abWhy=tr.emerg?'emerg':'want';useAbility(s,k,false);s.abWhy=null;}
  }
}
function setDoctrine(id,k,doc){
  const s=byId(id);if(!s||!DOCTRINES.includes(doc)||!abilitiesOf(s).includes(k))return {ok:false};
  (s.doct=s.doct||{})[k]=doc;return {ok:true};
}

/* =====================================================================
   Mission rules (§4.3): standing interrupts, scoped ALL or one wing; each outranks the wing order
   ===================================================================== */
const RULES={
  preservation:{name:'Preservation Order',short:'PRESERVATION',line:()=>'Any ship under '+Math.round(PRES_HULL*100)+'% hull withdraws to the extraction point and jumps.'},
  guardian:{name:'Guardian Directive',short:'GUARDIAN',line:()=>'When a friendly objective (a convoy, a station you hold) is attacked, intercept the attacker.'},
  formation:{name:'Formation Discipline',short:'FORMATION',line:()=>'When a target escapes past '+ESCAPE_K+'× gun range, break off and return to formation.'},
  bringdown:{name:'Bring It Down Tasking',short:'BRING IT DOWN',line:()=>'Once the enemy flagship is disabled (under '+Math.round(BRING_HULL*100)+'% hull or crippled), every ship focuses fire on it.'},
  saviour:{name:'Saviour Protocol',short:'SAVIOUR',needs:'ship',line:()=>'When the named friendly falls under '+Math.round(SAVIOUR_HULL*100)+'% hull, go to its rescue: intercept its attacker.'},
};
const RULE_KEYS=Object.keys(RULES);
let PRES_HULL=0.3;        // Preservation Order's hull threshold. placeholder
let GUARDIAN_SECS=2;      // an objective hit this recently counts as attacked. placeholder
let GUARDIAN_R=6000;      // ...and its attacker is intercepted if this close. placeholder
let ESCAPE_K=2.2;         // Formation Discipline: a target this far (× gun range) has escaped. placeholder
let FORM_SECS=5;          // ...and the ship stays in formation this long. placeholder
let BRING_HULL=0.5;       // Bring It Down: a flagship under this hull (or crippled) is disabled. placeholder
let SAVIOUR_HULL=0.3;     // Saviour Protocol: the named friendly is critical under this hull. placeholder
function ruleLabel(r){
  const R=RULES[r.rule];
  let t=R.short;
  if(r.rule==='preservation')t+=' '+Math.round(PRES_HULL*100)+'%';
  if(r.rule==='saviour'){const x=byId(r.param);t+=' '+(x?x.name.toUpperCase():'?');}
  const w=wingOf(r.scope);
  return t+' · '+(w?w.name.toUpperCase():'ALL');
}
function addRule(rule,scope,param){
  if(!RULES[rule])return {ok:false,why:'no such rule'};
  if(RULES[rule].needs==='ship'&&!byId(param))return {ok:false,why:'name a friendly ship'};
  scope=scope&&wingOf(scope)?scope:'all';
  const r={id:++S.ruleN,rule,scope,param:param||null,on:true,t:S.t};
  S.rules.push(r);S.m.rulesSet=(S.m.rulesSet||0)+1;
  return {ok:true,id:r.id};
}
function removeRule(id){const i=S.rules.findIndex(r=>r.id===id);if(i<0)return {ok:false};S.rules.splice(i,1);return {ok:true};}
const rulesFor=w=>S.rules.filter(r=>r.on&&(r.scope==='all'||r.scope===w.id));
function hullRuleDue(s){
  const w=wingOf(s.wing);if(!w)return false;
  for(const r of rulesFor(w)){
    if(r.rule==='preservation'&&s.hull/s.maxHull<PRES_HULL&&!(s.beh&&s.beh.rule==='preservation'))return true;
    if(r.rule==='saviour'){const x=byId(r.param);if(x&&x.alive&&x!==s&&x.hull/x.maxHull<SAVIOUR_HULL&&!(s.beh&&s.beh.rule))return true;}
  }
  return false;
}
function flagshipDisabled(){
  for(const t of S.ships)if(t.flagship&&t.alive&&t.faction==='heg'&&(t.hull/t.maxHull<BRING_HULL||critCount(t,'engine')||critCount(t,'controls')))return t;
  return null;
}
function friendlyObjectives(){return S.ships.filter(x=>x.alive&&x.faction==='reb'&&(x.quiet||x.struct||S.objectives.some(o=>o.kind==='protect'&&o.ship===x.id)));}
function ruleBehaviour(s,w,T,P){
  let hit=null;
  for(const k of ['preservation','saviour','guardian','bringdown','formation']){   // the order they outrank each other in
    for(const r of rulesFor(w)){
      if(r.rule!==k)continue;
      const b=ruleTry(s,r,T);
      if(b){hit={b,r};break;}
    }
    if(hit)break;
  }
  if(!hit){s.ruleOn=null;return null;}
  if(s.ruleOn!==hit.r.id){   // edge-triggered: a rule takes a ship once, then holds it
    s.ruleOn=hit.r.id;
    S.m.ruleTriggers++;S.m.byRule[hit.r.rule]=(S.m.byRule[hit.r.rule]||0)+1;
    // one line per wing and rule a moment: "Guardian Directive: Rook, Vale and Jory go for Raider 3"
    const key=hit.r.rule+'|'+s.wing+'|'+hit.b.say,L=S.lastRuleEv;
    if(L&&L.key===key&&S.t-L.t<1&&S.events.includes(L.ev)){L.names.push(s.name);L.ev.text=RULES[hit.r.rule].name+': '+listNames(L.names)+' '+plural(hit.b.say);}
    else{const ev=pushEvent('rule',RULES[hit.r.rule].name+': '+s.name+' '+hit.b.say,{ship:s.id,x:s.x,y:s.y,tone:'info'});S.lastRuleEv={key,t:S.t,ev,names:[s.name]};}
    hit.b.rule=hit.r.rule;const keep=s.beh;s.beh=hit.b;say(s,assessOf(s),'info',true);s.beh=keep;   // the pilot says it in their words
  }
  hit.b.hard=true;hit.b.rule=hit.r.rule;
  return hit.b;
}
const plural=say=>say.replace(/^(\w+)/,v=>v==='goes'?'go':v==='focuses'?'focus':v.replace(/s$/,''));
const listNames=n=>n.length<2?n[0]:n.slice(0,-1).join(', ')+' and '+n[n.length-1];
function ruleTry(s,r,T){
  if(r.rule==='preservation'){
    if(s.preserved||s.hull/s.maxHull<PRES_HULL){s.preserved=true;return {kind:'withdraw',dest:withdrawPoint(s),why:'rule: preservation',say:'pulls out ('+Math.round(Math.max(0,s.hull)/s.maxHull*100)+'% hull)'};}
    return null;
  }
  if(r.rule==='saviour'){
    const x=byId(r.param);
    if(!x||!x.alive||x===s||x.hull/x.maxHull>=SAVIOUR_HULL)return null;
    const a=byId(x.lastHitBy);
    if(a&&a.alive&&S.t-x.hitT<4)return {kind:'engage',target:a.id,why:'rule: saviour',say:'goes to '+x.name+"'s rescue"};
    return {kind:'escort',charge:x.id,why:'rule: saviour',say:'covers '+x.name};
  }
  if(r.rule==='guardian'){
    for(const x of friendlyObjectives()){
      const a=byId(x.lastHitBy);
      if(a&&a.alive&&S.t-x.hitT<=GUARDIAN_SECS&&dist(s,a)<GUARDIAN_R)return {kind:'engage',target:a.id,why:'rule: guardian',say:'goes for '+a.name+', on '+x.name};
    }
    return null;
  }
  if(r.rule==='bringdown'){
    const f=flagshipDisabled();
    if(f)return {kind:'engage',target:f.id,why:'rule: bring it down',say:'focuses fire on '+f.name};
    return null;
  }
  if(r.rule==='formation'){
    if(s.formUntil&&S.t<s.formUntil)return {kind:'form',why:'rule: formation',say:'returns to formation'};
    const b=s.beh,t=b&&b.kind==='engage'?byId(b.target):null;
    if(t&&!t.struct&&dist(s,t)>gunRange(s)*ESCAPE_K&&!(b.rule)){s.formUntil=S.t+FORM_SECS;return {kind:'form',why:'rule: formation',say:'lets '+t.name+' go and returns to formation'};}
    return null;
  }
  return null;
}

/* =====================================================================
   The pilot's voice (§2.3): a one-line assessment per state, in the pilot panel and the feed.
   [TEXT NEEDED]: placeholder lines (C-67), designer-facing until the text flow takes them.
   ===================================================================== */
const ASSESS={
  pinned:['Two on me, I can\'t shake them!','I\'m pinned, need help here!'],
  flee:['I can\'t, I\'m getting out of here!','Too much, too much, breaking off!'],
  freeze:['I can\'t move, I can\'t think...','Hands won\'t work, lead...'],
  preserve:['Hull\'s bad. Pulling out, per orders.','Bleeding air. Heading home.'],
  withdraw:['Heading for the jump.','Pulling out.'],
  winning:['Got them on the run.','That\'s one more. Who\'s next?'],
  hurt:['Taking hits, still in it.','Shields are gone, still flying.'],
  engage:['On {t}, going in.','Engaging {t}.'],
  station:['Making a run on {t}.','Lining up on {t}.'],
  escort:['Sticking with {t}.','Eyes on {t}.'],
  defend:['Watching over {t}.','Nothing gets near {t}.'],
  interpose:['{t} inbound, cutting it off.','Getting between {t} and home.'],
  hold:['Holding here.','Station kept.'],
  capture:['Working on the {t}.','Almost have the {t}.'],
  board:['Marines away!','Docking now.'],
  shaken:['Not that one, lead, there\'s too many.','I\'ll stay on your wing for this one.'],
  fallback:['Hurt, falling back on you.','Need a breather, lead.'],
  steady:['Okay. Okay, I\'m back.','Got my head back, lead.'],
  form:['On your wing.','Forming up.'],
  bump:['Whoa! Watch it!','That was close... too close.'],
  evade:['Traffic! Breaking left.','Coming through, look out!'],
  fox:['Fox two!','Missile away!'],
  missile:['Missile! Breaking!','Missile on me, going hard!'],
};
function pickLine(s,key,t){
  const bank=ASSESS[key]||ASSESS.form;let h=0;for(const ch of s.id+key)h=(h*31+ch.charCodeAt(0))>>>0;
  return bank[h%bank.length].replace('{t}',t||'it');
}
function pinnedBy(s){return foesOf(s).filter(t=>!t.struct&&inArc(t,s)&&dist(t,s)<=gunRange(t)*1.05);}
function assessOf(s){
  const b=s.beh||{},t=byId(b.target||b.charge||b.station),nm=t?(t.label||t.name):(b.anchor&&b.anchor.label)||(b.point&&S.points[b.point]&&S.points[b.point].label);
  if(s.panic)return pickLine(s,s.panic.mode);
  if(pinnedBy(s).length>=PIN_N)return pickLine(s,'pinned');
  if(b.rule==='preservation')return pickLine(s,'preserve');
  if(b.kind==='withdraw')return pickLine(s,'withdraw');
  if(b.kind==='fallback')return pickLine(s,'fallback');
  if(b.why==='shaken: hangs back')return pickLine(s,'shaken');
  if(b.kind==='engage'&&t&&t.struct)return pickLine(s,'station',nm);
  if(b.kind==='engage'&&s.st.kills&&S.t-(s.killT||-99)<8)return pickLine(s,'winning');
  if(b.kind==='engage'&&s.hull<s.maxHull*0.6)return pickLine(s,'hurt');
  if(b.kind==='engage')return pickLine(s,'engage',nm);
  if(b.kind==='escort')return pickLine(s,'escort',nm);
  if(b.kind==='defend')return pickLine(s,'defend',nm||'the point');
  if(b.kind==='interpose')return pickLine(s,'interpose',nm);
  if(b.kind==='hold')return pickLine(s,'hold');
  if(b.kind==='capture')return pickLine(s,'capture',nm);
  if(b.kind==='board')return pickLine(s,'board');
  return pickLine(s,'form');
}
let PIN_N=2;              // this many hostiles with their guns on a ship pin it. placeholder
/* Convoy Lark: flies for its destination at convoy speed; waits at the jump point while it is jammed */
function thinkConvoy(s){
  const p=S.points[s.to];if(!p){s.beh={kind:'idle'};return;}
  s.beh={kind:jammed(s.to)&&dist(s,p)<JUMP_R*2.5?'wait':'convoy',dest:p,why:jammed(s.to)?'jump point jammed':'to the jump point'};
}

/* ---------- the Hegemony: patrol, guard, hunt (sim2.js's doctrine idea: a goal per role) ---------- */
let DETECT_R=2500;        // a patrol engages what comes this close. placeholder
let GUARD_R=1200;          // a guard engages what comes this close to its asset (copied from sim2.js GUARD_R). placeholder
let LEASH_R=5000;
let RAID_TURN_R=700;      // a raider turns from the station onto a fighter this close with its guns on it. placeholder         // a patrol or guard gives up a chase this far from home. placeholder
/* the Hegemony's squadron leaders (C-72, playtest 4). Every HEG_PLAN_SECS, for each of your stations their raiders go
   for: with your fighters about it (inside DEFEND_WATCH), the raiders split. Two squadrons or more: the older lure,
   the newest strikes. One squadron of two or more: the half nearest your fighters lure, the rest strike. A lure
   flies at the nearest defender, then drags it out away from the station (and from the strikers) to LURE_DIST, and
   comes back for more. A striker holds off at STANDOFF_R on its own side until nothing of yours is within CLEAR_R of
   the station, then dives on it. With no defenders about, everyone strikes. */
let HEG_RETREAT=0.35;     // a Hegemony pilot pulls back home under this share of hull (drones don't). placeholder
let HEG_PLAN_SECS=1,LURE_DIST=5000,STANDOFF_R=6500,CLEAR_R=3000,STRIKE_WAIT=25;   // placeholders (STRIKE_WAIT: a striker dives anyway after holding off this long)
function hegPlanTick(){
  if(S.t-(S.planT==null?-99:S.planT)<HEG_PLAN_SECS)return;S.planT=S.t;
  const goals=S.ships.filter(t=>t.alive&&t.struct&&t.faction==='reb');
  const raiders=S.ships.filter(x=>x.alive&&x.faction==='heg'&&x.doctrine==='raid'&&!x.retreat);
  for(const x of raiders){x.hegRole=null;x.hegFrom=null;}
  if(!goals.length)return;
  for(const st of goals){
    const mine=raiders.filter(x=>goals.reduce((b,g)=>dist(x,g)<dist(x,b)?g:b,goals[0])===st);if(!mine.length)continue;
    const defs=S.ships.filter(y=>y.alive&&y.faction==='reb'&&!y.struct&&!y.quiet&&dist(y,st)<DEFEND_WATCH);
    // clear: none of your fighters near it is free (a fighter tangled with a lure doesn't count)
    st.hegClear=!S.ships.some(y=>y.alive&&y.faction==='reb'&&!y.struct&&!y.quiet&&dist(y,st)<CLEAR_R&&!(y.beh&&y.beh.kind==='engage'&&byId(y.beh.target)&&byId(y.beh.target).hegRole==='lure'));
    let baits=[],strikes=mine;
    if(defs.length){
      const grps=[...new Set(mine.map(x=>x.grp))].sort((a,b)=>a-b);
      if(grps.length>=2){const last=grps[grps.length-1];baits=mine.filter(x=>x.grp!==last);strikes=mine.filter(x=>x.grp===last);}
      else if(mine.length>=2){const nd=x=>Math.min(...defs.map(y=>dist(x,y))),g=mine.slice().sort((a,b)=>nd(a)-nd(b)),nb=mine.length>=3?Math.ceil(mine.length/2):1;baits=g.slice(0,nb);strikes=g.slice(nb);}
      else strikes=[];
    }
    for(const x of baits){x.hegRole='lure';x.hegFrom=st.id;}
    for(const x of strikes){x.hegRole='strike';x.hegFrom=st.id;}
    const key=[...new Set(baits.map(x=>x.grp))].join()+'/'+[...new Set(strikes.map(x=>x.grp))].join();   // a new plan: a new mix of squadrons
    if(baits.length&&strikes.length&&st.hegPlan!==key){
      st.hegPlan=key;const c=strikes.reduce((a,x)=>({x:a.x+x.x/strikes.length,y:a.y+x.y/strikes.length}),{x:0,y:0});
      pushEvent('heg','The raiders split: '+baits.length+' going for your fighters, '+strikes.length+' hanging back out of reach',{x:c.x,y:c.y,tone:'hazard'});
    }
  }
}
function thinkEnemy(s){
  const foes=foesOf(s).filter(t=>!t.struct);
  abilityTick(s);
  // preservation (C-72): a hurt pilot pulls back home and stays out of it; drones fight on
  if(!s.retreat&&!mute(s)&&s.hull/s.maxHull<HEG_RETREAT){s.retreat=true;pushEvent('heg',s.name+' pulls back, hurt',{ship:null,x:s.x,y:s.y,tone:'good'});}
  const dc=S.decoys.find(d=>Math.hypot(d.x-s.x,d.y-s.y)<DECOY_R);
  if(dc&&!s.panic){setBeh(s,{kind:'decoyed',dest:{x:dc.x,y:dc.y},why:'decoy',hard:true});return;}
  if(s.panic){const th=nearestThreat(s);setBeh(s,{kind:'flee',from:th?th.id:null,why:'panic',hard:true});return;}
  if(s.retreat){setBeh(s,{kind:'hegback',dest:s.home||s,why:'hurt: pulling back'});return;}
  const home=s.asset&&byId(s.asset)?byId(s.asset):s.home||s;
  // a pilot being shot at fights back (C-72: raiders flew on into your guns for the station)
  const atk=byId(s.lastHitBy);
  if(!mute(s)&&atk&&atk.alive&&!atk.struct&&S.t-s.hitT<2&&dist(atk,s)<gunRange(s)*1.5&&s.hegRole!=='lure'){setBeh(s,{kind:'engage',target:atk.id,why:'self-defence'});return;}
  if(s.hegRole==='lure'){const st=byId(s.hegFrom),d=st&&S.ships.filter(y=>y.alive&&y.faction==='reb'&&!y.struct&&!y.quiet).sort((a,b)=>dist(a,s)-dist(b,s))[0];
    if(st&&d){setBeh(s,{kind:'lure',target:d.id,from:st.id,why:'luring your fighters off '+(st.label||st.name)});return;}}
  if(s.hegRole==='strike'){const st=byId(s.hegFrom);
    if(s.standT==null)s.standT=S.t;
    if(st&&!st.hegClear&&dist(s,st)>CLEAR_R*0.8&&S.t-s.standT<STRIKE_WAIT){setBeh(s,{kind:'standoff',anchor:st,why:'holding off until '+(st.label||st.name)+' is clear'});return;}}
  let pool=foes;
  if(s.doctrine==='raid'){   // raiders go for your installations, turning only on a fighter that has its guns on them
    const st=foesOf(s).filter(t=>t.struct);
    const th=foes.filter(t=>dist(t,s)<RAID_TURN_R&&inArc(t,s));
    pool=th.length||!st.length?(th.length?th:foes):st;
  }
  else if(s.doctrine==='guard')pool=foes.filter(t=>dist(t,home)<=GUARD_R+400||dist(t,s)<=gunRange(s)*0.9);
  else if(s.doctrine==='patrol')pool=foes.filter(t=>dist(t,s)<=DETECT_R&&dist(t,home)<=LEASH_R);
  const t=bestTarget(s,pool,{prefer:x=>x.id===s.fireAt});
  if(t){setBeh(s,{kind:'engage',target:t.id,why:s.doctrine});return;}
  setBeh(s,{kind:'patrol',dest:{x:home.x,y:home.y},why:s.doctrine});
}

/* ---------- from a behaviour to a goal for the flight model, and who the guns are on ---------- */
let LEAD_ORBIT=1400;      // a leader holding or re-forming its wing circles this wide, so the wing can keep station (C-69). placeholder
function slotOf(s,w,T){   // this ship's place in its wing's formation: a V behind the leader, spacing by the tactic
  const lead=byId(w.leader)||wingShips(w)[0];
  if(!lead||lead===s)return null;
  const live=wingShips(w).filter(x=>x!==lead),i=live.indexOf(s);if(i<0)return null;
  const rank=Math.floor(i/2)+1,side=i%2?1:-1,g=FORM_GAP*(T.space||1);
  const bx=-g*rank*(T.space>2?0.25:0.85),by=side*g*rank;   // spread: nearly line abreast; tight: a V
  const c=Math.cos(lead.vh),sn=Math.sin(lead.vh);
  return {x:lead.x+bx*c-by*sn,y:lead.y+bx*sn+by*c,lead};
}
function orbitGoal(s,p,R){   // a ship can't stop: holding on a point is orbiting it
  const a=Math.atan2(s.y-p.y,s.x-p.x)+0.7;
  return {x:p.x+Math.cos(a)*R,y:p.y+Math.sin(a)*R};
}
/* holding close on a point (capturing, boarding, waiting at the jump point): at corner speed, where it turns tightest,
   on a circle no tighter than it can fly (C-70: slowing down widened the circle past the boarding range) */
function holdOrbit(s,p,R){const c=capsOf(s);return Object.assign(orbitGoal(s,p,Math.max(R,c.vc/c.wc*1.05)),{spd:CORNER});}
/* arriving (C-70, playtest 2): a point a ship must fly into (the jump point) can sit inside its turning circle, where
   steering straight at it orbits for ever (Convoy Lark did). Then it flies straight out until it has room, and comes
   back in on a line. Inside the circle: d < 2r·sin(bearing off the nose); out far enough: d > ARRIVE_OUT × r */
let ARRIVE_OUT=2.6;       // placeholder
function arriveGoal(s,p,spd){
  const c=capsOf(s),v=Math.max(c.vMin,Math.hypot(s.vx,s.vy)),r=Math.max(v/turnCap(c,v),c.vc/c.wc),d=dist(s,p);
  const off=Math.abs(angNorm(Math.atan2(p.y-s.y,p.x-s.x)-s.vh));
  if(s.arrP!==p){s.arrP=p;s.arrOut=false;}
  if(s.arrOut&&d>r*ARRIVE_OUT)s.arrOut=false;
  else if(!s.arrOut&&d>JUMP_R*0.5&&d<2.2*r*Math.sin(Math.min(off,Math.PI/2))&&off>0.35)s.arrOut=true;
  if(s.arrOut)return {x:s.x+Math.cos(s.vh)*1500,y:s.y+Math.sin(s.vh)*1500,spd,noCorner:true};
  return {x:p.x,y:p.y,spd};
}
function goalOf(s){
  const b=s.beh||{kind:'idle'},w=wingOf(s.wing),T=w?tacticOf(w):HC_TACTICS.spread,P=PERSONALITY[s.persona]||PERSONALITY.even,c=capsOf(s);
  s.fireAt=null;s.intent=null;s.holdFire=false;
  let g=HK.goal?HK.goal(s):null;
  if(g){}
  else if(b.kind==='engage'){
    const t=byId(b.target);
    if(t&&t.alive){
      s.fireAt=t.id;
      g=runGoal(s,t,T,P,w,c);
    }
  } else if(b.kind==='withdraw'){
    g=dist(s,b.dest)<500&&b.dest!==extractPoint()?Object.assign(orbitGoal(s,b.dest,320),{spd:CRUISE}):arriveGoal(s,b.dest,1);
  } else if(b.kind==='escort'){
    const ch=byId(b.charge),sl=w?slotOf(s,w,T):null;
    if(ch){
      // the wing flies a box round its charge: the leader off its beam, the rest in the leader's slots
      const off=FORM_GAP*1.6*(T.space||1),th=ch.vh!=null?ch.vh:ch.h;
      if(s.id===w.leader||!sl)g=stationGoal(s,{x:ch.x-Math.sin(th)*off,y:ch.y+Math.cos(th)*off},ch);
      else g=stationGoal(s,sl,sl.lead);
      if(T.screen>0.5){   // screen: between the charge and the nearest threat
        const th2=bestTarget(s,foesOf(s).filter(x=>!x.struct&&dist(x,ch)<ESCORT_R*2.2));
        if(th2){const a=Math.atan2(th2.y-ch.y,th2.x-ch.x),sp=(wingShips(w).indexOf(s)-1)*0.35;g={x:ch.x+Math.cos(a+sp)*off*1.4,y:ch.y+Math.sin(a+sp)*off*1.4,spd:1};}
      }
    }
  } else if(b.kind==='form'){
    const sl=w?slotOf(s,w,T):null;
    if(sl)g=stationGoal(s,sl,sl.lead);
    else if(s.faction==='reb'){const hold=w&&w.hold||{x:s.x+Math.cos(s.vh)*400,y:s.y+Math.sin(s.vh)*400};if(w&&!w.hold)w.hold=hold;g=Object.assign(orbitGoal(s,hold,LEAD_ORBIT),{spd:CRUISE*0.8});}
  } else if(b.kind==='lure'){   // at the defender, then drag it out away from the station (and the strikers)
    const D=byId(b.target),st=byId(b.from);
    if(st){
      if(s.lure!=='out'&&D&&(dist(s,D)<gunRange(s)*1.2||S.t-s.hitT<1))s.lure='out';
      else if(s.lure==='out'&&(dist(s,st)>LURE_DIST||(D&&dist(s,D)>gunRange(D)*3.5)))s.lure='in';
      if(s.lure!=='out'&&D){g=runGoal(s,D,T,P,null,c);s.fireAt=D.id;}
      else{
        let ax=s.x-st.x,ay=s.y-st.y;const al=Math.hypot(ax,ay)||1;ax/=al;ay/=al;
        const sk=S.ships.filter(x=>x.alive&&x.hegRole==='strike'&&x.hegFrom===st.id);
        if(sk.length){let bx=0,by=0;for(const x of sk){bx+=x.x-st.x;by+=x.y-st.y;}const bl=Math.hypot(bx,by)||1;bx/=bl;by/=bl;const dt2=ax*bx+ay*by;if(dt2>0){ax-=1.5*dt2*bx;ay-=1.5*dt2*by;const l2=Math.hypot(ax,ay)||1;ax/=l2;ay/=l2;}}
        g={x:s.x+ax*1500,y:s.y+ay*1500,spd:1};
      }
    }
  } else if(b.kind==='standoff'){   // hold off on its own side, out of the defenders' reach
    const st=b.anchor;let ax=s.x-st.x,ay=s.y-st.y;const al=Math.hypot(ax,ay)||1;
    const P={x:st.x+ax/al*STANDOFF_R,y:st.y+ay/al*STANDOFF_R};g=Object.assign(orbitGoal(s,P,700),{spd:CRUISE});
  } else if(b.kind==='hegback'){   // hurt: home, and circling there
    const h=b.dest;g=dist(s,h)>1500?{x:h.x,y:h.y,spd:1}:Object.assign(orbitGoal(s,h,900),{spd:CRUISE*0.8});
  } else if(b.kind==='interpose'){   // between the threat and the charge, nose on the threat (C-72)
    const t=byId(b.target),a=b.anchor;
    if(t&&a){const d=dist(t,a),k=clamp(d*INTERPOSE_K,700,3000)/(d||1);g={x:a.x+(t.x-a.x)*k,y:a.y+(t.y-a.y)*k,spd:1,face:t};s.fireAt=t.id;}
  } else if(b.kind==='defend'||b.kind==='hold'){
    const a=b.anchor,i=w?Math.max(0,wingShips(w).indexOf(s)):0,R=(b.kind==='hold'?700:800)*(0.8+0.25*(T.space||1))+i*140;   // wide enough to fly at cruise (C-69)
    g=Object.assign(orbitGoal(s,a,R),{spd:CRUISE});
  } else if(b.kind==='capture'){
    const a=b.anchor,d=dist(s,a);
    g=d>CAPTURE_R*1.5?{x:a.x,y:a.y,spd:1}:holdOrbit(s,a,CAPTURE_R*0.55);
  } else if(b.kind==='board'){
    const st=byId(b.station),d=st?dist(s,st):0;
    if(st)g=d>boardR(st)*1.4?{x:st.x,y:st.y,spd:1}:holdOrbit(s,st,boardR(st)*0.6);
  } else if(b.kind==='fallback'){   // away from the threat, toward the wing
    const th=byId(b.from),lead=w?byId(w.leader):null;
    let ax=0,ay=0;if(th){const d=dist(s,th)||1;ax=(s.x-th.x)/d;ay=(s.y-th.y)/d;}
    const home=lead&&lead!==s?lead:(w?wingCentre(w):s);
    g={x:s.x+ax*900+(home.x-s.x)*0.4,y:s.y+ay*900+(home.y-s.y)*0.4,spd:1};
  } else if(b.kind==='flee'){   // panic: run from the nearest threat, guns silent
    const th=byId(b.from);let ax=Math.cos(s.vh),ay=Math.sin(s.vh);
    if(th){const d=dist(s,th)||1;ax=(s.x-th.x)/d;ay=(s.y-th.y)/d;}
    g={x:s.x+ax*1200,y:s.y+ay*1200,spd:1};s.holdFire=true;
  } else if(b.kind==='freeze'){   // panic: straight on, slow, guns silent
    g={x:s.x+Math.cos(s.vh)*600,y:s.y+Math.sin(s.vh)*600,spd:0};s.holdFire=true;
  } else if(b.kind==='decoyed'){
    g=Object.assign(dist(s,b.dest)>300?{x:b.dest.x,y:b.dest.y}:orbitGoal(s,b.dest,240),{spd:1,face:b.dest});
  } else if(b.kind==='convoy'){
    g=arriveGoal(s,b.dest,CONVOY_SPD);
  } else if(b.kind==='wait'){
    g=holdOrbit(s,b.dest,JUMP_R*1.4);
  } else if(b.kind==='patrol'){
    g=Object.assign(orbitGoal(s,b.dest,420),{spd:CRUISE*0.8});
  }
  // opportunity fire: with nothing designated in its guns, a ship shoots at whatever hostile crosses them
  if(s.driftT&&S.t<s.driftT){const six=HK.slideDrift&&HK.slideDrift(s)?(s.driftAt&&byId(s.driftAt)):onSix(s);if(six&&six.alive)s.fireAt=six.id;}
  if(!s.holdFire&&(!s.fireAt||!byId(s.fireAt)||!inArc(s,byId(s.fireAt)))){
    const opp=foesOf(s).filter(t=>inArc(s,t)&&dist(s,t)<=gunRange(s)&&(!t.struct||(b.kind==='engage'&&b.target===t.id)));
    const o=bestTarget(s,opp);if(o)s.fireAt=o.id;   // the designated target isn't in the guns: shoot what is
  }
  // a missile about to hit (C-70): break hard across its path, at corner speed, whatever the job (a frozen pilot can't)
  // C-72: from the launch, not just the last second. Far off: run straight away from it at full speed (boosting:
  // abilityTick runs every step while one is coming), to make it chase; close (MIS_BREAK_T): break across its path
  const mis=incomingMissile(s);
  if(mis&&b.kind!=='freeze'){
    const mh=Math.atan2(s.y-mis.y,s.x-mis.x),close=dist(mis,s)/misSpd()<MIS_BREAK_T;
    if(close){const side=angNorm(s.vh-mh)>=0?1:-1,bh=mh+side*Math.PI/2;g={x:s.x+Math.cos(bh)*900,y:s.y+Math.sin(bh)*900,spd:CORNER};}
    else g={x:s.x+Math.cos(mh)*1500,y:s.y+Math.sin(mh)*1500,spd:1};
    s.misBreakT=S.t;
    if(s.warnedMis!==mis.id){s.warnedMis=mis.id;if(s.faction==='reb'&&!s.quiet)say(s,pickLine(s,'missile'),'hazard',true);}
  }
  if(g)s.intent={x:g.x,y:g.y};
  s.goal=g;
}
function incomingMissile(s){   // the nearest missile on its way to this ship (C-72: from launch, not only at the end)
  if(s.struct)return null;
  let best=null,bt=1e9;
  for(const m of S.missiles){if(m.target!==s.id)continue;const t=dist(m,s)/misSpd();if(t<bt){bt=t;best=m;}}
  return best;
}
/* the attack run's state machine (C-69). s.mv: run → extend → turn → run; pursue while a faster ship holds a
   slower target's tail. The tactic shapes it: how far it extends, how close it passes, a pincer's approach, a tight
   wing's synchronised passes, harassment's one-at-a-time */
function runGoal(s,t,T,P,w,c){
  const reach=gunRange(s),d=dist(s,t),tvh=t.vh!=null?t.vh:t.h,mine=s.faction==='reb';
  const ext=reach*EXTEND_K*(T.extend||1),pass=reach*PASS_K*(T.pass||1);
  const toT=Math.atan2(t.y-s.y,t.x-s.x),off=Math.abs(angNorm(toT-s.vh));
  const onTail=!t.struct&&Math.abs(angNorm(Math.atan2(s.y-t.y,s.x-t.x)-tvh))>2.3;   // we sit in its rear quarter
  const faster=Math.hypot(s.vx,s.vy)>=Math.hypot(t.vx||0,t.vy||0)*0.95;
  if(s.mvTarget!==t.id){s.mvTarget=t.id;s.mv='run';s.mvT=S.t;s.arcT=S.t;}
  const set=m=>{
    s.mv=m;s.mvT=S.t;
    if(m==='extend'){   // out along the line of flight, veering away from the target's nose if it faces us
      const away=inArc(t,s)?Math.sign(angNorm(Math.atan2(s.y-t.y,s.x-t.x)-tvh))||1:0;
      let h=s.vh+away*0.35;
      // and clear of a station (C-71: an extension begun short of one flew through it)
      const dd=Math.max(1,dist(s,t)),clr=bodyR(s)+bodyR(t)+AVOID_PAD*1.5,bt=Math.atan2(t.y-s.y,t.x-s.x),dev=angNorm(h-bt),need=Math.asin(Math.min(1,clr/Math.max(dd,clr)));
      if(t.struct&&Math.abs(dev)<need)h=bt+(Math.sign(dev)||1)*need*1.1;   // a fighter's pass distance already clears it
      s.extPt={x:s.x+Math.cos(h)*ext*1.3,y:s.y+Math.sin(h)*ext*1.3};
    }
  };
  // a stalemate is a close fight (inside 1.5 × reach) turning without a shot; the clock only runs while it is one
  if((inArc(s,t)&&d<=reach)||d>reach*1.5||s.mv==='extend')s.arcT=S.t;
  // a stalemate, or something close on its six: break off, then come back with a fresh run
  const stale=STALE_SECS*(mine?(P.stale||1):1),six=onSix(s);
  const sixBreak=six&&dist(s,six)<reach*0.8&&s.mv!=='pursue'&&s.mv!=='extend'&&S.t-(s.breakT||-99)>3;
  if(s.mv!=='extend'&&(S.t-(s.arcT==null?S.t:s.arcT)>stale||sixBreak)){set('extend');s.arcT=S.t;S.m.breakoffs=(S.m.breakoffs||0)+1;s.breakT=S.t;}
  const lead=w&&byId(w.leader),sync=T.sync>=0.5&&lead&&lead!==s&&lead.mvTarget===t.id;
  switch(s.mv){
    case 'run':
      if(T.pursue>=0.5&&onTail&&faster&&d<reach*0.9)set('pursue');
      else if(d<pass||(off>1.5&&d<reach*1.2)||(sync&&lead.mv==='extend'&&d<reach))set('extend');
      break;
    case 'pursue':
      if(!onTail||d<reach*0.2||off>1.2)set('extend');
      break;
    case 'extend':
      if(d>ext||S.t-s.mvT>EXT_MAX||(sync&&lead.mv==='turn'&&S.t-s.mvT>1))set('turn');
      break;
    case 'turn':
      if(off<0.5)set('run');
      break;
  }
  // harassment: only one of the wing in the target's guns at a time; the rest wait their turn out of reach
  if(T.harass>=0.5&&w&&(s.mv==='run'||s.mv==='turn')&&wingShips(w).some(m=>m!==s&&m.mvTarget===t.id&&m.mv==='run'&&dist(m,t)<reach*1.2)){
    s.mv='turn';return Object.assign(orbitGoal(s,t,ext),{spd:CRUISE});
  }
  if(s.mv==='extend'){
    if(sync&&lead.mv==='extend'){const sl=slotOf(s,w,T);if(sl)return stationGoal(s,sl,lead);}   // a tight wing re-forms between passes
    return {x:s.extPt.x,y:s.extPt.y,spd:1};
  }
  if(s.mv==='turn')return {x:t.x,y:t.y,spd:CORNER,face:t};
  if(s.mv==='pursue'){const R=reach*ENGAGE_FRAC*0.5;return {x:t.x-Math.cos(tvh)*R,y:t.y-Math.sin(tvh)*R,spd:clamp(Math.hypot(t.vx||0,t.vy||0)/c.vMax+0.1,0.3,1),face:t};}
  // run: at the target's lead point; a pincer's halves come in from either side until they are inside the reach
  const lt=Math.min(1.5,d/Math.max(1,c.vMax));let gx=t.x+(t.vx||0)*lt,gy=t.y+(t.vy||0)*lt;
  if(T.flank>0&&w&&d>reach*0.9){const i=wingShips(w).indexOf(s),side=i%2?1:-1;gx+=-Math.sin(toT)*side*reach*T.flank;gy+=Math.cos(toT)*side*reach*T.flank;}
  return {x:gx,y:gy,spd:1,face:t};
}
/* station keeping (C-69): with wide turns a ship can't sit on a point, so it flies a line through its station: it aims
   SLOT_LOOK ahead of the station along the leader's heading, and sets its speed from how far ahead or behind it is */
let SLOT_LOOK=700;        // placeholder
function stationGoal(s,sl,lead){
  const th=lead.vh!=null?lead.vh:lead.h,lx=Math.cos(th),ly=Math.sin(th),c=capsOf(s);
  const along=(sl.x-s.x)*lx+(sl.y-s.y)*ly,lv=Math.hypot(lead.vx||0,lead.vy||0);
  return {x:sl.x+lx*SLOT_LOOK,y:sl.y+ly*SLOT_LOOK,spd:clamp((lv+along*0.6)/c.vMax,0,1),noCorner:true};
}
function catchSpd(s,sl,lead){   // a moving mark (a slot, an escort station): behind it, speed up; past it, ease off
  const c=capsOf(s),lv=lead?Math.hypot(lead.vx,lead.vy):c.vMax*CRUISE;
  const dx=sl.x-s.x,dy=sl.y-s.y,ahead=dx*Math.cos(s.vh)+dy*Math.sin(s.vh);
  return clamp((lv+ahead*0.8)/c.vMax,0,1);
}

/* =====================================================================
   Flight (§2.3 item 5): SB's flown body (sim-sb.js flyStep: velocity, a nose with its own turn rate that brakes
   onto its mark, thrust limits), steered at a goal point in real time instead of along a drawn plan. The envelope
   is the dial's: a speed band (a ship can't stop) and a turn-rate cap of speed × the tightest-turn curvature.
   ===================================================================== */
let TURN_K=3;             // how hard the autopilot turns onto its goal, per radian of error a second. placeholder
let SLIP_NOSE=0.2;        // how far the nose may lead the line of flight toward its target, radians (SB's 0.42 until C-69). placeholder
let NOSE_K=9,NOSE_RATE=12,NOSE_ACC=120;   // the nose (copied from sim-sb.js). placeholders
let AVOID_R=260;          // rocks and the map edge push a ship's heading away inside this. placeholder
let DISENGAGE_R=1600;     // a withdrawing or falling-back ship steers wide of hostiles inside this. placeholder
let SEP_R=220;            // ships of one side keep at least this far apart (personal space). placeholder
function avoidHeading(s,want){
  let ax=Math.cos(want),ay=Math.sin(want);
  for(const r of S.rocks){
    const dx=s.x-r.x,dy=s.y-r.y,d=Math.hypot(dx,dy),R=r.r+AVOID_R;
    if(d<R&&d>1){const k=(R-d)/R*2.2;ax+=dx/d*k;ay+=dy/d*k;}
  }
  const leaving=s.beh&&(s.beh.kind==='flee');
  if(!leaving){
    const m=MARGIN+AVOID_R;
    if(s.x<m)ax+=(m-s.x)/m*2;if(s.x>W-m)ax-=(s.x-(W-m))/m*2;
    if(s.y<m)ay+=(m-s.y)/m*2;if(s.y>H-m)ay-=(s.y-(H-m))/m*2;
  }
  const k=s.beh&&s.beh.kind;
  if(k==='withdraw'||k==='fallback'||k==='flee'){   // disengaging: steer wide of hostile guns
    for(const o of S.ships){
      if(!o.alive||o.faction===s.faction||o.struct)continue;
      const dx=s.x-o.x,dy=s.y-o.y,d=Math.hypot(dx,dy);
      if(d<DISENGAGE_R&&d>1){const w=(DISENGAGE_R-d)/DISENGAGE_R*1.6;let px=dx/d*w,py=dy/d*w;
        const fwd=HK.disengage&&HK.disengage(s);   // a layer can keep a retreat pointed home: no push back against the goal, only sideways
        if(fwd){const gx=Math.cos(want),gy=Math.sin(want),back=px*gx+py*gy;if(back<0){px-=back*gx;py-=back*gy;}px*=fwd;py*=fwd;}
        ax+=px;ay+=py;}
    }
  }
  if(!(HK.noSep&&HK.noSep(s)))for(const o of S.ships){   // wingmates keep a little room (a layer can exempt a ship: Type 3.5's docking)
    if(o===s||!o.alive||o.faction!==s.faction||o.struct)continue;
    const dx=s.x-o.x,dy=s.y-o.y,d=Math.hypot(dx,dy);
    if(d<SEP_R&&d>1){const k=(SEP_R-d)/SEP_R*1.5;ax+=dx/d*k;ay+=dy/d*k;}
  }
  const al=Math.hypot(ax,ay)||1;ax/=al;ay/=al;
  const ev=evadeVec(s);
  if(ev){const k=1-Math.min(0.85,ev.urg);ax=ax*k+ev.x;ay=ay*k+ev.y;}   // an imminent crash outweighs the goal
  return Math.atan2(ay,ax);
}
/* not crashing (C-70, playtest 2): a pilot looks AVOID_T ahead along its relative motion to every ship (either side),
   station and rock; anything it would pass closer than both bodies plus AVOID_PAD it steers off, sideways, the harder
   the sooner. Eager pilots cut it finer, steady ones give more room. */
let AVOID_T=1.6;          // seconds of look-ahead. placeholder
let AVOID_PAD=90;         // room to spare past the two bodies. placeholder
let AVOID_W=3;            // how hard an imminent crash outweighs the goal. placeholder
const PAD_K={eager:0.6,steady:1.4,even:1};
function evadeVec(s){
  if(s.struct)return null;
  const rs=bodyR(s),pad=AVOID_PAD*(PAD_K[s.persona]||1),reach=Math.hypot(s.vx,s.vy)*AVOID_T*2+600;
  let ex=0,ey=0,worst=0,who=null;
  const test=(ox,oy,ovx,ovy,R,o)=>{
    const rx=ox-s.x,ry=oy-s.y;if(Math.abs(rx)>reach+R||Math.abs(ry)>reach+R)return;
    const ux=ovx-s.vx,uy=ovy-s.vy,uu=ux*ux+uy*uy,d0=Math.hypot(rx,ry);
    let t=uu<1?0:-(rx*ux+ry*uy)/uu;
    // already inside the room with no closing to speak of (flying side by side, touching): push apart now (C-72: two
    // ships at matched speed ground along each other, as nothing closing was ever seen)
    if(t<=0||uu<1){if(d0>=R)return;t=0;}
    else if(t>AVOID_T)return;
    const cx=t?rx+ux*t:rx,cy=t?ry+uy*t:ry,d=t?Math.hypot(cx,cy):d0;if(d>=R)return;
    const urg=Math.min(1,(1-t/AVOID_T)*0.7+(1-d/R)*0.5);
    // sideways, across our line of flight, away from the side it is on: a moving ship by where it will pass, a rock
    // or station by where it is; the side is held while the danger lasts, so the dodge never flips mid-turn
    const hx=Math.cos(s.vh),hy=Math.sin(s.vh),key=o?o.id:'r'+Math.round(ox)+','+Math.round(oy);
    s.evSide=s.evSide||{};
    // a ship: away from where it will pass. But a ship flying our way and drifting into us dead-on (headings within
    // 60°, passing within a third of the room), a rock or a station: away from where it is now (C-71: there the
    // passing point's side is noise, and two Crosses in formation turned into each other)
    const along=o&&!o.struct&&Math.abs(angNorm((o.vh!=null?o.vh:o.h)-s.vh))<1.05&&d<=R*0.35;
    const near=o&&!o.struct&&!along;
    const held=s.evSide[key]&&S.t-s.evSide[key].t<1&&S.t-s.evSide[key].t0<1;   // held at most 1 s from the choice (C-72: renewed every step, a stale side ground two ships together)
    let side=held?s.evSide[key].side:(near?hx*cy-hy*cx:hx*ry-hy*rx);   // > 0: on our left
    if(Math.abs(side)<1e-3)side=(s.id<(o&&o.id||'~'))?1:-1;
    side=side>0?1:-1;s.evSide[key]={side,t:S.t,t0:held?s.evSide[key].t0:S.t};
    const k=urg*AVOID_W,sx=side>0?hy:-hy,sy=side>0?-hx:hx;
    ex+=sx*k;ey+=sy*k;if(urg>worst){worst=urg;who=o;}
  };
  for(const o of S.ships){if(o===s||!o.alive||(HK.noAvoid&&HK.noAvoid(s,o)))continue;test(o.x,o.y,o.struct?0:o.vx,o.struct?0:o.vy,rs+bodyR(o)+pad,o);}
  for(const r of S.rocks)test(r.x,r.y,0,0,rs+rockR(r)+pad,null);
  if(!worst)return null;
  s.evadeAt=S.t;s.evUrg=worst;if(worst>0.6&&who)s.dodgeT=S.t;   // a real dodge (the HUD shows a symbol)
  for(const k in s.evSide)if(S.t-s.evSide[k].t>2)delete s.evSide[k];
  if(worst>0.6&&who&&!who.struct&&s.faction==='reb'&&!s.quiet&&S.t-(s.evadeSaid==null?-99:s.evadeSaid)>8){s.evadeSaid=S.t;say(s,pickLine(s,'evade'),'info',false);}
  return {x:ex,y:ey,urg:worst};
}
function fly(s,dt){
  if(s.struct)return;
  const c=capsOf(s),g=s.goal;
  let want=g?Math.atan2(g.y-s.y,g.x-s.x):s.vh;
  want=avoidHeading(s,want);
  const v=Math.max(c.vMin,Math.hypot(s.vx,s.vy));
  // a layer's drift (Type 3.5, feedback 2 §5): a slide. No new thrust; the line of flight turns at a fraction of
  // its rate (the ship carries on wide on its momentum) while the nose swings onto the target, up to D.nose off the
  // line of flight, so the guns bear early; the slide bleeds speed, which the ship has to win back after
  const D=s.driftT&&S.t<s.driftT&&HK.slideDrift?HK.slideDrift(s):null;
  const e=angNorm(want-s.vh),wCap=turnCap(c,v)*(D?D.turnK:1),w=clamp(e*TURN_K,-wCap,wCap);
  s.vh=angNorm(s.vh+w*dt);s.turnW=w;
  const boost=s.boostT>0?BOOST_MULT:1;
  let tv=(g&&g.spd!=null?g.spd:CRUISE)*c.vMax*boost;
  if(D)tv=Math.min(tv,v);   // no new thrust in a slide: the engines only hold what it has
  if(Math.abs(e)>0.6&&!(g&&g.noCorner))tv=Math.max(Math.min(tv,c.vc),Math.min(c.vc,tv*1.4));   // a hard turn wants corner speed: no faster, and never braking below it
  tv=clamp(tv,c.vMin,c.vMax*boost);
  // turning bleeds speed; the engines fight back (a sustained hard turn loses the fight)
  const acc=THRUST_K*c.vMax*boost*dt,bleed=TURN_BLEED*c.vMax*Math.abs(w)/c.wc*dt;
  const nv=clamp(v+clamp(tv-v,-acc*1.4*(D?D.coast:1),acc)-bleed-(D?D.bleed*c.vMax*dt:0),c.vMin,c.vMax*boost);
  s.vx=Math.cos(s.vh)*nv;s.vy=Math.sin(s.vh)*nv;
  s.x+=s.vx*dt;s.y+=s.vy*dt;
  s.x=clamp(s.x,10,W-10);s.y=clamp(s.y,10,H-10);
  // the nose: along the line of flight, leading toward its target by up to SLIP_NOSE (sim-sb.js flyStep's nose)
  let nh=s.vh;
  const six=s.driftT&&S.t<s.driftT&&!D?onSix(s):null,dt2=D&&s.driftAt?byId(s.driftAt):null;
  if(D){const ta=dt2&&dt2.alive?Math.atan2(dt2.y-s.y,dt2.x-s.x):want;nh=s.vh+clamp(angNorm(ta-s.vh),-D.nose,D.nose);}   // the slide: the nose onto the target
  else if(six)nh=Math.atan2(six.y-s.y,six.x-s.x);   // Drift: the nose (and the guns) on the pursuer, flying on
  else if(g&&g.face){const f=g.face,off=angNorm(Math.atan2(f.y-s.y,f.x-s.x)-s.vh);if(Math.abs(off)<Math.PI*0.75)nh=s.vh+clamp(off,-SLIP_NOSE,SLIP_NOSE);}
  const en=angNorm(nh-s.h),ws=Math.sign(en)*Math.min(NOSE_RATE,NOSE_K*Math.abs(en),Math.sqrt(1.6*NOSE_ACC*Math.abs(en)));
  const al=clamp((ws-s.w)*25,-NOSE_ACC,NOSE_ACC);
  s.w=clamp(s.w+al*dt,-NOSE_RATE,NOSE_RATE);s.h=angNorm(s.h+s.w*dt);
  if(s.boostT>0)s.boostT-=dt;
}

/* ---------- collisions (C-70, playtest 2): ships hit ships (either side), stations and rocks ----------
   Each body is a circle (a ship's hull length, a station's size, a rock's radius). Contact is tested along the step's
   path, since a fast ship moves further in a step than a fighter is long. Damage goes with the square of the closing
   speed (COLLIDE_DMG at 1,000 a second, through shields and armour as any hit), shared by size: the smaller ship takes
   more. The two bounce apart (COLLIDE_BOUNCE of the closing speed back); rocks and stations don't move. */
let COLLIDE_DMG=40;       // damage at a closing speed of 1,000 a second (a head-on at full speed is ~4 ×). placeholder
let COLLIDE_K=1.15;       // a ship's collision radius, × its hull length (HULL_LEN). placeholder
let COLLIDE_BOUNCE=0.3;   // restitution. placeholder
let SHIELD_CD=24;        // Boost Shields' recharge (was 8: it fired too often, feedback 1 §3.2). placeholder
let SHOW_DMG=0;          // 1: the '-N' damage numbers float again (off: they cluttered the fight, feedback 1 §3.3)
const bodyR=s=>(s.struct?HULL_LEN*SRDB.visualSize(s.row.size)*SHIP_SCALE*1.2:HULL_LEN*SRDB.visualSize(s.row.size)*SHIP_SCALE*COLLIDE_K)*(s.row.hitK||1);
const rockR=r=>r.r*0.95;
function sweptMin(ax,ay,dx,dy){   // the closest a point a + u·d (u in 0..1) comes to the origin: [u, distance]
  const L=dx*dx+dy*dy,u=L<1e-9?1:clamp(-(ax*dx+ay*dy)/L,0,1);
  return [u,Math.hypot(ax+dx*u,ay+dy*u)];
}
/* a ship's mass for collisions (feedback 1, §3.8): its size class in metres (sr-art.js's SIZE_M, copied), squared, so
   a Cross (16 m, 256) hitting the FL-400 (130 m, 16,900) moves it 1.5% as much as it moves itself */
const SIZE_M={1:2,2:4,3:8,4:12,5:16,6:25,7:40,8:60,9:90,10:130,11:180,12:250,13:350,14:500,15:700,16:1000,17:1500,18:2500,19:4000,20:6000};
const massOf=s=>s.struct?1e9:Math.pow(SIZE_M[Math.max(1,Math.min(20,Math.round(s.row.size||5)))],2);
function bump(s,o,nx,ny,vn,dmg,what,k){   // s takes dmg, o (a ship or null) is what it hit; k: its share of the impulse (by mass)
  const fromFront=(nx*Math.cos(s.h)+ny*Math.sin(s.h))<0;   // n points from o to s
  const r=dmg>0?applyDamage(s,dmg,false,fromFront):{sd:0,ad:0,hd:0};
  if(dmg>0){s.hitT=S.t;if(r.sd>0)s.shFx={zone:r.zone,t:S.t};}
  s.spinK=(S.rng()<0.5?-1:1)*Math.min(4,vn/250)*(k==null?1:k);s.w+=s.spinK;   // knocked about, as much as its share of the mass lets it be
  if(dmg>=1&&s.faction==='reb'&&!s.quiet)adjCool(s,-Math.min(15,4+dmg/4));
  if(s.hull<=0&&s.alive)destroyShip(s,null);
  return r;
}
/* the impulse a collision gave a ship this step, for a layer that flies a ship itself (Type 3.5's freighter, §3.8) */
function knock(s,dx,dy){const k=s.knock||(s.knock={x:0,y:0});k.x+=dx;k.y+=dy;}
function collideTick(){
  const L=S.ships.filter(s=>s.alive);
  for(let i=0;i<L.length;i++){
    const a=L[i];if(!a.alive)continue;
    const ra=bodyR(a);
    // rocks: a ship's path this step against each rock
    if(!a.struct)for(const k of S.rocks){
      const R=ra+rockR(k);if(Math.abs(a.x-k.x)>R+120||Math.abs(a.y-k.y)>R+120)continue;
      const [u,d]=sweptMin(a.px-k.x,a.py-k.y,a.x-a.px,a.y-a.py);if(d>=R)continue;
      const cx=a.px+(a.x-a.px)*u,cy=a.py+(a.y-a.py)*u;let nx=cx-k.x,ny=cy-k.y;const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
      const vn=-(a.vx*nx+a.vy*ny);if(vn<=0){a.x=k.x+nx*R;a.y=k.y+ny*R;continue;}
      a.x=k.x+nx*(R+1);a.y=k.y+ny*(R+1);
      const vx=a.vx+(1+COLLIDE_BOUNCE)*vn*nx,vy=a.vy+(1+COLLIDE_BOUNCE)*vn*ny;a.vx=vx;a.vy=vy;a.vh=Math.atan2(vy,vx);
      const dmg=COLLIDE_DMG*(vn/1000)*(vn/1000);
      S.m.collisions=(S.m.collisions||0)+1;
      S.fx.push({x:a.x-nx*ra,y:a.y-ny*ra,t0:S.t,kind:'hull',src:'crash',speed:vn});floater(a,'IMPACT',C.hazard);
      if(dmg>=1)pushEvent('collide',a.name+' hits a rock',{ship:a.id,x:a.x,y:a.y,tone:'hazard'});
      bump(a,null,nx,ny,vn,dmg,'rock');
      if(a.alive&&dmg>=1)say(a,pickLine(a,'bump'),'hazard',true);
      if(!a.alive)break;
    }
    if(!a.alive)continue;
    for(let j=i+1;j<L.length;j++){
      const b=L[j];if(!b.alive||(a.struct&&b.struct))continue;
      if(HK.noCollide&&HK.noCollide(a,b))continue;   // a layer's exemption (Type 3.5: a boarder on its final leg, a ram, and their target)
      const R=ra+bodyR(b);if(Math.abs(a.x-b.x)>R+150||Math.abs(a.y-b.y)>R+150)continue;
      const [u,d]=sweptMin(a.px-b.px,a.py-b.py,(a.x-a.px)-(b.x-b.px),(a.y-a.py)-(b.y-b.py));if(d>=R)continue;
      const ax=a.px+(a.x-a.px)*u,ay=a.py+(a.y-a.py)*u,bx=b.px+(b.x-b.px)*u,by2=b.py+(b.y-b.py)*u;
      let nx=ax-bx,ny=ay-by2;const nl=Math.hypot(nx,ny);if(nl<1e-6){nx=Math.cos(a.vh+Math.PI/2);ny=Math.sin(a.vh+Math.PI/2);}else{nx/=nl;ny/=nl;}
      const vn=-((a.vx-b.vx)*nx+(a.vy-b.vy)*ny);
      const ma=massOf(a),mb=massOf(b),ka=mb/(ma+mb),kb=ma/(ma+mb);   // by mass (feedback 1, §3.8), not size class
      // pushed apart either way; only a closing contact hurts and bounces
      const over=R+1-Math.hypot(a.x-b.x,a.y-b.y);
      if(over>0){if(!a.struct){a.x+=nx*over*ka;a.y+=ny*over*ka;}if(!b.struct){b.x-=nx*over*kb;b.y-=ny*over*kb;}}
      if(vn<=0)continue;
      if(!a.struct){const dx=(1+COLLIDE_BOUNCE)*vn*ka*nx,dy=(1+COLLIDE_BOUNCE)*vn*ka*ny;a.vx+=dx;a.vy+=dy;a.vh=Math.atan2(a.vy,a.vx);knock(a,dx,dy);}
      if(!b.struct){const dx=-(1+COLLIDE_BOUNCE)*vn*kb*nx,dy=-(1+COLLIDE_BOUNCE)*vn*kb*ny;b.vx+=dx;b.vy+=dy;b.vh=Math.atan2(b.vy,b.vx);knock(b,dx,dy);}
      const base=COLLIDE_DMG*(vn/1000)*(vn/1000)*2;
      S.m.collisions=(S.m.collisions||0)+1;
      S.fx.push({x:(ax+bx)/2,y:(ay+by2)/2,t0:S.t,kind:'hull',src:'crash',speed:vn});floater(a,'COLLISION',C.hazard);
      if(base>=1)pushEvent('collide',a.name+' and '+b.name+' collide',{ship:a.faction==='reb'?a.id:b.id,x:a.x,y:a.y,tone:'hazard'});
      bump(a,b,nx,ny,vn,base*ka,'ship',ka);bump(b,a,-nx,-ny,vn,base*kb,'ship',kb);
      for(const q of [a,b])if(q.alive&&base>=1)say(q,pickLine(q,'bump'),'hazard',true);
      if(!a.alive)break;
    }
  }
}

/* ---------- jumps: a withdrawing ship (or the convoy) inside the jump point leaves, unless it is jammed ---------- */
const jumpR=()=>(HK.jumpR&&HK.jumpR())||JUMP_R;   // a layer can widen the jump point (Type 3.5: a fighter at full speed can't turn inside 350)
function jumpCheck(){
  const ex=S.R.extract||'jump';
  for(const s of S.ships){
    if(!s.alive||s.faction!=='reb'||s.struct)continue;
    const leaving=s.beh&&(s.beh.kind==='withdraw'||s.beh.kind==='convoy'||s.beh.kind==='wait');
    const key=s.quiet?s.to:ex,p=S.points[key];
    if(!leaving||!p||jammed(key))continue;
    if(HK.canJump&&HK.canJump(s)===false)continue;
    if(dist(s,p)<=jumpR()){
      s.alive=false;s.jumped=true;s.jumpT=S.t;
      pushEvent('jump',s.name+' jumps out',{x:p.x,y:p.y,ship:s.id,tone:'good'});
    }
  }
}

/* =====================================================================
   The reinforcement clock (§2.1): always on. At zero a dangerous Hegemony force arrives and it is time to get out
   ===================================================================== */
function clockLeft(){return Math.max(0,S.reinforce.secs-S.t);}
/* waves (hc2): forces that arrive on their own clock before the reinforcements, without flipping the objective */
function waveTick(){
  for(const wv of S.waves){
    if(wv.spawned||S.t<wv.at-1e-9)continue;
    wv.spawned=true;spawnAtEdge(wv.edge||'E',wv.force,wv.role||'hunt');
    pushEvent('wave',wv.text||'Hegemony wave inbound',Object.assign(zoneEdge(wv.edge||'E',-400),{tone:'hazard'}));
  }
}
function spawnAtEdge(e,force,role){
  const n=force.reduce((a,f)=>a+(f.n||1),0),grp=++S.grpN;let i=0;
  for(const f of force)for(let k=0;k<(f.n||1);k++){
    const u=(i+0.5)/n;i++;
    const p=zoneEdge(e,1200),zw=Z.x1-Z.x0,zh=Z.y1-Z.y0;   // from out beyond the play area's edge, spread along it
    const at=e==='E'||e==='W'?[p.x,Z.y0+zh*(0.25+0.5*u),e==='E'?Math.PI:0]:[Z.x0+zw*(0.25+0.5*u),p.y,e==='N'?Math.PI/2:-Math.PI/2];
    spawnEnemies(Object.assign({},f,{n:1,at,role:f.role||role,grp}),()=>++S.eN);
  }
}
function reinforceTick(){
  const RF=S.reinforce;
  if(RF.spawned||S.t<RF.secs-1e-9)return;
  RF.spawned=true;S.getOut=true;
  const e=RF.edge||'E';
  spawnAtEdge(e,RF.force,'hunt');
  pushEvent('reinforce','Hegemony reinforcements: get out',Object.assign(zoneEdge(e,-400),{tone:'hazard'}));
}

/* =====================================================================
   Objectives: destroy, escort to a point, capture a point, protect until the clock, board a station
   ===================================================================== */
function objTick(){
  for(const o of S.objectives){
    if(o.state!=='live')continue;
    let done=false,fail=false;
    if(o.kind==='destroy')done=o.targets.every(id=>{const t=byId(id);return !t||!t.alive;});
    else if(o.kind==='escort'){const s=byId(o.ship);if(s&&s.jumped)done=true;else if(!s||!s.alive)fail=true;}
    else if(o.kind==='protect'){const s=byId(o.ship);if(!s||!s.alive)fail=true;else if(S.getOut)done=true;}
    else if(o.kind==='board'){const s=byId(o.station);if(s&&s.boarded)done=true;else if(!s||!s.alive)fail=true;}
    const at=objPlace(o);
    if(done){o.state='done';o.doneT=S.t;
      if(o.cpReward){S.cp=Math.min(S.cpMax,S.cp+o.cpReward);}
      pushEvent('objective',o.text+(o.cpReward?' · +'+o.cpReward+' CP':''),{tone:'good',x:at.x,y:at.y});}
    if(fail){o.state='failed';pushEvent('objective','Failed: '+o.text,{tone:'hazard',x:at.x,y:at.y});}
  }
}
/* where an objective's feed entries point the camera: its own place, else its ship, station, target or point */
function objPlace(o){
  if(o.at)return o.at;
  const sh=byId(o.ship||o.station||(o.targets&&o.targets[0]));if(sh)return {x:sh.x,y:sh.y};
  const p=S.points[o.point||o.to||'jump'];return p?{x:p.x,y:p.y}:{x:W/2,y:H/2};
}
function objText(){
  if(S.over)return S.over.why;
  if(S.getOut)return 'GET OUT: withdraw every wing to the jump point';
  const live=S.objectives.filter(o=>o.state==='live');
  if(!live.length)return 'Objectives complete: withdraw to the jump point';
  return live[0].text;
}
/* the mission ends when nothing of yours is left on the map (down or jumped), or on Abort */
function overCheck(){
  if(S.over)return;
  const mine=S.ships.filter(s=>s.faction==='reb'&&!s.struct);
  if(mine.some(s=>s.alive))return;
  endMission(null);
}
function endMission(how){
  let left=0;
  if(how==='leave')for(const s of S.ships)if(s.alive&&s.faction==='reb'&&!s.struct){s.alive=false;s.leftBehind=true;left++;}   // Leave now: whoever hasn't jumped is lost
  const prim=S.objectives.filter(o=>o.primary);
  const won=how!=='abort'&&prim.every(o=>o.state==='done');
  const lost=S.ships.filter(s=>s.faction==='reb'&&!s.struct&&!s.alive&&!s.jumped).length;
  const outcome=how==='abort'?'aborted':won?'won':'lost';
  S.over={outcome,win:won,how:how||'done',why:outcome==='aborted'?'Mission aborted':won?'Mission complete':'Mission failed',lost,leftBehind:left,jumped:S.ships.filter(s=>s.jumped).length,t:+S.t.toFixed(2)};
  pushEvent('over',S.over.why+' · '+lost+' lost'+(left?' ('+left+' left behind)':''),{tone:won?'good':'hazard'});
}
/* Jump Out (C-69): once the primaries are done or the clock has run out, every wing withdraws to the jump point; the
   mission completes as the last ship jumps. Leave now ends it at once, counting anyone not yet out as lost */
const objectivesDone=()=>S.objectives.filter(o=>o.primary).every(o=>o.state==='done');
function jumpOutState(){
  if(!S||S.over)return null;
  if(!objectivesDone()&&!S.getOut)return null;
  const key=S.R.extract||'jump',mine=S.ships.filter(s=>s.faction==='reb'&&!s.struct&&!s.quiet);
  return {why:objectivesDone()?'complete':'getout',jammed:jammed(key),started:S.jumpOutT!=null,away:mine.filter(s=>s.jumped).length,left:mine.filter(s=>s.alive).length,of:mine.length};
}
function jumpOut(){
  const st=jumpOutState();
  if(!st)return {ok:false,why:'the objectives aren\'t done yet'};
  if(st.jammed)return {ok:false,why:'the jump point is jammed'};
  for(const w of S.wings)if(wingShips(w).length){setOrder(w.id,'withdraw');for(const s of wingShips(w))s.recall=false;}
  S.jumpOutT=S.t;S.m.byCommand.jumpout=(S.m.byCommand.jumpout||0)+1;
  pushEvent('command','All wings: jump out',{x:extractPoint().x,y:extractPoint().y,tone:'good'});
  return {ok:true};
}
function leaveNow(){
  if(!S||S.over)return {ok:false,why:'the mission is over'};
  S.m.byCommand.leave=(S.m.byCommand.leave||0)+1;
  endMission('leave');return {ok:true};
}

/* ---------- capture and boarding: progress while the ships are there and the point isn't contested ---------- */
const boardR=st=>BOARD_R+shieldRStruct(st);
const shieldRStruct=st=>44*SHIP_SCALE*SRDB.visualSize(st.row.size);
function captureTick(dt){
  for(const k in S.points){
    const p=S.points[k];if(!p.capture||p.owner==='reb')continue;
    const mine=S.ships.filter(x=>x.alive&&x.faction==='reb'&&x.beh&&x.beh.kind==='capture'&&x.beh.point===k&&dist(x,p)<=CAPTURE_R);
    const foes=S.ships.filter(x=>x.alive&&x.faction==='heg'&&!x.struct&&dist(x,p)<=CAPTURE_R*1.5);
    p.contested=mine.length>0&&foes.length>0;
    if(!mine.length||foes.length)continue;
    p.prog=Math.min(1,(p.prog||0)+dt/CAPTURE_SECS);
    const o=S.objectives.find(x=>x.kind==='capture'&&x.point===k);if(o)o.prog=p.prog;
    if(p.prog>=1){
      p.owner='reb';
      pushEvent('capture',(wingOf(mine[0].wing)||{name:mine[0].name}).name+' takes the '+(p.label||k).toLowerCase(),{x:p.x,y:p.y,tone:'good'});
      if(o&&o.state==='live'){o.state='done';o.doneT=S.t;if(o.cpReward)S.cp=Math.min(S.cpMax,S.cp+o.cpReward);pushEvent('objective',o.text+(o.cpReward?' · +'+o.cpReward+' CP':''),{x:p.x,y:p.y,tone:'good'});}
    }
  }
}
function boardTick(dt){
  for(const st of S.ships){
    if(!st.alive||!st.struct||st.faction!=='heg')continue;
    const mine=S.ships.filter(x=>x.alive&&x.marines&&x.beh&&x.beh.kind==='board'&&x.beh.station===st.id&&dist(x,st)<=boardR(st));
    if(!mine.length)continue;
    st.boardProg=Math.min(1,(st.boardProg||0)+dt*mine.length/BOARD_SECS);
    if(st.boardProg>=1){
      st.alive=false;st.boarded=true;st.deadT=S.t;
      pushEvent('board',(wingOf(mine[0].wing)||{name:mine[0].name}).name+' boards '+(st.label||st.name),{x:st.x,y:st.y,ship:st.id,tone:'good'});
    }
  }
}

/* =====================================================================
   The step (fixed TICK): think, fly, fight, the clock, the objectives
   ===================================================================== */
function step(){
  if(!S||S.over)return false;
  const dt=TICK/1000;
  S.t+=dt;S.tick++;
  for(const s of S.ships){s.px=s.x;s.py=s.y;s.ph=s.h;}   // where each ship was: the HUD draws between this and now (smooth at any frame rate)
  wingTick();
  hegPlanTick();
  for(const s of S.ships){
    if(!s.alive)continue;
    s.thinkT+=dt;
    if(s.thinkT>=THINK_SECS-1e-9){s.thinkT=0;think(s);}
    goalOf(s);
  }
  for(const s of S.ships)if(s.alive)fly(s,dt);
  collideTick();
  for(const s of S.ships){
    if(!s.alive)continue;
    s.trail.push({x:s.x,y:s.y});if(s.trail.length>26)s.trail.shift();
    // breathing room: an unhurt pilot recovers toward their resting nerve (kills, not quiet, make them EAGER)
    if(S.t-s.hitT>=CALM_SECS&&S.t-s.calmT>=CALM_SECS){s.calmT=S.t;if(s.pilot.cool<s.pilot.rest)adjCool(s,Math.min(CALM_GAIN,s.pilot.rest-s.pilot.cool));}
    // a hull-threshold rule fires the step it is crossed, not at the next think
    if(s.faction==='reb'&&s.wing&&!s.preserved&&hullRuleDue(s))s.thinkT=THINK_SECS;
  }
  for(const s of S.ships)if(s.alive&&!s.struct){lockTick(s,dt);fireTick(s,dt);missileDoctrine(s);if(incomingMissile(s)&&!mute(s))abilityTick(s);}   // a missile coming: the abilities answer it at once, not at the next think (C-72)
  emitBursts(dt);projTick(dt);missileTick(dt);chaffTick(dt);
  S.fx=S.fx.filter(f=>S.t-f.t0<1);
  moraleTick();pinTick();
  captureTick(dt);boardTick(dt);
  S.decoys=S.decoys.filter(d=>d.until>S.t);
  jumpCheck();
  waveTick();
  reinforceTick();
  objTick();
  overCheck();
  if(HK.step)HK.step(dt);
  return true;
}
function runFor(secs){const n=Math.round(secs*1000/TICK);for(let i=0;i<n&&!S.over;i++)step();return S.t;}

/* =====================================================================
   The player's levers (§4): orders and tactics per wing
   ===================================================================== */
function orderAllowed(w,kind){
  if(!ORDERS[kind])return 'no such order';
  if(kind==='board'&&!wingShips(w).some(s=>s.marines))return 'no marines in this wing';
  return null;
}
function setOrder(wid,kind,target){
  const w=wingOf(wid);if(!w)return {ok:false,why:'no such wing'};
  const why=orderAllowed(w,kind);if(why)return {ok:false,why};
  if(ORDERS[kind].targeted&&!target)target=defaultTarget(w,kind);
  if(ORDERS[kind].targeted&&!target)return {ok:false,why:'no target'};
  w.order={kind,target:target||null,t:S.t};
  if(kind==='hold')w.hold=target&&target.type==='pos'?{x:target.x,y:target.y}:wingCentre(w);
  S.m.orders++;S.m.byOrder[kind]=(S.m.byOrder[kind]||0)+1;
  answerAlert();
  for(const sid of w.ships){const s=byId(sid);if(s)s.thinkT=THINK_SECS;}   // re-decide on the next step
  return {ok:true};
}
function setTactic(wid,key){
  const w=wingOf(wid);if(!w||!HC_TACTICS[key])return {ok:false,why:'no such tactic'};
  w.tactic=key;S.m.tactics++;S.m.byTactic[key]=(S.m.byTactic[key]||0)+1;
  return {ok:true};
}
/* what a targeted order aims at by default: the first thing its chip row offers */
function defaultTarget(w,kind){const c=targetChips(w,kind);return c.length?c[0].target:null;}
/* the TARGET chips (§3.4): objectives, ship classes present, stations; allies for Escort */
function targetChips(w,kind){
  const out=[];
  if(kind==='escort'){
    for(const s of S.ships)if(s.alive&&s.faction==='reb'&&!s.struct&&s.wing!==w.id)out.push({label:s.name,kind:'ally',target:{type:'ship',id:s.id}});
    return out;
  }
  if(kind==='defend'){
    for(const s of S.ships)if(s.alive&&s.faction==='reb'&&s.wing!==w.id&&(s.quiet||s.struct||s.wing))out.push({label:s.name,kind:'ally',target:{type:'ship',id:s.id}});
    for(const k in S.points)out.push({label:S.points[k].label||k,kind:'point',target:{type:'point',id:k}});
    const c=wingCentre(w);out.push({label:'Here',kind:'point',target:{type:'pos',x:Math.round(c.x),y:Math.round(c.y)}});
    return out;
  }
  if(kind==='intercept'){
    for(const t of S.ships)if(t.alive&&t.faction==='heg'&&!t.struct)out.push({label:t.name,kind:t.flagship?'objective':'class',target:{type:'ship',id:t.id}});
    return out;
  }
  if(kind==='capture'){
    for(const k in S.points)if(S.points[k].capture&&S.points[k].owner!=='reb')out.push({label:S.points[k].label||k,kind:'objective',target:{type:'point',id:k}});
    return out;
  }
  if(kind==='board'){
    for(const t of S.ships)if(t.alive&&t.faction==='heg'&&t.struct)out.push({label:t.label||t.name,kind:'station',target:{type:'station',id:t.id}});
    return out;
  }
  if(kind==='attack'){
    for(const o of S.objectives)if(o.state==='live'&&o.kind==='destroy')for(const id of o.targets){const t=byId(id);if(t&&t.alive)out.push({label:t.label||t.name,kind:'objective',target:{type:'obj',id}});}
    const seen={};
    for(const t of S.ships)if(t.alive&&t.faction==='heg'&&!t.struct&&!seen[t.cls]){seen[t.cls]=1;out.push({label:rowOf(t.cls).name.split(' ').pop()+'s',kind:'class',target:{type:'class',cls:t.cls}});}
    for(const t of S.ships)if(t.alive&&t.faction==='heg'&&t.struct&&!out.some(c=>c.target.id===t.id))out.push({label:t.label||t.name,kind:'station',target:{type:'station',id:t.id}});
  }
  return out;
}
function targetLabel(o){
  if(!o||!o.target)return '';
  const t=o.target;
  if(t.type==='class'){const r=rowOf(t.cls);return r?r.name.split(' ').pop()+'s':t.cls;}
  if(t.type==='point'){const p=S.points[t.id];return p?p.label:'here';}
  if(t.type==='pos')return 'here';
  const s=byId(t.id);return s?(s.label||s.name):t.id;
}

/* ---------- determinism ---------- */
function stateHash(){
  const str=S.ships.map(s=>[s.id,s.x.toFixed(2),s.y.toFixed(2),s.h.toFixed(3),(+s.hull).toFixed(2),(+s.arm).toFixed(2),totalShield(s).toFixed(2),Math.round(s.pilot.cool),s.alive?1:0,s.jumped?1:0,s.st.shots,s.st.hits].join(',')).join('|')+
    '#'+S.proj.length+'/'+S.missiles.length+'#'+S.cp+'#'+S.objectives.map(o=>o.state).join(',')+'#'+(S.over?S.over.outcome:'');
  let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16);
}

let HC_CP=5;              // the command point pool when a scenario sets none. placeholder

/* the panel's numbers: every one a named constant with a getter (the SALVAGE_PER_HP_ pattern) */
const TUNE={
  HC_MAP:{get:()=>HC_MAP,set:v=>{HC_MAP=v;},min:1,max:48,step:0.5,label:'Map size × (on restart)'},
  HC_SPREAD:{get:()=>HC_SPREAD,set:v=>{HC_SPREAD=v;},min:1,max:12,step:0.25,label:'Scenario spread × (on restart)'},
  RANGE_MULT:{get:()=>RANGE_MULT,set:v=>{RANGE_MULT=v;},min:0.5,max:4,step:0.1,label:'Weapon range × (on restart)'},
  SEP_R:{get:()=>SEP_R,set:v=>{SEP_R=v;},min:60,max:600,step:10,label:'Personal space'},
  AVOID_T:{get:()=>AVOID_T,set:v=>{AVOID_T=v;},min:0,max:4,step:0.1,label:'Crash look-ahead (s)'},
  AVOID_PAD:{get:()=>AVOID_PAD,set:v=>{AVOID_PAD=v;},min:0,max:400,step:10,label:'Crash avoidance room'},
  AVOID_W:{get:()=>AVOID_W,set:v=>{AVOID_W=v;},min:0,max:8,step:0.25,label:'Crash avoidance strength'},
  COLLIDE_DMG:{get:()=>COLLIDE_DMG,set:v=>{COLLIDE_DMG=v;},min:0,max:200,step:5,label:'Collision damage (at 1,000/s)'},
  COLLIDE_K:{get:()=>COLLIDE_K,set:v=>{COLLIDE_K=v;},min:0.5,max:3,step:0.05,label:'Collision size × hull'},
  LOCK_CONE:{get:()=>LOCK_CONE,set:v=>{LOCK_CONE=v;},min:0.2,max:1.6,step:0.05,label:'Lock cone (rad, half)'},
  LOCK_RATE:{get:()=>LOCK_RATE,set:v=>{LOCK_RATE=v;},min:0.1,max:4,step:0.1,label:'Lock gained a second'},
  LOCK_LOSS:{get:()=>LOCK_LOSS,set:v=>{LOCK_LOSS=v;},min:0.1,max:5,step:0.1,label:'Lock lost a second'},
  MISSILE_LOCK:{get:()=>MISSILE_LOCK,set:v=>{MISSILE_LOCK=v;},min:0.1,max:1,step:0.05,label:'Lock a missile needs'},
  MIS_RANGE_K:{get:()=>MIS_RANGE_K,set:v=>{MIS_RANGE_K=v;},min:0.5,max:4,step:0.1,label:'Missile reach × its range'},
  MIS_SPD_K:{get:()=>MIS_SPD_K,set:v=>{MIS_SPD_K=v;},min:4,max:30,step:0.5,label:'Missile speed (dial units)'},
  MIS_TURN:{get:()=>MIS_TURN,set:v=>{MIS_TURN=v;},min:1,max:15,step:0.25,label:'Missile turn (rad/s)'},
  MIS_LIFE:{get:()=>MIS_LIFE,set:v=>{MIS_LIFE=v;},min:1,max:20,step:0.5,label:'Missile life (s), then it explodes'},
  LOCK_AIM:{get:()=>LOCK_AIM,set:v=>{LOCK_AIM=v;},min:0,max:0.95,step:0.05,label:'A full lock takes this off gun spread'},
  LOCK_GUN_K:{get:()=>LOCK_GUN_K,set:v=>{LOCK_GUN_K=v;},min:0.5,max:3,step:0.1,label:'Lock reach without missiles × gun reach'},
  CHAFF_N:{get:()=>CHAFF_N,set:v=>{CHAFF_N=v;},min:0,max:6,step:1,label:'Chaff a sortie'},
  CHAFF_P:{get:()=>CHAFF_P,set:v=>{CHAFF_P=v;},min:0,max:1,step:0.05,label:'Chaff draws a missile off (chance)'},
  CHAFF_T:{get:()=>CHAFF_T,set:v=>{CHAFF_T=v;},min:0.2,max:4,step:0.1,label:'Auto chaff: a missile this many s out'},
  MIS_SHAKE:{get:()=>MIS_SHAKE,set:v=>{MIS_SHAKE=v;},min:0,max:2.5,step:0.1,label:'A break shakes a missile × its missing lock'},
  MIS_BREAK_T:{get:()=>MIS_BREAK_T,set:v=>{MIS_BREAK_T=v;},min:0,max:3,step:0.1,label:'Break from a missile at (s out)'},
  COLLIDE_BOUNCE:{get:()=>COLLIDE_BOUNCE,set:v=>{COLLIDE_BOUNCE=v;},min:0,max:1,step:0.05,label:'Collision bounce'},
  SHIELD_CD:{get:()=>SHIELD_CD,set:v=>{SHIELD_CD=v;},min:2,max:90,step:1,label:'Boost Shields recharge (s)'},
  SHOW_DMG:{get:()=>SHOW_DMG,set:v=>{SHOW_DMG=v?1:0;},min:0,max:1,step:1,label:'Damage numbers (1 = on)'},
  SPAWN_GAP:{get:()=>SPAWN_GAP,set:v=>{SPAWN_GAP=v;},min:150,max:800,step:10,label:'Starting spacing (on restart)'},
  THINK_SECS:{get:()=>THINK_SECS,set:v=>{THINK_SECS=v;},min:0.1,max:2,step:0.1,label:'Think every (s)'},
  ROUND_SECS:{get:()=>ROUND_SECS,set:v=>{ROUND_SECS=v;},min:1,max:6,step:0.25,label:'Top dial move takes (s)'},
  SPEED_SCALE:{get:()=>SPEED_SCALE,set:v=>{SPEED_SCALE=v;},min:0.5,max:8,step:0.05,label:'Speed ×'},
  CORNER:{get:()=>CORNER,set:v=>{CORNER=v;},min:0.3,max:1,step:0.05,label:'Corner speed (× top)'},
  TURN_SCALE:{get:()=>TURN_SCALE,set:v=>{TURN_SCALE=v;},min:1,max:10,step:0.25,label:'Tightest turn (× the dial\'s radius)'},
  TURN_CROSS:{get:()=>HC_TURN['ft-4-cross'],set:v=>{HC_TURN['ft-4-cross']=v;},min:0.5,max:3,step:0.05,label:'Cross turn ×'},
  TURN_BLEED:{get:()=>TURN_BLEED,set:v=>{TURN_BLEED=v;},min:0,max:3,step:0.05,label:'Turning bleeds (× top speed a s)'},
  THRUST_K:{get:()=>THRUST_K,set:v=>{THRUST_K=v;},min:0.1,max:3,step:0.05,label:'Thrust (× top speed a s)'},
  TURN_K:{get:()=>TURN_K,set:v=>{TURN_K=v;},min:0.5,max:8,step:0.25,label:'Autopilot turn gain'},
  SLIP_NOSE:{get:()=>SLIP_NOSE,set:v=>{SLIP_NOSE=v;},min:0,max:0.8,step:0.02,label:'Nose leads by (rad)'},
  CRUISE:{get:()=>CRUISE,set:v=>{CRUISE=v;},min:0.3,max:1,step:0.05,label:'Cruise (× top speed)'},
  CONVOY_SPD:{get:()=>CONVOY_SPD,set:v=>{CONVOY_SPD=v;},min:0.2,max:1,step:0.05,label:'Convoy speed (× top)'},
  ENGAGE_FRAC:{get:()=>ENGAGE_FRAC,set:v=>{ENGAGE_FRAC=v;},min:0.2,max:1,step:0.05,label:'Fighting range (× gun range)'},
  FORM_GAP:{get:()=>FORM_GAP,set:v=>{FORM_GAP=v;},min:60,max:1000,step:10,label:'Formation gap'},
  DISENGAGE_R:{get:()=>DISENGAGE_R,set:v=>{DISENGAGE_R=v;},min:0,max:5000,step:50,label:'Withdrawing ships steer wide by'},
  THREAT_R:{get:()=>THREAT_R,set:v=>{THREAT_R=v;},min:0,max:2,step:0.05,label:'Turn on attackers within (× gun range)'},
  ESCORT_R:{get:()=>ESCORT_R,set:v=>{ESCORT_R=v;},min:400,max:5000,step:50,label:'Escort reach'},
  JUMP_R:{get:()=>JUMP_R,set:v=>{JUMP_R=v;},min:100,max:600,step:20,label:'Jump point radius'},
  DETECT_R:{get:()=>DETECT_R,set:v=>{DETECT_R=v;},min:500,max:6000,step:50,label:'Patrol detection'},
  GUARD_R:{get:()=>GUARD_R,set:v=>{GUARD_R=v;},min:400,max:3000,step:50,label:'Guard radius'},
  LEASH_R:{get:()=>LEASH_R,set:v=>{LEASH_R=v;},min:800,max:10000,step:100,label:'Patrol leash'},
  EXTEND_K:{get:()=>EXTEND_K,set:v=>{EXTEND_K=v;},min:0.3,max:4,step:0.1,label:'Runs extend past (× gun reach)'},
  PASS_K:{get:()=>PASS_K,set:v=>{PASS_K=v;},min:0.05,max:1,step:0.05,label:'Runs break off at (× gun reach)'},
  EXT_MAX:{get:()=>EXT_MAX,set:v=>{EXT_MAX=v;},min:2,max:30,step:1,label:'An extension lasts at most (s)'},
  STALE_SECS:{get:()=>STALE_SECS,set:v=>{STALE_SECS=v;},min:1,max:15,step:0.5,label:'Break off a fight without a shot after (s)'},
  AUTO_SECS:{get:()=>AUTO_SECS,set:v=>{AUTO_SECS=v;},min:0.5,max:5,step:0.5,label:'AUTO re-thinks every (s)'},
  AUTO_HOLD:{get:()=>AUTO_HOLD,set:v=>{AUTO_HOLD=v;},min:0,max:20,step:1,label:'AUTO holds a choice (s)'},
  AUTO_HURT:{get:()=>AUTO_HURT,set:v=>{AUTO_HURT=v;},min:0,max:1,step:0.05,label:'AUTO goes Defensive under hull'},
  AUTO_ODDS:{get:()=>AUTO_ODDS,set:v=>{AUTO_ODDS=v;},min:1,max:4,step:0.1,label:'AUTO goes Defensive at odds'},
  LEAD_LOSS:{get:()=>LEAD_LOSS,set:v=>{LEAD_LOSS=v;},min:0,max:1,step:0.05,label:'Leaderless cohesion ×'},
  PROMOTE_SECS:{get:()=>PROMOTE_SECS,set:v=>{PROMOTE_SECS=v;},min:0,max:30,step:1,label:'Promote after (s)'},
  HC_CP:{get:()=>HC_CP,set:v=>{HC_CP=v;},min:0,max:10,step:1,label:'Command points (no scenario value)'},
  NERVE_K:{get:()=>NERVE_K,set:v=>{NERVE_K=v;},min:0,max:2,step:0.05,label:'Nerve losses ×'},
  CALM_SECS:{get:()=>CALM_SECS,set:v=>{CALM_SECS=v;},min:1,max:10,step:0.5,label:'Calm nerve every (s)'},
  COMMIT_SECS:{get:()=>COMMIT_SECS,set:v=>{COMMIT_SECS=v;},min:0,max:8,step:0.5,label:'Stay on a target at least (s)'},
  DEFEND_WATCH:{get:()=>DEFEND_WATCH,set:v=>{DEFEND_WATCH=v;},min:1000,max:15000,step:250,label:'Defenders watch this far out'},
  INTERPOSE_K:{get:()=>INTERPOSE_K,set:v=>{INTERPOSE_K=v;},min:0.1,max:0.9,step:0.05,label:'Get between at this share of the way'},
  DEFEND_R:{get:()=>DEFEND_R,set:v=>{DEFEND_R=v;},min:400,max:5000,step:50,label:'Defend reach'},
  HOLD_R:{get:()=>HOLD_R,set:v=>{HOLD_R=v;},min:400,max:5000,step:50,label:'Hold reach'},
  CAPTURE_R:{get:()=>CAPTURE_R,set:v=>{CAPTURE_R=v;},min:100,max:800,step:20,label:'Capture radius'},
  CAPTURE_SECS:{get:()=>CAPTURE_SECS,set:v=>{CAPTURE_SECS=v;},min:2,max:40,step:1,label:'Capture takes (s)'},
  BOARD_R:{get:()=>BOARD_R,set:v=>{BOARD_R=v;},min:100,max:800,step:20,label:'Boarding radius'},
  BOARD_SECS:{get:()=>BOARD_SECS,set:v=>{BOARD_SECS=v;},min:2,max:60,step:1,label:'Boarding takes (ship-s)'},
  MORALE_EAGER:{get:()=>MORALE_EAGER,set:v=>{MORALE_EAGER=v;},min:50,max:100,step:1,label:'EAGER at nerve'},
  MORALE_SHAKEN:{get:()=>MORALE_SHAKEN,set:v=>{MORALE_SHAKEN=v;},min:10,max:80,step:1,label:'SHAKEN under nerve'},
  MORALE_PANIC:{get:()=>MORALE_PANIC,set:v=>{MORALE_PANIC=v;},min:0,max:60,step:1,label:'PANICKED under nerve'},
  STEADY_AT:{get:()=>STEADY_AT,set:v=>{STEADY_AT=v;},min:0,max:80,step:1,label:'Panic ends over nerve'},
  PANIC_FLEE:{get:()=>PANIC_FLEE,set:v=>{PANIC_FLEE=v;},min:0,max:1,step:0.05,label:'Panic: chance to flee (else freeze)'},
  SHAKEN_ODDS:{get:()=>SHAKEN_ODDS,set:v=>{SHAKEN_ODDS=v;},min:1,max:6,step:1,label:'SHAKEN hangs back at odds'},
  SHAKEN_DISENGAGE:{get:()=>SHAKEN_DISENGAGE,set:v=>{SHAKEN_DISENGAGE=v;},min:1,max:3,step:0.1,label:'SHAKEN falls back sooner ×'},
  BARK_GAP:{get:()=>BARK_GAP,set:v=>{BARK_GAP=v;},min:0,max:20,step:0.5,label:'A pilot speaks at most every (s)'},
  PIN_N:{get:()=>PIN_N,set:v=>{PIN_N=v;},min:1,max:5,step:1,label:'Pinned by (guns on it)'},
  PRES_HULL:{get:()=>PRES_HULL,set:v=>{PRES_HULL=v;},min:0.05,max:0.9,step:0.05,label:'Preservation: hull under'},
  GUARDIAN_SECS:{get:()=>GUARDIAN_SECS,set:v=>{GUARDIAN_SECS=v;},min:0.5,max:10,step:0.5,label:'Guardian: hit within (s)'},
  GUARDIAN_R:{get:()=>GUARDIAN_R,set:v=>{GUARDIAN_R=v;},min:500,max:12000,step:100,label:'Guardian: reach'},
  ESCAPE_K:{get:()=>ESCAPE_K,set:v=>{ESCAPE_K=v;},min:1,max:5,step:0.1,label:'Formation: escaped at (× gun range)'},
  FORM_SECS:{get:()=>FORM_SECS,set:v=>{FORM_SECS=v;},min:1,max:20,step:1,label:'Formation: re-form for (s)'},
  BRING_HULL:{get:()=>BRING_HULL,set:v=>{BRING_HULL=v;},min:0.1,max:1,step:0.05,label:'Bring It Down: flagship under'},
  SAVIOUR_HULL:{get:()=>SAVIOUR_HULL,set:v=>{SAVIOUR_HULL=v;},min:0.05,max:0.9,step:0.05,label:'Saviour: friendly under'},
  CP_OVERRIDE:{get:()=>CMD_COST.override,set:v=>{CMD_COST.override=v;},min:0,max:5,step:1,label:'Patriot Override (CP)'},
  CP_RECALL:{get:()=>CMD_COST.recall,set:v=>{CMD_COST.recall=v;},min:0,max:5,step:1,label:'Emergency Recall (CP)'},
  CP_REINFORCE:{get:()=>CMD_COST.reinforce,set:v=>{CMD_COST.reinforce=v;},min:0,max:5,step:1,label:'Reinforcement Request (CP)'},
  CP_SUPPORT:{get:()=>CMD_COST.support,set:v=>{CMD_COST.support=v;},min:0,max:5,step:1,label:'Emergency Support (CP)'},
  CP_RECON:{get:()=>CMD_COST.recon,set:v=>{CMD_COST.recon=v;},min:0,max:5,step:1,label:'Recon Sweep (CP)'},
  CP_DECOY:{get:()=>CMD_COST.decoy,set:v=>{CMD_COST.decoy=v;},min:0,max:5,step:1,label:'Decoy Signal (CP)'},
  OVERRIDE_SECS:{get:()=>OVERRIDE_SECS,set:v=>{OVERRIDE_SECS=v;},min:2,max:40,step:1,label:'Override holds (s)'},
  OVERRIDE_COOL:{get:()=>OVERRIDE_COOL,set:v=>{OVERRIDE_COOL=v;},min:25,max:100,step:1,label:'Override lifts nerve to'},
  RECON_SECS:{get:()=>RECON_SECS,set:v=>{RECON_SECS=v;},min:5,max:90,step:5,label:'Recon lasts (s)'},
  DECOY_SECS:{get:()=>DECOY_SECS,set:v=>{DECOY_SECS=v;},min:2,max:40,step:1,label:'Decoy lasts (s)'},
  DECOY_R:{get:()=>DECOY_R,set:v=>{DECOY_R=v;},min:300,max:6000,step:100,label:'Decoy draws from'},
  RECALL_BOOST:{get:()=>RECALL_BOOST,set:v=>{RECALL_BOOST=v;},min:0,max:20,step:1,label:'Recall burns at boost (s)'},
  HELP_SECS:{get:()=>HELP_SECS,set:v=>{HELP_SECS=v;},min:3,max:40,step:1,label:'A sent wingmate helps (s)'},
  RECALL_HULL:{get:()=>RECALL_HULL,set:v=>{RECALL_HULL=v;},min:0,max:1,step:0.05,label:'Recall recommended under hull'},
  PIN_CLEAR:{get:()=>PIN_CLEAR,set:v=>{PIN_CLEAR=v;},min:0.5,max:10,step:0.5,label:'Pin clears after (s)'},
  TS_SLOW:{get:()=>TIMESCALES[1],set:v=>{TIMESCALES[1]=v;},min:0.1,max:1,step:0.05,label:'Slow speed (×)'},
  TS_FAST:{get:()=>TIMESCALES[3],set:v=>{TIMESCALES[3]=v;},min:1.5,max:6,step:0.5,label:'Fast speed (×)'},
  HEG_RETREAT:{get:()=>HEG_RETREAT,set:v=>{HEG_RETREAT=v;},min:0,max:0.9,step:0.05,label:'Hegemony pulls back under (hull)'},
  LURE_DIST:{get:()=>LURE_DIST,set:v=>{LURE_DIST=v;},min:1000,max:15000,step:250,label:'A lure drags defenders this far out'},
  STANDOFF_R:{get:()=>STANDOFF_R,set:v=>{STANDOFF_R=v;},min:1000,max:15000,step:250,label:'Strikers hold off this far'},
  STRIKE_WAIT:{get:()=>STRIKE_WAIT,set:v=>{STRIKE_WAIT=v;},min:0,max:120,step:1,label:'Strikers dive anyway after (s)'},
  CLEAR_R:{get:()=>CLEAR_R,set:v=>{CLEAR_R=v;},min:500,max:8000,step:250,label:'Strikers dive when nothing of yours is this close'},
  RAID_TURN_R:{get:()=>RAID_TURN_R,set:v=>{RAID_TURN_R=v;},min:0,max:2000,step:50,label:'Raiders turn on fighters within'},
  GUN_DPS:{get:()=>GUN_DPS,set:v=>{GUN_DPS=v;},min:0.1,max:2,step:0.05,label:'Gun damage a second (× roll)'},
};

/* the tactic weight table, every weight on the panel too */
const TACTIC_W={form:[0,2,0.05,'formation'],space:[0.5,6,0.1,'spacing ×'],engage:[0.4,1.6,0.05,'fighting range ×'],focus:[0,1,1,'focus fire (0/1)'],
  flank:[0,1.5,0.05,'flank'],extend:[0.3,3,0.1,'extends ×'],pass:[0.3,3,0.1,'breaks off ×'],pursue:[0,1,1,'tail chases (0/1)'],
  disengage:[0,0.9,0.05,'falls back under hull'],leash:[0.3,2,0.05,'reach ×']};
for(const tk of PICKABLE)for(const wk in TACTIC_W){const [lo,hi,st,lb]=TACTIC_W[wk];
  TUNE['T_'+tk+'_'+wk]={get:()=>HC_TACTICS[tk][wk],set:v=>{HC_TACTICS[tk][wk]=v;},min:lo,max:hi,step:st,label:HC_TACTICS[tk].name+': '+lb,group:'Tactics'};}
/* the panel's groups (§5 T4: one HC group, sectioned) */
const GROUPS={Run:['HC_MAP','HC_SPREAD','TS_SLOW','TS_FAST','HC_CP'],
  Flight:['THINK_SECS','ROUND_SECS','SPEED_SCALE','CORNER','TURN_SCALE','TURN_CROSS','TURN_BLEED','THRUST_K','TURN_K','SLIP_NOSE','CRUISE','CONVOY_SPD','FORM_GAP','SEP_R','SPAWN_GAP','DISENGAGE_R','AVOID_T','AVOID_PAD','AVOID_W','COLLIDE_DMG','COLLIDE_K','COLLIDE_BOUNCE'],
  Fighting:['SHIELD_CD','SHOW_DMG','ENGAGE_FRAC','RANGE_MULT','THREAT_R','COMMIT_SECS','GUN_DPS','LOCK_CONE','LOCK_RATE','LOCK_LOSS','MISSILE_LOCK','MIS_RANGE_K','MIS_SPD_K','MIS_TURN','MIS_BREAK_T','MIS_SHAKE','MIS_LIFE','LOCK_AIM','LOCK_GUN_K','CHAFF_N','CHAFF_P','CHAFF_T','EXTEND_K','PASS_K','EXT_MAX','STALE_SECS','AUTO_SECS','AUTO_HOLD','AUTO_HURT','AUTO_ODDS'],
  Orders:['ESCORT_R','DEFEND_WATCH','INTERPOSE_K','DEFEND_R','HOLD_R','CAPTURE_R','CAPTURE_SECS','BOARD_R','BOARD_SECS','JUMP_R'],
  Hegemony:['DETECT_R','GUARD_R','LEASH_R','RAID_TURN_R','HEG_RETREAT','LURE_DIST','STANDOFF_R','CLEAR_R','STRIKE_WAIT'],
  Leaders:['LEAD_LOSS','PROMOTE_SECS'],
  Rules:['PRES_HULL','GUARDIAN_SECS','GUARDIAN_R','ESCAPE_K','FORM_SECS','BRING_HULL','SAVIOUR_HULL'],
  Morale:['BARK_GAP','MORALE_EAGER','MORALE_SHAKEN','MORALE_PANIC','STEADY_AT','PANIC_FLEE','SHAKEN_ODDS','SHAKEN_DISENGAGE','PIN_N','NERVE_K','CALM_SECS'],
  Commands:['CP_OVERRIDE','CP_RECALL','CP_REINFORCE','CP_SUPPORT','CP_RECON','CP_DECOY','OVERRIDE_SECS','OVERRIDE_COOL','RECON_SECS','DECOY_SECS','DECOY_R','RECALL_BOOST','HELP_SECS','RECALL_HULL','PIN_CLEAR']};
for(const g in GROUPS)for(const k of GROUPS[g])if(TUNE[k])TUNE[k].group=g;
for(const k in TUNE)if(!TUNE[k].group)TUNE[k].group='Other';

return {key:'hc',name:'Type 3: High Command',SIM_VERSION,
  get S(){return S;},get W(){return W;},get H(){return H;},get zone(){return Z;},MARGIN,RU,SU,TICK,TIMESCALES,hooks:HK,
  ORDERS,ORDER_KEYS,ORDERS_LIVE,HC_TACTICS,TACTIC_KEYS,PICKABLE,PERSONALITY,CRITDEFS,TUNE,GROUPS,RULES,RULE_KEYS,ASSESS,
  COMMANDS,COMMAND_KEYS,ABILITIES,DOCTRINES,
  say:(id,text,tone,urgent)=>say(byId(id),text,tone,urgent),
  build,step,runFor,setOrder,setTactic,jumpOutState,jumpOut,leaveNow,command,commandRefusal,respond,emergencyOpts,useAbility:(id,k)=>useAbility(byId(id),k,true),setDoctrine,abilitiesOf:id=>abilitiesOf(byId(id)),abilityTriggers:(id,k)=>abilityTriggers(byId(id),k),targetChips,targetLabel,objText,clockLeft,stateHash,endMission,pushEvent,addRule,removeRule,ruleLabel,moraleOf,assessOf,
  fn:{autoPick,runGoal,onSix,turnCap,fly,kill:destroyShip,critCount,foesOf,withdrawPoint,byId,wingOf,wingShips,wingCentre,anchorOf,pinnedBy,flagshipDisabled,outnumbered,tacticOf,capsOf,gunRange,inArc,dist,maxShield,totalShield,lockOf,personalityOf,pickLeader,think,goalOf,jammed,extractPoint,mulberry,
    THINK_SECS_:()=>THINK_SECS,spreadOf,guardThreats,collideTick,missileShot,incomingMissile,misRange,misSpd,lockTarget,lockRange,throwChaff,misWpn,evadeVec,bodyR,rockR,LEAD_LOSS_:()=>LEAD_LOSS,PROMOTE_SECS_:()=>PROMOTE_SECS,HC_CP_:()=>HC_CP,TICK_:()=>TICK,HC_MAP_:()=>HC_MAP,HC_SPREAD_:()=>HC_SPREAD,
    CRUISE_:()=>CRUISE,FORM_GAP_:()=>FORM_GAP,ENGAGE_FRAC_:()=>ENGAGE_FRAC,MISSILE_LOCK_:()=>MISSILE_LOCK,JUMP_R_:()=>jumpR(),RANGE_MULT_:()=>RANGE_MULT,BURST_N_:()=>BURST_N,ESCORT_R_:()=>ESCORT_R,
    PRES_HULL_:()=>PRES_HULL,CAPTURE_R_:()=>CAPTURE_R,BOARD_R_:()=>BOARD_R,MORALE_:()=>({EAGER:MORALE_EAGER,SHAKEN:MORALE_SHAKEN,PANIC:MORALE_PANIC}),boardR,
    // for a layer (Type 3.5): the pieces it drives the fight with
    rowOf,spawnAtEdge,spawnEnemies,zoneEdge,scaleLayout,hitShip,applyDamage,floater,say,setBeh,orbitGoal,holdOrbit,arriveGoal,bestTarget,foesOf,hullHit,hullAxes,rockHit,wdefOf,
    presetPilot,adjCool,personalityOf,endMission,projSpd,aimAngle,muzzleAt,thinkEnemy,mulberry,addWing,mkShip,LAYOUT_MAP_:()=>LAYOUT_MAP,W0_:()=>W0,H0_:()=>H0}};
})();
