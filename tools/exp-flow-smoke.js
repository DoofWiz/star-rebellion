/* Rebel Traits wired into the game: node tools/exp-flow-smoke.js (needs NODE_PATH=$(npm root -g)). */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(async()=>{
  const R=window.Rebel,D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const P=id=>G().people.find(p=>p.id===id);
  const $=s=>document.querySelector(s);
  const newsHas=re=>G().news.some(n=>re.test(JSON.stringify(n)));
  const mission=(people,extra)=>f.applyDebrief(Object.assign({missionId:'none',days:0,win:true,people},extra||{}));
  // temperaments that cannot clash so friendships can form
  for(const id of ['dax','runa','kel'])P(id).charTrait='steady';
  // ---- blooded from a first kill, in the news
  mission([{id:'dax',xp:0,state:'ok',kills:2},{id:'runa',xp:0,state:'ok'},{id:'kel',xp:0,state:'ok'}]);
  out.blooded=[R.expHas(P('dax'),'blooded'),newsHas(/killed for the first time/)];
  // ---- four missions together: friendships
  for(let i=0;i<4;i++)mission([{id:'dax',xp:0,state:'ok'},{id:'runa',xp:0,state:'ok'},{id:'kel',xp:0,state:'ok'}]);
  const fr=id=>(P(id).traits||[]).filter(t=>t.k==='friends').map(t=>t.with).sort().join('+');
  out.friends=[fr('dax'),fr('runa'),fr('kel'),newsHas(/have become friends/)];
  // ---- the dossier names the friend
  f.openWin('person',P('dax'));
  const html=$('#winCardB').innerHTML;
  out.card=[html.indexOf('Experiences')>=0,/Friends with (Runa|Kel)/.test(html)];
  // the recruit offer has no experiences section
  const nr=R.migrate({id:'rec81',name:'Fresh Face',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,bio:'x'});
  f.openWin('recruit',{cards:[{p:nr,must:false}]});out.recruitHides=$('#winCardB').innerHTML.indexOf('Experiences')<0;
  // ---- losing a friend: grief, morale, and sitting out
  const daxFriends=(P('dax').traits||[]).filter(t=>t.k==='friends').map(t=>t.with);
  const lostId=daxFriends[0];
  P('dax').morale=60;
  mission([{id:'dax',xp:0,state:'ok'},{id:lostId,xp:0,state:'lost'}],{win:false});
  out.grief=[!!P(lostId),R.expHas(P('dax'),'grieving'),P('dax').morale<50,f.ablePilots?1:1];
  out.sitOut=!G().people.filter(p=>p.role==='Soldier'&&!p.injured&&p.assign!=='mission'&&!R.expHas(p,'grieving')).some(p=>p.id==='dax');
  for(let i=0;i<8;i++)f.moraleTick();
  out.recovered=[R.expHas(P('dax'),'grieving'),newsHas(/found their feet/)];
  // fresh people from here on: whoever was lost above is gone
  const fresh=(id,lvl)=>{const q=R.migrate({id,name:id+' Fresh',role:'Soldier',level:lvl||1,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'steady'});G().people.push(q);return q;};
  // ---- mentored players learn faster beside their mentor
  const kel=fresh('mt1',1),runa=fresh('mt2',8);
  kel.traits=[{k:'mentored',with:'mt2'}];runa.traits=[{k:'mentoring',with:'mt1'}];
  mission([{id:'mt1',xp:0.1,state:'ok'},{id:'mt2',xp:0,state:'ok'}]);
  const g1=kel.xp;
  kel.xp=0;kel.level=1;mission([{id:'mt1',xp:0.1,state:'ok'}]);
  out.mentorXp=[Math.round(g1*1000)/1000,Math.round(kel.xp*1000)/1000];
  // ---- scars from a long injury
  const rn=fresh('sc1',2);rn.injured=1;rn.injDur=6;f.advanceDay();
  out.scarred=R.expHas(P('sc1'),'scarred');
  // ---- rivals wind each other up at launch
  const a=fresh('rv1',2),c=fresh('rv2',2);a.traits=[{k:'rivals',with:'rv2'}];c.traits=[{k:'rivals',with:'rv1'}];a.morale=60;c.morale=60;
  f.squadTension([a,c]);out.tension=[a.morale,c.morale];
  // ---- squad entries carry relationships and traits into the scene
  a.traits=[{k:'battlebros',with:'rv2'},{k:'veteran'}];
  const e=f.squadEntry(a,false);out.entry=[JSON.stringify(e.rels),e.tr.indexOf('veteran')>=0];
  return out;
 });
 ok(r.blooded[0]&&r.blooded[1],'blooded from a kill '+r.blooded);
 ok(r.friends[3]&&r.friends[0]&&r.friends[1]&&r.friends[2],'friendships formed '+r.friends);
 ok(r.card[0]&&r.card[1],'dossier shows experiences and names the friend '+r.card);
 ok(r.recruitHides,'recruit offer hides experiences');
 ok(r.grief[0]===false&&r.grief[1]&&r.grief[2],'losing a friend: gone, grieving, morale hit '+r.grief);
 ok(r.sitOut,'a grieving rebel is not available');
 ok(r.recovered[0]===false&&r.recovered[1],'grief ends '+r.recovered);
 ok(r.mentorXp[0]>r.mentorXp[1]*1.2,'mentored rebels learn faster beside the mentor '+r.mentorXp);
 ok(r.scarred,'scarred after a long injury');
 ok(r.tension[0]<=57.01&&r.tension[1]<=57.01,'rivals lose morale at launch '+r.tension);
 ok(r.entry[0]==='[["battlebros","rv2"]]'&&r.entry[1],'squad entry carries rels '+r.entry);
 // ---- the scene
 await pg.evaluate(()=>window.SR.go('ground',{}));
 await pg.waitForTimeout(1200);
 const g=await pg.evaluate(()=>{
  const gd=window.DBGground,f=gd.fn,U=gd.U,out={};
  const mk=(id,tr,extra)=>f.mkU(Object.assign({id,pid:id,name:id,first:id,side:'reb',x:100,y:100,hp:100,maxhp:100,aim:2,def:12,cool:65,level:1,wpns:['akli'],tr:tr||[],rels:[]},extra||{}));
  const foe=f.mkU({id:'foe',name:'F',first:'F',side:'law',x:300,y:100,hp:100,maxhp:100,aim:2,def:10,cool:65,wpns:['cowboy']});
  const atk=(u,w)=>f.computeATK(u,foe,w||'akli',false).total;
  const base=atk(mk('b'));
  out.mods=[atk(mk('v',['veteran']))-base,atk(mk('k',['broken']))-base,atk(mk('n',['nemesis']))-base,atk(mk('a',['avenging']))-base,atk(mk('m',[],{ms:1}))-base,atk(mk('r',[],{rivalEdge:1}))-base,atk(mk('h',['firesupport']),'rocket')-atk(mk('h2'),'rocket')];
  // partners: battle brothers present on the field
  const bro=mk('bro',[],{});U.push(bro);
  const me=mk('me',[],{rels:[['battlebros','bro']]});U.push(me);
  out.bro=[atk(me)-base,f.relUp(me,['battlebros'])];
  bro.down=1;out.broDown=[atk(me)-base,f.relUp(me,['battlebros'])];bro.down=0;
  const old=mk('old',[],{rels:[['oldfriends','bro']]});U.push(old);out.oldF=atk(old)-base;
  // outnumbered
  const ls=mk('ls',['laststanding']);
  out.ls=atk(ls)-base;
  // cool: panicky, nearly dead, broken
  const cl=(tr,wound)=>{const u=mk('c'+Math.random(),tr,{wound:wound?1:0});u.cool=65;f.adjCoolG(u,-20,'Dax down');return 65-u.cool;};
  out.cool=[cl([]),cl(['panicky']),cl(['broken'])];
  const nd=(wound)=>{const u=mk('nd'+Math.random(),['nearlydead'],{wound:wound?1:0});u.cool=65;f.adjCoolG(u,-20,'took a hit');return 65-u.cool;};
  out.nd=[nd(false),nd(true)];
  // heartbreak: a friend goes down and the other panics at once
  const pa=mk('pa',[],{rels:[['friends','pb']]}),pb=mk('pb',[]);U.push(pa,pb);pa.cool=70;
  f.downUnit(pb,null);out.heart=[pa.cool<=15,f.coolStateG(pa)];
  // an acquaintance does not
  const pc=mk('pc',[],{rels:[]});U.push(pc);pc.cool=70;const pd=mk('pd',[]);U.push(pd);f.downUnit(pd,null);out.nonbond=pc.cool>40;
  // telemetry: minimum hp, panics and the result
  const hero=U.find(u=>u.id==='dax');
  if(hero){f.woundUnit(foe,hero,60,false);f.adjCoolG(hero,-80,'took a hit');}
  const res=f.buildResult(true);
  const rec=res.people.find(p=>p.id==='dax');
  out.tel=rec?[rec.minHp,rec.panics>=1]:null;
  return out;
 });
 ok(JSON.stringify(g.mods)==='[1,-2,1,1,1,1,1]','combat modifiers '+g.mods);
 ok(g.bro[0]===2&&g.bro[1]===true&&g.broDown[0]===0&&g.broDown[1]===false,'battle brothers bonus only while the partner stands '+g.bro+' / '+g.broDown);
 ok(g.oldF===1,'old friends +1 '+g.oldF);
 ok(g.ls===0||g.ls===2,'last one standing is conditional '+g.ls);
 ok(g.cool[1]>g.cool[0]&&g.cool[2]>g.cool[0],'panicky and broken lose nerve faster '+g.cool);
 ok(g.nd[1]<g.nd[0],'nearly dead holds together when wounded '+g.nd);
 ok(g.heart[0]&&g.heart[1]==='panic','a bonded partner going down panics at once '+g.heart);
 ok(g.nonbond,'strangers do not');
 ok(g.tel&&g.tel[0]<=0.4&&g.tel[1],'telemetry reaches the result '+g.tel);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'exp-flow-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
