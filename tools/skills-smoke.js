/* Smoke test for rebel skills: node tools/skills-smoke.js (needs NODE_PATH=$(npm root -g)).
   Checks the curves against the old level formulas, the 50 cap, which roles have which skills, how combat
   profiles are built, and how mission experience feeds back. */
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
  const R=window.Rebel,D=window.DBGbase,G=D.G,f=D.fn,out={};
  const mk=(role,level,sx)=>({id:'x',name:'X Y',role,level,xp:0,sx:sx||{}});
  // parity with the old level formulas where they were in range (soldier aim 2+floor(L/3), pilot 1+ceil(L/2), both capped at 5)
  const oldS=L=>Math.min(5,2+Math.floor(L/3)),oldP=L=>Math.min(5,1+Math.ceil(L/2));
  out.sDiff=[];out.pDiff=[];
  for(let L=1;L<=9;L++){out.sDiff.push(R.aimOf(mk('Soldier',L),'g')-oldS(L));out.pDiff.push(R.aimOf(mk('Pilot',L),'s')-oldP(L));}
  out.top=[R.aimOf(mk('Soldier',20,{aim:15}),'g'),R.aimOf(mk('Pilot',20,{aim:15}),'s')];
  // caps
  out.cap=R.skill(mk('Soldier',20,{aim:15}),'aim');
  out.capOver=R.skill(mk('Soldier',20,{aim:99}),'aim');
  // role skill sets
  out.sets=['Soldier','Marine','Pilot','Support','Hero'].map(r=>[r,R.skillKeys(mk(r,1)).join(',')]);
  out.supportAim=R.skill(mk('Support',20,{aim:10}),'aim');
  // profile values
  const s1=mk('Soldier',1),s20=mk('Soldier',20,{con:15,agi:15,pre:15});
  out.hp=[R.hpOf(s1),R.hpOf(s20)];
  out.move=[R.moveMul(s1),R.moveMul(s20)];
  out.cool=[R.coolOf(s1,'g'),R.coolOf(s20,'g'),R.coolOf(mk('Pilot',1),'s'),R.coolOf(mk('Pilot',20,{pre:15}),'s')];
  out.nerve=[R.nerveMul(s1),R.nerveMul(s20)];
  const p1=mk('Pilot',1),p20=mk('Pilot',20,{foc:15,cun:15});
  out.foc=[R.focusTN(p1),R.focusTN(p20)];out.cun=[R.cunMul(p1),R.cunMul(p20)];
  // training: capped per mission and in total, only for skills the role has
  const t=mk('Soldier',1);R.trainSkills(t,{aim:500,cun:50,pre:4});
  out.train=[t.sx.aim,t.sx.cun,t.sx.pre];
  for(let i=0;i<40;i++)R.trainSkills(t,{aim:500});
  out.trainCap=t.sx.aim;
  // squad entry carries the profile into the combat scene
  const dax=G.people.find(p=>p.id==='dax');
  dax.level=12;dax.sx={con:8,agi:8,pre:8};
  const e=f.squadEntry(dax,false);
  out.entry={hp:e.hp,agi:e.agi,nv:e.nv,cool:e.cool,aim:e.aim};
  // debrief feeds skills back
  const before=JSON.stringify(dax.sx);
  f.applyDebrief({missionId:'haven',win:true,people:[{id:'dax',xp:0.1,state:'ok',sk:{aim:20,con:10,agi:6,pre:4}}]});
  out.after=[before,JSON.stringify(dax.sx)];
  return out;
 });
 ok(r.sDiff.every(d=>Math.abs(d)<=0),'soldier aim parity vs old curve: '+r.sDiff);
 ok(r.pDiff.every(d=>Math.abs(d)<=1),'pilot aim within 1 of old curve: '+r.pDiff);
 ok(r.top[0]===6&&r.top[1]===6,'aim caps at 6: '+r.top);
 ok(r.cap===50&&r.capOver===50,'skills cap at 50: '+r.cap+','+r.capOver);
 ok(JSON.stringify(r.sets)==='[["Soldier","aim,con,agi,pre"],["Marine","aim,con,agi,pre"],["Pilot","aim,cun,foc,pre"],["Support",""],["Hero","aim,con,agi,cun,foc,pre"]]','skill sets '+JSON.stringify(r.sets));
 ok(r.supportAim===0,'support has no skills');
 ok(r.hp[0]===100&&r.hp[1]>=125&&r.hp[1]<=160,'hp '+r.hp);
 ok(r.move[0]===1&&r.move[1]>1.05&&r.move[1]<1.2,'move '+r.move);
 ok(r.cool[0]===65&&r.cool[1]>65&&r.cool[1]<=85&&r.cool[2]===59&&r.cool[3]<=85&&r.cool[3]>r.cool[2],'cool '+r.cool);
 ok(r.nerve[0]===1&&r.nerve[1]<0.9&&r.nerve[1]>0.7,'nerve '+r.nerve);
 ok(r.foc[0]===0&&r.foc[1]>=2&&r.foc[1]<=4,'focus '+r.foc);
 ok(r.cun[0]===1&&r.cun[1]>1.2&&r.cun[1]<1.5,'cunning '+r.cun);
 ok(r.train[0]===1.5&&r.train[1]===undefined&&r.train[2]===0.2,'training per mission '+r.train);
 ok(r.trainCap===15,'training total cap '+r.trainCap);
 ok(r.entry.hp>100&&r.entry.agi>1&&r.entry.nv<1&&r.entry.cool>65&&r.entry.aim>=4,'squad entry '+JSON.stringify(r.entry));
 ok(r.after[0]!==r.after[1],'debrief trains skills '+r.after);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'skills-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
