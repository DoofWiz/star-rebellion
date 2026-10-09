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
  seraFound:'“Don’t thank me too fast, but I’ve found your stick. Sera Kest: ex-Hegemony survey pilot. She’s been asking around unsavoury types for any jobs going to put some dirt in the Empress’ eye and I think she’ll appreciate a real cause like yours. They say she’s grounded for attitude and hungry to fly a fighter again. She’s on my next run over to you if you’ll have her.”',
  // Maro Venn arrives and offers the depots
  vennNews:'Word has crossed over to us: <b>Maro Venn</b>, keeper of the Dry Comet cantina in Dustfall, is asking after the crew that humbled Reeve outside his front door the other day. A sympathetic local ally like that makes for a great Source. He could prove to be the key to liberating Akkaro from the Hegemony\'s law.',
  depotsOffer:'“Howdy. Name\'s Maro Venn. Local bartender here in Dustfa- &lt;muffled shouting&gt; ... well my assistant says I shouldn\'t hand out identifying information like that over the comm waves. But hell, I\'ve done it now. And who cares what those Heggies think anyway.\n\nYou gave Reeve the worst day of his life. The drinks were runnin\' free till dawn. First time in years that someone\'s hit \'em like that. Let me now return the favour. \n\nThe fuel depots over Akkaro feed all kinds of ships, but plenty of \'em are Heggie Navy types. Patrols that come around here bleedin\' us dry. Somebody with a fast ship could cook them off... know anyone who got a fast ship lately?”',
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
  // Venn asks for Tachi; the mission's name
  tachiOffer:'“Ranchers have been telling me that the lawmen based out near their land have been leavin’, abandonin’ their posts and consolidatin’. I think you’ve got ’em scared. I got a personal favour to ask you about… you can say no. But it would mean a lot to me… and I got a feelin’ it could help ya out too. I got a buddy, name of Tachi Gard. She got pulled up yesterday by the Sheriff’s lackeys for ‘instigatin’ trouble’. She’s been locked up in the Sheriff’s office but I’m hearin’ they’re gonna transfer her to somewhere else… don’t know where but we might never see her again. Please, rescue her, if you can.”',
  rescueTachi:'Rescue Tachi',
  // Tachi, freed ([location name] in the design doc read as Akkaro: DESIGN_BLOCKERS C-47)
  tachiThanks:'“You saved my hide there, thank you! Those hillbillies were talking about throwing me in a mine until I dropped dead. They’re going to be looking for me all over Akkaro. If you have space in your crew, I might be able to lay low while passing you on some good intel from Akkaro. No doubt the authorities are starting to look at what’s happening down here with everything you’ve been stirring up. Let me watch out for you.”',
  // Run Your Network: the guided steps (docs/TUTORIALS.md; the intro window and field manual are in base.js)
  netStep1T:'Your network',
  netStep1:'Your network lives here: every Agent, every Source and every thread that connects them.',
  netStep2T:'Meet your Agent',
  netStep2:'This is Tachi Gard, your first Agent. Agents don’t go on missions. They work in the shadows, handling your Sources so you never have to meet them yourself.<br>Tachi is posted to Akkaro. Any Sources she handles there are her <b>Akkaro Cell</b>.',
  netStep3T:'Read her file',
  netStep3:'<b>Tradecraft</b> reduces the Risk her Sources build up when you contact them or run their missions.<br><b>Cover</b> is how hard she is to trace if one of her Sources is caught.<br><b>Rapport</b> helps her win a Source’s trust.<br><b>Cell</b> is how many Sources she can handle. She can take on two to begin with. That grows as she gains experience and as you expand your Intelligence Center.',
  netStep4T:'Her cell',
  netStep4:'Cass and Venn now report to Tachi. Everyone in a cell is connected through their Agent.<br>If one of them is <b>Burned</b>, the Hegemony will start pulling on that thread, and the rest of the cell could be next.<br>One Agent handling many Sources is efficient. Many Agents handling a few Sources each is safer. The choice is yours.',
  netStep5T:'Put her to work',
  netStep5:'Agents can do more than handle Sources. Send Tachi to <b>Recruit</b>, and she’ll search Akkaro for people willing to join the cause.<br>Every operation takes time, and every operation carries some risk. Advance the day to let her work.',
  // the next day: Tachi, then Venn, feel the town tightening
  tenseTachi:'“Hey boss… checking in. It’s barely been a day and things are getting tenser. The lawmen have been patrolling Dustfall more intensely and I’ve got a good word from Maro that the Sheriff has asked the sector command for some security forces down here. If they come, things are gonna get real bad around here, real fast.”',
  tenseVenn:'“Some offworlders I don’t know are in my bar today… more strangers on the street acting suspicious. Something’s up, I don’t like it one bit.”',
  // Someone's Asking Questions: the guided steps (docs/TUTORIALS.md), then Lie Low
  asqStep1T:'A Lead',
  asqStep1:'The Bureau has a <b>Lead</b> on Maro Venn.<br>A node with a Lead gains Risk every day until the Lead goes cold. Keep contact to a minimum, or act before they close in.',
  asqStep2T:'Exposure',
  asqStep2:'<b>Exposure</b> is how close the Bureau is to finding the rebellion. Every Lead pushes it higher.<br><i>Click the <b>?</b> button to learn more about Leads.</i>',
  lieLowStep:'[TEXT NEEDED: the step pointing at Lie Low on Tachi’s rail: order her cell to lie low until the heat dies down]',
  // Cass: the Sheriff's bunker; the mission's name
  bunkerOffer:'“Hey firebrand! I just tried landing on Akkaro and got denied. DENIED! The sheer cheek of it; treating me like I’m a criminal or something. Ahem… Seems like things are getting pretty hot here with all the craziness you’ve been pulling off. So tell me… are you a gambler? If so, I know where the Sheriff’s secure bunker is. It’s got the rest of his ships in there too. I’m sure he’d be thrilled to donate them to you.”',
  raidBunker:'Raid the Bunker',
  // Tachi will find pilots
  tachiPilots:'“Venn told me about this job. He’s insane. And you are too if you’re actually going to try it… But you’re going to need more hands to do it so… I’ll do what I can.”',
  recruitPointer:'[TEXT NEEDED: pointer label at Recruit on Tachi’s rail]',
  // Cass: the Black Market; Sweet Tooth
  marketOffer:'“Ever heard of the Black Market? All those credits and nowhere to spend them… I know somebody you’re gonna love who can hook you up with some extra help.”',
  marketPointer:'[TEXT NEEDED: pointer label at the Black Market tab]',
  sweetTooth:'“Well, well, what do we have here? Aren’t you a fiery one? Cass told me all about your little project. I think you and I could become very fast friends, sugar! Need an extra hand? Why not try hiring a Merc?”',
  mercTut:'[TEXT NEEDED: the hire-a-mercenary tutorial: this mercenary will always be available here; hire them]',
  haulerBuy:'[TEXT NEEDED: the hauler tutorial: buy a second Graf hauler from the Black Market]',
  haulerHangar:'[TEXT NEEDED: the hauler tutorial: build Hangar room for 4 starfighters and 2 transports]',
  // Raid the Bunker: the plan's tutorial, and the card in the fight when the pilots can be called in
  bunkerPlan:'[TEXT NEEDED: the plan tutorial: add the second hauler as an asset; it brings the pilots in later as Reinforcements]',
  bunkerPass:'[TEXT NEEDED: the plan tutorial: load the three pilots into the reinforcements hauler (a Graf seats 4, so the fifth soldier rides with them)]',
  bunkerCallT:'[TEXT NEEDED: card title]',
  bunkerCall:'[TEXT NEEDED: the combat card: once it is safer, call the pilots in with Reinforcements from Fire Support, and they take the ships]',
  // the side beats (docs/FEEDBACK-0.2-HANDOFF.md §2): teaching a room when it becomes relevant
  sbBaseTab:'[TEXT NEEDED: pointer label at the Base tab: back to the base]',
  sbDig:'[TEXT NEEDED: pointer label at a rubble tile beside the room: excavate it to make space]',
  sbDayDig:'[TEXT NEEDED: pointer label at Advance day: the excavation takes a day]',
  sbBarracksTile:'[TEXT NEEDED: pointer label at a free floor tile beside the Barracks: bunks are full, build here to merge a bigger Barracks]',
  sbBarracksBuild:'[TEXT NEEDED: pointer label at Build on the Barracks card]',
  sbBarracksDay:'[TEXT NEEDED: pointer label at Advance day: the new Barracks tile is built overnight]',
  sbBunksT:'[TEXT NEEDED: card title, the Bunks upgrade]',
  sbBunks:'[TEXT NEEDED: card on the Barracks: the Bunks upgrade adds beds to every Barracks tile]',
  sbInfirmaryTile:'[TEXT NEEDED: pointer label at a free floor tile: someone came home hurt, build an Infirmary]',
  sbInfirmaryBuild:'[TEXT NEEDED: pointer label at Build on the Infirmary card]',
  sbInfirmaryT:'[TEXT NEEDED: card title, the Infirmary]',
  sbInfirmary:'[TEXT NEEDED: card on the Infirmary: the injured recover faster there]',
  sbWorkshopTile:'[TEXT NEEDED: pointer label at a free floor tile: a ship came home damaged, build a Workshop]',
  sbWorkshopBuild:'[TEXT NEEDED: pointer label at Build on the Workshop card]',
  sbWorkshopT:'[TEXT NEEDED: card title, the Workshop]',
  sbWorkshop:'[TEXT NEEDED: card on the Workshop: ships repair there]',
  // the affordability net (docs/FEEDBACK-0.2-HANDOFF.md §3.2): a beat's contact covers what the player can't afford
  affordGrant:'[TEXT NEEDED: the contact sends what’s missing]',
  // Sweet Tooth's line on the guaranteed Graf hauler lot before the frontier (PRO_GRAF_PRICE)
  grafFriend:'[TEXT NEEDED: Sweet Tooth, a friend-of-Cass price on the hauler]',
  btnNext:'Next',
  btnGotIt:'Got it',
  // debug builds only
  frontierToast:'End of the authored prologue: beat ',
};

