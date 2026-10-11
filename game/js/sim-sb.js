'use strict';
/* =====================================================================
   STAR REBELLION — the SB Test ruleset (docs/ARENA-SB-HANDOFF.md)
   The SteamBirds-informed rival to the v2 sim, behind the Arena's
   ruleset picker: grab the craft and drag a smooth line inside a
   continuous envelope, two AP segments a round, pilot movesets,
   simulated projectiles with lock as a 0–100% dial and glancing
   geometry. No d20 anywhere.

   Nothing below the Arena chassis is shared with sim2.js: what this
   module needs from space.js or sim2.js is copied, each block naming
   its source.

   Phases B1–B5: the skeleton; continuous drag inside the envelope, AP
   segments, Fly Defensively, acceleration flair; projectiles, bursts,
   spread, continuous lock, glancing damage, missiles; one action a craft
   and the pilot movesets (Drift's facing handle included); the doctrine
   planner, the full panel group, the SB experiments and their metrics.
   ===================================================================== */
window.SIMSB=(function(){
const K=()=>window.SR_ARENA;
const T=SR.theme,C=T.C;

/* ---------- copied from space.js ~20–30 ---------- */
const ARCH=0.55;
const TURNS={L:-Math.PI/2,l:-Math.PI/4,S:0,r:Math.PI/4,R:Math.PI/2};

/* ---------- placeholders (docs/DESIGN_BLOCKERS.md, "SB Test: placeholders") ---------- */
let AP_PER_ROUND=2;       // movement segments a round, 1 AP each. placeholder
let FLYDEF_FACTOR=0.25;   // Fly Defensively: incoming hit profile (ellipse area) multiplier. placeholder
let BOOST_MULT=2.0;       // Boost: segment speed multiplier. placeholder
let BOOST_TURN=0.25;      // Boost: turn-rate cap multiplier (the handoff's ×0.25). placeholder
let KTURN_MAX=3;          // K-Turn: speed cap, as the dial's K (space.js dialAvail ~140). placeholder
let BARREL_LAT=1;         // Barrel Roll: lateral displacement, in speed units. placeholder
let FLAIR_DIP=0.45;       // acceleration flair: how much slower a minimum-radius turn is flown. placeholder
let SPEED_FLAIR=true;     // toggle: speed eases along the curve (visual pacing only)
let flydefImmunity=false; // toggle: the designer's literal Fly Defensively (cannot be hit except by homing)
const STEP=8;             // integration step along a curve, world units
const LOOK=40;            // steering look-ahead along the drag, world units

let S=null;

/* ---------- geometry: copied from space.js ~372–380 ---------- */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function bearing(s,t){return Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-s.h));}
function inArc(s,t){return bearing(s,t)<=ARCH;}
function inFrontHemi(s,t){return bearing(s,t)<=Math.PI/2;}
/* ---------- copied from space.js ~138–150 (critCount, maxSpeedOf) ---------- */
function critCount(s,id){return s.crits.filter(c=>c===id).length;}
function maxSpeedOf(s){return Math.max(s.row.straight_min,s.row.straight_max-critCount(s,'engine'));}

/* ---------- movesets: granted by the pilot, keyed off the scenario presets (placeholders) ---------- */
const ARENA_MOVESETS={green:[],regular:['boost'],veteran:['boost','drift'],ace:['boost','drift','kturn','barrel']};
const KINDS={
  basic:{name:'Basic Movement',short:'Basic'},
  flydef:{name:'Fly Defensively',short:'Fly def'},
  boost:{name:'Boost',short:'Boost',mod:1},
  drift:{name:'Drift',short:'Drift',mod:1},
  kturn:{name:'K-Turn',short:'K-Turn',mod:1},
  loop:{name:'Loop',short:'Loop',mod:1},
  barrel:{name:'Barrel Roll',short:'Barrel',mod:1},
};
function movesetOf(s){
  if(s.faction!=='reb')return [];   // doctrine-bound Hegemony pilots fly the envelope, no movesets
  if(s.pilot.moveset)return s.pilot.moveset.filter(k=>KINDS[k]&&KINDS[k].mod);   // a scenario's own pilot moveset
  return (ARENA_MOVESETS[s.pilot.preset]||[]).slice();
}
function kindsFor(s){return ['basic','flydef'].concat(movesetOf(s));}

/* ---------- the continuous envelope (§2): the dial's fields as live constraints ----------
   Arc length per segment: straight_min..max × SU. Curvature: the tightest turn on the ship's dial (a hard turn's
   90° over its slowest speed, else a bank's 45°), so a curve can never tighten past the minimum turn radius. */
function kappaOf(s){
  const r=s.row,SU=K().SU;let k=0;
  if(r.turn_min!=null&&!critCount(s,'controls'))k=Math.max(k,Math.abs(TURNS.R)/(r.turn_min*SU));   // Control Surfaces: no hard turns
  if(r.bank_min!=null)k=Math.max(k,Math.abs(TURNS.r)/(r.bank_min*SU));
  return k;
}
function envelope(s,kind){
  const SU=K().SU;
  let Lmin=s.row.straight_min*SU,Lmax=maxSpeedOf(s)*SU,kap=kappaOf(s);
  if(kind==='boost'){Lmin*=BOOST_MULT;Lmax*=BOOST_MULT;kap*=BOOST_TURN;}
  else if(kind==='kturn'){Lmax=Math.max(Lmin,Math.min(Lmax,KTURN_MAX*SU));}
  else if(kind==='loop'){Lmax=Lmin;}   // the flip with minimal displacement: the shortest run the ship can fly
  return {Lmin,Lmax,kap};
}
function polyLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=dist(pts[i-1],pts[i]);return L;}
function polyAt(pts,sArc){   // a point at arc length sArc; past the end, extended along the last direction
  let acc=0;
  for(let i=1;i<pts.length;i++){
    const l=dist(pts[i-1],pts[i]);
    if(acc+l>=sArc&&l>0){const k=(sArc-acc)/l;return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*k,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*k};}
    acc+=l;
  }
  const n=pts.length;
  if(n<2)return {x:pts[0].x,y:pts[0].y};
  const a=pts[n-2],b=pts[n-1],l=dist(a,b)||1,over=sArc-acc;
  return {x:b.x+(b.x-a.x)/l*over,y:b.y+(b.y-a.y)/l*over};
}
/* steer along the drag: every STEP, turn toward the drag point LOOK ahead, at most kap × STEP radians */
function buildCurve(s,start,drag,kind){
  const {W,H,MARGIN}=K(),env=envelope(s,kind);
  const Ld=drag&&drag.length>1?polyLen(drag):0;
  const L=Math.max(env.Lmin,Math.min(env.Lmax,Ld||env.Lmin));
  let x=start.x,y=start.y,h=start.h;
  const pts=[{x,y,h,k:0}];
  for(let sArc=0;sArc<L-1e-6;){
    const ds=Math.min(STEP,L-sArc);
    let want=h;
    if(Ld>1){const t=polyAt(drag,sArc+LOOK);if(Math.hypot(t.x-x,t.y-y)>1)want=Math.atan2(t.y-y,t.x-x);}
    let dh=angNorm(want-h);const cap=env.kap*ds;dh=Math.max(-cap,Math.min(cap,dh));
    h+=dh;x+=Math.cos(h)*ds;y+=Math.sin(h)*ds;
    // the map edge: slide along it and ease the nose back toward the middle (space.js clampEnd's idea)
    const cx=Math.min(Math.max(x,MARGIN),W-MARGIN),cy=Math.min(Math.max(y,MARGIN),H-MARGIN);
    if(cx!==x||cy!==y){x=cx;y=cy;const toC=Math.atan2(H/2-y,W/2-x),d2=angNorm(toC-h),c2=env.kap*ds;h+=Math.max(-c2,Math.min(c2,d2));}
    sArc+=ds;
    pts.push({x,y,h,k:dh/ds});
  }
  const seg={kind,pts,L,env,start:{x:start.x,y:start.y,h:start.h},flip:kind==='kturn'||kind==='loop',lat:0,side:1};
  if(kind==='barrel'){   // a roll to the side the drag asks for, heading kept
    const e=pts[pts.length-1],tip=drag&&drag.length?drag[drag.length-1]:e;
    const lat=-(tip.x-e.x)*Math.sin(e.h)+(tip.y-e.y)*Math.cos(e.h);
    seg.side=lat<0?-1:1;seg.lat=BARREL_LAT*K().SU;
    for(let i=0;i<pts.length;i++){
      const u=i/(pts.length-1),sm=u*u*(3-2*u),off=seg.side*seg.lat*sm,p=pts[i];
      p.x=Math.min(Math.max(p.x-Math.sin(p.h)*off,MARGIN),W-MARGIN);p.y=Math.min(Math.max(p.y+Math.cos(p.h)*off,MARGIN),H-MARGIN);
    }
  }
  timeTable(seg);
  return seg;
}
/* acceleration flair: slower through minimum-radius turns, faster out of them and on straights. The segment still
   covers its planned arc length in its planned time: only the pacing along it changes. */
