/* Smoke test for Rebel Traits (experiences): node tools/exp-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const R=window.Rebel,D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const mk=(id,level,extra)=>Object.assign({id,name:id+' Test',first:id,role:'Soldier',level,xp:0,assign:'rest',injured:0,charTrait:'brave',traits:[],morale:60,rank:0,rankMissions:0,missions:0,kills:0,injuries:0,sx:{}},extra||{});
  const C0=()=>0,C1=()=>0.99;
  // ----- registry
  out.reg=[R.RT.length,R.RT.filter(t=>t.live).length,R.RT.every(t=>t.q&&t.e&&t.n&&t.pri>=0)];
  const dead=mk('d',1);out.deadGrant=R.expGrant(dead,'lostEye');
  // ----- cap and priority
  const c=mk('c',1);
  R.expGrant(c,'blooded');R.expGrant(c,'firesupport');R.expGrant(c,'battlehard');
  out.cap=[c.traits.length,R.expGrant(c,'blooded')];
  out.replace=[R.expGrant(c,'veteran'),c.traits.map(t=>t.k).sort().join(',')];
  const hi=mk('hi',1);R.expGrant(hi,'veteran');R.expGrant(hi,'lostsquad');R.expGrant(hi,'grieving',undefined,{days:3});
  out.refuse=[R.expGrant(hi,'blooded'),R.expGrant(hi,'decorated'),hi.traits.map(t=>t.k).join(',')];
  // ----- review rules
  const rv=(p,ctx)=>R.review(p,Object.assign({win:true,sec:1,tid:'steal'},ctx||{}),C0).map(g=>g.k).join(',');
  const a=mk('a',1,{kills:1});out.blooded=rv(a);
  const b3=mk('b3',1);out.hard=[0,1,2].map(()=>rv(b3,{down:true}));
  const fs=mk('fs',1);out.fire=rv(fs,{heavy:4});
  const nd=mk('nd',1);out.near=rv(nd,{nearDeath:true,down:true});
  const al=mk('al',1);out.alone=rv(al,{alone:true,win:false});
  const vt=mk('vt',1,{missions:10});out.vet=rv(vt);
  const ms=mk('ms',1);out.mspec=[rv(ms),rv(ms),rv(ms)];
  const dc=mk('dc',1);out.deco=[rv(dc,{quiet:true}),rv(dc,{quiet:true})];
  const pc=mk('pc',1);out.panicky=[rv(pc,{panics:1}),rv(pc,{panics:2}),rv(pc,{panics:1})];
  const pr=mk('pr',1);out.proved=[rv(pr,{win:false}),rv(pr,{win:true,sec:2})];
  const gl=mk('gl',1);out.guilt=R.review(gl,{win:true,alliesLost:1,sec:1},C0).map(g=>g.k).sort().join(',');
  const hd=mk('hd',1,{injuries:3,missions:5});out.hardened=rv(hd);
  const ds=mk('ds',1,{kills:12});out.desens=rv(ds);
  const bk=mk('bk',1,{morale:10});out.broken=[R.breakCheck(bk,{down:true,win:false}),R.expHas(bk,'broken')];
  // ----- pairs
  const run=(x,y,n,ctx,rand)=>{let o=[];for(let i=0;i<n;i++)o=o.concat(R.pairReview(x,y,Object.assign({win:true,hurt:()=>false},ctx||{}),rand||C1));return o.map(g=>g.k).join(',');};
  const p1=mk('p1',2),p2=mk('p2',2);out.friends=[run(p1,p2,3),run(p1,p2,1),p1.traits.map(t=>t.k+':'+t.with).join(),p2.traits.map(t=>t.k+':'+t.with).join()];
  const q1=mk('q1',2),q2=mk('q2',2);run(q1,q2,4);out.oldF=run(q1,q2,6);
  const r1=mk('r1',2),r2=mk('r2',2);run(r1,r2,4);out.battle=run(r1,r2,3,{hurt:()=>true});
  const m1=mk('m1',9),m2=mk('m2',2);out.mentor=[run(m1,m2,3),m1.traits.map(t=>t.k).join(),m2.traits.map(t=>t.k).join()];
  const v1=mk('v1',3,{charTrait:'perfectionist'}),v2=mk('v2',3,{charTrait:'reckless'});out.rivals=[run(v1,v2,3,{},C0),run(v1,v2,1,{win:false},C0),v1.traits.length];
  const l1=mk('l1',3),l2=mk('l2',3);run(l1,l2,7);
  out.love=run(l1,l2,1,{},C0);out.loveTraits=[l1.traits.map(t=>t.k).join(),l2.traits.map(t=>t.k).join()];
  // a full slate blocks a friendship for both
  const f1=mk('f1',2),f2=mk('f2',2);for(const k of ['lostsquad','veteran','love'])R.expGrant(f1,k,k==='love'?'zz':undefined);
  out.blocked=[run(f1,f2,5),f1.traits.length,f2.traits.length];
  // ----- bereavement
  const be=mk('be',2);R.expGrant(be,'friends','gone');out.bereaveF=[JSON.stringify(R.bereave(be,'gone','died')),be.traits.map(t=>t.k).join()];
  const bb=mk('bb',2);R.expGrant(bb,'battlebros','gone');out.bereaveB=R.bereave(bb,'gone','died')[0].d;
  const mt=mk('mt',2);R.expGrant(mt,'mentored','gone');out.bereaveM=[R.bereave(mt,'gone','died').some(x=>x.avenge),R.expHas(mt,'avenging')];
  const lf=mk('lf',2);R.expGrant(lf,'friends','gone');out.bereaveL=[R.bereave(lf,'gone','left').length,lf.traits.length];
  // ----- daily
  const gr=mk('gr',2);R.expGrant(gr,'grieving',undefined,{days:2});R.expDaily(gr,C1);const still=R.expHas(gr,'grieving');R.expDaily(gr,C0);out.grief=[still,R.expHas(gr,'grieving'),R.expHas(gr,'resolve')];
  const bz=mk('bz',2,{morale:20});R.expGrant(bz,'broken',undefined,{});R.expDaily(bz,C1);const still2=R.expHas(bz,'broken');bz.morale=60;R.expDaily(bz,C1);out.broke=[still2,R.expHas(bz,'broken'),R.expHas(bz,'redeemed')];
  // ----- numbers
  const mm=(tr,d,kind)=>{const p=mk('mm',1,{charTrait:'brave',traits:tr.map(k=>({k}))});const b0=p.morale;R.moraleBump(p,d,kind);return Math.round((p.morale-b0)*100)/100;};
  out.mm=[mm([],-10,'loss'),mm(['hardened'],-10,'loss'),mm(['resolve'],-10,'death'),mm(['hardened'],10,'win'),mm(['desens'],10,'win')];
  out.nerve=[R.nerveMul(mk('n',1)),R.nerveMul(mk('n',1,{traits:[{k:'veteran'}]}))];
  out.drift=[R.driftTarget(mk('d',1)),R.driftTarget(mk('d',1,{traits:[{k:'redeemed'},{k:'proved'}]}))];
  out.cool=[R.coolOf(mk('c',1),'g'),R.coolOf(mk('c',1,{traits:[{k:'broken'}]}),'g')];
  out.spaceNames=R.namesFor(mk('s',1,{role:'Pilot',traits:[{k:'veteran'}]}),'s');
  return out;
 });
 ok(r.reg[0]>=55&&r.reg[1]>=25&&r.reg[2],'registry '+r.reg);
 ok(r.deadGrant===false,'unavailable traits cannot be granted');
 ok(r.cap[0]===3&&r.cap[1]===false,'cap of three, no duplicates '+r.cap);
 ok(r.refuse[0]===false&&r.refuse[1]===false&&r.refuse[2]==='veteran,lostsquad,grieving','a weaker trait is refused when the slate is strong '+r.refuse);
 ok(r.replace[0]===true&&!/blooded/.test(r.replace[1]),'a stronger trait pushes out the weakest '+r.replace);
 ok(/blooded/.test(r.blooded),'blooded '+r.blooded);
 ok(r.hard[0]===''&&r.hard[1]===''&&/battlehard/.test(r.hard[2]),'battle-hardened after three close calls '+r.hard);
 ok(/firesupport/.test(r.fire),'fire support '+r.fire);
 ok(/nearlydead/.test(r.near)&&/luckyesc/.test(r.near),'nearly dead + lucky escape '+r.near);
 ok(/laststanding/.test(r.alone)&&/lostsquad/.test(r.alone),'last one standing / lost a squad '+r.alone);
 ok(/veteran/.test(r.vet),'veteran at 10 missions '+r.vet);
 ok(/mspec/.test(r.mspec[2])&&!/mspec/.test(r.mspec[1]),'mission specialist at 3 of a kind '+r.mspec);
 ok(/decorated/.test(r.deco[1])&&!/decorated/.test(r.deco[0]),'decorated after two notable '+r.deco);
 ok(/panicky/.test(r.panicky[2])&&!/panicky/.test(r.panicky[1]),'panicky after three panics '+r.panicky);
 ok(/proved/.test(r.proved[1]),'proved themselves '+r.proved);
 ok(r.guilt==='guilt,vengeful','survivor guilt / vengeful '+r.guilt);
 ok(/hardened/.test(r.hardened)&&/desens/.test(r.desens),'hardened / desensitised');
 ok(r.broken[0]===true&&r.broken[1]===true,'broken '+r.broken);
 ok(r.friends[0]===''&&r.friends[1]==='friends'&&r.friends[2]==='friends:p2'&&r.friends[3]==='friends:p1','friendship forms after four missions together '+r.friends);
 ok(/oldfriends/.test(r.oldF),'old friends '+r.oldF);
 ok(/battlebros/.test(r.battle),'battle brothers '+r.battle);
 ok(/mentoring/.test(r.mentor[0])&&r.mentor[1]==='mentoring'&&r.mentor[2]==='mentored','mentor and trainee '+r.mentor);
 ok(r.rivals[0]===''&&/rivals/.test(r.rivals[1])&&r.rivals[2]===1,'rivals after a shared failure, never friends '+r.rivals);
 ok(/love/.test(r.love)&&r.loveTraits[0].indexOf('love')>=0&&r.loveTraits[1].indexOf('love')>=0,'love '+r.love+' '+r.loveTraits);
 ok(r.blocked[1]===3&&r.blocked[2]===0,'a full slate blocks the friendship for both '+r.blocked);
 ok(/-15/.test(r.bereaveF[0])&&/grief/.test(r.bereaveF[0])&&r.bereaveF[1]==='grieving','friend dies '+r.bereaveF);
 ok(r.bereaveB===-30,'battle brother dies '+r.bereaveB);
 ok(r.bereaveM[0]&&r.bereaveM[1],'mentor dies');
 ok(r.bereaveL[0]===0&&r.bereaveL[1]===0,'a deserter just drops the link '+r.bereaveL);
 ok(r.grief[0]===true&&r.grief[1]===false,'grief runs out '+r.grief);
 ok(r.broke[0]===true&&r.broke[1]===false&&r.broke[2]===true,'broken recovers into redeemed '+r.broke);
 ok(JSON.stringify(r.mm)==='[-10,-8,-7,9,8.5]','morale multipliers '+r.mm);
 ok(r.nerve[1]<r.nerve[0],'veteran nerve');
 ok(r.drift[0]===60&&r.drift[1]===66,'drift target '+r.drift);
 ok(r.cool[1]===r.cool[0]-15,'broken cool '+r.cool);
 ok(r.spaceNames.indexOf('Veteran')>=0,'veteran reaches space '+r.spaceNames);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'exp-smoke (engine): all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
