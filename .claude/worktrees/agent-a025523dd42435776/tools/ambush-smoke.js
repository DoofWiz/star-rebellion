/* Smoke test for the Ambush: Extract VIP mission type (docs/PROLOGUE-HANDOFF.md P2): node tools/ambush-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   - the scenario loads as Rescue Tachi: the doc's objectives, the prisoner held out of sight, a crewed holding vehicle
     that nobody can climb into
   - with the alarm up the holding vehicle drives the road east in a real round, and off the map the mission fails
   - destroyed, it stalls (no blast on the squad standing by), its doors become the Work point, and opening them frees
     the prisoner, who is then escorted to the transport
   - on the board: the type's words, Tachi as the prisoner, and no recruit pop-up after the win (her beat decides)
   - FEEDBACK-0.2 §1: the prisoner never walks in the cinematic (here, in Rescue Dissident and Steal the Strider); in the
     ambush she rides in the truck, out of the rail and unseen, until the doors open; Rescue Tachi's card has no
     recruit chip for her, a generic ambush's does */
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
  return {title:D.SCN.title,obj:D.fn.typeObjectives([],0).map(o=>o.t),veh:!!(v&&v.veh),crew:D.fn.crewIn(v).length,vip:!!(vip&&vip.away),
    enter:D.fn.canEnter(dax,v,99999),route:(D.SCN.route||[]).length,held:vip&&vip.heldIn===v.id&&!vip.caged};});
 ok(r.title==='Rescue Tachi','the mission carries its own name: '+r.title);
 ok(r.obj.join('|')==='Destroy holding vehicle|Unlock the doors|Escort Tachi Gard to the extraction point — 0/0','the doc’s three objectives: '+r.obj.join('|'));
 ok(r.veh&&r.crew===1&&r.vip&&r.held&&r.route>1,'a crewed holding vehicle, a route to the edge, the prisoner held inside it '+JSON.stringify(r));
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
  out.free=!vip.away&&!vip.caged&&!vip.heldIn&&D.rs.released;
  out.obj=D.fn.typeObjectives([],0).map(o=>o.done+'/'+o.now).join(' ');
  return out;
 });
 ok(r.stopped&&r.hp,'destroyed, the holding vehicle stalls: no blast on the squad standing beside it');
 ok(r.wp&&r.vipAway===1,'its doors are the Work point, by the wreck');
 ok(r.free,'opening the doors frees the prisoner');
 ok(r.obj==='true/false true/false false/true','objectives: stopped, unlocked, now the escort: '+r.obj);

 // the cinematic (FEEDBACK-0.2 §1): the prisoner never walks out with the squad. In the ambush she stays in the truck,
 // unseen; in Rescue Dissident and Steal the Strider she stays in her cell
 const cine=async(scen,vip)=>{
  await E(([SQ,scen,vip])=>{const m={kind:'ground',missionId:'x',scenario:scen,days:2,squad:SQ,vip,
    ctx:{title:'X',place:'Somewhere',target:'convoy',sub:'Somewhere · Akkaro'},grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},transport:{id:'graf',name:'Marta',cls:'graf'}};
    window.SR.go('ground',{mission:m});},[SQ,scen,vip]);
  await pg.waitForTimeout(400);
  await E(()=>document.querySelector('#sc-ground #enterBtn').click());
  return E(async()=>{
   const D=window.DBGground,v=D.U.find(u=>u.vip),x0=v.x,y0=v.y,out={moved:0,drawn:0,n:0,held:v.heldIn||null,cell:!!v.caged};
   for(let i=0;i<150&&D.phase==='CUTSCENE';i++){
    const hv=v.heldIn&&D.U.find(x=>x.id===v.heldIn);
    if(hv?Math.hypot(v.x-hv.x,v.y-hv.y)>1:Math.hypot(v.x-x0,v.y-y0)>1)out.moved++;
    if(D.fn.actorList().includes(v))out.drawn++;
    out.n++;await new Promise(res=>setTimeout(res,100));
   }
   out.phase=D.phase;return out;
  });
 };
 r=await cine('ambush',{name:'Tachi Gard',first:'Tachi'});
 ok(r.n>20&&r.moved===0&&r.drawn===0&&r.held==='hold','Rescue Tachi’s cinematic: Tachi stays in the truck, unseen '+JSON.stringify(r));
 r=await cine('rescue',{name:'Ilse Varn',first:'Ilse'});
 ok(r.n>20&&r.moved===0&&r.cell,'Rescue Dissident’s cinematic: the prisoner stays in the cell '+JSON.stringify(r));
 r=await cine('strider',{name:'Strider SK-1',first:'Strider',hp:200,def:14,wpns:['cowboy'],strider:1});
 ok(r.n>20&&r.moved===0&&r.cell,'Steal the Strider’s cinematic: the Strider stays in its yard '+JSON.stringify(r));
 // riding: after the cinematic she is not in the squad rail or drawn, and she moves with the truck through real rounds
 await go();
 r=await E(async()=>{
  const D=window.DBGground,v=D.U.find(u=>u.hold),vip=D.U.find(u=>u.vip);
  const rail=()=>[...document.querySelectorAll('#sc-ground #rosterR [data-unit]')].map(e=>e.getAttribute('data-unit'));
  const out={rail:rail().includes(vip.id),drawn:D.fn.actorList().includes(vip),at:Math.hypot(vip.x-v.x,vip.y-v.y)<1};
  document.querySelector('#sc-ground #enterBtn').click();await new Promise(res=>setTimeout(res,200));D.fn.endCutscene();
  D.fn.alertTown('smoke');D.fn.startPlanning();
  for(const u of D.U)if(u.side==='reb'&&!u.away){u.wpns=[];u.order={type:'hold'};}
  const x0=v.x;D.fn.execute();
  for(let w=0;w<80&&D.phase!=='PLANNING'&&D.phase!=='GAMEOVER';w++)await new Promise(res=>setTimeout(res,250));
  out.moved=v.x-x0>60;out.with=Math.hypot(vip.x-v.x,vip.y-v.y)<1;out.rail2=rail().includes(vip.id);
  // stopped, the doors worked: she is the escort, in the rail, at the doors
  const dax=D.U.find(u=>u.id==='dax');D.fn.vehDestroyed(v,dax);
  const wp=D.WORK.find(w=>w.id==='release');D.fn.completeWork(wp,dax);D.fn.syncUI();
  out.freed=rail().includes(vip.id)&&!vip.heldIn&&Math.hypot(vip.x-wp.x,vip.y-wp.y)<60;
  return out;
 });
 ok(!r.rail&&!r.drawn&&r.at,'before release the prisoner is in the truck: not in the squad rail, not drawn '+JSON.stringify(r));
 ok(r.moved&&r.with&&!r.rail2,'as the truck drives, she goes with it '+JSON.stringify(r));
 ok(r.freed,'the doors open: she joins the rail as the escort, at the doors '+JSON.stringify(r));

 // the board: an authored instance of the type
 r=await E(()=>{
  window.Pro.jump('tachi_offer');window.DBGbase.fn.closeWin();window.DBGbase.fn.closeWin();
  const m=window.DBGbase.G.missions.find(x=>x.story==='rescuetachi');
  const B=window.DBGbase.fn,chips=mm=>{const h=B.msRewards(mm);return /people/.test(h)&&h.indexOf(mm.npc.name)>=0;};
  const gen=B.spawnMission('ambush',{src:'venn',loc:'akkaro',region:'flats',target:'convoy'});
  return m&&{name:m.name,tid:m.tid,npc:m.npc.name,noRecruit:m.noRecruit,noFollow:m.noFollow,desc:m.desc,src:m.src,scen:m.scenario,chip:chips(m),genChip:!!(gen&&gen.npc&&chips(gen))};
 });
 ok(r&&r.name==='Rescue Tachi'&&r.tid==='ambush'&&r.scen==='ambush'&&r.npc==='Tachi Gard'&&r.noRecruit===1&&r.noFollow===1&&r.src==='venn'&&/prisoner they really don’t want to lose/.test(r.desc),
  'Rescue Tachi is an Ambush: Extract VIP from Venn, Tachi held, no recruit or follow-up after '+JSON.stringify(r));
 ok(r&&r.chip===false&&r.genChip===true,'Rescue Tachi’s card shows no recruit chip for Tachi; a generic ambush’s card still shows its prisoner as a recruit '+JSON.stringify({chip:r&&r.chip,gen:r&&r.genChip}));

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'ambush-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
