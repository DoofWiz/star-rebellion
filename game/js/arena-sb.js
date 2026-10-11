'use strict';
/* =====================================================================
   STAR REBELLION — the SB Test driver (docs/ARENA-SB-HANDOFF.md)
   The Arena's second ruleset. game/js/arena.js owns the scene, the title
   route and the ruleset picker, and drives "SR V2 Combat" (sim2.js) as it
   always has; choosing "SB Test" there hands the scene to this file, which
   drives game/js/sim-sb.js on the same scenario entries (arena.js's
   ARENA_SCENARIOS, with v2's presets, rock layouts and placement, so a
   scenario and seed load the same cast under both rulesets).

   Why a second driver rather than one shared chassis: the v2 scene is
   written straight against SIM2, and the handoff makes v2 the untouched
   control. Folding both drivers into one chassis is a refactor for after
   the comparison (docs/DESIGN_BLOCKERS.md C-59).

   It owns: the SB scenario list, the PLAN→EXEC loop on a fixed tick, the
   seeded RNG, the camera, its designer panel, metrics and DBGarena.sb.
   The no-save guarantee holds: nothing here calls newGame(), saveSnap(),
   persist() or SR.endMission(), and nothing reads or writes G.

   A ruleset module: {key, name,
     build(world, rng, api)   world = the resolved scenario (cast, rocks, objective, tune)
     planInput(ev)            a pointer event in world space; true when it used it
     beginExec(), tick(dtSim), endExec()
     draw(ctx, now)           world space (the camera is already applied)
     hud(), hudAction(act, el) the orders strip for the selected ship
     panelGroup()             its own designer-panel sliders and toggles
     metricsRecord()          its part of the per-exec ARENA_METRICS record
     ships(), stateHash(), dbg}
   ===================================================================== */
