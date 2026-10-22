/* Wings (docs/MAIN-SWITCH-HANDOFF.md S3, §5 test 4): node tools/wings-smoke.js (needs NODE_PATH=$(npm root -g)).
   1  the migration: an old save's pilots with ships make one wing, led by the highest level, and named
   2  a pilot with a ship can't be left wingless after the frontier: the Assign window opens, Esc and the scrim don't
      close it, joining a wing does; a pilot without a ship can wait; before the frontier a new ship and its pilot join
      the first wing on their own
   3  in the Wings window: move a pilot to another wing (not while either is out on a mission, not into a full one),
      take them off the wing (their ship stays, free), seat a pilot in a free ship, make a pilot leader, rename a wing;
      a ship out of the wing and back
   4  a space sortie takes only a wing's pilots and ships ("Not in a wing"), while an asset slot still takes a ship
      outside a wing; a ground mission's transport doesn't need a wing */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(url);await pg.waitForTimeout(1200);
 await pg.evaluate(()=>window.SR.go('base',{}));await pg.waitForTimeout(500);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={};
  const $=s=>document.querySelector(s);
  const closeAll=()=>{for(let i=0;i<10&&f.getWin()&&f.getWin()!=='wingjoin';i++)f.closeWin();};
  closeAll();
  // a cast: three pilots of different levels with their own ships, and one pilot with no ship
  const mkPilot=(id,name,level)=>{let p=G.people.find(x=>x.id===id);if(!p){p=JSON.parse(JSON.stringify(G.people.find(x=>x.role==='Pilot')||G.people[0]));p.id=id;p.name=name;p.role='Pilot';p.assign='standby';G.people.push(p);}p.level=level;p.ship='';return p;};
  const ship=(id,cls,name)=>{let s=G.fighters.find(x=>x.id===id);if(!s){s=f.newFighter({id,name,cls,hull:100});G.fighters.push(s);}return s;};
  const a=mkPilot('wa','Ada Wing',3),bp=mkPilot('wb','Bo Wing',7),c=mkPilot('wc','Cy Wing',5),d=mkPilot('wd','Di Wing',2);
  ship('sa','cross','Cross A');ship('sb','talon','Talon B');ship('sc','cross','Cross C');
  a.ship='sa';bp.ship='sb';c.ship='sc';
  // 1. the migration: an old save at version 16, no wings
  for(const x of G.people)if(x.role==='Pilot'&&!['wa','wb','wc','wd'].includes(x.id))x.ship='';
  G.fighters=G.fighters.filter(x=>['sa','sb','sc'].includes(x.id));
  delete G.wings;delete G.wingSeq;G.v=16;f.upgradeSave();
  const W=()=>f.wingsOf(),w1=W()[0];
  out.mig=[W().length,w1&&w1.members.length,w1&&w1.leaderId,w1&&w1.name,w1&&w1.members.every(m=>m.pilotId&&m.shipId)];
  // 2. after the frontier: a pilot given a ship outside every wing must join one
  G.prologue.done=true;G.prologue.gates=G.prologue.gates||{};G.prologue.gates['*']=1;
  ship('sd','talon','Talon D');d.ship='sd';
  f.syncUI();
  out.need=[f.getWin(),(f.getWinArg()||{}).id];
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  $('#winsB').click();   // the scrim
  out.stays=f.getWin();
  out.joinBtns=[...document.querySelectorAll('#winsB [data-wjoin]')].length;
  document.querySelector('#winsB [data-wjoin]').click();
  out.joined=[f.getWin(),!!f.wingOfPilot('wd'),(f.wingOfPilot('wd')||{}).id===w1.id,d.ship];
  // a pilot without a ship can wait
  const e=mkPilot('we','Ed Wing',1);f.syncUI();out.wait=[f.getWin(),f.wingNeed()];
  // a full wing refuses; a new wing takes them
  ship('sf','talon','Talon F');ship('sg','talon','Talon G');const g=mkPilot('wg','Gi Wing',4);g.ship='sf';
  out.full=[w1.members.length,f.wingJoin('wg',w1.id)];
  out.started=[f.wingStart('wg'),W().length,(f.wingOfPilot('wg')||{}).leaderId==='wg'];
  const w2=f.wingOfPilot('wg');
  // 3. the Wings window: move, out on a mission, off the wing, seat, leader, rename, a ship out and back
  closeAll();f.openWin('wings');
  out.win=[f.getWin(),document.querySelectorAll('#winsB .wg-card').length,!!document.querySelector('#winsB [data-wname]'),document.querySelectorAll('#winsB [data-wlead]').length>0];
  G.fighters.find(x=>x.id==='sa').out=true;
  out.busy=f.wingMove('wc',w2.id);
  G.fighters.find(x=>x.id==='sa').out=false;
  out.move=[f.wingMove('wc',w2.id),(f.wingOfPilot('wc')||{}).id===w2.id,w2.members.some(m=>m.shipId==='sc')];
  out.off=[f.wingRemove('wc'),!!f.wingOfPilot('wc'),c.ship,w2.members.some(m=>m.shipId==='sc'&&!m.pilotId)];
  out.seat=[f.wingSeat('we','sc'),(f.wingOfPilot('we')||{}).id===w2.id,e.ship];
  out.lead=[f.wingLeader(w2.id,'we'),w2.leaderId,f.wingLeader(w2.id,'wa')];
  f.renderWin();
  const nm=document.querySelector('#winsB [data-wname="'+w2.id+'"]');nm.value='Hammerhead';nm.dispatchEvent(new Event('change',{bubbles:true}));
  out.rename=[w2.name,f.wingRename(w2.id,'  '),w2.name];
  // a free ship out of its wing, and back
  f.wingSeat('wc','sc');   // (Cy back in Cross C; Talon G arrives as a ship outside every wing)
  out.asset=[!!f.wingOfShip('sg'),f.wingAddShip('sg',w2.id),!!f.wingOfShip('sg'),f.wingDropShip('sg'),!!f.wingOfShip('sg'),f.wingDropShip('sc')];
  // the leader leaves: the highest level left leads
  const lead0=w1.leaderId;f.wingRemove(lead0);out.relead=[w1.leaderId!==lead0,w1.leaderId];
  closeAll();
  // 4. the plan: a space sortie takes wings only; an asset slot takes a ship outside a wing
  f.addMission('toi',true);const m=G.missions.find(x=>x.id==='toi');
  for(const x of G.people)if(x.role==='Pilot')x.assign='standby';
  f.openPlan(m);const PL=f.getPL();
  const rp=PL.slots.find(s=>s.key==='rp0'),rs=PL.slots.find(s=>s.key==='rs0');
  const used=new Set();
  out.plan=[f.plAccepts(rp,'p:wa'),f.plAccepts(rp,'p:'+lead0),f.plWhyPerson(G.people.find(x=>x.id===lead0),used,rp),
    f.plAccepts(rs,'f:sa'),f.plAccepts(rs,'f:sg'),f.plWhyShip(G.fighters.find(x=>x.id==='sg'),used,rs),
    f.plAccepts({key:'as0s',acc:'assetship'},'f:sg')];
  closeAll();
  // a ground transport: any ship with seats, wing or not
  G.fighters.push(f.newFighter({id:'gh',name:'Graf H',cls:'graf',hull:100}));f.wingDropShip('gh');
  out.ground=[!!f.wingOfShip('gh'),f.plAccepts({key:'tv0',acc:'vehicle'},'f:gh')];
  return out;
 });
 ok(r.mig[0]===1&&r.mig[1]===3&&r.mig[2]==='wb'&&r.mig[3]==='Dagger'&&r.mig[4],'1: the migration makes one wing of the pilots with ships, led by the highest level, named '+JSON.stringify(r.mig));
 ok(r.need[0]==='wingjoin'&&r.need[1]==='wd','2: a pilot with a ship outside every wing gets the Assign window '+JSON.stringify(r.need));
 ok(r.stays==='wingjoin'&&r.joinBtns>=1,'2: Esc and the scrim don\'t skip it '+JSON.stringify([r.stays,r.joinBtns]));
 ok(r.joined[0]!=='wingjoin'&&r.joined[1]&&r.joined[2]&&r.joined[3]==='sd','2: joining a wing closes it, the pilot flying their own ship '+JSON.stringify(r.joined));
 ok(r.wait[0]!=='wingjoin'&&r.wait[1]===null,'2: a pilot without a ship can wait '+JSON.stringify(r.wait));
 ok(r.full[0]===4&&/4 ships already/.test(r.full[1]||''),'2: a full wing refuses another '+JSON.stringify(r.full));
 ok(r.started[0]===null&&r.started[1]===2&&r.started[2],'2: Start a new wing: they lead it '+JSON.stringify(r.started));
 ok(r.win[0]==='wings'&&r.win[1]===2&&r.win[2]&&r.win[3],'3: the Wings window lists both wings, a name field and leader buttons '+JSON.stringify(r.win));
 ok(/out on a mission/.test(r.busy||''),'3: no moves while a wing is out on a mission '+JSON.stringify(r.busy));
 ok(r.move[0]===null&&r.move[1]&&r.move[2],'3: a pilot moves to another wing, with their ship '+JSON.stringify(r.move));
 ok(r.off[0]===null&&!r.off[1]&&r.off[2]===''&&r.off[3],'3: off the wing: the ship stays, free '+JSON.stringify(r.off));
 ok(r.seat[0]===null&&r.seat[1]&&r.seat[2]==='sc','3: a pilot takes the free ship '+JSON.stringify(r.seat));
 ok(r.lead[0]===null&&r.lead[1]==='we'&&/don't fly with/.test(r.lead[2]||''),'3: make leader, only someone in the wing '+JSON.stringify(r.lead));
 ok(r.rename[0]==='Hammerhead'&&/needs a name/.test(r.rename[1]||'')&&r.rename[2]==='Hammerhead','3: rename, never to nothing '+JSON.stringify(r.rename));
 ok(r.asset[0]===false&&r.asset[1]===null&&r.asset[2]&&r.asset[3]===null&&!r.asset[4]&&/take them off/.test(r.asset[5]||''),'3: a ship into a wing and out again; a flown one stays '+JSON.stringify(r.asset));
 ok(r.relead[0],'3: the leader off the wing: the next leads '+JSON.stringify(r.relead));
 ok(r.plan[0]===true&&r.plan[1]===false&&r.plan[2]==='Not in a wing'&&r.plan[3]===true&&r.plan[4]===false&&r.plan[5]==='Not in a wing'&&r.plan[6]===true,
  '4: a space sortie takes a wing\'s pilots and ships only; an asset slot takes a ship outside a wing '+JSON.stringify(r.plan));
 ok(r.ground[0]===false&&r.ground[1]===true,'4: a ground transport needs no wing '+JSON.stringify(r.ground));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r},null,0));
 if(fails.length){console.error('wings-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('wings-smoke OK');
})();
