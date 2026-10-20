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
const Math=window.SR_DMATH;   // deterministic maths, as sim-hc.js (det-math.js)
const SIM=window.SIMHC,F=SIM.fn,HK=SIM.hooks;
const SIM_VERSION='hc35-5';   // bump in any commit that changes how the layer plays (the flight recorder's harness warns on a mismatch)
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
  RESOLVE_START:70,RES_THREAT:1.5,RES_ESCORT:15,RES_TURRET:10,RES_ENGINES:20,RES_HIT:10,THREAT35_R:2600,   // crew resolve (Pirate)
  TRANSFER_SECS:20,TRANSFER_R:1400,PIRATE_SHARE:0.7,   // the surrender's hand-over
  DOCK_R:900,DOCK_OFF:190,             // a Brickbat docks this close to a disabled freighter, clamped this far off its spine
  BOARD35_SECS:30,SCUTTLE_SECS:45,PRIZE_SPD:160,PRIZE_TURN:0.25,   // boarding a ship; the scuttle timer; the prize's crawl home (world units a second) and its turn (radians a second)
  HAUL_SECS:10,POD_CAP:2,              // a container a docked pod ship takes, and how many it carries
  TAG_R:900,TAG_SECS:12,               // Tag and Track: hold this close this long, unseen
  AMBUSH_KILLS:3,                      // response ships an ambush must take
  INTIM_R:1900,                        // an intimidating wing orbits the freighter this wide
  HOLDOFF_R:3200,                      // a boarder or hauler waits this far off a freighter that isn't disabled yet
  DISTRESS_SECS:20,RESPONSE_SECS:150,QUICK_SPOOL:60,   // the distress call, the response clock, Quick Jumper's spool
  // comms (§5.4): delay = (COMMS_BASE + distance / COMMS_SPD + the leader's ACK) × ION_K under Ion Storm; COMMS_OFF 1: no delay
  COMMS_BASE:2.5,COMMS_SPD:3000,ACK_GREEN:1.5,ACK_REG:1,ACK_VET:0.7,ION_K:2,ARRIVE_SPOOL:4,COMMS_OFF:0,
  // command points (§5.5): this many at the start of each phase; what's left at a phase change is lost
  CP1:2,CP2:3,CP3:3,
  // what each power costs
  C_BROADCAST:1,C_NAME:1,C_MARK:1,C_EXEC:2,C_INSIST:1,C_RESERVE:1,C_RAM:1,C_FIRE:1,C_MINES:1,C_BUOY:1,C_TUG:1,C_SPOOF:2,C_PIRATES:2,C_SLEEPER:1,
  // what the powers do
  BROADCAST_NERVE:25,BROADCAST_RES:25,REFUSE_P:0.5,MARK_SECS:20,NEARLY:0.2,
  RAM_DMG:220,RAM_LIFE:40,NUKE_R:2200,NUKE_DMG:160,FIRE_R:1800,FIRE_DMG:110,MINE_N:8,MINE_RING:1100,MINE_R:700,MINE_DMG:55,
  INTERDICT_R:5000,INTERDICT_SECS:30,SPOOF_SECS:25,PIRATE_N:3,PIRATE_GREED:0.4,PIRATE_SECS:120,TUG_R:500,
  // pilot requests (§5.6): how long one waits, how many at once, the gap, a mission's cap, how long a trigger waits to be asked
  REQ_SECS:12,REQ_OPEN:2,REQ_GAP:20,REQ_CAP:6,REQ_PEND:8,REQ_OFF:0,REQ_AUTOSLOW:1,
  HIT_REQ:0.4,VOL_HULL:0.35,VOL_R:3000,RAM_K:1.5,CHASE_R:3000,
  // ejection (§5.7)
  EJECT_P:0.6,EJECT_VET:0.2,POD_SECS:40,POD_R:300,
  // feedback 1, K2: the freighter steers itself (§3.8); boarding's approach (§3.2); the ram; point defence's tracking;
  // Intimidate's standoff and the stuck guard (§3.11); a pod still out at the end is captured within POD_CAPTURE_R
  CAP_TURN:0.05,CAP_TURN_ALARM:0.08,CAP_REALIGN:3,
  DOCK_STAGE:600,DOCK_SPD:0.3,DOCK_SNAP:80,
  RAM_SPD:1.4,RAM_HULL:120,RAM_ARM:60,RAM_CORE:60,
  PD_TRAVERSE:0.9,PD_ON_TARGET:0.08,PD_RETARGET:2,PD_LAG:0.4,PD_SPREAD_BASE:0.02,PD_TRANSV_K:0.25,PD_SPREAD_MAX:0.35,PD_ARC:3.49,
  INTIM_STANDOFF:600,EXEC_STALL:90,POD_CAPTURE_R:2500,
  // feedback 2, L2: a retreating ship keeps this share of a hostile's push, and only sideways; a ship fights back at
  // whoever hit it in the last DEFEND_HIT seconds, or has guns on it
  RETREAT_SIDE:0.5,DEFEND_HIT:2,JUMP35_R:1000,IDLE_LOOK:5};   // and the jump point's reach: a fighter flying home at full speed turns wider than High Command's 350
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
  DISTRESS_SECS:['Distress call (s)',1,90,1,'Phases'],RESPONSE_SECS:['Response clock (s)',10,600,5,'Phases'],QUICK_SPOOL:['Quick Jumper spool (s)',5,180,5,'Phases'],
  COMMS_OFF:['Comms delay off (1 = off)',0,1,1,'Comms'],COMMS_BASE:['Comms: base delay (s)',0,10,0.5,'Comms'],COMMS_SPD:['Comms: speed (units a second)',500,20000,100,'Comms'],
  ACK_GREEN:['Ack: green leader (s)',0,5,0.1,'Comms'],ACK_REG:['Ack: regular leader (s)',0,5,0.1,'Comms'],ACK_VET:['Ack: veteran leader (s)',0,5,0.1,'Comms'],ION_K:['Ion Storm × delay',1,4,0.1,'Comms'],ARRIVE_SPOOL:['An asset\'s arrival (s)',0,20,0.5,'Comms'],
  CP1:['CP in Phase 1',0,9,1,'Powers'],CP2:['CP in Phase 2',0,9,1,'Powers'],CP3:['CP in Phase 3',0,9,1,'Powers'],
  C_BROADCAST:['Cost: Firebrand Broadcast',0,5,1,'Powers'],C_NAME:['Cost: Call a Pilot by Name',0,5,1,'Powers'],C_MARK:['Cost: Mark Priority Target',0,5,1,'Powers'],C_EXEC:['Cost: Change Executive Order',0,5,1,'Powers'],C_INSIST:['Cost: Insist',0,5,1,'Powers'],
  C_RESERVE:['Cost: Call the Reserves',0,5,1,'Powers'],C_RAM:['Cost: Launch the Ram',0,5,1,'Powers'],C_FIRE:['Cost: Light the Fire Ship',0,5,1,'Powers'],C_MINES:['Cost: Detonate the Minefield',0,5,1,'Powers'],C_BUOY:['Cost: Raise the Interdictor',0,5,1,'Powers'],
  C_TUG:['Cost: Send the Tug',0,5,1,'Powers'],C_SPOOF:['Cost: Spoof Orders',0,5,1,'Powers'],C_PIRATES:['Cost: Call the Pirates',0,5,1,'Powers'],C_SLEEPER:['Cost: Wake the Sleeper',0,5,1,'Powers'],
  BROADCAST_NERVE:['Broadcast: nerve',0,60,1,'Powers'],BROADCAST_RES:['Broadcast: crew resolve lost',0,60,1,'Powers'],REFUSE_P:['A shaken pilot refuses (chance)',0,1,0.05,'Powers'],MARK_SECS:['Marked target: focus (s)',5,60,1,'Powers'],NEARLY:['"Nearly there" within',0,0.5,0.05,'Powers'],
  RAM_DMG:['Ram damage',20,400,10,'Powers'],RAM_LIFE:['Ram: seconds to hit',5,120,5,'Powers'],NUKE_R:['Nuclear blast reach',500,5000,100,'Powers'],NUKE_DMG:['Nuclear blast damage',20,400,10,'Powers'],
  FIRE_R:['Fire ship blast reach',300,4000,50,'Powers'],FIRE_DMG:['Fire ship blast damage',10,300,5,'Powers'],MINE_N:['Mines',1,16,1,'Powers'],MINE_RING:['Minefield ring',200,3000,50,'Powers'],MINE_R:['A mine\'s reach',100,2000,50,'Powers'],MINE_DMG:['A mine\'s damage',5,200,5,'Powers'],
  INTERDICT_R:['Interdictor reach',1000,10000,100,'Powers'],INTERDICT_SECS:['Interdictor (s)',5,120,5,'Powers'],SPOOF_SECS:['Spoofed orders (s)',5,90,1,'Powers'],
  PIRATE_N:['Pirates',1,6,1,'Powers'],PIRATE_GREED:['Pirates go for the cargo (chance)',0,1,0.05,'Powers'],PIRATE_SECS:['Pirates stay (s)',20,300,10,'Powers'],TUG_R:['Tug hooks on within',100,2000,50,'Powers'],
  REQ_OFF:['Requests off (1 = off)',0,1,1,'Requests'],REQ_AUTOSLOW:['Slow to 1× on a request (1 = on)',0,1,1,'Requests'],REQ_SECS:['A request waits (s)',3,40,1,'Requests'],REQ_OPEN:['Requests open at once',1,4,1,'Requests'],
  REQ_GAP:['Seconds between new requests',0,90,1,'Requests'],REQ_CAP:['Requests a mission',0,20,1,'Requests'],REQ_PEND:['A trigger waits to be asked (s)',0,30,1,'Requests'],
  HIT_REQ:['"I\'m hit" under (hull)',0.1,0.8,0.05,'Requests'],VOL_HULL:['Volunteers under (hull)',0.1,0.8,0.05,'Requests'],VOL_R:['Volunteer: target within',500,8000,100,'Requests'],RAM_K:['Volunteer ram × ram damage',0.5,4,0.1,'Requests'],CHASE_R:['"Permission to chase" within',500,8000,100,'Requests'],
  EJECT_P:['Ejects (chance)',0,1,0.05,'Requests'],EJECT_VET:['+ for a veteran',0,0.5,0.05,'Requests'],POD_SECS:['A pod drifts (s)',5,120,1,'Requests'],POD_R:['A pod is picked up within',50,1500,25,'Requests'],
  CAP_TURN:['Freighter turn (rad/s)',0.005,0.3,0.005,'Freighter'],CAP_TURN_ALARM:['Freighter turn, alarmed (rad/s)',0.005,0.3,0.005,'Freighter'],CAP_REALIGN:['Freighter back on course (s)',0.5,20,0.5,'Freighter'],
  DOCK_STAGE:['Boarding: staging point out',100,2000,50,'Freighter'],DOCK_SPD:['Boarding: final leg × cruise',0.05,1,0.05,'Freighter'],DOCK_SNAP:['Boarding: clamps on within',20,300,5,'Freighter'],
  RAM_SPD:['Ram speed × a Talon\'s',0.5,3,0.05,'Powers'],RAM_HULL:['Ram hull',10,400,10,'Powers'],RAM_ARM:['Ram armour',0,200,5,'Powers'],RAM_CORE:['Ram damage to the core',0,300,5,'Powers'],
  PD_TRAVERSE:['Turret traverse (rad/s)',0.1,5,0.05,'Freighter'],PD_ON_TARGET:['Turret fires within (rad)',0.01,0.5,0.01,'Freighter'],PD_RETARGET:['Turret retargets every (s)',0.2,10,0.1,'Freighter'],
  PD_LAG:['Turret lead from (s ago)',0,2,0.05,'Freighter'],PD_SPREAD_BASE:['Turret spread at rest',0,0.2,0.005,'Freighter'],PD_TRANSV_K:['Turret spread × crossing speed',0,5,0.05,'Freighter'],PD_SPREAD_MAX:['Turret spread, most',0.02,1,0.01,'Freighter'],PD_ARC:['A turret pair\'s arc (rad)',0.5,6.28,0.05,'Freighter'],
  INTIM_STANDOFF:['Intimidate: standoff off the hull',100,3000,50,'Freighter'],EXEC_STALL:['Stuck guard: no progress for (s)',20,300,5,'Requests'],POD_CAPTURE_R:['A pod left at the end is captured within',0,8000,100,'Requests'],
  RETREAT_SIDE:['Retreat: share of a hostile\'s push kept (sideways)',0,1.6,0.05,'Wings'],DEFEND_HIT:['Fights back at a hit this recent (s)',0,10,0.5,'Wings'],JUMP35_R:['Jump point radius',300,3000,50,'Wings'],IDLE_LOOK:['A holding leader looks for work every (s)',1,60,1,'Wings']};
for(const k in NUM35){const [label,min,max,step,group]=NUM35[k];T35[k]={get:()=>N[k],set:v=>{N[k]=v;},min,max,step,label,group};}
const GROUPS35=['Opportunity','Freighter','Phases','Comms','Powers','Requests','Wings'];

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
    weapon_slots:0,hard_points:0,default_weapon_1:null,default_weapon_2:null,legacy_keys:'fl400',hitK:2.4,capital:true,special_rules:'',description:'',notes:'Type 3.5 placeholder'},
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
/* the rewards (feedback 2, §1.1) are a first pass for the demo: what the primary pays, per container or kill where it
   counts them, and the Accomplished bonus for doing the primary you picked rather than a fallback. placeholder */
