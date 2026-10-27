/* Armour and shields in ground combat (Ground Combat doc; DESIGN_BLOCKERS M-16), the Razorrat emplacement (C-9),
   and the Deploy option for owned vehicles (C-8). node tools/armour-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy'],head:'hardhat',body:'policevest'},
             {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy'],head:'cowboyhat'},
             {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['longiron','cowboy']}];
const spec=(sc,extra)=>Object.assign({kind:'ground',missionId:sc,scenario:sc,days:2,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'}},extra||{});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const go=async(m)=>{await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),m);await pg.waitForTimeout(700);};

 // ---- the table: armour on armour items, hats are cosmetic, weapon traits
 const t=await pg.evaluate(()=>{
  const I=window.Items,P=ids=>{const p=I.protection(ids);return p.arm+'/'+p.shd;};
  return {prot:[P(['hardhat']),P(['policehelmet']),P(['autohelm']),P(['policevest']),P(['cowboyhat']),P(['cap']),P(['hardhat','policevest'])].join(' '),
    traits:['scatter','longiron','hg40','stiletto','razorrat','akli'].map(k=>k+':'+(I.get(k).sundering?'S':'')+(I.get(k).piercing?'P':'')).join(' '),
    weights:JSON.stringify(window.SRDB.raw.market_weights.map(r=>[r.rev,r.weapon,r.gadget,r.merc,r.armour,r.shipwpn,r.vehicle,r.ship]))};
 });
 ok(t.prot==='10/0 12/0 15/0 20/0 0/0 0/0 30/0','armour items give an armour bar; the Cowboy Hat and Baseball Cap give none '+t.prot);
 ok(t.traits==='scatter:P longiron:P hg40:S stiletto:S razorrat:P akli:','Sundering and Piercing follow the Gear doc '+t.traits);
 ok(t.weights==='[[1,28,24,14,12,10,8,4]]','the Black Market weights live in the database '+t.weights);

 // ---- in a fight: who wears what, and how a hit drains the bars
 await go(spec('intel',{ctx:{variant:'dataflats'}}));
 const a=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const by=id=>U.find(u=>u.id===id);
  const dax=by('dax'),runa=by('runa'),kel=by('kel');
  out.worn=[dax.maxArm,dax.arm,runa.maxArm,kel.maxArm].join();
  const vest=U.find(u=>u.side==='law'&&!u.veh&&(u.kit||[]).includes('policevest'));
  out.foe=vest?[vest.maxArm,window.Items.protection(vest.kit).arm].join():'none';
  const car=U.find(u=>u.id==='pc1');out.car=[car.maxhp,car.maxArm].join();
  // a plain hit drains armour first and leaves health alone
  const fresh=(arm,shd)=>{const u=f.mkU({id:'t'+Math.random(),side:'law',hp:100,maxhp:100,arm,shdCap:shd||0,x:0,y:0,def:10});return u;};
  let u=fresh(30);f.soak(u,20,'akli');out.plain=[u.arm,u.hp].join();
  // Sundering tears armour 1.5x; Piercing sends a quarter past it
  u=fresh(30);let r=f.soak(u,10,'hg40');out.sunder=[u.arm,r.hd].join();
  u=fresh(30);r=f.soak(u,20,'longiron');out.pierce=[u.arm,r.hd].join();
  // what a broken bar cannot hold spills through
  u=fresh(10);r=f.soak(u,30,'akli');out.spill=[u.arm,r.hd].join();
  // a shield is empty until raised, then takes the hit before armour
  u=fresh(10,15);out.shd0=u.shd;f.raiseShield(u);out.shdUp=u.shd;r=f.soak(u,20,'akli');out.shield=[u.shd,u.arm,r.hd].join();
  // woundUnit: armour soaks the whole hit, so no wound and no critical injury
  const w=fresh(30);w.side='reb';w.tr=[];f.woundUnit(null,w,12,true,'ballistic','akli');out.wound=[w.hp,w.arm,!!(w.inj&&w.inj.length),w.wound].join();
  // once the armour is gone the hit lands on health
  w.arm=0;f.woundUnit(null,w,12,false,'ballistic','akli');out.after=w.hp;
  // the rail shows armour bars over the health bar
  out.row=/sr-hp--layer/.test(f.unitRow(dax));
  return out;
 });
 ok(a.worn==='30,30,0,0','Dax wears hardhat and vest (30); a Cowboy Hat adds nothing '+a.worn);
 ok(/^(\d+),\1$/.test(a.foe)&&parseInt(a.foe)>=20,'a lawman in a Police Vest wears its armour '+a.foe);
 ok(a.row,'the rail draws armour over the health bar');
 ok(a.car==='100,30','a cruiser carries its own vehicle armour '+a.car);
 ok(a.plain==='10,100','a hit drains armour before health '+a.plain);
 ok(a.sunder==='15,0','Sundering tears armour faster '+a.sunder);
 ok(a.pierce==='15,5','Piercing sends a quarter of the hit past the armour '+a.pierce);
 ok(a.spill==='0,20','a broken bar spills the rest through '+a.spill);
 ok(a.shd0===0&&a.shdUp===15&&a.shield==='0,5,0','a raised shield is hit before armour and health '+[a.shd0,a.shdUp,a.shield]);
 ok(a.wound==='100,18,false,0','armour that soaks the whole hit stops wounds and criticals '+a.wound);
 ok(a.after===88,'with the armour gone the hit lands on health '+a.after);

 // ---- Steal the Cross: the Razorrat LMG on the pad (C-9)
 await go(spec('stealcross',{pilot:{id:'sera',name:'Sera Kest',first:'Sera'}}));
 const c=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const dax=U.find(u=>u.id==='dax');
  const T=f.SCENARIOS_().stealcross.TURRET;
  f.manTurret(dax);
  out.gun=f.wpnsOf(dax).join();
  const law=U.find(u=>u.side==='law'&&!u.veh);
  const face=Math.PI;   // the gun faces west
  dax.x=T.x;dax.y=T.y;
  law.x=T.x-300;law.y=T.y;law.wkey=f.wpnsOf(law)[0];
  // fire once to the west so the gun faces there, then compare a shot from the front and from the side
  f.fireFx(dax,law,'razorrat',false);
  const front=f.computeTN(law,dax).entries.map(e=>e[0]).join('|');
  law.x=T.x;law.y=T.y+300;
  const side=f.computeTN(law,dax).entries.map(e=>e[0]).join('|');
  out.cover=[/SANDBAGS/.test(front),/SANDBAGS/.test(side)].join();
  out.blocked=f.validShot(law,dax,law.wkey);
  return out;
 });
 ok(c.gun==='razorrat','the pad emplacement is a Razorrat LMG '+c.gun);
 ok(c.cover==='true,false','its sandbags cover the front, not the side '+c.cover);

 // ---- an owned vehicle adds Deploy to the Fire Support menu (C-8)
 await go(spec('intel',{assets:{drop:false,ships:[],vehicles:[{id:'pc_9',name:'Old Faithful',type:'police',kind:'vehicle',hp:100,maxhp:100,hpPct:100,arm:30}]}}));
 const d=await pg.evaluate(()=>{const f=window.DBGground.fn;f.alertTown('test');return f.fsItems().map(i=>i.name).join();});
 ok(d==='Deploy Old Faithful','the menu reads Deploy [vehicle] '+d);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'armour-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
