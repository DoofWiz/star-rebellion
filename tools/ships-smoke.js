/* The ships database's mounts, hardpoints, configurations and attachments (docs/MAIN-SWITCH-HANDOFF.md S2, §5 test 3;
   mounts and hardpoints as counts: the designer, C-90 item 4): node tools/ships-smoke.js (needs NODE_PATH=$(npm root -g)).
   1  every ship row has a number of weapon mounts and a number of hardpoints, and a stock configuration that fits them
   2  the Brickbat and the FL-400 are rows (by id and by legacy key): the Brickbat ownable, buyable, on a small pad, with no
      passenger room;
      the FL-400 not ownable and too big for any pad; Type 3.5 flies the FL-400 at its own pace over her row
   3  a pirate Cross carries a configuration a stock one doesn't, in High Command's sim too (missiles); every ship there
      carries a configuration
   4  configurations are checked: more weapons than mounts, attachments that need more hardpoints than she has, a
      boarding party with no passenger room are refused with the reason; a boarding pod lets a ship with no passenger
      room board; an older text with slot prefixes still reads
   5  the campaign: every owned ship has a configuration (Dustfall comes with missiles, a stock Cross has none, the
      Marta her door gun, a Brickbat her bomb racks); an old save gets one from its weapons (MIGRATIONS 15 -> 16), and an
      S2 save's slots become mounts and hardpoints (19 -> 20) */
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
  // 1. every row: mounts, hardpoints and a stock configuration that fits
  out.rows=D.raw.ships.map(s=>[s.id,Number.isInteger(s.hardpoints),Number.isInteger(s.mounts)&&!('weapon_slots' in s)&&!('hard_points' in s),D.configWhy(s,D.stockConfig(s))]);
  // 2. the two new rows
  const bb=D.ship('brickbat'),fl=D.ship('fl400');
  out.bb=[bb&&bb.id,bb===D.ship('bx-17-brickbat'),bb&&bb.ownable,bb&&bb.manufacturer,window.SR_ART.padFor(bb.size),D.stockConfig(bb).hardpoint.join(),bb.extra_people,
    !!(window.DBGbase.fn.SHIP_PRICE_()||{}).brickbat,D.hardpoints(bb).hardpoint,D.hardpointsUsed(D.stockConfig(bb))];
  out.fl=[fl&&fl.id,fl===D.ship('ga-fl-400'),fl&&fl.ownable,fl&&fl.manufacturer,window.SR_ART.padFor(fl.size),window.SIMHC35.HC35_CLASSES.fl400.hull===fl.hull&&window.SIMHC35.HC35_CLASSES.fl400.straight_min===0.2];
  // 3. a pirate Cross fitted unlike a stock one, in the sim too
  const pir=Enemies.space('pirate-cross'),stock=D.stockConfig(D.ship('cross'));
  out.pirate=[pir.ship==='ft-4-cross',D.parseConfig(pir.config).mount.join(),stock.mount.length,D.configWhy(D.ship('cross'),pir.config),D.parseConfig(pir.config).hardpoint.join()];
  const SIM=window.SIMHC;window.SIMHC35.detach();
  SIM.build({id:'s2_ships',title:'S2',rulesets:['hc'],wings:[{id:'w',name:'W',at:[1000,2000,0],order:{kind:'hold'},tactic:'auto',ships:[
      {cls:'cross',name:'Stock',pilot:{preset:'regular'}},{cls:'cross',name:'Mod',config:'bls-t-light-repeaters|missiles',pilot:{preset:'regular'}},
      {cls:'brickbat',name:'Bb',pilot:{preset:'regular'}},{cls:'graf',name:'Gf',config:'boarding-party',pilot:{preset:'regular'}}]}],
    enemies:[{type:'pirate-cross',id:'pir',name:'Pirate',at:[5000,2000,Math.PI]}],points:{jump:{x:600,y:2000,label:'Jump'}},extract:'jump',
    objectives:[{id:'o',kind:'destroy',targets:['pir'],text:'x',primary:true}],reinforce:{secs:999,edge:'E',force:[]},rules:[],cp:3},{seed:3});
  const S=SIM.S,by=n=>S.ships.find(s=>s.name===n||s.id===n),wn=s=>s.wpns.map(q=>q.w.id).join('+');
  out.sim=[wn(by('Stock')),wn(by('Mod')),wn(by('pir')),wn(by('Bb')),by('Gf').marines,S.ships.every(s=>!!s.config)];
  // 4. the checks
  const cross=D.ship('cross'),talon=D.ship('talon'),graf=D.ship('graf'),brick=D.ship('brickbat');
  out.why=[D.configWhy(cross,'boarding-party'),D.configWhy(cross,'bls-t-light-repeaters|missiles|missiles'),D.configWhy(talon,'cargo-pods|boarding-pod'),
    D.configWhy(talon,'boarding-pod'),D.boards('boarding-pod'),D.configWhy(graf,'boarding-party'),D.boards('boarding-party'),D.boards('bombs'),D.configWhy(cross,'nothing'),
    D.configWhy(cross,'bombs'),D.configWhy(graf,'bombs|bombs'),D.configWhy(brick,'boarding-party'),D.configWhy(brick,'boarding-pod'),D.configWhy(brick,'boarding-pod|bombs'),
    D.configWhy(cross,'primary:bls-t-light-repeaters|secondary:missiles|pylon:cargo-pods'),D.configWhy(cross,'missiles|missiles')];
  // 5. the campaign
  const f=window.DBGbase.fn,G=window.DBGbase.G;
  const mk=o=>f.newFighter(o);
  const dust=mk({id:'t_d',name:'Dustfall',cls:'cross',hull:85}),cr=mk({id:'t_c',name:'Cross 1',cls:'cross',hull:100}),
    marta=mk({id:'t_m',name:'Marta',cls:'graf',hull:70}),bbF=mk({id:'t_b',name:'Brickbat 1',cls:'brickbat',hull:100});
  out.camp=[dust.config.mount.join(),dust.loadout.join(),cr.config.mount.length,cr.loadout.join(),marta.config.mount.join(),bbF.config.hardpoint.join(),bbF.loadout.join(),
    [dust,cr,marta,bbF].every(x=>D.configWhy(D.ship(x.cls),x.config)===null)];
  // an old save: ships without configurations, at version 15
  G.fighters.push({id:'old_c',name:'Old Cross',cls:'cross',hull:90,out:false,loadout:['bls-t-light-repeaters','missiles']},{id:'old_g',name:'Old Graf',cls:'graf',hull:90,out:false,loadout:['door-mounted-gun']});
  const v=f.saveVersion();G.v=15;const from=f.upgradeSave();
  const oc=G.fighters.find(x=>x.id==='old_c'),og=G.fighters.find(x=>x.id==='old_g');
  out.mig=[v,from,G.v,oc.config&&oc.config.mount.join(),oc.config&&oc.config.hardpoint.length,og.config&&og.config.mount.join(),G.fighters.every(x=>!!x.config)];
  // an S2 save (version 19): her slots become mounts and hardpoints
  G.fighters.push({id:'s2_c',name:'S2 Cross',cls:'cross',hull:90,out:false,config:{primary:['bls-t-light-repeaters'],secondary:['missiles'],pylon:['cargo-pods'],internal:[]},loadout:['bls-t-light-repeaters','missiles']});
  G.v=19;const from2=f.upgradeSave();const sc=G.fighters.find(x=>x.id==='s2_c');
  out.mig2=[from2,G.v===v,JSON.stringify(sc.config),D.configWhy(cross,sc.config)];
  return out;
 });
 const bad=r.rows.filter(x=>!x[1]||!x[2]||x[3]!==null);
 ok(r.rows.length>=13&&!bad.length,'1: every ship row has mounts and hardpoints as counts, and a stock configuration that fits '+JSON.stringify(bad));
 ok(r.bb[0]==='bx-17-brickbat'&&r.bb[1]&&r.bb[2]===true&&r.bb[3]==='core'&&r.bb[4]==='small'&&r.bb[5]==='bombs,bombs'&&r.bb[6]===0&&r.bb[7]&&r.bb[8]===2&&r.bb[9]===2,'2: the Brickbat: a row, ownable, CORE, a small pad, bomb racks on her 2 hardpoints, no passenger room (the designer, 21 October), buyable '+JSON.stringify(r.bb));
 ok(r.fl[0]==='ga-fl-400'&&r.fl[1]&&r.fl[2]===false&&r.fl[3]==='general-astronautics'&&r.fl[4]===null&&r.fl[5],'2: the FL-400: a row, not ownable, too big for a pad, 3.5\'s pace over her row '+JSON.stringify(r.fl));
 ok(r.pirate[0]&&r.pirate[1]==='bls-t-light-repeaters,missiles'&&r.pirate[2]===1&&r.pirate[3]===null&&r.pirate[4]==='cargo-pods','3: a pirate Cross carries missiles and cargo pods a stock one doesn\'t '+JSON.stringify(r.pirate));
 ok(r.sim[0]==='bls-t-light-repeaters'&&r.sim[1]==='bls-t-light-repeaters+missiles'&&r.sim[2]==='bls-t-light-repeaters+missiles'&&r.sim[3]==='bls-t-light-repeaters'&&r.sim[4]===true&&r.sim[5],
  '3: in the sim: a stock Cross has no missiles, a configured one and the pirate do; a Graf with a boarding party boards; every ship has a configuration '+JSON.stringify(r.sim));
 const w=r.why;
 ok(/passenger room/.test(w[0]||'')&&/2 weapon mounts/.test(w[1]||'')&&/2 hardpoints; that needs 3/.test(w[2]||'')&&w[3]===null&&w[4]===true&&w[5]===null&&w[6]===true&&w[7]===false&&/unknown/.test(w[8]||'')&&/can't carry bombs/.test(w[9]||'')&&w[10]===null&&/no passenger room/.test(w[11]||'')&&w[12]===null&&/2 hardpoints; that needs 3/.test(w[13]||'')&&w[14]===null&&w[15]===null,
  '4: configurations are checked, with reasons (mounts, hardpoints, passenger room); any weapon in any mount; a boarding pod lets a Talon board; bombs on the Graf and the Brickbat only; the Brickbat boards with a pod; an older text still reads '+JSON.stringify(w));
 ok(r.camp[0]==='bls-t-light-repeaters,missiles'&&r.camp[1]==='bls-t-light-repeaters,missiles'&&r.camp[2]===1&&r.camp[3]==='bls-t-light-repeaters'&&r.camp[4]==='door-mounted-gun'&&r.camp[5]==='bombs,bombs'&&r.camp[6]==='bls-t-light-repeaters'&&r.camp[7],
  '5: owned ships: Dustfall with missiles, a stock Cross without, the Marta\'s door gun, a Brickbat\'s racks '+JSON.stringify(r.camp));
 ok(r.mig[1]===15&&r.mig[2]===r.mig[0]&&r.mig[3]==='bls-t-light-repeaters,missiles'&&r.mig[4]===0&&r.mig[5]==='door-mounted-gun'&&r.mig[6],'5: an old save\'s ships get configurations from their weapons '+JSON.stringify(r.mig));
 ok(r.mig2[0]===19&&r.mig2[1]&&r.mig2[2]==='{"mount":["bls-t-light-repeaters","missiles"],"hardpoint":["cargo-pods"]}'&&r.mig2[3]===null,'5: an S2 save\'s slots become mounts and hardpoints (MIGRATIONS 19 -> 20) '+JSON.stringify(r.mig2));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r},null,0));
 if(fails.length){console.error('ships-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('ships-smoke OK');
})();
