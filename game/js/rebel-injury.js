'use strict';
/* =====================================================================
   STAR REBELLION — injury and recovery
   A critical hit on a rebel can inflict a critical injury with a lingering
   effect. In the encounter it is dealt with by a Treat Wound action; most
   injuries leave a medical condition behind that has to be recovered at the
   base over time (Infirmary), and a few are permanent until a prosthetic.
   This file is the data and the arithmetic: the injury table, the
   conditions they leave, and what they cost a rebel's performance.
   ground.js applies the combat effects; base.js runs recovery and shows it.
   ===================================================================== */
(function(){
  const R=window.Rebel;
  /* damage sources: ballistic (guns), explosive (grenades, rockets, blasts), plasma (energy and heat), blunt (fists) */
  const ANY=['ballistic','explosive','plasma','blunt'];
  const I=(k,n,w,src,combat,treat,cond)=>({k,n,w,src,combat,treat,cond});
  const INJ=[
    I('concussion','Concussion',14,ANY,'Stunned: cannot take actions until treated.','Treat Wound clears the stun.','concussed'),
    I('brokenarm','Broken Arm',10,ANY,'Drops their weapon and cannot use two-handed weapons.','Treat Wound lets them fight on with one hand free.','brokenarm'),
    I('brokenleg','Broken Leg',10,ANY,'Slowed, and cannot Sprint.','Treat Wound lets them move normally for the rest of the encounter.','brokenleg'),
    I('bleeding','Severe Bleeding',14,ANY,'Loses health at the end of every round.','Treat Wound stops the bleeding.','wounded'),
    I('internal','Internal Injury',8,ANY,'Maximum health sharply reduced.','Treat Wound lets them carry on at full strength.','internal'),
    I('shrapnel','Shrapnel',12,['ballistic','explosive'],'Suppressed: cannot use abilities.','Treat Wound clears the suppression; the shrapnel stays in.','shrapnel'),
    I('burns','Burns',12,['plasma','explosive'],'Slower and less accurate.','Treat Wound stabilises them enough to fight normally.','burned'),
    I('eye','Eye Injury',6,ANY,'A big accuracy penalty.','Treat Wound removes the penalty for the encounter.','eye'),
    I('maimed','Maimed',3,ANY,'Loses a limb. Down until treated.','Treat Wound stabilises them and gets them on their feet. The loss is permanent.','maimed'),
    I('spinal','Spinal Injury',3,ANY,'Downed, and cannot move.','Treat Wound stabilises them, but they stay severely injured.','spinal'),
    I('eardrum','Ruptured Eardrum',8,ANY.concat(),'Cannot hear commands properly.','Treat Wound removes the combat penalty.','deafened'),
    I('facial','Facial Trauma',8,ANY,'Dazed: an accuracy penalty.','Treat Wound gets them combat-ready, but they keep the scar.','facial'),
  ];
  const INJK={};for(const i of INJ)INJK[i.k]=i;

  /* what is left after the encounter. `days` is the time to recover at the base; fx are standing penalties.
     A laid-up condition (o.laidUp) also keeps them off duty: no missions, no posts, no training. o.after names what
     recovering from it brings: an experience (nearlydead) or the prosthetic being fitted. Every condition heals at the
     same base rate (healRate in base.js), the only recovery model there is. */
  const C=(k,n,days,fx,text,o)=>Object.assign({k,n,days,fx:fx||{},text},o||{});
  const COND=[
    C('concussed','Concussed',5,{aim:-1,cool:-10},'A general debuff until they have recovered at the Infirmary.'),
    C('brokenarm','Broken Arm',6,{oneHand:1},'No two-handed weapons until it has mended.'),
    C('brokenleg','Broken Leg',7,{spd:0.7,nosprint:1},'Slowed and cannot sprint until it has mended.'),
    C('wounded','Wounded',5,{hpPct:-0.15},'Lower health until fully recovered.'),
    C('internal','Internal Injury',8,{hpPct:-0.25},'A lasting cut to their health until treated properly.'),
    C('shrapnel','Shrapnel',5,{aim:-1},'A small ongoing penalty until the fragments are removed.'),
    C('burned','Burned',6,{spd:0.85,aim:-1},'Slower and less accurate until the burns heal.'),
    C('eye','Eye Injury',8,{aim:-2},'Less accurate. Left untreated too long, it becomes permanent blindness.',),
    C('deafened','Deafened',5,{cool:-10,view:-0.25},'Poor awareness until their hearing returns.'),
    C('facial','Facial Trauma',6,{},'It will heal as a scar, and perhaps a permanent one.'),
    C('downed','Laid Up',3,{},'Came back on a stretcher. Off duty until they are back on their feet.',{laidUp:1}),
    C('spinal','Spinal Injury',10,{},'Bedridden. Walking out of the Infirmary will be a story in itself.',{laidUp:1,after:'nearlydead'}),
    C('amputation','Recovering from an Amputation',6,{},'Off duty while they learn to manage without it.',{laidUp:1,after:'nearlydead'}),
    C('surgery','Prosthetic Surgery',5,{},'In the Surgery Room having a prosthetic fitted.',{laidUp:1,after:'prosthetic'}),
  ];
  const CONDK={};for(const c of COND)CONDK[c.k]=c;
  const BLIND_AFTER=14;     // an eye injury still untreated after this many days is permanent
  const NO_INFIRMARY=0.25;  // recovery per day with no Infirmary built

  /* permanent physical changes live on p.body: 0 = whole, 1 = lost, 2 = prosthetic */
  const PARTS={arm:'arm',leg:'leg',eye:'eye'};
  const PART_NAME={arm:'an arm',leg:'a leg',eye:'an eye'};
  const BODY_FX={arm:{oneHand:1},leg:{spd:0.7,nosprint:1},eye:{aim:-3}};

  /* pick an injury for a damage source; kinds the rebel already has untreated are skipped */
  function roll(src,rand,have){
    const pool=INJ.filter(i=>i.src.indexOf(src)>=0&&!(have||[]).includes(i.k));
    if(!pool.length)return null;
    let x=rand()*pool.reduce((a,i)=>a+i.w,0);
    for(const i of pool){x-=i.w;if(x<0)return i;}
    return pool[pool.length-1];
  }

  /* the standing penalties a rebel carries into a mission: conditions plus lost limbs without a prosthetic */
  function fx(p){
    const o={aim:0,cool:0,spd:1,nosprint:0,oneHand:0,hpPct:0,view:0};
    const add=f=>{if(!f)return;o.aim+=f.aim||0;o.cool+=f.cool||0;if(f.spd)o.spd*=f.spd;o.nosprint=o.nosprint||f.nosprint||0;o.oneHand=o.oneHand||f.oneHand||0;o.hpPct+=f.hpPct||0;o.view+=f.view||0;};
    for(const c of p.cond||[])add((CONDK[c.k]||{}).fx);
    const b=p.body||{};
    for(const part in BODY_FX)if(b[part]===1)add(BODY_FX[part]);
    return o;
  }
  const hasCond=(p,k)=>(p.cond||[]).some(c=>c.k===k);
  /* a new condition, or more time on the one they already have */
  function addCond(p,k,extraDays){
    const def=CONDK[k];if(!def)return null;
    p.cond=p.cond||[];
    let c=p.cond.find(x=>x.k===k);
    const days=def.days+(extraDays||0);
    if(c)c.days=Math.max(c.days,days);
    else{c={k,days,age:0};p.cond.push(c);}
    return c;
  }
  /* off duty for `days` with a laid-up condition (extra: e.g. {part} for surgery); returns the condition */
  function layUp(p,k,days,extra){
    const def=CONDK[k];if(!def||!def.laidUp)return null;
    p.cond=p.cond||[];
    let c=p.cond.find(x=>x.k===k);
    if(c){c.days=Math.max(c.days,days);c.days0=Math.max(c.days0||0,days);}
    else{c=Object.assign({k,days,days0:days,age:0},extra||{});p.cond.push(c);}
    return c;
  }
  /* days of recovery left on their laid-up conditions (0: fit for duty) */
  const laidUp=p=>Math.max(0,...((p&&p.cond)||[]).filter(c=>(CONDK[c.k]||{}).laidUp).map(c=>c.days));
  /* one day of recovery at `rate`; returns {done:[cond keys], up:[laid-up conditions they got over], blind, scar} */
  function recover(p,rate,rand){
    const out={done:[],up:[],blind:false,scar:false};
    for(const c of (p.cond||[]).slice()){
      c.age=(c.age||0)+1;
      c.days-=rate;
      if(c.k==='eye'&&c.days>0&&c.age>=BLIND_AFTER){
        p.cond.splice(p.cond.indexOf(c),1);
        p.body=p.body||{};p.body.eye=1;out.blind=true;continue;
      }
      if(c.days<=0){
        p.cond.splice(p.cond.indexOf(c),1);
        if((CONDK[c.k]||{}).laidUp)out.up.push(c);else out.done.push(c.k);
        if(c.k==='facial'&&rand()<0.4)out.scar=true;
      }
    }
    return out;
  }
  const summary=p=>{
    const a=(p.cond||[]).filter(c=>!(CONDK[c.k]||{}).laidUp).map(c=>(CONDK[c.k]||{n:c.k}).n);
    const b=p.body||{};
    for(const part in PARTS)if(b[part]===1)a.push('Lost '+PART_NAME[part].replace('an ','').replace('a ',''));
    return a;
  };

  /* saves from before the one recovery model: p.injured (days off duty) and its helpers become a laid-up condition */
  function migrateInjured(p){
    if(p.injured>0){
      const k=p.prosPending?'surgery':p.critHeal?'spinal':'downed';
      const c=layUp(p,k,p.injured,p.prosPending?{part:p.prosPending}:null);
      if(c&&p.injDur)c.days0=Math.max(c.days0,p.injDur);
    }
    delete p.injured;delete p.injDur;delete p.critHeal;delete p.prosPending;
    return p;
  }

  Object.assign(R,{INJ,INJK,COND,CONDK,PART_NAME,BLIND_AFTER,NO_INFIRMARY,injRoll:roll,injFx:fx,hasCond,addCond,condRecover:recover,medSummary:summary,
    layUp,laidUp,migrateInjured});
})();