function timeTable(seg){
  const n=seg.pts.length,f=new Array(n).fill(1),kap=seg.env.kap||1e-9;
  if(SPEED_FLAIR&&n>2){
    for(let i=0;i<n;i++)f[i]=1-FLAIR_DIP*Math.min(1,Math.abs(seg.pts[i].k)/kap);
    const acc=0.035;   // how fast speed can change per step: brakes before a turn, accelerates out of it
    for(let i=1;i<n;i++)f[i]=Math.min(f[i],f[i-1]+acc);
    for(let i=n-2;i>=0;i--)f[i]=Math.min(f[i],f[i+1]+acc);
  }
  const cum=[0];
  for(let i=1;i<n;i++)cum.push(cum[i-1]+dist(seg.pts[i-1],seg.pts[i])/Math.max(0.2,(f[i-1]+f[i])/2));
  const tot=cum[n-1]||1;
  seg.tcum=cum.map(c=>c/tot);seg.speed=f;
}
/* a segment's pose at time fraction u (0–1): velocity heading vh, plus the nose */
function segPose(seg,u){
  const P=seg.pts,n=P.length;
  if(n<2)return {x:P[0].x,y:P[0].y,vh:P[0].h};
  const tc=seg.tcum;let lo=0,hi=n-1;
  if(u<=0)lo=0;else if(u>=1)lo=n-2;else{while(hi-lo>1){const m=(lo+hi)>>1;if(tc[m]<=u)lo=m;else hi=m;}}
  const a=P[lo],b=P[Math.min(n-1,lo+1)],span=(tc[lo+1]-tc[lo])||1,k=Math.max(0,Math.min(1,(u-tc[lo])/span));
  return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,vh:a.h+angNorm(b.h-a.h)*k,spd:seg.speed[lo]};
}
function segEnd(seg){const e=seg.pts[seg.pts.length-1];return {x:e.x,y:e.y,h:angNorm(seg.flip?e.h+Math.PI:e.h)};}
/* drags are kept in the segment's own frame, so a segment can be rebuilt from a new start pose */
const toLocal=(pts,o)=>pts.map(p=>{const dx=p.x-o.x,dy=p.y-o.y,c=Math.cos(-o.h),sn=Math.sin(-o.h);return {x:dx*c-dy*sn,y:dx*sn+dy*c};});
const toWorld=(pts,o)=>pts.map(p=>{const c=Math.cos(o.h),sn=Math.sin(o.h);return {x:o.x+p.x*c-p.y*sn,y:o.y+p.x*sn+p.y*c};});


/* =====================================================================
   SB shooting (§3): projectiles, lock as a dial, glancing geometry.
   Misses are things that visibly fly past.
   ===================================================================== */
let BURST_N=4;            // projectiles in a burst. placeholder
let BURST_EVERY=2.0;      // seconds between a gun's bursts (and a missile rack's launches). placeholder
let PROJ_SPD=1400;        // projectile speed, world units a second. placeholder
let SPREAD_BASE=6;        // burst spread, degrees (the cone's full width) before Aim, nerve and range. placeholder
let RANGE_SPREAD=3;       // ballistic and plasma spread added per range unit beyond band 1, degrees. placeholder
let SPREAD_AIM_K=0.1;     // Aim narrows spread: × 1 / (1 + this × the Aim bonus). placeholder
let SPREAD_NERVE_K=1.5;   // falling nerve widens it: × 1 + this × (1 − nerve / 100). placeholder
let SPREAD_CRIT=3;        // degrees added per Targeting Array Damage critical. placeholder
let MISSILE_LOCK=0.6;     // missiles need at least this lock. placeholder
let MISSILE_MINR=1.5;     // ...and at least this range, in range units. placeholder
let MISSILE_SPD=650;      // missile speed. placeholder
let MISSILE_TURN=2.4;     // missile turn rate, radians a second. placeholder
let LOCK_GAIN=0.4;        // lock gained a second with the target dead centre (zero at the arc's edge). placeholder
let LOCK_DECAY=0.5;       // lock lost a second once the target is behind the firer. placeholder
let IMPACT_MIN=0.2;       // damage scale for the shallowest skim (1.0 dead-on). placeholder
let LOCK_DMG_MAX=1.0;     // damage × (1 + lock × this): a full lock doubles it. placeholder
let PROJ_DMG=0.25;        // each projectile's share of a weapon roll: 1 / BURST_N makes a burst one roll, as one attack today. placeholder
let CRIT_DIRECT=0.10;     // critical chance on a direct hit (impact ≥ 0.8), plus the weapon's own. placeholder
let HULL_LEN=22,HULL_WID=10;   // the hull ellipse's semi-axes before the ship's visual size. placeholder
const BURST_GAP=0.08;     // seconds between a burst's projectiles
const LOCK_RNG=900;       // copied from space.js ~23
const CALM_GAIN=6;        // copied from space.js endRound ~1082 ('breathing room')

/* ---------- the database's weapons, in space.js's wdefOf shape (copied, space.js ~31) ---------- */
function wdefOf(r){
  return {id:r.id,name:r.name,kind:r.kind,rng:r.range,skipShield:r.bypasses_shields,crit:r.crit_chance,
    needsLock:r.needs_lock,dmg:[r.damage_min,r.damage_max],ammo:r.ammo==null?undefined:r.ammo};
}
function loadout(row,list){
  const ids=(list||[row.default_weapon_1,row.default_weapon_2]).filter(id=>id&&SRDB.weapons[id]).slice(0,row.weapon_slots||2);
  return ids.map((id,i)=>{const w=wdefOf(SRDB.weapons[id]);return {key:'w'+i,w,ammo:w.ammo,cd:0};});
}
/* ---------- shields, damage, criticals: copied from space.js ~508–560 (logging becomes floaters) ---------- */
const CRITDEFS={
  engine:{name:'Secondary Engine Failure',desc:'Top-speed maneuvers unavailable.',stack:2},
  targeting:{name:'Targeting Array Damage',desc:'Wider spread until repaired.',stack:2},
  controls:{name:'Control Surfaces Shredded',desc:'Hard turns and loops unavailable.',stack:1},
  emitter:{name:'Shield Emitter Fried',desc:'Cannot boost shields.',stack:1},
  feed:{name:'Ammo Feed Jam',desc:'Ballistic and missile weapons offline.',stack:1},
  cockpit:{name:'Cockpit Breach',desc:'Nerve capped at 60.',stack:1},
};
const maxShield=s=>s.segs.F.max+s.segs.R.max;
const totalShield=s=>s.segs.F.val+s.segs.R.val;
const mute=s=>s.row.kind!=='starship';
const hasTr=(s,k)=>!!(s.pilot.tr&&s.pilot.tr.some(t=>t.k===k));
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
  const kit=K();
  if(s.struct){s.hull=Math.max(0,s.hull-4);kit.addFloater(s.x,s.y-46,'TANK RUPTURE -4',C.hazard);return null;}
  const opts=applicableCrits(s);
  if(!opts.length){s.hull=Math.max(0,s.hull-2);kit.addFloater(s.x,s.y-46,'STRUCTURE GRINDING -2',C.hazard);return null;}
  const id=opts[Math.floor(S.rng()*opts.length)];
  s.crits.push(id);
  if(id==='cockpit')adjCool(s,-15,'cockpit breach');
  kit.addFloater(s.x,s.y-46,CRITDEFS[id].name.toUpperCase(),C.hazard);
  return id;
}
/* ---------- nerve: copied from space.js ~158–181 (coolState, adjCool) ---------- */
function coolState(s){return s.pilot.cool>=70?'cool':s.pilot.cool<=30?'panic':'steady';}
function adjCool(s,d){
  if(mute(s))return;
  const p=s.pilot,pre=coolState(s);
  if(d<0&&p.nv)d=Math.round(d*p.nv);
  d=Rebel.nerveScale(d,k=>hasTr(s,k));
  p.cool=Math.max(0,Math.min(100,p.cool+d));
  if(p.coolCap)p.cool=Math.min(p.coolCap,p.cool);
  if(critCount(s,'cockpit'))p.cool=Math.min(60,p.cool);
  const post=coolState(s);
  if(pre!=='panic'&&post==='panic'){p.panics=(p.panics||0)+1;K().addFloater(s.x,s.y-40,'PANICKING',C.hazard);}
  if(pre==='panic'&&post!=='panic')K().addFloater(s.x,s.y-40,'STEADIED',C.go);
}
/* the rocks block projectiles: copied from space.js losBlocked ~382, as a segment test */
function rockHit(a,b){
  for(const r of S.rocks){
    const dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy;if(L2<1)continue;
    let t=((r.x-a.x)*dx+(r.y-a.y)*dy)/L2;t=Math.max(0,Math.min(1,t));
    if(Math.hypot(r.x-(a.x+dx*t),r.y-(a.y+dy*t))<r.r*0.85)return true;
  }
  return false;
}
const losBlocked=(a,b)=>rockHit(a,b);

