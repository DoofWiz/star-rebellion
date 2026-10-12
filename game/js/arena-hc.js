'use strict';
/* =====================================================================
   STAR REBELLION — Arena Type 3: High Command, the HUD (docs/ARENA-HC-HANDOFF.md §3)
   The Arena's third ruleset. game/js/arena.js owns the scene, the title route and
   the ruleset picker; choosing "Type 3: High Command" there hands the scene to this
   file, which drives game/js/sim-hc.js in real time and draws the approved High
   Command HUD on the game's own kit (sr-theme "Chunky Ops"):

     top left    objectives, with the standing mission rules nested under them
     top centre  the reinforcement clock (the loudest status), PAUSED under it
     top right   command points and the COMMANDS button (the screen's one gold primary)
     left rail   the event feed, each entry with VIEW
     bottom      the wing roster: a header per wing, a camera tile per ship
     bottom right time controls (pause / slow / play / fast · event focus / follow)
     the map     your ships rebel red with read-only intent lines, theirs Hegemony blue,
                 the selected wing's engagement ring, the attack designation in gold
   plus the wing command tray (left), the pilot panel and the commands drawer.

   The Arena's ground rules hold: designer-facing text in plain words, nothing here
   calls newGame(), saveSnap(), persist() or SR.endMission(), nothing touches G.
   ===================================================================== */
