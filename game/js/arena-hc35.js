'use strict';
/* =====================================================================
   STAR REBELLION — ARENA TYPE 3.5: HIGH COMMAND HANDS OFF (arena-hc35.js)
   docs/ARENA-HC35-HANDOFF.md. The screens and the HUD: the opportunity board, the dossier, the four-step briefing
   with the plan view, the hands-off mission HUD and the debrief. The mission itself plays on High Command's renderer
   (arena-hc.js) in its 'hc35' mode, with this file as its overlay; the sim is High Command's plus the 3.5 layer
   (sim-hc35.js). Nothing here touches the campaign.
   ===================================================================== */
(function(){
const HC=window.SR_ARENA_HC,API=HC.api,SIM=window.SIMHC,L35=window.SIMHC35,SA=window.SR_ART;
const TH=SR.theme,C=TH.C,esc=API.esc,byId=API.byId,FX=window.SR_SPACE_FX;
const A=API.A,cam=API.cam;
const fmtClock=API.fmtClock;
const STAGE=byId('hcStage');
const ROOT=document.createElement('div');ROOT.id='arHc35';ROOT.hidden=true;STAGE.appendChild(ROOT);

/* ---------- state: the board → dossier → briefing → mission → debrief loop ---------- */
const B={screen:'off',oppId:'vulnerable_freighter',seed:1,mods:[],plan:null,step:1,intel:0,attempt:0,briefT:[0,0,0,0],stepAt:0,
  pickAsset:null,drag:null,hover:null,metrics:[],planAgain:false,banner:null};
const opp=()=>L35.OPPORTUNITIES[B.oppId];
const newSeed=()=>((B.seed*2654435761+12345)>>>0)%1000000;
const PANEL_W=440;   // the briefing panel's width, px (the plan view fits the room right of it)

/* =====================================================================
   Opening and closing (arena.js's picker calls these)
   ===================================================================== */
function open(){
  HC.open({mode:'hc35',overlay:OV});
  ROOT.hidden=false;
  showBoard(true);
}
function close(){
  ROOT.hidden=true;B.screen='off';L35.detach();B.pick=null;B.choose=null;B.abortArm=false;
  const ti=byId('hcCmds').querySelector('.hc-cmds__title');if(ti)ti.textContent='Commands';   // High Command's own bar again
}
function home(){showBoard(false);}

/* =====================================================================
   The board (§7.2): one opportunity card from your Source
   ===================================================================== */
function showBoard(fresh){
  L35.detach();API.buildPanel();
  if(fresh||!B.mods.length){B.seed=fresh?(Date.now()%999983)+1:B.seed||1;rollAttempt();}   // a fresh board: a fresh seed, fresh modifiers
  B.screen='board';A.phase='PICK';
  render();API.syncHud(true);
}
function rollAttempt(){B.mods=L35.rollMods(opp(),B.seed);B.intel=L35.TUNE.INTEL_START.get();B.plan=null;B.step=1;B.briefT=[0,0,0,0];}
const TONE_TAG={good:'sr-tag--good',warn:'sr-tag--warn',info:'sr-tag--info'};
function modTags(cls){return B.mods.filter(L35.known).map(m=>'<span class="sr-tag '+TONE_TAG[L35.MODS[m.k].tone]+(cls?' '+cls:'')+'" title="'+esc(L35.MODS[m.k].line)+'">'+esc(L35.MODS[m.k].name)+'</span>').join('');}
function boardHtml(){
  const O=opp();
  return '<div class="h35-scrim"><div class="h35-board"><div class="h35-board__head"><h2 class="sr-display">Opportunities</h2><span class="h35-sub">Your Sources · seed '+B.seed+'</span></div>'+
    '<div class="sr-card sr-card--friend h35-opp"><div class="h35-opp__src"><canvas class="h35-portrait" width="96" height="96" data-portrait="cass"></canvas><span>'+esc(O.source.name)+'</span></div>'+
    '<div class="h35-opp__main"><div class="sr-card__top"><span class="h35-opp__title">'+esc(O.title)+'</span><span class="sr-tag sr-tag--info">'+esc(O.typeLabel)+'</span></div>'+
    '<div class="sr-card__body">'+esc(O.lead)+'</div><div class="sr-card__meta">'+modTags()+'</div>'+
    '<div class="sr-card__acts"><button type="button" class="sr-btn sr-btn--primary" data-act="dossier">Plan mission</button>'+
    '<button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="newopp">New opportunity</button></div></div></div>'+
    '<div class="h35-fine"><button type="button" class="sr-btn sr-btn--sm" data-act="rulesets">Change ruleset</button> Nothing here touches your campaign. '+
    '<button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="title">Back to title</button></div></div></div>';
}

/* =====================================================================
   The dossier (§7.2): the target large, what the Source knows, Dig deeper
   ===================================================================== */
function dossierHtml(){
  const O=opp(),kn=B.mods.filter(L35.known);
  let pips='';for(let i=0;i<L35.TUNE.INTEL_START.get();i++)pips+='<i class="'+(i<B.intel?'is-on':'')+'"></i>';
  const hidden=B.mods.some(m=>!L35.known(m));
  return '<div class="h35-scrim"><div class="sr-window h35-dossier"><div class="sr-window__head"><div class="sr-window__title">Dossier · '+esc(O.title)+'</div>'+
    '<button type="button" class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost" data-act="board" aria-label="Back">✕</button></div>'+
    '<div class="sr-window__body h35-dossier__body"><canvas class="h35-target" width="560" height="260" data-target="1"></canvas>'+
    '<div class="h35-dossier__txt"><div class="h35-label">Target</div><div class="h35-dossier__name">'+esc(O.target.label)+' · '+esc(O.target.name)+'</div>'+
    '<div class="h35-label">What '+esc(O.source.name)+' knows</div>'+(kn.length?kn.map(m=>'<div class="h35-mod"><span class="sr-tag '+TONE_TAG[L35.MODS[m.k].tone]+'">'+esc(L35.MODS[m.k].name)+'</span><span>'+esc(L35.MODS[m.k].line)+'</span></div>').join(''):'<div class="h35-none">Nothing out of the ordinary.</div>')+
    '<div class="h35-rel">'+esc(O.source.reliability)+'</div>'+
    '<div class="h35-dig"><button type="button" class="sr-btn sr-btn--sm" data-act="dig"'+(B.intel>0&&hidden?'':' disabled')+'>Dig deeper</button><span class="h35-intel" title="Intel">'+pips+'</span>'+
    '<span class="h35-fine2">'+(hidden?(B.intel>0?'Spend 1 Intel to turn up something Cass missed.':'No Intel left.'):'Nothing more to find.')+'</span></div></div></div>'+
    '<div class="sr-window__foot"><span class="sr-spacer"></span><button type="button" class="sr-btn sr-btn--primary" data-act="brief">Plan mission</button></div></div></div>';
}
function dig(){
  const hid=B.mods.filter(m=>!L35.known(m));if(!hid.length||B.intel<=0)return;
  const r=L35.mulberry(B.seed*31+B.intel*7),m=hid[Math.floor(r()*hid.length)];m.dug=true;B.intel--;render();
}

/* =====================================================================
   The briefing (§4, §7.2): four steps, the map in plan view on the right
   ===================================================================== */
const STEPS=['Objective','Optionals & rules','Wings & assets','The plan'];
function enterBrief(){
  if(!B.plan)B.plan=L35.defaultPlan(opp());
  B.screen='brief';B.stepAt=performance.now();
  buildPlanView();
  render();API.syncHud(true);
}
/* the plan view: the real renderer on the built scenario at t = 0, paused; your ships hidden (their markers stand in) */
function buildPlanView(){
  L35.detach();L35.attach();
  const scn=L35.compile(opp(),B.mods,B.plan,B.seed);
  API.loadScenario(scn,B.seed);L35.begin();
  API.setSpeed(0);fitPlan();
}
function zoneBox(){
  const Zn=SIM.zone,L=L35.L,pts=[{x:Zn.x0,y:Zn.y0},{x:Zn.x1,y:Zn.y1}];
  if(L){pts.push({x:L.planet.x,y:L.planet.y-L.planet.r*0.4});}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  return {x0,y0,x1,y1};
}
function fitPlan(){
  const b=zoneBox(),left=B.screen==='brief'?PANEL_W+20:0,w=Math.max(200,API.cssW-left-20),h=Math.max(200,API.cssH-90);
  const z=Math.min(w/(b.x1-b.x0),h/(b.y1-b.y0))*0.96;
  cam.z=z;cam.x=(b.x0+b.x1)/2-(left/2)/z;cam.y=(b.y0+b.y1)/2+10/z;A.camHeld=true;A.follow=false;
}
/* the mission's opening view: your wings and the freighter, in the room right of the HUD's left column */
function fitLive(){
  const S=SIM.S,pts=S.ships.filter(s=>s.alive&&(s.faction==='reb'&&!s.struct||s.id==='fl400'));if(!pts.length){fitPlan();return;}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  const pad=2500,left=360,w=Math.max(200,API.cssW-left-40),h=Math.max(200,API.cssH-220);
  const z=Math.max(API.fitZoom(),Math.min(0.32,Math.min(w/(x1-x0+pad*2),h/(y1-y0+pad*2))));
  cam.z=z;cam.x=(x0+x1)/2-(left/2)/z;cam.y=(y0+y1)/2;A.camHeld=true;A.follow=false;
}
const W35=id=>L35.WINGS35.find(w=>w.id===id);
const toWorld=p=>{const Zn=SIM.zone,k=L35.L?L35.L.k:2;return {x:p.x*k+Zn.x0,y:p.y*k+Zn.y0};};
const toLayout=p=>{const Zn=SIM.zone,k=L35.L?L35.L.k:2;return {x:(p.x-Zn.x0)/k,y:(p.y-Zn.y0)/k};};
function stepPips(){
  return '<div class="h35-steps">'+STEPS.map((n,i)=>'<button type="button" class="h35-step'+(i+1===B.step?' is-on':i+1<B.step?' is-done':'')+'" data-step="'+(i+1)+'"><b>'+(i+1)+'</b>'+esc(n)+'</button>').join('')+'</div>';
}
function checklist(){
  const P=B.plan,rows=[];
  for(const n of L35.needsMet(P,B.mods))rows.push(n);
  const strike=L35.WINGS35.filter(w=>P.wings[w.id].role==='strike');
  rows.push({text:'At least one wing jumps in',ok:strike.length>0});
  const ringed=strike.filter(w=>inRing(P.wings[w.id].jumpIn));
  rows.push({text:'Jump-ins outside their sensor rings',ok:!ringed.length,warn:true,why:ringed.length?ringed.map(w=>w.name).join(', '):''});   // a warning, not a block
  return rows;
}
function checkHtml(){
  return '<div class="h35-ready"><div class="h35-label">Readiness</div>'+checklist().map(r=>'<div class="sr-check'+(r.ok?'':' is-no')+'"><span class="sr-check__box">'+(r.ok?'✓':'')+'</span>'+esc(r.text)+(r.why?'<span class="sr-check__why">'+esc(r.why)+'</span>':'')+'</div>').join('')+'</div>';
}
const ready=()=>checklist().every(r=>r.ok||r.warn);
function briefHtml(){
  const P=B.plan;
  let body='';
  if(B.step===1)body=step1();
  else if(B.step===2)body=step2();
  else if(B.step===3)body=step3();
  else body=step4();
  const last=B.step===4,ok=ready();
  return '<div class="h35-brief"><div class="h35-brief__head"><span class="h35-brief__title">'+esc(opp().title)+'</span>'+
    '<button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="dossier">Dossier</button></div>'+stepPips()+
    '<div class="h35-brief__body">'+body+'</div>'+checkHtml()+'</div>'+
    '<div class="h35-next">'+(B.step>1?'<button type="button" class="sr-btn" data-act="prev">Back</button>':'')+
    (last?'<button type="button" class="sr-btn sr-btn--primary" data-act="launch"'+(ok?'':' aria-disabled="true"')+' title="'+(ok?'Launch the mission':esc(checklist().filter(r=>!r.ok).map(r=>r.text).join(' · ')))+'">Launch</button>':
      '<button type="button" class="sr-btn sr-btn--primary" data-act="next">Next</button>')+'</div>';
}
/* step 1: the primary objective, under its family */
function step1(){
  const P=B.plan,fams={};
  for(const k of L35.PRIMARY_KEYS){const o=L35.PRIMARIES[k];(fams[o.family]=fams[o.family]||[]).push(k);}
  let h='<p class="h35-hint">Pick what this mission is for. Its needs gate Launch, not the pick: build the force after.</p>';
  for(const f in fams){
    h+='<div class="h35-label">'+esc(f)+'</div>';
    for(const k of fams[f]){const o=L35.PRIMARIES[k],pk=P.primary===k;
      const needs=pk?L35.needsMet(P,B.mods):o.needs.map(n=>({text:L35.NEED_TEXT[n],ok:null}));
      h+='<button type="button" class="sr-card h35-obj'+(pk?' is-picked':'')+'" data-primary="'+k+'"><div class="sr-card__top"><span class="sr-card__title">'+esc(o.name)+'</span>'+conflictTags(k)+'</div>'+
        '<div class="sr-card__body">'+esc(o.wins)+'</div>'+(needs.length?needs.map(n=>'<div class="sr-check h35-need'+(n.ok===false?' is-no':'')+'"><span class="sr-check__box">'+(n.ok?'✓':'')+'</span>'+esc(n.text)+'</div>').join(''):'<div class="h35-noneed">No needs</div>')+'</button>';}
  }
  h+='<div class="h35-label">Later</div>'+L35.LATER_PRIMARIES.map(n=>'<div class="sr-card is-locked h35-obj"><div class="sr-card__top"><span class="sr-card__title">'+esc(n)+'</span><span class="sr-tag">Not in this demo</span></div></div>').join('');
  return h;
}
function conflictTags(k){
  const P=B.plan,on=new Set([P.primary].concat(P.optionals.map(o=>o.k),P.roes));
  let h='';
  for(const [a,b] of L35.CONFLICTS){const other=a===k?b:b===k?a:null;if(other&&on.has(other)&&on.has(k))h+='<span class="sr-tag sr-tag--warn">Clashes: '+esc(nameOf(other))+'</span>';}
  for(const p in L35.SUGGESTS)if(L35.SUGGESTS[p].includes(k)&&P.primary===p&&!on.has(k))h+='<span class="sr-tag sr-tag--info">Suggested</span>';
  return h;
}
const nameOf=k=>(L35.PRIMARIES[k]||L35.OPTIONALS[k]||L35.ROES[k]||{name:k}).name;
/* step 2: optional objectives (up to OPT_MAX) and the rules of engagement */
const OPT_MAX=2;
function step2(){
  const P=B.plan;
  let h='<p class="h35-hint">Optional objectives (up to '+OPT_MAX+'): your pilots try for them, but the primary comes first.</p>';
  for(const k in L35.OPTIONALS){const o=L35.OPTIONALS[k],on=P.optionals.find(x=>x.k===k);
    h+='<button type="button" class="sr-card h35-obj h35-tog'+(on?' is-picked':'')+'" data-opt="'+k+'"'+(!on&&P.optionals.length>=OPT_MAX?' aria-disabled="true"':'')+'><div class="sr-card__top"><span class="sr-card__title">'+esc(o.name)+'</span>'+conflictTags(k)+'</div><div class="sr-card__body">'+esc(o.line)+'</div>'+
      (on&&o.needs?'<div class="h35-pickrow" data-stop="1">'+pilotPick(k,on.ship,o.needs)+'</div>':'')+'</button>';}
  h+='<div class="h35-label">Rules of engagement</div>';
  for(const k in L35.ROES){const o=L35.ROES[k],on=P.roes.includes(k);
    h+='<button type="button" class="sr-card h35-obj h35-tog'+(on?' is-picked':'')+'" data-roe="'+k+'"><div class="sr-card__top"><span class="sr-card__title">'+esc(o.name)+'</span>'+conflictTags(k)+'</div><div class="sr-card__body">'+esc(o.line)+'</div>'+
      (on&&k==='preservation'?'<div class="h35-pickrow" data-stop="1"><label>Withdraw under <b>'+Math.round(P.presHull*100)+'%</b> hull <input type="range" min="0.1" max="0.6" step="0.05" value="'+P.presHull+'" data-pres="1"></label></div>':'')+'</button>';}
  return h;
}
function pilotPick(k,cur,need){
  const ships=[];for(const w of L35.WINGS35)for(const sd of w.ships){const p=sd.pilot||{};if(need==='green'&&!(p.preset==='green'))continue;ships.push(sd);}
  return '<select class="h35-sel" data-optship="'+k+'"><option value="">Name a pilot…</option>'+ships.map(sd=>'<option value="'+sd.id+'"'+(cur===sd.id?' selected':'')+'>'+esc(sd.name)+' ('+esc(clsName(sd.cls))+')</option>').join('')+'</select>';
}
const clsName=c=>c==='cross'?'Cross':c==='talon'?'Talon':c==='brickbat'?'Brickbat':c;
/* step 3: wings (Strike / Reserve / Stay home), Brickbat loadouts, assets */
function step3(){
  const P=B.plan;
  let h='<p class="h35-hint">Who goes, and with what. Reserves wait at home until you call them.</p>';
  for(const w of L35.WINGS35){const pw=P.wings[w.id];
    h+='<div class="hc-card h35-wing is-'+pw.role+'"><div class="h35-wing__head"><canvas class="h35-portrait h35-portrait--sm" width="64" height="64" data-portrait="'+w.ships[0].id+'"></canvas>'+
      '<span class="h35-wing__name">'+esc(w.name)+'</span><span class="sr-btngroup h35-role">'+['strike','reserve','home'].map(r=>'<button type="button" class="sr-btn sr-btn--sm" data-role="'+r+'" data-wing="'+w.id+'" aria-pressed="'+(pw.role===r)+'">'+(r==='strike'?'Strike':r==='reserve'?'Reserve':'Stay home')+'</button>').join('')+'</span></div>'+
      '<div class="h35-ships">'+w.ships.map(sd=>shipCell(w,sd,pw)).join('')+'</div>'+
      '<div class="sr-quote h35-take"><span class="sr-quote__who">'+esc(w.ships[0].name)+'</span>'+esc(leaderTake(w))+'</div></div>';}
  h+='<div class="h35-label">Assets ('+P.assets.length+' of '+L35.ASSET_SLOTS+')</div><div class="h35-slots">';
  for(let i=0;i<L35.ASSET_SLOTS;i++){const k=P.assets[i];
    h+=k?'<div class="sr-slot is-filled"><span class="h35-aglyph">'+assetGlyph(k)+'</span><span><span class="sr-slot__name">'+esc(L35.ASSETS[k].name)+'</span><span class="sr-slot__label">'+esc(L35.ASSETS[k].power?'Unlocks '+L35.ASSETS[k].power:'Passive: shorter delays')+'</span></span><button type="button" class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost sr-slot__clear" data-unasset="'+i+'" aria-label="Remove">✕</button></div>':
      '<button type="button" class="sr-slot'+(B.pickAsset===i?' is-target':'')+'" data-slot="'+i+'"><span class="sr-slot__label">Empty slot · assign an asset</span></button>';}
  h+='</div>';
  if(B.pickAsset!=null){h+='<div class="h35-assets">';for(const k in L35.ASSETS){if(P.assets.includes(k)||(k==='nuke'&&P.assets.includes('ram'))||(k==='ram'&&P.assets.includes('nuke')))continue;
    h+='<button type="button" class="sr-choice" data-asset="'+k+'"><span class="h35-aglyph">'+assetGlyph(k)+'</span><span><b>'+esc(L35.ASSETS[k].name)+'</b><br><small>'+esc(L35.ASSETS[k].line)+'</small></span></button>';}
    h+='</div>';}
  return h;
}
function shipCell(w,sd,pw){
  const lo=sd.cls==='brickbat'?pw.loadout[sd.id]||'bombs':null,p=sd.pilot||{};
  return '<div class="h35-ship"><canvas class="h35-shippic" width="120" height="72" data-ship="'+sd.cls+'" data-lo="'+(lo||'')+'"></canvas><span class="h35-ship__name">'+esc(sd.name)+'</span>'+
    '<span class="h35-ship__sub">'+esc(clsName(sd.cls))+' · '+esc(pilotWord(sd))+'</span>'+
    (lo?'<span class="sr-btngroup h35-lo">'+['bombs','pods','board'].map(k=>'<button type="button" class="sr-btn sr-btn--sm" data-lo="'+k+'" aria-pressed="'+(lo===k)+'" data-ship="'+sd.id+'" data-wing="'+w.id+'" title="'+esc(L35.LOADOUTS[k].line)+'">'+esc(L35.LOADOUTS[k].name)+'</button>').join('')+'</span>':'')+'</div>';
}
function pilotWord(sd){const p=sd.pilot||{};if(p.id){const r=SRDB.pilots[p.id];return r?'L'+r.level:'';}return (p.preset||'regular');}
/* the leader's one-line take (§4.4): the critique rules, rewritten live as the plan changes */
function leaderTake(w){return L35.critique(B.plan,w.id,B.mods,{inRing,unreachable});}
/* can this wing reach its Executive target before the freighter jumps, at cruise? */
function unreachable(wid){
  const pw=B.plan.wings[wid],L=L35.L,ex=pw.exec;if(!L||!ex||['hold','ambush','withdraw','defend','escort'].includes(ex.k))return false;
  const m=toWorld(pw.jumpIn),v=560;let acc=0;   // a fighter's cruise, world units a second (a rough read)
  for(let i=1;i<L.lane.length;i++){const a=L.lane[i-1],b=L.lane[i],d=Math.hypot(b.x-a.x,b.y-a.y);
    for(let u=0;u<=d;u+=300){const x=a.x+(b.x-a.x)*u/d,y=a.y+(b.y-a.y)*u/d;if(Math.hypot(x-m.x,y-m.y)/v<=(acc+u)/L.cruise)return false;}acc+=d;}
  return true;
}
/* step 4: each wing's Executive Order and Secondary; jump-in and asset markers on the map */
function step4(){
  const P=B.plan;
  let h='<p class="h35-hint">Drag each wing\'s gold diamond to its jump-in point. A diamond turns blue inside an escort\'s sensor ring.</p>';
  for(const w of L35.WINGS35){const pw=P.wings[w.id];if(pw.role==='home')continue;
    h+='<div class="hc-card h35-wing"><div class="h35-wing__head"><span class="h35-wing__name">'+esc(w.name)+'</span><span class="h35-wing__sub">'+esc(w.ships.map(s=>clsName(s.cls)).join(' · '))+(pw.role==='reserve'?' · RESERVE':'')+'</span></div>'+
      '<div class="h35-ord"><span class="h35-ord__lbl">EXEC</span>'+orderSel(w,'exec',pw.exec)+'</div>'+
      '<div class="h35-ord"><span class="h35-ord__lbl">SECOND</span>'+trigSel(w,pw.second)+(pw.second?orderSel(w,'second',pw.second):'')+'</div>'+
      '<div class="sr-quote h35-take"><span class="sr-quote__who">'+esc(w.ships[0].name)+'</span>'+esc(leaderTake(w))+'</div></div>';}
  return h;
}
function orderSel(w,slot,o){
  const k=o&&o.k||'';
  let h='<select class="h35-sel" data-ord="'+slot+'" data-wing="'+w.id+'">'+L35.ORDER35_KEYS.map(x=>'<option value="'+x+'"'+(x===k?' selected':'')+'>'+esc(L35.ORDERS35[x].name)+'</option>').join('')+'</select>';
  const O=L35.ORDERS35[k];
  if(O&&O.target==='sub')h+='<select class="h35-sel" data-arg="'+slot+'" data-wing="'+w.id+'">'+O.subs.map(s=>'<option value="'+s+'"'+(o.arg===s?' selected':'')+'>'+s+'</option>').join('')+'</select>';
  else if(O&&O.target==='what')h+='<select class="h35-sel" data-arg="'+slot+'" data-wing="'+w.id+'">'+O.whats.map(s=>'<option value="'+s+'"'+(o.arg===s?' selected':'')+'>'+s+'</option>').join('')+'</select>';
  else if(O&&O.target==='wing')h+='<select class="h35-sel" data-arg="'+slot+'" data-wing="'+w.id+'">'+L35.WINGS35.filter(x=>x.id!==w.id).map(x=>'<option value="'+x.id+'"'+(o.arg===x.id?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>';
  return h;
}
function trigSel(w,sec){
  return '<select class="h35-sel" data-trig="1" data-wing="'+w.id+'"><option value="">None</option>'+Object.keys(L35.TRIGGERS).map(k=>'<option value="'+k+'"'+(sec&&sec.trig===k?' selected':'')+'>if '+esc(L35.TRIGGERS[k].toLowerCase())+'</option>').join('')+'</select>';
}
/* an order needs an argument: fill the first one */
function fixArg(o,w){const O=L35.ORDERS35[o.k];if(!O)return;
  if(O.target==='sub'&&!O.subs.includes(o.arg))o.arg=O.subs[0];
  else if(O.target==='what'&&!O.whats.includes(o.arg))o.arg=O.whats[0];
  else if(O.target==='wing'&&!L35.WINGS35.some(x=>x.id===o.arg&&x.id!==w.id))o.arg=L35.WINGS35.find(x=>x.id!==w.id).id;
  else if(!O.target||O.target==='freighter'||O.target==='prize'||O.target==='point')o.arg=o.arg&&typeof o.arg==='object'?o.arg:null;}
/* inside an escort's detection ring at the start (the freighter's escort at t = 0) */
function inRing(ji){
  if(!ji||!SIM.S)return false;const p=toWorld(ji);
  return SIM.S.ships.some(e=>e.role35==='escort'&&e.alive&&Math.hypot(e.x-p.x,e.y-p.y)<L35.TUNE.DETECT_WARP_R.get());
}
function assetGlyph(k){return '<svg class="hc-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(ASSET_PATH[k]||'M4 4h16v16H4z')+'"/></svg>';}
const ASSET_PATH=(()=>{
  const g={ram:'M4 12h12l4-4v8l-4-4M8 8l-4 4 4 4',nuke:'M12 3l2 6h6l-5 4 2 7-5-4-5 4 2-7-5-4h6z',fireship:'M12 3c3 4 5 6 5 10a5 5 0 01-10 0c0-2 1-3 2-5 0 2 1 3 2 3 0-3-1-5 1-8z',
    mines:'M12 4v3M12 17v3M4 12h3M17 12h3M12 9a3 3 0 110 6 3 3 0 010-6z',buoy:'M12 3v5M8 8h8l-2 10h-4zM5 21h14',relay:'M12 21V9M8 5a6 6 0 018 0M5 2a10 10 0 0114 0M10 9h4',
    tug:'M3 14h14l4-4M7 14v-4h6v4M17 10l-2-3',spoof:'M4 6h16v12H4zM8 10h8M8 14h5',pirates:'M12 4a7 7 0 017 7c0 3-2 4-2 6H7c0-2-2-3-2-6a7 7 0 017-7zM9 11h1M14 11h1'};
  return g;
})();

/* =====================================================================
   The mission HUD (§7.4): objectives and ROE (read-only), the phase plate; the rest is High Command's
   ===================================================================== */
function objHtml(){
  const S=SIM.S,L=L35.L;if(!S||!L||!L.plan.primary)return '';
  const P=L.plan,o=S.objectives[0];
  let h='<div class="hc-obj__head">Objectives</div><ul class="hc-obj__list">';
  h+='<li class="hc-o is-'+o.state+'"><span class="hc-o__mark"></span><span class="hc-o__txt">'+esc(L35.PRIMARIES[P.primary].name)+'</span><span class="sr-tag sr-tag--action h35-prim">PRIMARY</span></li>';
  for(const x of L.opt)h+='<li class="hc-o is-'+x.state+'"><span class="hc-o__mark"></span><span class="hc-o__txt">'+esc(L35.OPTIONALS[x.k].name)+(x.ship?' · '+esc((SIM.fn.byId(x.ship)||{name:x.ship}).name):'')+'</span></li>';
  return h+'</ul>';
}
function rulesHtml(){
  const L=L35.L;if(!L)return '';
  const r=L.plan.roes;
  return '<div class="hc-rules__head">Rules of engagement</div><div class="hc-rules__chips">'+(r.length?r.map(k=>'<span class="hc-rchip">'+esc(L35.ROES[k].name)+'</span>').join(''):'<span class="hc-rules__none">No rules</span>')+'</div>';
}
function clockHtml(){
  const S=SIM.S,L=L35.L;if(!S||!L)return '';
  const fr=SIM.fn.byId('fl400');
  let status,name,round,ph=L.phase;
  if(ph===1){status='UNDETECTED';name='PHASE 1 · ARRIVAL';round=fr&&fr.alive?'FREIGHTER JUMPS IN '+fmtClock(etaJump()):'';}
  else if(ph===2){status='ALERTED';name='PHASE 2 · ENGAGED';const D=L.distress;
    round=D&&!D.landed&&!D.cut?'DISTRESS '+Math.round(Math.min(1,(S.t-D.t0)/L35.N.DISTRESS_SECS)*100)+'%':L.responseAt!=null?'RESPONSE IN '+fmtClock(L.responseAt-S.t):
      L.spool!=null?'FREIGHTER SPOOLING':fr&&fr.alive&&!L.disabled&&!L.prize?'FREIGHTER JUMPS IN '+fmtClock(etaJump()):L.prize?'PRIZE HEADING HOME':L.disabled?'FREIGHTER DISABLED':'';}
  else {status='HEGEMONY ON SITE';name='PHASE 3 · RESPONSE';round='GET OUT';}
  return '<div class="sr-phase h35-phase" data-phase="'+(ph===1?'free':'fight')+'"'+(ph===3?' data-status="alert"':'')+'><span class="sr-phase__status" style="--s:'+(ph===1?'var(--sr-c-good)':ph===2?'var(--sr-hazard)':'var(--sr-heg)')+'"><span class="sr-phase__text">'+status+'</span></span>'+
    '<span class="sr-phase__name">'+name+'</span><span class="sr-phase__round">'+esc(round)+'</span></div>'+
    '<div class="h35-platefoot">'+(ph===1?'<div class="h35-detect" title="Detection"><b style="width:'+Math.round(L.detect)+'%"></b></div>':'')+
    '<button type="button" class="hc-tbtn h35-plantog'+(B.planOverlay?' is-on':'')+'" data-act="plan" aria-pressed="'+!!B.planOverlay+'" title="The plan overlay (P)">PLAN</button></div>';
}
/* seconds until the freighter reaches its jump point and spools, at its current pace */
function etaJump(){
  const L=L35.L,fr=SIMHC.fn.byId('fl400');if(!L||!fr)return 0;
  if(L.spool!=null)return Math.max(0,L35.TUNE.JUMP_SECS.get()-(SIM.S.t-L.spool));
  let d=0,p=fr;for(let i=L.leg;i<L.lane.length;i++){d+=Math.hypot(L.lane[i].x-p.x,L.lane[i].y-p.y);p=L.lane[i];}
  const v=Math.max(1,Math.hypot(fr.vx,fr.vy));return d/v+L35.TUNE.JUMP_SECS.get();
}
/* the pilot panel, read-only: no doctrine buttons, no responses */
function pilotBody(s){
  const w=SIM.fn.wingOf(s.wing),mor=SIM.moraleOf(s),P=s.pilot;
  let h='<div class="hc-pilot__head"><span class="hc-pilot__name">'+esc(s.name)+'</span><span class="hc-pilot__sub">'+esc((P.preset||'')+(P.preset?' · ':'')+'L'+P.level+' · '+(w?w.name:'')+(w&&w.leader===s.id?' lead':''))+'</span>'+
    '<span class="hc-mor" data-m="'+mor+'">'+mor+'</span><button type="button" class="hc-x" data-act="close" aria-label="Close">✕</button></div>';
  if(!s.alive)return h+'<div class="hc-pilot__line">'+(s.jumped?'Jumped out.':'Down.')+'</div>';
  const bar=(l,v,m,c)=>{const k=m>0?Math.max(0,Math.min(1,v/m)):0;return '<div class="hc-pbar '+c+'"><span>'+l+'</span><i><b style="width:'+Math.round(k*100)+'%"></b></i><em>'+(m>0?Math.max(0,Math.round(v))+'/'+m:'—')+'</em></div>';};
  h+='<div class="hc-pilot__bars">'+bar('Hull',s.hull,s.maxHull,'is-hull')+bar('Armour',s.arm,s.maxArm,'is-arm')+bar('Shields',SIM.fn.totalShield(s),SIM.fn.maxShield(s),'is-shd')+'</div>';
  const b=s.beh||{};
  if(B.screen==='live'&&s.faction==='reb'&&s.wing&&L35.L){const why=L35.powerWhy('name');
    h+='<div class="hc-pilot__acts"><button type="button" class="sr-btn sr-btn--sm" data-act="callname"'+(why?' aria-disabled="true" title="'+esc(why)+'"':'')+'>Call by name · '+L35.N.C_NAME+' CP</button></div>';}
  h+='<div class="hc-pilot__line"><b>'+esc(String(b.kind||'').toUpperCase())+'</b>'+(s.load35?' · '+esc(L35.LOADOUTS[s.load35].name)+(s.load35==='bombs'?' ('+(s.bombs||0)+' left)':''):'')+'<br><q>'+esc(s.assess||'')+'</q></div>';
  return h;
}

/* =====================================================================
   Launch, the end, the debrief stub (P1; the cause chain comes with P6)
   ===================================================================== */
function launch(){
  if(!ready())return;
  B.briefT[B.step-1]+=(performance.now()-B.stepAt)/1000;
  B.attempt++;B.screen='live';B.pick=null;B.choose=null;B.abortArm=false;
  L35.detach();L35.attach();
  const scn=L35.compile(opp(),B.mods,B.plan,B.seed);
  API.loadScenario(scn,B.seed);L35.begin();
  // the strike wings warp in at their jump-in points
  if(FX)for(const s of SIM.S.ships)if(s.faction==='reb'&&!s.struct)FX.event('warpIn',{ship:API.shipView(s,API.ipos(s),API.iconBoost())});
  fitLive();API.setSpeed(2);
  B.planUser=false;B.planOverlay=L35.L.phase===1;B.lastPhase=L35.L.phase;banner('PHASE '+B.lastPhase,B.lastPhase===1?'Arrival':'They know we\'re here');
  render();API.syncHud(true);
}
function onOver(){
  B.screen='debrief';
  const L=L35.L;if(L)for(const m of L.mods)if(m.found){const b=B.mods.find(x=>x.k===m.k&&!!x.fake===!!m.fake);if(b)b.found=true;}   // what you learned stays learned (Plan again)
  record();
  render();
}
function debriefHtml(){
  const S=SIM.S,L=L35.L,o=S.over||{},P=L?L.plan:B.plan;
  const prim=S.objectives[0],won=prim&&prim.state==='done';
  const stamp=o.outcome==='aborted'?['ABORTED','sr-stamp--foe']:won?['JOB DONE','']:['FAILED','sr-stamp--bad'];
  const mine=S.ships.filter(s=>s.faction==='reb'&&!s.struct);
  const lost=mine.filter(s=>!s.alive&&!s.jumped);
  const ph=L?L.phaseT:[0];
  const phs=[0,1,2].map(i=>ph[i]==null?null:((ph[i+1]!=null?ph[i+1]:S.t)-ph[i])).map((v,i)=>v==null?'':'<span class="sr-tag sr-tag--info">Phase '+(i+1)+' · '+fmtClock(v)+'</span>').join('');
  return '<div class="h35-scrim"><div class="sr-window sr-window--lg h35-debrief"><div class="sr-window__head"><div class="sr-window__title">Debrief · '+esc(opp().title)+'</div><span class="sr-stamp '+stamp[1]+'">'+stamp[0]+'</span></div>'+
    '<div class="sr-window__body"><div class="h35-label">Objectives</div>'+
    '<div class="sr-check'+(won?'':' is-no')+'"><span class="sr-check__box">'+(won?'✓':'')+'</span>'+esc(L35.PRIMARIES[P.primary].name)+' (primary)</div>'+
    '<div class="h35-label">Losses</div><div>'+(lost.length?lost.map(s=>esc(s.name)).join(', '):'None')+'</div>'+
    '<div class="h35-label">Time in each phase</div><div class="sr-card__meta">'+phs+'</div>'+
    '<div class="h35-label">What decided it</div><div class="h35-why">'+whyLines().map(l=>'<p>'+esc(l)+'</p>').join('')+'</div></div>'+
    '<div class="sr-window__foot"><button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="rulesets">Back to rulesets</button><button type="button" class="sr-btn" data-act="newopp">New opportunity</button>'+
    '<span class="sr-spacer"></span><button type="button" class="sr-btn sr-btn--primary" data-act="again">Plan again</button></div></div></div>';
}
function whyLines(){
  const S=SIM.S,L=L35.L,out=[];if(!L)return out;
  if(L.escaped)out.push('The freighter jumped at '+fmtClock(SIM.fn.byId('fl400').jumpT)+'.');
  if(L.alarmWhy==='jumpin')out.push('A wing dropped in inside their sensor ring. Phase 1 lasted '+Math.round(L.phaseT[1]||0)+' s.');
  if(L.abort)out.push('You aborted at '+fmtClock(L.abortT)+'.');
  if(L.exposure)out.push('The Firebrand Broadcast went out in the clear: the Hegemony heard your voice (Exposure).');
  if(L.burned)out.push('The Agent aboard acted for you, and may be burned.');
  if(L.pirated)out.push('The pirates left with '+L.pirated+' container'+(L.pirated>1?'s':'')+'.');
  if(L.powLog.length)out.push('Powers used: '+L.powLog.map(p=>(L35.POWERS35[p.k]||{name:'Insist'}).name+' (Phase '+p.phase+')').join(', ')+'.'+(L.cpLost?' '+L.cpLost+' CP went unspent.':''));
  return out.length?out:['(The cause chain comes with phase P6 of the build.)'];
}
function planAgain(){
  // the same seed and modifiers, every modifier found in play now known, the last plan kept
  B.planAgain=true;
  B.step=4;enterBrief();
}
function record(){
  const S=SIM.S,L=L35.L;if(!S||!L)return null;
  const rec={ruleset:'hc35',seed:B.seed,attempt:B.attempt,primary:L.plan.primary,outcome:S.over?S.over.outcome:'abandoned',t:+S.t.toFixed(2),phaseT:L.phaseT.slice(),
    powers:L.powLog.slice(),cpUnspent:(L.cpLost||0)+L.cp,commsOff:!!L35.N.COMMS_OFF};
  B.metrics.push(rec);A.metrics.push(rec);
  try{console.log('ARENA_METRICS '+JSON.stringify(rec));}catch(e){}
  return rec;
}

/* =====================================================================
   The world layer: the plan view (lane, gravity window, planet, rings, markers) and the FL-400
   ===================================================================== */
const shipHidden=s=>B.screen==='brief'&&s.faction==='reb'&&!s.struct;   // in the plan view the markers stand in for your wings
function drawBody(c,s,p,z,boost,view){
  if(shipHidden(s))return true;
  if(s.prop35){drawProp(c,s,p,z,boost);return true;}
  if(s.cls==='fl400'){drawFreighter(c,s,p,z,boost,view);return true;}
  if(s.cls==='brickbat'){drawBrickbat(c,s,p,z,boost,view);return true;}
  return false;
}
const freightScale=boost=>(0.7+0.09*5)*1.6*0.85*1.35*boost;   // a size-5 hull's scale; sized:true does the rest (SR_ART sizeK)
/* the FL-400 straight through SR_ART.ship every frame (its blown modules and turret aim can't come from a cached
   sprite, C-76): lost containers, the turrets on their targets, firing, the damage spots; powered down once disabled */
function drawFreighter(c,s,p,z,boost,view){
  const L=L35.L,t=performance.now()/1000,sc=freightScale(boost);
  if(FX&&view&&s.trail.length>1&&!(L&&L.disabled))FX.drawTrail(c,Object.assign(API.shipView(s,p,boost),{art:'gafreighter'}),view);
  const subs=L?L.subs:[],pd=subs.filter(x=>x.k==='pd'&&x.hp>0&&x.aim),fire=pd.some(x=>SIM.S.t-x.shotT<0.3);
  SA.ship(c,'gafreighter',p.x,p.y,p.h,sc,t,{livery:'heg',sized:true,damage:Math.max(0,1-Math.max(0,s.hull)/s.maxHull),
    lost:L?L35.fn.cargoLost():[],aimAt:pd.length?[pd[0].aim.x,pd[0].aim.y]:null,fire,off:!!(L&&(L.disabled||L.surrender))});
}
/* a Brickbat in the rebel livery its loadout calls for, its racks showing the bombs left */
function drawBrickbat(c,s,p,z,boost,view){
  const sc=(0.7+0.09*s.row.size)*1.6*0.85*1.35*boost,att=s.load35==='pods'?['cargopod']:s.load35==='board'?[]:['bombrack'];
  SA.ship(c,'brickbat',p.x,p.y,p.h,sc,performance.now()/1000,{livery:'rebel',loadout:{attach:att},bombs:s.bombs!=null?Math.ceil(s.bombs/2):3,damage:Math.max(0,1-Math.max(0,s.hull)/s.maxHull)});
}
function drawWorld(c,view,o){
  const S=SIM.S,L=L35.L;if(!S||!L)return;
  const z=o.z;
  const plan=B.screen==='brief';
  // the planet: a dim cel disc, a thin rim light, its pull zone in faint dotted steel
  const P=L.planet;
  c.save();c.beginPath();c.arc(P.x,P.y,P.r,0,6.283);c.fillStyle='#141a33';c.fill();c.lineWidth=4/z;c.strokeStyle=C.ink;c.stroke();
  c.beginPath();c.arc(P.x,P.y,P.r-6/z,Math.PI*1.1,Math.PI*1.65);c.lineWidth=3/z;c.strokeStyle=TH.rgba(C.steel,0.35);c.stroke();
  c.setLineDash([3/z,10/z]);c.lineWidth=1.6/z;c.strokeStyle=TH.rgba(C.steel,0.35);c.beginPath();c.arc(P.x,P.y,P.pull,0,6.283);c.stroke();c.setLineDash([]);c.restore();
  drawTarget(c,z,view,o);
  if(!plan)drawPowers(c,z,view,o);
  if(plan||B.planOverlay)drawLane(c,z);
  if(!plan&&B.planOverlay)drawPlanLive(c,z);
  else{const fj=L.fjump;API.ring(c,fj.x,fj.y,SIM.fn.JUMP_R_()*1.4,TH.rgba(C.heg,0.6),z,2,[10,8]);API.label(c,fj.x,fj.y-SIM.fn.JUMP_R_()*1.4-12/z,'FREIGHTER JUMP POINT',C.hegHi,z,11);}
  // escort detection rings, faint foe blue (their awareness)
  if(L.phase===1)for(const e of S.ships)if(e.alive&&e.role35==='escort'){c.save();c.beginPath();c.arc(e.x,e.y,L35.TUNE.DETECT_R.get(),0,6.283);c.fillStyle=TH.rgba(C.heg,0.05);c.fill();c.setLineDash([6/z,8/z]);c.lineWidth=1.4/z;c.strokeStyle=TH.rgba(C.heg,0.45);c.stroke();c.restore();}
  if(plan){
    // the response edge: a foe-blue dashed band
    const Zn=SIM.zone,e=L.opp.response.edge,g=420;c.save();c.fillStyle=TH.rgba(C.heg,0.07);c.strokeStyle=TH.rgba(C.heg,0.5);c.setLineDash([12/z,10/z]);c.lineWidth=1.6/z;
    if(e==='N'){c.fillRect(Zn.x0,Zn.y0,Zn.x1-Zn.x0,g);c.strokeRect(Zn.x0,Zn.y0,Zn.x1-Zn.x0,g);}else if(e==='S'){c.fillRect(Zn.x0,Zn.y1-g,Zn.x1-Zn.x0,g);}
    c.restore();API.label(c,(Zn.x0+Zn.x1)/2,(e==='N'?Zn.y0+g/2:Zn.y1-g/2)+5/z,'RESPONSE',C.hegHi,z,11);
    // the relay, a cyan antenna
    const rl=L.relay;if(rl&&!B.plan.assets.includes('relay')){drawGlyphAt(c,rl.x,rl.y,'relay',C.shield,z);API.label(c,rl.x,rl.y+30/z,'HAVEN RELAY',C.shield,z,10);}
    // the placed assets (§4.3): each where you drag it, with its reach
    for(const k of placedAssets()){const m=toWorld(L35.assetAt(B.plan,k)),hot=B.hover==='a:'+k||B.drag&&B.drag.id===k,col=k==='relay'?C.shield:C.gold;
      const reach={fireship:L35.N.FIRE_R,mines:L35.N.MINE_RING,buoy:L35.N.INTERDICT_R,nuke:L35.N.NUKE_R}[k];
      if(reach)API.ring(c,m.x,m.y,reach,TH.rgba(k==='buoy'||k==='nuke'?C.hazard:col,0.5),z,1.4,[6,7]);
      c.save();c.beginPath();c.arc(m.x,m.y,(hot?17:15)/z,0,6.283);c.fillStyle=TH.rgba(C.ink,0.85);c.fill();c.lineWidth=2/z;c.strokeStyle=col;c.stroke();c.restore();
      drawGlyphAt(c,m.x,m.y,k,col,z*1.25);API.label(c,m.x,m.y+30/z,L35.ASSETS[k].name.toUpperCase()+(k==='ram'||k==='nuke'?' · STAGING':''),col,z,10,'Bungee');}
    // jump-in markers and plan lines
    for(const w of L35.WINGS35){const pw=B.plan.wings[w.id];if(pw.role==='home')continue;
      const m=toWorld(pw.jumpIn),bad=inRing(pw.jumpIn),col=bad?C.heg:C.gold;
      const tg=planTarget(pw.exec,w);if(tg)API.dashLine(c,m,tg,TH.rgba(C.gold,0.8),z,1.6,[8,7]);
      if(pw.second&&tg){const t2=planTarget(pw.second,w)||tg;API.dashLine(c,{x:(m.x+tg.x)/2,y:(m.y+tg.y)/2},t2,TH.rgba(C.shield,0.8),z,1.3,[2,6]);
        API.label(c,(m.x+tg.x)/2,(m.y+tg.y)/2-10/z,'if '+L35.TRIGGERS[pw.second.trig].toLowerCase(),C.shield,z,10);}
      diamond(c,m.x,m.y,(B.hover===w.id||B.drag&&B.drag.id===w.id?13:11)/z,col,pw.role==='reserve');
      // a short dashed arrival cone toward its target
      if(tg){const a=Math.atan2(tg.y-m.y,tg.x-m.x),r=60/z;c.save();c.setLineDash([4/z,4/z]);c.lineWidth=1.4/z;c.strokeStyle=TH.rgba(col,0.8);c.beginPath();c.moveTo(m.x+Math.cos(a-0.4)*r,m.y+Math.sin(a-0.4)*r);c.lineTo(m.x,m.y);c.lineTo(m.x+Math.cos(a+0.4)*r,m.y+Math.sin(a+0.4)*r);c.stroke();c.restore();}
      API.label(c,m.x,m.y-20/z,w.name.toUpperCase()+(pw.role==='reserve'?' · RESERVE':''),col,z,12,'Bungee');}
  }
}
/* the plan overlay (§7.4): each wing's Executive line from where it is now, so a wing pulled off plan leaves its line */
function drawPlanLive(c,z){
  const S=SIM.S,L=L35.L,fr=SIM.fn.byId('fl400');
  for(const w of S.wings){const ls=SIM.fn.wingShips(w);if(!ls.length)continue;const ex=L.exec[w.id];if(!ex)continue;
    const at={x:ls.reduce((a,s)=>a+API.ipos(s).x,0)/ls.length,y:ls.reduce((a,s)=>a+API.ipos(s).y,0)/ls.length};
    let tg=null;
    if(ex.k==='defend'){const ow=SIM.fn.wingOf(ex.arg),os=ow?SIM.fn.wingShips(ow):[];if(os.length)tg=API.ipos(os[0]);}
    else if(ex.k==='withdraw')tg=S.points.ourjump;
    else if(ex.k==='hold'||ex.k==='ambush')tg=ex.arg&&ex.arg.x!=null?toWorld(ex.arg):w.rally;
    else if(ex.k==='suppress'&&ex.arg==='escorts'){const e=S.ships.find(x=>x.alive&&x.role35==='escort');tg=e?API.ipos(e):null;}
    else if(fr&&fr.alive)tg=API.ipos(fr);
    if(!tg)continue;
    API.dashLine(c,at,tg,TH.rgba(L.off[w.id]?C.hazard:C.gold,0.75),z,1.6,[8,7]);
    API.label(c,at.x,at.y-26/z,w.name.toUpperCase()+' · '+L35.ORDERS35[ex.k].name.toUpperCase(),L.off[w.id]?C.hazard:C.gold,z,10,'Bungee');}
}
/* the freighter as a target (P2): bombs, the distress arc, docking, hauling, its death, its fall */
const deathBang=new Set();
function drawTarget(c,z,view,o){
  const S=SIM.S,L=L35.L,fr=SIM.fn.byId('fl400');if(!L)return;
  const now=performance.now()/1000,boost=o.boost;
  if(FX&&view)for(const b of L.bombs)FX.drawBolt(c,b,view);
  if(fr&&fr.alive){
    const F=L35.fn;
    // the comms array while the distress sends: a foe-blue progress arc round the bridge, a ring every 2 s
    const D=L.distress;
    if(D&&!D.landed&&!D.cut){const cm=L.subs.find(x=>x.k==='comms'),p=F.subWorld(fr,cm),k=Math.min(1,(S.t-D.t0)/L35.N.DISTRESS_SECS),r=46*boost;
      c.save();c.lineWidth=4/z;c.strokeStyle=TH.rgba(C.heg,0.4);c.beginPath();c.arc(p.x,p.y,r,0,6.283);c.stroke();c.strokeStyle=C.heg;c.beginPath();c.arc(p.x,p.y,r,-Math.PI/2,-Math.PI/2+k*6.283);c.stroke();
      const u=((S.t-D.t0)%2)/2;c.globalAlpha=1-u;c.lineWidth=2/z;c.beginPath();c.arc(p.x,p.y,r+u*180*boost,0,6.283);c.stroke();c.restore();}
    // docked Brickbats: boarders get the boarding link, pod ships the tether with a container sliding along it
    for(const s of S.ships){if(!s.alive||!s.dock35)continue;const sp=API.ipos(s),d=F.dockPoint(fr,s);
      if(s.load35==='board'&&FX&&view)FX.drawBoardLink(c,sp,{x:fr.x+(d.x-fr.x)*0.45,y:fr.y+(d.y-fr.y)*0.45},L.board,view);
      else{const cm=L.subs.find(x=>x.k==='cargo'&&x.hp>0&&!x.taken&&!x.hazard),q=cm?F.subWorld(fr,cm):fr;c.save();c.lineWidth=3/z;c.strokeStyle=TH.rgba(C.steel,0.85);c.beginPath();c.moveTo(sp.x,sp.y);c.lineTo(q.x,q.y);c.stroke();
        const u=((s.haulT||0)/L35.N.HAUL_SECS);c.fillStyle='#8e96a2';c.strokeStyle=C.ink;c.lineWidth=1.5/z;const bx=q.x+(sp.x-q.x)*u,by=q.y+(sp.y-q.y)*u,bw=14*boost;c.fillRect(bx-bw/2,by-bw/3,bw,bw*0.66);c.strokeRect(bx-bw/2,by-bw/3,bw,bw*0.66);c.restore();}}
    // disabled: sparks at the engine block now and then; falling into the planet: a hazard heat rim on its leading edge
    if(L.disabled&&FX&&Math.floor(now*3)!==L._spark){L._spark=Math.floor(now*3);const e=L.subs.find(x=>x.k==='engines'),p=F.subWorld(fr,e);FX.event('boltHit',{x:p.x,y:p.y,surface:'hull',dir:fr.h+Math.PI,r:26*boost});}
    const pd=Math.hypot(fr.x-L.planet.x,fr.y-L.planet.y);
    if((L.disabled||L.surrender)&&pd<L.planet.r+4000){const a=Math.atan2(L.planet.y-fr.y,L.planet.x-fr.x),k=1-Math.max(0,(pd-L.planet.r)/4000),r=130*boost;
      c.save();c.globalAlpha=0.35+0.5*k;c.lineWidth=6/z;c.strokeStyle=C.hazard;c.beginPath();c.arc(fr.x,fr.y,r,a-0.9,a+0.9);c.stroke();c.restore();}
  }
  // the capital death: SR_ART.capitalDeath over its deathMs, the camera shaken and a burst at each of its bangs
  if(L.deadT!=null&&L.deadPose){
    const D=SA.SHIPS.gafreighter,dur=(D.deathMs||4200)/1000,k=(S.t-L.deadT)/dur,P=L.deadPose,sc=freightScale(boost);
    if(k>=0&&k<=1){SA.capitalDeath(c,'gafreighter',P.x,P.y,P.h,sc,k,now,{livery:'heg',sized:true,lost:P.lost});
      const kk=SA.sizeK('gafreighter'),ca=Math.cos(P.h),sa=Math.sin(P.h);
      SA.deathBangs('gafreighter').forEach((b,i)=>{const key=L.deadT+':'+i;if(k<b.k||deathBang.has(key))return;deathBang.add(key);
        const x=P.x+(b.x*ca-b.y*sa)*sc*kk,y=P.y+(b.x*sa+b.y*ca)*sc*kk;
        if(FX)FX.event(b.big?'explode':'missileHit',b.big?{x,y,size:10,struct:true,iconBoost:boost}:{x,y,size:b.size,iconBoost:boost});});}
  }
}
/* the lane: steel dashes from the freighter to its jump point, time ticks every 30 s of cruise, the gravity window */
function drawLane(c,z){
  const L=L35.L,fr=SIM.fn.byId('fl400');if(!L)return;
  const pts=L.lane,v=L.cruise||1;
  c.save();c.setLineDash([14/z,10/z]);c.lineWidth=2.4/z;c.strokeStyle=TH.rgba(C.steel,0.55);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);c.restore();
  // walk the lane: ticks, and the stretch inside the pull zone
  let acc=0,next=30,win=null;const step=40;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],d=Math.hypot(b.x-a.x,b.y-a.y);
    for(let u=0;u<d;u+=step){const x=a.x+(b.x-a.x)*u/d,y=a.y+(b.y-a.y)*u/d,t=(acc+u)/v;
      const inP=Math.hypot(x-L.planet.x,y-L.planet.y)<L.planet.pull;
      if(inP){if(!win)win={t0:t,pts:[]};win.t1=t;win.pts.push({x,y});}
      if(t>=next){c.save();c.beginPath();c.arc(x,y,4/z,0,6.283);c.fillStyle=C.steel;c.fill();c.restore();API.label(c,x,y-12/z,fmtClock(next),C.steel,z,10,'Bungee');next+=30;}}
    acc+=d;}
  if(win&&win.pts.length>1){c.save();c.lineWidth=7/z;c.strokeStyle=TH.rgba(C.steel,0.5);c.beginPath();win.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();
    const m=win.pts[Math.floor(win.pts.length/2)];API.label(c,m.x,m.y+26/z,'GRAVITY WINDOW '+fmtClock(win.t0)+'–'+fmtClock(win.t1),C.steel,z,11,'Bungee');}
  const fj=L.fjump;API.ring(c,fj.x,fj.y,SIM.fn.JUMP_R_()*1.4,TH.rgba(C.heg,0.7),z,2,[10,8]);API.label(c,fj.x,fj.y-SIM.fn.JUMP_R_()*1.4-12/z,'FREIGHTER JUMP POINT',C.hegHi,z,11);
}
function planTarget(o,w){
  if(!o)return null;const S=SIM.S;
  if(o.k==='defend'){const ow=B.plan.wings[o.arg];return ow?toWorld(ow.jumpIn):null;}
  if(o.k==='withdraw')return S.points.ourjump;
  if(o.k==='hold'||o.k==='ambush'){return o.arg&&o.arg.x!=null?toWorld(o.arg):null;}
  const fr=SIM.fn.byId('fl400');if(!fr)return null;
  // where the freighter will be when the wing gets there: its lane at the time of arrival (a rough read)
  const L=L35.L,m=toWorld(B.plan.wings[w.id].jumpIn);let best=null,bd=1e18,acc=0;
  for(let i=1;i<L.lane.length;i++){const a=L.lane[i-1],b=L.lane[i],d=Math.hypot(b.x-a.x,b.y-a.y);
    for(let u=0;u<=d;u+=200){const x=a.x+(b.x-a.x)*u/d,y=a.y+(b.y-a.y)*u/d,tf=(acc+u)/L.cruise,tw=Math.hypot(x-m.x,y-m.y)/560,e=Math.abs(tf-tw);if(e<bd){bd=e;best={x,y};}}acc+=d;}
  return best;
}
function diamond(c,x,y,r,col,hollow){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.beginPath();c.rect(-r*0.7,-r*0.7,r*1.4,r*1.4);c.fillStyle=hollow?TH.rgba(col,0.2):col;c.fill();c.lineWidth=r*0.25;c.strokeStyle=C.ink;c.stroke();c.restore();}
function drawGlyphAt(c,x,y,k,col,z){const p=new Path2D(pPath(k)),s=1.4/z;c.save();c.translate(x-12*s,y-12*s);c.scale(s,s);c.lineWidth=3.6;c.lineCap='round';c.strokeStyle=C.ink;c.stroke(p);c.lineWidth=2;c.strokeStyle=col;c.stroke(p);c.restore();}
function drawScreen(c,view,o){
  const S=SIM.S,L=L35.L;if(!S||!L||B.screen!=='live')return;
  // the Interdictor: a "NO JUMP" chip on every ship inside it
  const I=L35.interdictOn();
  if(I)for(const s of S.ships){if(!s.alive||s.struct||Math.hypot(s.x-I.x,s.y-I.y)>=L35.N.INTERDICT_R)continue;const q=API.toScreen(API.ipos(s).x,API.ipos(s).y);
    c.save();c.font='800 10px "Exo 2",sans-serif';c.textAlign='center';const w=c.measureText('NO JUMP').width+10;c.fillStyle=C.ink;c.fillRect(q.x-w/2,q.y+20,w,15);c.strokeStyle=C.hazard;c.lineWidth=1.5;c.strokeRect(q.x-w/2,q.y+20,w,15);c.fillStyle=C.hazard;c.fillText('NO JUMP',q.x,q.y+31);c.restore();}
  // detection reads over each escort: a foe-blue "?" while it's rising
  if(L.phase===1&&L.detect>2)for(const e of S.ships)if(e.alive&&e.role35==='escort'){
    const near=S.ships.some(r=>r.alive&&r.faction==='reb'&&!r.struct&&Math.hypot(r.x-e.x,r.y-e.y)<L35.TUNE.DETECT_R.get());if(!near)continue;
    const p=API.ipos(e),q=API.toScreen(p.x,p.y);c.save();c.font='400 18px Bungee,"Exo 2",sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle=C.ink;c.strokeText('?',q.x,q.y-26);c.fillStyle=C.hegHi;c.fillText('?',q.x,q.y-26);c.restore();}
  if(L.phase>=2&&S.t-L.phaseT[1]<1)for(const e of S.ships)if(e.alive&&e.role35==='escort'){const p=API.ipos(e),q=API.toScreen(p.x,p.y);c.save();c.font='400 20px Bungee,"Exo 2",sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle=C.ink;c.strokeText('!',q.x,q.y-26);c.fillStyle=C.heg;c.fillText('!',q.x,q.y-26);c.restore();}
}

/* =====================================================================
   Input: plan-view markers, keys
   ===================================================================== */
const placedAssets=()=>B.plan?B.plan.assets.filter(k=>L35.ASSETS[k]&&L35.ASSETS[k].placed):[];
function markerAt(p){
  if(B.screen!=='brief'||B.step!==4)return null;
  let best=null,bd=18/cam.z;
  for(const w of L35.WINGS35){const pw=B.plan.wings[w.id];if(pw.role==='home')continue;const m=toWorld(pw.jumpIn),d=Math.hypot(m.x-p.x,m.y-p.y);if(d<bd){bd=d;best={type:'jumpIn',id:w.id};}}
  for(const k of placedAssets()){const m=toWorld(L35.assetAt(B.plan,k)),d=Math.hypot(m.x-p.x,m.y-p.y);if(d<bd){bd=d;best={type:'asset',id:k};}}
  return best;
}
function pointer(kind,p,ev){
  if(B.screen==='brief'){
    if(kind==='hover'){const m=markerAt(p),h=m?(m.type==='asset'?'a:':'')+m.id:null;if(h!==B.hover){B.hover=h;STAGE.style.cursor=h?'grab':'';}return false;}
    if(kind==='down'){if(ev.button!==0)return false;const m=markerAt(p);if(!m)return false;B.drag=m;STAGE.style.cursor='grabbing';return true;}
    if(kind==='move'&&B.drag){if(B.drag.type==='asset')B.plan.assetAt[B.drag.id]=toLayout({x:p.x,y:p.y});else B.plan.wings[B.drag.id].jumpIn=toLayout({x:p.x,y:p.y});return true;}
    if(kind==='up'&&B.drag){B.drag=null;STAGE.style.cursor='';render();return true;}
  }
  return false;
}
function onKey(ev){
  if(B.screen==='off')return false;
  const k=ev.key;
  if(B.screen==='live'&&(k==='p'||k==='P')){ev.preventDefault();B.planOverlay=!B.planOverlay;B.planUser=true;API.syncHud(true);return true;}
  if(B.screen==='live'&&k==='Escape'&&(B.pick||B.choose||B.abortArm)){ev.preventDefault();B.pick=null;B.choose=null;B.abortArm=false;API.syncHud(true);return true;}
  if(B.screen==='live'&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){const i=PKEYS.indexOf(k.toLowerCase());if(i>=0){const p=barPowers()[i];if(p){ev.preventDefault();startPower(p.k);return true;}}}
  if(B.screen==='board'||B.screen==='dossier'||B.screen==='debrief'||B.screen==='brief'){
    if(k==='Escape'&&B.screen==='dossier'){ev.preventDefault();showBoard(false);return true;}
    if(k==='Enter'&&B.screen==='board'){ev.preventDefault();B.screen='dossier';render();return true;}
    return /^[ 0-9]$/.test(k)||k==='Tab';   // the sim stays still while you plan: High Command's keys are off
  }
  return false;
}

/* =====================================================================
   The DOM: one render per state change; small canvases drawn after
   ===================================================================== */
function render(){
  let h='';
  if(B.screen==='board')h=boardHtml();
  else if(B.screen==='dossier')h=dossierHtml();
  else if(B.screen==='brief')h=briefHtml();
  else if(B.screen==='debrief')h=debriefHtml();
  if(B.banner&&performance.now()-B.banner.at<1400&&!API.fxReduced())h+='<div class="sr-banner"><span class="sr-banner__txt">'+esc(B.banner.txt)+'<span class="sr-banner__sub">'+esc(B.banner.sub)+'</span></span></div>';
  ROOT.innerHTML=h;ROOT.dataset.screen=B.screen;
  paintCanvases();
}
function banner(txt,sub){B.banner={txt,sub,at:performance.now()};setTimeout(()=>{if(B.banner&&performance.now()-B.banner.at>=1400){B.banner=null;if(B.screen==='live')render();}},1450);}
function paintCanvases(){
  for(const cv of ROOT.querySelectorAll('canvas[data-portrait]')){const g=cv.getContext('2d'),id=cv.dataset.portrait,r=cv.width/2;g.clearRect(0,0,cv.width,cv.height);
    const who=id==='cass'?SA.lookOf({id:'cass',name:'Cass',role:'Spy'}):SA.lookOf({id:id==='joss'?'joss':id,name:id,role:'Pilot'});
    try{SA.portrait(g,r,r,r-3,who,{t:0});}catch(e){}}
  for(const cv of ROOT.querySelectorAll('canvas[data-ship]')){const g=cv.getContext('2d'),cls=cv.dataset.ship,lo=cv.dataset.lo;g.clearRect(0,0,cv.width,cv.height);
    const art=SA.SHIP_FOR_GAME[cls]||cls,att=lo==='bombs'?['bombrack']:lo==='pods'?['cargopod']:lo==='board'?[]:null;
    try{SA.ship(g,art,cv.width/2,cv.height/2,-Math.PI/2*0+0,1.35,0,Object.assign({livery:'rebel',sized:true,still:true},att?{loadout:{attach:att}}:{}));}catch(e){}}
  paintTarget(0);
}
function paintTarget(t){
  const cv=ROOT.querySelector('canvas[data-target]');if(!cv)return;
  const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);
  g.fillStyle='#0b1022';g.fillRect(0,0,cv.width,cv.height);
  try{SA.ship(g,'gafreighter',cv.width/2,cv.height/2,-0.25+Math.sin(t*0.3)*0.25,2.5,t,{livery:'heg',sized:true});}catch(e){}
}
function tick(now){
  if(B.screen==='dossier'&&!API.fxReduced())paintTarget(now/1000);
}
byId('hcClock').addEventListener('click',ev=>{const b=ev.target.closest('[data-act="plan"]');if(!b||B.screen!=='live')return;B.planOverlay=!B.planOverlay;B.planUser=true;API.syncHud(true);});
ROOT.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b){return;}
  if(b.closest('[data-stop]')&&!b.dataset.act)return;
  const a=b.dataset.act;
  if(b.getAttribute('aria-disabled')==='true'){if(a==='launch')API.flash(b.title||'Not ready');return;}
  if(a==='dossier'){if(B.screen==='brief')B.briefT[B.step-1]+=(performance.now()-B.stepAt)/1000;B.screen='dossier';A.phase='PICK';L35.detach();render();API.syncHud(true);return;}
  if(a==='board'){showBoard(false);return;}
  if(a==='newopp'){B.seed=newSeed();rollAttempt();showBoard(false);return;}
  if(a==='dig'){dig();return;}
  if(a==='brief'){enterBrief();return;}
  if(a==='rulesets'){close();API.toRulesets();return;}
  if(a==='title'){API.backToTitle();return;}
  if(a==='next'||a==='prev'){B.briefT[B.step-1]+=(performance.now()-B.stepAt)/1000;B.stepAt=performance.now();B.step=Math.max(1,Math.min(4,B.step+(a==='next'?1:-1)));render();return;}
  if(a==='launch'){launch();return;}
  if(a==='again'){planAgain();return;}
  if(b.dataset.step){B.briefT[B.step-1]+=(performance.now()-B.stepAt)/1000;B.stepAt=performance.now();B.step=+b.dataset.step;render();return;}
  const P=B.plan;if(!P)return;
  if(b.dataset.primary){B.plan=L35.leaderPlan(b.dataset.primary,B.plan);render();return;}   // the leaders propose a plan; you edit from there
  if(b.dataset.opt){const k=b.dataset.opt,i=P.optionals.findIndex(x=>x.k===k);if(i>=0)P.optionals.splice(i,1);else if(P.optionals.length<OPT_MAX)P.optionals.push({k,ship:null});render();return;}
  if(b.dataset.roe){const k=b.dataset.roe,i=P.roes.indexOf(k);if(i>=0)P.roes.splice(i,1);else P.roes.push(k);render();return;}
  if(b.dataset.role){P.wings[b.dataset.wing].role=b.dataset.role;render();return;}
  if(b.dataset.lo){P.wings[b.dataset.wing].loadout[b.dataset.ship]=b.dataset.lo;render();return;}
  if(b.dataset.slot!=null){B.pickAsset=+b.dataset.slot;render();return;}
  if(b.dataset.unasset!=null){const k=P.assets.splice(+b.dataset.unasset,1)[0];delete P.assetAt[k];render();return;}
  if(b.dataset.asset){if(P.assets.length<L35.ASSET_SLOTS)P.assets.push(b.dataset.asset);B.pickAsset=null;render();return;}
});
ROOT.addEventListener('change',ev=>{
  const el=ev.target,P=B.plan;if(!P)return;
  if(el.dataset.ord){const pw=P.wings[el.dataset.wing],w=W35(el.dataset.wing);
    if(el.dataset.ord==='exec'){pw.exec={k:el.value,arg:pw.exec&&pw.exec.arg};fixArg(pw.exec,w);}else{pw.second=Object.assign(pw.second||{trig:'phase3'},{k:el.value});fixArg(pw.second,w);}render();return;}
  if(el.dataset.arg){const pw=P.wings[el.dataset.wing],o=el.dataset.arg==='exec'?pw.exec:pw.second;if(o)o.arg=el.value;render();return;}
  if(el.dataset.trig){const pw=P.wings[el.dataset.wing];if(!el.value)pw.second=null;else{pw.second=pw.second||{k:'withdraw',arg:null};pw.second.trig=el.value;}render();return;}
  if(el.dataset.optship){const o=P.optionals.find(x=>x.k===el.dataset.optship);if(o)o.ship=el.value||null;render();return;}
});
ROOT.addEventListener('input',ev=>{const el=ev.target;if(el.dataset.pres&&B.plan){B.plan.presHull=+el.value;const b=el.closest('label').querySelector('b');if(b)b.textContent=Math.round(B.plan.presHull*100)+'%';}});

