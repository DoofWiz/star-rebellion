/* Smoke test for the designer's answers in docs/DESIGN_BLOCKERS.md: node tools/blockers-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   C-1  pilots use the database skill-and-level bonus, with mood and injury added on top.
   C-2  the opening cast are built through the same path as any rebel, from the database where a row exists.
   C-5  Combat Medic is live: +3 Presence and a wider, cheaper Treat Wound.
   C-6  Treat Wound uses a Med Pack; the Infirmary makes more; used packs leave the armory.
   (C-3, one Hero in Revolution Level 1, is in hero-smoke.) */
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
  const R=window.Rebel,D=window.DBGbase,G=()=>D.G,f=D.fn,out={};
  const P=id=>G().people.find(p=>p.id===id);
  const near=(a,b)=>Math.abs(a-b)<=1;
  // C-2: the cast
  const joss=P('joss'),dax=P('dax');
  out.joss=[joss.level,joss.xp,joss.init,joss.charTrait,joss.morale,joss.rank!==undefined&&joss.first==='Joss'];
  const ps=f.pilotSkills?f.pilotSkills(joss):null;
  out.jossSk=ps&&[ps.aim,ps.cunning,ps.focus,ps.presence];
  const sera=f.castRebel({id:'sera',name:'Sera Kest',role:'Pilot',charTrait:'lucky',bio:'x'},'sera-kest');
  const ss=f.pilotSkills(sera);
  out.sera=[sera.level,sera.init,sera.charTrait,near(ss.aim,30),near(ss.focus,30),near(ss.presence,36)];
  out.dax=[dax.level,dax.charTrait,dax.sx&&typeof dax.sx==='object',dax.first];
  // C-1: aim is the database bonus plus mood and injury
  out.aim=[f.pilotAim(joss)];
  joss.morale=95;out.aim.push(f.pilotAim(joss));
  joss.morale=60;joss.cond=[{k:'eye',days:5}];out.aim.push(f.pilotAim(joss));joss.cond=[];
  // a level-1 generated pilot sits well below the cast
  const rk=R.scripted({id:'rk',name:'Rook Pilot',role:'Pilot',charTrait:'brave'});
  out.rook=[f.pilotAim(rk),rk.level];
  // C-6: med packs in the armory and in the kit
  const arm=G().armory.find(a=>a.id==='medpack');
  out.stock=[arm&&arm.n,f.packsCarried(dax),f.packsCarried(P('runa')),f.packsCarried(P('kel')),f.packsCarried(joss)];
  out.entry=f.squadEntry(dax,false).meds;
  // used packs leave the armory
  f.usePacks({people:[{id:'dax',packs:1}]});
  out.used=[G().armory.find(a=>a.id==='medpack').n];
  // the Infirmary makes more: none without the room, one every three days with it, 8 supplies each
  const n0=G().armory.find(a=>a.id==='medpack').n;
  G().supplies=100;G().packClock=0;
  f.packTick();f.packTick();f.packTick();
  out.noRoom=[G().armory.find(a=>a.id==='medpack').n===n0,G().supplies];
  G().rooms.push({id:'rm_med',key:'infirmary',r:1,c:1,w:1,h:1,up:[]});
  G().packClock=0;G().supplies=100;
  f.packTick();f.packTick();f.packTick();
  out.made=[G().armory.find(a=>a.id==='medpack').n-n0,G().supplies];
  G().armory.find(a=>a.id==='medpack').n=6;G().packClock=0;G().supplies=100;
  f.packTick();f.packTick();f.packTick();
  out.cap=[G().armory.find(a=>a.id==='medpack').n,G().supplies];
  // C-5: the Medic's Presence
  const t1={id:'t',name:'T T',role:'Soldier',level:1,xp:0,sx:{}},t2=Object.assign({},t1,{spec:'medic'});
  out.medicPre=R.skill(t2,'pre')-R.skill(t1,'pre');
  return out;
 });
 ok(r.joss[0]===4&&r.joss[1]===0.65&&r.joss[2]===4&&r.joss[3]==='reckless'&&r.joss[4]===60&&r.joss[5],'Joss comes from his database row through the rebel path '+r.joss);
 ok(r.jossSk&&r.jossSk.every((v,i)=>Math.abs(v-[40,40,40,38][i])<=1),'Joss reads back as his database skills '+r.jossSk);
 ok(r.sera[0]===3&&r.sera[1]===3&&r.sera[2]==='lucky'&&r.sera[3]&&r.sera[4]&&r.sera[5],'Sera likewise '+r.sera);
 ok(r.dax[0]===1&&r.dax[1]==='cautious'&&r.dax[2]&&r.dax[3]==='Dax','soldiers in the cast get the same fields '+r.dax);
 ok(r.aim[0]===4&&r.aim[1]===5&&r.aim[2]===2,'pilot aim: database bonus, then mood and injury on top '+r.aim);
 ok(r.rook[0]<=2&&r.rook[1]===1,'a fresh generated pilot is well below the cast '+r.rook);
 ok(r.stock[0]===4&&r.stock[1]+r.stock[2]+r.stock[3]===3&&r.stock[4]===0,'ground rebels carry the Med Packs, pilots do not '+r.stock);
 ok(r.entry===1,'the squad entry carries the packs '+r.entry);
 ok(r.used[0]===3,'a used pack leaves the armory '+r.used);
 ok(r.noRoom[0]&&r.noRoom[1]===100,'no Infirmary, no new packs '+r.noRoom);
 ok(r.made[0]===1&&r.made[1]===92,'an Infirmary makes a pack in three days for 8 supplies '+r.made);
 ok(r.cap[0]===6&&r.cap[1]===100,'production stops at the cap '+r.cap);
 ok(r.medicPre===3,'Combat Medic +3 Presence '+r.medicPre);
 // ---- space: the database bonus plus the modifier
 await pg.evaluate(()=>window.SR.go('space',{test:true,mission:{kind:'space',missionId:'depotrun',days:2,flight:[{pilotId:'joss',name:'Joss Marrek',first:'Joss',level:4,aim:9,skills:{aim:40,cunning:40,focus:40,presence:38},aimMod:1,init:4,cool:70,cun:1,nv:1,traits:[],cls:'cross',fighterId:'f1',fighterName:'Cross',hull:100}]}}));
 await pg.waitForTimeout(1200);
 const s=await pg.evaluate(()=>{const p=window.DBGspace.ships.find(x=>x.id==='P1').pilot;return [p.aim,p.focusBonus,p.init];});
 ok(s[0]===5&&s[1]===4&&s[2]===4,'the space scene gets skillBonus(40,4)+1 aim and focus 4 '+s);
 // ---- ground: Treat Wound needs a pack
 await pg.evaluate(()=>window.SR.go('ground',{test:true}));
 await pg.waitForTimeout(1200);
 const g=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const reb=U.filter(u=>u.side==='reb'&&!u.auto);
  const [a,h,m]=reb;
  const inj=(u,k)=>f.inflictInjury(u,'ballistic',k);
  a.inj=[];h.inj=[];m.inj=[];
  h.x=a.x+40;h.y=a.y;
  inj(a,'bleeding');inj(a,'brokenarm');
  // no pack
  h.meds=0;
  out.noPack=[f.treatPick(h)===null,f.treatTarget(h)===a,JSON.stringify(f.ordersFor(h)).indexOf('No med pack')>=0];
  const before=a.inj.filter(i=>!i.treated).length;f.doTreat(h);
  out.noPackNoEffect=[a.inj.filter(i=>!i.treated).length===before,h.meds];
  // one pack, one wound for an ordinary rebel
  h.meds=2;f.doTreat(h);
  out.one=[a.inj.filter(i=>!i.treated).length,h.meds,h.packsUsed];
  // the card shows the count
  out.card=JSON.stringify(f.ordersFor(h)).indexOf('Treat wound ×1')>=0;
  // a Combat Medic: one pack, two wounds, and further reach
  a.inj=[];inj(a,'bleeding');inj(a,'brokenarm');
  m.spec='medic';m.meds=1;m.packsUsed=0;h.spec=null;
  m.x=a.x+150;m.y=a.y;h.x=a.x+150;h.y=a.y;
  out.reach=[f.treatPick(h)===null,f.treatPick(m)===a];
  f.doTreat(m);
  out.medic=[a.inj.filter(i=>!i.treated).length,m.meds,m.packsUsed,m.treats];
  // the result carries the packs
  const rec=f.buildResult(true).people.find(q=>q.id===(m.pid||m.id));
  out.rec=rec&&rec.packs;
  return out;
 });
 ok(g.noPack[0]&&g.noPack[1]&&g.noPack[2],'no pack: nothing to treat with, and the card says so '+g.noPack);
 ok(g.noPackNoEffect[0]&&g.noPackNoEffect[1]===0,'treating without a pack does nothing '+g.noPackNoEffect);
 ok(g.one[0]===1&&g.one[1]===1&&g.one[2]===1,'an ordinary rebel treats one wound per pack '+g.one);
 ok(g.card,'the card shows how many packs are left');
 ok(g.reach[0]&&g.reach[1],'a Combat Medic reaches further than anyone else '+g.reach);
 ok(g.medic[0]===0&&g.medic[1]===0&&g.medic[2]===1&&g.medic[3]===2,'a Combat Medic treats two wounds with one pack '+g.medic);
 ok(g.rec===1,'the result reports the pack used '+g.rec);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'blockers-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
