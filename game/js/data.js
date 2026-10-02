'use strict';
/* =====================================================================
   STAR REBELLION — game database access
   Reads window.SR_DB (game/data/db.js, generated from db.json by
   tools/db/build.py) and hands the scenes what they need: ships and
   weapons by id or by the legacy key the old code used, plus the shared
   formulas for target number, skill bonus and movement dials.
   ===================================================================== */
window.SRDB=(function(){
  const D=window.SR_DB;
  if(!D)throw new Error('SR_DB is missing: game/data/db.js did not load');
  const rules={};for(const r of D.rules)rules[r.key]=r.value;
  const index=rows=>{const m={};for(const r of rows)m[r.id]=r;return m;};
  const ships=index(D.ships),weapons=index(D.weapons),pilots=index(D.pilots);
  const byKey=(rows)=>{const m={};for(const r of rows)for(const k of String(r.legacy_keys||'').split('|'))if(k)m[k]=r;return m;};
  const shipKeys=byKey(D.ships),weaponKeys=byKey(D.weapons);

  /* Target number against a pilot with no Focus: tn_base minus one point per tn_size_divisor sizes. */
  function baseTN(size){return Math.max(rules.tn_floor,rules.tn_base-Math.ceil(size/rules.tn_size_divisor));}
  /* Aim and Focus bonus: one point per skill_per_bonus skill, plus one per level_per_bonus levels. */
  function skillBonus(skill,level){return Math.floor((skill||0)/rules.skill_per_bonus)+Math.floor((level||1)/rules.level_per_bonus);}
  /* On-screen scale for a ship of a given size (size 5 draws at 1.15). */
  function visualSize(size){return 0.7+0.09*size;}
  /* Every speed/turn the ship can plot, as [speed, token] pairs. Tokens: S straight, l/r bank, L/R hard turn. */
  function dial(s){
    const d=[];
    for(let v=s.straight_min;v<=s.straight_max;v++)d.push([v,'S']);
    if(s.bank_max!=null)for(let v=s.bank_min;v<=s.bank_max;v++){d.push([v,'l']);d.push([v,'r']);}
    if(s.turn_max!=null)for(let v=s.turn_min;v<=s.turn_max;v++){d.push([v,'L']);d.push([v,'R']);}
    return d;
  }
  function ship(k){return ships[k]||shipKeys[k]||null;}
  function weapon(k){return weapons[k]||weaponKeys[k]||null;}
  return {raw:D,rules,ships,weapons,pilots,ship,weapon,baseTN,skillBonus,visualSize,dial,
    fleet:index(D.starting_fleet)};
})();
