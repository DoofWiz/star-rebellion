/* Results in and out (docs/MAIN-SWITCH-HANDOFF.md S6, §5 test 7): node tools/results35-smoke.js
   (needs NODE_PATH=$(npm root -g)).
   In:  the player's wing flies (its pilots' levels and nerve, their traits through the one mapping table, the ships'
        configurations); a ship starts at its stored hull %
   Out: a scripted mission's end lands in G: the days go by; a pilot whose ship came home gains XP; picked up is injured,
        captured is gone with a rescue lead (G.captured), lost is lost (the pods, decision 4); hulls are stored, a lost ship
        is gone; the stand-in pay arrives; the Firebrand Broadcast and the witnesses add Exposure; a spent asset is used
        up and an unspent one comes home; Dig deeper's Intel is spent */
const {chromium}=require('playwright');
const path=require('path');
const base='file://'+path.resolve(__dirname,'../game/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
 await pg.emulateMedia({reducedMotion:'reduce'});
 await pg.goto(base+'?dev#test');await pg.waitForTimeout(1200);
 await pg.evaluate(()=>window.SR.go('base',{}));await pg.waitForTimeout(500);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 // a wing of four: Ada (a Cross stored at 70%), Bo, Cy and Di; two pilots friends; an Unmanned Ram and a Minefield; 5 Intel
 const r=await pg.evaluate(async()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={};
  for(let i=0;i<10&&f.getWin();i++)f.closeWin();
  const tmpl=G.people.find(x=>x.role==='Pilot');
  const pilot=(id,name,level,traits)=>{const p=JSON.parse(JSON.stringify(tmpl));p.id=id;p.name=name;p.level=level;p.assign='standby';p.cond=[];p.traits=traits||[];p.charTrait='brave';G.people.push(p);return p;};
  const ship=(id,cls,name,hull)=>{const s=f.newFighter({id,name,cls,hull});G.fighters.push(s);return s;};
  G.people=G.people.filter(x=>x.role!=='Pilot');G.fighters=[];G.wings=[];
  const a=pilot('ra','Ada Pilot',6,[{k:'friends',with:'rb'}]),bp=pilot('rb','Bo Pilot',2,[{k:'friends',with:'ra'}]),c=pilot('rc','Cy Pilot',3),d=pilot('rd','Di Pilot',3);
  ship('sa','cross','Ada Cross',70);ship('sb','talon','Bo Talon',100);ship('sc','talon','Cy Talon',100);ship('sd','talon','Di Talon',100);
  a.ship='sa';bp.ship='sb';c.ship='sc';d.ship='sd';f.wingsTidy();
  G.assets={ram:1,mines:1};G.intel=5;G.exposure=0;G.credits=1000;
  f.addMission('intercept',true);
  out.wings=f.wings35().map(w=>w.ships.map(s=>s.shipId+':'+s.hullFrac+':'+JSON.stringify(s.traits)));
  const day0=G.day,cred0=G.credits;
  f.fly35('intercept');
  await new Promise(res=>setTimeout(res,700));
  const X=window.DBGspace35.hc35,B=X.B,q=s=>document.querySelector('#arHc35 '+s);
  // Dig deeper (1 Intel), the primary, the assets, launch
  const dig=q('[data-act="dig"]');if(dig&&dig.getAttribute('aria-disabled')!=='true')dig.click();else B.intel--;
  q('[data-primary="destroy"]').click();
  B.plan.assets=['ram','mines'];
  for(const w in B.plan.wings)B.plan.wings[w].exec={k:'destroy',arg:null};
  X.fn.launch();
  const S=X.S,L=X.L,by=id=>S.ships.find(s=>s.id===id);
  out.start=[Math.round(by('pf_sa').hull/by('pf_sa').maxHull*100),by('pf_sb').hull===by('pf_sb').maxHull,by('pf_sa').pilot.level,by('pf_sb').persona,
    S.ships.filter(s=>s.faction==='reb'&&s.wing).length];
  // the scripted end: Ada home; Bo's pod picked up; Cy's pod captured; Di down with no pod. The ram used, the mines not; a
  // Broadcast; two witnesses jumped away; the primary done (the base's report lists the objectives flown)
  X.fn.run(20);
  for(const id of ['pf_sb','pf_sc','pf_sd']){const s=by(id);s.alive=false;s.hull=0;}
  L.pods=L.pods.filter(p=>!['pf_sb','pf_sc','pf_sd'].includes(p.ship));
  L.pods.push({id:'podb',ship:'pf_sb',name:'Bo',state:'aboard',by:'pf_sa'},{id:'podc',ship:'pf_sc',name:'Cy',state:'captured'});
  const sa=by('pf_sa');sa.alive=true;sa.hull=Math.round(sa.maxHull*0.5);
  L.used.ram=1;L.used.broadcast=1;
  const heg=S.ships.filter(s=>s.faction==='heg'&&!s.struct&&s.id!=='fl400').slice(0,2);for(const h of heg){h.jumped=true;h.alive=false;}out.jumpedN=heg.length;out.missRew=Object.assign({},G.missions.find(m=>m.id==='intercept').rew);   // S7: one wing meets a scaled-down escort
  S.objectives[0].state='done';S.over={outcome:'won',why:'scripted'};
  window.SR_ARENA_HC.api.onOver();
  out.result=X.fn.campResult();
  X.fn.campDone();
  await new Promise(res=>setTimeout(res,900));
  for(let i=0;i<12&&f.getWin();i++)f.closeWin();
  const P=id=>G.people.find(x=>x.id===id),Fs=id=>G.fighters.find(x=>x.id===id);
  out.after={active:SR.active,days:G.day-day0,ada:[!!P('ra'),(P('ra')||{}).xp],bo:[!!P('rb'),f.outDays?f.outDays(P('rb')):null],cy:[!P('rc'),(G.captured||[]).some(x=>x.id==='rc')],
    di:!P('rd'),hull:[(Fs('sa')||{}).hull,!Fs('sd'),!!Fs('sb')],credits:G.credits-cred0,exposure:G.exposure,assets:Object.assign({},G.assets),intel:G.intel};
  return out;
 });
 const res=r.result||{},rew=res.rew35||{};
 ok(r.wings.length===1&&r.wings[0].length===4&&/^sa:0\.7:/.test(r.wings[0][0])&&/friend/.test(r.wings[0][0])&&/green/.test(r.wings[0][1]),'In: the wing as 3.5 flies it: the stored hull, the friends, a rookie is green '+JSON.stringify(r.wings));
 ok(r.start[0]===70&&r.start[1]&&r.start[2]===6&&r.start[3]==='eager'&&r.start[4]===4,'In: a ship starts at its stored hull %; the pilot\'s level; Brave makes them eager '+JSON.stringify(r.start));
 ok(res.kind==='space'&&res.space35&&res.win===true&&(res.people||[]).map(p=>p.id+':'+p.state).join()==='ra:ok,rb:injured,rc:captured,rd:lost','Out: the pods map: home ok, picked up injured, captured, lost '+JSON.stringify(res.people));
 ok(JSON.stringify(res.assets)==='{"spent":["ram"],"kept":["mines"]}'&&res.broadcast===true&&res.witnesses===r.jumpedN&&r.jumpedN>=1&&res.intelSpent===1,'Out: assets spent and kept, the Broadcast, the witnesses, the Intel '+JSON.stringify([res.assets,res.broadcast,res.witnesses,res.intelSpent]));
 ok((res.objs||[])[0]&&res.objs[0].t==='Destroy (primary)'&&res.objs[0].done===true,'Out: the objectives flown, for the base report '+JSON.stringify(res.objs));
 const a=r.after;
 ok(a.active==='base'&&a.days>=1,'the base, the mission\'s days gone by '+JSON.stringify([a.active,a.days]));
 ok(a.ada[0]&&a.ada[1]>0,'Ada came home with XP '+JSON.stringify(a.ada));
 ok(a.bo[0]&&a.bo[1]>0,'Bo, picked up, is laid up injured '+JSON.stringify(a.bo));
 ok(a.cy[0]&&a.cy[1],'Cy, captured, is gone, with a rescue lead (G.captured) '+JSON.stringify(a.cy));
 ok(a.di,'Di, lost, is lost (no Infirmary to stabilise them) '+JSON.stringify(a.di));
 ok(a.hull[0]===50&&a.hull[1]&&!a.hull[2],'hulls: Ada\'s Cross at 50%, the lost ships gone '+JSON.stringify(a.hull));
 ok(a.credits===(r.missRew.c||0)&&a.credits>0,'S7: a Source opportunity pays the mission reward '+JSON.stringify([a.credits,r.missRew]));
 ok(a.exposure===5+2*r.jumpedN+2,'Exposure: +5 the Broadcast, +2 a witness, +2 the operation (flown now: S7) '+JSON.stringify([a.exposure,r.jumpedN]));
 ok(a.assets.ram===0&&a.assets.mines===1,'the spent ram is used up, the unspent minefield comes home '+JSON.stringify(a.assets));
 ok(a.intel===5-1+(r.missRew.i||0),'Dig deeper spent 1 Intel '+JSON.stringify([a.intel,r.missRew.i]));
 await b.close();
 ok(!errs.length,'no page errors: '+errs.slice(0,5).join(' | '));
 console.log(JSON.stringify({fails,r},null,0));
 if(fails.length){console.error('results35-smoke FAILED:\n - '+fails.join('\n - '));process.exit(1);}
 console.log('results35-smoke OK');
})();
