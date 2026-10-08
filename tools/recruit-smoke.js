/* Smoke test for recruiting (an Agent's search since SCREENS-HANDOFF-2 §3.5) and the multi-card New Recruit
   screen: node tools/recruit-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const days=n=>{for(let i=0;i<n;i++)f.advanceDay();};
  // the Command Center card points at the network; an Agent's Recruit operation starts the search
  out.cardIdle=f.recruitCard().indexOf('data-gointel')>=0&&f.recruitCard().indexOf('data-recruit-start')<0;
  const ag=G().agents[0];
  f.agentRecruit(ag);
  out.started=[G().recruit.agent===ag.id,G().recruit.days];
  f.agentRecruit(ag);out.noDouble=G().recruit.days;
  out.cardBusy=G().recruit.days===3;
  // nobody yet after two days, someone on the third
  days(2);out.before=[G().recWait.length,f.getWin()];
  // someone working the Command Center means at least two candidates
  // Mission Control working the Command Center (a bunk of their own, so a barracks room more)
  G().rooms.push({id:'rm_bx',key:'barracks',r:7,c:9,w:1,h:1,up:[]});
  const mc=window.Rebel.migrate({id:'mcx',name:'Mic Control',role:'Support',level:1,xp:0,assign:'room:command',bio:'Dispatcher with a gift for knowing where everybody is.',morale:60});G().people.push(mc);
  days(1);
  out.win=f.getWin();
  out.waiting=G().recWait.length;
  out.cards=$$('.bs-reccard').length;
  const ps=G().recWait;
  out.roles=ps.every(p=>['Soldier','Support','Pilot'].includes(p.role));
  out.unique=new Set(ps.map(p=>p.id)).size===ps.length&&new Set(ps.map(p=>p.name)).size===ps.length;
  out.traits=ps.every(p=>p.charTrait&&p.first&&p.last&&p.morale===60&&p.rank===0);
  out.noRank=document.querySelector('#winCardB').innerHTML.indexOf('bs-dz__tags"><span class="sr-tag sr-tag--action"')<0;
  // accept the first: the screen stays with the rest
  const n0=G().people.length,w0=G().recWait.length;
  $('[data-rec-accept="0"]').click();
  out.afterAccept=[G().people.length-n0,G().recWait.length-w0,f.getWin(),$$('[data-rec-accept]').length];
  // leave the others waiting
  if(f.getWin()==='recruit'){
    const later=$('[data-rec-later]');out.laterBtn=!!later;
    (later||$('[data-rec-no]')).click();
  }
  out.afterLater=[f.getWin(),G().recWait.length];
  out.cardWaiting=f.recruitCard().indexOf('data-recruit-review')>=0;
  f.agentRecruit(ag);out.cantRestart=G().recruit.days>0;
  // review brings them back; dismiss clears them
  if(G().recWait.length){
    $('[data-recruit-review]')||0;
    f.openWin('recruit',{cards:G().recWait.map(p=>({p})),batch:true});
    let guard=9;while(f.getWin()==='recruit'&&guard--){const no=$('[data-rec-no]');if(!no)break;no.click();}
  }
  out.cleared=[f.getWin(),G().recWait.length];
  // a single offer keeps the classic layout and still works
  const p=window.Rebel.migrate({id:'rec77',name:'Solo Test',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'});
  f.openWin('recruit',{cards:[{p,must:false,line:'Vouched for.'}]});
  out.single=[$$('.bs-reccard').length,!!$('.sr-window__foot [data-rec-accept]'),!!$('.sr-window__foot [data-rec-no]')];
  const n1=G().people.length;$('[data-rec-accept]').click();
  out.singleAccepted=[G().people.length-n1,f.getWin()];
  // full barracks: accept is disabled and the task will not start
  const cap=f.bunkCap();while(G().people.length<cap){G().people.push(window.Rebel.migrate({id:'fill'+G().people.length,name:'F'+G().people.length+' X',role:'Soldier',level:1,xp:0,assign:'rest',injured:0}));}
  f.agentRecruit(ag);days(3);
  out.full=[G().recWait.length,G().news.some(n=>/empty-handed/.test(n.html))];
  return out;
 });
 ok(r.cardIdle,'the Command Center card points at the Intelligence tab');
 ok(r.started[0]===true&&r.started[1]===3,'the search is the agent\'s task, 3 days '+r.started);
 ok(r.noDouble===3,'second start refused '+r.noDouble);
 ok(r.cardBusy,'the task runs its days');
 ok(r.before[0]===0&&r.before[1]!=='recruit','nobody arrives early '+r.before);
 ok(r.win==='recruit','the New Recruit screen opens on arrival: '+r.win);
 ok(r.waiting>=2&&r.waiting<=3&&r.cards===r.waiting,'2-3 candidates as cards: '+r.waiting+' / '+r.cards);
 ok(r.roles&&r.unique&&r.traits,'candidates are well formed '+[r.roles,r.unique,r.traits]);
 ok(r.noRank,'recruit cards hide rank');
 ok(r.afterAccept[0]===1&&r.afterAccept[1]===-1,'accepting one joins one: '+r.afterAccept);
 ok(r.afterLater[0]!=='recruit'&&r.afterLater[1]===(r.waiting-1),'leaving them waiting '+r.afterLater);
 ok(r.cardWaiting&&r.cantRestart===false,'card offers review and blocks a new call');
 ok(r.cleared[0]!=='recruit'&&r.cleared[1]===0,'dismissing clears them '+r.cleared);
 ok(r.single[0]===0&&r.single[1]&&r.single[2],'single offer keeps classic layout '+r.single);
 ok(r.singleAccepted[0]===1&&r.singleAccepted[1]!=='recruit','single accept '+r.singleAccepted);
 ok(r.full[0]===0&&r.full[1],'a full barracks sends the search home empty-handed '+r.full);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'recruit-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
