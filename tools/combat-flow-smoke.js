/* Combat flow fixes (designer notes of 2026-10-07): a stun wears off after a round, Leave gun and Pack up gun,
   Treat wound picks a patient and marks them, and the per-round check that drops out of combat once contact is lost.
   node tools/combat-flow-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy'],back:'razorrat'},
             {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
             {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['longiron','cowboy']}];
const spec=(sc,extra)=>Object.assign({kind:'ground',missionId:sc,scenario:sc,days:2,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'}},extra||{});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),spec('intel',{ctx:{variant:'dataflats'}}));
 await pg.waitForTimeout(700);

 // ---- 5. a stun wears off after a round; the concussion stays
 const st=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const kel=U.find(u=>u.id==='kel');
  f.inflictInjury(kel,'ballistic','concussion');
  out.on=f.stunned(kel);
  f.stunTick();out.sameRound=f.stunned(kel);      // landed this round: it holds through the next one
  const i=kel.inj.find(x=>x.k==='concussion');i.stunTo=gd.round;   // ... which has now ended
  f.stunTick();out.off=[f.stunned(kel),i.treated].join();
  out.card=f.ordersFor(kel).join('').indexOf('data-ract="move"')>=0;
  out.result=JSON.stringify((f.buildResult(true).people.find(p=>p.id==='kel')||{}).inj||null);
  kel.inj=[];kel.wound=0;
  return out;
 });
 ok(st.on&&st.sameRound,'a concussion stuns, through the round after it lands '+[st.on,st.sameRound]);
 ok(st.off==='false,false','the stun wears off when that round ends; the injury is still untreated '+st.off);
 ok(st.card,'once it wears off they get their orders back');
 ok(st.result==='[{"k":"concussion","treated":false}]','the concussion still goes home to heal '+st.result);

 // ---- 2. the Razorrat: leave it (back to their own guns) or pack it up (back on their back)
 const lmg=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const dax=U.find(u=>u.id==='dax'),runa=U.find(u=>u.id==='runa');
  f.doDeploy(dax);dax.wkey='razorrat';
  const cards=f.ordersFor(dax).join('');
  out.cards=['leave','pack'].map(k=>cards.indexOf('data-ract="'+k+'"')>=0).join();
  f.unmanTurret(dax);
  out.left=[dax.manning,f.turretOn(),f.artPose(dax,0).weapon,dax.back].join();
  // someone beside the gun with an empty back can pack it up; so can the gunner
  runa.x=gd.TURRET.x+30;runa.y=gd.TURRET.y;
  out.runaCan=f.canPack(runa);
  f.manTurret(dax);
  out.gunner=f.canPack(dax);
  out.pack=[f.packTurret(dax),dax.manning,f.turretOn(),dax.back,f.artPose(dax,0).weapon,f.canDeploy(dax)].join();
  // the pad's sandbagged gun stays where it is
  return out;
 });
 ok(lmg.cards==='true,true','on the gun: Leave gun and Pack up gun side by side '+lmg.cards);
 ok(lmg.left==='0,true,akli,','Leave gun: the gun stays up, they hold their own weapon, not the LMG '+lmg.left);
 ok(lmg.runaCan,'a rebel beside an unmanned field gun can pack it up');
 ok(lmg.gunner,'the gunner can pack it up');
 ok(lmg.pack==='true,0,false,razorrat,akli,true','Pack up gun: the gun comes down, goes on their back, and can be set up again '+lmg.pack);

 // ---- 4. Treat wound: the patient is picked, marked, and the result shows
 const tr=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const [dax,runa,kel]=['dax','runa','kel'].map(id=>U.find(u=>u.id===id));
  for(const u of [dax,runa,kel]){u.inj=[];u.wound=0;u.meds=3;u.down=0;}
  f.setPhase('PLANNING');
  runa.x=dax.x+40;runa.y=dax.y;kel.x=dax.x-40;kel.y=dax.y;
  f.inflictInjury(runa,'ballistic','burns');f.inflictInjury(kel,'ballistic','eye');
  out.cands=f.treatCands(dax).map(u=>u.id).sort().join();
  gd.selId=dax.id;f.orderAct('treat');
  out.pick=[gd.pickMode,!dax.order].join();   // two patients: tap the one to treat
  dax.order={type:'treat',tid:kel.id};gd.selId=null;f.orderAct('cancel');
  out.tag=f.statusTag(dax);
  out.target=(f.treatPick(dax,kel.id)||{}).id;
  const jfx0=f.juice_().jfx.length;
  f.doTreat(dax);
  out.done=[kel.inj[0].treated,runa.inj[0].treated,f.juice_().jfx.length>jfx0].join();
  // one patient left: the order goes straight to them
  dax.order=null;gd.selId=dax.id;f.orderAct('treat');
  out.single=[dax.order&&dax.order.type,dax.order&&dax.order.tid].join();
  return out;
 });
 ok(tr.cands==='kel,runa','both wounded rebels in reach are patients '+tr.cands);
 ok(tr.pick==='treat,true','with two patients, Treat wound asks which one '+tr.pick);
 ok(/Treat Kel/.test(tr.tag),'the order tag names the patient '+tr.tag);
 ok(tr.target==='kel','the picked patient is treated, not the most urgent '+tr.target);
 ok(tr.done==='true,false,true','Kel is treated, Runa is not, and a pulse marks it '+tr.done);
 ok(tr.single==='treat,runa','with one patient the order goes straight to them '+tr.single);

 // ---- 3. still in combat? Contact lost for two quiet rounds and time runs free; contact again and it is rounds
 const ct=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const reb=U.filter(u=>u.side==='reb'&&!u.down&&!u.extracted&&!u.away);
  for(const u of reb){u.inj=[];u.wound=0;}
  f.alertTown('test');
  const foes=U.filter(u=>u.side==='law'&&!u.down&&!u.surr);
  // everyone on our side in one corner, every hostile far away in the other
  const r0=reb[0];
  for(const u of foes){u.x=r0.x+(r0.x<1200?3000:-3000);u.y=r0.y;u.fixed=1;}
  out.contact0=f.inContact();
  out.hot=f.stillFighting(true);
  out.q1=[f.stillFighting(false),gd.quietRounds].join();
  out.q2=f.stillFighting(false);
  // the real thing: two quiet rounds through endRound
  f.setPhase('PLANNING');
  f.endRound();out.after1=gd.phase;
  f.endRound();out.after2=[gd.phase,gd.town].join();
  // a hostile comes into view: rounds again
  foes[0].x=r0.x+120;foes[0].y=r0.y;
  out.contact1=f.inContact();
  out.back=[f.contactCheck(),gd.phase].join();
  return out;
 });
 ok(ct.contact0===false,'hostiles far off and out of sight are not in contact');
 ok(ct.hot===true,'a round with shots fired is still a fight');
 ok(ct.q1==='true,1','one quiet round: still in rounds, and counted '+ct.q1);
 ok(ct.q2===false,'two quiet rounds: the fight is off');
 ok(ct.after1==='PLANNING'&&ct.after2==='FREE,alerted','endRound drops into free time after two quiet rounds, the alarm still up '+[ct.after1,ct.after2]);
 ok(ct.contact1&&ct.back==='true,PLANNING','a hostile in sight drops it back into rounds '+[ct.contact1,ct.back]);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 await b.close();
 if(fails.length){console.log('combat-flow-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('combat-flow-smoke: all checks passed');
})();
