'use strict';
/* =====================================================================
   STAR REBELLION — items
   The one owner of personal kit: every weapon, armour piece and gadget a
   rebel can hold, plus the built-in weapons of units and vehicles (fists,
   turrets, the Strider's autocannon). Rows come from the `items` table in
   game/data/db.json (edit them there, or in the spreadsheet: see
   docs/DATABASE.md); the scenes read them through this module only.

   Items.get(id)          the row, or null
   Items.name(id)         display name (the id itself if unknown)
   Items.kit()            owned kit in the base's shape ({name, cat, slot, w, h, q, maker, price, live, ...})
   Items.wpn()            every item with combat stats in the ground scene's shape ({name, d0, d1, rng, ...})
   Items.pool(filter)     ids matching a filter, in table order
   Items.roll(filter,rng) one id drawn from the pool (optionally weighted), or null
   Items.grant(armory,id,n,src)  the only way kit enters an armory; returns the entry
   Items.take(armory,id,n)       removes up to n (an emptied stack goes); returns how many were taken
   ===================================================================== */
window.Items=(function(){
  const rows=SRDB.raw.items||[];
  const byId={};for(const r of rows)byId[r.id]=r;
  const makers={};for(const m of SRDB.raw.manufacturers)makers[m.id]=m.name;
  const owned=r=>r.category!=='builtin';
  const get=id=>byId[id]||null;
  const name=id=>(byId[id]&&byId[id].name)||id;
  function must(id){
    const r=byId[id];
    if(!r)throw new Error('Unknown item "'+id+'": add it to the items table in game/data/db.json');
    return r;
  }
  /* the base's catalogue shape; field names predate the database (DESIGN_BLOCKERS C-10) */
  function kit(){
    const k={};
    for(const r of rows)if(owned(r))k[r.id]={name:r.name,sub:r.sub||undefined,cat:r.category,slot:r.slot,w:r.width,h:r.height,
      q:r.quality==null?undefined:r.quality,maker:r.manufacturer?makers[r.manufacturer]:undefined,origin:r.origin||undefined,
      price:r.price==null?undefined:r.price,live:r.live?1:0,rev:r.rev,heg:r.hegemony?1:0,dropOnly:r.drop_only?1:0};
    return k;
  }
  /* the ground scene's weapon shape */
  function wpn(){
    const w={};
    for(const r of rows)if(r.damage_min!=null)w[r.id]={name:r.name,d0:r.damage_min,d1:r.damage_max,rng:r.range,atk:r.attack,shots:r.shots,
      dmg:r.damage_type,oneHand:r.one_handed,jam:r.jams||undefined,pellets:r.pellets||undefined,falloff:r.falloff||undefined,beam:r.beam||undefined,icon:r.icon};
    return w;
  }
  /* filter: {cat, slot, heg, dropOnly, origin, maker, maxRev, sold, live (default true), not:[ids]} */
  function pool(f){
    f=f||{};
    return rows.filter(r=>owned(r)
      &&(f.live===undefined?r.live:!!r.live===!!f.live)
      &&(f.cat===undefined||r.category===f.cat)
      &&(f.slot===undefined||r.slot===f.slot)
      &&(f.heg===undefined||r.hegemony===!!f.heg)
      &&(f.dropOnly===undefined||r.drop_only===!!f.dropOnly)
      &&(f.origin===undefined||r.origin===f.origin)
      &&(f.maker===undefined||r.manufacturer===f.maker)
      &&(f.maxRev===undefined||r.rev<=f.maxRev)
      &&(f.sold===undefined||(r.price!=null)===!!f.sold)
      &&!(f.not&&f.not.includes(r.id))).map(r=>r.id);
  }
  /* a random draw from the pool; weight(row) > 0 biases it */
  function roll(f,rng,weight){
    const ids=pool(f);
    if(!ids.length)return null;
    rng=rng||Math.random;
    if(!weight)return ids[Math.floor(rng()*ids.length)];
    const ws=ids.map(id=>Math.max(0,weight(byId[id])||0)),tot=ws.reduce((a,b)=>a+b,0);
    if(!tot)return null;
    let x=rng()*tot;
    for(let i=0;i<ids.length;i++){x-=ws[i];if(x<0)return ids[i];}
    return ids[ids.length-1];
  }
  /* src: start, looted, bought, made, gift. An existing stack keeps the source it first came from. */
  function grant(armory,id,n,src){
    const r=must(id);
    if(!owned(r))throw new Error('"'+id+'" is a built-in weapon and cannot be owned');
    n=Math.max(1,n||1);
    let a=armory.find(x=>x.id===id);
    if(a)a.n=(a.n||0)+n;
    else{a={id,name:r.name,n};if(src)a.src=src;armory.push(a);}
    return a;
  }
  function take(armory,id,n){
    const a=armory.find(x=>x.id===id);
    if(!a)return 0;
    const k=Math.min(a.n||0,Math.max(0,n||1));
    a.n-=k;
    if(a.n<=0)armory.splice(armory.indexOf(a),1);   // an empty stack leaves the armory
    return k;
  }
  return {rows,get,name,must,kit,wpn,pool,roll,grant,take};
})();
