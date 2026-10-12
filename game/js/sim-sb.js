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

   Phases B1–B5, and the designer's drag (11 Oct: drag to the destination, the ship banks there like a
   plane, as far as its dial allows): the skeleton; the envelope, AP
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
let FLAIR_DIP=0.35;       // acceleration flair: how much a minimum-radius turn brakes at its apex. placeholder
let SPEED_SCALE=1.25;     // every craft's speed range × this; turn radius unchanged. placeholder
let SLIP_OUT=32;          // how far a ship slides wide of its arc through a minimum-radius turn, world units. placeholder
let SLIP_NOSE=0.42;       // how far the nose leads into a minimum-radius turn, radians (the guns come round first). placeholder
let ACCEL=0.03;           // how fast speed can rise per 8 units flown (fraction of cruise). placeholder
let BRAKE=0.05;           // how fast it can fall. placeholder
let MOMENTUM=true;        // toggle: the reach depends on the speed the ship carries into the round
let MOM_UP=1.5;           // momentum: dial speeds a ship can gain in one round. placeholder
let MOM_DOWN=2;           // ...and shed (braking is quicker). placeholder
let MOM_TURN=1.5;         // momentum: tightest turn × (slowest straight / speed carried in) ^ this. placeholder
let SHIP_SCALE=1.35;      // drawn size and hull ellipse together, so what you see is what gets hit. placeholder
let BANK_ROLL=0.75;       // how far a ship rolls into a turn at its minimum radius (visual). placeholder
let SPEED_FLAIR=true;     // toggle: speed eases along the curve (visual pacing only)
let flydefImmunity=false; // toggle: the designer's literal Fly Defensively (cannot be hit except by homing)
/* the planning HUD (docs/SB-HUD-HANDOFF.md, "SB planning HUD: placeholders") */
let TRAY_GAP=18;          // px from the ship's edge to its tray. placeholder
let TRAY_ICON=36;         // px, a tray icon's side. placeholder
let TRAY_FLIP_ZONE=140;   // px from the stage's bottom edge: a ship inside it gets its tray above. placeholder
let TIP_DELAY=250;        // ms of hover or focus before an icon's card opens. placeholder
let showLockedMods=true;  // toggle: mods the pilot lacks show greyed with a lock, naming the preset that grants them
const STEP=8;            // sample spacing along an arc, world units

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

/* ---------- the reach (§2): the dial's templates as one continuous envelope ----------
   The dial says which turns a ship flies at which speeds: straights up to straight_max, 45° banks up to bank_max,
   90° hard turns up to turn_max. A move is one banked arc whose turn (θ, the heading it changes) and length are
   continuous between those templates: the furthest a ship can go falls from its top straight at θ = 0, through its
   top bank at 45°, to its top hard turn at 90°. Drawn on the map it is a spearpoint: a long narrow corridor ahead,
   short and wide to the sides. No arc is tighter than the slowest hard turn (the minimum radius), and no move turns
   more than 90° (a K-Turn or a Loop is the way round).
   A round is one dial move's worth of distance (top straight × SPEED_SCALE), shared across its AP segments: the
   second segment's reach is what the first left. A round flown shorter than the slowest straight is topped up with
   a straight glide, because a ship can't stop; otherwise the ship flies exactly the line you drew. */
const SEG_MIN=0.5;        // the shortest segment, in speed units
function kappaOf(s){
  const r=s.row,SU=K().SU;let k=0;
  if(r.turn_min!=null&&!critCount(s,'controls'))k=Math.max(k,Math.abs(TURNS.R)/(r.turn_min*SU));   // Control Surfaces: no hard turns
  if(r.bank_min!=null)k=Math.max(k,Math.abs(TURNS.r)/(r.bank_min*SU));
  return k;
}
/* momentum (the designer, 12 October): a ship carries the speed it flew last round (s.mom, in dial speeds). This
   round's distance must sit within MOM_UP faster and MOM_DOWN slower than that, and the faster it comes in, the
   wider its tightest turn, so out of a fast straight the hard-turn shoulders of the reach vanish and only banks are
   left; out of a slow round they are back but top speed is a round away. */
const cruiseOf=s=>(s.row.straight_min+maxSpeedOf(s))/2;
function dialOf(s){
  const r=s.row,sc=K().SU*SPEED_SCALE,ms=maxSpeedOf(s),ctl=critCount(s,'controls')>0;
  const smax=ms*sc,smin=r.straight_min*sc;
  const bmax=r.bank_max!=null?Math.min(r.bank_max,ms)*sc:null;
  const tmax=r.turn_max!=null&&!ctl?Math.min(r.turn_max,ms)*sc:null;
  const kap=kappaOf(s),mom=s.mom!=null?s.mom:cruiseOf(s);
  let roundMin=smin,roundMax=smax,kapM=kap;
  if(MOMENTUM&&!s.struct){
    roundMax=Math.max(smin,Math.min(smax,(mom+MOM_UP)*sc));
    roundMin=Math.max(smin,Math.min(smax,(mom-MOM_DOWN)*sc));
    kapM=kap*Math.min(1,Math.pow(r.straight_min/Math.max(r.straight_min,mom),MOM_TURN));
  }
  return {smin,smax,bmax,tmax,thMax:tmax!=null?Math.PI/2:bmax!=null?Math.PI/4:0,kap:kapM,kapBase:kap,mom,roundMin,roundMax};
}
/* budget: the round's distance left before this segment (unboosted units); null = a whole round */
function envelope(s,kind,budget){
  const d=dialOf(s),SU=K().SU,Q=Math.PI/4;
  const lmaxAt=a=>{a=Math.abs(a);
    if(a<=1e-9)return d.smax;
    if(d.bmax!=null&&a<=Q)return d.smax+(d.bmax-d.smax)*(a/Q);
    if(d.bmax!=null&&d.tmax!=null)return d.bmax+(d.tmax-d.bmax)*((a-Q)/Q);
    if(d.tmax!=null)return d.smax+(d.tmax-d.smax)*(a/(2*Q));
    return 0;};
  let thMax=d.thMax,mult=1,cap=Infinity,kap=d.kap;
  if(kind==='boost'){mult=BOOST_MULT;thMax*=BOOST_TURN;kap*=BOOST_TURN;}
  else if(kind==='kturn')cap=KTURN_MAX*SU*SPEED_SCALE;
  else if(kind==='loop')cap=d.smin;   // the flip with minimal displacement
  const left=budget==null?d.roundMax:Math.max(0,budget);
  const lo=a=>Math.max(SEG_MIN*SU,kap>0?Math.abs(a)/kap:0);
  const hi=a=>Math.min(lmaxAt(a)*mult,cap,left*mult);
  return {thMax,kap,mult,left,lo,hi,smin:d.smin,smax:d.smax,roundMin:d.roundMin,roundMax:d.roundMax,mom:d.mom,Lmin:lo(0),Lmax:hi(0)};
}
/* ---------- a move: drag to where the ship should end up; it banks there like a plane ----------
   A segment leaves along the ship's heading and runs to the destination as one steady banked arc. Inside the reach
   it ends exactly there; outside, it ends at the nearest point of the reach (shown while you drag). */
function arcLocal(k,len){   // the end of an arc of curvature k and length len, in the frame of its start (x ahead)
  if(Math.abs(k)<1e-9)return {x:len,y:0};
  return {x:Math.sin(k*len)/k,y:(1-Math.cos(k*len))/k};
}
const feasible=(env,th,L)=>Math.abs(th)<=env.thMax+1e-9&&L>=env.lo(th)-1e-6&&L<=env.hi(th)+1e-6;
function solveArc(start,dest,env){
  const dx=dest.x-start.x,dy=dest.y-start.y,c=Math.cos(start.h),sn=Math.sin(start.h);
  const lx=dx*c+dy*sn,ly=-dx*sn+dy*c,chord=Math.hypot(lx,ly);
  // the one arc that leaves along the heading and passes through the destination: turn θ, length L
  const th=2*Math.atan2(ly,lx),L=Math.abs(th)<1e-9?lx:th*chord/(2*Math.sin(th/2));
  if(chord>1&&lx>-1e-9&&feasible(env,th,L))return {k:Math.abs(th)<1e-9?0:th/L,len:L,th,reached:true};
  // outside the reach: its nearest point (a grid over turn and length, then a pattern search)
  const miss=(t,l)=>{const e=arcLocal(Math.abs(t)<1e-9?0:t/l,l);return Math.hypot(e.x-lx,e.y-ly);};
  const NT=env.thMax>0?48:0,NL=24;let bt=0,bl=Math.min(env.hi(0),Math.max(env.lo(0),0)),bd=1e18,any=false;
  for(let i=0;i<=NT;i++){
    const t=NT?-env.thMax+2*env.thMax*i/NT:0,a=env.lo(t),b=env.hi(t);if(b<a-1e-6)continue;
    for(let j=0;j<=NL;j++){const l=a+(b-a)*j/NL,m=miss(t,l);any=true;if(m<bd){bd=m;bt=t;bl=l;}}
  }
  if(!any)return {k:0,len:0,th:0,reached:false,none:true};   // no distance left this round
  let st=NT?env.thMax/NT:0,sl=Math.max(1,(env.hi(bt)-env.lo(bt))/NL);
  for(let it=0;it<40&&(st>1e-5||sl>0.05);it++){
    let moved=false;
    for(const [dt,dl] of [[st,0],[-st,0],[0,sl],[0,-sl]]){
      const t=Math.max(-env.thMax,Math.min(env.thMax,bt+dt)),a=env.lo(t),b=env.hi(t);if(b<a-1e-6)continue;
      const l=Math.max(a,Math.min(b,bl+dl)),m=miss(t,l);
      if(m<bd-1e-9){bd=m;bt=t;bl=l;moved=true;}
    }
    if(!moved){st/=2;sl/=2;}
  }
  return {k:Math.abs(bt)<1e-9?0:bt/bl,len:bl,th:bt,reached:bd<1};
}
/* the slip: through a hard turn the ship slides a little wide of its arc (back on it by the end) */
function sampleArc(start,k,len,kapBase){
  const {W,H,MARGIN}=K(),n=Math.max(2,Math.ceil(len/STEP)),c=Math.cos(start.h),sn=Math.sin(start.h),pts=[];
  const r=kapBase>0?Math.min(1,Math.abs(k)/kapBase):0,slide=SLIP_OUT*r*Math.sign(k);
  for(let i=0;i<=n;i++){
    const t=len*i/n,e=arcLocal(k,t),h=start.h+k*t,u=i/n,off=-slide*Math.pow(Math.sin(Math.PI*u),2);
    let x=start.x+e.x*c-e.y*sn,y=start.y+e.x*sn+e.y*c;
    x-=Math.sin(h)*off;y+=Math.cos(h)*off;
    // the map edge: the ship slides along it (space.js clampEnd's idea, per point)
    pts.push({x:Math.min(Math.max(x,MARGIN),W-MARGIN),y:Math.min(Math.max(y,MARGIN),H-MARGIN),h,k});
  }
  return pts;
}
function makeSeg(s,start,sol,kind,env,dest){
  const kapBase=kappaOf(s);
  const pts=sampleArc(start,sol.k,sol.len,kapBase);
  const seg={kind,pts,L:sol.len,k:sol.k,th:sol.th!=null?sol.th:sol.k*sol.len,env,kapBase,used:sol.len/(env?env.mult:1),
    dest:dest?{x:dest.x,y:dest.y}:{x:pts[pts.length-1].x,y:pts[pts.length-1].y},start:{x:start.x,y:start.y,h:start.h},
    flip:kind==='kturn'||kind==='loop',lat:0,side:1,t0:null,t1:null,none:!!sol.none};
  seg.tcum=pts.map((p,i)=>i/(pts.length-1));seg.speed=pts.map(()=>1);
  return seg;
}
/* drag: the dragged points; only the last matters, the destination. budget: the round's distance left */
function buildCurve(s,start,drag,kind,budget){
  const env=envelope(s,kind,budget);
  const dest=drag&&drag.length?drag[drag.length-1]:{x:start.x+Math.cos(start.h)*env.Lmin,y:start.y+Math.sin(start.h)*env.Lmin};
  let side=1,lat=0,aim=dest;
  if(kind==='barrel'){   // a roll toward the side the destination lies on, heading kept: the arc aims short of it by the roll
    const ly=-(dest.x-start.x)*Math.sin(start.h)+(dest.y-start.y)*Math.cos(start.h);
    side=ly<0?-1:1;lat=BARREL_LAT*K().SU;
    const pre=solveArc(start,dest,env),he=start.h+pre.k*pre.len;
    aim={x:dest.x+Math.sin(he)*side*lat,y:dest.y-Math.cos(he)*side*lat};
  }
  const seg=makeSeg(s,start,solveArc(start,aim,env),kind,env,dest);
  if(kind==='barrel'){
    const {W,H,MARGIN}=K(),pts=seg.pts;seg.lat=lat;seg.side=side;
    for(let i=0;i<pts.length;i++){
      const u=i/(pts.length-1),sm=u*u*(3-2*u),off=side*lat*sm,p=pts[i];
      p.x=Math.min(Math.max(p.x-Math.sin(p.h)*off,MARGIN),W-MARGIN);p.y=Math.min(Math.max(p.y+Math.cos(p.h)*off,MARGIN),H-MARGIN);
    }
  }
  const e=seg.pts[seg.pts.length-1];seg.reached=Math.hypot(e.x-dest.x,e.y-dest.y)<2;
  return seg;
}
/* the round's pacing. Time follows distance (a boosted stretch at BOOST_MULT the speed); then each manoeuvre has its
   own speed profile: a turn brakes into its apex and powers out (harder the tighter it is), a Boost surges, and
   speed carries across segment boundaries at a limited rate, so a ship visibly accelerates out of a hard bank.
   Where the ship goes, and the round's length, never change: only when it gets there. */
