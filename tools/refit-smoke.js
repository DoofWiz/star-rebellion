/* Refit on the mounts and hardpoints (docs/MAIN-SWITCH-HANDOFF.md S4, §5 test 5; C-90 item 4): node tools/refit-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  Refit is the ship inspector's tab (a ship's window, and the Arsenal's Refit): her weapon mounts and her hardpoints and what's fitted
   2  a valid fit applies from the hangar racks: 2 days without an Aerogineer (grounded meanwhile), at once with one; what
      comes off goes on the racks; the weapons follow (loadout)
   3  an invalid fit is refused with the reason: bombs on a Cross (only the Graf and the Brickbat carry them), a boarding
      party in a Brickbat (no passenger room), a third weapon on two mounts, a boarding pod beside a bomb rack on a
      Brickbat's two hardpoints, a ship out on a mission
   4  Type 3.5's window 3: a Brickbat's loadout is a read-out of its fit (Bombs ×2, a boarding pod), with Refit (the demo's
      refit pop-up) instead of the old segmented control */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(base+'?dev#test');await pg.waitForTimeout(1200);
 await pg.evaluate(()=>window.SR.go('base',{}));await pg.waitForTimeout(500);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={},$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  const ship=(id,cls,name)=>{const s=f.newFighter({id,name,cls,hull:100});G.fighters.push(s);return s;};
  const cross=ship('rc','cross','Refit Cross'),graf=ship('rg','graf','Refit Graf'),bb=ship('rb','brickbat','Refit Brickbat');
  G.shipKit=[];f.rackAdd('bombs',2);f.rackAdd('boarding-party',1);f.rackAdd('boarding-pod',1);f.rackAdd('missiles',1);
  const rack=id=>(G.shipKit.find(x=>x.id===id)||{n:0}).n;
  // 1. the tab
  f.shipTab_('sheet');f.openWin('ship',graf);
  out.sheet=[f.getWin(),!!$('#winsB [data-shiptab="refit"]')];
  $('#winsB [data-shiptab="refit"]').click();
  out.tab=[f.shipTab_(),/Refit/.test(($('#winsB .sr-window__title')||{}).textContent||''),$$('#winsB .sr-h3').map(e=>e.textContent.replace(/\s+/g,' ').trim())];
  // 2. a valid fit, without an Aerogineer: two days grounded
  const pb=$$('#winsB [data-rfx]').find(e=>!e.disabled&&e.getAttribute('data-rfx')==='hardpoint|0|bombs');
  out.fitBtn=!!pb;if(pb)pb.click();
  out.fit=[SRDB.parseConfig(graf.config).hardpoint.join(),rack('bombs'),graf.refit,f.plWhyShip(graf,new Set(),{acc:'ship'})];
  // with an Aerogineer (a Mechanic in the Aerogineer niche, level 3, in a Workshop): at once
  G.rooms.push({id:'rm_ws_t',key:'workshop',r:6,c:8,w:1,h:1,up:[]});
  const ag=window.Rebel.migrate({id:'ag1',name:'Ada Gineer',role:'Support',level:3,xp:0,assign:'room:workshop',bio:'Grease monkey who can rebuild a hauler drive.',morale:60,charTrait:'brave'});
  ag.niche='aerogineer';G.people.push(ag);
  delete graf.refit;
  out.aero=[f.refitFit(graf,'hardpoint',1,'boarding-party'),SRDB.parseConfig(graf.config).hardpoint.join(),graf.refit===undefined,rack('boarding-party')];
  // what comes off goes on the racks; the weapons follow
  out.off=[f.refitFit(graf,'hardpoint',0,null),rack('bombs'),SRDB.parseConfig(graf.config).hardpoint.join()];
  out.wpn=[f.refitFit(cross,'mount',1,'missiles'),cross.loadout.join(),rack('missiles')];
  // 3. refused, with the reason
  out.why=[f.refitFit(cross,'hardpoint',0,'bombs'),f.refitFit(bb,'hardpoint',0,'boarding-party'),f.refitFit(cross,'mount',2,'bls-t-light-repeaters'),f.refitFit(bb,'hardpoint',0,'boarding-pod')];
  // a boarding pod uses both her hardpoints: one bomb rack off first
  out.pod=[f.refitFit(bb,'hardpoint',1,null),f.refitFit(bb,'hardpoint',0,'boarding-pod'),SRDB.boards(bb.config),SRDB.parseConfig(bb.config).hardpoint.join()];
  bb.out=true;out.out=f.refitFit(bb,'hardpoint',0,null);bb.out=false;
  // the refusal is on the tab too
  f.closeWin();f.shipTab_('refit');f.openWin('ship',cross);
  const nb=$$('#winsB [data-rfx]').find(e=>e.getAttribute('data-rfx').endsWith('|bombs'));
  out.ui=[!!nb&&nb.disabled,!!nb&&/can't carry bombs/.test(nb.title)];
  f.closeWin();
  return out;
 });
 ok(r.sheet[0]==='ship'&&r.sheet[1],'1: the ship inspector has a Refit tab '+JSON.stringify(r.sheet));
 ok(r.tab[0]==='refit'&&r.tab[1]&&r.tab[2].some(t=>/^Weapon mounts 0 \/ 2/.test(t))&&r.tab[2].some(t=>/^Hardpoints 0 \/ 5 used/.test(t))&&r.tab[2].length===2,'1: Refit lists her weapon mounts and her hardpoints '+JSON.stringify(r.tab));
 ok(r.fitBtn&&r.fit[0]==='bombs'&&r.fit[1]===1&&r.fit[2]===2&&r.fit[3]==='In refit','2: a fit from the racks; 2 days grounded without an Aerogineer '+JSON.stringify(r.fit));
 ok(r.aero[0]===null&&r.aero[1]==='bombs,boarding-party'&&r.aero[2]&&r.aero[3]===0,'2: at once with an Aerogineer '+JSON.stringify(r.aero));
 ok(r.off[0]===null&&r.off[1]===2&&r.off[2]==='boarding-party','2: what comes off goes on the racks '+JSON.stringify(r.off));
 ok(r.wpn[0]===null&&r.wpn[1]==='bls-t-light-repeaters,missiles'&&r.wpn[2]===0,'2: the weapons follow the fit '+JSON.stringify(r.wpn));
 ok(/can't carry bombs/.test(r.why[0]||'')&&/passenger room/.test(r.why[1]||'')&&/2 weapon mounts/.test(r.why[2]||'')&&/2 hardpoints; that needs 3/.test(r.why[3]||''),'3: refused with the reason '+JSON.stringify(r.why));
 ok(r.pod[0]===null&&r.pod[1]===null&&r.pod[2]===true&&r.pod[3]==='boarding-pod','3: a Brickbat boards with a boarding pod, which uses both her hardpoints '+JSON.stringify(r.pod));
 ok(/out on a mission/.test(r.out||''),'3: not while she is out on a mission '+JSON.stringify(r.out));
 ok(r.ui[0]&&r.ui[1],'3: the tab greys a refused fit and says why '+JSON.stringify(r.ui));

 // 4. Type 3.5's window 3: the read-out and the demo refit
 const pg2=await b.newPage({viewport:{width:1440,height:900}});pg2.on('pageerror',e=>errs.push('35: '+e.message));
 await pg2.emulateMedia({reducedMotion:'reduce'});
 await pg2.goto(base+'?dev#arena');await pg2.waitForTimeout(900);
 const t=await pg2.evaluate(()=>{
  const X=window.DBGspace35.hc35,B=X.B,q=s=>document.querySelector('#arHc35 '+s),qa=s=>[...document.querySelectorAll('#arHc35 '+s)],out={};
  q('.bf-plan [data-act="brief"]').click();q('[data-primary="steal"]').click();B.step=3;B.part=1;X.fn.render();
  out.read=[qa('[data-refit35]').length,qa('.h35-fit__lbl').map(e=>e.textContent),qa('button[data-lo]').length,!qa('.h35-seg--lo').length];
  const btn=q('[data-refit35$="|brask"]');btn.click();
  out.pop=[!!q('.h35-fit__pop'),qa('.h35-fit__pop [data-lo]').length,(q('.h35-fit__t')||{}).textContent];
  q('.h35-fit__pop [data-lo="pods"]').click();
  out.after=[B.plan.wings.anvil.loadout.brask,!q('.h35-fit__pop'),(qa('.h35-fit__lbl').find(e=>e.closest('.h35-srow')&&/Brask/.test(e.closest('.h35-srow').textContent))||{}).textContent];
  return out;
 });
 ok(t.read[0]===3&&t.read[1].some(x=>/Bombs ×2/.test(x))&&t.read[1].some(x=>/Boarding pod/.test(x))&&t.read[2]===0&&t.read[3],'4: window 3 reads each Brickbat\'s fit, with Refit, no segmented control '+JSON.stringify(t.read));
 ok(t.pop[0]&&t.pop[1]===3&&/Demo refit/.test(t.pop[2]||''),'4: Refit opens the demo refit '+JSON.stringify(t.pop));
 ok(t.after[0]==='pods'&&t.after[1]&&/Cargo pods/.test(t.after[2]||''),'4: a demo refit changes the fit and the read-out '+JSON.stringify(t.after));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r,t},null,0));
 if(fails.length){console.error('refit-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('refit-smoke OK');
})();
