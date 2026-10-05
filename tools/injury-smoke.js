/* Injury and Recovery: node tools/injury-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const P=id=>G().people.find(p=>p.id===id);
  const mk=(id,extra)=>Object.assign({id,name:id+' T',first:id,role:'Soldier',level:3,xp:0,assign:'rest',injured:0,charTrait:'brave',traits:[],morale:60,rank:1,rankMissions:0,missions:2,kills:0,injuries:0,sx:{}},extra||{});
  // ---- the table
  out.table=[R.INJ.length,R.COND.length,R.INJ.every(i=>i.n&&i.combat&&i.treat&&i.w>0)];
  const seen=src=>{const s=new Set();for(let i=0;i<3000;i++){const x=R.injRoll(src,Math.random,[]);if(x)s.add(x.k);}return s;};
  const pl=seen('plasma'),ba=seen('ballistic'),ex=seen('explosive'),bl=seen('blunt');
  out.src=[pl.has('burns'),pl.has('shrapnel'),ba.has('shrapnel'),ba.has('burns'),ex.has('shrapnel')&&ex.has('burns'),bl.has('shrapnel')||bl.has('burns'),ba.size,ex.size];
  out.have=R.injRoll('ballistic',()=>0.0,['concussion']).k!=='concussion';
  // ---- standing penalties
  const p0=mk('a');out.fx0=JSON.stringify(R.injFx(p0));
  const p1=mk('b',{cond:[{k:'concussed',days:3},{k:'brokenleg',days:3},{k:'internal',days:3}],body:{arm:1,eye:1}});
  const x=R.injFx(p1);out.fx1=[x.aim,x.cool,Math.round(x.spd*100)/100,x.nosprint,x.oneHand,x.hpPct];
  const p2=mk('c',{body:{arm:2,leg:2,eye:2}});out.fxPros=JSON.stringify(R.injFx(p2))===out.fx0;
  // ---- recovery arithmetic
  const rc=mk('d');R.addCond(rc,'burned',0);R.addCond(rc,'burned',3);out.add=[rc.cond.length,rc.cond[0].days];
  const done=[];for(let i=0;i<9;i++){const r=R.condRecover(rc,1,()=>1);done.push(...r.done);}out.rec=[done.join(),rc.cond.length];
  const ey=mk('e');R.addCond(ey,'eye',0);let blind=false;for(let i=0;i<14;i++){const r=R.condRecover(ey,0.25,()=>1);if(r.blind)blind=true;}out.blind=[blind,ey.body&&ey.body.eye,ey.cond.length];
  const ey2=mk('e2');R.addCond(ey2,'eye',0);let blind2=false;for(let i=0;i<14;i++){const r=R.condRecover(ey2,1,()=>1);if(r.blind)blind2=true;}out.noBlind=[blind2,ey2.cond.length];
  const fc=mk('f');R.addCond(fc,'facial',0);let scar=false;for(let i=0;i<8;i++)if(R.condRecover(fc,1,()=>0).scar)scar=true;out.scar=scar;
  // ---- the base takes the injuries home
  const dax=P('dax'),runa=P('runa'),kel=P('kel');
  dax.morale=60;
  const msgs=f.applyInjuries(dax,[{k:'concussion',treated:true},{k:'brokenleg',treated:false}],false);
  out.apply=[dax.cond.map(c=>c.k+':'+c.days).join(),dax.morale,dax.injuries,msgs.length];
  f.applyInjuries(runa,[{k:'maimed',treated:true}],false);
  out.maimed=[!!(runa.body&&(runa.body.arm===1||runa.body.leg===1)),R.laidUp(runa)];
  f.applyInjuries(kel,[{k:'spinal',treated:true}],true);out.spinal=[R.laidUp(kel),kel.injuries||0];
  // squad profile
  const e=f.squadEntry(dax,false);
  out.entry=[e.aim,e.cool,Math.round(e.agi*100)/100,e.nosprint,e.oneHand];
  const e2=f.squadEntry(runa,false);out.entry2=[e2.oneHand,e2.nosprint];
  // healing is slow with no Infirmary, faster with one; frozen on a mission
  out.rate0=f.healRate();
  G().rooms.push({id:'rm_t',key:'infirmary',r:1,c:1,w:1,h:1,up:[]});
  const rate1=f.healRate();
  G().rooms.find(r=>r.key==='infirmary').up=['surgery'];
  out.rates=[rate1,f.healRate()];
  const before=dax.cond.map(c=>c.days);
  dax.assign='mission';f.advanceDay();const frozen=dax.cond.map(c=>c.days).join()===before.join();dax.assign='rest';
  f.advanceDay();
  out.heal=[frozen,dax.cond.every((c,i)=>c.days<before[i]||false)];
  // ---- the file and the roster
  dax.cond=dax.cond||[];f.openWin('person',dax);
  const html=document.querySelector('#winCardB').innerHTML;out.med=[html.indexOf('Medical')>=0,html.indexOf('Broken Leg')>=0];
  f.closeWin();f.syncUI();out.mark=document.querySelector('#panel').innerHTML.indexOf('✚')>=0;
  // ---- prosthetics need a Surgery Room, money and time
  runa.body={arm:1};runa.cond=(runa.cond||[]).filter(c=>!R.CONDK[c.k].laidUp);runa.assign='rest';G().credits=2000;G().materials=500;const c0=G().credits;
  out.pros=[f.startProsthetic('runa','arm'),c0-G().credits,R.laidUp(runa)];
  for(let i=0;i<6;i++)f.advanceDay();
  out.prosDone=[runa.body.arm,R.laidUp(runa),R.injFx(runa).oneHand];
  out.prosNo=(()=>{G().rooms.find(r=>r.key==='infirmary').up=[];runa.body={leg:1};return f.startProsthetic('runa','leg');})();
  return out;
 });
 ok(r.table[0]===12&&r.table[1]>=9&&r.table[2],'tables '+r.table);
 ok(r.src[0]&&!r.src[1]&&r.src[2]&&!r.src[3]&&r.src[4]&&!r.src[5],'damage sources filter the table '+r.src);
 ok(r.have,'no duplicate injury');
 ok(r.fx0==='{"aim":0,"cool":0,"spd":1,"nosprint":0,"oneHand":0,"hpPct":0,"view":0}','clean rebel '+r.fx0);
 ok(r.fx1[0]===-4&&r.fx1[1]===-10&&r.fx1[2]===0.7&&r.fx1[3]===1&&r.fx1[4]===1&&r.fx1[5]===-0.25,'stacked penalties '+r.fx1);
 ok(r.fxPros,'prosthetics remove the penalties');
 ok(r.add[0]===1&&r.add[1]===9,'a condition extends rather than doubles '+r.add);
 ok(r.rec[0]==='burned'&&r.rec[1]===0,'recovery '+r.rec);
 ok(r.blind[0]&&r.blind[1]===1&&r.blind[2]===0,'a slow eye injury goes permanent '+r.blind);
 ok(!r.noBlind[0]&&r.noBlind[1]===0,'a treated eye injury heals '+r.noBlind);
 ok(r.scar,'a facial injury can scar for good');
 ok(r.apply[0]==='concussed:5,brokenleg:9'&&r.apply[1]===54&&r.apply[2]===1&&r.apply[3]===2,'applying injuries '+r.apply);
 ok(r.maimed[0]&&r.maimed[1]>=6,'maimed '+r.maimed);
 ok(r.spinal[0]===10&&r.spinal[1]===0,'spinal injury means prolonged treatment '+r.spinal);
 ok(r.entry[0]===1&&r.entry[1]<=60&&r.entry[2]<0.8&&r.entry[3]===1,'conditions follow the rebel into the mission '+r.entry);
 ok(r.rate0===0.25,'no infirmary heals slowly '+r.rate0);
 ok(r.rates[0]===1&&r.rates[1]===1.5,'infirmary rates '+r.rates);
 ok(r.heal[0]&&r.heal[1],'recovery runs at the base only '+r.heal);
 ok(r.med[0]&&r.med[1]&&r.mark,'file and roster show injuries '+r.med+' '+r.mark);
 ok(r.pros[0]===true&&r.pros[1]===300&&r.pros[2]===5,'prosthetic starts '+r.pros);
 ok(r.prosDone[0]===2&&r.prosDone[1]===0&&r.prosDone[2]===0,'prosthetic fitted '+r.prosDone);
 ok(r.prosNo===false,'no Surgery Room, no prosthetic');
 // ---- the scene
 await pg.evaluate(()=>window.SR.go('ground',{test:true}));
 await pg.waitForTimeout(1200);
 const g=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const reb=U.filter(u=>u.side==='reb'&&!u.auto);
  const [a,b,c,d]=reb.length>=4?reb:[reb[0],reb[1],reb[2],reb[2]];
  for(const u of reb)u.meds=9;   // Treat Wound needs a Med Pack; the pack rules are tested in medpack-smoke
  const foe=U.find(u=>u.side==='law');
  const inflict=(u,k)=>f.inflictInjury(u,'ballistic',k);
  const atk=u=>f.computeATK(u,foe,'akli',false).total;
  const base=atk(a);
  // concussion: stunned
  inflict(a,'concussion');
  out.stun=[f.stunned(a),f.statusTag(a).indexOf('Stunned')>=0,JSON.stringify(f.ordersFor(a)).indexOf('Stunned')>=0,f.wpnsOf(a).length>0];
  // a friend treats them
  b.x=a.x+40;b.y=a.y;
  out.pick=[f.treatPick(b)===a,f.treatPick(a)===null];
  f.doTreat(b);
  out.treated=[f.stunned(a),a.inj[0].treated,b.treats,(b.rescued||[]).length,a.wound];
  // broken arm: one-handed only; leg: slow, no sprint
  a.wpns=['akli','cowboy'];inflict(a,'brokenarm');out.arm=[f.wpnsOf(a).join()];
  const sp0=f.speedMul(a);inflict(a,'brokenleg');out.leg=[f.speedMul(a)/sp0,f.cantSprint(a)];
  f.doTreat(a);f.doTreat(a);out.legTreated=[f.speedMul(a)/sp0,f.cantSprint(a),f.wpnsOf(a).join()];
  // eye, burns, facial
  const e2=c;const b2=atk(e2);
  inflict(e2,'eye');out.eye=atk(e2)-b2;
  inflict(e2,'burns');out.burns=atk(e2)-b2;
  inflict(e2,'facial');out.facial=atk(e2)-b2;
  out.cap=!inflict(e2,'shrapnel');          // three at a time
  // internal injury cuts max health; treating restores it
  const d2=d===c?reb[0]:d;
  d2.inj=[];d2.maxhp=100;d2.hp=100;d2.wound=0;
  inflict(d2,'internal');out.internal=[d2.maxhp,d2.hp];
  f.doTreat(d2);out.internalFix=d2.maxhp;
  // shrapnel suppresses abilities
  d2.inj=[];d2.stims=1;d2.hp=50;inflict(d2,'shrapnel');f.useStim(d2);out.supp=[d2.stims,d2.hp];
  f.doTreat(d2);f.useStim(d2);out.suppFix=[d2.stims,d2.hp>50];
  // bleeding
  d2.inj=[];d2.hp=60;d2.maxhp=100;inflict(d2,'bleeding');const h0=d2.hp;f.endRound&&f.endRound();out.bleed=h0-d2.hp;
  // spinal: down, stabilised back up by a neighbour
  const s1=reb[1],s2=reb[0];s1.inj=[];s1.down=0;s1.hp=80;s1.maxhp=100;
  inflict(s1,'spinal');out.spinal=[!!s1.down,s1.hp,!!s1.downInj];
  s2.x=s1.x+30;s2.y=s1.y;s2.inj=s2.inj||[];
  out.pickDown=f.treatPick(s2)===s1;
  f.doTreat(s2);out.stood=[!s1.down,s1.hp>=25];
  // criticals on a rebel become injuries; on a lawman the old wound stays
  const t=reb[2];t.inj=[];t.hp=100;t.maxhp=100;t.down=0;
  f.woundUnit(foe,t,5,true,'ballistic');out.crit=[!!t.inj.length,t.wound];
  const L=U.find(u=>u.side==='law'&&!u.down);L.wound=0;L.hp=L.maxhp;f.woundUnit(reb[0],L,3,true,'ballistic');out.lawCrit=[L.inj===undefined,L.wound];
  // the card and the result
  out.card=JSON.stringify(f.ordersFor(reb[2])).indexOf('treat')>=0;
  const res=f.buildResult(true);
  const rec=res.people.find(q=>q.id===b.id);
  out.result=[!!(rec&&rec.treats),!!(rec&&rec.rescued&&rec.rescued.length)];
  const recT=res.people.find(q=>q.id===reb[2].id);out.resultInj=!!(recT&&recT.inj&&recT.inj.length);
  return out;
 });
 ok(g.stun[0]&&g.stun[1]&&g.stun[2],'concussion stuns '+g.stun);
 ok(g.pick[0]&&g.pick[1],'an ally can treat the stunned, they cannot treat themselves '+g.pick);
 ok(!g.treated[0]&&g.treated[1]&&g.treated[2]===1&&g.treated[3]===1&&g.treated[4]===0,'treating clears the stun and credits a rescue '+g.treated);
 ok(g.arm[0]==='cowboy','broken arm leaves one hand '+g.arm);
 ok(Math.abs(g.leg[0]-0.5)<1e-9&&g.leg[1],'broken leg slows and stops sprinting '+g.leg);
 ok(g.legTreated[0]===1&&!g.legTreated[1]&&g.legTreated[2]==='akli,cowboy','treated: moves normally and has both hands back '+g.legTreated);
 ok(g.eye===-4&&g.burns===-6&&g.facial===-8,'accuracy penalties stack (each includes the -1 for being wounded) '+[g.eye,g.burns,g.facial]);
 ok(g.cap,'three injuries at a time');
 ok(g.internal[0]===70&&g.internal[1]===70&&g.internalFix===100,'internal injury '+g.internal+' '+g.internalFix);
 ok(g.supp[0]===1&&g.supp[1]===50&&g.suppFix[0]===0&&g.suppFix[1],'shrapnel suppresses abilities until treated '+g.supp+' '+g.suppFix);
 ok(g.bleed===6,'bleeding costs 6 a round '+g.bleed);
 ok(g.spinal[0]&&g.spinal[1]===80&&g.spinal[2],'spinal injury downs without zeroing '+g.spinal);
 ok(g.pickDown,'a downed rebel is treatable');
 ok(g.stood[0]&&g.stood[1],'treated, back on their feet '+g.stood);
 ok(g.crit[0]&&g.crit[1]===1,'a critical on a rebel is an injury '+g.crit);
 ok(g.lawCrit[0]&&g.lawCrit[1]===1,'lawmen keep the old wound '+g.lawCrit);
 ok(g.card,'Treat wound card');
 ok(g.result[0]&&g.result[1]&&g.resultInj,'the result carries treatments, rescues and injuries '+g.result+' '+g.resultInj);
 // ---- space: a cockpit breach rattles the pilot
 await pg.evaluate(()=>window.SR.go('space',{test:true,mission:{kind:'space',missionId:'depotrun',days:2,flight:[{pilotId:'joss',name:'Joss Marrek',first:'Joss',level:5,aim:4,cool:70,foc:0,cun:1,nv:1,traits:[],cls:'cross',fighterId:'f1',fighterName:'Cross',hull:100}]}}));
 await pg.waitForTimeout(1200);
 const sp=await pg.evaluate(()=>{const sd=window.DBGspace;const sh=sd.ships.find(x=>x.id==='P1');sh.pilot.cockpitHit=1;sd.fn.forceEnd(true);return sd.pendingResult.people[0].inj;});
 ok(sp&&sp[0]&&sp[0].k==='concussion','cockpit breach concussion '+JSON.stringify(sp));
 // ---- debrief flow: injuries and the rescue traits
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(600);
 const fl=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,R=window.Rebel,G=()=>D.G,out={};
  const P=id=>G().people.find(p=>p.id===id);
  f.setRng(()=>0.99);
  for(const id of ['dax','runa','kel']){const p=P(id);p.cond=[];p.body={};p.traits=[];p.assign='rest';}
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'dax',xp:0,state:'ok',inj:[{k:'brokenarm',treated:true}],treats:1,rescued:['runa']},{id:'runa',xp:0,state:'ok',inj:[{k:'concussion',treated:true}]},{id:'kel',xp:0,state:'ok'}]});
  out.cond=[P('dax').cond.map(c=>c.k).join(),P('runa').cond.map(c=>c.k).join(),(P('kel').cond||[]).length];
  out.rescue=[R.expHas(P('dax'),'saved','runa'),R.expHas(P('runa'),'owes','dax'),G().news.some(n=>/pulled .* out of it/.test(JSON.stringify(n)))];
  out.news=G().news.some(n=>/brokenarm|broken arm/i.test(JSON.stringify(n)));
  return out;
 });
 ok(fl.cond[0]==='brokenarm'&&fl.cond[1]==='concussed'&&fl.cond[2]===0,'debrief hands out conditions '+fl.cond);
 ok(fl.rescue[0]&&fl.rescue[1]&&fl.rescue[2],'saving someone forms Saved / Owes '+fl.rescue);
 ok(fl.news,'news line');
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'injury-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
