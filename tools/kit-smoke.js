/* The Back slot, deployables, fire modes and weapon traits (Gear doc; art handoff of 2026-10-05; DESIGN_BLOCKERS
   C-25, M-25, M-27). node tools/kit-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy'],back:'razorrat'},
             {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy'],back:'riotshield'},
             {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['longiron','cowboy']}];
const spec=(sc,extra)=>Object.assign({kind:'ground',missionId:sc,scenario:sc,days:2,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'}},extra||{});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};

 // ---- base: the Back slot (Soldiers, Marines and Heroes; not Pilots), and what goes in it
 const base=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={};
  const dax=G.people.find(p=>p.id==='dax'),joss=G.people.find(p=>p.id==='joss');
  out.slots=[f.gearSlots(dax).some(s=>s.k==='back'),f.gearSlots(joss).some(s=>s.k==='back')].join();
  window.Items.grant(G.armory,'razorrat',1,'bought');
  dax.gear.back=null;f.autoEquip();
  out.equip=dax.gear.back||G.people.filter(p=>p.gear&&p.gear.back==='razorrat').length;
  const e=f.squadEntry(G.people.find(p=>p.gear&&p.gear.back==='razorrat'),false);
  out.entry=e.back;
  out.live=[window.Items.get('razorrat').live,window.Items.get('riotshield').live].join();
  out.modes=[window.Items.modes('akli').join('|'),window.Items.defaultMode('akli'),window.Items.defaultMode('cowboy'),window.Items.traits('longiron').join('|')].join(' ');
  return out;
 });
 ok(base.slots==='true,false','Soldiers have a Back slot, Pilots do not '+base.slots);
 ok(base.equip==='razorrat'||base.equip===1,'auto-equip puts a Razorrat in a Back slot '+base.equip);
 ok(base.entry==='razorrat','the squad entry carries the back item '+base.entry);
 ok(base.live==='true,true','the Razorrat and the Riot Shield are live '+base.live);
 ok(base.modes==='auto|semi semi single single|steady|piercing','fire modes and traits from the items table; the default is the mode with no penalty '+base.modes);

 // ---- ground: deploy, the shield, fire modes, Steady, Knockback
 await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),spec('intel',{ctx:{variant:'dataflats'}}));
 await pg.waitForTimeout(700);
 const g=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const by=id=>U.find(u=>u.id===id);
  const dax=by('dax'),runa=by('runa'),kel=by('kel');
  const foe=U.find(u=>u.side==='law'&&!u.veh&&!u.mnt);
  // the Deploy card, then the Razorrat goes up where Dax stands and he gets behind it
  out.card=f.ordersFor(dax).join('').indexOf('data-ract="deploy"')>=0;
  const at=[dax.x,dax.y];
  out.dep=[f.doDeploy(dax),f.turretOn(),dax.manning,dax.back,f.wpnsOf(dax).join()].join();
  out.place=dax.x===at[0]&&dax.y===at[1];
  // one emplacement per map
  out.second=f.canDeploy(runa)&&runa.back==='riotshield';
  // the riot shield: into the hands, the primary slung, a frontal shield that breaks
  out.shield=[f.doDeploy(runa),runa.shield,runa.shieldHp,runa.wpns.join()].join();
  foe.x=runa.x+200;foe.y=runa.y;runa.face=0;foe.arm=0;
  const hp0=runa.hp,arm0=runa.arm;f.woundUnit(foe,runa,20,false,'ballistic','hg40');
  out.front=[runa.hp===hp0&&runa.arm===arm0,runa.shieldHp].join();
  f.woundUnit(foe,runa,50,false,'ballistic','hg40');
  out.broke=[runa.shield,!!runa.shieldBroke,runa.hp+runa.arm<hp0+arm0].join();
  out.result=JSON.stringify((f.buildResult(true).people.find(p=>p.id==='runa')||{}).broke||null);
  // fire modes: automatic -5, fan -5 and double damage, semi +1 a round on the same target
  const atkOf=(s,t,w)=>f.computeATK(s,t,w,false);
  const kAkli=atkOf(kel,foe,'akli').total;
  f.setMode(kel,'akli','auto');out.auto=atkOf(kel,foe,'akli').total-kAkli;
  f.setMode(kel,'akli','semi');
  kel.semiT=foe.id;kel.semiN=2;out.semi=atkOf(kel,foe,'akli').total-kAkli;
  kel.semiN=0;kel.semiT=null;
  f.afterShot(kel,foe,'akli',false,{total:12},{total:3});f.afterShot(kel,foe,'akli',false,{total:12},{total:3});
  out.chain=[kel.semiT===foe.id,kel.semiN].join();
  f.setMode(kel,'cowboy','fan');
  let d1=0,d2=0;for(let i=0;i<300;i++){d1+=f.rollDamage(kel,foe,'cowboy',false);}
  f.setMode(kel,'cowboy','single');for(let i=0;i<300;i++){d2+=f.rollDamage(kel,foe,'cowboy',false);}
  out.fan=Math.round(d1/d2*10)/10;
  // the toggle shows only for a weapon with two or more modes
  out.toggle=[/data-fmode="auto"/.test(f.modeToggleHTML(kel,'akli')),f.modesOf('longiron').length].join();
  // Steady: the Longhorn takes +2 braced; the Akli takes nothing braced any more
  kel.braced=1;
  out.steady=[atkOf(kel,foe,'longiron').entries.some(e=>e[0]==='STEADY'),atkOf(kel,foe,'akli').entries.some(e=>e[0]==='STEADY'||e[0]==='BRACED')].join();
  kel.braced=0;kel.steadyT=foe.id;out.held=atkOf(kel,foe,'longiron').entries.some(e=>e[0]==='STEADY');kel.steadyT=null;
  // Knockback: a rocket hit shoves the target away
  const x0=foe.x,y0=foe.y;kel.x=foe.x-200;kel.y=foe.y;foe.hp=500;foe.maxhp=500;
  f.knockBack(kel,foe);out.knock=Math.hypot(foe.x-x0,foe.y-y0)>20;
  return out;
 });
 ok(g.card,'a rebel with a deployable on their back gets the Deploy order');
 ok(g.dep==='true,true,1,,razorrat','Deploy sets up the Razorrat and the rebel mans it '+g.dep);
 ok(g.place,'the gun is set up where they stood');
 ok(g.shield==='true,1,60,cowboy','the riot shield goes into the hands, the Akli is slung '+g.shield);
 ok(g.front==='true,40','a hit from the front lands on the riot shield '+g.front);
 ok(g.broke==='0,true,true','the shield breaks and the rest gets through '+g.broke);
 ok(g.result==='["riotshield"]','a broken shield is reported as used up '+g.result);
 ok(g.auto===-5,'automatic is -5 to hit '+g.auto);
 ok(g.semi===2,'semi-auto adds its chain on the same target '+g.semi);
 ok(g.chain==='true,2','each semi-auto shot at the same target adds one '+g.chain);
 ok(g.fan===2,'fan hammer doubles the damage '+g.fan);
 ok(g.toggle==='true,1','the toggle is offered for the Akli, not the single-mode Longhorn '+g.toggle);
 ok(g.steady==='true,false','holding gives +2 only with a Steady weapon '+g.steady);
 ok(g.held,'holding fire on a target primes Steady for it');
 ok(g.knock,'Knockback shoves the target');

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'kit-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
