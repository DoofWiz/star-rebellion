/* Placeholder Crafting (docs/MAIN-SWITCH-HANDOFF.md S5, §5 test 6): node tools/crafting-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  the Arsenal's Crafting tab, marked a placeholder: every recipe (seven assets, four attachments) with what it unlocks,
      its cost, 0 days and a Craft button
   2  crafting costs the resources; an asset goes into G.assets (counted), an attachment onto the hangar racks; one you
      can't afford is refused with the reason
   3  a crafted asset fills a slot: a campaign mission's asset picker offers what the inventory holds, and nothing else
   (spending one uses it up and an unspent one comes home: tools/results35-smoke.js) */
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
  // 1. the tab
  f.openArsenal();f.setArCat('craft');
  out.tab=[$$('#arView .cr-card').length,$$('#arView [data-arcraft]').length,/Placeholder/.test(($('#arView .cr-note')||{}).textContent||''),
    /Launch the Ram/.test(($('#arView').textContent)||''),/0 days/.test(($('#arView').textContent)||'')];
  // 2. crafting costs the resources
  G.credits=1000;G.materials=500;G.supplies=200;G.intel=0;G.assets={};G.shipKit=[];f.renderArsenal&&f.renderArsenal();
  const c0=G.credits,m0=G.materials;
  $('#arView [data-arcraft="ram"]').click();
  out.ram=[c0-G.credits,m0-G.materials,G.assets.ram];
  $('#arView [data-arcraft="bombs"]').click();
  out.bombs=[(G.shipKit.find(x=>x.id==='bombs')||{}).n,G.assets.bombs===undefined];
  const nuke=$('#arView [data-arcraft="nuke"]');   // needs 1 Intel: none
  out.nuke=[!!nuke&&nuke.disabled,!!nuke&&/intel/i.test(nuke.title||''),f.craft('nuke')];
  G.credits=10;out.poor=f.craft('ram');G.credits=1000;
  f.closeArsenal();
  return out;
 });
 ok(r.tab[0]===11&&r.tab[1]===11&&r.tab[2]&&r.tab[3]&&r.tab[4],'1: the Crafting tab: eleven recipes, what each unlocks, 0 days, Craft, marked a placeholder '+JSON.stringify(r.tab));
 ok(r.ram[0]===150&&r.ram[1]===120&&r.ram[2]===1,'2: an Unmanned Ram costs 150c and 120m and joins G.assets '+JSON.stringify(r.ram));
 ok(r.bombs[0]===1&&r.bombs[1],'2: Bombs go on the hangar racks '+JSON.stringify(r.bombs));
 ok(r.nuke[0]&&r.nuke[1]&&/intel/i.test(r.nuke[2]||''),'2: one you can\'t afford is refused with the reason '+JSON.stringify(r.nuke));
 ok(/credits/i.test(r.poor||''),'2: short of credits, refused '+JSON.stringify(r.poor));

 // 3. the asset picker of a campaign mission offers what the inventory holds
 const t=await pg.evaluate(async()=>{
  const D=window.DBGbase,f=D.fn,G=D.G;
  const s=f.newFighter({id:'cr1',name:'Craft Cross',cls:'cross',hull:100});G.fighters.push(s);const p=G.people.find(x=>x.role==='Pilot');p.ship='cr1';p.assign='standby';f.syncUI();
  f.addMission('intercept',true);f.fly35('intercept');
  await new Promise(r=>setTimeout(r,600));
  const X=window.DBGspace35.hc35,B=X.B,q=s2=>document.querySelector('#arHc35 '+s2),qa=s2=>[...document.querySelectorAll('#arHc35 '+s2)];
  q('[data-primary="destroy"]').click();B.step=3;B.part=1;X.fn.render();
  const slot=q('[data-slot]');if(slot)slot.click();
  const offered=qa('.h35-apop [data-asset]').map(e=>e.getAttribute('data-asset'));
  return {active:SR.active,offered,assets:B.camp&&B.camp.mission.assets};
 });
 ok(t.active==='space35'&&t.offered.join()==='ram','3: a campaign mission\'s asset picker offers what the inventory holds (an Unmanned Ram) '+JSON.stringify(t));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r,t},null,0));
 if(fails.length){console.error('crafting-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('crafting-smoke OK');
})();
