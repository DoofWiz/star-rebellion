/* =====================================================================
   The prologue: the onboarding as an authored script of beats (docs/PROLOGUE-HANDOFF.md).

   PROLOGUE is the order, beat by beat. Each beat has
     starts  when it begins (by default as soon as the previous beat finishes; {day:N}: N days after that)
     does    its actions, in order: a comm, a signal, a mission, a tutorial, a gate opening...
     until   what the player has to do before the next beat begins
     setup   the smallest state the beat needs to begin from a new game (the debug Jump list runs every setup up
             to the beat it jumps to)
   The runner below knows nothing about Cass or Akkaro: the base (game/js/base.js) binds the host functions it calls.
   Every word a beat says is a key into PRO_TEXT, so the text tool finds it (the Prologue tab).
   The last beat is always {id:'frontier'}: the end of what is authored. New beats go in before it.
   ===================================================================== */
(function(){
'use strict';

/* ---------- the words ---------- */
const PRO_TEXT={
  // Cass: the Steal the Cross signal, and what acknowledging it adds
  crossOffer:'“So you and your revolutionaries want to matter out here, want to survive? Then you need some wings, and I don’t mean that bucket of bolts hauler in your new hangar. I mean something with some teeth! Dustfall, a frontier town on Akkaro, keeps one has-been FT-4 Cross on the pad behind the HQ. And you can’t afford to be picky when you’re just a group of idealists with nothing but dreams to pay for things with. I can get you the pad layout, but the rest will be up to you. Put your team together, and restore that old Graf in your hangar to get them there. You’ll need a second pilot for the job. I’ll ask around. You’re welcome, by the way!”',
  crossFollow:' The mission requires two pilots and we have one. Cass is already asking around; advance a day to see what he has found.',
  // Cass finds Sera Kest
  seraNews:'<b>Cass Wender</b> is on the wire — he has something for us. Raise him from the Galaxy.',
  seraFound:'“Don’t thank me too fast, but I’ve found your stick. Sera Kest — ex-Hegemony survey pilot. She’s been asking around unsavoury types for any jobs going to put some dirt in the Empress’ eye and I think she’ll appreciate a real cause like yours. They say she’s grounded for attitude and hungry to fly a fighter again. She’s on my next run over to you if you’ll have her.”',
  // Maro Venn arrives and offers the depots
  vennNews:'Word crosses the drift ahead of us: <b>Maro Venn</b>, keeper of the Dry Comet cantina in Dustfall, is asking after the crew that humbled Reeve. A new source — and he’s already signalling.',
  depotsOffer:'“You gave Reeve the worst day of his life — drinks ran free till dawn. Let me return the favour: the fuel depots over Akkaro feed every patrol that bleeds us. Somebody with a fast ship could cook them off.”',
  // Cass: Steal Fuel
  fuelNews:'<b>Cass Wender</b> is on the wire again: he has a fuel job.',
  fuelOffer:'“Your ships are drinking more than my friends do. Redrock Flats, east of Dustfall: the herders’ fuel tithe all ends up in one depot with a pump house and a bored guard detail. Call your hauler down on their apron and let her drink.”',
  // Venn sends a recruit for Steal Fuel
  vennRecruit:'“Hope you’re still kickin’, firebrand. I got a problem. Lines of young guys and gals askin’ if I can introduce them to you and ‘the movement’. Can you take one of ’em in to get ’em off my back? I’m in over my head here.”',
  // the guided steps
  guideGalaxy:'Open the Galaxy',
  guideCass:'Select Cass Wender',
  guideContact:'Contact',
  strafingRun:'Assign assets to missions like vehicles & ships to enable fire support in this mission. Add the FT-4 Cross to enable the ‘Strafing Run’ fire support option.',
  // a mechanic that has just opened
  newTag:'New',
  // debug builds only
  frontierToast:'End of the authored prologue: beat ',
};

/* ---------- guided tutorials ----------
   A step is {at, label|text, done|until}: at names a piece of UI the base can find (null while it is not on screen),
   label is a pointer's short line, text a callout's longer one. done(h) is a live check (the step is skipped while it
   holds); until is an event condition, recorded once met. A tutorial ends when its last step is met.
   An intro-window tutorial is {win:mode}: it opens through the pop-up queue. */
const PRO_TUTS={
  // the Cass pointer chain from the opening onboarding (docs/ONBOARDING-HANDOFF.md A6), same steps, same words
  raiseCass:{steps:[
    {at:'tab:galaxy',label:'guideGalaxy',done:h=>h.view()==='galaxy'},
    {at:'gx.src:cass',label:'guideCass',done:h=>h.selected()==='cass'},
    {at:'gx.order:contact',label:'guideContact',until:{contacted:'cass'}},
  ]},
  // Steal Fuel's plan: a callout on the empty fire support slot until the Cross is assigned
  strafingRun:{steps:[
    {at:'plan.assetslot',text:'strafingRun',until:{asset:'cross'}},
  ]},
  // Build Your Network: plays with the first brand-new Source (docs/PROLOGUE-HANDOFF.md §4)
  sources:{win:'srcTutIntro'},
};

/* ---------- the beats ---------- */
const PROLOGUE=[
  // 1: Take the Rock (docs/ONBOARDING-HANDOFF.md A0-A6); the ground scene plays it
  {id:'rock',
   until:{won:'haven'}},
  // 2: BASE ESTABLISHED, then Cass's transmission
  {id:'cass_intro',
   setup:h=>h.wonRock(),
   does:[{source:{id:'cass',add:true,prologue:true}},{splash:'est'},{win:'cassIntro'}],
   until:{closed:'cassIntro'}},
  // 3: the Galaxy opens; open it, select Cass, Contact
  {id:'cass_contact',
   setup:h=>h.addSource('cass'),
   does:[{gate:'tab.galaxy'},{tutorial:'raiseCass'}],
   until:{contacted:'cass'}},
  // 4: Cass's Steal the Cross signal; the job needs a second pilot
  {id:'cross_offer',
   setup:h=>h.openGate('tab.galaxy'),
   does:[{gate:'tab.missions'},{signal:{who:'cass',mission:'stealcross',text:'crossOffer',follow:'crossFollow'}}],
   until:{accepted:'stealcross'}},
  // 5: the next day, Cass finds Sera Kest
  {id:'sera',starts:{day:1},
   setup:h=>{h.openGate('tab.missions');h.addMission('stealcross');},
   does:[{signal:{who:'cass',kind:'recruitSera',text:'seraFound'}},{news:{text:'seraNews',cls:'a',alert:true}}],
   until:{joined:{id:'sera'}}},
  // 6: Steal the Cross
  {id:'cross',
   setup:h=>{h.join('sera');h.restoreHauler();},
   until:{won:'stealcross'}},
  // 7: Maro Venn, a Prologue source, signals the depots job
  {id:'venn_arrives',
   setup:h=>h.winMission('stealcross'),
   does:[{source:{id:'venn',add:true,prologue:true}},{signal:{who:'venn',mission:'depotrun',text:'depotsOffer'}},{news:{text:'vennNews',cls:'g',good:true}}],
   until:{accepted:'depotrun'}},
  // 8: Torch the Depots
  {id:'depots',
   setup:h=>{h.addSource('venn');h.addMission('depotrun');},
   until:{won:'depotrun'}},
  // 9: the next day, Cass's Steal Fuel signal; the onboarding job takes four soldiers
  {id:'fuel_offer',starts:{day:1},
   setup:h=>h.winMission('depotrun'),
   does:[{signal:{who:'cass',mission:'stealfuel',spec:{req:{team:4}},text:'fuelOffer'}},{news:{text:'fuelNews',cls:'a',alert:true}}],
   until:{accepted:'stealfuel'}},
  // 10: Venn sends a recruit
  {id:'fuel_recruit',
   setup:h=>h.addMission('stealfuel',{req:{team:4}}),
   does:[{comm:{who:'venn',text:'vennRecruit'}},{recruitOffer:{role:'Soldier',from:'venn',must:true}}],
   until:{joined:{role:'Soldier'}}},
  // 11: the plan's fire support slots open, and the Strafing Run callout
  {id:'fuel_plan',
   setup:h=>h.join('Soldier'),
   does:[{gate:'plan.assets'},{tutorial:'strafingRun'}],
   until:{won:'stealfuel'}},
  // P2 to P5 (docs/PROLOGUE-HANDOFF.md §6) go here, before the frontier.
  // DESIGN OPEN: security_arrives — security forces arrive at Akkaro. Waits on the regional Alert system.
  // {id:'security_arrives'},
  // DESIGN OPEN: campaign — Venn delivers the first Campaign, Liberate Akkaro. Waits on the Campaign design (CHAINS
  // is the nearest system) and a Destroy Squadron space scenario.
  // {id:'campaign'},
  // DESIGN OPEN: farewell — Akkaro liberated; Venn and Cass say goodbye and stop being Sources; Tessaly arrives with
  // the Sources tutorial. Waits on the two above.
  // {id:'farewell'},
  // the end of what is authored (§2.6)
  {id:'frontier',
   setup:h=>h.winMission('stealfuel')},
];

/* the gates (§3): every one is closed during the prologue unless listed here, and all open at the frontier */
const GATES=['tab.galaxy','tab.missions','tab.intel','tab.market','tab.arsenal','plan.assets','op.recruit','op.lielow','op.other','sources.new','galaxy.beyond'];
const OPEN_FROM_START=['tab.arsenal'];
/* the roster safety net (§2.8): days a prologue mission can sit unplannable before its contact sends someone */
const SHORT_DAYS=2;

/* ---------- the runner ---------- */
let H=null;   // the host: game/js/base.js binds it
const onGate=[];
const P=()=>H&&H.G()&&H.G().prologue;
const ix=id=>PROLOGUE.findIndex(b=>b.id===id);
const beat=()=>{const p=P();return p?PROLOGUE[ix(p.at)]||null:null;};
const text=k=>Object.prototype.hasOwnProperty.call(PRO_TEXT,k)?PRO_TEXT[k]:k;

function fresh(day){return {at:PROLOGUE[0].id,since:day||1,live:true,flags:{tut:{}},gates:{},done:false};}
const isDone=()=>{const p=P();return !p||!!p.done;};
const at=id=>{const p=P();return !!p&&!p.done&&p.at===id;};
/* past(id): the prologue has finished that beat (or is over) */
function past(id){
  const p=P();if(!p||p.done)return true;
  const i=ix(id);return i>=0&&ix(p.at)>i;
}
function gate(key){
  const p=P();
  return !p||p.done||!!(p.gates&&(p.gates['*']||p.gates[key]))||OPEN_FROM_START.includes(key);
}
function openGate(key,quiet){
  const p=P();if(!p)return;
  if(gate(key))return;
  p.gates[key]=1;
  if(!quiet)for(const f of onGate)f(key);
}

/* conditions: an event with a matcher, a list (all of them, any order), {day:N}, or a predicate */
function matchVal(want,arg){
  if(want===true||want===undefined)return true;
  if(arg&&typeof arg==='object'){
    if(want&&typeof want==='object'){for(const k in want)if(k!=='n'&&arg[k]!==want[k])return false;return true;}
    return [arg.id,arg.kind,arg.cls,arg.role].includes(want);
  }
  return arg===want;
}
/* does this event meet the condition c? slot keeps a list's progress and a count's tally */
function meets(c,type,arg,slot){
  if(!c)return false;
  if(typeof c==='function')return !!c(H);
  if(Array.isArray(c)){
    slot.met=slot.met||c.map(()=>false);
    c.forEach((x,i)=>{if(!slot.met[i]&&meets(x,type,arg,slot['s'+i]=slot['s'+i]||{}))slot.met[i]=true;});
    return slot.met.every(Boolean);
  }
  if(c.day!==undefined)return type==='day'&&H.G().day-P().since>=c.day;
  const k=Object.keys(c)[0],want=c[k];
  if(k!==type||!matchVal(want,arg))return false;
  if(want&&typeof want==='object'&&want.n>1){slot.n=(slot.n||0)+1;return slot.n>=want.n;}
  return true;
}

/* an event from the game: the guided step and the current beat hear it. An event raised while one is being handled
   (an action that causes another) waits its turn, so the runner never re-enters itself. */
const pending=[];let busy=false;
function emit(type,arg){
  pending.push([type,arg]);
  if(busy)return;
  busy=true;
  try{while(pending.length){const [t,a]=pending.shift();hear(t,a);}}
  finally{busy=false;}
}
function hear(type,arg){
  const p=P();if(!p)return;
  stepHear(type,arg);
  if(type==='source'&&arg&&!arg.prologue&&p.done)firstSource();
  if(p.done)return;
  if(type==='day'){rearm();shortTick();}
  check(type,arg);
}
function check(type,arg){
  const p=P();
  for(let guard=0;guard<PROLOGUE.length+1&&!p.done;guard++){
    const b=beat();if(!b)return;
    if(b.id==='frontier'){frontier();return;}
    if(!p.live){
      if(!b.starts||meets(b.starts,type,arg,p.w=p.w||{})){goLive(b);type=null;continue;}
      return;
    }
    if(b.until&&!meets(b.until,type,arg,p.w=p.w||{}))return;
    advance();type=null;   // the event is spent on the beat it finished
  }
}
function advance(){
  const p=P(),i=ix(p.at);
  p.at=PROLOGUE[Math.min(PROLOGUE.length-1,i+1)].id;
  p.since=H.G().day;p.live=false;p.w={};p.short={};
}
function goLive(b){
  const p=P();
  p.live=true;p.since=H.G().day;p.w={};
  for(const a of b.does||[])act(a,b);
  H.kick();
}
/* one action: windows queue (they open in turn, after anything already queued); the rest happen now */
function act(a,b){
  const k=Object.keys(a)[0],v=a[k];
  if(k==='gate')openGate(v);
  else if(k==='ungate'){const p=P();delete p.gates[v];}
  else if(k==='flag'){const p=P();p.flags[v]=1;}
  else if(k==='tutorial')startTut(v);
  else if(k==='news')H.news(text(v.text),v);
  else if(H.act[k])H.act[k](v,b);
  else console.warn('Prologue: no action '+k+' (beat '+b.id+')');
}
function frontier(){
  const p=P();
  p.done=true;p.at='frontier';p.live=true;
  for(const g of GATES)if(!(p.gates[g]||OPEN_FROM_START.includes(g)))for(const f of onGate)f(g);
  p.gates['*']=1;
  if(H.debug())H.toast(text('frontierToast')+(PROLOGUE[PROLOGUE.length-2]||{}).id+'.');
  H.kick();
}

/* a story signal the current beat put on a source comes back if it was let lie */
function rearm(src){
  const p=P(),b=beat();
  if(!p||p.done||!p.live||!b)return false;
  let any=false;
  for(const a of b.does||[])if(a.signal&&(!src||a.signal.who===src.id)&&H.act.signal(a.signal,b,true))any=true;
  return any;
}
/* §2.8: a prologue mission nobody can plan for SHORT_DAYS days (deaths, injuries) brings a replacement from its contact */
function shortTick(){
  const p=P(),b=beat();
  if(!p.live||!b||(b.until&&b.until.joined))return;   // a beat already bringing someone in
  p.short=p.short||{};
  for(const m of H.proMissions(PROLOGUE.slice(0,ix(p.at)+1))){
    const role=H.shortRole(m);
    if(!role){p.short[m.key]=0;continue;}
    p.short[m.key]=(p.short[m.key]||0)+1;
    if(p.short[m.key]>=SHORT_DAYS){p.short[m.key]=0;H.act.recruitOffer({role,from:m.src,must:true,short:1},b);H.kick();}
  }
}

/* ---------- the stepper (guided tutorials) ---------- */
function startTut(key){
  const T=PRO_TUTS[key],p=P();
  if(!T||!p)return;
  p.flags.tut=p.flags.tut||{};
  if(p.flags.tut[key])return;
  if(T.win){p.flags.tut[key]=1;H.queue({tut:key,win:T.win});return;}
  p.tut={key,i:0};
}
function stepHear(type,arg){
  const p=P();if(!p||!p.tut)return;
  const T=PRO_TUTS[p.tut.key];
  if(!T){p.tut=null;return;}
  // an event can complete the current step or any live-checked step before it
  for(let i=p.tut.i;i<T.steps.length;i++){
    const s=T.steps[i];
    if(s.until&&meets(s.until,type,arg,{})){p.tut.i=i+1;break;}
    if(!s.done||!s.done(H))break;
  }
  if(p.tut.i>=T.steps.length){p.flags.tut[p.tut.key]=1;p.tut=null;}
}
/* the step to show now: the first not yet met, skipping steps whose live check holds */
function step(){
  const p=P();if(!p||!p.tut)return null;
  const T=PRO_TUTS[p.tut.key];if(!T)return null;
  for(let i=p.tut.i;i<T.steps.length;i++){
    const s=T.steps[i];
    if(s.done&&s.done(H))continue;
    return s;
  }
  return null;
}
const tutSeen=key=>{const p=P();return !!(p&&p.flags&&p.flags.tut&&p.flags.tut[key]);};
/* the Sources tutorial waits for the first brand-new Source (not a Prologue source) */
function firstSource(){if(!tutSeen('sources')){startTut('sources');H.kick();}}

/* ---------- developer tools (§2.7) ---------- */
/* jump: a new game, every setup up to the beat, then the beat begins */
function jump(id){
  const i=ix(id);if(i<0)return false;
  H.reset();
  const p=P();
  for(let k=0;k<=i;k++){const b=PROLOGUE[k];if(b.setup)b.setup(H.setup);}
  p.at=id;p.since=H.G().day;p.live=false;p.w={};
  H.afterJump(id);
  check(null,null);
  return true;
}
function openAll(){const p=P();if(p)p.gates['*']=1;}
function replayTuts(){const p=P();if(p){p.flags.tut={};p.tut=null;}}
/* a beat added at runtime (the smoke test proves adding a beat means editing PROLOGUE only) */
function addBeat(b,beforeId){const i=ix(beforeId||'frontier');PROLOGUE.splice(i<0?PROLOGUE.length:i,0,b);}

window.Pro={PROLOGUE,PRO_TEXT,PRO_TUTS,GATES,SHORT_DAYS,
  bind:h=>{H=h;},onGate:f=>onGate.push(f),fresh,
  emit,check,at,past,done:isDone,gate,openGate,text,beat:()=>{const b=beat();return b&&b.id;},live:()=>{const p=P();return !!(p&&p.live);},
  step,tutSeen,startTut,rearm,
  jump,openAll,replayTuts,addBeat,index:ix};
})();
