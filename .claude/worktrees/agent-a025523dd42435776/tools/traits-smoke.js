/* Smoke test for Character Traits: node tools/traits-smoke.js
   Needs: NODE_PATH=$(npm root -g). Loads the game in #test mode, checks that every rebel has a trait,
   that every trait's dossier card renders, and drives each live ground trait through the real combat functions. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];
 const ok=(c,m)=>{if(!c)fails.push(m);};
 const r1=await pg.evaluate(()=>{
  const G=window.DBGbase.G,R=window.Rebel;
  const out={};
  out.people=G.people.map(p=>[p.id,p.charTrait,p.first,p.last]);
  out.count=R.CT.length;
  out.live=R.CT.filter(t=>t.live).map(t=>t.k);
  // generator: every role gets a valid trait, Support never gets a pure combat trait
  const bad=[];let n=0;const taken=new Set();
  for(const role of ['Soldier','Pilot','Support','Marine'])for(let i=0;i<400;i++){
    const g=R.gen(role,taken,Math.random);taken.add(g.name);n++;
    const t=R.CTK[g.charTrait];
    if(!t)bad.push('missing '+g.charTrait);
    else if(role==='Support'&&!/b|m/.test(t.where))bad.push('support got '+t.k);
  }
  out.bad=bad;
  // xp multiplier
  const q={level:1,xp:0,charTrait:'quicklearner'},s={level:1,xp:0,charTrait:'slowlearner'};
  R.gainXp(q,0.5);R.gainXp(s,0.5);out.xp=[q.xp,s.xp];
  return out;
 });
 ok(r1.count===45,'45 character traits, got '+r1.count);
 ok(r1.people.every(p=>p[1]&&p[2]),'every starting rebel has a trait and a first name: '+JSON.stringify(r1.people));
 ok(r1.people.find(p=>p[0]==='joss')[1]==='reckless'&&r1.people.find(p=>p[0]==='kel')[1]==='hunter','authored traits kept');
 ok(r1.bad.length===0,'generator: '+r1.bad.slice(0,5));
 ok(Math.abs(r1.xp[0]-0.55)<1e-9&&Math.abs(r1.xp[1]-0.45)<1e-9,'xp multipliers '+r1.xp);
 // dossier renders for every trait, no page errors
 const r2=await pg.evaluate(()=>{
  const D=window.DBGbase,G=D.G,R=window.Rebel;
  const missing=[];
  for(const t of R.CT){
    G.people[1].charTrait=t.k;
    const html=D.fn.dossierHead?D.fn.dossierHead(G.people[1]):null;
    if(html===null)return {skip:true};
    if(html.indexOf(t.n)<0)missing.push(t.k);
  }
  return {missing};
 });
 if(!r2.skip)ok(r2.missing.length===0,'dossier missing '+r2.missing);
 // ground: drive the real combat functions
 await pg.evaluate(()=>window.SR.go('ground',{}));
 await pg.waitForTimeout(1500);
 const r3=await pg.evaluate(()=>{
  const g=window.DBGground,f=g.fn,res={};
  const base=(tr,extra)=>f.mkU(Object.assign({id:'t'+Math.random(),name:'T',first:'T',side:'reb',x:100,y:100,hp:100,maxhp:100,aim:2,def:12,cool:65,level:1,wpns:['akli'],tr},extra||{}));
  const foe=f.mkU({id:'f',name:'F',first:'F',side:'law',x:300,y:100,hp:100,maxhp:100,aim:2,def:10,cool:65,wpns:['cowboy']});
  const atk=(u,e)=>f.computeATK(u,foe,'akli',false).total;
  const plain=base([]);
  const a0=atk(plain);
  res.steady=atk(base(['steady']))-a0;
  res.perfectionist=atk(base(['perfectionist']))-a0;
  res.patientHold=atk(base(['patient'],{braced:1}))-atk(base([],{braced:1}));
  res.restlessHold=atk(base(['restless'],{braced:1}))-atk(base([],{braced:1}));
  res.hegsoldier=atk(base(['hegsoldier']))-a0;
  res.speed=[f.speedMul(base(['restless'])),f.speedMul(base(['cautious'])),f.speedMul(base([]))];
  // cool: brave halves, cowardly +50%
  const cl=(tr)=>{const u=base(tr);u.cool=65;f.adjCoolG(u,-20,'took a hit');return 65-u.cool;};
  res.cool=[cl([]),cl(['brave']),cl(['cowardly'])];
  const loy=(tr)=>{const u=base(tr);u.cool=65;f.adjCoolG(u,-16,'Kel down');return 65-u.cool;};
  res.loyal=[loy([]),loy(['loyal'])];
  // damage
  const dmg=(s,t,crit)=>{let tot=0;for(let i=0;i<400;i++)tot+=f.rollDamage(s,t,'akli',crit);return tot/400;};
  const d0=dmg(plain,foe,false);
  res.reckless=dmg(base(['reckless'],{reck:2}),foe,false)/d0;
  res.shortfuse=dmg(base(['shortfuse'],{fuse:2}),foe,false)/d0;
  res.hegdmg=dmg(base(['hegsoldier']),foe,false)/d0;
  // woundUnit: cautious -10%, lucky survives lethal ~5%, selfpres cancels crit wound
  const hurt=(tr,n,dm,crit)=>{let out=0;for(let i=0;i<n;i++){const t=base(tr);t.hp=dm;t.side='reb';f.woundUnit(foe,t,dm,crit);out+=t.hp>0?1:0;}return out/n;};
  const t1=base(['cautious']);t1.hp=100;f.woundUnit(foe,t1,50,false);res.cautious=100-t1.hp;
  res.lucky=hurt(['lucky'],2000,40,false);res.notLucky=hurt([],200,40,false);
  const wd=(tr)=>{let w=0;for(let i=0;i<600;i++){const t=base(tr);t.hp=100;f.woundUnit(foe,t,10,true);w+=t.wound?1:0;}return w/600;};
  res.selfpres=[wd([]),wd(['selfpres'])];
  const sf=base(['shortfuse']);sf.hp=100;f.woundUnit(foe,sf,5,false);res.fuseSet=sf.fuse;
  // Scrawny (key 'weak'): +2 defence when attacked on the ground
  foe.wkey=f.wpnsOf(foe)[0];res.scrawny=f.computeTN(foe,base(['weak'])).total-f.computeTN(foe,base([])).total;
  // jam / crit rolls
  const jr=(tr,roll)=>{let j=0;for(let i=0;i<2000;i++)if(f.jamRoll(base(tr),'akli',roll))j++;return j/2000;};
  res.jam1=[jr([],1),jr(['neatfreak'],1)];
  res.clumsyJam=[jr([],7),jr(['clumsy'],7)];
  res.crit=[f.critRoll(19,base([])),f.critRoll(19,base(['unlucky'])),f.critRoll(18,base(['reckless'],{reck:2})),f.critRoll(18,base(['reckless'],{reck:0}))];
  // initiative: nervous lower in round 1, perfectionist always last
  const ik=(tr)=>{let t=0;for(let i=0;i<500;i++)t+=f.initKey(base(tr));return t/500;};
  res.init=[ik([]),ik(['nervous']),ik(['perfectionist'])];
  res.hunter=f.viewMul(base(['hunter']));
  return res;
 });
 const near=(a,b,e)=>Math.abs(a-b)<=e;
 ok(r3.steady===1,'steady +1: '+r3.steady);
 ok(r3.perfectionist===3,'perfectionist +3: '+r3.perfectionist);
 ok(r3.patientHold===2&&r3.restlessHold===-2,'hold traits '+r3.patientHold+','+r3.restlessHold);
 ok(r3.hegsoldier===2,'hegemony soldier +2: '+r3.hegsoldier);
 ok(near(r3.speed[0],1.2,1e-9)&&near(r3.speed[1],0.9,1e-9)&&r3.speed[2]===1,'speed '+r3.speed);
 ok(r3.cool[0]===20&&r3.cool[1]===10&&r3.cool[2]===30,'cool '+r3.cool);
 ok(r3.loyal[0]===16&&r3.loyal[1]===8,'loyal '+r3.loyal);
 ok(near(r3.reckless,1.2,0.06),'reckless dmg '+r3.reckless);
 ok(near(r3.shortfuse,1.1,0.05),'short fuse dmg '+r3.shortfuse);
 ok(near(r3.hegdmg,1.05,0.04),'hegemony soldier dmg '+r3.hegdmg);
 ok(r3.cautious===45,'cautious -10%: '+r3.cautious);
 ok(r3.lucky>0.02&&r3.lucky<0.09&&r3.notLucky===0,'lucky survive rate '+r3.lucky+' / '+r3.notLucky);
 ok(r3.selfpres[1]<r3.selfpres[0]*0.6&&r3.selfpres[0]>0.9,'self-preserving wounds '+r3.selfpres);
 ok(r3.fuseSet===2,'short fuse armed');
 ok(r3.jam1[0]===1&&r3.jam1[1]>0.6&&r3.jam1[1]<0.85,'jam on 1: '+r3.jam1);
 ok(r3.clumsyJam[0]===0&&r3.clumsyJam[1]>0.02&&r3.clumsyJam[1]<0.09,'clumsy jam '+r3.clumsyJam);
 ok(JSON.stringify(r3.crit)==='[false,true,true,false]','crit rolls '+r3.crit);
 ok(r3.init[1]<r3.init[0]-2&&r3.init[2]<-50,'initiative '+r3.init);
 ok(r3.hunter===1.2,'hunter vision');
 ok(r3.scrawny===2,'Scrawny is +2 defence '+r3.scrawny);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'traits-smoke: all checks passed');
 await b.close();
 process.exit(fails.length?1:0);
})();
