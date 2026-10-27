/* Type 3.5: High Command Hands Off, on the test bench (docs/ARENA-HC35-HANDOFF.md §11; game/js/sim-hc35.js, arena-hc35.js
   and High Command's renderer arena-hc.js, through DBGarena.hc35 and DBGarena.hc): node tools/hc35-smoke.js
   (needs NODE_PATH=$(npm root -g)). Loads game/index.html?dev#arena: the space35 scene (space35.js) opens the test opportunity's board.
   Split from the Arena's test (archive/tools/arena-smoke.js) in the switch to main (docs/MAIN-SWITCH-HANDOFF.md S0):
   the v2, SB and Type 3 sections stayed in the archive, and so did K0's High Command record and K4 18 (Type 3's
   Reinforce command). HC35 1 (High Command byte-identical with the hooks) and C-73/C-74's visual pass (V1) run on
   Type 3's scenarios, kept as fixtures in tools/hc-fixtures.js.
   HC35 2 the loop by DOM (board, the four steps, Launch, the mission, the debrief, Plan again); 5 bombs and subsystems,
     the drift and the planet; 6 each primary from a scripted setup; 7 the phases; 3 the modifiers and Dig deeper;
     P3 the leaders' plan and critiques, two plans → two fights, a Secondary, 8 Hold for My Signal, Weapons Tight,
     Preservation and OFF PLAN; 9 the comms delay; 7 command points by phase; 10 every power after its delay, and the
     powers bar by DOM; 11 pilot requests; 12 ejection pods; 13 the debrief's cause chain; 14 determinism with pauses;
     15 the metrics record; K0–K6, L1–L7, M1, N1, O1, P3, P5 and W1–W3 (the playtests and the planning windows).
   Output: one JSON object; exit 1 on any failure. */
