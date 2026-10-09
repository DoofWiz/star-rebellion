'use strict';
/* =====================================================================
   STAR REBELLION — the Arena (docs/ARENA-HANDOFF.md)
   A campaign-free lab for space combat experiments. It owns the chassis
   every ruleset shares: boot, the picker, the scenario loader, the
   PLAN→EXEC loop on a fixed tick, the seeded RNG, the camera, the
   designer panel, metrics and DBGarena. How ships move, shoot and
   resolve belongs to the ruleset module: "SR V2 Combat" (game/js/sim2.js)
   or "SB Test" (game/js/sim-sb.js, docs/ARENA-SB-HANDOFF.md), picked
   before the scenario so the same scenario runs under both.

   The no-save guarantee: nothing here calls newGame(), saveSnap(),
   persist() or SR.endMission(), and nothing reads or writes G. All state
   lives in A, rebuilt per scenario.

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
const ROOT=document.getElementById('sc-arena');
const byId=SR.util.scoped(ROOT);
const T=SR.theme,C=T.C;
const SA=window.SR_ART;

/* ---------- world: copied from space.js ~20 (W, H, MARGIN, RU, SU) ---------- */
const W=4200,H=3000,MARGIN=120,RU=300,SU=150;
const TICK=50;                 // ms of sim time per tick. placeholder
let EXEC_LEN=6;                // seconds of sim time per exec. placeholder (panel 2–10)
let SIM_SPEED=1;               // wall-clock multiplier (panel 0.25–2)
const EXEC_LEN_MIN=2,EXEC_LEN_MAX=10,SIM_SPEED_MIN=0.25,SIM_SPEED_MAX=2;
const PREFS_KEY='sr-arena-prefs';   // the Arena's own key; never the campaign's

