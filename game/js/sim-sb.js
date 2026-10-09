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

   Built so far: phases B1–B2 (the skeleton; continuous drag inside the
   envelope, AP segments, Fly Defensively, acceleration flair).
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
function segEnd(seg){const e=seg.pts[seg.pts.length-1];return {x:e.x,y:e.y,h:seg.flip?angNorm(e.h+Math.PI):e.h};}
/* drags are kept in the segment's own frame, so a segment can be rebuilt from a new start pose */
const toLocal=(pts,o)=>pts.map(p=>{const dx=p.x-o.x,dy=p.y-o.y,c=Math.cos(-o.h),sn=Math.sin(-o.h);return {x:dx*c-dy*sn,y:dx*sn+dy*c};});
const toWorld=(pts,o)=>pts.map(p=>{const c=Math.cos(o.h),sn=Math.sin(o.h);return {x:o.x+p.x*c-p.y*sn,y:o.y+p.x*sn+p.y*c};});

/* ---------- ships ---------- */
function mkShip(d){
  const r=d.row;
  return {id:d.id,name:d.name,faction:d.faction,row:r,cls:d.cls,struct:!!d.struct,x:d.x,y:d.y,h:d.h,vh:d.h,vx:0,vy:0,
    pilot:Object.assign({},d.pilot),lead:d.lead,flees:d.flees,doctrine:d.doctrine,
    segs:{F:{val:r.shield_front,max:r.shield_front,at:'F'},R:{val:r.shield_rear,max:r.shield_rear,at:'R'}},
    arm:r.armour,hull:r.hull,maxArm:r.armour,maxHull:r.hull,crits:[],
    alive:true,fled:false,trail:[],
    plan:[],           // planned segments: {kind, local (the drag in the segment's frame), facing}
    kinds:['basic','basic'],   // the kind picked for each AP slot
    sched:null,visRoll:0,flydef:false};
}
function build(world,rng,api){
  S={ships:world.cast.map(mkShip),rocks:world.rocks,rng,api,sel:null,slot:0,edit:null,execT:0,world};
  const p=S.ships.find(s=>s.faction==='reb');S.sel=p?p.id:null;
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

/* ---------- enemies: a pursuit planner on the same envelope (the doctrine module arrives in B5) ---------- */
const PREF_RANGE=340;   // copied from space.js aiManeuver ~620 (prefD)
function nearestFoe(s){let best=null,bd=1e18;for(const t of S.ships)if(t.alive&&t.faction!==s.faction&&!t.struct){const d=dist(s,t);if(d<bd){bd=d;best=t;}}return best;}
function planToward(s,goalFn){
  const segs=[];let pose=startPose(s);
  for(let i=0;i<AP_PER_ROUND;i++){
    const g=goalFn(pose,i);   // the drag is a straight line to the goal; the envelope bends and clamps it
    const seg=buildCurve(s,pose,[{x:pose.x,y:pose.y},{x:g.x,y:g.y}],'basic');
    segs.push(seg);pose=segEnd(seg);
  }
  return segs;
}
function pursuitGoal(s){
  const t=nearestFoe(s);
  const segT=K().EXEC_LEN/AP_PER_ROUND;
  if(!t)return pose=>({x:pose.x+Math.cos(pose.h)*200,y:pose.y+Math.sin(pose.h)*200});
  return (pose,i)=>{
    const lead=segT*(i+1);
    const px=t.x+t.vx*lead,py=t.y+t.vy*lead;
    const a=Math.atan2(pose.y-py,pose.x-px);
    return {x:px+Math.cos(a)*PREF_RANGE,y:py+Math.sin(a)*PREF_RANGE};
  };
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
    if(s){S.sel=s.id;return true;}   // B3: picking a hostile as the selected ship's target
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
  for(const s of S.ships){
    s.trail=[];s.sched=null;
    if(!s.alive||s.struct)continue;
    let segs;
    if(s.faction==='reb')segs=fullSchedule(s,curvesOf(s));
    else segs=planToward(s,pursuitGoal(s));
    s.sched=segs;
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
}
function endExec(){
  for(const s of S.ships){
    if(s.sched&&s.alive){const e=segEnd(s.sched[s.sched.length-1]);s.x=e.x;s.y=e.y;s.h=e.h;s.vh=e.h;}
    s.sched=null;s.plan=[];s.flydef=false;s.visRoll=0;s.curKind=null;
    s.kinds=['basic','basic'];
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
function draw(c){
  const kit=K(),z=kit.cam.z,phase=kit.phase;
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
}

/* ---------- the orders strip ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function hud(){
  const s=byIdS(S.sel);
  if(!s)return '<span class="arn-orders__note">Select a ship.</span>';
  let h='<span class="arn-orders__name">'+esc(s.name)+'</span><span class="arn-orders__note">'+esc(s.row.name)+' · '+(s.pilot.preset||'roster')+' L'+s.pilot.level+' · nerve '+Math.round(s.pilot.cool)+'</span>';
  if(s.faction!=='reb'||s.struct)return h+(s.doctrine?'<span class="arn-orders__note">Doctrine: '+esc(s.doctrine)+'</span>':'');
  if(K().phase!=='PLAN')return h;
  h+='<span class="arn-orders__note">AP '+s.plan.length+'/'+AP_PER_ROUND+' · drag from the ship, then from the end handle</span>';
  for(let i=0;i<AP_PER_ROUND;i++){
    h+='<span class="arn-orders__grp"><span class="arn-orders__lbl">Seg '+(i+1)+'</span>';
    for(const k of kindsFor(s))h+='<button type="button" class="sr-btn" data-act="kind" data-slot="'+i+'" data-kind="'+k+'" aria-pressed="'+(s.kinds[i]===k)+'">'+KINDS[k].short+'</button>';
    h+='</span>';
  }
  h+='<span class="arn-orders__grp"><button type="button" class="sr-btn sr-btn--ghost" data-act="clear">Clear</button></span>';
  return h;
}
function hudAction(a,el){
  const s=byIdS(S.sel);if(!s)return;
  if(a==='kind')setKind(s.id,+el.dataset.slot,el.dataset.kind);
  else if(a==='clear'){s.plan=[];s.kinds=['basic','basic'];}
}
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
  ];
}
function metricsRecord(){return S.ships.map(s=>({id:s.id,faction:s.faction,alive:s.alive,x:Math.round(s.x),y:Math.round(s.y),hull:s.hull,nerve:Math.round(s.pilot.cool)}));}
function ships(){return S.ships;}
function stateHash(){return S.ships.map(s=>[s.id,s.x.toFixed(2),s.y.toFixed(2),s.h.toFixed(3),s.hull,Math.round(s.pilot.cool),s.alive?1:0].join(',')).join('|');}
function readout(){return S.ships.filter(s=>s.faction==='reb').map(s=>s.id+' nerve '+Math.round(s.pilot.cool)+' · hull '+s.hull+'/'+s.maxHull).join('\n');}

return {key:'sb',name:'SB Test',build,planInput,beginExec,tick,endExec,draw,hud,hudAction,key_,panelGroup,metricsRecord,ships,stateHash,readout,
  get dbg(){return {S,ARENA_MOVESETS,KINDS,fn:{envelope,kappaOf,buildCurve,curvesOf,fullSchedule,planSegs,setKind,kindsFor,movesetOf,segEnd,poseAt,maxSpeedOf,inArc,bearing,inFrontHemi},
    AP_PER_ROUND_:()=>AP_PER_ROUND,FLYDEF_FACTOR_:()=>FLYDEF_FACTOR,BOOST_MULT_:()=>BOOST_MULT,BOOST_TURN_:()=>BOOST_TURN,KTURN_MAX_:()=>KTURN_MAX,
    BARREL_LAT_:()=>BARREL_LAT,FLAIR_DIP_:()=>FLAIR_DIP,SPEED_FLAIR_:()=>SPEED_FLAIR,flydefImmunity_:()=>flydefImmunity,
    set(k,v){({AP_PER_ROUND:()=>AP_PER_ROUND=v,FLYDEF_FACTOR:()=>FLYDEF_FACTOR=v,BOOST_MULT:()=>BOOST_MULT=v,SPEED_FLAIR:()=>SPEED_FLAIR=v,flydefImmunity:()=>flydefImmunity=v})[k]();}};}};
})();