const PRIMARIES={
  steal:{family:'Take it',name:'Steal',wins:'Disable it, board it, and fly the prize out through our jump point.',needs:['bombs','board'],loot:'Every surviving container and the ship',
    reward:{base:{c:250,m:120},per:{s:25},perText:'a container aboard',bonus:{c:200}}},
  pirate:{family:'Take it',name:'Pirate',wins:'Break the crew\'s nerve, accept their surrender, and hold by them while they hand it over.',needs:[],loot:'Most of the surviving cargo',
    reward:{base:{c:150},per:{s:30},perText:'a container handed over',bonus:{c:150}}},
  strip:{family:'Take it',name:'Strip the Cargo',wins:'Disable it and haul at least one container home.',needs:['bombs','pods'],loot:'The containers hauled out',
    reward:{base:null,per:{s:40},perText:'a container hauled home',bonus:{c:100}}},
  destroy:{family:'Deny it',name:'Destroy',wins:'The freighter dies.',needs:[],loot:'None',
    reward:{base:{c:300},bonus:{c:100}}},
  crash:{family:'Deny it',name:'Crash',wins:'Disable it inside the planet\'s pull: it falls in.',needs:['bombs'],loot:'None',
    reward:{base:{c:300,i:2},bonus:{c:200}}},
  tag:{family:'Use it',name:'Tag and Track',wins:'Plant a tracker unseen, then let it jump out alive.',needs:['tagger'],loot:'A follow-up lead',
    reward:{base:{i:4},extra:'a follow-up lead',bonus:{c:150}}},
  ambush:{family:'Bait with it',name:'Ambush the Responders',wins:'Destroy three of the Hegemony response.',needs:['notRemote'],loot:'Response kills',
    reward:{base:{c:100},per:{c:60},perText:'a response kill',bonus:{c:150}}},
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
/* where a placed asset starts in step 4 (layout units), until you drag it */
const ASSET_AT={ram:{x:2000,y:1900},nuke:{x:2000,y:1900},fireship:{x:4700,y:2600},mines:{x:5700,y:2400},buoy:{x:6700,y:2150},relay:{x:1500,y:1900}};
const assetAt=(plan,k)=>plan.assetAt&&plan.assetAt[k]||ASSET_AT[k]||null;
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
  overwatch:{name:'Overwatch',target:null,hidden:true},   // Pirate's transfer (§3.11): given by the layer, not in the briefing
};
const ORDER35_KEYS=Object.keys(ORDERS35).filter(k=>!ORDERS35[k].hidden);
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
  const wings=[],reserves=[];
  for(const w of WINGS35){
    const pw=plan.wings[w.id];if(!pw||pw.role==='home')continue;
    const ji=pw.jumpIn||opp.jumpIn,face=Math.atan2(lane[1][1]-ji.y,lane[1][0]-ji.x);
    (pw.role==='strike'?wings:reserves).push({id:w.id,name:w.name,at:[ji.x,ji.y,face],leader:w.ships[0].id,order:execToHc(pw.exec,plan),tactic:'auto',
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
    hc35plan:{opp:opp.id,mods:mods.map(x=>Object.assign({},x)),plan:JSON.parse(JSON.stringify(plan)),seed,lane,reserves}};   // reserves: in layout units, scaled when called
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
   The leaders' proposed plans (§4.4): picking a primary fills the plan with these (placeholder judgement)
   wing: [exec, second (trigger + order) or null]; lo: Brickbat loadouts; roes / optionals / assets suggested
   ===================================================================== */
const FAR_HOLD={x:1400,y:1100},EDGE_AMBUSH={x:6900,y:700};   // layout units: holding far back; lying in wait by the response's edge
const LEADER_PLANS={
  steal:{dagger:[{k:'defend',arg:'anvil'},{trig:'phase3',k:'escort'}],anvil:[{k:'disable',arg:'engines'},{trig:'done',k:'suppress',arg:'turrets'}],amber:[{k:'board'},{trig:'done',k:'escort'}],
    lo:{brask:'bombs',ollo:'bombs',mags:'board'},roes:['tight']},
  pirate:{dagger:[{k:'intimidate'},{trig:'bigger',k:'suppress',arg:'escorts'}],anvil:[{k:'defend',arg:'amber'},null],amber:[{k:'intimidate'},null],roes:['tight']},
  strip:{dagger:[{k:'suppress',arg:'escorts'},{trig:'phase3',k:'defend',arg:'anvil'}],anvil:[{k:'disable',arg:'engines'},{trig:'done',k:'haul'}],amber:[{k:'haul'},null],
    lo:{brask:'bombs',ollo:'pods',mags:'pods'},roes:['jumpdone']},
  destroy:{dagger:[{k:'defend',arg:'anvil'},null],anvil:[{k:'destroy'},null],amber:[{k:'suppress',arg:'turrets'},{trig:'done',k:'destroy'}],lo:{brask:'bombs',ollo:'bombs',mags:'bombs'}},
  crash:{dagger:[{k:'suppress',arg:'escorts'},null],anvil:[{k:'disable',arg:'engines'},null],amber:[{k:'defend',arg:'anvil'},null],roes:['signal']},
  tag:{dagger:[{k:'hold',arg:FAR_HOLD},{trig:'phase2',k:'withdraw'}],anvil:null,amber:[{k:'tag'},null],tagger:'kit',optionals:['ghost']},
  ambush:{dagger:[{k:'ambush',arg:EDGE_AMBUSH},null],anvil:[{k:'disable',arg:'engines'},null],amber:[{k:'ambush',arg:EDGE_AMBUSH},null],assets:['mines']},
};
/* the plan the leaders propose for a primary: the roles, orders and loadouts filled in; the jump-ins and assets kept */
function leaderPlan(prim,keep){
  const P=Object.assign(defaultPlan(OPPORTUNITIES.vulnerable_freighter),keep?{assets:keep.assets.slice(),assetAt:Object.assign({},keep.assetAt),presHull:keep.presHull}:{});
  P.primary=prim;const T=LEADER_PLANS[prim];if(!T)return P;
  for(const w of WINGS35){const pw=P.wings[w.id],t=T[w.id];if(keep&&keep.wings[w.id])pw.jumpIn=Object.assign({},keep.wings[w.id].jumpIn);
    if(!t){pw.role='home';continue;}pw.role='strike';pw.exec=Object.assign({},t[0]);pw.second=t[1]?Object.assign({},t[1]):null;}
  for(const sid in T.lo||{})for(const w of WINGS35)if(sid in P.wings[w.id].loadout)P.wings[w.id].loadout[sid]=T.lo[sid];
  P.roes=(T.roes||[]).slice();P.optionals=(T.optionals||[]).map(k=>({k,ship:null}));P.tagger=T.tagger||null;
  if(T.assets&&!(keep&&keep.assets.length))for(const a of T.assets)if(P.assets.length<ASSET_SLOTS&&!P.assets.includes(a))P.assets.push(a);
  return P;
}
/* the leader's one-line take on the plan (§4.4): the first critique rule that applies, else their personality */
function critique(plan,wid,mods,ctx){
  const w=WINGS35.find(x=>x.id===wid),pw=plan.wings[wid];if(!w||!pw)return '';
  if(pw.role==='home')return 'We\'ll sit this one out, Base.';
  if(pw.role==='reserve')return 'Standing by. Call us when you need us.';
  const ex=pw.exec||{},has=planHas(plan),lo=w.ships.filter(s=>s.cls==='brickbat').map(s=>pw.loadout[s.id]||'bombs');
  if((ex.k==='disable'||(ex.k==='destroy'&&plan.primary!=='ambush'))&&!lo.includes('bombs')&&!has.bombs)return 'We can\'t crack that hull with repeaters, Base.';
  if(ex.k==='disable'&&!lo.includes('bombs'))return 'We can\'t crack that hull with repeaters, Base.';
  if(ex.k==='board'&&!lo.includes('board'))return 'Nobody here to board her, Base.';
  if(lo.includes('board')&&!WINGS35.some(o=>plan.wings[o.id].role!=='home'&&plan.wings[o.id].exec&&plan.wings[o.id].exec.k==='disable'))return 'Who\'s stopping it so we can get aboard?';
  if(ex.k==='haul'&&!lo.includes('pods'))return 'We\'ve nowhere to put the cargo.';
  if(w.ships.some(s=>s.cls==='brickbat')&&!WINGS35.some(o=>o.id!==wid&&plan.wings[o.id].role!=='home'&&plan.wings[o.id].exec&&plan.wings[o.id].exec.k==='defend'&&plan.wings[o.id].exec.arg===wid))return 'Nobody\'s watching our backs out there.';
  if(ctx&&ctx.inRing&&ctx.inRing(pw.jumpIn))return 'They\'ll see us the second we drop in.';
  if(ctx&&ctx.unreachable&&ctx.unreachable(wid))return 'We\'ll never catch it from there.';
  if(plan.roes.includes('signal')&&!['hold','ambush','withdraw','defend','escort'].includes(ex.k))return 'Waiting on your word, Base. Don\'t leave us hanging.';
  const per=F.personalityOf(F.presetPilot(w.ships[0].pilot,w.ships[0].name));
  return per==='eager'?'Let\'s go.':per==='steady'?'Sound plan.':'If you say so.';
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
const FL_UNIT=()=>(0.7+0.09*5)*1.6*0.85*1.35*(SA&&SA.sizeK?Math.round(SA.sizeK('gafreighter')*1e9)/1e9:1);   // the art's size, rounded so an engine's last bit can't reach the sim
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
    fjump:W(X.lane[X.lane.length-1]),relay:(()=>{const r=X.plan.assets.includes('relay')?assetAt(X.plan,'relay'):opp.relay;return W([r.x,r.y]);})(),   // the transmission origin
    phase:1,phaseT:[0,null,null],detect:0,alarm:false,alarmWhy:null,
    fr:'fl400',primK:X.plan.primary,fallback:null,spool:null,spoolWhy:null,escaped:false,ended:false,disabled:false,drift:null,crashed:false,deadT:null,cause:[],m:{},prim:S.objectives[0],
    planet:{x:opp.planet.x*k+Z.x0,y:opp.planet.y*k+Z.y0,r:opp.planet.r*k,pull:opp.planet.pull*k},
    subs:makeSubs(m('guns')),bombs:[],pdK:m('guns')?{dmg:2,rng:1.5}:{dmg:1,rng:1},gunsShown:false,
    resolve:m('demoralised')?40:N.RESOLVE_START,surrender:null,transfer:0,
    board:0,boardT0:null,scuttleT:null,boarded:false,prize:false,hauled:0,hauledLost:0,
    tag:{ship:X.plan.tagger,prog:0,planted:false},respKills:0,
    distress:null,responseAt:null,responded:false,exec:{},resHitT:{},escN:0,
    signal:!X.plan.roes.includes('signal'),signalT:null,sec:{},n0:{},off:{},offSecs:{},secLog:[],opt:X.plan.optionals.map(o=>({k:o.k,ship:o.ship,state:'live'})),
    roe:k=>X.plan.roes.includes(k),briefedEsc:0,biggerT:null,stayIn:{},checkT:0,
    // P4: command points, transmissions in flight, arrivals, the powers' effects
    cp:N.CP1,tx:[],txN:0,arrivals:[],powLog:[],used:{},sigW:{},dec:[],idleT:{},markW:{},focus:{},pull:{},pushback:null,called:{},
    interdict:null,abort:false,exposure:false,burned:false,beacon:true,pirated:0,props:{},
    // P5: requests, pods, and the overrides their answers set
    req:{open:[],log:[],pend:[],seen:{},n:0,lastT:-1e9,applied:[]},pods:[],vol:{},fetch:{},holdUntil:{},divert:{},rookie:null,scuttleOut:false,
    // P6: the cause log's context: deaths with what was going on, every Executive seen, what each power did, who said stay
    deaths:[],execSeen:{},arrayT:0,powRes:[],stayBy:{}};
  for(const wid in X.plan.wings){const pw=X.plan.wings[wid];L.exec[wid]=pw.exec?Object.assign({},pw.exec):null;L.sec[wid]=pw.second&&pw.second.trig?Object.assign({fired:false,noted:false,adopted:false},pw.second):null;}
  for(const w of S.wings){L.n0[w.id]=w.ships.length;L.offSecs[w.id]=0;w.rally={x:w.ships.map(F.byId).reduce((a,s)=>a+s.x,0)/w.ships.length,y:w.ships.map(F.byId).reduce((a,s)=>a+s.y,0)/w.ships.length};}
  const fr=FR();
  if(fr){fr.role35='freighter';fr.home=null;
    const len=L.lane.reduce((a,p,i)=>i?a+dist(p,L.lane[i-1]):0,0);L.cruise=len/FREIGHTER_SECS;   // world units a second
    if(m('limping'))L.cruise*=0.6;
    fr.vx=Math.cos(fr.h)*L.cruise;fr.vy=Math.sin(fr.h)*L.cruise;fr.subs35=L.subs;
    fr.abCd={};for(const a of Object.keys(SIM.ABILITIES))fr.abCd[a]=1e9;fr.chaffLeft=0;}   // a freighter has no pilot's tricks
  for(const e of R.enemies)if(e.role==='guard'&&e.asset==='fl400'){const s=F.byId(e.id);if(s){s.role35='escort';s.side35=e.side||0;}}
  L.escN=S.ships.filter(s=>s.role35==='escort').length;L.escN0=L.escN;
  // the escort the Source briefed: what you'd expect without the hidden Heavy Escort or Ace Escort
  L.briefedEsc=L.escN-(modOn(L.mods,'heavy')&&!known(L.mods.find(x=>x.k==='heavy'))?L.escN/2:0)-(modOn(L.mods,'ace')&&!known(L.mods.find(x=>x.k==='ace'))?1:0);
  for(const s of S.ships)if(s.faction==='reb'&&!s.struct){const sd=findShipDef(s.id);s.load35=sd&&sd.load35||null;if(s.load35==='bombs')s.bombs=N.BOMB_N;if(s.load35==='pods')s.pods=[];}
  // the placed assets that sit on the map from the start: the fire ship, the minefield, the buoy
  for(const k of ['fireship','mines','buoy'])if(X.plan.assets.includes(k)){const a=assetAt(X.plan,k),p=W([a.x,a.y]);L.props[k]=Object.assign({k,live:true},p);
    if(k==='mines'){L.props.mines.pts=[];for(let i=0;i<N.MINE_N;i++){const t=i/N.MINE_N*Math.PI*2;L.props.mines.pts.push({x:p.x+Math.cos(t)*N.MINE_RING,y:p.y+Math.sin(t)*N.MINE_RING});}}}
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
  HK.canJump=s=>live()?canJump(s):true;
  HK.noCollide=(a,b)=>live()&&(exempt(a,b)||exempt(b,a));
  HK.noAvoid=(s,o)=>live()&&exempt(s,o);
  HK.assess=s=>live()&&LAYER_KINDS.has(s.beh&&s.beh.kind)?verbOf(s).words+'.':null;   // the pilot's line for a 3.5 job (§3.4)
  HK.floater=(s,text,kind)=>!live()||kind==='dmg';   // 3.5 floats no words (the callouts carry what matters, §3.3); damage numbers only if the panel asks
  HK.noSep=s=>live()&&(!!s.dock35||(s.beh&&s.beh.kind==='dock35'&&s.dockLeg==='final'));   // its escort's spacing mustn't herd a docking ship off
  HK.jumpR=()=>live()?N.JUMP35_R:null;
  HK.disengage=s=>live()&&s.faction==='reb'&&s.beh&&s.beh.kind==='withdraw'?N.RETREAT_SIDE:0;   // a retreat stays pointed home (feedback 2, §3.2)
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
  if(!L.ramNow&&(sb.k==='engines'||sb.k==='comms'||sb.k==='pd'))callout((sb.k==='pd'?'TURRET':sb.k.toUpperCase())+' DOWN','good',p,{feed:false});   // §3.4 (the ram names its own)
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
  if(s.faction!=='reb')return true;
  if(s.prop35==='ram'||s.prop35==='tug')return false;
  if(t.id===L.fr&&(s.load35==='board'||s.load35==='pods'||s.dock35))return false;   // boarders and haulers never shoot the freighter (§3.2)
  if(L.rookie&&s.id===L.rookie.leader&&t.id===L.rookie.target&&SIM.S.t<L.rookie.until)return false;   // Blood the Rookie: Let her
  if(s.wing&&!signalled(s.wing)&&!(SIM.S.t-s.hitT<3))return false;   // Hold for My Signal (unless fired on)
  if(t.id===L.fr&&L.roe('tight')&&!['engines','comms','turrets'].includes(s.sub35))return false;   // Weapons Tight: engines, comms, turrets only
  if(t.id===L.fr&&(L.roe('tight')||(s.beh&&s.beh.kind==='intim'))&&s.sub35&&s.sub35!=='core'&&!subUp(s.sub35))return false;   // its subsystem's down: a hit would go to the hull (§3.11)
  if(L.opt.some(o=>o.k==='bloodless')&&t.id!==L.fr&&t.hull/t.maxHull<0.3)return false;   // Bloodless: wound, don't kill (the primary comes first)
  return true;
}

/* ---------- thinking: the freighter and its escorts here; your wings by their Executive Orders ---------- */
function think(s){
  if(s.prop35)return thinkProp(s);
  if(s.towed35)return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:'under tow',hard:true});
  if(s.faction==='heg'&&s.spoof35!=null&&SIM.S.t<s.spoof35)return setB(s,{kind:'waitpt',dest:s.spoofTo,why:'following spoofed orders'});
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
  const S=SIM.S,w=F.wingOf(s.wing),fr=FR();
  if(s.dock35)return setB(s,{kind:'docked',why:s.load35==='board'?'boarding':'hauling cargo',hard:true});
  let ex=L.exec[s.wing];
  if(!ex||!w)return false;
  // a retreat, or a wing ordered home, outranks the plan and High Command's own ladder: straight for the jump point,
  // dodging sideways but never turning back to fight (feedback 2, §3.2). Only a panicking pilot is beyond it
  if((L.retreat||ex.k==='withdraw')&&!s.panic)return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:L.retreat?'retreating':'heading home',rule:'home35',hard:true});
  // a pod ship with containers aboard takes them home once it's full or its haul is over
  if(s.pods&&s.pods.length&&(ex.k!=='haul'||s.pods.length>=N.POD_CAP))return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:'carrying '+s.pods.length+' home',hard:true});
  if(s.recall||s.panic||(s.beh&&s.beh.rule&&!/35$/.test(s.beh.rule)))return false;   // High Command's own ladder outranks the plan
  // a volunteer's ram; a Brickbat picking up a pod; a wing holding for the reserves (request answers)
  if(L.vol[s.id]){const t=F.byId(L.vol[s.id].id);if(t&&t.alive)return setB(s,{kind:'ram35',target:t.id,why:'putting her into it',rule:'vol35',hard:true});}
  if(L.fetch[s.id]){const p=L.pods.find(x=>x.id===L.fetch[s.id]);if(p&&p.state==='drift')return setB(s,{kind:'fetch35',dest:{x:p.x,y:p.y},why:'picking up '+p.name,rule:'fetch35',hard:true});delete L.fetch[s.id];}
  if(L.holdUntil[s.wing]&&S.t<L.holdUntil[s.wing]&&!(S.t-s.hitT<3))return setB(s,{kind:'waitpt',dest:w.rally||F.wingCentre(w),why:'holding for the reserves',rule:'hold35'});
  // Call a Pilot by Name: Pull out
  if(L.pull[s.id])return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:'Base called me out',rule:'pull35',hard:true});
  // Preservation Order: under its hull threshold a ship withdraws and jumps out (a pilot you told to stay in, stays)
  const asking=L.req.open.some(q=>q.k==='hit'&&q.who===s.id&&q.state!=='done');   // they asked to stay in: Preservation waits for your answer
  if(L.roe('preservation')&&s.hull/s.maxHull<L.plan.presHull&&!L.stayIn[s.id]&&!asking)return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:'Preservation Order',rule:'preservation35',hard:true});
  // the protected ship comes home before it's lost (Protect at all costs)
  const pro=L.opt.find(o=>o.k==='protect'&&o.ship===s.id);if(pro&&s.hull/s.maxHull<0.5)return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:'protected: pulling out',rule:'protect35',hard:true});
  // Hold for My Signal: in position and waiting; nobody fires (canFire) until it lands, or until fired on
  // (fired on, the leader doesn't wait for it: the wing goes, for good; spotted, every wing goes: alarm)
  if(!signalled(s.wing)){if(S.t-s.hitT<3)release(s.wing,'fired');else{const r=w.rally||F.wingCentre(w);return setB(s,{kind:'waitpt',dest:r,why:'waiting for your signal'});}}
  // Call a Pilot by Name: Focus [target]; Mark Priority Target: a wing with no Executive work goes for it
  const fo=L.focus[s.id];
  if(fo){const t=F.byId(fo.id);if(t&&t.alive&&!(t.id===L.fr&&(L.prize||L.surrender))){s.sub35=fo.sub||(s.load35==='bombs'?'core':null);return setB(s,{kind:'engage',target:t.id,why:'Base named my target',hard:true});}delete L.focus[s.id];}
  const mk=L.markW[s.wing];
  if(mk&&S.t<mk.until&&execState(s.wing)!=='busy'){const t=F.byId(mk.id);if(t&&t.alive&&!(t.id===L.fr&&(L.prize||L.surrender||s.load35==='board'||s.load35==='pods'))){s.sub35=mk.sub||(s.load35==='bombs'?'core':null);return setB(s,{kind:'engage',target:t.id,why:'the marked target'});}}
  // a Boarding party or Cargo pods: the loadout decides, whatever the wing's Executive (§3.2)
  if((s.load35==='board'||s.load35==='pods')&&fr&&fr.alive&&!L.prize){
    const spec=s.load35,can=(L.disabled||L.surrender)&&(spec==='board'?!L.boarded&&!L.scuttleOut:cargoLeft()>0&&(s.pods?s.pods.length:0)<N.POD_CAP);
    if(can)return setB(s,{kind:'dock35',why:spec==='board'?'closing to board':'closing to haul'});
    if(defend(s))return true;
    if(ex.k==='defend'){const ow=F.wingOf(ex.arg),ls=ow?F.wingShips(ow):[];if(ls.length)return setB(s,{kind:'escort',charge:(ls.find(x=>x.id===ow.leader)||ls[0]).id,why:'covering '+ow.name});}
    s.dockLeg=null;return setB(s,{kind:'holdoff',why:spec==='board'?'waiting to board':'waiting to haul'});
  }
  // Whale Hunt: once the freighter is disabled, everyone with nothing better to do goes for it
  if(L.roe('whale')&&L.disabled&&fr&&fr.alive&&!L.prize&&execState(s.wing)!=='busy'){w.order={kind:'attack',target:{type:'ship',id:L.fr}};s.sub35=s.load35==='bombs'?'core':null;return false;}
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
        if(ex.k==='board'&&L.scuttleOut)return holdBy(s,w);
        if(L.disabled||L.surrender)return setB(s,{kind:'dock35',why:ex.k==='board'?'closing to board':'closing to haul'});
        if(defend(s))return true;
        return setB(s,{kind:'holdoff',why:'waiting for the engines to go'});}
      // the rest of the wing covers its specialists
      const sp=F.wingShips(w).find(x=>x.load35===spec&&x!==s);
      if(sp){const th=nearestFoe(sp,x=>x.id!==L.fr&&dist(x,sp)<4000);if(th)return setB(s,{kind:'engage',target:th.id,why:'covering '+sp.name});
        if(sp.dock35||(sp.beh&&sp.beh.kind==='dock35'))return setB(s,{kind:'holdoff',cover:sp.id,why:'covering '+sp.name});   // standing off while it docks: close cover crowds it into the hull
        return setB(s,{kind:'escort',charge:sp.id,why:'covering '+sp.name});}
      w.order={kind:'attack',target:{type:'ship',id:L.fr}};s.sub35='turrets';return false;}
    case 'intimidate':{
      if(!frLive)return holdBy(s,w);
      const e=nearestFoe(s,x=>x.role35==='escort'&&dist(x,fr)<5000);
      if(e&&dist(e,s)<4000)return setB(s,{kind:'engage',target:e.id,why:'clearing the escort'});
      if(defend(s))return true;
      s.sub35='turrets';return setB(s,{kind:'intim',why:'guns on its turrets'});}
    case 'tag':{
      if(!frLive)return holdBy(s,w);
      const tg=L.tag.ship||w.ships[w.ships.length-1];
      if(s.id===tg&&!L.tag.planted)return setB(s,{kind:'tag',why:'closing to plant the tracker'});
      if(defend(s))return true;
      return setB(s,{kind:'far',dest:farPoint(s),why:'keeping out of sight'});}
    case 'ambush':case 'hold':{
      const p=ex.arg&&ex.arg.x!=null?L.W([ex.arg.x,ex.arg.y]):ex.k==='ambush'?ambushPoint():w.rally||F.wingCentre(w);
      const e=nearestFoe(s,x=>!x.struct&&x.role35!=='freighter'&&dist(x,p)<HOLD35_R);
      if(e)return setB(s,{kind:'engage',target:e.id,why:ex.k==='ambush'?'springing the ambush':'holding'});
      if(defend(s))return true;
      return setB(s,{kind:'waitpt',dest:p,why:ex.k==='ambush'?'lying in wait':'holding'});}
    case 'defend':{const ow=F.wingOf(ex.arg),ls=ow?F.wingShips(ow):[];if(!ls.length)return holdBy(s,w);w.order={kind:'escort',target:{type:'ship',id:(ls.find(x=>x.id===ow.leader)||ls[0]).id}};return false;}
    case 'escort':if(!fr||!fr.alive)return holdBy(s,w);w.order={kind:'escort',target:{type:'ship',id:L.fr}};return false;
    case 'withdraw':w.order={kind:'withdraw'};return false;
    case 'overwatch':{if(!frLive||L.transferred)return holdBy(s,w);   // inside the transfer ring, guns on anything that comes
      const e=nearestFoe(s,x=>!x.struct&&x.id!==L.fr&&dist(x,fr)<N.TRANSFER_R*2);if(e)return setB(s,{kind:'engage',target:e.id,why:'guarding the transfer'});
      return setB(s,{kind:'overwatch35',why:'standing guard for the transfer'});}
  }
  return false;
}
const HOLD35_R=3500;   // a holding or ambushing wing takes on what comes this close to its point. placeholder
function holdBy(s,w){
  if(defend(s))return true;
  const e=nearestFoe(s,x=>!x.struct&&x.id!==L.fr&&dist(x,s)<HOLD35_R);   // holding, it takes on what comes close (feedback 2, §3.1)
  if(e)return setB(s,{kind:'engage',target:e.id,why:'taking on what comes close'});
  return setB(s,{kind:'waitpt',dest:w.rally||F.wingCentre(w),why:'nothing to do: holding'});
}
/* a wing its leader put on Hold looks for work every IDLE_LOOK seconds (a Hold you gave stays a Hold) */
function idleTick(){
  const S=SIM.S;
  for(const w of fieldWings()){const ex=L.exec[w.id];if(!ex||ex.k!=='hold'||!ex.idle)continue;
    if(S.t-(L.idleT[w.id]||0)<N.IDLE_LOOK)continue;L.idleT[w.id]=S.t;const work=findWork(w);if(work)retask(w,work,'found work while holding');}
}
/* self-defence (feedback 2, §3.1): a ship waiting, holding off or keeping its distance turns on whoever is shooting at
   it (the one that just hit it, else the nearest with guns on it in range), without being told. The freighter's point
   defence isn't a dogfight: that's the plan's business */
function attackerOf(s){
  const S=SIM.S;
  if(s.lastHitBy&&S.t-s.hitT<N.DEFEND_HIT){const x=F.byId(s.lastHitBy);if(x&&x.alive&&!x.struct&&x.id!==L.fr&&x.faction!==s.faction)return x;}
  let b=null,bd=1e18;for(const x of F.pinnedBy(s)){if(x.id===L.fr)continue;const d=dist(s,x);if(d<bd){bd=d;b=x;}}
  return b;
}
function defend(s){const a=attackerOf(s);return a?setB(s,{kind:'engage',target:a.id,why:'self-defence'}):false;}
function nearestFoe(s,f){let b=null,bd=1e18;for(const t of SIM.S.ships){if(!t.alive||t.faction===s.faction||t.struct||t.quiet||(f&&!f(t)))continue;const d=dist(s,t);if(d<bd){bd=d;b=t;}}return b;}
function farPoint(s){const fr=FR();if(!fr)return {x:s.x,y:s.y};const a=Math.atan2(s.y-fr.y,s.x-fr.x);return {x:fr.x+Math.cos(a)*7000,y:fr.y+Math.sin(a)*7000};}
function ambushPoint(){const Z=SIM.zone;return {x:L.fjump.x,y:Z.y0+1800};}
/* the side of the freighter a ship is on: +1 left of its heading, −1 right (the sign of the cross product, §3.2) */
const sideOf=(fr,s)=>Math.cos(fr.h)*(s.y-fr.y)-Math.sin(fr.h)*(s.x-fr.x)>=0?1:-1;
/* where a boarder or hauler clamps on: on the side it came from, at the hull's edge (the sim's true outline) plus 0.6 ×
   its own size, alongside the spine; and its staging point DOCK_STAGE out from there */
