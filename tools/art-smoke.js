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
  if(document.getElementById('splash'))return {fail:'title screen leaked into the #test boot'};
  // staff a post and put someone in a bunk so the room views have people in them
  G.people.push(window.Rebel.migrate({id:'artmc',name:'Odo Fenn',role:'Support',level:2,xp:0,assign:'room:command',bio:'Ran a Hegemony flight tower for nine years.',morale:60}));   // someone at work in the Command Center
  f.syncUI();
  await sleep(300);log.push('base map');
  for(const key of ['command','hangar','barracks']){
    if(!f.enterRoom(key))continue;
    await sleep(350);log.push('room '+key);
    f.exitRoomView();f.syncUI();
  }
  // Haven Rock (art update 4): every room, an L-shaped merged room, upgrades that take a tile, a room being built,
  // a tile being dug and the alert, on the map and walked into
  {
    const keep=JSON.stringify({rooms:G.rooms,grid:G.grid,fighters:G.fighters,risk:G.risk});
    const add=(key,r,c,extra)=>{G.rooms.push(Object.assign({id:'rm_'+r+'_'+c,key,r,c,w:1,h:1,up:[]},extra||{}));G.grid[r][c]={t:'room',room:key};};
    add('barracks',6,5);add('store',5,1);add('store',5,2);add('techlab',1,6);add('techlab',1,7);
    add('infirmary',5,7,{up:['surgery']});add('infirmary',5,8);add('training',2,8);add('comms',3,7);add('diplo',3,8);add('workshop',3,9);add('workshop',4,9,{build:{days:2}});
    G.rooms.find(r=>r.key==='hangar').up=['refuel','arm','lounge','mbay'];
    G.fighters.push({id:'hr1',name:'Red One',cls:'talon',hull:60},{id:'hr2',name:'Red Two',cls:'talon',hull:100,out:true});
    G.grid[1][4].dig=1;G.risk=90;
    f.syncUI();await sleep(300);log.push('haven rock map');
    for(const key of ['command','hangar','barracks','store','comms','diplo','workshop','infirmary','training','techlab']){
      if(!f.enterRoom(key))return {fail:'Haven Rock: could not walk into the '+key};
      await sleep(200);log.push('walk-in '+key);
      f.exitRoomView();f.syncUI();
    }
    const k=JSON.parse(keep);G.rooms=k.rooms;G.grid=k.grid;G.fighters=k.fighters;G.risk=k.risk;f.syncUI();
  }
  f.openWin('sources');await sleep(400);log.push('galaxy');
  if(f.getWin())f.closeWin();   // the first-look primer
  await sleep(200);
  // dive into a world, open a region, walk back out
  const row=document.querySelector('[data-gxworld="akkaro"]');
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
  // Cass's Door Gunner is unique to Take the Rock — not here
  if(DG.FS&&DG.FS.ships.some(s=>s.cassAir))return {fail:'Cass door gunner leaked outside Take the Rock'};
  log.push('ground scene');
  // the prologue: Cass set the squad down, and his hauler stays on station as a Door Gunner
  window.SR.mission=null;
  window.SR.go('ground',{test:true,mission:{kind:'ground',missionId:'haven',scenario:'haven',days:0,
    squad:[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
           {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['akli','cowboy']}]}});
  await sleep(700);
  const DH=window.DBGground;
  if(!(DH.FS&&DH.FS.ships.some(s=>s.mode==='doorgun'&&s.pilot.first==='Cass')))return {fail:'Cass door gunner missing in Take the Rock'};
  if(DH.fn.fsItems().length!==0)return {fail:'Cass must stay off the menu until her tutorial card (ONBOARDING-HANDOFF A5)'};
  DH.tutFlags.fsCard=1;   // as if the Fire Support tutorial card had come up
  if(DH.fn.fsItems().length!==1)return {fail:'Take the Rock fire support should list exactly Cass'};
  log.push('take the rock + Cass');
  // the gun run must play through and hand the round back (a hang here soft-locks combat)
  {
    const foes=DH.U.filter(u=>u.side==='law'&&!u.down),f0=foes[0];let gi=0;
    for(const u of foes.slice(3)){u.down=1;u.hp=0;}   // a short volley: three squatters are plenty for the check
    for(const u of DH.U)if(u.side==='reb'&&!u.down){u.x=f0.x-160+(gi%2)*40;u.y=f0.y+150+Math.floor(gi/2)*40;gi++;}
    DH.fn.alertTown('smoke');DH.fn.startPlanning();
    // unarmed rebels never enter the engagement, so the round can't stall waiting for a player shot
    for(const u of DH.U)if(u.side==='reb'&&!u.down)u.wpns=[];
    DH.fn.fsPlace('s0',{x:f0.x,y:f0.y});
    DH.fn.execute();
    let done=false;
    for(let w=0;w<120;w++){
      await sleep(300);
      if((DH.phase==='PLANNING'||DH.phase==='FREE'||DH.phase==='GAMEOVER')&&!DH.dgRun&&!DH.dgQueue.length&&DH.FS.ships[0].left<2){done=true;break;}
    }
    if(!done)return {fail:'gun run never finished: phase '+DH.phase+' left '+DH.FS.ships[0].left};
    log.push('gun run');
  }
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
 // the title screen: fresh profile, no hash — logo settles, Start launches Take the Rock
 const ctx2=await b.newContext({viewport:{width:1280,height:800}});
 const pg2=await ctx2.newPage();
 pg2.on('pageerror',e=>errs.push('splash: '+e.message));
 await pg2.goto('file://'+path.resolve(__dirname,'../game/index.html'));
 // the developer's mark comes first, painted in by a passing ship; then the badge lands
 await pg2.waitForTimeout(1500);
 const s0=await pg2.evaluate(()=>{const sp=document.getElementById('splash');return sp&&sp.dataset.stage;});
 if(s0!=='dev'){console.error('art-smoke FAILED: the developer logo does not open the title screen',s0);process.exit(1);}
 await pg2.waitForTimeout(4800);
 const s1=await pg2.evaluate(()=>{
   const sp=document.getElementById('splash');
   return {splash:!!sp,ready:!!sp&&sp.className.includes('is-ready'),
     label:sp?sp.querySelector('#splashStart').textContent:''};
 });
 if(!s1.splash||!s1.ready||s1.label!=='Start game'){
  console.error('art-smoke FAILED title screen',JSON.stringify(s1));process.exit(1);
 }
 await pg2.click('#splashStart');
 await pg2.waitForTimeout(1400);
 // the prologue now opens on the insertion cinematic; the briefing follows the Cass comm (ONBOARDING-HANDOFF A1)
 const s2=await pg2.evaluate(()=>({gone:!document.getElementById('splash'),
   ground:!document.getElementById('sc-ground').hidden,
   brief:!document.getElementById('sc-ground').querySelector('#briefing').hidden,
   cine:!document.getElementById('sc-ground').querySelector('#csSkip').hidden}));
 if(!s2.gone||!s2.ground||s2.brief||!s2.cine){
  console.error('art-smoke FAILED start flow',JSON.stringify(s2));process.exit(1);
 }
 if(out.log)out.log.push('title screen');   // a {fail:…} result has no log; let the report below speak
 await ctx2.close();
 await b.close();
 if(out.fail||errs.length){
  console.error('art-smoke FAILED',out.fail||'',errs.slice(0,6));
  process.exit(1);
 }
 console.log('art-smoke: all checks passed ('+out.log.join(', ')+')');
})();
