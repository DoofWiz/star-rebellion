/* Smoke test for ranks and promotion: node tools/rank-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const R=window.Rebel,D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const mk=(role,rank,extra)=>Object.assign({id:'x',name:'X Y',role,level:1,xp:0,rank,rankMissions:0,missions:0},extra||{});
  // ladders
  out.first=['Soldier','Marine','Support','Pilot'].map(r=>R.rankName(mk(r,0)));
  out.fifth=['Soldier','Marine','Support','Pilot'].map(r=>R.rankName(mk(r,4)));
  out.top=['Soldier','Marine','Pilot'].map(r=>R.rankName(mk(r,8)));
  out.officers=[R.rankName(mk('Soldier',0,{off:true})),R.rankName(mk('Soldier',8,{off:true}))];
  out.lens=Object.keys(R.LADDER).map(k=>R.LADDER[k].length).join(',')+','+R.OFFICER.length;
  // requirement grows with each rung
  out.need=[0,1,2,3,7].map(i=>R.needMissions(mk('Soldier',i)));
  out.needOff=[R.needMissions(mk('Soldier',0,{off:true})),R.needMissions(mk('Soldier',3,{off:true}))];
  // credit and promotion
  const p=mk('Soldier',0);
  out.c1=R.credit(p);out.c2=R.credit(p);out.eligible=R.canPromote(p);
  out.promoted=R.promote(p);out.after=[p.rank,p.rankMissions,R.canPromote(p)];
  const top=mk('Soldier',8,{rankMissions:99});out.topCan=R.canPromote(top);
  out.promoteTooSoon=R.promote(mk('Soldier',0));
  // commission needs level 5 and Sergeant
  out.com=[R.canCommission(mk('Soldier',4,{level:4})),R.canCommission(mk('Soldier',3,{level:9})),R.canCommission(mk('Soldier',4,{level:5})),R.canCommission(mk('Pilot',5,{level:6})),R.canCommission(mk('Support',4,{level:5}))];
  const c=mk('Soldier',5,{level:7,rankMissions:4});out.commissioned=R.commission(c);out.cAfter=[c.off,c.rank,c.rankMissions,R.canCommission(c)];
  // migration: saved rebels get a rank from their level and never lose one
  const old={id:'z',name:'Zed Old',role:'Soldier',level:7,xp:0};R.migrate(old);out.migrated=[old.rank,old.rankMissions,old.missions];
  // base wiring: rankFor, debrief credit, roster, dossier
  const dax=G().people.find(q=>q.id==='dax');dax.rank=0;dax.rankMissions=0;dax.missions=0;
  out.label=f.rankFor(dax);
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'dax',xp:0,state:'ok'}]});
  out.credited=[dax.missions,dax.rankMissions];
  f.applyDebrief({missionId:'none',days:0,win:false,people:[{id:'dax',xp:0,state:'ok'}]});
  out.failNoCredit=[dax.missions,dax.rankMissions];
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'dax',xp:0,state:'ok'}]});
  out.eligibleNow=R.canPromote(dax);
  out.card=f.rankCard(dax);
  // the recruit offer hides rank, the file shows it
  out.recruitHide=f.dossierHead(dax,'',true).indexOf('Private')<0;
  out.fileShow=f.dossierHead(dax).indexOf('Private')>=0;
  // pressing the button
  f.openWin('person',dax);
  // the rank is a button on the file's plate with insignia and a ready flag; the details are an overlay
  const row=document.querySelector('[data-rank-open="dax"]');
  out.row=[!!row,!!(row&&row.querySelector('svg.bs-insig')),!!(row&&row.querySelector('.pf-rank__flag')),!!row&&row.textContent.indexOf('Private')>=0,!!document.querySelector('.bs-overlay'),!!document.querySelector('#winCardB [data-promote]')];
  row.click();
  out.overlay=[!!document.querySelector('.bs-overlay'),!!document.querySelector('.bs-overlay [data-promote="dax"]'),!!document.querySelector('.bs-overlay svg.bs-insig'),f.getRankOverlay()];
  document.querySelector('.bs-overlay [data-rank-close]').click();
  out.dismissed=[!!document.querySelector('.bs-overlay'),f.getWin()];
  document.querySelector('[data-rank-open="dax"]').click();
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  out.escOverlay=[!!document.querySelector('.bs-overlay'),f.getWin()];
  document.querySelector('[data-rank-open="dax"]').click();
  f.openWin('person',dax);out.reopenClean=!document.querySelector('.bs-overlay');
  document.querySelector('[data-rank-open="dax"]').click();
  const m0=dax.morale;
  document.querySelector('[data-promote="dax"]').click();
  out.btn=[dax.rank,f.rankFor(dax),dax.morale>m0];
  // commission button flow
  dax.level=6;dax.rank=4;dax.rankMissions=0;f.openWin('person',dax);
  out.comFlag=document.querySelector('[data-rank-open="dax"]').textContent.indexOf('commissioned')>=0;
  document.querySelector('[data-rank-open="dax"]').click();
  document.querySelector('[data-commission="dax"]').click();
  out.comBtn=[dax.off,f.rankFor(dax)];
  // pilots show the USAF ladder in the flight profile
  const joss=G().people.find(q=>q.id==='joss');
  out.joss=f.rankFor(joss);
  return out;
 });
 ok(JSON.stringify(r.first)==='["Private","Private","Private","Airman Basic"]','first rungs '+r.first);
 ok(JSON.stringify(r.fifth)==='["Sergeant","Sergeant","Sergeant","Staff Sergeant"]','fifth rungs '+r.fifth);
 ok(JSON.stringify(r.top)==='["Sergeant Major","Sergeant Major","Chief Master Sergeant"]','top rungs '+r.top);
 ok(JSON.stringify(r.officers)==='["Second Lieutenant","Lieutenant General"]','officers '+r.officers);
 ok(r.lens==='9,9,9,9,9,9','ladder lengths '+r.lens);
 ok(JSON.stringify(r.need)==='[2,3,4,5,9]'&&JSON.stringify(r.needOff)==='[3,6]','requirements '+r.need+' / '+r.needOff);
 ok(r.c1===false&&r.c2===true&&r.eligible,'credit makes them eligible on the second mission: '+[r.c1,r.c2,r.eligible]);
 ok(r.promoted==='Private Second Class'&&JSON.stringify(r.after)==='[1,0,false]','promotion '+r.promoted+' '+r.after);
 ok(r.topCan===false&&r.promoteTooSoon===null,'top rung and too-soon guards');
 ok(JSON.stringify(r.com)==='[false,false,true,true,true]','commission gates '+r.com);
 ok(r.commissioned==='Second Lieutenant'&&JSON.stringify(r.cAfter)==='[true,0,0,false]','commission '+r.commissioned+' '+r.cAfter);
 ok(JSON.stringify(r.migrated)==='[3,0,0]','migrated '+r.migrated);
 ok(r.label==='Private','label '+r.label);
 ok(JSON.stringify(r.credited)==='[1,1]','win credits '+r.credited);
 ok(JSON.stringify(r.failNoCredit)==='[1,1]','a failure does not '+r.failNoCredit);
 ok(r.eligibleNow&&r.card.indexOf('data-promote="dax"')>=0,'promote button appears');
 ok(r.recruitHide&&r.fileShow,'recruit offer hides rank');
 ok(JSON.stringify(r.row)==='[true,true,true,true,false,false]','rank button on the plate '+r.row);
 ok(JSON.stringify(r.overlay)==='[true,true,true,"dax"]','overlay opens with the details '+r.overlay);
 ok(r.dismissed[0]===false&&r.dismissed[1]==='person','overlay dismisses, file stays '+r.dismissed);
 ok(r.escOverlay[0]===false&&r.escOverlay[1]==='person','Escape closes the overlay first '+r.escOverlay);
 ok(r.reopenClean,'a fresh file opens without the overlay');
 ok(r.comFlag,'row flags a possible commission');
 ok(r.btn[0]===1&&r.btn[1]==='Private Second Class'&&r.btn[2],'promote button '+r.btn);
 ok(r.comBtn[0]===true&&r.comBtn[1]==='Second Lieutenant','commission button '+r.comBtn);
 ok(typeof r.joss==='string'&&r.joss.length>0,'joss rank '+r.joss);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'rank-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