function dockPoint(fr,s){
  const side=s.dockSide||sideOf(fr,s),u=FL_UNIT(),c=Math.cos(fr.h),sn=Math.sin(fr.h),ox=(s.load35==='board'?-8:10)*u,oy=side*(F.hullAxes(fr).b+0.6*F.bodyR(s));
  return {x:fr.x+ox*c-oy*sn,y:fr.y+ox*sn+oy*c,side,nx:-sn*side,ny:c*side,h:fr.h};
}
const stagePoint=(fr,s)=>{const d=dockPoint(fr,s);return {x:d.x+d.nx*N.DOCK_STAGE,y:d.y+d.ny*N.DOCK_STAGE};};
/* a boarder on its final leg (or docked), and a ram, don't dodge or bounce off the ship they're going for (§3.2) */
function exempt(s,o){
  if(o.id!==L.fr&&!(s.ram35&&o.id===s.ram35.id))return false;
  if(s.dock35)return true;
  if(s.beh&&s.beh.kind==='dock35'&&s.dockLeg==='final')return true;
  if(s.beh&&s.beh.kind==='ram35'&&s.beh.target===o.id)return true;
  return false;
}
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
  if((s.prop35||L.vol[s.id])&&(b.kind==='ram35'||b.kind==='tug35'||b.kind==='leave35'))return propGoal(s,b);
  if(b.kind==='fetch35'){s.holdFire=false;return {x:b.dest.x,y:b.dest.y,spd:dist(s,b.dest)>1500?1:0.5};}
  if(b.kind==='docked'){const d=fr&&fr.alive?dockPoint(fr,s):s;s.holdFire=true;return {x:d.x+Math.cos(fr?fr.h:s.h)*400,y:d.y+Math.sin(fr?fr.h:s.h)*400,spd:0};}   // docked: holding fire
  if(b.kind==='dock35'&&fr){   // two legs: out to the staging point, then a slow final leg matching the freighter
    if(!s.dockSide)s.dockSide=sideOf(fr,s);
    if(s.dockLeg==='final'&&dist(s,dockPoint(fr,s))>N.DOCK_STAGE*1.6)s.dockLeg='stage';   // shoved or overshot: round again
    if(s.dockLeg!=='final'){const st=stagePoint(fr,s);if(dist(s,st)<350)s.dockLeg='final';else{s.dockLeg='stage';return {x:st.x,y:st.y,spd:1,noCorner:false};}}
    // the final leg: slow, matching the freighter; but a fighter barely turns that slow, so until it's lined up it turns
    // at its corner speed
    s.holdFire=true;const d=dockPoint(fr,s),c=F.capsOf(s),lead=0.6,fv=Math.hypot(fr.vx,fr.vy),gx=d.x+fr.vx*lead,gy=d.y+fr.vy*lead;
    const off=Math.abs(angNorm(Math.atan2(gy-s.y,gx-s.x)-s.vh)),slow=clamp((fv+N.DOCK_SPD*F.CRUISE_()*c.vMax)/c.vMax,0.05,1);
    return {x:gx,y:gy,spd:off>0.35&&dist(s,d)>N.DOCK_SNAP*1.5?Math.max(slow,c.vc/c.vMax):slow,noCorner:true};}
  if(b.kind==='holdoff'&&fr){   // holding off on its wing's side until the freighter can be boarded
    const w=F.wingOf(s.wing),wc=w?F.wingCentre(w):s,a=Math.atan2(wc.y-fr.y,wc.x-fr.x),p={x:fr.x+Math.cos(a)*N.HOLDOFF_R,y:fr.y+Math.sin(a)*N.HOLDOFF_R};
    s.holdFire=s.load35==='board'||s.load35==='pods';return Object.assign(F.orbitGoal(s,p,500),{spd:F.CRUISE_()});}
  // Intimidate fights at gun range (§3.11): the hull's half-length plus INTIM_STANDOFF, inside its guns' reach of the turrets
  if(b.kind==='intim'&&fr){s.fireAt=subUp('turrets')?fr.id:null;return Object.assign(F.orbitGoal(s,fr,F.hullAxes(fr).a+N.INTIM_STANDOFF),{spd:F.CORNER_?F.CORNER_():0.7,face:fr});}
  if(b.kind==='overwatch35'&&fr)return Object.assign(F.orbitGoal(s,fr,N.TRANSFER_R*0.6),{spd:F.CRUISE_()*0.7});
  if(b.kind==='tag'&&fr){s.holdFire=true;return dist(s,fr)>N.TAG_R*1.4?{x:fr.x,y:fr.y,spd:0.8}:Object.assign(F.orbitGoal(s,fr,N.TAG_R*0.6),{spd:0.5});}
  if(b.kind==='far'){s.holdFire=true;return Object.assign(F.orbitGoal(s,b.dest,WAIT_ORBIT),{spd:F.CRUISE_()*0.8});}
  if(b.kind==='waitpt')return Object.assign(F.orbitGoal(s,b.dest,WAIT_ORBIT),{spd:F.CRUISE_()*0.8});
  return null;
}
function alarm(why,text){
  if(L.alarm)return;
  L.alarm=true;L.alarmWhy=why;setPhase(2,text||'They know you\'re here');
  if(why!=='signal')for(const w of fieldWings())release(w.id,'spotted');   // seen, nobody waits for a signal (feedback 2, §3.1)
  // the distress call goes out if the comms array is alive
  if(subUp('comms')&&L.beacon){L.distress={t0:SIM.S.t,landed:false,cut:false};
    if(!L.opt.some(o=>o.k==='distress')&&!Object.values(L.exec).some(e=>e&&e.k==='disable'&&e.arg==='comms'))reqTrigger('distress',{},'once');}
  if(modOn(L.mods,'quick')&&!L.disabled){const fr=FR();if(fr){L.spool=SIM.S.t;L.spoolWhy='quick';L.spoolAt={x:fr.x,y:fr.y};SIM.pushEvent('fjump','The freighter is spooling a jump where it is',{x:fr.x,y:fr.y,tone:'hazard'});callout('JUMP SPOOLING','foe',fr,{feed:false});}}
}
function setPhase(n,text){
  if(L.phase>=n)return;
  L.phase=n;L.phaseT[n-1]=SIM.S.t;if(n===3&&L.phaseT[1]==null)L.phaseT[1]=SIM.S.t;
  L.cpLost=(L.cpLost||0)+L.cp;L.cp=N['CP'+n];   // a new phase, a fresh allowance: what was left is lost
  if(n===3)for(const w of SIM.S.wings)if(execState(w.id)==='busy')reqTrigger('phase3',{wid:w.id},w.id);
  SIM.pushEvent('phase','Phase '+n+': '+(n===2?'engaged':'response')+(text?' · '+text:''),{tone:'hazard'});
}
function responseSecs(){let t=N.RESPONSE_SECS;if(modOn(L.mods,'rich'))t*=0.75;if(modOn(L.mods,'rapid'))t*=0.5;return t;}
/* the response (Phase 3): warps in beyond the play area's edge, near the freighter's jump point */
function spawnResponse(){
  const S=SIM.S,Z=SIM.zone,R=L.opp.response,n=R.force.reduce((a,f)=>a+(f.n||1),0),grp=++S.grpN;let i=0;
  const cx=clamp(L.fjump.x,Z.x0+2000,Z.x1-2000);
  callout('RESPONSE INBOUND','foe',{x:cx,y:L.fjump.y});
  for(const f of R.force)for(let k=0;k<(f.n||1);k++){
    const at=R.edge==='N'?[cx+(i-(n-1)/2)*700,Z.y0-900,Math.PI/2]:[cx+(i-(n-1)/2)*700,Z.y1+900,-Math.PI/2];i++;
    const I=interdictOn();if(I&&dist(I,{x:at[0],y:at[1]})<N.INTERDICT_R){const a=Math.atan2(at[1]-I.y,at[0]-I.x)||-Math.PI/2;at[0]=I.x+Math.cos(a)*N.INTERDICT_R;at[1]=I.y+Math.sin(a)*N.INTERDICT_R;}   // dropped at the Interdictor's edge
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
  txTick();arrivalTick();propTick(dt);ramShotTick();volTick();ejectTick();podTick(dt);reqTick();calloutTick();
  if(L.interdict&&!L.interdict.over&&S.t>=L.interdict.until){L.interdict.over=true;SIM.pushEvent('power','The Interdictor is down',{x:L.interdict.x,y:L.interdict.y,tone:'info'});}
  vHistTick();pdTick(fr,dt);bombTick(fr,dt);dockTick(fr,dt);
  for(const s of S.ships)if(s.role35==='response'&&!s.alive&&!s.jumped)countKill(s);
  // escorts lost shake the crew
  const escN=S.ships.filter(s=>s.alive&&s.role35==='escort').length;if(escN<L.escN){L.resolve=Math.max(0,L.resolve-N.RES_ESCORT*(L.escN-escN));L.escN=escN;}
  // the crew's resolve: every rebel ship near takes a little; at 0 they offer to surrender (Pirate)
  if(fr&&fr.alive&&!L.surrender&&!L.prize){
    let n=0;for(const s of S.ships)if(s.alive&&s.faction==='reb'&&!s.struct&&!s.quiet&&dist(s,fr)<N.THREAT35_R)n++;
    const r0=L.resolve;L.resolve=Math.max(0,L.resolve-n*N.RES_THREAT*dt);L.resMin=Math.min(L.resMin==null?100:L.resMin,L.resolve);
    if(r0>30&&L.resolve<=30)callout('THEY\'RE WAVERING','good',fr);
    if(L.resolve<=0&&modOn(L.mods,'fanatical')&&!L.fanaticT){L.fanaticT=S.t;const l=nearestLeader(fr);if(l)F.say(l,'They\'re not folding, Base.','hazard',true);   // Fanatical: Intimidate can't work (§3.11)
      revealMod('fanatical','They won\'t give up: Fanatical Crew');}
    if(L.resolve<=0&&!modOn(L.mods,'fanatical')&&!L.offered&&S.t>=(L.noUntil||0)){L.offered=S.t;
      SIM.pushEvent('surrender','The freighter is hailing: they\'ll hand over the cargo if you let them go',{x:fr.x,y:fr.y,tone:'good'});
      reqTrigger('surrender',{},String(L.offered));}   // the crew's offer: a request (request 5)
  }
  // Phase 1: detection, from every rebel inside an escort's ring (nearer counts more)
  if(L.phase===1){
    let gain=0;const DR=DETECT_R*(modOn(L.mods,'ion')?0.7:1);
    for(const e of S.ships){if(!e.alive||e.role35!=='escort')continue;
      for(const r of S.ships){if(!r.alive||r.faction!=='reb'||r.struct||r.quiet)continue;const d=dist(e,r);const k=r.beh&&r.beh.kind==='tag'?DETECT_QUIET:r.beh&&(r.beh.kind==='waitpt'||r.beh.kind==='far')?DETECT_STILL:1;
        if(d<DR)gain=Math.max(gain,(1-d/DR)*k);}}
    L.detect=clamp(L.detect+(gain>0?gain*DETECT_RATE:-DETECT_DECAY)*dt,0,100);
    if(L.detect>=100)alarm('detected','They spotted you');
    if(S.proj.some(p=>p.faction==='reb')||L.bombs.length)alarm('fired','Shots fired');
  }
  // the distress call, then the response clock, then Phase 3
  const D=L.distress;
  if(D&&!D.landed&&!D.cut&&S.t-D.t0>=N.DISTRESS_SECS){D.landed=true;D.t=S.t;if(!modOn(L.mods,'remote')){L.responseAt=S.t+responseSecs();}
    SIM.pushEvent('distress','The distress call got out'+(modOn(L.mods,'remote')?', but there\'s nobody near to hear it':': the response is coming'),{tone:'hazard',x:fr?fr.x:null,y:fr?fr.y:null});callout('DISTRESS SENT','foe',fr,{feed:false});}
  if(L.responseAt!=null&&!L.responded&&S.t>=L.responseAt){setPhase(3,'Hegemony on site');spawnResponse();}
  tagTick(fr,dt);
  if(S.t-L.checkT>=0.5){L.checkT=S.t;planTick(fr);idleTick();revealTick(fr);reqScan(fr);causeTick(fr);}
  deathTick();
  offPlanTick(dt);
  optTick(fr);
  primaryTick(fr);
}
/* an Executive Order's state: busy, waiting (holding, defending), done, impossible (§4.4) */
function execState(wid){
  const S=SIM.S,ex=L.exec[wid],fr=FR(),w=F.wingOf(wid);if(!ex||!w)return 'none';
  const ws=F.wingShips(w),frLive=fr&&fr.alive&&!L.prize;
  if(ws.length*2<(L.n0[wid]||1))return 'broken';   // too many lost: the order ends (WING_BREAK, half the wing)
  if(ws.length&&ws.every(s=>s.panic))return 'broken';
  switch(ex.k){
    case 'disable':return !frLive?'impossible':subUp(ex.arg||'engines')?'busy':'done';
    case 'destroy':return fr&&!fr.alive&&!fr.jumped?'done':!frLive?'impossible':'busy';
    case 'board':return L.boarded?'done':!frLive||!ws.some(s=>s.load35==='board')?'impossible':'busy';
    case 'haul':{const p=ws.filter(s=>s.load35==='pods');if(!p.length)return S.ships.some(s=>s.wing===wid&&s.jumped&&s.pods&&s.pods.length)?'done':'impossible';
      return p.every(s=>s.pods.length>=N.POD_CAP)?'done':!frLive||!cargoLeft()?'impossible':'busy';}
    case 'suppress':return ex.arg==='escorts'?(S.ships.some(s=>s.alive&&s.role35==='escort')?'busy':'done'):(!frLive?'impossible':subUp('turrets')?'busy':'done');
    case 'intimidate':return L.surrender?'done':!frLive||L.fanaticT!=null?'impossible':'busy';
    case 'overwatch':return L.transferred?'done':L.surrender==='take'&&frLive?'busy':'impossible';
    case 'tag':return L.tag.planted?'done':!frLive?'impossible':'busy';
    case 'escort':return L.prize&&fr&&fr.alive?'busy':'waiting';
    case 'withdraw':return 'busy';
  }
  return 'waiting';   // hold, ambush, defend
}
const TRIG_TEST={bigger:()=>L.biggerT!=null,fjump:()=>L.spool!=null,phase2:()=>L.phase>=2,phase3:()=>L.phase>=3,done:wid=>execState(wid)==='done',
  half:wid=>{const w=F.wingOf(wid);return !!w&&F.wingShips(w).length*2<(L.n0[wid]||1);},trouble:wid=>{const w=F.wingOf(wid);return !!w&&F.wingShips(w).some(s=>s.hull/s.maxHull<0.4);},
  escape:()=>L.escaped};
/* the plan moving on (§4.4): a Secondary is taken up when its trigger fires and the Executive has nothing to do right
   now (done, waiting or impossible); while it's busy the leader says so and switches when it can. An Executive that's
   over with nothing next: home with Jump on Completion, else hold */
function planTick(fr){
  const S=SIM.S;
  for(const w of S.wings){
    const wid=w.id,sec=L.sec[wid],st=execState(wid),lead=F.byId(w.leader)||F.wingShips(w)[0];
    if(sec&&!sec.adopted&&!sec.fired&&TRIG_TEST[sec.trig]&&TRIG_TEST[sec.trig](wid))sec.fired=S.t;
    if(sec&&sec.fired&&!sec.adopted){
      if(st!=='busy'){sec.adopted=S.t;L.exec[wid]={k:sec.k,arg:sec.arg||null};L.secLog.push({wid,t:S.t,trig:sec.trig,k:sec.k});
        decide(wid,TRIGGERS[sec.trig]+': '+JOB_LINE(L.exec[wid]),'second','the plan\'s Secondary: '+ORDERS35[sec.k].name+secArg(sec),'plan');
        for(const s of F.wingShips(w))s.thinkT=F.THINK_SECS_();continue;}
      if(!sec.noted){sec.noted=true;decide(wid,'Switching to '+ORDERS35[sec.k].name+' once we\'re done with '+ORDERS35[L.exec[wid].k].name+'.','second',TRIGGERS[sec.trig].toLowerCase()+', while still busy','plan');}
    }
    if((st==='done'||st==='impossible'||st==='broken')&&!(sec&&sec.fired&&!sec.adopted)&&L.exec[wid].k!=='withdraw'&&L.exec[wid].k!=='hold'){
      const home=L.roe('jumpdone')&&st==='done';
      if(!(sec&&!sec.adopted&&!sec.fired)||home||st==='broken'){
        const was=ORDERS35[L.exec[wid].k].name,why=(st==='done'?was+' done':st==='broken'?'the wing\'s broken':was+': nothing left to do');
        const work=home||st==='broken'?null:findWork(w);
        if(work){retask(w,work,why);continue;}   // feedback 2, §3.1: the leader finds the wing a job
        L.exec[wid]=home||st==='broken'?{k:'withdraw',arg:null}:{k:'hold',arg:null,idle:true};   // idle: the leader's own Hold, not yours
        decide(wid,st==='broken'?'We\'re finished here, Base. Heading home.':home?(st==='done'?'Job done. Jumping out.':'Nothing left for us. Jumping out.'):(st==='done'?'Job done. Holding for orders.':'Nothing left for us here. Holding.'),home||st==='broken'?'home':'hold',why,'plan');
        for(const s of F.wingShips(w))s.thinkT=F.THINK_SECS_();}
    }
  }
  // Kill the Distress Call: when the call goes out, a wing with nothing to do goes for the array
  if(L.opt.some(o=>o.k==='distress')&&L.distress&&!L.distress.landed&&!L.distress.cut&&!L.distressSent){
    const w=S.wings.find(x=>execState(x.id)!=='busy'&&F.wingShips(x).length)||S.wings.find(x=>F.wingShips(x).length);
    if(w&&fr&&fr.alive){L.distressSent=w.id;L.exec[w.id]={k:'disable',arg:'comms'};SIM.pushEvent('plan',w.name+' goes for the comms array',{tone:'info'});for(const s of F.wingShips(w))s.thinkT=F.THINK_SECS_();}}
}
const secArg=o=>o.arg&&typeof o.arg==='string'?' ('+(WINGS35.find(w=>w.id===o.arg)||{name:o.arg}).name+')':'';
/* hidden modifiers show themselves in play (§3.2), and Unreliable Source's false one is found out */
function revealTick(fr){
  const S=SIM.S;
  const seen=L.phase>=2||S.ships.some(r=>r.alive&&r.faction==='reb'&&!r.struct&&S.ships.some(e=>e.alive&&e.role35==='escort'&&dist(e,r)<DETECT_R*1.3));
  if(seen&&L.biggerT==null&&L.escN>L.briefedEsc){L.biggerT=S.t;revealMod(modOn(L.mods,'heavy')?'heavy':'ace','That escort\'s bigger than Cass said: '+(modOn(L.mods,'heavy')?'Heavy Escort':'Ace Escort'));}
  if(L.phase>=2){if(modOn(L.mods,'green'))revealMod('green','The escort are cadets: Green Escort');
    const fk=L.mods.find(m=>m.fake&&!m.foundFake);if(fk){fk.foundFake=S.t;fk.found=true;SIM.pushEvent('intel','Cass was wrong: there\'s no '+MODS[fk.k].name+'. Unreliable Source',{tone:'hazard'});reqTrigger('intel',{text:'Cass was wrong about the '+MODS[fk.k].name},'fake');
      const u=L.mods.find(m=>m.k==='unreliable');if(u)u.found=true;}}
  if(L.spoolWhy==='quick')revealMod('quick','It\'s spooling a jump where it is: Quick Jumper');
  if(L.distress&&L.distress.landed){if(modOn(L.mods,'rapid'))revealMod('rapid','Help\'s close for them: Rapid Response');if(modOn(L.mods,'remote'))revealMod('remote','Nobody near to answer: Remote');}
  if(modOn(L.mods,'fanatical')&&L.resolve<=0)revealMod('fanatical','They won\'t give up: Fanatical Crew');
  if(modOn(L.mods,'demoralised')&&L.offered)revealMod('demoralised','The crew\'s heart isn\'t in it: Demoralised Crew');
}
/* OFF PLAN (§7.4): a wing doing anything but its Executive Order (a rule, a Secondary, a request's outcome, panic) */
function offPlanTick(dt){
  const S=SIM.S;
  for(const w of S.wings){
    const ws=F.wingShips(w),sec=L.sec[w.id];let why=null;
    if(ws.some(s=>s.panic))why='panic';
    else if(ws.some(s=>s.beh&&s.beh.rule==='preservation35'))why='Preservation';
    else if(ws.some(s=>s.beh&&s.beh.rule==='protect35'))why='protecting';
    else if(ws.some(s=>s.beh&&s.beh.rule==='pull35'))why='called out by name';
    else if(ws.some(s=>s.beh&&s.beh.rule==='vol35'))why='a volunteer\'s ram';
    else if(ws.some(s=>s.beh&&s.beh.rule==='fetch35'))why='picking up a pod';
    else if(ws.some(s=>s.beh&&s.beh.rule==='hold35'))why='holding for the reserves';
    else if(L.divert[w.id])why='the comms array';
    else if(ws.some(s=>L.focus[s.id]&&s.beh&&s.beh.kind==='engage'))why='a named target';
    else if(L.markW[w.id]&&SIM.S.t<L.markW[w.id].until&&ws.some(s=>s.beh&&s.beh.why==='the marked target'))why='the marked target';
    else if(ws.some(s=>s.beh&&s.beh.rule))why='a rule';
    else if(ws.some(s=>s.req35))why=ws.find(s=>s.req35).req35;
    else if(sec&&sec.adopted)why='Secondary: '+ORDERS35[sec.k].name;
    else if(L.distressSent===w.id&&L.exec[w.id].k==='disable')why='the comms array';
    L.off[w.id]=why;if(why)L.offSecs[w.id]+=dt;
  }
}
/* the optional objectives (§4.2): tracked as the mission runs; settled at the end */
function optTick(fr){
  const S=SIM.S;
  for(const o of L.opt){if(o.state!=='live')continue;
    if(o.k==='protect'){const s=F.byId(o.ship);if(s&&!s.alive&&!s.jumped)o.state='failed';}
    else if(o.k==='witnesses'){if(S.ships.some(s=>s.faction==='heg'&&s.jumped))o.state='failed';}
    else if(o.k==='distress'){if(L.distress&&L.distress.landed)o.state='failed';else if(!subUp('comms'))o.state='done';}
    else if(o.k==='bloodless'){if(S.ships.some(s=>s.faction==='heg'&&!s.alive&&!s.jumped&&s.id!==L.fr))o.state='failed';}
    else if(o.k==='everyone'){if(S.ships.some(s=>s.faction==='reb'&&s.wing&&!s.alive&&!s.jumped))o.state='failed';}
    else if(o.k==='rookie'){const s=F.byId(o.ship);if(s&&s.st.kills>0)o.state='done';}
    else if(o.k==='ghost'){if(L.alarm&&(L.alarmWhy==='detected'||L.alarmWhy==='jumpin'))o.state='failed';}
  }
  if(S.over)for(const o of L.opt)if(o.state==='live')o.state=o.k==='rookie'?'failed':'done';
}
/* Give the Signal (§5.5): every waiting wing goes; Phase 2 begins (the power, with its comms delay, comes in P4) */
function giveSignal(){if(L.signal)return false;L.signal=true;L.signalT=SIM.S.t;for(const s of SIM.S.ships)if(s.faction==='reb')s.thinkT=F.THINK_SECS_();alarm('signal','Your signal');return true;}
function stepFreighter(fr,dt){
  const S=SIM.S,kn=fr.knock||{x:0,y:0};fr.knock=null;   // this step's collision impulse (mass-split, sim-hc.js knock)
  if(L.disabled||L.surrender){   // drift: the engines (or the crew) quit; the planet pulls; a knock pushes it (§3.8)
    const d=L.drift||(L.drift={vx:fr.vx,vy:fr.vy});d.vx+=kn.x;d.vy+=kn.y;fr.h=fr.ph;fr.w=0;
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
  // the layer flies it (§3.8): it turns toward its waypoint at CAP_TURN, whatever the flight model's corner speed, and
  // its velocity eases back onto its heading over CAP_REALIGN, so a knock is a lurch and a slow swing back
  if(fr.row.capital){
    if(L.capH==null)L.capH=fr.h;if(!L.capV)L.capV={x:fr.vx,y:fr.vy};
    const want=L.spool!=null?L.capH:Math.atan2(p.y-fr.py,p.x-fr.px),turn=(L.alarm?N.CAP_TURN_ALARM:N.CAP_TURN)*dt;
    L.capH=angNorm(L.capH+clamp(angNorm(want-L.capH),-turn,turn));
    const v=L.cruise*(L.alarm?FLANK_K:1)*(L.spool!=null?0.4:1),tx=Math.cos(L.capH)*v,ty=Math.sin(L.capH)*v,k=Math.min(1,dt/N.CAP_REALIGN);
    L.capV.x+=kn.x+(tx-L.capV.x)*k;L.capV.y+=kn.y+(ty-L.capV.y)*k;
    fr.vx=L.capV.x;fr.vy=L.capV.y;fr.x=fr.px+fr.vx*dt;fr.y=fr.py+fr.vy*dt;fr.h=L.capH;fr.vh=Math.atan2(fr.vy,fr.vx);fr.w=0;
  }
  if(L.spool==null){
    // a leg is done once the freighter is level with its end (a capital ship can't turn tight enough to touch a point)
    const a=L.lane[L.leg-1],sx=p.x-a.x,sy=p.y-a.y,sl=Math.hypot(sx,sy)||1,along=((fr.x-a.x)*sx+(fr.y-a.y)*sy)/sl;
    const there=dist(fr,p)<LANE_ARRIVE||along>=sl-LANE_ARRIVE*0.5;
    if(there&&L.leg<L.lane.length-1)L.leg++;
    else if(there){L.spool=S.t;L.spoolAt={x:fr.x,y:fr.y};SIM.pushEvent('fjump','The freighter is spooling its jump',{x:fr.x,y:fr.y,tone:'hazard'});callout('JUMP SPOOLING','foe',fr,{feed:false});}
  }
  if(L.spool!=null&&S.t-L.spool>=(L.spoolWhy==='quick'?N.QUICK_SPOOL:JUMP_SECS)){
    if(HK.canJump&&HK.canJump(fr)===false)return;   // an Interdictor holds it (P4)
    fr.alive=false;fr.jumped=true;fr.jumpT=S.t;L.escaped=true;
    SIM.pushEvent('fjump','The freighter jumped out',{x:fr.x,y:fr.y,tone:'hazard'});
    for(const e of S.ships)if(e.alive&&e.role35==='escort'&&dist(e,fr)<6000){e.alive=false;e.jumped=true;e.jumpT=S.t;}   // its escort goes with it
  }
}
/* point defence (§3.2): each turret has a facing it traverses at PD_TRAVERSE, a mount arc (the prow pair the front
   PD_ARC, the fin pair the rear), and fires only within PD_ON_TARGET of its aim. It retargets every PD_RETARGET (or
   when its target leaves its arc or reach), leads from the target's velocity PD_LAG ago, and spreads more the faster
   its target crosses it. So a fast fighter dances through; a docked Brickbat doesn't. Hidden Guns: harder, further */
const PD_W={id:'pd35',name:'Point defence',kind:'ballistic',rng:1000,dmg:[1,2],skipShield:false,crit:0,needsLock:false};
function pdTick(fr,dt){
  if(!fr||!fr.alive||!L.alarm||L.surrender||L.prize){for(const sb of L.subs)if(sb.k==='pd')sb.firing=false;return;}
  const R=N.PD_R*L.pdK.rng,w=Object.assign({},PD_W,{rng:R,dmg:[PD_W.dmg[0]*L.pdK.dmg,PD_W.dmg[1]*L.pdK.dmg]});
  for(const sb of L.subs)if(sb.k==='pd'&&sb.hp>0)pdTrack(sb,fr,dt,R,w);
  if(L.pdK.dmg>1&&!L.gunsShown&&L.subs.some(x=>x.k==='pd'&&x.fired)){L.gunsShown=true;revealMod('guns','Its point defence hits harder than it should: Hidden Guns');}
  pdBoltTick();
}
/* one turret's tracking and fire: one function, so a station's turrets can use it later (M-37) */
function pdTrack(sb,fr,dt,R,w){
  const S=SIM.S,p=subWorld(fr,sb),arcC=sb.x>0?0:Math.PI,half=N.PD_ARC/2,V=F.projSpd(w);
  if(sb.rel==null)sb.rel=arcC;
  // the arc by bearing from the ship's centre, so the two pairs cover all round between them
  const inArc=t=>{if(!t||!t.alive||t.faction!=='reb'||t.struct||t.quiet||dist(t,p)>R)return false;return Math.abs(angNorm(Math.atan2(t.y-fr.y,t.x-fr.x)-fr.h-arcC))<=half;};
  let t=sb.tgt?F.byId(sb.tgt):null;
  if(!inArc(t)||S.t>=(sb.retT||0)){t=null;let bd=R;for(const s of S.ships){if(!inArc(s))continue;const d=dist(s,p);if(d<bd){bd=d;t=s;}}sb.tgt=t?t.id:null;sb.retT=S.t+N.PD_RETARGET;}
  sb.firing=false;
  if(!t){sb.aim=null;return;}
  // the lead, from the target's velocity PD_LAG ago (a jinking ship throws it off)
  const lv=lagVel(t),d=dist(t,p),tau=d/V,ax=t.x+lv.x*tau,ay=t.y+lv.y*tau;
  const want=angNorm(Math.atan2(ay-p.y,ax-p.x)-fr.h);
  sb.rel=angNorm(sb.rel+clamp(angNorm(want-sb.rel),-N.PD_TRAVERSE*dt,N.PD_TRAVERSE*dt));
  sb.aim={x:ax,y:ay};sb.aimA=sb.rel;
  if(Math.abs(angNorm(want-sb.rel))>N.PD_ON_TARGET||S.t-sb.shotT<N.PD_GAP)return;
  // the spread: the target's angular speed across the turret (its velocity relative to the freighter, across the line)
  const rx=t.vx-fr.vx,ry=t.vy-fr.vy,ux=(t.x-p.x)/(d||1),uy=(t.y-p.y)/(d||1),across=Math.abs(rx*uy-ry*ux)/Math.max(1,d);
  const spread=Math.min(N.PD_SPREAD_MAX,N.PD_SPREAD_BASE+N.PD_TRANSV_K*across);
  sb.shotT=S.t;sb.fired=true;sb.firing=true;
  const h=fr.h+sb.rel+(S.rng()-0.5)*2*spread,bolt={x:p.x,y:p.y,x0:p.x,y0:p.y,vx:Math.cos(h)*V,vy:Math.sin(h)*V,owner:fr.id,faction:'heg',w,burst:null,life:R/V*1.1,age:0,style:'repeaters'};
  S.proj.push(bolt);(L.pdBolts||(L.pdBolts=[])).push({b:bolt,tg:t.id});
  const st=(L.pdStats||(L.pdStats={}))[t.id]||(L.pdStats[t.id]={shots:0,hits:0});st.shots++;
}
/* each bolt point defence fired: gone before its life ran out means it hit something (the stats the tests read) */
function pdBoltTick(){
  if(!L.pdBolts||!L.pdBolts.length)return;const live=new Set(SIM.S.proj),keep=[];
  for(const e of L.pdBolts){if(live.has(e.b)){keep.push(e);continue;}if(e.b.age<e.b.life-0.06)L.pdStats[e.tg].hits++;}
  L.pdBolts=keep;
}
/* a ship's velocity PD_LAG ago (the last second of each rebel ship's velocity is kept) */
function lagVel(s){const h=L.vHist&&L.vHist[s.id],n=Math.round(N.PD_LAG/(SIM.TICK/1000));if(!h||!h.length)return {x:s.vx,y:s.vy};const e=h[Math.max(0,h.length-1-n)];return {x:e[0],y:e[1]};}
function vHistTick(){
  const V=L.vHist||(L.vHist={}),keep=Math.round(2/(SIM.TICK/1000));
  for(const s of SIM.S.ships){if(!s.alive||s.faction!=='reb')continue;const a=V[s.id]||(V[s.id]=[]);a.push([s.vx,s.vy]);if(a.length>keep)a.shift();}
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
    if(s.dock35&&!ok){s.dock35=null;s.dockLeg=null;continue;}
    if(!s.dock35&&ok&&s.beh&&s.beh.kind==='dock35'&&s.dockLeg==='final'){const d=dockPoint(fr,s);if(dist(s,d)<N.DOCK_SNAP){s.dock35={t:S.t,side:d.side,from:{x:s.x,y:s.y,h:s.h}};s.dockSide=d.side;s.thinkT=F.THINK_SECS_();
      SIM.pushEvent('dock',s.name+' clamps on'+(s.load35==='board'?': the marines go in':': hauling'),{ship:s.id,x:s.x,y:s.y,tone:'good'});}}
    if(!s.dock35)continue;
    // held on the clamp, alongside the spine, moving with the hull; for its first second it blends there from where it
    // clamped on (no teleport: the clamp is within DOCK_SNAP)
    const d=dockPoint(fr,s),k=Math.min(1,(S.t-s.dock35.t)/1),f=s.dock35.from||d;
    s.x=f.x+(d.x-f.x)*k;s.y=f.y+(d.y-f.y)*k;s.vx=fr.vx;s.vy=fr.vy;s.h=f.h+angNorm(fr.h-f.h)*k;s.vh=Math.atan2(fr.vy,fr.vx)||s.h;
    if(s.load35==='board')boarders++;
    if(s.load35==='pods'){s.haulT=(s.haulT||0)+dt;
      if(s.haulT>=N.HAUL_SECS){s.haulT=0;const c=L.subs.find(x=>x.k==='cargo'&&x.hp>0&&!x.taken&&!x.hazard);
        if(c){c.taken=true;s.pods.push(c.i);SIM.pushEvent('haul',s.name+' has a container ('+s.pods.length+'/'+N.POD_CAP+')',{ship:s.id,x:s.x,y:s.y,tone:'good'});
          callout('CARGO SECURED '+s.pods.length+'/'+N.POD_CAP+' · '+s.name.toUpperCase(),'good',s,{feed:false});}
        if(!c||s.pods.length>=N.POD_CAP){s.dock35=null;s.dockLeg=null;s.thinkT=F.THINK_SECS_();}}}
  }
  if(boarders&&ok){
    if(L.boardT0==null){L.boardT0=S.t;if(modOn(L.mods,'scuttle')){L.scuttleT=S.t+N.SCUTTLE_SECS;revealMod('scuttle','Scuttle charges: the boarders have '+N.SCUTTLE_SECS+' s');reqTrigger('scuttle',{},'once');}}
    const rate=boarders/N.BOARD35_SECS*(modOn(L.mods,'fanatical')?0.5:1)*(L.hatch?2:1);
    L.board=Math.min(1,L.board+rate*dt);
    if(L.board>=1){L.boarded=true;L.prize=true;fr.faction='reb';fr.quiet=true;L.disabled=false;L.drift=null;L.scuttleT=null;
      for(const s of S.ships)if(s.dock35){s.dock35=null;s.dockLeg=null;s.thinkT=F.THINK_SECS_();}
      SIM.pushEvent('board','The freighter is ours: the prize crew is taking her home',{x:fr.x,y:fr.y,tone:'good'});callout('BOARDED · PRIZE TAKEN','good',fr,{feed:false});}
  }
  if(L.scuttleT!=null&&fr&&fr.alive&&S.t>=L.scuttleT){L.scuttleT=null;SIM.pushEvent('scuttle','The scuttle charges blow',{x:fr.x,y:fr.y,tone:'hazard'});
    for(const s of S.ships)if(s.dock35&&s.alive){F.applyDamage(s,60,true,true);if(s.hull<=0)F.kill(s,null);s.dock35=null;}
    fr.hull=0;F.kill(fr,null);}
  // the surrender's hand-over: a rebel ship holds near it
  if(L.surrender==='take'&&fr&&fr.alive&&!L.transferred){
    const near=S.ships.filter(s=>s.alive&&s.faction==='reb'&&!s.quiet&&!s.struct&&dist(s,fr)<N.TRANSFER_R);
    if(near.length)L.transfer+=dt;
    // the containers come out as the transfer runs: the surviving modules × PIRATE_SHARE, each drifting to the nearest of yours
    if(L.jettN==null)L.jettN=Math.max(1,Math.round(cargoLeft()*N.PIRATE_SHARE)),L.jettOut=0;
    while(L.jettOut<L.jettN&&L.transfer>=N.TRANSFER_SECS*(L.jettOut+1)/(L.jettN+1)){const c=L.subs.find(x=>x.k==='cargo'&&x.hp>0&&!x.taken&&!x.hazard);if(!c)break;
      c.taken=true;L.jettOut++;const p=subWorld(fr,c);(L.crates||(L.crates=[])).push({x:p.x,y:p.y,vx:fr.vx,vy:fr.vy,t0:S.t,i:c.i});}
    if(L.transfer>=N.TRANSFER_SECS){L.transferred=true;SIM.pushEvent('surrender','The cargo is handed over',{x:fr.x,y:fr.y,tone:'good'});
      callout('CARGO SURRENDERED · '+L.jettOut+' CRATE'+(L.jettOut===1?'':'S'),'good',fr);
      L.surrender=null;L.released=true;L.disabled=false;L.drift=null;L.spool=S.t;L.spoolWhy='released';L.spoolAt={x:fr.x,y:fr.y};L.capV={x:fr.vx,y:fr.vy};L.capH=fr.h;   // let go: it spools and jumps
      SIM.pushEvent('fjump','The freighter is released: it spools its jump',{x:fr.x,y:fr.y,tone:'info'});}
  }
  // jettisoned crates drift to the nearest of your ships and are taken aboard
  if(L.crates)for(const c of L.crates){if(c.done)continue;const r=S.ships.filter(s=>s.alive&&s.faction==='reb'&&s.wing).sort((a,b)=>dist(a,c)-dist(b,c))[0];
    if(!r){c.done=S.t;continue;}const d=dist(r,c);if(d<160){c.done=S.t;continue;}
    const sp=Math.min(240,40+d*0.2);c.vx+=((r.x-c.x)/d*sp-c.vx)*Math.min(1,dt*1.5);c.vy+=((r.y-c.y)/d*sp-c.vy)*Math.min(1,dt*1.5);c.x+=c.vx*dt;c.y+=c.vy*dt;}
}
/* the surrender's answer (§5.6 request 5): take the cargo, demand the ship, or no deal */
function answerSurrender(a){
  const fr=FR();if(!fr||!fr.alive)return;
  if(a==='take'){L.surrender='take';L.drift={vx:fr.vx,vy:fr.vy};L.spool=null;SIM.pushEvent('surrender','They heave to and open the holds',{x:fr.x,y:fr.y,tone:'good'});
    for(const w of SIM.S.wings)if(L.exec[w.id]&&L.exec[w.id].k==='intimidate'){L.exec[w.id]={k:'overwatch',arg:null};rethink(F.wingShips(w));}}   // Intimidate is done: stand guard for the transfer
  else if(a==='demand'){if(modOn(L.mods,'demoralised')){L.surrender='ship';L.boarded=true;L.prize=true;fr.faction='reb';fr.quiet=true;SIM.pushEvent('surrender','They give up the ship',{x:fr.x,y:fr.y,tone:'good'});}
    else{L.resolve=30;L.offered=null;L.noUntil=SIM.S.t+30;SIM.pushEvent('surrender','They refuse to give up the ship: the fight goes on',{x:fr.x,y:fr.y,tone:'hazard'});}}
  else{L.resolve=40;L.offered=null;L.noUntil=SIM.S.t+30;callout('THEY\'RE HOLDING OUT','hazard',fr);}   // no deal: back to 40; they hail again when it next reaches 0, 30 s at least
}
function revealMod(k,text){const m=L.mods.find(x=>x.k===k&&!x.fake);if(m&&!m.found){m.found=true;m.foundT=+SIM.S.t.toFixed(2);SIM.pushEvent('intel',text,{tone:'hazard'});reqTrigger('intel',{mod:k,text},k);}}
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
  const S=SIM.S,o=L.prim,k=L.primK;if(o.state!=='live')return;
  const gone=!fr||!fr.alive,dead=gone&&!fr.jumped;
  let done=false,fail=false;
  if(k==='destroy'){done=dead;fail=L.escaped||L.prizeHome;}
  else if(k==='crash'){done=dead&&L.crashed;
    const stuck=!gone&&L.disabled&&dist(fr,L.planet)>L.planet.pull&&Math.hypot(fr.vx,fr.vy)<5;   // dead in space outside the pull: it will never fall
    fail=(dead&&!L.crashed)||L.escaped||stuck||(!gone&&!L.disabled&&!bombsLeft());}   // or nothing left to stop it with
  else if(k==='steal'){done=!!L.prizeHome;fail=dead||L.escaped||(!L.boarded&&!L.prize&&!boarderLeft());}
  else if(k==='pirate'){done=!!L.transferred;fail=dead||L.escaped||(modOn(L.mods,'fanatical')&&L.resolve<=0);}
  else if(k==='strip'){
    const home=S.ships.filter(s=>s.jumped&&!s.prop35&&s.pods&&s.pods.length).reduce((a,s)=>a+s.pods.length,0);L.hauled=home;
    const carriers=S.ships.filter(s=>s.alive&&!s.prop35&&s.pods&&s.pods.length);
    done=home>0&&(gone||!carriers.length);fail=home===0&&(gone||(!S.ships.some(s=>s.alive&&!s.prop35&&s.load35==='pods')));}
  else if(k==='tag'){done=L.escaped&&L.tag.planted;fail=dead||(L.escaped&&!L.tag.planted);}
  else if(k==='ambush'){done=L.respKills>=N.AMBUSH_KILLS;fail=(gone&&!L.responseAt&&!L.responded&&!(L.distress&&!L.distress.landed&&!L.distress.cut))||modOn(L.mods,'remote');}
  if(fail&&!done){const fb=fallbackFor(k);if(fb){fallBack(k,fb,failWhy(k,fr));return;}}   // feedback 2, §3: the leaders take the next best job
  if(done){o.state='done';o.doneT=S.t;SIM.pushEvent('objective',PRIMARIES[k].name+': done',{tone:'good',x:fr?fr.x:null,y:fr?fr.y:null});}
  else if(fail){o.state='failed';o.failT=S.t;o.failWhy=failWhy(k,fr);SIM.pushEvent('objective','Failed: '+PRIMARIES[k].name,{tone:'hazard',x:fr?fr.x:null,y:fr?fr.y:null});}
  if(o.state!=='live'){
    if(!L.responded&&L.phase<3)setPhase(3,'The job\'s settled: get out');
    const sr=fieldWings()[0];if(sr)decide(sr.id,o.state==='done'?'That\'s the job. Everyone home.':'We\'ve lost this one, Base. Everyone home.','home',o.state==='done'?PRIMARIES[k].name+' done':PRIMARIES[k].name+' failed: '+o.failWhy);
    for(const w of S.wings){L.exec[w.id]={k:'withdraw',arg:null};w.order={kind:'withdraw'};for(const s of F.wingShips(w)){s.dock35=null;s.thinkT=F.THINK_SECS_();}}
  }
}
/* =====================================================================
   Feedback 2, L3: the leaders decide in the field. A primary that can no longer be done falls back to one in its
   family that still can (Crash to Destroy, Steal to Strip the Cargo or Pirate…): it pays that one's reward, without
   the Accomplished bonus. Each wing then takes the job its ships can do for it
   ===================================================================== */
