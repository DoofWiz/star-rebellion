/* The Space Combat FTUE (the designer's doc, Google Drive FTUE folder, 22 October): node tools/ftue35-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  Torch the Depots plans in Type 3.5 for every player: Plan mission opens its planning windows (not the plan window),
      flown by the starfighters of your wings only (the Marta, a transport, stays home)
   2  the first time, the intro window: four pages, Previous and Next ("Got it" on the last), a looping animation on the
      first three; the planning windows don't take the keys while it's up
   3  the 16 steps in the doc's order, each over what it explains (coach cards with Next / Got it) or pointing at what to
      click; picking Destroy, Next and Launch move them on; launching ends it and the base marks it seen
   4  the second time: no FTUE
   5  window 1 shows all four families, three with nothing in them; Destroy names the depots and pays the mission's own
      reward; nobody comes (no response)
   6  the fight: one Cross with missiles against the depots and their sentries wins, its missiles only at the depots, and
      the mission's reward lands */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text());});
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(base+'#test');await pg.waitForTimeout(1200);
 await pg.evaluate(()=>window.SR.go('base',{}));await pg.waitForTimeout(500);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const E=(f,a)=>pg.evaluate(f,a),wait=ms=>pg.waitForTimeout(ms);
 const scene=s=>pg.waitForFunction(x=>window.SR.active===x,s,{timeout:15000}).then(()=>wait(500));
 // the prologue's hangar at Torch the Depots: the Marta (Joss, leading) and Dustfall (Sera), one wing
 await E(()=>{const D=window.DBGbase,f=D.fn,G=D.G;for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  G.people=G.people.filter(p=>p.role!=='Pilot');G.fighters=[];G.wings=[];
  const tm=D.G.people[0];   // a person to copy
  const pilot=(id,name,level,ship)=>{const p=JSON.parse(JSON.stringify(tm));p.id=id;p.name=name;p.role='Pilot';p.level=level;p.assign='standby';p.cond=[];p.traits=[];p.ship=ship;G.people.push(p);return p;};
  G.fighters.push(f.newFighter({id:'graf',name:'Marta',cls:'graf',hull:100}),f.newFighter({id:'dustfall',name:'Dustfall',cls:'cross',hull:100}));
  pilot('joss','Joss Marrek',4,'graf');pilot('sera','Sera Kest',3,'dustfall');
  f.wingsTidy();f.addMission('depotrun',true);f.syncUI();});
 // 1. Plan mission (then a fixed seed, so the fight is the same every run)
 await E(()=>{document.querySelector('#navMissions').click();const c=document.querySelector('.bf-card[data-msel="depotrun"]');if(c)c.click();});await wait(300);
 const before=await E(()=>({wings:window.DBGbase.fn.wingsOf().map(w=>w.members.map(m=>m.pilotId+'/'+m.shipId).join()),dev:!!document.querySelector('[data-m35="depotrun"]'),m:window.DBGbase.G.materials,i:window.DBGbase.G.intel}));
 await E(()=>document.querySelector('[data-mplan="depotrun"]').click());
 await scene('space35');
 const r1=await E(()=>{const X=window.SR_ARENA_HC35.dbg;X.B.seed=2;return {active:SR.active,win:window.DBGbase.fn.getWin(),opp:X.B.oppId,camp:!!X.B.camp,flies:X.L35.WINGS35.map(w=>w.ships.map(s=>s.cls+'/'+s.name).join())};});
 ok(r1.active==='space35'&&r1.win!=='plan'&&r1.opp==='torch_depots'&&r1.camp,'1: Plan mission opens Type 3.5\'s planning windows for Torch the Depots '+JSON.stringify(r1));
 ok(r1.flies.join('|')==='cross/Sera'&&/joss\/graf/.test(before.wings.join())&&!before.dev,'1: only the starfighter flies (the Marta stays home); no dev button '+JSON.stringify([r1.flies,before]));
 // 2. the intro
 const pages=[];
 for(let p=0;p<4;p++){
  pages.push(await E(()=>{const L=document.getElementById('ftue35'),q=s=>L.querySelector(s),cv=q('canvas');
   const lit=(()=>{const g=cv.getContext('2d'),d=g.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=4*97)if(d[i]+d[i+1]+d[i+2]>200)n++;return n;})();
   return {open:!q('.f35-intro').hidden,title:q('#f35Title').textContent,page:q('.f35-page').textContent,prev:q('[data-f35="prev"]').disabled,next:q('[data-f35="next"]').textContent,art:!q('.f35-art').hidden,lit,text:q('.f35-text').textContent};}));
  if(p===1){await pg.keyboard.press('ArrowRight');await wait(200);pages[1].keys=await E(()=>window.SR_ARENA_HC35.dbg.B.part===1&&window.SR_FTUE35.state().page===1);}
  await pg.click('#ftue35 [data-f35="next"]');
 }
 ok(pages.every(p=>p.open)&&pages.map(p=>p.page).join()==='1 / 4,2 / 4,3 / 4,4 / 4'&&pages[0].prev&&!pages[1].prev&&pages[3].next==='Got it'&&pages[2].next==='Next','2: four pages, Previous and Next, Got it on the last '+JSON.stringify(pages.map(p=>[p.title,p.page,p.prev,p.next])));
 ok(/Objective, a Team and a Plan/.test(pages[0].text)&&/Wing Leader/.test(pages[1].text)&&/Rules of Engagement/.test(pages[2].text)&&/No plan survives first contact/.test(pages[3].text),'2: the doc\'s words on each page');
 ok(pages[0].art&&pages[1].art&&pages[2].art&&!pages[3].art&&pages[1].lit>20&&pages[2].lit>20,'2: an animation on the first three pages, drawn '+JSON.stringify(pages.map(p=>[p.art,p.lit])));
 ok(pages[1].keys===true,'2: the keys stay with the intro window '+pages[1].keys);
 // 3. the 16 steps
 const seen=[];
 for(let k=0;k<40;k++){
  await wait(150);   // a frame for the FTUE to draw its step
  const s=await E(()=>{const st=window.SR_FTUE35.state();if(!st)return null;const S=window.SR_FTUE35.STEPS[st.i],L=document.getElementById('ftue35'),c=L.querySelector('.f35-coach'),p=L.querySelector('.f35-ptr'),r=L.querySelector('.f35-ring');
   return {i:st.i,intro:st.intro,coach:!c.hidden?c.textContent:'',ptr:!p.hidden?p.textContent:'',ring:!r.hidden,at:typeof S.at==='string'?S.at:'fam',btn:!c.hidden&&!!c.querySelector('[data-f35="got"]')};});
  if(!s)break;seen.push(s);
  if(s.btn){await pg.click('#ftue35 [data-f35="got"]');await wait(80);continue;}
  if(s.at==='[data-primary="destroy"]'){await pg.click('#arHc35 [data-primary="destroy"]');await wait(150);continue;}
  if(s.at==='[data-act="next"]'||s.at==='[data-act="launch"]'){await pg.click('#arHc35 '+s.at);await wait(400);continue;}
  break;
 }
 const order=seen.map(s=>s.i+1).join();
 ok(order==='1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16','3: the 16 steps in order '+order);
 const by=i=>seen.find(s=>s.i===i-1)||{};
 ok(/Primary Objective/.test(by(1).coach)&&/Take Objectives/.test(by(2).coach)&&/Deny Objectives/.test(by(3).coach)&&/Use Objectives/.test(by(4).coach)&&/Bait Objectives/.test(by(5).coach),'3: steps 1 to 5 explain the objective and its four families');
 ok(/fuel depots/.test(by(6).coach)&&by(6).ring,'3: step 6 points at Destroy '+JSON.stringify(by(6)));
 ok([7,9,11,14,16].every(i=>by(i).ptr&&by(i).ring)&&/Secondaries/.test(by(7).ptr)&&/Rules/.test(by(9).ptr)&&/Wings/.test(by(11).ptr)&&/plan/.test(by(14).ptr)&&/mission/.test(by(16).ptr),'3: steps 7, 9, 11, 14 and 16 point at what to click '+JSON.stringify([7,9,11,14,16].map(i=>by(i).ptr)));
 ok(/Secondary Objectives/.test(by(8).coach)&&/Rules of Engagement/.test(by(10).coach)&&/Squads of Space/.test(by(12).coach)&&/Commander Powers/.test(by(13).coach)&&/Executive Order/.test(by(15).coach),'3: the coach cards for secondaries, rules, wings, assets and the plan');
 const r3=await E(()=>({ftue:window.SR_FTUE35.active(),screen:window.SR_ARENA_HC35.dbg.B.screen,layer:!!document.getElementById('ftue35')}));
 ok(!r3.ftue&&r3.screen==='live'&&!r3.layer,'3: Launch ends it '+JSON.stringify(r3));
 // 5 (checked live): the plan-time read of the opportunity
 const r5=await E(()=>{const X=window.SR_ARENA_HC35.dbg;return {fams:X.L35.OPPORTUNITIES.torch_depots.families.join(),wins:X.L35.winsOf('destroy',X.L35.OPPORTUNITIES.torch_depots),resp:X.L35.OPPORTUNITIES.torch_depots.response};});
 // 6. the fight: home with the result
 const r6=await E(()=>{const X=window.SR_ARENA_HC35.dbg;X.fn.run(1200);const S=X.S;return {over:S.over&&S.over.outcome,prim:X.L.prim.state,mis:S.events.filter(e=>/fires a missile/.test(e.text)).map(e=>e.text.replace(/.* at /,'')),respond:S.ships.some(s=>s.role35==='response'),t:Math.round(S.t),reb:S.ships.filter(s=>s.faction==='reb').map(s=>[s.id,s.alive,Math.round(s.hull),s.beh&&s.beh.kind,s.beh&&s.beh.why,s.wpns.map(q=>q.w.id+':'+q.ammo).join('+'),s.st.shots,s.st.hits]),dep:S.ships.filter(s=>s.cast35==='depots').map(s=>s.alive),ex:JSON.stringify(X.L.exec),ev:S.events.slice(-6).map(e=>Math.round(e.t)+' '+e.text)};});
 ok(r6.over==='won'&&r6.prim==='done','6: one Cross wins Torch the Depots '+JSON.stringify(r6));
 ok(r6.mis.length>0&&r6.mis.every(t=>/^Depot \d$/.test(t))&&!r6.respond,'6: missiles only at the depots; nobody comes '+JSON.stringify(r6.mis));
 if(r6.over)await pg.click('#arHc35 [data-act="camp"]');else await E(()=>window.SR_ARENA_HC35.dbg.fn.campDone());await scene('base');
 const r7=await E(()=>{const G=window.DBGbase.G,m=G.missions.find(x=>x.id==='depotrun');return {state:m.state,seen:G.prologue.flags.tut.space35,dm:G.materials,di:G.intel,rew:m.rew};});
 ok(r7.state==='done'&&r7.seen===1,'3: the base marks it seen, the mission done '+JSON.stringify(r7));
 ok(r7.dm-before.m===(r7.rew.m||0)&&r7.di-before.i===(r7.rew.i||0),'6: the mission\'s own reward lands '+JSON.stringify([r7.dm-before.m,r7.di-before.i,r7.rew]));
 ok(r5.fams==='take,deny,use,bait'&&r5.wins==='Destroy the fuel depots.'&&r5.resp===null,'5: four families; Destroy names the depots; no response '+JSON.stringify(r5));
 // 4. the second time: no FTUE; 5: the windows
 await E(()=>{const D=window.DBGbase,f=D.fn,G=D.G;for(let i=0;i<12&&f.getWin();i++)f.closeWin();G.missions=G.missions.filter(m=>m.id!=='depotrun');f.addMission('depotrun',true);
  for(const p of G.people)if(p.role==='Pilot'){p.assign='standby';p.cond=[];p.out=null;}for(const x of G.fighters){x.out=null;x.refit=0;x.hull=100;}f.syncUI();
  const m=G.missions.find(x=>x.id==='depotrun');f.openPlan(m);});
 await scene('space35');
 const r4=await E(()=>{const q=s=>[...document.querySelectorAll('#arHc35 '+s)];return {ftue:window.SR_FTUE35.active(),layer:!!document.getElementById('ftue35'),
   fams:q('.h35-fam .h35-panel__head').map(e=>e.textContent),none:q('.h35-ocard.is-none').length,cards:q('[data-primary]').map(e=>e.getAttribute('data-primary')),pays:(q('[data-primary="destroy"] .h35-ocard__pays')[0]||{}).textContent||'',
   band:/RESPONSE/.test(document.querySelector('#arHc35').textContent),rew:window.DBGbase.G.missions.find(x=>x.id==='depotrun').rew};});
 ok(!r4.ftue&&!r4.layer,'4: the second time there\'s no FTUE '+JSON.stringify(r4));
 ok(r4.fams.join()==='Take it,Deny it,Use it,Bait with it'&&r4.none===3&&r4.cards.join()==='destroy'&&r4.pays==='Pays'+Object.keys(r4.rew).filter(k=>'csmfi'.includes(k)).map(k=>r4.rew[k]).join(''),'5: four families, three empty, Destroy only, paying the mission\'s reward '+JSON.stringify(r4));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails},null,0));
 if(fails.length){console.error('ftue35-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('ftue35-smoke OK');
})();
