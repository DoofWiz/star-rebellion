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

   Built so far: phase B1 (the skeleton: ships fly straight lines).
   ===================================================================== */
window.SIMSB=(function(){
const K=()=>window.SR_ARENA;
const T=SR.theme,C=T.C;

let S=null;

/* ---------- geometry: copied from space.js ~372 ---------- */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function angNorm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}

/* ---------- ships ---------- */
function mkShip(d){
  const r=d.row;
  return {id:d.id,name:d.name,faction:d.faction,row:r,cls:d.cls,struct:!!d.struct,x:d.x,y:d.y,h:d.h,
    pilot:Object.assign({},d.pilot),lead:d.lead,flees:d.flees,doctrine:d.doctrine,
    segs:{F:{val:r.shield_front,max:r.shield_front,at:'F'},R:{val:r.shield_rear,max:r.shield_rear,at:'R'}},
    arm:r.armour,hull:r.hull,maxArm:r.armour,maxHull:r.hull,crits:[],
    alive:true,fled:false,trail:[],x0:d.x,y0:d.y};
}
function build(world,rng,api){
  S={ships:world.cast.map(mkShip),rocks:world.rocks,rng,api,sel:null,execT:0,world};
  const p=S.ships.find(s=>s.faction==='reb');S.sel=p?p.id:null;
}
function shipAt(x,y,z){
  let best=null,bd=1e18;
  for(const s of S.ships){if(!s.alive)continue;const d=Math.hypot(s.x-x,s.y-y);const r=Math.max(40,26/z);if(d<r&&d<bd){bd=d;best=s;}}
  return best;
}
function planInput(ev){
  if(K().phase!=='PLAN')return false;
  if(ev.type==='down'){const s=shipAt(ev.x,ev.y,ev.z);if(s){S.sel=s.id;return true;}}
  return false;
}
/* the skeleton: every ship flies straight at the middle of its speed range */
function beginExec(){S.execT=0;for(const s of S.ships){s.x0=s.x;s.y0=s.y;s.trail=[];}}
function tick(dt){
  const {SU,EXEC_LEN,W,H,MARGIN}=K();
  S.execT+=dt;
  for(const s of S.ships){
    if(!s.alive||s.struct)continue;
    const L=(s.row.straight_min+s.row.straight_max)/2*SU,u=Math.min(1,S.execT/EXEC_LEN);
    s.x=Math.min(Math.max(s.x0+Math.cos(s.h)*L*u,MARGIN),W-MARGIN);
    s.y=Math.min(Math.max(s.y0+Math.sin(s.h)*L*u,MARGIN),H-MARGIN);
    s.trail.push({x:s.x,y:s.y});if(s.trail.length>80)s.trail.shift();
  }
}
function endExec(){}
function draw(c){
  const kit=K(),z=kit.cam.z;
  for(const s of S.ships){
    if(!s.alive)continue;
    if(s.trail.length>1){c.save();c.globalAlpha=0.35;c.beginPath();s.trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.lineWidth=3/z;c.strokeStyle=s.faction==='reb'?C.rebelHi:C.hegHi;c.stroke();c.restore();}
    if(s.id===S.sel){c.save();c.strokeStyle=C.gold;c.lineWidth=2.4/z;c.beginPath();c.arc(s.x,s.y,34*kit.iconBoost(),0,6.283);c.stroke();c.restore();}
    kit.drawShipBody(c,s);
  }
}
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function hud(){
  const s=S.ships.find(q=>q.id===S.sel);
  if(!s)return '<span class="arn-orders__note">Select a ship.</span>';
  return '<span class="arn-orders__name">'+esc(s.name)+'</span><span class="arn-orders__note">'+esc(s.row.name)+' · '+(s.pilot.preset||'roster')+' L'+s.pilot.level+' · SB Test skeleton: every ship flies straight</span>';
}
function hudAction(){}
function panelGroup(){return [];}
function metricsRecord(){return S.ships.map(s=>({id:s.id,faction:s.faction,alive:s.alive,x:Math.round(s.x),y:Math.round(s.y),hull:s.hull,nerve:Math.round(s.pilot.cool)}));}
function ships(){return S.ships;}
function stateHash(){return S.ships.map(s=>[s.id,s.x.toFixed(2),s.y.toFixed(2),s.h.toFixed(3),s.hull,Math.round(s.pilot.cool),s.alive?1:0].join(',')).join('|');}
function readout(){return '';}

return {key:'sb',name:'SB Test',build,planInput,beginExec,tick,endExec,draw,hud,hudAction,panelGroup,metricsRecord,ships,stateHash,readout,
  get dbg(){return {S,fn:{}};}};
})();
