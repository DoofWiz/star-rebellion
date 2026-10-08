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
    riot:{name:'Riot shieldman',side:'foe',skin:'#c9a184',hair:'#3a2a20',hs:'buzz',coat:'#3a4a7a',coat2:'#2c3a62',acc:C.heg,pants:'#232c4e',weapon:'hg40',gear:['shield','policevest','policehelmet']},
    riotrifle:{name:'Riot rifleman',side:'foe',skin:'#d9a982',hair:'#2a2a2a',hs:'buzz',coat:'#3a4a7a',coat2:'#2c3a62',acc:C.heg,pants:'#232c4e',weapon:'carbine',gear:['policevest','policehelmet']},
    bot:{name:'Policebot',side:'foe',kind:'bot',coat:'#8a94a8',coat2:'#6a7488',acc:C.heg,pants:'#4a5266',weapon:'autohand'},
    sweettooth:{name:'Sweet Tooth',side:'neu',skin:'#b47c55',hair:'#1a120d',hs:'scarf',scarf:'#2ba8a0',coat:'#e05aa0',coat2:'#b2487e',acc:'#ffc83a',pants:'#3a3328',weapon:null,x:['patch','earring'],goldtooth:1,idleFace:'grin',big:1.08},
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
  let FACE_GOLD=false;
  const ease_ob=k=>{const n=7.5625,d=2.75;if(k<1/d)return n*k*k;if(k<2/d)return n*(k-=1.5/d)*k+.75;if(k<2.5/d)return n*(k-=2.25/d)*k+.9375;return n*(k-=2.625/d)*k+.984375;};
  function face(c,hx,hy,R,look,st,t,turn){
    const ox=turn*R*.32,ex=R*.42,ey=hy-R*.02;
    const blink=(st==='idle'||st==='walk'||st==='grin')&&(t%3.6)>3.45;
    const eyes=[[hx+ox-ex*(1-turn*.15),R*.36*(1-turn*.25)],[hx+ox+ex*(1+turn*.15),R*.36*(1+turn*.25)]];
    c.lineCap='round';
    if(st==='dizzy'){c.lineWidth=2;c.strokeStyle=C.ink;for(const[x]of eyes){ell(c,x,ey,R*.32,R*.36);c.fillStyle=W.eye;c.fill();c.stroke();c.beginPath();for(let a=0;a<TAU*2.2;a+=.3){const rr2=a/(TAU*2.2)*R*.26;c.lineTo(x+Math.cos(a+t*8)*rr2,ey+Math.sin(a+t*8)*rr2);}c.stroke();}
      c.beginPath();for(let k=0;k<=6;k++){const xx=hx+ox-R*.24+k*R*.08,yy=hy+R*.48+((k%2)?-1:1)*R*.05;k?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.lineWidth=2.2;c.stroke();return;}
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
    else if(st==='grin'){c.beginPath();c.moveTo(mx-R*.26,my-R*.1);c.lineTo(mx+R*.26,my-R*.1);c.arc(mx,my-R*.1,R*.26,0,Math.PI);c.closePath();c.fillStyle=W.mouth;c.fill();c.lineWidth=2.2;c.stroke();c.fillStyle=W.eye;c.fillRect(mx-R*.2,my-R*.1,R*.4,R*.08);if(FACE_GOLD){c.fillStyle=C.gold;c.fillRect(mx+R*.02,my-R*.1,R*.1,R*.1);}}
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
      else if(hs==='scarf'){circ(c,hx,hy,R+2);ink(c,ch.scarf||'#2ba8a0',lw);}
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
    else if(hs==='scarf'){const sc=ch.scarf||'#2ba8a0';c.beginPath();c.arc(hx,hy,R+2.5,Math.PI*.95,Math.PI*2.05);c.quadraticCurveTo(hx+turn*R*.3,hy-R*.35,hx-R-2.5,hy+R*.1);c.closePath();ink(c,sc,lw);
      c.save();c.beginPath();c.arc(hx,hy,R+2.5,Math.PI*.95,Math.PI*2.05);c.closePath();c.clip();c.fillStyle=C.gold;const rn=mkRng(5);for(let i=0;i<10;i++){circ(c,hx-R+rn()*R*2,hy-R*1.1+rn()*R*.9,1.3);c.fill();}c.restore();
      const kx=hx-(R+1)*(turn>=0?1:-1);c.beginPath();c.moveTo(kx,hy-R*.3);c.quadraticCurveTo(kx-6*(turn>=0?1:-1),hy+2,kx-3*(turn>=0?1:-1),hy+8);c.lineTo(kx+2*(turn>=0?1:-1),hy+2);c.closePath();ink(c,sc,1.8);}
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
  /* Police Helmet (Patriot): navy riot dome, tinted visor down over the eyes, badge on the brow */
  function policeHelmet(c,hx,hy,R,view,turn){
    const tx=hx+turn*1.5;c.beginPath();c.arc(tx,hy-1,R+3,Math.PI*.98,Math.PI*2.02);c.lineTo(tx+R+3.5,hy+R*.12);c.lineTo(tx-R-3.5,hy+R*.12);c.closePath();ink(c,'#26305a',LW.char);
    if(view==='back'){c.fillStyle=rgba('#ffffff',.18);c.fillRect(tx-R*.6,hy-R*.9,R*1.2,3);return;}
    c.beginPath();c.arc(tx,hy-1,R*.7,Math.PI*1.2,Math.PI*1.45);c.lineWidth=2.2;c.strokeStyle='rgba(255,255,255,.3)';c.stroke();
    const vx=tx+turn*R*.32;rr(c,vx-R*.92,hy-R*.36,R*1.84,R*.62,R*.26);c.fillStyle='rgba(20,28,60,.88)';c.fill();c.lineWidth=2.2;c.strokeStyle=C.ink;c.stroke();
    c.beginPath();c.moveTo(vx-R*.7,hy-R*.26);c.lineTo(vx-R*.2,hy-R*.26);c.lineWidth=1.6;c.strokeStyle='rgba(156,194,255,.6)';c.stroke();
    c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(tx+Math.cos(a)*2.6,hy-R*.72+Math.sin(a)*2.6);}c.closePath();ink(c,'#c8ccd8',1);circ(c,tx,hy-R*.72,.9);c.fillStyle=C.heg;c.fill();
  }
  /* Auto Head-Helm (crafted): a scavenged Auto's head worn as a helmet; its dead screen sits on the brow */
  function autoHelm(c,hx,hy,R,view,turn){
    const tx=hx+turn*1.5;rr(c,tx-R-3,hy-R-6,R*2+6,R*1.15,R*.42);ink(c,'#a8b2c6',LW.char);
    c.fillStyle=rgba(C.ink,.2);c.fillRect(tx-R-2,hy-R*.12,R*2+4,2.4);
    if(view!=='back'){rr(c,tx+turn*R*.3-R*.62,hy-R-2,R*1.24,R*.62,R*.2);ink(c,'#0d1a24',1.8);c.save();c.strokeStyle='rgba(54,227,242,.35)';c.lineWidth=1;c.beginPath();c.moveTo(tx+turn*R*.3-R*.4,hy-R*.7);c.lineTo(tx+turn*R*.3+R*.4,hy-R*.7);c.stroke();c.restore();
      c.strokeStyle='#e8e2d4';c.lineWidth=1.2;c.beginPath();c.moveTo(tx-R*.95,hy-R*.95);c.lineTo(tx-R*.55,hy-R*.6);c.stroke();}
    c.beginPath();c.moveTo(tx+R*.55,hy-R-6);c.lineTo(tx+R*.75,hy-R-13);c.lineWidth=2;c.strokeStyle=C.ink;c.stroke();circ(c,tx+R*.75,hy-R-14,2.2);ink(c,'#5a6474',1.2);
  }
  function cowboyHat(c,hx,hy,R,view,turn,col){col=col||'#8a6a44';ell(c,hx+turn*1.5,hy-R*.62,R*1.6,R*.36);ink(c,col,LW.char);
    c.beginPath();c.moveTo(hx-R*.82,hy-R*.62);c.quadraticCurveTo(hx-R*.88,hy-R*1.6,hx,hy-R*1.48);c.quadraticCurveTo(hx+R*.88,hy-R*1.6,hx+R*.82,hy-R*.62);c.closePath();ink(c,shade(col,.08),LW.char);
    c.fillStyle=shade(col,-.35);c.fillRect(hx-R*.82,hy-R*.86,R*1.64,R*.2);}
  function baseballCap(c,hx,hy,R,view,turn){const col='#a8402a';const tx=hx+turn*1.5;
    if(view!=='back'){const bx=view==='side'?tx+R*.55:tx;ell(c,bx,hy-R*.4,view==='side'?R*1.1:R*1.05,R*.3);ink(c,shade(col,-.2),LW.char);}
    c.beginPath();c.arc(tx,hy-2,R+1.8,Math.PI,Math.PI*2);c.closePath();ink(c,col,LW.char);
    c.beginPath();c.moveTo(tx,hy-R-3.6);c.lineTo(tx,hy-R*.3);c.lineWidth=1.2;c.strokeStyle=rgba(C.ink,.3);c.stroke();circ(c,tx,hy-R-3.4,1.6);c.fillStyle=shade(col,-.2);c.fill();
    if(view!=='back')star(c,tx+turn*R*.3,hy-R*.75,3,'#f4f0e6');}
  /* Nomad Drifter Coat (style mock): canvas duster, leather straps, a patched shoulder plate, visible stitching */
  function nomadCoat(c,view){const side=view==='side',back=view==='back';rr(c,side?-9:-10.5,-22,side?18:21,19,6);ink(c,'#b8a070',2.4);
    c.save();rr(c,side?-9:-10.5,-22,side?18:21,19,6);c.clip();c.fillStyle='#9a8458';c.fillRect(-12,-10,24,8);c.strokeStyle='rgba(60,40,20,.55)';c.setLineDash([1.6,1.4]);c.lineWidth=.8;c.beginPath();c.moveTo(back?0:-1,-21);c.lineTo(back?0:-1,-4);c.moveTo(-10,-12);c.lineTo(10,-12);c.stroke();c.setLineDash([]);c.restore();
    if(!back){c.lineWidth=2.4;c.strokeStyle='#6a4a2a';c.beginPath();c.moveTo(-7,-21);c.lineTo(6,-10);c.stroke();c.fillStyle='#c8a050';c.fillRect(-1.4,-16.6,2.6,2.2);}
    rr(c,side?-4:-11.5,-23,9,6,2.6);ink(c,'#7a6a4a',2);c.fillStyle='rgba(60,40,20,.5)';circ(c,(side?-4:-11.5)+2,-21,.6);c.fill();circ(c,(side?-4:-11.5)+7,-21,.6);c.fill();
    c.fillStyle='#8a7a5a';rr(c,side?-6:5,-9,5,4,1);c.fill();c.lineWidth=.8;c.strokeStyle='rgba(60,40,20,.6)';c.stroke();}
  /* Rook Mk II Tactical Helmet (style mock): matte charcoal shell, olive rails, a flip-up visor, the rook stamp */
  function rookHelm(c,hx,hy,R,view,turn){const tx=hx+turn*1.5;c.beginPath();c.arc(tx,hy-1,R+2.8,Math.PI*.96,Math.PI*2.04);c.lineTo(tx+R+3,hy-R*.1);c.lineTo(tx-R-3,hy-R*.1);c.closePath();ink(c,'#3a3e42',LW.char);
    for(const sx of[-1,1]){rr(c,tx+sx*(R+1.4)-1.8,hy-R*.75,3.6,R*.6,1);ink(c,'#6a7046',1.4);}
    if(view!=='back'){rr(c,tx+turn*R*.3-R*.85,hy-R*1.2,R*1.7,R*.42,R*.18);c.fillStyle='rgba(40,60,50,.85)';c.fill();c.lineWidth=1.8;c.strokeStyle=C.ink;c.stroke();
      c.fillStyle='#6a7046';const bx=tx+turn*R*.2,by=hy-R*.48;c.beginPath();c.moveTo(bx-2.2,by+2.4);c.lineTo(bx+2.2,by+2.4);c.lineTo(bx+1.6,by-.6);c.lineTo(bx+2.2,by-2.2);c.lineTo(bx-2.2,by-2.2);c.lineTo(bx-1.6,by-.6);c.closePath();c.fill();}
    c.beginPath();c.arc(tx,hy-1,R*.68,Math.PI*1.2,Math.PI*1.42);c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.2)';c.stroke();}
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
    cowboy:{name:'Cowboy No.4',kind:'Revolver',maker:'devlin',tier:1,hold:'one',grips:[0,null],len:16,fx:'ballistic',box:[-4,-6,18,8],draw(c){
      c.beginPath();c.moveTo(-2,-1);c.lineTo(3,-2);c.lineTo(2,6);c.quadraticCurveTo(-1,7.5,-3,5.5);c.closePath();ink(c,'#7a4a26',LW.held);
      circ(c,5.5,-.5,3.4);ink(c,'#5a5a66',LW.held);circ(c,5.5,-.5,1);c.fillStyle=C.ink;c.fill();
      part(c,8,-2.4,9,3.6,1.2,'#4a4a56');part(c,1.5,-4.6,3,2.4,1,W.gunDark,1.6);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(9,-2,7,1);}},
    longiron:{name:'Longhorn ’28',kind:'Hunting rifle',maker:'devlin',tier:1,hold:'two',grips:[0,17],len:44,fx:'ballistic',box:[-11,-11,46,8],draw(c){
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
    scatter:{name:'Varmint Shotgun',kind:'Shotgun',maker:'devlin',tier:1,hold:'two',grips:[0,11],len:27,fx:'scatter',box:[-10,-5,28,7],draw(c){
      c.beginPath();c.moveTo(-9,-1.5);c.lineTo(1.5,-2.6);c.lineTo(2,3);c.lineTo(-5,3);c.quadraticCurveTo(-8,5.5,-9.5,4.5);c.closePath();ink(c,W.wood,LW.held);
      part(c,1,-3.2,6,6.2,1.5,'#5a5a66');part(c,6,-3.4,21,2.6,1,W.gunDeep,1.6);part(c,6,-.8,21,2.6,1,W.gunDeep,1.6);part(c,7,1.6,9,3,1.2,W.grip,1.6);
      c.save();c.translate(-5,.6);c.rotate(-.4);poly(c,[[-2.6,-1],[2.6,0],[-2.6,1]]);c.fillStyle='#ff8a2a';c.fill();c.fillStyle='#5aa83a';c.fillRect(-4,-1,1.6,.7);c.fillRect(-4,.3,1.6,.7);c.restore();}},
    rocket:{name:'Improvised Rocket Launcher',short:'Improvised Rocket',kind:'Rocket launcher, one shot',maker:null,origin:'crafted',tier:1,hold:'shoulder',grips:[0,11],len:30,fx:'rocket',box:[-18,-10,32,11],draw(c){
      part(c,-17,-5.4,5,10.8,2,W.oliveDeep);part(c,-14,-4.4,36,8.8,3,W.olive);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(-12,-3.4,32,1.6);
      for(const x of[-6,13]){c.fillStyle='#9a9a9a';c.fillRect(x,-4.4,3,8.8);c.strokeStyle=C.ink;c.lineWidth=1;c.strokeRect(x,-4.4,3,8.8);}
      c.save();rr(c,2,-4.4,7,8.8,0);c.clip();for(let i=-2;i<4;i++){c.fillStyle=i%2?C.gold:C.ink;c.beginPath();c.moveTo(2+i*3,4.4);c.lineTo(5+i*3,-4.4);c.lineTo(8+i*3,-4.4);c.lineTo(5+i*3,4.4);c.fill();}c.restore();
      c.beginPath();c.moveTo(22,-3.6);c.lineTo(27,-3);c.quadraticCurveTo(32,0,27,3);c.lineTo(22,3.6);c.closePath();ink(c,'#d8502e',LW.held);
      part(c,-1,4,3.4,6,1,W.gunDark,1.6);part(c,10,4,3,5,1,W.gunDark,1.6);part(c,3,-9,6,4.6,1.5,W.gunDark,1.6);}},
    hg40:{name:'HG-40',kind:'Heavy pistol (security)',maker:'patriot',tier:1,hold:'one',grips:[0,null],len:18,fx:'ballistic',box:[-3,-6,19,9],draw(c){
      c.beginPath();c.moveTo(-1.5,-.5);c.lineTo(4.5,-.5);c.lineTo(3.5,7);c.lineTo(-2.5,7);c.closePath();ink(c,W.hegNavy,LW.held);
      part(c,-1,-4.6,17,5,1.5,W.hegWhite);part(c,15,-3.6,3,3.4,1,'#1a2240',1.6);
      c.save();c.shadowColor=C.heg;c.shadowBlur=4;c.fillStyle=C.hegHi;c.fillRect(2,-2.8,11,1);c.restore();
      c.strokeStyle=rgba(C.ink,.4);c.lineWidth=.6;for(let i=0;i<3;i++){c.beginPath();c.moveTo(1+i*1.4,-4.2);c.lineTo(1+i*1.4,-.8);c.stroke();}}},
    autohand:{name:'Auto Plasma Hand',kind:'Plasma finger (dropped by Autos)',maker:null,origin:'crafted',tier:1,hold:'one',grips:[-3,null],len:22,fx:'auto',box:[-10,-9,24,6],draw(c){
      c.beginPath();c.moveTo(-6,1);c.quadraticCurveTo(-10,5,-8,8);c.lineWidth=1.2;c.strokeStyle='#d04a3a';c.stroke();c.beginPath();c.moveTo(-6,0);c.quadraticCurveTo(-11,3,-10,6);c.strokeStyle=C.heg;c.stroke();
      part(c,-6,-3,13,6,3,'#9aa4b4');c.strokeStyle=rgba(C.ink,.35);c.lineWidth=.7;c.beginPath();c.moveTo(-2,-3);c.lineTo(-2,3);c.moveTo(2,-3);c.lineTo(2,3);c.stroke();
      circ(c,7.5,0,2.6);ink(c,'#5a6474',1.6);
      part(c,8.5,-3.4,6,6.8,2.5,'#b8c2d2');part(c,13,-3.4,8,2.4,1.2,'#b8c2d2',1.6);part(c,9.4,-8,2.4,5.2,1.2,'#b8c2d2',1.6);
      for(let i=0;i<3;i++){circ(c,14+i*1.8,1.4,1.1);ink(c,'#a8b2c2',1);}
      const k=.6+.4*Math.sin(CUR_T*9);circ(c,21,-2.2,1.4+k);c.fillStyle=rgba(C.shield,.5);c.fill();circ(c,21,-2.2,1);c.fillStyle='#e8ffff';c.fill();}},
    baton:{name:'Power Baton',kind:'Melee (blunt)',maker:'patriot',tier:1,hold:'one',melee:1,grips:[0,null],len:28,fx:'melee',box:[-6,-3,29,3],draw(c){
      circ(c,-3,0,2.6);ink(c,'#3a4060',1.6);part(c,-2,-2.2,7,4.4,2,W.hegNavy);c.strokeStyle=rgba('#ffffff',.3);c.lineWidth=.6;for(let i=0;i<3;i++){c.beginPath();c.moveTo(i*1.8,-2);c.lineTo(i*1.8,2);c.stroke();}
      part(c,4.5,-1.8,20,3.6,1.8,'#2b2f3e');part(c,23,-2.4,5,4.8,2,'#3a4060');
      c.save();c.shadowColor=C.heg;c.shadowBlur=6;c.fillStyle=C.hegHi;c.fillRect(19,-1.6,3,3.2);c.restore();}},
    mininglaser:{name:'Repurposed Mining Laser',short:'Mining Laser',kind:'Deployable sweep beam, needs recharge',maker:'praxon',heavy:1,origin:'scavenged',tier:1,hold:'heavy',grips:[0,12],len:31,fx:'beam',box:[-6,-12,32,11],draw(c){
      c.beginPath();c.moveTo(2,-6);c.quadraticCurveTo(7,-12,12,-6);c.lineWidth=4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=2;c.strokeStyle='#5a5a62';c.stroke();
      part(c,-4,-6,27,11,3,'#c9a23a');c.save();rr(c,-4,-6,27,11,3);c.clip();for(let i=0;i<4;i++){c.fillStyle=C.ink;c.beginPath();c.moveTo(14+i*3,5);c.lineTo(17+i*3,-6);c.lineTo(18.5+i*3,-6);c.lineTo(15.5+i*3,5);c.fill();}
      c.fillStyle='rgba(40,30,20,.35)';ell(c,3,2,3,1.6);c.fill();ell(c,9,-3,2,1.2);c.fill();c.restore();
      part(c,2,4,12,6,2,'#4a4a52');part(c,-2,4,3.4,7,1.2,W.gunDark);part(c,22,-4.6,6,8.4,2,W.gunDark);
      for(let i=0;i<3;i++){c.fillStyle=i<1+Math.floor((CUR_T*1.5)%3)?C.go:'#2a3a2a';c.fillRect(4+i*2.4,6,1.8,2);}
      circ(c,28.5,-.4,2.6);c.fillStyle='#ff6a3a';c.shadowColor='#ff6a3a';c.shadowBlur=6;c.fill();c.shadowBlur=0;c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();}},
    stiletto:{name:'ST Stiletto',short:'ST Stiletto',kind:'Sporting plasma carbine',maker:'fightstar',tier:1,hold:'two',grips:[0,12],len:26,fx:'plasma',box:[-8,-7,28,9],draw(c){
      c.beginPath();c.moveTo(-7,-2.4);c.lineTo(1,-3);c.lineTo(1,3);c.lineTo(-3,3);c.lineTo(-7,1.4);c.closePath();ink(c,'#1e1e24',LW.held);
      part(c,0,-3.6,16,6.4,3,'#24242c');c.fillStyle='#ff6a2a';c.beginPath();c.moveTo(2,2.8);c.lineTo(8,-3.6);c.lineTo(11,-3.6);c.lineTo(5,2.8);c.closePath();c.fill();
      part(c,15,-2.4,11,4,2,'#3a3a44');part(c,24,-1.6,3,3.2,1,'#1e1e24',1.4);part(c,4,-6.4,7,2.6,1,'#1e1e24',1.4);part(c,1,2.8,3.4,5.4,1.2,'#1e1e24',1.6);
      c.save();c.shadowColor='#ff8a5a';c.shadowBlur=6;c.fillStyle='#ffb08a';c.fillRect(16,-.6,8,1.2);c.restore();}},
    razorrat:{name:'Razorrat LMG',short:'Razorrat LMG',kind:'Deployable light machine gun',maker:'bhord',tier:1,hold:'heavy',grips:[0,14],len:36,fx:'ballistic',heavy:1,box:[-9,-8,38,12],draw(c){
      part(c,-8,-2.6,9,6,2.5,W.wood);part(c,0,-4.2,20,8,2.5,W.gunDark);part(c,3,4,10,7,1.5,'#5a5a3a');c.fillStyle=C.gold;for(let i=0;i<4;i++)c.fillRect(4+i*2.2,3.2,1.4,2);
      part(c,19,-3,10,6,2,'#4a4a52');c.strokeStyle=rgba(C.ink,.5);c.lineWidth=.8;for(let i=0;i<4;i++){c.beginPath();c.moveTo(20+i*2.2,-3);c.lineTo(20+i*2.2,3);c.stroke();}
      part(c,28,-1.6,8,3.2,1,W.gunDeep,1.6);part(c,6,-7.6,6,3.4,1,W.gunDeep,1.4);
      c.beginPath();c.moveTo(26,2);c.lineTo(30,8);c.moveTo(27,2);c.lineTo(33,7);c.lineWidth=1.8;c.strokeStyle=C.ink;c.stroke();}},
    arclight:{name:'LMC Arclight (style mock)',short:'LMC Arclight',kind:'Laser pistol (mock)',maker:'lmc',mock:1,tier:2,hold:'one',grips:[0,null],len:19,fx:'laser',box:[-4,-7,21,9],draw(c){
      c.beginPath();c.moveTo(-1.5,-1);c.lineTo(4,-1);c.quadraticCurveTo(4.6,4,3,7.4);c.lineTo(-2.6,7.4);c.quadraticCurveTo(-1,3,-1.5,-1);c.closePath();ink(c,'#eef0f6',LW.held);
      c.beginPath();c.moveTo(-1,-5);c.lineTo(13,-5);c.quadraticCurveTo(19,-4.6,19,-1.6);c.quadraticCurveTo(19,1,13,1);c.lineTo(-1,1);c.closePath();ink(c,'#eef0f6',LW.held);
      c.fillStyle='rgba(120,130,160,.35)';c.fillRect(0,-.6,12,1.2);rr(c,3,-4,6,3.6,1.6);c.fillStyle='#8a6aff';c.shadowColor='#b08aff';c.shadowBlur=8;c.fill();c.shadowBlur=0;
      c.fillStyle='#b08aff';circ(c,18.4,-2,1.1);c.fill();for(let i=0;i<3;i++){c.fillStyle=i<2?C.go:'#3a3a4a';c.fillRect(10+i*1.6,-4.4,1,1);}}},
    carbine:{name:'EG-55 Peacekeeper Carbine',short:'EG-55 Peacekeeper',kind:'Plasma carbine',maker:'fightstar',tier:1,hold:'two',grips:[0,12],len:24,fx:'plasma',box:[-7,-8,25,10],draw(c){
      part(c,-6,-2.4,8,5.4,2.5,W.hegShade);part(c,1,-3.8,15,7.4,3,W.hegWhite);part(c,6,3,4.5,6,1.5,W.hegNavy);
      part(c,15,-2,9,4,1.5,W.hegNavy);c.save();c.shadowColor=C.heg;c.shadowBlur=6;c.fillStyle=C.hegHi;c.fillRect(3,-1,11,1.4);c.restore();
      part(c,4,-6.6,6,2.6,1,W.hegNavy,1.6);}},
  };
  /* manufacturers: lore, and a look so players know what to expect */
  const MAKERS={ /* from "Gadgets, Gear and Gunships"; col = the two colours its kit wears, mark = its badge */
    bhord:{name:'Bhord',what:'Cheap, effective small arms and ship weapons.',look:'Wood furniture, stamped dark steel, curved mags. Built to be dropped in mud.',col:['#8a5a32','#3b3a44'],mark:'star5'},
    fightstar:{name:'Fightstar',what:'Civilian weapons that found their niche with mercenaries, pirates and gangs.',look:'Sporty matte black with a slash of hot orange, aggressive angles, a glowing sight line.',col:['#24242c','#ff6a2a'],mark:'slash'},
    patriot:{name:'Patriot',what:'Personal weapons and armour for the Hegemony.',look:'Hegemony white and navy, clean blocky shapes, a glowing blue line. Never a scratch.',col:[W.hegWhite,W.hegNavy],mark:'eagle'},
    devlin:{name:'Devlin & Son',what:'Old, dependable ballistic firearms; obsessed with mechanical simplicity.',look:'Walnut stocks, blued steel, brass details, a horn or scroll engraving.',col:['#9a6a3a','#4a4a56'],mark:'ds'},
    lmc:{name:'LMC',what:'Lark-Murray Corporation: advanced, expensive weapons and gadgets with lab partners.',look:'White ceramic shells, violet energy cells, seamless panels, tiny status LEDs.',col:['#eef0f6','#8a6aff'],mark:'lm'},
    mendon:{name:'MenDon',what:'Practical, uncomplicated, sturdy vehicles and ships.',look:'Boxy, riveted, utilitarian greys and creams. Panels you can fix with a spanner.',col:['#dfe3ea','#7a7e86'],mark:'md'},
    aerostar:{name:'Aerostar',what:'Sleek premium ships and vehicles: racers, yachts, transports.',look:'Long noses, smooth curves, cream with racing stripes and roundels.',col:['#ece2cc',C.rebel],mark:'wing'},
    varrondow:{name:'Varrondow Conglomerate',short:'Varrondow',what:'The Hegemony’s main line of small combat craft and ship weapons.',look:'Gunmetal and navy, sharp angles, glowing trim, faceless visor canopies.',col:['#2b3046',C.heg],mark:'vc'},
    autocom:{name:'AutoCom',what:'Gadgets, Autos, Bots and Drones for the Hegemony’s security forces.',look:'Grey moulded plastic, cyan LEDs and screens, cables where joints should be.',col:['#9aa4b4',C.shield],mark:'ac'},
    praxon:{name:'Praxon',what:'Industrial gear that accidentally became the pirates’ armoury.',look:'Safety yellow and black, rubber grips, hazard stripes, chunky clamps.',col:['#d8b030','#2a2a2a'],mark:'gear'},
    helix:{name:'Helix',what:'Medical equipment and pharmaceuticals. Excellent; not cheap.',look:'Clinical white and teal, rounded cases, a double-helix mark.',col:['#f4f6f8','#2ab0a0'],mark:'helix'},
    blamco:{name:'BLAMCo',what:'Explosives. Accept no imitations.',look:'Cartoon red-and-yellow branding, a starburst logo, hazard stripes.',col:['#e0402e',C.gold],mark:'burst'},
    genastro:{name:'General Astronautics',short:'Gen. Astronautics',what:'The Hegemony’s frigates, destroyers and carriers.',look:'Slab grey hulls, navy bands, stencilled hull numbers. (Capital ships; nothing yet.)',col:['#7a8294','#2c3a5e'],mark:'ga'},
    nomad:{name:'Nomad',what:'Frontier armour for settlers, prospectors and mercs who fix it themselves.',look:'Canvas, leather straps and scuffed plates in sand and khaki, visible stitching.',col:['#b8a070','#6a5a3a'],mark:'compass'},
    rook:{name:'Rook',what:'Affordable, repairable personal protection.',look:'Matte charcoal and olive, modular plates, a chess-rook stamp.',col:['#3a3e42','#6a7046'],mark:'rook'},
  };

  /* ---------- gear slots ---------- */
  const GEAR={
    hardhat:{name:'Frontier Hardhat',slot:'head',maker:'praxon',note:'Default helmet for rebel Soldiers. Camo, red patch; hair still shows beneath.'},
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
    stunned:{face:'dizzy',w:'panic',shake:.4,fx:'zap',label:'Stunned'},
    knocked:{face:'panic',w:'panic',lean:-.3,fx:'knock',label:'Knocked back'},
    burning:{face:'panic',w:'panic',shake:1,fx:'fire',label:'On fire'},
    extinguish:{face:'shout',slung:1,prop:'pat',fx:'fire',label:'Extinguish'},
    deploy:{face:'focus',slung:1,crouch:.82,prop:'tripod',label:'Deploy'},
    dig:{face:'shout',slung:1,prop:'pick',label:'Dig'},
    build:{face:'focus',slung:1,prop:'hammer',fx:'sparks',label:'Build'},
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
    if(X.has('earring')){const ex=hx-R*.92*(turn>=0?1:-1);c.beginPath();c.arc(ex,hy+R*.32,2.4,0,TAU);c.lineWidth=1.6;c.strokeStyle=C.gold;c.stroke();}
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

  /* hit flash: draw the character, then wash it white (juice). Uses a reusable offscreen canvas. */
  let FLASH_CV=null;
  function character(c,x,y,who,pose){
    if(pose&&pose.flash>0){const m=c.getTransform(),sc=Math.hypot(m.a,m.b)||1,s0=(pose.s||1)*(spec(who).big||1),Wd=Math.ceil(120*s0*sc),Hd=Math.ceil(130*s0*sc);
      if(!FLASH_CV)FLASH_CV=document.createElement('canvas');FLASH_CV.width=Wd;FLASH_CV.height=Hd;const g=FLASH_CV.getContext('2d');g.setTransform(sc,0,0,sc,0,0);
      character(g,60*s0,100*s0,who,Object.assign({},pose,{flash:0}));g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=rgba('#ffffff',Math.min(1,pose.flash));g.fillRect(0,0,Wd,Hd);
      c.save();c.drawImage(FLASH_CV,x-60*s0,y-100*s0,120*s0,130*s0);c.restore();return;}
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
    const mode=p.mode||'semi';
    const fire=P.flash?(mode==='auto'?Math.sin(t*40)>0:mode==='fan'?(((t*2.2)%1)<.45&&Math.sin(t*34)>0):mode==='single'?(((t*.9)%1)<.12):Math.sin(t*9)>.35):(st==='aim'&&Math.sin(t*5)>.93);
    const recoil=(st==='aim'||st==='fire')&&Wp?(st==='fire'&&mode==='auto'&&p.mode?Math.abs(Math.sin(t*40))*1.6:Math.max(0,Math.sin(t*5))**12*(Wp.hold==='shoulder'?5:3)):0;
    const S=p.s*(ch.big||1);
    c.save();c.translate(x,y);c.scale(S,S);
    ell(c,0,0,15,5);c.fillStyle='rgba(0,0,0,.4)';c.fill();
    if(p.squash){const q=p.squash;c.scale(1+.24*q,1-.24*q);}
    if(st==='down'){const f=p.fall==null?1:ease_ob(Math.max(0,Math.min(1,p.fall)));c.translate(0,-8*f);c.rotate(-Math.PI/2*.92*f);c.translate(4*f,8*f);}
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
    const backKey=p.back!==undefined?p.back:ch.back;
    const drawBack=()=>{if(!backKey||st==='down')return;c.save();
      if(backKey==='riotshield'){if(back){rr(c,-10,-30,20,26,5);c.fillStyle=rgba('#cfe0ff',.6);c.fill();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();c.fillStyle=W.hegNavy;c.fillRect(-7,-19,14,3);}
        else{const ex=view==='side'?-12:-11;rr(c,ex-2,-30,5,26,2);c.fillStyle=rgba('#cfe0ff',.7);c.fill();c.lineWidth=2;c.strokeStyle=C.ink;c.stroke();}}
      else{const Bw=WEAPONS[backKey];if(Bw){if(view==='side'){c.translate(-8,-8);c.rotate(-1.2);}else{c.translate(back?2:6,-14);c.rotate(back?-2.15:-1.95);}c.scale(.85,.85);Bw.draw(c);}}
      c.restore();};
    if(!back)drawBack();
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
    if(gear.has('nomadcoat'))nomadCoat(c,view);
    if(gear.has('medpack')){const mx=back?-9:(view==='side'?-9:-11);rr(c,mx,-13,7,6,2.2);ink(c,'#f4f6f8',1.6);c.fillStyle='#2ab0a0';c.fillRect(mx,-10.8,7,1.4);c.fillRect(mx+2.9,-12.4,1.2,4.6);}
    if(gear.has('charge')&&!back){rr(c,view==='side'?2:5,-12,6,4,1);ink(c,'#8a6a4a',1.4);c.fillStyle='#e0402e';c.fillRect(view==='side'?2.6:5.6,-11.2,4.8,1.2);}
    if(gear.has('molotov')){const mx=back?6:(view==='side'?-6:9);c.save();c.translate(mx,-6);c.rotate(.2);molotovProp(c,0,0,0,t,1);c.restore();}
    if(gear.has('stim')&&!back){const mx=view==='side'?1:3.5;rr(c,mx,-11,6,5,1.8);ink(c,'#2ab0a0',1.6);c.fillStyle='#f4f6f8';c.fillRect(mx+1.2,-12.6,1.2,2.6);c.fillRect(mx+3.4,-12.6,1.2,2.6);}
    if(ch.kind!=='bot')xBody(c,ch,X,view,t);
    if(ch.kind!=='bot'){rr(c,-8.5,-23,17,5,2.5);ink(c,ch.acc,2.4);if(ch.chev||ch.off)xChev(c,ch.chev||0,ch.off,view);
      if(view==='side'){c.beginPath();c.moveTo(-6,-21);c.quadraticCurveTo(-14,-20,-(17+Math.sin(t*7)*2),-14);c.lineTo(-13,-15);c.closePath();ink(c,ch.acc,2.2);}}
    const shoulderNow=Wp&&Wp.hold==='shoulder'&&!back&&!slung&&wpose!=='none'&&!shieldOn;
    if(shoulderNow){c.save();c.translate(wa[0],wa[1]);c.rotate(ang);Wp.draw(c);if(fire)muzzleFor(c,Wp.len,'rocket',mode,t);c.restore();}
    // ---- head
    const fst=p.face||(st==='idle'&&ch.idleFace)||P.face;
    if(ch.kind==='bot'){botFace(c,hx,hy+2,R*.95,fst,t);}
    else if(back){headShade(c,hx,hy,R,ch.skin||'#ccc');if(ch.kind==='trooper'){headShade(c,hx,hy,R+2,ch.armor);c.fillStyle=ch.plate;c.fillRect(hx-3,hy-R-1,6,R);}else hair(c,ch,hx,hy,R,'back',0);if(gear.has('hardhat'))helmet(c,hx,hy,R,'back',0);if(gear.has('policehelmet'))policeHelmet(c,hx,hy,R,'back',0);if(gear.has('autohelm'))autoHelm(c,hx,hy,R,'back',0);if(gear.has('cowboyhat'))cowboyHat(c,hx,hy,R,'back',0);if(gear.has('cap'))baseballCap(c,hx,hy,R,'back',0);if(gear.has('rookhelm'))rookHelm(c,hx,hy,R,'back',0);xHead(c,ch,X,hx,hy,R,'back',0);}
    else if(ch.kind==='trooper'){headShade(c,hx,hy,R+2,ch.armor);visor(c,hx,hy,R,st==='down'?'down':fst,turn);c.fillStyle=ch.plate;c.fillRect(hx-2.5,hy-R-2,5,R*.62);}
    else{
      headShade(c,hx,hy,R,ch.skin);
      if(ch.beard){c.save();circ(c,hx,hy,R);c.clip();c.beginPath();c.arc(hx+turn*3,hy+R*.2,R,.08*Math.PI,.92*Math.PI);c.quadraticCurveTo(hx+turn*3,hy+R*.62,hx+turn*3+R*.99*Math.cos(.08*Math.PI),hy+R*.2+R*Math.sin(.08*Math.PI));c.closePath();c.fillStyle=ch.hair;c.fill();c.restore();
        c.beginPath();c.arc(hx,hy,R,.1*Math.PI,.9*Math.PI);c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();}
      FACE_GOLD=!!ch.goldtooth;face(c,hx,hy,R,look,fst,t,turn);FACE_GOLD=false;
      xJaw(c,ch,X,hx,hy,R,turn);
      if(ch.tache){const mx=hx+turn*R*.32,my=hy+R*.34;c.beginPath();c.moveTo(mx,my);c.quadraticCurveTo(mx-R*.3,my-R*.08,mx-R*.42,my+R*.2);c.quadraticCurveTo(mx-R*.2,my+R*.08,mx,my+R*.1);c.quadraticCurveTo(mx+R*.2,my+R*.08,mx+R*.42,my+R*.2);c.quadraticCurveTo(mx+R*.3,my-R*.08,mx,my);ink(c,ch.hair,1.6);}
      if(st==='hack'){c.save();circ(c,hx,hy,R);c.clip();const g=c.createLinearGradient(0,hy+R,0,hy-R*.2);g.addColorStop(0,rgba(C.shield,.45));g.addColorStop(1,rgba(C.shield,0));c.fillStyle=g;c.fillRect(hx-R,hy-R,R*2,R*2);c.restore();}
      hair(c,ch,hx,hy,R,view,turn);
      if(gear.has('hardhat'))helmet(c,hx,hy,R,view,turn);
      if(gear.has('policehelmet'))policeHelmet(c,hx,hy,R,view,turn);if(gear.has('autohelm'))autoHelm(c,hx,hy,R,view,turn);if(gear.has('cowboyhat'))cowboyHat(c,hx,hy,R,view,turn);if(gear.has('cap'))baseballCap(c,hx,hy,R,view,turn);if(gear.has('rookhelm'))rookHelm(c,hx,hy,R,view,turn);
      xHead(c,ch,X,hx,hy,R,view,turn);
      if(view==='side'&&ch.hs!=='stetson'){circ(c,hx-R*.78,hy+1,R*.2);ink(c,shade(ch.skin,-.1),2);}
    }
    // ---- in front: weapon, hands, props
    const sk=ch.kind==='bot'?'#8a94a8':(ch.kind==='trooper'?'#e4e8f2':ch.skin);
    const offSk=X.has('metalarm')?'#9aa4b4':sk,offHand=(hx2,hy2)=>{if(X.has('noarm')){rr(c,hx2-2,hy2-3,4,5,1.5);ink(c,ch.coat2||ch.coat,1.6);return;}if(X.has('sling')){hand(c,0,-13,sk);return;}if(X.has('crutch'))return;hand(c,hx2,hy2,offSk);};
    if(back)drawBack();
    if(back&&slung)drawSlung();
    if(back&&Wp&&wpose!=='aim'&&wpose!=='none'&&!slung)drawSlung();
    if(!back&&st!=='down'){
      if(shieldOn&&wpose!=='none'){/* handled after weapon */}
      if(shoulderNow){c.save();c.translate(wa[0],wa[1]);c.rotate(ang);hand(c,Wp.grips[0],7,sk);hand(c,Wp.grips[1],7,sk);c.restore();}
      else if(Wp&&!slung&&wpose!=='none'){c.save();c.translate(wa[0],wa[1]);c.rotate(ang);if(fire&&Wp.fx==='beam')beam(c,Wp.len,t);Wp.draw(c);if(fire&&Wp.fx!=='beam'&&Wp.fx!=='melee')muzzleFor(c,Wp.len,wkey,mode,t);if(P.flash&&mode==='fan'&&Wp.hold==='one'){const k=(t*12)%1;hand(c,2+k*7,-6+k*2,sk);c.strokeStyle=rgba('#ffffff',.7);c.lineWidth=1.4;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-2+i*3,-10);c.lineTo(2+i*3,-8);c.stroke();}}if(P.flash&&mode==='auto'&&fire){c.fillStyle=C.gold;c.fillRect(6,-7-((t*20)%1)*8,2,1.2);}if(P.fx==='charge'&&Wp.fx==='beam')charging(c,Wp.len,t);
        hand(c,Wp.grips[0],1,sk);if(Wp.grips[1]!=null&&!shieldOn&&Wp.hold!=='one'&&!oneHand)hand(c,Wp.grips[1],1,X.has('metalarm')?offSk:sk);c.restore();
        if((Wp.hold==='one'||oneHand)&&!shieldOn&&!(P.flash&&mode==='fan'))offHand(view==='side'?-3:-10,-11);
        if(wpose==='reload'){c.save();c.translate(10,-4+Math.sin(t*6)*1.5);c.rotate(.5);rr(c,-2,-5,4.5,9,1.5);ink(c,'#2c2b33',1.8);c.restore();hand(c,11,-2+Math.sin(t*6)*1.5,sk);
          c.strokeStyle=rgba('#ffffff',.8);c.lineWidth=1.6;for(let i=0;i<3;i++){const a=-.6+i*.5;c.beginPath();c.moveTo(17+Math.cos(a)*4,-8+Math.sin(a)*4);c.lineTo(17+Math.cos(a)*8,-8+Math.sin(a)*8);c.stroke();}}}
      if(shieldOn){const sx=view==='side'?9:-3;c.save();c.translate(sx,-19);rr(c,-9,-14,18,30,6);c.fillStyle=rgba('#cfe0ff',.55);c.fill();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();
        rr(c,-6,-11,12,24,4);c.lineWidth=1.4;c.strokeStyle=rgba('#ffffff',.6);c.stroke();c.fillStyle=W.hegNavy;c.fillRect(-6,-3,12,3);c.restore();hand(c,sx-6,-14,sk);}
      const pr=P.prop;
      if(Wp&&Wp.melee&&P.flash&&!slung){c.save();c.translate(wa[0],wa[1]);c.beginPath();c.arc(0,0,Wp.len*.9,-1.9,ang);c.lineWidth=5;c.strokeStyle='rgba(255,255,255,.35)';c.stroke();c.lineWidth=2;c.strokeStyle='rgba(156,194,255,.6)';c.stroke();c.restore();}
      if(pr==='molotov'){const k=(t*1.3)%1,gx=-10+k*2,gy=-48+k*2;hand(c,9,-20,sk);molotovProp(c,gx,gy,-.5,t);hand(c,gx-2,gy+5,sk);c.strokeStyle=rgba('#ffffff',.6);c.lineWidth=2;c.beginPath();c.arc(-2,-30,20,-2.6,-1.9);c.stroke();}
      if(pr==='medpack'){c.save();c.translate(view==='side'?8:0,-8);helixCase(c,1);c.restore();
        const bx=view==='side'?14:9,bk=Math.sin(t*6);c.save();c.translate(bx,-14+bk);c.rotate(.3);rr(c,-1.5,-5,3,10,1);ink(c,'#f1ede4',1.2);c.restore();hand(c,(view==='side'?8:0)-8,-8,sk);hand(c,bx,-12+bk,sk);}
      if(pr==='pick'){const a=-1.6+Math.abs(Math.sin(t*5))*2.2;c.save();c.translate(6,-20);c.rotate(a);rr(c,-1.6,-2,3.2,24,1.4);ink(c,W.wood,1.8);c.beginPath();c.moveTo(-9,20);c.quadraticCurveTo(0,26,9,20);c.lineTo(8,23);c.quadraticCurveTo(0,28,-8,23);c.closePath();ink(c,'#8a8e96',1.8);c.restore();hand(c,6,-20,sk);hand(c,6+Math.cos(a+Math.PI/2)*9,-20+Math.sin(a+Math.PI/2)*9,sk);}
      if(pr==='hammer'){const a=-.9+Math.abs(Math.sin(t*7))*1.2;c.save();c.translate(10,-16);c.rotate(a);rr(c,-1.2,-1,2.4,13,1);ink(c,W.wood,1.4);rr(c,-4,10,8,4,1);ink(c,'#8a8e96',1.4);c.restore();hand(c,10,-16,sk);hand(c,-8,-11,sk);}
      if(pr==='pat'){const k=Math.sin(t*14);hand(c,-6+k*3,-16,sk);hand(c,6-k*3,-12,sk);}
      if(pr==='tripod'){const px=view==='side'?12:6;c.save();c.translate(px,-2);c.strokeStyle=C.ink;c.lineWidth=3;c.beginPath();c.moveTo(0,-8);c.lineTo(-6,2);c.moveTo(0,-8);c.lineTo(6,2);c.moveTo(0,-8);c.lineTo(0,3);c.stroke();c.strokeStyle='#5a5a62';c.lineWidth=1.4;c.stroke();c.restore();hand(c,px-5,-8,sk);hand(c,px+5,-8,sk);}
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
    if(st==='down'&&!p.dead){for(let i=0;i<3;i++){const a=t*3+i*TAU/3;star(c,x-6*S+Math.cos(a)*12*S,y-20*S+Math.sin(a)*4*S,4*S);}}   // stars for the knocked out; the dead get none (repo addition)
    if(fx==='code'){c.save();c.font=`800 ${8*S}px "Exo 2",system-ui`;c.textAlign='center';for(let i=0;i<2;i++){const k=(t*.8+i*.5)%1;c.globalAlpha=1-k;c.fillStyle=C.shield;c.fillText(i?'01':'10',x+(i?12:-10)*S,y-(52+k*14)*S);}c.restore();}
    if(fx==='shh'){c.save();c.globalAlpha=.6;c.fillStyle='#fffaf0';c.font=`800 ${8*S}px "Exo 2",system-ui`;c.textAlign='center';c.fillText('shh',x-16*S*(flip?-1:1),y-40*S);c.restore();}
    if(fx==='sparks'){const d=flip?-1:1;for(let i=0;i<4;i++){const k=(t*3+i*.25)%1;const a=-1.2+i*.5;c.fillStyle=k<.5?'#fff3b0':'#ffb347';c.fillRect(x+(16+Math.cos(a)*k*14)*S*d,y+(-6+Math.sin(a)*k*14+k*k*10)*S,2*S,2*S);}}
    if(fx==='eye'){c.save();c.translate(x+18*S*(flip?-1:1),y-48*S);ell(c,0,0,7*S,4.4*S);ink(c,'#10132e',1.6);circ(c,0,0,2.4*S);c.fillStyle=C.gold;c.fill();c.restore();}
    if(fx==='speed'){const d=flip?1:-1;c.save();c.strokeStyle=rgba('#ffffff',.55);c.lineWidth=2*S;c.lineCap='round';for(let i=0;i<3;i++){const k=(t*3+i*.33)%1;const yy=y-(14+i*10)*S;c.beginPath();c.moveTo(x+d*(16+k*10)*S,yy);c.lineTo(x+d*(26+k*16)*S,yy);c.stroke();}c.restore();}
    if(gear.has('angel')&&st!=='down'){angelDrone(c,x+(flip?-20:20)*S,y-(60+Math.sin(t*3)*3)*S,S*.9,t);}
    if(fx==='zap'){c.save();c.strokeStyle='#b8e8ff';c.shadowColor=C.shield;c.shadowBlur=6;c.lineWidth=1.6*S;for(let i=0;i<3;i++){const a=t*5+i*2.1,r0=16*S;c.beginPath();let px0=x+Math.cos(a)*r0,py0=y-34*S+Math.sin(a)*r0*.6;c.moveTo(px0,py0);for(let k=0;k<3;k++){px0+=(Math.sin(t*30+i+k)*5)*S;py0+=(4+k)*S*(k%2?-1:1);c.lineTo(px0,py0);}c.stroke();}c.restore();
      for(let i=0;i<3;i++){const a=t*4+i*TAU/3;star(c,x+Math.cos(a)*13*S,y-54*S+Math.sin(a)*3*S,3*S);}}
    if(fx==='knock'){const d=flip?1:-1;for(let i=0;i<4;i++){const k=(t*2+i*.25)%1;c.save();c.globalAlpha=(1-k)*.7;circ(c,x+d*(-10-k*26)*S,y-(2+k*4)*S,(3+k*5)*S);ink(c,'#c8b08a',1.2);c.restore();}
      c.strokeStyle=rgba('#ffffff',.6);c.lineWidth=2*S;for(let i=0;i<3;i++){c.beginPath();c.moveTo(x-d*(16)*S,y-(18+i*9)*S);c.lineTo(x-d*(28)*S,y-(18+i*9)*S);c.stroke();}}
    if(fx==='fire'){for(let i=0;i<6;i++){const k=(t*2.2+i/6)%1,fx2=x+(-12+i*4.6+Math.sin(t*9+i)*2)*S,fy=y-(6+(i%3)*10)*S-k*16*S,f=(1-k*.7)*5.4*S;c.save();c.globalAlpha=.95*(1-k*.8);c.beginPath();c.moveTo(fx2-f*.6,fy);c.quadraticCurveTo(fx2-f*.2,fy-f*1.4,fx2,fy-f*2.4);c.quadraticCurveTo(fx2+f*.3,fy-f*1.2,fx2+f*.6,fy);c.quadraticCurveTo(fx2,fy+f*.5,fx2-f*.6,fy);c.fillStyle=k<.35?'#fff3b0':k<.7?'#ffb347':'#ff6a2a';c.fill();c.lineWidth=1.2;c.strokeStyle=rgba(C.ink,.5);c.stroke();c.restore();}}
    if(p.shield>0&&st!=='down'){const a=.18+.22*p.shield,hitk=p.shieldHit||0;c.save();c.beginPath();c.ellipse(x,y-26*S,24*S,32*S,0,0,TAU);c.fillStyle=rgba(C.shield,a*.25+hitk*.25);c.fill();c.lineWidth=(1.6+hitk*2)*S;c.strokeStyle=rgba(C.shield,.55+hitk*.4);c.shadowColor=C.shield;c.shadowBlur=8;c.stroke();
      c.clip();c.strokeStyle=rgba('#e8ffff',.12);c.lineWidth=.8*S;const hs=7*S;for(let yy=-60;yy<10;yy+=hs*.87/S){for(let xx=-26;xx<26;xx+=hs*1.5/S){const cx0=x+(xx+((Math.round(yy/(hs*.87/S))%2)?hs*.75/S:0))*S,cy0=y+yy*S;c.beginPath();for(let k=0;k<6;k++){const q=k*Math.PI/3;c.lineTo(cx0+Math.cos(q)*hs*.5,cy0+Math.sin(q)*hs*.5);}c.closePath();c.stroke();}}c.restore();}
    if(fx==='lock'){c.save();c.translate(x,y-56*S);const k=(Math.sin(t*4)+1)/2;star(c,0,0,(4+k)*S,C.gold);c.restore();}
  }
  function beam(c,x,t){const sw=Math.sin(t*4)*.35;c.save();c.rotate(sw);const g=c.createLinearGradient(x,0,x+150,0);g.addColorStop(0,'#fff3e0');g.addColorStop(.15,'#ff6a3a');g.addColorStop(1,'rgba(255,106,58,0)');
    c.fillStyle='rgba(255,106,58,.12)';c.beginPath();c.moveTo(x,0);c.lineTo(x+150,-55);c.lineTo(x+150,55);c.closePath();c.fill();
    rr(c,x,-2.6,150,5.2,2.6);c.fillStyle=g;c.shadowColor='#ff6a3a';c.shadowBlur=10;c.fill();c.shadowBlur=0;c.fillStyle='rgba(255,255,255,.8)';c.fillRect(x,-.7,60,1.4);c.restore();}
  function charging(c,x,t){const k=(t*.8)%1;c.save();c.beginPath();c.arc(x-2,-.4,5,-Math.PI/2,-Math.PI/2+k*TAU);c.lineWidth=1.6;c.strokeStyle=C.go;c.stroke();for(let i=0;i<3;i++){const a=t*8+i*2;c.fillStyle='#fff3b0';c.fillRect(x-2+Math.cos(a)*7,Math.sin(a)*7,1.4,1.4);}c.restore();}
  function molotovProp(c,x,y,a,t,small){c.save();c.translate(x,y);c.rotate(a);const s=small?.7:1;c.scale(s,s);rr(c,-2.6,-2,5.2,8,2);ink(c,'#5a8a4a',1.8);rr(c,-1.2,-5,2.4,3.4,.8);ink(c,'#5a8a4a',1.4);c.fillStyle='rgba(255,255,255,.45)';c.fillRect(-1.6,-.6,1,5);
    c.beginPath();c.moveTo(0,-5);c.quadraticCurveTo(2.6,-7,1.2,-9);c.lineWidth=2;c.strokeStyle='#e8dcc0';c.stroke();
    if(!small){const f=1+Math.sin(t*20)*.2;c.beginPath();c.moveTo(-1.6,-9);c.quadraticCurveTo(1.2,-15*f,3.6,-9.4);c.quadraticCurveTo(1,-8,-1.6,-9);c.fillStyle='#ffb347';c.fill();c.beginPath();c.moveTo(0,-9.2);c.quadraticCurveTo(1.2,-12.4*f,2.4,-9.4);c.fillStyle='#fff3b0';c.fill();}c.restore();}
  /* Helix: medical kit in clinical white and teal, rounded, with the double-helix mark */
  function helixMark(c,x,y,h,col){c.save();c.strokeStyle=col||'#2ab0a0';c.lineWidth=Math.max(.7,h*.14);c.lineCap='round';for(const ph of[0,Math.PI]){c.beginPath();for(let i=0;i<=12;i++){const u=i/12;c.lineTo(x+Math.sin(u*TAU+ph)*h*.28,y-h/2+u*h);}c.stroke();}c.restore();}
  function helixCase(c,s){s=s||1;c.save();c.scale(s,s);rr(c,-8.5,-5,17,10,4);ink(c,'#f4f6f8',2.2);c.fillStyle='#2ab0a0';c.fillRect(-8.5,-1,17,2);rr(c,-2.6,-4,5.2,8,1.6);c.fillStyle='#f4f6f8';c.fill();c.fillStyle='#2ab0a0';c.fillRect(-.9,-3,1.8,6);c.fillRect(-2.6,-.9,5.2,1.8);
    rr(c,-3,-7.4,6,2.8,1.2);ink(c,'#9aa8b0',1.2);helixMark(c,6,0,6,'#1a7a70');c.restore();}
  function stimItem(c){rr(c,-1.9,-7,3.8,12,1.9);ink(c,'#f4f6f8',1.4);c.fillStyle='#2ab0a0';c.fillRect(-1.1,-4.6,2.2,5);c.fillStyle='rgba(255,255,255,.7)';c.fillRect(-.6,-4.2,.6,4);rr(c,-1.4,-9.6,2.8,2.8,1);ink(c,'#2ab0a0',1);c.fillStyle='#9aa0aa';c.fillRect(-.3,5,.6,3);helixMark(c,0,2.4,3,'#1a7a70');}
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
    const col=kind==='laser'?['#f4eaff','#b08aff','rgba(138,106,255,0)']:kind==='auto'?['#e8ffff',C.shield,'rgba(54,227,242,0)']:kind==='plasma'?['#fff0f0','#ff7a6a','rgba(255,90,80,0)']:['#fff6c0','#ffb347','rgba(255,120,40,0)'];
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
    const col=kind==='laser'?'#b08aff':kind==='plasma'?(side==='reb'?'#ff7a6a':'#8ab4ff'):'#ffd866';
    c.save();c.translate(x0,y0);c.rotate(a);
    if(kind==='laser'){c.strokeStyle=rgba(col,.35);c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(len,0);c.stroke();c.strokeStyle='#f4eaff';c.lineWidth=1.6;c.stroke();}
    else if(kind==='ballistic'){c.strokeStyle=rgba(col,.9);c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(Math.max(0,len-26),0);c.lineTo(len,0);c.stroke();c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();}
    else{const g=c.createLinearGradient(len-70,0,len,0);g.addColorStop(0,rgba(col,0));g.addColorStop(1,rgba(col,.45));c.fillStyle=g;c.fillRect(len-70,-2.4,70,4.8);c.save();c.shadowColor=col;c.shadowBlur=10;rr(c,len-26,-3.5,26,7,3.5);ink(c,col,2.4);c.restore();c.fillStyle='rgba(255,255,255,.85)';c.fillRect(len-20,-1.2,14,2.4);}
    c.restore();}
  function hit(c,x,y,k,o){impact(c,x,y,k,Object.assign({surface:'flesh'},o||{}));}
  /* explosion in stages: white flash → outlined fireball → shockwave → smoke column; embers and debris come from Particles() */
  function explosion(c,x,y,k,o){o=o||{};const S=o.size||1;
    if(k<.1){const f=1-k/.1;circ(c,x,y-6*S,(18+40*k)*S);c.fillStyle=rgba('#fffbe6',.6+.4*f);c.fill();}
    if(k>.02&&k<.5)ring(c,x,y,(k-.02)/.48,'#fffbe6',{r:70*S,w:7});
    const fk=Math.min(1,k/.55);if(fk<1){const r=(10+34*ease.outCubic(fk))*S;c.save();c.globalAlpha=fk>.7?(1-fk)/.3:1;
      for(let i=0;i<8;i++){const a=i*TAU/8+.2,d=r*.55;const col=fk<.3?'#fff3b0':fk<.6?'#ffb347':'#e0603a';circ(c,x+Math.cos(a)*d,y-r*.5+Math.sin(a)*d*.7,r*.48);ink(c,col,2.6);}
      circ(c,x,y-r*.5,r*.5);ink(c,fk<.4?'#fffbe6':'#ffcf6a',2.4);c.restore();}
    if(k>.35){const sk=(k-.35)/.65;c.save();c.globalAlpha=(1-sk)*.85;for(let i=0;i<5;i++){const rr2=(8+sk*16+i*2)*S;circ(c,x+Math.sin(i*2.3)*8*S,y-(20+sk*60+i*10)*S,rr2);ink(c,i<2?'#6a6460':'#8a8a92',2);}c.restore();}}
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
    gafrigate:{name:'GA Bulwark-class Frigate (style mock)',maker:'genastro',role:'Capital ship (mock)',game:null,mock:1,capital:1,mounts:{primary:[[18,-7],[18,7],[-4,-10],[-4,10]],secondary:[[-20,-8],[-20,8]]},defaults:{primary:'repeaters',secondary:'missiles'},
      parts:[
        {pts:[[-26,-11],[-34,-14],[-38,-14],[-36,-9]],m:1,f:'hull2'},
        {pts:[[40,0],[34,-6],[20,-9],[-10,-12],[-30,-11],[-36,-6],[-36,6],[-30,11],[-10,12],[20,9],[34,6]],f:'hull'},
        {box:[-28,-5,46,10,1.5],f:'hull2'},
        {box:[-14,-4,14,8,2],f:'dark'},
        {box:[22,-3,10,6,1],f:'hull2'},
      ],
      lines:[[[30,-7],[30,7]],[[10,-10],[10,10]],[[-6,-11.8],[-6,11.8]],[[-22,-11.2],[-22,11.2]],[[-30,0],[22,0]]],vents:[[-33,-4],[-33,-1],[-33,2],[24,-8],[24,7]],
      rivets:[[34,-4],[34,4],[16,-8],[16,8],[0,-11],[0,11],[-18,-11],[-18,11]],slit:[-7,0,9,2.4],engines:[[-36,-7,2.6],[-36,0,3],[-36,7,2.6]],lights:[[-34,-14.4,C.hegHi],[-34,14.4,C.hegHi],[38,0,C.hegHi]],
      liveries:{heg:{label:'Hegemony Navy',hull:'#7a8294',hull2:'#2c3a5e',dark:'#1a2240',acc:C.heg,mark:['HNS-0412',4,-10.4,'#2c3a5e'],emblem:[14,0],stripes:[{pts:[[26,-6.4],[29,-6.6],[29,6.6],[26,6.4]]}]}}},
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
    const off=!!o.off;                      // powered down: a landed ship that is scenery, not a participant (repo addition)
    const L0=-1.4,L1=-1.4,lx=L0*Math.cos(-ang)-L1*Math.sin(-ang),ly=L0*Math.sin(-ang)+L1*Math.cos(-ang);
    const engCol=lv.acc===C.heg?C.hegHi:'#ffb347';
    const ISO=o.isoK||0,IZ=o.isoZ||0;const xf=()=>{if(ISO){c.translate(x,y-IZ*ISO);c.transform(.7071*ISO,.3536*ISO,-.7071*ISO,.3536*ISO,0,0);}else c.translate(x,y);c.rotate(ang);c.scale(s,s);};
    c.save();xf();if(o.roll&&!ISO)c.scale(1,1-.38*Math.abs(o.roll));c.lineJoin='round';c.lineCap='round';
    if(!o.parked&&!off)for(const[ex,ey,er]of D.engines){const sputter=dmg>.6&&Math.sin(t*23+ey)>.6?.3:1;const f=er*(2.6+Math.sin(t*30+ey)*.6)*(o.boost?1.8:1)*sputter;const g=c.createLinearGradient(ex,0,ex-f*2,0);g.addColorStop(0,'#fffbe6');g.addColorStop(.4,engCol);g.addColorStop(1,rgba(engCol,0));
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
    const glow=(seg,w)=>{c.save();if(!off){c.shadowColor=C.heg;c.shadowBlur=6;}c.strokeStyle=off?rgba(C.hegHi,.35):C.hegHi;c.lineWidth=w||.7;for(const sy of[1,-1]){c.beginPath();c.moveTo(seg[0][0],seg[0][1]*sy);c.lineTo(seg[1][0],seg[1][1]*sy);c.stroke();}c.restore();};
    if(lv.trim)glow(lv.trim);if(lv.trim2)glow(lv.trim2,.6);
    if(lv.mark){const[txt,mx,my,mc]=lv.mark;c.save();c.translate(mx,my);c.font='900 2.4px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=mc;c.fillText(txt,0,0);c.restore();}
    if(lv.nose){const[nx,ny,txt]=lv.nose;c.save();c.translate(nx,ny);circ(c,0,0,1.8);ink(c,'#f4e6c8',lw*.5);c.fillStyle=C.rebel;c.font='900 1.5px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,0,.1);c.restore();}
    for(const[nx,ny,nc]of D.lights){const on=!off&&Math.sin(t*3+(ny>0?1.6:0))>-.2&&!(dmg>.6&&Math.sin(t*17)>0);circ(c,nx,ny,.9);c.fillStyle=off?rgba(nc,.25):nc;if(on){c.shadowColor=nc;c.shadowBlur=8;}c.fill();c.shadowBlur=0;}
    for(const[ex,ey,er]of D.engines){rr(c,ex-1.2,ey-er,2.4,er*2,.8);ink(c,lv.dark,lw*.8);}
    if(D.searchlight&&!o.dark&&!off){const[sx2,sy2]=D.searchlight;circ(c,sx2,sy2,1.1);c.fillStyle='#fff3c8';c.shadowColor='#fff3c8';c.shadowBlur=6;c.fill();c.shadowBlur=0;}
    if(D.scanner){const[sx2,sy2,sr]=D.scanner;if(!off){const g=c.createRadialGradient(sx2,sy2,0,sx2+16,sy2,18);g.addColorStop(0,rgba(C.heg,.18));g.addColorStop(1,rgba(C.heg,0));const sw=Math.sin(t*1.8)*.35;c.save();c.rotate(0);c.beginPath();c.moveTo(sx2,sy2);c.arc(sx2,sy2,10,sw-.3,sw+.3);c.closePath();c.fillStyle=g;c.fill();c.restore();}
      circ(c,sx2,sy2,sr);ink(c,'#0c1024',lw*.8);circ(c,sx2,sy2,sr*.55);c.fillStyle=off?'#39405a':C.hegHi;if(!off){c.shadowColor=C.heg;c.shadowBlur=8;}c.fill();c.shadowBlur=0;}
    if(D.eye){const[ex,ey,er]=D.eye;circ(c,ex,ey,er);ink(c,'#0c1024',lw*.8);circ(c,ex,ey,er*.6);c.fillStyle=off?'#2a4a52':C.shield;if(!off){c.shadowColor=C.shield;c.shadowBlur=8;}c.fill();c.shadowBlur=0;if(!off){circ(c,ex-er*.25,ey-er*.25,er*.18);c.fillStyle='#fff';c.fill();}}
    if(D.magnets){for(const[mx,my]of D.magnets){const k=off?.18:(o.clamp?1:.45+.25*Math.sin(t*4));rr(c,mx-1.2,my-3.4,2.4,6.8,.8);c.fillStyle=rgba(C.hegHi,k);if(!off){c.shadowColor=C.heg;c.shadowBlur=o.clamp?12:5;}c.fill();c.shadowBlur=0;}}
    const faceless=D.slit||lv.faceless||D.drone;
    if(D.slit){const[sx2,sy2,sw,sh]=D.slit;rr(c,sx2-sw/2,sy2-sh/2,sw,sh,sh/2);ink(c,'#0c1024',lw);if(!off){c.save();c.shadowColor=C.heg;c.shadowBlur=8;rr(c,sx2-sw/2+1,sy2-.35,sw-2,.7,.35);c.fillStyle=C.hegHi;c.fill();c.restore();}}
    c.restore();
    if(D.canopy){const[cx0,cy0,rx,ry]=D.canopy;
      const local=fn=>{c.save();xf();fn();c.restore();};
      const wx=(cx0*Math.cos(ang)-cy0*Math.sin(ang))*s,wy=(cx0*Math.sin(ang)+cy0*Math.cos(ang))*s;
      const P=ISO?[x+(wx-wy)*.7071*ISO,y-IZ*ISO+(wx+wy)*.3536*ISO]:[x+wx,y+wy];
      const glass=()=>local(()=>ell(c,cx0,cy0,rx,ry));
      glass();c.fillStyle=faceless?'#141a30':'#9ad8f0';c.fill();
      const pil=o.pilot!==undefined?o.pilot:lv.pilot;if(!faceless&&pil){c.save();glass();c.clip();const hs=Math.min(rx,ry)*s/15*(ISO?ISO*.8:1);character(c,P[0],P[1]+hs*1.15*31,pil,{view:'front',state:dmg>.6?'panic':'idle',t,s:hs*1.15});c.restore();}
      if(faceless)local(()=>{if(!off){c.shadowColor=C.heg;c.shadowBlur=8;}rr(c,cx0-rx*.1,cy0-ry*.6,rx*.3,ry*1.2,.3);c.fillStyle=off?rgba(C.hegHi,.3):C.hegHi;c.fill();});
      glass();c.fillStyle='rgba(200,240,255,.16)';c.fill();
      local(()=>{ell(c,cx0-rx*.25,cy0-ry*.3,rx*.45,ry*.22);c.fillStyle='rgba(255,255,255,.5)';c.fill();});
      if(o.pilotHit){c.save();glass();c.clip();c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=1.2;c.beginPath();c.moveTo(P[0]-rx*s*.6,P[1]-ry*s*.2);c.lineTo(P[0],P[1]);c.lineTo(P[0]+rx*s*.5,P[1]-ry*s*.5);c.moveTo(P[0],P[1]);c.lineTo(P[0]+rx*s*.2,P[1]+ry*s*.6);c.stroke();if(GORE&&!faceless){bloodSplat(c,P[0]+rx*s*.15,P[1]-ry*s*.1,rx*s*.35,9,.85);}c.restore();}
      glass();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();}
    if(dmg>.3&&!ISO){for(let i=0;i<4;i++){const kk=(t*1.6+i/4)%1;const bx=x+Math.cos(ang+2.2)*4*s,by=y+Math.sin(ang+2.2)*4*s;c.save();c.globalAlpha=(1-kk)*.6;circ(c,bx+Math.cos(ang+2.6)*kk*16*s,by+Math.sin(ang+2.6)*kk*16*s,(1+kk*3)*s);c.fillStyle='#e8eef6';c.fill();c.restore();}}
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
    if(g0.back)S.back=g0.back;   // the back item slot: Heavy weapons and deployables ride on the back
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

  /* shipIso: a ship parked in an isometric space (Haven Rock's hangar). The same parts, laid on the
     iso floor plane, stacked into a hull with thickness, on landing struts, engines cold. k = the room's iso scale. */
  function shipIso(c,id,x,y,ang,s,k,t,o){o=o||{};const D=SHIPS[id];if(!D)return;const lv=D.liveries[o.livery]||Object.values(D.liveries)[0];
    const col=f=>f==='hull'?lv.hull:f==='hull2'?lv.hull2:f==='dark'?lv.dark:f==='acc'?lv.acc:f;
    const thick=o.thick||2.4*s,lift=o.lift==null?6:o.lift,N=6;
    const local=(z,fn)=>{c.save();c.translate(x,y-z*k);c.transform(.7071*k,.3536*k,-.7071*k,.3536*k,0,0);c.rotate(ang);c.scale(s,s);fn();c.restore();};
    const pt=(a,b,z)=>{const wx=(a*Math.cos(ang)-b*Math.sin(ang))*s,wy=(a*Math.sin(ang)+b*Math.cos(ang))*s;return[x+(wx-wy)*.7071*k,y-z*k+(wx+wy)*.3536*k];};
    const shapes=D.parts.filter(p=>p.pts||p.box),path=(p,sy)=>{if(p.pts)poly(c,p.pts.map(([a,b])=>[a,b*sy]));else{const[a,b,w,h,r]=p.box;rr(c,a,sy>0?b:-b-h,w,h,r);}};
    local(0,()=>{c.globalAlpha=.35;c.fillStyle='#000';for(const p of shapes)for(const sy of p.m?[1,-1]:[1]){path(p,sy);c.fill();}});
    for(const[a,b]of[[8,0],[-7,-5],[-7,5]]){const g=pt(a,b,0),u=pt(a,b,lift);c.beginPath();c.moveTo(g[0],g[1]);c.lineTo(u[0],u[1]);c.lineWidth=3.4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=1.8;c.strokeStyle='#7a7e86';c.stroke();ell(c,g[0],g[1],3,1.5);c.fillStyle='#3b3a44';c.fill();}
    for(let i=0;i<N;i++)local(lift+thick*i/N,()=>{for(const p of shapes)for(const sy of p.m?[1,-1]:[1]){path(p,sy);c.fillStyle=shade(col(p.f),-.55+i/N*.3);c.fill();if(i===0){c.lineWidth=LW.char/s/k*1.4;c.strokeStyle=C.ink;c.stroke();}}});
    ship(c,id,x,y,ang,s,t,Object.assign({},o,{isoK:k,isoZ:lift+thick,parked:o.parked!==false}));
  }
  /* =================================================================
     HANGAR MODELS — ships parked at Haven Rock never turn, so each has a
     small hand-built 3D model (prisms with bevelled tops, vertical fins,
     cylinder engines, glass domes) projected into the room's isometric
     view, nose toward the hangar exit. hangarShip(c,id,x,y,s,k,t,o):
     x,y = the spot on the floor, s = ship scale, k = the room's iso scale,
     o.heading (world radians; default faces the exit), o.livery, o.damage,
     o.loadout. Ships without a model fall back to shipIso().
     ================================================================= */
  const HM={
    cross:{lift:5,struts:[[10,0],[-8,-4],[-8,4]],parts:[
      {t:'cyl',x0:-19,x1:-11,y:0,z:9,r:3.4,f:'dark',cap:'engine'},
      {t:'fin',pts:[[-10,9],[-17,9],[-19,16],[-15,16]],y:-3.2,th:.8,f:'hull2'},{t:'fin',pts:[[-10,9],[-17,9],[-19,16],[-15,16]],y:3.2,th:.8,f:'hull2'},
      {t:'prism',pts:[[5,-4],[3,-16],[-5.5,-16],[-6.5,-4]],z0:8,z1:9.6,inset:.06,f:'hull2',m:1},
      {t:'cyl',x0:-7,x1:6,y:-17.5,z:8.4,r:2,f:'dark'},{t:'cyl',x0:-7,x1:6,y:17.5,z:8.4,r:2,f:'dark'},
      {t:'prism',pts:[[21,0],[17,-3.6],[6,-4.8],[-12,-4.4],[-17,-2.8],[-17,2.8],[-12,4.4],[6,4.8],[17,3.6]],z0:5,z1:12,inset:.22,f:'hull'},
      {t:'prism',pts:[[2,-1.8],[-14,-1.8],[-14,1.8],[2,1.8]],z0:12,z1:13.2,inset:.1,f:'hull2'},
      {t:'dome',x:8.5,y:0,z:12,rx:4.8,ry:3,rz:3},{t:'sphere',x:19,y:-2,z:9,r:1.2,f:'#fff3c8'}]},
    talon:{lift:5,struts:[[12,0],[-9,-4],[-9,4]],parts:[
      {t:'cyl',x0:-16,x1:-5,y:-5.4,z:8,r:2.2,f:'dark',cap:'engine'},{t:'cyl',x0:-16,x1:-5,y:5.4,z:8,r:2.2,f:'dark',cap:'engine'},
      {t:'prism',pts:[[2,-3.4],[-8,-12.5],[-13,-12.5],[-9.5,-3.2]],z0:7.6,z1:8.8,inset:.05,f:'hull2',m:1},
      {t:'prism',pts:[[12,-2.4],[8,-6.2],[5.6,-6.2],[6.6,-2.6]],z0:8.6,z1:9.4,inset:.05,f:'hull2',m:1},
      {t:'cyl',x0:-4,x1:9,y:-8.6,z:8.2,r:1,f:'dark'},{t:'cyl',x0:-4,x1:9,y:8.6,z:8.2,r:1,f:'dark'},
      {t:'prism',pts:[[25,0],[16,-2.7],[2,-3.7],[-10,-3.4],[-15,-2.4],[-15,2.4],[-10,3.4],[2,3.7],[16,2.7]],z0:6,z1:11,inset:.25,f:'hull'},
      {t:'fin',pts:[[-6,11],[-13,11],[-15,15.5],[-11,15.5]],y:0,th:.8,f:'hull2'},
      {t:'dome',x:7,y:0,z:10.6,rx:5.8,ry:2.6,rz:2.6}]},
    graf:{lift:4,struts:[[12,-4],[12,4],[-12,-6],[-12,6]],parts:[
      {t:'cyl',x0:-21,x1:-15,y:-3.6,z:10,r:3,f:'dark',cap:'engine'},{t:'cyl',x0:-21,x1:-15,y:3.6,z:10,r:3,f:'dark',cap:'engine'},
      {t:'prism',pts:[[0,-8],[-17,-8],[-17,-13.5],[0,-13.5]],z0:5,z1:12,inset:.12,f:'hull2'},{t:'prism',pts:[[0,8],[-17,8],[-17,13.5],[0,13.5]],z0:5,z1:12,inset:.12,f:'hull2'},
      {t:'prism',pts:[[17,-5.5],[20,-2.4],[20,2.4],[17,5.5],[8,8],[-13,8],[-18,5.5],[-18,-5.5],[-13,-8],[8,-8]],z0:4,z1:16,inset:.14,f:'hull'},
      {t:'disc',x:-10,y:0,z:18.5,r:3.6,f:'#e8e0cc',stalk:16},
      {t:'dome',x:13.5,y:-1.5,z:15.4,rx:3.8,ry:3.4,rz:2.8}]},
    mote:{lift:5,struts:[[6,0],[-6,-4],[-6,4]],parts:[
      {t:'cyl',x0:-13,x1:-8,y:-2.4,z:9,r:1.8,f:'dark',cap:'engine'},{t:'cyl',x0:-13,x1:-8,y:2.4,z:9,r:1.8,f:'dark',cap:'engine'},
      {t:'prism',pts:[[-2,-6],[-6,-10.5],[-9.5,-10.5],[-7.5,-5.4]],z0:8.4,z1:9.6,inset:.05,f:'hull2',m:1},
      {t:'cyl',x0:4,x1:14,y:4.2,z:6.8,r:.9,f:'dark'},
      {t:'prism',pts:[[13,0],[9,-5],[0,-6.6],[-8,-6],[-11,-3],[-11,3],[-8,6],[0,6.6],[9,5]],z0:5,z1:13,inset:.3,f:'hull'},
      {t:'sphere',x:11,y:0,z:9,r:2.4,f:'#0c1024',glow:C.hegHi}]},
    fledgling:{lift:4,struts:[[8,0],[-6,-3],[-6,3]],parts:[
      {t:'cyl',x0:-15,x1:-10,y:0,z:8,r:2.4,f:'dark',cap:'engine'},
      {t:'fin',pts:[[-8,8],[-13,8],[-14.5,13],[-11,13]],y:-2.4,th:.7,f:'hull2'},{t:'fin',pts:[[-8,8],[-13,8],[-14.5,13],[-11,13]],y:2.4,th:.7,f:'hull2'},
      {t:'prism',pts:[[2,-3],[-1,-10.5],[-6,-10.5],[-6,-3]],z0:7.2,z1:8.4,inset:.05,f:'hull2',m:1},
      {t:'prism',pts:[[14,0],[11,-3],[3,-4.4],[-9,-3.6],[-13,-2],[-13,2],[-9,3.6],[3,4.4],[11,3]],z0:5,z1:10.4,inset:.25,f:'hull'},
      {t:'dome',x:4.5,y:0,z:10,rx:4,ry:2.6,rz:2.6}]},
    scim:{lift:5,struts:[[10,0],[-8,-4],[-8,4]],parts:[
      {t:'cyl',x0:-14,x1:-8,y:-4,z:8.4,r:2.4,f:'dark',cap:'engine'},{t:'cyl',x0:-14,x1:-8,y:4,z:8.4,r:2.4,f:'dark',cap:'engine'},
      {t:'prism',pts:[[4,-5],[0,-12],[-6,-18],[-12.5,-19],[-8,-11],[-4,-7]],z0:7.6,z1:8.6,inset:.04,f:'hull',m:1},
      {t:'prism',pts:[[4,-5],[0,-12],[-6,-18],[-7.6,-17.4],[-1.6,-11.4],[2.4,-5]],z0:8.6,z1:8.9,inset:0,f:'hull2',m:1},
      {t:'prism',pts:[[21,0],[6,-5],[-4,-8],[-12,-7],[-8,0],[-12,7],[-4,8],[6,5]],z0:6,z1:9.6,inset:.12,f:'hull'},
      {t:'prism',pts:[[17,0],[8,-2.6],[-6,-2.6],[-6,2.6],[8,2.6]],z0:9.6,z1:12.4,inset:.25,f:'dark'},
      {t:'sphere',x:9,y:0,z:12,r:.01,f:'dark'}]},
  };
  function hangarShip(c,id,x,y,s,k,t,o){o=o||{};const M=HM[id],D=SHIPS[id];if(!M||!D){shipIso(c,id,x,y,o.heading||0,s,k,t,o);return;}
    const lv=D.liveries[o.livery]||Object.values(D.liveries)[0];const col=f=>f==='hull'?lv.hull:f==='hull2'?(o.side2&&lv.wingSwap?lv.wingSwap:lv.hull2):f==='dark'?lv.dark:f==='acc'?lv.acc:f;
    const h=o.heading==null?Math.PI/4+.55:o.heading,ch=Math.cos(h),sh=Math.sin(h),K=k*s;
    const W=(lx,ly)=>[lx*ch-ly*sh,lx*sh+ly*ch];
    const P=(lx,ly,lz)=>{const[X,Y]=W(lx,ly);return[x+(X-Y)*.7071*K,y+(X+Y)*.3536*K-lz*K];};
    const depth=(lx,ly)=>{const[X,Y]=W(lx,ly);return X+Y;};
    const L=M.lift;const lw=Math.max(1.2,LW.char*.8);
    // shadow + struts
    c.save();c.globalAlpha=.32;c.fillStyle='#000';for(const p of M.parts){if(p.t!=='prism')continue;for(const sy of p.m?[1,-1]:[1]){poly(c,p.pts.map(([a,b])=>P(a+1,b*sy+1,0)));c.fill();}}c.restore();
    const zb=Math.min(...M.parts.filter(p=>p.t==='prism').map(p=>p.z0));for(const[a,b]of M.struts){const g=P(a,b,0),u=P(a,b,L+zb);c.beginPath();c.moveTo(...g);c.lineTo(...u);c.lineWidth=3.4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=1.8;c.strokeStyle='#8a8e96';c.stroke();ell(c,g[0],g[1],3.2*K/2,1.6*K/2);c.fillStyle='#3b3a44';c.fill();}
    // expand mirrored parts, add depth keys
    const list=[];for(const p of M.parts){if(p.m){list.push(p);list.push(Object.assign({},p,{pts:p.pts.map(([a,b])=>[a,-b]),m:0,_mir:1}));}else list.push(p);}
    const cen=p=>{if(p.pts&&p.t==='prism'){let a=0,b=0;for(const q of p.pts){a+=q[0];b+=q[1];}return depth(a/p.pts.length,b/p.pts.length);}if(p.t==='fin')return depth(p.pts.reduce((s2,q)=>s2+q[0],0)/p.pts.length,p.y);if(p.t==='cyl')return depth((p.x0+p.x1)/2,p.y);return depth(p.x,p.y);};
    const rank=p=>p.t==='dome'||p.t==='sphere'||p.t==='disc'?200:p.t==='prism'&&p.z1>=11?100:0;
    list.sort((a,b)=>(cen(a)+rank(a))-(cen(b)+rank(b)));
    const shadeF=(nx,ny)=>{const[X,Y]=[nx*ch-ny*sh,nx*sh+ny*ch];return -.12-.22*(X-Y)/1.4142-.06*(X+Y)/1.4142;};
    for(const p of list){
      if(p.t==='prism'){const base=col(p.f);const n=p.pts.length;let cx=0,cy=0;p.pts.forEach(q=>{cx+=q[0];cy+=q[1];});cx/=n;cy/=n;
        const top=p.pts.map(([a,b])=>[a+(cx-a)*p.inset,b+(cy-b)*p.inset]);const B=p.pts.map(([a,b])=>P(a,b,L+p.z0)),T=top.map(([a,b])=>P(a,b,L+p.z1));
        const faces=[];for(let i=0;i<n;i++){const j=(i+1)%n;let nx=p.pts[j][1]-p.pts[i][1],ny=-(p.pts[j][0]-p.pts[i][0]);const mx=(p.pts[i][0]+p.pts[j][0])/2-cx,my=(p.pts[i][1]+p.pts[j][1])/2-cy;if(nx*mx+ny*my<0){nx=-nx;ny=-ny;}const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;const[X,Y]=[nx*ch-ny*sh,nx*sh+ny*ch];if(X+Y>-.05)faces.push({i,j,nx,ny,d:depth((p.pts[i][0]+p.pts[j][0])/2,(p.pts[i][1]+p.pts[j][1])/2)});}
        faces.sort((a,b)=>a.d-b.d).forEach(f2=>{poly(c,[B[f2.i],B[f2.j],T[f2.j],T[f2.i]]);c.fillStyle=shade(base,shadeF(f2.nx,f2.ny));c.fill();c.lineWidth=lw*.7;c.strokeStyle=rgba(C.ink,.85);c.lineJoin='round';c.stroke();});
        poly(c,T);c.fillStyle=shade(base,.1);c.fill();c.lineWidth=lw;c.strokeStyle=C.ink;c.stroke();
        // top-face highlight along the light side
        c.save();poly(c,T);c.clip();c.fillStyle='rgba(255,255,255,.12)';const tl=top.map(([a,b])=>P(a-1.2,b-1.2,L+p.z1+.4));poly(c,tl);c.fill();c.restore();
        if(p.f==='hull'&&p.z1>=10&&!p._mir)hullDecals(c,id,lv,P,L+p.z1,top,o);}
      else if(p.t==='fin'){const base=col(p.f);const face=(yy)=>p.pts.map(([a,zz])=>P(a,p.y+yy,L+zz));const nearSign=(()=>{const[X,Y]=[-sh,ch];return X+Y>0?1:-1;})();
        poly(c,face(-nearSign*p.th/2));c.fillStyle=shade(base,-.35);c.fill();c.lineWidth=lw*.7;c.strokeStyle=C.ink;c.stroke();
        poly(c,face(nearSign*p.th/2));c.fillStyle=shade(base,-.05);c.fill();c.lineWidth=lw;c.stroke();}
      else if(p.t==='cyl'){const base=col(p.f);const ring=xx=>{const r=[];for(let i=0;i<16;i++){const a=i/16*TAU;r.push(P(xx,p.y+Math.cos(a)*p.r,L+p.z+Math.sin(a)*p.r));}return r;};
        const A=ring(p.x0),Bq=ring(p.x1),hull=convexHull(A.concat(Bq));const g=c.createLinearGradient(0,hull.reduce((m,q)=>Math.min(m,q[1]),1e9),0,hull.reduce((m,q)=>Math.max(m,q[1]),-1e9));g.addColorStop(0,shade(base,.35));g.addColorStop(1,shade(base,-.3));
        poly(c,hull);c.fillStyle=g;c.fill();c.lineWidth=lw*.8;c.strokeStyle=C.ink;c.stroke();
        const nearEnd=depth(p.x0,p.y)>depth(p.x1,p.y)?A:Bq;poly(c,nearEnd);c.fillStyle=p.cap==='engine'&&nearEnd===A?'#1a1a22':shade(base,-.1);c.fill();c.lineWidth=lw*.7;c.stroke();
        if(p.cap==='engine'&&nearEnd===A&&!o.cold){c.save();poly(c,nearEnd);c.clip();const cc=P(p.x0,p.y,L+p.z);const g2=c.createRadialGradient(cc[0],cc[1],0,cc[0],cc[1],p.r*K);g2.addColorStop(0,'rgba(255,170,80,.6)');g2.addColorStop(1,'rgba(255,170,80,0)');c.fillStyle=g2;c.fillRect(cc[0]-20,cc[1]-20,40,40);c.restore();}}
      else if(p.t==='dome'){const pts=[];for(let i=0;i<10;i++)for(let j=0;j<=4;j++){const a=i/10*TAU,b=j/4*Math.PI/2;pts.push(P(p.x+Math.cos(a)*Math.cos(b)*p.rx,p.y+Math.sin(a)*Math.cos(b)*p.ry,L+p.z+Math.sin(b)*p.rz));}
        const hh=convexHull(pts);const faceless=lv.faceless||D.slit||D.drone;const cc=P(p.x,p.y,L+p.z+p.rz*.5);const g=c.createRadialGradient(cc[0]-2,cc[1]-3,1,cc[0],cc[1],p.rx*K);g.addColorStop(0,faceless?'#3a4a70':'#e8fbff');g.addColorStop(.5,faceless?'#141a30':'#8ad0ec');g.addColorStop(1,faceless?'#0a0e20':'#3a7a9a');
        poly(c,hh);c.fillStyle=g;c.fill();c.lineWidth=lw;c.strokeStyle=C.ink;c.stroke();const hl=P(p.x+p.rx*.2,p.y-p.ry*.3,L+p.z+p.rz*.85);ell(c,hl[0],hl[1],p.rx*K*.32,p.ry*K*.16);c.fillStyle='rgba(255,255,255,.6)';c.fill();}
      else if(p.t==='sphere'){if(p.r<.1)continue;const cc=P(p.x,p.y,L+p.z);circ(c,cc[0],cc[1],p.r*K);c.fillStyle=p.f.startsWith('#')?p.f:col(p.f);c.fill();c.lineWidth=lw*.7;c.strokeStyle=C.ink;c.stroke();if(p.glow){circ(c,cc[0],cc[1],p.r*K*.55);c.fillStyle=o.cold?'#2a3a5a':p.glow;c.fill();}}
      else if(p.t==='disc'){const st=P(p.x,p.y,L+p.stalk),tp=P(p.x,p.y,L+p.z);c.beginPath();c.moveTo(...st);c.lineTo(...tp);c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();const r=[];for(let i=0;i<16;i++){const a=i/16*TAU;r.push(P(p.x+Math.cos(a)*p.r*.5,p.y+Math.sin(a)*p.r,L+p.z+Math.cos(a)*p.r*.6));}poly(c,r);c.fillStyle=p.f;c.fill();c.lineWidth=lw*.8;c.stroke();}
    }
    // door guns on the Graf when fitted
    const att=new Set(((o.loadout||lv.loadout||{}).attach)||[]);if(id==='graf'&&att.has('doorgun')){for(const sy of[-1,1]){const b=P(2,sy*13.6,L+9),e=P(9,sy*15.5,L+9.4);c.beginPath();c.moveTo(...b);c.lineTo(...e);c.lineWidth=3.6;c.strokeStyle=C.ink;c.stroke();c.lineWidth=2;c.strokeStyle='#4a4a52';c.stroke();}}
    if((o.damage||0)>.45){for(let i=0;i<3;i++){const kk=(t*.9+i/3)%1;const cc=P(-6+i*5,2,L+14);c.save();c.globalAlpha=(1-kk)*.6;circ(c,cc[0]+Math.sin(t+i)*3,cc[1]-kk*30,(3+kk*8));ink(c,'#7a7a82',1.2);c.restore();}}
  }
  function convexHull(pts){const p=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const q of p){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}for(let i=p.length-1;i>=0;i--){const q=p[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q);}up.pop();lo.pop();return lo.concat(up);}
  /* livery details painted on the hull's top face */
  function hullDecals(c,id,lv,P,z,top,o){c.save();poly(c,top.map(([a,b])=>P(a,b,z)));c.clip();
    for(const st of lv.stripes||[]){poly(c,st.pts.map(([a,b])=>P(a,b,z)));c.fillStyle=lv.acc;c.fill();}
    if(lv.racing){for(const yy of[-1.2,1.2]){c.beginPath();const a=P(22,yy*.6,z),b=P(-13,yy,z);c.moveTo(...a);c.lineTo(...b);c.lineWidth=1.6;c.strokeStyle=lv.acc;c.stroke();}}
    for(const[a,b,w,hh,pc]of lv.patches||[]){poly(c,[P(a,b,z),P(a+w,b,z),P(a+w,b+hh,z),P(a,b+hh,z)]);c.fillStyle=pc;c.fill();c.lineWidth=.8;c.strokeStyle=rgba(C.ink,.6);c.stroke();}
    if(lv.mark){const[txt,mx,my,mc]=lv.mark;const q=P(mx*.6,0,z);c.font='900 7px "Exo 2",system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=mc;c.fillText(txt,q[0],q[1]);}
    c.restore();}

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
    medpack:{short:'Medpack',name:'Medpack',cat:'gadget',kind:'Treats criticals and the downed; consumed',maker:'helix',tier:1,box:[-10,-8,10,6],draw(c){helixCase(c,1);}},
    stim:{short:'Stim',name:'Stim',cat:'gadget',kind:'Heals; consumed',maker:'helix',tier:1,box:[-3,-10,3,9],draw(c){stimItem(c);}},
    blam:{short:'BLAM Frag',name:'BLAM Frag Grenade',cat:'gadget',kind:'Anti-personnel frag',maker:'blamco',tier:1,box:[-6,-9,7,6],draw(c){circ(c,0,0,5);ink(c,W.frag,2);c.fillStyle='#e0402e';c.fillRect(-4.6,-1.2,9.2,2.4);c.fillStyle=C.gold;c.fillRect(-1.2,-7.6,2.4,2.8);c.beginPath();c.arc(3,-7,2,0,TAU);c.lineWidth=1.2;c.strokeStyle=C.gold;c.stroke();}},
    c90:{short:'BLAM C90',name:'BLAM C90 Explosive Charge',cat:'gadget',kind:'Demolition charge',maker:'blamco',tier:1,box:[-8,-9,8,5],draw(c,t){c4Item(c,t||CUR_T);}},
    autocore:{short:'Auto Core Charge',name:'Auto Core Improvised Charge',cat:'gadget',kind:'Crafted charge',maker:null,origin:'crafted',tier:1,box:[-8,-12,11,7],draw(c,t){autocoreItem(c,t||CUR_T);}},
    molotov:{short:'Molotov',name:'Molotov Cocktail',cat:'gadget',kind:'Sets an area alight',maker:null,origin:'crafted',tier:1,box:[-4,-15,5,6],draw(c,t){molotovProp(c,0,0,0,t||CUR_T);}},
    angel:{short:'Angel Drone',name:'Guardian Angel Drone',cat:'gadget',kind:'Intercepts one shot',maker:null,origin:'crafted',tier:1,box:[-12,-10,12,11],draw(c,t){angelDrone(c,0,0,1,t||CUR_T);}},
  });
  /* weapon rules as the doc gives them: damage type, size, traits (fire modes are traits) */
  const WEAPON_INFO={
    akli:{dtype:'ballistic',size:'2h',traits:['auto','semi']},stiletto:{dtype:'plasma',size:'2h',traits:['semi','sundering']},carbine:{dtype:'plasma',size:'2h',traits:['semi','auto','sundering']},
    cowboy:{dtype:'ballistic',size:'1h',traits:['single','fan']},longiron:{dtype:'ballistic',size:'2h',traits:['single','steady','piercing']},plasmasmg:{dtype:'plasma',size:'2h',traits:['auto','unstable']},
    scatter:{dtype:'ballistic',size:'2h',traits:['semi','piercing']},rocket:{dtype:'explosive',size:'2h',traits:['single','knockback','sundering','piercing']},hg40:{dtype:'ballistic',size:'1h',traits:['semi','sundering']},
    autohand:{dtype:'plasma',size:'1h',traits:['semi']},baton:{dtype:'melee',size:'1h',traits:['stunning']},razorrat:{dtype:'ballistic',size:'deploy',traits:['auto','piercing','heavy']},
    mininglaser:{dtype:'plasma',size:'deploy',traits:['semi','heavy']},arclight:{dtype:'laser',size:'1h',traits:['semi','piercing']},riotshield:{dtype:null,size:'deploy',traits:['heavy']},
  };
  for(const k in WEAPON_INFO)if(ITEMS[k])Object.assign(ITEMS[k],WEAPON_INFO[k]);
  Object.assign(ITEMS,{
    policehelmet:{short:'Police Helmet',name:'Police Helmet',cat:'armour',kind:'Helmet (security forces)',maker:'patriot',tier:1,box:[-20,-22,20,8],draw(c){headShade(c,0,0,14.5,'#c9a184');policeHelmet(c,0,0,14.5,'front',0);}},
    autohelm:{short:'Auto Head-Helm',name:'Auto Head-Helm',cat:'armour',kind:'Helmet (crafted from an Auto)',maker:null,origin:'crafted',tier:1,box:[-20,-30,20,2],draw(c){autoHelm(c,0,0,14.5,'front',0);}},
    cowboyhat:{short:'Cowboy Hat',name:'Cowboy Hat',cat:'armour',kind:'Cosmetic',maker:null,cosmetic:1,tier:1,box:[-24,-24,24,-4],draw(c){cowboyHat(c,0,0,14.5,'front',0);}},
    cap:{short:'Baseball Cap',name:'Baseball Cap',cat:'armour',kind:'Cosmetic',maker:null,cosmetic:1,tier:1,box:[-18,-20,18,-1],draw(c){baseballCap(c,0,0,14.5,'front',0);}},
    nomadcoat:{short:'Nomad Drifter Coat',name:'Nomad Drifter Coat (style mock)',cat:'armour',kind:'Body armour (mock)',maker:'nomad',mock:1,tier:2,box:[-13,-25,13,-1],draw(c){nomadCoat(c,'front');}},
    rookhelm:{short:'Rook Mk II Helmet',name:'Rook Mk II Tactical Helmet (style mock)',cat:'armour',kind:'Helmet (mock)',maker:'rook',mock:1,tier:2,box:[-20,-24,20,-1],draw(c){rookHelm(c,0,0,14.5,'front',0);}},
    limpet:{short:'Data Limpet',name:'Data Limpet',cat:'other',kind:'Hacking device',maker:'autocom',tier:1,box:[-9,-7,9,7],draw(c,t){rr(c,-8,-5,16,10,4);ink(c,'#5a6474',2);for(const sx of[-1,1]){c.beginPath();c.moveTo(sx*8,-3);c.lineTo(sx*11,-6);c.moveTo(sx*8,3);c.lineTo(sx*11,6);c.lineWidth=1.6;c.strokeStyle=C.ink;c.stroke();}
      rr(c,-5,-3,10,6,1.5);c.fillStyle='#0d1a24';c.fill();c.fillStyle=C.shield;c.fillRect(-3.6,-.8,(.5+.5*Math.sin((t||0)*4))*7.2,1.6);}},
    shells:{short:'Shell box',name:'Shell box',cat:'other',kind:'Ammunition',maker:'devlin',tier:1,box:[-9,-9,9,6],draw(c){rr(c,-8,-3,16,9,1.5);ink(c,'#7a5a3a',2);c.fillStyle='#e0402e';for(let i=0;i<4;i++){rr(c,-6.4+i*3.4,-8,2.6,6,1);ink(c,'#c0302a',.8);c.fillStyle=C.gold;c.fillRect(-6.4+i*3.4,-3.4,2.6,1.4);c.fillStyle='#e0402e';}c.fillStyle='#f4e6c8';c.font='900 3.4px system-ui';c.textAlign='center';c.fillText('D&S',0,3.4);}},
  });
  ITEMS.charge=ITEMS.c90;ITEMS.carbine.name='EG-55 Peacekeeper Carbine';
  ITEMS.riotshield.maker='patriot';delete ITEMS.riotshield.makerProposed;ITEMS.mininglaser.maker='praxon';ITEMS.hardhat.maker='praxon';ITEMS.policevest.maker='patriot';delete ITEMS.policevest.makerProposed;
  for(const k of['akli','razorrat'])if(ITEMS[k])ITEMS[k].maker='bhord';
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
     STRIDER Mk I — AutoCom's friendly neighbourhood enforcement strider.
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
  /* the Strider's face is a hologram projected above the hull: friendly cyan, harsh white-blue when angry, rebel red once hacked */
  function holoFace(c,mood,state,t,w,h,dmg,back){
    const fg=mood==='hacked'?'#ff6a5a':mood==='angry'?'#dfe8ff':'#7ff0ff';
    const glitch=(dmg>.4||state==='down')&&Math.sin(t*23)>.6;const fl=.78+.22*Math.sin(t*31)*Math.sin(t*7);
    c.save();c.globalAlpha=(back?.32:1)*fl*(state==='down'?(Math.sin(t*11)>0?.9:.25):1);if(back)c.scale(-1,1);if(glitch)c.translate((Math.random()-.5)*4,0);
    rr(c,-w/2,-h/2,w,h,8);c.fillStyle=rgba(fg,.1);c.fill();c.lineWidth=1.2;c.strokeStyle=rgba(fg,.45);c.stroke();
    c.save();rr(c,-w/2,-h/2,w,h,8);c.clip();for(let yy=-h/2+((t*12)%3);yy<h/2;yy+=3){c.fillStyle=rgba(fg,.08);c.fillRect(-w/2,yy,w,1.2);}c.restore();
    c.fillStyle=fg;c.strokeStyle=fg;c.shadowColor=fg;c.shadowBlur=10;c.lineCap='round';c.lineWidth=2.8;
    if(state==='down'){c.font=`900 ${h*.42}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ff6a6a';c.shadowColor='#ff6a6a';c.fillText('ERR',0,0);}
    else if(mood==='angry'){for(const sx of[-1,1]){c.beginPath();c.moveTo(sx*w*.38,-h*.3);c.lineTo(sx*w*.1,-h*.08);c.stroke();rr(c,sx*w*.24-w*.08,-h*.06,w*.16,h*.14,2);c.fill();}
      c.beginPath();for(let i=0;i<=6;i++){const xx=-w*.27+i*w*.54/6;c.lineTo(xx,h*.24+((i%2)?-h*.1:0));}c.stroke();}
    else if(mood==='hacked'){for(const sx of[-1,1]){c.beginPath();c.arc(sx*w*.2,-h*.06,h*.11,Math.PI,0);c.stroke();}c.beginPath();c.arc(0,h*.06,w*.22,.15*Math.PI,.85*Math.PI);c.stroke();
      c.fillRect(w*.32,-h*.38,1.6,h*.32);poly(c,[[w*.32+1.6,-h*.38],[w*.46,-h*.31],[w*.32+1.6,-h*.24]]);c.fill();}
    else{const bl=(t%4)>3.85;for(const sx of[-1,1]){if(bl)c.fillRect(sx*w*.2-w*.08,-h*.06,w*.16,2);else{circ(c,sx*w*.2,-h*.06,h*.14);c.fill();}}c.beginPath();c.arc(0,h*.02,w*.23,.15*Math.PI,.85*Math.PI);c.stroke();}
    c.restore();
  }
  function projector(c,px,py,hx,hy,w,mood,t,on){ // emitter on the hull and the light cone up to the face
    const fg=mood==='hacked'?'#ff6a5a':mood==='angry'?'#dfe8ff':'#7ff0ff';
    if(on){const g=c.createLinearGradient(0,py,0,hy);g.addColorStop(0,rgba(fg,.35));g.addColorStop(1,rgba(fg,.03));poly(c,[[px-3,py],[px+3,py],[hx+w/2,hy],[hx-w/2,hy]]);c.fillStyle=g;c.fill();}
    rr(c,px-9,py-2,18,8,3);ink(c,'#2a3048',2.2);ell(c,px,py-1,6,2.4);c.fillStyle=on?fg:'#3a4466';if(on){c.shadowColor=fg;c.shadowBlur=8;}c.fill();c.shadowBlur=0;c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();
  }
  /* Strider Mk I: a riot-control war machine wearing a friendly face. Armoured hull, a helmeted
     sensor head with a small face screen in its visor, loudspeakers, a dozer plate, autocannon claws. */
  function strider(c,x,y,o){o=Object.assign({view:'front',dir:1,state:'idle',mood:'friendly',t:0,s:1,damage:0},o);const{t,s,view}=o;const flip=view==='side'&&o.dir<0;const st=o.state;
    const hull=o.mood==='hacked'?'#cfd4de':W.hegWhite,navy=o.mood==='hacked'?'#4a4a52':W.hegNavy,steel='#5a6478',dark='#2a3048';
    const angry=o.mood==='angry'&&st!=='down';
    c.save();c.translate(x,y);c.scale(s,s);if(flip)c.scale(-1,1);
    const walk=st==='walk'?1:0,bob=st==='down'?12:Math.sin(t*6)*1.6*walk;
    ell(c,0,0,66,13);c.fillStyle='rgba(0,0,0,.38)';c.fill();
    c.translate(0,bob);
    const lift=ph=>walk?Math.max(0,Math.sin(t*6+ph))*6:0;
    const leg=(hx,hy0,kx,ky,fx,fy,col)=>{c.lineJoin='round';c.lineCap='round';c.beginPath();c.moveTo(hx,hy0);c.lineTo(kx,ky);c.lineTo(fx,fy-bob);c.lineWidth=13;c.strokeStyle=C.ink;c.stroke();c.lineWidth=8;c.strokeStyle=col;c.stroke();
      circ(c,kx,ky,6);ink(c,shade(col,-.15),2.4);poly(c,[[fx-4.4,fy-bob-9],[fx+4.4,fy-bob-9],[fx,fy-bob+1]]);ink(c,dark,2.2);};
    const rivets=pts=>{c.fillStyle=rgba(C.ink,.45);for(const[a,b]of pts){circ(c,a,b,1.1);c.fill();}};
    const horn=(hx,hy,dir)=>{c.save();c.translate(hx,hy);c.rotate(dir);poly(c,[[0,-4],[14,-9],[14,9],[0,4]]);ink(c,steel,2.4);c.strokeStyle=rgba(C.ink,.5);c.lineWidth=1;for(let i=1;i<4;i++){c.beginPath();c.moveTo(3.5*i,-4-1.2*i);c.lineTo(3.5*i,4+1.2*i);c.stroke();}c.restore();};
    const claw=(sx,front)=>{ // armoured arm ending in a twin autocannon
      c.beginPath();c.moveTo(sx*44,-58);c.lineTo(sx*56,-46);c.lineWidth=12;c.strokeStyle=C.ink;c.stroke();c.lineWidth=7.4;c.strokeStyle=steel;c.stroke();
      rr(c,sx*56-11,-50,22,22,6);ink(c,navy,LW.prop);c.fillStyle=rgba('#ffffff',.18);c.fillRect(sx*56-9,-48,18,3);
      for(const dx of[-4.5,4.5]){circ(c,sx*56+dx,-33,4);ink(c,dark,2);circ(c,sx*56+dx,-33,1.5);c.fillStyle=C.ink;c.fill();}
      if(st==='fire'&&Math.sin(t*14+sx)>0){const g=c.createRadialGradient(sx*56,-31,0,sx*56,-31,16);g.addColorStop(0,'#fff6c0');g.addColorStop(1,'rgba(255,180,70,0)');c.fillStyle=g;c.fillRect(sx*56-16,-47,32,32);}};
    const kit=(sx0,ax)=>{ // siren bar and antenna on the shoulders
      rr(c,sx0-11,-84,22,8,3);ink(c,'#3b3a44',2);const on=Math.sin(t*10)>0&&o.mood!=='hacked'&&st!=='down';rr(c,sx0-9,-83,8,6,2);c.fillStyle=on?'#fff':C.heg;c.fill();rr(c,sx0+1,-83,8,6,2);c.fillStyle=on?C.heg:'#fff';c.fill();
      c.beginPath();c.moveTo(ax,-74);c.lineTo(ax+6,-100);c.lineWidth=2;c.strokeStyle=C.ink;c.stroke();
      if(o.mood==='hacked'){const wv=Math.sin(t*6)*2;poly(c,[[ax+6,-100],[ax+20+wv,-97],[ax+6,-90]]);ink(c,C.rebel,1.6);}else{circ(c,ax+6,-101,2.6);c.fillStyle=C.heg;c.fill();}};
    const holo=(px,py,hx,hy,w,h,sideways,back)=>{projector(c,px,py,hx,hy+h/2,w*(sideways?.5:1),o.mood,t,st!=='down'||Math.sin(t*11)>0);c.save();c.translate(hx,hy+Math.sin(t*2)*1.2);if(sideways)c.scale(.55,1);holoFace(c,o.mood,st,t,w,h,o.damage,back);c.restore();};
    if(view==='side'){
      leg(-20,-30,-42,-28,-48,-lift(0),shade(navy,-.25));leg(18,-30,38,-28,44,-lift(2),shade(navy,-.25));
      // gas launcher rack on the far flank
      for(let i=0;i<3;i++){rr(c,-34+i*7,-82,5,12,2);ink(c,steel,1.6);}
      const P=[[-50,-26],[44,-26],[56,-40],[44,-72],[-38,-74],[-52,-58]];poly(c,P);ink(c,hull,LW.prop);
      c.save();poly(c,P);c.clip();c.fillStyle=navy;c.fillRect(-60,-40,130,14);c.fillStyle=rgba(C.ink,.15);c.fillRect(-60,-74,30,50);c.restore();
      c.strokeStyle=rgba(C.ink,.35);c.lineWidth=1.2;c.beginPath();c.moveTo(-12,-74);c.lineTo(-14,-40);c.moveTo(22,-72);c.lineTo(26,-40);c.stroke();rivets([[-40,-66],[-20,-68],[6,-68],[32,-66],[-40,-46],[40,-46]]);
      c.save();c.translate(-6,-56);c.font='900 7px "Exo 2",system-ui';c.textAlign='center';c.fillStyle=navy;c.fillText('MK I',0,0);c.restore();
      rr(c,40,-36,22,12,3);ink(c,navy,LW.prop); // dozer plate edge
      horn(30,-78,-.5);kit(-14,-30);
      holo(24,-74,28,-116,70,44,true,false);
      c.beginPath();c.moveTo(30,-58);c.lineTo(44,-48);c.lineWidth=12;c.strokeStyle=C.ink;c.stroke();c.lineWidth=7.4;c.strokeStyle=steel;c.stroke();
      rr(c,36,-56,24,16,5);ink(c,navy,LW.prop);rr(c,58,-54,22,4,1.6);ink(c,dark,2);rr(c,58,-46,22,4,1.6);ink(c,dark,2);
      if(st==='fire'&&Math.sin(t*14)>0){c.save();c.translate(80,-50);muzzle(c,0,'ballistic');c.restore();}
      leg(-24,-28,-32,-20,-36,-lift(1),navy);leg(22,-28,28,-20,32,-lift(3),navy);
    }else{
      const back=view==='back';
      leg(-26,-30,-50,-28,-54,2-lift(2),shade(navy,-.25));leg(26,-30,50,-28,54,2-lift(0),shade(navy,-.25));
      if(back){for(let i=0;i<3;i++){rr(c,-40+i*7,-90,5,14,2);ink(c,steel,1.6);}}
      const P=[[-52,-26],[52,-26],[48,-58],[34,-76],[-34,-76],[-48,-58]];poly(c,P);ink(c,hull,LW.prop);
      c.save();poly(c,P);c.clip();c.fillStyle=navy;c.fillRect(-60,-40,120,14);c.fillStyle=rgba(C.ink,.14);c.fillRect(26,-80,30,60);c.restore();
      c.strokeStyle=rgba(C.ink,.35);c.lineWidth=1.2;c.beginPath();c.moveTo(-48,-58);c.lineTo(48,-58);c.moveTo(0,-58);c.lineTo(0,-40);c.stroke();rivets([[-40,-52],[-20,-52],[20,-52],[40,-52],[-28,-70],[28,-70]]);
      if(!back){c.beginPath();for(let i=0;i<6;i++){const q=i*Math.PI/3;c.lineTo(-30+Math.cos(q)*5,-48+Math.sin(q)*5);}c.closePath();ink(c,navy,1.6);circ(c,-30,-48,1.6);c.fillStyle=C.hegHi;c.fill();
        c.save();c.translate(28,-46);c.font='900 7px "Exo 2",system-ui';c.textAlign='center';c.fillStyle=navy;c.fillText('MK I',0,0);c.restore();
        // eye strip lights up when it turns on dissenters
        rr(c,-24,-70,48,4,2);c.fillStyle=angry?C.hegHi:'#3a4466';if(angry){c.shadowColor=C.heg;c.shadowBlur=8;}c.fill();c.shadowBlur=0;}
      else{c.fillStyle=rgba(C.ink,.3);for(let i=0;i<5;i++)c.fillRect(-22+i*10,-66,5,18);}
      horn(-36,-78,Math.PI+.45);horn(36,-78,-.45);kit(-20,24);
      holo(0,-78,0,-120,76,46,false,back);
      if(!back){rr(c,-44,-34,88,14,4);ink(c,navy,LW.prop);c.fillStyle='#e8ecf4';for(let i=0;i<5;i++){c.beginPath();c.moveTo(-34+i*17,-31);c.lineTo(-28+i*17,-27);c.lineTo(-34+i*17,-23);c.lineWidth=2;c.strokeStyle='#e8ecf4';c.stroke();}
        circ(c,0,-62,4);c.fillStyle='#fff3c8';c.shadowColor='#fff3c8';c.shadowBlur=angry?10:3;c.fill();c.shadowBlur=0;c.lineWidth=1.6;c.strokeStyle=C.ink;c.stroke();}
      leg(-34,-26,-60,-22,-64,-lift(1),navy);leg(34,-26,60,-22,64,-lift(3),navy);
      if(!back){claw(-1);claw(1);}else{for(const sx of[-1,1]){c.beginPath();c.moveTo(sx*44,-58);c.lineTo(sx*56,-46);c.lineWidth=12;c.strokeStyle=C.ink;c.stroke();c.lineWidth=7.4;c.strokeStyle=steel;c.stroke();rr(c,sx*56-11,-50,22,20,6);ink(c,navy,LW.prop);}}
    }
    c.restore();
    if(o.damage>.5){for(let i=0;i<4;i++){const k=(t*1.1+i*.25)%1;c.save();c.globalAlpha=(1-k)*.8;circ(c,x+(14+Math.sin(t*2+i)*6)*s,y+(-80-k*40)*s,(4+k*10)*s);ink(c,'#6a6a72',1.6);c.restore();}if(Math.sin(t*13)>.5)star(c,x+20*s,y-60*s,4*s,'#fff3b0');}
  }

  /* =================================================================
     WEAPON TRAITS & DAMAGE TYPES — icons for the Arsenal, the engagement
     panel and the fire-mode toggle. icon(c,key,x,y,size) draws a glyph
     centred on x,y on a chunky tile; {bare:true} skips the tile.
     ================================================================= */
  const TRAITS={
    steady:{name:'Steady',kind:'trait',text:'+2 to hit a target you held fire on.'},
    auto:{name:'Automatic',kind:'mode',text:'−5 to hit (−2 from a deployed Razorrat); a hit rolls again at −10.'},
    semi:{name:'Semi-auto',kind:'mode',text:'+1 each phase on the same target, until you move or panic.'},
    single:{name:'Single shot',kind:'mode',text:'No modifiers.'},
    fan:{name:'Fan hammer',kind:'mode',text:'−5 to hit; double damage on a hit.'},
    knockback:{name:'Knockback',kind:'trait',text:'Shoves the target away from the blast.'},
    stunning:{name:'Stunning',kind:'trait',text:'Disorients the target.'},
    sundering:{name:'Sundering',kind:'trait',text:'Extra damage to armour.'},
    piercing:{name:'Piercing',kind:'trait',text:'Part of the damage skips armour.'},
    heavy:{name:'Heavy',kind:'trait',text:'Back slot only, unless Strong or trained.'},
    unstable:{name:'Unstable',kind:'trait',text:'Chance to blow up in your hands.'},
  };
  const DTYPES={ballistic:{name:'Ballistic',col:'#ffd866'},plasma:{name:'Plasma',col:'#ff6a8a'},laser:{name:'Laser',col:'#b08aff'},explosive:{name:'Explosive',col:C.hazard},melee:{name:'Melee',col:'#b9c5e6'}};
  function glyph(c,key,s,col){c.save();c.scale(s/24,s/24);c.lineJoin='round';c.lineCap='round';const st=(w)=>{c.lineWidth=w+2.4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=w;c.strokeStyle=col;c.stroke();};const fl=()=>{c.fillStyle=col;c.fill();c.lineWidth=1.8;c.strokeStyle=C.ink;c.stroke();};
    const bullet=(x,y)=>{c.beginPath();c.moveTo(x-2.6,y+6);c.lineTo(x-2.6,y-2);c.quadraticCurveTo(x,y-8,x+2.6,y-2);c.lineTo(x+2.6,y+6);c.closePath();fl();};
    switch(key){
      case'steady':c.beginPath();c.arc(0,0,7,0,TAU);st(2.2);for(const[a,b,d,e]of[[0,-11,0,-5],[0,11,0,5],[-11,0,-5,0],[11,0,5,0]]){c.beginPath();c.moveTo(a,b);c.lineTo(d,e);st(2.2);}circ(c,0,0,2);c.fillStyle=col;c.fill();break;
      case'auto':bullet(-6,0);bullet(0,0);bullet(6,0);break;
      case'semi':bullet(-4,0);bullet(4,0);break;
      case'single':bullet(0,0);break;
      case'fan':c.beginPath();c.arc(-2,2,7,0,TAU);fl();for(let i=0;i<6;i++){const a=i*Math.PI/3;circ(c,-2+Math.cos(a)*4,2+Math.sin(a)*4,1.3);c.fillStyle=C.ink;c.fill();}c.beginPath();c.arc(-2,2,11,-2.2,-.6);st(2);c.beginPath();c.moveTo(9,-7);c.lineTo(10,-3);c.lineTo(6,-4);c.closePath();c.fillStyle=col;c.fill();break;
      case'knockback':c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?3:7;c.lineTo(-5+Math.cos(a)*r,Math.sin(a)*r);}c.closePath();fl();c.beginPath();c.moveTo(2,0);c.lineTo(10,0);st(2.4);c.beginPath();c.moveTo(7,-4);c.lineTo(11,0);c.lineTo(7,4);st(2.4);break;
      case'stunning':c.beginPath();c.moveTo(2,-11);c.lineTo(-5,1);c.lineTo(0,1);c.lineTo(-3,11);c.lineTo(6,-2);c.lineTo(1,-2);c.closePath();fl();break;
      case'sundering':c.beginPath();c.moveTo(-8,-9);c.lineTo(8,-9);c.lineTo(8,2);c.quadraticCurveTo(8,9,0,11);c.quadraticCurveTo(-8,9,-8,2);c.closePath();fl();c.beginPath();c.moveTo(-1,-9);c.lineTo(2,-3);c.lineTo(-2,1);c.lineTo(1,6);c.lineTo(0,11);c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();break;
      case'piercing':c.beginPath();c.rect(-2,-9,4,18);fl();c.beginPath();c.moveTo(-11,0);c.lineTo(9,0);st(2.2);c.beginPath();c.moveTo(6,-4);c.lineTo(11,0);c.lineTo(6,4);st(2.2);break;
      case'heavy':c.beginPath();c.moveTo(-10,-3);c.lineTo(10,-3);c.lineTo(10,0);c.lineTo(5,2);c.lineTo(6,8);c.lineTo(-6,8);c.lineTo(-5,2);c.lineTo(-10,0);c.closePath();fl();c.beginPath();c.moveTo(-3,-3);c.lineTo(-3,-8);c.lineTo(3,-8);c.lineTo(3,-3);st(2);break;
      case'unstable':circ(c,0,0,5);fl();for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.ellipse(0,0,10,3.6,0,0,TAU);c.lineWidth=1.4;c.strokeStyle=col;c.stroke();c.restore();}c.beginPath();c.moveTo(1,-5);c.lineTo(-1,-1);c.lineTo(1,1);c.lineTo(-1,5);c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();break;
      case'ballistic':c.save();c.rotate(-.6);bullet(0,0);c.restore();break;
      case'plasma':{const g=c.createRadialGradient(0,0,1,0,0,9);g.addColorStop(0,'#fff');g.addColorStop(.5,col);g.addColorStop(1,rgba(col,0));c.fillStyle=g;circ(c,0,0,10);c.fill();circ(c,0,0,5);fl();break;}
      case'laser':c.beginPath();c.moveTo(-11,6);c.lineTo(9,-4);st(2.6);for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;c.beginPath();c.moveTo(9,-4);c.lineTo(9+Math.cos(a)*4,-4+Math.sin(a)*4);st(1.4);}break;
      case'explosive':c.beginPath();for(let i=0;i<14;i++){const a=i*Math.PI/7,r=i%2?5:10;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();fl();break;
      case'melee':c.save();c.rotate(-.7);rr(c,-2.4,-11,4.8,16,2);fl();rr(c,-3.6,5,7.2,6,2);c.fillStyle=W.hegNavy;c.fill();c.stroke();c.restore();break;
    }c.restore();}
  function icon(c,key,x,y,size,o){o=o||{};const T=TRAITS[key],D=DTYPES[key];const col=o.col||(D?D.col:T&&T.kind==='mode'?C.gold:'#e8ecf4');
    c.save();c.translate(x,y);if(!o.bare){rr(c,-size/2,-size/2+2,size,size,size*.22);c.fillStyle=C.ink;c.fill();rr(c,-size/2,-size/2,size,size,size*.22);c.fillStyle=o.active?'#3a2e00':'#1a1f47';c.fill();c.lineWidth=1.6;c.strokeStyle=o.active?C.gold:'#3a4488';c.stroke();}
    glyph(c,key,size*(o.bare?1:.72),col);c.restore();}
  /* fire-mode toggle as it appears in the attack window (canvas mock; the DOM version follows the HUD kit) */
  function fireModeToggle(c,x,y,modes,active,s){s=s||1;const w=74*s,h=50*s,g=4*s,tot=modes.length*w+(modes.length-1)*g;c.save();c.translate(x-tot/2,y);
    rr(c,-8*s,-24*s+3*s,tot+16*s,h+30*s,10*s);c.fillStyle=C.ink;c.fill();rr(c,-8*s,-24*s,tot+16*s,h+30*s,10*s);c.fillStyle='#10132e';c.fill();c.lineWidth=2*s;c.strokeStyle='#3a4488';c.stroke();
    c.font=`800 ${10*s}px "Exo 2",system-ui`;c.fillStyle='#b3bbe3';c.textAlign='left';c.textBaseline='middle';c.fillText('FIRE MODE  ·  F',0,-12*s);
    modes.forEach((m,i)=>{const bx=i*(w+g),on=m===active;rr(c,bx,on?2*s:0,w,h,8*s);c.fillStyle=C.ink;c.fill();rr(c,bx,on?0:-2*s,w,h,8*s);c.fillStyle=on?C.gold:'#252c62';c.fill();c.lineWidth=2*s;c.strokeStyle=C.ink;c.stroke();
      c.save();c.translate(bx+w/2,(on?0:-2*s)+h*.4);glyph(c,m,22*s,on?C.ink:C.gold);c.restore();
      c.font=`800 ${8.2*s}px "Exo 2",system-ui`;c.textAlign='center';c.fillStyle=on?'#2a1a00':'#f1f3ff';c.fillText(TRAITS[m].name.toUpperCase(),bx+w/2,(on?0:-2*s)+h*.82);});
    c.restore();}

  /* =================================================================
     VITALS — health, armour and shield as layered segments, wherever a
     health bar is shown. Shield (cyan glow) sits over armour (steel
     plates) which sits over health (green → orange → red).
     vitals(c, x, y, {hp,hpMax, arm,armMax, sh,shMax, s, hit})  x = centre, y = top
     ================================================================= */
  function vitals(c,x,y,o){const s=o.s||1,hpMax=o.hpMax||4,armMax=o.armMax||0,shMax=o.shMax||0;
    const pw=9*s,gap=2.6*s,n=Math.max(hpMax,armMax),tot=n*pw+(n-1)*gap,x0=x-tot/2;let yy=y;
    if(shMax){const sw=shMax*pw+(shMax-1)*gap,sx=x-sw/2;rr(c,sx-3*s,yy-2*s,sw+6*s,7*s,3.5*s);c.fillStyle=rgba(C.shield,.18);c.fill();c.lineWidth=1.2*s;c.strokeStyle=rgba(C.shield,.6);c.stroke();
      for(let i=0;i<shMax;i++){const on=i<(o.sh||0);c.save();c.translate(sx+i*(pw+gap)+pw/2,yy+1.5*s);c.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;c.lineTo(Math.cos(a)*pw*.52,Math.sin(a)*pw*.38);}c.closePath();
        c.fillStyle=on?C.shield:'rgba(20,40,60,.8)';if(on){c.shadowColor=C.shield;c.shadowBlur=6*s;}c.fill();c.shadowBlur=0;c.lineWidth=1.1*s;c.strokeStyle=C.ink;c.stroke();c.restore();}yy+=8*s;}
    if(armMax){const aw=armMax*pw+(armMax-1)*gap,ax=x-aw/2;for(let i=0;i<armMax;i++){const on=i<(o.arm||0),px=ax+i*(pw+gap);c.beginPath();c.moveTo(px+1.5*s,yy);c.lineTo(px+pw+1.5*s,yy);c.lineTo(px+pw-1.5*s,yy+5.4*s);c.lineTo(px-1.5*s,yy+5.4*s);c.closePath();
        c.fillStyle=C.ink;c.save();c.translate(0,1.2*s);c.fill();c.restore();c.fillStyle=on?'#a8b4c8':'#2a2f45';c.fill();c.lineWidth=1.2*s;c.strokeStyle=C.ink;c.stroke();
        if(on){c.fillStyle='rgba(255,255,255,.55)';c.fillRect(px+1.5*s,yy+1*s,pw-2*s,1.1*s);c.fillStyle=rgba(C.ink,.5);circ(c,px+pw/2,yy+3.4*s,.8*s);c.fill();}
        else{c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=.8*s;c.beginPath();c.moveTo(px+2*s,yy+1*s);c.lineTo(px+pw/2,yy+3*s);c.lineTo(px+pw-1*s,yy+4.4*s);c.stroke();}}yy+=6.6*s;}
    const r=(o.hp||0)/hpMax,hc=r>.5?C.go:r>.25?C.hazard:'#ff4a3d';
    for(let i=0;i<hpMax;i++){const px=x0+(n-hpMax)*(pw+gap)/2+i*(pw+gap);rr(c,px,yy,pw,5.4*s,2*s);c.fillStyle=C.ink;c.fill();rr(c,px+1*s,yy+1*s,pw-2*s,3.4*s,1.5*s);c.fillStyle=i<(o.hp||0)?hc:'#2a2f55';c.fill();}
    return yy+6*s;}

  /* ---------- hit effects for armour, shields and the new traits (k = 0..1) ---------- */
  function armourHit(c,x,y,k){c.save();c.globalAlpha=1-k;for(let i=0;i<6;i++){const a=-Math.PI/2+(i-2.5)*.45,d=4+k*18;c.strokeStyle=i%2?'#fff3b0':'#ffd866';c.lineWidth=1.6;c.beginPath();c.moveTo(x+Math.cos(a)*d*.4,y+Math.sin(a)*d*.4);c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);c.stroke();}
    c.beginPath();c.arc(x,y,3+k*10,0,TAU);c.lineWidth=1.4;c.strokeStyle='rgba(220,228,240,.8)';c.stroke();c.strokeStyle='#fffbe6';c.lineWidth=1.6;c.beginPath();c.moveTo(x+4+k*10,y-4-k*6);c.lineTo(x+10+k*34,y-10-k*20);c.stroke();c.restore();}
  function shieldHit(c,x,y,k){c.save();c.globalAlpha=1-k;for(let i=0;i<2;i++){const r=6+k*22+i*6;c.beginPath();for(let q=0;q<6;q++){const a=q*Math.PI/3+Math.PI/6;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.8);}c.closePath();c.lineWidth=2-i*.8;c.strokeStyle=C.shield;c.shadowColor=C.shield;c.shadowBlur=8;c.stroke();}c.restore();}
  function sunder(c,x,y,k){c.save();c.globalAlpha=1-k*.8;for(let i=0;i<6;i++){const a=i*1.05+.3,d=k*24;c.save();c.translate(x+Math.cos(a)*d,y+Math.sin(a)*d-k*k*-10);c.rotate(a*3+k*6);poly(c,[[-3,-2],[3,-1],[1,3]]);ink(c,'#a8b4c8',1);c.restore();}
    c.beginPath();c.moveTo(x-6,y-6);c.lineTo(x-1,y);c.lineTo(x-4,y+3);c.lineTo(x+2,y+8);c.lineWidth=2;c.strokeStyle='#fff';c.stroke();c.restore();}
  function pierce(c,x0,y0,x1,y1,k){const a=Math.atan2(y1-y0,x1-x0);c.save();c.globalAlpha=1-k;c.translate(x1,y1);c.rotate(a);const g=c.createLinearGradient(-30,0,26,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'#fff');g.addColorStop(1,'rgba(255,216,102,0)');rr(c,-30,-1.6,56,3.2,1.6);c.fillStyle=g;c.fill();
    c.beginPath();c.ellipse(0,0,2.4,6,0,0,TAU);c.lineWidth=2;c.strokeStyle='#a8b4c8';c.stroke();c.restore();}
  function misfire(c,x,y,k){explosion(c,x,y,k*.8);if(k<.5){for(let i=0;i<6;i++){const a=i*1.1;c.fillStyle='#ff6a8a';c.fillRect(x+Math.cos(a)*k*30,y+Math.sin(a)*k*30,2.4,2.4);}}}

  /* ---------- deployables ---------- */
  function deployable(c,kind,x,y,ang,t,o){o=o||{};const fire=o.fire&&Math.sin(t*40)>0;
    if(kind==='razorrat'){ell(c,x,y+2,22,7);c.fillStyle='rgba(0,0,0,.35)';c.fill();
      for(const a of[ang+Math.PI-.7,ang+Math.PI+.7,ang+.15]){c.beginPath();c.moveTo(x,y-14);c.lineTo(x+Math.cos(a)*16,y+Math.sin(a)*7);c.lineWidth=4;c.strokeStyle=C.ink;c.stroke();c.lineWidth=2;c.strokeStyle='#5a5a62';c.stroke();}
      rr(c,x+Math.cos(ang+2.4)*14-6,y-6,12,9,2);ink(c,'#5a5a3a',2);
      if(o.gunner&&Math.sin(ang)<0)character(c,x-Math.cos(ang)*16,y-Math.sin(ang)*6+4,o.gunner,{view:'back',state:'crouch',t,s:o.s||1,weapon:null});
      c.save();c.translate(x,y-16);c.rotate(Math.cos(ang)<0?Math.PI:0);c.scale(Math.cos(ang)<0?1:1,Math.cos(ang)<0?-1:1);c.rotate(Math.cos(ang)<0?-(Math.PI-ang):ang);c.scale(1.1,1.1);WEAPONS.razorrat.draw(c);if(fire)muzzle(c,36,'ballistic');if(o.fire){c.fillStyle=C.gold;c.fillRect(8,-8-((t*20)%1)*8,2,1.2);}c.restore();
      if(o.gunner&&Math.sin(ang)>=0)character(c,x-Math.cos(ang)*26,y-Math.sin(ang)*6+8,o.gunner,{view:Math.cos(ang)>=0?'side':'side',dir:Math.cos(ang)>=0?1:-1,state:'crouch',t,s:o.s||1,slung:true});}
    if(kind==='riotshield'){ell(c,x,y+1,16,5);c.fillStyle='rgba(0,0,0,.35)';c.fill();c.beginPath();c.moveTo(x-2,y-6);c.lineTo(x+6,y+2);c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();
      rr(c,x-12,y-40,24,40,7);c.fillStyle=rgba('#cfe0ff',.62);c.fill();c.lineWidth=LW.char;c.strokeStyle=C.ink;c.stroke();rr(c,-8+x,-36+y,16,32,5);c.lineWidth=1.4;c.strokeStyle=rgba('#ffffff',.6);c.stroke();c.fillStyle=W.hegNavy;c.fillRect(x-8,y-22,16,4);
      if(o.dmg){c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1.2;c.beginPath();c.moveTo(x-6,y-34);c.lineTo(x,y-26);c.lineTo(x-3,y-20);c.moveTo(x,y-26);c.lineTo(x+7,y-24);c.stroke();}}
  }

  /* =================================================================
     FIRE SUPPORT — ships seen from the ground: high up, with a shadow
     on the ground; strafing ladders, the door gunner's sweep, supply
     drops and dropship landings. k runs 0..1 over the event.
     ================================================================= */
  function flyover(c,id,x,y,ang,s,t,o){o=o||{};const alt=o.alt==null?70:o.alt;const D=SHIPS[id];
    if(D){c.save();c.translate(x+alt*.35,y+alt);c.rotate(ang);c.scale(s*.92,s*.92);c.globalAlpha=.3;c.fillStyle='#000';for(const p of D.parts){if(!p.pts&&!p.box)continue;for(const sy of p.m?[1,-1]:[1]){if(p.pts)poly(c,p.pts.map(([a,b])=>[a,b*sy]));else{const[a,b,w,h,r]=p.box;rr(c,a,sy>0?b:-b-h,w,h,r);}c.fill();}}c.restore();}
    ship(c,id,x,y,ang,s,t,Object.assign({boost:true},o));}
  function strafe(c,x0,y0,ang,len,k,t,o){o=o||{};const n=10,ca=Math.cos(ang),sa=Math.sin(ang);
    for(let i=0;i<n;i++){const u=(i+.5)/n,kk=(k-u*.8)/.25;const jx=Math.sin(i*7.3)*12,jy=Math.cos(i*4.1)*10;const px=x0+ca*len*u-sa*jx,py=y0+sa*len*u+ca*jy;
      if(kk>1)scorch(c,px,py,14);else if(kk>0)explosion(c,px,py,kk);else if(k<=0){circ(c,px,py,4);c.fillStyle=rgba(C.rebel,.5);c.fill();}}
    if(k>0&&k<1.1){const u=k*1.2-.1;flyover(c,o.ship||'talon',x0+ca*len*u,y0+sa*len*u-60,ang,o.s||2.6,t,{livery:o.livery||'rebel',alt:60,fire:true});}}
  function doorGunner(c,cx,cy,r,targets,k,t,o){o=o||{};const a=k*TAU*1.2;const sx=cx+Math.cos(a)*r,sy=cy+Math.sin(a)*r*.6-60;
    flyover(c,'graf',sx,sy,a+Math.PI/2,o.s||2.4,t,{livery:o.livery||'rebel',alt:60,loadout:{attach:['doorgun']},fire:true});
    targets.forEach(([tx,ty],i)=>{const on=Math.sin(t*20+i*2)>0&&k>.15&&k<.9;if(on){bolt(c,sx,sy+8,tx,ty-20,'ballistic');hit(c,tx,ty-20,(t*3+i*.3)%1);}});}
  function supplyDrop(c,x,y,k,t,o){o=o||{};if(k<1){const alt=(1-k)*170,sw=Math.sin(t*2.4)*8*(1-k);ell(c,x,y+2,10+k*8,(10+k*8)*.35);c.fillStyle=rgba('#000',.15+k*.25);c.fill();
      const cx=x+sw,cy=y-alt-14;c.beginPath();c.moveTo(cx-24,cy-34);c.lineTo(cx-7,cy-6);c.moveTo(cx+24,cy-34);c.lineTo(cx+7,cy-6);c.moveTo(cx,cy-40);c.lineTo(cx,cy-6);c.lineWidth=1;c.strokeStyle='#e8e2d4';c.stroke();
      c.beginPath();c.moveTo(cx-28,cy-34);c.quadraticCurveTo(cx,cy-64,cx+28,cy-34);c.quadraticCurveTo(cx+14,cy-40,cx,cy-36);c.quadraticCurveTo(cx-14,cy-40,cx-28,cy-34);ink(c,C.rebel,2.2);
      c.save();c.beginPath();c.moveTo(cx-28,cy-34);c.quadraticCurveTo(cx,cy-64,cx+28,cy-34);c.closePath();c.clip();c.fillStyle='#f4f0e6';for(const dx of[-12,6])c.fillRect(cx+dx,cy-70,7,40);c.restore();
      block(c,cx-10,cy-6,20,9,9,'#6a7046','#4a4f2a',2.4,false);c.fillStyle=C.rebel;c.fillRect(cx-2,cy-6,4,9);}
    else{c.beginPath();c.moveTo(x+12,y-2);c.quadraticCurveTo(x+30,y-12,x+42,y);c.quadraticCurveTo(x+28,y+5,x+12,y-2);ink(c,shade(C.rebel,-.15),2);
      block(c,x-14,y-24,28,12,12,'#6a7046','#4a4f2a',LW.prop);c.fillStyle=C.rebel;c.fillRect(x-3,y-24,6,24);
      if(o.open){for(let i=0;i<3;i++){c.save();c.translate(x-8+i*6,y-26);c.rotate(-.5+i*.4);stimItem(c);c.restore();}c.save();c.translate(x+8,y-27);circ(c,0,0,3.4);ink(c,W.frag,1.4);c.restore();}}}
  function landing(c,x,y,k,t,o){o=o||{};const alt=Math.max(0,(1-k))*90;if(k>.55){for(let i=0;i<10;i++){const a=i*TAU/10,d=26+(k-.55)*90;c.save();c.globalAlpha=Math.max(0,1-(k-.55)*1.8);circ(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.4,5+(k-.55)*14);ink(c,'#c8b08a',1);c.restore();}}
    flyover(c,'graf',x,y-alt,o.ang==null?-Math.PI/2:o.ang,o.s||2.6,t,{livery:o.livery||'rebel',alt,boost:k<.9});}

  /* ---------- manufacturer badges, for the Arsenal and the Black Market ---------- */
  function makerBadge(c,key,x,y,size){const M=MAKERS[key];if(!M)return;const r=size/2,[a,b]=M.col;c.save();c.translate(x,y);
    circ(c,1.5,3,r);c.fillStyle=C.ink;c.fill();circ(c,0,0,r);c.fillStyle=b;c.fill();c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();circ(c,0,0,r*.78);c.fillStyle=a;c.fill();c.lineWidth=1.2;c.stroke();
    const ink2=hex2rgb(a).reduce((p,v)=>p+v,0)>380?C.ink:'#f4f0e6';c.fillStyle=ink2;c.strokeStyle=ink2;c.lineWidth=r*.12;c.lineJoin='round';c.lineCap='round';
    const txt=t=>{c.font=`900 ${r*.62}px "Exo 2",system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(t,0,r*.04);};
    switch(M.mark){
      case'star5':c.beginPath();for(let i=0;i<10;i++){const q=-Math.PI/2+i*Math.PI/5,rr2=i%2?r*.25:r*.58;c.lineTo(Math.cos(q)*rr2,Math.sin(q)*rr2);}c.closePath();c.fillStyle=b;c.fill();break;
      case'slash':c.fillStyle=b;c.beginPath();c.moveTo(-r*.5,r*.4);c.lineTo(r*.1,-r*.5);c.lineTo(r*.5,-r*.5);c.lineTo(-r*.1,r*.4);c.closePath();c.fill();break;
      case'eagle':c.fillStyle=b;c.beginPath();c.moveTo(0,-r*.1);c.lineTo(-r*.6,-r*.4);c.lineTo(-r*.35,r*.05);c.lineTo(0,r*.5);c.lineTo(r*.35,r*.05);c.lineTo(r*.6,-r*.4);c.closePath();c.fill();break;
      case'ds':txt('D&S');break;case'lm':c.fillStyle=b;txt('LM');break;case'md':txt('MD');break;case'vc':txt('VC');break;case'ac':c.fillStyle=b;txt('AC');break;case'ga':txt('GA');break;
      case'wing':c.fillStyle=b;c.beginPath();c.moveTo(-r*.6,r*.1);c.quadraticCurveTo(-r*.1,-r*.5,r*.6,-r*.3);c.quadraticCurveTo(0,-r*.1,-r*.2,r*.35);c.closePath();c.fill();break;
      case'gear':c.fillStyle=b;c.beginPath();for(let i=0;i<16;i++){const q=i*Math.PI/8,rr2=i%2?r*.42:r*.58;c.lineTo(Math.cos(q)*rr2,Math.sin(q)*rr2);}c.closePath();c.fill();circ(c,0,0,r*.18);c.fillStyle=a;c.fill();break;
      case'helix':c.strokeStyle=b;for(const ph of[0,Math.PI]){c.beginPath();for(let i=0;i<=20;i++){const u=i/20,yy=-r*.55+u*r*1.1;c.lineTo(Math.sin(u*TAU*1.2+ph)*r*.32,yy);}c.stroke();}break;
      case'burst':c.fillStyle=b;c.beginPath();for(let i=0;i<14;i++){const q=i*Math.PI/7,rr2=i%2?r*.3:r*.62;c.lineTo(Math.cos(q)*rr2,Math.sin(q)*rr2);}c.closePath();c.fill();c.fillStyle=C.ink;c.font=`900 ${r*.42}px "Exo 2",system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText('B!',0,r*.04);break;
      case'compass':c.fillStyle=b;c.beginPath();c.moveTo(0,-r*.6);c.lineTo(r*.16,0);c.lineTo(0,r*.6);c.lineTo(-r*.16,0);c.closePath();c.fill();c.beginPath();c.moveTo(-r*.6,0);c.lineTo(0,r*.16);c.lineTo(r*.6,0);c.lineTo(0,-r*.16);c.closePath();c.fill();break;
      case'rook':c.fillStyle=b;c.beginPath();c.moveTo(-r*.4,r*.5);c.lineTo(r*.4,r*.5);c.lineTo(r*.3,r*.3);c.lineTo(r*.22,-r*.2);c.lineTo(r*.36,-r*.3);c.lineTo(r*.36,-r*.55);c.lineTo(r*.18,-r*.55);c.lineTo(r*.18,-r*.42);c.lineTo(r*.06,-r*.42);c.lineTo(r*.06,-r*.55);c.lineTo(-r*.06,-r*.55);c.lineTo(-r*.06,-r*.42);c.lineTo(-r*.18,-r*.42);c.lineTo(-r*.18,-r*.55);c.lineTo(-r*.36,-r*.55);c.lineTo(-r*.36,-r*.3);c.lineTo(-r*.22,-r*.2);c.lineTo(-r*.3,r*.3);c.closePath();c.fill();break;
    }c.restore();}

  /* =================================================================
     SHOTS & IMPACTS — every weapon's projectile is set by its maker's
     palette and its own shape, and its fire mode sets the pattern.
     shot(c, key, x0,y0, x1,y1, time, {mode, seed}) draws the rounds in
     flight `time` seconds after the trigger; shotTimes(key, mode, dist)
     gives each round's arrival time so the game can trigger impacts.
     impact(c, x,y, k, {dtype, surface, dir, style, gore}) draws what a
     round does to what it hits. SR_ART.GORE = false swaps blood for dust.
     ================================================================= */
  const STYLE={ /* projectile + muzzle palettes by maker: core, glow */
    bhord:['#fff3c0','#ffb347'],devlin:['#ffffff','#ffd27a'],patriot:['#ffffff','#9cc2ff'],fightstar:['#fff0e0','#ff6a2a'],lmc:['#f6eeff','#b08aff'],
    praxon:['#fff3e0','#ff6a3a'],autocom:['#e8ffff','#36e3f2'],crafted:['#fff0f6','#ff4aa0'],varrondow:['#ffffff','#4f8cff'],blamco:['#fff3b0','#ff8a1f']};
  const PROJ={ /* type, maker palette, speed px/s, length, width */
    akli:{type:'tracer',style:'bhord',speed:1500,len:26,w:2.6},stiletto:{type:'dart',style:'fightstar',speed:1200,len:16,w:3},carbine:{type:'bolt',style:'fightstar',speed:1000,len:22,w:5},
    cowboy:{type:'slug',style:'devlin',speed:1400,len:14,w:4},longiron:{type:'rail',style:'devlin',speed:4000,len:60,w:2},scatter:{type:'pellets',style:'devlin',speed:1300,len:10,w:1.8,pellets:7,spread:.16},
    plasmasmg:{type:'unstable',style:'crafted',speed:850,len:16,w:5},hg40:{type:'tracer',style:'patriot',speed:1500,len:20,w:3},autohand:{type:'ring',style:'autocom',speed:800,len:8,w:4},
    baton:{type:'melee',style:'patriot',speed:9999,len:0,w:0},rocket:{type:'rocket',style:'blamco',speed:520,len:14,w:5},razorrat:{type:'tracer',style:'bhord',speed:1600,len:30,w:3.2,heavy:1},
    mininglaser:{type:'beam',style:'praxon',speed:1e9,len:0,w:6},arclight:{type:'beam',style:'lmc',speed:1e9,len:0,w:3.4},
    /* ship and vehicle weapons */
    repeaters:{type:'bolt',style:'bhord',speed:900,len:20,w:4,twin:3.4,space:1},missiles:{type:'missile',style:'varrondow',speed:380,len:10,w:4,space:1},doorgun:{type:'tracer',style:'bhord',speed:1500,len:24,w:2.6},
    dronegun:{type:'bolt',style:'autocom',speed:950,len:14,w:3.4,space:1},cruiser:{type:'bolt',style:'patriot',speed:900,len:18,w:5},dispersal:{type:'pellets',style:'patriot',speed:900,len:8,w:3,pellets:5,spread:.2},strider:{type:'tracer',style:'autocom',speed:1500,len:24,w:3.4,heavy:1},
  };
  const MODE_ROUNDS={single:[0],semi:[0],auto:[0,.09,.18,.27],fan:[0,.07,.14]};
  /* An attack is an attempt, not a bullet. volley() turns one mechanical result (hit or miss, and
     its damage) into a fresh-looking burst every time: semi-auto fires 3-5 rounds with 1-3 landing,
     automatic 6-10 with roughly half landing, fan hammer 3 with 2-3 landing, single shot exactly one.
     The damage is split across the rounds that land (10 might show as 3, 3, 4). Purely visual. */
  function volley(key,mode,o){o=o||{};const P=PROJ[key]||PROJ.akli,R=o.rng||Math.random,ri=(a,b)=>a+Math.floor(R()*(b-a+1));const ty=P.type;mode=mode||'semi';
    let n=ty==='rocket'||ty==='missile'||mode==='single'?1:ty==='melee'?ri(1,2):mode==='fan'?3:mode==='auto'?ri(6,10):ri(3,5);if(ty==='pellets'&&mode!=='single')n=ri(2,3);if(ty==='beam'&&mode!=='single')n=ri(2,3);
    const hit=o.hit!==false;let h=!hit?0:n===1?1:mode==='auto'?Math.max(1,Math.round(n*(.35+R()*.35))):mode==='fan'?ri(2,3):ri(1,Math.min(3,n));
    const idx=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(R()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}const hitSet=new Set(idx.slice(0,h));
    const D=o.damage==null?10:o.damage;const wts=[...Array(h)].map(()=>.6+R());const ws=wts.reduce((a,b)=>a+b,0)||1;let parts=wts.map(w=>Math.max(1,Math.round(D*w/ws)));let diff=D-parts.reduce((a,b)=>a+b,0);for(let i=0;diff!==0&&h;i=(i+1)%h){if(diff>0){parts[i]++;diff--;}else if(parts[i]>1){parts[i]--;diff++;}}
    const gap=mode==='auto'?.075:mode==='fan'?.08:ty==='pellets'?.3:ty==='beam'?.22:.2;let tFire=0,pi=0;const rounds=[];
    for(let i=0;i<n;i++){const isHit=hitSet.has(i);rounds.push({fire:tFire,hit:isHit,dmg:isHit?parts[pi++]:0,
      dAng:isHit?(R()-.5)*.03:(R()<.5?-1:1)*(.07+R()*.14),range:isHit?1:(R()<.65?1.2+R()*.45:.8+R()*.1),jx:(R()-.5)*8,jy:(R()-.5)*10});tFire+=gap*(mode==='semi'?.75+R()*.5:1);}
    return{key,mode,rounds,hit,total:hit?D:0};}
  /* where and when each round of a volley lands, for impacts, damage numbers and decals */
  function volleyImpacts(plan,x0,y0,x1,y1){const P=PROJ[plan.key]||PROJ.akli,d=Math.hypot(x1-x0,y1-y0),a=Math.atan2(y1-y0,x1-x0);
    return plan.rounds.map(r=>{const aa=a+r.dAng,dd=d*r.range;const x=x0+Math.cos(aa)*dd+(r.hit?r.jx:0),y=y0+Math.sin(aa)*dd+(r.hit?r.jy:0);return{at:r.fire+(P.type==='beam'||P.type==='melee'?.02:dd/P.speed),x,y,hit:r.hit,dmg:r.dmg};});}
  function shotTimes(key,mode,dist){const P=PROJ[key]||PROJ.akli;const r=P.type==='beam'?[0]:(MODE_ROUNDS[mode]||MODE_ROUNDS.semi);return r.map(d=>d+(P.type==='beam'||P.type==='melee'?.02:dist/P.speed));}
  function shot(c,key,x0,y0,x1,y1,time,o){o=o||{};const P=PROJ[key]||PROJ.akli,[core,glow]=STYLE[P.style]||STYLE.bhord;const mode=o.mode||'semi';const rn=mkRng(o.seed||7);
    if(P.type==='melee')return;
    // the rounds: from a volley plan if given, otherwise the simple mode pattern
    let R2;if(o.plan){const imp=volleyImpacts(o.plan,x0,y0,x1,y1);R2=o.plan.rounds.map((r,i)=>({d:r.fire,tx:imp[i].x,ty:imp[i].y}));}
    else{const base=P.type==='beam'?[0]:(MODE_ROUNDS[mode]||MODE_ROUNDS.semi);const d0=Math.hypot(x1-x0,y1-y0),a0=Math.atan2(y1-y0,x1-x0);R2=base.map(d=>{const sp=(mode==='auto'||mode==='fan')?(rn()-.5)*(mode==='fan'?.12:.07):0;return{d,tx:x0+Math.cos(a0+sp)*d0,ty:y0+Math.sin(a0+sp)*d0};});}
    R2.forEach((rd,ri)=>{const tt=time-rd.d;if(tt<0)return;const dist=Math.hypot(rd.tx-x0,rd.ty-y0),a=Math.atan2(rd.ty-y0,rd.tx-x0),ca=Math.cos(a),sa=Math.sin(a);
      if(P.type==='beam'){const life=.14;if(tt>life)return;const k=tt/life;c.save();c.translate(x0,y0);c.rotate(a);c.globalAlpha=1-k*k;c.lineCap='round';c.strokeStyle=rgba(glow,.35);c.lineWidth=P.w*3;c.beginPath();c.moveTo(0,0);c.lineTo(dist,0);c.stroke();
        c.strokeStyle=glow;c.lineWidth=P.w;c.shadowColor=glow;c.shadowBlur=12;c.stroke();c.shadowBlur=0;c.strokeStyle=core;c.lineWidth=P.w*.4;c.beginPath();for(let i=0;i<=24;i++){const u=i/24;c.lineTo(u*dist,Math.sin(u*40+tt*60)*P.w*.25);}c.stroke();circ(c,dist,0,P.w*2*(1-k));c.fillStyle=core;c.fill();c.restore();return;}
      const travel=tt*P.speed;if(travel/dist>1.02)return;const hx=x0+ca*Math.min(travel,dist),hy=y0+sa*Math.min(travel,dist);
      const draw1=(ox,oy,len,w)=>{c.save();c.translate(hx+ox,hy+oy);c.rotate(a);
        if(P.type==='tracer'||P.type==='pellets'||P.type==='slug'||P.type==='rail'){const L2=Math.min(len,travel);const g=c.createLinearGradient(-L2,0,0,0);g.addColorStop(0,rgba(glow,0));g.addColorStop(.6,rgba(glow,.9));g.addColorStop(1,core);
          c.lineCap='round';c.strokeStyle=g;c.lineWidth=w*1.8;c.beginPath();c.moveTo(-L2,0);c.lineTo(0,0);c.stroke();c.strokeStyle=core;c.lineWidth=w*.6;c.beginPath();c.moveTo(-L2*.4,0);c.lineTo(0,0);c.stroke();
          if(P.type==='slug'){for(let i=1;i<4;i++){c.globalAlpha=.35/i;circ(c,-L2-i*9,Math.sin(i*2+tt*30)*1.4,2+i);c.fillStyle='#d8d8d8';c.fill();}c.globalAlpha=1;}
          if(P.type==='rail'){c.globalAlpha=.25;c.strokeStyle=glow;c.lineWidth=1;c.beginPath();c.moveTo(-Math.min(travel,dist),0);c.lineTo(0,0);c.stroke();c.globalAlpha=1;}}
        else if(P.type==='dart'){c.beginPath();c.moveTo(4,0);c.lineTo(-len,-w*.6);c.lineTo(-len*.7,0);c.lineTo(-len,w*.6);c.closePath();c.fillStyle=glow;c.shadowColor=glow;c.shadowBlur=10;c.fill();c.shadowBlur=0;c.beginPath();c.moveTo(3,0);c.lineTo(-len*.6,-w*.25);c.lineTo(-len*.6,w*.25);c.closePath();c.fillStyle=core;c.fill();}
        else if(P.type==='bolt'||P.type==='unstable'){const wob=P.type==='unstable'?Math.sin(tt*50+ri)*3:0,ws=P.type==='unstable'?w*(.8+.5*Math.sin(tt*37+ri)):w;c.translate(0,wob);
          const g=c.createLinearGradient(-len*3,0,0,0);g.addColorStop(0,rgba(glow,0));g.addColorStop(1,rgba(glow,.5));c.fillStyle=g;c.fillRect(-len*3,-ws*.5,len*3,ws);
          c.shadowColor=glow;c.shadowBlur=12;rr(c,-len,-ws*.7,len,ws*1.4,ws*.7);c.fillStyle=glow;c.fill();c.shadowBlur=0;rr(c,-len*.8,-ws*.3,len*.75,ws*.6,ws*.3);c.fillStyle=core;c.fill();
          if(P.type==='unstable'&&Math.sin(tt*29+ri)>.4){c.fillStyle=glow;for(let i=0;i<3;i++)c.fillRect(-len*.5-i*6,(rn()-.5)*10,2,2);}}
        else if(P.type==='ring'){c.beginPath();c.ellipse(0,0,w*.6,w*(1.2+.3*Math.sin(tt*40)),0,0,TAU);c.lineWidth=2.4;c.strokeStyle=glow;c.shadowColor=glow;c.shadowBlur=8;c.stroke();c.shadowBlur=0;c.globalAlpha=.4;c.beginPath();c.ellipse(-10,0,w*.5,w,0,0,TAU);c.stroke();c.globalAlpha=1;}
        else if(P.type==='rocket'||P.type==='missile'){const f=1+Math.sin(tt*40)*.3;c.beginPath();c.moveTo(-len,-w*.4);c.lineTo(-len-10*f,0);c.lineTo(-len,w*.4);c.fillStyle='#ffb347';c.fill();rr(c,-len,-w*.5,len,w,w*.5);ink(c,P.type==='missile'?'#d5dbea':'#6a7040',1.2);
          c.beginPath();c.moveTo(0,-w*.5);c.lineTo(4,0);c.lineTo(0,w*.5);c.closePath();c.fillStyle=P.type==='missile'?glow:'#d8502e';c.fill();if(P.type==='missile'&&Math.sin(tt*20)>0){circ(c,-len*.4,0,1.2);c.fillStyle='#ff4a3d';c.fill();}}
        c.restore();};
      if(P.type==='pellets'){const n=P.pellets||6;for(let i=0;i<n;i++){const pa=(i/(n-1)-.5)*(P.spread||.15);const off=Math.min(travel,dist);const px=x0+Math.cos(a+pa)*off,py=y0+Math.sin(a+pa)*off;c.save();c.translate(px-hx,py-hy);draw1(0,0,P.len,P.w);c.restore();}}
      else if(P.twin){const nx=-sa*P.twin,ny=ca*P.twin;draw1(nx,ny,P.len,P.w);draw1(-nx,-ny,P.len,P.w);}
      else draw1(0,0,P.len*(P.heavy?1.2:1),P.w);
      if(P.type==='rocket'||P.type==='missile'){for(let i=1;i<14;i++){const back=i*10;if(back>travel)break;const tk=Math.min(1,(i*10/P.speed)/0.9);c.save();c.globalAlpha=(1-tk)*.55;circ(c,hx-ca*back+Math.sin(i*1.7)*2,hy-sa*back+Math.cos(i*2.1)*2,2.6+i*.5);ink(c,'#c8c8cc',.8);c.restore();}}});}
  let GORE=true;
  function bloodSplat(c,x,y,r,seed,a){const rn=mkRng(seed||3);c.save();c.globalAlpha=a==null?.9:a;c.fillStyle='#8a0e1e';ell(c,x,y,r,r*.45);c.fill();for(let i=0;i<7;i++){const an=rn()*TAU,d=r*(.8+rn()*.9);ell(c,x+Math.cos(an)*d,y+Math.sin(an)*d*.45,r*(.12+rn()*.18),r*(.08+rn()*.1));c.fill();}c.fillStyle='rgba(255,255,255,.18)';ell(c,x-r*.3,y-r*.12,r*.25,r*.08);c.fill();c.restore();}
  function impact(c,x,y,k,o){o=o||{};const dt2=o.dtype||'ballistic',sf=o.surface||'flesh',dir=o.dir==null?0:o.dir,[core,glow]=STYLE[o.style]||STYLE.bhord;const gore=o.gore==null?GORE:o.gore,S=o.size||1;const e=1-k;
    const flash=(r,col)=>{if(k<.12){circ(c,x,y,r*(1-k/.12)+2);c.fillStyle=col||'#fffbe6';c.fill();}};
    const drops=(n,col,spd,size)=>{const rn=mkRng(o.seed||11);for(let i=0;i<n;i++){const an=dir+(rn()-.5)*1.3,v=(40+rn()*spd)*S;const px=x+Math.cos(an)*v*k,py=y+Math.sin(an)*v*k+90*k*k*S;const sz=(size||2.2)*(.6+rn()*.8)*S*(1-k*.4);c.save();c.globalAlpha=Math.min(1,e*1.6);ell(c,px,py,sz*1.3,sz);c.fillStyle=col;c.fill();c.lineWidth=.8;c.strokeStyle=rgba(C.ink,.6);c.stroke();c.restore();}};
    const lines=(n,col,len)=>{c.save();c.globalAlpha=e;c.strokeStyle=col;c.lineWidth=2*S;c.lineCap='round';for(let i=0;i<n;i++){const an=dir+Math.PI+(i/(n-1)-.5)*1.8,r0=(6+k*10)*S;c.beginPath();c.moveTo(x+Math.cos(an)*r0,y+Math.sin(an)*r0);c.lineTo(x+Math.cos(an)*(r0+len*e*S),y+Math.sin(an)*(r0+len*e*S));c.stroke();}c.restore();};
    const puff=(col,n)=>{for(let i=0;i<(n||3);i++){c.save();c.globalAlpha=e*.7;circ(c,x+Math.cos(dir+Math.PI+i)*k*10*S,y-k*14*S-i*3,(3+k*8)*S);ink(c,col,1);c.restore();}};
    if(sf==='shield'){c.save();c.globalAlpha=e;for(let i=0;i<2;i++){const r=(6+k*20+i*6)*S;c.beginPath();for(let q=0;q<6;q++){const an=q*Math.PI/3+Math.PI/6;c.lineTo(x+Math.cos(an)*r,y+Math.sin(an)*r*.85);}c.closePath();c.lineWidth=2-i*.8;c.strokeStyle=C.shield;c.shadowColor=C.shield;c.shadowBlur=8;c.stroke();}c.restore();flash(5,'#e8ffff');return;}
    if(sf==='armour'){flash(6);c.save();c.globalAlpha=e;for(let i=0;i<7;i++){const an=dir+Math.PI+(i-3)*.42,d=(4+k*20)*S;c.strokeStyle=i%2?'#fff3b0':'#ffd866';c.lineWidth=1.6;c.beginPath();c.moveTo(x+Math.cos(an)*d*.35,y+Math.sin(an)*d*.35);c.lineTo(x+Math.cos(an)*d,y+Math.sin(an)*d);c.stroke();}c.restore();
      {const ra=dir+Math.PI+.9,rl=(10+k*40)*S;c.save();c.globalAlpha=e;c.strokeStyle='#fffbe6';c.lineWidth=1.6*S;c.lineCap='round';c.beginPath();c.moveTo(x+Math.cos(ra)*rl*.4,y+Math.sin(ra)*rl*.4);c.lineTo(x+Math.cos(ra)*rl,y+Math.sin(ra)*rl);c.stroke();c.restore();}
      c.save();c.globalAlpha=e*.8;c.beginPath();c.arc(x,y,(3+k*9)*S,0,TAU);c.lineWidth=1.4;c.strokeStyle='#dce4f0';c.stroke();c.restore();
      drops(3,'#a8b4c8',60,1.6);return;}
    if(sf==='cover'){flash(4,'#fff3e0');puff('#b8a080',4);drops(5,'#7a6a5a',80,1.8);return;}
    if(sf==='robot'){flash(6,'#e8ffff');lines(5,'#fff3b0',8);drops(5,'#1a1410',90,2);if(k<.5){c.save();c.strokeStyle=C.shield;c.lineWidth=1.4;c.globalAlpha=e;c.beginPath();let px=x,py=y;c.moveTo(px,py);for(let i=0;i<4;i++){px+=(Math.sin(k*90+i*3)*6)*S;py-=5*S;c.lineTo(px,py);}c.stroke();c.restore();}return;}
    if(sf==='hull'){flash(8,core);lines(6,'#ffd27a',10);drops(6,'#ff9a3a',110,1.6);if(k>.1){c.save();c.globalAlpha=e*.7;for(let i=0;i<4;i++){const an=dir+Math.PI+(i-1.5)*.25;circ(c,x+Math.cos(an)*k*30*S,y+Math.sin(an)*k*30*S,(2+k*7)*S);c.fillStyle='#e8eef6';c.fill();}c.restore();}return;}
    // flesh
    if(dt2==='plasma'||dt2==='laser'){flash(7,glow);c.save();c.globalAlpha=e;c.beginPath();c.arc(x,y,(4+k*8)*S,0,TAU);c.lineWidth=2.4*S;c.strokeStyle=glow;c.shadowColor=glow;c.shadowBlur=8;c.stroke();c.restore();puff('#7a7a82',3);if(gore)drops(3,'#b0102a',60,2);return;}
    if(dt2==='melee'){lines(5,'#fffaf0',10);if(gore)drops(4,'#b0102a',70,2.2);else puff('#c8b08a',2);return;}
    if(dt2==='explosive'){if(gore)drops(10,'#b0102a',160,2.6);puff('#8a8a92',3);return;}
    flash(5,'#fff3e0');if(gore){drops(9,'#b0102a',120,3);c.save();c.globalAlpha=e*.5;circ(c,x+Math.cos(dir)*k*10,y+Math.sin(dir)*k*10,(3+k*9)*S);c.fillStyle='#c0303a';c.fill();c.restore();}else{puff('#c8b08a',3);lines(4,'#fffaf0',6);}}
  /* muzzle flash in the weapon maker's colours, shaped by the projectile type */
  function muzzleFor(c,x,key,mode,t){const P=PROJ[key]||PROJ.akli,[core,glow]=STYLE[P.style]||STYLE.bhord;const big=P.type==='pellets'||P.type==='rocket'||mode==='single'?1.5:P.heavy?1.3:1;
    if(P.type==='beam'){const g=c.createRadialGradient(x+2,0,0,x+2,0,10*big);g.addColorStop(0,core);g.addColorStop(.4,glow);g.addColorStop(1,rgba(glow,0));c.fillStyle=g;circ(c,x+2,0,10*big);c.fill();c.strokeStyle=rgba(core,.8);c.lineWidth=1.2;c.beginPath();c.moveTo(x-6,0);c.lineTo(x+12,0);c.moveTo(x+3,-8);c.lineTo(x+3,8);c.stroke();return;}
    if(P.type==='bolt'||P.type==='dart'||P.type==='unstable'||P.type==='ring'){const g=c.createRadialGradient(x+3,0,0,x+3,0,9*big);g.addColorStop(0,core);g.addColorStop(.5,glow);g.addColorStop(1,rgba(glow,0));c.fillStyle=g;circ(c,x+3,0,9*big);c.fill();return;}
    const g=c.createRadialGradient(x+4,0,0,x+4,0,10*big);g.addColorStop(0,core);g.addColorStop(.45,glow);g.addColorStop(1,rgba(glow,0));c.fillStyle=g;c.beginPath();
    const spikes=P.type==='pellets'?7:5;for(let i=0;i<spikes*2;i++){const a=(i/(spikes*2))*TAU,r=(i%2?3.6:(i===0?14:9))*big;c.lineTo(x+3+Math.cos(a)*r,Math.sin(a)*r*(P.type==='pellets'?1:.75));}c.closePath();c.fill();
    if(P.type==='rocket'){c.fillStyle='rgba(220,220,220,.7)';for(let i=0;i<3;i++){circ(c,-20-i*6,Math.sin(i*2)*2,4+i*1.5);c.fill();}}}
  /* ship shield bubble flare where a shot lands */
  function shipShield(c,x,y,r,k,hx,hy){c.save();c.globalAlpha=(1-k)*.9;c.beginPath();c.ellipse(x,y,r,r*.8,0,0,TAU);c.fillStyle=rgba(C.shield,.08);c.fill();c.lineWidth=2;c.strokeStyle=rgba(C.shield,.5);c.shadowColor=C.shield;c.shadowBlur=10;c.stroke();
    c.clip();const g=c.createRadialGradient(hx,hy,0,hx,hy,r*.9);g.addColorStop(0,rgba('#e8ffff',.7));g.addColorStop(.35,rgba(C.shield,.35));g.addColorStop(1,rgba(C.shield,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}

  /* =================================================================
     JUICE — the feedback layer. Every action answers back with
     anticipation, impact and follow-through, layered from small cues.
     The game owns time: everything here takes progress k (0..1) or dt.
       ease.*            easing curves (nothing in the world moves linearly)
       Shake()           trauma-based screen shake: add(), update(dt), offset(t)
       Particles()       sparks, debris, smoke, dust, casings, embers, shards, confetti, coins
       explosion/hit/ring/shieldBreak/shipExplode/popText/pickup/transition
     ================================================================= */
  const ease={
    linear:k=>k,outCubic:k=>1-Math.pow(1-k,3),inOutCubic:k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,outExpo:k=>k>=1?1:1-Math.pow(2,-10*k),
    outBack:k=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(k-1,3)+c1*Math.pow(k-1,2);},
    outElastic:k=>k<=0?0:k>=1?1:Math.pow(2,-10*k)*Math.sin((k*10-.75)*(2*Math.PI)/3)+1,
    outBounce:k=>{const n=7.5625,d=2.75;if(k<1/d)return n*k*k;if(k<2/d)return n*(k-=1.5/d)*k+.75;if(k<2.5/d)return n*(k-=2.25/d)*k+.9375;return n*(k-=2.625/d)*k+.984375;},
  };
  /* trauma shake (Eiserloh): trauma 0..1 decays; offset grows with trauma² so small hits stay small */
  function Shake(o){o=Object.assign({maxX:14,maxY:10,maxA:.035,decay:1.6,freq:22},o||{});const S={trauma:0,enabled:true,
    add(a){this.trauma=Math.min(1,this.trauma+a);return this;},update(dt){this.trauma=Math.max(0,this.trauma-o.decay*dt);return this;},
    offset(t){if(!this.enabled||this.trauma<=0)return{x:0,y:0,a:0};const q=this.trauma*this.trauma,n=(s2)=>Math.sin(t*o.freq+s2)*.6+Math.sin(t*o.freq*1.7+s2*2.1)*.4;return{x:o.maxX*q*n(1.3),y:o.maxY*q*n(7.1),a:o.maxA*q*n(3.7)};}};return S;}
  /* what each event should do — the shared vocabulary for the game */
  const JUICE={
    shot:{hitstop:0,trauma:.04,flash:0,parts:'casing + muzzle smoke'},
    hit:{hitstop:50,trauma:.12,flash:.8,parts:'a volley: per-round impacts and split damage numbers'},
    armourHit:{hitstop:40,trauma:.08,flash:.5,parts:'sparks, ricochet streak, metal ring; plate chip'},
    crit:{hitstop:110,trauma:.3,flash:1,parts:'big sparks; CRIT pop; slow ring'},
    down:{hitstop:140,trauma:.35,flash:1,parts:'topple with bounce; dust; stars; DOWN pop'},
    grenade:{hitstop:90,trauma:.55,flash:0,parts:'flash, fireball, shockwave, debris, smoke, scorch'},
    rocket:{hitstop:120,trauma:.7,flash:0,parts:'as grenade, bigger; knockback dust'},
    shieldBreak:{hitstop:80,trauma:.25,flash:.6,parts:'hex shards + ring'},
    shipKill:{hitstop:160,trauma:.6,flash:1,parts:'ship breaks in three, fireball, debris spin'},
    loot:{hitstop:0,trauma:0,flash:0,parts:'item pops out with a bounce; coin sparkle'},
    promote:{hitstop:0,trauma:.1,flash:0,parts:'confetti; star burst behind portrait'},
  };
  function Particles(){const L=[];const R=Math.random;
    const P={list:L,
      emit(kind,x,y,o){o=o||{};const n=o.n||{spark:8,debris:6,smoke:4,dust:6,casing:1,ember:6,plasma:6,shard:10,confetti:24,coin:6}[kind]||6;const floor=o.floor==null?y+(o.fh||0):o.floor;
        for(let i=0;i<n;i++){const a=(o.dir!=null?o.dir:-Math.PI/2)+(R()-.5)*(o.spread!=null?o.spread:TAU);const sp=(o.speed||{spark:260,debris:180,smoke:20,dust:60,casing:90,ember:40,plasma:160,shard:200,confetti:220,coin:120}[kind]||100)*(.5+R()*.7);
          L.push({kind,x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0,max:(o.life||{spark:.32,debris:1.2,smoke:1.5,dust:.7,casing:.9,ember:1.2,plasma:.5,shard:.8,confetti:1.8,coin:.9}[kind]||1)*(.7+R()*.6),
            rot:R()*TAU,vr:(R()-.5)*14,size:(o.size||1)*(.7+R()*.6),col:o.col,floor,seed:R()*100,bounced:0});}return this;},
      update(dt){for(let i=L.length-1;i>=0;i--){const p=L[i];p.life+=dt;if(p.life>=p.max){L.splice(i,1);continue;}
        const g={spark:500,debris:620,casing:700,plasma:400,shard:380,confetti:180,coin:520}[p.kind]||0;p.vy+=g*dt;
        if(p.kind==='smoke'||p.kind==='ember'){p.vy-=30*dt;p.vx*=.98;}if(p.kind==='dust'){p.vx*=.92;p.vy*=.9;}if(p.kind==='confetti'){p.vx*=.97;p.vy=Math.min(p.vy,60);}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
        if((p.kind==='debris'||p.kind==='casing'||p.kind==='coin')&&p.y>p.floor&&p.vy>0){p.y=p.floor;p.vy*=-.35;p.vx*=.6;p.vr*=.5;p.bounced++;}}return this;},
      draw(c){for(const p of L){const k=p.life/p.max,a=1-k;c.save();c.translate(p.x,p.y);
        switch(p.kind){
          case'spark':c.rotate(Math.atan2(p.vy,p.vx));c.globalAlpha=a;c.fillStyle=k<.4?'#fffbe6':(p.col||'#ffb347');c.fillRect(-6*p.size*a,-1,12*p.size*a,2);break;
          case'debris':c.rotate(p.rot);c.globalAlpha=Math.min(1,a*2);poly(c,[[-3*p.size,-2*p.size],[3*p.size,-1.5*p.size],[1.6*p.size,2.6*p.size],[-2.4*p.size,1.8*p.size]]);ink(c,p.col||'#5a4a3e',1.2);break;
          case'smoke':c.globalAlpha=.75*a;circ(c,0,0,(4+k*14)*p.size);ink(c,p.col||'#8a8a92',1.4);break;
          case'dust':c.globalAlpha=.7*a;circ(c,0,0,(3+k*8)*p.size);ink(c,p.col||'#c8b08a',1);break;
          case'casing':c.rotate(p.rot);rr(c,-2*p.size,-1*p.size,4*p.size,2*p.size,.8);ink(c,C.gold,.8);break;
          case'ember':c.globalAlpha=a;circ(c,0,0,1.6*p.size);c.fillStyle=k<.5?'#fff3b0':'#ff8a2a';c.shadowColor='#ff8a2a';c.shadowBlur=6;c.fill();break;
          case'plasma':c.globalAlpha=a;circ(c,0,0,2*p.size);c.fillStyle=p.col||'#ff6a8a';c.fill();break;
          case'shard':c.rotate(p.rot);c.globalAlpha=a;c.beginPath();for(let q=0;q<3;q++){const an=q*TAU/3;c.lineTo(Math.cos(an)*3.4*p.size,Math.sin(an)*2.4*p.size);}c.closePath();c.fillStyle=rgba(p.col||C.shield,.7);c.fill();c.lineWidth=1;c.strokeStyle=p.col||C.shield;c.stroke();break;
          case'confetti':c.rotate(p.rot);c.scale(1,Math.cos(p.life*12+p.seed));c.globalAlpha=Math.min(1,a*2);c.fillStyle=['#ff4a3d','#fffaf0',C.gold][Math.floor(p.seed)%3];c.fillRect(-3,-1.6,6,3.2);break;
          case'coin':c.scale(Math.cos(p.life*14+p.seed),1);circ(c,0,0,3*p.size);ink(c,C.gold,1.2);break;
        }c.restore();}return this;}};return P;}
  function ring(c,x,y,k,col,o){o=o||{};const r=(o.r||40)*ease.outCubic(k);c.save();c.globalAlpha=1-k;c.beginPath();c.ellipse(x,y,r,r*(o.flat||.45),0,0,TAU);c.lineWidth=(o.w||6)*(1-k)+1;c.strokeStyle=C.ink;c.stroke();c.lineWidth=(o.w||6)*(1-k)*.6+.6;c.strokeStyle=col||'#fffbe6';c.stroke();c.restore();}
  function shieldBreak(c,x,y,k){ring(c,x,y-26,k,C.shield,{r:46,flat:1,w:5});c.save();c.globalAlpha=1-k;for(let i=0;i<12;i++){const a=i*TAU/12+.2,d=ease.outCubic(k)*46,px=x+Math.cos(a)*(20+d),py=y-26+Math.sin(a)*(26+d)+k*k*30;c.save();c.translate(px,py);c.rotate(a+k*6);c.beginPath();for(let q=0;q<6;q++){const an=q*Math.PI/3;c.lineTo(Math.cos(an)*4,Math.sin(an)*4);}c.closePath();c.fillStyle=rgba(C.shield,.5);c.fill();c.lineWidth=1.2;c.strokeStyle=C.shield;c.stroke();c.restore();}c.restore();}
  /* damage numbers and callouts: overshoot pop, arc up, fade */
  function popText(c,text,x,y,k,col,o){o=o||{};const sc=k<.25?ease.outBack(k/.25)*(o.crit?1.5:1):(o.crit?1.5:1)*(1-Math.max(0,k-.75)*2);const dx=(o.dir||1)*k*14,dy=-ease.outCubic(k)*(o.crit?44:30);
    c.save();c.translate(x+dx,y+dy);if(o.crit)c.rotate(Math.sin(k*40)*.06*(1-k));c.scale(sc,sc);c.globalAlpha=k>.8?(1-k)*5:1;c.font=`900 ${o.size||18}px "Bungee","Exo 2",system-ui`;c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=6;c.lineJoin='round';c.strokeStyle=C.ink;c.strokeText(text,0,2);c.strokeText(text,0,0);c.fillStyle=col||'#fffaf0';c.fillText(text,0,0);c.restore();}
  function pickup(c,key,x,y,k,t){const up=k<.5?ease.outBack(k/.5):1,yy=y-up*34+(k>.5?ease.outBounce((k-.5)/.5)*0:0);const sc=k<.75?1:1-(k-.75)*4;
    c.save();c.globalAlpha=Math.min(1,k*6);for(let i=0;i<8;i++){const a=i*TAU/8+t*2,r=14+Math.sin(t*6+i)*3;star(c,x+Math.cos(a)*r,yy+Math.sin(a)*r*.7,2.2,C.gold);}c.restore();
    c.save();c.translate(x,yy);c.scale(Math.max(.01,sc),Math.max(.01,sc));item(c,key,0,0,44,t);c.restore();}
  /* ship destruction: the hull breaks in three, spinning apart inside a fireball */
  function shipExplode(c,id,x,y,ang,s,k,t,o){o=o||{};const D=SHIPS[id];if(!D)return;
    if(k<.12){circ(c,x,y,(10+k*200)*s/3);c.fillStyle='#fffbe6';c.fill();}
    const cuts=[[-99,-6],[-6,6],[6,99]];cuts.forEach(([a,b],i)=>{const dir=ang+(i-1)*1.4+Math.PI*(i===1?.5:0);const d=ease.outCubic(k)*30*s/3;c.save();c.globalAlpha=k>.7?(1-k)/.3:1;
      const cx=x+Math.cos(dir)*d,cy=y+Math.sin(dir)*d;c.translate(cx,cy);c.rotate(ang+(i-1)*k*2.5);c.beginPath();c.rect(a*s,-40*s,(b-a)*s,80*s);c.clip();c.rotate(-ang);ship(c,id,0,0,ang,s,t,Object.assign({},o,{damage:1,parked:true}));c.restore();});
    if(k>.04)explosion(c,x,y,Math.min(1,(k-.04)/.9),{size:s/2.4});}
  /* scene transitions (overlay drawn over everything; k 0..1, covered at .5) */
  function transition(c,W,H,k,type,o){o=o||{};const cover=k<.5?ease.inOutCubic(k*2):1-ease.inOutCubic((k-.5)*2);c.save();
    if(type==='iris'){const R=Math.hypot(W,H)*.6*(1-cover);c.beginPath();c.rect(0,0,W,H);c.arc(o.x||W/2,o.y||H/2,Math.max(0,R),0,TAU,true);c.fillStyle=C.ink;c.fill('evenodd');if(R>0){c.beginPath();c.arc(o.x||W/2,o.y||H/2,R,0,TAU);c.lineWidth=6;c.strokeStyle=C.rebel;c.stroke();}}
    else if(type==='stripes'){const n=9,bw=(W+H)/n;for(let i=0;i<n;i++){const d=Math.max(0,Math.min(1,cover*1.6-i*.07));if(d<=0)continue;c.save();c.translate(-H+i*bw,0);c.beginPath();c.moveTo(0,0);c.lineTo(bw*d*1.02,0);c.lineTo(bw*d*1.02+H,H);c.lineTo(H,H);c.closePath();c.fillStyle=i%2?C.ink:C.rebel;c.fill();c.restore();}}
    else if(type==='hyperspace'){c.fillStyle=rgba('#0a0c22',cover);c.fillRect(0,0,W,H);const rn=mkRng(7);for(let i=0;i<90;i++){const a=rn()*TAU,r0=20+rn()*W*.3,len=cover*W*.5*(.5+rn());const cx=W/2,cy=H/2;c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len));c.lineWidth=1+rn()*2;c.strokeStyle=rn()<.3?C.hegHi:'#fffbe6';c.globalAlpha=Math.min(1,cover*1.5);c.stroke();}
      if(Math.abs(k-.5)<.06){c.globalAlpha=1-Math.abs(k-.5)/.06;c.fillStyle='#fff';c.fillRect(0,0,W,H);}}
    else if(type==='flag'){const x0=-W*1.2+cover*W*1.25;c.translate(x0,0);c.beginPath();c.moveTo(0,0);c.lineTo(W*1.1,0);for(let yy=0;yy<=H;yy+=H/8)c.lineTo(W*1.1+Math.sin(yy*.05+k*20)*14,yy);c.lineTo(0,H);c.closePath();c.fillStyle=C.rebel;c.fill();c.lineWidth=8;c.strokeStyle=C.ink;c.stroke();
      if(o.text&&cover>.85){c.font=`900 ${Math.min(64,W*.07)}px "Bungee","Exo 2",system-ui`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=8;c.strokeStyle=C.ink;c.strokeText(o.text,W*.6,H/2);c.fillStyle='#fffaf0';c.fillText(o.text,W*.6,H/2);}}
    c.restore();}

  /* =================================================================
     HAVEN ROCK — the base. One furniture set, two zoom levels: every room
     is laid out in floor units (100 per tile, x along the grid's columns,
     y along its rows) and drawn through a projection, so the same layout
     furnishes the room on the base map and in its walk-in view.
       baseBackdrop(c,W,H,t,o)            sky, peaks and the mountain around the grid
       baseTile(c,kind,x,y,S,o)           rock · rubble (o.dig) · floor (corridor)
       baseRoom(c,tiles,key,cellToCss,S,o) a room (or merged room) on the map
       roomInterior(c,key,o)              the walk-in view; returns {posts,beds,pads}
     o (rooms): {up:[...], cap, fill, build:{days,total}, t, alert, mini}
     ================================================================= */
  const RCOL={command:C.gold,hangar:C.shield,barracks:C.rebel,store:C.go,comms:C.shield,diplo:C.rebelHi,workshop:'#b9c5e6',infirmary:'#2ab0a0',training:'#c084fc'};
  const FLOOR={command:['#2a2f45','#323854'],hangar:['#3a3c44','#44464e'],barracks:['#4a3a2e','#55443a'],store:['#3e3a30','#48443a'],comms:['#1e2a3a','#243246'],diplo:['#4a2a30','#55333a'],workshop:['#3a3a3e','#444448'],infirmary:['#dfe6ea','#e8eef0'],training:['#2e3a2e','#36443a']};
  function rockFace(c,pts,col,seed){poly(c,pts);c.fillStyle=col;c.fill();c.save();poly(c,pts);c.clip();const rn=mkRng(seed||3);const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    for(let i=0;i<6;i++){const fx=x0+rn()*(x1-x0),fy=y0+rn()*(y1-y0),s=(x1-x0)*(.12+rn()*.12);poly(c,[[fx,fy],[fx+s,fy+s*.3],[fx+s*.4,fy+s*.7]]);c.fillStyle=rn()<.5?shade(col,.1):shade(col,-.15);c.fill();}c.restore();}
  function baseBackdrop(c,W,H,t,o){o=o||{};const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a0c22');g.addColorStop(.55,'#141836');g.addColorStop(1,'#1e1a2e');c.fillStyle=g;c.fillRect(0,0,W,H);
    const rn=mkRng(41);for(let i=0;i<70;i++){c.fillStyle=rgba('#ffffff',.2+rn()*.5);c.fillRect(rn()*W,rn()*H*.5,1.4,1.4);}
    c.fillStyle='#161a30';c.beginPath();c.moveTo(0,H*.42);for(let x=0;x<=W;x+=W/12)c.lineTo(x,H*.3+Math.sin(x*.013+1)*H*.06+Math.sin(x*.041)*H*.03);c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fill();
    if(o.mountain){const m=o.mountain;poly(c,m);c.fillStyle='#231f2c';c.fill();c.lineWidth=3;c.strokeStyle=C.ink;c.stroke();rockFace(c,m,'#231f2c',7);}
    if(o.alert){c.save();c.globalAlpha=.12+.1*Math.sin(t*4);c.fillStyle=C.rebel;c.fillRect(0,0,W,H);c.restore();}}
  function baseTile(c,kind,x,y,S,o){o=o||{};const w=34*S,h=17*S;const dia=(dy,ins)=>{const a=ins||0;poly(c,[[x,y-h+a+dy],[x+w-a*2,y+dy],[x,y+h-a+dy],[x-w+a*2,y+dy]]);};
    if(kind==='rock'){const H2=(o.height==null?9:o.height)*S;const rn=mkRng((o.r||0)*31+(o.c||0)*7+1);
      if(o.openS){poly(c,[[x-w,y],[x,y+h],[x,y+h-H2*0],[x-w,y]]);}
      // cliff faces toward dug-out space, then the jagged top
      if(o.openE){rockFace(c,[[x,y+h-H2],[x+w,y-H2],[x+w,y],[x,y+h]],'#3a3240',(o.r||0)*3+(o.c||0));c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();}
      if(o.openS){rockFace(c,[[x-w,y-H2],[x,y+h-H2],[x,y+h],[x-w,y]],'#2c2634',(o.r||0)*5+(o.c||0));c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();}
      const top=[[x,y-h-H2],[x+w,y-H2],[x,y+h-H2],[x-w,y-H2]];rockFace(c,top,'#2a2534',(o.r||0)*7+(o.c||0)*11);c.lineWidth=1;c.strokeStyle=rgba(C.ink,.7);c.stroke();
      if(rn()<.2){const cx=x+(rn()-.5)*w,cy=y-H2+(rn()-.5)*h*.6;poly(c,[[cx,cy-6*S],[cx+2.4*S,cy],[cx,cy+2*S],[cx-2.4*S,cy]]);c.fillStyle=rgba(C.shield,.55);c.fill();}
      return;}
    if(kind==='rubble'){dia(0,1);c.fillStyle='#1a1726';c.fill();c.lineWidth=1;c.strokeStyle=rgba(C.ink,.8);c.stroke();const rn=mkRng((o.r||0)*13+(o.c||0)*5+2);
      for(let i=0;i<6;i++){const bx=x+(rn()-.5)*w*1.1,by=y+(rn()-.5)*h*.9,bs=(4+rn()*6)*S;poly(c,[[bx-bs,by],[bx-bs*.3,by-bs*.9],[bx+bs*.7,by-bs*.6],[bx+bs,by]]);ink(c,rn()<.5?'#4a4050':'#3a3344',1.2);}
      if(o.dig){c.save();dia(0,4);c.setLineDash([4,4]);c.lineWidth=1.6;c.strokeStyle=rgba(C.go,.8);c.stroke();c.restore();
        character(c,x-8*S,y+6*S,o.digger||'kel',{view:'side',dir:1,state:'dig',t:o.t||0,s:.45*S,gear:['hardhat']});
        rr(c,x+8*S,y-2*S,12*S,7*S,2*S);ink(c,'#6a5a4a',1.2);circ(c,x+10*S,y+5*S,2*S);c.fillStyle=C.ink;c.fill();circ(c,x+18*S,y+5*S,2*S);c.fill();
        c.save();c.globalAlpha=.5+.3*Math.sin((o.t||0)*3);const g=c.createRadialGradient(x,y,0,x,y,26*S);g.addColorStop(0,'rgba(255,214,140,.5)');g.addColorStop(1,'rgba(255,214,140,0)');c.fillStyle=g;c.fillRect(x-30*S,y-30*S,60*S,60*S);c.restore();}
      return;}
    if(kind==='floor'){dia(0,1);c.fillStyle=((o.r||0)+(o.c||0))%2?'#2a2a36':'#30303c';c.fill();c.lineWidth=1;c.strokeStyle=rgba(C.ink,.9);c.stroke();
      c.save();dia(0,4);c.clip();c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(x+i*7*S-w,y-h);c.lineTo(x+i*7*S+w,y+h);c.stroke();}c.restore();
      if(((o.r||0)*7+(o.c||0)*3)%4===0){const g=c.createRadialGradient(x,y,0,x,y,30*S);g.addColorStop(0,'rgba(255,214,140,.22)');g.addColorStop(1,'rgba(255,214,140,0)');c.fillStyle=g;dia(0,0);c.fill();circ(c,x,y-14*S,2*S);c.fillStyle='#fff3c8';c.fill();}
      return;}
  }
  /* --- furniture: drawn through proj(fx,fy,z) -> [x,y]; ZS scales heights and line weights --- */
  function furn(c,proj,ZS){
    const L=v=>Math.max(.6,v*ZS);
    const box=(x,y,w,d,h,col,z0)=>{z0=z0||0;const P=(a,b,z)=>proj(a,b,z);const top=[P(x,y,z0+h),P(x+w,y,z0+h),P(x+w,y+d,z0+h),P(x,y+d,z0+h)],front=[P(x,y+d,z0+h),P(x+w,y+d,z0+h),P(x+w,y+d,z0),P(x,y+d,z0)],side=[P(x+w,y,z0+h),P(x+w,y+d,z0+h),P(x+w,y+d,z0),P(x+w,y,z0)];
      poly(c,front);ink(c,shade(col,-.22),L(1.6));poly(c,side);ink(c,shade(col,-.4),L(1.6));poly(c,top);ink(c,shade(col,.06),L(1.6));return top;};
    const wallQuad=(x0,y0,x1,y1,z0,z1,col,lw)=>{poly(c,[proj(x0,y0,z0),proj(x1,y1,z0),proj(x1,y1,z1),proj(x0,y0,z1)]);ink(c,col,lw==null?L(1.4):lw);};
    const cyl=(x,y,r,h,col,z0)=>{z0=z0||0;const pts=[],pts2=[];for(let i=0;i<14;i++){const a=i/14*TAU;pts.push(proj(x+Math.cos(a)*r,y+Math.sin(a)*r,z0));pts2.push(proj(x+Math.cos(a)*r,y+Math.sin(a)*r,z0+h));}
      const hull=convexHull(pts.concat(pts2));poly(c,hull);ink(c,shade(col,-.2),L(1.4));poly(c,pts2);ink(c,shade(col,.08),L(1.2));};
    const glow=(x,y,z,r,col,a)=>{const[p0,p1]=proj(x,y,z);const g=c.createRadialGradient(p0,p1,0,p0,p1,r*ZS);g.addColorStop(0,rgba(col,a||.4));g.addColorStop(1,rgba(col,0));c.fillStyle=g;c.fillRect(p0-r*ZS,p1-r*ZS,r*ZS*2,r*ZS*2);};
    return{box,wallQuad,cyl,glow,L};}
  /* ---- the room's real shape: tiles {tx,ty} relative to its bounding box ---- */
  function shapeOf(tiles,W,D){const T=tiles&&tiles.length?tiles.map(q=>({tx:q[0],ty:q[1]})):(()=>{const a=[];for(let ty=0;ty<Math.round(D/100);ty++)for(let tx=0;tx<Math.round(W/100);tx++)a.push({tx,ty});return a;})();
    const key=(x,y)=>x+','+y,set=new Set(T.map(q=>key(q.tx,q.ty))),has=(x,y)=>set.has(key(x,y));
    const NW=[],WW=[],SE=[];const maxX=Math.max(...T.map(q=>q.tx)),maxY=Math.max(...T.map(q=>q.ty));
    for(let ty=0;ty<=maxY;ty++){let run=null;for(let tx=0;tx<=maxX+1;tx++){const ok=has(tx,ty)&&!has(tx,ty-1);if(ok){if(!run)run={y:ty*100,x0:tx*100};run.x1=tx*100+100;}else if(run){NW.push(run);run=null;}}}
    for(let tx=0;tx<=maxX;tx++){let run=null;for(let ty=0;ty<=maxY+1;ty++){const ok=has(tx,ty)&&!has(tx-1,ty);if(ok){if(!run)run={x:tx*100,y0:ty*100};run.y1=ty*100+100;}else if(run){WW.push(run);run=null;}}}
    for(const q of T){if(!has(q.tx+1,q.ty))SE.push({x0:q.tx*100+100,y0:q.ty*100,x1:q.tx*100+100,y1:q.ty*100+100});if(!has(q.tx,q.ty+1))SE.push({x0:q.tx*100,y0:q.ty*100+100,x1:q.tx*100+100,y1:q.ty*100+100});}
    const longest=(a,f)=>a.slice().sort((p,q)=>f(q)-f(p))[0];const mainN=longest(NW,r=>r.x1-r.x0),mainW=longest(WW,r=>r.y1-r.y0);
    const mx=T.reduce((s2,q)=>s2+q.tx,0)/T.length,my=T.reduce((s2,q)=>s2+q.ty,0)/T.length;const centre=T.slice().sort((p,q)=>Math.hypot(p.tx-mx,p.ty-my)-Math.hypot(q.tx-mx,q.ty-my))[0];
    const front=T.slice().sort((p,q)=>(q.tx+q.ty)-(p.tx+p.ty)||q.tx-p.tx);   // conversions claim the front-most real tiles
    return{T,has,NW,WW,SE,mainN,mainW,centre,front};}
  /* layout + draw for each room type, on the room's real tiles. Returns posts/beds/pads (floor units) */
  function furnishRoom(c,key,W,D,proj,ZS,o){const F=furn(c,proj,ZS),{box,wallQuad,cyl,glow,L}=F,t=o.t||0,up=new Set(o.up||[]);const items=[],posts=[],beds=[],pads=[];
    const add=(d,fn)=>items.push({d,fn});const col=RCOL[key]||C.steel;const SH=shapeOf(o.tiles,W,D),{T,has,NW,WW,mainN,mainW,centre,front}=SH;
    const cx=centre.tx*100+50,cy=centre.ty*100+50;const convs=[];const claim=()=>{for(const q of front){if(!convs.includes(q)&&!(T.length>1&&q===centre&&front.length>1&&convs.length<front.length-1&&false)){convs.push(q);return q;}}return null;};
    const isConv=q=>convs.includes(q);
    // wall-mounted things sit on real wall runs: north runs (fy = y+1) and west runs (fx = x+1)
    const screenN=(seg,x0,x1,z0,z1,colS)=>{add(-1,()=>{const y=seg.y+1;wallQuad(x0,y,x1,y,z0,z1,'#0d1426');c.save();poly(c,[proj(x0+2,y,z0+2),proj(x1-2,y,z0+2),proj(x1-2,y,z1-2),proj(x0+2,y,z1-2)]);c.clip();for(let i=0;i<4;i++){const zz=z0+4+i*(z1-z0-8)/4;c.beginPath();const a=proj(x0+4,y,zz),b=proj(x0+4+(x1-x0-8)*(.4+.5*Math.abs(Math.sin(t*1.3+i+x0))),y,zz);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineWidth=L(2);c.strokeStyle=rgba(colS,.8);c.stroke();}c.restore();});};
    const screenW=(seg,y0,y1,z0,z1,colS)=>{add(-1,()=>{const x=seg.x+1;wallQuad(x,y0,x,y1,z0,z1,'#0d1426');c.save();poly(c,[proj(x,y0+2,z0+2),proj(x,y1-2,z0+2),proj(x,y1-2,z1-2),proj(x,y0+2,z1-2)]);c.clip();const m=proj(x,(y0+y1)/2,(z0+z1)/2);circ(c,m[0],m[1],(z1-z0)*.25*ZS);c.lineWidth=L(1.4);c.strokeStyle=rgba(colS,.8);c.stroke();c.restore();});};
    const each=(segs,step,fn)=>{for(const sg of segs){const len=(sg.x1!=null?sg.x1-sg.x0:sg.y1-sg.y0);const n=Math.max(1,Math.floor((len-8)/step));for(let i=0;i<n;i++)fn(sg,(sg.x0!=null?sg.x0:sg.y0)+8+i*step,i);}};
    if(key==='command'){add(cx+cy,()=>{cyl(cx,cy,30,14,'#3a4060');cyl(cx,cy,24,2,'#1a2240',14);const[p0,p1]=proj(cx,cy,30);c.save();const g=c.createRadialGradient(p0,p1,0,p0,p1,34*ZS);g.addColorStop(0,rgba(C.gold,.35));g.addColorStop(1,rgba(C.gold,0));c.fillStyle=g;c.fillRect(p0-34*ZS,p1-34*ZS,68*ZS,68*ZS);
        for(let i=0;i<5;i++){const a=t*.5+i*1.25,r=(8+i*3.4);const q=proj(cx+Math.cos(a)*r,cy+Math.sin(a)*r,26+Math.sin(i)*3);circ(c,q[0],q[1],L(i===2?3:1.8));c.fillStyle=i===2?C.rebel:C.goldHi;c.fill();}
        c.beginPath();for(let i=0;i<=30;i++){const a=i/30*TAU,q=proj(cx+Math.cos(a)*20,cy+Math.sin(a)*20,24);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]);}c.lineWidth=L(1);c.strokeStyle=rgba(C.gold,.6);c.stroke();c.restore();});
      for(const[a,b]of[[cx-40,cy],[cx+40,cy],[cx,cy-40],[cx,cy+40]])add(a+b,()=>{box(a-5,b-5,10,10,8,'#5a4a3a');});
      each(NW,90,(sg,x)=>screenN(sg,x,x+76,22,48,[C.shield,C.gold][(x/90|0)%2]));if(mainW){screenW(mainW,mainW.y0+12,mainW.y0+Math.min(80,mainW.y1-mainW.y0-14),22,44,C.rebel);add(8,()=>{box(mainW.x+6,mainW.y1-40,16,14,20,'#4a4e5a');const q=proj(mainW.x+14,mainW.y1-33,24);circ(c,q[0],q[1],L(2.4));c.fillStyle='#e8e2d4';c.fill();});}
      if(mainN)posts.push({x:mainN.x0+40,y:mainN.y+30,pose:'idle',emote:'☕'},{x:Math.min(mainN.x1-30,mainN.x0+120),y:mainN.y+30,pose:'idle'});if(mainW)posts.push({x:mainW.x+30,y:mainW.y0+40,pose:'idle'});}
    else if(key==='barracks'){const bunk=up.has('bunks'),qrt=up.has('quarters');const rec=up.has('rec')&&T.length>1?claim():null;
      for(const q of T){const ox=q.tx*100,oy=q.ty*100;if(q===rec){add(ox+oy+60,()=>{box(ox+20,oy+50,44,16,10,'#7a4a3a');box(ox+20,oy+44,44,6,18,'#6a3e30');box(ox+44,oy+20,24,18,8,'#5a4a3a');const p2=proj(ox+56,oy+29,10);for(let i=0;i<3;i++){c.save();c.translate(p2[0]-6*ZS+i*5*ZS,p2[1]);c.rotate(-.3+i*.3);rr(c,-2*ZS,-3*ZS,4*ZS,6*ZS,ZS);ink(c,'#f4f0e6',L(.8));c.restore();}});posts.push({x:ox+30,y:oy+64,pose:'idle',emote:'🎲'});continue;}
        for(let i=0;i<3;i++){const bx=ox+14+i*28,by=oy+18;add(bx+by,()=>{box(bx,by,20,46,6,'#5a5048');box(bx+2,by+2,16,10,3,'#e8e2d4',6);box(bx+2,by+14,16,30,2,'#8a5048',6);if(bunk){box(bx,by,20,46,4,'#5a5048',22);box(bx+2,by+14,16,30,2,'#7a4640',26);c.lineWidth=L(2);c.strokeStyle=C.ink;for(const[a,b]of[[bx,by],[bx+20,by+46]]){const p0=proj(a,b,0),p1=proj(a,b,26);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.stroke();}}});beds.push({x:bx+10,y:by+30,z:bunk?28:8});}
        add(ox+oy+92,()=>{box(ox+14,oy+76,26,14,8,'#4a5048');box(ox+60,oy+76,26,14,8,'#4a5048');});
        if(qrt&&has(q.tx+1,q.ty)&&!(rec&&rec.tx===q.tx+1&&rec.ty===q.ty))add(ox+oy+100,()=>{wallQuad(ox+98,oy+6,ox+98,oy+94,0,24,rgba('#8a8070',.9));});
        if(qrt&&has(q.tx,q.ty+1))add(ox+oy+100,()=>{wallQuad(ox+6,oy+98,ox+94,oy+98,0,24,rgba('#8a8070',.9));});}
      each(NW,44,(sg,x)=>add(-1,()=>wallQuad(x,sg.y+1,x+26,sg.y+1,4,40,'#4a5058')));if(mainN)add(-1,()=>{const fl=proj(mainN.x1-30,mainN.y+1,30);rr(c,fl[0]-10*ZS,fl[1]-8*ZS,20*ZS,14*ZS,ZS);c.fillStyle=C.rebel;c.fill();});}
    else if(key==='store'){const fill=o.fill==null?.6:o.fill;
      each(NW,48,(sg,x,i)=>add(-1,()=>{box(x,sg.y+4,40,14,44,'#5a5040');for(let s2=0;s2<3;s2++)for(let k2=0;k2<3;k2++)if(((x/48|0)*9+s2*3+k2)%10<fill*10)box(x+3+k2*12,sg.y+6,10,10,10,['#c08a4a','#6a7046','#8a96a0'][(i+k2+s2)%3],4+s2*14);}));
      T.forEach((q,ti)=>{const n=Math.round(fill*5);for(let i=0;i<n;i++){const x=q.tx*100+14+(i*37+ti*11)%60,y=q.ty*100+(has(q.tx,q.ty-1)?14:30)+((i*53+ti*7)%50);add(x+y,()=>{box(x,y,22,22,14,'#c08a4a');if(i%2)box(x+2,y+2,18,18,12,'#b07a40',14);});}});
      const f0=front[0];add(f0.tx*100+f0.ty*100+150,()=>{box(f0.tx*100+50,f0.ty*100+60,30,18,16,'#6a5a4a');});
      if(mainW)add(-1,()=>{const x=mainW.x+1;wallQuad(x,mainW.y0+20,x,mainW.y0+70,10,40,'#3b3a44');for(let i=0;i<4;i++){const a=proj(x,mainW.y0+26+i*11,14),b=proj(x,mainW.y0+26+i*11,36);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineWidth=L(2.4);c.strokeStyle='#2a2a32';c.stroke();}});
      posts.push({x:f0.tx*100+64,y:f0.ty*100+86,pose:'loot',emote:'📦'});}
    else if(key==='comms'){each(NW,48,(sg,x,i)=>screenN(sg,x,x+42,20,40,i%2?C.shield:C.gold));
      if(mainW)add(-1,()=>{const x=mainW.x+1,y0=mainW.y0+20,y1=mainW.y1-30;wallQuad(x,y0,x,y1,16,46,'#8a7a5a');const pins=[[y0+10,30],[y0+40,22],[y0+70,36],[y0+30,40]].filter(p=>p[0]<y1);c.beginPath();pins.forEach(([a,b],i)=>{const q=proj(x,a,b);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]);});c.lineWidth=L(1.2);c.strokeStyle=C.rebel;c.stroke();pins.forEach(([a,b])=>{const q=proj(x,a,b);circ(c,q[0],q[1],L(2));c.fillStyle=C.rebel;c.fill();});});
      T.forEach(q=>{const x=q.tx*100+30,y=q.ty*100+40;add(x+y,()=>{box(x,y,40,18,12,'#4a4e5a');box(x+4,y+2,12,8,10,'#1a2240',12);box(x+22,y+2,12,8,10,'#1a2240',12);glow(x+20,y+6,22,24,C.shield,.25);});posts.push({x:x+20,y:y+28,pose:'hack',emote:'📡'});});
      const f0=front[0];add(f0.tx*100+f0.ty*100+170,()=>{cyl(f0.tx*100+80,f0.ty*100+80,10,30,'#5a6070');box(f0.tx*100+74,f0.ty*100+74,12,12,4,'#8a8e96',30);});}
    else if(key==='diplo'){add(cx+cy,()=>{box(cx-40,cy-14,80,28,10,'#6a3e30');box(cx-34,cy-10,68,20,1,'#7a4a3a',10);});for(let i=0;i<3;i++){const a=cx-26+i*26;add(a+cy-22,()=>box(a-5,cy-28,10,8,8,'#4a3a2e'));add(a+cy+22,()=>box(a-5,cy+20,10,8,8,'#4a3a2e'));}
      each(NW,60,(sg,x,i)=>add(-1,()=>wallQuad(x+10,sg.y+1,x+28,sg.y+1,14,50,i%3===1?C.rebel:['#2a6a8a','#8a6a2a'][i%2])));
      const sofaT=T.length>1?claim():null;if(sofaT)add(sofaT.tx*100+sofaT.ty*100+130,()=>{const ox=sofaT.tx*100,oy=sofaT.ty*100;box(ox+30,oy+64,40,16,8,'#3a2a4a');box(ox+30,oy+60,40,4,16,'#3a2a4a');});posts.push({x:cx,y:cy+36,pose:'idle',emote:'🤝'});}
    else if(key==='workshop'){if(mainN){add(-1,()=>{const y=mainN.y+1,x0=mainN.x0+12,x1=Math.min(mainN.x1-12,mainN.x0+110);wallQuad(x0,y,x1,y,10,46,'#4a4e5a');for(let i=0;i<8;i++){const q=proj(x0+6+i*(x1-x0-12)/8,y,30+(i%2)*8);rr(c,q[0]-2*ZS,q[1]-5*ZS,4*ZS,10*ZS,ZS);c.fillStyle=['#c8ccd4','#b07a40','#8a8e96'][i%3];c.fill();}});
        add(mainN.x0+mainN.y+60,()=>{box(mainN.x0+16,mainN.y+26,60,22,14,'#6a5a4a');box(mainN.x0+20,mainN.y+30,10,8,6,'#8a8e96',14);});posts.push({x:mainN.x0+46,y:mainN.y+62,pose:'work',emote:'🔧',sparks:1});}
      const liftT=T.length>1?claim():centre;const lx=liftT.tx*100,ly=liftT.ty*100;add(lx+ly+80,()=>{box(lx+20,ly+30,60,40,4,'#5a5a62');cyl(lx+30,ly+50,4,30,'#3b3a44',4);cyl(lx+70,ly+50,4,30,'#3b3a44',4);box(lx+20,ly+30,60,40,3,'#ffc83a',32);});
      add(lx+ly+150,()=>{cyl(lx+86,ly+88,10,10,'#4a4a52');cyl(lx+86,ly+88,7,16,'#8a6a3a',10);});}
    else if(key==='infirmary'){const surgT=up.has('surgery')?(T.length>1?claim():null):null;
      for(const q of T){const ox=q.tx*100,oy=q.ty*100;if(q===surgT){add(ox+oy+50,()=>{box(ox+30,oy+30,40,20,14,'#c8ccd4');box(ox+32,oy+32,36,16,2,'#2ab0a0',14);const q0=proj(ox+50,oy+40,30),q1=proj(ox+50,oy+40,52);c.beginPath();c.moveTo(q0[0],q0[1]);c.lineTo(q1[0],q1[1]);c.lineWidth=L(2);c.strokeStyle=C.ink;c.stroke();ell(c,q1[0],q1[1]+3*ZS,12*ZS,5*ZS);ink(c,'#e8eef0',L(1.4));glow(ox+50,oy+40,16,40,'#fffbe6',.35);});posts.push({x:ox+50,y:oy+64,pose:'idle',emote:'🩺'});continue;}
        for(let i=0;i<2;i++){const bx=ox+16+i*44,by=oy+18;add(bx+by,()=>{box(bx,by,26,50,8,'#c8ccd4');box(bx+2,by+2,22,12,3,'#ffffff',8);box(bx+2,by+16,22,32,2,'#2ab0a0',8);cyl(bx+30,by+6,2,32,'#8a8e96');box(bx+26,by+2,8,6,6,'#9ad8e8',30);});beds.push({x:bx+13,y:by+32,z:10});}}
      if(mainN){add(-1,()=>{box(mainN.x1-40,mainN.y+2,30,10,40,'#f4f6f8');helixMark(c,...proj(mainN.x1-25,mainN.y+12,30),12*ZS,'#2ab0a0');});posts.push({x:mainN.x1-30,y:mainN.y+30,pose:'idle',emote:'💊'});}}
    else if(key==='training'){for(const sg of NW)add(-1,()=>{wallQuad(sg.x0+10,sg.y+1,sg.x1-10,sg.y+1,0,30,'#3a4a3a');const n=Math.max(1,Math.round((sg.x1-sg.x0)/70));for(let i=0;i<n;i++){const q=proj(sg.x0+30+i*((sg.x1-sg.x0-60)/Math.max(1,n-1||1)),sg.y+2,22);circ(c,q[0],q[1],7*ZS);ink(c,'#f4f0e6',L(1.2));circ(c,q[0],q[1],4*ZS);c.fillStyle=C.rebel;c.fill();circ(c,q[0],q[1],1.6*ZS);c.fillStyle='#f4f0e6';c.fill();}});
      T.filter(q=>!has(q.tx,q.ty-1)).forEach(q=>{for(let i=0;i<2;i++){const x=q.tx*100+28+i*44,y=q.ty*100+30;add(x+y,()=>{cyl(x,y,6,8,'#5a4a3a');cyl(x,y,5,22,'#c8a070',8);cyl(x,y,6,8,'#c8a070',30);});}});
      add(cx+cy+20,()=>{box(cx-30,cy+5,60,30,1.5,'#4a6a4a');});const f0=front[0];add(f0.tx*100+f0.ty*100+160,()=>{box(f0.tx*100+64,f0.ty*100+50,20,30,20,'#3b3a44');for(let i=0;i<3;i++)cyl(f0.tx*100+74,f0.ty*100+56+i*10,4,4,'#8a8e96',20);});
      posts.push({x:cx,y:cy+30,pose:'aim'});}
    else if(key==='hangar'){if(mainN)add(-1,()=>{const y=mainN.y+1,x0=mainN.x0+(mainN.x1-mainN.x0)*.2,x1=mainN.x1-(mainN.x1-mainN.x0)*.2;wallQuad(x0,y,x1,y,0,46,'#3a3e48');for(let i=0;i<6;i++){const xx=x0+(x1-x0)*(i+.5)/6,a=proj(xx,y+1,4),b=proj(xx,y+1,42);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineWidth=L(1);c.strokeStyle='rgba(0,0,0,.4)';c.stroke();}
        const s1=proj(x0,y+1,44),s2=proj(x1,y+1,44);c.beginPath();c.moveTo(s1[0],s1[1]);c.lineTo(s2[0],s2[1]);c.lineWidth=L(3);c.strokeStyle=Math.sin(t*3)>0?C.gold:'#5a4a00';c.stroke();});
      if(o.pads){   // repo addition: the game's 4 × 4 sections pass their pads in floor units {id,x,y,w,d,kind:'small'|'large'|'lounge'|'bay'}
        for(const pd of o.pads){const{x,y,w,d}=pd,q=Math.min(w,d)/100,mx=x+w/2,my=y+d/2;
          if(pd.kind==='lounge'){add(x+y+d*.7,()=>{box(x+16*q,y+56*q,50*q,16*q,9,'#4a3a5a');box(x+16*q,y+50*q,50*q,6*q,18,'#3a2e4a');box(x+70*q,y+30*q,16*q,14*q,30,'#c84a3a');glow(x+78*q,y+37*q,26,20*q,C.rebel,.3);});posts.push({x:x+40*q,y:y+82*q,pose:'idle',emote:'☕'});continue;}
          if(pd.kind==='bay'){add(x+y+d,()=>{for(const[a,b]of[[x+10,y+10],[x+w-10,y+10],[x+10,y+d-10],[x+w-10,y+d-10]])cyl(a,b,3*q,52*q,'#5a5a62');box(x+8,y+8,w-16,6*q,4,'#ffc83a',52*q);box(x+8,y+d-14*q,w-16,6*q,4,'#ffc83a',52*q);});pads.push({x:mx,y:my,bay:1,id:pd.id,kind:'bay'});continue;}
          add(x+y+1,()=>{c.save();c.lineWidth=L(2);c.setLineDash([6*ZS,5*ZS]);c.strokeStyle=rgba(C.shield,.5);
            if(pd.kind==='large'){const i=14;poly(c,[proj(x+i,y+i,0),proj(x+w-i,y+i,0),proj(x+w-i,y+d-i,0),proj(x+i,y+d-i,0)]);c.stroke();c.setLineDash([]);
              const a=proj(x+i+30,my,0),b2=proj(x+w-i-30,my,0);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b2[0],b2[1]);c.strokeStyle=rgba(C.shield,.35);c.stroke();
              c.lineWidth=L(3);c.strokeStyle=C.gold;for(const[cx2,cy2,sx,sy]of[[x+i,y+i,1,1],[x+w-i,y+i,-1,1],[x+w-i,y+d-i,-1,-1],[x+i,y+d-i,1,-1]]){const p0=proj(cx2+sx*24,cy2,0),p1=proj(cx2,cy2,0),p2=proj(cx2,cy2+sy*24,0);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);c.stroke();}}
            else{const pts=[];const R=Math.min(w,d)*.38;for(let i=0;i<24;i++){const a=i/24*TAU;pts.push(proj(mx+Math.cos(a)*R,my+Math.sin(a)*R,0));}poly(c,pts);c.stroke();}
            c.restore();});
          pads.push({x:mx,y:my,id:pd.id,kind:pd.kind});}
      } else {
      const lounge=up.has('lounge')&&T.length>1?claim():null,bay=up.has('mbay')&&T.length>1?claim():null;
      for(const q of T){const ox=q.tx*100,oy=q.ty*100;
        if(q===lounge){add(ox+oy+60,()=>{box(ox+16,oy+56,50,16,9,'#4a3a5a');box(ox+16,oy+50,50,6,18,'#3a2e4a');box(ox+70,oy+30,16,14,30,'#c84a3a');glow(ox+78,oy+37,26,20,C.rebel,.3);});posts.push({x:ox+40,y:oy+82,pose:'idle',emote:'☕'});continue;}
        if(q===bay){add(ox+oy+100,()=>{for(const[a,b]of[[ox+10,oy+10],[ox+90,oy+10],[ox+10,oy+90],[ox+90,oy+90]])cyl(a,b,3,52,'#5a5a62');box(ox+8,oy+8,86,6,4,'#ffc83a',52);box(ox+8,oy+88,86,6,4,'#ffc83a',52);});pads.push({x:ox+50,y:oy+50,bay:1});continue;}
        add(ox+oy+1,()=>{const pts=[];for(let i=0;i<24;i++){const a=i/24*TAU;pts.push(proj(ox+50+Math.cos(a)*36,oy+50+Math.sin(a)*36,0));}poly(c,pts);c.lineWidth=L(2);c.setLineDash([6*ZS,5*ZS]);c.strokeStyle=rgba(C.shield,.5);c.stroke();c.setLineDash([]);});pads.push({x:ox+50,y:oy+50});}
      }
      if(up.has('refuel')&&mainW)add(30,()=>{const x=mainW.x;cyl(x+16,mainW.y1-40,12,30,'#c84a3a');cyl(x+16,mainW.y1-14,10,26,'#c84a3a');c.beginPath();const a=proj(x+26,mainW.y1-40,10),b=proj(x+60,mainW.y1-60,0);c.moveTo(a[0],a[1]);c.quadraticCurveTo(a[0]+20*ZS,b[1],b[0],b[1]);c.lineWidth=L(2.4);c.strokeStyle=C.ink;c.stroke();});
      if(up.has('arm')&&mainW)add(10,()=>{const x=mainW.x;box(x+4,mainW.y0+20,10,Math.min(80,mainW.y1-mainW.y0-30),6,'#5a5a62',50);const sw=Math.sin(t*.8)*.5;const base=proj(x+10,mainW.y0+40,50);const elb=proj(x+10+40*Math.cos(sw),mainW.y0+40+40*Math.sin(sw),40),hand2=proj(x+10+70*Math.cos(sw*1.4),mainW.y0+40+70*Math.sin(sw*1.4),24);c.beginPath();c.moveTo(base[0],base[1]);c.lineTo(elb[0],elb[1]);c.lineTo(hand2[0],hand2[1]);c.lineWidth=L(5);c.strokeStyle=C.ink;c.stroke();c.lineWidth=L(3);c.strokeStyle='#ffc83a';c.stroke();circ(c,hand2[0],hand2[1],L(3));c.fillStyle=C.ink;c.fill();});}
    items.sort((a,b)=>a.d-b.d).forEach(i=>i.fn());
    return{posts,beds,pads};}
  function construction(c,proj,ZS,W,D,t,o){const F=furn(c,proj,ZS);o=o||{};const SH=shapeOf(o.tiles,W,D);c.save();
    c.setLineDash([8*ZS,6*ZS]);c.lineWidth=F.L(3);c.strokeStyle=C.gold;c.beginPath();for(const sg of SH.NW){const a=proj(sg.x0,sg.y,1),b=proj(sg.x1,sg.y,1);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);}for(const sg of SH.WW){const a=proj(sg.x,sg.y0,1),b=proj(sg.x,sg.y1,1);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);}for(const e of SH.SE){const a=proj(e.x0,e.y0,1),b=proj(e.x1,e.y1,1);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);}c.stroke();c.setLineDash([]);
    for(const q of SH.T){const ox=q.tx*100,oy=q.ty*100;for(const[a,b]of[[ox+20,oy+20],[ox+80,oy+20],[ox+20,oy+80],[ox+80,oy+80]]){const p0=proj(a,b,0),p1=proj(a,b,40);c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.lineWidth=F.L(3);c.strokeStyle='#8a8e96';c.stroke();}F.box(ox+20,oy+20,60,6,3,'#b07a40',38);F.box(ox+20,oy+74,60,6,3,'#b07a40',38);}
    const ce=SH.centre;F.box(ce.tx*100+35,ce.ty*100+45,24,24,14,'#c08a4a');F.box(ce.tx*100+55,ce.ty*100+50,18,18,10,'#6a7046');c.restore();
    const q=proj(ce.tx*100+42,ce.ty*100+62,0);character(c,q[0],q[1],o.worker||'dax',{view:'side',dir:1,state:'build',t,s:ZS*1.1,gear:['hardhat']});}
  /* walk-in view: same layout as the map, drawn big, on the room's real shape. o.tiles = the merged cluster's [[r,c],...]
     (absolute or relative); without it, a w × h rectangle. Local coords centred on 0,0 inside the game's room frame (±250 × ±130). */
  function roomInterior(c,key,o){o=o||{};let rel=null;if(o.tiles&&o.tiles.length){const r0=Math.min(...o.tiles.map(q=>q[0])),c0=Math.min(...o.tiles.map(q=>q[1]));rel=o.tiles.map(q=>[q[1]-c0,q[0]-r0]);}
    const W=rel?(Math.max(...rel.map(q=>q[0]))+1)*100:(o.w||2)*100,D=rel?(Math.max(...rel.map(q=>q[1]))+1)*100:(o.h||2)*100,k=400/(Math.max(W,200)+Math.max(D,200)),t=o.t||0;
    const proj=(fx,fy,z)=>[((fx-W/2)-(fy-D/2))*1.25*k,((fx-W/2)+(fy-D/2))*.65*k-(z||0)*k];const col=RCOL[key]||C.steel,[fa,fb]=FLOOR[key]||FLOOR.command;const SH=shapeOf(rel,W,D);
    // walls run along the real outer edges only: rock above, panels with a room-colour stripe below
    const WH=78;const wall=(x0,y0,x1,y1,sv)=>{rockFace(c,[proj(x0,y0,30),proj(x1,y1,30),proj(x1,y1,WH),proj(x0,y0,WH)],shade('#2c2634',sv),x0+y0+7);
      poly(c,[proj(x0,y0,0),proj(x1,y1,0),proj(x1,y1,30),proj(x0,y0,30)]);c.fillStyle=shade('#3a3e4a',sv);c.fill();poly(c,[proj(x0,y0,26),proj(x1,y1,26),proj(x1,y1,30),proj(x0,y0,30)]);c.fillStyle=shade(col,sv*.5);c.fill();
      poly(c,[proj(x0,y0,0),proj(x1,y1,0),proj(x1,y1,WH),proj(x0,y0,WH)]);c.lineWidth=3*k;c.strokeStyle=C.ink;c.stroke();};
    const walls=[...SH.NW.map(sg=>({d:sg.x0+sg.y,fn:()=>wall(sg.x0,sg.y,sg.x1,sg.y,-.05)})),...SH.WW.map(sg=>({d:sg.x+sg.y0,fn:()=>wall(sg.x,sg.y1,sg.x,sg.y0,-.2)}))];walls.sort((a,b)=>a.d-b.d).forEach(w=>w.fn());
    for(const sg of SH.NW)for(let x=sg.x0+50;x<sg.x1;x+=100){const q=proj(x,sg.y+2,58);circ(c,q[0],q[1],4*k);c.fillStyle='#fff3c8';c.shadowColor='#ffd890';c.shadowBlur=12;c.fill();c.shadowBlur=0;}
    for(const q of SH.T)for(let a=0;a<2;a++)for(let b=0;b<2;b++){const x=q.tx*100+a*50,y=q.ty*100+b*50;poly(c,[proj(x,y,0),proj(x+50,y,0),proj(x+50,y+50,0),proj(x,y+50,0)]);c.fillStyle=(a+b)%2?fa:fb;c.fill();}
    c.lineWidth=5*k;c.strokeStyle=C.ink;c.beginPath();for(const e of SH.SE){const a=proj(e.x0,e.y0,0),b=proj(e.x1,e.y1,0);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);}for(const sg of SH.NW){const a=proj(sg.x0,sg.y,0),b=proj(sg.x1,sg.y,0);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);}for(const sg of SH.WW){const a=proj(sg.x,sg.y0,0),b=proj(sg.x,sg.y1,0);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);}c.stroke();
    let res={posts:[],beds:[],pads:[]};const oo=Object.assign({},o,{tiles:rel});
    if(o.build)construction(c,proj,k,W,D,t,oo);else res=furnishRoom(c,key,W,D,proj,k,oo);
    for(const e of SH.SE){poly(c,[proj(e.x0,e.y0,0),proj(e.x1,e.y1,0),proj(e.x1,e.y1,-8),proj(e.x0,e.y0,-8)]);ink(c,'#1e1a26',3*k);}
    if(o.alert){c.save();c.globalAlpha=.1+.08*Math.sin(t*5);c.fillStyle=C.rebel;for(const q of SH.T){poly(c,[proj(q.tx*100,q.ty*100,0),proj(q.tx*100+100,q.ty*100,0),proj(q.tx*100+100,q.ty*100+100,0),proj(q.tx*100,q.ty*100+100,0)]);c.fill();}c.restore();}
    const map=a=>a.map(q=>{const p2=proj(q.x,q.y,q.z||0);return Object.assign({},q,{x:p2[0],y:p2[1]});});
    return{posts:map(res.posts),beds:map(res.beds),pads:map(res.pads),scale:k};}
  /* a room on the base map: tiles = [[r,c],...] (the merged cluster); cellToCss(r,c) -> [x,y,S] of tile centres */
  function baseRoom(c,tiles,key,cellToCss,S,o){o=o||{};const r0=Math.min(...tiles.map(q=>q[0])),c0=Math.min(...tiles.map(q=>q[1])),r1=Math.max(...tiles.map(q=>q[0])),c1=Math.max(...tiles.map(q=>q[1]));
    const[x00,y00]=cellToCss(0,0),TW=34*S,TH=17*S,ZS=TW/125;const proj=(fx,fy,z)=>{const cf=c0-.5+fx/100,rf=r0-.5+fy/100;return[x00+(cf-rf)*TW,y00+(cf+rf)*TH-(z||0)*ZS];};
    const W=(c1-c0+1)*100,D=(r1-r0+1)*100,col=RCOL[key]||C.steel,[fa,fb]=FLOOR[key]||FLOOR.command;const has=(r,cc)=>tiles.some(q=>q[0]===r&&q[1]===cc);
    for(const[r,cc]of tiles){const fx=(cc-c0)*100,fy=(r-r0)*100;for(let a=0;a<2;a++)for(let b=0;b<2;b++){poly(c,[proj(fx+a*50,fy+b*50),proj(fx+a*50+50,fy+b*50),proj(fx+a*50+50,fy+b*50+50),proj(fx+a*50,fy+b*50+50)]);c.fillStyle=(a+b)%2?fa:fb;c.fill();}}
    // back walls on the far edges, low enough to see over
    const WH=26;for(const[r,cc]of tiles){const fx=(cc-c0)*100,fy=(r-r0)*100;
      if(!has(r-1,cc)){poly(c,[proj(fx,fy,0),proj(fx+100,fy,0),proj(fx+100,fy,WH),proj(fx,fy,WH)]);c.fillStyle='#34303e';c.fill();poly(c,[proj(fx,fy,WH-5),proj(fx+100,fy,WH-5),proj(fx+100,fy,WH),proj(fx,fy,WH)]);c.fillStyle=col;c.fill();poly(c,[proj(fx,fy,0),proj(fx+100,fy,0),proj(fx+100,fy,WH),proj(fx,fy,WH)]);c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();}
      if(!has(r,cc-1)){poly(c,[proj(fx,fy+100,0),proj(fx,fy,0),proj(fx,fy,WH),proj(fx,fy+100,WH)]);c.fillStyle='#2a2634';c.fill();poly(c,[proj(fx,fy+100,WH-5),proj(fx,fy,WH-5),proj(fx,fy,WH),proj(fx,fy+100,WH)]);c.fillStyle=shade(col,-.25);c.fill();poly(c,[proj(fx,fy+100,0),proj(fx,fy,0),proj(fx,fy,WH),proj(fx,fy+100,WH)]);c.lineWidth=1.4;c.strokeStyle=C.ink;c.stroke();}}
    // room glow
    const ctr=proj(W/2,D/2,0);const g=c.createRadialGradient(ctr[0],ctr[1],0,ctr[0],ctr[1],(W+D)*.4*ZS);g.addColorStop(0,rgba(col,.22));g.addColorStop(1,rgba(col,0));c.fillStyle=g;c.fillRect(ctr[0]-(W+D)*.5*ZS,ctr[1]-(W+D)*.3*ZS,(W+D)*ZS,(W+D)*.6*ZS);
    const rel=tiles.map(q=>[q[1]-c0,q[0]-r0]);let res={posts:[],beds:[],pads:[]};if(o.build)construction(c,proj,ZS,W,D,o.t||0,Object.assign({},o,{tiles:rel}));else res=furnishRoom(c,key,W,D,proj,ZS,Object.assign({mini:true},o,{tiles:rel}));
    const map=a=>a.map(q=>{const p2=proj(q.x,q.y,q.z||0);return Object.assign({},q,{x:p2[0],y:p2[1]});});return{posts:map(res.posts),beds:map(res.beds),pads:map(res.pads),scale:ZS,center:ctr};}

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
    character,portrait,spec,recruit,viewFor,lookOf,VEHICLES,vehicle,strider,clampBeam,shipIso,hangarShip,HM,shapeOf,baseBackdrop,baseTile,baseRoom,roomInterior,RCOL,STYLE,PROJ,shot,shotTimes,volley,volleyImpacts,impact,bloodSplat,muzzleFor,shipShield,setGore:v=>{GORE=!!v;},ease,Shake,JUICE,Particles,ring,shieldBreak,popText,pickup,shipExplode,transition,TRAITS,DTYPES,WEAPON_INFO,icon,fireModeToggle,vitals,armourHit,shieldHit,sunder,pierce,misfire,deployable,flyover,strafe,doorGunner,supplyDrop,landing,makerBadge,ITEMS,item,MAKERS,SHIP_WEAPONS,GEAR_ALIAS,TRAIT_LOOK,RTRAIT_LOOK,SPEC_LOOK,COND_LOOK,ROLE_COATS,muzzle,prop,floor,trail,wall,lampLight,scorch,block,bolt,hit,explosion,smoke,ship,
    isoP,isoBox,emote,planet,route,star,
    util:{rgba,shade,mkRng,hashStr,rr,ell,circ,poly,ink,headShade}};
})();