(function(){
const ROOT=document.getElementById('arSb');
if(!ROOT||!window.SIMSB)return;
const SCENE=document.getElementById('sc-arena');
const byId=SR.util.scoped(ROOT);
const UT=SR.util;
const T=SR.theme,C=T.C;
const SA=window.SR_ART;

/* ---------- world: copied from space.js ~20 (W, H, MARGIN, RU, SU) ---------- */
const W=4200,H=3000,MARGIN=120,RU=300,SU=150;
const TICK=50;                 // ms of sim time per tick. placeholder
let EXEC_LEN=3;                // seconds of sim time per exec: SB's own (v2 keeps 6), so a round's move flies quickly. placeholder (panel 1.5–10)
let SIM_SPEED=1;               // wall-clock multiplier (panel 0.25–2)
const EXEC_LEN_MIN=1.5,EXEC_LEN_MAX=10,SIM_SPEED_MIN=0.25,SIM_SPEED_MAX=2;
const PREFS_KEY='sr-arena-sb-prefs';   // SB Test's own key (v2 keeps sr-arena-prefs); never the campaign's

/* ---------- seeded RNG (the DBGspace setRng idea, but always on) ---------- */
function mulberry(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

/* ---------- rulesets this driver runs ---------- */
const RULESETS={
  sb:{key:'sb',name:'SB Test',mod:window.SIMSB},   // game/js/sim-sb.js
};
// mod: {build(scenario,rng), planInput(ev), tick(dtSim), draw(ctx,now), panelGroup(), metricsRecord()} and the extras in the header
const scenarios=()=>window.SR_ARENA_SCENARIOS||[];
const forSb=s=>!s.rulesets||s.rulesets.includes('sb');

/* ---------- rock layouts: copied from sim2.js makeRocks (the same layout seeds, so the same rocks) ---------- */
const ROCKS={
  open:{seed:1,clusters:[]},
  belt1:{seed:11,belt:[[1500,450],[2750,2550]],n:24,spread:280},
  scatter:{seed:7,clusters:[[1700,1900],[2450,2100],[2100,800],[3300,2300],[1200,1200]]},
  field:{seed:23,box:[1300,600,3000,2400],n:18},
};
function rockLayout(key){
  const L=ROCKS[key]||ROCKS.open,r0=UT.mulberry32(L.seed),out=[];
  const add=(cx,cy)=>{const r=55+r0()*95;const verts=[];const vn=8+Math.floor(r0()*4);for(let k=0;k<vn;k++)verts.push(0.72+r0()*0.4);
    out.push({x:UT.clamp(cx,MARGIN+r,W-MARGIN-r),y:UT.clamp(cy,MARGIN+r,H-MARGIN-r),r,verts,rot:r0()*Math.PI*2});};
  for(const [cx,cy] of L.clusters||[]){const n=3+Math.floor(r0()*4);for(let i=0;i<n;i++){const a=r0()*Math.PI*2,d=r0()*260;add(cx+Math.cos(a)*d,cy+Math.sin(a)*d);}}
  if(L.belt){const [[x0,y0],[x1,y1]]=L.belt;for(let i=0;i<L.n;i++){const k=(i+r0()*0.6)/L.n,a=r0()*Math.PI*2,d=r0()*L.spread;add(x0+(x1-x0)*k+Math.cos(a)*d,y0+(y1-y0)*k+Math.sin(a)*d);}}
  if(L.box){const [bx0,by0,bx1,by1]=L.box;for(let i=0;i<L.n;i++)add(bx0+r0()*(bx1-bx0),by0+r0()*(by1-by0));}
  return out;
}

/* ---------- state: one object, rebuilt per scenario ---------- */
const A={phase:'PICK',ruleset:'sb',active:false,scen:null,variant:null,seed:1,turn:1,execT:0,simTotal:0,acc:0,lastReal:0,
  planStart:0,planMs:0,metrics:[],floaters:[],result:null,objStep:0,world:null,mod:null};

/* ---------- the cast: v2's scenario format → plain descriptors (copied from sim2.js load: resolveScenario,
   formation, presetPilot) so a scenario and seed place the same ships under both rulesets ---------- */
function resolveScenario(scn,vi){
  const v=(scn.variants&&scn.variants[vi])||null;
  const out=Object.assign({},scn,v||{});
  out.tune=Object.assign({},scn.tune||{},(v&&v.tune)||{});
  out.variantLabel=v?v.label:null;
  return out;
}
function formation(at,i,n){const [x,y,h]=at,px=-Math.sin(h),py=Math.cos(h),o=(i-(n-1)/2)*170,back=Math.abs(i-(n-1)/2)*60;return [x+px*o-Math.cos(h)*back,y+py*o-Math.sin(h)*back,h];}
function presetPilot(spec,name){
  spec=spec||{};
  const PRESETS=window.SIM2.PRESETS;
  if(spec.id&&SRDB.pilots[spec.id])return dbPilotOf(spec.id,name);
  const P=Object.assign({},PRESETS[spec.preset||'regular']||PRESETS.regular,spec);
  const p={preset:spec.preset||'regular',pname:name,level:P.level,skills:{aim:P.aim,cunning:P.cunning,focus:P.focus,presence:P.presence},
    init:P.initiative,cool:P.presence*2,tr:(P.traits||'').split('|').filter(Boolean).map(k=>({k})),mans:(P.mans||[]).slice()};
  if(spec.moveset)p.moveset=spec.moveset.slice();   // SB Test: a scenario's own pilot moveset, over the preset's
  return p;
}
function dbPilotOf(id,name){
  const r=SRDB.pilots[id];
  return {preset:null,pname:r.name||name,level:r.level,skills:{aim:r.aim,cunning:r.cunning,focus:r.focus,presence:r.presence},
    init:r.initiative,cool:r.presence*2,tr:String(r.traits||'').split('|').filter(Boolean).map(t=>{const [k,w]=t.split(':');return w?{k,with:w}:{k};}),mans:[]};
}
const keyOf=row=>String(row.legacy_keys).split('|')[0]||row.id;
function resolveCast(R){
  const out=[];
  const pl=R.player||[];
  pl.forEach((p,i)=>{
    const at=p.at||formation(R.playerAt||[700,H*0.62,-0.35],i,pl.length);
    const row=SRDB.ship(p.cls||'talon')||SRDB.ship('talon'),nm=p.name||('Fox '+(i+1));
    out.push({id:'P'+(i+1),name:nm,faction:'reb',row,cls:keyOf(row),x:at[0],y:at[1],h:at[2],pilot:presetPilot(p.pilot,nm),
      lead:i===0,flees:false,doctrine:null,loadout:p.loadout});
  });
  let eN=0;
  (R.enemies||[]).forEach(e=>{
    const n=e.id?1:(e.n||1),r=Enemies.space(e.type),row=SRDB.ship(r.ship);
    for(let i=0;i<n;i++){
      eN++;
      const at=e.at&&n===1?e.at:formation(e.at||[W-800,H*0.38,Math.PI-0.35],i,n);
      const label=row.name.split(' ').pop(),nm=e.name||(label+' '+eN);
      const pilot=e.preset?presetPilot({preset:e.preset},nm):dbPilotOf(e.pilot||r.pilot,nm);
      if(r.nerve_cap!=null)pilot.coolCap=r.nerve_cap;
      const struct=row.kind==='structure';
      out.push({id:e.id&&n===1?e.id:'E'+eN,name:nm,faction:'heg',row,cls:keyOf(row),x:at[0],y:at[1],h:at[2],pilot,
        lead:!!r.lead,flees:e.flees!=null?!!e.flees:!!r.flees,doctrine:struct?null:(e.doctrine||'pursuit'),type:e.type,struct,loadout:e.loadout});
    }
  });
  return out;
}

/* ---------- shared drawing kit (rendering only: no rules live here) ---------- */
const cv=byId('sbCv'),ctx=cv.getContext('2d');
let dpr=1,cssW=0,cssH=0;
const cam={x:W/2,y:H/2,z:0.3};
function fitCanvas(){
  const r=cv.getBoundingClientRect();
  dpr=window.devicePixelRatio||1;cssW=Math.max(1,r.width);cssH=Math.max(1,r.height);
  cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);
}
function fitZoom(){return Math.min(cssW/W,cssH/H)*0.98;}
function camFit(){cam.z=fitZoom();cam.x=W/2;cam.y=H/2;}
function clampCam(){const z0=fitZoom();cam.z=Math.max(z0*0.8,Math.min(2.2,cam.z));cam.x=Math.max(0,Math.min(W,cam.x));cam.y=Math.max(0,Math.min(H,cam.y));}
const toWorld=(px,py)=>({x:(px-cssW/2)/cam.z+cam.x,y:(py-cssH/2)/cam.z+cam.y});
const iconBoost=()=>Math.max(1,Math.min(2.8,0.55/cam.z));
const stars=[];(function(){const r=mulberry(99);for(let i=0;i<420;i++)stars.push({x:r()*W,y:r()*H,r:0.7+r()*1.1,band:Math.floor(r()*4)});})();
function drawBackdrop(c){
  c.fillStyle=C.void||'#0a0c22';c.fillRect(0,0,W,H);
  // stars in four brightness bands, one fill each (one arc per star was most of the frame's cost)
  c.fillStyle='#dfe6ff';
  for(let b=0;b<4;b++){
    c.globalAlpha=0.3+0.13*b;c.beginPath();
    for(const st of stars){if(st.band!==b)continue;const r=st.r/Math.max(cam.z,0.35);c.rect(st.x-r,st.y-r,2*r,2*r);}
    c.fill();
  }
  c.globalAlpha=1;
  c.strokeStyle=T.rgba(C.seam||'#3a4488',0.9);c.lineWidth=3/cam.z;c.setLineDash([16/cam.z,12/cam.z]);
  c.strokeRect(MARGIN,MARGIN,W-2*MARGIN,H-2*MARGIN);c.setLineDash([]);
}
function drawRock(c,r){
  c.save();c.translate(r.x,r.y);c.rotate(r.rot);c.beginPath();
  const n=r.verts.length;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=r.r*r.verts[i];i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
  c.closePath();
  const B=SA&&SA.BIOME&&SA.BIOME.rock;
  c.fillStyle=B?B.boulder:'#4a4458';c.fill();
  c.lineWidth=3/Math.max(cam.z,0.5);c.strokeStyle=C.ink;c.stroke();
  c.restore();
}
/* a ship's body: the art kit's hull when it has one, a plain dart when not (the depot) */
/* the art kit lights each hull for its angle, which costs about half a millisecond a ship. Each look (art, livery,
   size on screen, angle, roll, damage, boost) is drawn once into a sprite and stamped after; buckets are fine enough
   that the stamp is rotated and scaled by at most half a bucket. */
const sprites=new Map();
const ANG_B=72,ROLL_B=4,DMG_B=4,SCALE_B=Math.log(1.08),ART_R=52;   // buckets; ART_R: the art's reach in its own units
function shipSprite(art,livery,px,angI,rollI,dmgI,boost){
  const pb=Math.exp(Math.round(Math.log(px)/SCALE_B)*SCALE_B);
  const key=art+'|'+livery+'|'+pb.toFixed(3)+'|'+angI+'|'+rollI+'|'+dmgI+'|'+(boost?1:0);
  let sp=sprites.get(key);
  if(!sp){
    const half=Math.ceil(pb*ART_R)+2,cv2=document.createElement('canvas');
    cv2.width=cv2.height=half*2;
    SA.ship(cv2.getContext('2d'),art,half,half,angI*2*Math.PI/ANG_B,pb,0,{livery,damage:dmgI/DMG_B,roll:rollI/ROLL_B,boost});
    sp={cv:cv2,half,pb};
    if(sprites.size>900)sprites.delete(sprites.keys().next().value);   // oldest first
    sprites.set(key,sp);
  }
  return sp;
}
function drawShipBody(c,s,o){
  o=o||{};
  const x=o.x!=null?o.x:s.x,y=o.y!=null?o.y:s.y,h=o.h!=null?o.h:s.h,alpha=o.alpha==null?1:o.alpha;
  const art=SA&&SA.SHIP_FOR_GAME&&SA.SHIP_FOR_GAME[s.cls];
  const size=SRDB.visualSize(s.row.size);
  c.save();c.globalAlpha=alpha;
  if(art){
    try{
      const scale=size*1.6*iconBoost()*0.85*(o.scale||1),px=scale*cam.z*dpr;   // o.scale: the ruleset's ship size
      const angI=((Math.round(h/(2*Math.PI)*ANG_B)%ANG_B)+ANG_B)%ANG_B;
      const rollI=Math.round(Math.max(-1,Math.min(1,o.roll||0))*ROLL_B);
      const dmgI=Math.round((s.maxHull?1-Math.max(0,s.hull)/s.maxHull:0)*DMG_B);
      const sp=shipSprite(art,s.faction==='reb'?'rebel':'heg',px,angI,rollI,dmgI,!!o.boost);
      const k=(px/sp.pb)/(cam.z*dpr);
      c.translate(x,y);c.rotate(h-angI*2*Math.PI/ANG_B);c.scale(k,k);
      c.drawImage(sp.cv,-sp.half,-sp.half);
    }catch(e){c.restore();c.save();c.globalAlpha=alpha;plainDart(c,s,x,y,h,size*(o.scale||1));}
  } else plainDart(c,s,x,y,h,size*(o.scale||1));
  c.restore();
}
function plainDart(c,s,x,y,h,size){
  const k=size*1.6*iconBoost();
  c.translate(x,y);c.rotate(h);c.scale(k,k);
  c.beginPath();
  if(s.struct){for(let i=0;i<8;i++){const a=i/8*6.283;i?c.lineTo(Math.cos(a)*12,Math.sin(a)*12):c.moveTo(12,0);}c.closePath();}
  else{c.moveTo(16,0);c.lineTo(-10,-9);c.lineTo(-6,0);c.lineTo(-10,9);c.closePath();}
  c.fillStyle=s.faction==='reb'?C.plateHi||'#313a7c':s.struct?'#6a6146':C.hull||'#1a1f47';c.fill();
  c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();
  c.fillStyle=s.faction==='reb'?C.rebel:C.heg;c.fillRect(-3,-2,8,4);
}
function addFloater(x,y,text,col){A.floaters.push({x,y,text,col:col||C.text,t0:performance.now()});if(A.floaters.length>40)A.floaters.shift();}
function drawFloaters(c,now){
  A.floaters=A.floaters.filter(f=>now-f.t0<1800);
  c.save();c.textAlign='center';c.font='800 '+Math.round(13/cam.z)+'px "Exo 2",sans-serif';
  for(const f of A.floaters){
    const k=(now-f.t0)/1800;
    c.globalAlpha=1-k*k;
    const y=f.y-30*k/cam.z;
    c.lineWidth=4/cam.z;c.strokeStyle=C.ink;c.strokeText(f.text,f.x,y);
    c.fillStyle=f.col;c.fillText(f.text,f.x,y);
  }
  c.restore();
}
/* what every ruleset gets from the chassis */
const kit={W,H,MARGIN,RU,SU,cam,iconBoost,drawShipBody,addFloater,
  get EXEC_LEN(){return EXEC_LEN;},get TICK(){return TICK;},get phase(){return A.phase;},
  refresh(){syncHud();},
  hudChanged(){syncHud();}};
window.SR_ARENA=kit;

/* ---------- the loop ---------- */
function startPlan(){
  A.phase='PLAN';A.planStart=performance.now();
  syncAll();
}
function beginExec(){
  if(A.phase!=='PLAN')return false;
  A.planMs=Math.round(performance.now()-A.planStart);
  A.mod.beginExec();
  A.execT=0;A.acc=0;A.lastReal=0;A.phase='EXEC';A.camHeld=false;
  syncAll();
  return true;
}
function stepTick(){
  A.mod.tick(TICK/1000);
  A.execT+=TICK/1000;A.simTotal+=TICK/1000;
  if(A.execT>=EXEC_LEN-1e-9)finishExec();
}
function finishExec(){
  A.mod.endExec();
  const obj=checkObjective();
  const rec={ruleset:A.ruleset,scenario:A.scen.id,variant:A.world.variantLabel||null,seed:A.seed,turn:A.turn,
    planMs:A.planMs,execLen:EXEC_LEN,ships:A.mod.metricsRecord(),objective:obj};
  A.metrics.push(rec);
  try{console.log('ARENA_METRICS '+JSON.stringify(rec));}catch(e){}
  A.turn++;
  if(obj.state==='won'||obj.state==='lost'){A.phase='OVER';A.result=obj.state;syncAll();showEnd();return;}
  startPlan();
}
function runExecSync(){   // tests: one whole exec at once
  if(A.phase!=='PLAN')return false;
  beginExec();
  let guard=0;
  while(A.phase==='EXEC'&&guard++<10000)stepTick();
  return true;
}
function frame(now){
  if(!A.mod){drawEmpty();return;}
  const realDt=A.lastFrame?Math.min(100,now-A.lastFrame):16;A.lastFrame=now;
  if(A.phase==='EXEC'){
    if(!A.lastReal)A.lastReal=now;
    const dt=Math.min(250,now-A.lastReal);A.lastReal=now;
    A.acc+=dt*SIM_SPEED;
    let n=0;
    while(A.acc>=TICK&&A.phase==='EXEC'&&n++<40){A.acc-=TICK;stepTick();}
    if(A.phase==='EXEC'){syncTop();chase(realDt);}
  }
  render(now);
}
/* the chase camera (panel toggle): while the sim runs it frames your selected ship, a little ahead of it, and its
   target, easing there so the view never jumps. Pan or zoom by hand and it lets go until the next exec. */
let FOLLOW=true;
const CHASE_ZMIN=0.45,CHASE_ZMAX=1.0,CHASE_PAD=240,CHASE_EASE=5;   // zoom limits, framing margin (world units), easing rate (per s)
function chase(dtMs){
  if(!FOLLOW||A.camHeld||!A.mod.focus)return;
  const pts=A.mod.focus();if(!pts||!pts.length)return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  const gz=Math.max(CHASE_ZMIN,Math.min(CHASE_ZMAX,Math.min(cssW/(x1-x0+2*CHASE_PAD),cssH/(y1-y0+2*CHASE_PAD))));
  const k=1-Math.exp(-CHASE_EASE*dtMs/1000);
  cam.x+=((x0+x1)/2-cam.x)*k;cam.y+=((y0+y1)/2-cam.y)*k;cam.z+=(gz-cam.z)*k;
  clampCam();
}
/* the opening view: every ship, framed, rather than the whole map */
function camFrame(){
  const ships=A.mod.ships().filter(s=>s.alive);
  if(!ships.length){camFit();return;}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of ships){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  cam.x=(x0+x1)/2;cam.y=(y0+y1)/2;
  cam.z=Math.max(fitZoom(),Math.min(CHASE_ZMAX,Math.min(cssW/(x1-x0+2*CHASE_PAD),cssH/(y1-y0+2*CHASE_PAD))));
  clampCam();
}

/* ---------- objectives: v2's format (survive, destroy a list or 'all', exit an edge, chain) ---------- */
const EDGE_ZONE=180;   // copied from sim2.js
const objSteps=o=>o?(o.kind==='chain'?o.steps:[o]):[];
function targetsOf(st,ships){return st.targets==='all'?ships.filter(x=>x.faction==='heg'&&!x.struct).map(x=>x.id):st.targets;}
function checkObjective(){
  const ships=A.mod.ships(),steps=objSteps(A.world.objective);
  const reb=ships.filter(s=>s.faction==='reb'&&s.alive);
  if(!reb.length)return {state:'lost',why:'every player ship is down',step:A.objStep};
  while(A.objStep<steps.length){
    const st=steps[A.objStep];let done=false;
    if(st.kind==='survive')done=A.simTotal>=st.secs-1e-6;
    else if(st.kind==='destroy')done=targetsOf(st,ships).every(id=>{const t=ships.find(s=>s.id===id);return !t||!t.alive;});
    else if(st.kind==='exit')done=reb.some(s=>atEdge(s,st.edge));
    if(!done)return {state:'live',kind:st.kind,step:A.objStep,of:steps.length,simT:+A.simTotal.toFixed(2)};
    A.objStep++;
  }
  return {state:'won',kind:steps.length?steps[steps.length-1].kind:'none',step:A.objStep};
}
function atEdge(s,e){const m=MARGIN+EDGE_ZONE;return e==='E'?s.x>=W-m:e==='W'?s.x<=m:e==='N'?s.y<=m:s.y>=H-m;}
function objText(){
  if(!A.world)return '';
  const steps=objSteps(A.world.objective),o=steps[Math.min(A.objStep,steps.length-1)];
  if(!o)return '';
  if(o.kind==='survive')return 'Survive '+Math.max(0,Math.ceil(o.secs-A.simTotal))+'s';
  if(o.kind==='destroy')return 'Destroy '+(o.targets==='all'?'every hostile':o.targets.join(', '));
  return 'Exit '+({N:'north',E:'east',S:'south',W:'west'})[o.edge];
}

/* ---------- loading ---------- */
function load(id,ruleset,variantIdx,seed){
  const scn=scenarios().find(s=>s.id===id);
  if(!scn)throw new Error('Unknown arena scenario '+id);
  if(!forSb(scn))throw new Error(id+' does not run under SB Test');
  const R=RULESETS.sb;
  if(!A.active)openUi();
  A.ruleset='sb';A.scen=scn;
  A.variant=scn.variants?(variantIdx==null?0:variantIdx):null;
  if(seed!=null)A.seed=seed>>>0;
  A.turn=1;A.execT=0;A.simTotal=0;A.acc=0;A.objStep=0;A.result=null;A.floaters=[];
  const Rs=resolveScenario(scn,A.variant||0);
  if(Rs.tune&&Rs.tune.EXEC_LEN)EXEC_LEN=Rs.tune.EXEC_LEN;
  const world={scenario:scn,variantLabel:Rs.variantLabel,cast:resolveCast(Rs),rocks:rockLayout(Rs.rocks||'open'),objective:Rs.objective,tune:Rs.tune||{}};
  A.world=world;A.mod=R.mod;
  A.mod.build(world,mulberry(A.seed),kit);
  byId('sbPicker').hidden=true;byId('sbEnd').hidden=true;
  fitCanvas();camFrame();
  buildPanel();
  startPlan();
}
function restart(sameSeed){
  if(!A.scen)return;
  load(A.scen.id,'sb',A.variant,sameSeed?A.seed:((A.seed*2654435761+12345)>>>0)%1000000);
}

/* ---------- the picker ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* the SB scenario list (arena.js's picker asked for the ruleset first) */
function showPicker(){
  if(!A.active)openUi();
  A.phase='PICK';A.mod=null;
  renderPicker();
  syncAll();
}
function renderPicker(){
  const el=byId('sbPicker');el.hidden=false;byId('sbEnd').hidden=true;
  let h='<div class="arn-win"><h2>SB Test</h2><p>Pick a scenario. Exec '+EXEC_LEN+'s · Speed '+SIM_SPEED+'× · seed '+A.seed+'</p><div class="arn-pick" id="sbScenList">';
  for(const s of scenarios().filter(forSb)){
    h+='<div class="arn-pick__item" data-scen="'+esc(s.id)+'"><div class="arn-pick__txt"><div class="arn-pick__name">'+esc(s.title)+'</div><div class="arn-pick__desc">'+esc(s.desc||'')+'</div></div><div class="arn-pick__go">';
    if(s.variants&&s.variants.length)s.variants.forEach((v,i)=>{h+='<button type="button" class="sr-btn sr-btn--sm" data-load="'+esc(s.id)+'" data-variant="'+i+'">'+esc(v.label)+'</button>';});
    else h+='<button type="button" class="sr-btn sr-btn--sm sr-btn--primary" data-load="'+esc(s.id)+'">Fly</button>';
    h+='</div></div>';
  }
  h+='</div><div class="arn-fine"><button type="button" class="sr-btn sr-btn--sm" data-act="rulesets">Change ruleset</button> Nothing here touches your campaign. '+
    '<button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="title">Back to title</button></div></div>';
  el.innerHTML=h;
}
byId('sbPicker').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.load)load(b.dataset.load,'sb',b.dataset.variant!=null?+b.dataset.variant:null);
  else if(b.dataset.act==='rulesets')toRulesets();
  else if(b.dataset.act==='title')backToTitle();
});
/* back to arena.js's ruleset picker */
function toRulesets(){closeUi();if(window.SR_ARENA_PICKER)window.SR_ARENA_PICKER();}
function showEnd(){
  const el=byId('sbEnd');el.hidden=false;
  const last=A.metrics[A.metrics.length-1];
  el.innerHTML='<div class="arn-win"><h2>'+(A.result==='won'?'Objective met':'Scenario lost')+'</h2><p>'+esc(A.scen.title)+' · '+esc(RULESETS[A.ruleset].name)+
    ' · turn '+(A.turn-1)+' · seed '+A.seed+(last&&last.objective.why?' · '+esc(last.objective.why):'')+'</p>'+
    '<div class="arn-btns"><button type="button" class="sr-btn sr-btn--primary" data-act="same">Restart (same seed)</button><button type="button" class="sr-btn" data-act="new">Restart (new seed)</button>'+
    '<button type="button" class="sr-btn" data-act="dump">Dump metrics</button><button type="button" class="sr-btn sr-btn--ghost" data-act="picker">SB scenarios</button></div></div>';
}
byId('sbEnd').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  panelAct(b.dataset.act);
});
function backToTitle(){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}location.reload();}