(function(){
const ROOT=document.getElementById('arHc');
if(!ROOT||!window.SIMHC)return;
const SCENE=document.getElementById('sc-arena');
const byId=SR.util.scoped(ROOT);
const TH=SR.theme,C=TH.C;
const SA=window.SR_ART;
const SIM=window.SIMHC;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PREFS_KEY='sr-arena-hc-prefs';   // High Command's own key; never the campaign's

/* =====================================================================
   Scenarios (§6): registry entries in arena.js's ARENA_SCENARIOS, allowlisted to this ruleset
   (rulesets:['hc'] keeps them off the v2 and SB lists). Map 8400 × 6000 (HC_MAP 2).
   wings:   [{id, name, at:[x,y,h], order:{kind,target}, tactic, leader, ships:[{cls, name, pilot, marines}]}]
   allies:  quiet friendlies the player can't command (Convoy Lark): [{id, name, cls, at, role:'convoy', to}]
   enemies: [{type, n, id, name, label, at, role:'patrol'|'guard'|'hunt', asset, stats, flagship}]
   points:  named places: {jump:{x,y,label}, sat:{x,y,label,capture:true}}
   objectives: [{id, kind:'destroy'|'escort'|'capture'|'protect'|'board', text, primary, cpReward, …}]
   reinforce: {secs, edge, force:[enemy entries]}   always on (§2.1)
   jam:     {point, by}: the point can't be jumped from while `by` stands
   rules:   the standing mission rules it starts with (§4.3); cp: the command point pool (§4.4)
   ===================================================================== */
const ROCKS_NIGHTFALL=[{x:3000,y:2900,r:120},{x:3220,y:3120,r:85},{x:4800,y:2350,r:140},{x:6400,y:3050,r:110},{x:2500,y:1500,r:100},{x:6900,y:4700,r:130},{x:4100,y:4700,r:95}];
const HC_SCENARIOS=[
  {id:'hc1_nightfall',title:'HC1: Nightfall',rulesets:['hc'],
    desc:'The canvas mission. Dagger (3) and Amber (2) see Convoy Lark to the jump point; Relay K-7 jams it until it falls. Optional: capture the satellite. Hegemony reinforcements in 4:00. Does mission command feel like gameplay?',
    rocks:ROCKS_NIGHTFALL,
    wings:[
      {id:'dagger',name:'Dagger',at:[1100,2350,0],order:{kind:'attack',target:{type:'obj',id:'relay'}},tactic:'tight',
        ships:[{cls:'talon',name:'Joss',pilot:{id:'joss-marrek'}},{cls:'talon',name:'Wren',pilot:{preset:'regular'}},{cls:'talon',name:'Petra',pilot:{id:'petra-voss'}}]},
      {id:'amber',name:'Amber',at:[950,3750,0],order:{kind:'escort',target:{type:'ship',id:'lark'}},tactic:'tight',
        ships:[{cls:'cross',name:'Sera',pilot:{id:'sera-kest'}},{cls:'cross',name:'Kit',pilot:{preset:'green'}}]}],
    allies:[{id:'lark',name:'Convoy Lark',cls:'graf',at:[700,3450,0],role:'convoy',to:'jump',stats:{hull:80,arm:20}}],
    enemies:[
      {type:'fuel-depot',id:'relay',name:'Relay K-7',label:'Relay K-7',at:[5800,1600,0],stats:{hull:200,arm:30}},
      {type:'vc-mote-patrol',n:2,name:'Guard',role:'guard',asset:'relay',at:[5550,1900,Math.PI]},
      {type:'vc-mote-patrol',n:2,name:'Patrol',role:'patrol',at:[4700,4300,Math.PI]}],
    points:{jump:{x:7500,y:3900,label:'Jump point'},sat:{x:3400,y:1000,label:'Satellite',capture:true}},
    jam:{point:'jump',by:'relay'},extract:'jump',
    objectives:[
      {id:'convoy',kind:'escort',ship:'lark',text:'Get Convoy Lark to the jump point',primary:true},
      {id:'relay',kind:'destroy',targets:['relay'],text:'Destroy Relay K-7 (it jams the jump point)',primary:true,at:{x:5800,y:1600}},
      {id:'sat',kind:'capture',point:'sat',text:'Capture the satellite (optional)',cpReward:1,at:{x:3400,y:1000}}],
    reinforce:{secs:240,edge:'E',force:[{type:'academy-commandant',n:1,name:'Vex'},{type:'vc-mote-patrol',n:3,name:'Strike'},{type:'drone-pursuer',n:2,name:'Pursuer'}]},
    rules:[],cp:5},
];
const REG=window.SR_ARENA_SCENARIOS||[];
for(const s of HC_SCENARIOS)if(!REG.some(x=>x.id===s.id))REG.push(s);
const scenarios=()=>REG.filter(s=>s.rulesets&&s.rulesets.includes('hc'));

/* ---------- state: one object, rebuilt per scenario ---------- */
const A={active:false,phase:'PICK',scen:null,variant:0,seed:1,speed:2,lastSpeed:2,acc:0,lastFrame:0,
  sel:null,selShip:null,tray:null,panel:null,drawer:false,arm:null,follow:false,camHeld:false,
  realSecs:0,pausedSecs:0,pauses:0,metrics:[],hudAt:0,lastEv:0};

/* ---------- canvas and camera (arena-sb.js's kit, copied) ---------- */
const cv=byId('hcCv'),ctx=cv.getContext('2d');
let dpr=1,cssW=1,cssH=1;
const cam={x:4200,y:3000,z:0.15};
function fitCanvas(){const r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;cssW=Math.max(1,r.width);cssH=Math.max(1,r.height);cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);}
function fitCanvasIfNeeded(){const r=cv.getBoundingClientRect();if(Math.abs(r.width-cssW)>0.5||Math.abs(r.height-cssH)>0.5)fitCanvas();}
const fitZoom=()=>Math.min(cssW/SIM.W,cssH/SIM.H)*0.98;
function camFit(){cam.z=fitZoom();cam.x=SIM.W/2;cam.y=SIM.H/2;}
function clampCam(){cam.z=Math.max(fitZoom()*0.8,Math.min(1.6,cam.z));cam.x=Math.max(0,Math.min(SIM.W,cam.x));cam.y=Math.max(0,Math.min(SIM.H,cam.y));}
const toWorld=(px,py)=>({x:(px-cssW/2)/cam.z+cam.x,y:(py-cssH/2)/cam.z+cam.y});
const toScreen=(x,y)=>({x:(x-cam.x)*cam.z+cssW/2,y:(y-cam.y)*cam.z+cssH/2});
const iconBoost=()=>Math.max(1,Math.min(3.2,0.5/cam.z));
function camTo(x,y,z){cam.x=x;cam.y=y;if(z)cam.z=z;clampCam();A.camHeld=true;}

/* ---------- the backdrop and the ships' bodies: copied from arena-sb.js (stars, rocks, the sprite cache) ---------- */
const stars=[];
function makeStars(){stars.length=0;const r=SIM.fn.mulberry(99),n=Math.min(3000,Math.round(420*SIM.W*SIM.H/(4200*3000)));for(let i=0;i<n;i++)stars.push({x:r()*SIM.W,y:r()*SIM.H,r:0.7+r()*1.1,band:Math.floor(r()*4)});}
function drawBackdrop(c){
  c.fillStyle=C.void;c.fillRect(0,0,SIM.W,SIM.H);
  c.fillStyle='#dfe6ff';
  for(let b=0;b<4;b++){c.globalAlpha=0.3+0.13*b;c.beginPath();for(const st of stars){if(st.band!==b)continue;const r=st.r/Math.max(cam.z,0.35);c.rect(st.x-r,st.y-r,2*r,2*r);}c.fill();}
  c.globalAlpha=1;
  c.strokeStyle=TH.rgba(C.seam,0.9);c.lineWidth=3/cam.z;c.setLineDash([16/cam.z,12/cam.z]);
  c.strokeRect(SIM.MARGIN,SIM.MARGIN,SIM.W-2*SIM.MARGIN,SIM.H-2*SIM.MARGIN);c.setLineDash([]);
}
function drawRock(c,r){
  c.save();c.translate(r.x,r.y);c.rotate(r.rot||0);c.beginPath();
  const n=r.verts.length;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=r.r*r.verts[i];i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
  c.closePath();
  const B=SA&&SA.BIOME&&SA.BIOME.rock;
  c.fillStyle=B?B.boulder:'#4a4458';c.fill();c.lineWidth=3/Math.max(cam.z,0.5);c.strokeStyle=C.ink;c.stroke();
  c.restore();
}
const sprites=new Map();
const ANG_B=72,ROLL_B=4,DMG_B=4,SCALE_B=Math.log(1.08),ART_R=52;
function shipSprite(art,livery,px,angI,dmgI){
  const pb=Math.exp(Math.round(Math.log(px)/SCALE_B)*SCALE_B);
  const key=art+'|'+livery+'|'+pb.toFixed(3)+'|'+angI+'|'+dmgI;
  let sp=sprites.get(key);
  if(!sp){
    const half=Math.ceil(pb*ART_R)+2,cv2=document.createElement('canvas');cv2.width=cv2.height=half*2;
    SA.ship(cv2.getContext('2d'),art,half,half,angI*2*Math.PI/ANG_B,pb,0,{livery,damage:dmgI/DMG_B,roll:0,boost:false});
    sp={cv:cv2,half,pb};
    if(sprites.size>900)sprites.delete(sprites.keys().next().value);
    sprites.set(key,sp);
  }
  return sp;
}
const SHIP_SCALE=1.35;
/* a body at (x, y, h); z: the zoom it is drawn at (the main map's or a camera tile's), boost: the icon boost */
function drawShipBody(c,s,x,y,h,z,boost,alpha){
  const art=SA&&SA.SHIP_FOR_GAME&&SA.SHIP_FOR_GAME[s.cls],size=SRDB.visualSize(s.row.size);
  c.save();c.globalAlpha=alpha==null?1:alpha;
  if(art){
    try{
      const scale=size*1.6*boost*0.85*SHIP_SCALE,px=scale*z*dpr;
      const angI=((Math.round(h/(2*Math.PI)*ANG_B)%ANG_B)+ANG_B)%ANG_B,dmgI=Math.round((1-Math.max(0,s.hull)/s.maxHull)*DMG_B);
      const sp=shipSprite(art,s.faction==='reb'?'rebel':'heg',px,angI,dmgI),k=(px/sp.pb)/(z*dpr);
      c.translate(x,y);c.rotate(h-angI*2*Math.PI/ANG_B);c.scale(k,k);c.drawImage(sp.cv,-sp.half,-sp.half);
    }catch(e){c.restore();c.save();plainDart(c,s,x,y,h,size*boost);}
  } else plainDart(c,s,x,y,h,size*boost);
  c.restore();
}
function plainDart(c,s,x,y,h,k){   // arena-sb.js plainDart: the relay and the depot have no art
  k*=1.6*SHIP_SCALE;c.translate(x,y);c.rotate(h);c.scale(k,k);c.beginPath();
  if(s.struct){for(let i=0;i<8;i++){const a=i/8*6.283+Math.PI/8;i?c.lineTo(Math.cos(a)*13,Math.sin(a)*13):c.moveTo(Math.cos(a)*13,Math.sin(a)*13);}c.closePath();}
  else{c.moveTo(16,0);c.lineTo(-10,-9);c.lineTo(-6,0);c.lineTo(-10,9);c.closePath();}
  c.fillStyle=s.faction==='reb'?C.plateHi:s.struct?'#26346e':C.hull;c.fill();c.lineWidth=2.4;c.strokeStyle=C.ink;c.stroke();
  if(s.struct){c.beginPath();c.arc(0,0,4.5,0,7);c.fillStyle=C.heg;c.fill();}
}
const shipCol=s=>s.quiet?C.steel:s.faction==='reb'?C.rebel:C.heg;
const shipColHi=s=>s.quiet?C.steel:s.faction==='reb'?C.rebelHi:C.hegHi;

/* ---------- the map (§3.1) ---------- */
function label(c,x,y,text,col,z,size,font){
  c.save();c.font=(font||'800 ')+Math.round((size||11)/z)+'px '+(font&&font.includes('Bungee')?'':'"Exo 2",sans-serif');
  if(font&&font.includes('Bungee'))c.font=Math.round((size||11)/z)+'px Bungee,"Exo 2",sans-serif';
  c.textAlign='center';c.lineWidth=3.5/z;c.strokeStyle=C.ink;c.strokeText(text,x,y);c.fillStyle=col;c.fillText(text,x,y);c.restore();
}
function dashLine(c,a,b,col,z,w,dash,alpha){
  c.save();c.globalAlpha=alpha==null?1:alpha;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
  c.setLineDash(dash.map(d=>d/z));c.lineWidth=(w+2.4)/z;c.strokeStyle=TH.rgba(C.ink,0.55);c.stroke();
  c.lineWidth=w/z;c.strokeStyle=col;c.stroke();c.restore();
}
function ring(c,x,y,r,col,z,w,dash,alpha){c.save();c.globalAlpha=alpha==null?1:alpha;c.beginPath();c.arc(x,y,r,0,6.283);if(dash)c.setLineDash(dash.map(d=>d/z));c.lineWidth=w/z;c.strokeStyle=col;c.stroke();c.restore();}
function drawPoints(c,z,S){
  for(const k in S.points){
    const p=S.points[k],jam=SIM.fn.jammed(k);
    if(k===(S.R.extract||'jump')||p.label==='Jump point'){
      const R=SIM.fn.JUMP_R_(),spin=(performance.now()/2000)%6.283;
      c.save();c.translate(p.x,p.y);c.rotate(spin);c.setLineDash([22/z,14/z]);c.lineWidth=3/z;c.strokeStyle=jam?C.hazard:C.go;c.beginPath();c.arc(0,0,R,0,6.283);c.stroke();c.restore();
      ring(c,p.x,p.y,R*0.55,TH.rgba(jam?C.hazard:C.go,0.5),z,2);
      label(c,p.x,p.y-R-12/z,(p.label||'Jump point').toUpperCase()+(jam?' · JAMMED':''),jam?C.hazard:C.go,z,12);
    } else if(p.capture){
      const o=S.objectives.find(x=>x.point===k),done=o&&o.state==='done',prog=o?o.prog||0:0;
      c.save();c.translate(p.x,p.y);c.rotate(Math.PI/4);c.lineWidth=2.4/z;c.strokeStyle=done?C.rebel:C.shield;c.strokeRect(-14/z*2,-14/z*2,28/z*2,28/z*2);c.restore();
      if(prog>0&&!done){c.save();c.beginPath();c.arc(p.x,p.y,48/z,-Math.PI/2,-Math.PI/2+prog*6.283);c.lineWidth=5/z;c.strokeStyle=C.shield;c.stroke();c.restore();}
      label(c,p.x,p.y-40/z,(p.label||k).toUpperCase()+(done?' · OURS':''),done?C.rebelHi:C.shield,z,11);
    } else label(c,p.x,p.y,(p.label||k).toUpperCase(),C.text2,z,11);
  }
}
/* the ship status: shield arcs and hull pips, copied from sim-sb.js drawShields / drawStatus (lighter: one arc a zone) */
function shieldR(s,boost){return (s.struct?44:30)*SHIP_SCALE*Math.max(1,SRDB.visualSize(s.row.size)*0.9)*boost;}
function drawShields(c,s,x,y,h,z,boost){
  if(SIM.fn.maxShield(s)<=0)return;
  const R=shieldR(s,boost),lw=5/z,span=Math.PI*2/3,fx=s.shFx?Math.max(0,1-(SIM.S.t-s.shFx.t)/0.4):0;
  c.save();c.translate(x,y);c.rotate(h);c.lineCap='butt';
  for(const zn of ['F','R']){
    const at=['F','R'].filter(k=>s.segs[k].at===zn&&s.segs[k].max>0),mid=zn==='F'?0:Math.PI,a0=mid-span/2,a1=mid+span/2;
    c.beginPath();c.arc(0,0,R,a0,a1);c.lineWidth=lw+2/z;c.strokeStyle=TH.rgba(C.ink,0.7);c.stroke();
    let val=0,max=0;for(const k of at){val+=s.segs[k].val;max+=s.segs[k].max;}
    c.beginPath();c.arc(0,0,R,a0,a1);c.lineWidth=lw;c.strokeStyle='#1f2550';c.stroke();
    if(max>0&&val>0){c.beginPath();c.arc(0,0,R,a0,a0+(a1-a0)*val/max);c.strokeStyle=C.shield;c.stroke();}
    if(fx>0&&s.shFx.zone===zn){c.beginPath();c.arc(0,0,R,a0,a1);c.lineWidth=lw*1.6;c.strokeStyle=TH.rgba('#e8ffff',0.7*fx);c.stroke();}
  }
  c.restore();
}
function boltCols(p){   // sim-sb.js boltCols
  const P=SA&&SA.PROJ&&SA.PROJ[p.style],st=P&&SA.STYLE&&SA.STYLE[P.style];
  return st||[p.faction==='reb'?'#fff3c0':'#e8ffff',p.faction==='reb'?C.goldHi:C.shield];
}
function drawShots(c,z,a,S){   // sim-sb.js drawShots, without the muzzle flashes
  const dt=SIM.TICK/1000;
  c.save();c.lineCap='round';
  for(const p of S.proj){
    const x=p.x+p.vx*a*dt,y=p.y+p.vy*a*dt,sp=Math.hypot(p.vx,p.vy)||1,[core,glow]=boltCols(p);
    const L=Math.min(22,Math.hypot(x-p.x0,y-p.y0)),tx=x-p.vx/sp*L,ty=y-p.vy/sp*L;
    c.beginPath();c.moveTo(tx,ty);c.lineTo(x,y);c.globalAlpha=0.4;c.lineWidth=Math.max(5,3/z)/1;c.strokeStyle=glow;c.stroke();
    c.globalAlpha=1;c.lineWidth=Math.max(2,1.2/z);c.strokeStyle=core;c.stroke();
  }
  for(const m of S.missiles){
    if(m.trail.length>1){c.beginPath();m.trail.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.globalAlpha=0.6;c.lineWidth=3/z;c.strokeStyle=C.steel;c.stroke();c.globalAlpha=1;}
    c.beginPath();c.arc(m.x,m.y,6/z,0,6.283);c.fillStyle=C.psi;c.fill();
  }
  for(const f of S.fx){
    const life=f.kind==='boom'?0.9:0.32,k=(S.t-f.t0)/life;if(k<0||k>1)continue;
    c.globalAlpha=1-k;
    if(f.kind==='boom'){const r=70*(f.size||1)*(0.25+k)/Math.max(0.6,z*1.4);c.beginPath();c.arc(f.x,f.y,r,0,6.283);c.strokeStyle=C.hazard;c.lineWidth=5/z;c.stroke();}
    else{const col=f.kind==='shield'?C.shield:C.hazard;c.beginPath();c.arc(f.x,f.y,(5+8*(1-k))/z,0,6.283);c.fillStyle=col;c.fill();}
  }
  c.restore();
}
function drawTrail(c,s,z){
  if(s.trail.length<2)return;
  c.save();c.lineCap='round';c.strokeStyle=shipColHi(s);c.globalAlpha=0.35;c.lineWidth=2.5/z;c.beginPath();
  s.trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.lineTo(s.x,s.y);c.stroke();c.restore();
}
function render(now){
  fitCanvasIfNeeded();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#04060d';ctx.fillRect(0,0,cssW,cssH);
  const S=SIM.S;if(!S||A.phase==='PICK')return;
  const z=cam.z,a=A.speed>0&&A.phase==='LIVE'?Math.max(0,Math.min(1,A.acc/SIM.TICK)):0,dt=SIM.TICK/1000,boost=iconBoost();
  ctx.setTransform(dpr*z,0,0,dpr*z,dpr*(cssW/2-cam.x*z),dpr*(cssH/2-cam.y*z));
  drawBackdrop(ctx);
  for(const r of S.rocks)drawRock(ctx,r);
  drawPoints(ctx,z,S);
  const pos=s=>s.struct?{x:s.x,y:s.y,h:s.h}:{x:s.x+s.vx*a*dt,y:s.y+s.vy*a*dt,h:s.h+s.w*a*dt};
  // the selected wing's engagement ring, and its attack designation in gold
  const w=SIM.fn.wingOf(A.sel);
  if(w){
    const live=SIM.fn.wingShips(w);
    if(live.length){
      let cx=0,cy=0;for(const s of live){cx+=s.x;cy+=s.y;}cx/=live.length;cy/=live.length;
      const R=Math.max(...live.map(s=>SIM.fn.gunRange(s)))*SIM.fn.ENGAGE_FRAC_()*SIM.fn.tacticOf(w).engage+Math.max(...live.map(s=>Math.hypot(s.x-cx,s.y-cy)));
      ring(ctx,cx,cy,R,TH.rgba(C.rebel,0.55),z,2,[10,8]);
    }
  }
  for(const wg of S.wings){   // every wing's attack designation; the selected wing's loudest
    const o=wg.order;if(!o||o.kind!=='attack'||!o.target)continue;
    const sel=wg.id===A.sel;
    for(const t of S.ships){
      if(!t.alive||t.faction!=='heg')continue;
      if(o.target.type==='class'?t.cls!==o.target.cls||t.struct:t.id!==o.target.id)continue;
      const p=pos(t),r=shieldR(t,boost)+12/z,spin=now/1400;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(spin);ring(ctx,0,0,r,C.gold,z,sel?3:2,[8,7],sel?1:0.55);ctx.restore();
      if(sel&&(o.target.type!=='class'||t===S.ships.find(x=>x.alive&&x.faction==='heg'&&x.cls===o.target.cls&&!x.struct)))
        label(ctx,p.x,p.y-r-12/z,(wg.name+' · ATTACK').toUpperCase(),C.gold,z,12,'Bungee');
    }
  }
  // intent lines: where each ship plans to go (read-only); yours dashed red, theirs faint blue
  for(const s of S.ships){
    if(!s.alive||s.struct||!s.intent)continue;
    const p=pos(s),reb=s.faction==='reb';
    dashLine(ctx,p,s.intent,reb?(s.quiet?C.steel:C.rebel):C.heg,z,reb?1.8:1.2,[7,7],reb?0.85:0.32);
  }
  const recon=S.reconUntil>S.t;
  if(recon)for(const s of S.ships){   // Recon Sweep: every Hegemony intent at full strength, with its target named
    if(!s.alive||s.faction!=='heg'||s.struct||!s.beh)continue;
    const t=SIM.fn.byId(s.beh.target);if(!t)continue;
    const p=pos(s);dashLine(ctx,p,t,C.heg,z,1.8,[3,6],0.9);
    label(ctx,(p.x+t.x)/2,(p.y+t.y)/2-8/z,s.name+' → '+t.name,C.hegHi,z,10);
  }
  if(recon&&!S.reinforce.spawned){const e=S.reinforce.edge,g=260;ctx.save();ctx.fillStyle=TH.rgba(C.hazard,0.12);
    const M=SIM.MARGIN;if(e==='E')ctx.fillRect(SIM.W-M-g,M,g,SIM.H-2*M);if(e==='W')ctx.fillRect(M,M,g,SIM.H-2*M);if(e==='N')ctx.fillRect(M,M,SIM.W-2*M,g);if(e==='S')ctx.fillRect(M,SIM.H-M-g,SIM.W-2*M,g);ctx.restore();
    label(ctx,e==='E'?SIM.W-SIM.MARGIN-g/2:e==='W'?SIM.MARGIN+g/2:SIM.W/2,e==='N'?SIM.MARGIN+g/2:e==='S'?SIM.H-SIM.MARGIN-g/2:SIM.H/2,'REINFORCEMENTS IN '+fmtClock(SIM.clockLeft()),C.hazard,z,13,'Bungee');}
  for(const d of S.decoys){   // a Decoy Signal: a false contact, in information cyan
    const k=(now/600)%1;ring(ctx,d.x,d.y,(30+60*k)/z*0.6+20,TH.rgba(C.shield,1-k),z,2.4);
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(Math.PI/4);ctx.strokeStyle=C.shield;ctx.lineWidth=2.4/z;ctx.strokeRect(-12/z,-12/z,24/z,24/z);ctx.restore();
    label(ctx,d.x,d.y-34/z,'DECOY · '+Math.ceil(d.until-S.t)+' s',C.shield,z,11);
  }
  for(const s of S.ships)if(s.alive)drawTrail(ctx,s,z);
  for(const s of S.ships){
    if(!s.alive)continue;
    const p=pos(s);
    if(A.selShip===s.id||(w&&s.wing===w.id))ring(ctx,p.x,p.y,shieldR(s,boost)+8/z,A.selShip===s.id?C.gold:TH.rgba(C.gold,0.55),z,A.selShip===s.id?2.6:1.6);
    drawShipBody(ctx,s,p.x,p.y,p.h,z,boost);
    drawShields(ctx,s,p.x,p.y,p.h,z,boost);
    if(s.quiet)label(ctx,p.x,p.y+shieldR(s,boost)+16/z,s.name.toUpperCase(),C.steel,z,11);
    else if(s.struct)label(ctx,p.x,p.y+shieldR(s,boost)+16/z,(s.label||s.name).toUpperCase(),C.hegHi,z,11);
  }
  drawShots(ctx,z,a,S);
  // screen space: hull pips and names, floaters
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.font='700 11px "Exo 2",sans-serif';ctx.textAlign='center';
  for(const s of S.ships){
    if(!s.alive)continue;
    const p=pos(s),q=toScreen(p.x,p.y),r=shieldR(s,boost)*z;
    TH.hpPips(ctx,q.x,q.y-r-10,{hp:Math.max(0,s.hull),max:s.maxHull,arm:s.arm,maxArm:s.maxArm,cells:5,cw:6,ch:4});
    if(!s.struct&&!s.quiet){ctx.lineWidth=3;ctx.strokeStyle=C.ink;ctx.strokeText(s.name,q.x,q.y+r+14);ctx.fillStyle=shipColHi(s);ctx.fillText(s.name,q.x,q.y+r+14);}
  }
  ctx.font='800 13px "Exo 2",sans-serif';
  for(const f of S.floaters){
    const k=(S.t-f.t)/1.6;if(k<0||k>1)continue;
    const q=toScreen(f.x,f.y);ctx.globalAlpha=1-k*k;ctx.lineWidth=4;ctx.strokeStyle=C.ink;ctx.strokeText(f.text,q.x,q.y-k*26);ctx.fillStyle=f.col;ctx.fillText(f.text,q.x,q.y-k*26);
  }
  ctx.globalAlpha=1;
}

/* =====================================================================
   The loop: real time on the sim's fixed step, through the timescale
   ===================================================================== */
function frame(now){
  const realDt=A.lastFrame?Math.min(250,now-A.lastFrame):16;A.lastFrame=now;
  if(A.phase==='LIVE'&&SIM.S){
    A.realSecs+=realDt/1000;
    const ts=SIM.TIMESCALES[A.speed];
    if(ts===0)A.pausedSecs+=realDt/1000;
    A.acc+=realDt*ts;
    let n=0;
    while(A.acc>=SIM.TICK&&n++<200&&A.phase==='LIVE'){A.acc-=SIM.TICK;SIM.step();if(SIM.S.over){onOver();break;}}
    if(A.follow&&!A.camHeld)followCam(realDt);
  }
  render(now);
  if(A.panel){const pc=byId('hcPilotCam'),ps=SIM.fn.byId(A.panel);if(pc&&ps)drawTileCam(pc,ps,0.5);}
  if(A.phase==='LIVE'&&now-(A.tileAt||0)>=100/Math.max(1,byId('hcRoster').querySelectorAll('.hc-tile').length)){A.tileAt=now;tileTick();}
  if(now-A.hudAt>120){A.hudAt=now;syncHud();}
}
/* follow: ease the camera onto the selected ship (or the selected wing's middle) */
function followCam(dtMs){
  const p=focusPoint();if(!p)return;
  const k=1-Math.exp(-4*dtMs/1000);cam.x+=(p.x-cam.x)*k;cam.y+=(p.y-cam.y)*k;clampCam();
}
function focusPoint(){
  const s=SIM.fn.byId(A.selShip);if(s&&s.alive)return s;
  const w=SIM.fn.wingOf(A.sel);if(!w)return null;
  const live=SIM.fn.wingShips(w);if(!live.length)return null;
  let x=0,y=0;for(const q of live){x+=q.x;y+=q.y;}return {x:x/live.length,y:y/live.length};
}
function setSpeed(i){
  if(i<0||i>=SIM.TIMESCALES.length)return;
  if(SIM.TIMESCALES[i]===0&&SIM.TIMESCALES[A.speed]!==0){A.pauses++;A.lastSpeed=A.speed;}
  A.speed=i;syncHud(true);
}
function togglePause(){if(SIM.TIMESCALES[A.speed]===0)setSpeed(A.lastSpeed||2);else setSpeed(0);}

/* =====================================================================
   Loading, the picker, the end card
   ===================================================================== */
function load(id,variant,seed){
  const scn=REG.find(s=>s.id===id);
  if(!scn)throw new Error('Unknown arena scenario '+id);
  if(!scn.rulesets||!scn.rulesets.includes('hc'))throw new Error(id+' does not run under High Command');
  if(!A.active)openUi();
  A.scen=scn;A.variant=variant||0;if(seed!=null)A.seed=seed>>>0;
  SIM.build(scn,{seed:A.seed,variant:A.variant});
  makeStars();
  A.phase='LIVE';A.acc=0;A.lastFrame=0;A.realSecs=0;A.pausedSecs=0;A.pauses=0;A.recorded=false;
  A.sel=null;A.selShip=null;A.tray=null;A.panel=null;A.drawer=false;A.arm=null;A.camHeld=false;A.lastEv=0;
  A.speed=0;A.lastSpeed=2;   // it opens paused: pause is free, so the first decision never runs against the clock
  byId('hcPicker').hidden=true;byId('hcEnd').hidden=true;
  fitCanvas();camFit();buildPanel();rosterBuilt='';syncHud(true);
  return SIM.S;
}
function restart(same){if(!A.scen)return;load(A.scen.id,A.variant,same?A.seed:((A.seed*2654435761+12345)>>>0)%1000000);}
function showPicker(){
  if(!A.active)openUi();
  A.phase='PICK';closeAll();
  let h='<div class="hc-win"><h2 class="sr-display">Type 3: High Command</h2><p>Mission Control: your wings fly themselves. Order them, set their tactics and standing rules, spend command points. Pause is free. Seed '+A.seed+'.</p><div class="hc-pick">';
  for(const s of scenarios()){
    h+='<div class="hc-pick__item" data-scen="'+esc(s.id)+'"><div class="hc-pick__txt"><div class="hc-pick__name">'+esc(s.title)+'</div><div class="hc-pick__desc">'+esc(s.desc||'')+'</div></div><div class="hc-pick__go">';
    if(s.variants&&s.variants.length)s.variants.forEach((v,i)=>{h+='<button type="button" class="sr-btn sr-btn--sm" data-load="'+esc(s.id)+'" data-variant="'+i+'">'+esc(v.label)+'</button>';});
    else h+='<button type="button" class="sr-btn sr-btn--sm" data-load="'+esc(s.id)+'">Fly</button>';
    h+='</div></div>';
  }
  h+='</div><div class="hc-fine"><button type="button" class="sr-btn sr-btn--sm" data-act="rulesets">Change ruleset</button> Nothing here touches your campaign. <button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="title">Back to title</button></div></div>';
  const el=byId('hcPicker');el.innerHTML=h;el.hidden=false;byId('hcEnd').hidden=true;
  syncHud(true);
}
byId('hcPicker').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.load)load(b.dataset.load,b.dataset.variant!=null?+b.dataset.variant:0);
  else if(b.dataset.act==='rulesets')toRulesets();
  else if(b.dataset.act==='title')backToTitle();
});
function onOver(){
  A.phase='OVER';
  const o=SIM.S.over;
  const el=byId('hcEnd');
  el.innerHTML='<div class="hc-win"><h2 class="sr-display">'+esc(o.why)+'</h2><p>'+esc(A.scen.title)+' · '+fmtClock(SIM.S.t)+' flown · '+o.lost+' lost, '+o.jumped+' jumped out · seed '+A.seed+'</p>'+
    '<div class="hc-btns"><button type="button" class="sr-btn" data-act="same">Restart (same seed)</button><button type="button" class="sr-btn" data-act="new">Restart (new seed)</button>'+
    '<button type="button" class="sr-btn" data-act="dump">Dump metrics</button><button type="button" class="sr-btn sr-btn--ghost" data-act="picker">HC scenarios</button></div></div>';
  el.hidden=false;
  syncHud(true);
}
byId('hcEnd').addEventListener('click',ev=>{const b=ev.target.closest('button[data-act]');if(b)panelAct(b.dataset.act);});
function toRulesets(){closeUi();if(window.SR_ARENA_PICKER)window.SR_ARENA_PICKER();}
function backToTitle(){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}location.reload();}
const fmtClock=t=>{t=Math.max(0,Math.ceil(t-1e-9));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};