/* ---------- the hull: an ellipse from ship size (v1) ---------- */
function hullAxes(s,homing){
  const v=SRDB.visualSize(s.row.size);
  let a=HULL_LEN*v,b=s.struct?HULL_LEN*v:HULL_WID*v;
  if(s.flydef&&!homing){const k=Math.sqrt(FLYDEF_FACTOR);a*=k;b*=k;}   // the profile is an area: each axis × √factor
  return {a,b};
}
/* first intersection of segment p0→p1 with the target's hull: {u (0–1 along the segment), x, y, nx, ny (outward normal)} */
function hullHit(t,p0,p1,homing){
  const {a,b}=hullAxes(t,homing);
  const c=Math.cos(-t.h),sn=Math.sin(-t.h);
  const lx0=(p0.x-t.x)*c-(p0.y-t.y)*sn,ly0=(p0.x-t.x)*sn+(p0.y-t.y)*c;
  const lx1=(p1.x-t.x)*c-(p1.y-t.y)*sn,ly1=(p1.y-t.y)*c+(p1.x-t.x)*sn;
  // scale y so the ellipse is a circle of radius a
  const k=a/b,X0=lx0,Y0=ly0*k,DX=lx1-lx0,DY=(ly1-ly0)*k;
  const A2=DX*DX+DY*DY,B2=2*(X0*DX+Y0*DY),C2=X0*X0+Y0*Y0-a*a;
  if(A2<1e-9)return null;
  const disc=B2*B2-4*A2*C2;if(disc<0)return null;
  const sq=Math.sqrt(disc);let u=(-B2-sq)/(2*A2);
  if(u<0||u>1){if(C2<0)u=0;else return null;}   // starting inside counts as a hit at once
  const hx=lx0+(lx1-lx0)*u,hy=ly0+(ly1-ly0)*u;
  let nx=hx/(a*a),ny=hy/(b*b);const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  const cw=Math.cos(t.h),sw=Math.sin(t.h);
  return {u,x:t.x+hx*cw-hy*sw,y:t.y+hx*sw+hy*cw,nx:nx*cw-ny*sw,ny:nx*sw+ny*cw};
}
/* damage scale by impact angle: IMPACT_MIN at a skim, 1.0 dead-on (the shot along the surface normal) */
function impactOf(vx,vy,hit){
  const vl=Math.hypot(vx,vy)||1;
  const cosI=Math.max(0,-(vx*hit.nx+vy*hit.ny)/vl);
  return IMPACT_MIN+(1-IMPACT_MIN)*cosI;
}
/* ---------- lock: continuous, 0–100%, per target ---------- */
function lockOf(s,id){return (s.locks&&s.locks[id])||0;}
function lockTick(s,dt){
  const t=byIdS(s.target);
  if(t&&t.alive&&inArc(s,t)&&dist(s,t)<=LOCK_RNG&&!losBlocked(s,t)){
    const c=Math.max(0,1-bearing(s,t)/ARCH);   // full rate dead centre, zero at the arc's edge
    s.locks[t.id]=Math.min(1,lockOf(s,t.id)+LOCK_GAIN*c*dt);
  }
  for(const id in s.locks){
    const x=byIdS(id);
    if(!x||!x.alive){delete s.locks[id];continue;}
    if(!inFrontHemi(s,x))s.locks[id]=Math.max(0,s.locks[id]-LOCK_DECAY*dt);
  }
  s.lockMax=Math.max(s.lockMax||0,lockOf(s,s.target));
}
/* ---------- spread: the pilot. Aim is tracking quality, nerve is steadiness ---------- */
function aimBonus(s){return SRDB.skillBonus(s.pilot.skills?s.pilot.skills.aim:0,s.pilot.level);}
function spreadOf(s,w,d){
  let deg=SPREAD_BASE;
  if(w.kind!=='missile'){const ru=d/K().RU;if(ru>1)deg+=RANGE_SPREAD*(ru-1);}
  deg*=1/(1+SPREAD_AIM_K*aimBonus(s));
  if(!mute(s))deg*=1+SPREAD_NERVE_K*(1-s.pilot.cool/100);
  deg+=SPREAD_CRIT*critCount(s,'targeting');
  return deg*Math.PI/180;
}
/* where to aim: the intercept with the target's current velocity, kept inside the firing arc */
function aimAngle(s,t){
  const rx=t.x-s.x,ry=t.y-s.y,vx=t.vx||0,vy=t.vy||0;
  const a=vx*vx+vy*vy-PROJ_SPD*PROJ_SPD,b=2*(rx*vx+ry*vy),c=rx*rx+ry*ry;
  let tau=0;const disc=b*b-4*a*c;
  if(Math.abs(a)>1e-6&&disc>=0){const t1=(-b-Math.sqrt(disc))/(2*a),t2=(-b+Math.sqrt(disc))/(2*a);tau=Math.max(t1,t2);if(tau<0)tau=0;}
  const ang=Math.atan2(ry+vy*tau,rx+vx*tau);
  const off=Math.max(-ARCH,Math.min(ARCH,angNorm(ang-s.h)));
  return s.h+off;
}
function canFire(s,q,t){
  if(!t||!t.alive||s.flydef||s.struct)return false;
  if(q.w.kind!=='plasma'&&critCount(s,'feed'))return false;
  if(q.ammo!==undefined&&q.ammo<=0)return false;
  const d=dist(s,t);
  if(!inArc(s,t)||d>q.w.rng)return false;
  if(q.w.needsLock)return lockOf(s,t.id)>=MISSILE_LOCK&&d>=MISSILE_MINR*K().RU;   // enabled at distance, not in a knife fight
  return true;
}
function missileRefusal(s,q,t){   // why a missile won't launch (tests, the HUD)
  if(!t||!t.alive)return 'no target';
  if(lockOf(s,t.id)<MISSILE_LOCK)return 'lock';
  if(dist(s,t)<MISSILE_MINR*K().RU)return 'too close';
  if(!inArc(s,t)||dist(s,t)>q.w.rng)return 'out of band';
  if(q.ammo!==undefined&&q.ammo<=0)return 'ammo';
  return null;
}
function fireTick(s,dt){
  for(const q of s.wpns)q.cd=Math.max(0,q.cd-dt);
  const t=byIdS(s.target);
  for(const q of s.wpns){
    if(q.cd>0||!canFire(s,q,t))continue;
    q.cd=BURST_EVERY;
    if(q.w.kind==='missile'){
      q.ammo--;s.st.missiles++;
      S.missiles.push({x:s.x,y:s.y,h:s.h,owner:s.id,faction:s.faction,target:t.id,w:q.w,lock:lockOf(s,t.id),life:q.w.rng/MISSILE_SPD*1.8,trail:[]});
    } else {
      s.st.bursts++;
      S.bursts.push({owner:s.id,faction:s.faction,w:q.w,left:BURST_N,next:0,target:t.id,fired:0,hits:0,dmg:0,live:0,hitT:{},id:++S.burstN});
    }
  }
}
function emitBursts(dt){
  for(const B of S.bursts){
    if(B.left<=0)continue;
    const s=byIdS(B.owner),t=byIdS(B.target);
    if(!s||!s.alive||s.flydef){B.left=0;continue;}   // no firing while flying defensively
    B.next-=dt;
    while(B.left>0&&B.next<=0){
      const tt=t&&t.alive?t:null;
      const ang=tt?aimAngle(s,tt):s.h,d=tt?dist(s,tt):B.w.rng;
      const sp=spreadOf(s,B.w,d),off=(S.rng()-0.5)*sp;
      const h=ang+off;
      S.proj.push({x:s.x+Math.cos(s.h)*14,y:s.y+Math.sin(s.h)*14,vx:Math.cos(h)*PROJ_SPD,vy:Math.sin(h)*PROJ_SPD,
        owner:s.id,faction:s.faction,w:B.w,burst:B.id,life:B.w.rng/PROJ_SPD*1.15,age:0});
      B.left--;B.fired++;B.live++;s.st.shots++;B.next+=BURST_GAP;
      if(s.curKind==='drift'){s.st.driftShots++;if(Math.cos(h-s.vh)<0)s.st.backShots++;}   // sb2_drift's question: shots at the pursuer while fleeing
    }
  }
}
function hitShip(t,shooterId,w,vx,vy,hit,homing,lockAt){
  const s=byIdS(shooterId);
  const imp=impactOf(vx,vy,hit);
  const lk=lockAt!=null?lockAt:(s?lockOf(s,t.id):0);
  const roll=w.dmg[0]+Math.floor(S.rng()*(w.dmg[1]-w.dmg[0]+1));
  const dmg=Math.max(1,Math.round(roll*(homing?1:PROJ_DMG)*imp*(1+lk*LOCK_DMG_MAX)));   // a missile is one warhead: its whole roll
  const fromFront=(-vx*Math.cos(t.h)-vy*Math.sin(t.h))>0;
  const r=applyDamage(t,dmg,w.skipShield,fromFront);
  let crit=null;
  if(imp>=0.8&&S.rng()<CRIT_DIRECT+(w.crit||0))crit=applyCritical(t);
  S.damaged.add(t.id);
  if(s){s.st.hits++;s.st.dmg+=dmg;}
  const kit=K();
  if(CARDS)kit.addFloater(hit.x,hit.y-18,(imp<0.4?'skim ':imp>=0.8?'direct ':'')+'-'+dmg,imp>=0.8?C.hazard:imp<0.4?C.text3:C.text);
  S.fx.push({x:hit.x,y:hit.y,t0:S.clockT,kind:r.sd>0&&r.ad+r.hd===0?'shield':'hull'});
  if(t.hull<=0&&t.alive)destroyShip(t,s);
  return {dmg,imp,lock:lk,r,crit};
}
function destroyShip(t,killer){
  t.alive=false;t.hull=Math.min(t.hull,0);
  S.fx.push({x:t.x,y:t.y,t0:S.clockT,kind:'boom',size:SRDB.visualSize(t.row.size)});
  K().addFloater(t.x,t.y-30,t.struct?'DESTROYED':'SPLASH',C.gold);
  if(killer&&killer.alive){killer.st.kills++;adjCool(killer,12);}   // the space.js destroyShip gains and losses (~1026–1037)
  for(const m of S.ships){
    if(!m.alive||m.faction!==t.faction||m===t)continue;
    adjCool(m,-18);
    if(t.lead&&!mute(m))adjCool(m,-45);
  }
}
function projTick(dt){
  const kept=[];
  for(const p of S.proj){
    const p0={x:p.x,y:p.y},p1={x:p.x+p.vx*dt,y:p.y+p.vy*dt};
    p.age+=dt;
    let best=null,bu=2;
    for(const t of S.ships){
      if(!t.alive||t.faction===p.faction)continue;
      if(t.flydef&&flydefImmunity)continue;   // the literal version: untouchable except by homing
      const h=hullHit(t,p0,p1,false);
      if(h&&h.u<bu){bu=h.u;best={t,h};}
    }
    // a rock in front of the hit point stops the shot first
    if(best&&rockHit(p0,{x:best.h.x,y:best.h.y}))best=null;
    const B=S.bursts.find(b=>b.id===p.burst);
    if(best){
      const r=hitShip(best.t,p.owner,p.w,p.vx,p.vy,best.h,false,null);
      if(B){B.hits++;B.dmg+=r.dmg;B.live--;
        if(!B.hitT[best.t.id]){B.hitT[best.t.id]=1;adjCool(best.t,(r.r.ad>0||r.r.hd>0)?-12:-5);}}   // nerve: once a burst, space.js ~979
      continue;
    }
    if(rockHit(p0,p1)||p.age>=p.life){if(B)B.live--;S.fx.push({x:p1.x,y:p1.y,t0:S.clockT,kind:'fizz'});continue;}
    p.x=p1.x;p.y=p1.y;kept.push(p);
  }
  S.proj=kept;
  // a finished burst leaves its resolution card at the gun
  S.bursts=S.bursts.filter(B=>{
    if(B.left>0||B.live>0)return true;
    const s=byIdS(B.owner);
    if(s&&s.alive&&CARDS){
      if(S.clockT-(s.lastCard||-9)>0.6){s.lastCard=S.clockT;K().addFloater(s.x,s.y-34,B.hits+'/'+B.fired+' hit'+(B.dmg?' · '+B.dmg+' dmg':''),s.faction==='reb'?C.gold:C.hegHi);}
    }
    return false;
  });
}
function missileTick(dt){
  const kept=[];
  for(const m of S.missiles){
    const t=byIdS(m.target);
    m.life-=dt;
    if(t&&t.alive){const want=Math.atan2(t.y-m.y,t.x-m.x),dh=angNorm(want-m.h),cap=MISSILE_TURN*dt;m.h+=Math.max(-cap,Math.min(cap,dh));}
    const p0={x:m.x,y:m.y},p1={x:m.x+Math.cos(m.h)*MISSILE_SPD*dt,y:m.y+Math.sin(m.h)*MISSILE_SPD*dt};
    if(t&&t.alive){
      const h=hullHit(t,p0,p1,true);   // homing: Fly Defensively does not help
      if(h&&!rockHit(p0,{x:h.x,y:h.y})){
        const r=hitShip(t,m.owner,m.w,p1.x-p0.x,p1.y-p0.y,h,true,m.lock);
        adjCool(t,(r.r.ad>0||r.r.hd>0)?-12:-5);
        S.fx.push({x:h.x,y:h.y,t0:S.clockT,kind:'boom',size:0.7});
        continue;
      }
    }
    if(rockHit(p0,p1)||m.life<=0){S.fx.push({x:p1.x,y:p1.y,t0:S.clockT,kind:'boom',size:0.5});continue;}
    m.x=p1.x;m.y=p1.y;m.trail.push({x:m.x,y:m.y});if(m.trail.length>14)m.trail.shift();
    kept.push(m);
  }
  S.missiles=kept;
}
function combatTick(dt){
  for(const s of S.ships)if(s.alive&&!s.struct){
    if(!byIdS(s.target)||!byIdS(s.target).alive)s.target=defaultTarget(s);
    lockTick(s,dt);
    const t=byIdS(s.target);if(t&&t.alive&&inArc(s,t))s.st.arcT+=dt;   // time with the target in the firing arc
  }
  for(const s of S.ships)if(s.alive&&!s.struct)fireTick(s,dt);
  emitBursts(dt);
  projTick(dt);
  missileTick(dt);
}
function defaultTarget(s){const t=nearestFoe(s);return t?t.id:null;}

