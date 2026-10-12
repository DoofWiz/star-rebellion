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
const TH=SR.theme,C=TH.C;

/* ---------- the world (space.js ~20: W, H, MARGIN, RU, SU), set bigger: HC_MAP × space.js's 4200 × 3000 ---------- */
const W0=4200,H0=3000,MARGIN=120,RU=300,SU=150;
let HC_MAP=2;             // the map's size × space.js's. placeholder (each scenario may set its own)
let W=W0*HC_MAP,H=H0*HC_MAP;
const TICK=50;            // ms of sim time per step (copied from sim-sb.js). placeholder
const TIMESCALES=[0,0.3,1,3];   // pause / slow / play / fast (slow and fast on the panel). placeholder
let THINK_SECS=0.5;       // how often each ship re-decides what to do. placeholder
let ROUND_SECS=3;         // a ship's top speed covers its top dial move (straight_max SU) in this long (sim-sb.js's EXEC_LEN). placeholder
let SPEED_SCALE=1.25;     // every craft's speed range × this (copied from sim-sb.js). placeholder
let CRUISE=0.7;           // the speed a ship flies when nothing presses it, × its top speed. placeholder
let CONVOY_SPD=0.55;      // a convoy's speed, × its top speed. placeholder
let THRUST_K=1.6;         // top speed reached from rest in 1/this seconds. placeholder
let BOOST_MULT=1.6;       // a boosting ship's top speed ×. placeholder
let ENGAGE_FRAC=0.55;     // the range a ship tries to fight at, × its longest gun. placeholder
let JUMP_R=260;           // within this of the jump point (extraction) a ship jumps out. placeholder
let FORM_GAP=120;         // world units between formation slots at a tactic's spacing 1. placeholder

/* ---------- copied from space.js ~20–30 (via sim-sb.js) ---------- */
const ARCH=0.55;
const TURNS={L:-Math.PI/2,l:-Math.PI/4,S:0,r:Math.PI/4,R:Math.PI/2};
const LOCK_RNG=900;       // copied from space.js ~23
const CALM_GAIN=6;        // copied from space.js endRound ~1082 ('breathing room')
let NERVE_K=0.6;          // every nerve loss × this (High Command only). placeholder
let CALM_SECS=3;          // ...given each this many seconds a ship goes unhurt (a round's length under SB). placeholder

