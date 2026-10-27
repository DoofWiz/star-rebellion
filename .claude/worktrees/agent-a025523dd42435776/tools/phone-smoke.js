/* Smoke test for the phone pass (390x844, handoff §6/§7.5): node tools/phone-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1300);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const cs=el=>getComputedStyle(el);
  const cols=el=>cs(el).gridTemplateColumns.split(' ').length;
  const shell=$('#sc-base .sr-shell');
  const label=()=>$('#sc-base #drawerBtn').getAttribute('aria-label');
  // --- Arsenal: dossier stacks, 4-column grid, Loadouts drawer
  f.openArsenal();
  out.arStack=cs($('#arView .ar-body')).flexDirection==='column';
  out.arCols=cols($('#arView .ar-grid'));
  out.arLabel=label();
  out.tabsFit=$('#sc-base .sr-tabs').getBoundingClientRect().width<=390;
  out.shortTab=[cs($('#sc-base .nav-market-s')).display!=='none',cs($('#sc-base .nav-market-l')).display==='none'];
  // the drawer holds the Loadouts; everything else in the rail is hidden
  $('#sc-base #drawerBtn').click();
  out.drawerOpen=shell.classList.contains('is-drawer-open');
  out.drawerHas=[!$('#railArsenal').hidden,cs($('#sc-base #pilotList').closest('section')).display==='none'];
  // tapping a slot closes the drawer and opens the picker over the view, anchored to the viewport
  $('#railArsenal .ar-slot[data-arslot]').click();
  const ov=$('#arView .bs-overlay');
  out.slotTap=[!shell.classList.contains('is-drawer-open'),!!ov,ov&&cs(ov).position==='fixed'];
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  out.escOverlay=[!$('#arView .bs-overlay'),f.getArOpen()];
  // bays go one column
  G().fighters.push(f.newFighter({id:'pt1',name:'Talon 1',cls:'talon',hull:100}));
  f.setArCat('ships');
  out.bayCols=cols($('#arView .ar-bays'));
  f.setArCat('all');
  // --- Black Market: 2-column grid, the strip, hidden comms, the fence in the drawer
  $('#sc-base #drawerBtn').click();   // leave the drawer open to prove the view switch closes it
  f.openMarket();
  out.bmDrawerReset=!shell.classList.contains('is-drawer-open');
  out.bmLabel=label();
  out.bmCols=cols($('#bmView .bm-grid'));
  out.strip=cs($('.bm-strip')).display==='flex';
  out.comms=cs($('#sc-base .sr-comms')).display==='none';
  $('#sc-base #drawerBtn').click();
  out.fence=[shell.classList.contains('is-drawer-open'),!!$('#railMarket .bm-fence'),!$('#railMarket').hidden];
  f.closeMarket();
  out.backLabel=label();
  out.drawerClosed=!shell.classList.contains('is-drawer-open');
  return out;
 });
 ok(r.arStack,'Arsenal: the dossier stacks above the grid');
 ok(r.arCols===4,'Arsenal: the grid goes 4 columns, got '+r.arCols);
 ok(r.arLabel==='Loadouts','Arsenal: the drawer button reads Loadouts, got '+r.arLabel);
 ok(r.tabsFit,'the five tabs fit the phone width');
 ok(r.shortTab[0]&&r.shortTab[1],'the fifth tab shortens to Market '+r.shortTab);
 ok(r.drawerOpen&&r.drawerHas[0]&&r.drawerHas[1],'the drawer holds Loadouts and hides the crew lists '+[r.drawerOpen,r.drawerHas]);
 ok(r.slotTap.every(Boolean),'a slot tap closes the drawer and opens the picker fixed over the view '+r.slotTap);
 ok(r.escOverlay[0]&&r.escOverlay[1]===true,'Escape closes the picker only '+r.escOverlay);
 ok(r.bayCols===1,'bays go one column, got '+r.bayCols);
 ok(r.bmDrawerReset,'switching views closes a left-open drawer');
 ok(r.bmLabel==='Sweet Tooth','Market: the drawer button reads Sweet Tooth, got '+r.bmLabel);
 ok(r.bmCols===2,'Market: the grid goes 2 columns, got '+r.bmCols);
 ok(r.strip,'the Sweet Tooth strip shows above the grid');
 ok(r.comms,'comms hide on the market view');
 ok(r.fence.every(Boolean),'the full fence panel lives in the drawer '+r.fence);
 ok(r.backLabel==='Crew and flight'&&r.drawerClosed,'leaving the market restores the drawer label '+[r.backLabel,r.drawerClosed]);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'phone-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
