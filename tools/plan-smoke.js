/* Smoke test for the planning window: node tools/plan-smoke.js (needs NODE_PATH=$(npm root -g)).
   The slot-filling board per docs/ui/SCREENS-HANDOFF-2.md §4: no roster column or checklist, the squad counter
   and seat pips, pilots layered on the asset cards, fire support granted by the assets, the anchored picker,
   the up-front Supply Drop charge with a refund when it goes uncalled, and Mission Control's two states. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const r=await pg.evaluate(async()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,R=window.Rebel,out={};
  const $=s=>document.querySelector('#winCardB '+s),$$=s=>[...document.querySelectorAll('#winCardB '+s)];
  const txt=()=>document.querySelector('#winCardB').textContent;
  const mk=(id,role,extra)=>{const p=R.migrate(Object.assign({id,name:id+' Vale',role,level:2,xp:0.3,assign:'rest',injured:0,bio:'x'},extra||{}));G().people.push(p);return p;};
  mk('sq1','Soldier');const hurt=mk('sq2','Soldier');R.layUp(hurt,'downed',11);
  mk('px1','Pilot');
  G().fighters.push(f.newFighter({id:'gM',name:'Marta',cls:'graf',hull:92,loadout:['door-mounted-gun']}));
  G().fighters.push(f.newFighter({id:'du',name:'Dustfall',cls:'cross',hull:100}));
  G().fuel=500;G().supplies=480;
  const m={id:'pltest',name:'Depot Raid',desc:'Hit the depot.',objectives:['Reach the fuel store','Plant the charge'],req:{transport:true,team:3},days:2,lead:'ground',ground:true,type:'ground',scenario:'intel',rew:{c:200},riskTxt:'Moderate',loc:'akkaro',region:'flats',from:'Venn'};
  G().missions.push(m);
  f.openPlan(m);
  const PL=f.getPL();

  // fits 1440x900 with no roster column or checklist, and nothing scrolls
  const card=document.querySelector('#winCardB'),rc=card.getBoundingClientRect();
  out.fits=[rc.top>=0&&rc.bottom<=900&&rc.width<=1440,card.scrollHeight<=card.clientHeight+1];
  out.noOld=!/Before you can go/.test(txt())&&!/Roster/.test(txt())&&!$('.planRo')&&!$('.sr-slot');
  // the squad counter, the seat pips, and need-style empties with no "Optional"
  out.count0=[($('.pl-count b')||{}).textContent,$$('.pl-seats i').length,$$('.pl-seats i.is-free').length,$$('.pl-sold--need').length];
  out.noOptional=txt().indexOf('Optional')<0;
  // clicking an empty slot opens a picker, filtered with reasons
  $('[data-pick="team0"]').click();
  out.picker=[!!$('.pl-pick'),$$('.pl-pick .pl-opt').some(o=>/Dax Ferro/.test(o.textContent)&&/Available/.test(o.textContent)),
    $$('.pl-pick .pl-opt').some(o=>/sq2 Vale/.test(o.textContent)&&/Injured · \d+ days/.test(o.textContent)&&o.disabled),
    !$$('.pl-pick .pl-opt').some(o=>/Marta/.test(o.textContent))];
  document.querySelector('#winCardB .pl-pick [data-pickval="p:dax"]').click();
  out.count1=[($('.pl-count b')||{}).textContent,$$('.pl-seats i.is-free').length,PL.v.team0];
  // the transport pilot sits layered on the transport card
  PL.v.tv0='gM';f.renderWin();
  out.tvEmptyPilot=!!$('.pl-asset--primary .pl-pilot--empty');
  const fuelTvOnly=f.plFuel();
  PL.v.tp0='joss';f.renderWin();
  out.tvPilot=/Joss/.test(($('.pl-asset--primary .pl-pilot')||{textContent:''}).textContent);
  // the Marta grants Supply Drop (160 up front on the chip) and Door Gunner Cover, no toggles
  const chips=()=>$$('.pl-ab').map(c=>c.textContent.replace(/\s+/g,' ').trim()+(c.classList.contains('is-off')?' [off]':''));
  out.marta=chips();
  out.noToggles=!$('[data-drop]')&&!$('[data-tvgun]')&&txt().indexOf('Arranged')<0;
  // adding a starfighter adds Strafing Run, greyed until its pilot is set
  $('[data-pick="addasset"]').click();
  document.querySelector('#winCardB .pl-pick [data-pickval="f:du"]').click();
  out.strafeOff=chips().some(c=>/Strafing Run/.test(c)&&/needs a pilot/.test(c)&&/\[off\]/.test(c));
  PL.v.as0p='px1';f.renderWin();
  out.strafeOn=chips().some(c=>/Strafing Run/.test(c)&&!/\[off\]/.test(c));
  // the fuel total includes the support ship
  out.fuelAdds=f.plFuel()>fuelTvOnly;
  out.footFuel=new RegExp('Fuel\\s*'+Math.round(f.plFuel())).test(document.querySelector('#winCardB .pl-foot').textContent.replace(/ /g,' '));
  // Start stays off until every slot is filled; the footer blocker names the empty ones
  out.offUntilFull=[document.getElementById('launchBtn').disabled,/slots? empty/.test($('.pl-foot .pl-ready').textContent),$$('.pl-foot u[data-goto]').length>0];
  $('.pl-foot [data-autofill]').click();
  out.full=[!document.getElementById('launchBtn').disabled,/Squad ready/.test($('.pl-foot .pl-ready').textContent),f.plComplete()];
  // Mission Control: unstaffed with the Command Center button, then staffed with the Controller's name
  out.mcOff=[!!$('.pl-base:not(.is-staffed)'),/Unstaffed/i.test($('.pl-base').textContent),!!$('[data-gocommand]')];
  const ctl=mk('ctl','Support',{sspec:'control',assign:'room:command',bio:'Controller.'});
  f.renderWin();
  out.mcOn=[!!$('.pl-base.is-staffed'),/ctl Vale/.test($('.pl-base.is-staffed')?$('.pl-base.is-staffed').textContent:'')];
  // starting charges the drop up front; a mission that never calls it is refunded in the debrief
  const s0=G().supplies,fuel=f.plFuel();
  f.startPlan();
  out.charged=[s0-G().supplies,G().sortie&&G().sortie.s,Math.round(fuel)===Math.round(G().sortie?G().sortie.f:0)];
  f.applyDebrief({missionId:'pltest',kind:'ground',days:0,win:true,people:[],dropUsed:false});
  out.refund=[G().supplies-(s0-160),G().news.some(n=>/never called in/.test(n.html))];
  for(let i=0;i<6&&f.getWin();i++)f.closeWin();
  // a drop that WAS called stays spent
  G().sortie={name:'x',f:0,s:160};const s1=G().supplies;
  f.applyDebrief({missionId:'pltest',kind:'ground',days:0,win:true,people:[],dropUsed:true});
  out.kept=G().supplies===s1;
  for(let i=0;i<6&&f.getWin();i++)f.closeWin();
  return out;
 });
 await b.close();
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 ok(!errs.length,'page errors: '+errs.join(' | '));
 ok(r.fits.every(Boolean),'the window fits 1440×900 with no scrolling: '+r.fits.join());
 ok(r.noOld,'no roster column, no "Before you can go" checklist');
 ok(r.count0[0]==='0/3'&&r.count0[1]===3&&r.count0[2]===3&&r.count0[3]===3,'counter 0/3, three dashed seats, three need-cards: '+r.count0.join());
 ok(r.noOptional,'no slot is labelled Optional');
 ok(r.picker.every(Boolean),'the picker opens filtered, with reasons on the unavailable: '+r.picker.join());
 ok(r.count1[0]==='1/3'&&r.count1[1]===2&&r.count1[2]==='dax','picking fills the slot and the counter follows: '+r.count1.join());
 ok(r.tvEmptyPilot&&r.tvPilot,'the pilot badge sits on the transport card, empty then filled');
 ok(r.marta.some(c=>/Supply Drop/.test(c)&&/from Marta/.test(c)&&/160/.test(c))&&r.marta.some(c=>/Door Gunner Cover/.test(c)&&/from Marta/.test(c)),'the Marta grants Supply Drop (160 up front) and Door Gunner Cover: '+r.marta.join(' | '));
 ok(r.noToggles,'fire support has no toggles');
 ok(r.strafeOff&&r.strafeOn,'a starfighter adds Strafing Run, greyed until its pilot is set');
 ok(r.fuelAdds&&r.footFuel,'the fuel total includes the support ship and shows in the footer');
 ok(r.offUntilFull.every(Boolean),'Start is disabled until full and the blocker names the slots: '+r.offUntilFull.join());
 ok(r.full.every(Boolean),'auto-fill completes the plan and Start lights up: '+r.full.join());
 ok(r.mcOff.every(Boolean),'Mission Control unstaffed: dashed card with the Command Center button: '+r.mcOff.join());
 ok(r.mcOn.every(Boolean),'Mission Control staffed: the Controller on the card: '+r.mcOn.join());
 ok(r.charged[0]===160&&r.charged[1]===160&&r.charged[2],'starting charges the 160 supplies up front: '+r.charged.join());
 ok(r.refund[0]===160&&r.refund[1],'an uncalled drop is refunded in the debrief: '+r.refund.join());
 ok(r.kept,'a called drop stays spent');
 console.log(JSON.stringify({ok:!fails.length,fails,r},null,1));
 process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