/* =====================================================================
   Glyphs: single-colour 24-unit paths (currentColor), so armed / set / disabled are CSS
   ===================================================================== */
const circ=(x,y,r)=>'M'+(x-r)+' '+y+'a'+r+' '+r+' 0 1 0 '+(2*r)+' 0a'+r+' '+r+' 0 1 0 '+(-2*r)+' 0';
const GLYPH={
  attack:circ(12,12,6)+'M12 2v6M12 16v6M2 12h6M16 12h6',
  defend:'M12 3l7 3v5c0 5-3 8-7 10c-4-2-7-5-7-10V6z',
  intercept:'M4 6l6 6-6 6M11 6l6 6-6 6M20 5v14',
  escort:'M12 7l4 9H8z'+circ(12,12,9),
  withdraw:'M4 12h11M11 7l5 5-5 5M20 4v16',
  regroup:'M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5'+circ(12,12,2),
  hold:circ(12,12,7)+circ(12,12,1.5),
  capture:'M6 21V4M6 4h11l-3 4 3 4H6',
  board:'M12 3v10M7 8l5 5 5-5M5 21h14M8 17h8',
  tight:circ(12,7,2)+circ(8,14,2)+circ(16,14,2),
  spread:circ(4,12,2)+circ(12,12,2)+circ(20,12,2),
  screen:'M3 17h18M7 12l5-5 5 5',
  pincer:'M3 5c7 0 9 7 9 7M3 19c7 0 9-7 9-7M14 12h7',
  hitrun:'M3 17l5-9 4 6 4-6 5 9',
  defensive:'M12 3l7 3v5c0 5-3 8-7 10c-4-2-7-5-7-10V6zM9 12h6',
  pause:'M8 5v14M16 5v14',
  slow:'M9 6l7 6-7 6z',
  play:'M7 5l12 7-12 7z',
  fast:'M3 5l9 7-9 7zM12 5l9 7-9 7z',
  focus:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'+circ(12,12,3),
  follow:circ(12,12,8)+'M12 2v4M12 18v4M2 12h4M18 12h4',
  view:'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z'+circ(12,12,2.5),
  close:'M6 6l12 12M18 6L6 18',
};
const glyph=(k,cls)=>'<svg class="hc-glyph'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+GLYPH[k]+'"/></svg>';
const TIME_BTNS=[{k:'pause',name:'Pause',line:'Stop the clock. Orders, tactics, rules and commands all work while paused; pause is free and unlimited.',key:'Space · 1'},
  {k:'slow',name:'Slow',line:()=>'Run at '+SIM.TIMESCALES[1]+'× speed.',key:'2'},
  {k:'play',name:'Play',line:()=>'Run in real time ('+SIM.TIMESCALES[2]+'×).',key:'3'},
  {k:'fast',name:'Fast forward',line:()=>'Run at '+SIM.TIMESCALES[3]+'× speed.',key:'4'}];

