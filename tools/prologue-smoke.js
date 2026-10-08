/* Smoke test for the prologue runner (docs/PROLOGUE-HANDOFF.md §8): node tools/prologue-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  every beat's setup: jump to it, and its entry actions have fired (signal up, comm queued, mission on the board, gates)
   2  a full run from New Game to the frontier, the missions won with Debug: skip mission and every offer accepted:
      Halt and Vokk are never queued; no Agent until Tachi joins, posted to Akkaro with Cass and Venn in her cell;
      Prologue sources don't count against sourceCap(); the Sources tutorial never fires
      during the prologue; nothing opens over the reward screen; a beat added at runtime fires in order; every gate is
      open at the frontier, and the first brand-new Source afterwards brings the Sources tutorial
   3  migration: a save at each old G.onboard value lands on its beat
   4  safety net: a soldier lost before Steal Fuel brings a replacement from Cass
   5  Recruit returns Rebels only during the prologue, even where a potential Source is waiting
   6  the Recruit after beat 19 returns exactly three Pilots, also when beat 14's Recruit is still running
   7  Raid the Bunker: the plan's tutorial, the second hauler as Reinforcements, and the win reaching the frontier
   (P1 to P5 of the handoff: beats 1 to 24.) */
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
   q:()=>(D.G.prologue.q||[]).map(a=>a.comm?'comm:'+a.comm.who:a.recruit?'recruit:'+a.recruit.role:a.win?'win:'+a.win:a.act?'act:'+Object.keys(a.act)[0]:'?'),
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
  tachi_offer:T=>[T.G.agents.length===0,T.q().join()==='comm:venn,act:mission'||(T.win()==='comm'&&T.q().join()==='act:mission'),T.mis('stealfuel').state==='done',!T.mis('rescuetachi')],
  tachi_joins:T=>[T.mis('rescuetachi').state==='done',T.q().join()==='comm:tachi'||T.win()==='comm',T.G.agents.length===0],
  agents:   T=>[T.G.agents.length===1&&T.G.agents[0].name==='Tachi Gard'&&T.G.agents[0].postedTo==='akkaro',window.Pro.gate('tab.intel'),
              T.G.sources.every(s=>s.agent===T.G.agents[0].id),T.G.prologue.tut&&T.G.prologue.tut.key==='runNetwork',!window.Pro.gate('op.recruit')],
  tense:    T=>[!window.Pro.live(),T.G.agents.length===1,T.G.prologue.flags.tut.runNetwork===1,window.Pro.gate('op.recruit'),!window.Pro.gate('op.lielow')],
  first_lead:T=>[T.G.bureauLeads.some(l=>l.target.id==='venn'),T.G.exposure>0,T.G.prologue.tut&&T.G.prologue.tut.key==='askingQuestions',!window.Pro.gate('op.lielow')],
  lielow_wait:T=>[window.Pro.live(),window.Pro.gate('op.lielow'),T.G.agents[0].lielow>0,T.G.bureauLeads.length===1],
  bunker_offer:T=>[window.Pro.live(),T.q().join()==='comm:cass,act:mission'||(T.win()==='comm'&&T.q().join()==='act:mission'),!T.mis('raidbunker')],
  tachi_recruit:T=>[!window.Pro.live(),T.mis('raidbunker')&&T.mis('raidbunker').ships.length===3,!T.G.prologue.flags.recruitAs],
  market:   T=>[T.G.people.filter(p=>p.role==='Pilot').length===5,!window.Pro.gate('tab.market')||T.q().includes('act:gate')||T.win()==='comm'],
  sweet_tooth:T=>[window.Pro.gate('tab.market'),T.G.market.lots.some(l=>l.keep&&l.kind==='merc')],
  hauler:   T=>[T.G.market.lots.some(l=>l.keep&&l.kind==='ship'&&l.key==='graf'),T.G.prologue.tut&&T.G.prologue.tut.key==='hauler'],
  bunker:   T=>[T.mis('raidbunker').state==='avail',T.G.fighters.filter(f=>f.cls==='graf').length===2,T.G.prologue.tut&&T.G.prologue.tut.key==='bunkerPlan',window.Pro.gate('plan.assets')],
  frontier: T=>[window.Pro.done(),window.Pro.GATES.every(g=>window.Pro.gate(g)),T.G.agents.length===1],
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
                        ['fuel_offer',T=>T.src('cass').signal&&T.src('cass').signal.mid==='stealfuel'&&T.src('cass').signal.spec.req.team===4],
                        ['tense',T=>T.q().join()==='comm:tachi,comm:venn'],
                        ['tachi_recruit',T=>T.q().join()==='comm:tachi,act:tutorial'&&T.G.prologue.flags.recruitAs.n===3]]){
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
 await E(()=>document.querySelector('#gxDock [data-gxo="contact"]').click());
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
 // Steal Fuel won (P2): the report first; Venn's comm waits behind it, and Rescue Tachi waits behind the comm
 r=await E(()=>({win:T.win(),q:T.q(),at:window.Pro.beat(),on:!!T.mis('rescuetachi'),agents:T.G.agents.length}));
 ok(r.win==='reward'&&r.at==='tachi_offer'&&r.q.join()==='comm:venn,act:mission'&&!r.on,'the report comes first; Venn’s comm and then the mission wait behind it '+JSON.stringify(r));
 ok(r.agents===0,'no Agent before Tachi joins');
 await E(()=>T.f.closeWin());
 for(let i=0;i<4;i++){const w=await E(()=>T.win()==='comm'&&/Tachi Gard/.test(document.querySelector('#winCardB').textContent));if(w)break;await E(()=>T.f.closeWin());}
 r=await E(()=>({win:T.win(),on:!!T.mis('rescuetachi'),txt:document.querySelector('#winCardB').textContent}));
 ok(r.win==='comm'&&/Maro Venn/.test(r.txt)&&/Please, rescue her/.test(r.txt)&&!r.on,'after the reward, Venn asks for Tachi; the job is not on the board yet '+r.win);
 await E(()=>T.f.closeWin());
 r=await E(()=>({win:T.win(),m:T.mis('rescuetachi')&&T.mis('rescuetachi').name}));
 ok(r.m==='Rescue Tachi'&&r.win==='newmission','closing the comm puts Rescue Tachi on the board '+JSON.stringify(r));
 await closeUntilEmpty();
 await runMission('rescuetachi',true);
 r=await E(()=>({win:T.win(),q:T.q(),at:window.Pro.beat(),people:T.G.people.some(p=>/Tachi/.test(p.name))}));
 ok(r.win==='reward'&&r.at==='tachi_joins'&&r.q.join()==='comm:tachi'&&!r.people,'Rescue Tachi won: the report, then Tachi’s comm; she is not a recruit '+JSON.stringify(r));
 await E(()=>T.f.closeWin());
 r=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent,acc:!!document.querySelector('#winCardB [data-proaccept]')}));
 ok(r.win==='comm'&&/Tachi Gard/.test(r.txt)&&/all over Akkaro/.test(r.txt)&&!/Source · Level/.test(r.txt)&&r.acc,'Tachi’s comm: [location name] reads Akkaro, no Source level, and an Accept '+r.win);
 await E(()=>document.querySelector('#winCardB [data-proaccept]').click());
 await wait(150);
 r=await E(()=>{const a=T.G.agents[0]||{};return {at:window.Pro.beat(),n:T.G.agents.length,name:a.name,post:a.postedTo,cell:T.G.sources.filter(s=>s.agent===a.id).map(s=>s.id).sort().join(),
   intel:T.vis('navIntel'),isNew:!!document.querySelector('#navIntel .pro-newtag'),win:T.win()};});
 ok(r.at==='agents'&&r.n===1&&r.name==='Tachi Gard'&&r.post==='akkaro'&&r.cell==='cass,venn','accepted: Tachi is the first Agent, posted to Akkaro with Cass and Venn in her cell '+JSON.stringify(r));
 ok(r.intel&&r.isNew&&r.win==='agentTutIntro','the Intelligence tab opens with its New tag, and Run Your Network’s intro window '+JSON.stringify(r));
 // a beat added at runtime fires in order: here a comm from Cass once Run Your Network is done
 await E(()=>window.Pro.addBeat({id:'smoke_after',does:[{comm:{who:'cass',text:'fuelNews'}}],until:{closed:'comm'}},'frontier'));
 // Run Your Network: Got it, then the five guided steps
 await E(()=>document.querySelector('#winCardB [data-agenttut-done]').click());
 const coach=()=>E(()=>({t:(document.querySelector('#tutCoach .sr-coach__title')||{}).textContent||'',up:!document.querySelector('#tutCoach').hidden,
   rec:!!document.querySelector('#railIntel [data-op^="recruit:"]'),lielow:!!document.querySelector('#railIntel [data-op^="lielow:"]')}));
 await wait(200);r=await coach();
 ok(r.up&&r.t==='Your network','step 1 points at the Intelligence tab '+JSON.stringify(r));
 await E(()=>document.querySelector('#sc-base #navIntel').click());await wait(250);r=await coach();
 ok(r.up&&r.t==='Meet your Agent','step 2 points at Tachi '+JSON.stringify(r));
 await E(()=>document.querySelector('#inView [data-insel^="agent:"]').click());await wait(250);r=await coach();
 ok(r.up&&r.t==='Read her file'&&!r.rec,'step 3 reads her file; Recruit is still hidden '+JSON.stringify(r));
 await E(()=>document.querySelector('#tutCoach [data-pronext]').click());await wait(250);r=await coach();
 ok(r.up&&r.t==='Her cell','step 4: her cell '+JSON.stringify(r));
 await E(()=>document.querySelector('#tutCoach [data-pronext]').click());await wait(250);r=await coach();
 ok(r.up&&r.t==='Put her to work'&&r.rec&&!r.lielow,'step 5 opens Recruit (Lie Low stays hidden) '+JSON.stringify(r));
 await E(()=>document.querySelector('#railIntel [data-op^="recruit:"]').click());await wait(250);
 r=await E(()=>({at:window.Pro.beat(),days:T.G.recruit.days,tut:T.G.prologue.flags.tut.runNetwork,win:T.win(),txt:document.querySelector('#winCardB').textContent}));
 ok(r.days>0&&r.tut===1,'starting the Recruit ends Run Your Network '+JSON.stringify({days:r.days,tut:r.tut}));
 ok(r.at==='tense'&&!r.win,'and the tense day waits for the next morning '+JSON.stringify({at:r.at,win:r.win}));
 // P3: the next day, Tachi's comm and then Venn's
 await E(()=>{T.f.advanceDay();});
 await pg.waitForFunction(()=>T.win()==='comm',null,{timeout:5000}).catch(()=>{});
 r=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent,q:T.q()}));
 ok(r.win==='comm'&&/Hey boss/.test(r.txt)&&r.q.join()==='comm:venn','the next day: Tachi checks in, Venn waits his turn '+JSON.stringify({win:r.win,q:r.q}));
 await E(()=>T.f.closeWin());
 r=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent,exp:T.G.exposure,leads:T.G.bureauLeads.length}));
 ok(r.win==='comm'&&/offworlders/.test(r.txt)&&r.leads===0,'then Venn’s comm; no Lead yet '+r.win);
 const exp0=r.exp;
 await E(()=>T.f.closeWin());
 await wait(300);
 r=await E(()=>({at:window.Pro.beat(),lead:T.G.bureauLeads.map(l=>l.target.kind+':'+l.target.id).join(),exp:T.G.exposure,intel:!document.querySelector('#inView').hidden,
   badge:!!document.querySelector('#inView [data-insel="src:venn"] .in-badge'),lielow:!!document.querySelector('#railIntel [data-op^="lielow:"]')}));
 ok(r.at==='first_lead'&&r.lead==='source:venn'&&r.exp>exp0,'the first Lead, on Venn, raises Exposure '+JSON.stringify(r));
 ok(r.intel&&r.badge&&!r.lielow,'the Intelligence tab opens with the Lead badge on Venn; Lie Low still hidden '+JSON.stringify(r));
 await wait(200);r=await coach();
 ok(r.up&&r.t==='A Lead','Someone’s Asking Questions, step 1: the Lead on Venn '+JSON.stringify(r));
 await E(()=>document.querySelector('#inView [data-insel="src:venn"]').click());await wait(250);
 r=await coach();const leadRow=await E(()=>/holds a Lead on them/.test(document.querySelector('#railIntel').textContent));
 ok(r.up&&r.t==='Exposure'&&leadRow,'selecting Venn: his rail shows the Lead; step 2 points at Exposure '+JSON.stringify(r));
 await E(()=>document.querySelector('#inView .in-exp').click());await wait(250);
 r=await E(()=>({step:(window.Pro.step()||{}).text,up:!document.querySelector('#tutCoach').hidden,txt:document.querySelector('#tutCoach').textContent,lielow:!!document.querySelector('#railIntel [data-op^="lielow:"]')}));
 ok(r.step==='lieLowStep'&&r.up&&/TEXT NEEDED/.test(r.txt),'opening Exposure: the Lie Low step (its words still to write) points at Tachi '+JSON.stringify({step:r.step,up:r.up}));
 await E(()=>document.querySelector('#inView [data-insel^="agent:"]').click());await wait(250);
 r=await E(()=>({lielow:!!document.querySelector('#railIntel [data-op^="lielow:"]'),up:!document.querySelector('#tutCoach').hidden}));
 ok(r.lielow&&r.up,'on Tachi’s rail Lie Low is open and the step points at it '+JSON.stringify(r));
 await E(()=>document.querySelector('#railIntel [data-op^="lielow:"]').click());await wait(200);
 r=await E(()=>({at:window.Pro.beat(),live:window.Pro.live(),low:T.G.agents[0].lielow,tut:T.G.prologue.flags.tut.askingQuestions}));
 ok(r.at==='lielow_wait'&&r.low>0&&r.tut===1,'Lie Low ordered: the tutorial is done and the next beat waits a day '+JSON.stringify(r));
 // Cass and Venn can't be Burned before the frontier, however hot they run
 r=await E(()=>{const v=T.src('venn');v.risk=99;T.f.setRng(()=>0.01);T.f.advanceDay();T.f.setRng(Math.random);return {alive:v.alive,at:window.Pro.beat(),ig:T.G.interrogations.length};});
 ok(r.alive&&!r.ig,'Venn runs hot but is never Burned during the prologue '+JSON.stringify(r));
 ok(r.at==='bunker_offer','a day after Lie Low the next beat begins '+r.at);
 // P4: Cass knows where the bunker is
 await pg.waitForFunction(()=>T.win()==='comm',null,{timeout:5000}).catch(()=>{});
 r=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent,on:!!T.mis('raidbunker'),q:T.q()}));
 ok(r.win==='comm'&&/Sheriff’s secure bunker/.test(r.txt)&&!r.on&&r.q.join()==='act:mission','Cass’s comm about the bunker; the job lands when it closes '+JSON.stringify({win:r.win,q:r.q}));
 await E(()=>T.f.closeWin());
 r=await E(()=>{const m=T.mis('raidbunker');return {at:window.Pro.beat(),live:window.Pro.live(),name:m&&m.name,ships:m&&m.ships.join(),
   pre:m&&T.f.precondList(m).map(c=>(c.ok?'+':'-')+c.brief).join(' ')};});
 ok(r.name==='Raid the Bunker'&&r.ships==='cross,talon,talon'&&r.at==='tachi_recruit'&&!r.live,'Raid the Bunker on the board: three ships pinned; Tachi waits for the next day '+JSON.stringify(r));
 ok(/-5 Soldiers/.test(r.pre)&&/-5 Pilots/.test(r.pre)&&/-2 Transports/.test(r.pre)&&/-3 Pads/.test(r.pre),'its plan lists what is missing: soldiers, pilots, the second transport, pad space '+r.pre);
 await closeUntilEmpty();
 await E(()=>{T.f.advanceDay();});
 await pg.waitForFunction(()=>T.win()==='comm'||T.win()==='recruit',null,{timeout:5000}).catch(()=>{});
 for(let i=0;i<4;i++){const w=await E(()=>T.win()==='comm'&&/Venn told me about this job/.test(document.querySelector('#winCardB').textContent));if(w)break;await E(()=>T.f.closeWin());await wait(100);}
 r=await E(()=>({win:T.win(),at:window.Pro.beat()}));
 ok(r.win==='comm'&&r.at==='tachi_recruit','the next day, Tachi will find pilots '+JSON.stringify(r));
 await closeUntilEmpty();
 r=await E(()=>({flag:JSON.stringify(T.G.prologue.flags.recruitAs),ptr:document.querySelector('#tutPtr .sr-pointer__label').textContent,up:!document.querySelector('#tutPtr').hidden}));
 ok(r.flag==='{"role":"Pilot","n":3}'&&r.up&&/TEXT NEEDED/.test(r.ptr),'the next Recruit is three pilots; a pointer (its label still to write) leads to Recruit '+JSON.stringify(r));
 await E(()=>{T.G.recWait=[];});   // Run Your Network's recruits are decided first (Recruit waits while they do)
 // the cell is still lying low for a day (operations wait), so a day goes by first
 r=await E(()=>({low:T.G.agents[0].lielow,dis:true}));
 ok(r.low===1,'Tachi’s cell has one day of Lie Low left when she offers the pilots '+r.low);
 await E(()=>{T.f.closeWin();T.f.advanceDay();});await wait(1200);await closeUntilEmpty();await E(()=>{T.G.recWait=[];});
 await E(()=>document.querySelector('#sc-base #navIntel').click());await wait(250);
 await E(()=>document.querySelector('#inView [data-insel^="agent:"]').click());await wait(250);
 await E(()=>document.querySelector('#railIntel [data-op^="recruit:"]').click());await wait(150);
 for(let d=0;d<3;d++){await E(()=>{T.f.closeWin();T.f.advanceDay();});await wait(100);}
 await pg.waitForFunction(()=>T.win()==='recruit',null,{timeout:5000}).catch(()=>{});
 r=await E(()=>({win:T.win(),cards:document.querySelectorAll('#winCardB [data-rec-accept]').length,no:document.querySelectorAll('#winCardB [data-rec-no],#winCardB [data-rec-later]').length,
   roles:T.G.recWait.map(p=>p.role).join()}));
 ok(r.win==='recruit'&&r.cards===3&&r.no===0&&r.roles==='Pilot,Pilot,Pilot','the Recruit brings exactly three Pilots, to be taken on '+JSON.stringify(r));
 for(let i=0;i<3;i++){await E(()=>{const b=document.querySelector('#winCardB [data-rec-accept]');if(b)b.click();});await wait(80);}
 await wait(200);
 // Cass: the Black Market
 await pg.waitForFunction(()=>T.win()==='comm',null,{timeout:5000}).catch(()=>{});
 r=await E(()=>({win:T.win(),at:window.Pro.beat(),pilots:T.G.people.filter(p=>p.role==='Pilot').length,txt:document.querySelector('#winCardB').textContent}));
 ok(r.at==='market'&&r.pilots===5&&r.win==='comm'&&/Black Market/.test(r.txt),'three pilots join: Cass tells us about the Black Market '+JSON.stringify({at:r.at,pilots:r.pilots,win:r.win}));
 await E(()=>T.f.closeWin());await wait(200);
 r=await E(()=>({mkt:T.vis('navMarket'),isNew:!!document.querySelector('#navMarket .pro-newtag'),ptr:document.querySelector('#tutPtr .sr-pointer__label').textContent,up:!document.querySelector('#tutPtr').hidden}));
 ok(r.mkt&&r.isNew&&r.up&&/Black Market tab/.test(r.ptr),'the Black Market tab appears, with a pointer to it '+JSON.stringify(r));
 await E(()=>document.querySelector('#sc-base #navMarket').click());await wait(300);
 r=await E(()=>({at:window.Pro.beat(),win:T.win(),txt:document.querySelector('#winCardB').textContent,keep:T.G.market.lots.filter(l=>l.keep).map(l=>l.kind+':'+(l.merc?l.merc.role:l.key)).join()}));
 ok(r.at==='sweet_tooth'&&r.win==='comm'&&/fast friends, sugar/.test(r.txt)&&r.keep==='merc:Soldier','the first look at the stall: Sweet Tooth’s intro, and a mercenary who is always there '+JSON.stringify({at:r.at,win:r.win,keep:r.keep}));
 await E(()=>T.f.closeWin());await wait(200);
 r=await coach();
 const mercTxt=await E(()=>document.querySelector('#tutCoach').textContent);
 ok(r.up&&/hire-a-mercenary/.test(mercTxt),'the hire-a-mercenary tutorial (its words still to write) points at the lot '+r.up);
 // the stall restocks: the guaranteed lot stays, outside the six
 r=await E(()=>{T.G.credits+=8000;const before=T.G.market.lots.length;T.f.rollMarket();return {n:T.G.market.lots.length,six:T.G.market.lots.filter(l=>!l.keep).length,keep:T.G.market.lots.filter(l=>l.keep).length,before};});
 ok(r.six===6&&r.keep===1,'a restock keeps the mercenary lot, outside the six '+JSON.stringify(r));
 // nine aboard and six bunks: a mercenary needs a bunk, so the Barracks grows first
 r=await E(()=>({free:T.f.freeBunks(),hired:T.f.buyLot(T.G.market.lots.findIndex(l=>l.keep&&l.kind==='merc'),false)}));
 ok(r.free<=0&&r.hired===false,'with the bunks full the mercenary can’t be hired yet '+JSON.stringify(r));
 await E(()=>{T.G.rooms.push({id:'rm_bx',key:'barracks',r:5,c:6,w:2,h:1,up:[]});});   // two more tiles: nine aboard, six bunks to start
 await E(()=>{const i=T.G.market.lots.findIndex(l=>l.keep&&l.kind==='merc');T.f.buyLot(i,false);T.f.syncUI();});
 await wait(200);
 r=await E(()=>({at:window.Pro.beat(),keep:T.G.market.lots.filter(l=>l.keep&&l.stock>0).map(l=>l.kind+':'+l.key).join()}));
 ok(r.at==='hauler'&&r.keep==='ship:graf','hired: a second Graf hauler is always on the stall now '+JSON.stringify(r));
 r=await E(()=>({step:(window.Pro.step()||{}).text,buy:T.f.buyLot(T.G.market.lots.findIndex(l=>l.keep&&l.kind==='ship'),false)}));
 ok(r.step==='haulerHangar'&&r.buy===false,'first, Hangar room: the hauler can’t land without a large pad '+JSON.stringify(r));
 await E(()=>{T.f.closeMarket();T.f.syncUI();});await wait(200);
 r=await E(()=>({up:!document.querySelector('#tutCoach').hidden,txt:document.querySelector('#tutCoach').textContent}));
 ok(r.up&&/build Hangar room/.test(r.txt),'the hauler tutorial (its words still to write) points at the Hangar '+r.up);
 // a second Hangar section, built
 await E(()=>{T.G.rooms.push({id:'rm_t6',key:'hangar',r:6,c:13,w:4,h:4,halves:['L','S'],up:[]});T.f.openMarket();});await wait(200);
 r=await E(()=>({step:(window.Pro.step()||{}).text,up:!document.querySelector('#tutCoach').hidden,txt:document.querySelector('#tutCoach').textContent}));
 ok(r.step==='haulerBuy'&&r.up&&/buy a second Graf hauler/.test(r.txt),'room made: the tutorial moves to the hauler lot '+JSON.stringify({step:r.step,up:r.up}));
 await E(()=>{const i=T.G.market.lots.findIndex(l=>l.keep&&l.kind==='ship');T.f.buyLot(i,false);T.f.syncUI();});
 await wait(200);
 r=await E(()=>({at:window.Pro.beat(),tut:T.G.prologue.tut&&T.G.prologue.tut.key}));
 ok(r.at==='bunker'&&r.tut==='bunkerPlan','with the hauler and the Hangar room, Raid the Bunker: its plan has a tutorial '+JSON.stringify(r));
 // the hauler is delivered; Raid the Bunker flies with the second hauler as Reinforcements, the pilots aboard
 await E(()=>{for(let i=0;i<8&&(T.G.inbound||[]).length;i++){T.f.advanceDay();T.f.closeWin();}});
 await closeUntilEmpty();
 await runMission('raidbunker',true,T=>{
  const PL=T.f.getPL(),g2=T.G.fighters.find(x=>x.cls==='graf'&&x.id!==PL.v.tv0);
  const i=T.f.plAddAsset();T.f.plSet('as'+i+'s','f:'+g2.id);
  const used=new Set(Object.values(PL.v)),pp=T.f.ablePilots().find(p=>!used.has(p.id));if(pp)T.f.plSet('as'+i+'p','p:'+pp.id);
  T.f.plAutoFill();
 });
 r=await E(()=>({at:window.Pro.beat(),ships:T.G.fighters.map(f=>f.cls).join(),won:T.mis('raidbunker').state}));
 ok(r.won==='done'&&/cross.*talon.*talon/.test(r.ships)&&r.at==='smoke_after','Raid the Bunker won: the ships are home, and the next beat begins: here the runtime beat '+JSON.stringify(r));
 await pg.waitForFunction(()=>T.win()==='comm'&&/fuel job/.test(document.querySelector('#winCardB').textContent),null,{timeout:5000}).catch(()=>{});
 for(let i=0;i<4;i++){const w=await E(()=>T.win()==='comm'&&/fuel job/.test(document.querySelector('#winCardB').textContent));if(w)break;await E(()=>T.f.closeWin());await wait(100);}
 r=await E(()=>({win:T.win(),txt:document.querySelector('#winCardB').textContent}));
 ok(r.win==='comm'&&/fuel job/.test(r.txt),'the runtime beat fires next, in order '+r.win);
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

 // ---------------- 5. Recruit returns Rebels only during the prologue ----------------
 // (Tachi reposted to Veray Yards, where potential Sources wait, and the dice set to find one)
 r=await E(()=>{
  window.Pro.jump('agents');T.f.closeWin();
  const a=T.G.agents[0];a.postedTo='veray';
  T.G.people=T.G.people.filter(p=>!['runa','kel'].includes(p.id));   // bunks free for whoever turns up
  T.f.setRng(()=>0.1);T.f.agentRecruit(a);for(let i=0;i<3;i++)T.f.recruitTick();T.f.setRng(Math.random);
  return {cand:T.G.candQ.length,rebels:T.G.recWait.length,roles:T.G.recWait.map(p=>p.role).join()};
 });
 ok(r.cand===0&&r.rebels>0,'during the prologue Recruit returns Rebels only '+JSON.stringify(r));

 // ---------------- 6. Tachi's pilots, when beat 14's Recruit is still running ----------------
 r=await E(()=>{
  window.Pro.jump('tachi_recruit');T.f.closeWin();
  const a=T.G.agents[0];T.G.recruit={days:3,agent:a.id};   // still out from Run Your Network
  T.f.advanceDay();T.f.closeWin();const flag=JSON.stringify(T.G.prologue.flags.recruitAs),ptr=(window.Pro.step()||null);
  T.f.advanceDay();T.f.closeWin();T.f.advanceDay();T.f.closeWin();
  return {flag,ptr,roles:T.G.recWait.map(p=>p.role+(p.must?'!':'')).join(),days:T.G.recruit.days};
 });
 ok(r.flag==='{"role":"Pilot","n":3}'&&r.ptr===null&&r.roles==='Pilot!,Pilot!,Pilot!','a Recruit already running brings the three pilots, and no pointer shows '+JSON.stringify(r));

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'prologue-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
