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
     9 leader loss   10 metrics   T4: the keys, hc2 and hc3 (and its CP variants), the grouped panel, an hc3 brawl at speed 3
   High Command playtest 1 (docs/ARENA-HC-FEEDBACK-1.md, DESIGN_BLOCKERS C-69):
     F1: the scale (speed, fighting range, weapon range, the 4 × map with the layout scaled, spacing), Jump Out and
         Leave now, the tray and pilot panel above the roster, Commands bottom right opening upward, Copy settings
     F2: the corner-speed turn model (weak slow turns, turning bleeds speed, wider turns), a duel without a knife fight
     F3: attack runs (run, extend, turn back), stalemate and six break-offs, the reworked tactics, AUTO and its choices
     F4: speech bubbles (2 s, one a ship, four on screen, rate-limited, your pilots only, the feed kept)
   The visual pass (DESIGN_BLOCKERS C-73; game/art/sr-space-fx.js): V1 the station art, the panel's FX group, drawing at
     three zooms on and off, the sim's moments as effects, nothing stale, boarding links, round 2 (C-74: the hurt read,
     the death spiral, the lock marks), reduced motion, determinism
   Type 3.5: High Command Hands Off (docs/ARENA-HC35-HANDOFF.md §11; game/js/sim-hc35.js and arena-hc35.js, through
     DBGarena.hc35), in its own context: HC35 1 High Command byte-identical with the hooks (hash baselines), no campaign
     save; HC35 2 the loop by DOM (board, dossier, the four steps, Launch, the mission, the debrief, Plan again);
     HC35 5 bombs and subsystems, the drift and the planet; 6 each primary from a scripted setup; 7 the phases;
     HC35 3 the modifiers and Dig deeper; P3 the leaders' plan and critiques, two plans → two fights, a Secondary, 8 Hold
     for My Signal, Weapons Tight, Preservation and OFF PLAN */
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
  f.run(60);   // 4 × map (C-69): the rally point is a long way from the jump
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
 ok(JSON.stringify(hc.rulesets.slice(0,3))==='["SR V2 Combat","SB Test","Type 3: High Command"]','HC 1: three rulesets (Type 3.5 is fourth, C-75) '+JSON.stringify(hc.rulesets));
 ok(!hc.v2List.some(id=>id.startsWith('hc'))&&!hc.sbList.some(id=>id.startsWith('hc')),'HC 1: HC scenarios stay off the v2 and SB lists '+JSON.stringify([hc.v2List,hc.sbList]));
 ok(hc.hcActive.join()==='hc,true,true,true'&&hc.hcList.join()==='hc1_nightfall,hc2_lastlight,hc3_meltdown','HC 1: picking High Command opens its own list '+JSON.stringify([hc.hcActive,hc.hcList]));
 ok(hc.loaded[0]==='LIVE'&&hc.loaded[1]==='hc1_nightfall'&&hc.loaded[2]==='dagger:3,amber:2'&&hc.loaded[3]&&hc.loaded[4],'HC 1: hc1_nightfall loads with its wings '+JSON.stringify(hc.loaded));
 ok(hc.hud[0]==='4:00'&&hc.hud[1]===3&&hc.hud[2]===2&&hc.hud[3]===5&&hc.hud[4]===4&&hc.hud[5]<=1&&hc.hud[6],'HC HUD: clock, objectives, roster, time controls, at most one gold primary (C-70: none until Jump Out), paused on load '+JSON.stringify(hc.hud));
 ok(hc.tray[0]&&hc.tray[1]===9&&['attack','escort','withdraw'].every(k=>hc.tray[2].split(',').includes(k))&&hc.tray[3],'HC T1: the wing tray '+JSON.stringify(hc.tray));
 ok(hc.attack[1]<hc.attack[0]*0.5,'HC T1: Attack closes on the relay '+JSON.stringify(hc.attack));
 ok(hc.escort<2400,'HC T1: Escort stays with the lark '+hc.escort);   // the 4 × map (C-69)
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
  out.tray=[[...document.querySelectorAll('#hcTray [data-order]:not([aria-disabled="true"])')].length,[...document.querySelectorAll('#hcTray [data-tactic]:not([aria-disabled="true"])')].length-1,
    q('#hcTray [data-order="board"]').getAttribute('aria-disabled'),f.tipFor('order:attack').line,/Spacing ×3\.4,/.test(f.tipFor('tactic:spread').line)];
  return out;
 });
 ok(hc2.persist[0]==='attack'&&hc2.persist[1]==='mote'&&hc2.persist[2]>=0.7&&hc2.persist[4]>=30,'HC 2: Attack persists 30 s at speed 3 '+JSON.stringify(hc2.persist));
 ok(hc2.tactic[1]>hc2.tactic[0]*1.5,'HC 3: Spread disperses more than Tight '+JSON.stringify(hc2.tactic));
 ok(hc2.pres[0]&&hc2.pres[1]!=null&&hc2.pres[1]<=hc2.pres[2]&&hc2.pres[3]>=1&&hc2.pres[4]===1&&hc2.pres[5],'HC 4: Preservation flips within one think tick '+JSON.stringify(hc2.pres));
 ok(hc2.rulesUi[0]===5&&hc2.rulesUi[1]==='PRESERVATION 30% · ALL|GUARDIAN · AMBER|SAVIOUR CONVOY LARK · ALL'&&hc2.rulesUi[2]===2&&hc2.rulesUi[3]==='guardian,saviour','HC T2: the rules panel '+JSON.stringify(hc2.rulesUi));
 ok(hc2.intercept.every(Boolean)&&hc2.defend[0]&&hc2.defend[1]&&hc2.defend[2]<3000,'HC T2: Intercept and Defend '+JSON.stringify([hc2.intercept,hc2.defend]));
 ok(hc2.hold[0]<2500&&hc2.hold[1]&&hc2.regroup,'HC T2: Hold and Regroup '+JSON.stringify([hc2.hold,hc2.regroup]));
 ok(hc2.capture[0]==='reb'&&hc2.capture[1]==='done'&&hc2.capture[2]===4&&hc2.capture[3],'HC T2: Capture takes the satellite for +1 CP '+JSON.stringify(hc2.capture));
 ok(hc2.board[0]===false&&hc2.board[1]==='Reactor'&&hc2.board[2]&&hc2.board[3]&&hc2.board[4]==='done','HC T2: Board needs marines, then boards '+JSON.stringify(hc2.board));
 ok(hc2.morale.join()==='EAGER,STEADY,SHAKEN,PANICKED','HC T2: the morale ladder '+hc2.morale);
 ok(hc2.panic[0]&&/flee|freeze/.test(hc2.panic[1])&&hc2.panic[2]&&hc2.panic[3]===1&&/Petra is panicking/.test(hc2.panic[4]),'HC T2: panic is an emergency '+JSON.stringify(hc2.panic));
 ok(hc2.assess,'HC T2: every pilot has an assessment');
 ok(hc2.feed[0]>=3&&hc2.feed[1]>=1&&/kill|loss|emergency|rule/.test(hc2.feed[2])&&hc2.feed[3]<5&&hc2.feed[4]&&(hc2.feed[5]===0||hc2.feed[6]===hc2.feed[5]-1),'HC T2: the feed, VIEW and Tab '+JSON.stringify(hc2.feed));
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
  SIM.runFor(8);   // the turn back takes longer under the corner-speed model (C-69)
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
 ok(hc3.abil==='shields,lockin,chaff,boost','HC 8: Wren\'s abilities (chaff for everyone since C-72) '+hc3.abil);
 ok(hc3.doc[0]===''&&hc3.doc[1]==='shields:emerg'&&hc3.doc[2]===true&&hc3.doc[3]==='shields:emerg,lockin:manual'&&hc3.doc[4]>=60&&/lockin:want$/.test(hc3.doc[5]),'HC 8: MANUAL never auto-fires; EMERG only under its trigger '+JSON.stringify(hc3.doc));
 ok(hc3.pin[0]&&hc3.pin[1]==='pinned'&&hc3.pin[2]===1,'HC T3: Wren is pinned in hc1 '+JSON.stringify(hc3.pin));
 ok(/override/.test(hc3.alert[0])&&/wingmate/.test(hc3.alert[0])&&hc3.alert[1]==='P2'&&hc3.alert[2]&&hc3.alert[3]&&hc3.alert[4]===4&&hc3.alert[5]===4,'HC T3: the alert, the pilot panel (with Chaff, C-72) '+JSON.stringify(hc3.alert));
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
  key('3',{shiftKey:true});out.keys.push(S().wings.find(w=>w.id===H.A.sel).tactic);   // Shift+3: Spread (AUTO is first, C-69)
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
  out.hc2.push(S().waves[0].spawned,S().ships.filter(s=>s.faction==='heg'&&s.doctrine==='raid').length,S().ships.filter(s=>s.doctrine==='raid'&&s.beh&&(s.beh.target==='lastlight'||s.hegRole)).length>0);   // C-72: or split into a lure and a strike
  // a full hc3 brawl, hands on the keyboard at speed 3: orders and tactics by keys, a command, through the driver
  f.load('hc3_meltdown',0,9);
  let now=1000;const fr=()=>{now+=16;f.frame(now);};
  const t0b=performance.now();let frames=0;
  key('4');
  key('e');key('9');(q('#hcTray [data-tchip]')||{click(){}}).click();   // Hammer: Board, the reactor
  key('e');key('1');(q('#hcTray [data-tchip="0"]')||{click(){}}).click();   // Lance: Attack, the first chip
  key('4',{shiftKey:true});   // Lance: Screen
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
 /* ---------- High Command playtest 1, F1 ---------- */
 const f1=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id),q=s=>document.querySelector('#arHc '+s),R=el=>el.getBoundingClientRect();
  f.load('hc1_nightfall',0,51);
  const T=SIM.TUNE,c=SIM.fn.wingCentre(S().wings[0]);
  out.scale=[T.SPEED_SCALE.get(),T.ENGAGE_FRAC.get(),T.HC_MAP.get(),SIM.W,SIM.H,Math.round(c.x),Math.round(c.y),Math.round(SIM.fn.capsOf(by('P1')).vMax),by('relay').x];
  T.RANGE_MULT.set(1.5);f.load('hc1_nightfall',0,51);out.range=[SIM.fn.gunRange(by('P1'))];T.RANGE_MULT.set(1);f.load('hc1_nightfall',0,51);out.range.push(SIM.fn.gunRange(by('P1')));
  // spacing: a wing re-forming keeps its personal space
  for(const s of S().ships)if(s.faction==='heg'&&!s.struct)s.alive=false;
  f.issue('dagger','regroup');SIM.runFor(12);
  let mind=1e9;const dg=SIM.fn.wingShips(S().wings[0]);for(const a of dg)for(const b of dg)if(a!==b)mind=Math.min(mind,Math.hypot(a.x-b.x,a.y-b.y));
  out.space=[Math.round(mind),T.SEP_R.get(),T.FORM_GAP.get()];
  // the HUD: the tray above its wing's card, the pilot panel above its tile, Commands bottom right opening upward
  f.selectWing('amber',true);f.syncHud();
  const tr=R(q('#hcTray')),card=R(q('#hcRoster [data-wing="amber"]'));
  const roR=R(q('#hcRoster'));   // C-71: the wing cards are a column in the bottom-left corner; the tray and the pilot panel open beside it
  out.tray=[!q('#hcTray').hidden,tr.left>=roR.right-1,tr.bottom<=card.bottom+1&&tr.bottom>card.top,roR.left-R(q('#hcStage')).left<20];
  f.openPilot('P4');f.syncHud();
  const pp=R(q('#hcPilot')),tile=R(q('#hcRoster [data-ship="P4"]'));
  out.pilot=[!q('#hcPilot').hidden,pp.left>=roR.right-1,pp.bottom<=tile.bottom+1&&pp.bottom>tile.top-200,q('#hcTray').hidden];
  // the commands bar (C-70: C-69's COMMANDS button bottom right gave way to it): fixed, bottom centre between the
  // wings, with the command points; the time controls under the clock
  const dr=R(q('#hcCmds')),tm=R(q('#hcTime')),ck=R(q('#hcClock')),stg=R(q('#hcStage')),wDg=R(q('#hcRoster [data-wing="dagger"]')),wAm=R(q('#hcRoster [data-wing="amber"]'));
  out.cmds=[!q('#hcCmds').hidden,dr.left>=Math.max(wDg.right,wAm.right)-1&&wAm.top>=wDg.bottom-1,stg.bottom-dr.bottom<40,!!q('#hcCmds #hcCp'),tm.top>=ck.bottom-1,Math.abs((tm.left+tm.right)/2-(ck.left+ck.right)/2)<4,!q('#hcCmdBtn')];
  // Jump Out: once the primaries are done, a gold button (COMMANDS steps back); every wing withdraws; complete when the last ship jumps
  out.jump=[SIM.jumpOutState()===null,!q('#hcObj [data-act="jumpout"]')];
  by('relay').alive=false;by('relay').hull=0;for(const o of S().objectives)if(o.primary)o.state='done';
  f.syncHud();
  const go=q('#hcObj [data-act="jumpout"]');
  out.jump.push(!!go,go&&go.classList.contains('sr-btn--primary'),!q('#hcCmds .sr-btn--primary'),[...document.querySelectorAll('#arHc .sr-btn--primary')].filter(e=>e.offsetParent).length);
  go.click();
  out.jump.push(S().wings.map(w=>w.order.kind).join(),!!q('#hcObj .hc-jump__prog'));
  SIM.runFor(150);
  out.jump.push(S().over&&S().over.outcome,S().over&&S().over.how,S().over&&S().over.lost,S().ships.filter(s=>s.jumped).length);
  // Leave now: ends at once; whoever hasn't jumped is lost
  f.load('hc1_nightfall',0,52);
  by('relay').alive=false;by('relay').hull=0;for(const o of S().objectives)if(o.primary)o.state='done';f.syncHud();
  const alive=S().ships.filter(s=>s.alive&&s.faction==='reb'&&!s.struct).length;
  q('#hcObj [data-act="leavenow"]').click();
  out.leave=[S().over&&S().over.outcome,S().over&&S().over.leftBehind,alive,S().over&&S().over.lost,H.phase];
  // Copy settings: every panel number in one line
  f.load('hc1_nightfall',0,1);
  const j=JSON.parse(f.copySettings());
  out.copy=[Object.keys(j).length===Object.keys(SIM.TUNE).length,j.SPEED_SCALE,!q('#hcEnd').hidden,!!q('#hcEnd textarea')];
  q('#hcEnd [data-act="closewin"]').click();
  return out;
 });
 ok(f1.scale[0]===4&&f1.scale[1]===1&&f1.scale[2]===16&&f1.scale[3]===67200&&f1.scale[4]===48000&&Math.abs(f1.scale[5]-27400)<500&&Math.abs(f1.scale[6]-22700)<600&&f1.scale[7]===1000&&f1.scale[8]===36800,'F1: the scale '+JSON.stringify(f1.scale));
 ok(f1.range[0]===1350&&f1.range[1]===900,'F1: weapon range × on restart '+JSON.stringify(f1.range));
 ok(f1.space[0]>=f1.space[1]*0.6,'F1: ships keep their personal space '+JSON.stringify(f1.space));
 ok(f1.tray.every(Boolean),'F1, C-71: the order tray opens beside its wing card '+JSON.stringify(f1.tray));
 ok(f1.pilot.every(Boolean),'F1, C-71: the pilot panel opens beside its tile '+JSON.stringify(f1.pilot));
 ok(f1.cmds.every(Boolean),'F1, C-71: Commands fixed at the bottom right of the wing cards, the time controls under the clock '+JSON.stringify(f1.cmds));
 ok(f1.jump[0]&&f1.jump[1]&&f1.jump[2]&&f1.jump[3]&&f1.jump[4]&&f1.jump[5]===1&&f1.jump[6]==='withdraw,withdraw'&&f1.jump[7]&&f1.jump[8]==='won'&&f1.jump[9]==='done'&&f1.jump[10]===0&&f1.jump[11]===6,'F1: Jump Out completes the mission '+JSON.stringify(f1.jump));
 ok(f1.leave[0]==='won'&&f1.leave[1]===f1.leave[2]&&f1.leave[3]===f1.leave[2]&&f1.leave[4]==='OVER','F1: Leave now ends it, stragglers lost '+JSON.stringify(f1.leave));
 ok(f1.copy.every(Boolean)||f1.copy[1]===4&&f1.copy[0]&&f1.copy[2]&&f1.copy[3],'F1: Copy settings '+JSON.stringify(f1.copy));
 /* ---------- High Command playtest 1, F2: turning ---------- */
 const f2=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id);
  f.load('hc1_nightfall',0,61);
  const tal=by('P1'),crs=by('P4'),c=SIM.fn.capsOf(tal),cc=SIM.fn.capsOf(crs),T=SIM.TUNE;
  // the caps: best at corner speed, much weaker slow, wider fast; the dial still ranks who is nimble
  out.caps=[SIM.fn.turnCap(c,c.vMin)<0.5*c.wc,SIM.fn.turnCap(c,c.vMax)<c.wc,Math.round(c.vc/c.wc),Math.round(T.TURN_SCALE.get()/c.kap),cc.wc<c.wc,T.SLIP_NOSE.get()];
  // a sustained hard turn bleeds speed down from the corner, and never turns faster than the cap allows
  for(const s of S().ships)if(s!==tal)s.alive=false;
  tal.x=8000;tal.y=6000;tal.vh=tal.h=0;tal.vx=c.vc;tal.vy=0;let worst=0;
  for(let i=0;i<80;i++){tal.goal={x:tal.x-Math.cos(tal.vh)*2000,y:tal.y-Math.sin(tal.vh)*2000+5,spd:1};const v=Math.hypot(tal.vx,tal.vy);SIM.fn.fly(tal,0.05);
    worst=Math.max(worst,Math.abs(tal.turnW)-SIM.fn.turnCap(c,Math.max(c.vMin,v))-1e-9);}
  out.bleed=[Math.round(Math.hypot(tal.vx,tal.vy)),Math.round(c.vc),worst<=1e-6];
  // a straight-line ship at top speed asked to turn hard comes down to corner speed, not below (no braking into turns)
  tal.vx=c.vMax;tal.vy=0;tal.vh=0;
  for(let i=0;i<4;i++){tal.goal={x:tal.x,y:tal.y+3000,spd:1};SIM.fn.fly(tal,0.05);}
  out.corner=[Math.round(Math.hypot(tal.vx,tal.vy))>=Math.round(c.vc)*0.9];
  // a duel: a Talon pair against a Mote pair in open space. They meet, pass and come round: no knife fight
  window.DBGarena.fn.addScenario({id:'t_duel',title:'Test: duel',desc:'Smoke test.',rulesets:['hc'],rocks:[],
    wings:[{id:'a',name:'A',at:[3000,3000,0],order:{kind:'attack',target:{type:'class',cls:'mote'}},tactic:'spread',ships:[{cls:'talon',name:'Me',pilot:{preset:'regular'}},{cls:'talon',name:'Me2',pilot:{preset:'regular'}}]}],
    enemies:[{type:'vc-mote-patrol',n:2,name:'Mote',role:'hunt',at:[5200,3000,Math.PI]}],points:{jump:{x:400,y:3000,label:'Jump point'}},extract:'jump',objectives:[],reinforce:{secs:999,edge:'E',force:[]},cp:0});
  f.load('t_duel',0,3);
  const a=S().ships.find(s=>s.faction==='reb'),e=S().ships.find(s=>s.faction==='heg');
  let close=0,n=0,maxD=0;
  for(let k=0;k<40*20;k++){SIM.step();if(!a.alive||!e.alive)break;n++;const d=SIM.fn.dist(a,e);if(d<400)close++;if(S().t>8)maxD=Math.max(maxD,d);}
  out.duel=[n,+(close/Math.max(1,n)).toFixed(2),Math.round(maxD)];
  return out;
 });
 ok(f2.caps[0]&&f2.caps[1]&&Math.abs(f2.caps[2]-f2.caps[3])<=2&&f2.caps[4]&&f2.caps[5]===0.2,'F2: the corner-speed caps '+JSON.stringify(f2.caps));
 ok(f2.bleed[0]<f2.bleed[1]*0.85&&f2.bleed[2],'F2: a sustained hard turn bleeds speed, inside the cap '+JSON.stringify(f2.bleed));
 ok(f2.corner[0],'F2: no braking below corner speed into a turn '+JSON.stringify(f2.corner));
 ok(f2.duel[0]>100&&f2.duel[1]<0.25&&f2.duel[2]>1200,'F2: a duel passes and comes round rather than circling '+JSON.stringify(f2.duel));
 /* ---------- High Command playtest 1, F3: attack runs, break-offs, tactics, AUTO ---------- */
 const f3=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id),q=s=>document.querySelector('#arHc '+s);
  let dn=0;
  const duel=(cls,tac,foes,at)=>{const id='t_run'+(++dn);window.DBGarena.fn.addScenario({id,title:'Test: runs',desc:'Smoke test.',rulesets:['hc'],rocks:[],
    wings:[{id:'a',name:'A',at:[3000,3000,0],order:{kind:'attack',target:{type:'class',cls:'mote'}},tactic:tac,ships:[{cls,name:'One',pilot:{preset:'regular'}},{cls,name:'Two',pilot:{preset:'regular'}}]}],
    enemies:[{type:'vc-mote-patrol',n:foes,name:'Mote',role:'hunt',at:at||[5200,3000,Math.PI]}],points:{jump:{x:400,y:3000,label:'Jump point'}},extract:'jump',objectives:[],reinforce:{secs:999,edge:'E',force:[]},cp:0});
    f.load(id,0,3);};
  // the default tactic is AUTO, in every scenario wing
  f.load('hc1_nightfall',0,71);
  out.auto=[S().wings.map(w=>w.tactic).join()];
  SIM.runFor(1.2);
  out.auto.push(S().wings[0].autoPick);   // Dagger on Relay K-7, a station: Tight runs
  f.syncHud();out.auto.push(q('[data-wing="dagger"] [data-chip="tactic"]').textContent);
  // AUTO's other choices: a lone target → Pincer; hurt → Defensive; a threatened charge → Screen; otherwise Spread
  duel('talon','auto',1);SIM.runFor(1.2);out.auto.push(S().wings[0].autoPick);
  for(const s of SIM.fn.wingShips(S().wings[0]))s.hull=s.maxHull*0.3;S().wings[0].autoSince=-99;SIM.runFor(1.2);out.auto.push(S().wings[0].autoPick);
  duel('talon','auto',3);SIM.runFor(1.2);out.auto.push(S().wings[0].autoPick);
  f.load('hc1_nightfall',0,72);const am=S().wings[1];
  const p5=by('E5');p5.x=by('lark').x+800;p5.y=by('lark').y;am.autoSince=-99;SIM.runFor(1.2);out.auto.push(am.autoPick);
  // the run: a pair of Talons against two Motes cycle run → extend → turn → run, passing through rather than circling
  duel('talon','spread',2);
  const a=by('P1'),seen={},cyc=[];let last=null;
  for(let k=0;k<45*20;k++){SIM.step();if(!a.alive)break;seen[a.mv]=1;if(a.mv!==last){cyc.push(a.mv);last=a.mv;}}
  const passes=cyc.filter((m,i)=>m==='extend'&&cyc[i-1]==='run').length;
  out.run=[Object.keys(seen).sort().join(),passes,cyc.slice(0,8).join('>')];
  // a stalemate: a target kept just off the nose, close, never in the guns → break off within STALE_SECS (+ a think)
  duel('talon','spread',1);
  const me=by('P1'),mo=S().ships.find(s=>s.faction==='heg');by('P2').alive=false;
  me.mv='run';me.mvTarget=mo.id;me.arcT=S().t;me.breakT=null;let broke=null;const t0=S().t;
  for(let k=0;k<200&&broke==null;k++){mo.x=me.x+Math.cos(me.vh+1.3)*600;mo.y=me.y+Math.sin(me.vh+1.3)*600;mo.vx=me.vx;mo.vy=me.vy;mo.h=mo.vh=me.vh+Math.PI;SIM.step();if(me.breakT!=null)broke=+(me.breakT-t0).toFixed(2);}
  out.stale=[broke!=null,broke!=null&&broke<=SIM.TUNE.STALE_SECS.get()+1.5,me.mv];
  // something close on its six: break off at once
  duel('talon','spread',1);
  const me2=by('P1'),mo2=S().ships.find(s=>s.faction==='heg');by('P2').alive=false;
  SIM.runFor(0.1);me2.mv='run';me2.mvTarget=mo2.id;me2.breakT=-99;
  mo2.x=me2.x-Math.cos(me2.vh)*400;mo2.y=me2.y-Math.sin(me2.vh)*400;mo2.h=mo2.vh=me2.vh;
  SIM.step();SIM.step();
  out.six=[me2.breakT>0,me2.mv];
  // Hit and Run harasses: one ship running at a time, and longer extensions than Spread
  const ext=tac=>{duel('talon',tac,1);let both=0,n=0,maxD=0;const [x,y]=[by('P1'),by('P2')],m=S().ships.find(s=>s.faction==='heg');m.doctrine='patrol';
    for(let k=0;k<40*20;k++){SIM.step();if(!x.alive||!y.alive||!m.alive)break;n++;if(x.mv==='run'&&y.mv==='run'&&SIM.fn.dist(x,m)<SIM.fn.gunRange(x)*1.2&&SIM.fn.dist(y,m)<SIM.fn.gunRange(y)*1.2)both++;if(x.mv==='extend')maxD=Math.max(maxD,SIM.fn.dist(x,m));}
    return [+(both/Math.max(1,n)).toFixed(3),Math.round(maxD)];};
  const hr=ext('hitrun'),sp=ext('spread');
  out.harass=[hr[0],hr[1],sp[1]];
  // Pincer: the two halves come in from well apart
  duel('talon','pincer',1);
  const p1=by('P1'),p2=by('P2'),tg=S().ships.find(s=>s.faction==='heg');let sep=null;
  for(let k=0;k<20*20&&sep==null;k++){SIM.step();const r=SIM.fn.gunRange(p1);if(SIM.fn.dist(p1,tg)<r*1.1&&SIM.fn.dist(p2,tg)<r*1.3){const a1=Math.atan2(p1.y-tg.y,p1.x-tg.x),a2=Math.atan2(p2.y-tg.y,p2.x-tg.x);sep=Math.round(Math.abs(Math.atan2(Math.sin(a1-a2),Math.cos(a1-a2)))*180/Math.PI);}}
  out.pincer=[sep];
  // the tray: AUTO first, then the six; the one AUTO picked is marked
  f.load('hc1_nightfall',0,73);SIM.runFor(1.2);f.selectWing('dagger',true);f.syncHud();
  out.tray=[[...document.querySelectorAll('#hcTray [data-tactic]')].map(b=>b.dataset.tactic).join(),q('#hcTray [data-tactic="auto"]').classList.contains('is-set'),q('#hcTray [data-tactic="'+S().wings[0].autoPick+'"]').classList.contains('is-auto')];
  return out;
 });
 ok(f3.auto[0]==='auto,auto'&&f3.auto[1]==='tight'&&f3.auto[2].toUpperCase()==='AUTO · TIGHT','F3: AUTO is the default, and picks Tight on a station '+JSON.stringify(f3.auto));
 ok(f3.auto[3]==='pincer'&&f3.auto[4]==='defensive'&&f3.auto[5]==='spread'&&f3.auto[6]==='screen','F3: AUTO picks Pincer, Defensive, Spread, Screen by the situation '+JSON.stringify(f3.auto));
 ok(/^extend,(pursue,)?run,turn$/.test(f3.run[0])&&f3.run[1]>=2,'F3: attack runs cycle run, extend, turn '+JSON.stringify(f3.run));
 ok(f3.stale[0]&&f3.stale[1]&&f3.stale[2]==='extend','F3: a stalemate breaks off '+JSON.stringify(f3.stale));
 ok(f3.six[0]&&f3.six[1]==='extend','F3: something close on its six breaks it off '+JSON.stringify(f3.six));
 ok(f3.harass[0]<0.02&&f3.harass[1]>f3.harass[2],'F3: Hit and Run harasses, one at a time, extending further '+JSON.stringify(f3.harass));
 ok(f3.pincer[0]!=null&&f3.pincer[0]>=45,'F3: a pincer comes in from well apart '+JSON.stringify(f3.pincer));
 ok(f3.tray[0]==='auto,tight,spread,screen,pincer,hitrun,defensive'&&f3.tray[1]&&f3.tray[2],'F3: the tray\'s tactics '+JSON.stringify(f3.tray));
 /* ---------- High Command playtest 1, F4: speech bubbles ---------- */
 const f4=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id),B=f.BUBBLE_();
  f.load('hc1_nightfall',0,81);SIM.runFor(0.2);f.bubbleTick(1e9);   // the opening callouts, cleared
  const t0=2e9;
  out.say=[SIM.say('P1','Lining up on Relay K-7.','info',true)];
  f.bubbleTick(t0);out.say.push(f.bubbles_().map(b=>b.ship+':'+b.text).join());
  f.bubbleTick(t0+B.MS-1);out.say.push(f.bubbles_().length);
  f.bubbleTick(t0+B.MS+1);out.say.push(f.bubbles_().length,B.MS);
  // one a ship (the newer line), at most four on screen
  SIM.say('P1','First.','info',true);SIM.say('P1','Second.','info',true);f.bubbleTick(t0+3000);
  out.one=f.bubbles_().filter(b=>b.ship==='P1').map(b=>b.text).join();
  for(const id of ['P2','P3','P4','P5'])SIM.say(id,'Here.','info',true);f.bubbleTick(t0+3001);
  out.cap=[f.bubbles_().length,B.MAX];
  // rate-limited unless it matters; only your pilots speak
  SIM.runFor(0.1);
  out.limit=[SIM.say('P2','Again.','info',false),SIM.say('E2','Hegemony chatter.','info',true),SIM.TUNE.BARK_GAP.get()];
  // an emergency is said aloud and still goes in the feed
  f.load('hc1_nightfall',0,82);let n=0;while(!by('P2').emerg&&n++<4000)SIM.step();
  const bk=S().barks.filter(b=>b.ship==='P2'&&b.tone==='hazard');
  f.bubbleTick(t0+10000);
  out.emerg=[bk.length>=1,S().events.some(e=>e.kind==='emergency'&&e.ship==='P2'),f.bubbles_().some(b=>b.ship==='P2'&&b.tone==='hazard')];
  // a fight talks: new targets and kills as it plays
  f.load('hc1_nightfall',0,83);SIM.runFor(40);
  out.talk=[S().barks.length,[...new Set(S().barks.map(b=>b.tone))].sort().join()];
  return out;
 });
 ok(f4.say[0]&&f4.say[1]==='P1:Lining up on Relay K-7.'&&f4.say[2]===1&&f4.say[3]===0&&f4.say[4]===2000,'F4: a line pops up for 2 s '+JSON.stringify(f4.say));
 ok(f4.one==='Second.'&&f4.cap[0]===f4.cap[1]&&f4.cap[1]===4,'F4: one bubble a ship, four on screen '+JSON.stringify([f4.one,f4.cap]));
 ok(f4.limit[0]===false&&f4.limit[1]===false&&f4.limit[2]===4,'F4: rate-limited, your pilots only '+JSON.stringify(f4.limit));
 ok(f4.emerg.every(Boolean),'F4: an emergency is said aloud and kept in the feed '+JSON.stringify(f4.emerg));
 ok(f4.talk[0]>=5,'F4: a fight talks '+JSON.stringify(f4.talk));
 // ---------- G1 (C-70, playtest 2): smooth motion, the convoy at the jump point, the map round the play area ----------
 const g1=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id);
  f.load('hc1_nightfall',0,7);SIM.runFor(20);
  // the map draws each ship between its last two steps: at RA 0 where it was, at 1 where it is
  const s=by('P1');H.A.acc=0;f.frame(performance.now());const a0=f.ipos(s);H.A.acc=SIM.TICK*0.5;
  const RA=Math.max(0,Math.min(1,H.A.acc/SIM.TICK));
  out.lerp=[Math.hypot(s.x-s.px,s.y-s.py)>1,Math.abs(a0.x-s.px)<1e-6||Math.abs(a0.x-s.x)<1e-6,RA];
  // Convoy Lark waits at the jammed jump point; once Relay K-7 falls it lines up and jumps (it orbited for ever)
  SIM.TUNE.SPEED_SCALE.set(4);f.load('hc1_nightfall',0,7);
  const L=by('lark'),jp=S().points.jump;{let k=0;while(L.alive&&L.beh.kind!=='wait'&&k++<2400)SIM.step();}out.lark=[L.beh.kind,Math.round(Math.hypot(L.x-jp.x,L.y-jp.y))];
  SIM.fn.kill(by('relay'),null);let n=0;while(L.alive&&n++<1200)SIM.step();
  out.lark.push(L.jumped,+(n*SIM.TICK/1000).toFixed(1));
  // the map is 8 ×, the scenario's places spread 4 × in its middle; reinforcements come in at the play area's edge
  const Z=SIM.zone;out.map=[SIM.fn.HC_MAP_(),SIM.fn.HC_SPREAD_(),SIM.W,SIM.H,Z.x0,Z.y0,Z.x1,Z.y1,SIM.TUNE.SPEED_SCALE.get()];
  f.load('hc1_nightfall',0,7);const RF=S().reinforce,before=new Set(S().ships.map(x=>x.id));SIM.runFor(RF.secs+0.2);
  const reh=S().ships.filter(x=>!before.has(x.id)&&x.faction==='heg');
  out.reinf=[reh.length>0,reh.every(x=>x.x>Z.x1&&x.x<SIM.W-100&&x.y>Z.y0&&x.y<Z.y1)];
  return out;
 });
 ok(g1.lerp[0]&&g1.lerp[1]&&g1.lerp[2]===0.5,'G1: ships drawn between their last two steps '+JSON.stringify(g1.lerp));
 ok(g1.lark[0]==='wait'&&g1.lark[1]<900&&g1.lark[2]===true&&g1.lark[3]<45,'G1: Convoy Lark jumps once the relay falls '+JSON.stringify(g1.lark));
 ok(g1.map[0]===16&&g1.map[1]===4&&g1.map[2]===67200&&g1.map[3]===48000&&g1.map[4]===25200&&g1.map[5]===18000&&g1.map[6]===42000&&g1.map[7]===30000&&g1.map[8]===4,'G1: the map round the play area '+JSON.stringify(g1.map));
 ok(g1.reinf.every(Boolean),'G1: reinforcements come in off the play area\'s edge '+JSON.stringify(g1.reinf));
 // ---------- G2 (C-70): collisions and not crashing ----------
 const g2=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,T=SIM.TUNE,F=SIM.fn,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id),pool=s=>s.hull+s.arm+F.totalShield(s);
  const place=(s,x,y,h,v)=>{s.x=x;s.y=y;s.h=s.vh=h;s.vx=Math.cos(h)*v;s.vy=Math.sin(h)*v;s.px=x-s.vx*0.05;s.py=y-s.vy*0.05;};
  // head-on: two fighters closing at 1,600 a second, passing through each other within one step
  f.load('hc1_nightfall',0,5);
  const a=by('P1'),e=S().ships.find(x=>x.faction==='heg'&&!x.struct),pa=pool(a),pe=pool(e);
  place(a,9000,9000,0,800);place(e,9010,9002,Math.PI,800);
  F.collideTick();
  out.head=[S().m.collisions,pa-pool(a)>20,pe-pool(e)>20,Math.hypot(a.x-e.x,a.y-e.y)>=F.bodyR(a)+F.bodyR(e)-0.5,a.vx<0||!a.alive,S().events.some(x=>x.kind==='collide')];
  // a rock: bounced out, not through, and hurt
  f.load('hc1_nightfall',0,5);const k=S().rocks[0],b=by('P2'),pb=pool(b),R=F.bodyR(b)+F.rockR(k);
  place(b,k.x-R+30,k.y,0,1000);F.collideTick();
  out.rock=[Math.hypot(b.x-k.x,b.y-k.y)>=R,pb-pool(b)>10,b.vx<0];
  // a pilot flying at a rock 900 ahead steers off it
  f.load('hc1_nightfall',0,5);const c=by('P3');place(c,k.x-F.rockR(k)-900,k.y+20,0,700);
  const ev=F.evadeVec(c);out.evade=[!!ev,ev&&Math.abs(ev.y)>Math.abs(ev.x),ev&&ev.y*(c.y-k.y)>0];   // away from the rock's side
  // hc1 for 120 s: with avoidance hardly anyone crashes; without, many do
  const runs=w=>{const w0=T.AVOID_W.get();T.AVOID_W.set(w);const n=[];for(const sd of [3,11]){f.load('hc1_nightfall',0,sd);SIM.runFor(120);n.push([S().m.collisions||0,S().events.filter(e=>e.kind==='collide').length]);}T.AVOID_W.set(w0);return n;};   // [contacts, real collisions (damage, in the feed)]
  out.on=runs(T.AVOID_W.get());out.off=runs(0);
  return out;
 });
 ok(g2.head.every(Boolean),'G2: a head-on collision hurts both and bounces them apart '+JSON.stringify(g2.head));
 ok(g2.rock.every(Boolean),'G2: a ship bounces off a rock, hurt '+JSON.stringify(g2.rock));
 ok(g2.evade.every(Boolean),'G2: a pilot steers off a rock ahead '+JSON.stringify(g2.evade));
 ok(g2.on.every(x=>x[1]<=2)&&g2.on.reduce((a,x)=>a+x[0],0)*2.5<=g2.off.reduce((a,x)=>a+x[0],0)&&g2.off.reduce((a,x)=>a+x[1],0)>=6,'G2: pilots avoid crashing (real collisions, then all contacts against avoidance off) '+JSON.stringify([g2.on,g2.off]));
 // ---------- G3 (C-70): the Cross's missiles and the lock ----------
 const g3=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,T=SIM.TUNE,F=SIM.fn,out={};
  const S=()=>H.S,byName=n=>S().ships.find(s=>s.name===n),by=id=>S().ships.find(s=>s.id===id);
  const left=s=>s.wpns.filter(q=>q.w.needsLock).reduce((n,q)=>n+(q.ammo||0),0);
  // the Cross carries missiles here; the database's stock Cross doesn't
  f.load('hc1_nightfall',0,5);const sera=byName('Sera');
  out.load=[sera.wpns.map(q=>q.w.id).join('+'),left(sera),SRDB.ship('ft-4-cross').default_weapon_2,SIM.abilitiesOf(sera.id).includes('missile')];
  // a lock fills on a target ahead and AUTO fires at MISSILE_LOCK
  const setup=doc=>{f.load('hc1_nightfall',0,5);const c=byName('Sera'),r=by('relay');
    for(const x of S().ships)if(x.faction==='heg'&&x!==r)x.alive=false;   // just the relay
    f.issue('amber','attack',{type:'ship',id:'relay'});
    c.x=r.x-1350;c.y=r.y;c.h=c.vh=0;c.vx=300;c.vy=0;c.px=c.x;c.py=c.y;if(doc)SIM.setDoctrine(c.id,'missile',doc);return {c,r};};
  let {c,r}=setup();let n=0,lk0=0;while(!S().missiles.length&&n++<60){SIM.step();lk0=Math.max(lk0,F.lockOf?0:0);}
  out.auto=[S().missiles.length===1,+(n*0.05).toFixed(2),left(c),S().missiles[0]&&S().missiles[0].lock>=T.MISSILE_LOCK.get(),S().events.some(e=>e.kind==='missile')];
  // MANUAL holds fire on a lock; pressed, it fires; pressed before a lock, it arms and fires at the next
  ({c,r}=setup('MANUAL'));for(let i=0;i<30;i++)SIM.step();
  out.manual=[S().missiles.length,!!F.missileShot(c)];
  const u=SIM.useAbility(c.id,'missile');out.manual.push(u.ok&&u.fired===true,S().missiles.length);
  ({c,r}=setup('MANUAL'));const u2=SIM.useAbility(c.id,'missile');out.manual.push(u2.armed===true);
  for(let i=0;i<30&&!S().missiles.length;i++)SIM.step();out.manual.push(S().missiles.length===1);
  // EMERG: a healthy, unpinned pilot holds its missile
  ({c,r}=setup('EMERG'));for(let i=0;i<30;i++)SIM.step();out.emerg=[S().missiles.length===0,!!F.missileShot(c)];
  // a target breaks when a missile is MIS_BREAK_T out
  ({c,r}=setup());n=0;while(!S().missiles.length&&n++<60)SIM.step();
  const kit=byName('Kit'),m=S().missiles[0];kit.chaffLeft=0;m.target=kit.id;m.x=kit.x-F.misSpd()*0.8;m.y=kit.y;m.h=0;SIM.step();
  out.brk=[F.incomingMissile(kit)!=null,kit.misBreakT===S().t];
  // in hc1 the Crosses fire missiles and some land
  let fired=0,hits=0;for(const sd of [3,11]){f.load('hc1_nightfall',0,sd);SIM.runFor(150);fired+=S().ships.reduce((a,x)=>a+x.st.missiles,0);hits+=S().m.misHit||0;}
  out.fight=[fired,hits];
  // the pilot panel's Missile row
  f.load('hc1_nightfall',0,5);f.openPilot(byName('Sera').id);f.syncHud(true);
  const row=[...document.querySelectorAll('#hcPilot .hc-abil')].find(x=>/Missile/.test(x.textContent));
  out.panel=[row&&row.querySelector('.hc-abil__name').textContent,row&&row.querySelector('[data-use="missile"]').textContent];
  return out;
 });
 ok(g3.load[0]==='bls-t-light-repeaters+missiles'&&g3.load[1]===2&&g3.load[2]===null&&g3.load[3],'G3: the Cross carries two missiles in High Command only '+JSON.stringify(g3.load));
 ok(g3.auto[0]&&g3.auto[1]<=1.2&&g3.auto[2]===1&&g3.auto[3]&&g3.auto[4],'G3: a lock fills and AUTO fires '+JSON.stringify(g3.auto));
 ok(g3.manual[0]===0&&g3.manual[1]&&g3.manual[2]&&g3.manual[3]===1&&g3.manual[4]&&g3.manual[5],'G3: MANUAL holds, fires when pressed, arms for the next lock '+JSON.stringify(g3.manual));
 ok(g3.emerg.every(Boolean),'G3: EMERG holds a healthy pilot\'s missile '+JSON.stringify(g3.emerg));
 ok(g3.brk.every(Boolean),'G3: a target breaks from a missile '+JSON.stringify(g3.brk));
 ok(g3.fight[0]>=2&&g3.fight[1]>=1,'G3: missiles in a fight '+JSON.stringify(g3.fight));
 ok(g3.panel[0]==='Missile ×2'&&g3.panel[1]==='Arm','G3: the pilot panel\'s Missile row '+JSON.stringify(g3.panel));
 // ---------- G4 (C-70): selecting and ordering on the map ----------
 const g4=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={},A=H.A;
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id||s.name===id),st=()=>[A.sel,A.selShip,A.tray,A.panel,(A.group||[]).join('+')].join('|');
  f.load('hc1_nightfall',0,5);
  // a click selects the wing; a second, on a ship of that wing, the ship; a ship of another wing selects that wing
  f.clickShip(by('P1'));out.click=[st()];f.clickShip(by('P2'));out.click.push(st());f.clickShip(by('Sera'));out.click.push(st());
  // a box's wings share the tray: one order goes to both
  f.selectGroup(['dagger','amber']);out.group=[st()];f.issueSel('regroup',null);out.group.push(S().wings.map(w=>w.order.kind).join());
  // the wheel offers what fits the thing under the cursor
  const keys=t=>f.wheelItems(t?{x:t.x,y:t.y}:{x:3000,y:3000},t).items.map(i=>i.k).join();
  const fighter=S().ships.find(x=>x.faction==='heg'&&!x.struct&&x.alive);
  out.wheel=[keys(by('relay')),keys(fighter),keys(by('lark')),keys(null)];
  f.selectWing('dagger',true);f.openWheel({x:by('relay').x,y:by('relay').y,px:400,py:300},by('relay'));
  out.pick=[!document.getElementById('hcWheel').hidden,document.querySelectorAll('#hcWheel [data-wi]').length];f.wheelPick(0);
  out.pick.push(S().wings.find(w=>w.id==='dagger').order.kind+':'+S().wings.find(w=>w.id==='dagger').order.target.id,document.getElementById('hcWheel').hidden);
  // nothing selected: a right-click opens the commands (target-first), as before
  f.selectGroup([]);f.mapRight({x:3000,y:3000,px:10,py:10});out.none=[!!A.drawer,!A.wheel];f.closeWheel();
  // the camera for the mouse test: the five ships in the clear middle of the map
  f.load('hc1_nightfall',0,5);
  return out;
 });
 await pg3.waitForTimeout(300);
 await pg3.evaluate(()=>{const H=window.DBGarena.hc,f=H.fn,mine=H.S.ships.filter(s=>s.faction==='reb'&&s.wing);
  f.cam_().z=0.15;f.cam_().x=mine.reduce((a,s)=>a+s.x,0)/mine.length-200;f.cam_().y=mine.reduce((a,s)=>a+s.y,0)/mine.length+300;H.A.camHeld=true;H.A.follow=false;});
 await pg3.waitForTimeout(200);
 {const pt=n=>pg3.evaluate(n=>{const H=window.DBGarena.hc,f=H.fn,s=H.S.ships.find(s=>s.name===n),q=f.ipos(s);return f.toClient(q.x,q.y);},n);
  const sel=()=>pg3.evaluate(()=>{const A=window.DBGarena.hc.A;return [A.sel,(A.group||[]).join('+'),Math.round(window.DBGarena.hc.fn.cam_().x),!!A.wheel];});
  const a=await pt('Joss'),c=await pt('Sera');
  await pg3.mouse.move(Math.min(a.x,c.x)-60,Math.min(a.y,c.y)-40);await pg3.mouse.down();await pg3.mouse.move(Math.max(a.x,c.x)+60,Math.max(a.y,c.y)+40,{steps:8});await pg3.mouse.up();
  g4.mouse=[await sel()];
  await pg3.mouse.move(700,300);await pg3.mouse.down({button:'right'});await pg3.mouse.move(600,300,{steps:5});await pg3.mouse.up({button:'right'});g4.mouse.push(await sel());
  const j=await pt('Joss');await pg3.mouse.click(j.x+150,j.y+40,{button:'right'});g4.mouse.push(await sel());
  await pg3.keyboard.press('1');g4.mouse.push(await pg3.evaluate(()=>window.DBGarena.hc.S.wings.map(w=>w.order.kind).join()));}
 ok(g4.click[0]==='dagger||dagger||'&&g4.click[1]==='dagger|P2||P2|'&&g4.click[2]==='amber||amber||','G4: a click selects the wing, a second the ship '+JSON.stringify(g4.click));
 ok(g4.group[0]==='dagger||dagger||dagger+amber'&&g4.group[1]==='regroup,regroup','G4: a box\'s wings share one order '+JSON.stringify(g4.group));
 ok(g4.wheel[0]==='attack,regroup,withdraw,cmds'&&g4.wheel[1]==='attack,intercept,regroup,withdraw,cmds'&&g4.wheel[2]==='escort,defend,regroup,withdraw,cmds'&&g4.wheel[3]==='hold,defend,regroup,withdraw,cmds','G4: the wheel fits what was clicked '+JSON.stringify(g4.wheel));
 ok(g4.pick[0]&&g4.pick[1]===4&&g4.pick[2]==='attack:relay'&&g4.pick[3],'G4: a wheel pick orders the wing '+JSON.stringify(g4.pick));
 ok(g4.none.every(Boolean),'G4: with nothing selected a right-click opens the commands '+JSON.stringify(g4.none));
 ok(g4.mouse[0][1]==='dagger+amber'&&g4.mouse[1][2]!==g4.mouse[0][2]&&g4.mouse[1][1]==='dagger+amber'&&g4.mouse[2][3]===true&&g4.mouse[3]==='hold,hold','G4: the mouse: box, right-drag, right-click, a key '+JSON.stringify(g4.mouse));
 // ---------- G5 (C-70): the HUD ----------
 const g5=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={},A=H.A,q=s=>document.querySelector(s);
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id);
  f.load('hc1_nightfall',0,5);f.syncHud(true);
  // the commands bar is always there; a right-click narrows it to what fits ("For …"), × shows them all again
  const all=document.querySelectorAll('#hcCmds [data-cmd]').length;
  f.openDrawer({id:'P3'});f.syncHud(true);
  out.bar=[!q('#hcCmds').hidden,all,q('#hcCmds').classList.contains('is-for'),document.querySelectorAll('#hcCmds [data-cmd]').length<all];
  q('#hcCmds [data-act="close"]').click();out.bar.push(document.querySelectorAll('#hcCmds [data-cmd]').length===all,!q('#hcCmds').hidden);
  // the feed shows five entries and scrolls
  for(let i=0;i<9;i++)SIM.pushEvent('test','Test event '+i,{tone:'info'});f.syncHud(true);
  const fd=q('#hcFeed'),fr=fd.getBoundingClientRect(),evs=[...fd.querySelectorAll('.hc-ev')];
  out.feed=[evs.length,evs.filter(e=>e.getBoundingClientRect().bottom<=fr.bottom+1).length,fd.scrollHeight>fd.clientHeight+10];
  // bigger objectives
  out.obj=[parseFloat(getComputedStyle(q('#hcObj .hc-obj__item')).fontSize),q('#hcObjBox').getBoundingClientRect().width];
  // quiet lines: on for hc1 (only the selected or hovered wing's), off elsewhere; the panel's toggle overrides
  out.quiet=[f.linesQuiet()];f.load('hc2_lastlight',0,5);out.quiet.push(f.linesQuiet());
  const cb=q('#hcPanelBody [data-toggle="quiet"]');cb.checked=true;cb.dispatchEvent(new Event('input',{bubbles:true}));out.quiet.push(f.linesQuiet());
  cb.checked=false;cb.dispatchEvent(new Event('input',{bubbles:true}));H.A.quietPref=null;
  // status symbols: an ability, a missile break, a dodge; real seconds, then gone
  f.load('hc1_nightfall',0,5);const t0=5e9;f.badgeTick(t0);
  SIM.useAbility('P1','lockin');by('P2').misBreakT=S().t+0.01;by('P3').dodgeT=S().t+0.01;f.badgeTick(t0+10);
  out.badge=[f.badges_().sort().join(),f.BADGE_().MS];f.badgeTick(t0+10+f.BADGE_().MS+1);out.badge.push(f.badges_().length);
  return out;
 });
 ok(g5.bar[0]&&g5.bar[1]>=8&&g5.bar[2]&&g5.bar[3]&&g5.bar[4]&&g5.bar[5],'G5: the commands bar, narrowed by a right-click '+JSON.stringify(g5.bar));
 ok(g5.feed[0]>5&&g5.feed[1]===5&&g5.feed[2],'G5: the feed shows five entries and scrolls '+JSON.stringify(g5.feed));
 ok(g5.obj[0]>=15&&g5.obj[1]>330,'G5: bigger objectives '+JSON.stringify(g5.obj));
 ok(g5.quiet[0]===true&&g5.quiet[1]===true&&g5.quiet[2]===true,'G5, C-72: quiet lines in every scenario '+JSON.stringify(g5.quiet));
 ok(g5.badge[0]==='P1:lockin,P2:evade,P3:dodge'&&g5.badge[1]===2500&&g5.badge[2]===0,'G5: status symbols by the ships '+JSON.stringify(g5.badge));
 // ---------- C-71 (playtest 3): the Cross's turn, the corner column, the skill icons ----------
 const h3=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,F=SIM.fn,out={},q=s=>document.querySelector(s),R=e=>e.getBoundingClientRect();
  f.load('hc1_nightfall',0,5);f.syncHud(true);
  const cross=H.S.ships.find(s=>s.row.id==='ft-4-cross'),mote=H.S.ships.find(s=>s.row.id==='vc-mote'),talon=H.S.ships.find(s=>s.row.id==='sf-11-talon');
  const rate=s=>F.capsOf(s).wc,rad=s=>F.capsOf(s).vc/F.capsOf(s).wc;
  out.turn=[+(rate(cross)/rate(mote)).toFixed(2),Math.round(rad(cross)),Math.round(rad(mote)),Math.round(rad(talon)),SIM.TUNE.TURN_CROSS.get()];
  const k=SIM.TUNE.TURN_CROSS.get();SIM.TUNE.TURN_CROSS.set(1);out.turn.push(+(rate(cross)/rate(mote)).toFixed(2));SIM.TUNE.TURN_CROSS.set(k);
  const b=R(q('#hcCmds [data-cmd="override"]')),g=R(q('#hcCmds [data-cmd="override"] .hc-cmd__glyph')),ro=R(q('#hcRoster')),st=R(q('#hcStage')),cm=R(q('#hcCmds'));
  out.ui=[Math.round(b.width),Math.round(b.height),Math.round(g.width),Math.round(ro.left-st.left),Math.round(st.bottom-ro.bottom),cm.left>=ro.right,document.querySelectorAll('#hcCmds .hc-cmd').length];
  return out;
 });
 ok(h3.turn[0]===0.8&&h3.turn[1]<520&&h3.turn[1]>h3.turn[2]&&h3.turn[1]>h3.turn[3]&&h3.turn[4]===1.6&&h3.turn[5]===0.5,'C-71: the Cross turns at 80% of a Mote (was 50%), wider than the interceptors '+JSON.stringify(h3.turn));
 ok(h3.ui[0]>=70&&h3.ui[1]>=80&&h3.ui[2]>=30&&h3.ui[3]<=16&&h3.ui[4]<=16&&h3.ui[5]&&h3.ui[6]===9,'C-71: big skill icons right of the wing cards in the corner '+JSON.stringify(h3.ui));
 // ---------- C-72 (playtest 4), I1: locks for all, the missile's fuse, evading, chaff, status on the map ----------
 const i1=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,F=SIM.fn,out={};
  const S=()=>H.S,byName=n=>S().ships.find(s=>s.name===n),by=id=>S().ships.find(s=>s.id===id);
  // a gunship locks too, out to LOCK_GUN_K × its reach, and a lock tightens its spread
  f.load('hc1_nightfall',0,5);const joss=byName('Joss'),r=by('relay');
  for(const x of S().ships)if(x.faction==='heg'&&x!==r)x.alive=false;
  f.issue('dagger','attack',{type:'ship',id:'relay'});joss.x=r.x-900;joss.y=r.y;joss.h=joss.vh=0;joss.px=joss.x;joss.py=joss.y;
  for(let i=0;i<20;i++)SIM.step();
  const q=joss.wpns[0];
  out.lock=[!F.misWpn(joss),Math.round(F.lockRange(joss)),Math.round(F.gunRange(joss)*SIM.TUNE.LOCK_GUN_K.get()),F.lockOf(joss,'relay')>0.5,+(F.spreadOf(joss,q.w,600,1)/F.spreadOf(joss,q.w,600,0)).toFixed(2)];
  // a missile explodes MIS_LIFE after launch
  const setup=()=>{f.load('hc1_nightfall',0,5);const c=byName('Sera'),rl=by('relay');for(const x of S().ships)if(x.faction==='heg'&&x!==rl)x.alive=false;
    f.issue('amber','attack',{type:'ship',id:'relay'});c.x=rl.x-1350;c.y=rl.y;c.h=c.vh=0;c.vx=300;c.vy=0;c.px=c.x;c.py=c.y;let n=0;while(!S().missiles.length&&n++<60)SIM.step();return S().missiles[0];};
  let m=setup();out.life=[m&&m.life<=SIM.TUNE.MIS_LIFE.get()&&m.life>SIM.TUNE.MIS_LIFE.get()-0.2];
  m.target=null;const miss0=S().m.misMiss||0;SIM.runFor(SIM.TUNE.MIS_LIFE.get()+0.1);out.life.push(S().missiles.length===0,(S().m.misMiss||0)===miss0+1);
  // fired on: far off, the target runs straight away from the missile and boosts (Wren flies Boost)
  m=setup();const wren=byName('Wren');wren.chaffLeft=0;m.target=wren.id;m.x=wren.x-F.misSpd()*2.5;m.y=wren.y;m.h=0;SIM.step();
  const away=Math.atan2(wren.y-m.y,wren.x-m.x),gg=Math.atan2(wren.goal.y-wren.y,wren.goal.x-wren.x);
  out.run=[Math.abs(Math.atan2(Math.sin(gg-away),Math.cos(gg-away)))<0.2,(wren.abLog||[]).some(a=>a.k==='boost'),wren.boostT>0];
  // chaff: a missile closing on a ship with chaff is drawn off into the cloud and bursts there
  m=setup();const kit=byName('Kit'),hull=kit.hull+kit.arm;m.target=kit.id;m.x=kit.x-F.misSpd()*1.0;m.y=kit.y;m.h=0;SIM.step();
  out.chaff=[S().chaff.length===1,kit.chaffLeft===SIM.TUNE.CHAFF_N.get()-1,m.target===null&&m.decoy!=null];
  SIM.runFor(2);out.chaff.push(S().m.misChaff===1,kit.hull+kit.arm===hull,S().events.some(e=>e.kind==='chaff'));
  // status on the map: only the selection, what it fights, stations and the convoy
  f.load('hc1_nightfall',0,5);SIM.runFor(20);f.selectGroup([]);
  const none=f.selWings(),sf0=f.selFoes(none);out.status=[f.statusShown(byName('Joss'),none,sf0),f.statusShown(by('relay'),none,sf0),f.statusShown(by('lark'),none,sf0)];
  f.selectWing('dagger',true);const sw=f.selWings(),sf=f.selFoes(sw),tgt=byName('Joss').beh.target;
  out.status.push(f.statusShown(byName('Joss'),sw,sf),f.statusShown(byName('Sera'),sw,sf),!tgt||f.statusShown(by(tgt),sw,sf));
  return out;
 });
 ok(i1.lock[0]&&i1.lock[1]===i1.lock[2]&&i1.lock[3]&&i1.lock[4]===0.4,'C-72: every ship locks; a full lock takes 60% off the spread '+JSON.stringify(i1.lock));
 ok(i1.life.every(Boolean),'C-72: a missile explodes after its life '+JSON.stringify(i1.life));
 ok(i1.run.every(Boolean),'C-72: fired on, a pilot runs from the missile and boosts '+JSON.stringify(i1.run));
 ok(i1.chaff.every(Boolean),'C-72: chaff draws a missile off '+JSON.stringify(i1.chaff));
 ok(i1.status[0]===false&&i1.status[1]&&i1.status[2]&&i1.status[3]&&i1.status[4]===false&&i1.status[5],'C-72: status on the map only for the selection '+JSON.stringify(i1.status));
 // ---------- C-72, I2: defenders get between; the Hegemony looks after itself and lures ----------
 const i2=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,F=SIM.fn,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id||s.name===id);
  // a raider heading for Lastlight 4,500 out: a defender gets between them, and engages once it is close
  f.load('hc2_lastlight',0,5);const st=by('lastlight'),rook=by('Rook');
  SIM.runFor(21);const r1=S().ships.find(x=>x.faction==='heg'&&x.alive);
  for(const x of S().ships)if(x.faction==='heg'&&x!==r1)x.alive=false;
  r1.x=st.x+4500;r1.y=st.y;r1.h=r1.vh=Math.PI;r1.vx=-600;r1.vy=0;r1.px=r1.x;r1.py=r1.y;
  out.threat=[F.guardThreats(st,[r1],SIM.TUNE.DEFEND_R.get()).length===1];
  SIM.runFor(1);
  const cov=S().ships.filter(x=>x.wing==='ember'&&x.beh.target===r1.id);
  out.threat.push(cov.length>=1&&cov.length<=2,cov.some(x=>x.beh.kind==='interpose'||x.beh.kind==='engage'));
  const iv=cov.find(x=>x.beh.kind==='interpose');
  if(iv){const g=iv.goal,ga=Math.atan2(g.y-st.y,g.x-st.x),ra=Math.atan2(r1.y-st.y,r1.x-st.x);out.threat.push(Math.abs(Math.atan2(Math.sin(ga-ra),Math.cos(ga-ra)))<0.3&&F.dist(g,st)<F.dist(r1,st));}else out.threat.push(true);
  let n=0;while(n++<200&&!cov.some(x=>x.beh.kind==='engage'))SIM.step();out.threat.push(cov.some(x=>x.beh.kind==='engage'),F.dist(r1,st)>SIM.TUNE.DEFEND_R.get());
  // the Hegemony: wave one splits into a lure and a strike, said in the feed; a hurt pilot pulls back; one shot at fights back
  f.load('hc2_lastlight',0,5);SIM.runFor(26);
  const w1=S().ships.filter(x=>x.faction==='heg'&&x.alive);
  out.plan=[w1.filter(x=>x.hegRole==='lure').length,w1.filter(x=>x.hegRole==='strike').length,S().events.some(e=>e.kind==='heg'&&/raiders split/.test(e.text)),w1.some(x=>x.beh.kind==='lure'),w1.some(x=>x.beh.kind==='standoff')];
  const sk=w1.find(x=>x.hegRole==='strike');SIM.TUNE.STRIKE_WAIT.set(0);SIM.runFor(1.2);out.plan.push(sk.beh.kind==='engage'&&sk.beh.target==='lastlight');SIM.TUNE.STRIKE_WAIT.set(25);
  const hurt=w1.find(x=>x!==sk&&x.alive);hurt.hull=hurt.maxHull*0.3;hurt.thinkT=99;SIM.step();
  out.pres=[hurt.retreat===true,hurt.beh.kind==='hegback',S().events.some(e=>/pulls back/.test(e.text))];
  f.load('hc2_lastlight',0,5);SIM.runFor(26);const rd=S().ships.find(x=>x.faction==='heg'&&x.alive&&x.hegRole==='strike')||S().ships.find(x=>x.faction==='heg'&&x.alive);
  const rk=by('Rook');rd.lastHitBy=rk.id;rd.hitT=S().t;rk.x=rd.x-500;rk.y=rd.y;rk.px=rk.x;rk.py=rk.y;rd.thinkT=99;SIM.step();
  out.pres.push(rd.beh.kind==='engage'&&rd.beh.target===rk.id);
  return out;
 });
 ok(i2.threat.every(Boolean),'C-72: a defender gets between an inbound raider and Lastlight, then engages it out from the station '+JSON.stringify(i2.threat));
 ok(i2.plan[0]>=1&&i2.plan[1]>=1&&i2.plan.slice(2).every(Boolean),'C-72: the raiders split into a lure and a strike '+JSON.stringify(i2.plan));
 ok(i2.pres.every(Boolean),'C-72: a hurt Hegemony pilot pulls back; one shot at fights back '+JSON.stringify(i2.pres));
 // ---------- C-73, V1: the visual pass (game/art/sr-space-fx.js) wired into the map ----------
 const v1=await pg3.evaluate(()=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,F=SIM.fn,FX=f.FX,out={};
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id||s.name===id),q=s=>document.querySelector(s);
  const seen=[],ev0=FX.event,evd={};FX.event=(k,d)=>{seen.push(k);evd[k]=d;return ev0(k,d);};
  const lm0=FX.lockMark;let marks=[];FX.lockMark=(c,x,y,r,k,o,v)=>{marks.push(o);return lm0(c,x,y,r,k,o,v);};
  const tick=n=>{for(let i=0;i<n;i++){SIM.step();f.fxSense();FX.update(SIM.TICK/1000,16);}};
  try{
   // loaded and on; the station art keys; the panel's FX group
   f.load('hc1_nightfall',0,5);f.setFx({on:true,shake:true,calm:false});
   out.on=[!!FX,f.fxOn(),f.stationArt(by('relay')),f.stationArt(by('lark'))];
   f.load('hc2_lastlight',0,5);out.on.push(f.stationArt(by('lastlight')));f.load('hc3_meltdown',0,5);out.on.push(f.stationArt(by('reactor')));
   const fxs=[...document.querySelectorAll('#hcPanelBody [data-fx]')];
   out.panel=[fxs.length===f.FX_UI.filter(r=>r[0] in FX.TUNE).length,!!q('#hcPanelBody [data-toggle="fx"]'),!!q('#hcPanelBody [data-toggle="shake"]'),!!q('#hcPanelBody [data-toggle="calm"]')];
   const fl=q('#hcPanelBody [data-fx="flameLen"]'),fl0=FX.TUNE.flameLen;fl.value='3.5';fl.dispatchEvent(new Event('input',{bubbles:true}));
   out.panel.push(FX.TUNE.flameLen===3.5,JSON.parse(f.settingsJson())['fx.flameLen']===3.5);
   q('#hcPanelBody [data-act="defaults"]').click();out.panel.push(FX.TUNE.flameLen===fl0,!('fx.flameLen' in JSON.parse(f.settingsJson())));
   // draws at the three zooms the brief names, on and off, without a throw
   f.load('hc1_nightfall',0,5);tick(400);
   const c=f.cam_(),j=by('Joss');let draws=0;
   for(const on of [true,false]){f.setFx({on});for(const z of [0.12,0.4,1.2]){c.x=j.x;c.y=j.y;c.z=z;f.render(performance.now());draws++;}}
   f.setFx({on:true});
   out.draw=[draws===6,FX.stats().spritesCached>0];
   // the sim's tags: every bolt hit names its surface; crashes and missile ends are marked
   out.tags=[S().fx.filter(x=>x.kind!=='boom'&&!x.src).every(x=>['shield','armour','hull'].includes(x.surface))];
   // events from what the sim did: muzzle and bolt hits in view, a kill, a jump, a missile, chaff, a crash, a command
   f.load('hc1_nightfall',0,5);f.fxSense();seen.length=0;
   const rl=by('relay'),jo=by('Joss');c.x=rl.x;c.y=rl.y;c.z=0.6;
   jo.x=rl.x-700;jo.y=rl.y;jo.h=jo.vh=0;jo.px=jo.x;jo.py=jo.y;f.issue('dagger','attack',{type:'ship',id:'relay'});
   let n=0;while(n++<200&&!(seen.includes('muzzle')&&seen.includes('boltHit')))tick(1);
   const g=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);F.kill(g,null);tick(1);
   const lark=by('lark');lark.alive=false;lark.jumped=true;lark.jumpT=S().t;tick(1);
   const kit=by('Kit');F.throwChaff(kit);tick(1);
   SIM.command('decoy',{x:rl.x,y:rl.y});tick(1);
   const ss=by('Sera'),t=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);
   if(t){ss.x=t.x-900;ss.y=t.y;ss.px=ss.x;ss.py=ss.y;ss.h=ss.vh=0;t.chaffLeft=0;let m=0;while(m++<80&&!seen.includes('missileLaunch')){ss.locks={[t.id]:1};tick(1);}}
   const a=by('Petra'),b2=by('Wren');a.px=a.x-200;a.py=a.y;a.vx=4000;a.vy=0;b2.x=a.x+20;b2.y=a.y;b2.px=b2.x;b2.py=b2.y;b2.vx=b2.vy=0;F.collideTick();f.fxSense();
   out.ev=['muzzle','boltHit','explode','jumpOut','chaff','command','missileLaunch','collide'].map(k=>k+':'+seen.includes(k));
   // a station's death is the big one; a wave arriving warps in
   seen.length=0;rl.hull=0;F.kill(rl,null);tick(1);out.ev.push('station:'+seen.includes('explode'));
   f.load('hc2_lastlight',0,5);f.fxSense();seen.length=0;let w=0;while(w++<600&&!S().ships.some(x=>x.faction==='heg'&&x.alive))tick(1);
   out.ev.push('warpIn:'+seen.includes('warpIn'));
   // nothing stale: a reload marks what is already there without effects
   f.load('hc1_nightfall',0,5);SIM.runFor(30);seen.length=0;f.fxSense();out.stale=seen.filter(k=>k==='warpIn'||k==='explode').length;
   // boarding: the docked Grafs, each linked to a clamp pad on the reactor
   f.load('hc3_meltdown',0,5);const st=by('reactor'),gs=[by('Anvil'),by('Forge')];for(const x of S().ships)if(x.faction==='heg'&&!x.struct)x.alive=false;
   gs.forEach((x,i)=>{const a2=Math.PI*(1-0.25*i);x.x=st.x+Math.cos(a2)*F.boardR(st)*0.7;x.y=st.y+Math.sin(a2)*F.boardR(st)*0.7;x.px=x.x;x.py=x.y;x.thinkT=0;});
   f.issue('hammer','board',{type:'station',id:'reactor'});let bn=0;while(bn++<600&&!(f.boarders(st).length&&st.boardProg>0))tick(1);
   const bd=f.boarders(st),pad=bd.length?f.padNear(st,st,bd[0],1):null;
   out.board=[bd.length>=1,bd.every(x=>x.marines),!!pad&&Math.hypot(pad.x-st.x,pad.y-st.y)>10];
   c.x=st.x;c.y=st.y;c.z=0.5;f.render(performance.now());
   // round 2 (C-74): the hurt read from the hull fraction, the spiral carries on the ship's flight and ends in the
   // explosion, the lock marks: turning while building, held once locked
   f.load('hc1_nightfall',0,5);f.fxSense();seen.length=0;
   const jh=by('Joss');jh.hull=jh.maxHull*0.2;const sv=f.shipView(jh,f.ipos(jh),1);
   FX.TUNE.spiralChance=1;const g3=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);F.kill(g3,null);tick(1);
   const ex=evd.explode||{},sp1=FX.fn.os_().some(e=>e.kind==='spiral');
   for(let i=0;i<Math.ceil(FX.TUNE.spiralSecs/0.05)+2;i++)FX.update(0.05,16);FX.TUNE.spiralChance=0.5;
   out.r2=[+sv.hullFrac.toFixed(2)===0.2,ex.vh===g3.vh&&ex.speed>0,sp1,FX.fn.os_().some(e=>e.kind==='boom')];
   const se=by('Sera'),lt=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);f.selectWing('amber');
   c.x=lt.x;c.y=lt.y;c.z=0.5;se.locks={[lt.id]:0.3};marks=[];f.render(performance.now());const m1=marks.find(o=>!o.hostile);
   se.locks={[lt.id]:1};marks=[];f.render(performance.now());const m2=marks.find(o=>!o.hostile);
   out.r2.push(!!m1&&!m1.locked,!!m2&&m2.locked&&m2.flipAge===0);
   // reduced motion: no shake after a kill (this context prefers reduced motion)
   f.load('hc1_nightfall',0,5);f.fxSense();const g2=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);c.x=g2.x;c.y=g2.y;F.kill(g2,null);tick(1);
   const sh=FX.camShake({z:1,cx:g2.x,cy:g2.y,W:800,H:600,dpr:1,reduced:true});out.calm=[sh.x===0&&sh.y===0];
   // the visual pass never moves the fight: the same seed, drawn with it and without, ends the same
   const hashes=[];
   for(const on of [true,false]){f.setFx({on});f.load('hc3_meltdown',0,9);for(let i=0;i<600;i++){SIM.step();f.fxSense();FX.update(SIM.TICK/1000,16);if(i%10===0)f.render(performance.now());}hashes.push(SIM.stateHash());}
   f.setFx({on:true});out.det=hashes;
  }finally{FX.event=ev0;FX.lockMark=lm0;}
  return out;
 });
 ok(v1.on.join()==='true,true,relay,,lastlight,reactor','C-73: the visual pass is on; the stations have their art '+JSON.stringify(v1.on));
 ok(v1.panel.every(Boolean),'C-73: the panel\'s FX group: switches, numbers, Copy settings, defaults '+JSON.stringify(v1.panel));
 ok(v1.draw.every(Boolean)&&v1.tags.every(Boolean),'C-73: draws at 0.12, 0.4, 1.2 on and off; bolt hits name their surface '+JSON.stringify([v1.draw,v1.tags]));
 ok(v1.ev.every(e=>/:true$/.test(e)),'C-73: the sim\'s moments become effects '+JSON.stringify(v1.ev));
 ok(v1.stale===0,'C-73: a reload raises nothing stale '+v1.stale);
 ok(v1.board.every(Boolean),'C-73: boarding links each docked Graf to a clamp pad '+JSON.stringify(v1.board));
 ok(v1.r2.every(Boolean),'C-74: the hurt read, the death spiral, the lock marks '+JSON.stringify(v1.r2));
 ok(v1.calm.every(Boolean),'C-73: reduced motion: no camera shake '+JSON.stringify(v1.calm));
 ok(v1.det[0]===v1.det[1],'C-73: the visual pass never changes the fight '+JSON.stringify(v1.det));
 ok(hc4.panel[1]&&/Run,Flight,Fighting,Orders,Hegemony,Leaders,Rules,Morale,Commands/.test(hc4.panel[2])&&/Tactics/.test(hc4.panel[2])&&hc4.panel[3]===5&&hc4.panel[4]===60&&hc4.panel[5]===12&&hc4.panel[6]===3.4,'HC T4: the panel '+JSON.stringify(hc4.panel));
 await ctx3.close();
 // ================= Type 3.5: High Command Hands Off (docs/ARENA-HC35-HANDOFF.md §11), its own context =================
 const ctx4=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const pg4=await ctx4.newPage();
 pg4.on('pageerror',e=>errs.push('pageerror(hc35): '+e.message));
 pg4.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console(hc35): '+m.text());});
 await pg4.goto(base+'#arena');await pg4.waitForTimeout(800);
 // HC35 1: High Command is byte-identical with the hooks in: hc1–hc3 after 90 s, seed 7, one scripted order at 5 s.
 // The baselines were recorded on space-combat-testing before any 3.5 change (C-75)
 const HC35_BASE={hc1_nightfall:'a9741455',hc2_lastlight:'f237a40',hc3_meltdown:'40316536'};
 const t35a=await pg4.evaluate(()=>{
  const top=window.DBGarena;top.fn.openPicker();document.querySelector('#arRulesets [data-ruleset="hc"]').click();
  const H=top.hc,f=H.fn,SIM=H.SIM,out={hash:{}};
  const orders={hc1_nightfall:['dagger','attack',{type:'class',cls:'mote'}],hc2_lastlight:['ash','defend',{type:'ship',id:'lastlight'}],hc3_meltdown:['hammer','board',{type:'station',id:'reactor'}]};
  for(const id in orders){f.load(id,0,7);SIM.runFor(5);f.issue(...orders[id]);SIM.runFor(85);out.hash[id]=SIM.stateHash();}
  out.hooks=Object.keys(SIM.hooks).length;
  return out;
 });
 ok(JSON.stringify(t35a.hash)===JSON.stringify(HC35_BASE)&&t35a.hooks===0,'HC35 1: High Command unchanged by the hooks (hashes match the baselines; no hook set) '+JSON.stringify(t35a));
 // HC35 2: the loop by DOM, board → dossier → the four steps → Launch → the mission → debrief → Plan again
 const t35b=await pg4.evaluate(()=>{
  const top=window.DBGarena;top.fn.openPicker();
  const out={};const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  out.rulesets=[...document.querySelectorAll('#arRulesets [data-ruleset-item] b')].map(e=>e.textContent);
  document.querySelector('#arRulesets [data-ruleset="hc35"]').click();
  const X=top.hc35,B=X.B;X.B.seed=4242;X.fn.showBoard(false);
  out.board=[B.screen,!!q('.h35-opp'),qa('.sr-btn--primary').length,!!q('canvas[data-portrait="cass"]')];
  q('[data-act="dossier"]').click();out.dossier=[B.screen,!!q('canvas[data-target]'),!!q('[data-act="dig"]')];
  q('[data-act="brief"]').click();out.step1=[B.screen,B.step,qa('[data-primary]').length,qa('.h35-obj.is-locked').length,!q('[data-act="launch"]')];   // Launch only on step 4
  q('[data-primary="destroy"]').click();q('[data-act="next"]').click();out.step2=[B.step,qa('[data-opt]').length,qa('[data-roe]').length];
  q('[data-act="next"]').click();out.step3=[B.step,qa('.h35-wing').length,qa('[data-role]').length,qa('button[data-lo]').length,qa('.sr-slot').length];
  q('[data-act="next"]').click();out.step4=[B.step,qa('[data-ord="exec"]').length,!!q('[data-act="launch"]'),q('[data-act="launch"]').getAttribute('aria-disabled')];
  // the wings as listed: Dagger 2 Cross + 1 Talon, Anvil 1 Talon + 2 Brickbat, Amber 1 Cross + 2 Talon + 1 Brickbat
  out.wings=X.L35.WINGS35.map(w=>w.ships.map(s=>s.cls).join(','));
  for(const w in B.plan.wings)B.plan.wings[w].exec={k:'destroy',arg:null};
  const seed=B.seed;q('[data-act="launch"]').click();
  const S=()=>X.S;
  out.live=[B.screen,S().scn.id,S().ships.filter(s=>s.faction==='reb'&&!s.struct).length,!!S().ships.find(s=>s.id==='fl400'),S().ships.filter(s=>s.role35==='escort').length>0,X.L.phase];
  X.fn.run(400);
  out.end=[B.screen,!!S().over,!!q('.h35-debrief'),!!q('.sr-stamp')];
  q('[data-act="again"]').click();
  out.again=[B.screen,B.step,B.seed===seed,B.plan.primary,Object.values(B.plan.wings).every(w=>w.exec.k==='destroy')];
  out.campaign=!!localStorage.getItem('star-rebellion-campaign-v1');
  return out;
 });
 ok(t35b.rulesets[3]==='Type 3.5: High Command Hands Off','HC35 2: the fourth ruleset '+JSON.stringify(t35b.rulesets));
 ok(t35b.board[0]==='board'&&t35b.board[1]&&t35b.board[2]===1&&t35b.board[3]&&t35b.dossier[0]==='dossier'&&t35b.dossier[1]&&t35b.dossier[2],'HC35 2: the board (one gold primary) and the dossier '+JSON.stringify([t35b.board,t35b.dossier]));
 ok(t35b.step1[0]==='brief'&&t35b.step1[1]===1&&t35b.step1[2]===7&&t35b.step1[3]===5&&t35b.step2[0]===2&&t35b.step2[1]===7&&t35b.step2[2]===5&&t35b.step3[0]===3&&t35b.step3[1]===3&&t35b.step3[2]===9&&t35b.step3[3]===9&&t35b.step3[4]===3&&t35b.step4[0]===4&&t35b.step4[1]===3&&t35b.step4[2]&&t35b.step4[3]===null,
  'HC35 2: the four briefing steps '+JSON.stringify([t35b.step1,t35b.step2,t35b.step3,t35b.step4]));
 ok(t35b.wings.join('|')==='cross,cross,talon|talon,brickbat,brickbat|cross,talon,talon,brickbat','HC35 2: the wings as the designer listed them '+JSON.stringify(t35b.wings));
 ok(t35b.live[0]==='live'&&t35b.live[1]==='hc35_freighter'&&t35b.live[2]===10&&t35b.live[3]&&t35b.live[4]&&t35b.end.every(Boolean),'HC35 2: Launch, the mission, the debrief '+JSON.stringify([t35b.live,t35b.end]));
 ok(t35b.again[0]==='brief'&&t35b.again[1]===4&&t35b.again[2]&&t35b.again[3]==='destroy'&&t35b.again[4],'HC35 2: Plan again keeps the seed and the plan '+JSON.stringify(t35b.again));
 ok(!t35b.campaign,'HC35 1: no campaign save after a 3.5 run');
 // HC35 5–7: the target, each primary, the phases (from scripted setups: no modifiers, a fixed seed)
 const t35c=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,out={};
  const S=()=>X.S,L=()=>X.L,fr=()=>S().ships.find(s=>s.id==='fl400');
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;else B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    if(o.tagger)B.plan.tagger=o.tagger;X.fn.launch();};
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  // 5: fighter guns alone can't zero the engines in 60 s; two Brickbats with bombs can
  go('destroy',{dagger:{k:'disable',arg:'engines'},anvil:{role:'home'},amber:{role:'home'}});
  until(()=>false,60);out.guns=[Math.round(L().subs[0].hp),fr().alive];
  go('destroy',{anvil:{k:'disable',arg:'engines'},dagger:{role:'home'},amber:{role:'home'}});
  out.bombs=[until(()=>L().disabled,60),Math.round(S().t)];
  // a disabled freighter doesn't jump (put by its jump point); inside the pull it falls in
  const f1=fr(),j=L().fjump;f1.x=j.x;f1.y=j.y;f1.px=f1.x;f1.py=f1.y;L().leg=L().lane.length-1;SIM.step();
  out.nojump=[until(()=>!fr().alive,20)===false,L().spool==null];
  go('crash',{dagger:{role:'home'},anvil:{role:'home'},amber:{k:'hold'}});
  const f2=fr(),Pl=L().planet;f2.x=Pl.x;f2.y=Pl.y-Pl.r-1200;f2.px=f2.x;f2.py=f2.y;L().subs[0].hp=1;F.applyDamage(f2,5,true,true,{x:f2.x,y:f2.y,by:'hale',aimSub:'engines'});
  L().subs[0].hp=0;L().disabled=true;L().drift={vx:0,vy:0};
  out.crash=[until(()=>!fr().alive,40),L().crashed,L().prim.state];
  // 6: each primary from a scripted setup
  const res={};
  go('destroy',{anvil:{k:'destroy'},dagger:{k:'defend',arg:'anvil'},amber:{k:'suppress',arg:'turrets'}});until(()=>L().prim.state!=='live',150);res.destroy=L().prim.state;
  go('steal',{anvil:{k:'disable',arg:'engines'},amber:{k:'board'},dagger:{k:'defend',arg:'anvil'}},{lo:{mags:'board'}});until(()=>L().prim.state!=='live',200);res.steal=L().prim.state;
  go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});until(()=>L().prim.state!=='live',200);res.pirate=L().prim.state;
  go('strip',{anvil:{k:'disable',arg:'engines'},amber:{k:'haul'},dagger:{k:'suppress',arg:'escorts'}},{lo:{mags:'pods'}});until(()=>L().prim.state!=='live',200);res.strip=L().prim.state;
  go('tag',{amber:{k:'tag'},dagger:{role:'home'},anvil:{role:'home'}},{tagger:'kit'});until(()=>L().prim.state!=='live',300);res.tag=[L().prim.state,L().tag.planted];
  go('ambush',{dagger:{k:'ambush'},amber:{k:'ambush'},anvil:{k:'disable',arg:'engines'}});until(()=>L().responseAt!=null,60);L().responseAt=S().t+1;until(()=>L().prim.state!=='live',200);res.ambush=[L().prim.state,L().respKills];
  out.res=res;
  // crash, with the disable timed inside the pull (the signal rule comes with P3)
  go('crash',{anvil:{k:'hold'},dagger:{k:'hold'},amber:{k:'defend',arg:'anvil'}});
  until(()=>{const f=fr();return f.alive&&Math.hypot(f.x-L().planet.x,f.y-L().planet.y)<L().planet.pull*0.97;},200);L().exec.anvil={k:'disable',arg:'engines'};
  until(()=>L().prim.state!=='live',120);res.crash=L().prim.state;
  // 7: the phases: detection to 100 → Phase 2; the array killed mid-send: no response; Remote: none either
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L().detect=99.5;
  const e=S().ships.find(s=>s.role35==='escort'),r=S().ships.find(s=>s.faction==='reb'&&s.alive);r.x=e.x+1800;r.y=e.y;r.px=r.x;r.py=r.y;L().detect=99.9;SIM.step();SIM.step();
  out.phase=[L().phase,L().alarmWhy,!!L().distress];
  const cm=L().subs.find(x=>x.k==='comms');F.applyDamage(fr(),140,true,true,{x:fr().x,y:fr().y,by:null,aimSub:'comms'});
  until(()=>false,30);out.phase.push(cm.hp<=0,L().distress.cut,L().responseAt);
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{mods:[{k:'remote',hidden:false}]});L35.alarm('fired');until(()=>false,40);out.remote=[L().distress&&L().distress.landed,L().responseAt];
  return out;
 });
 ok(t35c.guns[0]>0&&t35c.guns[1],'HC35 5: fighter guns alone don\'t take the engines out in 60 s '+JSON.stringify(t35c.guns));
 ok(t35c.bombs[0],'HC35 5: two Brickbats with bombs do '+JSON.stringify(t35c.bombs));
 ok(t35c.nojump.every(Boolean)&&t35c.crash[0]&&t35c.crash[1],'HC35 5: a disabled freighter can\'t jump; inside the pull it crashes '+JSON.stringify([t35c.nojump,t35c.crash]));
 ok(t35c.res.destroy==='done'&&t35c.res.steal==='done'&&t35c.res.pirate==='done'&&t35c.res.strip==='done'&&t35c.res.tag[0]==='done'&&t35c.res.ambush[0]==='done'&&t35c.res.crash==='done','HC35 6: each primary can be won '+JSON.stringify(t35c.res));
 ok(t35c.phase[0]===2&&t35c.phase[1]==='detected'&&t35c.phase[2]&&t35c.phase[3]&&t35c.phase[4]&&t35c.phase[5]==null,'HC35 7: detection → Phase 2; the array killed mid-send cuts the call '+JSON.stringify(t35c.phase));
 ok(t35c.remote[0]&&t35c.remote[1]==null,'HC35 7: Remote: the call lands but no response comes '+JSON.stringify(t35c.remote));
 // HC35 3 and P3: the modifiers, Dig deeper, the leaders' plan and critiques, two plans → two fights, Secondaries, the rules
 const t35d=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,out={};
  const S=()=>X.S,L=()=>X.L,fr=()=>S().ships.find(s=>s.id==='fl400'),q=s=>document.querySelector('#arHc35 '+s);
  const O=L35.OPPORTUNITIES.vulnerable_freighter;
  // 3: same seed, same modifiers; 20 seeds, at least 8 different sets; no exclusive pair; subtle 3 never on the board
  const sig=sd=>L35.rollMods(O,sd).map(m=>m.k+(m.fake?'*':'')).sort().join();
  const sets=new Set(),ex=[];let sub3=true;
  for(let sd=1;sd<=20;sd++){sets.add(sig(sd));const m=L35.rollMods(O,sd).filter(x=>!x.fake);for(const a of m)for(const b of m)if(L35.MODS[a.k].ex.includes(b.k))ex.push(a.k+'/'+b.k);
    for(const x of L35.rollMods(O,sd))if(L35.MODS[x.k].subtle===3&&!x.fake&&L35.known(x))sub3=false;}
  out.mods=[sig(42)===sig(42),sets.size,ex.length,sub3];
  // Dig deeper: one hidden modifier revealed, one Intel spent
  let dsd=0;for(let sd=1;sd<200&&!dsd;sd++)if(L35.rollMods(O,sd).some(m=>!L35.known(m)))dsd=sd;
  B.seed=dsd;X.fn.showBoard(false);B.mods=L35.rollMods(O,dsd);B.intel=L35.TUNE.INTEL_START.get();X.fn.go('dossier');
  const hid0=B.mods.filter(m=>!L35.known(m)).length,i0=B.intel;q('[data-act="dig"]').click();
  out.dig=[hid0>0,B.mods.filter(m=>!L35.known(m)).length===hid0-1,B.intel===i0-1];
  // the leaders' plan: picking Steal fills the orders, the loadouts and the rules
  B.step=1;X.fn.enterBrief();q('[data-primary="steal"]').click();const P=B.plan;
  out.lplan=[P.wings.amber.exec.k,P.wings.amber.loadout.mags,P.wings.anvil.exec.k+':'+P.wings.anvil.exec.arg,P.wings.anvil.second&&P.wings.anvil.second.trig,P.roes.join()];
  // critiques: no bombs for a disable; a jump-in inside a ring
  const P2=L35.leaderPlan('steal');P2.wings.anvil.loadout.brask='pods';P2.wings.anvil.loadout.ollo='pods';
  out.crit=[L35.critique(P2,'anvil',[],{}),L35.critique(L35.leaderPlan('destroy'),'anvil',[],{}),L35.critique(L35.leaderPlan('destroy'),'dagger',[],{inRing:()=>true})];
  // two plans on one seed: two different fights
  const run=(prim,mut)=>{B.seed=555;B.mods=[];B.plan=L35.leaderPlan(prim);if(mut)mut(B.plan);X.fn.launch();for(let i=0;i<1200;i++)SIM.step();return SIM.stateHash();};
  const h1=run('destroy'),h2=run('steal'),h3=run('destroy');out.plans=[h1!==h2,h1===h3];
  // a Secondary: Anvil's engines job done → it suppresses the turrets
  B.seed=555;B.mods=[];B.plan=L35.leaderPlan('steal');X.fn.launch();const st=L().exec.anvil.k;let n=0;while(n++<4000&&L().exec.anvil.k==='disable'&&!S().over)SIM.step();
  out.sec=[st,L().exec.anvil.k,!!L().sec.anvil.adopted,L().subs[0].hp<=0];
  // Hold for My Signal: no shots until the signal (unless fired on)
  B.seed=555;B.mods=[];B.plan=L35.leaderPlan('crash');B.plan.roes=['signal'];X.fn.launch();
  let shots=0;for(let i=0;i<600;i++){SIM.step();shots+=S().proj.filter(p=>p.faction==='reb'&&p.age<0.06).length;}
  L35.giveSignal();let after=0;for(let i=0;i<1200;i++){SIM.step();after+=S().proj.filter(p=>p.faction==='reb'&&p.age<0.06).length;}
  out.signal=[L().signal,shots===0||S().ships.some(s=>s.faction==='reb'&&S().t-s.hitT<30),after>0];
  // Weapons Tight: a fighter with no subsystem to aim at holds fire on the freighter; one on the turrets may fire
  B.seed=555;B.mods=[];B.plan=L35.leaderPlan('pirate');X.fn.launch();const j=S().ships.find(s=>s.id==='joss');
  j.sub35=null;const c1=SIM.hooks.canFire(j,fr(),null);j.sub35='turrets';const c2=SIM.hooks.canFire(j,fr(),null);out.tight=[c1===false,c2===true];
  // Preservation: under its threshold a ship withdraws; its wing shows OFF PLAN
  B.seed=555;B.mods=[];B.plan=L35.leaderPlan('destroy');B.plan.roes=['preservation'];B.plan.presHull=0.3;X.fn.launch();
  const p=S().ships.find(s=>s.id==='wren');p.hull=p.maxHull*0.2;p.thinkT=99;SIM.step();SIM.step();
  out.pres=[p.beh&&p.beh.kind,p.beh&&p.beh.rule,L().off.dagger,X.fn.OV.tacticChip(F.wingOf('dagger'))];
  return out;
 });
 ok(t35d.mods[0]&&t35d.mods[1]>=8&&t35d.mods[2]===0&&t35d.mods[3],'HC35 3: modifiers: same seed same set, varied, no exclusive pair, subtle 3 hidden '+JSON.stringify(t35d.mods));
 ok(t35d.dig.every(Boolean),'HC35 3: Dig deeper reveals one and spends Intel '+JSON.stringify(t35d.dig));
 ok(t35d.lplan.join('|')==='board|board|disable:engines|done|tight','HC35 P3: picking a primary fills the leaders\' plan '+JSON.stringify(t35d.lplan));
 ok(/crack that hull/.test(t35d.crit[0])&&/watching our backs/.test(t35d.crit[1])===false&&/see us/.test(t35d.crit[2]),'HC35 P3: the leaders\' critiques '+JSON.stringify(t35d.crit));
 ok(t35d.plans[0]&&t35d.plans[1],'HC35 P3: the same seed with two plans gives two fights (and one plan replays) '+JSON.stringify(t35d.plans));
 ok(t35d.sec[0]==='disable'&&t35d.sec[1]==='suppress'&&t35d.sec[2]&&t35d.sec[3],'HC35 P3: a Secondary takes over when its trigger fires '+JSON.stringify(t35d.sec));
 ok(t35d.signal.every(Boolean),'HC35 8: Hold for My Signal: no fire until the signal (unless fired on) '+JSON.stringify(t35d.signal));
 ok(t35d.tight.every(Boolean),'HC35 P3: Weapons Tight '+JSON.stringify(t35d.tight));
 ok(t35d.pres[0]==='withdraw'&&t35d.pres[1]==='preservation35'&&t35d.pres[2]==='Preservation'&&/OFF PLAN: Preservation/.test(t35d.pres[3]),'HC35 P3: Preservation Order, and OFF PLAN '+JSON.stringify(t35d.pres));
 await ctx4.close();

 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r,sb,sc,drift,b4,hud,fly,feel,mom,ai,b5,hc,hc2,hc3,hc4,f1,f2,f3,f4,g1,g2,g3,g4,g5,h3,i1,i2,v1,t35a,t35b,t35c,t35d},null,0));
 if(fails.length){console.error('arena-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('arena-smoke OK');
})();
