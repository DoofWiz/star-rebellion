'use strict';
/* =====================================================================
   STAR REBELLION — the space combat v2 sim (docs/ARENA-HANDOFF.md §3)
   One plan step, then every ship flies its path simultaneously and
   continuously. Drawn paths are fitted to the ship's own dial, so an
   illegal path is unrepresentable. Standing orders (pursue, escort,
   follow, hold) and enemy doctrine aim the same fitter at a goal.

   Copy, don't refactor: the geometry and movement maths below are
   copied from game/js/space.js (each block names its source line).
   space.js is not loaded into this module, patched by it or shared
   with it.

   Built so far: phase A1 (paths, standing orders, ships fly; no weapons).
   ===================================================================== */
window.SIM2=(function(){
const K=()=>window.SR_ARENA;
const T=SR.theme,C=T.C;

/* ---------- copied from space.js ~20–30 ---------- */
const ARCH=0.55;
const TURNS={L:-Math.PI/2,l:-Math.PI/4,S:0,r:Math.PI/4,R:Math.PI/2};

/* ---------- placeholders (docs/DESIGN_BLOCKERS.md, "Arena: placeholders") ---------- */
let PATH_SEGS=3;       // most manoeuvre segments in one turn's path. placeholder
let FIT_W_POS=1;       // fitter: weight on distance from the drag (per world unit). placeholder
let FIT_W_HDG=0.6;     // fitter: weight on heading misalignment (per radian, × SU). placeholder
let FIT_NOISE=0;       // AI fitter noise, world units of random score. placeholder
const PREF_RANGE=340;  // pursue: preferred distance behind the target (space.js aiManeuver ~620's prefD)
const ESCORT_OFF=180;  // escort: how far behind the ally. placeholder

let S=null;            // all sim state, rebuilt by build()

/* ---------- geometry: copied from space.js ~372–410 ---------- */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function bearing(s,t){return Math.abs(angNorm(Math.atan2(t.y-s.y,t.x-s.x)-s.h));}
function inArc(s,t){return bearing(s,t)<=ARCH;}
function manPath(x0,y0,h0,man){
  const SU=K().SU,[sp,tk]=man,d=sp*SU;
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
  const {W,H,MARGIN}=K();
  const cx=Math.min(Math.max(p.x,MARGIN),W-MARGIN);
  const cy=Math.min(Math.max(p.y,MARGIN),H-MARGIN);
  let h=p.h;const clamped=(cx!==p.x||cy!==p.y);
  if(clamped){const toC=Math.atan2(H/2-cy,W/2-cx);h=h+angNorm(toC-h)*0.6;}
  return {x:cx,y:cy,h,clamped};
}
/* ---------- the dial: copied from space.js ~138–150 (critCount, maxSpeedOf, dialAvail) ---------- */
function critCount(s,id){return s.crits.filter(c=>c===id).length;}
function maxSpeedOf(s){return Math.max(s.row.straight_min,s.row.straight_max-critCount(s,'engine')-(s.magClamp>0?2:0));}
function dialAvail(s){
  let d=SRDB.dial(s.row).slice();
  if(s.pilot.mans&&s.pilot.mans.includes('loop'))d.push([3,'K']);
  const ms=maxSpeedOf(s);
  d=d.filter(([sp])=>sp<=ms);
  if(critCount(s,'controls'))d=d.filter(([,tk])=>tk!=='L'&&tk!=='R'&&tk!=='K');
  return d;
}
const manEnd=(pose,m,s)=>clampEnd(manPath(pose.x,pose.y,pose.h,[Math.min(m[0],maxSpeedOf(s)),m[1]])(1));

/* ---------- ships ---------- */
function mkShip(d){
  const r=d.row;
  return {id:d.id,name:d.name,faction:d.faction,row:r,cls:d.cls,struct:!!d.struct,x:d.x,y:d.y,h:d.h,
    pilot:Object.assign({},d.pilot),lead:d.lead,flees:d.flees,doctrine:d.doctrine,
    segs:{F:{val:r.shield_front,max:r.shield_front,at:'F'},R:{val:r.shield_rear,max:r.shield_rear,at:'R'}},
    arm:r.armour,hull:r.hull,maxArm:r.armour,maxHull:r.hull,crits:[],magClamp:0,
    alive:true,fled:false,mans:null,drag:null,order:defaultOrder(d),path:null,trail:[]};
}
function defaultOrder(d){
  if(d.struct)return {kind:'static'};
  if(d.faction==='heg')return {kind:'pursue',auto:true};   // the pursuit doctrine; the other doctrines arrive in A4
  return {kind:'hold'};
}

/* ---------- the fitter (§3.2) ----------
   Drag: at each segment boundary pick the dial manoeuvre whose end pose best approaches the drag line ahead
   (distance to the drag point one manoeuvre-length on, plus heading alignment). Goal: the same, aimed at a point. */
function polyLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=dist(pts[i-1],pts[i]);return L;}
function polyAt(pts,s){
  let acc=0;
  for(let i=1;i<pts.length;i++){
    const l=dist(pts[i-1],pts[i]);
    if(acc+l>=s||i===pts.length-1){
      const k=l>0?Math.max(0,Math.min(1,(s-acc)/l)):0;
      return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*k,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*k,h:Math.atan2(pts[i].y-pts[i-1].y,pts[i].x-pts[i-1].x)};
    }
    acc+=l;
  }
  return {x:pts[0].x,y:pts[0].y,h:0};
}
function polyProject(pts,p){   // arc length of the nearest point on the polyline
  let best=0,bd=1e18,acc=0;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy,l=Math.sqrt(L2);
    let t=L2>0?((p.x-a.x)*dx+(p.y-a.y)*dy)/L2:0;t=Math.max(0,Math.min(1,t));
    const d=Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y);
    if(d<bd){bd=d;best=acc+l*t;}
    acc+=l;
  }
  return best;
}
function fitDrag(s,pts){
  const SU=K().SU;
  if(!pts||pts.length<2)return [];
  const L=polyLen(pts),dial=dialAvail(s);
  const minLen=Math.min(...dial.map(m=>Math.min(m[0],maxSpeedOf(s))))*SU;
  let pose={x:s.x,y:s.y,h:s.h},prog=0;const out=[];
  for(let i=0;i<PATH_SEGS;i++){
    if(i>0&&L-prog<minLen*0.5)break;
    let best=null,bs=1e18,bestEnd=null;
    for(const m of dial){
      const sp=Math.min(m[0],maxSpeedOf(s)),e=manEnd(pose,m,s);
      const tgt=polyAt(pts,Math.min(L,prog+sp*SU));
      const hd=Math.abs(angNorm(e.h-tgt.h));   // a K-turn ends facing back: it only wins when the drag doubles back
      const sc=FIT_W_POS*dist(e,tgt)+FIT_W_HDG*SU*hd;
      if(sc<bs){bs=sc;best=m;bestEnd=e;}
    }
    if(!best)break;
    out.push(best.slice());
    prog=Math.max(prog+minLen*0.25,polyProject(pts,bestEnd));
    pose=bestEnd;
  }
  return out;
}
function fitGoal(s,goalFn,rng){
  const SU=K().SU,dial=dialAvail(s);
  let pose={x:s.x,y:s.y,h:s.h};const out=[];
  for(let i=0;i<PATH_SEGS;i++){
    const g=goalFn(pose,i);if(!g)break;
    let best=null,bs=1e18,bestEnd=null;
    for(const m of dial){
      const e=manEnd(pose,m,s);
      let sc=FIT_W_POS*dist(e,g)+(g.h!=null?FIT_W_HDG*SU*Math.abs(angNorm(e.h-g.h)):0);
      if(e.clamped)sc+=300;
      if(FIT_NOISE&&rng)sc+=rng()*FIT_NOISE;
      if(sc<bs){bs=sc;best=m;bestEnd=e;}
    }
    if(!best)break;
    out.push(best.slice());pose=bestEnd;
  }
  return out;
}
/* standing orders: goal functions for the fitter */
function nearestFoe(s){
  let best=null,bd=1e18;
  for(const t of S.ships)if(t.alive&&t.faction!==s.faction&&!t.struct){const d=dist(s,t);if(d<bd){bd=d;best=t;}}
  return best;
}
function goalFor(s){
  const o=s.order;
  if(o.kind==='pursue'){
    const t=(o.target&&S.ships.find(x=>x.id===o.target&&x.alive))||nearestFoe(s);
    if(!t)return null;
    return pose=>{const a=Math.atan2(pose.y-t.y,pose.x-t.x);return {x:t.x+Math.cos(a)*PREF_RANGE,y:t.y+Math.sin(a)*PREF_RANGE};};
  }
  if(o.kind==='escort'||o.kind==='follow'){
    const t=S.ships.find(x=>x.id===o.target&&x.alive);
    if(!t)return pose=>({x:pose.x,y:pose.y});
    const dx=o.kind==='follow'?o.dx:-ESCORT_OFF,dy=o.kind==='follow'?o.dy:0;
    return ()=>({x:t.x+Math.cos(t.h)*dx-Math.sin(t.h)*dy,y:t.y+Math.sin(t.h)*dx+Math.cos(t.h)*dy,h:t.h});
  }
  if(o.kind==='hold'){const hx=s.x,hy=s.y;return ()=>({x:hx,y:hy});}
  return null;
}

