/* Save versions: node tools/save-smoke.js (needs NODE_PATH=$(npm root -g)).
   A campaign carries its schema version (G.v). Loading runs each migration from the save's version up to this
   build's, once and in order; a new campaign is born at the current version, so none run on it. Work every load
   needs (new worlds, rebels' defaults, a sortie the page closed on) still happens on every load. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[],warns=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='warning')warns.push(m.text());});
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const clone=()=>JSON.parse(JSON.stringify(G()));
  const V=f.saveVersion();
  out.born=[G().v,V,V>=1].join();
  // a save from before versioning: old shapes are brought up to date once
  const old=clone();delete old.v;
  for(const k of ['econ4','locModel','medSeeded'])delete old[k];
  old.rooms[0].key='bay';old.fighters.push({id:'fv',name:'Old Viper',cls:'viper',hull:90});
  old.people[0].injured=3;old.credits=100;old.revLevel=1;
  f.restoreCampaign({campaign:old,started:true});
  out.v0=[G().v,G().rooms[0].key,G().fighters.find(x=>x.id==='fv').cls,G().credits,(G().people[0].cond||[]).some(c=>c.k==='downed'),'injured' in G().people[0]].join();
  // a current save: no one-off fix runs again (a 'bay' left in a versioned save stays as it is)
  const cur=clone();cur.rooms[0].key='bay';cur.credits=100;
  f.restoreCampaign({campaign:cur,started:true});
  out.v1=[G().v,G().rooms[0].key,G().credits].join();
  G().rooms[0].key='hangar';
  // a new migration runs once, in order, and the version follows
  let ran=0;f.MIGRATIONS_().push(()=>{ran++;G().migTest=(G().migTest||0)+1;});
  const a=clone();f.restoreCampaign({campaign:a,started:true});
  const twice=clone();f.restoreCampaign({campaign:twice,started:true});
  out.chain=[ran,G().v,f.saveVersion(),G().migTest].join();
  f.MIGRATIONS_().pop();delete G().migTest;G().v=f.saveVersion();
  // every load: a world missing from the save is added back; rebels are migrated
  const w=clone();const gone=w.planets.pop().id;w.people[1].injured=2;
  f.restoreCampaign({campaign:w,started:true});
  out.every=[G().planets.some(p=>p.id===gone),(G().people[1].cond||[]).some(c=>c.k==='downed')].join();
  // a save from a newer build loads as it is, with a warning
  const nw=clone();nw.v=V+5;f.restoreCampaign({campaign:nw,started:true});
  out.newer=G().v===V+5;G().v=V;
  // the version is written with the save
  f.saveSnap();
  let stored=null;try{stored=JSON.parse(localStorage.getItem('star-rebellion-campaign-v1'));}catch(e){}
  out.persist=!!stored&&stored.campaign&&stored.campaign.v===V;
  // C-17: missions keep world and region ids; renaming a world in PLANETDEF renames it on missions already saved
  const PD=f.PLANETDEF_(),d=PD.find(x=>x.regions&&x.regions.length),reg=d.regions[0];
  const mm=f.spawnMission('fuel',{loc:d.id,region:reg.id});if(!G().missions.includes(mm))G().missions.push(mm);
  const keep=[d.name,reg.name];d.name='Renamed World';reg.name='Renamed Region';
  f.restoreCampaign({campaign:clone(),started:true});
  const m2=G().missions.find(x=>x.id===mm.id);
  out.rename=m2?[m2.ctx.locName,m2.ctx.place].join('|'):'missing';
  d.name=keep[0];reg.name=keep[1];
  return out;
 });
 ok(/^4,4,true$/.test(r.born),'a new campaign is born at the current version '+r.born);
 ok(r.v0==='4,hangar,cross,400,true,false','a save from before versioning is upgraded once: rooms, ships, the x4 economy, the old injury counter '+r.v0);
 ok(r.v1==='4,bay,100','a versioned save does not re-run the one-off fixes '+r.v1);
 ok(r.chain==='1,5,5,1','a new migration runs exactly once and moves the version on '+r.chain);
 ok(r.every==='true,true','every-load work still runs on a current save '+r.every);
 ok(r.newer&&warns.some(w=>/newer build/.test(w)),'a newer save loads as it is, with a warning '+r.newer+' '+warns.length);
 ok(r.persist,'the version is saved with the campaign');
 ok(r.rename==='Renamed World|Renamed Region','a renamed world or region shows its new name on saved missions '+r.rename);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'save-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