/* ---------- seeded RNG (the DBGspace setRng idea, but always on) ---------- */
function mulberry(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

/* ---------- pilot presets: stat templates so experiments can vary pilot quality (placeholders) ---------- */
const PRESETS={
  green:  {level:1, aim:10,cunning:10,focus:0, presence:24,init:2,mans:[]},
  regular:{level:3, aim:20,cunning:20,focus:15,presence:30,init:3,mans:[]},
  veteran:{level:6, aim:35,cunning:35,focus:30,presence:36,init:4,mans:['loop']},
  ace:    {level:10,aim:50,cunning:50,focus:45,presence:44,init:5,mans:['loop','broll']},
};

/* ---------- rock layouts, by name ---------- */
function rockLayout(name){
  const out=[];
  if(!name||name==='none')return out;
  const r=mulberry(name==='belt1'?7:name==='scatter'?11:3);
  const mk=(x,y,rad)=>{const n=9+Math.floor(r()*4),verts=[];for(let i=0;i<n;i++)verts.push(0.78+r()*0.34);out.push({x,y,r:rad,verts,rot:r()*6.28});};
  if(name==='belt1'){   // a diagonal belt across the middle, gaps to fly through
    for(let i=0;i<11;i++){const k=i/10;mk(900+k*2500+(r()-0.5)*220,2500-k*2000+(r()-0.5)*260,60+r()*70);}
  } else {
    for(let i=0;i<9;i++)mk(500+r()*(W-1000),400+r()*(H-800),50+r()*60);
  }
  return out;
}

/* ---------- scenarios: data only. Adding one means adding an entry here. ----------
   player: [{cls, pilot:{preset, level?}, n?, name?, at?:[x,y,h]}]
   enemies: [{type (space_enemies row), doctrine, n, preset?, at?:[x,y,h]}]
   objective: {kind:'survive', secs} | {kind:'destroy', targets:[ids]} | {kind:'exit', edge:'N'|'E'|'S'|'W'}
              (+ then:{…} for a second step)
   variants: [{label, count}] — the same scenario at several player-ship counts
   rulesets: ['v2', …] — an allowlist; absent = every ruleset */
const ARENA_SCENARIOS=[
 {id:'e1_fox',title:'E1: The hunted fox',desc:'1 v 2 pursuit, survive 60s. Does committing to a path and interrupting it feel like being a wily ace? The prove-or-kill scenario.',
  rocks:'belt1',
  player:[{cls:'talon',name:'Fox',pilot:{preset:'veteran'},at:[1450,2450,-0.25]}],
  enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:2,at:[600,2650,-0.25]}],
  objective:{kind:'survive',secs:60},tune:{}},
 {id:'e2_sweep',title:'E2: The tempo sweep',desc:'E1 re-run: set Exec length to 2 / 4 / 6 / 8 and the planning clock off / on. Where on the turn-based to real-time spectrum does the dogfight feel live?',
  rocks:'belt1',
  player:[{cls:'talon',name:'Fox',pilot:{preset:'veteran'},at:[1450,2450,-0.25]}],
  enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:2,at:[600,2650,-0.25]}],
  objective:{kind:'survive',secs:60},tune:{EXEC_LEN:4}},
 {id:'e3_count',title:'E3: The ship count',desc:'2 / 4 / 8 player ships against matched pursuit and wingman flights. Does planning stay under 60–90s a turn, and the screen readable at the 6–8 cap?',
  rocks:'scatter',
  player:[{cls:'talon',pilot:{preset:'veteran'}},{cls:'viper',pilot:{preset:'regular'}},{cls:'talon',pilot:{preset:'green'}},{cls:'viper',pilot:{preset:'regular'}}],
  enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:1},{type:'academy-cadet',doctrine:'wingman',n:1}],
  variants:[{label:'2 ships',count:2},{label:'4 ships',count:4},{label:'8 ships',count:8}],
  objective:{kind:'survive',secs:90},tune:{}},
 {id:'e4_read_wing',title:'E4a: Read the doctrine (1 of 3)',desc:'One unexplained doctrine (wingman). Can a fresh player describe the behaviour and name an exploit unprompted by scenario three?',
  rocks:'scatter',
  player:[{cls:'talon',pilot:{preset:'regular'}},{cls:'viper',pilot:{preset:'regular'}}],
  enemies:[{type:'academy-commandant',doctrine:'wingman',n:1},{type:'academy-cadet',doctrine:'wingman',n:1}],
  objective:{kind:'survive',secs:60},tune:{}},
 {id:'e4_read_hold',title:'E4b: Read the doctrine (2 of 3)',desc:'One unexplained doctrine (hold_asset): two fighters guarding a depot.',
  rocks:'scatter',
  player:[{cls:'talon',pilot:{preset:'regular'}},{cls:'viper',pilot:{preset:'regular'}}],
  enemies:[{type:'fuel-depot',doctrine:'asset',n:1,at:[2900,1300,0]},{type:'vc-mote-patrol',doctrine:'hold_asset',n:2,at:[2700,1500,3.6]}],
  objective:{kind:'survive',secs:60},tune:{}},
 {id:'e4_read_line',title:'E4c: Read the doctrine (3 of 3)',desc:'One unexplained doctrine (firing_line): a flight that regroups at range, then runs in together.',
  rocks:'scatter',
  player:[{cls:'talon',pilot:{preset:'regular'}},{cls:'viper',pilot:{preset:'regular'}}],
  enemies:[{type:'vc-mote-patrol',doctrine:'firing_line',n:3}],
  objective:{kind:'survive',secs:60},tune:{}},
 {id:'e5_job',title:'E5: The job',desc:'Destroy the depot while 2 pursuit fighters hunt you, then exit east. Do the best moments happen when objective and pursuit are simultaneous?',
  rocks:'belt1',
  player:[{cls:'talon',pilot:{preset:'veteran'}},{cls:'viper',pilot:{preset:'regular'}}],
  enemies:[{type:'fuel-depot',doctrine:'asset',n:1,id:'D1',at:[2600,1200,0]},{type:'vc-mote-patrol',doctrine:'pursuit',n:2,at:[3600,700,2.6]}],
  objective:{kind:'destroy',targets:['D1'],then:{kind:'exit',edge:'E'}},tune:{}},
];

