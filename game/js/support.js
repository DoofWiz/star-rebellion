'use strict';
/* =====================================================================
   STAR REBELLION — Support specialties (the Support Specialties doc)
   Support rebels run the revolution from the base. Each is recruited with a
   base specialty (Doctor, Mechanic...) that works in one home room; at level 3
   they can train a niche in the Training Hall's classroom; the niche gains an
   unlock at levels 3, 7, 11, 15 and 19, with a permanent fork (A or B) at 7 and 15.
   Every unlock, and every base-specialty effect, is a Job (work that runs in
   parallel: more specialists, more capacity), a Rule (changes how the game works;
   never stacks: only one rebel's version applies in a room) or a Posting (works
   out in the galaxy; postings wait on the Network, DESIGN_BLOCKERS M-32).
   In a room:
   - the Department Head is the highest-level rebel of the room's base specialty;
     their level sets the strength of the base specialty's Rules;
   - each niche has a Lead Specialist (the highest level, unless the player names
     another, which takes a day to hand over); the Lead's level and forks decide
     which of the niche's Rules are on;
   - everyone else is Staff: they run any Job the Lead has unlocked plus fork Jobs
     of their own, and learn 50% faster under a higher-level Lead.
   This file is the data and the arithmetic; base.js runs the jobs, the effects
   and the screens. `live` marks what the game does today; the rest is listed so
   the player can see what a niche will bring, with `needs` naming what is missing.
   ===================================================================== */
