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
let DETECT_RATE=12;       // detection gained a second for a rebel at the ring's centre (it falls off to 0 at the edge). placeholder
let DETECT_QUIET=0.35;    // a ship closing quietly to tag counts this much. placeholder
let DETECT_DECAY=6;       // detection lost a second with nobody in a ring. placeholder
let DETECT_STILL=0.5;     // a ship holding still (holding a point) counts this much. placeholder
let DETECT_WARP_R=3000;   // jumping in this close to an escort ends Phase 1 at once. placeholder
let INTEL_START=2;        // Dig deeper: reveals the dossier can buy per opportunity. placeholder
let WAIT_ORBIT=900;       // a wing waiting at its point circles this wide. placeholder
/* the target (§5.2) and the phases (§5.3): every one a placeholder, in one table (N), each on the panel (NUM35 below) */
const N={ENG_HP:120,COMMS_HP:60,PD_HP:40,CARGO_HP:25,   // subsystem hit points (the core is the hull, 400)
  HAZARD_DMG:60,HAZARD_R:900,          // a hazard module going up hits everything this close
  GUN_VS_CAP:0.25,                     // fighter guns against a capital hull: × damage (bombs are what crack it)
  BOMB_K:0.3,BOMB_DMG:34,BOMB_R:1500,BOMB_GAP:0.5,BOMB_N:6,BOMB_MIN:7,   // bombs: speed × a missile's, damage, release range, gap, a sortie, smallest size they hit
  PD_R:2200,PD_GAP:0.35,PD_SPREAD:0.06,   // point defence: reach, seconds a bolt, spread (radians)
  DRIFT_DECAY:0.04,                    // a disabled freighter loses this share of its drift a second
  PULL_ACC:26,                         // the planet's pull at its edge, world units a second² (it grows toward the surface)
  RESOLVE_START:70,RES_THREAT:0.25,RES_ESCORT:15,RES_TURRET:10,RES_ENGINES:20,RES_HIT:10,THREAT35_R:2600,   // crew resolve (Pirate)
  TRANSFER_SECS:20,TRANSFER_R:1400,PIRATE_SHARE:0.7,   // the surrender's hand-over
  DOCK_R:900,DOCK_OFF:190,             // a Brickbat docks this close to a disabled freighter, clamped this far off its spine
  BOARD35_SECS:30,SCUTTLE_SECS:45,PRIZE_SPD:160,PRIZE_TURN:0.25,   // boarding a ship; the scuttle timer; the prize's crawl home (world units a second) and its turn (radians a second)
  HAUL_SECS:10,POD_CAP:2,              // a container a docked pod ship takes, and how many it carries
  TAG_R:900,TAG_SECS:12,               // Tag and Track: hold this close this long, unseen
  AMBUSH_KILLS:3,                      // response ships an ambush must take
  INTIM_R:1900,                        // an intimidating wing orbits the freighter this wide
  HOLDOFF_R:3200,                      // a boarder or hauler waits this far off a freighter that isn't disabled yet
  DISTRESS_SECS:20,RESPONSE_SECS:150,QUICK_SPOOL:60};   // the distress call, the response clock, Quick Jumper's spool
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
  DETECT_QUIET:{get:()=>DETECT_QUIET,set:v=>{DETECT_QUIET=v;},min:0,max:1,step:0.05,label:'Detection × closing to tag',group:'Phases'},
  DETECT_WARP_R:{get:()=>DETECT_WARP_R,set:v=>{DETECT_WARP_R=v;},min:0,max:8000,step:100,label:'Jump-in seen within',group:'Phases'},
  INTEL_START:{get:()=>INTEL_START,set:v=>{INTEL_START=v;},min:0,max:6,step:1,label:'Intel to dig with',group:'Opportunity'},
};
/* more numbers, as getters: [name, label, min, max, step, group] (one table: every placeholder on the panel) */
const NUM35={ENG_HP:['Engines HP',20,400,10,'Freighter'],COMMS_HP:['Comms array HP',10,300,10,'Freighter'],PD_HP:['Turret HP',10,200,5,'Freighter'],CARGO_HP:['Container HP',5,100,5,'Freighter'],
  HAZARD_DMG:['Hazard module blast',0,200,5,'Freighter'],HAZARD_R:['Hazard blast reach',100,3000,50,'Freighter'],GUN_VS_CAP:['Guns vs a capital hull ×',0,1,0.05,'Freighter'],
  BOMB_K:['Bomb speed × a missile\'s',0.1,1,0.05,'Freighter'],BOMB_DMG:['Bomb damage',5,120,1,'Freighter'],BOMB_R:['Bomb release range',300,4000,50,'Freighter'],BOMB_GAP:['Seconds between bombs',0.1,3,0.05,'Freighter'],BOMB_N:['Bombs a sortie',1,12,1,'Freighter'],
  PD_R:['Point defence reach',500,6000,100,'Freighter'],PD_GAP:['Point defence: s a bolt',0.05,2,0.05,'Freighter'],PD_SPREAD:['Point defence spread',0,0.4,0.01,'Freighter'],
  DRIFT_DECAY:['Drift lost a second',0,0.5,0.01,'Freighter'],PULL_ACC:['Planet pull (at its edge)',0,200,1,'Freighter'],
  RESOLVE_START:['Crew resolve at the start',10,100,5,'Freighter'],RES_THREAT:['Resolve lost a second per ship near',0,10,0.1,'Freighter'],RES_ESCORT:['Resolve lost per escort killed',0,50,1,'Freighter'],
  RES_TURRET:['Resolve lost per turret',0,50,1,'Freighter'],RES_ENGINES:['Resolve lost: engines out',0,60,1,'Freighter'],RES_HIT:['Resolve gained per hit on hull or cargo',0,30,1,'Freighter'],THREAT35_R:['A ship near (resolve)',500,6000,100,'Freighter'],
  TRANSFER_SECS:['Surrender hand-over (s)',0,60,1,'Freighter'],TRANSFER_R:['Hand-over reach',300,4000,50,'Freighter'],PIRATE_SHARE:['Pirate share of the cargo',0,1,0.05,'Freighter'],
  DOCK_R:['Docking reach',200,3000,50,'Freighter'],DOCK_OFF:['Clamp off the spine',100,600,10,'Freighter'],BOARD35_SECS:['Boarding a ship (s)',5,120,1,'Freighter'],SCUTTLE_SECS:['Scuttle timer (s)',5,120,1,'Freighter'],
  PRIZE_SPD:['Prize speed home',20,600,10,'Freighter'],PRIZE_TURN:['Prize turn (rad/s)',0.02,1,0.01,'Freighter'],HAUL_SECS:['Seconds a container',1,60,1,'Freighter'],POD_CAP:['Containers a pod ship carries',1,6,1,'Freighter'],
  TAG_R:['Tag: within',200,3000,50,'Freighter'],TAG_SECS:['Tag: hold (s)',1,60,1,'Freighter'],AMBUSH_KILLS:['Ambush: kills to win',1,10,1,'Freighter'],INTIM_R:['Intimidate orbit',600,5000,50,'Freighter'],HOLDOFF_R:['Boarders hold off at',1000,8000,100,'Freighter'],
  DISTRESS_SECS:['Distress call (s)',1,90,1,'Phases'],RESPONSE_SECS:['Response clock (s)',10,600,5,'Phases'],QUICK_SPOOL:['Quick Jumper spool (s)',5,180,5,'Phases']};
