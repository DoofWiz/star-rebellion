/* High Command's own scenarios (Type 3's hc1 Nightfall, hc2 Last Light, hc3 Meltdown), kept as test fixtures when Type 3
   was archived (docs/MAIN-SWITCH-HANDOFF.md S0; the ruleset itself is archive/arena/arena-hc.js). tools/hc35-smoke.js
   loads them into High Command's renderer (DBGarena.hc.fn.loadScenario) for the sim's hash baselines and the visual
   pass. Copied from the archived file; plain data, no game code. Type 3's mission rules, command points and CP rewards
   came out with those systems (27 October 2026, C-90 item 3): hc2 no longer starts with Guardian Directive, hc3 no
   longer has Bring It Down standing or its CP variants, and the baselines were re-recorded. */
/* High Command's HC_LOADOUT (C-70) gave every Cross missiles; since MAIN-SWITCH S2 a ship's configuration is its own, so these
   Crosses carry theirs (the hash baselines are unchanged) */
const CROSS_MISSILES='primary:bls-t-light-repeaters|secondary:missiles';
const ROCKS_NIGHTFALL=[{x:3000,y:2900,r:120},{x:3220,y:3120,r:85},{x:4800,y:2350,r:140},{x:6400,y:3050,r:110},{x:2500,y:1500,r:100},{x:6900,y:4700,r:130},{x:4100,y:4700,r:95}];
const HC_SCENARIOS=[
  {id:'hc1_nightfall',title:'HC1: Nightfall',rulesets:['hc'],
    desc:'The canvas mission. Dagger (3) and Amber (2) see Convoy Lark to the jump point; Relay K-7 jams it until it falls. Optional: capture the satellite. Hegemony reinforcements in 4:00.',
    rocks:ROCKS_NIGHTFALL,
    wings:[
      {id:'dagger',name:'Dagger',at:[1100,2350,0],order:{kind:'attack',target:{type:'obj',id:'relay'}},tactic:'auto',
        ships:[{cls:'talon',name:'Joss',pilot:{id:'joss-marrek'}},{cls:'talon',name:'Wren',pilot:{preset:'regular'}},{cls:'talon',name:'Petra',pilot:{id:'petra-voss'}}]},
      {id:'amber',name:'Amber',at:[950,3750,0],order:{kind:'escort',target:{type:'ship',id:'lark'}},tactic:'auto',
        ships:[{cls:'cross',config:CROSS_MISSILES,name:'Sera',pilot:{id:'sera-kest'}},{cls:'cross',config:CROSS_MISSILES,name:'Kit',pilot:{preset:'green'}}]}],
    allies:[{id:'lark',name:'Convoy Lark',cls:'graf',at:[700,3450,0],role:'convoy',to:'jump',stats:{hull:80,arm:20}}],
    enemies:[
      {type:'fuel-depot',id:'relay',station:'relay',name:'Relay K-7',label:'Relay K-7',at:[5800,1600,0],stats:{hull:200,arm:30}},
      {type:'vc-mote-patrol',n:2,name:'Guard',role:'guard',asset:'relay',at:[5550,1900,Math.PI]},
      {type:'vc-mote-patrol',n:2,name:'Patrol',role:'patrol',at:[4700,4300,Math.PI]}],
    points:{jump:{x:7500,y:3900,label:'Jump point'},sat:{x:3400,y:1000,label:'Satellite',capture:true}},
    jam:{point:'jump',by:'relay'},extract:'jump',
    objectives:[
      {id:'convoy',kind:'escort',ship:'lark',text:'Get Convoy Lark to the jump point',primary:true},
      {id:'relay',kind:'destroy',targets:['relay'],text:'Destroy Relay K-7 (it jams the jump point)',primary:true,at:{x:5800,y:1600}},
      {id:'sat',kind:'capture',point:'sat',text:'Capture the satellite (optional)',at:{x:3400,y:1000}}],
    reinforce:{secs:240,edge:'E',force:[{type:'academy-commandant',n:1,name:'Vex'},{type:'vc-mote-patrol',n:3,name:'Strike'},{type:'drone-pursuer',n:2,name:'Pursuer'}]}},
  {id:'hc2_lastlight',title:'HC2: Last Light',rulesets:['hc'],
    desc:'Defend: Ember (3) and Ash (2) keep Lastlight station standing through three raiding waves until the evacuation clock runs out, then get out west. Tests Defend and Hold.',
    rocks:[{x:3300,y:2100,r:110},{x:5200,y:3900,r:120},{x:4900,y:1900,r:90},{x:3000,y:4100,r:100}],
    wings:[
      {id:'ember',name:'Ember',at:[3500,2500,0],order:{kind:'defend',target:{type:'ship',id:'lastlight'}},tactic:'auto',
        ships:[{cls:'talon',name:'Rook',pilot:{preset:'veteran'}},{cls:'talon',name:'Vale',pilot:{preset:'regular'}},{cls:'talon',name:'Jory',pilot:{preset:'regular'}}]},
      {id:'ash',name:'Ash',at:[3500,3500,0],order:{kind:'hold'},tactic:'auto',
        ships:[{cls:'cross',config:CROSS_MISSILES,name:'Mara',pilot:{preset:'regular'}},{cls:'cross',config:CROSS_MISSILES,name:'Tamsin',pilot:{preset:'green'}}]}],
    allies:[{id:'lastlight',station:'lastlight',name:'Lastlight',label:'Lastlight Station',cls:'fuel-depot',at:[4200,3000,0],stats:{hull:300,arm:40}}],
    enemies:[],
    waves:[
      {at:20,edge:'E',force:[{type:'vc-mote-patrol',n:3,name:'Raider',role:'raid'}],text:'Wave one: raiders from the east'},
      {at:75,edge:'N',force:[{type:'vc-mote-patrol',n:2,name:'Raider',role:'raid'},{type:'drone-pursuer',n:2,name:'Pursuer'}],text:'Wave two: raiders and drones from the north'},
      {at:130,edge:'S',force:[{type:'vc-mote-patrol',n:3,name:'Raider',role:'raid'},{type:'drone-pursuer',n:1,name:'Pursuer'}],text:'Wave three: from the south'}],
    points:{jump:{x:800,y:3000,label:'Jump point'}},extract:'jump',
    objectives:[{id:'hold',kind:'protect',ship:'lastlight',text:'Keep Lastlight standing until the evacuation clock runs out',primary:true}],
    reinforce:{secs:180,edge:'E',force:[{type:'academy-commandant',n:1,name:'Vex'},{type:'vc-mote-patrol',n:4,name:'Strike'},{type:'drone-pursuer',n:2,name:'Pursuer'}]}},
  {id:'hc3_meltdown',title:'HC3: Meltdown',rulesets:['hc'],
    desc:'Two wings of four against Commandant Vex\'s group. Board the reactor platform with Hammer\'s marines and bring Vex down.',
    rocks:[{x:3600,y:2300,r:130},{x:4300,y:3900,r:110},{x:5200,y:2700,r:95},{x:2800,y:3300,r:90},{x:5600,y:4300,r:120}],
    wings:[
      {id:'hammer',name:'Hammer',at:[1300,2300,0],order:{kind:'regroup'},tactic:'auto',
        ships:[{cls:'graf',name:'Anvil',marines:true,pilot:{preset:'regular'},stats:{hull:70,arm:20}},{cls:'graf',name:'Forge',marines:true,pilot:{preset:'green'},stats:{hull:70,arm:20}},
          {cls:'talon',name:'Pike',pilot:{preset:'veteran'}},{cls:'talon',name:'Brand',pilot:{preset:'regular'}}]},
      {id:'lance',name:'Lance',at:[1300,3700,0],order:{kind:'attack',target:{type:'class',cls:'mote'}},tactic:'auto',
        ships:[{cls:'talon',name:'Sable',pilot:{preset:'ace'}},{cls:'cross',config:CROSS_MISSILES,name:'Corin',pilot:{preset:'veteran'}},{cls:'cross',config:CROSS_MISSILES,name:'Wick',pilot:{preset:'regular'}},{cls:'talon',name:'Isla',pilot:{preset:'green'}}]}],
    enemies:[
      {type:'fuel-depot',id:'reactor',station:'reactor',name:'Reactor Platform',label:'Reactor Platform',at:[6600,3000,0],stats:{hull:260,arm:40}},
      {type:'academy-commandant',id:'vex',name:'Vex',label:'Commandant Vex',at:[6000,3000,Math.PI],role:'guard',asset:'reactor',flagship:true,stats:{hull:120,arm:20}},
      {type:'vc-mote-patrol',n:4,name:'Escort',role:'guard',asset:'reactor',at:[5800,2600,Math.PI]},
      {type:'drone-pursuer',n:2,name:'Pursuer',role:'patrol',at:[4600,3300,Math.PI]}],
    points:{jump:{x:700,y:3000,label:'Jump point'}},extract:'jump',
    objectives:[
      {id:'board',kind:'board',station:'reactor',text:'Board the reactor platform (Hammer\'s marines)',primary:true,at:{x:6600,y:3000}},
      {id:'vex',kind:'destroy',targets:['vex'],text:'Bring down Commandant Vex',primary:true,at:{x:6000,y:3000}}],
    reinforce:{secs:210,edge:'E',force:[{type:'vc-mote-patrol',n:4,name:'Strike'},{type:'drone-pursuer',n:3,name:'Pursuer'}]}},
];
module.exports={HC_SCENARIOS};