/* =====================================================================
   The HUD
   ===================================================================== */
/* top left: the objectives, with the mission rules nested under them */
function objHtml(){
  const S=SIM.S;
  let h='<div class="hc-obj__head">Objectives</div><ul class="hc-obj__list">';
  for(const o of S.objectives)h+='<li class="hc-obj__item is-'+o.state+(o.primary?' is-primary':'')+'"><i></i><span>'+esc(o.text)+'</span></li>';
  h+='</ul>';
  if(S.getOut)h+='<div class="hc-obj__getout">GET OUT: withdraw every wing to the jump point</div>';
  return h;
}
/* the mission rules, nested under the objectives: cyan scope chips (rescind with ×) and + RULE */
function rulesHtml(){
  const S=SIM.S;
  let h='<div class="hc-rules__head">Mission rules</div><div class="hc-rules__chips">';
  if(!S.rules.length)h+='<span class="hc-rules__none">No rules</span>';
  for(const r of S.rules)h+='<span class="hc-rchip" data-tip="rule:'+r.rule+'">'+esc(SIM.ruleLabel(r))+'<button type="button" class="hc-rchip__x" data-unrule="'+r.id+'" aria-label="Rescind">'+glyph('close','hc-glyph--xs')+'</button></span>';
  h+='<button type="button" class="hc-addrule" data-act="addrule" aria-expanded="'+!!A.rulePick+'">+ RULE</button></div>';
  const P=A.rulePick;
  if(P){
    h+='<div class="hc-rulepick">';
    if(P.step==='rule'){for(const k of SIM.RULE_KEYS)h+='<button type="button" class="hc-rulepick__row" data-pickrule="'+k+'"><b>'+esc(SIM.RULES[k].name)+'</b><span>'+esc(SIM.RULES[k].line())+'</span></button>';}
    else if(P.step==='scope'){h+='<div class="hc-rulepick__q">'+esc(SIM.RULES[P.rule].name)+': for which wings?</div><div class="hc-rulepick__chips"><button type="button" class="hc-tchip is-point" data-pickscope="all">All wings</button>';
      for(const w of S.wings)h+='<button type="button" class="hc-tchip is-ally" data-pickscope="'+w.id+'">'+esc(w.name)+'</button>';h+='</div>';}
    else if(P.step==='ship'){h+='<div class="hc-rulepick__q">Saviour Protocol: which friendly?</div><div class="hc-rulepick__chips">';
      for(const x of S.ships)if(x.alive&&x.faction==='reb'&&!x.struct)h+='<button type="button" class="hc-tchip is-ally" data-pickship="'+x.id+'">'+esc(x.name)+'</button>';h+='</div>';}
    h+='<button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="cancelrule">Cancel</button></div>';
  }
  return h;
}
byId('hcRules').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b||!SIM.S)return;
  if(b.dataset.unrule){SIM.removeRule(+b.dataset.unrule);syncHud(true);return;}
  if(b.dataset.act==='addrule'){A.rulePick=A.rulePick?null:{step:'rule'};syncHud(true);return;}
  if(b.dataset.act==='cancelrule'){A.rulePick=null;syncHud(true);return;}
  const P=A.rulePick;if(!P)return;
  if(b.dataset.pickrule){P.rule=b.dataset.pickrule;P.step='scope';}
  else if(b.dataset.pickscope){P.scope=b.dataset.pickscope;if(SIM.RULES[P.rule].needs==='ship')P.step='ship';else{const r=SIM.addRule(P.rule,P.scope);if(!r.ok)flash(r.why);A.rulePick=null;}}
  else if(b.dataset.pickship){const r=SIM.addRule(P.rule,P.scope,b.dataset.pickship);if(!r.ok)flash(r.why);A.rulePick=null;}
  syncHud(true);
});
function syncTop(){
  const S=SIM.S,on=A.phase!=='PICK'&&S;
  byId('hcTop').hidden=!on;
  if(!on)return;
  const o=byId('hcObj'),oh=objHtml();if(o.dataset.h!==oh){o.innerHTML=oh;o.dataset.h=oh;}
  const ru=byId('hcRules'),rh=rulesHtml();if(ru.dataset.h!==rh){ru.innerHTML=rh;ru.dataset.h=rh;}
  const left=SIM.clockLeft(),ck=byId('hcClock');
  ck.textContent=S.reinforce.spawned?'REINFORCEMENTS':fmtClock(left);
  ck.classList.toggle('is-out',S.reinforce.spawned);
  ck.title='Hegemony reinforcements arrive when this reaches zero';
  byId('hcBanner').hidden=!(SIM.TIMESCALES[A.speed]===0&&A.phase==='LIVE');
  const cp=byId('hcCp');let ph='';for(let i=0;i<S.cpMax;i++)ph+='<i class="'+(i<S.cp?'is-on':'')+'"></i>';
  const ch='<span class="hc-cp__lbl">CP</span><span class="hc-cp__pips">'+ph+'</span><b>'+S.cp+' / '+S.cpMax+'</b>';
  if(cp.dataset.h!==ch){cp.innerHTML=ch;cp.dataset.h=ch;}
}
/* left rail: the event feed; VIEW jumps the camera there */
function syncFeed(){
  const S=SIM.S,el=byId('hcFeed');
  if(!S||A.phase==='PICK'){el.innerHTML='';return;}
  const evs=S.events.slice(-14).reverse();
  let h='';
  for(const e of evs){
    const where=e.x!=null||e.ship;
    const sh=e.kind==='emergency'?SIM.fn.byId(e.ship):null,live=sh&&sh.alive&&sh.emerg&&sh.emerg.ev===e.id&&!sh.emerg.resp;
    h+='<div class="hc-ev is-'+e.tone+(e.viewed?' is-viewed':'')+(live?' is-live':'')+'" data-ev="'+e.id+'"><span class="hc-ev__t">'+fmtClock(e.t)+'</span><span class="hc-ev__txt">'+esc(e.text)+'</span>'+
      (where?'<button type="button" class="hc-view" data-view="'+e.id+'" aria-label="View">'+glyph('view','hc-glyph--sm')+'VIEW</button>':'')+
      (live?'<span class="hc-ev__resp">'+SIM.emergencyOpts(sh).map(o=>'<button type="button" class="hc-resp'+(o.rec?' is-rec':'')+'" data-resp="'+o.key+'" data-ship="'+sh.id+'"'+(o.ok?'':' aria-disabled="true"')+' data-tip="resp:'+o.key+'">'+esc(o.key==='wingmate'?'Wingmate':o.key==='ride'?'Ride it out':o.name.replace('Emergency ','').replace('Patriot ',''))+(o.cost?' <b class="hc-cpc">'+o.cost+'</b>':'')+'</button>').join('')+'</span>':'')+'</div>';
  }
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
}
function viewEvent(id){
  const e=SIM.S.events.find(x=>x.id===id);if(!e)return false;
  e.viewed=true;
  const s=SIM.fn.byId(e.ship);
  const p=s&&s.alive?s:(e.x!=null?{x:e.x,y:e.y}:s);
  if(p)camTo(p.x,p.y,Math.max(cam.z,0.45));
  if(s&&s.faction==='reb'&&!s.quiet&&s.wing){A.selShip=s.id;A.sel=s.wing;openPilot(s.id);}
  syncHud(true);
  return true;
}
byId('hcFeed').addEventListener('click',ev=>{
  const r=ev.target.closest('[data-resp]');
  if(r){respond(r.dataset.ship,r.dataset.resp,r);return;}
  const b=ev.target.closest('[data-view]');if(b)viewEvent(+b.dataset.view);
});
function respond(id,key,el){
  if(el&&el.getAttribute('aria-disabled')==='true'){flash(key==='wingmate'?'No wingmate free':'Not enough command points');return {ok:false};}
  const r=SIM.respond(id,key);
  if(!r.ok)flash(r.why);
  syncHud(true);return r;
}