/* ---------- rulesets ---------- */
const RULESETS={
  v2:{key:'v2',name:'SR V2 Combat',mod:window.SIM2, desc:'Drawn paths fitted to the dial, continuous WEGO, the d20 kept, interrupts priced in nerve (docs/ARENA-HANDOFF.md).'},
  sb:{key:'sb',name:'SB Test',     mod:window.SIMSB,desc:'SteamBirds-informed: grab the craft and drag a smooth line, two AP segments, pilot movesets, simulated projectiles, lock as a dial (docs/ARENA-SB-HANDOFF.md).'},
};
// mod: {build(scenario,rng), planInput(ev), tick(dtSim), draw(ctx,now), panelGroup(), metricsRecord()} and the extras in the header

/* ---------- state: one object, rebuilt per scenario ---------- */
const A={phase:'PICK',ruleset:'v2',scen:null,variant:null,seed:1,turn:1,execT:0,simTotal:0,acc:0,lastReal:0,
  planStart:0,planMs:0,metrics:[],floaters:[],result:null,objStep:0,world:null,mod:null};

/* ---------- the cast: scenario entries → plain descriptors each ruleset builds its own ships from ---------- */
const P_FORM=[[650,2450],[430,2560],[870,2620],[540,2300],[260,2400],[980,2420],[380,2720],[760,2300]];
const E_FORM=[[2950,1150],[3150,1000],[3180,1300],[3400,1120],[3380,1420],[3600,950],[3600,1300],[3800,1150]];
function presetPilot(pr,o){
  const P=PRESETS[pr]||PRESETS.regular;
  const level=(o&&o.level)||P.level;
  return {preset:pr||'regular',level,skills:{aim:P.aim,cunning:P.cunning,focus:P.focus,presence:P.presence},
    init:P.init,cool:P.presence*2,tr:[],mans:P.mans.slice()};
}
function shipRow(cls){return SRDB.ship(cls);}
function resolveCast(scn,variant){
  const out=[];
  let plist=[];
  const count=variant&&variant.count;
  for(const e of scn.player)for(let i=0;i<(e.n||1);i++)plist.push(e);
  if(count){const base=plist.slice();plist=[];for(let i=0;i<count;i++)plist.push(base[i%base.length]);}
  plist.forEach((e,i)=>{
    const row=shipRow(e.cls);
    const at=e.at&&i===0?e.at:(e.at?[e.at[0]-80*i,e.at[1]+120*i,e.at[2]]:[P_FORM[i%8][0]+(i>=8?60:0),P_FORM[i%8][1],-Math.PI/4]);
    const pilot=presetPilot(e.pilot&&e.pilot.preset,e.pilot);
    pilot.pname=(e.name||row.name.split(' ').pop())+(plist.length>1?' '+(i+1):'');
    out.push({id:'P'+(i+1),name:e.name?(plist.length>1?e.name+' '+(i+1):e.name):'Wing '+(i+1),faction:'reb',row,cls:String(row.legacy_keys).split('|')[0]||row.id,
      x:at[0],y:at[1],h:at[2],pilot,lead:i===0,flees:false,doctrine:null});
  });
  let ei=0;
  for(const e of scn.enemies){
    const r=Enemies.space(e.type),row=shipRow(r.ship),pr=SRDB.pilots[r.pilot];
    for(let i=0;i<(e.n||1);i++){
      const at=e.at?[e.at[0]+60*i,e.at[1]-140*i,e.at[2]]:[E_FORM[ei%8][0],E_FORM[ei%8][1],Math.PI*0.75];
      const pilot=e.preset?presetPilot(e.preset,null):{preset:null,level:pr.level,
        skills:{aim:pr.aim,cunning:pr.cunning,focus:pr.focus,presence:pr.presence},init:pr.initiative,cool:pr.presence*2,
        tr:String(pr.traits||'').split('|').filter(Boolean).map(t=>({k:t.split(':')[0]})),mans:r.maneuvers?r.maneuvers.split('|'):[]};
      pilot.pname=pr.name;
      if(r.nerve_cap!=null)pilot.coolCap=r.nerve_cap;
      out.push({id:e.id&&(e.n||1)===1?e.id:'E'+(ei+1),name:r.name+((e.n||1)>1?' '+(i+1):''),faction:'heg',row,
        cls:String(row.legacy_keys).split('|')[0]||row.id,x:at[0],y:at[1],h:at[2],pilot,
        lead:!!r.lead,flees:!!r.flees,doctrine:e.doctrine||'pursuit',type:e.type,struct:row.kind==='structure'});
      ei++;
    }
  }
  return out;
}