/* =====================================================================
   SB orders (§4): one movement and one action a craft, each PLAN.
   ===================================================================== */
const ACTIONS={
  none:{name:'No action'},
  shiftF:{name:'Angle fore shield',short:'Angle fore'},
  shiftR:{name:'Angle aft shield',short:'Angle aft'},
  boostF:{name:'Boost fore shield',short:'Boost fore'},
  boostR:{name:'Boost aft shield',short:'Boost aft'},
  fixcrit:{name:'Fix Critical',short:'Fix crit'},
  lockin:{name:'Lock In',short:'Lock In'},
  fieldrep:{name:'Field repair',short:'Field repair',special:1},
};
/* Special Ability (pilot, levelled and trained) and Ship Ability (a ship or attachment): DESIGN OPEN.
   The slots render; the lists are empty bar the lead's self-repair (space.js fieldrep ~718). */
function specialAbilities(s){return s.lead&&s.faction==='reb'?['fieldrep']:[];}   // DESIGN OPEN: pilot abilities, levelled and trained
function shipAbilities(s){return [];}                                             // DESIGN OPEN: a specific ship's or attachment's ability
function actionsFor(s){
  const out=['none','shiftF','shiftR'];
  if(maxShield(s)>0&&!critCount(s,'emitter'))out.push('boostF','boostR');
  if(s.crits.length)out.push('fixcrit');
  if(!mute(s))out.push('lockin');
  return out.concat(specialAbilities(s),shipAbilities(s));
}
/* copied from space.js doAction ~686–734 (shiftF/shiftR, boostF/boostR, lockin, fieldrep, fixcrit); log lines become floaters */
function doAction(s,a){
  const kit=K();
  if(a==='shiftF'||a==='shiftR'){
    const seg=s.segs[a==='shiftF'?'F':'R'];
    seg.at=seg.at==='F'?'R':'F';
    kit.addFloater(s.x,s.y-36,'SHIELDS ANGLED',C.shield);
  } else if(a==='boostF'||a==='boostR'){
    if(critCount(s,'emitter'))return false;
    const seg=s.segs[a==='boostF'?'F':'R'];
    const amt=Math.min(seg.max-seg.val,Math.ceil(0.15*maxShield(s)*(s.pilot.cun||1)));
    if(amt>0){seg.val+=amt;kit.addFloater(s.x,s.y-36,'SHIELD +'+amt,C.shield);}
  } else if(a==='lockin'){adjCool(s,35);kit.addFloater(s.x,s.y-36,'LOCKED IN',C.go);}
  else if(a==='fieldrep'){
    const amt=Math.ceil(0.15*s.maxHull*(s.pilot.cun||1));
    s.hull=Math.min(s.maxHull,s.hull+amt);kit.addFloater(s.x,s.y-36,'HULL +'+amt,C.go);
  } else if(a==='fixcrit'){
    if(!s.crits.length)return false;
    const id=s.crits.shift();   // the oldest: every critical in CRITDEFS is repairable
    kit.addFloater(s.x,s.y-36,'REPAIRED '+CRITDEFS[id].name.toUpperCase(),C.go);
  } else return false;
  return true;
}
/* the Hegemony's action: a copy of the useful half of space.js aiAction ~633 (locks are continuous here) */
function aiActionOf(s){
  if(s.struct||mute(s)&&!s.crits.length)return 'none';
  if(coolState(s)==='panic')return 'none';
  if(s.lead&&s.crits.length)return 'fixcrit';
  if(maxShield(s)>0&&totalShield(s)<maxShield(s)*0.35&&!critCount(s,'emitter'))return s.segs.F.val<=s.segs.R.val?'boostF':'boostR';
  if(!mute(s)&&s.pilot.cool<55)return 'lockin';
  return 'none';
}

/* ---------- ships ---------- */
function mkShip(d){
  const r=d.row;
  return {id:d.id,name:d.name,faction:d.faction,row:r,cls:d.cls,struct:!!d.struct,x:d.x,y:d.y,h:d.h,vh:d.h,vx:0,vy:0,
    pilot:Object.assign({},d.pilot),lead:d.lead,flees:d.flees,doctrine:d.doctrine,type:d.type||null,
    segs:{F:{val:r.shield_front,max:r.shield_front,at:'F'},R:{val:r.shield_rear,max:r.shield_rear,at:'R'}},
    arm:r.armour,hull:r.hull,maxArm:r.armour,maxHull:r.hull,crits:[],
    alive:true,fled:false,trail:[],
    wpns:loadout(r,d.loadout),target:null,locks:{},lockMax:0,action:'none',
    st:{bursts:0,shots:0,hits:0,dmg:0,missiles:0,kills:0,arcT:0,driftShots:0,backShots:0,actions:0},
    plan:[],           // planned segments: {kind, local (the drag in the segment's frame), facing}
    kinds:['basic','basic'],   // the kind picked for each AP slot
    sched:null,visRoll:0,flydef:false};
}
function build(world,rng,api){
  S={ships:world.cast.map(mkShip),rocks:world.rocks,rng,api,sel:null,slot:0,edit:null,execT:0,world,
    proj:[],bursts:[],missiles:[],fx:[],burstN:0,clockT:0,damaged:new Set()};
  const p=S.ships.find(s=>s.faction==='reb');S.sel=p?p.id:null;
  for(const s of S.ships)if(!s.struct)s.target=defaultTarget(s);
}
const byIdS=id=>S.ships.find(s=>s.id===id);
const startPose=s=>({x:s.x,y:s.y,h:s.h});

/* the planned segments as curves, from the ship's pose at the start of the round */
function curvesOf(s){
  const out=[];let pose=startPose(s);
  for(let i=0;i<s.plan.length;i++){
    const p=s.plan[i];
    const seg=buildCurve(s,pose,toWorld(p.local,pose),p.kind);
    seg.facing=p.facing;seg.slot=i;
    out.push(seg);pose=segEnd(seg);
  }
  return out;
}
/* unplanned AP slots glide on: a Basic straight at the last segment's length (the slowest, if none). Unspent AP
   buys nothing in v1. */
