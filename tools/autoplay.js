/* Autoplay bot: plays Revolution Level 1 through the real game code with synthetic mission results.
   Usage: NODE_PATH=$(npm root -g) node tools/autoplay.js [seed] [policy] [maxDays]
   policies: balanced (default) | missions (rushes jobs, builds little) | builder (builds and diplomacy first) */
const {chromium}=require('playwright');
const REVW=process.env.REVW||'';
const seed=+(process.argv[2]||1),policy=process.argv[3]||'balanced',maxDays=+(process.argv[4]||260),EXTRA=+(process.env.EXTRA||0);   // EXTRA: keep playing this many days after the escalation, at Revolution Level 2 (heroes)
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(s=>{let a=s>>>0;Math.random=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};},seed);
 await pg.goto(url);await pg.waitForTimeout(1200);
 const out=await pg.evaluate(([policy,maxDays,REVW,EXTRA])=>{
  const D=window.DBGbase,G=D.G,f=D.fn,SR=window.SR;
  if(REVW)Object.assign(f.REV_W_(),JSON.parse(REVW));
  const R=()=>Math.random();
  const $q=s=>document.querySelector(s);
  const tl=[],events=[],attr={missions:0,intel:0,sources:0,diplo:0,days:0};let lastSnap=-9;
  const meas=(k,fn)=>{const r0=G.renown;fn();attr[k]+=G.renown-r0;};
  let esc=null,escDay=null,launched=0,failedLaunch=0;
  const markEsc=()=>{escDay=escDay||G.day;if(!EXTRA)esc=escDay;};   // with EXTRA the run goes on at Level 2 and esc stays open until the end
  const ev=(t)=>events.push('D'+G.day+' '+t);
  /* ---- windows ---- */
  function windows(){
   for(let i=0;i<40;i++){
    const w=f.getWin();if(!w)return;
    if(w==='escalate'||G.escPending===false&&G.revLevel===2){markEsc();if(EXTRA){f.closeWin();G.revLevel=2;G.escPending=false;}return;}
    let b;
    if(w==='candidate'){b=[...document.querySelectorAll('[data-cand]')].find(x=>x.getAttribute('data-cand')!=='no');
      if(b&&!b.disabled){b.click();continue;}
      b=$q('[data-cand="no"]');if(b){b.click();continue;}}
    else if(w==='interrogation'){b=$q('[data-intg^="contain"]')||$q('[data-intg^="wait"]')||$q('[data-close]');if(b){b.click();continue;}}
    else if(w==='recruit'){b=$q('[data-rec-accept]');if(b){b.click();continue;}b=$q('[data-rec-no]');if(b){b.click();continue;}}
    else if(w==='chain'){
      b=$q('[data-chain$=":yes"]')||$q('[data-chain$=":ok"]:not([disabled])');
      if(!b){const picks=[...document.querySelectorAll('[data-chain*=":pick:"]')];if(picks.length)b=picks[Math.floor(R()*picks.length)];}
      if(b){b.click();continue;}}
    f.closeWin();
   }
  }
  const alive=()=>G.sources.filter(s=>s.alive);
  /* ---- sources ---- */
  function sources(){
   for(const s of alive().slice()){
    if(s.pendingEvent){
     f.srcContact(s);
     const ev0=s.pendingEvent;
     const idx=ev0?ev0.opts.findIndex(o=>o[1]==='strong'):-1;
     const a=$q('[data-ans="'+Math.max(0,idx)+'"]');if(a)a.click();
     const fo=$q('[data-follow]');if(fo)fo.click();
     windows();
    } else if(s.signal||!s.contacted){
     f.srcContact(s);
     const fo=$q('[data-follow]');if(fo)fo.click();
     windows();
    }
    if(s.alive&&s.risk<35&&s.cult<100&&!s.visited&&policy!=='missions'){f.srcVisit(s);const fo=$q('[data-follow]');if(fo)fo.click();windows();}
   }
  }
  /* ---- intel: scout and raise access ---- */
  const LIB=['menk','ballakan','parity'];
  function intel(){
   const P=f.PLANETDEF_();
   for(let guard=0;guard<12;guard++){
    let did=false;
    const cand=[];
    const focus=P.find(d=>d.id==='menk');
   for(const d of P){
     if(d.base)continue;
     const st=f.pst(d.id);
     if(!st)continue;
     if(!st.access){ if(G.intel>=d.scout&&d.known!==false)cand.push({k:'scout',id:d.id,cost:d.scout,pri:LIB.includes(d.id)?0:(d.core?9:2)}); }
     else if((st.acc||0)<(d.id==='menk'?5:LIB.includes(d.id)?3:2)&&(st.acc||0)<5){
       const cost=d.sec+(st.acc||0)+1;
       if(G.intel>=cost)cand.push({k:'raise',id:d.id,cost,pri:LIB.includes(d.id)?1:3});
     }
    }
    cand.sort((a,b)=>a.pri-b.pri||a.cost-b.cost);
    // keep two intel in reserve while there is nothing urgent
    const c=cand[0];
    if(c){ if(c.k==='scout')f.scoutPlanet(c.id);else f.raiseAccess(c.id);did=true;windows(); }
    if(!did)break;
   }
  }
  /* ---- rooms ---- */
  const FLOOR=()=>{const o=[];for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++)if(G.grid[r][c].t==='floor')o.push([r,c]);return o;};
  const RUB=()=>{const o=[];for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){const g=G.grid[r][c];if(g.t==='rubble'&&!g.dig)o.push([r,c]);}return o;};
  function canPay(b){return G.credits>=b.c&&G.materials>=(b.m||0)&&G.supplies>=(b.s||0);}
  function tryBuild(key,expandOf){
   const B=f.BUILDS_()[key];if(!B||!canPay(B))return false;
   const fl=FLOOR();
   let spot=null;
   if(key==='hangar'){   // a whole 4 × 4 section on a block of cleared floor (DESIGN_BLOCKERS C-32)
     const at=fl.find(([r,c])=>f.hangarBlockAt(r,c));
     if(!at)return false;
     f.buildAt(at[0],at[1],key);return true;
   }
   if(expandOf){for(const [r,c] of fl){if(G.rooms.some(o=>o.key===key&&!o.build&&f.roomsAdj({r,c,w:1,h:1},o))){spot=[r,c];break;}}}
   if(!spot&&!expandOf&&fl.length){
     const free=fl.filter(([r,c])=>key==='comms'||!G.rooms.some(o=>o.key==='comms'&&f.roomsAdj({r,c,w:1,h:1},o)));
     spot=(free[0]||fl[0]);
   }
   if(!spot)return false;
   f.buildAt(spot[0],spot[1],key);return true;
  }
  function dig(){const rb=RUB();if(rb.length&&G.materials>=60&&FLOOR().length<2){f.digAt(rb[0][0],rb[0][1]);}}
  const have=k=>G.rooms.some(r=>r.key===k);
  function rooms(){
   const order=policy==='missions'?['comms','store','training']:policy==='builder'?['comms','store','workshop','training','infirmary','diplo','hangar','barracks']:['comms','store','training','workshop','infirmary','diplo'];
   dig();
   for(const k of order){
    if(!have(k)&&G.credits>1400){ if(tryBuild(k))return; }
   }
   if(policy!=='missions'&&G.credits>900&&f.tilesOf('comms')<(G.day<40?3:5)&&have('comms')&&tryBuild('comms',true))return;
   if(policy!=='missions'&&G.credits>2500){
    for(const k of ['store','training','workshop','infirmary','comms','diplo','hangar','barracks']){
      const tl2=G.rooms.filter(r=>r.key===k&&!r.build).reduce((a,r)=>a+r.w*r.h,0);
      if(have(k)&&tl2<(k==='hangar'?6:3)&&tryBuild(k,true))return;
    }
   }
   // expansions when constrained
   if(G.credits>1500){
    if(G.people.filter(p=>!p.auto).length>=f.bunkCap()-1&&tryBuild('barracks',true))return;
    if(G.fighters.length>=f.fighterCap()&&tryBuild('hangar',true))return;
    if(G.sources.filter(s=>s.alive).length>=f.sourceCap()&&tryBuild('comms',true))return;
   }
  }
  function upgrades(){
   if(policy==='missions'||G.credits<1500)return;
   const U=f.UPGRADES_();
   for(const rm of G.rooms){
    if(rm.build)continue;
    for(const u of (U[rm.key]||[])){
     if(u.conv)continue;
     if(f.startUpgrade(rm,u.k))return;
    }
   }
  }
  function patrol(){
   if(policy==='missions'||G.fuel<150)return;
   for(const s of G.fighters){if(!s.out&&s.cls!=='graf'&&f.startPatrol(s.id))return;}
  }
  function staff(){
   // every Support rebel works in their specialty's home room when it is built and has space (Support Specialties doc)
   for(const p of G.people){
    if(p.role!=='Support'||p.auto||p.assign!=='rest'||window.Rebel.laidUp(p))continue;
    const key=window.Support.homeOf(p);
    if(key&&have(key)&&f.postedTo(key).length<f.roomCap(key))p.assign='room:'+key;
   }
   // a Support rebel at level 3 trains the first niche that works, and forks take option A
   for(const p of G.people){
    if(p.role!=='Support'||p.auto)continue;
    if(p.level>=3&&!p.niche&&!p.nicheTrain)for(const k of window.Support.SPEC[p.sspec].niches)if(f.startNiche(p.id,k))break;
    const fd=window.Support.forkDue(p);if(fd)f.chooseFork(p.id,fd,'A');
   }
   // soldiers train when idle and a hall exists
   if(have('training')){for(const p of G.people){if(p.role==='Soldier'&&!p.auto&&p.assign==='rest'&&p.level<3&&!window.Rebel.laidUp(p))p.assign='train';}}
   for(const p of G.people){if(p.assign==='train'&&p.level>=3)p.assign='rest';}
   // specialties
   for(const p of G.people){if((p.role==='Soldier'||p.role==='Pilot')&&p.level>=3&&!p.spec&&p.assign==='rest'&&!window.Rebel.laidUp(p)&&have('training')){
     try{f.startSpec(p.id,p.role==='Soldier'?(G.people.some(q=>q.spec==='fieldtech')?'vanguard':'fieldtech'):'dogfighter');}catch(e){}}}
  }
  /* hand out promotions and fit prosthetics, like a player would */
  function promotions(){
   for(const p of G.people.slice()){
    if(p.auto||!window.Rebel.canPromote(p))continue;
    f.openWin('person',p);
    const ro=$q('[data-rank-open]');if(ro)ro.click();
    const pb=$q('[data-promote]');if(pb)pb.click();
    f.closeWin();windows();
   }
  }
  function prosthetics(){
   // a Cyberneticist with a free hand fits whoever has lost a limb
   for(const c of G.people)for(const k of f.jobsFor(c))if(/prosthetics|rapidfit/.test(k)){const t=f.JOBS_()[k].targets()[0];if(t&&f.startJob(c.id,k,t.id,null))return;}
  }
  function diplomacy(){
   if(!have('diplo'))return;
   const t=f.PLANETDEF_().filter(d=>!d.base&&d.pop&&d.pop!=='—'&&d.pop!=='0'&&f.pst(d.id).access).sort((a,b)=>(f.pst(a.id).sup||0)-(f.pst(b.id).sup||0));
   for(const d of t){if(!f.canDip(d.id)){f.startDip(d.id);return;}}
  }
  /* ---- missions ---- */
  function loot(M,m){
   const items=[];
   const sc=m.scenario||'';
   if(sc==='stealfuel')items.push('charge','charge');
   if(sc==='autofactory')items.push('charge');
   return {c:120+Math.round(R()*120),s:30+Math.round(R()*50),items};
  }
  function runMission(m){
   if(!f.canAttempt(m))return false;
   const pre=f.precondList(m);
   if(pre.some(c=>!c.ok&&!c.soft))return false;
   if(m.spec&&pre.some(c=>!c.ok))return false;
   f.openPlan(m);
   const af=$q('[data-autofill]');if(af)af.click();
   const lb=document.getElementById('launchBtn');
   if(!lb||lb.disabled){f.closeWin();failedLaunch++;return false;}
   const fuel0=G.fuel;
   lb.click();
   launched++;
   const M=SR.mission;
   if(!M){return true;}   // abstract job: resolves over the coming days
   const win=R()<0.88;
   let res;
   if(M.kind==='ground'){
    const INJ=['concussion','brokenarm','brokenleg','bleeding','internal','shrapnel','burns','eye','eardrum','facial','maimed','spinal'];
    const people=(M.squad||[]).map(s=>{
      const down=!win&&R()<0.4;
      const o={id:s.id,xp:win?0.12:0.03,state:down?'injured':'ok',dur:3,kills:Math.floor(R()*3),minHp:Math.round((down?0.05:0.3+R()*0.7)*100)/100,heavy:R()<0.1?1:0,panics:R()<0.15?1:0};
      if(down)o.down=1;
      if(R()<0.07)o.inj=[{k:INJ[Math.floor(R()*INJ.length)],treated:R()<0.7}];
      return o;
    });
    if(people.length>1&&R()<0.1){people[0].treats=1;people[0].rescued=[people[1].id];}
    if(M.grafPilot)people.push({id:M.grafPilot.id,xp:0.1,state:'ok'});
    if(M.pilot)people.push({id:M.pilot.id,xp:0.1,state:'ok'});
    const tower=M.scenario==='towers';
    res={kind:'ground',missionId:M.missionId,days:M.days,win,cross:!!(M.missionId==='stealcross'&&win),nades:M.nades||0,
      quiet:win&&R()<0.4,vipOut:win&&!!M.vip,chargeUsed:(M.charges&&!tower)?1:(tower&&M.charges&&!M.limpets?1:0),limpetUsed:(tower&&M.limpets)?1:0,
      method:tower?(M.limpets?'limpet':'charge'):null,loot:win?loot(M,m):{c:0,s:0,items:[]},people,gained:[]};
    if(M.scenario==='autofactory'&&!win)res.chargeUsed=0;
   } else {
    res={kind:'space',missionId:M.missionId,days:M.days,win,
      people:(M.flight||[]).map(x=>({id:x.pilotId,xp:win?0.1:0.04,state:win?'ok':(R()<0.15?'shotdown':'ok'),kills:Math.floor(R()*3),minHp:Math.round((0.3+R()*0.7)*100)/100,panics:R()<0.1?1:0})),
      fighters:(M.flight||[]).map(x=>({fighterId:x.fighterId,hull:60+Math.round(R()*40),destroyed:!win&&R()<0.1}))};
   }
   window.SR.endMission(res);
   windows();
   return true;
  }
  function missions(){
   for(let n=0;n<6;n++){
    const avail=G.missions.filter(m=>m.state==='avail');
    // new locations first, then story order
    const rl=m=>{const st=m.loc&&f.pst(m.loc);return st&&m.region?((st.lib&&st.lib[m.region])||0):0;};
    avail.sort((a,b)=>{const na=a.loc&&f.pst(a.loc)&&!f.pst(a.loc).ops?0:1,nb=b.loc&&f.pst(b.loc)&&!f.pst(b.loc).ops?0:1;return (na-nb)||(rl(b)-rl(a));});
    let ran=false;
    for(const m of avail){if(runMission(m)){ran=true;break;}}
    if(!ran)return;
    if(esc)return;
   }
  }
  function snap(){
   const P=f.PLANETDEF_();
   let locs=0,part=0,lib=0;
   for(const d of P){const st=f.pst(d.id);if(!st)continue;if(st.ops>0)locs++;
     if(d.regions)for(const r of d.regions){const v=(st.lib&&st.lib[r.id])||0;if(v>=100)lib++;else if(v>0)part++;}}
   return {d:G.day,ren:Math.round(G.renown*10)/10,intel:G.intel,cr:Math.round(G.credits),su:Math.round(G.supplies),mat:Math.round(G.materials),fu:Math.round(G.fuel),
     loc:locs,libFull:lib,libPart:part,src:alive().length,srcLv:alive().reduce((a,s)=>a+s.level,0),people:G.people.length,sold:G.people.filter(p=>p.role==='Soldier').length,
     ships:G.fighters.length,rooms:G.rooms.filter(r=>!r.build).reduce((a,r)=>a+r.w*r.h,0),acc:P.reduce((a,d)=>a+((f.pst(d.id)||{}).acc||0),0),
     sup:P.reduce((a,d)=>a+Math.floor((f.pst(d.id)||{}).sup||0),0),launched,roles:G.people.reduce((a,p)=>{a[p.role]=(a[p.role]||0)+1;return a;},{}),roomKeys:G.rooms.filter(r=>!r.build).map(r=>r.key+(r.w*r.h>1?'x'+r.w*r.h:'')).join(','),dipOut:(G.dip||[]).length,libDetail:['menk','ballakan','parity'].map(id=>{const st=f.pst(id);return id+' acc'+st.acc+' sup'+st.sup+' '+JSON.stringify(st.lib)+' ops'+st.ops;}).join(' | '),chains:JSON.stringify(Object.keys(G.chains||{}).map(k=>k+':'+(G.chains[k].done?'done':G.chains[k].i))),
     crew:G.people.filter(p=>!p.auto).length,heroes:G.people.filter(p=>p.role==='Hero').length,mood:Math.round(G.morale),
     ranks:G.people.filter(p=>!p.auto).map(p=>(p.off?'O':'E')+(p.rank||0)).join(' '),traits:G.people.filter(p=>!p.auto).reduce((a,p)=>a+(p.traits||[]).length,0),
     conds:G.people.filter(p=>!p.auto).reduce((a,p)=>a+(p.cond||[]).length,0),lost:G.people.filter(p=>!p.auto&&p.body&&Object.values(p.body).some(v=>v===1)).length,pros:G.people.filter(p=>!p.auto&&p.body&&Object.values(p.body).some(v=>v===2)).length,
     deserts:G.news.filter(n=>/walks out/.test(JSON.stringify(n))).length};
  }
  /* ---- main loop ---- */
  windows();
  for(let day=0;day<maxDays&&!esc;day++){
   windows();
   if(G.wreck&&!G.wreck.restored&&!G.wreck.restoring)f.startRestore();
   meas('sources',sources);
   meas('intel',intel);
   if(esc)break;
   meas('missions',missions);
   if(esc)break;
   rooms();upgrades();patrol();staff();meas('diplo',diplomacy);
   promotions();prosthetics();
   if(!G.recruit.days&&!G.recWait.length&&G.agents&&G.agents[0]&&G.credits>=1200)f.agentRecruit(G.agents[0]);   // an Agent's search for recruits, whenever the war chest allows
   if(G.day-lastSnap>=5){tl.push(snap());lastSnap=G.day;}
   if(G.escPending){f.closeWin();windows();if(G.revLevel===2||G.revNoted){markEsc();if(!EXTRA)break;}}
   meas('days',()=>f.advanceDay());
   windows();
   if(G.revNoted||G.revLevel===2){
    markEsc();
    if(!EXTRA)break;
    if(!G._xs){G._xs=G.day;G.revLevel=2;G.escPending=false;}
    if(G.day-G._xs>=EXTRA){esc=escDay;break;}
   }
  }
  const fin=snap();
  if(EXTRA&&!esc)esc=escDay;
  return {policy,esc,attr,final:fin,tl,events:events.slice(-10),launched,failedLaunch,missionsState:G.missions.reduce((a,m)=>{a[m.state]=(a[m.state]||0)+1;return a;},{}),
    stuckAvail:G.missions.filter(m=>m.state==='avail').slice(0,8).map(m=>m.id+':'+(f.precondList(m).filter(c=>!c.ok).map(c=>c.label.replace(/<[^>]+>/g,'')).join('|')))};
 },[policy,maxDays,REVW,EXTRA]);
 console.log(JSON.stringify({seed,...out},null,0));
 if(errs.length)console.log('PAGEERRORS',errs.slice(0,5).join(' || '));
 await b.close();
})();
