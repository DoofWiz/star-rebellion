/* The Fire support menu (screens handoff 3): node tools/firesupport-smoke.js (needs NODE_PATH=$(npm root -g)).
   Calls grouped by where they come from (the transport, other ships, Mission Control); a called one stays listed with
   its status; while sneaking the loud ones show locked; the pick pill names the call and the step; Heavy Bombardment
   waits for the end of the round; Door Gunner Cover works every enemy in its zone. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},{id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']}];
const M={kind:'ground',missionId:'intel',scenario:'intel',days:1,squad:SQUAD,
  grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},transport:{doorgun:1,cls:'graf',name:'Marta'},
  assets:{drop:1,ships:[{mode:'strafe',cls:'cross',name:'Dustfall',pilot:{name:'Sera Venn',first:'Sera'},soldiers:[]}]},
  sup:{scan:1,bombard:1}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),M);await pg.waitForTimeout(800);
 const r=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,out={},$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const open=()=>{f.syncUI();if($('#fsMenu').hidden)$('#fsBtn').click();};
  // sneaking: the quiet calls live, the loud ones locked with a reason
  out.free=gd.phase;open();
  out.freeRows=$$('#fsMenu .fsm-row').map(e=>(e.getAttribute('data-fs')||'locked')+(e.classList.contains('is-locked')?'!':'')).join();
  // planning: grouped by source, every call live
  f.startPlanning();open();
  out.groups=$$('#fsMenu .fsm-src b').map(e=>e.textContent).join('|');
  out.rows=$$('#fsMenu .fsm-row[data-fs]').map(e=>e.getAttribute('data-fs')).join();
  out.tips=$$('#fsMenu .fsm-row').every(e=>e.hasAttribute('data-tip')&&e.hasAttribute('data-tip-right'));
  out.words=['Drops at start of next round','2 Rounds','Indiscriminate','Hits at round end'].every(w=>$('#fsMenu').textContent.indexOf(w)>=0);
  // the pick pill names the call and the step
  $('#fsMenu [data-fs="s0"]').click();
  out.pill=$('#pickPill').textContent;
  // the bombardment waits for the end of the round
  const d=gd.U.find(u=>u.id==='dax');
  f.fsPlace('bombard',{x:d.x+60,y:d.y});
  out.bombQueued=[gd.FS.orders.some(o=>o.kind==='bombard'&&!o.done),gd.FS.bombard];
  open();
  out.bombStatus=($('#fsMenu [aria-disabled] .fsm-status')||{}).textContent||'';
  f.fsRoundEnd();
  out.bombDone=gd.FS.orders.some(o=>o.kind==='bombard'&&o.done);
  return out;
 });
 ok(r.free==='FREE'&&/drop/.test(r.freeRows)&&/scan/.test(r.freeRows)&&/locked!/.test(r.freeRows),'sneaking: drop and scan live, the loud calls locked '+r.freeRows);
 ok(r.groups==='Marta|Dustfall|Mission Control','grouped by source: transport, other ship, Mission Control '+r.groups);
 ok(r.rows==='drop,s1,s0,bombard,scan','every call live while planning '+r.rows);
 ok(r.tips&&r.words,'each row carries its tip beside it, and the agreed words '+[r.tips,r.words]);
 ok(/Strafing Run/.test(r.pill)&&/1 of 2/.test(r.pill),'the pick pill names the call and the step '+r.pill);
 ok(r.bombQueued.join()==='true,2'&&/round end/.test(r.bombStatus)&&r.bombDone,'Heavy Bombardment is marked, shows Inbound, and hits at round end '+JSON.stringify([r.bombQueued,r.bombStatus,r.bombDone]));
 const src=require('fs').readFileSync(path.resolve(__dirname,'../game/js/ground.js'),'utf8');
 ok(!/\.slice\(0,SUP\(\)\.saturate\?5:3\)/.test(src),'Door Gunner Cover has no target cap');
 if(errs.length)fails.push('page errors: '+errs.join(' | '));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('firesupport-smoke: all checks passed');
})();