function fullSchedule(s,planned){
  const segs=planned.slice();
  let pose=segs.length?segEnd(segs[segs.length-1]):startPose(s);
  while(segs.length<AP_PER_ROUND){
    const len=segs.length?Math.min(segs[segs.length-1].L,envelope(s,'basic').Lmax):envelope(s,'basic').Lmin;
    const g=buildCurve(s,pose,[{x:pose.x,y:pose.y},{x:pose.x+Math.cos(pose.h)*len,y:pose.y+Math.sin(pose.h)*len}],'basic');
    g.auto=true;segs.push(g);pose=segEnd(g);
  }
  return segs;
}

/* ---------- enemies (§5): doctrine goals feeding a continuous planner ----------
   A doctrine is a goal function plus its always-on tell, the same shape as v2's (docs/ARENA-HANDOFF.md §3.5):
   one goal function, two planners. Here the planner steers straight at the goal and lets the ship's envelope bend
   and clamp the line, building its AP segments the way a player's drag would. Only pursuit exists so far; the
   other doctrines arrive in whichever ruleset reaches its doctrine phase first and are then ported across. */
let PREF_RANGE=340;   // copied from space.js aiManeuver ~620 (prefD)
let FLANK=0.55;       // radians each further pursuer of one target sits off the line behind it, alternating sides. placeholder
let AI_NOISE=0;       // world units of random jitter on a doctrine's goal. placeholder
let TELLS=true;       // toggle: draw each doctrine's tell
let CARDS=true;       // toggle: burst resolution cards and damage numbers (off quiets the screen at the ship cap)
function nearestFoe(s){let best=null,bd=1e18;for(const t of S.ships)if(t.alive&&t.faction!==s.faction&&!t.struct){const d=dist(s,t);if(d<bd){bd=d;best=t;}}return best;}
const SB_DOCTRINES={
  pursuit:{key:'pursuit',
    goal(s){   // close to the preferred range behind the target, leading it by its velocity; flank-mates fan out
      const t=byIdS(s.target)&&byIdS(s.target).alive?byIdS(s.target):nearestFoe(s);
      const segT=K().EXEC_LEN/AP_PER_ROUND;
      if(!t)return pose=>({x:pose.x+Math.cos(pose.h)*200,y:pose.y+Math.sin(pose.h)*200});
      const mates=S.ships.filter(q=>q.alive&&q.faction===s.faction&&!q.struct&&q.target===t.id);
      const k=Math.max(0,mates.indexOf(s)),off=k===0?0:(k%2?1:-1)*FLANK*Math.ceil(k/2);
      return (pose,i)=>{
        const lead=segT*(i+1),px=t.x+t.vx*lead,py=t.y+t.vy*lead;
        const a=Math.atan2(pose.y-py,pose.x-px)+off;
        return {x:px+Math.cos(a)*PREF_RANGE,y:py+Math.sin(a)*PREF_RANGE};
      };
    },
    tell(c,s,z){   // a chevron over the pursuer, pointing at its quarry (the lock line is the other half)
      const t=byIdS(s.target);if(!t||!t.alive)return;
      const a=Math.atan2(t.y-s.y,t.x-s.x),r=34*K().iconBoost(),x=s.x+Math.cos(a)*r,y=s.y+Math.sin(a)*r;
      c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(-6/z,-8/z);c.lineTo(4/z,0);c.lineTo(-6/z,8/z);
      c.lineWidth=5/z;c.strokeStyle=C.ink;c.stroke();c.lineWidth=2.6/z;c.strokeStyle=C.heg;c.stroke();c.restore();
    }},
};
const doctrineOf=s=>SB_DOCTRINES[s.doctrine]||SB_DOCTRINES.pursuit;   // not built yet: they pursue (C-57 item 8)
function exitGoal(s){   // a panicking ship that flees runs for the nearest edge (space.js aiManeuver ~603)
  const {W,H}=K();
  const ex=s.x<W/2?0:W,ey=s.y<H/2?0:H;
  const gx=Math.abs(s.x-ex)<Math.abs(s.y-ey)?ex:s.x,gy=Math.abs(s.x-ex)<Math.abs(s.y-ey)?s.y:ey;
  return ()=>({x:gx,y:gy});
}
function planToward(s,goalFn,kind){
  const segs=[];let pose=startPose(s);
  for(let i=0;i<AP_PER_ROUND;i++){
    const g=goalFn(pose,i);
    const jx=AI_NOISE?(S.rng()-0.5)*2*AI_NOISE:0,jy=AI_NOISE?(S.rng()-0.5)*2*AI_NOISE:0;
    // the drag is a straight line to the goal; the envelope bends and clamps it
    const seg=buildCurve(s,pose,[{x:pose.x,y:pose.y},{x:g.x+jx,y:g.y+jy}],kind||'basic');
    segs.push(seg);pose=segEnd(seg);
  }
  return segs;
}
function planEnemy(s){
  if(coolState(s)==='panic'){   // doctrine is how they fight, not a second health bar
    if(s.flees)return planToward(s,exitGoal(s),'basic');
    return planToward(s,doctrineOf(s).goal(s),'flydef');
  }
  return planToward(s,doctrineOf(s).goal(s),'basic');
}
function fleeCheck(){   // a panicking ship that flees and reaches the edge jumps out (space.js endRound ~1084)
  const {W,H,MARGIN}=K();
  for(const s of S.ships){
    if(s.alive&&s.flees&&coolState(s)==='panic'&&(s.x<MARGIN+120||s.x>W-MARGIN-120||s.y<MARGIN+120||s.y>H-MARGIN-120)){
      s.alive=false;s.fled=true;K().addFloater(s.x,s.y,'JUMPED OUT',C.text3);
    }
  }
}

/* ---------- planning input: grab the craft, drag the line ---------- */
function shipAt(x,y,z){
  let best=null,bd=1e18;
  for(const s of S.ships){if(!s.alive)continue;const d=Math.hypot(s.x-x,s.y-y);const r=Math.max(40,26/z);if(d<r&&d<bd){bd=d;best=s;}}
  return best;
}
function handleAt(x,y,z){   // a selected ship's segment-end handles (start the next segment there) and Drift facing handles
  const s=byIdS(S.sel);if(!s||s.faction!=='reb'||!s.alive)return null;
  const cs=curvesOf(s),r=Math.max(34,22/z);
  for(let i=cs.length-1;i>=0;i--){
    const seg=cs[i];
    if(seg.kind==='drift'){const e=seg.pts[seg.pts.length-1],f=seg.facing!=null?seg.facing:e.h+Math.PI,R=110;
      if(Math.hypot(x-(e.x+Math.cos(f)*R),y-(e.y+Math.sin(f)*R))<r)return {kind:'facing',ship:s,slot:i};}
  }
  if(cs.length&&cs.length<AP_PER_ROUND){const e=segEnd(cs[cs.length-1]);if(Math.hypot(x-e.x,y-e.y)<r)return {kind:'seg',ship:s,slot:cs.length,from:e};}
  for(let i=cs.length-1;i>=1;i--){const e=segEnd(cs[i-1]);if(Math.hypot(x-e.x,y-e.y)<r)return {kind:'seg',ship:s,slot:i,from:e};}
  return null;
}
function planInput(ev){
  if(K().phase!=='PLAN')return false;
  if(ev.type==='down'){
    const hd=handleAt(ev.x,ev.y,ev.z);
    if(hd&&hd.kind==='facing'){S.edit={mode:'facing',id:hd.ship.id,slot:hd.slot};return true;}
    if(hd&&hd.kind==='seg'){
      S.slot=hd.slot;hd.ship.plan.length=hd.slot;
      S.edit={mode:'drag',id:hd.ship.id,slot:hd.slot,from:hd.from,pts:[{x:hd.from.x,y:hd.from.y}]};
      return true;
    }
    const s=shipAt(ev.x,ev.y,ev.z);
    if(s&&s.faction==='reb'&&!s.struct){
      S.sel=s.id;S.slot=0;s.plan.length=0;
      S.edit={mode:'drag',id:s.id,slot:0,from:startPose(s),pts:[{x:s.x,y:s.y}]};
      return true;
    }
    const me=byIdS(S.sel);
    if(s&&me&&me.faction==='reb'&&me.alive&&s.faction!==me.faction){me.target=s.id;return true;}   // your ship selected: a hostile becomes its target
    if(s){S.sel=s.id;return true;}
    return false;
  }
  if(ev.type==='move'&&S.edit){
    const s=byIdS(S.edit.id);
    if(S.edit.mode==='facing'){
      const seg=curvesOf(s)[S.edit.slot],e=seg.pts[seg.pts.length-1];
      s.plan[S.edit.slot].facing=Math.atan2(ev.y-e.y,ev.x-e.x);
      return true;
    }
    const d=S.edit,last=d.pts[d.pts.length-1];
    if(Math.hypot(ev.x-last.x,ev.y-last.y)>6){d.pts.push({x:ev.x,y:ev.y});setSeg(s,d.slot,d.from,d.pts);}
    return true;
  }
  if(ev.type==='up'&&S.edit){
    const d=S.edit,s=byIdS(d.id);
    if(d.mode==='drag'){
      if(d.pts.length<3)s.plan.length=d.slot;   // a click, not a drag: nothing planned
      else{setSeg(s,d.slot,d.from,d.pts);S.slot=Math.min(AP_PER_ROUND-1,d.slot+1);}
    }
    S.edit=null;return true;
  }
  return false;
}
function setSeg(s,slot,from,pts){
  const kind=s.kinds[slot]||'basic';
  const prev=s.plan[slot];
  s.plan[slot]={kind,local:toLocal(pts,from),facing:prev&&prev.kind==='drift'?prev.facing:(kind==='drift'?from.h+Math.PI:null)};
}
/* scripted planning (tests, the panel): pts in world space from the segment's start pose */
function planSegs(id,list){
  const s=byIdS(id);s.plan=[];
  let pose=startPose(s);
  list.forEach((o,i)=>{
    s.kinds[i]=o.kind||'basic';
    s.plan.push({kind:s.kinds[i],local:toLocal(o.pts,pose),facing:o.facing!=null?o.facing:(s.kinds[i]==='drift'?pose.h+Math.PI:null)});
    pose=segEnd(curvesOf(s)[i]);
  });
  return curvesOf(s);
}
function setKind(id,slot,kind){
  const s=byIdS(id);
  if(!kindsFor(s).includes(kind))return false;
  s.kinds[slot]=kind;
  if(s.plan[slot]){s.plan[slot].kind=kind;if(kind==='drift'&&s.plan[slot].facing==null){const c=curvesOf(s)[slot];s.plan[slot].facing=c.start.h+Math.PI;}}
  return true;
}

