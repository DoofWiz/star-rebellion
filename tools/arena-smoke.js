/* The Arena and the space combat v2 sim (docs/ARENA-HANDOFF.md §8): node tools/arena-smoke.js
   (needs NODE_PATH=$(npm root -g)). Loads game/index.html#arena with cleared storage and drives it through
   DBGarena with the Arena's own seeded RNG; the wall clock never moves the sim (manual mode).
   1 boot and no-save   2 the fitter respects the envelope   3 continuous fire   4 interrupts
   5 doctrine           6 determinism                        7 scenarios and doctrines are data   8 metrics
   Plus the title screen's "Enter Arena" button. Output: one JSON object; exit 1 on any failure.
   SB Test section (docs/ARENA-SB-HANDOFF.md §9; game/js/arena-sb.js and sim-sb.js, through DBGarena.sb)
     1 picker: both rulesets first, the allowlist, e1_fox under each with the same cast, no campaign save
     3 the envelope   4 projectiles   5 lock and missiles   6 determinism   7 metrics and live fire
     B4: Drift with the real mouse, movesets by preset, the actions   B5: doctrine, the panel, the experiments
     HUD (docs/SB-HUD-HANDOFF.md §7): the tray's anchor, step order, arming, Drift's facing step, the action at the
     segment boundary, invalidation, Execute, hover cards, keyboard parity, planning ms per step
     Flight, guns, status: ships flown along the plan (close, not exact; rails with PHYSICS off), bolts from the gun
     mounts, shield arcs that flare
   High Command section (docs/ARENA-HC-HANDOFF.md §8; game/js/arena-hc.js and sim-hc.js, through DBGarena.hc), in its
   own browser context: 1 ruleset isolation   6 determinism with pauses   7 the reinforcement clock
     T1: Attack, Escort and Withdraw fly themselves; the HUD's top band, roster, tray, time controls
     2 order persistence   3 tactic effect   4 Preservation within one think tick
     T2: the other six orders, the rules panel, morale and panic, assessments, the feed and VIEW, live camera tiles
     5 commands   8 doctrine   T3: Wren's pin answered three ways, the pilot panel, the drawer, target-first
     9 leader loss   10 metrics   T4: the keys, hc2 and hc3 (and its CP variants), the grouped panel, an hc3 brawl at speed 3 */
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
  out.mapDefault=f.MAP_SCALE_();f.setMapScale(1);   // these tests' geometry is the original 4200 × 3000 map (Map below checks the bigger default)
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
    Math.round(env.hi(2*Q)),Math.round(r.turn_max*SU*SC),env.thMax===2*Q,Math.round(env.lo(2*Q))===Math.round(2*Q/env.kap)];
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
  out.ends=Math.round(Math.hypot(fox.x-end2.x,fox.y-end2.y));   // flown, not on rails: close to the plan's end, never exactly on it
  // a short plan is topped up to the slowest straight with a glide; a long one flies exactly the line
  fox.mom=null;   // back to cruise: the exec above left it carrying that round's speed
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
 ok(sb.ends<40,'SB 3: the ship should end near where its second segment ends '+sb.ends);
 ok(sb.glide[0]===2&&sb.glide[1]&&Math.abs(sb.glide[2]-sb.glide[3])<=1&&sb.glide[4]===1,'SB 3: a short round tops up to the slowest straight, a long one flies the line '+JSON.stringify(sb.glide));
 ok(sb.flair.every(Boolean),'SB 3: a hard turn should brake into its apex and power out, path unchanged '+JSON.stringify(sb.flair));
 ok(sb.slip.every(Boolean),'SB 3: a hard turn should slip (nose leads, slides wide, back on line) '+JSON.stringify(sb.slip));
 ok(JSON.stringify(sb.rulesets.slice(0,2))==='["SR V2 Combat","SB Test"]','SB 1: rulesets listed '+JSON.stringify(sb.rulesets));   // High Command is third (HC 1)
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
  const hitsSoFar=()=>{const m=D.metrics.filter(r=>r.ruleset==='sb'&&r.seed===3);return m.length?m[m.length-1].ships.reduce((n,x)=>n+x.hits,0):0;};
  for(let i=0;i<12&&D.phase==='PLAN'&&!hitsSoFar();i++)f.runExecSync();   // 3 s rounds: until the first hit, 36 s at most
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
  const btn=document.querySelector('#sbTray [data-act="arm"][data-kind="drift"]');
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
  return {n:fox.plan.length,kind:fox.plan[0]&&fox.plan[0].kind,facing:fac,step:F.stepOf(fox),handleUi:!!document.querySelector('#sbTray [data-act="keepface"]'),
    handle:f.toClient(e.x+Math.cos(fac)*110,e.y+Math.sin(fac)*110),
    aim:f.toClient(e.x+Math.cos(Math.PI+0.2)*160,e.y+Math.sin(Math.PI+0.2)*160)};
 });
 ok(d1.n===1&&d1.kind==='drift','B4: the drag did not plan a Drift segment '+JSON.stringify(d1));
 ok(d1.step==='seg1_facing'&&d1.handleUi,'HUD 4: a Drift drag should open the facing step '+JSON.stringify(d1));
 await pg.mouse.move(d1.handle.x,d1.handle.y);await pg.mouse.down();
 for(let i=1;i<=6;i++)await pg.mouse.move(d1.handle.x+(d1.aim.x-d1.handle.x)*i/6,d1.handle.y+(d1.aim.y-d1.handle.y)*i/6);
 await pg.mouse.up();
 const drift=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,S=D.sim.S,fox=S.ships.find(q=>q.id==='P1');
  const F=D.sim.fn,tan=F.segEnd(F.curvesOf(fox)[0]).h;
  const out={facing:+fox.plan[0].facing.toFixed(3),sub:[F.stepOf(fox),!!fox.plan[0].faceSet,Math.abs(Math.atan2(Math.sin(fox.plan[0].facing-tan),Math.cos(fox.plan[0].facing-tan)))>0.3]};
  f.beginExec();
  const segT=f.EXEC_LEN_()/D.sim.AP_PER_ROUND_();
  let noseOff=0,velOk=true,back=0,samples=0;
  const seen=new Set();
  while(D.sim.S.execT<segT-0.06&&D.phase==='EXEC'){
    f.stepTick();
    const g=fox.sched[0];
    if(D.sim.S.execT>g.t0+0.45&&D.sim.S.execT<g.t1-0.25){   // the hold: after the nose has swung round (a flown nose takes a moment longer than the plan's 0.25 s), before it swings back
      samples++;
      noseOff=Math.max(noseOff,Math.abs(Math.atan2(Math.sin(fox.h-fox.plan[0].facing),Math.cos(fox.h-fox.plan[0].facing))));
      if(fox.vx<=0)velOk=false;
    }
    for(const p of S.proj)if(p.owner==='P1'&&!seen.has(p)){seen.add(p);if(p.vx<0)back++;}
  }
  out.drift=[samples,+noseOff.toFixed(3),velOk,back,fox.st.shots,+fox.sched[0].t1.toFixed(2)];
  while(D.phase==='EXEC')f.stepTick();
  return out;
 });
 ok(Math.abs(drift.facing-(Math.PI+0.2-2*Math.PI))<0.06||Math.abs(drift.facing-(Math.PI+0.2))<0.06,'B4: the facing handle did not set the facing '+drift.facing);
 ok(drift.drift[0]>5&&drift.drift[1]<0.1&&drift.drift[2],'B4: Drift should hold the nose on the facing while flying the path '+JSON.stringify(drift.drift));
 ok(drift.drift[3]>0&&drift.drift[4]>0,'B4: Drift should fire back along the nose at the pursuer '+JSON.stringify(drift.drift));
 ok(drift.sub[0]==='action'&&drift.sub[1]&&drift.sub[2],'HUD 4: committing the facing handle should store a nose off the path and move on '+JSON.stringify(drift.sub));
 const b4=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  // movesets: green has no Drift, the veteran has Boost and Drift, an ace has the lot
  f.load('e3_count','sb',1,1);
  const S=D.sim.S,F=D.sim.fn;
  const green=S.ships.find(q=>q.pilot.preset==='green'),vet=S.ships.find(q=>q.pilot.preset==='veteran');
  S.sel=green.id;window.SR_ARENA.refresh();
  out.greenHud=!document.querySelector('#sbTray [data-kind="drift"]:not([aria-disabled="true"])')&&!!document.querySelector('#sbTray [data-kind="flydef"]');
  out.green=F.kindsFor(green).join();out.greenSet=F.setKind(green.id,0,'drift');
  out.vet=F.kindsFor(vet).join();
  const ace={faction:'reb',pilot:{preset:'ace'}};out.ace=F.kindsFor(ace).join();
  out.custom=F.kindsFor({faction:'reb',pilot:{preset:'green',moveset:['loop']}}).join();
  out.heg=F.kindsFor(S.ships.find(q=>q.faction==='heg')).join();
  // actions resolve (at the segment boundary: read each one as it fires)
  const s=vet;s.pilot.cool=40;s.crits=['targeting'];s.segs.F.val=2;
  out.acts=F.actionsFor(s).join();
  const fire=a=>{F.setAction(s.id,a);f.beginExec();while(D.phase==='EXEC'&&s.actT==null)f.stepTick();};
  const done=()=>{while(D.phase==='EXEC')f.stepTick();};
  fire('lockin');out.lockin=Math.round(s.pilot.cool);done();
  fire('fixcrit');out.fix=s.crits.length;out.fixGone=!F.actionsFor(s).includes('fixcrit');done();
  const fv=s.segs.F.val;fire('boostF');out.boost=s.segs.F.val-fv;done();
  fire('shiftF');out.shift=s.segs.F.at;done();
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

 /* ---------- SB planning HUD (docs/SB-HUD-HANDOFF.md §7): the per-ship stepper tray ---------- */
 const hud=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  f.load('e1_fox','sb',null,4);
  let S=D.sim.S,F=D.sim.fn,fox=S.ships.find(q=>q.id==='P1');S.rocks.length=0;
  const c=f.cam_(),q=sel=>document.querySelectorAll('#sbTray '+sel).length;
  const inside=bx=>bx.left>=7.5&&bx.top>=7.5&&bx.left+bx.w<=bx.stage.w-7.5&&bx.top+bx.h<=bx.stage.h-7.5;
  // a scripted drag (the real mouse is B4's): from the start of the step's move to a point ahead/aside of it
  const drag=(s,from,ahead,side)=>{const z=c.z,x=from.x+Math.cos(from.h)*ahead-Math.sin(from.h)*side,y=from.y+Math.sin(from.h)*ahead+Math.cos(from.h)*side;
    D.mod.planInput({type:'down',x:from.x,y:from.y,z});D.mod.planInput({type:'move',x:(from.x+x)/2,y:(from.y+y)/2,z});D.mod.planInput({type:'move',x,y,z});D.mod.planInput({type:'up',x,y,z});f.syncHud();};
  const pose=s=>({x:s.x,y:s.y,h:s.h});
  const s1End=s=>F.segEnd(F.curvesOf(s)[0]);
  // 1. anchoring: under the ship, TRAY_GAP below its ring; flipped above in the bottom zone; never out of the stage
  Object.assign(fox,{x:2000,y:1500,h:0});c.x=2000;c.y=1400;c.z=0.6;f.syncHud();
  let bx=f.placeTray();
  out.anchor=[!bx.flip,Math.abs(bx.top-(bx.ship.y+bx.ship.r+D.sim.TRAY_GAP_()))<1.5,Math.abs(bx.left+bx.w/2-bx.ship.x)<1.5,inside(bx)];
  fox.y=c.y+(bx.stage.h/2-D.sim.TRAY_FLIP_ZONE_()/2)/c.z;f.syncHud();bx=f.placeTray();
  out.flip=[bx.flip,bx.top+bx.h<=bx.ship.y-bx.ship.r+1,inside(bx)];
  const corners=[];for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){fox.x=c.x+dx*(bx.stage.w/2-4)/c.z;fox.y=c.y+dy*(bx.stage.h/2-4)/c.z;corners.push(inside(f.placeTray()));}
  out.corners=corners;
  // 2. order is enforced: at SEG 1 no action icon exists, at the action no mode icon does; no action before SEG 1
  Object.assign(fox,{x:2000,y:1500,h:0});c.x=2000;c.y=1500;F.clearPlan('P1');f.syncHud();
  out.order=[F.stepOf(fox),q('[data-act="action"]'),q('[data-act="arm"]')>0,F.pickAction('P1','none'),F.goPip('P1','act'),F.nextStep(fox)];
  drag(fox,pose(fox),400,0);
  out.order.push(F.stepOf(fox),q('[data-act="action"]')>0,q('[data-act="arm"]'));
  // 3. arming styles the fit: one gesture, Boost longer and straighter than Basic; Fly def carries the no-fire flag
  const gesture=kind=>{F.clearPlan('P1');f.syncHud();F.arm('P1',kind);drag(fox,pose(fox),900,700);const g=F.curvesOf(fox)[0];return {L:Math.round(g.L),th:+Math.abs(g.th).toFixed(3),kind:g.kind,noFire:!!fox.plan[0].noFire,step:F.stepOf(fox)};};
  const gb=gesture('basic'),gB=gesture('boost'),gf=gesture('flydef');
  out.arm=[gB.L>gb.L,gB.th<gb.th,gb.kind==='basic'&&gB.kind==='boost'&&gf.kind==='flydef',gf.noFire,!gb.noFire,gb.step==='action'];
  out.armRaw=[gb,gB];
  // the moveset in the tray: green two, the locked ones greyed with a lock, or absent with showLockedMods off; an ace six
  f.load('e3_count','sb',1,1);S=D.sim.S;
  const green=S.ships.find(x=>x.pilot.preset==='green');F.select(green.id);f.syncHud();
  const live=()=>[...document.querySelectorAll('#sbTray [data-act="arm"]:not([aria-disabled="true"])')].map(e=>e.dataset.kind).join();
  out.trayGreen=[live(),q('[data-act="arm"].is-locked'),F.arm(green.id,'drift')];
  green.pilot.preset='ace';f.syncHud();out.trayAce=live();green.pilot.preset='green';
  D.sim.set('showLockedMods',false);f.syncHud();out.trayOff=[live(),q('[data-act="arm"].is-locked'),q('[data-act="arm"]')];D.sim.set('showLockedMods',true);
  // 5. boundary timing: an aft-heavy Fox angles its fore shield as SEG 1 completes, not as the exec starts
  const timing=endHere=>{
    f.load('e1_fox','sb',null,5);S=D.sim.S;fox=S.ships.find(x=>x.id==='P1');S.rocks.length=0;
    for(const e of S.ships)if(e.faction==='heg'){e.x=3900;e.y=300;}
    Object.assign(fox,{x:1500,y:1500,h:0});fox.segs.F.val=1;
    F.planSegs('P1',endHere?[{pts:[{x:1700,y:1500}]}]:[{pts:[{x:1850,y:1520}]},{pts:[{x:2300,y:1560}]}]);
    F.pickAction('P1','shiftF');if(endHere)F.endHere('P1');
    const at0=fox.segs.F.at,st=F.stepOf(fox);f.beginExec();
    const t1=fox.sched[0].t1,n=fox.sched.length,atStart=fox.segs.F.at;let changed=null;
    while(D.phase==='EXEC'){f.stepTick();if(changed==null&&fox.segs.F.at!==at0)changed=+D.sim.S.execT.toFixed(3);}
    return {st,atStart:atStart===at0,t1:+t1.toFixed(3),changed,n,ok:changed!=null&&changed>=t1-1e-6&&changed<t1+f.TICK_()/1000+1e-6&&changed>0.1};
  };
  out.boundary=timing(false);out.boundaryEnd=timing(true);
  // 6. invalidation: redo S1 and S2 goes (its pip empties), the action stays; Clear empties all three
  f.load('e1_fox','sb',null,6);S=D.sim.S;fox=S.ships.find(x=>x.id==='P1');S.rocks.length=0;
  Object.assign(fox,{x:2000,y:1500,h:0});c.x=2000;c.y=1500;c.z=0.6;f.syncHud();
  drag(fox,pose(fox),350,60);F.pickAction('P1','shiftR');f.syncHud();
  out.s2step=F.stepOf(fox);drag(fox,s1End(fox),300,-40);
  const filled=()=>[...document.querySelectorAll('#sbTray .arn-pip')].map(e=>e.classList.contains('is-filled')?1:0).join('');
  out.inv0=[F.stepOf(fox),fox.plan.length,filled(),q('.is-done')];
  document.querySelector('#sbTray [data-pip="s1"]').click();
  out.inv1=[F.stepOf(fox),fox.plan.length];
  drag(fox,pose(fox),300,-80);
  out.inv=[F.stepOf(fox),fox.plan.length,fox.action,fox.actDone,filled()];
  F.endHere('P1');f.syncHud();
  document.querySelector('#sbTray [data-act="clear"]').click();
  out.clear=[fox.plan.length,fox.actDone,fox.action,fox.endHere,F.stepOf(fox),filled()];
  // 7. Execute never blocks: one of two ships unplanned flies its standing order
  f.load('e5_job','sb',null,7);S=D.sim.S;
  const [a,b2]=S.ships.filter(x=>x.faction==='reb');S.rocks.length=0;
  F.select(a.id);drag(a,pose(a),400,0);F.pickAction(a.id,'none');f.syncHud();F.endHere(a.id);f.syncHud();
  out.go0=[document.getElementById('sbGo').textContent,D.sim.S.sel===b2.id];
  const b0={x:b2.x,y:b2.y,h:b2.h};
  document.getElementById('sbGo').click();
  out.go=[D.phase,b2.sched&&b2.sched.length===1&&b2.sched[0].auto];
  while(D.phase==='EXEC')f.stepTick();
  out.go.push(Math.hypot(b2.x-b0.x,b2.y-b0.y)>100,Math.abs(b2.h-b0.h)<0.15);   // straight on (a flown ship wanders a hair)
  // 8. the hover cards read live constants
  f.load('e1_fox','sb',null,8);F=D.sim.fn;
  const k0=F.tipFor('kind:boost'),bm=D.sim.BOOST_MULT_();D.sim.set('BOOST_MULT',2.5);const k1=F.tipFor('kind:boost');D.sim.set('BOOST_MULT',bm);
  out.tip=[k0.includes('×'+bm+' speed'),k1.includes('×2.5 speed'),F.tipFor('kind:kturn').includes('Needs: ace'),F.tipFor('action:fixcrit').includes('No repairable critical')];
  // 10 (and H3's flow): sb3_count at 8 ships, ship to ship with no chip clicks; the planning ms land in the record
  f.load('sb3_count','sb',1,9);S=D.sim.S;S.rocks.length=0;
  const seen=[];
  for(let i=0;i<8;i++){
    const s=S.ships.find(x=>x.id===S.sel);seen.push(s.id);
    const t=performance.now();while(performance.now()-t<4);
    drag(s,pose(s),380,0);F.pickAction(s.id,'none');F.endHere(s.id);f.syncHud();
  }
  out.flow=[new Set(seen).size,S.ships.filter(x=>x.faction==='reb'&&F.planned(x)).length,document.activeElement&&document.activeElement.id,document.getElementById('sbGo').textContent];
  f.runExecSync();
  const rec=D.metrics[D.metrics.length-1],p1=rec.ships.find(x=>x.faction==='reb');
  out.metrics=[rec.planSteps&&['s1','act','s2'].every(k=>typeof rec.planSteps[k]==='number'),rec.planSteps&&rec.planSteps.s1>=8*3,!!p1.plan&&typeof p1.plan.act==='number'];
  return out;
 });
 ok(hud.anchor.every(Boolean),'HUD 1: the tray should hang TRAY_GAP under the ship, centred '+JSON.stringify(hud.anchor));
 ok(hud.flip.every(Boolean),'HUD 1: in the bottom flip zone the tray should sit above the ship '+JSON.stringify(hud.flip));
 ok(hud.corners.every(Boolean),'HUD 1: the tray left the stage '+JSON.stringify(hud.corners));
 ok(JSON.stringify(hud.order)==='["seg1",0,true,false,false,"seg1","action",true,0]','HUD 2: the step order '+JSON.stringify(hud.order));
 ok(hud.arm.every(Boolean),'HUD 3: arming should style the fit '+JSON.stringify(hud.arm)+' '+JSON.stringify(hud.armRaw));
 ok(hud.trayGreen[0]==='basic,flydef'&&hud.trayGreen[1]===4&&hud.trayGreen[2]===false&&hud.trayAce==='basic,flydef,boost,drift,kturn,barrel','HUD 3: the tray movesets '+JSON.stringify([hud.trayGreen,hud.trayAce]));
 ok(hud.trayOff[0]==='basic,flydef'&&hud.trayOff[1]===0&&hud.trayOff[2]===2,'HUD 3: with showLockedMods off the locked mods should be absent '+JSON.stringify(hud.trayOff));
 ok(hud.boundary.st==='done'&&hud.boundary.atStart&&hud.boundary.ok&&hud.boundary.n===2,'HUD 5: the action should fire as SEG 1 completes '+JSON.stringify(hud.boundary));
 ok(hud.boundaryEnd.st==='done'&&hud.boundaryEnd.atStart&&hud.boundaryEnd.ok&&hud.boundaryEnd.t1<2.9,'HUD 5: with End here, at that segment\'s end '+JSON.stringify(hud.boundaryEnd));
 ok(hud.s2step==='seg2'&&hud.inv0[0]==='done'&&hud.inv0[1]===2&&hud.inv0[2]==='111'&&hud.inv0[3]===1,'HUD 6: a full plan '+JSON.stringify([hud.s2step,hud.inv0]));
 ok(hud.inv1[0]==='seg1'&&hud.inv1[1]===2&&hud.inv[0]==='seg2'&&hud.inv[1]===1&&hud.inv[2]==='shiftR'&&hud.inv[3]&&hud.inv[4]==='110','HUD 6: redoing S1 should drop S2 and keep the action '+JSON.stringify([hud.inv1,hud.inv]));
 ok(JSON.stringify(hud.clear)==='[0,false,"none",false,"seg1","000"]','HUD 6: Clear '+JSON.stringify(hud.clear));
 ok(hud.go0[0]==='Execute (1/2 planned)'&&hud.go0[1]&&hud.go.every(Boolean),'HUD 7: Execute with a ship unplanned '+JSON.stringify([hud.go0,hud.go]));
 ok(hud.tip.every(Boolean),'HUD 8: hover cards read live constants '+JSON.stringify(hud.tip));
 ok(hud.flow[0]===8&&hud.flow[1]===8&&hud.flow[2]==='sbGo'&&hud.flow[3]==='Execute (8/8 planned)','HUD H3: eight ships should flow with no chip clicks '+JSON.stringify(hud.flow));
 ok(hud.metrics.every(Boolean),'HUD 10: planning ms per step in the record '+JSON.stringify(hud.metrics));
 // 8 (the real hover) and 9 (keyboard parity): Boost's card opens after TIP_DELAY; the keys make the mouse's plan
 const plan0=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn;
  f.load('e5_job','sb',null,10);
  const S=D.sim.S,a=S.ships.find(x=>x.faction==='reb');S.rocks.length=0;
  const c=f.cam_();Object.assign(a,{x:2000,y:1500,h:0});c.x=2000;c.y=1500;c.z=0.6;f.syncHud();
  const el=document.querySelector('#sbTray [data-kind="boost"]').getBoundingClientRect();
  return {x:el.left+el.width/2,y:el.top+el.height/2};
 });
 await pg.mouse.move(plan0.x,plan0.y);await pg.waitForTimeout(80);
 const tipEarly=await pg.evaluate(()=>document.getElementById('sbTip').hidden);
 await pg.waitForTimeout(400);
 const tipCard=await pg.evaluate(()=>({shown:!document.getElementById('sbTip').hidden,txt:document.getElementById('sbTip').textContent}));
 ok(tipEarly&&tipCard.shown&&/Boost/.test(tipCard.txt)&&/speed, nearly straight/.test(tipCard.txt),'HUD 8: the Boost card on hover '+JSON.stringify([tipEarly,tipCard]));
 await pg.mouse.move(5,5);
 const byMouse=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,F=D.sim.fn,S=D.sim.S,a=S.ships.find(x=>x.faction==='reb');
  const z=f.cam_().z,go=(x,y)=>{D.mod.planInput({type:'down',x:a.x,y:a.y,z});D.mod.planInput({type:'move',x,y,z});D.mod.planInput({type:'up',x,y,z});f.syncHud();};
  document.querySelector('#sbTray [data-kind="boost"]').click();go(2700,1650);
  document.querySelector('#sbTray [data-action="shiftF"]').click();
  document.querySelector('#sbTray [data-act="end"]').click();
  return JSON.stringify({plan:a.plan.map(p=>[p.kind,Math.round(p.local[0].x),Math.round(p.local[0].y)]),action:a.action,end:a.endHere,step:F.stepOf(a)});
 });
 await pg.evaluate(()=>{const D=window.DBGarena.sb,f=D.fn;f.load('e5_job','sb',null,10);const S=D.sim.S,a=S.ships.find(x=>x.faction==='reb');S.rocks.length=0;
  const c=f.cam_();Object.assign(a,{x:2000,y:1500,h:0});c.x=2000;c.y=1500;c.z=0.6;f.syncHud();document.activeElement&&document.activeElement.blur&&document.activeElement.blur();});
 await pg.keyboard.press('3');   // the third mode icon: Boost
 const kb1=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,S=D.sim.S,a=S.ships.find(x=>x.faction==='reb'),z=f.cam_().z;
  const armed=a.kinds[0];
  D.mod.planInput({type:'down',x:a.x,y:a.y,z});D.mod.planInput({type:'move',x:2700,y:1650,z});D.mod.planInput({type:'up',x:2700,y:1650,z});f.syncHud();
  return armed;
 });
 await pg.keyboard.press('1');   // the action step's first icon: Angle fore
 await pg.keyboard.press('Escape');           // back to the action
 const kbBack=await pg.evaluate(()=>{const D=window.DBGarena.sb,S=D.sim.S,a=S.ships.find(x=>x.faction==='reb');return D.sim.fn.stepOf(a);});
 await pg.keyboard.press('1');
 const seg2Keys=await pg.evaluate(()=>[...document.querySelectorAll('#sbTray [data-key]')].findIndex(e=>e.dataset.act==='end')+1);
 await pg.keyboard.press(String(seg2Keys));   // End here (and the selection moves on to the next ship)
 const byKeys=await pg.evaluate(()=>{const D=window.DBGarena.sb,F=D.sim.fn,S=D.sim.S,a=S.ships.find(x=>x.faction==='reb');
  return JSON.stringify({plan:a.plan.map(p=>[p.kind,Math.round(p.local[0].x),Math.round(p.local[0].y)]),action:a.action,end:a.endHere,step:F.stepOf(a)});});
 const selBefore=await pg.evaluate(()=>window.DBGarena.sb.sim.S.sel);
 await pg.keyboard.press('Tab');
 const selTab=await pg.evaluate(()=>window.DBGarena.sb.sim.S.sel);
 await pg.keyboard.down('Shift');await pg.keyboard.press('Tab');await pg.keyboard.up('Shift');
 const selBack=await pg.evaluate(()=>window.DBGarena.sb.sim.S.sel);
 await pg.keyboard.press('Enter');
 const kbExec=await pg.evaluate(()=>{const D=window.DBGarena.sb;const p=D.phase;while(D.phase==='EXEC')D.fn.stepTick();return p;});
 ok(kb1==='boost'&&byKeys===byMouse&&JSON.parse(byKeys).step==='done','HUD 9: the keys should make the mouse\'s plan '+JSON.stringify([kb1,byMouse,byKeys]));
 ok(kbBack==='action'&&selTab!==selBefore&&selBack===selBefore&&kbExec==='EXEC','HUD 9: Esc, Tab, Shift-Tab and Enter '+JSON.stringify([kbBack,selBefore,selTab,selBack,kbExec]));

 /* ---------- SB flight, guns and status (the designer, 12 Oct: flown ships, quick bolts from the guns, shields and hull on the ships) ---------- */
 const fly=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  const setup=()=>{f.load('e1_fox','sb',null,12);const S=D.sim.S,F=D.sim.fn,fox=S.ships.find(q=>q.id==='P1');S.rocks.length=0;
    for(const e of S.ships)if(e.faction==='heg'){e.x=3900;e.y=300;}
    Object.assign(fox,{x:1200,y:1500,h:0});return {S,F,fox};};
  const order=(F,fox,turn)=>F.planSegs('P1',[{pts:[{x:fox.x+Math.cos(fox.h)*420,y:fox.y+Math.sin(fox.h)*420}]},
    {pts:[{x:fox.x+Math.cos(fox.h+turn)*800,y:fox.y+Math.sin(fox.h+turn)*800}]}]);
  // flown: off the line a little on the way, close to the end, never on it exactly; on rails exactly
  let {S,F,fox}=setup();order(F,fox,0.9);f.beginExec();
  let dev=0;const end=fox.planEnd;
  while(D.phase==='EXEC'){f.stepTick();if(fox.body.P)dev=Math.max(dev,Math.hypot(fox.x-fox.body.P.x,fox.y-fox.body.P.y));}
  const flownEnd=Math.hypot(fox.x-end.x,fox.y-end.y);
  // it carries its velocity into the next round
  const vCarry=Math.hypot(fox.vx,fox.vy);order(F,fox,-0.4);f.beginExec();const vStart=Math.hypot(fox.body.vx,fox.body.vy);
  while(D.phase==='EXEC')f.stepTick();
  D.sim.set('PHYSICS',false);({S,F,fox}=setup());order(F,fox,0.9);f.beginExec();const end2=fox.planEnd;while(D.phase==='EXEC')f.stepTick();
  const railEnd=Math.hypot(fox.x-end2.x,fox.y-end2.y);D.sim.set('PHYSICS',true);
  out.flight=[+dev.toFixed(1),Math.round(flownEnd),Math.round(vCarry),Math.round(vStart),+railEnd.toFixed(2)];
  // a K-Turn's flip turns the line of flight round: the next round flies off the new way without fighting it
  ({S,F,fox}=setup());F.planSegs('P1',[{kind:'kturn',pts:[{x:1500,y:1500}]}]);f.beginExec();while(D.phase==='EXEC')f.stepTick();
  const hK=fox.h;order(F,fox,0);f.beginExec();let devK=0;while(D.phase==='EXEC'){f.stepTick();if(fox.body.P)devK=Math.max(devK,Math.hypot(fox.x-fox.body.P.x,fox.y-fox.body.P.y));}
  out.kturn=[Math.abs(Math.cos(hK))>0.9&&Math.cos(hK)<0,Math.round(devK)];
  // guns: bolts at PROJ_SPD from the art's two gun mounts, alternately, flying straight
  ({S,F,fox}=setup());const q=fox.wpns[0],V=D.sim.PROJ_SPD_();
  const M=F.mountsOf(fox,q),m0=F.muzzleAt(fox,q,0),m1=F.muzzleAt(fox,q,1);
  const e1=S.ships.find(x=>x.id==='E1');Object.assign(e1,{x:1900,y:1500,h:0});fox.target='E1';fox.locks.E1=1;fox.pilot.cool=90;
  F.fireTick(fox,0.05);for(let i=0;i<4;i++)F.emitBursts(0.05);
  const P=S.proj.filter(p=>p.owner==='P1');
  const sides=P.map(p=>Math.sign(Math.round(p.y0-1500))).join(',');
  const p0=P[0],h0=Math.atan2(p0.vy,p0.vx);F.projTick(0.05);
  out.guns=[M.length,Math.round(Math.hypot(p0.vx,p0.vy))===V,sides,Math.round(m0.x-1200)>10,Math.round(Math.abs(m0.y-m1.y)),Math.abs(Math.atan2(p0.vy,p0.vx)-h0)<1e-9,V>=2000,D.sim.BOLT_LEN_()<=30];
  // shields: a shield hit flares its arc; the status layer draws without error
  ({S,F,fox}=setup());const e=S.ships.find(x=>x.id==='E1');Object.assign(e,{x:1500,y:1500,h:0});e.segs.F.val=e.segs.F.max;   // a shot travelling west meets its fore arc
  F.hitShip(e,'P1',fox.wpns[0].w,-1000,0,{x:e.x+20,y:e.y,nx:1,ny:0},false,0);
  // streams: many small bolts, the same damage a second as the old four quarter-rolls every 2 s
  const share=D.sim.PROJ_DMG_();
  out.stream=[D.sim.BURST_N_()>=8,D.sim.BURST_N_()/D.sim.BURST_EVERY_()>=8,Math.abs(share*D.sim.BURST_N_()/D.sim.BURST_EVERY_()-D.sim.GUN_DPS_())<1e-9,Math.abs(D.sim.GUN_DPS_()-4*0.25/2)<1e-9];
  ({S,F,fox}=setup());const tg=S.ships.find(x=>x.id==='E1');Object.assign(tg,{x:1500,y:1500,h:0});tg.segs.F.val=0;tg.segs.R.val=0;const a0=tg.arm+tg.hull;
  const hr=F.hitShip(tg,'P1',fox.wpns[0].w,-1000,0,{x:tg.x+20,y:tg.y,nx:1,ny:0},false,0);
  out.stream.push(hr.dmg>0&&hr.dmg<1,Math.abs((a0-tg.arm-tg.hull)-hr.dmg)<1e-9);
  // weapon range ×: a target at 1.5 × the gun's range is in band at RANGE_MULT 2
  ({S,F,fox}=setup());const far=S.ships.find(x=>x.id==='E1');Object.assign(far,{x:1200+fox.wpns[0].w.rng*1.5,y:1500});
  const before=F.canFire(fox,fox.wpns[0],far);D.sim.set('RANGE_MULT',2);const after=F.canFire(fox,fox.wpns[0],far);D.sim.set('RANGE_MULT',1);
  out.range=[before,after];
  out.shield=[!!e.shFx&&e.shFx.zone==='F',typeof F.drawShields,typeof F.drawStatus,D.sim.STATUS_(),F.shieldR(e)>0];
  return out;
 });
 ok(fly.flight[0]>1&&fly.flight[0]<80&&fly.flight[1]>0.5&&fly.flight[1]<40,'Flight: flown close to the line, not on it '+JSON.stringify(fly.flight));
 ok(Math.abs(fly.flight[2]-fly.flight[3])<=1,'Flight: velocity carries into the next round '+JSON.stringify(fly.flight));
 ok(fly.flight[4]<1,'Flight: with PHYSICS off the ship is back on the rails '+JSON.stringify(fly.flight));
 ok(fly.kturn[0]&&fly.kturn[1]<80,'Flight: after a K-Turn the next round flies off the new way '+JSON.stringify(fly.kturn));
 ok(fly.guns[0]===2&&fly.guns[1]&&fly.guns[2].includes('-1')&&fly.guns[2].includes('1')&&fly.guns[3]&&fly.guns[4]>15&&fly.guns[5]&&fly.guns[6]&&fly.guns[7],'Guns: quick bolts from both gun mounts, flying straight '+JSON.stringify(fly.guns));
 ok(fly.stream.every(Boolean),'Guns: streams of small bolts, the same damage a second '+JSON.stringify(fly.stream));
 ok(fly.range[0]===false&&fly.range[1]===true,'Guns: RANGE_MULT stretches the guns '+JSON.stringify(fly.range));
 // the map: the bigger default, with the scenario set in its middle
 const map=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn;
  f.load('e1_fox','sb',null,5);const small=D.sim.S.ships.map(s=>[s.x,s.y]),m1=f.map_();
  f.setMapScale(2.5);f.load('e1_fox','sb',null,5);const big=D.sim.S.ships.map(s=>[s.x,s.y]),m2=f.map_();
  const ox=(m2.W-m1.W)/2,oy=(m2.H-m1.H)/2;
  const ok=big.every((p,i)=>Math.abs(p[0]-small[i][0]-ox)<1e-6&&Math.abs(p[1]-small[i][1]-oy)<1e-6);
  const rocks=D.sim.S.rocks.length;f.runExecSync();
  f.setMapScale(1);
  return {m1,m2,ok,rocks,phase:D.phase};
 });
 ok(sb.mapDefault===2.5&&map.m2.W===10500&&map.m2.H===7500&&map.m1.W===4200&&map.ok&&map.rocks>0&&map.phase==='PLAN','Map: 2.5 × by default, the scenario in the middle '+JSON.stringify([sb.mapDefault,map]));
 ok(fly.shield.every(x=>x===true||x==='function'),'Status: shield arcs flare on a hit '+JSON.stringify(fly.shield));

 /* ---------- SB feel (the designer, 11 Oct: speed, visible shots, no choppy motion) ---------- */
 const feel=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  f.load('sb1_fox','sb',null,8);
  const S=D.sim.S,F=D.sim.fn,fox=S.ships.find(q=>q.id==='P1');
  // speed: the envelope is the dial × SPEED_SCALE; the turn radius is not scaled
  const env=F.envelope(fox,'basic');
  out.speed=[Math.abs(env.Lmax-fox.row.straight_max*150*D.sim.SPEED_SCALE_())<1e-9,D.sim.SPEED_SCALE_()>1,Math.abs(env.kap-F.dialOf(fox).kap)<1e-12];
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

 /* ---------- SB momentum (the designer, 12 Oct: momentum in the reach, SB only) ---------- */
 const mom=await pg.evaluate(()=>{
  const D=window.DBGarena.sb,f=D.fn,out={};
  f.load('sb2_drift','sb',null,1);
  const S=D.sim.S,F=D.sim.fn,s=S.ships[0],Q=Math.PI/4,SC=D.sim.SPEED_SCALE_(),u=150*SC;
  const maxTurn=e=>{let a=0;for(let i=0;i<=90;i++){const t=i*Math.PI/180;if(e.hi(t)>=e.lo(t))a=i;}return a;};
  // a fresh ship carries cruise speed
  out.fresh=[F.dialOf(s).mom,(s.row.straight_min+s.row.straight_max)/2];
  // out of a full-speed straight: it can't slow far, and the hard turns are gone
  s.mom=s.row.straight_max;let d=F.dialOf(s),e=F.envelope(s,'basic');
  out.fast=[d.roundMin>d.smin,e.hi(2*Q)<e.lo(2*Q),maxTurn(e)<90,Math.round(d.roundMax)===Math.round(d.smax)];
  // out of a slow round: hard turns are back, but top speed is a round away
  s.mom=s.row.straight_min;d=F.dialOf(s);e=F.envelope(s,'basic');
  out.slow=[e.hi(2*Q)>=e.lo(2*Q),maxTurn(e)===90,d.roundMax<d.smax,Math.round(d.roundMin)===Math.round(d.smin)];
  // the round's distance becomes next round's momentum
  s.mom=null;S.ships.forEach(q=>{if(q!==s)q.alive=false;});
  F.planSegs('P1',[{pts:[{x:s.x+Math.cos(s.h)*5000,y:s.y+Math.sin(s.h)*5000}]}]);
  const flown=F.curvesOf(s).reduce((a,g)=>a+g.L,0);
  f.runExecSync();
  out.carry=[+s.mom.toFixed(3),+(flown/u).toFixed(3)];
  // with momentum off, the reach is the plain dial
  D.sim.set('MOMENTUM',false);d=F.dialOf(s);
  out.off=[d.roundMin===d.smin,d.roundMax===d.smax,d.kap===d.kapBase];
  D.sim.set('MOMENTUM',true);
  // the Hegemony flies by the same rule: each enemy's round sits inside its own window
  f.load('sb1_fox','sb',null,2);
  const ok=[];
  for(let t=0;t<3&&D.phase==='PLAN';t++){
    const win=D.sim.S.ships.filter(q=>q.faction==='heg'&&q.alive).map(q=>[q,F.dialOf(q)]);
    f.beginExec();
    for(const [q,dd] of win){const L=q.sched.reduce((a,g)=>a+g.L,0);ok.push(L>=dd.roundMin-1&&L<=dd.roundMax+1);}
    while(D.phase==='EXEC')f.stepTick();
  }
  out.heg=[ok.length,ok.every(Boolean)];
  return out;
 });
 ok(mom.fresh[0]===mom.fresh[1],'SB momentum: a fresh ship should carry cruise speed '+JSON.stringify(mom.fresh));
 ok(mom.fast.every(Boolean),'SB momentum: out of a full-speed run it cannot slow far or turn hard '+JSON.stringify(mom.fast));
 ok(mom.slow.every(Boolean),'SB momentum: out of a slow round it turns hard but cannot reach top speed '+JSON.stringify(mom.slow));
 ok(Math.abs(mom.carry[0]-mom.carry[1])<0.01,'SB momentum: the round flown should become the next momentum '+JSON.stringify(mom.carry));
 ok(mom.off.every(Boolean),'SB momentum: the toggle off should give the plain dial '+JSON.stringify(mom.off));
 ok(mom.heg[0]>0&&mom.heg[1],'SB momentum: enemies should fly inside their own momentum window '+JSON.stringify(mom.heg));

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
  out.threat=[+(arc/(rounds*f.EXEC_LEN_()*2)).toFixed(2),hits,rounds];   // share of the time two pursuers could have their guns on it
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
 ok(ai.threat[0]>=0.25&&ai.threat[1]>=10,'SB AI: pursuers should keep their guns on a weaving fox (share of the round, hits, rounds) '+JSON.stringify(ai.threat));
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
 /* ---------- High Command (docs/ARENA-HC-HANDOFF.md §8), driven through DBGarena.hc ---------- */
 const ctx3=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const pg3=await ctx3.newPage();
 pg3.on('pageerror',e=>errs.push('hc pageerror: '+e.message));
 pg3.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('hc console: '+m.text());});
 await pg3.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg3.goto(base+'#arena');await pg3.waitForTimeout(700);
 const hc=await pg3.evaluate((SAVE_KEY)=>{
  const top=window.DBGarena,out={};
  // 1. ruleset isolation: three rulesets; High Command's scenarios on its own list only; picking it runs it
  top.fn.openPicker();
  out.rulesets=[...document.querySelectorAll('#arRulesets [data-ruleset-item] b')].map(e=>e.textContent);
  top.fn.chooseRuleset('v2');out.v2List=top.fn.pickerIds();
  top.fn.openPicker();
  document.querySelector('#arRulesets [data-ruleset="hc"]').click();
  const H=top.hc,f=H.fn,SIM=H.SIM;
  out.hcActive=[top.ruleset,H.active,!document.getElementById('hcPicker').hidden,document.querySelector('#sc-arena .ar-shell').hidden];
  out.hcList=[...document.querySelectorAll('#hcPicker [data-scen]')].map(e=>e.dataset.scen);
  out.sbList=top.sb.scenarios.filter(s=>!s.rulesets||s.rulesets.includes('sb')).map(s=>s.id);
  document.querySelector('#hcPicker [data-load="hc1_nightfall"]').click();
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id);
  out.loaded=[H.phase,S().scn.id,S().wings.map(w=>w.id+':'+w.ships.length).join(),!!by('lark'),!!by('relay'),f.cam_().z>0];
  // the HUD: the clock, the objectives, the roster (a header per wing, a tile per ship), the time controls, one gold primary
  f.syncHud();
  const q=s=>document.querySelector('#arHc '+s);
  out.hud=[q('#hcClock').textContent,document.querySelectorAll('#hcObj .hc-obj__item').length,document.querySelectorAll('#hcRoster .hc-wing').length,
    document.querySelectorAll('#hcRoster .hc-tile').length,document.querySelectorAll('#hcTime [data-speed]').length,
    [...document.querySelectorAll('#arHc .sr-btn--primary')].filter(e=>e.offsetParent).length,!q('#hcBanner').hidden];
  // the tray: click a wing header; Attack, Escort and Withdraw are live, the rest wait for T2
  q('[data-wing-head="dagger"]').click();
  const tray=q('#hcTray');
  out.tray=[!tray.hidden,tray.querySelectorAll('[data-order]').length,[...tray.querySelectorAll('[data-order]:not([aria-disabled="true"])')].map(b=>b.dataset.order).join(),
    tray.querySelector('[data-order="attack"]').classList.contains('is-set')];
  // 2 (T1). orders fly themselves: Attack prosecutes the relay; Escort stays with the lark; Withdraw jumps (once unjammed)
  S().rocks.length=0;
  f.setSpeed(2);
  const d0=Math.hypot(by('P1').x-by('relay').x,by('P1').y-by('relay').y);
  f.run(12);
  const dagger=S().wings.find(w=>w.id==='dagger');
  out.attack=[d0,Math.round(Math.min(...dagger.ships.map(id=>Math.hypot(by(id).x-by('relay').x,by(id).y-by('relay').y))))];
  out.escort=Math.round(Math.max(...S().wings.find(w=>w.id==='amber').ships.map(id=>Math.hypot(by(id).x-by('lark').x,by(id).y-by('lark').y))));
  // withdraw while jammed: they gather at the jump point but cannot leave; kill the relay and they jump
  for(const s of S().ships)if(s.faction==='heg'&&!s.struct){s.alive=false;}
  out.withdraw=[f.issue('dagger','withdraw').ok,f.issue('amber','withdraw').ok];
  f.run(40);
  out.jammed=[S().ships.filter(s=>s.jumped).length,SIM.fn.jammed('jump')];
  by('relay').hull=0;by('relay').alive=false;
  f.run(30);
  out.jumped=S().ships.filter(s=>s.jumped).map(s=>s.id).sort().join();
  // 7. the reinforcement clock: nothing before zero, the force at zero, the objective text flips
  f.load('hc1_nightfall',0,3);
  const RF=S().reinforce;
  for(const s of S().ships)if(s.faction==='heg'&&!s.struct)s.alive=false;   // a quiet sky, so the clock is all that happens
  SIM.runFor(RF.secs-1);
  out.clock=[RF.spawned,S().ships.filter(s=>s.faction==='heg'&&s.alive).length,SIM.objText()];
  SIM.runFor(1.5);
  out.clock.push(RF.spawned,S().ships.filter(s=>s.faction==='heg'&&s.alive&&s.doctrine==='hunt').length,SIM.objText(),S().getOut,
    S().events.some(e=>e.kind==='reinforce'),f.syncHud()===undefined&&q('#hcClock').textContent);
  // 6. determinism: the same seed and the same orders at the same ticks, once straight through and once through the
  // real-time driver with pauses and speed changes in between, end in the same state
  const script=[[60,'dagger','escort',{type:'ship',id:'lark'}],[200,'amber','attack',{type:'class',cls:'mote'}],[420,'dagger','withdraw',null]];
  const straight=()=>{f.load('hc1_nightfall',0,77);let i=0;while(S().tick<900){while(i<script.length&&script[i][0]===S().tick){SIM.setOrder(script[i][1],script[i][2],script[i][3]);i++;}SIM.step();}return SIM.stateHash();};
  const driven=()=>{
    f.load('hc1_nightfall',0,77);let i=0,now=1000,pauses=0;f.frame(now);
    while(S().tick<900){
      while(i<script.length&&script[i][0]===S().tick){
        f.setSpeed(0);for(let k=0;k<20;k++){now+=16;f.frame(now);}pauses++;   // pause, think, order, resume
        SIM.setOrder(script[i][1],script[i][2],script[i][3]);i++;
        f.setSpeed(i%2?3:1);
      }
      if(S().tick%97===0){f.setSpeed(0);now+=16;f.frame(now);now+=400;f.frame(now);f.setSpeed(2);}
      const t0=S().tick;now+=16;f.frame(now);
      if(S().tick>t0+1)return 'skipped '+t0;
    }
    return [SIM.stateHash(),pauses,H.A.pauses>0,H.A.pausedSecs>0];
  };
  const h1=straight(),h2=driven(),h3=straight();
  out.det=[h1,h3,h2];
  f.load('hc1_nightfall',0,78);while(S().tick<900)SIM.step();out.det.push(SIM.stateHash());
  out.noSave=localStorage.getItem(SAVE_KEY)===null;
  return out;
 },CAMPAIGN_KEY);
 ok(JSON.stringify(hc.rulesets)==='["SR V2 Combat","SB Test","Type 3: High Command"]','HC 1: three rulesets '+JSON.stringify(hc.rulesets));
 ok(!hc.v2List.some(id=>id.startsWith('hc'))&&!hc.sbList.some(id=>id.startsWith('hc')),'HC 1: HC scenarios stay off the v2 and SB lists '+JSON.stringify([hc.v2List,hc.sbList]));
 ok(hc.hcActive.join()==='hc,true,true,true'&&hc.hcList.join()==='hc1_nightfall,hc2_lastlight,hc3_meltdown','HC 1: picking High Command opens its own list '+JSON.stringify([hc.hcActive,hc.hcList]));
 ok(hc.loaded[0]==='LIVE'&&hc.loaded[1]==='hc1_nightfall'&&hc.loaded[2]==='dagger:3,amber:2'&&hc.loaded[3]&&hc.loaded[4],'HC 1: hc1_nightfall loads with its wings '+JSON.stringify(hc.loaded));
 ok(hc.hud[0]==='4:00'&&hc.hud[1]===3&&hc.hud[2]===2&&hc.hud[3]===5&&hc.hud[4]===4&&hc.hud[5]===1&&hc.hud[6],'HC HUD: clock, objectives, roster, time controls, one gold primary, paused on load '+JSON.stringify(hc.hud));
 ok(hc.tray[0]&&hc.tray[1]===9&&['attack','escort','withdraw'].every(k=>hc.tray[2].split(',').includes(k))&&hc.tray[3],'HC T1: the wing tray '+JSON.stringify(hc.tray));
 ok(hc.attack[1]<hc.attack[0]*0.5,'HC T1: Attack closes on the relay '+JSON.stringify(hc.attack));
 ok(hc.escort<1200,'HC T1: Escort stays with the lark '+hc.escort);
 ok(hc.withdraw.every(Boolean)&&hc.jammed[0]===0&&hc.jammed[1]===true,'HC T1: nothing jumps while the relay jams the point '+JSON.stringify([hc.withdraw,hc.jammed]));
 ok(hc.jumped==='P1,P2,P3,P4,P5,lark','HC T1: Withdraw jumps every ship (and the convoy) once unjammed '+hc.jumped);
 ok(hc.clock[0]===false&&hc.clock[3]===true&&hc.clock[4]>=5&&/GET OUT/.test(hc.clock[5])&&!/GET OUT/.test(hc.clock[2])&&hc.clock[6]&&hc.clock[7]&&hc.clock[8]==='REINFORCEMENTS','HC 7: the reinforcement clock '+JSON.stringify(hc.clock));
 ok(hc.det[0]===hc.det[1]&&Array.isArray(hc.det[2])&&hc.det[2][0]===hc.det[0]&&hc.det[2][1]===3&&hc.det[2][2]&&hc.det[2][3]&&hc.det[3]!==hc.det[0],'HC 6: determinism with pauses '+JSON.stringify(hc.det));
 ok(hc.noSave,'HC: the campaign key appeared');
 /* ---------- High Command T2: orders, tactics, rules, morale, the feed, the tiles ---------- */
 const hc2=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id),q=s=>document.querySelector('#arHc '+s);
  const quiet=()=>{for(const s of S().ships)if(s.faction==='heg'&&!s.struct)s.alive=false;};
  const spreadOf=w=>{const l=SIM.fn.wingShips(w),c=SIM.fn.wingCentre(w);return l.reduce((a,s)=>a+Math.hypot(s.x-c.x,s.y-c.y),0)/l.length;};
  // 2. order persistence: Attack on a ship class, 30 s at speed 3 through the driver, no input: still prosecuting
  f.load('hc1_nightfall',0,21);
  f.issue('dagger','attack',{type:'class',cls:'mote'});
  f.setSpeed(3);let now=1000,samples=0,on=0;f.frame(now);
  const t0=S().t;
  while(S().t-t0<30&&!S().over){
    now+=16;f.frame(now);
    if(S().tick%20===0)for(const id of S().wings[0].ships){const s=by(id);if(!s.alive||s.beh.kind==='withdraw')continue;samples++;const t=by(s.beh.target);if(s.beh.kind==='engage'&&t&&t.cls==='mote')on++;}
  }
  const motesLeft=S().ships.filter(s=>s.alive&&s.cls==='mote').length;
  out.persist=[S().wings[0].order.kind,S().wings[0].order.target.cls,samples>0?on/samples:1,motesLeft,Math.round(S().t-t0)];
  // 3. tactic effect: the same seed and orders, Tight then Spread: measurably different dispersion
  const disp=tac=>{f.load('hc1_nightfall',0,5);quiet();S().rocks.length=0;f.issue('dagger','regroup');SIM.setTactic('dagger',tac);SIM.runFor(15);let a=0;for(let i=0;i<20;i++){SIM.runFor(0.5);a+=spreadOf(S().wings[0]);}return Math.round(a/20);};
  out.tactic=[disp('tight'),disp('spread')];
  // 4. Preservation Order: a mauled ship flips to Withdraw within one think tick
  f.load('hc1_nightfall',0,9);
  const r=SIM.addRule('preservation','all');
  SIM.runFor(1);
  const wren=by('P2');wren.hull=wren.maxHull*0.28;
  const tk=S().tick;let flipped=null;
  for(let i=0;i<20&&flipped==null;i++){SIM.step();if(wren.beh.kind==='withdraw'&&wren.beh.rule==='preservation')flipped=S().tick-tk;}
  out.pres=[r.ok,flipped,Math.round(SIM.fn.THINK_SECS_()*1000/SIM.TICK),S().m.ruleTriggers,S().m.byRule.preservation,S().events.some(e=>e.kind==='rule'&&/Preservation Order: Wren/.test(e.text))];
  // the rules panel: + RULE, pick a rule, a scope (and a ship for Saviour); chips with × rescind
  f.syncHud();
  q('[data-act="addrule"]').click();
  out.rulesUi=[document.querySelectorAll('#hcRules [data-pickrule]').length];
  q('[data-pickrule="guardian"]').click();q('[data-pickscope="amber"]').click();
  q('[data-act="addrule"]').click();q('[data-pickrule="saviour"]').click();q('[data-pickscope="all"]').click();q('[data-pickship="lark"]').click();
  f.syncHud();
  out.rulesUi.push([...document.querySelectorAll('#hcRules .hc-rchip')].map(e=>e.textContent).join('|'));
  q('#hcRules [data-unrule]').click();f.syncHud();
  out.rulesUi.push(document.querySelectorAll('#hcRules .hc-rchip').length,S().rules.map(x=>x.rule).join());
  // the other orders
  f.load('hc1_nightfall',0,4);S().rocks.length=0;
  const amber=S().wings[1],dag=S().wings[0];
  // Intercept: one ship, hard; Defend: guard the lark; Hold: orbit a point; Regroup: formation
  const g1=by('E2');
  out.intercept=[f.issue('dagger','intercept',{type:'ship',id:g1.id}).ok];
  out.defend=[f.issue('amber','defend',{type:'ship',id:'lark'}).ok];
  SIM.runFor(6);
  out.intercept.push(dag.ships.map(by).filter(s=>s.alive).every(s=>s.beh.kind==='engage'&&s.beh.target===g1.id||s.beh.why==='order: target gone'));
  out.defend.push(amber.ships.map(by).every(s=>s.beh.kind==='defend'||s.beh.kind==='engage'),Math.round(Math.max(...amber.ships.map(by).map(s=>Math.hypot(s.x-by('lark').x,s.y-by('lark').y)))));
  quiet();
  f.issue('amber','hold');const hp=Object.assign({},amber.hold);
  f.issue('dagger','regroup');
  SIM.runFor(12);
  out.hold=[Math.round(Math.max(...amber.ships.map(by).map(s=>Math.hypot(s.x-hp.x,s.y-hp.y)))),amber.ships.map(by).every(s=>s.beh.kind==='hold')];
  out.regroup=dag.ships.map(by).filter(s=>s.alive).every(s=>s.beh.kind==='form');
  // Capture: the satellite, after CAPTURE_SECS of presence; +1 CP from the objective
  S().cp=3;
  f.issue('dagger','capture',{type:'point',id:'sat'});
  SIM.runFor(40);
  const sat=S().objectives.find(o=>o.id==='sat');
  out.capture=[S().points.sat.owner,sat.state,S().cp,S().events.some(e=>e.kind==='capture')];
  // Board: refused without marines; with marines (a wing added at runtime) it boards the relay
  out.board=[f.issue('amber','board',{type:'station',id:'relay'}).ok];
  window.DBGarena.fn.addScenario({id:'t_board',title:'Test: board',desc:'Smoke test.',rulesets:['hc'],rocks:[],
    wings:[{id:'hammer',name:'Hammer',at:[3000,3000,0],order:{kind:'regroup'},tactic:'tight',ships:[{cls:'graf',name:'Anvil',marines:true},{cls:'talon',name:'Nail'}]}],
    enemies:[{type:'fuel-depot',id:'rx',name:'Reactor',label:'Reactor',at:[3900,3000,0]}],points:{jump:{x:400,y:3000,label:'Jump point'}},extract:'jump',
    objectives:[{id:'b',kind:'board',station:'rx',text:'Board the reactor',primary:true}],reinforce:{secs:600,edge:'E',force:[]},cp:2});
  f.load('t_board',0,1);
  out.board.push(SIM.targetChips(S().wings[0],'board').map(c=>c.label).join(),f.issue('hammer','board',{type:'station',id:'rx'}).ok);
  SIM.runFor(30);
  out.board.push(by('rx').boarded===true,S().objectives[0].state);
  // morale: the ladder from nerve; a pilot dropped to panic flees or freezes, raises an emergency with their words
  f.load('hc1_nightfall',0,12);
  const M=SIM.fn.MORALE_();
  const pil=by('P3');
  SIM.setDoctrine('P3','lockin','MANUAL');   // else Lock In (AUTO) catches the panic before it lands (HC 8)
  const ladder=v=>{pil.pilot.cool=v;return SIM.moraleOf(pil);};
  out.morale=[ladder(M.EAGER+1),ladder(M.SHAKEN+1),ladder(M.SHAKEN-1),ladder(M.PANIC-1)];
  SIM.step();SIM.runFor(0.6);
  out.panic=[!!pil.panic,pil.beh.kind,!!pil.holdFire,S().m.emergencies.length,S().events.filter(e=>e.kind==='emergency').map(e=>e.text).join('|')];
  // assessments: every ship has one, in its own words
  out.assess=S().ships.filter(s=>s.alive&&s.faction==='reb'&&!s.quiet).every(s=>typeof s.assess==='string'&&s.assess.length>3);
  // the feed narrates; VIEW jumps the camera; Tab steps to the next unviewed event
  f.setSpeed(3);now=5000;for(let k=0;k<1500&&!S().over;k++){now+=16;f.frame(now);}
  f.syncHud();
  const evEls=[...document.querySelectorAll('#hcFeed .hc-ev')];
  const views=[...document.querySelectorAll('#hcFeed [data-view]')];
  const kinds=[...new Set(S().events.map(e=>e.kind))].sort().join();
  const v=views[views.length-1],ev=S().events.find(e=>e.id===+v.dataset.view),c0=Object.assign({},f.cam_());
  v.click();
  const c1=f.cam_(),tgt=ev.ship&&by(ev.ship)&&by(ev.ship).alive?by(ev.ship):{x:ev.x,y:ev.y};
  out.feed=[evEls.length,views.length,kinds,Math.round(Math.hypot(c1.x-tgt.x,c1.y-tgt.y)),ev.viewed];
  const unv=S().events.filter(e=>!e.viewed&&(e.x!=null||e.ship)).length;
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab'}));
  out.feed.push(unv,S().events.filter(e=>!e.viewed&&(e.x!=null||e.ship)).length);
  // live camera tiles: drawn from the sim (pixels other than the void), under budget
  for(let k=0;k<20;k++)f.tileTick();
  const cv=document.querySelector('#hcRoster .hc-tile canvas'),px=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  let lit=0;for(let i=0;i<px.length;i+=4)if(px[i]+px[i+1]+px[i+2]>120)lit++;
  out.tiles=[f.tiles_().live,lit>20,f.tiles_().ms<f.tiles_().TILE_BUDGET];
  // the tray: all nine orders live but Board (no marines), the tactic row live; hover cards read live numbers
  f.selectWing('dagger',true);f.syncHud();
  out.tray=[[...document.querySelectorAll('#hcTray [data-order]:not([aria-disabled="true"])')].length,[...document.querySelectorAll('#hcTray [data-tactic]:not([aria-disabled="true"])')].length,
    q('#hcTray [data-order="board"]').getAttribute('aria-disabled'),f.tipFor('order:attack').line,/Spacing ×3\.4,/.test(f.tipFor('tactic:spread').line)];
  return out;
 });
 ok(hc2.persist[0]==='attack'&&hc2.persist[1]==='mote'&&hc2.persist[2]>=0.7&&hc2.persist[4]>=30,'HC 2: Attack persists 30 s at speed 3 '+JSON.stringify(hc2.persist));
 ok(hc2.tactic[1]>hc2.tactic[0]*1.5,'HC 3: Spread disperses more than Tight '+JSON.stringify(hc2.tactic));
 ok(hc2.pres[0]&&hc2.pres[1]!=null&&hc2.pres[1]<=hc2.pres[2]&&hc2.pres[3]>=1&&hc2.pres[4]===1&&hc2.pres[5],'HC 4: Preservation flips within one think tick '+JSON.stringify(hc2.pres));
 ok(hc2.rulesUi[0]===5&&hc2.rulesUi[1]==='PRESERVATION 30% · ALL|GUARDIAN · AMBER|SAVIOUR CONVOY LARK · ALL'&&hc2.rulesUi[2]===2&&hc2.rulesUi[3]==='guardian,saviour','HC T2: the rules panel '+JSON.stringify(hc2.rulesUi));
 ok(hc2.intercept.every(Boolean)&&hc2.defend[0]&&hc2.defend[1]&&hc2.defend[2]<1800,'HC T2: Intercept and Defend '+JSON.stringify([hc2.intercept,hc2.defend]));
 ok(hc2.hold[0]<900&&hc2.hold[1]&&hc2.regroup,'HC T2: Hold and Regroup '+JSON.stringify([hc2.hold,hc2.regroup]));
 ok(hc2.capture[0]==='reb'&&hc2.capture[1]==='done'&&hc2.capture[2]===4&&hc2.capture[3],'HC T2: Capture takes the satellite for +1 CP '+JSON.stringify(hc2.capture));
 ok(hc2.board[0]===false&&hc2.board[1]==='Reactor'&&hc2.board[2]&&hc2.board[3]&&hc2.board[4]==='done','HC T2: Board needs marines, then boards '+JSON.stringify(hc2.board));
 ok(hc2.morale.join()==='EAGER,STEADY,SHAKEN,PANICKED','HC T2: the morale ladder '+hc2.morale);
 ok(hc2.panic[0]&&/flee|freeze/.test(hc2.panic[1])&&hc2.panic[2]&&hc2.panic[3]===1&&/Petra is panicking/.test(hc2.panic[4]),'HC T2: panic is an emergency '+JSON.stringify(hc2.panic));
 ok(hc2.assess,'HC T2: every pilot has an assessment');
 ok(hc2.feed[0]>=3&&hc2.feed[1]>=1&&/kill|loss/.test(hc2.feed[2])&&hc2.feed[3]<5&&hc2.feed[4]&&(hc2.feed[5]===0||hc2.feed[6]===hc2.feed[5]-1),'HC T2: the feed, VIEW and Tab '+JSON.stringify(hc2.feed));
 ok(hc2.tiles.every(Boolean),'HC T2: live camera tiles '+JSON.stringify(hc2.tiles));
 ok(hc2.tray[0]===8&&hc2.tray[1]===6&&hc2.tray[2]==='true'&&/Engage a designated target: click the objective, a ship class, or a station/.test(hc2.tray[3])&&hc2.tray[4],'HC T2: the tray '+JSON.stringify(hc2.tray));
 /* ---------- High Command T3: commands, CP, doctrine, emergencies and their answers ---------- */
 const hc3=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id),q=s=>document.querySelector('#arHc '+s);
  // 5. Override: a better local target (a guard on Joss's tail) is ignored for the designation; CP decrements
  const setup=()=>{f.load('hc1_nightfall',0,31);S().rocks.length=0;
    const joss=by('P1'),g=by('E2'),relay=by('relay');
    for(const s of S().ships)if(s.faction==='heg'&&!s.struct&&s!==g)s.alive=false;
    joss.x=relay.x-1400;joss.y=relay.y;joss.vh=joss.h=0;joss.vx=200;joss.vy=0;
    g.x=joss.x-300;g.y=joss.y;g.h=g.vh=0;g.vx=200;g.vy=0;g.doctrine='hunt';
    for(const id of ['P2','P3'])by(id).x=500;
    SIM.runFor(1.2);return {joss,g};};
  let {joss,g}=setup();
  out.local=[joss.beh.kind,joss.beh.target,joss.beh.why];
  ({joss,g}=setup());
  const cp0=S().cp,r1=SIM.command('override',{id:'P1'});
  SIM.runFor(1.2);
  out.override=[r1.ok,cp0-S().cp,joss.beh.kind,joss.beh.target,joss.beh.why,S().m.byCommand.override];
  // Recall disengages: withdraw at a burn, toward the extraction point
  const r2=SIM.command('recall',{id:'P1'}),ex=SIM.fn.withdrawPoint(joss),d0=Math.hypot(joss.x-ex.x,joss.y-ex.y);   // the rally point: the jump is jammed
  SIM.runFor(3);
  out.recall=[r2.ok,joss.beh.kind,joss.beh.why,Math.round(d0-Math.hypot(joss.x-ex.x,joss.y-ex.y))>300,S().cp];
  // CP runs out: a command it can't pay for is refused, and nothing is spent
  S().cp=0;out.broke=[SIM.command('support',{id:'P2'}).ok,SIM.commandRefusal('support',{id:'P2'}),S().cp];
  // Reinforcement Request stays disabled without reserves (in the drawer too); the DESIGN OPEN rows too
  S().cp=5;
  f.openDrawer(null);f.syncHud();
  const row=k=>q('#hcCmds [data-cmd="'+k+'"]');
  out.drawer=[document.querySelectorAll('#hcCmds [data-cmd]').length,row('reinforce').getAttribute('aria-disabled'),row('scramble').getAttribute('aria-disabled'),row('hack').getAttribute('aria-disabled'),
    SIM.command('reinforce',null).ok,S().cp,q('#hcCmds .hc-cmd--abort')!==null,!!document.querySelector('#hcCmds .hc-cmd:last-child.hc-cmd--abort')];
  // command-first: pick Emergency Support, then click a ship on the map
  by('P2').segs.F.val=0;
  row('support').click();
  out.cmdFirst=[H.A.cmdArm];
  f.mapClick({x:by('P2').x,y:by('P2').y});
  out.cmdFirst.push(by('P2').segs.F.val===by('P2').segs.F.max,S().cp,H.A.drawer);
  // target-first: right-click a ship: only the ship commands; a place: only Decoy
  f.openDrawer({id:'P3'});f.syncHud();
  out.tgtFirst=[[...document.querySelectorAll('#hcCmds .hc-cmds__list [data-cmd]')].map(e=>e.dataset.cmd).join()];
  f.openDrawer({x:3000,y:3000});f.syncHud();
  out.tgtFirst.push([...document.querySelectorAll('#hcCmds .hc-cmds__list [data-cmd]')].map(e=>e.dataset.cmd).join());
  q('#hcCmds [data-cmd="decoy"]').click();
  out.tgtFirst.push(S().decoys.length,S().cp);
  // Decoy and Recon do something: a Hegemony pilot near the decoy chases it; recon times out
  g.alive=true;g.x=3500;g.y=3000;SIM.runFor(1);
  out.decoy=[g.beh.kind];
  out.recon=[SIM.command('recon',null).ok,S().reconUntil>S().t];
  // Abort ends the mission, free, and only after the confirm click
  S().cp=0;f.openDrawer(null);f.syncHud();
  q('#hcCmds [data-cmd="abort"]').click();const armed=!S().over;
  q('#hcCmds [data-cmd="abort"]').click();
  out.abort=[armed,S().over&&S().over.outcome,H.phase,!document.getElementById('hcEnd').hidden];
  // 8. doctrine: MANUAL never fires by itself; EMERG fires only under its trigger; AUTO under either
  f.load('hc1_nightfall',0,32);
  for(const s of S().ships)if(s.faction==='heg'&&!s.struct)s.alive=false;
  const p=by('P2');   // Wren: regular, Boost Shields / Lock In / Boost
  out.abil=SIM.abilitiesOf('P2').join();
  SIM.setDoctrine('P2','lockin','MANUAL');SIM.setDoctrine('P2','shields','EMERG');
  p.pilot.cool=30;   // SHAKEN: Lock In's AUTO trigger
  p.segs.F.val=2;p.segs.R.val=2;p.hitT=S().t;   // shields low and under fire: Boost Shields' AUTO trigger, not its emergency one
  SIM.runFor(1);
  const fired=()=>(p.abLog||[]).filter(e=>e.k!=='boost').map(e=>e.k+':'+e.how).join();
  out.doc=[fired()];
  p.segs.F.val=0;p.segs.R.val=0;p.hitT=S().t+0.5;   // shields gone and still hit: the emergency trigger
  SIM.step();
  out.doc.push(fired());
  const m=SIM.useAbility('P2','lockin');out.doc.push(m.ok,fired(),Math.round(p.pilot.cool));
  SIM.setDoctrine('P2','lockin','AUTO');p.pilot.cool=30;p.abCd.lockin=0;SIM.runFor(0.6);out.doc.push(fired());
  // T3 proof: Wren's pin, answered three ways from the same moment, plays out three ways
  const toPin=()=>{f.load('hc1_nightfall',0,7);let n=0;while(!by('P2').emerg&&n++<4000)SIM.step();return S().tick;};
  const tk=toPin();
  out.pin=[tk<4000,by('P2').emerg&&by('P2').emerg.kind,S().events.filter(e=>e.kind==='emergency').length];
  // the alert in the feed, with its answers; the pilot panel from VIEW, hazard-tinted, the recommended answer gold
  f.syncHud();
  const ev=S().events.find(e=>e.kind==='emergency');
  out.alert=[[...document.querySelectorAll('#hcFeed .hc-ev.is-live [data-resp]')].map(b=>b.dataset.resp).join()];
  f.viewEvent(ev.id);f.syncHud();
  out.alert.push(H.A.panel,q('#hcPilot').classList.contains('is-emerg'),(q('#hcPilot .sr-btn--primary')||{}).dataset&&q('#hcPilot .sr-btn--primary').dataset.resp,
    document.querySelectorAll('#hcPilot .hc-abil').length,document.querySelectorAll('#hcPilot .hc-seg__b.is-on').length);
  const branch=(how)=>{
    toPin();const w=by('P2');
    if(how==='override')q('#hcPilot')&&(f.openPilot('P2'),f.syncHud(),q('#hcPilot [data-resp="override"]').click());
    else f.respond('P2',how);
    const cp=S().cp;SIM.runFor(1);
    const helper=S().ships.find(s=>s.helping&&s.helping.id==='P2');
    SIM.runFor(7);
    return {hash:SIM.stateHash(),cp,kind:w.beh&&w.beh.kind,why:w.beh&&w.beh.why,alive:w.alive,away:Math.round(Math.hypot(w.x-SIM.fn.extractPoint().x,w.y-SIM.fn.extractPoint().y)),
      helper:helper?helper.id+':'+helper.beh.kind+':'+helper.beh.why:null,resp:(S().m.emergencies.find(e=>e.ship==='P2')||{}).resp,answered:S().m.alerts[0]&&S().m.alerts[0].answered};
  };
  const bo=branch('override'),br=branch('recall'),bw=branch('wingmate');
  out.branches={bo,br,bw};
  return out;
 });
 ok(hc3.local[0]==='engage'&&hc3.local[1]==='E2'&&hc3.local[2]==='self-defence','HC 5: without Override the guard on Joss\'s tail is the better local target '+JSON.stringify(hc3.local));
 ok(hc3.override[0]&&hc3.override[1]===1&&hc3.override[2]==='engage'&&hc3.override[3]==='relay'&&hc3.override[5]===1,'HC 5: Override redirects to the designation and costs 1 CP '+JSON.stringify(hc3.override));
 ok(hc3.recall[0]&&hc3.recall[1]==='withdraw'&&hc3.recall[2]==='command: recall'&&hc3.recall[3],'HC 5: Recall disengages '+JSON.stringify(hc3.recall));
 ok(hc3.broke[0]===false&&/command points/.test(hc3.broke[1])&&hc3.broke[2]===0,'HC 5: no CP, no command '+JSON.stringify(hc3.broke));
 ok(hc3.drawer[0]===9&&hc3.drawer[1]==='true'&&hc3.drawer[2]==='true'&&hc3.drawer[3]==='true'&&hc3.drawer[4]===false&&hc3.drawer[5]===5&&hc3.drawer[6]&&hc3.drawer[7],'HC 5: the drawer, Reinforcement Request disabled without reserves, Abort last '+JSON.stringify(hc3.drawer));
 ok(hc3.cmdFirst[0]==='support'&&hc3.cmdFirst[1]&&hc3.cmdFirst[2]===4&&hc3.cmdFirst[3]===false,'HC T3: command first, then the target '+JSON.stringify(hc3.cmdFirst));
 ok(hc3.tgtFirst[0]==='override,recall,support'&&hc3.tgtFirst[1]==='decoy'&&hc3.tgtFirst[2]===1&&hc3.tgtFirst[3]===3,'HC T3: target first (right-click) '+JSON.stringify(hc3.tgtFirst));
 ok(hc3.decoy[0]==='decoyed'&&hc3.recon.every(Boolean),'HC T3: Decoy draws a pilot; Recon runs '+JSON.stringify([hc3.decoy,hc3.recon]));
 ok(hc3.abort[0]&&hc3.abort[1]==='aborted'&&hc3.abort[2]==='OVER'&&hc3.abort[3],'HC 5: Abort (free, confirmed) ends the mission '+JSON.stringify(hc3.abort));
 ok(hc3.abil==='shields,lockin,boost','HC 8: Wren\'s abilities '+hc3.abil);
 ok(hc3.doc[0]===''&&hc3.doc[1]==='shields:emerg'&&hc3.doc[2]===true&&hc3.doc[3]==='shields:emerg,lockin:manual'&&hc3.doc[4]>=60&&/lockin:want$/.test(hc3.doc[5]),'HC 8: MANUAL never auto-fires; EMERG only under its trigger '+JSON.stringify(hc3.doc));
 ok(hc3.pin[0]&&hc3.pin[1]==='pinned'&&hc3.pin[2]===1,'HC T3: Wren is pinned in hc1 '+JSON.stringify(hc3.pin));
 ok(/override/.test(hc3.alert[0])&&/wingmate/.test(hc3.alert[0])&&hc3.alert[1]==='P2'&&hc3.alert[2]&&hc3.alert[3]&&hc3.alert[4]===3&&hc3.alert[5]===3,'HC T3: the alert, the pilot panel '+JSON.stringify(hc3.alert));
 const B=hc3.branches;
 ok(B.bo.hash!==B.br.hash&&B.br.hash!==B.bw.hash&&B.bo.hash!==B.bw.hash,'HC T3: three answers, three outcomes '+JSON.stringify(B));
 ok(B.br.kind==='withdraw'&&B.br.cp===3&&B.bo.cp===4&&B.bw.cp===5&&B.bw.helper&&/engage|escort/.test(B.bw.helper)&&B.bo.why==='command: override'||B.bo.alive===false,'HC T3: Recall withdraws (2 CP), Override holds (1 CP), a wingmate goes free '+JSON.stringify(B));
 ok(B.bo.resp==='override'&&B.br.resp==='recall'&&B.bw.resp==='wingmate'&&typeof B.bw.answered==='number','HC T3: each answer is recorded with its time '+JSON.stringify([B.bo.resp,B.br.resp,B.bw.resp,B.bw.answered]));
 /* ---------- High Command T4: leaders, metrics, the keys, the scenarios, the panel ---------- */
 const hcLines=[];pg3.on('console',m=>{if(m.text().startsWith('ARENA_METRICS '))hcLines.push(m.text().slice(14));});
 const hc4=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id),q=s=>document.querySelector('#arHc '+s);
  const key=(k,o)=>{const ev=new KeyboardEvent('keydown',Object.assign({key:k,code:/^[1-9]$/.test(k)?'Digit'+k:'',bubbles:true,cancelable:true},o||{}));window.dispatchEvent(ev);};
  // 9. leader loss: the wing's cohesion drops to LEAD_LOSS, and the next highest level takes the lead after PROMOTE_SECS
  f.load('hc1_nightfall',0,41);
  const dag=S().wings[0],lead0=dag.leader,T0=Object.assign({},SIM.fn.tacticOf(dag));
  const killer=S().ships.find(s=>s.faction==='heg'&&!s.struct),tgt=by(lead0);
  tgt.hull=-1;SIM.fn.kill(tgt,killer);   // the sim's own path: destroyShip, and the wing loses its leader
  const T1=SIM.fn.tacticOf(dag);
  out.lead=[lead0,dag.leader,dag.cohesion,SIM.fn.LEAD_LOSS_(),T1.space!==T0.space||T1.form!==T0.form];
  SIM.runFor(SIM.fn.PROMOTE_SECS_()-0.5);
  out.lead.push(dag.leader);
  SIM.runFor(1);
  const nl=by(dag.leader),live=SIM.fn.wingShips(dag);
  out.lead.push(dag.leader,dag.cohesion,nl&&live.every(s=>s.pilot.level<=nl.pilot.level),S().events.some(e=>e.kind==='leader'),nl&&nl.lead===true);
  // the keys: Space pauses and plays; 1–4 set the speed; Q / E cycle wings and open the tray; with the tray open,
  // a digit presses an order icon and Shift+digit a tactic; F follows; Tab steps the feed; Esc closes
  f.load('hc1_nightfall',0,42);
  out.keys=[H.A.speed];
  key(' ');out.keys.push(H.A.speed);key(' ');out.keys.push(H.A.speed);
  key('4');out.keys.push(H.A.speed);key('1');out.keys.push(H.A.speed);
  key('e');out.keys.push(H.A.sel,H.A.tray);key('e');out.keys.push(H.A.sel);key('q');out.keys.push(H.A.sel);
  key('7');out.keys.push(S().wings.find(w=>w.id===H.A.sel).order.kind);   // 7: Hold (no target)
  key('2',{shiftKey:true});out.keys.push(S().wings.find(w=>w.id===H.A.sel).tactic);   // Shift+2: Spread
  key('1');out.keys.push(H.A.arm);   // 1: Attack, armed for its target
  key('Escape');out.keys.push(H.A.arm,H.A.tray);key('Escape');out.keys.push(H.A.tray);
  key('f');out.keys.push(H.A.follow);
  key('3');out.keys.push(H.A.speed);
  // the scenarios: hc2 and hc3 load and run; hc3's variants set the command points
  f.showPicker();
  out.picker=[...document.querySelectorAll('#hcPicker [data-load="hc3_meltdown"]')].map(b=>b.textContent).join();
  q('#hcPicker [data-load="hc3_meltdown"][data-variant="2"]').click();
  out.hc3=[S().scn.id,S().variantLabel,S().cp,S().wings.map(w=>w.id+':'+w.ships.length).join(),S().ships.filter(s=>s.marines).length,!!by('vex')&&by('vex').flagship,S().rules.map(r=>r.rule).join()];
  f.load('hc3_meltdown',1,1);out.hc3.push(S().cp);
  f.load('hc2_lastlight',0,1);
  out.hc2=[S().scn.id,by('lastlight').faction,by('lastlight').struct,S().waves.length,S().rules.map(r=>r.rule).join()];
  SIM.runFor(25);
  out.hc2.push(S().waves[0].spawned,S().ships.filter(s=>s.faction==='heg'&&s.doctrine==='raid').length,S().ships.filter(s=>s.doctrine==='raid'&&s.beh&&s.beh.target==='lastlight').length>0);
  // a full hc3 brawl, hands on the keyboard at speed 3: orders and tactics by keys, a command, through the driver
  f.load('hc3_meltdown',0,9);
  let now=1000;const fr=()=>{now+=16;f.frame(now);};
  const t0b=performance.now();let frames=0;
  key('4');
  key('e');key('9');(q('#hcTray [data-tchip]')||{click(){}}).click();   // Hammer: Board, the reactor
  key('e');key('1');(q('#hcTray [data-tchip="0"]')||{click(){}}).click();   // Lance: Attack, the first chip
  key('3',{shiftKey:true});   // Lance: Screen
  for(let i=0;i<1200&&!S().over;i++){fr();frames++;
    if(i===300){key(' ');f.openDrawer(null);q('#hcCmds [data-cmd="recon"]').click();key(' ');}
    if(i===600){key('Tab');}}
  out.brawl=[S().t>=55,frames,+((performance.now()-t0b)/frames).toFixed(2),S().m.orders,S().m.tactics,S().m.cpSpent,H.A.pauses>=1,S().wings.map(w=>w.order.kind).join()];
  // 10. metrics: the engagement record carries every §7 field; abort to close it out
  S().cp=Math.max(S().cp,0);
  f.openDrawer(null);q('#hcCmds [data-cmd="abort"]').click();q('#hcCmds [data-cmd="abort"]').click();
  const rec=H.A.metrics[H.A.metrics.length-1];
  out.rec=rec;
  // the panel: every number a slider in a group, a slider moves its constant, the tactic weights are on it
  f.showPicker();f.load('hc1_nightfall',0,1);
  const keys=Object.keys(SIM.TUNE),sl=[...document.querySelectorAll('#hcPanelBody [data-tune]')].map(e=>e.dataset.tune);
  const sp=q('#hcPanelBody [data-tune="T_spread_space"]');
  sp.value='5';sp.dispatchEvent(new Event('input',{bubbles:true}));
  out.panel=[keys.length,keys.every(k=>sl.includes(k)),[...document.querySelectorAll('#hcPanelBody details.hc-sec summary')].map(e=>e.textContent).join(),SIM.HC_TACTICS.spread.space,
    keys.filter(k=>k.startsWith('T_')).length,document.querySelectorAll('#hcPanelBody .hc-keys .sr-kbd').length];
  q('#hcPanelBody [data-act="defaults"]').click();out.panel.push(SIM.HC_TACTICS.spread.space);
  return out;
 });
 ok(hc4.lead[1]===null&&hc4.lead[2]===hc4.lead[3]&&hc4.lead[4],'HC 9: losing the leader drops cohesion to LEAD_LOSS '+JSON.stringify(hc4.lead));
 ok(hc4.lead[5]===null&&hc4.lead[6]&&hc4.lead[6]!==hc4.lead[0]&&hc4.lead[7]===1&&hc4.lead[8]&&hc4.lead[9]&&hc4.lead[10],'HC 9: promotion after PROMOTE_SECS, to the highest level '+JSON.stringify(hc4.lead));
 ok(JSON.stringify(hc4.keys)===JSON.stringify([0,2,0,3,0,'dagger','dagger','amber','dagger','hold','spread','attack',null,'dagger',null,true,2]),'HC T4: the keys '+JSON.stringify(hc4.keys));
 ok(hc4.picker==='CP 5,CP 3,CP 7'&&hc4.hc3[0]==='hc3_meltdown'&&hc4.hc3[1]==='CP 7'&&hc4.hc3[2]===7&&hc4.hc3[3]==='hammer:4,lance:4'&&hc4.hc3[4]===2&&hc4.hc3[5]&&hc4.hc3[6]==='bringdown'&&hc4.hc3[7]===3,'HC T4: hc3 and its CP variants '+JSON.stringify([hc4.picker,hc4.hc3]));
 ok(hc4.hc2[0]==='hc2_lastlight'&&hc4.hc2[1]==='reb'&&hc4.hc2[2]&&hc4.hc2[3]===3&&hc4.hc2[4]==='guardian'&&hc4.hc2[5]&&hc4.hc2[6]===3&&hc4.hc2[7],'HC T4: hc2 (waves of raiders on the station) '+JSON.stringify(hc4.hc2));
 ok(hc4.brawl[0]&&hc4.brawl[2]<60&&hc4.brawl[3]>=2&&hc4.brawl[4]>=1&&hc4.brawl[5]===1&&hc4.brawl[6]&&hc4.brawl[7]==='board,attack','HC T4: an hc3 brawl on the keys at speed 3 '+JSON.stringify(hc4.brawl));
 const R=hc4.rec||{};
 const need=['ruleset','scenario','variant','seed','orders','tactics','cp','pauses','rules','emergencies','outcome','shipsLost','firstOrderAfterAlert','orderRate','pauseRate'];
 ok(need.every(k=>k in R)&&R.ruleset==='hc'&&R.outcome==='aborted'&&typeof R.orders.count==='number'&&R.orders.byType&&R.cp.byCommand&&R.cp.byCommand.recon===1&&typeof R.pauses.pausedSecs==='number'&&typeof R.pauses.realSecs==='number'&&
   typeof R.rules.triggers==='number'&&Array.isArray(R.emergencies.list)&&R.emergencies.responses&&Array.isArray(R.firstOrderAfterAlert.each)&&typeof R.orderRate==='number'&&typeof R.pauseRate.perMin==='number','HC 10: the metrics record '+JSON.stringify(R).slice(0,400));
 ok(hcLines.some(l=>{try{const x=JSON.parse(l);return x.ruleset==='hc'&&x.outcome==='aborted';}catch(e){return false;}}),'HC 10: the record reaches the console as ARENA_METRICS');
 ok(hc4.panel[1]&&/Run,Flight,Fighting,Orders,Hegemony,Leaders,Rules,Morale,Commands/.test(hc4.panel[2])&&/Tactics/.test(hc4.panel[2])&&hc4.panel[3]===5&&hc4.panel[4]===42&&hc4.panel[5]===8&&hc4.panel[6]===3.4,'HC T4: the panel '+JSON.stringify(hc4.panel));
 await ctx3.close();
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r,sb,sc,drift,b4,hud,fly,feel,mom,ai,b5,hc,hc2,hc3,hc4},null,0));
 if(fails.length){console.error('arena-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('arena-smoke OK');
})();