/* ---------- build ---------- */
function build(world,rng,api){
  S={ships:world.cast.map(mkShip),rocks:world.rocks,rng,api,sel:null,dragging:null,execT:0,world};
  const p=S.ships.find(s=>s.faction==='reb');S.sel=p?p.id:null;
}

/* ---------- planning input ---------- */
function shipAt(x,y,z){
  let best=null,bd=1e18;
  for(const s of S.ships){if(!s.alive)continue;const d=Math.hypot(s.x-x,s.y-y);const r=Math.max(40,26/z);if(d<r&&d<bd){bd=d;best=s;}}
  return best;
}
function planInput(ev){
  if(K().phase!=='PLAN')return false;
  if(ev.type==='down'){
    const s=shipAt(ev.x,ev.y,ev.z);
    if(s&&s.faction==='reb'&&!s.struct){S.sel=s.id;S.dragging={id:s.id,pts:[{x:s.x,y:s.y}]};return true;}
    if(s){S.sel=s.id;return true;}
    return false;
  }
  if(ev.type==='move'&&S.dragging){
    const d=S.dragging,last=d.pts[d.pts.length-1];
    if(Math.hypot(ev.x-last.x,ev.y-last.y)>8){d.pts.push({x:ev.x,y:ev.y});const s=S.ships.find(q=>q.id===d.id);s.drag=d.pts;s.mans=fitDrag(s,d.pts);}
    return true;
  }
  if(ev.type==='up'&&S.dragging){
    const s=S.ships.find(q=>q.id===S.dragging.id);
    if(S.dragging.pts.length>2){s.drag=S.dragging.pts;s.mans=fitDrag(s,s.drag);s.order={kind:'path'};}
    S.dragging=null;return true;
  }
  return false;
}
function planDrag(id,pts){const s=S.ships.find(q=>q.id===id);s.drag=pts;s.mans=fitDrag(s,pts);s.order={kind:'path'};return s.mans;}
function setOrder(id,o){const s=S.ships.find(q=>q.id===id);s.order=Object.assign({},o);s.mans=null;s.drag=null;}

