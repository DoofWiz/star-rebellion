/* The Arena and the space combat v2 sim (docs/ARENA-HANDOFF.md §8): node tools/arena-smoke.js
   (needs NODE_PATH=$(npm root -g)). Loads game/index.html#arena with cleared storage and drives it through
   DBGarena with the Arena's own seeded RNG; the wall clock never moves the sim (manual mode).
   1 boot and no-save   2 the fitter respects the envelope   3 continuous fire   4 interrupts
   5 doctrine           6 determinism                        7 scenarios and doctrines are data   8 metrics
   Plus the title screen's "Enter Arena" button. Output: one JSON object; exit 1 on any failure. */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
const CAMPAIGN_KEY='star-rebellion-campaign-v1';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 const pg=await ctx.newPage();
 const errs=[],metricsLines=[];
 pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
 pg.on('console',m=>{
  if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text());
  if(m.text().startsWith('ARENA_METRICS '))metricsLines.push(m.text().slice(14));
 });
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.goto(base+'#arena');await pg.waitForTimeout(700);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGarena,F=D.fn,S2=D.SIM2,out={};
  F.manual(true);
  const sim=()=>D.sim;
  const reb=()=>sim().ships.filter(s=>s.faction==='reb');
  const straight=(s,L,da)=>{const pts=[{x:s.x,y:s.y}];for(let k=1;k<=8;k++){const a=s.h+(da||0)*k/8;pts.push({x:pts[k-1].x+Math.cos(a)*L/8,y:pts[k-1].y+Math.sin(a)*L/8});}return pts;};
  // 1. boot: the picker lists every scenario; three execs of e1_fox
  out.boot={active:SR.active,picker:!document.getElementById('arPicker').hidden,ids:F.pickerIds()};
  F.start('e1_fox',0,11);
  for(let i=0;i<3;i++){const me=reb()[0];if(me.alive)S2.setPath(me.id,straight(me,900,0.4));F.go();F.runExec();}
  out.boot.turn=sim().turn;out.boot.phase=sim().phase;
  // 2. the fitter: a straight drag on a Talon; a hairpin on the freighter; a crit-clamped Talon
  F.addScenario({id:'t_fit',title:'fit',desc:'',rocks:'open',player:[{cls:'talon',at:[1500,1500,0]},{cls:'graf',at:[1500,2200,0]},{cls:'talon',at:[1500,800,0]}],
    enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:1,at:[3800,2700,Math.PI]}],objective:{kind:'survive',secs:600}});
  F.start('t_fit',0,1);
  const [tal,graf,clp]=reb();
  const legal=s=>S2.fn.dialAvail(s).map(m=>m.join(''));
  const fs=S2.setPath(tal.id,straight(tal,1500,0));
  out.fit={straight:fs.map(m=>m.join('')),straightLegal:fs.every(m=>legal(tal).includes(m.join('')))&&fs.every(m=>m[1]==='S')};
  const hp=[{x:graf.x,y:graf.y},{x:graf.x+260,y:graf.y},{x:graf.x+260,y:graf.y+120},{x:graf.x,y:graf.y+120}];
  const fh=S2.setPath(graf.id,hp),pv=S2.preview(graf.id),end=pv.pts.filter(p=>!p.coast).pop();
  out.fit.hairpin=fh.map(m=>m.join(''));
  out.fit.hairpinHard=fh.some(m=>m[1]==='L'||m[1]==='R')&&fh.every(m=>legal(graf).includes(m.join('')));
  out.fit.hairpinMiss=Math.round(Math.hypot(end.x-graf.x,end.y-(graf.y+120)));   // the drag ends 120 beside the start; the Graf cannot
  clp.crits=['engine','engine'];
  const fc=S2.setPath(clp.id,straight(clp,2600,0));
  out.fit.clamped={max:S2.fn.maxSpeedOf(clp),speeds:fc.map(m=>m[0])};
  // 3. continuous fire: a head-on pass; a shot lands strictly inside the exec, shields first
  F.addScenario({id:'t_pass',title:'pass',desc:'',rocks:'open',player:[{cls:'talon',at:[1400,1500,0],pilot:{preset:'veteran'}}],
    enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:1,at:[2900,1500,Math.PI]}],objective:{kind:'survive',secs:600}});
  F.start('t_pass',0,3);
  D.A.shots.length=0;
  S2.setPath('P1',straight(reb()[0],900,0));
  const t0=sim().time;F.go();F.runExec();const t1=sim().time;
  const shots=D.A.shots.slice();
  out.fire={n:shots.length,mid:shots.filter(e=>e.at>t0+1e-6&&e.at<t1-1e-6).length,span:[t0,t1],
    hits:shots.filter(e=>e.hit).map(e=>({at:e.at,sd:e.sd,ad:e.ad,hd:e.hd,left:e.zoneLeft,t:e.t}))};
  out.fire.shieldsFirst=shots.filter(e=>e.hit).every(e=>e.hd===0&&e.ad===0||e.zoneLeft===0);
  out.fire.shieldHit=shots.some(e=>e.hit&&e.sd>0);
  // 4. interrupts: Snap Shot mid-exec, the floor, the cap
  F.addScenario({id:'t_int',title:'int',desc:'',rocks:'open',player:[{cls:'talon',at:[1500,1500,0],pilot:{preset:'veteran'}}],
    enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:1,at:[1950,1500,Math.PI]}],objective:{kind:'survive',secs:600}});
  F.start('t_int',0,5);
  const me=reb()[0];
  S2.setPath(me.id,straight(me,600,0));F.go();
  F.runUntil(0.5);
  const cool0=me.pilot.cool,shots0=me.stats.shots;
  const iv=F.interrupt(me.id);
  const pausedAt=sim().execT;
  F.runUntil(1.0);                    // paused: no time passes
  const frozen=sim().execT===pausedAt;
  D.A.shots.length=0;
  F.verb('snap');
  const snap=D.A.shots.find(e=>e.snap);
  out.int={opened:iv,frozen,snap:!!snap,paid:cool0-me.pilot.cool,cost:S2.COST_SNAP_(),shots:me.stats.shots-shots0,resumed:!sim().paused};
  F.runUntil(1.5);out.int.after=sim().execT>pausedAt;
  me.pilot.cool=S2.INT_FLOOR_()-5;
  out.int.floor=S2.interrupt(me.id);
  me.pilot.cool=80;S2.T.INT_CAP=1;   // a cap of one this exec: one is spent already
  out.int.cap=S2.interrupt(me.id);
  S2.T.INT_CAP=2;
  out.int.second=S2.interrupt(me.id);if(out.int.second.ok)F.verb('cancel');
  S2.T.INT_CAP=0;
  F.runExec();
  // 5. doctrine: pursuit closes; hold_asset keeps its leash; a wingman flounders, then re-pairs
  F.start('e1_fox',0,21);
  const fox=reb()[0],hunters=sim().ships.filter(s=>s.faction==='heg');
  const d0=Math.min(...hunters.map(h=>Math.hypot(h.x-fox.x,h.y-fox.y)));
  for(let i=0;i<3&&sim().phase==='PLAN';i++){F.go();F.runExec();}
  const d3=Math.min(...hunters.filter(h=>h.alive).map(h=>Math.hypot(h.x-fox.x,h.y-fox.y)));
  out.doc={pursuit:[Math.round(d0),Math.round(d3)]};
  F.start('e4_read',1,8);
  const dep=sim().ships.find(s=>s.id==='D1'),guards=sim().ships.filter(s=>s.doctrine==='hold_asset');
  let worst=0;
  for(let i=0;i<3&&sim().phase==='PLAN';i++){
    for(const s of reb())if(s.alive)S2.setPath(s.id,[{x:s.x,y:s.y},{x:dep.x-300,y:dep.y+(s.id==='P1'?-200:200)}]);
    F.go();
    while(sim().phase==='EXEC'){S2.tick(S2.TICK_()/1000);for(const g of guards)if(g.alive)worst=Math.max(worst,Math.hypot(g.x-dep.x,g.y-dep.y));}
  }
  const seg=5*S2.SU;   // the longest segment any Mote can fly
  out.doc.guard={worst:Math.round(worst),limit:S2.GUARD_R_()+seg,guards:guards.length};
  F.addScenario({id:'t_wing',title:'wing',desc:'',rocks:'open',player:[{cls:'talon',at:[700,1500,0]}],
    enemies:[{type:'vc-mote-patrol',doctrine:'wingman',n:3,at:[3200,1500,Math.PI]}],objective:{kind:'survive',secs:600}});
  F.start('t_wing',0,4);
  const W=sim().ships.filter(s=>s.doctrine==='wingman');
  out.doc.pairs=W.map(s=>s.id+':'+s.doc.role+':'+s.doc.mate);
  const lead=W.find(s=>s.doc.role==='lead'&&s.doc.mate),wing=W.find(s=>s.id===lead.doc.mate);
  F.go();F.runUntil(1);
  S2.fn.kill(lead.id);
  out.doc.flounder=wing.doc.role;
  F.runExec();
  for(let i=0;i<2&&sim().phase==='PLAN'&&wing.doc.role!=='wing';i++){F.go();F.runExec();}
  out.doc.repaired=[wing.doc.role,wing.doc.mate,!!wing.doc.repaired];
  // 6. determinism: same seed and orders twice
  const run=()=>{F.start('e1_fox',0,99);for(let i=0;i<3&&sim().phase==='PLAN';i++){const m=reb()[0];S2.setPath(m.id,straight(m,800,i%2?0.7:-0.7));F.go();F.runExec();}return F.hash();};
  const h1=run(),h2=run();
  F.start('e1_fox',0,100);for(let i=0;i<3&&sim().phase==='PLAN';i++){const m=reb()[0];S2.setPath(m.id,straight(m,800,i%2?0.7:-0.7));F.go();F.runExec();}
  out.det={h1,h2,other:F.hash()};
  // 7. data: a scenario appended at runtime reaches the picker and loads; a doctrine added at runtime flies
  let planned=0;
  S2.addDoctrine({key:'t_loiter',label:'Loiter',plan(s){planned++;return {kind:'hold'};},tell(){}});
  F.addScenario({id:'t_data',title:'Data scenario',desc:'appended at runtime',rocks:'scatter',player:[{cls:'cross',pilot:{preset:'ace'}}],
    enemies:[{type:'vc-mote-patrol',doctrine:'t_loiter',n:2}],objective:{kind:'survive',secs:12}});
  F.openPicker();
  out.data={listed:F.pickerIds().includes('t_data'),btn:!!document.querySelector('#arPicker [data-start="t_data"]')};
  document.querySelector('#arPicker [data-start="t_data"]').click();
  out.data.loaded=[sim().scen.id,sim().ships.length,sim().ships.filter(s=>s.doctrine==='t_loiter').length];
  F.go();F.runExec();F.go();F.runExec();
  out.data.planned=planned;out.data.over=[sim().phase,sim().result&&sim().result.win];
  // the panel's sliders read the same constants the getters expose
  const sl=[...document.querySelectorAll('#arPanel [data-tune]')];
  out.panel={n:sl.length,match:sl.every(i=>+i.value===S2.T[i.dataset.tune]||Math.abs(+i.value-S2.T[i.dataset.tune])<=+i.step),cap:!!document.querySelector('#arPanel [data-tune="INT_CAP"]')};
  out.metricsN=D.A.metrics.length;
  out.keys=Object.keys(localStorage);
  return out;
 });
 // 1
 ok(r.boot.active==='arena'&&r.boot.picker,'the Arena boots to the picker '+JSON.stringify(r.boot));
 for(const id of ['e1_fox','e2_sweep','e3_count','e4_read','e5_job'])ok(r.boot.ids.includes(id),'picker lists '+id);
 ok(r.boot.turn>=3||r.boot.phase==='OVER','e1_fox runs three execs '+JSON.stringify(r.boot));
 ok(!r.keys.includes(CAMPAIGN_KEY),'the Arena never writes the campaign save: '+r.keys.join(','));
 // 2
 ok(r.fit.straightLegal,'a straight drag fits straights from the dial '+r.fit.straight);
 ok(r.fit.hairpinHard,'a hairpin on the Graf fits its hardest legal turns '+r.fit.hairpin);
 ok(r.fit.hairpinMiss>100,'and not the drag ('+r.fit.hairpinMiss+' off)');
 ok(r.fit.clamped.max===3&&r.fit.clamped.speeds.length&&r.fit.clamped.speeds.every(v=>v<=3),'a crit-clamped Talon flies within maxSpeedOf '+JSON.stringify(r.fit.clamped));
 // 3
 ok(r.fire.mid>0,'a shot resolves strictly inside the exec '+JSON.stringify(r.fire));
 ok(r.fire.shieldHit&&r.fire.shieldsFirst,'damage reaches shields before hull '+JSON.stringify(r.fire.hits));
 // 4
 ok(r.int.opened===true&&r.int.frozen,'an interrupt pauses the sim '+JSON.stringify(r.int));
 ok(r.int.snap&&r.int.shots===1,'Snap Shot resolves an attack');
 ok(r.int.paid===r.int.cost,'Snap Shot costs COST_SNAP nerve ('+r.int.paid+' v '+r.int.cost+')');
 ok(r.int.resumed&&r.int.after,'the sim resumes after the interrupt');
 ok(!r.int.floor.ok,'a pilot below INT_FLOOR is refused');
 ok(!r.int.cap.ok&&r.int.second.ok,'the per-exec cap holds '+JSON.stringify([r.int.cap,r.int.second]));
 // 5
 ok(r.doc.pursuit[1]<r.doc.pursuit[0],'a pursuit enemy closes on its target '+r.doc.pursuit);
 ok(r.doc.guard.guards===3&&r.doc.guard.worst<=r.doc.guard.limit,'hold_asset stays within GUARD_R plus a segment '+JSON.stringify(r.doc.guard));
 ok(r.doc.flounder==='flounder','a wingman flounders when its lead dies ('+r.doc.flounder+') '+r.doc.pairs);
 ok(r.doc.repaired[0]==='wing'&&r.doc.repaired[2],'then re-pairs '+JSON.stringify(r.doc.repaired));
 // 6
 ok(r.det.h1===r.det.h2,'same seed and orders give the same end state '+JSON.stringify(r.det));
 ok(r.det.h1!==r.det.other,'a different seed gives a different fight');
 // 7
 ok(r.data.listed&&r.data.btn,'a scenario appended at runtime reaches the picker');
 ok(r.data.loaded[0]==='t_data'&&r.data.loaded[1]===3&&r.data.loaded[2]===2,'and loads '+r.data.loaded);
 ok(r.data.planned>=4&&r.data.over[0]==='OVER'&&r.data.over[1]===true,'a doctrine added at runtime plans its ships '+JSON.stringify([r.data.planned,r.data.over]));
 ok(r.panel.n>=12&&r.panel.match&&r.panel.cap,'every panel slider shows its SIM2 constant '+JSON.stringify(r.panel));
 // 8
 const recs=metricsLines.map(l=>{try{return JSON.parse(l);}catch(e){return null;}});
 const good=recs.filter(x=>x&&x.scenario&&x.seed!==undefined&&x.turn>=1&&typeof x.planningMs==='number'&&Array.isArray(x.ships)&&x.objective&&
   x.ships.every(s=>['shots','hits','arcTicks','interrupts','nerve'].every(k=>typeof s[k]==='number')));
 ok(recs.length>0&&good.length===recs.length,'every ARENA_METRICS record is well formed ('+good.length+' of '+recs.length+')');
 ok(recs.length===r.metricsN,'one record per exec ('+recs.length+' logged, '+r.metricsN+' kept)');
 // the title screen: "Enter Arena" beside Start, and it never writes the save either
 const ctx2=await b.newContext({viewport:{width:1280,height:800}});
 const pg2=await ctx2.newPage();
 pg2.on('pageerror',e=>errs.push('title: '+e.message));
 await pg2.goto(base);
 await pg2.waitForFunction(()=>{const s=document.getElementById('splash');return s&&s.className.includes('is-ready');},null,{timeout:15000}).catch(()=>{});
 const hasBtn=await pg2.evaluate(()=>!!document.getElementById('splashArena'));
 ok(hasBtn,'the title screen has Enter Arena');
 if(hasBtn){
  await pg2.click('#splashArena');await pg2.waitForTimeout(900);
  const t=await pg2.evaluate(k=>({active:SR.active,picker:!document.getElementById('arPicker').hidden,base:!document.getElementById('sc-base').hidden,save:localStorage.getItem(k)}),CAMPAIGN_KEY);
  ok(t.active==='arena'&&t.picker&&!t.base&&t.save===null,'Enter Arena reaches the picker without the campaign '+JSON.stringify(t));
 }
 await ctx2.close();
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r},null,0));
 if(fails.length){console.error('arena-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('arena-smoke OK');
})();
