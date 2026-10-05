/* Fixes from the legacy sweep (docs/LEGACY_AUDIT.md §10): node tools/sweep-smoke.js (needs NODE_PATH=$(npm root -g)).
   0  reloading a new campaign does not re-run the old-save fixes (the ×4 economy, the Revolution Level reset).
   1  every reinforcement seat on a support Graf is outfitted, and nobody strips seats 3 and 4 to arm the squad.
   2  live:0 kit cannot be carried, and a ground unit handed kit with no combat stats fights bare-handed.
   5  the barracks healing perk covers Marines and Heroes, not just Soldiers.
   6  a reload mid-mission gives back the sortie's fuel and supply drop.
   7  the reward window shows the XP actually gained (traits and the mentor bonus included).
   8  the scenes share one set of helpers (SR.util, SR.audio.tick/dice, SR.hud.tag) instead of their own copies. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};

 // ---- 2, 5, 7 on the base
 const a=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,R=window.Rebel,out={};
  const P=id=>G().people.find(p=>p.id===id);
  // 0: reloading a brand-new campaign changes nothing (it used to rescale the economy ×4 and reset the Revolution Level)
  {const g=JSON.parse(JSON.stringify(G()));g.revLevel=2;g.renown=60;const before=[g.credits,g.supplies,g.materials,g.fuel,2,60].join();
   f.restoreCampaign({campaign:g,started:true});out.reload=[[G().credits,G().supplies,G().materials,G().fuel,G().revLevel,G().renown].join(),before];}
  const mk=(id,role,extra)=>{const p=R.migrate(Object.assign({id,name:id+' Test',role,level:1,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'},extra||{}));G().people.push(p);return p;};
  // 2: a live:0 weapon in the armory is never offered, auto-equipped or left in a slot
  G().armory.push({id:'plasmasmg',name:'Improvised Plasma SMG',n:3,desc:'x'});
  const dax=P('dax'),pri=dax.gear.primary;dax.gear.primary=null;G().armory.find(a=>a.id==='akli').n=0;f.autoEquip();
  out.auto=dax.gear.primary;
  dax.gear.primary='plasmasmg';f.reconcileGear();
  out.reconciled=dax.gear.primary;
  f.openWin('person',dax);document.querySelector('[data-gear-slot="dax:primary:0"]').click();
  out.offered=!!document.querySelector('[data-gear-pick="dax:primary:0:plasmasmg"]');
  f.closeWin();
  G().armory=G().armory.filter(x=>x.id!=='plasmasmg');G().armory.find(a=>a.id==='akli').n=6;dax.gear.primary=pri;f.autoEquip();
  // 5: a Marine and a Soldier, both laid up, heal at the same rate with the barracks staffed
  const sol=mk('sol','Soldier'),mar=mk('mar','Marine'),off=mk('off','Support',{assign:'station:barracks'});R.layUp(sol,'downed',6);R.layUp(mar,'downed',6);
  out.barracks=!!G().rooms.find(r=>r.key==='barracks');
  f.advanceDay();
  out.heal=[6-R.laidUp(sol),6-R.laidUp(mar)];
  G().people=G().people.filter(p=>!['sol','mar','off'].includes(p.id));
  // 7: a Quick Learner's reward line shows +10%
  const ql=mk('ql','Soldier',{charTrait:'quicklearner'});
  const m={id:'xptest',name:'XP test',desc:'Test.',objectives:['Test'],req:{transport:true,team:1},days:0,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{c:10}};
  G().missions.push(m);
  const xp0=ql.xp;
  f.applyDebrief({missionId:'xptest',kind:'ground',days:0,win:true,people:[{id:'ql',xp:0.5,state:'ok'}]});
  out.gained=Math.round((ql.xp-xp0+(ql.level-1)*100)*100)/100;
  for(let i=0;i<6&&f.getWin()&&f.getWin()!=='reward';i++)f.closeWin();
  out.win=f.getWin();
  const row=[...document.querySelectorAll('.sr-loot')].find(r=>r.textContent.indexOf('ql Test')>=0);
  out.shown=row?row.textContent:'';
  f.closeWin();
  return out;
 });
 ok(a.reload[0]===a.reload[1],'reloading a new campaign leaves resources and Revolution Level alone '+a.reload);
 ok(a.auto!=='plasmasmg','auto-equip skips live:0 kit '+a.auto);
 ok(a.reconciled===null,'live:0 kit in a slot is put back in the armory '+a.reconciled);
 ok(!a.offered,'the gear picker does not offer live:0 kit');
 ok(a.win==='reward'&&a.shown.indexOf('XP +55%')>=0,'the reward window shows the XP gained after traits '+a.win+' '+a.shown);
 ok(a.barracks&&a.heal[0]===a.heal[1]&&a.heal[0]>=1,'Marines get the barracks perk too '+a.heal);

 // ---- 1 and 6: launch a ground mission with a support Graf carrying four reinforcements
 const c=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,R=window.Rebel,out={};
  const mk=(id,role)=>{const p=R.migrate({id,name:id+' Test',role,level:1,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'});G().people.push(p);return p;};
  const lead=mk('lead','Soldier'),rs=[1,2,3,4].map(i=>mk('rf'+i,'Soldier')),home=[1,2,3,4,5].map(i=>mk('hm'+i,'Soldier'));
  const p1=mk('pa','Pilot'),p2=mk('pb','Pilot');
  G().fighters.push(f.newFighter({id:'gA',name:'Graf A',cls:'graf',hull:100}),f.newFighter({id:'gB',name:'Graf B',cls:'graf',hull:100}));
  // exactly enough rifles for whoever is armed now; reinforcements 3 and 4 already hold theirs
  f.autoEquip();
  for(const p of G().people)if(p.gear)p.gear.primary=null;
  for(const p of [rs[2],rs[3],...home])p.gear.primary='akli';
  G().armory.find(a=>a.id==='akli').n=7;
  G().fuel=500;G().supplies=500;
  const m={id:'rftest',name:'Reinforcement test',desc:'Test.',objectives:['Test'],req:{transport:true,team:1},days:1,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{c:10}};
  G().missions.push(m);
  f.openPlan(m);
  const PL=f.getPL();
  PL.v.team0='lead';PL.v.tv0='gA';PL.v.tp0='pa';
  f.plAddAsset();PL.v.as0s='gB';PL.v.as0p='pb';PL.assets[0].mode='reinforce';f.plSyncAssets();
  rs.forEach((p,i)=>{PL.v['as0r'+i]=p.id;});
  PL.drop=true;
  out.seats=PL.slots.filter(sl=>sl.acc==='rsoldier').length;
  const f0=G().fuel,s0=G().supplies;
  f.startPlan();
  out.spent=[f0-G().fuel,s0-G().supplies];
  out.armed=[lead,...rs].map(p=>p.gear.primary||'-').join();
  out.sortie=G().sortie&&[G().sortie.f,G().sortie.s];
  // the page reloads mid-mission: the saved campaign comes back with its fuel and supply drop
  const saved=JSON.parse(JSON.stringify(G()));
  f.restoreCampaign({campaign:saved,started:true});
  out.back=[G().fuel===f0,G().supplies===s0,G().sortie===undefined,G().news.some(n=>n.html.indexOf('called off')>=0)];
  // a debrief clears the record, so a normal return refunds nothing
  G().sortie={name:'x',f:5,s:0};
  f.applyDebrief({missionId:'rftest',kind:'ground',days:0,win:false,people:[]});
  out.cleared=G().sortie===undefined;
  return out;
 });
 ok(c.seats===4,'a Graf offers four reinforcement seats '+c.seats);
 ok(c.armed==='akli,akli,akli,akli,akli','the squad and all four reinforcements carry rifles '+c.armed);
 ok(c.spent[0]>0&&c.spent[1]===160&&c.sortie&&c.sortie[0]===c.spent[0]&&c.sortie[1]===160,'the sortie records what it spent '+c.spent+' '+c.sortie);
 ok(c.back.every(Boolean),'a mid-mission reload hands the fuel and the drop back '+c.back);
 ok(c.cleared,'a debrief clears the sortie record');

 // ---- 2 (ground side): a rebel sent with kit that has no combat stats fights bare-handed
 await pg.evaluate(()=>window.SR.go('ground',{test:true,mission:{kind:'ground',missionId:'intel',scenario:'intel',days:1,
   squad:[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['mininglaser']},{id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['plasmasmg','cowboy']}]}}));
 await pg.waitForTimeout(700);
 const g=await pg.evaluate(()=>{const U=window.DBGground.U;return ['dax','runa'].map(id=>U.find(u=>u.id===id).wpns.join('+')).join();});
 ok(g==='unarmed,cowboy','unknown kit is dropped at the ground scene '+g);

 // ---- 8 shared helpers
 const u=await pg.evaluate(()=>{
  const U=window.SR.util,out={};
  let a=1;const rng=()=>{a=(a*16807)%2147483647;return a/2147483647;};
  const rolls=[];for(let i=0;i<500;i++)rolls.push(U.rint(2,5,rng));
  out.rint=[Math.min(...rolls),Math.max(...rolls)].join();
  out.pick=['x'].includes(U.pick(['x'],rng));
  out.clamp=[U.clamp(-1,0,1),U.clamp(.5,0,1),U.clamp(9,0,1)].join();
  out.dist=U.dist({x:0,y:0},{x:3,y:4});
  const m1=U.mulberry32(42),m2=U.mulberry32(42);out.mul=m1()===m2()&&m1()!==m1();
  out.hash=U.hashStr('dax')===U.hashStr('dax')&&U.hashStr('dax')!==U.hashStr('cass');
  {const el=U.scoped(document.body)('resC');out.scoped=!!el&&el===document.getElementById('resC');}
  out.audio=typeof window.SR.audio.tick==='function'&&typeof window.SR.audio.dice==='function';
  out.tag=window.SR.hud.tag('Hurt','red');
  return out;
 });
 ok(u.rint==='2,5'&&u.pick&&u.clamp==='0,0.5,1'&&u.dist===5,'SR.util rolls and maths '+JSON.stringify(u));
 ok(u.mul&&u.hash&&u.scoped&&u.audio,'SR.util seeds, hashes and lookups; shared UI sounds '+JSON.stringify(u));
 ok(u.tag==='<span class="sr-tag sr-tag--red">Hurt</span>','SR.hud.tag '+u.tag);

 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'sweep-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