/* ---------- execution ---------- */
function planFor(s){
  if(s.struct||!s.alive)return [];
  if(s.order.kind==='path'&&s.mans&&s.mans.length)return s.mans;
  const g=goalFor(s);
  return g?fitGoal(s,g,S.rng):[[s.row.straight_min,'S']];
}
function beginExec(){
  const plans=new Map();
  for(const s of S.ships)plans.set(s.id,planFor(s));   // everyone plans from the same frozen poses
  for(const s of S.ships){
    const mans=plans.get(s.id);
    s.path=null;s.trail=[];
    if(!mans.length)continue;
    let pose={x:s.x,y:s.y,h:s.h};const segs=[];
    for(const m of mans){const sp=Math.min(m[0],maxSpeedOf(s));const f=manPath(pose.x,pose.y,pose.h,[sp,m[1]]);const e=clampEnd(f(1));segs.push({f,end:e,man:[sp,m[1]],from:pose});pose=e;}
    s.path=segs;s.flown=mans;
  }
  S.execT=0;
}
function poseAt(s,t){
  const n=s.path.length,seg=K().EXEC_LEN/n;
  const i=Math.min(n-1,Math.floor(t/seg)),u=Math.min(1,(t-i*seg)/seg);
  const p=u>=1?s.path[i].end:s.path[i].f(u);
  const {W,H,MARGIN}=K();
  return {x:Math.min(Math.max(p.x,MARGIN),W-MARGIN),y:Math.min(Math.max(p.y,MARGIN),H-MARGIN),h:p.h};
}
function tick(dt){
  S.execT+=dt;
  for(const s of S.ships){
    if(!s.alive||!s.path)continue;
    const p=poseAt(s,Math.min(S.execT,K().EXEC_LEN));
    s.x=p.x;s.y=p.y;s.h=p.h;
    s.trail.push({x:s.x,y:s.y});if(s.trail.length>80)s.trail.shift();
  }
}
function endExec(){
  for(const s of S.ships){
    if(s.path){const e=s.path[s.path.length-1].end;s.x=e.x;s.y=e.y;s.h=angNorm(e.h);}
    s.path=null;
    if(s.order.kind==='path'){s.order={kind:'hold'};}
    s.mans=null;s.drag=null;
  }
}