for(const k in NUM35){const [label,min,max,step,group]=NUM35[k];T35[k]={get:()=>N[k],set:v=>{N[k]=v;},min,max,step,label,group};}
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
    straight_max:3,straight_min:0.2,bank_max:null,bank_min:7,   /* a high top so an engine critical can't stall it: the layer sets its pace */turn_max:null,turn_min:null,shield_front:60,shield_rear:60,armour:40,hull:400,
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
const FR=()=>F.byId('fl400');
/* the FL-400's subsystems (§5.2), placed in hull units from its art (SR_ART.SHIPS.gafreighter), and hull units → world
   (the scale the map draws it at with no icon boost: a size-5 hull's, with sizeK; arena-hc35.js freightScale) */
const SA=window.SR_ART;
const FL_UNIT=()=>(0.7+0.09*5)*1.6*0.85*1.35*(SA&&SA.sizeK?SA.sizeK('gafreighter'):1);
const SUB_NAME={engines:'engines',comms:'comms array',pd:'turret',cargo:'container',core:'core'};
const subKey=k=>k==='turrets'?'pd':k;
function makeSubs(guns){
  const D=SA&&SA.SHIPS&&SA.SHIPS.gafreighter,K=D?D.cargo:{x0:26,step:-11.2,len:10,y0:4.8,w:8,n:6,hazard:[2,9]};
  const out=[{k:'engines',x:-54,y:0,r:12,hp:N.ENG_HP,max:N.ENG_HP},{k:'comms',x:-30,y:0,r:8,hp:N.COMMS_HP,max:N.COMMS_HP}];
  (D?D.pd:[[44.6,-7.6],[44.6,7.6],[-46.5,-16.6],[-46.5,16.6]]).forEach((p,i)=>out.push({k:'pd',i,x:p[0],y:p[1],r:6,hp:N.PD_HP,max:N.PD_HP,shotT:-9,aim:null}));
  for(let i=0;i<K.n*2;i++){const j=i%K.n;out.push({k:'cargo',i,x:K.x0+K.step*j+K.len/2,y:(i<K.n?-1:1)*(K.y0+K.w/2),r:6,hp:N.CARGO_HP,max:N.CARGO_HP,hazard:K.hazard.includes(i),taken:false});}
  return out;
}
function subWorld(fr,sb){const u=FL_UNIT(),c=Math.cos(fr.h),s=Math.sin(fr.h);return {x:fr.x+(sb.x*c-sb.y*s)*u,y:fr.y+(sb.x*s+sb.y*c)*u};}
function toHull(fr,p){const u=FL_UNIT(),dx=p.x-fr.x,dy=p.y-fr.y,c=Math.cos(-fr.h),s=Math.sin(-fr.h);return {x:(dx*c-dy*s)/u,y:(dx*s+dy*c)/u};}
const subsLive=k=>L.subs.filter(x=>x.k===k&&x.hp>0);
const subUp=k=>L.subs.some(x=>x.k===subKey(k)&&x.hp>0);
function nearestSub(fr,k,p){let b=null,bd=1e18;for(const x of subsLive(subKey(k))){if(x.k==='cargo'&&x.taken)continue;const w=subWorld(fr,x),d=(w.x-p.x)**2+(w.y-p.y)**2;if(d<bd){bd=d;b=x;}}return b;}

function begin(){
  const S=SIM.S,R=S.R,X=R.hc35plan,Z=SIM.zone,k=(Z.x1-Z.x0)/(F.LAYOUT_MAP_()*F.W0_()),opp=OPPORTUNITIES[X.opp];
  const W=p=>({x:p[0]*k+Z.x0,y:p[1]*k+Z.y0});
  const m=key=>modOn(X.mods,key);
  L={S,X,opp,k,mods:X.mods,plan:X.plan,seed:X.seed,lane:X.lane.map(W),leg:1,W,
    fjump:W(X.lane[X.lane.length-1]),relay:W([(X.plan.assetAt.relay||opp.relay).x,(X.plan.assetAt.relay||opp.relay).y]),
    phase:1,phaseT:[0,null,null],detect:0,alarm:false,alarmWhy:null,
    fr:'fl400',spool:null,spoolWhy:null,escaped:false,ended:false,disabled:false,drift:null,crashed:false,deadT:null,cause:[],m:{},prim:S.objectives[0],
    planet:{x:opp.planet.x*k+Z.x0,y:opp.planet.y*k+Z.y0,r:opp.planet.r*k,pull:opp.planet.pull*k},
    subs:makeSubs(m('guns')),bombs:[],pdK:m('guns')?{dmg:2,rng:1.5}:{dmg:1,rng:1},gunsShown:false,
    resolve:m('demoralised')?40:N.RESOLVE_START,surrender:null,transfer:0,
    board:0,boardT0:null,scuttleT:null,boarded:false,prize:false,hauled:0,hauledLost:0,
    tag:{ship:X.plan.tagger,prog:0,planted:false},respKills:0,
    distress:null,responseAt:null,responded:false,exec:{},resHitT:{},escN:0};
  for(const wid in X.plan.wings)L.exec[wid]=X.plan.wings[wid].exec?Object.assign({},X.plan.wings[wid].exec):null;
  const fr=FR();
  if(fr){fr.role35='freighter';fr.home=null;
    const len=L.lane.reduce((a,p,i)=>i?a+dist(p,L.lane[i-1]):0,0);L.cruise=len/FREIGHTER_SECS;   // world units a second
    if(m('limping'))L.cruise*=0.6;
    fr.vx=Math.cos(fr.h)*L.cruise;fr.vy=Math.sin(fr.h)*L.cruise;fr.subs35=L.subs;
    fr.abCd={};for(const a of Object.keys(SIM.ABILITIES))fr.abCd[a]=1e9;fr.chaffLeft=0;}   // a freighter has no pilot's tricks
  for(const e of R.enemies)if(e.role==='guard'&&e.asset==='fl400'){const s=F.byId(e.id);if(s){s.role35='escort';s.side35=e.side||0;}}
  L.escN=S.ships.filter(s=>s.role35==='escort').length;
  for(const s of S.ships)if(s.faction==='reb'&&!s.struct){const sd=findShipDef(s.id);s.load35=sd&&sd.load35||null;if(s.load35==='bombs')s.bombs=N.BOMB_N;if(s.load35==='pods')s.pods=[];}
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
  HK.damage=(t,dmg,skip,front,hit)=>live()&&t.id===L.fr?damageFreighter(t,dmg,skip,front,hit):null;
  HK.canFire=(s,t,q)=>live()?canFire(s,t,q):true;
}
function detach(){for(const k of Object.keys(HK))delete HK[k];L=null;}