/* ---------- the people the beats speak for who are not Sources ---------- */
const PRO_CAST={
  tachi:{name:'Tachi Gard',first:'Tachi',loc:'Akkaro'},
  sweettooth:{name:'Sweet Tooth',first:'Sweet Tooth',loc:'Nyx'},
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
  // Run Your Network (docs/TUTORIALS.md): the intro window, then the guided steps once it (or its field manual) closes.
  // Step 5 opens the Recruit operation; the tutorial ends when a Recruit starts.
  runNetwork:{win:'agentTutIntro',after:['agentTutIntro','srcTut'],steps:[
    {at:'tab:intel',title:'netStep1T',text:'netStep1',until:{tab:'intel'}},
    {at:'in.agent:tachi',title:'netStep2T',text:'netStep2',until:{inSel:'tachi'}},
    {at:'in.stats',title:'netStep3T',text:'netStep3',next:'btnNext',until:{next:true}},
    {at:'in.cell',title:'netStep4T',text:'netStep4',next:'btnGotIt',until:{next:true}},
    {at:'in.op:recruit',title:'netStep5T',text:'netStep5',opens:'op.recruit',until:{op:'recruit'}},
  ]},
  // Someone's Asking Questions (docs/TUTORIALS.md), then a step at Lie Low on Tachi's rail that opens it
  askingQuestions:{steps:[
    {at:'in.srclead:venn',title:'asqStep1T',text:'asqStep1',until:{inSel:'venn'}},
    {at:'in.exposure',title:'asqStep2T',text:'asqStep2',until:{inSel:{kind:'bureau'}}},
    {at:'in.op:lielow',text:'lieLowStep',opens:'op.lielow',until:{op:'lielow'}},
  ]},
  // beat 19: one pointer at Recruit on Tachi's rail (no tutorial: Recruit was taught in Run Your Network); skipped
  // while a Recruit is already running
  tachiRecruit:{steps:[
    {at:'in.op:recruit',label:'recruitPointer',done:h=>h.recruiting(),until:{op:'recruit'}},
  ]},
  // beat 20: a pointer at the Black Market tab
  marketTab:{steps:[
    {at:'tab:market',label:'marketPointer',until:{tab:'market'}},
  ]},
  // beat 21: hire the mercenary who is always on the stall
  hireMerc:{steps:[
    {at:'bm.lot:merc',text:'mercTut',until:{hired:true}},
  ]},
  // beat 22: make room in the Hangar (a hauler needs a large pad to land on), then buy the second hauler
  // beat 23: the plan for Raid the Bunker: the second hauler as an asset, then its passengers
  bunkerPlan:{steps:[
    {at:'plan.assetslot',text:'bunkerPlan',until:{asset:'graf'}},
    {at:'plan.pass',text:'bunkerPass',next:'btnGotIt',until:{next:true}},
  ]},
  hauler:{steps:[
    {at:'base.hangar',text:'haulerHangar',done:h=>h.hangarFits()},
    {at:'bm.lot:graf',text:'haulerBuy',done:h=>h.transports()>=2},
  ]},
  // the side beats' room tutorials (SIDE below). base.* steps point at the Base tab first while another screen is up.
  buildBarracks:{steps:roomSteps('barracks','sbBarracks',[
    {at:'base.day',label:'sbBarracksDay',until:{built:'barracks'}},
    {at:'base.room:barracks',title:'sbBunksT',text:'sbBunks',next:'btnGotIt',until:{next:true}},
  ])},
  buildInfirmary:{steps:roomSteps('infirmary','sbInfirmary',[
    {at:'base.room:infirmary',title:'sbInfirmaryT',text:'sbInfirmary',next:'btnGotIt',until:{next:true}},
  ])},
  buildWorkshop:{steps:roomSteps('workshop','sbWorkshop',[
    {at:'base.room:workshop',title:'sbWorkshopT',text:'sbWorkshop',next:'btnGotIt',until:{next:true}},
  ])},
};
/* the first steps of a room tutorial: back to the Base tab, excavate a space if there is no free floor (the rubble,
   then a day for the crew to clear it), the floor tile the base picks (h.roomTile: 'floor', 'dig' or 'wait'), Build. A step is skipped while its
   live check holds, so a player already doing it never waits on a pointer. */
