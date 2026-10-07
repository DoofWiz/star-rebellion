/* Smoke test for the source approach: node tools/approach-smoke.js (needs NODE_PATH=$(npm root -g)).
   The Approach window per docs/ui/SCREENS-HANDOFF-2.md §2: the potential-source header, courier strip, capacity
   row, the choices by state (Take on / Send no reply; Standby when full), and standby contacts that wait on the
   Galaxy map and reopen the window. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const r=await pg.evaluate(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const lastNews=()=>G().news[G().news.length-1]||{};
  const alive=()=>G().sources.filter(s=>s.alive).length;

  // --- room in the network: two choices, Take on recruits ---
  while(alive()>=f.sourceCap())G().sources.find(s=>s.alive).alive=false;
  f.openWin('candidate','tess');
  out.roomChoices=$$('#winCardB .cm-choice').length;
  out.head=[!!$('#winCardB .cm-ava--potential'),($('#winCardB .cm-kicker')||{}).textContent==='Potential source',
    $$('#winCardB .cm-mini').length===2,!!$('#winCardB .cm-chan--courier'),!$('#winCardB #commStatic'),
    $('#winCardB').textContent.indexOf('Tessaly Brandt stewards')>=0];
  out.capPips=$$('#winCardB .cm-cap__pips i').length===f.sourceCap()&&!$('#winCardB .cm-cap.is-full');
  out.noBurnWording=$('#winCardB').textContent.indexOf('Burn the contact')<0&&$('#winCardB').textContent.indexOf('Send no reply')>=0;
  $('#winCardB [data-cand="tess"]').click();
  out.took=[G().sources.some(s=>s.id==='tess'&&s.alive),f.getWin()===null,/joins the network/.test(lastNews().html)];

  // --- full: three choices, Take on disabled, Standby leaves a map marker ---
  let fill=0;
  while(alive()<f.sourceCap())G().sources.push({id:'fx'+fill++,name:'Filler '+fill,type:'x',loc:'x',level:1,cult:0,risk:0,inc:{},alive:true});
  f.openWin('candidate','pell');
  out.fullChoices=$$('#winCardB .cm-choice').length;
  const take=$('#winCardB [data-cand="pell"]');
  out.takeOff=!!take&&take.disabled&&take.textContent.indexOf('Network full')>=0;
  out.capFull=!!$('#winCardB .cm-cap.is-full')&&/full/i.test(($('#winCardB .cm-cap__full')||{}).textContent||'');
  $('#winCardB [data-cand="standby"]').click();
  out.standby=[(G().standby||[]).includes('pell'),f.getWin()===null];

  // the marker on the galaxy map reopens the window
  document.querySelector('#sc-base #navSources').click();
  await sleep(400);
  const hit=f.gxHitL_().find(h=>h.t==='c'&&h.id==='pell');
  out.marker=!!hit;
  if(hit){
    const cv=document.querySelector('#sc-base #cv'),rc=cv.getBoundingClientRect();
    cv.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rc.left+hit.x,clientY:rc.top+hit.y}));
    out.reopens=f.getWin()==='candidate'&&$('#winCardB [data-cand="pell"]').disabled;
  }

  // --- a slot frees up: Take on works from the reopened window ---
  G().sources.find(s=>s.alive).alive=false;
  f.openWin('candidate','pell');   // re-render with room
  const take2=$('#winCardB [data-cand="pell"]');
  out.freed=!!take2&&!take2.disabled&&$$('#winCardB .cm-choice').length===2;
  take2.click();
  out.tookFromStandby=[G().sources.some(s=>s.id==='pell'&&s.alive),!(G().standby||[]).includes('pell')];

  // --- Send no reply posts the existing news line, and drops a standby contact ---
  (G().standby=G().standby||[]).push('cask');
  f.openWin('candidate','cask');
  $('#winCardB [data-cand="no"]').click();
  out.noReply=[/The contact is burned\. They never hear back\./.test(lastNews().html),!(G().standby||[]).includes('cask'),f.getWin()===null];

  // --- the migration folds the old candWait queue into standby ---
  G().v=7;G().candWait=['brook','brook','pell'];delete G().standby;
  f.upgradeSave();
  out.migrated=[JSON.stringify(G().standby)===JSON.stringify(['brook']),G().candWait===undefined,G().v===f.saveVersion()];
  G().standby=[];
  return out;
 });
 await b.close();
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 ok(!errs.length,'page errors: '+errs.join(' | '));
 ok(r.roomChoices===2,'with room: two choices, got '+r.roomChoices);
 ok(r.head.every(Boolean),'potential-source header (ring, kicker, minis, courier strip, no waveform, pitch): '+r.head.join());
 ok(r.capPips,'capacity pips match sourceCap and no FULL label');
 ok(r.noBurnWording,'"Send no reply" replaces "Burn the contact"');
 ok(r.took.every(Boolean),'Take on recruits and closes: '+r.took.join());
 ok(r.fullChoices===3,'when full: three choices, got '+r.fullChoices);
 ok(r.takeOff,'Take on disabled with "Network full"');
 ok(r.capFull,'capacity row is-full with the FULL label');
 ok(r.standby.every(Boolean),'Standby stores the contact and closes: '+r.standby.join());
 ok(r.marker,'a potential-contact marker sits on the galaxy map');
 ok(r.reopens,'clicking the marker reopens the Approach window (still full)');
 ok(r.freed,'with a slot free the reopened window offers Take on again');
 ok(r.tookFromStandby.every(Boolean),'recruiting from standby works and clears the marker: '+r.tookFromStandby.join());
 ok(r.noReply.every(Boolean),'Send no reply posts the existing news line and drops the contact: '+r.noReply.join());
 ok(r.migrated.every(Boolean),'candWait migrates into standby: '+r.migrated.join());
 console.log(JSON.stringify({ok:!fails.length,fails,r},null,1));
 process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