/* ---------- damage: shields and armour as any ship, then the subsystem the hit lands on (or that the shooter is told to
   hit), else the core. Fighter guns barely scratch a capital hull (GUN_VS_CAP); bombs are what crack it ---------- */
function damageFreighter(t,dmg,skip,front,hit){
  const by=hit&&hit.by?F.byId(hit.by):null,bomb=!!(hit&&hit.bomb);
  if(by&&by.faction==='reb'&&!bomb)dmg*=N.GUN_VS_CAP;
  let rem=dmg,sd=0,ad=0,hd=0;const zone=front?'F':'R';
  if(!skip&&!bomb){for(const k of ['F','R']){if(rem<=0)break;if(t.segs[k].at!==zone)continue;const take=Math.min(t.segs[k].val,rem);t.segs[k].val-=take;rem-=take;sd+=take;}}
  if(rem>0&&t.arm>0){const a=Math.min(t.arm,rem*(bomb?0.5:1));t.arm-=a;rem-=a;ad+=a;}   // a bomb's blast gets past armour
  if(rem>0){hd=rem;routeHit(t,rem,hit,by,bomb);}
  return {sd,ad,hd,zone};
}
function routeHit(t,dmg,hit,by,bomb){
  let sb=null;
  const aim=(hit&&hit.aimSub)||(by&&by.sub35);   // a bomb's own aim, else what the shooter is told to hit
  if(aim&&aim!=='core'){const p=hit&&hit.x!=null?hit:t;sb=nearestSub(t,aim,p);}
  if(!sb&&hit&&hit.x!=null&&!(aim==='core')){const lp=toHull(t,hit);let bd=1e9;for(const x of L.subs){if(x.hp<=0||(x.k==='cargo'&&x.taken))continue;const d=Math.hypot(x.x-lp.x,x.y-lp.y);if(d<x.r*1.8&&d<bd){bd=d;sb=x;}}}
  if(sb){const take=Math.min(sb.hp,dmg);sb.hp-=take;dmg-=take;if(sb.hp<=0)subDown(t,sb,by);}
  if(dmg>0)t.hull-=dmg;
  // a rebel hit on the hull or cargo stiffens the crew (once a second a shooter)
  if(by&&by.faction==='reb'&&(!sb||sb.k==='cargo')&&SIM.S.t-(L.resHitT[by.id]||-9)>=1){L.resHitT[by.id]=SIM.S.t;L.resolve=Math.min(100,L.resolve+N.RES_HIT);}
  if(t.hull<=0&&t.alive)F.kill(t,by&&by.alive?by:null);
}
function subDown(fr,sb,by){
  const S=SIM.S,p=subWorld(fr,sb);
  S.fx.push({x:p.x,y:p.y,t0:S.t,kind:'boom',size:sb.k==='cargo'&&sb.hazard?1.2:0.8,src:'mhit'});
  if(sb.k==='engines'){L.disabled=true;L.spool=null;L.drift={vx:fr.vx,vy:fr.vy};L.resolve=Math.max(0,L.resolve-N.RES_ENGINES);
    SIM.pushEvent('sub','The freighter\'s engines are out: it\'s drifting',{x:p.x,y:p.y,tone:'good'});}
  else if(sb.k==='comms'){SIM.pushEvent('sub','The freighter\'s comms array is down'+(L.distress&&!L.distress.landed?': the distress call is cut':''),{x:p.x,y:p.y,tone:'good'});
    if(L.distress&&!L.distress.landed)L.distress.cut=true;}
  else if(sb.k==='pd'){L.resolve=Math.max(0,L.resolve-N.RES_TURRET);SIM.pushEvent('sub','A freighter turret is down ('+subsLive('pd').length+' left)',{x:p.x,y:p.y,tone:'good'});}
  else if(sb.k==='cargo'){
    if(sb.hazard){SIM.pushEvent('sub','A hazard module goes up',{x:p.x,y:p.y,tone:'hazard'});
      for(const s of S.ships){if(!s.alive||s===fr)continue;const d=dist(s,p);if(d<N.HAZARD_R){F.applyDamage(s,N.HAZARD_DMG*(1-d/N.HAZARD_R),false,true);if(s.hull<=0&&s.alive)F.kill(s,null);}}
      fr.hull-=N.HAZARD_DMG;
      for(const x of L.subs)if(x!==sb&&x.k==='cargo'&&x.hp>0&&Math.hypot(x.x-sb.x,x.y-sb.y)<14){x.hp-=N.HAZARD_DMG*0.6;if(x.hp<=0)subDown(fr,x,null);}   // the next module along may go too
      if(fr.hull<=0&&fr.alive)F.kill(fr,by&&by.alive?by:null);}
  }
}
const cargoLeft=()=>L.subs.filter(x=>x.k==='cargo'&&x.hp>0&&!x.taken&&!x.hazard).length;
const cargoLost=()=>L.subs.filter(x=>x.k==='cargo'&&(x.hp<=0||x.taken)).map(x=>x.i);

/* ---------- who may fire on what (P3 adds the rules) ---------- */
function canFire(s,t,q){
  if(t.id===L.fr&&(L.surrender||L.prize))return false;   // a surrendered ship or our prize: hold fire
  if(s.id===L.fr)return false;
  return true;
}

