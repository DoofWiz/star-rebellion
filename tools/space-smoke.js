/* Space combat smoke test: loads the real game, deploys the space scene, plays rounds with a simple
   scripted player, and reports page errors plus ship stats. Used to compare behaviour before and after
   refactors (the "stats" block is deterministic for a given build; "play" depends on the seed).
   Usage: NODE_PATH=$(npm root -g) node tools/space-smoke.js [seed] [maxRounds] [scenario: instructor|depot|flight|loadouts]
   Output: one JSON object on stdout. */
const {chromium}=require('playwright');
const path=require('path');
const seed=+(process.argv[2]||1),maxRounds=+(process.argv[3]||12),scen=process.argv[4]||'instructor';
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 const pg=await ctx.newPage();
 const errs=[];
 pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
 pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text());});
 await pg.addInitScript(([s,speed])=>{
  let a=s>>>0;Math.random=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
  const o=performance.now.bind(performance);performance.now=()=>o()*speed; // run the animation clock fast
  const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));
 },[seed,6]);
 await pg.goto(url);await pg.waitForTimeout(800);
 const out=await pg.evaluate(async([scen,maxRounds])=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const SR=window.SR;
  const flight=[
    {pilotId:'sera',name:'Sera Kest',first:'Sera',level:3,aim:3,cool:72,traits:['Lucky'],cls:'cross',fighterId:'f1',fighterName:'Dustfall',hull:100},
    {pilotId:'joss',name:'Joss Marrek',first:'Joss',level:4,aim:4,cool:76,traits:[],cls:'talon',fighterId:'f2',fighterName:'Talon 1',hull:100},
    {pilotId:'petra',name:'Petra Voss',first:'Petra',level:2,aim:2,cool:60,traits:[],cls:'talon',fighterId:'f3',fighterName:'Talon 2',hull:100}];
  const odd=flight.map((f,i)=>Object.assign({},f,{loadout:[['missiles','missiles'],[],['door-mounted-gun','bls-t-light-repeaters']][i],cls:['cross','talon','graf'][i]}));
  SR.mission=scen==='loadouts'?{kind:'space',missionId:'x',days:0,flight:odd}:scen==='depot'?{kind:'space',missionId:'depotrun',days:0,flight}:scen==='flight'?{kind:'space',missionId:'x',days:0,flight}:null;
  SR.go('space',{test:true,mission:SR.mission});
  await sleep(300);
  const D=window.DBGspace,F=D.fn;
  const round=(x,n=3)=>Math.round(x*10**n)/10**n;
  const stats=D.ships.map(s=>{
    const c=D.CLS[s.cls];
    return {id:s.id,cls:s.cls,name:s.name,
      shield:[s.segs.F.max,s.segs.R.max],arm:s.maxArm,hull:s.maxHull,size:round(s.size),
      dial:F.dialAvail(s).map(m=>m[0]+m[1]).join(' '),maxSpeed:F.maxSpeedOf(s),init:F.effInit(s),
      ammo:Object.assign({},s.ammo),aim:s.pilot.aim,wpns:(s.wpns||c.wpns).map(w=>typeof w==='string'?w:(w.key+':'+w.w.id))};
  });
  // target number of each ship against the first ship of the other side (no modifiers beyond range)
  const tn=D.ships.map(s=>{
    const foe=D.ships.find(x=>x.faction!==s.faction&&x.alive);
    const t=foe?F.computeTN(foe,s):null;
    return {id:s.id,tn:t?t.total:null,entries:t?t.entries.map(e=>e[0]+':'+e[1]).join(' | '):null};
  });
  // the ship-systems card for every ship (weapons, ammo, durability) must render
  const cards=D.ships.map(s=>{try{const h=F.shipHTML(s);return {id:s.id,ok:h.length>200,weapons:(h.match(/sp-wcard/g)||[]).length,html:h.length};}catch(e){return {id:s.id,error:String(e)};}});
  // play
  let over=false,guard=0,res=null,lastRound=0;
  const rb=()=>D.ships.filter(s=>s.alive&&s.faction==='reb');
  while(guard++<6000){
    const ph=D.phase;
    if(ph==='GAMEOVER'){over=true;break;}
    if(D.round>maxRounds){break;}
    if(ph==='PLANNING'){
      for(const s of rb()){const d=F.dialAvail(s);s.plan.man=d[Math.floor(Math.random()*d.length)];}
      F.executeRound();lastRound=D.round;
    } else if(ph==='EXEC'){
      if(D.awaitAction)F.playerAction({a:'none'});
    } else if(ph==='ATTACK'){
      const c=D.attackQ&&D.attackQ.cur;
      if(c&&c.stage==='await'&&c.s.faction==='reb')F.confirmAttack();
    }
    await sleep(4);
  }
  const alive=D.ships.map(s=>({id:s.id,alive:s.alive,hull:s.hull,arm:s.arm,sh:[s.segs.F.val,s.segs.R.val],ammo:s.ammo}));
  return {stats,tn,cards,play:{rounds:D.round,over,phase:D.phase,guard,alive}};
 },[scen,maxRounds]);
 out.errors=errs;
 console.log(JSON.stringify(out));
 await b.close();
 process.exit(errs.length?2:0);
})();