/* bottom: the wing roster. A header per wing (name, order chip, tactic chip) and a tile per ship */
let rosterBuilt='';
const moraleWord=s=>SIM.moraleOf(s);
function tileHtml(s){
  return '<button type="button" class="hc-tile" data-ship="'+s.id+'"><canvas class="hc-tile__cam" width="204" height="112"></canvas>'+
    '<span class="hc-tile__name"></span><span class="hc-tile__bars"><i class="hc-bar hc-bar--hull"><b></b></i><i class="hc-bar hc-bar--shd"><b></b></i></span>'+
    '<span class="hc-tile__foot"><span class="hc-tile__word"></span><span class="hc-tile__mor"></span></span><span class="hc-tile__ord"></span></button>';
}
function buildRoster(){
  const S=SIM.S,el=byId('hcRoster');
  let h='';
  for(const w of S.wings){
    h+='<div class="hc-wing" data-wing="'+w.id+'"><button type="button" class="hc-wing__head" data-wing-head="'+w.id+'"><span class="hc-wing__name">'+esc(w.name)+'</span>'+
      '<span class="hc-chip hc-chip--order" data-chip="order"></span><span class="hc-chip hc-chip--tactic" data-chip="tactic"></span></button><div class="hc-wing__tiles">';
    for(const id of w.ships)h+=tileHtml(SIM.fn.byId(id));
    h+='</div></div>';
  }
  el.innerHTML=h;rosterBuilt=S.seed+'|'+S.scn.id;
  for(const t of el.querySelectorAll('.hc-tile')){const s=SIM.fn.byId(t.dataset.ship);drawTileGlyph(t.querySelector('canvas'),s);}
}
/* the camera tiles (§3.1): each a small live view tracking its ship, drawn from the main sim at about 10 fps,
   round-robin one tile a frame. If drawing them costs more than TILE_BUDGET ms a frame on average with 8 or more
   ships, they fall back to static glyphs (C-67) */
let TILES_LIVE=true;      // panel toggle
let TILE_Z=0.34;          // a tile's zoom (tile pixels per world unit, before its 2× backing). placeholder
let TILE_BUDGET=3;        // ms a frame the tiles may cost before they fall back. placeholder
let tileIdx=0,tileMs=0,tileAuto=false;
function tileTick(){
  if(!TILES_LIVE||A.phase==='PICK'||!SIM.S)return;
  const tiles=byId('hcRoster').querySelectorAll('.hc-tile');if(!tiles.length)return;
  tileIdx=(tileIdx+1)%tiles.length;
  const t=tiles[tileIdx],s=SIM.fn.byId(t.dataset.ship);if(!s)return;
  const t0=performance.now();
  drawTileCam(t.querySelector('canvas'),s);
  tileMs=tileMs*0.9+(performance.now()-t0)*0.1;
  if(tileMs>TILE_BUDGET&&tiles.length>=8){TILES_LIVE=false;tileAuto=true;flash('Camera tiles fell back to static glyphs ('+tileMs.toFixed(1)+' ms a tile)');for(const x of tiles)drawTileGlyph(x.querySelector('canvas'),SIM.fn.byId(x.dataset.ship));}
}
function drawTileCam(cvs,s,zoom){
  const c=cvs.getContext('2d'),S=SIM.S,W2=cvs.width,H2=cvs.height,z=zoom?zoom*W2/340:TILE_Z*W2/96;
  c.setTransform(1,0,0,1,0,0);c.fillStyle=C.void;c.fillRect(0,0,W2,H2);
  if(!s.alive){c.fillStyle=C.text3;c.font='800 '+Math.round(H2*0.22)+'px "Exo 2",sans-serif';c.textAlign='center';c.fillText(s.jumped?'JUMPED':'SIGNAL LOST',W2/2,H2*0.58);return;}
  const cx=s.x,cy=s.y,hw=W2/2/z,hh=H2/2/z;
  c.setTransform(z,0,0,z,W2/2-cx*z,H2/2-cy*z);
  c.fillStyle='#dfe6ff';c.globalAlpha=0.5;c.beginPath();
  for(const st of stars){if(Math.abs(st.x-cx)>hw||Math.abs(st.y-cy)>hh)continue;c.rect(st.x-1/z,st.y-1/z,2/z,2/z);}c.fill();c.globalAlpha=1;
  for(const r of S.rocks)if(Math.abs(r.x-cx)<hw+r.r&&Math.abs(r.y-cy)<hh+r.r)drawRock(c,r);
  const saveDpr=dpr;dpr=1;
  try{
    for(const o of S.ships){if(!o.alive||Math.abs(o.x-cx)>hw+80||Math.abs(o.y-cy)>hh+80)continue;drawShipBody(c,o,o.x,o.y,o.h,z,1);}
  }finally{dpr=saveDpr;}
  c.lineCap='round';
  for(const p of S.proj){if(Math.abs(p.x-cx)>hw||Math.abs(p.y-cy)>hh)continue;const sp=Math.hypot(p.vx,p.vy)||1;c.beginPath();c.moveTo(p.x-p.vx/sp*22,p.y-p.vy/sp*22);c.lineTo(p.x,p.y);c.lineWidth=2.4/z;c.strokeStyle=boltCols(p)[1];c.stroke();}
  c.setTransform(1,0,0,1,0,0);
  if(s.emerg){c.strokeStyle=C.hazard;c.lineWidth=4;c.strokeRect(2,2,W2-4,H2-4);}
}
/* a static tile camera: the ship's glyph in its livery (before the first live frame, and the perf fallback) */
function drawTileGlyph(cvs,s){
  const c=cvs.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle=C.void;c.fillRect(0,0,cvs.width,cvs.height);
  const saveDpr=dpr;dpr=1;
  try{drawShipBody(c,s,cvs.width/2,cvs.height/2,-Math.PI/2,cvs.width/96,0.75);}finally{dpr=saveDpr;}
}
function syncRoster(){
  const S=SIM.S,el=byId('hcRoster');
  if(!S||A.phase==='PICK'){el.hidden=true;return;}
  el.hidden=false;
  if(rosterBuilt!==S.seed+'|'+S.scn.id)buildRoster();
  for(const w of S.wings){
    const box=el.querySelector('[data-wing="'+w.id+'"]');if(!box)continue;
    box.classList.toggle('is-sel',A.sel===w.id);
    const oc=box.querySelector('[data-chip="order"]'),tc=box.querySelector('[data-chip="tactic"]');
    const ot=SIM.ORDERS[w.order.kind].name+(w.order.target?' · '+SIM.targetLabel(w.order):'');
    if(oc.textContent!==ot)oc.textContent=ot;
    const tt=SIM.HC_TACTICS[w.tactic].name;if(tc.textContent!==tt)tc.textContent=tt;
    for(const sid of w.ships){
      const s=SIM.fn.byId(sid),t=box.querySelector('[data-ship="'+sid+'"]');if(!s||!t)continue;
      const lead=w.leader===sid;
      const nm=(lead?'★ ':'')+s.name;
      const nmEl=t.querySelector('.hc-tile__name');if(nmEl.textContent!==nm)nmEl.textContent=nm;
      t.querySelector('.hc-bar--hull b').style.width=Math.round(Math.max(0,s.hull)/s.maxHull*100)+'%';
      const ms=SIM.fn.maxShield(s);t.querySelector('.hc-bar--shd b').style.width=(ms?Math.round(SIM.fn.totalShield(s)/ms*100):0)+'%';
      const ord=s.jumped?'JUMPED':!s.alive?'DOWN':behWord(s);
      const wEl=t.querySelector('.hc-tile__word');if(wEl.textContent!==ord)wEl.textContent=ord;
      const gk=s.alive?behGlyph(s)+'|'+behTone(s):'';const oEl=t.querySelector('.hc-tile__ord');
      if(oEl.dataset.g!==gk){oEl.dataset.g=gk;oEl.innerHTML=s.alive?glyph(behGlyph(s),'hc-glyph--sm'):'';oEl.dataset.tone=behTone(s);}
      t.title=s.alive?s.name+': '+ord+(s.assess?' · "'+s.assess+'"':''):s.name;
      const mo=s.alive?moraleWord(s):'';const mEl=t.querySelector('.hc-tile__mor');if(mEl.textContent!==mo){mEl.textContent=mo;mEl.dataset.m=mo;}
      t.classList.toggle('is-crit',s.alive&&(s.hull/s.maxHull<0.35||moraleWord(s)==='PANICKED'));
      t.classList.toggle('is-down',!s.alive);
      t.classList.toggle('is-sel',A.selShip===sid);
    }
  }
}
/* the ship's current order as a corner glyph (and a word on hover): gold-less, cyan when a rule set it, hazard in an emergency */
const BEH={engage:['attack','ENGAGE'],withdraw:['withdraw','WITHDRAW'],escort:['escort','ESCORT'],form:['regroup','FORM UP'],defend:['defend','DEFEND'],
  hold:['hold','HOLD'],capture:['capture','CAPTURE'],board:['board','BOARD'],fallback:['withdraw','FALL BACK'],flee:['withdraw','FLEEING'],freeze:['hold','FROZEN'],idle:['hold','IDLE']};
function behWord(s){const b=s.beh||{};return (BEH[b.kind]||['hold',String(b.kind||'').toUpperCase()])[1];}
function behGlyph(s){const b=s.beh||{};return (BEH[b.kind]||['hold'])[0];}
const behTone=s=>s.panic||s.emerg?'hazard':s.beh&&s.beh.rule?'rule':'';
byId('hcRoster').addEventListener('click',ev=>{
  const h=ev.target.closest('[data-wing-head]');
  if(h){selectWing(h.dataset.wingHead,true);return;}
  const t=ev.target.closest('[data-ship]');
  if(t){
    const s=SIM.fn.byId(t.dataset.ship);if(!s)return;
    if(A.cmdArm){cmdApply(A.cmdArm,{id:s.id});return;}
    A.selShip=s.id;A.sel=s.wing;openPilot(s.id);if(s.alive)camTo(s.x,s.y);syncHud(true);
  }
});
/* target-first: right-click a tile or a wing header for the commands that apply to it */
byId('hcRoster').addEventListener('contextmenu',ev=>{
  ev.preventDefault();
  const h=ev.target.closest('[data-wing-head]'),t=ev.target.closest('[data-ship]');
  if(h)openDrawer({wing:h.dataset.wingHead});else if(t)openDrawer({id:t.dataset.ship});
});
function selectWing(id,open){
  if(A.cmdArm==='recall'){cmdApply('recall',{wing:id});return;}
  A.sel=id;A.selShip=null;A.arm=null;
  if(open){A.tray=id;A.panel=null;}
  syncHud(true);
}

