/* Smoke test for carried gear: node tools/gear-smoke.js (needs NODE_PATH=$(npm root -g)). */
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
  const P=id=>G().people.find(p=>p.id===id);
  const eq=p=>JSON.stringify(p.gear);
  // the opening cast: three soldiers with rifle and pistol, the pilot with a pistol
  out.start=['dax','runa','kel','joss'].map(id=>eq(P(id)));
  out.free=[f.freeOf('akli'),f.freeOf('cowboy')];
  // slots by role
  const sup=R.migrate({id:'s1',name:'Sup Port',role:'Support',level:1,xp:0,assign:'rest',injured:0,bio:'x'});G().people.push(sup);
  const mar=R.migrate({id:'m1',name:'Mar Ine',role:'Marine',level:1,xp:0,assign:'rest',injured:0,bio:'x'});G().people.push(mar);
  f.autoEquip();
  out.slots=[R.gearSlots(P('dax')).length,R.gearSlots(P('joss')).length,R.gearSlots(sup).length,R.gearSlots(mar).length];
  out.support=sup.gear;out.marine=mar.gear&&mar.gear.primary;
  G().people=G().people.filter(p=>p.id!=='m1'&&p.id!=='s1');
  // a recruit gets a rifle from stock but there is no spare pistol
  const rec=R.migrate({id:'rec50',name:'New Face',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,bio:'x',charTrait:'brave'});
  f.openWin('recruit',{cards:[{p:rec,must:false}]});$('[data-rec-accept]').click();
  out.recruit=[rec.gear.primary,rec.gear.secondary];
  // loot a pistol: it goes to the empty slot; squad entry reflects it
  f.addMission&&0;
  G().armory.find(a=>a.id==='cowboy').n++;f.autoEquip();
  out.afterLoot=rec.gear.secondary;
  out.entry=[f.squadEntry(P('dax'),false).wpns.join(','),f.squadEntry(rec,false).wpns.join(',')];
  // best first: a carbine goes to an empty primary ahead of a spare rifle
  rec.gear.primary=null;G().armory.push({id:'carbine',name:'Peacekeeper Carbine',n:1,desc:'x'});f.autoEquip();
  out.carbine=rec.gear.primary;
  // nothing at all means bare hands
  const bare=R.migrate({id:'b1',name:'Bare Hands',role:'Soldier',level:1,xp:0,assign:'rest',injured:0,bio:'x'});
  out.bare=f.wpnsFromGear(bare).join(',');
  // reconcile: stock drops below what is carried, weakest rebels lose it
  const cow=G().armory.find(a=>a.id==='cowboy');const carriers=G().people.filter(p=>f.gearSlots(p).some(s=>f.slotGet(p,s)==='cowboy'));
  P('dax').level=9;cow.n=1;f.reconcileGear();
  out.reconcile=[f.carried('cowboy'),P('dax').gear.secondary];
  cow.n=5;f.autoEquip();
  // manual change through the dossier: tap a slot, pick an item held by someone else
  const kel=P('kel');G().armory.find(a=>a.id==='akli').n=G().people.filter(p=>p.gear&&p.gear.primary==='akli').length;  // no spare rifles
  f.openWin('person',kel);
  out.rows=$$('#winCardB .bs-gearslot').length;
  $('[data-gear-slot="kel:primary:0"]').click();
  out.picker=[!!$('.bs-overlay'),$$('.bs-gearpick').length,f.getGearOverlay()&&f.getGearOverlay().k];
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  out.escGear=[!!$('.bs-overlay'),f.getWin()];
  const dax=P('dax'),daxPrimary=dax.gear.primary;
  kel.gear.primary='akli';dax.gear.primary=null;f.autoEquip();   // put things back in a known shape
  G().armory.push({id:'scatter',name:'Scattergun',n:1,desc:'x'});
  $('[data-gear-slot="kel:primary:0"]')||f.openWin('person',kel);
  f.openWin('person',kel);$('[data-gear-slot="kel:primary:0"]').click();
  const pick=$('[data-gear-pick="kel:primary:0:scatter"]');
  out.pickBtn=!!pick;
  pick.click();
  out.picked=[kel.gear.primary,getComputedStyle(document.body)?1:0];
  // take from another rebel when nothing is free
  const runa=P('runa');runa.gear.secondary='cowboy';kel.gear.secondary=null;
  const cowStock=G().armory.find(a=>a.id==='cowboy');cowStock.n=G().people.filter(p=>p.gear&&(p.gear.secondary==='cowboy')).length;
  f.openWin('person',kel);$('[data-gear-slot="kel:secondary:0"]').click();
  const holder=G().people.find(p=>p!==kel&&p.gear&&p.gear.secondary==='cowboy'&&p.assign!=='mission');
  const hid=holder.id;
  $('[data-gear-pick="kel:secondary:0:cowboy"]').click();
  out.took=[kel.gear.secondary,P(hid).gear.secondary];
  // empty option
  f.openWin('person',kel);$('[data-gear-slot="kel:primary:0"]').click();$('[data-gear-pick="kel:primary:0:"]').click();
  out.emptied=kel.gear.primary;
  // squads: outfitSquad pulls kit off people staying home
  const home=G().people.filter(p=>!['dax','runa'].includes(p.id)&&p.role==='Soldier');
  for(const p of [dax,runa]){p.gear.primary=null;p.gear.secondary=null;}
  const rifles=G().armory.find(a=>a.id==='akli');rifles.n=G().people.filter(p=>p.gear&&p.gear.primary==='akli').length;
  f.outfitSquad([dax,runa]);
  out.outfit=[!!dax.gear.primary,!!runa.gear.primary];
  // BLAM: gadget slots carry them, the squad takes what it carries, stock follows the mission
  G().armory.push({id:'blam',name:'BLAM Frag Grenade',n:4,ic:'x',desc:'x'});f.autoEquip();
  const squad=[dax,runa,kel];
  out.nades=[f.carried('blam'),f.nadesCarried(squad)>=0];
  G().nadesOut=2;f.applyDebrief({kind:'ground',missionId:'none',days:0,nades:1,people:[]});
  out.blamStock=[G().armory.find(a=>a.id==='blam').n,G().nadesOut];
  // gear grid shows what is carried
  f.openWin('gear');out.grid=$('#winCardB').innerHTML.indexOf(' carried')>=0;
  // away on a mission: slots locked
  dax.assign='mission';f.openWin('person',dax);out.locked=$$('#winCardB .bs-gearslot:disabled').length;
  dax.assign='rest';
  // support dossier has no gear
  G().people.push(sup);f.openWin('person',sup);out.supportGear=$$('#winCardB .bs-gearslot').length;
  return out;
 });
 ok(r.start.every((g,i)=>i<3?g==='{"primary":"akli","secondary":"cowboy","gad":[null,"medpack"]}':g==='{"primary":null,"secondary":"cowboy","gad":[null,null]}'),'opening gear: the soldiers carry a Med Pack in the utility slot, the pilot does not '+r.start);
 ok(r.free[0]===3&&r.free[1]===0,'free stock '+r.free);
 ok(JSON.stringify(r.slots)==='[4,3,0,4]','slot counts '+r.slots);
 ok(!r.support&&r.marine==='akli','support carries nothing, marines do '+[r.support,r.marine]);
 ok(r.recruit[0]==='akli'&&r.recruit[1]===null,'recruit gets what is free '+r.recruit);
 ok(r.afterLoot==='cowboy','looted pistol goes to the empty slot '+r.afterLoot);
 ok(r.entry[0]==='akli,cowboy'&&r.entry[1]==='akli,cowboy','squad entry follows gear '+r.entry);
 ok(r.carbine==='carbine','best first: '+r.carbine);
 ok(r.bare==='unarmed','bare hands '+r.bare);
 ok(r.reconcile[0]===1&&r.reconcile[1]==='cowboy','weakest lose it first '+r.reconcile);
 ok(r.rows===4&&r.picker[0]&&r.picker[2]==='primary','gear rows and picker '+[r.rows,r.picker]);
 ok(r.escGear[0]===false&&r.escGear[1]==='person','Escape closes the picker only '+r.escGear);
 ok(r.pickBtn&&r.picked[0]==='scatter','pick a free item '+r.picked);
 ok(r.took[0]==='cowboy'&&r.took[1]===null,'take from another rebel '+r.took);
 ok(r.emptied===null,'leave empty');
 ok(r.outfit[0]&&r.outfit[1],'squad is outfitted from those staying home '+r.outfit);
 ok(r.nades[0]===4,'BLAMs sit in gadget slots '+r.nades);
 ok(r.blamStock[0]===3&&r.blamStock[1]===undefined,'BLAM stock follows the mission '+r.blamStock);
 ok(r.grid,'gear grid shows carried');
 ok(r.locked===4,'slots locked away on a mission '+r.locked);
 ok(r.supportGear===0,'support dossier has no gear rows');
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'gear-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
