/* Mission text: node tools/mission-text-smoke.js (needs NODE_PATH=$(npm root -g)). DESIGN_BLOCKERS C-26.
   Every reusable mission type takes its words from game/js/mission-text.js, filled in for the deployment:
   - every line of every type fills completely (no {variable} left over) and none names the Marta;
   - the board's objectives and offer come from the type, with "the transport" before one is picked;
   - the planning board sends the transport the player picked into the mission, and the ground scene uses its name:
     briefing, live objectives, arrival call, landing-zone label, call-in button and end screen, win and lose;
   - a saved mission that carried its own copy of the type's words (m.tpl) loses it and reads the type's;
   - Hegemony guards get a name from their type's pool, unique in the scene, and their type's lines;
     story characters (Sheriff Reeve, Boss Craw) keep their own. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
const SQUAD=[{id:'dax',name:'Dax Ferro',first:'Dax',aim:2,hp:100,wpns:['akli','cowboy']},
             {id:'runa',name:'Runa Vel',first:'Runa',aim:2,hp:100,wpns:['akli','cowboy']},
             {id:'kel',name:'Kel Brasso',first:'Kel',aim:2,hp:100,wpns:['akli','cowboy']}];
const TYPES=['stealfuel','intel','autofactory','rescue','ambush','towers'];
const TEXTSETS=['stealfuel','intel','autofactory','rescue','ambush','stealship','towers'];   // Steal Ship's ground scene has a test of its own
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const left=t=>/\{\w+\}/.test(t);

 // ---- every line of every type fills, and none names the Marta
 const st=await pg.evaluate(()=>{
  const MT=window.MT,V={transport:'Hauler 2',pilot:'Joss',target:'widget yard',place:'Saltreach',npc:'Ada Quill',npc1:'Ada',
    carrier:'Dax',device:'charge',hacker:'Runa',fallen:'Kel Brasso',n:1,total:5,SRC:'VENN',ship:'FT-4 Cross',shipPilot:'Sera'};
  const lines=[];
  const walk=(o,at)=>{if(typeof o==='string')lines.push([at,o]);else if(o&&typeof o==='object')for(const k in o)walk(o[k],at+'.'+k);};
  walk(MT.TYPES,'TYPES');walk(MT.COMMON,'COMMON');walk(MT.FOES.types,'FOES');
  return {left:lines.filter(([,t])=>/\{\w+\}/.test(MT.fill(t,V))).map(x=>x[0]),
    marta:lines.filter(([,t])=>/Marta|Graf\b/.test(t)).map(x=>x[0]),n:lines.length,
    keys:Object.keys(MT.TYPES).map(k=>MT.TYPES[k].scenario).join()};
 });
 ok(st.n>150,'the text sets hold the type text '+st.n);
 ok(!st.left.length,'every line fills with no {variable} left '+st.left.slice(0,5));
 ok(!st.marta.length,'no type line names the Marta or the Graf '+st.marta.slice(0,5));
 ok(st.keys===TEXTSETS.join(),'one text set per reusable type '+st.keys);

 // ---- the board: a deployment's words come from its type; the transport is not picked yet
 const bd=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const m=f.spawnMission('fuel',{loc:'akkaro',region:'flats',target:'fuel store'});
  out.obj=m.objectives.join(' | ');out.desc=m.desc;out.tpl=m.tpl===undefined;
  // an older save's mission with its own copy of the words: the migration drops it, the type's words come back
  const old=f.spawnMission('towers',{loc:'parity',region:'dataflats'});
  old.tpl={desc:'old desc with the Marta',obj:['Return to the Marta'],after:[]};old.objectives=['Return to the Marta'];
  G().missions.push(old);
  const saved=JSON.parse(JSON.stringify(G()));saved.v=3;
  f.restoreCampaign({campaign:saved,started:true});
  const back=G().missions.find(x=>x.id===old.id);
  out.migrated=[back.tpl===undefined,back.objectives.join(' | '),G().v===f.saveVersion()];
  // planning: the transport picked goes into the mission
  const R=window.Rebel;
  const mk=(id,role)=>{const p=R.migrate({id,name:id+' Test',role,level:1,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'});G().people.push(p);return p;};
  const s1=mk('ts1','Soldier'),s2=mk('ts2','Soldier'),s3=mk('ts3','Soldier'),pl=mk('tp1','Pilot');
  G().fighters.push(f.newFighter({id:'h2',name:'Hauler 2',cls:'graf',hull:100}));
  G().fuel=500;
  const mm=f.spawnMission('fuel',{loc:'akkaro',region:'flats',target:'fuel store'});
  mm.state='avail';G().missions.push(mm);
  f.openPlan(mm);
  const PL=f.getPL();
  PL.v.team0=s1.id;PL.v.team1=s2.id;PL.v.team2=s3.id;PL.v.tv0='h2';PL.v.tp0=pl.id;
  f.startPlan();
  out.transport=window.SR.mission&&window.SR.mission.transport;
  return out;
 });
 ok(bd.tpl,'a new deployment carries no copy of the words');
 ok(/Reach the fuel store/.test(bd.obj)&&/Call in the transport/.test(bd.obj)&&!/Marta/.test(bd.obj+bd.desc)&&!left(bd.obj+bd.desc),'board objectives come from the type '+bd.obj);
 ok(bd.migrated[0]&&!/Marta/.test(bd.migrated[1])&&bd.migrated[2],'an old save drops m.tpl and reads the type '+bd.migrated);
 ok(bd.transport&&bd.transport.name==='Hauler 2'&&bd.transport.cls==='graf','the picked transport goes into the mission '+JSON.stringify(bd.transport));

 // ---- the ground scene, per type: everything names the picked transport and fills
 for(const sc of TYPES){
  for(const win of [true,false]){
   const m={kind:'ground',missionId:sc,scenario:sc,days:2,squad:SQUAD,grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'},
     transport:{id:'h2',name:'Hauler 2',cls:'graf'},charges:1,limpets:0,
     vip:sc==='rescue'||sc==='ambush'?{name:'Ada Quill',first:'Ada'}:undefined,
     ctx:{title:'Test Job',place:'Saltreach',target:'widget yard',variant:'',sub:'Saltreach · Menk',eyebrow:'Ground Operation · Saltreach, Menk',flavour:'Flavour.'}};
   await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),m);await pg.waitForTimeout(600);
   const r=await pg.evaluate(win=>{
    const g=window.DBGground,S=g.SCN,f=g.fn,q=s=>document.querySelector('#sc-ground '+s);
    f.syncUI();
    const out={brief:q('#gObj').innerText+' '+(S.brief.hint||''),objs:q('#objList').innerText,arrive:S.csLine,lz:S.lzLabel,banner:S.banner.join(' / '),
      title:S.title,place:S.place,target:S.target,labels:[S.foesLabel,S.calmLabel,S.alertLabel].join(),
      usesTransport:/\{transport\}/.test(JSON.stringify([S.mt.obj,S.mt.notes,S.mt.hint]))};
    const law=g.U.filter(u=>u.side==='law'&&!u.veh);
    out.names=law.map(u=>u.name);out.pooled=law.filter(u=>u.pooled).length;out.lines=law.every(u=>u.lines&&u.lines.length);
    f.gameOver(win,win?undefined:'squad');
    out.end=[q('#endEyebrow').innerText,q('#endTitle').innerText,q('#endText').innerText,q('#endLoot').innerText].join(' | ');
    return out;
   },win);
   const all=[r.brief,r.objs,r.arrive,r.lz,r.banner,r.labels,r.end].join(' ');
   const tag=sc+(win?' (win)':' (lose)');
   ok(!left(all),tag+': no {variable} left: '+all.match(/\{\w+\}/));
   ok(!/Marta|\bGraf\b/.test(all),tag+': nothing names the Marta');
   ok(!/Akkaro|Redrock|Kiln Ridge|Tollgate|Data Flats|Parity|herder|tithe/i.test(all),tag+': nothing from the first story deployment leaks in');
   if(win){
    if(r.usesTransport)ok(/Hauler 2/.test(r.brief+r.objs),tag+': the briefing and objectives name the transport picked');
    ok(/Saltreach/.test(r.arrive)&&r.lz==='LZ'&&r.title==='Test Job',tag+': arrival call, LZ and title follow the context '+[r.arrive,r.lz,r.title]);
    ok(r.objs.split('\n').length>=3,tag+': live objectives listed');
    ok(new Set(r.names).size===r.names.length&&r.names.every(Boolean),tag+': every guard has a name, none twice '+r.names);
    ok(r.pooled>0&&r.lines,tag+': guards take their type\'s name and lines '+r.pooled);
   }
   ok(r.end.length>40,tag+': end screen written '+r.end.slice(0,80));
  }
 }
 // fuel: the call-in button names the transport
 {
  const m={kind:'ground',missionId:'stealfuel',scenario:'stealfuel',days:2,squad:SQUAD,transport:{id:'h2',name:'Hauler 2',cls:'graf'},
    grafPilot:{id:'joss',name:'Joss Marrek',first:'Joss'}};
  await pg.evaluate(m=>window.SR.go('ground',{test:true,mission:m}),m);await pg.waitForTimeout(600);
  const r=await pg.evaluate(()=>{const g=window.DBGground,f=g.fn;
   const d=g.U.find(u=>u.id==='dax');d.x=g.PAD.x;d.y=g.PAD.y;f.fuelReach();f.syncUI();
   return {btn:(document.querySelector('#sc-ground #callBtn')||{}).textContent||'',place:g.SCN.place,target:g.SCN.target};});
  ok(/Call in the Hauler 2/.test(r.btn),'the call-in button names the transport '+r.btn);
  ok(r.place==='Redrock Flats'&&r.target==='fuel depot','a deployment with no context falls back to the map\'s own place and the first target name '+[r.place,r.target]);
 }
 // story characters keep their own names and lines
 {
  await pg.evaluate(SQ=>window.SR.go('ground',{test:true,mission:{kind:'ground',missionId:'stealcross',scenario:'stealcross',days:2,squad:SQ}}),SQUAD);await pg.waitForTimeout(600);
  const r=await pg.evaluate(()=>{const U=window.DBGground.U,reeve=U.find(u=>u.id==='reeve');return [reeve&&reeve.name,reeve&&!reeve.pooled];});
  ok(r[0]==='Sheriff Reeve'&&r[1],'Sheriff Reeve keeps his name and lines '+r);
 }

 ok(!errs.length,'no page errors '+errs.slice(0,3));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('mission-text-smoke: all checks passed');
})();
