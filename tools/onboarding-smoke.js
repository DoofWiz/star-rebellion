/* Smoke test for the opening onboarding (docs/ONBOARDING-HANDOFF.md): node tools/onboarding-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   A1  prologue runs cinematic first: no briefing, no soldier dialogue in the cutscene
   A2  skip lands on the Cass comm (phase INTRO); Acknowledge opens the briefing
   A3  Enter starts the quips and real-time play at once
   A4  pause cards freeze the simulation until Got it; card 6 waits for round>=1 in PLANNING
   A5  Cass's door gun is area-anchored: the point is stored, only enemies within 320px are raked
   A6  prologue win: BASE ESTABLISHED splash, no day banner, then cassIntro
   Non-prologue ground missions keep today's order: briefing, then cinematic. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 // reduced motion keeps the door-gun pass instant (no animated gun run), so the zone maths is testable
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const E=f=>pg.evaluate(f);
 const click=sel=>pg.evaluate(s=>document.querySelector(s).click(),sel);

 // A1: new game goes straight into the cutscene — no briefing, no bubbles
 await E(()=>window.DBGbase.fn.launchIntro());
 await pg.waitForTimeout(400);
 const cut=await E(()=>{const D=window.DBGground;return {phase:D.phase,brief:document.querySelector('#sc-ground #briefing').hidden,skip:document.querySelector('#sc-ground #csSkip').hidden,bub:D.bubbles.length};});
 ok(cut.phase==='CUTSCENE','prologue starts in the cutscene, got '+cut.phase);
 ok(cut.brief===true,'no briefing over the cutscene');
 ok(cut.skip===false,'skip button is up');
 await pg.waitForTimeout(2500);   // past the old 2.4s dialogue beat
 const cut2=await E(()=>({phase:window.DBGground.phase,bub:window.DBGground.bubbles.length}));
 ok(cut2.phase==='CUTSCENE'&&cut2.bub===0,'no soldier dialogue in the cinematic '+[cut2.phase,cut2.bub]);

 // A2: skip lands on the Cass comm, phase INTRO
 await click('#sc-ground #csSkip');
 await pg.waitForTimeout(300);
 const intro=await E(()=>({phase:window.DBGground.phase,comm:document.querySelector('#sc-ground #gCassComm').hidden,brief:document.querySelector('#sc-ground #briefing').hidden}));
 ok(intro.phase==='INTRO','skip holds the scene in INTRO, got '+intro.phase);
 ok(intro.comm===false&&intro.brief===true,'Cass comm visible, briefing not yet '+[intro.comm,intro.brief]);

 // Acknowledge → briefing
 await click('#sc-ground #cassAckBtn');
 await pg.waitForTimeout(200);
 const br=await E(()=>({phase:window.DBGground.phase,comm:document.querySelector('#sc-ground #gCassComm').hidden,brief:document.querySelector('#sc-ground #briefing').hidden}));
 ok(br.comm===true&&br.brief===false&&br.phase==='INTRO','Acknowledge opens the briefing '+[br.comm,br.brief,br.phase]);

 // A3: Enter → quips queued, real-time play begins
 await click('#sc-ground #enterBtn');
 await pg.waitForTimeout(600);
 const fr=await E(()=>{const D=window.DBGground;return {phase:D.phase,q:D.quipsQueued,bub:D.bubbles.length,card:document.querySelector('#sc-ground #tutCard').hidden,foot:document.querySelector('#sc-ground #tutFoot').hidden,idx:D.tutIdx,frozen:D.fn.tutFrozen()};});
 ok(fr.phase==='FREE','Enter starts real-time play, got '+fr.phase);
 ok(fr.q===3&&fr.bub>=1,'three quips queued and speaking '+[fr.q,fr.bub]);
 ok(fr.card===false&&fr.foot===false&&fr.idx===0,'card 1 is up with Got it '+[fr.card,fr.foot,fr.idx]);
 ok(fr.frozen===true,'the simulation is frozen on card 1');

 // A4: moving does nothing while frozen
 const frozenMove=await E(()=>{
  const D=window.DBGground,dax=D.U.find(u=>u.id==='dax');
  const x0=dax.x,y0=dax.y;
  D.fn.squadMoveTo({x:x0+260,y:y0-40});
  return {x0,y0};
 });
 await pg.waitForTimeout(600);
 const after=await E(()=>{const D=window.DBGground,dax=D.U.find(u=>u.id==='dax');return {x:dax.x,y:dax.y,moved:D.tutFlags.moved,rt:!!dax.rtPath};});
 ok(after.x===frozenMove.x0&&after.y===frozenMove.y0&&!after.moved&&!after.rt,'frozen: the squad does not move '+[after.x-frozenMove.x0,after.y-frozenMove.y0,after.moved,after.rt]);

 // Got it unfreezes; the next pause card freezes again and is acknowledged in turn
 await click('#sc-ground #tutGotIt');
 await pg.waitForTimeout(150);
 await E(()=>{const D=window.DBGground,dax=D.U.find(u=>u.id==='dax');D.fn.squadMoveTo({x:dax.x+260,y:dax.y-40});});
 await pg.waitForTimeout(400);                       // card 2 (Sneak past) pauses once Move out is done
 await E(()=>{const g=document.querySelector('#sc-ground #tutGotIt');if(!document.querySelector('#sc-ground #tutFoot').hidden)g.click();});
 await pg.waitForTimeout(800);
 const walked=await E(()=>{const D=window.DBGground,dax=D.U.find(u=>u.id==='dax');return {moved:D.tutFlags.moved,frozen:D.fn.tutFrozen(),dx:dax.x};});
 ok(walked.moved===1,'after Got it the move lands');
 ok(Math.abs(walked.dx-frozenMove.x0)>10,'the squad actually walks once unfrozen, dx='+(walked.dx-frozenMove.x0));

 // A4/A5: card 6 and the Fire Support action stay hidden until round>=1 in PLANNING
 const pre=await E(()=>{
  const D=window.DBGground;
  D.tutFlags.sneaked=1;D.tutFlags.executed=1;D.tutFlags.attacked=1;D.tutFlags.shot=1;
  D.fn.tutTick();
  return {idx:D.tutIdx,fs:D.fn.fsItems().length,round:D.round};
 });
 ok(pre.idx<5,'card 6 waits while the camp is calm, idx='+pre.idx);
 ok(pre.fs===0,'Fire Support is locked before card 6, items='+pre.fs);
 await E(()=>window.DBGground.fn.alertTown('Smoke test alarm.'));
 await pg.waitForTimeout(2100);   // cards keep a breathing gap before they appear
 const plan=await E(()=>{
  const D=window.DBGground;
  return {phase:D.phase,round:D.round,idx:D.tutIdx,card:document.querySelector('#sc-ground #tutCard').hidden,
    title:document.querySelector('#sc-ground #tutStep').textContent,foot:document.querySelector('#sc-ground #tutFoot').hidden,
    items:D.fn.fsItems().map(i=>i.name).join('|'),dots:document.querySelectorAll('#sc-ground #tutDots i').length};
 });
 ok(plan.phase==='PLANNING'&&plan.round>=1,'alert drops into planning round 1 '+[plan.phase,plan.round]);
 ok(plan.idx===5&&plan.card===false&&plan.title==='Fire Support'&&plan.foot===false,'card 6 appears in planning '+[plan.idx,plan.title,plan.foot]);
 ok(/Cass/.test(plan.items),'the Fire Support menu lists Cass: '+plan.items);
 ok(plan.dots===8,'the dots count 8, got '+plan.dots);

 // A5: placing stores the mark; only enemies inside the zone (240px × layout scale) are raked
 const fsres=await E(()=>{
  const D=window.DBGground,U=D.U;
  const camp=D.SCN.camp,R=240*((D.SCN.layoutK)||1);
  const dax=U.find(u=>u.id==='dax');dax.x=camp.x-90;dax.y=camp.y+70;dax.rtPath=null;
  return new Promise(res=>setTimeout(()=>{
   const pt={x:camp.x+20,y:camp.y-10};
   const placed=D.fn.fsPlace('s0',pt);
   const a=D.FS.ships[0];
   const far=U.filter(u=>u.side==='law'&&Math.hypot(u.x-pt.x,u.y-pt.y)>R).map(u=>[u.id,u.hp]);
   D.fn.fsRoundEnd();
   const farAfter=U.filter(u=>u.side==='law'&&Math.hypot(u.x-pt.x,u.y-pt.y)>R).map(u=>[u.id,u.hp]);
   res({placed,mark:a.mark,pt,state:a.state,left:a.left,fs:D.tutFlags.fs,far,farAfter});
  },400));
 });
 ok(fsres.placed===true,'Cass takes the call');
 ok(fsres.mark&&fsres.mark.x===fsres.pt.x&&fsres.mark.y===fsres.pt.y,'the clicked mark is stored '+JSON.stringify(fsres.mark));
 ok(fsres.state==='active'&&fsres.left===1&&fsres.fs===1,'door gun active, one pass flown, tutFlags.fs set '+[fsres.state,fsres.left,fsres.fs]);
 ok(JSON.stringify(fsres.far)===JSON.stringify(fsres.farAfter),'nobody outside the zone is raked '+JSON.stringify(fsres.farAfter));

 // A6: force a win → BASE ESTABLISHED splash, no day banner, then cassIntro
 await E(()=>window.DBGground.fn.gameOver(true));
 await pg.waitForTimeout(200);
 await click('#sc-ground #endRestartBtn');
 await pg.waitForTimeout(500);
 const base=await E(()=>({scene:window.SR.active,est:document.querySelector('#estSplash').hidden,day:!document.querySelector('#sc-base .sr-banner'),win:window.DBGbase.fn.getWin()}));
 ok(base.scene==='base','back at the base, got '+base.scene);
 ok(base.est===false,'BASE ESTABLISHED splash is up');
 ok(base.day===true,'no day banner over the splash');
 ok(!base.win,'no window over the splash, got '+base.win);
 await click('#estSplash');
 await pg.waitForTimeout(800);
 const cass=await E(()=>({est:document.querySelector('#estSplash').hidden,win:window.DBGbase.fn.getWin()}));
 ok(cass.est===true&&cass.win==='cassIntro','splash closes into cassIntro '+[cass.est,cass.win]);
 await E(()=>window.DBGbase.fn.closeWin());

 // Non-prologue ground missions: briefing first, then the cutscene
 await E(()=>{
  const spec={kind:'ground',missionId:'stealcross',scenario:'stealcross',days:2,
    squad:[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['akli','cowboy']}],
    pilot:{id:'sera',name:'Sera Kest',first:'Sera'},
    grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'}};
  window.SR.mission=spec;window.SR.go('ground',{mission:spec});
 });
 await pg.waitForTimeout(400);
 const town=await E(()=>({phase:window.DBGground.phase,brief:document.querySelector('#sc-ground #briefing').hidden}));
 ok(town.phase==='BRIEF'&&town.brief===false,'other missions still brief first '+[town.phase,town.brief]);
 await click('#sc-ground #enterBtn');
 await pg.waitForTimeout(300);
 const town2=await E(()=>window.DBGground.phase);
 ok(town2==='CUTSCENE','the Enter button still starts their cutscene, got '+town2);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'onboarding-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
