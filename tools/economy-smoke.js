/* Smoke test for the prologue's economy (docs/FEEDBACK-0.2-HANDOFF.md §3.3): node tools/economy-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   New Game to the frontier on the game's own economy: no resources added and no rooms pushed by hand. Everything is
   built and bought through the real handlers (startRestore, digAt, buildAt, startUpgrade, flipHalf, buyLot) and the
   missions are won with Debug: skip mission, as in prologue-smoke.
   1  a frugal run: only what the beats need (the Marta, the Barracks tile its side beat asks for, the Bunks upgrade
      the mercenary's bunk needs, the mercenary, the second Hangar section and its excavation, the second Graf). It
      logs credits, materials and supplies at every beat, reaches the frontier with no grant from the affordability
      net, and has ECON_HEADROOM to spare at every spend
   2  a spendthrift run: the same, plus an Infirmary, a Workshop and a Storeroom as soon as they can be afforded. It
      still reaches the frontier, with the net firing at most once per beat
   3  salvage: the prisoner truck stalled in Rescue Tachi pays materials, shown as a Salvaged row in the debrief
   4  after the frontier a Graf lot costs SHIP_PRICE.graf again
   With ECON_MEASURE=1 in the environment it measures instead: a spend it can't cover is topped up and listed as a
   shortfall (how the table in the 0.2 §3 commit was made, on the build before the fixes). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const ECON_HEADROOM=0.10;   // placeholder: the share to spare at every spend the frugal run makes
let FAILS=null;
process.on('unhandledRejection',e=>{console.log('FAIL (threw)\n'+(FAILS||[]).join('\n')+'\n'+e.message.split('\n')[0]);process.exit(1);});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};FAILS=fails;
 const E=(f,a)=>pg.evaluate(f,a);
 const wait=ms=>pg.waitForTimeout(ms);
 const scene=async s=>{await pg.waitForFunction(x=>window.SR.active===x,s,{timeout:15000});await wait(400);};

 // the in-page player: one tick looks at the screen and the beat, and does the next thing
 await E(head=>{
  const D=window.DBGbase,f=D.fn,P=window.Pro;
  const EC=window.EC={HEAD:head,mode:'frugal',ledger:[],short:[],beats:[],grants:[],seen:{},idle:0,
   src:id=>D.G.sources.find(s=>s.id===id&&s.alive),
   mis:id=>D.G.missions.find(m=>m.id===id||m.story===id),
   wallet:()=>({c:Math.round(D.G.credits),m:Math.round(D.G.materials),s:Math.round(D.G.supplies)}),
   // a spend: logged with what we had; in measure mode a shortfall is topped up and listed
   pay(label,cost,fn){
    const G=D.G,c={c:cost.c||0,m:cost.m||0,s:cost.s||0},have=EC.wallet();
    const can=G.credits>=c.c&&G.materials>=c.m&&G.supplies>=c.s;
    if(!can){
     if(EC.mode!=='measure')return false;
     const miss={c:Math.max(0,c.c-G.credits),m:Math.max(0,c.m-G.materials),s:Math.max(0,c.s-G.supplies)};
     EC.short.push({beat:P.beat(),label,miss:{c:Math.ceil(miss.c),m:Math.ceil(miss.m),s:Math.ceil(miss.s)}});
     G.credits+=miss.c;G.materials+=miss.m;G.supplies+=miss.s;
    }
    const head=['c','m','s'].every(k=>!c[k]||have[k]>=c[k]*(1+EC.HEAD));
    const r=fn();
    EC.ledger.push({beat:P.beat(),day:G.day,label,cost:c,have,head:can&&head,ok:r!==false});
    return r!==false;
   },
   winAct(){
    const w=f.getWin();if(!w)return false;
    const q=s=>document.querySelector('#winCardB '+s);
    if(w==='comm'){const bt=q('[data-follow]')||q('[data-proaccept]');if(bt)bt.click();else f.closeWin();return true;}
    if(w==='recruit'){   // story recruits (and Sera) join; anyone else is turned away
     const cards=(f.getWinArg()||{}).cards||[];
     const i=cards.findIndex(c=>c.must||c.p.id==='sera');
     if(i>=0){const bt=q('[data-rec-accept="'+i+'"]');if(bt&&!bt.disabled){bt.click();return true;}}
     const no=q('[data-rec-no]');if(no){no.click();return true;}
     f.closeWin();return true;
    }
    if(w==='agentTutIntro'){const bt=q('[data-agenttut-done]');if(bt){bt.click();return true;}}
    f.closeWin();return true;
   },
   // the floor tile a room goes on, excavating first if need be (the side beat's own pick)
   room(key,label){
    const G=D.G;
    if(G.rooms.some(r=>r.key===key&&r.build))return 'building';
    const t=f.roomTileFor(key);if(!t)return 'none';
    if(t.kind==='wait')return 'digging';
    if(t.kind==='dig')return EC.pay(label+' (excavate)',{m:40},()=>f.digAt(t.r,t.c))?'dug':'short';
    return EC.pay(label,f.buildCostAt(key,t.r,t.c),()=>f.buildAt(t.r,t.c,key))?'built':'short';
   },
   // the second Hangar section: the 4 × 4 block beside the first, every rubble tile excavated, then built
   hangar(){
    const G=D.G,rs=G.rooms.filter(r=>r.key==='hangar');
    if(rs.some(r=>r.build))return 'building';
    if(rs.length>=2)return 'done';
    const bl=f.hangarPlan();if(!bl)return 'none';   // the block the net costs: fewest rubble tiles, beside the first section
    const r0=bl.r,c0=bl.c;
    const cells=[];for(let r=r0;r<r0+4;r++)for(let c=c0;c<c0+4;c++)cells.push(G.grid[r][c]);
    const rub=[];for(let r=r0;r<r0+4;r++)for(let c=c0;c<c0+4;c++)if(G.grid[r][c].t==='rubble'&&!G.grid[r][c].dig)rub.push([r,c]);
    if(rub.length)return EC.pay('Hangar block (excavate '+rub.length+')',{m:40*rub.length},()=>{for(const [r,c] of rub)f.digAt(r,c);})?'dug':'short';
    if(cells.some(x=>x.t==='rubble'))return 'digging';
    return EC.pay('Hangar section',f.buildCostAt('hangar',r0,c0),()=>f.buildAt(r0,c0,'hangar'))?'built':'short';
   },
   // a half of the new section becomes a large pad, so the second hauler can land
   flip(){
    const G=D.G,sec=G.rooms.filter(r=>r.key==='hangar'&&!r.build)[1];
    if(!sec)return false;
    if(f.fleetFits(['graf','graf','talon','talon','talon','talon'],f.padCounts()))return false;
    const h=sec.halves.indexOf('S');return h>=0&&f.flipHalf(sec,h);
   },
   tick(){
    const G=D.G,pr=G.prologue,b=P.beat();
    if(P.done())return {do:'done'};
    if(G.day>140)return {do:'stuck',why:'day '+G.day+' at '+b};
    if(!document.querySelector('#estSplash').hidden)return {do:'splash'};
    if(EC.winAct()){EC.idle=0;return {do:'acted'};}
    if(f.rqLen()){f.closeWin();return {do:'wait'};}   // the queue waits out the day banner
    if(!EC.seen[b]){EC.seen[b]=1;EC.beats.push(Object.assign({beat:b,day:G.day},EC.wallet()));}
    const ix=P.index(b),past=id=>ix>=P.index(id);
    // what the beats need, whenever it comes up
    if(past('cross_offer')&&G.wreck&&!G.wreck.restored&&!G.wreck.restoring)EC.pay('Restore the Marta',f.proCost('marta'),()=>f.startRestore());
    if(P.side('room_barracks')==='run'&&f.tilesOf('barracks')<3){const r=EC.room('barracks','Barracks tile');if(r==='short')return {do:'day',why:'barracks'};}
    const st=P.step();
    if(st&&st.next&&/^sb/.test(st.text||''))P.emit('next');   // a room tutorial's closing card
    if(EC.mode==='spend')for(const [k,l] of [['infirmary','Infirmary'],['workshop','Workshop'],['store','Storeroom']])
     if(!G.rooms.some(r=>r.key===k)){const t=f.roomTileFor(k);if(t&&t.kind==='floor'){const c=f.buildCostAt(k,t.r,t.c);if(G.credits>=c.c&&G.materials>=(c.m||0)&&G.supplies>=(c.s||0))EC.room(k,l);}}
    const live=P.live(),ag=G.agents[0];
    switch(b){
     case 'cass_intro':return {do:'wait'};
     case 'cass_contact':case 'cross_offer':f.srcContact(EC.src('cass'));return {do:'acted'};
     case 'sera':case 'fuel_offer':
      if(live&&EC.src('cass').signal){f.srcContact(EC.src('cass'));return {do:'acted'};}
      return {do:'day'};
     case 'cross':return G.wreck.restored?{do:'mission',id:'stealcross',ground:true}:{do:'day',why:'the Marta'};
     case 'venn_arrives':f.srcContact(EC.src('venn'));return {do:'acted'};
     case 'depots':return {do:'mission',id:'depotrun',ground:false};
     case 'fuel_recruit':return {do:'day'};
     case 'fuel_plan':return {do:'mission',id:'stealfuel',ground:true,extra:'cross'};
     case 'tachi_offer':return EC.mis('rescuetachi')?{do:'mission',id:'rescuetachi',ground:true}:{do:'wait'};
     case 'tachi_joins':return {do:'wait'};
     case 'agents':   // Run Your Network's steps (no spending in them), then the Recruit
      if(pr.tut&&pr.tut.key==='runNetwork'&&!pr.tut.wait){P.emit('tab','intel');P.emit('inSel',{kind:'agent',id:'tachi'});P.emit('next');P.emit('next');}
      if(P.gate('op.recruit')&&ag&&!G.recruit.days)f.agentRecruit(ag);
      return {do:'acted'};
     case 'tense':case 'lielow_wait':return {do:'day'};
     case 'first_lead':
      if(pr.tut&&pr.tut.key==='askingQuestions'){P.emit('inSel',{kind:'src',id:'venn'});P.emit('inSel',{kind:'bureau'});}
      if(P.gate('op.lielow')&&ag)f.agentLieLow(ag);
      return {do:'acted'};
     case 'bunker_offer':return {do:'day'};
     case 'tachi_recruit':
      if(live&&ag&&!G.recruit.days&&!(ag.lielow>0)&&!G.recWait.length)f.agentRecruit(ag);
      return {do:'day'};
     case 'market':f.openMarket();f.closeMarket();return {do:'acted'};
     case 'sweet_tooth':{
      const i=G.market.lots.findIndex(l=>l.keep&&l.kind==='merc'&&l.stock>0);
      if(i<0)return {do:'day'};
      if(!f.mercBunkFree()){   // a bunk for the mercenary: the Bunks upgrade on the Barracks
       const rm=G.rooms.find(r=>r.key==='barracks'&&!r.build);
       if(f.upOf(rm,'bunks')||f.upQueued(rm,'bunks'))return {do:'day',why:'bunks'};
       const d=f.UPGRADES_().barracks.find(x=>x.k==='bunks');
       return EC.pay('Bunks upgrade',d,()=>f.startUpgrade(rm,'bunks'))?{do:'acted'}:{do:'day',why:'bunks'};
      }
      return EC.pay('Mercenary',{c:f.lotPrice(G.market.lots[i])},()=>f.buyLot(i,false))?{do:'acted'}:{do:'day',why:'mercenary'};
     }
     case 'hauler':{
      const h=EC.hangar();
      if(h!=='done')return {do:'day',why:'hangar '+h};
      EC.flip();
      const i=G.market.lots.findIndex(l=>l.keep&&l.kind==='ship'&&l.stock>0);
      if(i<0||(G.inbound||[]).length)return {do:'day',why:'hauler'};
      return EC.pay('Second Graf',{c:f.lotPrice(G.market.lots[i])},()=>f.buyLot(i,false))?{do:'acted'}:{do:'day',why:'graf'};
     }
     case 'bunker':return (G.inbound||[]).length?{do:'day'}:{do:'mission',id:'raidbunker',ground:true,extra:'bunker'};
    }
    return {do:'day'};
   },
  };
  // the affordability net's grants (the grant action), as they are paid
  const run0=P.run;
  P.run=function(a,beat){if(a&&a.grant)EC.grants.push({beat,grant:a.grant});return run0.apply(this,arguments);};
 },ECON_HEADROOM);

 const runMission=async(id,ground,extra)=>{
  await E(([id,extra])=>{
   const f=window.DBGbase.fn,m=window.EC.mis(id),G=window.DBGbase.G;
   f.closeWin();f.openPlan(m);f.plAutoFill();
   if(extra==='cross'){   // Steal Fuel: the Cross as its Strafing Run
    const i=f.plAddAsset(),cross=G.fighters.find(x=>x.cls==='cross'),used=new Set(Object.values(f.getPL().v));
    const pilot=G.people.find(p=>p.role==='Pilot'&&!used.has(p.id));
    f.plSet('as'+i+'s','f:'+cross.id);if(pilot)f.plSet('as'+i+'p','p:'+pilot.id);
   }
   if(extra==='bunker'){   // Raid the Bunker: the second hauler brings the pilots in as Reinforcements
    const PL=f.getPL(),g2=G.fighters.find(x=>x.cls==='graf'&&x.id!==PL.v.tv0);
    const i=f.plAddAsset();f.plSet('as'+i+'s','f:'+g2.id);
    const used=new Set(Object.values(PL.v)),pp=f.ablePilots().find(p=>!used.has(p.id));if(pp)f.plSet('as'+i+'p','p:'+pp.id);
    f.plAutoFill();
   }
   f.renderWin();
   window.__plan=[f.plComplete(),f.canAttempt(m),f.precondList(m).filter(c=>!c.ok).map(c=>c.brief).join(' ')];
   if(window.__plan[0]&&window.__plan[1])f.startPlan();else f.closeWin();
  },[id,extra||null]);
  const pl=await E(()=>window.__plan);
  if(!(pl[0]&&pl[1]))return 'unplannable: '+pl[2];
  await scene(ground?'ground':'space');
  const sc=ground?'#sc-ground':'#sc-space';
  await E(sc=>document.querySelector(sc+' #dbgSkip').click(),sc);
  await wait(300);
  await E(sc=>document.querySelector(sc+' #endRestartBtn').click(),sc);
  await scene('base');
  await wait(500);
  return '';
 };

 const play=async mode=>{
  await E(m=>{const EC=window.EC;EC.mode=m;EC.ledger=[];EC.short=[];EC.beats=[];EC.grants=[];EC.seen={};window.Pro.jump('rock');window.DBGbase.fn.launchIntro();},mode);
  await scene('ground');
  await E(()=>document.querySelector('#sc-ground #dbgSkip').click());await wait(300);
  await E(()=>document.querySelector('#sc-ground #endRestartBtn').click());
  await scene('base');
  let why='';
  for(let n=0;n<4000;n++){
   const s=await E(()=>window.EC.tick());
   if(s.do==='done')break;
   if(s.do==='stuck'){why=s.why;break;}
   if(s.do==='splash'){await E(()=>document.querySelector('#estSplash').click());await wait(400);continue;}
   if(s.do==='wait'){await wait(120);continue;}
   if(s.do==='acted'){await wait(30);continue;}
   if(s.do==='day'){await E(()=>window.DBGbase.fn.advanceDay());await wait(30);continue;}
   if(s.do==='mission'){const r=await runMission(s.id,s.ground,s.extra);if(r){why=s.id+' '+r;break;}continue;}
  }
  return Object.assign(await E(()=>{const EC=window.EC,G=window.DBGbase.G;
   return {done:window.Pro.done(),day:G.day,end:EC.wallet(),ledger:EC.ledger,short:EC.short,beats:EC.beats,grants:EC.grants,at:window.Pro.beat()};}),{why});
 };
 const fmt=n=>String(n).padStart(6);
 const table=(title,r)=>{
  console.log('\n'+title+' (ended day '+r.day+' at '+r.at+(r.why?', stopped: '+r.why:'')+')');
  console.log('beat            day credits materials supplies');
  for(const x of r.beats)console.log(x.beat.padEnd(15)+String(x.day).padStart(4)+fmt(x.c)+'   '+fmt(x.m)+'   '+fmt(x.s));
  console.log('spend                          beat           credits materials supplies  had (c/m/s)       10% spare');
  for(const x of r.ledger)console.log(x.label.padEnd(30)+' '+x.beat.padEnd(14)+fmt(x.cost.c)+'   '+fmt(x.cost.m)+'   '+fmt(x.cost.s)+'   '+(x.have.c+'/'+x.have.m+'/'+x.have.s).padEnd(17)+' '+(x.head?'yes':'NO'));
  if(r.short.length){console.log('shortfall (topped up)          beat           credits materials supplies');
   for(const x of r.short)console.log(x.label.padEnd(30)+' '+x.beat.padEnd(14)+fmt(x.miss.c)+'   '+fmt(x.miss.m)+'   '+fmt(x.miss.s));
   const t=r.short.reduce((a,x)=>({c:a.c+x.miss.c,m:a.m+x.miss.m,s:a.s+x.miss.s}),{c:0,m:0,s:0});
   console.log('total'.padEnd(45)+fmt(t.c)+'   '+fmt(t.m)+'   '+fmt(t.s));}
  if(r.grants.length)console.log('grants: '+JSON.stringify(r.grants));
 };

 if(process.env.ECON_MEASURE){
  const r=await play('measure');table('Measured (shortfalls topped up)',r);
  await b.close();process.exit(0);
 }
 // 1. frugal
 let r=await play('frugal');table('Frugal run',r);
 ok(r.done&&!r.why,'the frugal run reaches the frontier '+JSON.stringify({at:r.at,why:r.why}));
 ok(!r.grants.length,'the frugal run needs no grant from the affordability net '+JSON.stringify(r.grants));
 const tight=r.ledger.filter(x=>!x.head||!x.ok);
 ok(!tight.length,'every frugal spend has '+Math.round(ECON_HEADROOM*100)+'% to spare '+JSON.stringify(tight.map(x=>x.label+'@'+x.beat)));
 for(const need of ['Restore the Marta','Barracks tile','Bunks upgrade','Mercenary','Hangar section','Second Graf'])
  ok(r.ledger.some(x=>x.label===need&&x.ok),'the frugal run pays for: '+need);
 // 2. spendthrift
 r=await play('spend');table('Spendthrift run',r);
 ok(r.done&&!r.why,'the spendthrift run reaches the frontier '+JSON.stringify({at:r.at,why:r.why}));
 const per={};for(const g of r.grants)per[g.beat]=(per[g.beat]||0)+1;
 ok(Object.values(per).every(n=>n<=1),'the net fires at most once per beat '+JSON.stringify(per));
 ok(['Infirmary','Workshop','Storeroom'].every(k=>r.ledger.some(x=>x.label===k&&x.ok)),'the spendthrift run built an Infirmary, a Workshop and a Storeroom '+r.ledger.map(x=>x.label).join());
 // 4. after the frontier a Graf costs the full price
 r=await E(()=>{
  const f=window.DBGbase.fn,G=window.DBGbase.G,ship=f.SHIP_PRICE_();
  window.Pro.hostAct('marketLot',{cat:'ship',id:'graf',keep:true});
  const l=G.market.lots.filter(x=>x.kind==='ship'&&x.key==='graf').pop();
  return {done:window.Pro.done(),price:f.lotPrice(l),full:ship.graf};
 });
 ok(r.done&&r.price===r.full,'after the frontier a Graf lot costs SHIP_PRICE.graf '+JSON.stringify(r));
 // 3. salvage: Rescue Tachi with the prisoner truck stalled
 await E(()=>{window.Pro.jump('tachi_offer');for(let i=0;i<6;i++)window.DBGbase.fn.closeWin();});
 for(let i=0;i<30;i++){const m=await E(()=>!!window.EC.mis('rescuetachi'));if(m)break;await E(()=>window.EC.winAct()||window.DBGbase.fn.closeWin());await wait(120);}
 r=await E(()=>{
  const f=window.DBGbase.fn,m=window.EC.mis('rescuetachi');f.closeWin();f.openPlan(m);f.plAutoFill();f.renderWin();
  const go=f.plComplete()&&f.canAttempt(m);if(go)f.startPlan();return go;
 });
 ok(r,'Rescue Tachi can be planned for the salvage check');
 if(r){
  await scene('ground');
  const m0=await E(()=>window.DBGbase.G.materials);
  await E(()=>{const D=window.DBGground,v=D.U.find(u=>u.hold&&u.veh);D.fn.vehDestroyed(v,null);});
  await wait(200);
  await E(()=>document.querySelector('#sc-ground #dbgSkip').click());await wait(300);
  const sal=await E(()=>(window.DBGground.pendingResult||{}).salvHp);
  await E(()=>document.querySelector('#sc-ground #endRestartBtn').click());
  await scene('base');await wait(400);
  for(let i=0;i<6;i++){const w=await E(()=>window.DBGbase.fn.getWin());if(w==='reward'||!w)break;await E(()=>window.DBGbase.fn.closeWin());await wait(100);}
  r=await E(m0=>({win:window.DBGbase.fn.getWin(),txt:(document.querySelector('#winCardB')||{}).textContent||'',m:window.DBGbase.G.materials-m0,per:window.DBGbase.fn.SALVAGE_PER_HP_()}),m0);
  ok(r.win==='reward'&&/salvaged/i.test(r.txt)&&r.m>0,'the stalled truck pays salvage, shown as a Salvaged row '+JSON.stringify({win:r.win,m:r.m,salvHp:sal}));
 }

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'economy-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