/* ---------- the designer panel ---------- */
function rowHtml(g,i,item){
  const id='sbP_'+g+'_'+i;
  if(item.type==='toggle')return '<div class="arn-row arn-row--toggle"><input type="checkbox" id="'+id+'" data-g="'+g+'" data-i="'+i+'"'+(item.get()?' checked':'')+'><label for="'+id+'">'+esc(item.label)+'</label></div>';
  if(item.type==='multi'){   // a set: one checkbox per option
    const on=item.get();
    return '<div class="arn-row arn-row--multi"><label>'+esc(item.label)+'</label><span class="arn-multi">'+item.options.map((o,j)=>
      '<label><input type="checkbox" data-g="'+g+'" data-i="'+i+'" data-opt="'+esc(o.key)+'"'+(on.includes(o.key)?' checked':'')+'>'+esc(o.label)+'</label>').join('')+'</span></div>';
  }
  return '<div class="arn-row"><label for="'+id+'">'+esc(item.label)+'</label><output>'+fmt(item.get(),item.step)+'</output>'+
    '<input type="range" id="'+id+'" data-g="'+g+'" data-i="'+i+'" min="'+item.min+'" max="'+item.max+'" step="'+item.step+'" value="'+item.get()+'"></div>';
}
function fmt(v,step){return step&&step<1?(+v).toFixed(step<0.1?2:step<1?1:0).replace(/\.?0+$/,m=>m.includes('.')?'':m):String(v);}
let PANEL={};
function globalGroup(){
  return [
    {key:'EXEC_LEN',label:'Exec length (s)',min:EXEC_LEN_MIN,max:EXEC_LEN_MAX,step:0.5,get:()=>EXEC_LEN,set:v=>{EXEC_LEN=v;}},
    {key:'SIM_SPEED',label:'Sim speed (×)',min:SIM_SPEED_MIN,max:SIM_SPEED_MAX,step:0.25,get:()=>SIM_SPEED,set:v=>{SIM_SPEED=v;savePrefs();}},
    {key:'FOLLOW',label:'Chase camera while it runs',type:'toggle',get:()=>FOLLOW,set:v=>{FOLLOW=v;}},
  ];
}
function buildPanel(){
  PANEL={global:globalGroup(),rules:A.mod&&A.mod.panelGroup?A.mod.panelGroup():[]};
  let h='<div class="arn-grp"><div class="arn-grp__head">Run</div><div class="arn-btns">'+
    '<button type="button" class="sr-btn sr-btn--primary" data-act="exec" id="sbExec">Execute</button>'+
    '<button type="button" class="sr-btn" data-act="same">Restart (same seed)</button><button type="button" class="sr-btn" data-act="new">Restart (new seed)</button>'+
    '<button type="button" class="sr-btn" data-act="picker">SB scenarios</button><button type="button" class="sr-btn" data-act="rulesets">Change ruleset</button><button type="button" class="sr-btn" data-act="dump">Dump metrics</button>'+
    '<button type="button" class="sr-btn sr-btn--ghost" data-act="title">Back to title</button></div></div>';
  h+='<div class="arn-grp"><div class="arn-grp__head">Arena</div>'+PANEL.global.map((it,i)=>rowHtml('global',i,it)).join('')+'</div>';
  if(PANEL.rules.length)h+='<div class="arn-grp"><div class="arn-grp__head">'+esc(A.mod.name)+'</div>'+PANEL.rules.map((it,i)=>rowHtml('rules',i,it)).join('')+'</div>';
  h+='<div class="arn-grp"><div class="arn-grp__head">Read-outs</div><div class="arn-readout" id="sbReadout"></div></div>';
  byId('sbPanelBody').innerHTML=h;
  syncReadout();
}
byId('sbPanelBody').addEventListener('input',ev=>{
  const el=ev.target,g=el.dataset.g;if(!g)return;
  const item=PANEL[g][+el.dataset.i];
  if(item.type==='multi'){
    const set=[...el.closest('.arn-multi').querySelectorAll('input')].filter(x=>x.checked).map(x=>x.dataset.opt);
    item.set(set);syncAll();return;
  }
  const v=item.type==='toggle'?el.checked:+el.value;
  item.set(v);
  const out=el.parentElement.querySelector('output');if(out)out.textContent=fmt(v,item.step);
  syncAll();
});
byId('sbPanelBody').addEventListener('click',ev=>{const b=ev.target.closest('button[data-act]');if(b)panelAct(b.dataset.act);});
byId('sbPanelToggle').addEventListener('click',()=>{
  const p=byId('sbPanel');p.classList.toggle('is-collapsed');
  byId('sbPanelToggle').setAttribute('aria-expanded',String(!p.classList.contains('is-collapsed')));
  setTimeout(fitCanvas,0);
});
function panelAct(a){
  if(a==='exec')beginExec();
  else if(a==='same')restart(true);
  else if(a==='new')restart(false);
  else if(a==='picker')showPicker();
  else if(a==='rulesets')toRulesets();
  else if(a==='dump')dumpMetrics();
  else if(a==='title')backToTitle();
}
function dumpMetrics(){const s=JSON.stringify(A.metrics);try{console.log('ARENA_METRICS_DUMP '+s);}catch(e){}addFloater(cam.x,cam.y,'METRICS DUMPED TO CONSOLE',C.psi);return s;}
function savePrefs(){try{localStorage.setItem(PREFS_KEY,JSON.stringify({SIM_SPEED}));}catch(e){}}
function loadPrefs(){try{const p=JSON.parse(localStorage.getItem(PREFS_KEY)||'null');if(p&&p.SIM_SPEED)SIM_SPEED=Math.max(SIM_SPEED_MIN,Math.min(SIM_SPEED_MAX,+p.SIM_SPEED));}catch(e){}}

