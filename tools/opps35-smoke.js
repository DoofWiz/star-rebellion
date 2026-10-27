/* Opportunities from Sources, scaled to the force (docs/MAIN-SWITCH-HANDOFF.md S7, §5 test 8): node tools/opps35-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  templates: Intercept Transport and Tanker Grab are Vulnerable Freighter's variants (their own target, half the
      escort for the tanker); a Source's instance carries its name and level, and its level sets which modifiers hide
   2  a Source reveals Intercept Transport (Halt's signal): it's a space mission on the board, Plan mission opens Type 3.5
      (no off-screen dice) as Halt revealed it, and the Intel strip names him
   3  scaling: one wing faces a smaller escort and response than three wings do; Patrol Sweep's patrol too
   4  Orrin Pell reveals Patrol Sweep once his first job is done
   5  Tips: the intel jobs are G.tips (the migration from G.opps), shown as tips
   6  a wing leader in trouble never refuses themselves ("Joss refused Joss") */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};const errs=[];
 const page=async q=>{const pg=await b.newPage({viewport:{width:1440,height:900}});pg.on('pageerror',e=>errs.push(q+': '+e.message));
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.goto(base+q);await pg.waitForTimeout(1200);return pg;};
 const scene=(pg,s)=>pg.waitForFunction(x=>window.SR.active===x,s,{timeout:15000}).then(()=>pg.waitForTimeout(500));

 // 1 and 3 and 6: the sim, on the test bench
 const pa=await page('?dev#arena');
 const r1=await pa.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,O=L35.OPPORTUNITIES,out={};
  out.variants=[O.intercept_transport.template,O.tanker_grab.template,O.intercept_transport.title,O.tanker_grab.title,O.tanker_grab.escorts.reduce((a,e)=>a+e.n,0),O.vulnerable_freighter.escorts.reduce((a,e)=>a+e.n,0)];
  // a Source's level sets what's hidden (subtle > level)
  const lv=[];for(const level of [1,2,3]){const I=L35.instanceOf('intercept_transport',{id:'halt',name:'Ferren Halt',level});let good=true,hid=0;
    for(let seed=1;seed<=40;seed++)for(const m of L35.rollMods(I,seed)){if(m.fake)continue;if(m.hidden!==(L35.MODS[m.k].subtle>level))good=false;if(m.hidden)hid++;}
    lv.push({id:I.id,name:I.source.name,level:I.source.level,pays:I.missionPays,good,hid});}
  out.levels=lv;
  // scaling: the escort and the response, one wing against three
  const count=(prim,strike)=>{B.oppId='vulnerable_freighter';B.seed=5;B.mods=[];B.plan=L35.leaderPlan(prim);
    L35.WINGS35.forEach((w,i)=>{B.plan.wings[w.id].role=i<strike?'strike':'home';});X.fn.launch();
    return {esc:X.S.ships.filter(s=>s.role35==='escort').length,resp:L35.fn.respForce().reduce((a,f)=>a+(f.n||1),0)};};
  out.scale=[count('destroy',1),count('destroy',3)];
  const patrol=strike=>{B.oppId='patrol_sweep';B.seed=5;B.mods=[];B.plan=L35.leaderPlan('clear',null,'patrol_sweep');L35.WINGS35.forEach((w,i)=>{B.plan.wings[w.id].role=i<strike?'strike':'home';});X.fn.launch();
    return X.S.ships.filter(s=>s.cast35==='patrol').length;};
  out.patrol=[patrol(1),patrol(3)];
  // 6: leaders in trouble over a few fights: nobody refuses themselves
  let self=0,calls=0;
  for(const seed of [534180,11,22]){B.oppId='vulnerable_freighter';B.seed=seed;B.mods=[];B.plan=L35.leaderPlan('crash');B.plan.roes=['signal'];X.fn.launch();try{L35.use('signal',{});}catch(e){}
    for(let i=0;i<30*240&&!X.S.over;i++)SIM.step();
    for(const e of X.S.events){const m=/^(\w+) refused (\w+)$/.exec(e.text);if(m&&m[1]===m[2])self++;if(/ called .+ in$/.test(e.text))calls++;}}
  out.self=[self,calls];
  return out;});
 ok(r1.variants.join()==='vulnerable_freighter,vulnerable_freighter,Intercept Transport,Tanker Grab,2,4','1: Intercept Transport and Tanker Grab are the freighter\'s variants; the tanker has half the escort '+r1.variants);
 ok(r1.levels.every(l=>l.good&&l.pays&&l.name==='Ferren Halt')&&r1.levels.map(l=>l.id).join()==='intercept_transport@halt-1,intercept_transport@halt-2,intercept_transport@halt-3'&&r1.levels[0].hid>r1.levels[2].hid,
  '1: a Source\'s instance: its name and level; the level sets what\'s hidden '+JSON.stringify(r1.levels));
 ok(r1.scale[0].esc<r1.scale[1].esc&&r1.scale[0].resp<r1.scale[1].resp&&r1.scale[1].esc===4&&r1.scale[1].resp===5&&r1.scale[0].esc>=1,'3: one wing faces a smaller escort and response than three (three: the authored 4 and 5) '+JSON.stringify(r1.scale));
 ok(r1.patrol[0]<r1.patrol[1]&&r1.patrol[1]===7&&r1.patrol[0]>=3,'3: Patrol Sweep\'s patrol is sized to the wings sent too '+r1.patrol);
 ok(r1.self[0]===0&&r1.self[1]>0,'6: no leader refuses themselves; they call wingmates in '+r1.self);
 await pa.close();

 // 2, 4, 5: the campaign
 const pg=await page('#test');
 await pg.evaluate(()=>window.SR.go('base',{}));await pg.waitForTimeout(500);
 const r2=await pg.evaluate(()=>{const D=window.DBGbase,f=D.fn,G=D.G,out={};for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  // a wing to fly it: Joss in a Cross
  G.fighters.push(f.newFighter({id:'s7c',name:'Test Cross',cls:'cross',hull:100}));const p=G.people.find(x=>x.role==='Pilot');p.ship='s7c';p.assign='standby';f.wingsTidy();
  // Halt, level 2, signals Intercept Transport
  const h=Object.assign({},f.srcInfo('halt'),{alive:true,level:2,signal:{kind:'mission',mid:'intercept',text:'test'}});G.sources.push(h);
  f.followSignal(h);const m=G.missions.find(x=>x.id==='intercept');
  out.m=m&&[m.state,m.lead,m.need,f.msKind?f.msKind(m):null];
  f.syncUI();document.querySelector('#navMissions').click();const c=document.querySelector('.bf-card[data-msel="intercept"]');if(c)c.click();
  out.plan=!!document.querySelector('[data-mplan="intercept"]')&&!document.querySelector('[data-m35="intercept"]');
  return out;});
 await pg.click('[data-mplan="intercept"]');await scene(pg,'space35');
 const r2b=await pg.evaluate(()=>{const X=window.SR_ARENA_HC35.dbg,G=window.DBGbase.G,m=G.missions.find(x=>x.id==='intercept');
  return {opp:X.B.oppId,src:(X.L35.OPPORTUNITIES[X.B.oppId].source||{}).name,strip:(document.querySelector('#arHc35 .h35-campintel')||{}).textContent||'',state:m.state,win:window.DBGbase.fn.getWin()};});
 ok(r2.m&&r2.m[0]==='avail'&&r2.m[1]==='space'&&r2.m[2]===1&&r2.plan,'2: Halt\'s signal puts Intercept Transport on the board, a one-wing space mission with Plan mission (no dev button) '+JSON.stringify(r2));
 ok(r2b.opp==='intercept_transport@halt-2'&&r2b.src==='Ferren Halt'&&/From Ferren Halt · Lv 2/.test(r2b.strip)&&r2b.state==='avail'&&r2b.win!=='plan','2: Plan mission opens Type 3.5 as Halt revealed it (level 2), no off-screen dice '+JSON.stringify(r2b));
 await pg.evaluate(()=>{const X=window.SR_ARENA_HC35.dbg;X.fn.campDone(null);});await scene(pg,'base');
 const r4=await pg.evaluate(()=>{const D=window.DBGbase,f=D.fn,G=D.G,out={};for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  const pell=Object.assign({},f.srcInfo('pell'),{alive:true,signal:null,pendingEvent:null});G.sources.push(pell);
  const before=f.storySignal(pell)&&pell.signal&&pell.signal.mid;pell.signal=null;   // his first job is the rescue
  f.addMission('rescue',true);const r=G.missions.find(x=>x.story==='rescue'||x.id==='rescue');if(r)r.state='done';
  out.after=f.storySignal(pell)&&pell.signal&&pell.signal.mid;f.followSignal(pell);const m=G.missions.find(x=>x.id==='patrol');
  out.before=before;out.m=m&&[m.name,m.lead,m.src,m.state];return out;});
 ok(r4.before!=='patrol'&&r4.after==='patrol'&&r4.m&&r4.m[0]==='Patrol Sweep'&&r4.m[1]==='space'&&r4.m[2]==='pell','4: Orrin Pell reveals Patrol Sweep once his first job is done '+JSON.stringify(r4));
 const r5=await pg.evaluate(()=>{const D=window.DBGbase,f=D.fn,G=D.G;for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  // an old save: G.opps, a mission linked to one
  G.v=18;delete G.tips;delete G.tipN;G.opps=[{id:'opp3',loc:'veray',region:null,tid:'fuel',target:'x',found:true,done:false}];G.oppN=3;
  G.missions.push({id:'fuel_9',tid:'fuel',state:'avail',oppId:'opp3',name:'t'});f.upgradeSave();
  const mig=[!('opps' in G),G.tips.length===1&&G.tips[0].id==='opp3',G.tipN===3,(G.missions.find(m=>m.id==='fuel_9')||{}).tipId==='opp3',G.v===f.saveVersion()];
  f.openTip('opp3');const t=document.querySelector('#winCardB .sr-window__title, #winCardB');const title=(document.querySelector('#winCardB')||{}).textContent||'';
  return {mig,win:f.getWin(),tipWin:/Intelligence tip/.test(title),noLead:!/Intelligence lead/.test(title)};});
 ok(r5.mig.every(Boolean),'5: the migration moves G.opps to G.tips and a mission\'s link to tipId '+JSON.stringify(r5.mig));
 ok(r5.win==='tip'&&r5.tipWin&&r5.noLead,'5: a tip opens as an Intelligence tip '+JSON.stringify(r5));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r1},null,0));
 if(fails.length){console.error('opps35-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('opps35-smoke OK');
})();
