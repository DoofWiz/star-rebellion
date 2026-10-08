/* The audio pass (state and palette): node tools/audio-smoke.js (needs NODE_PATH=$(npm root -g)).
   1  the sound setting is a player pref like shake and blood: toggling it writes `star-rebellion-prefs`
      and a reload keeps it off (and keeps it on again after toggling back).
   2  one wiring for every scene (SR.audio.bindSound): pressing any scene's button or menu row flips the
      base's button, both combat scenes' mute buttons and every menu Sound row together.
   3  the base palette is split by meaning: sGood for good news, sWarn for bad news, sAlert for pings.
   4  ground: every weapon the scene can fire has its own voice (no two share one), and sShot plays
      one report per round of the volley plan it is handed — five tracers, five reports.
   5  space: every ship weapon key has its own voice and sVolley is plan-driven the same way. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};

 const state=()=>pg.evaluate(()=>{
  const hrefs=sel=>[...document.querySelectorAll(sel)].map(u=>u.getAttribute('href')).join(',');
  let prefs=null;try{prefs=JSON.parse(localStorage.getItem('star-rebellion-prefs')||'{}');}catch(e){}
  return {muted:window.SR.audio.muted(),
          sound:prefs&&prefs.sound,
          label:(document.querySelector('#sc-base #menuSound span')||{}).textContent,
          btns:hrefs('#sc-base #soundBtn use,#sc-ground #muteBtn use,#sc-space #muteBtn use,#sc-ground #menuSound use,#sc-space #menuSound use')};
 });

 // ---- 2: the shared wiring, pressed from the base
 const s0=await state();
 ok(s0.muted===false&&s0.btns.split(',').every(h=>h==='#i-soundon'),'sound starts on everywhere '+JSON.stringify(s0));
 await pg.evaluate(()=>document.querySelector('#sc-base #soundBtn').click());
 const s1=await state();
 ok(s1.muted===true&&s1.btns.split(',').length===5&&s1.btns.split(',').every(h=>h==='#i-soundoff'),
    'one press flips every scene\'s buttons off '+JSON.stringify(s1));
 ok(s1.label==='Sound: off','the base menu row reads the state '+s1.label);
 // ---- 2: ...and from a combat scene's menu row
 await pg.evaluate(()=>document.querySelector('#sc-ground #menuSound').click());
 const s2=await state();
 ok(s2.muted===false&&s2.btns.split(',').every(h=>h==='#i-soundon'),'the ground menu row flips them all back '+JSON.stringify(s2));

 // ---- 1: the pref survives a reload
 await pg.evaluate(()=>document.querySelector('#sc-space #muteBtn').click());
 ok((await state()).sound===false,'sound off is written to the prefs');
 await pg.goto(url);await pg.waitForTimeout(1200);
 const s3=await state();
 ok(s3.muted===true&&s3.sound===false&&s3.btns.split(',').every(h=>h==='#i-soundoff'),
    'a reload keeps sound off '+JSON.stringify(s3));
 await pg.evaluate(()=>document.querySelector('#sc-base #menuSound').click());
 await pg.goto(url);await pg.waitForTimeout(1200);
 const s4=await state();
 ok(s4.muted===false&&s4.sound===true,'a reload keeps sound on again '+JSON.stringify(s4));

 // ---- 3: the base palette is split by meaning, and plays without a wake while muted
 const pal=await pg.evaluate(()=>{
  const f=window.DBGbase.fn,out={types:[typeof f.sGood,typeof f.sWarn,typeof f.sAlert].join(',')};
  try{window.SR.audio.setMuted(true);f.sGood();f.sWarn();f.sAlert();window.SR.audio.setMuted(false);out.ran=true;}catch(e){out.ran=e.message;}
  return out;
 });
 ok(pal.types==='function,function,function','the base palette carries sGood, sWarn and sAlert '+pal.types);
 ok(pal.ran===true,'the palette is safe before the engine wakes '+pal.ran);

 // ---- 4: ground — a voice per weapon, a report per visible round
 const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']}];
 await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),
   {kind:'ground',missionId:'intel',scenario:'intel',days:2,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},ctx:{variant:'dataflats'}});
 await pg.waitForTimeout(600);
 const g=await pg.evaluate(()=>{
  const f=window.DBGground.fn,V=f.VOICE_(),W=f.WPN_(),ks=Object.keys(W),out={};
  out.missing=ks.filter(k=>!V[k]);
  out.shared=new Set(ks.map(k=>V[k])).size===ks.length;
  out.single=f.sShot('cowboy');
  out.five=f.sShot('akli',{rounds:[{fire:0},{fire:.1},{fire:.2},{fire:.3},{fire:.4}]});
  const pl=window.SR_ART.volley('razorrat','auto',{hit:true,damage:24});
  out.auto=[f.sShot('razorrat',pl),pl.rounds.length];
  return out;
 });
 ok(g.missing.length===0,'every ground weapon has its own voice; missing: '+g.missing.join(','));
 ok(g.shared,'no two ground weapons share a voice');
 ok(g.single===1&&g.five===5,'a report per round: single '+g.single+', five-round plan '+g.five);
 ok(g.auto[0]===g.auto[1]&&g.auto[0]>=6,'an automatic volley sounds every round it draws '+g.auto);

 // ---- 5: space — plan-driven voices per ship weapon
 await pg.evaluate(()=>{const flight=[{pilotId:'sera',name:'Sera Kest',first:'Sera',level:3,aim:3,cool:72,tr:[],cls:'talon',fighterId:'f1',fighterName:'Talon 1',hull:100,loadout:['bls-t-light-repeaters']}];
  window.SR.go('space',{test:true,mission:{kind:'space',missionId:'x',days:0,flight}});});
 await pg.waitForTimeout(500);
 const sp=await pg.evaluate(()=>{
  const f=window.DBGspace.fn,SV=f.SVOICE_();
  const pl=window.SR_ART.volley('repeaters','auto',{hit:true,damage:18});
  return {keys:['repeaters','dronegun','cruiser','doorgun'].filter(k=>typeof SV[k]!=='function'),
          count:[f.sVolley('repeaters',pl),pl.rounds.length],one:f.sVolley('cruiser')};
 });
 ok(sp.keys.length===0,'every ship weapon key has a voice; missing: '+sp.keys.join(','));
 ok(sp.count[0]===sp.count[1]&&sp.one===1,'space reports follow the plan '+sp.count+' / '+sp.one);

 ok(errs.length===0,'no page errors: '+errs.join(' | '));
 await b.close();
 if(fails.length){console.error('FAIL\n- '+fails.join('\n- '));process.exit(1);}
 console.log('audio smoke: all good');
})();