/* ---------- thinking: the freighter and its escorts here; your wings by their Executive Orders ---------- */
function think(s){
  if(s.role35==='freighter'){s.beh={kind:'freighter',why:L.prize?'the prize, crawling home':L.surrender?'hove to':L.disabled?'drifting, engines out':L.alarm?'running for its jump':'on its lane'};s.assess='';return true;}
  if(s.role35==='escort'&&!L.alarm){
    const fr=FR();if(!fr||!fr.alive)return false;
    const th=fr.vh!=null?fr.vh:fr.h,side=s.side35||0;
    s.beh={kind:'patrol',dest:{x:fr.x-Math.sin(th)*ESCORT_SIDE*side+Math.cos(th)*400,y:fr.y+Math.cos(th)*ESCORT_SIDE*side+Math.sin(th)*400},why:'escorting the freighter'};
    return true;
  }
  if(s.faction==='reb'&&s.wing&&!s.quiet)return thinkWing(s);
  return false;
}
const setB=(s,b)=>{F.setBeh(s,b);return true;};
function thinkWing(s){
  const S=SIM.S,w=F.wingOf(s.wing),ex=L.exec[s.wing],fr=FR();
  if(s.dock35)return setB(s,{kind:'docked',why:s.load35==='board'?'boarding':'hauling cargo',hard:true});
  if(!ex||!w)return false;
  const T=w.order;
  if(s.recall||s.panic||(s.beh&&s.beh.rule))return false;   // High Command's own ladder outranks the plan
  const frLive=fr&&fr.alive&&!L.prize;
  s.sub35=null;
  switch(ex.k){
    case 'disable':s.sub35=ex.arg||'engines';if(!frLive||!subUp(s.sub35))return holdBy(s,w);w.order={kind:'attack',target:{type:'ship',id:L.fr}};return false;
    case 'destroy':if(!frLive)return holdBy(s,w);w.order={kind:'attack',target:{type:'ship',id:L.fr}};s.sub35=s.load35==='bombs'?'core':null;return false;
    case 'suppress':
      if(ex.arg==='escorts'){const e=nearestFoe(s,x=>x.role35==='escort');if(e)return setB(s,{kind:'engage',target:e.id,why:'suppressing the escort'});return holdBy(s,w);}
      s.sub35='turrets';if(!frLive||!subUp('turrets'))return holdBy(s,w);w.order={kind:'attack',target:{type:'ship',id:L.fr}};return false;
    case 'board':case 'haul':{
      const spec=ex.k==='board'?'board':'pods',mine=s.load35===spec;
      if(mine){
        if(ex.k==='haul'&&s.pods&&s.pods.length>=N.POD_CAP)return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:'holds full: home'});
        if(!frLive)return holdBy(s,w);
        if(L.disabled||L.surrender)return setB(s,{kind:'dock35',why:ex.k==='board'?'closing to board':'closing to haul'});
        return setB(s,{kind:'holdoff',why:'waiting for the engines to go'});}
      // the rest of the wing covers its specialists
      const sp=F.wingShips(w).find(x=>x.load35===spec&&x!==s);
      if(sp){const th=nearestFoe(sp,x=>dist(x,sp)<4000);if(th)return setB(s,{kind:'engage',target:th.id,why:'covering '+sp.name});return setB(s,{kind:'escort',charge:sp.id,why:'covering '+sp.name});}
      w.order={kind:'attack',target:{type:'ship',id:L.fr}};s.sub35='turrets';return false;}
    case 'intimidate':{
      if(!frLive)return holdBy(s,w);
      const e=nearestFoe(s,x=>x.role35==='escort'&&dist(x,fr)<5000);
      if(e&&dist(e,s)<4000)return setB(s,{kind:'engage',target:e.id,why:'clearing the escort'});
      s.sub35='turrets';return setB(s,{kind:'intim',why:'guns on its turrets'});}
    case 'tag':{
      if(!frLive)return holdBy(s,w);
      const tg=L.tag.ship||w.ships[w.ships.length-1];
      if(s.id===tg&&!L.tag.planted)return setB(s,{kind:'tag',why:'closing to plant the tracker'});
      return setB(s,{kind:'far',dest:farPoint(s),why:'keeping out of sight'});}
    case 'ambush':case 'hold':{
      const p=ex.arg&&ex.arg.x!=null?L.W([ex.arg.x,ex.arg.y]):ex.k==='ambush'?ambushPoint():w.rally||F.wingCentre(w);
      const e=nearestFoe(s,x=>!x.struct&&x.role35!=='freighter'&&dist(x,p)<HOLD35_R);
      if(e)return setB(s,{kind:'engage',target:e.id,why:ex.k==='ambush'?'springing the ambush':'holding'});
      return setB(s,{kind:'waitpt',dest:p,why:ex.k==='ambush'?'lying in wait':'holding'});}
    case 'defend':{const ow=F.wingOf(ex.arg),ls=ow?F.wingShips(ow):[];if(!ls.length)return holdBy(s,w);w.order={kind:'escort',target:{type:'ship',id:(ls.find(x=>x.id===ow.leader)||ls[0]).id}};return false;}
    case 'escort':if(!fr||!fr.alive)return holdBy(s,w);w.order={kind:'escort',target:{type:'ship',id:L.fr}};return false;
    case 'withdraw':w.order={kind:'withdraw'};return false;
  }
  return false;
}
const HOLD35_R=3500;   // a holding or ambushing wing takes on what comes this close to its point. placeholder
function holdBy(s,w){return setB(s,{kind:'waitpt',dest:w.rally||F.wingCentre(w),why:'nothing to do: holding'});}
function nearestFoe(s,f){let b=null,bd=1e18;for(const t of SIM.S.ships){if(!t.alive||t.faction===s.faction||t.struct||t.quiet||(f&&!f(t)))continue;const d=dist(s,t);if(d<bd){bd=d;b=t;}}return b;}
function farPoint(s){const fr=FR();if(!fr)return {x:s.x,y:s.y};const a=Math.atan2(s.y-fr.y,s.x-fr.x);return {x:fr.x+Math.cos(a)*7000,y:fr.y+Math.sin(a)*7000};}
function ambushPoint(){const Z=SIM.zone;return {x:L.fjump.x,y:Z.y0+1800};}
const dockPoint=(fr,s)=>{const side=s.dockSide||(((s.id.charCodeAt(0)+s.id.length)%2)?1:-1),u=FL_UNIT(),c=Math.cos(fr.h),sn=Math.sin(fr.h),ox=(s.load35==='board'?-8:10)*u,oy=side*N.DOCK_OFF;
  return {x:fr.x+ox*c-oy*sn,y:fr.y+ox*sn+oy*c,side};};
