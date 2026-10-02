'use strict';
/* =====================================================================
   STAR REBELLION — WORLD ART KIT  ("Bobbleheads")  sr-art.js  v1
   Everything in the game world that isn't HUD: characters, weapons, gear,
   poses, props, terrain, effects and ships. Pure Canvas 2D, no image files.
   Pairs with sr-theme.js (HUD kit): reads SR_THEME.C when present so the
   faction colours stay in one place.

   Rules of the house
   1. Faces carry state. If a unit is aiming, shaken or down, you can read
      it off the face before any number.
   2. Red is ours, blue is theirs, on the body: a red scarf or armband on
      every rebel, blue visor, trim or scarf on every hostile.
   3. Swap, don't redraw. A character is assembled each frame from slots
      (body, head, weapon, gear, pose). New kit is data, never new art.
   4. One ink, one light. 2.6px ink outline on characters, 2.2 on held
      things, 3 on terrain. Light from the top left, one cel-shade tone.
   5. Rebels make do; the Hegemony doesn't. Rebel kit and ships are patched,
      faded and personal. Hegemony kit is clean, white-and-navy, faceless.
   6. The world stays quiet so people pop: terrain is low-contrast and
      desaturated; saturation is spent on characters, props you can use,
      and effects.
   ===================================================================== */
