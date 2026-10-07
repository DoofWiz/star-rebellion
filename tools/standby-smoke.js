/* Standby and Working at the base (designer notes of 2026-10-07): a rebel with nothing to do is on Standby and mills
   about the base; one posted to a room is Working; they rest when told to, or on their own when they are Weary.
   node tools/standby-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const D=window.DBGbase,f=D.fn,G=()=>D.G,R=window.Rebel,out={};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const tagOf=p=>{f.syncUI();const el=$('[data-person="'+p.id+'"] .sr-unit__side');return el?el.textContent:'';};
  const dax=G().people.find(p=>p.id==='dax');
  // the default is Standby, for the starting crew and a new recruit alike
  out.start=[...new Set(G().people.filter(p=>!p.auto).map(p=>p.assign))].join();
  out.recruit=f.castRebel({id:'rec77',name:'New Face',role:'Soldier'}).assign;
  out.tag=tagOf(dax);
  out.awake=[f.onStandby(dax),f.resting(dax),f.sleepers().includes(dax)].join();
  // Weary on Standby: off to their bunk on their own, and the rest does them good
  dax.tired=R.WEARY_AT;dax.weary=1;
  out.weary=[f.onStandby(dax),f.resting(dax),f.sleepers().includes(dax)].join();
  dax.morale=50;f.advanceDay();out.restMorale=dax.morale>50-0.6;
  dax.tired=0;dax.weary=0;dax.conked=0;
  // told to Rest: in their bunk
  dax.assign='rest';out.rest=[f.resting(dax),tagOf(dax)].join();
  // the file: Standby, Rest and Train
  dax.assign='standby';f.openWin('person',dax);
  const btn=t=>$$('#winCardB .pf-assign .sr-btn').find(x=>x.textContent===t);
  out.file=[!!btn('Standby'),btn('Standby')&&btn('Standby').getAttribute('aria-pressed'),!!btn('Rest'),!!btn('Train')].join();
  btn('Rest').click();out.clicked=dax.assign;
  f.openWin('person',dax);
  $$('#winCardB .pf-assign .sr-btn').find(x=>x.textContent==='Standby').click();out.clicked2=dax.assign;
  // Working: a Support rebel posted to their room
  const doc=R.migrate({id:'doc1',name:'Doc Test',role:'Support',sspec:'doctor',level:1,xp:0,assign:'room:infirmary',bio:'Physician.',morale:60});
  G().people.push(doc);
  out.work=tagOf(doc);
  // the scene draws the idle about the base and the rooms they hang about in
  try{
    f.syncUI();
    out.lounge=f.loungeRoom();
    for(const k of ['barracks','command','infirmary']){f.enterRoom(k);}
    f.exitRoomView();
  }catch(e){out.err=e.message;}
  // a walker stepping onto the next tile is drawn after it (it used to paint over them for half a step), after a
  // room behind them and before a room in front of them
  {
    const items=[],seq=[];
    for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(r!==0&&r!==3)items.push({d:r+c,r,c,fn:()=>seq.push('t'+r+c)});
    items.push({d:0.1,cells:[[0,0],[0,1],[0,2],[0,3]],fn:()=>seq.push('back')});    // a room along the north
    items.push({d:3.1,cells:[[3,0],[3,1],[3,2],[3,3]],fn:()=>seq.push('front')});   // and one along the south
    const rr=1,cc=1.4;   // walking east, 40% of the way from (1,1) to (1,2)
    items.push({d:Math.ceil(rr)+Math.ceil(cc)+0.5,on:[[1,1],[1,2]],fn:()=>seq.push('walker')});
    for(const it of f.baseDrawOrder(items))it.fn();
    const at=k=>seq.indexOf(k);
    out.walkOrder=[at('walker')>at('t12'),at('walker')>at('t11'),at('walker')>at('back'),at('walker')<at('front')].join();
  }
  // an older save: Rest was everyone's default, so they stand up onto Standby
  const old=JSON.parse(JSON.stringify(G()));
  old.v=9;for(const p of old.people)if(!p.auto&&p.assign==='standby')p.assign='rest';
  const keep=D.G;D.G=old;f.upgradeSave();
  out.migr=[...new Set(old.people.filter(p=>!p.auto&&!String(p.assign).startsWith('room:')).map(p=>p.assign))].join();
  D.G=keep;
  G().people=G().people.filter(p=>p!==doc);
  return out;
 });
 await pg.waitForTimeout(400);   // a few frames of the base map with Standby rebels in it
 ok(r.start==='standby','the starting crew is on Standby '+r.start);
 ok(r.recruit==='standby','a new rebel starts on Standby '+r.recruit);
 ok(r.tag==='Standby','the crew rail shows Standby '+r.tag);
 ok(r.awake==='true,false,false','on Standby: up and about, not in a bunk '+r.awake);
 ok(r.weary==='false,true,true','Weary on Standby: they go to their bunk on their own '+r.weary);
 ok(r.restMorale,'and the rest does their morale good');
 ok(r.rest==='true,Resting','told to Rest: in their bunk, tagged Resting '+r.rest);
 ok(r.file==='true,true,true,true','the file offers Standby (pressed), Rest and Train '+r.file);
 ok(r.clicked==='rest'&&r.clicked2==='standby','the buttons set the assignment '+[r.clicked,r.clicked2]);
 ok(r.work==='Working','a rebel posted to a room is Working '+r.work);
 ok(!r.err&&r.lounge==='barracks','the scene draws them, and they hang about the Barracks '+[r.err,r.lounge]);
 ok(r.walkOrder==='true,true,true,true','a walker is drawn over the tile they step onto, after the room behind, before the room in front '+r.walkOrder);
 ok(r.migr==='standby','an older save: resters stand up onto Standby '+r.migr);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 await b.close();
 if(fails.length){console.log('standby-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('standby-smoke: all checks passed');
})();