function roomSteps(key,pre,rest){
  const building=h=>h.building(key);
  return [
    {at:'tab:base',label:'sbBaseTab',done:h=>h.onBase()||building(h)},
    {at:'base.dig:'+key,label:'sbDig',done:h=>building(h)||h.roomTile(key)!=='dig'},
    {at:'base.day',label:'sbDayDig',done:h=>building(h)||h.roomTile(key)!=='wait'},
    {at:'base.tile:'+key,label:pre+'Tile',done:h=>building(h)||h.tilePop()==='floor'},
    {at:'base.build:'+key,label:pre+'Build',done:building},
  ].concat(rest);
}

/* the prologue missions' authored rewards (docs/FEEDBACK-0.2-HANDOFF.md §3.2): each spec's rew is added to what its
   mission type pays. The numbers are set by tools/economy-smoke.js, which plays New Game to the frontier on them */
const PRO_REW={stealcross:{m:300},depotrun:{m:400},stealfuel:{m:300},rescuetachi:{m:650,c:600}};   // placeholder
/* the guaranteed Graf hauler's price before the frontier (a friend-of-Cass price); SHIP_PRICE after it */
const PRO_GRAF_PRICE=1000;   // placeholder
/* the affordability net: days a beat that needs a spend can sit unaffordable before its contact sends the shortfall */
const AFFORD_DAYS=2;   // placeholder
const AFFORD_EXTRA=0.10;   // the shortfall is sent with this much on top
/* Rescue Tachi's spec (beats 12 and 13) */
const TACHI={type:'ambush',ctx:{src:'venn',loc:'akkaro',region:'flats',target:'convoy'},
  name:'rescueTachi',npc:'tachi',recruit:false,follow:false,rew:PRO_REW.rescuetachi};

