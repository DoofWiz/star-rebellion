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
  // --- no lot is heg, dropOnly or not live; stock and prices follow the rules (merc lots carry a record instead)
  out.legal=M.lots.every(l=>l.kind==='merc'?(!!l.merc&&!!l.merc.name):(()=>{const m=KIT[l.key];return !!m&&!!m.live&&!m.heg&&!m.dropOnly&&!!m.price;})());
  out.stock=M.lots.every(l=>l.kind==='merc'?l.stock===1:(KIT[l.key].cat==='gadget'?l.stock>=2&&l.stock<=4:l.stock===1));
  out.price=M.lots.every(l=>{
    if(l.kind==='merc')return l.price>=380&&l.price<=600;
    const b2=KIT[l.key].price;
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
  const wi=lots().findIndex(l=>l.kind==='kit'&&KIT[l.key].cat==='weapon');
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
  const pi=lots().findIndex(l=>l.kind==='kit'&&l.stock>0);
  $$('#bmView .bm-card')[pi].click();
  const buyBtn=$('#arOrders [data-bmbuy]');
  out.poor=[!!buyBtn&&buyBtn.disabled,(buyBtn&&buyBtn.title)||'',
    $$('#bmView .bm-card')[pi].innerHTML.indexOf('is-short')>=0,
    (($('#bmSay')||{}).textContent||'').indexOf('I don’t do credit')>=0];
  // --- Buy all is disabled with stock 1; enabled on a multi-unit lot and sells it out
  G().credits=100000;f.renderMarket();
  const oneI=lots().findIndex(l=>l.kind==='kit'&&l.stock===1);
  if(oneI>=0){$$('#bmView .bm-card')[oneI].click();out.allOne=$('#arOrders [data-bmbuyall]').disabled;}
  else out.allOne=true;
  const gi=lots().findIndex(l=>l.kind==='kit'&&l.stock>1);
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
  const di=lots().findIndex(l=>l.kind==='kit'&&l.stock>0);
  const dl=lots()[di],disc=Math.round(dl.price*0.9);
  out.disc=[f.lotPrice(dl)===disc,$$('#bmView .bm-card')[di].textContent.indexOf(String(disc))>=0];
  G().credits=100000;$$('#bmView .bm-card')[di].click();
  const cd=G().credits;
  $('#arOrders [data-bmbuy]').click();
  out.discBuy=cd-G().credits===disc;
  out.perk=$('#railMarket .bm-perk').className.indexOf('is-on')>=0;
  // the restock countline rides the command bar's count slot
  out.note=($('#dockNote').textContent||'').indexOf('Restock in')>=0;
  // ===== Phase 3: mercenaries =====
  f.closeMarket();
  let mseed=0;
  for(let s2=1;s2<500;s2++){G().seed=s2;f.rollMarket();if(G().market.lots.some(l=>l.kind==='merc')){mseed=s2;break;}}
  out.mercSeed=mseed>0;
  f.openMarket();
  const mi=lots().findIndex(l=>l.kind==='merc');
  const ml=()=>G().market.lots[mi];
  const mrec=ml().merc;
  out.mercLot=[ml().stock===1,ml().price>=380&&ml().price<=600,['Soldier','Pilot'].includes(mrec.role),
    mrec.level>=2&&mrec.level<=3,mrec.ownKit.secondary==='cowboy',mrec.role==='Pilot'||!!mrec.ownKit.primary];
  f.setBmSel(mi);
  const mcard=$$('#bmView .bm-card')[mi];
  out.mercCard=[mcard.textContent.indexOf('/ 14 days')>=0,mcard.textContent.indexOf('Brings own kit')>=0,mcard.textContent.indexOf('Level '+mrec.level)>=0];
  out.hireLbl=(($('#arOrders [data-bmbuy]')||{}).textContent||'').indexOf('Hire')>=0;
  out.mercStats=($('#arWho').textContent||'').indexOf('Brings own')>=0;
  // hiring needs a free bunk: the order is greyed with the reason, and her line says so
  const cap2=f.bunkCap();
  let fillI=0;
  while(G().people.filter(p=>!p.auto).length<cap2){G().people.push(window.Rebel.migrate({id:'fill'+(fillI++),name:'Filler '+fillI,role:'Support',level:1,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'}));}
  G().credits=100000;f.renderMarket();
  const hbtn=$('#arOrders [data-bmbuy]');
  out.noBunk=[hbtn.disabled,hbtn.title,(($('#bmSay')||{}).textContent||'').indexOf('bunk')>=0];
  G().people=G().people.filter(p=>!String(p.id).startsWith('fill'));
  f.renderMarket();
  // hire: credits down by the fee, queued for tomorrow, the lot sells out
  const hc0=G().credits,hfee=f.lotPrice(ml());
  $('#arOrders [data-bmbuy]').click();
  out.hire=[hc0-G().credits===hfee,(G().mercQ||[]).length===1,ml().stock===0,
    G().news.some(n=>n.html.indexOf('14-day contract')>=0),(($('#bmSay')||{}).textContent||'').indexOf('at your door by morning')>=0];
  // arrival the next day with their own kit in their slots
  f.closeMarket();
  f.advanceDay();
  const mp=G().people.find(p=>p.merc&&p.id===mrec.id);
  out.arrive=[!!mp,mp&&mp.merc.until===G().day+14,mp&&mp.merc.fee===hfee,(G().mercQ||[]).length===0,
    mp&&mp.gear.secondary===mp.ownKit.secondary,mp&&(!mp.ownKit.primary||mp.gear.primary===mp.ownKit.primary)];
  // own kit is locked: no manual pick, never counted against armory stock, reconcile keeps it
  out.ownLock=[f.applyGearPick(mp.id,'secondary',0,null)===false,f.isOwnSlot(mp,{k:'secondary',i:0})];
  out.ownCount=f.carried('cowboy')<=(G().armory.find(a=>a.id==='cowboy')||{n:0}).n;
  f.reconcileGear();
  out.ownKept=mp.gear.secondary===mp.ownKit.secondary;
  // the personnel file: Mercenary tag and the locked own-kit row
  f.openWin('person',mp);
  out.mercFile=[$('#winCardB').innerHTML.indexOf('Mercenary')>=0,!!$('#winCardB [data-gear-slot="'+mp.id+':secondary:0"]:disabled')];
  f.closeWin();
  // the Arsenal rail: purple card, days tag, locked own-kit slot
  f.openArsenal();
  out.mercRail=[!!$('#railArsenal .ar-row.is-merc'),!!$('#railArsenal .ar-row.is-merc .ar-slot.is-lock'),
    ($('#railArsenal .ar-row.is-merc').textContent||'').indexOf('days left')>=0];
  f.closeArsenal();
  // morale: cause-wide events skip mercs; team events reach them; contract missions count
  const mor0=mp.morale;
  f.moraleAll(-6,'loss');
  out.mercMorale=[mp.morale===mor0];
  f.moraleAll(3,'win',[mp.id],3);
  out.mercMorale.push(mp.morale>mor0);
  const ms0=mp.merc.missions;f.creditMission(mp);
  out.mercCredit=mp.merc.missions===ms0+1;
  // no Hero roll while on a contract (a plain rebel in the same spot becomes one)
  mp.level=3;mp.missions=4;mp.heroP=0.02;
  f.setRng(()=>0);
  out.noHero=f.heroCheck({win:true,people:[{id:mp.id,kills:3}]},null,null)===null&&mp.role!=='Hero';
  const dax=G().people.find(p=>p.id==='dax');dax.level=3;dax.missions=4;dax.heroP=0.02;
  out.ctrlHero=!!f.heroCheck({win:true,people:[{id:dax.id,kills:3}]},null,null)&&dax.role==='Hero';
  f.setRng(Math.random);
  // contract's up on the due day: Renew charges the fee and resets the clock
  mp.merc.until=G().day;
  G().credits=50000;
  f.advanceDay();
  let guard=0;
  while(f.getWin()&&f.getWin()!=='contract'&&guard++<6)f.closeWin();
  out.contractWin=f.getWin()==='contract';
  const rc0=G().credits;
  $('#winCardB [data-mercrenew]').click();
  out.renew=[rc0-G().credits===mp.merc.fee,mp.merc.until===G().day+14];
  // Let them go: they leave and their own kit leaves with them
  const p2=window.Rebel.migrate({id:'m2x',name:'Vex Argo',role:'Soldier',level:2,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'});
  p2.merc={until:G().day,fee:420,missions:0};
  p2.ownKit={primary:'longiron',secondary:'cowboy'};
  p2.gear={primary:'longiron',secondary:'cowboy',head:null,body:null,gad:[null,null]};
  G().people.push(p2);
  const li0=(G().armory.find(a=>a.id==='longiron')||{n:0}).n;
  f.advanceDay();
  guard=0;while(f.getWin()&&f.getWin()!=='contract'&&guard++<6)f.closeWin();
  out.goWin=f.getWin()==='contract';
  $('#winCardB [data-mercgo]').click();
  out.letgo=[!G().people.some(p=>p.id==='m2x'),((G().armory.find(a=>a.id==='longiron')||{n:0}).n)===li0];
  // Join the cause: 3+ missions and morale 70+; free, own kit moves into the armory
  const p3=window.Rebel.migrate({id:'m3x',name:'Rook Halley',role:'Soldier',level:3,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'});
  p3.merc={until:G().day,fee:500,missions:3};
  p3.morale=80;
  p3.ownKit={primary:'scatter',secondary:'cowboy'};
  p3.gear={primary:'scatter',secondary:'cowboy',head:null,body:null,gad:[null,null]};
  G().people.push(p3);
  const sc0=(G().armory.find(a=>a.id==='scatter')||{n:0}).n,cw0=(G().armory.find(a=>a.id==='cowboy')||{n:0}).n;
  f.advanceDay();
  guard=0;while(f.getWin()&&f.getWin()!=='contract'&&guard++<6)f.closeWin();
  out.joinBtn=!!$('#winCardB [data-mercjoin]');
  $('#winCardB [data-mercjoin]').click();
  out.join=[!p3.merc,!p3.ownKit,((G().armory.find(a=>a.id==='scatter')||{n:0}).n)===sc0+1,
    ((G().armory.find(a=>a.id==='cowboy')||{n:0}).n)===cw0+1,G().people.some(p=>p.id==='m3x')];
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
 // Phase 3: mercenaries
 ok(r.mercSeed,'a seed with a mercenary lot was found');
 ok(r.mercLot.every(Boolean),'merc lot: stock 1, fee 380-600, Soldier/Pilot level 2-3, own kit rolled '+r.mercLot);
 ok(r.mercCard.every(Boolean),'merc card: / 14 days, Brings own kit, level line '+r.mercCard);
 ok(r.hireLbl&&r.mercStats,'the order reads Hire and the stats show Brings own '+[r.hireLbl,r.mercStats]);
 ok(r.noBunk[0]===true&&r.noBunk[1]==='Needs a free bunk'&&r.noBunk[2],'hire needs a free bunk: greyed with the reason, her line says so '+r.noBunk);
 ok(r.hire.every(Boolean),'hire: fee paid, queued, sold out, contract comm, her door line '+r.hire);
 ok(r.arrive.every(Boolean),'arrival next day: p.merc until +14, fee kept, own kit in the slots '+r.arrive);
 ok(r.ownLock.every(Boolean)&&r.ownCount&&r.ownKept,'own kit locked, uncounted and kept by reconcile '+[r.ownLock,r.ownCount,r.ownKept]);
 ok(r.mercFile.every(Boolean),'personnel file: Mercenary tag and locked own-kit row '+r.mercFile);
 ok(r.mercRail.every(Boolean),'Arsenal rail: purple merc card, days tag, locked slot '+r.mercRail);
 ok(r.mercMorale[0]&&r.mercMorale[1],'mercs skip cause-wide morale but feel team morale '+r.mercMorale);
 ok(r.mercCredit,'contract missions count where creditMission runs');
 ok(r.noHero&&r.ctrlHero,'no Hero roll while on a contract (control rebel still rolls) '+[r.noHero,r.ctrlHero]);
 ok(r.contractWin&&r.renew.every(Boolean),'contract window: Renew charges the fee and resets the clock '+[r.contractWin,r.renew]);
 ok(r.goWin&&r.letgo.every(Boolean),'Let them go: they leave and their kit leaves with them '+[r.goWin,r.letgo]);
 ok(r.joinBtn&&r.join.every(Boolean),'Join the cause: free, contract gone, own kit joins the armory '+[r.joinBtn,r.join]);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'market-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
