/* Smoke test for per-rebel morale: node tools/morale-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const R=window.Rebel,D=window.DBGbase,f=D.fn,out={};
  const G=()=>D.G;
  // bands
  out.bands=[0,20,20.5,40,41,60,61,80,81,100].map(m=>R.mband({morale:m}).k).join(',');
  // trait bends
  const bump=(tr,d,kind)=>{const p={id:'a',role:'Soldier',level:1,charTrait:tr,morale:50};R.moraleBump(p,d,kind);return p.morale-50;};
  out.bump={plain:bump('brave',10,'win'),idealWin:bump('idealist',10,'win'),idealLoss:bump('idealist',-10,'loss'),idealRest:bump('idealist',10,'rest'),cyn:[bump('cynical',10,'win'),bump('cynical',-10,'loss')],loyalDeath:bump('loyal',-10,'death'),loyalLoss:bump('loyal',-10,'loss')};
  const clampP={role:'Soldier',level:1,morale:98};R.moraleBump(clampP,50,'win');const clampL={role:'Soldier',level:1,morale:3};R.moraleBump(clampL,-50,'loss');out.clamp=[clampP.morale,clampL.morale];
  // performance nudges
  const mk=m=>({role:'Soldier',level:5,sx:{},morale:m});
  out.aim=[R.aimOf(mk(5),'g'),R.aimOf(mk(50),'g'),R.aimOf(mk(95),'g')];
  out.cool=[R.coolOf(mk(5),'g'),R.coolOf(mk(30),'g'),R.coolOf(mk(50),'g'),R.coolOf(mk(70),'g'),R.coolOf(mk(95),'g')];
  const sq=(m)=>{const p=G().people.find(x=>x.id==='dax');p.morale=m;const e=f.squadEntry(p,false);return [e.aim,e.cool];};
  out.entry=[sq(5),sq(95)];
  // base mood is the average
  G().people.forEach((p,i)=>p.morale=40+i*10);f.mood();
  const avg=G().people.reduce((a,p)=>a+p.morale,0)/G().people.length;out.mood=[G().morale,avg];
  // team vs everyone
  G().people.forEach(p=>p.morale=60);
  f.moraleAll(2,'win',['dax'],6);out.team=[G().people.find(p=>p.id==='dax').morale,G().people.find(p=>p.id==='joss').morale];
  // injury in a debrief: self -5, squadmates -2, others -0.5
  G().people.forEach(p=>p.morale=60);
  f.applyDebrief({missionId:'none',days:0,people:[{id:'dax',xp:0,state:'injured',dur:2},{id:'runa',xp:0,state:'ok'}]});
  const m=id=>G().people.find(p=>p.id===id).morale;
  out.injury=[m('dax'),m('runa'),m('kel'),m('joss')];
  // death: everyone -6, mission team -10 (rolls pinned so no trait is granted on the side)
  f.setRng(()=>0.99);
  G().people.forEach(p=>p.morale=60);
  f.applyDebrief({missionId:'none',days:0,people:[{id:'kel',xp:0,state:'lost'},{id:'runa',xp:0,state:'ok'}]});
  out.death=[G().people.some(p=>p.id==='kel'),m('runa'),m('dax'),m('joss')];
  // the daily pulse: warn at <=20, desertion at 0, drift toward steady, nobody on a mission leaves
  const dax=G().people.find(p=>p.id==='dax'),runa=G().people.find(p=>p.id==='runa'),joss=G().people.find(p=>p.id==='joss');
  dax.morale=15;f.moraleTick();out.warned=!!dax.mwarn;out.driftUp=dax.morale>15;
  runa.morale=0;runa.assign='mission';f.moraleTick();out.missionStays=G().people.some(p=>p.id==='runa');
  runa.assign='rest';f.moraleTick();out.deserted=!G().people.some(p=>p.id==='runa');
  joss.morale=100;f.moraleTick();out.driftDown=joss.morale<100;
  // charismatic lifts others, not themselves twice
  G().people.forEach(p=>{p.morale=60;});joss.charTrait='charismatic';f.moraleTick();out.charm=[joss.morale,dax.morale];
  // old saves: a rebel without morale gets the default
  const old={id:'z',name:'Zed Old',role:'Soldier',level:2,xp:0};R.migrate(old);out.migrated=old.morale;
  // dossier shows it
  out.row=f.dossierHead(G().people.find(p=>p.id==='dax')).indexOf('Morale')>=0;
  return out;
 });
 ok(r.bands==='vlow,vlow,low,low,mid,mid,high,high,vhigh,vhigh','bands '+r.bands);
 ok(r.bump.plain===10&&Math.abs(r.bump.idealWin-13)<1e-9&&Math.abs(r.bump.idealLoss+13)<1e-9&&r.bump.idealRest===10,'idealist '+JSON.stringify(r.bump));
 ok(Math.abs(r.bump.cyn[0]-7)<1e-9&&Math.abs(r.bump.cyn[1]+7)<1e-9,'cynical '+r.bump.cyn);
 ok(r.bump.loyalDeath===-5&&r.bump.loyalLoss===-10,'loyal '+r.bump.loyalDeath+','+r.bump.loyalLoss);
 ok(r.clamp[0]===100&&r.clamp[1]===0,'clamp '+r.clamp);
 ok(r.aim[0]===r.aim[1]-1&&r.aim[2]===r.aim[1]+1,'aim nudges '+r.aim);
 ok(r.cool[0]<r.cool[1]&&r.cool[1]<r.cool[2]&&r.cool[2]<r.cool[3]&&r.cool[3]<r.cool[4],'cool bands '+r.cool);
 ok(r.entry[1][0]>r.entry[0][0]&&r.entry[1][1]>r.entry[0][1],'squad entry follows morale '+JSON.stringify(r.entry));
 ok(Math.abs(r.mood[0]-r.mood[1])<1e-9,'mood is the average '+r.mood);
 ok(r.team[0]===66&&r.team[1]===62,'team vs everyone '+r.team);
 ok(r.injury[0]===55&&r.injury[1]===58&&r.injury[2]===59.5&&r.injury[3]===59.5,'injury '+r.injury);
 ok(r.death[0]===false&&r.death[1]===50&&r.death[2]===54&&r.death[3]===54,'death '+r.death);
 ok(r.warned&&r.driftUp,'warning and drift up');
 ok(r.missionStays&&r.deserted,'desertion rules');
 ok(r.driftDown,'drift down from the top');
 ok(r.charm&&r.charm[1]>60&&r.charm[0]<r.charm[1],'charisma '+r.charm);
 ok(r.migrated===60,'migrated morale '+r.migrated);
 ok(r.row,'dossier morale row');
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'morale-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