/* ---------- top bar, orders strip, read-outs ---------- */
function syncTop(){
  byId('sbTitle').textContent=A.scen?A.scen.title:'Arena';
  byId('sbSub').textContent=(RULESETS[A.ruleset]?RULESETS[A.ruleset].name:'')+(A.scen?' · seed '+A.seed:'');
  const ph=byId('sbPhase');ph.dataset.phase=A.phase;
  ph.textContent=A.phase==='PLAN'?'Planning':A.phase==='EXEC'?'Executing':A.phase==='OVER'?'Over':'Pick';
  byId('sbTurn').textContent=A.scen?'Turn '+A.turn+(A.phase==='EXEC'?' · '+A.execT.toFixed(1)+'s / '+EXEC_LEN+'s':''):'';
  byId('sbObj').textContent=objText();
  const ex=byId('sbExec');if(ex)ex.disabled=A.phase!=='PLAN';
  byId('sbExecTop').hidden=!A.scen;byId('sbExecTop').disabled=A.phase!=='PLAN';
}
function syncHud(){
  const el=byId('sbOrders');
  el.innerHTML=(A.mod&&A.phase!=='PICK'&&A.mod.hud)?A.mod.hud():'';
  syncReadout();
}
byId('sbOrders').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!A.mod||!A.mod.hudAction)return;
  A.mod.hudAction(b.dataset.act,b);
  syncHud();
});
function syncReadout(){
  const el=byId('sbReadout');if(!el)return;
  const last=A.metrics.filter(m=>A.scen&&m.scenario===A.scen.id).slice(-6);
  let t='Phase '+A.phase+' · turn '+A.turn+'\nSim time '+A.simTotal.toFixed(1)+'s\nPlanning ms (last turns): '+(last.map(m=>m.planMs).join(', ')||'—');
  if(A.mod&&A.mod.readout)t+='\n'+A.mod.readout();
  el.textContent=t;
}
function syncAll(){syncTop();syncHud();}