(function(){
  /* base specialties: home room, the two base effects, the three niches (Crewman is parked until capital ships) */
  const SPEC={
    doctor:{n:'Doctor',room:'infirmary',d:'Keeps rebels alive and gets the injured back into action.',niches:['cyberneticist','chemist','physio']},
    intel:{n:'Intelligence Officer',room:'comms',d:'Turns information into advantage and keeps the network alive.',niches:['analyst','handler','counterintel']},
    mechanic:{n:'Mechanic',room:'workshop',d:'Repairs and improves ships, vehicles and bots, and makes explosives.',niches:['aerogineer','roboticist','ordnance']},
    support_technician:{n:'Technician',room:'techlab',d:'Electronics: hacking, weapon modification and communications.',niches:['slicer','armourer','signals']},
    logistics:{n:'Logistics Specialist',room:'store',d:'Makes sure gear, supplies and people get where they need to go.',niches:['quartermaster','procurer','smuggler']},
    academic:{n:'Academic',room:'training',d:'Trains the revolution’s people and pushes its knowledge forward.',niches:['instructor','scientist']},
    diplomat:{n:'Diplomat',room:'diplo',d:'Raises support for the revolution and weakens the Hegemony’s hold.',niches:['propagandist','envoy','agitator']},
    control:{n:'Mission Control',room:'command',d:'Supports missions live from the base.',niches:['tactician','flightctl','combatsupport']},
  };
  const SPEC_ORDER=Object.keys(SPEC);
  const NICHE={
    cyberneticist:{n:'Cyberneticist',d:'Replaces and improves bodies: prosthetics, then augments for anyone willing.'},
    chemist:{n:'Chemist',d:'Brews stims and adrenals, and supplies the Combat Medic.'},
    physio:{n:'Physio',d:'Speeds recovery and builds rebels’ physical condition, one rebel at a time.'},
    analyst:{n:'Analyst',d:'Decodes data and predicts what the Hegemony will do next.'},
    handler:{n:'Handler',d:'Supports the player’s Agents and the cells they run.'},
    counterintel:{n:'Counterintelligence',d:'Fights Exposure and turns the Bureau’s own methods against it.'},
    aerogineer:{n:'Aerogineer',d:'Maintains, tunes and refits ships.'},
    roboticist:{n:'Roboticist',d:'Builds and modifies autos, bots and drones, and turns captured machines.'},
    ordnance:{n:'Ordnance Tech',d:'Makes the revolution’s explosives, for ground and space.'},
    slicer:{n:'Slicer',d:'Breaks into Hegemony systems from the base.'},
    armourer:{n:'Armourer',d:'Modifies weapons and makes attachments and special ammunition.'},
    signals:{n:'Signals',d:'Secures communications, removes trackers and listens in on the Hegemony.'},
    quartermaster:{n:'Quartermaster',d:'Runs the Arsenal and makes sure squads deploy well equipped.'},
    procurer:{n:'Procurer',d:'Sources the materials the crafting niches need.'},
    smuggler:{n:'Smuggler',d:'Works the Black Market and moves people and goods where the Hegemony isn’t looking.'},
    instructor:{n:'Instructor',d:'Runs training in the Training Hall for every kind of rebel.'},
    scientist:{n:'Scientist',d:'Researches new technology and reverse-engineers the Hegemony’s.'},
    propagandist:{n:'Propagandist',d:'Spreads the revolution’s message and brings in recruits.'},
    envoy:{n:'Envoy',d:'Negotiates with neutral factions and brings them into the revolution.'},
    agitator:{n:'Agitator',d:'Erodes Hegemony stability and pushes worlds towards open revolt.'},
    tactician:{n:'Tactician',d:'Plans and supports ground missions.'},
    flightctl:{n:'Flight Controller',d:'Plans and supports space missions.'},
    combatsupport:{n:'Combat Support',d:'Coordinates fire support for ground missions from the base.'},
  };
  for(const s in SPEC)for(const n of SPEC[s].niches)NICHE[n].spec=s;

  /* What a missing system is called on the dossier ("Needs …") */
  const NEEDS={
    network:'the Network (Agents, Cover, Leads)',posting:'postings (the Network)',warning:'Hegemony actions to warn of',
    implants:'implants',stims:'carried stims',gadgets:'specialty gadgets as items',utilities:'ship Utilities',attach:'weapon attachments',
    crafting:'crafting',research:'research',factions:'neutral factions',stability:'Hegemony stability',trackers:'trackers on Hegemony items',
    gearwear:'gear damage',decay:'Support decay',capital:'capital ships',bureau:'the Bureau',neighbours:'neighbouring worlds',
    drones:'drones',deploy:'deployment zones',approach:'mission approaches',autos:'building Autos',later:'a later build',leader:'the Leader’s Take Point (M-13)',
  };
  /* Base-specialty effects: one Job and one Rule each. */
  const B=(spec,k,n,t,d,o)=>Object.assign({spec,k,n,t,d,lv:1,f:''},o||{});
  const BASE=[
    B('doctor','treatment','Treatment','job','Each Doctor treats up to 2 injured rebels at once. They heal 50% faster, rising to 100% at level 19. The rest heal at the untreated rate.',{live:1}),
    B('doctor','stabilise','Stabilise','rule','While a Doctor is on base, a rebel who would die on a mission has a chance to survive in Critical Condition instead: 20% at level 1, rising to 50% at level 19. Critical Condition only heals under Treatment.',{live:1}),
    B('intel','processing','Processing','job','Each Intelligence Officer processes reports from up to 3 Sources: their Intel yield is 25% higher. The Intelligence Center needs an officer to run at all.',{live:1}),
    B('intel','warning','Early Warning','rule','Warning of incoming Hegemony actions arrives 1 day earlier, rising to 4 days at level 19.',{needs:'warning'}),
    B('mechanic','repairs','Repairs','job','Each Mechanic repairs one damaged ship, vehicle or bot at a time, faster with level. Everything else repairs at the untended rate.',{live:1}),
    B('mechanic','salvage','Salvage','rule','More Materials are recovered after missions: +10%, rising to +40% at level 19.',{live:1}),
    B('support_technician','workshop','Gadget Workshop','job','Each Technician builds or recharges one limited-use gadget at a time, such as a Hack Pad, Decoy or Stim Pistol.',{needs:'gadgets'}),
    B('support_technician','maintenance','Maintenance','rule','A Med Pack, grenade or charge used on a mission has a chance to come back: 10%, rising to 40% at level 19.',{live:1}),
    B('logistics','handling','Supply Handling','job','Each Logistics Specialist handles up to 3 supply-producing Sources: their Supplies yield is 25% higher.',{live:1}),
    B('logistics','inventory','Inventory Control','rule','The Arsenal holds more: +4 slots, rising to +20 at level 19.',{live:1}),
    B('academic','tutoring','Tutoring','job','Each Academic tutors one other Support rebel at a time: they gain experience 50% faster.',{live:1}),
    B('academic','curriculum','Curriculum','rule','Classroom training takes less time: a day less from level 7, two from level 15 (never under 1 day).',{live:1}),
    B('diplomat','outreach','Outreach','job','Each Diplomat works one world at a time with a team (a Diplomatic Task): local Support there rises by ½ a flag, plus 25%.',{live:1}),
    B('diplomat','goodwill','Goodwill','rule','Local Support decays more slowly everywhere, improving with level.',{needs:'decay'}),
    B('control','missionsupport','Mission Support','job','Each Mission Control specialist supports one mission at a time: the squad starts steadier (+10 Cool), and an unflown mission is likelier to succeed.',{live:1}),
    B('control','briefings','Briefings','rule','Mission briefings show the opposition: how many from level 1, which types from level 7.',{live:1}),
  ];
  /* Niche unlocks. lv 3, 7 (fork A/B), 11, 15 (fork A/B), 19. t: job, rule, posting. base: base only. lead: Lead only.
     cd: cooldown in days. */
  const X=(niche,lv,f,k,n,t,d,o)=>Object.assign({niche,lv,f,k,n,t,d},o||{});
  const UNLOCKS=[
    // Doctor
    X('cyberneticist',3,'','prosthetics','Prosthetics','job','Fit a basic prosthetic to a rebel who has lost a limb or an eye: they can fight again, with a small penalty (−1 aim for an arm or eye, a little slower on a leg). Costs supplies, takes 5 days.',{base:1,live:1}),
    X('cyberneticist',7,'A','combatlimbs','Combat Limbs','job','Fit prosthetics with no penalty and a chosen variant: a stabilised arm (+1 aim) or a runner’s leg (faster). Can refit an existing prosthetic.',{base:1,live:1}),
    X('cyberneticist',7,'B','rapidfit','Rapid Fitting','job','Fit a basic prosthetic in half the time for half the supplies.',{live:1}),
    X('cyberneticist',11,'','augments','Augments','job','A healthy rebel can volunteer for one implant: Targeting Eye (+Aim), Dermal Plating (damage reduction), Pain Dampener (no panic from being wounded).',{base:1,needs:'implants'}),
    X('cyberneticist',15,'A','salvage','Hegemony Salvage','rule','Elite Hegemony enemies killed on missions can drop stronger implants. They carry a tracker that adds Exposure every week until a Signals tech scrubs it.',{needs:'implants'}),
    X('cyberneticist',15,'B','secondslot','Second Slot','rule','Rebels can hold two implants.',{needs:'implants'}),
    X('cyberneticist',19,'','rebuilt','Rebuilt','rule','Once every 30 days, a rebel who would die on a mission is recovered and rebuilt instead: back after 14 days with two implants, a permanent change and the title “Rebuilt”.',{cd:30,needs:'implants'}),
    X('chemist',3,'','stims','Stims','job','Brew one-use combat stims into the Arsenal as gadgets: Focus Stim (+Aim for one attack) and Steady Stim (+Cool).',{needs:'stims'}),
    X('chemist',7,'A','adrenals','Adrenals','job','Brew stronger one-use adrenals: Surge (an extra move this turn) and Fearless (ignore panic this turn). The user is Crashed (−Aim) on their next turn.',{needs:'stims'}),
    X('chemist',7,'B','helix','Helix-Grade Medicine','job','Brew improved healing stims that heal more and stop bleeding, usable by anyone and in the Combat Medic’s Stim Pistol.',{needs:'stims'}),
    X('chemist',11,'','stimrounds','Stim Rounds','job','Brew rounds for the Combat Medic’s Stim Pistol: Purge (clears panic on an ally at range) and Sedative (an enemy hit moves at half speed next turn).',{needs:'gadgets'}),
    X('chemist',15,'A','cleanformula','Clean Formula','rule','Stims and adrenals brewed here have no side effects and last one extra turn.',{needs:'stims'}),
    X('chemist',15,'B','massprod','Mass Production','rule','Every brewing Job here makes two items instead of one.',{needs:'stims'}),
    X('chemist',19,'','compound','Signature Compound','rule','A unique compound you name. Brewing one takes 7 days. Once per mission, the whole squad ignores panic and gains an extra action for a round.',{needs:'stims'}),
    X('physio',3,'','rehab','Rehab','job','Each Physio runs rehab for up to 2 injured rebels: they recover 25% faster, on top of Treatment, and their injury penalties are halved.',{live:1}),
    X('physio',7,'A','conditioning','Conditioning','job','Works with one rebel in specialty training at a time: their training takes 25% less time.',{live:1}),
    X('physio',7,'B','strength','Strength Programme','job','Trains one healthy rebel over 14 days: +3 Agility or +3 Constitution, up to 2 programmes per rebel.',{base:1,live:1}),
    X('physio',11,'','peak','Peak Condition','rule','Rebels finishing Rehab, Conditioning or a Strength Programme start their next mission faster on their feet and steadier (+10 Cool).',{live:1}),
    X('physio',15,'A','scartissue','Scar Tissue','rule','An injury healed through Rehab has a 25% chance to leave a small permanent bonus (+2 to a skill) instead.',{live:1}),
    X('physio',15,'B','walkitoff','Walk It Off','rule','Rebels laid up with minor injuries (3 days or less to go) can go on missions, a little slower.',{live:1}),
    X('physio',19,'','ironcon','Iron Constitution','rule','Once per mission, each rebel shrugs off the hit that would have downed them and stays up with 1 health.',{live:1}),
    // Intelligence Officer
    X('analyst',3,'','decryption','Decryption','job','Works on one decode at a time, such as a source’s encoded data, at double speed.',{live:1}),
    X('analyst',7,'A','pattern','Pattern Analysis','job','Analyse a world to reveal its Hegemony presence in detail and its next garrison change.',{needs:'warning'}),
    X('analyst',7,'B','vetting','Source Vetting','job','Vet a potential Source before taking them on, to reveal whether they are a plant or prone to panic.',{needs:'bureau'}),
    X('analyst',11,'','missionintel','Mission Intel','job','Analyse an upcoming mission: the briefing shows the opposition, and every enemy shows on the mission’s minimap.',{live:1}),
    X('analyst',15,'A','predictive','Predictive Model','rule','Early Warning time is doubled.',{needs:'warning'}),
    X('analyst',15,'B','datamining','Data Mining','rule','Each completed decode has a 30% chance to turn up 3 extra Intel. (A lead on a new Source waits on the Network.)',{live:1}),
    X('analyst',19,'','readbureau','Read the Bureau','rule','See which Lead the Bureau is pursuing and how many days until it acts.',{needs:'bureau'}),
    X('handler',3,'','handling','Handling','job','Supports up to 2 Agents: each gains +1 cell capacity and +Tradecraft.',{needs:'network'}),
    X('handler',7,'A','coaching','Cultivation Coaching','job','Supported Agents gain +Rapport, improving cultivation dialogue outcomes.',{needs:'network'}),
    X('handler',7,'B','cover','Cover Stories','job','Supported Agents lose no Cover while in transit.',{needs:'network'}),
    X('handler',11,'','fieldvisit','Field Visit','posting','Travel to a supported Agent’s location: Visits to Sources in that cell raise half as much Risk.',{needs:'posting'}),
    X('handler',15,'A','deaddrops','Dead Drops','rule','Contacting Sources in supported cells raises half as much Risk.',{needs:'network'}),
    X('handler',15,'B','deepcover','Deep Cover','rule','When a Source in a supported cell is burned, the Bureau extracts one fewer Lead.',{needs:'network'}),
    X('handler',19,'','ghostnet','Ghost Network','rule','Once every 30 days, a burned Source in a supported cell gives the Bureau no Leads at all.',{cd:30,needs:'network'}),
    X('counterintel',3,'','damagectl','Damage Control','job','Work the case of one captured Source: their interrogation clock gains 2 days.',{needs:'network'}),
    X('counterintel',7,'A','sweep','Sweep','job','Sweep one Agent or cell over 5 days to remove one active Lead on it.',{needs:'network'}),
    X('counterintel',7,'B','molehunt','Mole Hunt','job','Investigate one Source or rebel to expose a double agent.',{needs:'network'}),
    X('counterintel',11,'','disinfo','Disinformation','job','Feed false information through a captured Source: the Bureau’s next action targets a decoy, which can set up an ambush mission.',{needs:'network'}),
    X('counterintel',15,'A','cleanhouse','Clean House','rule','Exposure decays twice as fast.',{needs:'network'}),
    X('counterintel',15,'B','compartment','Compartmentalisation','rule','A captured Agent cannot give up a Lead on the Intelligence Center.',{needs:'network'}),
    X('counterintel',19,'','turntrap','Turn the Trap','rule','Once every 60 days, when the Bureau acts on a Lead, its raid becomes a rebel ambush with bonus rewards.',{cd:60,needs:'network'}),
    // Mechanic
    X('aerogineer',3,'','refit','Refit','job','Refits ships quickly: changing a ship’s weapons in the Arsenal takes no time with an Aerogineer, 2 days without.',{base:1,live:1}),
    X('aerogineer',7,'A','tuning','Fighter Tuning','job','Tune a starfighter over 4 days: permanently harder to hit (+1) or faster (+1 top speed). One tune per ship.',{base:1,live:1}),
    X('aerogineer',7,'B','frames','Heavy Frames','job','Reinforce a transport or bomber over 4 days: permanently +15 hull. One per ship.',{base:1,live:1}),
    X('aerogineer',11,'','preflight','Pre-flight Checks','job','Prepares up to 2 ships before a space mission: they start with an extra shield layer.',{live:1}),
    X('aerogineer',15,'A','hotrod','Hot-Rodded','rule','Ships can take a second tune or reinforcement.',{live:1}),
    X('aerogineer',15,'B','scavenger','Scavenger’s Eye','rule','Enemy ships destroyed in space missions are salvaged for Materials.',{live:1}),
    X('aerogineer',19,'','franken','Frankenship','job','Combine two wrecked ships of the same class into one unique ship with a trait from each.',{base:1,lead:1,needs:'utilities'}),
    X('roboticist',3,'','droneshop','Drone Workshop','job','Build basic drones as gadgets: Recon Drone (reveals an area) and Repair Drone (restores a vehicle or bot in the field).',{base:1,needs:'drones'}),
    X('roboticist',7,'A','combatautos','Combat Autos','job','Build an Auto that can fill a squad slot on missions.',{base:1,needs:'autos'}),
    X('roboticist',7,'B','utildrones','Utility Drones','job','Build Medic Drones (carry one stim to an ally) and Shield Drones (give one ally cover in the open).',{base:1,needs:'drones'}),
    X('roboticist',11,'','reprogram','Reprogramming','job','Bots hacked by a Field Technician on a mission can be recovered and reprogrammed to join the revolution. (Hacked Autos already join without one.)',{base:1,needs:'autos'}),
    X('roboticist',15,'A','chassis','Reinforced Chassis','rule','Autos and bots built or reprogrammed here gain armour and health.',{needs:'autos'}),
    X('roboticist',15,'B','overclock','Overclock','rule','Drones built here get one extra use per mission.',{needs:'drones'}),
    X('roboticist',19,'','masterauto','Masterwork Auto','job','Build one unique named Auto with its own personality, which levels up like a rebel.',{base:1,lead:1,needs:'autos'}),
    X('ordnance',3,'','munitions','Munitions','job','Craft grenades and Explosive Charges, which some missions require.',{needs:'crafting'}),
    X('ordnance',7,'A','heavyord','Heavy Ordnance','job','Craft rockets and anti-vehicle munitions for Assault weapons.',{needs:'crafting'}),
    X('ordnance',7,'B','shipord','Ship Ordnance','job','Craft bombs and torpedoes for Bomber and Shipbuster pilots.',{base:1,needs:'crafting'}),
    X('ordnance',11,'','charges','Specialist Charges','job','Craft Breaching Charges, EMP Grenades and Smoke Grenades.',{needs:'crafting'}),
    X('ordnance',15,'A','biggerbang','Bigger Bang','rule','Explosives made here have +50% blast radius.',{needs:'crafting'}),
    X('ordnance',15,'B','smartfuse','Smart Fuses','rule','Thrown explosives made here scatter half as much.',{needs:'crafting'}),
    X('ordnance',19,'','warhead','Signature Warhead','job','Craft one unique heavy charge, one per mission, that destroys a fixed objective or a vehicle outright.',{base:1,lead:1,needs:'crafting'}),
    // Technician
    X('slicer',3,'','prehack','Pre-hack','job','Before a mission, slice into its systems: the first Hegemony Auto on the map starts it under rebel control (or a terminal hack starts one round from done).',{live:1}),
    X('slicer',7,'A','datatap','Data Tap','job','Keep a data tap on a Hegemony network at one world: +1 Intel a day there, and network exposure creeps up.',{live:1}),
    X('slicer',7,'B','overwatch','Overwatch','job','Supports one mission live: Field Technician hacks in it take one round.',{live:1}),
    X('slicer',11,'','maptheft','Map Theft','job','Before a mission, download the facility layout: the whole mission map is revealed.',{live:1}),
    X('slicer',15,'A','backdoors','Backdoors','rule','A Field Technician’s hack that is broken off keeps its progress instead of starting again. (Hacked Autos already stay ours.)',{live:1}),
    X('slicer',15,'B','ghost','Ghost Protocol','rule','Slicer Jobs no longer raise network exposure.',{live:1}),
    X('slicer',19,'','blackout','Blackout','job','Once every 30 days, take a world’s Hegemony network down for 5 days: no enemy reinforcements on missions there.',{lead:1,cd:30,live:1}),
    X('armourer',3,'','attachments','Attachments','job','Craft basic weapon attachments: scopes, extended magazines and grips.',{needs:'attach'}),
    X('armourer',7,'A','precision','Precision Work','job','Craft attachments for long-range weapons, which suit the Marksman.',{needs:'attach'}),
    X('armourer',7,'B','heavymods','Heavy Mods','job','Craft attachments for heavy weapons, such as bipods and cooling jackets, which suit the Gunner.',{needs:'attach'}),
    X('armourer',11,'','specialammo','Special Ammunition','job','Craft armour-piercing rounds and overcharged plasma cells.',{needs:'crafting'}),
    X('armourer',15,'A','masterwork','Masterwork','rule','Attachments made here carry one extra small bonus.',{needs:'attach'}),
    X('armourer',15,'B','refurbish','Refurbish','rule','Weapons can be upgraded one tier, once per weapon.',{needs:'crafting'}),
    X('armourer',19,'','sigweapon','Signature Weapon','job','Turn one weapon into a named weapon with a unique trait.',{base:1,lead:1,needs:'crafting'}),
    X('signals',3,'','scrubbing','Scrubbing','job','Remove trackers from captured Hegemony ships, gear and implants.',{needs:'trackers'}),
    X('signals',7,'A','commsec','Comms Security','job','Secure comms for one mission: it adds half as much Exposure.',{needs:'network'}),
    X('signals',7,'B','intercept','Intercept','job','Listen to Hegemony traffic at one world: Early Warning there doubles.',{needs:'warning'}),
    X('signals',11,'','jamming','Jamming','job','Jam one mission: the Hegemony cannot call reinforcements for the first 3 rounds.',{needs:'network'}),
    X('signals',15,'A','spoofing','Spoofing','rule','Hegemony fire support and reinforcement calls have a 25% chance to fail.',{needs:'network'}),
    X('signals',15,'B','quietnet','Quiet Network','rule','Agents’ Cover recovers twice as fast.',{needs:'network'}),
    X('signals',19,'','falseflag','False Flag','job','Once every 30 days, a fake order pulls Hegemony forces from a world: its Security drops by 1 for 7 days.',{lead:1,cd:30,needs:'network'}),
    // Logistics
    X('quartermaster',3,'','kitprep','Kit Prep','job','Prepare one squad before a mission: each member carries one extra grenade or stim.',{needs:'stims'}),
    X('quartermaster',7,'A','spareparts','Spare Parts','job','Repair damaged gear and weapons.',{needs:'gearwear'}),
    X('quartermaster',7,'B','requisitions','Requisitions','job','Convert surplus gear into supplies or credits.',{needs:'crafting'}),
    X('quartermaster',11,'','cache','Forward Cache','posting','At the posted world, missions start with a supply crate on the map.',{needs:'posting'}),
    X('quartermaster',15,'A','standard','Standard Issue','rule','Every rebel deploys with a basic medkit at no cost.',{needs:'stims'}),
    X('quartermaster',15,'B','wastenot','Waste Not','rule','Consumables not used on a mission are always recovered.',{needs:'stims'}),
    X('quartermaster',19,'','kitall','Kit for Everyone','rule','New recruits arrive with a full basic kit, and gear lost on failed missions has a 50% chance to come back.',{needs:'gearwear'}),
    X('procurer',3,'','sourcing','Sourcing','job','Run a procurement order for crafting materials.',{needs:'crafting'}),
    X('procurer',7,'A','bulk','Bulk Buying','job','Procurement orders yield 50% more.',{needs:'crafting'}),
    X('procurer',7,'B','contacts','Specialist Contacts','job','Source rare materials for high-tier crafting.',{needs:'crafting'}),
    X('procurer',11,'','supplylines','Supply Lines','posting','At the posted world, supply-producing Sources yield 50% more.',{needs:'posting'}),
    X('procurer',15,'A','insider','Corporate Insider','rule','CEO-type Sources also yield credits.',{needs:'crafting'}),
    X('procurer',15,'B','deepstores','Deep Stores','rule','All crafting costs 25% fewer materials.',{needs:'crafting'}),
    X('procurer',19,'','shadowecon','Shadow Economy','rule','Weekly credits and materials for each world at Network stage or higher.',{needs:'network'}),
    X('smuggler',3,'','specialorder','Special Order','job','Ask for a kind of item: one of them is in the Black Market’s next restock.',{live:1}),
    X('smuggler',7,'A','fence','Fence','job','Gear sold from the Arsenal fetches twice the price.',{live:1}),
    X('smuggler',7,'B','haggler','Haggler','rule','Black Market prices are 15% lower.',{live:1}),
    X('smuggler',11,'','runs','Smuggling Runs','job','Black Market deliveries arrive in half the time.',{live:1}),
    X('smuggler',15,'A','insideline','Inside Line','rule','Every 3 days the Black Market swaps 2 of its lots, as well as its weekly restock.',{live:1}),
    X('smuggler',15,'B','rarefinds','Rare Finds','rule','Ships and vehicles turn up on the Black Market twice as often.',{live:1}),
    X('smuggler',19,'','haven','Smuggler’s Haven','rule','Choose one world as a haven: postings and Agents there cannot be named in Bureau Leads.',{needs:'network'}),
    // Academic
    X('instructor',3,'','drill','Drill','job','Supervises the Training Hall: specialty training takes 25% less time, and rebels training there learn 50% faster.',{base:1,live:1}),
    X('instructor',7,'A','crosstrain','Cross-Training','job','Teach a rebel one more specialty alongside their own. One per rebel.',{base:1,live:1}),
    X('instructor',7,'B','fasttrack','Fast-Track','job','A rebel in specialty training also gains experience while training.',{base:1,live:1}),
    X('instructor',11,'','lessons','Battle Lessons','rule','Rebels who have trained under an Instructor gain 25% more experience from missions.',{live:1}),
    X('instructor',15,'A','range','Expanded Range','rule','The practice range, flight simulator and classroom each take one more trainee.',{live:1}),
    X('instructor',15,'B','mentors','Veteran Mentors','rule','A level 11+ rebel resting at base counts as an Instructor for Drill.',{live:1}),
    X('instructor',19,'','academy','Academy','rule','New recruits arrive at level 2.',{live:1}),
    X('scientist',3,'','research','Research','job','Work on one research project at a time; projects unlock new blueprints for the crafting niches.',{base:1,needs:'research'}),
    X('scientist',7,'A','reverse','Reverse Engineering','job','Turn captured Hegemony tech into blueprints.',{base:1,needs:'research'}),
    X('scientist',7,'B','fieldstudy','Field Studies','job','Study a world’s science or industry for a one-off reward.',{needs:'research'}),
    X('scientist',11,'','prototype','Prototype Testing','job','Send a prototype item with a squad: an extra effect and a chance to fail.',{needs:'research'}),
    X('scientist',15,'A','breakthrough','Breakthrough','rule','Research projects have a 15% chance to complete instantly.',{needs:'research'}),
    X('scientist',15,'B','peers','Peer Network','rule','Each Scientist or Professor Source speeds research by 10%.',{needs:'research'}),
    X('scientist',19,'','revscience','Revolutionary Science','job','Work on one unique capstone project, such as a cloaking device or a prototype starfighter.',{base:1,lead:1,needs:'research'}),
    // Diplomat
    X('propagandist',3,'','broadcasts','Broadcasts','job','Run a 5-day campaign at one world: local Support rises by ½ a flag and a new recruit may answer.',{live:1}),
    X('propagandist',7,'A','drive','Recruitment Drive','job','A campaign aimed at recruits: two candidates answer, one a level higher.',{live:1}),
    X('propagandist',7,'B','herostories','Hero Stories','job','Publicise the last mission won at a world: a whole flag of Support there. Raises network exposure.',{live:1}),
    X('propagandist',11,'','rallying','Rallying Cry','rule','Missions at a world with a campaign running start steadier (+10 Cool).',{live:1}),
    X('propagandist',15,'A','viral','Viral','rule','Campaigns also lift Support at half strength on every other world where we have Access.',{live:1}),
    X('propagandist',15,'B','martyrs','Martyrs','rule','A rebel’s death raises Support where they fell, and the base mourns them less.',{live:1}),
    X('propagandist',19,'','symbol','Symbol of the Revolution','rule','All Revolution progress is increased by 15%.',{live:1}),
    X('envoy',3,'','negotiation','Negotiation','job','Open talks with a neutral faction at one world.',{needs:'factions'}),
    X('envoy',7,'A','alliance','Alliance','job','An allied faction sends reinforcements on missions at its world.',{needs:'factions'}),
    X('envoy',7,'B','tradepact','Trade Pact','job','An allied faction provides supplies or credits.',{needs:'factions'}),
    X('envoy',11,'','safepassage','Safe Passage','posting','Agents and specialists travelling through the posted world lose no Cover.',{needs:'posting'}),
    X('envoy',15,'A','unitedfront','United Front','rule','Allied reinforcements can join missions anywhere.',{needs:'factions'}),
    X('envoy',15,'B','sanctuary','Sanctuary','rule','Injured rebels can recover at allied worlds.',{needs:'factions'}),
    X('envoy',19,'','grandalliance','Grand Alliance','job','Bring a major faction or world into the revolution. Once per campaign.',{lead:1,needs:'factions'}),
    X('agitator',3,'','unrest','Unrest','job','Stir unrest at one world: Hegemony stability there falls.',{needs:'stability'}),
    X('agitator',7,'A','strikes','Strikes','job','Organise strikes at one world: Hegemony reinforcements there are slower.',{needs:'stability'}),
    X('agitator',7,'B','riots','Riots','job','Start riots at one world: fewer Hegemony troops on missions there. Raises Exposure.',{needs:'stability'}),
    X('agitator',11,'','uprisingprep','Uprising Prep','job','At a Network-stage world, prepare the push to Uprising.',{needs:'network'}),
    X('agitator',15,'A','powderkeg','Powder Keg','rule','Unrest spreads to neighbouring worlds.',{needs:'stability'}),
    X('agitator',15,'B','deserters','Deserters','rule','Worlds with low Hegemony stability produce deserters as recruits.',{needs:'stability'}),
    X('agitator',19,'','dayofrevolt','Day of Revolt','job','Trigger uprisings at every Network-stage world at once. Once per campaign.',{lead:1,needs:'network'}),
    // Mission Control
    X('tactician',3,'','battlebrief','Battle Briefing','job','Supports a ground mission: the briefing shows the opposition, type by type.',{live:1}),
    X('tactician',7,'A','insertion','Insertion Point','job','Choose the squad’s deployment zone from several options.',{needs:'deploy'}),
    X('tactician',7,'B','extraction','Extraction Plan','job','A squad that comes home from a failed supported mission takes no extra injuries.',{live:1}),
    X('tactician',11,'','tacoverwatch','Overwatch','job','Once per supported mission, an Overwatch scan from the Fire Support menu shows every enemy on the map for a round.',{live:1}),
    X('tactician',15,'A','battleplan','Battle Plan','rule','Supported squads take a free first round: the Hegemony neither moves nor fires in round 1.',{live:1}),
    X('tactician',15,'B','adaptive','Adaptive Orders','rule','Supported squads can switch to an alternative approach for one objective mid-mission.',{needs:'approach'}),
    X('tactician',19,'','perfectplan','Perfect Plan','rule','Once every 30 days, a supported mission begins with two free rounds before the Hegemony acts.',{cd:30,live:1}),
    X('flightctl',3,'','vectoring','Vectoring','job','Supports a space mission: the briefing lists the enemy wing.',{live:1}),
    X('flightctl',7,'A','scramble','Scramble','job','One more pilot and ship can fly a supported space mission.',{live:1}),
    X('flightctl',7,'B','formation','Formation Calls','job','A Leader’s Take Point radius doubles in a supported mission.',{needs:'leader'}),
    X('flightctl',11,'','interceptplot','Intercept Plot','job','Choose where the wing starts in a supported space mission: flank left, head on, flank right or close in.',{live:1}),
    X('flightctl',15,'A','turnaround','Rapid Turnaround','rule','Pilots who bring a ship home undamaged from a supported space mission are not tired by it, so they can fly again.',{live:1}),
    X('flightctl',15,'B','tightwing','Tight Wing','rule','Ships in supported space missions are harder to hit (+1).',{live:1}),
    X('flightctl',19,'','emergencyjump','Emergency Jump','rule','Once per supported space mission, the whole wing jumps out with no losses. The mission fails.',{live:1}),
    X('combatsupport',3,'','firecoord','Fire Coordination','job','A supported mission gets one extra fire support call: the first drop or ship can be called once more.',{live:1}),
    X('combatsupport',7,'A','precision','Precision Strikes','job','The door gunner in a supported mission hits on 6+ instead of 9+. (Fire support never scatters in the game.)',{live:1}),
    X('combatsupport',7,'B','rapidresp','Rapid Response','job','Supply drops, reinforcements and vehicles called in a supported mission come down at once, not next round.',{live:1}),
    X('combatsupport',11,'','evac','Evac on Call','job','Once per supported mission, a support pilot flies out one downed rebel: they come home injured, not dead.',{live:1}),
    X('combatsupport',15,'A','saturation','Saturation','rule','The door gunner’s zone is half again as wide and works up to 5 enemies; strafing blasts are wider.',{live:1}),
    X('combatsupport',15,'B','dangerclose','Danger Close','rule','Rebels take no damage from their own fire support.',{live:1}),
    X('combatsupport',19,'','bombard','Heavy Bombardment','rule','Once per supported mission, call a heavy bombardment on any spot a squad member can see.',{live:1}),
  ];
  const UK={};for(const u of BASE)UK[u.spec+'.'+u.k]=u;for(const u of UNLOCKS)UK[u.niche+'.'+u.k]=u;
  const LEVELS=[3,7,11,15,19],FORK_LEVELS=[7,15];

  /* a number that grows from `a` at level 1 to `b` at level 19 */
  const scale=(lv,a,b)=>a+(b-a)*Math.max(0,Math.min(1,((lv||1)-1)/18));
  /* rooms hold 2, and one more for every tile past the first (DESIGN_BLOCKERS C-28) */
  const capacity=tiles=>tiles>0?2+Math.max(0,tiles-1):0;

  /* rebels' fields: p.sspec (base specialty), p.niche (null until trained), p.forks {7:'A'|'B', 15:...} */
  const nicheOf=p=>(p&&p.niche&&NICHE[p.niche])?p.niche:null;
  const title=p=>nicheOf(p)?NICHE[p.niche].n:(p&&SPEC[p.sspec])?SPEC[p.sspec].n:'';
  const homeOf=p=>(p&&SPEC[p.sspec])?SPEC[p.sspec].room:null;
  const specOfRoom=room=>SPEC_ORDER.find(s=>SPEC[s].room===room)||null;
  /* the fork choice still owed: the lowest fork level reached with no choice made (null if none) */
  const forkDue=p=>{if(!nicheOf(p))return null;for(const lv of FORK_LEVELS)if(p.level>=lv&&!(p.forks&&p.forks[lv]))return lv;return null;};
  /* an unlock this rebel has reached (their own level, their own fork) */
  const reached=(p,u)=>!!p&&p.level>=u.lv&&(!u.f||(p.forks&&p.forks[u.lv]===u.f));
  const unlocksOf=niche=>UNLOCKS.filter(u=>u.niche===niche);
  const baseOf=spec=>BASE.filter(u=>u.spec===spec);

  /* Department Head: the highest-level rebel of the room's base specialty among `staff` (people working the room) */
  const byLevel=(a,b)=>(b.level-a.level)||((b.xp||0)-(a.xp||0))||((a.joined||0)-(b.joined||0));
  function head(staff,room){
    const s=specOfRoom(room);
    return staff.filter(p=>p.sspec===s).sort(byLevel)[0]||null;
  }
  /* Lead Specialist of a niche: `pick` is the rebel the player named (if they still work the room), else the highest level */
  function lead(staff,niche,pick){
    const of=staff.filter(p=>p.niche===niche);
    if(pick){const q=of.find(p=>p.id===pick);if(q)return q;}
    return of.sort(byLevel)[0]||null;
  }
  /* a niche's Rule (or any unlock) is on in a room when its Lead has reached it */
  const ruleOn=(ld,u)=>!!ld&&reached(ld,u);
  /* can `p` start this Job? Non-fork Jobs: the Lead has unlocked it (Staff ride on the Lead). Fork Jobs: the Lead's
     fork, or `p` took that fork and reached it themselves. Lead-only Jobs: only the Lead. */
  function canRun(p,u,ld){
    if(!p||!ld||u.t!=='job'||p.niche!==u.niche)return false;
    if(u.lead&&p!==ld)return false;
    if(!u.f)return ld.level>=u.lv;
    return reached(ld,u)||reached(p,u);
  }
  /* Staff learn faster under a higher-level Lead */
  const STAFF_XP=1.5;
  const underLead=(p,ld)=>!!ld&&ld!==p&&ld.level>p.level;

  /* the base specialty a Support rebel was recruited with, read from their origin line, else hashed from the name */
  const BIO_SPEC=[
    [/physician|doctor|medic|nurse|surgeon/i,'doctor'],
    [/clerk|registry|read everything|analyst|cipher/i,'intel'],
    [/mechanic|grease|engine|hauler drive|wrench/i,'mechanic'],
    [/lab tech|technician|electronic|wire/i,'support_technician'],
    [/quartermaster|ledger|smuggl|forms|counts every|bolt/i,'logistics'],
    [/prof\.|professor|teacher|universit|lecturer/i,'academic'],
    [/pamphlet|union|organiser|printed|speech/i,'diplomat'],
    [/dispatch|flight tower|controller|where everybody/i,'control'],
  ];
  function guess(p){
    const txt=((p&&p.name)||'')+' '+((p&&p.bio)||'');
    for(const [re,s] of BIO_SPEC)if(re.test(txt))return s;
    let h=0;for(const ch of ((p&&p.name)||'x'))h=(h*31+ch.charCodeAt(0))>>>0;
    return SPEC_ORDER[h%SPEC_ORDER.length];
  }

  window.Support={SPEC,SPEC_ORDER,NICHE,BASE,UNLOCKS,UK,NEEDS,LEVELS,FORK_LEVELS,scale,capacity,nicheOf,title,homeOf,specOfRoom,
    forkDue,reached,unlocksOf,baseOf,head,lead,ruleOn,canRun,STAFF_XP,underLead,guess};
})();
