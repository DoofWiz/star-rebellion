'use strict';
/* =====================================================================
   STAR REBELLION — ARENA TYPE 3.5: HIGH COMMAND HANDS OFF (sim-hc35.js)
   docs/ARENA-HC35-HANDOFF.md. The layer over the High Command sim (sim-hc.js, window.SIMHC): an opportunity (a
   freighter crossing a remote system), its modifiers, the plan the player makes of it, the compiler that turns the plan
   into an ordinary High Command scenario entry, and, while a 3.5 mission runs, the hooks (SIMHC.hooks) that fly the
   freighter, its escorts and the phases. High Command's own flight, guns, AI and tuning do the rest.
   The hooks are set only while a 3.5 mission is loaded (attach / detach), and every hook checks it is one, so Type 3
   runs as it always has.
   Units: the opportunity is written in layout units (LAYOUT_MAP 2, as hc1 is) and scaled with the scenario, so it sits
   on High Command's 16 × map like the others.
   ===================================================================== */
window.SIMHC35=(function(){
const SIM=window.SIMHC,F=SIM.fn,HK=SIM.hooks;
const TH=SR.theme,C=TH.C;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angNorm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};

/* =====================================================================
   The numbers (every one a placeholder, getter-exposed on the designer panel by group)
   ===================================================================== */
let FREIGHTER_SECS=270;   // the freighter crosses its lane in this long at cruise. placeholder
let FLANK_K=1.6;          // alarmed, it runs at this × cruise. placeholder
let JUMP_SECS=8;          // at its jump point it spools this long, then it's gone. placeholder
let LANE_ARRIVE=700;      // a waypoint counts as reached this close (world units). placeholder
let ESCORT_ORBIT=900;     // escorts circle their station beside the freighter this wide. placeholder
let ESCORT_SIDE=1100;     // ...that station is this far off the freighter's beam. placeholder
let DETECT_R=3000;        // an escort notices a rebel this close (world units). placeholder
let DETECT_RATE=30;       // detection gained a second for a rebel at the ring's centre (it falls off to 0 at the edge). placeholder
let DETECT_DECAY=6;       // detection lost a second with nobody in a ring. placeholder
let DETECT_STILL=0.5;     // a ship holding still (holding a point) counts this much. placeholder
let DETECT_WARP_R=3000;   // jumping in this close to an escort ends Phase 1 at once. placeholder
let INTEL_START=2;        // Dig deeper: reveals the dossier can buy per opportunity. placeholder
let WAIT_ORBIT=900;       // a wing waiting at its point circles this wide. placeholder
const T35={
  FREIGHTER_SECS:{get:()=>FREIGHTER_SECS,set:v=>{FREIGHTER_SECS=v;},min:60,max:600,step:10,label:'Freighter crossing (s)',group:'Freighter'},
  FLANK_K:{get:()=>FLANK_K,set:v=>{FLANK_K=v;},min:1,max:3,step:0.1,label:'Alarmed speed ×',group:'Freighter'},
  JUMP_SECS:{get:()=>JUMP_SECS,set:v=>{JUMP_SECS=v;},min:0,max:30,step:1,label:'Freighter jump spool (s)',group:'Freighter'},
  ESCORT_ORBIT:{get:()=>ESCORT_ORBIT,set:v=>{ESCORT_ORBIT=v;},min:300,max:3000,step:50,label:'Escort orbit',group:'Freighter'},
  ESCORT_SIDE:{get:()=>ESCORT_SIDE,set:v=>{ESCORT_SIDE=v;},min:0,max:3000,step:50,label:'Escort station off the beam',group:'Freighter'},
  DETECT_R:{get:()=>DETECT_R,set:v=>{DETECT_R=v;},min:500,max:8000,step:100,label:'Escort detection ring',group:'Phases'},
  DETECT_RATE:{get:()=>DETECT_RATE,set:v=>{DETECT_RATE=v;},min:1,max:200,step:1,label:'Detection a second (centre)',group:'Phases'},
  DETECT_DECAY:{get:()=>DETECT_DECAY,set:v=>{DETECT_DECAY=v;},min:0,max:50,step:1,label:'Detection lost a second',group:'Phases'},
  DETECT_STILL:{get:()=>DETECT_STILL,set:v=>{DETECT_STILL=v;},min:0,max:1,step:0.05,label:'Detection × holding still',group:'Phases'},
  DETECT_WARP_R:{get:()=>DETECT_WARP_R,set:v=>{DETECT_WARP_R=v;},min:0,max:8000,step:100,label:'Jump-in seen within',group:'Phases'},
  INTEL_START:{get:()=>INTEL_START,set:v=>{INTEL_START=v;},min:0,max:6,step:1,label:'Intel to dig with',group:'Opportunity'},
};
const GROUPS35=['Opportunity','Freighter','Phases'];

/* =====================================================================
   The opportunity (§3.1): one type, as data
   ===================================================================== */
const OPPORTUNITIES={
  vulnerable_freighter:{id:'vulnerable_freighter',title:'Vulnerable Freighter',type:'cargo',typeLabel:'Cargo / convoy',
    source:{id:'cass',name:'Cass',level:2,reliability:'Cass sees most things. Not all.'},
    lead:'A GA fleet freighter is crossing the Thessa Reach tonight, holds full, light escort.',   // placeholder copy
    target:{cls:'fl400',livery:'heg',name:'HFA-2271',label:'FL-400 Fleet Freighter'},
    lane:[[300,2400],[3600,2900],[7600,2000]],
    jump:{x:7600,y:2000,label:'Freighter jump point'},
    planet:{x:3800,y:7600,r:2600,pull:4900},
    extract:{x:300,y:900,label:'Our jump point'},
    relay:{x:0,y:3000},
    response:{edge:'N',near:'jump',force:[{type:'vc-mote-patrol',n:3,name:'Response'},{type:'drone-pursuer',n:2,name:'Hunter'}]},
    escorts:[{type:'vc-mote-patrol',n:2,name:'Escort',role:'escort',side:-1},{type:'vc-mote-patrol',n:2,name:'Escort',role:'escort',side:1}],
    cargo:12,hazard:[2,9],
    modN:[2,3],
    rocks:[{x:5200,y:1300,r:110},{x:2000,y:3900,r:120},{x:6400,y:3300,r:95}],
    jumpIn:{x:3200,y:1300}},   // the leaders' default jump-in (outside the escorts' rings as the freighter passes)
};

/* =====================================================================
   Modifiers (§3.2): rolled on every attempt from its seed; subtle above the Source's level: hidden
   tone: good (helps you) / warn (hurts you) / info
   ===================================================================== */
const MODS={
  demoralised:{name:'Demoralised Crew',line:'The crew\'s heart isn\'t in it. They\'ll fold under pressure.',subtle:1,ex:['fanatical'],tone:'good'},
  fanatical:{name:'Fanatical Crew',line:'True believers. They won\'t surrender, and they\'ll fight for every deck.',subtle:2,ex:['demoralised'],tone:'warn'},
  scuttle:{name:'Scuttle Protocol',line:'Boarders set off the scuttle charges.',subtle:2,ex:[],tone:'warn'},
  rich:{name:'Rich Haul',line:'Double the cargo worth taking. They\'ll come for it faster.',subtle:0,ex:[],tone:'good'},
  limping:{name:'Limping',line:'One drive is failing: slow, and an escort short.',subtle:0,ex:['heavy','quick'],tone:'good'},
  heavy:{name:'Heavy Escort',line:'Twice the escort.',subtle:1,ex:['limping','green'],tone:'warn'},
  green:{name:'Green Escort',line:'The escort are cadets: green pilots, low morale.',subtle:1,ex:['heavy'],tone:'good'},
  ace:{name:'Ace Escort',line:'Commandant Vex rides with the escort.',subtle:2,ex:[],tone:'warn'},
  quick:{name:'Quick Jumper',line:'Alarmed, it spools a jump where it is. Hit the engines to stop it.',subtle:1,ex:['limping'],tone:'warn'},
  guns:{name:'Hidden Guns',line:'Its point defence is heavier and longer than it looks.',subtle:3,ex:[],tone:'warn'},
  rocks:{name:'Asteroid Field',line:'Rocks along the last third of its lane.',subtle:0,ex:[],tone:'info'},
  ion:{name:'Ion Storm',line:'Comms are slow out here, and sensors short.',subtle:0,ex:[],tone:'info'},
  planet:{name:'Near a Planet',line:'Its lane dips close to the planet: a long gravity window.',subtle:0,ex:[],tone:'info'},
  rapid:{name:'Rapid Response',line:'A Hegemony picket is close. Help comes fast.',subtle:1,ex:['remote'],tone:'warn'},
  remote:{name:'Remote',line:'No help for them out here, until it\'s over.',subtle:1,ex:['rapid'],tone:'good'},
  insider:{name:'Insider Aboard',line:'One of ours is on the crew.',subtle:2,ex:[],tone:'good'},
  unreliable:{name:'Unreliable Source',line:'Something Cass told you isn\'t so.',subtle:3,ex:[],tone:'warn'},
};
const MOD_KEYS=Object.keys(MODS);
function mulberry(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
/* the attempt's modifiers: N of them, no exclusive pair, each hidden if subtler than the Source. Unreliable makes one
   revealed modifier false (it's shown but isn't so) */
function rollMods(opp,seed){
  const r=mulberry((seed*2654435761+97)>>>0),n=opp.modN[0]+Math.floor(r()*(opp.modN[1]-opp.modN[0]+1));
  const pool=MOD_KEYS.slice(),out=[];
  while(out.length<n&&pool.length){
    const k=pool.splice(Math.floor(r()*pool.length),1)[0];
    if(out.some(m=>m.k===k||MODS[m.k].ex.includes(k)||MODS[k].ex.includes(m.k)))continue;
    out.push({k,hidden:MODS[k].subtle>opp.source.level,found:false,dug:false,fake:false});
  }
  if(out.some(m=>m.k==='unreliable')){
    // a false lead: one modifier the Source names that isn't there (from the rest of the table, never one rolled)
    const left=MOD_KEYS.filter(k=>k!=='unreliable'&&MODS[k].subtle<=opp.source.level&&!out.some(m=>m.k===k||MODS[m.k].ex.includes(k)||MODS[k].ex.includes(m.k)));
    if(left.length)out.push({k:left[Math.floor(r()*left.length)],hidden:false,found:false,dug:false,fake:true});
  }
  return out;
}
const modOn=(mods,k)=>mods.some(m=>m.k===k&&!m.fake);
const known=m=>!m.hidden||m.found||m.dug;

/* =====================================================================
   Ship classes (§4.3): neither has a db.json row; shaped like one (placeholders), through the classExtra hook
   hitK: the hit box and body × (the FL-400's art is longer than its size class)
   ===================================================================== */
const HC35_CLASSES={
  brickbat:{id:'bx-17-brickbat',name:'BX-17 Brickbat',kind:'starship',manufacturer:'core',role:'Utility freighter (rebel bomber)',size:6,
    straight_max:3,straight_min:1,bank_max:2,bank_min:2,turn_max:2,turn_min:1,shield_front:15,shield_rear:15,armour:25,hull:45,
    weapon_slots:1,hard_points:2,default_weapon_1:'bls-t-light-repeaters',default_weapon_2:null,legacy_keys:'brickbat',special_rules:'',description:'',notes:'Type 3.5 placeholder'},
  fl400:{id:'ga-fl-400',name:'GA FL-400 Fleet Freighter',kind:'starship',manufacturer:'genastro',role:'Fleet freighter',size:10,
    straight_max:1,straight_min:0.2,bank_max:null,bank_min:7,turn_max:null,turn_min:null,shield_front:60,shield_rear:60,armour:40,hull:400,
    weapon_slots:0,hard_points:0,default_weapon_1:null,default_weapon_2:null,legacy_keys:'fl400',hitK:2.4,special_rules:'',description:'',notes:'Type 3.5 placeholder'},
};

/* =====================================================================
   The player's wings (§4.3), as the designer listed them (Wing 3 has four: C-76)
   ===================================================================== */
const WINGS35=[
  {id:'dagger',name:'Dagger',ships:[{id:'joss',cls:'cross',name:'Joss',pilot:{id:'joss-marrek'}},{id:'wren',cls:'cross',name:'Wren',pilot:{preset:'regular'}},{id:'petra',cls:'talon',name:'Petra',pilot:{id:'petra-voss'}}]},
  {id:'anvil',name:'Anvil',ships:[{id:'sera',cls:'talon',name:'Sera',pilot:{id:'sera-kest'}},{id:'brask',cls:'brickbat',name:'Brask',pilot:{preset:'regular'}},{id:'ollo',cls:'brickbat',name:'Ollo',pilot:{preset:'green'}}]},
  {id:'amber',name:'Amber',ships:[{id:'hale',cls:'cross',name:'Hale',pilot:{preset:'veteran'}},{id:'kit',cls:'talon',name:'Kit',pilot:{preset:'green'}},{id:'tam',cls:'talon',name:'Tam',pilot:{preset:'regular'}},{id:'mags',cls:'brickbat',name:'Mags',pilot:{preset:'regular'}}]},
];
const LOADOUTS={bombs:{name:'Bombs',line:'Two racks of three. The only thing that cracks a capital hull.'},pods:{name:'Cargo pods',line:'Carries two containers home.'},
  board:{name:'Boarding party',line:'Marines: boards a disabled ship.'}};

/* =====================================================================
   Objectives, rules, assets (§4.1, §4.2, §4.3)
   ===================================================================== */
const PRIMARIES={
  steal:{family:'Take it',name:'Steal',wins:'Disable it, board it, and fly the prize out through our jump point.',needs:['bombs','board'],loot:'Every surviving container and the ship'},
  pirate:{family:'Take it',name:'Pirate',wins:'Break the crew\'s nerve, accept their surrender, and hold by them while they hand it over.',needs:[],loot:'Most of the surviving cargo'},
  strip:{family:'Take it',name:'Strip the Cargo',wins:'Disable it and haul at least one container home.',needs:['bombs','pods'],loot:'The containers hauled out'},
  destroy:{family:'Deny it',name:'Destroy',wins:'The freighter dies.',needs:[],loot:'None'},
  crash:{family:'Deny it',name:'Crash',wins:'Disable it inside the planet\'s pull: it falls in.',needs:['bombs'],loot:'None'},
  tag:{family:'Use it',name:'Tag and Track',wins:'Plant a tracker unseen, then let it jump out alive.',needs:['tagger'],loot:'A follow-up lead'},
  ambush:{family:'Bait with it',name:'Ambush the Responders',wins:'Destroy three of the Hegemony response.',needs:['notRemote'],loot:'Response kills'},
};
const PRIMARY_KEYS=Object.keys(PRIMARIES);
const LATER_PRIMARIES=['Snatch the Paymaster','Misjump','Trojan Freighter','Turn the Crew','Cover Op'];
const NEED_TEXT={bombs:'A Brickbat with Bombs',board:'A Brickbat with a Boarding party',pods:'A Brickbat with Cargo pods',tagger:'One ship named to plant the tracker',notRemote:'A response to ambush (not Remote)'};
const OPTIONALS={
  protect:{name:'Protect a ship at all costs',line:'Name one: it must come home.',needs:'ship'},
  witnesses:{name:'Leave No Witnesses',line:'No escort or crew escapes (the freighter jumping counts).'},
  distress:{name:'Kill the Distress Call',line:'The comms array dies before the distress gets out.'},
  bloodless:{name:'Bloodless',line:'No enemy deaths.'},
  everyone:{name:'Bring Everyone Home',line:'No ship lost.'},
  rookie:{name:'Blood the Rookie',line:'A green pilot you name scores a kill.',needs:'green'},
  ghost:{name:'Ghost Run',line:'Undetected until your signal or the first shot.'},
};
const ROES={
  preservation:{name:'Preservation Order',line:'Under the hull threshold, a ship withdraws and jumps out.'},
  whale:{name:'Whale Hunt Tasking',line:'Once the freighter is disabled, everyone free goes for it.'},
  signal:{name:'Hold for My Signal',line:'Wings take position and wait. Nobody fires until your signal, or until fired on.'},
  tight:{name:'Weapons Tight',line:'No shots at the freighter\'s hull or cargo: engines, comms and turrets only.'},
  jumpdone:{name:'Jump on Completion',line:'Each wing jumps out when its Executive Order is done.'},
};
/* conflicts show as hazard tags on both cards, never block; suggestions as cyan tags */
const CONFLICTS=[['witnesses','preservation'],['bloodless','whale'],['pirate','whale']];
const SUGGESTS={pirate:['tight'],steal:['tight']};
const ASSETS={
  ram:{name:'Unmanned Ram',power:'Launch the Ram',placed:true,line:'A stripped Brickbat full of explosives, driven at what you point it at.'},
  nuke:{name:'Nuclear-tipped Ram',power:'Launch the Ram',placed:true,line:'The ram, with a blast that hits everything near it. Friends and cargo too.'},
  fireship:{name:'Fire Ship',power:'Light the Fire Ship',placed:true,line:'A derelict packed to blow. Their escorts ignore it until it\'s too late.'},
  mines:{name:'Minefield',power:'Detonate the Minefield',placed:true,line:'A ring of mines you set off when something\'s in it.'},
  buoy:{name:'Interdictor Buoy',power:'Raise the Interdictor',placed:true,line:'Nobody near it can jump for a while. Yours included.'},
  relay:{name:'Comms Relay',power:null,placed:true,line:'Your transmissions start here: shorter delays.'},
  tug:{name:'Rescue Tug',power:'Send the Tug',placed:false,line:'Picks up a pod, or tows a crippled ship out.'},
  spoof:{name:'Spoofed Orders',power:'Spoof Orders',placed:false,line:'Captured codes: send one enemy group away for a while.'},
  pirates:{name:'Call the Pirates',power:'Call the Pirates',placed:false,line:'Black Market mercs. They hit the Hegemony; they may help themselves to the cargo.'},
};
let ASSET_SLOTS=3;
/* the 3.5 orders (§4.4): each maps onto a High Command order where one exists; the rest are layer behaviours */
const ORDERS35={
  disable:{name:'Disable',target:'sub',subs:['engines','comms','turrets']},
  destroy:{name:'Destroy',target:'freighter'},
  board:{name:'Board',target:'freighter'},
  haul:{name:'Haul',target:'freighter'},
  defend:{name:'Defend',target:'wing'},
  escort:{name:'Escort',target:'prize'},
  suppress:{name:'Suppress',target:'what',whats:['turrets','escorts']},
  intimidate:{name:'Intimidate',target:'freighter'},
  tag:{name:'Tag',target:'freighter'},
  ambush:{name:'Ambush',target:'point'},
  hold:{name:'Hold',target:'point'},
  withdraw:{name:'Withdraw',target:null},
};
const ORDER35_KEYS=Object.keys(ORDERS35);
const TRIGGERS={bigger:'Escort bigger than briefed',fjump:'The freighter starts a jump',phase2:'Phase 2 begins',phase3:'Phase 3 begins',done:'Executive Order done',
  half:'Wing below half strength',trouble:'A wing in trouble',escape:'The target escapes'};

/* =====================================================================
   The plan (the briefing's output) and the compiler (§8)
   plan: {primary, optionals:[{k,ship}], roes:[k], wings:{id:{role:'strike'|'reserve'|'home', loadout:{shipId:'bombs'|'pods'|'board'},
          jumpIn:{x,y}, exec:{k,arg}, second:{trig,k,arg}}}, assets:[k], assetAt:{k:{x,y}}, tagger, presHull}
   ===================================================================== */
function defaultPlan(opp){
  const p={primary:null,optionals:[],roes:[],wings:{},assets:[],assetAt:{},tagger:null,presHull:0.3};
  const ji=opp.jumpIn;
  WINGS35.forEach((w,i)=>{
    const lo={};for(const sd of w.ships)if(sd.cls==='brickbat')lo[sd.id]='bombs';
    p.wings[w.id]={role:'strike',loadout:lo,jumpIn:{x:ji.x+(i-1)*500,y:ji.y-Math.abs(i-1)*150},exec:{k:'hold',arg:null},second:null};
  });
  return p;
}
/* what the plan has: Brickbat loadouts across the Strike and Reserve wings */
function planHas(plan){
  const h={bombs:0,pods:0,board:0};
  for(const w of WINGS35){const pw=plan.wings[w.id];if(!pw||pw.role==='home')continue;for(const sd of w.ships)if(sd.cls==='brickbat')h[pw.loadout[sd.id]||'bombs']++;}
  return h;
}
function needsMet(plan,mods){
  const P=PRIMARIES[plan.primary];if(!P)return [{k:'primary',ok:false,text:'Pick a primary objective'}];
  const h=planHas(plan);
  return P.needs.map(n=>({k:n,text:NEED_TEXT[n],ok:n==='bombs'?h.bombs>0:n==='board'?h.board>0:n==='pods'?h.pods>0:n==='tagger'?!!plan.tagger:n==='notRemote'?!modOn(mods,'remote'):true}));
}
const laneW=(opp,k,ox,oy)=>opp.lane.map(([x,y])=>({x:x*k+ox,y:y*k+oy}));
/* the High Command scenario entry this attempt runs as (registered as hc35_freighter, rulesets ['hc35']) */
function compile(opp,mods,plan,seed){
  const m=k=>modOn(mods,k);
  const lane=opp.lane.map(p=>p.slice());
  if(m('planet'))lane[1]=[lane[1][0],lane[1][1]+600];
  const h0=Math.atan2(lane[1][1]-lane[0][1],lane[1][0]-lane[0][0]);
  const wings=[];
  for(const w of WINGS35){
    const pw=plan.wings[w.id];if(!pw||pw.role!=='strike')continue;
    const ji=pw.jumpIn||opp.jumpIn,face=Math.atan2(lane[1][1]-ji.y,lane[1][0]-ji.x);
    wings.push({id:w.id,name:w.name,at:[ji.x,ji.y,face],leader:w.ships[0].id,order:execToHc(pw.exec,plan),tactic:'auto',
      ships:w.ships.map(sd=>Object.assign({},sd,{marines:pw.loadout[sd.id]==='board',load35:sd.cls==='brickbat'?(pw.loadout[sd.id]||'bombs'):null}))});
  }
  const esc=[];let en=0;
  const nEsc=Math.max(0,(m('heavy')?2:1)*opp.escorts.reduce((a,e)=>a+e.n,0)-(m('limping')?1:0));
  for(let i=0;i<nEsc;i++){
    const side=i%2?1:-1,row=Math.floor(i/2),off=(260+row*260)*side;
    esc.push({type:m('green')?'academy-cadet':'vc-mote-patrol',id:'esc'+(++en),name:'Escort '+en,role:'guard',asset:'fl400',
      at:[lane[0][0]-Math.sin(h0)*off-Math.cos(h0)*(120+row*160),lane[0][1]+Math.cos(h0)*off-Math.sin(h0)*(120+row*160),h0],side});
  }
  if(m('ace'))esc.push({type:'academy-commandant',id:'vex',name:'Vex',label:'Commandant Vex',role:'guard',asset:'fl400',at:[lane[0][0]-400,lane[0][1],h0],side:0});
  const rocks=(opp.rocks||[]).map(r=>Object.assign({},r));
  if(m('rocks')){const a=lane[1],b=lane[2],rr=mulberry(seed+31);for(let i=0;i<9;i++){const u=0.35+0.6*rr(),x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u,o=(rr()-0.5)*1300;rocks.push({x:x+o*0.4,y:y+o,r:70+rr()*90});}}
  // High Command draws and scales its points; only our jump point is one. The lane, the planet, the relay and the
  // assets ride in hc35plan, in layout units, and the layer scales them the same way (begin)
  const points={ourjump:{x:opp.extract.x,y:opp.extract.y,label:opp.extract.label}};
  const P=PRIMARIES[plan.primary];
  return {id:'hc35_freighter',title:'Type 3.5: '+opp.title,rulesets:['hc35'],hc35:true,desc:opp.lead,
    rocks,wings,allies:[],
    enemies:[{type:'fl400',id:'fl400',name:opp.target.name,label:opp.target.label,at:[lane[0][0],lane[0][1],h0],role:'freighter',preset:'regular',flees:false}].concat(esc),
    points,extract:'ourjump',
    objectives:[{id:'primary',kind:'hc35',text:P?P.name+': '+P.wins:'No primary',primary:true,key:plan.primary}],
    reinforce:{secs:1e9,edge:opp.response.edge,force:[]},rules:[],cp:0,
    hc35plan:{opp:opp.id,mods:mods.map(x=>Object.assign({},x)),plan:JSON.parse(JSON.stringify(plan)),seed,lane}};
}
/* an Executive Order as the High Command order it rides on (the layer drives the rest) */
function execToHc(ex,plan){
  if(!ex)return {kind:'regroup'};
  const k=ex.k;
  if(k==='destroy')return {kind:'attack',target:{type:'ship',id:'fl400'}};
  if(k==='defend'){const w=WINGS35.find(x=>x.id===ex.arg);return w?{kind:'escort',target:{type:'ship',id:w.ships[0].id}}:{kind:'regroup'};}
  if(k==='escort')return {kind:'escort',target:{type:'ship',id:'fl400'}};
  if(k==='suppress'&&ex.arg==='escorts')return {kind:'attack',target:{type:'class',cls:'mote'}};
  if(k==='withdraw')return {kind:'withdraw'};
  if(k==='hold'||k==='ambush')return {kind:'hold'};
  return {kind:'attack',target:{type:'ship',id:'fl400'}};   // disable, board, haul, intimidate, tag, suppress turrets: on the freighter
}

/* =====================================================================
   The layer, while a 3.5 mission runs
   ===================================================================== */
let L=null;   // the live attempt's layer state
const live=()=>!!(L&&SIM.S&&SIM.S===L.S);
function begin(){
  const S=SIM.S,R=S.R,X=R.hc35plan,Z=SIM.zone,k=(Z.x1-Z.x0)/(F.LAYOUT_MAP_()*F.W0_()),opp=OPPORTUNITIES[X.opp];
  const W=p=>({x:p[0]*k+Z.x0,y:p[1]*k+Z.y0});
  L={S,X,opp,k,mods:X.mods,plan:X.plan,seed:X.seed,lane:X.lane.map(W),leg:1,W,
    fjump:W(X.lane[X.lane.length-1]),relay:W([(X.plan.assetAt.relay||opp.relay).x,(X.plan.assetAt.relay||opp.relay).y]),phase:1,phaseT:[0,null,null],detect:0,alarm:false,alarmWhy:null,
    fr:'fl400',spool:null,escaped:false,ended:false,cause:[],m:{},prim:S.objectives[0],planet:{x:opp.planet.x*k+Z.x0,y:opp.planet.y*k+Z.y0,r:opp.planet.r*k,pull:opp.planet.pull*k}};
  const fr=F.byId('fl400');
  if(fr){fr.role35='freighter';fr.home=null;
    const len=L.lane.reduce((a,p,i)=>i?a+dist(p,L.lane[i-1]):0,0);L.cruise=len/FREIGHTER_SECS;   // world units a second
    if(modOn(L.mods,'limping'))L.cruise*=0.6;
    fr.vx=Math.cos(fr.h)*L.cruise;fr.vy=Math.sin(fr.h)*L.cruise;}
  for(const e of R.enemies)if(e.role==='guard'&&e.asset==='fl400'){const s=F.byId(e.id);if(s){s.role35='escort';s.side35=e.side||0;}}
  for(const s of S.ships)if(s.faction==='reb'&&!s.struct){const sd=findShipDef(s.id);s.load35=sd&&sd.load35||null;if(s.load35==='bombs')s.bombs=6;if(s.load35==='pods')s.pods=[];}
  // a jump-in inside an escort's ring is seen at once (§4.4)
  for(const w of S.wings){const c=F.wingCentre(w);if(S.ships.some(e=>e.role35==='escort'&&e.alive&&dist(e,c)<DETECT_WARP_R)){alarm('jumpin',w.name+' dropped in inside their sensor ring');break;}}
  return L;
}
function findShipDef(id){for(const w of SIM.S.R.wings||[])for(const sd of w.ships)if(sd.id===id)return sd;return null;}
function attach(){
  HK.classExtra=HC35_CLASSES;
  HK.think=s=>live()?think(s):false;
  HK.goal=s=>live()?goal(s):null;
  HK.step=dt=>{if(live())step(dt);};
  HK.event=(kind,text,o,e)=>{if(live())onEvent(kind,text,o,e);};
}
function detach(){for(const k of Object.keys(HK))delete HK[k];L=null;}

/* the freighter and its escorts think here; your wings think in High Command, on the orders the plan gave them */
function think(s){
  if(s.role35==='freighter'){s.beh={kind:'freighter',why:L.alarm?'running for its jump':'on its lane'};s.assess='';return true;}
  if(s.role35==='escort'&&!L.alarm){
    const fr=F.byId(L.fr);if(!fr||!fr.alive)return false;
    const th=fr.vh!=null?fr.vh:fr.h,side=s.side35||0;
    s.beh={kind:'patrol',dest:{x:fr.x-Math.sin(th)*ESCORT_SIDE*side+Math.cos(th)*400,y:fr.y+Math.cos(th)*ESCORT_SIDE*side+Math.sin(th)*400},why:'escorting the freighter'};
    return true;
  }
  return false;
}
function goal(s){
  if(s.role35==='freighter'){
    const p=L.lane[Math.min(L.leg,L.lane.length-1)],v=L.cruise*(L.alarm?FLANK_K:1);
    const c=F.capsOf(s);
    if(L.spool!=null)return Object.assign(F.orbitGoal(s,p,200),{spd:clamp(c.vMin/c.vMax,0,1)});
    return {x:p.x,y:p.y,spd:clamp(v/c.vMax,0,1),noCorner:true};
  }
  if(s.role35==='escort'&&!L.alarm&&s.beh&&s.beh.kind==='patrol')return Object.assign(F.orbitGoal(s,s.beh.dest,ESCORT_ORBIT),{spd:F.CRUISE_()*0.8});
  return null;
}
function alarm(why,text){
  if(L.alarm)return;
  L.alarm=true;L.alarmWhy=why;setPhase(2,text||'They know you\'re here');
}
function setPhase(n,text){
  if(L.phase>=n)return;
  L.phase=n;L.phaseT[n-1]=SIM.S.t;
  SIM.pushEvent('phase','Phase '+n+': '+(n===2?'engaged':'response')+(text?' · '+text:''),{tone:'hazard'});
}
function step(dt){
  const S=SIM.S,fr=F.byId(L.fr);
  // the freighter along its lane: waypoints, then the spool, then it's gone
  if(fr&&fr.alive){
    const p=L.lane[Math.min(L.leg,L.lane.length-1)];
    if(L.leg<L.lane.length-1&&dist(fr,p)<LANE_ARRIVE)L.leg++;
    else if(L.leg===L.lane.length-1&&L.spool==null&&dist(fr,p)<LANE_ARRIVE){L.spool=S.t;SIM.pushEvent('fjump','The freighter is spooling its jump',{x:fr.x,y:fr.y,tone:'hazard'});}
    if(L.spool!=null&&S.t-L.spool>=JUMP_SECS){
      fr.alive=false;fr.jumped=true;fr.jumpT=S.t;L.escaped=true;
      SIM.pushEvent('fjump','The freighter jumped out',{x:fr.x,y:fr.y,tone:'hazard'});
      for(const e of S.ships)if(e.alive&&e.role35==='escort'){e.alive=false;e.jumped=true;e.jumpT=S.t;}   // its escort goes with it
    }
  }
  // Phase 1: detection, from every rebel inside an escort's ring (nearer counts more)
  if(L.phase===1){
    let gain=0;
    for(const e of S.ships){if(!e.alive||e.role35!=='escort')continue;
      for(const r of S.ships){if(!r.alive||r.faction!=='reb'||r.struct)continue;const d=dist(e,r);if(d<DETECT_R)gain=Math.max(gain,(1-d/DETECT_R)*(r.beh&&r.beh.kind==='hold'?DETECT_STILL:1));}}
    L.detect=clamp(L.detect+(gain>0?gain*DETECT_RATE:-DETECT_DECAY)*dt,0,100);
    if(L.detect>=100)alarm('detected','They spotted you');
    if(S.proj.some(p=>p.faction==='reb'))alarm('fired','Shots fired');
  }
  // the freighter gone or dead: everyone home (the primary's checks come with P2)
  if(!L.ended&&(L.escaped||!fr||!fr.alive)){
    L.ended=true;
    if(L.prim.state==='live'){const k=L.prim.key;
      if(k==='destroy'&&!L.escaped){L.prim.state='done';L.prim.doneT=S.t;SIM.pushEvent('objective','The freighter is destroyed',{tone:'good',x:fr?fr.x:null,y:fr?fr.y:null});}
      else if(k!=='tag'||!L.escaped){L.prim.state='failed';SIM.pushEvent('objective','Failed: '+L.prim.text,{tone:'hazard'});}}
    for(const w of S.wings)SIM.setOrder(w.id,'withdraw',null);
  }
}
function onEvent(kind,text,o,e){
  L.cause.push({t:+SIM.S.t.toFixed(2),kind,text,phase:L.phase});
}

/* =====================================================================
   The panel (getters, grouped) and the export
   ===================================================================== */
return {OPPORTUNITIES,MODS,MOD_KEYS,HC35_CLASSES,WINGS35,LOADOUTS,PRIMARIES,PRIMARY_KEYS,LATER_PRIMARIES,NEED_TEXT,OPTIONALS,ROES,CONFLICTS,SUGGESTS,ASSETS,ORDERS35,ORDER35_KEYS,TRIGGERS,
  TUNE:T35,GROUPS:GROUPS35,get ASSET_SLOTS(){return ASSET_SLOTS;},
  rollMods,modOn,known,defaultPlan,planHas,needsMet,compile,execToHc,mulberry,
  attach,detach,begin,get L(){return L;},live,alarm,setPhase,
  fn:{think,goal,step,laneW,findShipDef}};
})();
