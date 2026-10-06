'use strict';
/* =====================================================================
   STAR REBELLION — mission text (DESIGN_BLOCKERS C-26)
   One text set per reusable mission type. The board (base.js) and the
   ground scene (ground.js) both read it: the offer, the briefing, the
   objectives, the arrival call, the log lines and the end screen. A new
   deployment of a type needs no new lines; a new type needs one set.
   Story missions (Take the Rock, Steal the Cross, Steal the Strider) keep
   their own text in the scenes.

   Variables the game fills in (MT.fill):
     {transport}  the transport the player picked (Marta); "transport" before one is picked
     {pilot}      the transport's pilot, first name
     {target}     what is being hit (fuel depot, AutoCom Plant)
     {place}      the region or world (Redrock Flats)
     {npc} {npc1} the person being rescued, full and first name
     {carrier}    who carries the charge or device; {device} which one
     {hacker}     the Field Technician on the job
     {fallen}     the rebels left behind, as a list
     {n} {total}  progress
     {SRC}        the source's surname in capitals (the follow-up line)
   Text is the designer's to edit (tools/text/text.py). Keep each {variable}.
   ===================================================================== */
window.MT=(function(){
  /* shared by every type */
  const COMMON={
    eyebrowWin:'Mission Report · {place}',
    eyebrowLose:'Mission Report · It went wrong',
    titleLose:'Mission Failed',
    unseen:'Stayed unseen',unseenYes:'Yes, bonus',unseenNo:'No',
    aboard:'<span class="g">is up the {transport}’s ramp.</span>',
    lz:'LZ',
    devices:{charge:'charge',limpet:'data limpet'},
  };

  const TYPES={
    fuel:{
      scenario:'stealfuel',
      name:'Steal Fuel',
      targets:['fuel depot','fuel store','refuelling yard'],
      hook:'The {target} at {place} holds fuel for the whole district, guarded by people who would rather be somewhere else. We could be gone before they finish the paperwork.',
      desc:'We need fuel to keep our ships running and operating. The {target} at {place} is thinly guarded. Get in, call the {transport} down onto the apron, hold the pumps while she drinks, and get out before they figure anything out.',
      after:['<b>{SRC}:</b> “Full tanks, and a {target} that will spend a month explaining where the fuel went. Nice work.”'],
      banner:'Nothing flies without it',
      foes:'Depot Guard',calm:'Depot is quiet',alert:'Depot alerted',
      obj:[
        {k:'reach',t:'Reach the {target}'},
        {k:'call',t:'Call in the {transport} and bring her down on the loading apron'},
        {k:'defend',t:'Defend the {transport} while the fuel lines pump'},
        {k:'aboard',t:'Get the squad aboard'},
      ],
      notes:['The {transport}’s engines will alert the whole {target}. Expect company!'],
      hint:'Once the {transport} arrives, at least one of the team needs to stand in range of the landing zone for the tanks to keep filling.',
      arrive:'We’ve arrived at {place}. I’ll stay up high and out of sight. Call me when you’re at the pumps.',
      button:'Call in the {transport}',
      float:{reached:'DEPOT REACHED',stalled:'PUMPS STALLED — NO ONE ON THE APRON',pump:'FUEL {n}/{total}',full:'TANKS FULL'},
      log:{
        reached:'<span class="g">The squad is at the pumps.</span> Call the {transport} down onto the apron when you are ready.',
        inbound:'Inbound to the apron. Keep it clear, I do not land on people.',
        landed:'<span class="g">The {transport} is down on the apron and the fuel lines are out.</span> Hold the pumps: {total} rounds.',
        pumping:'Fuel pumping — <span class="a">{n}/{total}</span>.',
        full:'<span class="g">The {transport}’s tanks are full.</span> Clear the apron, then everyone aboard.',
        fullClear:'<span class="g">The {transport}’s tanks are full.</span> Everyone aboard.',
      },
      alarm:{landed:'The {transport}’s engines wake the whole {target}.'},
      say:{reached:'Pumps are right there. Call her in.',full:'That is her full! Everybody on the ramp!'},
      end:{
        title:'Tanks Full',
        win:'The {transport} lifted off {place} with full tanks: every drop pumped back out of the {target} that took it. Somewhere a warden is writing a very long report.',
        cost:' It cost us: {fallen} left on the apron. We don’t forget that.',
        lose:'The squad was overrun around the apron and the {transport} lifted empty. The {target} is still full.',
        loot:'{transport}’s fuel tanks',lootDone:'Full',
      },
    },

    intel:{
      scenario:'intel',
      name:'Steal Intelligence',
      targets:['listening post','satellite array','communications array','server farm'],
      hook:'The {target} at {place} sees everything the Hegemony says about this district. If somebody who knows what they are doing could crack its databank, we would know what they know.',
      desc:'A covert operation to infiltrate the {target} at {place} could yield valuable intelligence we could turn against the Heggies. Someone who knows their way around a databank has to break in and crack it.',
      after:['<b>{SRC}:</b> “The drive came through. I have been reading for six hours and I cannot stop shaking. There are names in there we can protect. Thank you.”'],
      banner:'Everything they know, in one drive',
      foes:'Security',calm:'Target is quiet',alert:'Target alerted',
      obj:[
        {k:'reach',t:'Reach the databank terminal in the {target}',who:'{hacker} is the hacker'},
        {k:'hack',t:'Hack into the Hegemony databanks'},
        {k:'extract',t:'Extract with the stolen data'},
      ],
      notes:[],
      hint:'Only a Field Technician can operate the terminal. Avoid combat for as long as you can. The hack can only stay running while the Field Technician is on the terminal.',
      arrive:'We’re at {place}. I’ll circle with the lights off. Get that data downloaded and I’ll come down to bring it home.',
      float:{secured:'DATA SECURED'},
      log:{hacked:'<span class="g">The databank is cracked and the drive is in {hacker}’s hand.</span> The trace is already running. Get out.'},
      alarm:{hacked:'The databank trace raises the alarm.'},
      say:{hacked:'Got it! Drive is in my hand, the trace is live!'},
      end:{
        title:'Data Secured',
        win:'The Field Technician walked out of {place} with the Bureau’s registry backups on a single drive. Every name, every quota, every dissident file.',
        cost:' It cost us: {fallen} left behind. We don’t forget that.',
        lose:'The squad was overrun around the {target} and the {transport} lifted with nothing. The databank is still sealed.',
        loot:'Bureau registry backups',lootDone:'Copied',
      },
    },

    autofactory:{
      scenario:'autofactory',
      name:'Blow Up Auto Factory',
      targets:['Auto Factory','AutoCom Plant','Bot Assembly Plant'],
      hook:'Vast local resources are being poured into the {target} at {place}. The whole line runs off one power plant. If somebody had a charge and a little nerve, it would all go dark.',
      desc:'Vast local resources are being poured into building Autos at the {target} in {place}. If we could make it stop doing its thing, we could gain a big advantage in this region. The whole line runs off one Power Plant: plant a charge on the main breaker, get clear, and let the lights go out.',
      after:['<b>{SRC}:</b> “The night shift walked out to watch it burn and nobody went back in. The foreman is asking who gave the orders, and nobody can remember there being any.”'],
      banner:'Plant explosives in the factory and escape',
      foes:'Security',calm:'Plant is quiet',alert:'Plant alerted',
      obj:[
        {k:'carry',t:'Get the explosive charge to the Power Plant’s main breaker',who:'{carrier} carries it'},
        {k:'plant',t:'Plant it'},
        {k:'detonate',t:'Get clear of the blast zone, then detonate'},
        {k:'quiet',t:'(Optional) Do it without the {target} ever raising the alarm',opt:1},
        {k:'extract',t:'Get the squad back to the {transport} and extract'},
      ],
      notes:[],
      hint:'One of you carries the charge (marked ✸). Only the carrier can plant it. Riot shields soak every shot from the front until they break, so flank them. Policebots never panic, but they are flimsy. Stay out of the sight cones and the {target} may never know you were here.',
      arrive:'We’re at {place}. I’ll be up high till it blows. Light the fuse and I’ll come down for you.',
      float:{set:'CHARGE SET',tooClose:'TOO CLOSE — CLEAR THE BLAST ZONE'},
      log:{
        set:'<span class="a">The charge is set.</span> Get everyone out of the blast zone, then detonate.',
        tooClose:'<span class="a">Too close.</span> Everyone out of the blast zone before you detonate.',
        blown:'<span class="g">The charge goes up.</span> The Power Plant tears itself apart and the whole {target} goes dark.',
      },
      alarm:{blown:'The {target} goes dark.'},
      say:{set:'Charge is set. Clear the zone, then blow it.',blown:'Plant’s gone! Back to the {transport}!'},
      end:{
        title:'Lights Out',
        winQuiet:'Nobody in {place} saw us come or go. One moment the {target} was humming; the next it was dark and the night shift was standing outside wondering who to blame.',
        winLoud:'The Power Plant is a crater and the {target} is dark. The alarm had already gone, but it made no difference: the line will not turn out another Auto for a long time.',
        cost:' It cost us: {fallen} left on the plant floor. We don’t forget that.',
        loseUnblown:'The charge never got its chance. The squad was pulled out before the plant could be dropped, and Security will find the charge by morning.',
        lose:'The squad was overrun inside the {target} and the {transport} lifted empty. The line keeps running.',
        loot:'Power Plant',lootDone:'Destroyed',
      },
    },

    rescue:{
      scenario:'rescue',
      name:'Rescue Dissident',
      targets:['security outpost','police station','detention annex'],
      hook:'They picked up a voice off the street and put it in the {target} at {place}. A lot of people would follow that voice, and the Hegemony knows it. The place is thin on guards and thick on locks.',
      desc:'{npc} has been arrested and is being held in the {target} at {place}. A voice like theirs has a following, and the Hegemony knows it. If we rescue them, they could add real value to our cause.',
      after:['<b>{SRC}:</b> “{npc} is out, and the whole district knows it by breakfast. Nobody is saying who did it, which is how I know it worked. They will want to meet you.”'],
      banner:'Somebody has to open the door',
      foes:'Security',calm:'Outpost is quiet',alert:'Outpost alerted',
      obj:[
        {k:'reach',t:'Reach the detention cage'},
        {k:'release',t:'Release {npc1} from confinement'},
        {k:'quiet',t:'(Optional) Do it without the enemy realising you were there',opt:1},
        {k:'extract',t:'Bring {npc1} and the squad back to the {transport}'},
      ],
      notes:['Protect {npc1} from harm.'],
      hint:'Stay out of the sight cones and the {target} may never know you were here. {npc1} follows your orders once freed, but is fragile. Riot shields soak every shot from the front until they break, so flank them.',
      arrive:'This is {place}. I’ll be overhead, just be quick. Get {npc1} out and I’ll be back on the LZ to get us out of here right quick.',
      float:{free:'{npc1} IS FREE'},
      log:{free:'<span class="g">{npc} is out of the cell.</span> Get them and the squad back to the {transport}.'},
      vip:['Thank God. Get me out of here.','I can’t fight, but I can run.','Keep the shooting away from me!'],
      end:{
        title:'Freed',
        win:'{npc} stepped aboard the {transport} shaking, quiet and very much alive.',
        winQuiet:' The {target} will spend a week working out who opened the door, and never find out.',
        winLoud:' The {target} will spend a week working out what happened.',
        cost:' It cost us: {fallen} left at the {target}. We don’t forget that.',
        loseVip:'{npc} died before the {transport} was in reach. There is no bringing that back. The squad pulled out with nothing.',
        loseVipDown:'{npc} went down short of the {transport}, and nobody had a Med Pack left to bring them round. The squad pulled out with nothing.',
        lose:'The squad was overrun around the {target} and the {transport} lifted empty. The cell is still locked.',
        lootDone:'Freed',
      },
    },

    towers:{
      scenario:'towers',
      name:'Disrupt Comm Towers',
      targets:['comm tower'],
      hook:'The {target} at {place} carries more than it should.',
      desc:'The data we were given puts a {target} at {place}. It is remote, but it is still guarded. Get a device onto its base before they raise the alarm: an Explosive Charge drops it, a Data Limpet leaves it standing and lets us listen.',
      after:['<b>{SRC}:</b> “The tower at {place} has changed. I can hear it in the logs. Two to go.”'],
      banner:'Take the tower, leave them listening',
      foes:'Security',calm:'Compound is quiet',alert:'Compound alerted',
      obj:[
        {k:'reach',t:'Reach the {target}',who:'{carrier} carries the {device}'},
        {k:'attach',t:'Attach the device to the tower base'},
        {k:'quiet',t:'(Optional) Do it without the compound raising the alarm',opt:1},
        {k:'extract',t:'Get the squad back to the {transport}'},
      ],
      notes:[],
      hint:'The carrier (marked ✸) is the only one who can attach the device. If two of you carry different devices, pick which one goes on the tower by who walks up. Stay out of the sight cones and the job is quiet.',
      arrive:'{place}. I’ll be up high, lights off. Hang it on the tower and I’ll come back for you.',
      float:{down:'TOWER DOWN',limpet:'LIMPET ATTACHED'},
      log:{
        down:'<span class="g">The charge drops the tower.</span> The compound goes dark. Back to the {transport}.',
        limpet:'<span class="g">The data limpet latches on.</span> The tower stays up and every packet it carries is ours. Back to the {transport}.',
      },
      alarm:{down:'A comm tower is destroyed.'},
      say:{down:'Tower’s coming down. Move!',limpet:'We’re listening. Go quiet and go home.'},
      end:{
        titleDown:'Tower Down',titleLimpet:'Tower Tapped',
        winDown:'The tower came down in a shower of sparks and the whole compound went quiet. Somewhere in {place} a technician is shouting into a dead handset.',
        winLimpet:'The limpet is on the tower and the tower does not know it. Every packet that crosses {place} now crosses our desk first.',
        quiet:' Nobody saw us come or go.',
        cost:' It cost us: {fallen} left at the compound. We don’t forget that.',
        lose:'The squad was overrun before the device was on the tower and the {transport} lifted empty. The tower is still talking.',
        loot:'Comm tower',lootDown:'Destroyed',lootLimpet:'Tapped',
      },
    },
  };

  /* Hegemony guards, by enemy type (the Enemies tab of the database): what they are called and what they say. Each one
     gets a surname from the pool (a serial number for a robot), so the same guard type can stand in any mission.
     idle: said now and then on patrol while all is quiet; alarm: said by whoever raises the alarm.
     Story characters (Sheriff Reeve and his deputies, Boss Craw and the squatters) keep their own names and lines in
     the scenes. */
  const FOES={
    surnames:['Dace','Gant','Drew','Soll','Rusk','Fenn','Oake','Bray','Crane','Elm','Hale','Voss','Lusk','Kaan','Orla','Kade',
      'Bour','Ysel','Tarn','Mek','Brenn','Saul','Petra','Wick','Garr','Pell','Gorm','Dill','Corr','Orsk','Vell','Holt','Vane',
      'Tull','Ruck','Pike','Hask'],
    types:{
      'security-patrolman':{title:'Patrolman',
        idle:['Gate’s quiet.','Nothing on the east side.','Nothing at the {target}.'],
        alarm:['Who goes there?','Hands where I can see them!','Stay where you are!','Stop right there!']},
      'security-riot-shieldman':{title:'Riot Shieldman',
        idle:['Nobody touches the {target}.'],
        alarm:['Shields up!','Riot line! Hold!','Disperse!']},
      'security-riot-rifleman':{title:'Riot Rifleman',
        idle:['The {target} is sealed.','Perimeter clear.'],
        alarm:['Rifles up!','Shields forward!','Breach team, go!','Suppressing!','Contact at the {target}!']},
      'auto-policebot':{title:'Policebot',serial:'PB-',
        idle:['Please remain calm.','You are in violation of Ordinance 9.','Restricted area.'],
        alarm:['Citizen, drop the weapon.','Please stand still.','Citizen, you are in a restricted area.']},
      'auto-riot-bruiser':{title:'Riot Bruiser',serial:'RB-',
        idle:['Please remain calm.'],
        alarm:['Non-compliance detected.']},
      'strider-mk1':{title:'Strider Mk I',serial:'',
        idle:['We’re all in this together.'],
        alarm:['Please remain calm.']},
      'depot-guard':{title:'Guard',
        idle:['Dust and more dust…','Apron’s secure.','Pumps are locked.','Clear view from up here.'],
        alarm:['Contact! Contact!','Who fired? WHO FIRED?','They’re armed! GUNS!','They want the tanks!','Fall back to the pumps!',
          'Get that ship off my pumps!','Warden, they’re on the apron!']},
      'depot-warden':{title:'Warden',
        idle:['Nobody drains my tanks.'],
        alarm:['That fuel belongs to the Empress!']},
    },
  };
  /* a name for a guard of this type that is not in `taken` (a Set of names); title overrides the type's (a tower
     lookout is "Tower Hale") */
  function foeName(type,taken,rnd,title){
    const T=FOES.types[type];
    if(!T)return null;
    const r=rnd||Math.random,pre=title||T.title;
    for(let i=0;i<60;i++){
      const tag=T.serial!=null?(T.serial?T.serial+String(10+Math.floor(r()*90)):''):FOES.surnames[Math.floor(r()*FOES.surnames.length)];
      const name=tag?pre+' '+tag:pre;
      if(!taken||!taken.has(name)||!tag)return {name,first:tag||pre};
    }
    return {name:pre,first:pre};
  }

  const byScenario={};for(const k in TYPES)byScenario[TYPES[k].scenario]=k;

  /* {variable} -> its value; a variable with no value stays as written, so a missing one shows */
  function fill(str,vars){
    return String(str==null?'':str).replace(/\{(\w+)\}/g,(m,k)=>vars&&vars[k]!=null&&vars[k]!==''?String(vars[k]):m);
  }
  /* the objectives as the board lists them (the optional one included) */
  const objList=k=>TYPES[k].obj.map(o=>o.t);

  return {COMMON,TYPES,FOES,foeName,fill,objList,
    type:k=>TYPES[k]||null,
    forScenario:id=>byScenario[id]?TYPES[byScenario[id]]:null,
    keyForScenario:id=>byScenario[id]||null};
})();
