'use strict';
/* =====================================================================
   STAR REBELLION — the enemy roster
   One row per enemy type in the `enemies` table of game/data/db.json:
   faction, stats, and what they carry (item ids from the items table).
   What they carry is what they fight with and what they drop.

   Robots and vehicles carry `owned_as`, the key a hacked or stolen one has at
   base (G.vehicles[i].type, a hacked Auto's p.auto); vehicles list their
   seats in the vehicle_seats table.

   Enemies.get(id)         the row, or null
   Enemies.owned(key)      the row whose owned_as is key, or null
   Enemies.spawn(id, o)    a ground-scene unit literal for that type; `o` is the
                           placement (id, name, x, y, patrol, lines, guard, a
                           vehicle's crew...) and may override stats or weapons
   Enemies.kit(row)        every item id the type carries
   Enemies.vehicles()      vehicle definitions by owned_as, in the ground
                           scene's shape ({name, first, hp, def, spd, art, seats})
   Enemies.space(id)       a space_enemies row (ship, pilot, maneuvers, lead,
                           flees, calls, clamps, age, bio); throws if unknown
   ===================================================================== */
window.Enemies=(function(){
  const rows=SRDB.raw.enemies||[];
  const byId={},byOwned={};for(const r of rows){byId[r.id]=r;if(r.owned_as)byOwned[r.owned_as]=r;}
  const get=id=>byId[id]||null;
  const owned=key=>byOwned[key]||null;
  const seats=id=>(SRDB.raw.vehicle_seats||[]).filter(x=>x.vehicle===id);
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
    if(r.kind==='vehicle')return Object.assign({type,veh:r.owned_as,side:'law'},o);   // stats and seats: vehicles()
    const wpns=o.wpns?o.wpns.slice():weapons(r);
    const u={type,side:'law',hp:r.hp,maxhp:r.hp,aim:r.aim,def:r.def,wpns,kit:wpns.concat(gear(r)),arch:r.art};
    if(r.cool!=null)u.cool=r.cool;
    if(r.leader)u.sheriff=1;                       // the ground scene's name for a leader
    if(r.kind!=='person'){u.auto=1;u.autoType=r.owned_as;if(r.hack_rounds!=null)u.hackRounds=r.hack_rounds;}
    if(r.kind==='bot')u.bot=r.owned_as;
    if(r.heavy)u.heavy=1;
    if(r.big)u.big=1;
    if(r.credits_max!=null)u.cr=[r.credits_min,r.credits_max];
    if(u.kit.includes('riotshield'))u.shield=1;    // carrying the shield is what blocks shots from the front
    Object.assign(u,o);
    if(o.hp!==undefined&&o.maxhp===undefined)u.maxhp=o.hp;
    if(o.wpns){u.wpns=wpns;u.kit=wpns.concat(gear(r));}
    return u;
  }
  function vehicles(){
    const v={};
    for(const r of rows)if(r.kind==='vehicle')v[r.owned_as]={type:r.id,name:r.name,first:r.name.split(' ').pop(),hp:r.hp,def:r.def,
      spd:r.speed,art:r.art,seats:seats(r.id).map(x=>({k:x.seat,n:x.name,drive:x.drives?1:0,wkey:x.weapon||undefined,enc:x.enclosed?1:0}))};
    return v;
  }
  const spaceRows=SRDB.raw.space_enemies||[];
  const spaceById={};for(const r of spaceRows)spaceById[r.id]=r;
  function space(id){
    const r=spaceById[id];
    if(!r)throw new Error('Unknown space enemy "'+id+'": add it to the space_enemies table in game/data/db.json');
    return r;
  }
  return {rows,get,owned,must,spawn,kit,vehicles,seats,spaceRows,space};
})();
