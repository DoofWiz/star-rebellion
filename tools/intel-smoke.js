/* Smoke test for the Intelligence tab: node tools/intel-smoke.js (needs NODE_PATH=$(npm root -g)).
   The Network per docs/ui/SCREENS-HANDOFF-2.md §3: the graph from data (base, Agents, Sources, open slots),
   capacity pills, the three rails (which never scroll at 1440×900), the on-site rule for Visit, recruitment as
   an Agent task, burns that start interrogations, the four responses, and Exposure moving with Leads, missions
   and liberation. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const r=await pg.evaluate(async()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const flush=()=>{for(let i=0;i<8&&f.getWin();i++)f.closeWin();};
  const mkSrc=(cd,agentId,risk)=>{const s=Object.assign({alive:true,visited:false,contacted:false,pendingEvent:null,eventsSeen:0,signal:null,sigIdx:0},JSON.parse(JSON.stringify(cd)));s.agent=agentId;s.risk=risk;G().sources.push(s);return s;};
  const SEED={halt:{id:'halt',name:'Ferren Halt',type:'Officer',loc:'Veray Yards',level:2,cult:35,risk:72,inc:{s:24}},
    vokk:{id:'vokk',name:'Sen. Adria Vokk',type:'Politician',loc:'via Relay Kess',level:1,cult:20,risk:45,inc:{c:100}},
    marr:{id:'marr',name:'Prof. Etta Marr',type:'Scientist',loc:'Callis Institute',level:1,cult:10,risk:20,inc:{i:1}}};
  const ag1=G().agents[0],ag2=f.mkAgent('veray');G().agents.push(ag2);
  const halt=mkSrc(SEED.halt,ag2.id,72),vokk=mkSrc(SEED.vokk,ag1.id,45);mkSrc(SEED.marr,ag1.id,20);

  // --- the graph renders from data: base, Agents, Sources, open slots; capacity pills match cap ---
  f.openIntel();
  out.stage=[!$('#inView').hidden,!!$('#inView .in-node--hub'),$$('#inView .in-node--agent').length,
    $$('#inView .in-node--src').length,$$('#inView .in-node--empty').length];
  const expectSlots=G().agents.reduce((n,a)=>n+Math.max(0,f.agentCap(a)-G().sources.filter(s=>s.agent===a.id&&s.alive).length),0);
  out.slotsMatch=out.stage[4]===expectSlots;
  out.caps=$$('#inView .in-node--agent .in-cap').map(e=>e.textContent);
  out.capsMatch=G().agents.every((a,i)=>out.caps.includes(G().sources.filter(s=>s.agent===a.id&&s.alive).length+'/'+f.agentCap(a)));

  // --- selecting an Agent, a Source or the Exposure panel swaps the rail, which never scrolls ---
  const rail=()=>document.querySelector('#railIntel');
  const noScroll=()=>rail().scrollHeight<=rail().clientHeight+1;
  const railTitle=()=>(rail().querySelector('.in-railtitle')||{}).textContent||'';
  $$('#inView .in-node--agent').find(n=>new RegExp(ag1.name).test(n.textContent)).click();
  out.railAgent=[/Agent/.test(railTitle()),noScroll()];
  $$('#inView .in-node--src').find(n=>/Vokk/.test(n.textContent)).click();
  out.railSrc=[/Source/.test(railTitle()),noScroll(),$$('#railIntel .in-wheel').length===2];
  // Visit needs the handler on-site
  out.visitOff=$('#railIntel [data-sop^="visit"]').disabled;
  ag1.postedTo='kess';f.renderIntel();
  out.visitOn=!$('#railIntel [data-sop^="visit"]').disabled;
  ag1.postedTo='haven';f.renderIntel();
  $('#inView .in-exp').click();
  out.railBureau=[/The Bureau/.test(railTitle()),noScroll(),$$('#railIntel .in-band').length===4,!!$$('#railIntel .in-band').find(e=>e.classList.contains('is-now'))];

  // --- recruitment is an Agent task, and it can return a rebel ---
  $$('#inView .in-node--agent').find(n=>new RegExp(ag1.name).test(n.textContent)).click();
  $('#railIntel [data-op^="recruit"]').click();
  out.recruitTask=[G().recruit.days>0,G().recruit.agent===ag1.id];
  G().recruit.days=1;const w0=G().recWait.length;
  f.advanceDay();flush();
  out.recruitRebel=G().recWait.length>w0&&G().recWait.every(p=>['Soldier','Support','Pilot'].includes(p.role));
  G().recWait=[];

  // --- a burn adds an interrogation, an alert, an orange trail edge and an Agent pending badge ---
  f.captureSource(halt);flush();
  f.renderIntel();
  out.burn=[!!G().interrogations.find(ig=>ig.source==='halt'),!!$('#inView .in-alert'),
    !!$('#inView .in-edges path[stroke="var(--sr-hazard)"][stroke-dasharray]'),
    !!$$('#inView .in-node--agent').find(n=>new RegExp(ag2.name).test(n.textContent)).querySelector('.in-badge--br'),
    !!$$('#inView .in-node--src').find(n=>/Halt/.test(n.textContent)).querySelector('.in-clock')];

  // --- Decide later keeps the clock running ---
  $('#inView [data-respond]').click();
  out.intgWin=[f.getWin()==='interrogation',$$('#winCardB .cm-choice').length===4,$$('#winCardB .in-leadchip').length>=1];
  $('#winCardB [data-close]').click();
  const d0=G().interrogations[0].daysLeft;
  f.advanceDay();flush();
  out.clockRuns=G().interrogations.length&&G().interrogations[0].daysLeft===d0-1;

  // --- Contain: the agent is recalled, the cell lies low, and the extracted leads are cold ---
  f.openIntel();
  $('#inView [data-respond]').click();
  $('#winCardB [data-intg^="contain"]').click();
  out.contain=[G().interrogations[0].contained===1,ag2.postedTo==='haven',ag2.lielow>0];
  const e0=G().exposure;
  G().interrogations[0].daysLeft=1;f.advanceDay();flush();
  out.containLeads=[G().interrogations.length===0,G().bureauLeads.length>0,G().bureauLeads.every(l=>l.cold),G().exposure>e0];
  out.expLeads=G().exposure-e0;

  // --- Silence: gone for good, no leads ---
  G().bureauLeads=[];
  const s2=mkSrc({id:'tess',name:'Tessaly Brandt',type:'Steward',loc:'Saltreach',level:1,cult:15,risk:80,inc:{s:20}},ag1.id,80);
  f.captureSource(s2);flush();
  f.answerInterrogation('silence','tess');flush();
  out.silence=[G().interrogations.length===0,!G().sources.find(s=>s.id==='tess').alive,G().bureauLeads.length===0];

  // --- Rescue: a mission goes on the board; winning frees them with no Leads, losing feeds the Bureau ---
  const s3=mkSrc({id:'pell',name:'Orrin Pell',type:'Harbourmaster',loc:'Tollgate',level:1,cult:20,risk:80,inc:{c:60}},ag1.id,80);
  f.captureSource(s3);flush();
  f.answerInterrogation('rescue','pell');flush();
  const rm=G().missions.find(m=>/^Rescue/.test(m.name||''));
  out.rescue=[!!rm,G().interrogations[0]&&G().interrogations[0].rescue===rm.id];
  f.applyDebrief({missionId:rm.id,kind:'ground',days:0,win:true,people:[]});flush();
  out.rescueWin=[G().interrogations.length===0,G().sources.find(s=>s.id==='pell').saved===1,G().bureauLeads.length===0];
  const s4=mkSrc({id:'cask',name:'Ione Cask',type:'Clerk',loc:'Ledger Town',level:1,cult:10,risk:80,inc:{i:1}},ag1.id,80);
  f.captureSource(s4);flush();
  f.answerInterrogation('rescue','cask');flush();
  const rm2=G().missions.find(m=>/^Rescue Ione/.test(m.name||''));
  f.applyDebrief({missionId:rm2.id,kind:'ground',days:0,win:false,people:[]});flush();
  out.rescueFail=[G().interrogations.length===0,G().bureauLeads.length>0];

  // --- Exposure moves with missions and liberation too ---
  G().bureauLeads=[];
  const em0=G().exposure;
  const mm={id:'exptest',name:'Noise test',desc:'x',objectives:['x'],req:{transport:true,team:1},days:0,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{c:10},loc:'brakka',region:'flats',lib:10,riskTxt:'Low'};
  G().missions.push(mm);
  f.applyDebrief({missionId:'exptest',kind:'ground',days:0,win:true,people:[]});flush();
  out.expMission=G().exposure-em0;   // the operation itself, plus its liberation gain
  out.expBand=['Low','Medium','High','Max'][f.expBand()];
  f.closeIntel();
  return out;
 });
 await b.close();
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 ok(!errs.length,'page errors: '+errs.join(' | ').slice(0,400));
 ok(r.stage[0]&&r.stage[1]&&r.stage[2]===2&&r.stage[3]>=3,'the stage renders the base, agents and sources from data: '+r.stage.join());
 ok(r.slotsMatch,'open slots match the free cell capacity: '+r.stage[4]);
 ok(r.capsMatch,'capacity pills match cellLive/cap: '+r.caps.join(' '));
 ok(r.railAgent.every(Boolean),'selecting an Agent swaps the rail, no scroll: '+r.railAgent.join());
 ok(r.railSrc.every(Boolean),'selecting a Source shows the two wheels, no scroll: '+r.railSrc.join());
 ok(r.visitOff&&r.visitOn,'Visit is disabled until the handler is posted on-site');
 ok(r.railBureau.every(Boolean),'the Exposure panel opens the Bureau rail with four bands: '+r.railBureau.join());
 ok(r.recruitTask.every(Boolean),'Recruit is an Agent task: '+r.recruitTask.join());
 ok(r.recruitRebel,'an Agent’s search can return rebels');
 ok(r.burn.every(Boolean),'a burn adds the interrogation, alert, trail edge, pending badge and clock pill: '+r.burn.join());
 ok(r.intgWin.every(Boolean),'the interrogation window: four responses and the lead chips: '+r.intgWin.join());
 ok(r.clockRuns,'Decide later keeps the clock running');
 ok(r.contain.every(Boolean),'Contain recalls the agent and the cell lies low: '+r.contain.join());
 ok(r.containLeads.every(Boolean),'a contained extraction yields only cold leads, and Exposure rises: '+r.containLeads.join());
 ok(r.silence.every(Boolean),'Silence ends it with no leads: '+r.silence.join());
 ok(r.rescue.every(Boolean)&&r.rescueWin.every(Boolean),'Rescue puts a mission on the board; winning frees them with no leads: '+r.rescue.join()+' / '+r.rescueWin.join());
 ok(r.rescueFail.every(Boolean),'a failed rescue adds leads: '+r.rescueFail.join());
 ok(r.expLeads>0&&r.expMission>0,'Exposure moves with leads, missions and liberation: +'+r.expLeads+' / +'+r.expMission);
 console.log(JSON.stringify({ok:!fails.length,fails,r},null,1));
 process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
