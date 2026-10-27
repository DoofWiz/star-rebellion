/* Cover by the line of the shot, the AI's cover, quicker enemy shots and the deployed Razorrat (designer notes of
   2026-10-07, round 2), and the AI holding only from cover (FEEDBACK-0.2 §1.3: the cover metric on the ambush map).
   node tools/cover-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
 await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),spec('stealcross'));
 await pg.waitForTimeout(800);

 const r=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const dax=U.find(u=>u.id==='dax'),runa=U.find(u=>u.id==='runa'),kel=U.find(u=>u.id==='kel');
  const foes=U.filter(u=>u.side==='law'&&!u.veh&&!u.mnt&&!u.office&&!u.fixed&&!u.elev&&f.wpnsOf(u).length);
  const law=foes[0],law2=foes[1];
  // park everyone else far away, so only the units under test matter
  for(const u of U)if(u!==dax&&u!==runa&&u!==kel&&u!==law&&u!==law2){u.x=60;u.y=60;u.down=1;}
  const labs=(s,t)=>f.computeTN(s,t).entries.map(e=>e[0]);
  // ---- a crate: cover only when the shot's line goes through it
  const crate=gd.PROPS.find(p=>p.kind==='crate'&&!p.dead);
  const R=19;
  law.x=crate.x+R+14;law.y=crate.y;law.elev=0;law.bunkered=0;   // hugging the crate's east side
  dax.x=crate.x-300;dax.y=crate.y;dax.elev=0;                  // west: the crate is in the way
  out.front=labs(dax,law).join('|');
  dax.x=law.x;dax.y=law.y-300;                                  // north of the target: a flanking shot
  out.side=labs(dax,law).join('|');
  dax.x=law.x+300;dax.y=law.y;                                  // from behind
  out.behind=labs(dax,law).join('|');
  // Take cover adds a little, only where the cover is in the way
  law.bunkered=1;
  dax.x=crate.x-300;dax.y=crate.y;
  const tnF=f.computeTN(dax,law);out.take=tnF.entries.filter(e=>/TAKING COVER/.test(e[0])).map(e=>e[1]).join();
  dax.x=law.x;dax.y=law.y-300;out.takeFlanked=labs(dax,law).some(l=>/TAKING COVER/.test(l));
  law.bunkered=0;
  // ...and they still get their shot that round
  kel.x=law.x-200;kel.y=law.y;kel.down=0;kel.order={type:'cover'};kel.bunkered=1;kel.sprinted=0;
  f.setPhase('EXEC');f.buildEngage();
  out.coverShoots=!!(gd.engageQ&&gd.engageQ.list.includes(kel));
  gd.engageQ=null;kel.order=null;kel.bunkered=0;f.setPhase('PLANNING');
  // ---- a building: cover hugging its wall, from round its corner; none from along the wall
  const B=gd.BLDGS[0];
  const t={x:B.x+B.w+14,y:B.y+B.h-8,elev:0};                  // against the east wall, by the south-east corner
  out.corner=!!f.coverOf({x:B.x+B.w-60,y:B.y+B.h+220},t);       // south, round the corner
  out.along=!!f.coverOf({x:B.x+B.w+14,y:B.y+B.h+260},t);        // straight down the wall
  out.open=!!f.coverOf({x:B.x+B.w+300,y:B.y+B.h-8},t);          // out in the open to the east
  // ---- the AI: behind cover from its target, never at the target's own crate, and not on top of each other
  runa.x=crate.x-R-16;runa.y=crate.y;                           // a rebel hugging the crate's west side
  law.x=crate.x+400;law.y=crate.y+40;law2.x=crate.x+420;law2.y=crate.y-30;
  const p1=f.pickCoverMove(law,runa,320,true),p2=f.pickCoverMove(law2,runa,320,true);
  const near=(p,o)=>p&&Math.hypot(p.x-o.x,p.y-o.y);
  out.ai=[!!p1,!!p2,near(p1,runa)>=120,near(p2,runa)>=120,!p1||!p2||near(p1,p2)>=30].join();
  // ---- the deployed Razorrat: Automatic at -2, not -5
  const atk=e=>e.entries.filter(x=>/AUTOMATIC/.test(x[0])).map(x=>x[0]+':'+x[1]).join();
  dax.manning=1;out.lmg=atk(f.computeATK(dax,law,'razorrat',false));dax.manning=0;
  f.setMode(runa,'akli','auto');out.akli=atk(f.computeATK(runa,law,'akli',false));
  // ---- enemy shots open straight on the result; a rebel's turn selects them
  law.x=kel.x+200;law.y=kel.y;law.down=0;law.surr=0;
  out.shot=[f.validShot(law,kel,f.wpnsOf(law)[0]),f.wpnsOf(law).join()].join();
  f.setPhase('ENGAGE');
  gd.engageQ={list:[law,kel],idx:0,cur:null,nextAt:0};
  const t0=performance.now();
  f.attackUpdate(t0+10);
  const c=gd.engageQ&&gd.engageQ.cur;
  const st0=c&&c.stage;
  if(c&&c.stage==='aim')f.attackUpdate(t0+10+800);   // waiting for the camera to frame them: it fires within 0.7 s
  out.fast=c?[c.s===law,st0==='aim'||st0==='fire',c.stage,!!c.fast,c.reveal===c.tn.entries.length,c.roll>0].join():'none '+out.shot;
  // once its last round has landed, the result holds a second before the next shooter goes
  if(c){
   const fa=c.stageAt,hold=Math.max(c.applyAt||420,c.lastAt||0);
   f.attackUpdate(fa+hold+900);out.hold=gd.engageQ&&gd.engageQ.cur===c;
   f.attackUpdate(fa+hold+1100);out.next=!(gd.engageQ&&gd.engageQ.cur===c);
  }
  gd.engageQ.cur=null;gd.engageQ.nextAt=0;gd.engageQ.idx=1;
  law.x=kel.x+200;law.y=kel.y;
  f.attackUpdate(performance.now()+20);
  const c2=gd.engageQ&&gd.engageQ.cur;
  out.mine=c2?[c2.s===kel,gd.selId===kel.id,c2.stage].join():'none';
  gd.engageQ=null;f.setPhase('PLANNING');
  return out;
 });
 ok(/CARGO CRATES COVER/.test(r.front)&&!/FLANKED/.test(r.front),'a crate in the line of the shot is cover '+r.front);
 ok(!/COVER/.test(r.side)&&!/FLANKED/.test(r.side),'a shot from the side misses the crate: flanked, no cover and no extra penalty '+r.side);
 ok(!/COVER/.test(r.behind)&&!/FLANKED/.test(r.behind),'a shot from behind: no cover '+r.behind);
 ok(r.take==='2'&&r.takeFlanked===false,'Take cover adds +2, and nothing against a flanking shot '+[r.take,r.takeFlanked]);
 ok(r.coverShoots,'a rebel who takes cover still shoots that round');
 ok(r.corner===true&&r.along===false&&r.open===false,'a wall covers from round its corner, not from along it or the open side '+[r.corner,r.along,r.open]);
 ok(r.ai==='true,true,true,true,true','the AI picks cover away from the rebel, not at their crate, and two do not share a spot '+r.ai);
 ok(r.lmg==='AUTOMATIC (DEPLOYED):-2','the Razorrat on its tripod: Automatic (Deployed) -2 '+r.lmg);
 ok(r.akli==='AUTOMATIC:-5','an Akli on automatic is still -5 '+r.akli);
 ok(r.fast==='true,true,fire,true,true,true','an enemy shot opens on its result card and fires as soon as the camera has the shooter and the target '+r.fast);
 ok(r.hold===true&&r.next===true,'its result stays up a second after the last round lands, then the next shooter goes '+[r.hold,r.next]);
 ok(r.mine==='true,true,reveal','on a rebel\'s turn they are selected and the card plays out '+r.mine);
 // FEEDBACK-0.2 §1.3: the enemy holds only from cover. On the ambush map with the alarm up and the squad holding at
 // fixed points, the share of enemies on foot (riot shields aside) in cover against their nearest rebel, at the end of
 // each of 6 rounds, averaged over 3 runs, is at least AI_COVER_MIN. Ambush guards gather on the truck, wherever it is.
 const AI_COVER_MIN=60;   // placeholder (%)
 const shares=[];let guard=null;
 for(let run=0;run<3;run++){
  await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),spec('ambush',{missionId:'rescuetachi',vip:{name:'Tachi Gard',first:'Tachi'},
   ctx:{title:'Rescue Tachi',place:'Redrock Flats',target:'convoy',sub:'Redrock Flats · Akkaro'},transport:{id:'graf',name:'Marta',cls:'graf'}}));
  await pg.waitForTimeout(300);
  const q=await pg.evaluate(()=>{
   const D=window.DBGground,f=D.fn;
   const P=[[620,960],[700,1010],[780,960]];D.U.filter(u=>u.side==='reb'&&!u.away).forEach((u,i)=>{u.x=P[i%3][0];u.y=P[i%3][1];});
   f.alertTown('smoke');f.startPlanning();
   const out=[];
   for(let rd=0;rd<6;rd++){
    f.aiPlan();
    for(const u of D.U){if(u.side!=='law'||u.down||u.veh||u.mnt)continue;const o=u.order;if(o&&(o.type==='move'||o.type==='sprint')){u.x=o.tx;u.y=o.ty;}}
    for(const u of D.U){if(!u.mnt)continue;const v=D.U.find(x=>x.id===u.mnt.v),o=u.order;if(v&&o&&o.type==='move'){v.x=o.tx;v.y=o.ty;}}
    f.vehSync();
    const reb=D.U.filter(u=>u.side==='reb'&&!u.down&&!u.away);
    const foot=D.U.filter(u=>u.side==='law'&&!u.down&&!u.surr&&!u.veh&&!u.mnt&&!u.shield);
    let n=0;for(const u of foot){const near=reb.reduce((a,b2)=>Math.hypot(b2.x-u.x,b2.y-u.y)<Math.hypot(a.x-u.x,a.y-u.y)?b2:a);if(f.coverOf(near,u))n++;}
    out.push(foot.length?n/foot.length:1);
   }
   const v=D.U.find(u=>u.hold),gp=f.guardPtNow();
   return {out,gp:Math.hypot(gp.x-v.x,gp.y-v.y)<1};
  });
  shares.push(...q.out);guard=q.gp;
 }
 const mean=Math.round(100*shares.reduce((a,c)=>a+c,0)/shares.length);
 ok(mean>=AI_COVER_MIN,'enemies on foot hold from cover: '+mean+'% in cover on average (want '+AI_COVER_MIN+'%) '+shares.map(x=>Math.round(x*100)).join(','));
 ok(guard===true,'the ambush guards gather on the holding vehicle, not where it started');
 console.log('cover metric: '+mean+'% of enemies on foot in cover');
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 await b.close();
 if(fails.length){console.log('cover-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('cover-smoke: all checks passed');
})();
