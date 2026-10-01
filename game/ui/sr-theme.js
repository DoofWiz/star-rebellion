'use strict';
/* =====================================================================
   STAR REBELLION — CANVAS THEME  (pairs with sr-theme.css)
   One palette for DOM and canvas. On boot, call SR_THEME.sync() and every
   colour is re-read from the --sr-* custom properties, so editing the CSS
   restyles the battlefield too. Factions: rebels red, Hegemony blue,
   hazard orange for danger. Replace hard-coded hex in ground.js /
   space.js / base.js with SR_THEME.C.* or SR_THEME.ROLE.*.

   Helpers draw the in-world HUD in the house style: ink outlines, chunky
   shapes, labels on solid backing (readable over any terrain), and a label
   layer that resolves overlaps by priority.
   ===================================================================== */
window.SR_THEME=(function(){
  const C={
    ink:'#070818',void:'#0a0c22',night:'#10132e',hull:'#1a1f47',plate:'#252c62',plateHi:'#313a7c',seam:'#3a4488',
    text:'#f1f3ff',text2:'#b3bbe3',text3:'#8790c4',
    gold:'#ffc83a',goldHi:'#ffd866',goldDeep:'#b9820a',goldInk:'#2a1a00',
    rebel:'#ff4a3d',rebelHi:'#ff8a5c',rebelDeep:'#9c1a12',heg:'#4f8cff',hegHi:'#9cc2ff',hegDeep:'#1a3a9e',hazard:'#ff8a1f',hazardDeep:'#9a4a00',shieldDeep:'#0f7f8f',
    go:'#78ec5c',goDeep:'#2b8f1d',psi:'#b47cff',psiDeep:'#6b34c4',
    fuel:'#ff7ac8',steel:'#b9c5e6',shield:'#36e3f2',
    ember:'#ff4a3d',emberHi:'#ffb347',emberDeep:'#5c120c',
  };
  /* map C keys -> CSS custom properties */
  const VARS={ink:'ink',void:'void',night:'night',hull:'hull',plate:'plate',plateHi:'plate-hi',seam:'seam',
    text:'text',text2:'text-2',text3:'text-3',gold:'gold',goldHi:'gold-hi',goldDeep:'gold-deep',goldInk:'gold-ink',
    rebel:'rebel',rebelHi:'rebel-hi',rebelDeep:'rebel-deep',heg:'heg',hegHi:'heg-hi',hegDeep:'heg-deep',hazard:'hazard',hazardDeep:'hazard-deep',shieldDeep:'shield-deep',go:'go',goDeep:'go-deep',psi:'psi',psiDeep:'psi-deep',
    fuel:'fuel',steel:'steel',shield:'shield',emberHi:'ember-hi',emberDeep:'ember-deep'};
  const ROLE={};
  function buildRoles(){
    Object.assign(ROLE,{
      friend:C.rebel, foe:C.heg, neutral:C.steel, action:C.gold, good:C.go, warn:C.hazard, bad:C.hazard, progress:C.psi, revolution:C.rebel, info:C.shield,
      select:C.gold, target:C.hazard, cover:C.go, coneFar:C.heg, coneNear:C.hazard,
      move:C.rebel, sprint:C.gold, hold:C.shield, loot:C.go,
      hpHigh:C.go, hpMid:C.gold, hpLow:C.hazard,
      phaseFree:C.shield, phasePlan:C.gold, phaseFight:C.hazard, phaseExec:C.steel,
      fog:'rgba(7,8,24,0.92)', fogMemory:'rgba(7,8,24,0.55)',
    });
  }
  buildRoles();
  const FONT={display:'"Bungee","Exo 2",system-ui,sans-serif',ui:'"Exo 2",system-ui,sans-serif'};

  function sync(root){
    try{
      const cs=getComputedStyle(root||document.documentElement);
      for(const k in VARS){const v=cs.getPropertyValue('--sr-'+VARS[k]).trim();if(v)C[k]=v;}
      buildRoles();
    }catch(e){}
    return C;
  }

  /* ---------- colour utils ---------- */
  function rgba(hex,a){
    let h=hex.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');
    const n=parseInt(h,16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';
  }

  /* ---------- icons (generated from icons.py — same data as sr-icons.svg) ---------- */
  const ICONS={"credits":[["s","M12 2.5 20.5 7.25v9.5L12 21.5 3.5 16.75v-9.5Z"],["f","M12 7.5l3.2 4.5-3.2 4.5-3.2-4.5Z"]],"supplies":[["s","M4 8h16v12H4Z"],["s","M4 8l2-4h12l2 4"],["s","M9.5 12h5"]],"materials":[["s","M8 3.5h8l4.25 8.5L16 20.5H8L3.75 12Z"],["s","M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"]],"fuel":[["s","M12 3s6.5 6.6 6.5 11.2a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3Z"],["s","M9.2 14.5a2.8 2.8 0 0 0 2.8 2.8"]],"intel":[["s","M12 2.75 20.5 12 12 21.25 3.5 12Z"],["f","M12 8.25 15.75 12 12 15.75 8.25 12Z"]],"revolution":[["s","M6 21.5V3.5"],["f","M6 4h12.5l-3 4.25 3 4.25H6Z"]],"revflame":[["s","M6 21.5V3.5"],["f","M6 4c2.6-.9 4.6.9 7.4 0l6-.6-3.1 2.9 4.1 1.6-4 1.6 2.6 3.1-5.6-.5C10.6 13 8.6 11.3 6 12.2Z"],["f","M19.3 15.2a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"],["f","M16.900000000000002 17.4a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0"]],"day":[["s","M4 6h16v14H4Z"],["s","M4 10.5h16"],["s","M8.5 3.5v5"],["s","M15.5 3.5v5"]],"signal":[["s","M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"],["s","M8 8a5.6 5.6 0 0 0 0 8"],["s","M16 8a5.6 5.6 0 0 1 0 8"],["s","M5 5a9.9 9.9 0 0 0 0 14"],["s","M19 5a9.9 9.9 0 0 1 0 14"]],"move":[["s","M5 19 18 6"],["s","M10 5.5h8.5V14"]],"sprint":[["s","M4 6l6 6-6 6"],["s","M12 6l6 6-6 6"]],"hold":[["s","M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"],["f","M9.4 12a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0"]],"cover":[["s","M12 3l7.5 3v5.5c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9V6Z"],["s","M8.5 12.2l2.4 2.4 4.6-4.8"]],"lockin":[["s","M3.5 12a8.5 8.5 0 1 0 17.0 0a8.5 8.5 0 1 0 -17.0 0"],["s","M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"],["f","M10.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0"]],"loot":[["s","M8.5 8V6a3.5 3.5 0 0 1 7 0v2"],["s","M5 8h14l-1.2 12.5H6.2Z"]],"work":[["s","M14.7 3.4a5 5 0 0 0-4.5 6.9l-6.5 6.5a2.1 2.1 0 0 0 3 3l6.5-6.5a5 5 0 0 0 6.9-4.5l-3 3-2.8-.6-.6-2.8 3-3a5 5 0 0 0-2-.6Z"]],"sneak":[["s","M2.5 9.2c3.6-3.2 15.4-3.2 19 0v2.6c-2.1 4.6-5.5 6.2-9.5 6.2s-7.4-1.6-9.5-6.2Z"],["f","M6.4 11.6c.9-1.4 3.6-1.4 4.4 0-.9 1.2-3.5 1.2-4.4 0Z"],["f","M13.2 11.6c.9-1.4 3.6-1.4 4.4 0-.9 1.2-3.5 1.2-4.4 0Z"]],"attack":[["s","M5 12a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"],["s","M12 2v5.5"],["s","M12 16.5V22"],["s","M2 12h5.5"],["s","M16.5 12H22"],["f","M10.6 12a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0"]],"grenade":[["s","M5.5 14.5a6.5 6.5 0 1 0 13.0 0a6.5 6.5 0 1 0 -13.0 0"],["s","M10 8V5h4v3"],["s","M14 5.2l3.5-2.2"]],"stim":[["s","M15 3l6 6"],["s","M18 6l-9.5 9.5-3.5.5.5-3.5L15 3"],["s","M5 19l-2.5 2.5"],["s","M11 7.5l2 2"],["s","M9 9.5l2 2"]],"clear":[["s","M6 6l12 12"],["s","M18 6 6 18"]],"execute":[["f","M4 5.5l8.5 6.5L4 18.5Z"],["f","M12.5 5.5 21 12l-8.5 6.5Z"]],"gun":[["f","M2 10.2h13.6l2.6-1.7H22v3.4l-2.8 1H9.6l-2 4H4.4l1.2-4H2Z"]],"pistol":[["f","M3 7.5h15v4h-5.5l-1.6 5.5H6.8l1.6-5.5H3Z"]],"plasma":[["f","M13.5 2 4 14h7l-1.5 8L19 10h-7Z"]],"ballistic":[["s","M6 21v-9.5L8 6l2 5.5V21Z"],["s","M14 21v-9.5L16 6l2 5.5V21Z"]],"missile":[["s","M4.5 19.5l2.6-5.8L16 4.8 20 4l-.8 4-8.9 8.9Z"],["s","M7.1 13.7 4 13l1.5-2.6 3.8.2"],["s","M10.3 16.9 11 20l2.6-1.5-.2-3.8"]],"ship":[["f","M12 2l8 18.5-8-4.2-8 4.2Z"]],"turret":[["s","M4 20.5h16"],["s","M7 20.5v-4h10v4"],["s","M9 16.5v-3.5a3 3 0 0 1 6 0v3.5"],["s","M14 11.5l7-4"]],"leave":[["s","M10 4.5H5v15h5"],["s","M14 8l4 4-4 4"],["s","M18 12H9.5"]],"unjam":[["s","M5 13h10l3-2h2.5v3l-2 .8H10l-1.6 3H5.6l1-3H5Z"],["s","M8 4l1.5 3"],["s","M12.5 3v3.5"],["s","M17 4l-1.5 3"]],"hack":[["s","M3 5h18v12H3Z"],["s","M7 9.5l2.5 2L7 13.5"],["s","M11.5 13.5H15"],["s","M8.5 20.5h7"]],"firesupport":[["s","M5.5 13a6.5 6.5 0 1 0 13.0 0a6.5 6.5 0 1 0 -13.0 0"],["s","M12 9.5v7"],["s","M8.5 13h7"],["f","M12 1.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1Z"]],"extract":[["s","M12 21V8"],["s","M7 12.5l5-5 5 5"],["s","M5 3.5h14"]],"targetlock":[["s","M3.5 8.5v-5h5"],["s","M15.5 3.5h5v5"],["s","M20.5 15.5v5h-5"],["s","M8.5 20.5h-5v-5"],["f","M12 7.5 16.5 12 12 16.5 7.5 12Z"]],"evade":[["s","M3 18l4-6 4 3 4-8 3 4 3-3"]],"angle":[["s","M12 3l7.5 3v5.5c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9V6Z"],["s","M8.5 12a3.5 3.5 0 0 1 6.2-2.2"],["s","M14.9 7.5v2.6h-2.6"]],"boost":[["s","M12 3l7.5 3v5.5c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9V6Z"],["s","M12 8.5v7"],["s","M8.5 12h7"]],"patch":[["s","M4.6 13.9 13.9 4.6a3.3 3.3 0 0 1 4.7 0l.8.8a3.3 3.3 0 0 1 0 4.7l-9.3 9.3a3.3 3.3 0 0 1-4.7 0l-.8-.8a3.3 3.3 0 0 1 0-4.7Z"],["s","M10 10h.01"],["s","M14 14h.01"],["s","M12 12h.01"]],"roll":[["s","M3.5 12a8.5 4 0 1 0 17 0"],["s","M20.5 12a8.5 4 0 0 0-14-3"],["s","M5 6.5l1.5 2.6 2.8-.8"],["f","M12 9.5 14.5 12 12 14.5 9.5 12Z"]],"pass":[["s","M6 5v14"],["s","M10 5l9 7-9 7Z"]],"people":[["s","M5.8 8a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0"],["s","M3 19.5c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5"],["s","M15.5 4.9a3.2 3.2 0 0 1 0 6.2"],["s","M17 14.2c2.2.6 3.6 2.4 4 5.3"]],"dial":[["s","M12 20V8"],["s","M7.5 12 12 7.5 16.5 12"],["s","M5 20a7 7 0 0 1 2-5"],["s","M19 20a7 7 0 0 0-2-5"]],"cool":[["s","M12 3v18"],["s","M4.2 7.5l15.6 9"],["s","M4.2 16.5l15.6-9"],["s","M9.5 4.5 12 7l2.5-2.5"],["s","M9.5 19.5 12 17l2.5 2.5"]],"panic":[["s","M12 3.2 21.8 20H2.2Z"],["s","M12 9.5v4.5"],["s","M12 17.2h.01"]],"eye":[["s","M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"],["s","M9.2 12a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0 -5.6 0"]],"heart":[["s","M12 20.2s-8.2-5-8.2-10.8A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.2 2.4c0 5.8-8.2 10.8-8.2 10.8Z"]],"skull":[["s","M4.8 11a7.2 7.2 0 1 1 14.4 0v4.2h-3V19H7.8v-3.8h-3Z"],["s","M9 11.2h.01"],["s","M15 11.2h.01"],["s","M11 19v-2"],["s","M13 19v-2"]],"star":[["s","M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z"]],"lock":[["s","M5.5 11h13v10h-13Z"],["s","M8.5 11V8a3.5 3.5 0 0 1 7 0v3"]],"check":[["s","M4 12.5l5 5L20 6.5"]],"sword":[["s","M20 4 9.5 14.5"],["s","M20 4h-4.5"],["s","M20 4v4.5"],["s","M6 11.5l6.5 6.5"],["s","M8.2 15.8 4 20"]],"shield":[["s","M12 3l7.5 3v5.5c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9V6Z"]],"d20":[["s","M12 2.5 20.5 7.3v9.4L12 21.5 3.5 16.7V7.3Z"],["s","M12 2.5 7.5 15h9Z"],["s","M3.5 7.3 7.5 15 3.5 16.7"],["s","M20.5 7.3 16.5 15l4 1.7"],["s","M7.5 15 12 21.5 16.5 15"]],"soldier":[["s","M5 13.5a7 7 0 0 1 14 0"],["s","M3.5 13.5h17"],["s","M8 13.5v3.5a4 4 0 0 0 8 0v-3.5"]],"pilot":[["s","M5 14a7 7 0 0 1 14 0v4.5H5Z"],["s","M8.5 11.5h7"],["s","M2.5 11l2.5 1"],["s","M21.5 11l-2.5 1"]],"support":[["s","M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"],["s","M4.5 14h3v5.5h-3Z"],["s","M16.5 14h3v5.5h-3Z"],["s","M19.5 19.5c0 1.5-2 2.5-5 2.5"]],"marine":[["s","M12 3l7.5 3v5.5c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9V6Z"],["s","M8 10.5h8v3H8Z"]],"galaxy":[["s","M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"],["s","M5.3 8.6C2.8 9.8 1.6 11.3 2.2 12.5c1 2 6.4 1.4 12-1.4S23 4.9 22 2.9c-.5-1-2.2-1.2-4.4-.6"]],"missions":[["s","M6.5 4.5h11v17h-11Z"],["s","M9.5 2.5h5v3.5h-5Z"],["s","M9.5 11h5"],["s","M9.5 15h5"]],"base":[["s","M3.5 11 12 4l8.5 7v10h-17Z"],["s","M10 21v-5.5h4V21"]],"hangar":[["s","M3 20.5V11a9 9 0 0 1 18 0v9.5"],["s","M1.5 20.5h21"],["s","M8 20.5V15h8v5.5"]],"zoomin":[["s","M3.5 10.5a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"],["s","M20.5 20.5 15.5 15.5"],["s","M7.5 10.5h6"],["s","M10.5 7.5v6"]],"zoomout":[["s","M3.5 10.5a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"],["s","M20.5 20.5 15.5 15.5"],["s","M7.5 10.5h6"]],"fit":[["s","M4 9V4h5"],["s","M15 4h5v5"],["s","M20 15v5h-5"],["s","M9 20H4v-5"]],"follow":[["s","M2.5 7h12v10h-12Z"],["s","M14.5 10.5l7-3.5v10l-7-3.5"]],"soundon":[["s","M3.5 9h4l5-4v14l-5-4h-4Z"],["s","M16.2 8.8a4.6 4.6 0 0 1 0 6.4"],["s","M18.8 6.2a8.3 8.3 0 0 1 0 11.6"]],"soundoff":[["s","M3.5 9h4l5-4v14l-5-4h-4Z"],["s","M16.5 9.5l5 5"],["s","M21.5 9.5l-5 5"]],"menu":[["s","M4 6.5h16"],["s","M4 12h16"],["s","M4 17.5h16"]],"help":[["s","M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"],["s","M9.4 9.4a2.6 2.6 0 1 1 3.6 2.4c-.6.3-1 .9-1 1.6v.6"],["s","M12 17.2h.01"]],"restart":[["s","M4.5 12a7.5 7.5 0 1 0 2.2-5.3"],["s","M4.5 3.5v4.5H9"]],"debug":[["s","M8 8.5a4 4 0 0 1 8 0V16a4 4 0 0 1-8 0Z"],["s","M3.5 12.5H8"],["s","M16 12.5h4.5"],["s","M4.5 7l3.5 2"],["s","M19.5 7 16 9"],["s","M4.5 19l3.5-2.2"],["s","M19.5 19 16 16.8"]],"comms":[["s","M3.5 4.5h17v11.5h-10l-6 4.5Z"]],"chevron":[["s","M9 5l7 7-7 7"]],"back":[["s","M15 5l-7 7 7 7"]]};
  const P2D={};
  function paths(name){
    if(P2D[name])return P2D[name];
    const def=ICONS[name];if(!def)return null;
    return (P2D[name]=def.map(([m,d])=>[m,new Path2D(d)]));
  }
  /* draw a 24-grid icon centred at (x,y), `size` px tall */
  function icon(ctx,name,x,y,size,color,opt){
    const ps=paths(name);if(!ps)return;
    const s=size/24,o=opt||{};
    ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(s,s);
    ctx.lineCap='round';ctx.lineJoin='round';
    if(o.outline){ /* ink halo so icons read over terrain */
      ctx.strokeStyle=C.ink;ctx.lineWidth=(o.weight||2.25)+3.5/s;
      for(const [m,p] of ps){ctx.stroke(p);if(m==='f'){ctx.fillStyle=C.ink;ctx.fill(p);}}
    }
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=o.weight||2.25;
    for(const [m,p] of ps){if(m==='f')ctx.fill(p);else ctx.stroke(p);}
    ctx.restore();
  }

  /* ---------- primitives ---------- */
  function rr(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
  function chunky(ctx,x,y,w,h,r,fill,opt){ /* filled box with ink outline + hard drop */
    const o=opt||{};
    if(o.drop!==0){rr(ctx,x,y+(o.drop||3),w,h,r);ctx.fillStyle=C.ink;ctx.fill();}
    rr(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
    ctx.lineWidth=o.line||2;ctx.strokeStyle=C.ink;ctx.stroke();
  }

  /* ---------- labels ---------- */
  /* name tags, location labels, floating text. Always on solid backing.
     kind: 'unit' | 'place' | 'loot' | 'float'. Returns the drawn rect. */
  function label(ctx,text,x,y,opt){
    const o=Object.assign({color:C.text,bg:C.ink,size:12,weight:800,kind:'unit',align:'center',pad:6,icon:null},opt||{});
    ctx.save();
    ctx.font=(o.kind==='place'?'400 ':o.weight+' ')+o.size+'px '+(o.kind==='place'?FONT.display:FONT.ui);
    const tw=ctx.measureText(text).width,iw=o.icon?o.size+4:0;
    const w=tw+iw+o.pad*2,h=o.size+o.pad*1.2+2;
    const lx=o.align==='center'?x-w/2:o.align==='right'?x-w:x, ly=y-h/2;
    if(o.kind==='place'){ /* places: no box, ink stroke text, quieter */
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=4;ctx.strokeStyle=rgba(C.ink,.9);ctx.strokeText(text,x,y);
      ctx.fillStyle=o.color;ctx.fillText(text,x,y);
    }else{
      rr(ctx,lx,ly,w,h,h/2);ctx.fillStyle=o.bg;ctx.fill();
      if(o.border){ctx.lineWidth=2;ctx.strokeStyle=o.border;ctx.stroke();}
      if(o.icon)icon(ctx,o.icon,lx+o.pad+o.size/2,y,o.size,o.color);
      ctx.fillStyle=o.color;ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(text,lx+o.pad+iw,y+0.5);
    }
    ctx.restore();
    return {x:lx,y:ly,w,h};
  }
  /* label layer: queue labels with a priority, flush once per frame.
     Higher priority wins; lower ones try to nudge down, then hide. */
  function labelLayer(){
    const q=[];
    return {
      add(text,x,y,opt,priority){q.push({text,x,y,opt:opt||{},p:priority||0});},
      flush(ctx){
        q.sort((a,b)=>b.p-a.p);const placed=[];
        const hit=r=>placed.some(p=>r.x<p.x+p.w&&r.x+r.w>p.x&&r.y<p.y+p.h&&r.y+r.h>p.y);
        for(const l of q){
          ctx.save();ctx.font='800 '+(l.opt.size||12)+'px '+FONT.ui;
          const w=ctx.measureText(l.text).width+16,h=(l.opt.size||12)+10;ctx.restore();
          let tries=[0,h+2,-(h+2),2*(h+2)],ok=null;
          for(const dy of tries){const r={x:l.x-w/2,y:l.y+dy-h/2,w,h};if(!hit(r)){ok={r,dy};break;}}
          if(!ok)continue;
          placed.push(ok.r);label(ctx,l.text,l.x,l.y+ok.dy,l.opt);
        }
        q.length=0;
      }
    };
  }

  /* ---------- unit token ----------
     side: 'friend'|'foe'|'neutral'; role icon inside; facing in radians.
     states: selected, acting, targeted, panicking, down, ordered */
  function unitToken(ctx,x,y,o){
    o=Object.assign({side:'friend',r:15,icon:'soldier',t:0},o||{});
    const col=o.side==='foe'?C.heg:o.side==='neutral'?C.steel:C.rebel;
    const r=o.r;
    ctx.save();
    if(o.down){ctx.globalAlpha=.55;}
    /* acting pulse */
    if(o.acting){const k=(Math.sin(o.t*5)+1)/2;ctx.beginPath();ctx.arc(x,y,r+8+k*5,0,Math.PI*2);ctx.strokeStyle=rgba(col,.55-k*.35);ctx.lineWidth=3;ctx.stroke();}
    /* selection: gold ring with rotating notches */
    if(o.selected){
      ctx.beginPath();ctx.arc(x,y,r+7,0,Math.PI*2);ctx.lineWidth=5;ctx.strokeStyle=C.ink;ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle=C.gold;ctx.stroke();
      for(let i=0;i<4;i++){const a=o.t*1.4+i*Math.PI/2;ctx.beginPath();ctx.arc(x,y,r+12,a-.18,a+.18);ctx.lineWidth=4;ctx.strokeStyle=C.gold;ctx.stroke();}
    }
    /* drop + body */
    ctx.beginPath();ctx.arc(x,y+3,r,0,Math.PI*2);ctx.fillStyle=C.ink;ctx.fill();
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=C.void;ctx.fill();
    if(o.side==='foe'&&!o.down){ctx.save();ctx.shadowColor=rgba(C.heg,.85);ctx.shadowBlur=14;ctx.lineWidth=4;ctx.strokeStyle=col;ctx.stroke();ctx.restore();}
    ctx.lineWidth=4;ctx.strokeStyle=col;ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,r+2.5,0,Math.PI*2);ctx.lineWidth=2;ctx.strokeStyle=C.ink;ctx.stroke();
    /* facing nub */
    if(o.facing!=null&&!o.down){
      const fx=x+Math.cos(o.facing)*(r+6),fy=y+Math.sin(o.facing)*(r+6);
      ctx.save();ctx.translate(fx,fy);ctx.rotate(o.facing);
      ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-5);ctx.lineTo(-3,5);ctx.closePath();
      ctx.fillStyle=col;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.ink;ctx.stroke();ctx.restore();
    }
    icon(ctx,o.down?'skull':o.icon,x,y,r*1.15,o.down?C.text3:col);
    /* panic badge */
    if(o.panicking&&!o.down){ctx.beginPath();ctx.arc(x+r*.8,y-r*.8,8,0,Math.PI*2);ctx.fillStyle=C.hazard;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.ink;ctx.stroke();
      icon(ctx,'panic',x+r*.8,y-r*.8,11,C.ink,{weight:3});}
    /* ordered: small gold dot bottom-right */
    if(o.ordered&&!o.down){ctx.beginPath();ctx.arc(x+r*.8,y+r*.8,5,0,Math.PI*2);ctx.fillStyle=C.gold;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.ink;ctx.stroke();}
    ctx.restore();
    if(o.targeted)reticle(ctx,x,y,r+10,o.t);
  }

  /* ---------- health pips above a unit ---------- */
  function hpPips(ctx,x,y,o){
    o=Object.assign({hp:100,max:100,cells:5,cw:8,ch:6,gap:2},o||{});
    const f=Math.max(0,o.hp/o.max),col=f>.6?ROLE.hpHigh:f>.34?ROLE.hpMid:ROLE.hpLow;
    const w=o.cells*o.cw+(o.cells-1)*o.gap+4,h=o.ch+4,lx=x-w/2,ly=y-h/2;
    rr(ctx,lx,ly,w,h,3);ctx.fillStyle=C.ink;ctx.fill();
    const lit=Math.ceil(f*o.cells-0.001);
    for(let i=0;i<o.cells;i++){
      rr(ctx,lx+2+i*(o.cw+o.gap),ly+2,o.cw,o.ch,1.5);ctx.fillStyle=i<lit?col:'#1b1f40';ctx.fill();
    }
    if(o.showNum){label(ctx,Math.round(o.hp)+'',lx+w+12,y,{size:11,color:col,pad:4});}
  }

  /* ---------- cover pip (green shield, filled = full cover) ---------- */
  function coverPip(ctx,x,y,level){
    const col=C.go;
    ctx.save();
    ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fillStyle=C.ink;ctx.fill();
    icon(ctx,'shield',x,y,13,col,{weight:2.6});
    if(level>=2){ctx.save();ctx.translate(x-6.5,y-6.5);ctx.scale(13/24,13/24);ctx.fillStyle=rgba(col,.55);
      ctx.fill(new Path2D(ICONS.shield[0][1]));ctx.restore();}
    ctx.restore();
  }

  /* ---------- target reticle (red brackets, slow spin) ---------- */
  function reticle(ctx,x,y,r,t){
    ctx.save();ctx.translate(x,y);ctx.rotate((t||0)*.8);
    for(let i=0;i<4;i++){
      ctx.rotate(Math.PI/2);
      ctx.beginPath();ctx.moveTo(r,-r*.45);ctx.lineTo(r,-r);ctx.lineTo(r*.55,-r);
      ctx.lineCap='round';ctx.lineJoin='round';
      ctx.lineWidth=6;ctx.strokeStyle=C.ink;ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle=C.hazard;ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- sight cone: far band amber, near (spots sneakers) red ---------- */
  function sightCone(ctx,x,y,angle,spread,range,nearRange,o){
    o=o||{};const a0=angle-spread/2,a1=angle+spread/2;
    const alert=o.alert?1:0;
    ctx.save();
    ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,range,a0,a1);ctx.closePath();
    const g=ctx.createRadialGradient(x,y,nearRange,x,y,range);
    g.addColorStop(0,rgba(alert?C.hazard:C.heg,.24));g.addColorStop(1,rgba(alert?C.hazard:C.heg,.05));
    ctx.fillStyle=g;ctx.fill();
    ctx.setLineDash([7,6]);ctx.lineWidth=2;ctx.strokeStyle=rgba(alert?C.hazard:C.heg,.7);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,nearRange,a0,a1);ctx.closePath();
    ctx.fillStyle=rgba(C.hazard,.24);ctx.fill();
    ctx.restore();
  }

  /* ---------- detection gauge: an eye that fills ---------- */
  function detectGauge(ctx,x,y,frac){
    if(frac<=0)return;
    const col=frac>=1?C.heg:frac>.6?C.hazard:C.gold;
    ctx.save();
    chunky(ctx,x-15,y-11,30,22,11,C.ink,{drop:0});
    ctx.save();rr(ctx,x-13,y-9,26*Math.min(1,frac),18,9);ctx.clip();
    ctx.fillStyle=rgba(col,.45);ctx.fillRect(x-15,y-11,30,22);ctx.restore();
    icon(ctx,'eye',x,y,16,col,{weight:2.6});
    ctx.restore();
  }

  /* ---------- move / sprint reach ring + destination ---------- */
  function moveRing(ctx,x,y,r,kind){
    const col=kind==='sprint'?C.gold:C.rebel;
    ctx.save();
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=rgba(col,.06);ctx.fill();
    ctx.setLineDash([10,8]);ctx.lineWidth=5;ctx.strokeStyle=rgba(C.ink,.8);ctx.stroke();
    ctx.lineWidth=2.5;ctx.strokeStyle=col;ctx.stroke();ctx.setLineDash([]);
    ctx.restore();
  }
  function plotLine(ctx,x0,y0,x1,y1,kind,t){
    const col=kind==='sprint'?C.gold:C.rebel;
    ctx.save();ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);
    ctx.lineWidth=6;ctx.strokeStyle=rgba(C.ink,.8);ctx.stroke();
    ctx.setLineDash([2,9]);ctx.lineDashOffset=-(t||0)*20;ctx.lineWidth=4;ctx.strokeStyle=col;ctx.stroke();ctx.setLineDash([]);
    /* destination marker */
    ctx.beginPath();ctx.arc(x1,y1,8,0,Math.PI*2);ctx.fillStyle=C.ink;ctx.fill();
    ctx.beginPath();ctx.arc(x1,y1,5,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    ctx.restore();
  }

  /* ---------- firing line (engagement) ---------- */
  function fireLine(ctx,x0,y0,x1,y1,side,t){
    const col=side==='foe'?C.heg:C.rebel;
    ctx.save();ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);
    ctx.lineWidth=6;ctx.strokeStyle=rgba(C.ink,.7);ctx.stroke();
    ctx.setLineDash([12,8]);ctx.lineDashOffset=-(t||0)*40;ctx.lineWidth=3;ctx.strokeStyle=col;ctx.stroke();
    ctx.restore();
  }

  /* ---------- world objective / interactable marker ---------- */
  function marker(ctx,x,y,o){
    o=Object.assign({icon:'star',color:C.gold,t:0,size:30},o||{});
    const s=o.size,bob=Math.sin(o.t*3)*3;
    ctx.save();
    ctx.beginPath();ctx.ellipse(x,y+s*.55,s*.35,s*.12,0,0,Math.PI*2);ctx.fillStyle=rgba(C.ink,.6);ctx.fill();
    ctx.translate(x,y-s*.35+bob);ctx.rotate(Math.PI/4);
    chunky(ctx,-s/2.6,-s/2.6,s/1.3,s/1.3,5,o.color,{drop:0,line:2.5});
    ctx.rotate(-Math.PI/4);
    icon(ctx,o.icon,0,0,s*.5,C.ink,{weight:3});
    ctx.restore();
  }

  return {C,ROLE,FONT,ICONS,sync,rgba,icon,rr,chunky,label,labelLayer,unitToken,hpPips,coverPip,reticle,sightCone,detectGauge,moveRing,plotLine,fireLine,marker};
})();
