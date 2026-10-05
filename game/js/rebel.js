'use strict';
/* =====================================================================
   STAR REBELLION — rebels
   Everything that defines a rebel as a character lives here, away from
   the scenes: name generation, the level ladder and (in later phases)
   traits, skills, morale and ranks. See docs/REBELS_PLAN.md.
   base.js keeps the rebel objects in G.people; this module only builds
   and reads them, so old saves keep working.
   ===================================================================== */
window.Rebel=(function(){
  const LEVEL_CAP=20;

  /* ---------- names ---------- */
  const FIRST=['Aldis','Brenn','Calla','Dorin','Eska','Fenwick','Gale','Hesper','Ilsa','Jorrin','Kestrel','Lyra','Marek','Nessa','Orrin','Petra','Quill','Rhea','Soren','Talia','Ulric','Vera','Wynn','Xan','Yara','Zeke',
    'Anton','Bria','Cass','Dara','Emil','Fay','Gideon','Hale','Indra','Jax','Kira','Lorcan','Mina','Nico','Odalys','Pavel','Reva','Sable','Teo','Una','Viktor','Wren','Yusra','Zora',
    'Alba','Bram','Cyra','Dmitri','Elin','Fitch','Greta','Hollis','Ines','Joss','Kell','Lena','Milo','Nadia','Oleg','Pria','Rafe','Sunny','Tobin','Vance'];
  const LAST=['Adair','Brask','Calder','Dunmore','Easton','Farrow','Garrity','Halloran','Ivers','Jarek','Kovacs','Lindqvist','Mercer','Nolan','Okafor','Pryce','Quade','Rennick','Sandoval','Thorne','Underhill','Vasquez','Whitlock','Yarrow','Zander',
    'Abara','Bellamy','Corwin','Draven','Estrada','Fenn','Grayle','Hartigan','Iyer','Jessup','Karlsen','Loomis','Marsh','Navarro','Orlov','Pell','Rask','Soto','Tran','Ulloa','Voss','Wexler','Yoon','Zeller',
    'Ashdown','Brandt','Cutter','Dahl','Ekwueme','Frost','Gallo','Hobb','Ikeda','Judd','Keane','Lorne','Moreau','Nakamura','Osei','Penhale','Rourke','Strand','Tamm'];

  /* a short origin line per role; the trade is what they did before the rebellion */
  const BIO={
    Soldier:['Dockyard loader with a long memory and a short temper.','Ex-militia. Left before they could be ordered to do something worse.','Worked the salt flats until the Hegemony raised the quota again.','Mechanic who got tired of fixing other people’s weapons.','Courier who knows every back alley between here and the capital.','Farmhand. Has shot more varmints than anyone else here, and is a little proud of it.','Mine foreman. Knows what a well-placed charge does to a ceiling.','Bouncer in a port cantina. Dislikes uniforms on principle.','Cargo handler who saw something on a manifest and stopped asking questions.','Former tollgate guard. Lost the argument about who the gate is really for.'],
    Pilot:['Crop-duster who has flown under more bridges than the law allows.','Ferry pilot with a thousand hours and no patience for protocol.','Racing circuit regular who ran out of sponsors before they ran out of nerve.','Cargo hauler who can set down a freighter on a pad the size of a tablecloth.','Survey flyer, bored of charting worlds someone else will own.','Taxi pilot. Knows every back channel in the drift.'],
    Support:['Quartermaster type. Counts every bolt twice.','Clerk who read everything they were supposed to file.','Union organiser. Can get two hundred people to do one thing quietly.','Medic’s assistant who ended up doing most of the medicine.','Lab technician who fixes what they are told is unfixable.','Dispatcher with a gift for knowing where everybody is.','Schoolteacher who has opinions about how this should be run.','Ledger keeper for a smuggling ring. Can make money disappear, legally.'],
    Marine:['Dockside brawler with a talent for getting aboard things uninvited.','Ex-boarding crew. Knows exactly how thin a hull is.','Salvage hand, used to cutting their way into wrecks.'],
  };
  const pick=(a,r)=>a[Math.floor(r()*a.length)];

  /* the authored recruits (RECRUITS in base.js) carry titles; keep them out of the first name */
  function split(full){
    const t=/^(Prof\.|Dr\.)\s+/.exec(full);
    const body=t?full.slice(t[0].length):full;
    const parts=body.split(' ');
    const last=parts.length>1?parts.pop():'';
    return {first:parts.join(' ')||body,last,title:t?t[1]:''};
  }

  /* a new rebel: unique name among `taken` (a Set of full names), plus an origin line */
  function gen(role,taken,rand){
    const r=rand||Math.random;
    let first,last,name,n=0;
    do{first=pick(FIRST,r);last=pick(LAST,r);name=first+' '+last;}
    while(taken&&taken.has(name)&&++n<200);
    if(taken&&taken.has(name))name=first+' '+last+' '+(n);
    return {name,first,last,role,bio:pick(BIO[role]||BIO.Soldier,r),charTrait:pickTrait(role,r)};
  }


  /* ---------- Character Traits ----------
     Every rebel is born with exactly one. `live` says whether its effect is wired into the game yet;
     the others still show on the dossier so the designer's copy is in, and light up as their systems land.
     where: 'g' ground, 's' space, 'b' base, 'm' morale (arrives with per-rebel morale). */
  const CT=[
    {k:'clumsy',n:'Clumsy',q:'[Character] still struggles to put one foot in front of the other.',e:'25% to drop grenades at their feet. 5% to jam a weapon when firing.',live:1,where:'g',w:0.6},
    {k:'nervous',n:'Nervous',q:'[Character] has never been particularly comfortable with being shot at.',e:'Acts later in the first round of a fight.',live:1,where:'g',w:0.8},
    {k:'brave',n:'Brave',q:'[Character] has either never been afraid, or is very good at hiding it.',e:'Much harder to panic.',live:1,where:'gs',w:1},
    {k:'cowardly',n:'Cowardly',q:'[Character] has an excellent survival instinct. Unfortunately, it usually points towards the nearest exit.',e:'Panics more quickly under fire.',live:1,where:'gs',w:0.8},
    {k:'steady',n:'Steady Hands',q:'[Character] can thread a needle while riding a speeder. Probably.',e:'+1 accuracy with ranged weapons.',live:1,where:'gs',w:1},
    {k:'heavysleeper',n:'Heavy Sleeper',q:'[Character] could sleep through a bombardment. This has happened.',e:'Slow to recover from exhaustion. Immune to sleep-related morale penalties.',live:0,where:'b',w:0.5},
    {k:'lightsleeper',n:'Light Sleeper',q:'[Character] wakes at the slightest noise. Usually the wrong noise.',e:'Recovers from exhaustion faster.',live:0,where:'b',w:0.5},
    {k:'shortfuse',n:'Short Fuse',q:'[Character] has never needed much encouragement to start a fight.',e:'+10% damage for a short time after taking damage.',live:1,where:'g',w:0.8},
    {k:'patient',n:'Patient',q:'[Character] is perfectly happy to wait. Everyone else is getting rather impatient.',e:'+2 accuracy while holding.',live:1,where:'g',w:0.8},
    {k:'restless',n:'Restless',q:'[Character] has never understood the appeal of standing still.',e:'+20% movement speed. -2 accuracy while holding.',live:1,where:'g',w:0.8},
    {k:'neatfreak',n:'Neat Freak',q:'[Character] cleans their weapon more often than they clean themselves.',e:'25% chance to clear a jam on a natural 1.',live:1,where:'g',w:0.8},
    {k:'messy',n:'Messy',q:'[Character]’s equipment is always somewhere. It is rarely where they left it.',e:'10% chance of losing a piece of gear when a mission starts.',live:0,where:'g',w:0.6},
    {k:'strong',n:'Strong',q:'[Character] has been lifting heavy things for longer than anyone can remember.',e:'+20% melee damage. Can carry a second primary weapon instead of a secondary.',live:0,where:'g',w:0.7},
    {k:'weak',n:'Weak',q:'[Character] insists they are stronger than they look. They are not.',e:'-20% melee damage.',live:0,where:'g',w:0.5},
    {k:'quicklearner',n:'Quick Learner',q:'[Character] has an irritating habit of being good at things after trying them once.',e:'Gains XP 10% faster.',live:1,where:'b',w:0.8},
    {k:'slowlearner',n:'Slow Learner',q:'[Character] gets there eventually.',e:'Gains XP 10% slower.',live:1,where:'b',w:0.6},
    {k:'lucky',n:'Lucky',q:'[Character] has survived things that should have killed them. They aren’t sure why.',e:'5% chance to avoid otherwise lethal damage.',live:1,where:'gs',w:0.7},
    {k:'unlucky',n:'Unlucky',q:'[Character] has started to suspect the universe has something against them.',e:'5% more likely to suffer critical hits.',live:1,where:'gs',w:0.7},
    {k:'hegsoldier',n:'Former Hegemony Soldier',q:'[Character] spent years enforcing the Hegemony’s laws. They know exactly how it works.',e:'+2 accuracy and +5% damage against Hegemony forces.',live:1,where:'g',w:0.8},
    {k:'hegofficer',n:'Former Hegemony Officer',q:'[Character] knows how the Hegemony thinks. They also know why it thinks it is so clever.',e:'25% chance of +1 Intel when a mission targeting the Hegemony becomes available.',live:0,where:'b',w:0.6},
    {k:'smuggler',n:'Former Smuggler',q:'[Character] has moved considerably more illegal cargo than legal cargo.',e:'Small chance to add a random item to mission loot.',live:1,where:'b',w:0.8},
    {k:'mechanic',n:'Former Mechanic',q:'[Character] can identify most problems by listening to a machine make the wrong noise.',e:'Repairs ships 15% faster when posted to the Workshop.',live:1,where:'b',w:0.8},
    {k:'engineer',n:'Former Engineer',q:'[Character] has a worrying number of opinions about how things should be built.',e:'Cuts the Materials cost of construction and repairs by 5%.',live:0,where:'b',w:0.7},
    {k:'medic',n:'Former Medic',q:'[Character] has patched people up in places where there really shouldn’t have been a hospital.',e:'Wounded rebels recover a day faster when posted to the Infirmary.',live:1,where:'b',w:0.7},
    {k:'doctor',n:'Former Doctor',q:'[Character] went to medical school. Technically, they still have a medical licence.',e:'Wounded rebels recover two days faster when posted to the Infirmary.',live:1,where:'b',w:0.4},
    {k:'hunter',n:'Former Hunter',q:'[Character] spent years finding things that didn’t want to be found.',e:'Sees 20% further in missions.',live:1,where:'g',w:0.8},
    {k:'pilot',n:'Former Pilot',q:'[Character] has spent more time in a cockpit than on the ground.',e:'+1 accuracy when flying a ship.',live:1,where:'s',w:0.7},
    {k:'streetwise',n:'Streetwise',q:'[Character] knows who to talk to, who not to talk to, and when to leave.',e:'Slightly lowers Risk when working with Sources in urban areas.',live:0,where:'b',w:0.6},
    {k:'academic',n:'Academic',q:'[Character] used to spend their days studying the galaxy. Now they are trying to change it.',e:'Generates extra Intel when posted to a suitable facility.',live:0,where:'b',w:0.6},
    {k:'criminal',n:'Former Criminal',q:'[Character] insists there is a very important distinction between what they did before and what they do now.',e:'Reduced Risk on criminal operations.',live:0,where:'b',w:0.6},
    {k:'wealthy',n:'Wealthy',q:'[Character] grew up with considerably more money than most rebels have ever seen.',e:'Brings a small Credits bonus when recruited.',live:1,where:'b',w:0.4},
    {k:'politician',n:'Politician',q:'[Character] spent years learning how to say absolutely nothing for several hours at a time.',e:'Improves diplomatic and political mission quality.',live:0,where:'b',w:0.4},
    {k:'industrialist',n:'Industrialist',q:'[Character] knows how to make factories work. They also know how to make them stop.',e:'Improves Materials generation.',live:0,where:'b',w:0.4},
    {k:'charismatic',n:'Charismatic',q:'[Character] could probably convince you that surrendering was your idea.',e:'Lifts everyone else\u2019s morale a little each day, and draws more people to a recruiting call.',live:1,where:'m',w:0.7},
    {k:'intimidating',n:'Intimidating',q:'[Character] doesn’t have to raise their voice. People tend to listen anyway.',e:'Improves interrogation and coercion missions.',live:0,where:'b',w:0.6},
    {k:'empathetic',n:'Empathetic',q:'[Character] remembers everyone’s name. Even when they’d rather forget.',e:'Nearby rebels steady a little faster.',live:1,where:'g',w:0.7},
    {k:'pragmatic',n:'Pragmatic',q:'[Character] doesn’t care what works, provided that it works.',e:'Reduced resource cost on certain operations.',live:0,where:'b',w:0.6},
    {k:'idealist',n:'Idealist',q:'[Character] genuinely believes the galaxy can be better. This is either admirable or extremely inconvenient.',e:'Feels every success and every defeat 30% more keenly.',live:1,where:'m',w:0.7},
    {k:'cynical',n:'Cynical',q:'[Character] has heard every inspiring speech. They remain unconvinced.',e:'Morale moves 30% less, up or down.',live:1,where:'m',w:0.7},
    {k:'reckless',n:'Reckless',q:'[Character] considers ‘that seems dangerous’ a compelling reason to try something.',e:'+20% damage after sprinting. Takes critical hits more easily while at it.',live:1,where:'g',w:0.7},
    {k:'cautious',n:'Cautious',q:'[Character] likes to have an escape route. Preferably several.',e:'-10% damage taken. -10% movement speed.',live:1,where:'g',w:0.8},
    {k:'perfectionist',n:'Perfectionist',q:'[Character] would rather miss the shot than take one they aren’t happy with.',e:'+3 accuracy. Always attacks last.',live:1,where:'g',w:0.6},
    {k:'hothead',n:'Hothead',q:'[Character] has never once walked away from an argument.',e:'Gains Cool when attacking. Never surrenders.',live:1,where:'g',w:0.7},
    {k:'loyal',n:'Loyal',q:'[Character] didn’t join the rebellion because it was safe. They joined because they chose a side.',e:'Rattled half as much when allies go down.',live:1,where:'g',w:0.8},
    {k:'selfpres',n:'Self-Preserving',q:'[Character] believes the revolution needs them alive. They may have a point.',e:'Much less likely to be wounded badly. Fights worse once wounded.',live:1,where:'g',w:0.7},
  ];
  const CTK={};for(const t of CT)CTK[t.k]=t;
  const traitText=(t,p)=>t.q.replace(/\[Character\]/g,p&&p.first?p.first:'They');
  /* base-side traits only make sense for the people who run the base; Support never fights */
  const ROLEW={
    Support:t=>/b|m/.test(t.where)?1:0,
    Pilot:t=>(/s/.test(t.where)?1.4:/g/.test(t.where)?0.9:/m/.test(t.where)?1:0.6),
    Soldier:t=>(/g/.test(t.where)?1.2:/m/.test(t.where)?1:0.6),
    Marine:t=>(/g/.test(t.where)?1.2:/m/.test(t.where)?1:0.6),
  };
  function pickTrait(role,r){
    const f=ROLEW[role]||ROLEW.Soldier;
    const ws=CT.map(t=>t.w*f(t));
    let x=r()*ws.reduce((a,b)=>a+b,0);
    for(let i=0;i<CT.length;i++){x-=ws[i];if(x<0)return CT[i].k;}
    return CT[CT.length-1].k;
  }
  /* authored cast keep the traits their bios already imply */
  const AUTHORED={joss:'reckless',sera:'lucky',dax:'cautious',runa:'shortfuse',kel:'hunter'};
  function hashPick(p){
    let h=2166136261;const s=p.id+'|'+p.name;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    const r=()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return (h>>>0)/4294967296;};
    return pickTrait(p.role,r);
  }
  /* the traits a rebel carries, as plain keys the combat scenes can test cheaply */
  const keys=p=>{const a=[];if(p&&p.charTrait)a.push(p.charTrait);if(p&&p.traits)for(const t of p.traits)a.push(t.k);return a;};
  const has=(p,k)=>!!p&&keys(p).indexOf(k)>=0;
  const liveTraits=p=>keys(p).map(k=>CTK[k]||(window.Rebel&&window.Rebel.RTK&&window.Rebel.RTK[k])).filter(t=>t&&t.live);
  /* a trait's definition by key: a Character Trait or an earned (Rebel) Trait */
  const def=k=>CTK[k]||(window.Rebel&&window.Rebel.RTK&&window.Rebel.RTK[k])||null;
  /* the live traits a theatre ('g' ground, 's' space) acts on, as {k, with} (with: the partner of a pair trait) */
  function traitsFor(p,where){
    const out=[];
    if(p&&p.charTrait){const d=CTK[p.charTrait];if(d&&d.live&&d.where.indexOf(where)>=0)out.push({k:p.charTrait});}
    for(const t of (p&&p.traits)||[]){const d=def(t.k);if(d&&d.live&&d.where.indexOf(where)>=0)out.push(t.with?{k:t.k,with:t.with}:{k:t.k});}
    return out;
  }
  /* the Character Traits that bend every loss of Cool, in both theatres; hasK(k) says whether the pilot or soldier has k */
  function nerveScale(d,hasK){
    if(d>=0)return d;
    if(hasK('brave'))d=Math.round(d*0.5);
    if(hasK('cowardly'))d=Math.round(d*1.5);
    return d;
  }



  /* ---------- morale ----------
     0..100 per rebel. It moves with how the revolution is going and what happens to them, and it nudges
     performance: low morale is a debuff, high morale a buff. At 0 a rebel abandons the cause. */
  const MBANDS=[{k:'vlow',n:'Very Low',max:20,tone:'bad'},{k:'low',n:'Low',max:40,tone:'bad'},{k:'mid',n:'Middling',max:60,tone:''},{k:'high',n:'High',max:80,tone:'good'},{k:'vhigh',n:'Very High',max:100,tone:'good'}];
  const MORALE_START=60;
  const mband=p=>{const m=p&&p.morale!==undefined?p.morale:MORALE_START;return MBANDS.find(b=>m<=b.max)||MBANDS[4];};
  /* kinds: win, loss, death, injury, rest, promo, misc. Traits bend how hard each kind lands. */
  function moraleBump(p,d,kind){
    if(!p||p.auto||!d)return 0;
    if(p.morale===undefined)p.morale=MORALE_START;
    const loss=d<0;
    if(has(p,'cynical'))d*=0.7;
    if(has(p,'idealist')){if((kind==='win'&&!loss)||(loss&&(kind==='loss'||kind==='death')))d*=1.3;}
    if(has(p,'loyal')&&kind==='death')d*=0.5;
    if(window.Rebel.expMoraleMul)d*=window.Rebel.expMoraleMul(p,d,kind);
    const before=p.morale;
    p.morale=Math.max(0,Math.min(100,p.morale+d));
    return p.morale-before;
  }
  /* band -> small combat nudges, read by aimOf / coolOf */
  const MFX={vlow:{aim:-1,cool:-10},low:{aim:0,cool:-5},mid:{aim:0,cool:0},high:{aim:0,cool:5},vhigh:{aim:1,cool:8}};
  const moraleFx=p=>MFX[mband(p).k];

  /* ---------- skills ----------
     Derived, never stored: level gives a steady base and p.sx (earned in missions, capped) adds the rest.
     Soldiers and Marines: Aim, Constitution, Agility, Presence. Pilots: Aim, Cunning, Focus, Presence.
     Support have none; a Hero has all six. Everything caps at 50, and each point is only a small nudge. */
  const SKILL_CAP=50,SX_CAP=15,HERO_SKILL=8,HERO_HP=25;
  /* a specialty gives a slight bonus to its related skill (the rest of what a specialty does is its ability) */
  const SPECSK={medic:{pre:3}};
  const SKILLS={
    aim:{n:'Aim',d:'Better chance to hit.'},
    con:{n:'Constitution',d:'More personal health.'},
    agi:{n:'Agility',d:'Faster on foot.'},
    pre:{n:'Presence',d:'Stays Cool and resists panic.'},
    cun:{n:'Cunning',d:'Better repairs and defensive measures.'},
    foc:{n:'Focus',d:'Harder to hit.'},
  };
  const SKILLSET={Soldier:['aim','con','agi','pre'],Marine:['aim','con','agi','pre'],Pilot:['aim','cun','foc','pre'],Hero:['aim','con','agi','cun','foc','pre'],Support:[]};
  const skillKeys=p=>(p&&!p.auto&&SKILLSET[p.role])||[];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function skill(p,k){
    if(skillKeys(p).indexOf(k)<0)return 0;
    return Math.min(SKILL_CAP,Math.round(5+(p.level-1)*1.6+((p.sx&&p.sx[k])||0))+(p.role==='Hero'?HERO_SKILL:0)+((SPECSK[p.spec]||{})[k]||0));
  }
  /* what the combat scenes read; the curves keep a fresh rebel where the old level formulas had them */
  const aimOf=(p,theatre)=>clamp((theatre==='s'?Math.round(2+(skill(p,'aim')-5)/3.2-0.25):Math.round(2+(skill(p,'aim')-5)/4.8))+moraleFx(p).aim,1,6);
  const hpOf=p=>100+Math.round((skill(p,'con')-5)*1.2)+(p.role==='Hero'?HERO_HP:0);
  const moveMul=p=>1+(skill(p,'agi')-5)*0.004;
  const coolOf=(p,theatre)=>Math.max(20,Math.min(90,Math.min(85,theatre==='s'?Math.round(59+(skill(p,'pre')-5)*2):Math.round(65+(skill(p,'pre')-5)*0.6))+moraleFx(p).cool-(has(p,'broken')?15:0)));
  const nerveMul=p=>(1-(skill(p,'pre')-5)*0.005)*(window.Rebel.expNerveMul?window.Rebel.expNerveMul(p):1);       // scales every Cool loss
  const focusTN=p=>Math.round((skill(p,'foc')-5)/14);    // added to the number others need to hit them
  const cunMul=p=>1+(skill(p,'cun')-5)*0.01;            // repairs and shield boosts
  /* The game database speaks pilot skills on its own 0..50 scale (a seed pilot at level 3 has an Aim of 30), and the
     space scene turns them into bonuses with floor(skill/10) + floor(level/5). A rebel's own skill sits on the
     smaller scale above, so these two maps carry a skill to the database scale and back; both share the same line,
     so a database pilot turned into a rebel and read back gives the same numbers. */
  const DBMAP={aim:[20,1.4],foc:[10,1.4],cun:[10,1.4],pre:[29.5,1]};
  const toDb=(k,v)=>clamp(Math.round(DBMAP[k][0]+(v-5)*DBMAP[k][1]),0,50);
  const fromDb=(k,v)=>5+(v-DBMAP[k][0])/DBMAP[k][1];
  const DBKEY={aim:'aim',cun:'cunning',foc:'focus',pre:'presence'};
  const dbSkill=(p,k)=>toDb(k,skill(p,k));
  /* experience from a mission: `sk` maps skill -> raw points the scene counted; gains are small and capped */
  function trainSkills(p,sk){
    if(!sk)return;
    p.sx=p.sx||{};
    for(const k of skillKeys(p)){
      if(!sk[k])continue;
      p.sx[k]=Math.max(p.sx[k]||0,Math.min(SX_CAP,(p.sx[k]||0)+Math.min(1.5,sk[k]*0.05)));   // a scripted head start above the cap is kept
    }
  }

  /* XP is stored as a 0..1 fraction of the way to the next level. Level 20 is the end of the road. */
  function addXp(p,amount){
    if(p.level>=LEVEL_CAP){p.xp=0;return 0;}
    p.xp+=amount;
    let gained=0;
    while(p.xp>=1&&p.level<LEVEL_CAP){p.xp-=1;p.level++;gained++;}
    if(p.level>=LEVEL_CAP)p.xp=0;
    return gained;
  }


  /* ---------- ranks ----------
     Rank is seniority, separate from level: it comes from missions completed, and the player hands it out.
     Soldiers and Support follow the US Army enlisted ladder, Marines the USMC's, Pilots the USAF's.
     From Sergeant (the fifth rung) at level 5 a rebel can be commissioned onto the officer ladder. */
  const ARMY=['Private','Private Second Class','Private First Class','Specialist','Sergeant','Staff Sergeant','Sergeant First Class','Master Sergeant','Sergeant Major'];
  const LADDER={
    Soldier:ARMY,Support:ARMY,Hero:ARMY,
    Marine:['Private','Private First Class','Lance Corporal','Corporal','Sergeant','Staff Sergeant','Gunnery Sergeant','Master Sergeant','Sergeant Major'],
    Pilot:['Airman Basic','Airman','Airman First Class','Senior Airman','Staff Sergeant','Technical Sergeant','Master Sergeant','Senior Master Sergeant','Chief Master Sergeant'],
  };
  const OFFICER=['Second Lieutenant','First Lieutenant','Captain','Major','Lieutenant Colonel','Colonel','Brigadier General','Major General','Lieutenant General'];
  const SGT=4,COMMISSION_LEVEL=5;
  const ladderOf=p=>p.off?OFFICER:(LADDER[p.rankRole||p.role]||ARMY);
  const rankName=p=>{const l=ladderOf(p);return l[Math.max(0,Math.min(l.length-1,p.rank||0))];};
  const nextRank=p=>{const l=ladderOf(p),i=(p.rank||0)+1;return i<l.length?l[i]:null;};
  /* missions needed in the current rank before the next one: more for every rung */
  const needMissions=p=>(p.off?3:2)+(p.rank||0);
  const canPromote=p=>!p.auto&&!!nextRank(p)&&(p.rankMissions||0)>=needMissions(p);
  const canCommission=p=>!p.auto&&!p.off&&p.level>=COMMISSION_LEVEL&&(p.rank||0)>=SGT;
  function promote(p){if(!canPromote(p))return null;p.rank++;p.rankMissions=0;return rankName(p);}
  function commission(p){if(!canCommission(p))return null;p.off=true;p.rank=0;p.rankMissions=0;return rankName(p);}
  /* a completed mission; true if it just made them eligible for promotion */
  function credit(p){
    if(!p||p.auto)return false;
    const was=canPromote(p);
    p.missions=(p.missions||0)+1;p.rankMissions=(p.rankMissions||0)+1;
    return !was&&canPromote(p);
  }

  /* ---------- gear slots ----------
     Soldiers and Marines carry a primary weapon, a secondary weapon, head and body armour and two gadgets;
     Pilots everything except the primary; Support carry nothing. A Hero gets the full set.
     (Head and Body are the designer-approved slots from the Market/Arsenal handoff §4.) */
  const FULL_KIT=[{k:'primary'},{k:'secondary'},{k:'head'},{k:'body'},{k:'gad',i:0},{k:'gad',i:1}];
  const gearSlots=p=>p&&!p.auto?(p.role==='Soldier'||p.role==='Marine'||p.role==='Hero'?FULL_KIT:p.role==='Pilot'?FULL_KIT.slice(1):[]):[];

  /* XP multipliers from traits (Quick / Slow Learner); callers award XP through gainXp */
  const xpMult=p=>(has(p,'quicklearner')?1.1:1)*(has(p,'slowlearner')?0.9:1);
  function gainXp(p,amount){return addXp(p,amount*xpMult(p));}

  /* fill in the fields later phases rely on; safe to call on any saved rebel */
  function migrate(p){
    if(!p.auto&&(p.first===undefined||p.last===undefined)){const s=split(p.name);p.first=s.first;p.last=s.last;}
    if(!p.auto&&p.charTrait===undefined)p.charTrait=AUTHORED[p.id]||hashPick(p);
    if(!p.auto&&p.sx===undefined)p.sx={};
    if(!p.auto&&p.morale===undefined)p.morale=MORALE_START;
    if(!p.auto&&p.rank===undefined){p.rank=Math.min(8,Math.floor(((p.level||1)-1)/2));p.rankMissions=0;p.missions=p.missions||0;}
    return p;
  }

  /* The opening cast are rebels like any other, built by the same path with the same fields; they simply come out the
     same for every player. `spec` is what a generated rebel would have (name, role, bio, Character Trait...) and `row`
     an optional database pilot (level, experience, initiative and the four skills, set as earned skill experience). */
  function scripted(spec,row){
    const p=Object.assign({assign:'rest',injured:0,level:1,xp:0},spec);
    if(row){
      p.level=row.level;p.xp=row.xp/100;p.init=row.initiative;p.sx={};
      for(const k of (SKILLSET[p.role]||[]))if(DBKEY[k]&&row[DBKEY[k]]!==undefined)p.sx[k]=Math.round((fromDb(k,row[DBKEY[k]])-(5+(p.level-1)*1.6))*10)/10;
    }
    return migrate(p);
  }

  return {scripted,toDb,fromDb,dbSkill,LEVEL_CAP,FIRST,LAST,gen,split,addXp,gainXp,xpMult,migrate,CT,CTK,traitText,keys,has,liveTraits,def,traitsFor,nerveScale,SKILLS,skillKeys,skill,aimOf,hpOf,moveMul,coolOf,nerveMul,focusTN,cunMul,trainSkills,SKILL_CAP,HERO_SKILL,HERO_HP,gearSlots,MBANDS,MORALE_START,mband,moraleBump,moraleFx,LADDER,OFFICER,rankName,nextRank,needMissions,canPromote,canCommission,promote,commission,credit};
})();