function paceSchedule(segs){
  const EX=K().EXEC_LEN,steps=[];let D=0;
  for(const g of segs)D+=g.L/((g.env&&g.env.mult)||1);
  segs.forEach((g,j)=>{
    const mult=(g.env&&g.env.mult)||1,n=g.pts.length-1,r=g.kapBase>0?Math.min(1,Math.abs(g.k)/g.kapBase):0;
    for(let i=1;i<=n;i++){
      const ds=dist(g.pts[i-1],g.pts[i]),u=(i-0.5)/n;
      let f=1;
      if(SPEED_FLAIR){
        if(g.kind==='boost')f=0.8+0.55*u;                                       // the surge
        else if(g.auto)f=0.8;                                                   // the glide: throttled back
        else f=1-FLAIR_DIP*Math.pow(r,0.8)*Math.pow(Math.sin(Math.PI*u),0.8);  // brake into the turn, power out
      }
      steps.push({dt:D>0?EX*(ds/mult)/D:EX/(n||1)/segs.length,f});
    }
  });
  if(SPEED_FLAIR){
    for(let i=1;i<steps.length;i++)steps[i].f=Math.min(steps[i].f,steps[i-1].f+ACCEL);    // accelerating takes time
    for(let i=steps.length-2;i>=0;i--)steps[i].f=Math.min(steps[i].f,steps[i+1].f+BRAKE);  // braking is quicker
  }
  let tot=0;for(const st of steps){st.dt/=Math.max(0.2,st.f);tot+=st.dt;}
  const sc=tot>0?EX/tot:1;
  let t=0,q=0;
  segs.forEach(g=>{
    g.t0=t;const cum=[0];g.speed=[steps[q]?steps[q].f:1];
    for(let i=1;i<g.pts.length;i++){const st=steps[q++];t+=st.dt*sc;cum.push(t-g.t0);g.speed.push(st.f);}
    g.t1=t;const span=(g.t1-g.t0)||1;g.tcum=cum.map(x=>x/span);
  });
  if(segs.length)segs[segs.length-1].t1=EX;
  return segs;
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
/* destinations are kept in the segment's own frame, so a segment can be rebuilt from a new start pose */
const toLocal=(pts,o)=>pts.map(p=>{const dx=p.x-o.x,dy=p.y-o.y,c=Math.cos(-o.h),sn=Math.sin(-o.h);return {x:dx*c-dy*sn,y:dx*sn+dy*c};});
const toWorld=(pts,o)=>pts.map(p=>{const c=Math.cos(o.h),sn=Math.sin(o.h);return {x:o.x+p.x*c-p.y*sn,y:o.y+p.x*sn+p.y*c};});


/* =====================================================================
   SB shooting (§3): projectiles, lock as a dial, glancing geometry.
   Misses are things that visibly fly past.
   ===================================================================== */
let BURST_N=4;            // projectiles in a burst. placeholder
let BURST_EVERY=2.0;      // seconds between a gun's bursts (and a missile rack's launches). placeholder
let PROJ_SPD=850;         // projectile speed, world units a second: slow enough to watch a burst cross the gap. placeholder
let SPREAD_BASE=6;        // burst spread, degrees (the cone's full width) before Aim, nerve and range. placeholder
let RANGE_SPREAD=3;       // ballistic and plasma spread added per range unit beyond band 1, degrees. placeholder
let SPREAD_AIM_K=0.1;     // Aim narrows spread: × 1 / (1 + this × the Aim bonus). placeholder
let SPREAD_NERVE_K=1.5;   // falling nerve widens it: × 1 + this × (1 − nerve / 100). placeholder
let SPREAD_CRIT=3;        // degrees added per Targeting Array Damage critical. placeholder
let MISSILE_LOCK=0.6;     // missiles need at least this lock. placeholder
let MISSILE_MINR=1.5;     // ...and at least this range, in range units. placeholder
let MISSILE_SPD=800;      // missile speed (faster than the fastest craft at the default SPEED_SCALE). placeholder
let MISSILE_TURN=2.4;     // missile turn rate, radians a second. placeholder
let LOCK_GAIN=0.4;        // lock gained a second with the target dead centre (zero at the arc's edge). placeholder
let LOCK_DECAY=0.5;       // lock lost a second once the target is behind the firer. placeholder
let IMPACT_MIN=0.2;       // damage scale for the shallowest skim (1.0 dead-on). placeholder
let LOCK_DMG_MAX=1.0;     // damage × (1 + lock × this): a full lock doubles it. placeholder
let PROJ_DMG=0.25;        // each projectile's share of a weapon roll: 1 / BURST_N makes a burst one roll, as one attack today. placeholder
let CRIT_DIRECT=0.10;     // critical chance on a direct hit (impact ≥ 0.8), plus the weapon's own. placeholder
let HULL_LEN=22,HULL_WID=10;   // the hull ellipse's semi-axes before the ship's visual size. placeholder
const BURST_GAP=0.08;     // seconds between a burst's projectiles
/* sound: arena.js's v2 voices (no state, so the sim stays deterministic); bursts are throttled so a furball stays legible */
let sfxAt={};
function sfx(k){
  try{
    if(SR.audio.off())return;
    const now=performance.now();if(now-(sfxAt[k]||0)<(k==='shot'?70:k==='hit'?50:0))return;sfxAt[k]=now;
    if(k==='shot')SR.audio.osc('square',900,500,0.015,0.05);
    else if(k==='hit')SR.audio.nz('bandpass',1800,2,0.05,0.08);
    else if(k==='boom')SR.audio.nz('lowpass',600,1,0.12,0.5,0,90);
  }catch(e){}
}
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
  const v=SRDB.visualSize(s.row.size)*SHIP_SCALE;
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
      S.fx.push({x:s.x+Math.cos(s.h)*18,y:s.y+Math.sin(s.h)*18,h,t0:S.clockT,kind:'muzzle',reb:s.faction==='reb'});
      if(B.fired===0)sfx('shot');
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
  S.fx.push({x:hit.x,y:hit.y,t0:S.clockT,kind:r.sd>0&&r.ad+r.hd===0?'shield':'hull',h:Math.atan2(vy,vx)});
  sfx('hit');
  if(t.hull<=0&&t.alive)destroyShip(t,s);
  return {dmg,imp,lock:lk,r,crit};
}
function destroyShip(t,killer){
  t.alive=false;t.hull=Math.min(t.hull,0);
  S.fx.push({x:t.x,y:t.y,t0:S.clockT,kind:'boom',size:SRDB.visualSize(t.row.size)});
  sfx('boom');
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
    wpns:loadout(r,d.loadout),target:null,locks:{},lockMax:0,action:'none',mom:null,
    st:{bursts:0,shots:0,hits:0,dmg:0,missiles:0,kills:0,arcT:0,driftShots:0,backShots:0,actions:0},
    plan:[],           // planned segments: {kind, local (the drag in the segment's frame), facing}
    kinds:['basic','basic'],   // the mode armed for each AP slot (Basic each turn)
    step:null,actDone:false,endHere:false,   // the planning stepper (docs/SB-HUD-HANDOFF.md §2): where its tray is
    sched:null,visRoll:0,flydef:false};
}
function build(world,rng,api){
  S={ships:world.cast.map(mkShip),rocks:world.rocks,rng,api,sel:null,slot:0,edit:null,execT:0,world,
    proj:[],bursts:[],missiles:[],fx:[],burstN:0,clockT:0,damaged:new Set(),clk:null,planT:{},execFocus:false};
  const p=S.ships.find(s=>s.faction==='reb'&&!s.struct);S.sel=p?p.id:null;
  clockReset();
  for(const s of S.ships)if(!s.struct)s.target=defaultTarget(s);
}
const byIdS=id=>S.ships.find(s=>s.id===id);
const startPose=s=>({x:s.x,y:s.y,h:s.h});

/* the planned segments as curves, from the ship's pose at the start of the round; each one's reach is the round's
   distance the earlier ones left */
function curvesOf(s){
  const out=[];let pose=startPose(s),left=dialOf(s).roundMax;
  for(let i=0;i<s.plan.length;i++){
    const p=s.plan[i];
    const seg=buildCurve(s,pose,toWorld(p.local,pose),p.kind,left);
    seg.facing=p.facing;seg.slot=i;seg.left=left;
    out.push(seg);pose=segEnd(seg);left-=seg.used;
  }
  return out;
}
function distanceLeft(s,cs){let left=dialOf(s).roundMax;for(const g of cs||curvesOf(s))left-=g.used;return Math.max(0,left);}
/* a round flown short of the slowest straight is topped up with a straight glide (a ship can't stop); otherwise the
   ship flies exactly what was drawn. Unspent AP buys nothing in v1. */
function fullSchedule(s,planned){
  const segs=planned.filter(g=>!g.none&&g.L>0);
  let used=0;for(const g of segs)used+=g.used;
  const need=dialOf(s).roundMin-used;   // momentum: it can't come in slower than this
  if(need>1){
    const pose=segs.length?segEnd(segs[segs.length-1]):startPose(s);
    const g=makeSeg(s,pose,{k:0,len:need,th:0},'basic',null,null);
    g.auto=true;segs.push(g);
  }
  return segs;
}

/* ---------- enemies (§5): doctrine goals feeding a continuous planner ----------
   A doctrine is a goal function plus its always-on tell, the same shape as v2's (docs/ARENA-HANDOFF.md §3.5):
   one goal function, two planners. Here the goal seeds a manoeuvre search (below) that the doctrine can weight.
   Only pursuit exists so far; the
   other doctrines arrive in whichever ruleset reaches its doctrine phase first and are then ported across. */
