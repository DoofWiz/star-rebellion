#!/usr/bin/env node
'use strict';
/* =====================================================================
   tools/run-report.js — the flight recorder's offline harness (docs/ARENA-HC35-FEEDBACK-1.md §3.7)
   Loads the sim headless (game/js/sim-hc.js, sim-hc35.js and what they need) in a vm context, rebuilds the run from
   a flight record's header, replays its inputs at their ticks, checks every checkpoint hash, and reports.

     node tools/run-report.js sr-run-….json             a markdown report, short enough to paste into a chat
     node tools/run-report.js run.json --at 2:14        the whole state at that second
     node tools/run-report.js run.json --ship Brask     one ship's verb timeline
     node tools/run-report.js run.json --wing Dagger    a wing's ships, Executive and verbs over time
     node tools/run-report.js run.json --objective      the primary's conditions over time
     node tools/run-report.js run.json --json           machine-readable output

   As a module (the smoke test): require('./run-report.js') → {loadSim, replay, report}.
   ===================================================================== */
const vm=require('vm'),fs=require('fs'),path=require('path');
const GAME=path.join(__dirname,'..','game');
const FILES=['ui/sr-theme.js','art/sr-art.js','data/db.js','js/data.js','js/items.js','js/enemies.js','js/core.js','js/rebel.js','js/sim2.js',
  'js/det-math.js','js/sim-hc.js','js/sim-hc35.js','js/flight-rec.js'];

/* ---------- the sim, headless: a window with no DOM ---------- */
function loadSim(){
  const noop=()=>{};
  const el=()=>new Proxy(function(){},{get:(t,k)=>k==='style'?{}:k==='classList'?{add:noop,remove:noop,toggle:noop,contains:()=>false}:k==='getContext'?()=>new Proxy({},{get:()=>noop}):
    ['appendChild','addEventListener','setAttribute','removeChild','remove'].includes(k)?noop:k===Symbol.toPrimitive?()=>'':undefined,apply:()=>el()});
  const document={createElement:el,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,documentElement:{style:{setProperty:noop}},body:el(),head:el()};
  const ctx={console,Math,JSON,Date,setTimeout:noop,clearTimeout:noop,setInterval:noop,requestAnimationFrame:noop,performance:{now:()=>0},document,navigator:{userAgent:'node'},
    localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},getComputedStyle:()=>({getPropertyValue:()=>''}),matchMedia:()=>({matches:false,addEventListener:noop}),
    addEventListener:noop,Path2D:function(){},Image:function(){},__HEADLESS:true};
  ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);
  for(const f of FILES)vm.runInContext(fs.readFileSync(path.join(GAME,f),'utf8'),ctx,{filename:f});
  return ctx;
}