const FALLBACKS={crash:['destroy'],destroy:['crash'],steal:['strip','pirate'],strip:['steal','pirate'],pirate:['strip','steal']};
const bombsLeft=()=>SIM.S.ships.some(s=>s.alive&&s.faction==='reb'&&s.load35==='bombs'&&s.bombs>0)||uncalled('bombs');
const boarderLeft=()=>SIM.S.ships.some(s=>s.alive&&s.faction==='reb'&&s.load35==='board')||uncalled('board');
const podsLeft=()=>SIM.S.ships.some(s=>s.alive&&s.faction==='reb'&&s.load35==='pods')||uncalled('pods');
/* a reserve wing not called yet with a ship of this loadout */
const uncalled=lo=>!!(L.X.reserves&&L.X.reserves.some(r=>!L.called[r.id]&&r.ships.some(sd=>sd.load35===lo)));
/* can this primary still be done (or is it done already)? */
function canStill(k){
  const fr=FR(),gone=!fr||!fr.alive,dead=gone&&fr&&!fr.jumped,live=!gone&&!L.escaped&&!L.prize,stop=L.disabled||!!L.surrender||bombsLeft();
  switch(k){
    case 'destroy':return dead||(live&&!L.surrender);
    case 'crash':return live&&(L.disabled?dist(fr,L.planet)<L.planet.pull||Math.hypot(fr.vx,fr.vy)>=5:bombsLeft());
    case 'steal':return live&&!L.scuttleOut&&(L.boarded||boarderLeft())&&stop;
    case 'strip':return live&&podsLeft()&&cargoLeft()>0&&stop;
    case 'pirate':return live&&!(modOn(L.mods,'fanatical')&&L.resolve<=0)&&L.fanaticT==null;
  }
  return false;
}
function fallbackFor(k){if(L.fallback||L.retreat||L.abort)return null;return (FALLBACKS[k]||[]).find(canStill)||null;}   // one fallback a mission
function failWhy(k,fr){
  const gone=!fr||!fr.alive,dead=gone&&fr&&!fr.jumped;
  if(L.escaped)return 'she jumped out';
  if(L.prizeHome)return 'we took her home';
  if(k==='crash'){if(dead&&!L.crashed)return 'she blew up before she could fall';if(L.disabled)return 'she\'s dead in space outside the pull';return 'we\'re out of bombs to stop her with';}
  if(k==='steal'){if(dead)return 'she\'s gone';return 'we\'ve lost the boarding party';}
  if(k==='strip'){if(dead)return 'she\'s gone';return 'nothing left to haul with';}
  if(k==='pirate'){if(dead)return 'she\'s gone';return 'they won\'t give up';}
  if(dead)return 'she\'s gone';
  return 'it can\'t be done';
}
const FB_LINE={destroy:'We\'ll finish her instead.',crash:'We\'ll put her into the planet instead.',strip:'We\'ll strip her cargo instead.',pirate:'We\'ll lean on the crew instead.',steal:'We\'ll take the ship instead.'};
function fallBack(from,to,why){
  const S=SIM.S,o=L.prim;
  L.fallback={from,to,t:+S.t.toFixed(2),why};L.primK=to;
  o.text=PRIMARIES[to].name+' (for '+PRIMARIES[from].name+'): '+PRIMARIES[to].wins;o.key=to;
  const sr=fieldWings()[0];
  if(sr)decide(sr.id,PRIMARIES[from].name+' is off: '+why+'. '+FB_LINE[to],'fallback',PRIMARIES[from].name+' could no longer be done');
  SIM.pushEvent('objective','Fallback: '+PRIMARIES[to].name+' in place of '+PRIMARIES[from].name,{tone:'info'});
  for(const w of fieldWings())retask(w,fieldExec(w.id,to),'for '+PRIMARIES[to].name);
}
/* a wing's Executive changes on its leader's say-so (a fallback, or an idle wing finding work) */
function retask(w,ex,why){
  if(!ex||L.retreat)return false;
  const cur=L.exec[w.id];if(cur&&cur.k==='withdraw')return false;
  if(cur&&cur.k===ex.k&&cur.arg===ex.arg)return false;
  L.exec[w.id]=ex;w.order=execToHc(ex,L.plan);if(L.sec[w.id]&&!L.sec[w.id].adopted)L.sec[w.id]=null;   // the plan's Secondary was for the old job
  const ws=F.wingShips(w);for(const s of ws)if(!(s.dock35&&(ex.k==='board'||ex.k==='haul')))s.dock35=null;rethink(ws);
  decide(w.id,JOB_LINE(ex),'job',why);
  return true;
}
const JOB_LINE=ex=>{const a=ex.arg&&typeof ex.arg==='string'?(F.wingOf(ex.arg)?F.wingOf(ex.arg).name:ex.arg):null;
  return {destroy:'Going for the kill.',disable:'Taking out her '+(a||'engines')+'.',suppress:a==='escorts'?'Keeping the escort busy.':'Knocking out her turrets.',board:'Moving in to board.',haul:'Moving in to haul.',
    intimidate:'Leaning on her.',defend:'Covering '+(a||'the strike')+'.',escort:'Sticking with the freighter.',hold:'Holding here.'}[ex.k]||ORDERS35[ex.k].name+'.';};
