/* Space pilots carry the rebels' own traits (rebel.js): node tools/space-traits-smoke.js (needs NODE_PATH=$(npm root -g)).
   Each trait does what its description says, in space as on the ground; ranks come from the rebel ladder, or for
   Hegemony pilots from their database row. Nothing in space.js keys a rule on a trait's display name any more. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await (await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1000);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 // the sim: the scripted cast against Vex and his cadets, all from database rows
 await pg.evaluate(()=>{window.SR.mission=null;window.SR.go('space',{test:true,mission:null});});
 await pg.waitForTimeout(400);
 const r=await pg.evaluate(()=>{
  const D=window.DBGspace,F=D.fn,S=id=>D.ships.find(s=>s.id===id),out={};
  const sera=S('P1'),joss=S('P2'),petra=S('P3'),vex=S('E1'),cad=S('E2');
  const tr=s=>s.pilot.tr.map(t=>t.k+(t.with?':'+t.with:'')).join('+')||'-';
  out.tr=[tr(sera),tr(joss),tr(petra),tr(vex),tr(cad)].join(' ');
  out.rank=[sera.pilot.rankName,vex.pilot.rankName,cad.pilot.rankName].join('/');
  out.nv=[vex.pilot.nv,cad.pilot.nv].join();
  out.cap=cad.pilot.coolCap;
  // Veteran: +1 accuracy, no longer +1 initiative
  out.vetAtk=F.computeATK(vex,sera,vex.wpns[0].key).entries.some(e=>e[0]==='VETERAN');
  out.init=[vex.pilot.init,F.effInit(vex)].join();
  // Steady Hands and Former Pilot, given to a pilot for the test
  joss.pilot.tr=[{k:'steady'},{k:'pilot'}];
  out.atk=F.computeATK(joss,cad,joss.wpns[0].key).entries.map(e=>e[0]).filter(n=>n==='STEADY HANDS'||n==='FORMER PILOT').join();
  // Brave halves a loss of nerve, Cowardly adds half again (one rule with the ground scene)
  joss.pilot.tr=[{k:'brave'}];joss.pilot.cool=60;F.adjCool(joss,-20,'test');const brave=60-joss.pilot.cool;
  joss.pilot.tr=[{k:'cowardly'}];joss.pilot.cool=60;F.adjCool(joss,-20,'test');const coward=60-joss.pilot.cool;
  joss.pilot.tr=[];joss.pilot.cool=60;F.adjCool(joss,-20,'test');const plain=60-joss.pilot.cool;
  out.nerve=[plain,brave,coward].join();
  // the cadets' nerve never rises above the roster cap
  cad.pilot.cool=55;F.adjCool(cad,30,'test');out.capped=cad.pilot.cool;
  // Lucky: 5% to survive a killing blow; Unlucky: 5% more criticals
  F.setRng(()=>0.01);sera.hull=-3;out.lucky=[F.luckySave(sera),sera.hull].join();
  F.setRng(()=>0.5);sera.hull=-3;out.luckyMiss=[F.luckySave(sera),sera.hull].join();
  joss.hull=-3;F.setRng(()=>0.01);out.notLucky=F.luckySave(joss);sera.hull=10;joss.hull=10;
  const w={crit:0.1};cad.pilot.tr=[{k:'unlucky'}];
  out.crit=[F.critChance(w,{},vex),Math.round(F.critChance(w,{},cad)*100)/100].join();cad.pilot.tr=[];
  F.setRng(Math.random);
  // the dossier speaks the rebels' traits, with the partner's name
  out.dz=[F.starfighterHTML(petra).indexOf('Friends with Joss')>=0,F.starfighterHTML(vex).indexOf('Commandant')>=0,F.starfighterHTML(sera).indexOf('Lucky')>=0].join();
  // Friends: Petra panics for good when Joss goes down; the lead's fall shakes the cadets
  petra.pilot.cool=70;F.destroyShip(joss,null);out.friend=[petra.pilot.friendLock,petra.pilot.cool<=20].join();
  const c0=cad.pilot.cool;F.destroyShip(vex,sera);out.lead=c0-cad.pilot.cool;
  return out;
 });
 ok(r.tr==='lucky reckless friends:joss-marrek veteran -','the cast fly with rebel trait keys '+r.tr);
 ok(r.rank==='Airman/Commandant/Cadet','ranks: the rebel ladder, or the Hegemony title on the row '+r.rank);
 ok(r.nv==='0.88,1'&&r.cap===60,'Veteran steadies nerve (x0.88); cadets cap at 60 '+r.nv+' '+r.cap);
 ok(r.vetAtk&&r.init==='3,4','Veteran is +1 accuracy, not initiative (Vex: initiative 3, +1 only for keeping his cool) '+r.vetAtk+' '+r.init);
 ok(r.atk==='STEADY HANDS,FORMER PILOT','Steady Hands and Former Pilot add accuracy '+r.atk);
 ok(r.nerve==='20,10,30','Brave halves and Cowardly raises a loss of nerve '+r.nerve);
 ok(r.capped===60,'the nerve cap holds '+r.capped);
 ok(r.lucky==='true,1'&&r.luckyMiss==='false,-3'&&r.notLucky===false,'Lucky can walk away from a killing blow '+r.lucky+' '+r.luckyMiss);
 ok(r.crit==='0.1,0.15','Unlucky takes 5% more criticals '+r.crit);
 ok(r.dz==='true,true,true','the dossier shows rebel trait cards and the rank '+r.dz);
 ok(r.friend==='true,true','a friend panics for good when their partner goes down '+r.friend);
 ok(r.lead>=40,'the cadets lose their nerve when the commandant falls '+r.lead);

 // campaign pilots: only the traits that act in space reach the scene, pair traits with their partner
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(500);
 const c=await pg.evaluate(()=>{
  const R=window.Rebel;
  const p=R.migrate({id:'px',name:'Pia Test',role:'Pilot',level:3,xp:0,charTrait:'steady',traits:[{k:'veteran'},{k:'friends',with:'joss'},{k:'panicky'}]});
  return R.traitsFor(p,'s').map(t=>t.k+(t.with?':'+t.with:'')).join('+');
 });
 ok(c==='steady+veteran+friends:joss','a campaign pilot carries steady, veteran and their friend into space, not ground-only traits '+c);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'space-traits-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
