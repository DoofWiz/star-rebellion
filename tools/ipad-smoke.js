/* Smoke test for the iPad Pro 12.9" (2021): node tools/ipad-smoke.js (needs NODE_PATH=$(npm root -g)).
   1024x1366 in portrait, 1366x1024 in landscape, a touch screen.
   - portrait is the tablet layout: the rail is a panel that slides in from the right (the drawer button opens it), the
     stage, the tabs and the planning window have the full width, the top bar's menu button stays on screen; picking
     a mission, a node on the Network or a Source on the Galaxy opens the rail; the ground and space rails slide in too
   - landscape is the desktop layout: the rail sits beside the stage and there is no drawer button
   - neither orientation scrolls sideways or puts anything past the right edge, on the base's views, the plan, the
     ground and the space screens; the game knows it is on a touch screen */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
let FAILS=null;
process.on('unhandledRejection',e=>{console.log('FAIL (threw)\n'+(FAILS||[]).join('\n')+'\n'+e.message.split('\n')[0]);process.exit(1);});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};FAILS=fails;
 const errs=[];
 for(const [ori,vp] of [['portrait',{width:1024,height:1366}],['landscape',{width:1366,height:1024}]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(ori+': '+e.message));
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.goto(url);await pg.waitForTimeout(1300);
  const E=(f,a)=>pg.evaluate(f,a);
  const wait=ms=>pg.waitForTimeout(ms);
  // what sticks out past the right edge, and whether the page scrolls sideways
  const overflow=()=>E(()=>{
   const W=innerWidth,bad=[];
   for(const el of document.querySelectorAll('.scene:not([hidden]) *')){
    if(el.closest('[hidden]')||el.closest('.sr-rail'))continue;   // a closed rail waits off the edge on purpose
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')continue;
    const r=el.getBoundingClientRect();
    if(r.width&&r.height&&r.right>W+1&&r.left<W)bad.push((el.id||String(el.className)||el.tagName).slice(0,40));
   }
   return {scroll:document.documentElement.scrollWidth>W,bad:[...new Set(bad)].slice(0,5)};
  });
  const tablet=ori==='portrait';
  const where=async name=>{const r=await overflow();ok(!r.scroll&&!r.bad.length,ori+', '+name+': nothing past the right edge '+JSON.stringify(r));};

  let r=await E(()=>{
   const $=s=>document.querySelector(s),cs=e=>getComputedStyle(e);
   const rail=$('#sc-base #panel'),stage=$('#sc-base .sr-stage'),menu=$('#sc-base #menuBtn').getBoundingClientRect();
   return {touch:window.SR.touch,pos:cs(rail).position,stageW:Math.round(stage.getBoundingClientRect().width),drawer:cs($('#sc-base #drawerBtn')).display!=='none',
    menu:menu.right<=innerWidth,railX:Math.round(rail.getBoundingClientRect().left)};
  });
  ok(r.touch,ori+': the game knows it is on a touch screen');
  ok(r.menu,ori+': the top bar’s menu button is on screen');
  if(tablet)ok(r.pos==='absolute'&&r.stageW===1024&&r.drawer&&r.railX>=1024,'portrait: the rail waits off the right edge, the stage has the full width, the drawer button shows '+JSON.stringify(r));
  else ok(r.pos!=='absolute'&&r.stageW<1366&&!r.drawer,'landscape: the desktop layout, the rail beside the stage and no drawer button '+JSON.stringify(r));
  if(tablet){
   r=await E(async()=>{
    document.querySelector('#sc-base #drawerBtn').click();
    await new Promise(res=>setTimeout(res,350));
    const rr=document.querySelector('#sc-base #panel').getBoundingClientRect();
    const out={open:Math.round(rr.left)<1024&&Math.round(rr.right)<=1024,w:Math.round(rr.width)};
    document.querySelector('#sc-base #drawerBtn').click();
    return out;
   });
   ok(r.open&&r.w>=320,'portrait: the drawer button slides the rail in from the right '+JSON.stringify(r));
  }
  await where('the base');
  for(const t of ['Sources','Missions','Intel','Arsenal','Market']){
   await E(t=>document.querySelector('#sc-base #nav'+t).click(),t);await wait(250);
   await where(t);
   await E(()=>document.querySelector('#sc-base #navBase').click());await wait(150);
  }
  // the tabs fit, and the views start below them
  r=await E(()=>{
   const q=s=>document.querySelector(s).getBoundingClientRect();
   const tabs=q('#sc-base .sr-tabs');
   document.querySelector('#sc-base #navMissions').click();
   const board=q('#sc-base .bf-board');
   document.querySelector('#sc-base #navIntel').click();
   const exp=q('#sc-base .in-exp');
   document.querySelector('#sc-base #navBase').click();
   return {fit:tabs.left>=0&&tabs.right<=innerWidth,board:board.top>=tabs.bottom,exp:exp.top>=tabs.bottom};
  });
  ok(r.fit&&r.board&&r.exp,ori+': the tabs fit; the mission board and Exposure sit below them '+JSON.stringify(r));
  // picking something whose details live in the rail opens it on a tablet
  if(tablet){
   r=await E(async()=>{
    const shell=document.querySelector('#sc-base .sr-shell'),f=window.DBGbase.fn,out={};
    document.querySelector('#sc-base #navIntel').click();
    const n=document.querySelector('#sc-base #inView [data-insel]');n.click();
    out.intel=shell.classList.contains('is-drawer-open');
    document.querySelector('#sc-base #drawerBtn').click();
    document.querySelector('#sc-base #navBase').click();
    return out;
   });
   ok(r.intel,'portrait: picking a node on the Network opens the rail');
  }
  // the plan: the Raid the Bunker window, the widest there is
  await E(()=>{window.Pro.jump('bunker');const f=window.DBGbase.fn;for(let i=0;i<6;i++)f.closeWin();
   const m=window.DBGbase.G.missions.find(x=>x.story==='raidbunker');f.openPlan(m);f.plAutoFill();f.renderWin();});
  await wait(300);
  await where('the plan');
  r=await E(()=>{const w=document.querySelector('#sc-base .pl-win').getBoundingClientRect();return {w:Math.round(w.width),l:Math.round(w.left),r:Math.round(w.right)};});
  ok(r.l>=0&&r.r<=(tablet?1024:1366)&&(!tablet||r.w>=900),ori+': the planning window fits'+(tablet?', near the full width ':' ')+JSON.stringify(r));
  await E(()=>window.DBGbase.fn.closeWin());
  // ground and space
  await E(()=>{const SQ=['dax','runa','kel'].map(id=>({id,name:id+' X',first:id,aim:2,hp:100,wpns:['akli','cowboy']}));
   window.SR.go('ground',{test:true,mission:{kind:'ground',missionId:'stealcross',days:2,squad:SQ,pilot:{id:'sera',name:'Sera Kest',first:'Sera'},
    grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},transport:{id:'graf',name:'Marta',cls:'graf'}}});});
  await wait(700);
  await E(()=>{const D=window.DBGground;D.fn.alertTown('x');D.fn.startPlanning();});await wait(300);
  await where('a ground fight');
  if(tablet){
   r=await E(async()=>{const app=document.querySelector('#sc-ground #app');document.querySelector('#sc-ground #drawerBtn').click();
    await new Promise(res=>setTimeout(res,350));const rr=document.querySelector('#sc-ground .sr-rail').getBoundingClientRect();
    const out={open:app.classList.contains('is-drawer-open')&&rr.left<1024,close:getComputedStyle(document.querySelector('#sc-ground #railClose')).display!=='none'};
    document.querySelector('#sc-ground #railClose').click();return out;});
   ok(r.open&&r.close,'portrait: the squad rail slides in on the ground, with its close button '+JSON.stringify(r));
  }
  await E(()=>window.SR.go('space',{test:true}));await wait(700);
  await where('a space fight');
  await ctx.close();
 }
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'ipad-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