/* bottom right: the time controls */
function timeHtml(){
  let h='';
  TIME_BTNS.forEach((b,i)=>{h+='<button type="button" class="hc-tbtn'+(A.speed===i?' is-on':'')+'" data-speed="'+i+'" data-tip="time:'+i+'" aria-pressed="'+(A.speed===i)+'" aria-label="'+b.name+'">'+glyph(b.k)+'</button>';});
  h+='<span class="hc-time__div"></span>';
  h+='<button type="button" class="hc-tbtn" data-act="focus" data-tip="focus" aria-label="Event focus">'+glyph('focus')+'</button>';
  h+='<button type="button" class="hc-tbtn'+(A.follow?' is-on':'')+'" data-act="follow" data-tip="follow" aria-pressed="'+A.follow+'" aria-label="Follow">'+glyph('follow')+'</button>';
  return h;
}
function syncTime(){
  const el=byId('hcTime');el.hidden=A.phase==='PICK';
  const h=timeHtml();if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
}
byId('hcTime').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.speed!=null)setSpeed(+b.dataset.speed);
  else if(b.dataset.act==='focus')nextEvent();
  else if(b.dataset.act==='follow'){A.follow=!A.follow;A.camHeld=false;syncHud(true);}
});
/* event focus: the newest unviewed event with a place, else the newest with a place */
function nextEvent(){   // the newest unviewed event with a place, then the next newest, then the latest again
  const S=SIM.S;if(!S)return false;
  const evs=S.events.filter(e=>e.x!=null||e.ship);
  const e=evs.slice().reverse().find(x=>!x.viewed)||evs[evs.length-1];
  return e?viewEvent(e.id):false;
}

/* the wing command tray (§3.4): anchored panel-left */
function trayHtml(){
  const w=SIM.fn.wingOf(A.tray);if(!w)return '';
  const lead=SIM.fn.byId(w.leader);
  let h='<div class="hc-tray__head"><span class="hc-tray__name">'+esc(w.name)+'</span><span class="hc-tray__lead">'+
    (lead?'Led by '+esc(lead.name)+' · L'+lead.pilot.level:'No leader: '+(w.leadLostT!=null?'promoting':'—'))+'</span>'+
    '<button type="button" class="hc-x" data-act="close" aria-label="Close">'+glyph('close','hc-glyph--sm')+'</button></div>';
  h+='<div class="hc-tray__lbl">Order</div><div class="hc-tray__row">';
  let n=0;
  for(const k of SIM.ORDER_KEYS){
    const built=SIM.T1_ORDERS.includes(k),why=!built?'Arrives in a later build phase':(k==='board'&&!SIM.fn.wingShips(w).some(s=>s.marines))?'No marines in this wing':null;
    n++;
    const cls=(w.order.kind===k?' is-set':'')+(A.arm===k?' is-armed':'');
    h+='<button type="button" class="hc-ico hc-ico--order'+cls+'" data-order="'+k+'" data-tip="order:'+k+'" data-key="'+n+'" aria-label="'+esc(SIM.ORDERS[k].name)+'"'+(why?' aria-disabled="true" data-why="'+esc(why)+'"':'')+'>'+glyph(k)+'<span class="hc-ico__n">'+n+'</span></button>';
  }
  h+='</div>';
  if(A.arm&&SIM.ORDERS[A.arm].targeted){
    const chips=SIM.targetChips(w,A.arm);
    h+='<div class="hc-tray__lbl">Target <span class="hc-tray__hint">or click the map</span></div><div class="hc-tray__chips">';
    chips.forEach((c,i)=>{h+='<button type="button" class="hc-tchip is-'+c.kind+'" data-tchip="'+i+'">'+esc(c.label)+'</button>';});
    if(!chips.length)h+='<span class="hc-tray__hint">Nothing to target</span>';
    h+='</div>';
  }
  h+='<div class="hc-tray__lbl">Wing tactic</div><div class="hc-tray__row">';
  for(const k of SIM.TACTIC_KEYS)h+='<button type="button" class="hc-ico hc-ico--tactic'+(w.tactic===k?' is-set':'')+'" data-tactic="'+k+'" data-tip="tactic:'+k+'" aria-label="'+esc(SIM.HC_TACTICS[k].name)+'"'+(TACTICS_LIVE?'':' aria-disabled="true" data-why="Arrives in a later build phase"')+'>'+glyph(k)+'</button>';
  h+='</div>';
  return h;
}
let TACTICS_LIVE=true;    // the tactic row (live from T2)
function syncTray(){
  const el=byId('hcTray'),h=A.tray&&A.phase!=='PICK'?trayHtml():'';
  if(el.dataset.h!==h){hideTip();el.innerHTML=h;el.dataset.h=h;}
  el.hidden=!h;
}
byId('hcTray').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  const w=SIM.fn.wingOf(A.tray);if(!w)return;
  if(b.dataset.act==='close'){A.tray=null;A.arm=null;syncHud(true);return;}
  if(b.getAttribute('aria-disabled')==='true'){flash(b.dataset.why||'Not available');return;}
  if(b.dataset.order){
    const k=b.dataset.order;
    if(SIM.ORDERS[k].targeted){A.arm=A.arm===k?null:k;syncHud(true);return;}
    issue(w.id,k,null);return;
  }
  if(b.dataset.tchip!=null){const c=SIM.targetChips(w,A.arm)[+b.dataset.tchip];if(c)issue(w.id,A.arm,c.target);return;}
  if(b.dataset.tactic){const r=SIM.setTactic(w.id,b.dataset.tactic);if(!r.ok)flash(r.why);syncHud(true);}
});
function issue(wid,kind,target){
  const r=SIM.setOrder(wid,kind,target);
  if(!r.ok){flash(r.why);return r;}
  A.arm=null;syncHud(true);
  return r;
}

/* hover cards (§3.4): name and one plain line, live numbers through getters */
function tipFor(key){
  const [k,a]=String(key).split(':');
  if(k==='order'){const o=SIM.ORDERS[a];return {name:o.name,line:o.line+(a==='escort'?' Engages inside '+Math.round(SIM.TUNE.ESCORT_R.get())+' of its charge.':'')+(a==='withdraw'?' Jumps inside '+Math.round(SIM.fn.JUMP_R_())+' of the point.':'')};}
  if(k==='tactic'){const T=SIM.HC_TACTICS[a];return {name:T.name,line:T.line+' Spacing ×'+T.space+', fights at ×'+T.engage+' range, breaks off under '+Math.round(T.disengage*100)+'% hull.'};}
  if(k==='time'){const b=TIME_BTNS[+a];return {name:b.name,line:typeof b.line==='function'?b.line():b.line,key:b.key};}
  if(k==='rule'){const R=SIM.RULES[a];return {name:R.name,line:R.line()};}
  if(k==='cmd'){const C2=SIM.COMMANDS[a];return {name:C2.name+' · '+(C2.cost()?C2.cost()+' CP':'free'),line:C2.line()};}
  if(k==='abil'){const B=SIM.ABILITIES[a];return {name:B.name+' · '+B.cd+' s recharge',line:B.line};}
  if(k==='doc')return {name:a,line:{AUTO:'The pilot uses it whenever it helps.',EMERG:'Only under its emergency trigger.',MANUAL:'Never by itself: press Use.'}[a]};
  if(k==='resp'){if(a==='wingmate')return {name:'Send a wingmate',line:'Free: the nearest wingmate not in trouble breaks off to go for whoever has this pilot pinned.'};
    if(a==='ride')return {name:'Ride it out',line:'Free: do nothing, and let the pilot handle it.'};
    const C2=SIM.COMMANDS[a];return {name:C2.name+' · '+C2.cost()+' CP',line:C2.line()};}
  if(k==='focus')return {name:'Event focus',line:'Jump the camera to the newest event you have not viewed.',key:'Tab'};
  if(k==='follow')return {name:'Follow',line:'Keep the camera on the selected ship or wing.',key:'F'};
  return {name:key,line:''};
}
let tipT=0,tipEl=null;
function showTip(el){
  const tip=byId('hcTip'),d=tipFor(el.dataset.tip),why=el.dataset.why;
  tip.innerHTML=(why?'<div class="hc-tip__warn">'+esc(why)+'</div>':'')+'<div class="hc-tip__name">'+esc(d.name)+(d.key?' <span class="sr-kbd">'+esc(d.key)+'</span>':'')+'</div><div class="hc-tip__line">'+esc(d.line)+'</div>';
  tip.hidden=false;tipEl=el;
  const st=byId('hcStage').getBoundingClientRect(),r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
  let x=r.left-st.left+r.width/2-w/2,y=r.top-st.top-h-8;if(y<8)y=r.bottom-st.top+8;
  tip.style.left=Math.round(Math.max(8,Math.min(st.width-8-w,x)))+'px';tip.style.top=Math.round(y)+'px';
}
function hideTip(){clearTimeout(tipT);tipEl=null;const t=byId('hcTip');if(t)t.hidden=true;}
byId('hcStage').addEventListener('pointerover',ev=>{
  const el=ev.target.closest&&ev.target.closest('[data-tip]');
  if(!el||el===tipEl)return;hideTip();tipT=setTimeout(()=>{if(el.isConnected)showTip(el);},250);
});
byId('hcStage').addEventListener('pointerout',ev=>{const el=ev.target.closest&&ev.target.closest('[data-tip]');if(el&&!el.contains(ev.relatedTarget))hideTip();});
let flashT=0;
function flash(msg){const t=byId('hcToast');t.textContent=msg;t.hidden=false;clearTimeout(flashT);flashT=setTimeout(()=>{t.hidden=true;},2200);}

function closeAll(){A.tray=null;A.panel=null;A.drawer=false;A.arm=null;A.rulePick=null;A.cmdArm=null;A.cmdFor=null;A.abortArm=false;hideTip();}

/* =====================================================================
   The pilot panel (§3.2): over the left rail, from a tile or VIEW
   ===================================================================== */
