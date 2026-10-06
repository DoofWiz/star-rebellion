/* Juice (art handoff of 2026-10-05: Juice; Shots, impacts and blood; Volleys): node tools/juice-smoke.js
   (needs NODE_PATH=$(npm root -g)). An attack is one roll shown as a volley: the numbers the landing rounds show add
   up to the roll, and a full miss shows one MISS. A grenade freezes the game clock, shakes, throws particles and
   leaves a scorch; a flesh hit leaves blood unless the Blood setting is off; a unit going down topples. Reduced
   motion turns off the shake and the hitstop. Space: repeater fire is a volley too, and a kill breaks the ship
   apart. The shake and blood settings are in the scene menus. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},
             {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
             {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['longiron','cowboy']}];
const spec=sc=>({kind:'ground',missionId:sc,scenario:sc,days:2,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},ctx:{variant:'dataflats'}});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};

 // ---- the base menu carries the two settings
 const bm=await pg.evaluate(()=>{
  const m=document.getElementById('baseMenu');
  const lab=id=>(m.querySelector('#'+id+' span')||{}).textContent;
  const before=lab('menuGore');m.querySelector('#menuGore').click();const after=lab('menuGore');
  m.querySelector('#menuGore').click();
  return [lab('menuShake'),before,after,lab('menuGore'),window.SR.settings.get('gore')].join('|');
 });
 ok(bm==='Screen shake: on|Blood: on|Blood: off|Blood: on|true','the base menu has Screen shake and Blood, and they toggle '+bm);

 await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),spec('intel'));
 await pg.waitForTimeout(700);
 const g=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const J=()=>f.juice_();
  const dax=U.find(u=>u.id==='dax');
  const foe=U.find(u=>u.side==='law'&&!u.veh&&!u.mnt&&!u.auto);
  foe.x=dax.x+260;foe.y=dax.y;foe.arm=0;foe.shd=0;foe.hp=500;foe.maxhp=500;
  const later=ms=>f.juiceTick(f.clock()+ms);
  const nums=()=>J().pops.filter(p=>/^-\d+$/.test(p.text)).reduce((a,p)=>a-(+p.text),0);
  // a hit: the rounds that land split the damage; the total is the roll
  let sums=[];
  for(const [w,d] of [['akli',17],['akli',23],['cowboy',9],['longiron',31],['scatter',14]]){
   J().pops.length=0;f.woundUnit(dax,foe,0,false,'ballistic',w);J().pops.length=0;   // _soak for a plain flesh hit
   foe._soak={riot:0,sd:0,ad:0,hd:d};
   f.fireFx(dax,foe,w,true,d,{done:true});later(3000);
   sums.push(nums()===d);
  }
  out.split=sums.join();
  out.rounds=J().impFx.length>0;
  // a full miss: one MISS, no numbers
  J().pops.length=0;f.fireFx(dax,foe,'akli',false,0,{done:true});later(3000);
  out.miss=[J().pops.filter(p=>p.text==='MISS').length,nums()].join();
  // rounds wait for the attack's damage
  J().pops.length=0;const res={done:false};f.fireFx(dax,foe,'akli',true,12,res);later(3000);
  const waited=J().pops.length;res.done=true;later(3000);
  out.wait=[waited,nums()].join();
  // blood: on a flesh hit with the setting on, never with it off
  const dec=()=>f.decals_().filter(d=>d.blood).length;
  const b0=dec();foe._soak={riot:0,sd:0,ad:0,hd:20};f.fireFx(dax,foe,'akli',true,20,{done:true});later(3000);
  const b1=dec();window.SR.settings.set('gore',false);foe._soak={riot:0,sd:0,ad:0,hd:20};f.fireFx(dax,foe,'akli',true,20,{done:true});later(3000);
  out.blood=[b1>b0,dec()===b1,window.SR_ART.impact&&true].join();window.SR.settings.set('gore',true);
  // hit feedback on the pose; the topple
  f.woundUnit(dax,foe,5,false,'ballistic','akli');
  const p1=f.artPose(foe,f.clock());out.flash=[p1.flash>0,p1.squash>0].join();
  foe.hp=1;f.woundUnit(dax,foe,30,false,'ballistic','akli');
  const p2=f.artPose(foe,f.clock()+300);out.fall=[foe.down,p2.state,p2.fall>0&&p2.fall<1,J().pops.some(p=>p.text==='DEAD')].join();   // an enemy dies (DESIGN_BLOCKERS C-29)
  // a grenade: hitstop, shake, particles, scorch
  f.juiceOn(true);
  const sc0=f.decals_().filter(d=>!d.blood).length;
  f.explode(dax.x+600,dax.y+300,{r:100});
  const j=J();
  out.grenade=[j.stopped,j.trauma>0.3,j.parts.some(p=>p.kind==='debris'),f.decals_().filter(d=>!d.blood).length>sc0].join();
  // the game clock stands still through the hitstop
  const c0=f.clock();const t0=performance.now();while(performance.now()-t0<30){}
  out.frozen=f.clock()===c0;
  // the ground menu carries the settings
  const m=document.getElementById('gMenu');
  out.menu=[!!m.querySelector('#menuShake'),!!m.querySelector('#menuGore')].join();
  return out;
 });
 ok(g.split==='true,true,true,true,true','the numbers on the landing rounds add up to the roll '+g.split);
 ok(g.rounds,'landing rounds draw impacts');
 ok(g.miss==='1,0','a full miss shows one MISS and no numbers '+g.miss);
 ok(g.wait==='0,12','rounds wait to land until the damage is in '+g.wait);
 ok(g.blood==='true,true,true','a flesh hit bleeds; with Blood off it does not '+g.blood);
 ok(g.flash==='true,true','a hit flashes and squashes the target '+g.flash);
 ok(g.fall==='1,down,true,true','going down topples over about 0.6 s, with a DEAD pop for an enemy '+g.fall);
 ok(g.grenade==='true,true,true,true','a grenade freezes, shakes, throws debris and scorches '+g.grenade);
 ok(g.frozen,'the game clock stands still in a hitstop');
 ok(g.menu==='true,true','the ground menu has Screen shake and Blood '+g.menu);

 // ---- reduced motion: no shake, no hitstop
 await pg.emulateMedia({reducedMotion:'reduce'});
 const rm=await pg.evaluate(()=>{
  const f=window.DBGground.fn;f.juiceOn(true);
  const tr=f.juice_().trauma;f.explode(200,200,{r:100});
  return [f.juice_().stopped,window.SR.settings.shake()].join();
 });
 ok(rm==='false,false','with reduced motion nothing freezes or shakes '+rm);
 await pg.emulateMedia({reducedMotion:'no-preference'});

 // ---- space: a volley, and a kill
 await pg.evaluate(()=>{const flight=[{pilotId:'sera',name:'Sera Kest',first:'Sera',level:3,aim:3,cool:72,tr:[],cls:'talon',fighterId:'f1',fighterName:'Talon 1',hull:100,loadout:['bls-t-light-repeaters']}];
  window.SR.go('space',{test:true,mission:{kind:'space',missionId:'x',days:0,flight}});});
 await pg.waitForTimeout(500);
 const sp=await pg.evaluate(()=>{
  const D=window.DBGspace,f=D.fn,out={};
  const me=D.ships.find(s=>s.faction==='reb'),foe=D.ships.find(s=>s.faction==='heg');
  foe.x=me.x+200;foe.y=me.y;me.h=0;
  const c={s:me,t:foe,wkey:'w0',hit:true,atk:null,need:10,roll:15};
  f.fireCtx(c,f.clock());
  const J=f.juice_();
  out.vol=[!!c.vol,J.vols.length].join();
  f.applyCtx(c);f.juiceTick(f.clock()+5000);
  const sum=J.pops.filter(p=>/^-\d+$/.test(p.text)).reduce((a,p)=>a-(+p.text),0);
  out.sum=sum===c.dmg;
  f.destroyShip(foe,me);
  out.kill=J.killFx.length===1;
  const m=document.getElementById('sMenu');
  out.menu=[!!m.querySelector('#menuShake'),!!m.querySelector('#menuGore')].join();
  return out;
 });
 ok(sp.vol==='true,1','space repeater fire is a volley '+sp.vol);
 ok(sp.sum,'the volley’s numbers add up to the hit');
 ok(sp.kill,'a kill breaks the ship apart');
 ok(sp.menu==='true,true','the space menu has Screen shake and Blood '+sp.menu);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'juice-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
