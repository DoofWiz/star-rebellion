/* Smoke test for the dossier and roster: node tools/dossier-smoke.js (needs NODE_PATH=$(npm root -g)).
   The Personnel File follows docs/ui/SCREENS-HANDOFF.md §2: gear pegs, the morale band, popovers, skill effects,
   Support's specialty and niche, the injured state, one screen at 1440x900 and a stacked phone layout. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,R=window.Rebel,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const dax=G().people.find(p=>p.id==='dax'),joss=G().people.find(p=>p.id==='joss');
  // the file: header tags, meters, rank card before the character, record before assignment
  f.openWin('person',dax);
  let html=$('#winCardB').innerHTML;
  out.rookie=html.indexOf('Rookie')>=0;
  out.meters=$$('#winCardB .pf-morale').length+$$('#winCardB .pf-skill').length;     // morale and four skills (the rank is a button on the plate)
  out.labels=$$('#winCardB .pf-skill__top').map(e=>e.firstChild.textContent).join(',');
  const at=s=>html.indexOf(s);
  out.order=[at('data-rank-open'),at('>Morale<'),at('>Character<'),at('>Skills<'),at('Service record'),at('>Assignment<')];
  out.sorted=out.order.every((v,i)=>v>=0&&(i===0||v>out.order[i-1]));
  out.since=html.indexOf('with us since')<0&&html.indexOf('bs-bio')<0&&!!$('#winCardB .pf-stage .pf-doll');   // no joined line, no flavour line; the paper doll on the stage
  // specialty replaces Rookie
  dax.spec='vanguard';f.openWin('person',dax);html=$('#winCardB').innerHTML;out.vanguard=html.indexOf('Vanguard')>=0&&html.indexOf('Rookie')<0;dax.spec=undefined;
  // morale band tag only when not middling
  dax.morale=60;out.midTag=f.dossierHead(dax).indexOf(' morale<')<0;
  dax.morale=10;out.lowTag=f.dossierHead(dax).indexOf('Very Low morale')>=0;
  dax.morale=90;out.highTag=f.dossierHead(dax).indexOf('Very High morale')>=0;
  dax.morale=60;
  // experience meter and the cap
  dax.level=20;dax.xp=0;out.max=f.meterBlock(dax).indexOf('Experience')<0;dax.level=1;dax.xp=0.42;out.xpVal=f.meterBlock(dax).indexOf('>42<')<0;dax.level=1;   // no experience bar: the level ring shows it
  // record from a debrief: kills and injuries add up
  dax.kills=0;dax.injuries=0;dax.missions=0;
  f.applyDebrief({missionId:'none',days:0,win:true,people:[{id:'dax',xp:0,state:'injured',dur:1,kills:3},{id:'runa',xp:0,state:'ok',kills:2}]});
  out.record=[dax.kills,dax.injuries,dax.missions,G().people.find(p=>p.id==='runa').kills];
  out.recordHTML=f.recordCard(dax);
  // pilots, support and autos
  f.openWin('person',joss);html=$('#winCardB').innerHTML;
  out.pilotSkills=['Aim','Cunning','Focus','Presence'].every(k=>html.indexOf('>'+k+'<')>=0)&&html.indexOf('Constitution')<0;
  const sup=R.migrate({id:'s1',name:'Sup Port',role:'Support',level:1,xp:0,assign:'rest',injured:0,bio:'x'});sup.joined=2;
  G().people.push(sup);
  f.openWin('person',sup);html=$('#winCardB').innerHTML;
  out.support=[html.indexOf('>Skills<')<0,html.indexOf('Rookie')<0&&html.indexOf(window.Support.title(sup))>=0,$$('#winCardB .pf-morale').length+$$('#winCardB .pf-skill').length];   // Support show their specialty, never Rookie
  const auto={id:'a1',name:'Bot',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,auto:'policebot',bio:'beep'};G().people.push(auto);
  f.openWin('person',auto);html=$('#winCardB').innerHTML;
  out.auto=[html.indexOf('Rookie')<0,html.indexOf('Morale')<0,html.indexOf('Service record')<0,html.indexOf('data-rank-open')<0];
  // ---- the handoff's checks (§2)
  const pegs=p=>{f.openWin('person',p);return $$('#winCardB .pf-peg').length;};
  out.pegs=[pegs(dax),pegs(joss),pegs(sup)];
  f.openWin('person',dax);
  const mo=$('#winCardB .pf-morale');
  out.morale=[mo&&mo.getAttribute('title'),mo&&mo.querySelector('.pf-morale__v').textContent,window.Rebel.mband(dax).n,Math.round(dax.morale)];
  // skill effects from the formulas, at level 1 and level 4
  const fx=(p,k)=>{const e=document.querySelector('#winCardB .pf-skill[data-skill="'+k+'"] .pf-skill__fx');return e?e.textContent:'';};
  const want=(p,k)=>k==='aim'?'+'+(p.role==='Pilot'?f.pilotAim(p):f.soldierAim(p))+' to hit'+(p.role==='Pilot'?' in space':''):k==='con'?R.hpOf(p)+' health':k==='agi'?'+'+Math.round((R.moveMul(p)-1)*100)+'% move speed':
    k==='pre'?R.coolOf(p,p.role==='Pilot'?'s':'g')+' Cool'+(p.role==='Pilot'?' in space':''):k==='cun'?'+'+Math.round((R.cunMul(p)-1)*100)+'% repairs & shields':'+'+window.SRDB.skillBonus(R.dbSkill(p,'foc'),p.level)+' harder to hit';
  out.skillFx=[];
  for(const [p,lv] of [[dax,1],[dax,4],[joss,1],[joss,4]]){
    const keep=[p.level,p.xp];p.level=lv;p.xp=0;f.openWin('person',p);
    for(const k of R.skillKeys(p))out.skillFx.push([p.id+lv+k,fx(p,k),want(p,k)]);
    p.level=keep[0];p.xp=keep[1];
  }
  out.skillHead=($('#winCardB [data-sec="skills"] .pf-h b')||{}).textContent;
  // Support: their specialty and their own niche, never the classroom
  sup.sspec='doctor';sup.niche='physio';sup.level=8;f.openWin('person',sup);html=$('#winCardB').innerHTML;
  out.supNiche=[!!$('#winCardB [data-sec="spec"] .pf-spec__head'),($('#winCardB .pf-spec__head--niche .pf-spec__name')||{}).textContent,html.indexOf('data-niche=')<0&&!/classroom/i.test(html),
    !!$$('#winCardB [data-sec="niche"] .pf-btn.is-dashed').find(b=>/Level 7: pick one/.test(b.textContent)),$$('#winCardB [data-sec="spec"] .pf-btn').map(b=>b.querySelector('.pf-btn__name').textContent).join(',')];
  sup.niche=undefined;sup.level=1;f.openWin('person',sup);
  out.supNone=($('#winCardB [data-sec="niche"] .pf-none')||{}).textContent;
  // injured: the card, the ribbon, Rest forced on
  R.layUp(dax,'downed',4);f.openWin('person',dax);
  const btn=t=>$$('#winCardB .pf-assign .sr-btn').find(b=>b.textContent===t);
  out.hurt=[($('#winCardB .pf-medical b')||{}).textContent,($('#winCardB .pf-medical span')||{}).textContent,!!$('#winCardB .pf-stage.is-hurt .pf-ribbon'),
    btn('Rest')&&btn('Rest').getAttribute('aria-pressed'),btn('Rest')&&btn('Rest').disabled,btn('Train')&&btn('Train').disabled,($('#winCardB .pf-assign__note')||{}).textContent];
  dax.cond=[];dax.injured=0;if(R.heal)R.heal(dax,99);
  // recruit offer: no rank, but Rookie and meters
  const rec=R.migrate({id:'rec99',name:'New Face',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,bio:'x'});
  f.openWin('recruit',{cards:[{p:rec,must:false}]});html=$('#winCardB').innerHTML;
  out.recruit=[html.indexOf('Private')<0,html.indexOf('Rookie')>=0,html.indexOf('Service record')<0,html.indexOf('data-rank-open')<0,html.indexOf('Morale')>=0];
  // roster
  f.syncUI();
  out.rosterTitle=$$('.sr-unit__role').some(e=>e.getAttribute('title')&&e.getAttribute('title').indexOf('level')>=0);
  return out;
 });
 ok(r.rookie,'Rookie shown');
 ok(JSON.stringify(r.pegs)==='[7,5,0]','gear pegs: soldier 7, pilot 5, Support none '+r.pegs);
 ok(r.morale[0]==='Morale '+r.morale[3]+' / 100'&&r.morale[1]===r.morale[2],'the morale row shows the band, the number in its title '+r.morale);
 ok(r.skillFx.length===16&&r.skillFx.every(x=>x[1]===x[2]),'skill effects follow the formulas '+JSON.stringify(r.skillFx.filter(x=>x[1]!==x[2])));
 ok(r.skillHead==='max 50','skills header says max 50 '+r.skillHead);
 ok(r.supNiche[0]&&r.supNiche[1]==='Physio'&&r.supNiche[2]&&r.supNiche[3]&&r.supNiche[4]==='Treatment,Stabilise','Support: specialty, their niche, the next fork, no classroom '+r.supNiche);
 ok(r.supNone==='No niche yet.','no niche: one line '+r.supNone);
 ok(r.hurt[0]==='Injured'&&/off duty until they have recovered/.test(r.hurt[1])&&r.hurt[2]&&r.hurt[3]==='true'&&r.hurt[4]&&r.hurt[5]&&r.hurt[6]==='Resting until recovered.','injured: the card, the ribbon, Rest forced '+r.hurt);
 ok(r.meters===5,'five bars (morale, four skills): '+r.meters+' '+r.labels);
 ok(r.sorted,'section order '+r.order);
 ok(r.since,'no with-us-since or flavour line; a paper doll');
 ok(r.vanguard,'specialty replaces Rookie');
 ok(r.midTag&&r.lowTag&&r.highTag,'morale tags '+[r.midTag,r.lowTag,r.highTag]);
 ok(r.max&&r.xpVal,'no experience meter '+[r.max,r.xpVal]);
 ok(JSON.stringify(r.record)==='[3,1,1,2]','record '+r.record);
 ok(r.recordHTML.indexOf('Confirmed kills')>=0,'record card');
 ok(r.pilotSkills,'pilot skill bars');
 ok(r.support[0]&&r.support[1]&&r.support[2]===1,'support dossier '+r.support);
 ok(r.auto.every(Boolean),'autos stay plain '+r.auto);
 ok(JSON.stringify(r.recruit)==='[true,true,true,true,true]','recruit offer '+r.recruit);
 ok(r.rosterTitle,'roster full-text tooltip');
 // ---- popovers open on hover and on a tap; the window fits 1440x900 without scrolling
 await pg.setViewportSize({width:1440,height:900});await pg.waitForTimeout(200);
 await pg.evaluate(()=>{const D=window.DBGbase,R=window.Rebel,dax=D.G.people.find(p=>p.id==='dax');
   dax.traits=[{k:'blooded'},{k:'veteran'},{k:'rivals',with:'runa'}];R.layUp(dax,'downed',4);D.fn.openWin('person',dax);});
 await pg.waitForTimeout(500);
 const popShown=sel=>pg.evaluate(s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none';},sel);
 const pops={};
 await pg.hover('#winCardB [data-sec="character"] .pf-btn');pops.traitHover=await popShown('#winCardB [data-sec="character"] .pf-pop');
 pops.traitFx=await pg.evaluate(()=>[...document.querySelectorAll('#winCardB [data-sec="character"] .pf-pop .pf-fx span')].map(e=>e.textContent+'/'+e.style.getPropertyValue('--c')).join('|'));
 await pg.click('#winCardB [data-sec="exp"] .pf-btn');pops.expTap=await popShown('#winCardB [data-sec="exp"] .pf-tip.is-open .pf-pop');
 pops.expFx=await pg.evaluate(()=>(document.querySelector('#winCardB [data-sec="exp"] .pf-pop .pf-fx span')||{}).textContent);
 await pg.mouse.move(5,5);
 const fit=await pg.evaluate(()=>{const c=document.querySelector('#winCardB'),b=c.querySelector('.pf-body'),r=c.getBoundingClientRect(),f=c.querySelector('.sr-window__foot').getBoundingClientRect();
   return {w:c.offsetWidth,bottom:Math.round(f.bottom),vh:innerHeight,scroll:b.scrollHeight-b.clientHeight,popR:Math.round(c.querySelector('.pf-pop').getBoundingClientRect?0:0)};});
 // a Support rebel's specialty button opens its popover
 await pg.evaluate(()=>{const D=window.DBGbase,R=window.Rebel;const s=R.migrate({id:'s2',name:'Pop Test',role:'Support',sspec:'doctor',level:1,xp:0,assign:'rest',injured:0,bio:'x'});s.joined=1;D.G.people.push(s);D.fn.openWin('person',s);});
 await pg.waitForTimeout(300);
 await pg.click('#winCardB [data-sec="spec"] .pf-spec__head');pops.specTap=await popShown('#winCardB [data-sec="spec"] .pf-tip.is-open .pf-pop');
 pops.specText=await pg.evaluate(()=>(document.querySelector('#winCardB [data-sec="spec"] .pf-tip.is-open .pf-pop p')||{}).textContent||'');
 ok(pops.traitHover&&/var\(--sr-go\)/.test(pops.traitFx)&&/var\(--sr-hazard\)/.test(pops.traitFx),'the trait popover opens with good and bad chips '+pops.traitFx);
 ok(pops.expTap&&!!pops.expFx,'an experience opens its popover on a tap '+pops.expFx);
 ok(pops.specTap&&/Keeps rebels alive/.test(pops.specText),'the specialty opens its popover '+pops.specText);
 ok(fit.w===1100&&fit.scroll<=0&&fit.bottom<=fit.vh,'the file fits 1440x900 with no scroll '+JSON.stringify(fit));
 // phone: one column, popovers below their button
 await pg.setViewportSize({width:420,height:860});await pg.waitForTimeout(200);
 await pg.evaluate(()=>{window.DBGbase.fn.renderWin();});
 await pg.click('#winCardB [data-sec="spec"] .pf-spec__head');
 const ph=await pg.evaluate(()=>{const c=document.querySelector('#winCardB'),b=c.querySelector('.pf-body');
   const tip=c.querySelector('[data-sec="spec"] .pf-tip.is-open'),pop=tip&&tip.querySelector('.pf-pop');
   return {cols:getComputedStyle(b).gridTemplateColumns.split(' ').length,w:c.offsetWidth,vw:document.querySelector('#sc-base').clientWidth,
     below:!!pop&&pop.getBoundingClientRect().top>=tip.querySelector('.pf-spec__head').getBoundingClientRect().bottom&&pop.offsetWidth>=tip.offsetWidth-2};});
 ok(ph.cols===1&&ph.w===ph.vw&&ph.below,'the phone stacks, full width, popovers below '+JSON.stringify(ph));
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'dossier-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
