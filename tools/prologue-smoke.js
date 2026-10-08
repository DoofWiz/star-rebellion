/* Smoke test for the prologue runner (docs/PROLOGUE-HANDOFF.md §8): node tools/prologue-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  every beat's setup: jump to it, and its entry actions have fired (signal up, comm queued, mission on the board, gates)
   2  a full run from New Game to the frontier, the missions won with Debug: skip mission and every offer accepted:
      Halt and Vokk are never queued; Prologue sources don't count against sourceCap(); the Sources tutorial never fires
      during the prologue; nothing opens over the reward screen; a beat added at runtime fires in order; every gate is
      open at the frontier, and the first brand-new Source afterwards brings the Sources tutorial
   3  migration: a save at each old G.onboard value lands on its beat
   4  safety net: a soldier lost before Steal Fuel brings a replacement from Cass
   (P1 of the handoff: beats 1 to 11. The Agent and Recruit checks arrive with P2 to P4.) */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
let FAILS=null;
process.on('unhandledRejection',e=>{console.log('FAIL (threw)\n'+(FAILS||[]).join('\n')+'\n'+e.message.split('\n')[0]);process.exit(1);});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.emulateMedia({reducedMotion:'reduce'});   // the arrival card and the splash go quickly
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};FAILS=fails;
 const E=(f,a)=>pg.evaluate(f,a);
 const wait=ms=>pg.waitForTimeout(ms);
 const scene=async s=>{await pg.waitForFunction(x=>window.SR.active===x,s,{timeout:15000});await wait(500);};

 // in-page helpers: the beat, the queue, an open window
 await E(()=>{
  const D=window.DBGbase;
  window.T={
   D,f:D.fn,get G(){return D.G;},
   win:()=>D.fn.getWin(),
   q:()=>(D.G.prologue.q||[]).map(a=>a.comm?'comm:'+a.comm.who:a.recruit?'recruit:'+a.recruit.role:a.win?'win:'+a.win:'?'),
   src:id=>D.G.sources.find(s=>s.id===id),
   mis:id=>D.G.missions.find(m=>m.id===id||m.story===id),
   vis:id=>!document.querySelector('#sc-base #'+id).hidden,
   // every window that opens, and every 'closed' the runner hears: a window opening over the reward is caught here
   seen:[],events:[],over:[],
  };
  const emit0=window.Pro.emit;
  window.Pro.emit=function(type,arg){T.events.push(type+':'+(arg&&typeof arg==='object'?arg.id||arg.kind||arg.role:arg));return emit0.apply(this,arguments);};
  let last=null,closedSince=true;
  setInterval(()=>{
   const w=D.fn.getWin();
   if(w!==last){
    if(last==='reward'&&w&&!T.events.slice(-30).includes('closed:reward'))T.over.push(w);
    if(w)T.seen.push(w);
    last=w;
   }
  },20);
 });

 // ---------------- 1. every beat's setup ----------------
 const EXPECT={
  rock:     T=>[T.G.introDone===false,window.Pro.live()],
  cass_intro:T=>[T.src('cass')&&T.src('cass').prologue===true,!document.querySelector('#estSplash').hidden,T.q().includes('win:cassIntro')],
  cass_contact:T=>[window.Pro.gate('tab.galaxy'),!window.Pro.gate('tab.missions'),T.G.prologue.tut&&T.G.prologue.tut.key==='raiseCass'],
  cross_offer:T=>[window.Pro.gate('tab.missions'),T.src('cass').signal&&T.src('cass').signal.mid==='stealcross'],
  sera:     T=>[!window.Pro.live(),!!T.mis('stealcross'),!T.src('cass').signal],
  cross:    T=>[T.G.people.some(p=>p.id==='sera'),T.G.fighters.some(f=>f.cls==='graf'),T.mis('stealcross').state==='avail'],
  venn_arrives:T=>[T.src('venn')&&T.src('venn').prologue===true,T.src('venn').signal&&T.src('venn').signal.mid==='depotrun',T.G.fighters.some(f=>f.cls==='cross')],
  depots:   T=>[T.mis('depotrun')&&T.mis('depotrun').state==='avail',T.mis('depotrun').name==='Torch the Depots'],
  fuel_offer:T=>[!window.Pro.live(),T.mis('depotrun').state==='done',!T.src('cass').signal],
  fuel_recruit:T=>[T.mis('stealfuel')&&T.mis('stealfuel').req.team===4,T.q().join()==='comm:venn,recruit:Soldier'||(T.win()==='comm'&&T.q().join()==='recruit:Soldier')],
  fuel_plan:T=>[window.Pro.gate('plan.assets'),T.G.prologue.tut&&T.G.prologue.tut.key==='strafingRun',T.G.people.filter(p=>p.role==='Soldier').length===4],
  frontier: T=>[window.Pro.done(),window.Pro.GATES.every(g=>window.Pro.gate(g))],
 };
 const ids=await E(()=>window.Pro.PROLOGUE.map(b=>b.id));
 ok(JSON.stringify(ids)===JSON.stringify(Object.keys(EXPECT)),'the P1 beats in order: '+ids.join());
 for(const id of ids){
  await E(id=>{window.Pro.jump(id);},id);
  await wait(120);
  const r=await E(([id,src])=>{const f=eval('('+src+')');return {at:window.Pro.beat(),c:f(window.T)};},[id,EXPECT[id]?EXPECT[id].toString():'T=>[]']);
  ok(r.at===id&&r.c.every(Boolean),'jump to '+id+': at '+r.at+', entry checks '+r.c.join());
 }
 // the two beats that wait on a day begin on the next one
 for(const [id,chk] of [['sera',T=>T.src('cass').signal&&T.src('cass').signal.kind==='recruitSera'&&/on the wire/.test(T.G.news[T.G.news.length-1].html+T.G.news.map(n=>n.html).join())],
                        ['fuel_offer',T=>T.src('cass').signal&&T.src('cass').signal.mid==='stealfuel'&&T.src('cass').signal.spec.req.team===4]]){
  const r=await E(([id,src])=>{window.Pro.jump(id);T.f.closeWin();T.f.advanceDay();T.f.closeWin();return {live:window.Pro.live(),c:eval('('+src+')')(window.T)};},[id,chk.toString()]);
  ok(r.live&&r.c,id+' begins the next day with its signal: '+[r.live,r.c]);
 }

 // ---------------- 2. a full run, New Game to the frontier ----------------
 // the pieces of a mission: plan it, fly it, Debug: skip mission, back to the base, read the report
 const runMission=async(id,ground,extra)=>{
  await E(([id,extra])=>{
   const m=T.mis(id);T.f.closeWin();T.f.openPlan(m);T.f.plAutoFill();
   if(extra)eval('('+extra+')')(T);
   T.f.renderWin();
   window.__plan=[T.f.plComplete(),T.f.canAttempt(m)];
   T.f.startPlan();
  },[id,extra?extra.toString():null]);
  const pl=await E(()=>window.__plan);
  ok(pl.every(Boolean),id+': the plan is complete and attemptable '+pl);
  await scene(ground?'ground':'space');
  const sc=ground?'#sc-ground':'#sc-space';
  await E(sc=>document.querySelector(sc+' #dbgSkip').click(),sc);
  await wait(400);
  await E(sc=>document.querySelector(sc+' #endRestartBtn').click(),sc);
  await scene('base');
  await wait(600);   // the arrival card goes by on its own
 };
 const closeUntilEmpty=async()=>{for(let i=0;i<8;i++){const w=await E(()=>T.win());if(!w)break;await E(()=>T.f.closeWin());await wait(80);}};

 await E(()=>{window.Pro.jump('rock');T.f.launchIntro();});
 await scene('ground');
 await E(()=>document.querySelector('#sc-ground #dbgSkip').click());
 await wait(300);
 await E(()=>document.querySelector('#sc-ground #endRestartBtn').click());
 await scene('base');
 let r=await E(()=>({at:window.Pro.beat(),splash:!document.querySelector('#estSplash').hidden,win:T.win(),q:T.q(),gal:T.vis('navSources')}));
 ok(r.at==='cass_intro'&&r.splash&&!r.win&&r.q.join()==='win:cassIntro'&&!r.gal,'Take the Rock won: the splash is up, Cass waits behind it, the Galaxy is hidden '+JSON.stringify(r));
 await E(()=>document.querySelector('#estSplash').click());
 await wait(400);
 r=await E(()=>T.win());
 ok(r==='cassIntro','the splash closes into Cass’s transmission, got '+r);
 await E(()=>T.f.closeWin());
 await pg.waitForFunction(()=>!document.querySelector('#tutPtr').hidden,null,{timeout:3000}).catch(()=>{});   // the pointer is drawn on the next frame
 r=await E(()=>({at:window.Pro.beat(),gal:T.vis('navSources'),isNew:!!document.querySelector('#navSources .pro-newtag'),mis:T.vis('navMissions'),
   intel:T.vis('navIntel'),mkt:T.vis('navMarket'),ars:T.vis('navArsenal'),ptr:document.querySelector('#tutPtr .sr-pointer__label').textContent,ptrUp:!document.querySelector('#tutPtr').hidden,
   badge:document.querySelector('#srcBadge').textContent}));
 ok(r.at==='cass_contact'&&r.gal&&r.isNew&&!r.mis&&!r.intel&&!r.mkt&&r.ars,'cass_contact: the Galaxy tab appears with its New tag; Missions, Intelligence and the Black Market stay hidden; the Arsenal is open '+JSON.stringify(r));
 ok(r.ptrUp&&r.ptr==='Open the Galaxy'&&r.badge==='1','the pointer says Open the Galaxy and the Galaxy badge counts Cass '+[r.ptrUp,r.ptr,r.badge]);
 // the guided steps: open the Galaxy, select Cass, Contact
 await E(()=>document.querySelector('#sc-base #navSources').click());
 await wait(900);
 r=await E(()=>({ptr:document.querySelector('#tutPtr .sr-pointer__label').textContent,up:!document.querySelector('#tutPtr').hidden,isNew:!!document.querySelector('#navSources .pro-newtag')}));
 ok(r.up&&r.ptr==='Select Cass Wender'&&!r.isNew,'in the Galaxy the pointer moves to Cass, the New tag is gone '+JSON.stringify(r));
 await E(()=>{const hit=T.f.gxHitL_().find(h=>h.t==='s'&&h.id==='cass');const cv=document.querySelector('#sc-base #cv'),rc=cv.getBoundingClientRect();
   cv.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rc.left+hit.x,clientY:rc.top+hit.y}));});
 await wait(300);
 r=await E(()=>({ptr:document.querySelector('#tutPtr .sr-pointer__label').textContent,up:!document.querySelector('#tutPtr').hidden}));
 ok(r.up&&r.ptr==='Contact','Cass selected: the pointer moves to Contact '+JSON.stringify(r));
 await E(()=>document.querySelector('#gxOrders [data-gxo="contact"]').click());
 await wait(200);
 r=await E(()=>({at:window.Pro.beat(),win:T.win(),sig:(T.src('cass').signal||{}).mid,tut:T.G.prologue.tut,done:T.G.prologue.flags.tut.raiseCass,mis:T.vis('navMissions'),
   txt:document.querySelector('#winCardB').textContent}));
 ok(r.at==='cross_offer'&&r.win==='comm'&&r.sig==='stealcross'&&/has-been FT-4 Cross/.test(r.txt),'Contact: Cass’s Steal the Cross signal is in the burst '+[r.at,r.win,r.sig]);
 ok(!r.tut&&r.done===1&&r.mis,'the pointer chain is done and the Missions tab is open '+[JSON.stringify(r.tut),r.done,r.mis]);
 await E(()=>document.querySelector('#winCardB [data-follow]').click());
 r=await E(()=>({at:window.Pro.beat(),live:window.Pro.live(),on:!!T.mis('stealcross'),txt:document.querySelector('#winCardB').textContent}));
 ok(r.at==='sera'&&!r.live&&r.on&&/advance a day to see what he has found/.test(r.txt),'Acknowledge: Steal the Cross on the board, Sera waits for the next day '+[r.at,r.live,r.on]);
 await closeUntilEmpty();
 await E(()=>{T.G.credits+=400;T.G.materials+=300;T.f.startRestore();T.f.advanceDay();});
 await closeUntilEmpty();
 r=await E(()=>({live:window.Pro.live(),sig:(T.src('cass').signal||{}).kind}));
 ok(r.live&&r.sig==='recruitSera','the next day Cass has found Sera '+JSON.stringify(r));
 await E(()=>{T.f.advanceDay();});await closeUntilEmpty();
 await E(()=>T.f.srcContact(T.src('cass')));
 await E(()=>document.querySelector('#winCardB [data-follow]').click());
 r=await E(()=>({win:T.win(),must:document.querySelectorAll('#winCardB [data-rec-no]').length}));
 ok(r.win==='recruit','Acknowledge brings Sera’s recruit pop-up, got '+r.win);
 await E(()=>document.querySelector('#winCardB [data-rec-accept]').click());
 await closeUntilEmpty();
 r=await E(()=>({at:window.Pro.beat(),sera:T.G.people.some(p=>p.id==='sera'),marta:T.G.fighters.some(f=>f.cls==='graf')}));
 ok(r.at==='cross'&&r.sera&&r.marta,'Sera joins and the Marta flies: on to Steal the Cross '+JSON.stringify(r));
 await runMission('stealcross',true);
 r=await E(()=>({at:window.Pro.beat(),venn:T.src('venn')&&T.src('venn').prologue,sig:(T.src('venn')||{}).signal&&T.src('venn').signal.mid,
   alive:T.G.sources.filter(s=>s.alive).length,used:T.f.capUsed(),cap:T.f.sourceCap()}));
 ok(r.at==='venn_arrives'&&r.venn&&r.sig==='depotrun','Steal the Cross won: Venn arrives as a Prologue source with the depots job '+JSON.stringify(r));
 ok(r.alive===2&&r.used===0,'Prologue sources don’t count against sourceCap(): '+r.alive+' alive, '+r.used+' of '+r.cap+' used');
 await closeUntilEmpty();
 await E(()=>T.f.srcContact(T.src('venn')));
 await E(()=>document.querySelector('#winCardB [data-follow]').click());
 await closeUntilEmpty();
 r=await E(()=>({at:window.Pro.beat(),name:T.mis('depotrun').name}));
 ok(r.at==='depots'&&r.name==='Torch the Depots','the depots job is on the board as Torch the Depots '+JSON.stringify(r));
 await runMission('depotrun',false);
 await closeUntilEmpty();
 r=await E(()=>({at:window.Pro.beat(),live:window.Pro.live(),cand:T.G.candQ.slice(),standby:(T.G.standby||[]).slice()}));
 ok(r.at==='fuel_offer'&&!r.live,'Torch the Depots won: Steal Fuel waits for the next day '+JSON.stringify(r));
 ok(!r.cand.includes('halt')&&!r.cand.includes('vokk'),'Halt and Vokk are not queued '+r.cand);
 await E(()=>{T.f.advanceDay();});await closeUntilEmpty();
 await wait(1000);   // a beat's window never opens over the day banner: let it clear
 await E(()=>T.f.srcContact(T.src('cass')));
 r=await E(()=>({sig:(T.src('cass').signal||{}).mid,txt:document.querySelector('#winCardB').textContent}));
 ok(r.sig==='stealfuel'&&/Redrock Flats/.test(r.txt),'the next day Cass has the fuel job '+r.sig);
 await E(()=>document.querySelector('#winCardB [data-follow]').click());
 r=await E(()=>({at:window.Pro.beat(),team:(T.mis('stealfuel').req||{}).team,q:T.q()}));
 ok(r.at==='fuel_recruit'&&r.team===4&&r.q.join()==='comm:venn,recruit:Soldier','Steal Fuel takes four soldiers; Venn’s comm and a recruit wait their turn '+JSON.stringify(r));
 await E(()=>T.f.closeWin());
 r=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent}));
 ok(r.win==='comm'&&/Hope you’re still kickin’/.test(r.txt)&&/Maro Venn/.test(r.txt),'closing the burst opens Venn’s comm '+r.win);
 await E(()=>T.f.closeWin());
 r=await E(()=>({win:T.win(),cards:document.querySelectorAll('#winCardB [data-rec-accept]').length,no:document.querySelectorAll('#winCardB [data-rec-no]').length,
   txt:document.querySelector('#winCardB').textContent}));
 ok(r.win==='recruit'&&/Maro vouches for them/.test(r.txt)&&/Soldier/.test(r.txt),'then one Soldier, vouched for by Venn '+JSON.stringify({win:r.win,cards:r.cards}));
 await E(()=>document.querySelector('#winCardB [data-rec-accept]').click());
 await closeUntilEmpty();
 r=await E(()=>({at:window.Pro.beat(),gate:window.Pro.gate('plan.assets'),soldiers:T.G.people.filter(p=>p.role==='Soldier').length}));
 ok(r.at==='fuel_plan'&&r.gate&&r.soldiers===4,'the recruit joins: the plan’s fire support slots open '+JSON.stringify(r));
 // the Strafing Run callout: on the empty fire support slot when the plan opens, done when the Cross is assigned
 await E(()=>{T.f.openPlan(T.mis('stealfuel'));});
 await wait(150);
 r=await E(()=>({add:!!document.querySelector('#winCardB [data-slot="addasset"]'),co:!document.querySelector('#tutCoach').hidden,
   txt:document.querySelector('#tutCoach').textContent,step:(window.Pro.step()||{}).text}));
 ok(r.add&&r.co&&/Strafing Run/.test(r.txt)&&r.step==='strafingRun','the plan opens with the Strafing Run callout on the fire support slot '+JSON.stringify(r));
 // a beat added at runtime fires in order: here a comm from Cass straight after Steal Fuel's report
 await E(()=>window.Pro.addBeat({id:'smoke_after',does:[{comm:{who:'cass',text:'fuelNews'}}],until:{closed:'comm'}},'frontier'));
 await runMission('stealfuel',true,T=>{
  T.f.plAddAsset();
  const cross=T.G.fighters.find(f=>f.cls==='cross');
  const used=new Set(Object.values(T.f.getPL().v));
  const pilot=T.G.people.find(p=>p.role==='Pilot'&&!used.has(p.id));
  T.f.plSet('as0s','f:'+cross.id);T.f.plSet('as0p','p:'+pilot.id);
  window.__strafe=[T.G.prologue.flags.tut.strafingRun,!T.G.prologue.tut,T.f.plAssetMode(0)];
 });
 r=await E(()=>window.__strafe);
 ok(r[0]===1&&r[1]&&r[2]==='strafe','assigning the Cross ends the callout and gives a Strafing Run '+r);
 r=await E(()=>({win:T.win(),q:T.q(),at:window.Pro.beat()}));
 ok(r.win==='reward'&&r.at==='smoke_after'&&r.q.join()==='comm:cass','the report comes first; the runtime beat’s comm waits behind it '+JSON.stringify(r)+' '+(await E(()=>T.seen.slice(-6).join())));
 await E(()=>T.f.closeWin());
 // Cass's own follow-up to the job comes first (the source's report line), then the runtime beat's comm
 for(let i=0;i<4;i++){const w=await E(()=>T.win()==='comm'&&/fuel job/.test(document.querySelector('#winCardB').textContent));if(w)break;await E(()=>T.f.closeWin());}
 r=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent}));
 ok(r.win==='comm'&&/fuel job/.test(r.txt),'after the reward, the runtime beat’s comm opens '+r.win);
 await E(()=>T.f.closeWin());
 await wait(200);
 r=await E(()=>({done:window.Pro.done(),gates:window.Pro.GATES.filter(g=>!window.Pro.gate(g)),tabs:['navSources','navMissions','navIntel','navMarket','navArsenal'].filter(id=>!T.vis(id)),
   toast:document.querySelector('#flashB').textContent,over:T.over.slice(),tut:T.seen.includes('srcTutIntro')}));
 ok(r.done&&!r.gates.length&&!r.tabs.length,'the frontier: the prologue is done and every gate and tab is open '+JSON.stringify(r));
 ok(/End of the authored prologue: beat smoke_after/.test(r.toast),'the debug build says where the authored prologue ends: '+r.toast);
 ok(!r.over.length,'nothing opened over the reward screen: '+r.over);
 ok(!r.tut,'the Sources tutorial never fired during the prologue');
 await E(()=>window.Pro.PROLOGUE.splice(window.Pro.index('smoke_after'),1));
 // after the frontier the first brand-new Source brings the Sources tutorial, with the Agents version of Making Contact
 // (Cass and Venn count against the cap now the prologue is over: Venn steps aside to make room)
 await E(()=>{T.f.closeWin();T.src('venn').alive=false;T.f.acceptCandidate('tess');});
 await wait(200);
 r=await E(()=>({win:T.win(),seen:window.Pro.tutSeen('sources')}));
 ok(r.win==='srcTutIntro'&&r.seen,'the first new Source after the frontier opens Build Your Network '+JSON.stringify(r));
 r=await E(()=>{T.f.openWin('srcTut',{page:4});return document.querySelector('#winCardB').textContent;});
 ok(/Making Contact/.test(r)&&/Your Agent meets the Source in person/.test(r),'the field manual’s Making Contact page is the Agents version');
 await E(()=>T.f.closeWin());

 // ---------------- 3. migration: each old G.onboard value lands on its beat ----------------
 const OLD=[
  ['intro',{intro:false},'rock',true,false],
  ['contact',{},'cass_contact',true,false],
  ['revealed',{},'cross_offer',true,false],
  ['pilotwait',{missions:['stealcross']},'sera',false,false],
  ['seraoffered',{missions:['stealcross']},'sera',true,false],
  ['crossready',{missions:['stealcross']},'cross',true,false],
  ['friend',{missions:['stealcross']},'venn_arrives',true,false],
  ['done',{missions:['stealcross','depotrun']},'depots',true,false],
  ['done',{},'frontier',true,true],                                   // from before saves had versions
  ['done',{postDepot:true,missions:['stealcross','depotrun'],cand:['halt','vokk']},'fuel_offer',true,false],
  ['done',{postDepot:true,missions:['stealcross','depotrun','stealfuel'],cand:['halt','vokk']},'frontier',true,true],
 ];
 for(const [o,x,at,live,done] of OLD){
  r=await E(([o,x])=>{
   const g=T.f.newGame();delete g.prologue;g.v=11;g.onboard=o;g.introDone=x.intro!==false;
   if(x.postDepot)g.postDepot=true;
   g.candQ=(x.cand||[]).slice();g.srcTutSeen=1;
   T.D.G=g;
   for(const id of x.missions||[])T.f.addMission(id,true);
   T.G.sources.push({id:'cass',name:'Cass Wender',alive:true,inc:{},level:1,cult:20,risk:20});
   T.f.upgradeSave();
   const P=T.G.prologue;
   return {at:P.at,live:P.live,done:P.done,all:!!P.gates['*'],gone:T.G.onboard===undefined&&T.G.postDepot===undefined,cass:T.src('cass').prologue,
     cand:T.G.candQ.join(),tut:P.flags.tut.sources,v:T.G.v===T.f.saveVersion()};
  },[o,x]);
  ok(r.at===at&&r.live===live&&r.done===done&&r.all&&r.gone&&r.cass&&r.tut===1&&r.v&&r.cand===(x.cand||[]).join(),
   'migration '+o+(x.postDepot?' (past the depots)':'')+' -> '+at+': '+JSON.stringify(r));
 }

 // ---------------- 4. safety net: a soldier lost before Steal Fuel ----------------
 r=await E(()=>{
  window.Pro.jump('fuel_plan');T.f.closeWin();
  const lost=T.G.people.find(p=>p.id==='dax');T.G.people=T.G.people.filter(p=>p!==lost);
  T.f.advanceDay();const day1=T.q().concat(T.win()==='recruit'?['open']:[]);
  T.f.closeWin();T.f.advanceDay();
  return {day1,day2:T.q(),win:T.win(),txt:document.querySelector('#winCardB').textContent,days:window.Pro.SHORT_DAYS};
 });
 await wait(100);
 const r2=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent}));
 ok(!r.day1.length,'one day short: nothing yet '+r.day1);
 ok((r2.win==='recruit'&&/Cass vouches for them/.test(r2.txt)&&/Soldier/.test(r2.txt))||r.day2.includes('recruit:Soldier'),
  r.days+' days short a soldier: Cass sends a replacement '+JSON.stringify([r.day2,r2.win]));

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'prologue-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
