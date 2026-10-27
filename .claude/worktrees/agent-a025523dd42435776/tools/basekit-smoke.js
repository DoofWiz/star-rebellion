/* The Base screen on the UI kit (ui/sr-hud.js): node tools/basekit-smoke.js (needs NODE_PATH=$(npm root -g)).
   The base builds its window chrome with the kit's winHead/winBody/winFoot, and uses the kit's menu, confirm
   window (Restart), day banner, toast, comms feed and tooltips instead of its own copies. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const close=async()=>{for(let i=0;i<6&&await pg.evaluate(()=>window.DBGbase.fn.getWin());i++)await pg.evaluate(()=>window.DBGbase.fn.closeWin());};
 await close();
 // window chrome: the base's window head is the kit's
 const chrome=await pg.evaluate(()=>{const D=window.DBGbase,H=window.SR.hud;D.fn.openWin('news');
   const head=document.querySelector('#winCardB .sr-window__head');return !!head&&head.outerHTML.indexOf('aria-label="Close"')>0&&typeof H.winHead==='function';});
 await close();
 ok(chrome,'base windows use the kit chrome');
 // menu: opens, closes on an outside press and on Escape
 await pg.click('#menuBtn');const open1=await pg.evaluate(()=>!document.querySelector('#baseMenu').hidden);
 await pg.mouse.click(500,400);const shut1=await pg.evaluate(()=>document.querySelector('#baseMenu').hidden);
 await pg.click('#menuBtn');await pg.keyboard.press('Escape');const shut2=await pg.evaluate(()=>document.querySelector('#baseMenu').hidden);
 ok(open1&&shut1&&shut2,'the kit menu opens and closes '+[open1,shut1,shut2]);
 // Restart asks first; Keep playing keeps the campaign, Restart erases it
 await pg.evaluate(()=>{window.DBGbase.G.credits=4321;});
 await pg.click('#menuBtn');await pg.click('#restartBtn');await pg.waitForTimeout(150);
 const asked=await pg.evaluate(()=>{const w=document.querySelector('#bsRestart');return !!w&&!w.hidden&&w.textContent.indexOf('Restart the campaign?')>=0;});
 await pg.click('#bsRestart .sr-window__foot [data-close]');await pg.waitForTimeout(100);
 const kept=await pg.evaluate(()=>[window.SR.active,window.DBGbase.G.credits].join());
 ok(asked&&kept==='base,4321','Restart asks, and Keep playing keeps the campaign '+asked+' '+kept);
 // a day: the kit banner slams in, a toast can pop, the feed shows news lines
 await pg.click('#dayBtn');await pg.waitForTimeout(150);
 const fx=await pg.evaluate(()=>{
  const ban=document.querySelector('#sc-base .sr-stage .sr-banner[data-hud]');
  const feed=[...document.querySelectorAll('#feedLines .sr-comm')].length;
  return [ban?ban.textContent:'-',feed>0].join();});
 ok(/^Day 2,true$/.test(fx),'the day banner and the comms feed come from the kit '+fx);
 // tooltips: the galaxy orders' rules show on hover
 await pg.click('#navSources');await pg.waitForTimeout(400);await (await pg.$('[data-gxsrc]')).click();await pg.waitForTimeout(300);await close();
 const el=await pg.$('#sc-base #gxDock .gx-act[data-tip]');const bx=await el.boundingBox();
 await pg.mouse.move(bx.x+4,bx.y+4);await pg.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2,{steps:3});await pg.waitForTimeout(150);
 const tip=await pg.evaluate(()=>{const t=document.querySelector('#sc-base .sr-tip');return t&&!t.hidden?t.textContent:'';});
 ok(/^Contact/.test(tip),'the galaxy panel’s buttons show the kit tooltip '+tip);
 // finally Restart for real
 await pg.mouse.move(5,5);await pg.click('#menuBtn');await pg.click('#restartBtn');await pg.waitForTimeout(150);
 await pg.click('#bsRestart [data-ok]');await pg.waitForTimeout(500);
 const fresh=await pg.evaluate(()=>[window.SR.active,window.DBGbase.G.day].join());
 ok(fresh==='ground,1','Restart erases the save and starts the opening mission '+fresh);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'basekit-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
