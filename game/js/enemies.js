'use strict';
/* =====================================================================
   STAR REBELLION — the enemy roster
   One row per enemy type in the `enemies` table of game/data/db.json:
   faction, stats, and what they carry (item ids from the items table).
   What they carry is what they fight with and what they drop.

   Enemies.get(id)         the row, or null
   Enemies.spawn(id, o)    a ground-scene unit literal for that type; `o` is the
                           placement (id, name, x, y, patrol, lines, guard...)
                           and may override stats or weapons for one spawn
   Enemies.kit(row)        every item id the type carries
   ===================================================================== */
window.Enemies=(function(){
  const rows=SRDB.raw.enemies||[];
  const byId={};for(const r of rows)byId[r.id]=r;
  const get=id=>byId[id]||null;
  function must(id){
    const r=byId[id];
    if(!r)throw new Error('Unknown enemy type "'+id+'": add it to the enemies table in game/data/db.json');
    return r;
  }
  const weapons=r=>[r.weapon_1,r.weapon_2].filter(Boolean);
  const gear=r=>[r.head,r.body,r.gadget].filter(Boolean);
  const kit=r=>weapons(r).concat(gear(r));
  function spawn(type,o){
    const r=must(type);
    o=o||{};
    const wpns=o.wpns?o.wpns.slice():weapons(r);
    const u={type,side:'law',hp:r.hp,maxhp:r.hp,aim:r.aim,def:r.def,wpns,kit:wpns.concat(gear(r)),arch:r.art};
    if(r.cool!=null)u.cool=r.cool;
    if(r.leader)u.sheriff=1;                       // the ground scene's name for a leader
    if(r.kind!=='person'){u.auto=1;u.autoType=r.auto_type;if(r.hack_rounds!=null)u.hackRounds=r.hack_rounds;}
    if(r.kind==='bot')u.bot=r.auto_type;
    if(r.heavy)u.heavy=1;
    if(r.big)u.big=1;
    if(r.credits_max!=null)u.cr=[r.credits_min,r.credits_max];
    if(u.kit.includes('riotshield'))u.shield=1;    // carrying the shield is what blocks shots from the front
    Object.assign(u,o);
    if(o.hp!==undefined&&o.maxhp===undefined)u.maxhp=o.hp;
    if(o.wpns){u.wpns=wpns;u.kit=wpns.concat(gear(r));}
    return u;
  }
  return {rows,get,must,spawn,kit};
})();