/* ---------- execution ---------- */
function beginExec(){
  S.damaged=new Set();
  for(const s of S.ships){   // the action resolves as the exec begins
    if(!s.alive)continue;
    const a=s.faction==='reb'?s.action:aiActionOf(s);
    if(a&&a!=='none'&&actionsFor(s).includes(a)){doAction(s,a);s.st.actions=(s.st.actions||0)+1;}
    s.lastAction=a;
  }
  for(const s of S.ships){
    s.trail=[];s.sched=null;
    if(!s.alive||s.struct)continue;
    let segs;
    if(s.faction==='reb')segs=fullSchedule(s,curvesOf(s));
    else segs=planEnemy(s);
    s.sched=segs;s.lastKinds=segs.map(g=>g.auto?'glide':g.kind);
  }
  S.execT=0;
}
function poseAt(s,t){
  const segT=K().EXEC_LEN/AP_PER_ROUND,n=s.sched.length;
  const i=Math.min(n-1,Math.floor(t/segT)),u=Math.max(0,Math.min(1,(t-i*segT)/segT));
  const seg=s.sched[i],p=segPose(seg,u);
  let nose=p.vh;
  if(seg.flip&&u>0.82)nose=p.vh+Math.PI*Math.min(1,(u-0.82)/0.18);   // space.js manPath's K: the flip in the last 18%
  if(seg.kind==='drift'&&seg.facing!=null){   // the nose swings to the facing, holds, and swings back at the end
    const inK=Math.min(1,u/0.15),outK=u>0.9?(u-0.9)/0.1:0,f=seg.facing;
    nose=p.vh+angNorm(f-p.vh)*inK*(1-outK);
  }
  return {x:p.x,y:p.y,vh:p.vh,h:nose,seg,u,spd:p.spd};
}
function tick(dt){
  S.execT+=dt;
  const t=Math.min(S.execT,K().EXEC_LEN-1e-6);
  for(const s of S.ships){
    if(!s.alive||!s.sched)continue;
    const p=poseAt(s,t),ox=s.x,oy=s.y;
    s.x=p.x;s.y=p.y;s.h=p.h;s.vh=p.vh;s.vx=(s.x-ox)/dt;s.vy=(s.y-oy)/dt;
    s.flydef=p.seg.kind==='flydef';s.curKind=p.seg.kind;s.boosting=p.seg.kind==='boost';
    s.visRoll=s.flydef?Math.sin(S.execT*9)*0.9:p.seg.kind==='barrel'?Math.sin(Math.PI*p.u)*(p.seg.side||1):0;
    s.trail.push({x:s.x,y:s.y});if(s.trail.length>90)s.trail.shift();
  }
  S.clockT+=dt;
  combatTick(dt);
}
function endExec(){
  for(const s of S.ships)if(s.alive&&!S.damaged.has(s.id))adjCool(s,CALM_GAIN);   // breathing room (space.js endRound ~1082)
  fleeCheck();
  for(const s of S.ships){
    if(s.sched&&s.alive){const e=segEnd(s.sched[s.sched.length-1]);s.x=e.x;s.y=e.y;s.h=e.h;s.vh=e.h;}
    s.sched=null;s.plan=[];s.flydef=false;s.visRoll=0;s.curKind=null;
    s.kinds=['basic','basic'];s.action='none';
  }
  S.slot=0;
}

/* ---------- drawing ---------- */
function strokePts(c,pts,col,z,w,dash){
  c.save();c.lineCap='round';c.lineJoin='round';c.beginPath();
  pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
  c.lineWidth=(w+2.6)/z;c.strokeStyle=T.rgba(C.ink,0.6);c.stroke();
  if(dash)c.setLineDash(dash.map(d=>d/z));
  c.lineWidth=w/z;c.strokeStyle=col;c.stroke();c.restore();
}
function label(c,x,y,text,col,z){
  c.save();c.font='800 '+Math.round(11/z)+'px "Exo 2",sans-serif';c.textAlign='center';
  c.lineWidth=3.5/z;c.strokeStyle=C.ink;c.strokeText(text,x,y);c.fillStyle=col;c.fillText(text,x,y);c.restore();
}
function drawPlan(c,s,z,kit){
  const sel=s.id===S.sel,cs=curvesOf(s),all=fullSchedule(s,cs);
  all.forEach((seg,i)=>{
    const col=seg.auto?T.rgba(C.steel,0.55):seg.kind==='flydef'?C.shield:seg.kind==='basic'?(sel?C.gold:T.rgba(C.gold,0.7)):C.psi;
    strokePts(c,seg.pts,col,z,sel?3.6:2.6,seg.auto?[3,9]:null);
    const e=segEnd(seg),m=seg.pts[Math.floor(seg.pts.length/2)];
    if(sel&&!seg.auto)label(c,m.x,m.y-16/z,(i+1)+' · '+KINDS[seg.kind].short,col,z);
    kit.drawShipBody(c,s,{x:e.x,y:e.y,h:e.h,alpha:sel?0.38:0.22});
    if(sel&&!seg.auto){   // the handle where the next segment starts
      c.save();c.beginPath();c.arc(e.x,e.y,9/z,0,6.283);c.fillStyle=C.ink;c.fill();
      c.beginPath();c.arc(e.x,e.y,6/z,0,6.283);c.fillStyle=col;c.fill();c.restore();
    }
    if(seg.kind==='drift'&&seg.facing!=null&&!seg.auto){   // the facing handle: where the nose and guns point
      const pe=seg.pts[seg.pts.length-1],f=seg.facing,R=110;
      c.save();c.strokeStyle=C.psi;c.lineWidth=2/z;c.setLineDash([5/z,5/z]);
      c.beginPath();c.moveTo(pe.x,pe.y);c.lineTo(pe.x+Math.cos(f)*R,pe.y+Math.sin(f)*R);c.stroke();c.setLineDash([]);
      c.translate(pe.x+Math.cos(f)*R,pe.y+Math.sin(f)*R);c.rotate(Math.PI/4);
      c.fillStyle=C.ink;c.fillRect(-9/z,-9/z,18/z,18/z);c.fillStyle=C.psi;c.fillRect(-6/z,-6/z,12/z,12/z);c.restore();
      if(sel)label(c,pe.x+Math.cos(f)*R,pe.y+Math.sin(f)*R-16/z,'facing',C.psi,z);
    }
  });
  if(sel&&S.edit&&S.edit.mode==='drag'&&S.edit.id===s.id){c.save();c.globalAlpha=0.35;strokePts(c,S.edit.pts,C.text,z,2,[3,7]);c.restore();}
}
function drawArc(c,s,z){   // the firing band: the arc out to the longest gun, range bands dashed
  const reb=s.faction==='reb',col=reb?C.gold:C.heg,R=Math.max(300,...s.wpns.map(q=>q.w.rng));
  c.save();c.translate(s.x,s.y);c.rotate(s.h);
  c.fillStyle=T.rgba(col,reb?0.10:0.06);c.strokeStyle=T.rgba(col,0.4);c.lineWidth=1.4/z;
  c.beginPath();c.moveTo(0,0);c.arc(0,0,R,-ARCH,ARCH);c.closePath();c.fill();c.stroke();
  c.setLineDash([4/z,8/z]);for(let b=1;b*K().RU<R;b++){c.beginPath();c.arc(0,0,b*K().RU,-ARCH,ARCH);c.stroke();}
  c.restore();
}
function drawLocks(c,z){
  for(const s of S.ships){
    if(!s.alive||s.struct)continue;
    const t=byIdS(s.target);if(!t||!t.alive)continue;
    const lk=lockOf(s,t.id),reb=s.faction==='reb';
    if(!reb&&lk<0.05)continue;
    const col=reb?C.gold:C.heg;
    c.save();c.lineCap='round';
    c.beginPath();c.moveTo(s.x,s.y);c.lineTo(t.x,t.y);
    c.setLineDash([6/z,8/z]);c.lineWidth=(1.2+2.4*lk)/z;c.strokeStyle=T.rgba(col,0.25+0.6*lk);c.stroke();c.setLineDash([]);
    const r=30*SRDB.visualSize(t.row.size)*K().iconBoost();   // the lock dial: a ring that fills with lock %
    c.beginPath();c.arc(t.x,t.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*lk);c.lineWidth=4/z;c.strokeStyle=col;c.stroke();
    if(reb)label(c,t.x,t.y-r-8/z,'LOCK '+Math.round(lk*100)+'%',col,z);
    c.restore();
  }
}
function drawShots(c,z){
  c.save();c.lineCap='round';
  for(const p of S.proj){
    const k=0.022;
    c.beginPath();c.moveTo(p.x-p.vx*k,p.y-p.vy*k);c.lineTo(p.x,p.y);
    c.lineWidth=4/z;c.strokeStyle=T.rgba(C.ink,0.5);c.stroke();
    c.lineWidth=2.2/z;c.strokeStyle=p.faction==='reb'?C.goldHi:C.shield;c.stroke();
  }
  for(const m of S.missiles){
    if(m.trail.length>1){c.beginPath();m.trail.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.lineWidth=2/z;c.strokeStyle=T.rgba(C.steel,0.5);c.stroke();}
    c.beginPath();c.arc(m.x,m.y,5/z,0,6.283);c.fillStyle=C.psi;c.fill();
  }
  const now=S.clockT;
  S.fx=S.fx.filter(f=>now-f.t0<0.9);
  for(const f of S.fx){
    const k=(now-f.t0)/(f.kind==='boom'?0.9:0.35);if(k>1)continue;
    c.globalAlpha=1-k;
    const r=(f.kind==='boom'?60*(f.size||1):f.kind==='fizz'?6:14)*(0.3+k)/Math.max(0.6,z*1.4);
    c.beginPath();c.arc(f.x,f.y,r,0,6.283);
    c.strokeStyle=f.kind==='shield'?C.shield:f.kind==='fizz'?C.text3:C.hazard;c.lineWidth=(f.kind==='boom'?4:2)/z;c.stroke();
  }
  c.restore();
}
function draw(c){
  const kit=K(),z=kit.cam.z,phase=kit.phase;
  const sel=byIdS(S.sel);
  if(sel&&sel.alive&&!sel.struct)drawArc(c,sel,z);
  for(const s of S.ships){
    if(!s.alive||s.trail.length<2)continue;
    c.save();c.globalAlpha=0.35;strokePts(c,s.trail,s.faction==='reb'?C.rebelHi:C.hegHi,z,2.6);c.restore();
  }
  if(phase==='PLAN')for(const s of S.ships)if(s.alive&&s.faction==='reb'&&!s.struct)drawPlan(c,s,z,kit);
  for(const s of S.ships){
    if(!s.alive)continue;
    if(s.id===S.sel){c.save();c.strokeStyle=C.gold;c.lineWidth=2.4/z;c.beginPath();c.arc(s.x,s.y,34*kit.iconBoost(),0,6.283);c.stroke();c.restore();}
    if(s.flydef){c.save();c.strokeStyle=T.rgba(C.shield,0.7);c.lineWidth=2/z;c.setLineDash([4/z,6/z]);c.beginPath();c.arc(s.x,s.y,28*kit.iconBoost(),0,6.283);c.stroke();c.restore();}
    kit.drawShipBody(c,s,{roll:s.visRoll,boost:s.boosting});
  }
  if(TELLS)for(const s of S.ships)if(s.alive&&s.faction!=='reb'&&!s.struct&&doctrineOf(s).tell)doctrineOf(s).tell(c,s,z);
  drawLocks(c,z);
  drawShots(c,z);
}