/* Raid the Bunker (beats 18, 19 and 23): Steal Ship with three ships pinned, five soldiers, and the pilots coming in later
   with the second hauler (r.reinforce: the plan's first transport asset carries them) */
const BUNKER={type:'stealship',scenario:'bunker',ctx:{src:'cass',loc:'akkaro',region:'flats',target:'secure bunker'},
  name:'raidBunker',ships:['cross','talon','talon'],req:{team:5,reinforce:1}};

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
   does:[{gate:'tab.missions'},{signal:{who:'cass',mission:'stealcross',spec:{rew:PRO_REW.stealcross},text:'crossOffer',follow:'crossFollow'}}],
   until:{accepted:'stealcross'}},
  // 5: the next day, Cass finds Sera Kest
  {id:'sera',starts:{day:1},
   setup:h=>{h.openGate('tab.missions');h.addMission('stealcross',{rew:PRO_REW.stealcross});},
   does:[{signal:{who:'cass',kind:'recruitSera',text:'seraFound'}},{news:{text:'seraNews',cls:'a',alert:true}}],
   until:{joined:{id:'sera'}}},
  // 6: Steal the Cross
  {id:'cross',needs:h=>h.cost(['marta']),from:'cass',
   setup:h=>{h.join('sera');h.restoreHauler();},
   until:{won:'stealcross'}},
  // 7: Maro Venn, a Prologue source, signals the depots job
  {id:'venn_arrives',
   setup:h=>h.winMission('stealcross'),
   does:[{source:{id:'venn',add:true,prologue:true}},{signal:{who:'venn',mission:'depotrun',spec:{rew:PRO_REW.depotrun},text:'depotsOffer'}},{news:{text:'vennNews',cls:'g',good:true}}],
   until:{accepted:'depotrun'}},
  // 8: Torch the Depots
  {id:'depots',
   setup:h=>{h.addSource('venn');h.addMission('depotrun',{rew:PRO_REW.depotrun});},
   until:{won:'depotrun'}},
  // 9: the next day, Cass's Steal Fuel signal; the onboarding job takes four soldiers
  {id:'fuel_offer',starts:{day:1},
   setup:h=>h.winMission('depotrun'),
   does:[{signal:{who:'cass',mission:'stealfuel',spec:{req:{team:4},rew:PRO_REW.stealfuel},text:'fuelOffer'}},{news:{text:'fuelNews',cls:'a',alert:true}}],
   until:{accepted:'stealfuel'}},
  // 10: Venn sends a recruit
  {id:'fuel_recruit',
   setup:h=>h.addMission('stealfuel',{req:{team:4},rew:PRO_REW.stealfuel}),
   does:[{comm:{who:'venn',text:'vennRecruit'}},{recruitOffer:{role:'Soldier',from:'venn',must:true}}],
   until:{joined:{role:'Soldier'}}},
  // 11: the plan's fire support slots open, and the Strafing Run callout
  {id:'fuel_plan',
   setup:h=>h.join('Soldier'),
   does:[{gate:'plan.assets'},{tutorial:'strafingRun'}],
   until:{won:'stealfuel'}},
  // 12: straight after Steal Fuel's reward, Venn asks the player to rescue Tachi Gard
  {id:'tachi_offer',
   setup:h=>{h.openGate('plan.assets');h.tutDone('strafingRun');h.winMission('stealfuel');},
   does:[{comm:{who:'venn',text:'tachiOffer'}},
     {mission:{id:'rescuetachi',from:'venn',spec:TACHI}}],
   until:{won:'rescuetachi'}},
  // 13: Tachi thanks the player and offers to watch out for them: accept
  {id:'tachi_joins',
   setup:h=>h.winMission('rescuetachi',TACHI),
   does:[{comm:{who:'tachi',text:'tachiThanks',accept:'tachi'}}],
   until:{accepted:'tachi'}},
  // 14: Tachi is the first Agent, posted to Akkaro with Cass and Venn as her cell; the Intelligence tab opens with
  // Run Your Network
  {id:'agents',
   does:[{agent:{from:'tachi',post:'akkaro',cell:['cass','venn']}},{gate:'tab.intel'},{tutorial:'runNetwork'}],
   until:{tutDone:'runNetwork'}},
  // 15: after the next day advances, Tachi's comm, then Venn's
  {id:'tense',starts:{day:1},
   setup:h=>{h.agent({from:'tachi',post:'akkaro',cell:['cass','venn']});h.openGate('tab.intel');h.openGate('op.recruit');h.tutDone('runNetwork');},
   does:[{comm:{who:'tachi',text:'tenseTachi'}},{comm:{who:'venn',text:'tenseVenn'}}],
   until:{reportClosed:true}},
  // 16: the Bureau's first Lead, on Venn: the Intelligence tab opens on Someone's Asking Questions, then Lie Low
  {id:'first_lead',
   does:[{lead:{on:'venn'}},{view:'intel'},{tutorial:'askingQuestions'}],
   until:{op:'lielow'}},
  // 17: the next beat starts the day after Lie Low is ordered (it doesn't wait for the 3 days to run out)
  {id:'lielow_wait',
   setup:h=>{h.lead('venn');h.openGate('op.lielow');h.tutDone('askingQuestions');h.lieLow('tachi');},
   until:{day:1}},
  // 18: Cass knows where the Sheriff's bunker is: Raid the Bunker goes on the board (its plan lists what is missing)
  {id:'bunker_offer',
   does:[{comm:{who:'cass',text:'bunkerOffer'}},
     {mission:{id:'raidbunker',from:'cass',spec:BUNKER}}],
   until:{accepted:'raidbunker'}},
  // 19: the next day, Tachi will find pilots: the next Recruit to finish brings three
  {id:'tachi_recruit',starts:{day:1},
   setup:h=>h.addMission('raidbunker',BUNKER),
   does:[{flag:{recruitAs:{role:'Pilot',n:3}}},{comm:{who:'tachi',text:'tachiPilots'}},{tutorial:'tachiRecruit'}],   // the flag holds from the start
   until:{joined:{role:'Pilot',n:3}}},
  // 20: Cass points the player at the Black Market
  {id:'market',
   setup:h=>{h.join('Pilot');h.join('Pilot');h.join('Pilot');},
   does:[{comm:{who:'cass',text:'marketOffer'}},{gate:'tab.market'},{tutorial:'marketTab'}],
   until:{tab:'market'}},
  // 21: the first time the tab opens, Sweet Tooth's intro, then hiring a mercenary (one always waits on the stall)
  {id:'sweet_tooth',needs:h=>h.cost(['merc']),from:'cass',
   setup:h=>h.openGate('tab.market'),
   does:[{marketLot:{cat:'merc',role:'Soldier',keep:true}},{comm:{who:'sweettooth',text:'sweetTooth'}},{tutorial:'hireMerc'}],
   until:{hired:true}},
  // 22: a second Graf hauler (always on the stall until bought) and Hangar room for 4 starfighters and 2 transports
  {id:'hauler',needs:h=>h.cost(['hangar','graf']),from:'cass',
   setup:h=>h.join('Soldier'),
   does:[{marketLot:{cat:'ship',id:'graf',keep:true}},{tutorial:'hauler'}],
   until:[h=>h.transports()>=2,h=>h.hangarFits()]},
  // 23: Raid the Bunker. The plan's tutorial points at the second hauler (Reinforcements) and its passengers; in the
  // fight, a card says when the pilots can be called in (the ground scene shows it: SR.mission.coach)
  {id:'bunker',
   setup:h=>{h.secondHauler();h.hangarRoom();},
   does:[{tutorial:'bunkerPlan'}],
   until:{won:'raidbunker'}},
  // DESIGN OPEN: security_arrives — security forces arrive at Akkaro. Waits on the regional Alert system.
  // {id:'security_arrives'},
  // DESIGN OPEN: campaign — Venn delivers the first Campaign, Liberate Akkaro. Waits on the Campaign design (CHAINS
  // is the nearest system) and a Destroy Squadron space scenario.
  // {id:'campaign'},
  // DESIGN OPEN: farewell — Akkaro liberated; Venn and Cass say goodbye and stop being Sources; Tessaly arrives with
  // the Sources tutorial. Waits on the two above.
  // {id:'farewell'},
  // the end of what is authored (§2.6)
  {id:'frontier'},
];

