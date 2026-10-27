/* Smoke test for the Steal Ship mission type and Raid the Bunker (docs/PROLOGUE-HANDOFF.md P5): node tools/stealship-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   - the plan: one hauler sets the squad down; a second, added as an asset, becomes Reinforcements and carries the three
     prize pilots and the fifth soldier; the footer says so until it is there; the plan's tutorial points at the asset
     slot, then at the passengers; the launch sends four soldiers, and the hauler with one soldier and three pilots
   - the bunker: the indoor map with three ships on three pads, a clamp and a fuel line each, nobody to fly them at
     first; one objective row per ship (its current step) and the way home
   - Reinforcements land the pilots as prize pilots; each hotwires their own ship and it flies once its own clamp and
     fuel line are off; every ship up opens the way home; the result lists the ships, and the debrief puts them in the
     Hangar with pilots
   - a pilot lost before their ship is away grounds that ship and the raid goes on; with every pilot lost it fails
   - the combat card for calling the pilots in shows during the prologue, and goes once they are called
   - a save from the phase 4 build gets Raid the Bunker's Reinforcements (save version 14) */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
let FAILS=null;
process.on('unhandledRejection',e=>{console.log('FAIL (threw)\n'+(FAILS||[]).join('\n')+'\n'+e.message.split('\n')[0]);process.exit(1);});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};FAILS=fails;
 const E=(f,a)=>pg.evaluate(f,a);
 const wait=ms=>pg.waitForTimeout(ms);

 // ---------------- the plan ----------------
 await E(()=>{window.Pro.jump('bunker');const f=window.DBGbase.fn;for(let i=0;i<6;i++)f.closeWin();});
 await wait(300);
 let r=await E(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,m=G.missions.find(x=>x.story==='raidbunker');
  f.openPlan(m);f.plAutoFill();f.renderWin();
  const PL=f.getPL();
  return {at:window.Pro.beat(),tv:PL.slots.filter(s=>s.acc==='vehicle').length,pz:PL.slots.filter(s=>/^pz/.test(s.key)).length,max:f.plSquadMax(),
   done:f.plComplete(),foot:document.querySelector('#winCardB .pl-foot').textContent,pass:!!document.querySelector('#winCardB .pl-pass'),
   step:(window.Pro.step()||{}).text};
 });
 await wait(300);
 r.ptr=await E(()=>!document.querySelector('#tutCoach').hidden&&/TEXT NEEDED: the plan tutorial: add the second hauler/.test(document.querySelector('#tutCoach').textContent));
 ok(r.at==='bunker'&&r.tv===1&&r.pz===3&&r.max===4,'Raid the Bunker plans one hauler for the squad, three prize pilots, four seats so far '+JSON.stringify(r));
 ok(!r.done&&/second hauler as an asset/.test(r.foot),'until a second hauler is added the footer says the pilots ride in with it '+r.foot);
 ok(r.pass&&r.step==='bunkerPlan'&&r.ptr,'the plan’s tutorial (its words still to write) points at the asset slot '+JSON.stringify({step:r.step,ptr:r.ptr}));
 r=await E(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,PL=f.getPL();
  const g2=G.fighters.find(x=>x.cls==='graf'&&x.id!==PL.v.tv0);
  const i=f.plAddAsset();f.plSet('as'+i+'s','f:'+g2.id);
  const used=new Set(Object.values(PL.v)),pp=f.ablePilots().find(p=>!used.has(p.id));
  if(pp)f.plSet('as'+i+'p','p:'+pp.id);
  f.plAutoFill();f.renderWin();
  const px=f.plPax();
  return {mode:f.plAssetMode(i),max:f.plSquadMax(),done:f.plComplete(),can:f.canAttempt(PL.m),sold:px.soldiers.length,pil:px.pilots.length,
   kick:document.querySelector('#winCardB .pl-asset .pl-asset__kick')&&[...document.querySelectorAll('#winCardB .pl-asset__kick')].map(e=>e.textContent).join('|'),
   chip:/Reinforcements/.test(document.querySelector('#winCardB .pl-abil').textContent),step:(window.Pro.step()||{}).text};
 });
 ok(r.mode==='reinforce'&&r.max===5&&r.sold===1&&r.pil===3,'the second hauler is Reinforcements: five seats, the fifth soldier and three pilots ride in it '+JSON.stringify(r));
 ok(r.done&&r.can&&r.chip&&/Reinforcements/.test(r.kick),'the plan is complete, with Reinforcements in fire support '+JSON.stringify(r));
 ok(r.step==='bunkerPass','the tutorial moves on to the passengers '+r.step);
 // launch: what goes to the ground scene
 r=await E(()=>{
  const D=window.DBGbase,f=D.fn;
  f.startPlan();
  const M=window.SR.mission,a=(M.assets.ships||[])[0]||{};
  window.__M=JSON.parse(JSON.stringify(M));
  return {squad:M.squad.length,mode:a.mode,sold:(a.soldiers||[]).length,pil:(a.pilots||[]).map(p=>p.prize).join(),prizes:(M.prizes||[]).join(),pilot:!!M.pilot,
   coach:!!(M.coach&&M.coach.reinf&&/TEXT NEEDED/.test(M.coach.reinf.text)),scen:M.scenario};
 });
 ok(r.squad===4&&r.mode==='reinforce'&&r.sold===1&&r.pil==='0,1,2'&&r.prizes==='cross,talon,talon'&&!r.pilot&&r.scen==='bunker',
  'the launch: four soldiers land, the hauler brings one soldier and the pilots for ships 0, 1 and 2 '+JSON.stringify(r));
 ok(r.coach,'during the prologue the ground scene gets the call-in card (its words still to write)');
 await pg.waitForFunction(()=>window.SR.active==='ground',null,{timeout:15000});await wait(600);

 // ---------------- the bunker ----------------
 const go=async()=>{
  await E(()=>{window.SR.go('ground',{test:true,mission:window.__M});});
  await wait(500);
 };
 await go();
 r=await E(()=>{
  const D=window.DBGground;
  return {title:D.SCN.title,mode:D.SCN.mode,walls:D.SCN.gen,pz:D.PZ.map(p=>p.cls+'@'+p.pad.x).join(),work:D.WORK.map(w=>w.kind+w.prize).join(),
   pilots:D.U.filter(u=>u.prize!==undefined&&u.prize!==null).length,obj:D.fn.typeObjectives([],0).map(o=>o.t),
   fs:D.fn.fsItems().map(i=>i.name+' / '+i.sub)};
 });
 ok(r.title==='Raid the Bunker'&&r.mode==='stealship'&&r.walls,'the bunker: Raid the Bunker, a Steal Ship, an indoor map '+JSON.stringify({t:r.title,m:r.mode}));
 ok(r.pz==='cross@1040,talon@1560,talon@2080'&&r.work==='clamp0,fuel0,clamp1,fuel1,clamp2,fuel2','three ships on three pads, a clamp and a fuel line each '+r.pz+' '+r.work);
 ok(r.pilots===0,'nobody to fly them until the reinforcements land');
 ok(r.obj.length===4&&/^Escort \S+ to FT-4 Cross$/.test(r.obj[0])&&/to SF-11 Talon$/.test(r.obj[1])&&/^Get the squad back/.test(r.obj[3]),'one objective row per ship, then the way home: '+r.obj.join(' | '));
 ok(r.fs.some(s=>/^Reinforcements/.test(s)&&/1 soldier and 3 pilots/.test(s)),'Fire Support offers the Reinforcements: '+r.fs.join(' || '));
 // the call-in card: up once there is a fight and the hauler is ready; gone once it is called
 r=await E(()=>{
  const D=window.DBGground;
  D.fn.alertTown('smoke');D.fn.startPlanning();D.fn.tutTick();
  const card=document.querySelector('#sc-ground #tutCard'),up=!card.hidden,txt=card.textContent;
  const sq=D.U.find(u=>u.side==='reb'&&!u.away);
  D.fn.fsPlace('s0',{x:sq.x+30,y:sq.y-30});D.fn.tutTick();
  return {up,txt:/TEXT NEEDED/.test(txt),gone:card.hidden};
 });
 ok(r.up&&r.txt&&r.gone,'the call-in card shows in planning with the hauler ready, and goes once it is called '+JSON.stringify(r));
 r=await E(()=>{
  const D=window.DBGground;
  for(const o of D.FS.orders)o.at=0;
  D.fn.fsPlanStart();
  const P=D.U.filter(u=>u.prize!==undefined&&u.prize!==null);
  return {n:P.length,ks:P.map(u=>u.prize).join(),frail:P.every(u=>u.frail),reinf:D.U.filter(u=>u.reinf&&u.prize===undefined).length,state:D.FS.ships[0].state,
   obj:D.fn.typeObjectives([],0)[0].now};
 });
 ok(r.n===3&&r.ks==='0,1,2'&&r.frail&&r.reinf===1&&r.state==='spent','Reinforcements land three prize pilots and the fifth soldier '+JSON.stringify(r));
 // each pilot to their own ship: hot, but shackled; free the first and it flies
 r=await E(()=>{
  const D=window.DBGground,P=D.U.filter(u=>u.prize!==undefined&&u.prize!==null);
  for(const u of P){const pd=D.PZ[u.prize].pad;u.x=pd.x;u.y=pd.y+20;u.landAt=0;}
  for(let i=0;i<2;i++)D.PZ.forEach((p,k)=>D.fn.hotwireStep(k,false));
  const hot=D.PZ.map(p=>p.hot).join(),away0=D.PZ.some(p=>p.away),obj=D.fn.typeObjectives([],0).map(o=>o.t);
  const dax=D.U.find(u=>u.side==='reb'&&!u.prize&&u.prize!==0&&!u.away);
  for(const w of D.WORK.filter(w=>w.prize===0))D.fn.completeWork(w,dax);
  return {hot,away0,obj,after:D.PZ.map(p=>p.away?1:0).join(),p0:P.find(u=>u.prize===0).away,open:D.fn.extractReady()};
 });
 ok(r.hot==='2,2,2'&&!r.away0,'each pilot hotwires their own ship; none flies with its clamps on '+JSON.stringify(r));
 ok(/Remove fuel line and clamps/.test(r.obj[0]),'a hot ship’s row moves on to its lines: '+r.obj[0]);
 ok(r.after==='1,0,0'&&r.p0===1&&!r.open,'its own clamp and fuel line off, the first ship flies; the others wait '+JSON.stringify(r));
 r=await E(()=>{
  const D=window.DBGground,dax=D.U.find(u=>u.side==='reb'&&u.prize===undefined&&!u.away);
  for(const w of D.WORK)if(!w.done)D.fn.completeWork(w,dax);
  const obj=D.fn.typeObjectives([],0);
  return {away:D.crossAway,rows:obj.slice(0,3).every(o=>o.done),home:obj[3].now};
 });
 ok(r.away&&r.rows&&r.home,'every ship up: all three rows done, the way home is open '+JSON.stringify(r));
 r=await E(()=>{
  const D=window.DBGground;D.fn.gameOver(true);
  const R=D.pendingResult;
  return {prizes:(R.prizes||[]).join(),cross:R.cross,loot:document.querySelector('#sc-ground #endLoot').textContent,
   pil:R.people.filter(p=>window.__M.assets.ships[0].pilots.some(x=>x.id===p.id)).length};
 });
 ok(r.prizes==='cross,talon,talon'&&r.cross===false&&/FT-4 Cross/.test(r.loot)&&/SF-11 Talon/.test(r.loot)&&r.pil===3,'the result: three ships stolen, and the pilots who flew them '+JSON.stringify(r));

 // a pilot lost before their ship is up: that ship stays on its pad, the raid goes on; the others flown, the way home
 // opens and the win brings two ships. With every pilot lost, the mission fails.
 await go();
 r=await E(()=>{
  const D=window.DBGground;
  const sq=D.U.find(u=>u.side==='reb'&&!u.away);
  D.fn.fsPlace('s0',{x:sq.x+30,y:sq.y-30});for(const o of D.FS.orders)o.at=0;D.fn.fsPlanStart();
  const p=D.U.find(u=>u.prize===1);p.hp=0;p.down=1;p.dead=1;
  D.fn.checkDefeat();
  const out={phase:D.phase,lost:D.PZ.map(x=>x.lost?1:0).join(),row:D.fn.typeObjectives([],0)[1].fail,open:D.crossAway};
  const dax=D.U.find(u=>u.side==='reb'&&u.prize===undefined&&!u.away);
  for(const k of [0,2]){const pl=D.U.find(u=>u.prize===k),pd=D.PZ[k].pad;pl.x=pd.x;pl.y=pd.y+20;pl.landAt=0;D.fn.hotwireStep(k,false);D.fn.hotwireStep(k,false);}
  for(const w of D.WORK)if(w.prize!==1)D.fn.completeWork(w,dax);
  out.away=D.PZ.map(x=>x.away?1:0).join();out.home=D.crossAway;
  D.fn.gameOver(true);
  out.prizes=(D.pendingResult.prizes||[]).join();out.txt=document.querySelector('#sc-ground #endText').textContent;
  return out;
 });
 ok(r.phase!=='GAMEOVER'&&r.lost==='0,1,0'&&r.row&&!r.open,'a pilot lost: their ship stays grounded, its row fails, the raid goes on '+JSON.stringify(r));
 ok(r.away==='1,0,1'&&r.home&&r.prizes==='cross,talon'&&/not every ship came home/.test(r.txt),'the other two flown, the way home opens and the win brings two ships '+JSON.stringify(r));
 await go();
 r=await E(()=>{
  const D=window.DBGground;
  const sq=D.U.find(u=>u.side==='reb'&&!u.away);
  D.fn.fsPlace('s0',{x:sq.x+30,y:sq.y-30});for(const o of D.FS.orders)o.at=0;D.fn.fsPlanStart();
  for(const k of [0,1,2]){const p=D.U.find(u=>u.prize===k);p.hp=0;p.down=1;p.dead=1;D.fn.checkDefeat();}
  return {phase:D.phase,win:D.gameEnd&&D.gameEnd.win,txt:document.querySelector('#sc-ground #endText').textContent};
 });
 ok(r.phase==='GAMEOVER'&&r.win===false&&/every pilot was lost/.test(r.txt),'every pilot lost: the mission fails '+JSON.stringify(r));

 // Debug: skip mission counts every ship stolen; the debrief puts them in the Hangar, each with a pilot
 await go();
 await E(()=>document.querySelector('#sc-ground #dbgSkip').click());await wait(300);
 r=await E(()=>{
  const D=window.DBGground,R=D.pendingResult,B=window.DBGbase,G=B.G;
  const before=G.fighters.length;
  const m=G.missions.find(x=>x.story==='raidbunker');
  B.fn.applyDebrief(Object.assign({},R,{missionId:m.id}));
  const added=G.fighters.slice(before);
  return {prizes:(R.prizes||[]).join(),added:added.map(f=>f.cls).join(),flown:added.filter(f=>G.people.some(p=>p.ship===f.id)).length,beat:window.Pro.beat(),done:window.Pro.done()};
 });
 ok(r.prizes==='cross,talon,talon'&&r.added==='cross,talon,talon'&&r.flown===3,'the debrief: three ships in the Hangar, each with a pilot '+JSON.stringify(r));
 ok(r.done,'Raid the Bunker won: the prologue reaches the frontier '+JSON.stringify(r));

 // a phase 4 save: its Raid the Bunker takes the Reinforcements rule (save version 14)
 r=await E(()=>{
  const B=window.DBGbase,f=B.fn;window.Pro.jump('bunker');f.closeWin();
  const m=B.G.missions.find(x=>x.story==='raidbunker');delete m.req.reinforce;B.G.v=13;
  f.upgradeSave();
  return {v:B.G.v,rf:m.req.reinforce,ver:f.saveVersion()};
 });
 ok(r.v===r.ver&&r.ver>=14&&r.rf===1,'a save from the phase 4 build gets Raid the Bunker’s Reinforcements '+JSON.stringify(r));

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'stealship-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