/* ---------- rendering ---------- */
function drawEmpty(){
  fitCanvasIfNeeded();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=C.void||'#0a0c22';ctx.fillRect(0,0,cssW,cssH);
}
function fitCanvasIfNeeded(){const r=cv.getBoundingClientRect();if(Math.abs(r.width-cssW)>0.5||Math.abs(r.height-cssH)>0.5)fitCanvas();}
function render(now){
  fitCanvasIfNeeded();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#04060d';ctx.fillRect(0,0,cssW,cssH);
  ctx.setTransform(dpr*cam.z,0,0,dpr*cam.z,dpr*(cssW/2-cam.x*cam.z),dpr*(cssH/2-cam.y*cam.z));
  drawBackdrop(ctx);
  for(const r of A.world.rocks)drawRock(ctx,r);
  try{A.mod.draw(ctx,now,A.phase==='EXEC'?A.acc/TICK:0);}catch(e){console.error(e);}
  drawFloaters(ctx,now);
}

/* ---------- input: rulesets get first refusal, the rest pans and zooms ---------- */
let pan=null;
function evWorld(ev){const r=cv.getBoundingClientRect();const px=ev.clientX-r.left,py=ev.clientY-r.top;const w=toWorld(px,py);return {px,py,x:w.x,y:w.y};}
function modEv(type,ev){const p=evWorld(ev);return {type,x:p.x,y:p.y,px:p.px,py:p.py,button:ev.button,shift:ev.shiftKey,alt:ev.altKey,z:cam.z};}
cv.addEventListener('pointerdown',ev=>{
  if(!A.mod)return;
  cv.setPointerCapture&&cv.setPointerCapture(ev.pointerId);
  if(A.mod.planInput(modEv('down',ev))){pan=null;syncHud();return;}
  const p=evWorld(ev);pan={px:p.px,py:p.py,cx:cam.x,cy:cam.y,moved:false};
});
cv.addEventListener('pointermove',ev=>{
  if(!A.mod)return;
  if(pan){
    const p=evWorld(ev);
    if(Math.abs(p.px-pan.px)+Math.abs(p.py-pan.py)>4)pan.moved=true;
    cam.x=pan.cx-(p.px-pan.px)/cam.z;cam.y=pan.cy-(p.py-pan.py)/cam.z;clampCam();
    if(pan.moved)A.camHeld=true;
    return;
  }
  A.mod.planInput(modEv('move',ev));
});
const endPtr=ev=>{
  if(!A.mod)return;
  if(pan){const wasPan=pan.moved;pan=null;if(!wasPan){A.mod.planInput(modEv('click',ev));syncHud();}return;}
  A.mod.planInput(modEv('up',ev));syncHud();
};
cv.addEventListener('pointerup',endPtr);
cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('contextmenu',ev=>ev.preventDefault());
cv.addEventListener('wheel',ev=>{
  ev.preventDefault();
  const p=evWorld(ev),before=toWorld(p.px,p.py);
  cam.z*=Math.exp(-ev.deltaY*0.0015);clampCam();A.camHeld=true;
  const after=toWorld(p.px,p.py);cam.x+=before.x-after.x;cam.y+=before.y-after.y;clampCam();
},{passive:false});
addEventListener('keydown',ev=>{
  if(SR.active!=='arena'||!A.active||!A.mod)return;
  if(ev.target&&/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName))return;
  if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();beginExec();}
  else if(A.mod.key_&&A.mod.key_(ev)){ev.preventDefault();syncHud();}
});
byId('sbExecTop').addEventListener('click',()=>beginExec());
byId('sbFit').addEventListener('click',()=>{camFit();A.camHeld=true;});

