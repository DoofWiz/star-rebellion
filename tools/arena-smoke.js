/* The Arena (docs/ARENA-HANDOFF.md §8): node tools/arena-smoke.js (needs NODE_PATH=$(npm root -g)).
   Loads game/index.html#arena with cleared storage, drives it through DBGarena, and checks:
   v2 section
     1. boot and no-save: the picker shows with no errors; after e1_fox and 3 execs the campaign key is absent
     2. the fitter respects the envelope: a straight drag on a Talon fits only its dialAvail manoeuvres; a hairpin
        drag on the freighter fits its widest legal turn, not the drag; a crit-clamped ship's speeds obey maxSpeedOf
     6. determinism: same seed + identical scripted orders twice → identical end-state hash
     7. scenarios are data: one appended at runtime appears in the picker and loads
     8. metrics: each exec emits one well-formed ARENA_METRICS record
     and the title screen's "Enter Arena" button boots the Arena.
   (§8's 3–5, continuous fire, interrupts and doctrine, arrive with phases A2–A4.)
   SB section (docs/ARENA-SB-HANDOFF.md §9)
     1. picker: both rulesets listed; e1_fox loads under each; after a v2 run and an SB run the campaign key is absent
     3. envelope: a drag whose heading rate exceeds the turn cap gives a curve clamped at the cap; arc lengths respect
        the speed range (Talon and freighter); two AP segments a round; Boost and Fly Defensively; the flair keeps
        the arc
     4. projectiles: a shot only damages on geometric intersection (an offset target is untouched); a skim deals less
        than a direct hit from the same weapon; a panicking pilot's burst spread is wider than the same pilot calm
     5. lock: lock % rises with the target centred and falls behind the firer; a missile is refused below
        MISSILE_LOCK and inside MISSILE_MINR, and ignores Fly Defensively (even the immune toggle)
     6. determinism: same seed + scripted orders → identical end-state hash
     7. metrics: SB records carry ruleset 'sb' and burst / hit counts; a 1v2 chase has live fire
     and phase B4's acceptance test: Drift end to end with the mouse (path dragged, facing set with its handle, shots
     fired along the nose while fleeing along the path); a green pilot's plan offers no Drift, an ace's does; the
     actions (Angle and Boost Shields, Fix Critical, Lock In, the stub ability slots) */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