/* ---------- shared drawing kit (rendering only: no rules live here) ---------- */
const cv=byId('arCv'),ctx=cv.getContext('2d');
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
const stars=[];(function(){const r=mulberry(99);for(let i=0;i<420;i++)stars.push({x:r()*W,y:r()*H,r:0.8+r()*1.3,a:0.25+r()*0.45});})();
function drawBackdrop(c){
  c.fillStyle=C.void||'#0a0c22';c.fillRect(0,0,W,H);
  for(const s of stars){c.globalAlpha=s.a;c.fillStyle='#dfe6ff';c.beginPath();c.arc(s.x,s.y,s.r/Math.max(cam.z,0.35),0,6.283);c.fill();}
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
function drawShipBody(c,s,o){
  o=o||{};
  const x=o.x!=null?o.x:s.x,y=o.y!=null?o.y:s.y,h=o.h!=null?o.h:s.h,alpha=o.alpha==null?1:o.alpha;
  const art=SA&&SA.SHIP_FOR_GAME&&SA.SHIP_FOR_GAME[s.cls];
  const size=SRDB.visualSize(s.row.size);
  c.save();c.globalAlpha=alpha;
  if(art){
    try{SA.ship(c,art,x,y,h,size*1.6*iconBoost()*0.85,0,{livery:s.faction==='reb'?'rebel':'heg',
      damage:s.maxHull?1-Math.max(0,s.hull)/s.maxHull:0,roll:o.roll||0,boost:!!o.boost});}
    catch(e){c.restore();c.save();c.globalAlpha=alpha;plainDart(c,s,x,y,h,size);}
  } else plainDart(c,s,x,y,h,size);
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
  A.execT=0;A.acc=0;A.lastReal=0;A.phase='EXEC';
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
  const rec={ruleset:A.ruleset,scenario:A.scen.id,variant:A.variant?A.variant.label:null,seed:A.seed,turn:A.turn,
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
  if(A.phase==='EXEC'){
    if(!A.lastReal)A.lastReal=now;
    const dt=Math.min(250,now-A.lastReal);A.lastReal=now;
    A.acc+=dt*SIM_SPEED;
    let n=0;
    while(A.acc>=TICK&&A.phase==='EXEC'&&n++<40){A.acc-=TICK;stepTick();}
    if(A.phase==='EXEC')syncTop();
  }
  render(now);
}

/* ---------- objectives ---------- */
function objStepDef(){let o=A.scen.objective;for(let i=0;i<A.objStep&&o.then;i++)o=o.then;return o;}
function checkObjective(){
  const ships=A.mod.ships();
  const reb=ships.filter(s=>s.faction==='reb'&&s.alive);
  if(!reb.length)return {state:'lost',why:'every player ship is down',step:A.objStep};
  for(;;){
    const o=objStepDef();
    let done=false;
    if(o.kind==='survive')done=A.simTotal>=o.secs-1e-6;
    else if(o.kind==='destroy')done=o.targets.every(id=>{const t=ships.find(s=>s.id===id);return !t||!t.alive;});
    else if(o.kind==='exit')done=reb.some(s=>atEdge(s,o.edge));
    if(!done)return {state:'live',kind:o.kind,step:A.objStep,simT:+A.simTotal.toFixed(2)};
    if(o.then){A.objStep++;continue;}
    return {state:'won',kind:o.kind,step:A.objStep};
  }
}
function atEdge(s,e){const m=MARGIN+60;return e==='E'?s.x>=W-m:e==='W'?s.x<=m:e==='N'?s.y<=m:s.y>=H-m;}
function objText(){
  if(!A.scen)return '';
  const o=objStepDef();
  if(o.kind==='survive')return 'Survive '+Math.max(0,Math.ceil(o.secs-A.simTotal))+'s';
  if(o.kind==='destroy')return 'Destroy '+o.targets.join(', ');
  return 'Exit '+({N:'north',E:'east',S:'south',W:'west'})[o.edge];
}

/* ---------- loading ---------- */
function load(id,ruleset,variantIdx,seed){
  const scn=ARENA_SCENARIOS.find(s=>s.id===id);
  if(!scn)throw new Error('Unknown arena scenario '+id);
  ruleset=ruleset||A.ruleset||'v2';
  if(scn.rulesets&&!scn.rulesets.includes(ruleset))throw new Error(id+' does not run under '+ruleset);
  const R=RULESETS[ruleset];
  A.ruleset=ruleset;A.scen=scn;
  A.variant=scn.variants?scn.variants[variantIdx==null?0:variantIdx]:null;
  if(seed!=null)A.seed=seed>>>0;
  A.turn=1;A.execT=0;A.simTotal=0;A.acc=0;A.objStep=0;A.result=null;A.floaters=[];
  if(scn.tune&&scn.tune.EXEC_LEN)EXEC_LEN=scn.tune.EXEC_LEN;
  const world={scenario:scn,cast:resolveCast(scn,A.variant),rocks:rockLayout(scn.rocks),objective:scn.objective,tune:scn.tune||{}};
  A.world=world;A.mod=R.mod;
  A.mod.build(world,mulberry(A.seed),kit);
  byId('arPicker').hidden=true;byId('arEnd').hidden=true;
  fitCanvas();camFit();
  buildPanel();
  startPlan();
}
function restart(sameSeed){
  if(!A.scen)return;
  const vi=A.scen.variants?A.scen.variants.indexOf(A.variant):null;
  load(A.scen.id,A.ruleset,vi,sameSeed?A.seed:((A.seed*2654435761+12345)>>>0)%1000000);
}

/* ---------- the picker ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* two steps (docs/ARENA-SB-HANDOFF.md §1): the ruleset first, then the scenario. Both live in one window; the
   scenario list stays hidden until a ruleset is chosen. */
let rulesetChosen=false;
function showPicker(){
  A.phase='PICK';A.mod=null;rulesetChosen=false;
  renderPicker();
  syncAll();
}
function renderPicker(){
  const el=byId('arPicker');el.hidden=false;byId('arEnd').hidden=true;
  const list=ARENA_SCENARIOS.filter(s=>!s.rulesets||s.rulesets.includes(A.ruleset));
  let h='<div class="arn-win"><h2>Arena</h2><p>Pick a ruleset, then a scenario. Exec '+EXEC_LEN+'s · Speed '+SIM_SPEED+'× · seed '+A.seed+'</p>'+
    '<div class="arn-pick" id="arRulesetList">';
  for(const k in RULESETS){
    const R=RULESETS[k],on=rulesetChosen&&A.ruleset===k;
    h+='<div class="arn-pick__item'+(on?' is-on':'')+'" data-ruleset-item="'+k+'"><div class="arn-pick__txt"><div class="arn-pick__name">'+esc(R.name)+'</div><div class="arn-pick__desc">'+esc(R.desc)+'</div></div>'+
      '<div class="arn-pick__go"><button type="button" class="sr-btn sr-btn--sm'+(on?' sr-btn--primary':'')+'" data-ruleset="'+k+'" aria-pressed="'+on+'">'+(on?'Chosen':'Choose')+'</button></div></div>';
  }
  h+='</div><div id="arScenStep"'+(rulesetChosen?'':' hidden')+'><p style="margin-top:14px">Scenarios under <b>'+esc(RULESETS[A.ruleset].name)+'</b></p><div class="arn-pick" id="arScenList">';
  for(const s of list){
    h+='<div class="arn-pick__item" data-scen="'+esc(s.id)+'"><div class="arn-pick__txt"><div class="arn-pick__name">'+esc(s.title)+'</div><div class="arn-pick__desc">'+esc(s.desc)+'</div></div><div class="arn-pick__go">';
    if(s.variants)s.variants.forEach((v,i)=>{h+='<button type="button" class="sr-btn sr-btn--sm" data-load="'+esc(s.id)+'" data-variant="'+i+'">'+esc(v.label)+'</button>';});
    else h+='<button type="button" class="sr-btn sr-btn--sm sr-btn--primary" data-load="'+esc(s.id)+'">Fly</button>';
    h+='</div></div>';
  }
  h+='</div></div><div class="arn-fine">Nothing here touches your campaign. <button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="title">Back to title</button></div></div>';
  el.innerHTML=h;
}
function chooseRuleset(k){if(!RULESETS[k])throw new Error('Unknown ruleset '+k);A.ruleset=k;rulesetChosen=true;renderPicker();syncAll();}
byId('arPicker').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.ruleset)chooseRuleset(b.dataset.ruleset);
  else if(b.dataset.load)load(b.dataset.load,A.ruleset,b.dataset.variant!=null?+b.dataset.variant:null);
  else if(b.dataset.act==='title')backToTitle();
});
function showEnd(){
  const el=byId('arEnd');el.hidden=false;
  const last=A.metrics[A.metrics.length-1];
  el.innerHTML='<div class="arn-win"><h2>'+(A.result==='won'?'Objective met':'Scenario lost')+'</h2><p>'+esc(A.scen.title)+' · '+esc(RULESETS[A.ruleset].name)+
    ' · turn '+(A.turn-1)+' · seed '+A.seed+(last&&last.objective.why?' · '+esc(last.objective.why):'')+'</p>'+
    '<div class="arn-btns"><button type="button" class="sr-btn sr-btn--primary" data-act="same">Restart (same seed)</button><button type="button" class="sr-btn" data-act="new">Restart (new seed)</button>'+
    '<button type="button" class="sr-btn" data-act="dump">Dump metrics</button><button type="button" class="sr-btn sr-btn--ghost" data-act="picker">Back to picker</button></div></div>';
}
byId('arEnd').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  panelAct(b.dataset.act);
});
function backToTitle(){location.hash='';location.reload();}

