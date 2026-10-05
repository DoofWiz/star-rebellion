/* Rest and weariness (Rebels & Recruits doc: Rest; DESIGN_BLOCKERS M-6): node tools/rest-smoke.js
   (needs NODE_PATH=$(npm root -g)). Two missions without rest make a rebel Weary (a morale hit, a tag, rest at the
   base for a day per mission); sent out Weary they lose morale and fight worse; pushed to four they are Conked and off
   duty until they have slept it off. Heavy Sleeper rests slower and shrugs off the morale hits; Light Sleeper rests
   faster. */
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
  f.setRng(()=>0.99);
  const mk=(id,trait,extra)=>{const p=R.migrate(Object.assign({id,name:id+' Test',role:'Soldier',level:2,xp:0,assign:'rest',bio:'x',charTrait:trait||'brave',morale:60},extra||{}));G().people.push(p);return p;};
  const back=(...ps)=>f.applyDebrief({missionId:'none',days:0,win:true,people:ps.map(p=>({id:p.id,xp:0,state:'ok'}))});
  // the arithmetic
  const a=mk('ra');
  out.fresh=[a.tired,a.weary,a.conked].join();
  back(a);out.one=[a.tired,!!a.weary,a.morale].join();
  back(a);out.two=[a.tired,!!a.weary,a.morale,R.restDays(a)].join();
  out.news=G().news.slice(-3).some(n=>/weary and needs a break/.test(n.html));
  // Weary: still on the list, tagged; worse in a fight
  out.pool=f.soldierPool().includes(a);
  const e=f.squadEntry(a,false),fresh=f.squadEntry(mk('rb'),false);
  out.fx=[fresh.aim-e.aim,fresh.cool-e.cool].join();
  // sent out Weary: a morale hit; pushed to four they are Conked and off the list
  back(a);out.three=[a.tired,a.morale].join();
  back(a);out.four=[a.tired,!!a.conked,f.soldierPool().includes(a)].join();
  a.assign='station:barracks';out.staff=f.staffOf('barracks').includes(a);a.assign='rest';
  // a day at the base rests one mission off; the day they are fit again there is news
  const d0=a.tired;f.advanceDay();out.day=[d0-a.tired,!!a.conked].join();
  for(let i=0;i<10&&a.tired>0;i++)f.advanceDay();
  out.fit=[a.tired,!!a.weary,!!a.conked,f.soldierPool().includes(a)].join();
  out.fitNews=G().news.slice(-12).some(n=>/slept it off/.test(n.html));
  // days on a mission are not rest
  const m=mk('rm');m.tired=1;m.assign='mission';f.advanceDay();out.away=m.tired;m.assign='rest';
  // the sleepers
  const h=mk('rh','heavysleeper'),l=mk('rl','lightsleeper');
  back(h,l);back(h,l);
  out.sleepMorale=[h.morale,l.morale].join();
  out.rates=[R.restRate(h),R.restRate(l),R.restDays(h),R.restDays(l)].join();
  // a pilot back from a strike is tired too, and fights a little worse in space while Weary
  const pl=R.migrate({id:'rp',name:'rp Pilot',role:'Pilot',level:2,xp:0,assign:'rest',bio:'x',charTrait:'brave',morale:60});G().people.push(pl);
  const aim0=f.pilotAimMod(pl);pl.tired=2;pl.weary=1;out.pilot=aim0-f.pilotAimMod(pl);
  // the Sleeper traits are live
  out.live=[R.CTK.heavysleeper.live,R.CTK.lightsleeper.live].join();
  // an old save gets the fields from the migration
  const old=JSON.parse(JSON.stringify(G()));old.v=1;for(const p of old.people){delete p.tired;delete p.weary;delete p.conked;}
  f.restoreCampaign({campaign:old,started:true});
  out.mig=G().people.every(p=>p.auto||(p.tired===0&&!p.weary&&!p.conked));
  return out;
 });
 ok(r.fresh==='0,0,0','a new rebel is rested '+r.fresh);
 ok(r.one==='1,false,60','one mission: tired, not Weary '+r.one);
 ok(r.two==='2,true,56,2','two without rest: Weary, a morale hit, two days of rest '+r.two);
 ok(r.news,'the news says they need a break');
 ok(r.pool,'a Weary rebel can still be picked');
 ok(r.fx==='1,10','Weary costs 1 aim and 10 nerve in a fight '+r.fx);
 ok(r.three==='3,53','sent out Weary: another morale hit '+r.three);
 ok(r.four==='6,true,false','four without rest: Conked (plus two days), off the mission list '+r.four);
 ok(r.staff===false,'a Conked rebel does not work a post');
 ok(r.day==='1,true','a day at the base rests one mission off '+r.day);
 ok(r.fit==='0,false,false,true','rested back to zero they are fit again '+r.fit);
 ok(r.fitNews,'the news says when they have slept it off');
 ok(r.away===1,'days away on a mission are not rest '+r.away);
 ok(r.sleepMorale==='60,56','Heavy Sleeper never loses morale for being Weary; Light Sleeper does '+r.sleepMorale);
 ok(r.rates==='0.5,1.5,4,2','Heavy Sleeper rests at half rate, Light Sleeper half again as fast '+r.rates);
 ok(r.pilot===1,'a Weary pilot takes 1 off their aim in space '+r.pilot);
 ok(r.live==='1,1','Heavy Sleeper and Light Sleeper are live '+r.live);
 ok(r.mig,'an old save starts everyone rested');
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'rest-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
