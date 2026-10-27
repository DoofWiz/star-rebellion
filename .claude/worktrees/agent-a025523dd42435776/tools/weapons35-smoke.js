/* The designer's notes of 22 October on the Type 3.5 freighter: node tools/weapons35-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  weapon types against shields, armour and hull (soak): plasma great on shields and poor on armour; ballistic poor on
      shields, shreds armour, scatters more; a missile poor on shields, great on armour and hull. The database's
      repeaters (kind plasma) stay the even line: only a true plasma weapon counts
   2  a missile waits for a weak shield; on a capital hull it does MIS_VS_CAP, guns GUN_VS_CAP
   3  past her shields a shot lands on the freighter's hull itself, not on the bubble round her
   4  a jump point is a jump point: Quick Jumper spools on the run and jumps only at her jump point
   5  the Crash: the leaders' plan leaves her engines alone; a Disable on the power plant waits for the gravity window,
      holding fire on her, and goes in once it opens; through the window and out, the Crash is off */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.goto(base+'?dev#arena');await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const X=window.DBGarena.hc35,B=X.B,L35=X.L35,SIM=window.SIMHC,F=SIM.fn,N=L35.N,out={};
  const S=()=>X.S,L=()=>X.L,by=id=>S().ships.find(s=>s.id===id),fr=()=>by('fl400');
  const go=(prim,ex,o)=>{o=o||{};B.seed=o.seed||777;B.mods=o.mods||[];B.plan=L35.defaultPlan(L35.OPPORTUNITIES.vulnerable_freighter);B.plan.primary=prim;
    for(const w in B.plan.wings){B.plan.wings[w].role='strike';B.plan.wings[w].exec=Object.assign({arg:null},ex[w]||{k:'hold'});B.plan.wings[w].second=null;}
    B.plan.assets=[];B.plan.roes=[];B.plan.optionals=[];X.fn.launch();L().cp=9;};
  N.COMMS_OFF=1;N.REQ_OFF=1;N.RES_THREAT=0;N.RES_ENGINES=0;N.RES_TURRET=0;N.RES_ESCORT=0;   // no surrender to muddy it
  const r2=v=>Math.round(v*100)/100;
  out.ver=[SIM.SIM_VERSION,L35.SIM_VERSION];
  // 1. the layers
  const mk=(sh,arm)=>({segs:{F:{val:sh,max:sh,at:'F'},R:{val:sh,max:sh,at:'R'}},arm,h:0});
  const K=[null,'plasma','ballistic','missile'];
  out.sh=K.map(k=>r2(F.soak(mk(100,0),4,false,'F',k).sd));          // what 4 points do to a shield
  out.ar=K.map(k=>r2(F.soak(mk(0,100),4,false,'F',k).ad));          // to armour
  out.hu=K.map(k=>r2(F.soak(mk(0,0),4,false,'F',k).hd));            // to the hull
  out.through=r2(F.soak(mk(2,2),10,false,'F','plasma').hd);           // through 2 shield (1.33 points) and 2 armour (4 points): 4.67 to the hull
  out.kind=[F.dmgKind({kind:'plasma'}),F.dmgKind({kind:'plasma',plasma:true}),F.dmgKind({kind:'missile'}),F.dmgKind({kind:'ballistic'})];
  // 2, 3: a ship of the strike and the freighter
  go('destroy',{});SIM.runFor(1);
  const hale=by('hale'),f=fr();
  out.spread=r2(F.spreadOf(hale,{kind:'ballistic'},500,0)/F.spreadOf(hale,{kind:'energy'},500,0));
  const full=F.missileOpening(hale,f);f.segs.F.val=f.segs.R.val=0;const down=F.missileOpening(hale,f);
  out.missile=[full===false,down===true];
  f.arm=0;hale.sub35=null;const h0=f.hull;L35.fn.damageFreighter(f,10,false,true,{by:'hale',kind:'missile'});const mis=h0-f.hull;
  const h1=f.hull;L35.fn.damageFreighter(f,10,false,true,{by:'hale',kind:null});const gun=h1-f.hull;
  out.cap=[r2(mis),r2(gun)];
  // the hull itself: a shot from the side at her middle
  const n={x:-Math.sin(f.h),y:Math.cos(f.h)},p0={x:f.x+n.x*4000,y:f.y+n.y*4000},p1={x:f.x,y:f.y},d=h=>h?Math.hypot(h.x-f.x,h.y-f.y):null;
  f.segs.F.val=f.segs.F.max;f.segs.R.val=f.segs.R.max;const up=F.shotHit(f,p0,p1,false);
  f.segs.F.val=f.segs.R.val=0;const dn=F.shotHit(f,p0,p1,false);
  const k=L35.fn.FL_UNIT();
  out.body=[r2(d(up)),r2(d(dn)),r2(14.4*k)];
  // a shot along her side, inside the bubble but clear of her hull: it meets the shield while it's up, passes once it's down
  const A=F.hullAxes(f),c=Math.cos(f.h),sn=Math.sin(f.h),off=(18*k+A.b)/2,q0={x:f.x+c*4000+n.x*off,y:f.y+sn*4000+n.y*off},q1={x:f.x-c*4000+n.x*off,y:f.y-sn*4000+n.y*off};
  f.segs.F.val=f.segs.F.max;f.segs.R.val=f.segs.R.max;const sUp=F.shotHit(f,q0,q1,false);f.segs.F.val=f.segs.R.val=0;const sDn=F.shotHit(f,q0,q1,false);
  // a shot at her bow from the side, past the ellipse's end: it meets her hull
  const bx=55*k,b0={x:f.x+c*bx+n.x*4000,y:f.y+sn*bx+n.y*4000},b1={x:f.x+c*bx,y:f.y+sn*bx};
  out.gap=[A.b>18*k,!!sUp,sDn===null,A.a<57*k,!F.hullHit(f,b0,b1),!!F.shotHit(f,b0,b1,false)];
  // 4. Quick Jumper: on the run, alarmed, she spools but doesn't jump; at her jump point she's gone at once
  go('destroy',{},{mods:[{k:'quick',hidden:false}]});L35.alarm('fired','test');SIM.runFor(15);
  out.quick=[fr().alive&&!fr().jumped,L().spool==null,L().preSpool!=null,L().mods.some(m=>m.k==='quick'&&m.found)];
  const jp=L().lane[L().lane.length-1],put=(x,y)=>{const g=fr();g.x=g.px=x;g.y=g.py=y;};
  L().leg=L().lane.length-1;put(jp.x-40,jp.y);SIM.runFor(1.5);
  out.quick.push(!fr().alive&&fr().jumped,L().spoolDur===0);
  go('destroy',{});L35.alarm('fired','test');L().leg=L().lane.length-1;put(jp.x-40,jp.y);SIM.runFor(1.5);
  out.normal=[fr().alive,L().spool!=null,L().spoolDur===L35.TUNE.JUMP_SECS.get()];
  // 5. the Crash
  const lp=L35.leaderPlan('crash');out.plan=[JSON.stringify(lp.wings).indexOf('engines')<0,lp.wings.anvil.exec.k==='disable'&&lp.wings.anvil.exec.arg==='power'];
  go('crash',{anvil:{k:'disable',arg:'power'}});L35.alarm('fired','test');
  for(const e of S().ships)if(e.role35==='escort'){e.alive=false;e.jumped=true;}for(const x of L().subs)if(x.k==='pd')x.hp=0;   // nobody to defend against: the wait itself
  const P=L().planet,pw=()=>L().subs.find(x=>x.k==='power'),anv=()=>S().ships.filter(s=>s.wing==='anvil'&&s.alive);
  const pw0=pw().hp,far=!L35.fn.crashWindow();SIM.runFor(12);
  out.wait=[far,!L35.fn.crashWindow(),anv().every(s=>s.beh&&s.beh.win),pw().hp===pw0,anv().every(s=>SIM.hooks.canFire(s,fr(),null)===false)];
  const a=Math.atan2(fr().y-P.y,fr().x-P.x);put(P.x+Math.cos(a)*P.pull*0.8,P.y+Math.sin(a)*P.pull*0.8);SIM.runFor(3);
  out.go=[L35.fn.crashWindow(),anv().every(s=>!(s.beh&&s.beh.win))];
  go('crash',{anvil:{k:'disable',arg:'power'}});L35.alarm('fired','test');SIM.runFor(1);L().winSeen=true;SIM.runFor(2);
  const fb=L().fallback||{};out.passed=[!!L().winPassed,fb.from==='crash',/gravity window/.test(fb.why||'')];
  return out;
 });
 ok(/^hc-[3-9]$/.test(r.ver[0])&&/^hc35-1[4-9]$/.test(r.ver[1]),'SIM_VERSIONs bumped '+JSON.stringify(r.ver));
 ok(JSON.stringify(r.sh)==='[4,6,1.6,1.2]','1: on a shield: even 4, plasma 6, ballistic 1.6, missile 1.2 '+JSON.stringify(r.sh));
 ok(JSON.stringify(r.ar)==='[4,2,6.4,6.4]','1: on armour: even 4, plasma 2, ballistic 6.4, missile 6.4 '+JSON.stringify(r.ar));
 ok(JSON.stringify(r.hu)==='[4,4,4,5.6]','1: on the hull: missile 5.6, the rest 4 '+JSON.stringify(r.hu));
 ok(r.through===4.67,'1: what a layer doesn\'t take goes on to the next '+r.through);
 ok(JSON.stringify(r.kind)==='[null,"plasma","missile","ballistic"]','1: the repeaters (kind plasma) are the even line; a true plasma weapon counts '+JSON.stringify(r.kind));
 ok(r.spread===1.6,'1: ballistic scatters 1.6 × '+r.spread);
 ok(r.missile.every(Boolean),'2: a missile waits for a weak shield '+JSON.stringify(r.missile));
 ok(r.cap[0]===7&&r.cap[1]===2.5,'2: on a capital hull a missile does 10 × 0.5 × 1.4 = 7, a gun 10 × 0.25 = 2.5 '+JSON.stringify(r.cap));
 ok(r.body[0]>r.body[1]&&Math.abs(r.body[1]-r.body[2])<1,'3: shields up the shot meets the bubble; down, her hull (14.4 art units off her spine) '+JSON.stringify(r.body));
 ok(r.gap.every(Boolean),'3: a shot along her side inside the bubble meets the shield, and misses once it\'s down; one at her bow, past the ellipse, meets her hull '+JSON.stringify(r.gap));
 ok(r.quick.every(Boolean),'4: Quick Jumper spools on the run, revealed, but jumps only at her jump point, at once '+JSON.stringify(r.quick));
 ok(r.normal.every(Boolean),'4: without it she spools JUMP_SECS at her jump point '+JSON.stringify(r.normal));
 ok(r.plan.every(Boolean),'5: the leaders\' Crash: no engines; Anvil disables the power plant '+JSON.stringify(r.plan));
 ok(r.wait.every(Boolean),'5: far from the pull, Anvil waits for the gravity window and holds fire on her '+JSON.stringify(r.wait));
 ok(r.go.every(Boolean),'5: in the window, Anvil goes in '+JSON.stringify(r.go));
 ok(r.passed.every(Boolean),'5: through the window and out, the Crash is off '+JSON.stringify(r.passed));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r},null,0));
 if(fails.length){console.error('weapons35-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('weapons35-smoke OK');
})();