const {chromium}=require('playwright');
const path=require('path');
const {HC_SCENARIOS}=require('./hc-fixtures.js');
const base='file://'+path.resolve(__dirname,'../game/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const errs=[];
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 // ================= High Command's renderer and sim on its own scenarios (tools/hc-fixtures.js: Type 3's hc1–hc3) =================
 const ctxH=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const pgH=await ctxH.newPage();
 pgH.on('pageerror',e=>errs.push('pageerror(fixtures): '+e.message));
 pgH.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console(fixtures): '+m.text());});
 await pgH.goto(base+'?dev#arena');await pgH.waitForTimeout(800);
 // HC35 1: High Command is byte-identical with the 3.5 hooks in: hc1–hc3 after 90 s, seed 7, one scripted order at 5 s.
 // The baselines were first recorded on space-combat-testing before any 3.5 change (C-75); Type 3's order tray issued the order then
 // re-recorded (hc-4, 27 October 2026) when Type 3's rules, command points and commands came out: the hash's command-point
 // slot is a constant 0 now (hc1 and hc2 play exactly as before; their hashes moved with that slot alone), and hc3 no
 // longer has Bring It Down standing (was 36bcc72e, fcae4af0, 344375cb at hc-3, 22 October)
 const HC35_BASE={hc1_nightfall:'ccfafdf',hc2_lastlight:'83466823',hc3_meltdown:'d6f7dad7'};   // re-recorded 27 October: green pilots may fire missiles early, a fried emitter stops Boost Shields (hc-5)
 const t35a=await pgH.evaluate((FIX)=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,out={hash:{}};
  const orders={hc1_nightfall:['dagger','attack',{type:'class',cls:'mote'}],hc2_lastlight:['ash','defend',{type:'ship',id:'lastlight'}],hc3_meltdown:['hammer','board',{type:'station',id:'reactor'}]};
  for(const id in orders){f.loadScenario(JSON.parse(JSON.stringify(FIX.find(x=>x.id===id))),7);SIM.runFor(5);SIM.setOrder(...orders[id]);SIM.runFor(85);out.hash[id]=SIM.stateHash();}
  out.hooks=Object.keys(SIM.hooks).length;
  return out;
 },HC_SCENARIOS);
 ok(JSON.stringify(t35a.hash)===JSON.stringify(HC35_BASE)&&t35a.hooks===0,'HC35 1: High Command unchanged by the hooks (hashes match the baselines; no hook set) '+JSON.stringify(t35a));
 // ---------- C-73, V1: the visual pass (game/art/sr-space-fx.js) wired into the map ----------
 const v1=await pgH.evaluate((FIX)=>{
  const H=window.DBGarena.hc,f=H.fn,SIM=H.SIM,F=SIM.fn,FX=f.FX,out={};
  const ld=(id,seed)=>f.loadScenario(JSON.parse(JSON.stringify(FIX.find(x=>x.id===id))),seed);   // a fixture, fresh each time
  const S=()=>H.S,by=id=>S().ships.find(s=>s.id===id||s.name===id),q=s=>document.querySelector(s);
  const seen=[],ev0=FX.event,evd={};FX.event=(k,d)=>{seen.push(k);evd[k]=d;return ev0(k,d);};
  const lm0=FX.lockMark;let marks=[];FX.lockMark=(c,x,y,r,k,o,v)=>{marks.push(o);return lm0(c,x,y,r,k,o,v);};
  const tick=n=>{for(let i=0;i<n;i++){SIM.step();f.fxSense();FX.update(SIM.TICK/1000,16);}};
  try{
   // loaded and on; the station art keys; the panel's FX group
   ld('hc1_nightfall',5);f.setFx({on:true,shake:true,calm:false});
   out.on=[!!FX,f.fxOn(),f.stationArt(by('relay')),f.stationArt(by('lark'))];
   ld('hc2_lastlight',5);out.on.push(f.stationArt(by('lastlight')));ld('hc3_meltdown',5);out.on.push(f.stationArt(by('reactor')));
   const fxs=[...document.querySelectorAll('#hcPanelBody [data-fx]')];
   out.panel=[fxs.length===f.FX_UI.filter(r=>r[0] in FX.TUNE).length,!!q('#hcPanelBody [data-toggle="fx"]'),!!q('#hcPanelBody [data-toggle="shake"]'),!!q('#hcPanelBody [data-toggle="calm"]')];
   const fl=q('#hcPanelBody [data-fx="flameLen"]'),fl0=FX.TUNE.flameLen;fl.value='3.5';fl.dispatchEvent(new Event('input',{bubbles:true}));
   out.panel.push(FX.TUNE.flameLen===3.5,JSON.parse(f.settingsJson())['fx.flameLen']===3.5);
   q('#hcPanelBody [data-act="defaults"]').click();out.panel.push(FX.TUNE.flameLen===fl0,!('fx.flameLen' in JSON.parse(f.settingsJson())));
   // draws at the three zooms the brief names, on and off, without a throw
   ld('hc1_nightfall',5);tick(400);
   const c=f.cam_(),j=by('Joss');let draws=0;
   for(const on of [true,false]){f.setFx({on});for(const z of [0.12,0.4,1.2]){c.x=j.x;c.y=j.y;c.z=z;f.render(performance.now());draws++;}}
   f.setFx({on:true});
   out.draw=[draws===6,FX.stats().spritesCached>0];
   // the sim's tags: every bolt hit names its surface; crashes and missile ends are marked
   out.tags=[S().fx.filter(x=>x.kind!=='boom'&&!x.src).every(x=>['shield','armour','hull'].includes(x.surface))];
   // events from what the sim did: muzzle and bolt hits in view, a kill, a jump, a missile, chaff, a crash
   ld('hc1_nightfall',5);f.fxSense();seen.length=0;
   const rl=by('relay'),jo=by('Joss');c.x=rl.x;c.y=rl.y;c.z=0.6;
   jo.x=rl.x-700;jo.y=rl.y;jo.h=jo.vh=0;jo.px=jo.x;jo.py=jo.y;SIM.setOrder('dagger','attack',{type:'ship',id:'relay'});
   let n=0;while(n++<200&&!(seen.includes('muzzle')&&seen.includes('boltHit')))tick(1);
   const g=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);F.kill(g,null);tick(1);
   const lark=by('lark');lark.alive=false;lark.jumped=true;lark.jumpT=S().t;tick(1);
   const kit=by('Kit');F.throwChaff(kit);tick(1);
   const ss=by('Sera'),t=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);
   if(t){ss.x=t.x-900;ss.y=t.y;ss.px=ss.x;ss.py=ss.y;ss.h=ss.vh=0;t.chaffLeft=0;let m=0;while(m++<80&&!seen.includes('missileLaunch')){ss.locks={[t.id]:1};t.segs.F.val=t.segs.R.val=0;tick(1);}}   // a missile waits for a weak shield (22 October)
   const a=by('Petra'),b2=by('Wren');a.px=a.x-200;a.py=a.y;a.vx=4000;a.vy=0;b2.x=a.x+20;b2.y=a.y;b2.px=b2.x;b2.py=b2.y;b2.vx=b2.vy=0;F.collideTick();f.fxSense();
   out.ev=['muzzle','boltHit','explode','jumpOut','chaff','missileLaunch','collide'].map(k=>k+':'+seen.includes(k));   // (Type 3's command pulse went with its commands, 27 October 2026)
   // a station's death is the big one; a wave arriving warps in
   seen.length=0;rl.hull=0;F.kill(rl,null);tick(1);out.ev.push('station:'+seen.includes('explode'));
   ld('hc2_lastlight',5);f.fxSense();seen.length=0;let w=0;while(w++<600&&!S().ships.some(x=>x.faction==='heg'&&x.alive))tick(1);
   out.ev.push('warpIn:'+seen.includes('warpIn'));
   // nothing stale: a reload marks what is already there without effects
   ld('hc1_nightfall',5);SIM.runFor(30);seen.length=0;f.fxSense();out.stale=seen.filter(k=>k==='warpIn'||k==='explode').length;
   // boarding: the docked Grafs, each linked to a clamp pad on the reactor
   ld('hc3_meltdown',5);const st=by('reactor'),gs=[by('Anvil'),by('Forge')];for(const x of S().ships)if(x.faction==='heg'&&!x.struct)x.alive=false;
   gs.forEach((x,i)=>{const a2=Math.PI*(1-0.25*i);x.x=st.x+Math.cos(a2)*F.boardR(st)*0.7;x.y=st.y+Math.sin(a2)*F.boardR(st)*0.7;x.px=x.x;x.py=x.y;x.thinkT=0;});
   SIM.setOrder('hammer','board',{type:'station',id:'reactor'});let bn=0;while(bn++<600&&!(f.boarders(st).length&&st.boardProg>0))tick(1);
   const bd=f.boarders(st),pad=bd.length?f.padNear(st,st,bd[0],1):null;
   out.board=[bd.length>=1,bd.every(x=>x.marines),!!pad&&Math.hypot(pad.x-st.x,pad.y-st.y)>10];
   c.x=st.x;c.y=st.y;c.z=0.5;f.render(performance.now());
   // round 2 (C-74): the hurt read from the hull fraction, the spiral carries on the ship's flight and ends in the
   // explosion, the lock marks: turning while building, held once locked
   ld('hc1_nightfall',5);f.fxSense();seen.length=0;
   const jh=by('Joss');jh.hull=jh.maxHull*0.2;const sv=f.shipView(jh,f.ipos(jh),1);
   FX.TUNE.spiralChance=2;const g3=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);F.kill(g3,null);tick(1);   // × 2: one flying straight spirals half as often (feedback 1 K3)
   const ex=evd.explode||{},sp1=FX.fn.os_().some(e=>e.kind==='spiral');
   for(let i=0;i<Math.ceil(FX.TUNE.spiralSecs/0.05)+2;i++)FX.update(0.05,16);FX.TUNE.spiralChance=0.5;
   out.r2=[+sv.hullFrac.toFixed(2)===0.2,ex.vh===g3.vh&&ex.speed>0,sp1,FX.fn.os_().some(e=>e.kind==='boom')];
   const se=by('Sera'),lt=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);f.selectWing('amber');
   c.x=lt.x;c.y=lt.y;c.z=0.5;se.locks={[lt.id]:0.3};marks=[];f.render(performance.now());const m1=marks.find(o=>!o.hostile);
   se.locks={[lt.id]:1};marks=[];f.render(performance.now());const m2=marks.find(o=>!o.hostile);
   out.r2.push(!!m1&&!m1.locked,!!m2&&m2.locked&&m2.flipAge===0);
   // reduced motion: no shake after a kill (this context prefers reduced motion)
   ld('hc1_nightfall',5);f.fxSense();const g2=S().ships.find(x=>x.faction==='heg'&&x.alive&&!x.struct);c.x=g2.x;c.y=g2.y;F.kill(g2,null);tick(1);
   const sh=FX.camShake({z:1,cx:g2.x,cy:g2.y,W:800,H:600,dpr:1,reduced:true});out.calm=[sh.x===0&&sh.y===0];
   // the visual pass never moves the fight: the same seed, drawn with it and without, ends the same
   const hashes=[];
   for(const on of [true,false]){f.setFx({on});ld('hc3_meltdown',9);for(let i=0;i<600;i++){SIM.step();f.fxSense();FX.update(SIM.TICK/1000,16);if(i%10===0)f.render(performance.now());}hashes.push(SIM.stateHash());}
   f.setFx({on:true});out.det=hashes;
  }finally{FX.event=ev0;FX.lockMark=lm0;}
  return out;
 },HC_SCENARIOS);
 ok(v1.on.join()==='true,true,relay,,lastlight,reactor','C-73: the visual pass is on; the stations have their art '+JSON.stringify(v1.on));
 ok(v1.panel.every(Boolean),'C-73: the panel\'s FX group: switches, numbers, Copy settings, defaults '+JSON.stringify(v1.panel));
 ok(v1.draw.every(Boolean)&&v1.tags.every(Boolean),'C-73: draws at 0.12, 0.4, 1.2 on and off; bolt hits name their surface '+JSON.stringify([v1.draw,v1.tags]));
 ok(v1.ev.every(e=>/:true$/.test(e)),'C-73: the sim\'s moments become effects '+JSON.stringify(v1.ev));
 ok(v1.stale===0,'C-73: a reload raises nothing stale '+v1.stale);
 ok(v1.board.every(Boolean),'C-73: boarding links each docked Graf to a clamp pad '+JSON.stringify(v1.board));
 ok(v1.r2.every(Boolean),'C-74: the hurt read, the death spiral, the lock marks '+JSON.stringify(v1.r2));
 ok(v1.calm.every(Boolean),'C-73: reduced motion: no camera shake '+JSON.stringify(v1.calm));
 ok(v1.det[0]===v1.det[1],'C-73: the visual pass never changes the fight '+JSON.stringify(v1.det));
 await ctxH.close();
 // ================= Type 3.5: High Command Hands Off (docs/ARENA-HC35-HANDOFF.md §11), its own context =================
 const ctx4=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
 const pg4=await ctx4.newPage();
 pg4.on('pageerror',e=>errs.push('pageerror(hc35): '+e.message));
 pg4.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console(hc35): '+m.text());});
 await pg4.goto(base+'?dev#arena');await pg4.waitForTimeout(800);
 // these tests predate S7's scaling: whatever wings they send, they fight the authored escort and response
 await pg4.evaluate(()=>{const O=window.DBGarena.hc35.L35.OPPORTUNITIES;for(const k in O)O[k].scale=null;});
 // HC35 2: the loop by DOM, the Missions tab → the four planning windows → Launch → the mission → debrief → Plan again
 // (feedback 1 K6: the dossier now lives in the board's rail and holo-table)
 const t35b=await pg4.evaluate(()=>{
  const top=window.DBGarena;top.fn.open35();
  const out={};const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  const X=top.hc35,B=X.B;X.B.seed=4242;X.fn.showBoard(false);
  out.board=[B.screen,!!q('.bf-board .bf-card.is-sel'),qa('.sr-btn--primary').length,!!q('canvas[data-portrait="cass"]')];
  out.dossier=[B.screen,!!q('canvas[data-target]'),!!q('[data-act="dig"]')];
  q('[data-act="brief"]').click();out.step1=[B.screen,B.step,qa('[data-primary]').length,qa('.h35-ocard.is-locked').length,!q('[data-act="launch"]')];   // Launch only on step 4
  q('[data-primary="destroy"]').click();q('[data-act="next"]').click();out.step1b=[B.step,B.part,qa('[data-opt]').length,qa('[data-roe]').length];   // window 1, part 2: the secondaries
  q('[data-act="next"]').click();out.step2=[B.step,qa('[data-opt]').length,qa('[data-roe]').length];
  q('[data-act="next"]').click();out.step3=[B.step,qa('.h35-wcol').length,qa('[data-role]').length,qa('[data-refit35]').length,qa('.h35-aslot').length];
  q('[data-act="next"]').click();out.step4=[B.step,qa('[data-ord="exec"]').length,!!q('[data-act="launch"]'),q('[data-act="launch"]').getAttribute('aria-disabled')];
  // the wings as listed: Dagger 2 Cross + 1 Talon, Anvil 1 Talon + 2 Brickbat, Amber 1 Cross + 2 Talon + 1 Brickbat
  out.wings=X.L35.WINGS35.map(w=>w.ships.map(s=>s.cls).join(','));
  for(const w in B.plan.wings)B.plan.wings[w].exec={k:'destroy',arg:null};
  const seed=B.seed;q('[data-act="launch"]').click();
  const S=()=>X.S;
  out.live=[B.screen,S().scn.id,S().ships.filter(s=>s.faction==='reb'&&!s.struct).length,!!S().ships.find(s=>s.id==='fl400'),S().ships.filter(s=>s.role35==='escort').length>0,X.L.phase];
  X.fn.run(400);
  out.end=[B.screen,!!S().over,!!q('.h35-debrief'),!!q('.sr-stamp')];
  q('[data-act="again"]').click();
  out.again=[B.screen,B.step,B.seed===seed,B.plan.primary,Object.values(B.plan.wings).every(w=>w.exec.k==='destroy')];
  out.campaign=!!localStorage.getItem('star-rebellion-campaign-v1');
  return out;
 });
 ok(t35b.board[0]==='board'&&t35b.board[1]&&t35b.board[2]===1&&t35b.board[3]&&t35b.dossier[0]==='board'&&t35b.dossier[1]&&t35b.dossier[2],'HC35 2: the board (one gold primary), its holo freighter and Dig deeper '+JSON.stringify([t35b.board,t35b.dossier]));
 ok(t35b.step1[0]==='brief'&&t35b.step1[1]===1&&t35b.step1[2]===7&&t35b.step1[3]===4&&t35b.step1b.join()==='1,2,7,0'&&t35b.step2.join()==='2,0,5'&&t35b.step3[0]===3&&t35b.step3[1]===3&&t35b.step3[2]===9&&t35b.step3[3]===3&&t35b.step3[4]===3&&t35b.step4[0]===4&&t35b.step4[1]===3&&t35b.step4[2]&&t35b.step4[3]===null,
  'HC35 2: the four briefing steps, window 1 in two parts '+JSON.stringify([t35b.step1,t35b.step1b,t35b.step2,t35b.step3,t35b.step4]));
 ok(t35b.wings.join('|')==='cross,cross,talon|talon,brickbat,brickbat|cross,talon,talon,brickbat','HC35 2: the wings as the designer listed them '+JSON.stringify(t35b.wings));
 ok(t35b.live[0]==='live'&&t35b.live[1]==='hc35_freighter'&&t35b.live[2]===10&&t35b.live[3]&&t35b.live[4]&&t35b.end.every(Boolean),'HC35 2: Launch, the mission, the debrief '+JSON.stringify([t35b.live,t35b.end]));
 ok(t35b.again[0]==='brief'&&t35b.again[1]===1&&t35b.again[2]&&t35b.again[3]==='destroy'&&t35b.again[4],'HC35 2: Plan again keeps the seed and the plan (window 1, K6) '+JSON.stringify(t35b.again));
 ok(!t35b.campaign,'HC35 1: no campaign save after a 3.5 run');
 // HC35 5–7: the target, each primary, the phases (from scripted setups: no modifiers, a fixed seed)
 const t35c=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,out={};
  L35.N.REQ_OFF=1;   // the target and the primaries on their own: no pilot requests (P5) but the surrender's
  const rt0=L35.N.RES_THREAT;L35.N.RES_THREAT=0;   // and no hail but Pirate's: the crew fold about 20 s into any fight (C-80)
  const S=()=>X.S,L=()=>X.L,fr=()=>S().ships.find(s=>s.id==='fl400');
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;else B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    if(o.tagger)B.plan.tagger=o.tagger;X.fn.launch();};
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  // 5: fighter guns alone can't zero the engines in 60 s; two Brickbats with bombs can
  go('destroy',{dagger:{k:'disable',arg:'engines'},anvil:{role:'home'},amber:{role:'home'}});
  until(()=>false,60);out.guns=[Math.round(L().subs[0].hp),fr().alive];
  go('destroy',{anvil:{k:'disable',arg:'engines'},dagger:{role:'home'},amber:{role:'home'}});
  out.bombs=[until(()=>L().engOut,60),Math.round(S().t)];   // (engines out: she crawls on her thrusters, after playtest 2)
  // with her engines out she doesn't jump (put by its jump point); inside the pull it falls in
  const f1=fr(),j=L().fjump;f1.x=j.x;f1.y=j.y;f1.px=f1.x;f1.py=f1.y;L().leg=L().lane.length-1;SIM.step();
  out.nojump=[until(()=>!fr().alive,20)===false,L().spool==null];
  go('crash',{dagger:{role:'home'},anvil:{role:'home'},amber:{k:'hold'}});
  const f2=fr(),Pl=L().planet;f2.x=Pl.x;f2.y=Pl.y-Pl.r-1200;f2.px=f2.x;f2.py=f2.y;L().subs[0].hp=1;F.applyDamage(f2,5,true,true,{x:f2.x,y:f2.y,by:'hale',aimSub:'engines'});
  L().subs[0].hp=0;L().disabled=true;L().drift={vx:0,vy:0};
  out.crash=[until(()=>!fr().alive,40),L().crashed,L().prim.state];
  // 6: each primary from a scripted setup
  const res={};
  go('destroy',{anvil:{k:'destroy'},dagger:{k:'defend',arg:'anvil'},amber:{k:'suppress',arg:'turrets'}});until(()=>L().prim.state!=='live',150);res.destroy=L().prim.state;
  go('steal',{anvil:{k:'disable',arg:'engines'},amber:{k:'board'},dagger:{k:'defend',arg:'anvil'}},{lo:{mags:'board'}});until(()=>L().prim.state!=='live',200);res.steal=L().prim.state;
  L35.N.REQ_OFF=0;L35.N.RES_THREAT=rt0;go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});   // the surrender's answer: take the cargo
  until(()=>{const q=L().req.open.find(x=>x.k==='surrender'&&x.state==='open');if(q)L35.answerReq(q.id,'take');return L().prim.state!=='live';},200);res.pirate=L().prim.state;L35.N.REQ_OFF=1;L35.N.RES_THREAT=0;
  go('strip',{anvil:{k:'disable',arg:'engines'},amber:{k:'haul'},dagger:{k:'suppress',arg:'escorts'}},{lo:{mags:'pods'}});until(()=>L().prim.state!=='live',200);res.strip=L().prim.state;
  go('tag',{amber:{k:'tag'},dagger:{role:'home'},anvil:{role:'home'}},{tagger:'kit'});until(()=>L().prim.state!=='live',300);res.tag=[L().prim.state,L().tag.planted];
  go('ambush',{dagger:{k:'ambush'},amber:{k:'ambush'},anvil:{k:'disable',arg:'engines'}});until(()=>L().responseAt!=null,60);L().responseAt=S().t+1;until(()=>L().prim.state!=='live',200);res.ambush=[L().prim.state,L().respKills];
  out.res=res;
  // crash, with the disable timed inside the pull (the signal rule comes with P3)
  go('crash',{anvil:{k:'hold'},dagger:{k:'hold'},amber:{k:'defend',arg:'anvil'}});
  until(()=>{const f=fr();return f.alive&&Math.hypot(f.x-L().planet.x,f.y-L().planet.y)<L().planet.pull;},200);L().exec.anvil={k:'disable',arg:'power'};   // as it enters the pull (its lane only grazes it)
  {const f=fr();f.hull=Math.min(f.hull,f.maxHull*0.78);const pw=L().subs.find(x=>x.k==='power');pw.hp=Math.min(pw.hp,30);}   // after playtest 2 the power plant kills her: its hull already worn open, the plant hurt
  until(()=>L().prim.state!=='live',120);res.crash=L().prim.state;
  // 7: the phases: detection to 100 → Phase 2; the array killed mid-send: no response; Remote: none either
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L().detect=99.5;
  const e=S().ships.find(s=>s.role35==='escort'),r=S().ships.find(s=>s.faction==='reb'&&s.alive);r.x=e.x+1800;r.y=e.y;r.px=r.x;r.py=r.y;L().detect=99.9;SIM.step();SIM.step();
  out.phase=[L().phase,L().alarmWhy,!!L().distress];
  const cm=L().subs.find(x=>x.k==='comms');F.applyDamage(fr(),140,true,true,{x:fr().x,y:fr().y,by:null,aimSub:'comms'});
  until(()=>false,30);out.phase.push(cm.hp<=0,L().distress.cut,L().responseAt);
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{mods:[{k:'remote',hidden:false}]});L35.alarm('fired');until(()=>false,40);out.remote=[L().distress&&L().distress.landed,L().responseAt];
  L35.N.REQ_OFF=0;L35.N.RES_THREAT=rt0;return out;
 });
 ok(t35c.guns[0]>0&&t35c.guns[1],'HC35 5: fighter guns alone don\'t take the engines out in 60 s '+JSON.stringify(t35c.guns));
 ok(t35c.bombs[0],'HC35 5: two Brickbats with bombs do '+JSON.stringify(t35c.bombs));
 ok(t35c.nojump.every(Boolean)&&t35c.crash[0]&&t35c.crash[1],'HC35 5: a disabled freighter can\'t jump; inside the pull it crashes '+JSON.stringify([t35c.nojump,t35c.crash]));
 ok(t35c.res.destroy==='done'&&t35c.res.steal==='done'&&t35c.res.pirate==='done'&&t35c.res.strip==='done'&&t35c.res.tag[0]==='done'&&t35c.res.ambush[0]==='done'&&t35c.res.crash==='done','HC35 6: each primary can be won '+JSON.stringify(t35c.res));
 ok(t35c.phase[0]===2&&t35c.phase[1]==='detected'&&t35c.phase[2]&&t35c.phase[3]&&t35c.phase[4]&&t35c.phase[5]==null,'HC35 7: detection → Phase 2; the array killed mid-send cuts the call '+JSON.stringify(t35c.phase));
 ok(t35c.remote[0]&&t35c.remote[1]==null,'HC35 7: Remote: the call lands but no response comes '+JSON.stringify(t35c.remote));
 // HC35 3 and P3: the modifiers, Dig deeper, the leaders' plan and critiques, two plans → two fights, Secondaries, the rules
 const t35d=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,out={};
  L35.N.REQ_OFF=1;   // the plan on its own: no pilot requests (P5)
  const S=()=>X.S,L=()=>X.L,fr=()=>S().ships.find(s=>s.id==='fl400'),q=s=>document.querySelector('#arHc35 '+s);
  const O=L35.OPPORTUNITIES.vulnerable_freighter;
  // 3: same seed, same modifiers; 20 seeds, at least 8 different sets; no exclusive pair; subtle 3 never on the board
  const sig=sd=>L35.rollMods(O,sd).map(m=>m.k+(m.fake?'*':'')).sort().join();
  const sets=new Set(),ex=[];let sub3=true;
  for(let sd=1;sd<=20;sd++){sets.add(sig(sd));const m=L35.rollMods(O,sd).filter(x=>!x.fake);for(const a of m)for(const b of m)if(L35.MODS[a.k].ex.includes(b.k))ex.push(a.k+'/'+b.k);
    for(const x of L35.rollMods(O,sd))if(L35.MODS[x.k].subtle===3&&!x.fake&&L35.known(x))sub3=false;}
  out.mods=[sig(42)===sig(42),sets.size,ex.length,sub3];
  // Dig deeper: one hidden modifier revealed, one Intel spent
  let dsd=0;for(let sd=1;sd<200&&!dsd;sd++)if(L35.rollMods(O,sd).some(m=>!L35.known(m)))dsd=sd;
  B.seed=dsd;X.fn.showBoard(false);B.mods=L35.rollMods(O,dsd);B.intel=L35.TUNE.INTEL_START.get();X.fn.go('dossier');
  const hid0=B.mods.filter(m=>!L35.known(m)).length,i0=B.intel;q('[data-act="dig"]').click();
  out.dig=[hid0>0,B.mods.filter(m=>!L35.known(m)).length===hid0-1,B.intel===i0-1];
  // the leaders' plan: picking Steal fills the orders, the loadouts and the rules
  B.step=1;X.fn.enterBrief();q('[data-primary="steal"]').click();const P=B.plan;
  out.lplan=[P.wings.amber.exec.k,P.wings.amber.loadout.mags,P.wings.anvil.exec.k+':'+P.wings.anvil.exec.arg,P.wings.anvil.second&&P.wings.anvil.second.trig,P.roes.join()];
  // critiques: no bombs for a disable; a jump-in inside a ring
  const P2=L35.leaderPlan('steal');P2.wings.anvil.loadout.brask='pods';P2.wings.anvil.loadout.ollo='pods';
  out.crit=[L35.critique(P2,'anvil',[],{}),L35.critique(L35.leaderPlan('destroy'),'anvil',[],{}),L35.critique(L35.leaderPlan('destroy'),'dagger',[],{inRing:()=>true})];
  // two plans on one seed: two different fights
  const run=(prim,mut)=>{B.seed=555;B.mods=[];B.plan=L35.leaderPlan(prim);if(mut)mut(B.plan);X.fn.launch();for(let i=0;i<1200;i++)SIM.step();return SIM.stateHash();};
  const h1=run('destroy'),h2=run('steal'),h3=run('destroy');out.plans=[h1!==h2,h1===h3];
  // a Secondary: Anvil's engines job done → it suppresses the turrets
  // (a seed where Anvil gets the engines down: on some she has to withdraw first)
  for(const seed of [555,556,557,558,559,560]){
    B.seed=seed;B.mods=[];B.plan=L35.leaderPlan('steal');X.fn.launch();const st=L().exec.anvil.k;let n=0;while(n++<4000&&L().exec.anvil.k==='disable'&&!S().over)SIM.step();
    out.sec=[st,L().exec.anvil.k,!!L().sec.anvil.adopted,L().subs[0].hp<=0,seed];if(L().subs[0].hp<=0)break;
  }
  // Hold for My Signal: no shots until the signal (unless fired on)
  B.seed=555;B.mods=[];B.plan=L35.leaderPlan('crash');B.plan.roes=['signal'];X.fn.launch();
  let shots=0;for(let i=0;i<600;i++){SIM.step();shots+=S().proj.filter(p=>p.faction==='reb'&&p.age<0.06).length;}
  L35.giveSignal();let after=0;for(let i=0;i<1200;i++){SIM.step();after+=S().proj.filter(p=>p.faction==='reb'&&p.age<0.06).length;}
  out.signal=[L().signal,shots===0||S().ships.some(s=>s.faction==='reb'&&S().t-s.hitT<30),after>0];
  // Weapons Tight: a fighter with no subsystem to aim at holds fire on the freighter; one on the turrets may fire
  B.seed=555;B.mods=[];B.plan=L35.leaderPlan('pirate');X.fn.launch();const j=S().ships.find(s=>s.id==='joss');
  j.sub35=null;const c1=SIM.hooks.canFire(j,fr(),null);j.sub35='turrets';const c2=SIM.hooks.canFire(j,fr(),null);out.tight=[c1===false,c2===true];
  // Preservation: under its threshold a ship withdraws; its wing shows OFF PLAN
  B.seed=555;B.mods=[];B.plan=L35.leaderPlan('destroy');B.plan.roes=['preservation'];B.plan.presHull=0.3;X.fn.launch();
  const p=S().ships.find(s=>s.id==='wren');p.hull=p.maxHull*0.2;p.thinkT=99;SIM.step();SIM.step();
  out.pres=[p.beh&&p.beh.kind,p.beh&&p.beh.rule,L().off.dagger,X.fn.OV.tacticChip(F.wingOf('dagger'))];
  L35.N.REQ_OFF=0;return out;
 });
 ok(t35d.mods[0]&&t35d.mods[1]>=8&&t35d.mods[2]===0&&t35d.mods[3],'HC35 3: modifiers: same seed same set, varied, no exclusive pair, subtle 3 hidden '+JSON.stringify(t35d.mods));
 ok(t35d.dig.every(Boolean),'HC35 3: Dig deeper reveals one and spends Intel '+JSON.stringify(t35d.dig));
 ok(t35d.lplan.join('|')==='board|board|disable:engines|done|tight','HC35 P3: picking a primary fills the leaders\' plan '+JSON.stringify(t35d.lplan));
 ok(/crack that hull/.test(t35d.crit[0])&&/watching our backs/.test(t35d.crit[1])===false&&/see us/.test(t35d.crit[2]),'HC35 P3: the leaders\' critiques '+JSON.stringify(t35d.crit));
 ok(t35d.plans[0]&&t35d.plans[1],'HC35 P3: the same seed with two plans gives two fights (and one plan replays) '+JSON.stringify(t35d.plans));
 ok(t35d.sec[0]==='disable'&&t35d.sec[1]==='suppress'&&t35d.sec[2]&&t35d.sec[3],'HC35 P3: a Secondary takes over when its trigger fires '+JSON.stringify(t35d.sec));
 ok(t35d.signal.every(Boolean),'HC35 8: Hold for My Signal: no fire until the signal (unless fired on) '+JSON.stringify(t35d.signal));
 ok(t35d.tight.every(Boolean),'HC35 P3: Weapons Tight '+JSON.stringify(t35d.tight));
 ok(t35d.pres[0]==='withdraw'&&t35d.pres[1]==='preservation35'&&t35d.pres[2]==='Preservation'&&/OFF PLAN: Preservation/.test(t35d.pres[3]),'HC35 P3: Preservation Order, and OFF PLAN '+JSON.stringify(t35d.pres));
 // HC35 9–10 (P4): the comms delay, command points by phase, and every power doing its job after its delay
 const t35e=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  N.REQ_OFF=1;   // the powers on their own: no pilot requests (P5)
  const S=()=>X.S,L=()=>X.L,fr=()=>S().ships.find(s=>s.id==='fl400'),by=id=>S().ships.find(s=>s.id===id);
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=o.assets||[];B.plan.assetAt=o.assetAt||{};B.plan.roes=o.roes||[];X.fn.launch();L().cp=o.cp!=null?o.cp:9;};
  const landed=()=>L().txLog.every(t=>t.landed!=null);
  const hold={dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}};
  // 9: a transmission lands no earlier than the formula; the Comms Relay shortens it; Ion Storm doubles it
  const delayOf=o=>{go('destroy',hold,o);const w=F.wingOf('dagger'),c=F.wingCentre(w),want=N.COMMS_BASE+Math.hypot(c.x-L().relay.x,c.y-L().relay.y)/N.COMMS_SPD+L35.ackOf(by('joss'));
    const t0=S().t;L35.use('retreat');until(()=>L().exec.dagger.k==='withdraw',40);return [+(want*(o&&o.mods?N.ION_K:1)).toFixed(2),+(S().t-t0).toFixed(2)];};
  const d0=delayOf(),d1=delayOf({assets:['relay'],assetAt:{relay:{x:3000,y:1400}}}),d2=delayOf({mods:[{k:'ion',hidden:false}]});
  out.delay=[d0,d1,d2,d0[1]>=d0[0]-0.01&&d0[1]<=d0[0]+0.11,d1[1]<d0[1]-1,Math.abs(d2[1]-d0[1]*N.ION_K)<0.25];
  N.COMMS_OFF=1;go('destroy',hold);L35.use('retreat');SIM.step();out.delay.push(L().exec.dagger.k==='withdraw');N.COMMS_OFF=0;
  // 7 (P4): command points: a phase's allowance, what's left lost at the next
  go('destroy',hold,{cp:N.CP1});const c1=L().cp;L35.use('broadcast');const c1b=L().cp;L35.alarm('fired');const c2=L().cp;L35.setPhase(3);
  out.cp=[c1===N.CP1,c1b===N.CP1-N.C_BROADCAST,c2===N.CP2,L().cp===N.CP3,L35.use('broadcast').ok===false];
  go('destroy',hold,{cp:0});out.cp.push(/command points/.test(L35.use('mark',{id:'fl400'}).why||''));
  // 10: each power, after its delay, does its job
  const P={};
  go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{role:'home'}},{roes:['signal']});
  const firedEarly=()=>S().proj.some(p=>p.faction==='reb');until(()=>false,3);
  const sg=L35.use('signal'),sgAt=Math.max(...sg.tx.map(t=>t.at));P.signal=[!L().signal&&L().phase===1&&!firedEarly(),until(()=>L().signal,30),L().phase===2,S().t>=sgAt-0.01,L35.use('signal').ok===false];
  go('destroy',hold);L35.use('abort');P.abort=[until(()=>!!S().over,240),S().over&&S().over.outcome];
  go('destroy',hold);const r0=L().resolve,j0=by('joss').pilot.cool;L35.use('broadcast');until(landed,30);P.broadcast=[L().resolve<=r0-N.BROADCAST_RES+1,by('joss').pilot.cool>j0,L().exposure];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  L35.use('name',{ship:'wren',act:'pull'});L35.use('name',{ship:'petra',act:'stay'});L35.use('name',{ship:'joss',act:'focus',target:'esc1'});until(landed,30);until(()=>false,1);
  P.name=[!!L().pull.wren,by('wren').beh.kind==='withdraw',!!L().stayIn.petra,by('joss').beh.kind==='engage'&&by('joss').beh.target==='esc1'];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L35.use('mark',{id:'fl400',sub:'turrets'});until(landed,30);until(()=>false,1);
  P.mark=[!!L().markW.dagger,F.wingShips(F.wingOf('dagger')).some(s=>s.beh.target==='fl400'&&s.beh.why==='the marked target')];
  go('destroy',{dagger:{k:'hold'},anvil:{k:'disable',arg:'engines'},amber:{role:'home'}});L35.use('exec',{wing:'dagger',k:'suppress',arg:'escorts'});
  L().subs.find(x=>x.k==='engines').hp=N.ENG_HP*0.1;L35.use('exec',{wing:'anvil',k:'destroy'});until(landed,30);
  const pb=!!L().pushback&&L().exec.anvil.k==='disable';L35.use('insist');until(landed,30);
  P.exec=[L().exec.dagger.k==='suppress',pb,L().exec.anvil.k==='destroy'];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'reserve',k:'hold'}});const rt=L35.use('reserve',{});const rAt=rt.tx[0].at;
  P.reserve=[until(()=>!!F.wingOf('amber'),40),S().t>=rAt+N.ARRIVE_SPOOL-0.01,F.wingShips(F.wingOf('amber')).length===4];
  go('destroy',hold,{assets:['ram']});const h0=fr().hull;L35.use('ram',{id:'fl400'});P.ram=[until(()=>!!by('ram35'),40),until(()=>!by('ram35').alive,60),fr().hull<=h0-N.RAM_CORE+0.01];   // the core's share (K2: the struck subsystem takes RAM_DMG)
  go('destroy',hold,{assets:['nuke']});const e1=by('esc1');L35.use('ram',{id:'esc1'});until(()=>!!by('ram35')&&!by('ram35').alive,90);P.nuke=[(L().blasts||[]).some(b=>b.kind==='nuke'),!e1.alive||e1.hull<e1.maxHull];
  const hegHull=()=>S().ships.filter(s=>s.faction==='heg').reduce((a,s)=>a+Math.max(0,s.hull)+(s.id==='fl400'?L().subs.reduce((b,x)=>b+Math.max(0,x.hp),0):0),0);
  go('destroy',hold,{assets:['fireship'],assetAt:{fireship:{x:700,y:2450}}});until(()=>false,6);const f0=hegHull();L35.use('fireship');until(landed,30);P.fireship=[!L().props.fireship.live,hegHull()<f0-20];
  go('destroy',hold,{assets:['mines'],assetAt:{mines:{x:700,y:2450}}});until(()=>false,6);const m0=hegHull();L35.use('mines');until(landed,30);P.mines=[!L().props.mines.live,hegHull()<m0-10];
  // the Interdictor: the freighter spooled at its jump point can't go while it's up, and nor can your ships
  go('destroy',hold,{assets:['buoy']});const f1=fr(),j=L().fjump;f1.x=j.x;f1.y=j.y;f1.px=f1.x;f1.py=f1.y;L().leg=L().lane.length-1;L35.use('buoy');until(()=>!!L35.interdictOn(),30);
  const b0=S().t;until(()=>!fr().alive,L().interdict.until-b0-0.5);const held=fr().alive&&L().spool!=null&&S().t-L().spool>L35.TUNE.JUMP_SECS.get();
  const joss=by('joss');joss.x=L().interdict.x;joss.y=L().interdict.y;const mine=L35.fn.canJump(joss);
  P.buoy=[held,mine===false,until(()=>!fr().alive,20),L().escaped];
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{assets:['tug']});L35.use('tug',{ship:'wren'});P.tug=[until(()=>!!by('tug35'),40),until(()=>!!by('wren').towed35,90),until(()=>by('wren').jumped,150)];
  go('destroy',hold,{assets:['spoof']});L35.use('spoof',{id:'esc1'});until(landed,30);until(()=>false,1);P.spoof=[S().ships.filter(s=>s.role35==='escort').every(s=>s.spoof35!=null&&s.beh.why==='following spoofed orders'),L35.use('spoof',{id:'esc1'}).ok===false];
  go('destroy',hold,{assets:['pirates']});L35.use('pirates');P.pirates=[until(()=>S().ships.filter(s=>s.prop35==='pirate').length===N.PIRATE_N,40)];
  go('destroy',hold,{mods:[{k:'insider',hidden:false}]});const hasSl=L35.powers().some(p=>p.k==='sleeper');L35.use('sleeper',{act:'engines'});until(landed,30);P.sleeper=[hasSl,!!L().engOut,L().burned];
  out.P=P;
  // the bar by DOM: the powers as skill icons, a targeting pill, the comms queue
  go('destroy',hold,{assets:['ram'],cp:N.CP1});window.SR_ARENA_HC.api.syncHud(true);
  const bar=document.getElementById('hcCmds'),btn=k=>bar.querySelector('[data-p35="'+k+'"]');
  out.dom=[!bar.hidden,!!btn('ram'),!!btn('abort'),!btn('tug'),/Powers/.test(bar.querySelector('.hc-cmds__title').textContent),bar.querySelectorAll('#hcCp .hc-cp__pips i').length===N.CP1];
  btn('mark').click();out.dom.push(!!bar.querySelector('.h35-pickpill'));
  X.fn.OV.mapClick({x:fr().x,y:fr().y},{},fr());window.SR_ARENA_HC.api.syncHud(true);out.dom.push(!bar.querySelector('.h35-pickpill'),bar.querySelectorAll('.h35-tx').length===L().tx.length&&L().tx.length>0);
  N.REQ_OFF=0;return out;
 });
 ok(t35e.delay[3]&&t35e.delay[4]&&t35e.delay[5]&&t35e.delay[6],'HC35 9: comms delay: the formula, the relay shortens it, Ion Storm doubles it, off is instant '+JSON.stringify(t35e.delay));
 ok(t35e.cp.every(Boolean),'HC35 7: command points reset at each phase '+JSON.stringify(t35e.cp));
 for(const k in t35e.P)ok(t35e.P[k].every(x=>x===true||x==='aborted'),'HC35 10: '+k+' does its job after its delay '+JSON.stringify(t35e.P[k]));
 ok(t35e.dom.every(Boolean),'HC35 10: the powers bar, targeting, the comms queue '+JSON.stringify(t35e.dom));
 // HC35 11–12 (P5): pilot requests and ejection
 const t35f=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id);
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    B.plan.assets=o.assets||[];B.plan.roes=o.roes||[];X.fn.launch();};
  const hold={dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},openOf=(k,who)=>L().req.open.find(q=>q.k===k&&(!who||q.who===who));
  // 11: a hit pilot asks; no answer: they do what their persona says
  go('destroy',hold);const w=by('wren');w.hull=w.maxHull*0.35;until(()=>!!openOf('hit','wren'),5);const q=openOf('hit','wren');
  out.hit=[!!q,q&&q.def];until(()=>q.state==='done',N.REQ_SECS+2);
  out.hit.push(q.by==='default',q.answer===q.def,q.def==='pull'?!!L().pull.wren:!!L().stayIn.wren,X.fn.OV&&true);
  // an answer overrides Preservation Order, for that pilot only
  go('destroy',hold,{roes:['preservation']});L().plan.presHull=0.3;const pe=by('petra');pe.hull=pe.maxHull*0.25;
  until(()=>!!openOf('hit','petra'),5);const qp=openOf('hit','petra');const r=L35.answerReq(qp.id,'stayin');
  const wr=by('wren');wr.hull=wr.maxHull*0.25;until(()=>qp.state==='done',20);until(()=>false,1.5);
  out.pres=[r.ok,!!L().stayIn.petra,pe.alive&&!(pe.beh&&pe.beh.rule==='preservation35'),wr.beh&&wr.beh.rule==='preservation35'];
  // the open cap, the gap and the mission cap hold
  const crowd=()=>{for(const s of S().ships)if(s.faction==='reb'&&s.wing)s.hull=s.maxHull*0.35;};
  const g0=N.REQ_GAP,p0=N.REQ_PEND;N.REQ_PEND=60;
  go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'hold'}});crowd();let most=0;until(()=>{most=Math.max(most,L().req.open.filter(x=>x.state==='open').length);return false;},50);
  const t0s=L().req.log.filter(x=>x.by!=='off'&&x.by!=='unasked'&&x.k!=='surrender').map(x=>x.t0);   // the hail ignores the gap and the caps (K2)
  out.gap=[t0s.length>=2,t0s.every((t,i)=>!i||t-t0s[i-1]>=N.REQ_GAP-0.01),most<=N.REQ_OPEN];
  N.REQ_GAP=0;go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'hold'}});crowd();most=0;until(()=>{most=Math.max(most,L().req.open.filter(x=>x.state==='open').length);return false;},60);
  out.cap=[most===N.REQ_OPEN,L().req.log.filter(x=>(x.by==='default'||x.by==='player')&&x.k!=='surrender').length===N.REQ_CAP];
  N.REQ_GAP=g0;N.REQ_PEND=p0;
  // Requests off: none
  N.REQ_OFF=1;go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'hold'}});crowd();until(()=>false,30);out.off=[L().req.log.length===0,L().req.open.length===0];N.REQ_OFF=0;
  // the A/B/C keys answer the newest
  go('destroy',hold);by('petra').hull=by('petra').maxHull*0.35;until(()=>!!openOf('hit','petra'),5);const qk=openOf('hit','petra');   // (a wingman: since K4 a leader's Field Repair heals it past the threshold)
  window.SR_ARENA_HC.api.syncHud(true);const card=document.querySelector('.h35-reqs [data-req="'+qk.id+'"]');
  const sk=(code,shift)=>document.dispatchEvent(new KeyboardEvent('keydown',{key:shift?'@':code.slice(-1).toLowerCase(),code,shiftKey:!!shift,bubbles:true}));
  sk('Digit2',true);const early=qk.state==='open';   // within 400 ms of the card: swallowed
  X.B.reqShown[qk.id]-=500;sk('KeyC');const third=qk.state==='open'&&(!!X.B.pick||L().tx.length>0||!!X.B.choose);   // C: the third power, not an answer
  X.B.pick=null;X.B.choose=null;sk('Digit2',true);out.keys=[!!card,early,third,qk.state==='sent',qk.answer===qk.answers[1]];
  // 12: ejection: a pod; the Tug collects it; an uncollected pod is captured, and the debrief says so
  const e0=N.EJECT_P;N.EJECT_P=1;
  go('destroy',hold,{assets:['tug']});F.kill(by('wren'),null);SIM.step();const pod=L().pods[0];
  out.pod=[!!pod,pod&&pod.state==='drift'];const u=L35.use('tug',{pod:pod.id});until(()=>pod.state!=='drift',90);out.pod.push(u.ok,pod.state==='aboard',pod.by==='tug35');
  go('destroy',hold);F.kill(by('wren'),null);SIM.step();const p2=L().pods[0];until(()=>p2.state!=='drift',N.POD_SECS+2);
  L35.use('retreat');X.fn.run(300);const db=document.querySelector('#arHc35 .h35-debrief');
  out.captured=[p2.state==='captured',!!db&&/captured/.test(db.textContent)];
  N.EJECT_P=e0;
  return out;
 });
 ok(t35f.hit.every(x=>x===true||x==='pull'||x==='stayin'),'HC35 11: a hit pilot asks, and times out to the persona default '+JSON.stringify(t35f.hit));
 ok(t35f.pres.every(Boolean),'HC35 11: an answer overrides Preservation Order for that pilot only '+JSON.stringify(t35f.pres));
 ok(t35f.gap.every(Boolean)&&t35f.cap.every(Boolean),'HC35 11: the gap, the open cap and the mission cap hold '+JSON.stringify([t35f.gap,t35f.cap]));
 ok(t35f.off.every(Boolean),'HC35 11: Requests off raises none '+JSON.stringify(t35f.off));
 ok(t35f.keys.every(Boolean),'HC35 11 / K2 20: Shift+1–3 answer the newest request, not within 400 ms; C stays the third power '+JSON.stringify(t35f.keys));
 ok(t35f.pod.every(Boolean)&&t35f.captured.every(Boolean),'HC35 12: a pod; the Tug collects it; an uncollected one is captured in the debrief '+JSON.stringify([t35f.pod,t35f.captured]));
 // HC35 13–15 (P6): the debrief's cause chain, determinism with pauses, the metrics record
 const t35g=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    B.plan.assets=o.assets||[];B.plan.roes=o.roes||[];X.fn.launch();};
  // 13: a scripted loss to point defence with no Suppress order gives that line
  N.REQ_OFF=1;go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  for(const e of S().ships)if(e.role35==='escort'){e.alive=false;e.jumped=true;}
  L35.alarm('fired');const w=by('wren'),f=fr();w.x=f.x+600;w.y=f.y+600;w.px=w.x;w.py=w.y;w.segs.F.val=0;w.segs.R.val=0;w.arm=0;w.hull=0.05;for(const a in w.abCd)w.abCd[a]=1e9;   // no field repair
  until(()=>{if(w.alive){const g=fr();w.x=g.x+600;w.y=g.y+600;w.px=w.x;w.py=w.y;w.segs.F.val=0;w.segs.R.val=0;}return !w.alive;},30);SIM.step();const d=L().deaths.find(x=>x.id==='wren');   // held in the turrets' reach
  L35.use('retreat');X.fn.run(300);const db=document.querySelector('#arHc35 .h35-debrief'),why=[...document.querySelectorAll('#arHc35 .h35-why p')].map(p=>p.textContent);
  out.why=why;out.pd=[!!d&&d.by==='pd',!!db,why.some(t=>/went down to the freighter's guns\. Nobody was told to take out the turrets/.test(t)),why.length>=3&&why.length<=6];
  N.REQ_OFF=0;
  // 14: the same seed, plan, powers and answers at the same ticks, with pauses and the HUD between: the same fight
  const runA=pause=>{go('steal',{anvil:{k:'disable',arg:'engines'},amber:{k:'board'},dagger:{k:'defend',arg:'anvil'}},{seed:4242,assets:['mines'],roes:['preservation']});L().cp=9;
    for(let i=0;i<900&&!S().over;i++){
      if(i===120)L35.use('mark',{id:'fl400',sub:'engines'});if(i===300)L35.use('broadcast');
      for(const q of L().req.open)if(q.state==='open')L35.answerReq(q.id,q.answers[q.answers.length-1]);
      if(pause&&i%40===0){API.setSpeed(0);API.syncHud(true);X.fn.render();X.fn.OV.syncHud(performance.now());X.fn.OV.tick(performance.now());API.setSpeed(2);}
      SIM.step();}
    return [SIM.stateHash(),L().cause.length,L().req.log.length];};
  const h1=runA(false),h2=runA(true),h3=runA(true);out.det=[h1[0]===h2[0]&&h2[0]===h3[0],h1[1]===h2[1],h1[2]===h2[2],h1];
  // 15: the record carries every §10 field
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L35.use('retreat');X.fn.run(300);
  const rec=A_metrics_last();document.querySelector('#arHc35 [data-act="again"]').click();
  const keys=['seed','mods','primary','optionals','roes','wings','assets','briefSecs','phaseSecs','speedSecs','pauses','pausedSecs','powers','cpUnspent','requests','secondaries','offPlanSecs','outcome','loot','losses','pods','planAgain','commsOff','requestsOff'];
  out.metrics=[keys.filter(k=>!(k in rec)),rec.ruleset==='hc35',rec.planAgain===true,Array.isArray(rec.speedSecs)&&rec.speedSecs.length===4,['raised','answered','defaulted'].every(k=>k in rec.requests)];
  function A_metrics_last(){return B.metrics[B.metrics.length-1];}
  // the keys (§7.6): Space pauses, P the plan overlay, Z the first power, Esc cancels its targeting
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L().cp=9;
  const key=k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
  const ov0=B.planOverlay;key('p');const ov1=B.planOverlay;key(' ');const paused=SIM.TIMESCALES[window.SR_ARENA_HC.api.A.speed]===0;key(' ');
  const first=X.fn.OV.cmdsHtml().match(/data-p35="([a-z]+)"/)[1];key('x');const armed=!!B.pick||!!B.choose||L().txLog.length>0;key('Escape');
  out.keys=[ov1!==ov0,paused,first==='retreat',armed,!B.pick&&!B.choose];
  return out;
 });
 ok(t35g.pd.every(Boolean),'HC35 13: a loss to point defence with no Suppress order: that cause line '+JSON.stringify(t35g.pd));
 ok(t35g.det[0]&&t35g.det[1]&&t35g.det[2],'HC35 14: determinism: same seed, plan, powers and answers, pauses between: the same hash '+JSON.stringify(t35g.det));
 ok(!t35g.metrics[0].length&&t35g.metrics.slice(1).every(Boolean),'HC35 15: the record carries every §10 field '+JSON.stringify(t35g.metrics));
 ok(t35g.keys.every(Boolean),'HC35 P6: the keys: Space, P, the powers, Esc '+JSON.stringify(t35g.keys));
 // HC35 K0 (feedback 1, test 15): the flight recorder. A scripted run through the UI (powers with targets, an
 // answered request, one timed out, a pause, a speed change), saved from the debrief as a download, re-simulated
 // offline by tools/run-report.js with every checkpoint matching
 await pg4.evaluate(()=>{const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,API=window.SR_ARENA_HC.api;L35.N.REQ_OFF=0;
  B.seed=321;X.fn.showBoard(false);B.mods=L35.rollMods(L35.OPPORTUNITIES.vulnerable_freighter,321);B.plan=null;B.step=1;X.fn.enterBrief();
  document.querySelector('#arHc35 [data-primary="steal"]').click();B.plan.assets=['mines','ram'];B.step=4;X.fn.render();document.querySelector('#arHc35 [data-act="launch"]').click();
  let answered=0;
  for(let i=0;i<6000&&!SIM.S.over;i++){
    if(i===60)L35.use('mark',{id:'fl400',sub:'engines'});if(i===200)L35.use('ram',{id:'fl400'});if(i===400)L35.use('mines');
    if(i===500){API.setSpeed(0);API.setSpeed(3);}
    if(i===4000)L35.use('retreat');   // a run that hasn't ended by now (every wing on Hold, her engines rammed out) is called home
    const q=X.L.req.open.find(x=>x.state==='open');if(q&&!answered&&SIM.S.t-q.t0>2){L35.answerReq(q.id,q.answers[0]);answered=1;}
    SIM.step();}
  X.fn.run(1);});
 const [dl]=await Promise.all([pg4.waitForEvent('download'),pg4.click('#arHc35 [data-act="saverec"]')]);
 const recFile=await dl.path(),recName=dl.suggestedFilename();
 const RR=require('./run-report.js'),rec=JSON.parse(require('fs').readFileSync(recFile,'utf8'));
 const rp=RR.replay(rec),rtxt=RR.report(rp);
 const reqAns=rp.L.req.log.find(q=>q.by==='player'),reqDef=rp.L.req.log.find(q=>q.by==='default');
 const t35k0={name:recName,size:JSON.stringify(rec).length,cp:rec.cp.length,checked:rp.tr.checked,ok:rp.ok,end:rp.endOk,inputs:rec.inputs.map(x=>x[1]),speeds:rec.speeds.length,
   ans:!!reqAns&&new RegExp(reqAns.k+'\\*\\* · [^\\n]*\\(you, at '+RR.clock_(reqAns.sentT)).test(rtxt),def:!!reqDef&&/timed out: their default/.test(rtxt)};
 // an older SIM_VERSION warns, it doesn't crash
 const old=JSON.parse(JSON.stringify(rec));old.simVersion.hc35='hc35-0';const ro=RR.replay(old);t35k0.warn=ro.warn.some(w=>/hc35-0/.test(w))&&/⚠/.test(RR.report(ro));
 ok(/^sr-run-\d{4}-\d\d-\d\d-\d{4}-vulnerable_freighter-321\.json$/.test(t35k0.name)&&t35k0.size<1e6,'HC35 K0: the debrief saves the flight record '+JSON.stringify([t35k0.name,t35k0.size]));
 ok(t35k0.ok&&t35k0.end&&t35k0.checked===t35k0.cp&&t35k0.cp>=40,'HC35 K0: the harness re-simulates it, every checkpoint matching '+JSON.stringify([t35k0.cp,t35k0.checked,t35k0.end]));
 ok(t35k0.inputs.filter(k=>k==='35.use').length>=3&&t35k0.inputs.includes('35.answerReq')&&t35k0.speeds>=2,'HC35 K0: the inputs and speeds are recorded '+JSON.stringify([t35k0.inputs,t35k0.speeds]));
 ok(t35k0.ans&&t35k0.def,'HC35 K0: the report lists the answered request at its time, and the timed-out one '+JSON.stringify([t35k0.ans,t35k0.def]));
 ok(t35k0.warn,'HC35 K0: an older SIM_VERSION warns, not crashes');
 Object.assign(t35k0,await pg4.evaluate(()=>{const st=window.SR_FLIGHT.stored();window.SR_ARENA_HC.api.buildPanel();
  return {runs:st.length,panel:document.querySelectorAll('#hcPanelBody .hc-run [data-act^="run:"]').length};}));
 ok(t35k0.runs>=1&&t35k0.runs<=10&&t35k0.panel===t35k0.runs,'HC35 K0: the Runs group lists the last ten '+JSON.stringify([t35k0.runs,t35k0.panel]));
 // HC35 K1 (feedback 1, test 1): true scale; past ICON_PX a fighter is a screen-constant icon; the freighter stays art
 const t35k1=await pg4.evaluate(()=>{window.DBGarena.fn.open35();
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,API=window.SR_ARENA_HC.api,F=window.SIMHC.fn;
  B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';X.fn.launch();
  const t=F.byId('petra'),fr=F.byId('fl400'),out={boost:[],talon:[],fr:[],rad:[]};
  const open=API.cam.z;out.open=[+open.toFixed(3),Math.round(API.shipLenW(F.byId('joss'))*open)];
  for(const z of [0.6,0.18,0.12,0.09]){API.camTo(t.x,t.y,z);API.syncHud(true);out.boost.push(API.iconBoost());out.talon.push(+API.artK(t).toFixed(2));out.fr.push(+API.artK(fr).toFixed(2));out.rad.push(+(API.uiR(t)*API.cam.z).toFixed(1));}
  return out;});
 ok(t35k1.boost.every(b=>b===1),'HC35 K1: iconBoost is 1 at every zoom '+JSON.stringify(t35k1.boost));
 ok(t35k1.talon[0]===1&&t35k1.talon.slice(1).every(k=>k===0)&&t35k1.fr.every(k=>k===1),'HC35 K1: a Talon becomes an icon below the threshold; the freighter is still art there '+JSON.stringify([t35k1.talon,t35k1.fr]));
 ok(new Set(t35k1.rad.slice(1)).size===1,'HC35 K1: the icon is the same size on screen at three zooms '+JSON.stringify(t35k1.rad));
 ok(Math.abs(t35k1.open[1]-30)<=2,'HC35 K1: the mission opens with fighters about 30 px long '+JSON.stringify(t35k1.open));
 // HC35 K2 (feedback 1, tests 2–5, 16, 19, 21; 20 is in HC35 11 above; 14 is HC35 1's re-recorded baselines):
 // boarding, the ram, turret tracking, Boost Shields, course keeping, Pirate end to end, the stuck guard
 const t35k2=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};if(e.second)B.plan.wings[w].second=e.second;}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=o.assets||[];B.plan.assetAt=o.assetAt||{};B.plan.roes=o.roes||[];if(o.tagger)B.plan.tagger=o.tagger;
    const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);L().cp=9;};   // a plan that can't launch would test the last mission
  const dA=(a,b)=>Math.abs(((a-b)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI)*180/Math.PI;
  const ell=(t,p)=>{const A=F.hullAxes(t),c=Math.cos(-t.h),sn=Math.sin(-t.h),lx=(p.x-t.x)*c-(p.y-t.y)*sn,ly=(p.x-t.x)*sn+(p.y-t.y)*c;return (lx/A.a)**2+(ly/A.b)**2;};
  const rt0=N.RES_THREAT;N.REQ_OFF=1;N.RES_THREAT=0;   // no hail but Pirate's (C-80)
  // 2: boarding. A scripted disabled freighter; Mags (a Boarding party) in a Disable wing, 3,000 off its left side
  go('steal',{amber:{k:'disable',arg:'engines'},dagger:{role:'home'},anvil:{k:'hold'}},{lo:{mags:'board'}});   // (Anvil's bombs: a Steal plan needs them to launch)
  {const f=fr();L().subs[0].hp=0;L().disabled=true;L().spool=null;L().drift={vx:f.vx,vy:f.vy};
   const m=by('mags'),a=f.h+Math.PI/2;m.x=f.x+Math.cos(a)*3000;m.y=f.y+Math.sin(a)*3000;m.px=m.x;m.py=m.y;
   const side0=Math.cos(f.h)*(m.y-f.y)-Math.sin(f.h)*(m.x-f.x)>=0?1:-1,tb=S().t;let step=0,inside=false,docked=null,shots=0;
   const hs=F.hitShip;F.hitShip=function(t,o){if(o==='mags'&&t.id==='fl400')shots++;return hs.apply(this,arguments);};
   for(let i=0;i<30*20&&docked==null;i++){const x=m.x,y=m.y;SIM.step();step=Math.max(step,Math.hypot(m.x-x-f.vx*SIM.TICK/1000,m.y-y-f.vy*SIM.TICK/1000));if(ell(f,m)<=1)inside=true;if(m.dock35)docked=S().t;}
   until(()=>false,5);for(let i=0;i<40;i++){SIM.step();if(ell(f,m)<=1)inside=true;}F.hitShip=hs;
   out.board=[docked!=null,m.dockSide===side0,!S().events.some(e=>e.t>=tb&&e.t<=(docked==null?1e9:docked)+0.1&&e.kind==='collide'&&/Mags/.test(e.text)),step<=N.DOCK_SNAP,shots===0&&!!m.dock35,!inside,L().board>0,Math.round(docked),Math.round(step)];}
  // 3: the ram. Point defence off: it strikes the hull outline, the subsystem it hit loses RAM_DMG, the cause line names it,
  // no kill effect. Then a slow, thin-skinned ram against four full turrets: shot down, and the debrief says so
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{assets:['ram']});L35.alarm('fired');
  {for(const x of L().subs)if(x.k==='pd')x.hp=0;const s0=L().subs.map(x=>x.hp),h0=fr().hull;L35.use('ram',{id:'fl400'});until(()=>!!by('ram35'),40);const r=by('ram35');until(()=>!r.alive,30);
   const q=(L().fxQ||[]).find(x=>x.kind==='ramImpact'),hit=L().ramHit,sb=hit&&L().subs.find(x=>x.k===hit.sub&&x.i===hit.i),i=sb?L().subs.indexOf(sb):-1;
   const name=hit?({engines:'engines',comms:'comms',pd:'turret',cargo:'container'})[hit.sub]:'?';
   out.ram=[r.ram35.done==='impact',!!q&&Math.abs(ell(fr(),q)-1)<0.03,i>=0&&s0[i]-sb.hp===Math.min(s0[i],N.RAM_DMG),Math.abs(h0-fr().hull-N.RAM_CORE)<0.01,
     L().cause.some(c=>/ram hits the freighter/.test(c.text)&&c.text.includes(name)),X.fn.OV.fxSkip(r)===true,L().callouts.some(c=>/^RAM IMPACT · /.test(c.text))];}
  {const sp=N.RAM_SPD,rh=N.RAM_HULL,ra=N.RAM_ARM;N.RAM_SPD=0.3;N.RAM_HULL=10;N.RAM_ARM=0;
   go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}},{assets:['ram']});L35.alarm('fired');L35.use('ram',{id:'fl400'});until(()=>!!by('ram35'),40);
   const r=by('ram35'),f=fr(),a=f.h+0.3;r.x=f.x+Math.cos(a)*2100;r.y=f.y+Math.sin(a)*2100;r.px=r.x;r.py=r.y;r.vx=0;r.vy=0;until(()=>!r.alive,40);
   const shot=r.ram35.done;N.RAM_SPD=sp;N.RAM_HULL=rh;N.RAM_ARM=ra;L35.use('retreat');X.fn.run(300);const db=document.querySelector('#arHc35 .h35-debrief');
   out.ramShot=[shot==='shot',!!L().ramShot,L().callouts.some(c=>c.text==='RAM DESTROYED'),!!db&&/Your ram was shot down \d+ m short at \d+:\d\d/.test(db.textContent)];}
  // 4: turret tracking. 60 s each: a Talon crossing at full speed 1,500 out; a docked Brickbat; a Brickbat's straight bomb run
  const pdRun=mode=>{go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{role:'home'}});
    for(const e of S().ships)if(e.role35==='escort'){e.alive=false;e.jumped=true;}
    L35.alarm('fired');const f=fr(),id=mode==='cross'?'petra':'brask',t=by(id);
    for(const s of S().ships)if(s.faction==='reb'&&s!==t&&s.alive){s.alive=false;s.jumped=true;}
    const HK=SIM.hooks,g0=HK.goal;let pass=0,end=null;
    const start=()=>{const a0=f.h+1.2+pass*0.7,ux=Math.cos(a0),uy=Math.sin(a0);
      if(mode==='cross'){const d=1500;t.x=f.x+ux*d-uy*2500;t.y=f.y+uy*d+ux*2500;end={x:f.x+ux*d+uy*2500,y:f.y+uy*d-ux*2500};}
      else{t.x=f.x+ux*2200-uy*250;t.y=f.y+uy*2200+ux*250;end={x:f.x-ux*1500-uy*250,y:f.y-uy*1500+ux*250};}
      t.px=t.x;t.py=t.y;t.h=Math.atan2(end.y-t.y,end.x-t.x);t.vh=t.h;const v=F.capsOf(t).vMax*(mode==='cross'?1:0.8);t.vx=Math.cos(t.h)*v;t.vy=Math.sin(t.h)*v;pass++;};
    HK.goal=s=>s===t?{x:end.x,y:end.y,spd:mode==='cross'?1:0.8,noCorner:true}:g0(s);start();
    for(let i=0;i<1200;i++){t.hull=t.maxHull;t.arm=t.maxArm;t.thinkT=-1e9;
      if(mode==='dock'){const a=f.h+Math.PI/2;t.x=f.x+Math.cos(a)*90;t.y=f.y+Math.sin(a)*90;t.vx=f.vx;t.vy=f.vy;t.px=t.x;t.py=t.y;}
      else if(Math.hypot(t.x-end.x,t.y-end.y)<300)start();
      SIM.step();}
    HK.goal=g0;const st=L().pdStats[id]||{shots:0,hits:0};return +(st.hits/Math.max(1,st.shots)).toFixed(3);};
  const pc=pdRun('cross'),pk=pdRun('dock'),pb=pdRun('run');
  out.pd=[pc<0.1,pk>0.5,pb>=0.25&&pb<=0.4,pc,pk,pb];
  // a dead turret doesn't fire, and draws dead (the art's pdDead)
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});L35.alarm('fired');
  {const pd=L().subs.filter(x=>x.k==='pd');pd[0].hp=0;pd[0].shotT=-99;until(()=>false,20);const f=fr();
   for(const s of S().ships)if(s.faction==='reb'&&s.alive){s.x=f.x+700;s.y=f.y;s.px=s.x;s.py=s.y;}until(()=>false,5);
   API.setSpeed(0);API.camTo(f.x,f.y,0.3);let o=null;const SA=window.SR_ART,s0=SA.ship;SA.ship=function(c,art){if(art==='gafreighter')o=arguments[7];return s0.apply(this,arguments);};
   window.SR_ARENA_HC.frame(performance.now());SA.ship=s0;API.setSpeed(1);
   out.pdDead=[pd[0].shotT<0,pd.slice(1).some(x=>x.shotT>0),!!o&&Array.isArray(o.pdDead)&&o.pdDead[0]===true&&o.pdDead.slice(1).every(x=>x===false),!!o&&Array.isArray(o.aims)&&o.aims[0]==null];}
  // 5: Boost Shields: SHIELD_CD 24; AUTO only with a half under 30% just hit; no floater
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  {const j=by('joss'),sg=j.segs.F,tr=()=>SIM.abilityTriggers?SIM.abilityTriggers('joss','shields'):F.abilityTriggers('joss','shields');
   const f0=(SIM.floaters||S().floaters).length;
   sg.val=sg.max*0.4;j.zoneHitT={F:S().t};const a=tr().want;sg.val=sg.max*0.2;const b=tr().want;j.zoneHitT={F:S().t-5};const c=tr().want;
   SIM.useAbility?SIM.useAbility('joss','shields'):F.useAbility('joss','shields');
   out.shields=[SIM.ABILITIES.shields.cd===24,a===false,b===true,c===false,!S().floaters.some(x=>/BOOST SHIELDS/.test(x.text))];}
  // 16: course keeping. A Cross rammed into the cruising freighter's side at full speed
  go('destroy',{dagger:{role:'home'},anvil:{role:'home'},amber:{k:'hold'}});until(()=>false,5);
  {const f=fr(),brg=()=>{const p=L().lane[L().leg];return Math.atan2(p.y-f.y,p.x-f.x);},h0=f.h,c=by('hale'),a=f.h+Math.PI/2;
   c.x=f.x+Math.cos(a)*400;c.y=f.y+Math.sin(a)*400;c.px=c.x;c.py=c.y;c.h=a+Math.PI;c.vh=c.h;const v=F.capsOf(c).vMax;c.vx=Math.cos(c.h)*v+f.vx;c.vy=Math.sin(c.h)*v+f.vy;
   const g0=SIM.hooks.goal;SIM.hooks.goal=s=>s===c?{x:f.x,y:f.y,spd:1,noCorner:true}:g0(s);const col0=S().m.collisions||0;let hd=0,off=0;
   for(let i=0;i<60;i++){SIM.step();hd=Math.max(hd,dA(f.h,h0));off=Math.max(off,dA(f.vh,brg()));}SIM.hooks.goal=g0;
   const hitN=(S().m.collisions||0)-col0;let back=null;const t0=S().t;until(()=>{if(back==null&&dA(f.h,brg())<5&&dA(f.vh,brg())<5)back=S().t-t0;return false;},20);
   out.course=[hitN>=1,hd<3,back!=null,until(()=>L().spool!=null||!f.alive,400)&&f.alive,+hd.toFixed(2),+off.toFixed(1)];}
  // … and a disabled freighter shoved by a Brickbat drifts the way it was shoved
  go('destroy',{dagger:{role:'home'},anvil:{role:'home'},amber:{k:'hold'}});until(()=>false,3);
  {const f=fr();L().subs[0].hp=0;L().disabled=true;L().spool=null;L().drift={vx:0,vy:0};f.vx=0;f.vy=0;
   const c=by('mags'),a=f.h+Math.PI/2;c.x=f.x+Math.cos(a)*400;c.y=f.y+Math.sin(a)*400;c.px=c.x;c.py=c.y;c.h=a+Math.PI;c.vh=c.h;const v=F.capsOf(c).vMax;c.vx=Math.cos(c.h)*v;c.vy=Math.sin(c.h)*v;
   const g0=SIM.hooks.goal;SIM.hooks.goal=s=>s===c?{x:f.x,y:f.y,spd:1,noCorner:true}:g0(s);const p0={x:f.x,y:f.y};for(let i=0;i<40;i++)SIM.step();SIM.hooks.goal=g0;until(()=>false,5);
   const mv=Math.hypot(f.x-p0.x,f.y-p0.y);out.shove=[mv>20,dA(Math.atan2(f.y-p0.y,f.x-p0.x),a+Math.PI)<30,Math.round(mv)];}
  // 19: Pirate. Two Intimidate wings and no player input: resolve falls, the hail defaults to Take the cargo, the wing
  // overwatches, the containers jettison, the transfer completes
  N.REQ_OFF=0;N.RES_THREAT=rt0;
  go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});
  {let over=false,crates=0;until(()=>{if(S().ships.some(s=>s.beh&&s.beh.kind==='overwatch35'))over=true;crates=Math.max(crates,(L().crates||[]).length);return L().prim.state!=='live';},300);
   const sur=L().req.log.find(x=>x.k==='surrender');
   out.pirate=[L().prim.state==='done',L().resMin===0,!!sur&&sur.by==='default'&&sur.answer==='take',over,L().jettOut>0&&crates>0,!!L().transferred,L().callouts.some(c=>/^CARGO SURRENDERED/.test(c.text))];}
  // No deal answered: resolve to 40, the hail comes back (30 s at least)
  go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});
  {let noAt=null,r40=null,back=null;until(()=>{const q=L().req.open.find(x=>x.k==='surrender'&&x.state==='open');
     if(q&&noAt==null){L35.answerReq(q.id,'no');noAt=S().t;}else if(noAt!=null&&r40==null&&L().resolve>=39)r40=L().resolve;
     if(q&&noAt!=null&&S().t>noAt+1){back=S().t-noAt;return true;}return false;},200);
   out.nodeal=[noAt!=null,r40!=null,back!=null&&back>=30,L().callouts.some(c=>c.text==='THEY\'RE HOLDING OUT')];}
  // past REQ_CAP the hail still shows a card
  {const cap=N.REQ_CAP;N.REQ_CAP=0;go('pirate',{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}});
   until(()=>!!L().req.open.find(x=>x.k==='surrender'),120);const q=L().req.open.find(x=>x.k==='surrender');API.syncHud(true);
   out.capped=[!!q&&q.state==='open',!!q&&!!document.querySelector('.h35-reqs [data-req="'+q.id+'"]')];N.REQ_CAP=cap;}
  // Fanatical Crew: Intimidate becomes impossible, and its Secondary is taken up
  N.REQ_OFF=1;
  go('steal',{dagger:{k:'intimidate',second:{trig:'phase2',k:'suppress',arg:'escorts'}},anvil:{k:'disable',arg:'engines'},amber:{k:'board'}},{mods:[{k:'fanatical',hidden:true}],lo:{mags:'board'}});
  {let noted=null;until(()=>{const sc=L().sec.dagger;if(sc&&sc.fired&&noted==null)noted=!sc.adopted&&L().exec.dagger.k==='intimidate';return L().fanaticT!=null;},150);until(()=>false,1);
   out.fanatical=[L().fanaticT!=null,noted===true,L().exec.dagger.k==='suppress',L().secLog.some(x=>x.wid==='dagger'&&x.k==='suppress'),L().mods.find(m=>m.k==='fanatical').found===true];}
  // 21: the stuck guard. Dagger on Tag with no way to do it (Kit's at home): "getting nowhere", once
  N.REQ_OFF=0;N.RES_THREAT=0;
  go('destroy',{dagger:{k:'tag'},anvil:{role:'home'},amber:{role:'home'}},{tagger:'kit'});until(()=>false,N.EXEC_STALL+60);
  {const st=L().req.log.filter(x=>x.k==='stall');out.stall=[st.length===1,st.length===1&&st[0].who==='joss'&&st[0].t0>=N.EXEC_STALL-0.1];}
  N.RES_THREAT=rt0;N.REQ_OFF=0;
  return out;
 });
 ok(!t35k2.stale,'HC35 K2: every scripted plan launched '+JSON.stringify(t35k2.stale));
 ok(t35k2.board.slice(0,7).every(Boolean),'HC35 K2 2: a boarder docks on the side it came from in 30 s, no collision, no jump past DOCK_SNAP, holds fire, outside the hull '+JSON.stringify(t35k2.board));
 ok(t35k2.ram.every(Boolean),'HC35 K2 3: the ram strikes the hull outline, the subsystem it hit loses RAM_DMG, the cause names it, no kill effect '+JSON.stringify(t35k2.ram));
 ok(t35k2.ramShot.every(Boolean),'HC35 K2 3: a slow ram is shot down and the debrief says how far short '+JSON.stringify(t35k2.ramShot));
 ok(t35k2.pd.slice(0,3).every(Boolean),'HC35 K2 4: turret hit rates: crossing Talon < 10%, docked Brickbat > 50%, bomb run 25–40% '+JSON.stringify(t35k2.pd));
 ok(t35k2.pdDead.every(Boolean),'HC35 K2 4: a dead turret doesn\'t fire and draws with pdDead '+JSON.stringify(t35k2.pdDead));
 ok(t35k2.shields.every(Boolean),'HC35 K2 5: SHIELD_CD 24; AUTO only below 30% and just hit; no BOOST SHIELDS floater '+JSON.stringify(t35k2.shields));
 ok(t35k2.course.slice(0,4).every(Boolean),'HC35 K2 16: a Cross rammed into the freighter turns it under 3°, it\'s back on its lane in 20 s and reaches its jump '+JSON.stringify(t35k2.course));
 ok(t35k2.shove.slice(0,2).every(Boolean),'HC35 K2 16: a disabled freighter drifts the way it was shoved '+JSON.stringify(t35k2.shove));
 ok(t35k2.pirate.every(Boolean),'HC35 K2 19: Pirate wins with no input: resolve, the default hail, overwatch, the crates, the transfer '+JSON.stringify(t35k2.pirate));
 ok(t35k2.nodeal.every(Boolean),'HC35 K2 19: No deal: resolve to 40, the hail returns after 30 s '+JSON.stringify(t35k2.nodeal));
 ok(t35k2.capped.every(Boolean),'HC35 K2 19: past REQ_CAP the hail still shows a card '+JSON.stringify(t35k2.capped));
 ok(t35k2.fanatical.every(Boolean),'HC35 K2 19: Fanatical Crew makes Intimidate impossible and its Secondary is taken up '+JSON.stringify(t35k2.fanatical));
 ok(t35k2.stall.every(Boolean),'HC35 K2 21: the stuck guard asks once '+JSON.stringify(t35k2.stall));
 // HC35 K3 (feedback 1, tests 5's sweep, 6, 7, 17): no damage numbers, the shield halves' refill sweep, health
 // colours, the death spin from the ship's turn
 const t35k3=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,FX=API.FX,TH=(typeof SR!=='undefined'&&SR.theme)||window.SR_THEME,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex)=>{B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    B.plan.assets=[];B.plan.assetAt={};B.plan.roes=[];const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);};
  let fn=performance.now();const frame=()=>{fn+=1000;window.SR_ARENA_HC.frame(fn);};
  const rt0=N.RES_THREAT;N.REQ_OFF=1;N.RES_THREAT=0;
  // 6: no damage numbers (and in 3.5 no floating words at all); with SHOW_DMG on, the freighter's add up to what it took
  const fight={dagger:{k:'destroy'},anvil:{role:'home'},amber:{role:'home'}};
  go('destroy',fight);const seen=new Set();let words=0,nums=0;
  until(()=>{for(const f of S().floaters)if(!seen.has(f)){seen.add(f);words++;if(/^-\d/.test(f.text))nums++;}return false;},30);
  out.off=[nums===0,words===0,SIM.TUNE.SHOW_DMG.get()===0];
  SIM.TUNE.SHOW_DMG.set(1);go('destroy',fight);
  {const f=fr();for(const k of ['F','R']){f.segs[k].val=0;f.segs[k].max=0;}   // no shield regeneration to muddy the sum
   const tot=()=>Math.max(0,f.arm)+Math.max(0,f.hull)+L().subs.reduce((a,x)=>a+Math.max(0,x.hp),0),t0=tot();let sum=0,n=0;const sn=new Set();
   until(()=>{for(const q of S().floaters)if(!sn.has(q)){sn.add(q);if(q.kind==='dmg'&&q.id==='fl400'){sum+=+q.text.slice(1);n++;}}return false;},30);
   const took=t0-tot(),shown=sum+(f.dmgAcc||0);out.on=[n>0,Math.abs(shown-took)<=n*0.5+0.5,+shown.toFixed(1),+took.toFixed(1),n];}
  SIM.TUNE.SHOW_DMG.set(0);
  // 5 (K3): a refill starts the arc's sweep
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});API.setSpeed(0);
  {const j=by('joss');j.segs.F.val=j.segs.F.max*0.2;j.segs.R.val=j.segs.R.max*0.2;frame();const before=API.sweepOf('joss','F')==null&&API.sweepOf('joss','R')==null;
   (SIM.useAbility||F.useAbility)('joss','shields');frame();out.sweep=[before,API.sweepOf('joss','F')!=null||API.sweepOf('joss','R')!=null];}
  // 7: health colours. A tile, a canvas pip and the pilot panel at 70%, 45% and 20% hull: go, hazard, rebel red
  {const j=by('joss'),rgb=h=>'rgb('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')',want=[TH.C.go,TH.C.hazard,TH.C.rebel].map(rgb),got=[];
   API.A.selShip='joss';API.openPilot('joss');const hp0=TH.hpPips;let pip=null;TH.hpPips=function(c,x,y,o){if(o&&Math.abs(o.hp-Math.max(0,j.hull))<1e-6&&o.max===j.maxHull)pip=rgb(TH.hpCol(o.hp/o.max,o.bands));return hp0.apply(this,arguments);};
   for(const f of [0.7,0.45,0.2]){j.hull=j.maxHull*f;pip=null;frame();API.syncHud(true);frame();
     const tb=document.querySelector('.hc-tile[data-ship="joss"] .hc-bar--hull b'),pb=document.querySelector('#hcPilot .hc-pbar.is-hull b');
     got.push([tb&&tb.style.background,pip,pb&&pb.style.background]);}
   TH.hpPips=hp0;API.A.selShip=null;
   out.colours=[got.every((g,i)=>g.every(x=>x===want[i])),JSON.stringify(got)];}
  API.setSpeed(1);
  // 17: the death spin. A Brickbat flying straight tumbles slowly; a Talon killed mid-turn whips round its turn's way;
  // the FL-400 never spirals
  {const ch=FX.TUNE.spiralChance;FX.TUNE.spiralChance=2;const OS=FX.fn.os_,spirals=()=>OS().filter(e=>e.kind==='spiral');
   go('destroy',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{role:'home'}});until(()=>false,3);API.setSpeed(0);frame();   // (the effects see the ships once first)
   const b=by('brask');b.w=0;b.turnW=0;let n0=spirals().length;F.kill(b,null);b.deadT=S().t;frame();const sb=spirals().slice(n0)[0];
   const t=by('petra'),g0=SIM.hooks.goal;SIM.hooks.goal=s=>s===t?{x:t.x+Math.cos(t.vh+1.5)*800,y:t.y+Math.sin(t.vh+1.5)*800,spd:0.7}:g0(s);
   for(let i=0;i<120&&Math.abs(t.w)<1.1;i++)SIM.step();SIM.hooks.goal=g0;const tw=t.turnW;n0=spirals().length;   // killed with its nose swinging
  F.kill(t,null);t.deadT=S().t;frame();const st=spirals().slice(n0)[0];
   n0=spirals().length;FX.event('explode',{x:0,y:0,size:10,art:'gafreighter',livery:'heg',spiral:true,w:2,turnW:2});const sf=spirals().length===n0;
   FX.TUNE.spiralChance=ch;API.setSpeed(1);
   out.spin=[!!sb&&Math.abs(sb.spin)<1.5,!!st&&Math.abs(st.spin)>4&&Math.sign(st.spin)===Math.sign(tw),sf,sb&&+sb.spin.toFixed(2),st&&+st.spin.toFixed(2),+tw.toFixed(2)];}
  N.RES_THREAT=rt0;N.REQ_OFF=0;
  return out;
 });
 ok(!t35k3.stale,'HC35 K3: every scripted plan launched '+JSON.stringify(t35k3.stale));
 ok(t35k3.off.every(Boolean),'HC35 K3 6: 30 s of fighting floats no damage numbers (and no words in 3.5) '+JSON.stringify(t35k3.off));
 ok(t35k3.on.slice(0,2).every(Boolean),'HC35 K3 6: with SHOW_DMG on, the freighter\'s numbers add up to the damage it took '+JSON.stringify(t35k3.on));
 ok(t35k3.sweep.every(Boolean),'HC35 K3 5: a refill starts the arc sweep '+JSON.stringify(t35k3.sweep));
 ok(t35k3.colours[0],'HC35 K3 7: tile, canvas pip and pilot panel at 70/45/20% hull read go, hazard, red '+t35k3.colours[1]);
 ok(t35k3.spin.slice(0,3).every(Boolean),'HC35 K3 17: a straight Brickbat tumbles under 1.5 rad/s, a turning Talon over 4 its turn\'s way, the FL-400 never spirals '+JSON.stringify(t35k3.spin));
 // HC35 K4 (feedback 1, tests 8, 9, 18): one vocabulary for what your ships do, the callouts, reinforcements on the roster
 const t35k4=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const until=(f,secs)=>{const n=Math.round(secs*20);for(let i=0;i<n&&!S().over;i++){if(f())return true;SIM.step();}return !!f();};
  const go=(prim,ex,o)=>{o=o||{};B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){const e=ex[w];if(!e)continue;if(e.role)B.plan.wings[w].role=e.role;if(e.k)B.plan.wings[w].exec={k:e.k,arg:e.arg||null};}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=[];B.plan.assetAt={};B.plan.roes=[];if(o.tagger)B.plan.tagger=o.tagger;const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);L().cp=9;};
  let fn=performance.now();const frame=()=>{fn+=1000;window.SR_ARENA_HC.frame(fn);};
  const rt0=N.RES_THREAT;N.REQ_OFF=1;
  // 8: every behaviour your ships reach in a scripted run of each primary maps to a verb; no tile shows a raw id
  const plans={destroy:[{anvil:{k:'destroy'},dagger:{k:'defend',arg:'anvil'},amber:{k:'suppress',arg:'turrets'}}],
    steal:[{anvil:{k:'disable',arg:'engines'},amber:{k:'board'},dagger:{k:'defend',arg:'anvil'}},{lo:{mags:'board'}}],
    pirate:[{dagger:{k:'intimidate'},amber:{k:'intimidate'},anvil:{k:'defend',arg:'amber'}}],
    strip:[{anvil:{k:'disable',arg:'engines'},amber:{k:'haul'},dagger:{k:'suppress',arg:'escorts'}},{lo:{mags:'pods'}}],
    tag:[{amber:{k:'tag'},dagger:{k:'hold'},anvil:{role:'home'}},{tagger:'kit'}],
    ambush:[{dagger:{k:'ambush'},amber:{k:'ambush'},anvil:{k:'disable',arg:'engines'}}],
    crash:[{anvil:{k:'disable',arg:'engines'},dagger:{k:'hold'},amber:{k:'defend',arg:'anvil'}}]};
  const kinds={},raw=[],tiles=new Set();let n=0;API.setSpeed(0);
  for(const p in plans){N.RES_THREAT=p==='pirate'?rt0:0;go(p,plans[p][0],plans[p][1]);API.setSpeed(0);
    until(()=>{for(const s of S().ships)if(s.alive&&s.faction==='reb'&&s.wing){const v=L35.verbOf(s),k=(s.beh&&s.beh.kind)||'none';(kinds[k]||(kinds[k]=new Set())).add(v.k);if(v.k==='busy')raw.push(p+':'+k);}
      if(++n%40===0){frame();for(const e of document.querySelectorAll('#arHc .hc-tile__word'))tiles.add(e.textContent);}return L().prim.state!=='live';},150);}
  N.RES_THREAT=0;
  const rawTile=[...tiles].filter(t=>/^[A-Z0-9]+$/.test(t)&&!/^(DOWN|JUMPED)$/.test(t));
  out.vocab=[!raw.length,!rawTile.length,Object.keys(kinds).length>=10,raw.slice(0,5),rawTile.slice(0,5),Object.keys(kinds)];
  // 9: the callouts. A container coming aboard fires CARGO SECURED; a subsystem dying fires its DOWN; one off screen
  // makes an edge arrow
  go('strip',{anvil:{k:'disable',arg:'engines'},amber:{k:'haul'},dagger:{k:'suppress',arg:'escorts'}},{lo:{mags:'pods'}});
  {const got=until(()=>L().callouts&&L().callouts.some(c=>/^CARGO SECURED 1\/\d · MAGS$/.test(c.text)),150);out.co=[got,(L().callouts||[]).some(c=>c.text==='ENGINES DOWN'&&c.tone==='good')];}
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'home'}});
  {const f=fr(),cm=L().subs.find(x=>x.k==='comms');F.applyDamage(f,cm.hp*4+40,true,true,{x:f.x,y:f.y,by:null,aimSub:'comms'});SIM.step();
   const c=(L().callouts||[]).find(x=>x.text==='COMMS DOWN');out.co.push(!!c&&cm.hp<=0);
   API.setSpeed(0);API.camTo(f.x+60000>SIM.W?f.x-60000:f.x+60000,f.y,0.5);frame();const ar=B.coArrows||[];out.co.push(ar.some(a=>a.text==='COMMS DOWN'));API.camTo(f.x,f.y,0.3);API.setSpeed(1);}
  // 18: the Reserves called in get a roster card in the frame they warp in; so does High Command's Reinforce
  go('destroy',{dagger:{k:'hold'},anvil:{role:'home'},amber:{role:'reserve',k:'hold'}});API.setSpeed(0);frame();
  {const had=!!document.querySelector('#hcRoster [data-wing="amber"]');L35.use('reserve',{});until(()=>!!F.wingOf('amber'),40);frame();
   const card=document.querySelector('#hcRoster [data-wing="amber"]');
   out.res=[!had,!!card,!!card&&card.classList.contains('is-arriving'),!!card&&card.querySelectorAll('.hc-tile').length===4,S().events.some(e=>e.text==='Amber on station'),(L().callouts||[]).some(c=>c.text==='AMBER ARRIVED')];}
  API.setSpeed(1);N.RES_THREAT=rt0;N.REQ_OFF=0;
  return out;
 });
 ok(!t35k4.stale,'HC35 K4: every scripted plan launched '+JSON.stringify(t35k4.stale));
 ok(t35k4.vocab.slice(0,3).every(Boolean),'HC35 K4 8: every behaviour reached in each primary maps to a verb; no tile shows a raw id '+JSON.stringify(t35k4.vocab));
 ok(t35k4.co.every(Boolean),'HC35 K4 9: CARGO SECURED, ENGINES and COMMS DOWN, and an edge arrow for one off screen '+JSON.stringify(t35k4.co));
 ok(t35k4.res.every(Boolean),'HC35 K4 18: the Reserves get a roster card in the frame they warp in, "on station", ARRIVED '+JSON.stringify(t35k4.res));
 // HC35 K5 (feedback 1, test 10): an enemy selected to inspect; the target readout tracks the engines; a dead turret's ✕
 const t35k5=await pg4.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';B.plan.assets=[];B.plan.roes=[];X.fn.launch();API.setSpeed(0);
  const card=()=>document.getElementById('h35Tgt'),row=k=>{const r=card()&&card().querySelector('[data-row="'+k+'"] span');return r?r.textContent:null;};
  const f=fr();X.fn.OV.mapClick({x:f.x,y:f.y},{},f);X.fn.syncTarget(true);
  out.sel=[B.inspect==='fl400',!!card()&&!card().hidden,!!card().querySelector('canvas'),API.A.selShip==null];
  const e=L().subs.find(x=>x.k==='engines');e.hp=50;X.fn.syncTarget(true);const r1=row('engines');e.hp=0;X.fn.syncTarget(true);const r2=row('engines');
  out.eng=[r1==='Engines · 50/120',r2==='Engines · 0/120 · DOWN',r1,r2];
  const pd=L().subs.filter(x=>x.k==='pd');pd[2].hp=0;X.fn.syncTarget(true);out.pd=[row('turrets')==='Turrets · 3 of 4',(B.schX||[]).includes('pd2'),X.fn.subTip(pd[2]).name==='Turret · 0/40 · Down'];
  const es=S().ships.find(s=>s.role35==='escort');X.fn.OV.mapClick({x:es.x,y:es.y},{},es);X.fn.syncTarget(true);
  out.esc=[B.inspect===es.id,!!card().querySelector('.hc-pbar.is-hull'),!card().querySelector('canvas')];
  X.fn.OV.mapClick({x:f.x+20000,y:f.y},{},null);X.fn.syncTarget(true);out.esc.push(B.inspect==null,card().hidden);
  API.setSpeed(1);return out;
 });
 ok(t35k5.sel.every(Boolean),'HC35 K5 10: a click on the freighter selects it to inspect and shows its readout '+JSON.stringify(t35k5.sel));
 ok(t35k5.eng.slice(0,2).every(Boolean),'HC35 K5 10: the engines row tracks hp '+JSON.stringify(t35k5.eng));
 ok(t35k5.pd.every(Boolean),'HC35 K5 10: a destroyed turret shows ✕ '+JSON.stringify(t35k5.pd));
 ok(t35k5.esc.every(Boolean),'HC35 K5: an escort shows its smaller card; a click on empty space clears it '+JSON.stringify(t35k5.esc));
 // HC35 K6 (feedback 1, tests 11–13): the journey (the Missions tab, the four windows, Back / Next / Esc, Launch, Plan
 // again), one tooltip and no native title anywhere, the debrief's pods and its order of causes
 await pg4.mouse.move(2,2);   // the cursor out of the way: Chromium's hover follows a re-layout under a parked cursor
 const t35k6=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={titles:[]};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)],key=(k,o)=>document.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
  const titles=where=>{const n=document.querySelectorAll('#arHc [title]').length;if(n)out.titles.push(where+':'+n+':'+[...document.querySelectorAll('#arHc [title]')].slice(0,3).map(e=>e.className).join('|'));};
  B.seed=4242;B.plan=null;B.step=1;X.fn.showBoard(true);B.seed=4242;X.fn.showBoard(false);
  // 11: the Missions tab, with the vanilla classes; Plan mission opens window 1
  out.tab=[B.screen==='board',!!q('.bf-stage.h35-missions'),!!q('.bf-board .bf-card.is-sel'),!!q('.bf-holo .bf-proj svg'),!!q('.bf-rail .bf-plan [data-act="brief"]'),
    qa('.h35-tab[data-tip="na:arena"]').length===4,qa('.bf-card[aria-disabled="true"]').length>=3,!!q('[data-act="newopp"]'),!!q('.bf-callout.is-foe')];titles('board');
  q('.bf-plan [data-act="brief"]').click();
  out.w1=[B.screen==='brief',B.step===1,!!q('.h35-holo'),/Objective/.test((q('.h35-node.is-on')||{}).textContent||''),q('[data-act="next"]').getAttribute('aria-disabled')==='true'];titles('w1');
  q('[data-primary="destroy"]').click();q('[data-act="next"]').click();const w2=B.step===1&&B.part===2;titles('w1b');q('[data-act="next"]').click();const w2b=B.step===2;titles('w2');
  q('[data-act="prev"]').click();const back=B.step===1&&B.part===2;q('[data-act="prev"]').click();const back1=B.step===1&&B.part===1;
  q('[data-act="next"]').click();key('Escape');const esc1=B.step===1&&B.part===1;key('Escape');const esc0=B.screen==='board'&&B.plan&&B.plan.primary==='destroy';
  q('.bf-plan [data-act="brief"]').click();key('ArrowRight');key('ArrowRight');key('ArrowRight');titles('w3');key('ArrowRight');const w4=B.step===4&&!!q('.h35-holo.is-wide [data-pane]');titles('w4');
  q('.h35-node.is-done [data-step="2"]').click();const node=B.step===2;key('ArrowRight');key('ArrowRight');
  out.steps=[w2,w2b,back,back1,esc1,esc0,w4,node,B.step===4];
  q('[data-act="launch"]').click();out.launch=[B.screen==='live',!!SIM.S&&SIM.S.t===0];API.syncHud(true);API.openPilot('joss');API.syncHud(true);titles('live');
  // 12: the one tooltip: hovering an objective card shows #hcTip with its title
  X.fn.run(400);titles('debrief');q('[data-act="again"]').click();out.again=[B.screen==='brief',B.step===1,B.plan.primary==='destroy'];
  API.hideTip();const card=q('[data-primary="steal"]');card.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));await new Promise(r=>setTimeout(r,320));
  const tip=document.getElementById('hcTip');out.tip=[!tip.hidden,/Steal/.test(tip.textContent),!!tip.querySelector('.sr-tip__title'),tip.textContent.slice(0,80)];
  card.dispatchEvent(new PointerEvent('pointerout',{bubbles:true}));
  // 13: a pod left drifting at the end resolves (never "drifting"); a failed Steal's cause comes first
  const e0=N.EJECT_P;N.EJECT_P=1;N.REQ_OFF=1;
  B.seed=777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='steal';
  for(const w in B.plan.wings)B.plan.wings[w].exec={k:'hold',arg:null};B.plan.wings.amber.loadout.mags='board';B.plan.assets=[];B.plan.roes=[];X.fn.launch();
  L35.use('retreat');X.fn.run(400);
  const db=q('.h35-debrief'),why=db?[...db.querySelectorAll('.h35-why p')].map(p=>p.textContent):[];
  out.deb=[X.L.prim.state==='failed',/jumped at|never knocked out|never got aboard|prize never|destroyed/.test(why[0]||''),why[0]||''];
  // the mission ends with Wren's pod still out
  B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';for(const w in B.plan.wings)B.plan.wings[w].exec={k:'hold',arg:null};B.plan.assets=[];B.plan.roes=[];X.fn.launch();
  F.kill(SIM.fn.byId('wren'),null);SIM.step();const pod=X.L.pods[0],drift=!!pod&&pod.state==='drift';SIM.endMission('done');X.fn.run(2);
  const db2=q('.h35-debrief');
  out.pod=[drift,!!pod&&(pod.state==='captured'||pod.state==='lost'),!!db2&&!/drifting/.test(db2.textContent),!!db2&&/Wren \((captured|lost, left behind)\)/.test(db2.textContent),pod&&pod.state];
  N.EJECT_P=e0;N.REQ_OFF=0;
  return out;
 });
 ok(t35k6.tab.every(Boolean),'HC35 K6 11: the Missions tab mock (bf- classes, inert tabs, dimmed cards, the holo-table, the rail) '+JSON.stringify(t35k6.tab));
 ok(t35k6.w1.every(Boolean),'HC35 K6 11: Plan mission opens window 1; Next waits for a primary '+JSON.stringify(t35k6.w1));
 ok(t35k6.steps.every(Boolean),'HC35 K6 11: Next and Back move one step, Esc goes back, the arrows step, a done node returns '+JSON.stringify(t35k6.steps));
 ok(t35k6.launch.every(Boolean),'HC35 K6 11: Launch from window 4 starts the mission '+JSON.stringify(t35k6.launch));
 ok(t35k6.again.every(Boolean),'HC35 K6 11: Plan again returns to window 1 with the plan kept '+JSON.stringify(t35k6.again));
 ok(!t35k6.titles.length,'HC35 K6 12: no [title] in #arHc or #arHc35 on any screen '+JSON.stringify(t35k6.titles));
 ok(t35k6.tip.slice(0,3).every(Boolean),'HC35 K6 12: hovering an objective card shows #hcTip with its title '+JSON.stringify(t35k6.tip));
 ok(t35k6.deb.slice(0,2).every(Boolean),'HC35 K6 13: a failed Steal lists its failure cause first '+JSON.stringify(t35k6.deb));
 ok(t35k6.pod.slice(0,4).every(Boolean),'HC35 K6 13: a pod still drifting at the end is Captured or Lost, never drifting '+JSON.stringify(t35k6.pod));
 // HC35 L1: the planning windows (feedback 2, §1–2): a pick doesn't replay the window's opening, a scrolled pane stays put, each primary shows its rewards
 const t35l1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  q('[data-primary="crash"]').click();const w=q('.h35-holo');
  out.pop=[!!w,!w.classList.contains('is-open'),w.getAnimations().length===0,getComputedStyle(w).animationName];
  out.rew=[qa('[data-primary]').length===7,qa('[data-primary] .h35-rew--bonus .sr-cost').length===7,qa('[data-primary="strip"] .h35-rew__per .sr-cost').length===1,
    /300/.test(q('[data-primary="destroy"] .h35-rew').textContent),qa('[data-primary] .h35-rew [title]').length===0];
  // window 3: scroll its body, pick an asset slot; the body is where it was
  B.step=3;X.fn.render();const b=q('.h35-holo__body'),over=b.scrollHeight>b.clientHeight+20;b.scrollTop=over?b.scrollHeight:0;const st=b.scrollTop;
  q('[data-slot]').click();const b2=q('.h35-holo__body');
  out.keep=[over,b2!==b,Math.abs(b2.scrollTop-st)<=2||b2.scrollTop>=b2.scrollHeight-b2.clientHeight-2,q('.h35-holo').getAnimations().length===0];
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35l1.pop.slice(0,3).every(Boolean),'HC35 L1 1: picking a primary re-renders the window without replaying its opening '+JSON.stringify(t35l1.pop));
 ok(t35l1.rew.every(Boolean),'HC35 L1 1.1: every primary shows what it pays and its Accomplished bonus '+JSON.stringify(t35l1.rew));
 ok(t35l1.keep.slice(1).every(Boolean),'HC35 L1 1: a pick keeps the scrolled pane where it was, with no pop '+JSON.stringify(t35l1.keep));
 // HC35 L2: a retreat really retreats; Hold for My Signal ends when a wing is fired on or the alarm goes up; wings fight back (feedback 2, §3.1–3.2)
 const t35l2=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id);
  const go=(prim,k,o)=>{o=o||{};B.seed=o.seed||777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=typeof k==='string'?{k,arg:null}:Object.assign({},k);B.plan.wings[w].second=null;}B.plan.assets=[];B.plan.assetAt={};B.plan.roes=o.roes||[];X.fn.launch();L().cp=9;};
  const rt0=N.RES_THREAT,co=N.COMMS_OFF;N.REQ_OFF=1;N.RES_THREAT=0;N.COMMS_OFF=1;
  const mine=()=>S().ships.filter(s=>s.alive&&s.faction==='reb'&&s.wing&&!s.prop35);
  const think=s=>{s.thinkT=F.THINK_SECS_();SIM.step();};
  // 1: holding for the signal. Fired on, that wing goes (for good) and its leader says so; the alarm sends every wing
  go('destroy','destroy',{roes:['signal'],seed:991});SIM.runFor(2);
  const esc=S().ships.find(s=>s.role35==='escort'&&s.alive),joss=by('joss');
  const wait0=mine().every(s=>s.beh&&s.beh.why==='waiting for your signal');
  joss.hitT=S().t;joss.firedOnT=S().t;joss.lastHitBy=esc.id;think(joss);SIM.runFor(4);
  out.fired=[wait0,!!L().sigW.dagger,L().dec[0].wid==='dagger'&&/fired on/.test(L().dec[0].why),L().dec.some(d=>d.wid==='dagger'&&d.kind==='signal'),by('wren').beh.why!=='waiting for your signal'];
  L35.alarm('detected','test');SIM.runFor(1);
  out.spotted=[['dagger','anvil','amber'].every(w=>L().sigW[w]),L().dec.filter(d=>d.kind==='signal').length===3,mine().every(s=>s.beh&&s.beh.why!=='waiting for your signal'),
    S().events.some(e=>e.kind==='leader')];
  // 2: self-defence. A wing on Hold, one of its ships shot at: it turns on the shooter without being told
  go('destroy','hold',{seed:992});SIM.runFor(2);
  const kit=by('kit'),e2=S().ships.find(s=>s.role35==='escort'&&s.alive);kit.hitT=S().t;kit.firedOnT=S().t;kit.lastHitBy=e2.id;think(kit);
  out.defend=[kit.beh.kind==='engage',kit.beh.target===e2.id,kit.beh.why==='self-defence'];
  // 3: the retreat. A fight with the escort going; Retreat: every ship heads for the jump point (after a 4 s turn), and gets there
  // (was Tag, which can't launch without a tracker named, so the test ran on the last mission)
  go('destroy',{k:'suppress',arg:'escorts'},{seed:41});for(let i=0;i<300&&!L().alarm;i++)SIM.runFor(1);SIM.runFor(20);out.t0=[+S().t.toFixed(1),L().prim.state];
  const n0=mine().length;L35.use('retreat');SIM.runFor(4);
  const jp=S().points.ourjump;let toward=0,samples=0,kinds=new Set();
  for(let i=0;i<12;i++){for(const s of mine()){samples++;kinds.add(s.beh&&s.beh.kind);const dx=jp.x-s.x,dy=jp.y-s.y,d=Math.hypot(dx,dy)||1,v=Math.hypot(s.vx,s.vy)||1;if((s.vx*dx+s.vy*dy)/(d*v)>0.3)toward++;}SIM.runFor(1);}
  const panicky=mine().filter(s=>s.panic).length;
  SIM.runFor(60);const home=S().ships.filter(s=>s.faction==='reb'&&s.wing&&s.jumped).length,left=mine().length;
  out.retreat=[n0>0&&L().primK==='destroy',toward/samples>=0.8,[...kinds].every(k=>k==='withdraw'||k==='flee'||k==='freeze'),left<=panicky,L().dec.some(d=>d.kind==='retreat'),+(toward/samples).toFixed(2),[...kinds].join('/'),n0,home,left];
  N.RES_THREAT=rt0;N.REQ_OFF=0;N.COMMS_OFF=co;
  return out;
 });
 ok(t35l2.fired.every(Boolean),'HC35 L2 3.1: holding for the signal, a wing fired on goes for good, and its leader says so '+JSON.stringify(t35l2.fired));
 ok(t35l2.spotted.every(Boolean),'HC35 L2 3.1: the alarm sends every waiting wing, each leader\'s call logged '+JSON.stringify(t35l2.spotted));
 ok(t35l2.defend.every(Boolean),'HC35 L2 3.1: a ship on Hold turns on whoever shoots at it, untold '+JSON.stringify(t35l2.defend));
 ok(t35l2.retreat.slice(0,5).every(Boolean),'HC35 L2 3.2: on Retreat every ship heads for the jump point and gets there '+JSON.stringify(t35l2.retreat));
 // HC35 L3: the leaders decide in the field: a primary that can't be done falls back in its family; idle wings find work; the debrief shows their calls and the rewards (feedback 2, §1.1, §3)
 const t35l3=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex[w]);B.plan.wings[w].second=null;}
    for(const sid in o.lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo[sid];
    B.plan.assets=[];B.plan.assetAt={};B.plan.roes=[];B.plan.optionals=[];if(o.tagger)B.plan.tagger=o.tagger;
    const was=X.S;X.fn.launch();if(X.S===was||S().t!==0)(out.stale||(out.stale=[])).push(prim);L().cp=9;};
  const keep={RES_THREAT:N.RES_THREAT,RES_ENGINES:N.RES_ENGINES,RES_TURRET:N.RES_TURRET,RES_ESCORT:N.RES_ESCORT,COMMS_OFF:N.COMMS_OFF};
  N.REQ_OFF=1;N.RES_THREAT=0;N.RES_ENGINES=0;N.RES_TURRET=0;N.RES_ESCORT=0;N.COMMS_OFF=1;   // no surrender to muddy it
  // 1: Crash, the power plant shot out far from the planet: dead in space outside the pull. Destroy takes over; every wing
  // re-tasks (since 22 October the leaders wait for the gravity window, so the test knocks it out)
  go('crash',{dagger:{k:'suppress',arg:'escorts'},anvil:{k:'disable',arg:'engines'},amber:{k:'defend',arg:'anvil'}},{seed:31});
  SIM.runFor(5);const e=L().subs.find(x=>x.k==='power');e.hp=0;L35.fn.subDown(fr(),e,null);
  for(let i=0;i<200&&!L().fallback;i++)SIM.runFor(1);
  const fb=L().fallback||{},dec=L().dec;
  out.crash=[fb.from==='crash',fb.to==='destroy',/outside the pull/.test(fb.why||''),L().primK==='destroy',L().prim.state==='live',dec.some(d=>d.kind==='fallback'&&/Crash is off/.test(d.line)),
    Object.values(L().exec).every(x=>x.k==='destroy'||x.k==='suppress'),/Destroy \(for Crash\)/.test(S().objectives[0].text)];
  fr().hull=1;SIM.runFor(20);const r=L35.rewardOf();
  out.reward=[L().prim.state==='done',r.k==='destroy',r.earned.c===300,!r.bonus,r.missed&&r.missed.c===200];
  X.fn.run(400);const db=document.querySelector('#arHc35 .h35-debrief');
  out.deb=[!!db,(db.querySelector('.sr-stamp')||{}).textContent==='PARTIAL',/the fallback/.test(db.textContent),!!db.querySelector('.h35-rew--deb .sr-cost'),/Missed: Crash/.test(db.textContent),
    db.querySelectorAll('.h35-leaders .h35-lead').length>=2,db.querySelectorAll('.h35-leaders li.is-fallback').length===1,/Crash was off at/.test((db.querySelector('.h35-why p')||{}).textContent||''),
    (B.metrics[B.metrics.length-1]||{}).stamp==='partial'];
  // 2: Steal, the boarding party lost before it boards: no pods, so Pirate; 3: Crash blown up in space: Destroy, done
  go('steal',{dagger:{k:'defend',arg:'anvil'},anvil:{k:'disable',arg:'engines'},amber:{k:'board'}},{seed:32,lo:{mags:'board'}});
  SIM.runFor(3);F.kill(by('mags'),null);SIM.runFor(2);
  out.steal=[L().primK==='pirate',/boarding party/.test((L().fallback||{}).why||''),Object.values(L().exec).every(x=>x.k==='intimidate')];
  go('crash',{dagger:{k:'destroy'},anvil:{k:'destroy'},amber:{k:'destroy'}},{seed:33});SIM.runFor(3);F.kill(fr(),null);SIM.runFor(2);
  out.blown=[L().primK==='destroy',L().prim.state==='done',L35.rewardOf().earned.c===300];
  // 4: no fallback outside a family (Tag); one fallback a mission
  go('tag',{dagger:{k:'destroy'},anvil:{k:'destroy'},amber:{k:'tag'}},{seed:35,tagger:'kit'});SIM.runFor(3);F.kill(fr(),null);SIM.runFor(2);
  out.tag=[L().prim.state==='failed',!L().fallback,!!L35.rewardOf().missed];
  // 5: an idle wing finds work; your own Hold stays a Hold
  go('destroy',{dagger:{k:'hold'},anvil:{k:'suppress',arg:'escorts'},amber:{k:'destroy'}},{seed:34});
  SIM.runFor(3);for(const s of S().ships)if(s.role35==='escort')F.kill(s,null);SIM.runFor(12);
  out.idle=[L().exec.dagger.k==='hold',L().exec.anvil.k==='destroy',L().dec.some(d=>d.wid==='anvil'&&d.kind==='job'&&/Suppress done/.test(d.why||''))];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(!t35l3.stale,'HC35 L3: every scripted plan launched '+JSON.stringify(t35l3.stale));
 ok(t35l3.crash.every(Boolean),'HC35 L3 3: Crash that can\'t fall falls back to Destroy, the leader says why, every wing re-tasks '+JSON.stringify(t35l3.crash));
 ok(t35l3.reward.every(Boolean),'HC35 L3 1.1/3: the fallback pays Destroy\'s reward without Crash\'s Accomplished bonus '+JSON.stringify(t35l3.reward));
 ok(t35l3.deb.every(Boolean),'HC35 L3 3.3: the debrief: PARTIAL, the fallback, the rewards, the leaders\' calls '+JSON.stringify(t35l3.deb));
 ok(t35l3.steal.every(Boolean)&&t35l3.blown.every(Boolean),'HC35 L3 3: Steal without its boarders falls back to Pirate; a Crash blown up in space is a Destroy '+JSON.stringify([t35l3.steal,t35l3.blown]));
 ok(t35l3.tag.every(Boolean),'HC35 L3 3: no fallback outside a family '+JSON.stringify(t35l3.tag));
 ok(t35l3.idle.every(Boolean),'HC35 L3 3.1: a wing with its job done finds work; your Hold stays '+JSON.stringify(t35l3.idle));
 // HC35 L4: every ship's subsystems: engines, guns, a shield generator; aimed fire takes them out; the readout, the rings and a pick on one (feedback 2, §4)
 const t35l4=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,API=window.SR_ARENA_HC.api,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id);
  B.seed=51;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';
  for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec={k:w==='dagger'?'suppress':'hold',arg:w==='dagger'?'escorts':null};B.plan.wings[w].second=null;}
  B.plan.assets=[];B.plan.roes=[];const co=N.COMMS_OFF,rt=N.RES_THREAT;N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;X.fn.launch();L().cp=9;SIM.runFor(2);
  const small=S().ships.filter(s=>s.alive&&!s.struct&&s.id!=='fl400'&&!s.prop35);
  out.all=[small.length>10,small.every(s=>s.sys35&&s.sys35.some(x=>x.k==='engines')&&s.sys35.some(x=>x.k==='guns')),small.filter(s=>F.maxShield(s)>0).every(s=>s.sys35.some(x=>x.k==='shields')),!by('fl400').sys35];
  // Focus on an escort's engines: the aim shows in the verb, they go down, it limps, the focus ends
  const e=S().ships.find(s=>s.role35==='escort'&&s.alive);L35.use('name',{ship:'joss',act:'focus',target:e.id,sub:'engines'});SIM.runFor(1);
  const j=by('joss'),v0=L35.verbOf(j).words;let downT=null;for(let i=0;i<120&&e.alive;i++){SIM.runFor(1);const x=e.sys35.find(x=>x.k==='engines');if(x.hp<=0){downT=S().t;break;}}
  SIM.runFor(1);
  out.engines=[/Disabling .*'s engines/.test(v0),downT!=null,e.crits.filter(c=>c==='engine').length===2&&e.crits.includes('controls'),!L().focus.joss,S().events.some(x=>x.kind==='sub35'&&/engines are out/.test(x.text)),
    L().callouts.some(c=>c.text==='ENGINES DOWN'),v0];
  // guns and shields down: it can't fire; its shields drop and stay down; it can't boost them
  const e2=S().ships.find(s=>s.role35==='escort'&&s.alive&&s!==e)||e;L35.fn.sub35Down(e2,e2.sys35.find(x=>x.k==='guns'),null);
  const sh=e2.sys35.find(x=>x.k==='shields');if(sh)L35.fn.sub35Down(e2,sh,null);
  const n0=S().proj.filter(p=>p.owner===e2.id).length;SIM.runFor(6);
  out.guns=[e2.gunsDown35===true,S().proj.filter(p=>p.owner===e2.id&&p.age<6).length===0,!sh||(e2.segs.F.val===0&&e2.segs.R.val===0),!sh||!!SIM.hooks.abilityOk(e2,'shields')];
  // the readout: inspect a live escort with its engines out; its schematic with three subsystems, the engines struck out
  const ec=S().ships.find(s=>s.role35==='escort'&&s.alive&&s.sys35.some(x=>x.k==='engines'&&x.hp>0))||e;if(ec!==e)L35.fn.sub35Down(ec,ec.sys35.find(x=>x.k==='engines'),null);
  X.fn.OV.mapClick({x:ec.x,y:ec.y},{},ec);X.fn.syncTarget(true);const card=document.getElementById('h35Tgt');
  out.card=[B.inspect===ec.id,!!card.querySelector('canvas.h35-tgt__sch.is-small'),card.querySelectorAll('.h35-tgt__row').length===ec.sys35.length,/Engines · 0\/\d+ · DOWN/.test(card.textContent),(B.schX||[]).includes('engines')];
  // a pick on a subsystem: Mark with the cursor on the guns
  const e3=S().ships.find(s=>s.role35==='escort'&&s.alive&&s.sys35.find(x=>x.k==='guns').hp>0);
  let pick=null;if(e3){const g=e3.sys35.find(x=>x.k==='guns'),q=API.ipos(e3),a=F.hullAxes(e3).a,p={x:q.x+Math.cos(q.h)*g.x*a,y:q.y+Math.sin(q.h)*g.x*a};
    const use=L35.use;L35.use=(k,args)=>{pick={k,args:Object.assign({},args)};return {ok:true};};B.pick={k:'mark',args:{}};X.fn.OV.mapClick(p,{},e3);L35.use=use;B.pick=null;}
  out.pick=[!!pick&&pick.args.id===e3.id,!!pick&&pick.args.sub==='guns'];
  N.COMMS_OFF=co;N.REQ_OFF=0;N.RES_THREAT=rt;B.inspect=null;
  return out;
 });
 ok(t35l4.all.every(Boolean),'HC35 L4 4: every ship but the freighter has engines and guns, and a shield generator if shielded '+JSON.stringify(t35l4.all));
 ok(t35l4.engines.slice(0,6).every(Boolean),'HC35 L4 4: Focus on an escort\'s engines: the verb names them, they go down, it limps, the focus ends, the feed and callout say so '+JSON.stringify(t35l4.engines));
 ok(t35l4.guns.every(Boolean),'HC35 L4 4: guns down, it can\'t fire; shield generator down, its shields stay at 0 and can\'t be boosted '+JSON.stringify(t35l4.guns));
 ok(t35l4.card.every(Boolean),'HC35 L4 4: the readout shows a small ship\'s schematic and its subsystems '+JSON.stringify(t35l4.card));
 ok(t35l4.pick.every(Boolean),'HC35 L4 4: a power picking on a small ship\'s subsystem names it '+JSON.stringify(t35l4.pick));
 // HC35 L5: the drift as a slide in a turning fight: the nose swings onto the target off the line of flight, which turns slower; it costs speed; never to run (feedback 2, §5)
 const t35l5=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,by=id=>S().ships.find(s=>s.id===id),dA=(a,b)=>Math.abs(((a-b)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI);
  B.seed=71;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='destroy';
  for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec={k:'hold',arg:null};B.plan.wings[w].second=null;}
  B.plan.assets=[];B.plan.roes=[];const co=N.COMMS_OFF;N.COMMS_OFF=1;N.REQ_OFF=1;X.fn.launch();L35.alarm('fired','test');SIM.runFor(1);
  const h=by('hale'),e=S().ships.find(s=>s.role35==='escort'&&s.alive),c=F.capsOf(h),gr=F.gunRange(h);
  h.h=0;h.vh=0;h.w=0;h.vx=c.vMax*0.9;h.vy=0;h.px=h.x;h.py=h.y;e.x=h.x+Math.cos(1.2)*gr*0.9;e.y=h.y+Math.sin(1.2)*gr*0.9;e.px=e.x;e.py=e.y;
  h.beh={kind:'engage',target:e.id,why:'test'};h.abCd={};
  const trig=SIM.abilityTriggers('hale','drift'),r=SIM.useAbility('hale','drift'),v0=Math.hypot(h.vx,h.vy),cd=h.abCd.drift-S().t;
  let maxOff=0,maxW=0,bear=0,n=0;
  while(h.driftT>S().t&&n<200){const vv=Math.max(c.vMin,Math.hypot(h.vx,h.vy));SIM.step();n++;maxOff=Math.max(maxOff,dA(h.h,h.vh));if(h.driftT>S().t)maxW=Math.max(maxW,Math.abs(h.turnW)/F.turnCap(c,vv));if(F.inArc(h,e))bear++;}
  const v1=Math.hypot(h.vx,h.vy);
  out.slide=[trig.want===true,r.ok,maxOff>0.6&&maxOff<=N.DRIFT_NOSE+0.05,maxW<=N.DRIFT_TURN+0.01,bear>=10,v1<v0,v1>=c.vc*0.85,Math.abs(cd-N.DRIFT_CD)<0.01,+maxOff.toFixed(2),Math.round(v0),Math.round(v1),bear];
  // never to run: withdrawing with something behind is no drift now
  h.beh={kind:'withdraw',dest:{x:0,y:0}};h.abCd={};out.run=[SIM.abilityTriggers('hale','drift').want===false];
  N.COMMS_OFF=co;N.REQ_OFF=0;
  return out;
 });
 ok(t35l5.slide.slice(0,8).every(Boolean),'HC35 L5 5: a drift: the nose swings up to DRIFT_NOSE onto the target, the line of flight turns at DRIFT_TURN, the guns bear, it costs speed (down to about corner speed), a DRIFT_CD recharge '+JSON.stringify(t35l5.slide));
 ok(t35l5.run.every(Boolean),'HC35 L5 5: no drift to run away '+JSON.stringify(t35l5.run));
 // HC35 L6: plasma on some ships: the Talons' cannon and the Pursuers' pulse cannon fire a few slow heavy bolts a burst (feedback 2, §6)
 const t35l6=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,by=id=>S().ships.find(s=>s.id===id);
  B.seed=81;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary='tag';B.plan.tagger='kit';
  for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec={k:'suppress',arg:'escorts'};B.plan.wings[w].second=null;}
  B.plan.assets=[];B.plan.roes=[];const co=N.COMMS_OFF;N.COMMS_OFF=1;N.REQ_OFF=1;X.fn.launch();L35.alarm('fired','test');
  const tal=S().ships.filter(s=>s.cls==='talon'),cross=S().ships.filter(s=>s.cls==='viper'),w=tal[0].wpns[0].w;
  out.kit=[tal.length===4,tal.every(s=>s.wpns.length===1&&s.wpns[0].w.id==='px-plasma-cannon'&&s.wpns[0].w.style==='plasma'),cross.every(s=>s.wpns[0].w.id==='bls-t-light-repeaters'),
    w.bolts===N.PX_BOLTS,Math.abs(w.boltK-F.BURST_N_()/N.PX_BOLTS*N.PX_DMG)<1e-9];
  // its bursts: PX_BOLTS bolts each, slower than a repeater's
  let px=null,rep=null;const per={};for(let i=0;i<20*60&&!(px&&rep&&Object.keys(per).length>2);i++){SIM.step();for(const p of S().proj){if(p.style==='plasma'){if(!px)px=p;(per[p.burst]||(per[p.burst]=new Set())).add(p);}if(!rep&&p.w&&p.w.id==='bls-t-light-repeaters')rep=p;}}
  const bursts=Object.values(per).map(x=>({fired:x.size}));
  out.fire=[!!px&&!!rep,!!px&&!!rep&&Math.abs(Math.hypot(px.vx,px.vy)/Math.hypot(rep.vx,rep.vy)-N.PX_SPD)<0.02,bursts.length>0&&bursts.every(b=>b.fired<=N.PX_BOLTS)];
  // it draws: the plasma orb, warm for ours, violet for theirs
  const cv=document.createElement('canvas');cv.width=200;cv.height=200;const g=cv.getContext('2d');let drew=true;
  try{for(const st of ['plasma','hegplasma'])window.SR_SPACE_FX.drawBolt(g,{x:100,y:100,x0:40,y0:100,vx:400,vy:0,age:0.2,life:2,faction:st==='plasma'?'reb':'heg',style:st},{z:1,t:0,ra:1,tick:0.05,lod:2});}catch(e){drew=String(e);}
  out.draw=[drew===true,!!window.SR_ART.PROJ.plasma&&window.SR_ART.PROJ.plasma.type==='plasma',window.SR_ART.PROJ.hegplasma.style!==window.SR_ART.PROJ.plasma.style];
  N.COMMS_OFF=co;N.REQ_OFF=0;
  return out;
 });
 ok(t35l6.kit.every(Boolean),'HC35 L6 6: your Talons carry the plasma cannon (PX_BOLTS a burst, the damage carried between them); the Crosses keep their repeaters '+JSON.stringify(t35l6.kit));
 ok(t35l6.fire.every(Boolean),'HC35 L6 6: plasma bolts fly at PX_SPD × a repeater bolt\'s speed, PX_BOLTS a burst '+JSON.stringify(t35l6.fire));
 ok(t35l6.draw.every(Boolean),'HC35 L6 6: the plasma orb draws, warm for ours and violet for theirs '+JSON.stringify(t35l6.draw));
 // HC35 L7 (after playtest 2): a request whose reason has gone is withdrawn; holding for your signal isn't "getting nowhere"; no Secondary once the job's settled
 const t35l7=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,roes)=>{B.seed=91;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex);B.plan.wings[w].second=null;}B.plan.assets=[];B.plan.roes=roes||[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const co=N.COMMS_OFF,rt=N.RES_THREAT;N.COMMS_OFF=1;N.REQ_OFF=0;N.RES_THREAT=0;
  // 1: Hold for My Signal in Phase 1, past the stuck guard's 90 s: no "We're getting nowhere"
  go('crash',{k:'suppress',arg:'escorts'},['signal']);for(let i=0;i<N.EXEC_STALL+15;i++){L().detect=0;L().sigW={};L().signal=false;SIM.runFor(1);}   // unseen and still holding all the while
  out.wait=[!L().req.log.some(q=>q.k==='stall'),S().t>N.EXEC_STALL];
  // 2: the hail, then the freighter dies: the request is withdrawn, nothing applied
  go('destroy',{k:'hold'});L35.alarm('fired','test');SIM.runFor(1);L35.fn.reqTrigger('surrender',{},'t');SIM.runFor(1);
  const q=L().req.open.find(x=>x.k==='surrender');F.kill(fr(),null);SIM.step();SIM.step();
  out.dead=[!!q,q&&q.state==='done',q&&q.by==='void',q&&q.answer==null,!L().surrender,S().events.some(e=>e.kind==='request'&&/never mind/.test(e.text))];
  // 3: the job settled: an open "jump now or finish it?" goes, a hurt pilot's request stays; no Secondary is taken up after
  const gap=N.REQ_GAP;N.REQ_GAP=0;go('destroy',{k:'destroy'});L35.alarm('fired','test');SIM.runFor(1);
  L35.fn.reqTrigger('hit',{ship:'joss'},'t');SIM.runFor(1);L35.fn.reqTrigger('phase3',{wid:'dagger'},'t');SIM.runFor(1);
  const p3=L().req.log.find(x=>x.k==='phase3'),hit=L().req.log.find(x=>x.k==='hit');
  L().sec.anvil={k:'defend',arg:'dagger',trig:'phase3',fired:false,noted:false,adopted:false};const n0=L().secLog.length;
  F.kill(fr(),null);SIM.runFor(2);
  out.settled=[L().prim.state==='done',!p3||p3.by==='void',!!hit&&hit.by!=='void',L().secLog.length===n0,!L().sec.anvil.adopted];
  N.COMMS_OFF=co;N.RES_THREAT=rt;N.REQ_OFF=0;N.REQ_GAP=gap;
  return out;
 });
 ok(t35l7.wait.every(Boolean),'HC35 L7: holding for your signal past the stuck guard raises no "getting nowhere" '+JSON.stringify(t35l7.wait));
 ok(t35l7.dead.every(Boolean),'HC35 L7: the freighter\'s hail, withdrawn once it\'s dead, nothing applied '+JSON.stringify(t35l7.dead));
 ok(t35l7.settled.every(Boolean),'HC35 L7: once the job\'s settled its requests go (a hurt pilot\'s stays) and no Secondary is taken up '+JSON.stringify(t35l7.settled));
 // HC35 M1 (after playtest 2): boarding without stopping her; the power plant under 80% hull; engines out, thrusters; a hangar; size 10 and up; plasma as blaster bolts
 const t35m1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400'),pd=()=>Math.hypot(fr().x-L().planet.x,fr().y-L().planet.y);
  const go=(prim,ex,lo)=>{B.seed=93;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex[w]||{k:'hold'});B.plan.wings[w].second=null;}
    for(const sid in lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=lo[sid];
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;
  const sub=k=>L().subs.find(x=>x.k===k);
  // 1: the power plant is buried until the hull's under 80%; then it shows, on the card too
  go('destroy',{});SIM.runFor(1);X.fn.OV.mapClick({x:fr().x,y:fr().y},{},fr());X.fn.syncTarget(true);const card=()=>document.getElementById('h35Tgt').textContent;
  const hid=[!L().powerSeen,!!sub('power'),!/Power plant/.test(card())];
  fr().hull=fr().maxHull*0.79;SIM.runFor(1);X.fn.syncTarget(true);
  out.power=hid.concat([!!L().powerSeen,L().callouts.some(c=>c.text==='POWER PLANT EXPOSED'),/Power plant/.test(card())]);B.inspect=null;
  // 2: engines out: she crawls on her thrusters, can't jump, and the planet doesn't take her; the power plant out: dead in space, and she falls
  go('crash',{});SIM.runFor(1);L().alarm=true;const e=sub('engines');e.hp=0;L35.fn.subDown(fr(),e,null);
  const p=L().planet,a=Math.atan2(fr().y-p.y,fr().x-p.x);fr().x=p.x+Math.cos(a)*(p.r+900);fr().y=p.y+Math.sin(a)*(p.r+900);fr().px=fr().x;fr().py=fr().y;
  SIM.runFor(20);const v=Math.hypot(fr().vx,fr().vy);
  out.thrust=[!!L().engOut,!L().disabled,fr().alive&&!L().crashed,Math.abs(v-L().cruise*N.THRUST_SPD)<L().cruise*0.1,L().spool==null,+v.toFixed(1)];
  L().powerSeen=1;const pw=sub('power');pw.hp=0;L35.fn.subDown(fr(),pw,null);let fell=false;for(let i=0;i<120&&!fell;i++){SIM.runFor(1);fell=!!L().crashed;}
  out.dead=[!!L().disabled,fell,L().prim.state==='done'];
  // 3: boarding a ship on the move: no Disable; Mags closes, clamps on, rides with her, helpless; the board fills
  go('steal',{amber:{k:'board'}},{mags:'board'});L35.alarm('fired','test');
  for(const e of S().ships)if(e.role35==='escort'){e.alive=false;e.jumped=true;}for(const x of L().subs)if(x.k==='pd')x.hp=0;   // the clamp, not a fight: a crit on the way in decides it otherwise
  const m=by('mags'),f=fr();m.x=f.x+Math.cos(f.h+Math.PI/2)*900;m.y=f.y+Math.sin(f.h+Math.PI/2)*900;   // 900 off: the approach and the clamp, not a long chase
 m.px=m.x;m.py=m.y;
  let dockT=null;for(let i=0;i<20*60&&dockT==null;i++){SIM.step();if(m.dock35)dockT=S().t;}
  const rel=()=>{const c=Math.cos(-f.h),sn=Math.sin(-f.h);return {x:(m.x-f.x)*c-(m.y-f.y)*sn,y:(m.x-f.x)*sn+(m.y-f.y)*c};};SIM.runFor(1.5);const r0=rel(),sp0=Math.hypot(f.vx,f.vy);SIM.runFor(3);const r1=rel();
  out.board=[dockT!=null,!L().disabled&&!L().engOut,sp0>10,Math.hypot(r1.x-r0.x,r1.y-r0.y)<5,SIM.hooks.canFire(m,S().ships.find(x=>x.role35==='escort'&&x.alive)||f,null)===false,
    SIM.hooks.abilityOk(m,'boost')==='clamped on',L().board>0,L35.PRIMARIES.steal.needs.join()==='board',dockT&&Math.round(dockT)];
  // 4: a hangar takes her in, out of sight and out of reach; and only size 10 and up can be boarded
  const row=L35.HC35_CLASSES.fl400;row.hangar={x:0,y:0};SIM.runFor(1.5);
  out.hangar=[!!m.inHangar35,!!m.unseen,X.fn.OV.shipHidden(m),!S().ships.some(t=>t.faction==='heg'&&t.alive&&F.foesOf&&F.foesOf(t).includes(m))];
  delete row.hangar;
  const sz=row.size;row.size=9;go('steal',{amber:{k:'board'}},{mags:'board'});SIM.runFor(1);L35.alarm('fired','test');SIM.runFor(3);
  out.size=[!by('mags').dock35&&by('mags').beh.kind!=='dock35'];row.size=sz;
  // 5: hove to, she holds station: no drift into the planet
  go('pirate',{});SIM.runFor(1);{const p2=L().planet,a2=Math.atan2(fr().y-p2.y,fr().x-p2.x);fr().x=p2.x+Math.cos(a2)*(p2.r+900);fr().y=p2.y+Math.sin(a2)*(p2.r+900);fr().px=fr().x;fr().py=fr().y;}
  L35.answerSurrender('take');SIM.runFor(25);out.hove=[L().surrender==='take',fr().alive&&!L().crashed,Math.hypot(fr().vx,fr().vy)<5];
  // 6: plasma: blaster bolts, the designer's defaults
  const P=window.SR_ART.PROJ;out.px=[P.plasma.style==='blaster',P.hegplasma.style==='hegblaster',N.PX_SPD===1.2,N.PX_CRIT===0,N.PX_RNG===0.7,N.PX_DMG===1.15,N.PX_SPREAD===1.6];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35m1.power.every(Boolean),'HC35 M1: the power plant is hidden until the hull is under 80%, then shown, on the card too '+JSON.stringify(t35m1.power));
 ok(t35m1.thrust.slice(0,5).every(Boolean),'HC35 M1: engines out, she crawls on her thrusters, can\'t jump, and doesn\'t fall '+JSON.stringify(t35m1.thrust));
 ok(t35m1.dead.every(Boolean),'HC35 M1: the power plant out inside the pull, she\'s dead in space and falls: Crash done '+JSON.stringify(t35m1.dead));
 ok(t35m1.board.slice(0,8).every(Boolean),'HC35 M1: boarding a ship under way: clamped on, riding with her, helpless; Steal needs only the boarders '+JSON.stringify(t35m1.board));
 ok(t35m1.hangar.every(Boolean),'HC35 M1: in a hangar the boarder is out of sight and out of reach '+JSON.stringify(t35m1.hangar));
 ok(t35m1.size.every(Boolean),'HC35 M1: a ship under size 10 can\'t be boarded '+JSON.stringify(t35m1.size));
 ok(t35m1.hove.every(Boolean),'HC35 M1: hove to, she holds station, no fall into the planet '+JSON.stringify(t35m1.hove));
 ok(t35m1.px.every(Boolean),'HC35 M1/N1: plasma as blaster bolts, its defaults (toned down after the Steal run) '+JSON.stringify(t35m1.px));
 // HC35 N1 (the Steal run): the prize crew repairs the engines before she can make her cruise or jump; she turns like a capital ship; Phase 3 is the response arriving
 const t35n1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,lo)=>{B.seed=95;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex[w]||{k:'hold'});B.plan.wings[w].second=null;}
    for(const sid in lo||{})for(const w in B.plan.wings)if(sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=lo[sid];
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;
  // 1: her engines out, then boarded: the prize crew mends them on her thrusters, then she makes her cruise; she can't jump till then
  go('steal',{amber:{k:'board'}},{mags:'board'});L35.alarm('fired','test');const e=L().subs.find(x=>x.k==='engines');e.hp=0;L35.fn.subDown(fr(),e,null);
  // the boarders' work done (as dockTick finishes it): the test is the prize crew's repairs, not the approach
  const f=fr();SIM.runFor(1);L().boarded=true;L().prize=true;f.faction='reb';f.quiet=true;L().disabled=!L35.fn.subUp('power');L().drift=null;
  const prize=!!L().prize;let maxW=0,prev=f.h;const turn=n=>{for(let i=0;i<n;i++){SIM.step();maxW=Math.max(maxW,Math.abs(((f.h-prev+3*Math.PI)%(2*Math.PI))-Math.PI)*20);prev=f.h;}};
  turn(20*N.CAP_REALIGN*4);const rep0=L().repair&&L().repair.k,v0=Math.hypot(f.vx,f.vy);
  for(let i=0;i<N.REPAIR_SECS+5&&L().engOut;i++)turn(20);
  turn(20*N.CAP_REALIGN*4);const v1=Math.hypot(f.vx,f.vy),fixed=!L().engOut,hpOk=e.hp===Math.round(e.max*N.REPAIR_HP);
  // engines out, parked at our jump point, she doesn't jump; with them back, she does
  const jp=S().points.ourjump,e2=L().subs.find(x=>x.k==='engines');e2.hp=0;L35.fn.subDown(f,e2,null);f.x=jp.x;f.y=jp.y;f.px=f.x;f.py=f.y;SIM.runFor(2);const stayed=f.alive&&!f.jumped;
  out.prize=[prize,rep0==='engines',Math.abs(v0-L().cruise*N.THRUST_SPD)<L().cruise*0.1,stayed,fixed,hpOk,Math.abs(v1-L().cruise*N.PRIZE_K)<L().cruise*0.15,maxW<=N.PRIZE_TURN+0.005,
    L().callouts.some(c=>c.text==='ENGINES BACK ONLINE'),+v0.toFixed(1),+v1.toFixed(1),+maxW.toFixed(3)];
  // 2: a settled job sends everyone home but isn't Phase 3; the response arriving is
  go('destroy',{dagger:{k:'destroy'}});L35.alarm('fired','test');SIM.runFor(1);F.kill(fr(),null);SIM.runFor(2);
  const ph=L().phase;L().responseAt=S().t+0.5;SIM.runFor(1.5);
  out.phase=[L().prim.state==='done',ph===2,L().phase===3,S().ships.some(s=>s.role35==='response')];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35n1.prize.slice(0,9).every(Boolean),'HC35 N1: the prize crew mends her engines on her thrusters, she can\'t jump till then, then makes her cruise, turning like a capital ship '+JSON.stringify(t35n1.prize));
 ok(t35n1.phase.every(Boolean),'HC35 N1: a settled job isn\'t Phase 3; the response arriving is '+JSON.stringify(t35n1.phase));
 // HC35 O1 (the designer's run 248991): a released freighter runs for its jump point, not jumping where it is; the surrender's default serves the primary; missiles wait for a full lock; a firm lock shrugs off some chaff
 const t35o1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,lo)=>{B.seed=96;B.mods=[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},(ex||{})[w]||{k:'hold'});B.plan.wings[w].second=null;if(lo)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=lo;}
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;
  const JS=L35.TUNE.JUMP_SECS.get();
  // 1: the hand-over done mid-lane, she's let go: no spool there; she runs on and spools only at her lane's end
  go('destroy');L35.alarm('fired','test');SIM.runFor(1);L35.answerSurrender('take');   // not Pirate: its hand-over ends the mission
  // (the ship sent to stand by: since playtest 3, only it counts)
  const j=by(Object.keys(L().ow)[0]||'joss');for(let i=0;i<20&&!L().transferred;i++){L().transfer=Math.max(L().transfer,N.TRANSFER_SECS-0.05);j.x=fr().x+400;j.y=fr().y;j.px=j.x;j.py=j.y;SIM.step();}
  const rel=[!!L().transferred,!!L().released,L().spool==null,L().leg<L().lane.length-1];
  SIM.runFor(JS+4);rel.push(fr().alive&&!fr().jumped,L().spool==null,Math.hypot(fr().vx,fr().vy)>L().cruise*0.5);
  const end=L().lane[L().lane.length-1];L().leg=L().lane.length-1;fr().x=end.x;fr().y=end.y;fr().px=fr().x;fr().py=fr().y;
  SIM.runFor(2);rel.push(L().spool!=null);SIM.runFor(JS+1);rel.push(!fr().alive&&!!fr().jumped);
  out.release=rel;
  // 2: the hail's default: the ship for Steal, no deal for Destroy and Crash, the cargo for Pirate and Strip
  // (each launched with the Brickbats it needs: a Steal needs boarders, a Strip pods, a Crash bombs)
  const def={},LO={steal:'board',strip:'pods',crash:'bombs'};
  for(const p of ['steal','destroy','crash','pirate','strip']){go(p,null,LO[p]||'bombs');L35.alarm('fired','test');SIM.runFor(0.5);
    N.REQ_OFF=0;const gap=N.REQ_GAP;N.REQ_GAP=0;L35.fn.reqTrigger('surrender',{},'t');SIM.runFor(0.5);N.REQ_OFF=1;N.REQ_GAP=gap;
    const q=L().req.open.find(x=>x.k==='surrender')||L().req.log.find(x=>x.k==='surrender');def[p]=L().primK===p&&q&&q.def;}
  // a crew that gives up the ship (Demoralised, Demand the ship): the prize crew flies her home, she doesn't sit hove to
  go('steal',null,'board');B.mods=[];L().mods.push({k:'demoralised',hidden:false});L35.alarm('fired','test');SIM.runFor(0.5);L35.answerSurrender('demand');
  const p0={x:fr().x,y:fr().y},jp=S().points.ourjump,d0=F.dist(fr(),jp);SIM.runFor(15);
  out.given=[!!L().prize,L().surrender==='ship',F.dist(fr(),p0)>200,F.dist(fr(),jp)<d0];
  out.def=[def.steal==='take',def.destroy==='no',def.crash==='no',def.pirate==='take',def.strip==='take',JSON.stringify(def)];
  // 3: a missile waits for a full lock; chaff draws a firm lock off less often
  go('destroy',{dagger:{k:'destroy'}});L35.alarm('fired','test');SIM.runFor(0.5);
  const s=by('joss'),e=S().ships.find(x=>x.role35==='escort'&&x.alive);s.x=e.x-1000;s.y=e.y;s.px=s.x;s.py=s.y;s.h=0;s.vh=0;s.fireAt=e.id;s.lockOn=e.id;
  for(const q of s.wpns)if(q.w.needsLock)q.cd=0;
  s.locks[e.id]=0.7;const at70=F.missileShot(s);s.locks[e.id]=1;const at100=F.missileShot(s);
  out.mis=[!!s.wpns.find(q=>q.w.needsLock),at70===null,!!at100,Math.abs(SIM.hooks.chaffP({lock:1})-0.5)<1e-9,Math.abs(SIM.hooks.chaffP({lock:0.6})-0.7)<1e-9,SIM.hooks.misLock()===N.MIS_LOCK35];
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35o1.release.every(Boolean),'HC35 O1: released after the hand-over, she runs her lane and jumps only at its end '+JSON.stringify(t35o1.release));
 ok(t35o1.given.every(Boolean),'HC35 O1: a crew that gives up the ship: the prize crew flies her home '+JSON.stringify(t35o1.given));
 ok(t35o1.def.slice(0,5).every(Boolean),'HC35 O1 / P3 §3.5: the surrender\'s default follows the primary\'s family '+JSON.stringify(t35o1.def));
 ok(t35o1.mis.every(Boolean),'HC35 O1: a missile waits for a full lock; a firm lock is harder to draw off with chaff '+JSON.stringify(t35o1.mis));
 // HC35 P3 (playtest 3, docs/ARENA-HC35-FEEDBACK-3.md §5): orders with objects, points, the clock, the help requests, pace, surrender, Ambush's end
 const t35p3=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400'),q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  const amb={k:'ambush',arg:'response'};
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||61;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},(ex||{})[w]||{k:'hold'});B.plan.wings[w].second=null;if(o.lo)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=o.lo;}
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=(o.opt||[]).map(k=>({k,ship:null}));X.fn.launch();L().cp=9;};
  const keep={COMMS_OFF:N.COMMS_OFF,RES_THREAT:N.RES_THREAT};N.COMMS_OFF=1;N.REQ_OFF=1;
  // 2: the object pickers (window 4): Destroy lists the freighter, the escort, the response (and a point); Disable the freighter's parts
  B.seed=61;B.mods=[];B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();await new Promise(r=>setTimeout(r,300));
  q('[data-primary="destroy"]').click();B.mods=[];B.plan.wings.dagger.exec={k:'destroy',arg:'freighter'};B.plan.wings.anvil.exec={k:'disable',arg:'engines'};B.step=4;X.fn.render();
  const opts=sel=>sel?[...sel.options].map(o=>o.value):[];
  const dObj=opts(q('[data-arg="exec"][data-wing="dagger"]')),aSub=opts(q('[data-arg="exec"][data-wing="anvil"]'));
  out.pick=[dObj.join()==='freighter,escort,response,area',aSub.join()==='power,engines,comms,turrets',JSON.stringify(dObj)];
  // 4: the strip: the response at the freighter's jump point; "No response" with Kill the Distress Call
  const strip=()=>(q('.h35-po')||{}).textContent||'';const s1=strip();B.plan.optionals=[{k:'distress',ship:null}];X.fn.render();const s2=strip();B.plan.optionals=[];
  out.strip=[/Alarm/.test(s1)&&/Distress call/.test(s1)&&/Response about/.test(s1)&&/the freighter's jump point/.test(s1),/No response/.test(s2)];
  // 3: an Ambush point set on the plan is where the wing waits; with none, the response's arrival point
  N.RES_THREAT=0;
  go('ambush',{dagger:Object.assign({at:{x:6000,y:500}},amb),anvil:amb,amber:amb});SIM.runFor(3);
  const pAt=L().W([6000,500]),ap=L35.fn.ambushPoint(),bd=s=>s.beh&&s.beh.dest;
  out.point=[F.dist(bd(by('joss'))||{x:0,y:0},pAt)<50,F.dist(bd(by('sera'))||{x:0,y:0},ap)<50,by('joss').beh.why==='lying in wait'];
  // the HUD clock names the place
  L35.alarm('fired','test');L().distress={t0:S().t,landed:true,cut:false};L().responseAt=S().t+77;window.SR_ARENA_HC.api.syncHud(true);const clock=(document.getElementById('hcClock')||{}).textContent||'';L().responseAt=null;
  out.clock=[/RESPONSE IN 1:1\d · AT FREIGHTER'S JUMP POINT/.test(clock),clock];
  // 6: pace: Anvil (two Brickbats) reaches its point together
  go('ambush',{dagger:amb,anvil:Object.assign({at:{x:5200,y:900}},amb),amber:amb},{seed:62});const pt=L().W([5200,900]),arr={};
  for(let i=0;i<20*90&&Object.keys(arr).length<3;i++){SIM.step();for(const id of ['sera','brask','ollo']){const x=by(id);if(x&&arr[id]==null&&F.dist(x,pt)<1400)arr[id]=S().t;}}
  const ts=Object.values(arr);out.pace=[ts.length===3,ts.length===3&&Math.max(...ts)-Math.min(...ts)<4,JSON.stringify(arr)];
  // 5 and 7: Ollo pinned by two escorts while his wing waits: Sera (Protective) sends help within 3 s, logged; a waiting wingmate takes on the attackers
  const pinOllo=()=>{const o=by('ollo'),es=S().ships.filter(x=>x.role35==='escort'&&x.alive).slice(0,2);es.forEach((e,i)=>{e.x=o.x-600-i*150;e.y=o.y+(i?120:-120);e.px=e.x;e.py=e.y;e.h=Math.atan2(o.y-e.y,o.x-e.x);e.vh=e.h;e.fireAt=o.id;F.setBeh(e,{kind:'engage',target:o.id,hard:true});});o.firedOnT=S().t;o.lastHitBy=es[0]&&es[0].id;return es;};
  const helped=secs=>{const t0=S().t;for(let i=0;i<20*secs;i++){pinOllo();SIM.step();const p=Object.values(L().aid.protect).find(x=>x.unit==='ollo');if(p)return +(S().t-t0).toFixed(2);}return null;};
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:63});SIM.runFor(2);const tHelp=helped(3);
  const dec=L().dec.find(d=>d.kind==='aid');
  out.aid=[tHelp!=null&&tHelp<=3,!!dec&&/^Sera (sent|went).* cover Ollo/.test(dec.line),S().events.some(e=>e.kind==='aid'&&e.ship==='ollo')];
  // the leader's weights below the threshold: Sera refuses, Ollo asks the nearest other wing; with nobody, he falls back
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:63});SIM.runFor(2);
  const th=N.AID_THRESH,ask=N.ASK_THRESH;N.AID_THRESH=5;N.ASK_THRESH=-5;helped(4);
  const refused=L().dec.some(d=>d.kind==='aid'&&/^Sera refused Ollo/.test(d.line)),fell=!!L().aid.fallback.ollo;
  N.AID_THRESH=th;N.ASK_THRESH=ask;
  // across wings: Anvil's leader refuses (forced), another wing's leader in range sends help
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:63});SIM.runFor(2);
  const oO=by('ollo'),jo=by('joss');jo.x=oO.x+1500;jo.y=oO.y;jo.px=jo.x;jo.py=jo.y;
  const aidFrom0=SR_OPS.decideAid;let calls=0;SR_OPS.decideAid=(l,u,t,c,o,r)=>{calls++;return calls===1?{send:[],refused:true,top:[],score:0}:aidFrom0(l,u,t,c,o,r);};
  N.ASK_THRESH=-5;helped(2);N.ASK_THRESH=ask;SR_OPS.decideAid=aidFrom0;
  const pr=Object.entries(L().aid.protect).find(([h,p])=>p.unit==='ollo');
  out.refuse=[refused,fell,!!pr&&['joss','wren','petra','hale','kit','tam','mags'].includes(pr[0])];
  // a wing docked boarding: none of it is sent (critical work)
  go('steal',{dagger:{k:'hold'},anvil:{k:'hold'},amber:{k:'board'}},{seed:64,lo:'board'});SIM.runFor(1);
  const kit=by('kit'),mags=by('mags');mags.dock35={t:S().t,side:1,from:{x:mags.x,y:mags.y,h:mags.h}};
  const es2=S().ships.filter(x=>x.role35==='escort'&&x.alive).slice(0,2);let sentAmber=false;
  for(let i=0;i<40;i++){es2.forEach((e,j)=>{e.x=kit.x-600-j*150;e.y=kit.y;e.px=e.x;e.py=e.y;e.h=Math.atan2(kit.y-e.y,kit.x-e.x);e.vh=e.h;F.setBeh(e,{kind:'engage',target:kit.id,hard:true});});kit.firedOnT=S().t;SIM.step();
    if(L().aid.protect.mags)sentAmber=true;}
  out.docked=[!sentAmber];
  // 8: wings flying past the freighter to their ambush points don't make the crew surrender
  N.RES_THREAT=keep.RES_THREAT;go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:65});SIM.runFor(60);
  out.past=[L().offered==null,L().resolve>30,+L().resolve.toFixed(1)];
  // 9: Ambush with a spare ship: Take sends one to stand by; the transfer runs only while it's in the ring
  N.RES_THREAT=0;go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:66});L35.alarm('fired','test');SIM.runFor(1);
  const defA=(()=>{N.REQ_OFF=0;const gap=N.REQ_GAP;N.REQ_GAP=0;L35.fn.reqTrigger('surrender',{},'a');SIM.runFor(0.5);N.REQ_OFF=1;N.REQ_GAP=gap;const r=L().req.open.find(x=>x.k==='surrender')||L().req.log.find(x=>x.k==='surrender');return r&&r.def;})();
  L35.answerSurrender('take');const ow=Object.keys(L().ow),owS=by(ow[0]);
  const far={x:fr().x+9000,y:fr().y};if(owS){owS.x=far.x;owS.y=far.y;owS.px=owS.x;owS.py=owS.y;}const tr0=L().transfer;SIM.step();SIM.step();const paused=L().transfer===tr0&&L().transferPaused;
  out.take=[defA==='take',ow.length===1,L().surrender==='take',paused];
  // nobody spare: No deal, said; Leave No Witnesses: the default is No deal
  go('ambush',{dagger:{k:'destroy',arg:'freighter'},anvil:{k:'destroy',arg:'freighter'},amber:{k:'destroy',arg:'freighter'}},{seed:66,lo:'bombs'});L35.alarm('fired','test');SIM.runFor(1);
  for(const x of S().ships)if(x.faction==='reb'&&x.wing)F.setBeh(x,{kind:'engage',target:'fl400'});
  L35.answerSurrender('take');const noSpare=[L().surrender==null,L().dec.some(d=>/Nobody to spare/.test(d.line))];
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:66,opt:['witnesses']});L35.alarm('fired','test');SIM.runFor(0.5);
  N.REQ_OFF=0;{const gap=N.REQ_GAP;N.REQ_GAP=0;L35.fn.reqTrigger('surrender',{},'w');SIM.runFor(0.5);N.REQ_GAP=gap;}N.REQ_OFF=1;
  const qw=L().req.open.find(x=>x.k==='surrender')||L().req.log.find(x=>x.k==='surrender');
  out.nodeal=noSpare.concat([!!qw&&qw.def==='no',!!qw&&!!qw.note&&/Leave No Witnesses/.test(qw.note.take)]);
  // 10: Ambush with Kill the Distress Call: impossible; the leader says nobody's coming and the wing finds work
  go('ambush',{dagger:amb,anvil:amb,amber:amb},{seed:67,opt:['distress']});SIM.runFor(1);L().distress={t0:S().t,landed:false,cut:true};SIM.runFor(2);
  out.nobody=[L35.execState('dagger')!=='waiting',L().exec.dagger.k!=='ambush'||L35.execState('dagger')==='impossible',S().ships.some(x=>x.faction==='reb'&&x.bubble&&/Nobody's coming/.test(x.bubble.text||''))||L().dec.some(d=>/nothing left/i.test(d.why||'')),L().exec.dagger.k];
  // 12: ops-core.js decides the same from the same seed, with no ships (its own stub adapter)
  out.core=Object.values(SR_OPS.selfTest()).every(Boolean);
  Object.assign(N,keep);N.REQ_OFF=0;
  return out;
 });
 ok(t35p3.pick.slice(0,2).every(Boolean),'HC35 P3 2: Destroy\'s picker lists the freighter, the escort, the response (and a point); Disable the parts '+JSON.stringify(t35p3.pick));
 ok(t35p3.strip.every(Boolean)&&t35p3.clock[0],'HC35 P3 4: the strip reads the events, "No response" with Kill the Distress Call; the clock names the place '+JSON.stringify([t35p3.strip,t35p3.clock]));
 ok(t35p3.point.every(Boolean),'HC35 P3 3: a wing waits at its set Ambush point; with none, at the response\'s arrival point '+JSON.stringify(t35p3.point));
 ok(t35p3.pace.slice(0,2).every(Boolean),'HC35 P3 6: a wing with Brickbats reaches its point together '+JSON.stringify(t35p3.pace));
 ok(t35p3.aid.every(Boolean),'HC35 P3 5: a pinned Brickbat: Sera sends help within 3 s, logged and in the feed '+JSON.stringify(t35p3.aid));
 ok(t35p3.refuse.every(Boolean)&&t35p3.docked.every(Boolean),'HC35 P3 5: refused, it falls back; refused by its own leader, another wing helps; a docked wing sends nobody '+JSON.stringify([t35p3.refuse,t35p3.docked]));
 ok(t35p3.past.slice(0,2).every(Boolean),'HC35 P3 8: wings flying past don\'t make the crew surrender '+JSON.stringify(t35p3.past));
 ok(t35p3.take.every(Boolean)&&t35p3.nodeal.every(Boolean),'HC35 P3 9: Take sends a ship to stand by, the transfer only counts it; nobody spare: no deal; Leave No Witnesses: no deal '+JSON.stringify([t35p3.take,t35p3.nodeal]));
 ok(t35p3.nobody.slice(0,3).every(Boolean),'HC35 P3 10: Ambush with the distress killed: impossible, and the wing finds work '+JSON.stringify(t35p3.nobody));
 ok(t35p3.core,'HC35 P3 12: ops-core.js decides the same from the same seed, with no ships');
 // HC35 P5 (playtest 3, §3.7, test 11): Patrol Sweep, authored as data: Clear and Ambush derived; on the board; Clear wins when the patrol is gone
 const t35p5=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  const O=L35.OPPORTUNITIES.patrol_sweep;
  out.derive=[L35.primaryKeysOf(O).join()==='clear,ambush',SR_OPS.objectsFor(O,'destroy').map(t=>t.id).join()==='patrol,reinforcements'];
  // the board: its card switches the opportunity; window 1 shows its two families, its primaries only
  B.oppId='vulnerable_freighter';B.seed=71;X.fn.showBoard(false);const card=q('[data-msel="patrol_sweep"]');card&&card.click();
  const sw=B.oppId==='patrol_sweep';q('.bf-plan [data-act="brief"]').click();await new Promise(r=>setTimeout(r,300));
  out.board=[!!card,sw,qa('[data-primary]').map(b=>b.dataset.primary).join()==='clear,ambush',qa('.h35-fam').length===2];
  // launched on the leaders' Clear plan: the patrol destroyed, Clear is done and pays
  q('[data-primary="clear"]').click();N.REQ_OFF=1;N.COMMS_OFF=1;X.fn.launch();
  const pat=()=>S().ships.filter(s=>s.alive&&s.cast35==='patrol');const n0=pat().length;SIM.runFor(2);
  for(const s of pat())F.kill(s,null);SIM.runFor(1);
  out.clear=[n0===7,!S().ships.some(s=>s.id==='fl400'),L().prim.state==='done',L35.rewardOf().done,(L35.rewardOf().earned.c||0)>0];
  N.REQ_OFF=0;N.COMMS_OFF=0;B.oppId='vulnerable_freighter';X.fn.showBoard(false);
  return out;
 });
 ok(t35p5.derive.every(Boolean)&&t35p5.board.every(Boolean),'HC35 P5 11: Patrol Sweep derives Clear and Ambush, has its card, and window 1 offers only those '+JSON.stringify([t35p5.derive,t35p5.board]));
 ok(t35p5.clear.every(Boolean),'HC35 P5 11: Clear wins when the patrol is destroyed '+JSON.stringify(t35p5.clear));
 // HC35 W1 (the windows handoff, §1): the step track reads done, current and to come; window 1's part dots; the readiness pill counts what's missing; no title attributes
 const t35w1=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  const track=()=>qa('.h35-node').map(n=>n.className.replace('h35-node is-','')).join(','),dots=()=>qa('.h35-node__parts u.is-on').length,
    links=()=>qa('.h35-link').map(l=>l.className.replace(/.*is-/,'')).join(',');
  out.frame=[!!q('.h35-holo .h35-fr'),!!q('.h35-holo__title'),/^PLAN: /.test(q('.h35-holo__title').textContent),!!q('.h35-holo__ped'),!!q('.h35-holo__beam')];
  const t1=[track(),dots(),links(),q('.h35-fbtn--back').textContent.includes('Back to board')];
  q('[data-primary="crash"]').click();const setLo=v=>{for(const w in B.plan.wings)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]=v;};setLo('pods');
  B.part=2;X.fn.render();const t1b=[track(),dots(),q('.h35-fbtn--back').textContent.includes('Back to board')];
  B.step=3;B.part=1;X.fn.render();const t3=[track(),dots(),links(),!!q('.h35-node.is-done [data-step="1"]'),!q('.h35-node.is-todo [data-step]')];
  out.track=[t1[0]==='on,todo,todo,todo',t1[1]===1,t1[2]==='next,todo,todo',t1[3],t1b[0]==='on,todo,todo,todo',t1b[1]===2,!t1b[2],
    t3[0]==='done,done,on,todo',t3[1]===2,t3[2]==='done,done,next',t3[3],t3[4]];
  // the pill: Crash with no bombs aboard is one missing; its tip lists every check; a click opens the list, any other click closes it
  const rows=X.fn.checklist(),miss=rows.filter(r=>!r.ok&&!r.warn).length,pill=q('.h35-needs__pill');
  out.pill=[miss>=1,pill.textContent.includes(miss+' missing'),pill.classList.contains('is-miss'),pill.dataset.tb.split('\n').length===rows.length,
    rows.every(r=>pill.dataset.tb.includes(r.text)),!X.fn.ready()];
  pill.click();const open=qa('.h35-needs__pop .sr-check').length===rows.length;q('.h35-holo__title').click();
  out.pop=[open,!q('.h35-needs__pop')];
  setLo('bombs');X.fn.render();const p2=q('.h35-needs__pill'),miss2=X.fn.checklist().filter(r=>!r.ok&&!r.warn).length;
  out.met=[miss2===0,p2.textContent.includes('all met'),p2.classList.contains('is-ok')];
  B.step=4;X.fn.render();out.w4=[!!q('.h35-holo.is-wide'),!!q('.h35-holo__title'),!!q('.h35-fbtn--go[data-act="launch"]'),!!q('.h35-needs__pill')];
  out.title=qa('[title]').length;
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35w1.frame.every(Boolean),'HC35 W1: the window has the holo frame, its title, the pedestal and the beam '+JSON.stringify(t35w1.frame));
 ok(t35w1.track.every(Boolean),'HC35 W1: the step track reads done, current and to come, and window 1\'s part dots follow the part '+JSON.stringify(t35w1.track));
 ok(t35w1.pill.every(Boolean)&&t35w1.pop.every(Boolean)&&t35w1.met.every(Boolean),'HC35 W1: the readiness pill counts the missing checks, its tip lists them all, a click opens the list '+JSON.stringify([t35w1.pill,t35w1.pop,t35w1.met]));
 ok(t35w1.w4.every(Boolean),'HC35 W1: window 4 has the frame, the pill and Launch '+JSON.stringify(t35w1.w4));
 ok(t35w1.title===0,'HC35 W1: no title attributes inside #arHc35 ('+t35w1.title+')');
 // HC35 W2 (the windows handoff, §2–§3): the objective cards in their family columns; the toggle rows, their conflict and suggestion tags, the cap, the Preservation field; the second panels
 const t35w2=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  // part 1: four family columns, a card a primary with its pitch and glyph, at most one locked card a column, the rest named in the header's tip
  const cols=qa('.h35-fam'),heads=cols.map(c=>c.querySelector('.h35-panel__head').textContent);
  const PITCH={steal:'Take the freighter intact',pirate:'Scare the crew into handing it over',strip:'Haul off what you can carry',destroy:'Blow it apart',crash:'Smash it into the planet',tag:'Follow it home to its depot',ambush:'Use it as bait to draw them in'};
  const later=L35.LATER_PRIMARIES.every(x=>{const c=cols[L35.FAMILIES.indexOf(x.family)];return c.textContent.includes(x.name)||(c.querySelector('.h35-panel__head').dataset.tb||'').includes(x.name);});
  out.cols=[heads.join()==='Take it,Deny it,Use it,Bait with it',cols.every(c=>c.querySelectorAll('.h35-ocard.is-locked').length<=1),later,
    L35.PRIMARY_KEYS.every(k=>q('[data-primary="'+k+'"] .h35-ocard__pitch').textContent===PITCH[k]&&!!q('[data-primary="'+k+'"] svg.h35-g')),
    L35.PRIMARY_KEYS.every(k=>cols[L35.FAMILIES.indexOf(L35.PRIMARIES[k].family)].contains(q('[data-primary="'+k+'"]'))),!q('.h35-fam--later')];
  // picked: the gold tab; its needs green or orange; the others neutral
  q('[data-primary="crash"]').click();for(const w in B.plan.wings)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]='pods';X.fn.render();
  out.pick=[!!q('[data-primary="crash"].is-picked .h35-ocard__tab'),qa('.h35-ocard__tab').length===1,!!q('[data-primary="crash"] .h35-need.is-no'),!q('[data-primary="strip"] .h35-need.is-ok,[data-primary="strip"] .h35-need.is-no')];
  // part 2: the secondaries as toggle rows; the counter; at 2 / 2 the rest dim and don't toggle; your primary read-only, with Change
  B.part=2;X.fn.render();
  const optRow=k=>q('[data-opt="'+k+'"]').closest('.h35-trow');
  q('[data-opt="witnesses"]').click();q('[data-opt="everyone"]').click();
  const cap=[B.plan.optionals.length===2,q('.h35-count').textContent.replace(/\s/g,'')==='2/2',optRow('ghost').classList.contains('is-cap'),q('[data-opt="ghost"]').getAttribute('aria-disabled')==='true',
    q('[data-opt="ghost"]').dataset.why==='Two at most: turn one off first'];
  q('[data-opt="ghost"]').click();cap.push(!B.plan.optionals.some(o=>o.k==='ghost'),B.plan.optionals.length===2);
  out.cap=cap;
  out.side=[!!q('.h35-panel--side .h35-ocard.is-ro'),!q('.h35-panel--side [data-primary]'),q('.h35-panel--side .h35-ocard__name').textContent==='Crash'];
  // conflict: Leave No Witnesses against the Preservation Order, only while both are on
  const noTag=!optRow('witnesses').querySelector('.h35-ctag');
  B.step=2;B.part=1;X.fn.render();const roeRow=k=>q('[data-roe="'+k+'"]').closest('.h35-trow');
  const noTag2=!roeRow('preservation').querySelector('.h35-ctag');q('[data-roe="preservation"]').click();
  const tagW2=roeRow('preservation').querySelector('.h35-ctag'),soFar=qa('.h35-sofar__row').map(r=>r.textContent);
  B.step=1;B.part=2;X.fn.render();const tagW1=optRow('witnesses').querySelector('.h35-ctag');
  out.conflict=[noTag,noTag2,!!tagW2&&/Conflicts with Leave No Witnesses/.test(tagW2.textContent),!!tagW1&&/Conflicts with Preservation Order/.test(tagW1.textContent),
    soFar.length===3&&/Crash/.test(soFar[0])&&soFar.some(t=>/Leave No Witnesses/.test(t)&&/Conflicts/.test(t))];
  // the Preservation field: 5% steps, 10% to 60%, by click and by ←/→; the plan's presHull follows
  B.step=2;B.part=1;X.fn.render();const field=()=>q('[data-presfield]');B.plan.presHull=0.3;X.fn.render();
  const seen=[];for(let i=0;i<8;i++){q('[data-pres="1"]').click();seen.push(B.plan.presHull);}
  const top=B.plan.presHull;for(let i=0;i<12;i++)q('[data-pres="-1"]').click();const bottom=B.plan.presHull;
  field().dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));const key=B.plan.presHull;
  field().dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  out.pres=[seen[0]===0.35,top===0.6,bottom===0.1,key===0.15,B.plan.presHull===0.1,q('[data-presfield] b').textContent==='10%',field().getAttribute('aria-valuenow')==='10',!q('[data-roe="preservation"] ~ * input[type=range]')];
  // the suggestion: Weapons Tight for Steal, while it's off
  B.plan=L35.leaderPlan('steal',B.plan);B.plan.roes=B.plan.roes.filter(k=>k!=='tight');X.fn.render();
  const sg=roeRow('tight').querySelector('.h35-stag');q('[data-roe="tight"]').click();
  out.suggest=[!!sg&&sg.textContent==='☆ Suggested for Steal',!roeRow('tight').querySelector('.h35-stag'),roeRow('tight').classList.contains('is-on')];
  // the pilot pick, expanded inside its row while on
  B.step=1;B.part=2;B.plan.optionals=[];X.fn.render();q('[data-opt="rookie"]').click();
  out.pilot=[!!optRow('rookie').querySelector('.h35-trow__more select.h35-field[data-optship="rookie"]'),!optRow('ghost').querySelector('.h35-trow__more'),qa('[title]').length===0];
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35w2.cols.every(Boolean),'HC35 W2: window 1\'s family columns, each primary with its pitch and glyph, one locked card a column, the rest named '+JSON.stringify(t35w2.cols));
 ok(t35w2.pick.every(Boolean),'HC35 W2: the picked card has the gold tab and its needs in green or orange '+JSON.stringify(t35w2.pick));
 ok(t35w2.cap.every(Boolean)&&t35w2.side.every(Boolean),'HC35 W2: at 2 / 2 an unpicked secondary dims and doesn\'t toggle; your primary beside, read-only '+JSON.stringify([t35w2.cap,t35w2.side]));
 ok(t35w2.conflict.every(Boolean),'HC35 W2: a conflict tag only with both of its pair on, in both windows and the plan so far '+JSON.stringify(t35w2.conflict));
 ok(t35w2.pres.every(Boolean),'HC35 W2: the Preservation field steps by 5% between 10% and 60%, and presHull follows '+JSON.stringify(t35w2.pres));
 ok(t35w2.suggest.every(Boolean)&&t35w2.pilot.every(Boolean),'HC35 W2: the suggestion chip while the rule is off; the pilot pick inside its row '+JSON.stringify([t35w2.suggest,t35w2.pilot]));
 // HC35 W3 (the windows handoff, §4): the wing columns, their ship rows (WINGS35's pilots, the leader starred), the role and loadout controls, the leader's take, the assets bar and its picker
 const t35w3=await pg4.evaluate(async()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,out={};
  const q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)];
  B.seed=4243;B.plan=null;B.step=1;B.part=1;X.fn.showBoard(false);q('.bf-plan [data-act="brief"]').click();
  await new Promise(r=>setTimeout(r,400));
  q('[data-primary="destroy"]').click();B.plan.assets=[];B.step=3;X.fn.render();
  // the rows: one a ship, named for its pilot, ★ on the leader only; the class's full name
  const ok1=L35.WINGS35.every(w=>{const col=q('[data-wcol="'+w.id+'"]'),rows=[...col.querySelectorAll('.h35-srow')];
    return rows.length===w.ships.length&&rows.every((r,i)=>{const t=r.querySelector('.h35-srow__pilot').textContent;return t.startsWith(w.ships[i].name)&&(i===0)===t.includes('★');})&&
      col.querySelector('.h35-wcol__call').textContent===w.name&&col.querySelector('.h35-wcol__lead').textContent===w.ships[0].name;});
  const names=new Set(L35.WINGS35.flatMap(w=>w.ships.map(s=>s.name))),pilots=qa('.h35-srow__pilot').map(e=>e.textContent.split(' ')[0]);
  out.rows=[ok1,pilots.every(n=>names.has(n)),q('[data-wcol="dagger"] .h35-srow__cls').textContent==='FT-4 Cross',qa('.h35-srow.has-lo').length===qa('.h35-srow').filter((_,i)=>L35.WINGS35.flatMap(w=>w.ships)[i].cls==='brickbat').length,
    qa('.h35-srow canvas[data-ship]').length===qa('.h35-srow').length];
  // the controls: one segment pressed a control; Stay home dims the column, not its role control
  q('[data-role="home"][data-wing="amber"]').click();const am=q('[data-wcol="amber"]');
  out.seg=[qa('.h35-seg').every(g=>g.querySelectorAll('[aria-pressed="true"]').length===1),am.classList.contains('is-home'),getComputedStyle(am.querySelector('.h35-wcol__ships')).opacity==='0.55',getComputedStyle(am.querySelector('.h35-seg--role')).opacity==='1'];
  q('[data-role="strike"][data-wing="amber"]').click();
  // the take: orange when it's a critique
  B.plan.wings.anvil.exec={k:'disable',arg:'engines'};for(const sid in B.plan.wings.anvil.loadout)B.plan.wings.anvil.loadout[sid]='pods';X.fn.render();
  const anv=q('[data-wcol="anvil"] .h35-wcol__take'),calm=Object.values(L35.CALM_TAKES);
  out.take=[anv.classList.contains('is-warn'),!calm.includes(anv.textContent),qa('.h35-wcol__take:not(.is-warn)').every(e=>calm.includes(e.textContent))];
  // the assets: an empty slot opens the picker above it; a pick fills it (✓, "unlocks"); Esc and a click outside close the picker
  q('[data-slot="0"]').click();const pop=!!q('.h35-apop'),rows=qa('.h35-apop [data-asset]').length;q('.h35-apop [data-asset="buoy"]').click();
  const slot=q('.h35-aslot.is-filled');
  out.assets=[pop,rows===Object.keys(L35.ASSETS).length,B.plan.assets[0]==='buoy',!q('.h35-apop'),!!slot&&!!slot.querySelector('.h35-aslot__ok'),!!slot&&/unlocks Raise the Interdictor/.test(slot.textContent),qa('.h35-aslot.is-empty').length===L35.ASSET_SLOTS-1];
  q('[data-slot="1"]').click();const open2=!!q('.h35-apop');window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const esc=!q('.h35-apop')&&B.step===3;
  q('[data-slot="1"]').click();q('.h35-wcol__call').click();const outside=!q('.h35-apop');
  q('[data-unasset="0"]').click();
  q('[data-slot="2"]').click();out.close=[open2,esc,outside,B.plan.assets.length===0,!!q('canvas[data-ship]'),qa('[title]').length===0];
  B.step=1;B.part=1;X.fn.render();
  return out;
 });
 ok(t35w3.rows.every(Boolean),'HC35 W3: a column a wing, a row a ship named for its WINGS35 pilot, the leader starred '+JSON.stringify(t35w3.rows));
 ok(t35w3.seg.every(Boolean)&&t35w3.take.every(Boolean),'HC35 W3: the segmented controls; Stay home dims all but its role control; a critique take in orange '+JSON.stringify([t35w3.seg,t35w3.take]));
 ok(t35w3.assets.every(Boolean)&&t35w3.close.every(Boolean),'HC35 W3: the assets bar: an empty slot opens the picker, a pick fills it, Esc or a click outside closes it '+JSON.stringify([t35w3.assets,t35w3.close]));
 // HC35 W1–W3 fit: at 1440 × 900 and 1920 × 1080 the windows' bodies don't scroll (every Brickbat on Boarding party, two secondaries that expand)
 const t35fit=[];
 for(const [vw,vh] of [[1440,900],[1920,1080]]){
  const ctxF=await b.newContext({viewport:{width:vw,height:vh},reducedMotion:'reduce'});const pgF=await ctxF.newPage();
  pgF.on('pageerror',e=>errs.push('pageerror(fit): '+e.message));
  await pgF.goto(base+'?dev#arena');await pgF.waitForTimeout(800);
  await pgF.evaluate(()=>{window.DBGarena.fn.open35();});await pgF.waitForTimeout(300);
  t35fit.push(await pgF.evaluate(async([vw,vh])=>{
   const X=window.DBGarena.hc35,B=X.B,q=s=>document.querySelector('#arHc35 '+s),out={size:vw+'x'+vh};
   q('.bf-plan [data-act="brief"]').click();await new Promise(r=>setTimeout(r,300));
   q('[data-primary="steal"]').click();for(const w in B.plan.wings)for(const sid in B.plan.wings[w].loadout)B.plan.wings[w].loadout[sid]='board';
   const fits=async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));   // the reduced-motion rule's 1 ms transitions settle
     const b=q('.h35-holo__body');return b.scrollHeight<=b.clientHeight+1?true:[b.scrollHeight,b.clientHeight];};
   B.step=1;B.part=1;X.fn.render();out.w1a=await fits();
   B.part=2;B.plan.optionals=[{k:'protect',ship:null},{k:'rookie',ship:null}];X.fn.render();out.w1b=await fits();
   B.step=2;B.part=1;B.plan.roes=['preservation','tight'];X.fn.render();out.w2=await fits();
   B.step=3;B.plan.assets=['ram','buoy'];X.fn.render();out.w3=await fits();
   const tops=[...document.querySelectorAll('#arHc35 .h35-wcol .h35-seg--role')].map(e=>Math.round(e.getBoundingClientRect().top));out.align=tops.length===3&&Math.max(...tops)-Math.min(...tops)<=1;
   return out;},[vw,vh]));
  await ctxF.close();
 }
 ok(t35fit.every(f=>f.w1a===true&&f.w1b===true&&f.w2===true&&f.w3===true&&f.align),'HC35 W1–W3: the windows don\'t scroll at 1440 × 900 or 1920 × 1080 '+JSON.stringify(t35fit));
 await ctx4.close();
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,t35a,v1,t35b,t35c,t35d,t35e,t35f,t35g,t35k0,t35k1,t35k2,t35k3,t35k4,t35k5,t35k6,t35l1,t35l2,t35l3,t35l4,t35l5,t35l6,t35l7,t35m1,t35n1,t35o1,t35p3,t35p5,t35w1,t35w2,t35w3,t35fit},null,0));
 if(fails.length){console.error('hc35-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('hc35-smoke OK');
})();
