/* Smoke test for the Missions tab, the briefing room (docs/ui/SCREENS-HANDOFF.md §4):
   node tools/missions-smoke.js (needs NODE_PATH=$(npm root -g)).
   A stage view, not a window; cards with risk pips and New / Locked flags; the holo-table per kind; the label;
   count-first requirements that name nobody; the hauler hint only during onboarding; Plan and its reason; the
   briefing fits the rail at 1440x900; no command bar, Advance day alone. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(600);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const shown=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&el.getClientRects().length>0;
  for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  for(const id of ['stealcross','toi','depotrun'])f.addMission(id,true);
  // ---- the tab is a stage view, not a window; the old popup lands here too
  $('#navMissions').click();
  out.view=[f.getWin(),shown($('#msView')),$('#navMissions').getAttribute('aria-selected'),($('.sr-topbar__title')||{}).textContent,shown($('#railMissions'))];
  f.openWin('missions');out.popup=[f.getWin(),shown($('#msView'))];
  // ---- no command bar; Advance day on its own
  out.cmdbar=$$('#sc-base .sr-cmdbar').filter(shown).length;
  out.go=[shown($('#sc-base .bf-go')),shown($('#dayBtn')),shown($('#dockNote')),shown($('#arOrders')),shown($('#gxOrders'))];
  // ---- the board: title, chips, cards with risk pips and New flags
  out.head=($('.bf-board__head')||{}).textContent;
  out.chips=$$('.bf-filters .sr-btn').map(e=>e.textContent).join(',');
  const card=id=>$('.bf-card[data-msel="'+id+'"]');
  out.cards=$$('.bf-card').length;
  out.pips=[card('toi').querySelectorAll('.bf-risk i.is-on').length,card('depotrun').querySelectorAll('.bf-risk i.is-on').length,card('stealcross').querySelectorAll('.bf-risk i.is-on').length];
  out.newFlag=(card('depotrun').querySelector('.bf-card__flag')||{}).textContent;
  // ---- select the ground mission: the projection and the briefing swap
  card('stealcross').click();
  out.ground={holo:($('.bf-proj')||{}).getAttribute('data-holo'),pin:!!$('.bf-proj .bf-pulse'),label:($('.bf-title')||{}).textContent,
    title:($('.bf-brief__title')||{}).textContent,sel:card('stealcross').classList.contains('is-sel'),
    calls:$$('.bf-callout').map(e=>e.querySelector('b').textContent+(e.classList.contains('is-foe')?'!':'')).join(','),
    loc:($('.bf-loc span')||{}).textContent,map:!!$('.bf-loc [data-msmap="akkaro"]'),
    facts:$$('.bf-fact').map(e=>e.querySelector('span').textContent+'='+e.querySelector('b').textContent).join(','),
    quote:[$('.bf-quote')&&getComputedStyle($('.bf-quote')).webkitLineClamp,!!($('.bf-quote')||{}).title],
    reqs:$$('.bf-req').map(e=>(e.classList.contains('is-ok')?'+':'-')+e.querySelector('span').textContent+(e.querySelector('em')?'('+e.querySelector('em').textContent+')':'')),
    rew:$$('.bf-rew span').map(e=>e.textContent).join(','),
    plan:[($('.bf-plan .sr-btn')||{}).disabled,($('.bf-plan__why')||{}).textContent],
    names:G.people.filter(p=>$$('.bf-req').some(e=>e.textContent.indexOf(p.name.split(' ')[0])>=0)).map(p=>p.name)};
  // ---- the rail fits at 1440x900 and never scrolls
  const rail=$('#railBase');out.fit=[rail.scrollHeight,rail.clientHeight,getComputedStyle(rail).overflowY];
  // ---- the hauler hint only while the onboarding hauler step is on
  const keep=JSON.stringify(G.wreck);G.wreck={restored:true,restoring:0};f.renderWin&&f.syncUI();
  out.noHint=$$('.bf-req em').map(e=>e.textContent).join('|');
  G.wreck=JSON.parse(keep);f.syncUI();
  out.hint=$$('.bf-req em').map(e=>e.textContent).join('|');
  // ---- the space mission: planet and orbit, targets and threats
  card('toi').click();
  out.seen=[(card('stealcross').querySelector('.bf-card__flag')||{}).textContent||'',G.missions.find(m=>m.id==='stealcross').seen];   // its New flag went once it had been looked at
  out.space={holo:($('.bf-proj')||{}).getAttribute('data-holo'),ring:!!$('.bf-proj ellipse[transform^="rotate"]'),diamond:$$('.bf-proj path[d*=" l9 9 "]').length,
    threats:$$('.bf-proj path[fill="#7aaaff"]').length,label:($('.bf-title')||{}).textContent,calls:$$('.bf-callout b').map(e=>e.textContent).join(','),
    facts:$$('.bf-fact b').map(e=>e.textContent).join(',')};
  // ---- filters
  $('.bf-filters [data-msfilter="ground"]').click();out.groundOnly=$$('.bf-card').map(e=>e.getAttribute('data-msel')).join(',');
  $('.bf-filters [data-msfilter="all"]').click();
  // ---- locked: dimmed, encrypted
  const dm=G.missions.find(m=>m.id==='depotrun');dm.state='locked';f.syncUI();card('depotrun').click();
  out.locked={cls:card('depotrun').className,flag:(card('depotrun').querySelector('.bf-card__flag')||{}).textContent,holo:($('.bf-proj')||{}).getAttribute('data-holo'),
    label:($('.bf-title')||{}).textContent,title:($('.bf-brief__title')||{}).textContent,plan:!!$('.bf-plan')};
  dm.state='avail';
  // ---- Show on map goes to the world in the Galaxy
  card('stealcross').click();$('.bf-loc [data-msmap]').click();
  out.map=[shown($('#msView')),$('#navSources').getAttribute('aria-selected')];
  return out;
 });
 ok(r.view[0]===null&&r.view[1]&&r.view[2]==='true'&&r.view[3]==='Missions'&&r.view[4],'the Missions tab is a stage view with the briefing in the rail '+r.view);
 ok(r.popup[0]===null&&r.popup[1],'the old popup opens the tab instead '+r.popup);
 ok(r.cmdbar===0&&r.go[0]&&r.go[1]&&!r.go[2]&&!r.go[3]&&!r.go[4],'no command bar; Advance day alone in .bf-go '+r.cmdbar+' '+r.go);
 ok(r.head==='Mission board'&&r.chips==='All,Ground,Space','board title and chips '+r.head+' '+r.chips);
 ok(r.cards===3&&r.pips.join()==='3,1,2','cards with risk pips (high 3, low 1, moderate 2) '+r.cards+' '+r.pips);
 ok(r.newFlag==='New','a fresh mission is flagged New '+r.newFlag);
 const g=r.ground;
 ok(g.holo==='ground'&&g.pin&&g.label==='Akkaro · Dustfall','ground: the region pin, the label world · region '+[g.holo,g.pin,g.label]);
 ok(g.title==='Steal the Cross'&&g.sel,'selecting a card swaps the briefing '+g.title);
 ok(g.calls==='Target,Opposition!,Extract','the holo callouts, Opposition in Hegemony blue '+g.calls);
 ok(g.loc==='Akkaro · Dustfall'&&g.map,'the location line and Show on map');
 ok(g.facts==='Risk=Moderate,Travel time=2 days,Max squad size=3','the three fact tiles '+g.facts);
 ok(g.quote[0]==='3'&&g.quote[1],'the pitch is clamped to 3 lines with the full text in its title '+g.quote);
 ok(g.reqs[0]==='+3 Soldiers'&&/^-2 Pilots\(Only 1 available\)$/.test(g.reqs[1])&&/^-1 Transport/.test(g.reqs[2])&&/^\+24 Fuel$/.test(g.reqs[3]),'count-first requirements '+g.reqs.join(' | '));
 ok(!g.names.length,'met and unmet rows name nobody '+g.names);
 ok(/FT-4 Cross/.test(g.rew)&&/500/.test(g.rew)&&/120/.test(g.rew)&&/Dustfall \+10%/.test(g.rew),'reward chips '+g.rew);
 ok(g.plan[0]===true&&g.plan[1]==='Needs 2 pilots','Plan is disabled with the reason under it '+g.plan);
 ok(r.seen[0]===''&&r.seen[1]===1,'a mission looked at loses its New flag '+r.seen);
 ok(r.fit[0]<=r.fit[1]&&r.fit[2]==='hidden','the briefing fits the rail at 1440x900 '+r.fit);
 ok(/Restore the hauler in the Hangar/.test(r.hint)&&!/Restore the hauler/.test(r.noHint),'the hauler hint only during onboarding ['+r.hint+'] ['+r.noHint+']');
 const s=r.space;
 ok(s.holo==='space'&&s.ring&&s.diamond>=1&&s.threats>=1,'space: an orbit ring, targets and threats '+JSON.stringify(s));
 ok(/ · Orbit$/.test(s.label)&&s.calls==='Target'&&s.facts.split(',')[2]==='2 ships','space label, objective fallback, squad in ships '+[s.label,s.calls,s.facts]);
 ok(r.groundOnly==='stealcross','the Ground chip filters the board '+r.groundOnly);
 const L=r.locked;
 ok(/is-locked/.test(L.cls)&&L.flag==='Locked'&&L.holo==='locked'&&L.label==='Signal encrypted'&&L.title==='Signal encrypted'&&!L.plan,'locked: dimmed, encrypted, no Plan '+JSON.stringify(L));
 ok(r.map[0]===false&&r.map[1]==='true','Show on map opens the Galaxy '+r.map);
 // ---- phone: the board stacks and a card opens the briefing drawer
 await pg.evaluate(()=>{window.DBGbase.fn.syncUI();document.querySelector('#navMissions').click();});
 await pg.setViewportSize({width:420,height:860});await pg.waitForTimeout(300);
 const ph=await pg.evaluate(()=>{
  document.querySelector('.bf-card[data-msel="stealcross"]').click();
  const b=document.querySelector('.bf-board').getBoundingClientRect(),h=document.querySelector('.bf-holo').getBoundingClientRect();
  return {stack:h.top>=b.bottom-1,w:Math.round(b.width),drawer:document.querySelector('.sr-shell').classList.contains('is-drawer-open')};
 });
 ok(ph.stack&&ph.drawer,'phone: the board and the table stack; a card opens the briefing drawer '+JSON.stringify(ph));
 // ---- an older save's board was seen in the old popup: nothing on it is flagged New
 const mig=await pg.evaluate(()=>{const D=window.DBGbase,f=D.fn,old=JSON.parse(JSON.stringify(D.G));old.v=6;for(const m of old.missions)delete m.seen;   // version 6: from before the seen flag (MIGRATIONS[6] adds it)
   const keep=D.G;D.G=old;f.upgradeSave();const out=[old.v===f.saveVersion(),old.missions.length>0&&old.missions.every(m=>m.seen===1)];D.G=keep;return out;});
 ok(mig[0]&&mig[1],'the save migration marks an old board seen '+mig);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('missions-smoke: all passed');
})();