/* =====================================================================
   P4: the powers bar (§7.4, High Command's skill icons), the comms queue above it, targeting, the CP pips
   ===================================================================== */
const PKEYS=['z','x','c','v','b','n','m',','];   // the powers, in bar order (Abort has none)
const PGLYPH={go:'M6 21V4M6 4h11l-2 4 2 4H6',broadcast:'M4 10v4h3l5 4V6L7 10zM16 9a4 4 0 010 6M19 6a8 8 0 010 12',name:'M12 4a4 4 0 110 8 4 4 0 010-8zM5 20c1-4 4-6 7-6s6 2 7 6',
  exec:'M5 5h14v14H5zM9 9h6M9 12h6M9 15h4',sleeper:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 110 6 3 3 0 010-6z'};
const pPath=g=>PGLYPH[g]||ASSET_PATH[g]||API.GLYPH[g]||'M4 4h16v16H4z';
const pSvg=(g,cls)=>'<svg class="hc-glyph'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+pPath(g)+'"/></svg>';
const barPowers=()=>L35.L?L35.powers().filter(p=>p.k!=='abort'):[];
function pickText(){
  const P=B.pick&&L35.POWERS35[B.pick.k];if(!P)return '';
  if(B.pick.stage==='focus')return 'Pick the target to focus · Esc to cancel';
  return (P.target==='mine'?'Pick one of your ships':P.target==='foe'?'Pick an enemy'+(B.pick.k==='mark'||B.pick.k==='ram'?' or a freighter subsystem':''):'Pick a target')+' · Esc to cancel';
}
function cmdsHtml(){
  const S=SIM.S,L=L35.L;if(!L||!S||B.screen!=='live')return '';
  let h='';
  if(B.pick)h+='<div class="hc-cmds__arm"><span class="sr-pill h35-pickpill">'+esc(pickText())+'</span><button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="cancelpick">Cancel</button></div>';
  if(B.choose)h+='<div class="hc-cmds__arm h35-choose">'+chooseHtml()+'<button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="cancelpick">Cancel</button></div>';
  const pb=L.pushback;
  if(pb&&S.t<pb.until)h+='<div class="hc-cmds__arm"><span>'+esc((SIM.fn.wingOf(pb.wid)||{name:pb.wid}).name)+': "We\'re nearly there, Base."</span><button type="button" class="sr-btn sr-btn--sm" data-act="insist"'+(L.cp<L35.N.C_INSIST?' aria-disabled="true"':'')+'>Insist · '+L35.N.C_INSIST+' CP</button></div>';
  // the comms queue: one slim row per transmission in flight; a delivered one flashes green, then drops out
  if(L.tx.length)h+='<div class="h35-txq">'+L.tx.map(tx=>{const k=tx.landed!=null?1:tx.delay>0?Math.min(1,(S.t-tx.t0)/tx.delay):1,left=Math.max(0,tx.at-S.t);
    return '<div class="h35-tx'+(tx.landed!=null?(tx.refused?' is-no':' is-in'):'')+'"><span class="h35-tx__to">→ '+esc(tx.label)+'</span><span class="h35-tx__what">'+esc(tx.what)+'</span><i><b style="width:'+Math.round(k*100)+'%"></b></i><em>'+(tx.landed!=null?(tx.refused?'refused':'in'):left.toFixed(1)+' s')+'</em></div>';}).join('')+'</div>';
  h+='<div class="hc-cmds__list">'+barPowers().map((p,i)=>pBtn(p,PKEYS[i])).join('')+'</div>';
  const ab=L35.powers().find(p=>p.k==='abort');
  if(ab)h+='<button type="button" class="hc-cmd hc-cmd--abort'+(B.abortArm?' is-armed':'')+'" data-p35="abort" data-tip="p35:abort"'+(ab.why?' aria-disabled="true" data-why="'+esc(ab.why)+'"':'')+' aria-label="Abort">'+pSvg('close','hc-cmd__glyph')+'<span class="hc-free">free</span><span class="hc-cmd__name">'+(B.abortArm?'Confirm abort':'Abort')+'</span></button>';
  return h;
}
function pBtn(p,key){
  const armed=(B.pick&&B.pick.k===p.k)||(B.choose&&B.choose.k===p.k);
  return '<button type="button" class="hc-cmd'+(armed?' is-armed':'')+'" data-p35="'+p.k+'" data-tip="p35:'+p.k+'"'+(p.why?' aria-disabled="true" data-why="'+esc(p.why)+'"':'')+' aria-label="'+esc(p.name)+'">'+
    pSvg(p.glyph,'hc-cmd__glyph')+(p.cost?'<span class="hc-cmd__cost" aria-label="'+p.cost+' CP"><i></i><b>'+p.cost+'</b></span>':'<span class="hc-free">free</span>')+
    '<span class="hc-cmd__name">'+esc(p.name)+'</span>'+(key?'<span class="h35-key">'+esc(key.toUpperCase())+'</span>':'')+'</button>';
}
/* the second step of a power: what to do (Call by Name, Wake the Sleeper), which wing and order (Change Executive), which reserve */
function chooseHtml(){
  const C=B.choose,L=L35.L,S=SIM.S,bt=(attr,txt,on)=>'<button type="button" class="sr-btn sr-btn--sm'+(on?' sr-btn--primary':'')+'" '+attr+'>'+esc(txt)+'</button>';
  if(C.k==='exec'){
    if(!C.args.wing)return '<span>Which wing?</span>'+S.wings.filter(w=>SIM.fn.wingShips(w).length).map(w=>bt('data-cwing="'+w.id+'"',w.name)).join('');
    const w=SIM.fn.wingOf(C.args.wing);
    if(!C.args.k)return '<span>'+esc(w.name)+':</span>'+L35.ORDER35_KEYS.map(k=>bt('data-corder="'+k+'"',L35.ORDERS35[k].name,L.exec[w.id]&&L.exec[w.id].k===k)).join('');
    const O=L35.ORDERS35[C.args.k],opts=O.target==='sub'?O.subs:O.target==='what'?O.whats:O.target==='wing'?S.wings.filter(x=>x.id!==w.id).map(x=>x.id):[];
    return '<span>'+esc(w.name)+' · '+esc(O.name)+':</span>'+opts.map(o=>bt('data-carg="'+o+'"',O.target==='wing'?SIM.fn.wingOf(o).name:o)).join('');
  }
  if(C.k==='reserve')return '<span>Which reserve?</span>'+L.X.reserves.filter(r=>!L.called[r.id]).map(r=>bt('data-cres="'+r.id+'"',r.name)).join('');
  const P=L35.POWERS35[C.k];
  return '<span>'+esc(C.args.ship?(SIM.fn.byId(C.args.ship)||{name:''}).name+':':P.name+':')+'</span>'+(P.choice||[]).map(a=>bt('data-cact="'+a+'"',L35.CHOICE_NAME[a])).join('');
}
function doUse(k,args){
  const r=L35.use(k,args);
  if(!r.ok)API.flash(r.why);
  B.pick=null;B.choose=null;B.abortArm=false;API.syncHud(true);return r;
}
function startPower(k){
  const L=L35.L,P=L35.POWERS35[k];if(!L||!P)return;
  const why=L35.powerWhy(k);if(why){API.flash(P.name+': '+why);return;}
  B.pick=null;B.choose=null;
  if(k==='abort'){if(!B.abortArm){B.abortArm=true;API.syncHud(true);return;}doUse('abort',{});return;}
  B.abortArm=false;
  if(k==='exec'){B.choose={k,args:{}};API.syncHud(true);return;}
  if(k==='reserve'){const left=L.X.reserves.filter(r=>!L.called[r.id]);if(left.length>1){B.choose={k,args:{}};API.syncHud(true);return;}doUse(k,{wing:left[0].id});return;}
  if(P.target==='none'){if(P.choice){B.choose={k,args:{}};API.syncHud(true);return;}doUse(k,{});return;}
  B.pick={k,stage:'target',args:{}};API.syncHud(true);
}
function cmdsClick(b){
  const C=B.choose,a=b.dataset.act;
  if(a==='cancelpick'){B.pick=null;B.choose=null;API.syncHud(true);return;}
  if(a==='insist'){if(b.getAttribute('aria-disabled')==='true'){API.flash('Not enough command points');return;}doUse('insist',{});return;}
  if(C&&b.dataset.cwing){C.args.wing=b.dataset.cwing;API.syncHud(true);return;}
  if(C&&b.dataset.corder){C.args.k=b.dataset.corder;const O=L35.ORDERS35[C.args.k];if(!['sub','what','wing'].includes(O.target)){doUse('exec',C.args);return;}API.syncHud(true);return;}
  if(C&&b.dataset.carg){C.args.arg=b.dataset.carg;doUse('exec',C.args);return;}
  if(C&&b.dataset.cres){doUse('reserve',{wing:b.dataset.cres});return;}
  if(C&&b.dataset.cact){C.args.act=b.dataset.cact;if(C.args.act==='focus'){B.pick={k:C.k,stage:'focus',args:C.args};B.choose=null;API.syncHud(true);return;}doUse(C.k,C.args);return;}
  const k=b.dataset.p35;if(!k)return;
  if(b.getAttribute('aria-disabled')==='true'){API.flash((L35.POWERS35[k]||{name:k}).name+': '+(b.dataset.why||'not now'));return;}
  if(B.pick&&B.pick.k===k||B.choose&&B.choose.k===k){B.pick=null;B.choose=null;API.syncHud(true);return;}
  startPower(k);
}
/* the freighter subsystem nearest a click on it (or null: the hull) */
function subAt(fr,p){
  const L=L35.L;let best=null,bd=Math.max(140,26/cam.z);
  for(const sb of L.subs){if(sb.hp<=0||(sb.k==='cargo'&&sb.taken))continue;const q=L35.fn.subWorld(fr,sb),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best=sb;}}
  return best?(best.k==='pd'?'turrets':best.k):null;
}
/* a click on the map while a power wants a target */
function mapClick(p,ev,ship){
  if(B.screen!=='live'||!B.pick)return false;
  const k=B.pick.k,P=L35.POWERS35[k],args=B.pick.args,stage=B.pick.stage;
  const want=stage==='focus'?'foe':P.target;
  if(want==='mine'){
    if(!ship||ship.faction!=='reb'||!ship.wing){API.flash('Pick one of your ships');return true;}
    args.ship=ship.id;if(P.choice){B.pick=null;B.choose={k,args};API.syncHud(true);return true;}doUse(k,args);return true;}
  if(want==='foe'){
    if(!ship||ship.faction==='reb'){API.flash('Pick an enemy');return true;}
    const sub=ship.id==='fl400'?subAt(ship,p):null;
    if(stage==='focus'){args.target=ship.id;args.sub=sub;doUse(k,args);return true;}
    args.id=ship.id;args.sub=sub;doUse(k,args);return true;}
  return true;
}
function tipFor(key){
  const [k,a]=String(key).split(':');if(k!=='p35')return null;
  const P=L35.POWERS35[a];if(!P)return null;const c=P.cost(),why=L35.L?L35.powerWhy(a):null,i=barPowers().findIndex(x=>x.k===a);
  return {name:P.name+' · '+(c?c+' CP':'free'),line:(typeof P.line==='function'?P.line():P.line)+(why?' Not now: '+why+'.':''),key:i>=0&&PKEYS[i]?PKEYS[i].toUpperCase():null};
}
/* the CP pips in the bar's title row, with when they refresh */
function syncCp(){
  const L=L35.L,el=byId('hcCp'),ti=byId('hcCmds').querySelector('.hc-cmds__title');
  if(ti&&ti.textContent!=='Powers')ti.textContent='Powers';
  if(!L||!el)return;
  const max=L35.N['CP'+L.phase];let ph='';for(let i=0;i<Math.max(max,L.cp);i++)ph+='<i class="'+(i<L.cp?'is-on':'')+'"></i>';
  const h='<span class="hc-cp__lbl">CP</span><span class="hc-cp__pips">'+ph+'</span><b>'+L.cp+' / '+max+'</b><span class="h35-cpnext">'+(L.phase<3?'refreshes at Phase '+(L.phase+1):'last phase')+'</span>';
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
}
/* the world reads for the powers and comms (§7.5): transmissions as cyan rings, arrivals' warnings, the props */
function drawPowers(c,z,view,o){
  const S=SIM.S,L=L35.L,now=performance.now()/1000;
  // each transmission: a thin cyan ring from the origin, reaching its recipient as it lands
  for(const tx of L.tx){if(tx.landed!=null||!(tx.delay>0))continue;const d=Math.hypot(tx.p.x-tx.from.x,tx.p.y-tx.from.y),k=Math.min(1,(S.t-tx.t0)/tx.delay);
    c.save();c.globalAlpha=0.55*(1-k*0.5);c.lineWidth=1.6/z;c.strokeStyle=C.shield;c.beginPath();c.arc(tx.from.x,tx.from.y,Math.max(1,d*k),0,6.283);c.stroke();c.restore();}
  // the props: the fire ship (dark, unlit, a slow spin), the mines (blinking hazard dots), the buoy (and its ring while up)
  const P=L.props;
  if(P.fireship&&P.fireship.live){try{SA.ship(c,'graf',P.fireship.x,P.fireship.y,now*0.12,(0.7+0.09*7)*1.6*0.85*1.35*o.boost,now,{livery:'civ',sized:true,off:true,damage:0.4});}catch(e){}
    API.label(c,P.fireship.x,P.fireship.y-90/z,'FIRE SHIP',C.hazard,z,10,'Bungee');}
  if(P.mines&&P.mines.live)for(const [i,q] of P.mines.pts.entries()){const on=(Math.floor(now*2+i)%2)===0;c.save();c.beginPath();c.arc(q.x,q.y,(on?7:5)/z,0,6.283);c.fillStyle=on?C.hazard:TH.rgba(C.hazard,0.5);c.fill();c.lineWidth=1.5/z;c.strokeStyle=C.ink;c.stroke();c.restore();}
  if(P.buoy){const b=P.buoy,I=L35.interdictOn();drawGlyphAt(c,b.x,b.y,'buoy',I?C.hazard:C.steel,z);
    if(I){const u=(now%1.6)/1.6;API.ring(c,I.x,I.y,L35.N.INTERDICT_R,TH.rgba(C.hazard,0.75),z,2.2,[12,8]);c.save();c.globalAlpha=0.35*(1-u);c.lineWidth=3/z;c.strokeStyle=C.hazard;c.beginPath();c.arc(I.x,I.y,L35.N.INTERDICT_R*(0.92+0.08*u),0,6.283);c.stroke();c.restore();}}
  // arrivals: a warning at the spot (a gold diamond for yours, hazard for the pirates), then the warp-in
  for(const a of L.arrivals){
    if(!a.done){const k=Math.min(1,(S.t-a.t0)/Math.max(0.01,a.t1-a.t0)),col=a.hazard?C.hazard:C.gold,pulse=1+0.15*Math.sin(now*8);
      diamond(c,a.x,a.y,12*pulse/z,col,true);c.save();c.lineWidth=2.4/z;c.strokeStyle=col;c.beginPath();c.arc(a.x,a.y,26/z,-Math.PI/2,-Math.PI/2+k*6.283);c.stroke();c.restore();
      API.label(c,a.x,a.y-34/z,ARRIVAL_NAME[a.k]+' · '+Math.max(0,a.t1-S.t).toFixed(1)+' S',col,z,10,'Bungee');}
    else if(!a.fx&&FX){a.fx=true;for(const id of a.ships){const s=SIM.fn.byId(id);if(s)FX.event('warpIn',{ship:API.shipView(s,API.ipos(s),API.iconBoost())});}}}
  // blasts: the fire ship and the nuke as a structure's explosion, the mines as missile hits
  for(const b of L.blasts||[]){if(b.fx||!FX)continue;b.fx=true;FX.event(b.kind==='mine'?'missileHit':'explode',b.kind==='mine'?{x:b.x,y:b.y,size:3,iconBoost:o.boost}:{x:b.x,y:b.y,size:b.kind==='nuke'?14:9,struct:true,iconBoost:o.boost});if(b.kind!=='mine'&&FX.camShake)FX.camShake(view);}
  // a marked target carries the gold lock mark while its focus lasts
  const seen=new Set();
  for(const wid in L.markW){const m=L.markW[wid];if(S.t>=m.until||seen.has(m.id+':'+m.sub))continue;seen.add(m.id+':'+m.sub);const t=SIM.fn.byId(m.id);if(!t||!t.alive)continue;
    let q=API.ipos(t);if(t.id==='fl400'&&m.sub){const sb=L.subs.find(x=>x.k===(m.sub==='turrets'?'pd':m.sub)&&x.hp>0);if(sb)q=L35.fn.subWorld(t,sb);}
    if(FX&&FX.lockMark)FX.lockMark(c,q.x,q.y,(t.id==='fl400'&&m.sub?60:90)*o.boost,1,{locked:true,flipAge:S.t-m.until+L35.N.MARK_SECS},view);}
}
const ARRIVAL_NAME={reserve:'RESERVES',ram:'RAM',tug:'TUG',pirates:'PIRATES'};
/* the props the layer flies, drawn from the Brickbat: the ram (civilian, hazard chevrons on the nose), the tug, the pirates */
function drawProp(c,s,p,z,boost){
  const sc=(0.7+0.09*s.row.size)*1.6*0.85*1.35*boost,t=performance.now()/1000;
  SA.ship(c,'brickbat',p.x,p.y,p.h,sc,t,{livery:s.prop35==='pirate'?'hunter':'civ',loadout:{attach:s.prop35==='pirate'&&s.load35==='pods'?['cargopod']:[]},damage:Math.max(0,1-Math.max(0,s.hull)/s.maxHull)});
  if(s.prop35==='ram'){const ca=Math.cos(p.h),sa=Math.sin(p.h),r=26*boost;c.save();c.lineWidth=3/z;c.strokeStyle=C.hazard;
    for(const o of [0.2,0.55]){const x=p.x+ca*r*(1-o),y=p.y+sa*r*(1-o);c.beginPath();c.moveTo(x-ca*8*boost-sa*10*boost,y-sa*8*boost+ca*10*boost);c.lineTo(x,y);c.lineTo(x-ca*8*boost+sa*10*boost,y-sa*8*boost-ca*10*boost);c.stroke();}c.restore();}
  if(s.prop35==='pirate')API.ring(c,p.x,p.y,40*boost,TH.rgba(C.hazard,0.85),z,2,[5,4]);
}
/* ---------- the overlay High Command calls ---------- */
const OV={home,onOver,record,drawBody,shipHidden,cmdsHtml,cmdsClick,tipFor,mapClick,
  pilotClick(s,b){if(b.dataset.act!=='callname')return false;if(b.getAttribute('aria-disabled')==='true'){API.flash('Call a Pilot by Name: '+(L35.powerWhy('name')||'not now'));return true;}
    B.pick=null;B.choose={k:'name',args:{ship:s.id}};API.syncHud(true);return true;},
  orderChip(w){const L=L35.L,ex=L&&L.exec[w.id];if(!ex)return '';const O=L35.ORDERS35[ex.k];return 'EXEC · '+O.name+(ex.arg&&typeof ex.arg==='string'?' '+(L35.WINGS35.find(x=>x.id===ex.arg)||{name:ex.arg}).name:'');},
  tacticChip(w){const L=L35.L,o=L&&L.off[w.id];return o?'OFF PLAN: '+o:'';},fxSkip:s=>s.cls==='fl400'&&!s.jumped,drawWorld,drawScreen,objHtml,rulesHtml,clockHtml,pilotBody,pointer,onKey,tick,
  hudHidden:()=>B.screen!=='live'&&B.screen!=='debrief',
  syncHud(now){
    const L=L35.L;
    if(B.screen==='live')syncCp();
    if(B.screen==='live'&&L&&L.phase!==B.lastPhase){B.lastPhase=L.phase;if(!B.planUser)B.planOverlay=L.phase===1;if(L.phase>1){banner('PHASE '+L.phase,L.phase===2?'They know we\'re here':'Hegemony on site');render();}}   // designer copy (C-78)
    if(B.screen==='live'&&B.banner&&now-B.banner.at>1400){B.banner=null;render();}},
  restart(same){if(same&&B.plan){planAgain();}else{B.seed=newSeed();rollAttempt();showBoard(false);}},
  panelHtml(){
    let h='<div class="hc-grp"><div class="hc-grp__head">Type 3.5</div>';
    for(const g of L35.GROUPS){h+='<details class="hc-fx"><summary>'+esc(g)+'</summary>';
      for(const k in L35.TUNE){const t=L35.TUNE[k];if(t.group!==g)continue;
        h+='<div class="hc-row"><label for="h35P_'+k+'" title="'+esc(k)+'">'+esc(t.label)+'</label><output data-out35="'+k+'">'+t.get()+'</output><input type="range" id="h35P_'+k+'" data-tune35="'+k+'" min="'+t.min+'" max="'+t.max+'" step="'+t.step+'" value="'+t.get()+'"></div>';}
      h+='</details>';}
    return h+'</div>';
  },
  panelInput(el){const k=el.dataset.tune35;if(!k)return false;const t=L35.TUNE[k];t.set(+el.value);const o=byId('hcPanelBody').querySelector('[data-out35="'+k+'"]');if(o)o.textContent=t.get();return true;},
};

/* ---------- DBGarena.hc35 ---------- */
const dbg={B,L35,get L(){return L35.L;},get S(){return SIM.S;},
  fn:{open,close,showBoard,enterBrief,launch,planAgain,render,dig,ready,checklist,inRing,toWorld,toLayout,fitPlan,record,OV,
    go(screen){if(screen==='dossier'){B.screen='dossier';render();}else if(screen==='brief')enterBrief();else if(screen==='board')showBoard(false);},
    run(secs){const n=Math.round(secs*1000/SIM.TICK);for(let i=0;i<n&&!SIM.S.over;i++)SIM.step();if(SIM.S.over&&B.screen==='live')API.onOver();API.syncHud(true);return SIM.S.t;}}};
window.SR_ARENA_HC35={open,close,dbg,get active(){return B.screen!=='off';}};
})();
