/* Smoke test for the Starfighter window: node tools/starfighter-smoke.js (needs NODE_PATH=$(npm root -g)).
   One window per docs/ui/SCREENS-HANDOFF-2.md §1: pilot and ship together, shield arcs from the segments,
   the move-set popover from dialAvail, weapon type chips with trait popovers, the to-hit breakdown, and the
   hangar's SR.shipSheet without the pilot column. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(900);
 const r=await pg.evaluate(async()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const SR=window.SR,out={};
  const flight=[
    {pilotId:'sera',name:'Sera Kest',first:'Sera',level:3,aim:3,cool:72,tr:[{k:'lucky'}],cls:'cross',fighterId:'f1',fighterName:'Dustfall',hull:100},
    {pilotId:'joss',name:'Joss Marrek',first:'Joss',level:4,aim:4,cool:76,tr:[],cls:'talon',fighterId:'f2',fighterName:'Talon 1',hull:100,loadout:['missiles','bls-t-light-repeaters']}];
  SR.mission={kind:'space',missionId:'x',days:0,flight};
  SR.go('space',{test:true,mission:SR.mission});
  await sleep(400);
  const D=window.DBGspace,F=D.fn;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const P1=D.ships.find(s=>s.id==='P1'),P2=D.ships.find(s=>s.id==='P2');

  // one window, not two: the old dossier + ship pair is gone
  F.openInfo('P1');
  out.oneWin=$$('#infoWins .sr-window').length===1&&!!$('#infoWins .sf-win')&&!$('#dossierWin')&&!$('#shipWin');
  const plate=$('#sfWin .pf-plate');
  out.noAgeQuote=!!plate&&plate.textContent.indexOf('age')<0&&$('#sfWin').textContent.indexOf('“')<0&&!$('#sfWin .sp-bio');

  // shield arcs come from the segments: lit cells, a purple guest when angled, red dashed when exposed
  const arcs=()=>({cyan:$$('#sfWin .sf-zones path[stroke="var(--sr-shield)"]').length,
    psi:$$('#sfWin .sf-zones path[stroke="var(--sr-psi)"]').length,
    dashed:$$('#sfWin .sf-zones path[stroke-dasharray]').length});
  out.arcsFull=arcs();                                      // 15F+15R at 5/cell: 6 cyan, no purple, no dash
  P1.segs.R.at='F';F.renderInfo();out.arcsAngled=arcs();    // aft angled forward: purple cells, aft exposed
  out.angledLabel=$$('#sfWin .sf-zlbl').map(e=>e.textContent).join('|');
  P1.segs.R.at='R';F.renderInfo();

  // the Max speed popover mirrors dialAvail; the pilot's Loop (level 4 -> mans) is the purple cell
  F.openInfo('P2');
  const avail=F.dialAvail(P2);
  out.dialCells=[$$('#sfWin .sf-dial__c.is-ship').length+$$('#sfWin .sf-dial__c.is-pilot').length,avail.length];
  out.loopPilot=P2.pilot.mans.includes('loop')&&$$('#sfWin .sf-dial__c.is-pilot').length===1;

  // to hit is aim - 2/targeting crit + weapon handling, and the Modifiers rows add up to it
  const hitShown=()=>parseInt($('#sfWin .sf-wpn .sf-tile b').textContent.replace('−','-'),10);
  const modSum=()=>[...$('#sfWin .sf-wpn').querySelectorAll('.sf-mods .sf-mod:not(.sf-mod--total) b')].map(e=>parseInt(e.textContent.replace('−','-'),10)).reduce((a,v)=>a+v,0);
  const wd=P2.wpns[0].w;
  out.hit=[hitShown(),P2.pilot.aim+wd.atk,modSum()];
  // a crit adds a hazard card and lowers To hit by 2
  P2.crits.push('targeting');F.renderInfo();
  out.crit=[$$('#sfWin .sf-crit').length===1,hitShown()===P2.pilot.aim+wd.atk-2,modSum()===hitShown()];
  P2.crits.length=0;F.renderInfo();

  // the damage-type popover carries the traits; the card face shows none of them
  const popFx=$$('#sfWin .sf-wpn .pf-pop .pf-fx span').map(e=>e.textContent);
  out.typePop=popFx.length>0&&popFx.some(t=>/Absorbed by shields/.test(t));
  const cardFace=$('#sfWin .sf-wpn').cloneNode(true);cardFace.querySelectorAll('.pf-pop').forEach(e=>e.remove());
  out.noTagsOnCard=cardFace.textContent.indexOf('Absorbed by shields')<0;

  // missiles at 0 ammo: the Shots tile goes hazard orange
  P2.ammo.w0=0;F.renderInfo();
  out.shotsOut=!!$('#sfWin .sf-tile[style*="--sr-hazard"] .sf-pips')&&$$('#sfWin .sf-pips i.is-spent').length===wd.ammo;
  P2.ammo.w0=wd.ammo;

  // the hangar's version: same stage and weapons, no pilot column, nerve or lock
  const ss=SR.shipSheet,sh=ss.make('cross','Dustfall',80,3),h=ss.html(sh,'Dustfall');
  out.sheet=[/sf-stage/.test(h),/sf-wpn/.test(h),!/sf-side/.test(h),!/pf-morale/.test(h),!/sf-lock/.test(h),!/pf-plate/.test(h)];
  F.closeInfo();
  return out;
 });
 await b.close();
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 ok(!errs.length,'page errors: '+errs.join(' | '));
 ok(r.oneWin,'one .sf-win window, no dossier/ship pair: '+r.oneWin);
 ok(r.noAgeQuote,'header has no age or bio quote');
 ok(r.arcsFull.cyan===6&&r.arcsFull.psi===0&&r.arcsFull.dashed===0,'full shields: 6 cyan cells '+JSON.stringify(r.arcsFull));
 ok(r.arcsAngled.psi===3&&r.arcsAngled.dashed===1,'angled aft: purple guest cells + exposed dash '+JSON.stringify(r.arcsAngled));
 ok(/angled forward/.test(r.angledLabel)&&/exposed/.test(r.angledLabel),'zone labels say angled/exposed: '+r.angledLabel);
 ok(r.dialCells[0]===r.dialCells[1],'dial popover cells match dialAvail: '+r.dialCells.join('/'));
 ok(r.loopPilot,'the Loop is the one purple pilot cell');
 ok(r.hit[0]===r.hit[1]&&r.hit[2]===r.hit[0],'to hit matches the formula and the rows add up: '+r.hit.join('/'));
 ok(r.crit.every(Boolean),'a targeting crit shows a card and -2 to hit: '+r.crit.join());
 ok(r.typePop,'type popover lists the weapon traits');
 ok(r.noTagsOnCard,'traits are not on the card face');
 ok(r.shotsOut,'0 ammo turns the Shots tile orange with all pips spent');
 ok(r.sheet.every(Boolean),'SR.shipSheet: stage + weapons, no pilot column: '+r.sheet.join());
 console.log(JSON.stringify({ok:!fails.length,fails,r},null,1));
 process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
