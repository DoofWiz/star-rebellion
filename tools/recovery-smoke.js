/* One recovery model (DESIGN_BLOCKERS C-20): node tools/recovery-smoke.js (needs NODE_PATH=$(npm root -g)).
   Being laid up is a medical condition like any other: it heals at the same rate (healRate), keeps the rebel off
   duty while it lasts, and ends with what the old days-off counter did (back on their feet, Scarred after a long
   one, Nearly Dead after a spinal injury or an amputation, the prosthetic fitted after surgery). */
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
  const D=window.DBGbase,f=D.fn,G=()=>D.G,R=window.Rebel,out={};
  const mk=(id,role,extra)=>{const p=R.migrate(Object.assign({id,name:id+' Test',role,level:2,xp:0,assign:'rest',bio:'x',charTrait:'brave'},extra||{}));G().people.push(p);return p;};
  const days=p=>(p.cond||[]).map(c=>c.k+':'+Math.round(c.days*100)/100).join('+')||'-';
  // an old save's days-off counter becomes a condition, and the old fields go
  const o1=mk('o1','Soldier',{injured:4}),o2=mk('o2','Soldier',{injured:7,critHeal:1,injDur:7}),o3=mk('o3','Soldier',{injured:3,prosPending:'arm',body:{arm:1}});
  out.mig=[days(o1),days(o2),days(o3),o3.cond[0].part,o2.cond[0].days0,['injured','injDur','critHeal','prosPending'].some(k=>k in o1||k in o2||k in o3)].join(' ');
  // laid up means off duty
  const fit=mk('fit','Soldier');
  out.duty=[f.soldierPool().includes(o1),f.soldierPool().includes(fit)].join();
  o1.assign='station:barracks';out.staff=f.staffOf('barracks').includes(o1);o1.assign='rest';
  // one rate for everything: no Infirmary is 0.25 a day; a Garrison Officer adds 1 for ground fighters only
  const sup=mk('sup','Support');R.layUp(sup,'downed',3);
  out.rate0=[f.healRate(o1),f.healRate(sup)].join();
  const off=mk('off','Support',{assign:'station:barracks'});
  out.rateG=[f.healRate(o1),f.healRate(sup)].join();
  G().people=G().people.filter(p=>p!==off);
  // a laid-up condition and an ordinary one heal side by side at the same rate
  const two=mk('two','Soldier');R.layUp(two,'downed',3);R.addCond(two,'concussed',0);const before=days(two);f.advanceDay();
  out.side=[before,days(two)].join(' -> ');
  out.tag=f.outDays(two);
  // the endings: back on their feet + Scarred after a long one; Nearly Dead after a spinal injury; the prosthetic after surgery
  G().rooms.push({id:'rm_inf',key:'infirmary',r:1,c:1,w:1,h:1,up:['surgery']});
  const sc=mk('sc','Soldier');R.layUp(sc,'downed',6);
  const sp=mk('sp','Soldier');f.applyInjuries(sp,[{k:'spinal',treated:true}],true);
  const pr=mk('pr','Soldier',{body:{leg:1}});G().credits=5000;G().materials=900;f.startProsthetic('pr','leg');
  for(let i=0;i<12;i++)f.advanceDay();
  out.ends=[R.laidUp(sc),R.expHas(sc,'scarred'),R.laidUp(sp),R.expHas(sp,'nearlydead'),pr.body.leg,R.expHas(pr,'scarred'),R.laidUp(pr)].join();
  // the debrief lays a stretcher case up for the mission's days, at the rate of the day
  const st=mk('st','Soldier');
  const m={id:'rtest',name:'Recovery test',desc:'Test.',objectives:['Test'],req:{transport:true,team:1},days:0,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{}};
  G().missions.push(m);
  f.applyDebrief({missionId:'rtest',kind:'ground',days:0,win:true,people:[{id:'st',xp:0.1,state:'injured',dur:4}]});
  out.stretcher=[days(st),st.injuries,G().news.some(n=>/st Test<\/b> came back on a stretcher/.test(n.html))].join();
  return out;
 });
 ok(r.mig==='downed:4 spinal:7 surgery:3 arm 7 false','old saves: injured becomes a laid-up condition (spinal for a critical, surgery with its part) '+r.mig);
 ok(r.duty==='false,true'&&r.staff===false,'laid up means no missions and no posts '+r.duty+' '+r.staff);
 ok(r.rate0==='0.25,0.25'&&r.rateG==='1.25,0.25','one rate: 0.25 without an Infirmary; the Garrison Officer speeds ground fighters only '+r.rate0+' / '+r.rateG);
 ok(r.side==='downed:3+concussed:5 -> downed:2.75+concussed:4.75','laid up and a lingering condition heal at the same rate '+r.side);
 ok(r.tag===11,'the Injured tag counts days at today’s rate '+r.tag);
 ok(r.ends==='0,true,0,true,2,false,0','back on their feet, Scarred after a long one, Nearly Dead after a spinal injury, the prosthetic after surgery '+r.ends);
 ok(/^downed:4,1,true$/.test(r.stretcher),'a stretcher case is laid up for the mission’s days '+r.stretcher);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'recovery-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
