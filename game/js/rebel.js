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
    return {name,first,last,role,bio:pick(BIO[role]||BIO.Soldier,r)};
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

  /* fill in the fields later phases rely on; safe to call on any saved rebel */
  function migrate(p){
    if(!p.auto&&(p.first===undefined||p.last===undefined)){const s=split(p.name);p.first=s.first;p.last=s.last;}
    return p;
  }

  return {LEVEL_CAP,FIRST,LAST,gen,split,addXp,migrate};
})();