/* ---------- drawing ---------- */
function chainPts(s,mans){
  const pts=[];let pose={x:s.x,y:s.y,h:s.h};
  for(const m of mans){
    const f=manPath(pose.x,pose.y,pose.h,[Math.min(m[0],maxSpeedOf(s)),m[1]]);
    for(let i=0;i<=16;i++){const q=f(i/16);pts.push(q);}
    pose=clampEnd(f(1));pts.push(pose);
  }
  return {pts,end:pose};
}
function strokePath(c,pts,col,z,dash){
  c.save();c.lineCap='round';c.lineJoin='round';c.beginPath();
  pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
  c.lineWidth=6/z;c.strokeStyle=T.rgba(C.ink,0.6);c.stroke();
  if(dash)c.setLineDash([3/z,9/z]);
  c.lineWidth=3.4/z;c.strokeStyle=col;c.stroke();c.restore();
}
function draw(c,now){
  const kit=K(),z=kit.cam.z,phase=kit.phase;
  for(const s of S.ships){
    if(!s.alive)continue;
    if(s.trail.length>1){c.save();c.globalAlpha=0.35;strokePath(c,s.trail,s.faction==='reb'?C.rebelHi:C.hegHi,z);c.restore();}
  }
  if(phase==='PLAN'){
    for(const s of S.ships){
      if(!s.alive||s.faction!=='reb'||s.struct)continue;
      const sel=s.id===S.sel;
      if(s.drag&&sel){c.save();c.globalAlpha=0.35;strokePath(c,s.drag,C.text,z,true);c.restore();}
      const mans=planFor(s);
      if(!mans.length)continue;
      const ch=chainPts(s,mans);
      strokePath(c,ch.pts,s.order.kind==='path'?(sel?C.gold:T.rgba(C.gold,0.7)):T.rgba(C.steel,0.6),z,s.order.kind!=='path');
      kit.drawShipBody(c,s,{x:ch.end.x,y:ch.end.y,h:ch.end.h,alpha:sel?0.42:0.25});
    }
  }
  for(const s of S.ships){
    if(!s.alive)continue;
    if(s.id===S.sel){c.save();c.strokeStyle=C.gold;c.lineWidth=2.4/z;c.beginPath();c.arc(s.x,s.y,34*kit.iconBoost(),0,6.283);c.stroke();c.restore();}
    kit.drawShipBody(c,s);
  }
}

