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
const B={screen:'off',oppId:'vulnerable_freighter',seed:1,mods:[],plan:null,step:1,part:1,intel:0,attempt:0,briefT:[0,0,0,0],stepAt:0,
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
  ROOT.hidden=true;B.screen='off';REQEL.hidden=true;L35.detach();B.pick=null;B.choose=null;B.abortArm=false;
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
function rollAttempt(){B.mods=L35.rollMods(opp(),B.seed);B.intel=L35.TUNE.INTEL_START.get();B.plan=null;B.step=1;B.part=1;B.briefT=[0,0,0,0];}
const TONE_TAG={good:'sr-tag--good',warn:'sr-tag--warn',info:'sr-tag--info'};
function modTags(cls){return B.mods.filter(L35.known).map(m=>'<span class="sr-tag '+TONE_TAG[L35.MODS[m.k].tone]+(cls?' '+cls:'')+'" data-tip="mod:'+m.k+'">'+esc(L35.MODS[m.k].name)+'</span>').join('');}
/* =====================================================================
   The Missions tab, recreated as a mock (feedback 1, §3.6; mock-up 1 with docs/ui/HUD-MOCKUP-REVIEW.md's
   corrections): the vanilla briefing room's own classes (sr-briefing.css, bf-), never base.js's renderMissions.
   The board, the holo-table, the briefing rail; the dossier's content lives in the rail and the table
   ===================================================================== */
const MI={board:'M4 5h16v14H4zM8 9h8M8 13h5',pin:'M12 21s-6-6-6-11a6 6 0 0112 0c0 5-6 11-6 11z',ship:'M3 13l8-3 8-6-3 8-3 8-2-5z',soldier:'M12 3a3 3 0 110 6 3 3 0 010-6zM6 21c0-5 3-8 6-8s6 3 6 8',
  lock:'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z',warn:'M12 3l10 18H2zM12 10v5M12 17.5v.5',type:'M3 13l8-3 8-6-3 8-3 8-2-5z',force:'M8 11a3 3 0 110-6 3 3 0 010 6zM16 11a3 3 0 110-6 3 3 0 010 6zM2 20c0-4 3-6 6-6s6 2 6 6M12 20c0-4 2-6 4-6s6 2 6 6',
  intel:'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z',comms:'M12 12v.01M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13',
  coin:'M12 4a8 8 0 100 16 8 8 0 000-16z',cube:'M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10',fuel:'M6 4h8v16H6zM14 8h3l2 3v7a2 2 0 01-4 0v-4',star:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'};
const mic=(k,cls)=>'<svg class="sr-ico'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+MI[k]+'"/></svg>';
const RISK_C=['var(--sr-go)','var(--sr-gold)','var(--sr-hazard)'];
const riskPips=r=>'<span class="bf-risk" style="--rc:'+RISK_C[r-1]+'">'+[1,2,3].map(i=>'<i'+(i<=r?' class="is-on"':'')+'></i>').join('')+'</span>';
function escortsKnown(){const O=opp();let n=O.escorts.reduce((a,e)=>a+(e.n||1),0);if(B.mods.some(m=>m.k==='heavy'&&L35.known(m)&&!m.fake))n*=2;return n;}
const NUMW=['no','one','two','three','four','five','six','seven','eight','nine','ten'];
function boardHtml(){
  const O=opp(),kn=B.mods.filter(L35.known),hid=B.mods.some(m=>!L35.known(m));
  const top='<div class="h35-mtop"><div class="h35-mtop__t"><h1 class="sr-display">Missions</h1><span>Briefing room · Haven Rock</span></div>'+
    '<nav class="h35-tabs" aria-label="Tabs">'+['Galaxy','Missions','Intelligence','Arsenal','Base'].map(t=>'<span class="sr-btn h35-tab'+(t==='Missions'?' is-on':'')+'"'+(t==='Missions'?'':' data-tip="na:arena" tabindex="0"')+'>'+t+'</span>').join('')+'</nav>'+
    '<div class="h35-pills">'+[['coin','1,240','var(--sr-gold)'],['cube','86','var(--sr-go)'],['fuel','54','var(--sr-rebel)'],['intel',String(B.intel),'var(--sr-shield)']].map(([k,v,c])=>'<span class="h35-pill" style="--c:'+c+'" data-tip="'+(k==='intel'?'h35:intel':'na:arena')+'">'+mic(k)+'<b>'+v+'</b></span>').join('')+'</div></div>';
  const card=(o)=>'<button type="button" class="bf-card'+(o.sel?' is-sel':'')+(o.lock||o.na?' is-locked':'')+(o.flag?' has-flag':'')+'"'+(o.sel?' data-msel="vf" aria-pressed="true"':' data-tip="na:demo" aria-disabled="true"')+'>'+
    '<span class="bf-card__ico'+(o.thumb?' h35-thumb':'')+'">'+(o.thumb?'<canvas width="112" height="112" data-thumb="fl400"></canvas>':mic(o.icon))+'</span><span class="bf-card__name">'+esc(o.name)+'</span>'+
    '<span class="bf-card__meta">'+o.type+(o.risk?riskPips(o.risk):'')+(o.src?esc(o.src):'')+'</span>'+(o.flag?'<span class="bf-card__flag" style="background:var(--sr-gold);color:var(--sr-ink)">New</span>':'')+'</button>';
  const board='<div class="bf-board h35-mboard"><div class="bf-board__head">'+mic('board')+'Mission board</div>'+
    '<div class="bf-filters">'+['All','Ground','Space'].map(f=>'<span class="sr-btn sr-btn--sm h35-filt'+(f==='Space'?' is-on':'')+'" data-tip="na:demo">'+f+'</span>').join('')+'</div>'+
    '<div class="bf-list">'+card({sel:1,thumb:1,name:O.title,type:'Space',risk:2,src:O.source.name,flag:1})+card({na:1,icon:'soldier',name:'Steal Fuel',type:'Ground',risk:2})+
    card({na:1,icon:'soldier',name:'Rescue Tachi',type:'Ground',risk:2})+card({lock:1,icon:'lock',name:'Signal encrypted',type:'Space'})+'</div>'+
    '<button type="button" class="sr-btn sr-btn--sm sr-btn--ghost h35-newopp" data-act="newopp" data-tip="h35:newopp">New opportunity</button></div>';
  const n=escortsKnown(),ace=B.mods.some(m=>m.k==='ace'&&L35.known(m)&&!m.fake);
  const holo='<div class="bf-holo h35-mholo"><div class="bf-beam"></div>'+holoTable()+'<div class="bf-proj"><div class="bf-scan"></div>'+holoSvg(n)+
    '<canvas class="h35-holofr" width="300" height="90" data-target="1"></canvas>'+
    '<div class="bf-callout" style="left:2%;top:4%"><b>Target</b><span>GA '+esc(O.target.label.replace('Fleet','fleet'))+', holds full</span></div>'+
    '<div class="bf-callout is-foe" style="right:0;top:2%"><b>Opposition</b><span>Escort of '+(NUMW[n]||n)+' Motes'+(ace?', with Commandant Vex':'')+'</span></div>'+
    '<div class="bf-callout" style="right:2%;bottom:16%"><b>Window</b><span>Crosses in about 4:30</span></div></div>'+
    '<div class="bf-title"><i></i>Thessa Reach · Remote system</div></div>';
  const rail='<aside class="h35-mrail bf-rail"><div class="bf-railtitle">'+mic('intel')+'Briefing</div><div class="bf-brief">'+
    '<div><div class="bf-brief__title">'+esc(O.title)+'</div><div class="bf-loc">'+mic('pin')+'Thessa Reach · Orbit</div></div>'+
    '<div class="bf-src"><canvas class="h35-portrait h35-portrait--xs" width="64" height="64" data-portrait="cass"></canvas><span><b>'+esc(O.source.name)+'</b><span>Smuggler · Dustfall</span></span></div>'+
    '<p class="bf-quote" data-tip="@" data-tt="'+esc(O.source.name)+'" data-tb="'+esc(O.lead)+'">'+esc(O.lead)+'</p>'+
    '<div class="bf-facts"><div class="bf-fact" style="--c:var(--sr-gold)">'+mic('warn')+'<span>Risk</span><b>Moderate</b></div><div class="bf-fact">'+mic('type')+'<span>Type</span><b>Space</b></div><div class="bf-fact">'+mic('force')+'<span>Max force</span><b>3 wings</b></div></div>'+
    '<div class="bf-sec"><div class="bf-sec__h">'+mic('intel')+'Intel</div><div class="h35-mtags">'+modTags()+'<span class="sr-tag h35-missed" data-tip="h35:missed">? '+esc(O.source.name)+' may have missed something</span></div>'+
    digHtml(hid)+'</div>'+
    '<div class="bf-plan"><button type="button" class="sr-btn sr-btn--primary sr-btn--lg" data-act="brief" data-tip="h35:plan2">Plan mission</button></div></div></aside>';
  const comms='<div class="h35-mcomms"><div class="h35-mcomms__h">'+mic('comms')+'Comms feed</div><p><em>[02:14]</em> Patrol ship reports nothing unusual.</p><p><em>[01:32]</em> Jump point in 5 minutes.</p></div>';
  const fine='<div class="h35-mfine"><button type="button" class="sr-btn sr-btn--sm" data-act="rulesets">Change ruleset</button><span>Nothing here touches your campaign. Seed '+B.seed+'</span><button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="title">Back to title</button></div>';
  return '<div class="bf-stage h35-missions'+(B.screen==='brief'?' is-dim':'')+'">'+top+board+holo+rail+comms+fine+'</div>';
}
function digHtml(hid){
  let pips='';for(let i=0;i<L35.TUNE.INTEL_START.get();i++)pips+='<i class="'+(i<B.intel?'is-on':'')+'"></i>';
  return '<div class="h35-dig"><button type="button" class="sr-btn sr-btn--sm" data-act="dig" data-tip="h35:dig"'+(B.intel>0&&hid?'':' aria-disabled="true" data-why="'+(hid?'No Intel left':'Nothing more to find')+'"')+'>Dig deeper</button><span class="h35-intel" data-tip="h35:intel">'+pips+'</span></div>';
}
/* the holo-table's projector (SVG ellipses), as the vanilla table */
function holoTable(){
  return '<svg class="bf-table" viewBox="0 0 520 120" aria-hidden="true"><ellipse cx="260" cy="78" rx="250" ry="38" fill="#0b0e2a" stroke="#05061a" stroke-width="4"/><ellipse cx="260" cy="64" rx="236" ry="32" fill="#151a44" stroke="#05061a" stroke-width="3"/>'+
    '<ellipse cx="260" cy="58" rx="160" ry="20" fill="none" stroke="var(--sr-shield)" stroke-width="3" stroke-opacity=".8"/><ellipse cx="260" cy="58" rx="110" ry="13" fill="var(--sr-shield)" fill-opacity=".35"/></svg>';
}
/* the projection: the planet as a wireframe, its tilted orbit, the freighter's lane to its jump point (Hegemony
   blue), the escort as Hegemony-blue triangles (one a known escort) */
function holoSvg(n){
  const cx=320,cy=250,R=118,cyan='var(--sr-shield)',foe='#7aaaff';
  let g='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="'+cyan+'" fill-opacity=".07" stroke="'+cyan+'" stroke-width="2.5"/>';
  for(const q of [.28,.62,.9])g+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(R*q).toFixed(1)+'" ry="'+R+'" fill="none"/>';
  for(const lat of [-.66,-.33,0,.33,.66]){const rx=R*Math.sqrt(1-lat*lat);g+='<ellipse cx="'+cx+'" cy="'+(cy+lat*R).toFixed(1)+'" rx="'+rx.toFixed(1)+'" ry="'+(rx*.16).toFixed(1)+'" fill="none"/>';}
  let svg='<svg viewBox="0 0 640 520" aria-hidden="true"><circle class="bf-spin" cx="'+cx+'" cy="'+cy+'" r="'+(R+40)+'" fill="none" stroke="'+cyan+'" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 10"/>'+
    '<g stroke="'+cyan+'" stroke-opacity=".4" stroke-width="1.4">'+g+'</g>'+
    '<ellipse cx="'+cx+'" cy="'+cy+'" rx="236" ry="61" transform="rotate(-14 '+cx+' '+cy+')" fill="none" stroke="'+cyan+'" stroke-width="2" stroke-opacity=".8"/>'+
    '<path d="M70 318 L548 196" fill="none" stroke="'+cyan+'" stroke-width="3" stroke-dasharray="14 10"/><path d="M528 194 l20 2 -14 14" fill="none" stroke="'+cyan+'" stroke-width="3"/>';
  // the jump point: the enemy's exit, in Hegemony blue
  svg+='<g stroke="'+foe+'" stroke-width="3" fill="none"><circle cx="572" cy="190" r="16"/><circle cx="572" cy="190" r="6" fill="'+foe+'"/><path d="M572 166v8M572 206v8M548 190h8M588 190h8"/></g>'+
    '<text x="572" y="228" text-anchor="middle" fill="'+foe+'" font-family="Exo 2,sans-serif" font-weight="800" font-size="15">Jump point</text>';
  for(let i=0;i<n;i++){const x=372+(i%4)*24+(i>=4?12:0),y=166+Math.floor(i/4)*20-(i%4)*6;svg+='<path d="M'+x+' '+(y-9)+' l9 15 h-18z" fill="'+foe+'" fill-opacity=".45" stroke="'+foe+'" stroke-width="2"/>';}
  // leader lines from the callouts: the target (cyan), the opposition (blue), the window (cyan)
  svg+='<path d="M150 70 L250 296" stroke="'+cyan+'" stroke-width="2" fill="none"/><circle cx="250" cy="296" r="5" fill="'+cyan+'"/>'+
    '<path d="M560 64 L418 158" stroke="'+foe+'" stroke-width="2" fill="none"/><circle cx="418" cy="158" r="5" fill="'+foe+'"/>'+
    '<path d="M560 400 L470 236" stroke="'+cyan+'" stroke-width="2" fill="none"/><circle cx="470" cy="236" r="5" fill="'+cyan+'"/></svg>';
  return svg;
}

function dig(){
  const hid=B.mods.filter(m=>!L35.known(m));if(!hid.length||B.intel<=0)return;
  const r=L35.mulberry(B.seed*31+B.intel*7),m=hid[Math.floor(r()*hid.length)];m.dug=true;B.intel--;render();
}

/* =====================================================================
   The briefing (§4, §7.2): four steps, the map in plan view on the right
   ===================================================================== */
const STEPS=['Objectives','Rules','Wings & assets','The plan'];   // window 1 in two parts: the primary, then the secondaries (feedback 2, §2)
function enterBrief(){
  if(!B.plan)B.plan=L35.defaultPlan(opp());
  const opening=B.screen!=='brief';B.screen='brief';B.stepAt=performance.now();if(opening)B.holoAnim='is-open';if(B.step!==1)B.part=1;   // it rises out of the beam
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
  const S=SIM.S,mine=S.ships.filter(s=>s.alive&&s.faction==='reb'&&!s.struct),fr=SIM.fn.byId('fl400');if(!mine.length){fitPlan();return;}
  // the zoom where a fighter is about FIT_PX long (§3.1), on your wings; the freighter's lane joins the frame if it fits
  const z=FIT_PX/API.shipLenW(mine[0]),left=360,w=Math.max(200,API.cssW-left-40)/z,h=Math.max(200,API.cssH-220)/z;
  let cx=mine.reduce((a,s)=>a+s.x,0)/mine.length,cy=mine.reduce((a,s)=>a+s.y,0)/mine.length;
  if(fr&&Math.abs(fr.x-cx)<w*0.9&&Math.abs(fr.y-cy)<h*0.9){cx=(cx+fr.x)/2;cy=(cy+fr.y)/2;}
  cam.z=z;cam.x=cx-(left/2)/z;cam.y=cy;API.clampCam();A.camHeld=true;A.follow=false;
}
const FIT_PX=30;   // a fighter's length on screen when the mission opens (feedback 1, §3.1). placeholder
const W35=id=>L35.WINGS35.find(w=>w.id===id);
const toWorld=p=>{const Zn=SIM.zone,k=L35.L?L35.L.k:2;return {x:p.x*k+Zn.x0,y:p.y*k+Zn.y0};};
const toLayout=p=>{const Zn=SIM.zone,k=L35.L?L35.L.k:2;return {x:(p.x-Zn.x0)/k,y:(p.y-Zn.y0)/k};};
function checklist(){
  const P=B.plan,rows=[];
  for(const n of L35.needsMet(P,B.mods))rows.push(n);
  const strike=L35.WINGS35.filter(w=>P.wings[w.id].role==='strike');
  rows.push({text:'At least one wing jumps in',ok:strike.length>0});
  const ringed=strike.filter(w=>inRing(P.wings[w.id].jumpIn));
  rows.push({text:'Jump-ins outside their sensor rings',ok:!ringed.length,warn:true,why:ringed.length?ringed.map(w=>w.name).join(', '):''});   // a warning, not a block
  return rows;
}
const ready=()=>checklist().every(r=>r.ok||r.warn);
/* the planning windows (feedback 1, §3.6): one holographic window a step, risen from the holo-table's beam over the
   dimmed Missions view; window 4 is wide, with a cut-out pane where the plan map shows through */
const STEP_NEXT=['Rules','Wings & assets','The plan'];
const nextName=()=>B.step===1&&B.part!==2?'Secondaries':STEP_NEXT[B.step-1];
const nextWhy=()=>B.step===1&&!B.plan.primary?'Pick a primary objective':null;
/* the step track (the windows handoff, §1): a numbered circle and a label pill a step; done green with a ✓ badge, the
   current one gold with a turning sunburst, the rest grey; the connectors solid green, gold chevrons to the next, grey */
function trackHtml(){
  return '<ol class="h35-track">'+STEPS.map((n,i)=>{const st=i+1<B.step?'done':i+1===B.step?'on':'todo';
    const parts=i===0?'<i class="h35-node__parts">'+[1,2].map(n=>'<u class="'+(st!=='on'||n<=B.part?'is-on':'')+'"></u>').join('')+'</i>':'';   // window 1's two parts
    const link=i?'<i class="h35-link is-'+(i+1<=B.step?'done':i===B.step?'next':'todo')+'" aria-hidden="true"><u></u><u></u><u></u></i>':'';   // the connector into this node
    return '<li class="h35-node is-'+st+'">'+link+'<button type="button"'+(st==='done'?' data-step="'+(i+1)+'"':' disabled')+' data-tip="@" data-tt="'+(i+1)+' · '+esc(n)+'"'+(i===0?' data-tb="'+(st==='done'?'Done: click to go back to it. ':'')+'Part 1, the primary; part 2, the secondary objectives."':st==='done'?' data-tb="Done: click to go back to it."':'')+'>'+
      '<b><em>'+(i+1)+'</em>'+(st==='done'?'<i class="h35-node__ok">✓</i>':'')+'</b><span>'+esc(n)+parts+'</span></button></li>';}).join('')+'</ol>';
}
/* the readiness pill (§1): what Launch still needs, in one line; its tip lists every check, a click opens the list */
function needsHtml(why){
  const rows=checklist(),miss=rows.filter(r=>!r.ok&&!r.warn).length,mark=r=>r.ok?'✓':r.warn?'!':'✕';
  const list=rows.map(r=>mark(r)+' '+r.text+(r.why?' ('+r.why+')':'')).join('\n');
  let h='<div class="h35-needs"><button type="button" class="h35-needs__pill'+(miss?' is-miss':' is-ok')+'" data-act="needs" data-tip="@" data-tt="Readiness" data-tb="'+esc(list)+'" aria-expanded="'+!!B.needsPop+'">Needs: '+
    (miss?'<b>'+miss+' missing</b>':'<b>all met ✓</b>')+'</button>';
  if(B.needsPop)h+='<div class="h35-needs__pop" role="list">'+rows.map(r=>'<div class="sr-check'+(r.ok?'':r.warn?' is-warn':' is-no')+'" role="listitem"><span class="sr-check__box">'+(r.ok?'✓':r.warn?'!':'')+'</span>'+esc(r.text)+(r.why?'<span class="sr-check__why">'+esc(r.why)+'</span>':'')+'</div>').join('')+'</div>';
  if(why)h+='<span class="h35-holo__why">'+esc(why)+'</span>';
  return h+'</div>';
}
/* the frame (§1): a chamfered holo plate, its edges as stacked layers (ink, cyan, fill, a thin inner line, the fill
   again), a V-notch at the bottom where the beam comes in; the pedestal and the beam under it */
const FRAME='<i class="h35-fr" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></i>';
function briefHtml(){
  const last=B.step===4,ok=ready(),nw=nextWhy(),anim=B.holoAnim||'';B.holoAnim=null;
  const miss=checklist().filter(r=>!r.ok&&!r.warn).map(r=>r.text).join(' · ');
  let body;
  if(last)body='<div class="h35-holo__split"><div class="h35-holo__col" data-keep="c4">'+step4()+'</div><div class="h35-pane" data-pane="1" aria-hidden="true"></div></div>';
  else body='<div class="h35-holo__body is-step'+B.step+'" data-keep="b'+B.step+'.'+(B.step===1?B.part:1)+'">'+(B.step===1?(B.part===2?step1b():step1()):B.step===2?step2():step3())+'</div>';
  const win='<div class="sr-window h35-holo'+(last?' is-wide':'')+(anim?' '+anim:'')+'" role="dialog" aria-label="Plan">'+FRAME+
    '<div class="h35-holo__head"><div class="h35-holo__title">PLAN: '+esc(opp().title.toUpperCase())+'</div>'+
    '<button type="button" class="h35-holo__x" data-act="board" aria-label="Close" data-tip="@" data-tt="Back to the mission board" data-tb="Your plan is kept.">✕</button>'+trackHtml()+'</div>'+
    body+
    '<div class="h35-holo__foot"><button type="button" class="h35-fbtn h35-fbtn--back" data-act="prev" data-tip="@" data-tt="'+(atStart()?'Back to the mission board':'Back')+'" data-tb="Esc">◀ '+(atStart()?'Back to board':'Back')+'</button>'+
    needsHtml(nw||(last&&!ok?miss:null))+
    (last?'<button type="button" class="h35-fbtn h35-fbtn--go" data-act="launch" data-tip="h35:launch"'+(ok?'':' aria-disabled="true" data-why="'+esc(miss)+'"')+'>Launch ▶</button>':
      '<button type="button" class="h35-fbtn h35-fbtn--go" data-act="next" data-tip="@" data-tt="Next: '+esc(nextName())+'" data-tb="Enter"'+(nw?' aria-disabled="true" data-why="'+esc(nw)+'"':'')+'>Next: '+esc(nextName())+' ▶</button>')+
    '</div><i class="h35-holo__beam" aria-hidden="true"></i><i class="h35-holo__ped" aria-hidden="true"></i></div>';
  return (last?'':boardHtml())+'<div class="h35-holowrap'+(last?' is-wide':'')+'">'+win+'</div>';
}
/* a step: forward, back, or a done node; the window slides that way and flickers once */
function goStep(n,part){
  n=Math.max(1,Math.min(4,n));part=n===1?part||1:1;if(n===B.step&&part===(B.part||1))return;
  const fwd=n>B.step||(n===B.step&&part>(B.part||1));
  if(fwd&&B.step===1&&nextWhy()){API.flash(nextWhy());return;}
  B.briefT[B.step-1]+=(performance.now()-B.stepAt)/1000;B.stepAt=performance.now();
  B.holoAnim=fwd?'is-fwd':'is-back';B.step=n;B.part=part;render();
}
/* Next and Back walk window 1's two parts too */
const atStart=()=>B.step===1&&B.part!==2;
function nextStep(){if(B.step===1&&B.part!==2)goStep(1,2);else goStep(B.step+1);}
function backStep(){if(atStart()){if(B.screen==='brief')B.briefT[0]+=(performance.now()-B.stepAt)/1000;showBoard(false);}else if(B.step===2)goStep(1,2);else goStep(B.step-1);}
/* Launch: the window folds into the beam (180 ms), then the mission; with reduced motion, at once */
function launchFromWindow(){
  if(!ready()){API.flash('Not ready');return;}
  const w=ROOT.querySelector('.h35-holo');if(!w||API.fxReduced()){launch();return;}
  w.classList.add('is-closing');setTimeout(()=>{if(B.screen==='brief')launch();},180);
}
/* window 4's pane: the camera fitted to it, so the plan map shows where the window is cut away */
function fitPane(){
  const el=ROOT.querySelector('[data-pane]');if(!el){fitPlan();return;}
  const st=STAGE.getBoundingClientRect(),r=el.getBoundingClientRect(),b=zoneBox();
  const w=Math.max(120,r.width-24),h=Math.max(120,r.height-24),z=Math.min(w/(b.x1-b.x0),h/(b.y1-b.y0))*0.96;
  const pcx=r.left-st.left+r.width/2,pcy=r.top-st.top+r.height/2;
  cam.z=z;cam.x=(b.x0+b.x1)/2-(pcx-API.cssW/2)/z;cam.y=(b.y0+b.y1)/2-(pcy-API.cssH/2)/z;A.camHeld=true;A.follow=false;
}
/* step 1: the primary objective, under its family */
function step1(){
  const P=B.plan,fams={};
  for(const k of L35.PRIMARY_KEYS){const o=L35.PRIMARIES[k];(fams[o.family]=fams[o.family]||[]).push(k);}
  let h='<p class="h35-hint">Pick what this mission is for. Its needs gate Launch, not the pick: build the force after.</p><div class="h35-fams">';
  for(const f in fams){
    h+='<div class="h35-fam"><div class="h35-label">'+esc(f)+'</div>';
    for(const k of fams[f]){const o=L35.PRIMARIES[k],pk=P.primary===k;
      const needs=pk?L35.needsMet(P,B.mods):o.needs.map(n=>({text:L35.NEED_TEXT[n],ok:null}));
      h+='<button type="button" class="sr-card h35-obj'+(pk?' is-picked':'')+'" data-primary="'+k+'" data-tip="obj:'+k+'"><div class="sr-card__top"><span class="sr-card__title">'+esc(o.name)+'</span>'+conflictTags(k)+'</div>'+
        '<div class="sr-card__body">'+esc(o.wins)+'</div>'+rewardHtml(k)+(needs.length?needs.map(n=>'<div class="sr-check h35-need'+(n.ok===false?' is-no':'')+'"><span class="sr-check__box">'+(n.ok?'✓':'')+'</span>'+esc(n.text)+'</div>').join(''):'<div class="h35-noneed">No needs</div>')+'</button>';}
    h+='</div>';
  }
  h+='<div class="h35-fam h35-fam--later"><div class="h35-label">Later</div>'+L35.LATER_PRIMARIES.map(n=>'<div class="sr-card is-locked h35-obj" data-tip="na:demo"><div class="sr-card__top"><span class="sr-card__title">'+esc(n)+'</span><span class="sr-tag">Not in this demo</span></div></div>').join('')+'</div></div>';
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
/* a primary's rewards (feedback 2, §1.1): what it pays, and the bonus for doing the one you picked */
function rewardHtml(k){
  const R=L35.PRIMARIES[k].reward;if(!R)return '';
  const per=R.per?' <span class="h35-rew__per">+ '+chips(R.per)+' '+esc(R.perText)+'</span>':'';
  return '<div class="h35-rew"><span class="h35-rew__lbl">Pays</span>'+(chips(R.base)||'')+per+(R.extra?' <span class="h35-rew__per">+ '+esc(R.extra)+'</span>':'')+
    '</div><div class="h35-rew h35-rew--bonus"><span class="h35-rew__lbl">Accomplished</span>+ '+chips(R.bonus)+'</div>';
}
const RES_ICO={c:'credits',s:'supplies',m:'materials',f:'fuel',i:'intel'},RES_NAME={c:'Credits',s:'Supplies',m:'Materials',f:'Fuel',i:'Intel'};
const chips=b=>b?Object.keys(RES_ICO).filter(k=>b[k]).map(k=>'<span class="sr-cost" style="--c:var(--sr-res-'+RES_ICO[k]+')" data-tip="@" data-tt="'+RES_NAME[k]+'">'+SR.hud.ico(RES_ICO[k])+b[k]+'</span>').join(' '):'';
/* window 1, part 2: the secondary objectives (up to OPT_MAX) */
const OPT_MAX=2;
function step1b(){
  const P=B.plan,o=L35.PRIMARIES[P.primary];
  let h='<p class="h35-hint">Part 2 · Secondary objectives (up to '+OPT_MAX+'), on top of <b>'+esc(o?o.name:'the primary')+'</b>: your pilots try for them, but the primary comes first.</p><div class="h35-opts">';
  for(const k in L35.OPTIONALS){const o=L35.OPTIONALS[k],on=P.optionals.find(x=>x.k===k);
    h+='<button type="button" class="sr-card h35-obj h35-tog'+(on?' is-picked':'')+'" data-opt="'+k+'" data-tip="opt:'+k+'"'+(!on&&P.optionals.length>=OPT_MAX?' aria-disabled="true" data-why="Two optionals at most"':'')+'><div class="sr-card__top"><span class="sr-card__title">'+esc(o.name)+'</span>'+conflictTags(k)+'</div><div class="sr-card__body">'+esc(o.line)+'</div>'+
      (on&&o.needs?'<div class="h35-pickrow" data-stop="1">'+pilotPick(k,on.ship,o.needs)+'</div>':'')+'</button>';}
  return h+'</div>';
}
/* window 2: the rules of engagement */
function step2(){
  const P=B.plan;
  let h='<p class="h35-hint">How your pilots fight: the rules hold for every wing, all mission.</p><div class="h35-opts">';
  for(const k in L35.ROES){const o=L35.ROES[k],on=P.roes.includes(k);
    h+='<button type="button" class="sr-card h35-obj h35-tog'+(on?' is-picked':'')+'" data-roe="'+k+'" data-tip="roe:'+k+'"><div class="sr-card__top"><span class="sr-card__title">'+esc(o.name)+'</span>'+conflictTags(k)+'</div><div class="sr-card__body">'+esc(o.line)+'</div>'+
      (on&&k==='preservation'?'<div class="h35-pickrow" data-stop="1"><label>Withdraw under <b>'+Math.round(P.presHull*100)+'%</b> hull <input type="range" min="0.1" max="0.6" step="0.05" value="'+P.presHull+'" data-pres="1"></label></div>':'')+'</button>';}
  return h+'</div>';
}
function pilotPick(k,cur,need){
  const ships=[];for(const w of L35.WINGS35)for(const sd of w.ships){const p=sd.pilot||{};if(need==='green'&&!(p.preset==='green'))continue;ships.push(sd);}
  return '<select class="h35-sel" data-optship="'+k+'"><option value="">Name a pilot…</option>'+ships.map(sd=>'<option value="'+sd.id+'"'+(cur===sd.id?' selected':'')+'>'+esc(sd.name)+' ('+esc(clsName(sd.cls))+')</option>').join('')+'</select>';
}
const clsName=c=>c==='cross'?'Cross':c==='talon'?'Talon':c==='brickbat'?'Brickbat':c;
/* step 3: wings (Strike / Reserve / Stay home), Brickbat loadouts, assets */
function step3(){
  const P=B.plan;
  let h='<p class="h35-hint">Who goes, and with what. Reserves wait at home until you call them.</p><div class="h35-wings">';
  for(const w of L35.WINGS35){const pw=P.wings[w.id];
    h+='<div class="hc-card h35-wing is-'+pw.role+'"><div class="h35-wing__head"><canvas class="h35-portrait h35-portrait--sm" width="64" height="64" data-portrait="'+w.ships[0].id+'"></canvas>'+
      '<span class="h35-wing__name">'+esc(w.name)+'</span><span class="sr-btngroup h35-role">'+['strike','reserve','home'].map(r=>'<button type="button" class="sr-btn sr-btn--sm" data-role="'+r+'" data-wing="'+w.id+'" data-tip="role:'+r+'" aria-pressed="'+(pw.role===r)+'">'+(r==='strike'?'Strike':r==='reserve'?'Reserve':'Stay home')+'</button>').join('')+'</span></div>'+
      '<div class="h35-ships">'+w.ships.map(sd=>shipCell(w,sd,pw)).join('')+'</div>'+
      '<div class="sr-quote h35-take"><span class="sr-quote__who">'+esc(w.ships[0].name)+'</span>'+esc(leaderTake(w))+'</div></div>';}
  h+='</div><div class="h35-label">Assets ('+P.assets.length+' of '+L35.ASSET_SLOTS+')</div><div class="h35-slots">';
  for(let i=0;i<L35.ASSET_SLOTS;i++){const k=P.assets[i];
    h+=k?'<div class="sr-slot is-filled" data-tip="asset:'+k+'"><span class="h35-aglyph">'+assetGlyph(k)+'</span><span><span class="sr-slot__name">'+esc(L35.ASSETS[k].name)+'</span><span class="sr-slot__label">'+esc(L35.ASSETS[k].power?'Unlocks '+L35.ASSETS[k].power:'Passive: shorter delays')+'</span></span><button type="button" class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost sr-slot__clear" data-unasset="'+i+'" aria-label="Remove">✕</button></div>':
      '<button type="button" class="sr-slot'+(B.pickAsset===i?' is-target':'')+'" data-slot="'+i+'"><span class="sr-slot__label">Empty slot · assign an asset</span></button>';}
  h+='</div>';
  if(B.pickAsset!=null){h+='<div class="h35-assets">';for(const k in L35.ASSETS){if(P.assets.includes(k)||(k==='nuke'&&P.assets.includes('ram'))||(k==='ram'&&P.assets.includes('nuke')))continue;
    h+='<button type="button" class="sr-choice" data-asset="'+k+'" data-tip="asset:'+k+'"><span class="h35-aglyph">'+assetGlyph(k)+'</span><span><b>'+esc(L35.ASSETS[k].name)+'</b><br><small>'+esc(L35.ASSETS[k].line)+'</small></span></button>';}
    h+='</div>';}
  return h;
}
function shipCell(w,sd,pw){
  const lo=sd.cls==='brickbat'?pw.loadout[sd.id]||'bombs':null,p=sd.pilot||{};
  return '<div class="h35-ship"><canvas class="h35-shippic" width="120" height="72" data-ship="'+sd.cls+'" data-lo="'+(lo||'')+'"></canvas><span class="h35-ship__name">'+esc(sd.name)+'</span>'+
    '<span class="h35-ship__sub">'+esc(clsName(sd.cls))+' · '+esc(pilotWord(sd))+'</span>'+
    (lo?'<span class="sr-btngroup h35-lo">'+['bombs','pods','board'].map(k=>'<button type="button" class="sr-btn sr-btn--sm" data-lo="'+k+'" aria-pressed="'+(lo===k)+'" data-ship="'+sd.id+'" data-wing="'+w.id+'" data-tip="lo:'+k+'">'+esc(L35.LOADOUTS[k].name)+'</button>').join('')+'</span>':'')+'</div>';
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
  let h='<select class="h35-sel" data-ord="'+slot+'" data-wing="'+w.id+'" data-tip="ord:'+k+'">'+L35.ORDER35_KEYS.map(x=>'<option value="'+x+'"'+(x===k?' selected':'')+'>'+esc(L35.ORDERS35[x].name)+'</option>').join('')+'</select>';
  const O=L35.ORDERS35[k];
  if(O&&O.target==='sub')h+='<select class="h35-sel" data-arg="'+slot+'" data-wing="'+w.id+'">'+O.subs.map(s=>'<option value="'+s+'"'+(o.arg===s?' selected':'')+'>'+s+'</option>').join('')+'</select>';
  else if(O&&O.target==='what')h+='<select class="h35-sel" data-arg="'+slot+'" data-wing="'+w.id+'">'+O.whats.map(s=>'<option value="'+s+'"'+(o.arg===s?' selected':'')+'>'+s+'</option>').join('')+'</select>';
  else if(O&&O.target==='wing')h+='<select class="h35-sel" data-arg="'+slot+'" data-wing="'+w.id+'">'+L35.WINGS35.filter(x=>x.id!==w.id).map(x=>'<option value="'+x.id+'"'+(o.arg===x.id?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>';
  return h;
}
function trigSel(w,sec){
  return '<select class="h35-sel" data-trig="1" data-wing="'+w.id+'" data-tip="h35:trig"><option value="">None</option>'+Object.keys(L35.TRIGGERS).map(k=>'<option value="'+k+'"'+(sec&&sec.trig===k?' selected':'')+'>if '+esc(L35.TRIGGERS[k].toLowerCase())+'</option>').join('')+'</select>';
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
  if(L.fallback)h+='<li class="hc-o is-failed" data-tip="obj:'+P.primary+'"><span class="hc-o__mark"></span><span class="hc-o__txt">'+esc(L35.PRIMARIES[P.primary].name)+'</span><span class="sr-tag sr-tag--action h35-prim">PRIMARY</span></li>';
  h+='<li class="hc-o is-'+o.state+'" data-tip="obj:'+L.primK+'"><span class="hc-o__mark"></span><span class="hc-o__txt">'+esc(L35.PRIMARIES[L.primK].name)+'</span><span class="sr-tag sr-tag--action h35-prim">'+(L.fallback?'FALLBACK':'PRIMARY')+'</span></li>';
  for(const x of L.opt)h+='<li class="hc-o is-'+x.state+'" data-tip="opt:'+x.k+'"><span class="hc-o__mark"></span><span class="hc-o__txt">'+esc(L35.OPTIONALS[x.k].name)+(x.ship?' · '+esc((SIM.fn.byId(x.ship)||{name:x.ship}).name):'')+'</span></li>';
  return h+'</ul>';
}
function rulesHtml(){
  const L=L35.L;if(!L)return '';
  const r=L.plan.roes;
  return '<div class="hc-rules__head">Rules of engagement</div><div class="hc-rules__chips">'+(r.length?r.map(k=>'<span class="hc-rchip" data-tip="roe:'+k+'">'+esc(L35.ROES[k].name)+'</span>').join(''):'<span class="hc-rules__none">No rules</span>')+'</div>';
}
function clockHtml(){
  const S=SIM.S,L=L35.L;if(!S||!L)return '';
  const fr=SIM.fn.byId('fl400');
  let status,name,round,ph=L.phase;
  if(ph===1){status='UNDETECTED';name='PHASE 1 · ARRIVAL';round=fr&&fr.alive?'FREIGHTER JUMPS IN '+fmtClock(etaJump()):'';}
  else if(ph===2){status='ALERTED';name='PHASE 2 · ENGAGED';const D=L.distress;
    round=L.prize&&L.repair?'PRIZE: '+(L.repair.k==='power'?'POWER':'ENGINES')+' '+Math.round(L.repair.prog*100)+'%':D&&!D.landed&&!D.cut?'DISTRESS '+Math.round(Math.min(1,(S.t-D.t0)/L35.N.DISTRESS_SECS)*100)+'%':L.responseAt!=null?'RESPONSE IN '+fmtClock(L.responseAt-S.t):
      L.spool!=null?'FREIGHTER SPOOLING':fr&&fr.alive&&!L.disabled&&!L.prize&&!L.engOut?'FREIGHTER JUMPS IN '+fmtClock(etaJump()):fr&&fr.alive&&L.engOut&&!L.disabled&&!L.prize?'FREIGHTER CAN\'T JUMP':L.prize?'PRIZE HEADING HOME':L.disabled?'FREIGHTER DEAD IN SPACE':'';}
  else {status='HEGEMONY ON SITE';name='PHASE 3 · RESPONSE';round='GET OUT';}
  return '<div class="sr-phase h35-phase" data-phase="'+(ph===1?'free':'fight')+'"'+(ph===3?' data-status="alert"':'')+'><span class="sr-phase__status" style="--s:'+(ph===1?'var(--sr-c-good)':ph===2?'var(--sr-hazard)':'var(--sr-heg)')+'"><span class="sr-phase__text">'+status+'</span></span>'+
    '<span class="sr-phase__name">'+name+'</span><span class="sr-phase__round">'+esc(round)+'</span></div>'+
    '<div class="h35-platefoot">'+(ph===1?'<div class="h35-detect" data-tip="h35:detect"><b style="width:'+Math.round(L.detect)+'%"></b></div>':'')+
    '<button type="button" class="hc-tbtn h35-plantog'+(B.planOverlay?' is-on':'')+'" data-act="plan" aria-pressed="'+!!B.planOverlay+'" data-tip="h35:plan">PLAN</button></div>';
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
  const bar=API.bar;   // High Command's: the health colours and the eased fill (§3.3)
  h+='<div class="hc-pilot__bars">'+bar('Hull',s.hull,s.maxHull,'is-hull')+bar('Armour',s.arm,s.maxArm,'is-arm')+bar('Shields',SIM.fn.totalShield(s),SIM.fn.maxShield(s),'is-shd')+'</div>';
  const b=s.beh||{};
  if(B.screen==='live'&&s.faction==='reb'&&s.wing&&L35.L){const why=L35.powerWhy('name');
    h+='<div class="hc-pilot__acts"><button type="button" class="sr-btn sr-btn--sm" data-act="callname" data-tip="p35:name"'+(why?' aria-disabled="true" data-why="'+esc(why)+'"':'')+'>Call by name · '+L35.N.C_NAME+' CP</button></div>';}
  const v=L35.verbOf(s);   // the one vocabulary (§3.4): its glyph, its words, and why
  if(s.sys35&&s.sys35.some(x=>x.hp<x.max))h+='<div class="hc-pilot__line h35-subs">'+s.sys35.map(x=>'<span class="sr-tag'+(x.hp<=0?' sr-tag--warn':'')+'">'+esc(SUB35_TIP[x.k][0]+(x.hp<=0?' down':' '+Math.round(Math.max(0,x.hp)/x.max*100)+'%'))+'</span>').join('')+'</div>';   // L4
  h+='<div class="hc-pilot__line"><span class="h35-verb">'+API.glyph(v.g,'hc-glyph--sm')+'<b>'+esc(v.words)+'</b></span>'+(b.why&&!/^order/.test(b.why)?' · '+esc(b.why):'')+(s.load35?' · '+esc(L35.LOADOUTS[s.load35].name)+(s.load35==='bombs'?' ('+(s.bombs||0)+' left)':''):'')+'<br><q>'+esc(s.assess||'')+'</q></div>';
  return h;
}

/* =====================================================================
   Launch, the end, the debrief stub (P1; the cause chain comes with P6)
   ===================================================================== */
function launch(){
  if(!ready())return;
  B.briefT[B.step-1]+=(performance.now()-B.stepAt)/1000;
  B.attempt++;B.screen='live';B.pick=null;B.choose=null;B.abortArm=false;B.inspect=null;B.hoverSub=null;B.hoverFr=false;
  B.lastBrief=B.briefT.slice();B.briefT=[0,0,0,0];B.spd=[0,0,0,0];B.pauses=0;B.lastNow=null;   // this attempt's metrics (§10)
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
  const prim=S.objectives[0],won=prim&&prim.state==='done',opts=L?L.opt:[],fb=L&&L.fallback;
  // the stamp: JOB DONE (the primary and every optional), PARTIAL (a fallback, or not all the optionals), FAILED, ABORTED
  const stamp=o.outcome==='aborted'?['ABORTED','sr-stamp--foe']:won&&!fb&&opts.every(x=>x.state==='done')?['JOB DONE','']:won?['PARTIAL','sr-stamp--action']:['FAILED','sr-stamp--bad'];
  const ph=L?L.phaseT:[0];
  const phs=[0,1,2].map(i=>ph[i]==null?null:((ph[i+1]!=null?ph[i+1]:S.t)-ph[i])).map((v,i)=>v==null?'':'<span class="sr-tag sr-tag--info">Phase '+(i+1)+' · '+fmtClock(v)+'</span>').join('');
  const chk=(ok,txt)=>'<div class="sr-check'+(ok?'':' is-no')+'"><span class="sr-check__box">'+(ok?'✓':'')+'</span>'+esc(txt)+'</div>';
  const lost=losses();
  return '<div class="h35-scrim"><div class="sr-window sr-window--lg h35-debrief"><div class="sr-window__head"><div class="sr-window__title">Debrief · '+esc(opp().title)+'</div><span class="sr-stamp '+stamp[1]+'">'+stamp[0]+'</span></div>'+
    '<div class="sr-window__body"><div class="h35-label">Objectives</div>'+(fb?chk(false,L35.PRIMARIES[fb.from].name+' (primary): off at '+fmtClock(fb.t)+', '+fb.why)+chk(won,L35.PRIMARIES[fb.to].name+' (the fallback)'):chk(won,L35.PRIMARIES[P.primary].name+' (primary)'))+
    opts.map(x=>chk(x.state==='done',L35.OPTIONALS[x.k].name+(x.ship?' · '+(SIM.fn.byId(x.ship)||{name:x.ship}).name:''))).join('')+
    '<div class="h35-label">Loot</div><div>'+esc(lootOf())+'</div>'+rewardRow()+
    '<div class="h35-label">Losses</div><div>'+(lost.length?lost.map(x=>esc(x.name)+' <span class="h35-fine2">('+esc(x.pod)+')</span>').join(', '):'None')+'</div>'+
    '<div class="h35-label">Time in each phase</div><div class="sr-card__meta">'+phs+'</div>'+
    '<div class="h35-label">What decided it</div><div class="h35-why">'+whyLines().map(l=>'<p>'+esc(l)+'</p>').join('')+'</div>'+leadersHtml()+'</div>'+
    '<div class="sr-window__foot"><button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="rulesets">Back to rulesets</button><button type="button" class="sr-btn" data-act="newopp">New opportunity</button>'+
    '<button type="button" class="sr-btn sr-btn--sm" data-act="saverec">Save flight record</button>'+
    '<span class="sr-spacer"></span><button type="button" class="sr-btn sr-btn--primary" data-act="again">Plan again</button></div></div></div>';
}
/* what it paid (feedback 2, §1.1, §3): the reward of the primary you ended on; the Accomplished bonus, or the one missed */
function rewardRow(){
  const L=L35.L;if(!L||!L35.rewardOf)return '';const r=L35.rewardOf(),P=L35.PRIMARIES;
  const got=chips(r.earned)||'<span class="h35-fine2">Nothing</span>';
  const bonus=r.bonus?'<span class="h35-rew__per">incl. Accomplished + '+chips(r.bonus)+'</span>':r.missed?'<span class="h35-rew__miss">Missed: '+esc(P[r.picked].name)+'\'s Accomplished + '+chips(r.missed)+(L.fallback?' (you fell back to '+esc(P[r.k].name)+')':'')+'</span>':'';
  return '<div class="h35-label">Rewards</div><div class="h35-rew h35-rew--deb">'+got+' '+bonus+'</div>';
}
/* how your leaders played it (feedback 2, §3.3): each wing's calls in the field, in order, with why */
const DEC_ICON={signal:'▶',retreat:'↩',home:'↩',fallback:'⟳',job:'➤',second:'➤',hold:'■',request:'?'};
function leadersHtml(){
  const L=L35.L;if(!L||!L.dec||!L.dec.length)return '';
  const by={};for(const d of L.dec)(by[d.wid]=by[d.wid]||[]).push(d);
  let h='<div class="h35-label">How your leaders played it</div><div class="h35-leaders">';
  const order=L35.WINGS35.map(w=>w.id).filter(id=>by[id]).concat(Object.keys(by).filter(id=>!L35.WINGS35.some(w=>w.id===id)));   // the wings in their order
  for(const wid of order){const w=SIM.fn.wingOf(wid)||L35.WINGS35.find(x=>x.id===wid)||{name:wid};
    h+='<div class="h35-lead"><div class="h35-lead__name">'+esc(w.name)+'</div><ol>'+by[wid].map(d=>'<li class="is-'+esc(d.kind)+'"><time>'+fmtClock(d.t)+'</time><i aria-hidden="true">'+(DEC_ICON[d.kind]||'·')+'</i><span><b>'+esc(d.who||w.name)+':</b> “'+esc(d.line)+'”'+(d.why?'<em>'+esc(d.why)+'</em>':'')+'</span></li>').join('')+'</ol></div>';}
  return h+'</div>';
}
/* your losses, each with what became of its pilot */
function losses(){
  const S=SIM.S,L=L35.L;if(!L)return [];
  return S.ships.filter(s=>s.faction==='reb'&&s.wing&&!s.alive&&!s.jumped).map(s=>{const p=L.pods.find(x=>x.ship===s.id);
    return {name:s.name,pod:!p?'no pod':p.state==='aboard'?'picked up':p.state==='captured'?'captured':p.state==='lost'?(p.endT!=null?'lost, left behind':'lost with the ship that had them'):'left behind'};});   // never "drifting" (§3.6)
}
function lootOf(){
  const L=L35.L;if(!L)return 'None';const left=L35.fn.cargoLeft();
  switch(L.primK){
    case 'steal':return L.prizeHome?'The freighter, and '+left+' container'+(left===1?'':'s')+' aboard':'None';
    case 'pirate':return L.transferred?(L.jettOut||0)+' container'+(L.jettOut===1?'':'s')+' handed over':'None';
    case 'strip':return L.hauled?L.hauled+' container'+(L.hauled===1?'':'s')+' hauled home':'None';
    case 'tag':return L.tag.planted&&L.escaped?'A follow-up lead (it carries your tracker)':'None';
    case 'ambush':return L.respKills+' of the response destroyed';
  }
  return 'None: denied to them';
}
/* What decided it (§6): three to six lines, most specific first, each tying an outcome to a plan decision, a power or
   an answer you gave; from the cause log and the context it kept. Placeholder copy (C-78) */
function whyLines(){
  const S=SIM.S,L=L35.L,out=[],fail=[],loss=[];if(!L)return out;   // ordered by weight (§3.6): why the primary failed, then losses, then the rest
  const failed=L.prim.state!=='done';
  const fr=SIM.fn.byId('fl400'),W=id=>(SIM.fn.wingOf(id)||L35.WINGS35.find(w=>w.id===id)||{name:id}).name,ord=e=>e?L35.ORDERS35[e.k].name.toLowerCase()+(e.arg&&typeof e.arg==='string'?' '+(L35.WINGS35.find(w=>w.id===e.arg)?W(e.arg):e.arg):''):'holding';
  for(const d of L.deaths){
    if(d.by==='pd'&&!L.execSeen['suppress:turrets'])loss.push(d.name+' went down to the freighter\'s guns. Nobody was told to take out the turrets.');
    else if(d.phase===3&&d.by==='response'&&d.execBusy&&!d.jumpdone)loss.push(d.name+' was lost to the response at '+fmtClock(d.t)+'. '+W(d.wid)+' was still on '+ord(d.exec)+'.');
    else if(d.stayBy!=null)loss.push(d.name+' stayed in because you said so at '+fmtClock(d.stayBy)+'.');
    else if(d.cls==='brickbat'&&!d.covered)loss.push(d.name+'\'s Brickbat had no cover. No wing was defending '+W(d.wid)+'.');
    else if(d.vol)loss.push(d.name+' put their ship into the target, as you said they could.');
  }
  if(L.escaped&&fr){const e=L.subs.find(x=>x.k==='engines');
    if(e&&e.hp>=e.max){const bb=S.ships.filter(s=>s.faction==='reb'&&s.cls==='brickbat'),why=!L.execSeen['disable:engines']?' Nobody had a Disable order.':bb.some(s=>!s.alive&&!s.jumped)?' A Brickbat was lost.':bb.length&&bb.every(s=>!s.bombs)?' The bombs were spent elsewhere.':'';
      (failed?fail:out).push('The freighter jumped at '+fmtClock(fr.jumpT)+'. Its engines were never hit.'+why);}
    else (failed?fail:out).push('The freighter jumped at '+fmtClock(fr.jumpT)+'.');}
  // the primary's own failure, when the jump wasn't it
  if(failed&&!fail.length&&L.prim.state==='failed'){const k=L.primK,dead=fr&&!fr.alive&&!fr.jumped;
    if(k==='steal')fail.push(dead?'The freighter was destroyed at '+fmtClock(fr.deadT||S.t)+': there was no prize to take.':!L.boardT0?'The boarders never got aboard.':'The prize never made it home.');
    else if(k==='crash')fail.push(dead&&!L.crashed?'It was destroyed in space, not in the planet\'s pull.':L.disabled?'Its power plant went down outside the planet\'s pull: it will never fall.':'Its power plant was never knocked out.');
    else if(k==='strip')fail.push(dead?'The freighter was destroyed before a container came home.':'No container came home.');
    else if(k==='tag')fail.push(dead?'The freighter was destroyed: there\'s nothing left to track.':'The tracker was never planted.');
    else if(k==='ambush')fail.push(L35.modOn(L.mods,'remote')?'It\'s too remote: no response came to ambush.':'No response came to ambush.');
    else if(k==='pirate'&&dead)fail.push('The freighter was destroyed before it handed anything over.');}
  const D=L.distress;
  if(D&&D.landed&&!L.arrayT)out.push('The distress call got out at '+fmtClock(D.t)+(L35.modOn(L.mods,'remote')?', but nobody was near to hear it.':'. That\'s why the response came.'));
  if(D&&D.cut)out.push('The comms array died with the distress call still sending: no response came.');
  for(const r of L.powRes)out.push(r.k==='ram'?'Your ram '+r.text+' at '+fmtClock(r.t)+'.':'Your '+(L35.POWERS35[r.k]||{name:r.k}).name+' at '+fmtClock(r.t)+' '+r.text+'.');   // "Your ram was shot down 300 m short at 0:36" (§3.2)
  for(const m of L.mods){if(m.fake&&m.foundFake!=null)out.push('Cass was wrong: there was no '+L35.MODS[m.k].name+'.');
    else if(!m.fake&&m.foundT!=null&&L35.MODS[m.k].tone==='warn')out.push('Cass missed '+L35.MODS[m.k].name+'. Now you know.');}
  if(L.alarmWhy==='jumpin')out.push('A wing dropped in inside their sensor ring. Phase 1 lasted '+Math.round(L.phaseT[1]||0)+' s.');
  if(L.primK==='pirate'&&L.prim.state!=='done'){const turned=L.req.log.find(q=>q.k==='surrender'&&q.answer==='no'&&q.by==='player');
    const why=L.transferred?'':L.surrender==='take'?'Nobody stood guard for the transfer.':turned?'You turned down their offer at '+fmtClock(turned.sentT)+'.':L.fanaticT!=null?'The crew never folded: they were fanatics.':
      'The crew never folded: resolve bottomed at '+Math.round(L.resMin==null?L.resolve:L.resMin)+'.';if(why)fail.unshift(why);}
  for(const q of L.req.log){if(q.k!=='surrender')continue;const who=(SIM.fn.byId(q.who)||{name:'Your leader'}).name;
    if(q.by==='player')out.push('You answered their hail at '+fmtClock(q.sentT)+': '+L35.ANS[q.answer].toLowerCase()+'.');
    else if(q.by==='default')out.push(who+' decided: '+L35.ANS[q.answer].toLowerCase()+' (no answer from you).');}
  const cap=L.pods.filter(p=>p.state==='captured');
  if(cap.length)loss.push(cap.map(p=>p.name).join(', ')+(cap.length>1?' were':' was')+' left in the pod and captured.');
  if(L.abort)fail.unshift('You aborted at '+fmtClock(L.abortT)+'.');
  // a fallback (feedback 2, §3): why the primary was off, whose call the new job was, and what it cost
  const fb=L.fallback;if(fb){const d=L.dec.find(x=>x.kind==='fallback'),P=L35.PRIMARIES;
    fail.unshift(P[fb.from].name+' was off at '+fmtClock(fb.t)+': '+fb.why+'. '+(d&&d.who?d.who+'\'s call':'The leaders\' call')+': '+P[fb.to].name+' instead'+(L.prim.state==='done'?', done at '+fmtClock(L.prim.doneT||S.t)+'. It paid '+P[fb.to].name+'\'s reward, without '+P[fb.from].name+'\'s Accomplished bonus.':', and that wasn\'t done either.'));}
  out.unshift(...fail,...loss);
  if(L.exposure)out.push('The Firebrand Broadcast went out in the clear: the Hegemony heard your voice (Exposure).');
  if(L.burned)out.push('The Agent aboard acted for you, and may be burned.');
  if(L.pirated)out.push('The pirates left with '+L.pirated+' container'+(L.pirated>1?'s':'')+'.');
  // too few: the moments the job turned on, from the feed
  if(out.length<3)for(const c of L.cause){if(out.length>=3)break;if(/^(sub|board|surrender|crash|objective|tag|haul|phase|fjump|reinforce)$/.test(c.kind))out.push(c.text.replace(/[.:]?$/,'')+' ('+fmtClock(c.t)+').');}
  // and how it ended: the primary, then the count
  if(out.length<3){const o=L.prim,P=L35.PRIMARIES[L.primK];out.push(P.name+(o.state==='done'?': done at '+fmtClock(o.doneT||S.t)+'.':L.retreat||L.abort?': not done; you called them home.':': not done.'));}
  if(out.length<3){const mine=S.ships.filter(s=>s.faction==='reb'&&s.wing),lost=mine.filter(s=>!s.alive&&!s.jumped).length;out.push(lost?lost+' of your '+mine.length+' ships lost; '+(mine.length-lost)+' came home.':'All '+mine.length+' of your ships came home.');}
  return out.slice(0,6);
}
function planAgain(){
  // the same seed and modifiers, every modifier found in play now known, the last plan kept
  B.planAgain=true;const last=B.metrics[B.metrics.length-1];if(last)last.planAgain=true;
  B.step=1;B.part=1;enterBrief();   // back to window 1, the plan kept (§3.6)
}
/* the attempt's record (§10), pushed to ARENA_METRICS ("Dump metrics" prints the session) */
function record(){
  const S=SIM.S,L=L35.L;if(!S||!L)return null;
  const ph=L.phaseT,P=L.plan,lq=L.req.log;
  const rec={ruleset:'hc35',seed:B.seed,attempt:B.attempt,opportunity:B.oppId,
    mods:L.mods.map(m=>({k:m.k,fake:!!m.fake,hidden:!!m.hidden&&!m.dug&&!(m.found&&m.foundT==null),found:m.foundT!=null?m.foundT:m.foundFake!=null?+m.foundFake.toFixed(2):null})),   // hidden: unknown at launch; found: when, in play
    primary:P.primary,optionals:L.opt.map(o=>({k:o.k,ship:o.ship,state:o.state})),roes:P.roes.slice(),
    wings:Object.fromEntries(L35.WINGS35.map(w=>[w.id,{role:P.wings[w.id].role,loadout:Object.assign({},P.wings[w.id].loadout),exec:P.wings[w.id].exec,second:P.wings[w.id].second}])),
    assets:P.assets.slice(),briefSecs:(B.lastBrief||[0,0,0,0]).map(v=>+v.toFixed(1)),
    phaseSecs:[0,1,2].map(i=>ph[i]==null?null:+(((ph[i+1]!=null?ph[i+1]:S.t)-ph[i]).toFixed(1))),
    speedSecs:(B.spd||[0,0,0,0]).map(v=>+v.toFixed(1)),pauses:B.pauses||0,pausedSecs:+((B.spd||[0])[0]).toFixed(1),
    powers:L.powLog.slice(),cpUnspent:(L.cpLost||0)+L.cp,
    requests:{raised:lq.filter(q=>q.by==='player'||q.by==='default').length,answered:lq.filter(q=>q.by==='player').length,defaulted:lq.filter(q=>q.by==='default').length,
      list:lq.map(q=>({k:q.k,who:q.who,answer:q.answer,by:q.by,t:+q.t0.toFixed(2)}))},
    secondaries:L.secLog.map(x=>({wing:x.wid,t:+x.t.toFixed(2),trig:x.trig,k:x.k})),offPlanSecs:Object.fromEntries(Object.entries(L.offSecs).map(([k,v])=>[k,+v.toFixed(1)])),
    outcome:S.over?S.over.outcome:'abandoned',stamp:S.over&&S.over.outcome==='aborted'?'aborted':L.prim.state==='done'?(!L.fallback&&L.opt.every(o=>o.state==='done')?'done':'partial'):'failed',
    fallback:L.fallback?Object.assign({},L.fallback):null,reward:L35.rewardOf?L35.rewardOf():null,decisions:(L.dec||[]).map(d=>({wing:d.wid,t:d.t,kind:d.kind,line:d.line,why:d.why})),
    loot:lootOf(),losses:losses().map(x=>x.name),pods:L.pods.map(p=>({who:p.ship,state:p.state})),t:+S.t.toFixed(2),
    planAgain:false,commsOff:!!L35.N.COMMS_OFF,requestsOff:!!L35.N.REQ_OFF};
  B.metrics.push(rec);A.metrics.push(rec);if(window.SR_FLIGHT)SR_FLIGHT.metrics(rec);   // joins the run's flight record
  try{console.log('ARENA_METRICS '+JSON.stringify(rec));}catch(e){}
  return rec;
}

/* =====================================================================
   The world layer: the plan view (lane, gravity window, planet, rings, markers) and the FL-400
   ===================================================================== */
const shipHidden=s=>(B.screen==='brief'&&s.faction==='reb'&&!s.struct)||!!s.inHangar35;   // in the plan view the markers stand in for your wings; a boarder in a hangar is out of sight
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
  const subs=L?L.subs:[],pd=subs.filter(x=>x.k==='pd');   // each turret on its own target; a dead one drawn dead (§3.2)
  SA.ship(c,'gafreighter',p.x,p.y,p.h,sc,t,{livery:'heg',sized:true,damage:Math.max(0,1-Math.max(0,s.hull)/s.maxHull),
    lost:L?L35.fn.cargoLost():[],aims:pd.map(x=>x.hp>0&&x.aimA!=null?x.aimA:null),pdDead:pd.map(x=>x.hp<=0),fire:pd.map(x=>x.hp>0&&SIM.S.t-x.shotT<0.3),
    breaches:L&&L.breaches||null,off:!!(L&&(L.disabled||L.surrender))});
}
/* a Brickbat in the rebel livery its loadout calls for, its racks showing the bombs left */
function drawBrickbat(c,s,p,z,boost,view){
  const sc=(0.7+0.09*s.row.size)*1.6*0.85*1.35*boost,att=s.load35==='pods'?['cargopod']:s.load35==='board'?[]:['bombrack'];
  SA.ship(c,'brickbat',p.x,p.y,p.h,sc,performance.now()/1000,{livery:'rebel',loadout:{attach:att},bombs:s.bombs!=null?Math.ceil(s.bombs/2):3,crates:s.pods?s.pods.length:0,damage:Math.max(0,1-Math.max(0,s.hull)/s.maxHull)});
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
  if(!plan){drawPowers(c,z,view,o);drawPods(c,z);}
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
      if(s.load35==='board'){const q={x:fr.x+(d.x-fr.x)*0.45,y:fr.y+(d.y-fr.y)*0.45};if(FX&&view)FX.drawBoardLink(c,sp,q,L.board,view);else API.dashLine(c,sp,q,C.gold,z,2.4,[6,5]);}   // always, whatever is selected (§3.4)
      else{const cm=L.subs.find(x=>x.k==='cargo'&&x.hp>0&&!x.taken&&!x.hazard),q=cm?F.subWorld(fr,cm):fr;c.save();c.lineWidth=3/z;c.strokeStyle=TH.rgba(C.steel,0.85);c.beginPath();c.moveTo(sp.x,sp.y);c.lineTo(q.x,q.y);c.stroke();
        const u=((s.haulT||0)/L35.N.HAUL_SECS);c.fillStyle='#8e96a2';c.strokeStyle=C.ink;c.lineWidth=1.5/z;const bx=q.x+(sp.x-q.x)*u,by=q.y+(sp.y-q.y)*u,bw=14*boost;c.fillRect(bx-bw/2,by-bw/3,bw,bw*0.66);c.strokeRect(bx-bw/2,by-bw/3,bw,bw*0.66);c.restore();}}
  }
  // a tow: the line from the tug to what it's towing, whatever is selected (§3.4)
  for(const s of S.ships){if(!s.alive||!s.towed35)continue;const g=SIM.fn.byId(s.towed35);if(!g||!g.alive)continue;API.dashLine(c,API.ipos(g),API.ipos(s),C.steel,z,2.6,[9,6]);}
  if(fr&&fr.alive){const F=L35.fn;
    // disabled: sparks at the engine block now and then; falling into the planet: a hazard heat rim on its leading edge
    if(L.disabled&&FX&&Math.floor(now*3)!==L._spark){L._spark=Math.floor(now*3);const e=L.subs.find(x=>x.k==='engines'),p=F.subWorld(fr,e);FX.event('boltHit',{x:p.x,y:p.y,surface:'hull',dir:fr.h+Math.PI,r:26*boost});}
    const pd=Math.hypot(fr.x-L.planet.x,fr.y-L.planet.y);
    if(L.disabled&&pd<L.planet.r+4000){const a=Math.atan2(L.planet.y-fr.y,L.planet.x-fr.x),k=1-Math.max(0,(pd-L.planet.r)/4000),r=130*boost;
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
  let acc=0,next=30,win=null;const step=40;B.laneTicks=[];   // (kept for the hover tips)
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],d=Math.hypot(b.x-a.x,b.y-a.y);
    for(let u=0;u<d;u+=step){const x=a.x+(b.x-a.x)*u/d,y=a.y+(b.y-a.y)*u/d,t=(acc+u)/v;
      const inP=Math.hypot(x-L.planet.x,y-L.planet.y)<L.planet.pull;
      if(inP){if(!win)win={t0:t,pts:[]};win.t1=t;win.pts.push({x,y});}
      if(t>=next){B.laneTicks.push({x,y,t:next});c.save();c.beginPath();c.arc(x,y,4/z,0,6.283);c.fillStyle=C.steel;c.fill();c.restore();API.label(c,x,y-12/z,fmtClock(next),C.steel,z,10,'Bungee');next+=30;}}
    acc+=d;}
  B.gwin=win;
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
/* the activity badge (§3.4): over each of your ships at every zoom, a round badge with a rebel-red rim, the verb's
   white glyph, and a gold ring for a timed verb's progress. It pops when the verb changes; badges that overlap fan
   apart (up to 14 px each). Enemies get none */
const VB=new Map(),VBP=new Map(),BADGE_R=11;   // placeholders (C-81)
const vbPath=k=>{let p=VBP.get(k);if(!p){p=new Path2D(API.GLYPH[k]||API.GLYPH.hold);VBP.set(k,p);}return p;};
function drawVerbBadges(c,z){
  const S=SIM.S,now=performance.now(),R=BADGE_R,calm=API.fxReduced(),list=[];
  for(const s of S.ships){
    if(!s.alive||s.faction!=='reb'||!s.wing||s.struct||(API.A.ov&&API.A.ov.shipHidden&&API.A.ov.shipHidden(s)))continue;
    const v=L35.verbOf(s),p=API.ipos(s),q=API.toScreen(p.x,p.y);if(q.x<-40||q.y<-40||q.x>API.cssW+40||q.y>API.cssH+40)continue;
    let e=VB.get(s.id);if(!e||e.k!==v.k)VB.set(s.id,e={k:v.k,t:now});
    const r=API.artK(s)<0.5?API.ICONS.ICON_SIZE/2:API.uiR(s)*z;list.push({v,e,x:q.x,y:q.y-r-26,off:0});}
  list.sort((a,b)=>a.x-b.x);
  for(let i=0;i<list.length;i++)for(let j=0;j<i;j++){const a=list[j],b=list[i],gap=2*R+3-Math.abs((b.x+b.off)-(a.x+a.off));
    if(gap>0&&Math.abs(b.y-a.y)<2*R+3){const m=gap/2;a.off=Math.max(-14,a.off-m);b.off=Math.min(14,b.off+m);}}
  c.save();
  for(const b of list){const x=b.x+b.off,y=b.y,age=now-b.e.t,k=calm?1:age<200?1.3-0.3*age/200:1;
    c.save();c.translate(x,y);c.scale(k,k);
    c.beginPath();c.arc(0,0,R,0,6.283);c.fillStyle=C.ink;c.fill();c.lineWidth=2.4;c.strokeStyle=C.rebel;c.stroke();
    if(b.v.prog!=null){c.beginPath();c.arc(0,0,R+3,-Math.PI/2,-Math.PI/2+b.v.prog*6.283);c.lineWidth=2.6;c.strokeStyle=C.gold;c.stroke();}
    c.translate(-R*0.62,-R*0.62);c.scale(R*1.24/24,R*1.24/24);c.lineWidth=2.6;c.lineCap='round';c.lineJoin='round';c.strokeStyle='#fff';c.stroke(vbPath(b.v.g));
    c.restore();}
  c.restore();
}
/* the callouts (§3.4): a world-anchored label over the spot (1.2 × → 1, held 2.5 s, faded), green for our wins, orange
   for danger to us, blue for the enemy's moves; off screen, an edge arrow in its colour points at it for 3 s */
const CO={POP:0.2,HOLD:2.5,FADE:0.5,ARROW:3};   // placeholders (C-81)
function drawCallouts(c){
  const S=SIM.S,L=L35.L,now=S.t,W=API.cssW,H=API.cssH,calm=API.fxReduced(),laid=[];B.coArrows=[];
  c.save();c.textAlign='center';c.textBaseline='middle';
  for(const e of L.callouts||[]){const age=now-e.t;if(age<0||age>=Math.max(CO.HOLD+CO.FADE,CO.ARROW)||e.x==null)continue;
    const col=e.tone==='good'?C.go:e.tone==='foe'?C.heg:C.hazard,q=API.toScreen(e.x,e.y);
    if(q.x<0||q.y<0||q.x>W||q.y>H){if(age>=CO.ARROW)continue;   // off screen: an arrow on the edge, pointing at it
      const cx=W/2,cy=H/2,dx=q.x-cx,dy=q.y-cy,k=Math.min((W/2-30)/Math.max(1e-6,Math.abs(dx)),(H/2-30)/Math.max(1e-6,Math.abs(dy))),ax=cx+dx*k,ay=cy+dy*k,an=Math.atan2(dy,dx);
      c.save();c.translate(ax,ay);c.rotate(an);c.beginPath();c.moveTo(14,0);c.lineTo(-8,-10);c.lineTo(-3,0);c.lineTo(-8,10);c.closePath();c.fillStyle=col;c.fill();c.lineWidth=2.5;c.strokeStyle=C.ink;c.stroke();c.restore();
      B.coArrows.push({text:e.text,x:ax,y:ay});continue;}
    if(age>=CO.HOLD+CO.FADE)continue;
    const k=calm?1:age<CO.POP?1.2-0.2*age/CO.POP:1,al=age>CO.HOLD?1-(age-CO.HOLD)/CO.FADE:1;
    c.font='400 18px Bungee,"Exo 2",sans-serif';const w=c.measureText(e.text).width+16;let y=q.y-54;
    for(let pass=0;pass<4;pass++)for(const o of laid)if(Math.abs(o.x-q.x)<(o.w+w)/2&&Math.abs(o.y-y)<26)y=o.y-28;   // stacked, never on top of each other
    laid.push({x:q.x,y,w});
    c.save();c.globalAlpha=al;c.translate(q.x,y);c.scale(k,k);c.lineWidth=5;c.lineJoin='round';c.strokeStyle=C.ink;c.strokeText(e.text,0,0);c.fillStyle=col;c.fillText(e.text,0,0);c.restore();}
  c.restore();
}
function drawScreen(c,view,o){
  const S=SIM.S,L=L35.L;if(!S||!L||B.screen!=='live')return;
  drawVerbBadges(c,o.z);drawCallouts(c);
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
/* the canvas's tips (§3.6), in the one tooltip box: the plan markers, the lane's time ticks, the gravity window */
function planTip(p,m){
  let d=null,at=null;const tol=14/cam.z;
  if(m){const w=m.type==='asset'?null:W35(m.id),pw=w?B.plan.wings[w.id]:null;at=toWorld(m.type==='asset'?L35.assetAt(B.plan,m.id):pw.jumpIn);
    d=m.type==='asset'?{title:L35.ASSETS[m.id].name,body:'Drag to place it.',foot:L35.ASSETS[m.id].power?'Unlocks '+L35.ASSETS[m.id].power:'Passive',tone:'cost'}:
      {title:w.name+'\'s jump-in',body:'Drag to move it. It warps in here at the start'+(pw.role==='reserve'?', when you call it.':'.'),foot:inRing(pw.jumpIn)?'Inside an escort\'s sensor ring: they\'ll see it arrive':null,tone:'warn'};}
  else{const t=(B.laneTicks||[]).find(q=>Math.hypot(q.x-p.x,q.y-p.y)<tol);
    if(t){at=t;d={title:'The freighter at '+fmtClock(t.t),body:'Where it should be this far into the mission, at its cruise.'};}
    else if(B.gwin&&B.gwin.pts.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<tol)){at=B.gwin.pts[Math.floor(B.gwin.pts.length/2)];
      d={title:'Gravity window '+fmtClock(B.gwin.t0)+'–'+fmtClock(B.gwin.t1),body:'Disabled in here, it falls into the planet (Crash). Outside it, it only drifts.'};}}
  const key=d?d.title:null;if(key===B.planTipK)return;B.planTipK=key;
  if(d){const sp=API.toScreen(at.x,at.y);API.showTipAt(sp.x,sp.y,d);}else API.hideTip();
}
function pointer(kind,p,ev){
  if(B.screen==='live'&&kind==='hover'){hoverSubs(p);return false;}
  if(B.screen==='brief'){
    if(kind==='hover'){const m=markerAt(p),h=m?(m.type==='asset'?'a:':'')+m.id:null;if(h!==B.hover){B.hover=h;STAGE.style.cursor=h?'grab':'';}planTip(p,m);return false;}
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
  if(B.screen==='live'&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey&&reqKey(ev)){ev.preventDefault();return true;}   // Shift+1–3: the newest request
  if(B.screen==='live'&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){const i=PKEYS.indexOf(k.toLowerCase());if(i>=0){const p=barPowers()[i];if(p){ev.preventDefault();startPower(p.k);return true;}}}
  if(B.screen==='board'||B.screen==='debrief'||B.screen==='brief'){
    const typing=ev.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName||'');
    if(B.screen==='brief'&&!typing){
      if(k==='Escape'||k==='ArrowLeft'){ev.preventDefault();backStep();return true;}
      if(k==='ArrowRight'&&B.step<4){ev.preventDefault();nextStep();return true;}
      if(k==='Enter'&&B.step<4&&!(ev.target&&ev.target.closest&&ev.target.closest('button'))){ev.preventDefault();if(!nextWhy())nextStep();return true;}}
    if(k==='Enter'&&B.screen==='board'){ev.preventDefault();enterBrief();return true;}
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
  else if(B.screen==='brief')h=briefHtml();
  else if(B.screen==='debrief')h=debriefHtml();
  if(B.screen==='live'&&B.banner&&performance.now()-B.banner.at<1400&&!API.fxReduced())h+='<div class="sr-banner"><span class="sr-banner__txt">'+esc(B.banner.txt)+'<span class="sr-banner__sub">'+esc(B.banner.sub)+'</span></span></div>';
  // a re-render keeps each scrolled pane where it was, so a pick doesn't throw you back to the top (feedback 2, §1)
  const keep=[...ROOT.querySelectorAll('[data-keep]')].map(el=>[el.dataset.keep,el.scrollTop]);
  API.hideTipIn(ROOT);ROOT.innerHTML=h;ROOT.dataset.screen=B.screen;ROOT.dataset.step=B.screen==='brief'?B.step:'';ROOT.dataset.part=B.screen==='brief'&&B.step===1?B.part:'';
  for(const [k,t] of keep){const el=ROOT.querySelector('[data-keep="'+k+'"]');if(el)el.scrollTop=t;}
  paintCanvases();
  if(B.screen==='brief'&&B.step===4)fitPane();   // the plan map, through window 4's pane
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
function paintTarget(t){   // the holo-table's freighter, on its lane in its Hegemony livery
  const cv=ROOT.querySelector('canvas[data-target]');if(cv){const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);
    try{SA.ship(g,'gafreighter',cv.width/2,cv.height/2,0,2.1,t,{livery:'heg',still:true});}catch(e){}}
  for(const tv of ROOT.querySelectorAll('canvas[data-thumb]')){const g=tv.getContext('2d');g.clearRect(0,0,tv.width,tv.height);g.fillStyle='#070818';g.fillRect(0,0,tv.width,tv.height);
    try{SA.ship(g,'gafreighter',tv.width/2,tv.height/2,-0.7,1.5,0,{livery:'heg',still:true});}catch(e){}}
}
function tick(now){
  // seconds at each speed, and the pauses (the boredom proxy, §10)
  if(B.screen==='live'&&SIM.S&&!SIM.S.over){const dt=B.lastNow==null?0:Math.min(0.25,(now-B.lastNow)/1000);B.spd[A.speed]=(B.spd[A.speed]||0)+dt;if(A.speed===0&&B.prevSpd!==0)B.pauses++;B.prevSpd=A.speed;}
  B.lastNow=now;
  if(B.screen==='live')syncReq();
  syncTarget(false);
}
byId('hcClock').addEventListener('click',ev=>{const b=ev.target.closest('[data-act="plan"]');if(!b||B.screen!=='live')return;B.planOverlay=!B.planOverlay;B.planUser=true;API.syncHud(true);});
ROOT.addEventListener('click',ev=>{
  const b=ev.target.closest('button'),a=b&&b.dataset.act;
  if(a==='needs'){B.needsPop=!B.needsPop;render();return;}
  if(B.needsPop&&!ev.target.closest('.h35-needs__pop')){B.needsPop=false;if(!a)render();}   // the readiness list: any other click closes it
  if(!b)return;
  if(b.closest('[data-stop]')&&!b.dataset.act)return;
  if(b.getAttribute('aria-disabled')==='true'){if(b.dataset.why)API.flash(b.dataset.why);return;}
  if(a==='board'){if(B.screen==='brief')B.briefT[B.step-1]+=(performance.now()-B.stepAt)/1000;showBoard(false);return;}   // the plan is kept
  if(a==='newopp'){B.seed=newSeed();rollAttempt();showBoard(false);return;}
  if(a==='dig'){dig();return;}
  if(a==='brief'){enterBrief();return;}
  if(a==='rulesets'){close();API.toRulesets();return;}
  if(a==='title'){API.backToTitle();return;}
  if(a==='next'){nextStep();return;}
  if(a==='prev'){backStep();return;}
  if(a==='launch'){launchFromWindow();return;}
  if(a==='again'){planAgain();return;}
  if(a==='saverec'){if(!(window.SR_FLIGHT&&SR_FLIGHT.download()))API.flash('No flight record yet');return;}
  if(b.dataset.step){goStep(+b.dataset.step);return;}
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
  return (P.target==='mine'?(B.pick.k==='tug'?'Pick one of your ships, or a pod':'Pick one of your ships'):P.target==='foe'?'Pick an enemy'+(B.pick.k==='mark'||B.pick.k==='ram'?' or a freighter subsystem':''):'Pick a target')+' · Esc to cancel';
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
/* a small ship's subsystems (feedback 2, L4): where each sits, drawn on the interpolated pose */
const SUB35_R=0.32;   // a small ship's subsystem ring, × its half-length. placeholder
function sub35Pos(s,x){const q=API.ipos(s),a=SIM.fn.hullAxes(s).a;return {x:q.x+Math.cos(q.h)*x.x*a,y:q.y+Math.sin(q.h)*x.x*a,r:Math.max(a*SUB35_R,1)};}
function sub35Under(s,p){if(!s||!s.sys35)return null;let best=null,bd=1e9;
  for(const x of s.sys35){const q=sub35Pos(s,x),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<Math.max(q.r*1.4,9/cam.z)&&d<bd){bd=d;best=x;}}return best;}
/* the freighter subsystem nearest a click on it (or null: the hull) */
function subAt(fr,p){
  const L=L35.L,u=L35.fn.FL_UNIT();let best=null,bd=1e9;   // within each one's true-scale size (§3.5), or a fingertip at this zoom
  for(const sb of L.subs){if(sb.hp<=0||(sb.k==='cargo'&&sb.taken)||!(sb.k!=='power'||L.powerSeen))continue;const q=L35.fn.subWorld(fr,sb),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<Math.max(sb.r*u*1.6,14/cam.z)&&d<bd){bd=d;best=sb;}}
  return best?(best.k==='pd'?'turrets':best.k):null;
}

/* =====================================================================
   The target's state (feedback 1, §3.5): an enemy selected to inspect, its readout card (top right, until K7
   places it), and the subsystem rings and tips on the map
   ===================================================================== */
const SUB_TIP={engines:['Engines','She crawls on her thrusters, and can\'t jump.','Knock them out and she crawls on her thrusters, and can\'t jump.'],
  power:['Power plant','Dead in space: no guns, no comms; she drifts, and inside the pull she falls.','Knock it out and she\'s dead in space: inside the planet\'s pull, she falls.'],comms:['Comms','No distress call can go out.','It sends the distress call.'],
  pd:['Turret','One less gun on your ships.','Point defence: it struggles against fast ships.'],cargo:['Container','','A container: take it, or lose it.']};
const SUB35_TIP={engines:['Engines','It limps: slow, no hard turns, no boost.','Knock them out and it limps: slow, no hard turns, no boost.'],
  guns:['Guns','Its guns are silent.','Knock them out and it can\'t shoot.'],shields:['Shield generator','Its shields are down for good.','Knock it out and its shields drop for good.']};
function sub35Tip(s,x){const T=SUB35_TIP[x.k],dead=x.hp<=0;return {title:(s.label||s.name)+' · '+T[0],body:dead?T[1]:T[2],foot:dead?'Down':Math.max(0,Math.ceil(x.hp))+' / '+x.max+(s.faction!=='reb'?' · Mark or Focus it to aim there':''),tone:dead?'info':s.faction==='reb'?'good':'foe'};}
const subCol=sb=>sb.hp<=0?'#5a5f6e':TH.hpCol(sb.hp/sb.max,'gor');
function subTip(sb){const T=SUB_TIP[sb.k]||[sb.k,'',''],dead=sb.hp<=0;
  if(sb.k==='cargo')return {name:'Container · '+(sb.taken?'Taken':dead?'Destroyed':Math.ceil(sb.hp)+'/'+sb.max)+(sb.hazard&&!sb.taken?' · Hazard':''),line:sb.taken?'It\'s yours.':dead?'Lost with what was in it.':T[2]};
  return {name:T[0]+' · '+Math.max(0,Math.ceil(sb.hp))+'/'+sb.max+(dead?' · Down':''),line:dead?T[1]:T[2]};}
const inspected=()=>{const s=B.inspect&&SIM.S?SIM.fn.byId(B.inspect):null;return s&&s.alive?s:null;};
const ringsOn=fr=>B.inspect==='fl400'||B.hoverFr||cam.z>=RING_ZOOM||(B.pick&&!!B.pick.k);
const RING_ZOOM=0.5;   // the subsystem rings show at this zoom and closer, or with the freighter selected or hovered. placeholder (C-81)
function subUnder(fr,p,cargo){const L=L35.L,u=L35.fn.FL_UNIT();let best=null,bd=1e9;
  for(const sb of L.subs){if((sb.k==='cargo'&&!cargo)||!(sb.k!=='power'||L.powerSeen))continue;const q=L35.fn.subWorld(fr,sb),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<Math.max(sb.r*u*1.6,12/cam.z)&&d<bd){bd=d;best=sb;}}
  return best;}
function hoverSubs(p){
  const L=L35.L,fr=SIM.fn.byId('fl400');let hs=null;
  if(fr&&fr.alive&&L){const A2=SIM.fn.hullAxes(fr),c=Math.cos(-fr.h),sn=Math.sin(-fr.h),lx=(p.x-fr.x)*c-(p.y-fr.y)*sn,ly=(p.x-fr.x)*sn+(p.y-fr.y)*c;
    B.hoverFr=(lx/A2.a)**2+(ly/A2.b)**2<=1.4;if(ringsOn(fr))hs=subUnder(fr,p,B.inspect==='fl400');}else B.hoverFr=false;
  if(hs!==B.hoverSub){B.hoverSub=hs;if(hs){const q=L35.fn.subWorld(fr,hs),sp=API.toScreen(q.x,q.y);API.showTipAt(sp.x,sp.y,subTip(hs));B.tipOn=true;}else if(B.tipOn){API.hideTip();B.tipOn=false;B.tipShip=null;}}
  if(hs)return;
  // a small ship's subsystem, on the one inspected (or, while a power picks, under the cursor): feedback 2, L4
  const ins=inspected(),cand=ins&&ins.id!=='fl400'?ins:B.pick?SIM.S.ships.find(x=>x.alive&&x.sys35&&x.faction!=='reb'&&Math.hypot(x.x-p.x,x.y-p.y)<Math.max(API.uiR(x),14/cam.z)):null;
  const sx=cand?sub35Under(cand,p):null,key=sx?cand.id+':'+sx.k:null;
  if(key!==B.hoverSub35){B.hoverSub35=key;B.ringShip=cand?cand.id:null;
    if(sx){const q=sub35Pos(cand,sx),sp=API.toScreen(q.x,q.y);API.showTipAt(sp.x,sp.y,sub35Tip(cand,sx));B.tipOn=true;B.tipShip='sub';return;}
    else if(B.tipShip==='sub'){API.hideTip();B.tipOn=false;B.tipShip=null;}}
  if(sx)return;
  B.ringShip=cand?cand.id:null;
  // a ship: its name, class and what it's doing
  let sh=null,bd=1e9;for(const s of SIM.S.ships){if(!s.alive||(s.id==='fl400'&&B.hoverFr))continue;const d=Math.hypot(s.x-p.x,s.y-p.y),r=Math.max(API.uiR(s),14/cam.z);if(d<r&&d<bd){bd=d;sh=s;}}
  if((sh&&sh.id)!==B.tipShip){B.tipShip=sh&&sh.id;
    if(sh){const v=sh.faction==='reb'&&sh.wing?L35.verbOf(sh):null,q=API.ipos(sh),sp=API.toScreen(q.x,q.y);
      API.showTipAt(sp.x,sp.y,{title:sh.label||sh.name,body:(sh.row&&sh.row.name||sh.cls)+(v?' · '+v.words:sh.role35==='escort'?' · escort':''),foot:sh.faction==='reb'?null:'Click to inspect',tone:'info'});B.tipOn=true;}
    else if(B.tipOn){API.hideTip();B.tipOn=false;}}
}
/* on the map: a small ring on each subsystem in its state colour (a dead one grey with a ✕); the containers too with
   the freighter selected; and the one a power would hit, while it picks */
function drawSubRings(c,z){
  drawSub35Rings(c,z);
  const L=L35.L,fr=SIM.fn.byId('fl400');if(!fr||!fr.alive||!L||!ringsOn(fr))return;
  const u=L35.fn.FL_UNIT(),all=B.inspect==='fl400';
  for(const sb of L.subs){if(sb.k==='cargo'&&!all)continue;if(sb.k==='cargo'&&sb.taken)continue;if(!(sb.k!=='power'||L.powerSeen))continue;
    const q=L35.fn.subWorld(fr,sb),r=Math.max(sb.r*u*(sb.k==='cargo'?0.75:1.25),(sb.k==='cargo'?3.5:5)/z),col=subCol(sb),hot=B.hoverSub===sb;
    c.save();c.lineWidth=(hot?3:1.8)/z;c.strokeStyle=hot&&B.pick?C.gold:col;c.globalAlpha=sb.hp<=0?0.8:0.9;c.beginPath();c.arc(q.x,q.y,r,0,6.283);c.stroke();
    if(sb.hp<=0){const d=r*0.55;c.beginPath();c.moveTo(q.x-d,q.y-d);c.lineTo(q.x+d,q.y+d);c.moveTo(q.x+d,q.y-d);c.lineTo(q.x-d,q.y+d);c.stroke();}
    c.restore();}
}
/* a small ship's rings: the one inspected, and the one under the cursor while a power picks */
function drawSub35Rings(c,z){
  const ids=new Set();const ins=inspected();if(ins&&ins.id!=='fl400')ids.add(ins.id);if(B.pick&&B.ringShip)ids.add(B.ringShip);
  for(const id of ids){const s=SIM.fn.byId(id);if(!s||!s.alive||!s.sys35)continue;
    for(const x of s.sys35){const q=sub35Pos(s,x),r=Math.max(q.r,4/z),hot=B.hoverSub35===s.id+':'+x.k,col=x.hp<=0?'#5a5f6e':TH.hpCol(x.hp/x.max,'gor');
      c.save();c.lineWidth=(hot?2.6:1.5)/z;c.strokeStyle=hot&&B.pick?C.gold:col;c.globalAlpha=0.9;c.beginPath();c.arc(q.x,q.y,r,0,6.283);c.stroke();
      if(x.hp<=0){const d=r*0.55;c.beginPath();c.moveTo(q.x-d,q.y-d);c.lineTo(q.x+d,q.y+d);c.moveTo(q.x+d,q.y-d);c.lineTo(q.x-d,q.y+d);c.stroke();}
      c.restore();}}
}
/* the readout card */
let TGT=null,tgtAt=0,tgtH='';
function tgtEl(){if(!TGT||!TGT.isConnected){TGT=document.createElement('div');TGT.className='h35-tgt';TGT.id='h35Tgt';TGT.hidden=true;document.getElementById('hcStage').appendChild(TGT);}return TGT;}
function syncTarget(force){
  const el=tgtEl(),s=B.screen==='live'?inspected():null;
  if(!s){if(!el.hidden){el.hidden=true;tgtH='';}return;}
  const now=performance.now();if(!force&&now-tgtAt<150)return;tgtAt=now;
  const h=s.id==='fl400'?frCard(s):escortCard(s);
  if(h!==tgtH){el.innerHTML=h;tgtH=h;}el.hidden=false;
  if(s.id==='fl400')paintSchematic(el.querySelector('canvas'),s);else paintShipSchematic(el.querySelector('canvas'),s);
}
function frCard(fr){
  const L=L35.L,N=L35.N,S=SIM.S,subs=L.subs,e=subs.find(x=>x.k==='engines'),cm=subs.find(x=>x.k==='comms'),pd=subs.filter(x=>x.k==='pd'),cg=subs.filter(x=>x.k==='cargo');
  const taken=cg.filter(x=>x.taken).length,lost=cg.filter(x=>!x.taken&&x.hp<=0).length,aboard=cg.length-taken-lost,pdUp=pd.filter(x=>x.hp>0).length;
  const row=(k,txt,col)=>'<div class="h35-tgt__row" data-row="'+k+'"><i style="background:'+col+'"></i><span>'+esc(txt)+'</span></div>';
  const hpr=x=>Math.max(0,Math.ceil(x.hp))+'/'+x.max+(x.hp<=0?' · DOWN':'');
  let h='<div class="h35-tgt__head"><b>'+esc(fr.name)+'</b><span>FL-400 freighter</span></div><canvas class="h35-tgt__sch" width="520" height="168"></canvas><div class="h35-tgt__rows">'+
    row('engines','Engines · '+hpr(e),subCol(e))+(L.powerSeen?row('power','Power plant · '+hpr(subs.find(x=>x.k==='power')),subCol(subs.find(x=>x.k==='power'))):'')+row('comms','Comms · '+hpr(cm),subCol(cm))+
    row('turrets','Turrets · '+pdUp+' of '+pd.length,pdUp?TH.hpCol(pdUp/pd.length,'gor'):'#5a5f6e')+
    row('cargo','Cargo · '+aboard+' aboard'+(taken?' · '+taken+' taken':'')+(lost?' · '+lost+' destroyed':''),C.steel)+'</div>';
  h+=API.bar('Core',fr.hull,fr.maxHull,'is-hull');
  if(L.primK==='pirate'||Object.values(L.exec).some(x=>x&&x.k==='intimidate'))h+='<div class="hc-pbar is-res" data-k="Resolve"><span>Crew resolve</span><i><b style="width:'+Math.round(Math.max(0,L.resolve))+'%;background:'+C.heg+'"></b></i><em>'+Math.round(Math.max(0,L.resolve))+'</em></div>';
  const ch=[];const D=L.distress;
  if(L.disabled)ch.push('DEAD IN SPACE');else if(L.engOut)ch.push('THRUSTERS ONLY');if(L.disabled&&L.drift&&Math.hypot(fr.vx,fr.vy)>2)ch.push('DRIFTING');
  if(L.spool!=null&&!L.disabled)ch.push('JUMP SPOOLING '+Math.max(0,Math.ceil(L35.TUNE.JUMP_SECS.get()-(S.t-L.spool)))+' s');
  if(L.board>0&&!L.boarded)ch.push('BOARDING '+Math.round(L.board*100)+'%');
  if(D&&!D.landed&&!D.cut)ch.push('DISTRESS '+Math.round(Math.min(1,(S.t-D.t0)/N.DISTRESS_SECS)*100)+'%');
  if(L.surrender)ch.push('SURRENDERING');
  if(ch.length)h+='<div class="h35-tgt__chips">'+ch.map(t=>'<span class="sr-tag">'+esc(t)+'</span>').join('')+'</div>';
  return h;
}
function escortCard(s){
  const P=s.pilot||{},row=s.row||{};
  const sub=s.sys35?'<canvas class="h35-tgt__sch is-small" width="520" height="120"></canvas><div class="h35-tgt__rows">'+s.sys35.map(x=>
    '<div class="h35-tgt__row" data-row="'+x.k+'"><i style="background:'+(x.hp<=0?'#5a5f6e':TH.hpCol(x.hp/x.max,'gor'))+'"></i><span>'+esc(SUB35_TIP[x.k][0]+' · '+Math.max(0,Math.ceil(x.hp))+'/'+x.max+(x.hp<=0?' · DOWN':''))+'</span></div>').join('')+'</div>':'';
  return '<div class="h35-tgt__head"><b>'+esc(s.label||s.name)+'</b><span>'+esc((row.name||s.cls)+(P.level?' · L'+P.level+(P.preset?' '+P.preset:''):''))+'</span></div>'+sub+
    API.bar('Shield front',s.segs.F.val,s.segs.F.max,'is-shd')+API.bar('Shield rear',s.segs.R.val,s.segs.R.max,'is-shd')+API.bar('Armour',s.arm,s.maxArm,'is-arm')+API.bar('Hull',s.hull,s.maxHull,'is-hull');
}
/* a small ship's schematic: its outline in steel, its engines aft, guns fore, shield generator amidships */
function paintShipSchematic(cv,s){
  if(!cv||!s.sys35)return;const c=cv.getContext('2d'),W=cv.width,H=cv.height,art=SA.SHIP_FOR_GAME[s.cls]||s.cls,len=SA.shipLen?SA.shipLen(art):40,k=Math.min(W*0.7/len,H*0.8/(len*0.6)),cx=W/2,cy=H/2;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);B.schX=[];
  try{SA.ship(c,art,cx,cy,0,k,0,{livery:s.faction==='reb'?'rebel':'heg',still:true,off:true});}catch(e){}
  c.globalCompositeOperation='source-atop';c.fillStyle=TH.rgba(C.steel,0.9);c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';
  for(const x of s.sys35){const px=cx+x.x*len*k/2,r=Math.max(9,len*k*0.07);
    c.beginPath();c.arc(px,cy,r,0,6.283);c.fillStyle=x.hp<=0?'#5a5f6e':TH.hpCol(x.hp/x.max,'gor');c.fill();c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();
    if(x.hp<=0){B.schX.push(x.k);const d=r*0.6;c.strokeStyle='#e8e8ee';c.lineWidth=3;c.beginPath();c.moveTo(px-d,cy-d);c.lineTo(px+d,cy+d);c.moveTo(px+d,cy-d);c.lineTo(px-d,cy+d);c.stroke();}}
}
/* the schematic: the FL-400's outline in steel, each subsystem where it sits on the hull */
function paintSchematic(cv,fr){
  if(!cv)return;const c=cv.getContext('2d'),W=cv.width,H=cv.height,k=W/138,cx=W/2+2,cy=H/2,L=L35.L;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);B.schX=[];   // (the ✕s it drew: the tests read them)
  try{SA.ship(c,'gafreighter',cx,cy,0,k,0,{livery:'heg',still:true,off:true});}catch(e){}
  c.globalCompositeOperation='source-atop';c.fillStyle=TH.rgba(C.steel,0.9);c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';
  for(const sb of L.subs){if(!(sb.k!=='power'||L.powerSeen))continue;const x=cx+sb.x*k,y=cy+sb.y*k;
    if(sb.k==='cargo'){const w=8.6*k,h=6.6*k;
      c.save();c.globalAlpha=sb.taken?0.35:1;c.fillStyle=sb.taken?'#8e96a2':sb.hp<=0?'#14141c':sb.hazard?C.hazard:'#8e96a2';c.fillRect(x-w/2,y-h/2,w,h);c.lineWidth=2;c.strokeStyle=C.ink;c.strokeRect(x-w/2,y-h/2,w,h);c.restore();
      if(sb.taken){c.save();c.strokeStyle=C.rebel;c.lineWidth=3;c.beginPath();c.moveTo(x-w*0.22,y);c.lineTo(x-w*0.05,y+h*0.25);c.lineTo(x+w*0.28,y-h*0.25);c.stroke();c.restore();}
      continue;}
    const r=(sb.k==='pd'?4.6:sb.k==='comms'?5.6:7)*k*0.9;
    c.beginPath();c.arc(x,y,r,0,6.283);c.fillStyle=subCol(sb);c.fill();c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();
    if(sb.hp<=0){B.schX.push(sb.k+(sb.i!=null?sb.i:''));const d=r*0.6;c.strokeStyle='#e8e8ee';c.lineWidth=3;c.beginPath();c.moveTo(x-d,y-d);c.lineTo(x+d,y+d);c.moveTo(x+d,y-d);c.lineTo(x-d,y+d);c.stroke();}}
}
/* a click on the map while a power wants a target */
function mapClick(p,ev,ship){
  if(B.screen!=='live')return false;
  if(!B.pick){   // §3.5: a click on the freighter, an escort or a response ship selects it to inspect; anything else clears it
    if(ship&&(ship.faction!=='reb'||ship.id==='fl400')){B.inspect=ship.id;API.A.selShip=null;syncTarget(true);API.syncHud(true);return true;}
    if(B.inspect){B.inspect=null;syncTarget(true);}return false;}
  const k=B.pick.k,P=L35.POWERS35[k],args=B.pick.args,stage=B.pick.stage;
  const want=stage==='focus'?'foe':P.target;
  if(want==='mine'){
    const pod=k==='tug'?podAt(p):null;if(pod){doUse(k,{pod:pod.id});return true;}
    if(!ship||ship.faction!=='reb'||!ship.wing){API.flash(k==='tug'?'Pick one of your ships, or a pod':'Pick one of your ships');return true;}
    args.ship=ship.id;if(P.choice){B.pick=null;B.choose={k,args};API.syncHud(true);return true;}doUse(k,args);return true;}
  if(want==='foe'){
    if(!ship||ship.faction==='reb'){API.flash('Pick an enemy');return true;}
    const sx=ship.id==='fl400'?null:sub35Under(ship,p),sub=ship.id==='fl400'?subAt(ship,p):sx&&sx.hp>0?sx.k:null;
    if(stage==='focus'){args.target=ship.id;args.sub=sub;doUse(k,args);return true;}
    args.id=ship.id;args.sub=sub;doUse(k,args);return true;}
  return true;
}
/* every 3.5 tip (feedback 1, §3.6): {title, body, foot, tone}; the copy is designer-facing placeholder (C-81) */
const ORD_TIP={disable:'Knock out a subsystem: the power plant (dead in space; it shows once her hull is under 80%), the engines (she crawls, and can\'t jump), the comms array or the turrets. Bombs crack a hull; guns barely scratch it.',
  destroy:'Kill the freighter.',board:'Brickbats with a Boarding party clamp on once it\'s disabled, and take her.',haul:'Brickbats with Cargo pods clamp on once it\'s disabled and take containers home.',
  defend:'Get between the threats and that wing.',escort:'Stay with the prize and protect it.',suppress:'Engage the point defence or the escorts, to clear the way.',
  intimidate:'A threatening orbit at gun range, guns on the turrets and escorts only: the crew\'s resolve drains until they hail.',
  tag:'The named ship closes quietly and plants the tracker.',ambush:'Wait at a point; engage anything that arrives.',hold:'Wait there.',withdraw:'Leave through your jump point.'};
const ROLE_TIP={strike:['Strike','Jumps in at the start, at its jump-in point.'],reserve:['Reserve','Waits at home until you call it in (a power, or a leader\'s request).'],home:['Stay home','Not on this mission.']};
const H35_TIP={intel:['Intel','Each pip digs once into what Cass might have missed.'],launch:['Launch','Start the mission with this plan.'],detect:['Detection','How close their escort is to spotting you. Full: Phase 2.'],
  plan:['The plan overlay','Each wing\'s Executive, its jump-in and its target, over the map.','P'],trig:['Secondary trigger','When this happens, the wing switches to its Secondary Order once its Executive allows.'],
  notarena:['Not in the Arena','The campaign\'s other tabs live in the full game.'],newopp:['New opportunity','Roll a fresh freighter: a new seed and new modifiers.'],dig:['Dig deeper','Spend 1 Intel to turn up something Cass missed.'],
  missed:['Cass may have missed something','Her reliability is the gamble: there may be modifiers she didn\'t see.'],plan2:['Plan mission','Open the planning windows.']};
function tipFor(key){
  const [k,a]=String(key).split(':');
  if(k==='obj'){const o=L35.PRIMARIES[a];if(!o)return null;return {title:o.name+' · '+o.family,body:o.wins,foot:o.needs.length?'Needs: '+o.needs.map(n=>L35.NEED_TEXT[n]).join(', '):'No needs',tone:'info'};}
  if(k==='opt'){const o=L35.OPTIONALS[a];if(!o)return null;return {title:o.name,body:o.line,foot:'Optional: the primary comes first',tone:'info'};}
  if(k==='roe'){const o=L35.ROES[a];if(!o)return null;return {title:o.name,body:o.line,foot:'Rule of engagement',tone:'info'};}
  if(k==='mod'){const o=L35.MODS[a];if(!o)return null;return {title:o.name,body:o.line,foot:o.tone==='warn'?'Against you':'In your favour',tone:o.tone==='warn'?'warn':'info'};}
  if(k==='lo'){const o=L35.LOADOUTS[a];if(!o)return null;return {title:o.name,body:o.line,foot:'Brickbat loadout',tone:'info'};}
  if(k==='asset'){const o=L35.ASSETS[a];if(!o)return null;return {title:o.name,body:o.line,foot:o.power?'Unlocks '+o.power:'Passive',tone:'cost'};}
  if(k==='ord'){const o=L35.ORDERS35[a];if(!o)return {title:'Executive Order',body:'What the wing is there to do.'};return {title:o.name,body:ORD_TIP[a]||'',foot:'Executive or Secondary Order',tone:'info'};}
  if(k==='role'){const r=ROLE_TIP[a];return r?{title:r[0],body:r[1]}:null;}
  if(k==='h35'){const r=H35_TIP[a];return r?{title:r[0],body:r[1],key:r[2]}:null;}
  if(k==='na')return {title:a==='arena'?'Not in the Arena':'Not in this demo',body:a==='arena'?'The campaign\'s screens live in the full game.':'Only the Vulnerable Freighter is playable here.'};
  if(k!=='p35')return null;
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
  drawK2(c,z,view,o);drawSubRings(c,z);
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
/* feedback 1, K2 (§3.2, §3.11): the ram's line and its impact; Pirate's transfer ring, its crates and the crew's resolve */
function drawK2(c,z,view,o){
  const S=SIM.S,L=L35.L,fr=SIM.fn.byId('fl400'),now=performance.now();
  // the ram: a hazard dashed line to what it's going for, with an ETA chip
  for(const s of S.ships){if(!s.alive||s.prop35!=='ram')continue;const t=SIM.fn.byId(s.ram35.id);if(!t||!t.alive)continue;
    const p=API.ipos(s),q=API.ipos(t),v=Math.max(1,Math.hypot(s.vx,s.vy)),eta=Math.max(0,(Math.hypot(q.x-p.x,q.y-p.y)-SIM.fn.bodyR(t))/v);
    API.dashLine(c,p,q,TH.rgba(C.hazard,0.9),z,2,[10,7]);API.label(c,(p.x+q.x)/2,(p.y+q.y)/2-12/z,'IMPACT '+Math.ceil(eta)+' s',C.hazard,z,12,'Bungee');}
  // the ram's impact: a hitstop, a shake, a big flash and a shockwave where it struck (once each)
  for(const e of L.fxQ||[]){if(e.shown)continue;e.shown=now;
    if(!API.fxReduced()){A.hitstop=now+120;if(FX&&FX.fn&&FX.fn.addShake)FX.fn.addShake(e.kind==='nuke'?1:0.6,e.x,e.y);}
    if(FX)FX.event('explode',{x:e.x,y:e.y,size:e.kind==='nuke'?12:7,struct:true,iconBoost:API.fxMin?API.fxMin(80):1});}
  for(const e of L.fxQ||[]){const k=(now-e.shown)/(e.kind==='nuke'?900:600);if(k<0||k>1)continue;
    c.save();c.globalAlpha=(1-k)*0.9;c.lineWidth=(6*(1-k)+2)/z;c.strokeStyle=e.kind==='nuke'?'#ffffff':C.hazard;c.beginPath();c.arc(e.x,e.y,(e.kind==='nuke'?L35.N.NUKE_R:420)*k+30/z,0,6.283);c.stroke();
    if(k<0.25){c.globalAlpha=(1-k*4)*0.7;c.fillStyle=e.kind==='nuke'?'#ffffff':'#ffb347';c.beginPath();c.arc(e.x,e.y,(e.kind==='nuke'?600:180)*(0.5+k*2),0,6.283);c.fill();}c.restore();}
  if(!fr||!fr.alive)return;
  // the crew's resolve: a thin foe-blue arc round the freighter that shrinks as they lose their nerve (Pirate, Intimidate)
  if(L.primK==='pirate'||Object.values(L.exec).some(e=>e&&e.k==='intimidate')){const p=API.ipos(fr),r=SIM.fn.hullAxes(fr).a+120/z*0,k=Math.max(0,L.resolve)/100;
    c.save();c.lineWidth=3/z;c.strokeStyle=TH.rgba(C.heg,0.35);c.beginPath();c.arc(p.x,p.y,r+40,0,6.283);c.stroke();c.strokeStyle=C.heg;c.beginPath();c.arc(p.x,p.y,r+40,-Math.PI/2,-Math.PI/2+k*6.283);c.stroke();c.restore();}
  // the transfer: a gold dashed ring at TRANSFER_R, its progress over it; the crates drifting to your ships
  if(L.surrender==='take'&&!L.transferred){const p=API.ipos(fr),R=L35.N.TRANSFER_R,k=Math.min(1,L.transfer/L35.N.TRANSFER_SECS);
    API.ring(c,p.x,p.y,R,TH.rgba(C.gold,0.85),z,2.4,[12,9]);
    const w=180/z,h=10/z,y=p.y-R-26/z;c.save();c.fillStyle=C.ink;c.fillRect(p.x-w/2,y,w,h);c.fillStyle=C.gold;c.fillRect(p.x-w/2,y,w*k,h);c.lineWidth=2/z;c.strokeStyle=C.ink;c.strokeRect(p.x-w/2,y,w,h);c.restore();
    API.label(c,p.x,y-12/z,'TRANSFER '+Math.round(k*100)+'%',C.gold,z,12,'Bungee');}
  for(const cr of L.crates||[]){if(cr.done&&S.t-cr.done>0.4)continue;const sz=14;c.save();c.translate(cr.x,cr.y);c.rotate((S.t-cr.t0)*0.8);
    c.fillStyle='#8e96a2';c.fillRect(-sz/2,-sz/3,sz,sz*0.66);c.lineWidth=2/z;c.strokeStyle=C.ink;c.strokeRect(-sz/2,-sz/3,sz,sz*0.66);c.restore();}
}
/* the props the layer flies, drawn from the Brickbat: the ram (civilian, hazard chevrons on the nose), the tug, the pirates */
function drawProp(c,s,p,z,boost){
  const sc=(0.7+0.09*s.row.size)*1.6*0.85*1.35*boost,t=performance.now()/1000;
  SA.ship(c,'brickbat',p.x,p.y,p.h,sc,t,{livery:s.prop35==='pirate'?'hunter':'civ',loadout:{attach:s.prop35==='pirate'&&s.load35==='pods'?['cargopod']:[]},damage:Math.max(0,1-Math.max(0,s.hull)/s.maxHull)});
  if(s.prop35==='ram'){const ca=Math.cos(p.h),sa=Math.sin(p.h),r=26*boost;c.save();c.lineWidth=3/z;c.strokeStyle=C.hazard;
    for(const o of [0.2,0.55]){const x=p.x+ca*r*(1-o),y=p.y+sa*r*(1-o);c.beginPath();c.moveTo(x-ca*8*boost-sa*10*boost,y-sa*8*boost+ca*10*boost);c.lineTo(x,y);c.lineTo(x-ca*8*boost+sa*10*boost,y-sa*8*boost-ca*10*boost);c.stroke();}c.restore();}
  if(s.prop35==='pirate')API.ring(c,p.x,p.y,40*boost,TH.rgba(C.hazard,0.85),z,2,[5,4]);
}
/* =====================================================================
   P5: the request cards (§7.4): right column, newest on top, at most REQ_OPEN; the pods on the map
   ===================================================================== */
const REQEL=document.createElement('div');REQEL.className='h35-reqs';REQEL.hidden=true;STAGE.appendChild(REQEL);
const RING_C=2*Math.PI*15;
function reqCards(){const L=L35.L;return L?L.req.open.slice().sort((a,b)=>b.id-a.id):[];}
function reqHtml(q){
  const s=SIM.fn.byId(q.who),name=s?s.name:'Comms',mor=s?SIM.moraleOf(s):'';
  let h='<div class="hc-card h35-req" data-req="'+q.id+'" data-state="'+q.state+'"><div class="h35-req__top">'+(s?'<canvas class="h35-portrait h35-portrait--req" width="64" height="64" data-portrait="'+esc(s.id)+'"></canvas>':'')+
    '<span class="h35-req__who"><b>'+esc(name)+'</b>'+(mor?'<span class="hc-mor" data-m="'+mor+'">'+mor+'</span>':'')+'</span>'+
    '<svg class="h35-req__ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="h35-req__rbg"/><circle cx="18" cy="18" r="15" class="h35-req__rfg" stroke-dasharray="'+RING_C.toFixed(1)+'"/></svg></div>'+
    '<div class="sr-quote h35-req__q">'+esc(q.line)+'</div>';
  if(q.state==='open')h+='<div class="h35-req__acts">'+q.answers.map((a,i)=>'<button type="button" class="sr-choice h35-ans" data-ans="'+a+'" data-req="'+q.id+'"><span class="sr-kbd">⇧'+(i+1)+'</span><span>'+esc(L35.ANS[a])+'</span>'+(a===q.def?'<span class="sr-tag h35-def">DEFAULT</span>':'')+'</button>').join('')+'</div>';
  else if(q.state==='sent')h+='<div class="h35-req__sent">Sending · '+esc(L35.ANS[q.answer])+' <em data-left="1"></em><i><b data-bar="1"></b></i></div>';
  else h+='<div class="h35-req__done">'+(q.by==='void'?'Withdrawn: no longer needed':q.by==='player'?'Answered: '+esc(L35.ANS[q.answer]):esc(name)+' decided: '+esc(L35.ANS[q.answer]))+'</div>';
  return h+'</div>';
}
/* the cards: rebuilt when one comes, goes or changes state; the countdowns move every frame */
function syncReq(){
  const L=L35.L,S=SIM.S,on=B.screen==='live'&&!!L&&!!S;
  const qs=on?reqCards().slice(0,Math.max(2,L35.N.REQ_OPEN)):[],key=qs.map(q=>q.id+q.state).join(',');
  REQEL.hidden=!qs.length;
  if(REQEL.dataset.k!==key){REQEL.dataset.k=key;REQEL.innerHTML=qs.map(reqHtml).join('');paintPortraits(REQEL);
    const sh=B.reqShown||(B.reqShown={}),t=performance.now();for(const q of qs)if(sh[q.id]==null)sh[q.id]=t;}   // when each card first showed (the 400 ms guard)
  for(const q of qs){const el=REQEL.querySelector('[data-req="'+q.id+'"]');if(!el)continue;
    const left=q.state==='open'?Math.max(0,q.until-S.t):0,k=q.state==='open'?left/Math.max(0.01,q.until-q.t0):0;
    const fg=el.querySelector('.h35-req__rfg');if(fg){fg.style.strokeDashoffset=(RING_C*(1-k)).toFixed(1);fg.classList.toggle('is-low',q.state==='open'&&left<4);}
    if(q.state==='sent'){const tx=L.txLog.find(t=>t.id===q.tx);if(tx){const e=el.querySelector('[data-left]'),b=el.querySelector('[data-bar]');
      if(e)e.textContent=Math.max(0,tx.at-S.t).toFixed(1)+' s';if(b)b.style.width=Math.round((tx.delay>0?Math.min(1,(S.t-tx.t0)/tx.delay):1)*100)+'%';}}}
  // a new request at 3×: back to 1× so you can read it (REQ_AUTOSLOW)
  const top=qs.find(q=>q.state==='open');
  if(top&&top.id>(B.reqSeen||0)){B.reqSeen=top.id;if(L35.N.REQ_AUTOSLOW&&A.speed>2)API.setSpeed(2);}
}
function paintPortraits(root){
  for(const cv of root.querySelectorAll('canvas[data-portrait]')){const g=cv.getContext('2d'),id=cv.dataset.portrait,r=cv.width/2;g.clearRect(0,0,cv.width,cv.height);
    const who=id==='cass'?SA.lookOf({id:'cass',name:'Cass',role:'Spy'}):SA.lookOf({id:id==='joss'?'joss':id,name:id,role:'Pilot'});
    try{SA.portrait(g,r,r,r-3,who,{t:0});}catch(e){}}
}
function answer(id,a){const r=L35.answerReq(id,a);if(!r.ok)API.flash(r.why);syncReq();API.syncHud(true);return r;}
REQEL.addEventListener('click',ev=>{const b=ev.target.closest('[data-ans]');if(!b)return;answer(+b.dataset.req,b.dataset.ans);});
/* A / B / C: the newest open request (they win over the powers' keys while one is open) */
function reqKey(ev){
  if(!ev.shiftKey||!/^Digit[1-3]$/.test(ev.code||''))return false;
  const q=reqCards().find(x=>x.state==='open');if(!q)return false;
  const shown=(B.reqShown||{})[q.id];if(shown==null||performance.now()-shown<400)return true;   // too soon: swallowed, not answered
  const i=+ev.code.slice(5)-1;if(!q.answers[i])return false;
  answer(q.id,q.answers[i]);return true;
}
/* the pods: a small rebel-red capsule, its beacon blinking, a ring counting down to its capture */
function drawPods(c,z){
  const L=L35.L,S=SIM.S,now=performance.now()/1000;
  for(const p of L.pods){if(p.state!=='drift')continue;const k=Math.max(0,(p.until-S.t)/L35.N.POD_SECS),r=9/z;
    c.save();c.translate(p.x,p.y);c.rotate(now*0.8);c.beginPath();c.ellipse(0,0,r*1.4,r*0.8,0,0,6.283);c.fillStyle=C.rebel;c.fill();c.lineWidth=2/z;c.strokeStyle=C.ink;c.stroke();c.restore();
    if(Math.floor(now*3)%2===0){c.save();c.beginPath();c.arc(p.x,p.y-r*1.2,3/z,0,6.283);c.fillStyle='#fff';c.fill();c.restore();}
    c.save();c.lineWidth=2/z;c.strokeStyle=TH.rgba(C.rebel,0.9);c.beginPath();c.arc(p.x,p.y,22/z,-Math.PI/2,-Math.PI/2+k*6.283);c.stroke();c.restore();
    API.label(c,p.x,p.y-30/z,p.name.toUpperCase()+' · POD',C.rebel,z,10,'Bungee');}
}
function podAt(p){const L=L35.L;if(!L)return null;let b=null,bd=40/cam.z;for(const x of L.pods){if(x.state!=='drift')continue;const d=Math.hypot(x.x-p.x,x.y-p.y);if(d<bd){bd=d;b=x;}}return b;}

/* ---------- the overlay High Command calls ---------- */
const OV={home,onOver,record,drawBody,shipHidden,cmdsHtml,cmdsClick,tipFor,mapClick,
  pilotClick(s,b){if(b.dataset.act!=='callname')return false;if(b.getAttribute('aria-disabled')==='true'){API.flash('Call a Pilot by Name: '+(L35.powerWhy('name')||'not now'));return true;}
    B.pick=null;B.choose={k:'name',args:{ship:s.id}};API.syncHud(true);return true;},
  orderChip(w){const L=L35.L,ex=L&&L.exec[w.id];if(!ex)return '';const O=L35.ORDERS35[ex.k];return 'EXEC · '+O.name+(ex.arg&&typeof ex.arg==='string'?' '+(L35.WINGS35.find(x=>x.id===ex.arg)||{name:ex.arg}).name:'');},
  tacticChip(w){const L=L35.L,o=L&&L.off[w.id];return o?'OFF PLAN: '+o:'';},fxSkip:s=>(s.cls==='fl400'&&!s.jumped)||!!s.noDeathFx,
  // the shield arcs (§3.3): always on your ships at art zoom (quiet unless selected, just hit or refilling); on theirs
  // for 2 s after a hit, and while selected
  verbOf:s=>s.faction==='reb'&&L35.L?L35.verbOf(s):null,   // the tiles' words and glyphs (§3.4)
  wingChip(w){const n=SIM.fn.wingShips(w).reduce((a,s)=>a+(s.pods?s.pods.length:0),0);return n?'▣ '+n+' aboard':'';},   // the crates the wing carries
  shieldMode(s,base){const S=SIM.S,hit=S.t-(s.hitT==null?-99:s.hitT)<2,sel=API.A.selShip===s.id;
    if(s.faction==='reb')return base||hit||sel||API.sweepOf(s.id,'F')!=null||API.sweepOf(s.id,'R')!=null?'full':'quiet';
    return sel||hit?'full':null;},drawWorld,drawScreen,objHtml,rulesHtml,clockHtml,pilotBody,pointer,onKey,tick,
  hudHidden:()=>B.screen!=='live'&&B.screen!=='debrief',
  syncHud(now){
    const L=L35.L;
    if(B.screen==='live')syncCp();
    syncReq();
    if(B.screen==='live'&&L&&L.phase!==B.lastPhase){B.lastPhase=L.phase;if(!B.planUser)B.planOverlay=L.phase===1;if(L.phase>1){banner('PHASE '+L.phase,L.phase===2?'They know we\'re here':'Hegemony on site');render();}}   // designer copy (C-78)
    if(B.screen==='live'&&B.banner&&now-B.banner.at>1400){B.banner=null;render();}},
  restart(same){if(same&&B.plan){planAgain();}else{B.seed=newSeed();rollAttempt();showBoard(false);}},
  panelHtml(){
    let h='<div class="hc-grp"><div class="hc-grp__head">Type 3.5</div>';
    for(const g of L35.GROUPS){h+='<details class="hc-fx"><summary>'+esc(g)+'</summary>';
      for(const k in L35.TUNE){const t=L35.TUNE[k];if(t.group!==g)continue;
        h+='<div class="hc-row"><label for="h35P_'+k+'" data-tip="@" data-tt="'+esc(k)+'">'+esc(t.label)+'</label><output data-out35="'+k+'">'+t.get()+'</output><input type="range" id="h35P_'+k+'" data-tune35="'+k+'" min="'+t.min+'" max="'+t.max+'" step="'+t.step+'" value="'+t.get()+'"></div>';}
      h+='</details>';}
    return h+'</div>';
  },
  panelInput(el){const k=el.dataset.tune35;if(!k)return false;const t=L35.TUNE[k];t.set(+el.value);const o=byId('hcPanelBody').querySelector('[data-out35="'+k+'"]');if(o)o.textContent=t.get();return true;},
};

/* ---------- DBGarena.hc35 ---------- */
const dbg={B,L35,get L(){return L35.L;},get S(){return SIM.S;},
  fn:{open,close,showBoard,enterBrief,launch,planAgain,render,dig,ready,checklist,inRing,toWorld,toLayout,fitPlan,record,OV,syncTarget,subTip,hoverSubs,
    go(screen){if(screen==='brief')enterBrief();else if(screen==='board'||screen==='dossier')showBoard(false);},   // (the dossier lives in the board's rail now)
    run(secs){const n=Math.round(secs*1000/SIM.TICK);for(let i=0;i<n&&!SIM.S.over;i++)SIM.step();if(SIM.S.over&&B.screen==='live')API.onOver();API.syncHud(true);return SIM.S.t;}}};
window.SR_ARENA_HC35={open,close,dbg,get active(){return B.screen!=='off';}};
})();
