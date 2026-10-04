/* Smoke test for the Black Market (Phase 2: kit only): node tools/market-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const D=window.DBGbase,f=D.fn,G=()=>D.G,KIT=f.KIT_(),out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  // --- the day-1 roll: 6 lots, 3+ kit, at least 1 weapon, no duplicates
  const M=G().market;
  out.roll=[G().day,M.lots.length,M.lots.filter(l=>l.kind==='kit').length,
    M.lots.filter(l=>KIT[l.key]&&KIT[l.key].cat==='weapon').length,M.week,M.next,
    new Set(M.lots.map(l=>l.key)).size];
  // --- no lot is heg, dropOnly or not live; stock and prices follow the rules
  out.legal=M.lots.every(l=>{const m=KIT[l.key];return !!m&&!!m.live&&!m.heg&&!m.dropOnly&&!!m.price;});
  out.stock=M.lots.every(l=>KIT[l.key].cat==='gadget'?l.stock>=2&&l.stock<=4:l.stock===1);
  out.price=M.lots.every(l=>{const b2=KIT[l.key].price;
    return l.price%2===0&&l.price>=Math.floor(b2*0.85)-2&&l.price<=Math.ceil(b2*1.25)+2&&['good','fair','steep'].includes(l.deal);});
  // --- a save and load keeps the lots; the same seed and week reroll to the same lots
  const snap=JSON.stringify(M.lots);
  f.restoreCampaign({campaign:JSON.parse(JSON.stringify(G())),started:true});
  out.keptOnLoad=JSON.stringify(G().market.lots)===snap;
  G().market=null;f.ensureMarket();
  out.reroll=JSON.stringify(G().market.lots)===snap;
  // --- the tab opens on the greeting, six cards, badge cleared
  $('#sc-base #navMarket').click();
  out.open=[!$('#bmView').hidden,$$('#bmView .bm-card').length,$('#sc-base #navMarket').getAttribute('aria-selected'),
    $('#bmBadge').hidden,G().market.unseen];
  out.greet=(($('#bmSay')||{}).textContent||'').indexOf('Six lots this week')===0;
  out.sign=$('#bmStall .bm-sign b').textContent.indexOf('Unclaimed Goods')>0;
  // --- select a weapon lot: stats row renders 3 stats from the ground WPN table
  const lots=()=>G().market.lots;
  const wi=lots().findIndex(l=>KIT[l.key].cat==='weapon');
  $$('#bmView .bm-card')[wi].click();
  out.stats=[$$('#arWho .kit-cstats div').length,($('#arWho').textContent||'').indexOf('Damage')>=0];
  // --- a buy decrements stock and credits and adds to the armory (marked as bought)
  G().credits=100000;f.renderMarket();
  const key=lots()[wi].key,p=f.lotPrice(lots()[wi]);
  const have0=(G().armory.find(a=>a.id===key)||{n:0}).n,c0=G().credits,s0=lots()[wi].stock;
  $('#arOrders [data-bmbuy]').click();
  const a1=G().armory.find(a=>a.id===key)||{n:0};
  out.buy=[c0-G().credits===p,s0-lots()[wi].stock===1,a1.n-have0===1,a1.src==='bought',
    (($('#bmSay')||{}).textContent||'').indexOf('already in your Arsenal')>=0];
  // --- unaffordable lots disable Buy; the price reads short; her line adds the broke suffix
  G().credits=0;f.renderMarket();
  const pi=lots().findIndex(l=>l.stock>0);
  $$('#bmView .bm-card')[pi].click();
  const buyBtn=$('#arOrders [data-bmbuy]');
  out.poor=[!!buyBtn&&buyBtn.disabled,(buyBtn&&buyBtn.title)||'',
    $$('#bmView .bm-card')[pi].innerHTML.indexOf('is-short')>=0,
    (($('#bmSay')||{}).textContent||'').indexOf('I don’t do credit')>=0];
  // --- Buy all is disabled with stock 1; enabled on a multi-unit lot and sells it out
  G().credits=100000;f.renderMarket();
  const oneI=lots().findIndex(l=>l.stock===1);
  if(oneI>=0){$$('#bmView .bm-card')[oneI].click();out.allOne=$('#arOrders [data-bmbuyall]').disabled;}
  else out.allOne=true;
  // the weekly roll may hold no gadget lot; force a multi-unit lot so Buy all is always exercised
  let gi=lots().findIndex(l=>l.stock>1);
  if(gi<0){gi=lots().findIndex(l=>l.kind==='kit');if(gi>=0){lots()[gi].stock=3;f.renderMarket();}}
  if(gi>=0){
    $$('#bmView .bm-card')[gi].click();
    const gl=lots()[gi],gk=gl.key,gn=gl.stock,gp=f.lotPrice(gl),cg=G().credits,g0=(G().armory.find(a=>a.id===gk)||{n:0}).n;
    $('#arOrders [data-bmbuyall]').click();
    out.buyAll=[cg-G().credits===gp*gn,lots()[gi].stock===0,
      ((G().armory.find(a=>a.id===gk)||{n:0}).n-g0)===gn,
      $$('#bmView .bm-card')[gi].className.indexOf('is-sold')>=0,
      $$('#bmView .bm-card')[gi].innerHTML.indexOf('bm-soldstamp')>=0];
  } else out.buyAll=['no multi-unit lot rolled'];
  // --- Advance day to day 8 restocks (fresh lots, week 2, comm, badge once the stall is closed)
  const before=JSON.stringify(lots());
  f.closeMarket();
  while(G().day<8)f.advanceDay();
  out.restock=[G().day,G().market.week,G().market.next,JSON.stringify(G().market.lots)!==before,G().market.lots.length];
  out.comm=G().news.some(n=>n.html.indexOf('new stock at Nyx')>=0);
  out.badge=[G().market.unseen,!$('#bmBadge').hidden,$('#bmBadge').textContent];
  // --- the Nyx Access discount applies at display and purchase; the perk row goes solid
  const nyx=G().planets.find(x=>x.id==='nyx');
  nyx.known=nyx.access=nyx.scouted=true;if(!nyx.acc)nyx.acc=1;
  f.openMarket();
  out.badgeCleared=[$('#bmBadge').hidden,G().market.unseen];
  const di=lots().findIndex(l=>l.stock>0);
  const dl=lots()[di],disc=Math.round(dl.price*0.9);
  out.disc=[f.lotPrice(dl)===disc,$$('#bmView .bm-card')[di].textContent.indexOf(String(disc))>=0];
  G().credits=100000;$$('#bmView .bm-card')[di].click();
  const cd=G().credits;
  $('#arOrders [data-bmbuy]').click();
  out.discBuy=cd-G().credits===disc;
  out.perk=$('#railMarket .bm-perk').className.indexOf('is-on')>=0;
  // the restock countline rides the command bar's count slot
  out.note=($('#dockNote').textContent||'').indexOf('Restock in')>=0;
  return out;
 });
 ok(r.roll[0]===1&&r.roll[1]===6&&r.roll[2]>=3&&r.roll[3]>=1&&r.roll[4]===1&&r.roll[5]===8&&r.roll[6]===6,'day-1 roll: 6 unique lots, 3+ kit, 1+ weapon, week 1, next day 8 '+r.roll);
 ok(r.legal,'no lot is heg, dropOnly or not live');
 ok(r.stock,'stock: gadgets 2-4, everything else 1');
 ok(r.price,'prices: base x swing, rounded to the nearest 2, with a deal tag');
 ok(r.keptOnLoad,'a save and load keeps the week’s lots');
 ok(r.reroll,'the same seed and week reroll to the same lots');
 ok(r.open[0]===true&&r.open[1]===6&&r.open[2]==='true'&&r.open[3]===true&&r.open[4]===0,'tab opens with six cards and clears the badge '+r.open);
 ok(r.greet&&r.sign,'greeting line and the stall sign '+[r.greet,r.sign]);
 ok(r.stats[0]===3&&r.stats[1],'weapon stats row: Damage / Range / Shots '+r.stats);
 ok(r.buy.every(Boolean),'a buy: credits down, stock down, armory up, marked bought, her line changes '+r.buy);
 ok(r.poor[0]===true&&/more credits/.test(r.poor[1])&&r.poor[2]&&r.poor[3],'unaffordable: Buy disabled with the reason, red price, broke suffix '+r.poor);
 ok(r.allOne===true,'Buy all is disabled with stock 1');
 ok(Array.isArray(r.buyAll)&&r.buyAll.length===5&&r.buyAll.every(Boolean),'Buy all empties a multi-unit lot and stamps it Sold '+r.buyAll);
 ok(r.restock[0]===8&&r.restock[1]===2&&r.restock[2]===15&&r.restock[3]&&r.restock[4]===6,'day 8 restocks: week 2, next day 15, fresh lots '+r.restock);
 ok(r.comm,'the restock comm posted');
 ok(r.badge[0]===6&&r.badge[1]===true&&r.badge[2]==='6','the tab is badged 6 until opened '+r.badge);
 ok(r.badgeCleared[0]===true&&r.badgeCleared[1]===0,'opening the stall clears the badge '+r.badgeCleared);
 ok(r.disc[0]&&r.disc[1],'the Nyx Access discount shows on the card '+r.disc);
 ok(r.discBuy,'the Nyx Access discount applies at purchase');
 ok(r.perk,'the perk row goes solid with Access to Nyx');
 ok(r.note,'the command bar carries the restock count line');
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'market-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
