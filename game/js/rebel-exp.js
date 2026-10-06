'use strict';
/* =====================================================================
   STAR REBELLION — rebel experiences ("Rebel Traits")
   Traits a rebel earns from what happens to them: battles survived,
   friendships formed, losses suffered. Up to three at a time. This file
   holds the registry (the designer's copy for all of them), the rules
   that grant them, and the bookkeeping for pairs of rebels. It works on
   plain rebel objects; base.js decides when to call it and shows the
   results. Traits whose systems don't exist yet are listed with
   live:0 and are never granted.
   {name} in a quote is the rebel, {partner} is the other person in a pair.
   ===================================================================== */
(function(){
  const R=window.Rebel;
  const MAX=3;
  const T=(k,n,cat,pri,live,q,e,o)=>Object.assign({k,n,cat,pri,live,q,e,where:'g'},o||{});
  const RT=[
    /* ---- relationships ---- */
    T('friends','Friends with {partner}','Relationships',5,1,'{name} and {partner} have become close. Close enough that one of them is going to have a very bad day eventually.','Panics at once if {partner} goes down. Takes a major morale loss, and grieves, if {partner} dies.',{pair:1,where:'gs'}),
    T('rivals','Rivals with {partner}','Relationships',4,1,'{name} and {partner} have never particularly liked each other. They have also never agreed on why.','Both lose morale when sent out in the same squad. Small chance of a combat edge when the other is there.',{pair:1}),
    T('mentored','Mentored by {partner}','Relationships',5,1,'{partner} has been teaching {name} everything they know. Hopefully not all of it.','Gains more experience fighting alongside {partner}. If {partner} is killed, becomes Avenging.',{pair:1}),
    T('mentoring','Mentoring {partner}','Relationships',5,1,'{name} has taken {partner} under their wing. This was not discussed with anyone else.','{partner} gains more experience fighting alongside them. Takes a major morale loss if {partner} is killed.',{pair:1}),
    T('love','In Love with {partner}','Relationships',7,1,'Somewhere between surviving firefights and stealing Hegemony equipment, this happened.','Large morale bonus after a mission beside {partner}. Panics if {partner} is downed. Grieves if {partner} dies.',{pair:1,where:'gs'}),
    T('family','Family of {partner}','Relationships',5,0,'Apparently the rebellion is now a family business.','Large morale effect when the relative is present or absent. Grieves if the relative is killed.',{pair:1}),
    /* ---- battlefield experiences ---- */
    T('battlehard','Battle-Hardened','Battlefield',3,1,'{name} has seen enough firefights to stop being surprised by them.','Panics less, and loses less morale to injuries and defeats.'),
    T('blooded','Blooded','Battlefield',2,1,'{name} has killed someone. They remember the first one. They probably remember the others too.','Slightly harder to panic.'),
    T('firesupport','Fire Support','Battlefield',3,1,'{name} has spent enough time behind a heavy weapon to develop strong opinions about where everyone else should stand.','+1 accuracy with heavy weapons.'),
    T('scarred','Scarred','Battlefield',4,1,'{name} has the sort of scars that tend to end conversations.','Loses a little less morale to bad news.'),
    T('nearlydead','Nearly Dead','Battlefield',5,1,'{name} was not expected to make it. They did anyway.','Far less likely to panic once wounded.'),
    T('ambush','Survived an Ambush','Battlefield',3,0,'{name} has learned that ‘we’re probably safe’ is not a useful military assessment.','Less likely to be surprised or ambushed on future missions.'),
    T('captured','Captured','Battlefield',4,0,'{name} spent some time as a guest of the Hegemony. They were not particularly good hosts.','Less likely to panic when isolated or surrounded. May gain Hegemony Trauma.'),
    T('tortured','Tortured','Battlefield',5,0,'{name} knows exactly what the Hegemony does to people who know too much.','Major resistance to interrogation. A small permanent morale penalty.'),
    T('lostsquad','Lost a Squad','Battlefield',6,1,'{name} went into the mission with a squad. They came back without one.','A major morale blow, then less shaken when squadmates fall in future.'),
    T('laststanding','Last One Standing','Battlefield',5,1,'Everyone else went down. {name} didn’t.','+2 accuracy when badly outnumbered. A little uneasy starting a mission with a full squad.'),
    /* ---- psychological ---- */
    T('panicky','Panicky','Psychological',4,1,'{name} has seen something they weren’t ready for and now they’re generally freaked out.','Panics more easily when allies go down.'),
    T('grieving','Grieving','Psychological',8,1,'{name} is still dealing with the loss of someone they cared about.','Morale drains. Will not go on missions. Recovers in time.',{temp:1}),
    T('vengeful','Vengeful','Psychological',5,1,'{name} has decided that someone is going to pay for what happened.','+10% damage against the Hegemony.'),
    T('haunted','Haunted','Psychological',3,0,'{name} keeps dreaming about what happened. When they sleep at all.','Reduced morale after missions like the one that did it.'),
    T('guilt','Survivor’s Guilt','Psychological',4,1,'{name} isn’t sure why they came back when everyone else didn’t.','Loses morale after any mission where allies are killed.'),
    T('hardened','Hardened','Psychological',5,1,'{name} has been through enough that very little surprises them anymore.','Loses less morale to deaths, injuries and defeats, and gains a little less from good news.'),
    T('desens','Desensitised','Psychological',4,1,'{name} has stopped reacting to things that used to bother them.','Panics less. Gains less morale from good news.'),
    T('broken','Broken','Psychological',8,1,'{name} is still here. That is about all that can currently be said.','Fights badly and loses their nerve easily until they get some rest.',{temp:1}),
    /* ---- successes ---- */
    T('decorated','Decorated','Successes',4,1,'Someone decided {name} deserved a medal. {name} agrees.','A little extra morale from every win.'),
    T('hero','Hero of the Rebellion','Successes',7,0,'{name} did something spectacularly brave. Unfortunately, everyone saw it.','Large morale bonus to nearby rebels. Increased Risk where their identity is known.'),
    T('name','Made a Name for Themselves','Successes',4,0,'People have started recognising {name}. This is either useful or extremely inconvenient.','Improved recruitment or morale effects. Increased Risk in populated areas.'),
    T('veteran','Veteran','Successes',6,1,'{name} has been doing this for a while. They have the scars to prove it.','+1 accuracy and slower to panic.',{where:'gs'}),
    T('mspec','Mission Specialist','Successes',4,1,'After enough missions doing the same thing, {name} has become very good at it.','+1 accuracy on that kind of mission.'),
    T('luckyesc','Lucky Escape','Successes',4,1,'{name} was one second away from dying. Nobody has quite worked out how they didn’t.','Small chance to survive an otherwise lethal blow.'),
    T('nemesis','Hegemony Nemesis','Successes',5,1,'{name} has caused enough trouble that the Hegemony has started keeping track.','+1 accuracy and +5% damage against the Hegemony.'),
    /* ---- injuries and physical changes (waiting on a deeper injury system) ---- */
    T('lostEye','Lost an Eye','Injuries',6,0,'{name} has had to get used to having slightly less of them.','Reduced accuracy. Less affected by flashes.'),
    T('lostArm','Lost an Arm','Injuries',6,0,'{name} has had to learn how to do most things again.','Cannot use certain two-handed equipment. Can be fitted with a prosthetic.'),
    T('prosthetic','Prosthetic','Injuries',4,0,'{name} has a replacement [limb/eye]. It works. Mostly.','Removes the penalties of a lost limb or eye.'),
    T('limp','Limp','Injuries',4,0,'{name} walks differently now. They insist it isn’t a problem.','Reduced movement speed.'),
    T('oldwound','Old Wound','Injuries',3,0,'{name} has an injury that never quite stopped hurting.','Small chance of being injured after a strenuous mission.'),
    T('shrapnel','Shrapnel','Injuries',3,0,'{name} still has a few souvenirs from that explosion.','A small permanent penalty with occasional flare-ups.'),
    /* ---- the rebellion itself ---- */
    T('wanted','Wanted','Rebellion',4,0,'{name} has appeared on a Hegemony wanted list. They were not consulted.','Increased Risk on civilian operations.'),
    T('informant','Hegemony Informant','Rebellion',4,0,'{name} knows considerably more about Hegemony procedures than they used to.','Improved Intel. Increased Risk if their identity becomes known.'),
    T('defector','Defector','Rebellion',4,0,'{name} used to wear the other uniform.','Stronger against former colleagues. Some rebels may distrust them.'),
    T('celebrity','Rebel Celebrity','Rebellion',5,0,'{name} has become unexpectedly famous within the rebellion.','Improved morale and recruitment. Greater impact when killed.'),
    T('poster','Propaganda Poster','Rebellion',4,0,'{name} has somehow ended up on a poster.','Increased Rebel Support from successful missions. Increased Hegemony attention.'),
    T('symbol','Symbol of the Rebellion','Rebellion',7,0,'People have started seeing {name} as more than just another rebel.','Significant morale effect on nearby rebels. Their death is felt across the base.'),
    T('hegfamily','Hegemony Family','Rebellion',3,0,'Someone in {name}’s family still works for the Hegemony. Nobody finds this particularly comfortable.','Increased Risk when the connection is discovered.'),
    /* ---- consequences ---- */
    T('betrayed','Betrayed by {partner}','Consequences',6,0,'{partner} was trusted once. That was a mistake.','Major morale penalty when {partner} is nearby.',{pair:1}),
    T('abandoned','Abandoned by Squad','Consequences',4,0,'{name} was left behind once. They have not forgotten.','Reduced trust in squadmates. More likely to retreat when badly wounded.'),
    T('failedsave','Failed to Save {partner}','Consequences',5,0,'{name} knows they could have done something. Whether that is true is another matter.','A morale penalty beside people like the one they failed.',{pair:1}),
    T('survivor','Survivor','Consequences',3,0,'{name} was one of the few who made it out.','A small morale penalty after allied deaths. Less panic when surrounded.'),
    T('disgraced','Disgraced','Consequences',5,0,'{name} made a mistake. Unfortunately, it was a very public one.','Reduced morale and effectiveness in leadership roles.'),
    T('court','Court-Martialled','Consequences',5,0,'{name} and the rebellion’s command structure have had a disagreement.','Reduced trust from commanders. May win it back after proving themselves.'),
    /* ---- positive development ---- */
    T('redeemed','Redeemed','Positive',5,1,'{name} got another chance. They decided to make something of it.','A small permanent boost to morale.'),
    T('avenging','Avenging','Positive',5,1,'Someone hurt {name}’s people. {name} has not forgotten.','+1 accuracy against the Hegemony.'),
    T('resolve','Survivor’s Resolve','Positive',5,1,'{name} has lost people. They intend to make sure it meant something.','Loses much less morale when allies die.'),
    T('oldfriends','Old Friends with {partner}','Positive',6,1,'{name} and {partner} have been through enough together that neither needs to explain much anymore.','+1 accuracy together. A significant morale loss if {partner} dies.',{pair:1}),
    T('battlebros','Battle Brothers with {partner}','Positive',7,1,'{name} and {partner} have saved each other’s lives often enough that it has become routine.','+2 accuracy together. A severe morale loss if {partner} dies.',{pair:1}),
    T('owes','Owes a Life to {partner}','Positive',4,1,'{name} remembers who dragged them out of that firefight.','+1 accuracy beside {partner}. Grieves if {partner} dies.',{pair:1}),
    T('saved','Saved {partner}’s Life','Positive',4,1,'{name} pulled {partner} out when they should have been left behind.','A small morale lift after a mission beside {partner}.',{pair:1}),
    T('inspired','Inspired','Positive',3,0,'{name} saw someone do something extraordinary. It changed them.','A morale bonus after witnessing something heroic.'),
    T('proved','Proved Themselves','Positive',4,1,'{name} had something to prove. Apparently, they proved it.','A small permanent boost to morale.'),
  ];
  const RTK={};for(const t of RT)RTK[t.k]=t;
  const list=p=>p.traits||(p.traits=[]);
  const has=(p,k,w)=>!!p&&(p.traits||[]).some(t=>t.k===k&&(w===undefined||t.with===w));
  const get=(p,k,w)=>(p.traits||[]).find(t=>t.k===k&&(w===undefined||t.with===w));

  /* the name and the copy of one earned trait; nameOf turns a rebel id into a first name */
  const title=(t,nameOf)=>RTK[t.k].n.replace('{partner}',t.with&&nameOf?nameOf(t.with):'someone');
  const text=(t,p,nameOf)=>RTK[t.k].q.replace(/\{name\}/g,(p&&p.first)||'They').replace(/\{partner\}/g,t.with&&nameOf?nameOf(t.with):'someone');

  /* can a trait of this kind be added: free slot, or weaker than something already carried */
  function room(p,k){
    const l=list(p);
    if(l.length<MAX)return true;
    const lowest=Math.min(...l.map(t=>RTK[t.k].pri));
    return RTK[k].pri>lowest;
  }
  /* add one; with the three slots full, the weakest is pushed out if the newcomer matters more */
  function grant(p,k,w,extra){
    const def=RTK[k];
    if(!def||!def.live||!p||p.auto||has(p,k,w))return false;
    const l=list(p);
    if(l.length>=MAX){
      const lowest=Math.min(...l.map(t=>RTK[t.k].pri));
      if(def.pri<=lowest)return false;
      l.splice(l.findIndex(t=>RTK[t.k].pri===lowest),1);
    }
    l.push(Object.assign({k},w!==undefined?{with:w}:{},extra||{}));
    return true;
  }
  function drop(p,k,w){
    const l=list(p),i=l.findIndex(t=>t.k===k&&(w===undefined||t.with===w));
    if(i<0)return false;
    l.splice(i,1);return true;
  }

  /* ---------- after a mission ---------- */
  const stats=p=>p.st||(p.st={danger:0,heavy:0,panics:0,wins:0,fails:0,notable:0,lastFail:0,byType:{},tog:{}});
  /* ctx for one rebel: {win, quiet, sec, tid, down, minHp, heavy, panics, lucky, nearDeath, alone, alliesLost}; rand() is injected */
  function review(p,ctx,rand){
    const st=stats(p),out=[];
    const give=(k,w,msg,extra)=>{if(grant(p,k,w,extra))out.push({k,w,msg});};
    const hurtBad=ctx.down||(ctx.minHp!==undefined&&ctx.minHp<0.5);
    if(ctx.win)st.wins++;else st.fails++;
    if(hurtBad)st.danger++;
    st.heavy+=ctx.heavy||0;
    if(ctx.panics>0)st.panics++;
    if(ctx.win&&ctx.tid)st.byType[ctx.tid]=(st.byType[ctx.tid]||0)+1;
    if(ctx.win&&(ctx.quiet||ctx.sec>=3))st.notable++;
    if((p.kills||0)>0)give('blooded',undefined,'has killed for the first time. It stays with you.');
    if(st.danger>=3)give('battlehard',undefined,'has seen enough close calls to stop flinching.');
    if(st.heavy>=4)give('firesupport',undefined,'has become the squad’s heavy-weapon opinion.');
    if(ctx.nearDeath){give('nearlydead',undefined,'was not expected to make it, and did.');give('luckyesc',undefined,'cheated death by a hair.');}
    if(ctx.lucky)give('luckyesc',undefined,'shrugged off a killing blow.');
    if(ctx.alone){
      give('laststanding',undefined,'was the last one standing.');
      if(!ctx.win)give('lostsquad',undefined,'came home without a squad.',{});
    }
    if((p.missions||0)>=10)give('veteran',undefined,'is now a veteran of the war.');
    if(ctx.tid&&(st.byType[ctx.tid]||0)>=3&&!has(p,'mspec',ctx.tid))give('mspec',ctx.tid,'has become a specialist at this kind of job.');
    if(st.notable>=2)give('decorated',undefined,'has been decorated for notable service.');
    if(st.wins>=6)give('nemesis',undefined,'is now on the Hegemony’s list.');
    if(st.panics>=3)give('panicky',undefined,'has lost their nerve one time too many.');
    if(ctx.alliesLost>0&&!ctx.down){
      if(rand()<0.5)give('guilt',undefined,'cannot shake the thought that it should have been them.');
      if(rand()<0.4)give('vengeful','Hegemony','wants someone to pay.');
    }
    if((p.injuries||0)>=3&&(p.missions||0)>=5)give('hardened',undefined,'has been through too much to be shocked now.');
    if((p.kills||0)>=12)give('desens',undefined,'has stopped reacting.');
    if(ctx.win&&st.lastFail&&ctx.sec>=2)give('proved',undefined,'proved themselves after the last failure.');
    st.lastFail=ctx.win?0:1;
    return out;
  }
  /* a rebel's morale has hit rock bottom after a bad mission: Broken, until rest brings them back */
  function breakCheck(p,ctx){
    if(ctx.down&&!ctx.win&&p.morale<=15&&grant(p,'broken',undefined,{}))return true;
    return false;
  }

  /* ---------- pairs ---------- */
  const FRICTION=[['perfectionist','reckless'],['hothead','cautious'],['patient','restless'],['brave','cowardly'],['cynical','idealist'],['neatfreak','messy']];
  const clash=(a,b)=>FRICTION.some(([x,y])=>(R.has(a,x)&&R.has(b,y))||(R.has(a,y)&&R.has(b,x)));
  const tog=(a,b)=>{const s=stats(a);return s.tog[b.id]||(s.tog[b.id]={n:0,danger:0,fails:0});};
  const bonded=(a,b)=>['friends','oldfriends','battlebros','love'].some(k=>has(a,k,b.id));
  const link=(a,b,ka,kb)=>{
    if(!room(a,ka)||!room(b,kb))return false;
    const ga=grant(a,ka,b.id),gb=grant(b,kb,a.id);
    if(ga&&!gb)drop(a,ka,b.id);
    if(gb&&!ga)drop(b,kb,a.id);
    return ga&&gb;
  };
  const swap=(a,b,from,to)=>{
    const ta=get(a,from,b.id),tb=get(b,from,a.id);
    if(ta)drop(a,from,b.id);if(tb)drop(b,from,a.id);
    if(!link(a,b,to,to)){if(ta)grant(a,from,b.id);if(tb)grant(b,from,a.id);return false;}
    return true;
  };
  /* two rebels who just took the field together; ctx.win / ctx.hurt(id) describe how it went */
  function pairReview(a,b,ctx,rand){
    const A=tog(a,b),B=tog(b,a),out=[];
    for(const x of [A,B]){x.n++;if(ctx.hurt(a.id)&&ctx.hurt(b.id))x.danger++;if(!ctx.win)x.fails++;}
    const n=A.n,dn=A.danger;
    const say=(k,msg)=>out.push({k,a:a.id,b:b.id,msg});
    const rel=['mentored','mentoring','rivals','family'].some(k=>has(a,k,b.id));
    // mentor and trainee
    const [hi,lo]=a.level>=b.level?[a,b]:[b,a];
    if(n>=3&&hi.level>=lo.level+4&&lo.level<=5&&!has(hi,'mentoring')&&!has(lo,'mentored')&&!rel){
      if(link(hi,lo,'mentoring','mentored'))say('mentoring','have settled into a teacher and trainee.');
    }
    // friendship deepens with shared time and shared danger
    if(!bonded(a,b)&&!rel&&!clash(a,b)&&n>=4&&link(a,b,'friends','friends'))say('friends','have become friends.');
    if(has(a,'friends',b.id)&&dn>=3&&n>=6&&swap(a,b,'friends','battlebros'))say('battlebros','have become battle brothers.');
    else if(has(a,'friends',b.id)&&n>=10&&swap(a,b,'friends','oldfriends'))say('oldfriends','are old friends now.');
    if(bonded(a,b)&&!has(a,'love')&&!has(b,'love')&&n>=8&&ctx.win&&rand()<0.04){
      const from=['friends','oldfriends','battlebros'].find(k=>has(a,k,b.id));
      if(from&&swap(a,b,from,'love'))say('love','have fallen for each other.');
    }
    // friction between opposite temperaments, after a failure together
    if(!bonded(a,b)&&!rel&&clash(a,b)&&n>=3&&!ctx.win&&rand()<0.4&&link(a,b,'rivals','rivals'))say('rivals','have started to resent each other.');
    return out;
  }

  /* a rebel is gone for good: the people who were close to them feel it.
     returns [{p, d, kind, grief}] morale hits to apply and (for friends) a grieving trait is already granted */
  function bereave(p,goneId,how){
    const out=[],die=how==='died';
    for(const t of (p.traits||[]).slice()){
      if(t.with!==goneId)continue;
      drop(p,t.k,goneId);
      if(!die)continue;
      const hit={friends:-15,oldfriends:-20,battlebros:-30,love:-30,mentoring:-18,owes:-10,mentored:0,rivals:0}[t.k]||0;
      if(hit)out.push({d:hit,kind:'death'});
      if(['friends','oldfriends','battlebros','love','owes'].includes(t.k))if(grant(p,'grieving',undefined,{days:7}))out.push({grief:1});
      if(t.k==='mentored')if(grant(p,'avenging'))out.push({avenge:1});
    }
    return out;
  }

  /* temporary states run down: grief eases, a broken rebel who has rested is redeemed. returns messages */
  function daily(p,rand){
    const out=[];
    const g=get(p,'grieving');
    if(g){
      g.days=(g.days===undefined?7:g.days)-1;
      if(g.days<=0){drop(p,'grieving');out.push('has found their feet again.');if(rand()<0.5&&grant(p,'resolve'))out.push('is determined to make the loss count.');}
    }
    if(has(p,'broken')&&p.morale>=55){drop(p,'broken');out.push('has pulled themselves together.');if(grant(p,'redeemed'))out.push('has been redeemed.');}
    return out;
  }

  /* multipliers read by Rebel.moraleBump / nerveMul / coolOf / aimOf; kept here so the rules and the numbers live together */
  const moraleMul=(p,d,kind)=>{
    let m=1;const loss=d<0;
    if(loss){
      if(has(p,'battlehard')&&(kind==='loss'||kind==='injury'))m*=0.9;
      if(has(p,'scarred'))m*=0.9;
      if(has(p,'hardened')&&(kind==='death'||kind==='injury'||kind==='loss'))m*=0.8;
      if(kind==='death'){if(has(p,'resolve'))m*=0.7;if(has(p,'lostsquad'))m*=0.7;}
    } else {
      if(has(p,'hardened'))m*=0.9;
      if(has(p,'desens'))m*=0.85;
    }
    return m;
  };
  const nerveMul=p=>(has(p,'blooded')?0.92:1)*(has(p,'battlehard')?0.85:1)*(has(p,'veteran')?0.88:1)*(has(p,'desens')?0.85:1);
  const driftTarget=p=>R.MORALE_START+(has(p,'redeemed')?3:0)+(has(p,'proved')?3:0);

  /* ---------- Heroes ----------
     A hidden chance (p.heroP) creeps up with everything a rebel does: turning up, killing, surviving close calls,
     standing out. After a mission one rebel at most can be made a Hero; when that happens everyone else's chance
     drops sharply. The player never sees the number. */
  const HERO_CAP=0.02,HERO_DROP=0.35;
  const heroEligible=p=>!!p&&!p.auto&&['Soldier','Marine','Pilot'].indexOf(p.role)>=0&&(p.missions||0)>=4&&p.level>=3;
  function heroGain(p,ctx){
    if(!p||p.auto||p.role==='Support'||p.role==='Hero')return 0;
    let g=0.0003;
    g+=Math.min(0.0008,(ctx.kills||0)*0.0002);
    if(ctx.win&&ctx.danger)g+=0.0005;
    if(ctx.alone)g+=0.002;
    if(ctx.top)g+=0.001;
    if(ctx.win&&ctx.notable)g+=0.0005;
    g*=1+p.level/30;
    p.heroP=Math.min(HERO_CAP,(p.heroP||0)+g);
    return g;
  }
  /* roll for the mission: most likely candidate first, one winner at most; every Hero already made makes the next rarer */
  function heroRoll(cands,rand,have){
    const damp=1+0.5*(have||0);
    for(const p of cands.filter(heroEligible).sort((a,b)=>(b.heroP||0)-(a.heroP||0)))if(rand()<(p.heroP||0)/damp)return p;
    return null;
  }
  function heroMake(p,others){
    if(!heroEligible(p))return false;
    p.heroOf=p.role;p.rankRole=p.rankRole||p.role;p.role='Hero';p.heroP=0;
    for(const q of others||[])if(q!==p)q.heroP=(q.heroP||0)*HERO_DROP;
    return true;
  }

  Object.assign(R,{heroEligible,heroGain,heroRoll,heroMake,HERO_CAP,HERO_DROP,RT,RTK,EXP_MAX:MAX,expHas:has,expGet:get,expTitle:title,expText:text,expRoom:room,expGrant:grant,expDrop:drop,
    review,breakCheck,pairReview,bereave,expDaily:daily,expMoraleMul:moraleMul,expNerveMul:nerveMul,driftTarget,expStats:stats});
})();
