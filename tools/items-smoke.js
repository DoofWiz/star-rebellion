/* The item table and the Items module: node tools/items-smoke.js (needs NODE_PATH=$(npm root -g)).
   Every item the game names exists in game/data/db.json's items table, and the scenes build their tables from it:
   the base's KIT, the ground scene's WPN, damage types and icons, the market's stat rows, loot crates and drops.
   Items.grant is the only way in, and refuses ids it does not know. */
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
  const I=window.Items,D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const rows=I.rows;
  const sprite=new Set([...document.querySelectorAll('symbol[id^="i-"]')].map(s=>s.id.slice(2)));
  out.n=rows.length;
  out.noIcon=rows.filter(x=>!sprite.has(x.icon)).map(x=>x.id+':'+x.icon);
  // the base's KIT is the owned part of the table, field for field
  const KIT=f.KIT_();
  out.kitIds=Object.keys(KIT).join()===rows.filter(x=>x.category!=='builtin').map(x=>x.id).join();
  out.kitAkli=[KIT.akli.name,KIT.akli.slot,KIT.akli.w,KIT.akli.price,KIT.akli.live,KIT.akli.maker].join();
  out.kitCarbine=[KIT.carbine.heg,KIT.carbine.price===undefined,KIT.baton.live].join();
  // every live weapon has combat stats; no weapon slot holds a builtin
  out.liveNoStats=rows.filter(x=>x.category==='weapon'&&x.live&&x.damage_min==null).map(x=>x.id);
  // the starting armory comes from the table
  out.start=G().armory.map(a=>a.id+':'+a.n+':'+(a.src||'')).join();
  // grant, take and the guards
  const arm=[];
  I.grant(arm,'akli',2,'looted');I.grant(arm,'akli',1,'bought');
  out.grant=[arm.length,arm[0].n,arm[0].src,arm[0].name].join();
  out.take=[I.take(arm,'akli',5),arm.length].join();
  const threw=fn=>{try{fn();return false;}catch(e){return true;}};
  out.guards=[threw(()=>I.grant(arm,'Scattergun')),threw(()=>I.grant(arm,'fists')),threw(()=>I.grant(arm,'nope'))].join();
  // pools and rolls
  out.poolHegWeapons=I.pool({cat:'weapon',heg:true}).join();
  out.poolHegAll=I.pool({cat:'weapon',heg:true,live:false}).join();
  let a=7;const rng=()=>{a=(a*16807)%2147483647;return a/2147483647;};
  const seen={};for(let i=0;i<200;i++){const id=I.roll({cat:'armour',sold:true},rng);seen[id]=(seen[id]||0)+1;}
  out.rollArmour=Object.keys(seen).sort().join();
  out.rollWeighted=I.roll({cat:'weapon',sold:true},rng,x=>x.id==='longiron'?1:0);
  out.rollEmpty=I.roll({cat:'weapon',maker:'aerostar'},rng);
  return out;
 });
 ok(r.n>=33,'the items table loads '+r.n);
 ok(!r.noIcon.length,'every item icon is in the sprite sheet '+r.noIcon);
 ok(r.kitIds,'KIT is the owned part of the items table, in table order');
 ok(r.kitAkli==='Akli AR,primary,3,140,1,Bhord','KIT rows keep their fields '+r.kitAkli);
 ok(r.kitCarbine==='1,true,0','Hegemony kit has no price; live:0 reads 0 '+r.kitCarbine);
 ok(!r.liveNoStats.length,'every live weapon has stats '+r.liveNoStats);
 ok(r.start==='akli:6:start,cowboy:4:start,medpack:4:start','the opening armory is granted from the table '+r.start);
 ok(r.grant==='1,3,looted,Akli AR','grant stacks and keeps the first source '+r.grant);
 ok(r.take==='3,0','take stops at what is there and drops the empty stack '+r.take);
 ok(r.guards==='true,true,true','grant refuses display names, builtins and unknown ids '+r.guards);
 ok(r.poolHegWeapons==='carbine,hg40'&&r.poolHegAll==='baton,riotshield','pools filter by tag and by live '+r.poolHegWeapons+' / '+r.poolHegAll);
 ok(r.rollArmour==='autohelm,cap,cowboyhat,hardhat','a roll draws only from its pool '+r.rollArmour);
 ok(r.rollWeighted==='longiron'&&r.rollEmpty===null,'weights steer a roll; an empty pool rolls nothing '+r.rollWeighted+' '+r.rollEmpty);

 // ---- the ground scene builds its weapon tables from the items table, and loot is ids
 await pg.evaluate(()=>window.SR.go('ground',{test:true,mission:{kind:'ground',missionId:'stealcross',scenario:'stealcross',days:1,
   squad:[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']}]}}));
 await pg.waitForTimeout(700);
 const g=await pg.evaluate(()=>{
  const I=window.Items,f=window.DBGground.fn,out={};
  const WPN=f.WPN_(),WDAM=f.WDAM_(),WICON=f.WICON_();
  out.wpn=Object.keys(WPN).sort().join();
  out.akli=[WPN.akli.d0,WPN.akli.d1,WPN.akli.rng,WPN.akli.shots,!!WPN.akli.jam,WDAM.akli,WICON.akli].join();
  out.scatter=[!!WPN.scatter.pellets,!!WPN.scatter.falloff,WDAM.rocket,!!WPN.laser.beam].join();
  const S=f.SCENARIOS_(),bad=[];
  for(const k in S)for(const l of S[k].loots||[])for(const it of l.items||[])if(!I.get(it)||I.get(it).category==='builtin')bad.push(k+':'+it);
  // every enemy carries items the table knows, and draws a weapon with stats
  for(const k in S){const sc=S[k];for(const fn of ['foes','civs'])if(typeof sc[fn]==='function')for(const u of sc[fn]()){
    for(const w of (u.wpns||[]).concat(u.kit||[]))if(!I.get(w))bad.push(k+':'+u.id+':'+w);
    if((u.wpns||[]).length&&!WPN[u.wpns[0]])bad.push(k+':'+u.id+':'+u.wpns[0]+' has no stats');}}
  out.bad=bad;
  return out;
 });
 ok(g.wpn==='akli,autohand,carbine,cowboy,cruiser,dispersal,fists,hg40,laser,longiron,rocket,scatter,strider,unarmed','the ground scene has every weapon with stats '+g.wpn);
 ok(g.akli==='24,38,540,3,true,ballistic,gun','the Akli keeps its numbers '+g.akli);
 ok(g.scatter==='true,true,explosive,true','flags and damage types carry over '+g.scatter);
 ok(!g.bad.length,'every loot crate and enemy weapon is a known id '+g.bad);

 // ---- the debrief turns loot ids into armory stacks and readable reward lines
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(600);
 const d=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={};
  const m={id:'loottest',name:'Loot test',desc:'Test.',objectives:['Test'],req:{transport:true,team:1},days:0,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{}};
  G.missions.push(m);
  G.armory=G.armory.filter(a=>a.id!=='carbine'&&a.id!=='scatter');
  f.applyDebrief({missionId:'loottest',kind:'ground',days:0,win:true,people:[],loot:{c:0,s:0,items:['carbine','scatter','scatter']}});
  out.armory=['carbine','scatter'].map(id=>{const a=G.armory.find(x=>x.id===id);return a?id+':'+a.n+':'+a.src:id+':none';}).join();
  for(let i=0;i<6&&f.getWin()&&f.getWin()!=='reward';i++)f.closeWin();
  out.reward=(document.querySelector('#winCardB')||{}).textContent||'';
  f.closeWin();
  // the Arsenal dossier reads the table's description, then a looted stack's source line
  f.openArsenal();f.setArSel('kit','akli');
  out.blurbAkli=(document.querySelector('.ar-blurb')||{}).textContent||'';
  f.setArSel('kit','scatter');
  out.blurbScatter=(document.querySelector('.ar-blurb')||{}).textContent||'';
  f.closeArsenal();
  return out;
 });
 ok(d.armory==='carbine:1:looted,scatter:2:looted','loot ids become armory stacks '+d.armory);
 ok(d.reward.indexOf('Peacekeeper Carbine')>=0&&d.reward.indexOf('Varmint Shotgun')>=0,'the reward window names the loot '+d.reward.slice(0,200));
 ok(/^Ballistic assault rifle/.test(d.blurbAkli),'the Arsenal shows the table description '+d.blurbAkli);
 ok(/Hegemony/.test(d.blurbScatter),'looted kit without a description says where it came from '+d.blurbScatter);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'items-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