/* ---------- replay: rebuild from the header, the inputs at their ticks, every checkpoint checked ---------- */
function replay(rec,opt){
  opt=opt||{};
  const W=loadSim(),SIM=W.SIMHC,L35=W.SIMHC35,FL=W.SR_FLIGHT;
  const warn=[];
  if(rec.simVersion){if(rec.simVersion.hc&&rec.simVersion.hc!==SIM.SIM_VERSION)warn.push('recorded with sim '+rec.simVersion.hc+', replaying with '+SIM.SIM_VERSION);
    if(rec.ruleset==='hc35'&&rec.simVersion.hc35&&rec.simVersion.hc35!==L35.SIM_VERSION)warn.push('recorded with layer '+rec.simVersion.hc35+', replaying with '+L35.SIM_VERSION);}
  for(const [T,vals] of [[SIM.TUNE,rec.tune&&rec.tune.hc],[L35.TUNE,rec.tune&&rec.tune.hc35]])if(vals)for(const k in vals)if(T[k]){try{T[k].set(vals[k]);}catch(e){}}
  if(rec.ruleset==='hc35')L35.attach();else L35.detach();
  SIM.build(rec.scn,{seed:rec.seed,variant:rec.variant||0});
  if(rec.ruleset==='hc35')L35.begin();
  const S=()=>SIM.S,L=()=>rec.ruleset==='hc35'?L35.L:null;
  const cp=new Map((rec.cp||[]).map(([k,h])=>[k,h]));
  const inputs=(rec.inputs||[]).slice();let ii=0;
  const endTick=opt.toTick!=null?opt.toTick:rec.end?rec.end.tick:Infinity;
  const tr={samples:[],objT:[],checked:0,diverged:null};
  const every=opt.every||20;
  let lastObj='';
  for(;;){
    const s=S();
    while(ii<inputs.length&&inputs[ii][0]<=s.tick){if(inputs[ii][0]===s.tick){try{FL.apply(inputs[ii]);}catch(e){warn.push('input '+inputs[ii][1]+' at '+inputs[ii][0]+': '+e.message);}}ii++;}
    if(cp.has(s.tick)){tr.checked++;const h=SIM.stateHash();if(h!==cp.get(s.tick)&&!tr.diverged){tr.diverged={tick:s.tick,t:s.t,want:cp.get(s.tick),got:h};if(!opt.keepGoing)break;}}
    if(s.tick%every===0)tr.samples.push(look(W,s,L()));
    const os=s.objectives.map(o=>o.state).join(',');if(os!==lastObj){lastObj=os;tr.objT.push([s.t,s.objectives.map(o=>({id:o.id,text:o.text,state:o.state}))]);}
    if(s.over||s.tick>=endTick)break;
    SIM.step();
  }
  const s=S(),endOk=rec.end&&opt.toTick==null?(SIM.stateHash()===rec.end.hash&&s.tick===rec.end.tick):null;
  return {W,SIM,L35,S:s,L:L(),warn,tr,ok:!tr.diverged&&endOk!==false,endOk,rec};
}
/* one second of the replay, for the report */
function look(W,S,L){
  const F=W.SIMHC.fn,fr=S.ships.find(s=>s.id==='fl400');
  const o={t:+S.t.toFixed(1),tick:S.tick,ships:S.ships.map(s=>({id:s.id,name:s.name,wing:s.wing,f:s.faction,alive:s.alive,jumped:s.jumped,x:Math.round(s.x),y:Math.round(s.y),h:s.h,
    kind:s.beh&&s.beh.kind||'',why:s.beh&&s.beh.why||'',target:s.beh&&s.beh.target||null,hull:Math.round(s.hull),maxHull:s.maxHull,sh:Math.round(F.totalShield(s)),
    verb:L&&W.SIMHC35.verbOf&&s.alive&&s.faction==='reb'&&s.wing?W.SIMHC35.verbOf(s).words.replace(/\s*\d+(%|\/\d+)$/,''):null}))};   // the layer's vocabulary, its progress figure dropped
  if(L){o.phase=L.phase;o.cp=L.cp;o.detect=Math.round(L.detect);o.resolve=Math.round(L.resolve);o.exec=JSON.parse(JSON.stringify(L.exec));o.off=Object.assign({},L.off);
    o.fr=fr?{alive:fr.alive,jumped:fr.jumped,x:Math.round(fr.x),y:Math.round(fr.y),h:fr.h,leg:L.leg,v:Math.round(Math.hypot(fr.vx,fr.vy)),hull:Math.round(fr.hull),
      dev:L.prize?null:Math.round(laneDev(L.lane,fr)),subs:L.subs.map(x=>({k:x.k,i:x.i,hp:Math.round(x.hp),max:x.max,taken:!!x.taken}))}:null;
    o.state={disabled:L.disabled,surrender:L.surrender,offered:L.offered,transfer:+(L.transfer||0).toFixed(1),transferred:!!L.transferred,board:+L.board.toFixed(2),prize:L.prize,prizeHome:!!L.prizeHome,
      hauled:L.hauled||0,tag:+L.tag.prog.toFixed(1),planted:L.tag.planted,escaped:L.escaped,crashed:L.crashed,spool:L.spool,respKills:L.respKills,responseAt:L.responseAt,
      distress:L.distress?{landed:L.distress.landed,cut:L.distress.cut}:null,planet:fr?Math.round(Math.hypot(fr.x-L.planet.x,fr.y-L.planet.y)-L.planet.pull):null};}
  return o;
}
function laneDev(lane,p){let b=1e18;for(let i=1;i<lane.length;i++){const a=lane[i-1],c=lane[i],dx=c.x-a.x,dy=c.y-a.y,l2=dx*dx+dy*dy||1;let u=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2;u=Math.max(0,Math.min(1,u));b=Math.min(b,Math.hypot(p.x-a.x-dx*u,p.y-a.y-dy*u));}return b;}