let S=null;

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
  const sc=SU*SPEED_SCALE/ROUND_SECS;
  return {vMax:maxSpeedOf(s)*sc,vMin:s.row.straight_min*sc,kap:kappaOf(s)||0.004};
}

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
  eager: {engage:1.25,form:0.6,disengage:0.6,label:'eager'},    // over-commits: fights closer, holds formation loosely, stays in hurt
  steady:{engage:1.0,form:1.4,disengage:1.0,label:'steady'},    // holds formation
  even:  {engage:1.0,form:1.0,disengage:1.0,label:'even'},
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
function loadout(row,list){
  const ids=(list||[row.default_weapon_1,row.default_weapon_2]).filter(id=>id&&SRDB.weapons[id]).slice(0,row.weapon_slots||2);
  return ids.map((id,i)=>{const w=wdefOf(SRDB.weapons[id]);return {key:'w'+i,w,ammo:w.ammo,cd:0};});
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
function applyDamage(t,dmg,skipShield,fromFront){
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
function hullAxes(s){const v=SRDB.visualSize(s.row.size)*SHIP_SCALE,k=s.evadeT&&S.t<s.evadeT?Math.SQRT1_2:1;return {a:HULL_LEN*v*k,b:(s.struct?HULL_LEN*v:HULL_WID*v)*k};}   // a Barrel Roll halves the profile
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
const projSpd=w=>PROJ_SPD*(KIND_SPD[w&&w.kind]||1);
const PROJ_OF={'bls-t-light-repeaters':'repeaters','missiles':'missiles','door-mounted-gun':'doorgun','pursuer-pulse-cannon':'cruiser',
  'sentry-pulse-emitter':'dronegun','monitor-pulse-emitter':'dronegun','clamper-pulse-emitter':'dronegun'};
const gunRange=s=>Math.max(300,...s.wpns.map(q=>q.w.rng));
function lockOf(s,id){return (s.locks&&s.locks[id])||0;}
function lockTick(s,dt){
  const t=byId(s.fireAt);
  if(t&&t.alive&&inArc(s,t)&&dist(s,t)<=LOCK_RNG&&!rockHit(s,t)){
    const c=Math.max(0,1-bearing(s,t)/ARCH);
    s.locks[t.id]=Math.min(1,lockOf(s,t.id)+LOCK_GAIN*c*dt);
  }
  for(const id in s.locks){
    const x=byId(id);
    if(!x||!x.alive){delete s.locks[id];continue;}
    if(!inFrontHemi(s,x))s.locks[id]=Math.max(0,s.locks[id]-LOCK_DECAY*dt);
  }
}
function aimBonus(s){return SRDB.skillBonus(s.pilot.skills?s.pilot.skills.aim:0,s.pilot.level);}
function spreadOf(s,w,d){
  let deg=SPREAD_BASE;
  if(w.kind!=='missile'){const ru=d/RU;if(ru>1)deg+=RANGE_SPREAD*(ru-1);}
  deg*=1/(1+SPREAD_AIM_K*aimBonus(s));
  if(!mute(s))deg*=1+SPREAD_NERVE_K*(1-s.pilot.cool/100);
  deg+=SPREAD_CRIT*critCount(s,'targeting');
  return deg*Math.PI/180;
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
    if(q.cd>0||!canFire(s,q,t))continue;
    q.cd=q.w.kind==='missile'?MISSILE_EVERY:BURST_EVERY;
    if(q.w.kind==='missile'){
      q.ammo--;s.st.missiles++;
      S.missiles.push({x:s.x,y:s.y,h:s.h,owner:s.id,faction:s.faction,target:t.id,w:q.w,lock:lockOf(s,t.id),life:q.w.rng/MISSILE_SPD*1.8,trail:[]});
    } else S.bursts.push({owner:s.id,faction:s.faction,w:q.w,left:BURST_N,next:0,target:t.id,fired:0,hits:0,live:0,hitT:{},id:++S.burstN,q});
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
      const h=ang+(S.rng()-0.5)*spreadOf(s,B.w,d),V=projSpd(B.w),m=muzzleAt(s,B.fired);
      S.proj.push({x:m.x,y:m.y,x0:m.x,y0:m.y,vx:Math.cos(h)*V,vy:Math.sin(h)*V,owner:s.id,faction:s.faction,w:B.w,burst:B.id,life:B.w.rng/V*1.15,age:0,style:PROJ_OF[B.w.id]});
      B.left--;B.fired++;B.live++;s.st.shots++;B.next+=BURST_GAP;
    }
  }
}
function hitShip(t,shooterId,w,vx,vy,hit,homing,lockAt){
  const s=byId(shooterId);
  const imp=impactOf(vx,vy,hit);
  const lk=lockAt!=null?lockAt:(s?lockOf(s,t.id):0);
  const roll=w.dmg[0]+Math.floor(S.rng()*(w.dmg[1]-w.dmg[0]+1));
  const share=homing?1:shotShare(),raw=roll*share*imp*(1+lk*LOCK_DMG_MAX);
  const dmg=homing?Math.max(1,Math.round(raw)):raw;
  const fromFront=(-vx*Math.cos(t.h)-vy*Math.sin(t.h))>0;
  const r=applyDamage(t,dmg,w.skipShield,fromFront);
  if(imp>=0.8&&S.rng()<(CRIT_DIRECT+(w.crit||0))*(homing?1:share/CRIT_REF))applyCritical(t);
  t.hitT=S.t;t.lastHitBy=shooterId;
  if(s){s.st.hits++;s.st.dmg+=dmg;}
  t.dmgAcc=(t.dmgAcc||0)+dmg;
  S.fx.push({x:hit.x,y:hit.y,t0:S.t,kind:r.sd>0&&r.ad+r.hd===0?'shield':'hull',h:Math.atan2(vy,vx)});
  if(r.sd>0)t.shFx={zone:r.zone,t:S.t};
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
    if(t.alive)floater(t,'-'+(t.dmgAcc<10?t.dmgAcc.toFixed(1):Math.round(t.dmgAcc)),C.hazard);
    t.dmgAcc=0;t.dmgT=null;
  }
  S.bursts=S.bursts.filter(B=>B.left>0||B.live>0);
}
function missileTick(dt){
  const kept=[];
  for(const m of S.missiles){
    const t=byId(m.target);
    m.life-=dt;
    if(t&&t.alive){const want=Math.atan2(t.y-m.y,t.x-m.x),dh=angNorm(want-m.h),cap=MISSILE_TURN*dt;m.h+=Math.max(-cap,Math.min(cap,dh));}
    const p0={x:m.x,y:m.y},p1={x:m.x+Math.cos(m.h)*MISSILE_SPD*dt,y:m.y+Math.sin(m.h)*MISSILE_SPD*dt};
    if(t&&t.alive){
      const h=hullHit(t,p0,p1);
      if(h&&!rockHit(p0,{x:h.x,y:h.y})){
        const r=hitShip(t,m.owner,m.w,p1.x-p0.x,p1.y-p0.y,h,true,m.lock);
        adjCool(t,(r.r.ad>0||r.r.hd>0)?-12:-5);
        S.fx.push({x:h.x,y:h.y,t0:S.t,kind:'boom',size:0.7});
        continue;
      }
    }
    if(rockHit(p0,p1)||m.life<=0){S.fx.push({x:p1.x,y:p1.y,t0:S.t,kind:'boom',size:0.5});continue;}
    m.x=p1.x;m.y=p1.y;m.trail.push({x:m.x,y:m.y});if(m.trail.length>14)m.trail.shift();
    kept.push(m);
  }
  S.missiles=kept;
}
function destroyShip(t,killer){   // sim-sb.js destroyShip (space.js ~1026–1037), plus the feed and the wing
  t.alive=false;t.hull=Math.min(t.hull,0);t.deadT=S.t;
  S.fx.push({x:t.x,y:t.y,t0:S.t,kind:'boom',size:SRDB.visualSize(t.row.size)});
  floater(t,t.struct?'DESTROYED':'SPLASH',C.gold);
  if(killer&&killer.alive){killer.st.kills++;killer.killT=S.t;adjCool(killer,12);}
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
const HC_TACTICS={
  tight:    {name:'Tight Formation',line:'Close formation; every gun on one target.',form:1.0,space:1.0,engage:1.0,focus:1,flank:0,screen:0,hitrun:0,disengage:0.25,leash:1},
  spread:   {name:'Spread Out',     line:'Loose line abreast; each pilot picks their own target.',form:0.5,space:3.4,engage:1.1,focus:0,flank:0,screen:0,hitrun:0,disengage:0.25,leash:1.4},
  screen:   {name:'Screen',         line:'Hang between the protected and the threat; intercept what comes through.',form:0.8,space:2.0,engage:0.9,focus:0,flank:0,screen:1,hitrun:0,disengage:0.3,leash:0.8},
  pincer:   {name:'Pincer',         line:'Split and come at the target from both sides.',form:0.4,space:2.4,engage:1.0,focus:1,flank:1,screen:0,hitrun:0,disengage:0.25,leash:1.2},
  hitrun:   {name:'Hit and Run',    line:'Make a firing pass, extend away, come round again.',form:0.6,space:1.6,engage:1.0,focus:1,flank:0,screen:0,hitrun:1,disengage:0.3,leash:1.2},
  defensive:{name:'Defensive',      line:'Hold back, fight at range, and fall back when hurt.',form:1.2,space:1.4,engage:0.8,focus:1,flank:0,screen:0,hitrun:0,disengage:0.5,leash:0.7},
};
const TACTIC_KEYS=Object.keys(HC_TACTICS);
let HR_IN=3,HR_OUT=3;
let THREAT_R=1.1;         // a hostile this close (× gun range) with its guns on a ship is a threat it turns on. placeholder     // Hit and Run: seconds on a pass, seconds extending. placeholder
let ESCORT_R=1500;        // an escort engages what comes this close to its charge (at least a patrol's detection, so it moves first). placeholder

/* a tactic as this wing flies it: the leaderless wing's cohesion pulls every weight back toward a loose neutral */
function tacticOf(w){
  const T=HC_TACTICS[w.tactic]||HC_TACTICS.tight,k=w.cohesion==null?1:w.cohesion;
  if(k>=1)return T;
  const N={form:0.3,space:2.5,engage:1.0,focus:0,flank:0,screen:0,hitrun:0,disengage:T.disengage,leash:T.leash};
  const out=Object.assign({},T);
  for(const key of ['form','space','engage','focus','flank','screen','hitrun'])out[key]=N[key]+(T[key]-N[key])*k;
  return out;
}

/* =====================================================================
   Ships
   ===================================================================== */
const keyOf=row=>String(row.legacy_keys).split('|')[0]||row.id;
function mkShip(d){
  const r=d.row;
  const s={id:d.id,name:d.name,faction:d.faction,row:r,cls:keyOf(r),struct:r.kind==='structure',x:d.x,y:d.y,h:d.h,vh:d.h,vx:0,vy:0,w:0,
    pilot:d.pilot,lead:false,wing:d.wing||null,role:d.role||null,quiet:!!d.quiet,marines:!!d.marines,
    segs:{F:{val:r.shield_front,max:r.shield_front,at:'F'},R:{val:r.shield_rear,max:r.shield_rear,at:'R'}},
    arm:r.armour,hull:r.hull,maxArm:r.armour,maxHull:r.hull,crits:[],
    alive:true,jumped:false,trail:[],wpns:loadout(r,d.loadout),fireAt:null,locks:{},
    goal:null,beh:{kind:'idle'},intent:null,thinkT:0,calmT:0,hitT:-99,run:'in',runT:0,
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
const foesOf=s=>S.ships.filter(t=>t.alive&&t.faction!==s.faction);

/* ---------- the cast from an HC scenario entry (the v2 entry shape, grouped into wings) ---------- */
function formation(at,i,n){const [x,y,h]=at,px=-Math.sin(h),py=Math.cos(h),o=(i-(n-1)/2)*170,back=Math.abs(i-(n-1)/2)*60;return [x+px*o-Math.cos(h)*back,y+py*o-Math.sin(h)*back,h];}   // copied from arena-sb.js
function resolveScenario(scn,vi){   // copied from arena-sb.js
  const v=(scn.variants&&scn.variants[vi])||null;
  const out=Object.assign({},scn,v||{});
  out.variantLabel=v?v.label:null;
  return out;
}
function build(scn,opt){
  opt=opt||{};
  const R=resolveScenario(scn,opt.variant||0);
  const ms=R.map||HC_MAP;W=Math.round(W0*ms);H=Math.round(H0*ms);
  S={scn,R,seed:opt.seed>>>0,rng:mulberry(opt.seed>>>0),t:0,tick:0,ships:[],wings:[],rocks:(R.rocks||[]).map(r=>Object.assign({},r)),
    points:JSON.parse(JSON.stringify(R.points||{})),objectives:[],events:[],evN:0,proj:[],bursts:[],missiles:[],fx:[],floaters:[],burstN:0,
    reinforce:Object.assign({secs:240,edge:'E',force:[]},R.reinforce||{},{spawned:false}),getOut:false,
    waves:(R.waves||[]).map(w=>Object.assign({},w,{spawned:false})),
    cp:R.cp!=null?R.cp:HC_CP,cpMax:R.cp!=null?R.cp:HC_CP,rules:[],over:null,
    m:{orders:0,byOrder:{},tactics:0,byTactic:{},cpSpent:0,byCommand:{},ruleTriggers:0,byRule:{},emergencies:[],alerts:[]},
    variantLabel:R.variantLabel};
  for(const r of S.rocks)if(!r.verts){const rr=mulberry(Math.round(r.x*7+r.y*13));r.verts=[];const n=8+Math.floor(rr()*4);for(let k=0;k<n;k++)r.verts.push(0.72+rr()*0.4);r.rot=rr()*Math.PI*2;}
  S.pn=0;S.decoys=[];S.decoyN=0;S.reconUntil=0;S.reservesUsed=false;
  for(const wd of R.wings||[])addWing(wd);
  for(const a of R.allies||[]){   // quiet friendlies: not in a wing, not commandable (Convoy Lark); an installation (a station row) is yours to defend
    const row=SRDB.ship(a.cls||'graf'),inst=row.kind==='structure';
    S.ships.push(mkShip({id:a.id,name:a.name,faction:'reb',row,x:a.at[0],y:a.at[1],h:a.at[2],pilot:presetPilot(a.pilot,a.name),role:a.role||(inst?'station':'convoy'),quiet:!inst,to:a.to,stats:a.stats,label:a.label,loadout:a.loadout||[]}));
  }
  let eN=0;
  for(const e of R.enemies||[])spawnEnemies(e,()=>++eN);
  S.eN=eN;
  for(const o of R.objectives||[])S.objectives.push(Object.assign({state:'live',prog:0},o));
  S.ruleN=0;
  for(const r of R.rules||[])S.rules.push({id:++S.ruleN,rule:r.rule,scope:r.scope||'all',param:r.param||null,on:true,t:0});
  for(const s of S.ships)s.thinkT=THINK_SECS;   // everyone decides on the first step
  return S;
}
function addWing(wd){
  const w={id:wd.id,name:wd.name,ships:[],leader:null,leadLostT:null,cohesion:1,
    order:Object.assign({kind:'regroup',target:null},wd.order||{}),tactic:wd.tactic||'tight',hold:null};
  wd.ships.forEach((sd,i)=>{
    S.pn++;
    const at=sd.at||formation(wd.at||[900,H*0.5,0],i,wd.ships.length);
    const row=SRDB.ship(sd.cls||'talon')||SRDB.ship('talon'),nm=sd.name||(wd.name+' '+(i+1));
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
  const n=e.id?1:(e.n||1),r=Enemies.space(e.type),row=SRDB.ship(r.ship);
  const out=[];
  for(let i=0;i<n;i++){
    const k=nextN();
    const at=e.at&&n===1?e.at:formation(e.at||[W-900,H*0.4,Math.PI],i,n);
    const label=row.name.split(' ').pop(),nm=e.name&&n===1?e.name:(e.name||label)+' '+k;
    const pilot=e.preset?presetPilot({preset:e.preset},nm):dbPilotOf(e.pilot||r.pilot,nm);
    if(r.nerve_cap!=null)pilot.coolCap=r.nerve_cap;
    const s=mkShip({id:e.id&&n===1?e.id:'E'+k,name:nm,faction:'heg',row,x:at[0],y:at[1],h:at[2],pilot,doctrine:row.kind==='structure'?null:(e.role||'patrol'),
      asset:e.asset,home:e.home||{x:at[0],y:at[1]},flees:e.flees!=null?!!e.flees:!!r.flees,stats:e.stats,label:e.label,loadout:e.loadout});
    if(e.flagship)s.flagship=true;
    if(r.lead)s.lead=true;
    S.ships.push(s);out.push(s);
  }
  return out;
}

/* =====================================================================
   The event feed (§3.1): kills, emergencies, objective progress; each with a place to look
   ===================================================================== */
function pushEvent(kind,text,o){
  o=o||{};
  const e={id:++S.evN,t:+S.t.toFixed(2),kind,text,x:o.x!=null?o.x:null,y:o.y!=null?o.y:null,ship:o.ship||null,tone:o.tone||'info',viewed:false,opts:o.opts||null};
  S.events.push(e);if(S.events.length>200)S.events.shift();
  return e;
}
function floater(s,text,col){S.floaters.push({x:s.x,y:s.y-40,text,col,t:S.t});if(S.floaters.length>60)S.floaters.shift();}

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
function extractPoint(){const p=S.points[S.R.extract||'jump'];return p||{x:80,y:H/2};}
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
  setBeh(s,beh);
  s.assess=assessOf(s);
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
    const threat=bestTarget(s,nearPoint(combat,ch,ESCORT_R*(T.leash||1)),{distW:0.5});
    if(threat)return {kind:'engage',target:threat.id,why:'escort: threat to '+ch.name,guard:ch.id};
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
    const t=bestTarget(s,nearPoint(combat,a,DEFEND_R*(T.leash||1)),{distW:0.5});
    if(t)return {kind:'engage',target:t.id,why:'defend'};
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
let DEFEND_R=1300;        // a defending wing engages what comes this close to what it guards. placeholder
let HOLD_R=1200;          // a holding wing engages what comes this close to its point. placeholder
let CAPTURE_R=320;        // a capturing ship must be this close to the point. placeholder
let CAPTURE_SECS=10;      // seconds of uncontested presence to take a point. placeholder
let BOARD_R=320;          // a marine ship must be this close to the station (plus its size). placeholder
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
      if(s.faction==='reb'&&!s.quiet){pushEvent('steady',s.name+' steadies',{ship:s.id,x:s.x,y:s.y,tone:'good'});clearEmergency(s,'steadied');}
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
let DECOY_SECS=12,DECOY_R=1600;   // Decoy Signal: how long it draws, and from how far. placeholders
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
    pushEvent('command','Patriot Override: '+x.name+' holds'+(des?' on '+byId(des).name:''),{ship:x.id,x:x.x,y:x.y,tone:'info'});
  } else if(k==='recall'){
    const list=tg.wing?wingShips(wingOf(tg.wing)):[x];
    for(const y of list){y.recall=true;y.boostT=Math.max(y.boostT||0,RECALL_BOOST);y.thinkT=THINK_SECS;respondLog(y,'recall');}
    pushEvent('command','Emergency Recall: '+(tg.wing?wingOf(tg.wing).name:x.name)+' pulls out',{ship:list[0].id,x:list[0].x,y:list[0].y,tone:'info'});
  } else if(k==='support'){
    x.segs.F.val=x.segs.F.max;x.segs.R.val=x.segs.R.max;x.shFx={zone:'F',t:S.t};
    respondLog(x,'support');
    pushEvent('command','Emergency Support: '+x.name+'\'s shields recharged',{ship:x.id,x:x.x,y:x.y,tone:'info'});
  } else if(k==='recon'){
    S.reconUntil=S.t+RECON_SECS;
    const RF=S.reinforce,f=RF.force.map(e=>(e.n||1)+' '+(e.name||e.type)).join(', ');
    const ex=RF.edge==='E'?W-400:RF.edge==='W'?400:W/2,ey=RF.edge==='N'?400:RF.edge==='S'?H-400:H/2;
    pushEvent('command','Recon Sweep: every Hegemony intent shown'+(RF.spawned?'':'; reinforcements due from the '+({E:'east',W:'west',N:'north',S:'south'}[RF.edge])+' ('+f+')'),{tone:'info',x:ex,y:ey});
  } else if(k==='decoy'){
    S.decoys.push({x:tg.x,y:tg.y,until:S.t+DECOY_SECS,id:++S.decoyN});
    pushEvent('command','Decoy Signal planted',{x:tg.x,y:tg.y,tone:'info'});
  } else if(k==='reinforce'){
    S.reservesUsed=true;addWing(S.R.reserves);
    pushEvent('command','Reinforcements: '+S.R.reserves.name+' arrives',{x:S.R.reserves.at[0],y:S.R.reserves.at[1],tone:'good'});
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
  shields:{name:'Boost Shields',cd:8,line:'Push power to the weaker shield. Auto: shields under half and under fire. Emergency: shields gone and still taking hits.'},
  lockin:{name:'Lock In',cd:14,line:'Breathe, focus: nerve +35. Auto: SHAKEN. Emergency: PANICKED.'},
  boost:{name:'Boost',cd:10,line:'Burn hard for 2 s. Auto: closing on a far target or getting out. Emergency: pinned and hurt.'},
  drift:{name:'Drift',cd:10,line:'Swing the nose (and guns) onto a pursuer while flying on. Auto: withdrawing with something behind. Emergency: withdrawing and hit.'},
  kturn:{name:'K-Turn',cd:12,line:'Flip end for end. Auto: something on its six. Emergency: on its six and hurt.'},
  barrel:{name:'Barrel Roll',cd:9,line:'Jink hard: half the hit profile for 1.5 s. Auto: pinned. Emergency: pinned under 40% hull.'},
  fieldrep:{name:'Field Repair',cd:25,line:'The leader patches the hull (+15%). Auto: under 60% hull. Emergency: under 30%.'},
};
const DOCTRINES=['AUTO','EMERG','MANUAL'];
function abilitiesOf(s){
  if(s.struct||mute(s))return [];
  const out=[];
  if(maxShield(s)>0)out.push('shields');
  out.push('lockin');
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
  switch(k){
    case 'shields':return {want:sf<0.5&&S.t-s.hitT<2,emerg:sf<=0.01&&hitNow};
    case 'lockin':return {want:mor==='SHAKEN',emerg:mor==='PANICKED'};
    case 'boost':return {want:(b.kind==='engage'&&t&&dist(s,t)>gunRange(s)*2)||b.kind==='withdraw',emerg:pinned&&hf<0.5};
    case 'drift':{const six=onSix(s);return {want:b.kind==='withdraw'&&!!six,emerg:b.kind==='withdraw'&&hitNow};}
    case 'kturn':{const six=onSix(s);return {want:!!six,emerg:!!six&&hf<0.5};}
    case 'barrel':return {want:pinned,emerg:pinned&&hf<0.4};
    case 'fieldrep':return {want:hf<0.6,emerg:hf<0.3};
  }
  return {want:false,emerg:false};
}
function useAbility(s,k,manual){
  if(!s.alive||!abilitiesOf(s).includes(k))return {ok:false,why:'not this pilot\'s'};
  s.abCd=s.abCd||{};
  if((s.abCd[k]||0)>S.t)return {ok:false,why:'recharging'};
  s.abCd[k]=S.t+ABILITIES[k].cd;
  if(k==='shields'){const z=s.segs.F.val<=s.segs.R.val?'F':'R',seg=s.segs[z];seg.val=Math.min(seg.max,seg.val+Math.ceil(0.15*maxShield(s)));s.shFx={zone:z,t:S.t};}
  else if(k==='lockin')adjCool(s,35);
  else if(k==='boost')s.boostT=2;
  else if(k==='drift')s.driftT=S.t+3;
  else if(k==='kturn'){const sp=Math.hypot(s.vx,s.vy)*0.5;s.vh=angNorm(s.vh+Math.PI);s.vx=Math.cos(s.vh)*sp;s.vy=Math.sin(s.vh)*sp;}
  else if(k==='barrel')s.evadeT=S.t+1.5;
  else if(k==='fieldrep')s.hull=Math.min(s.maxHull,s.hull+Math.ceil(0.15*s.maxHull));
  (s.abLog=s.abLog||[]).push({k,t:+S.t.toFixed(2),how:manual?'manual':s.abWhy||'auto'});
  floater(s,ABILITIES[k].name.toUpperCase(),C.shield);
  return {ok:true};
}
function abilityTick(s){
  for(const k of abilitiesOf(s)){
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
let GUARDIAN_R=3200;      // ...and its attacker is intercepted if this close. placeholder
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
  hold:['Holding here.','Station kept.'],
  capture:['Working on the {t}.','Almost have the {t}.'],
  board:['Marines away!','Docking now.'],
  shaken:['Not that one, lead, there\'s too many.','I\'ll stay on your wing for this one.'],
  fallback:['Hurt, falling back on you.','Need a breather, lead.'],
  form:['On your wing.','Forming up.'],
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
let DETECT_R=1500;        // a patrol engages what comes this close. placeholder
let GUARD_R=900;          // a guard engages what comes this close to its asset (copied from sim2.js GUARD_R). placeholder
let LEASH_R=2600;
let RAID_TURN_R=700;      // a raider turns from the station onto a fighter this close with its guns on it. placeholder         // a patrol or guard gives up a chase this far from home. placeholder
function thinkEnemy(s){
  const foes=foesOf(s).filter(t=>!t.struct);
  abilityTick(s);
  const dc=S.decoys.find(d=>Math.hypot(d.x-s.x,d.y-s.y)<DECOY_R);
  if(dc&&!s.panic){setBeh(s,{kind:'decoyed',dest:{x:dc.x,y:dc.y},why:'decoy',hard:true});return;}
  if(s.panic){const th=nearestThreat(s);setBeh(s,{kind:'flee',from:th?th.id:null,why:'panic',hard:true});return;}
  const home=s.asset&&byId(s.asset)?byId(s.asset):s.home||s;
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
let SLOT_LEAD=0.6;        // seconds of the leader's velocity a slot looks ahead. placeholder
function slotOf(s,w,T){   // this ship's place in its wing's formation: a V behind the leader, spacing by the tactic
  const lead=byId(w.leader)||wingShips(w)[0];
  if(!lead||lead===s)return null;
  const live=wingShips(w).filter(x=>x!==lead),i=live.indexOf(s);if(i<0)return null;
  const rank=Math.floor(i/2)+1,side=i%2?1:-1,g=FORM_GAP*(T.space||1);
  const bx=-g*rank*(T.space>2?0.25:0.85),by=side*g*rank;   // spread: nearly line abreast; tight: a V
  const c=Math.cos(lead.vh),sn=Math.sin(lead.vh);
  return {x:lead.x+bx*c-by*sn+lead.vx*SLOT_LEAD,y:lead.y+bx*sn+by*c+lead.vy*SLOT_LEAD,lead};
}
function orbitGoal(s,p,R){   // a ship can't stop: holding on a point is orbiting it
  const a=Math.atan2(s.y-p.y,s.x-p.x)+0.7;
  return {x:p.x+Math.cos(a)*R,y:p.y+Math.sin(a)*R};
}
function goalOf(s){
  const b=s.beh||{kind:'idle'},w=wingOf(s.wing),T=w?tacticOf(w):HC_TACTICS.tight,P=PERSONALITY[s.persona]||PERSONALITY.even,c=capsOf(s);
  s.fireAt=null;s.intent=null;s.holdFire=false;
  let g=null;
  if(b.kind==='engage'){
    const t=byId(b.target);
    if(t&&t.alive){
      s.fireAt=t.id;
      const R=gunRange(s)*ENGAGE_FRAC*(T.engage||1)*(s.faction==='reb'?P.engage:1),d=dist(s,t);
      if(t.struct||T.hitrun>=0.5){   // strafing runs: in at the target, extend past, come round
        if(s.run==='in'&&(d<R*0.45||(T.hitrun>=0.5&&S.t-s.runT>HR_IN))){s.run='out';s.runT=S.t;s.runPt={x:s.x+Math.cos(s.vh)*R*1.3-Math.sin(s.vh)*R*0.3,y:s.y+Math.sin(s.vh)*R*1.3+Math.cos(s.vh)*R*0.3};}
        if(s.run==='out'&&(dist(s,s.runPt)<120||d>R*1.4||(T.hitrun>=0.5&&S.t-s.runT>HR_OUT))){s.run='in';s.runT=S.t;}
        g=s.run==='in'?{x:t.x+(t.vx||0)*0.5,y:t.y+(t.vy||0)*0.5,spd:1,face:t}:{x:s.runPt.x,y:s.runPt.y,spd:1};
      } else {
        // pursuit: lead the target, and close to the fighting range behind it; a pincer comes in from its side
        const lt=Math.min(1.5,d/Math.max(1,c.vMax)),px=t.x+(t.vx||0)*lt,py=t.y+(t.vy||0)*lt;
        let gx=px,gy=py;
        if(d<R*1.2){const th=t.vh!=null?t.vh:t.h;gx=px-Math.cos(th)*R*0.5;gy=py-Math.sin(th)*R*0.5;}
        if(T.flank>0&&w){const i=wingShips(w).indexOf(s),side=i%2?1:-1,th=Math.atan2(t.y-s.y,t.x-s.x);gx+=-Math.sin(th)*side*R*T.flank*0.8;gy+=Math.cos(th)*side*R*T.flank*0.8;}
        const tv=Math.hypot(t.vx||0,t.vy||0);
        g={x:gx,y:gy,spd:d>R*1.3?1:clamp(tv/c.vMax+0.12,CRUISE*0.6,1),face:t};
      }
    }
  } else if(b.kind==='withdraw'){
    g=dist(s,b.dest)<500&&b.dest!==extractPoint()?Object.assign(orbitGoal(s,b.dest,320),{spd:CRUISE}):{x:b.dest.x,y:b.dest.y,spd:1};
  } else if(b.kind==='escort'){
    const ch=byId(b.charge),sl=w?slotOf(s,w,T):null;
    if(ch){
      // the wing flies a box round its charge: the leader off its beam, the rest in the leader's slots
      const off=FORM_GAP*1.6*(T.space||1),th=ch.vh!=null?ch.vh:ch.h;
      if(s.id===w.leader||!sl){const gp={x:ch.x-Math.sin(th)*off+ch.vx*1.0,y:ch.y+Math.cos(th)*off+ch.vy*1.0};g={x:gp.x,y:gp.y,spd:catchSpd(s,gp,ch)};}
      else g={x:sl.x,y:sl.y,spd:catchSpd(s,sl,sl.lead)};
      if(T.screen>0.5){   // screen: between the charge and the nearest threat
        const th2=bestTarget(s,foesOf(s).filter(x=>!x.struct&&dist(x,ch)<ESCORT_R*2.2));
        if(th2){const a=Math.atan2(th2.y-ch.y,th2.x-ch.x),sp=(wingShips(w).indexOf(s)-1)*0.35;g={x:ch.x+Math.cos(a+sp)*off*1.4,y:ch.y+Math.sin(a+sp)*off*1.4,spd:1};}
      }
    }
  } else if(b.kind==='form'){
    const sl=w?slotOf(s,w,T):null;
    if(sl)g={x:sl.x,y:sl.y,spd:catchSpd(s,sl,sl.lead)};
    else if(s.faction==='reb'){const hold=w&&w.hold||{x:s.x+Math.cos(s.vh)*400,y:s.y+Math.sin(s.vh)*400};if(w&&!w.hold)w.hold=hold;g=Object.assign(orbitGoal(s,hold,340),{spd:CRUISE});}
  } else if(b.kind==='defend'||b.kind==='hold'){
    const a=b.anchor,i=w?Math.max(0,wingShips(w).indexOf(s)):0,R=(b.kind==='hold'?300:380)*(0.8+0.25*(T.space||1))+i*70;
    g=Object.assign(orbitGoal(s,a,R),{spd:CRUISE});
  } else if(b.kind==='capture'){
    const a=b.anchor,d=dist(s,a);
    g=d>CAPTURE_R*1.5?{x:a.x,y:a.y,spd:1}:Object.assign(orbitGoal(s,a,CAPTURE_R*0.55),{spd:0});
  } else if(b.kind==='board'){
    const st=byId(b.station),d=st?dist(s,st):0;
    if(st)g=d>boardR(st)*1.4?{x:st.x,y:st.y,spd:1}:Object.assign(orbitGoal(s,st,boardR(st)*0.6),{spd:0});
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
    g={x:b.dest.x,y:b.dest.y,spd:CONVOY_SPD};
  } else if(b.kind==='wait'){
    g=Object.assign(orbitGoal(s,b.dest,JUMP_R*1.4),{spd:CONVOY_SPD*0.7});
  } else if(b.kind==='patrol'){
    g=Object.assign(orbitGoal(s,b.dest,420),{spd:CRUISE*0.8});
  }
  // opportunity fire: with nothing designated in its guns, a ship shoots at whatever hostile crosses them
  if(s.driftT&&S.t<s.driftT){const six=onSix(s);if(six)s.fireAt=six.id;}
  if(!s.holdFire&&(!s.fireAt||!byId(s.fireAt)||!inArc(s,byId(s.fireAt)))){
    const opp=foesOf(s).filter(t=>inArc(s,t)&&dist(s,t)<=gunRange(s)&&(!t.struct||(b.kind==='engage'&&b.target===t.id)));
    const o=bestTarget(s,opp);if(o)s.fireAt=o.id;   // the designated target isn't in the guns: shoot what is
  }
  if(g)s.intent={x:g.x,y:g.y};
  s.goal=g;
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
let SLIP_NOSE=0.42;       // how far the nose may lead the line of flight toward its target, radians (copied from sim-sb.js). placeholder
let NOSE_K=9,NOSE_RATE=12,NOSE_ACC=120;   // the nose (copied from sim-sb.js). placeholders
let AVOID_R=260;
let DISENGAGE_R=1100;     // a withdrawing or falling-back ship steers wide of hostiles inside this. placeholder          // rocks and the map edge push a ship's heading away inside this. placeholder
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
      if(d<DISENGAGE_R&&d>1){const w=(DISENGAGE_R-d)/DISENGAGE_R*1.6;ax+=dx/d*w;ay+=dy/d*w;}
    }
  }
  for(const o of S.ships){   // wingmates keep a little room
    if(o===s||!o.alive||o.faction!==s.faction||o.struct)continue;
    const dx=s.x-o.x,dy=s.y-o.y,d=Math.hypot(dx,dy);
    if(d<90&&d>1){ax+=dx/d*(90-d)/90;ay+=dy/d*(90-d)/90;}
  }
  return Math.atan2(ay,ax);
}
function fly(s,dt){
  if(s.struct)return;
  const c=capsOf(s),g=s.goal;
  let want=g?Math.atan2(g.y-s.y,g.x-s.x):s.vh;
  want=avoidHeading(s,want);
  const v=Math.max(c.vMin,Math.hypot(s.vx,s.vy));
  const e=angNorm(want-s.vh),wCap=Math.max(0.5,v*c.kap);
  s.vh=angNorm(s.vh+clamp(e*TURN_K,-wCap,wCap)*dt);
  const boost=s.boostT>0?BOOST_MULT:1;
  let tv=(g&&g.spd!=null?g.spd:CRUISE)*c.vMax*boost;
  if(Math.abs(e)>0.7)tv=Math.min(tv,c.vMin+(c.vMax-c.vMin)*0.45);   // a hard turn bleeds speed, so it tightens
  tv=clamp(tv,c.vMin,c.vMax*boost);
  const acc=THRUST_K*c.vMax*dt,nv=v+clamp(tv-v,-acc*1.4,acc);
  s.vx=Math.cos(s.vh)*nv;s.vy=Math.sin(s.vh)*nv;
  s.x+=s.vx*dt;s.y+=s.vy*dt;
  s.x=clamp(s.x,10,W-10);s.y=clamp(s.y,10,H-10);
  // the nose: along the line of flight, leading toward its target by up to SLIP_NOSE (sim-sb.js flyStep's nose)
  let nh=s.vh;
  const six=s.driftT&&S.t<s.driftT?onSix(s):null;
  if(six)nh=Math.atan2(six.y-s.y,six.x-s.x);   // Drift: the nose (and the guns) on the pursuer, flying on
  else if(g&&g.face){const f=g.face,off=angNorm(Math.atan2(f.y-s.y,f.x-s.x)-s.vh);if(Math.abs(off)<Math.PI*0.75)nh=s.vh+clamp(off,-SLIP_NOSE,SLIP_NOSE);}
  const en=angNorm(nh-s.h),ws=Math.sign(en)*Math.min(NOSE_RATE,NOSE_K*Math.abs(en),Math.sqrt(1.6*NOSE_ACC*Math.abs(en)));
  const al=clamp((ws-s.w)*25,-NOSE_ACC,NOSE_ACC);
  s.w=clamp(s.w+al*dt,-NOSE_RATE,NOSE_RATE);s.h=angNorm(s.h+s.w*dt);
  if(s.boostT>0)s.boostT-=dt;
}

/* ---------- jumps: a withdrawing ship (or the convoy) inside the jump point leaves, unless it is jammed ---------- */
function jumpCheck(){
  const ex=S.R.extract||'jump';
  for(const s of S.ships){
    if(!s.alive||s.faction!=='reb'||s.struct)continue;
    const leaving=s.beh&&(s.beh.kind==='withdraw'||s.beh.kind==='convoy'||s.beh.kind==='wait');
    const key=s.quiet?s.to:ex,p=S.points[key];
    if(!leaving||!p||jammed(key))continue;
    if(dist(s,p)<=JUMP_R){
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
    pushEvent('wave',wv.text||'Hegemony wave inbound',{x:wv.edge==='W'?400:wv.edge==='E'?W-400:W/2,y:wv.edge==='N'?400:wv.edge==='S'?H-400:H/2,tone:'hazard'});
  }
}
function spawnAtEdge(e,force,role){
  const n=force.reduce((a,f)=>a+(f.n||1),0);let i=0;
  for(const f of force)for(let k=0;k<(f.n||1);k++){
    const u=(i+0.5)/n;i++;
    const at=e==='E'?[W-MARGIN-60,H*(0.25+0.5*u),Math.PI]:e==='W'?[MARGIN+60,H*(0.25+0.5*u),0]:e==='N'?[W*(0.25+0.5*u),MARGIN+60,Math.PI/2]:[W*(0.25+0.5*u),H-MARGIN-60,-Math.PI/2];
    spawnEnemies(Object.assign({},f,{n:1,at,role:f.role||role}),()=>++S.eN);
  }
}
function reinforceTick(){
  const RF=S.reinforce;
  if(RF.spawned||S.t<RF.secs-1e-9)return;
  RF.spawned=true;S.getOut=true;
  const e=RF.edge||'E';
  spawnAtEdge(e,RF.force,'hunt');
  pushEvent('reinforce','Hegemony reinforcements: get out',{x:e==='E'?W-400:e==='W'?400:W/2,y:e==='N'?400:e==='S'?H-400:H/2,tone:'hazard'});
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
  const prim=S.objectives.filter(o=>o.primary);
  const won=how!=='abort'&&prim.every(o=>o.state==='done');
  const lost=S.ships.filter(s=>s.faction==='reb'&&!s.struct&&!s.alive&&!s.jumped).length;
  const outcome=how==='abort'?'aborted':won?'won':'lost';
  S.over={outcome,win:won,why:outcome==='aborted'?'Mission aborted':won?'Mission complete':'Mission failed',lost,jumped:S.ships.filter(s=>s.jumped).length,t:+S.t.toFixed(2)};
  pushEvent('over',S.over.why+' · '+lost+' lost',{tone:won?'good':'hazard'});
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
  wingTick();
  for(const s of S.ships){
    if(!s.alive)continue;
    s.thinkT+=dt;
    if(s.thinkT>=THINK_SECS-1e-9){s.thinkT=0;think(s);}
    goalOf(s);
  }
  for(const s of S.ships)if(s.alive)fly(s,dt);
  for(const s of S.ships){
    if(!s.alive)continue;
    s.trail.push({x:s.x,y:s.y});if(s.trail.length>26)s.trail.shift();
    // breathing room: an unhurt pilot recovers toward their resting nerve (kills, not quiet, make them EAGER)
    if(S.t-s.hitT>=CALM_SECS&&S.t-s.calmT>=CALM_SECS){s.calmT=S.t;if(s.pilot.cool<s.pilot.rest)adjCool(s,Math.min(CALM_GAIN,s.pilot.rest-s.pilot.cool));}
    // a hull-threshold rule fires the step it is crossed, not at the next think
    if(s.faction==='reb'&&s.wing&&!s.preserved&&hullRuleDue(s))s.thinkT=THINK_SECS;
  }
  for(const s of S.ships)if(s.alive&&!s.struct){lockTick(s,dt);fireTick(s,dt);}
  emitBursts(dt);projTick(dt);missileTick(dt);
  S.fx=S.fx.filter(f=>S.t-f.t0<1);
  moraleTick();pinTick();
  captureTick(dt);boardTick(dt);
  S.decoys=S.decoys.filter(d=>d.until>S.t);
  jumpCheck();
  waveTick();
  reinforceTick();
  objTick();
  overCheck();
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
    for(const t of S.ships)if(t.alive&&t.faction==='heg'&&!t.struct&&!seen[t.cls]){seen[t.cls]=1;out.push({label:SRDB.ship(t.cls).name.split(' ').pop()+'s',kind:'class',target:{type:'class',cls:t.cls}});}
    for(const t of S.ships)if(t.alive&&t.faction==='heg'&&t.struct&&!out.some(c=>c.target.id===t.id))out.push({label:t.label||t.name,kind:'station',target:{type:'station',id:t.id}});
  }
  return out;
}
function targetLabel(o){
  if(!o||!o.target)return '';
  const t=o.target;
  if(t.type==='class'){const r=SRDB.ship(t.cls);return r?r.name.split(' ').pop()+'s':t.cls;}
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
  HC_MAP:{get:()=>HC_MAP,set:v=>{HC_MAP=v;},min:1,max:4,step:0.25,label:'Map size × (on restart)'},
  THINK_SECS:{get:()=>THINK_SECS,set:v=>{THINK_SECS=v;},min:0.1,max:2,step:0.1,label:'Think every (s)'},
  ROUND_SECS:{get:()=>ROUND_SECS,set:v=>{ROUND_SECS=v;},min:1,max:6,step:0.25,label:'Top dial move takes (s)'},
  SPEED_SCALE:{get:()=>SPEED_SCALE,set:v=>{SPEED_SCALE=v;},min:0.5,max:3,step:0.05,label:'Speed ×'},
  CRUISE:{get:()=>CRUISE,set:v=>{CRUISE=v;},min:0.3,max:1,step:0.05,label:'Cruise (× top speed)'},
  CONVOY_SPD:{get:()=>CONVOY_SPD,set:v=>{CONVOY_SPD=v;},min:0.2,max:1,step:0.05,label:'Convoy speed (× top)'},
  ENGAGE_FRAC:{get:()=>ENGAGE_FRAC,set:v=>{ENGAGE_FRAC=v;},min:0.2,max:1,step:0.05,label:'Fighting range (× gun range)'},
  FORM_GAP:{get:()=>FORM_GAP,set:v=>{FORM_GAP=v;},min:60,max:300,step:10,label:'Formation gap'},
  DISENGAGE_R:{get:()=>DISENGAGE_R,set:v=>{DISENGAGE_R=v;},min:0,max:3000,step:50,label:'Withdrawing ships steer wide by'},
  THREAT_R:{get:()=>THREAT_R,set:v=>{THREAT_R=v;},min:0,max:2,step:0.05,label:'Turn on attackers within (× gun range)'},
  ESCORT_R:{get:()=>ESCORT_R,set:v=>{ESCORT_R=v;},min:400,max:2500,step:50,label:'Escort reach'},
  JUMP_R:{get:()=>JUMP_R,set:v=>{JUMP_R=v;},min:100,max:600,step:20,label:'Jump point radius'},
  DETECT_R:{get:()=>DETECT_R,set:v=>{DETECT_R=v;},min:500,max:3000,step:50,label:'Patrol detection'},
  GUARD_R:{get:()=>GUARD_R,set:v=>{GUARD_R=v;},min:400,max:2000,step:50,label:'Guard radius'},
  LEASH_R:{get:()=>LEASH_R,set:v=>{LEASH_R=v;},min:800,max:5000,step:100,label:'Patrol leash'},
  HR_IN:{get:()=>HR_IN,set:v=>{HR_IN=v;},min:1,max:8,step:0.5,label:'Hit & Run: pass (s)'},
  HR_OUT:{get:()=>HR_OUT,set:v=>{HR_OUT=v;},min:1,max:8,step:0.5,label:'Hit & Run: extend (s)'},
  LEAD_LOSS:{get:()=>LEAD_LOSS,set:v=>{LEAD_LOSS=v;},min:0,max:1,step:0.05,label:'Leaderless cohesion ×'},
  PROMOTE_SECS:{get:()=>PROMOTE_SECS,set:v=>{PROMOTE_SECS=v;},min:0,max:30,step:1,label:'Promote after (s)'},
  HC_CP:{get:()=>HC_CP,set:v=>{HC_CP=v;},min:0,max:10,step:1,label:'Command points (no scenario value)'},
  NERVE_K:{get:()=>NERVE_K,set:v=>{NERVE_K=v;},min:0,max:2,step:0.05,label:'Nerve losses ×'},
  CALM_SECS:{get:()=>CALM_SECS,set:v=>{CALM_SECS=v;},min:1,max:10,step:0.5,label:'Calm nerve every (s)'},
  COMMIT_SECS:{get:()=>COMMIT_SECS,set:v=>{COMMIT_SECS=v;},min:0,max:8,step:0.5,label:'Stay on a target at least (s)'},
  DEFEND_R:{get:()=>DEFEND_R,set:v=>{DEFEND_R=v;},min:400,max:3000,step:50,label:'Defend reach'},
  HOLD_R:{get:()=>HOLD_R,set:v=>{HOLD_R=v;},min:400,max:3000,step:50,label:'Hold reach'},
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
  PIN_N:{get:()=>PIN_N,set:v=>{PIN_N=v;},min:1,max:5,step:1,label:'Pinned by (guns on it)'},
  PRES_HULL:{get:()=>PRES_HULL,set:v=>{PRES_HULL=v;},min:0.05,max:0.9,step:0.05,label:'Preservation: hull under'},
  GUARDIAN_SECS:{get:()=>GUARDIAN_SECS,set:v=>{GUARDIAN_SECS=v;},min:0.5,max:10,step:0.5,label:'Guardian: hit within (s)'},
  GUARDIAN_R:{get:()=>GUARDIAN_R,set:v=>{GUARDIAN_R=v;},min:500,max:6000,step:100,label:'Guardian: reach'},
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
  DECOY_R:{get:()=>DECOY_R,set:v=>{DECOY_R=v;},min:300,max:4000,step:100,label:'Decoy draws from'},
  RECALL_BOOST:{get:()=>RECALL_BOOST,set:v=>{RECALL_BOOST=v;},min:0,max:20,step:1,label:'Recall burns at boost (s)'},
  HELP_SECS:{get:()=>HELP_SECS,set:v=>{HELP_SECS=v;},min:3,max:40,step:1,label:'A sent wingmate helps (s)'},
  RECALL_HULL:{get:()=>RECALL_HULL,set:v=>{RECALL_HULL=v;},min:0,max:1,step:0.05,label:'Recall recommended under hull'},
  PIN_CLEAR:{get:()=>PIN_CLEAR,set:v=>{PIN_CLEAR=v;},min:0.5,max:10,step:0.5,label:'Pin clears after (s)'},
  TS_SLOW:{get:()=>TIMESCALES[1],set:v=>{TIMESCALES[1]=v;},min:0.1,max:1,step:0.05,label:'Slow speed (×)'},
  TS_FAST:{get:()=>TIMESCALES[3],set:v=>{TIMESCALES[3]=v;},min:1.5,max:6,step:0.5,label:'Fast speed (×)'},
  RAID_TURN_R:{get:()=>RAID_TURN_R,set:v=>{RAID_TURN_R=v;},min:0,max:2000,step:50,label:'Raiders turn on fighters within'},
  GUN_DPS:{get:()=>GUN_DPS,set:v=>{GUN_DPS=v;},min:0.1,max:2,step:0.05,label:'Gun damage a second (× roll)'},
};

/* the tactic weight table, every weight on the panel too */
const TACTIC_W={form:[0,2,0.05,'formation'],space:[0.5,6,0.1,'spacing ×'],engage:[0.4,1.6,0.05,'fighting range ×'],focus:[0,1,1,'focus fire (0/1)'],
  flank:[0,1.5,0.05,'flank'],disengage:[0,0.9,0.05,'falls back under hull'],leash:[0.3,2,0.05,'reach ×']};
for(const tk of TACTIC_KEYS)for(const wk in TACTIC_W){const [lo,hi,st,lb]=TACTIC_W[wk];
  TUNE['T_'+tk+'_'+wk]={get:()=>HC_TACTICS[tk][wk],set:v=>{HC_TACTICS[tk][wk]=v;},min:lo,max:hi,step:st,label:HC_TACTICS[tk].name+': '+lb,group:'Tactics'};}
/* the panel's groups (§5 T4: one HC group, sectioned) */
const GROUPS={Run:['HC_MAP','TS_SLOW','TS_FAST','HC_CP'],
  Flight:['THINK_SECS','ROUND_SECS','SPEED_SCALE','CRUISE','CONVOY_SPD','FORM_GAP','DISENGAGE_R'],
  Fighting:['ENGAGE_FRAC','THREAT_R','COMMIT_SECS','GUN_DPS','HR_IN','HR_OUT'],
  Orders:['ESCORT_R','DEFEND_R','HOLD_R','CAPTURE_R','CAPTURE_SECS','BOARD_R','BOARD_SECS','JUMP_R'],
  Hegemony:['DETECT_R','GUARD_R','LEASH_R','RAID_TURN_R'],
  Leaders:['LEAD_LOSS','PROMOTE_SECS'],
  Rules:['PRES_HULL','GUARDIAN_SECS','GUARDIAN_R','ESCAPE_K','FORM_SECS','BRING_HULL','SAVIOUR_HULL'],
  Morale:['MORALE_EAGER','MORALE_SHAKEN','MORALE_PANIC','STEADY_AT','PANIC_FLEE','SHAKEN_ODDS','SHAKEN_DISENGAGE','PIN_N','NERVE_K','CALM_SECS'],
  Commands:['CP_OVERRIDE','CP_RECALL','CP_REINFORCE','CP_SUPPORT','CP_RECON','CP_DECOY','OVERRIDE_SECS','OVERRIDE_COOL','RECON_SECS','DECOY_SECS','DECOY_R','RECALL_BOOST','HELP_SECS','RECALL_HULL','PIN_CLEAR']};
for(const g in GROUPS)for(const k of GROUPS[g])if(TUNE[k])TUNE[k].group=g;
for(const k in TUNE)if(!TUNE[k].group)TUNE[k].group='Other';

return {key:'hc',name:'Type 3: High Command',
  get S(){return S;},get W(){return W;},get H(){return H;},MARGIN,RU,SU,TICK,TIMESCALES,
  ORDERS,ORDER_KEYS,ORDERS_LIVE,HC_TACTICS,TACTIC_KEYS,PERSONALITY,CRITDEFS,TUNE,GROUPS,RULES,RULE_KEYS,ASSESS,
  COMMANDS,COMMAND_KEYS,ABILITIES,DOCTRINES,
  build,step,runFor,setOrder,setTactic,command,commandRefusal,respond,emergencyOpts,useAbility:(id,k)=>useAbility(byId(id),k,true),setDoctrine,abilitiesOf:id=>abilitiesOf(byId(id)),abilityTriggers:(id,k)=>abilityTriggers(byId(id),k),targetChips,targetLabel,objText,clockLeft,stateHash,endMission,pushEvent,addRule,removeRule,ruleLabel,moraleOf,assessOf,
  fn:{kill:destroyShip,withdrawPoint,byId,wingOf,wingShips,wingCentre,anchorOf,pinnedBy,flagshipDisabled,outnumbered,tacticOf,capsOf,gunRange,inArc,dist,maxShield,totalShield,lockOf,personalityOf,pickLeader,think,goalOf,jammed,extractPoint,mulberry,
    THINK_SECS_:()=>THINK_SECS,LEAD_LOSS_:()=>LEAD_LOSS,PROMOTE_SECS_:()=>PROMOTE_SECS,HC_CP_:()=>HC_CP,TICK_:()=>TICK,HC_MAP_:()=>HC_MAP,
    CRUISE_:()=>CRUISE,FORM_GAP_:()=>FORM_GAP,ENGAGE_FRAC_:()=>ENGAGE_FRAC,JUMP_R_:()=>JUMP_R,ESCORT_R_:()=>ESCORT_R,
    PRES_HULL_:()=>PRES_HULL,CAPTURE_R_:()=>CAPTURE_R,BOARD_R_:()=>BOARD_R,MORALE_:()=>({EAGER:MORALE_EAGER,SHAKEN:MORALE_SHAKEN,PANIC:MORALE_PANIC}),boardR}};
})();