/* the job a wing takes for a primary, by what its ships carry (a leader's judgement: placeholder) */
function fieldExec(wid,k){
  const S=SIM.S,w=F.wingOf(wid),ws=w?F.wingShips(w):[];if(!ws.length)return null;
  const has=lo=>ws.some(s=>s.load35===lo&&(lo!=='bombs'||s.bombs>0)),escorts=S.ships.some(s=>s.alive&&s.role35==='escort');
  const busyWith=lo=>fieldWings().find(x=>x.id!==wid&&execState(x.id)==='busy'&&F.wingShips(x).some(s=>s.load35===lo));   // cover a wing at work, never one covering us
  const cover=lo=>{const o=busyWith(lo);return o?{k:'defend',arg:o.id}:null;};
  switch(k){
    case 'destroy':return has('bombs')||!escorts?{k:'destroy',arg:null}:{k:'suppress',arg:'escorts'};
    case 'crash':return has('bombs')&&!L.disabled?{k:'disable',arg:'engines'}:escorts?{k:'suppress',arg:'escorts'}:cover('bombs')||{k:'hold',arg:null};
    case 'steal':return has('board')?{k:'board',arg:null}:has('bombs')&&!L.disabled?{k:'disable',arg:'engines'}:cover('board')||(escorts?{k:'suppress',arg:'escorts'}:{k:'suppress',arg:'turrets'});
    case 'strip':return has('pods')?{k:'haul',arg:null}:has('bombs')&&!L.disabled?{k:'disable',arg:'engines'}:cover('pods')||(escorts?{k:'suppress',arg:'escorts'}:{k:'hold',arg:null});
    case 'pirate':return ws.every(s=>s.load35==='board'||s.load35==='pods')?cover('bombs')||{k:'hold',arg:null}:{k:'intimidate',arg:null};
    case 'ambush':return {k:'ambush',arg:null};
    case 'tag':return null;
  }
  return null;
}
/* a wing with nothing left to do: its leader finds work (the primary's job for its ships, else the escort, else
   covering whoever is still on the primary); null: nothing worth doing, it holds */
function findWork(w){
  if(L.prim.state!=='live'||L.retreat)return null;
  const S=SIM.S,tries=[fieldExec(w.id,L.primK)];
  if(S.ships.some(s=>s.alive&&s.role35==='escort'))tries.push({k:'suppress',arg:'escorts'});
  const busy=fieldWings().find(x=>x.id!==w.id&&execState(x.id)==='busy');if(busy)tries.push({k:'defend',arg:busy.id});
  const was=L.exec[w.id];
  for(const ex of tries){if(!ex||ex.k==='hold')continue;L.exec[w.id]=ex;const st=execState(w.id);L.exec[w.id]=was;if(st==='busy'||(ex.k==='defend'&&execState(ex.arg)==='busy'))return ex;}
  return null;
}
/* what the mission paid (feedback 2, §1.1): the primary you ended on, its count, and the bonus if it was the one you picked */
function rewardOf(){
  const o=L.prim,k=L.primK,R=PRIMARIES[k].reward,out={k,picked:L.plan.primary,done:o.state==='done',earned:{},n:0,bonus:null,missed:null};
  if(!R||!out.done){if(o.state==='failed')out.missed=PRIMARIES[L.plan.primary].reward.bonus;return out;}
  const add=(b,x)=>{if(b)for(const r in b)out.earned[r]=(out.earned[r]||0)+b[r]*(x==null?1:x);};
  out.n=k==='steal'?cargoLeft():k==='pirate'?(L.jettOut||0):k==='strip'?(L.hauled||0):k==='ambush'?L.respKills:0;
  add(R.base);if(R.per)add(R.per,out.n);
  if(L.fallback)out.missed=PRIMARIES[L.fallback.from].reward.bonus;else{out.bonus=R.bonus;add(R.bonus);}
  return out;
}
/* =====================================================================
   P4: the comms delay (§5.4) and the commander powers (§5.5)
   Every power is a transmission: queued, it lands after (COMMS_BASE + distance / COMMS_SPD + the recipient's ACK) ×
   ION_K under Ion Storm, from the relay (the map's west edge, or the Comms Relay asset). An asset then takes
   ARRIVE_SPOOL to warp in. A transmission can't be recalled. Command points are a phase's allowance (CP1–3)
   ===================================================================== */
const signalled=wid=>L.signal||!!L.sigW[wid];
/* a wing that was holding for your signal goes without it: its leader's call, logged */
function release(wid,why){
  if(signalled(wid))return;
  L.sigW[wid]=true;const w=F.wingOf(wid);if(w)rethink(F.wingShips(w));
  decide(wid,why==='fired'?'We\'re taking fire, Base. Weapons free.':'They\'ve made us, Base. Going in without the signal.','signal',why==='fired'?'fired on while holding for your signal':'the alarm went up while holding for your signal');
  if(fieldWings().every(x=>L.sigW[x.id]))L.signal=true;
}
/* the leaders' decisions in the field (feedback 2, §3.3): what they chose and why, for the feed, a word from the
   leader, and the debrief */