let PREF_RANGE=340;   // copied from space.js aiManeuver ~620 (prefD)
let FLANK=0.55;       // radians each further pursuer of one target sits off the line behind it, alternating sides. placeholder
let AI_NOISE=0;       // extra score noise on every enemy's choice, in hundredths (0 = each pilot's own). placeholder
let TELLS=true;       // toggle: draw each doctrine's tell
let CARDS=true;       // toggle: burst resolution cards and damage numbers (off quiets the screen at the ship cap)
function nearestFoe(s){let best=null,bd=1e18;for(const t of S.ships)if(t.alive&&t.faction!==s.faction&&!t.struct){const d=dist(s,t);if(d<bd){bd=d;best=t;}}return best;}
const SB_DOCTRINES={
  pursuit:{key:'pursuit',weights:{},   // the search's default weights: guns on the target, out of its guns, on its six
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
/* ---------- the Hegemony's pilots: a manoeuvre search ----------
   Each enemy tries a spread of manoeuvres through its reach (9 turns × 4 lengths for the first segment, 7 × 2 for
   the second, plus its doctrine's goal as a seed) and flies the best. It predicts where its target is going from how
   that ship is flying now (holding its current turn: AI_LOOK), never from the plan you just drew, and scores each
   option over ten moments of the round: its guns on the target (more for centred and close), the target's guns on
   it, ending at its preferred range and behind the target, and staying off the rocks, the map edge and its
   wingmates. A green pilot's choice is noisier than a veteran's. */
let AI_LOOK=1;            // how much of the target's current turn the AI expects it to hold (0 = flies straight). placeholder
let AI_W_ARC=3;           // score per moment with its guns on the target. placeholder
let AI_W_THREAT=3;        // score lost per moment under the target's guns. placeholder
let AI_W_RANGE=2;         // score lost for ending off its preferred range. placeholder
let AI_W_SIX=1.5;         // score for ending behind the target. placeholder
let AI_SWING=0.5;         // radians the AI expects its target can swing its nose: the danger cone is the arc plus this. placeholder
let AI_OVERSHOOT=700;     // ending in front of the target closer than this is an overshoot, scored down. placeholder
let AI_JITTER=1.2;        // a green pilot's score noise; it shrinks with the Aim bonus. placeholder
const AI_ROCK=60,AI_EDGE=6,AI_MATE=4,AI_SAMPLES=10;
function predictor(t){
  const EX=K().EXEC_LEN;let v=Math.hypot(t.vx||0,t.vy||0);
  const h=v>1?Math.atan2(t.vy,t.vx):t.h;
  if(v<=1)v=dialOf(t).smin/EX;   // not moving yet: its slowest straight
  let k=AI_LOOK*(t.wh||0)/v;const kc=kappaOf(t);if(kc>0)k=Math.max(-kc,Math.min(kc,k));
  return time=>{const e=arcLocal(k,v*time),c=Math.cos(h),sn=Math.sin(h);return {x:t.x+e.x*c-e.y*sn,y:t.y+e.x*sn+e.y*c,h:h+k*v*time};};
}
/* where a two-segment plan puts the ship at each moment (time follows distance; the glide tops up a short round) */
function planTrack(start,legs,smin,nSamples){
  const NS=nSamples||AI_SAMPLES;
  const out=[];let pose={x:start.x,y:start.y,h:start.h},D=0;const parts=[];
  for(const l of legs){parts.push({p:pose,k:l.k,L:l.L});const e=arcLocal(l.k,l.L),c=Math.cos(pose.h),sn=Math.sin(pose.h);
    pose={x:pose.x+e.x*c-e.y*sn,y:pose.y+e.x*sn+e.y*c,h:pose.h+l.k*l.L};D+=l.L;}
  if(D<smin){parts.push({p:pose,k:0,L:smin-D});D=smin;}
  for(let j=1;j<=NS;j++){
    let d=D*j/NS;
    for(const q of parts){if(d<=q.L+1e-9||q===parts[parts.length-1]){const l=Math.min(d,q.L),e=arcLocal(q.k,l),c=Math.cos(q.p.h),sn=Math.sin(q.p.h);
      out.push({x:q.p.x+e.x*c-e.y*sn,y:q.p.y+e.x*sn+e.y*c,h:q.p.h+q.k*l});break;}d-=q.L;}
  }
  return out;
}
function legsThrough(env,nt,fracs){   // a spread of (turn, length) legs across a reach
  const out=[],N=env.thMax>0?nt:1;
  for(let i=0;i<N;i++){
    const th=N>1?-env.thMax+2*env.thMax*i/(N-1):0,a=env.lo(th),b=env.hi(th);if(b<a-1e-6)continue;
    for(const f of fracs){const L=a+(b-a)*f;out.push({k:Math.abs(th)<1e-9?0:th/L,L});}
  }
  return out;
}
function aiPickTarget(s){   // the nearest hostile, favouring one already in its guns and one already hurt; sticky
  let best=null,bs=-1e18;
  for(const t of S.ships){
    if(!t.alive||t.faction===s.faction||t.struct)continue;
    const hp=(totalShield(t)+t.arm+t.hull)/((maxShield(t)+t.maxArm+t.maxHull)||1);
    const sc=-dist(s,t)+(inArc(s,t)?350:0)+250*(1-hp)+(t.id===s.target?250:0);
    if(sc>bs){bs=sc;best=t;}
  }
  return best?best.id:null;
}
function planSearch(s,kind,weights,mates){
  const EX=K().EXEC_LEN,{W,H,MARGIN,RU}=K(),w=Object.assign({arc:AI_W_ARC,threat:AI_W_THREAT,range:AI_W_RANGE,six:AI_W_SIX},weights||{});
  const t=byIdS(s.target),start=startPose(s),d=dialOf(s);
  const rng=Math.max(300,...s.wpns.map(q=>q.w.rng),0),trng=t?Math.max(300,...t.wpns.map(q=>q.w.rng),0):0;
  const pred=t&&t.alive?predictor(t):null;
  const jit=AI_JITTER*Math.max(0.1,1-aimBonus(s)/8)+AI_NOISE/100;
  const env1=envelope(s,kind,d.roundMax);
  const firsts=legsThrough(env1,9,[0,0.35,0.7,1]);
  // the doctrine's goal, as a seed
  const g=doctrineOf(s).goal(s)(start,0),seed=solveArc(start,g,env1);if(!seed.none)firsts.push({k:seed.k,L:seed.len});
  let best=null,bs=-1e18;
  for(const a of firsts){
    const e1=arcLocal(a.k,a.L),c=Math.cos(start.h),sn=Math.sin(start.h);
    const p1={x:start.x+e1.x*c-e1.y*sn,y:start.y+e1.x*sn+e1.y*c,h:start.h+a.k*a.L};
    const used=a.L/env1.mult,env2=envelope(s,kind,d.roundMax-used);
    const seconds=AP_PER_ROUND>1&&env2.left>=SEG_MIN*K().SU?legsThrough(env2,7,[0.5,1]):[];
    seconds.push(null);
    for(const b of seconds){
      const legs=b?[a,b]:[a],track=planTrack(start,legs,d.roundMin);
      let sc=0;
      // the rocks, densely along the whole flight (every ~30 units), with a little clearance
      const fine=planTrack(start,legs,d.roundMin,Math.max(12,Math.ceil(track.length&&(legs.reduce((q,l)=>q+l.L,0)/30))));
      let inRock=0;   // graded: a pilot boxed in by its momentum at least spends as little of the round over rock as it can
      for(const P of fine){for(const r of S.rocks)if(Math.hypot(P.x-r.x,P.y-r.y)<r.r*0.9+30){inRock++;break;}}
      if(inRock)sc-=AI_ROCK*(1+4*inRock/fine.length);
      // a round ahead: momentum commits it to at least its slowest straight next round, so a plan that ends pointed
      // at a rock is scored down too (lighter, since it can still bank)
      {const Ef=fine[fine.length-1],run=Math.max(d.smin,legs.reduce((q,l)=>q+l.L,0)-MOM_DOWN*K().SU*SPEED_SCALE);let ahead=0;
        for(let j=1;j<=6;j++){const qx=Ef.x+Math.cos(Ef.h)*run*j/6,qy=Ef.y+Math.sin(Ef.h)*run*j/6;for(const r of S.rocks)if(Math.hypot(qx-r.x,qy-r.y)<r.r*0.9+30){ahead++;break;}}
        if(ahead)sc-=AI_ROCK*0.5*ahead/6;}
      track.forEach((P,j)=>{
        const time=EX*(j+1)/AI_SAMPLES;
        if(pred){
          const Q=pred(time),dd=Math.hypot(Q.x-P.x,Q.y-P.y);
          const bA=Math.abs(angNorm(Math.atan2(Q.y-P.y,Q.x-P.x)-P.h));
          if(bA<=ARCH&&dd<=rng)sc+=w.arc*(1-bA/ARCH)*(dd<RU?1.3:1);
          // the target can swing its nose, so the danger cone is wider than its guns' arc
          const bT=Math.abs(angNorm(Math.atan2(P.y-Q.y,P.x-Q.x)-Q.h)),cone=ARCH+AI_SWING;
          if(bT<=cone&&dd<=trng)sc-=w.threat*(1-bT/cone);
        }
        if(P.x<MARGIN+30||P.x>W-MARGIN-30||P.y<MARGIN+30||P.y>H-MARGIN-30)sc-=AI_EDGE;
      });
      const E=track[track.length-1];
      if(pred){
        const Q=pred(EX),de=Math.hypot(Q.x-E.x,Q.y-E.y);
        sc-=w.range*Math.abs(de-PREF_RANGE)/PREF_RANGE;
        const bT=Math.abs(angNorm(Math.atan2(E.y-Q.y,E.x-Q.x)-Q.h));
        if(bT>Math.PI/2)sc+=w.six*(bT-Math.PI/2)/(Math.PI/2);                // on its six
        else if(de<AI_OVERSHOOT)sc-=w.six*2*(1-bT/(Math.PI/2))*(1-de/AI_OVERSHOOT);   // overshot, in front of it and close
      }
      for(const m of mates){const dm=Math.hypot(E.x-m.x,E.y-m.y);if(dm<180)sc-=AI_MATE*(1-dm/180);}
      sc+=(S.rng()-0.5)*2*jit;
      if(sc>bs){bs=sc;best=legs;}
    }
  }
  const segs=[];let pose=start,left=d.roundMax;
  for(const l of best||[]){
    const env=envelope(s,kind,left);
    const seg=makeSeg(s,pose,{k:l.k,len:l.L,th:l.k*l.L},kind,env,null);
    segs.push(seg);pose=segEnd(seg);left-=seg.used;
  }
  s.aiScore=bs;
  return segs;
}
function planToward(s,goalFn,kind){   // a straight run at a goal (a fleeing pilot), on the same reach
  const segs=[];let pose=startPose(s),left=dialOf(s).roundMax;
  for(let i=0;i<AP_PER_ROUND;i++){
    if(left<SEG_MIN*K().SU)break;
    const seg=buildCurve(s,pose,[goalFn(pose,i)],kind||'basic',left);
    if(seg.none)break;
    segs.push(seg);pose=segEnd(seg);left-=seg.used;
  }
  return segs;
}
function planEnemy(s,mates){
  if(coolState(s)==='panic'){   // doctrine is how they fight, not a second health bar
    if(s.flees)return planToward(s,exitGoal(s),'basic');
    return planSearch(s,'flydef',{arc:0.5,threat:AI_W_THREAT*3},mates||[]);
  }
  return planSearch(s,'basic',doctrineOf(s).weights,mates||[]);
}
function fleeCheck(){   // a panicking ship that flees and reaches the edge jumps out (space.js endRound ~1084)
  const {W,H,MARGIN}=K();
  for(const s of S.ships){
    if(s.alive&&s.flees&&coolState(s)==='panic'&&(s.x<MARGIN+120||s.x>W-MARGIN-120||s.y<MARGIN+120||s.y>H-MARGIN-120)){
      s.alive=false;s.fled=true;K().addFloater(s.x,s.y,'JUMPED OUT',C.text3);
    }
  }
}

/* ---------- the planning stepper (docs/SB-HUD-HANDOFF.md §2) ----------
   Each of your ships is planned in order: SEG 1 (arm a mode, drag the path; a Drift then sets its facing), the
   action that fires between the moves, then SEG 2 (or End here). s.step is the step its tray shows; nextStep is
   the first one not yet committed, so re-selecting a ship opens it there, and going back to an earlier step and
   committing it again carries on from the first gap. */
const segStep=st=>st==='seg1'||st==='seg2';
const faceStep=st=>st==='seg1_facing'||st==='seg2_facing';
const slotOf=st=>st&&st.startsWith('seg2')?1:0;
const groupOf=st=>!st?'s1':st.startsWith('seg1')?'s1':st==='action'?'act':st.startsWith('seg2')?'s2':'done';
const twoSegs=()=>AP_PER_ROUND>1;
function nextStep(s){
  const p0=s.plan[0],p1=s.plan[1];
  if(!p0)return 'seg1';
  if(p0.kind==='drift'&&!p0.faceSet)return 'seg1_facing';
  if(!s.actDone)return 'action';
  if(!twoSegs()||s.endHere)return 'done';
  if(!p1)return 'seg2';
  if(p1.kind==='drift'&&!p1.faceSet)return 'seg2_facing';
  return 'done';
}
const stepOf=s=>s.step||nextStep(s);
const planned=s=>nextStep(s)==='done';
const ownShips=()=>S.ships.filter(s=>s.faction==='reb'&&s.alive&&!s.struct);
/* the planning clock (§6 H3): time the tray spends on each step, per ship, for the exec's metrics record */
function clockReset(){S.clk={t:performance.now()};S.planT={};}
function mark(){
  const now=performance.now(),s=byIdS(S.sel);
  if(S.clk&&s&&s.faction==='reb'&&K().phase==='PLAN'){
    const g=groupOf(stepOf(s));
    if(g!=='done'){const b=S.planT[s.id]=S.planT[s.id]||{s1:0,act:0,s2:0};b[g]+=now-S.clk.t;}
  }
  S.clk={t:now};
}
function select(id){
  const s=byIdS(id);if(!s)return false;
  mark();S.sel=id;
  if(s.faction==='reb'&&!s.struct)s.step=nextStep(s);
  return true;
}
/* a step committed: on to the first gap; a ship that has just become fully planned hands over to the next one */
function advance(s,wasDone){
  s.step=nextStep(s);
  if(s.step==='done'&&!wasDone&&s.id===S.sel){
    const own=ownShips(),i=own.indexOf(s);
    const nxt=own.slice(i+1).concat(own.slice(0,i)).find(q=>!planned(q));
    if(nxt)select(nxt.id);else S.execFocus=true;   // the last one: Execute takes the focus
  }
}
function arm(id,kind){   // pick the mode the next drag of this step flies (a mode you lack is refused)
  const s=byIdS(id),st=stepOf(s);
  if(!segStep(st)||!kindsFor(s).includes(kind))return false;
  mark();s.kinds[slotOf(st)]=kind;return true;
}
function pickAction(id,a){
  const s=byIdS(id),slot=actionSlots(s).find(x=>x.key===a);
  if(stepOf(s)!=='action'||!slot||slot.off)return false;
  mark();const was=planned(s);s.action=a;s.actDone=true;advance(s,was);return true;
}
function endHere(id){   // SEG 2's other choice: the second AP goes unspent
  const s=byIdS(id);if(stepOf(s)!=='seg2')return false;
  mark();const was=planned(s);s.plan.length=1;s.endHere=true;advance(s,was);return true;
}
function keepFacing(id){   // commit a Drift's facing as it stands
  const s=byIdS(id),st=stepOf(s);if(!faceStep(st))return false;
  mark();const was=planned(s);s.plan[slotOf(st)].faceSet=true;advance(s,was);return true;
}
/* the breadcrumb: go back to a committed step, or the first open one; never past it */
const PIPS=['s1','act','s2'];
function pipStep(s,pip){
  if(pip==='s1')return 'seg1';
  if(pip==='act')return s.plan[0]?'action':null;
  if(pip==='s2')return twoSegs()&&s.plan[0]&&s.actDone?'seg2':null;
  return null;
}
function goPip(id,pip){
  const s=byIdS(id),st=pipStep(s,pip);if(!st)return false;
  const order=['s1','act','s2','done'];
  if(order.indexOf(pip)>order.indexOf(groupOf(nextStep(s))))return false;
  mark();s.step=st;return true;
}
function back(id){   // Esc: one step back
  const s=byIdS(id),st=stepOf(s);
  const p0=s.plan[0],p1=s.plan[1];
  const prev={seg1_facing:'seg1',action:p0&&p0.kind==='drift'?'seg1_facing':'seg1',seg2:'action',seg2_facing:'seg2',
    done:!twoSegs()?'action':s.endHere?'seg2':p1&&p1.kind==='drift'?'seg2_facing':'seg2'}[st];
  if(!prev||(prev==='seg1_facing'&&!p0))return false;
  mark();s.step=prev;return true;
}
function clearPlan(id){
  const s=byIdS(id);mark();
  s.plan=[];s.kinds=['basic','basic'];s.action='none';s.actDone=false;s.endHere=false;s.step='seg1';
  return true;
}

/* ---------- planning input: grab the craft, drag the line ---------- */
function shipAt(x,y,z){
  let best=null,bd=1e18;
  for(const s of S.ships){if(!s.alive)continue;const d=Math.hypot(s.x-x,s.y-y);const r=Math.max(40,26/z);if(d<r&&d<bd){bd=d;best=s;}}
  return best;
}
/* the selected ship's handles: a Drift's facing handle (always live), and at SEG 2 the end of SEG 1, where the drag starts */
function handleAt(x,y,z){
  const s=byIdS(S.sel);if(!s||s.faction!=='reb'||!s.alive)return null;
  const cs=curvesOf(s),r=Math.max(34,22/z);
  for(let i=cs.length-1;i>=0;i--){
    const seg=cs[i];
    if(seg.kind==='drift'){const e=seg.pts[seg.pts.length-1],f=seg.facing!=null?seg.facing:e.h+Math.PI,R=110;
      if(Math.hypot(x-(e.x+Math.cos(f)*R),y-(e.y+Math.sin(f)*R))<r)return {kind:'facing',ship:s,slot:i};}
  }
  if(stepOf(s)==='seg2'&&cs.length&&distanceLeft(s,[cs[0]])>=SEG_MIN*K().SU){
    const e=segEnd(cs[0]);if(Math.hypot(x-e.x,y-e.y)<Math.max(r,40))return {kind:'seg',ship:s,slot:1,from:e};
  }
  return null;
}
function startDrag(s,slot,from){
  S.edit={mode:'drag',id:s.id,slot,from,pts:[{x:from.x,y:from.y}],prevPlan:s.plan.slice(),prevStep:s.step,wasDone:planned(s)};
  s.step=slot?'seg2':'seg1';s.plan.length=slot;   // re-flying SEG 1 moves SEG 2's start: SEG 2 goes
}
function planInput(ev){
  if(K().phase!=='PLAN')return false;
  if(ev.type==='down'){
    const hd=handleAt(ev.x,ev.y,ev.z);
    if(hd&&hd.kind==='facing'){mark();S.edit={mode:'facing',id:hd.ship.id,slot:hd.slot};return true;}
    if(hd&&hd.kind==='seg'){mark();startDrag(hd.ship,1,hd.from);return true;}
    const s=shipAt(ev.x,ev.y,ev.z);
    if(s&&s.faction==='reb'&&!s.struct){
      if(s.id!==S.sel){select(s.id);if(stepOf(s)!=='seg1')return true;}   // a new selection opens its tray; at SEG 1 the press is also the drag
      mark();startDrag(s,0,startPose(s));
      return true;
    }
    const me=byIdS(S.sel);
    if(s&&me&&me.faction==='reb'&&me.alive&&s.faction!==me.faction){mark();me.target=s.id;return true;}   // any step: a hostile becomes its target
    return false;
  }
  if(ev.type==='move'&&S.edit){
    const s=byIdS(S.edit.id);
    if(S.edit.mode==='facing'){
      const seg=curvesOf(s)[S.edit.slot],e=seg.pts[seg.pts.length-1];
      s.plan[S.edit.slot].facing=Math.atan2(ev.y-e.y,ev.x-e.x);
      return true;
    }
    const d=S.edit;d.pts=[d.pts[0],{x:ev.x,y:ev.y}];d.ptr={x:ev.x,y:ev.y};   // the pointer is the destination
    if(Math.hypot(ev.x-d.from.x,ev.y-d.from.y)>DRAG_MIN)setSeg(s,d.slot,d.from,d.pts);
    else s.plan.length=d.slot;
    return true;
  }
  if(ev.type==='up'&&S.edit){
    const d=S.edit,s=byIdS(d.id);S.edit=null;
    if(d.mode==='facing'){   // committing the handle finishes the facing step; on a later step it is an edit in place
      const st=slotOf(stepOf(s))===d.slot&&faceStep(stepOf(s));
      if(s.plan[d.slot])s.plan[d.slot].faceSet=true;
      if(st)advance(s,false);
      return true;
    }
    const tip=d.pts[d.pts.length-1];
    if(Math.hypot(tip.x-d.from.x,tip.y-d.from.y)<=DRAG_MIN){s.plan=d.prevPlan;s.step=d.prevStep;return true;}   // a click, not a drag: nothing changes
    setSeg(s,d.slot,d.from,d.pts);
    s.endHere=false;
    s.plan[d.slot].faceSet=s.plan[d.slot].kind!=='drift';   // a Drift goes on to its facing step
    advance(s,d.wasDone);
    return true;
  }
  return false;
}
const DRAG_MIN=20;   // world units the pointer must move from the ship before a drag plans a move
function setSeg(s,slot,from,pts){
  const kind=s.kinds[slot]||'basic';
  const prev=s.plan[slot]||(S.edit&&S.edit.prevPlan&&S.edit.prevPlan[slot]);   // a re-drawn Drift keeps its facing
  s.plan[slot]={kind,local:toLocal([pts[pts.length-1]],from),noFire:kind==='flydef',
    facing:prev&&prev.kind==='drift'&&prev.facing!=null?prev.facing:(kind==='drift'?from.h+Math.PI:null)};
  s.plan.length=slot+1;
}
/* scripted planning (tests, the panel): pts in world space from the segment's start pose; the last is the destination.
   Scripted segments count as committed (a Drift's facing included). */
function planSegs(id,list){
  const s=byIdS(id);s.plan=[];
  let pose=startPose(s);
  list.forEach((o,i)=>{
    s.kinds[i]=o.kind||'basic';
    s.plan.push({kind:s.kinds[i],local:toLocal([o.pts[o.pts.length-1]],pose),noFire:s.kinds[i]==='flydef',faceSet:true,
      facing:o.facing!=null?o.facing:(s.kinds[i]==='drift'?pose.h+Math.PI:null)});
    pose=segEnd(curvesOf(s)[i]);
  });
  s.step=nextStep(s);
  return curvesOf(s);
}
function setKind(id,slot,kind){
  const s=byIdS(id);
  if(!kindsFor(s).includes(kind))return false;
  s.kinds[slot]=kind;
  if(s.plan[slot]){s.plan[slot].kind=kind;s.plan[slot].noFire=kind==='flydef';if(kind==='drift'&&s.plan[slot].facing==null){const c=curvesOf(s)[slot];s.plan[slot].facing=c.start.h+Math.PI;}}
  return true;
}

/* ---------- execution ---------- */
function beginExec(){
  mark();S.planLast=S.planT;S.planT={};   // this turn's planning time, for the exec's metrics record
  S.damaged=new Set();
  for(const s of S.ships){   // the action is chosen now and resolves between the segments (fireActions)
    s.actPlan=null;s.actAt=0;s.actT=null;
    if(!s.alive)continue;
    s.actPlan=s.faction==='reb'?s.action:aiActionOf(s);
    s.lastAction=s.actPlan;
  }
  const mates={};
  for(const s of S.ships){
    s.sched=null;   // the contrail carries over from last round
    if(!s.alive||s.struct)continue;
    let segs;
    if(s.faction==='reb')segs=fullSchedule(s,curvesOf(s));
    else{
      s.target=aiPickTarget(s)||s.target;
      const m=mates[s.faction]=mates[s.faction]||[];
      segs=fullSchedule(s,planEnemy(s,m));
      const last=segs.length?segEnd(segs[segs.length-1]):startPose(s);m.push(last);
    }
    s.sched=paceSchedule(segs);s.lastKinds=segs.map(g=>g.auto?'glide':g.kind);
    s.actAt=s.sched.length?Math.min(K().EXEC_LEN,s.sched[0].t1):0;   // SEG 1's arc completes (the only segment's end, with End here)
  }
  S.execT=0;
  fireActions();   // a ship with no move (a structure) acts at once
}
/* the action resolves at the segment boundary (docs/SB-HUD-HANDOFF.md §3.4): a shield angled between the moves
   covers the second one only */
function fireActions(all){
  for(const s of S.ships){
    if(s.actPlan==null||s.actT!=null)continue;
    if(!all&&S.execT<s.actAt-1e-9)continue;
    s.actT=+S.execT.toFixed(3);
    const a=s.actPlan;
    if(s.alive&&a&&a!=='none'&&actionsFor(s).includes(a)&&doAction(s,a))s.st.actions=(s.st.actions||0)+1;
  }
}
/* the visual roll: weaving when flying defensively, the barrel roll, otherwise banked into the turn */
function rollOf(p,t){
  const g=p.seg;
  if(g.kind==='flydef')return Math.sin(t*9)*0.9;
  if(g.kind==='barrel')return Math.sin(Math.PI*p.u)*(g.side||1);
  return g.kapBase>0?Math.max(-1,Math.min(1,g.k/g.kapBase))*BANK_ROLL:0;
}
const TRAIL_N=26;   // ticks of contrail kept (1.3 s)
function poseAt(s,t){
  const n=s.sched.length,segT=K().EXEC_LEN/n;
  let i=0;
  if(s.sched[0].t1!=null){while(i<n-1&&t>=s.sched[i].t1)i++;}else i=Math.min(n-1,Math.floor(t/segT));
  const seg=s.sched[i],t0=seg.t0!=null?seg.t0:i*segT,t1=seg.t1!=null?seg.t1:(i+1)*segT;
  const u=Math.max(0,Math.min(1,(t-t0)/((t1-t0)||1))),p=segPose(seg,u);
  let nose=p.vh;
  if(seg.flip&&u>0.82)nose=p.vh+Math.PI*Math.min(1,(u-0.82)/0.18);   // space.js manPath's K: the flip in the last 18%
  else if(seg.kind==='drift'&&seg.facing!=null){   // the nose swings to the facing (0.25 s), holds, and swings back (0.2 s)
    const inK=Math.min(1,(t-t0)/0.25),outK=Math.max(0,1-(t1-t)/0.2),f=seg.facing;
    nose=p.vh+angNorm(f-p.vh)*inK*(1-outK);
  } else if(seg.kapBase>0&&seg.kind!=='barrel'){   // the slip: in a hard turn the nose leads the line of flight
    const r=Math.min(1,Math.abs(seg.k)/seg.kapBase);
    nose=p.vh+Math.sign(seg.k)*SLIP_NOSE*r*Math.pow(Math.sin(Math.PI*u),0.6);
  }
  return {x:p.x,y:p.y,vh:p.vh,h:nose,seg,u,spd:p.spd};
}
function tick(dt){
  S.execT+=dt;
  const t=Math.min(S.execT,K().EXEC_LEN-1e-6);
  for(const s of S.ships){
    if(!s.alive||!s.sched)continue;
    const p=poseAt(s,t),ox=s.x,oy=s.y,ovh=s.vh;
    s.x=p.x;s.y=p.y;s.h=p.h;s.vh=p.vh;s.vx=(s.x-ox)/dt;s.vy=(s.y-oy)/dt;s.wh=angNorm(p.vh-ovh)/dt;
    s.flydef=p.seg.kind==='flydef';s.curKind=p.seg.kind;
    const acc=(p.spd-(s.lastSpd==null?p.spd:s.lastSpd))/dt;s.lastSpd=p.spd;
    s.boosting=p.seg.kind==='boost'||acc>0.12;   // the engines flare while it accelerates
    s.visRoll=rollOf(p,S.execT);
    s.trail.push({x:s.x,y:s.y});if(s.trail.length>TRAIL_N)s.trail.shift();
  }
  fireActions();
  S.clockT+=dt;
  combatTick(dt);
}
function endExec(){
  fireActions(true);
  for(const s of S.ships)if(s.alive&&!S.damaged.has(s.id))adjCool(s,CALM_GAIN);   // breathing room (space.js endRound ~1082)
  fleeCheck();
  for(const s of S.ships){
    if(s.sched&&s.alive){
      const e=segEnd(s.sched[s.sched.length-1]);s.x=e.x;s.y=e.y;s.h=e.h;s.vh=e.h;
      let D=0;for(const g of s.sched)D+=g.L;   // momentum: the speed it flew this round, in dial speeds (a Boost carries more)
      s.mom=Math.min(maxSpeedOf(s)*BOOST_MULT,D/(K().SU*SPEED_SCALE));
    }
    s.sched=null;s.plan=[];s.flydef=false;s.visRoll=0;s.curKind=null;
    s.kinds=['basic','basic'];s.action='none';s.actDone=false;s.endHere=false;s.step=null;s.actPlan=null;
  }
  S.slot=0;S.execFocus=false;
  const me=byIdS(S.sel);
  if(!me||!me.alive||me.faction!=='reb'){const p=ownShips()[0];if(p)S.sel=p.id;}
  clockReset();
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
/* the reach: every point this segment can end on, from its start pose with the round's distance left. A spearpoint:
   the long corridor ahead is the top straight, the shoulders are banks, the short wide tips are hard turns. */
function reachOutline(s,start,kind,left){
  const env=envelope(s,kind,left),N=env.thMax>0?40:0,outer=[],inner=[];
  const at=(th,L)=>{const k=Math.abs(th)<1e-9?0:th/L,e=arcLocal(k,L),c=Math.cos(start.h),sn=Math.sin(start.h);return {x:start.x+e.x*c-e.y*sn,y:start.y+e.x*sn+e.y*c};};
  for(let i=0;i<=N;i++){
    const th=N?-env.thMax+2*env.thMax*i/N:0,a=env.lo(th),b=env.hi(th);if(b<a-1e-6)continue;
    outer.push(at(th,b));inner.push(at(th,a));
  }
  return {outer,inner,env};
}
function drawReach(c,s,start,kind,left,z,strong){
  const R=reachOutline(s,start,kind,left);if(!R.outer.length)return;
  const col=kind==='boost'||kind==='drift'||kind==='kturn'||kind==='loop'||kind==='barrel'?C.psi:kind==='flydef'?C.shield:C.gold;
  c.save();c.beginPath();
  R.outer.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
  for(let i=R.inner.length-1;i>=0;i--)c.lineTo(R.inner[i].x,R.inner[i].y);
  c.closePath();
  c.fillStyle=T.rgba(col,strong?0.16:0.07);c.fill();
  c.lineWidth=(strong?2:1.2)/z;c.strokeStyle=T.rgba(col,strong?0.75:0.35);c.setLineDash(strong?[]:[5/z,6/z]);c.stroke();c.setLineDash([]);
  if(strong){   // the straight corridor's spine
    const L=R.env.hi(0),e={x:start.x+Math.cos(start.h)*L,y:start.y+Math.sin(start.h)*L};
    c.beginPath();c.moveTo(start.x,start.y);c.lineTo(e.x,e.y);c.lineWidth=1/z;c.strokeStyle=T.rgba(col,0.35);c.setLineDash([2/z,6/z]);c.stroke();
    // momentum: the slowest it can fly this round (a shorter line is topped up with a glide)
    const minLeft=R.env.roundMin-(R.env.roundMax-R.env.left);
    if(MOMENTUM&&minLeft>SEG_MIN*K().SU){
      c.setLineDash([7/z,6/z]);c.lineWidth=1.6/z;c.strokeStyle=C.hazard;c.beginPath();c.arc(start.x,start.y,minLeft,start.h-0.55,start.h+0.55);c.stroke();
      c.setLineDash([]);label(c,start.x+Math.cos(start.h)*minLeft,start.y+Math.sin(start.h)*minLeft-10/z,'slowest this round',C.hazard,z);
    }
  }
  c.restore();
}
function drawPlan(c,s,z,kit,now){
  const sel=s.id===S.sel,cs=curvesOf(s),all=fullSchedule(s,cs),st=sel?stepOf(s):null;
  const ed=sel&&S.edit&&S.edit.mode==='drag'&&S.edit.id===s.id?S.edit:null;
  if(ed){let left=dialOf(s).roundMax;for(let i=0;i<ed.slot&&i<cs.length;i++)left-=cs[i].used;drawReach(c,s,ed.from,s.kinds[ed.slot]||'basic',left,z,true);}
  else if(sel&&segStep(st)){   // the step's reach, faintly, for the armed mode, and a pulse where its drag starts
    const slot=slotOf(st),from=slot?(cs[0]?segEnd(cs[0]):null):startPose(s);
    const left=slot?distanceLeft(s,cs.slice(0,1)):dialOf(s).roundMax;
    if(from&&left>=SEG_MIN*K().SU){
      drawReach(c,s,from,s.kinds[slot]||'basic',left,z,false);
      const k=((now||0)/900)%1,r0=slot?10/z:34*SHIP_SCALE*kit.iconBoost();
      c.save();c.strokeStyle=T.rgba(C.gold,0.85*(1-k));c.lineWidth=2.4/z;c.beginPath();c.arc(from.x,from.y,r0+(4+22*k)/z,0,6.283);c.stroke();c.restore();
    }
  }
  all.forEach((seg,i)=>{
    const col=seg.auto?T.rgba(C.steel,0.55):seg.kind==='flydef'?C.shield:seg.kind==='basic'?(sel?C.gold:T.rgba(C.gold,0.7)):C.psi;
    strokePts(c,seg.pts,col,z,sel?3.6:2.6,seg.auto?[3,9]:null);
    const e=segEnd(seg),m=seg.pts[Math.floor(seg.pts.length/2)];
    if(seg.kind==='flydef'&&!seg.auto){   // Fly def: a weaving ghost along the line, and it holds its fire
      const P=seg.pts,n=P.length,wv=[];
      for(let j=0;j<n;j++){const o=Math.sin(j/(n-1)*Math.PI*6)*12;wv.push({x:P[j].x-Math.sin(P[j].h)*o,y:P[j].y+Math.cos(P[j].h)*o});}
      c.save();c.globalAlpha=0.5;strokePts(c,wv,C.shield,z,1.4,null);c.restore();
    }
    if(sel&&!seg.auto)label(c,m.x,m.y-16/z,(i+1)+' · '+KINDS[seg.kind].short+(seg.kind==='flydef'?' · no fire':''),col,z);
    kit.drawShipBody(c,s,{x:e.x,y:e.y,h:e.h,alpha:sel?0.38:0.22,scale:SHIP_SCALE});
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
      const live=sel&&(faceStep(st)&&slotOf(st)===seg.slot||S.edit&&S.edit.mode==='facing'&&S.edit.id===s.id&&S.edit.slot===seg.slot);
      if(live){   // the facing step: the guns' arc swings with the handle, and the handle pulses
        drawArcAt(c,s,{x:pe.x,y:pe.y,h:f},z);
        const k=((now||0)/900)%1,hx=pe.x+Math.cos(f)*R,hy=pe.y+Math.sin(f)*R;
        c.save();c.strokeStyle=T.rgba(C.psi,0.85*(1-k));c.lineWidth=2.4/z;c.beginPath();c.arc(hx,hy,(12+20*k)/z,0,6.283);c.stroke();c.restore();
      }
    }
  });
  if(ed&&ed.ptr){   // the drag readout rides the cursor: length vs reach at this turn, and the momentum it leaves
    const seg=cs[ed.slot],SU=K().SU;
    if(seg){
      let D=0;for(const g of all)D+=g.L;
      const mom=Math.min(maxSpeedOf(s)*BOOST_MULT,D/(SU*SPEED_SCALE));
      label(c,ed.ptr.x,ed.ptr.y-30/z,(seg.L/SU).toFixed(1)+' / '+(seg.env.hi(seg.th)/SU).toFixed(1)+' SU · momentum '+mom.toFixed(1),C.text,z);
    }
  }
  if(sel)cs.forEach(seg=>{   // where you asked it to go; a dashed line to it when the ship can't get there
    const d=seg.dest,e=seg.pts[seg.pts.length-1],live=S.edit&&S.edit.mode==='drag'&&S.edit.id===s.id&&S.edit.slot===seg.slot;
    if(!seg.reached){c.save();c.globalAlpha=0.6;strokePts(c,[e,d],C.hazard,z,1.6,[4,6]);c.restore();}
    if(!seg.reached||live){
      c.save();c.strokeStyle=seg.reached?C.text:C.hazard;c.lineWidth=2/z;const r=9/z;
      c.beginPath();c.moveTo(d.x-r,d.y);c.lineTo(d.x+r,d.y);c.moveTo(d.x,d.y-r);c.lineTo(d.x,d.y+r);c.stroke();
      c.beginPath();c.arc(d.x,d.y,r*0.7,0,6.283);c.stroke();c.restore();
    }
  });
}
function drawArcAt(c,s,pose,z){   // a planned pose's guns: where a Drift will be pointing
  const R=Math.max(300,...s.wpns.map(q=>q.w.rng));
  c.save();c.translate(pose.x,pose.y);c.rotate(pose.h);
  c.fillStyle=T.rgba(C.psi,0.08);c.strokeStyle=T.rgba(C.psi,0.55);c.lineWidth=1.4/z;c.setLineDash([6/z,6/z]);
  c.beginPath();c.moveTo(0,0);c.arc(0,0,R,-ARCH,ARCH);c.closePath();c.fill();c.stroke();c.restore();
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
    if(K().phase==='PLAN'){   // the line while planning; in the fight the ring alone, so it never hides the tracers
      c.beginPath();c.moveTo(s.x,s.y);c.lineTo(t.x,t.y);
      c.setLineDash([6/z,8/z]);c.lineWidth=(1.2+2.4*lk)/z;c.strokeStyle=T.rgba(col,0.25+0.6*lk);c.stroke();c.setLineDash([]);
    }
    const r=30*SHIP_SCALE*SRDB.visualSize(t.row.size)*K().iconBoost();   // the lock dial: a ring that fills with lock %
    c.beginPath();c.arc(t.x,t.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*lk);c.lineWidth=4/z;c.strokeStyle=col;c.stroke();
    if(reb)label(c,t.x,t.y-r-8/z,'LOCK '+Math.round(lk*100)+'%',col,z);
    c.restore();
  }
}
const TRACER_S=0.12;   // a tracer's streak: the last 0.12 s of the shot's flight
function drawShots(c,z,a,dtT){
  const now=S.clockT+a*dtT;
  c.save();c.lineCap='round';
  for(const p of S.proj){   // tracers: a glowing streak with a bright head, drawn where the shot is this frame
    const x=p.x+p.vx*a*dtT,y=p.y+p.vy*a*dtT,k=Math.min(TRACER_S,p.age+a*dtT),col=p.faction==='reb'?C.goldHi:C.shield;
    const tx=x-p.vx*k,ty=y-p.vy*k;
    c.beginPath();c.moveTo(tx,ty);c.lineTo(x,y);
    c.globalAlpha=0.3;c.lineWidth=12/z;c.strokeStyle=col;c.stroke();
    c.globalAlpha=1;c.lineWidth=3.6/z;c.strokeStyle=col;c.stroke();
    c.beginPath();c.arc(x,y,3.2/z,0,6.283);c.fillStyle='#fff';c.fill();
  }
  for(const m of S.missiles){
    const x=m.x+Math.cos(m.h)*MISSILE_SPD*a*dtT,y=m.y+Math.sin(m.h)*MISSILE_SPD*a*dtT;
    if(m.trail.length>1){c.beginPath();m.trail.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.lineTo(x,y);c.globalAlpha=0.6;c.lineWidth=3/z;c.strokeStyle=C.steel;c.stroke();c.globalAlpha=1;}
    c.beginPath();c.arc(x,y,6/z,0,6.283);c.fillStyle=C.psi;c.fill();c.lineWidth=2/z;c.strokeStyle='#fff';c.stroke();
  }
  S.fx=S.fx.filter(f=>now-f.t0<1);
  for(const f of S.fx){
    const life=f.kind==='boom'?0.9:f.kind==='muzzle'?0.09:f.kind==='fizz'?0.25:0.32,k=(now-f.t0)/life;
    if(k<0||k>1)continue;
    c.globalAlpha=1-k;
    if(f.kind==='muzzle'){   // a short flash cone at the guns
      const L=26/Math.max(z,0.35);c.save();c.translate(f.x,f.y);c.rotate(f.h);
      c.beginPath();c.moveTo(0,-5/z);c.lineTo(L,0);c.lineTo(0,5/z);c.closePath();c.fillStyle=f.reb?C.goldHi:'#bff8ff';c.fill();c.restore();
    } else if(f.kind==='hull'||f.kind==='shield'){   // sparks thrown back along the shot, a fixed fan (no randomness in the visuals)
      const col=f.kind==='shield'?C.shield:C.hazard,R=(10+34*k)/Math.max(z,0.35);
      c.lineWidth=2.4/z;c.strokeStyle=col;c.beginPath();
      for(let i=0;i<6;i++){const ang=f.h+Math.PI+(i-2.5)*0.42;c.moveTo(f.x+Math.cos(ang)*R*0.35,f.y+Math.sin(ang)*R*0.35);c.lineTo(f.x+Math.cos(ang)*R,f.y+Math.sin(ang)*R);}
      c.stroke();c.beginPath();c.arc(f.x,f.y,(5+8*(1-k))/z,0,6.283);c.fillStyle=col;c.fill();
    } else if(f.kind==='boom'){
      const r=70*(f.size||1)*(0.25+k)/Math.max(0.6,z*1.4);
      c.beginPath();c.arc(f.x,f.y,r*0.7,0,6.283);c.fillStyle=T.rgba(C.hazard,0.35*(1-k));c.fill();
      c.beginPath();c.arc(f.x,f.y,r,0,6.283);c.strokeStyle=C.hazard;c.lineWidth=5/z;c.stroke();
    } else {
      c.beginPath();c.arc(f.x,f.y,(4+6*k)/z,0,6.283);c.strokeStyle=C.text3;c.lineWidth=1.6/z;c.stroke();
    }
  }
  c.restore();
}
/* contrails: the last 1.3 s of flight, fading and thinning toward the tail */
function drawTrail(c,s,z){
  const pts=s.trail.concat([{x:s.x,y:s.y}]),n=pts.length,col=s.faction==='reb'?C.rebelHi:C.hegHi;
  if(n<2)return;
  c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle=col;
  const B=5;   // five bands, one stroke each
  for(let b=0;b<B;b++){
    const i0=Math.floor((n-1)*b/B),i1=Math.floor((n-1)*(b+1)/B);if(i1<=i0)continue;
    const u=(b+1)/B;c.globalAlpha=0.55*u;c.lineWidth=(1+4*u)/z;
    c.beginPath();c.moveTo(pts[i0].x,pts[i0].y);for(let i=i0+1;i<=i1;i++)c.lineTo(pts[i].x,pts[i].y);c.stroke();
  }
  c.restore();
}
function renderPose(s,a){const kit=K();return poseAt(s,Math.min(S.execT+a*kit.TICK/1000,kit.EXEC_LEN-1e-6));}
/* a: how far this frame sits between two sim ticks (0–1). Ships and shots are drawn where they are at that moment,
   so motion runs at the screen's frame rate, not the sim's 20 ticks a second; nothing in the sim changes. */
function draw(c,now,a){
  const kit=K(),z=kit.cam.z,phase=kit.phase,dtT=kit.TICK/1000;
  a=phase==='EXEC'?Math.max(0,Math.min(1,a||0)):0;
  const saved=[];
  if(a>0)for(const s of S.ships){
    if(!s.alive||!s.sched)continue;
    const p=renderPose(s,a);
    saved.push([s,s.x,s.y,s.h,s.visRoll]);
    s.x=p.x;s.y=p.y;s.h=p.h;s.visRoll=rollOf(p,S.execT+a*dtT);
  }
  try{
    const sel=byIdS(S.sel);
    const k0=sel&&(sel.plan[0]?sel.plan[0].kind:sel.kinds[0]);
    if(sel&&sel.alive&&!sel.struct&&phase==='PLAN'&&k0!=='flydef')drawArc(c,sel,z);   // a planning aid: off while the fight runs, and for a Fly def start (it won't shoot)
    for(const s of S.ships)if(s.alive)drawTrail(c,s,z);
    if(phase==='PLAN')for(const s of S.ships)if(s.alive&&s.faction==='reb'&&!s.struct)drawPlan(c,s,z,kit,now);
    for(const s of S.ships){
      if(!s.alive)continue;
      if(s.id===S.sel){c.save();c.strokeStyle=C.gold;c.lineWidth=2.4/z;c.beginPath();c.arc(s.x,s.y,34*SHIP_SCALE*kit.iconBoost(),0,6.283);c.stroke();c.restore();}
      if(s.flydef){c.save();c.strokeStyle=T.rgba(C.shield,0.7);c.lineWidth=2/z;c.setLineDash([4/z,6/z]);c.beginPath();c.arc(s.x,s.y,28*SHIP_SCALE*kit.iconBoost(),0,6.283);c.stroke();c.restore();}
      kit.drawShipBody(c,s,{roll:s.visRoll,boost:s.boosting,scale:SHIP_SCALE});
    }
    if(TELLS)for(const s of S.ships)if(s.alive&&s.faction!=='reb'&&!s.struct&&doctrineOf(s).tell)doctrineOf(s).tell(c,s,z);
    drawLocks(c,z);
    drawShots(c,z,a,dtT);
  } finally {
    for(const [s,x,y,h,r] of saved){s.x=x;s.y=y;s.h=h;s.visRoll=r;}
  }
}
/* where the action is, for the chase camera: the selected ship (else the first of yours) and its target */
function focus(){
  const me=byIdS(S.sel)&&byIdS(S.sel).alive&&byIdS(S.sel).faction==='reb'?byIdS(S.sel):S.ships.find(s=>s.alive&&s.faction==='reb');
  if(!me)return null;
  const t=byIdS(me.target),pts=[{x:me.x,y:me.y}];
  if(t&&t.alive&&dist(me,t)<1500)pts.push({x:t.x,y:t.y});
  const lead=me.vx||me.vy?{x:me.x+me.vx*0.8,y:me.y+me.vy*0.8}:null;   // look a little ahead of where it's going
  if(lead)pts.push(lead);
  return pts;
}

/* ---------- the planning tray (docs/SB-HUD-HANDOFF.md §3–§5) ----------
   HTML, not canvas, so hover cards, disabled states and focus come free. One tray, under the selected ship, showing
   only the current step's controls; the driver places it every frame (trayAnchor), opens the hover cards (tipFor)
   and presses the icons for the number keys. */
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const nf=v=>String(+(+v).toFixed(2));
/* single-colour glyphs, one path each (currentColor), so armed / greyed / locked are CSS */
const GLYPHS={
  basic:'M4 12h15M13 6l6 6-6 6',
  flydef:'M3 12c2-5 4-5 5.5 0s3.5 5 5.5 0 3.5-5 5 0M17 8.5l3 3.5-3.5 2',
  boost:'M3 6l5 6-5 6M9.5 6l5 6-5 6M16 6l5 6-5 6',
  drift:'M4 19C7 10 12 6.5 19 6.5M15.5 3.5l3.5 3-3 3.5M14 17l-4-1.5',
  kturn:'M6 21V9a5 5 0 0 1 10 0v7M12.5 13l3.5 3.5 3.5-3.5',
  loop:'M3 17h8a5 5 0 1 0-5-5v1M3 10l3 3 3-3',
  barrel:'M3 7h7M7 4l3 3-3 3M14 17h7M18 14l3 3-3 3M10 7l4 10',
  end_here:'M6 6h12v12H6z',
  angle_f:'M4.5 10a7.5 7.5 0 0 1 15 0M12 11l3 8h-6z',
  angle_a:'M4.5 15a7.5 7.5 0 0 0 15 0M12 5l3 8h-6z',
  boost_f:'M4 9a8 8 0 0 1 16 0M12 12v8M8 16h8',
  boost_a:'M4 15a8 8 0 0 0 16 0M12 4v8M8 8h8',
  fixcrit:'M15 3.5a5 5 0 0 0-4.6 6.9L3.5 17.3l3.2 3.2 6.9-6.9A5 5 0 0 0 20.5 9l-3 3-3.2-.8-.8-3.2z',
  lockin:'M12 2.5v6M12 15.5v6M2.5 12h6M15.5 12h6M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5',
  special:'M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.4l-5.4 3 1.2-6-4.5-4.1 6.1-.7z',
  ship:'M12 3l5.5 15L12 15l-5.5 3z',
  none:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M6.3 6.3l11.4 11.4',
  lock:'M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6z',
  check:'M5 12.5l4.5 4.5L19 7',
};
const glyph=(k,cls)=>'<svg class="'+(cls||'arn-glyph')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+GLYPHS[k]+'"/></svg>';
const ACT_GLYPH={none:'none',shiftF:'angle_f',shiftR:'angle_a',boostF:'boost_f',boostR:'boost_a',fixcrit:'fixcrit',lockin:'lockin',fieldrep:'special'};
const actGlyph=a=>ACT_GLYPH[a]||(ACTIONS[a]&&ACTIONS[a].special?'special':'ship');
/* the movement icons: Basic and Fly def, then the moveset mods in ARENA_MOVESETS order; a mod this pilot lacks is
   shown locked (naming the first preset that grants it) while showLockedMods is on, and left out when it is off */
function grantedBy(kind){for(const pr of Object.keys(ARENA_MOVESETS))if(ARENA_MOVESETS[pr].includes(kind))return pr;return null;}
function trayKinds(s){
  const own=kindsFor(s),order=['basic','flydef'];
  for(const pr of Object.keys(ARENA_MOVESETS))for(const k of ARENA_MOVESETS[pr])if(!order.includes(k))order.push(k);
  for(const k of own)if(!order.includes(k))order.push(k);
  const out=[];
  for(const k of order){
    if(own.includes(k))out.push({kind:k});
    else if(showLockedMods&&grantedBy(k))out.push({kind:k,locked:grantedBy(k)});
  }
  return out;
}
/* the action icons (§3.3), each with the reason it is off, if it is */
const ACTION_ORDER=['shiftF','shiftR','boostF','boostR','fixcrit','lockin'];
function nerveCap(s){let c=100;if(s.pilot.coolCap)c=Math.min(c,s.pilot.coolCap);if(critCount(s,'cockpit'))c=Math.min(c,60);return c;}
function actionSlots(s){
  const out=[];
  for(const a of ACTION_ORDER){
    let off=null;
    if(a==='boostF'||a==='boostR'){if(maxShield(s)<=0)off='No shields to boost';else if(critCount(s,'emitter'))off='Shield emitter damaged';}
    else if(a==='fixcrit'&&!s.crits.length)off='No repairable critical';
    else if(a==='lockin'){if(mute(s))off='No pilot nerve to steady';else if(s.pilot.cool>=nerveCap(s))off='Nerve already full';}
    out.push({key:a,off});
  }
  for(const a of specialAbilities(s))out.push({key:a,special:1});   // Special and Ship show only when the ship has one
  for(const a of shipAbilities(s))out.push({key:a,ship:1});
  out.push({key:'none'});
  return out;
}
const noRoom=s=>distanceLeft(s,curvesOf(s).slice(0,1))<SEG_MIN*K().SU;   // SEG 1 used the whole round
/* the hover cards read the constants live, so a card never lies when a slider moves (designer-facing copy, §3.5) */
function kindLine(k){
  return {basic:'Fly the drawn line.',
    flydef:flydefImmunity?'No firing this segment. Cannot be hit, except by homing weapons.':'No firing this segment. Incoming fire ×'+nf(FLYDEF_FACTOR)+'; homing weapons ignore it.',
    boost:'×'+nf(BOOST_MULT)+' speed, nearly straight.',
    drift:'Nose comes off the path: drag the line, then set the facing. Guns fire along the nose.',
    kturn:'Run forward, flip 180 at the end. Speed capped at '+nf(KTURN_MAX)+'.',
    loop:'Flip 180 in the tightest space: speed capped at the slowest straight.',
    barrel:'Slide '+nf(BARREL_LAT)+' SU sideways, heading kept.'}[k]||'';
}
function actionLine(s,a){
  const cun=s.pilot.cun||1;
  if(a==='shiftF'||a==='shiftR'){const F=a==='shiftF',seg=s.segs[F?'F':'R'];return 'Swing the '+(F?'fore':'aft')+' shield ('+seg.val+') round to cover the '+(seg.at==='F'?'aft':'fore')+'.';}
  if(a==='boostF'||a==='boostR')return 'Recharge the '+(a==='boostF'?'fore':'aft')+' shield: up to +'+Math.ceil(0.15*maxShield(s)*cun)+'.';
  if(a==='fixcrit')return 'Clear one critical'+(s.crits.length?': '+CRITDEFS[s.crits[0]].name:'')+'.';
  if(a==='lockin')return 'Steady the pilot: +35 nerve (now '+Math.round(s.pilot.cool)+').';
  if(a==='fieldrep')return 'Patch the hull: +'+Math.ceil(0.15*s.maxHull*cun)+'.';
  if(a==='none')return 'No action this round.';
  return 'None yet.';   // DESIGN OPEN: ship abilities
}
function tipFor(key,id){
  const s=byIdS(id||S.sel);if(!s)return '';
  const i=key.indexOf(':'),type=i<0?key:key.slice(0,i),k=i<0?'':key.slice(i+1);
  let name='',line='',warn=null;
  if(type==='kind'){
    name=KINDS[k].name;line=kindLine(k);
    const tk=trayKinds(s).find(x=>x.kind===k);
    if(tk&&tk.locked)warn='Needs: '+tk.locked;
    else if(slotOf(stepOf(s))===1&&noRoom(s))warn='No distance left this round';
  } else if(type==='action'){
    name=ACTIONS[k]?ACTIONS[k].name:k;line=actionLine(s,k)+(k!=='none'?' Fires between the moves.':'');
    const sl=actionSlots(s).find(x=>x.key===k);if(sl&&sl.off)warn=sl.off;
  } else if(type==='end'){name='End here';line='The move ends with SEG 1. The second AP goes unspent (it buys nothing yet).';}
  else if(type==='keepface'){name='Keep facing';line='Fix the nose where the handle points. The handle stays live: drag it again any time.';}
  else if(type==='pip'){name={s1:'Segment 1',act:'Action',s2:'Segment 2'}[k];line=pipStep(s,k)?'Go back to this step.':'Not yet.';}
  return (warn?'<div class="arn-tip__warn">'+esc(warn)+'</div>':'')+'<div class="arn-tip__name">'+esc(name)+'</div><div class="arn-tip__line">'+esc(line)+'</div>';
}
/* what each pip shows: the committed choice's glyph */
function pipState(s){
  const p0=s.plan[0],p1=s.plan[1];
  return {s1:p0&&(p0.kind!=='drift'||p0.faceSet)?p0.kind:null,act:s.actDone?actGlyph(s.action):null,
    s2:s.endHere?'end_here':p1&&(p1.kind!=='drift'||p1.faceSet)?p1.kind:null};
}
const PIP_LBL={s1:'S1',act:'ACT',s2:'S2'};
const pipList=()=>twoSegs()?PIPS:['s1','act'];
function pipOpen(s,k){const order=['s1','act','s2','done'];return !!pipStep(s,k)&&order.indexOf(k)<=order.indexOf(groupOf(nextStep(s)));}
function pipsHtml(s,st,keyed){
  const ps=pipState(s),cur=groupOf(st);
  return '<div class="arn-crumbs">'+pipList().map(k=>'<button type="button" class="arn-pip'+(ps[k]?' is-filled':'')+(cur===k?' is-active':'')+'" data-act="pip" data-pip="'+k+'" data-tip="pip:'+k+'"'+
    (keyed?' data-key':'')+(pipOpen(s,k)?'':' aria-disabled="true"')+' aria-label="'+PIP_LBL[k]+'">'+(ps[k]?glyph(ps[k],'arn-glyph arn-glyph--sm'):'')+'<span>'+PIP_LBL[k]+'</span></button>').join('<i class="arn-crumbs__sep"></i>')+'</div>';
}
function icoBtn(o){
  return '<button type="button" class="arn-ico'+(o.locked?' is-locked':'')+(o.dflt?' is-default':'')+'" data-act="'+o.act+'"'+(o.kind?' data-kind="'+o.kind+'"':'')+(o.action?' data-action="'+o.action+'"':'')+
    ' data-tip="'+o.tip+'" data-key aria-label="'+esc(o.label)+'" aria-pressed="'+!!o.pressed+'"'+(o.off?' aria-disabled="true"':'')+'>'+glyph(o.glyph)+(o.locked?glyph('lock','arn-glyph arn-ico__lock'):'')+'</button>';
}
function tray(){
  if(K().phase!=='PLAN')return '';
  const s=byIdS(S.sel);if(!s||!s.alive||s.faction!=='reb'||s.struct)return '';
  const st=stepOf(s),t=byIdS(s.target),nerve=Math.round(s.pilot.cool);
  const tgt='<span class="arn-tray__tgt'+(t&&t.alive?'':' is-empty')+'">'+(t&&t.alive?glyph('lockin','arn-glyph arn-glyph--sm')+esc(t.name)+' · '+Math.round(lockOf(s,t.id)*100)+'%':'no target — click a hostile')+'</span>';
  const name='<span class="arn-tray__name">'+esc(s.name)+'</span>';
  if(st==='done')   // the review strip: the committed glyphs (each reopens its step) and Clear
    return '<div class="arn-tray__in is-done" data-step="done" style="--tray-icon:'+TRAY_ICON+'px"><div class="arn-tray__row">'+name+pipsHtml(s,st,true)+tgt+
      '<button type="button" class="sr-btn sr-btn--ghost sr-btn--sm arn-tray__clear" data-act="clear" data-key>Clear</button></div></div>';
  const head='<div class="arn-tray__row">'+name+'<span class="arn-tray__pilot">'+esc(s.pilot.preset||'roster')+' L'+s.pilot.level+'</span>'+
    (mute(s)?'':'<span class="arn-tray__nerve" role="img" aria-label="nerve '+nerve+'"><i style="width:'+Math.max(0,Math.min(100,nerve))+'%"></i></span>')+tgt+'</div>';
  let icons=[],hint='';
  if(segStep(st)){
    const slot=slotOf(st),armed=s.kinds[slot]||'basic',full=slot===1&&noRoom(s);
    icons=trayKinds(s).map(x=>icoBtn({act:'arm',kind:x.kind,tip:'kind:'+x.kind,glyph:x.kind,label:KINDS[x.kind].short,pressed:armed===x.kind&&!x.locked&&!full,off:!!x.locked||full,locked:!!x.locked}));
    if(slot===1)icons.push(icoBtn({act:'end',tip:'end',glyph:'end_here',label:'End here',dflt:full}));
    hint=full?'No distance left this round: End here':slot?'Drag from the end of the first move to where it should end up':'Drag from the ship to where it should end up';
  } else if(faceStep(st)){
    icons=[icoBtn({act:'keepface',tip:'keepface',glyph:'check',label:'Keep facing'})];
    hint='Drag the handle to set the nose';
  } else if(st==='action'){
    icons=actionSlots(s).map(a=>icoBtn({act:'action',action:a.key,tip:'action:'+a.key,glyph:actGlyph(a.key),label:ACTIONS[a.key]?(ACTIONS[a.key].short||ACTIONS[a.key].name):a.key,
      pressed:s.actDone?s.action===a.key:a.key==='none',dflt:!s.actDone&&a.key==='none',off:!!a.off}));
    hint='Pick what happens between moves';
  }
  return '<div class="arn-tray__in" data-step="'+st+'" style="--tray-icon:'+TRAY_ICON+'px">'+head+pipsHtml(s,st,false)+
    '<div class="arn-tray__icons">'+icons.join('')+'</div><div class="arn-tray__hint">'+esc(hint)+'</div></div>';
}
/* where the tray hangs: under the selected ship (world units; the driver turns it into pixels) */
function trayAnchor(){
  if(K().phase!=='PLAN')return null;
  const s=byIdS(S.sel);if(!s||!s.alive||s.faction!=='reb'||s.struct)return null;
  return {x:s.x,y:s.y,r:34*SHIP_SCALE*K().iconBoost()};
}
function trayCfg(){return {gap:TRAY_GAP,icon:TRAY_ICON,flip:TRAY_FLIP_ZONE,tipDelay:TIP_DELAY};}
/* the turn chrome (§4): one chip a ship, mirroring its pips */
function chips(){
  if(K().phase!=='PLAN')return '';
  return ownShips().map(s=>{
    const ps=pipState(s),done=planned(s);
    return '<button type="button" class="arn-shipchip'+(s.id===S.sel?' is-on':'')+(done?' is-done':'')+'" data-act="sel" data-id="'+esc(s.id)+'" aria-pressed="'+(s.id===S.sel)+'">'+
      (done?glyph('check','arn-glyph arn-glyph--sm'):'')+'<span class="arn-shipchip__name">'+esc(s.name)+'</span><span class="arn-shipchip__pips">'+
      pipList().map(k=>'<i'+(ps[k]?' class="is-on"':'')+'></i>').join('')+'</span></button>';
  }).join('');
}
function planCount(){const own=ownShips();return {n:own.filter(planned).length,m:own.length};}
function takeExecFocus(){const f=S.execFocus;S.execFocus=false;return f;}
function hudAction(a,el){
  if(el&&el.getAttribute&&el.getAttribute('aria-disabled')==='true')return false;
  if(K().phase!=='PLAN')return false;
  if(a==='sel')return select(el.dataset.id);
  const s=byIdS(S.sel);if(!s||s.faction!=='reb'||!s.alive)return false;
  if(a==='arm')return arm(s.id,el.dataset.kind);
  if(a==='action')return pickAction(s.id,el.dataset.action);
  if(a==='end')return endHere(s.id);
  if(a==='keepface')return keepFacing(s.id);
  if(a==='pip')return goPip(s.id,el.dataset.pip);
  if(a==='clear')return clearPlan(s.id);
  return false;
}
function setAction(id,a){const s=byIdS(id);if(!actionsFor(s).includes(a))return false;s.action=a;s.actDone=true;return true;}
/* keys (§3.6): Esc one step back, Tab / Shift-Tab the next / previous ship (the driver presses the icons for 1–9) */
function key_(ev){
  if(K().phase!=='PLAN')return false;
  if(ev.key==='Escape'){const s=byIdS(S.sel);return !!(s&&s.faction==='reb'&&back(s.id));}
  if(ev.key==='Tab'){
    const own=ownShips();if(!own.length)return false;
    const i=own.findIndex(q=>q.id===S.sel),n=own.length;
    return select(own[((i<0?0:i+(ev.shiftKey?-1:1))%n+n)%n].id);
  }
  return false;
}

/* ---------- panel, metrics, determinism ---------- */
function panelGroup(){
  return [
    {key:'AP_PER_ROUND',label:'AP (segments) per round',min:1,max:2,step:1,get:()=>AP_PER_ROUND,set:v=>{AP_PER_ROUND=v;}},
    {key:'showLockedMods',label:'Tray: show locked mods (greyed)',type:'toggle',get:()=>showLockedMods,set:v=>{showLockedMods=v;}},
    {key:'TRAY_GAP',label:'Tray: gap below the ship (px)',min:0,max:60,step:2,get:()=>TRAY_GAP,set:v=>{TRAY_GAP=v;}},
    {key:'TRAY_ICON',label:'Tray: icon size (px)',min:24,max:56,step:2,get:()=>TRAY_ICON,set:v=>{TRAY_ICON=v;}},
    {key:'TRAY_FLIP_ZONE',label:'Tray: flips above within (px of the bottom)',min:0,max:400,step:10,get:()=>TRAY_FLIP_ZONE,set:v=>{TRAY_FLIP_ZONE=v;}},
    {key:'TIP_DELAY',label:'Tray: hover card delay (ms)',min:0,max:1000,step:50,get:()=>TIP_DELAY,set:v=>{TIP_DELAY=v;}},
    {key:'FLYDEF_FACTOR',label:'Fly Defensively: hit profile ×',min:0,max:1,step:0.05,get:()=>FLYDEF_FACTOR,set:v=>{FLYDEF_FACTOR=v;}},
    {key:'flydefImmunity',label:'Fly Defensively: immune except homing (your wording)',type:'toggle',get:()=>flydefImmunity,set:v=>{flydefImmunity=v;}},
    {key:'BOOST_MULT',label:'Boost: speed ×',min:1,max:3,step:0.1,get:()=>BOOST_MULT,set:v=>{BOOST_MULT=v;}},
    {key:'BOOST_TURN',label:'Boost: turn cap ×',min:0,max:1,step:0.05,get:()=>BOOST_TURN,set:v=>{BOOST_TURN=v;}},
    {key:'KTURN_MAX',label:'K-Turn: speed cap',min:1,max:5,step:1,get:()=>KTURN_MAX,set:v=>{KTURN_MAX=v;}},
    {key:'BARREL_LAT',label:'Barrel Roll: lateral (SU)',min:0,max:3,step:0.25,get:()=>BARREL_LAT,set:v=>{BARREL_LAT=v;}},
    {key:'SPEED_SCALE',label:'Craft speed ×',min:0.5,max:3,step:0.1,get:()=>SPEED_SCALE,set:v=>{SPEED_SCALE=v;}},
    {key:'SHIP_SCALE',label:'Ship size (drawn and hit) ×',min:0.6,max:2.5,step:0.05,get:()=>SHIP_SCALE,set:v=>{SHIP_SCALE=v;}},
    {key:'BANK_ROLL',label:'Bank roll into turns (visual)',min:0,max:1,step:0.05,get:()=>BANK_ROLL,set:v=>{BANK_ROLL=v;}},
    {key:'SPEED_FLAIR',label:'Acceleration flair',type:'toggle',get:()=>SPEED_FLAIR,set:v=>{SPEED_FLAIR=v;}},
    {key:'ACCEL',label:'Flair: acceleration rate',min:0.005,max:0.1,step:0.005,get:()=>ACCEL,set:v=>{ACCEL=v;}},
    {key:'BRAKE',label:'Flair: braking rate',min:0.005,max:0.2,step:0.005,get:()=>BRAKE,set:v=>{BRAKE=v;}},
    {key:'MOMENTUM',label:'Momentum shapes the reach',type:'toggle',get:()=>MOMENTUM,set:v=>{MOMENTUM=v;}},
    {key:'MOM_UP',label:'Momentum: speed gained a round',min:0,max:5,step:0.25,get:()=>MOM_UP,set:v=>{MOM_UP=v;}},
    {key:'MOM_DOWN',label:'Momentum: speed shed a round',min:0,max:5,step:0.25,get:()=>MOM_DOWN,set:v=>{MOM_DOWN=v;}},
    {key:'MOM_TURN',label:'Momentum: speed widens turns ^',min:0,max:3,step:0.1,get:()=>MOM_TURN,set:v=>{MOM_TURN=v;}},
    {key:'SLIP_OUT',label:'Slip: slide wide in a hard turn',min:0,max:80,step:2,get:()=>SLIP_OUT,set:v=>{SLIP_OUT=v;}},
    {key:'SLIP_NOSE',label:'Slip: nose leads a hard turn (rad)',min:0,max:0.8,step:0.02,get:()=>SLIP_NOSE,set:v=>{SLIP_NOSE=v;}},
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
    {key:'AI_NOISE',label:'AI: extra score noise',min:0,max:400,step:10,get:()=>AI_NOISE,set:v=>{AI_NOISE=v;}},
    {key:'AI_JITTER',label:'AI: green pilot noise',min:0,max:4,step:0.1,get:()=>AI_JITTER,set:v=>{AI_JITTER=v;}},
    {key:'AI_LOOK',label:'AI: expects target to hold its turn',min:0,max:1,step:0.05,get:()=>AI_LOOK,set:v=>{AI_LOOK=v;}},
    {key:'AI_W_ARC',label:'AI: weight, guns on target',min:0,max:8,step:0.25,get:()=>AI_W_ARC,set:v=>{AI_W_ARC=v;}},
    {key:'AI_W_THREAT',label:'AI: weight, out of its guns',min:0,max:8,step:0.25,get:()=>AI_W_THREAT,set:v=>{AI_W_THREAT=v;}},
    {key:'AI_W_RANGE',label:'AI: weight, preferred range',min:0,max:8,step:0.25,get:()=>AI_W_RANGE,set:v=>{AI_W_RANGE=v;}},
    {key:'AI_W_SIX',label:'AI: weight, on its six',min:0,max:8,step:0.25,get:()=>AI_W_SIX,set:v=>{AI_W_SIX=v;}},
    {key:'AI_SWING',label:'AI: target nose swing (rad)',min:0,max:1.5,step:0.05,get:()=>AI_SWING,set:v=>{AI_SWING=v;}},
    {key:'AI_OVERSHOOT',label:'AI: overshoot distance',min:0,max:1500,step:50,get:()=>AI_OVERSHOOT,set:v=>{AI_OVERSHOOT=v;}},
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
    fled:!!s.fled,action:s.lastAction||'none',actT:s.actT,kinds:s.lastKinds||[],
    plan:s.faction==='reb'?planMsOf(s.id):undefined}));
}
/* planning ms per step for the exec just run (§6 H3), per ship and summed, keyed s1/act/s2 */
function planMsOf(id){const b=(S.planLast||{})[id]||{s1:0,act:0,s2:0};return {s1:Math.round(b.s1),act:Math.round(b.act),s2:Math.round(b.s2)};}
function planSteps(){const t={s1:0,act:0,s2:0};for(const id in (S.planLast||{})){const b=planMsOf(id);t.s1+=b.s1;t.act+=b.act;t.s2+=b.s2;}return t;}
function ships(){return S.ships;}
function stateHash(){return S.ships.map(s=>[s.id,s.x.toFixed(2),s.y.toFixed(2),s.h.toFixed(3),s.hull,s.arm,totalShield(s),Math.round(s.pilot.cool),s.alive?1:0,s.st.shots,s.st.hits].join(',')).join('|')+'#'+S.proj.length+'/'+S.missiles.length;}
function readout(){return S.ships.filter(s=>s.faction==='reb').map(s=>s.id+' nerve '+Math.round(s.pilot.cool)+' · hull '+s.hull+'/'+s.maxHull+' · shots '+s.st.shots+' / hits '+s.st.hits+' · lock max '+Math.round((s.lockMax||0)*100)+'%').join('\n');}

