/* Vehicles and Bots: node tools/vehicle-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},
             {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
             {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['akli','cowboy']}];
const spec=(sc,extra)=>Object.assign({kind:'ground',missionId:sc,scenario:sc,days:2,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'}},extra||{});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const go=async(m)=>{await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),m);await pg.waitForTimeout(700);};

 // ---- a crewed Police Cruiser (Steal Intelligence, Data Flats)
 await go(spec('intel',{ctx:{variant:'dataflats'}}));
 const a=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const car=U.find(u=>u.id==='pc1'),drv=U.find(u=>u.id==='pc1d');
  const dax=U.find(u=>u.id==='dax');
  out.spawn=[car.side,car.owner,!!car.veh,drv.side,drv.mnt&&drv.mnt.seat,drv.x===car.x&&drv.y===car.y];
  out.wpns=[f.wpnsOf(drv).join(),f.wpnsOf(car).length];
  // put Dax in sight of it and check who can be shot
  dax.x=car.x-260;dax.y=car.y;
  out.shots=[f.validShot(dax,drv,'akli'),f.validShot(dax,car,'akli'),f.validShot(drv,dax,'cruiser'),f.validShot(car,dax,'cruiser')];
  // the empty car is scenery: nobody shoots it
  f.dismount(drv,true);
  out.empty=[f.crewIn(car).length,f.validShot(dax,car,'akli'),f.canEnter(drv,car,60)];
  f.mount(drv,car);
  // Dax steals the car once it is empty: enter, drive, switch, exit
  f.dismount(drv,true);drv.x=car.x+900;drv.y=car.y+900;
  dax.x=car.x-100;dax.y=car.y;
  out.enterOffer=f.enterTargets(dax).map(v=>v.id).join();
  out.card=f.ordersFor(dax).join('').indexOf('data-ract="enter"')>=0;
  dax.x=car.x-30;
  f.mount(dax,car);
  out.stolen=[car.owner,dax.mnt&&dax.mnt.seat,f.reachOf(dax,'move'),f.wpnsOf(dax).join()];
  const html=f.ordersFor(dax).join('');
  const has=k=>html.indexOf('data-ract="'+k+'"')>=0;
  const dis=k=>{const m=html.match(new RegExp('<button[^>]*data-ract="'+k+'"[^>]*>'));return !!m&&/disabled/.test(m[0]);};
  out.inside=[has('move'),has('hold'),has('lockin'),has('exit'),has('sprint'),has('cover'),has('loot')&&dis('loot'),has('work')&&dis('work'),has('enter')];
  // a lawman can no longer shoot Dax, only the car he sits in
  drv.x=car.x+200;drv.y=car.y;
  const dw=f.wpnsOf(drv)[0];   // the patrolman's own sidearm (the enemy roster's HG-40)
  out.lawShots=[f.validShot(drv,dax,dw),f.validShot(drv,car,dw)];
  // the blast of a grenade does not reach inside
  const hp0=dax.hp,chp0=car.hp;f.explode(car.x,car.y,{r:80,d0:10,d1:10});
  out.blast=[dax.hp===hp0,car.hp<chp0];
  // destroyed: Dax is thrown clear and hurt
  const dhp=dax.hp;
  f.woundUnit(drv,car,999,false,'plasma');
  out.wreck=[!!car.down,!dax.mnt,dax.hp<dhp,Math.hypot(dax.x-car.x,dax.y-car.y)>20,f.crewIn(car).length];
  out.status=f.statusTag(car);
  return out;
 });
 ok(a.spawn.join()==='veh,law,true,law,drv,true','the cruiser spawns with its driver inside '+a.spawn);
 ok(a.wpns[0]==='cruiser'&&a.wpns[1]===0,'the driver fires the pulse cannon; the car never fires itself '+a.wpns);
 ok(a.shots.join()==='false,true,true,false','enclosed crew cannot be targeted, the car can '+a.shots);
 ok(a.empty[0]===0&&a.empty[1]===false&&a.empty[2]===true,'an empty car is not a target and can be entered '+a.empty);
 ok(a.enterOffer==='pc1'&&a.card,'Enter appears near a free vehicle '+a.enterOffer+' '+a.card);
 ok(a.stolen[0]==='reb'&&a.stolen[1]==='drv'&&a.stolen[2]===385&&a.stolen[3]==='cruiser','a rebel can take the wheel '+a.stolen);
 ok(a.inside.join()==='true,true,true,true,false,false,true,true,false','inside: move, hold, lock in, exit; no sprint or cover; loot and work out of reach '+a.inside);
 ok(a.lawShots.join()==='false,true','enemies shoot the car, not the driver '+a.lawShots);
 ok(a.blast[0]&&a.blast[1],'blasts hit the hull, not the crew '+a.blast);
 ok(a.wreck.join()==='true,true,true,true,0','a destroyed vehicle throws its crew clear and hurts them '+a.wreck);
 ok(/Wrecked/.test(a.status),'wreck status');

 // ---- a turret on the roof (Steal the Strider: Riot Dispersal Cruiser) and the Strider as a Bot
 await go(spec('strider',{vip:{name:'Strider SK-1',first:'Strider',hp:220,def:8,wpns:['strider'],strider:1}}));
 const c=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const car=U.find(u=>u.id==='rdc1'),drv=U.find(u=>u.id==='rdcd'),gun=U.find(u=>u.id==='rdcg'),dax=U.find(u=>u.id==='dax');
  dax.x=car.x-250;dax.y=car.y;
  out.seats=[f.seatOf(drv).k,f.seatOf(gun).k,f.wpnsOf(drv).length,f.wpnsOf(gun).join()];
  out.gunner=[f.validShot(dax,gun,'akli'),f.computeTN(dax,gun).entries.some(e=>e[0]==='VEHICLE HATCH'),f.validShot(dax,drv,'akli')];
  // drivers without a gun can still Move; the gunner can Hold but not Move; Switch is offered when a seat is free
  dax.x=car.x;dax.y=car.y;f.dismount(drv,true);f.mount(dax,car,'drv');
  const h=f.ordersFor(dax).join('');
  out.driver=[h.indexOf('data-ract="move"')>=0,/data-ract="hold"[^>]*disabled|disabled[^>]*data-ract="hold"/.test(h)];
  out.noSwitch=f.switchTargets(dax).length;   // the turret is taken
  f.dismount(gun,true);
  out.switchTo=f.switchTargets(dax).map(x=>x.k).join();
  f.switchSeat(dax,'gun');
  out.switched=[f.seatOf(dax).k,f.wpnsOf(dax).join(),f.ordersFor(dax).join('').indexOf('data-ract="move"')>=0];
  // the Strider: a Bot. It moves at its own speed and has the vehicle action list
  const st=U.find(u=>u.bot);
  const sh=f.ordersFor(st).join('');
  const has=k=>sh.indexOf('data-ract="'+k+'"')>=0;
  out.bot=[st.bot,f.reachOf(st,'move'),has('move'),has('hold'),has('sprint'),has('cover'),has('lockin'),has('exit'),f.cantSprint(st),f.canEnter(st,car,9999)];
  return out;
 });
 ok(c.seats.join()==='drv,gun,0,dispersal','dispersal cruiser seats: driver and turret '+c.seats);
 ok(c.gunner.join()==='true,true,false','the open turret gunner can be shot, behind the hatch; the driver cannot '+c.gunner);
 ok(c.driver[0]&&c.driver[1],'an unarmed driver moves but has no Hold '+c.driver);
 ok(c.noSwitch===0&&c.switchTo==='gun','switch position needs a free seat '+c.noSwitch+' '+c.switchTo);
 ok(c.switched.join()==='gun,dispersal,false','switched to the turret: the gun, no driving '+c.switched);
 ok(c.bot.join()==='strider,265,true,true,false,false,false,false,true,false','the Strider is a Bot: own speed, vehicle actions, cannot be manned '+c.bot);

 // ---- the transport unloads its riot squad when the alarm goes up; crews bail from a burning car
 await go(spec('autofactory'));
 const t=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const wave=gd.SCN.detWave.foes;
  const before=U.length;
  // spawn the detonation wave the way the scene does
  const list=f.expandUnits(wave);for(const u of list)U.push(u);
  const car=U.find(u=>u.id==='rtc1');
  out.aboard=f.crewIn(car).map(u=>u.id).join();
  f.alertTown('test');
  f.aiPlan();
  out.after=[f.crewIn(car).map(u=>u.id).join(),!!car.deployed,['rs2','rr2','rr3'].every(id=>{const u=U.find(x=>x.id===id);return u&&!u.mnt&&Math.hypot(u.x-car.x,u.y-car.y)<90;})];
  // crew bail at low hull (it is a roll, so force it)
  car.hp=10;let tries=0;while(f.crewIn(car).length&&tries++<200)f.moraleCheck();
  out.bail=[f.crewIn(car).length,car.down];
  return out;
 });
 ok(t.aboard==='rtcd,rs2,rr2,rr3','transport arrives with driver and squad '+t.aboard);
 ok(t.after[0]==='rtcd'&&t.after[1]&&t.after[2],'the squad gets out next to it when the alarm is up '+t.after);
 ok(t.bail[0]===0&&!t.bail[1],'the crew bail out of a burning car '+t.bail);

 // ---- a summoned Bot and vehicle from the Fire Support menu, and the result
 await go(spec('intel',{assets:{drop:false,ships:[],vehicles:[
   {id:'strider',name:'Strider SK-1',first:'Strider',type:'strider',kind:'bot',hp:110,maxhp:220,hpPct:50,def:8,aim:2,wpn:'strider',big:1},
   {id:'pc_9',name:'Old Faithful',type:'police',kind:'vehicle',hp:130,maxhp:130,hpPct:100}]}}));
 const s=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  f.alertTown('test');
  const items=f.fsItems().map(i=>i.key);
  const dax=U.find(u=>u.id==='dax');
  const pt={x:dax.x+60,y:dax.y-40};
  out.items=items.join();
  out.placed=[f.fsPlace('v0',pt),f.fsPlace('v1',{x:dax.x+120,y:dax.y})];
  out.gone=f.fsItems().length;
  f.startPlanning();
  const bot=U.find(u=>u.id==='veh_strider'),car=U.find(u=>u.id==='veh_pc_9');
  out.down=[!!bot,bot&&bot.bot,bot&&bot.side,bot&&bot.hp,!!car,car&&car.owner,car&&f.crewIn(car).length];
  // nobody is in the car; Dax gets in
  dax.x=car.x-20;dax.y=car.y;f.mount(dax,car);
  // the car is wrecked; the result reports it lost and the Bot's damage
  f.woundUnit(null,car,999,false,'plasma');
  bot.hp=55;
  const res=f.buildResult(true);
  out.res=JSON.stringify(res.vehicles);
  out.people=res.people.some(p=>p.id==='strider'||p.id==='veh_strider');
  return out;
 });
 ok(s.items==='v0,v1','owned vehicles appear in the Fire Support menu '+s.items);
 ok(s.placed.join()==='true,true'&&s.gone===0,'calling them in spends them '+s.placed+' '+s.gone);
 ok(s.down.join()==='true,strider,reb,110,true,reb,0','next planning: the Bot walks, the vehicle stands empty '+s.down);
 ok(s.res==='[{"id":"strider","lost":false,"hp":25},{"id":"pc_9","lost":true,"hp":0}]','result carries vehicle damage and losses '+s.res);
 ok(!s.people,'a Bot is not a person in the result');

 // ---- base: the Strider moves off the roster, rides as a fire-support asset, comes home damaged
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(600);
 const bs=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,out={};
  const G0=JSON.parse(JSON.stringify(D.G));
  G0.people.push({id:'strider',name:'Strider SK-1',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,auto:'strider'});
  delete G0.vehicles;
  f.restoreCampaign({campaign:G0,started:true});
  const G=D.G;
  out.mig=[G.people.some(p=>p.id==='strider'),(G.vehicles||[]).map(v=>v.id+':'+v.type+':'+v.hp).join()];
  f.syncUI();
  out.rail=[!document.querySelector('#vehSec').hidden,document.querySelector('#vehList').textContent.indexOf('Strider SK-1')>=0];
  // planning board: an optional vehicle slot under fire support
  const m={id:'vtest',name:'Vehicle test',desc:'Test.',objectives:['Test'],req:{transport:true,team:2},days:1,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{c:10}};
  G.missions.push(m);
  f.openPlan(m);
  const PL=f.getPL();
  const sl=PL.slots.find(x=>x.acc==='gveh');
  out.slot=[!!sl,sl&&sl.opt];
  f.plPlace('v:strider');
  out.placed=PL.v.gv0;
  out.html=document.body.innerHTML.indexOf('Vehicles and Bots')>=0;
  f.closeWin();
  // the debrief brings it home damaged, or not at all
  f.applyDebrief({missionId:'vtest',kind:'ground',days:0,win:true,people:[],vehicles:[{id:'strider',lost:false,hp:40}]});
  out.dmg=G.vehicles.find(v=>v.id==='strider').hp;
  f.advanceDay();
  out.rep=G.vehicles.find(v=>v.id==='strider').hp>40;
  const v2=f.addVehicle('police','Old Faithful');
  f.applyDebrief({missionId:'none',kind:'ground',days:0,win:false,people:[],vehicles:[{id:v2.id,lost:true,hp:0}]});
  out.lost=G.vehicles.some(v=>v.id===v2.id);
  // a hacked Strider joins the pool, a hacked Policebot the roster
  f.applyDebrief({missionId:'none',kind:'ground',days:0,win:true,people:[],gained:[{type:'strider',name:'Strider Mk I'},{type:'policebot',name:'Policebot PB-12'}]});
  out.gained=[G.vehicles.some(v=>v.name==='Strider Mk I'),G.people.some(p=>p.name==='Policebot PB-12'&&p.auto==='policebot')];
  return out;
 });
 ok(bs.mig[0]===false&&bs.mig[1]==='strider:strider:100','an old save moves the Strider into the vehicle pool '+bs.mig);
 ok(bs.rail[0]&&bs.rail[1],'the base lists vehicles and Bots '+bs.rail);
 ok(bs.slot[0]&&bs.slot[1]&&bs.placed==='strider'&&bs.html,'the plan takes a vehicle as an optional fire-support asset '+bs.slot+' '+bs.placed+' '+bs.html);
 ok(bs.dmg===40&&bs.rep,'it comes home damaged and repairs '+bs.dmg+' '+bs.rep);
 ok(bs.lost===false,'a wrecked vehicle is lost');
 ok(bs.gained[0]&&bs.gained[1],'hacked Bots join the pool, hacked Autos the roster '+bs.gained);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'vehicle-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