/* ---------- the orders strip ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function hud(){
  const s=byIdS(S.sel);
  if(!s)return '<span class="arn-orders__note">Select a ship.</span>';
  let h='<span class="arn-orders__name">'+esc(s.name)+'</span><span class="arn-orders__note">'+esc(s.row.name)+' · '+(s.pilot.preset||'roster')+' L'+s.pilot.level+' · nerve '+Math.round(s.pilot.cool)+'</span>';
  if(s.faction!=='reb'||s.struct)return h+(s.doctrine?'<span class="arn-orders__note">Doctrine: '+esc(s.doctrine)+'</span>':'');
  const t=byIdS(s.target);
  h+='<span class="arn-orders__note">Target '+(t&&t.alive?esc(t.name)+' · lock '+Math.round(lockOf(s,t.id)*100)+'%':'none')+' · '+
    s.wpns.map(q=>esc(q.w.name)+(q.ammo!==undefined?' ×'+q.ammo:'')).join(', ')+' · click a hostile to target it</span>';
  if(K().phase!=='PLAN')return h;
  h+='<span class="arn-orders__note">AP '+s.plan.length+'/'+AP_PER_ROUND+' · drag from the ship, then from the end handle</span>';
  for(let i=0;i<AP_PER_ROUND;i++){
    h+='<span class="arn-orders__grp"><span class="arn-orders__lbl">Seg '+(i+1)+'</span>';
    for(const k of kindsFor(s))h+='<button type="button" class="sr-btn" data-act="kind" data-slot="'+i+'" data-kind="'+k+'" aria-pressed="'+(s.kinds[i]===k)+'">'+KINDS[k].short+'</button>';
    h+='</span>';
  }
  const acts=actionsFor(s),basic=acts.filter(a=>!ACTIONS[a].special);
  h+='<span class="arn-orders__grp"><span class="arn-orders__lbl">Action</span>';
  for(const a of basic)if(a!=='none')h+='<button type="button" class="sr-btn" data-act="action" data-action="'+a+'" aria-pressed="'+(s.action===a)+'">'+ACTIONS[a].short+'</button>';
  h+='</span><span class="arn-orders__grp"><span class="arn-orders__lbl">Special</span>';
  const sp=specialAbilities(s);
  h+=sp.length?sp.map(a=>'<button type="button" class="sr-btn" data-act="action" data-action="'+a+'" aria-pressed="'+(s.action===a)+'">'+ACTIONS[a].short+'</button>').join(''):'<span class="arn-orders__note">none yet</span>';
  h+='<span class="arn-orders__lbl">Ship</span><span class="arn-orders__note">none yet</span></span>';
  h+='<span class="arn-orders__grp"><button type="button" class="sr-btn sr-btn--ghost" data-act="clear">Clear</button></span>';
  return h;
}
function hudAction(a,el){
  const s=byIdS(S.sel);if(!s)return;
  if(a==='kind')setKind(s.id,+el.dataset.slot,el.dataset.kind);
  else if(a==='action')setAction(s.id,s.action===el.dataset.action?'none':el.dataset.action);
  else if(a==='clear'){s.plan=[];s.kinds=['basic','basic'];s.action='none';}
}
function setAction(id,a){const s=byIdS(id);if(!actionsFor(s).includes(a))return false;s.action=a;return true;}
function key_(ev){
  const n=+ev.key;if(!(n>=1&&n<=9))return false;
  const own=S.ships.filter(s=>s.faction==='reb'&&s.alive);
  if(own[n-1]){S.sel=own[n-1].id;return true;}
  return false;
}

/* ---------- panel, metrics, determinism ---------- */
function panelGroup(){
  return [
    {key:'AP_PER_ROUND',label:'AP (segments) per round',min:1,max:3,step:1,get:()=>AP_PER_ROUND,set:v=>{AP_PER_ROUND=v;}},
    {key:'FLYDEF_FACTOR',label:'Fly Defensively: hit profile ×',min:0,max:1,step:0.05,get:()=>FLYDEF_FACTOR,set:v=>{FLYDEF_FACTOR=v;}},
    {key:'flydefImmunity',label:'Fly Defensively: immune except homing (your wording)',type:'toggle',get:()=>flydefImmunity,set:v=>{flydefImmunity=v;}},
    {key:'BOOST_MULT',label:'Boost: speed ×',min:1,max:3,step:0.1,get:()=>BOOST_MULT,set:v=>{BOOST_MULT=v;}},
    {key:'BOOST_TURN',label:'Boost: turn cap ×',min:0,max:1,step:0.05,get:()=>BOOST_TURN,set:v=>{BOOST_TURN=v;}},
    {key:'KTURN_MAX',label:'K-Turn: speed cap',min:1,max:5,step:1,get:()=>KTURN_MAX,set:v=>{KTURN_MAX=v;}},
    {key:'BARREL_LAT',label:'Barrel Roll: lateral (SU)',min:0,max:3,step:0.25,get:()=>BARREL_LAT,set:v=>{BARREL_LAT=v;}},
    {key:'SPEED_FLAIR',label:'Acceleration flair',type:'toggle',get:()=>SPEED_FLAIR,set:v=>{SPEED_FLAIR=v;}},
    {key:'FLAIR_DIP',label:'Flair: turn slowdown',min:0,max:0.8,step:0.05,get:()=>FLAIR_DIP,set:v=>{FLAIR_DIP=v;}},
    {key:'BURST_N',label:'Burst: projectiles',min:1,max:10,step:1,get:()=>BURST_N,set:v=>{BURST_N=v;}},
    {key:'BURST_EVERY',label:'Burst: every (s)',min:0.25,max:4,step:0.25,get:()=>BURST_EVERY,set:v=>{BURST_EVERY=v;}},
    {key:'PROJ_SPD',label:'Projectile speed',min:400,max:3000,step:100,get:()=>PROJ_SPD,set:v=>{PROJ_SPD=v;}},
    {key:'SPREAD_BASE',label:'Spread: base (°)',min:0,max:20,step:0.5,get:()=>SPREAD_BASE,set:v=>{SPREAD_BASE=v;}},
    {key:'RANGE_SPREAD',label:'Spread: + per RU past band 1 (°)',min:0,max:10,step:0.5,get:()=>RANGE_SPREAD,set:v=>{RANGE_SPREAD=v;}},
    {key:'SPREAD_AIM_K',label:'Spread: Aim narrowing',min:0,max:0.5,step:0.02,get:()=>SPREAD_AIM_K,set:v=>{SPREAD_AIM_K=v;}},
    {key:'SPREAD_NERVE_K',label:'Spread: nerve widening',min:0,max:4,step:0.1,get:()=>SPREAD_NERVE_K,set:v=>{SPREAD_NERVE_K=v;}},
    {key:'SPREAD_CRIT',label:'Spread: + per targeting crit (°)',min:0,max:10,step:0.5,get:()=>SPREAD_CRIT,set:v=>{SPREAD_CRIT=v;}},
    {key:'MISSILE_LOCK',label:'Missile: lock needed',min:0,max:1,step:0.05,get:()=>MISSILE_LOCK,set:v=>{MISSILE_LOCK=v;}},
    {key:'MISSILE_MINR',label:'Missile: minimum range (RU)',min:0,max:3,step:0.1,get:()=>MISSILE_MINR,set:v=>{MISSILE_MINR=v;}},
    {key:'MISSILE_SPD',label:'Missile: speed',min:200,max:1500,step:50,get:()=>MISSILE_SPD,set:v=>{MISSILE_SPD=v;}},
    {key:'MISSILE_TURN',label:'Missile: turn (rad/s)',min:0.5,max:6,step:0.1,get:()=>MISSILE_TURN,set:v=>{MISSILE_TURN=v;}},
    {key:'LOCK_GAIN',label:'Lock: gain per s (centred)',min:0.05,max:2,step:0.05,get:()=>LOCK_GAIN,set:v=>{LOCK_GAIN=v;}},
    {key:'LOCK_DECAY',label:'Lock: decay per s (behind)',min:0.05,max:2,step:0.05,get:()=>LOCK_DECAY,set:v=>{LOCK_DECAY=v;}},
    {key:'IMPACT_MIN',label:'Impact: skim damage ×',min:0,max:1,step:0.05,get:()=>IMPACT_MIN,set:v=>{IMPACT_MIN=v;}},
    {key:'LOCK_DMG_MAX',label:'Lock: damage bonus at 100%',min:0,max:3,step:0.1,get:()=>LOCK_DMG_MAX,set:v=>{LOCK_DMG_MAX=v;}},
    {key:'PROJ_DMG',label:'Projectile damage × weapon roll',min:0.05,max:1,step:0.05,get:()=>PROJ_DMG,set:v=>{PROJ_DMG=v;}},
    {key:'CRIT_DIRECT',label:'Crit chance on a direct hit',min:0,max:0.5,step:0.01,get:()=>CRIT_DIRECT,set:v=>{CRIT_DIRECT=v;}},
    {key:'HULL_LEN',label:'Hull ellipse: half-length',min:8,max:40,step:1,get:()=>HULL_LEN,set:v=>{HULL_LEN=v;}},
    {key:'HULL_WID',label:'Hull ellipse: half-width',min:4,max:30,step:1,get:()=>HULL_WID,set:v=>{HULL_WID=v;}},
    {key:'PREF_RANGE',label:'Pursuit: preferred range',min:100,max:900,step:20,get:()=>PREF_RANGE,set:v=>{PREF_RANGE=v;}},
    {key:'FLANK',label:'Pursuit: flank angle (rad)',min:0,max:1.5,step:0.05,get:()=>FLANK,set:v=>{FLANK=v;}},
    {key:'AI_NOISE',label:'AI goal noise',min:0,max:400,step:10,get:()=>AI_NOISE,set:v=>{AI_NOISE=v;}},
    {key:'TELLS',label:'Doctrine tells',type:'toggle',get:()=>TELLS,set:v=>{TELLS=v;}},
    {key:'CARDS',label:'Resolution cards and damage numbers',type:'toggle',get:()=>CARDS,set:v=>{CARDS=v;}},
  ].concat(Object.keys(ARENA_MOVESETS).map(pr=>({key:'moveset_'+pr,label:'Moveset: '+pr,type:'multi',
    options:['boost','drift','kturn','loop','barrel'].map(k=>({key:k,label:KINDS[k].short})),
    get:()=>ARENA_MOVESETS[pr].slice(),set:v=>{ARENA_MOVESETS[pr]=v.slice();}})));
}
function metricsRecord(){
  return S.ships.map(s=>({id:s.id,faction:s.faction,alive:s.alive,x:Math.round(s.x),y:Math.round(s.y),hull:s.hull,shields:totalShield(s),
    nerve:Math.round(s.pilot.cool),bursts:s.st.bursts,shots:s.st.shots,hits:s.st.hits,dmg:s.st.dmg,missiles:s.st.missiles,kills:s.st.kills,
    lockMax:Math.round((s.lockMax||0)*100),arcT:+s.st.arcT.toFixed(2),driftShots:s.st.driftShots,backShots:s.st.backShots,
    fled:!!s.fled,action:s.lastAction||'none',kinds:s.lastKinds||[]}));
}
function ships(){return S.ships;}
function stateHash(){return S.ships.map(s=>[s.id,s.x.toFixed(2),s.y.toFixed(2),s.h.toFixed(3),s.hull,s.arm,totalShield(s),Math.round(s.pilot.cool),s.alive?1:0,s.st.shots,s.st.hits].join(',')).join('|')+'#'+S.proj.length+'/'+S.missiles.length;}
function readout(){return S.ships.filter(s=>s.faction==='reb').map(s=>s.id+' nerve '+Math.round(s.pilot.cool)+' · hull '+s.hull+'/'+s.maxHull+' · shots '+s.st.shots+' / hits '+s.st.hits+' · lock max '+Math.round((s.lockMax||0)*100)+'%').join('\n');}

