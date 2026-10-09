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
   (§8's 3–5, continuous fire, interrupts and doctrine, arrive with phases A2–A4.) */
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
 console.log(JSON.stringify({v2,errors:errs}));
 if(fails.length){console.log('FAIL\n- '+fails.join('\n- '));await b.close();process.exit(1);}
 console.log('arena-smoke: all checks passed');
 await b.close();
})();
