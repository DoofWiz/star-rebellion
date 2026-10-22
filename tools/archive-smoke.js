/* The switch to main, phase S0 (docs/MAIN-SWITCH-HANDOFF.md §5 test 1): node tools/archive-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   1  main boots: the title screen, then the base; no Test bench button and no SR.dev for players
   2  the Arena isn't reachable without ?dev: #arena alone shows the title screen, SR.bootArena() goes to the base
   3  with ?dev: the title's Test bench button, and ?dev#arena opens Type 3.5's opportunity board (no ruleset picker),
      never writing the campaign save
   4  nothing live loads an archived file: game/index.html's scripts, every tools/ file, and run-report's sim list
   The prologue still plays to the frontier on space.js (until S11): prologue-smoke does that. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const base='file://'+path.join(ROOT,'game','index.html');
const CAMPAIGN_KEY='star-rebellion-campaign-v1';
const ARCHIVED=['sim2.js','sim-sb.js','arena-sb.js','arena.js','arena-smoke.js'];   // archive/README.md
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const errs=[],fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const out={};
 const page=async(hash)=>{
  const ctx=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const pg=await ctx.newPage();
  pg.on('pageerror',e=>errs.push(hash+': '+e.message));
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.goto(base+hash);await pg.waitForTimeout(900);
  return {ctx,pg};
 };
 const splashReady=pg=>pg.waitForFunction(()=>{const s=document.getElementById('splash');return s&&s.className.includes('is-ready');},null,{timeout:15000}).catch(()=>{});

 // 1. main boots: the title, Start, the base
 {const {ctx,pg}=await page('');await splashReady(pg);
  out.title=await pg.evaluate(()=>({splash:!!document.getElementById('splash'),bench:!!document.getElementById('splashArena'),dev:SR.dev,bench35:!!window.DBGarena}));
  await pg.click('#splashStart');await pg.waitForFunction(()=>!!SR.active,null,{timeout:15000}).catch(()=>{});
  out.started=await pg.evaluate(()=>SR.active);   // a new game opens on the prologue's first mission
  await ctx.close();}
 ok(out.title.splash&&!out.title.bench&&out.title.dev===false&&!out.title.bench35,'1: the title screen, with no Test bench and no dev hooks '+JSON.stringify(out.title));
 ok(['base','ground'].includes(out.started),'1: Start reaches the campaign '+out.started);

 // 2. #arena without ?dev: the title screen; SR.bootArena() is the campaign's boot
 {const {ctx,pg}=await page('#arena');
  out.noDev=await pg.evaluate(()=>({active:SR.active||null,splash:!!document.getElementById('splash'),arena:!document.getElementById('sc-space35').hidden}));
  await pg.goto(base+'#test');await pg.waitForTimeout(900);
  out.boot=await pg.evaluate(()=>{SR.bootArena();return SR.active;});
  await pg.waitForTimeout(300);out.boot=[out.boot,await pg.evaluate(()=>SR.active)];
  await ctx.close();}
 ok(out.noDev.splash&&out.noDev.active!=='space35'&&!out.noDev.arena,'2: #arena without ?dev shows the title screen '+JSON.stringify(out.noDev));
 ok(out.boot[1]!=='space35','2: SR.bootArena() without ?dev never opens the bench '+JSON.stringify(out.boot));

 // 3. ?dev: the title's Test bench; ?dev#arena opens 3.5's board, never the campaign save
 {const {ctx,pg}=await page('?dev');await splashReady(pg);
  out.devTitle=await pg.evaluate(()=>({bench:!!document.getElementById('splashArena'),dev:SR.dev}));
  if(out.devTitle.bench){await pg.click('#splashArena');await pg.waitForTimeout(900);}
  out.devBench=await pg.evaluate(k=>({active:SR.active,board:window.DBGarena&&window.DBGarena.hc35.B.screen,save:localStorage.getItem(k)}),CAMPAIGN_KEY);
  await ctx.close();}
 ok(out.devTitle.bench&&out.devTitle.dev===true,'3: ?dev puts the Test bench on the title '+JSON.stringify(out.devTitle));
 ok(out.devBench.active==='space35'&&out.devBench.board==='board'&&out.devBench.save===null,'3: the Test bench opens the board without the campaign '+JSON.stringify(out.devBench));
 {const {ctx,pg}=await page('?dev#arena');
  out.devHash=await pg.evaluate(k=>({active:SR.active,board:window.DBGarena.hc35.B.screen,picker:!!document.getElementById('arPicker'),v2:!!document.querySelector('.ar-shell'),
   hcActive:window.DBGarena.hc.active,save:localStorage.getItem(k)}),CAMPAIGN_KEY);
  await ctx.close();}
 ok(out.devHash.active==='space35'&&out.devHash.board==='board'&&!out.devHash.picker&&!out.devHash.v2&&out.devHash.hcActive&&out.devHash.save===null,'3: ?dev#arena opens 3.5\'s board, with no ruleset picker or v2 shell '+JSON.stringify(out.devHash));

 // 4. nothing live loads an archived file
 const html=fs.readFileSync(path.join(ROOT,'game','index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 out.scripts=scripts.filter(s=>ARCHIVED.includes(path.basename(s)));
 out.missing=scripts.filter(s=>!/^https?:/.test(s)&&!fs.existsSync(path.join(ROOT,'game',s)));
 out.tools=[];
 for(const f of fs.readdirSync(path.join(ROOT,'tools'))){
  const p=path.join(ROOT,'tools',f);if(!fs.statSync(p).isFile()||f==='archive-smoke.js')continue;
  const src=fs.readFileSync(p,'utf8');
  for(const a of ARCHIVED)if(new RegExp('[\'"/]'+a.replace(/[.-]/g,'\\$&')+'[\'"]').test(src))out.tools.push(f+' → '+a);
 }
 out.live=ARCHIVED.filter(a=>fs.existsSync(path.join(ROOT,'game','js',a))||fs.existsSync(path.join(ROOT,'tools',a)));
 const RR=require('./run-report.js');let loaded=null;try{const W=RR.loadSim();loaded=!!(W.SIMHC&&W.SIMHC35&&W.SR_FLIGHT);}catch(e){loaded=e.message;}
 out.runReport=loaded;
 ok(!out.scripts.length&&!out.missing.length,'4: index.html loads no archived or missing script '+JSON.stringify([out.scripts,out.missing]));
 ok(!out.tools.length,'4: nothing in tools/ imports an archived file '+JSON.stringify(out.tools));
 ok(!out.live.length,'4: the archived files are out of game/js and tools '+JSON.stringify(out.live));
 ok(out.runReport===true,'4: run-report loads the sim without the archive '+out.runReport);

 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,out},null,0));
 if(fails.length){console.error('archive-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('archive-smoke OK');
})();