function goal(s){
  const fr=FR();
  if(s.role35==='freighter'){
    const c=F.capsOf(s),slow=clamp(c.vMin/c.vMax,0,1);
    if(L.prize){const p=SIM.S.points.ourjump;return {x:p.x,y:p.y,spd:slow};}   // the step flies the prize home itself
    if(L.disabled||L.surrender)return {x:s.x+s.vx,y:s.y+s.vy,spd:slow};   // the step puts it back on its drift
    const p=L.lane[Math.min(L.leg,L.lane.length-1)],v=L.cruise*(L.alarm?FLANK_K:1);
    if(L.spool!=null)return {x:s.x+Math.cos(s.vh)*2000,y:s.y+Math.sin(s.vh)*2000,spd:slow,noCorner:true};   // spooling: straight on, slow
    return {x:p.x,y:p.y,spd:clamp(v/c.vMax,slow,1),noCorner:true};
  }
  if(s.role35==='escort'&&!L.alarm&&s.beh&&s.beh.kind==='patrol')return Object.assign(F.orbitGoal(s,s.beh.dest,ESCORT_ORBIT),{spd:F.CRUISE_()*0.8});
  const b=s.beh||{};
  if(b.kind==='docked'){const d=fr&&fr.alive?dockPoint(fr,s):s;s.holdFire=s.load35!=='board';return {x:d.x+Math.cos(fr?fr.h:s.h)*400,y:d.y+Math.sin(fr?fr.h:s.h)*400,spd:0};}
  if(b.kind==='dock35'&&fr){const d=dockPoint(fr,s);return {x:d.x,y:d.y,spd:dist(s,d)>2500?1:0.55,noCorner:true};}
  if(b.kind==='holdoff'&&fr)return Object.assign(F.orbitGoal(s,fr,N.HOLDOFF_R),{spd:F.CRUISE_()});
  if(b.kind==='intim'&&fr){s.fireAt=fr.id;return Object.assign(F.orbitGoal(s,fr,N.INTIM_R),{spd:F.CORNER_?F.CORNER_():0.7,face:fr});}
  if(b.kind==='tag'&&fr){s.holdFire=true;return dist(s,fr)>N.TAG_R*1.4?{x:fr.x,y:fr.y,spd:0.8}:Object.assign(F.orbitGoal(s,fr,N.TAG_R*0.6),{spd:0.5});}
  if(b.kind==='far'){s.holdFire=true;return Object.assign(F.orbitGoal(s,b.dest,WAIT_ORBIT),{spd:F.CRUISE_()*0.8});}
  if(b.kind==='waitpt')return Object.assign(F.orbitGoal(s,b.dest,WAIT_ORBIT),{spd:F.CRUISE_()*0.8});
  return null;
}
function alarm(why,text){
  if(L.alarm)return;
  L.alarm=true;L.alarmWhy=why;setPhase(2,text||'They know you\'re here');
  // the distress call goes out if the comms array is alive
  if(subUp('comms'))L.distress={t0:SIM.S.t,landed:false,cut:false};
  if(modOn(L.mods,'quick')&&!L.disabled){const fr=FR();if(fr){L.spool=SIM.S.t;L.spoolWhy='quick';L.spoolAt={x:fr.x,y:fr.y};SIM.pushEvent('fjump','The freighter is spooling a jump where it is',{x:fr.x,y:fr.y,tone:'hazard'});}}
}
function setPhase(n,text){
  if(L.phase>=n)return;
  L.phase=n;L.phaseT[n-1]=SIM.S.t;if(n===3&&L.phaseT[1]==null)L.phaseT[1]=SIM.S.t;
  SIM.pushEvent('phase','Phase '+n+': '+(n===2?'engaged':'response')+(text?' · '+text:''),{tone:'hazard'});
}
function responseSecs(){let t=N.RESPONSE_SECS;if(modOn(L.mods,'rich'))t*=0.75;if(modOn(L.mods,'rapid'))t*=0.5;return t;}
/* the response (Phase 3): warps in beyond the play area's edge, near the freighter's jump point */
function spawnResponse(){
  const S=SIM.S,Z=SIM.zone,R=L.opp.response,n=R.force.reduce((a,f)=>a+(f.n||1),0),grp=++S.grpN;let i=0;
  const cx=clamp(L.fjump.x,Z.x0+2000,Z.x1-2000);
  for(const f of R.force)for(let k=0;k<(f.n||1);k++){
    const at=R.edge==='N'?[cx+(i-(n-1)/2)*700,Z.y0-900,Math.PI/2]:[cx+(i-(n-1)/2)*700,Z.y1+900,-Math.PI/2];i++;
    const out=F.spawnEnemies(Object.assign({},f,{n:1,at,role:'hunt',grp,name:(f.name||'Response')+' '+i}),()=>++S.eN);
    for(const s of out){s.role35='response';s.thinkT=F.THINK_SECS_();}
  }
  L.responded=true;
  SIM.pushEvent('reinforce','The Hegemony response is here: get out',{x:cx,y:Z.y0,tone:'hazard'});
}

