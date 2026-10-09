'use strict';
/* =====================================================================
   STAR REBELLION — rest and weariness (Rebels & Recruits doc: Rest)
   Rebels cannot do many missions before they need a break. p.tired counts the
   missions done without rest; every day a rebel spends at the base (any day
   that passes while they are not out on a mission) rests one of them off.
   - Two missions without rest and a rebel is Weary: their morale drops, and they
     rest at the base until the count is back to zero (one day per mission).
   - Sent out while Weary, they lose morale and fight worse (aim and nerve).
   - Pushed to four, they are Conked: they collapse in their bunk in the
     Barracks and cannot be picked for anything until they have slept it off,
     which takes longer (the collapse adds to the count).
   Heavy Sleeper rests more slowly and never takes the sleep-related morale hits;
   Light Sleeper rests faster. The numbers are mine (DESIGN_BLOCKERS M-6).
   This file is the arithmetic; base.js calls it on mission return and once a day
   and shows the tags.
   ===================================================================== */
(function(){
  const R=window.Rebel;
  const WEARY_AT=2,CONK_AT=4,CONK_EXTRA=2;
  const WEARY_MORALE=-4,PUSHED_MORALE=-3;              // on turning Weary; on going out again while Weary
  const WEARY_FX={aim:-1,cool:-10};                   // in a fight while Weary (ground aim and nerve, space aim)
  /* missions rested off per day at the base */
  function restRate(p){return R.has(p,'heavysleeper')?0.5:R.has(p,'lightsleeper')?1.5:1;}
  const weary=p=>!!(p&&p.weary);
  const conked=p=>!!(p&&p.conked);
  /* a rebel is back from a mission (any theatre). Returns what changed: 'weary', 'conked', or null. */
  function tire(p){
    if(!p||p.auto)return null;
    const sleeper=R.has(p,'heavysleeper');
    if(p.weary&&!sleeper)R.moraleBump(p,PUSHED_MORALE,'misc');   // sent out again before they had rested
    p.tired=(p.tired||0)+1;
    if(!p.conked&&p.tired>=CONK_AT){p.conked=1;p.weary=1;p.tired+=CONK_EXTRA;return 'conked';}
    if(!p.weary&&p.tired>=WEARY_AT){p.weary=1;if(!sleeper)R.moraleBump(p,WEARY_MORALE,'misc');return 'weary';}
    return null;
  }
  /* a day passes at the base (mul: slower rest, someone sleeping rough). Returns 'rested' when a Weary or Conked
     rebel is fit again. */
  function restDay(p,mul){
    if(!p||!p.tired)return null;
    p.tired=Math.max(0,p.tired-restRate(p)*(mul===undefined?1:mul));
    if(p.tired>0)return null;
    const was=p.weary||p.conked;
    p.weary=0;p.conked=0;
    return was?'rested':null;
  }
  /* days until they are fit again (0 if they are) */
  const restDays=(p,mul)=>p&&p.tired&&(p.weary||p.conked)?Math.ceil(p.tired/(restRate(p)*(mul===undefined?1:mul))):0;
  const wearyFx=p=>weary(p)?WEARY_FX:{aim:0,cool:0};
  Object.assign(R,{WEARY_AT,CONK_AT,restRate,tire,restDay,restDays,weary,conked,wearyFx});
})();
