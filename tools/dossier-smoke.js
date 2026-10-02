/* Smoke test for the dossier and roster: node tools/dossier-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const dax=G().people.find(p=>p.id==='dax'),joss=G().people.find(p=>p.id==='joss');
  // the file: header tags, meters, rank card before the character, record before assignment
  f.openWin('person',dax);
  let html=$('#winCardB').innerHTML;
  out.rookie=html.indexOf('Rookie')>=0;
  out.meters=$$('#winCardB .bs-meters .sr-meter').length;     // morale, experience, four skills (the rank row is a button beside them)
  out.labels=$$('#winCardB .sr-meter > span:first-child').map(e=>e.textContent).join(',');
  const at=s=>html.indexOf(s);
  out.order=[at('data-rank-open'),at('>Morale<'),at('>Character<'),at('>Skills<'),at('Service record'),at('>Assignment<')];
  out.sorted=out.order.every((v,i)=>v>=0&&(i===0||v>out.order[i-1]));
  out.since=html.indexOf('with us since day 1')>=0;
  // specialty replaces Rookie
  dax.spec='vanguard';f.openWin('person',dax);html=$('#winCardB').innerHTML;out.vanguard=html.indexOf('Vanguard')>=0&&html.indexOf('Rookie')<0;dax.spec=undefined;
  // morale band tag only when not middling
  dax.morale=60;out.midTag=f.dossierHead(dax).indexOf(' morale<')<0;
  dax.morale=10;out.lowTag=f.dossierHead(dax).indexOf('Very Low morale')>=0;
  dax.morale=90;out.highTag=f.dossierHead(dax).indexOf('Very High morale')>=0;
  dax.morale=60;
  // experience meter and the cap
  dax.level=20;dax.xp=0;out.max=f.meterBlock(dax).indexOf('MAX')>=0;dax.level=1;dax.xp=0.42;out.xpVal=f.meterBlock(dax).indexOf('>42<')>=0;dax.level=1;
  // record from a debrief: kills and injuries add up
  dax.kills=0;dax.injuries=0;dax.missions=0;
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'dax',xp:0,state:'injured',dur:1,kills:3},{id:'runa',xp:0,state:'ok',kills:2}]});
  out.record=[dax.kills,dax.injuries,dax.missions,G().people.find(p=>p.id==='runa').kills];
  out.recordHTML=f.recordCard(dax);
  // pilots, support and autos
  f.openWin('person',joss);html=$('#winCardB').innerHTML;
  out.pilotSkills=['Aim','Cunning','Focus','Presence'].every(k=>html.indexOf('>'+k+'<')>=0)&&html.indexOf('Constitution')<0;
  const sup=R.migrate({id:'s1',name:'Sup Port',role:'Support',level:1,xp:0,assign:'rest',injured:0,bio:'x'});sup.joined=2;
  G().people.push(sup);
  f.openWin('person',sup);html=$('#winCardB').innerHTML;
  out.support=[html.indexOf('>Skills<')<0,html.indexOf('Rookie')>=0,$$('#winCardB .bs-meters .sr-meter').length];
  const auto={id:'a1',name:'Bot',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,auto:'policebot',bio:'beep'};G().people.push(auto);
  f.openWin('person',auto);html=$('#winCardB').innerHTML;
  out.auto=[html.indexOf('Rookie')<0,html.indexOf('Morale')<0,html.indexOf('Service record')<0,html.indexOf('data-rank-open')<0];
  // recruit offer: no rank, but Rookie and meters
  const rec=R.migrate({id:'rec99',name:'New Face',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,bio:'x'});
  f.openWin('recruit',{cards:[{p:rec,must:false}]});html=$('#winCardB').innerHTML;
  out.recruit=[html.indexOf('Private')<0,html.indexOf('Rookie')>=0,html.indexOf('Service record')<0,html.indexOf('data-rank-open')<0,html.indexOf('Morale')>=0];
  // roster
  f.syncUI();
  out.rosterTitle=$$('.sr-unit__role').some(e=>e.getAttribute('title')&&e.getAttribute('title').indexOf('level')>=0);
  return out;
 });
 ok(r.rookie,'Rookie shown');
 ok(r.meters===6,'six bars (morale, experience, four skills): '+r.meters+' '+r.labels);
 ok(r.sorted,'section order '+r.order);
 ok(r.since,'with-us-since line');
 ok(r.vanguard,'specialty replaces Rookie');
 ok(r.midTag&&r.lowTag&&r.highTag,'morale tags '+[r.midTag,r.lowTag,r.highTag]);
 ok(r.max&&r.xpVal,'experience meter '+[r.max,r.xpVal]);
 ok(JSON.stringify(r.record)==='[3,1,1,2]','record '+r.record);
 ok(r.recordHTML.indexOf('Confirmed kills')>=0,'record card');
 ok(r.pilotSkills,'pilot skill bars');
 ok(r.support[0]&&r.support[1]&&r.support[2]===2,'support dossier '+r.support);
 ok(r.auto.every(Boolean),'autos stay plain '+r.auto);
 ok(JSON.stringify(r.recruit)==='[true,true,true,true,true]','recruit offer '+r.recruit);
 ok(r.rosterTitle,'roster full-text tooltip');
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'dossier-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
