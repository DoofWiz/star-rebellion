/* Smoke test for the Ambush: Extract VIP mission type (docs/PROLOGUE-HANDOFF.md P2): node tools/ambush-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   - the scenario loads as Rescue Tachi: the doc's objectives, the prisoner held out of sight, a crewed holding vehicle
     that nobody can climb into
   - with the alarm up the holding vehicle drives the road east in a real round, and off the map the mission fails
   - destroyed, it stalls (no blast on the squad standing by), its doors become the Work point, and opening them frees
     the prisoner, who is then escorted to the transport
   - on the board: the type's words, Tachi as the prisoner, and no recruit pop-up after the win (her beat decides) */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQ=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},{id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
  {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['akli','cowboy']}];
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const E=(f,a)=>pg.evaluate(f,a);
 const go=async()=>{
  await E(SQ=>{const m={kind:'ground',missionId:'rescuetachi',scenario:'ambush',days:2,squad:SQ,vip:{name:'Tachi Gard',first:'Tachi'},
    ctx:{title:'Rescue Tachi',place:'Redrock Flats',target:'convoy',sub:'Redrock Flats · Akkaro'},grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},
    transport:{id:'graf',name:'Marta',cls:'graf'}};
    window.SR.go('ground',{test:true,mission:m});},SQ);
  await pg.waitForTimeout(500);
 };

 // the scenario
 await go();
 let r=await E(()=>{const D=window.DBGground,v=D.U.find(u=>u.hold),vip=D.U.find(u=>u.vip),dax=D.U.find(u=>u.id==='dax');
  return {title:D.SCN.title,obj:D.fn.typeObjectives([],0).map(o=>o.t),veh:!!(v&&v.veh),crew:D.fn.crewIn(v).length,vip:!!(vip&&vip.away&&vip.caged),
    enter:D.fn.canEnter(dax,v,99999),route:(D.SCN.route||[]).length};});
 ok(r.title==='Rescue Tachi','the mission carries its own name: '+r.title);
 ok(r.obj.join('|')==='Destroy holding vehicle|Unlock the doors|Escort Tachi Gard to the extraction point — 0/0','the doc’s three objectives: '+r.obj.join('|'));
 ok(r.veh&&r.crew===1&&r.vip&&r.route>1,'a crewed holding vehicle, a route to the edge, the prisoner out of sight '+JSON.stringify(r));
 ok(r.enter===false,'nobody climbs into the holding vehicle');

 // a real round with the alarm up: the truck drives east (unarmed rebels, so the round never waits on a player's shot)
 await E(()=>{document.querySelector('#sc-ground #enterBtn').click();});
 await pg.waitForTimeout(200);
 await E(()=>{const D=window.DBGground;D.fn.endCutscene();});
 await pg.waitForTimeout(200);
 r=await E(async()=>{
  const D=window.DBGground,v=D.U.find(u=>u.hold),x0=v.x;
  D.fn.alertTown('smoke');D.fn.startPlanning();
  for(const u of D.U)if(u.side==='reb'&&!u.away){u.wpns=[];u.order={type:'hold'};}
  D.fn.execute();
  for(let w=0;w<80&&D.phase!=='PLANNING'&&D.phase!=='GAMEOVER';w++)await new Promise(res=>setTimeout(res,250));
  return {x0,x1:v.x,phase:D.phase,fleeing:D.amb.fleeing,fight:D.fn.stillFighting(false)};
 });
 ok(r.x1-r.x0>120&&r.fleeing,'with the alarm up the holding vehicle drives for the edge: '+Math.round(r.x0)+' -> '+Math.round(r.x1));
 ok(r.fight===true,'a fleeing truck keeps the fight on');
 // and once it is off the map, the mission fails
 r=await E(()=>{
  const D=window.DBGground,v=D.U.find(u=>u.hold);
  for(let i=0;i<12&&D.phase!=='GAMEOVER';i++){
   D.fn.aiPlan();const drv=D.U.find(u=>u.mnt&&u.mnt.v===v.id),o=drv&&drv.order;
   if(o&&o.type==='move'){v.x=o.tx;v.y=o.ty;D.fn.vehSync();}
   D.fn.endRound();
  }
  return {phase:D.phase,win:D.gameEnd&&D.gameEnd.win,esc:D.amb.escaped,fail:D.fn.typeObjectives([],0)[0].fail,txt:document.querySelector('#sc-ground #endText').textContent};
 });
 ok(r.phase==='GAMEOVER'&&r.win===false&&r.esc&&r.fail,'off the map with the prisoner: the mission fails '+JSON.stringify(r));

 // stopped: no blast, the doors open on the prisoner
 await go();
 r=await E(()=>{
  const D=window.DBGground,v=D.U.find(u=>u.hold),dax=D.U.find(u=>u.id==='dax'),vip=D.U.find(u=>u.vip);
  D.fn.alertTown('smoke');
  dax.x=v.x+70;dax.y=v.y+40;const hp0=dax.hp;
  D.fn.vehDestroyed(v,dax);
  const wp=D.WORK.find(w=>w.id==='release');
  const out={stopped:D.amb.stopped,hp:dax.hp===hp0,wp:wp.x>0&&Math.hypot(wp.x-v.x,wp.y-v.y)<90,vipAway:vip.away};
  D.fn.completeWork(wp,dax);
  out.free=!vip.away&&!vip.caged&&D.rs.released;
  out.obj=D.fn.typeObjectives([],0).map(o=>o.done+'/'+o.now).join(' ');
  return out;
 });
 ok(r.stopped&&r.hp,'destroyed, the holding vehicle stalls: no blast on the squad standing beside it');
 ok(r.wp&&r.vipAway===1,'its doors are the Work point, by the wreck');
 ok(r.free,'opening the doors frees the prisoner');
 ok(r.obj==='true/false true/false false/true','objectives: stopped, unlocked, now the escort: '+r.obj);

 // the board: an authored instance of the type
 r=await E(()=>{
  window.Pro.jump('tachi_offer');window.DBGbase.fn.closeWin();window.DBGbase.fn.closeWin();
  const m=window.DBGbase.G.missions.find(x=>x.story==='rescuetachi');
  return m&&{name:m.name,tid:m.tid,npc:m.npc.name,noRecruit:m.noRecruit,noFollow:m.noFollow,desc:m.desc,src:m.src,scen:m.scenario};
 });
 ok(r&&r.name==='Rescue Tachi'&&r.tid==='ambush'&&r.scen==='ambush'&&r.npc==='Tachi Gard'&&r.noRecruit===1&&r.noFollow===1&&r.src==='venn'&&/prisoner they really don’t want to lose/.test(r.desc),
  'Rescue Tachi is an Ambush: Extract VIP from Venn, Tachi held, no recruit or follow-up after '+JSON.stringify(r));

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'ambush-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
