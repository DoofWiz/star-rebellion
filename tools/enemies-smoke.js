/* The enemy roster: node tools/enemies-smoke.js (needs NODE_PATH=$(npm root -g)).
   Every enemy spawn names a type in game/data/db.json's enemies table, carries that type's kit (items-table ids),
   fights with the weapons in it and drops the usable part of it when downed. Hacked Autos join with their roster
   stats and weapon. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']}];
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const go=async(sc)=>{await pg.evaluate(([sc,sq])=>window.SR.go('ground',{test:true,mission:{kind:'ground',missionId:sc,scenario:sc,days:1,squad:sq}}),[sc,SQUAD]);await pg.waitForTimeout(700);};

 // ---- the roster and spawn() on their own
 const a=await pg.evaluate(()=>{
  const E=window.Enemies,out={};
  out.n=E.rows.length;
  out.factions=[...new Set(E.rows.map(r=>r.faction))].sort().join();
  const rs=E.spawn('security-riot-shieldman',{id:'t1',name:'T',x:0,y:0});
  out.shield=[rs.shield,rs.wpns.join('+'),rs.kit.join('+'),rs.hp,rs.maxhp,rs.side,rs.arch].join();
  const pell=E.spawn('frontier-deputy',{id:'t2',wpns:['carbine']});
  out.override=[pell.wpns.join(),pell.kit.join('+')].join(' ');
  const wren=E.spawn('frontier-deputy',{id:'t3',hp:55,aim:3});
  out.stats=[wren.hp,wren.maxhp,wren.aim,wren.def].join();
  const bot=E.spawn('strider-mk1',{id:'t4'});
  out.bot=[bot.auto,bot.autoType,bot.bot,bot.hackRounds,bot.big].join();
  out.leader=[E.spawn('frontier-sheriff',{}).sheriff,E.spawn('frontier-deputy',{}).sheriff===undefined].join();
  let threw=false;try{E.spawn('stormtrooper',{});}catch(e){threw=true;}
  out.unknown=threw;
  return out;
 });
 ok(a.n>=12,'the roster loads '+a.n);
 ok(a.factions==='hegemony,outworlder','both factions from the Enemies doc '+a.factions);
 ok(a.shield==='1,hg40+riotshield,hg40+riotshield+policehelmet+policevest,75,75,law,riot','a riot shieldman carries his kit, and the shield shields '+a.shield);
 ok(a.override==='carbine carbine+policevest','a spawn can hand one deputy a carbine; the vest stays '+a.override);
 ok(a.stats==='55,55,3,10','a spawn can override stats; max hp follows hp '+a.stats);
 ok(a.bot==='1,strider,strider,3,1','robots get their hack rules '+a.bot);
 ok(a.leader==='1,true','leaders lead '+a.leader);
 ok(a.unknown,'an unknown type fails loudly');

 // ---- every enemy in every scenario comes from the roster
 await go('autofactory');
 const s=await pg.evaluate(()=>{
  const f=window.DBGground.fn,S=f.SCENARIOS_(),bad=[],seen={};
  const chk=(k,u)=>{if(!u.type||!window.Enemies.get(u.type))bad.push(k+':'+(u.id||u.name));else seen[u.type]=1;};
  const walk=(k,x)=>{
    if(Array.isArray(x)){x.forEach(y=>walk(k,y));return;}
    if(!x||typeof x!=='object')return;
    if(x.veh){(x.crew||[]).forEach(c=>chk(k,c));return;}
    if(x.side==='law'&&x.name)chk(k,x);
    else for(const v of Object.values(x))if(v&&typeof v==='object')walk(k,v);
  };
  for(const k in S){const sc=S[k];
    if(typeof sc.foes==='function')walk(k,sc.foes());
    for(const key of Object.keys(sc))if(key!=='foes'&&key!=='civs'&&sc[key]&&typeof sc[key]==='object')walk(k,sc[key]);}
  return {bad,types:Object.keys(seen).sort().join()};
 });
 ok(!s.bad.length,'every enemy spawn names a roster type '+s.bad);
 ok(s.types.split(',').length>=12,'every roster type is used somewhere '+s.types);

 // ---- on the field: what they hold, what they look like, what they drop
 const d=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const by=id=>U.find(u=>u.id===id);
  const drew=by('drew'),pb=by('pb12'),kaan=by('rs1'),brenn=by('rr1');
  out.held=[drew.wpns.join('+'),pb.wpns.join('+'),kaan.wpns.join('+'),kaan.shield,brenn.wpns.join('+')].join(' ');
  out.look=[f.artSpec(drew).gear.join('+')||'-',f.artSpec(kaan).gear.join('+'),f.artSpec(brenn).gear.join('+'),f.artPose(kaan,0).gear.join('+')].join(' ');
  out.weaponArt=[f.artPose(drew,0).weapon,f.artPose(pb,0).weapon].join();
  const marks=()=>f.lootMarks_().filter(m=>m.drop);
  const n0=marks().length;
  for(const u of [drew,pb,kaan,brenn])f.dropLoot(u);
  f.dropLoot(by('bru1')||{id:'x',kit:['fists'],name:'x'});
  const ms=marks().slice(n0);
  out.drops=ms.map(m=>m.id.replace('drop_','')+':'+m.items.join('+')+':'+(m.c>0?'c':'-')).join(' ');
  out.take=ms[0]&&ms[0].take;
  out.drewC=ms[0]&&ms[0].c>=32&&ms[0].c<=72;
  // the new sidearms go through the real shot: roll, damage, effects and sound
  const dax=by('dax');let fired=0;
  for(const [sh,w] of [[pb,'autohand'],[drew,'hg40']]){drew.down=0;pb.down=0;dax.x=sh.x+150;dax.y=sh.y;f.applyShot(sh,dax,w);f.fireFx(sh,dax,w,true);fired++;}
  out.fired=fired;
  return out;
 });
 ok(d.held==='hg40 autohand hg40 1 carbine','enemies fight with their roster weapons (baton and shield are carried, not fired) '+d.held);
 ok(d.look==='- shield+policevest policevest shield+policevest','what they wear is what is drawn '+d.look);
 ok(d.weaponArt==='hg40,autohand','the art kit draws their actual weapons '+d.weaponArt);
 ok(d.drops==='drew:hg40:c pb12:autohand:- rs1:hg40+policehelmet+policevest:c rr1:carbine+policehelmet+policevest:c','downed enemies drop the usable kit they carried '+d.drops);
 ok(d.fired===2,'Policebots and Patrolmen fire their new sidearms without a hitch');
 ok(/^HG-40 \+ \d+ ◈$/.test(d.take||'')&&d.drewC,'the drop is labelled and carries their credits '+d.take);

 await go('stealcross');
 const r=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U;
  const reeve=U.find(u=>u.id==='reeve'),n0=f.lootMarks_().length;
  f.dropLoot(reeve);
  const m=f.lootMarks_()[n0];
  return [m.items.join('+'),m.c,reeve.sheriff,f.artSpec(reeve).gear.join('+')].join(' ');
 });
 ok(r==='scatter+cowboyhat+policevest 136 1 policevest','the Sheriff drops his shotgun, hat and vest and 136 credits '+r);

 // ---- base: a hacked Policebot joins with its roster stats and weapon
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(600);
 const h=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G;
  f.applyDebrief({missionId:'none',kind:'ground',days:0,win:true,people:[],gained:[{type:'policebot',name:'Policebot PB-77'}]});
  const p=G.people.find(x=>x.name==='Policebot PB-77');
  const e=p&&f.squadEntry(p,false);
  return p?[p.auto,e.wpns.join('+'),e.hp,e.def].join():'missing';
 });
 ok(h==='policebot,autohand,45,9','a hacked Policebot keeps its roster stats and Auto Plasma Hand '+h);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'enemies-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