/* ---------- the designer panel ---------- */
function rowHtml(g,i,item){
  const id='arP_'+g+'_'+i;
  if(item.type==='toggle')return '<div class="arn-row arn-row--toggle"><input type="checkbox" id="'+id+'" data-g="'+g+'" data-i="'+i+'"'+(item.get()?' checked':'')+'><label for="'+id+'">'+esc(item.label)+'</label></div>';
  return '<div class="arn-row"><label for="'+id+'">'+esc(item.label)+'</label><output>'+fmt(item.get(),item.step)+'</output>'+
    '<input type="range" id="'+id+'" data-g="'+g+'" data-i="'+i+'" min="'+item.min+'" max="'+item.max+'" step="'+item.step+'" value="'+item.get()+'"></div>';
}
function fmt(v,step){return step&&step<1?(+v).toFixed(step<0.1?2:step<1?1:0).replace(/\.?0+$/,m=>m.includes('.')?'':m):String(v);}
let PANEL={};
function globalGroup(){
  return [
    {key:'EXEC_LEN',label:'Exec length (s)',min:EXEC_LEN_MIN,max:EXEC_LEN_MAX,step:1,get:()=>EXEC_LEN,set:v=>{EXEC_LEN=v;}},
    {key:'SIM_SPEED',label:'Sim speed (×)',min:SIM_SPEED_MIN,max:SIM_SPEED_MAX,step:0.25,get:()=>SIM_SPEED,set:v=>{SIM_SPEED=v;savePrefs();}},
  ];
}
function buildPanel(){
  PANEL={global:globalGroup(),rules:A.mod&&A.mod.panelGroup?A.mod.panelGroup():[]};
  let h='<div class="arn-grp"><div class="arn-grp__head">Run</div><div class="arn-btns">'+
    '<button type="button" class="sr-btn sr-btn--primary" data-act="exec" id="arExec">Execute</button>'+
    '<button type="button" class="sr-btn" data-act="same">Restart (same seed)</button><button type="button" class="sr-btn" data-act="new">Restart (new seed)</button>'+
    '<button type="button" class="sr-btn" data-act="picker">Back to picker</button><button type="button" class="sr-btn" data-act="dump">Dump metrics</button>'+
    '<button type="button" class="sr-btn sr-btn--ghost" data-act="title">Back to title</button></div></div>';
  h+='<div class="arn-grp"><div class="arn-grp__head">Arena</div>'+PANEL.global.map((it,i)=>rowHtml('global',i,it)).join('')+'</div>';
  if(PANEL.rules.length)h+='<div class="arn-grp"><div class="arn-grp__head">'+esc(A.mod.name)+'</div>'+PANEL.rules.map((it,i)=>rowHtml('rules',i,it)).join('')+'</div>';
  h+='<div class="arn-grp"><div class="arn-grp__head">Read-outs</div><div class="arn-readout" id="arReadout"></div></div>';
  byId('arPanelBody').innerHTML=h;
  syncReadout();
}
byId('arPanelBody').addEventListener('input',ev=>{
  const el=ev.target,g=el.dataset.g;if(!g)return;
  const item=PANEL[g][+el.dataset.i];
  const v=item.type==='toggle'?el.checked:+el.value;
  item.set(v);
  const out=el.parentElement.querySelector('output');if(out)out.textContent=fmt(v,item.step);
  syncAll();
});
byId('arPanelBody').addEventListener('click',ev=>{const b=ev.target.closest('button[data-act]');if(b)panelAct(b.dataset.act);});
byId('arPanelToggle').addEventListener('click',()=>{
  const p=byId('arPanel');p.classList.toggle('is-collapsed');
  byId('arPanelToggle').setAttribute('aria-expanded',String(!p.classList.contains('is-collapsed')));
  setTimeout(fitCanvas,0);
});
function panelAct(a){
  if(a==='exec')beginExec();
  else if(a==='same')restart(true);
  else if(a==='new')restart(false);
  else if(a==='picker')showPicker();
  else if(a==='dump')dumpMetrics();
  else if(a==='title')backToTitle();
}
function dumpMetrics(){const s=JSON.stringify(A.metrics);try{console.log('ARENA_METRICS_DUMP '+s);}catch(e){}addFloater(cam.x,cam.y,'METRICS DUMPED TO CONSOLE',C.psi);return s;}
function savePrefs(){try{localStorage.setItem(PREFS_KEY,JSON.stringify({SIM_SPEED}));}catch(e){}}
function loadPrefs(){try{const p=JSON.parse(localStorage.getItem(PREFS_KEY)||'null');if(p&&p.SIM_SPEED)SIM_SPEED=Math.max(SIM_SPEED_MIN,Math.min(SIM_SPEED_MAX,+p.SIM_SPEED));}catch(e){}}

