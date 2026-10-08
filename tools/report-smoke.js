/* Smoke test for the mission report window (docs/ui/SCREENS-HANDOFF.md §1): node tools/report-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(600);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const toReport=()=>{for(let i=0;i<8&&f.getWin()&&f.getWin()!=='reward';i++)f.closeWin();return f.getWin();};
  const clear=()=>{for(let i=0;i<10&&f.getWin();i++)f.closeWin();};
  clear();
  const dax=G.people.find(p=>p.id==='dax'),runa=G.people.find(p=>p.id==='runa');
  // ---- a win with pay and loot: Akkaro · Dustfall, two soldiers, one levels up, one comes home injured
  const m={id:'rptwin',name:'Report test',desc:'Test.',objectives:['Get in','Get the thing','(Optional) Stay quiet','Get out'],req:{transport:true,team:2},days:0,
    lead:'ground',ground:true,type:'ground',scenario:'intel',loc:'akkaro',region:'dustfall',lib:10,rew:{c:500,s:0,xp:0.2}};
  G.missions.push(m);
  dax.level=2;dax.xp=0.9;runa.level=1;runa.xp=0.2;
  const items=['carbine','scatter','scatter','medpack','blam','akli','cowboy','shells','stim'];
  f.applyDebrief({missionId:'rptwin',kind:'ground',days:0,win:true,cross:true,
    people:[{id:'dax',xp:0.3,state:'ok'},{id:'runa',xp:0.1,state:'injured',dur:3}],loot:{c:560,s:0,items}});
  out.win1=toReport();
  const card=$('#winCardB');
  out.cls=card.className;
  out.head=($('.sr-window__title')||{}).textContent;
  const cr=card.querySelector('.rp-tile[data-res="c"]');
  out.credits=cr?cr.querySelector('.rp-tile__n').textContent:'';
  out.creditRows=cr?[...cr.querySelectorAll('.rp-drow')].map(e=>e.textContent):[];
  out.supplyTile=!!card.querySelector('.rp-tile[data-res="s"]');
  out.tiles=$$('.rp-loot__tile').length;
  out.more=($('.rp-loot__more')||{}).textContent||'';
  out.first=$('.rp-loot__tile')?[$('.rp-loot__tile').classList.contains('is-asset'),$('.rp-loot__tile').textContent]:[];
  out.pill=($('.rp-objpill')||{}).textContent||'';
  out.objList=$$('.rp-objs .sr-obj').length;
  out.loc=$$('.rp-loc__lbl').map(e=>e.textContent).join('|');
  out.stamp=($('.rp-hero .sr-stamp')||{}).textContent;
  const mate=id=>card.querySelector('.rp-mate[data-pid="'+id+'"]');
  const md=mate('dax'),mr=mate('runa');
  out.levelUp=md?[!!md.querySelector('.rp-xp.is-up'),(md.querySelector('.rp-lvl')||{}).textContent,getComputedStyle(md.querySelector('.rp-xp .now')).backgroundColor]:[];
  out.injured=mr?[!!mr.querySelector('.rp-mate__badge use[href="#i-patch"]'),(mr.querySelector('.rp-mate__state')||{}).textContent,/day/i.test(mr.textContent),!!mr.querySelector('.rp-xp')]:[];
  out.xpGrow=mr?mr.querySelector('.rp-xp').getAttribute('style'):'';
  out.revBar=!!card.querySelector('.rp-meter.is-rev .rp-revring');
  out.revNow=card.querySelector('.rp-meter.is-rev .now')?getComputedStyle(card.querySelector('.rp-meter.is-rev .now')).backgroundImage:'';
  out.revRows=$$('.rp-meter.is-rev .rp-drow').map(e=>e.textContent);
  out.lib=[!!card.querySelector('.rp-meter.is-lib .gx-wheel'),(card.querySelector('.rp-meter.is-lib .rp-meter__sub')||{}).textContent];
  out.foot=[$$('#winCardB .sr-window__foot .sr-btn').map(b=>b.textContent).join(','),!card.querySelector('.sr-window__note')];
  out.width=card.offsetWidth;
  clear();
  // ---- a lost rebel: skull, struck through, no XP bar
  const m2={id:'rptlost',name:'Lost test',desc:'Test.',objectives:['A'],req:{transport:true,team:1},days:0,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{}};
  G.missions.push(m2);
  const ghost=window.Rebel.migrate({id:'ghost',name:'Ghost Test',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,bio:'x'});G.people.push(ghost);
  f.setRng(()=>0.99);
  f.applyDebrief({missionId:'rptlost',kind:'ground',days:0,win:true,people:[{id:'ghost',xp:0.1,state:'lost'}]});
  f.setRng(Math.random);
  toReport();
  const gl=$('.rp-mate[data-pid="ghost"]');
  out.lost=gl?[gl.classList.contains('is-lost'),!!gl.querySelector('use[href="#i-skull"]'),!gl.querySelector('.rp-xp'),(gl.querySelector('.rp-mate__state')||{}).textContent]:[];
  out.noResTile=!$('.rp-res');   // nothing gained, no tiles at all
  clear();
  // ---- a failure: red objective count, Recovered, the board note, no revolution
  const m3={id:'rptfail',name:'Fail test',desc:'Test.',objectives:['Reach it','Take it','Leave'],req:{transport:true,team:1},days:0,lead:'ground',ground:true,type:'ground',scenario:'intel',loc:'akkaro',rew:{c:300}};
  G.missions.push(m3);
  f.applyDebrief({missionId:'rptfail',kind:'ground',days:0,win:false,people:[{id:'dax',xp:0.05,state:'ok'}],loot:{c:40,s:0,items:[]},
    objs:[{t:'Reach it',done:true},{t:'Take it',done:false},{t:'Leave',done:false}]});
  out.fail=toReport();
  const fc=$('#winCardB');
  out.failCls=fc.className;
  out.failCount=(fc.querySelector('.rp-sec__head b.is-bad')||{}).textContent;
  out.failObjs=[fc.querySelectorAll('.rp-objs .sr-obj.is-done').length,fc.querySelectorAll('.rp-objs .rp-obj-fail').length];
  out.failHeads=[...fc.querySelectorAll('.rp-sec__head')].map(e=>e.textContent);
  out.failNext=(fc.querySelector('.rp-next')||{}).textContent||'';
  out.failRev=!fc.querySelector('.rp-rev')&&!fc.querySelector('.rp-objpill');
  out.failStamp=(fc.querySelector('.rp-hero .sr-stamp')||{}).textContent;
  return out;
 });
 ok(r.win1==='reward','the report opens '+r.win1);
 ok(/\brp-win\b/.test(r.cls)&&!/rp-win--fail/.test(r.cls)&&r.head==='Mission Complete','a win is the rp-win window '+r.cls+' '+r.head);
 ok(r.credits==='1,060','credits merge pay and found '+r.credits);
 ok(r.creditRows.join('|')==='+500pay|+560found','two diamond rows '+r.creditRows.join('|'));
 ok(!r.supplyTile,'no tile for a resource not gained');
 ok(r.tiles===7&&/\+2 more/.test(r.more)&&/Arsenal/.test(r.more),'9 loot entries: 7 tiles and +N more '+r.tiles+' '+r.more);
 ok(r.first[0]&&/Ship/.test(r.first[1])&&/Cross/.test(r.first[1]),'the ship comes first '+r.first);
 ok(r.pill==='All 3 objectives'&&r.objList===0,'a win shows the objectives pill, not the list '+r.pill+' '+r.objList);
 ok(r.loc==='Akkaro|Dustfall','the location block names world and region '+r.loc);
 ok(r.stamp==='Secured','the Secured stamp '+r.stamp);
 ok(r.levelUp[0]&&r.levelUp[1]==='Level 3','a level-up shows the gold bar and the badge '+r.levelUp);
 ok(r.injured[0]&&r.injured[1]==='Injured'&&!r.injured[2]&&r.injured[3],'injured: badge, the word, no days '+r.injured);
 ok(/--from:20%/.test(r.xpGrow)&&/--gain:10%/.test(r.xpGrow),'the XP bar grows from the old fill '+r.xpGrow);
 ok(r.revBar&&/gradient/.test(r.revNow),'the revolution bar is ember '+r.revNow);
 ok(r.revRows.some(x=>/mission$/.test(x))&&r.revRows.some(x=>/first operation in Akkaro/.test(x))&&r.revRows.some(x=>/liberation$/.test(x)),'revolution breakdown rows '+r.revRows.join('|'));
 ok(r.lib[0]&&/0% → 10%/.test(r.lib[1]),'liberation on the .gx-wheel '+r.lib);
 ok(r.foot[0]==='Continue'&&r.foot[1],'footer: Continue only, no note '+r.foot);
 ok(Math.round(r.width)===880,'880px window '+r.width);
 ok(r.lost[0]&&r.lost[1]&&r.lost[2]&&r.lost[3]==='Lost','a lost rebel: striped, skull, no XP bar '+r.lost);
 ok(r.noResTile,'nothing gained, no resource tiles');
 ok(r.fail==='reward'&&/rp-win--fail/.test(r.failCls),'a failure is rp-win--fail '+r.failCls);
 ok(r.failCount==='1 / 3'&&r.failObjs[0]===1&&r.failObjs[1]===2,'failed objectives in full, the count red '+r.failCount+' '+r.failObjs);
 ok(r.failHeads.some(h=>/^Recovered/.test(h))&&!r.failHeads.some(h=>/Resources/.test(h)),'Recovered, not Resources '+r.failHeads);
 ok(/Fail test stays on the Mission Board/.test(r.failNext),'the board note '+r.failNext);
 ok(r.failRev,'no revolution section or objectives pill on a failure');
 ok(r.failStamp==='Mission failed','the failed stamp');

 // ---- phone: the window goes full screen and the body stacks
 await pg.setViewportSize({width:420,height:860});
 await pg.waitForTimeout(300);
 const ph=await pg.evaluate(()=>{
  const f=window.DBGbase.fn,G=window.DBGbase.G;
  for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  G.missions.push({id:'rptphone',name:'Phone test',desc:'Test.',objectives:['A'],req:{transport:true,team:1},days:0,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{c:100}});
  f.applyDebrief({missionId:'rptphone',kind:'ground',days:0,win:true,people:[{id:'dax',xp:0.05,state:'ok'}],loot:{c:0,s:0,items:['carbine','scatter','medpack','blam','akli','cowboy','shells','stim']}});
  for(let i=0;i<8&&f.getWin()&&f.getWin()!=='reward';i++)f.closeWin();
  const loot=[document.querySelectorAll('.rp-loot__tile').length,!!document.querySelector('.rp-loot__more')];
  const card=document.querySelector('#winCardB'),body=card.querySelector('.rp-body');
  const cols=getComputedStyle(body).gridTemplateColumns.split(' ').length;
  return {loot,cols,w:card.offsetWidth,vw:document.querySelector('#sc-base').clientWidth,h:card.offsetHeight,sh:document.querySelector('#winsB').clientHeight,res:getComputedStyle(card.querySelector('.rp-res')||body).gridTemplateColumns.split(' ').length};
 });
 ok(ph.cols===1&&ph.w===ph.vw&&ph.h===ph.sh&&ph.loot[0]===5&&ph.loot[1],'the phone layout stacks and fills the screen '+JSON.stringify(ph));

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('report-smoke: all passed');
})();