return {key:'sb',name:'SB Test',build,planInput,beginExec,tick,endExec,draw,hud,hudAction,key_,panelGroup,metricsRecord,ships,stateHash,readout,
  get dbg(){return {S,ARENA_MOVESETS,KINDS,CRITDEFS,ACTIONS,SB_DOCTRINES,fn:{planEnemy,fleeCheck,exitGoal,doctrineOf,envelope,kappaOf,buildCurve,curvesOf,fullSchedule,planSegs,setKind,kindsFor,movesetOf,segEnd,poseAt,maxSpeedOf,inArc,bearing,inFrontHemi,
      actionsFor,setAction,doAction,specialAbilities,shipAbilities,aiActionOf,
      hullHit,hullAxes,impactOf,hitShip,spreadOf,aimAngle,canFire,missileRefusal,lockOf,lockTick,combatTick,projTick,missileTick,fireTick,emitBursts,applyDamage,adjCool,coolState,
      setRng(f){S.rng=f;},setLoadout(id,list){const s=byIdS(id);s.wpns=loadout(s.row,list);return s.wpns;},
      shoot(id,ang,wkey){const s=byIdS(id),q=s.wpns.find(x=>x.key===(wkey||'w0'))||s.wpns[0];S.proj.push({x:s.x,y:s.y,vx:Math.cos(ang)*PROJ_SPD,vy:Math.sin(ang)*PROJ_SPD,owner:s.id,faction:s.faction,w:q.w,burst:0,life:q.w.rng/PROJ_SPD*1.15,age:0});}},
    AP_PER_ROUND_:()=>AP_PER_ROUND,FLYDEF_FACTOR_:()=>FLYDEF_FACTOR,BOOST_MULT_:()=>BOOST_MULT,BOOST_TURN_:()=>BOOST_TURN,KTURN_MAX_:()=>KTURN_MAX,
    BARREL_LAT_:()=>BARREL_LAT,FLAIR_DIP_:()=>FLAIR_DIP,SPEED_FLAIR_:()=>SPEED_FLAIR,flydefImmunity_:()=>flydefImmunity,
    BURST_N_:()=>BURST_N,BURST_EVERY_:()=>BURST_EVERY,PROJ_SPD_:()=>PROJ_SPD,SPREAD_BASE_:()=>SPREAD_BASE,RANGE_SPREAD_:()=>RANGE_SPREAD,
    SPREAD_AIM_K_:()=>SPREAD_AIM_K,SPREAD_NERVE_K_:()=>SPREAD_NERVE_K,SPREAD_CRIT_:()=>SPREAD_CRIT,MISSILE_LOCK_:()=>MISSILE_LOCK,MISSILE_MINR_:()=>MISSILE_MINR,
    MISSILE_SPD_:()=>MISSILE_SPD,MISSILE_TURN_:()=>MISSILE_TURN,LOCK_GAIN_:()=>LOCK_GAIN,LOCK_DECAY_:()=>LOCK_DECAY,IMPACT_MIN_:()=>IMPACT_MIN,
    LOCK_DMG_MAX_:()=>LOCK_DMG_MAX,PROJ_DMG_:()=>PROJ_DMG,PREF_RANGE_:()=>PREF_RANGE,FLANK_:()=>FLANK,AI_NOISE_:()=>AI_NOISE,TELLS_:()=>TELLS,CARDS_:()=>CARDS,CRIT_DIRECT_:()=>CRIT_DIRECT,HULL_LEN_:()=>HULL_LEN,HULL_WID_:()=>HULL_WID,
    set(k,v){const m={AP_PER_ROUND:()=>AP_PER_ROUND=v,FLYDEF_FACTOR:()=>FLYDEF_FACTOR=v,BOOST_MULT:()=>BOOST_MULT=v,SPEED_FLAIR:()=>SPEED_FLAIR=v,
      flydefImmunity:()=>flydefImmunity=v,PROJ_DMG:()=>PROJ_DMG=v,MISSILE_LOCK:()=>MISSILE_LOCK=v,LOCK_GAIN:()=>LOCK_GAIN=v,BURST_N:()=>BURST_N=v};m[k]();}};}};
})();
