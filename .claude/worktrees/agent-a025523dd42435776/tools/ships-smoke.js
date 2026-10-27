/* The ships database's hardpoints, configurations and attachments (docs/MAIN-SWITCH-HANDOFF.md S2, §5 test 3):
   node tools/ships-smoke.js (needs NODE_PATH=$(npm root -g)).
   1  every ship row has hardpoints (its weapon mounts = weapon_slots) and a stock configuration that fits them
   2  the Brickbat and the FL-400 are rows (by id and by legacy key): the Brickbat ownable, buyable, on a small pad, with no
      passenger room;
      the FL-400 not ownable and too big for any pad; Type 3.5 flies the FL-400 at its own pace over her row
   3  a pirate Cross carries a configuration a stock one doesn't, in High Command's sim too (missiles); every ship there
      carries a configuration
   4  configurations are checked: an item on the wrong slot, too many on a slot, a boarding party with no passenger
      room are refused with the reason; a boarding pod lets a ship with no passenger room board
   5  the campaign: every owned ship has a configuration (Dustfall comes with missiles, a stock Cross has none, the
      Marta her door gun, a Brickbat her bomb racks); an old save gets one from its weapons (MIGRATIONS 15 -> 16) */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'?dev#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=SRDB,out={};
  // 1. every row: hardpoints and a stock configuration that fits
  out.rows=D.raw.ships.map(s=>{const h=D.hardpoints(s);return [s.id,!!s.hardpoints,h.primary+h.secondary===s.weapon_slots,D.configWhy(s,D.stockConfig(s))];});
  // 2. the two new rows
  const bb=D.ship('brickbat'),fl=D.ship('fl400');
  out.bb=[bb&&bb.id,bb===D.ship('bx-17-brickbat'),bb&&bb.ownable,bb&&bb.manufacturer,window.SR_ART.padFor(bb.size),D.stockConfig(bb).pylon.join(),D.hardpoints(bb).internal,
    !!(window.DBGbase.fn.SHIP_PRICE_()||{}).brickbat];
  out.fl=[fl&&fl.id,fl===D.ship('ga-fl-400'),fl&&fl.ownable,fl&&fl.manufacturer,window.SR_ART.padFor(fl.size),window.SIMHC35.HC35_CLASSES.fl400.hull===fl.hull&&window.SIMHC35.HC35_CLASSES.fl400.straight_min===0.2];
  // 3. a pirate Cross fitted unlike a stock one, in the sim too
  const pir=Enemies.space('pirate-cross'),stock=D.stockConfig(D.ship('cross'));
  out.pirate=[pir.ship==='ft-4-cross',D.parseConfig(pir.config).secondary.join(),stock.secondary.length,D.configWhy(D.ship('cross'),pir.config)];
  const SIM=window.SIMHC;window.SIMHC35.detach();
  SIM.build({id:'s2_ships',title:'S2',rulesets:['hc'],wings:[{id:'w',name:'W',at:[1000,2000,0],order:{kind:'hold'},tactic:'auto',ships:[
      {cls:'cross',name:'Stock',pilot:{preset:'regular'}},{cls:'cross',name:'Mod',config:'primary:bls-t-light-repeaters|secondary:missiles',pilot:{preset:'regular'}},
      {cls:'brickbat',name:'Bb',pilot:{preset:'regular'}},{cls:'graf',name:'Gf',config:'internal:boarding-party',pilot:{preset:'regular'}}]}],
    enemies:[{type:'pirate-cross',id:'pir',name:'Pirate',at:[5000,2000,Math.PI]}],points:{jump:{x:600,y:2000,label:'Jump'}},extract:'jump',
    objectives:[{id:'o',kind:'destroy',targets:['pir'],text:'x',primary:true}],reinforce:{secs:999,edge:'E',force:[]},rules:[],cp:3},{seed:3});
  const S=SIM.S,by=n=>S.ships.find(s=>s.name===n||s.id===n),wn=s=>s.wpns.map(q=>q.w.id).join('+');
  out.sim=[wn(by('Stock')),wn(by('Mod')),wn(by('pir')),wn(by('Bb')),by('Gf').marines,S.ships.every(s=>!!s.config)];
  // 4. the checks
  const cross=D.ship('cross'),talon=D.ship('talon'),graf=D.ship('graf');
  out.why=[D.configWhy(cross,'internal:boarding-party'),D.configWhy(cross,'primary:bombs'),D.configWhy(cross,'primary:bls-t-light-repeaters|primary:bls-t-light-repeaters'),
    D.configWhy(talon,'pylon:boarding-pod'),D.boards('pylon:boarding-pod'),D.configWhy(graf,'internal:boarding-party'),D.boards('internal:boarding-party'),D.boards('pylon:bombs'),D.configWhy(cross,'pylon:nothing'),
    D.configWhy(cross,'pylon:bombs'),D.configWhy(graf,'pylon:bombs|pylon:bombs'),D.configWhy(D.ship('brickbat'),'internal:boarding-party'),D.configWhy(D.ship('brickbat'),'pylon:boarding-pod')];
  // 5. the campaign
  const f=window.DBGbase.fn,G=window.DBGbase.G;
  const mk=o=>f.newFighter(o);
  const dust=mk({id:'t_d',name:'Dustfall',cls:'cross',hull:85}),cr=mk({id:'t_c',name:'Cross 1',cls:'cross',hull:100}),
    marta=mk({id:'t_m',name:'Marta',cls:'graf',hull:70}),bbF=mk({id:'t_b',name:'Brickbat 1',cls:'brickbat',hull:100});
  out.camp=[dust.config.secondary.join(),dust.loadout.join(),cr.config.secondary.length,cr.loadout.join(),marta.config.primary.join(),bbF.config.pylon.join(),bbF.loadout.join(),
    [dust,cr,marta,bbF].every(x=>D.configWhy(D.ship(x.cls),x.config)===null)];
  // an old save: ships without configurations, at version 15
  G.fighters.push({id:'old_c',name:'Old Cross',cls:'cross',hull:90,out:false,loadout:['bls-t-light-repeaters','missiles']},{id:'old_g',name:'Old Graf',cls:'graf',hull:90,out:false,loadout:['door-mounted-gun']});
  const v=f.saveVersion();G.v=15;const from=f.upgradeSave();
  const oc=G.fighters.find(x=>x.id==='old_c'),og=G.fighters.find(x=>x.id==='old_g');
  out.mig=[v,from,G.v,oc.config&&oc.config.primary.join(),oc.config&&oc.config.secondary.join(),og.config&&og.config.primary.join(),G.fighters.every(x=>!!x.config)];
  return out;
 });
 const bad=r.rows.filter(x=>!x[1]||!x[2]||x[3]!==null);
 ok(r.rows.length>=13&&!bad.length,'1: every ship row has hardpoints and a stock configuration that fits '+JSON.stringify(bad));
 ok(r.bb[0]==='bx-17-brickbat'&&r.bb[1]&&r.bb[2]===true&&r.bb[3]==='core'&&r.bb[4]==='small'&&r.bb[5]==='bombs,bombs'&&r.bb[6]===0&&r.bb[7],'2: the Brickbat: a row, ownable, CORE, a small pad, bomb racks, no passenger room (the designer, 21 October), buyable '+JSON.stringify(r.bb));
 ok(r.fl[0]==='ga-fl-400'&&r.fl[1]&&r.fl[2]===false&&r.fl[3]==='general-astronautics'&&r.fl[4]===null&&r.fl[5],'2: the FL-400: a row, not ownable, too big for a pad, 3.5\'s pace over her row '+JSON.stringify(r.fl));
 ok(r.pirate[0]&&r.pirate[1]==='missiles'&&r.pirate[2]===0&&r.pirate[3]===null,'3: a pirate Cross carries missiles a stock one doesn\'t '+JSON.stringify(r.pirate));
 ok(r.sim[0]==='bls-t-light-repeaters'&&r.sim[1]==='bls-t-light-repeaters+missiles'&&r.sim[2]==='bls-t-light-repeaters+missiles'&&r.sim[3]==='bls-t-light-repeaters'&&r.sim[4]===true&&r.sim[5],
  '3: in the sim: a stock Cross has no missiles, a configured one and the pirate do; a Graf with a boarding party boards; every ship has a configuration '+JSON.stringify(r.sim));
 const w=r.why;
 ok(/passenger room/.test(w[0]||'')&&/pylon/.test(w[1]||'')&&/1 primary hardpoint/.test(w[2]||'')&&w[3]===null&&w[4]===true&&w[5]===null&&w[6]===true&&w[7]===false&&/unknown/.test(w[8]||'')&&/can't carry bombs/.test(w[9]||'')&&w[10]===null&&/no internal|has no inside|internal hardpoint|no passenger room/.test(w[11]||'')&&w[12]===null,
  '4: configurations are checked, with reasons; a boarding pod lets a Talon board; bombs on the Graf and the Brickbat only; the Brickbat boards with a pod '+JSON.stringify(w));
 ok(r.camp[0]==='missiles'&&r.camp[1]==='bls-t-light-repeaters,missiles'&&r.camp[2]===0&&r.camp[3]==='bls-t-light-repeaters'&&r.camp[4]==='door-mounted-gun'&&r.camp[5]==='bombs,bombs'&&r.camp[6]==='bls-t-light-repeaters'&&r.camp[7],
  '5: owned ships: Dustfall with missiles, a stock Cross without, the Marta\'s door gun, a Brickbat\'s racks '+JSON.stringify(r.camp));
 ok(r.mig[1]===15&&r.mig[2]===r.mig[0]&&r.mig[3]==='bls-t-light-repeaters'&&r.mig[4]==='missiles'&&r.mig[5]==='door-mounted-gun'&&r.mig[6],'5: an old save\'s ships get configurations from their weapons '+JSON.stringify(r.mig));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r},null,0));
 if(fails.length){console.error('ships-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('ships-smoke OK');
})();