window.SR_ART=(function(){
  const TAU=Math.PI*2;
  /* ---------- palette (faction colours come from the HUD kit) ---------- */
  const H=(window.SR_THEME&&SR_THEME.C)||{};
  const C=Object.assign({
    ink:'#070818',gold:'#ffc83a',goldHi:'#ffd866',rebel:'#ff4a3d',rebelHi:'#ff8a5c',heg:'#4f8cff',hegHi:'#9cc2ff',hegDeep:'#1a3a9e',
    shield:'#36e3f2',hazard:'#ff8a1f',go:'#78ec5c',steel:'#b9c5e6',text:'#f1f3ff'
  },H);
  const W={ /* world palette */
    eye:'#fffaf0',tongue:'#ff7a7a',mouth:'#3a0a0a',sweat:'#7fd8ff',boot:'#2a2420',
    gunDark:'#3b3a44',gunDeep:'#2a2a32',wood:'#8a5a32',woodHi:'#9a6a3a',grip:'#6b4a2c',olive:'#6a7040',oliveDeep:'#4a4f2a',
    helmet:'#5d6a3c',vest:'#4a525e',pouch:'#8a7a56',pack:'#5a4a32',packRoll:'#8a7a56',frag:'#5d7a3a',medkit:'#f1ede4',
    hegWhite:'#d5dbea',hegShade:'#9aa3bd',hegNavy:'#2c3f8f',hegVisor:'#11152a',
    crate:'#c08a4a',crateFront:'#93622e',drum:'#c2402e',drumHi:'#e0604a',metal:'#5b6270',metalFront:'#3c414c',lamp:'#ffe8a8'
  };
  const BIOME={
    dust:{floor:'#5a3a24',tileA:'#62412a',tileB:'#553722',crack:'rgba(30,16,8,.5)',trail:'rgba(150,104,62,.45)',rockTop:'#4a3424',rockFront:'#2e1f15',rockLine:'rgba(0,0,0,.35)',rockHi:'rgba(255,220,170,.12)',boulder:'#6a4a34',boulderHi:'#86603f'},
    rock:{floor:'#2f3a46',tileA:'#36424f',tileB:'#2b3540',crack:'rgba(8,12,20,.55)',trail:'rgba(120,140,160,.25)',rockTop:'#3c4654',rockFront:'#222a34',rockLine:'rgba(0,0,0,.4)',rockHi:'rgba(200,220,255,.12)',boulder:'#4c5866',boulderHi:'#64748a'},
  };
  const SKIN=['#f3d2b4','#e8b994','#d39a72','#b47c55','#9c623c','#6e4229'];
  const HAIRC=['#1a120d','#2e1e14','#5a3a22','#8a5a2e','#c99a5a','#d8dbe6','#a8402a','#3a3a3a'];
  const LW={char:2.6,held:2.2,prop:3};

  /* ---------- helpers ---------- */
  function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}
  function rgb2hex(r,g,b){return'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');}
  function rgba(h,a){const[r,g,b]=hex2rgb(h);return`rgba(${r},${g},${b},${a})`;}
  function shade(h,f){const[r,g,b]=hex2rgb(h);return f<0?rgb2hex(r*(1+f),g*(1+f),b*(1+f)):rgb2hex(r+(255-r)*f,g+(255-g)*f,b+(255-b)*f);}
  function mkRng(seed){let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
  function hashStr(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function rr(c,x,y,w,h,r){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h);}
  function ell(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);}
  function circ(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);}
  function poly(c,pts){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();}
  function ink(c,fill,lw){c.fillStyle=fill;c.fill();if(lw){c.lineWidth=lw;c.strokeStyle=C.ink;c.lineJoin='round';c.stroke();}}
  function headShade(c,x,y,r,col){circ(c,x,y,r);c.fillStyle=shade(col,-.22);c.fill();c.save();circ(c,x,y,r);c.clip();circ(c,x-r*.22,y-r*.25,r*.95);c.fillStyle=col;c.fill();c.restore();circ(c,x,y,r);c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();}
  function star(c,x,y,r,col){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}c.closePath();ink(c,col||C.gold,1.6);}
  function hand(c,x,y,skin){circ(c,x,y,3.8);ink(c,skin,2.2);}

  /* =================================================================
     CHARACTERS
     A spec describes who someone is; a pose describes what they're doing.
     spec: {name, side:'reb'|'foe'|'neu', kind:'human'|'trooper'|'bot',
            skin, hair, hs (hair style), beard, tache, goggles, hood, cap, hat,
            coat, coat2, pants, acc (faction accent), badge, weapon, gear:[]}
     pose: {state, view:'front'|'side'|'back', dir:±1, aim (radians, world),
            t (seconds), s (scale), slung}
     Construction at s=1 (1 unit = 1 css px at zoom 1; about the size of
     the old r=15 token): head r14.5 centred at y-33, body 19x16 from y-21,
     feet at y-3, anchor = the point between the feet.
     ================================================================= */
  const CAST={
    dax: {name:'Dax Ferro',side:'reb',skin:'#9c623c',hair:'#2e1e14',hs:'buzz',beard:1,coat:'#5a3b28',coat2:'#3e2a1d',acc:C.rebel,pants:'#33343c',weapon:'akli'},
    runa:{name:'Runa Vel',side:'reb',skin:'#efc9a6',hair:'#d8dbe6',hs:'bob',goggles:1,coat:'#4f5c48',coat2:'#3a4535',acc:C.rebel,pants:'#2f3038',weapon:'akli',gear:['frags','charge']},
    kel: {name:'Kel Brasso',side:'reb',skin:'#b47c55',hair:'#3a2416',hs:'mop',hood:'#646a3a',coat:'#646a3a',coat2:'#4a4f2a',acc:C.rebel,pants:'#3a3328',weapon:'akli'},
    joss:{name:'Joss Marrek',side:'reb',skin:'#d9a982',hair:'#6b4a2a',hs:'cap',cap:'#7a5532',goggles:1,coat:'#9a6b3a',coat2:'#74502b',acc:C.rebel,pants:'#3b3430',weapon:'cowboy'},
  };
  const ARCH={ /* archetypes for everyone who isn't named crew */
    squatter:{name:'Squatter',side:'foe',skin:'#c49a7c',hair:'#2b2b2b',hs:'rag',hood:'#6d6354',coat:'#6d6354',coat2:'#514a3e',acc:C.heg,pants:'#3c3a36',weapon:'akli'},
    craw:{name:'Boss Craw',side:'foe',skin:'#a87358',hair:'#4a3a2a',hs:'bald',beard:1,coat:'#4a4e57',coat2:'#373a41',acc:C.heg,pants:'#2b2c31',weapon:'scatter',big:1.12},
    trooper:{name:'Trooper',side:'foe',kind:'trooper',skin:'#c9a184',coat:W.hegWhite,coat2:W.hegShade,acc:C.heg,pants:W.hegNavy,armor:W.hegWhite,plate:W.hegNavy,weapon:'carbine'},
    deputy:{name:'Deputy',side:'foe',skin:'#d9a982',hair:'#5a3a22',hs:'stetson',hat:'#6a5a44',coat:'#7a7466',coat2:'#5e594e',acc:C.heg,pants:'#3b3a40',badge:1,weapon:'hg40',gear:['policevest']},
    sheriff:{name:'Sheriff',side:'foe',skin:'#c49070',hair:'#8a8a8a',hs:'stetson',hat:'#3a3230',tache:1,coat:'#5a4636',coat2:'#44352a',acc:C.heg,pants:'#2e2a2a',badge:2,weapon:'hg40',gear:['policevest'],big:1.1},
    riot:{name:'Riot shieldman',side:'foe',kind:'trooper',skin:'#c9a184',coat:'#3a4a7a',coat2:'#2c3a62',acc:C.heg,pants:'#232c4e',armor:'#4a5a8a',plate:'#1a2240',weapon:'hg40',gear:['shield','policevest']},
    bot:{name:'Policebot',side:'foe',kind:'bot',coat:'#8a94a8',coat2:'#6a7488',acc:C.heg,pants:'#4a5266',weapon:'autohand'},
    civ:{name:'Townsfolk',side:'neu',skin:'#e8b994',hair:'#8a5a2e',hs:'mop',coat:'#9a8a6a',coat2:'#7a6c52',acc:'#b9c5e6',pants:'#5a5248',weapon:null},
    prisoner:{name:'Prisoner',side:'reb',skin:'#d39a72',hair:'#1a120d',hs:'buzz',coat:'#9aa28a',coat2:'#7c8470',acc:C.rebel,pants:'#7c8470',weapon:null,cuffs:1},
  };
  /* seeded recruit: same name, same face, every time */
  const RCOAT=[['#5a3b28','#3e2a1d'],['#4f5c48','#3a4535'],['#646a3a','#4a4f2a'],['#6a5a4a','#4e4236'],['#4a4e57','#373a41'],['#7a5a3a','#5a4028'],['#5a5068','#423a4e']];
  function recruit(seedStr,o){
    const r=mkRng(hashStr(String(seedStr)));const pick=a=>a[Math.floor(r()*a.length)];
    const hs=pick(['buzz','bob','mop','bald','cap','buzz','mop']);const coat=pick(RCOAT);
    return Object.assign({name:String(seedStr),side:'reb',skin:pick(SKIN),hair:pick(HAIRC),hs,beard:r()<.25?1:0,tache:r()<.12?1:0,goggles:r()<.18?1:0,
      cap:pick(['#7a5532','#5a6a3c','#6a4a3a']),hood:hs==='mop'&&r()<.3?coat[0]:null,coat:coat[0],coat2:coat[1],acc:C.rebel,pants:pick(['#33343c','#3a3328','#2f3038','#3b3430']),weapon:'akli',gear:[]},o||{});
  }
  function spec(idOrSpec){if(typeof idOrSpec==='object')return idOrSpec;return CAST[idOrSpec]||ARCH[idOrSpec]||recruit(idOrSpec);}
  /* facing angle (world radians, 0 = east, +y down) -> view */
  function viewFor(angle){const s=Math.sin(angle),c=Math.cos(angle);if(s>.6)return{view:'front',dir:c>=0?1:-1};if(s<-.6)return{view:'back',dir:c>=0?1:-1};return{view:'side',dir:c>=0?1:-1};}

  /* ---------- faces ---------- */
  function face(c,hx,hy,R,look,st,t,turn){
    const ox=turn*R*.32,ex=R*.42,ey=hy-R*.02;
    const blink=(st==='idle'||st==='walk'||st==='grin')&&(t%3.6)>3.45;
    const eyes=[[hx+ox-ex*(1-turn*.15),R*.36*(1-turn*.25)],[hx+ox+ex*(1+turn*.15),R*.36*(1+turn*.25)]];
    c.lineCap='round';
    if(st==='down'){c.lineWidth=2.6;c.strokeStyle=C.ink;for(const[x]of eyes){const s=R*.18;c.beginPath();c.moveTo(x-s,ey-s);c.lineTo(x+s,ey+s);c.moveTo(x+s,ey-s);c.lineTo(x-s,ey+s);c.stroke();}
      ell(c,hx+ox,hy+R*.45,R*.18,R*.1);c.fillStyle=C.ink;c.fill();return;}
    eyes.forEach(([x,rw],i)=>{
      let h=rw*1.2;if(blink)h=1.2;if(st==='aim'&&i===0)h=1.4;if(st==='panic')h=rw*1.4;if(st==='focus')h=rw*.8;if(st==='sneak')h=rw*.95;if(st==='grin')h=rw*.9;if(st==='flat')h=rw*.75;
      ell(c,x,ey,st==='panic'?rw*1.12:rw,h);c.fillStyle=W.eye;c.fill();c.lineWidth=2.2;c.strokeStyle=C.ink;c.stroke();
      if(h>2){const pr=st==='panic'?rw*.32:rw*.55;const px=x+Math.cos(look)*rw*.38,py=ey+Math.sin(look)*h*.3;circ(c,px,py,pr);c.fillStyle=C.ink;c.fill();circ(c,px-pr*.35,py-pr*.35,pr*.32);c.fillStyle='#fff';c.fill();}
      if(st==='focus'||st==='flat'){c.beginPath();c.moveTo(x-rw,ey-h*.2);c.lineTo(x+rw,ey-h*.2);c.lineWidth=2.4;c.stroke();}
    });
    c.lineWidth=2.2;c.strokeStyle=C.ink;
    eyes.forEach(([x,rw],i)=>{const s=i?1:-1;let a=0,dy=-rw*2.05;
      if(st==='aim'||st==='shout'){a=s*.35;dy=-rw*1.7;}if(st==='panic'){a=-s*.45;dy=-rw*2.5;}if(st==='walk'||st==='grin')a=s*.15;if(st==='focus'){a=-s*.15;dy=-rw*1.8;}if(st==='sneak'||st==='flat')dy=-rw*1.55;if(st==='worried'){a=-s*.3;dy=-rw*2.2;}
      c.beginPath();c.moveTo(x-rw*.7,ey+dy+Math.sin(a)*rw*.7*s);c.lineTo(x+rw*.7,ey+dy-Math.sin(a)*rw*.7*s);c.stroke();});
    const mx=hx+ox,my=hy+R*.48;
    if(st==='aim'){rr(c,mx-R*.24,my-R*.08,R*.48,R*.2,2);c.fillStyle=W.eye;c.fill();c.lineWidth=2;c.stroke();c.beginPath();c.moveTo(mx-R*.24,my+R*.02);c.lineTo(mx+R*.24,my+R*.02);c.lineWidth=1.4;c.stroke();}
    else if(st==='panic'){c.beginPath();for(let k=0;k<=6;k++){const xx=mx-R*.28+k*R*.093,yy=my+((k%2)?-1:1)*R*.06+Math.sin(t*30)*.6;k?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.lineWidth=2.2;c.stroke();}
    else if(st==='shout'){ell(c,mx,my,R*.2,R*.16);c.fillStyle=W.mouth;c.fill();c.lineWidth=2.2;c.stroke();ell(c,mx,my+R*.08,R*.1,R*.05);c.fillStyle=W.tongue;c.fill();}
    else if(st==='grin'){c.beginPath();c.moveTo(mx-R*.26,my-R*.1);c.lineTo(mx+R*.26,my-R*.1);c.arc(mx,my-R*.1,R*.26,0,Math.PI);c.closePath();c.fillStyle=W.mouth;c.fill();c.lineWidth=2.2;c.stroke();c.fillStyle=W.eye;c.fillRect(mx-R*.2,my-R*.1,R*.4,R*.08);}
    else if(st==='focus'){c.beginPath();c.moveTo(mx-R*.1,my);c.lineTo(mx+R*.14,my-R*.02);c.lineWidth=2.2;c.stroke();ell(c,mx+R*.16,my+R*.04,R*.06,R*.05);c.fillStyle=W.tongue;c.fill();}
    else if(st==='worried'){c.beginPath();c.arc(mx,my+R*.06,R*.16,1.15*Math.PI,1.85*Math.PI);c.lineWidth=2.2;c.stroke();}
    else if(st==='flat'){c.beginPath();c.moveTo(mx-R*.18,my-R*.04);c.lineTo(mx+R*.12,my-R*.06);c.lineWidth=2.4;c.stroke();}
    else if(st==='sneak'){c.beginPath();c.moveTo(mx-R*.16,my-R*.05);c.lineTo(mx+R*.16,my-R*.05);c.lineWidth=2.4;c.stroke();}
    else if(st==='walk'){c.beginPath();c.arc(mx,my-R*.12,R*.2,.25*Math.PI,.75*Math.PI);c.lineWidth=2.4;c.stroke();}
    else{c.beginPath();c.arc(mx,my-R*.18,R*.22,.2*Math.PI,.8*Math.PI);c.lineWidth=2.4;c.stroke();}
  }
  /* Hegemony visor: two glowing slits that still emote */
  function visor(c,hx,hy,R,st,turn,col){
    const vx=hx+turn*R*.3;rr(c,vx-R*.82,hy-R*.32,R*1.64,R*.62,R*.3);ink(c,W.hegVisor,LW.char-.4);
    c.fillStyle=col||C.heg;c.shadowColor=col||C.heg;c.shadowBlur=8;
    for(const s of[-1,1]){const ex=vx+s*R*.36,ey=hy-R*.02;c.save();c.translate(ex,ey);if(st==='aim'||st==='shout')c.rotate(s*-.35);
      if(st==='panic'){circ(c,0,0,R*.13);c.fill();}else if(st==='down'){c.fillRect(-R*.16,-1,R*.32,2);}else if(st==='focus'){c.fillRect(-R*.2,0,R*.4,R*.08);}else{rr(c,-R*.2,-R*.07,R*.4,R*.15,2);c.fill();}c.restore();}
    c.shadowBlur=0;
  }
  /* Policebot screen face: robots don't panic, they error */
  function botFace(c,hx,hy,R,st,t){
    rr(c,hx-R,hy-R*.85,R*2,R*1.7,R*.45);ink(c,'#a8b2c6',LW.char);rr(c,hx-R*.78,hy-R*.6,R*1.56,R*1.15,R*.25);ink(c,'#0d1a24',2);
    c.save();c.fillStyle=C.shield;c.shadowColor=C.shield;c.shadowBlur=6;c.strokeStyle=C.shield;c.lineWidth=2;c.lineCap='round';
    if(st==='down'){c.font=`900 ${R*.55}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ff6a6a';c.fillText('ERR',hx,hy);}
    else if(st==='panic'){c.font=`900 ${R*.7}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText('?!',hx,hy);}
    else{for(const s of[-1,1]){if(st==='aim'){c.beginPath();c.moveTo(hx+s*R*.5,hy-R*.25);c.lineTo(hx+s*R*.2,hy-R*.1);c.stroke();}else{rr(c,hx+s*R*.36-R*.1,hy-R*.28,R*.2,(t%3>2.85?.05:.32)*R,2);c.fill();}}
      c.beginPath();if(st==='aim'){c.moveTo(hx-R*.3,hy+R*.3);c.lineTo(hx+R*.3,hy+R*.3);}else c.arc(hx,hy+R*.12,R*.25,.2*Math.PI,.8*Math.PI);c.stroke();}
    c.restore();
    c.beginPath();c.moveTo(hx+R*.5,hy-R*.85);c.lineTo(hx+R*.7,hy-R*1.35);c.lineWidth=2;c.strokeStyle=C.ink;c.stroke();circ(c,hx+R*.7,hy-R*1.4,2.6);c.fillStyle=Math.sin(t*6)>0?'#ff4a3d':C.heg;c.fill();c.lineWidth=1.4;c.stroke();
  }
  /* ---------- hair & headgear ---------- */
  function hair(c,ch,hx,hy,R,view,turn){
    const hs=ch.hs,hc=ch.hair,lw=LW.char,pt=(a,r)=>[hx+Math.cos(a)*r,hy+Math.sin(a)*r];
    c.save();c.lineJoin='round';
    if(view==='back'){
      if(hs==='bald'){}
      else if(hs==='cap'){circ(c,hx,hy,R+1.5);ink(c,ch.cap,lw);}
      else if(hs==='stetson'){circ(c,hx,hy+2,R+.5);ink(c,hc,lw);}
      else if(hs==='long'){rr(c,hx-R-2,hy-R-1,R*2+4,R*2.1,R);ink(c,hc,lw);}
      else if(hs==='tied'){circ(c,hx,hy,R+1);ink(c,hc,lw);circ(c,hx,hy-R*.9,R*.42);ink(c,hc,lw);}
      else{circ(c,hx,hy+(hs==='bob'?2:0),R+(hs==='bob'?2:1));ink(c,hs==='rag'?ch.hood:hc,lw);}
    }
    else if(hs==='buzz'){c.beginPath();c.arc(hx,hy,R+1,Math.PI*1.13,Math.PI*1.87);c.quadraticCurveTo(hx+turn*4,hy-R*.62,hx-(R+1)*Math.cos(Math.PI*.13),hy-(R+1)*Math.sin(Math.PI*.13));c.closePath();ink(c,hc,lw);}
    else if(hs==='bob'){c.beginPath();c.arc(hx,hy,R+2.5,Math.PI*.92,Math.PI*2.08);c.lineTo(hx+R+3,hy+R*.55);c.lineTo(hx+R*.84,hy+R*.55);c.quadraticCurveTo(hx+R*.82,hy-R*.55,hx+turn*R*.3,hy-R*.72);c.quadraticCurveTo(hx-R*.82,hy-R*.55,hx-R*.84,hy+R*.55);c.lineTo(hx-R-3,hy+R*.55);c.closePath();ink(c,hc,lw);
      c.beginPath();c.arc(hx,hy,R*.95,Math.PI*1.25,Math.PI*1.55);c.lineWidth=2.5;c.strokeStyle='rgba(255,255,255,.55)';c.stroke();}
    else if(hs==='mop'){c.beginPath();const n=9;for(let i=0;i<=n;i++){const p=pt(Math.PI*(.95+1.1*i/n),R+(i%2?6:1.5));i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]);}
      c.lineTo(hx+R*.55,hy-R*.5);c.lineTo(hx+R*.15,hy-R*.72);c.lineTo(hx-R*.2,hy-R*.5);c.lineTo(hx-R*.6,hy-R*.66);c.closePath();ink(c,hc,lw);}
    else if(hs==='cap'){c.beginPath();c.arc(hx,hy,R+2,Math.PI,Math.PI*2);c.lineTo(hx+R+2,hy+R*.45);c.lineTo(hx+R*.72,hy+R*.45);c.lineTo(hx+R*.72,hy-R*.55);c.lineTo(hx-R*.72,hy-R*.55);c.lineTo(hx-R*.72,hy+R*.45);c.lineTo(hx-R-2,hy+R*.45);c.closePath();ink(c,ch.cap,lw);}
    else if(hs==='rag'){c.beginPath();c.moveTo(hx-R*.92,hy+R*.12);c.lineTo(hx+R*.92,hy+R*.12);c.lineTo(hx+R*.7,hy+R*.72);c.quadraticCurveTo(hx+turn*R*.32,hy+R*1.05,hx-R*.7,hy+R*.72);c.closePath();ink(c,'#3a5a9c',lw);
      c.beginPath();c.moveTo(hx-R*.5,hy+R*.42);c.lineTo(hx+R*.5,hy+R*.42);c.lineWidth=1.6;c.strokeStyle=rgba(C.ink,.4);c.stroke();}
    else if(hs==='long'){c.beginPath();c.arc(hx,hy,R+2.5,Math.PI*.9,Math.PI*2.1);c.lineTo(hx+R+3.5,hy+R*1.05);c.lineTo(hx+R*.82,hy+R*1.05);c.quadraticCurveTo(hx+R*.85,hy-R*.5,hx+turn*R*.3,hy-R*.7);c.quadraticCurveTo(hx-R*.85,hy-R*.5,hx-R*.82,hy+R*1.05);c.lineTo(hx-R-3.5,hy+R*1.05);c.closePath();ink(c,hc,lw);
      c.beginPath();c.arc(hx,hy,R*.95,Math.PI*1.25,Math.PI*1.55);c.lineWidth=2.5;c.strokeStyle='rgba(255,255,255,.4)';c.stroke();}
    else if(hs==='tied'){circ(c,hx-turn*R*.5,hy-R*1.05,R*.42);ink(c,hc,lw);c.beginPath();c.arc(hx,hy,R+1,Math.PI*1.1,Math.PI*1.9);c.quadraticCurveTo(hx+turn*3,hy-R*.6,hx-(R+1)*Math.cos(Math.PI*.1),hy-(R+1)*Math.sin(Math.PI*.1));c.closePath();ink(c,hc,lw);}
    else if(hs==='bald'){circ(c,hx-R*.3,hy-R*.5,R*.2);c.fillStyle='rgba(255,255,255,.35)';c.fill();}
    else if(hs==='stetson'){c.beginPath();c.arc(hx,hy,R+1,Math.PI*1.05,Math.PI*1.95);c.lineTo(hx+R*.6,hy-R*.45);c.lineTo(hx-R*.6,hy-R*.45);c.closePath();ink(c,hc,lw);}
    if(hs==='stetson'){ // the hat itself, every view
      const hcol=ch.hat||'#6a5a44';ell(c,hx+turn*1.5,hy-R*.62,R*1.55,R*.36);ink(c,hcol,lw);
      c.beginPath();c.moveTo(hx-R*.8,hy-R*.62);c.quadraticCurveTo(hx-R*.85,hy-R*1.55,hx,hy-R*1.45);c.quadraticCurveTo(hx+R*.85,hy-R*1.55,hx+R*.8,hy-R*.62);c.closePath();ink(c,shade(hcol,.08),lw);
      c.fillStyle=view==='back'?rgba(C.ink,.25):C.heg;c.fillRect(hx-R*.8,hy-R*.86,R*1.6,R*.2);
    }
    if(ch.goggles&&view!=='back'){const gy=hy-R*.8;c.beginPath();c.moveTo(hx-R*.98,gy+2);c.quadraticCurveTo(hx,gy-3,hx+R*.98,gy+2);c.lineWidth=4;c.strokeStyle=C.ink;c.stroke();
      for(const s of[-1,1]){circ(c,hx+turn*R*.3+s*R*.36,gy,R*.2);ink(c,ch.gogCol||'#ffb347',2.4);circ(c,hx+turn*R*.3+s*R*.36-2,gy-2,R*.07);c.fillStyle='#fff';c.fill();}}
    c.restore();
  }
  /* Frontier Hardhat: the default helmet for rebel Soldiers. Camo, red patch, a brim all round. */
  function helmet(c,hx,hy,R,view,turn){
    const tx=hx+turn*1.5,base='#6a7046';
    const dome=()=>{c.beginPath();c.arc(tx,hy-2,R+2.4,Math.PI,Math.PI*2);c.closePath();};
    ell(c,tx,hy-R*.2,R*1.32,R*.26);ink(c,shade(base,-.12),LW.char);
    dome();ink(c,base,LW.char);
    c.save();dome();c.clip();const rn=mkRng(31);const cam=['#4e5434','#8a7a52','#5a4a32'];
    for(let i=0;i<7;i++){ell(c,tx-R+rn()*R*2,hy-R*1.2+rn()*R*1.1,R*(.18+rn()*.2),R*(.12+rn()*.12));c.fillStyle=cam[i%3];c.fill();}
    c.restore();dome();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();
    c.beginPath();c.moveTo(tx,hy-R-4.4);c.lineTo(tx,hy-R*.25);c.lineWidth=3;c.strokeStyle=rgba(C.ink,.35);c.stroke();
    c.beginPath();c.arc(tx,hy-2,R*.7,Math.PI*1.2,Math.PI*1.45);c.lineWidth=2.2;c.strokeStyle='rgba(255,255,255,.35)';c.stroke();
    if(view!=='back'){rr(c,tx+turn*R*.4+R*.3,hy-R*.95,5,3.4,1);ink(c,C.rebel,1.6);}
  }
  /* Police Vest: security forces' first line of defence (Patriot issue) */
  function policeVest(c,view){
    const vw=view==='side'?15:18;rr(c,-vw/2,-22,vw,12.5,3.5);ink(c,'#26305a',2.4);
    c.fillStyle='#d8dde8';c.fillRect(-vw/2+.5,-14.4,vw-1,2);c.fillStyle=rgba(C.hegHi,.9);c.fillRect(-vw/2+.5,-14.4,vw-1,.7);
    if(view!=='back'){const bx=view==='side'?3:-4.5;c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(bx+Math.cos(a)*2.4,-18.6+Math.sin(a)*2.4);}c.closePath();ink(c,'#c8ccd8',1.2);circ(c,bx,-18.6,.8);c.fillStyle=C.heg;c.fill();}
  }

  /* =================================================================
     WEAPONS — drawn in a local frame, +x along the barrel, origin at the
     rear grip. hold: 'two' | 'one' | 'shoulder'. grips: hand x positions
     (null = free hand). len: muzzle x. fx: muzzle effect kind.
     Keys match the prototype's weapon keys (ground.js WPN).
     ================================================================= */
  function part(c,x,y,w,h,r,col,lw){rr(c,x,y,w,h,r);ink(c,col,lw==null?LW.held:lw);}
  let CUR_T=0; // current time, so held items can animate (plasma cores, fingertips, molotov flames)
  const WEAPONS={
    akli:{name:'Akli AR',kind:'Assault rifle',maker:'bhord',tier:1,hold:'two',grips:[0,13],len:28,fx:'ballistic',box:[-8,-7,30,12],draw(c){
      part(c,-7,-2.6,9,6,2.5,W.wood);part(c,1,-3.6,15,7,2.5,W.gunDark);
      c.beginPath();c.moveTo(8,3);c.quadraticCurveTo(10,9,13.5,11);c.lineTo(16.5,9.5);c.quadraticCurveTo(13,7,12,3);c.closePath();ink(c,'#2c2b33',LW.held);
      part(c,15,-2.6,9,5,2,W.grip);part(c,23,-1.4,6,2.8,1,W.gunDeep,1.8);part(c,5,-6,5,2.6,1,W.gunDeep,1.6);
      c.fillStyle='rgba(255,255,255,.25)';c.fillRect(3,-2.6,11,1.2);}},
    cowboy:{name:'Cowboy No.4',kind:'Revolver',maker:null,tier:1,hold:'one',grips:[0,null],len:16,fx:'ballistic',box:[-4,-6,18,8],draw(c){
      c.beginPath();c.moveTo(-2,-1);c.lineTo(3,-2);c.lineTo(2,6);c.quadraticCurveTo(-1,7.5,-3,5.5);c.closePath();ink(c,'#7a4a26',LW.held);
      circ(c,5.5,-.5,3.4);ink(c,'#5a5a66',LW.held);circ(c,5.5,-.5,1);c.fillStyle=C.ink;c.fill();
      part(c,8,-2.4,9,3.6,1.2,'#4a4a56');part(c,1.5,-4.6,3,2.4,1,W.gunDark,1.6);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(9,-2,7,1);}},
    longiron:{name:'Longhorn ’28',kind:'Hunting rifle',maker:null,tier:1,hold:'two',grips:[0,17],len:44,fx:'ballistic',box:[-11,-11,46,8],draw(c){
      c.beginPath();c.moveTo(-10,-2);c.lineTo(3,-3);c.lineTo(3,3);c.lineTo(-4,3);c.quadraticCurveTo(-8,6,-10,4);c.closePath();ink(c,W.woodHi,LW.held);
      part(c,2,-2.4,26,5,2,W.wood);part(c,3,-3.4,10,4,1.5,'#5a5a66');part(c,27,-1.2,17,2.6,1,W.gunDeep,1.8);
      circ(c,9,3.6,1.5);ink(c,'#5a5a66',1.2);
      part(c,5,-9,13,4.4,2,'#2c2b33');part(c,4,-9.8,3,6,1.2,'#2c2b33',1.6);part(c,16,-9.8,3,6,1.2,'#2c2b33',1.6);circ(c,17.6,-6.8,1.3);c.fillStyle=C.shield;c.fill();
      c.strokeStyle='#e8d8b0';c.lineWidth=.9;c.beginPath();c.moveTo(-7,1);c.quadraticCurveTo(-5,-1.5,-3,1);c.stroke(); // horn brand
      c.fillStyle='rgba(255,255,255,.22)';c.fillRect(4,-1.8,20,1);}},
    plasmasmg:{name:'Improvised Plasma SMG',short:'Plasma SMG',kind:'SMG',maker:null,origin:'crafted',tier:1,hold:'two',grips:[1,13],len:22,fx:'plasma',box:[-9,-7,24,11],draw(c){
      c.beginPath();c.moveTo(0,-2);c.lineTo(-7,-2);c.lineTo(-7,3.4);c.lineTo(1,3.4);c.lineWidth=3.4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=1.6;c.strokeStyle='#8a8a92';c.stroke();
      part(c,0,-3.8,12,7.4,2,'#5a5a62');part(c,1,3,3.4,6,1.2,W.gunDark);
      part(c,11,-3,11,2.2,1,'#8a8a92',1.6);part(c,11,.6,9,2.2,1,'#74747c',1.6);
      c.fillStyle='#c8c4b8';c.fillRect(14,-3.4,2.6,6.6);c.strokeStyle=rgba(C.ink,.5);c.lineWidth=.6;c.strokeRect(14,-3.4,2.6,6.6);
      const k=.5+.5*Math.sin(CUR_T*17)*Math.sin(CUR_T*5.3);const g=c.createRadialGradient(6,0,0,6,0,6);g.addColorStop(0,'#fff0e8');g.addColorStop(.5,k>.5?'#ff6a7a':'#ff9a5a');g.addColorStop(1,'rgba(255,90,90,0)');
      circ(c,6,0,5.5+k);c.fillStyle=g;c.fill();circ(c,6,0,3.4);ink(c,k>.5?'#ff7a8a':'#ffaa6a',1.6);
      c.beginPath();c.moveTo(8,-3);c.quadraticCurveTo(11,-7,16,-3.2);c.lineWidth=1;c.strokeStyle='#e04a3a';c.stroke();c.beginPath();c.moveTo(8,3);c.quadraticCurveTo(12,6.5,17,2.4);c.strokeStyle=C.gold;c.stroke();}},
    scatter:{name:'Varmint Shotgun',kind:'Shotgun',maker:null,tier:1,hold:'two',grips:[0,11],len:27,fx:'scatter',box:[-10,-5,28,7],draw(c){
      c.beginPath();c.moveTo(-9,-1.5);c.lineTo(1.5,-2.6);c.lineTo(2,3);c.lineTo(-5,3);c.quadraticCurveTo(-8,5.5,-9.5,4.5);c.closePath();ink(c,W.wood,LW.held);
      part(c,1,-3.2,6,6.2,1.5,'#5a5a66');part(c,6,-3.4,21,2.6,1,W.gunDeep,1.6);part(c,6,-.8,21,2.6,1,W.gunDeep,1.6);part(c,7,1.6,9,3,1.2,W.grip,1.6);
      c.save();c.translate(-5,.6);c.rotate(-.4);poly(c,[[-2.6,-1],[2.6,0],[-2.6,1]]);c.fillStyle='#ff8a2a';c.fill();c.fillStyle='#5aa83a';c.fillRect(-4,-1,1.6,.7);c.fillRect(-4,.3,1.6,.7);c.restore();}},
    rocket:{name:'Improvised Rocket Launcher',short:'Improvised Rocket',kind:'Rocket launcher, one shot',maker:null,origin:'crafted',tier:1,hold:'shoulder',grips:[0,11],len:30,fx:'rocket',box:[-18,-10,32,11],draw(c){
      part(c,-17,-5.4,5,10.8,2,W.oliveDeep);part(c,-14,-4.4,36,8.8,3,W.olive);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(-12,-3.4,32,1.6);
      for(const x of[-6,13]){c.fillStyle='#9a9a9a';c.fillRect(x,-4.4,3,8.8);c.strokeStyle=C.ink;c.lineWidth=1;c.strokeRect(x,-4.4,3,8.8);}
      c.save();rr(c,2,-4.4,7,8.8,0);c.clip();for(let i=-2;i<4;i++){c.fillStyle=i%2?C.gold:C.ink;c.beginPath();c.moveTo(2+i*3,4.4);c.lineTo(5+i*3,-4.4);c.lineTo(8+i*3,-4.4);c.lineTo(5+i*3,4.4);c.fill();}c.restore();
      c.beginPath();c.moveTo(22,-3.6);c.lineTo(27,-3);c.quadraticCurveTo(32,0,27,3);c.lineTo(22,3.6);c.closePath();ink(c,'#d8502e',LW.held);
      part(c,-1,4,3.4,6,1,W.gunDark,1.6);part(c,10,4,3,5,1,W.gunDark,1.6);part(c,3,-9,6,4.6,1.5,W.gunDark,1.6);}},
    hg40:{name:'HG-40',kind:'Heavy pistol (security)',maker:'patriot',makerProposed:1,tier:1,hold:'one',grips:[0,null],len:18,fx:'ballistic',box:[-3,-6,19,9],draw(c){
      c.beginPath();c.moveTo(-1.5,-.5);c.lineTo(4.5,-.5);c.lineTo(3.5,7);c.lineTo(-2.5,7);c.closePath();ink(c,W.hegNavy,LW.held);
      part(c,-1,-4.6,17,5,1.5,W.hegWhite);part(c,15,-3.6,3,3.4,1,'#1a2240',1.6);
      c.save();c.shadowColor=C.heg;c.shadowBlur=4;c.fillStyle=C.hegHi;c.fillRect(2,-2.8,11,1);c.restore();
      c.strokeStyle=rgba(C.ink,.4);c.lineWidth=.6;for(let i=0;i<3;i++){c.beginPath();c.moveTo(1+i*1.4,-4.2);c.lineTo(1+i*1.4,-.8);c.stroke();}}},
    autohand:{name:'Auto Plasma Hand',kind:'Plasma finger (dropped by Autos)',maker:'autocom',tier:1,hold:'one',grips:[-3,null],len:22,fx:'auto',box:[-10,-9,24,6],draw(c){
      c.beginPath();c.moveTo(-6,1);c.quadraticCurveTo(-10,5,-8,8);c.lineWidth=1.2;c.strokeStyle='#d04a3a';c.stroke();c.beginPath();c.moveTo(-6,0);c.quadraticCurveTo(-11,3,-10,6);c.strokeStyle=C.heg;c.stroke();
      part(c,-6,-3,13,6,3,'#9aa4b4');c.strokeStyle=rgba(C.ink,.35);c.lineWidth=.7;c.beginPath();c.moveTo(-2,-3);c.lineTo(-2,3);c.moveTo(2,-3);c.lineTo(2,3);c.stroke();
      circ(c,7.5,0,2.6);ink(c,'#5a6474',1.6);
      part(c,8.5,-3.4,6,6.8,2.5,'#b8c2d2');part(c,13,-3.4,8,2.4,1.2,'#b8c2d2',1.6);part(c,9.4,-8,2.4,5.2,1.2,'#b8c2d2',1.6);
      for(let i=0;i<3;i++){circ(c,14+i*1.8,1.4,1.1);ink(c,'#a8b2c2',1);}
      const k=.6+.4*Math.sin(CUR_T*9);circ(c,21,-2.2,1.4+k);c.fillStyle=rgba(C.shield,.5);c.fill();circ(c,21,-2.2,1);c.fillStyle='#e8ffff';c.fill();}},
    baton:{name:'Power Baton',kind:'Melee',maker:'patriot',makerProposed:1,tier:1,hold:'one',melee:1,grips:[0,null],len:28,fx:'melee',box:[-6,-3,29,3],draw(c){
      circ(c,-3,0,2.6);ink(c,'#3a4060',1.6);part(c,-2,-2.2,7,4.4,2,W.hegNavy);c.strokeStyle=rgba('#ffffff',.3);c.lineWidth=.6;for(let i=0;i<3;i++){c.beginPath();c.moveTo(i*1.8,-2);c.lineTo(i*1.8,2);c.stroke();}
      part(c,4.5,-1.8,20,3.6,1.8,'#2b2f3e');part(c,23,-2.4,5,4.8,2,'#3a4060');
      c.save();c.shadowColor=C.heg;c.shadowBlur=6;c.fillStyle=C.hegHi;c.fillRect(19,-1.6,3,3.2);c.restore();}},
    mininglaser:{name:'Repurposed Mining Laser',short:'Mining Laser',kind:'Sweep beam, needs recharge',maker:null,origin:'scavenged',tier:1,hold:'heavy',grips:[0,12],len:31,fx:'beam',box:[-6,-12,32,11],draw(c){
      c.beginPath();c.moveTo(2,-6);c.quadraticCurveTo(7,-12,12,-6);c.lineWidth=4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=2;c.strokeStyle='#5a5a62';c.stroke();
      part(c,-4,-6,27,11,3,'#c9a23a');c.save();rr(c,-4,-6,27,11,3);c.clip();for(let i=0;i<4;i++){c.fillStyle=C.ink;c.beginPath();c.moveTo(14+i*3,5);c.lineTo(17+i*3,-6);c.lineTo(18.5+i*3,-6);c.lineTo(15.5+i*3,5);c.fill();}
      c.fillStyle='rgba(40,30,20,.35)';ell(c,3,2,3,1.6);c.fill();ell(c,9,-3,2,1.2);c.fill();c.restore();
      part(c,2,4,12,6,2,'#4a4a52');part(c,-2,4,3.4,7,1.2,W.gunDark);part(c,22,-4.6,6,8.4,2,W.gunDark);
      for(let i=0;i<3;i++){c.fillStyle=i<1+Math.floor((CUR_T*1.5)%3)?C.go:'#2a3a2a';c.fillRect(4+i*2.4,6,1.8,2);}
      circ(c,28.5,-.4,2.6);c.fillStyle='#ff6a3a';c.shadowColor='#ff6a3a';c.shadowBlur=6;c.fill();c.shadowBlur=0;c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();}},
    carbine:{name:'Peacekeeper Carbine',short:'Peacekeeper',kind:'Carbine (Hegemony issue)',maker:'patriot',makerProposed:1,tier:1,hold:'two',grips:[0,12],len:24,fx:'plasma',box:[-7,-8,25,10],draw(c){
      part(c,-6,-2.4,8,5.4,2.5,W.hegShade);part(c,1,-3.8,15,7.4,3,W.hegWhite);part(c,6,3,4.5,6,1.5,W.hegNavy);
      part(c,15,-2,9,4,1.5,W.hegNavy);c.save();c.shadowColor=C.heg;c.shadowBlur=6;c.fillStyle=C.hegHi;c.fillRect(3,-1,11,1.4);c.restore();
      part(c,4,-6.6,6,2.6,1,W.hegNavy,1.6);}},
  };
  /* manufacturers: lore, and a look so players know what to expect */
  const MAKERS={
    bhord:{name:'Bhord',what:'Rugged rifles; the Akli.',look:'Wood furniture, stamped dark steel, curved mags. Built to be dropped in mud.',col:['#8a5a32','#3b3a44']},
    tentiu:{name:'TenTiU',what:'Everything, and it all falls apart eventually.',look:'Bright cheap plastics, mismatched colours, visible seams, a sticker where a screw should be.',col:['#e05aa0','#3ad0c0']},
    patriot:{name:'Patriot',what:'Personal weapons for the Hegemony.',look:'Hegemony white and navy, clean blocky shapes, a glowing blue line. Never a scratch.',col:[W.hegWhite,W.hegNavy]},
    mendon:{name:'MenDon',what:'Practical, sturdy ships and vehicles.',look:'Boxy, riveted, utilitarian greys and creams. Panels you can fix with a spanner.',col:['#dfe3ea','#7a7e86']},
    aerostar:{name:'Aerostar',what:'Sleek premium ships: racers, yachts, transports.',look:'Long noses, smooth curves, cream with racing stripes and roundels.',col:['#ece2cc',C.rebel]},
    varrondow:{name:'Varrondow Conglomerate',short:'Varrondow',what:'The Hegemony’s combat craft.',look:'Gunmetal and navy, sharp angles, glowing trim, faceless visor canopies.',col:['#2b3046',C.heg]},
    autocom:{name:'AutoCom',what:'Autos, Bots and Drones.',look:'Grey moulded plastic, cyan LEDs and screens, cables where joints should be.',col:['#9aa4b4',C.shield]},
    blamco:{name:'BLAMCo',what:'Explosives. Accept no imitations.',look:'Cartoon red-and-yellow branding, a starburst logo, hazard stripes.',col:['#e0402e',C.gold]},
  };
  /* ---------- gear slots ---------- */
  const GEAR={
    hardhat:{name:'Frontier Hardhat',slot:'head',note:'Default helmet for rebel Soldiers. Camo, red patch; hair still shows beneath.'},
    policevest:{name:'Police Vest',slot:'torso',note:'Security forces. Navy, reflective stripe, Hegemony badge.'},
    vest:{name:'Plate vest',slot:'torso',note:'Generic plates, for later tiers.'},
    pack:{name:'Field pack',slot:'back',note:'Behind from the side, over the body from the back, straps from the front.'},
    frags:{name:'BLAM Frag Grenade',slot:'belt',note:'Up to two on the belt.'},
    stim:{name:'Stim',slot:'belt',note:'Auto-injector pens in a belt pouch.'},
    medpack:{name:'Medpack',slot:'hip',note:'White case with a red cross on the hip.'},
    charge:{name:'Explosive charge',slot:'belt',note:'BLAM C90 brick, or a crafted Auto Core charge, on the belt.'},
    molotov:{name:'Molotov Cocktail',slot:'belt',note:'Bottle with a rag, hanging at the hip.'},
    angel:{name:'Guardian Angel Drone',slot:'drone',note:'Hovers at the shoulder while active.'},
    shield:{name:'Riot Shield',slot:'weapon (off hand)',note:'Takes a weapon slot; pairs with a one-handed weapon.'},
  };
  const GEAR_ALIAS={helmet:'hardhat',medkit:'stim'};
  const POSES={
    idle:{face:'idle',w:'rest',label:'Idle'},
    walk:{face:'walk',w:'rest',feet:'walk',label:'Move'},
    run:{face:'shout',w:'low',feet:'run',lean:.14,fx:'speed',label:'Sprint'},
    aim:{face:'aim',w:'aim',label:'Aim'},
    fire:{face:'aim',w:'aim',flash:1,label:'Fire'},
    crouch:{face:'sneak',w:'low',crouch:.82,label:'Take cover'},
    overwatch:{face:'aim',w:'aim',crouch:.88,fx:'eye',label:'Hold / overwatch'},
    sneak:{face:'sneak',w:'low',crouch:.84,feet:'tiptoe',fx:'shh',label:'Sneak'},
    throw:{face:'shout',slung:1,prop:'grenade',label:'Throw frag'},
    molotov:{face:'shout',slung:1,prop:'molotov',label:'Throw Molotov'},
    treat:{face:'focus',slung:1,crouch:.88,prop:'medpack',label:'Treat wound'},
    stimuse:{face:'aim',slung:1,prop:'stimpen',label:'Use stim'},
    plant:{face:'focus',slung:1,crouch:.82,prop:'charge',label:'Plant charge'},
    recharge:{face:'focus',w:'low',fx:'charge',label:'Recharge'},
    reload:{face:'focus',w:'reload',prop:'mag',label:'Reload / un-jam'},
    hack:{face:'focus',slung:1,prop:'pad',fx:'code',label:'Hack'},
    work:{face:'focus',slung:1,prop:'wrench',fx:'sparks',label:'Work'},
    loot:{face:'grin',slung:1,prop:'bag',label:'Loot'},
    man:{face:'aim',slung:1,prop:'handles',label:'Man gun'},
    extract:{face:'grin',w:'rest',prop:'wave',label:'Extract'},
    lockin:{face:'aim',w:'rest',fx:'lock',label:'Lock in'},
    panic:{face:'panic',w:'panic',shake:1,fx:'sweat',label:'Shaken'},
    surrender:{face:'panic',w:'none',prop:'handsup',label:'Surrender'},
    cower:{face:'panic',w:'none',crouch:.78,prop:'handshead',shake:.5,label:'Cower'},
    down:{face:'down',w:'none',label:'Down'},
  };


  /* =================================================================
     STORY LAYERS — what a rebel's life leaves on them. Keys live on
     spec.x (from lookOf) or arrive per frame in pose.conds (in-mission
     injuries). Each key draws in one layer: back, feet, body, jaw, head.
     ================================================================= */
  const COND_LOOK={concussed:['headband'],concussion:['headband'],brokenarm:['sling'],brokenleg:['cast','crutch'],wounded:['torsoband'],bleeding:['torsoband'],internal:['torsoband'],
    shrapnel:['plaster'],burned:['soot','torsoband'],burns:['soot','torsoband'],eye:['eyeband'],deafened:['headband'],eardrum:['headband'],facial:['plaster']};
  function xBack(c,ch,X,view,t){
    if(X.has('cape')){const sw=Math.sin(t*3)*2;c.beginPath();c.moveTo(-8,-22);c.quadraticCurveTo(-17+sw,-8,-14+sw,1);c.lineTo(14+sw*.5,1);c.quadraticCurveTo(17,-8,8,-22);c.closePath();ink(c,shade(C.rebel,-.12),LW.char);
      c.beginPath();c.moveTo(-6,-6);c.lineTo(-10+sw,0);c.moveTo(6,-6);c.lineTo(10+sw*.5,0);c.lineWidth=1.4;c.strokeStyle=rgba(C.ink,.3);c.stroke();}
    if(X.has('longcoat')){rr(c,-10.5,-14,21,12,4);ink(c,ch.coat2,LW.char);c.beginPath();c.moveTo(0,-12);c.lineTo(0,-2.5);c.lineWidth=1.4;c.strokeStyle=rgba(C.ink,.4);c.stroke();}
  }
  function xFoot(c,X,s,fx,fy){ // s=-1 left foot, 1 right foot; returns true if it replaced the foot
    if(s<0&&X.has('cast')){rr(c,fx-5.5,fy-9,11,12,3.5);ink(c,'#f1ede4',2.2);c.strokeStyle=rgba(C.ink,.25);c.lineWidth=1;for(const yy of[-5,-1.5]){c.beginPath();c.moveTo(fx-5,fy+yy);c.lineTo(fx+5,fy+yy);c.stroke();}return true;}
    if(s>0&&X.has('metalleg')){rr(c,fx-2,fy-9,4,9,1.5);ink(c,'#9aa4b4',1.8);ell(c,fx,fy,5,3);ink(c,'#7a8494',2);return true;}
    if(s>0&&X.has('peg')){rr(c,fx-1.6,fy-8,3.2,9,1.4);ink(c,'#7a5a3a',1.8);return true;}
    return false;
  }
  function xBody(c,ch,X,view,t){
    const back=view==='back',side=view==='side';
    if(X.has('torsoband')&&!back){c.save();rr(c,-9.5,-21,19,16,7);c.clip();c.beginPath();c.moveTo(-11,-18);c.lineTo(11,-10);c.lineTo(11,-6);c.lineTo(-11,-14);c.closePath();ink(c,'#f1ede4',1.6);c.restore();circ(c,3,-11,1.4);c.fillStyle='#c0302a';c.fill();}
    if(X.has('bandolier')&&!back){c.save();rr(c,-9.5,-21,19,16,7);c.clip();c.beginPath();c.moveTo(-9,-21);c.lineTo(9,-9);c.lineWidth=4.4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=2.6;c.strokeStyle='#6a4a2c';c.stroke();
      for(let i=0;i<4;i++){const k=i/3.2;rr(c,-7+k*14-1,-19.6+k*9.4-1.6,2,3.2,.6);c.fillStyle='#d8a84a';c.fill();}c.restore();}
    if(X.has('toolbelt')&&!back){rr(c,side?-7:-8,-11.5,5,5,1.2);ink(c,'#7a5a3a',1.6);rr(c,side?-1:3,-11.5,5,5,1.2);ink(c,'#7a5a3a',1.6);c.fillStyle='#9aa0aa';c.fillRect(side?4.5:-1.2,-15,1.6,6);}
    if(X.has('medal')&&!back){c.fillStyle=C.ink;c.fillRect(side?1:-6.5,-19,4.4,3.8);c.fillStyle=C.rebel;c.fillRect(side?1.6:-5.9,-18.4,1.6,2.6);c.fillStyle='#f1ede4';c.fillRect(side?3.2:-4.3,-18.4,1.6,2.6);circ(c,side?3.2:-4.3,-13.6,1.9);ink(c,'#d8a84a',1.2);}
    if(X.has('starpin')&&!back){star(c,side?4:5,-16.5,2.6,'#f4f0e6');}
    if(X.has('charm')&&!back){c.beginPath();c.moveTo(-3,-21);c.quadraticCurveTo(0,-16,3,-21);c.lineWidth=1;c.strokeStyle=C.ink;c.stroke();circ(c,0,-16.6,1.5);ink(c,C.shield,1);}
    if(X.has('mourn')){c.fillStyle=C.ink;c.fillRect(side?-6:-9.6,-18.5,3.2,4.4);}
    if(X.has('medicband')&&!back){rr(c,side?2:6.2,-19,4,4.4,.8);ink(c,'#f1ede4',1.2);c.fillStyle=C.rebel;c.fillRect((side?2:6.2)+1.5,-18.4,1,3.2);c.fillRect((side?2:6.2)+.4,-17.3,3.2,1);}
    if(X.has('sling')&&!back){c.beginPath();c.moveTo(-7,-21);c.lineTo(7,-11);c.lineTo(-3,-9);c.closePath();ink(c,'#f1ede4',1.8);}
  }
  function xChev(c,n,off,view){if(view==='back')return;const x0=view==='side'?-1:3;if(off){rr(c,x0,-22.6,4.4,3,1);c.fillStyle='#f4f0e6';c.fill();return;}
    c.lineWidth=1.1;c.strokeStyle='#f4f0e6';for(let i=0;i<n;i++){c.beginPath();c.moveTo(x0,-22.4+i*1.4);c.lineTo(x0+2,-21.4+i*1.4);c.lineTo(x0+4,-22.4+i*1.4);c.stroke();}}
  function xJaw(c,ch,X,hx,hy,R,turn){
    if(X.has('stubble')){c.save();circ(c,hx,hy,R-1);c.clip();c.fillStyle=rgba(ch.hair||'#2a2a2a',.55);const rn=mkRng(7);for(let i=0;i<30;i++){const a=.15*Math.PI+rn()*.7*Math.PI,r=R*(.62+rn()*.36);c.fillRect(hx+turn*2+Math.cos(a)*r,hy+Math.sin(a)*r,1.1,1.1);}c.restore();}
    if(X.has('soot')){c.fillStyle='rgba(30,22,18,.45)';ell(c,hx-R*.45,hy+R*.35,R*.22,R*.12);c.fill();ell(c,hx+R*.5,hy-R*.5,R*.16,R*.1);c.fill();}
    if(X.has('facepaint')){c.fillStyle='rgba(30,40,24,.6)';const ox=turn*R*.32;for(const s of[-1,1]){rr(c,hx+ox+s*R*.42-R*.22,hy+R*.22,R*.44,R*.1,1);c.fill();rr(c,hx+ox+s*R*.42-R*.18,hy+R*.36,R*.36,R*.08,1);c.fill();}}
    if(X.has('tattoo')){const ox=turn*R*.32;c.fillStyle=rgba('#1a3a5a',.75);poly(c,[[hx+ox+R*.62,hy+R*.12],[hx+ox+R*.72,hy+R*.3],[hx+ox+R*.52,hy+R*.3]]);c.fill();}
  }
  function xHead(c,ch,X,hx,hy,R,view,turn){
    const back=view==='back',ox=turn*R*.32,ex=R*.42,ey=hy-R*.02;
    const eyeR=[hx+ox+ex*(1+turn*.15),ey],eyeL=[hx+ox-ex*(1-turn*.15),ey];
    if(!back){
      if(X.has('scar')){c.beginPath();c.moveTo(eyeL[0]-R*.18,eyeL[1]-R*.55);c.lineTo(eyeL[0]+R*.12,eyeL[1]+R*.45);c.lineWidth=2.2;c.strokeStyle='#c46a6a';c.stroke();c.lineWidth=1;c.strokeStyle=rgba(C.ink,.6);for(let i=0;i<3;i++){const k=i/2.4-.1;const px=eyeL[0]-R*.18+R*.3*(k+.1),py=eyeL[1]-R*.55+R*1*(k+.1);c.beginPath();c.moveTo(px-2,py);c.lineTo(px+2,py-.6);c.stroke();}}
      if(X.has('plaster')){c.save();c.translate(eyeR[0]+R*.05,ey+R*.48);c.rotate(.5);rr(c,-3.6,-1.4,7.2,2.8,1);ink(c,'#e8c8a0',1.2);c.rotate(-1);rr(c,-3.6,-1.4,7.2,2.8,1);ink(c,'#e8c8a0',1.2);c.restore();}
      if(X.has('patch')){c.beginPath();c.moveTo(hx-R,hy-R*.45);c.lineTo(eyeR[0],ey);c.lineTo(hx+R*.98,hy-R*.2);c.lineWidth=1.6;c.strokeStyle=C.ink;c.stroke();ell(c,eyeR[0],ey,R*.3,R*.34);ink(c,'#151515',1.6);}
      if(X.has('cybereye')){circ(c,eyeR[0],ey,R*.36);ink(c,'#9aa4b4',2);circ(c,eyeR[0],ey,R*.18);c.fillStyle=C.shield;c.shadowColor=C.shield;c.shadowBlur=6;c.fill();c.shadowBlur=0;}
      if(X.has('eyeband')){c.save();circ(c,hx,hy,R+1);c.clip();c.beginPath();c.moveTo(hx-R*1.1,hy-R*.75);c.lineTo(hx+R*1.1,hy+R*.05);c.lineTo(hx+R*1.1,hy+R*.45);c.lineTo(hx-R*1.1,hy-R*.35);c.closePath();ink(c,'#f1ede4',1.6);c.restore();}
      if(X.has('glasses')){c.lineWidth=1.8;c.strokeStyle=C.ink;for(const e of[eyeL,eyeR]){circ(c,e[0],e[1],R*.42);c.stroke();}c.beginPath();c.moveTo(eyeL[0]+R*.42,ey);c.lineTo(eyeR[0]-R*.42,ey);c.stroke();}
    }
    if(X.has('headband')){c.save();circ(c,hx,hy,R+2);c.clip();rr(c,hx-R-2,hy-R*.72,R*2+4,R*.42,2);ink(c,'#f1ede4',1.6);c.restore();if(!back){circ(c,hx+R*.4+ox,hy-R*.52,1.6);c.fillStyle='#c0302a';c.fill();}}
    if(X.has('bandana')){c.save();circ(c,hx,hy,R+2.5);c.clip();rr(c,hx-R-3,hy-R*.95,R*2+6,R*.4,2);ink(c,C.rebel,1.8);c.restore();
      const kx=hx-(back?0:R*.95)*(turn>=0?1:-1);c.beginPath();c.moveTo(kx,hy-R*.75);c.lineTo(kx-5,hy-R*.2);c.lineTo(kx-1,hy-R*.35);c.closePath();ink(c,C.rebel,1.6);}
    if(X.has('beanie')){c.beginPath();c.arc(hx,hy-1,R+2,Math.PI*1.0,Math.PI*2.0);c.closePath();ink(c,'#3e4048',LW.char);rr(c,hx-R-3,hy-R*.42,R*2+6,R*.34,2);ink(c,'#4e5058',2);}
    if(X.has('oldheg')){c.beginPath();c.arc(hx+turn*1.5,hy-1,R+2.5,Math.PI,Math.PI*2);c.lineTo(hx+R+3.5,hy-R*.18);c.lineTo(hx-R-3.5,hy-R*.18);c.closePath();ink(c,W.hegWhite,LW.char);
      c.save();c.beginPath();c.arc(hx+turn*1.5,hy-1,R+2.5,Math.PI,Math.PI*2);c.closePath();c.clip();c.beginPath();c.moveTo(hx-R*.9,hy-R*.2);c.lineTo(hx+R*.2,hy-R*1.4);c.lineTo(hx+R*.65,hy-R*1.25);c.lineTo(hx-R*.4,hy-R*.1);c.closePath();c.fillStyle=C.rebel;c.fill();c.restore();}
    if(X.has('beret')){c.beginPath();c.ellipse(hx-R*.2,hy-R*.9,R*1.05,R*.42,-.2,0,TAU);ink(c,shade(C.rebel,-.25),LW.char);circ(c,hx+R*.35,hy-R*.95,1.8);c.fillStyle='#f4f0e6';c.fill();}
    if(X.has('headset')){c.beginPath();c.arc(hx,hy,R+2.5,Math.PI*1.1,Math.PI*1.9);c.lineWidth=2.6;c.strokeStyle=C.ink;c.stroke();if(!back){const sx=hx-R*.95;rr(c,sx-3,hy-3,6,8,2.5);ink(c,'#3b3a44',1.8);c.beginPath();c.moveTo(sx,hy+4);c.quadraticCurveTo(sx+2,hy+R*.6,hx+ox-R*.15,hy+R*.55);c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();}}
  }

  function character(c,x,y,who,pose){
    const ch=spec(who);const p=Object.assign({view:'front',dir:1,state:'idle',t:0,s:1},pose||{});
    const st=POSES[p.state]?p.state:'idle',P=POSES[st],t=p.t,view=p.view;
    CUR_T=t;const gear=new Set((p.gear||ch.gear||[]).map(k=>GEAR_ALIAS[k]||k));const shieldOn=gear.has('shield');
    const X=new Set(ch.x||[]);for(const k of p.conds||[])for(const e of COND_LOOK[k]||[])X.add(e);for(const k of p.extra||[])X.add(k);
    const oneHand=X.has('sling')||X.has('noarm');
    const wkey=p.weapon!==undefined?p.weapon:ch.weapon;const Wp=wkey?WEAPONS[wkey]:null;
    const flip=view==='side'&&p.dir<0;
    const slung=!!(P.slung||p.slung)&&Wp;
    let wpose=Wp?(slung?'slung':P.w||'rest'):'none';if(st==='down')wpose='none';
    let bob=0,sq=1,shake=0;
    if(P.feet==='walk'){bob=-Math.abs(Math.sin(t*9))*3;sq=1+Math.sin(t*18)*.04;}
    if(P.feet==='run'){bob=-Math.abs(Math.sin(t*14))*4;sq=1+Math.sin(t*28)*.05;}
    if(st==='idle'||st==='hack'||st==='work')sq=1+Math.sin(t*2.4)*.02;
    if(P.shake)shake=Math.sin(t*38)*1.4*P.shake;
    const fire=P.flash||(st==='aim'&&Math.sin(t*5)>.93);
    const recoil=(st==='aim'||st==='fire')&&Wp?Math.max(0,Math.sin(t*5))**12*(Wp.hold==='shoulder'?5:3):0;
    const S=p.s*(ch.big||1);
    c.save();c.translate(x,y);c.scale(S,S);
    ell(c,0,0,15,5);c.fillStyle='rgba(0,0,0,.4)';c.fill();
    if(st==='down'){c.translate(0,-8);c.rotate(-Math.PI/2*.92);c.translate(4,8);}
    if(P.crouch)c.scale(1.06,P.crouch);
    if(P.lean)c.rotate(P.lean*(flip?-1:1));
    c.translate(shake-recoil*(flip?-1:1),bob);c.scale(1/sq,sq);
    if(flip)c.scale(-1,1);
    let aim=p.aim;if(aim!=null&&flip)aim=Math.PI-aim;
    const turn=view==='side'?.85:0,back=view==='back';
    const look=(p.face||P.face)==='focus'?Math.PI*.42:(aim!=null?aim:(view==='side'?0:Math.PI/2));
    // weapon pose: anchor (rear grip) + angle
    let wa=[6,-13],ang=2.5;
    if(Wp&&Wp.melee){
      if(wpose==='aim'){const sw=P.flash?((t*2.2)%1):0;wa=[7,-19];ang=P.flash?-1.9+sw*2.7:-1.7;}else if(wpose==='low'){wa=[7,-12];ang=.6;}else{wa=view==='side'?[5,-10]:[9,-10];ang=view==='side'?1.15:1.4;}
    }
    else if(Wp){
      if(Wp.hold==='shoulder'){wa=view==='side'?[-1,-24]:[2,-22];ang=wpose==='aim'?(aim!=null?aim:0):(view==='side'?-.22:-.55);if(wpose==='low'||wpose==='reload')ang=view==='side'?.1:-.8;}
      else if(Wp.hold==='one'||shieldOn||oneHand){if(wpose==='aim'){wa=[9,-17];ang=aim!=null?aim:0;}else if(wpose==='low'){wa=[7,-12];ang=.5;}else{wa=view==='side'?[5,-10]:[9,-10];ang=view==='side'?1.05:1.35;}}
      else if(Wp.hold==='heavy'){if(wpose==='aim'){wa=[1,-11];ang=aim!=null?aim:0;}else if(view==='side'){wa=[1,-10];ang=wpose==='low'?.3:.2;}else{wa=[4,-10];ang=wpose==='panic'?2.1:2.75;}}
      else{if(wpose==='aim'){wa=[3,-15];ang=aim!=null?aim:0;}else if(view==='side'){wa=[3,-13];ang=wpose==='reload'?.75:wpose==='low'?.45:.32;}else{wa=[6,-13];ang=wpose==='panic'?2.2:2.5;}}
    }
    // feet
    const fp=P.feet==='walk'?Math.sin(t*9)*3.5:P.feet==='run'?Math.sin(t*14)*5:P.feet==='tiptoe'?Math.sin(t*5)*2:0;
    for(const s of[-1,1]){const fx0=s*5.5+(view==='side'?fp*s:0),fy0=-3-(view!=='side'&&P.feet?Math.max(0,fp*s):0);if(!xFoot(c,X,s,fx0,fy0)){ell(c,fx0,fy0,5.2,3.4);ink(c,W.boot,LW.char-.6);}}
    const hx=turn*2,hy=-33,R=14.5;
    const drawSlung=()=>{c.save();c.translate(back?-2:-5,-13);c.rotate(back?-.9:-1.15);c.scale(.9,.9);Wp.draw(c);c.restore();};
    // ---- behind the body
    if(!back&&slung)drawSlung();
    if(back&&Wp&&wpose==='aim'){c.save();c.translate(4,-16);c.rotate(-1.3);Wp.draw(c);c.restore();}
    xBack(c,ch,X,view,t);
    if(gear.has('pack')&&view==='side'){rr(c,-17,-23,9,16,3);ink(c,W.pack,LW.char);rr(c,-18,-27,11,5,2.5);ink(c,W.packRoll,2.2);}
    if(ch.hood&&!back&&ch.kind!=='trooper'){circ(c,hx,hy+1,R+4.5);ink(c,ch.hood,LW.char);}
    if(ch.kind==='bot'){ // boxy chassis
      rr(c,-10,-22,20,17,4);ink(c,ch.coat,LW.char);c.fillStyle=rgba(C.ink,.18);c.fillRect(3,-21,6,15);rr(c,-5,-18,10,6,2);ink(c,'#0d1a24',1.6);c.fillStyle=C.heg;c.fillRect(-3,-16,6,2);
    }else{
      rr(c,-9.5,-21,19,16,7);ink(c,ch.coat,LW.char);
      c.save();rr(c,-9.5,-21,19,16,7);c.clip();c.fillStyle=ch.coat2;c.fillRect(-12,-11,24,8);c.fillStyle='rgba(0,0,0,.18)';c.fillRect(3,-22,9,18);
      if(ch.kind==='trooper'){c.fillStyle=ch.plate;c.fillRect(-3.5,-22,7,11);}c.restore();
      c.fillStyle=C.ink;c.fillRect(-9.5,-12,19,2.4);
    }
    if(ch.badge&&!back){star(c,view==='side'?3:-4,-16,ch.badge>1?3.4:2.8,C.gold);}
    if(gear.has('vest')){const vw=view==='side'?14:17;rr(c,-vw/2,-21.5,vw,11,3.5);ink(c,W.vest,2.4);
      if(!back){rr(c,-vw/2+1.6,-15.5,5,4.4,1.2);ink(c,W.pouch,1.6);rr(c,vw/2-6.6,-15.5,5,4.4,1.2);ink(c,W.pouch,1.6);}}
    if(gear.has('pack')&&back){rr(c,-9.5,-25,19,18,5);ink(c,W.pack,LW.char);rr(c,-7,-15,14,6,2);ink(c,'#4a3c28',1.8);rr(c,-11,-29,22,6,3);ink(c,W.packRoll,2.2);}
    if(gear.has('pack')&&view==='front'){c.lineWidth=2.6;c.strokeStyle='#3a2e1e';c.beginPath();c.moveTo(-6,-21);c.lineTo(-5,-12);c.moveTo(6,-21);c.lineTo(5,-12);c.stroke();}
    if(gear.has('frags')&&!back){for(const fx of(view==='side'?[-3]:[-6,-1.5])){circ(c,fx,-8.4,2.7);ink(c,W.frag,1.6);c.fillStyle='#e0402e';c.fillRect(fx-2.4,-9.2,4.8,1.4);c.fillStyle=C.gold;c.fillRect(fx-.6,-12,1.2,1.6);}}
    if(gear.has('policevest'))policeVest(c,view);
    if(gear.has('medpack')){const mx=back?-9:(view==='side'?-9:-11);rr(c,mx,-13,7,6,1.5);ink(c,'#f1ede4',1.6);c.fillStyle=C.rebel;c.fillRect(mx+2.9,-12.2,1.2,4.4);c.fillRect(mx+1.3,-10.6,4.4,1.2);}
    if(gear.has('charge')&&!back){rr(c,view==='side'?2:5,-12,6,4,1);ink(c,'#8a6a4a',1.4);c.fillStyle='#e0402e';c.fillRect(view==='side'?2.6:5.6,-11.2,4.8,1.2);}
    if(gear.has('molotov')){const mx=back?6:(view==='side'?-6:9);c.save();c.translate(mx,-6);c.rotate(.2);molotovProp(c,0,0,0,t,1);c.restore();}
    if(gear.has('stim')&&!back){const mx=view==='side'?1:3.5;rr(c,mx,-11,6,5,1.2);ink(c,'#3a4a5a',1.6);c.fillStyle=C.shield;c.fillRect(mx+1.2,-12.4,1.2,2.4);c.fillRect(mx+3.4,-12.4,1.2,2.4);}
    if(ch.kind!=='bot')xBody(c,ch,X,view,t);
    if(ch.kind!=='bot'){rr(c,-8.5,-23,17,5,2.5);ink(c,ch.acc,2.4);if(ch.chev||ch.off)xChev(c,ch.chev||0,ch.off,view);
      if(view==='side'){c.beginPath();c.moveTo(-6,-21);c.quadraticCurveTo(-14,-20,-(17+Math.sin(t*7)*2),-14);c.lineTo(-13,-15);c.closePath();ink(c,ch.acc,2.2);}}
    const shoulderNow=Wp&&Wp.hold==='shoulder'&&!back&&!slung&&wpose!=='none'&&!shieldOn;
    if(shoulderNow){c.save();c.translate(wa[0],wa[1]);c.rotate(ang);Wp.draw(c);if(fire)muzzle(c,Wp.len,'rocket');c.restore();}
    // ---- head
    const fst=p.face||(st==='idle'&&ch.idleFace)||P.face;
    if(ch.kind==='bot'){botFace(c,hx,hy+2,R*.95,fst,t);}
    else if(back){headShade(c,hx,hy,R,ch.skin||'#ccc');if(ch.kind==='trooper'){headShade(c,hx,hy,R+2,ch.armor);c.fillStyle=ch.plate;c.fillRect(hx-3,hy-R-1,6,R);}else hair(c,ch,hx,hy,R,'back',0);if(gear.has('hardhat'))helmet(c,hx,hy,R,'back',0);xHead(c,ch,X,hx,hy,R,'back',0);}
    else if(ch.kind==='trooper'){headShade(c,hx,hy,R+2,ch.armor);visor(c,hx,hy,R,st==='down'?'down':fst,turn);c.fillStyle=ch.plate;c.fillRect(hx-2.5,hy-R-2,5,R*.62);}
    else{
      headShade(c,hx,hy,R,ch.skin);
      if(ch.beard){c.save();circ(c,hx,hy,R);c.clip();c.beginPath();c.arc(hx+turn*3,hy+R*.2,R,.08*Math.PI,.92*Math.PI);c.quadraticCurveTo(hx+turn*3,hy+R*.62,hx+turn*3+R*.99*Math.cos(.08*Math.PI),hy+R*.2+R*Math.sin(.08*Math.PI));c.closePath();c.fillStyle=ch.hair;c.fill();c.restore();
        c.beginPath();c.arc(hx,hy,R,.1*Math.PI,.9*Math.PI);c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();}
      face(c,hx,hy,R,look,fst,t,turn);
      xJaw(c,ch,X,hx,hy,R,turn);
      if(ch.tache){const mx=hx+turn*R*.32,my=hy+R*.34;c.beginPath();c.moveTo(mx,my);c.quadraticCurveTo(mx-R*.3,my-R*.08,mx-R*.42,my+R*.2);c.quadraticCurveTo(mx-R*.2,my+R*.08,mx,my+R*.1);c.quadraticCurveTo(mx+R*.2,my+R*.08,mx+R*.42,my+R*.2);c.quadraticCurveTo(mx+R*.3,my-R*.08,mx,my);ink(c,ch.hair,1.6);}
      if(st==='hack'){c.save();circ(c,hx,hy,R);c.clip();const g=c.createLinearGradient(0,hy+R,0,hy-R*.2);g.addColorStop(0,rgba(C.shield,.45));g.addColorStop(1,rgba(C.shield,0));c.fillStyle=g;c.fillRect(hx-R,hy-R,R*2,R*2);c.restore();}
      hair(c,ch,hx,hy,R,view,turn);
      if(gear.has('hardhat'))helmet(c,hx,hy,R,view,turn);
      xHead(c,ch,X,hx,hy,R,view,turn);
      if(view==='side'&&ch.hs!=='stetson'){circ(c,hx-R*.78,hy+1,R*.2);ink(c,shade(ch.skin,-.1),2);}
    }
    // ---- in front: weapon, hands, props
    const sk=ch.kind==='bot'?'#8a94a8':(ch.kind==='trooper'?'#e4e8f2':ch.skin);
    const offSk=X.has('metalarm')?'#9aa4b4':sk,offHand=(hx2,hy2)=>{if(X.has('noarm')){rr(c,hx2-2,hy2-3,4,5,1.5);ink(c,ch.coat2||ch.coat,1.6);return;}if(X.has('sling')){hand(c,0,-13,sk);return;}if(X.has('crutch'))return;hand(c,hx2,hy2,offSk);};
    if(back&&slung)drawSlung();
    if(back&&Wp&&wpose!=='aim'&&wpose!=='none'&&!slung)drawSlung();
    if(!back&&st!=='down'){
      if(shieldOn&&wpose!=='none'){/* handled after weapon */}
      if(shoulderNow){c.save();c.translate(wa[0],wa[1]);c.rotate(ang);hand(c,Wp.grips[0],7,sk);hand(c,Wp.grips[1],7,sk);c.restore();}
      else if(Wp&&!slung&&wpose!=='none'){c.save();c.translate(wa[0],wa[1]);c.rotate(ang);if(fire&&Wp.fx==='beam')beam(c,Wp.len,t);Wp.draw(c);if(fire&&Wp.fx!=='beam'&&Wp.fx!=='melee')muzzle(c,Wp.len,Wp.fx);if(P.fx==='charge'&&Wp.fx==='beam')charging(c,Wp.len,t);
        hand(c,Wp.grips[0],1,sk);if(Wp.grips[1]!=null&&!shieldOn&&Wp.hold!=='one'&&!oneHand)hand(c,Wp.grips[1],1,X.has('metalarm')?offSk:sk);c.restore();
        if((Wp.hold==='one'||oneHand)&&!shieldOn)offHand(view==='side'?-3:-10,-11);
        if(wpose==='reload'){c.save();c.translate(10,-4+Math.sin(t*6)*1.5);c.rotate(.5);rr(c,-2,-5,4.5,9,1.5);ink(c,'#2c2b33',1.8);c.restore();hand(c,11,-2+Math.sin(t*6)*1.5,sk);
          c.strokeStyle=rgba('#ffffff',.8);c.lineWidth=1.6;for(let i=0;i<3;i++){const a=-.6+i*.5;c.beginPath();c.moveTo(17+Math.cos(a)*4,-8+Math.sin(a)*4);c.lineTo(17+Math.cos(a)*8,-8+Math.sin(a)*8);c.stroke();}}}
      if(shieldOn){const sx=view==='side'?9:-3;c.save();c.translate(sx,-19);rr(c,-9,-14,18,30,6);c.fillStyle=rgba('#cfe0ff',.55);c.fill();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();
        rr(c,-6,-11,12,24,4);c.lineWidth=1.4;c.strokeStyle=rgba('#ffffff',.6);c.stroke();c.fillStyle=W.hegNavy;c.fillRect(-6,-3,12,3);c.restore();hand(c,sx-6,-14,sk);}
      const pr=P.prop;
      if(Wp&&Wp.melee&&P.flash&&!slung){c.save();c.translate(wa[0],wa[1]);c.beginPath();c.arc(0,0,Wp.len*.9,-1.9,ang);c.lineWidth=5;c.strokeStyle='rgba(255,255,255,.35)';c.stroke();c.lineWidth=2;c.strokeStyle='rgba(156,194,255,.6)';c.stroke();c.restore();}
      if(pr==='molotov'){const k=(t*1.3)%1,gx=-10+k*2,gy=-48+k*2;hand(c,9,-20,sk);molotovProp(c,gx,gy,-.5,t);hand(c,gx-2,gy+5,sk);c.strokeStyle=rgba('#ffffff',.6);c.lineWidth=2;c.beginPath();c.arc(-2,-30,20,-2.6,-1.9);c.stroke();}
      if(pr==='medpack'){c.save();c.translate(view==='side'?8:0,-8);rr(c,-8,-4,16,9,2);ink(c,'#f1ede4',2.2);c.fillStyle=C.rebel;c.fillRect(-1.2,-2.6,2.4,6.4);c.fillRect(-3.2,-.6,6.4,2.4);c.restore();
        const bx=view==='side'?14:9,bk=Math.sin(t*6);c.save();c.translate(bx,-14+bk);c.rotate(.3);rr(c,-1.5,-5,3,10,1);ink(c,'#f1ede4',1.2);c.restore();hand(c,(view==='side'?8:0)-8,-8,sk);hand(c,bx,-12+bk,sk);}
      if(pr==='stimpen'){const k=(Math.sin(t*3)+1)/2;hand(c,-9,-17,sk);c.save();c.translate(-4+k*2,-17);c.rotate(-2.6);stimItem(c);c.restore();hand(c,-1+k*2,-19,sk);}
      if(pr==='charge'){const px=view==='side'?10:4;c.save();c.translate(px,-4);if(p.item==='autocore')autocoreItem(c,t);else c4Item(c,t);c.restore();hand(c,px-7,-6,sk);hand(c,px+7,-6,sk);}
      if(pr==='grenade'){const k=(t*1.3)%1,gx=-10+k*2,gy=-48+k*2;hand(c,9,-20,sk);c.save();c.translate(gx,gy);circ(c,0,0,4.4);ink(c,W.frag,2.2);c.fillStyle=C.gold;c.fillRect(-1,-6.4,2,2.6);c.beginPath();c.arc(2.4,-6,1.8,0,TAU);c.lineWidth=1.2;c.strokeStyle=C.gold;c.stroke();c.restore();
        hand(c,gx-2,gy+3,sk);c.strokeStyle=rgba('#ffffff',.6);c.lineWidth=2;c.beginPath();c.arc(-2,-30,20,-2.6,-1.9);c.stroke();}
      if(pr==='pad'){const px=view==='side'?6:0;c.save();c.translate(px,-12);rr(c,-8,-5.5,16,11,2.5);ink(c,'#2c2f3a',2.2);rr(c,-6,-3.8,12,7.6,1.5);c.fillStyle=C.shield;c.shadowColor=C.shield;c.shadowBlur=10;c.fill();c.shadowBlur=0;
        c.fillStyle='#0f4a55';for(let i=0;i<3;i++)c.fillRect(-4.5,-2.4+i*2.2,(Math.sin(t*6+i*2)*.5+.5)*9,1);c.restore();hand(c,px-8,-10,sk);hand(c,px+8,-10,sk);}
      if(pr==='wrench'){const a=Math.sin(t*8)*.5;c.save();c.translate(9,-12);c.rotate(-.6+a);rr(c,-1.6,-2,3.2,14,1.5);ink(c,'#9aa0aa',1.8);c.beginPath();c.arc(0,13,3.4,-.4,Math.PI+.4,true);c.lineWidth=3;c.strokeStyle=C.ink;c.stroke();c.beginPath();c.arc(0,13,3.4,-.4,Math.PI+.4,true);c.lineWidth=1.6;c.strokeStyle='#c8ccd4';c.stroke();c.restore();hand(c,9,-12,sk);hand(c,-6,-11,sk);}
      if(pr==='bag'){c.save();c.translate(10,-6);c.beginPath();c.moveTo(-6,-6);c.quadraticCurveTo(-9,6,0,7);c.quadraticCurveTo(9,6,6,-6);c.closePath();ink(c,'#a08a5a',2.2);c.fillStyle=C.gold;c.font='900 7px system-ui';c.textAlign='center';c.fillText('⬡',0,4);c.restore();hand(c,8,-12,sk);hand(c,-6,-11,sk);}
      if(pr==='handles'){rr(c,2,-17,22,5,2);ink(c,W.gunDark,2.2);rr(c,18,-19,10,9,3);ink(c,W.gunDeep,2.2);hand(c,4,-15,sk);hand(c,12,-15,sk);}
      if(pr==='wave'){const a=Math.sin(t*8)*.35;hand(c,-6,-11,sk);c.save();c.translate(17,-24);c.rotate(a);hand(c,0,-16,sk);c.restore();}
      if(pr==='handsup'){const w=Math.sin(t*10)*1;hand(c,-13+w,-42,sk);hand(c,13-w,-42,sk);}
      if(pr==='handshead'){hand(c,-11,-40,sk);hand(c,11,-40,sk);}
      if(!Wp&&!pr&&st!=='down'){if(view==='side')hand(c,3,-10,sk);else{offHand(-10,-10);hand(c,10,-10,sk);}}
      if(X.has('crutch')){c.beginPath();c.moveTo(view==='side'?-6:-12,-20);c.lineTo(view==='side'?-9:-15,0);c.lineWidth=4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=2.2;c.strokeStyle='#9a7a52';c.stroke();rr(c,(view==='side'?-6:-12)-4,-22,8,3,1.5);ink(c,'#3b3a44',1.4);hand(c,view==='side'?-7.5:-13.5,-11,offSk);}
      if(ch.cuffs){c.lineWidth=2;c.strokeStyle='#c8ccd4';c.beginPath();c.moveTo(-4,-9);c.lineTo(4,-9);c.stroke();hand(c,-4,-9,sk);hand(c,4,-9,sk);}
    }
    c.restore();
    // ---- upright overlays
    const fx=P.fx;
    if(fx==='sweat'){const k=(t*1.6)%1;c.save();c.translate(x+(16-shake)*S,y-(46-k*10)*S);c.globalAlpha=1-k*.6;c.beginPath();c.moveTo(0,-6);c.quadraticCurveTo(5,1,0,4);c.quadraticCurveTo(-5,1,0,-6);ink(c,W.sweat,2);c.restore();}
    if(st==='down'){for(let i=0;i<3;i++){const a=t*3+i*TAU/3;star(c,x-6*S+Math.cos(a)*12*S,y-20*S+Math.sin(a)*4*S,4*S);}}
    if(fx==='code'){c.save();c.font=`800 ${8*S}px "Exo 2",system-ui`;c.textAlign='center';for(let i=0;i<2;i++){const k=(t*.8+i*.5)%1;c.globalAlpha=1-k;c.fillStyle=C.shield;c.fillText(i?'01':'10',x+(i?12:-10)*S,y-(52+k*14)*S);}c.restore();}
    if(fx==='shh'){c.save();c.globalAlpha=.6;c.fillStyle='#fffaf0';c.font=`800 ${8*S}px "Exo 2",system-ui`;c.textAlign='center';c.fillText('shh',x-16*S*(flip?-1:1),y-40*S);c.restore();}
    if(fx==='sparks'){const d=flip?-1:1;for(let i=0;i<4;i++){const k=(t*3+i*.25)%1;const a=-1.2+i*.5;c.fillStyle=k<.5?'#fff3b0':'#ffb347';c.fillRect(x+(16+Math.cos(a)*k*14)*S*d,y+(-6+Math.sin(a)*k*14+k*k*10)*S,2*S,2*S);}}
    if(fx==='eye'){c.save();c.translate(x+18*S*(flip?-1:1),y-48*S);ell(c,0,0,7*S,4.4*S);ink(c,'#10132e',1.6);circ(c,0,0,2.4*S);c.fillStyle=C.gold;c.fill();c.restore();}
    if(fx==='speed'){const d=flip?1:-1;c.save();c.strokeStyle=rgba('#ffffff',.55);c.lineWidth=2*S;c.lineCap='round';for(let i=0;i<3;i++){const k=(t*3+i*.33)%1;const yy=y-(14+i*10)*S;c.beginPath();c.moveTo(x+d*(16+k*10)*S,yy);c.lineTo(x+d*(26+k*16)*S,yy);c.stroke();}c.restore();}
    if(gear.has('angel')&&st!=='down'){angelDrone(c,x+(flip?-20:20)*S,y-(60+Math.sin(t*3)*3)*S,S*.9,t);}
    if(fx==='lock'){c.save();c.translate(x,y-56*S);const k=(Math.sin(t*4)+1)/2;star(c,0,0,(4+k)*S,C.gold);c.restore();}
  }
  function beam(c,x,t){const sw=Math.sin(t*4)*.35;c.save();c.rotate(sw);const g=c.createLinearGradient(x,0,x+150,0);g.addColorStop(0,'#fff3e0');g.addColorStop(.15,'#ff6a3a');g.addColorStop(1,'rgba(255,106,58,0)');
    c.fillStyle='rgba(255,106,58,.12)';c.beginPath();c.moveTo(x,0);c.lineTo(x+150,-55);c.lineTo(x+150,55);c.closePath();c.fill();
    rr(c,x,-2.6,150,5.2,2.6);c.fillStyle=g;c.shadowColor='#ff6a3a';c.shadowBlur=10;c.fill();c.shadowBlur=0;c.fillStyle='rgba(255,255,255,.8)';c.fillRect(x,-.7,60,1.4);c.restore();}
  function charging(c,x,t){const k=(t*.8)%1;c.save();c.beginPath();c.arc(x-2,-.4,5,-Math.PI/2,-Math.PI/2+k*TAU);c.lineWidth=1.6;c.strokeStyle=C.go;c.stroke();for(let i=0;i<3;i++){const a=t*8+i*2;c.fillStyle='#fff3b0';c.fillRect(x-2+Math.cos(a)*7,Math.sin(a)*7,1.4,1.4);}c.restore();}
  function molotovProp(c,x,y,a,t,small){c.save();c.translate(x,y);c.rotate(a);const s=small?.7:1;c.scale(s,s);rr(c,-2.6,-2,5.2,8,2);ink(c,'#5a8a4a',1.8);rr(c,-1.2,-5,2.4,3.4,.8);ink(c,'#5a8a4a',1.4);c.fillStyle='rgba(255,255,255,.45)';c.fillRect(-1.6,-.6,1,5);
    c.beginPath();c.moveTo(0,-5);c.quadraticCurveTo(2.6,-7,1.2,-9);c.lineWidth=2;c.strokeStyle='#e8dcc0';c.stroke();
    if(!small){const f=1+Math.sin(t*20)*.2;c.beginPath();c.moveTo(-1.6,-9);c.quadraticCurveTo(1.2,-15*f,3.6,-9.4);c.quadraticCurveTo(1,-8,-1.6,-9);c.fillStyle='#ffb347';c.fill();c.beginPath();c.moveTo(0,-9.2);c.quadraticCurveTo(1.2,-12.4*f,2.4,-9.4);c.fillStyle='#fff3b0';c.fill();}c.restore();}
  function stimItem(c){rr(c,-1.6,-7,3.2,12,1.4);ink(c,'#d8dde8',1.4);c.fillStyle=C.shield;c.fillRect(-.9,-4.6,1.8,5);rr(c,-1.2,-9.4,2.4,2.6,.6);ink(c,'#3a4a5a',1);c.fillStyle='#9aa0aa';c.fillRect(-.3,5,.6,3);}
  function c4Item(c,t){rr(c,-7,-4.2,14,8.4,1.5);ink(c,'#8a6a4a',2);c.fillStyle='#e0402e';c.fillRect(-7,-1.6,14,3.2);c.fillStyle=C.gold;c.font='900 3px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('BLAM',0,.1);
    rr(c,1.5,-6.6,5,3,.6);ink(c,'#1a1a1a',1);c.fillStyle=Math.sin(t*8)>0?'#ff4a3d':'#4a1a1a';c.fillRect(2.4,-5.8,1.4,1.4);c.fillStyle=C.go;c.fillRect(4.2,-5.8,1.6,1.4);
    c.beginPath();c.moveTo(-5,-4.2);c.quadraticCurveTo(-7,-8,-3,-8);c.lineWidth=.9;c.strokeStyle='#d04a3a';c.stroke();}
  function autocoreItem(c,t){circ(c,0,0,6.4);ink(c,'#c8b896',2);c.fillStyle='rgba(120,100,70,.35)';ell(c,-2,2,3,2);c.fill();circ(c,0,0,3.4);const k=.6+.4*Math.sin(t*5);c.fillStyle=rgba(C.shield,.4+.4*k);c.shadowColor=C.shield;c.shadowBlur=8;c.fill();c.shadowBlur=0;c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();
    c.save();c.rotate(.5);c.fillStyle='rgba(220,220,210,.95)';c.fillRect(-7,-1.2,14,2.4);c.restore();c.beginPath();c.moveTo(4,-4);c.quadraticCurveTo(9,-8,7,-11);c.lineWidth=1;c.strokeStyle='#d04a3a';c.stroke();c.beginPath();c.moveTo(5,-3);c.quadraticCurveTo(10,-5,10,-9);c.strokeStyle=C.gold;c.stroke();}
  function angelDrone(c,x,y,s,t){c.save();c.translate(x,y);c.scale(s,s);ell(c,0,10,5,1.6);c.fillStyle='rgba(0,0,0,.18)';c.fill();
    c.beginPath();c.ellipse(0,-8.4,6,1.8,0,0,TAU);c.lineWidth=1.6;c.strokeStyle='#fff3b0';c.shadowColor='#fff3b0';c.shadowBlur=6;c.stroke();c.shadowBlur=0;
    for(const sx of[-7,7]){ell(c,sx,-2.4,4.2,1.1);c.fillStyle=rgba('#cfe6ff',.55+.3*Math.sin(t*40+sx));c.fill();c.beginPath();c.moveTo(sx*.6,-1);c.lineTo(sx,-2.4);c.lineWidth=1.2;c.strokeStyle=C.ink;c.stroke();}
    circ(c,0,0,5);ink(c,'#e8ecf4',1.8);rr(c,-3.6,-1.6,7.2,3,1.4);ink(c,'#10162a',1);c.fillStyle=C.shield;c.fillRect(-2.4,-.8,1.6,1.4);c.fillRect(.8,-.8,1.6,1.4);c.restore();}
  function muzzle(c,x,kind){
    const col=kind==='auto'?['#e8ffff',C.shield,'rgba(54,227,242,0)']:kind==='plasma'?['#fff0f0','#ff7a6a','rgba(255,90,80,0)']:['#fff6c0','#ffb347','rgba(255,120,40,0)'];
    const big=kind==='rocket'||kind==='scatter'?1.4:1;
    const g=c.createRadialGradient(x+4,0,0,x+4,0,9*big);g.addColorStop(0,col[0]);g.addColorStop(.5,col[1]);g.addColorStop(1,col[2]);c.fillStyle=g;
    c.beginPath();for(let i=0;i<10;i++){const a=i*TAU/10,r=(i%2?4:10)*big;c.lineTo(x+3+Math.cos(a)*r,Math.sin(a)*r*.8);}c.closePath();c.fill();
    if(kind==='rocket'){c.fillStyle='rgba(220,220,220,.7)';for(let i=0;i<3;i++){circ(c,-20-i*6,Math.sin(i*2)*2,4+i*1.5);c.fill();}}
  }

  /* =================================================================
     PROPS & TERRAIN — 3/4 view: every prop has a top face and a front
     face; the anchor is the centre of its footprint on the ground.
     Cover reads by height: low cover is waist-high (crates, troughs,
     drums), high cover is taller than a head (rock walls, wagons).
     ================================================================= */
  function block(c,x,y,w,h,dep,top,front,lw,shadow){
    if(shadow!==false){c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+6,y+dep+h-6,w,10);}
    rr(c,x,y+h-2,w,dep+2,3);ink(c,front,lw);rr(c,x,y,w,h,4);ink(c,top,lw);
  }
  const PROPS={
    crate:{name:'Cargo crate',cover:'low',draw(c,x,y,o){block(c,x-16,y-36,32,17.6,19.2,W.crate,W.crateFront,LW.prop);
      c.strokeStyle=rgba(C.ink,.6);c.lineWidth=2.4;c.beginPath();c.moveTo(x-13,y-17);c.lineTo(x+13,y-2);c.moveTo(x+13,y-17);c.lineTo(x-13,y-2);c.stroke();
      c.fillStyle=rgba('#ffffff',.18);c.fillRect(x-12,y-33,24,3);}},
    barrel:{name:'Fuel drums',cover:'low',draw(c,x,y,o){for(const[dx,dy]of[[-8,-3],[8,2]]){const X=x+dx,Y=y+dy;ell(c,X+3,Y+2,13,5);c.fillStyle='rgba(0,0,0,.35)';c.fill();rr(c,X-12,Y-28,24,28,5);ink(c,W.drum,LW.prop);c.fillStyle=rgba(C.ink,.35);c.fillRect(X-12,Y-20,24,3);c.fillRect(X-12,Y-10,24,3);ell(c,X,Y-28,12,5);ink(c,W.drumHi,LW.prop-.6);c.fillStyle=C.gold;c.font='900 8px system-ui';c.textAlign='center';c.fillText('▲',X,Y-13);}}},
    canister:{name:'Fuel canister',cover:'none',draw(c,x,y,o){ell(c,x+2,y+1,9,3.5);c.fillStyle='rgba(0,0,0,.35)';c.fill();rr(c,x-8,y-20,16,20,3);ink(c,C.gold,LW.prop);rr(c,x-3,y-25,6,6,2);ink(c,'#3b3a44',2);c.save();rr(c,x-8,y-12,16,6,0);c.clip();for(let i=-3;i<4;i++){c.fillStyle=i%2?C.ink:C.gold;c.beginPath();c.moveTo(x+i*4,y-6);c.lineTo(x+i*4+3,y-12);c.lineTo(x+i*4+6,y-12);c.lineTo(x+i*4+3,y-6);c.fill();}c.restore();}},
    trough:{name:'Water trough',cover:'low',draw(c,x,y,o){block(c,x-28,y-18,56,10,14,'#7a5a3a','#5a4028',LW.prop);rr(c,x-24,y-16,48,6,2);c.fillStyle='#4a9ac8';c.fill();c.fillStyle='rgba(255,255,255,.4)';c.fillRect(x-18,y-15,10,1.6);}},
    rock:{name:'Rock',cover:'high',draw(c,x,y,o){const b=BIOME[o&&o.biome||'dust'],r=24;ell(c,x+4,y+2,r,r*.42);c.fillStyle='rgba(0,0,0,.35)';c.fill();c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r*.8,y-r*1.1);c.lineTo(x-r*.1,y-r*1.6);c.lineTo(x+r*.7,y-r*1.25);c.lineTo(x+r,y-r*.2);c.quadraticCurveTo(x,y+r*.25,x-r,y);c.closePath();ink(c,b.boulder,LW.prop);
      c.beginPath();c.moveTo(x-r*.7,y-r*1.05);c.lineTo(x-r*.1,y-r*1.5);c.lineTo(x+r*.5,y-r*1.2);c.lineTo(x,y-r*.95);c.closePath();c.fillStyle=b.boulderHi;c.fill();}},
    wagon:{name:'Wagon',cover:'high',draw(c,x,y,o){for(const wx of[-22,22]){circ(c,x+wx,y-9,10);ink(c,'#5a4028',LW.prop);circ(c,x+wx,y-9,3);c.fillStyle=C.ink;c.fill();}block(c,x-34,y-46,68,22,20,'#9a7046','#6e4e2e',LW.prop,false);
      c.strokeStyle=rgba(C.ink,.4);c.lineWidth=2;for(let i=1;i<4;i++){c.beginPath();c.moveTo(x-34+i*17,y-24);c.lineTo(x-34+i*17,y-6);c.stroke();}}},
    lamp:{name:'Lamp post',cover:'none',draw(c,x,y,o){const t=(o&&o.t)||0;ell(c,x,y,8,3);c.fillStyle='rgba(0,0,0,.4)';c.fill();rr(c,x-3,y-54,6,54,2);ink(c,'#3b3a44',LW.prop-.6);circ(c,x,y-58,8);ink(c,W.lamp,LW.prop-.6);circ(c,x,y-58,16+Math.sin(t*3)*.6);c.fillStyle='rgba(255,230,160,.25)';c.fill();}},
    console:{name:'Comms console',cover:'low',draw(c,x,y,o){const t=(o&&o.t)||0;block(c,x-18,y-34,36,14,22,W.metal,W.metalFront,LW.prop);rr(c,x-13,y-18,26,11,3);ink(c,rgba(C.go,.75+.25*Math.sin(t*4)),2);}},
    sandbags:{name:'Sandbags',cover:'low',draw(c,x,y,o){for(let row=0;row<2;row++)for(let i=0;i<4-row;i++){const bx=x-27+i*18+row*9,by=y-8-row*9;ell(c,bx,by,10,6);ink(c,'#a8946a',2.4);}}},
  };
  function prop(c,kind,x,y,o){const P=PROPS[kind];if(P)P.draw(c,x,y,o||{});}
  function floor(c,x,y,w,h,biome,seed){const b=BIOME[biome||'dust'],rnd=mkRng(seed||5);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    c.fillStyle=b.floor;c.fillRect(x,y,w,h);
    for(let yy=y;yy<y+h;yy+=48)for(let xx=x+((yy-y)/48%2?-24:0);xx<x+w;xx+=48){rr(c,xx+2,yy+2,44,44,6);c.fillStyle=rnd()<.5?b.tileA:b.tileB;c.fill();}
    c.strokeStyle=b.crack;c.lineWidth=2;for(let i=0;i<w*h/12000;i++){let px=x+rnd()*w,py=y+rnd()*h;c.beginPath();c.moveTo(px,py);for(let k=0;k<3;k++){px+=(rnd()-.5)*30;py+=(rnd()-.3)*20;c.lineTo(px,py);}c.stroke();}
    c.restore();}
  function trail(c,pts,biome,width){const b=BIOME[biome||'dust'];c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle=b.trail;c.lineWidth=width||48;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.restore();}
  /* a wall's footprint is x,y,w,h; its face rises above the footprint's south edge */
  const WALL_H=26;
  function wall(c,x,y,w,h,biome,o){const b=BIOME[biome||'dust'];o=o||{};c.save();if(o.fade)c.globalAlpha=1-o.fade*.7;
    block(c,x-3,y-WALL_H-3,w+6,h+3,WALL_H,b.rockTop,b.rockFront,LW.prop);
    c.strokeStyle=b.rockLine;c.lineWidth=2;for(let k=x+18;k<x+w;k+=34){c.beginPath();c.moveTo(k,y+h-WALL_H+4);c.lineTo(k+6,y+h-4);c.stroke();}
    c.fillStyle=b.rockHi;c.fillRect(x+4,y-WALL_H+2,w-8,4);c.restore();}
  function lampLight(c,x,y,r){const g=c.createRadialGradient(x,y,4,x,y,r||130);g.addColorStop(0,'rgba(255,220,140,.32)');g.addColorStop(1,'rgba(255,220,140,0)');c.fillStyle=g;c.fillRect(x-(r||130),y-(r||130),(r||130)*2,(r||130)*2);}
  function scorch(c,x,y,r){const g=c.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,'rgba(10,6,4,.7)');g.addColorStop(1,'rgba(10,6,4,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    c.strokeStyle='rgba(10,6,4,.6)';c.lineWidth=2;for(let i=0;i<5;i++){const a=i*1.3;c.beginPath();c.moveTo(x+Math.cos(a)*r*.3,y+Math.sin(a)*r*.2);c.lineTo(x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.5);c.stroke();}}

  /* =================================================================
     EFFECTS — fat, outlined, short-lived. Every effect takes k (0..1
     progress) so the game owns timing.
     ================================================================= */
  function bolt(c,x0,y0,x1,y1,kind,side){
    const a=Math.atan2(y1-y0,x1-x0),len=Math.hypot(x1-x0,y1-y0);
    const col=kind==='plasma'?(side==='reb'?'#ff7a6a':'#8ab4ff'):'#ffd866';
    c.save();c.translate(x0,y0);c.rotate(a);
    if(kind==='ballistic'){c.strokeStyle=rgba(col,.9);c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(Math.max(0,len-26),0);c.lineTo(len,0);c.stroke();c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();}
    else{rr(c,len-26,-3.5,26,7,3.5);ink(c,col,2.4);c.fillStyle='rgba(255,255,255,.7)';c.fillRect(len-20,-1.2,14,2.4);}
    c.restore();}
  function hit(c,x,y,k){const r=(6+k*8);c.save();c.globalAlpha=1-k;star(c,x,y,r,'#fff3b0');for(let i=0;i<5;i++){const a=i*TAU/5+k;c.fillStyle='#ffb347';c.fillRect(x+Math.cos(a)*r*1.4,y+Math.sin(a)*r*1.4,3,3);}c.restore();}
  function explosion(c,x,y,k){const r=10+k*30;c.save();c.globalAlpha=Math.min(1,(1-k)*1.6);
    for(let i=0;i<7;i++){const a=i*TAU/7,d=r*.55;circ(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.75-k*12,r*.5);ink(c,k<.35?'#ffb347':k<.7?'#8a7a6a':'#5a5450',2.6);}
    if(k<.4){circ(c,x,y-k*10,r*.55);ink(c,'#fff3b0',2.6);}
    for(let i=0;i<6;i++){const a=i*1.1;c.fillStyle=C.ink;c.fillRect(x+Math.cos(a)*r*1.5*k*1.6,y+Math.sin(a)*r*k*1.6-k*20+k*k*30,3,3);}c.restore();}
  function smoke(c,x,y,k){c.save();c.globalAlpha=(1-k)*.8;circ(c,x+k*6,y-k*20,4+k*8);ink(c,'#8a8a92',1.6);c.restore();}

  /* =================================================================
     SHIPS — built from parts, nose along +x. Each part takes a cel
     shade lit from the screen's top left whatever the heading.
     Rebel liveries are patched and personal; Hegemony liveries are clean,
     dark, glowing and faceless (a visor slit instead of a canopy).
     part kinds: pts (polygon) · box [x,y,w,h,r] · gun [x0,x1,y,w] ·
     turret [x,y,r] · m:1 mirrors across the centreline.
     colour keys: hull, hull2, dark, acc, panel or any hex.
     ================================================================= */
  const SHIPS={
    cross:{name:'FT-4 Cross',maker:'mendon',role:'Multirole patrol craft',game:'viper',mounts:{primary:[[0,-10.5],[0,10.5]],secondary:[[4,-6]]},defaults:{primary:'repeaters'},
      parts:[
        {pts:[[-11,-3.5],[-16,-9],[-19.5,-9],[-17,-3]],m:1,f:'hull2'},
        {pts:[[5,-4],[3,-16],[-5.5,-16],[-6.5,-4]],m:1,f:'hull2',id:'wing'},
        {box:[-7,-19,13,4.2,2],m:1,f:'dark'},
        {pts:[[21,0],[17,-3.6],[6,-4.8],[-12,-4.4],[-17,-2.8],[-17,2.8],[-12,4.4],[6,4.8],[17,3.6]],f:'hull'},
        {box:[-13,-1.7,14,3.4,1.2],f:'hull2'},
      ],
      lines:[[[-12,-4.2],[-12,4.2]],[[-3,-4.6],[-3,4.6]],[[14,-3.4],[14,3.4]],[[-1,-12],[-4,-12]],[[-1,12],[-4,12]]],
      vents:[[-15,-2.2],[-15,1]],rivets:[[2,-4],[2,4],[-8,-4],[-8,4],[11,-3.6],[11,3.6]],
      canopy:[8.5,0,4.6,3],engines:[[-17,0,3]],lights:[[-1,-18.8,'#ff5a5a'],[-1,18.8,'#5aff7a']],searchlight:[18.5,-2.2],
      liveries:{
        law:{label:'Frontier law (stock)',hull:'#dfe3ea',hull2:'#3a4a7a',dark:'#2a2f40',acc:C.heg,mark:['MD-41',-4,-8.5,'#3a4a7a'],emblem:[-8,8.5],pilot:'trooper',faceless:true,stripes:[{pts:[[-9,-4.4],[-6,-4.4],[-6,4.4],[-9,4.4]]}]},
        rebel:{label:'Dustfall (stolen)',hull:'#c4bba8',hull2:'#5a5f4a',dark:'#2f2c28',acc:C.rebel,pilot:'joss',mark:['DUSTFALL',-1,8.5,'#2a1a10'],
          stripes:[{pts:[[-9,-4.4],[-5.5,-4.4],[-5.5,4.4],[-9,4.4]],drips:1}],patches:[[2,-14,5,6,'#8a8a6a'],[-14,1.5,6,3,'#a89870']],tape:[[10,3,-.6],[-2,-6,.4]],scratch:[-8,8.5],scorch:[[13,-2,3],[-10,-12,2.6]],paletteNote:'Repainted by hand over the law livery; the old star is scratched out.'},
      }},
    talon:{name:'SF-11 Talon',maker:'aerostar',role:'Racer turned interceptor',game:'talon',mounts:{primary:[[-3,-8.6],[-3,8.6]],secondary:[[4,-4.6]]},defaults:{primary:'repeaters'},
      parts:[
        {box:[-15,-7.2,11,3.6,1.5],m:1,f:'dark'},
        {pts:[[2,-3.4],[-8,-12.5],[-13,-12.5],[-9.5,-3.2]],m:1,f:'hull2',id:'wing'},
        {pts:[[12,-2.4],[8,-6.2],[5.6,-6.2],[6.6,-2.6]],m:1,f:'hull2'},
        {pts:[[25,0],[16,-2.7],[2,-3.7],[-10,-3.4],[-15,-2.4],[-15,2.4],[-10,3.4],[2,3.7],[16,2.7]],f:'hull'},
      ],
      lines:[[[-9,-3.3],[-9,3.3]],[[-1,-3.6],[-1,3.6]],[[-11,-9],[-7,-9]],[[-11,9],[-7,9]]],
      vents:[[-12,-1.8],[-12,.8]],rivets:[[-2,-8.6],[2,-8.6],[-2,8.6],[2,8.6]],clamps:[[0,-8.6],[0,8.6]],
      canopy:[7,0,5.6,2.5],engines:[[-15,-5.4,1.8],[-15,5.4,1.8]],lights:[[-12,-12.8,'#ff5a5a'],[-12,12.8,'#5aff7a']],
      liveries:{
        rebel:{label:'Rebel (ex-racer)',hull:'#ece2cc',hull2:'#d8ccb0',dark:'#3a3a44',acc:C.rebel,pilot:'runa',roundel:[16,0,'07'],racing:1,checker:[-13,-2.4,3,4.8],
          wingSwap:'#9a9a80',tape:[[4,-9,.5]],scorch:[[-6,6,2.6]],paletteNote:'Racing livery faded; one wing salvaged from another airframe.'},
      }},
    graf:{name:'Graf Hauler',nick:"'ol Gran",maker:'mendon',role:'Light hauler, converted dropship',game:'graf',mounts:{primary:[[18,-5]],secondary:[[18,5]],door:[[2,-8.6,-1],[2,8.6,1]]},defaults:{},
      parts:[
        {box:[-17,-13.5,17,6,2],m:1,f:'hull2'},
        {pts:[[17,-5.5],[20,-2.4],[20,2.4],[17,5.5],[8,8],[-13,8],[-18,5.5],[-18,-5.5],[-13,-8],[8,-8]],f:'hull'},
        {box:[-15,-9.5,8,4,1],m:1,f:'#7a7e86'},
        {box:[3,1.6,6,5,1],f:'#c0a070'},
      ],
      lines:[[[-16,0],[-7,0]],[[9,-7.6],[9,7.6]],[[-11,-7.8],[-11,7.8]],[[-15,-11],[-3,-11]],[[-15,11],[-3,11]],[[-9,-13.4],[-9,-7.6]],[[-9,7.6],[-9,13.4]]],
      vents:[[-16,-3.6],[-16,2.4],[13,-5],[13,4]],rivets:[[-14.4,-9],[-7.6,-9],[-14.4,9],[-7.6,9],[3.8,2.4],[8.2,2.4],[3.8,6],[8.2,6]],
      dish:[-12,0,3.2],canopy:[13.5,-1.5,3.6,3.2],engines:[[-18,-3.6,2.7],[-18,3.6,2.7]],lights:[[-16,-13.8,'#ff5a5a'],[-16,13.8,'#5aff7a']],
      liveries:{
        rebel:{label:'Marta (militia dropship)',loadout:{attach:['doorgun','plates']},hull:'#d9c9a2',hull2:'#b8a67e',dark:'#4a4a56',acc:C.rebel,pilot:'joss',mark:['MARTA',-7,-10.8,'#2a1a10'],nose:[17,3.4,"GRAN"],
          stripes:[{pts:[[-5,-8],[-1.8,-8],[-1.8,8],[-5,8]],drips:1}],patches:[[-6,-6.5,7,5.4,'#a8b0b8']],scorch:[[12,4,3.2],[-14,-3,2.4]],paletteNote:'Welded armour plates over the cargo pods, door guns in the old hatches.'},
        civ:{label:'Stock hauler',hull:'#c8ccc4',hull2:'#9aa0a0',dark:'#4a4a56',acc:'#d8a03a',pilot:'civ',mark:['GRAF-1',-7,-10.8,'#3a3a40']},
      }},
    mote:{name:'VC Mote',maker:'varrondow',role:'Hegemony Security patrol craft',game:'mote',mounts:{primary:[[6,4.4]]},defaults:{primary:'repeaters'},
      parts:[
        {pts:[[-2,-6],[-6,-10.5],[-9.5,-10.5],[-7.5,-5.4]],m:1,f:'hull2'},
        {pts:[[13,0],[9,-5],[0,-6.6],[-8,-6],[-11,-3],[-11,3],[-8,6],[0,6.6],[9,5]],f:'hull'},
        {box:[-8,-2.2,10,4.4,1.5],f:'hull2'},
      ],
      lines:[[[4,-6.2],[4,6.2]],[[-5,-6],[-5,6]],[[9,-4.6],[11.5,0]]],vents:[[-9,-1.6],[-9,.6],[-3,-5],[-3,4]],rivets:[[1,-5.6],[1,5.6],[-7,-5],[-7,5]],
      slit:[3,0,5.6,2.2],engines:[[-11,-2.4,1.8],[-11,2.4,1.8]],lights:[[-8,-10.8,C.hegHi],[-8,10.8,C.hegHi]],scanner:[10.5,0,2.4],
      liveries:{heg:{label:'Hegemony Security',hull:'#8a90a0',hull2:'#2c3a5e',dark:'#1a2240',acc:C.heg,mark:['VC-114',-1,-8.6,C.hegHi],emblem:[-1,8.6],trim:[[9,-5],[0,-6.6]]}}},
    scim:{name:'VK-3 Scimitar',maker:'varrondow',role:'Advanced multirole fighter',game:'scim',mounts:{primary:[[-6,-14.6],[-6,14.6]],secondary:[[-2,-6.6],[-2,6.6]]},defaults:{primary:'repeaters',secondary:'missiles'},
      parts:[
        {pts:[[4,-5],[0,-12],[-6,-18],[-12.5,-19],[-8,-11],[-4,-7]],m:1,f:'hull'},
        {pts:[[4,-5],[0,-12],[-6,-18],[-7.6,-17.4],[-1.6,-11.4],[2.4,-5]],m:1,f:'hull2'},
        {pts:[[21,0],[6,-5],[-4,-8],[-12,-7],[-8,0],[-12,7],[-4,8],[6,5]],f:'hull'},
        {pts:[[17,0],[8,-2.6],[-6,-2.6],[-6,2.6],[8,2.6]],f:'dark'},
      ],
      lines:[[[-4,-7.8],[-1,-2.6]],[[-4,7.8],[-1,2.6]],[[10,-3.6],[10,3.6]]],vents:[[-9,-5],[-9,4]],rivets:[[2,-4.6],[2,4.6],[-6,-6.6],[-6,6.6]],
      slit:[7,0,6.5,2.2],engines:[[-11,-4,2.4],[-11,4,2.4]],lights:[[-12,-18.6,C.hegHi],[-12,18.6,C.hegHi]],
      liveries:{heg:{label:'Wing commander',hull:'#2b3046',hull2:'#d5dbea',dark:'#141826',acc:C.heg,mark:['VK-3',-3,-10.6,C.hegHi],chev:[[-7,-13],[-5,-11.5],[-3,-10]],emblem:[-3,10.6],trim:[[6,-5],[-4,-8]],trim2:[[0,-12],[-6,-18]]}}},
    monitor:{name:'Drone Monitor',maker:'autocom',role:'Patrols civilian routes; summons reinforcements',game:'monitor',drone:1,mounts:{primary:[[2,4.6]]},defaults:{primary:'repeaters'},
      parts:[
        {pts:[[-1,-4],[-4,-8.4],[-7.5,-8.4],[-6.5,-3.4]],m:1,f:'hull2'},
        {pts:[[7,0],[5,-4.6],[0,-6.4],[-5,-5],[-7.4,0],[-5,5],[0,6.4],[5,4.6]],f:'hull'},
      ],
      lines:[[[-2,-6],[-2,6]],[[3,-5.4],[3,5.4]]],vents:[[-6,-1.4],[-6,.4]],rivets:[[1,-5.4],[1,5.4]],
      dish:[-3,0,2.6],scanner:[6,0,2.2],engines:[[-7.4,0,1.5]],lights:[[-6,-8.6,C.hegHi],[-6,8.6,C.hegHi]],
      liveries:{heg:{label:'Hegemony Security',hull:'#b8c0cc',hull2:'#2c3a5e',dark:'#1a2240',acc:C.heg,mark:['MON',-1,-7.4,C.hegHi]}}},
    pursuer:{name:'Drone Pursuer',maker:'autocom',role:'Day-to-day hostile situations',game:'pursuer',drone:1,mounts:{primary:[[1,-8.6],[1,8.6]]},defaults:{primary:'repeaters'},
      parts:[
        {pts:[[11,-2.2],[2,-10],[-2.5,-10],[3,-2.4]],m:1,f:'hull2'},
        {pts:[[17,0],[8,-3.6],[-6,-5],[-11,-3],[-11,3],[-6,5],[8,3.6]],f:'hull'},
        {box:[-9,-1.4,14,2.8,1],f:'dark'},
      ],
      lines:[[[-6,-4.8],[-8,-1.4]],[[-6,4.8],[-8,1.4]],[[9,-3.2],[9,3.2]]],vents:[[-10,-2.2],[-10,1.2]],rivets:[[4,-3.8],[4,3.8]],
      slit:[10,0,6,1.8],engines:[[-11,-2.6,1.9],[-11,2.6,1.9]],lights:[[-1,-10.4,C.hegHi],[-1,10.4,C.hegHi]],
      liveries:{heg:{label:'Hegemony Security',hull:'#b8c0cc',hull2:'#2c3a5e',dark:'#1a2240',acc:C.heg,mark:['PUR',-3,-7.6,C.hegHi],trim:[[8,-3.6],[-6,-5]]}}},
    clamper:{name:'Drone Mag-Clamper',maker:'autocom',role:'Restrains and slows ships with magnets',game:'clamper',drone:1,mounts:{},defaults:{},
      parts:[
        {box:[6,-12.5,12,4.2,1.6],m:1,f:'hull2'},
        {box:[16,-14,4.4,7.4,1.6],m:1,f:'dark'},
        {pts:[[11,-6.5],[13,0],[11,6.5],[-8,8.5],[-14,0],[-8,-8.5]],f:'hull'},
        {box:[-6,-8.6,4,17.2,1],f:'hull2'},
      ],
      lines:[[[2,-7.6],[2,7.6]],[[-10,-6],[-10,6]],[[8,-11],[14,-11]],[[8,11],[14,11]]],vents:[[-12,-2],[-12,.8],[6,-5],[6,4]],rivets:[[-1,-7.6],[-1,7.6],[9,-5.8],[9,5.8]],
      eye:[8,0,2.8],magnets:[[20,-10.3],[20,10.3]],engines:[[-14,-3.4,2],[-14,3.4,2],[-13,0,1.5]],lights:[[-8,-9,C.hegHi],[-8,9,C.hegHi]],
      liveries:{heg:{label:'Hegemony Security',hull:'#b8c0cc',hull2:'#2c3a5e',dark:'#1a2240',acc:C.heg,mark:['MAG',3,-10.2,C.hegHi],emblem:[-4,0]}}},
    fledgling:{name:'VT-2 Fledgling',maker:'varrondow',role:'Old trainer, no shields',game:'fled',mounts:{primary:[[9,0]]},defaults:{primary:'repeaters'},
      parts:[
        {pts:[[2,-3],[-1,-10.5],[-6,-10.5],[-6,-3]],m:1,f:'hull2'},
        {pts:[[-9,-2],[-12,-6],[-14,-6],[-13,-2]],m:1,f:'hull2'},
        {pts:[[14,0],[11,-3],[3,-4.4],[-9,-3.6],[-13,-2],[-13,2],[-9,3.6],[3,4.4],[11,3]],f:'hull'},
        {box:[-1,-5.6,6,2.2,1],m:1,f:'dark'},
      ],
      lines:[[[-5,-3.8],[-5,3.8]],[[6,-4],[6,4]],[[-3,-8],[-5,-8]],[[-3,8],[-5,8]]],vents:[[-11,-1.4],[-11,.4]],rivets:[[0,-3.8],[0,3.8],[-8,-3.4],[-8,3.4],[9,-3],[9,3]],
      canopy:[4.5,0,3.8,2.5],engines:[[-13,0,2.2]],lights:[[-4,-10.8,'#ff5a5a'],[-4,10.8,'#5aff7a']],
      liveries:{
        heg:{label:'Naval trainer',hull:'#c8ccd6',hull2:'#2c3a5e',dark:'#1a2240',acc:C.heg,faceless:true,mark:['T-07',-3.5,-7.2,'#2c3a5e'],emblem:[-3.5,7.2],stripes:[{pts:[[-10,-3.4],[-8,-3.6],[-8,3.6],[-10,3.4]]}]},
        pirate:{label:'Scrapyard revival',hull:'#a8a08c',hull2:'#6a5a4a',dark:'#2f2c28',acc:C.rebel,pilot:'squatter',wingSwap:'#7a8a8a',patches:[[6,-3.4,4,3,'#8a7a5a'],[-12,1,3,2.4,'#6a6a72']],tape:[[-3,-6,.6]],scratch:[-3.5,7.2],scorch:[[2,2,2.6]],mark:['JUNKER',-3.5,-7.2,'#2a1a10']},
      }},
  };
  const SHIP_FOR_GAME={viper:'cross',talon:'talon',graf:'graf',mote:'mote',scim:'scim',fled:'fledgling',monitor:'monitor',pursuer:'pursuer',clamper:'clamper'};
  /* ship weapons and attachments: drawn at the hull's mount points. Hard points are game data and aren't shown. */
  const SHIP_WEAPONS={
    repeaters:{name:'BLS-T Light Repeaters',slot:'primary',draw(c,t,fire){rr(c,-2.5,-1.6,7,3.2,1.2);ink(c,'#3b3a44',.7);rr(c,4,-1.4,6,1.1,.5);ink(c,'#2a2a32',.5);rr(c,4,.3,6,1.1,.5);ink(c,'#2a2a32',.5);
      if(fire){c.fillStyle='#fff3c8';c.beginPath();c.arc(10.6,-.8,1.6,0,TAU);c.arc(10.6,.8,1.6,0,TAU);c.fill();}}},
    missiles:{name:'Missiles',slot:'secondary',draw(c){rr(c,-4,-2.2,9,4.4,1.4);ink(c,'#4a5068',.7);for(const yy of[-1.1,1.1]){rr(c,2,yy-.6,4.6,1.2,.6);ink(c,'#e8ecf4',.4);poly(c,[[6.6,yy-.6],[8,yy],[6.6,yy+.6]]);c.fillStyle=C.heg;c.fill();}}},
    doorgun:{name:'Door Mounted Gun',slot:'attachment',door:1,note:'Enables Door Gunner Support in ground missions.',draw(c,t,fire,side,pilot){rr(c,-2.6,-2.6,5.2,5.2,1.6);ink(c,'#2a2a32',.7);
      c.save();c.rotate(-side*.9+Math.sin(t*1.3)*.15);rr(c,0,-.7,8,1.4,.6);ink(c,'#3b3a44',.6);if(fire){circ(c,8.8,0,1.4);c.fillStyle='#fff3c8';c.fill();}c.restore();
      circ(c,-1.2*side*0,0,1.6);c.fillStyle='#d9a982';c.fill();c.lineWidth=.5;c.strokeStyle=C.ink;c.stroke();}},
    plates:{name:'Armour plates (example)',slot:'attachment',example:1,draw(){}},
    tank:{name:'External fuel tank (example)',slot:'attachment',example:1,draw(){}},
  };

  function ship(c,id,x,y,ang,s,t,o){
    o=o||{};const D=SHIPS[id];if(!D)return;const lv=D.liveries[o.livery]||Object.values(D.liveries)[0];
    const col=f=>f==='hull'?lv.hull:f==='hull2'?lv.hull2:f==='dark'?lv.dark:f==='acc'?lv.acc:f;
    const dmg=o.damage||0,lw=LW.char/s;
    const L0=-1.4,L1=-1.4,lx=L0*Math.cos(-ang)-L1*Math.sin(-ang),ly=L0*Math.sin(-ang)+L1*Math.cos(-ang);
    const engCol=lv.acc===C.heg?C.hegHi:'#ffb347';
    c.save();c.translate(x,y);c.rotate(ang);c.scale(s,s);if(o.roll)c.scale(1,1-.38*Math.abs(o.roll));c.lineJoin='round';c.lineCap='round';
    for(const[ex,ey,er]of D.engines){const sputter=dmg>.6&&Math.sin(t*23+ey)>.6?.3:1;const f=er*(2.6+Math.sin(t*30+ey)*.6)*(o.boost?1.8:1)*sputter;const g=c.createLinearGradient(ex,0,ex-f*2,0);g.addColorStop(0,'#fffbe6');g.addColorStop(.4,engCol);g.addColorStop(1,rgba(engCol,0));
      c.beginPath();c.moveTo(ex,ey-er*.9);c.quadraticCurveTo(ex-f*1.2,ey-er*.5,ex-f*2,ey);c.quadraticCurveTo(ex-f*1.2,ey+er*.5,ex,ey+er*.9);c.closePath();c.fillStyle=g;c.fill();}
    const each=(p,fn)=>{fn(1);if(p.m)fn(-1);};
    const shp=(p,sy)=>{if(p.pts)poly(c,p.pts.map(([a,b])=>[a,b*sy]));else{const[a,b,w,h,r]=p.box;rr(c,a,sy>0?b:-b-h,w,h,r);}};
    for(const p of D.parts){
      if(p.gun){each(p,sy=>{const[x0,x1,gy,gw]=p.gun;rr(c,x0,gy*sy-gw/2,x1-x0,gw,gw/2);ink(c,'#3b3a44',lw);rr(c,x1-1.5,gy*sy-gw*.8,2.6,gw*1.6,.8);ink(c,'#2a2a32',lw*.8);});continue;}
      if(p.turret){each(p,sy=>{const[tx,ty,tr]=p.turret;rr(c,tx,ty*sy-.7,6,1.4,.7);ink(c,'#3b3a44',lw*.8);circ(c,tx,ty*sy,tr);ink(c,'#6a6e78',lw);});continue;}
      each(p,sy=>{let fc=col(p.f);if(p.id==='wing'&&lv.wingSwap&&sy<0)fc=lv.wingSwap;shp(p,sy);c.fillStyle=shade(fc,-.25);c.fill();
        c.save();shp(p,sy);c.clip();c.translate(lx,ly);shp(p,sy);c.fillStyle=fc;c.fill();c.restore();shp(p,sy);c.lineWidth=lw;c.strokeStyle=C.ink;c.stroke();});
    }
    // attachments that sit on the hull (examples until the attachment list exists)
    const L=Object.assign({},D.defaults||{},lv.loadout||{},o.loadout||{});const att=new Set(L.attach||[]);
    if(att.has('plates'))for(const sy of[-1,1]){rr(c,-12,sy>0?3.2:-7.2,9,4,.8);ink(c,'#7a7e86',lw*.7);c.fillStyle=rgba(C.ink,.5);for(const px of[-11,-4.8]){circ(c,px,sy*5.2,.35);c.fill();}}
    if(att.has('tank')){rr(c,-6,(D.mounts&&D.mounts.primary?Math.abs(D.mounts.primary[0][1]):8)+2,12,3.4,1.7);ink(c,'#b8b0a0',lw*.7);}
    // weapons at their mounts
    const fireNow=o.fire&&Math.sin(t*14)>0;
    const mountAll=(key,list)=>{const Wd=SHIP_WEAPONS[key];if(!Wd||!list)return;for(const m of list){c.save();c.translate(m[0],m[1]);Wd.draw(c,t,fireNow,m[2]||1);c.restore();}};
    if(D.mounts){mountAll(L.primary,D.mounts.primary);mountAll(L.secondary,D.mounts.secondary);if(att.has('doorgun'))mountAll('doorgun',D.mounts.door);}
    // paint
    for(const st of lv.stripes||[]){const pts=st.pts;poly(c,pts);c.fillStyle=lv.acc;c.fill();
      if(st.drips){c.fillStyle=lv.acc;for(let i=0;i<3;i++){const dx=pts[0][0]+.6+i*1.1;rr(c,dx,pts[2][1]-.2,.7,1.2+i%2*1.2,.35);c.fill();}
        c.save();poly(c,pts);c.clip();c.fillStyle=lv.hull;const rn=mkRng(pts[0][0]*7+3);for(let i=0;i<4;i++){const cx=pts[0][0]+rn()*3.5,cy=pts[0][1]+rn()*(pts[2][1]-pts[0][1]);poly(c,[[cx,cy],[cx+.8,cy+.25],[cx+.3,cy+.7]]);c.fill();}c.restore();}}
    if(lv.racing){c.strokeStyle=lv.acc;c.lineWidth=.7;for(const sy of[-1.2,1.2]){c.beginPath();c.moveTo(22,sy*.6);c.lineTo(-13,sy);c.stroke();}}
    if(lv.checker){const[cx0,cy0,cw,chh]=lv.checker;for(let i=0;i<3;i++)for(let j=0;j<4;j++){c.fillStyle=(i+j)%2?C.ink:'#f4f0e6';c.fillRect(cx0+i*cw/3,cy0+j*chh/4,cw/3,chh/4);}}
    if(lv.roundel){const[rx,ry,num]=lv.roundel;circ(c,rx,ry,2.3);ink(c,'#f4f0e6',lw*.7);c.save();c.translate(rx,ry);c.rotate(Math.PI/2);c.font='900 2.4px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=C.ink;c.fillText(num,0,.2);c.restore();}
    for(const[a,b,w,h,pc]of lv.patches||[]){rr(c,a,b,w,h,.6);ink(c,pc,lw*.6);c.fillStyle=rgba(C.ink,.55);for(const[px,py]of[[a+.7,b+.7],[a+w-.7,b+.7],[a+.7,b+h-.7],[a+w-.7,b+h-.7]]){circ(c,px,py,.3);c.fill();}}
    c.fillStyle=rgba(C.ink,.45);c.lineWidth=.55;c.strokeStyle=rgba(C.ink,.45);
    for(const ln of D.lines||[]){c.beginPath();ln.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();}
    for(const[vx,vy]of D.vents||[]){rr(c,vx,vy,2.4,1.2,.4);c.fillStyle=rgba(C.ink,.6);c.fill();}
    c.fillStyle=rgba(C.ink,.5);for(const[rx,ry]of D.rivets||[]){circ(c,rx,ry,.32);c.fill();}
    for(const[cx0,cy0]of D.clamps||[]){c.fillStyle='#9a9a9a';c.fillRect(cx0-.6,cy0-1.5,1.2,3);c.fillRect(cx0+2.4,cy0-1.5,1.2,3);}
    if(D.dish){const[dx,dy,dr]=D.dish;circ(c,dx,dy,dr);ink(c,'#e8e0cc',lw);circ(c,dx,dy,dr*.35);c.fillStyle='#8a8a92';c.fill();c.beginPath();c.moveTo(dx,dy);c.lineTo(dx-dr-3,dy-dr);c.lineWidth=.6;c.strokeStyle=C.ink;c.stroke();}
    for(const[tx,ty,ta]of lv.tape||[]){c.save();c.translate(tx,ty);c.rotate(ta);c.fillStyle='rgba(220,220,210,.9)';c.fillRect(-2.4,-.6,4.8,1.2);c.rotate(1.3);c.fillRect(-2,-.55,4,1.1);c.restore();}
    for(const[sx,sy,sr]of(lv.scorch||[]).concat(dmg>.2?[[-4,2,3+dmg*3],[6,-2,2+dmg*3],[-9,-6,dmg*4]]:[])){const g=c.createRadialGradient(sx,sy,0,sx,sy,sr);g.addColorStop(0,'rgba(20,14,10,.6)');g.addColorStop(1,'rgba(20,14,10,0)');c.fillStyle=g;c.fillRect(sx-sr,sy-sr,sr*2,sr*2);}
    if(dmg>.45){rr(c,-6,-3,5,3.4,.6);ink(c,'#1a1210',lw*.6);c.strokeStyle='#ff8a1f';c.lineWidth=.4;c.beginPath();c.moveTo(-5,-1.5);c.lineTo(-3,-.5);c.lineTo(-2,-2);c.stroke();}
    if(lv.emblem){const[ex,ey]=lv.emblem;c.save();c.translate(ex,ey);c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*1.9,Math.sin(a)*1.9);}c.closePath();c.fillStyle=lv.acc===C.heg?C.hegDeep:lv.acc;c.fill();c.lineWidth=.4;c.strokeStyle=C.hegHi;c.stroke();circ(c,0,0,.6);c.fillStyle=C.hegHi;c.fill();c.restore();}
    if(lv.scratch){const[sx,sy]=lv.scratch;c.save();c.translate(sx,sy);c.globalAlpha=.55;c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*1.9,Math.sin(a)*1.9);}c.closePath();c.fillStyle='#6a7aa0';c.fill();c.globalAlpha=1;c.strokeStyle='#f4f0e6';c.lineWidth=.45;c.beginPath();c.moveTo(-2.2,-2);c.lineTo(2.2,2);c.moveTo(2.2,-2);c.lineTo(-2.2,2);c.stroke();c.restore();}
    for(const ch of lv.chev||[]){const[a,b]=ch;for(const sy of[1,-1]){c.beginPath();c.moveTo(a-1.4,b*sy-1.1);c.lineTo(a,b*sy);c.lineTo(a-1.4,b*sy+1.1);c.lineWidth=.8;c.strokeStyle='#e8ecf6';c.stroke();}}
    const glow=(seg,w)=>{c.save();c.shadowColor=C.heg;c.shadowBlur=6;c.strokeStyle=C.hegHi;c.lineWidth=w||.7;for(const sy of[1,-1]){c.beginPath();c.moveTo(seg[0][0],seg[0][1]*sy);c.lineTo(seg[1][0],seg[1][1]*sy);c.stroke();}c.restore();};
    if(lv.trim)glow(lv.trim);if(lv.trim2)glow(lv.trim2,.6);
    if(lv.mark){const[txt,mx,my,mc]=lv.mark;c.save();c.translate(mx,my);c.font='900 2.4px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=mc;c.fillText(txt,0,0);c.restore();}
    if(lv.nose){const[nx,ny,txt]=lv.nose;c.save();c.translate(nx,ny);circ(c,0,0,1.8);ink(c,'#f4e6c8',lw*.5);c.fillStyle=C.rebel;c.font='900 1.5px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,0,.1);c.restore();}
    for(const[nx,ny,nc]of D.lights){const on=Math.sin(t*3+(ny>0?1.6:0))>-.2&&!(dmg>.6&&Math.sin(t*17)>0);circ(c,nx,ny,.9);c.fillStyle=nc;if(on){c.shadowColor=nc;c.shadowBlur=8;}c.fill();c.shadowBlur=0;}
    for(const[ex,ey,er]of D.engines){rr(c,ex-1.2,ey-er,2.4,er*2,.8);ink(c,lv.dark,lw*.8);}
    if(D.searchlight&&!o.dark){const[sx2,sy2]=D.searchlight;circ(c,sx2,sy2,1.1);c.fillStyle='#fff3c8';c.shadowColor='#fff3c8';c.shadowBlur=6;c.fill();c.shadowBlur=0;}
    if(D.scanner){const[sx2,sy2,sr]=D.scanner;const g=c.createRadialGradient(sx2,sy2,0,sx2+16,sy2,18);g.addColorStop(0,rgba(C.heg,.18));g.addColorStop(1,rgba(C.heg,0));const sw=Math.sin(t*1.8)*.35;c.save();c.rotate(0);c.beginPath();c.moveTo(sx2,sy2);c.arc(sx2,sy2,10,sw-.3,sw+.3);c.closePath();c.fillStyle=g;c.fill();c.restore();
      circ(c,sx2,sy2,sr);ink(c,'#0c1024',lw*.8);circ(c,sx2,sy2,sr*.55);c.fillStyle=C.hegHi;c.shadowColor=C.heg;c.shadowBlur=8;c.fill();c.shadowBlur=0;}
    if(D.eye){const[ex,ey,er]=D.eye;circ(c,ex,ey,er);ink(c,'#0c1024',lw*.8);circ(c,ex,ey,er*.6);c.fillStyle=C.shield;c.shadowColor=C.shield;c.shadowBlur=8;c.fill();c.shadowBlur=0;circ(c,ex-er*.25,ey-er*.25,er*.18);c.fillStyle='#fff';c.fill();}
    if(D.magnets){for(const[mx,my]of D.magnets){const k=o.clamp?1:.45+.25*Math.sin(t*4);rr(c,mx-1.2,my-3.4,2.4,6.8,.8);c.fillStyle=rgba(C.hegHi,k);c.shadowColor=C.heg;c.shadowBlur=o.clamp?12:5;c.fill();c.shadowBlur=0;}}
    const faceless=D.slit||lv.faceless||D.drone;
    if(D.slit){const[sx2,sy2,sw,sh]=D.slit;rr(c,sx2-sw/2,sy2-sh/2,sw,sh,sh/2);ink(c,'#0c1024',lw);c.save();c.shadowColor=C.heg;c.shadowBlur=8;rr(c,sx2-sw/2+1,sy2-.35,sw-2,.7,.35);c.fillStyle=C.hegHi;c.fill();c.restore();}
    c.restore();
    if(D.canopy){const[cx0,cy0,rx,ry]=D.canopy;const P=[x+(cx0*Math.cos(ang)-cy0*Math.sin(ang))*s,y+(cx0*Math.sin(ang)+cy0*Math.cos(ang))*s];
      const glass=()=>{c.save();c.translate(P[0],P[1]);c.rotate(ang);ell(c,0,0,rx*s,ry*s);c.restore();};
      glass();c.fillStyle=faceless?'#141a30':'#9ad8f0';c.fill();
      const pil=o.pilot!==undefined?o.pilot:lv.pilot;if(!faceless&&pil){c.save();glass();c.clip();const hs=Math.min(rx,ry)*s/15;character(c,P[0],P[1]+hs*1.15*31,pil,{view:'front',state:dmg>.6?'panic':'idle',t,s:hs*1.15});c.restore();}
      if(faceless){c.save();c.translate(P[0],P[1]);c.rotate(ang);c.shadowColor=C.heg;c.shadowBlur=8;rr(c,-rx*s*.1,-ry*s*.6,rx*s*.3,ry*s*1.2,1);c.fillStyle=C.hegHi;c.fill();c.restore();}
      glass();c.fillStyle='rgba(200,240,255,.16)';c.fill();
      c.save();c.translate(P[0],P[1]);c.rotate(ang);c.beginPath();c.ellipse(-rx*s*.25,-ry*s*.3,rx*s*.45,ry*s*.22,0,0,TAU);c.fillStyle='rgba(255,255,255,.5)';c.fill();c.restore();
      glass();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();}
    if(o.calling){for(let i=0;i<3;i++){const k=(t*.8+i/3)%1;c.save();c.globalAlpha=1-k;c.beginPath();c.arc(x,y,(6+k*30)*s/2,0,TAU);c.lineWidth=2;c.strokeStyle=C.hegHi;c.setLineDash([4,4]);c.stroke();c.restore();}}
    if(o.clamp&&D.magnets){const[tx,ty]=o.clamp;for(const[mx,my]of D.magnets){const sx=x+(mx*Math.cos(ang)-my*Math.sin(ang))*s,sy=y+(mx*Math.sin(ang)+my*Math.cos(ang))*s;clampBeam(c,sx,sy,tx,ty,t);}}
    if(dmg>.6){c.save();c.scale(1,1);for(let i=0;i<5;i++){const k=(t*1.1+i*.2)%1;const d=(4+k*26)*s;const bx=x-Math.cos(ang)*d+Math.sin(t*3+i)*3,by=y-Math.sin(ang)*d;c.globalAlpha=(1-k)*.85;circ(c,bx,by-k*6,(3+k*8)*s/2.2);ink(c,'#7a7a82',1.6);}c.restore();
      if(Math.sin(t*13)>.5){const sx3=x+Math.cos(ang+1.2)*5*s,sy3=y+Math.sin(ang+1.2)*5*s;star(c,sx3,sy3,2.6*s/2.2,'#fff3b0');}}
  }


  /* =================================================================
     REBELS — lookOf(p) turns a rebel from the game's rebel system
     (G.people / Rebel.gen, see docs/REBELS_PLAN.md) into a character spec.
     Nothing is saved: the face comes from a hash of p.id, so a rebel looks
     the same forever, and everything else is read live from the rebel:
       genes      skin, hair, style, facial hair, build   (hash of id)
       role       outfit, weapon or none                   (p.role, heroOf)
       character  one tell for the 45 Character Traits     (p.charTrait)
       story      earned Rebel Traits                      (p.traits)
       body       lost or prosthetic arm, leg, eye          (p.body)
       medical    conditions healing at the base            (p.cond)
       rank       chevrons, officer beret                   (p.rank, p.off)
       specialty  one tell per specialty                    (p.spec)
       morale     the resting face                          (Rebel.mband)
       kit        weapon and belt items                     (p.gear)
     Authored crew (CAST) keep their designed genes; every layer still applies.
     ================================================================= */
  const ROLE_COATS={
    Soldier:[['#5a3b28','#3e2a1d'],['#4f5c48','#3a4535'],['#646a3a','#4a4f2a'],['#6a5a4a','#4e4236'],['#4a4e57','#373a41'],['#5a5a3a','#44442a']],
    Marine:[['#4a525e','#363c46'],['#3e4a4a','#2c3636'],['#4e4a56','#3a3640']],
    Pilot:[['#9a6b3a','#74502b'],['#7a5232','#5a3c24'],['#6a6a5a','#4e4e42']],
    Support:[['#c49a3a','#9a7628'],['#3a7a7a','#2a5a5a'],['#7a4a6a','#5a3650'],['#8a8a7a','#6a6a5a'],['#5a6a8a','#46526a']],
  };
  const HAIR_STYLES=[['buzz',3],['mop',2],['bob',2],['bald',1],['long',1.6],['tied',1.6]];
  /* one visual tell per Character Trait, only where a trait suggests one (most stay invisible) */
  const TRAIT_LOOK={
    hegsoldier:{x:['oldheg']},hegofficer:{x:['glasses'],idleFace:'flat'},mechanic:{goggles:1,gogCol:'#4a4a52',x:['toolbelt']},engineer:{x:['toolbelt','glasses']},
    medic:{x:['medicband']},doctor:{x:['medicband','glasses']},hunter:{hood:1},pilot:{goggles:1},smuggler:{x:['longcoat','bandana']},
    wealthy:{coat:['#6a2a3a','#4e1e2a'],x:['charm']},academic:{x:['glasses']},politician:{x:['longcoat'],idleFace:'grin'},industrialist:{x:['toolbelt']},
    streetwise:{x:['beanie']},criminal:{x:['beanie','tattoo']},intimidating:{big:1.07,idleFace:'flat'},strong:{big:1.08},weak:{big:.93},
    clumsy:{x:['plaster']},lucky:{x:['charm']},reckless:{x:['bandana']},hothead:{idleFace:'aim'},cautious:{gear:['hardhat']},
    nervous:{idleFace:'worried'},cowardly:{idleFace:'worried'},brave:{idleFace:'walk'},charismatic:{idleFace:'grin'},cynical:{idleFace:'flat'},
    perfectionist:{idleFace:'flat'},restless:{idleFace:'walk'},messy:{x:['soot']},
  };
  /* earned Rebel Traits that leave a mark */
  const RTRAIT_LOOK={veteran:{grey:.35},decorated:{x:['medal']},scarred:{x:['scar']},grieving:{x:['mourn'],idleFace:'worried'},hardened:{x:['stubble']},battlehard:{x:['stubble']},
    desens:{idleFace:'flat'},broken:{idleFace:'worried'},panicky:{idleFace:'worried'},hero:{x:['starpin']},celebrity:{x:['starpin']},symbol:{x:['starpin']},name:{x:['starpin']},
    nearlydead:{x:['scar']},limp:{x:['crutch']},avenging:{idleFace:'aim'},vengeful:{idleFace:'aim'}};
  const SPEC_LOOK={commando:{x:['facepaint']},marksman:{hood:1},medic:{x:['medicband']},fieldtech:{x:['headset']},demolitions:{x:['bandolier']},gunner:{x:['bandolier']},commander:{x:['beret']},driver:{goggles:1},
    leader:{x:['beret']},flighteng:{x:['headset']}};
  const MORALE_FACE={vlow:'worried',low:'flat',vhigh:'grin'};
  function lookOf(p,o){
    o=o||{};const id=String(p.id||p.name||'rebel');const r=mkRng(hashStr(id));const pick=a=>a[Math.floor(r()*a.length)];
    const wpick=list=>{let x=r()*list.reduce((a,b)=>a+b[1],0);for(const[k,w]of list){x-=w;if(x<0)return k;}return list[0][0];};
    const role=p.role==='Hero'?(p.heroOf||'Soldier'):(p.role||'Soldier');
    const base=CAST[p.id];
    const coat=pick(ROLE_COATS[role]||ROLE_COATS.Soldier);
    const S=Object.assign({side:'reb',acc:C.rebel,pants:pick(['#33343c','#3a3328','#2f3038','#3b3430'])},
      base?{}:{skin:pick(SKIN),hair:pick(HAIRC),hs:wpick(HAIR_STYLES),beard:r()<.15?1:0,tache:r()<.08?1:0,coat:coat[0],coat2:coat[1],cap:pick(['#7a5532','#5a6a3c','#6a4a3a'])},
      base||{},{name:p.name||id,x:[],gear:[]});
    const add=L=>{if(!L)return;if(L.x)S.x.push(...L.x);if(L.gear)S.gear.push(...L.gear);for(const k of['hood','goggles','gogCol','big','idleFace','grey'])if(L[k]!==undefined&&S[k]===undefined)S[k]=L[k]===1&&k==='hood'?S.coat:L[k];if(L.coat&&!base){S.coat=L.coat[0];S.coat2=L.coat[1];}};
    if(!base&&r()<.15)S.x.push('stubble');
    // role
    if(role==='Pilot'&&!base){if(r()<.55)S.hs='cap';else S.goggles=1;}
    if(role==='Marine')S.gear.push('vest');
    // armour: the Frontier Hardhat is the rebel Soldier default (doc), until an armour slot says otherwise
    const g0=p.gear||{};const head=g0.head!==undefined?g0.head:(role==='Soldier'||role==='Marine'?'hardhat':null);if(head)S.gear.push(head);
    if(g0.body)S.gear.push(g0.body);
    if(p.role==='Hero')S.x.push('cape','starpin');
    // character trait, earned traits, specialty
    add(TRAIT_LOOK[p.charTrait]);
    for(const t of p.traits||[])add(RTRAIT_LOOK[t.k||t]);
    add(SPEC_LOOK[p.spec]);
    // body
    const b=p.body||{};if(b.arm===1)S.x.push('noarm');if(b.arm===2)S.x.push('metalarm');if(b.leg===1)S.x.push('peg','crutch');if(b.leg===2)S.x.push('metalleg');if(b.eye===1)S.x.push('patch');if(b.eye===2)S.x.push('cybereye');
    // medical conditions healing at the base
    for(const c0 of p.cond||[])for(const e of COND_LOOK[c0.k||c0]||[])S.x.push(e);
    // rank
    if(p.off)S.off=1;else if(p.rank)S.chev=Math.min(3,Math.ceil(p.rank/2));
    if(p.off&&!S.x.includes('beret')&&S.hs!=='cap'&&!S.gear.includes('helmet')&&!S.x.includes('oldheg'))S.x.push('beret');
    // morale sets the resting face (extremes override the trait's)
    const band=o.band||(window.Rebel&&Rebel.mband?Rebel.mband(p).k:(p.morale<=20?'vlow':p.morale<=40?'low':p.morale>80?'vhigh':'mid'));
    if(MORALE_FACE[band]&&(band!=='vhigh'||!S.idleFace))S.idleFace=MORALE_FACE[band];
    // grey with age and service
    if(S.grey&&S.hair){const a=hex2rgb(S.hair),g=S.grey;S.hair=rgb2hex(a[0]+(150-a[0])*g,a[1]+(150-a[1])*g,a[2]+(150-a[2])*g);}
    // kit: weapon from the gear slots (Support carries none), belt items from gadgets
    const g=p.gear||{};const isShield=k=>k==='riotshield';
    if(isShield(g.primary)||isShield(g.secondary))S.gear.push('shield');
    const wp=[g.primary,g.secondary].find(k=>k&&!isShield(k));
    S.weapon=role==='Support'&&p.role!=='Hero'?null:(o.weapon!==undefined?o.weapon:(wp||(p.wpns&&p.wpns[0])||null));
    if(S.weapon==='unarmed'||S.weapon==='fists')S.weapon=null;
    const gad=(g.gad||[]).filter(Boolean);const GAD={blam:'frags',stim:'stim',medpack:'medpack',c90:'charge',autocore:'charge',molotov:'molotov',angel:'angel'};for(const k of gad){const m=GAD[k]||(/stim/.test(k)?'stim':null);if(m)S.gear.push(m);}
    S.x=[...new Set(S.x)];S.gear=[...new Set(S.gear)];
    S.role=p.role;return S;
  }

  /* ---------- portrait: head and shoulders in a circle, for crew lists and dialogue ---------- */
  function portrait(c,x,y,r,who,o){o=o||{};c.save();circ(c,x,y,r);c.fillStyle=o.bg||'#2a1d14';c.fill();c.clip();
    const s=r/17;character(c,x,y+r*.12+33*s,who,{view:'front',state:o.state||'idle',face:o.face,t:o.t||0,s,weapon:null});c.restore();
    circ(c,x,y,r);c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();}
  /* =================================================================
     ITEMS — standalone item art for the Armoury tab, loot and pickups.
     Rev Level 1 set from "Gadgets, Gear and Gunships". item(c,key,x,y,size,t)
     draws the item centred and fitted into a size x size box.
     ================================================================= */
  const ITEMS={};
  for(const k in WEAPONS){const w=WEAPONS[k];ITEMS[k]={name:w.name,short:w.short||w.name,cat:'weapon',kind:w.kind,maker:w.maker,makerProposed:w.makerProposed,origin:w.origin,tier:w.tier,box:w.box,draw:w.draw};}
  Object.assign(ITEMS,{
    riotshield:{short:'Riot Shield',name:'Riot Shield',cat:'weapon',kind:'Off hand, takes a weapon slot',maker:'patriot',makerProposed:1,tier:1,box:[-10,-16,10,16],draw(c){rr(c,-9,-15,18,30,6);c.fillStyle=rgba('#cfe0ff',.6);c.fill();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();rr(c,-6,-12,12,24,4);c.lineWidth=1.4;c.strokeStyle=rgba('#ffffff',.6);c.stroke();c.fillStyle=W.hegNavy;c.fillRect(-6,-3,12,3);}},
    hardhat:{short:'Frontier Hardhat',name:'Frontier Hardhat',cat:'armour',kind:'Helmet (rebel Soldier default)',maker:null,tier:1,box:[-20,-22,20,2],draw(c){helmet(c,0,0,14.5,'front',0);}},
    policevest:{short:'Police Vest',name:'Police Vest',cat:'armour',kind:'Vest (security forces)',maker:'patriot',makerProposed:1,tier:1,box:[-10,-23,10,-9],draw(c){policeVest(c,'front');}},
    medpack:{short:'Medpack',name:'Medpack',cat:'gadget',kind:'Treats criticals and the downed; consumed',maker:null,tier:1,box:[-9,-6,9,6],draw(c){rr(c,-8,-5,16,10,2.4);ink(c,'#f1ede4',2.2);c.fillStyle=C.rebel;c.fillRect(-1.3,-3.6,2.6,7.2);c.fillRect(-3.6,-1.3,7.2,2.6);rr(c,-3,-7,6,2.6,1);ink(c,'#9aa0aa',1.4);}},
    stim:{short:'Stim',name:'Stim',cat:'gadget',kind:'Heals; consumed',maker:null,tier:1,box:[-3,-10,3,9],draw(c){stimItem(c);}},
    blam:{short:'BLAM Frag',name:'BLAM Frag Grenade',cat:'gadget',kind:'Anti-personnel frag',maker:'blamco',tier:1,box:[-6,-9,7,6],draw(c){circ(c,0,0,5);ink(c,W.frag,2);c.fillStyle='#e0402e';c.fillRect(-4.6,-1.2,9.2,2.4);c.fillStyle=C.gold;c.fillRect(-1.2,-7.6,2.4,2.8);c.beginPath();c.arc(3,-7,2,0,TAU);c.lineWidth=1.2;c.strokeStyle=C.gold;c.stroke();}},
    c90:{short:'BLAM C90',name:'BLAM C90 Explosive Charge',cat:'gadget',kind:'Demolition charge',maker:'blamco',tier:1,box:[-8,-9,8,5],draw(c,t){c4Item(c,t||CUR_T);}},
    autocore:{short:'Auto Core Charge',name:'Auto Core Improvised Charge',cat:'gadget',kind:'Crafted charge',maker:null,origin:'crafted',tier:1,box:[-8,-12,11,7],draw(c,t){autocoreItem(c,t||CUR_T);}},
    molotov:{short:'Molotov',name:'Molotov Cocktail',cat:'gadget',kind:'Sets an area alight',maker:null,origin:'crafted',tier:1,box:[-4,-15,5,6],draw(c,t){molotovProp(c,0,0,0,t||CUR_T);}},
    angel:{short:'Angel Drone',name:'Guardian Angel Drone',cat:'gadget',kind:'Intercepts one shot',maker:null,origin:'crafted',tier:1,box:[-12,-10,12,11],draw(c,t){angelDrone(c,0,0,1,t||CUR_T);}},
  });
  function item(c,key,x,y,size,t,o){const it=ITEMS[key];if(!it)return;CUR_T=t||CUR_T;const[x0,y0,x1,y1]=it.box;const k=o&&o.scale?o.scale:size/Math.max(x1-x0,y1-y0);c.save();c.translate(x-(x0+x1)/2*k,y-(y0+y1)/2*k);c.scale(k,k);it.draw(c,t||CUR_T);c.restore();}


  /* =================================================================
     VEHICLES — floating ground vehicles. The footprint is drawn in the
     floor plane at any heading and extruded upward, so the faces toward
     the camera show, like the walls' front faces. Everything hovers:
     a shadow on the ground, glowing lift pads underneath.
     vehicle(c, id, x, y, heading, s, t, {livery, loadout:{attach:[]},
             damage, siren, turretUp 0..1, turretAng, gunner, aim})
     ================================================================= */
  function clampBeam(c,x0,y0,x1,y1,t){const d=Math.hypot(x1-x0,y1-y0),a=Math.atan2(y1-y0,x1-x0);c.save();c.translate(x0,y0);c.rotate(a);
    for(let j=0;j<3;j++){c.beginPath();for(let i=0;i<=24;i++){const u=i/24,w=Math.sin(u*Math.PI)*(6+j*3)*Math.sin(t*6+j*2+u*8);i?c.lineTo(u*d,w):c.moveTo(0,w);}c.lineWidth=j?1.2:2;c.strokeStyle=rgba(C.hegHi,j?.5:.85);c.shadowColor=C.heg;c.shadowBlur=6;c.stroke();}
    c.shadowBlur=0;for(let i=0;i<3;i++){const k=(t*1.5+i/3)%1;c.beginPath();c.ellipse(d,0,4+k*10,(4+k*10)*.5,0,0,TAU);c.lineWidth=1.4;c.strokeStyle=rgba(C.hegHi,1-k);c.stroke();}c.restore();}
  function extrude(c,pts,x,y,ang,s,lift,h,top,side,lw,glassSide){
    const ca=Math.cos(ang),sa=Math.sin(ang),P=pts.map(([a,b])=>[x+(a*ca-b*sa)*s,y+(a*sa+b*ca)*s]);
    const B=P.map(([px,py])=>[px,py-lift]),T=P.map(([px,py])=>[px,py-lift-h*s]);
    const cx=P.reduce((a,p)=>a+p[0],0)/P.length,cy=P.reduce((a,p)=>a+p[1],0)/P.length;
    const edges=[];for(let i=0;i<P.length;i++){const j=(i+1)%P.length;let nx=P[j][1]-P[i][1],ny=-(P[j][0]-P[i][0]);const mx=(P[i][0]+P[j][0])/2-cx,my=(P[i][1]+P[j][1])/2-cy;if(nx*mx+ny*my<0){nx=-nx;ny=-ny;}const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;if(ny>0.02)edges.push({i,j,nx,ny,my:(P[i][1]+P[j][1])/2});}
    edges.sort((a,b)=>a.my-b.my).forEach(e=>{poly(c,[B[e.i],B[e.j],T[e.j],T[e.i]]);c.fillStyle=glassSide?shade(glassSide,-.05-e.nx*.15):shade(side,-.08-e.nx*.18);c.fill();c.lineWidth=lw;c.strokeStyle=C.ink;c.lineJoin='round';c.stroke();
      if(glassSide){c.save();poly(c,[B[e.i],B[e.j],T[e.j],T[e.i]]);c.clip();c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=1.6;c.beginPath();const mx=(T[e.i][0]+T[e.j][0])/2,my=(T[e.i][1]+T[e.j][1])/2;c.moveTo(mx-6,my+2);c.lineTo(mx-2,my+h*s);c.stroke();c.restore();}});
    poly(c,T);c.fillStyle=top;c.fill();c.lineWidth=lw;c.strokeStyle=C.ink;c.stroke();
    return {topY:y-lift-h*s};
  }
  function inTop(c,x,y,ang,s,fn){c.save();c.translate(x,y);c.rotate(ang);c.scale(s,s);fn();c.restore();}
  function hoverBase(c,pts,x,y,ang,s,pads,glow,t,lift){
    const ca=Math.cos(ang),sa=Math.sin(ang);c.save();c.globalAlpha=.4;poly(c,pts.map(([a,b])=>[x+(a*ca-b*sa)*s*1.02+3,y+(a*sa+b*ca)*s*1.02+3]));c.fillStyle='#000';c.fill();c.restore();
    for(const[a,b]of pads){const px=x+(a*ca-b*sa)*s,py=y+(a*sa+b*ca)*s;const k=.6+.4*Math.sin(t*9+a);const g=c.createRadialGradient(px,py,0,px,py,9*s);g.addColorStop(0,rgba(glow,.55*k));g.addColorStop(1,rgba(glow,0));c.fillStyle=g;c.fillRect(px-9*s,py-9*s,18*s,18*s);
      c.fillStyle=rgba(glow,.35*k);c.fillRect(px-1.2*s,py-lift,2.4*s,lift);}
  }
  const VEHICLES={
    police:{name:'Police Cruiser',role:'Floating police car; day-to-day security',game:'Police Cruiser',maker:null,
      liveries:{heg:{label:'Security',body:W.hegWhite,trim:W.hegNavy,glass:'#1a2240',glow:C.hegHi}},
      draw(c,x,y,a,s,t,o,lv){const lift=8*s+Math.sin(t*2.4)*1.2*s;
        const body=[[32,-9],[34,0],[32,9],[24,13],[-26,13],[-32,8],[-32,-8],[-26,-13],[24,-13]];
        hoverBase(c,body,x,y,a,s,[[22,-13],[22,13],[-22,-13],[-22,13]],lv.glow,t,lift);
        const b=extrude(c,body,x,y,a,s,lift,10,lv.body,lv.body,LW.char);
        inTop(c,x,b.topY,a,s,()=>{c.fillStyle=lv.trim;c.fillRect(-26,-13,52,2.6);c.fillRect(-26,10.4,52,2.6);c.fillStyle=rgba(C.ink,.35);c.fillRect(30,-6,1.4,12);
          c.save();c.translate(26,0);c.rotate(Math.PI/2);c.font='900 4px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=lv.trim;c.fillText('PATROL',0,0);c.restore();});
        const cab=[[12,-10],[16,0],[12,10],[-14,10],[-18,6],[-18,-6],[-14,-10]];
        const k2=extrude(c,cab,x,b.topY,a,s,0,7,lv.body,lv.body,LW.char,lv.glass);
        inTop(c,x,k2.topY,a,s,()=>{rr(c,-5,-7,6,14,1.5);ink(c,'#20283c',1.2);const on=o.siren!==false&&Math.sin(t*12)>0;rr(c,-4.5,-6.6,5,6,1);c.fillStyle=on?'#fff':C.heg;c.shadowColor=c.fillStyle;c.shadowBlur=on?10:4;c.fill();rr(c,-4.5,.6,5,6,1);c.fillStyle=on?C.heg:'#fff';c.shadowColor=c.fillStyle;c.fill();c.shadowBlur=0;
          c.beginPath();for(let i=0;i<6;i++){const q=i*Math.PI/3;c.lineTo(-12+Math.cos(q)*2.6,Math.sin(q)*2.6);}c.closePath();c.fillStyle=W.hegNavy;c.fill();});
        if(o.siren!==false){const on=Math.sin(t*12)>0;const ca=Math.cos(a),sa=Math.sin(a);const lx=x+(-2*ca)*s,ly=k2.topY+(-2*sa)*s;const g=c.createRadialGradient(lx,ly,0,lx,ly,40*s);g.addColorStop(0,rgba(on?'#ffffff':C.heg,.25));g.addColorStop(1,rgba(C.heg,0));c.fillStyle=g;c.fillRect(lx-40*s,ly-40*s,80*s,80*s);}
      }},
    riottransport:{name:'Riot Transport Cruiser',role:'Floating truck; carries riot forces into danger zones',game:'Riot Transport Cruiser',maker:null,
      liveries:{heg:{label:'Security',body:'#3a4a7a',trim:W.hegWhite,glass:'#141a30',glow:C.hegHi}},
      draw(c,x,y,a,s,t,o,lv){riotTruck(c,x,y,a,s,t,o,lv,false);}},
    riotdispersal:{name:'Riot Dispersal Cruiser',role:'Floating truck with a pop-up turret',game:'Riot Dispersal Cruiser',maker:null,
      liveries:{heg:{label:'Security',body:'#3a4a7a',trim:W.hegWhite,glass:'#141a30',glow:C.hegHi}},
      draw(c,x,y,a,s,t,o,lv){riotTruck(c,x,y,a,s,t,o,lv,true);}},
    truck:{name:'Frontier Floatin’ Truck',role:'Practical hauler; easy to turn into a fighting vehicle',game:'(not in game yet)',maker:'mendon',makerProposed:1,
      mounts:{bed:[-18,0],nose:[36,0],roof:[6,0]},
      liveries:{civ:{label:'Stock',body:'#6a8aa8',trim:'#d8d0b8',glass:'#2a3a4a',glow:'#ffb347',rust:1},rebel:{label:'Rebel technical',body:'#8a7a5a',trim:C.rebel,glass:'#2a2a30',glow:'#ffb347',rust:1,patch:1}},
      draw(c,x,y,a,s,t,o,lv){const lift=7*s+Math.sin(t*2)*1*s;const att=new Set((o.loadout&&o.loadout.attach)||lv.attach||[]);
        const body=[[34,-12],[36,0],[34,12],[-34,12],[-36,9],[-36,-9],[-34,-12]];
        hoverBase(c,body,x,y,a,s,[[24,-12],[24,12],[-26,-12],[-26,12]],lv.glow,t,lift);
        if(att.has('ram'))extrude(c,[[36,-13],[44,-8],[44,8],[36,13],[34,13],[34,-13]],x,y,a,s,lift-2*s,7,'#5a5a62','#5a5a62',LW.char);
        const b=extrude(c,body,x,y,a,s,lift,9,lv.body,lv.body,LW.char);
        inTop(c,x,b.topY,a,s,()=>{rr(c,-34,-10,30,20,2);ink(c,'#3a3630',1.6);c.strokeStyle=rgba(C.ink,.4);c.lineWidth=1;for(let i=1;i<4;i++){c.beginPath();c.moveTo(-34+i*7.5,-10);c.lineTo(-34+i*7.5,10);c.stroke();}
          c.fillStyle=rgba(C.ink,.3);for(let i=0;i<4;i++)c.fillRect(26,-8+i*4.4,7,1.6);
          if(lv.rust){c.fillStyle='rgba(140,70,30,.45)';ell(c,20,8,3,1.6);c.fill();ell(c,-30,-11,2.6,1.2);c.fill();ell(c,12,-10,2,1.2);c.fill();}
          if(lv.patch){rr(c,16,-11,7,6,.6);ink(c,'#9a9a8a',.8);c.fillStyle=lv.trim;c.fillRect(-4,-12,3,24);c.save();c.translate(-34,-12);c.fillStyle='rgba(220,220,210,.9)';c.rotate(.5);c.fillRect(0,0,6,1.6);c.restore();}
          if(att.has('plates')){for(const sy of[-1,1]){rr(c,-32,sy>0?9:-12.6,46,3.6,.8);ink(c,'#7a7e86',1);c.fillStyle=rgba(C.ink,.5);for(let i=0;i<5;i++){circ(c,-30+i*10,sy*10.8,.5);c.fill();}}}
          if(att.has('crates')){rr(c,-32,-8,10,8,1);ink(c,W.crate,1.2);rr(c,-20,1,9,7,1);ink(c,W.crate,1.2);}});
        const cab=[[16,-11],[18,0],[16,11],[-4,11],[-4,-11]];
        const k2=extrude(c,cab,x,b.topY,a,s,0,9,lv.body,lv.body,LW.char,lv.glass);
        inTop(c,x,k2.topY,a,s,()=>{c.fillStyle=rgba('#ffffff',.18);c.fillRect(-2,-9,14,3);if(att.has('spotlight')){rr(c,6,-3,6,6,2);ink(c,'#3b3a44',1.2);circ(c,12,0,2);c.fillStyle='#fff3c8';c.shadowColor='#fff3c8';c.shadowBlur=8;c.fill();c.shadowBlur=0;}});
        if(att.has('mg')){const[bx,by]=VEHICLES.truck.mounts.bed;const ca=Math.cos(a),sa=Math.sin(a);const px=x+(bx*ca-by*sa)*s,py=b.topY+(bx*sa+by*ca)*s;
          if(o.gunner)character(c,px-3*s,py+4*s,o.gunner,{view:'front',state:'man',t,s:s*.85,slung:true});
          const ga=o.aim!=null?o.aim:a;c.save();c.translate(px,py-14*s);circ(c,0,0,3*s);ink(c,W.gunDark,LW.held);c.rotate(ga);rr(c,0,-1.6*s,16*s,3.2*s,1.4*s);ink(c,W.gunDeep,LW.held);rr(c,2*s,-4*s,6*s,8*s,1.5*s);ink(c,'#4a4a52',LW.held);if(o.fire&&Math.sin(t*16)>0)muzzle(c,16*s,'ballistic');c.restore();}
      }},
  };
  function riotTruck(c,x,y,a,s,t,o,lv,turret){
    const lift=8*s+Math.sin(t*1.8)*1*s;
    const body=[[44,-15],[47,-10],[47,10],[44,15],[-44,15],[-47,12],[-47,-12],[-44,-15]];
    hoverBase(c,body,x,y,a,s,[[34,-15],[34,15],[-34,-15],[-34,15],[0,-15],[0,15]],lv.glow,t,lift);
    const b=extrude(c,body,x,y,a,s,lift,7,lv.body,lv.body,LW.char);
    const cab=[[45,-14],[47,0],[45,14],[26,14],[26,-14]];
    const k1=extrude(c,cab,x,b.topY,a,s,0,11,lv.body,lv.body,LW.char,lv.glass);
    inTop(c,x,k1.topY,a,s,()=>{const on=Math.sin(t*10)>0;for(const sy of[-1,1]){rr(c,32,sy*8-1.6,4,3.2,1);c.fillStyle=(on?sy>0:sy<0)?'#fff':C.heg;c.shadowColor=c.fillStyle;c.shadowBlur=6;c.fill();c.shadowBlur=0;}});
    const box=[[23,-15],[23,15],[-47,15],[-47,-15]];
    const k2=extrude(c,box,x,b.topY,a,s,0,17,shade(lv.body,.05),lv.body,LW.char);
    inTop(c,x,k2.topY,a,s,()=>{c.strokeStyle=rgba(C.ink,.35);c.lineWidth=1;for(let i=1;i<5;i++){c.beginPath();c.moveTo(23-i*14,-15);c.lineTo(23-i*14,15);c.stroke();}
      c.fillStyle=lv.trim;c.fillRect(-45,-14,66,2.2);c.fillRect(-45,11.8,66,2.2);
      c.save();c.translate(-34,0);c.rotate(Math.PI/2);c.font='900 5px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=lv.trim;c.fillText(turret?'DISPERSAL':'SECURITY',0,0);c.restore();
      c.beginPath();for(let i=0;i<6;i++){const q=i*Math.PI/3;c.lineTo(10+Math.cos(q)*4,Math.sin(q)*4);}c.closePath();c.fillStyle=W.hegNavy;c.fill();c.lineWidth=.8;c.strokeStyle=C.hegHi;c.stroke();
      if(!turret){rr(c,-20,-7,12,14,2);ink(c,shade(lv.body,-.1),1.2);}});
    if(turret){const k=Math.max(0,Math.min(1,o.turretUp||0));const ca=Math.cos(a),sa=Math.sin(a);const tx=x+(-14*ca)*s,ty=k2.topY+(-14*sa)*s;
      inTop(c,tx,ty,a,s,()=>{rr(c,-9,-9,18,18,2);ink(c,'#1a2240',1.4);const o2=k*9;rr(c,-9-o2,-9,9,18,1.5);ink(c,shade(lv.body,-.1),1.2);rr(c,0+o2,-9,9,18,1.5);ink(c,shade(lv.body,-.1),1.2);});
      if(k>.15){const rise=16*k*s;const tb=[[6,-6],[6,6],[-6,6],[-6,-6]];const r=extrude(c,tb,tx,ty,a,s,0,16*k,'#4a5a8a','#4a5a8a',LW.char);
        const ga=o.turretAng!=null?o.turretAng:a;c.save();c.translate(tx,r.topY);circ(c,0,0,7*s);ink(c,'#5a6a9a',LW.char);c.rotate(ga);for(const sy of[-2.4,2.4]){rr(c,4*s,(sy-1.4)*s,18*s,2.8*s,1.2*s);ink(c,'#26305a',LW.held);}
        c.fillStyle=C.hegHi;c.shadowColor=C.heg;c.shadowBlur=6;c.fillRect(-2*s,-1*s,5*s,2*s);c.shadowBlur=0;if(o.fire&&Math.sin(t*14)>0){c.fillStyle='rgba(200,230,255,.6)';for(let i=0;i<4;i++){circ(c,(26+i*8)*s,(Math.sin(t*20+i)*3)*s,(3+i*1.6)*s);c.fill();}}c.restore();}}
  }
  function vehicle(c,id,x,y,ang,s,t,o){const V=VEHICLES[id];if(!V)return;o=o||{};const lv=V.liveries[o.livery]||Object.values(V.liveries)[0];CUR_T=t;V.draw(c,x,y,ang,s,t,o,lv);
    const dmg=o.damage||0;if(dmg>.5){for(let i=0;i<4;i++){const k=(t*1.1+i*.25)%1;c.save();c.globalAlpha=(1-k)*.8;circ(c,x+Math.sin(t*2+i)*6*s,y-30*s-k*40*s,(4+k*10)*s);ink(c,'#6a6a72',1.6);c.restore();}if(Math.sin(t*13)>.5)star(c,x+8*s,y-26*s,4*s,'#fff3b0');}}

  /* =================================================================
     STRIDER Mk I — Autoworks' friendly neighbourhood enforcement strider.
     Crab legs, two autocannon pods, and a face screen: friendly for
     citizens, angry for dissenters, rebel red once it's been hacked.
     strider(c, x, y, {view, dir, state:'idle'|'walk'|'aim'|'fire'|'down',
             mood:'friendly'|'angry'|'hacked', damage, t, s})
     ================================================================= */
  function striderFace(c,mood,state,t,w,h,dmg){
    const bg=mood==='hacked'?'#3a0a10':mood==='angry'?'#0a1440':'#0c2a3a',fg=mood==='hacked'?'#ff6a5a':mood==='angry'?'#e8f0ff':'#7ff0ff';
    rr(c,-w/2,-h/2,w,h,4);c.fillStyle=bg;c.fill();c.save();rr(c,-w/2,-h/2,w,h,4);c.clip();
    for(let yy=-h/2;yy<h/2;yy+=2){c.fillStyle='rgba(255,255,255,.04)';c.fillRect(-w/2,yy,w,1);}
    c.fillStyle=fg;c.strokeStyle=fg;c.shadowColor=fg;c.shadowBlur=6;c.lineCap='round';c.lineWidth=2.4;
    if(state==='down'){c.font=`900 ${h*.42}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ff6a6a';c.fillText('ERR',0,0);}
    else if(mood==='angry'){for(const sx of[-1,1]){c.beginPath();c.moveTo(sx*w*.36,-h*.26);c.lineTo(sx*w*.1,-h*.08);c.stroke();rr(c,sx*w*.24-w*.07,-h*.08,w*.14,h*.12,2);c.fill();}
      c.beginPath();for(let i=0;i<=6;i++){const xx=-w*.26+i*w*.52/6;c.lineTo(xx,h*.22+((i%2)?-h*.08:0));}c.stroke();}
    else if(mood==='hacked'){for(const sx of[-1,1]){c.beginPath();c.arc(sx*w*.2,-h*.06,h*.1,Math.PI,0);c.stroke();}c.beginPath();c.arc(0,h*.06,w*.2,.15*Math.PI,.85*Math.PI);c.stroke();
      c.fillRect(w*.3,-h*.36,1.6,h*.3);poly(c,[[w*.3+1.6,-h*.36],[w*.44,-h*.3],[w*.3+1.6,-h*.22]]);c.fill();}
    else{const bl=(t%4)>3.85;for(const sx of[-1,1]){if(bl)c.fillRect(sx*w*.2-w*.08,-h*.06,w*.16,2);else{circ(c,sx*w*.2,-h*.06,h*.13);c.fill();}}c.beginPath();c.arc(0,h*.02,w*.22,.15*Math.PI,.85*Math.PI);c.stroke();}
    c.shadowBlur=0;
    if(dmg>.4){c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1;c.beginPath();c.moveTo(w*.1,-h/2);c.lineTo(w*.02,-h*.1);c.lineTo(w*.2,h*.1);c.moveTo(w*.02,-h*.1);c.lineTo(-w*.15,h*.05);c.stroke();}
    c.restore();rr(c,-w/2,-h/2,w,h,4);c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();
  }
  function strider(c,x,y,o){o=Object.assign({view:'front',dir:1,state:'idle',mood:'friendly',t:0,s:1,damage:0},o);const{t,s,view}=o;const flip=view==='side'&&o.dir<0;const st=o.state;
    const body=o.mood==='hacked'?'#d5dbea':W.hegWhite,plate=o.mood==='hacked'?'#5a5a62':W.hegNavy;
    c.save();c.translate(x,y);c.scale(s,s);if(flip)c.scale(-1,1);
    const walk=st==='walk'?1:0,bob=st==='down'?12:Math.sin(t*6)*1.6*walk;
    ell(c,0,0,64,13);c.fillStyle='rgba(0,0,0,.35)';c.fill();
    const hy=-58+bob,HW=96,HH=66;              // the big head: a rounded pod that is mostly face screen
    const lift=ph=>walk?Math.max(0,Math.sin(t*6+ph))*6:0;
    // short crab legs tucked under the head
    const leg=(hx,hy0,kx,ky,fx,fy,col)=>{c.lineJoin='round';c.lineCap='round';c.beginPath();c.moveTo(hx,hy0);c.lineTo(kx,ky);c.lineTo(fx,fy);c.lineWidth=12;c.strokeStyle=C.ink;c.stroke();c.lineWidth=7.4;c.strokeStyle=col;c.stroke();
      circ(c,kx,ky,5.4);ink(c,shade(col,-.15),2.2);poly(c,[[fx-4,fy-8],[fx+4,fy-8],[fx,fy+1]]);ink(c,W.gunDark,2.2);};
    const claw=sx=>{rr(c,sx*34-10,hy+HH/2-8,20,20,7);ink(c,'#4a5068',LW.prop);for(const dx of[-4,4]){circ(c,sx*34+dx,hy+HH/2+8,3.6);ink(c,W.gunDeep,2);circ(c,sx*34+dx,hy+HH/2+8,1.4);c.fillStyle=C.ink;c.fill();}
      if(st==='fire'&&Math.sin(t*14+sx)>0){const g=c.createRadialGradient(sx*34,hy+HH/2+10,0,sx*34,hy+HH/2+10,15);g.addColorStop(0,'#fff6c0');g.addColorStop(1,'rgba(255,180,70,0)');c.fillStyle=g;c.fillRect(sx*34-15,hy+HH/2-5,30,30);}};
    const legY=hy+HH/2-6;
    if(view==='side'){
      leg(-18,legY,-38,legY+4,-44,-lift(0),shade(plate,-.25));leg(16,legY,34,legY+4,40,-lift(2),shade(plate,-.25));
      rr(c,-HW/2+6,hy-HH/2,HW-12,HH,22);ink(c,body,LW.prop);c.fillStyle=plate;c.fillRect(-HW/2+8,hy+HH/2-14,HW-16,6);
      rr(c,HW/2-20,hy-HH/2+10,14,HH-24,5);ink(c,'#20283c',2.2);c.save();c.translate(HW/2-13,hy-2);c.scale(.34,1);striderFace(c,o.mood,st,t,36,HH-28,o.damage);c.restore();
      rr(c,8,hy+HH/2-12,26,14,6);ink(c,'#4a5068',LW.prop);rr(c,30,hy+HH/2-10,18,3.6,1.6);ink(c,W.gunDeep,2);rr(c,30,hy+HH/2-4,18,3.6,1.6);ink(c,W.gunDeep,2);
      if(st==='fire'&&Math.sin(t*14)>0){c.save();c.translate(48,hy+HH/2-6);muzzle(c,0,'ballistic');c.restore();}
      leg(-22,legY+2,-30,legY+8,-32,-lift(1),plate);leg(20,legY+2,26,legY+8,28,-lift(3),plate);
    }else{
      const back=view==='back';
      leg(-22,legY,-46,legY+2,-50,2-lift(2),shade(plate,-.25));leg(22,legY,46,legY+2,50,2-lift(0),shade(plate,-.25));
      rr(c,-HW/2,hy-HH/2,HW,HH,24);ink(c,body,LW.prop);c.fillStyle=plate;c.fillRect(-HW/2+4,hy+HH/2-14,HW-8,6);c.fillStyle=rgba(C.ink,.12);c.fillRect(HW/2-24,hy-HH/2+8,18,HH-16);
      if(!back){c.save();c.translate(0,hy-6);striderFace(c,o.mood,st,t,HW-28,HH-26,o.damage);c.restore();}
      else{c.fillStyle=rgba(C.ink,.3);for(let i=0;i<5;i++)c.fillRect(-22+i*10,hy-12,5,20);}
      leg(-34,legY+4,-58,legY+8,-62,-lift(1),plate);leg(34,legY+4,58,legY+8,62,-lift(3),plate);
      if(!back){claw(-1);claw(1);}
    }
    // top: siren bar, antenna (a red flag once it's ours)
    const ty=hy-HH/2;rr(c,-12,ty-6,24,8,3);ink(c,'#3b3a44',2);const on=Math.sin(t*10)>0&&o.mood!=='hacked'&&st!=='down';rr(c,-10,ty-5,9,6,2);c.fillStyle=on?'#fff':C.heg;c.fill();rr(c,1,ty-5,9,6,2);c.fillStyle=on?C.heg:'#fff';c.fill();
    c.beginPath();c.moveTo(-30,ty+6);c.lineTo(-36,ty-22);c.lineWidth=2;c.strokeStyle=C.ink;c.stroke();
    if(o.mood==='hacked'){const w=Math.sin(t*6)*2;poly(c,[[-36,ty-22],[-22+w,ty-19],[-36,ty-12]]);ink(c,C.rebel,1.6);}else{circ(c,-36,ty-23,2.6);c.fillStyle=C.heg;c.fill();}
    c.restore();
    if(o.damage>.5){for(let i=0;i<4;i++){const k=(t*1.1+i*.25)%1;c.save();c.globalAlpha=(1-k)*.8;circ(c,x+(14+Math.sin(t*2+i)*6)*s,y+(ty-6-k*40)*s,(4+k*10)*s);ink(c,'#6a6a72',1.6);c.restore();}}
  }

  /* ---------- base + galaxy helpers ---------- */
  const ISOC=.7071;
  function isoP(x,y,z,k,ox,oy){return[ox+(x-y)*ISOC*k,oy+(x+y)*ISOC*k*.5-z*k];}
  function isoBox(c,x,y,w,d,h,k,ox,oy,cols,lw){const P=(a,b,z)=>isoP(a,b,z,k,ox,oy);
    const top=[P(x,y,h),P(x+w,y,h),P(x+w,y+d,h),P(x,y+d,h)],left=[P(x,y+d,h),P(x+w,y+d,h),P(x+w,y+d,0),P(x,y+d,0)],right=[P(x+w,y,h),P(x+w,y+d,h),P(x+w,y+d,0),P(x+w,y,0)];
    poly(c,left);ink(c,cols[1],lw);poly(c,right);ink(c,cols[2],lw);poly(c,top);ink(c,cols[0],lw);}
  function emote(c,x,y,icon,t,i){c.save();c.translate(x,y+Math.sin(t*2+(i||0))*2);rr(c,-12,-11,24,20,7);ink(c,'#fffaf0',2.4);poly(c,[[-3,8],[3,8],[-4,14]]);ink(c,'#fffaf0',0);c.font='13px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(icon,0,0);c.restore();}
  /* surface texture, drawn inside the disc clip with shade(col,-.16); data-driven from WORLD_LOOK.tex */
  function planetTex(c,x,y,r,col,tex){
    const T=new Set(Array.isArray(tex)?tex:[tex]);const dk=shade(col,-.16);
    c.save();c.lineCap='round';
    if(T.has('bands')){c.fillStyle=dk;for(const k of[-.45,.02,.5])c.fillRect(x-r,y+r*k-r*.085,r*2,r*.17);}
    if(T.has('craters')){c.fillStyle=dk;for(const[u,v,q]of[[-.4,-.25,.16],[.3,-.45,.11],[.15,.3,.2],[-.25,.5,.1]]){circ(c,x+u*r,y+v*r,q*r);c.fill();}}
    if(T.has('dunes')){c.strokeStyle=dk;c.lineWidth=Math.max(1.2,r*.09);for(const k of[-.35,.05,.45]){c.beginPath();c.moveTo(x-r,y+k*r);c.quadraticCurveTo(x-r*.3,y+(k-.18)*r,x,y+k*r);c.quadraticCurveTo(x+r*.5,y+(k+.18)*r,x+r,y+k*r);c.stroke();}}
    if(T.has('cap')){ell(c,x,y-r*.82,r*.72,r*.34);c.fillStyle='rgba(255,255,255,.85)';c.fill();c.fillStyle=dk;c.fillRect(x-r,y+r*.2-r*.085,r*2,r*.17);}
    if(T.has('cracks')){c.strokeStyle=C.goldHi;c.lineWidth=Math.max(1,r*.07);for(const[u0,v0,u1,v1,u2,v2]of[[-.7,-.2,-.2,.1,.3,-.25],[-.3,.55,.15,.3,.7,.45]]){c.beginPath();c.moveTo(x+u0*r,y+v0*r);c.lineTo(x+u1*r,y+v1*r);c.lineTo(x+u2*r,y+v2*r);c.stroke();}}
    if(T.has('islands')){c.fillStyle='#4e8a4a';for(const[u,v,q]of[[-.35,-.15,.26],[.35,.2,.2],[-.05,.5,.15]]){ell(c,x+u*r,y+v*r,q*r,q*r*.6);c.fill();}}
    if(T.has('flats')){c.fillStyle='rgba(255,255,255,.7)';for(const[u,v,q]of[[-.25,-.1,.34],[.35,.35,.22]]){ell(c,x+u*r,y+v*r,q*r,q*r*.55);c.fill();}c.fillStyle=dk;c.fillRect(x-r,y-r*.55-r*.07,r*2,r*.14);}
    if(T.has('river')){c.strokeStyle='#6a4a2e';c.lineWidth=Math.max(1.4,r*.12);c.beginPath();c.moveTo(x-r,y-r*.25);c.quadraticCurveTo(x-r*.2,y+r*.15,x+r*.2,y-r*.05);c.quadraticCurveTo(x+r*.6,y-r*.2,x+r,y+r*.15);c.stroke();}
    if(T.has('grid')){c.strokeStyle=dk;c.lineWidth=Math.max(.8,r*.05);c.beginPath();for(const k of[-.5,0,.5]){c.moveTo(x+k*r,y-r);c.lineTo(x+k*r,y+r);c.moveTo(x-r,y+k*r);c.lineTo(x+r,y+k*r);}c.stroke();}
    c.restore();
  }
  function planet(c,x,y,r,col,o){o=o||{};ell(c,x+3,y+5,r,r);c.fillStyle=C.ink;c.fill();
    circ(c,x,y,r);c.fillStyle=col;c.fill();
    c.save();circ(c,x,y,r);c.clip();
    if(o.tex)planetTex(c,x,y,r,col,o.tex);
    c.beginPath();c.arc(x,y,r,0,TAU);c.arc(x-r*.20,y-r*.24,r*1.04,0,TAU);c.fillStyle=rgba(C.ink,.24);c.fill('evenodd');
    c.restore();
    circ(c,x,y,r);c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();
    if(o.ring){c.beginPath();c.ellipse(x,y,r*1.6,r*.4,-.3,Math.PI*.05,Math.PI*.95,true);c.lineWidth=3;c.strokeStyle=C.ink;c.stroke();c.lineWidth=1.6;c.strokeStyle=shade(col,.3);c.stroke();}
    if(o.heg){circ(c,x+r*.8,y-r*.8,7);ink(c,C.heg,2.4);circ(c,x+r*.8,y-r*.8,2.2);c.fillStyle=C.hegHi;c.fill();}
    if(o.home){c.lineWidth=3;c.strokeStyle=C.ink;c.beginPath();c.moveTo(x,y-r+2);c.lineTo(x,y-r-20);c.stroke();poly(c,[[x,y-r-20],[x+16,y-r-15],[x,y-r-10]]);ink(c,C.rebel,2.4);}}
  function route(c,x0,y0,x1,y1,o){o=o||{};const n=Math.max(2,Math.round(Math.hypot(x1-x0,y1-y0)/16));for(let i=1;i<n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;circ(c,x,y,3);ink(c,o.col||'#f1e6ff',1.6);}}

  return {C,W,BIOME,SKIN,HAIRC,LW,CAST,ARCH,WEAPONS,GEAR,POSES,PROPS,SHIPS,SHIP_FOR_GAME,WALL_H,
    character,portrait,spec,recruit,viewFor,lookOf,VEHICLES,vehicle,strider,clampBeam,ITEMS,item,MAKERS,SHIP_WEAPONS,GEAR_ALIAS,TRAIT_LOOK,RTRAIT_LOOK,SPEC_LOOK,COND_LOOK,ROLE_COATS,muzzle,prop,floor,trail,wall,lampLight,scorch,block,bolt,hit,explosion,smoke,ship,
    isoP,isoBox,emote,planet,route,star,
    util:{rgba,shade,mkRng,hashStr,rr,ell,circ,poly,ink,headShade}};
})();
