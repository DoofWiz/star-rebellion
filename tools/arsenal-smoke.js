/* Smoke test for the Arsenal tab (Phase 1: tab, Head/Body slots, Sell): node tools/arsenal-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const KIT=f.KIT_();
  // --- the tab opens, and all 7 chips render
  $('#sc-base #navArsenal').click();
  out.open=[!$('#arView').hidden,$$('#arView [data-arcat]').length,$('#sc-base #navArsenal').getAttribute('aria-selected'),f.getArOpen()];
  out.title=$('#sc-base .sr-topbar__title').textContent;
  // --- "All kit": tile slots + free cells add up to the capacity row; one locked block follows
  const used=G().armory.filter(a=>a.n>0).reduce((n,a)=>{const m=KIT[a.id]||{w:2,h:1};return n+m.w*m.h;},0);
  const cap=f.gearCapacity?f.gearCapacity():24+12*f.tilesOf('store');
  out.cells=[used,cap,$$('#arView .ar-free').length,$$('#arView .ar-locked').length];
  out.capRow=($('#arCap')||{}).textContent||'';
  // --- selecting the Akli lights exactly its holders' slots in the Loadouts rail
  $('#arView [data-arsel="kit:akli"]').click();
  const lit=$$('#railArsenal .ar-slot.is-match');
  out.match=[lit.length,f.carried('akli'),lit.every(el=>{
    const [pid,k,i]=el.getAttribute('data-arslot').split(':');
    const p=G().people.find(x=>x.id===pid);
    return p&&f.slotGet(p,{k,i:+i})==='akli';
  })];
  // --- selling a free unit adds floor(140*0.3) credits and decrements the count
  const c0=G().credits,n0=G().armory.find(a=>a.id==='akli').n;
  out.sellBtn=($('#arActs [data-arsell]')||{}).textContent;
  out.sellFree=f.freeOf('akli');
  $('#arActs [data-arsell]').click();
  out.sell=[G().credits-c0,n0-G().armory.find(a=>a.id==='akli').n,f.sellPrice('akli')];
  // --- selling the carbine (Hegemony issue) is disabled
  G().armory.push({id:'carbine',name:'Peacekeeper Carbine',n:1,desc:'x'});f.syncUI();
  $('#arView [data-arsel="kit:carbine"]').click();
  const sb=$('#arActs [data-arsell]');
  out.carbine=[!!sb&&sb.disabled,(sb&&sb.title)||'',($('#arActs')||{}).textContent||''];
  out.carbineWhy=f.sellWhy('carbine');
  // the carbine tile reads as Hegemony kit
  out.foeTile=$('#arView [data-arsel="kit:carbine"]').className.indexOf('is-foe')>=0;
  // --- tapping a loadout slot opens the picker overlay; Escape closes it
  const anySlot=$('#railArsenal .ar-slot[data-arslot]');
  anySlot.click();
  out.picker=!!$('#arView .bs-overlay');
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  out.pickerClosed=[!$('#arView .bs-overlay'),f.getArOpen()];
  // --- an old save loads with head/body added and Hardhats auto-equipped
  f.closeArsenal();
  const data=JSON.parse(JSON.stringify(G()));
  for(const p of data.people)if(p.gear){delete p.gear.head;delete p.gear.body;}
  data.armory.push({id:'hardhat',name:'Frontier Hardhat',n:2,desc:'x'});
  f.restoreCampaign({campaign:data,started:true});
  const crew=G().people.filter(p=>!p.auto&&window.Rebel.gearSlots(p).length);
  out.migrate=[
    crew.every(p=>p.gear&&'head' in p.gear&&'body' in p.gear),
    f.carried('hardhat'),
    G().people.filter(p=>p.gear&&p.gear.head==='hardhat').length,
  ];
  // the most experienced carrier gets one first
  const byLvl=crew.slice().sort((a,b)=>b.level-a.level||(b.rank||0)-(a.rank||0));
  out.bestFirst=byLvl[0].gear.head==='hardhat';
  // cosmetic hats exist in KIT but with no benefit; non-live items are never auto-equipped
  out.kitRows=[!!KIT.cowboyhat&&KIT.cowboyhat.q===0,!!KIT.stim&&!KIT.stim.live,f.marketable('carbine')===false,f.marketable('akli')===true];
  return out;
 });
 ok(r.open[0]===true&&r.open[1]===7&&r.open[2]==='true'&&r.open[3]===true,'tab opens with 7 chips '+r.open);
 ok(r.title==='Arsenal','top bar reads Arsenal, got '+r.title);
 ok(r.cells[0]+r.cells[2]===r.cells[1]&&r.cells[3]===1,'tiles + free cells = capacity, one locked block '+r.cells);
 ok(r.capRow.indexOf(r.cells[0]+'')>=0&&r.capRow.indexOf(r.cells[1]+'')>=0,'capacity row shows used/cap '+r.capRow);
 ok(r.match[0]===r.match[1]&&r.match[0]>0&&r.match[2],'selected Akli lights exactly its holders’ slots '+r.match);
 ok(r.sellFree>0&&String(r.sellBtn).indexOf('Sell +42')>=0,'sell order reads Sell +42 '+r.sellBtn);
 ok(r.sell[0]===42&&r.sell[1]===1&&r.sell[2]===42,'selling a free Akli adds floor(140*0.3)=42 and decrements '+r.sell);
 ok(r.carbine[0]===true&&/Hegemony/.test(r.carbine[1])&&/won’t touch|won't touch/.test(r.carbine[2]),'selling the carbine is disabled, the reason under the buttons in the dossier '+r.carbine);
 ok(r.carbineWhy==='Sweet Tooth won’t touch Hegemony kit','sellWhy for the carbine '+r.carbineWhy);
 ok(r.foeTile,'Hegemony kit gets the blue tile');
 ok(r.picker&&r.pickerClosed[0]&&r.pickerClosed[1]===true,'a loadout slot opens the picker, Escape closes it only '+[r.picker,r.pickerClosed]);
 ok(r.migrate[0]&&r.migrate[1]===2&&r.migrate[2]===2,'old save gains head/body and the Hardhats are handed out '+r.migrate);
 ok(r.bestFirst,'the best carrier gets a Hardhat first');
 ok(r.kitRows.every(Boolean),'KIT rows: cosmetic hats q0, stim not live, carbine not marketable, akli marketable '+r.kitRows);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'arsenal-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
