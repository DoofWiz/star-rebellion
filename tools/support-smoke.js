/* Support specialties (the Support Specialties doc; game/js/support.js; DESIGN_BLOCKERS C-28):
   node tools/support-smoke.js (needs NODE_PATH=$(npm root -g)).
   A Support rebel has a base specialty from level 1 and works in its home room (2 people, +1 per extra tile). The
   Department Head (highest level) sets the base Rules, a niche's Lead (highest, or one the player names, a day later)
   sets its Rules, Staff run Jobs. Checks: specialties from origin lines, capacity, heads and leads, Treatment and
   Critical Condition, Stabilise, Repairs, Intel and Processing, Outreach, the classroom and forks, timed Jobs
   (Strength Programme, prosthetics, Data Tap, Special Order, Broadcasts), the Smuggler's market, XP, Mission
   Support and the planning board, the old save's posts, the screens, and the ground and space scenes' hooks. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,R=window.Rebel,SP=window.Support,out={};
  f.setRng(()=>0.99);
  G().introDone=true;
  let n=0;
  const mk=(bio,extra)=>{const p=R.migrate(Object.assign({id:'s'+(++n),name:'Sup'+n+' Test',role:'Support',level:1,xp:0,assign:'rest',bio,morale:60,charTrait:'brave'},extra||{}));G().people.push(p);return p;};
  const room=(key,r,c,w)=>{const rm={id:'rm_'+key+r+c,key,r,c,w:w||1,h:1,up:[]};G().rooms.push(rm);return rm;};
  // ---- the data
  out.data=[SP.SPEC_ORDER.length,Object.keys(SP.NICHE).length,SP.UNLOCKS.length,SP.UNLOCKS.every(u=>[3,7,11,15,19].includes(u.lv)),
    Object.keys(SP.NICHE).every(k=>SP.unlocksOf(k).filter(u=>u.f).length===4||SP.unlocksOf(k).length===7)];
  // ---- base specialty from the origin line
  out.guess=['Physician struck off.','Registry clerk who read everything.','Grease monkey who can rebuild a hauler drive.','Lab tech.','Quartermaster. Counts every bolt twice.','Schoolteacher.','Union organiser.','Dispatcher with a gift for knowing where everybody is.']
    .map(b=>SP.guess({name:'X',bio:b})).join();
  // ---- rooms: capacity, posting only to the home room
  room('infirmary',6,6,2);room('workshop',6,8);room('comms',0,8);room('training',0,0);room('store',7,0);room('techlab',7,2);room('diplo',7,4);
  out.cap=[f.roomCap('infirmary'),f.roomCap('workshop'),f.roomCap('hangar')];
  const d1=mk('Physician.',{level:5}),d2=mk('Doctor.',{level:2}),d3=mk('Medic.',{level:1});
  for(const p of [d1,d2,d3])p.assign='room:infirmary';
  out.posted=f.postedTo('infirmary').length;   // assigning by hand goes through the button; capacity is checked there
  d3.assign='rest';
  out.head=f.headOf('infirmary').id===d1.id;
  // ---- Treatment: two patients per Doctor, at +50% (level 1) to +100% (level 19)
  const pts=[0,1,2,3,4].map(i=>{const p=R.migrate({id:'pt'+i,name:'Pt'+i+' Test',role:'Soldier',level:1,xp:0,assign:'rest',bio:'x',morale:60});R.layUp(p,'downed',8-i);G().people.push(p);return p;});
  const tb=f.treatedBy();
  out.treated=Object.keys(tb).length;
  out.rates=pts.map(p=>Math.round(f.healRate(p)*100)/100).join();
  // Critical Condition only heals under Treatment
  pts.forEach(p=>{p.cond=[];});
  const crit=pts[0];R.layUp(crit,'critical',8);
  const c0=R.laidUp(crit);d1.assign='rest';d2.assign='rest';
  f.advanceDay();out.critHeld=R.laidUp(crit)===c0;
  d1.assign='room:infirmary';f.advanceDay();out.critHeals=R.laidUp(crit)<c0;
  crit.cond=[];
  // ---- Stabilise: a rebel who would be lost survives in Critical Condition
  const pl=R.migrate({id:'pl1',name:'Pil One',role:'Pilot',level:2,xp:0,assign:'rest',bio:'x',morale:60});G().people.push(pl);
  f.setRng(()=>0.01);
  f.applyDebrief({kind:'space',missionId:'none',days:0,win:true,people:[{id:'pl1',xp:0,state:'shotdown'}],fighters:[]});
  f.setRng(()=>0.99);
  out.stab=[!!G().people.find(p=>p.id==='pl1'),R.hasCond(pl,'critical')];
  pl.cond=[];
  // ---- Repairs: a Mechanic's craft repairs at their rate, the others at the untended rate
  const mech=mk('Grease monkey who can rebuild a hauler drive.',{level:1});mech.assign='room:workshop';
  G().fighters.push(f.newFighter({id:'fa',name:'Alpha',cls:'cross',hull:40}),f.newFighter({id:'fb',name:'Beta',cls:'cross',hull:50}));
  G().materials=5000;
  f.advanceDay();
  const fa=G().fighters.find(x=>x.id==='fa'),fb=G().fighters.find(x=>x.id==='fb');
  out.repair=[fa.hull-40,fb.hull-50].join();
  // ---- the Intelligence Center needs an Intelligence Officer; Processing lifts Intel Sources
  G().intel=0;f.advanceDay();const i0=G().intel;
  const io=mk('Registry clerk who read everything.');io.assign='room:comms';
  G().intel=0;f.advanceDay();const i1=G().intel;
  out.intel=[i0,i1];
  // ---- the classroom: level 3, a niche of their specialty, they keep working
  d1.level=3;G().credits=5000;
  out.nicheNo=f.startNiche(d1.id,'analyst');
  out.niche=f.startNiche(d1.id,'physio');
  out.stillWorking=f.crewIn('infirmary').includes(d1);
  for(let i=0;i<4&&!d1.niche;i++)f.advanceDay();
  out.trained=d1.niche;
  // ---- forks: due at 7, chosen for good; a Rule is on when the Lead has reached it
  d1.level=11;
  out.due=SP.forkDue(d1);
  f.chooseFork(d1.id,7,'B');
  out.fork=[d1.forks[7],SP.forkDue(d1),f.on('physio.peak'),f.on('physio.scartissue')];
  out.jobs=f.jobsFor(d1).join();
  // a second Physio at a lower level is Staff; naming them Lead takes a day
  d2.niche='physio';d2.forks={};d2.level=4;d2.assign='room:infirmary';
  out.lead0=f.leadOf('physio').id===d1.id;
  f.setLead('physio',d2.id);
  out.leadSame=f.leadOf('physio').id===d1.id;
  f.advanceDay();
  out.leadNext=f.leadOf('physio').id===d2.id;
  out.peakOff=f.on('physio.peak');
  G().leads={};
  // Staff ride on the Lead's Jobs but a fork Job is the one who took it
  out.staffJobs=f.jobsFor(d2).join();
  // ---- a timed Job: Strength Programme
  const sol=R.migrate({id:'so1',name:'Sol One',role:'Soldier',level:2,xp:0,assign:'rest',bio:'x',morale:60});G().people.push(sol);
  const agi0=R.skill(sol,'agi');
  const j=f.startJob(d1.id,'physio.strength','so1','agi');
  out.jobStart=!!j;
  out.busy=f.startJob(d1.id,'physio.strength','so1','con');
  for(let i=0;i<20&&G().sjobs.some(x=>x.k==='physio.strength');i++)f.advanceDay();
  out.strength=[R.skill(sol,'agi')-agi0,sol.sbN,sol.peak];
  // ---- prosthetics: a Cyberneticist fits a basic limb (a small penalty); the fitting lasts the Job
  const cy=mk('Physician.',{level:3,niche:'cyberneticist'});cy.assign='room:infirmary';
  d2.assign='rest';
  sol.body={arm:1};
  const pj=f.startJob(cy.id,'cyberneticist.prosthetics','so1:arm',null);
  out.pros0=[!!pj,R.hasCond(sol,'surgery')];
  for(let i=0;i<8&&R.hasCond(sol,'surgery');i++)f.advanceDay();
  out.pros=[sol.body.arm,sol.pros&&sol.pros.arm,R.injFx(sol).aim];
  // ---- XP: working the room teaches; a Job teaches more
  const xs=mk('Union organiser.');xs.assign='room:diplo';
  const x0=xs.xp;f.advanceDay();out.xp=Math.round((xs.xp-x0)*1000)/1000;
  // ---- Outreach: each Diplomat runs a team
  out.dip=[f.canDip('veray')||'',typeof f.startDip];
  // ---- Smuggler: Haggler, Fence, Smuggling Runs, Special Order
  const sm=mk('Quartermaster. Counts every bolt twice.',{level:11,niche:'smuggler',forks:{7:'B'}});sm.assign='room:store';
  out.smug=[f.on('smuggler.haggler'),f.on('smuggler.fence')];
  f.ensureMarket();
  const lot=G().market.lots[0];out.haggle=f.lotPrice(lot)<lot.price;
  sm.forks={7:'A'};
  out.fence=f.sellPrice('akli')>0&&f.on('smuggler.fence');
  const so=f.startJob(sm.id,'smuggler.specialorder','ship');
  out.order=!!so;
  f.rollMarket();
  out.ordered=[G().market.lots.some(l=>l.kind==='ship'),G().sjobs.some(x=>x.k==='smuggler.specialorder')];
  // ---- Slicer's Data Tap: Intel every day until stopped
  const sl=mk('Lab tech.',{level:7,niche:'slicer',forks:{7:'A'}});sl.assign='room:techlab';
  const acc=G().planets.find(p=>p.access&&!p.base&&f.pst(p.id));
  const tgt=(window.DBGbase.fn.PLANETDEF_().find(d=>{const st=f.pst(d.id);return st&&st.access&&!d.base&&d.pop&&d.pop!=='—'&&d.pop!=='0';})||{}).id;
  out.tapT=!!tgt;
  if(tgt){
    const tj=f.startJob(sl.id,'slicer.datatap',tgt);
    G().intel=0;const r0=G().risk;f.advanceDay();out.tap=[!!tj,G().intel>=1,G().risk>r0];
    f.stopJob(tj.id);
  }
  // ---- Mission Control supports a mission; a Tactician brings the briefing and the free round with Battle Plan
  room('command',0,4);
  const mc=mk('Dispatcher with a gift for knowing where everybody is.',{level:15,niche:'tactician',forks:{7:'A',15:'A'}});mc.assign='room:command';
  const m={id:'tst',name:'Test Op',days:2,loc:tgt};
  const fx=f.supportStart(m,'ground',[{k:'slicer.prehack',pid:sl.id}]);
  out.fx=[fx.cool,fx.brief,fx.free,fx.scan,!!m.ctl,fx.prehack,!!fx.minimap];
  // ---- screens: the file, the room panel, the job window, the training window
  try{
    f.openWin('person',d1);out.file=/Physio unlocks/.test(document.getElementById('winCardB').innerText)&&/Department Head/.test(document.getElementById('winCardB').innerText);
    f.openWin('person',mk('Medic.',{level:3}));out.fileNiche=/Ready for the classroom/.test(document.getElementById('winCardB').innerText);
    f.openWin('sjob',{pid:cy.id,k:'cyberneticist.prosthetics'});out.jobWin=/Prosthetics/.test(document.getElementById('winCardB').innerText);
    f.openWin('spec');out.classroom=/Classroom/.test(document.getElementById('winCardB').innerText);
    f.closeWin();
    for(const k of ['infirmary','workshop','comms','store','training','techlab','diplo','command']){f.enterRoom(k);}
    f.enterRoom('infirmary');out.bar=/Doctors at work/.test(document.getElementById('roomViewBar').innerText)&&/Jobs/.test(document.getElementById('roomViewBar').innerText);
    f.exitRoomView();
  }catch(e){out.uiErr=e.message;}
  // ---- an old save: posts become rooms
  const old=JSON.parse(JSON.stringify(G()));
  old.v=4;old.people.push({id:'oldq',name:'Old Quill',role:'Support',level:2,xp:0,assign:'station:store',bio:'Somebody.',morale:60});
  old.people.push({id:'oldg',name:'Old Gar',role:'Support',level:1,xp:0,assign:'station:barracks',bio:'Physician.',morale:60});
  delete old.sjobs;delete old.leads;
  const keep=D.G;D.G=old;f.upgradeSave();
  const oq=old.people.find(p=>p.id==='oldq'),og=old.people.find(p=>p.id==='oldg');
  out.migr=[old.v,oq.sspec,oq.assign,og.sspec,og.assign,Array.isArray(old.sjobs)];
  D.G=keep;
  return out;
 });
 ok(r.data.join()==='8,23,161,true,true','the data: 8 specialties, 23 niches, their unlocks at 3/7/11/15/19 with two forks '+r.data);
 ok(r.guess==='doctor,intel,mechanic,support_technician,logistics,academic,diplomat,control','base specialty from the origin line '+r.guess);
 ok(r.cap.join()==='3,2,0','rooms hold 2, +1 per extra tile '+r.cap);
 ok(r.head,'Department Head is the highest level');
 ok(r.treated===4,'two patients per Doctor '+r.treated);
 ok(/^1\.6\d*,1\.6\d*,1\.5\d*,1\.5\d*,1$/.test(r.rates),'treated patients heal faster, the fifth at the untreated rate '+r.rates);
 ok(r.critHeld&&r.critHeals,'Critical Condition only heals under Treatment '+[r.critHeld,r.critHeals]);
 ok(r.stab.join()==='true,true','Stabilise: lost becomes Critical Condition '+r.stab);
 ok(r.repair==='15,8','Repairs: the Mechanic\'s craft at 15%, the other at 8% '+r.repair);
 ok(r.intel[0]===0&&r.intel[1]>=1,'the Intelligence Center needs an officer '+r.intel);
 ok(r.nicheNo===false&&r.niche===true&&r.stillWorking&&r.trained==='physio','classroom: own niches only, they keep working, done in days '+[r.nicheNo,r.niche,r.stillWorking,r.trained]);
 ok(r.due===7&&r.fork.join()==='B,,true,false','fork at 7, Rules follow the Lead\'s level and forks '+[r.due,r.fork]);
 ok(/physio\.strength/.test(r.jobs)&&!/conditioning/.test(r.jobs),'fork Jobs: only the chosen one '+r.jobs);
 ok(r.lead0&&r.leadSame&&r.leadNext&&r.peakOff===false,'a named Lead takes over the next day, and their level sets the Rules '+[r.lead0,r.leadSame,r.leadNext,r.peakOff]);
 ok(r.staffJobs==='physio.strength','Staff run the Lead\'s Jobs, the Lead\'s fork Jobs included (doc: Job forks combine) '+r.staffJobs);
 ok(r.jobStart&&r.busy===false&&r.strength.join()==='3,1,1','Strength Programme: one Job at a time, +3 Agility, Peak Condition '+[r.jobStart,r.busy,r.strength]);
 ok(r.pros0.join()==='true,true'&&r.pros.join()==='2,basic,-1','Prosthetics: laid up for the Job, a basic arm at -1 aim '+[r.pros0,r.pros]);
 ok(r.xp>0,'working the room teaches '+r.xp);
 ok(r.smug.join()==='true,false'&&r.haggle&&r.fence,'Smuggler: Haggler and Fence follow the fork '+[r.smug,r.haggle,r.fence]);
 ok(r.order&&r.ordered.join()==='true,false','Special Order: a ship on the next restock, then done '+[r.order,r.ordered]);
 ok(!r.tapT||(r.tap&&r.tap.join()==='true,true,true'),'Data Tap: Intel and exposure every day '+r.tap);
 ok(r.fx.join()==='10,2,1,1,true,1,false','Mission Control: Cool, the briefing, Battle Plan, Overwatch scan, a Pre-hack '+r.fx);
 ok(!r.uiErr&&r.file&&r.fileNiche&&r.jobWin&&r.classroom&&r.bar,'screens: file, classroom, job window, room panel '+JSON.stringify([r.uiErr,r.file,r.fileNiche,r.jobWin,r.classroom,r.bar]));
 ok(r.migr.join()==='6,logistics,room:store,doctor,rest,true','old save: a post becomes its room, the Barracks post is gone '+r.migr);

 // ---- the ground scene: the base's support reaches the fight
 const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,spec:'fieldtech',wpns:['akli','cowboy']},{id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']}];
 await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),{kind:'ground',missionId:'intel',scenario:'intel',days:1,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},
   sup:{cool:10,brief:2,free:1,scan:1,hack1:1,mapAll:1,noReinf:1,ironcon:1,minimap:1}});
 await pg.waitForTimeout(700);
 const g=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,out={};
  out.scan=f.fsItems().some(i=>i.key==='scan');
  out.fog=f.fogOn();
  out.hack=gd.WORK.filter(w=>w.needSpec==='fieldtech').map(w=>w.rounds).join();
  out.brief=/opposition at the start/.test(document.getElementById('gHint').innerHTML);
  const n0=gd.U.length;f.spawnFoes([{type:'patrolman',x:100,y:100}]);out.noReinf=gd.U.length===n0;
  f.startPlanning();out.holds=f.lawHolds();
  const dax=gd.U.find(u=>u.id==='dax');const hp0=dax.hp;f.woundUnit(null,dax,dax.hp+50,false,'ballistic','akli');out.iron=[dax.hp,dax.ironUsed,hp0>1];
  return out;
 });
 ok(g.scan&&g.fog===false&&g.hack==='1'&&g.brief&&g.noReinf&&g.holds&&g.iron[0]===1,'ground: scan, Map Theft, one-round hacks, the briefing, Blackout, a free round, Iron Constitution '+JSON.stringify(g));

 // ---- the space scene: tuning, frames, pre-flight
 await pg.evaluate(()=>{window.SR.go('space',{test:true,mission:{kind:'space',missionId:'x',days:0,flight:[
   {pilotId:'sera',name:'Sera Kest',first:'Sera',level:3,aim:3,cool:72,tr:[],cls:'cross',fighterId:'f1',fighterName:'Dustfall',hull:100,tune:{evade:1,spd:1},shield:5},
   {pilotId:'joss',name:'Joss Marrek',first:'Joss',level:4,aim:4,cool:76,tr:[],cls:'graf',fighterId:'f2',fighterName:'Marta',hull:100,frame:15}]}});});
 await pg.waitForTimeout(400);
 const s=await pg.evaluate(()=>{
  const D=window.DBGspace,F=D.fn,a=D.ships.find(x=>x.id==='P1'),m=D.ships.find(x=>x.id==='P2'),foe=D.ships.find(x=>x.faction==='heg');
  return {spd:F.maxSpeedOf(a)-D.CLS.cross.maxSpd,shd:a.segs.F.max-D.CLS.cross.shdF,hull:m.maxHull-D.CLS.graf.hull,tn:F.computeTN(foe,a).entries.some(e=>e[0]==='TUNED')};
 });
 ok(s.spd===1&&s.shd===5&&s.hull===15&&s.tn,'space: tuned speed and evasion, pre-flight shield, heavy frame '+JSON.stringify(s));
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 await b.close();
 if(fails.length){console.log('support-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('support-smoke: all checks passed');
})();
