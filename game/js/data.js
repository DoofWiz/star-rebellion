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

  /* What a ship can fit (the designer, C-90 item 4). Weapons go in her mounts (row.mounts), one each, any weapon in any
     mount; each attachment uses up some of her hardpoints (row.hardpoints; the attachment's own hardpoints column says
     how many; a boarding party also needs passenger room). A configuration is what is fitted,
     {mount:[weapon ids], hardpoint:[attachment ids]}; in the database it is text, "bls-t-light-repeaters|bombs|bombs"
     (an older text's slot prefixes, primary: or pylon:, and an older save's {primary, secondary, pylon, internal} are
     read too). Every ship has one: a row's stock config, a starting-fleet entry's or an enemy type's own, an owned
     ship's (G.fighters[].config) */
  const SLOTS=['mount','hardpoint'];
  const attachments=index(D.attachments||[]);
  function attachment(k){return attachments[k]||null;}
  /* how many mounts and hardpoints she has */
  const hardpoints=row=>({mount:+(row&&row.mounts)||0,hardpoint:+(row&&row.hardpoints)||0});
  /* where an item goes: a weapon in a mount, an attachment on the hardpoints; null if it is neither */
  const slotOf=id=>weapons[id]?'mount':attachments[id]?'hardpoint':null;
  const emptyConfig=()=>({mount:[],hardpoint:[]});
  function parseConfig(c){
    const o=emptyConfig(),put=id=>{id=String(id).trim();if(id)o[slotOf(id)||'hardpoint'].push(id);};   // an unknown id is kept, for configWhy to name
    if(c&&typeof c==='object'){for(const k of Object.keys(c))for(const id of c[k]||[])put(id);return o;}
    for(const part of String(c||'').split('|'))put(part.slice(part.lastIndexOf(':')+1));
    return o;
  }
  const configText=c=>(c.mount||[]).concat(c.hardpoint||[]).join('|');
  const stockConfig=row=>parseConfig(row&&row.config);
  /* the weapons it fires, in mount order: what the sims and space.js load */
  const configWeapons=c=>(c.mount||[]).slice();
  /* the hardpoints its attachments use up */
  const hardpointsUsed=c=>(c.hardpoint||[]).reduce((n,id)=>n+((attachments[id]||{}).hardpoints||0),0);
  const plural=(n,w)=>(n||'no')+' '+w+(n===1?'':'s');
  /* why a configuration doesn't fit a ship (null when it does): unknown items, too many weapons for her mounts, too
     many attachments for her hardpoints, no passenger room, a ship that can't carry it */
  function configWhy(row,c){
    if(!row)return 'no such ship';
    c=parseConfig(c);const h=hardpoints(row);
    for(const id of c.hardpoint){
      const a=attachments[id];if(!a)return 'unknown item '+id;
      if(a.needs_passengers&&!(row.extra_people>0))return 'The '+row.name+' has no passenger room for a '+a.name;
      if(a.ships&&!a.ships.split('|').includes(row.id))return 'The '+row.name+' can\'t carry '+a.name.toLowerCase();   // bombs: the Graf and the Brickbat only
    }
    if(c.mount.length>h.mount)return 'The '+row.name+' has '+plural(h.mount,'weapon mount');
    const used=hardpointsUsed(c);
    if(used>h.hardpoint)return 'The '+row.name+' has '+plural(h.hardpoint,'hardpoint')+(h.hardpoint?'; that needs '+used:'');
    return null;
  }
  const name=id=>(weapons[id]||attachments[id]||{name:id}).name;
  /* what lets it board: a boarding party inside, or a boarding pod */
  const boards=c=>parseConfig(c).hardpoint.some(id=>attachments[id]&&attachments[id].boards);
  return {raw:D,rules,ships,weapons,pilots,ship,weapon,baseTN,skillBonus,visualSize,dial,
    fleet:index(D.starting_fleet),
    SLOTS,attachments,attachment,hardpoints,hardpointsUsed,parseConfig,configText,stockConfig,configWeapons,slotOf,configWhy,itemName:name,boards};
})();
