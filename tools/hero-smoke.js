/* Smoke test for Heroes: node tools/hero-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(async()=>{
  const R=window.Rebel,D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const P=id=>G().people.find(p=>p.id===id);
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const mk=(id,extra)=>Object.assign({id,name:id+' T',first:id,role:'Soldier',level:5,xp:0,assign:'rest',injured:0,charTrait:'brave',traits:[],morale:60,rank:3,rankMissions:0,missions:6,kills:0,injuries:0,sx:{}},extra||{});
  // ---- the hidden chance
  const a=mk('a');
  out.gain=[R.heroGain(a,{win:true}),a.heroP>0];
  const rich=mk('rich');R.heroGain(rich,{win:true,kills:6,danger:true,alone:true,top:true,notable:true});
  out.big=rich.heroP>a.heroP*3;
  const cap=mk('cap');for(let i=0;i<200;i++)R.heroGain(cap,{win:true,kills:6,alone:true,top:true});
  out.cap=cap.heroP===R.HERO_CAP;
  const sup=mk('sup',{role:'Support'});out.support=[R.heroGain(sup,{win:true}),R.heroEligible(sup)];
  out.elig=[R.heroEligible(mk('e1')),R.heroEligible(mk('e2',{missions:3})),R.heroEligible(mk('e3',{level:2})),R.heroEligible(mk('e4',{role:'Pilot'})),R.heroEligible(mk('e5',{auto:'strider'})),R.heroEligible(mk('e6',{role:'Hero'}))];
  // roll: strongest first, one winner, never more
  const c1=mk('c1',{heroP:0.05}),c2=mk('c2',{heroP:0.02}),c3=mk('c3',{heroP:0.06});
  out.rollNone=R.heroRoll([c1,c2,c3],()=>0.99)===null;
  out.rollFirst=R.heroRoll([c1,c2,c3],()=>0.01).id;
  out.rollSecond=R.heroRoll([c1,c2],()=>0.03)&&R.heroRoll([c1,c2],()=>0.03).id;
  // making one: the type changes, the old rank ladder stays, the others' chances fall
  const m1=mk('m1',{role:'Pilot',heroP:0.05}),m2=mk('m2',{heroP:0.05});
  const rank0=R.rankName(m1);
  R.heroMake(m1,[m1,m2]);
  out.made=[m1.role,m1.heroOf,m1.rankRole,m1.heroP,Math.round(m2.heroP*10000)/10000,R.rankName(m1)===rank0];
  out.buffs=[R.skillKeys(m1).join(','),R.skill(m1,'aim')-R.skill(mk('x',{role:'Pilot'}),'aim'),R.hpOf(m1)-R.hpOf(mk('x')),R.gearSlots(m1).length];
  // ---- through the base: the gate
  for(const id of ['dax','runa','kel']){const p=P(id);p.level=4;p.missions=8;p.heroP=R.HERO_CAP;p.charTrait='steady';}
  f.setRng(()=>0);
  G().revLevel=1;
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'dax',xp:0,state:'ok',kills:1},{id:'runa',xp:0,state:'ok'},{id:'kel',xp:0,state:'ok'}]});
  out.gated=[G().people.filter(p=>p.role==='Hero').length,G().heroesMade,f.getWin()];
  // the Hero falls: no replacement in Level 1, even with every chance maxed
  G().people=G().people.filter(p=>p.role!=='Hero');
  for(const id of ['dax','runa','kel']){const p=P(id);if(p){p.heroP=R.HERO_CAP;p.level=4;p.missions=12;}}
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'runa',xp:0,state:'ok',kills:2},{id:'kel',xp:0,state:'ok'}]});
  out.gatedAgain=[G().people.filter(p=>p.role==='Hero').length,G().heroesMade];
  // ---- Level 2: exactly one hero, a celebration, the rest drop
  G().revLevel=2;
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'dax',xp:0,state:'ok',kills:3},{id:'runa',xp:0,state:'ok'},{id:'kel',xp:0,state:'ok'}]});
  const heroes=G().people.filter(p=>p.role==='Hero');
  out.one=[heroes.length,heroes[0]&&heroes[0].id];
  out.win=f.getWin();
  out.screen=$('#winCardB')?[$('#winCardB').innerHTML.indexOf('New Hero!')>=0,$('#winCardB').innerHTML.indexOf('Rally cry')>=0]:null;
  const others=G().people.filter(p=>['dax','runa','kel'].includes(p.id)&&p.role!=='Hero');
  out.dropped=others.every(p=>p.heroP<R.HERO_CAP*0.5);
  const h=heroes[0];
  // roster and pools
  f.closeWin();f.syncUI();
  out.rail=[!$('#heroSec').hidden,$$('#heroList .sr-unit').length,f.ablePilots().some(p=>p.id===h.id),f.isGround(h)];
  f.openWin('person',h);const html=$('#winCardB').innerHTML;
  out.dossier=[html.indexOf('Hero of the Rebellion')>=0,html.indexOf('was Soldier')>=0,html.indexOf('Rank')>=0||html.indexOf('data-rank-open')>=0];
  // squad entry flags it and carries the buffed profile
  const e=f.squadEntry(h,false);out.entry=[e.hero,e.hp>=125];
  // a hero cannot be a hero twice
  out.again=R.heroMake(h,[h]);
  return out;
 });
 ok(r.gain[0]>0&&r.gain[1],'gain '+r.gain);
 ok(r.big,'standing out adds a lot');
 ok(r.cap,'chance is capped');
 ok(r.support[0]===0&&r.support[1]===false,'support can never become a hero '+r.support);
 ok(JSON.stringify(r.elig)==='[true,false,false,true,false,false]','eligibility '+r.elig);
 ok(r.rollNone,'no roll no hero');
 ok(r.rollFirst==='c3','strongest candidate rolls first '+r.rollFirst);
 ok(JSON.stringify(r.made.slice(0,4))==='["Hero","Pilot","Pilot",0]'&&r.made[4]===0.0175&&r.made[5],'making a hero '+r.made);
 ok(r.buffs[0]==='aim,con,agi,cun,foc,pre'&&r.buffs[1]===8&&r.buffs[2]===35&&r.buffs[3]===7,'hero buffs (and the full seven gear slots) '+r.buffs);
 ok(r.gated[0]===1&&r.gated[1]===1,'Level 1 lets exactly one Hero emerge '+r.gated);
 ok(r.gatedAgain[0]===0&&r.gatedAgain[1]===1,'if the Hero is gone there is no second one in Level 1 '+r.gatedAgain);
 ok(r.one[0]===1,'exactly one hero from a mission '+r.one);
 ok(r.win==='newhero'&&r.screen&&r.screen[0]&&r.screen[1],'the New Hero screen '+r.win+' '+r.screen);
 ok(r.dropped,'everyone else falls back');
 ok(r.rail[0]&&r.rail[1]===1&&r.rail[2]&&r.rail[3],'roster and pools '+r.rail);
 ok(r.dossier[0]&&r.dossier[1]&&r.dossier[2],'dossier '+r.dossier);
 ok(r.entry[0]===1&&r.entry[1],'squad entry '+r.entry);
 ok(r.again===false,'only once');
 // ---- ground: the Rally cry
 await pg.evaluate(()=>window.SR.go('ground',{test:true}));
 await pg.waitForTimeout(1200);
 const g=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const reb=U.filter(u=>u.side==='reb'&&!u.auto);
  const hero=reb[0];hero.hero=1;
  const labels=u=>f.ordersFor(u).map(x=>typeof x==='string'?x:'').join('');
  const has=u=>JSON.stringify(f.ordersFor(u)).indexOf('rally')>=0;
  out.cards=[has(hero),has(reb[1])];
  f.alertTown('test');
  return out;
 });
 await pg.waitForTimeout(400);
 const g2=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const reb=U.filter(u=>u.side==='reb'&&!u.auto);
  const hero=reb[0],buddy=reb[1];
  out.phase=gd.phase;
  buddy.cool=20;hero.hero=1;
  hero.order={type:'rally'};
  f.execute();
  out.after=[buddy.cool>=75,buddy.rally,hero.heroUsed,gd.phase];
  const atk=f.computeATK(buddy,U.find(u=>u.side==='law'),'akli',false);
  out.atk=atk.entries.some(e=>e[0]==='RALLIED');
  out.cardUsed=JSON.stringify(f.ordersFor(hero)).indexOf('Already used')>=0||JSON.stringify(f.ordersFor(hero)).indexOf('disabled')>=0;
  return out;
 });
 ok(g.cards[0]===true&&g.cards[1]===false,'only the hero gets the Rally cry card '+g.cards);
 ok(g2.after[0]&&g2.after[1]===1&&g2.after[2]===1,'rally steadies the squad '+g2.after);
 ok(g2.atk,'rallied allies +2 to hit');
 // ---- space: the Heroic surge
 await pg.evaluate(()=>window.SR.go('space',{test:true,mission:{kind:'space',missionId:'depotrun',days:2,flight:[{pilotId:'joss',name:'Joss Marrek',first:'Joss',level:5,hero:1,aim:4,cool:70,foc:0,cun:1,nv:1,traits:[],cls:'cross',fighterId:'f1',fighterName:'Cross',hull:100}]}}));
 await pg.waitForTimeout(1200);
 const s=await pg.evaluate(()=>{
  const sd=window.DBGspace,f=sd.fn,out={};
  const sh=sd.ships.find(x=>x.id==='P1');
  out.flag=sh.pilot.hero;
  sh.hull=Math.round(sh.maxHull*0.2);sh.segs.F.val=0;sh.segs.R.val=0;sh.pilot.cool=15;
  const t=sd.ships.find(x=>x.faction==='heg');
  const before=f.computeATK(sh,t,sh.wpns[0].key).total;
  f.doAction(sh,{a:'hero'});
  const after=f.computeATK(sh,t,sh.wpns[0].key);
  out.surge=[sh.hull>=Math.round(sh.maxHull*0.7),sh.segs.F.val===sh.segs.F.max,sh.pilot.cool>=60,after.total>before,(after.entries.find(e=>e[0]==='HEROIC SURGE')||[0,0])[1]===4,sh.pilot.heroUsed];
  return out;
 });
 ok(s.flag===1,'pilot carries the hero flag');
 ok(s.surge.every(Boolean),'heroic surge '+s.surge);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'hero-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