function openPilot(id){A.panel=id;A.tray=null;A.arm=null;pilotBuilt=null;syncHud(true);}
let pilotBuilt=null;
function bar(lbl,v,max,cls){const k=max>0?Math.max(0,Math.min(1,v/max)):0;return '<div class="hc-pbar'+(cls?' '+cls:'')+'"><span>'+lbl+'</span><i><b style="width:'+Math.round(k*100)+'%"></b></i><em>'+(max>0?Math.max(0,Math.round(v))+'/'+max:'—')+'</em></div>';}
function pilotBody(s){
  const S=SIM.S,w=SIM.fn.wingOf(s.wing),b=s.beh||{},t=SIM.fn.byId(b.target||b.charge||b.station),mor=SIM.moraleOf(s);
  const P=s.pilot;
  let h='<div class="hc-pilot__head"><span class="hc-pilot__name">'+esc(s.name)+'</span><span class="hc-pilot__sub">'+esc((P.preset||'')+(P.preset?' · ':'')+'L'+P.level+' · '+(w?w.name:'')+(w&&w.leader===s.id?' lead':'')+' · '+SIM.PERSONALITY[s.persona].label)+'</span>'+
    '<span class="hc-mor" data-m="'+mor+'">'+mor+'</span><button type="button" class="hc-x" data-act="close" aria-label="Close">'+glyph('close','hc-glyph--sm')+'</button></div>';
  if(!s.alive)return h+'<div class="hc-pilot__line">'+(s.jumped?'Jumped out.':'Down.')+'</div>';
  h+='<div class="hc-pilot__bars">'+bar('Hull',s.hull,s.maxHull,'is-hull')+bar('Armour',s.arm,s.maxArm,'is-arm')+bar('Shields',SIM.fn.totalShield(s),SIM.fn.maxShield(s),'is-shd')+'</div>';
  h+='<div class="hc-pilot__line"><b>'+esc(behWord(s))+'</b>'+(t?' · '+esc(t.label||t.name):'')+(b.rule?' · <span class="is-rule">'+esc(SIM.RULES[b.rule].name)+'</span>':'')+'<br><q>'+esc(s.assess||'')+'</q></div>';
  const abil=SIM.abilitiesOf(s.id);
  if(abil.length){
    h+='<div class="hc-tray__lbl">Abilities · doctrine</div>';
    for(const k of abil){
      const doc=(s.doct&&s.doct[k])||'AUTO',cd=Math.max(0,((s.abCd&&s.abCd[k])||0)-S.t);
      h+='<div class="hc-abil"><span class="hc-abil__name" data-tip="abil:'+k+'">'+esc(SIM.ABILITIES[k].name)+'</span><span class="hc-seg" role="group">'+
        SIM.DOCTRINES.map(d=>'<button type="button" class="hc-seg__b'+(d===doc?' is-on':'')+'" data-doc="'+d+'" data-abil="'+k+'" aria-pressed="'+(d===doc)+'" data-tip="doc:'+d+'">'+d+'</button>').join('')+
        '</span><button type="button" class="hc-use" data-use="'+k+'"'+(cd>0?' aria-disabled="true"':'')+'>'+(cd>0?Math.ceil(cd)+' s':'Use')+'</button></div>';
    }
  }
  // the response row: in an emergency, the interventions that fit (gold: the recommended one) and the free ones
  const opts=s.emerg?SIM.emergencyOpts(s):null;
  h+='<div class="hc-tray__lbl">'+(opts?(s.emerg.resp?'Answered: '+esc(s.emerg.resp):'Emergency · respond'):'Interventions')+'</div><div class="hc-pilot__resp">';
  const list=opts||['override','recall','support'].filter(k=>k!=='support'||SIM.fn.maxShield(s)>0).map(k=>({key:k,name:SIM.COMMANDS[k].name,cost:SIM.COMMANDS[k].cost(),ok:S.cp>=SIM.COMMANDS[k].cost()})).concat([{key:'wingmate',name:'Send a wingmate',free:true,ok:false,why:'only in an emergency'}]);
  for(const o of list){
    const prim=o.rec&&!s.emerg.resp;
    h+='<button type="button" class="sr-btn sr-btn--sm'+(prim?' sr-btn--primary':'')+'" data-resp="'+o.key+'" data-tip="resp:'+o.key+'"'+(o.ok?'':' aria-disabled="true"')+'>'+esc(o.name)+(o.cost?' <b class="hc-cpc">'+o.cost+'</b>':o.free?' <span class="hc-free">free</span>':'')+'</button>';
  }
  return h+'</div>';
}
function syncPilot(){
  const el=byId('hcPilot'),s=A.panel&&A.phase!=='PICK'?SIM.fn.byId(A.panel):null;
  if(!s){el.hidden=true;pilotBuilt=null;return;}
  el.hidden=false;
  if(pilotBuilt!==s.id){el.innerHTML='<canvas class="hc-pilot__cam" id="hcPilotCam" width="680" height="150"></canvas><div id="hcPilotBody"></div>';pilotBuilt=s.id;}
  el.classList.toggle('is-emerg',!!(s.emerg&&s.alive));
  const body=byId('hcPilotBody'),h=pilotBody(s);
  if(body.dataset.h!==h){hideTip();body.innerHTML=h;body.dataset.h=h;}
}
byId('hcPilot').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  const s=SIM.fn.byId(A.panel);if(!s)return;
  if(b.dataset.act==='close'){A.panel=null;syncHud(true);return;}
  if(b.dataset.doc){SIM.setDoctrine(s.id,b.dataset.abil,b.dataset.doc);syncHud(true);return;}
  if(b.dataset.use){if(b.getAttribute('aria-disabled')==='true')return;const r=SIM.useAbility(s.id,b.dataset.use);if(!r.ok)flash(r.why);syncHud(true);return;}
  if(b.dataset.resp){respond(s.id,b.dataset.resp,b);}
});

/* =====================================================================
   The commands drawer (§3.3): from COMMANDS, or target-first from a right-click
   ===================================================================== */
const CMD_GLYPH={override:'attack',recall:'withdraw',reinforce:'escort',support:'defend',recon:'view',scramble:'pincer',hack:'hitrun',decoy:'capture',abort:'close'};
function openDrawer(tg){A.drawer=true;A.cmdFor=tg||null;A.cmdArm=null;A.abortArm=false;A.tray=null;A.arm=null;syncHud(true);}
function cmdFits(k,tg){
  const C2=SIM.COMMANDS[k];
  if(!tg)return true;
  if(tg.wing)return k==='recall';
  if(tg.id)return C2.target==='ship';
  if(tg.x!=null)return C2.target==='point';
  return true;
}
function drawerHtml(){
  const S=SIM.S;
  let h='<div class="hc-cmds__head"><span class="hc-cmds__title">Commands</span><span class="hc-cmds__cp">'+S.cp+' / '+S.cpMax+' CP</span>'+
    '<button type="button" class="hc-x" data-act="close" aria-label="Close">'+glyph('close','hc-glyph--sm')+'</button></div>';
  if(A.cmdFor){const x=A.cmdFor.id?SIM.fn.byId(A.cmdFor.id):null,w=A.cmdFor.wing?SIM.fn.wingOf(A.cmdFor.wing):null;
    h+='<div class="hc-cmds__for">For '+esc(x?x.name:w?w.name+' (whole wing)':'this place')+'</div>';}
  if(A.cmdArm)h+='<div class="hc-cmds__arm">'+esc(SIM.COMMANDS[A.cmdArm].name)+': '+(SIM.COMMANDS[A.cmdArm].target==='point'?'click a place on the map':A.cmdArm==='recall'?'click one of your ships, or a wing in the roster':'click one of your ships')+
    ' <button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="cancelcmd">Cancel</button></div>';
  h+='<div class="hc-cmds__list">';
  for(const k of SIM.COMMAND_KEYS){
    if(k==='abort')continue;
    if(!cmdFits(k,A.cmdFor))continue;
    const C2=SIM.COMMANDS[k],tgFree=C2.target==='none',why=SIM.commandRefusal(k,A.cmdFor||(tgFree?null:undefined))||null;
    const block=why&&(C2.open||/reserves|command points|over/.test(why)||(A.cmdFor&&why));
    const pips=C2.cost()?'<span class="hc-cmd__cost">'+'<i></i>'.repeat(C2.cost())+'</span>':'<span class="hc-free">free</span>';
    h+='<button type="button" class="hc-cmd'+(A.cmdArm===k?' is-armed':'')+'" data-cmd="'+k+'" data-tip="cmd:'+k+'"'+(block?' aria-disabled="true" data-why="'+esc(why)+'"':'')+'>'+
      glyph(CMD_GLYPH[k],'hc-glyph--sm')+'<span class="hc-cmd__name">'+esc(C2.name)+'</span>'+pips+'</button>';
  }
  h+='</div>';
  if(!A.cmdFor||cmdFits('abort',A.cmdFor)&&!A.cmdFor.id&&!A.cmdFor.wing)
    h+='<button type="button" class="hc-cmd hc-cmd--abort'+(A.abortArm?' is-armed':'')+'" data-cmd="abort" data-tip="cmd:abort">'+glyph('close','hc-glyph--sm')+'<span class="hc-cmd__name">'+(A.abortArm?'Abort: click again to confirm':'Abort Mission')+'</span><span class="hc-free">free</span></button>';
  return h;
}
function syncDrawer(){
  const el=byId('hcCmds'),h=A.drawer&&A.phase==='LIVE'?drawerHtml():'';
  if(el.dataset.h!==h){hideTip();el.innerHTML=h;el.dataset.h=h;}
  el.hidden=!h;
  byId('hcCmdBtn').setAttribute('aria-expanded',String(!!A.drawer));
}
byId('hcCmdBtn').addEventListener('click',()=>{if(A.drawer&&!A.cmdFor)A.drawer=false;else openDrawer(null);syncHud(true);});
byId('hcCmds').addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.act==='close'){A.drawer=false;A.cmdArm=null;A.cmdFor=null;A.abortArm=false;syncHud(true);return;}
  if(b.dataset.act==='cancelcmd'){A.cmdArm=null;syncHud(true);return;}
  const k=b.dataset.cmd;if(!k)return;
  if(b.getAttribute('aria-disabled')==='true'){flash(b.dataset.why||'Not available');return;}
  if(k==='abort'){if(!A.abortArm){A.abortArm=true;syncHud(true);return;}cmdApply('abort',null);return;}
  const C2=SIM.COMMANDS[k];
  if(C2.target==='none'){cmdApply(k,null);return;}
  if(A.cmdFor){cmdApply(k,A.cmdFor);return;}
  A.cmdArm=A.cmdArm===k?null:k;syncHud(true);
});
function cmdApply(k,tg){
  const r=SIM.command(k,tg);
  if(!r.ok){flash(r.why);return r;}
  A.cmdArm=null;A.cmdFor=null;A.abortArm=false;A.drawer=false;
  if(SIM.S.over&&A.phase==='LIVE')onOver();
  syncHud(true);return r;
}
function syncHud(){
  if(!A.active)return;
  syncTop();syncFeed();syncRoster();syncTime();syncTray();syncPilot();syncDrawer();syncReadout();
  placeRail();
}
/* the left rail (the feed, the tray, the pilot panel) starts under the objectives panel, however tall it grows */
function placeRail(){
  const st=byId('hcStage').getBoundingClientRect(),ob=byId('hcObjBox').getBoundingClientRect();
  const top=Math.round(Math.max(80,(byId('hcTop').hidden?60:ob.bottom-st.top)+10));
  for(const id of ['hcFeed','hcTray','hcPilot'])byId(id).style.top=top+'px';
}

/* =====================================================================
   Input on the map: select a wing by its ship; with a targeted order armed, a click names the target
   ===================================================================== */
