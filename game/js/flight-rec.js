'use strict';
/* =====================================================================
   STAR REBELLION — THE FLIGHT RECORDER (flight-rec.js)
   docs/ARENA-HC35-FEEDBACK-1.md §3.7. Every High Command and Type 3.5 run keeps a flight record: a header (the
   scenario as built, the seed, the plan, every tuning value), every input keyed by its tick, a state-hash checkpoint
   every second, and an analysis stream (events, a per-second sample, the 3.5 logs, the metrics record). The record
   is saved from the debrief, kept in localStorage (the last HISTORY), and re-simulated offline by tools/run-report.js.
   The recorder only reads the sim: it wraps the sim's public input functions and its step, and writes nothing back,
   so a run plays the same recorded or not. The same file loads headless in the harness (window.__HEADLESS), where it
   installs nothing and lends its sampler and its input table.
   ===================================================================== */
window.SR_FLIGHT=(function(){
const REC_V=1;            // the record's own format
let SAMPLE_TICKS=20;      // a sample every this many ticks (1 s). placeholder
let CHECK_TICKS=20;       // a checkpoint every this many ticks (1 s). placeholder
let HISTORY=10;           // runs kept in localStorage. placeholder
const STORE='sr-arena-runs';
const SIM=()=>window.SIMHC,L35=()=>window.SIMHC35;
let R=null;               // the record being kept (live once the sim steps)
let last=null;            // the last finished record
const r1=v=>Math.round(v*10)/10,r0=v=>Math.round(v);
const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(e){return null;}};
const tuneOf=T=>{const o={};if(T)for(const k in T){try{o[k]=T[k].get();}catch(e){}}return o;};

/* ---------- the inputs: what the player can do to the sim, by the API function it goes through ---------- */
// key → [object getter, function name]. The harness replays them through the same calls
const INPUTS={
  'hc.setOrder':[SIM,'setOrder'],'hc.setTactic':[SIM,'setTactic'],'hc.command':[SIM,'command'],'hc.respond':[SIM,'respond'],
  'hc.useAbility':[SIM,'useAbility'],'hc.setDoctrine':[SIM,'setDoctrine'],'hc.addRule':[SIM,'addRule'],'hc.removeRule':[SIM,'removeRule'],
  'hc.jumpOut':[SIM,'jumpOut'],'hc.leaveNow':[SIM,'leaveNow'],'hc.endMission':[SIM,'endMission'],
  '35.use':[L35,'use'],'35.answerReq':[L35,'answerReq'],
};
function apply(inp){   // [tick, key, args]: run one recorded input (the harness)
  const k=inp[1],a=inp[2]||[];
  if(k==='speed')return;
  if(k.startsWith('tune.')){const [,grp,name]=k.split('.'),T=grp==='hc'?SIM().TUNE:L35().TUNE;if(T&&T[name])T[name].set(a[0]);return;}
  const d=INPUTS[k];if(!d)return;const o=d[0]();if(o&&o[d[1]])return o[d[1]].apply(o,a);
}

/* ---------- the sample: one second of the fight, compact (short keys, rounded) ---------- */
function sample(){
  const S=SIM().S,L=L35()&&L35().L&&L35().L.S===S?L35().L:null;
  const fr=S.ships.find(s=>s.id==='fl400');
  const o={k:S.tick,t:r1(S.t),cp:L?L.cp:S.cp,
    s:S.ships.filter(s=>s.alive).map(s=>{const b=s.beh||{},sh=SIM().fn.totalShield(s);
      return [s.id,r0(s.x),r0(s.y),Math.round(s.h*100)/100,b.kind||'',r0(s.hull),r0(sh),b.why||'',b.target||''];})};
  if(L){o.ph=L.phase;o.det=r0(L.detect);o.res=r0(L.resolve);if(fr&&fr.alive)o.fr=[r0(fr.x),r0(fr.y),Math.round(fr.h*100)/100,L.leg,r0(Math.hypot(fr.vx,fr.vy))];
    o.ex={};for(const w in L.exec)if(L.exec[w])o.ex[w]=L.exec[w].k+(L.exec[w].arg&&typeof L.exec[w].arg==='string'?':'+L.exec[w].arg:'');
    o.off={};for(const w in L.off)if(L.off[w])o.off[w]=L.off[w];
    if(L35().verbOf)o.v=S.ships.filter(s=>s.alive&&s.faction==='reb'&&s.wing).map(s=>[s.id,L35().verbOf(s).k]);}
  return o;
}

/* ---------- a record: begun when a scenario is built, live from its first step ---------- */
function begin(scn,opt){
  if(R&&R.live&&!R.done)finish('abandoned');
  const S=SIM().S;
  R={v:REC_V,simVersion:{hc:SIM().SIM_VERSION||null,hc35:L35()?L35().SIM_VERSION||null:null},ruleset:'hc',scenario:scn.id,title:scn.title||scn.id,
    seed:opt&&opt.seed!=null?opt.seed>>>0:S.seed,variant:opt&&opt.variant||0,scn:clone(scn),
    tune:{hc:tuneOf(SIM().TUNE),hc35:L35()?tuneOf(L35().TUNE):{},fx:window.SR_SPACE_FX&&window.SR_SPACE_FX.TUNE?clone(window.SR_SPACE_FX.TUNE):{}},
    env:{ua:typeof navigator!=='undefined'?navigator.userAgent:'',w:typeof innerWidth!=='undefined'?innerWidth:0,h:typeof innerHeight!=='undefined'?innerHeight:0,date:new Date().toISOString()},
    inputs:[],cp:[],ev:[],samples:[],speeds:[],live:false,done:false,S,evMax:S.evN||0,lastSpeed:null};
}
function begin35(){   // the 3.5 layer took the scenario: the plan and its modifiers go in the header
  if(!R||R.S!==SIM().S)return;const L=L35().L;if(!L)return;
  R.ruleset='hc35';R.opportunity=L.X.opp;R.plan=clone(L.X.plan);R.mods=clone(L.X.mods);R.tune.hc35=tuneOf(L35().TUNE);R.tune.hc=tuneOf(SIM().TUNE);
}
function input(key,args){
  const S=SIM().S;if(!R||R.done||R.S!==S)return;
  R.inputs.push([S.tick,key,clone(args)]);
}
function preStep(){
  const S=SIM().S;if(!R||R.done||R.S!==S)return;
  R.live=true;
  speedTick();
  if(S.tick%CHECK_TICKS===0)R.cp.push([S.tick,SIM().stateHash()]);
  if(S.tick%SAMPLE_TICKS===0)R.samples.push(sample());
}
function postStep(){
  const S=SIM().S;if(!R||R.done||R.S!==S)return;
  for(const e of S.events)if(e.id>R.evMax){R.evMax=e.id;R.ev.push([e.t,e.kind,e.text,e.ship||null,e.tone||null]);}
  if(S.over)finish('over');
}
function speedTick(){
  if(!R||R.done)return;const H=window.SR_ARENA_HC,A=H&&H.api&&H.api.A;if(!A)return;
  if(A.speed!==R.lastSpeed){R.lastSpeed=A.speed;R.speeds.push([R.S.tick,A.speed,Date.now()]);}
}
/* the run is over (or left, or the page went): close the record, keep it */
function finish(reason){
  if(!R||R.done)return null;
  const S=R.S;R.done=true;
  for(const e of S.events)if(e.id>R.evMax){R.evMax=e.id;R.ev.push([e.t,e.kind,e.text,e.ship||null,e.tone||null]);}
  R.end={tick:S.tick,t:r1(S.t),reason,outcome:S.over?S.over.outcome:null,hash:SIM().stateHash()};
  R.unfinished=reason!=='over';
  const L=L35()&&L35().L&&L35().L.S===S?L35().L:null;
  if(L)R.logs={cause:clone(L.cause),deaths:clone(L.deaths||[]),powers:clone(L.powLog),powRes:clone(L.powRes||[]),
    req:(L.req.log||[]).map(q=>({id:q.id,k:q.k,who:q.who,line:q.line,answers:q.answers,def:q.def,answer:q.answer,by:q.by,t0:r1(q.t0),sent:q.sentT!=null?r1(q.sentT):null,done:q.doneT!=null?r1(q.doneT):null})),
    tx:(L.txLog||[]).map(t=>({k:t.k,what:t.what,to:t.label,t0:r1(t.t0),at:r1(t.at),landed:t.landed!=null?r1(t.landed):null,refused:!!t.refused})),
    sec:clone(L.secLog),pods:clone(L.pods),opt:clone(L.opt),prim:clone(L.prim),phaseT:clone(L.phaseT),offSecs:clone(L.offSecs)};
  delete R.S;delete R.live;delete R.evMax;delete R.lastSpeed;
  last=R;R=null;store(last);
  return last;
}
function metrics(rec){   // the metrics record joins the run's record (the debrief pushes it after the end; leaving a run, before)
  if(R&&R.live&&!R.done&&R.S===SIM().S)finish(SIM().S.over?'over':'abandoned');
  if(!last||!rec)return;last.metrics=clone(rec);store(last,true);
}

/* ---------- keeping them: the last HISTORY in localStorage, the oldest dropped when storage refuses ---------- */
function stored(){try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function store(rec,replace){
  if(typeof localStorage==='undefined')return;
  let a=stored();if(replace&&a.length&&a[a.length-1].env&&rec.env&&a[a.length-1].env.date===rec.env.date)a.pop();
  a.push(rec);while(a.length>HISTORY)a.shift();
  for(;;){try{localStorage.setItem(STORE,JSON.stringify(a));return;}catch(e){
    if(a.length>1){a.shift();continue;}
    try{const lite=Object.assign({},a[0],{samples:[],ev:[],lite:true});localStorage.setItem(STORE,JSON.stringify([lite]));}catch(e2){}return;}}
}
const fileName=rec=>{const d=new Date(rec.env&&rec.env.date||Date.now()),p=n=>String(n).padStart(2,'0');
  return 'sr-run-'+d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+'-'+(rec.opportunity||rec.scenario)+'-'+rec.seed+'.json';};
function download(rec){
  rec=rec||last;if(!rec)return false;
  const blob=new Blob([JSON.stringify(rec)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=fileName(rec);document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);return true;
}
/* the designer panel's Runs group (High Command's panel; Type 3.5 shares it) */
function panelHtml(esc){
  const a=stored().slice().reverse();
  let h='<div class="hc-grp"><div class="hc-grp__head">Runs</div><details class="hc-sec"><summary>Flight records ('+a.length+')</summary>';
  if(!a.length)h+='<div class="hc-run">No runs recorded yet.</div>';
  a.forEach((r,i)=>{const d=new Date(r.env&&r.env.date||0);
    h+='<div class="hc-run"><span>'+esc((r.ruleset==='hc35'?'3.5 ':'HC ')+(r.opportunity||r.title||r.scenario)+' · seed '+r.seed+' · '+(r.unfinished?'unfinished':(r.end&&r.end.outcome)||'?')+' · '+d.toLocaleString())+'</span>'+
      '<button type="button" class="sr-btn sr-btn--sm" data-act="run:'+(a.length-1-i)+'">Download</button></div>';});
  return h+'</details></div>';
}
function downloadStored(i){const a=stored();return a[i]?download(a[i]):false;}

/* ---------- installing: wrap the sim's inputs and its step (in the browser only) ---------- */
function wrap(obj,name,key){
  const f=obj[name];if(typeof f!=='function'||f.__rec)return;
  const g=function(){const r=f.apply(this,arguments);input(key,Array.prototype.slice.call(arguments));return r;};
  g.__rec=true;obj[name]=g;
}
function install(){
  const S=SIM();if(!S||S.__rec)return;S.__rec=true;
  const build=S.build;S.build=function(scn,opt){const r=build.apply(this,arguments);try{begin(scn,opt);}catch(e){}return r;};
  const step=S.step;S.step=function(){try{preStep();}catch(e){}const r=step.apply(this,arguments);try{postStep();}catch(e){}return r;};
  for(const k in INPUTS){const d=INPUTS[k],o=d[0]();if(o)wrap(o,d[1],k);}
  const P=L35();if(P){const b=P.begin;P.begin=function(){const r=b.apply(this,arguments);try{begin35();}catch(e){}return r;};}
  for(const [grp,T] of [['hc',S.TUNE],['hc35',P&&P.TUNE]])if(T)for(const k in T){const t=T[k],set=t.set;t.set=function(v){set.call(this,v);input('tune.'+grp+'.'+k,[v]);};}
  setInterval(speedTick,100);   // pauses don't step, so speed is watched on a clock (analysis only)
  const bail=()=>{if(R&&R.live&&!R.done)finish('unfinished');};
  addEventListener('pagehide',bail);addEventListener('beforeunload',bail);addEventListener('error',bail);
}
if(!window.__HEADLESS)install();

return {REC_V,INPUTS,apply,sample,finish,metrics,download,downloadStored,panelHtml,stored,fileName,
  get live(){return R;},get last(){return last;},get SAMPLE_TICKS(){return SAMPLE_TICKS;},get CHECK_TICKS(){return CHECK_TICKS;}};
})();
