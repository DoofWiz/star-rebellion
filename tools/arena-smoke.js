/* The Arena and the space combat v2 sim (docs/ARENA-HANDOFF.md §8): node tools/arena-smoke.js
   (needs NODE_PATH=$(npm root -g)). Loads game/index.html#arena with cleared storage and drives it through
   DBGarena with the Arena's own seeded RNG; the wall clock never moves the sim (manual mode).
   1 boot and no-save   2 the fitter respects the envelope   3 continuous fire   4 interrupts
   5 doctrine           6 determinism                        7 scenarios and doctrines are data   8 metrics
   Plus the title screen's "Enter Arena" button. Output: one JSON object; exit 1 on any failure.
   SB Test section (docs/ARENA-SB-HANDOFF.md §9; game/js/arena-sb.js and sim-sb.js, through DBGarena.sb)
     1 picker: both rulesets first, the allowlist, e1_fox under each with the same cast, no campaign save
     3 the envelope   4 projectiles   5 lock and missiles   6 determinism   7 metrics and live fire
     B4: Drift with the real mouse, movesets by preset, the actions   B5: doctrine, the panel, the experiments */
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
 /* ---------- SB Test (docs/ARENA-SB-HANDOFF.md §9), driven through DBGarena.sb ---------- */
 /* ---------- SB ---------- */
 const sb=await pg.evaluate((SAVE_KEY)=>{
  const top=window.DBGarena,D=top.sb,f=D.fn,out={};
  // 1. the picker: both rulesets first, then the scenarios under the chosen one
  top.fn.openPicker();
  out.rulesets=[...document.querySelectorAll('#arRulesets [data-ruleset-item] b')].map(e=>e.textContent);
  out.scenHidden=document.getElementById('arScnStep').hidden;
  document.querySelector('#arRulesets [data-ruleset="sb"]').click();
  out.scenShown=D.active&&!document.getElementById('sbPicker').hidden&&top.ruleset==='sb';
  out.lists=[top.fn.pickerIds().join(),[...document.querySelectorAll('#sbScenList [data-scen]')].map(e=>e.dataset.scen).join()];
  document.querySelector('#sbScenList [data-load="e1_fox"]').click();
  out.sbLoad=[D.phase,D.ruleset,D.mod&&D.mod.key,D.sim.S.ships.length];
  const sbCast=D.sim.S.ships.map(s=>s.id+Math.round(s.x)+','+Math.round(s.y)).join();
  f.runExecSync();f.runExecSync();
  const recs=D.metrics.filter(r=>r.scenario==='e1_fox');
  out.sbRec=recs[recs.length-1].ruleset;
  // back to the ruleset step, then v2 on the same scenario and seed: the same cast
  f.toRulesets();
  out.back=[!document.getElementById('arPicker').hidden,document.getElementById('arSb').hidden,!document.querySelector('#sc-arena .ar-shell').hidden];
  top.fn.chooseRuleset('v2');top.fn.manual(true);top.fn.start('e1_fox',0,1);
  const v2Cast=top.sim.ships.map(s=>s.id+Math.round(s.x)+','+Math.round(s.y)).join();
  top.fn.go();top.fn.runExec();
  out.v2Load=[top.ruleset,top.sim.metrics[top.sim.metrics.length-1].ruleset,v2Cast===sbCast];
  top.fn.chooseRuleset('sb');
  out.noSave=localStorage.getItem(SAVE_KEY)===null;
  // 3. the envelope
  f.load('e1_fox','sb',null,1);
  const F=D.sim.fn,fox=D.sim.S.ships.find(q=>q.id==='P1');
  const line=(o,ang,len,n)=>{const p=[];for(let i=0;i<=n;i++)p.push({x:o.x+Math.cos(ang)*len*i/n,y:o.y+Math.sin(ang)*len*i/n});return p;};
  // the drag is a destination (the designer, 11 Oct): ahead and a little to one side, the ship banks to it exactly
  const kap=F.kappaOf(fox),env=F.envelope(fox,'basic'),P0={x:fox.x,y:fox.y,h:fox.h},dl=F.dialOf(fox),SU=150,SC=D.sim.SPEED_SCALE_();
  const rel=(o,ahead,side)=>({x:o.x+Math.cos(o.h)*ahead-Math.sin(o.h)*side,y:o.y+Math.sin(o.h)*ahead+Math.cos(o.h)*side});
  const near=rel(P0,600,140),cb=F.buildCurve(fox,P0,[near],'basic'),eb=cb.pts[cb.pts.length-1];
  out.bank=[cb.reached,Math.round(Math.hypot(eb.x-near.x,eb.y-near.y)),cb.k!==0,cb.pts.every(q=>q.k===cb.k),Math.abs(cb.k)<=kap];
  // the reach (the designer, 11 Oct: a spearpoint): the top straight ahead, the top bank at 45°, the top hard turn
  // at 90°, from the dial; nothing turns past 90° or tighter than the minimum radius
  const Q=Math.PI/4,r=fox.row;
  out.reach=[Math.round(env.hi(0)),Math.round(r.straight_max*SU*SC),Math.round(env.hi(Q)),Math.round(r.bank_max*SU*SC),
    Math.round(env.hi(2*Q)),Math.round(r.turn_max*SU*SC),env.thMax===2*Q,Math.round(env.lo(2*Q))===Math.round(2*Q/kap)];
  // outside the reach (beside the nose, behind the shoulder): the nearest point of the reach, checked by brute force
  const tight=rel(P0,30,-150),ct=F.buildCurve(fox,P0,[tight],'basic'),et=ct.pts[ct.pts.length-1],missT=Math.hypot(et.x-tight.x,et.y-tight.y);
  let best=1e9;for(let i=0;i<=120;i++){const th=-env.thMax+2*env.thMax*i/120,a=env.lo(th),b=env.hi(th);if(b<a)continue;
    for(let j=0;j<=60;j++){const L=a+(b-a)*j/60,k=Math.abs(th)<1e-9?0:th/L,e=F.arcLocal(k,L);
      best=Math.min(best,Math.hypot(P0.x+e.x*Math.cos(P0.h)-e.y*Math.sin(P0.h)-tight.x,P0.y+e.x*Math.sin(P0.h)+e.y*Math.cos(P0.h)-tight.y));}}
  out.cap=[!ct.reached,Math.abs(ct.th)<=env.thMax+1e-9,missT<=best+1,F.feasible(env,ct.th,ct.L),Math.round(missT)];
  const long=F.buildCurve(fox,P0,line(fox,fox.h,3000,10),'basic');
  const short=F.buildCurve(fox,P0,line(fox,fox.h,40,2),'basic');
  out.talonLen=[Math.round(long.L),Math.round(env.Lmax),Math.round(short.L),Math.round(env.Lmin)];
  const graf={id:'G',row:SRDB.ship('graf'),faction:'reb',pilot:{preset:'green'},crits:[],x:2000,y:1500,h:0};
  const genv=F.envelope(graf,'basic');
  const gl=F.buildCurve(graf,{x:2000,y:1500,h:0},line(graf,0,3000,10),'basic');
  out.grafLen=[Math.round(gl.L),Math.round(genv.Lmax),genv.Lmax<env.Lmax];
  const boost=F.envelope(fox,'boost');
  out.boost=[boost.Lmax===env.Lmax*D.sim.BOOST_MULT_(),Math.abs(boost.kap-env.kap*D.sim.BOOST_TURN_())<1e-12];
  // a round is one dial move's distance, shared: the second segment's reach is what the first left
  const segs=F.planSegs('P1',[{kind:'flydef',pts:line(fox,fox.h,450,6)}]);
  const s1=F.segEnd(segs[0]);
  const c2=F.planSegs('P1',[{kind:'flydef',pts:line(fox,fox.h,450,6)},{kind:'basic',pts:line(s1,s1.h,3000,6)}]);
  out.planned=c2.length;
  out.budget=[Math.round(c2[0].L),Math.round(c2[1].L),Math.round(dl.smax-450),Math.round(F.distanceLeft(fox))];
  const end2=F.segEnd(c2[1]);
  out.sched=F.fullSchedule(fox,c2).length===2;   // no glide past a line that already covers the slowest straight
  f.beginExec();
  for(let i=0;i<20;i++)f.stepTick();
  out.flydefOn=fox.flydef;
  while(D.phase==='EXEC')f.stepTick();
  out.flydefOff=!fox.flydef;
  out.ends=Math.hypot(fox.x-end2.x,fox.y-end2.y)<1;
  // a short plan is topped up to the slowest straight with a glide; a long one flies exactly the line
  const one=F.planSegs('P1',[{kind:'basic',pts:line(fox,fox.h,150,3)}]);
  const full=F.fullSchedule(fox,one);
  const two=F.fullSchedule(fox,F.planSegs('P1',[{kind:'basic',pts:line(fox,fox.h,700,3)}]));
  out.glide=[full.length,!!full[1].auto,Math.round(full[0].L+full[1].L),Math.round(dl.smin),two.length];
  // speed within a manoeuvre: a hard turn brakes into its apex and powers out; flair off, it is flat; the path is the same
  const hard=rel(P0,200,330);
  const pace=on=>{D.sim.set('SPEED_FLAIR',on);const sc=F.paceSchedule(F.fullSchedule(fox,[F.buildCurve(fox,P0,[hard],'basic')]));D.sim.set('SPEED_FLAIR',true);return sc;};
  const fOn=pace(true),fOff=pace(false),sp=fOn[0].speed,mid=sp[Math.floor(sp.length/2)];
  const endOf=sc=>F.segEnd(sc[sc.length-1]);
  out.flair=[mid<sp[1]-0.1,mid<sp[sp.length-1]-0.1,fOff[0].speed.every(v=>v===1),
    Math.hypot(endOf(fOn).x-endOf(fOff).x,endOf(fOn).y-endOf(fOff).y)<1e-6,Math.abs(fOn[fOn.length-1].t1-f.EXEC_LEN_())<1e-6];
  // the slip: in a hard turn the nose leads the line of flight and the ship slides a little wide, back on line by the end
  const g=fOn[0],sc2={sched:fOn};const pm=F.poseAt(sc2,(g.t0+g.t1)/2);
  const ex=F.arcLocal(g.k,g.L/2),onArc={x:P0.x+ex.x*Math.cos(P0.h)-ex.y*Math.sin(P0.h),y:P0.y+ex.x*Math.sin(P0.h)+ex.y*Math.cos(P0.h)};
  const ge=g.pts[g.pts.length-1],ga=F.arcLocal(g.k,g.L),gend={x:P0.x+ga.x*Math.cos(P0.h)-ga.y*Math.sin(P0.h),y:P0.y+ga.x*Math.sin(P0.h)+ga.y*Math.cos(P0.h)};
  out.slip=[Math.sign(pm.h-pm.vh)===Math.sign(g.k)&&Math.abs(pm.h-pm.vh)>0.05,Math.hypot(g.pts[Math.floor(g.pts.length/2)].x-onArc.x,g.pts[Math.floor(g.pts.length/2)].y-onArc.y)>3,
    Math.hypot(ge.x-gend.x,ge.y-gend.y)<1e-6];
  return out;
 },CAMPAIGN_KEY);
 ok(sb.bank[0]&&sb.bank[1]<=1&&sb.bank[2]&&sb.bank[3]&&sb.bank[4],'SB 3: a reachable destination should be one banked arc ending on it '+JSON.stringify(sb.bank));
 ok(sb.reach[0]===sb.reach[1]&&sb.reach[2]===sb.reach[3]&&sb.reach[4]===sb.reach[5]&&sb.reach[6]&&sb.reach[7],'SB 3: the reach should follow the dial (straight, bank, hard turn) '+JSON.stringify(sb.reach));
 ok(sb.cap.slice(0,4).every(Boolean),'SB 3: outside the reach the ship should stop at its nearest point '+JSON.stringify(sb.cap));
 ok(Math.abs(sb.talonLen[0]-sb.talonLen[1])<=1&&Math.abs(sb.talonLen[2]-sb.talonLen[3])<=1,'SB 3: Talon segment lengths outside its reach '+JSON.stringify(sb.talonLen));
 ok(Math.abs(sb.grafLen[0]-sb.grafLen[1])<=1&&sb.grafLen[2],'SB 3: freighter reach '+JSON.stringify(sb.grafLen));
 ok(sb.boost.every(Boolean),'SB 3: Boost envelope '+JSON.stringify(sb.boost));
 ok(sb.planned===2&&sb.sched,'SB 3: two AP segments a round, and no glide past a full line');
 ok(sb.budget[0]===450&&Math.abs(sb.budget[1]-sb.budget[2])<=1&&sb.budget[3]===0,'SB 3: the second segment should get only the distance the first left '+JSON.stringify(sb.budget));
 ok(sb.flydefOn&&sb.flydefOff,'SB 3: Fly Defensively should hold for its segment only');
 ok(sb.ends,'SB 3: the ship did not end where its second segment ends');
 ok(sb.glide[0]===2&&sb.glide[1]&&Math.abs(sb.glide[2]-sb.glide[3])<=1&&sb.glide[4]===1,'SB 3: a short round tops up to the slowest straight, a long one flies the line '+JSON.stringify(sb.glide));
 ok(sb.flair.every(Boolean),'SB 3: a hard turn should brake into its apex and power out, path unchanged '+JSON.stringify(sb.flair));
 ok(sb.slip.every(Boolean),'SB 3: a hard turn should slip (nose leads, slides wide, back on line) '+JSON.stringify(sb.slip));
 ok(JSON.stringify(sb.rulesets)==='["SR V2 Combat","SB Test"]','SB 1: rulesets listed '+JSON.stringify(sb.rulesets));
 ok(sb.scenHidden&&sb.scenShown,'SB 1: the scenario step should follow the ruleset choice');
 ok(!sb.lists[0].includes('sb1_fox')&&sb.lists[1].includes('e1_fox')&&sb.lists[1].includes('sb2_drift'),'SB 1: the lists honour the rulesets allowlist '+JSON.stringify(sb.lists));
 ok(sb.back.every(Boolean),'SB 1: Change ruleset should return to the picker '+JSON.stringify(sb.back));
 ok(sb.sbLoad[0]==='PLAN'&&sb.sbLoad[1]==='sb'&&sb.sbLoad[2]==='sb'&&sb.sbLoad[3]===3,'SB 1: e1_fox under SB '+JSON.stringify(sb.sbLoad));
 ok(sb.sbRec==='sb','SB 1: SB metrics ruleset '+sb.sbRec);
 ok(sb.v2Load.join()==='v2,v2,true','SB 1: e1_fox under v2: same cast, ruleset in its metrics '+JSON.stringify(sb.v2Load));
 ok(sb.noSave,'SB 1: the campaign key appeared after a v2 run and an SB run');

 /* ---------- SB combat ---------- */
 const sc=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  const setup=()=>{
    f.load('e1_fox','sb',null,5);
    const S=D.sim.S,F=D.sim.fn;
    F.setRng(()=>0.5);
    const fox=S.ships.find(q=>q.id==='P1'),e1=S.ships.find(q=>q.id==='E1'),e2=S.ships.find(q=>q.id==='E2');
    e2.alive=false;S.rocks.length=0;   // an open field: the belt would block some of these lines
    Object.assign(fox,{x:1500,y:1500,h:0,vx:0,vy:0});Object.assign(e1,{x:1900,y:1500,h:Math.PI/2,vx:0,vy:0});
    fox.target='E1';e1.target='P1';
    return {S,F,fox,e1};
  };
  const hp=t=>t.segs.F.val+t.segs.R.val+t.arm+t.hull;
  const fly=(F,S)=>{for(let i=0;i<120&&S.proj.length+S.missiles.length;i++){F.projTick(0.05);F.missileTick(0.05);}};
  // 4. intersection
  let {S,F,fox,e1}=setup();
  let h0=hp(e1);F.shoot('P1',0);fly(F,S);out.direct=h0-hp(e1);
  ({S,F,fox,e1}=setup());e1.y=1500+120;h0=hp(e1);F.shoot('P1',0);fly(F,S);out.offset=h0-hp(e1);
  // skim vs direct: the same weapon, the same roll, no lock. Direct: into the broadside. Skim: along the hull's
  // length, grazing its edge.
  ({S,F,fox,e1}=setup());
  const ax=F.hullAxes(e1,false);
  e1.h=Math.PI/2;fox.x=1900-400;fox.y=1500;h0=hp(e1);F.shoot('P1',0);fly(F,S);const dDirect=h0-hp(e1);
  ({S,F,fox,e1}=setup());
  e1.h=0;fox.x=1900-400;fox.y=1500+ax.b*0.97;h0=hp(e1);F.shoot('P1',0);fly(F,S);const dSkim=h0-hp(e1);
  const hitD=F.hullHit(Object.assign({},e1,{h:Math.PI/2}),{x:1500,y:1500},{x:2000,y:1500},false);
  const hitS=F.hullHit(Object.assign({},e1,{h:0}),{x:1500,y:1500+ax.b*0.97},{x:2000,y:1500+ax.b*0.97},false);
  out.skim=[dDirect,dSkim,+F.impactOf(1,0,hitD).toFixed(2),+F.impactOf(1,0,hitS).toFixed(2)];
  // spread: the same pilot calm and panicking
  ({S,F,fox,e1}=setup());
  const w=fox.wpns[0].w;
  fox.pilot.cool=85;const calm=F.spreadOf(fox,w,500);
  fox.pilot.cool=15;const panic=F.spreadOf(fox,w,500);
  fox.pilot.cool=85;const far=F.spreadOf(fox,w,800);
  out.spread=[+(calm*180/Math.PI).toFixed(2),+(panic*180/Math.PI).toFixed(2),+(far*180/Math.PI).toFixed(2)];
  // 5. lock: centred, it climbs; behind the firer, it falls
  ({S,F,fox,e1}=setup());
  for(let i=0;i<20;i++)F.lockTick(fox,0.05);
  const up=F.lockOf(fox,'E1');
  fox.h=Math.PI;for(let i=0;i<10;i++)F.lockTick(fox,0.05);
  const down=F.lockOf(fox,'E1');
  // off-centre (near the arc's edge) gains slower than dead centre
  ({S,F,fox,e1}=setup());fox.h=0.45;for(let i=0;i<20;i++)F.lockTick(fox,0.05);const edge=F.lockOf(fox,'E1');
  out.lock=[+up.toFixed(3),+down.toFixed(3),+edge.toFixed(3)];
  // missiles: refused below the lock threshold and inside the minimum range
  ({S,F,fox,e1}=setup());
  F.setLoadout('P1',['missiles']);const q=fox.wpns[0];
  e1.x=1500+700;fox.locks.E1=0.3;const r1=F.missileRefusal(fox,q,e1);
  fox.locks.E1=1;e1.x=1500+300;const r2=F.missileRefusal(fox,q,e1);
  e1.x=1500+700;const r3=F.missileRefusal(fox,q,e1);
  // and a launched missile hits a target flying defensively, even with the immune toggle on
  D.sim.set('flydefImmunity',true);
  e1.flydef=true;h0=hp(e1);
  F.fireTick(fox,0.05);const launched=S.missiles.length;fly(F,S);
  const mDmg=h0-hp(e1);
  // while a plain shot passes straight through it
  h0=hp(e1);F.setLoadout('P1',['bls-t-light-repeaters']);F.shoot('P1',0);fly(F,S);const pDmg=h0-hp(e1);
  D.sim.set('flydefImmunity',false);
  // the default profile: a hit is still possible, on a smaller hull
  const axFd=F.hullAxes(e1,false),axHome=F.hullAxes(e1,true);
  e1.flydef=false;
  out.missile=[r1,r2,r3,launched,mDmg>0,pDmg,+(axFd.a*axFd.b/(axHome.a*axHome.b)).toFixed(2)];
  // 6. determinism: the same seed and scripted orders, twice
  const script=()=>{
    f.load('e1_fox','sb',null,77);
    for(let t=0;t<4&&D.phase==='PLAN';t++){
      const s=D.sim.S.ships.find(x=>x.id==='P1');
      const pts=[];for(let i=0;i<=8;i++)pts.push({x:s.x+Math.cos(s.h+i*0.08)*60*i,y:s.y+Math.sin(s.h+i*0.08)*60*i});
      D.sim.fn.planSegs('P1',[{kind:t%2?'flydef':'basic',pts}]);f.runExecSync();
    }
    return f.stateHash();
  };
  const a=script(),b=script();
  out.det=[a===b,a.length>0];
  // 7. metrics, and a chase with live fire
  f.load('e1_fox','sb',null,3);   // a head-on start: the pursuers swing wide rather than joust, then come round
  for(let i=0;i<5&&D.phase==='PLAN';i++)f.runExecSync();
  const recs=D.metrics.filter(r=>r.ruleset==='sb'&&r.seed===3);
  const last=recs[recs.length-1];
  out.metrics=[recs.length>=1,recs.every(r=>r.ships.every(x=>['bursts','shots','hits','dmg','lockMax'].every(k=>typeof x[k]==='number')))];
  out.fire=[last.ships.reduce((n,x)=>n+x.shots,0),last.ships.reduce((n,x)=>n+x.hits,0)];
  return out;
 });
 ok(sc.direct>0&&sc.offset===0,'SB 4: intersection: direct '+sc.direct+', offset '+sc.offset);
 ok(sc.skim[0]>sc.skim[1]&&sc.skim[1]>0&&sc.skim[2]>0.95&&sc.skim[3]<0.5,'SB 4: skim vs direct '+JSON.stringify(sc.skim));
 ok(sc.spread[1]>sc.spread[0]&&sc.spread[2]>sc.spread[0],'SB 4: spread calm/panic/far '+JSON.stringify(sc.spread));
 ok(sc.lock[0]>0.3&&sc.lock[1]<sc.lock[0]&&sc.lock[2]<sc.lock[0],'SB 5: lock centred/behind/edge '+JSON.stringify(sc.lock));
 ok(sc.missile[0]==='lock'&&sc.missile[1]==='too close'&&sc.missile[2]===null&&sc.missile[3]===1&&sc.missile[4],'SB 5: missile rules '+JSON.stringify(sc.missile));
 ok(sc.missile[5]===0&&Math.abs(sc.missile[6]-0.25)<0.01,'SB 5: Fly Defensively: immune toggle and profile '+JSON.stringify(sc.missile));
 ok(sc.det.every(Boolean),'SB 6: determinism '+JSON.stringify(sc.det));
 ok(sc.metrics.every(Boolean),'SB 7: metrics '+JSON.stringify(sc.metrics));
 ok(sc.fire[0]>0&&sc.fire[1]>0,'SB 7: a 1v2 chase should have live fire '+JSON.stringify(sc.fire));

 /* ---------- SB B4: Drift with the mouse, movesets, actions ---------- */
 const d0=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn;
  f.load('e1_fox','sb',null,9);
  const S=D.sim.S,fox=S.ships.find(q=>q.id==='P1'),e1=S.ships.find(q=>q.id==='E1'),e2=S.ships.find(q=>q.id==='E2');
  S.rocks.length=0;e2.alive=false;
  Object.assign(fox,{x:2000,y:1500,h:0});Object.assign(e1,{x:1550,y:1500,h:0});fox.target='E1';fox.pilot.cool=90;
  const c=f.cam_();c.x=2050;c.y=1500;c.z=0.8;
  S.sel='P1';D.mod&&window.SR_ARENA.refresh();
  const btn=document.querySelector('#sbOrders [data-act="kind"][data-slot="0"][data-kind="drift"]');
  if(btn)btn.click();
  return {btn:!!btn,kind:fox.kinds[0],a:f.toClient(2000,1500),b:f.toClient(2500,1500)};
 });
 ok(d0.btn&&d0.kind==='drift','B4: the veteran Fox has no Drift button '+JSON.stringify(d0));
 await pg.mouse.move(d0.a.x,d0.a.y);await pg.mouse.down();
 for(let i=1;i<=14;i++)await pg.mouse.move(d0.a.x+(d0.b.x-d0.a.x)*i/14,d0.a.y+(d0.b.y-d0.a.y)*i/14);
 await pg.mouse.up();
 const d1=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,F=D.sim.fn,fox=D.sim.S.ships.find(q=>q.id==='P1');
  const seg=F.curvesOf(fox)[0],e=seg.pts[seg.pts.length-1];
  const fac=fox.plan[0]&&fox.plan[0].facing;
  return {n:fox.plan.length,kind:fox.plan[0]&&fox.plan[0].kind,facing:fac,
    handle:f.toClient(e.x+Math.cos(fac)*110,e.y+Math.sin(fac)*110),
    aim:f.toClient(e.x+Math.cos(Math.PI+0.2)*160,e.y+Math.sin(Math.PI+0.2)*160)};
 });
 ok(d1.n===1&&d1.kind==='drift','B4: the drag did not plan a Drift segment '+JSON.stringify(d1));
 await pg.mouse.move(d1.handle.x,d1.handle.y);await pg.mouse.down();
 for(let i=1;i<=6;i++)await pg.mouse.move(d1.handle.x+(d1.aim.x-d1.handle.x)*i/6,d1.handle.y+(d1.aim.y-d1.handle.y)*i/6);
 await pg.mouse.up();
 const drift=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,S=D.sim.S,fox=S.ships.find(q=>q.id==='P1');
  const out={facing:+fox.plan[0].facing.toFixed(3)};
  f.beginExec();
  const segT=f.EXEC_LEN_()/D.sim.AP_PER_ROUND_();
  let noseOff=0,velOk=true,back=0,samples=0;
  const seen=new Set();
  while(D.sim.S.execT<segT-0.06&&D.phase==='EXEC'){
    f.stepTick();
    if(D.sim.S.execT>segT*0.2&&D.sim.S.execT<segT*0.85){
      samples++;
      noseOff=Math.max(noseOff,Math.abs(Math.atan2(Math.sin(fox.h-fox.plan[0].facing),Math.cos(fox.h-fox.plan[0].facing))));
      if(fox.vx<=0)velOk=false;
    }
    for(const p of S.proj)if(p.owner==='P1'&&!seen.has(p)){seen.add(p);if(p.vx<0)back++;}
  }
  out.drift=[samples,+noseOff.toFixed(3),velOk,back,fox.st.shots];
  while(D.phase==='EXEC')f.stepTick();
  return out;
 });
 ok(Math.abs(drift.facing-(Math.PI+0.2-2*Math.PI))<0.06||Math.abs(drift.facing-(Math.PI+0.2))<0.06,'B4: the facing handle did not set the facing '+drift.facing);
 ok(drift.drift[0]>5&&drift.drift[1]<0.05&&drift.drift[2],'B4: Drift should hold the nose on the facing while flying the path '+JSON.stringify(drift.drift));
 ok(drift.drift[3]>0&&drift.drift[4]>0,'B4: Drift should fire back along the nose at the pursuer '+JSON.stringify(drift.drift));
 const b4=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  // movesets: green has no Drift, the veteran has Boost and Drift, an ace has the lot
  f.load('e3_count','sb',1,1);
  const S=D.sim.S,F=D.sim.fn;
  const green=S.ships.find(q=>q.pilot.preset==='green'),vet=S.ships.find(q=>q.pilot.preset==='veteran');
  S.sel=green.id;window.SR_ARENA.refresh();
  out.greenHud=!document.querySelector('#sbOrders [data-kind="drift"]')&&!!document.querySelector('#sbOrders [data-kind="flydef"]');
  out.green=F.kindsFor(green).join();out.greenSet=F.setKind(green.id,0,'drift');
  out.vet=F.kindsFor(vet).join();
  const ace={faction:'reb',pilot:{preset:'ace'}};out.ace=F.kindsFor(ace).join();
  out.custom=F.kindsFor({faction:'reb',pilot:{preset:'green',moveset:['loop']}}).join();
  out.heg=F.kindsFor(S.ships.find(q=>q.faction==='heg')).join();
  // actions resolve as the exec begins
  const s=vet;s.pilot.cool=40;s.crits=['targeting'];s.segs.F.val=2;
  out.acts=F.actionsFor(s).join();
  F.setAction(s.id,'lockin');f.beginExec();out.lockin=Math.round(s.pilot.cool);while(D.phase==='EXEC')f.stepTick();
  F.setAction(s.id,'fixcrit');f.beginExec();out.fix=s.crits.length;out.fixGone=!F.actionsFor(s).includes('fixcrit');while(D.phase==='EXEC')f.stepTick();
  const fv=s.segs.F.val;F.setAction(s.id,'boostF');f.beginExec();out.boost=s.segs.F.val-fv;while(D.phase==='EXEC')f.stepTick();
  F.setAction(s.id,'shiftF');f.beginExec();out.shift=s.segs.F.at;while(D.phase==='EXEC')f.stepTick();
  // the stub slots: only the lead has a special (its self-repair); no ship has a ship ability yet
  const lead=S.ships.find(q=>q.faction==='reb'&&q.lead);
  out.special=[F.specialAbilities(lead).join(),F.specialAbilities(green).join(),S.ships.every(q=>F.shipAbilities(q).length===0)];
  out.cleared=s.action;
  return out;
 });
 ok(b4.greenHud&&b4.green==='basic,flydef'&&b4.greenSet===false,'B4: a green pilot should offer no Drift '+JSON.stringify([b4.greenHud,b4.green,b4.greenSet]));
 ok(b4.vet==='basic,flydef,boost,drift'&&b4.ace==='basic,flydef,boost,drift,kturn,barrel'&&b4.custom==='basic,flydef,loop'&&b4.heg==='basic,flydef','B4: movesets '+JSON.stringify([b4.vet,b4.ace,b4.custom,b4.heg]));
 ok(b4.acts.includes('lockin')&&b4.acts.includes('fixcrit')&&b4.acts.includes('boostF'),'B4: actions offered '+b4.acts);
 ok(b4.lockin>=74&&b4.fix===0&&b4.boost>0&&b4.shift==='R'&&b4.fixGone&&b4.cleared==='none','B4: actions resolve '+JSON.stringify(b4));
 ok(b4.special[0]==='fieldrep'&&b4.special[1]===''&&b4.special[2],'B4: ability stubs '+JSON.stringify(b4.special));

 /* ---------- SB feel (the designer, 11 Oct: speed, visible shots, no choppy motion) ---------- */
 const feel=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  f.load('sb1_fox','sb',null,8);
  const S=D.sim.S,F=D.sim.fn,fox=S.ships.find(q=>q.id==='P1');
  // speed: the envelope is the dial × SPEED_SCALE; the turn radius is not scaled
  const env=F.envelope(fox,'basic');
  out.speed=[Math.abs(env.Lmax-fox.row.straight_max*150*D.sim.SPEED_SCALE_())<1e-9,D.sim.SPEED_SCALE_()>1,Math.abs(env.kap-F.kappaOf(fox))<1e-12];
  // smooth motion: between two ticks a ship is drawn part-way along its path, not held at the last tick
  f.setFollow(true);
  f.beginExec();for(let i=0;i<10;i++)f.stepTick();
  const p0={x:fox.x,y:fox.y},mid=F.renderPose(fox,0.5);f.stepTick();const p1={x:fox.x,y:fox.y};
  const d01=Math.hypot(p1.x-p0.x,p1.y-p0.y),d0m=Math.hypot(mid.x-p0.x,mid.y-p0.y),dm1=Math.hypot(p1.x-mid.x,p1.y-mid.y);
  out.smooth=[d01>1,d0m>d01*0.3,dm1>d01*0.3,Math.abs(d0m+dm1-d01)<0.5];
  // the chase camera eases toward the selected ship and its target, zoomed in from the opening frame
  const cam=f.cam_(),z0=cam.z;cam.x=200;cam.y=200;
  for(let i=0;i<120;i++)f.chase(16);
  const pts=F.focus();let cx=0,cy=0;const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);cx=(Math.min(...xs)+Math.max(...xs))/2;cy=(Math.min(...ys)+Math.max(...ys))/2;
  out.chase=[Math.round(Math.hypot(cam.x-cx,cam.y-cy)),+cam.z.toFixed(2),cam.z>=0.45];
  while(D.phase==='EXEC')f.stepTick();
  // ship scale: the hull ellipse grows with the drawn ship
  out.scale=[D.sim.SHIP_SCALE_(),+F.hullAxes(fox,false).a.toFixed(2),+(D.sim.HULL_LEN_()*SRDB.visualSize(fox.row.size)*D.sim.SHIP_SCALE_()).toFixed(2)];
  return out;
 });
 ok(feel.speed.every(Boolean),'SB feel: SPEED_SCALE should scale the speed range, not the turn radius '+JSON.stringify(feel.speed));
 ok(feel.smooth.every(Boolean),'SB feel: between ticks a ship should be drawn part-way along its path '+JSON.stringify(feel.smooth));
 ok(feel.chase[0]<40&&feel.chase[2],'SB feel: the chase camera should settle on the action '+JSON.stringify(feel.chase));
 ok(feel.scale[1]===feel.scale[2],'SB feel: the hull ellipse should follow the ship size '+JSON.stringify(feel.scale));

 /* ---------- SB AI (the designer, 11 Oct: "the AI needs major work in order to pose a threat") ---------- */
 const ai=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  // against a fox that weaves, the pursuers keep their guns on it, and it does not last long
  let arc=0,rounds=0,hits=0;
  for(const seed of [1,2,3]){
    f.load('sb1_fox','sb',null,seed);D.sim.S.rocks.length=0;
    for(let t=0;t<6&&D.phase==='PLAN';t++){
      const s=D.sim.S.ships[0],side=(t%2?1:-1)*260;
      D.sim.fn.planSegs('P1',[{pts:[{x:s.x+Math.cos(s.h)*520-Math.sin(s.h)*side,y:s.y+Math.sin(s.h)*520+Math.cos(s.h)*side}]}]);
      f.runExecSync();rounds++;
    }
    const m=D.metrics[D.metrics.length-1].ships.filter(x=>x.faction==='heg');
    arc+=m.reduce((a,x)=>a+x.arcT,0);hits+=m.reduce((a,x)=>a+x.hits,0);
  }
  out.threat=[+(arc/rounds).toFixed(2),hits,rounds];
  // in the asteroid belt, no enemy flies into a rock
  f.load('sb1_fox','sb',null,5);
  const S=D.sim.S;let inRock=0;
  for(let t=0;t<4&&D.phase==='PLAN';t++){
    f.beginExec();
    while(D.phase==='EXEC'){f.stepTick();for(const e of S.ships)if(e.alive&&e.faction==='heg')for(const r of S.rocks)if(Math.hypot(e.x-r.x,e.y-r.y)<r.r*0.85)inRock++;}
  }
  out.rocks=inRock;
  return out;
 });
 ok(ai.threat[0]>=3&&ai.threat[1]>=10,'SB AI: pursuers should keep their guns on a weaving fox (seconds a round, hits, rounds) '+JSON.stringify(ai.threat));
 ok(ai.rocks===0,'SB AI: an enemy flew into a rock ('+ai.rocks+' ticks)');

 /* ---------- SB B5: doctrine, the panel, the experiments ---------- */
 const b5=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  // pursuit closes on a target that glides straight on
  f.load('sb1_fox','sb',null,4);
  let S=D.sim.S;const fox=S.ships.find(q=>q.id==='P1'),e1=S.ships.find(q=>q.id==='E1');
  const d=()=>Math.hypot(fox.x-e1.x,fox.y-e1.y);
  const d0=d();f.runExecSync();f.runExecSync();out.pursuit=[Math.round(d0),Math.round(d())];
  out.tellKey=D.sim.fn.doctrineOf(e1).key;
  // panic: a Mote (no flees) flies defensively; a Cadet (flees) runs for the edge and jumps out
  f.addScenario({id:'t_flee',title:'Test: panic',desc:'Smoke test.',rulesets:['sb'],rocks:'none',
    player:[{cls:'talon',pilot:{preset:'regular'},at:[2000,1500,0]}],
    enemies:[{type:'academy-cadet',doctrine:'pursuit',n:1,at:[400,1500,Math.PI]},{type:'vc-mote-patrol',doctrine:'pursuit',n:1,at:[1500,2200,0]}],
    objective:{kind:'survive',secs:60},tune:{}});
  f.load('t_flee','sb',null,1);
  S=D.sim.S;const cad=S.ships.find(q=>q.type==='academy-cadet'),mote=S.ships.find(q=>q.type==='vc-mote-patrol');
  cad.pilot.cool=10;mote.pilot.cool=10;
  f.beginExec();out.moteKinds=mote.sched.map(g=>g.kind).join();
  while(D.phase==='EXEC')f.stepTick();
  for(let i=0;i<3&&cad.alive&&D.phase==='PLAN';i++){cad.pilot.cool=10;f.runExecSync();}
  out.fled=[cad.alive,cad.fled,D.metrics[D.metrics.length-1].ships.find(x=>x.id===cad.id).fled];
  out.unknownDoctrine=D.sim.fn.doctrineOf({doctrine:'wingman'}).key;
  // the panel: every SB constant, a getter for each, and a slider that moves it
  f.load('sb1_fox','sb',null,1);
  const keys=D.mod.panelGroup().map(x=>x.key);
  const need=['AP_PER_ROUND','FLYDEF_FACTOR','BOOST_MULT','BARREL_LAT','BURST_N','BURST_EVERY','PROJ_SPD','SPREAD_BASE','RANGE_SPREAD',
    'MISSILE_LOCK','MISSILE_MINR','LOCK_GAIN','LOCK_DECAY','IMPACT_MIN','LOCK_DMG_MAX','CRIT_DIRECT','flydefImmunity','SPEED_FLAIR',
    'moveset_green','moveset_regular','moveset_veteran','moveset_ace'];
  out.missing=need.filter(k=>!keys.includes(k));
  out.noGetter=need.filter(k=>!k.startsWith('moveset_')&&typeof D.sim[k+'_']!=='function');
  const rows=document.querySelectorAll('#sbPanelBody [data-g="rules"]').length;
  out.rows=rows>=need.length;
  const i=keys.indexOf('BURST_N'),sl=document.querySelector('#sbPanelBody input[data-g="rules"][data-i="'+i+'"]');
  sl.value='6';sl.dispatchEvent(new Event('input',{bubbles:true}));
  out.slider=D.sim.BURST_N_();
  sl.value='4';sl.dispatchEvent(new Event('input',{bubbles:true}));
  // the moveset checkboxes: take Drift away from the veteran, and give it back
  const mi=keys.indexOf('moveset_veteran');
  const cb=document.querySelector('#sbPanelBody input[data-g="rules"][data-i="'+mi+'"][data-opt="drift"]');
  cb.checked=false;cb.dispatchEvent(new Event('input',{bubbles:true}));
  const foxS=D.sim.S.ships.find(q=>q.id==='P1');
  out.moveset=[D.sim.fn.kindsFor(foxS).includes('drift')];
  cb.checked=true;cb.dispatchEvent(new Event('input',{bubbles:true}));
  out.moveset.push(D.sim.fn.kindsFor(foxS).includes('drift'));
  // the experiments run; SB3 at the ship cap
  const runs=[];
  for(const [id,v] of [['sb1_fox',null],['sb2_drift',null],['sb3_count',0],['sb3_count',1]]){
    f.load(id,'sb',v,2);
    const t0=performance.now();
    for(let k=0;k<2&&D.phase==='PLAN';k++)f.runExecSync();
    runs.push([id,v,D.sim.S.ships.filter(q=>q.faction==='reb').length,D.sim.S.ships.filter(q=>q.faction==='heg').length,Math.round(performance.now()-t0)]);
  }
  out.runs=runs;
  out.allowlist=!window.DBGarena.fn.pickerIds().includes('sb2_drift');
  // sb2_drift's question, measured: drift away with the guns facing back
  f.load('sb2_drift','sb',null,6);
  S=D.sim.S;S.rocks.length=0;
  for(let k=0;k<2&&D.phase==='PLAN';k++){
    const a=S.ships.find(q=>q.id==='P1');
    const pts=[];for(let j=0;j<=8;j++)pts.push({x:a.x+Math.cos(a.h)*70*j,y:a.y+Math.sin(a.h)*70*j});
    D.sim.fn.planSegs('P1',[{kind:'drift',pts,facing:a.h+Math.PI}]);f.runExecSync();
  }
  const rec=D.metrics[D.metrics.length-1];const ace=rec.ships.find(x=>x.id==='P1');
  out.drift=[rec.ruleset,rec.scenario,ace.driftShots,ace.backShots,typeof ace.arcT,ace.kinds.join()];
  return out;
 });
 ok(b5.pursuit[1]<b5.pursuit[0]&&b5.tellKey==='pursuit','B5: pursuit should close on its target '+JSON.stringify(b5.pursuit));
 ok(b5.moteKinds==='flydef,flydef','B5: a panicking Mote should fly defensively '+b5.moteKinds);
 ok(b5.fled[0]===false&&b5.fled[1]===true&&b5.fled[2]===true,'B5: a panicking Cadet should jump out at the edge '+JSON.stringify(b5.fled));
 ok(b5.unknownDoctrine==='pursuit','B5: an unbuilt doctrine should fall back to pursuit');
 ok(!b5.missing.length&&!b5.noGetter.length&&b5.rows,'B5: panel missing '+b5.missing.join()+' / no getter '+b5.noGetter.join()+' / rows '+b5.rows);
 ok(b5.slider===6,'B5: the BURST_N slider did not move the constant '+b5.slider);
 ok(b5.moveset[0]===false&&b5.moveset[1]===true,'B5: the moveset checkboxes '+JSON.stringify(b5.moveset));
 ok(b5.runs.length===4&&b5.runs[2][2]===4&&b5.runs[3][2]===8&&b5.runs[3][3]===8,'B5: SB experiments '+JSON.stringify(b5.runs));
 ok(b5.runs.every(r=>r[4]<8000),'B5: an SB exec is too slow at the ship cap '+JSON.stringify(b5.runs));
 ok(b5.allowlist,'B5: sb2_drift should not be on the v2 list');
 ok(b5.drift[0]==='sb'&&b5.drift[1]==='sb2_drift'&&b5.drift[2]>0&&b5.drift[3]>0&&b5.drift[4]==='number'&&b5.drift[5].startsWith('drift'),'B5: sb2_drift metrics '+JSON.stringify(b5.drift));

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
 console.log(JSON.stringify({fails,r,sb,sc,drift,b4,feel,ai,b5},null,0));
 if(fails.length){console.error('arena-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('arena-smoke OK');
})();