function decide(wid,line,kind,why,ev){
  const S=SIM.S,w=F.wingOf(wid),s=leadOf(wid);
  const d={t:+S.t.toFixed(2),wid,wing:w?w.name:wid,who:s?s.name:null,kind,line,why:why||null};L.dec.push(d);
  if(s)F.say(s,line,'info',true);
  SIM.pushEvent(ev||'leader',(w?w.name:wid)+(s?' · '+s.name:'')+': '+line,{ship:s?s.id:null,x:s?s.x:null,y:s?s.y:null,tone:'info'});
  return d;
}
const interdictOn=()=>L&&L.interdict&&SIM.S.t<L.interdict.until?L.interdict:null;
function canJump(s){const I=interdictOn();return !(I&&dist(s,I)<N.INTERDICT_R);}
/* a pilot's acknowledgement: a green leader is slow to answer, a veteran quick */
function ackOf(s){
  const p=s&&s.pilot;if(!p)return N.ACK_REG;
  const lv=p.preset==='green'?1:p.preset==='veteran'||p.preset==='ace'?5:p.level||3;
  return lv<=2?N.ACK_GREEN:lv>=5?N.ACK_VET:N.ACK_REG;
}
function commsDelay(p,ack){
  if(N.COMMS_OFF)return 0;
  return (N.COMMS_BASE+dist(L.relay,p)/N.COMMS_SPD+ack)*(modOn(L.mods,'ion')?N.ION_K:1);
}
/* who a transmission goes to: a wing (its leader answers), one ship, or a place (an asset's spot, the freighter) */
function recipient(to){
  if(to.wing){const w=F.wingOf(to.wing),ls=w?F.wingShips(w):[],lead=ls.find(x=>x.id===w.leader)||ls[0];return lead?{p:F.wingCentre(w),ack:ackOf(lead),label:w.name}:null;}
  if(to.ship){const s=F.byId(to.ship);return s&&s.alive?{p:{x:s.x,y:s.y},ack:ackOf(s),label:s.name}:null;}
  if(to.at)return {p:to.at,ack:to.ack!=null?to.ack:N.ACK_REG,label:to.label||'the asset'};
  return null;
}
function send(k,to,what,args){
  const r=recipient(to);if(!r)return null;
  const S=SIM.S,d=commsDelay(r.p,r.ack);
  const tx={id:++L.txN,k,to,what,args:args||{},label:r.label,t0:S.t,at:S.t+d,delay:d,from:{x:L.relay.x,y:L.relay.y},p:{x:r.p.x,y:r.p.y},landed:null,refused:false};
  L.tx.push(tx);(L.txLog||(L.txLog=[])).push(tx);return tx;
}
function txTick(){
  const S=SIM.S;
  for(const tx of L.tx){if(tx.landed!=null||S.t<tx.at-1e-9)continue;tx.landed=S.t;land(tx);}
  L.tx=L.tx.filter(tx=>tx.landed==null||S.t-tx.landed<1.2);   // a delivered row flashes, then drops out
}
const leadOf=wid=>{const w=F.wingOf(wid),ls=w?F.wingShips(w):[];return ls.find(x=>x.id===w.leader)||ls[0]||null;};
const ack=(s,line,tone)=>{if(s)F.say(s,line||'Copy, Base.',tone||'info',true);};   // designer copy (C-78)
const fieldWings=()=>SIM.S.wings.filter(w=>F.wingShips(w).length);
const rethink=ships=>{for(const s of ships)s.thinkT=F.THINK_SECS_();};
/* the powers, in bar order (Abort is pinned last, in the title row) */
const POWERS35={
  signal:{name:'Give the Signal',cost:()=>0,target:'none',glyph:'go',line:'Every waiting wing goes; Phase 2 begins. Once.'},
  retreat:{name:'General Retreat',cost:()=>0,target:'none',glyph:'withdraw',line:'Every wing withdraws to our jump point.'},
  broadcast:{name:'Firebrand Broadcast',cost:()=>N.C_BROADCAST,target:'none',glyph:'broadcast',once:true,line:()=>'All your pilots +'+N.BROADCAST_NERVE+' nerve; the crew\'s resolve −'+N.BROADCAST_RES+'. The debrief notes the exposure. Once.'},
  name:{name:'Call a Pilot by Name',cost:()=>N.C_NAME,target:'mine',glyph:'name',choice:['pull','stay','focus'],line:'Pick one of your pilots, then Pull out, Stay in or Focus a target. A shaken pilot may refuse.'},
  mark:{name:'Mark Priority Target',cost:()=>N.C_MARK,target:'foe',glyph:'attack',line:()=>'Click an enemy or a freighter subsystem: ships with no Executive work focus it for '+N.MARK_SECS+' s.'},
  exec:{name:'Change Executive Order',cost:()=>N.C_EXEC,target:'wing',glyph:'exec',line:()=>'A wing\'s new Executive Order. A leader within '+Math.round(N.NEARLY*100)+'% of finishing pushes back; Insist costs '+N.C_INSIST+' more.'},
  reserve:{name:'Call the Reserves',cost:()=>N.C_RESERVE,target:'none',glyph:'escort',line:'A Reserve wing warps in at its jump-in point.'},
  ram:{name:'Launch the Ram',cost:()=>N.C_RAM,target:'foe',glyph:'ram',asset:['ram','nuke'],once:true,line:()=>L&&L.plan.assets.includes('nuke')?'The nuclear-tipped ram warps in at its staging point and drives at what you click. Its blast hits everything near it, friends and cargo included.':'The ram warps in at its staging point and drives at what you click.'},
  fireship:{name:'Light the Fire Ship',cost:()=>N.C_FIRE,target:'none',glyph:'fireship',asset:['fireship'],once:true,line:()=>'The derelict blows: '+N.FIRE_DMG+' damage within '+N.FIRE_R+'.'},
  mines:{name:'Detonate the Minefield',cost:()=>N.C_MINES,target:'none',glyph:'mines',asset:['mines'],once:true,line:()=>'Every mine blows: '+N.MINE_DMG+' to anything within '+N.MINE_R+' of one.'},
  buoy:{name:'Raise the Interdictor',cost:()=>N.C_BUOY,target:'none',glyph:'buoy',asset:['buoy'],once:true,line:()=>'No ship within '+N.INTERDICT_R+' can jump for '+N.INTERDICT_SECS+' s, yours included. The response drops at its edge.'},
  tug:{name:'Send the Tug',cost:()=>N.C_TUG,target:'mine',glyph:'tug',asset:['tug'],once:true,line:'The tug warps in and tows one of your ships out (or picks up a pod).'},
  spoof:{name:'Spoof Orders',cost:()=>N.C_SPOOF,target:'foe',glyph:'spoof',asset:['spoof'],once:true,line:()=>'An enemy group you click breaks off to the map edge for '+N.SPOOF_SECS+' s, then realises. Once.'},
  pirates:{name:'Call the Pirates',cost:()=>N.C_PIRATES,target:'none',glyph:'pirates',asset:['pirates'],once:true,line:()=>N.PIRATE_N+' pirate Brickbats warp in at the nearest edge and hit the Hegemony; '+Math.round(N.PIRATE_GREED*100)+'% of the time they go for the cargo instead.'},
  sleeper:{name:'Wake the Sleeper',cost:()=>N.C_SLEEPER,target:'none',glyph:'sleeper',choice:['engines','beacon','hatch'],once:true,line:'Your agent aboard: cut the engines, kill the beacon, or open the hatch (boarding × 2). Once; the agent may be burned.'},
  abort:{name:'Abort',cost:()=>0,target:'none',glyph:'close',line:'Every wing withdraws; the mission ends as the last ship jumps, and the debrief says Aborted.'},
};
const POWER_KEYS=Object.keys(POWERS35);
const CHOICE_NAME={pull:'Pull out',stay:'Stay in',focus:'Focus a target',engines:'Cut the engines',beacon:'Kill the beacon',hatch:'Open the hatch'};
const reservesLeft=()=>L.X.reserves.filter(r=>!L.called[r.id]);
/* the bar shows a power when the plan has its source */
function powerHas(k){
  const P=POWERS35[k];if(!P||!L)return false;
  if(P.asset)return P.asset.some(a=>L.plan.assets.includes(a));
  if(k==='signal')return L.roe('signal');
  if(k==='reserve')return L.X.reserves.length>0;
  if(k==='sleeper')return L.mods.some(m=>m.k==='insider'&&known(m));
  return true;
}
/* why a power can't be used now (null: it can) */
function powerWhy(k){
  const S=SIM.S,P=POWERS35[k];if(!L||!S)return 'no mission';
  if(S.over)return 'the mission is over';
  if(!powerHas(k))return 'not in this plan';
  if(P.once&&L.used[k])return 'used';
  if(k==='signal'&&(L.signal||L.signalSent))return 'already given';
  if(k==='abort'&&L.abort)return 'already aborting';
  if(k==='reserve'&&!reservesLeft().length)return 'no reserves left';
  if((k==='fireship'||k==='mines')&&!(L.props[k]&&L.props[k].live))return 'gone';
  if(k==='sleeper'&&!(FR()&&FR().alive))return 'the freighter is gone';
  if(P.cost()>L.cp)return 'not enough command points';
  return null;
}
/* the edge point nearest a place: where the tug and the pirates come in */
function edgeNear(p){
  const Z=SIM.zone,c=[{x:Z.x0-600,y:p.y},{x:Z.x1+600,y:p.y},{x:p.x,y:Z.y0-600},{x:p.x,y:Z.y1+600}];
  return c.reduce((b,q)=>dist(q,p)<dist(b,p)?q:b,c[0]);
}
/* a power used: spend, log, transmit. args: {ship}, {wing,k,arg}, {id,sub}, {act}, {target,sub} */
function use(k,args){
  args=args||{};
  if(k==='insist')return insist();
  const S=SIM.S,P=POWERS35[k];if(!P)return {ok:false,why:'no such power'};
  const why=powerWhy(k);if(why)return {ok:false,why};
  const fr=FR();
  // the target, checked before anything is spent
  if(P.target==='mine'&&!(k==='tug'&&args.pod)){const s=F.byId(args.ship);if(!s||!s.alive||s.faction!=='reb'||!s.wing)return {ok:false,why:'pick one of your ships'};}
  if(k==='tug'&&args.pod){const p=L.pods.find(x=>x.id===args.pod);if(!p||p.state!=='drift')return {ok:false,why:'pick a drifting pod'};}
  if(P.target==='foe'){const t=F.byId(args.id);if(!t||!t.alive||t.faction==='reb')return {ok:false,why:'pick an enemy'};}
  if(P.target==='wing'){if(!F.wingOf(args.wing)||!F.wingShips(F.wingOf(args.wing)).length)return {ok:false,why:'pick one of your wings'};if(!ORDERS35[args.k])return {ok:false,why:'pick an order'};}
  if(P.choice&&!P.choice.includes(args.act))return {ok:false,why:'pick what to do'};
  if(k==='name'&&args.act==='focus'){const t=F.byId(args.target);if(!t||!t.alive||t.faction==='reb')return {ok:false,why:'pick the target to focus'};}
  L.cp-=P.cost();L.used[k]=(L.used[k]||0)+1;
  L.powLog.push({k,t:+S.t.toFixed(2),phase:L.phase,cost:P.cost(),act:args.act||args.k||null});
  const txs=[],W=L.W;
  const allWings=what=>{for(const w of fieldWings()){const t=send(k,{wing:w.id},what,args);if(t)txs.push(t);}};
  switch(k){
    case 'signal':L.signalSent=true;allWings('Give the Signal');break;
    case 'retreat':allWings('General Retreat');break;
    case 'abort':L.abort=true;L.abortT=S.t;allWings('Abort');break;
    case 'broadcast':L.exposure=true;allWings('Firebrand Broadcast');if(fr&&fr.alive)txs.push(send(k,{at:{x:fr.x,y:fr.y},label:'the freighter'},'Firebrand Broadcast',{crew:true}));break;
    case 'name':txs.push(send(k,{ship:args.ship},CHOICE_NAME[args.act],args));break;
    case 'mark':allWings('Mark '+(F.byId(args.id).name||'the target')+(args.sub?' ('+SUB_NAME[subKey(args.sub)]+')':''));break;
    case 'exec':txs.push(send(k,{wing:args.wing},'Exec: '+ORDERS35[args.k].name,args));break;
    case 'reserve':{const r=reservesLeft().find(x=>x.id===args.wing)||reservesLeft()[0];L.called[r.id]=true;const p=W([r.at[0],r.at[1]]);
      const sd=r.ships[0],lead={pilot:F.presetPilot(sd.pilot,sd.name)};txs.push(send(k,{at:p,label:r.name,ack:ackOf(lead)},'Call the Reserves',{wing:r.id}));break;}
    case 'ram':{const a=L.plan.assets.includes('nuke')?'nuke':'ram',at=assetAt(L.plan,a);txs.push(send(k,{at:W([at.x,at.y]),label:'the ram'},'Launch the Ram',{id:args.id,sub:args.sub||null,nuke:a==='nuke'}));break;}
    case 'fireship':case 'mines':case 'buoy':{const p=L.props[k];txs.push(send(k,{at:{x:p.x,y:p.y},label:ASSETS[k].name.toLowerCase()},P.name));break;}
    case 'tug':{const s=args.pod?L.pods.find(x=>x.id===args.pod):F.byId(args.ship);txs.push(send(k,{at:edgeNear(s),label:'the tug'},'Send the Tug: '+s.name+(args.pod?'\'s pod':''),args.pod?{pod:args.pod}:{ship:s.id}));break;}
    case 'spoof':{const t=F.byId(args.id),ids=groupOf(t).map(x=>x.id);txs.push(send(k,{at:{x:t.x,y:t.y},label:'their '+(t.role35==='escort'?'escort':t.role35==='response'?'response':'squadron')},'Spoof Orders',{ids}));break;}
    case 'pirates':{const p=fr?{x:fr.x,y:fr.y}:L.fjump;txs.push(send(k,{at:edgeNear(p),label:'the pirates'},'Call the Pirates'));break;}
    case 'sleeper':txs.push(send(k,{at:fr?{x:fr.x,y:fr.y}:L.fjump,label:'the Agent'},'Wake the Sleeper: '+CHOICE_NAME[args.act],{act:args.act}));break;
  }
  SIM.pushEvent('power','Base: '+P.name+(args.act?' · '+CHOICE_NAME[args.act]:'')+(k==='exec'?' · '+ORDERS35[args.k].name:''),{tone:'info'});
  return {ok:true,tx:txs.filter(Boolean)};
}
/* Insist: a leader who pushed back on a new Executive Order is made to take it */
function insist(){
  const S=SIM.S,pb=L.pushback;
  if(!pb||S.t>pb.until)return {ok:false,why:'nobody to insist with'};
  if(N.C_INSIST>L.cp)return {ok:false,why:'not enough command points'};
  L.cp-=N.C_INSIST;L.pushback=null;L.powLog.push({k:'insist',t:+S.t.toFixed(2),phase:L.phase,cost:N.C_INSIST,act:pb.k});
  const t=send('exec',{wing:pb.wid},'Insist: '+ORDERS35[pb.k].name,{wing:pb.wid,k:pb.k,arg:pb.arg,insist:true});
  return {ok:!!t,tx:[t]};
}
/* an enemy group for Spoof Orders: the escort, the response, else its squadron */
function groupOf(t){const S=SIM.S;return S.ships.filter(s=>s.alive&&s.faction==='heg'&&s.id!==L.fr&&(t.role35?s.role35===t.role35:s.grp===t.grp));}
/* how far along a wing's Executive Order is, 0–1 (for "We're nearly there, Base") */
function progressOf(wid){
  const ex=L.exec[wid],fr=FR(),S=SIM.S;if(!ex||!fr)return 0;
  switch(ex.k){
    case 'disable':{const l=L.subs.filter(x=>x.k===subKey(ex.arg||'engines'));return 1-l.reduce((a,x)=>a+Math.max(0,x.hp),0)/Math.max(1,l.reduce((a,x)=>a+x.max,0));}
    case 'destroy':return 1-Math.max(0,fr.hull)/fr.maxHull;
    case 'board':return L.board;
    case 'haul':{const p=S.ships.filter(s=>s.wing===wid&&s.load35==='pods');return p.length?p.reduce((a,s)=>a+(s.pods?s.pods.length:0),0)/(p.length*N.POD_CAP):0;}
    case 'suppress':return ex.arg==='turrets'?L.subs.filter(x=>x.k==='pd'&&x.hp<=0).length/4:1-S.ships.filter(s=>s.alive&&s.role35==='escort').length/Math.max(1,L.escN0);
    case 'intimidate':return 1-L.resolve/N.RESOLVE_START;
    case 'tag':return L.tag.prog/N.TAG_SECS;
  }
  return 0;
}
/* a transmission lands */
function land(tx){
  const S=SIM.S,a=tx.args,wid=tx.to.wing,w=wid?F.wingOf(wid):null,ws=w?F.wingShips(w):[],lead=wid?leadOf(wid):null,fr=FR();
  switch(tx.k){
    case 'signal':
      L.sigW[wid]=true;rethink(ws);ack(lead,'Copy, Base. Going in.','good');if(L.signalT==null)powResult('signal','started the fight');
      if(L.signalT==null){L.signalT=S.t;alarm('signal','Your signal');}
      if(fieldWings().every(x=>L.sigW[x.id]))L.signal=true;
      break;
    case 'retreat':case 'abort':
      L.retreat=true;L.exec[wid]={k:'withdraw',arg:null};if(L.sec[wid])L.sec[wid].adopted=L.sec[wid].adopted||S.t;
      if(w)w.order={kind:'withdraw'};for(const s of ws){s.dock35=null;}rethink(ws);
      if(w&&ws.length)decide(wid,'Copy, Base. Breaking off: everyone for the jump point.','retreat',tx.k==='abort'?'you aborted':'you sounded the retreat');
      break;
    case 'broadcast':
      if(a.crew){L.resolve=Math.max(0,L.resolve-N.BROADCAST_RES);L.exposure=true;SIM.pushEvent('power','The broadcast reaches the freighter\'s crew',{x:tx.p.x,y:tx.p.y,tone:'good'});}
      else{for(const s of ws)F.adjCool(s,N.BROADCAST_NERVE);ack(lead,'You heard the lady. Let\'s go!','good');}
      break;
    case 'name':{
      const s=F.byId(a.ship);if(!s||!s.alive)break;const m=SIM.moraleOf(s);
      if((m==='SHAKEN'||m==='PANICKED')&&S.rng()<N.REFUSE_P){tx.refused=true;F.say(s,'I can\'t, Base. Not now.','hazard',true);SIM.pushEvent('power',s.name+' won\'t: '+CHOICE_NAME[a.act],{ship:s.id,x:s.x,y:s.y,tone:'hazard'});break;}
      if(a.act==='pull'){L.pull[s.id]=true;delete L.stayIn[s.id];delete L.focus[s.id];}
      else if(a.act==='stay'){L.stayIn[s.id]=true;delete L.pull[s.id];L.stayBy[s.id]=S.t;}
      else if(a.act==='focus'){L.focus[s.id]={id:a.target,sub:a.sub||null};delete L.pull[s.id];}
      rethink([s]);ack(s,a.act==='pull'?'Copy, pulling out.':a.act==='stay'?'Copy, Base. I\'m staying.':'Copy. On it.');
      break;}
    case 'mark':L.markW[wid]={id:a.id,sub:a.sub||null,until:S.t+N.MARK_SECS};rethink(ws);ack(lead);break;
    case 'exec':{
      if(!w||!ws.length)break;
      if(!a.insist&&execState(wid)==='busy'&&progressOf(wid)>=1-N.NEARLY){tx.refused=true;L.pushback={wid,k:a.k,arg:a.arg||null,t:S.t,until:S.t+15};
        ack(lead,'We\'re nearly there, Base.','hazard');SIM.pushEvent('power',w.name+' pushes back: nearly done with '+ORDERS35[L.exec[wid].k].name,{x:lead.x,y:lead.y,tone:'hazard'});break;}
      L.exec[wid]={k:a.k,arg:a.arg||null};if(L.sec[wid]&&L.sec[wid].adopted)L.sec[wid]=null;if(L.pushback&&L.pushback.wid===wid)L.pushback=null;
      w.order=execToHc(L.exec[wid],L.plan);for(const s of ws)s.dock35=s.dock35&&(a.k==='board'||a.k==='haul')?s.dock35:null;rethink(ws);ack(lead);
      SIM.pushEvent('plan',w.name+': new Executive Order · '+ORDERS35[a.k].name+secArg(L.exec[wid]),{x:lead.x,y:lead.y,tone:'info'});
      break;}
    case 'reserve':case 'ram':case 'tug':case 'pirates':arrive(tx.k,tx.p,a);break;
    case 'req':landReq(tx);break;
    case 'fireship':{const p=L.props.fireship;if(!p||!p.live)break;p.live=false;powResult('fireship',blastText(blast(p,N.FIRE_R,N.FIRE_DMG,'fire',null)));SIM.pushEvent('power','The fire ship goes up',{x:p.x,y:p.y,tone:'good'});break;}
    case 'mines':{const p=L.props.mines;if(!p||!p.live)break;p.live=false;const all={kills:[],subs:[],mine:[]};for(const q of p.pts){const r=blast(q,N.MINE_R,N.MINE_DMG,'mine',null);for(const k in all)all[k].push(...r[k]);}powResult('mines',blastText(all));SIM.pushEvent('power','The minefield blows',{x:p.x,y:p.y,tone:'good'});break;}
    case 'buoy':{const p=L.props.buoy;if(!p)break;L.interdict={x:p.x,y:p.y,t0:S.t,until:S.t+N.INTERDICT_SECS};if(fr&&fr.alive&&dist(fr,p)<N.INTERDICT_R)powResult('buoy','held the freighter');SIM.pushEvent('power','The Interdictor is up: nobody near it jumps for '+N.INTERDICT_SECS+' s',{x:p.x,y:p.y,tone:'good'});break;}
    case 'spoof':{const Z=SIM.zone;let n=0;for(const id of a.ids){const s=F.byId(id);if(!s||!s.alive)continue;n++;s.spoof35=S.t+N.SPOOF_SECS;s.spoofTo=edgeNear(s);s.thinkT=F.THINK_SECS_();}
      SIM.pushEvent('power','Spoofed orders: '+n+' of them break off',{x:tx.p.x,y:tx.p.y,tone:'good'});powResult('spoof','sent '+n+' of them away');break;}
    case 'sleeper':{
      L.burned=true;
      if(!modOn(L.mods,'insider')){tx.refused=true;const fk=L.mods.find(m=>m.k==='insider'&&m.fake);if(fk){fk.foundFake=S.t;fk.found=true;}
        SIM.pushEvent('intel','No answer from the Agent: there\'s nobody aboard. Unreliable Source',{tone:'hazard'});break;}
      if(!fr||!fr.alive)break;
      if(a.act==='engines'){const e=L.subs.find(x=>x.k==='engines');if(e&&e.hp>0){e.hp=0;subDown(fr,e,null);powResult('sleeper','cut the engines');}}
      else if(a.act==='beacon'){L.beacon=false;powResult('sleeper','killed the beacon');if(L.distress&&!L.distress.landed)L.distress.cut=true;else if(L.responseAt!=null&&!L.responded)L.responseAt=null;}
      else if(a.act==='hatch')L.hatch=true;
      SIM.pushEvent('power','The Agent: '+CHOICE_NAME[a.act].toLowerCase(),{x:fr.x,y:fr.y,tone:'good'});
      break;}
  }
}
/* an asset warping in: a warning at its spot for ARRIVE_SPOOL, then it's there */
function arrive(k,at,args){L.arrivals.push({k,x:at.x,y:at.y,t0:SIM.S.t,t1:SIM.S.t+N.ARRIVE_SPOOL,args:args||{},done:false,hazard:k==='pirates'||k==='ram',ships:[]});}
function arrivalTick(){
  const S=SIM.S;
  for(const a of L.arrivals){if(a.done||S.t<a.t1-1e-9)continue;a.done=S.t;a.ships=(ARRIVE[a.k](a)||[]).map(s=>s.id);}
}
/* a ram hits inside its target's crash-avoidance room (the flight model steers every ship off a collision, a ram too) */
const RAM_REACH=200;
function propShip(id,name,p,h,role,extra){
  // a drone's row: no nerve to lose, no panic; and never "pinned" (an emergency is for your pilots)
  const s=F.mkShip({id,name,faction:'reb',row:Object.assign({},F.rowOf('brickbat'),{kind:'drone'},extra||{}),x:p.x,y:p.y,h,pilot:F.presetPilot({preset:'regular'},name)});
  s.prop35=role;s.emerg={kind:'prop35',t0:0,resp:null};s.thinkT=F.THINK_SECS_();SIM.S.ships.push(s);return s;
}
const ARRIVE={
  reserve(a){
    const S=SIM.S,r=L.X.reserves.find(x=>x.id===a.args.wing);if(!r)return [];
    const p=L.W([r.at[0],r.at[1]]),w=F.addWing(Object.assign({},r,{at:[p.x,p.y,r.at[2]],ships:r.ships.map(sd=>Object.assign({},sd))}));
    const pw=L.plan.wings[w.id];
    for(const s of F.wingShips(w)){const sd=r.ships.find(x=>x.id===s.id);s.load35=sd&&sd.load35||null;if(s.load35==='bombs')s.bombs=N.BOMB_N;if(s.load35==='pods')s.pods=[];s.thinkT=F.THINK_SECS_();}
    L.n0[w.id]=w.ships.length;L.offSecs[w.id]=0;L.exec[w.id]=pw&&pw.exec?Object.assign({},pw.exec):{k:'hold',arg:null};
    L.sec[w.id]=pw&&pw.second&&pw.second.trig?Object.assign({fired:false,noted:false,adopted:false},pw.second):null;
    if(L.signalSent||L.signal||L.alarm)L.sigW[w.id]=true;   // after the alarm, nobody holds for a signal
    SIM.pushEvent('reserve',w.name+' on station',{x:p.x,y:p.y,tone:'good'});callout(w.name.toUpperCase()+' ARRIVED','good',p,{feed:false});   // §3.10
    if(L.phase===1&&S.ships.some(e=>e.role35==='escort'&&e.alive&&dist(e,p)<DETECT_WARP_R))alarm('jumpin',w.name+' dropped in inside their sensor ring');
    return F.wingShips(w);
  },
  ram(a){const t=F.byId(a.args.id),h=t?Math.atan2(t.y-a.y,t.x-a.x):0,tal=F.rowOf('talon');
    // armoured, no shields, RAM_SPD × a Talon's top speed: point defence and the escort have to work to stop it
    const s=propShip('ram35',a.args.nuke?'Nuclear Ram':'The Ram',a,h,'ram',{straight_max:tal.straight_max*N.RAM_SPD,hull:N.RAM_HULL,armour:N.RAM_ARM,shield_front:0,shield_rear:0});
    s.ram35={id:a.args.id,sub:a.args.sub,nuke:!!a.args.nuke,t0:SIM.S.t,start:{x:a.x,y:a.y}};
    SIM.pushEvent('power',s.name+' is away',{ship:s.id,x:a.x,y:a.y,tone:'good'});return [s];},
  tug(a){const pod=a.args.pod?L.pods.find(x=>x.id===a.args.pod):null,t=pod||F.byId(a.args.ship),h=t?Math.atan2(t.y-a.y,t.x-a.x):0,s=propShip('tug35','Rescue Tug',a,h,'tug');s.tug35={ship:a.args.ship||null,pod:a.args.pod||null,stage:'go'};
    SIM.pushEvent('power','The tug is here for '+(pod?pod.name+'\'s pod':t?t.name:'the pod'),{ship:s.id,x:a.x,y:a.y,tone:'good'});return [s];},
  pirates(a){
    const S=SIM.S,greedy=S.rng()<N.PIRATE_GREED,fr=FR(),c=fr?fr:L.fjump,h=Math.atan2(c.y-a.y,c.x-a.x),out=[];
    for(let i=0;i<N.PIRATE_N;i++){const o=(i-(N.PIRATE_N-1)/2)*320,p={x:a.x-Math.sin(h)*o,y:a.y+Math.cos(h)*o};
      const s=propShip('pir35_'+(i+1),'Pirate '+(i+1),p,h,'pirate');s.pir35={greedy,until:S.t+N.PIRATE_SECS,edge:{x:a.x,y:a.y},leave:false};if(greedy){s.load35='pods';s.pods=[];}out.push(s);}
    SIM.pushEvent('power','The pirates are here',{x:a.x,y:a.y,tone:'hazard'});return out;},
};
/* a blast (the fire ship, a mine, a nuke): everything near takes it, friends and cargo too; on the freighter each
   subsystem in reach takes it, and the core half */
function blast(p,R,D,kind,by){
  const S=SIM.S,fr=FR(),res={kills:[],subs:[],mine:[]};
  (L.blasts||(L.blasts=[])).push({x:p.x,y:p.y,r:R,kind,t:S.t,res});
  S.fx.push({x:p.x,y:p.y,t0:S.t,kind:'boom',size:kind==='mine'?0.6:1.4,src:'mhit'});
  for(const s of S.ships){
    if(!s.alive||s.id===by)continue;const d=dist(s,p);if(d>R+(s===fr?400:0))continue;
    const k=1-0.6*Math.min(1,d/R);
    if(s===fr){for(const sb of L.subs){if(sb.hp<=0)continue;const q=subWorld(fr,sb),dd=dist(q,p);if(dd>R)continue;sb.hp-=D*(1-0.6*dd/R);if(sb.hp<=0){res.subs.push(sb.k);subDown(fr,sb,F.byId(by));}}
      if(fr.alive){F.applyDamage(fr,D*k*0.5,true,true,{x:p.x,y:p.y,bomb:true,aimSub:'core',by});if(fr.hull<=0&&fr.alive)F.kill(fr,null);}continue;}
    F.applyDamage(s,D*k,true,true);if(s.hull<=0&&s.alive){if(kind==='nuke')s.noEject=true;(s.faction==='reb'?res.mine:res.kills).push(s.name);F.kill(s,null);}
  }
  return res;
}
/* what a power did, for the debrief ("Your {power} at {t} {result}") */
function powResult(k,text){if(text)L.powRes.push({k,t:+SIM.S.t.toFixed(2),text});}
const blastText=r=>{const a=[];if(r.kills.length)a.push('took '+(r.kills.length===1?r.kills[0]:r.kills.length+' of theirs'));
  const sb=r.subs.filter(x=>x!=='cargo');if(sb.length)a.push('knocked out the '+[...new Set(sb.map(x=>SUB_NAME[x]))].join(' and '));if(r.subs.includes('cargo'))a.push('cost you cargo');
  if(r.mine.length)a.push('took '+r.mine.join(' and ')+' too');return a.join(', ')||null;};
