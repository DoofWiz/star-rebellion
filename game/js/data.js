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

  /* Hardpoints and configurations (docs/MAIN-SWITCH-HANDOFF.md S2). A ship's hardpoints are counts by type; weapons go
     on primary or secondary, attachments on a pylon or internal (inside: needs passenger room). A configuration is
     what is fitted where, {primary:[ids], secondary:[ids], pylon:[ids], internal:[ids]}; in the database it is text,
     "primary:bls-t-light-repeaters|pylon:bombs". Every ship has one: a row's stock config, a starting-fleet entry's or
     an enemy type's own, an owned ship's (G.fighters[].config) */
  const SLOTS=['primary','secondary','pylon','internal'];
  const attachments=index(D.attachments||[]);
  function attachment(k){return attachments[k]||null;}
  function hardpoints(row){
    const h={primary:0,secondary:0,pylon:0,internal:0};
    for(const part of String(row&&row.hardpoints||'').split('|')){const [k,v]=part.split(':');if(k in h)h[k]=+v||0;}
    return h;
  }
  const emptyConfig=()=>({primary:[],secondary:[],pylon:[],internal:[]});
  function parseConfig(c){
    if(c&&typeof c==='object'){const o=emptyConfig();for(const k of SLOTS)o[k]=(c[k]||[]).slice();return o;}
    const o=emptyConfig();
    for(const part of String(c||'').split('|')){const i=part.indexOf(':');if(i<0)continue;const k=part.slice(0,i).trim(),id=part.slice(i+1).trim();if(k in o&&id)o[k].push(id);}
    return o;
  }
  const configText=c=>SLOTS.flatMap(k=>(c[k]||[]).map(id=>k+':'+id)).join('|');
  const stockConfig=row=>parseConfig(row&&row.config);
  /* the weapons it fires, in mount order (primary, then secondary): what the sims and space.js load */
  const configWeapons=c=>(c.primary||[]).concat(c.secondary||[]);
  /* the slot an item goes on, or null */
  function slotOf(id){const w=weapons[id];if(w)return w.slot||(w.kind==='missile'?'secondary':'primary');const a=attachments[id];return a?a.slot:null;}
  /* why a configuration doesn't fit a ship (null when it does): unknown items, the wrong slot, too many, no passenger room */
  function configWhy(row,c){
    if(!row)return 'no such ship';
    c=parseConfig(c);const h=hardpoints(row);
    for(const k of SLOTS){
      for(const id of c[k]){
        const at=slotOf(id);if(!at)return 'unknown item '+id;
        if(at!==k)return name(id)+' goes on '+(at==='internal'?'the inside':'a '+at+' hardpoint')+', not '+k;
        const a=attachments[id];if(a&&a.needs_passengers&&!(row.extra_people>0))return 'The '+row.name+' has no passenger room for a '+a.name;
        if(a&&a.ships&&!a.ships.split('|').includes(row.id))return 'The '+row.name+' can\'t carry '+a.name.toLowerCase();   // bombs: the Graf and the Brickbat only
      }
      if(c[k].length>h[k])return 'The '+row.name+' has '+(h[k]||'no')+' '+k+' hardpoint'+(h[k]===1?'':'s');
    }
    return null;
  }
  const name=id=>(weapons[id]||attachments[id]||{name:id}).name;
  /* what lets it board: a boarding party inside, or a boarding pod on a pylon */
  const boards=c=>{c=parseConfig(c);return c.internal.concat(c.pylon).some(id=>attachments[id]&&attachments[id].boards);};
  return {raw:D,rules,ships,weapons,pilots,ship,weapon,baseTN,skillBonus,visualSize,dial,
    fleet:index(D.starting_fleet),
    SLOTS,attachments,attachment,hardpoints,parseConfig,configText,stockConfig,configWeapons,slotOf,configWhy,itemName:name,boards};
})();
