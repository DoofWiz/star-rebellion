/* Type 3.5's campaign scene (docs/MAIN-SWITCH-HANDOFF.md S1, §5 test 2): node tools/space35-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  players see nothing new: without ?dev the Missions tab has no Type 3.5 buttons, and SR.go('space35', {mission})
      hides the designer panel
   2  with ?dev, Intercept Transport's briefing offers "Fly it in Type 3.5 (dev)". With no wing free to fly it says so and
      stays. With one, SR.go('space35') opens window 1 of the freighter (never the board, titled for the mission) with the
      player's own wing in window 3; it flies to a Mission Success / Mission Failed pop-up, and Next returns to the base
      with the mission's days gone by. The base's report lists the ships flown, and More information opens the flight's
      debrief and comms, with Back (S6: what lands in the campaign is tools/results35-smoke.js's)
   3  Back from window 1 goes home with nothing flown and nothing changed
   4  the Missions tab's Test opportunity (dev) opens the demo's board */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const errs=[],fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const page=async(q)=>{
  const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const pg=await ctx.newPage();
  pg.on('pageerror',e=>errs.push(q+': '+e.message));
  pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(q+' console: '+m.text());});
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.goto(base+q);await pg.waitForTimeout(1200);
  await pg.evaluate(()=>window.SR.go('base',{}));await pg.waitForTimeout(500);
  return {ctx,pg};
 };
 // the board with Intercept Transport selected
 const toBoard=pg=>pg.evaluate(()=>{
  const f=window.DBGbase.fn;for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  f.addMission('intercept',true);document.querySelector('#navMissions').click();
  const c=document.querySelector('.bf-card[data-msel="intercept"]');if(c)c.click();
  return !!c;
 });
 const scene=(pg,s)=>pg.waitForFunction(x=>window.SR.active===x,s,{timeout:15000}).then(()=>true,()=>false);
 const campaign=pg=>pg.evaluate(()=>{const G=window.DBGbase.G,m=G.missions.find(x=>x.id==='intercept');
  return JSON.stringify({c:G.credits,s:G.supplies,f:G.fuel,m:G.materials,i:G.intel,day:G.day,ms:m&&m.state,people:G.people.map(p=>[p.id,p.state||'',p.assign||'',p.xp||0,p.hp||0]),fighters:(G.fighters||[]).map(x=>[x.id,x.hull])});});
 const out={};

 // 1. players: nothing new
 {const {ctx,pg}=await page('#test');
  out.player=await toBoard(pg).then(()=>pg.evaluate(()=>({dev:SR.dev,btn:!!document.querySelector('[data-m35]'),panel:null})));
  await pg.evaluate(()=>SR.go('space35',{mission:{kind:'space35',test:true,missionId:'intercept',name:'Intercept Transport',opp:'vulnerable_freighter'}}));
  await pg.waitForTimeout(500);
  out.player.panel=await pg.evaluate(()=>({active:SR.active,panel:document.getElementById('hcPanel').hidden,brief:!!document.querySelector('#arHc35 .h35-holo'),dbg:!!window.DBGspace35}));
  await ctx.close();}
 ok(out.player.dev===false&&!out.player.btn,'1: without ?dev the Missions tab has no Type 3.5 buttons '+JSON.stringify(out.player));
 ok(out.player.panel.active==='space35'&&out.player.panel.panel===true&&out.player.panel.brief&&!out.player.panel.dbg,'1: the scene without ?dev: no designer panel, no debug hooks '+JSON.stringify(out.player.panel));

 // 2. with ?dev: Intercept Transport flown by the player's wing, to the debrief and back
 {const {ctx,pg}=await page('?dev#test');
  // no wing free to fly: it says so and stays
  await toBoard(pg);await pg.evaluate(()=>{window.DBGbase.G.wings=[];window.DBGbase.G.fighters=[];});
  await pg.evaluate(()=>{const b=document.querySelector('[data-m35="intercept"]');if(b)b.click();});await pg.waitForTimeout(300);
  out.noWing=await pg.evaluate(()=>window.SR.active);
  // a wing: Joss in a Cross (before the frontier a ship and its pilot join the first wing on their own)
  await pg.evaluate(()=>{const D=window.DBGbase,f=D.fn,G=D.G;const s=f.newFighter({id:'s35c',name:'Test Cross',cls:'cross',hull:100});G.fighters.push(s);
   const p=G.people.find(x=>x.role==='Pilot');window.__p35=JSON.stringify(p);p.ship='s35c';p.assign='standby';f.syncUI();});   // a clean copy for step 3
  out.sel=await toBoard(pg);
  out.btns=await pg.evaluate(()=>({fly:!!document.querySelector('[data-m35="intercept"]'),test:!!document.querySelector('[data-m35="test"]'),plan:!!document.querySelector('[data-mplan="intercept"]')}));
  const day0=await pg.evaluate(()=>window.DBGbase.G.day);
  await pg.click('[data-m35="intercept"]');
  out.into=await scene(pg,'space35');await pg.waitForTimeout(500);
  out.brief=await pg.evaluate(()=>{const X=window.DBGspace35.hc35,B=X.B,q=s=>document.querySelector('#arHc35 '+s);
   return {screen:B.screen,camp:!!B.camp,opp:B.oppId,title:(q('.h35-holo__title')||{}).textContent,board:!!q('.bf-board'),panel:!document.getElementById('hcPanel').hidden,
    back:(q('[data-act="prev"]')||{}).textContent,fromCampaign:window.DBGspace35.fromCampaign,wings:X.L35.WINGS35.map(w=>w.ships.map(s=>s.shipId).join(',')),intel:!!q('.h35-campintel')};});
  out.flight=await pg.evaluate(async()=>{
   const X=window.DBGspace35.hc35,B=X.B,q=s=>document.querySelector('#arHc35 '+s),o={};
   q('[data-primary="destroy"]').click();for(let i=0;i<4&&B.step<4;i++)q('[data-act="next"]').click();
   for(const w in B.plan.wings)B.plan.wings[w].exec={k:'destroy',arg:null};
   q('[data-act="launch"]').click();
   o.live=[B.screen,!!X.S,X.S&&X.S.ships.filter(s=>s.faction==='reb'&&!s.struct).length];
   X.fn.run(600);
   const won=X.S.objectives[0].state==='done';
   o.deb=[B.screen,!!X.S.over,(q('.h35-result__name')||{}).textContent,(q('.h35-result .sr-stamp')||{}).textContent===(won?'Mission Success':'Mission Failed'),/Next/.test((q('.h35-result [data-act="camp"]')||{}).textContent||''),!q('.h35-debrief'),!q('[data-act="again"]'),!q('[data-act="saverec"]')];
   o.result=X.fn.campResult();
   return o;});
  await pg.click('#arHc35 [data-act="camp"]');
  out.home=await scene(pg,'base');await pg.waitForTimeout(500);
  // the base's report: the ships flown; More information and Back
  out.report=await pg.evaluate(async()=>{const D=window.DBGbase,f=D.fn,$=s=>document.querySelector('#winsB '+s),o={};
   for(let i=0;i<6&&f.getWin()&&f.getWin()!=='reward';i++){f.closeWin();await new Promise(r=>setTimeout(r,100));}
   o.win=f.getWin();o.ships=[...document.querySelectorAll('#winsB .rp-ship b')].map(e=>e.textContent);
   const more=$('[data-rpmore]');o.moreBtn=!!more&&/More information/.test(more.textContent);if(more)more.click();
   o.detail=[!!$('.h35-more .h35-why'),document.querySelectorAll('#winsB .h35-log p').length>0,/More information/.test(($('.sr-window__title')||{}).textContent||'')];
   const back=$('[data-rpmore]');if(back)back.click();o.back=!!$('.rp-body');
   for(let i=0;i<10&&f.getWin();i++)f.closeWin();
   return o;});
  out.days=[day0,await pg.evaluate(()=>window.DBGbase.G.day)];
  // 3. Back from window 1: home, nothing flown, nothing changed
  await pg.evaluate(()=>{const D=window.DBGbase,f=D.fn,G=D.G;for(let i=0;i<10&&f.getWin();i++)f.closeWin();
   // a fresh pilot and ship (the first may be hurt, or her ship lost): they join the wing on their own before the frontier
   const p=JSON.parse(window.__p35);p.id='p35b';p.name='Bea Flyer';p.assign='standby';p.ship='s35d';G.people.push(p);
   G.fighters.push(f.newFighter({id:'s35d',name:'Test Talon',cls:'talon',hull:100}));f.syncUI();});
  await toBoard(pg);
  const before3=await campaign(pg);
  await pg.click('[data-m35="intercept"]');out.back=[await scene(pg,'space35')];await pg.waitForTimeout(400);
  await pg.click('#arHc35 [data-act="prev"]');
  out.back.push(await scene(pg,'base'));await pg.waitForTimeout(400);
  out.back.push(before3===await campaign(pg));
  // 4. the Test opportunity card: the demo's board
  await toBoard(pg);await pg.click('[data-m35="test"]');await scene(pg,'space35');await pg.waitForTimeout(400);
  out.test=await pg.evaluate(()=>{const X=window.DBGspace35.hc35,B=X.B;return [B.screen,!B.camp,!!document.querySelector('#arHc35 .bf-board'),X.L35.WINGS35.map(w=>w.id).join()];});
  await ctx.close();}
 ok(out.noWing==='base','2: with no wing free to fly, it stays at the base '+out.noWing);
 ok(out.sel&&out.btns.fly&&out.btns.test&&out.btns.plan,'2: with ?dev, Intercept Transport offers Fly it in Type 3.5 beside Plan mission, and the board a Test opportunity '+JSON.stringify(out.btns));
 ok(out.into&&out.brief.screen==='brief'&&out.brief.camp&&out.brief.opp==='vulnerable_freighter'&&/INTERCEPT TRANSPORT/.test(out.brief.title||'')&&!out.brief.board&&out.brief.panel&&/Back to base/.test(out.brief.back||'')&&out.brief.fromCampaign&&out.brief.wings.join('|')==='s35c'&&out.brief.intel,
  '2: SR.go(\'space35\') opens window 1 of the freighter, titled for the mission, the player\'s wing, the Intel strip, the panel (dev) '+JSON.stringify(out.brief));
 ok(out.flight.live[0]==='live'&&out.flight.live[2]===1,'2: the player\'s wing launches '+JSON.stringify(out.flight.live));
 ok(out.flight.deb.every(x=>x===true||x==='Intercept Transport'||x==='debrief'),'2: the end: a Mission Success / Failed pop-up, titled for the mission, with Next only '+JSON.stringify(out.flight.deb));
 ok(out.report.win==='reward'&&out.report.ships.join()==='Test Cross'&&out.report.moreBtn&&out.report.detail.every(Boolean)&&out.report.back,'2: the base report: the ships flown; More information (the debrief, the comms) and Back '+JSON.stringify(out.report));
 const r=out.flight.result||{};
 ok(r.kind==='space'&&r.space35===true&&r.missionId==='intercept'&&typeof r.win==='boolean'&&!!r.stamp&&(r.people||[]).length===1&&(r.fighters||[]).length===1,'2: the scene\'s result is the campaign\'s '+JSON.stringify(r).slice(0,400));
 ok(out.home&&out.days[1]>out.days[0],'2: Next: the base, with the mission\'s days gone by '+JSON.stringify({home:out.home,days:out.days}));
 ok(out.back.every(Boolean),'3: Back from window 1: home, nothing changed '+JSON.stringify(out.back));
 ok(out.test[0]==='board'&&out.test[1]&&out.test[2]&&out.test[3]==='dagger,anvil,amber','4: the Test opportunity opens the demo\'s board, with the demo\'s wings '+JSON.stringify(out.test));

 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,out},null,0));
 if(fails.length){console.error('space35-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('space35-smoke OK');
})();