/* ---------- the orders strip ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function orderText(s){
  const o=s.order;
  if(o.kind==='path')return 'Path: '+s.mans.map(m=>({L:'Hard L',l:'Bank L',S:'Ahead',r:'Bank R',R:'Hard R',K:'K-turn'})[m[1]]+' '+m[0]).join(' → ');
  if(o.kind==='pursue')return 'Standing order: pursue '+(o.target||'nearest');
  if(o.kind==='escort')return 'Standing order: escort '+o.target;
  if(o.kind==='follow')return 'Standing order: follow '+o.target;
  return 'Standing order: hold';
}
function hud(){
  const s=S.ships.find(q=>q.id===S.sel);
  if(!s)return '<span class="arn-orders__note">Select a ship. Drag from one of yours to draw its path.</span>';
  let h='<span class="arn-orders__name">'+esc(s.name)+'</span><span class="arn-orders__note">'+esc(s.row.name)+' · '+(s.pilot.preset||'roster')+' L'+s.pilot.level+' · nerve '+Math.round(s.pilot.cool)+'</span>';
  if(s.faction!=='reb'||s.struct)return h+'<span class="arn-orders__note">'+(s.doctrine?'Doctrine: '+esc(s.doctrine):'')+'</span>';
  h+='<span class="arn-orders__note">'+esc(orderText(s))+'</span>';
  if(K().phase!=='PLAN')return h;
  const lead=S.ships.find(q=>q.faction==='reb'&&q.alive&&q.id!==s.id);
  h+='<span class="arn-orders__grp"><button type="button" class="sr-btn" data-act="hold">Hold</button><button type="button" class="sr-btn" data-act="pursue">Pursue nearest</button>';
  if(lead)h+='<button type="button" class="sr-btn" data-act="escort">Escort '+esc(lead.id)+'</button><button type="button" class="sr-btn" data-act="follow">Follow '+esc(lead.id)+'</button>';
  h+='</span>';
  return h;
}
function hudAction(a){
  const s=S.ships.find(q=>q.id===S.sel);if(!s)return;
  const lead=S.ships.find(q=>q.faction==='reb'&&q.alive&&q.id!==s.id);
  if(a==='hold')setOrder(s.id,{kind:'hold'});
  else if(a==='pursue')setOrder(s.id,{kind:'pursue'});
  else if(a==='escort'&&lead)setOrder(s.id,{kind:'escort',target:lead.id});
  else if(a==='follow'&&lead)setOrder(s.id,{kind:'follow',target:lead.id,dx:-160,dy:140});
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
    {key:'PATH_SEGS',label:'Path segments',min:1,max:5,step:1,get:()=>PATH_SEGS,set:v=>{PATH_SEGS=v;}},
    {key:'FIT_W_POS',label:'Fitter: position weight',min:0,max:3,step:0.1,get:()=>FIT_W_POS,set:v=>{FIT_W_POS=v;}},
    {key:'FIT_W_HDG',label:'Fitter: heading weight',min:0,max:3,step:0.1,get:()=>FIT_W_HDG,set:v=>{FIT_W_HDG=v;}},
    {key:'FIT_NOISE',label:'AI fitter noise',min:0,max:400,step:10,get:()=>FIT_NOISE,set:v=>{FIT_NOISE=v;}},
  ];
}
function metricsRecord(){
  return S.ships.map(s=>({id:s.id,faction:s.faction,alive:s.alive,x:Math.round(s.x),y:Math.round(s.y),hull:s.hull,nerve:Math.round(s.pilot.cool),
    segs:s.flown?s.flown.length:0}));
}
function ships(){return S.ships;}
function stateHash(){return S.ships.map(s=>[s.id,s.x.toFixed(2),s.y.toFixed(2),s.h.toFixed(3),s.hull,Math.round(s.pilot.cool),s.alive?1:0].join(',')).join('|');}
function readout(){return S.ships.filter(s=>s.faction==='reb').map(s=>s.id+' nerve '+Math.round(s.pilot.cool)+' · hull '+s.hull+'/'+s.maxHull).join('\n');}

return {key:'v2',name:'SR V2 Combat',build,planInput,beginExec,tick,endExec,draw,hud,hudAction,key_,panelGroup,metricsRecord,ships,stateHash,readout,
  get dbg(){return {S,fn:{fitDrag,fitGoal,dialAvail,maxSpeedOf,manPath,clampEnd,planDrag,setOrder,inArc,bearing},
    PATH_SEGS_:()=>PATH_SEGS,FIT_W_POS_:()=>FIT_W_POS,FIT_W_HDG_:()=>FIT_W_HDG,FIT_NOISE_:()=>FIT_NOISE};}};
})();