return {key:'sb',name:'SB Test',focus,build,planInput,beginExec,tick,endExec,draw,tray,trayAnchor,trayCfg,chips,tipFor,planCount,takeExecFocus,planSteps,hudAction,key_,panelGroup,metricsRecord,ships,stateHash,readout,
  get dbg(){return {S,ARENA_MOVESETS,KINDS,CRITDEFS,ACTIONS,SB_DOCTRINES,fn:{reachOutline,planEnemy,planSearch,predictor,aiPickTarget,fleeCheck,exitGoal,doctrineOf,solveArc,arcLocal,paceSchedule,renderPose,focus,dialOf,distanceLeft,feasible,envelope,kappaOf,buildCurve,curvesOf,fullSchedule,planSegs,setKind,kindsFor,movesetOf,segEnd,poseAt,maxSpeedOf,inArc,bearing,inFrontHemi,
      actionsFor,setAction,doAction,specialAbilities,shipAbilities,aiActionOf,
      nextStep,stepOf,select,arm,pickAction,endHere,keepFacing,goPip,back,clearPlan,trayKinds,actionSlots,tipFor,planCount,fireActions,planned,
      hullHit,hullAxes,impactOf,hitShip,spreadOf,aimAngle,canFire,missileRefusal,lockOf,lockTick,combatTick,projTick,missileTick,fireTick,emitBursts,applyDamage,adjCool,coolState,
      setRng(f){S.rng=f;},setLoadout(id,list){const s=byIdS(id);s.wpns=loadout(s.row,list);return s.wpns;},
      shoot(id,ang,wkey){const s=byIdS(id),q=s.wpns.find(x=>x.key===(wkey||'w0'))||s.wpns[0];S.proj.push({x:s.x,y:s.y,vx:Math.cos(ang)*PROJ_SPD,vy:Math.sin(ang)*PROJ_SPD,owner:s.id,faction:s.faction,w:q.w,burst:0,life:q.w.rng/PROJ_SPD*1.15,age:0});}},
    AP_PER_ROUND_:()=>AP_PER_ROUND,FLYDEF_FACTOR_:()=>FLYDEF_FACTOR,BOOST_MULT_:()=>BOOST_MULT,BOOST_TURN_:()=>BOOST_TURN,KTURN_MAX_:()=>KTURN_MAX,
    BARREL_LAT_:()=>BARREL_LAT,FLAIR_DIP_:()=>FLAIR_DIP,SPEED_FLAIR_:()=>SPEED_FLAIR,flydefImmunity_:()=>flydefImmunity,
    BURST_N_:()=>BURST_N,BURST_EVERY_:()=>BURST_EVERY,PROJ_SPD_:()=>PROJ_SPD,SPREAD_BASE_:()=>SPREAD_BASE,RANGE_SPREAD_:()=>RANGE_SPREAD,
    SPREAD_AIM_K_:()=>SPREAD_AIM_K,SPREAD_NERVE_K_:()=>SPREAD_NERVE_K,SPREAD_CRIT_:()=>SPREAD_CRIT,MISSILE_LOCK_:()=>MISSILE_LOCK,MISSILE_MINR_:()=>MISSILE_MINR,
    MISSILE_SPD_:()=>MISSILE_SPD,MISSILE_TURN_:()=>MISSILE_TURN,LOCK_GAIN_:()=>LOCK_GAIN,LOCK_DECAY_:()=>LOCK_DECAY,IMPACT_MIN_:()=>IMPACT_MIN,
    LOCK_DMG_MAX_:()=>LOCK_DMG_MAX,PROJ_DMG_:()=>PROJ_DMG,SPEED_SCALE_:()=>SPEED_SCALE,BANK_ROLL_:()=>BANK_ROLL,SHIP_SCALE_:()=>SHIP_SCALE,MOMENTUM_:()=>MOMENTUM,MOM_UP_:()=>MOM_UP,MOM_DOWN_:()=>MOM_DOWN,MOM_TURN_:()=>MOM_TURN,SLIP_OUT_:()=>SLIP_OUT,SLIP_NOSE_:()=>SLIP_NOSE,ACCEL_:()=>ACCEL,BRAKE_:()=>BRAKE,
    AI_LOOK_:()=>AI_LOOK,AI_W_ARC_:()=>AI_W_ARC,AI_W_THREAT_:()=>AI_W_THREAT,AI_W_RANGE_:()=>AI_W_RANGE,AI_W_SIX_:()=>AI_W_SIX,AI_SWING_:()=>AI_SWING,AI_OVERSHOOT_:()=>AI_OVERSHOOT,AI_JITTER_:()=>AI_JITTER,PREF_RANGE_:()=>PREF_RANGE,FLANK_:()=>FLANK,AI_NOISE_:()=>AI_NOISE,TELLS_:()=>TELLS,TRAY_GAP_:()=>TRAY_GAP,TRAY_ICON_:()=>TRAY_ICON,TRAY_FLIP_ZONE_:()=>TRAY_FLIP_ZONE,TIP_DELAY_:()=>TIP_DELAY,showLockedMods_:()=>showLockedMods,CARDS_:()=>CARDS,CRIT_DIRECT_:()=>CRIT_DIRECT,HULL_LEN_:()=>HULL_LEN,HULL_WID_:()=>HULL_WID,
    set(k,v){const m={AP_PER_ROUND:()=>AP_PER_ROUND=v,FLYDEF_FACTOR:()=>FLYDEF_FACTOR=v,BOOST_MULT:()=>BOOST_MULT=v,SPEED_FLAIR:()=>SPEED_FLAIR=v,
      flydefImmunity:()=>flydefImmunity=v,PROJ_DMG:()=>PROJ_DMG=v,MOMENTUM:()=>MOMENTUM=v,SPEED_SCALE:()=>SPEED_SCALE=v,MISSILE_LOCK:()=>MISSILE_LOCK=v,LOCK_GAIN:()=>LOCK_GAIN=v,BURST_N:()=>BURST_N=v,
      showLockedMods:()=>showLockedMods=v,TRAY_GAP:()=>TRAY_GAP=v,TRAY_ICON:()=>TRAY_ICON=v,TRAY_FLIP_ZONE:()=>TRAY_FLIP_ZONE=v,TIP_DELAY:()=>TIP_DELAY=v,KTURN_MAX:()=>KTURN_MAX=v,BARREL_LAT:()=>BARREL_LAT=v};m[k]();}};}};
})();