/* ---------- top bar, orders strip, read-outs ---------- */
function syncTop(){
  byId('arTitle').textContent=A.scen?A.scen.title:'Arena';
  byId('arSub').textContent=(RULESETS[A.ruleset]?RULESETS[A.ruleset].name:'')+(A.scen?' · seed '+A.seed:'');
  const ph=byId('arPhase');ph.dataset.phase=A.phase;
  ph.textContent=A.phase==='PLAN'?'Planning':A.phase==='EXEC'?'Executing':A.phase==='OVER'?'Over':'Pick';
  byId('arTurn').textContent=A.scen?'Turn '+A.turn+(A.phase==='EXEC'?' · '+A.execT.toFixed(1)+'s / '+EXEC_LEN+'s':''):'';
  byId('arObj').textContent=objText();
  const ex=byId('arExec');if(ex)ex.disabled=A.phase!=='PLAN';
  byId('arExecTop').hidden=!A.scen;byId('arExecTop').disabled=A.phase!=='PLAN';
}
function syncHud(){
  const el=byId('arOrders');
  el.innerHTML=(A.mod&&A.phase!=='PICK'&&A.mod.hud)?A.mod.hud():'';
  syncReadout();
}
byId('arOrders').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!A.mod||!A.mod.hudAction)return;
  A.mod.hudAction(b.dataset.act,b);
  syncHud();
});
function syncReadout(){
  const el=byId('arReadout');if(!el)return;
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
  try{A.mod.draw(ctx,now);}catch(e){console.error(e);}
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
  cam.z*=Math.exp(-ev.deltaY*0.0015);clampCam();
  const after=toWorld(p.px,p.py);cam.x+=before.x-after.x;cam.y+=before.y-after.y;clampCam();
},{passive:false});
addEventListener('keydown',ev=>{
  if(SR.active!=='arena'||!A.mod)return;
  if(ev.target&&/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName))return;
  if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();beginExec();}
  else if(A.mod.key_&&A.mod.key_(ev)){ev.preventDefault();syncHud();}
});
byId('arExecTop').addEventListener('click',()=>beginExec());
byId('arFit').addEventListener('click',()=>camFit());

