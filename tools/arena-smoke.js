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
     for My Signal, Weapons Tight, Preservation and OFF PLAN; 9 the comms delay; 7 command points by phase; 10 every
     power after its delay, and the powers bar by DOM; 11 pilot requests (default, Preservation, the caps, off, keys);
     12 ejection pods; 13 the debrief's cause chain; 14 determinism with pauses; 15 the metrics record */
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
   FX.TUNE.spiralChance=2;const g3=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);F.kill(g3,null);tick(1);   // × 2: one flying straight spirals half as often (feedback 1 K3)
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
 const ctx4=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
 const pg4=await ctx4.newPage();
 pg4.on('pageerror',e=>errs.push('pageerror(hc35): '+e.message));
 pg4.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console(hc35): '+m.text());});
 await pg4.goto(base+'#arena');await pg4.waitForTimeout(800);
 // HC35 1: High Command is byte-identical with the hooks in: hc1–hc3 after 90 s, seed 7, one scripted order at 5 s.
 // The baselines were recorded on space-combat-testing before any 3.5 change (C-75)
 const HC35_BASE={hc1_nightfall:'6823701e',hc2_lastlight:'9a4e5999',hc3_meltdown:'ba50c171'};   // re-recorded for Boost Shields' cooldown and AUTO rule and mass-split collisions (feedback 1 K2, C-79)
 const t35a=await pg4.evaluate(()=>{
  const top=window.DBGarena;top.fn.openPicker();document.querySelector('#arRulesets [data-ruleset="hc"]').click();
  const H=top.hc,f=H.fn,SIM=H.SIM,out={hash:{}};
  const orders={hc1_nightfall:['dagger','attack',{type:'class',cls:'mote'}],hc2_lastlight:['ash','defend',{type:'ship',id:'lastlight'}],hc3_meltdown:['hammer','board',{type:'station',id:'reactor'}]};
  for(const id in orders){f.load(id,0,7);SIM.runFor(5);f.issue(...orders[id]);SIM.runFor(85);out.hash[id]=SIM.stateHash();}
  out.hooks=Object.keys(SIM.hooks).length;
  return out;
 });
 ok(JSON.stringify(t35a.hash)===JSON.stringify(HC35_BASE)&&t35a.hooks===0,'HC35 1: High Command unchanged by the hooks (hashes match the baselines; no hook set) '+JSON.stringify(t35a));
 // HC35 2: the loop by DOM, the Missions tab → the four planning windows → Launch → the mission → debrief → Plan again
 // (feedback 1 K6: the dossier now lives in the board's rail and holo-table)
 const t35b=await pg4.evaluate(()=>{
  const top=window.DBGarena;top.fn.openPicker();
  const out={};const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  out.rulesets=[...document.querySelectorAll('#arRulesets [data-ruleset-item] b')].map(e=>e.textContent);
  document.querySelector('#arRulesets [data-ruleset="hc35"]').click();
  const X=top.hc35,B=X.B;X.B.seed=4242;X.fn.showBoard(false);
  out.board=[B.screen,!!q('.bf-board .bf-card.is-sel'),qa('.sr-btn--primary').length,!!q('canvas[data-portrait="cass"]')];
  out.dossier=[B.screen,!!q('canvas[data-target]'),!!q('[data-act="dig"]')];
  q('[data-act="brief"]').click();out.step1=[B.screen,B.step,qa('[data-primary]').length,qa('.h35-ocard.is-locked').length,!q('[data-act="launch"]')];   // Launch only on step 4
  q('[data-primary="destroy"]').click();q('[data-act="next"]').click();out.step1b=[B.step,B.part,qa('[data-opt]').length,qa('[data-roe]').length];   // window 1, part 2: the secondaries
  q('[data-act="next"]').click();out.step2=[B.step,qa('[data-opt]').length,qa('[data-roe]').length];
  q('[data-act="next"]').click();out.step3=[B.step,qa('.h35-wcol').length,qa('[data-role]').length,qa('button[data-lo]').length,qa('.h35-aslot').length];
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
 ok(t35b.board[0]==='board'&&t35b.board[1]&&t35b.board[2]===1&&t35b.board[3]&&t35b.dossier[0]==='board'&&t35b.dossier[1]&&t35b.dossier[2],'HC35 2: the board (one gold primary), its holo freighter and Dig deeper '+JSON.stringify([t35b.board,t35b.dossier]));
 ok(t35b.step1[0]==='brief'&&t35b.step1[1]===1&&t35b.step1[2]===7&&t35b.step1[3]===4&&t35b.step1b.join()==='1,2,7,0'&&t35b.step2.join()==='2,0,5'&&t35b.step3[0]===3&&t35b.step3[1]===3&&t35b.step3[2]===9&&t35b.step3[3]===9&&t35b.step3[4]===3&&t35b.step4[0]===4&&t35b.step4[1]===3&&t35b.step4[2]&&t35b.step4[3]===null,
  'HC35 2: the four briefing steps, window 1 in two parts '+JSON.stringify([t35b.step1,t35b.step1b,t35b.step2,t35b.step3,t35b.step4]));
 ok(t35b.wings.join('|')==='cross,cross,talon|talon,brickbat,brickbat|cross,talon,talon,brickbat','HC35 2: the wings as the designer listed them '+JSON.stringify(t35b.wings));
 ok(t35b.live[0]==='live'&&t35b.live[1]==='hc35_freighter'&&t35b.live[2]===10&&t35b.live[3]&&t35b.live[4]&&t35b.end.every(Boolean),'HC35 2: Launch, the mission, the debrief '+JSON.stringify([t35b.live,t35b.end]));
 ok(t35b.again[0]==='brief'&&t35b.again[1]===1&&t35b.again[2]&&t35b.again[3]==='destroy'&&t35b.again[4],'HC35 2: Plan again keeps the seed and the plan (window 1, K6) '+JSON.stringify(t35b.again));
 ok(!t35b.campaign,'HC35 1: no campaign save after a 3.5 run');
 // HC35 5–7: the target, each primary, the phases (from scripted setups: no modifiers, a fixed seed)
 const t35c=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,out={};
  L35.N.REQ_OFF=1;   // the target and the primaries on their own: no pilot requests (P5) but the surrender's
  const rt0=L35.N.RES_THREAT;L35.N.RES_THREAT=0;   // and no hail but Pirate's: the crew fold about 20 s into any fight (C-80)
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
  out.bombs=[until(()=>L().engOut,60),Math.round(S().t)];   // (engines out: she crawls on her thrusters, after playtest 2)
  // with her engines out she doesn't jump (put by its jump point); inside the pull it falls in
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
  L35.N.REQ_OFF=0;L35.N.RES_THREAT=rt0;go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});   // the surrender's answer: take the cargo
  until(()=>{const q=L().req.open.find(x=>x.k==='surrender'&&x.state==='open');if(q)L35.answerReq(q.id,'take');return L().prim.state!=='live';},200);res.pirate=L().prim.state;L35.N.REQ_OFF=1;L35.N.RES_THREAT=0;
  go('strip',{anvil:{k:'disable',arg:'engines'},amber:{k:'haul'},dagger:{k:'suppress',arg:'escorts'}},{lo:{mags:'pods'}});until(()=>L().prim.state!=='live',200);res.strip=L().prim.state;
  go('tag',{amber:{k:'tag'},dagger:{role:'home'},anvil:{role:'home'}},{tagger:'kit'});until(()=>L().prim.state!=='live',300);res.tag=[L().prim.state,L().tag.planted];
  go('ambush',{dagger:{k:'ambush'},amber:{k:'ambush'},anvil:{k:'disable',arg:'engines'}});until(()=>L().responseAt!=null,60);L().responseAt=S().t+1;until(()=>L().prim.state!=='live',200);res.ambush=[L().prim.state,L().respKills];
  out.res=res;
  // crash, with the disable timed inside the pull (the signal rule comes with P3)
  go('crash',{anvil:{k:'hold'},dagger:{k:'hold'},amber:{k:'defend',arg:'anvil'}});
  until(()=>{const f=fr();return f.alive&&Math.hypot(f.x-L().planet.x,f.y-L().planet.y)<L().planet.pull;},200);L().exec.anvil={k:'disable',arg:'power'};   // as it enters the pull (its lane only grazes it)
  {const f=fr();f.hull=Math.min(f.hull,f.maxHull*0.78);const pw=L().subs.find(x=>x.k==='power');pw.hp=Math.min(pw.hp,30);}   // after playtest 2 the power plant kills her: its hull already worn open, the plant hurt
  until(()=>L().prim.state!=='live',120);res.crash=L().prim.state;
  // 7: the phases: detection to 100 → Phase 2; the array killed mid-send: no response; Remote: none either
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L().detect=99.5;
  const e=S().ships.find(s=>s.role35==='escort'),r=S().ships.find(s=>s.faction==='reb'&&s.alive);r.x=e.x+1800;r.y=e.y;r.px=r.x;r.py=r.y;L().detect=99.9;SIM.step();SIM.step();
  out.phase=[L().phase,L().alarmWhy,!!L().distress];
  const cm=L().subs.find(x=>x.k==='comms');F.applyDamage(fr(),140,true,true,{x:fr().x,y:fr().y,by:null,aimSub:'comms'});
  until(()=>false,30);out.phase.push(cm.hp<=0,L().distress.cut,L().responseAt);
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{mods:[{k:'remote',hidden:false}]});L35.alarm('fired');until(()=>false,40);out.remote=[L().distress&&L().distress.landed,L().responseAt];
  L35.N.REQ_OFF=0;L35.N.RES_THREAT=rt0;return out;
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
  L35.N.REQ_OFF=1;   // the plan on its own: no pilot requests (P5)
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
  L35.N.REQ_OFF=0;return out;
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
 // HC35 9–10 (P4): the comms delay, command points by phase, and every power doing its job after its delay
 const t35e=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  N.REQ_OFF=1;   // the powers on their own: no pilot requests (P5)
  const S=()=>X.S,L=()=>X.L,fr=()=>S().ships.find(s=>s.id==='fl400'),by=id=>S().ships.find(s=>s.id===id);
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=o.assets||[];B.plan.assetAt=o.assetAt||{};B.plan.roes=o.roes||[];X.fn.launch();L().cp=o.cp!=null?o.cp:9;};
  const landed=()=>L().txLog.every(t=>t.landed!=null);
  const hold={dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}};
  // 9: a transmission lands no earlier than the formula; the Comms Relay shortens it; Ion Storm doubles it
  const delayOf=o=>{go('destroy',hold,o);const w=F.wingOf('dagger'),c=F.wingCentre(w),want=N.COMMS_BASE+Math.hypot(c.x-L().relay.x,c.y-L().relay.y)/N.COMMS_SPD+L35.ackOf(by('joss'));
    const t0=S().t;L35.use('retreat');until(()=>L().exec.dagger.k==='withdraw',40);return [+(want*(o&&o.mods?N.ION_K:1)).toFixed(2),+(S().t-t0).toFixed(2)];};
  const d0=delayOf(),d1=delayOf({assets:['relay'],assetAt:{relay:{x:3000,y:1400}}}),d2=delayOf({mods:[{k:'ion',hidden:false}]});
  out.delay=[d0,d1,d2,d0[1]>=d0[0]-0.01&&d0[1]<=d0[0]+0.11,d1[1]<d0[1]-1,Math.abs(d2[1]-d0[1]*N.ION_K)<0.25];
  N.COMMS_OFF=1;go('destroy',hold);L35.use('retreat');SIM.step();out.delay.push(L().exec.dagger.k==='withdraw');N.COMMS_OFF=0;
  // 7 (P4): command points: a phase's allowance, what's left lost at the next
  go('destroy',hold,{cp:N.CP1});const c1=L().cp;L35.use('broadcast');const c1b=L().cp;L35.alarm('fired');const c2=L().cp;L35.setPhase(3);
  out.cp=[c1===N.CP1,c1b===N.CP1-N.C_BROADCAST,c2===N.CP2,L().cp===N.CP3,L35.use('broadcast').ok===false];
  go('destroy',hold,{cp:0});out.cp.push(/command points/.test(L35.use('mark',{id:'fl400'}).why||''));
  // 10: each power, after its delay, does its job
  const P={};
  go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{role:'home'}},{roes:['signal']});
  const firedEarly=()=>S().proj.some(p=>p.faction==='reb');until(()=>false,3);
  const sg=L35.use('signal'),sgAt=Math.max(...sg.tx.map(t=>t.at));P.signal=[!L().signal&&L().phase===1&&!firedEarly(),until(()=>L().signal,30),L().phase===2,S().t>=sgAt-0.01,L35.use('signal').ok===false];
  go('destroy',hold);L35.use('abort');P.abort=[until(()=>!!S().over,240),S().over&&S().over.outcome];
  go('destroy',hold);const r0=L().resolve,j0=by('joss').pilot.cool;L35.use('broadcast');until(landed,30);P.broadcast=[L().resolve<=r0-N.BROADCAST_RES+1,by('joss').pilot.cool>j0,L().exposure];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  L35.use('name',{ship:'wren',act:'pull'});L35.use('name',{ship:'petra',act:'stay'});L35.use('name',{ship:'joss',act:'focus',target:'esc1'});until(landed,30);until(()=>false,1);
  P.name=[!!L().pull.wren,by('wren').beh.kind==='withdraw',!!L().stayIn.petra,by('joss').beh.kind==='engage'&&by('joss').beh.target==='esc1'];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L35.use('mark',{id:'fl400',sub:'turrets'});until(landed,30);until(()=>false,1);
  P.mark=[!!L().markW.dagger,F.wingShips(F.wingOf('dagger')).some(s=>s.beh.target==='fl400'&&s.beh.why==='the marked target')];
  go('destroy',{dagger:{k:'hold'},anvil:{k:'disable',arg:'engines'},amber:{role:'home'}});L35.use('exec',{wing:'dagger',k:'suppress',arg:'escorts'});
  L().subs.find(x=>x.k==='engines').hp=N.ENG_HP*0.1;L35.use('exec',{wing:'anvil',k:'destroy'});until(landed,30);
  const pb=!!L().pushback&&L().exec.anvil.k==='disable';L35.use('insist');until(landed,30);
  P.exec=[L().exec.dagger.k==='suppress',pb,L().exec.anvil.k==='destroy'];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'reserve',k:'hold'}});const rt=L35.use('reserve',{});const rAt=rt.tx[0].at;
  P.reserve=[until(()=>!!F.wingOf('amber'),40),S().t>=rAt+N.ARRIVE_SPOOL-0.01,F.wingShips(F.wingOf('amber')).length===4];
  go('destroy',hold,{assets:['ram']});const h0=fr().hull;L35.use('ram',{id:'fl400'});P.ram=[until(()=>!!by('ram35'),40),until(()=>!by('ram35').alive,60),fr().hull<=h0-N.RAM_CORE+0.01];   // the core's share (K2: the struck subsystem takes RAM_DMG)
  go('destroy',hold,{assets:['nuke']});const e1=by('esc1');L35.use('ram',{id:'esc1'});until(()=>!!by('ram35')&&!by('ram35').alive,90);P.nuke=[(L().blasts||[]).some(b=>b.kind==='nuke'),!e1.alive||e1.hull<e1.maxHull];
  const hegHull=()=>S().ships.filter(s=>s.faction==='heg').reduce((a,s)=>a+Math.max(0,s.hull)+(s.id==='fl400'?L().subs.reduce((b,x)=>b+Math.max(0,x.hp),0):0),0);
  go('destroy',hold,{assets:['fireship'],assetAt:{fireship:{x:700,y:2450}}});until(()=>false,6);const f0=hegHull();L35.use('fireship');until(landed,30);P.fireship=[!L().props.fireship.live,hegHull()<f0-20];
  go('destroy',hold,{assets:['mines'],assetAt:{mines:{x:700,y:2450}}});until(()=>false,6);const m0=hegHull();L35.use('mines');until(landed,30);P.mines=[!L().props.mines.live,hegHull()<m0-10];
  // the Interdictor: the freighter spooled at its jump point can't go while it's up, and nor can your ships
  go('destroy',hold,{assets:['buoy']});const f1=fr(),j=L().fjump;f1.x=j.x;f1.y=j.y;f1.px=f1.x;f1.py=f1.y;L().leg=L().lane.length-1;L35.use('buoy');until(()=>!!L35.interdictOn(),30);
  const b0=S().t;until(()=>!fr().alive,L().interdict.until-b0-0.5);const held=fr().alive&&L().spool!=null&&S().t-L().spool>L35.TUNE.JUMP_SECS.get();
  const joss=by('joss');joss.x=L().interdict.x;joss.y=L().interdict.y;const mine=L35.fn.canJump(joss);
  P.buoy=[held,mine===false,until(()=>!fr().alive,20),L().escaped];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{assets:['tug']});L35.use('tug',{ship:'wren'});P.tug=[until(()=>!!by('tug35'),40),until(()=>!!by('wren').towed35,90),until(()=>by('wren').jumped,150)];
  go('destroy',hold,{assets:['spoof']});L35.use('spoof',{id:'esc1'});until(landed,30);until(()=>false,1);P.spoof=[S().ships.filter(s=>s.role35==='escort').every(s=>s.spoof35!=null&&s.beh.why==='following spoofed orders'),L35.use('spoof',{id:'esc1'}).ok===false];
  go('destroy',hold,{assets:['pirates']});L35.use('pirates');P.pirates=[until(()=>S().ships.filter(s=>s.prop35==='pirate').length===N.PIRATE_N,40)];
  go('destroy',hold,{mods:[{k:'insider',hidden:false}]});const hasSl=L35.powers().some(p=>p.k==='sleeper');L35.use('sleeper',{act:'engines'});until(landed,30);P.sleeper=[hasSl,!!L().engOut,L().burned];
  out.P=P;
  // the bar by DOM: the powers as skill icons, a targeting pill, the comms queue
  go('destroy',hold,{assets:['ram'],cp:N.CP1});window.SR_ARENA_HC.api.syncHud(true);
  const bar=document.getElementById('hcCmds'),btn=k=>bar.querySelector('[data-p35="'+k+'"]');
  out.dom=[!bar.hidden,!!btn('ram'),!!btn('abort'),!btn('tug'),/Powers/.test(bar.querySelector('.hc-cmds__title').textContent),bar.querySelectorAll('#hcCp .hc-cp__pips i').length===N.CP1];
  btn('mark').click();out.dom.push(!!bar.querySelector('.h35-pickpill'));
  X.fn.OV.mapClick({x:fr().x,y:fr().y},{},fr());window.SR_ARENA_HC.api.syncHud(true);out.dom.push(!bar.querySelector('.h35-pickpill'),bar.querySelectorAll('.h35-tx').length===L().tx.length&&L().tx.length>0);
  N.REQ_OFF=0;return out;
 });
 ok(t35e.delay[3]&&t35e.delay[4]&&t35e.delay[5]&&t35e.delay[6],'HC35 9: comms delay: the formula, the relay shortens it, Ion Storm doubles it, off is instant '+JSON.stringify(t35e.delay));
 ok(t35e.cp.every(Boolean),'HC35 7: command points reset at each phase '+JSON.stringify(t35e.cp));
 for(const k in t35e.P)ok(t35e.P[k].every(x=>x===true||x==='aborted'),'HC35 10: '+k+' does its job after its delay '+JSON.stringify(t35e.P[k]));
 ok(t35e.dom.every(Boolean),'HC35 10: the powers bar, targeting, the comms queue '+JSON.stringify(t35e.dom));
 // HC35 11–12 (P5): pilot requests and ejection
 const t35f=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id);
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    B.plan.assets=o.assets||[];B.plan.roes=o.roes||[];X.fn.launch();};
  const hold={dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},openOf=(k,who)=>L().req.open.find(q=>q.k===k&&(!who||q.who===who));
  // 11: a hit pilot asks; no answer: they do what their persona says
  go('destroy',hold);const w=by('wren');w.hull=w.maxHull*0.35;until(()=>!!openOf('hit','wren'),5);const q=openOf('hit','wren');
  out.hit=[!!q,q&&q.def];until(()=>q.state==='done',N.REQ_SECS+2);
  out.hit.push(q.by==='default',q.answer===q.def,q.def==='pull'?!!L().pull.wren:!!L().stayIn.wren,X.fn.OV&&true);
  // an answer overrides Preservation Order, for that pilot only
  go('destroy',hold,{roes:['preservation']});L().plan.presHull=0.3;const pe=by('petra');pe.hull=pe.maxHull*0.25;
  until(()=>!!openOf('hit','petra'),5);const qp=openOf('hit','petra');const r=L35.answerReq(qp.id,'stayin');
  const wr=by('wren');wr.hull=wr.maxHull*0.25;until(()=>qp.state==='done',20);until(()=>false,1.5);
  out.pres=[r.ok,!!L().stayIn.petra,pe.alive&&!(pe.beh&&pe.beh.rule==='preservation35'),wr.beh&&wr.beh.rule==='preservation35'];
  // the open cap, the gap and the mission cap hold
  const crowd=()=>{for(const s of S().ships)if(s.faction==='reb'&&s.wing)s.hull=s.maxHull*0.35;};
  const g0=N.REQ_GAP,p0=N.REQ_PEND;N.REQ_PEND=60;
  go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'hold'}});crowd();let most=0;until(()=>{most=Math.max(most,L().req.open.filter(x=>x.state==='open').length);return false;},50);
  const t0s=L().req.log.filter(x=>x.by!=='off'&&x.by!=='unasked'&&x.k!=='surrender').map(x=>x.t0);   // the hail ignores the gap and the caps (K2)
  out.gap=[t0s.length>=2,t0s.every((t,i)=>!i||t-t0s[i-1]>=N.REQ_GAP-0.01),most<=N.REQ_OPEN];
  N.REQ_GAP=0;go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'hold'}});crowd();most=0;until(()=>{most=Math.max(most,L().req.open.filter(x=>x.state==='open').length);return false;},60);
  out.cap=[most===N.REQ_OPEN,L().req.log.filter(x=>(x.by==='default'||x.by==='player')&&x.k!=='surrender').length===N.REQ_CAP];
  N.REQ_GAP=g0;N.REQ_PEND=p0;
  // Requests off: none
  N.REQ_OFF=1;go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'hold'}});crowd();until(()=>false,30);out.off=[L().req.log.length===0,L().req.open.length===0];N.REQ_OFF=0;
  // the A/B/C keys answer the newest
  go('destroy',hold);by('petra').hull=by('petra').maxHull*0.35;until(()=>!!openOf('hit','petra'),5);const qk=openOf('hit','petra');   // (a wingman: since K4 a leader's Field Repair heals it past the threshold)
  window.SR_ARENA_HC.api.syncHud(true);const card=document.querySelector('.h35-reqs [data-req="'+qk.id+'"]');
  const sk=(code,shift)=>document.dispatchEvent(new KeyboardEvent('keydown',{key:shift?'@':code.slice(-1).toLowerCase(),code,shiftKey:!!shift,bubbles:true}));
  sk('Digit2',true);const early=qk.state==='open';   // within 400 ms of the card: swallowed
  X.B.reqShown[qk.id]-=500;sk('KeyC');const third=qk.state==='open'&&(!!X.B.pick||L().tx.length>0||!!X.B.choose);   // C: the third power, not an answer
  X.B.pick=null;X.B.choose=null;sk('Digit2',true);out.keys=[!!card,early,third,qk.state==='sent',qk.answer===qk.answers[1]];
  // 12: ejection: a pod; the Tug collects it; an uncollected pod is captured, and the debrief says so
  const e0=N.EJECT_P;N.EJECT_P=1;
  go('destroy',hold,{assets:['tug']});F.kill(by('wren'),null);SIM.step();const pod=L().pods[0];
  out.pod=[!!pod,pod&&pod.state==='drift'];const u=L35.use('tug',{pod:pod.id});until(()=>pod.state!=='drift',90);out.pod.push(u.ok,pod.state==='aboard',pod.by==='tug35');
  go('destroy',hold);F.kill(by('wren'),null);SIM.step();const p2=L().pods[0];until(()=>p2.state!=='drift',N.POD_SECS+2);
  L35.use('retreat');X.fn.run(300);const db=document.querySelector('#arHc35 .h35-debrief');
  out.captured=[p2.state==='captured',!!db&&/captured/.test(db.textContent)];
  N.EJECT_P=e0;
  return out;
 });
 ok(t35f.hit.every(x=>x===true||x==='pull'||x==='stayin'),'HC35 11: a hit pilot asks, and times out to the persona default '+JSON.stringify(t35f.hit));
 ok(t35f.pres.every(Boolean),'HC35 11: an answer overrides Preservation Order for that pilot only '+JSON.stringify(t35f.pres));
 ok(t35f.gap.every(Boolean)&&t35f.cap.every(Boolean),'HC35 11: the gap, the open cap and the mission cap hold '+JSON.stringify([t35f.gap,t35f.cap]));
 ok(t35f.off.every(Boolean),'HC35 11: Requests off raises none '+JSON.stringify(t35f.off));
 ok(t35f.keys.every(Boolean),'HC35 11 / K2 20: Shift+1–3 answer the newest request, not within 400 ms; C stays the third power '+JSON.stringify(t35f.keys));
 ok(t35f.pod.every(Boolean)&&t35f.captured.every(Boolean),'HC35 12: a pod; the Tug collects it; an uncollected one is captured in the debrief '+JSON.stringify([t35f.pod,t35f.captured]));
 // HC35 13–15 (P6): the debrief's cause chain, determinism with pauses, the metrics record
 const t35g=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    B.plan.assets=o.assets||[];B.plan.roes=o.roes||[];X.fn.launch();};
  // 13: a scripted loss to point defence with no Suppress order gives that line
  N.REQ_OFF=1;go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  for(const e of S().ships)if(e.role35==='escort'){e.alive=false;e.jumped=true;}
  L35.alarm('fired');const w=by('wren'),f=fr();w.x=f.x+600;w.y=f.y+600;w.px=w.x;w.py=w.y;w.segs.F.val=0;w.segs.R.val=0;w.arm=0;w.hull=0.05;for(const a in w.abCd)w.abCd[a]=1e9;   // no field repair
  until(()=>{if(w.alive){const g=fr();w.x=g.x+600;w.y=g.y+600;w.px=w.x;w.py=w.y;w.segs.F.val=0;w.segs.R.val=0;}return !w.alive;},30);SIM.step();const d=L().deaths.find(x=>x.id==='wren');   // held in the turrets' reach
  L35.use('retreat');X.fn.run(300);const db=document.querySelector('#arHc35 .h35-debrief'),why=[...document.querySelectorAll('#arHc35 .h35-why p')].map(p=>p.textContent);
  out.why=why;out.pd=[!!d&&d.by==='pd',!!db,why.some(t=>/went down to the freighter's guns\. Nobody was told to take out the turrets/.test(t)),why.length>=3&&why.length<=6];
  N.REQ_OFF=0;
  // 14: the same seed, plan, powers and answers at the same ticks, with pauses and the HUD between: the same fight
  const runA=pause=>{go('steal',{anvil:{k:'disable',arg:'engines'},amber:{k:'board'},dagger:{k:'defend',arg:'anvil'}},{seed:4242,assets:['mines'],roes:['preservation']});L().cp=9;
    for(let i=0;i<900&&!S().over;i++){
      if(i===120)L35.use('mark',{id:'fl400',sub:'engines'});if(i===300)L35.use('broadcast');
      for(const q of L().req.open)if(q.state==='open')L35.answerReq(q.id,q.answers[q.answers.length-1]);
      if(pause&&i%40===0){API.setSpeed(0);API.syncHud(true);X.fn.render();X.fn.OV.syncHud(performance.now());X.fn.OV.tick(performance.now());API.setSpeed(2);}
      SIM.step();}
    return [SIM.stateHash(),L().cause.length,L().req.log.length];};
  const h1=runA(false),h2=runA(true),h3=runA(true);out.det=[h1[0]===h2[0]&&h2[0]===h3[0],h1[1]===h2[1],h1[2]===h2[2],h1];
  // 15: the record carries every §10 field
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L35.use('retreat');X.fn.run(300);
  const rec=A_metrics_last();document.querySelector('#arHc35 [data-act="again"]').click();
  const keys=['seed','mods','primary','optionals','roes','wings','assets','briefSecs','phaseSecs','speedSecs','pauses','pausedSecs','powers','cpUnspent','requests','secondaries','offPlanSecs','outcome','loot','losses','pods','planAgain','commsOff','requestsOff'];
  out.metrics=[keys.filter(k=>!(k in rec)),rec.ruleset==='hc35',rec.planAgain===true,Array.isArray(rec.speedSecs)&&rec.speedSecs.length===4,['raised','answered','defaulted'].every(k=>k in rec.requests)];
  function A_metrics_last(){return B.metrics[B.metrics.length-1];}
  // the keys (§7.6): Space pauses, P the plan overlay, Z the first power, Esc cancels its targeting
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L().cp=9;
  const key=k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
  const ov0=B.planOverlay;key('p');const ov1=B.planOverlay;key(' ');const paused=SIM.TIMESCALES[window.SR_ARENA_HC.api.A.speed]===0;key(' ');
  const first=X.fn.OV.cmdsHtml().match(/data-p35="([a-z]+)"/)[1];key('x');const armed=!!B.pick||!!B.choose||L().txLog.length>0;key('Escape');
  out.keys=[ov1!==ov0,paused,first==='retreat',armed,!B.pick&&!B.choose];
  return out;
 });
 ok(t35g.pd.every(Boolean),'HC35 13: a loss to point defence with no Suppress order: that cause line '+JSON.stringify(t35g.pd));
 ok(t35g.det[0]&&t35g.det[1]&&t35g.det[2],'HC35 14: determinism: same seed, plan, powers and answers, pauses between: the same hash '+JSON.stringify(t35g.det));
 ok(!t35g.metrics[0].length&&t35g.metrics.slice(1).every(Boolean),'HC35 15: the record carries every §10 field '+JSON.stringify(t35g.metrics));
 ok(t35g.keys.every(Boolean),'HC35 P6: the keys: Space, P, the powers, Esc '+JSON.stringify(t35g.keys));
 // HC35 K0 (feedback 1, test 15): the flight recorder. A scripted run through the UI (powers with targets, an
 // answered request, one timed out, a pause, a speed change), saved from the debrief as a download, re-simulated
 // offline by tools/run-report.js with every checkpoint matching
 await pg4.evaluate(()=>{const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,API=window.SR_ARENA_HC.api;L35.N.REQ_OFF=0;
  B.seed=321;X.fn.showBoard(false);B.mods=L35.rollMods(L35.OPPORTUNITIES.vulnerable_freighter,321);B.plan=null;B.step=1;X.fn.enterBrief();
  document.querySelector('#arHc35 [data-primary="steal"]').click();B.plan.assets=['mines','ram'];B.step=4;X.fn.render();document.querySelector('#arHc35 [data-act="launch"]').click();
  let answered=0;
  for(let i=0;i<6000&&!SIM.S.over;i++){
    if(i===60)L35.use('mark',{id:'fl400',sub:'engines'});if(i===200)L35.use('ram',{id:'fl400'});if(i===400)L35.use('mines');
    if(i===500){API.setSpeed(0);API.setSpeed(3);}
    const q=X.L.req.open.find(x=>x.state==='open');if(q&&!answered&&SIM.S.t-q.t0>2){L35.answerReq(q.id,q.answers[0]);answered=1;}
    SIM.step();}
  X.fn.run(1);});
 const [dl]=await Promise.all([pg4.waitForEvent('download'),pg4.click('#arHc35 [data-act="saverec"]')]);
 const recFile=await dl.path(),recName=dl.suggestedFilename();
 const RR=require('./run-report.js'),rec=JSON.parse(require('fs').readFileSync(recFile,'utf8'));
 const rp=RR.replay(rec),rtxt=RR.report(rp);
 const reqAns=rp.L.req.log.find(q=>q.by==='player'),reqDef=rp.L.req.log.find(q=>q.by==='default');
 const t35k0={name:recName,size:JSON.stringify(rec).length,cp:rec.cp.length,checked:rp.tr.checked,ok:rp.ok,end:rp.endOk,inputs:rec.inputs.map(x=>x[1]),speeds:rec.speeds.length,
   ans:!!reqAns&&new RegExp(reqAns.k+'\\*\\* · [^\\n]*\\(you, at '+RR.clock_(reqAns.sentT)).test(rtxt),def:!!reqDef&&/timed out: their default/.test(rtxt)};
 // an older SIM_VERSION warns, it doesn't crash
 const old=JSON.parse(JSON.stringify(rec));old.simVersion.hc35='hc35-0';const ro=RR.replay(old);t35k0.warn=ro.warn.some(w=>/hc35-0/.test(w))&&/⚠/.test(RR.report(ro));
 // a High Command run records and replays too; the Runs group lists the last ten
 Object.assign(t35k0,await pg4.evaluate(()=>{const top=window.DBGarena;top.fn.openPicker();document.querySelector('#arRulesets [data-ruleset="hc"]').click();
  const H=top.hc,f=H.fn,SIM=H.SIM;f.load('hc2_lastlight',0,11);SIM.runFor(3);f.issue('ash','defend',{type:'ship',id:'lastlight'});
  for(let i=0;i<1200&&!SIM.S.over;i++)SIM.step();f.load('hc1_nightfall',0,5);   // leaving it: an abandoned record
  const st=window.SR_FLIGHT.stored(),last=st[st.length-1];window.SR_ARENA_HC.api.buildPanel();
  return {hcRec:last,runs:st.length,panel:document.querySelectorAll('#hcPanelBody .hc-run [data-act^="run:"]').length};}));
 const rh=RR.replay(t35k0.hcRec);t35k0.hc=[t35k0.hcRec.ruleset==='hc',t35k0.hcRec.unfinished===true,rh.ok,rh.tr.checked];delete t35k0.hcRec;
 ok(/^sr-run-\d{4}-\d\d-\d\d-\d{4}-vulnerable_freighter-321\.json$/.test(t35k0.name)&&t35k0.size<1e6,'HC35 K0: the debrief saves the flight record '+JSON.stringify([t35k0.name,t35k0.size]));
 ok(t35k0.ok&&t35k0.end&&t35k0.checked===t35k0.cp&&t35k0.cp>=40,'HC35 K0: the harness re-simulates it, every checkpoint matching '+JSON.stringify([t35k0.cp,t35k0.checked,t35k0.end]));
 ok(t35k0.inputs.filter(k=>k==='35.use').length===3&&t35k0.inputs.includes('35.answerReq')&&t35k0.speeds>=2,'HC35 K0: the inputs and speeds are recorded '+JSON.stringify([t35k0.inputs,t35k0.speeds]));
 ok(t35k0.ans&&t35k0.def,'HC35 K0: the report lists the answered request at its time, and the timed-out one '+JSON.stringify([t35k0.ans,t35k0.def]));
 ok(t35k0.warn,'HC35 K0: an older SIM_VERSION warns, not crashes');
 ok(t35k0.hc.every(x=>x===true||x>0)&&t35k0.runs>=1&&t35k0.runs<=10&&t35k0.panel===t35k0.runs,'HC35 K0: High Command records and replays; the Runs group lists the last ten '+JSON.stringify([t35k0.hc,t35k0.runs,t35k0.panel]));
 // HC35 K1 (feedback 1, test 1): true scale; past ICON_PX a fighter is a screen-constant icon; the freighter stays art
 const t35k1=await pg4.evaluate(()=>{window.DBGarena.fn.openPicker();document.querySelector('#arRulesets [data-ruleset="hc35"]').click();
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,API=window.SR_ARENA_HC.api,F=window.SIMHC.fn;
  B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';X.fn.launch();
  const t=F.byId('petra'),fr=F.byId('fl400'),out={boost:[],talon:[],fr:[],rad:[]};
  const open=API.cam.z;out.open=[+open.toFixed(3),Math.round(API.shipLenW(F.byId('joss'))*open)];
  for(const z of [0.6,0.18,0.12,0.09]){API.camTo(t.x,t.y,z);API.syncHud(true);out.boost.push(API.iconBoost());out.talon.push(+API.artK(t).toFixed(2));out.fr.push(+API.artK(fr).toFixed(2));out.rad.push(+(API.uiR(t)*API.cam.z).toFixed(1));}
  return out;});
 ok(t35k1.boost.every(b=>b===1),'HC35 K1: iconBoost is 1 at every zoom '+JSON.stringify(t35k1.boost));
 ok(t35k1.talon[0]===1&&t35k1.talon.slice(1).every(k=>k===0)&&t35k1.fr.every(k=>k===1),'HC35 K1: a Talon becomes an icon below the threshold; the freighter is still art there '+JSON.stringify([t35k1.talon,t35k1.fr]));
 ok(new Set(t35k1.rad.slice(1)).size===1,'HC35 K1: the icon is the same size on screen at three zooms '+JSON.stringify(t35k1.rad));
 ok(Math.abs(t35k1.open[1]-30)<=2,'HC35 K1: the mission opens with fighters about 30 px long '+JSON.stringify(t35k1.open));
 // HC35 K2 (feedback 1, tests 2–5, 16, 19, 21; 20 is in HC35 11 above; 14 is HC35 1's re-recorded baselines):
 // boarding, the ram, turret tracking, Boost Shields, course keeping, Pirate end to end, the stuck guard
 const t35k2=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};if(e.second)B.plan.wings[w].second=e.second;}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=o.assets||[];B.plan.assetAt=o.assetAt||{};B.plan.roes=o.roes||[];if(o.tagger)B.plan.tagger=o.tagger;
    const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);L().cp=9;};   // a plan that can't launch would test the last mission
  const dA=(a,b)=>Math.abs(((a-b)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI)*180/Math.PI;
  const ell=(t,p)=>{const A=F.hullAxes(t),c=Math.cos(-t.h),sn=Math.sin(-t.h),lx=(p.x-t.x)*c-(p.y-t.y)*sn,ly=(p.x-t.x)*sn+(p.y-t.y)*c;return (lx/A.a)**2+(ly/A.b)**2;};
  const rt0=N.RES_THREAT;N.REQ_OFF=1;N.RES_THREAT=0;   // no hail but Pirate's (C-80)
  // 2: boarding. A scripted disabled freighter; Mags (a Boarding party) in a Disable wing, 3,000 off its left side
  go('steal',{amber:{k:'disable',arg:'engines'},dagger:{role:'home'},anvil:{k:'hold'}},{lo:{mags:'board'}});   // (Anvil's bombs: a Steal plan needs them to launch)
  {const f=fr();L().subs[0].hp=0;L().disabled=true;L().spool=null;L().drift={vx:f.vx,vy:f.vy};
   const m=by('mags'),a=f.h+Math.PI/2;m.x=f.x+Math.cos(a)*3000;m.y=f.y+Math.sin(a)*3000;m.px=m.x;m.py=m.y;
   const side0=Math.cos(f.h)*(m.y-f.y)-Math.sin(f.h)*(m.x-f.x)>=0?1:-1,tb=S().t;let step=0,inside=false,docked=null,shots=0;
   const hs=F.hitShip;F.hitShip=function(t,o){if(o==='mags'&&t.id==='fl400')shots++;return hs.apply(this,arguments);};
   for(let i=0;i<30*20&&docked==null;i++){const x=m.x,y=m.y;SIM.step();step=Math.max(step,Math.hypot(m.x-x-f.vx*SIM.TICK/1000,m.y-y-f.vy*SIM.TICK/1000));if(ell(f,m)<=1)inside=true;if(m.dock35)docked=S().t;}
   until(()=>false,5);for(let i=0;i<40;i++){SIM.step();if(ell(f,m)<=1)inside=true;}F.hitShip=hs;
   out.board=[docked!=null,m.dockSide===side0,!S().events.some(e=>e.t>=tb&&e.t<=(docked==null?1e9:docked)+0.1&&e.kind==='collide'&&/Mags/.test(e.text)),step<=N.DOCK_SNAP,shots===0&&!!m.dock35,!inside,L().board>0,Math.round(docked),Math.round(step)];}
  // 3: the ram. Point defence off: it strikes the hull outline, the subsystem it hit loses RAM_DMG, the cause line names it,
  // no kill effect. Then a slow, thin-skinned ram against four full turrets: shot down, and the debrief says so
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{assets:['ram']});L35.alarm('fired');
  {for(const x of L().subs)if(x.k==='pd')x.hp=0;const s0=L().subs.map(x=>x.hp),h0=fr().hull;L35.use('ram',{id:'fl400'});until(()=>!!by('ram35'),40);const r=by('ram35');until(()=>!r.alive,30);
   const q=(L().fxQ||[]).find(x=>x.kind==='ramImpact'),hit=L().ramHit,sb=hit&&L().subs.find(x=>x.k===hit.sub&&x.i===hit.i),i=sb?L().subs.indexOf(sb):-1;
   const name=hit?({engines:'engines',comms:'comms',pd:'turret',cargo:'container'})[hit.sub]:'?';
   out.ram=[r.ram35.done==='impact',!!q&&Math.abs(ell(fr(),q)-1)<0.03,i>=0&&s0[i]-sb.hp===Math.min(s0[i],N.RAM_DMG),Math.abs(h0-fr().hull-N.RAM_CORE)<0.01,
     L().cause.some(c=>/ram hits the freighter/.test(c.text)&&c.text.includes(name)),X.fn.OV.fxSkip(r)===true,L().callouts.some(c=>/^RAM IMPACT · /.test(c.text))];}
  {const sp=N.RAM_SPD,rh=N.RAM_HULL,ra=N.RAM_ARM;N.RAM_SPD=0.3;N.RAM_HULL=10;N.RAM_ARM=0;
   go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{assets:['ram']});L35.alarm('fired');L35.use('ram',{id:'fl400'});until(()=>!!by('ram35'),40);
   const r=by('ram35'),f=fr(),a=f.h+0.3;r.x=f.x+Math.cos(a)*2100;r.y=f.y+Math.sin(a)*2100;r.px=r.x;r.py=r.y;r.vx=0;r.vy=0;until(()=>!r.alive,40);
   const shot=r.ram35.done;N.RAM_SPD=sp;N.RAM_HULL=rh;N.RAM_ARM=ra;L35.use('retreat');X.fn.run(300);const db=document.querySelector('#arHc35 .h35-debrief');
   out.ramShot=[shot==='shot',!!L().ramShot,L().callouts.some(c=>c.text==='RAM DESTROYED'),!!db&&/Your ram was shot down \d+ m short at \d+:\d\d/.test(db.textContent)];}
  // 4: turret tracking. 60 s each: a Talon crossing at full speed 1,500 out; a docked Brickbat; a Brickbat's straight bomb run
  const pdRun=mode=>{go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{role:'home'}});
    for(const e of S().ships)if(e.role35==='escort'){e.alive=false;e.jumped=true;}
    L35.alarm('fired');const f=fr(),id=mode==='cross'?'petra':'brask',t=by(id);
    for(const s of S().ships)if(s.faction==='reb'&&s!==t&&s.alive){s.alive=false;s.jumped=true;}
    const HK=SIM.hooks,g0=HK.goal;let pass=0,end=null;
    const start=()=>{const a0=f.h+1.2+pass*0.7,ux=Math.cos(a0),uy=Math.sin(a0);
      if(mode==='cross'){const d=1500;t.x=f.x+ux*d-uy*2500;t.y=f.y+uy*d+ux*2500;end={x:f.x+ux*d+uy*2500,y:f.y+uy*d-ux*2500};}
      else{t.x=f.x+ux*2200-uy*250;t.y=f.y+uy*2200+ux*250;end={x:f.x-ux*1500-uy*250,y:f.y-uy*1500+ux*250};}
      t.px=t.x;t.py=t.y;t.h=Math.atan2(end.y-t.y,end.x-t.x);t.vh=t.h;const v=F.capsOf(t).vMax*(mode==='cross'?1:0.8);t.vx=Math.cos(t.h)*v;t.vy=Math.sin(t.h)*v;pass++;};
    HK.goal=s=>s===t?{x:end.x,y:end.y,spd:mode==='cross'?1:0.8,noCorner:true}:g0(s);start();
    for(let i=0;i<1200;i++){t.hull=t.maxHull;t.arm=t.maxArm;t.thinkT=-1e9;
      if(mode==='dock'){const a=f.h+Math.PI/2;t.x=f.x+Math.cos(a)*90;t.y=f.y+Math.sin(a)*90;t.vx=f.vx;t.vy=f.vy;t.px=t.x;t.py=t.y;}
      else if(Math.hypot(t.x-end.x,t.y-end.y)<300)start();
      SIM.step();}
    HK.goal=g0;const st=L().pdStats[id]||{shots:0,hits:0};return +(st.hits/Math.max(1,st.shots)).toFixed(3);};
  const pc=pdRun('cross'),pk=pdRun('dock'),pb=pdRun('run');
  out.pd=[pc<0.1,pk>0.5,pb>=0.25&&pb<=0.4,pc,pk,pb];
  // a dead turret doesn't fire, and draws dead (the art's pdDead)
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L35.alarm('fired');
  {const pd=L().subs.filter(x=>x.k==='pd');pd[0].hp=0;pd[0].shotT=-99;until(()=>false,20);const f=fr();
   for(const s of S().ships)if(s.faction==='reb'&&s.alive){s.x=f.x+700;s.y=f.y;s.px=s.x;s.py=s.y;}until(()=>false,5);
   API.setSpeed(0);API.camTo(f.x,f.y,0.3);let o=null;const SA=window.SR_ART,s0=SA.ship;SA.ship=function(c,art){if(art==='gafreighter')o=arguments[7];return s0.apply(this,arguments);};
   window.SR_ARENA_HC.frame(performance.now());SA.ship=s0;API.setSpeed(1);
   out.pdDead=[pd[0].shotT<0,pd.slice(1).some(x=>x.shotT>0),!!o&&Array.isArray(o.pdDead)&&o.pdDead[0]===true&&o.pdDead.slice(1).every(x=>x===false),!!o&&Array.isArray(o.aims)&&o.aims[0]==null];}
  // 5: Boost Shields: SHIELD_CD 24; AUTO only with a half under 30% just hit; no floater
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  {const j=by('joss'),sg=j.segs.F,tr=()=>SIM.abilityTriggers?SIM.abilityTriggers('joss','shields'):F.abilityTriggers('joss','shields');
   const f0=(SIM.floaters||S().floaters).length;
   sg.val=sg.max*0.4;j.zoneHitT={F:S().t};const a=tr().want;sg.val=sg.max*0.2;const b=tr().want;j.zoneHitT={F:S().t-5};const c=tr().want;
   SIM.useAbility?SIM.useAbility('joss','shields'):F.useAbility('joss','shields');
   out.shields=[SIM.ABILITIES.shields.cd===24,a===false,b===true,c===false,!S().floaters.some(x=>/BOOST SHIELDS/.test(x.text))];}
  // 16: course keeping. A Cross rammed into the cruising freighter's side at full speed
  go('destroy',{dagger:{role:'home'},anvil:{role:'home'},amber:{k:'hold'}});until(()=>false,5);
  {const f=fr(),brg=()=>{const p=L().lane[L().leg];return Math.atan2(p.y-f.y,p.x-f.x);},h0=f.h,c=by('hale'),a=f.h+Math.PI/2;
   c.x=f.x+Math.cos(a)*400;c.y=f.y+Math.sin(a)*400;c.px=c.x;c.py=c.y;c.h=a+Math.PI;c.vh=c.h;const v=F.capsOf(c).vMax;c.vx=Math.cos(c.h)*v+f.vx;c.vy=Math.sin(c.h)*v+f.vy;
   const g0=SIM.hooks.goal;SIM.hooks.goal=s=>s===c?{x:f.x,y:f.y,spd:1,noCorner:true}:g0(s);const col0=S().m.collisions||0;let hd=0,off=0;
   for(let i=0;i<60;i++){SIM.step();hd=Math.max(hd,dA(f.h,h0));off=Math.max(off,dA(f.vh,brg()));}SIM.hooks.goal=g0;
   const hitN=(S().m.collisions||0)-col0;let back=null;const t0=S().t;until(()=>{if(back==null&&dA(f.h,brg())<5&&dA(f.vh,brg())<5)back=S().t-t0;return false;},20);
   out.course=[hitN>=1,hd<3,back!=null,until(()=>L().spool!=null||!f.alive,400)&&f.alive,+hd.toFixed(2),+off.toFixed(1)];}
  // … and a disabled freighter shoved by a Brickbat drifts the way it was shoved
  go('destroy',{dagger:{role:'home'},anvil:{role:'home'},amber:{k:'hold'}});until(()=>false,3);
  {const f=fr();L().subs[0].hp=0;L().disabled=true;L().spool=null;L().drift={vx:0,vy:0};f.vx=0;f.vy=0;
   const c=by('mags'),a=f.h+Math.PI/2;c.x=f.x+Math.cos(a)*400;c.y=f.y+Math.sin(a)*400;c.px=c.x;c.py=c.y;c.h=a+Math.PI;c.vh=c.h;const v=F.capsOf(c).vMax;c.vx=Math.cos(c.h)*v;c.vy=Math.sin(c.h)*v;
   const g0=SIM.hooks.goal;SIM.hooks.goal=s=>s===c?{x:f.x,y:f.y,spd:1,noCorner:true}:g0(s);const p0={x:f.x,y:f.y};for(let i=0;i<40;i++)SIM.step();SIM.hooks.goal=g0;until(()=>false,5);
   const mv=Math.hypot(f.x-p0.x,f.y-p0.y);out.shove=[mv>20,dA(Math.atan2(f.y-p0.y,f.x-p0.x),a+Math.PI)<30,Math.round(mv)];}
  // 19: Pirate. Two Intimidate wings and no player input: resolve falls, the hail defaults to Take the cargo, the wing
  // overwatches, the containers jettison, the transfer completes
  N.REQ_OFF=0;N.RES_THREAT=rt0;
  go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});
  {let over=false,crates=0;until(()=>{if(S().ships.some(s=>s.beh&&s.beh.kind==='overwatch35'))over=true;crates=Math.max(crates,(L().crates||[]).length);return L().prim.state!=='live';},300);
   const sur=L().req.log.find(x=>x.k==='surrender');
   out.pirate=[L().prim.state==='done',L().resMin===0,!!sur&&sur.by==='default'&&sur.answer==='take',over,L().jettOut>0&&crates>0,!!L().transferred,L().callouts.some(c=>/^CARGO SURRENDERED/.test(c.text))];}
  // No deal answered: resolve to 40, the hail comes back (30 s at least)
  go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});
  {let noAt=null,r40=null,back=null;until(()=>{const q=L().req.open.find(x=>x.k==='surrender'&&x.state==='open');
     if(q&&noAt==null){L35.answerReq(q.id,'no');noAt=S().t;}else if(noAt!=null&&r40==null&&L().resolve>=39)r40=L().resolve;
     if(q&&noAt!=null&&S().t>noAt+1){back=S().t-noAt;return true;}return false;},200);
   out.nodeal=[noAt!=null,r40!=null,back!=null&&back>=30,L().callouts.some(c=>c.text==='THEY\'RE HOLDING OUT')];}
  // past REQ_CAP the hail still shows a card
  {const cap=N.REQ_CAP;N.REQ_CAP=0;go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});
   until(()=>!!L().req.open.find(x=>x.k==='surrender'),120);const q=L().req.open.find(x=>x.k==='surrender');API.syncHud(true);
   out.capped=[!!q&&q.state==='open',!!q&&!!document.querySelector('.h35-reqs [data-req="'+q.id+'"]')];N.REQ_CAP=cap;}
  // Fanatical Crew: Intimidate becomes impossible, and its Secondary is taken up
  N.REQ_OFF=1;
  go('steal',{dagger:{k:'intimidate',second:{trig:'phase2',k:'suppress',arg:'escorts'}},anvil:{k:'disable',arg:'engines'},amber:{k:'board'}},{mods:[{k:'fanatical',hidden:true}],lo:{mags:'board'}});
  {let noted=null;until(()=>{const sc=L().sec.dagger;if(sc&&sc.fired&&noted==null)noted=!sc.adopted&&L().exec.dagger.k==='intimidate';return L().fanaticT!=null;},150);until(()=>false,1);
   out.fanatical=[L().fanaticT!=null,noted===true,L().exec.dagger.k==='suppress',L().secLog.some(x=>x.wid==='dagger'&&x.k==='suppress'),L().mods.find(m=>m.k==='fanatical').found===true];}
  // 21: the stuck guard. Dagger on Tag with no way to do it (Kit's at home): "getting nowhere", once
  N.REQ_OFF=0;N.RES_THREAT=0;
  go('destroy',{dagger:{k:'tag'},anvil:{role:'home'},amber:{role:'home'}},{tagger:'kit'});until(()=>false,N.EXEC_STALL+60);
  {const st=L().req.log.filter(x=>x.k==='stall');out.stall=[st.length===1,st.length===1&&st[0].who==='joss'&&st[0].t0>=N.EXEC_STALL-0.1];}
  N.RES_THREAT=rt0;N.REQ_OFF=0;
  return out;
 });
 ok(!t35k2.stale,'HC35 K2: every scripted plan launched '+JSON.stringify(t35k2.stale));
 ok(t35k2.board.slice(0,7).every(Boolean),'HC35 K2 2: a boarder docks on the side it came from in 30 s, no collision, no jump past DOCK_SNAP, holds fire, outside the hull '+JSON.stringify(t35k2.board));
 ok(t35k2.ram.every(Boolean),'HC35 K2 3: the ram strikes the hull outline, the subsystem it hit loses RAM_DMG, the cause names it, no kill effect '+JSON.stringify(t35k2.ram));
 ok(t35k2.ramShot.every(Boolean),'HC35 K2 3: a slow ram is shot down and the debrief says how far short '+JSON.stringify(t35k2.ramShot));
 ok(t35k2.pd.slice(0,3).every(Boolean),'HC35 K2 4: turret hit rates: crossing Talon < 10%, docked Brickbat > 50%, bomb run 25–40% '+JSON.stringify(t35k2.pd));
 ok(t35k2.pdDead.every(Boolean),'HC35 K2 4: a dead turret doesn\'t fire and draws with pdDead '+JSON.stringify(t35k2.pdDead));
 ok(t35k2.shields.every(Boolean),'HC35 K2 5: SHIELD_CD 24; AUTO only below 30% and just hit; no BOOST SHIELDS floater '+JSON.stringify(t35k2.shields));
 ok(t35k2.course.slice(0,4).every(Boolean),'HC35 K2 16: a Cross rammed into the freighter turns it under 3°, it\'s back on its lane in 20 s and reaches its jump '+JSON.stringify(t35k2.course));
 ok(t35k2.shove.slice(0,2).every(Boolean),'HC35 K2 16: a disabled freighter drifts the way it was shoved '+JSON.stringify(t35k2.shove));
 ok(t35k2.pirate.every(Boolean),'HC35 K2 19: Pirate wins with no input: resolve, the default hail, overwatch, the crates, the transfer '+JSON.stringify(t35k2.pirate));
 ok(t35k2.nodeal.every(Boolean),'HC35 K2 19: No deal: resolve to 40, the hail returns after 30 s '+JSON.stringify(t35k2.nodeal));
 ok(t35k2.capped.every(Boolean),'HC35 K2 19: past REQ_CAP the hail still shows a card '+JSON.stringify(t35k2.capped));
 ok(t35k2.fanatical.every(Boolean),'HC35 K2 19: Fanatical Crew makes Intimidate impossible and its Secondary is taken up '+JSON.stringify(t35k2.fanatical));
 ok(t35k2.stall.every(Boolean),'HC35 K2 21: the stuck guard asks once '+JSON.stringify(t35k2.stall));
 // HC35 K3 (feedback 1, tests 5's sweep, 6, 7, 17): no damage numbers, the shield halves' refill sweep, health
 // colours, the death spin from the ship's turn
 const t35k3=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,FX=API.FX,TH=(typeof SR!=='undefined'&&SR.theme)||window.SR_THEME,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex)=>{B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    B.plan.assets=[];B.plan.assetAt={};B.plan.roes=[];const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);};
  let fn=performance.now();const frame=()=>{fn+=1000;window.SR_ARENA_HC.frame(fn);};
  const rt0=N.RES_THREAT;N.REQ_OFF=1;N.RES_THREAT=0;
  // 6: no damage numbers (and in 3.5 no floating words at all); with SHOW_DMG on, the freighter's add up to what it took
  const fight={dagger:{k:'destroy'},anvil:{role:'home'},amber:{role:'home'}};
  go('destroy',fight);const seen=new Set();let words=0,nums=0;
  until(()=>{for(const f of S().floaters)if(!seen.has(f)){seen.add(f);words++;if(/^-\d/.test(f.text))nums++;}return false;},30);
  out.off=[nums===0,words===0,SIM.TUNE.SHOW_DMG.get()===0];
  SIM.TUNE.SHOW_DMG.set(1);go('destroy',fight);
  {const f=fr();for(const k of ['F','R']){f.segs[k].val=0;f.segs[k].max=0;}   // no shield regeneration to muddy the sum
   const tot=()=>Math.max(0,f.arm)+Math.max(0,f.hull)+L().subs.reduce((a,x)=>a+Math.max(0,x.hp),0),t0=tot();let sum=0,n=0;const sn=new Set();
   until(()=>{for(const q of S().floaters)if(!sn.has(q)){sn.add(q);if(q.kind==='dmg'&&q.id==='fl400'){sum+=+q.text.slice(1);n++;}}return false;},30);
   const took=t0-tot(),shown=sum+(f.dmgAcc||0);out.on=[n>0,Math.abs(shown-took)<=n*0.5+0.5,+shown.toFixed(1),+took.toFixed(1),n];}
  SIM.TUNE.SHOW_DMG.set(0);
  // 5 (K3): a refill starts the arc's sweep
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});API.setSpeed(0);
  {const j=by('joss');j.segs.F.val=j.segs.F.max*0.2;j.segs.R.val=j.segs.R.max*0.2;frame();const before=API.sweepOf('joss','F')==null&&API.sweepOf('joss','R')==null;
   (SIM.useAbility||F.useAbility)('joss','shields');frame();out.sweep=[before,API.sweepOf('joss','F')!=null||API.sweepOf('joss','R')!=null];}
  // 7: health colours. A tile, a canvas pip and the pilot panel at 70%, 45% and 20% hull: go, hazard, rebel red
  {const j=by('joss'),rgb=h=>'rgb('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')',want=[TH.C.go,TH.C.hazard,TH.C.rebel].map(rgb),got=[];
   API.A.selShip='joss';API.openPilot('joss');const hp0=TH.hpPips;let pip=null;TH.hpPips=function(c,x,y,o){if(o&&Math.abs(o.hp-Math.max(0,j.hull))<1e-6&&o.max===j.maxHull)pip=rgb(TH.hpCol(o.hp/o.max,o.bands));return hp0.apply(this,arguments);};
   for(const f of [0.7,0.45,0.2]){j.hull=j.maxHull*f;pip=null;frame();API.syncHud(true);frame();
     const tb=document.querySelector('.hc-tile[data-ship="joss"] .hc-bar--hull b'),pb=document.querySelector('#hcPilot .hc-pbar.is-hull b');
     got.push([tb&&tb.style.background,pip,pb&&pb.style.background]);}
   TH.hpPips=hp0;API.A.selShip=null;
   out.colours=[got.every((g,i)=>g.every(x=>x===want[i])),JSON.stringify(got)];}
  API.setSpeed(1);
  // 17: the death spin. A Brickbat flying straight tumbles slowly; a Talon killed mid-turn whips round its turn's way;
  // the FL-400 never spirals
  {const ch=FX.TUNE.spiralChance;FX.TUNE.spiralChance=2;const OS=FX.fn.os_,spirals=()=>OS().filter(e=>e.kind==='spiral');
   go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{role:'home'}});until(()=>false,3);API.setSpeed(0);frame();   // (the effects see the ships once first)
   const b=by('brask');b.w=0;b.turnW=0;let n0=spirals().length;F.kill(b,null);b.deadT=S().t;frame();const sb=spirals().slice(n0)[0];
   const t=by('petra'),g0=SIM.hooks.goal;SIM.hooks.goal=s=>s===t?{x:t.x+Math.cos(t.vh+1.5)*800,y:t.y+Math.sin(t.vh+1.5)*800,spd:0.7}:g0(s);
   for(let i=0;i<120&&Math.abs(t.w)<1.1;i++)SIM.step();SIM.hooks.goal=g0;const tw=t.turnW;n0=spirals().length;   // killed with its nose swinging
  F.kill(t,null);t.deadT=S().t;frame();const st=spirals().slice(n0)[0];
   n0=spirals().length;FX.event('explode',{x:0,y:0,size:10,art:'gafreighter',livery:'heg',spiral:true,w:2,turnW:2});const sf=spirals().length===n0;
   FX.TUNE.spiralChance=ch;API.setSpeed(1);
   out.spin=[!!sb&&Math.abs(sb.spin)<1.5,!!st&&Math.abs(st.spin)>4&&Math.sign(st.spin)===Math.sign(tw),sf,sb&&+sb.spin.toFixed(2),st&&+st.spin.toFixed(2),+tw.toFixed(2)];}
  N.RES_THREAT=rt0;N.REQ_OFF=0;
  return out;
 });
 ok(!t35k3.stale,'HC35 K3: every scripted plan launched '+JSON.stringify(t35k3.stale));
 ok(t35k3.off.every(Boolean),'HC35 K3 6: 30 s of fighting floats no damage numbers (and no words in 3.5) '+JSON.stringify(t35k3.off));
 ok(t35k3.on.slice(0,2).every(Boolean),'HC35 K3 6: with SHOW_DMG on, the freighter\'s numbers add up to the damage it took '+JSON.stringify(t35k3.on));
 ok(t35k3.sweep.every(Boolean),'HC35 K3 5: a refill starts the arc sweep '+JSON.stringify(t35k3.sweep));
 ok(t35k3.colours[0],'HC35 K3 7: tile, canvas pip and pilot panel at 70/45/20% hull read go, hazard, red '+t35k3.colours[1]);
 ok(t35k3.spin.slice(0,3).every(Boolean),'HC35 K3 17: a straight Brickbat tumbles under 1.5 rad/s, a turning Talon over 4 its turn\'s way, the FL-400 never spirals '+JSON.stringify(t35k3.spin));
 // HC35 K4 (feedback 1, tests 8, 9, 18): one vocabulary for what your ships do, the callouts, reinforcements on the roster
 const t35k4=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=[];B.plan.assetAt={};B.plan.roes=[];if(o.tagger)B.plan.tagger=o.tagger;const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);L().cp=9;};
  let fn=performance.now();const frame=()=>{fn+=1000;window.SR_ARENA_HC.frame(fn);};
  const rt0=N.RES_THREAT;N.REQ_OFF=1;
  // 8: every behaviour your ships reach in a scripted run of each primary maps to a verb; no tile shows a raw id
  const plans={destroy:[{anvil:{k:'destroy'},dagger:{k:'defend',arg:'anvil'},amber:{k:'suppress',arg:'turrets'}}],
    steal:[{anvil:{k:'disable',arg:'engines'},amber:{k:'board'},dagger:{k:'defend',arg:'anvil'}},{lo:{mags:'board'}}],
    pirate:[{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}}],
    strip:[{anvil:{k:'disable',arg:'engines'},amber:{k:'haul'},dagger:{k:'suppress',arg:'escorts'}},{lo:{mags:'pods'}}],
    tag:[{amber:{k:'tag'},dagger:{k:'hold'},anvil:{role:'home'}},{tagger:'kit'}],
    ambush:[{dagger:{k:'ambush'},amber:{k:'ambush'},anvil:{k:'disable',arg:'engines'}}],
    crash:[{anvil:{k:'disable',arg:'engines'},dagger:{k:'hold'},amber:{k:'defend',arg:'anvil'}}]};
  const kinds={},raw=[],tiles=new Set();let n=0;API.setSpeed(0);
  for(const p in plans){N.RES_THREAT=p==='pirate'?rt0:0;go(p,plans[p][0],plans[p][1]);API.setSpeed(0);
    until(()=>{for(const s of S().ships)if(s.alive&&s.faction==='reb'&&s.wing){const v=L35.verbOf(s),k=(s.beh&&s.beh.kind)||'none';(kinds[k]||(kinds[k]=new Set())).add(v.k);if(v.k==='busy')raw.push(p+':'+k);}
      if(++n%40===0){frame();for(const e of document.querySelectorAll('#arHc .hc-tile__word'))tiles.add(e.textContent);}return L().prim.state!=='live';},150);}
  N.RES_THREAT=0;
  const rawTile=[...tiles].filter(t=>/^[A-Z0-9]+$/.test(t)&&!/^(DOWN|JUMPED)$/.test(t));
  out.vocab=[!raw.length,!rawTile.length,Object.keys(kinds).length>=10,raw.slice(0,5),rawTile.slice(0,5),Object.keys(kinds)];
  // 9: the callouts. A container coming aboard fires CARGO SECURED; a subsystem dying fires its DOWN; one off screen
  // makes an edge arrow
  go('strip',{anvil:{k:'disable',arg:'engines'},amber:{k:'haul'},dagger:{k:'suppress',arg:'escorts'}},{lo:{mags:'pods'}});
  {const got=until(()=>L().callouts&&L().callouts.some(c=>/^CARGO SECURED 1\/\d · MAGS$/.test(c.text)),150);out.co=[got,(L().callouts||[]).some(c=>c.text==='ENGINES DOWN'&&c.tone==='good')];}
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  {const f=fr(),cm=L().subs.find(x=>x.k==='comms');F.applyDamage(f,cm.hp*4+40,true,true,{x:f.x,y:f.y,by:null,aimSub:'comms'});SIM.step();
   const c=(L().callouts||[]).find(x=>x.text==='COMMS DOWN');out.co.push(!!c&&cm.hp<=0);
   API.setSpeed(0);API.camTo(f.x+60000>SIM.W?f.x-60000:f.x+60000,f.y,0.5);frame();const ar=B.coArrows||[];out.co.push(ar.some(a=>a.text==='COMMS DOWN'));API.camTo(f.x,f.y,0.3);API.setSpeed(1);}
  // 18: the Reserves called in get a roster card in the frame they warp in; so does High Command's Reinforce
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'reserve',k:'hold'}});API.setSpeed(0);frame();
  {const had=!!document.querySelector('#hcRoster [data-wing="amber"]');L35.use('reserve',{});until(()=>!!F.wingOf('amber'),40);frame();
   const card=document.querySelector('#hcRoster [data-wing="amber"]');
   out.res=[!had,!!card,!!card&&card.classList.contains('is-arriving'),!!card&&card.querySelectorAll('.hc-tile').length===4,S().events.some(e=>e.text==='Amber on station'),(L().callouts||[]).some(c=>c.text==='AMBER ARRIVED')];}
  API.setSpeed(1);N.RES_THREAT=rt0;N.REQ_OFF=0;
  // High Command: hc1 with a reserve wing put in (no HC scenario has one)
  window.DBGarena.fn.openPicker();document.querySelector('#arRulesets [data-ruleset="hc"]').click();
  {const H=window.DBGarena.hc,f=H.fn,HS=H.SIM;f.load('hc1_nightfall',0,7);HS.runFor(2);const Z=HS.zone;
   HS.S.R.reserves={id:'ember',name:'Ember',at:[Z.x0+900,(Z.y0+Z.y1)/2,0],ships:[{id:'em1',cls:'talon',name:'Emi',pilot:{preset:'regular'}},{id:'em2',cls:'talon',name:'Bo',pilot:{preset:'regular'}}]};HS.S.cp=9;
   API.setSpeed(0);frame();const had=!!document.querySelector('#hcRoster [data-wing="ember"]');const r=HS.command('reinforce');frame();
   const card=document.querySelector('#hcRoster [data-wing="ember"]');out.hcRes=[r&&r.ok,!had,!!card,!!card&&card.querySelectorAll('.hc-tile').length===2];API.setSpeed(1);}
  window.DBGarena.fn.openPicker();document.querySelector('#arRulesets [data-ruleset="hc35"]').click();
  return out;
 });
 ok(!t35k4.stale,'HC35 K4: every scripted plan launched '+JSON.stringify(t35k4.stale));
 ok(t35k4.vocab.slice(0,3).every(Boolean),'HC35 K4 8: every behaviour reached in each primary maps to a verb; no tile shows a raw id '+JSON.stringify(t35k4.vocab));
 ok(t35k4.co.every(Boolean),'HC35 K4 9: CARGO SECURED, ENGINES and COMMS DOWN, and an edge arrow for one off screen '+JSON.stringify(t35k4.co));
 ok(t35k4.res.every(Boolean),'HC35 K4 18: the Reserves get a roster card in the frame they warp in, "on station", ARRIVED '+JSON.stringify(t35k4.res));
 ok(t35k4.hcRes.every(Boolean),'HC35 K4 18: High Command\'s Reinforce adds its roster card '+JSON.stringify(t35k4.hcRes));
 // HC35 K5 (feedback 1, test 10): an enemy selected to inspect; the target readout tracks the engines; a dead turret's ✕
 const t35k5=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';B.plan.assets=[];B.plan.roes=[];X.fn.launch();API.setSpeed(0);
  const card=()=>document.getElementById('h35Tgt'),row=k=>{const r=card()&&card().querySelector('[data-row="'+k+'"] span');return r?r.textContent:null;};
  const f=fr();X.fn.OV.mapClick({x:f.x,y:f.y},{},f);X.fn.syncTarget(true);
  out.sel=[B.inspect==='fl400',!!card()&&!card().hidden,!!card().querySelector('canvas'),API.A.selShip==null];
  const e=L().subs.find(x=>x.k==='engines');e.hp=50;X.fn.syncTarget(true);const r1=row('engines');e.hp=0;X.fn.syncTarget(true);const r2=row('engines');
  out.eng=[r1==='Engines · 50/120',r2==='Engines · 0/120 · DOWN',r1,r2];
  const pd=L().subs.filter(x=>x.k==='pd');pd[2].hp=0;X.fn.syncTarget(true);out.pd=[row('turrets')==='Turrets · 3 of 4',(B.schX||[]).includes('pd2'),X.fn.subTip(pd[2]).name==='Turret · 0/40 · Down'];
  const es=S().ships.find(s=>s.role35==='escort');X.fn.OV.mapClick({x:es.x,y:es.y},{},es);X.fn.syncTarget(true);
  out.esc=[B.inspect===es.id,!!card().querySelector('.hc-pbar.is-hull'),!card().querySelector('canvas')];
  X.fn.OV.mapClick({x:f.x+20000,y:f.y},{},null);X.fn.syncTarget(true);out.esc.push(B.inspect==null,card().hidden);
  API.setSpeed(1);return out;
 });
 ok(t35k5.sel.every(Boolean),'HC35 K5 10: a click on the freighter selects it to inspect and shows its readout '+JSON.stringify(t35k5.sel));
 ok(t35k5.eng.slice(0,2).every(Boolean),'HC35 K5 10: the engines row tracks hp '+JSON.stringify(t35k5.eng));
 ok(t35k5.pd.every(Boolean),'HC35 K5 10: a destroyed turret shows ✕ '+JSON.stringify(t35k5.pd));
 ok(t35k5.esc.every(Boolean),'HC35 K5: an escort shows its smaller card; a click on empty space clears it '+JSON.stringify(t35k5.esc));
 // HC35 K6 (feedback 1, tests 11–13): the journey (the Missions tab, the four windows, Back / Next / Esc, Launch, Plan
 // again), one tooltip and no native title anywhere, the debrief's pods and its order of causes
 await pg4.mouse.move(2,2);   // the cursor out of the way: Chromium's hover follows a re-layout under a parked cursor
 const t35k6=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={titles:[]};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)],key=(k,o)=>document.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
  const titles=where=>{const n=document.querySelectorAll('#arHc [title]').length;if(n)out.titles.push(where+':'+n+':'+[...document.querySelectorAll('#arHc [title]')].slice(0,3).map(e=>e.className).join('|'));};
  B.seed=4242;B.plan=null;B.step=1;X.fn.showBoard(true);B.seed=4242;X.fn.showBoard(false);
  // 11: the Missions tab, with the vanilla classes; Plan mission opens window 1
  out.tab=[B.screen==='board',!!q('.bf-stage.h35-missions'),!!q('.bf-board .bf-card.is-sel'),!!q('.bf-holo .bf-proj svg'),!!q('.bf-rail .bf-plan [data-act="brief"]'),
    qa('.h35-tab[data-tip="na:arena"]').length===4,qa('.bf-card[aria-disabled="true"]').length>=3,!!q('[data-act="newopp"]'),!!q('.bf-callout.is-foe')];titles('board');
  q('.bf-plan [data-act="brief"]').click();
  out.w1=[B.screen==='brief',B.step===1,!!q('.h35-holo'),/Objective/.test((q('.h35-node.is-on')||{}).textContent||''),q('[data-act="next"]').getAttribute('aria-disabled')==='true'];titles('w1');
  q('[data-primary="destroy"]').click();q('[data-act="next"]').click();const w2=B.step===1&&B.part===2;titles('w1b');q('[data-act="next"]').click();const w2b=B.step===2;titles('w2');
  q('[data-act="prev"]').click();const back=B.step===1&&B.part===2;q('[data-act="prev"]').click();const back1=B.step===1&&B.part===1;
  q('[data-act="next"]').click();key('Escape');const esc1=B.step===1&&B.part===1;key('Escape');const esc0=B.screen==='board'&&B.plan&&B.plan.primary==='destroy';
  q('.bf-plan [data-act="brief"]').click();key('ArrowRight');key('ArrowRight');key('ArrowRight');titles('w3');key('ArrowRight');const w4=B.step===4&&!!q('.h35-holo.is-wide [data-pane]');titles('w4');
  q('.h35-node.is-done [data-step="2"]').click();const node=B.step===2;key('ArrowRight');key('ArrowRight');
  out.steps=[w2,w2b,back,back1,esc1,esc0,w4,node,B.step===4];
  q('[data-act="launch"]').click();out.launch=[B.screen==='live',!!SIM.S&&SIM.S.t===0];API.syncHud(true);API.openPilot('joss');API.syncHud(true);titles('live');
  // 12: the one tooltip: hovering an objective card shows #hcTip with its title
  X.fn.run(400);titles('debrief');q('[data-act="again"]').click();out.again=[B.screen==='brief',B.step===1,B.plan.primary==='destroy'];
  API.hideTip();const card=q('[data-primary="steal"]');card.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));await new Promise(r=>setTimeout(r,320));
  const tip=document.getElementById('hcTip');out.tip=[!tip.hidden,/Steal/.test(tip.textContent),!!tip.querySelector('.sr-tip__title'),tip.textContent.slice(0,80)];
  card.dispatchEvent(new PointerEvent('pointerout',{bubbles:true}));
  // 13: a pod left drifting at the end resolves (never "drifting"); a failed Steal's cause comes first
  const e0=N.EJECT_P;N.EJECT_P=1;N.REQ_OFF=1;
  B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='steal';
  for(const w in B.plan.wings)B.plan.wings[w].exec={k:'hold',arg:null};B.plan.wings.amber.loadout.mags='board';B.plan.assets=[];B.plan.roes=[];X.fn.launch();
  L35.use('retreat');X.fn.run(400);
  const db=q('.h35-debrief'),why=db?[...db.querySelectorAll('.h35-why p')].map(p=>p.textContent):[];
  out.deb=[X.L.prim.state==='failed',/jumped at|never knocked out|never got aboard|prize never|destroyed/.test(why[0]||''),why[0]||''];
  // the mission ends with Wren's pod still out
  B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';for(const w in B.plan.wings)B.plan.wings[w].exec={k:'hold',arg:null};B.plan.assets=[];B.plan.roes=[];X.fn.launch();
  F.kill(SIM.fn.byId('wren'),null);SIM.step();const pod=X.L.pods[0],drift=!!pod&&pod.state==='drift';SIM.endMission('done');X.fn.run(2);
  const db2=q('.h35-debrief');
  out.pod=[drift,!!pod&&(pod.state==='captured'||pod.state==='lost'),!!db2&&!/drifting/.test(db2.textContent),!!db2&&/Wren \((captured|lost, left behind)\)/.test(db2.textContent),pod&&pod.state];
  N.EJECT_P=e0;N.REQ_OFF=0;
  return out;
 });
 ok(t35k6.tab.every(Boolean),'HC35 K6 11: the Missions tab mock (bf- classes, inert tabs, dimmed cards, the holo-table, the rail) '+JSON.stringify(t35k6.tab));
 ok(t35k6.w1.every(Boolean),'HC35 K6 11: Plan mission opens window 1; Next waits for a primary '+JSON.stringify(t35k6.w1));
 ok(t35k6.steps.every(Boolean),'HC35 K6 11: Next and Back move one step, Esc goes back, the arrows step, a done node returns '+JSON.stringify(t35k6.steps));
 ok(t35k6.launch.every(Boolean),'HC35 K6 11: Launch from window 4 starts the mission '+JSON.stringify(t35k6.launch));
 ok(t35k6.again.every(Boolean),'HC35 K6 11: Plan again returns to window 1 with the plan kept '+JSON.stringify(t35k6.again));
 ok(!t35k6.titles.length,'HC35 K6 12: no [title] in #arHc or #arHc35 on any screen '+JSON.stringify(t35k6.titles));
 ok(t35k6.tip.slice(0,3).every(Boolean),'HC35 K6 12: hovering an objective card shows #hcTip with its title '+JSON.stringify(t35k6.tip));
 ok(t35k6.deb.slice(0,2).every(Boolean),'HC35 K6 13: a failed Steal lists its failure cause first '+JSON.stringify(t35k6.deb));
 ok(t35k6.pod.slice(0,4).every(Boolean),'HC35 K6 13: a pod still drifting at the end is Captured or Lost, never drifting '+JSON.stringify(t35k6.pod));
 // HC35 L1: the planning windows (feedback 2, §1–2): a pick doesn't replay the window's opening, a scrolled pane stays put, each primary shows its rewards
 const t35l1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  q('[data-primary="crash"]').click();const w=q('.h35-holo');
  out.pop=[!!w,!w.classList.contains('is-open'),w.getAnimations().length===0,getComputedStyle(w).animationName];
  out.rew=[qa('[data-primary]').length===7,qa('[data-primary] .h35-rew--bonus .sr-cost').length===7,qa('[data-primary="strip"] .h35-rew__per .sr-cost').length===1,
    /300/.test(q('[data-primary="destroy"] .h35-rew').textContent),qa('[data-primary] .h35-rew [title]').length===0];
  // window 3: scroll its body, pick an asset slot; the body is where it was
  B.step=3;X.fn.render();const b=q('.h35-holo__body'),over=b.scrollHeight>b.clientHeight+20;b.scrollTop=over?b.scrollHeight:0;const st=b.scrollTop;
  q('[data-slot]').click();const b2=q('.h35-holo__body');
  out.keep=[over,b2!==b,Math.abs(b2.scrollTop-st)<=2||b2.scrollTop>=b2.scrollHeight-b2.clientHeight-2,q('.h35-holo').getAnimations().length===0];
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35l1.pop.slice(0,3).every(Boolean),'HC35 L1 1: picking a primary re-renders the window without replaying its opening '+JSON.stringify(t35l1.pop));
 ok(t35l1.rew.every(Boolean),'HC35 L1 1.1: every primary shows what it pays and its Accomplished bonus '+JSON.stringify(t35l1.rew));
 ok(t35l1.keep.slice(1).every(Boolean),'HC35 L1 1: a pick keeps the scrolled pane where it was, with no pop '+JSON.stringify(t35l1.keep));
 // HC35 L2: a retreat really retreats; Hold for My Signal ends when a wing is fired on or the alarm goes up; wings fight back (feedback 2, §3.1–3.2)
 const t35l2=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id);
  const go=(prim,k,o)=>{o=o||{};B.seed=o.seed||777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=typeof k==='string'?{k,arg:null}:Object.assign({},k);B.plan.wings[w].second=null;}B.plan.assets=[];B.plan.assetAt={};B.plan.roes=o.roes||[];X.fn.launch();L().cp=9;};
  const rt0=N.RES_THREAT,co=N.COMMS_OFF;N.REQ_OFF=1;N.RES_THREAT=0;N.COMMS_OFF=1;
  const mine=()=>S().ships.filter(s=>s.alive&&s.faction==='reb'&&s.wing&&!s.prop35);
  const think=s=>{s.thinkT=F.THINK_SECS_();SIM.step();};
  // 1: holding for the signal. Fired on, that wing goes (for good) and its leader says so; the alarm sends every wing
  go('destroy','destroy',{roes:['signal'],seed:991});SIM.runFor(2);
  const esc=S().ships.find(s=>s.role35==='escort'&&s.alive),joss=by('joss');
  const wait0=mine().every(s=>s.beh&&s.beh.why==='waiting for your signal');
  joss.hitT=S().t;joss.firedOnT=S().t;joss.lastHitBy=esc.id;think(joss);SIM.runFor(4);
  out.fired=[wait0,!!L().sigW.dagger,L().dec[0].wid==='dagger'&&/fired on/.test(L().dec[0].why),L().dec.some(d=>d.wid==='dagger'&&d.kind==='signal'),by('wren').beh.why!=='waiting for your signal'];
  L35.alarm('detected','test');SIM.runFor(1);
  out.spotted=[['dagger','anvil','amber'].every(w=>L().sigW[w]),L().dec.filter(d=>d.kind==='signal').length===3,mine().every(s=>s.beh&&s.beh.why!=='waiting for your signal'),
    S().events.some(e=>e.kind==='leader')];
  // 2: self-defence. A wing on Hold, one of its ships shot at: it turns on the shooter without being told
  go('destroy','hold',{seed:992});SIM.runFor(2);
  const kit=by('kit'),e2=S().ships.find(s=>s.role35==='escort'&&s.alive);kit.hitT=S().t;kit.firedOnT=S().t;kit.lastHitBy=e2.id;think(kit);
  out.defend=[kit.beh.kind==='engage',kit.beh.target===e2.id,kit.beh.why==='self-defence'];
  // 3: the retreat. A fight with the escort going; Retreat: every ship heads for the jump point (after a 4 s turn), and gets there
  // (was Tag, which can't launch without a tracker named, so the test ran on the last mission)
  go('destroy',{k:'suppress',arg:'escorts'},{seed:41});for(let i=0;i<300&&!L().alarm;i++)SIM.runFor(1);SIM.runFor(20);out.t0=[+S().t.toFixed(1),L().prim.state];
  const n0=mine().length;L35.use('retreat');SIM.runFor(4);
  const jp=S().points.ourjump;let toward=0,samples=0,kinds=new Set();
  for(let i=0;i<12;i++){for(const s of mine()){samples++;kinds.add(s.beh&&s.beh.kind);const dx=jp.x-s.x,dy=jp.y-s.y,d=Math.hypot(dx,dy)||1,v=Math.hypot(s.vx,s.vy)||1;if((s.vx*dx+s.vy*dy)/(d*v)>0.3)toward++;}SIM.runFor(1);}
  const panicky=mine().filter(s=>s.panic).length;
  SIM.runFor(60);const home=S().ships.filter(s=>s.faction==='reb'&&s.wing&&s.jumped).length,left=mine().length;
  out.retreat=[n0>0&&L().primK==='destroy',toward/samples>=0.8,[...kinds].every(k=>k==='withdraw'||k==='flee'||k==='freeze'),left<=panicky,L().dec.some(d=>d.kind==='retreat'),+(toward/samples).toFixed(2),[...kinds].join('/'),n0,home,left];
  N.RES_THREAT=rt0;N.REQ_OFF=0;N.COMMS_OFF=co;
  return out;
 });
 ok(t35l2.fired.every(Boolean),'HC35 L2 3.1: holding for the signal, a wing fired on goes for good, and its leader says so '+JSON.stringify(t35l2.fired));
 ok(t35l2.spotted.every(Boolean),'HC35 L2 3.1: the alarm sends every waiting wing, each leader\'s call logged '+JSON.stringify(t35l2.spotted));
 ok(t35l2.defend.every(Boolean),'HC35 L2 3.1: a ship on Hold turns on whoever shoots at it, untold '+JSON.stringify(t35l2.defend));
 ok(t35l2.retreat.slice(0,5).every(Boolean),'HC35 L2 3.2: on Retreat every ship heads for the jump point and gets there '+JSON.stringify(t35l2.retreat));
 // HC35 L3: the leaders decide in the field: a primary that can't be done falls back in its family; idle wings find work; the debrief shows their calls and the rewards (feedback 2, §1.1, §3)
 const t35l3=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex[w]);B.plan.wings[w].second=null;}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=[];B.plan.assetAt={};B.plan.roes=[];B.plan.optionals=[];if(o.tagger)B.plan.tagger=o.tagger;
    const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);L().cp=9;};
  const keep={RES_THREAT:N.RES_THREAT,RES_ENGINES:N.RES_ENGINES,RES_TURRET:N.RES_TURRET,RES_ESCORT:N.RES_ESCORT,COMMS_OFF:N.COMMS_OFF};
  N.REQ_OFF=1;N.RES_THREAT=0;N.RES_ENGINES=0;N.RES_TURRET=0;N.RES_ESCORT=0;N.COMMS_OFF=1;   // no surrender to muddy it
  // 1: Crash, the engines shot out far from the planet: dead in space outside the pull. Destroy takes over; every wing re-tasks
  go('crash',{dagger:{k:'suppress',arg:'escorts'},anvil:{k:'disable',arg:'engines'},amber:{k:'defend',arg:'anvil'}},{seed:31});
  SIM.runFor(5);const e=L().subs.find(x=>x.k==='engines');e.hp=0;L35.fn.subDown(fr(),e,null);
  for(let i=0;i<200&&!L().fallback;i++)SIM.runFor(1);
  const fb=L().fallback||{},dec=L().dec;
  out.crash=[fb.from==='crash',fb.to==='destroy',/outside the pull/.test(fb.why||''),L().primK==='destroy',L().prim.state==='live',dec.some(d=>d.kind==='fallback'&&/Crash is off/.test(d.line)),
    Object.values(L().exec).every(x=>x.k==='destroy'||x.k==='suppress'),/Destroy \(for Crash\)/.test(S().objectives[0].text)];
  fr().hull=1;SIM.runFor(20);const r=L35.rewardOf();
  out.reward=[L().prim.state==='done',r.k==='destroy',r.earned.c===300,!r.bonus,r.missed&&r.missed.c===200];
  X.fn.run(400);const db=document.querySelector('#arHc35 .h35-debrief');
  out.deb=[!!db,(db.querySelector('.sr-stamp')||{}).textContent==='PARTIAL',/the fallback/.test(db.textContent),!!db.querySelector('.h35-rew--deb .sr-cost'),/Missed: Crash/.test(db.textContent),
    db.querySelectorAll('.h35-leaders .h35-lead').length>=2,db.querySelectorAll('.h35-leaders li.is-fallback').length===1,/Crash was off at/.test((db.querySelector('.h35-why p')||{}).textContent||''),
    (B.metrics[B.metrics.length-1]||{}).stamp==='partial'];
  // 2: Steal, the boarding party lost before it boards: no pods, so Pirate; 3: Crash blown up in space: Destroy, done
  go('steal',{dagger:{k:'defend',arg:'anvil'},anvil:{k:'disable',arg:'engines'},amber:{k:'board'}},{seed:32,lo:{mags:'board'}});
  SIM.runFor(3);F.kill(by('mags'),null);SIM.runFor(2);
  out.steal=[L().primK==='pirate',/boarding party/.test((L().fallback||{}).why||''),Object.values(L().exec).every(x=>x.k==='intimidate')];
  go('crash',{dagger:{k:'destroy'},anvil:{k:'destroy'},amber:{k:'destroy'}},{seed:33});SIM.runFor(3);F.kill(fr(),null);SIM.runFor(2);
  out.blown=[L().primK==='destroy',L().prim.state==='done',L35.rewardOf().earned.c===300];
  // 4: no fallback outside a family (Tag); one fallback a mission
  go('tag',{dagger:{k:'destroy'},anvil:{k:'destroy'},amber:{k:'tag'}},{seed:35,tagger:'kit'});SIM.runFor(3);F.kill(fr(),null);SIM.runFor(2);
  out.tag=[L().prim.state==='failed',!L().fallback,!!L35.rewardOf().missed];
  // 5: an idle wing finds work; your own Hold stays a Hold
  go('destroy',{dagger:{k:'hold'},anvil:{k:'suppress',arg:'escorts'},amber:{k:'destroy'}},{seed:34});
  SIM.runFor(3);for(const s of S().ships)if(s.role35==='escort')F.kill(s,null);SIM.runFor(12);
  out.idle=[L().exec.dagger.k==='hold',L().exec.anvil.k==='destroy',L().dec.some(d=>d.wid==='anvil'&&d.kind==='job'&&/Suppress done/.test(d.why||''))];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(!t35l3.stale,'HC35 L3: every scripted plan launched '+JSON.stringify(t35l3.stale));
 ok(t35l3.crash.every(Boolean),'HC35 L3 3: Crash that can\'t fall falls back to Destroy, the leader says why, every wing re-tasks '+JSON.stringify(t35l3.crash));
 ok(t35l3.reward.every(Boolean),'HC35 L3 1.1/3: the fallback pays Destroy\'s reward without Crash\'s Accomplished bonus '+JSON.stringify(t35l3.reward));
 ok(t35l3.deb.every(Boolean),'HC35 L3 3.3: the debrief: PARTIAL, the fallback, the rewards, the leaders\' calls '+JSON.stringify(t35l3.deb));
 ok(t35l3.steal.every(Boolean)&&t35l3.blown.every(Boolean),'HC35 L3 3: Steal without its boarders falls back to Pirate; a Crash blown up in space is a Destroy '+JSON.stringify([t35l3.steal,t35l3.blown]));
 ok(t35l3.tag.every(Boolean),'HC35 L3 3: no fallback outside a family '+JSON.stringify(t35l3.tag));
 ok(t35l3.idle.every(Boolean),'HC35 L3 3.1: a wing with its job done finds work; your Hold stays '+JSON.stringify(t35l3.idle));
 // HC35 L4: every ship's subsystems: engines, guns, a shield generator; aimed fire takes them out; the readout, the rings and a pick on one (feedback 2, §4)
 const t35l4=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id);
  B.seed=51;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';
  for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec={k:w==='dagger'?'suppress':'hold',arg:w==='dagger'?'escorts':null};B.plan.wings[w].second=null;}
  B.plan.assets=[];B.plan.roes=[];const co=N.COMMS_OFF,rt=N.RES_THREAT;N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;X.fn.launch();L().cp=9;SIM.runFor(2);
  const small=S().ships.filter(s=>s.alive&&!s.struct&&s.id!=='fl400'&&!s.prop35);
  out.all=[small.length>10,small.every(s=>s.sys35&&s.sys35.some(x=>x.k==='engines')&&s.sys35.some(x=>x.k==='guns')),small.filter(s=>F.maxShield(s)>0).every(s=>s.sys35.some(x=>x.k==='shields')),!by('fl400').sys35];
  // Focus on an escort's engines: the aim shows in the verb, they go down, it limps, the focus ends
  const e=S().ships.find(s=>s.role35==='escort'&&s.alive);L35.use('name',{ship:'joss',act:'focus',target:e.id,sub:'engines'});SIM.runFor(1);
  const j=by('joss'),v0=L35.verbOf(j).words;let downT=null;for(let i=0;i<120&&e.alive;i++){SIM.runFor(1);const x=e.sys35.find(x=>x.k==='engines');if(x.hp<=0){downT=S().t;break;}}
  SIM.runFor(1);
  out.engines=[/Disabling .*'s engines/.test(v0),downT!=null,e.crits.filter(c=>c==='engine').length===2&&e.crits.includes('controls'),!L().focus.joss,S().events.some(x=>x.kind==='sub35'&&/engines are out/.test(x.text)),
    L().callouts.some(c=>c.text==='ENGINES DOWN'),v0];
  // guns and shields down: it can't fire; its shields drop and stay down; it can't boost them
  const e2=S().ships.find(s=>s.role35==='escort'&&s.alive&&s!==e)||e;L35.fn.sub35Down(e2,e2.sys35.find(x=>x.k==='guns'),null);
  const sh=e2.sys35.find(x=>x.k==='shields');if(sh)L35.fn.sub35Down(e2,sh,null);
  const n0=S().proj.filter(p=>p.owner===e2.id).length;SIM.runFor(6);
  out.guns=[e2.gunsDown35===true,S().proj.filter(p=>p.owner===e2.id&&p.age<6).length===0,!sh||(e2.segs.F.val===0&&e2.segs.R.val===0),!sh||!!SIM.hooks.abilityOk(e2,'shields')];
  // the readout: inspect a live escort with its engines out; its schematic with three subsystems, the engines struck out
  const ec=S().ships.find(s=>s.role35==='escort'&&s.alive&&s.sys35.some(x=>x.k==='engines'&&x.hp>0))||e;if(ec!==e)L35.fn.sub35Down(ec,ec.sys35.find(x=>x.k==='engines'),null);
  X.fn.OV.mapClick({x:ec.x,y:ec.y},{},ec);X.fn.syncTarget(true);const card=document.getElementById('h35Tgt');
  out.card=[B.inspect===ec.id,!!card.querySelector('canvas.h35-tgt__sch.is-small'),card.querySelectorAll('.h35-tgt__row').length===ec.sys35.length,/Engines · 0\/\d+ · DOWN/.test(card.textContent),(B.schX||[]).includes('engines')];
  // a pick on a subsystem: Mark with the cursor on the guns
  const e3=S().ships.find(s=>s.role35==='escort'&&s.alive&&s.sys35.find(x=>x.k==='guns').hp>0);
  let pick=null;if(e3){const g=e3.sys35.find(x=>x.k==='guns'),q=API.ipos(e3),a=F.hullAxes(e3).a,p={x:q.x+Math.cos(q.h)*g.x*a,y:q.y+Math.sin(q.h)*g.x*a};
    const use=L35.use;L35.use=(k,args)=>{pick={k,args:Object.assign({},args)};return {ok:true};};B.pick={k:'mark',args:{}};X.fn.OV.mapClick(p,{},e3);L35.use=use;B.pick=null;}
  out.pick=[!!pick&&pick.args.id===e3.id,!!pick&&pick.args.sub==='guns'];
  N.COMMS_OFF=co;N.REQ_OFF=0;N.RES_THREAT=rt;B.inspect=null;
  return out;
 });
 ok(t35l4.all.every(Boolean),'HC35 L4 4: every ship but the freighter has engines and guns, and a shield generator if shielded '+JSON.stringify(t35l4.all));
 ok(t35l4.engines.slice(0,6).every(Boolean),'HC35 L4 4: Focus on an escort\'s engines: the verb names them, they go down, it limps, the focus ends, the feed and callout say so '+JSON.stringify(t35l4.engines));
 ok(t35l4.guns.every(Boolean),'HC35 L4 4: guns down, it can\'t fire; shield generator down, its shields stay at 0 and can\'t be boosted '+JSON.stringify(t35l4.guns));
 ok(t35l4.card.every(Boolean),'HC35 L4 4: the readout shows a small ship\'s schematic and its subsystems '+JSON.stringify(t35l4.card));
 ok(t35l4.pick.every(Boolean),'HC35 L4 4: a power picking on a small ship\'s subsystem names it '+JSON.stringify(t35l4.pick));
 // HC35 L5: the drift as a slide in a turning fight: the nose swings onto the target off the line of flight, which turns slower; it costs speed; never to run (feedback 2, §5)
 const t35l5=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,by=id=>S().ships.find(s=>s.id===id),dA=(a,b)=>Math.abs(((a-b)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI);
  B.seed=71;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';
  for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec={k:'hold',arg:null};B.plan.wings[w].second=null;}
  B.plan.assets=[];B.plan.roes=[];const co=N.COMMS_OFF;N.COMMS_OFF=1;N.REQ_OFF=1;X.fn.launch();L35.alarm('fired','test');SIM.runFor(1);
  const h=by('hale'),e=S().ships.find(s=>s.role35==='escort'&&s.alive),c=F.capsOf(h),gr=F.gunRange(h);
  h.h=0;h.vh=0;h.w=0;h.vx=c.vMax*0.9;h.vy=0;h.px=h.x;h.py=h.y;e.x=h.x+Math.cos(1.2)*gr*0.9;e.y=h.y+Math.sin(1.2)*gr*0.9;e.px=e.x;e.py=e.y;
  h.beh={kind:'engage',target:e.id,why:'test'};h.abCd={};
  const trig=SIM.abilityTriggers('hale','drift'),r=SIM.useAbility('hale','drift'),v0=Math.hypot(h.vx,h.vy),cd=h.abCd.drift-S().t;
  let maxOff=0,maxW=0,bear=0,n=0;
  while(h.driftT>S().t&&n<200){const vv=Math.max(c.vMin,Math.hypot(h.vx,h.vy));SIM.step();n++;maxOff=Math.max(maxOff,dA(h.h,h.vh));if(h.driftT>S().t)maxW=Math.max(maxW,Math.abs(h.turnW)/F.turnCap(c,vv));if(F.inArc(h,e))bear++;}
  const v1=Math.hypot(h.vx,h.vy);
  out.slide=[trig.want===true,r.ok,maxOff>0.6&&maxOff<=N.DRIFT_NOSE+0.05,maxW<=N.DRIFT_TURN+0.01,bear>=10,v1<v0,v1>=c.vc*0.85,Math.abs(cd-N.DRIFT_CD)<0.01,+maxOff.toFixed(2),Math.round(v0),Math.round(v1),bear];
  // never to run: withdrawing with something behind is no drift now
  h.beh={kind:'withdraw',dest:{x:0,y:0}};h.abCd={};out.run=[SIM.abilityTriggers('hale','drift').want===false];
  N.COMMS_OFF=co;N.REQ_OFF=0;
  return out;
 });
 ok(t35l5.slide.slice(0,8).every(Boolean),'HC35 L5 5: a drift: the nose swings up to DRIFT_NOSE onto the target, the line of flight turns at DRIFT_TURN, the guns bear, it costs speed (down to about corner speed), a DRIFT_CD recharge '+JSON.stringify(t35l5.slide));
 ok(t35l5.run.every(Boolean),'HC35 L5 5: no drift to run away '+JSON.stringify(t35l5.run));
 // HC35 L6: plasma on some ships: the Talons' cannon and the Pursuers' pulse cannon fire a few slow heavy bolts a burst (feedback 2, §6)
 const t35l6=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,by=id=>S().ships.find(s=>s.id===id);
  B.seed=81;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='tag';B.plan.tagger='kit';
  for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec={k:'suppress',arg:'escorts'};B.plan.wings[w].second=null;}
  B.plan.assets=[];B.plan.roes=[];const co=N.COMMS_OFF;N.COMMS_OFF=1;N.REQ_OFF=1;X.fn.launch();L35.alarm('fired','test');
  const tal=S().ships.filter(s=>s.cls==='talon'),cross=S().ships.filter(s=>s.cls==='viper'),w=tal[0].wpns[0].w;
  out.kit=[tal.length===4,tal.every(s=>s.wpns.length===1&&s.wpns[0].w.id==='px-plasma-cannon'&&s.wpns[0].w.style==='plasma'),cross.every(s=>s.wpns[0].w.id==='bls-t-light-repeaters'),
    w.bolts===N.PX_BOLTS,Math.abs(w.boltK-F.BURST_N_()/N.PX_BOLTS*N.PX_DMG)<1e-9];
  // its bursts: PX_BOLTS bolts each, slower than a repeater's
  let px=null,rep=null;const per={};for(let i=0;i<20*60&&!(px&&rep&&Object.keys(per).length>2);i++){SIM.step();for(const p of S().proj){if(p.style==='plasma'){if(!px)px=p;(per[p.burst]||(per[p.burst]=new Set())).add(p);}if(!rep&&p.w&&p.w.id==='bls-t-light-repeaters')rep=p;}}
  const bursts=Object.values(per).map(x=>({fired:x.size}));
  out.fire=[!!px&&!!rep,!!px&&!!rep&&Math.abs(Math.hypot(px.vx,px.vy)/Math.hypot(rep.vx,rep.vy)-N.PX_SPD)<0.02,bursts.length>0&&bursts.every(b=>b.fired<=N.PX_BOLTS)];
  // it draws: the plasma orb, warm for ours, violet for theirs
  const cv=document.createElement('canvas');cv.width=200;cv.height=200;const g=cv.getContext('2d');let drew=true;
  try{for(const st of ['plasma','hegplasma'])window.SR_SPACE_FX.drawBolt(g,{x:100,y:100,x0:40,y0:100,vx:400,vy:0,age:0.2,life:2,faction:st==='plasma'?'reb':'heg',style:st},{z:1,t:0,ra:1,tick:0.05,lod:2});}catch(e){drew=String(e);}
  out.draw=[drew===true,!!window.SR_ART.PROJ.plasma&&window.SR_ART.PROJ.plasma.type==='plasma',window.SR_ART.PROJ.hegplasma.style!==window.SR_ART.PROJ.plasma.style];
  N.COMMS_OFF=co;N.REQ_OFF=0;
  return out;
 });
 ok(t35l6.kit.every(Boolean),'HC35 L6 6: your Talons carry the plasma cannon (PX_BOLTS a burst, the damage carried between them); the Crosses keep their repeaters '+JSON.stringify(t35l6.kit));
 ok(t35l6.fire.every(Boolean),'HC35 L6 6: plasma bolts fly at PX_SPD × a repeater bolt\'s speed, PX_BOLTS a burst '+JSON.stringify(t35l6.fire));
 ok(t35l6.draw.every(Boolean),'HC35 L6 6: the plasma orb draws, warm for ours and violet for theirs '+JSON.stringify(t35l6.draw));
 // HC35 L7 (after playtest 2): a request whose reason has gone is withdrawn; holding for your signal isn't "getting nowhere"; no Secondary once the job's settled
 const t35l7=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,roes)=>{B.seed=91;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex);B.plan.wings[w].second=null;}B.plan.assets=[];B.plan.roes=roes||[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const co=N.COMMS_OFF,rt=N.RES_THREAT;N.COMMS_OFF=1;N.REQ_OFF=0;N.RES_THREAT=0;
  // 1: Hold for My Signal in Phase 1, past the stuck guard's 90 s: no "We're getting nowhere"
  go('crash',{k:'suppress',arg:'escorts'},['signal']);for(let i=0;i<N.EXEC_STALL+15;i++){L().detect=0;L().sigW={};L().signal=false;SIM.runFor(1);}   // unseen and still holding all the while
  out.wait=[!L().req.log.some(q=>q.k==='stall'),S().t>N.EXEC_STALL];
  // 2: the hail, then the freighter dies: the request is withdrawn, nothing applied
  go('destroy',{k:'hold'});L35.alarm('fired','test');SIM.runFor(1);L35.fn.reqTrigger('surrender',{},'t');SIM.runFor(1);
  const q=L().req.open.find(x=>x.k==='surrender');F.kill(fr(),null);SIM.step();SIM.step();
  out.dead=[!!q,q&&q.state==='done',q&&q.by==='void',q&&q.answer==null,!L().surrender,S().events.some(e=>e.kind==='request'&&/never mind/.test(e.text))];
  // 3: the job settled: an open "jump now or finish it?" goes, a hurt pilot's request stays; no Secondary is taken up after
  const gap=N.REQ_GAP;N.REQ_GAP=0;go('destroy',{k:'destroy'});L35.alarm('fired','test');SIM.runFor(1);
  L35.fn.reqTrigger('hit',{ship:'joss'},'t');SIM.runFor(1);L35.fn.reqTrigger('phase3',{wid:'dagger'},'t');SIM.runFor(1);
  const p3=L().req.log.find(x=>x.k==='phase3'),hit=L().req.log.find(x=>x.k==='hit');
  L().sec.anvil={k:'defend',arg:'dagger',trig:'phase3',fired:false,noted:false,adopted:false};const n0=L().secLog.length;
  F.kill(fr(),null);SIM.runFor(2);
  out.settled=[L().prim.state==='done',!p3||p3.by==='void',!!hit&&hit.by!=='void',L().secLog.length===n0,!L().sec.anvil.adopted];
  N.COMMS_OFF=co;N.RES_THREAT=rt;N.REQ_OFF=0;N.REQ_GAP=gap;
  return out;
 });
 ok(t35l7.wait.every(Boolean),'HC35 L7: holding for your signal past the stuck guard raises no "getting nowhere" '+JSON.stringify(t35l7.wait));
 ok(t35l7.dead.every(Boolean),'HC35 L7: the freighter\'s hail, withdrawn once it\'s dead, nothing applied '+JSON.stringify(t35l7.dead));
 ok(t35l7.settled.every(Boolean),'HC35 L7: once the job\'s settled its requests go (a hurt pilot\'s stays) and no Secondary is taken up '+JSON.stringify(t35l7.settled));
 // HC35 M1 (after playtest 2): boarding without stopping her; the power plant under 80% hull; engines out, thrusters; a hangar; size 10 and up; plasma as blaster bolts
 const t35m1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400'),pd=()=>Math.hypot(fr().x-L().planet.x,fr().y-L().planet.y);
  const go=(prim,ex,lo)=>{B.seed=93;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex[w]||{k:'hold'});B.plan.wings[w].second=null;}
    for(const sid in lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=lo[sid];
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;
  const sub=k=>L().subs.find(x=>x.k===k);
  // 1: the power plant is buried until the hull's under 80%; then it shows, on the card too
  go('destroy',{});SIM.runFor(1);X.fn.OV.mapClick({x:fr().x,y:fr().y},{},fr());X.fn.syncTarget(true);const card=()=>document.getElementById('h35Tgt').textContent;
  const hid=[!L().powerSeen,!!sub('power'),!/Power plant/.test(card())];
  fr().hull=fr().maxHull*0.79;SIM.runFor(1);X.fn.syncTarget(true);
  out.power=hid.concat([!!L().powerSeen,L().callouts.some(c=>c.text==='POWER PLANT EXPOSED'),/Power plant/.test(card())]);B.inspect=null;
  // 2: engines out: she crawls on her thrusters, can't jump, and the planet doesn't take her; the power plant out: dead in space, and she falls
  go('crash',{});SIM.runFor(1);L().alarm=true;const e=sub('engines');e.hp=0;L35.fn.subDown(fr(),e,null);
  const p=L().planet,a=Math.atan2(fr().y-p.y,fr().x-p.x);fr().x=p.x+Math.cos(a)*(p.r+900);fr().y=p.y+Math.sin(a)*(p.r+900);fr().px=fr().x;fr().py=fr().y;
  SIM.runFor(20);const v=Math.hypot(fr().vx,fr().vy);
  out.thrust=[!!L().engOut,!L().disabled,fr().alive&&!L().crashed,Math.abs(v-L().cruise*N.THRUST_SPD)<L().cruise*0.1,L().spool==null,+v.toFixed(1)];
  L().powerSeen=1;const pw=sub('power');pw.hp=0;L35.fn.subDown(fr(),pw,null);let fell=false;for(let i=0;i<120&&!fell;i++){SIM.runFor(1);fell=!!L().crashed;}
  out.dead=[!!L().disabled,fell,L().prim.state==='done'];
  // 3: boarding a ship on the move: no Disable; Mags closes, clamps on, rides with her, helpless; the board fills
  go('steal',{amber:{k:'board'}},{mags:'board'});L35.alarm('fired','test');
  const m=by('mags'),f=fr();m.x=f.x+Math.cos(f.h+Math.PI/2)*900;m.y=f.y+Math.sin(f.h+Math.PI/2)*900;   // 900 off: the approach and the clamp, not a long chase
 m.px=m.x;m.py=m.y;
  let dockT=null;for(let i=0;i<20*60&&dockT==null;i++){SIM.step();if(m.dock35)dockT=S().t;}
  const rel=()=>{const c=Math.cos(-f.h),sn=Math.sin(-f.h);return {x:(m.x-f.x)*c-(m.y-f.y)*sn,y:(m.x-f.x)*sn+(m.y-f.y)*c};};SIM.runFor(1.5);const r0=rel(),sp0=Math.hypot(f.vx,f.vy);SIM.runFor(3);const r1=rel();
  out.board=[dockT!=null,!L().disabled&&!L().engOut,sp0>10,Math.hypot(r1.x-r0.x,r1.y-r0.y)<5,SIM.hooks.canFire(m,S().ships.find(x=>x.role35==='escort'&&x.alive)||f,null)===false,
    SIM.hooks.abilityOk(m,'boost')==='clamped on',L().board>0,L35.PRIMARIES.steal.needs.join()==='board',dockT&&Math.round(dockT)];
  // 4: a hangar takes her in, out of sight and out of reach; and only size 10 and up can be boarded
  const row=L35.HC35_CLASSES.fl400;row.hangar={x:0,y:0};SIM.runFor(1.5);
  out.hangar=[!!m.inHangar35,!!m.unseen,X.fn.OV.shipHidden(m),!S().ships.some(t=>t.faction==='heg'&&t.alive&&F.foesOf&&F.foesOf(t).includes(m))];
  delete row.hangar;
  const sz=row.size;row.size=9;go('steal',{amber:{k:'board'}},{mags:'board'});SIM.runFor(1);L35.alarm('fired','test');SIM.runFor(3);
  out.size=[!by('mags').dock35&&by('mags').beh.kind!=='dock35'];row.size=sz;
  // 5: hove to, she holds station: no drift into the planet
  go('pirate',{});SIM.runFor(1);{const p2=L().planet,a2=Math.atan2(fr().y-p2.y,fr().x-p2.x);fr().x=p2.x+Math.cos(a2)*(p2.r+900);fr().y=p2.y+Math.sin(a2)*(p2.r+900);fr().px=fr().x;fr().py=fr().y;}
  L35.answerSurrender('take');SIM.runFor(25);out.hove=[L().surrender==='take',fr().alive&&!L().crashed,Math.hypot(fr().vx,fr().vy)<5];
  // 6: plasma: blaster bolts, the designer's defaults
  const P=window.SR_ART.PROJ;out.px=[P.plasma.style==='blaster',P.hegplasma.style==='hegblaster',N.PX_SPD===1.2,N.PX_CRIT===0,N.PX_RNG===0.7,N.PX_DMG===1.15,N.PX_SPREAD===1.6];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35m1.power.every(Boolean),'HC35 M1: the power plant is hidden until the hull is under 80%, then shown, on the card too '+JSON.stringify(t35m1.power));
 ok(t35m1.thrust.slice(0,5).every(Boolean),'HC35 M1: engines out, she crawls on her thrusters, can\'t jump, and doesn\'t fall '+JSON.stringify(t35m1.thrust));
 ok(t35m1.dead.every(Boolean),'HC35 M1: the power plant out inside the pull, she\'s dead in space and falls: Crash done '+JSON.stringify(t35m1.dead));
 ok(t35m1.board.slice(0,8).every(Boolean),'HC35 M1: boarding a ship under way: clamped on, riding with her, helpless; Steal needs only the boarders '+JSON.stringify(t35m1.board));
 ok(t35m1.hangar.every(Boolean),'HC35 M1: in a hangar the boarder is out of sight and out of reach '+JSON.stringify(t35m1.hangar));
 ok(t35m1.size.every(Boolean),'HC35 M1: a ship under size 10 can\'t be boarded '+JSON.stringify(t35m1.size));
 ok(t35m1.hove.every(Boolean),'HC35 M1: hove to, she holds station, no fall into the planet '+JSON.stringify(t35m1.hove));
 ok(t35m1.px.every(Boolean),'HC35 M1/N1: plasma as blaster bolts, its defaults (toned down after the Steal run) '+JSON.stringify(t35m1.px));
 // HC35 N1 (the Steal run): the prize crew repairs the engines before she can make her cruise or jump; she turns like a capital ship; Phase 3 is the response arriving
 const t35n1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,lo)=>{B.seed=95;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex[w]||{k:'hold'});B.plan.wings[w].second=null;}
    for(const sid in lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=lo[sid];
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;
  // 1: her engines out, then boarded: the prize crew mends them on her thrusters, then she makes her cruise; she can't jump till then
  go('steal',{amber:{k:'board'}},{mags:'board'});L35.alarm('fired','test');const e=L().subs.find(x=>x.k==='engines');e.hp=0;L35.fn.subDown(fr(),e,null);
  // the boarders' work done (as dockTick finishes it): the test is the prize crew's repairs, not the approach
  const f=fr();SIM.runFor(1);L().boarded=true;L().prize=true;f.faction='reb';f.quiet=true;L().disabled=!L35.fn.subUp('power');L().drift=null;
  const prize=!!L().prize;let maxW=0,prev=f.h;const turn=n=>{for(let i=0;i<n;i++){SIM.step();maxW=Math.max(maxW,Math.abs(((f.h-prev+3*Math.PI)%(2*Math.PI))-Math.PI)*20);prev=f.h;}};
  turn(20*N.CAP_REALIGN*4);const rep0=L().repair&&L().repair.k,v0=Math.hypot(f.vx,f.vy);
  for(let i=0;i<N.REPAIR_SECS+5&&L().engOut;i++)turn(20);
  turn(20*N.CAP_REALIGN*4);const v1=Math.hypot(f.vx,f.vy),fixed=!L().engOut,hpOk=e.hp===Math.round(e.max*N.REPAIR_HP);
  // engines out, parked at our jump point, she doesn't jump; with them back, she does
  const jp=S().points.ourjump,e2=L().subs.find(x=>x.k==='engines');e2.hp=0;L35.fn.subDown(f,e2,null);f.x=jp.x;f.y=jp.y;f.px=f.x;f.py=f.y;SIM.runFor(2);const stayed=f.alive&&!f.jumped;
  out.prize=[prize,rep0==='engines',Math.abs(v0-L().cruise*N.THRUST_SPD)<L().cruise*0.1,stayed,fixed,hpOk,Math.abs(v1-L().cruise*N.PRIZE_K)<L().cruise*0.15,maxW<=N.PRIZE_TURN+0.005,
    L().callouts.some(c=>c.text==='ENGINES BACK ONLINE'),+v0.toFixed(1),+v1.toFixed(1),+maxW.toFixed(3)];
  // 2: a settled job sends everyone home but isn't Phase 3; the response arriving is
  go('destroy',{dagger:{k:'destroy'}});L35.alarm('fired','test');SIM.runFor(1);F.kill(fr(),null);SIM.runFor(2);
  const ph=L().phase;L().responseAt=S().t+0.5;SIM.runFor(1.5);
  out.phase=[L().prim.state==='done',ph===2,L().phase===3,S().ships.some(s=>s.role35==='response')];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35n1.prize.slice(0,9).every(Boolean),'HC35 N1: the prize crew mends her engines on her thrusters, she can\'t jump till then, then makes her cruise, turning like a capital ship '+JSON.stringify(t35n1.prize));
 ok(t35n1.phase.every(Boolean),'HC35 N1: a settled job isn\'t Phase 3; the response arriving is '+JSON.stringify(t35n1.phase));
 // HC35 O1 (the designer's run 248991): a released freighter runs for its jump point, not jumping where it is; the surrender's default serves the primary; missiles wait for a full lock; a firm lock shrugs off some chaff
 const t35o1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,lo)=>{B.seed=96;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},(ex||{})[w]||{k:'hold'});B.plan.wings[w].second=null;if(lo)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=lo;}
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;
  const JS=L35.TUNE.JUMP_SECS.get();
  // 1: the hand-over done mid-lane, she's let go: no spool there; she runs on and spools only at her lane's end
  go('destroy');L35.alarm('fired','test');SIM.runFor(1);L35.answerSurrender('take');   // not Pirate: its hand-over ends the mission
  // (the ship sent to stand by: since playtest 3, only it counts)
  const j=by(Object.keys(L().ow)[0]||'joss');for(let i=0;i<20&&!L().transferred;i++){L().transfer=Math.max(L().transfer,N.TRANSFER_SECS-0.05);j.x=fr().x+400;j.y=fr().y;j.px=j.x;j.py=j.y;SIM.step();}
  const rel=[!!L().transferred,!!L().released,L().spool==null,L().leg<L().lane.length-1];
  SIM.runFor(JS+4);rel.push(fr().alive&&!fr().jumped,L().spool==null,Math.hypot(fr().vx,fr().vy)>L().cruise*0.5);
  const end=L().lane[L().lane.length-1];L().leg=L().lane.length-1;fr().x=end.x;fr().y=end.y;fr().px=fr().x;fr().py=fr().y;
  SIM.runFor(2);rel.push(L().spool!=null);SIM.runFor(JS+1);rel.push(!fr().alive&&!!fr().jumped);
  out.release=rel;
  // 2: the hail's default: the ship for Steal, no deal for Destroy and Crash, the cargo for Pirate and Strip
  // (each launched with the Brickbats it needs: a Steal needs boarders, a Strip pods, a Crash bombs)
  const def={},LO={steal:'board',strip:'pods',crash:'bombs'};
  for(const p of ['steal','destroy','crash','pirate','strip']){go(p,null,LO[p]||'bombs');L35.alarm('fired','test');SIM.runFor(0.5);
    N.REQ_OFF=0;const gap=N.REQ_GAP;N.REQ_GAP=0;L35.fn.reqTrigger('surrender',{},'t');SIM.runFor(0.5);N.REQ_OFF=1;N.REQ_GAP=gap;
    const q=L().req.open.find(x=>x.k==='surrender')||L().req.log.find(x=>x.k==='surrender');def[p]=L().primK===p&&q&&q.def;}
  // a crew that gives up the ship (Demoralised, Demand the ship): the prize crew flies her home, she doesn't sit hove to
  go('steal',null,'board');B.mods=[];L().mods.push({k:'demoralised',hidden:false});L35.alarm('fired','test');SIM.runFor(0.5);L35.answerSurrender('demand');
  const p0={x:fr().x,y:fr().y},jp=S().points.ourjump,d0=F.dist(fr(),jp);SIM.runFor(15);
  out.given=[!!L().prize,L().surrender==='ship',F.dist(fr(),p0)>200,F.dist(fr(),jp)<d0];
  out.def=[def.steal==='take',def.destroy==='no',def.crash==='no',def.pirate==='take',def.strip==='take',JSON.stringify(def)];
  // 3: a missile waits for a full lock; chaff draws a firm lock off less often
  go('destroy',{dagger:{k:'destroy'}});L35.alarm('fired','test');SIM.runFor(0.5);
  const s=by('joss'),e=S().ships.find(x=>x.role35==='escort'&&x.alive);s.x=e.x-1000;s.y=e.y;s.px=s.x;s.py=s.y;s.h=0;s.vh=0;s.fireAt=e.id;s.lockOn=e.id;
  for(const q of s.wpns)if(q.w.needsLock)q.cd=0;
  s.locks[e.id]=0.7;const at70=F.missileShot(s);s.locks[e.id]=1;const at100=F.missileShot(s);
  out.mis=[!!s.wpns.find(q=>q.w.needsLock),at70===null,!!at100,Math.abs(SIM.hooks.chaffP({lock:1})-0.5)<1e-9,Math.abs(SIM.hooks.chaffP({lock:0.6})-0.7)<1e-9,SIM.hooks.misLock()===N.MIS_LOCK35];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35o1.release.every(Boolean),'HC35 O1: released after the hand-over, she runs her lane and jumps only at its end '+JSON.stringify(t35o1.release));
 ok(t35o1.given.every(Boolean),'HC35 O1: a crew that gives up the ship: the prize crew flies her home '+JSON.stringify(t35o1.given));
 ok(t35o1.def.slice(0,5).every(Boolean),'HC35 O1 / P3 §3.5: the surrender\'s default follows the primary\'s family '+JSON.stringify(t35o1.def));
 ok(t35o1.mis.every(Boolean),'HC35 O1: a missile waits for a full lock; a firm lock is harder to draw off with chaff '+JSON.stringify(t35o1.mis));
 // HC35 P3 (playtest 3, docs/ARENA-HC35-FEEDBACK-3.md §5): orders with objects, points, the clock, the help requests, pace, surrender, Ambush's end
 const t35p3=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400'),q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  const amb={k:'ambush',arg:'response'};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||61;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},(ex||{})[w]||{k:'hold'});B.plan.wings[w].second=null;if(o.lo)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo;}
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=(o.opt||[]).map(k=>({k,ship:null}));X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;
  // 2: the object pickers (window 4): Destroy lists the freighter, the escort, the response (and a point); Disable the freighter's parts
  B.seed=61;B.mods=[];B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();await new Promise(r=>setTimeout(r,300));
  q('[data-primary="destroy"]').click();B.mods=[];B.plan.wings.dagger.exec={k:'destroy',arg:'freighter'};B.plan.wings.anvil.exec={k:'disable',arg:'engines'};B.step=4;X.fn.render();
  const opts=sel=>sel?[...sel.options].map(o=>o.value):[];
  const dObj=opts(q('[data-arg="exec"][data-wing="dagger"]')),aSub=opts(q('[data-arg="exec"][data-wing="anvil"]'));
  out.pick=[dObj.join()==='freighter,escort,response,area',aSub.join()==='power,engines,comms,turrets',JSON.stringify(dObj)];
  // 4: the strip: the response at the freighter's jump point; "No response" with Kill the Distress Call
  const strip=()=>(q('.h35-po')||{}).textContent||'';const s1=strip();B.plan.optionals=[{k:'distress',ship:null}];X.fn.render();const s2=strip();B.plan.optionals=[];
  out.strip=[/Alarm/.test(s1)&&/Distress call/.test(s1)&&/Response about/.test(s1)&&/the freighter's jump point/.test(s1),/No response/.test(s2)];
  // 3: an Ambush point set on the plan is where the wing waits; with none, the response's arrival point
  N.RES_THREAT=0;
  go('ambush',{dagger:Object.assign({at:{x:6000,y:500}},amb),anvil:amb,amber:amb});SIM.runFor(3);
  const pAt=L().W([6000,500]),ap=L35.fn.ambushPoint(),bd=s=>s.beh&&s.beh.dest;
  out.point=[F.dist(bd(by('joss'))||{x:0,y:0},pAt)<50,F.dist(bd(by('sera'))||{x:0,y:0},ap)<50,by('joss').beh.why==='lying in wait'];
  // the HUD clock names the place
  L35.alarm('fired','test');L().distress={t0:S().t,landed:true,cut:false};L().responseAt=S().t+77;window.SR_ARENA_HC.api.syncHud(true);const clock=(document.getElementById('hcClock')||{}).textContent||'';L().responseAt=null;
  out.clock=[/RESPONSE IN 1:1\d · AT FREIGHTER'S JUMP POINT/.test(clock),clock];
  // 6: pace: Anvil (two Brickbats) reaches its point together
  go('ambush',{dagger:amb,anvil:Object.assign({at:{x:5200,y:900}},amb),amber:amb},{seed:62});const pt=L().W([5200,900]),arr={};
  for(let i=0;i<20*90&&Object.keys(arr).length<3;i++){SIM.step();for(const id of ['sera','brask','ollo']){const x=by(id);if(x&&arr[id]==null&&F.dist(x,pt)<1400)arr[id]=S().t;}}
  const ts=Object.values(arr);out.pace=[ts.length===3,ts.length===3&&Math.max(...ts)-Math.min(...ts)<4,JSON.stringify(arr)];
  // 5 and 7: Ollo pinned by two escorts while his wing waits: Sera (Protective) sends help within 3 s, logged; a waiting wingmate takes on the attackers
  const pinOllo=()=>{const o=by('ollo'),es=S().ships.filter(x=>x.role35==='escort'&&x.alive).slice(0,2);es.forEach((e,i)=>{e.x=o.x-600-i*150;e.y=o.y+(i?120:-120);e.px=e.x;e.py=e.y;e.h=Math.atan2(o.y-e.y,o.x-e.x);e.vh=e.h;e.fireAt=o.id;F.setBeh(e,{kind:'engage',target:o.id,hard:true});});o.firedOnT=S().t;o.lastHitBy=es[0]&&es[0].id;return es;};
  const helped=secs=>{const t0=S().t;for(let i=0;i<20*secs;i++){pinOllo();SIM.step();const p=Object.values(L().aid.protect).find(x=>x.unit==='ollo');if(p)return +(S().t-t0).toFixed(2);}return null;};
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:63});SIM.runFor(2);const tHelp=helped(3);
  const dec=L().dec.find(d=>d.kind==='aid');
  out.aid=[tHelp!=null&&tHelp<=3,!!dec&&/^Sera (sent|went).* cover Ollo/.test(dec.line),S().events.some(e=>e.kind==='aid'&&e.ship==='ollo')];
  // the leader's weights below the threshold: Sera refuses, Ollo asks the nearest other wing; with nobody, he falls back
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:63});SIM.runFor(2);
  const th=N.AID_THRESH,ask=N.ASK_THRESH;N.AID_THRESH=5;N.ASK_THRESH=-5;helped(4);
  const refused=L().dec.some(d=>d.kind==='aid'&&/^Sera refused Ollo/.test(d.line)),fell=!!L().aid.fallback.ollo;
  N.AID_THRESH=th;N.ASK_THRESH=ask;
  // across wings: Anvil's leader refuses (forced), another wing's leader in range sends help
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:63});SIM.runFor(2);
  const oO=by('ollo'),jo=by('joss');jo.x=oO.x+1500;jo.y=oO.y;jo.px=jo.x;jo.py=jo.y;
  const aidFrom0=SR_OPS.decideAid;let calls=0;SR_OPS.decideAid=(l,u,t,c,o,r)=>{calls++;return calls===1?{send:[],refused:true,top:[],score:0}:aidFrom0(l,u,t,c,o,r);};
  N.ASK_THRESH=-5;helped(2);N.ASK_THRESH=ask;SR_OPS.decideAid=aidFrom0;
  const pr=Object.entries(L().aid.protect).find(([h,p])=>p.unit==='ollo');
  out.refuse=[refused,fell,!!pr&&['joss','wren','petra','hale','kit','tam','mags'].includes(pr[0])];
  // a wing docked boarding: none of it is sent (critical work)
  go('steal',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'board'}},{seed:64,lo:'board'});SIM.runFor(1);
  const kit=by('kit'),mags=by('mags');mags.dock35={t:S().t,side:1,from:{x:mags.x,y:mags.y,h:mags.h}};
  const es2=S().ships.filter(x=>x.role35==='escort'&&x.alive).slice(0,2);let sentAmber=false;
  for(let i=0;i<40;i++){es2.forEach((e,j)=>{e.x=kit.x-600-j*150;e.y=kit.y;e.px=e.x;e.py=e.y;e.h=Math.atan2(kit.y-e.y,kit.x-e.x);e.vh=e.h;F.setBeh(e,{kind:'engage',target:kit.id,hard:true});});kit.firedOnT=S().t;SIM.step();
    if(L().aid.protect.mags)sentAmber=true;}
  out.docked=[!sentAmber];
  // 8: wings flying past the freighter to their ambush points don't make the crew surrender
  N.RES_THREAT=keep.RES_THREAT;go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:65});SIM.runFor(60);
  out.past=[L().offered==null,L().resolve>30,+L().resolve.toFixed(1)];
  // 9: Ambush with a spare ship: Take sends one to stand by; the transfer runs only while it's in the ring
  N.RES_THREAT=0;go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:66});L35.alarm('fired','test');SIM.runFor(1);
  const defA=(()=>{N.REQ_OFF=0;const gap=N.REQ_GAP;N.REQ_GAP=0;L35.fn.reqTrigger('surrender',{},'a');SIM.runFor(0.5);N.REQ_OFF=1;N.REQ_GAP=gap;const r=L().req.open.find(x=>x.k==='surrender')||L().req.log.find(x=>x.k==='surrender');return r&&r.def;})();
  L35.answerSurrender('take');const ow=Object.keys(L().ow),owS=by(ow[0]);
  const far={x:fr().x+9000,y:fr().y};if(owS){owS.x=far.x;owS.y=far.y;owS.px=owS.x;owS.py=owS.y;}const tr0=L().transfer;SIM.step();SIM.step();const paused=L().transfer===tr0&&L().transferPaused;
  out.take=[defA==='take',ow.length===1,L().surrender==='take',paused];
  // nobody spare: No deal, said; Leave No Witnesses: the default is No deal
  go('ambush',{dagger:{k:'destroy',arg:'freighter'},anvil:{k:'destroy',arg:'freighter'},amber:{k:'destroy',arg:'freighter'}},{seed:66,lo:'bombs'});L35.alarm('fired','test');SIM.runFor(1);
  for(const x of S().ships)if(x.faction==='reb'&&x.wing)F.setBeh(x,{kind:'engage',target:'fl400'});
  L35.answerSurrender('take');const noSpare=[L().surrender==null,L().dec.some(d=>/Nobody to spare/.test(d.line))];
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:66,opt:['witnesses']});L35.alarm('fired','test');SIM.runFor(0.5);
  N.REQ_OFF=0;{const gap=N.REQ_GAP;N.REQ_GAP=0;L35.fn.reqTrigger('surrender',{},'w');SIM.runFor(0.5);N.REQ_GAP=gap;}N.REQ_OFF=1;
  const qw=L().req.open.find(x=>x.k==='surrender')||L().req.log.find(x=>x.k==='surrender');
  out.nodeal=noSpare.concat([!!qw&&qw.def==='no',!!qw&&!!qw.note&&/Leave No Witnesses/.test(qw.note.take)]);
  // 10: Ambush with Kill the Distress Call: impossible; the leader says nobody's coming and the wing finds work
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:67,opt:['distress']});SIM.runFor(1);L().distress={t0:S().t,landed:false,cut:true};SIM.runFor(2);
  out.nobody=[L35.execState('dagger')!=='waiting',L().exec.dagger.k!=='ambush'||L35.execState('dagger')==='impossible',S().ships.some(x=>x.faction==='reb'&&x.bubble&&/Nobody's coming/.test(x.bubble.text||''))||L().dec.some(d=>/nothing left/i.test(d.why||'')),L().exec.dagger.k];
  // 12: ops-core.js decides the same from the same seed, with no ships (its own stub adapter)
  out.core=Object.values(SR_OPS.selfTest()).every(Boolean);
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35p3.pick.slice(0,2).every(Boolean),'HC35 P3 2: Destroy\'s picker lists the freighter, the escort, the response (and a point); Disable the parts '+JSON.stringify(t35p3.pick));
 ok(t35p3.strip.every(Boolean)&&t35p3.clock[0],'HC35 P3 4: the strip reads the events, "No response" with Kill the Distress Call; the clock names the place '+JSON.stringify([t35p3.strip,t35p3.clock]));
 ok(t35p3.point.every(Boolean),'HC35 P3 3: a wing waits at its set Ambush point; with none, at the response\'s arrival point '+JSON.stringify(t35p3.point));
 ok(t35p3.pace.slice(0,2).every(Boolean),'HC35 P3 6: a wing with Brickbats reaches its point together '+JSON.stringify(t35p3.pace));
 ok(t35p3.aid.every(Boolean),'HC35 P3 5: a pinned Brickbat: Sera sends help within 3 s, logged and in the feed '+JSON.stringify(t35p3.aid));
 ok(t35p3.refuse.every(Boolean)&&t35p3.docked.every(Boolean),'HC35 P3 5: refused, it falls back; refused by its own leader, another wing helps; a docked wing sends nobody '+JSON.stringify([t35p3.refuse,t35p3.docked]));
 ok(t35p3.past.slice(0,2).every(Boolean),'HC35 P3 8: wings flying past don\'t make the crew surrender '+JSON.stringify(t35p3.past));
 ok(t35p3.take.every(Boolean)&&t35p3.nodeal.every(Boolean),'HC35 P3 9: Take sends a ship to stand by, the transfer only counts it; nobody spare: no deal; Leave No Witnesses: no deal '+JSON.stringify([t35p3.take,t35p3.nodeal]));
 ok(t35p3.nobody.slice(0,3).every(Boolean),'HC35 P3 10: Ambush with the distress killed: impossible, and the wing finds work '+JSON.stringify(t35p3.nobody));
 ok(t35p3.core,'HC35 P3 12: ops-core.js decides the same from the same seed, with no ships');
 // HC35 P5 (playtest 3, §3.7, test 11): Patrol Sweep, authored as data: Clear and Ambush derived; on the board; Clear wins when the patrol is gone
 const t35p5=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  const O=L35.OPPORTUNITIES.patrol_sweep;
  out.derive=[L35.primaryKeysOf(O).join()==='clear,ambush',SR_OPS.objectsFor(O,'destroy').map(t=>t.id).join()==='patrol,reinforcements'];
  // the board: its card switches the opportunity; window 1 shows its two families, its primaries only
  B.oppId='vulnerable_freighter';B.seed=71;X.fn.showBoard(false);const card=q('[data-msel="patrol_sweep"]');card&&card.click();
  const sw=B.oppId==='patrol_sweep';q('.bf-plan [data-act="brief"]').click();await new Promise(r=>setTimeout(r,300));
  out.board=[!!card,sw,qa('[data-primary]').map(b=>b.dataset.primary).join()==='clear,ambush',qa('.h35-fam').length===2];
  // launched on the leaders' Clear plan: the patrol destroyed, Clear is done and pays
  q('[data-primary="clear"]').click();N.REQ_OFF=1;N.COMMS_OFF=1;X.fn.launch();
  const pat=()=>S().ships.filter(s=>s.alive&&s.cast35==='patrol');const n0=pat().length;SIM.runFor(2);
  for(const s of pat())F.kill(s,null);SIM.runFor(1);
  out.clear=[n0===7,!S().ships.some(s=>s.id==='fl400'),L().prim.state==='done',L35.rewardOf().done,(L35.rewardOf().earned.c||0)>0];
  N.REQ_OFF=0;N.COMMS_OFF=0;B.oppId='vulnerable_freighter';X.fn.showBoard(false);
  return out;
 });
 ok(t35p5.derive.every(Boolean)&&t35p5.board.every(Boolean),'HC35 P5 11: Patrol Sweep derives Clear and Ambush, has its card, and window 1 offers only those '+JSON.stringify([t35p5.derive,t35p5.board]));
 ok(t35p5.clear.every(Boolean),'HC35 P5 11: Clear wins when the patrol is destroyed '+JSON.stringify(t35p5.clear));
 // HC35 W1 (the windows handoff, §1): the step track reads done, current and to come; window 1's part dots; the readiness pill counts what's missing; no title attributes
 const t35w1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  const track=()=>qa('.h35-node').map(n=>n.className.replace('h35-node is-','')).join(','),dots=()=>qa('.h35-node__parts u.is-on').length,
    links=()=>qa('.h35-link').map(l=>l.className.replace(/.*is-/,'')).join(',');
  out.frame=[!!q('.h35-holo .h35-fr'),!!q('.h35-holo__title'),/^PLAN: /.test(q('.h35-holo__title').textContent),!!q('.h35-holo__ped'),!!q('.h35-holo__beam')];
  const t1=[track(),dots(),links(),q('.h35-fbtn--back').textContent.includes('Back to board')];
  q('[data-primary="crash"]').click();const setLo=v=>{for(const w in B.plan.wings)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=v;};setLo('pods');
  B.part=2;X.fn.render();const t1b=[track(),dots(),q('.h35-fbtn--back').textContent.includes('Back to board')];
  B.step=3;B.part=1;X.fn.render();const t3=[track(),dots(),links(),!!q('.h35-node.is-done [data-step="1"]'),!q('.h35-node.is-todo [data-step]')];
  out.track=[t1[0]==='on,todo,todo,todo',t1[1]===1,t1[2]==='next,todo,todo',t1[3],t1b[0]==='on,todo,todo,todo',t1b[1]===2,!t1b[2],
    t3[0]==='done,done,on,todo',t3[1]===2,t3[2]==='done,done,next',t3[3],t3[4]];
  // the pill: Crash with no bombs aboard is one missing; its tip lists every check; a click opens the list, any other click closes it
  const rows=X.fn.checklist(),miss=rows.filter(r=>!r.ok&&!r.warn).length,pill=q('.h35-needs__pill');
  out.pill=[miss>=1,pill.textContent.includes(miss+' missing'),pill.classList.contains('is-miss'),pill.dataset.tb.split('\n').length===rows.length,
    rows.every(r=>pill.dataset.tb.includes(r.text)),!X.fn.ready()];
  pill.click();const open=qa('.h35-needs__pop .sr-check').length===rows.length;q('.h35-holo__title').click();
  out.pop=[open,!q('.h35-needs__pop')];
  setLo('bombs');X.fn.render();const p2=q('.h35-needs__pill'),miss2=X.fn.checklist().filter(r=>!r.ok&&!r.warn).length;
  out.met=[miss2===0,p2.textContent.includes('all met'),p2.classList.contains('is-ok')];
  B.step=4;X.fn.render();out.w4=[!!q('.h35-holo.is-wide'),!!q('.h35-holo__title'),!!q('.h35-fbtn--go[data-act="launch"]'),!!q('.h35-needs__pill')];
  out.title=qa('[title]').length;
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35w1.frame.every(Boolean),'HC35 W1: the window has the holo frame, its title, the pedestal and the beam '+JSON.stringify(t35w1.frame));
 ok(t35w1.track.every(Boolean),'HC35 W1: the step track reads done, current and to come, and window 1\'s part dots follow the part '+JSON.stringify(t35w1.track));
 ok(t35w1.pill.every(Boolean)&&t35w1.pop.every(Boolean)&&t35w1.met.every(Boolean),'HC35 W1: the readiness pill counts the missing checks, its tip lists them all, a click opens the list '+JSON.stringify([t35w1.pill,t35w1.pop,t35w1.met]));
 ok(t35w1.w4.every(Boolean),'HC35 W1: window 4 has the frame, the pill and Launch '+JSON.stringify(t35w1.w4));
 ok(t35w1.title===0,'HC35 W1: no title attributes inside #arHc35 ('+t35w1.title+')');
 // HC35 W2 (the windows handoff, §2–§3): the objective cards in their family columns; the toggle rows, their conflict and suggestion tags, the cap, the Preservation field; the second panels
 const t35w2=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  // part 1: four family columns, a card a primary with its pitch and glyph, at most one locked card a column, the rest named in the header's tip
  const cols=qa('.h35-fam'),heads=cols.map(c=>c.querySelector('.h35-panel__head').textContent);
  const PITCH={steal:'Take the freighter intact',pirate:'Scare the crew into handing it over',strip:'Haul off what you can carry',destroy:'Blow it apart',crash:'Smash it into the planet',tag:'Follow it home to its depot',ambush:'Use it as bait to draw them in'};
  const later=L35.LATER_PRIMARIES.every(x=>{const c=cols[L35.FAMILIES.indexOf(x.family)];return c.textContent.includes(x.name)||(c.querySelector('.h35-panel__head').dataset.tb||'').includes(x.name);});
  out.cols=[heads.join()==='Take it,Deny it,Use it,Bait with it',cols.every(c=>c.querySelectorAll('.h35-ocard.is-locked').length<=1),later,
    L35.PRIMARY_KEYS.every(k=>q('[data-primary="'+k+'"] .h35-ocard__pitch').textContent===PITCH[k]&&!!q('[data-primary="'+k+'"] svg.h35-g')),
    L35.PRIMARY_KEYS.every(k=>cols[L35.FAMILIES.indexOf(L35.PRIMARIES[k].family)].contains(q('[data-primary="'+k+'"]'))),!q('.h35-fam--later')];
  // picked: the gold tab; its needs green or orange; the others neutral
  q('[data-primary="crash"]').click();for(const w in B.plan.wings)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]='pods';X.fn.render();
  out.pick=[!!q('[data-primary="crash"].is-picked .h35-ocard__tab'),qa('.h35-ocard__tab').length===1,!!q('[data-primary="crash"] .h35-need.is-no'),!q('[data-primary="strip"] .h35-need.is-ok,[data-primary="strip"] .h35-need.is-no')];
  // part 2: the secondaries as toggle rows; the counter; at 2 / 2 the rest dim and don't toggle; your primary read-only, with Change
  B.part=2;X.fn.render();
  const optRow=k=>q('[data-opt="'+k+'"]').closest('.h35-trow');
  q('[data-opt="witnesses"]').click();q('[data-opt="everyone"]').click();
  const cap=[B.plan.optionals.length===2,q('.h35-count').textContent.replace(/\s/g,'')==='2/2',optRow('ghost').classList.contains('is-cap'),q('[data-opt="ghost"]').getAttribute('aria-disabled')==='true',
    q('[data-opt="ghost"]').dataset.why==='Two at most: turn one off first'];
  q('[data-opt="ghost"]').click();cap.push(!B.plan.optionals.some(o=>o.k==='ghost'),B.plan.optionals.length===2);
  out.cap=cap;
  out.side=[!!q('.h35-panel--side .h35-ocard.is-ro'),!q('.h35-panel--side [data-primary]'),q('.h35-panel--side .h35-ocard__name').textContent==='Crash'];
  // conflict: Leave No Witnesses against the Preservation Order, only while both are on
  const noTag=!optRow('witnesses').querySelector('.h35-ctag');
  B.step=2;B.part=1;X.fn.render();const roeRow=k=>q('[data-roe="'+k+'"]').closest('.h35-trow');
  const noTag2=!roeRow('preservation').querySelector('.h35-ctag');q('[data-roe="preservation"]').click();
  const tagW2=roeRow('preservation').querySelector('.h35-ctag'),soFar=qa('.h35-sofar__row').map(r=>r.textContent);
  B.step=1;B.part=2;X.fn.render();const tagW1=optRow('witnesses').querySelector('.h35-ctag');
  out.conflict=[noTag,noTag2,!!tagW2&&/Conflicts with Leave No Witnesses/.test(tagW2.textContent),!!tagW1&&/Conflicts with Preservation Order/.test(tagW1.textContent),
    soFar.length===3&&/Crash/.test(soFar[0])&&soFar.some(t=>/Leave No Witnesses/.test(t)&&/Conflicts/.test(t))];
  // the Preservation field: 5% steps, 10% to 60%, by click and by ←/→; the plan's presHull follows
  B.step=2;B.part=1;X.fn.render();const field=()=>q('[data-presfield]');B.plan.presHull=0.3;X.fn.render();
  const seen=[];for(let i=0;i<8;i++){q('[data-pres="1"]').click();seen.push(B.plan.presHull);}
  const top=B.plan.presHull;for(let i=0;i<12;i++)q('[data-pres="-1"]').click();const bottom=B.plan.presHull;
  field().dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));const key=B.plan.presHull;
  field().dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  out.pres=[seen[0]===0.35,top===0.6,bottom===0.1,key===0.15,B.plan.presHull===0.1,q('[data-presfield] b').textContent==='10%',field().getAttribute('aria-valuenow')==='10',!q('[data-roe="preservation"] ~ * input[type=range]')];
  // the suggestion: Weapons Tight for Steal, while it's off
  B.plan=L35.leaderPlan('steal',B.plan);B.plan.roes=B.plan.roes.filter(k=>k!=='tight');X.fn.render();
  const sg=roeRow('tight').querySelector('.h35-stag');q('[data-roe="tight"]').click();
  out.suggest=[!!sg&&sg.textContent==='☆ Suggested for Steal',!roeRow('tight').querySelector('.h35-stag'),roeRow('tight').classList.contains('is-on')];
  // the pilot pick, expanded inside its row while on
  B.step=1;B.part=2;B.plan.optionals=[];X.fn.render();q('[data-opt="rookie"]').click();
  out.pilot=[!!optRow('rookie').querySelector('.h35-trow__more select.h35-field[data-optship="rookie"]'),!optRow('ghost').querySelector('.h35-trow__more'),qa('[title]').length===0];
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35w2.cols.every(Boolean),'HC35 W2: window 1\'s family columns, each primary with its pitch and glyph, one locked card a column, the rest named '+JSON.stringify(t35w2.cols));
 ok(t35w2.pick.every(Boolean),'HC35 W2: the picked card has the gold tab and its needs in green or orange '+JSON.stringify(t35w2.pick));
 ok(t35w2.cap.every(Boolean)&&t35w2.side.every(Boolean),'HC35 W2: at 2 / 2 an unpicked secondary dims and doesn\'t toggle; your primary beside, read-only '+JSON.stringify([t35w2.cap,t35w2.side]));
 ok(t35w2.conflict.every(Boolean),'HC35 W2: a conflict tag only with both of its pair on, in both windows and the plan so far '+JSON.stringify(t35w2.conflict));
 ok(t35w2.pres.every(Boolean),'HC35 W2: the Preservation field steps by 5% between 10% and 60%, and presHull follows '+JSON.stringify(t35w2.pres));
 ok(t35w2.suggest.every(Boolean)&&t35w2.pilot.every(Boolean),'HC35 W2: the suggestion chip while the rule is off; the pilot pick inside its row '+JSON.stringify([t35w2.suggest,t35w2.pilot]));
 // HC35 W3 (the windows handoff, §4): the wing columns, their ship rows (WINGS35's pilots, the leader starred), the role and loadout controls, the leader's take, the assets bar and its picker
 const t35w3=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  q('[data-primary="destroy"]').click();B.plan.assets=[];B.step=3;X.fn.render();
  // the rows: one a ship, named for its pilot, ★ on the leader only; the class's full name
  const ok1=L35.WINGS35.every(w=>{const col=q('[data-wcol="'+w.id+'"]'),rows=[...col.querySelectorAll('.h35-srow')];
    return rows.length===w.ships.length&&rows.every((r,i)=>{const t=r.querySelector('.h35-srow__pilot').textContent;return t.startsWith(w.ships[i].name)&&(i===0)===t.includes('★');})&&
      col.querySelector('.h35-wcol__call').textContent===w.name&&col.querySelector('.h35-wcol__lead').textContent===w.ships[0].name;});
  const names=new Set(L35.WINGS35.flatMap(w=>w.ships.map(s=>s.name))),pilots=qa('.h35-srow__pilot').map(e=>e.textContent.split(' ')[0]);
  out.rows=[ok1,pilots.every(n=>names.has(n)),q('[data-wcol="dagger"] .h35-srow__cls').textContent==='FT-4 Cross',qa('.h35-srow.has-lo').length===qa('.h35-srow').filter((_,i)=>L35.WINGS35.flatMap(w=>w.ships)[i].cls==='brickbat').length,
    qa('.h35-srow canvas[data-ship]').length===qa('.h35-srow').length];
  // the controls: one segment pressed a control; Stay home dims the column, not its role control
  q('[data-role="home"][data-wing="amber"]').click();const am=q('[data-wcol="amber"]');
  out.seg=[qa('.h35-seg').every(g=>g.querySelectorAll('[aria-pressed="true"]').length===1),am.classList.contains('is-home'),getComputedStyle(am.querySelector('.h35-wcol__ships')).opacity==='0.55',getComputedStyle(am.querySelector('.h35-seg--role')).opacity==='1'];
  q('[data-role="strike"][data-wing="amber"]').click();
  // the take: orange when it's a critique
  B.plan.wings.anvil.exec={k:'disable',arg:'engines'};for(const sid in B.plan.wings.anvil.loadout)B.plan.wings.anvil.loadout[sid]='pods';X.fn.render();
  const anv=q('[data-wcol="anvil"] .h35-wcol__take'),calm=Object.values(L35.CALM_TAKES);
  out.take=[anv.classList.contains('is-warn'),!calm.includes(anv.textContent),qa('.h35-wcol__take:not(.is-warn)').every(e=>calm.includes(e.textContent))];
  // the assets: an empty slot opens the picker above it; a pick fills it (✓, "unlocks"); Esc and a click outside close the picker
  q('[data-slot="0"]').click();const pop=!!q('.h35-apop'),rows=qa('.h35-apop [data-asset]').length;q('.h35-apop [data-asset="buoy"]').click();
  const slot=q('.h35-aslot.is-filled');
  out.assets=[pop,rows===Object.keys(L35.ASSETS).length,B.plan.assets[0]==='buoy',!q('.h35-apop'),!!slot&&!!slot.querySelector('.h35-aslot__ok'),!!slot&&/unlocks Raise the Interdictor/.test(slot.textContent),qa('.h35-aslot.is-empty').length===L35.ASSET_SLOTS-1];
  q('[data-slot="1"]').click();const open2=!!q('.h35-apop');window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const esc=!q('.h35-apop')&&B.step===3;
  q('[data-slot="1"]').click();q('.h35-wcol__call').click();const outside=!q('.h35-apop');
  q('[data-unasset="0"]').click();
  q('[data-slot="2"]').click();out.close=[open2,esc,outside,B.plan.assets.length===0,!!q('canvas[data-ship]'),qa('[title]').length===0];
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35w3.rows.every(Boolean),'HC35 W3: a column a wing, a row a ship named for its WINGS35 pilot, the leader starred '+JSON.stringify(t35w3.rows));
 ok(t35w3.seg.every(Boolean)&&t35w3.take.every(Boolean),'HC35 W3: the segmented controls; Stay home dims all but its role control; a critique take in orange '+JSON.stringify([t35w3.seg,t35w3.take]));
 ok(t35w3.assets.every(Boolean)&&t35w3.close.every(Boolean),'HC35 W3: the assets bar: an empty slot opens the picker, a pick fills it, Esc or a click outside closes it '+JSON.stringify([t35w3.assets,t35w3.close]));
 // HC35 W1–W3 fit: at 1440 × 900 and 1920 × 1080 the windows' bodies don't scroll (every Brickbat on Boarding party, two secondaries that expand)
 const t35fit=[];
 for(const [vw,vh] of [[1440,900],[1920,1080]]){
  const ctxF=await b.newContext({viewport:{width:vw,height:vh},reducedMotion:'reduce'});const pgF=await ctxF.newPage();
  pgF.on('pageerror',e=>errs.push('pageerror(fit): '+e.message));
  await pgF.goto(base+'#arena');await pgF.waitForTimeout(800);
  await pgF.evaluate(()=>{window.DBGarena.fn.openPicker();document.querySelector('#arRulesets [data-ruleset="hc35"]').click();});await pgF.waitForTimeout(300);
  t35fit.push(await pgF.evaluate(async([vw,vh])=>{
   const X=window.DBGarena.hc35,B=X.B,q=s=>document.querySelector('#arHc35 '+s),out={size:vw+'x'+vh};
   q('.bf-plan [data-act="brief"]').click();await new Promise(r=>setTimeout(r,300));
   q('[data-primary="steal"]').click();for(const w in B.plan.wings)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]='board';
   const fits=async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));   // the reduced-motion rule's 1 ms transitions settle
     const b=q('.h35-holo__body');return b.scrollHeight<=b.clientHeight+1?true:[b.scrollHeight,b.clientHeight];};
   B.step=1;B.part=1;X.fn.render();out.w1a=await fits();
   B.part=2;B.plan.optionals=[{k:'protect',ship:null},{k:'rookie',ship:null}];X.fn.render();out.w1b=await fits();
   B.step=2;B.part=1;B.plan.roes=['preservation','tight'];X.fn.render();out.w2=await fits();
   B.step=3;B.plan.assets=['ram','buoy'];X.fn.render();out.w3=await fits();
   const tops=[...document.querySelectorAll('#arHc35 .h35-wcol .h35-seg--role')].map(e=>Math.round(e.getBoundingClientRect().top));out.align=tops.length===3&&Math.max(...tops)-Math.min(...tops)<=1;
   return out;},[vw,vh]));
  await ctxF.close();
 }
 ok(t35fit.every(f=>f.w1a===true&&f.w1b===true&&f.w2===true&&f.w3===true&&f.align),'HC35 W1–W3: the windows don\'t scroll at 1440 × 900 or 1920 × 1080 '+JSON.stringify(t35fit));
 await ctx4.close();

 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r,sb,sc,drift,b4,hud,fly,feel,mom,ai,b5,hc,hc2,hc3,hc4,f1,f2,f3,f4,g1,g2,g3,g4,g5,h3,i1,i2,v1,t35a,t35b,t35c,t35d,t35e,t35f,t35g,t35k0,t35k1,t35k2,t35k3,t35k4,t35k5,t35k6,t35l1,t35l2,t35l3,t35l4,t35l5,t35l6,t35l7,t35m1,t35n1,t35o1,t35p3,t35p5,t35w1,t35w2,t35w3,t35fit},null,0));
 if(fails.length){console.error('arena-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('arena-smoke OK');
})();
