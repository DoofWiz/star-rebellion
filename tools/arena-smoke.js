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
  // a move toward a point L ahead of where the ship's next move starts, da radians off its heading
  const at=(id,L,da)=>{const st=S2.planEnd(id);return [st.x+Math.cos(st.h+(da||0))*L,st.y+Math.sin(st.h+(da||0))*L];};
  const move=(id,L,da)=>S2.addMove(id,...at(id,L,da));
  // 1. boot: the picker lists every scenario; three execs of e1_fox
  out.boot={active:SR.active,picker:!document.getElementById('arPicker').hidden,ids:F.pickerIds()};
  F.start('e1_fox',0,11);
  for(let i=0;i<3;i++){const me=reb()[0];if(me.alive){move(me.id,500,0.3);move(me.id,400,0);}F.go();F.runExec();}
  out.boot.turn=sim().turn;out.boot.phase=sim().phase;
  // 2. moves (C-57): a move inside the envelope ends on the pointer; outside it, on the envelope's edge
  F.addScenario({id:'t_fit',title:'fit',desc:'',rocks:'open',player:[{cls:'talon',at:[1500,1500,0]},{cls:'graf',at:[1500,2200,0]},{cls:'talon',at:[1500,800,0]}],
    enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:1,at:[3800,2700,Math.PI]}],objective:{kind:'survive',secs:600}});
  F.start('t_fit',0,1);
  const [tal,graf,clp]=reb(),SU=S2.SU;
  const legal=(sh,a)=>a.type===S2.fn.classify(S2.fn.envOf(sh),a.len,a.turn);
  const miss=(a,p)=>Math.round(Math.hypot(a.end.x-p[0],a.end.y-p[1]));
  out.fit={};
  let p=at(tal.id,600,0),pv=S2.previewMove(tal.id,...p);
  out.fit.straight=[pv.arc.type,Math.round(pv.arc.len),miss(pv.arc,p),pv.arc.cost];
  p=at(tal.id,2000,0);pv=S2.previewMove(tal.id,...p);
  out.fit.far=[pv.arc.type,Math.round(pv.arc.len)];   // the Talon's longest straight is 5 x SU
  p=at(tal.id,380,0.3);pv=S2.previewMove(tal.id,...p);   // a chord 0.3 rad off the nose: a 34° bank
  out.fit.bank=[pv.arc.type,miss(pv.arc,p),pv.arc.cost];
  p=[graf.x-200,graf.y+120];pv=S2.previewMove(graf.id,...p);   // a point behind and beside the Graf: a hairpin it cannot fly
  out.fit.hairpin=[pv.arc.type,Math.round(Math.abs(pv.arc.turn)*180/Math.PI),miss(pv.arc,p)];
  clp.crits=['engine','engine'];
  pv=S2.previewMove(clp.id,...at(clp.id,2600,0));
  out.fit.clamped={max:S2.fn.maxSpeedOf(clp),len:Math.round(pv.arc.len)};
  // chaining: the next move starts where the last ended; the round's distance runs out
  const a1=move(tal.id,750,0),st1=S2.planEnd(tal.id);
  out.fit.chain=[!!a1,Math.round(Math.hypot(st1.x-a1.end.x,st1.y-a1.end.y)),Math.round(st1.left)];
  move(tal.id,750,0);move(tal.id,750,0);
  out.fit.spent=[S2.planEnd(tal.id).left<1,S2.previewMove(tal.id,...at(tal.id,300,0)).arc===null];
  out.fit.legal=tal.plan2.arcs.every(a=>legal(tal,a));
  // AP: a move the AP can't pay for is refused
  graf.ap.used=graf.ap.max+graf.ap.bonus-1;
  out.fit.short=[S2.previewMove(graf.id,...at(graf.id,300,0.7)).ok,S2.addMove(graf.id,...at(graf.id,300,0.7))];
  graf.ap.used=0;
  // 3. continuous fire: a head-on pass; a shot lands strictly inside the exec, shields first
  F.addScenario({id:'t_pass',title:'pass',desc:'',rocks:'open',player:[{cls:'talon',at:[1400,1500,0],pilot:{preset:'veteran'}}],
    enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:1,at:[2900,1500,Math.PI]}],objective:{kind:'survive',secs:600}});
  F.start('t_pass',0,3);
  D.A.shots.length=0;
  move('P1',450,0);move('P1',450,0);
  const t0=sim().time;F.go();F.runExec();const t1=sim().time;
  const shots=D.A.shots.slice();
  out.fire={n:shots.length,mid:shots.filter(e=>e.at>t0+1e-6&&e.at<t1-1e-6).length,span:[t0,t1],
    hits:shots.filter(e=>e.hit).map(e=>({at:e.at,sd:e.sd,ad:e.ad,hd:e.hd,left:e.zoneLeft,t:e.t}))};
  out.fire.shieldsFirst=shots.filter(e=>e.hit).every(e=>e.hd===0&&e.ad===0||e.zoneLeft===0);
  out.fire.shieldHit=shots.some(e=>e.hit&&e.sd>0);
  // 4. interrupts: Snap Shot mid-exec for AP, the nerve floor, an empty meter, the cap
  F.addScenario({id:'t_int',title:'int',desc:'',rocks:'open',player:[{cls:'talon',at:[1500,1500,0],pilot:{preset:'veteran'}}],
    enemies:[{type:'vc-mote-patrol',doctrine:'pursuit',n:1,at:[1950,1500,Math.PI]}],objective:{kind:'survive',secs:600}});
  F.start('t_int',0,5);
  const me=reb()[0];
  move(me.id,600,0);F.go();
  F.runUntil(0.5);
  const cool0=me.pilot.cool,shots0=me.stats.shots,ap0=S2.apLeft(me);
  const iv=F.interrupt(me.id);
  const pausedAt=sim().execT;
  F.runUntil(1.0);                    // paused: no time passes
  const frozen=sim().execT===pausedAt;
  D.A.shots.length=0;
  F.verb('snap');
  const snap=D.A.shots.find(e=>e.snap);
  out.int={opened:iv,frozen,snap:!!snap,paid:ap0-S2.apLeft(me),cost:S2.AP_SNAP_(),nerve:me.pilot.cool-cool0,shots:me.stats.shots-shots0,resumed:!sim().paused};
  F.runUntil(1.5);out.int.after=sim().execT>pausedAt;
  me.pilot.cool=S2.INT_FLOOR_()-5;
  out.int.floor=S2.interrupt(me.id);
  me.pilot.cool=60;
  const used=me.ap.used;me.ap.used=me.ap.max+me.ap.bonus;   // nothing left in the meter
  out.int.empty=S2.interrupt(me.id);
  me.ap.used=used;S2.T.INT_CAP=1;   // a cap of one this exec: one is spent already
  out.int.cap=S2.interrupt(me.id);
  S2.T.INT_CAP=0;
  out.int.second=S2.interrupt(me.id);if(out.int.second.ok)F.verb('cancel');
  // a Juke: one new move from where the ship is, paid for in AP
  const apJ=S2.apLeft(me);F.interrupt(me.id);
  const jr=F.juke(me.x+Math.cos(me.h+0.4)*250,me.y+Math.sin(me.h+0.4)*250);
  out.int.juke=[jr.ok,jr.arc&&jr.arc.type,apJ-S2.apLeft(me),jr.arc&&S2.AP_JUKE_()+jr.arc.cost];
  F.runExec();
  // the Cool bonus: a Cool pilot has it; spending into it drops them just out of Cool
  F.start('t_int',0,6);
  const cp=reb()[0];
  out.cool={cool:cp.pilot.cool,bonus:cp.ap.bonus,max:cp.ap.max};
  while(S2.apLeft(cp)>cp.ap.bonus&&move(cp.id,300,0.3)){}   // spend the base pool on banks (and the round's distance)
  S2.setStance(cp.id,'evade',true);S2.setStance(cp.id,'lockin',false);
  const spentInto=S2.apPlanned(cp)>cp.ap.max;
  F.go();
  out.cool.after=[spentInto,cp.ap.bonusSpent,cp.pilot.cool,S2.fn.coolState(cp)];
  F.runExec();
  F.start('t_int',0,6);reb()[0].pilot.cool=40;F.go();F.runExec();   // the next round's meter is set by the nerve then
  out.cool.steady=[reb()[0].ap.bonus,reb()[0].pilot.cool];
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
    for(const s of reb())if(s.alive){const st=S2.planEnd(s.id),ty=dep.y+(s.id==='P1'?-200:200);for(let k=0;k<3;k++){const q=S2.planEnd(s.id);S2.addMove(s.id,q.x+(dep.x-300-q.x)*0.4,q.y+(ty-q.y)*0.4);}void st;}
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
  const run=()=>{F.start('e1_fox',0,99);for(let i=0;i<3&&sim().phase==='PLAN';i++){const m=reb()[0];move(m.id,400,i%2?0.5:-0.5);move(m.id,500,0);F.go();F.runExec();}return F.hash();};
  const h1=run(),h2=run();
  F.start('e1_fox',0,100);for(let i=0;i<3&&sim().phase==='PLAN';i++){const m=reb()[0];move(m.id,400,i%2?0.5:-0.5);move(m.id,500,0);F.go();F.runExec();}
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
 ok(r.fit.straight[0]==='S'&&r.fit.straight[1]===600&&r.fit.straight[2]<=1&&r.fit.straight[3]===1,'a move straight ahead ends on the pointer, 1 AP '+r.fit.straight);
 ok(r.fit.far[0]==='S'&&r.fit.far[1]===750,'past the envelope it stops at the longest straight '+r.fit.far);
 ok(r.fit.bank[0]==='B'&&r.fit.bank[1]<=1&&r.fit.bank[2]===2,'a gentle curve is a bank that ends on the pointer, 2 AP '+r.fit.bank);
 ok(r.fit.hairpin[0]==='T'&&r.fit.hairpin[1]===90&&r.fit.hairpin[2]>100,'a hairpin on the Graf is its hardest legal turn, not the pointer '+r.fit.hairpin);
 ok(r.fit.clamped.max===3&&r.fit.clamped.len<=450,'a crit-clamped Talon moves within maxSpeedOf '+JSON.stringify(r.fit.clamped));
 ok(r.fit.chain[0]&&r.fit.chain[1]<=1,'the next move starts where the last one ended '+r.fit.chain);
 ok(r.fit.spent[0]&&r.fit.spent[1],'the round\'s distance runs out '+r.fit.spent);
 ok(r.fit.legal,'every move set is legal for its type');
 ok(r.fit.short[0]===false&&r.fit.short[1]===null,'a move the AP cannot pay for is refused '+JSON.stringify(r.fit.short));
 // 3
 ok(r.fire.mid>0,'a shot resolves strictly inside the exec '+JSON.stringify(r.fire));
 ok(r.fire.shieldHit&&r.fire.shieldsFirst,'damage reaches shields before hull '+JSON.stringify(r.fire.hits));
 // 4
 ok(r.int.opened===true&&r.int.frozen,'an interrupt pauses the sim '+JSON.stringify(r.int));
 ok(r.int.snap&&r.int.shots===1,'Snap Shot resolves an attack');
 ok(r.int.paid===r.int.cost&&r.int.nerve===0,'Snap Shot costs AP_SNAP AP and no nerve ('+r.int.paid+' v '+r.int.cost+', nerve '+r.int.nerve+')');
 ok(r.int.resumed&&r.int.after,'the sim resumes after the interrupt');
 ok(!r.int.floor.ok,'a pilot below INT_FLOOR is refused');
 ok(!r.int.empty.ok,'a pilot with no AP left is refused '+JSON.stringify(r.int.empty));
 ok(!r.int.cap.ok&&r.int.second.ok,'the per-exec cap holds when set '+JSON.stringify([r.int.cap,r.int.second]));
 ok(r.int.juke[0]&&r.int.juke[2]===r.int.juke[3],'a Juke sets one new move for AP_JUKE plus the move '+JSON.stringify(r.int.juke));
 ok(r.cool.cool>=70&&r.cool.bonus===2,'a Cool pilot has the Cool bonus '+JSON.stringify(r.cool));
 ok(r.cool.after[0]&&r.cool.after[1]&&r.cool.after[2]===69&&r.cool.after[3]!=='cool','spending into it drops the pilot out of Cool '+JSON.stringify(r.cool.after));
 ok(r.cool.steady[0]===0&&r.cool.steady[1]<70,'a pilot who is not Cool has no bonus '+r.cool.steady);
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
   x.ships.every(s=>['shots','hits','arcTicks','interrupts','nerve','apMax','apSpent'].every(k=>typeof s[k]==='number')));
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