let pan=null;
function evPt(ev){const r=cv.getBoundingClientRect();const px=ev.clientX-r.left,py=ev.clientY-r.top,w=toWorld(px,py);return {px,py,x:w.x,y:w.y};}
function shipAt(x,y){
  let best=null,bd=1e18;
  for(const s of SIM.S.ships){if(!s.alive)continue;const d=Math.hypot(s.x-x,s.y-y),r=Math.max(30/cam.z,shieldR(s,iconBoost())*1.1);if(d<r&&d<bd){bd=d;best=s;}}
  return best;
}
cv.addEventListener('pointerdown',ev=>{
  if(A.phase==='PICK'||!SIM.S)return;
  cv.setPointerCapture&&cv.setPointerCapture(ev.pointerId);
  const p=evPt(ev);pan={px:p.px,py:p.py,cx:cam.x,cy:cam.y,moved:false,button:ev.button};
});
cv.addEventListener('pointermove',ev=>{
  if(!pan)return;
  const p=evPt(ev);
  if(Math.abs(p.px-pan.px)+Math.abs(p.py-pan.py)>4)pan.moved=true;
  if(pan.moved){cam.x=pan.cx-(p.px-pan.px)/cam.z;cam.y=pan.cy-(p.py-pan.py)/cam.z;clampCam();A.camHeld=true;}
});
cv.addEventListener('pointerup',ev=>{
  if(!pan)return;const was=pan;pan=null;
  if(was.moved)return;
  mapClick(evPt(ev),ev);
});
cv.addEventListener('pointercancel',()=>{pan=null;});
cv.addEventListener('contextmenu',ev=>{   // target-first: right-click one of your ships, or a place, for the commands that apply
  ev.preventDefault();if(A.phase!=='LIVE')return;
  const p=evPt(ev),s=shipAt(p.x,p.y);
  if(s&&s.faction==='reb'&&!s.quiet)openDrawer({id:s.id});
  else if(!s)openDrawer({x:Math.round(p.x),y:Math.round(p.y)});
});
cv.addEventListener('wheel',ev=>{
  ev.preventDefault();
  const p=evPt(ev),before=toWorld(p.px,p.py);
  cam.z*=Math.exp(-ev.deltaY*0.0015);clampCam();A.camHeld=true;
  const after=toWorld(p.px,p.py);cam.x+=before.x-after.x;cam.y+=before.y-after.y;clampCam();
},{passive:false});
function mapClick(p,ev){
  const S=SIM.S,s=shipAt(p.x,p.y);
  if(A.cmdArm){   // a command armed: the click names its target
    const C2=SIM.COMMANDS[A.cmdArm];
    if(C2.target==='point'){cmdApply(A.cmdArm,{x:Math.round(p.x),y:Math.round(p.y)});return;}
    if(s&&s.faction==='reb'&&!s.quiet){cmdApply(A.cmdArm,{id:s.id});return;}
    flash('Pick one of your ships for '+C2.name);return;
  }
  if(A.arm&&A.tray){   // a targeted order armed: the click names its target
    const w=SIM.fn.wingOf(A.tray),tgt=mapTarget(w,A.arm,s,p);
    if(tgt){issue(w.id,A.arm,tgt);return;}
    flash('Not a target for '+SIM.ORDERS[A.arm].name);return;
  }
  if(s&&s.faction==='reb'&&s.wing){A.selShip=s.id;selectWing(s.wing,true);A.selShip=s.id;syncHud(true);return;}
  if(!s){A.selShip=null;syncHud(true);}
}
/* what a map click means for an armed order: a ship (or its class), a station, an ally, or a point */
function mapTarget(w,kind,s,p){
  const S=SIM.S;
  const pointAt=()=>{for(const k in S.points){const q=S.points[k];if(Math.hypot(q.x-p.x,q.y-p.y)<Math.max(60/cam.z,SIM.fn.CAPTURE_R_()))return k;}return null;};
  if(kind==='attack'&&s&&s.faction==='heg')return s.struct?{type:'station',id:s.id}:{type:'ship',id:s.id};
  if(kind==='intercept'&&s&&s.faction==='heg'&&!s.struct)return {type:'ship',id:s.id};
  if(kind==='escort'&&s&&s.faction==='reb'&&s.wing!==w.id&&!s.struct)return {type:'ship',id:s.id};
  if(kind==='board'&&s&&s.faction==='heg'&&s.struct)return {type:'station',id:s.id};
  if(kind==='capture'){const k=pointAt();return k&&S.points[k].capture?{type:'point',id:k}:null;}
  if(kind==='defend'){
    if(s&&s.faction==='reb'&&s.wing!==w.id)return {type:'ship',id:s.id};
    const k=pointAt();if(k)return {type:'point',id:k};
    if(!s)return {type:'pos',x:Math.round(p.x),y:Math.round(p.y)};
  }
  return null;
}
addEventListener('keydown',ev=>{
  if(SR.active!=='arena'||!A.active||A.phase==='PICK')return;
  if(ev.target&&/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName))return;
  if(ev.key===' '){ev.preventDefault();togglePause();return;}
  if(ev.key==='Escape'){if(A.cmdArm)A.cmdArm=null;else if(A.arm)A.arm=null;else if(A.rulePick)A.rulePick=null;else closeAll();syncHud(true);ev.preventDefault();return;}
  if(ev.key==='Tab'){ev.preventDefault();nextEvent();return;}
});

/* =====================================================================
   The designer panel: Run, the High Command numbers (every one a SIMHC getter), read-outs
   ===================================================================== */
function fmt(v,step){return step&&step<1?(+v).toFixed(step<0.1?2:1):String(Math.round(v*100)/100);}
function buildPanel(){
  let h='<div class="hc-grp"><div class="hc-grp__head">Run</div><div class="hc-btns">'+
    '<button type="button" class="sr-btn sr-btn--sm" data-act="same">Restart (same seed)</button><button type="button" class="sr-btn sr-btn--sm" data-act="new">Restart (new seed)</button>'+
    '<button type="button" class="sr-btn sr-btn--sm" data-act="picker">HC scenarios</button><button type="button" class="sr-btn sr-btn--sm" data-act="rulesets">Change ruleset</button>'+
    '<button type="button" class="sr-btn sr-btn--sm" data-act="dump">Dump metrics</button><button type="button" class="sr-btn sr-btn--sm sr-btn--ghost" data-act="title">Back to title</button></div></div>';
  h+='<div class="hc-grp"><div class="hc-grp__head">HC</div>';
  for(const k in SIM.TUNE){const t=SIM.TUNE[k];
    h+='<div class="hc-row"><label for="hcP_'+k+'">'+esc(t.label)+'</label><output data-out="'+k+'">'+fmt(t.get(),t.step)+'</output>'+
      '<input type="range" id="hcP_'+k+'" data-tune="'+k+'" min="'+t.min+'" max="'+t.max+'" step="'+t.step+'" value="'+t.get()+'"></div>';}
  h+='<div class="hc-row hc-row--toggle"><input type="checkbox" id="hcP_tiles" data-toggle="tiles"'+(TILES_LIVE?' checked':'')+'><label for="hcP_tiles">Live camera tiles</label></div>';
  h+='</div><div class="hc-grp"><div class="hc-grp__head">Read-outs</div><div class="hc-readout" id="hcReadout"></div></div>';
  byId('hcPanelBody').innerHTML=h;
  syncReadout();
}
byId('hcPanelBody').addEventListener('input',ev=>{
  const el=ev.target;
  if(el.dataset.toggle==='tiles'){TILES_LIVE=el.checked;tileAuto=false;return;}
  const k=el.dataset.tune;if(!k)return;
  const t=SIM.TUNE[k];t.set(+el.value);
  const out=byId('hcPanelBody').querySelector('[data-out="'+k+'"]');if(out)out.textContent=fmt(t.get(),t.step);
  savePrefs();
});
byId('hcPanelBody').addEventListener('click',ev=>{const b=ev.target.closest('button[data-act]');if(b)panelAct(b.dataset.act);});
byId('hcPanelToggle').addEventListener('click',()=>{
  const p=byId('hcPanel');p.classList.toggle('is-collapsed');
  byId('hcPanelToggle').setAttribute('aria-expanded',String(!p.classList.contains('is-collapsed')));
  setTimeout(fitCanvas,0);
});
function panelAct(a){
  if(a==='same')restart(true);
  else if(a==='new')restart(false);
  else if(a==='picker')showPicker();
  else if(a==='rulesets')toRulesets();
  else if(a==='dump')dumpMetrics();
  else if(a==='title')backToTitle();
}
function syncReadout(){
  const el=byId('hcReadout');if(!el)return;
  const S=SIM.S;
  if(!S||A.phase==='PICK'){el.textContent='';return;}
  let t='Sim '+S.t.toFixed(1)+' s · tick '+S.tick+' · speed '+SIM.TIMESCALES[A.speed]+'×\nReal '+A.realSecs.toFixed(1)+' s, paused '+A.pausedSecs.toFixed(1)+' s ('+A.pauses+' pauses)\nOrders '+S.m.orders+' · tactics '+S.m.tactics+' · CP spent '+S.m.cpSpent;
  for(const w of S.wings)t+='\n'+w.name+': '+w.order.kind+' · '+w.tactic+' · cohesion '+w.cohesion;
  t+='\nRule triggers '+S.m.ruleTriggers+' · emergencies '+S.m.emergencies.length+'\nTiles '+(TILES_LIVE?'live':'static'+(tileAuto?' (fell back)':''))+' · '+tileMs.toFixed(2)+' ms a tile';
  if(el.textContent!==t)el.textContent=t;
}
function dumpMetrics(){const s=JSON.stringify(A.metrics);try{console.log('ARENA_METRICS_DUMP '+s);}catch(e){}flash('Metrics dumped to the console');return s;}
function savePrefs(){try{const o={};for(const k in SIM.TUNE)o[k]=SIM.TUNE[k].get();localStorage.setItem(PREFS_KEY,JSON.stringify(o));}catch(e){}}

/* ---------- inside arena.js's scene: open and close (arena.js calls these from its picker) ---------- */
function openUi(){
  A.active=true;ROOT.hidden=false;
  const v2=SCENE.querySelector('.ar-shell');if(v2)v2.hidden=true;
  for(const id of ['arPicker','arOver']){const e=SCENE.querySelector('#'+id);if(e)e.hidden=true;}
  fitCanvas();
}
function closeUi(){
  A.active=false;A.phase='PICK';ROOT.hidden=true;closeAll();
  const v2=SCENE.querySelector('.ar-shell');if(v2)v2.hidden=false;
}
function open(){openUi();showPicker();}

/* ---------- DBGarena.hc (arena.js hands this out): always on, the Arena is a test environment ---------- */
const dbg={A,SIM,get S(){return SIM.S;},get phase(){return A.phase;},get active(){return A.active;},get metrics(){return A.metrics;},scenarios:HC_SCENARIOS,
  fn:{load,restart,showPicker,toRulesets,setSpeed,togglePause,selectWing,issue,viewEvent,openPilot,openDrawer,cmdApply,respond,nextEvent,mapClick,mapTarget,tipFor,dumpMetrics,syncHud,camFit,tileTick,
    tiles_:()=>({live:TILES_LIVE,ms:tileMs,auto:tileAuto,TILE_Z,TILE_BUDGET}),setTiles(v){TILES_LIVE=!!v;},
    frame,toScreen,toWorld,cam_:()=>cam,
    run(secs){const n=Math.round(secs*1000/SIM.TICK);for(let i=0;i<n&&!SIM.S.over;i++){SIM.step();}if(SIM.S.over&&A.phase==='LIVE')onOver();syncHud(true);return SIM.S.t;},
    toClient(x,y){const r=cv.getBoundingClientRect(),q=toScreen(x,y);return {x:r.left+q.x,y:r.top+q.y};}}};
window.SR_ARENA_HC={open,close:closeUi,frame,get active(){return A.active;},dbg};
})();