/* ---------- side beats (docs/FEEDBACK-0.2-HANDOFF.md §2.2) ----------
   A side beat fires once, the first time its condition holds (before or after the frontier), without moving
   G.prologue.at or holding up a main beat. Its actions go through the pop-up queue, never over a reward, a splash or
   the day banner. One runs at a time, the first in this list first: one that comes due sets aside a later one already
   running (its tutorial comes back after), so a room the player can't build yet never holds up the Barracks. Its until
   ends only its own tutorial: met early (the player built the room on their own), the tutorial skips to its closing
   cards. A main beat's tutorial goes first: one that starts while a side tutorial is up holds it until it ends.
   G.prologue.flags.side[id] is 'run' while it runs and 'done' after. Adding one means an entry here and its text. */
const SIDE=[
  {id:'room_barracks',when:h=>h.bunksFull(),does:[{tutorial:'buildBarracks'}],until:{built:'barracks'},needs:h=>h.cost(['room:barracks'])},
  {id:'room_infirmary',when:h=>h.anyInjured()&&!h.hasRoom('infirmary'),does:[{tutorial:'buildInfirmary'}],until:{built:'infirmary'}},
  {id:'room_workshop',when:h=>h.anyShipDamaged()&&!h.hasRoom('workshop'),does:[{tutorial:'buildWorkshop'}],until:{built:'workshop'}},
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

function fresh(day){return {at:PROLOGUE[0].id,since:day||1,live:true,flags:{tut:{},side:{},granted:{}},afford:{},gates:{},done:false};}
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
  if(!p.done){
    if(type==='day'){rearm();shortTick();affordTick();}
    check(type,arg);
  }
  sideHear(type,arg);   // after the main beat, so its windows queue first
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
/* a beat's actions run in order. A window waits its turn in the pop-up queue, and so does every action after it:
   "Venn's comm, then Rescue Tachi on the board" puts the mission up when the comm closes, not under it */
const WIN_ACTS=['comm','win','recruitOffer','view'];   // view: the game moves to a screen, in its turn
const isWinAct=a=>{const k=Object.keys(a)[0];return WIN_ACTS.includes(k)||(k==='tutorial'&&!!(PRO_TUTS[a[k]]||{}).win);};
function goLive(b){
  const p=P();
  p.live=true;p.since=H.G().day;p.w={};
  let waiting=false;
  for(const a of b.does||[]){
    if(waiting&&!isWinAct(a)){H.queue({act:a,beat:b.id});continue;}
    act(a,b);
    if(isWinAct(a))waiting=true;
  }
  H.kick();
}
/* one action: windows queue (they open in turn, after anything already queued); the rest happen now */
function act(a,b){
  const k=Object.keys(a)[0],v=a[k];
  if(k==='gate')openGate(v);
  else if(k==='ungate'){const p=P();delete p.gates[v];}
  else if(k==='flag'){const p=P();if(v&&typeof v==='object')Object.assign(p.flags,v);else p.flags[v]=1;}
  else if(k==='tutorial')startTut(v,isSide(b)?b.id:null);
  else if(k==='news')H.news(text(v.text),v);
  else if(k==='grant')H.grant(v);
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

/* §3.2 the affordability net: a beat (or a running side beat) that needs a spend (needs(h): what is still to pay,
   {c,m,s}) and has sat AFFORD_DAYS days without the player able to cover it brings the shortfall, and AFFORD_EXTRA on
   top, from its contact (from, else Venn): a comm, then the grant when it closes. Once per beat, before the frontier. */
function affordTick(){
  const p=P(),b=beat(),w=H.wallet();
  p.afford=p.afford||{};p.flags.granted=p.flags.granted||{};
  const due=[];
  if(b&&p.live&&b.needs)due.push(b);
  for(const s of running())if(s.needs)due.push(s);
  for(const x of due){
    if(p.flags.granted[x.id])continue;
    const need=x.needs(H)||{},miss={};let any=false;
    for(const k of ['c','m','s'])if(need[k]>w[k]){miss[k]=Math.ceil((need[k]-w[k])*(1+AFFORD_EXTRA)/10)*10;any=true;}
    if(!any){p.afford[x.id]=0;continue;}
    p.afford[x.id]=(p.afford[x.id]||0)+1;
    if(p.afford[x.id]<AFFORD_DAYS)continue;
    p.flags.granted[x.id]=1;
    act({comm:{who:x.from||'venn',text:'affordGrant'}},x);
    H.queue({act:{grant:miss},beat:x.id});
    H.kick();
  }
}

/* ---------- the stepper (guided tutorials) ---------- */
function startTut(key,side){
  const T=PRO_TUTS[key],p=P();
  if(!T||!p)return;
  p.flags.tut=p.flags.tut||{};
  if(p.flags.tut[key])return;
  if(T.win)H.queue({tut:key,win:T.win});
  if(!T.steps){p.flags.tut[key]=1;return;}   // an intro window on its own
  const t={key,i:0,wait:!!T.win};            // guided steps (after the intro window, if there is one)
  // a main beat's tutorial goes first; between side beats, the first in SIDE. The one set aside is held (p.held).
  if(side){
    t.side=side;
    if(p.tut&&!(p.tut.side&&sideRank(p.tut.side)>sideRank(side))){hold(t);return;}
  }
  if(p.tut&&p.tut.side)hold(p.tut);
  p.tut=t;
  if(!T.win)enterStep();
}
/* a side tutorial set aside comes back, first in SIDE order first, when the slot is free */
function hold(t){const p=P();p.held=(p.held||[]).filter(x=>x!==t);p.held.push(t);}
function unhold(){
  const p=P();if(p.tut||!(p.held||[]).length)return;
  p.held.sort((a,b)=>sideRank(a.side)-sideRank(b.side));
  p.tut=p.held.shift();enterStep();
}
/* a tutorial has ended: a side beat's ends its side beat; a held side tutorial comes back */
function tutEnded(t){
  const p=P();
  p.flags.tut[t.key]=1;
  if(p.tut===t)p.tut=null;
  p.held=(p.held||[]).filter(x=>x!==t);
  if(t.side)sideDone(t.side);
  unhold();
  emit('tutDone',t.key);H.kick();
}
/* a step that opens a mechanic opens it as it comes up (Run Your Network's Recruit) */
function enterStep(){
  const p=P(),T=p&&p.tut&&PRO_TUTS[p.tut.key],s=T&&T.steps[p.tut.i];
  if(s&&s.opens)openGate(s.opens);
  H.kick();
}
function stepHear(type,arg){
  const p=P();if(!p||!p.tut)return;
  const T=PRO_TUTS[p.tut.key];
  if(!T){p.tut=null;return;}
  if(p.tut.wait){   // the steps start when the intro window (or its field manual) closes
    if(type==='closed'&&(T.after||[T.win]).includes(arg)){p.tut.wait=false;enterStep();}
    return;
  }
  // an event can complete the current step or any live-checked step before it
  const i0=p.tut.i;
  for(let i=p.tut.i;i<T.steps.length;i++){
    const s=T.steps[i];
    if(s.until&&meets(s.until,type,arg,{})){p.tut.i=i+1;break;}
    if(!s.done||!s.done(H))break;
  }
  if(p.tut.i>=T.steps.length)tutEnded(p.tut);
  else if(p.tut.i!==i0)enterStep();
}
/* the step to show now: the first not yet met, skipping steps whose live check holds */
function step(){
  const p=P();if(!p||!p.tut||p.tut.wait)return null;
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

/* ---------- the side-beat runner ---------- */
const isSide=b=>SIDE.includes(b);
const sideOf=id=>SIDE.find(s=>s.id===id)||null;
const sideRank=id=>{const i=SIDE.findIndex(s=>s.id===id);return i<0?SIDE.length:i;};
const sideFlags=()=>{const p=P();p.flags.side=p.flags.side||{};return p.flags.side;};
const running=()=>SIDE.filter(s=>sideFlags()[s.id]==='run');
/* the tutorial a side beat has up, held, or none */
const sideTut=id=>{const p=P();return [p.tut].concat(p.held||[]).find(t=>t&&t.side===id)||null;};
/* one side beat at a time: one fires when none before it in SIDE is running (a later one running is set aside) */
function sideHear(type,arg){
  const p=P(),f=sideFlags();
  p.sideW=p.sideW||{};
  for(const s of running())if(s.until&&meets(s.until,type,arg,p.sideW[s.id]=p.sideW[s.id]||{}))sideMet(s);
  for(const s of SIDE){
    if(f[s.id]==='run')return;
    if(!f[s.id]&&s.when(H)){fireSide(s);return;}
  }
}
/* a side beat fires: its actions wait their turn in the pop-up queue */
function fireSide(s){
  const p=P();
  sideFlags()[s.id]='run';
  p.sideW=p.sideW||{};p.sideW[s.id]={};
  p.sideN=p.sideN||{};p.sideN[s.id]=0;
  for(const a of s.does||[]){   // a window queues itself; anything else waits its turn behind what is already queued
    if(isWinAct(a))act(a,s);
    else{p.sideN[s.id]++;H.queue({act:a,beat:s.id});}
  }
  if(!p.sideN[s.id])sideDone(s.id);
  H.kick();
}
function sideDone(id){
  const p=P();
  sideFlags()[id]='done';
  if(p.sideW)delete p.sideW[id];
  if(p.sideN)delete p.sideN[id];
}
/* the side beat's until is met: its tutorial skips to its closing cards (steps a Got it ends), or ends */
function sideMet(s){
  const p=P(),t=sideTut(s.id);
  if(!t){sideDone(s.id);return;}   // no tutorial up yet (still queued) or none: the side beat is over
  const T=PRO_TUTS[t.key];
  while(t.i<T.steps.length&&!(T.steps[t.i].until&&T.steps[t.i].until.next))t.i++;
  if(t.i<T.steps.length){if(p.tut===t)enterStep();return;}
  tutEnded(t);
}
/* debug: fire one now, whatever its condition (any other side beat running is set aside as done) */
function fireNow(id){
  const s=sideOf(id),p=P();if(!s||!p)return false;
  for(const o of running()){const t=sideTut(o.id);if(t){if(p.tut===t)p.tut=null;p.held=(p.held||[]).filter(x=>x!==t);}sideDone(o.id);}
  unhold();
  delete sideFlags()[id];
  for(const a of s.does||[])if(a.tutorial)delete p.flags.tut[a.tutorial];
  fireSide(s);
  return true;
}
/* a jump skips the moments it passes: side beats whose condition already holds are spent */
function spendSide(){const f=sideFlags();for(const s of SIDE)if(!f[s.id]&&s.when(H))f[s.id]='done';}
const sideState=id=>sideFlags()[id]||null;
/* a side beat added at runtime (the smoke test proves adding one means editing SIDE only) */
function addSide(s){SIDE.push(s);}

/* ---------- developer tools (§2.7) ---------- */
/* jump: a new game, every setup up to the beat, then the beat begins */
function jump(id){
  const i=ix(id);if(i<0)return false;
  H.reset();
  const p=P();
  for(let k=0;k<=i;k++){const b=PROLOGUE[k];if(b.setup)b.setup(H.setup);}
  p.at=id;p.since=H.G().day;p.live=false;p.w={};
  spendSide();
  H.afterJump(id);
  check(null,null);
  return true;
}
function openAll(){const p=P();if(p)p.gates['*']=1;}
function replayTuts(){const p=P();if(p){p.flags.tut={};p.flags.side={};p.tut=null;p.held=[];p.sideW={};p.sideN={};}}
/* a beat added at runtime (the smoke test proves adding a beat means editing PROLOGUE only) */
function addBeat(b,beforeId){const i=ix(beforeId||'frontier');PROLOGUE.splice(i<0?PROLOGUE.length:i,0,b);}

/* the cast (a person the beats speak for), and an action run later from the pop-up queue */
const cast=id=>PRO_CAST[id]?Object.assign({id},PRO_CAST[id]):null;
function run(a,beatId){
  const sd=sideOf(beatId),p=P();
  if(sd&&sideState(beatId)!=='run')return;   // a side beat that ended before its turn in the queue came
  const b=PROLOGUE[ix(beatId)]||sd||{id:beatId};act(a,b);
  // a side beat whose last action has run, with no tutorial of its own up, is over
  if(sd){p.sideN=p.sideN||{};p.sideN[beatId]=(p.sideN[beatId]||1)-1;if(p.sideN[beatId]<=0&&sideState(beatId)==='run'&&!sideTut(beatId))sideDone(beatId);}
  H.kick();
}

window.Pro={PROLOGUE,SIDE,PRO_TEXT,PRO_TUTS,PRO_CAST,GATES,SHORT_DAYS,PRO_REW,PRO_GRAF_PRICE,AFFORD_DAYS,cast,run,hostAct:(k,v)=>H.act[k](v,{id:'setup'}),
  bind:h=>{H=h;},onGate:f=>onGate.push(f),fresh,
  emit,check,at,past,done:isDone,gate,openGate,text,beat:()=>{const b=beat();return b&&b.id;},live:()=>{const p=P();return !!(p&&p.live);},
  step,tutSeen,startTut,rearm,
  jump,openAll,replayTuts,addBeat,index:ix,
  side:sideState,sideRunning:()=>P()?running().map(s=>s.id):[],fireSide:fireNow,addSide};
})();