/* ---------- the scene ---------- */
function enter(){
  loadPrefs();
  fitCanvas();
  showPicker();
}
function exit(){}
SR.register('arena',{enter,exit,frame});

/* ---------- DBGarena: always on, the Arena is a test environment ---------- */
function stateHash(){
  const s=A.mod?A.mod.stateHash():'';
  let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16);
}
window.DBGarena={A,RULESETS,ARENA_SCENARIOS,PRESETS,get phase(){return A.phase;},get sim(){return A.mod&&A.mod.dbg;},get mod(){return A.mod;},
  get metrics(){return A.metrics;},get ruleset(){return A.ruleset;},
  fn:{load,restart,beginExec,runExecSync,finishExec,stepTick,showPicker,dumpMetrics,stateHash,resolveCast,rockLayout,checkObjective,
    setSeed(n){A.seed=n>>>0;},
    addScenario(s){ARENA_SCENARIOS.push(s);if(A.phase==='PICK')renderPicker();return s;},
    chooseRuleset,
    setExecLen(v){EXEC_LEN=v;},setSimSpeed(v){SIM_SPEED=v;},
    TICK_:()=>TICK,EXEC_LEN_:()=>EXEC_LEN,SIM_SPEED_:()=>SIM_SPEED,
    toWorld,cam_:()=>cam,
    toClient(x,y){const r=cv.getBoundingClientRect();return {x:r.left+(x-cam.x)*cam.z+cssW/2,y:r.top+(y-cam.y)*cam.z+cssH/2};}}};
})();