/* the props the layer flies: the ram, the tug and the pirates */
function thinkProp(s){
  const S=SIM.S,fr=FR();
  if(s.prop35==='ram'){let t=F.byId(s.ram35.id);if(!t||!t.alive){t=nearestFoe(s,x=>!x.struct);if(t)s.ram35.id=t.id;}
    return setB(s,{kind:'ram35',target:t?t.id:null,why:'ramming',hard:true});}
  if(s.prop35==='tug'){const T=s.tug35;if(T.stage==='go'){
      if(T.pod){const p=L.pods.find(x=>x.id===T.pod);if(p&&p.state==='drift')return setB(s,{kind:'tug35',dest:{x:p.x,y:p.y},why:'going for '+p.name+'\'s pod',hard:true});}
      else{const t=F.byId(T.ship);if(t&&t.alive&&!t.jumped)return setB(s,{kind:'tug35',target:t.id,why:'going for '+t.name,hard:true});}T.stage='home';}
    return setB(s,{kind:'withdraw',dest:F.withdrawPoint(s),why:T.stage==='tow'?'towing':'heading home',hard:true});}
  if(s.prop35==='pirate'){const P=s.pir35;
    const age=S.t-(P.until-N.PIRATE_SECS);
    if(!P.leave&&(S.t>=P.until||(s.pods&&s.pods.length>=N.POD_CAP)||(P.greedy&&age>20&&(!fr||!fr.alive||!cargoLeft()))))P.leave=true;
    if(P.leave)return setB(s,{kind:'leave35',dest:P.edge,why:s.pods&&s.pods.length?'off with the cargo':'leaving',hard:true});
    if(P.greedy&&fr&&fr.alive&&!L.prize&&(L.disabled||L.surrender)&&cargoLeft())return setB(s,{kind:'dock35',why:'after the cargo'});
    const e=nearestFoe(s,x=>!x.struct&&x.id!==L.fr);
    if(e)return setB(s,{kind:'engage',target:e.id,why:'hitting the Hegemony'});
    if(P.greedy&&fr&&fr.alive)return setB(s,{kind:'holdoff',why:'waiting for the holds to open'});
    if(fr&&fr.alive&&!L.prize)return setB(s,{kind:'engage',target:fr.id,why:'hitting the freighter'});
    P.leave=true;return setB(s,{kind:'leave35',dest:P.edge,why:'leaving',hard:true});}
  return false;
}
function propTick(dt){
  const S=SIM.S,fr=FR();
  for(const s of S.ships){
    if(!s.alive)continue;
    if(s.prop35==='ram'){const t=F.byId(s.ram35.id);
      if(S.t-s.ram35.t0>N.RAM_LIFE&&!s.ram35.nuke){s.alive=false;s.noDeathFx=true;s.ram35.done='spent';S.fx.push({x:s.x,y:s.y,t0:S.t,kind:'boom',size:0.6,src:'mmiss'});continue;}
      // contact with the target's hull outline (its true size), this step's path against it; a nuclear ram also goes
      // off close enough, or when its run is over
      const cp=t&&t.alive?contactPoint(t,s):null,near=s.ram35.nuke&&t&&t.alive&&dist(s,t)<F.bodyR(t)+N.NUKE_R*0.25;
      if(cp||near||(s.ram35.nuke&&S.t-s.ram35.t0>N.RAM_LIFE))ramImpact(s,t,cp||{x:s.x,y:s.y});}
    else if(s.prop35==='tug'){const T=s.tug35;
      if(T.stage==='go'&&!T.pod){const t=F.byId(T.ship);if(t&&t.alive&&dist(s,t)<N.TUG_R+F.bodyR(t)){T.stage='tow';t.towed35=s.id;t.dock35=null;t.thinkT=F.THINK_SECS_();s.thinkT=F.THINK_SECS_();SIM.pushEvent('power','The tug has '+t.name+' in tow',{ship:t.id,x:t.x,y:t.y,tone:'good'});}}}
    else if(s.prop35==='pirate'&&s.pir35.leave&&dist(s,s.pir35.edge)<900){s.alive=false;s.jumped=true;s.jumpT=S.t;if(s.pods&&s.pods.length){L.pirated+=s.pods.length;SIM.pushEvent('power','The pirates leave with '+s.pods.length+' container'+(s.pods.length>1?'s':''),{x:s.x,y:s.y,tone:'hazard'});}}
  }
  // a ship in tow rides behind the tug, and goes when it goes
  for(const s of S.ships){if(!s.alive||!s.towed35)continue;const g=F.byId(s.towed35);
    if(!g||!g.alive){if(g&&g.jumped){s.alive=false;s.jumped=true;s.jumpT=S.t;SIM.pushEvent('jump',s.name+' is towed out',{ship:s.id,x:s.x,y:s.y,tone:'good'});}else s.towed35=null;continue;}
    s.x=g.x-Math.cos(g.h)*320;s.y=g.y-Math.sin(g.h)*320;s.vx=g.vx;s.vy=g.vy;s.h=g.h;s.vh=g.vh;}
  // spoofed orders run out: they realise
  for(const s of S.ships)if(s.alive&&s.spoof35!=null&&S.t>=s.spoof35){s.spoof35=null;s.thinkT=F.THINK_SECS_();if(!L.spoofOut){L.spoofOut=S.t;SIM.pushEvent('power','They\'ve seen through the spoofed orders',{x:s.x,y:s.y,tone:'hazard'});}}
  // with every wing of ours gone, the props go too (so the mission can end)
  if(!S.ships.some(s=>s.alive&&s.wing&&s.faction==='reb'))for(const s of S.ships)if(s.alive&&s.prop35){s.alive=false;s.jumped=true;s.jumpT=S.t;}
}
/* where this step's path meets a ship's hull outline (the sim's ellipse, its true size), or null */
function contactPoint(t,s){
  const h=F.hullHit(t,{x:s.px,y:s.py},{x:s.x,y:s.y});if(h)return {x:h.x,y:h.y};
  const A=F.hullAxes(t),c=Math.cos(-t.h),sn=Math.sin(-t.h),lx=(s.x-t.x)*c-(s.y-t.y)*sn,ly=(s.x-t.x)*sn+(s.y-t.y)*c;
  return (lx*lx)/(A.a*A.a)+(ly*ly)/(A.b*A.b)<=1?{x:s.x,y:s.y}:null;   // already inside it
}
/* the ram strikes (§3.2): on the freighter, RAM_DMG to the subsystem it physically hit (the nearest to the contact
   point) and RAM_CORE to the core; a breach where it struck; a callout naming what went down. Not a ship's death: it
   crumples against the hull, so the map's kill effect is skipped (noDeathFx) and the overlay draws the impact */
function ramImpact(s,t,cp){
  const S=SIM.S,fr=FR();
  s.alive=false;s.deadT=S.t;s.noDeathFx=true;s.ram35.done='impact';
  (L.fxQ||(L.fxQ=[])).push({kind:s.ram35.nuke?'nuke':'ramImpact',x:cp.x,y:cp.y,t:S.t});
  if(s.ram35.nuke){powResult('ram',blastText(blast(cp,N.NUKE_R,N.NUKE_DMG,'nuke',s.id))||'went off');SIM.pushEvent('power','The nuclear ram detonates',{x:cp.x,y:cp.y,tone:'hazard'});callout('RAM IMPACT · DETONATION','hazard',cp);return;}
  if(t===fr){
    const lp=toHull(fr,cp);let sb=null,bd=1e9;
    for(const x of L.subs){if(x.hp<=0||(x.k==='cargo'&&x.taken))continue;const d=Math.hypot(x.x-lp.x,x.y-lp.y);if(d<bd){bd=d;sb=x;}}
    let what='HULL';
    if(sb){sb.hp-=N.RAM_DMG;if(sb.hp<=0){sb.hp=0;L.ramNow=true;subDown(fr,sb,null);L.ramNow=false;what=(sb.k==='pd'?'TURRET':sb.k==='cargo'?'CONTAINER':SUB_NAME[sb.k].toUpperCase())+' DOWN';}else what=SUB_NAME[sb.k].toUpperCase()+' HIT';}
    fr.hull-=N.RAM_CORE;fr.hitT=S.t;
    (L.breaches||(L.breaches=[])).push([lp.x,lp.y,7]);
    L.ramHit={t:S.t,sub:sb?sb.k:null,i:sb?sb.i:null,down:!!(sb&&sb.hp<=0)};
    powResult('ram',sb?(sb.hp<=0?'knocked out the '+SUB_NAME[sb.k]:'hit the '+SUB_NAME[sb.k]):'hit the hull');
    SIM.pushEvent('power','The ram hits the freighter'+(sb?': '+SUB_NAME[sb.k]+(sb.hp<=0?' down':' hit'):''),{x:cp.x,y:cp.y,tone:'good'});
    callout('RAM IMPACT · '+what,'hazard',cp);
    if(fr.hull<=0&&fr.alive)F.kill(fr,null);
  } else {F.applyDamage(t,N.RAM_DMG+N.RAM_CORE,true,true);t.hitT=S.t;const k=t.hull<=0;if(k&&t.alive)F.kill(t,null);
    powResult('ram',k?'took '+t.name:'hit '+t.name);callout('RAM IMPACT · '+(k?t.name.toUpperCase()+' DOWN':t.name.toUpperCase()+' HIT'),'hazard',cp);}
}
/* a ram that died before it struck: shot down. How far short, for the debrief */
function ramShotTick(){
  for(const s of SIM.S.ships){if(s.prop35!=='ram'||s.alive||s.ram35.done)continue;
    s.ram35.done='shot';const t=F.byId(s.ram35.id),short=t?Math.max(0,Math.round(dist(s,t)-F.hullAxes(t).b)):null;
    L.ramShot={t:SIM.S.t,short};powResult('ram','was shot down'+(short!=null?' '+short+' m short':''));
    SIM.pushEvent('power','The ram is shot down'+(short!=null?' '+short+' m short':''),{x:s.x,y:s.y,tone:'hazard'});callout('RAM DESTROYED','hazard',s);}
}
/* a callout (§3.4): a world-anchored moment the overlay pops over the spot (K4 draws them); tone: good / hazard / foe */
function callout(text,tone,p,o){(L.callouts||(L.callouts=[])).push({text,tone,x:p?p.x:null,y:p?p.y:null,t:SIM.S.t});
  if(!(o&&o.feed===false))SIM.pushEvent('callout',text,{x:p?p.x:null,y:p?p.y:null,tone:tone==='good'?'good':tone==='foe'?'info':'hazard'});}   // feed:false: the moment's own event is in the feed already
function propGoal(s,b){
  const t=b.target?F.byId(b.target):null;
  if(b.kind==='ram35'){s.holdFire=true;   // straight at the predicted contact point, flat out
    if(!t)return {x:s.x+s.vx,y:s.y+s.vy,spd:1};const tau=dist(s,t)/Math.max(200,F.capsOf(s).vMax);
    return {x:t.x+t.vx*tau,y:t.y+t.vy*tau,spd:1,noCorner:true};}
  if(b.kind==='tug35'){s.holdFire=true;const q=t||b.dest;return q?{x:q.x,y:q.y,spd:dist(s,q)>2000?1:0.6}:null;}
  if(b.kind==='leave35')return {x:b.dest.x,y:b.dest.y,spd:1,noCorner:true};
  return null;
}
/* the power bar's read: each power the plan has, its cost, and why not (null: usable) */
function powers(){return POWER_KEYS.filter(powerHas).map(k=>({k,name:POWERS35[k].name,cost:POWERS35[k].cost(),why:powerWhy(k),target:POWERS35[k].target,choice:POWERS35[k].choice||null,glyph:POWERS35[k].glyph}));}

/* =====================================================================
   P5: pilot requests (§5.6) and ejection (§5.7)
   The battle asks: a trigger raises a request with 2–3 answers and a default (the asker's persona); it lasts
   REQ_SECS; the answer travels with the comms delay and the asker acknowledges. At most REQ_OPEN open, REQ_GAP
   between new ones (the urgent ones, priority 8 and up, skip the gap), REQ_CAP a mission. A trigger that can't be
   asked within REQ_PEND, or any trigger with Requests off, is dropped (the pilot carries on), except the crew's
   surrender, which someone must answer: the asker's default
   ===================================================================== */
const lc1=t=>t.charAt(0).toLowerCase()+t.slice(1);
const personaOf=s=>s?(s.persona||F.personalityOf(s.pilot)):'even';   // eager · steady · even (the handoff's "nervous")
const vetOf=s=>!!s&&s.pilot&&(s.pilot.preset==='veteran'||s.pilot.preset==='ace'||(s.pilot.level||0)>=5);
const wingShipsOf=wid=>{const w=F.wingOf(wid);return w?F.wingShips(w):[];};
const nearestLeader=p=>{let b=null,bd=1e18;for(const w of SIM.S.wings){const l=leadOf(w.id);if(!l)continue;const d=p?dist(l,p):0;if(d<bd){bd=d;b=l;}}return b;};
const ANS={keep:'Keep at it',press:'Press on',reserves:'Hold for reserves',secondary:'Switch to the Secondary',go:'Go',stay:'Stay on task',stayin:'Stay in',pull:'Pull out',
  doit:'Do it',negative:'Negative',take:'Take the cargo',demand:'Demand the ship',no:'No deal',kill:'Kill it',ignore:'Ignore it',let:'Let her',self:'Take it yourself',
  get:'Get him',leave:'Leave him',out:'Get out',keep:'Keep going',jump:'Jump',finish:'Finish it'};
/* each request: its priority, who asks, the line (placeholder copy, C-78), the answers and the default by persona */
const REQ35={
  intel:{pri:3,build(c){const s=nearestLeader(FR());if(!s)return null;const res=reservesLeft().length>0,per=personaOf(s);
    return {who:s.id,line:'Base, '+lc1(c.text.split(':')[0])+'. Your call.',answers:['press'].concat(res?['reserves']:[],['secondary']),def:per==='eager'?'press':per==='steady'?(res?'reserves':'press'):'secondary'};}},
  chase:{pri:1,build(c){const s=F.byId(c.ship),t=F.byId(c.target);if(!s||!s.alive||!t||!t.alive)return null;return {who:s.id,line:'One\'s running! Permission to chase?',answers:['go','stay'],def:personaOf(s)==='eager'?'go':'stay'};}},
  hit:{pri:6,build(c){const s=F.byId(c.ship);if(!s||!s.alive)return null;return {who:s.id,line:'I\'m hit, but I can stay in this.',answers:['stayin','pull'],def:personaOf(s)==='eager'?'stayin':'pull'};}},
  volunteer:{pri:5,build(c){const s=F.byId(c.ship),t=F.byId(c.target);if(!s||!s.alive||!t||!t.alive)return null;
    return {who:s.id,line:c.sub==='turrets'?'I can put her into that turret. Say the word.':c.sub==='engines'?'I can put her into those engines. Say the word.':'I can put her into him. Say the word.',answers:['doit','negative'],def:'negative'};}},
  surrender:{pri:10,must:true,build(c){const fr=FR();if(!fr||!fr.alive||L.surrender||L.prize)return null;const s=nearestLeader(fr);
    return {who:s?s.id:null,line:'They\'re hailing. They\'ll dump the cargo if we let them run.',answers:['take','demand','no'],def:L.primK==='pirate'?'take':personaOf(s)==='eager'?'no':'take'};}},   // the answer that serves the primary (§3.11); else the persona's
  distress:{pri:7,build(c){const D=L.distress;if(!D||D.landed||D.cut||!subUp('comms'))return null;const s=nearestLeader(FR());if(!s)return null;
    return {who:s.id,line:'They\'re calling for help. Want me on that array?',answers:['kill','ignore'],def:'ignore'};}},
  rookie:{pri:2,build(c){const l=F.byId(c.leader),r=F.byId(c.rookie);if(!l||!l.alive||!r||!r.alive)return null;
    return {who:l.id,line:r.name+'\'s got the angle. Let her take it?',answers:['let','self'],def:personaOf(l)==='eager'?'self':'let'};}},
  pod:{pri:4,build(c){const p=L.pods.find(x=>x.id===c.pod);if(!p||p.state!=='drift')return null;const l=leadOf(p.wid)||nearestLeader(p);if(!l)return null;
    const engaged=wingShipsOf(l.wing).some(s=>s.beh&&s.beh.kind==='engage');return {who:l.id,line:p.name+'\'s out, pod\'s drifting. Do we pick '+p.name+' up?',answers:['get','leave'],def:engaged?'leave':'get'};}},
  scuttle:{pri:9,build(c){const s=SIM.S.ships.find(x=>x.alive&&x.dock35&&x.load35==='board');if(!s||L.boarded)return null;const per=personaOf(s);
    return {who:s.id,line:'Scuttle charges! We\'ve got '+Math.round(N.SCUTTLE_SECS)+' seconds!',answers:['out','keep'],def:per==='eager'?'keep':'out'};}},
  stall:{pri:5,build(c){const l=leadOf(c.wid);if(!l||execState(c.wid)!=='busy')return null;const sec=L.sec[c.wid];
    return {who:l.id,line:'We\'re getting nowhere. New orders?',answers:['secondary','keep'],def:sec&&!sec.adopted&&personaOf(l)!=='eager'?'secondary':'keep'};}},
  phase3:{pri:8,build(c){const l=leadOf(c.wid);if(!l||execState(c.wid)!=='busy')return null;
    return {who:l.id,line:'They\'re here. Jump now, or finish it?',answers:['jump','finish'],def:personaOf(l)==='eager'?'finish':'jump'};}},
};
/* a trigger: queued as pending (once per subject), raised when there's room, else decided by the asker */
function reqTrigger(k,ctx,key){
  const R=L.req;key=k+':'+(key||'');if(R.seen[key])return;R.seen[key]=true;
  R.pend.push({k,ctx:ctx||{},t:SIM.S.t,key});
}
function reqRaise(p){
  const S=SIM.S,R=L.req,b=REQ35[p.k].build(p.ctx);if(!b)return null;
  const q=Object.assign({id:++R.n,k:p.k,ctx:p.ctx,t0:S.t,until:S.t+N.REQ_SECS,state:'open',answer:null,by:null,pri:REQ35[p.k].pri},b);
  R.open.push(q);R.log.push(q);R.lastT=S.t;
  const s=F.byId(q.who);if(s)F.say(s,q.line,'hazard',true);
  SIM.pushEvent('request',(s?s.name:'Comms')+': "'+q.line+'"',{ship:q.who,x:s?s.x:null,y:s?s.y:null,tone:'hazard'});
  return q;
}
/* the asker decides (a time-out, a trigger that couldn't be asked, Requests off) */
function reqDecide(p,why){
  const b=REQ35[p.k].build(p.ctx);if(!b)return;
  const S=SIM.S,R=L.req,q=Object.assign({id:++R.n,k:p.k,ctx:p.ctx,t0:S.t,until:S.t,state:'done',answer:b.def,by:why,doneT:S.t,pri:REQ35[p.k].pri},b);
  R.log.push(q);applyReq(q,q.answer);
  const s=F.byId(q.who);SIM.pushEvent('request',(s?s.name:'The pilot')+' decided: '+ANS[q.answer],{ship:q.who,x:s?s.x:null,y:s?s.y:null,tone:'info'});
  noteReq(q,s);
}
/* a request answered by the pilot's own call goes in the leaders' log (feedback 2, §3.3) */
function noteReq(q,s){if(!s||!s.wing)return;L.dec.push({t:+SIM.S.t.toFixed(2),wid:s.wing,wing:(F.wingOf(s.wing)||{name:s.wing}).name,who:s.name,kind:'request',line:ANS[q.answer]+'.',why:q.by==='default'?'no answer from you in time: '+(q.line||q.k):'not asked: '+(q.line||q.k)});}
function reqTick(){
  const S=SIM.S,R=L.req;
  // time-outs: the asker does what their personality says
  for(const q of R.open)if(q.state==='open'&&S.t>=q.until){q.state='done';q.answer=q.def;q.by='default';q.doneT=S.t;applyReq(q,q.def);
    const s=F.byId(q.who);SIM.pushEvent('request',(s?s.name:'The pilot')+' decided: '+ANS[q.def],{ship:q.who,x:s?s.x:null,y:s?s.y:null,tone:'info'});noteReq(q,s);}
  R.open=R.open.filter(q=>q.state!=='done'||S.t-q.doneT<2);   // a decided card stays 2 s
  if(!R.pend.length)return;
  if(N.REQ_OFF){for(const p of R.pend)if(REQ35[p.k].must)reqDecide(p,'off');R.pend=[];return;}
  // room for a new one? the highest priority wins; the urgent skip the gap
  R.pend.sort((a,b)=>REQ35[b.k].pri-REQ35[a.k].pri||a.t-b.t);
  const open=R.open.filter(q=>q.state==='open'||q.state==='sent').length,raised=R.log.filter(q=>q.by!=='off'&&q.by!=='unasked').length;
  const p=R.pend[0];
  if(REQ35[p.k].must||(open<N.REQ_OPEN&&raised<N.REQ_CAP&&(S.t-R.lastT>=N.REQ_GAP||REQ35[p.k].pri>=8))){R.pend.shift();if(!reqRaise(p))reqTick();return;}   // an objective's request is never decided unseen
  // too long waiting: dropped (the surrender: the asker decides)
  const keep=[];for(const x of R.pend){if(S.t-x.t>=N.REQ_PEND){if(REQ35[x.k].must)reqDecide(x,'unasked');}else keep.push(x);}R.pend=keep;
}
/* the player's answer: free, but it travels with the comms delay */
function answerReq(id,a){
  const S=SIM.S,q=L.req.open.find(x=>x.id===id);
  if(!q||q.state!=='open')return {ok:false,why:'too late'};
  if(!q.answers.includes(a))return {ok:false,why:'not an answer'};
  q.state='sent';q.answer=a;q.by='player';q.sentT=S.t;
  const tx=send('req',q.who?{ship:q.who}:{at:{x:L.relay.x,y:L.relay.y},label:'comms',ack:0},ANS[a],{req:q.id,a});
  if(!tx){q.state='done';q.doneT=S.t;applyReq(q,a);}else q.tx=tx.id;
  return {ok:true,tx};
}
function landReq(tx){
  const S=SIM.S,q=L.req.log.find(x=>x.id===tx.args.req);if(!q||q.state==='done')return;
  q.state='done';q.doneT=S.t;applyReq(q,q.answer);
  const s=F.byId(q.who);if(s)ack(s,q.answer==='negative'||q.answer==='stay'||q.answer==='leave'||q.answer==='ignore'||q.answer==='no'?'Copy, Base.':'Copy, Base. '+ANS[q.answer]+'.');
}
/* an answer (or a default) does its thing: a short-lived override on that ship or wing, read by the think hook */
function applyReq(q,a){
  const S=SIM.S,c=q.ctx,s=F.byId(q.who),wid=s&&s.wing;
  L.req.applied.push({k:q.k,a,by:q.by,t:+S.t.toFixed(2),who:q.who});
  switch(q.k){
    case 'intel':
      if(a==='reserves'&&wid){const r=reservesLeft()[0];if(r){L.called[r.id]=true;const p=L.W([r.at[0],r.at[1]]);send('reserve',{at:p,label:r.name},'Hold for reserves',{wing:r.id});}L.holdUntil[wid]=S.t+30;rethink(wingShipsOf(wid));}
      else if(a==='secondary'&&wid){const sec=L.sec[wid];if(sec&&!sec.adopted){sec.fired=sec.fired||S.t;sec.adopted=S.t;L.exec[wid]={k:sec.k,arg:sec.arg||null};L.secLog.push({wid,t:S.t,trig:'request',k:sec.k});rethink(wingShipsOf(wid));}}
      break;
    case 'chase':if(a==='go'&&s){L.focus[s.id]={id:c.target,sub:null};rethink([s]);}break;
    case 'hit':if(!s)break;if(a==='stayin'){L.stayIn[s.id]=true;delete L.pull[s.id];if(q.by==='player')L.stayBy[s.id]=S.t;}else{L.pull[s.id]=true;delete L.stayIn[s.id];}rethink([s]);break;
    case 'volunteer':if(a==='doit'&&s){L.vol[s.id]={id:c.target,sub:c.sub||null};rethink([s]);}break;
    case 'surrender':answerSurrender(a);break;
    case 'distress':if(a==='kill'&&wid&&!L.divert[wid]){L.divert[wid]={prev:L.exec[wid]};L.exec[wid]={k:'disable',arg:'comms'};rethink(wingShipsOf(wid));}break;
    case 'rookie':if(a==='let'){L.rookie={leader:c.leader,rookie:c.rookie,target:c.target,until:S.t+15};L.focus[c.rookie]={id:c.target,sub:null};rethink([F.byId(c.rookie)].filter(Boolean));}break;
    case 'pod':if(a==='get'){const p=L.pods.find(x=>x.id===c.pod);if(!p||p.state!=='drift')break;
      const bb=S.ships.filter(x=>x.alive&&x.faction==='reb'&&x.wing&&podRoom(x)).sort((u,v)=>dist(u,p)-dist(v,p))[0];
      if(bb){L.fetch[bb.id]=p.id;rethink([bb]);}else SIM.pushEvent('request','Nobody has room for '+p.name+': it\'s the Tug or nothing',{x:p.x,y:p.y,tone:'hazard'});}break;
    case 'scuttle':if(a==='out'){L.scuttleOut=true;for(const x of S.ships)if(x.alive&&x.dock35&&x.load35==='board'){x.dock35=null;if(x.wing){L.exec[x.wing]={k:'hold',arg:null};rethink(wingShipsOf(x.wing));}}}break;
    case 'stall':if(!c.wid)break;if(a==='secondary'){const sec=L.sec[c.wid];if(sec&&!sec.adopted){sec.fired=sec.fired||S.t;sec.adopted=S.t;L.exec[c.wid]={k:sec.k,arg:sec.arg||null};L.secLog.push({wid:c.wid,t:S.t,trig:'stall',k:sec.k});}
      else L.exec[c.wid]={k:'hold',arg:null};rethink(wingShipsOf(c.wid));}else if(L.stall[c.wid])L.stall[c.wid].t=S.t;break;
    case 'phase3':if(a==='jump'&&c.wid){L.exec[c.wid]={k:'withdraw',arg:null};if(L.sec[c.wid])L.sec[c.wid].adopted=L.sec[c.wid].adopted||S.t;rethink(wingShipsOf(c.wid));}break;
  }
}
/* the triggers that are conditions (checked twice a second) */
function reqScan(fr){
  const S=SIM.S;
  for(const s of S.ships){
    if(!s.alive||s.faction!=='reb'||!s.wing||s.prop35)continue;
    if(s.hull/s.maxHull<N.HIT_REQ)reqTrigger('hit',{ship:s.id},s.id);
    // a volunteer: eager or veteran, hurt or out of bombs, a key target in reach
    if((personaOf(s)==='eager'||vetOf(s))&&(s.hull/s.maxHull<N.VOL_HULL||s.bombs===0)&&!s.dock35&&!L.vol[s.id]){
      let tg=null;
      if(fr&&fr.alive&&!L.prize&&!L.surrender){for(const k of ['engines','pd']){const sb=L.subs.find(x=>x.k===k&&x.hp>0&&dist(subWorld(fr,x),s)<N.VOL_R);if(sb){tg={target:fr.id,sub:k==='pd'?'turrets':'engines'};break;}}}
      if(!tg){const ace=S.ships.find(x=>x.alive&&x.id==='vex'&&dist(x,s)<N.VOL_R);if(ace)tg={target:ace.id,sub:null};}
      if(tg)reqTrigger('volunteer',Object.assign({ship:s.id},tg),s.id);
    }
  }
  // an enemy breaks off and runs, and one of yours could chase
  for(const e of S.ships){if(!e.alive||e.faction!=='heg'||e.struct||e.id===L.fr)continue;
    if(!(e.panic||(e.beh&&(e.beh.kind==='fallback'||e.beh.kind==='flee'))))continue;
    const r=S.ships.filter(x=>x.alive&&x.faction==='reb'&&x.wing&&!x.prop35&&!L.focus[x.id]&&!x.dock35&&dist(x,e)<N.CHASE_R).sort((a,b)=>dist(a,e)-dist(b,e))[0];
    if(r)reqTrigger('chase',{ship:r.id,target:e.id},e.id);}
  // Blood the Rookie: the leader's on a target the rookie has a shot at
  const ro=L.opt.find(o=>o.k==='rookie'&&o.state==='live'&&o.ship);
  if(ro){const r=F.byId(ro.ship),l=r&&r.alive?leadOf(r.wing):null;
    if(l&&l!==r&&l.beh&&l.beh.kind==='engage'){const t=F.byId(l.beh.target);if(t&&t.alive&&t.id!==L.fr&&dist(r,t)<F.gunRange(r)*1.5)reqTrigger('rookie',{leader:l.id,rookie:r.id,target:t.id},'once');}}
  // the stuck guard: a busy Executive whose progress hasn't moved for EXEC_STALL
  const ST=L.stall||(L.stall={});
  for(const w of S.wings){const ex=L.exec[w.id];if(!ex||execState(w.id)!=='busy'){delete ST[w.id];continue;}
    const key=ex.k+':'+(ex.arg||''),pr=Math.round(progressOf(w.id)*100)/100,st=ST[w.id];
    if(!st||st.key!==key||pr>st.p+0.009){ST[w.id]={key,p:pr,t:S.t};continue;}
    if(S.t-st.t>=N.EXEC_STALL)reqTrigger('stall',{wid:w.id},w.id+':'+key);}
  // a diverted wing goes back to its Executive once the array's dead or the call is out
  for(const wid in L.divert){const D=L.distress;if(!subUp('comms')||!D||D.landed||D.cut){if(L.exec[wid]&&L.exec[wid].k==='disable'&&L.exec[wid].arg==='comms')L.exec[wid]=L.divert[wid].prev;delete L.divert[wid];rethink(wingShipsOf(wid));}}
}
/* the callouts for your ships (§3.4): a pilot under 30%, a loss (and whether a pod got away), cargo home */
function calloutTick(){
  for(const s of SIM.S.ships){if(s.faction!=='reb'||!s.wing||s.prop35)continue;
    if(s.alive&&!s.co30&&s.hull<s.maxHull*0.3){s.co30=true;callout(s.name.toUpperCase()+' HIT','hazard',s);}
    if(!s.alive&&!s.jumped&&s.ej35&&!s.coDown){s.coDown=true;const pod=L.pods.some(p=>p.ship===s.id);callout(s.name.toUpperCase()+' DOWN'+(pod?' · POD AWAY':''),'hazard',s,{feed:false});}
    if(s.jumped&&s.pods&&s.pods.length&&!s.coHome){s.coHome=true;callout('CARGO HOME · '+s.pods.length+' CRATE'+(s.pods.length>1?'S':''),'good',s);}}
}
/* ---------- ejection (§5.7): a pod drifts POD_SECS; a Brickbat with room or the Tug picks it up, else it's captured ---------- */
const podRoom=s=>s.load35==='board'||(s.load35==='pods'&&(s.pods?s.pods.length:0)+(s.rescued?s.rescued.length:0)<N.POD_CAP);
function ejectTick(){
  const S=SIM.S;
  for(const s of S.ships){
    if(s.alive||s.jumped||s.ej35||s.faction!=='reb'||!s.wing||s.prop35)continue;
    s.ej35=true;if(s.noEject)continue;
    const p=Math.min(1,N.EJECT_P+(vetOf(s)?N.EJECT_VET:0))*(s.ejectK||1);
    if(S.rng()>=p)continue;
    const pod={id:'pod'+(L.pods.length+1),ship:s.id,name:s.name,wid:s.wing,x:s.x,y:s.y,vx:(s.vx||0)*0.3,vy:(s.vy||0)*0.3,t0:S.t,until:S.t+N.POD_SECS,state:'drift',by:null};
    L.pods.push(pod);SIM.pushEvent('eject',s.name+' ejects',{x:s.x,y:s.y,tone:'hazard'});
    reqTrigger('pod',{pod:pod.id},pod.id);
  }
}
function podTick(dt){
  const S=SIM.S;
  for(const p of L.pods){
    if(p.state==='aboard'){const c=F.byId(p.by);if(c&&!c.alive&&!c.jumped){p.state='lost';SIM.pushEvent('eject',p.name+' was aboard '+c.name+': lost',{x:c.x,y:c.y,tone:'hazard'});}continue;}
    if(p.state!=='drift')continue;
    p.vx*=1-0.1*dt;p.vy*=1-0.1*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    const c=S.ships.find(x=>x.alive&&x.faction==='reb'&&(x.prop35==='tug'||(x.wing&&podRoom(x)))&&dist(x,p)<N.POD_R+F.bodyR(x));
    if(c){p.state='aboard';p.by=c.id;if(c.load35==='pods')(c.rescued||(c.rescued=[])).push(p.id);for(const k in L.fetch)if(L.fetch[k]===p.id){delete L.fetch[k];const f=F.byId(k);if(f)f.thinkT=F.THINK_SECS_();}
      if(c.prop35==='tug'&&c.tug35&&c.tug35.pod===p.id){c.tug35.stage='home';c.thinkT=F.THINK_SECS_();}
      SIM.pushEvent('eject',(c.prop35==='tug'?'The tug':c.name)+' picks up '+p.name,{x:p.x,y:p.y,tone:'good'});continue;}
    if(S.t>=p.until){p.state='captured';SIM.pushEvent('eject',p.name+'\'s pod is taken by the Hegemony: captured',{x:p.x,y:p.y,tone:'hazard'});}
  }
}
/* the end (§3.6): a pod still drifting is captured if Hegemony ships remain within POD_CAPTURE_R, else lost. Never
   "drifting" */
