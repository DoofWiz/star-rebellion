/* The designer's October 6 round of field changes: node tools/fieldops-smoke.js (needs NODE_PATH=$(npm root -g)).
   Death (DESIGN_BLOCKERS C-29): enemies die; a rebel dies when hit while down, to a critical hit that drops them,
   or to one hit from full health, and otherwise is downed for a Treat Wound to bring back (bleeding out after two
   rounds). Stims are a planning Action. Steal the Cross: the tower guard is drawn, keeps her range and is marked
   when she fires; the supply drop works before the shooting starts. Every transport leaves and comes back, and offers
   a supply drop and its door gun. A downed VIP or Pilot fails the mission only when dead or past saving (C-31). The briefing shows
   faces, MOVE OUT is gone, a double-click opens the Personnel File. Flight Controller and Combat Support. The base
   screens: no Experience bar, no flavour line, a paper doll, no recruit Terms, ships drawn in the roster and the
   ship window. */
const {chromium}=require('playwright');
const path=require('path');
const fs=require('fs');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,spec:'medic',wpns:['akli','cowboy'],art:null},
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

 // ---- death and revival (Steal Intelligence: an ordinary mission)
 const art=await pg.evaluate(()=>window.SR_ART.lookOf({id:'dax',name:'Dax Ferro',role:'Soldier'}));
 SQUAD[0].art=art;
 await go(spec('intel'));
 const d=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const dax=U.find(u=>u.id==='dax'),runa=U.find(u=>u.id==='runa'),kel=U.find(u=>u.id==='kel');
  const foe=U.find(u=>u.side==='law'&&!u.veh&&!u.auto);
  f.woundUnit(dax,foe,foe.hp+5,false,'ballistic','akli');out.foe=[foe.down,foe.dead];
  runa.hp=40;f.woundUnit(null,runa,60,false,'ballistic','akli');out.downed=[runa.down,!!runa.dead];
  // brought round with a Med Pack
  dax.meds=2;dax.x=runa.x+30;dax.y=runa.y;out.treatable=f.treatTarget(dax)===runa;f.doTreat(dax);out.revived=[runa.down,runa.hp>0];
  // downed again, then hit again: dead
  runa.hp=10;f.woundUnit(null,runa,20,false,'ballistic','akli');f.woundUnit(null,runa,5,false,'ballistic','akli');out.finished=[runa.down,runa.dead];
  // one hit from full health
  kel.hp=kel.maxhp;f.woundUnit(null,kel,kel.maxhp+20,false,'ballistic','akli');out.oneshot=kel.dead;
  // a critical hit that drops them
  const r=f.mkU({id:'tst',name:'Tess Tor',first:'Tess',side:'reb',x:dax.x,y:dax.y,hp:100,maxhp:100,wpns:['akli']});U.push(r);
  r.hp=30;f.woundUnit(null,r,40,true,'ballistic','akli');out.crit=r.dead;
  // bleeding out: two rounds down with untreated bleeding
  const b2=f.mkU({id:'tsb',name:'Bo Ble',first:'Bo',side:'reb',x:dax.x+60,y:dax.y,hp:100,maxhp:100,wpns:['akli']});U.push(b2);
  b2.hp=20;f.woundUnit(null,b2,30,false,'ballistic','akli');b2.inj=[{k:'bleeding',treated:false}];
  f.endRound();const one=b2.dead;f.endRound();out.bleed=[!!one,b2.dead];
  // the debrief: the dead are lost, the downed come home injured
  const res=f.buildResult(false);out.result=['dax','runa','kel'].map(id=>(res.people.find(p=>p.id===id)||{}).state).join();
  // the dead have no stars
  out.pose=f.artPose(runa,f.clock()).dead===1;
  // stims are a planning Action
  dax.hp=50;dax.stims=1;dax.down=0;dax.dead=0;
  f.setPhase('PLANNING');f.orderAct('stim');
  out.stimOrder=dax.order&&dax.order.type;
  return out;
 });
 ok(d.foe.join()==='1,1','an enemy dies '+d.foe);
 ok(d.downed.join()==='1,false','a rebel dropped by an ordinary hit is downed, not dead '+d.downed);
 ok(d.treatable&&d.revived.join()==='0,true','a Treat Wound brings a downed rebel round '+[d.treatable,d.revived]);
 ok(d.finished.join()==='1,1','hit again while down: dead '+d.finished);
 ok(d.oneshot===1&&d.crit===1,'one hit from full health, or a critical that drops them: dead '+[d.oneshot,d.crit]);
 ok(d.bleed.join()==='false,1','bleeding out takes two rounds '+d.bleed);
 ok(d.result==='ok,lost,lost','the dead are lost; the rest come home '+d.result);
 ok(d.pose,'no stars over the dead');

 // ---- the briefing, MOVE OUT and the Personnel File in the field
 const ui=await pg.evaluate(()=>({img:!!document.querySelector('#gSquad img.bs-face')}));
 ok(ui.img,'the in-mission briefing shows faces');
 ok(!/MOVE OUT/.test(fs.readFileSync(path.resolve(__dirname,'../game/js/ground.js'),'utf8')),'the MOVE OUT transition is gone');

 // ---- Steal the Cross
 await go(spec('stealcross',{pilot:{id:'sera',name:'Sera Kest',first:'Sera',level:2,wpns:['cowboy']}}));
 const x=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const wren=U.find(u=>u.id==='wren'),dax=U.find(u=>u.id==='dax');
  dax.x=wren.x+700;dax.y=wren.y;
  out.far=f.validShot(wren,dax,'longiron');
  // her shot gives her away for the round after, so the squad can answer
  f.setPhase('PLANNING');
  const hid=U.filter(u=>u.side==='reb').map(u=>[u,u.x,u.y]);
  for(const [u] of hid){u.x=wren.x+5000;u.y=wren.y;}
  f.updateVision(1e9);out.hidden=!f.unitSeen(wren);
  wren.flashR=gd.round+1;f.updateVision(2e9);out.flash=f.unitSeen(wren);
  wren.flashR=gd.round-1;f.updateVision(3e9);out.faded=!f.unitSeen(wren);
  for(const [u,x,y] of hid){u.x=x;u.y=y;}
  delete wren.flashR;f.setPhase('CUTSCENE');
  // the transport leaves after the drop and comes back for the pickup
  f.endCutscene();out.leaves=f.grafState_();
  f.grafUpdate(f.clock()+5000);out.gone=f.grafState_();
  f.doCrossAway();out.back=f.grafState_();
  f.grafUpdate(f.clock()+6000);out.landed=f.grafState_();
  return out;
 });
 ok(x.far===true,'the tower guard keeps her rifle\'s reach '+x.far);
 ok(x.hidden&&x.flash&&x.faded,'her shot marks her for the round after, then she fades '+[x.hidden,x.flash,x.faded]);
 ok(x.leaves==='flying'&&x.gone==='gone'&&x.back==='flying'&&x.landed==='landed','the transport leaves the LZ and comes back '+JSON.stringify(x));
 await go(spec('stealcross',{pilot:{id:'sera',name:'Sera Kest',first:'Sera',level:2,wpns:['cowboy']},assets:{drop:true,ships:[],vehicles:[]}}));
 const dr=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,out={};
  f.endCutscene();
  out.phase=gd.phase;
  const dax=gd.U.find(u=>u.id==='dax');
  out.placed=f.fsPlace('drop',{x:dax.x+40,y:dax.y});
  f.fsExecute();out.early=gd.FS.orders[0].landed;
  return out;
 });
 ok(dr.phase==='FREE'&&dr.placed&&dr.early===false,'a supply drop can be called before the shooting starts, and lands on a timer '+JSON.stringify(dr));
 // every transport leaves after the drop and comes back when the job is done; from the air it offers fire support
 await go(spec('intel',{transport:{id:'marta',name:'Marta',cls:'graf',doorgun:1},assets:{drop:true,ships:[],vehicles:[]}}));
 const tr=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,out={};
  f.endCutscene();out.leaves=f.grafState_();
  f.grafUpdate(f.clock()+5000);out.gone=f.grafState_();
  out.items=f.fsItems().map(i=>i.key+':'+i.name).join('|');
  const own=gd.FS.ships.find(a=>a.own);
  out.notReady=f.extractReady();
  gd.ix.hacked=true;
  f.grafUpdate(f.clock());out.back=f.grafState_();
  out.ownSpent=own.state;
  f.grafUpdate(f.clock()+6000);out.landed=f.grafState_();
  const dax=gd.U.find(u=>u.id==='dax');f.fsPlace('drop',{x:dax.x+40,y:dax.y});
  out.dropUsed=f.buildResult(true).dropUsed;
  return out;
 });
 ok(tr.leaves==='flying'&&tr.gone==='gone'&&tr.back==='flying'&&tr.landed==='landed','the transport leaves and comes back when the job is done '+JSON.stringify(tr));
 ok(/drop:Supply Drop/.test(tr.items)&&/s0:Door Gunner Cover · Marta/.test(tr.items),'the transport offers a supply drop and its door gun '+tr.items);
 ok(tr.notReady===false&&tr.ownSpent==='spent','no pickup until it is back; it leaves the gun to make the pickup '+[tr.notReady,tr.ownSpent]);
 ok(tr.dropUsed===true,'the debrief hears a drop was called, to pay for it '+tr.dropUsed);
 // the Pilot is needed for the objective: going down is not the end, dying or running out of Med Packs is (C-31)
 await go(spec('stealcross',{pilot:{id:'sera',name:'Sera Kest',first:'Sera',level:2,wpns:['cowboy']}}));
 const vp=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  f.endCutscene();
  const sera=U.find(u=>u.id==='sera'),dax=U.find(u=>u.id==='dax');
  f.downUnit(sera,null);out.down=[sera.down,gd.phase];
  dax.meds=1;dax.x=sera.x+30;dax.y=sera.y;out.treat=f.treatTarget(dax)===sera;f.doTreat(dax);out.up=[sera.down,gd.phase];
  for(const u of U)u.meds=0;
  f.downUnit(sera,null);out.noMeds=gd.phase;
  return out;
 });
 ok(vp.down.join()==='1,FREE'&&vp.treat&&vp.up.join()==='0,FREE','a downed Pilot can be brought round; the mission goes on '+JSON.stringify(vp));
 ok(vp.noMeds==='GAMEOVER','down with no Med Pack left in the squad: the mission is lost '+vp.noMeds);
 await go(spec('stealcross',{pilot:{id:'sera',name:'Sera Kest',first:'Sera',level:2,wpns:['cowboy']}}));
 const vk=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U;
  f.endCutscene();
  const sera=U.find(u=>u.id==='sera');
  f.downUnit(sera,null);f.killUnit(sera,null,'');
  return [gd.phase,f.canDie(sera)===false&&!!sera.dead];
 });
 ok(vk.join()==='GAMEOVER,true','a dead Pilot ends it '+vk);

 // ---- Combat Support in the field
 await go(spec('intel',{sup:{evac:1,bombard:1,fsExtra:1,precise:1,saturate:1,dangerClose:1}}));
 const cs=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const runa=U.find(u=>u.id==='runa'),dax=U.find(u=>u.id==='dax');
  runa.hp=10;f.woundUnit(null,runa,20,false,'ballistic','akli');
  out.items=f.fsItems().map(i=>i.key).sort().join();
  out.evac=f.fsPlace('evac',{x:runa.x,y:runa.y});out.out=runa.extracted;
  const hp=dax.hp;f.explode(dax.x,dax.y,{r:100,d0:40,d1:40,fs:1});out.safe=dax.hp===hp;
  return out;
 });
 ok(/bombard/.test(cs.items)&&/evac/.test(cs.items)&&cs.evac&&cs.out===1,'Evac on Call and Heavy Bombardment on the menu; a downed rebel flown out '+JSON.stringify(cs));
 ok(cs.safe,'Danger Close: fire support spares the squad');

 // ---- Flight Controller in space
 await pg.evaluate(()=>{window.SR.go('space',{test:true,mission:{kind:'space',missionId:'x',days:0,sup:{tight:1,jump:1,plot:'left'},flight:[
   {pilotId:'sera',name:'Sera Kest',first:'Sera',level:3,aim:3,cool:72,tr:[],cls:'cross',fighterId:'f1',fighterName:'Dustfall',hull:100,tight:1}]}});});
 await pg.waitForTimeout(400);
 const sp=await pg.evaluate(()=>{
  const D=window.DBGspace,F=D.fn,a=D.ships.find(x=>x.id==='P1'),foe=D.ships.find(x=>x.faction==='heg');
  return {tight:F.computeTN(foe,a).entries.some(e=>e[0]==='TIGHT WING'),plotX:a.x};
 });
 ok(sp.tight&&sp.plotX<400,'Tight Wing and Intercept Plot reach the space scene '+JSON.stringify(sp));

 // ---- the base: the Personnel File, the recruit screen, ships, Flight Controller and Combat Support
 await pg.evaluate(()=>window.SR.go('base'));await pg.waitForTimeout(500);
 const bs=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,R=window.Rebel,out={};
  G.introDone=true;
  const dax=G.people.find(p=>p.id==='dax');
  f.openWin('person',dax);
  const h=document.getElementById('winCardB').innerHTML;
  out.file=[h.indexOf('>Experience<')<0,h.indexOf('bs-bio')<0,h.indexOf('with us since')<0,h.indexOf('pf-doll')>=0];
  out.none=/None yet\. Missions write these\./.test(h);
  f.closeWin();
  const rec=R.migrate({id:'rcx',name:'Rec Ruit',role:'Soldier',level:1,xp:0,assign:'rest',bio:'x'});
  f.openWin('recruit',{cards:[{p:rec}]});out.terms=document.getElementById('winCardB').innerHTML.indexOf('>Terms<')<0;f.closeWin();
  G.fighters.push(f.newFighter({id:'mt',name:'Marta',cls:'graf',hull:80}));f.syncUI();
  out.shipFace=!!document.querySelector('#fleetList img.bs-shipface');
  f.openWin('ship',G.fighters[G.fighters.length-1]);out.shipView=!!document.querySelector('#winCardB .bs-shipview img');f.closeWin();
  // the in-mission file
  out.pfile=!!(window.SR.personFile&&/bs-doll/.test(window.SR.personFile('dax')));
  // Mission Control specialists bring their niche to a supported mission
  if(!G.rooms.some(r=>r.key==='command'&&!r.build))G.rooms.push({id:'rm_cc',key:'command',r:0,c:0,w:1,h:1,up:[]});
  const mk=(id,niche,forks)=>{const p=R.migrate({id,name:id+' Test',role:'Support',level:19,xp:0,assign:'room:command',bio:'Dispatcher with a gift for knowing where everybody is.',morale:60,niche,forks});G.people.push(p);return p;};
  mk('fc','flightctl',{7:'A',15:'B'});
  const fx=f.supportStart({id:'sp',name:'Space op',days:1},'space',[]);
  out.fc=[fx.vector,fx.tight,fx.jump].join();
  mk('cs','combatsupport',{7:'B',15:'A'});
  const gx=f.supportStart({id:'gr',name:'Ground op',days:1},'ground',[]);
  out.cs=[gx.fsExtra,gx.rapid,gx.evac,gx.saturate,gx.bombard,!!gx.precise].join();
  return out;
 });
 ok(bs.file.every(Boolean)&&bs.none,'the Personnel File: no Experience bar, flavour or joined line; a paper doll; Experiences None '+JSON.stringify(bs.file));
 ok(bs.terms,'the recruit screen has no Terms');
 ok(bs.shipFace&&bs.shipView,'ships drawn in the roster and the ship window '+[bs.shipFace,bs.shipView]);
 ok(bs.pfile,'the Personnel File is there for a mission window');
 ok(bs.fc==='1,1,1','Flight Controller: Vectoring, Tight Wing, Emergency Jump '+bs.fc);
 ok(bs.cs==='1,1,1,1,1,false','Combat Support: Fire Coordination, Rapid Response, Evac, Saturation, Heavy Bombardment '+bs.cs);
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 await b.close();
 if(fails.length){console.log('fieldops-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('fieldops-smoke: all checks passed');
})();