const SAVE_KEY='star-rebellion-campaign-v1';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const ctx=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 const pg=await ctx.newPage();
 const errs=[],metricsLines=[];
 pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
 pg.on('console',m=>{const t=m.text();if(m.type()==='error'&&!/Failed to load resource/.test(t))errs.push('console: '+t);if(t.startsWith('ARENA_METRICS '))metricsLines.push(t);});
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.goto(base+'#arena');await pg.waitForTimeout(700);

 /* ---------- v2 ---------- */
 const v2=await pg.evaluate((SAVE_KEY)=>{
  const D=window.DBGarena,f=D.fn,out={};
  // 1. boot and no-save
  out.picker=!document.getElementById('arPicker').hidden&&document.querySelectorAll('#arScenList .arn-pick__item').length>=7;
  out.active=SR.active;
  f.load('e1_fox','v2',null,1);
  out.loaded=D.phase==='PLAN'&&D.sim.S.ships.length===3;
  for(let i=0;i<3;i++)f.runExecSync();
  out.turn=D.A.turn;
  out.noSave=localStorage.getItem(SAVE_KEY)===null;
  // 2. the fitter respects the envelope
  f.load('e1_fox','v2',null,1);
  const S=D.sim.S,F=D.sim.fn;
  const fox=S.ships.find(s=>s.id==='P1');
  const legal=(s,mans)=>mans.every(m=>F.dialAvail(s).some(d=>d[0]===m[0]&&d[1]===m[1]));
  const straight=[];for(let i=0;i<=12;i++)straight.push({x:fox.x+Math.cos(fox.h)*60*i,y:fox.y+Math.sin(fox.h)*60*i});
  const sm=F.fitDrag(fox,straight);
  out.straight=[sm.length>0,legal(fox,sm),sm.every(m=>m[1]==='S'||m[1]==='l'||m[1]==='r')];
  // the freighter: a hairpin drag (out, then straight back) cannot be flown, so the fit is its widest legal turn
  const row=SRDB.ship('graf');
  const graf={id:'G',row,cls:'graf',x:2000,y:1500,h:0,pilot:{mans:[]},crits:[],magClamp:0};
  const hp=[];for(let i=0;i<=6;i++)hp.push({x:2000+i*50,y:1500});for(let i=1;i<=6;i++)hp.push({x:2300-i*50,y:1520});
  const gm=F.fitDrag(graf,hp);
  const maxTurn=Math.max(...F.dialAvail(graf).map(m=>({L:1,R:1,l:0.5,r:0.5,S:0,K:2})[m[1]]));
  out.hairpin=[gm.length>0,legal(graf,gm),gm.some(m=>m[1]==='L'||m[1]==='R'),maxTurn===1];
  // the fitted path ends nowhere near the drag's tip (the hairpin) because the turn radius forbids it
  let pose={x:graf.x,y:graf.y,h:graf.h};for(const m of gm)pose=F.clampEnd(F.manPath(pose.x,pose.y,pose.h,m)(1));
  out.hairpinEnd=Math.hypot(pose.x-2000,pose.y-1520)>40;
  // a crit-clamped ship: two engine crits take the Talon's top speed down, and the fit obeys it
  fox.crits=['engine','engine'];
  const fast=[];for(let i=0;i<=30;i++)fast.push({x:fox.x+Math.cos(fox.h)*60*i,y:fox.y+Math.sin(fox.h)*60*i});
  const cm=F.fitDrag(fox,fast);
  out.clamped=[F.maxSpeedOf(fox),cm.every(m=>m[0]<=F.maxSpeedOf(fox)),legal(fox,cm)];
  fox.crits=[];
  // 6. determinism: same seed, same scripted orders, twice
  const script=()=>{
    f.load('e1_fox','v2',null,42);
    const s=D.sim.S.ships.find(q=>q.id==='P1');
    for(let t=0;t<3;t++){
      const pts=[];for(let i=0;i<=10;i++)pts.push({x:s.x+Math.cos(s.h+i*0.04)*70*i,y:s.y+Math.sin(s.h+i*0.04)*70*i});
      D.sim.fn.planDrag('P1',pts);f.runExecSync();
    }
    return f.stateHash();
  };
  const h1=script(),h2=script();
  out.det=[h1===h2,h1.length>0];
  // 7. scenarios are data
  f.showPicker();
  f.addScenario({id:'t_added',title:'Test: added at runtime',desc:'Appended by the smoke test.',rocks:'none',
    player:[{cls:'viper',pilot:{preset:'green'}}],enemies:[{type:'academy-cadet',doctrine:'pursuit',n:1}],objective:{kind:'survive',secs:12},tune:{}});
  out.added=!!document.querySelector('#arScenList [data-scen="t_added"]');
  document.querySelector('#arScenList [data-load="t_added"]').click();
  out.addedLoads=D.A.scen.id==='t_added'&&D.phase==='PLAN'&&D.sim.S.ships.length===2;
  // 8. metrics: one record per exec
  const n0=D.metrics.length;
  f.runExecSync();f.runExecSync();
  const recs=D.metrics.slice(n0);
  out.metrics=[recs.length,recs.every(r=>r.ruleset==='v2'&&r.scenario==='t_added'&&typeof r.seed==='number'&&typeof r.turn==='number'&&typeof r.planMs==='number'&&Array.isArray(r.ships)&&r.ships.length===2&&r.objective&&r.objective.state)];
  // survive 12s at 6s per exec: the second exec wins it
  out.won=[D.phase,D.A.result];
  out.noSave2=localStorage.getItem(SAVE_KEY)===null;
  return out;
 },SAVE_KEY);
 ok(v2.picker,'1: the Arena did not open on the picker');
 ok(v2.active==='arena','1: active scene is '+v2.active);
 ok(v2.loaded,'1: e1_fox did not load');
 ok(v2.turn===4,'1: three execs should reach turn 4, got '+v2.turn);
 ok(v2.noSave,'1: the Arena wrote the campaign save');
 ok(v2.straight.every(Boolean),'2: straight drag on the Talon '+JSON.stringify(v2.straight));
 ok(v2.hairpin.every(Boolean)&&v2.hairpinEnd,'2: hairpin on the freighter '+JSON.stringify(v2.hairpin)+' end far '+v2.hairpinEnd);
 ok(v2.clamped[0]===3&&v2.clamped[1]&&v2.clamped[2],'2: crit-clamped Talon '+JSON.stringify(v2.clamped));
 ok(v2.det.every(Boolean),'6: determinism '+JSON.stringify(v2.det));
 ok(v2.added&&v2.addedLoads,'7: runtime scenario added '+v2.added+' loads '+v2.addedLoads);
 ok(v2.metrics[0]===2&&v2.metrics[1],'8: metrics '+JSON.stringify(v2.metrics));
 ok(v2.won[0]==='OVER'&&v2.won[1]==='won','8: survive objective '+JSON.stringify(v2.won));
 ok(v2.noSave2,'1: the campaign key appeared later in the session');
 ok(metricsLines.length>=v2.metrics[0]&&metricsLines.every(l=>{try{return !!JSON.parse(l.slice(14)).ruleset;}catch(e){return false;}}),'8: ARENA_METRICS console lines are not well-formed JSON');

 /* ---------- a real mouse drag from the Fox draws a fitted path ---------- */
 const st=await pg.evaluate(()=>{const D=DBGarena,f=D.fn;f.load('e1_fox','v2',null,3);const s=D.sim.S.ships[0];
   return {a:f.toClient(s.x,s.y),b:f.toClient(s.x+Math.cos(s.h)*500,s.y+Math.sin(s.h)*500-150)};});
 await pg.mouse.move(st.a.x,st.a.y);await pg.mouse.down();
 for(let i=1;i<=12;i++)await pg.mouse.move(st.a.x+(st.b.x-st.a.x)*i/12,st.a.y+(st.b.y-st.a.y)*i/12);
 await pg.mouse.up();
 const dr=await pg.evaluate(()=>{const s=DBGarena.sim.S.ships[0];return {kind:s.order.kind,n:s.mans?s.mans.length:0,legal:!!s.mans&&s.mans.every(m=>DBGarena.sim.fn.dialAvail(s).some(d=>d[0]===m[0]&&d[1]===m[1]))};});
 ok(dr.kind==='path'&&dr.n>0&&dr.legal,'2: a mouse drag did not plan a legal path '+JSON.stringify(dr));

 /* ---------- SB ---------- */
 const sb=await pg.evaluate((SAVE_KEY)=>{
  const D=window.DBGarena,f=D.fn,out={};
  // 1. the picker: both rulesets first, then the scenarios under the chosen one
  f.showPicker();
  const names=[...document.querySelectorAll('#arRulesetList .arn-pick__name')].map(e=>e.textContent);
  out.rulesets=names;
  out.scenHidden=document.getElementById('arScenStep').hidden;
  document.querySelector('#arRulesetList [data-ruleset="sb"]').click();
  out.scenShown=!document.getElementById('arScenStep').hidden&&D.ruleset==='sb';
  document.querySelector('#arScenList [data-load="e1_fox"]').click();
  out.sbLoad=[D.phase,D.ruleset,D.mod&&D.mod.key,D.sim.S.ships.length];
  f.runExecSync();f.runExecSync();
  const recs=D.metrics.filter(r=>r.scenario==='e1_fox');
  out.sbRec=recs[recs.length-1].ruleset;
  f.load('e1_fox','v2',null,1);f.runExecSync();
  out.v2Load=[D.ruleset,D.mod.key,D.metrics[D.metrics.length-1].ruleset];
  out.noSave=localStorage.getItem(SAVE_KEY)===null;
  // 3. the envelope
  f.load('e1_fox','sb',null,1);
  const F=D.sim.fn,fox=D.sim.S.ships.find(q=>q.id==='P1');
  const line=(o,ang,len,n)=>{const p=[];for(let i=0;i<=n;i++)p.push({x:o.x+Math.cos(ang)*len*i/n,y:o.y+Math.sin(ang)*len*i/n});return p;};
  const hp=line(fox,fox.h,320,8);const e=hp[hp.length-1];for(let i=1;i<=8;i++)hp.push({x:e.x-Math.sin(fox.h)*30*i,y:e.y+Math.cos(fox.h)*30*i});
  const kap=F.kappaOf(fox),env=F.envelope(fox,'basic');
  const c1=F.buildCurve(fox,{x:fox.x,y:fox.y,h:fox.h},hp,'basic');
  const kmax=Math.max(...c1.pts.map(p=>Math.abs(p.k)));
  out.cap=[kap>0,kmax<=kap+1e-9,kmax>=kap*0.999];
  const long=F.buildCurve(fox,{x:fox.x,y:fox.y,h:fox.h},line(fox,fox.h,3000,10),'basic');
  const short=F.buildCurve(fox,{x:fox.x,y:fox.y,h:fox.h},line(fox,fox.h,40,2),'basic');
  const arc=c=>{let L=0;for(let i=1;i<c.pts.length;i++)L+=Math.hypot(c.pts[i].x-c.pts[i-1].x,c.pts[i].y-c.pts[i-1].y);return L;};
  out.talonLen=[Math.round(arc(long)),Math.round(env.Lmax),Math.round(arc(short)),Math.round(env.Lmin)];
  const graf={id:'G',row:SRDB.ship('graf'),faction:'reb',pilot:{preset:'green'},crits:[],x:2000,y:1500,h:0};
  const genv=F.envelope(graf,'basic');
  const gl=F.buildCurve(graf,{x:2000,y:1500,h:0},line(graf,0,3000,10),'basic');
  out.grafLen=[Math.round(arc(gl)),Math.round(genv.Lmax),genv.Lmax<env.Lmax];
  const boost=F.envelope(fox,'boost');
  out.boost=[boost.Lmax===env.Lmax*D.sim.BOOST_MULT_(),Math.abs(boost.kap-env.kap*D.sim.BOOST_TURN_())<1e-12];
  // two segments: the second from the first's end handle; Fly Defensively on the first
  const segs=F.planSegs('P1',[{kind:'flydef',pts:line(fox,fox.h,450,6)}]);
  const s1=F.segEnd(segs[0]);
  const c2=F.planSegs('P1',[{kind:'flydef',pts:line(fox,fox.h,450,6)},{kind:'basic',pts:line(s1,s1.h-0.6,500,6)}]);
  out.planned=c2.length;
  const end2=F.segEnd(c2[1]);
  out.sched=F.fullSchedule(fox,c2).length===D.sim.AP_PER_ROUND_();
  f.beginExec();
  for(let i=0;i<20;i++)f.stepTick();
  out.flydefOn=fox.flydef;
  while(D.phase==='EXEC')f.stepTick();
  out.flydefOff=!fox.flydef;
  out.ends=Math.hypot(fox.x-end2.x,fox.y-end2.y)<1;
  // one planned segment: the second AP glides on (unspent AP buys nothing)
  const one=F.planSegs('P1',[{kind:'basic',pts:line(fox,fox.h+0.4,400,6)}]);
  const full=F.fullSchedule(fox,one);
  out.glide=[full.length,!!full[1].auto,full[1].kind];
  // the flair changes the pacing, not the arc
  const on=F.buildCurve(fox,{x:fox.x,y:fox.y,h:fox.h},hp,'basic');D.sim.set('SPEED_FLAIR',false);
  const off=F.buildCurve(fox,{x:fox.x,y:fox.y,h:fox.h},hp,'basic');D.sim.set('SPEED_FLAIR',true);
  const mid=k=>F.poseAt({sched:[k,k]},0.5*f.EXEC_LEN_()/D.sim.AP_PER_ROUND_());
  out.flair=[Math.abs(on.L-off.L)<1e-6,Math.hypot(mid(on).x-mid(off).x,mid(on).y-mid(off).y)>1];
  return out;
 },SAVE_KEY);
 ok(sb.cap.every(Boolean),'SB 3: curve not clamped at the turn cap '+JSON.stringify(sb.cap));
 ok(Math.abs(sb.talonLen[0]-sb.talonLen[1])<=1&&Math.abs(sb.talonLen[2]-sb.talonLen[3])<=1,'SB 3: Talon arc lengths outside its speed range '+JSON.stringify(sb.talonLen));
 ok(Math.abs(sb.grafLen[0]-sb.grafLen[1])<=1&&sb.grafLen[2],'SB 3: freighter arc length '+JSON.stringify(sb.grafLen));
 ok(sb.boost.every(Boolean),'SB 3: Boost envelope '+JSON.stringify(sb.boost));
 ok(sb.planned===2&&sb.sched,'SB 3: two AP segments a round');
 ok(sb.flydefOn&&sb.flydefOff,'SB 3: Fly Defensively should hold for its segment only');
 ok(sb.ends,'SB 3: the ship did not end where its second segment ends');
 ok(sb.glide[0]===2&&sb.glide[1]&&sb.glide[2]==='basic','SB 3: an unplanned AP should glide on '+JSON.stringify(sb.glide));
 ok(sb.flair.every(Boolean),'SB 3: flair should pace the curve without changing its arc '+JSON.stringify(sb.flair));
 ok(JSON.stringify(sb.rulesets)==='["SR V2 Combat","SB Test"]','SB 1: rulesets listed '+JSON.stringify(sb.rulesets));
 ok(sb.scenHidden&&sb.scenShown,'SB 1: the scenario step should follow the ruleset choice');
 ok(sb.sbLoad[0]==='PLAN'&&sb.sbLoad[1]==='sb'&&sb.sbLoad[2]==='sb'&&sb.sbLoad[3]===3,'SB 1: e1_fox under SB '+JSON.stringify(sb.sbLoad));
 ok(sb.sbRec==='sb','SB 1: SB metrics ruleset '+sb.sbRec);
 ok(sb.v2Load.join()==='v2,v2,v2','SB 1: e1_fox under v2 '+JSON.stringify(sb.v2Load));
 ok(sb.noSave,'SB 1: the campaign key appeared after a v2 run and an SB run');

 /* ---------- SB combat ---------- */
 const sc=await pg.evaluate(()=>{
  const D=window.DBGarena,f=D.fn,out={};
  const setup=()=>{
    f.load('e1_fox','sb',null,5);
    const S=D.sim.S,F=D.sim.fn;
    F.setRng(()=>0.5);
    const fox=S.ships.find(q=>q.id==='P1'),e1=S.ships.find(q=>q.id==='E1'),e2=S.ships.find(q=>q.id==='E2');
    e2.alive=false;S.rocks.length=0;   // an open field: the belt would block some of these lines
    Object.assign(fox,{x:1500,y:1500,h:0,vx:0,vy:0});Object.assign(e1,{x:1900,y:1500,h:Math.PI/2,vx:0,vy:0});
    fox.target='E1';e1.target='P1';
    return {S,F,fox,e1};
  };
  const hp=t=>t.segs.F.val+t.segs.R.val+t.arm+t.hull;
  const fly=(F,S)=>{for(let i=0;i<120&&S.proj.length+S.missiles.length;i++){F.projTick(0.05);F.missileTick(0.05);}};
  // 4. intersection
  let {S,F,fox,e1}=setup();
  let h0=hp(e1);F.shoot('P1',0);fly(F,S);out.direct=h0-hp(e1);
  ({S,F,fox,e1}=setup());e1.y=1500+120;h0=hp(e1);F.shoot('P1',0);fly(F,S);out.offset=h0-hp(e1);
  // skim vs direct: the same weapon, the same roll, no lock. Direct: into the broadside. Skim: along the hull's
  // length, grazing its edge.
  ({S,F,fox,e1}=setup());
  const ax=F.hullAxes(e1,false);
  e1.h=Math.PI/2;fox.x=1900-400;fox.y=1500;h0=hp(e1);F.shoot('P1',0);fly(F,S);const dDirect=h0-hp(e1);
  ({S,F,fox,e1}=setup());
  e1.h=0;fox.x=1900-400;fox.y=1500+ax.b*0.97;h0=hp(e1);F.shoot('P1',0);fly(F,S);const dSkim=h0-hp(e1);
  const hitD=F.hullHit(Object.assign({},e1,{h:Math.PI/2}),{x:1500,y:1500},{x:2000,y:1500},false);
  const hitS=F.hullHit(Object.assign({},e1,{h:0}),{x:1500,y:1500+ax.b*0.97},{x:2000,y:1500+ax.b*0.97},false);
  out.skim=[dDirect,dSkim,+F.impactOf(1,0,hitD).toFixed(2),+F.impactOf(1,0,hitS).toFixed(2)];
  // spread: the same pilot calm and panicking
  ({S,F,fox,e1}=setup());
  const w=fox.wpns[0].w;
  fox.pilot.cool=85;const calm=F.spreadOf(fox,w,500);
  fox.pilot.cool=15;const panic=F.spreadOf(fox,w,500);
  fox.pilot.cool=85;const far=F.spreadOf(fox,w,800);
  out.spread=[+(calm*180/Math.PI).toFixed(2),+(panic*180/Math.PI).toFixed(2),+(far*180/Math.PI).toFixed(2)];
  // 5. lock: centred, it climbs; behind the firer, it falls
  ({S,F,fox,e1}=setup());
  for(let i=0;i<20;i++)F.lockTick(fox,0.05);
  const up=F.lockOf(fox,'E1');
  fox.h=Math.PI;for(let i=0;i<10;i++)F.lockTick(fox,0.05);
  const down=F.lockOf(fox,'E1');
  // off-centre (near the arc's edge) gains slower than dead centre
  ({S,F,fox,e1}=setup());fox.h=0.45;for(let i=0;i<20;i++)F.lockTick(fox,0.05);const edge=F.lockOf(fox,'E1');
  out.lock=[+up.toFixed(3),+down.toFixed(3),+edge.toFixed(3)];
  // missiles: refused below the lock threshold and inside the minimum range
  ({S,F,fox,e1}=setup());
  F.setLoadout('P1',['missiles']);const q=fox.wpns[0];
  e1.x=1500+700;fox.locks.E1=0.3;const r1=F.missileRefusal(fox,q,e1);
  fox.locks.E1=1;e1.x=1500+300;const r2=F.missileRefusal(fox,q,e1);
  e1.x=1500+700;const r3=F.missileRefusal(fox,q,e1);
  // and a launched missile hits a target flying defensively, even with the immune toggle on
  D.sim.set('flydefImmunity',true);
  e1.flydef=true;h0=hp(e1);
  F.fireTick(fox,0.05);const launched=S.missiles.length;fly(F,S);
  const mDmg=h0-hp(e1);
  // while a plain shot passes straight through it
  h0=hp(e1);F.setLoadout('P1',['bls-t-light-repeaters']);F.shoot('P1',0);fly(F,S);const pDmg=h0-hp(e1);
  D.sim.set('flydefImmunity',false);
  // the default profile: a hit is still possible, on a smaller hull
  const axFd=F.hullAxes(e1,false),axHome=F.hullAxes(e1,true);
  e1.flydef=false;
  out.missile=[r1,r2,r3,launched,mDmg>0,pDmg,+(axFd.a*axFd.b/(axHome.a*axHome.b)).toFixed(2)];
  // 6. determinism: the same seed and scripted orders, twice
  const script=()=>{
    f.load('e1_fox','sb',null,77);
    for(let t=0;t<4&&D.phase==='PLAN';t++){
      const s=D.sim.S.ships.find(x=>x.id==='P1');
      const pts=[];for(let i=0;i<=8;i++)pts.push({x:s.x+Math.cos(s.h+i*0.08)*60*i,y:s.y+Math.sin(s.h+i*0.08)*60*i});
      D.sim.fn.planSegs('P1',[{kind:t%2?'flydef':'basic',pts}]);f.runExecSync();
    }
    return f.stateHash();
  };
  const a=script(),b=script();
  out.det=[a===b,a.length>0];
  // 7. metrics, and a chase with live fire
  f.load('e1_fox','sb',null,3);
  for(let i=0;i<3&&D.phase==='PLAN';i++)f.runExecSync();
  const recs=D.metrics.filter(r=>r.ruleset==='sb'&&r.seed===3);
  const last=recs[recs.length-1];
  out.metrics=[recs.length>=1,recs.every(r=>r.ships.every(x=>['bursts','shots','hits','dmg','lockMax'].every(k=>typeof x[k]==='number')))];
  out.fire=[last.ships.reduce((n,x)=>n+x.shots,0),last.ships.reduce((n,x)=>n+x.hits,0)];
  return out;
 });
 ok(sc.direct>0&&sc.offset===0,'SB 4: intersection: direct '+sc.direct+', offset '+sc.offset);
 ok(sc.skim[0]>sc.skim[1]&&sc.skim[1]>0&&sc.skim[2]>0.95&&sc.skim[3]<0.5,'SB 4: skim vs direct '+JSON.stringify(sc.skim));
 ok(sc.spread[1]>sc.spread[0]&&sc.spread[2]>sc.spread[0],'SB 4: spread calm/panic/far '+JSON.stringify(sc.spread));
 ok(sc.lock[0]>0.3&&sc.lock[1]<sc.lock[0]&&sc.lock[2]<sc.lock[0],'SB 5: lock centred/behind/edge '+JSON.stringify(sc.lock));
 ok(sc.missile[0]==='lock'&&sc.missile[1]==='too close'&&sc.missile[2]===null&&sc.missile[3]===1&&sc.missile[4],'SB 5: missile rules '+JSON.stringify(sc.missile));
 ok(sc.missile[5]===0&&Math.abs(sc.missile[6]-0.25)<0.01,'SB 5: Fly Defensively: immune toggle and profile '+JSON.stringify(sc.missile));
 ok(sc.det.every(Boolean),'SB 6: determinism '+JSON.stringify(sc.det));
 ok(sc.metrics.every(Boolean),'SB 7: metrics '+JSON.stringify(sc.metrics));
 ok(sc.fire[0]>0&&sc.fire[1]>0,'SB 7: a 1v2 chase should have live fire '+JSON.stringify(sc.fire));

 /* ---------- SB B4: Drift with the mouse, movesets, actions ---------- */
 const d0=await pg.evaluate(()=>{
  const D=window.DBGarena,f=D.fn;
  f.load('e1_fox','sb',null,9);
  const S=D.sim.S,fox=S.ships.find(q=>q.id==='P1'),e1=S.ships.find(q=>q.id==='E1'),e2=S.ships.find(q=>q.id==='E2');
  S.rocks.length=0;e2.alive=false;
  Object.assign(fox,{x:2000,y:1500,h:0});Object.assign(e1,{x:1550,y:1500,h:0});fox.target='E1';fox.pilot.cool=90;
  const c=f.cam_();c.x=2050;c.y=1500;c.z=0.8;
  S.sel='P1';D.mod&&window.SR_ARENA.refresh();
  const btn=document.querySelector('#arOrders [data-act="kind"][data-slot="0"][data-kind="drift"]');
  if(btn)btn.click();
  return {btn:!!btn,kind:fox.kinds[0],a:f.toClient(2000,1500),b:f.toClient(2500,1500)};
 });
 ok(d0.btn&&d0.kind==='drift','B4: the veteran Fox has no Drift button '+JSON.stringify(d0));
 await pg.mouse.move(d0.a.x,d0.a.y);await pg.mouse.down();
 for(let i=1;i<=14;i++)await pg.mouse.move(d0.a.x+(d0.b.x-d0.a.x)*i/14,d0.a.y+(d0.b.y-d0.a.y)*i/14);
 await pg.mouse.up();
 const d1=await pg.evaluate(()=>{
  const D=window.DBGarena,f=D.fn,F=D.sim.fn,fox=D.sim.S.ships.find(q=>q.id==='P1');
  const seg=F.curvesOf(fox)[0],e=seg.pts[seg.pts.length-1];
  const fac=fox.plan[0]&&fox.plan[0].facing;
  return {n:fox.plan.length,kind:fox.plan[0]&&fox.plan[0].kind,facing:fac,
    handle:f.toClient(e.x+Math.cos(fac)*110,e.y+Math.sin(fac)*110),
    aim:f.toClient(e.x+Math.cos(Math.PI+0.2)*160,e.y+Math.sin(Math.PI+0.2)*160)};
 });
 ok(d1.n===1&&d1.kind==='drift','B4: the drag did not plan a Drift segment '+JSON.stringify(d1));
 await pg.mouse.move(d1.handle.x,d1.handle.y);await pg.mouse.down();
 for(let i=1;i<=6;i++)await pg.mouse.move(d1.handle.x+(d1.aim.x-d1.handle.x)*i/6,d1.handle.y+(d1.aim.y-d1.handle.y)*i/6);
 await pg.mouse.up();
 const drift=await pg.evaluate(()=>{
  const D=window.DBGarena,f=D.fn,S=D.sim.S,fox=S.ships.find(q=>q.id==='P1');
  const out={facing:+fox.plan[0].facing.toFixed(3)};
  f.beginExec();
  const segT=f.EXEC_LEN_()/D.sim.AP_PER_ROUND_();
  let noseOff=0,velOk=true,back=0,samples=0;
  const seen=new Set();
  while(D.sim.S.execT<segT-0.06&&D.phase==='EXEC'){
    f.stepTick();
    if(D.sim.S.execT>segT*0.2&&D.sim.S.execT<segT*0.85){
      samples++;
      noseOff=Math.max(noseOff,Math.abs(Math.atan2(Math.sin(fox.h-fox.plan[0].facing),Math.cos(fox.h-fox.plan[0].facing))));
      if(fox.vx<=0)velOk=false;
    }
    for(const p of S.proj)if(p.owner==='P1'&&!seen.has(p)){seen.add(p);if(p.vx<0)back++;}
  }
  out.drift=[samples,+noseOff.toFixed(3),velOk,back,fox.st.shots];
  while(D.phase==='EXEC')f.stepTick();
  return out;
 });
 ok(Math.abs(drift.facing-(Math.PI+0.2-2*Math.PI))<0.06||Math.abs(drift.facing-(Math.PI+0.2))<0.06,'B4: the facing handle did not set the facing '+drift.facing);
 ok(drift.drift[0]>5&&drift.drift[1]<0.05&&drift.drift[2],'B4: Drift should hold the nose on the facing while flying the path '+JSON.stringify(drift.drift));
 ok(drift.drift[3]>0&&drift.drift[4]>0,'B4: Drift should fire back along the nose at the pursuer '+JSON.stringify(drift.drift));
 const b4=await pg.evaluate(()=>{
  const D=window.DBGarena,f=D.fn,out={};
  // movesets: green has no Drift, the veteran has Boost and Drift, an ace has the lot
  f.load('e3_count','sb',1,1);
  const S=D.sim.S,F=D.sim.fn;
  const green=S.ships.find(q=>q.pilot.preset==='green'),vet=S.ships.find(q=>q.pilot.preset==='veteran');
  S.sel=green.id;window.SR_ARENA.refresh();
  out.greenHud=!document.querySelector('#arOrders [data-kind="drift"]')&&!!document.querySelector('#arOrders [data-kind="flydef"]');
  out.green=F.kindsFor(green).join();out.greenSet=F.setKind(green.id,0,'drift');
  out.vet=F.kindsFor(vet).join();
  const ace={faction:'reb',pilot:{preset:'ace'}};out.ace=F.kindsFor(ace).join();
  out.custom=F.kindsFor({faction:'reb',pilot:{preset:'green',moveset:['loop']}}).join();
  out.heg=F.kindsFor(S.ships.find(q=>q.faction==='heg')).join();
  // actions resolve as the exec begins
  const s=vet;s.pilot.cool=40;s.crits=['targeting'];s.segs.F.val=2;
  out.acts=F.actionsFor(s).join();
  F.setAction(s.id,'lockin');f.beginExec();out.lockin=Math.round(s.pilot.cool);while(D.phase==='EXEC')f.stepTick();
  F.setAction(s.id,'fixcrit');f.beginExec();out.fix=s.crits.length;while(D.phase==='EXEC')f.stepTick();
  const fv=s.segs.F.val;F.setAction(s.id,'boostF');f.beginExec();out.boost=s.segs.F.val-fv;while(D.phase==='EXEC')f.stepTick();
  F.setAction(s.id,'shiftF');f.beginExec();out.shift=s.segs.F.at;while(D.phase==='EXEC')f.stepTick();
  out.fixGone=!F.actionsFor(s).includes('fixcrit');
  // the stub slots: only the lead has a special (its self-repair); no ship has a ship ability yet
  const lead=S.ships.find(q=>q.faction==='reb'&&q.lead);
  out.special=[F.specialAbilities(lead).join(),F.specialAbilities(green).join(),S.ships.every(q=>F.shipAbilities(q).length===0)];
  out.cleared=s.action;
  return out;
 });
 ok(b4.greenHud&&b4.green==='basic,flydef'&&b4.greenSet===false,'B4: a green pilot should offer no Drift '+JSON.stringify([b4.greenHud,b4.green,b4.greenSet]));
 ok(b4.vet==='basic,flydef,boost,drift'&&b4.ace==='basic,flydef,boost,drift,kturn,barrel'&&b4.custom==='basic,flydef,loop'&&b4.heg==='basic,flydef','B4: movesets '+JSON.stringify([b4.vet,b4.ace,b4.custom,b4.heg]));
 ok(b4.acts.includes('lockin')&&b4.acts.includes('fixcrit')&&b4.acts.includes('boostF'),'B4: actions offered '+b4.acts);
 ok(b4.lockin>=74&&b4.fix===0&&b4.boost>0&&b4.shift==='R'&&b4.fixGone&&b4.cleared==='none','B4: actions resolve '+JSON.stringify(b4));
 ok(b4.special[0]==='fieldrep'&&b4.special[1]===''&&b4.special[2],'B4: ability stubs '+JSON.stringify(b4.special));

 /* ---------- the title screen's button ---------- */
 const pg2=await ctx.newPage();
 pg2.on('pageerror',e=>errs.push('title: '+e.message));
 await pg2.goto(base);
 await pg2.waitForSelector('#splash.is-ready',{timeout:8000}).catch(()=>{});
 const hasBtn=await pg2.evaluate(()=>!!document.getElementById('splashArena'));
 ok(hasBtn,'title: no Enter Arena button');
 if(hasBtn){
  await pg2.click('#splashArena');
  await pg2.waitForTimeout(900);
  const t=await pg2.evaluate((k)=>({active:SR.active,picker:!document.getElementById('arPicker').hidden,save:localStorage.getItem(k)}),SAVE_KEY);
  ok(t.active==='arena'&&t.picker,'title: Enter Arena did not reach the picker '+JSON.stringify(t));
  ok(t.save===null,'title: Enter Arena wrote the campaign save');
 }

 ok(!errs.length,'errors: '+errs.join(' | '));
 console.log(JSON.stringify({v2,sb,sc,drift,b4,errors:errs}));
 if(fails.length){console.log('FAIL\n- '+fails.join('\n- '));await b.close();process.exit(1);}
 console.log('arena-smoke: all checks passed');
 await b.close();
})();