function resolvePods(){
  if(!L||L.podsResolved)return;L.podsResolved=true;const S=SIM.S;
  for(const p of L.pods){if(p.state!=='drift')continue;
    const near=S.ships.some(e=>e.alive&&e.faction==='heg'&&!e.struct&&dist(e,p)<N.POD_CAPTURE_R);
    p.state=near?'captured':'lost';p.endT=S.t;
    SIM.pushEvent('eject',p.name+'\'s pod, left behind: '+(near?'captured by the Hegemony':'lost'),{x:p.x,y:p.y,tone:'hazard'});}
}
/* a volunteer's ram: the ship is lost; the pilot ejects at half the chance */
function volTick(){
  const S=SIM.S;
  for(const id in L.vol){const s=F.byId(id),v=L.vol[id],t=F.byId(v.id);
    if(!s||!s.alive){delete L.vol[id];continue;}
    if(!t||!t.alive||(t.id===L.fr&&(L.prize||L.surrender))){delete L.vol[id];s.thinkT=F.THINK_SECS_();continue;}
    if(dist(s,t)<F.bodyR(t)+F.bodyR(s)+RAM_REACH){
      F.applyDamage(t,N.RAM_DMG*N.RAM_K,true,true,{x:s.x,y:s.y,bomb:true,aimSub:v.sub||'core',by:s.id});t.hitT=S.t;if(t.hull<=0&&t.alive)F.kill(t,s);
      s.ejectK=0.5;delete L.vol[id];SIM.pushEvent('volunteer',s.name+' rams '+(t.id===L.fr?'the freighter\'s '+(v.sub||'hull'):t.name),{x:s.x,y:s.y,tone:'hazard'});F.kill(s,null);}
  }
}

/* ---------- P6: the cause log's context (§6) ---------- */
function causeTick(fr){
  const S=SIM.S;
  for(const wid in L.exec){const ex=L.exec[wid];if(ex)L.execSeen[ex.k+':'+(ex.arg&&typeof ex.arg==='string'?ex.arg:'')]=true;}
  if(L.distress&&!L.distress.landed&&!L.distress.cut&&Object.values(L.exec).some(e=>e&&e.k==='disable'&&e.arg==='comms'))L.arrayT+=0.5;
}
/* each of your ships lost, with the moment's context: who got it, its wing's order, who was defending whom */
function deathTick(){
  const S=SIM.S;
  for(const s of S.ships){
    if(s.alive||s.jumped||s.dead35||s.faction!=='reb'||!s.wing||s.prop35)continue;
    s.dead35=true;
    const by=s.lastHitBy?F.byId(s.lastHitBy):null,ex=L.exec[s.wing];
    L.deaths.push({id:s.id,name:s.name,wid:s.wing,t:+S.t.toFixed(2),phase:L.phase,cls:s.cls,
      by:by?(by.id===L.fr?'pd':by.role35==='response'?'response':by.role35==='escort'?'escort':by.faction==='reb'?'friend':'other'):'other',byName:by?by.name:null,
      exec:ex?Object.assign({},ex):null,execBusy:execState(s.wing)==='busy',covered:Object.keys(L.exec).some(w=>w!==s.wing&&L.exec[w]&&L.exec[w].k==='defend'&&L.exec[w].arg===s.wing),
      stayBy:L.stayBy[s.id]!=null?L.stayBy[s.id]:null,vol:!!s.ejectK,jumpdone:L.roe('jumpdone')});
  }
}
function onEvent(kind,text,o,e){
  L.cause.push({t:+SIM.S.t.toFixed(2),kind,text,phase:L.phase});
  if(kind==='over'){const S=SIM.S,O=S.over;resolvePods();   // the pods left out resolve at the end (§3.6)
    // the props (the ram, the tug, the pirates) aren't yours to lose; an aborted mission says so
    O.lost=S.ships.filter(s=>s.faction==='reb'&&s.wing&&!s.alive&&!s.jumped).length;
    if(L.abort&&O.outcome!=='aborted'){O.outcome='aborted';O.win=false;O.why='Mission aborted';}
    e.text=O.why+' · '+O.lost+' lost'+(O.leftBehind?' ('+O.leftBehind+' left behind)':'');}
}
/* a response ship killed (the kill hook is High Command's destroyShip: the layer counts it from the feed) */
function countKill(t){if(t&&t.role35==='response'&&!t.counted35){t.counted35=true;L.respKills++;}}

/* =====================================================================
   What a ship of yours is doing, in one vocabulary (feedback 1, §3.4): a verb key, a glyph, the words, and a
   progress (0..1) for the timed verbs. The overlay's badges and tiles and tools/run-report.js read it. Nothing falls
   through to a raw id
   ===================================================================== */
const VERBS={attack:'attack',bomb:'v_bomb',disable:'v_disable',suppress:'v_suppress',defend:'defend',escort:'escort',holdoff:'v_holdoff',
  board:'v_grapple',haul:'v_crate',carry:'v_carry',intim:'v_fist',overwatch:'v_watch',tag:'v_pin',signal:'v_pause',ambush:'v_eye',ram:'v_ram',
  pickup:'v_hook',withdraw:'withdraw',hold:'hold',hide:'v_holdoff',form:'regroup',tow:'v_hook',panic:'withdraw',pinned:'attack',busy:'hold'};
const HC_WORDS={interpose:['defend','Covering'],form:['form','Forming up'],regroup:['form','Regrouping'],hold:['hold','Holding'],idle:['hold','Idle'],
  capture:['hold','Capturing'],board:['board','Boarding'],fallback:['withdraw','Falling back'],flee:['panic','Fleeing'],freeze:['panic','Frozen'],
  patrol:['hold','Patrolling'],lure:['attack','Luring'],hegback:['withdraw','Pulling back'],standoff:['hold','Standing off'],decoyed:['attack','Chasing a decoy'],
  leave35:['withdraw','Leaving'],freighter:['hold','Under way']};
const LAYER_KINDS=new Set(['dock35','docked','holdoff','intim','overwatch35','tag','waitpt','far','fetch35','ram35','tug35','leave35']);
const v_=(k,words,prog)=>({k,g:VERBS[k]||'hold',words,prog:prog==null?null:Math.max(0,Math.min(1,prog))});
const pct=x=>Math.round(Math.max(0,Math.min(1,x))*100)+'%';
function verbOf(s){
  const S=SIM.S,b=s.beh||{},fr=FR(),t=b.target?F.byId(b.target):null,ex=(s.wing&&L&&L.exec[s.wing])||{};
  const nm=x=>!x?'':x.id===(L&&L.fr)?'the freighter':x.label||x.name;
  if(s.panic)return v_('panic',s.panic.mode==='freeze'?'Frozen':'Panicking');
  if(s.emerg&&s.emerg.kind==='pinned')return v_('pinned','Pinned!');
  switch(b.kind){
    case 'engage':{
      if(t&&fr&&t.id===fr.id){
        if(s.bombs>0&&s.load35==='bombs')return v_('bomb','Bomb run on the '+(s.sub35&&s.sub35!=='core'?SUB_NAME[s.sub35==='turrets'?'pd':s.sub35]+(s.sub35==='turrets'?'s':''):'hull'),s.bombs/N.BOMB_N);
        if(ex.k==='disable'){const k=ex.arg||'engines',l=L.subs.filter(x=>x.k===(k==='turrets'?'pd':k));return v_('disable','Disabling the '+(k==='turrets'?'turrets':SUB_NAME[k]||k),1-l.reduce((a,x)=>a+Math.max(0,x.hp),0)/Math.max(1,l.reduce((a,x)=>a+x.max,0)));}
        if(ex.k==='suppress'&&ex.arg!=='escorts'||s.sub35==='turrets')return v_('suppress','Suppressing turrets');
        return v_('attack','Attacking the freighter');}
      if(b.why==='guarding the transfer')return v_('overwatch','Guarding the transfer');
      if(ex.k==='suppress'&&ex.arg==='escorts')return v_('suppress','Suppressing '+nm(t));
      if(b.why==='springing the ambush')return v_('ambush','Springing the ambush on '+nm(t));
      return v_('attack',t?'Attacking '+nm(t):'Attacking');}
    case 'escort':{const c=b.charge?F.byId(b.charge):null;if(ex.k==='defend'&&ex.arg&&F.wingOf(ex.arg))return v_('defend','Defending '+F.wingOf(ex.arg).name);
      return v_('escort',c&&fr&&c.id===fr.id?'Escorting the prize':'Escorting '+(c?c.name:'the wing'));}
    case 'defend':case 'interpose':{const w=ex.k==='defend'&&ex.arg?F.wingOf(ex.arg):null,an=b.anchor;
      return v_('defend','Defending '+(w?w.name:an&&an.name?an.name:'the wing'));}
    case 'dock35':return s.load35==='pods'?v_('haul','Closing to haul'):v_('board','Closing to board');
    case 'docked':
      if(s.load35==='pods')return v_('haul','Hauling '+Math.min(N.POD_CAP,(s.pods?s.pods.length:0)+1)+'/'+N.POD_CAP,(s.haulT||0)/N.HAUL_SECS);
      return v_('board','Boarding '+pct(L.board||0),L.board||0);
    case 'holdoff':if(b.cover){const c=F.byId(b.cover);return v_('defend','Covering '+(c?c.name:'the boarders'));}
      return v_('holdoff',s.prop35==='pirate'?'Waiting for the holds to open':s.load35==='pods'?'Waiting to haul':'Waiting to board');
    case 'intim':return v_('intim','Intimidating',1-L.resolve/N.RESOLVE_START);
    case 'overwatch35':return v_('overwatch','Overwatching the transfer',L.transfer!=null?L.transfer/N.TRANSFER_SECS:null);
    case 'tag':return v_('tag','Tagging '+pct(L.tag.prog/N.TAG_SECS),L.tag.prog/N.TAG_SECS);
    case 'waitpt':
      if(b.why==='waiting for your signal')return v_('signal','Waiting for your signal');
      if(b.why==='lying in wait')return v_('ambush','Waiting in ambush');
      if(b.why==='holding for the reserves')return v_('hold','Holding for the reserves');
      if(b.why==='following spoofed orders')return v_('hold','Following false orders');
      return v_('hold','Holding');
    case 'far':return v_('hide','Keeping out of sight');
    case 'fetch35':{const p=L.pods.find(x=>x.id===L.fetch[s.id]);if(p&&b.d0==null)b.d0=Math.max(1,dist(s,p));
      return v_('pickup','Picking up '+(p?p.name:'a pod'),p&&b.d0?1-dist(s,p)/b.d0:null);}
    case 'ram35':return v_('ram',b.rule==='vol35'?'Going in!':'Ramming '+nm(t));
    case 'tug35':return v_('tow',s.tug35&&s.tug35.stage==='tow'?'Towing':'Going for '+nm(t||{}));
    case 'withdraw':
      if(s.pods&&s.pods.length)return v_('carry','Carrying '+s.pods.length+' crate'+(s.pods.length>1?'s':'')+' home');
      if(b.why==='under tow')return v_('withdraw','Under tow');
      return v_('withdraw','Withdrawing');
  }
  const h=HC_WORDS[b.kind];if(h)return v_(h[0],h[1]);
  return v_('busy','Busy');   // never a raw id
}

/* =====================================================================
   The panel (getters, grouped) and the export
   ===================================================================== */
return {SIM_VERSION,OPPORTUNITIES,MODS,MOD_KEYS,HC35_CLASSES,WINGS35,LOADOUTS,PRIMARIES,PRIMARY_KEYS,LATER_PRIMARIES,NEED_TEXT,OPTIONALS,ROES,CONFLICTS,SUGGESTS,ASSETS,ORDERS35,ORDER35_KEYS,TRIGGERS,
  TUNE:T35,GROUPS:GROUPS35,get ASSET_SLOTS(){return ASSET_SLOTS;},
  rollMods,modOn,known,defaultPlan,planHas,needsMet,compile,execToHc,mulberry,
  attach,detach,begin,get L(){return L;},live,alarm,setPhase,rewardOf,canStill,FALLBACKS,fieldExec,answerSurrender,revealMod,giveSignal,execState,leaderPlan,critique,LEADER_PLANS,N,
  POWERS35,POWER_KEYS,CHOICE_NAME,ASSET_AT,assetAt,powers,powerWhy,use,commsDelay,ackOf,progressOf,interdictOn,
  REQ35,ANS,answerReq,reqTrigger,personaOf,SUB_NAME,verbOf,VERBS,
  fn:{think,goal,step,laneW,findShipDef,subWorld,toHull,FL_UNIT,subsLive,subUp,cargoLeft,cargoLost,dockPoint,spawnResponse,damageFreighter,subDown,primaryTick,findWork,countKill,blast,send,land,canJump,edgeNear,groupOf}};
})();
