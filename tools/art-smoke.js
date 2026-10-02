/* Art smoke: boots the real game headless and renders every screen the
   Bobbleheads kit touches — the base map, each built room view, and the
   galaxy — watching for page errors. Usage: NODE_PATH=$(npm root -g) node tools/art-smoke.js */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const out=await pg.evaluate(async()=>{
  const D=window.DBGbase,f=D.fn,G=D.G;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const log=[];
  if(!window.SR_ART)return {fail:'SR_ART missing'};
  // staff a post and put someone in a bunk so the room views have people in them
  const dax=G.people.find(p=>p.id==='dax');if(dax)dax.assign='station:command';
  f.syncUI();
  await sleep(300);log.push('base map');
  for(const key of ['command','hangar','barracks']){
    if(!f.enterRoom(key))continue;
    await sleep(350);log.push('room '+key);
    f.exitRoomView();f.syncUI();
  }
  f.openWin('sources');await sleep(400);log.push('galaxy');
  if(f.getWin())f.closeWin();   // the first-look primer
  await sleep(200);
  // dive into a world, open a region, walk back out
  const row=document.querySelector('[data-gxworld="brakka"]');
  if(row){
    row.click();await sleep(700);
    const chip=document.querySelector('[data-gxchip]');
    if(chip){chip.click();await sleep(350);}
    log.push('world view');
  }
  // back to the base view
  document.getElementById('navBase').click();await sleep(250);
  // boot the ground scene (default Steal the Cross spec), walk, then force a fight
  window.SR.mission=null;
  window.SR.go('ground',{test:true});
  await sleep(600);
  const DG=window.DBGground;
  DG.fn.squadMoveTo({x:700,y:1100});
  await sleep(900);
  DG.fn.alertTown('smoke');
  await sleep(500);
  DG.fn.startPlanning();
  await sleep(400);
  log.push('ground scene');
  // boot the space scene (instructor exercise) and let a couple of frames run
  window.SR.mission=null;
  window.SR.go('space',{test:true});
  await sleep(900);
  log.push('space scene');
  window.SR.go('base',{});
  await sleep(300);
  // a generated rebel with story layers renders as a character and a portrait
  const cv=document.createElement('canvas');cv.width=96;cv.height=96;
  const c2=cv.getContext('2d');
  const spec=SR_ART.lookOf({id:'smoke1',name:'Smoke Test',role:'Soldier',rank:3,off:0,charTrait:'mechanic',
    traits:[{k:'scarred'}],cond:[{k:'brokenarm'}],body:{leg:2},gear:{primary:'akli',gad:['blam']},morale:85});
  SR_ART.character(c2,48,80,spec,{state:'aim',view:'side',dir:-1,aim:0.4,t:1.2,s:1});
  SR_ART.portrait(c2,24,24,22,spec,{t:0});
  for(const st of Object.keys(SR_ART.POSES))SR_ART.character(c2,48,80,'deputy',{state:st,t:2,s:0.6});
  for(const id of Object.keys(SR_ART.SHIPS))SR_ART.ship(c2,id,48,48,0.7,1.2,1,{damage:0.3});
  for(const id of Object.keys(SR_ART.VEHICLES))SR_ART.vehicle(c2,id,48,60,0.4,0.4,1,{});
  SR_ART.strider(c2,48,90,{state:'walk',mood:'hacked',t:1,s:0.3});
  for(const k of Object.keys(SR_ART.ITEMS))SR_ART.item(c2,k,48,48,40,1);
  log.push('kit sweep');
  return {log};
 });
 await pg.waitForTimeout(400);
 await b.close();
 if(out.fail||errs.length){
  console.error('art-smoke FAILED',out.fail||'',errs.slice(0,6));
  process.exit(1);
 }
 console.log('art-smoke: all checks passed ('+out.log.join(', ')+')');
})();