/* ---------- the step: the freighter, its guns and the bombs, docking, the crew, the phases, the objectives ---------- */
function step(dt){
  const S=SIM.S,fr=FR();
  if(fr&&fr.alive)stepFreighter(fr,dt);
  if(fr&&!fr.alive&&L.deadT==null&&!fr.jumped){L.deadT=S.t;L.deadPose={x:fr.x,y:fr.y,h:fr.h,lost:cargoLost()};}
  pdTick(fr,dt);bombTick(fr,dt);dockTick(fr,dt);
  for(const s of S.ships)if(s.role35==='response'&&!s.alive&&!s.jumped)countKill(s);
  // escorts lost shake the crew
  const escN=S.ships.filter(s=>s.alive&&s.role35==='escort').length;if(escN<L.escN){L.resolve=Math.max(0,L.resolve-N.RES_ESCORT*(L.escN-escN));L.escN=escN;}
  // the crew's resolve: every rebel ship near takes a little; at 0 they offer to surrender (Pirate)
  if(fr&&fr.alive&&!L.surrender&&!L.prize){
    let n=0;for(const s of S.ships)if(s.alive&&s.faction==='reb'&&!s.struct&&!s.quiet&&dist(s,fr)<N.THREAT35_R)n++;
    L.resolve=Math.max(0,L.resolve-n*N.RES_THREAT*dt);
    if(L.resolve<=0&&!modOn(L.mods,'fanatical')&&!L.offered&&S.t>=(L.noUntil||0)){L.offered=S.t;
      SIM.pushEvent('surrender','The freighter is hailing: they\'ll hand over the cargo if you let them go',{x:fr.x,y:fr.y,tone:'good'});
      if(HK.surrenderAsk)HK.surrenderAsk();else answerSurrender(L.plan.primary==='pirate'?'take':'no');}
  }
  // Phase 1: detection, from every rebel inside an escort's ring (nearer counts more)
  if(L.phase===1){
    let gain=0;
    for(const e of S.ships){if(!e.alive||e.role35!=='escort')continue;
      for(const r of S.ships){if(!r.alive||r.faction!=='reb'||r.struct||r.quiet)continue;const d=dist(e,r);const k=r.beh&&r.beh.kind==='tag'?DETECT_QUIET:r.beh&&(r.beh.kind==='waitpt'||r.beh.kind==='far')?DETECT_STILL:1;
        if(d<DETECT_R)gain=Math.max(gain,(1-d/DETECT_R)*k);}}
    L.detect=clamp(L.detect+(gain>0?gain*DETECT_RATE:-DETECT_DECAY)*dt,0,100);
    if(L.detect>=100)alarm('detected','They spotted you');
    if(S.proj.some(p=>p.faction==='reb')||L.bombs.length)alarm('fired','Shots fired');
  }
  // the distress call, then the response clock, then Phase 3
  const D=L.distress;
  if(D&&!D.landed&&!D.cut&&S.t-D.t0>=N.DISTRESS_SECS){D.landed=true;D.t=S.t;if(!modOn(L.mods,'remote')){L.responseAt=S.t+responseSecs();}
    SIM.pushEvent('distress','The distress call got out'+(modOn(L.mods,'remote')?', but there\'s nobody near to hear it':': the response is coming'),{tone:'hazard',x:fr?fr.x:null,y:fr?fr.y:null});}
  if(L.responseAt!=null&&!L.responded&&S.t>=L.responseAt){setPhase(3,'Hegemony on site');spawnResponse();}
  tagTick(fr,dt);
  primaryTick(fr);
}
function stepFreighter(fr,dt){
  const S=SIM.S;
  if(L.disabled||L.surrender){   // drift: the engines (or the crew) quit; the planet pulls
    const d=L.drift||(L.drift={vx:fr.vx,vy:fr.vy});
    d.vx*=1-N.DRIFT_DECAY*dt;d.vy*=1-N.DRIFT_DECAY*dt;
    const pd=dist(fr,L.planet);
    if(pd<L.planet.pull){const a=N.PULL_ACC*(L.planet.pull/Math.max(L.planet.r,pd));d.vx+=(L.planet.x-fr.x)/pd*a*dt;d.vy+=(L.planet.y-fr.y)/pd*a*dt;}
    fr.x=fr.px+d.vx*dt;fr.y=fr.py+d.vy*dt;fr.vx=d.vx;fr.vy=d.vy;fr.vh=Math.atan2(d.vy,d.vx);
    if(pd<L.planet.r+60){L.crashed=true;fr.hull=0;SIM.pushEvent('crash','The freighter falls into the planet',{x:fr.x,y:fr.y,tone:'good'});F.kill(fr,null);}
    return;
  }
  if(L.prize){   // the prize crew flies her home: a capital ship can't turn at a crawl in the flight model, so the layer steers
    const p=S.points.ourjump,want=Math.atan2(p.y-fr.py,p.x-fr.px),e=angNorm(want-(L.prizeH==null?(L.prizeH=Math.atan2(fr.vy,fr.vx)):L.prizeH));
    L.prizeH=angNorm(L.prizeH+clamp(e,-N.PRIZE_TURN*dt,N.PRIZE_TURN*dt));
    fr.vx=Math.cos(L.prizeH)*N.PRIZE_SPD;fr.vy=Math.sin(L.prizeH)*N.PRIZE_SPD;fr.vh=L.prizeH;fr.x=fr.px+fr.vx*dt;fr.y=fr.py+fr.vy*dt;fr.h=angNorm(fr.ph+clamp(angNorm(L.prizeH-fr.ph),-N.PRIZE_TURN*dt,N.PRIZE_TURN*dt));
    if(dist(fr,p)<=F.JUMP_R_()*1.5){fr.alive=false;fr.jumped=true;fr.jumpT=S.t;L.prizeHome=true;SIM.pushEvent('fjump','The prize jumps out: the freighter is ours',{x:p.x,y:p.y,tone:'good'});}return;}
  const p=L.lane[Math.min(L.leg,L.lane.length-1)];
  if(L.spool==null){
    // a leg is done once the freighter is level with its end (a capital ship can't turn tight enough to touch a point)
    const a=L.lane[L.leg-1],sx=p.x-a.x,sy=p.y-a.y,sl=Math.hypot(sx,sy)||1,along=((fr.x-a.x)*sx+(fr.y-a.y)*sy)/sl;
    const there=dist(fr,p)<LANE_ARRIVE||along>=sl-LANE_ARRIVE*0.5;
    if(there&&L.leg<L.lane.length-1)L.leg++;
    else if(there){L.spool=S.t;L.spoolAt={x:fr.x,y:fr.y};SIM.pushEvent('fjump','The freighter is spooling its jump',{x:fr.x,y:fr.y,tone:'hazard'});}
  }
  if(L.spool!=null&&S.t-L.spool>=(L.spoolWhy==='quick'?N.QUICK_SPOOL:JUMP_SECS)){
    if(HK.canJump&&HK.canJump(fr)===false)return;   // an Interdictor holds it (P4)
    fr.alive=false;fr.jumped=true;fr.jumpT=S.t;L.escaped=true;
    SIM.pushEvent('fjump','The freighter jumped out',{x:fr.x,y:fr.y,tone:'hazard'});
    for(const e of S.ships)if(e.alive&&e.role35==='escort'&&dist(e,fr)<6000){e.alive=false;e.jumped=true;e.jumpT=S.t;}   // its escort goes with it
  }
}
/* point defence: each live turret fires at the nearest rebel in reach, once alarmed (Hidden Guns: harder and further) */
const PD_W={id:'pd35',name:'Point defence',kind:'ballistic',rng:1000,dmg:[1,2],skipShield:false,crit:0,needsLock:false};
function pdTick(fr,dt){
  if(!fr||!fr.alive||!L.alarm||L.surrender||L.prize)return;
  const S=SIM.S,R=N.PD_R*L.pdK.rng,w=Object.assign({},PD_W,{rng:R,dmg:[PD_W.dmg[0]*L.pdK.dmg,PD_W.dmg[1]*L.pdK.dmg]}),V=F.projSpd(w);
  for(const sb of L.subs){
    if(sb.k!=='pd'||sb.hp<=0)continue;
    const p=subWorld(fr,sb);let t=null,bd=R;
    for(const s of S.ships){if(!s.alive||s.faction!=='reb'||s.struct||s.quiet)continue;const d=dist(s,p);if(d<bd){bd=d;t=s;}}
    sb.aim=t?{x:t.x,y:t.y}:null;
    if(!t||S.t-sb.shotT<N.PD_GAP)continue;
    sb.shotT=S.t;
    const h=F.aimAngle({x:p.x,y:p.y,h:Math.atan2(t.y-p.y,t.x-p.x)},t,w)+(S.rng()-0.5)*N.PD_SPREAD*2;
    S.proj.push({x:p.x,y:p.y,x0:p.x,y0:p.y,vx:Math.cos(h)*V,vy:Math.sin(h)*V,owner:fr.id,faction:'heg',w,burst:null,life:R/V*1.1,age:0,style:'repeaters'});
    if(L.pdK.dmg>1&&!L.gunsShown){L.gunsShown=true;revealMod('guns','Its point defence hits harder than it should: Hidden Guns');}
  }
}
/* bombs (§4.3): a Brickbat on a run at the freighter drops them, slow and heavy; they only hit something big */
function bombTick(fr,dt){
  const S=SIM.S;
  if(fr&&fr.alive&&!L.prize&&!L.surrender)for(const s of S.ships){
    if(!s.alive||!s.bombs||s.faction!=='reb'||!(s.beh&&s.beh.kind==='engage'&&s.beh.target===fr.id))continue;
    if(S.t-(s.bombT||-9)<N.BOMB_GAP||!canFire(s,fr,null))continue;
    const sb=s.sub35&&s.sub35!=='core'?nearestSub(fr,s.sub35,s):null,aim=sb?subWorld(fr,sb):{x:fr.x,y:fr.y};
    const d=dist(s,aim);if(d>N.BOMB_R)continue;
    const V=F.misSpd()*N.BOMB_K,tau=d/V,ax=aim.x+fr.vx*tau,ay=aim.y+fr.vy*tau,h=Math.atan2(ay-s.y,ax-s.x);
    if(Math.abs(angNorm(h-s.h))>0.6)continue;
    s.bombs--;s.bombT=S.t;
    L.bombs.push({x:s.x,y:s.y,x0:s.x,y0:s.y,px:s.x,py:s.y,vx:Math.cos(h)*V,vy:Math.sin(h)*V,owner:s.id,faction:'reb',style:'bombs',life:d/V*1.6+0.5,age:0,aimSub:s.sub35||'core',id:++L.bombN||(L.bombN=1)});
    SIM.pushEvent('bomb',s.name+' drops a bomb'+(s.bombs?'':' (racks empty)'),{ship:s.id,x:s.x,y:s.y,tone:'info'});
  }
  const kept=[];
  for(const b of L.bombs){
    b.age+=dt;const p0={x:b.x,y:b.y},p1={x:b.x+b.vx*dt,y:b.y+b.vy*dt};
    let hit=null;
    for(const t of S.ships){if(!t.alive||t.faction==='reb'||t.row.size<N.BOMB_MIN)continue;const h=F.hullHit(t,p0,p1);if(h){hit={t,h};break;}}
    if(hit){const by=F.byId(b.owner);F.hitShip(hit.t,b.owner,{id:'bombs35',name:'Bombs',kind:'bomb',rng:N.BOMB_R,dmg:[N.BOMB_DMG,N.BOMB_DMG],skipShield:true,crit:0,needsLock:false},b.vx,b.vy,Object.assign({},hit.h,{bomb:true,aimSub:b.aimSub,by:b.owner}),true,0);continue;}
    if(b.age>=b.life){S.fx.push({x:b.x,y:b.y,t0:S.t,kind:'boom',size:0.4,src:'mmiss'});continue;}
    b.px=b.x;b.py=b.y;b.x=p1.x;b.y=p1.y;kept.push(b);
  }
  L.bombs=kept;
}
/* docking: a Brickbat at a disabled (or surrendered) freighter clamps on; boarders board, pod ships haul */
function dockTick(fr,dt){
  const S=SIM.S;
  const ok=fr&&fr.alive&&(L.disabled||L.surrender)&&!L.prize;
  let boarders=0;
  for(const s of S.ships){
    if(!s.alive||s.faction!=='reb'||!s.load35)continue;
    if(s.dock35&&!ok){s.dock35=null;continue;}
    if(!s.dock35&&ok&&s.beh&&s.beh.kind==='dock35'){const d=dockPoint(fr,s);if(dist(s,d)<N.DOCK_R){s.dock35={t:S.t,side:d.side};s.dockSide=d.side;s.thinkT=F.THINK_SECS_();
      SIM.pushEvent('dock',s.name+' clamps on'+(s.load35==='board'?': the marines go in':': hauling'),{ship:s.id,x:s.x,y:s.y,tone:'good'});}}
    if(!s.dock35)continue;
    // held on the clamp: where its pad is, moving with the hull (the flight model put it somewhere else this step)
    const d=dockPoint(fr,s);s.x=d.x;s.y=d.y;s.vx=fr.vx;s.vy=fr.vy;s.h=fr.h+(s.dock35.side>0?Math.PI/2:-Math.PI/2);s.vh=Math.atan2(fr.vy,fr.vx)||s.h;
    if(s.load35==='board')boarders++;
    if(s.load35==='pods'){s.haulT=(s.haulT||0)+dt;
      if(s.haulT>=N.HAUL_SECS){s.haulT=0;const c=L.subs.find(x=>x.k==='cargo'&&x.hp>0&&!x.taken&&!x.hazard);
        if(c){c.taken=true;s.pods.push(c.i);SIM.pushEvent('haul',s.name+' has a container ('+s.pods.length+'/'+N.POD_CAP+')',{ship:s.id,x:s.x,y:s.y,tone:'good'});}
        if(!c||s.pods.length>=N.POD_CAP){s.dock35=null;s.thinkT=F.THINK_SECS_();}}}
  }
  if(boarders&&ok){
    if(L.boardT0==null){L.boardT0=S.t;if(modOn(L.mods,'scuttle')){L.scuttleT=S.t+N.SCUTTLE_SECS;revealMod('scuttle','Scuttle charges: the boarders have '+N.SCUTTLE_SECS+' s');}}
    const rate=boarders/N.BOARD35_SECS*(modOn(L.mods,'fanatical')?0.5:1)*(L.hatch?2:1);
    L.board=Math.min(1,L.board+rate*dt);
    if(L.board>=1){L.boarded=true;L.prize=true;fr.faction='reb';fr.quiet=true;L.disabled=false;L.drift=null;L.scuttleT=null;
      for(const s of S.ships)if(s.dock35){s.dock35=null;s.thinkT=F.THINK_SECS_();}
      SIM.pushEvent('board','The freighter is ours: the prize crew is taking her home',{x:fr.x,y:fr.y,tone:'good'});}
  }
  if(L.scuttleT!=null&&fr&&fr.alive&&S.t>=L.scuttleT){L.scuttleT=null;SIM.pushEvent('scuttle','The scuttle charges blow',{x:fr.x,y:fr.y,tone:'hazard'});
    for(const s of S.ships)if(s.dock35&&s.alive){F.applyDamage(s,60,true,true);if(s.hull<=0)F.kill(s,null);s.dock35=null;}
    fr.hull=0;F.kill(fr,null);}
  // the surrender's hand-over: a rebel ship holds near it
  if(L.surrender==='take'&&fr&&fr.alive){
    const near=S.ships.some(s=>s.alive&&s.faction==='reb'&&!s.quiet&&!s.struct&&dist(s,fr)<N.TRANSFER_R);
    if(near)L.transfer+=dt;
    if(L.transfer>=N.TRANSFER_SECS&&!L.transferred){L.transferred=true;SIM.pushEvent('surrender','The cargo is handed over',{x:fr.x,y:fr.y,tone:'good'});}
  }
}
/* the surrender's answer (§5.6 request 5): take the cargo, demand the ship, or no deal */
function answerSurrender(a){
  const fr=FR();if(!fr||!fr.alive)return;
  if(a==='take'){L.surrender='take';L.drift={vx:fr.vx,vy:fr.vy};SIM.pushEvent('surrender','They heave to and open the holds',{x:fr.x,y:fr.y,tone:'good'});}
  else if(a==='demand'){if(modOn(L.mods,'demoralised')){L.surrender='ship';L.boarded=true;L.prize=true;fr.faction='reb';fr.quiet=true;SIM.pushEvent('surrender','They give up the ship',{x:fr.x,y:fr.y,tone:'good'});}
    else{L.resolve=30;L.offered=null;L.noUntil=SIM.S.t+60;SIM.pushEvent('surrender','They refuse to give up the ship: the fight goes on',{x:fr.x,y:fr.y,tone:'hazard'});}}
  else{L.resolve=20;L.offered=null;L.noUntil=SIM.S.t+60;}   // no deal: they won't ask again for a minute
}
function revealMod(k,text){const m=L.mods.find(x=>x.k===k&&!x.fake);if(m&&!m.found){m.found=true;SIM.pushEvent('intel',text,{tone:'hazard'});}}
function tagTick(fr,dt){
  if(L.tag.planted||!fr||!fr.alive)return;
  const t=F.byId(L.tag.ship);if(!t||!t.alive||!(t.beh&&t.beh.kind==='tag'))return;
  if(dist(t,fr)>N.TAG_R)return;
  const side=toHull(fr,t).y<0?[0,2]:[1,3],pdDown=L.subs.filter(x=>x.k==='pd'&&side.includes(x.i)).every(x=>x.hp<=0);
  if(L.phase>1&&!pdDown)return;
  L.tag.prog+=dt;
  if(L.tag.prog>=N.TAG_SECS){L.tag.planted=true;SIM.pushEvent('tag',t.name+' plants the tracker',{ship:t.id,x:t.x,y:t.y,tone:'good'});}
}
/* the primary (§4.1): its win check, and when it's settled every wing goes home */
function primaryTick(fr){
  const S=SIM.S,o=L.prim,k=L.plan.primary;if(o.state!=='live')return;
  const gone=!fr||!fr.alive,dead=gone&&!fr.jumped;
  let done=false,fail=false;
  if(k==='destroy'){done=dead;fail=L.escaped||L.prizeHome;}
  else if(k==='crash'){done=dead&&L.crashed;fail=(dead&&!L.crashed)||L.escaped;}
  else if(k==='steal'){done=!!L.prizeHome;fail=dead||L.escaped;}
  else if(k==='pirate'){done=!!L.transferred;fail=dead||L.escaped||(modOn(L.mods,'fanatical')&&L.resolve<=0);}
  else if(k==='strip'){
    const home=S.ships.filter(s=>s.jumped&&s.pods&&s.pods.length).reduce((a,s)=>a+s.pods.length,0);L.hauled=home;
    const carriers=S.ships.filter(s=>s.alive&&s.pods&&s.pods.length);
    done=home>0&&(gone||!carriers.length);fail=home===0&&(gone||(!S.ships.some(s=>s.alive&&s.load35==='pods')));}
  else if(k==='tag'){done=L.escaped&&L.tag.planted;fail=dead||(L.escaped&&!L.tag.planted);}
  else if(k==='ambush'){done=L.respKills>=N.AMBUSH_KILLS;fail=(gone&&!L.responseAt&&!L.responded&&!(L.distress&&!L.distress.landed&&!L.distress.cut))||modOn(L.mods,'remote');}
  if(done){o.state='done';o.doneT=S.t;SIM.pushEvent('objective',PRIMARIES[k].name+': done',{tone:'good',x:fr?fr.x:null,y:fr?fr.y:null});}
  else if(fail){o.state='failed';SIM.pushEvent('objective','Failed: '+PRIMARIES[k].name,{tone:'hazard',x:fr?fr.x:null,y:fr?fr.y:null});}
  if(o.state!=='live'){
    if(!L.responded&&L.phase<3)setPhase(3,'The job\'s settled: get out');
    for(const w of S.wings){L.exec[w.id]={k:'withdraw',arg:null};w.order={kind:'withdraw'};for(const s of F.wingShips(w)){s.dock35=null;s.thinkT=F.THINK_SECS_();}}
  }
}
function onEvent(kind,text,o,e){
  L.cause.push({t:+SIM.S.t.toFixed(2),kind,text,phase:L.phase});
}
/* a response ship killed (the kill hook is High Command's destroyShip: the layer counts it from the feed) */
function countKill(t){if(t&&t.role35==='response'&&!t.counted35){t.counted35=true;L.respKills++;}}

/* =====================================================================
   The panel (getters, grouped) and the export
   ===================================================================== */
return {OPPORTUNITIES,MODS,MOD_KEYS,HC35_CLASSES,WINGS35,LOADOUTS,PRIMARIES,PRIMARY_KEYS,LATER_PRIMARIES,NEED_TEXT,OPTIONALS,ROES,CONFLICTS,SUGGESTS,ASSETS,ORDERS35,ORDER35_KEYS,TRIGGERS,
  TUNE:T35,GROUPS:GROUPS35,get ASSET_SLOTS(){return ASSET_SLOTS;},
  rollMods,modOn,known,defaultPlan,planHas,needsMet,compile,execToHc,mulberry,
  attach,detach,begin,get L(){return L;},live,alarm,setPhase,answerSurrender,revealMod,N,
  fn:{think,goal,step,laneW,findShipDef,subWorld,toHull,FL_UNIT,subsLive,subUp,cargoLeft,cargoLost,dockPoint,spawnResponse,damageFreighter,primaryTick,countKill}};
})();