/* ---------- inside arena.js's scene: open and close (arena.js calls these from its picker) ---------- */
function openUi(){
  A.active=true;ROOT.hidden=false;
  const v2=SCENE.querySelector('.ar-shell');if(v2)v2.hidden=true;
  for(const id of ['arPicker','arOver']){const e=SCENE.querySelector('#'+id);if(e)e.hidden=true;}
  loadPrefs();fitCanvas();
}
function closeUi(){
  A.active=false;A.mod=null;A.phase='PICK';ROOT.hidden=true;
  const v2=SCENE.querySelector('.ar-shell');if(v2)v2.hidden=false;
}
function open(){openUi();showPicker();}

/* ---------- DBGarena.sb (arena.js's DBGarena hands this out): always on, the Arena is a test environment ---------- */
function stateHash(){
  const s=A.mod?A.mod.stateHash():'';
  let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16);
}
const dbg={A,RULESETS,get scenarios(){return scenarios();},get phase(){return A.phase;},get sim(){return A.mod&&A.mod.dbg;},get mod(){return A.mod;},
  get metrics(){return A.metrics;},get ruleset(){return A.ruleset;},get active(){return A.active;},
  fn:{load,restart,beginExec,runExecSync,finishExec,stepTick,showPicker,toRulesets,dumpMetrics,stateHash,resolveCast,resolveScenario,rockLayout,checkObjective,
    setSeed(n){A.seed=n>>>0;},
    addScenario(s){scenarios().push(s);if(A.phase==='PICK'&&A.active)renderPicker();return s;},
    setExecLen(v){EXEC_LEN=v;},setSimSpeed(v){SIM_SPEED=v;},
    TICK_:()=>TICK,EXEC_LEN_:()=>EXEC_LEN,SIM_SPEED_:()=>SIM_SPEED,FOLLOW_:()=>FOLLOW,setFollow(v){FOLLOW=!!v;},chase,camFrame,
    toWorld,cam_:()=>cam,
    spriteCount:()=>sprites.size,
    toClient(x,y){const r=cv.getBoundingClientRect();return {x:r.left+(x-cam.x)*cam.z+cssW/2,y:r.top+(y-cam.y)*cam.z+cssH/2};}}};
window.SR_ARENA_SB={open,close:closeUi,frame,get active(){return A.active;},dbg};
})();