/* ---------- the report ---------- */
const clock=t=>{t=Math.max(0,Math.round(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
const parseClock=s=>{const m=String(s).match(/^(\d+):(\d\d)$/);return m?+m[1]*60+ +m[2]:+s;};
const verbOf=sh=>sh.verb||KIND_WORDS[sh.kind]||sh.kind||'?';
// a reading for each behaviour kind where the layer's vocabulary (SIMHC35.verbOf) doesn't apply: High Command runs
const KIND_WORDS={engage:'Attacking',escort:'Escorting',defend:'Defending',withdraw:'Withdrawing',waitpt:'Holding',hold:'Holding',patrol:'Patrolling',dock35:'Closing to dock',
  docked:'Docked',holdoff:'Holding off',intim:'Intimidating',tag:'Tagging',far:'Keeping out of sight',ram35:'Ramming',fetch35:'Picking up a pod',tug35:'Towing',leave35:'Leaving',
  flee:'Panicking (fleeing)',freeze:'Panicking (frozen)',regroup:'Regrouping',capture:'Capturing',board:'Boarding',idle:'Idle',freighter:'On its lane',fallback:'Falling back',hunt:'Hunting',
  attackRun:'Attack run',extend:'Extending',evade:'Evading',interpose:'Interposing',hegback:'Pulling back hurt',lure:'Luring',strike:'Striking'};
function report(R,opt){
  opt=opt||{};
  const rec=R.rec,tr=R.tr,S=R.S,L=R.L,out=[];
  const P=x=>out.push(x);
  const name=rec.ruleset==='hc35'?'Type 3.5 · '+(rec.opportunity||rec.scenario):'High Command · '+(rec.title||rec.scenario);
  P('# Flight record: '+name+' · seed '+rec.seed);
  P('');
  P('Recorded '+(rec.env&&rec.env.date||'?')+' · '+(rec.unfinished?'**unfinished** ('+(rec.end&&rec.end.reason)+')':'finished')+' · '+clock(rec.end?rec.end.t:S.t)+' flown · '+(rec.inputs||[]).length+' inputs');
  for(const w of R.warn)P('> ⚠ '+w);
  P(tr.diverged?'> ✕ **The replay diverged at '+clock(tr.diverged.t)+'** (tick '+tr.diverged.tick+'): the report below stops there. '+(R.warn.length?'':'Same sim version: something in the run wasn\'t recorded.'):
    '> ✓ Replayed: '+tr.checked+' checkpoints match'+(R.endOk?', and the end state':''));
  P('');
  P('## Outcome');
  const o=S.over;P('- '+(o?o.why+' ('+o.outcome+')':'Not over')+(L?' · primary **'+(L.plan.primary||'?')+'**: '+L.prim.state:''));
  for(const [t,objs] of tr.objT)P('- '+clock(t)+': '+objs.map(x=>x.id+' '+x.state).join(', '));
  if(L&&L.opt.length)P('- Optionals: '+L.opt.map(x=>x.k+' '+x.state).join(', '));
  if(L){
    P('');P('## Phases');
    P('- '+L.phaseT.map((t,i)=>t==null?null:'Phase '+(i+1)+' at '+clock(t)).filter(Boolean).join(' · ')+(L.alarmWhy?' (alarm: '+L.alarmWhy+')':''));
    if(L.distress)P('- Distress: '+(L.distress.cut?'cut':L.distress.landed?'landed at '+clock(L.distress.t):'sending')+(L.responseAt!=null?' · response due '+clock(L.responseAt):''));
    P('');P('## Requests');
    if(!L.req.log.length)P('- None');
    for(const q of L.req.log){const who=(S.ships.find(s=>s.id===q.who)||{name:q.who}).name;
      P('- '+clock(q.t0)+' **'+q.k+'** · '+who+': "'+q.line+'" → '+(q.answer||'?')+' ('+(q.by==='player'?'you, at '+clock(q.sentT):q.by==='default'?'timed out: their default':q.by==='unasked'?'not asked: their default':q.by==='off'?'requests off: their default':q.by||'open')+')'+(q.doneT!=null?' · applied '+clock(q.doneT):''));}
    P('');P('## Powers');
    if(!L.powLog.length)P('- None');
    for(const p of L.powLog)P('- '+clock(p.t)+' '+p.k+(p.act?' ('+p.act+')':'')+' · Phase '+p.phase+' · '+p.cost+' CP');
    for(const r of L.powRes||[])P('  - '+clock(r.t)+' '+r.k+': '+r.text);
    P('');P('## Losses');
    const dead=S.ships.filter(s=>s.faction==='reb'&&s.wing&&!s.alive&&!s.jumped);
    if(!dead.length)P('- None');
    for(const s of dead){const d=(L.deaths||[]).find(x=>x.id===s.id),p=L.pods.find(x=>x.ship===s.id);
      P('- '+s.name+(d?' at '+clock(d.t)+' (Phase '+d.phase+') to '+d.by+(d.byName?' ('+d.byName+')':'')+' · wing on '+(d.exec?d.exec.k:'?')+(d.covered?'':' · nobody defending its wing'):'')+(p?' · pod '+p.state:''));}
  }
  // seconds per verb, for each of your ships
  P('');P('## What each ship did (seconds per verb)');
  const per={};const dt=(tr.samples[1]?tr.samples[1].t-tr.samples[0].t:1);
  for(const sm of tr.samples)for(const sh of sm.ships){if(!sh.alive||sh.f!=='reb'||!sh.wing)continue;const v=verbOf(sh);(per[sh.id]=per[sh.id]||{name:sh.name,wing:sh.wing,v:{}}).v[v]=(per[sh.id].v[v]||0)+dt;}
  for(const id in per){const e=per[id];P('- **'+e.name+'** ('+e.wing+'): '+Object.entries(e.v).sort((a,b)=>b[1]-a[1]).map(([v,n])=>v+' '+Math.round(n)+' s').join(', '));}
  if(L){
    const devs=tr.samples.filter(s=>s.fr&&s.fr.alive&&s.fr.dev!=null).map(s=>s.fr.dev);
    if(devs.length){P('');P('## The freighter');P('- Off its lane: max '+Math.max(...devs)+', mean '+Math.round(devs.reduce((a,b)=>a+b,0)/devs.length)+' units');
      const f=tr.samples[tr.samples.length-1].fr;if(f)P('- At the end: '+(f.alive?'alive':f.jumped?'jumped':'dead')+' · leg '+f.leg+' · hull '+f.hull+' · subsystems down: '+(f.subs.filter(x=>x.hp<=0&&x.k!=='cargo').map(x=>x.k+(x.i!=null?x.i:'')).join(', ')||'none'));}
    P('');P('## Curves (every 10 s)');
    P('| t | phase | CP | detection | resolve | freighter v | off lane |');P('|---|---|---|---|---|---|---|');
    for(const sm of tr.samples)if(Math.round(sm.t)%10===0)P('| '+clock(sm.t)+' | '+sm.phase+' | '+sm.cp+' | '+sm.detect+' | '+sm.resolve+' | '+(sm.fr&&sm.fr.alive?sm.fr.v:'—')+' | '+(sm.fr&&sm.fr.alive&&sm.fr.dev!=null?sm.fr.dev:'—')+' |');
  }
  const st=stuck(R);P('');P('## Stuck detectors');
  if(!st.length)P('- Nothing stuck');for(const x of st)P('- '+x);
  return out.join('\n');
}
/* the stuck detectors: a wing in one verb 60 s with no progress; a ship circling; a primary with no progress 90 s;
   a request repeating with the same answer; an objective that can no longer be won */
function progressKey(sm){
  if(!sm.fr)return '';const st=sm.state||{};
  return [sm.fr.hull,st.prize?Math.round(sm.fr.x/500)+','+Math.round(sm.fr.y/500):'',sm.fr.subs.map(x=>x.hp+(x.taken?'t':'')).join('.'),st.board,st.hauled,sm.resolve,st.tag,st.respKills,st.transfer,st.prize,st.surrender,
    sm.ships.filter(s=>!s.alive&&!s.jumped).length].join('|');
}
function stuck(R){
  const tr=R.tr,L=R.L,out=[],sm=tr.samples;if(!sm.length)return out;
  // the wing in one verb with no progress
  if(L){const wings=[...new Set(sm[0].ships.filter(s=>s.wing).map(s=>s.wing))];
    for(const w of wings){let since=0,verb=null,key=null;
      for(let i=0;i<sm.length;i++){const ws=sm[i].ships.filter(s=>s.wing===w&&s.alive);if(!ws.length){verb=null;continue;}
        const v=[...new Set(ws.map(verbOf))].join('/'),k=progressKey(sm[i]);
        if(v!==verb||k!==key||/Withdraw|Leaving/.test(v)){verb=v;key=k;since=sm[i].t;continue;}   // going home is progress
        if(sm[i].t-since>=60){out.push(w+' was "'+v+'" for over 60 s with no progress ('+clock(since)+'–'+clock(sm[i].t)+')');since=1e9;}}}}
  // a ship circling: three full turns whose centres stay within 400 units
  const byShip={};for(const s of sm)for(const sh of s.ships)if(sh.alive&&sh.f==='reb'&&sh.wing)(byShip[sh.id]=byShip[sh.id]||[]).push([s.t,sh.x,sh.y,sh.h,sh.name]);
  for(const id in byShip){const a=byShip[id];let acc=0,cx=0,cy=0,n=0,wraps=[],said=false;
    for(let i=1;i<a.length;i++){let d=a[i][3]-a[i-1][3];while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;acc+=d;cx+=a[i][1];cy+=a[i][2];n++;
      if(Math.abs(acc)>=2*Math.PI){wraps.push({x:cx/n,y:cy/n,t:a[i][0]});acc=0;cx=cy=n=0;
        const k=wraps.length;if(k>=3&&!said){const w3=wraps.slice(k-3);if(w3.every(p=>Math.hypot(p.x-w3[0].x,p.y-w3[0].y)<400)){out.push(a[i][4]+' circled three times in one place by '+clock(a[i][0]));said=true;}}}}}
  // the primary with no progress for 90 s
  if(L){let since=sm[0].t,key=progressKey(sm[0]),said=false;
    for(const s of sm){const k=progressKey(s);if(k!==key){key=k;since=s.t;}else if(s.t-since>=90&&!said&&R.S.objectives[0]){out.push('The primary made no progress for 90 s from '+clock(since));said=true;}}
    // a request repeating with the same answer
    const seen={};for(const q of L.req.log){const k=q.k+':'+q.who+':'+q.answer;seen[k]=(seen[k]||0)+1;}
    for(const k in seen)if(seen[k]>1){const [kk,who,ans]=k.split(':');out.push('The "'+kk+'" request came '+seen[k]+' times from '+((R.S.ships.find(s=>s.id===who)||{name:who}).name)+', answered '+ans+' each time');}
    // an objective that can no longer be won
    const lost=unwinnable(R);if(lost)out.push(lost);}
  return out;
}
function unwinnable(R){
  const L=R.L,S=R.S,k=L.plan.primary,live=s=>s.alive&&s.faction==='reb'&&s.wing;
  if(L.prim.state!=='live')return null;
  const has=lo=>S.ships.some(s=>live(s)&&s.load35===lo);
  if(k==='steal'&&!has('board')&&!L.boarded)return 'Steal can no longer be won: no Boarding party left';
  if(k==='strip'&&!has('pods')&&!L.hauled)return 'Strip can no longer be won: no Cargo pods left';
  if((k==='steal'||k==='strip'||k==='crash')&&!L.disabled&&!has('bombs')&&!S.ships.some(s=>live(s)&&s.prop35==='ram'))return PRIMARY(k)+' can no longer be won: nothing left that can disable the freighter';
  if(k==='tag'&&L.tag.ship&&!(S.ships.find(s=>s.id===L.tag.ship)||{}).alive)return 'Tag can no longer be won: the tagger is gone';
  return null;
}
const PRIMARY=k=>k.charAt(0).toUpperCase()+k.slice(1);

/* ---------- the queries ---------- */
function at(R,secs){
  const sm=R.tr.samples.reduce((b,s)=>Math.abs(s.t-secs)<Math.abs(b.t-secs)?s:b,R.tr.samples[0]);
  const out=['# State at '+clock(sm.t)+(sm.phase?' · Phase '+sm.phase+' · CP '+sm.cp+' · detection '+sm.detect+' · resolve '+sm.resolve:'')];
  if(sm.exec)out.push('','Executive Orders: '+Object.entries(sm.exec).map(([w,e])=>w+' '+(e?e.k+(e.arg&&typeof e.arg==='string'?' '+e.arg:''):'—')+(sm.off[w]?' (OFF PLAN: '+sm.off[w]+')':'')).join(' · '));
  if(sm.fr)out.push('','Freighter: '+(sm.fr.alive?'alive':sm.fr.jumped?'jumped':'dead')+' at '+sm.fr.x+','+sm.fr.y+' · leg '+sm.fr.leg+' · '+sm.fr.v+' u/s · hull '+sm.fr.hull+' · '+sm.fr.dev+' off its lane',
    'Subsystems: '+sm.fr.subs.filter(x=>x.k!=='cargo').map(x=>x.k+(x.i!=null?x.i:'')+' '+x.hp+'/'+x.max).join(', ')+' · cargo '+sm.fr.subs.filter(x=>x.k==='cargo'&&x.hp>0&&!x.taken).length+' aboard',
    'State: '+JSON.stringify(sm.state));
  out.push('','| ship | wing | doing | why | target | hull | shields | at |','|---|---|---|---|---|---|---|---|');
  for(const s of sm.ships)if(s.alive)out.push('| '+s.name+' | '+(s.wing||s.f)+' | '+verbOf(s)+' | '+s.why+' | '+(s.target||'')+' | '+s.hull+'/'+s.maxHull+' | '+s.sh+' | '+s.x+','+s.y+' |');
  return out.join('\n');
}
function timeline(R,pick){   // verb segments for the ships pick() chooses
  const segs={};
  for(const sm of R.tr.samples)for(const s of sm.ships){if(!pick(s))continue;const v=s.alive?verbOf(s)+(s.why?' ('+s.why+')':''):s.jumped?'jumped out':'down';
    const a=segs[s.id]||(segs[s.id]={name:s.name,list:[]});const l=a.list[a.list.length-1];if(l&&l.v===v)l.t1=sm.t;else a.list.push({v,t0:sm.t,t1:sm.t});}
  const out=[];for(const id in segs){out.push('## '+segs[id].name);for(const g of segs[id].list)out.push('- '+clock(g.t0)+'–'+clock(g.t1)+' '+g.v);}
  return out.join('\n');
}
function objective(R){
  const L=R.L;if(!L)return 'No Type 3.5 primary in this run.';
  const k=L.plan.primary,out=['# '+PRIMARY(k)+': its conditions over time','','| t | phase | state |','|---|---|---|'];
  const pick={steal:s=>'disabled '+s.disabled+' · board '+Math.round(s.board*100)+'% · prize '+s.prize+' · home '+s.prizeHome,
    pirate:(s,sm)=>'resolve '+sm.resolve+' · offered '+(s.offered!=null&&s.offered!==false?clock(s.offered):'no')+' · surrender '+s.surrender+' · transfer '+s.transfer+' s · done '+s.transferred,
    strip:s=>'disabled '+s.disabled+' · hauled '+s.hauled,destroy:(s,sm)=>'freighter hull '+(sm.fr?sm.fr.hull:'—'),
    crash:s=>'disabled '+s.disabled+' · outside the pull by '+s.planet+' · crashed '+s.crashed,tag:s=>'tag '+s.tag+' s · planted '+s.planted+' · escaped '+s.escaped,
    ambush:s=>'response kills '+s.respKills+' · response due '+(s.responseAt!=null?clock(s.responseAt):'—')}[k]||(()=>'');
  for(const sm of R.tr.samples)if(sm.state&&Math.round(sm.t)%5===0)out.push('| '+clock(sm.t)+' | '+sm.phase+' | '+pick(sm.state,sm)+' |');
  return out.join('\n');
}

/* ---------- the command line ---------- */
if(require.main===module){
  const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--')&&!/^\d+:\d\d$/.test(a)&&args[args.indexOf(a)-1]!=='--ship'&&args[args.indexOf(a)-1]!=='--wing');
  if(!file){console.error('usage: node tools/run-report.js <flight record .json> [--at m:ss] [--ship Name] [--wing Name] [--objective] [--json]');process.exit(2);}
  const rec=JSON.parse(fs.readFileSync(file,'utf8'));
  const val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:null;};
  const R=replay(rec,{keepGoing:false});
  if(args.includes('--json')){const sm=R.tr.samples;console.log(JSON.stringify({ok:R.ok,diverged:R.tr.diverged,warn:R.warn,checked:R.tr.checked,over:R.S.over,
    requests:R.L?R.L.req.log.map(q=>({k:q.k,who:q.who,answer:q.answer,by:q.by,t0:q.t0,sent:q.sentT,done:q.doneT})):[],powers:R.L?R.L.powLog:[],stuck:stuck(R),samples:sm},null,1));}
  else if(val('--at'))console.log(at(R,parseClock(val('--at'))));
  else if(val('--ship')){const n=val('--ship').toLowerCase();console.log(timeline(R,s=>s.name.toLowerCase()===n||s.id===n));}
  else if(val('--wing')){const n=val('--wing').toLowerCase();console.log(timeline(R,s=>(s.wing||'').toLowerCase()===n));}
  else if(args.includes('--objective'))console.log(objective(R));
  else console.log(report(R));
  process.exit(R.tr.diverged?1:0);
}
module.exports={loadSim,replay,report,at,timeline,objective,stuck,clock_:clock};
