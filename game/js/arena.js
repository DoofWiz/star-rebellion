'use strict';
/* =====================================================================
   STAR REBELLION — the Arena (docs/ARENA-HANDOFF.md §2, §5, §6, §7)
   A designer's lab for space combat v2 (game/js/sim2.js), outside the
   campaign: reached from the title screen's "Enter Arena" or #arena.
   It never enters the base, never touches G and never writes the campaign
   save; a finished scenario returns to the picker.

   UI text here is a designer tool's and is written plainly (handoff §0):
   none of it ships to players, and none of it is registered with
   tools/text/text.py.
   ===================================================================== */
(function(){
const ROOT=document.getElementById('sc-arena');
if(!ROOT)return;
const UT=SR.util,byId=UT.scoped(ROOT);
const HUD=SR.hud,TH=SR.theme,C=TH.C;
const SA=window.SR_ART;
const S2=window.SIM2,T=S2.T;
const RM=HUD.reduced;
const TEST=location.hash==='#arena'||location.hash==='#test';

/* =====================================================================
   Scenarios (handoff §2.3, §6). Data only: adding a scenario means adding an entry here.
   player:  [{cls, name, pilot:{preset, level, id}, at:[x,y,h], order, loadout}]
   enemies: [{type (space_enemies id), doctrine, n, preset, at, id, asset, flees}]
   objective: {kind:'survive',secs} | {kind:'destroy',targets:[ids]|'all'} | {kind:'exit',edge:'N|E|S|W'}
              | {kind:'chain',steps:[...]}
   variants: [{label, ...overrides, tune:{...}}]: one entry, several runs (E2's sweep, E3's counts, E4's parts)
   tune:    per-scenario slider overrides
   ===================================================================== */
const FOX={cls:'talon',name:'Fox',pilot:{level:3,preset:'veteran'}};
const HUNTERS=[{type:'vc-mote-patrol',doctrine:'pursuit',n:2}];
const FLIGHT8=[
  {cls:'talon',name:'Fox 1',pilot:{preset:'veteran'}},{cls:'cross',name:'Fox 2',pilot:{preset:'regular'}},
  {cls:'talon',name:'Fox 3',pilot:{preset:'regular'}},{cls:'cross',name:'Fox 4',pilot:{preset:'green'}},
  {cls:'talon',name:'Fox 5',pilot:{preset:'ace'}},{cls:'cross',name:'Fox 6',pilot:{preset:'regular'}},
  {cls:'talon',name:'Fox 7',pilot:{preset:'green'}},{cls:'cross',name:'Fox 8',pilot:{preset:'veteran'}}];
const countVariant=n=>({label:n+' ships',player:FLIGHT8.slice(0,n),
  enemies:n<=2?[{type:'vc-mote-patrol',doctrine:'wingman',n:2}]:
    [{type:'vc-mote-patrol',doctrine:'pursuit',n:n/2},{type:'vc-mote-patrol',doctrine:'wingman',n:n/2,at:[S2.W-800,S2.H*0.7,Math.PI+0.3]}]});
const E2_VARIANTS=[];
for(const clk of [0,30])for(const len of [2,4,6,8])E2_VARIANTS.push({label:len+'s'+(clk?' · '+clk+'s clock':''),tune:{EXEC_LEN:len,PLAN_CLOCK:clk}});
const ARENA_SCENARIOS=[
  {id:'e1_fox',title:'E1: The hunted fox',desc:'1 v 2 pursuit. Does committing to a path and interrupting it feel like being a wily ace? The prove-or-kill scenario.',
    rocks:'belt1',player:[FOX],enemies:HUNTERS,objective:{kind:'survive',secs:60},tune:{}},
  {id:'e2_sweep',title:'E2: Turn length',desc:'E1 at exec lengths 2, 4, 6 and 8 s, planning clock off or on. Where on the turn-based to real-time spectrum does the dogfight feel live?',
    rocks:'belt1',player:[FOX],enemies:HUNTERS,objective:{kind:'survive',secs:60},variants:E2_VARIANTS},
  {id:'e3_count',title:'E3: Ship count',desc:'2, 4 or 8 of yours (mixed pilots, standing orders available) v matched pursuit and wingman flights. Does planning stay under 60 to 90 s a turn, and the screen readable, at 6 to 8 ships?',
    rocks:'scatter',playerAt:[650,1500,0],enemies:[],objective:{kind:'destroy',targets:'all'},variants:[countVariant(2),countVariant(4),countVariant(8)]},
  {id:'e4_read',title:'E4: Read the enemy',desc:'Three fights against one unexplained behaviour each. By the third, can a fresh player describe how they fly and name an exploit, unprompted?',
    rocks:'field',player:[FOX,{cls:'cross',name:'Fox 2',pilot:{preset:'regular'}}],enemies:[],objective:{kind:'destroy',targets:'all'},
    variants:[
      {label:'Contact 1',enemies:[{type:'vc-mote-patrol',doctrine:'wingman',n:4}]},
      {label:'Contact 2',rocks:'open',enemies:[{type:'fuel-depot',id:'D1',at:[2700,1500,0]},{type:'vc-mote-patrol',doctrine:'hold_asset',asset:'D1',n:3,at:[2900,1350,Math.PI]}]},
      {label:'Contact 3',enemies:[{type:'vc-mote-patrol',doctrine:'firing_line',n:3}]}]},
  {id:'e5_job',title:'E5: Job under fire',desc:'Burn the depot while two pursuit fighters hunt you, then leave by the east edge. Do the best moments come when the objective and the pursuit overlap?',
    rocks:'scatter',player:[FOX,{cls:'cross',name:'Fox 2',pilot:{preset:'regular'}}],
    enemies:[{type:'fuel-depot',id:'D1',at:[2700,1500,0]},{type:'vc-mote-patrol',doctrine:'pursuit',n:2,at:[2600,450,Math.PI*0.6]}],
    objective:{kind:'chain',steps:[{kind:'destroy',targets:['D1']},{kind:'exit',edge:'E'}]}},
];

/* ---------- Arena state: one object, rebuilt per scenario ---------- */
const A={
  get sim(){return S2.S;},
  scenarios:ARENA_SCENARIOS,
  cur:null,            // {id, variant, seed}
  sel:null,            // selected ship id
  drag:null,pan:null,hover:null,
  cam:{x:S2.W/2,y:S2.H/2,z:0.25},
  fx:[],cards:[],floats:[],
  hold:false,manual:false,
  planStart:0,planHist:[],clockEnd:0,
  possess:false,juke:false,
  ui:{tells:true,paths:'all',cards:'verbose',dock:true},
  metrics:[],          // every exec record this session (all scenarios)
  shots:[],            // the latest shot records (for the read-outs and the tests)
};

/* ---------- canvas & camera ---------- */
const cv=byId('arCv'),ctx=cv.getContext('2d');
let dpr=1,cssW=0,cssH=0,lastNow=0,hudAt=0;
function fitCanvas(){
  const r=cv.parentElement.getBoundingClientRect();
  dpr=Math.min(window.devicePixelRatio||1,2);cssW=r.width;cssH=r.height;
  cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);
  clampCam();
}
addEventListener('resize',()=>{if(SR.active==='arena')fitCanvas();});
function fitZoom(){return Math.min(cssW/S2.W,cssH/S2.H)||0.2;}
function clampCam(){
  const c=A.cam;c.z=Math.max(fitZoom()*0.8,Math.min(1.6,c.z));
  const hw=cssW/(2*c.z),hh=cssH/(2*c.z);
  c.x=Math.max(Math.min(c.x,S2.W+300-hw),hw-300);c.y=Math.max(Math.min(c.y,S2.H+300-hh),hh-300);
  if(hw*2>S2.W+600)c.x=S2.W/2;if(hh*2>S2.H+600)c.y=S2.H/2;
}
function camFit(){A.cam={x:S2.W/2,y:S2.H/2,z:fitZoom()*0.98};clampCam();}
const toCss=(wx,wy)=>[(wx-A.cam.x)*A.cam.z+cssW/2,(wy-A.cam.y)*A.cam.z+cssH/2];
const toWorld=(px,py)=>({x:(px-cssW/2)/A.cam.z+A.cam.x,y:(py-cssH/2)/A.cam.z+A.cam.y});
const iconBoost=()=>Math.max(1,Math.min(2.8,0.55/A.cam.z));
const ship=id=>A.sim&&A.sim.ships.find(s=>s.id===id)||null;

/* ---------- starfield (space.js's look, drawn simpler) ---------- */
const stars=[];
for(let i=0;i<420;i++)stars.push({x:Math.random()*S2.W,y:Math.random()*S2.H,r:0.8+Math.random()*1.3,a:0.25+Math.random()*0.45});

/* ---------- drawing ---------- */
function drawRock(r){   // space.js drawRock, copied
  ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.rot);
  const n=r.verts.length,path=k=>{ctx.beginPath();for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=r.r*r.verts[i]*k;i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();};
  const B=SA.BIOME.rock;
  path(1);ctx.fillStyle=B.boulder;ctx.fill();
  ctx.save();ctx.clip();ctx.translate(-r.r*0.18,-r.r*0.2);path(0.92);ctx.fillStyle=B.boulderHi;ctx.fill();ctx.restore();
  path(1);ctx.lineWidth=3/Math.max(A.cam.z,0.5);ctx.strokeStyle=C.ink;ctx.stroke();
  ctx.restore();
}
function drawShip(s,alpha,pose){
  const x=pose?pose.x:s.x,y=pose?pose.y:s.y,h=pose?pose.h:s.h;
  const art=SA.SHIP_FOR_GAME[s.cls],sc=s.size*1.6*iconBoost()*0.85;
  ctx.save();ctx.globalAlpha=alpha;
  if(art){
    SA.ship(ctx,art,x,y,h,sc,RM?0:lastNow/1000,{livery:s.faction==='reb'?'rebel':(s.cls==='viper'?'law':'heg'),
      damage:1-Math.max(0,s.hull)/s.maxHull,boost:!pose&&A.sim&&A.sim.phase==='EXEC',roll:0});
  } else {   // no art (the fuel depot): an inked octagon in the objective's gold
    ctx.translate(x,y);ctx.rotate(h);ctx.scale(sc,sc);
    ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;i?ctx.lineTo(Math.cos(a)*13,Math.sin(a)*13):ctx.moveTo(Math.cos(a)*13,Math.sin(a)*13);}ctx.closePath();
    ctx.fillStyle=s.faction==='reb'?C.plateHi:'#6a6146';ctx.fill();ctx.lineWidth=2.4;ctx.strokeStyle=C.ink;ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,4.5,0,7);ctx.fillStyle=C.gold;ctx.fill();
  }
  ctx.restore();
  if(pose||S2.fn.maxShield(s)<=0)return;
  // shield zones, fore and aft (space.js drawShip's arcs, simplified)
  const r=24*s.size*iconBoost();
  ctx.save();ctx.translate(x,y);ctx.rotate(h);ctx.globalAlpha=alpha;ctx.lineCap='round';
  for(const z of ['F','R']){
    const val=S2.fn.zoneShield(s,z),ref=Math.max(s.segs.F.max,s.segs.R.max,1);
    if(val<=0)continue;
    const from=z==='F'?-Math.PI/2:Math.PI/2,to=z==='F'?Math.PI/2:Math.PI*1.5,lw=2*Math.max(0.6,iconBoost()*0.8);
    ctx.strokeStyle=TH.rgba(C.ink,0.55);ctx.lineWidth=lw+2.4;ctx.beginPath();ctx.arc(0,0,r,from,to);ctx.stroke();
    ctx.strokeStyle=TH.rgba(C.shield,0.15+0.55*Math.min(1,val/ref));ctx.lineWidth=lw;ctx.beginPath();ctx.arc(0,0,r,from,to);ctx.stroke();
    if(['F','R'].filter(k=>s.segs[k].at===z&&s.segs[k].val>0).length>1){ctx.strokeStyle=TH.rgba(C.psi,0.7);ctx.beginPath();ctx.arc(0,0,r+4,from,to);ctx.stroke();}
  }
  ctx.restore();
}
function drawArc(s){   // firing arc and lock envelope (space.js drawArcFor, without the bullseye ring)
  const reb=s.faction==='reb',col=reb?C.gold:C.heg,k=1/A.cam.z;
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.h);
  ctx.fillStyle=TH.rgba(col,reb?0.1:0.06);ctx.strokeStyle=TH.rgba(col,0.4);ctx.lineWidth=1.4*k;
  ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,3*S2.RU,-S2.ARCH,S2.ARCH);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.setLineDash([4*k,8*k]);for(let b=1;b<=2;b++){ctx.beginPath();ctx.arc(0,0,b*S2.RU,-S2.ARCH,S2.ARCH);ctx.stroke();}
  ctx.strokeStyle=TH.rgba(C.hazard,0.4);ctx.beginPath();ctx.arc(0,0,S2.LOCK_RNG,-S2.LOCK_ARC,S2.LOCK_ARC);ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
}
/* a path: the planned moves solid with a dot at each move's end; the straight-on coast after them faint; a ghost at the exec's end */
function drawPath(s,pts,o){
  if(!pts||pts.length<2)return;
  o=o||{};const k=1/A.cam.z,col=o.col||(s.faction==='reb'?C.gold:C.heg);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  const stroke=(sel,dash,w,c)=>{ctx.beginPath();let on=false;for(const p of pts){if(!sel(p)){on=false;continue;}on?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);on=true;}
    ctx.setLineDash(dash);ctx.lineWidth=w;ctx.strokeStyle=c;ctx.stroke();};
  stroke(()=>true,[],6*k,TH.rgba(C.ink,o.strong?0.75:0.45));
  stroke(p=>!p.coast,[],(o.strong?3.4:2.4)*k,TH.rgba(col,o.strong?0.95:0.6));
  stroke(p=>p.coast,[],1.6*k,TH.rgba(col,0.3));
  ctx.setLineDash([]);
  // segment boundaries
  for(const p of pts)if(p.knot){ctx.beginPath();ctx.arc(p.x,p.y,4*k,0,7);ctx.fillStyle=TH.rgba(col,0.9);ctx.fill();}
  const e=pts[pts.length-1];
  ctx.beginPath();ctx.arc(e.x,e.y,7*k,0,7);ctx.fillStyle=C.ink;ctx.fill();
  ctx.beginPath();ctx.arc(e.x,e.y,4.5*k,0,7);ctx.fillStyle=col;ctx.fill();
  if(o.ghost)drawShip(s,o.strong?0.4:0.22,e);
  ctx.restore();
}
/* ---------- the move envelope (C-57): where the next move can end, banded by type, shrunk to the round's distance left ---------- */
const BAND={T:{name:'TURN',col:()=>C.hazard},B:{name:'BANK',col:()=>C.gold},S:{name:'STRAIGHT',col:()=>C.go}};
const BAND_ANG={T:Math.PI/2,B:Math.PI/4};
const bandCost=k=>k==='S'?T.AP_STRAIGHT:k==='B'?T.AP_BANK:T.AP_TURN;
function bandPoly(p,lo,up,ang){
  const N=18,pts=[],at=(len,t)=>S2.fn.arcFn(p.x,p.y,p.h,{len,turn:t})(1);
  for(let i=0;i<=N;i++)pts.push(at(lo+(up-lo)*i/N,ang));
  for(let j=1;j<=N;j++)pts.push(at(up,ang-2*ang*j/N));
  for(let i=N-1;i>=0;i--)pts.push(at(lo+(up-lo)*i/N,-ang));
  for(let j=N-1;j>=1;j--)pts.push(at(lo,-ang+2*ang*j/N));
  return pts;
}
/* st: {x,y,h,left (distance), ap (what a move may spend)}; strong while dragging, faint while only selected */
function drawEnvelope(s,st,strong){
  const e=S2.fn.envOf(s),k=1/A.cam.z,tol=T.STRAIGHT_TOL*Math.PI/180;
  let any=false;
  ctx.save();ctx.lineJoin='round';
  for(const key of ['T','B','S']){
    const r=e[key];if(!r)continue;
    const lo=r[0],up=Math.min(r[1],st.left);if(up<lo)continue;
    any=true;
    const ang=key==='S'?tol:BAND_ANG[key],ok=st.ap>=bandCost(key),col=ok?BAND[key].col():C.text3;
    const pts=bandPoly(st,lo,up,ang);
    ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();
    ctx.fillStyle=TH.rgba(col,strong?(key==='S'?0.3:0.13):0.05);ctx.fill();
    ctx.lineWidth=(strong?2:1.2)*k;ctx.strokeStyle=TH.rgba(col,strong?0.75:0.3);ctx.stroke();
    if(key==='S'){const a=S2.fn.arcFn(st.x,st.y,st.h,{len:lo,turn:0})(1),b=S2.fn.arcFn(st.x,st.y,st.h,{len:up,turn:0})(1);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=(strong?3:1.6)*k;ctx.strokeStyle=TH.rgba(col,strong?0.9:0.4);ctx.stroke();}
    if(strong){   // the band's name and price
      const q=key==='S'?S2.fn.arcFn(st.x,st.y,st.h,{len:up,turn:0})(1):S2.fn.arcFn(st.x,st.y,st.h,{len:(lo+up)/2,turn:ang*0.92})(1);
      const off=key==='S'?18*k:0;
      ctx.font='800 '+(12*k)+'px "Exo 2",sans-serif';ctx.textAlign=key==='S'?'left':'center';
      const txt=BAND[key].name+' · '+bandCost(key)+' AP'+(ok?'':' (short)');
      ctx.lineWidth=4*k;ctx.strokeStyle=C.ink;ctx.strokeText(txt,q.x+Math.cos(st.h)*off,q.y+Math.sin(st.h)*off);
      ctx.fillStyle=col;ctx.fillText(txt,q.x+Math.cos(st.h)*off,q.y+Math.sin(st.h)*off);
    }
  }
  if(!any&&strong){ctx.font='800 '+(13*k)+'px "Exo 2",sans-serif';ctx.textAlign='center';ctx.lineWidth=4*k;ctx.strokeStyle=C.ink;
    ctx.strokeText('No distance left this round',st.x,st.y-40*k);ctx.fillStyle=C.text2;ctx.fillText('No distance left this round',st.x,st.y-40*k);}
  ctx.restore();
}
/* the move being dragged: its arc in its band's colour and the ship's ghost at its end (red when the AP is short) */
function drawGhostMove(s,st,arc,ok){
  if(!arc)return;
  const k=1/A.cam.z,col=ok?BAND[arc.type==='K'?'T':arc.type].col():C.hazard,fn=S2.fn.arcFn(st.x,st.y,st.h,arc);
  ctx.save();ctx.lineCap='round';ctx.beginPath();
  for(let i=0;i<=24;i++){const q=fn(i/24);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);}
  ctx.lineWidth=7*k;ctx.strokeStyle=TH.rgba(C.ink,0.7);ctx.stroke();ctx.lineWidth=3.6*k;ctx.strokeStyle=col;ctx.stroke();
  ctx.restore();
  drawShip(s,ok?0.6:0.35,arc.end);
}
/* where the next drag starts: the end of the moves set so far (a handle to grab) */
function drawHandle(st,strong){
  const k=1/A.cam.z;
  ctx.save();ctx.beginPath();ctx.arc(st.x,st.y,(strong?11:8)*k,0,7);ctx.fillStyle=C.ink;ctx.fill();
  ctx.beginPath();ctx.arc(st.x,st.y,(strong?8:5.5)*k,0,7);ctx.fillStyle=C.gold;ctx.fill();
  ctx.lineWidth=2*k;ctx.strokeStyle=C.ink;ctx.beginPath();ctx.moveTo(st.x+Math.cos(st.h)*4*k,st.y+Math.sin(st.h)*4*k);ctx.lineTo(st.x+Math.cos(st.h)*16*k,st.y+Math.sin(st.h)*16*k);ctx.stroke();
  ctx.restore();
}
function drawLocks(){   // space.js drawLockLines, plus the acquisition clock round the target
  for(const s of A.sim.ships){
    if(!s.alive)continue;
    const col=s.faction==='reb'?C.gold:C.heg;
    if(s.lock){
      const t=ship(s.lock.target);
      if(t&&t.alive){
        const mx=(s.x+t.x)/2,my=(s.y+t.y)/2,dx=t.x-s.x,dy=t.y-s.y,L=Math.hypot(dx,dy)||1,ox=-dy/L*40,oy=dx/L*40;
        ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.quadraticCurveTo(mx+ox,my+oy,t.x,t.y);
        ctx.lineWidth=5/A.cam.z;ctx.strokeStyle=TH.rgba(C.ink,0.6);ctx.stroke();
        ctx.setLineDash([7/A.cam.z,7/A.cam.z]);ctx.lineDashOffset=-lastNow*0.02/A.cam.z;ctx.lineWidth=2.2/A.cam.z;ctx.strokeStyle=TH.rgba(col,0.9);ctx.stroke();ctx.setLineDash([]);
        const r=30*t.size*iconBoost();ctx.translate(t.x,t.y);ctx.rotate(Math.PI/4);
        ctx.lineWidth=4.6/Math.max(A.cam.z,0.4);ctx.strokeStyle=C.ink;ctx.strokeRect(-r*0.8,-r*0.8,r*1.6,r*1.6);
        ctx.lineWidth=2.2/Math.max(A.cam.z,0.4);ctx.strokeStyle=col;ctx.strokeRect(-r*0.8,-r*0.8,r*1.6,r*1.6);
        ctx.rotate(-Math.PI/4);ctx.fillStyle=col;ctx.font='800 '+Math.round(13/A.cam.z)+'px "Exo 2",sans-serif';ctx.textAlign='center';ctx.fillText('×'+s.lock.level,0,-r*1.25);
        ctx.restore();
      }
    }
    if(s.lockAcc>0){
      const t=ship(s.target);if(!t||!t.alive)continue;
      const r=34*t.size*iconBoost(),k=Math.min(1,s.lockAcc/T.LOCK_TIME);
      ctx.save();ctx.lineWidth=3/A.cam.z;ctx.strokeStyle=TH.rgba(col,0.85);ctx.beginPath();ctx.arc(t.x,t.y,r,-Math.PI/2,-Math.PI/2+k*Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
}
/* the draw kit doctrine tells use (sim2.js modules draw only through this) */
const TELL={
  byId:ship,
  chevron(s,t){
    const a=Math.atan2(t.y-s.y,t.x-s.x),r=34*s.size*iconBoost(),k=1/A.cam.z;
    ctx.save();ctx.translate(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r);ctx.rotate(a);
    for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo((-6+i*9)*k*1.4,-9*k*1.4);ctx.lineTo((3+i*9)*k*1.4,0);ctx.lineTo((-6+i*9)*k*1.4,9*k*1.4);
      ctx.lineWidth=5*k;ctx.strokeStyle=C.ink;ctx.stroke();ctx.lineWidth=2.4*k;ctx.strokeStyle=C.hegHi;ctx.stroke();}
    ctx.restore();
  },
  pairLine(a,b){const k=1/A.cam.z;ctx.save();ctx.setLineDash([2*k,5*k]);ctx.lineWidth=1.6*k;ctx.strokeStyle=TH.rgba(C.hegHi,0.7);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();},
  ring(x,y,r){const k=1/A.cam.z;ctx.save();ctx.setLineDash([10*k,8*k]);ctx.lineWidth=2*k;ctx.strokeStyle=TH.rgba(C.heg,0.55);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.stroke();
    ctx.fillStyle=TH.rgba(C.heg,0.04);ctx.fill();ctx.restore();},
  rally(x,y){const k=1/A.cam.z,p=RM?0:Math.sin(lastNow/250)*3;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
    ctx.lineWidth=4.5*k;ctx.strokeStyle=C.ink;ctx.strokeRect(-(14+p)*k,-(14+p)*k,(28+2*p)*k,(28+2*p)*k);ctx.lineWidth=2.2*k;ctx.strokeStyle=C.hegHi;ctx.strokeRect(-(14+p)*k,-(14+p)*k,(28+2*p)*k,(28+2*p)*k);ctx.restore();},
  badge(s,txt){const k=1/A.cam.z;ctx.save();ctx.font='800 '+Math.round(16*k)+'px "Exo 2",sans-serif';ctx.textAlign='center';ctx.lineWidth=4*k;ctx.strokeStyle=C.ink;
    const y=s.y-34*s.size*iconBoost();ctx.strokeText(txt,s.x,y);ctx.fillStyle=C.hegHi;ctx.fillText(txt,s.x,y);ctx.restore();},
};
function pathVisible(s){
  const m=A.ui.paths;
  if(m==='all')return true;
  if(m==='selected')return s.id===A.sel;
  return s.id===A.hover||s.id===A.sel;   // hover-only: the hovered ship (and the one being drawn)
}
function render(){
  const sim=A.sim;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#04060d';ctx.fillRect(0,0,cv.width,cv.height);
  if(!sim)return;
  const z=A.cam.z;
  ctx.setTransform(z*dpr,0,0,z*dpr,dpr*(cssW/2-A.cam.x*z),dpr*(cssH/2-A.cam.y*z));
  ctx.fillStyle='#cfe0ff';for(const s of stars){ctx.globalAlpha=s.a;ctx.beginPath();ctx.arc(s.x,s.y,s.r/Math.max(z,0.35),0,7);ctx.fill();}
  ctx.globalAlpha=1;
  const M=S2.MARGIN;
  ctx.strokeStyle='rgba(90,130,200,0.06)';ctx.lineWidth=1/z;ctx.beginPath();
  for(let x=M;x<=S2.W-M+1;x+=S2.RU){ctx.moveTo(x,M);ctx.lineTo(x,S2.H-M);}
  for(let y=M;y<=S2.H-M+1;y+=S2.RU){ctx.moveTo(M,y);ctx.lineTo(S2.W-M,y);}
  ctx.stroke();
  ctx.strokeStyle='rgba(120,150,220,0.25)';ctx.lineWidth=1.6/z;ctx.strokeRect(M,M,S2.W-2*M,S2.H-2*M);
  const obj=S2.fn.objState();   // an exit edge glows while it is the step to do
  if(obj.cur==='exit'){const st=sim.objective.steps?sim.objective.steps[obj.step]:sim.objective;const e=st.edge,g=180;ctx.fillStyle=TH.rgba(C.go,0.1);
    if(e==='E')ctx.fillRect(S2.W-M-g,M,g,S2.H-2*M);if(e==='W')ctx.fillRect(M,M,g,S2.H-2*M);if(e==='N')ctx.fillRect(M,M,S2.W-2*M,g);if(e==='S')ctx.fillRect(M,S2.H-M-g,S2.W-2*M,g);}
  for(const r of sim.rocks)drawRock(r);
  // tells under everything else
  if(A.ui.tells)for(const s of sim.ships){
    if(!s.alive||!s.doctrine)continue;
    const D=S2.DOCTRINES[s.doctrine];
    if(D&&D.tell&&!S2.DOC_OFF[s.doctrine]){try{D.tell(s,TELL,S2.WAPI);}catch(e){console.error(e);}}
  }
  const sel=ship(A.sel);
  if(sel&&sel.alive&&sim.phase!=='OVER'&&!A.drag)drawArc(sel);   // hidden while dragging, so the envelope reads alone
  // paths
  if(sim.phase==='PLAN'){
    const dr=A.drag&&A.drag.mode==='move'?A.drag:null;
    for(const s of sim.ships){
      if(!s.alive||S2.fn.isStruct(s))continue;
      const dragging=dr&&dr.id===s.id;
      if(s.faction==='heg'&&!(s.plan2.drawn||dragging))continue;
      if(!dragging&&!pathVisible(s))continue;
      const pv=S2.preview(s.id);
      if(pv)drawPath(s,pv.pts,{strong:s.id===A.sel||dragging,ghost:!dragging,col:s.faction==='heg'?C.hegHi:(s.plan2.drawn?C.gold:C.steel)});
    }
    const es=dr?ship(dr.id):(sel&&sel.alive&&(sel.faction==='reb'||A.possess)&&!S2.fn.isStruct(sel)?sel:null);
    if(es){
      const st=dr?dr.start:S2.planEnd(es.id);
      drawEnvelope(es,st,!!dr);
      if(dr&&dr.mv)drawGhostMove(es,st,dr.mv.arc,dr.mv.ok);
      if(!dr)drawHandle(st,es.plan2.drawn);
    }
  } else if(sim.phase==='EXEC'){
    for(const s of sim.ships){   // what's left of your own paths
      if(!s.alive||s.faction!=='reb'||!s.run.length||!pathVisible(s))continue;
      const pts=S2.fn.sampleRun(s.run,8).filter(p=>p.t>=sim.execT);
      if(pts.length>1)drawPath(s,pts,{strong:s.id===A.sel});
    }
    if(A.drag&&A.drag.mode==='juke'){const s=ship(A.drag.id);if(s){drawEnvelope(s,A.drag.start,true);if(A.drag.mv&&A.drag.mv.arc)drawGhostMove(s,A.drag.start,A.drag.mv.arc,A.drag.mv.arc.ok);}}
  }
  drawLocks();
  // trails and ships
  for(const s of sim.ships){
    if(!s.alive)continue;
    s.trail=s.trail||[];
    if(sim.phase==='EXEC'&&!sim.paused&&!A.hold){s.trail.push({x:s.x,y:s.y,t:lastNow});}
    s.trail=s.trail.filter(p=>lastNow-p.t<900);
    if(s.trail.length>1){ctx.beginPath();s.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=TH.rgba(s.faction==='reb'?C.rebel:C.heg,0.3);ctx.lineWidth=2/z;ctx.stroke();}
    if(s.id===A.sel||(sim.paused&&sim.paused.id===s.id)){
      ctx.save();ctx.translate(s.x,s.y);ctx.strokeStyle=TH.rgba(s.faction==='reb'?C.gold:C.heg,0.9);ctx.lineWidth=1.6/z;
      const r=26*s.size*iconBoost(),a0=lastNow*0.001;for(let k=0;k<4;k++){ctx.beginPath();ctx.arc(0,0,r,a0+k*Math.PI/2,a0+k*Math.PI/2+0.7);ctx.stroke();}ctx.restore();
    }
    drawShip(s,1);
  }
  drawFx(z);
  // screen space: labels, cards, floaters
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawLabels();
  drawCards();
  drawFloats();
  if(sim.paused){   // the interrupt freeze: a radial highlight on the acting ship
    const s=ship(sim.paused.id);
    if(s){const [x,y]=toCss(s.x,s.y);const g=ctx.createRadialGradient(x,y,30,x,y,Math.max(cssW,cssH)*0.7);
      g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(0.25,'rgba(10,12,34,0.25)');g.addColorStop(1,'rgba(10,12,34,0.6)');ctx.fillStyle=g;ctx.fillRect(0,0,cssW,cssH);}
  }
}
function drawLabels(){
  ctx.font='700 12px "Exo 2",sans-serif';ctx.textAlign='center';
  for(const s of A.sim.ships){
    if(!s.alive)continue;
    const [x,y]=toCss(s.x,s.y),r=24*s.size*iconBoost()*A.cam.z+14;
    const nerve=S2.fn.isStruct(s)||S2.CLS[s.cls].mute?'':' · '+Math.round(s.pilot.cool);
    const txt=s.name+nerve;
    ctx.lineWidth=4;ctx.strokeStyle=C.ink;ctx.strokeText(txt,x,y+r+4);
    ctx.fillStyle=s.faction==='reb'?C.rebelHi:C.hegHi;ctx.fillText(txt,x,y+r+4);
    // hull bar
    const w=40,k=Math.max(0,s.hull)/s.maxHull;
    ctx.fillStyle=C.ink;ctx.fillRect(x-w/2-1,y+r+9,w+2,5);ctx.fillStyle=k>0.5?C.go:k>0.25?C.gold:C.hazard;ctx.fillRect(x-w/2,y+r+10,w*k,3);
  }
}
/* ---------- effects: shots, kills, floaters, resolution cards ---------- */
function onEvents(evs){
  for(const e of evs){
    if(e.type==='shot')onShot(e);
    else if(e.type==='kill'){A.fx.push({k:'boom',x:e.x,y:e.y,t0:lastNow,dur:RM?400:900});sfx('boom');}
    else if(e.type==='float')A.floats.push({x:e.x,y:e.y,text:e.text,col:e.col,t0:lastNow});
    else if(e.type==='interrupt'&&e.stage==='done'){const s=ship(e.id);if(s)A.fx.push({k:'pulse',x:s.x,y:s.y,t0:lastNow,dur:500});}
    else if(e.type==='refused')toast(e.why);
    else if(e.type==='metrics')A.metrics.push(e.rec);
    else if(e.type==='phase')onPhase(e);
    else if(e.type==='over')showOver(e);
  }
}
function onShot(e){
  A.shots.push(e);if(A.shots.length>300)A.shots.shift();
  const col=e.kind==='ballistic'?C.goldHi:(ship(e.s)&&ship(e.s).faction==='reb'?C.rebel:C.heg);
  A.fx.push({k:e.kind==='missile'?'missile':'bolt',x0:e.sx,y0:e.sy,x1:e.tx,y1:e.ty,hit:e.hit,col,side:ship(e.s)&&ship(e.s).faction,kind:e.kind,t0:lastNow,dur:RM?120:e.kind==='missile'?420:220});
  if(e.hit)A.fx.push({k:'spark',x:e.tx,y:e.ty,col:e.sd>0&&!e.ad&&!e.hd?C.shield:C.goldHi,t0:lastNow+(RM?0:200),dur:350});
  sfx(e.hit?'hit':'shot');
  // a card at the firing ship: verbose shows the maths, quiet shows the damage only. One per ship at a time.
  if(A.ui.cards==='quiet'&&!e.hit)return;
  const lines=A.ui.cards==='quiet'?[]:[(e.snap?'SNAP ':'')+e.need+'+ · d20 '+e.roll];
  const head=e.hit?'HIT '+e.dmg+(e.critId?' · CRIT':''):'MISS';
  const sub=e.hit?[e.sd?'SHD '+e.sd:'',e.ad?'ARM '+e.ad:'',e.hd?'HULL '+e.hd:''].filter(Boolean).join(' '):'';
  A.cards=A.cards.filter(c=>c.s!==e.s);
  A.cards.push({s:e.s,x:e.sx,y:e.sy,head,sub,lines,hit:e.hit,snap:e.snap,side:ship(e.s)&&ship(e.s).faction,t0:lastNow,dur:1500});
  if(A.cards.length>6)A.cards.shift();   // throttled: the newest six stay readable
}
function drawFx(z){
  const now=lastNow;
  for(const f of A.fx){
    const k=(now-f.t0)/f.dur;if(k<0||k>1)continue;
    if(f.k==='bolt'||f.k==='missile'){
      const ex=f.hit?f.x1:f.x1+(f.x1-f.x0)*0.15,ey=f.hit?f.y1:f.y1+(f.y1-f.y0)*0.15;
      const x=f.x0+(ex-f.x0)*k,y=f.y0+(ey-f.y0)*k;
      if(f.k==='bolt'&&SA.bolt)SA.bolt(ctx,f.x0+(ex-f.x0)*Math.max(0,k-0.35),f.y0+(ey-f.y0)*Math.max(0,k-0.35),x,y,f.kind==='ballistic'?'ballistic':'plasma',f.side==='reb'?'reb':'heg');
      else {ctx.save();ctx.fillStyle=C.psi;ctx.beginPath();ctx.arc(x,y,6/z*0.6+3,0,7);ctx.fill();ctx.strokeStyle=TH.rgba(C.psi,0.5);ctx.lineWidth=2/z;ctx.beginPath();ctx.moveTo(f.x0,f.y0);ctx.lineTo(x,y);ctx.stroke();ctx.restore();}
    } else if(f.k==='spark'){
      ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle=f.col;ctx.lineWidth=2.4/z;
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r0=10*k/z*2,r1=r0+14/z;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*r0,f.y+Math.sin(a)*r0);ctx.lineTo(f.x+Math.cos(a)*r1,f.y+Math.sin(a)*r1);ctx.stroke();}
      ctx.restore();
    } else if(f.k==='boom'){
      ctx.save();ctx.translate(f.x,f.y);const sc=Math.max(1.4,iconBoost()*1.6);ctx.scale(sc,sc);if(SA.explosion)SA.explosion(ctx,0,0,k);ctx.restore();
    } else if(f.k==='pulse'){
      ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle=C.psi;ctx.lineWidth=4/z;ctx.beginPath();ctx.arc(f.x,f.y,(30+90*k)/z*0.5+30*k,0,7);ctx.stroke();ctx.restore();
    }
  }
  A.fx=A.fx.filter(f=>now-f.t0<f.dur);
}
function drawCards(){
  const now=lastNow;
  for(const c of A.cards){
    const k=(now-c.t0)/c.dur;if(k<0||k>1)continue;
    const s=ship(c.s),wx=s&&s.alive?s.x:c.x,wy=s&&s.alive?s.y:c.y;
    const [x,y0]=toCss(wx,wy),y=y0-48-k*10;
    const lines=[c.head].concat(c.sub?[c.sub]:[],c.lines);
    ctx.font='800 13px "Exo 2",sans-serif';
    const w=Math.max(...lines.map(l=>ctx.measureText(l).width))+16,h=lines.length*15+8;
    ctx.save();ctx.globalAlpha=k>0.8?(1-k)/0.2:1;
    ctx.fillStyle=C.ink;ctx.fillRect(x-w/2-2,y-h-2,w+4,h+4);
    ctx.fillStyle=c.snap?C.psiDeep||'#6b34c4':c.side==='reb'?'#2a1416':'#121b36';ctx.fillRect(x-w/2,y-h,w,h);
    ctx.textAlign='center';
    lines.forEach((l,i)=>{ctx.font=(i?'700 12px':'800 13px')+' "Exo 2",sans-serif';ctx.fillStyle=i?C.text2||'#b3bbe3':(c.hit?C.goldHi:'#c8d0dc');ctx.fillText(l,x,y-h+16+i*15);});
    ctx.restore();
  }
  A.cards=A.cards.filter(c=>now-c.t0<c.dur);
}
function drawFloats(){
  const now=lastNow;
  ctx.font='800 13px "Exo 2",sans-serif';ctx.textAlign='center';
  for(const f of A.floats){
    const k=(now-f.t0)/1300;if(k<0||k>1)continue;
    const [x,y]=toCss(f.x,f.y);
    ctx.globalAlpha=k>0.7?(1-k)/0.3:1;ctx.lineWidth=4;ctx.strokeStyle=C.ink;ctx.strokeText(f.text,x,y-k*26);ctx.fillStyle=f.col||C.text;ctx.fillText(f.text,x,y-k*26);
  }
  ctx.globalAlpha=1;
  A.floats=A.floats.filter(f=>now-f.t0<1300);
}
function sfx(k){
  if(SR.audio.off())return;
  if(k==='shot')SR.audio.osc('square',900,500,0.015,0.05);
  else if(k==='hit')SR.audio.nz('bandpass',1800,2,0.05,0.08);
  else if(k==='boom')SR.audio.nz('lowpass',600,1,0.12,0.5,0,90);
}

/* ---------- the loop ---------- */
function frame(now){
  const dt=Math.min(100,Math.max(0,now-(lastNow||now)));lastNow=now;
  const sim=A.sim;
  if(sim){
    if(sim.phase==='EXEC'&&!A.hold&&!A.manual)S2.advance(dt);
    onEvents(S2.drain());
    if(sim.phase==='PLAN'&&T.PLAN_CLOCK>0&&A.clockEnd&&performance.now()>=A.clockEnd&&!A.manual)execute();
  }
  render();
  if(now-hudAt>120){hudAt=now;syncHud();}
}

/* ---------- phases ---------- */
function onPhase(e){
  if(e.phase==='PLAN'){
    A.planStart=performance.now();A.clockEnd=T.PLAN_CLOCK>0?A.planStart+T.PLAN_CLOCK*1000:0;
    A.juke=false;A.drag=null;closeInt();
    const s=ship(A.sel);if(!s||!s.alive)A.sel=(A.sim.ships.find(x=>x.alive&&x.faction==='reb')||{}).id||null;
  }
  syncHud(true);
}
function execute(){
  const sim=A.sim;if(!sim||sim.phase!=='PLAN'||!byId('arPicker').hidden)return;
  const ms=performance.now()-A.planStart;
  A.planHist.push(Math.round(ms));
  A.possess=false;
  S2.go(ms);
  A.clockEnd=0;
  syncHud(true);
}
function startScenario(id,variant,seed){
  const scn=ARENA_SCENARIOS.find(s=>s.id===id);if(!scn)return null;
  A.cur={id,variant:variant||0,seed:seed==null?(Math.floor(Math.random()*1e9)>>>0):seed>>>0};
  onEvents(S2.drain());   // the last fight's metrics are kept before it is rebuilt
  A.fx=[];A.cards=[];A.floats=[];A.planHist=[];A.hold=false;A.possess=false;A.juke=false;A.drag=null;
  S2.load(scn,{seed:A.cur.seed,variant:A.cur.variant});
  onEvents(S2.drain());
  A.sel=(A.sim.ships.find(s=>s.faction==='reb')||{}).id||null;
  byId('arPicker').hidden=true;byId('arOver').hidden=true;closeInt();
  byId('arScen').textContent=scn.title+(A.sim.variantLabel?' · '+A.sim.variantLabel:'')+' · seed '+A.cur.seed;
  camFit();buildPanel();syncHud(true);
  return A.sim;
}
function restart(sameSeed){if(!A.cur)return;startScenario(A.cur.id,A.cur.variant,sameSeed?A.cur.seed:null);}
function showOver(r){
  const w=byId('arOver');
  w.querySelector('.ar-over__title').textContent=r.win?'Objective complete':'Flight lost';
  w.querySelector('.ar-over__text').textContent='Turn '+r.turn+', '+r.time+' s of fighting. Metrics for every exec are in the console (ARENA_METRICS) and under Dump metrics.';
  w.hidden=false;
  syncHud(true);
}

/* ---------- picker (handoff §2.2) ---------- */
function tuneSummary(){
  return 'Exec '+T.EXEC_LEN+' s · speed '+T.SIM_SPEED+'× · clock '+(T.PLAN_CLOCK?T.PLAN_CLOCK+' s':'off')+
    ' · AP '+T.AP_BASE+' +1 per '+T.AP_LEVELS+' levels, +'+T.COOL_AP+' Cool · moves '+T.AP_STRAIGHT+'/'+T.AP_BANK+'/'+T.AP_TURN+' · Snap '+T.AP_SNAP+' · floor '+T.INT_FLOOR;
}
function openPicker(){
  const pk=byId('arPicker');
  let h='';
  for(const s of ARENA_SCENARIOS){
    h+='<div class="ar-scn" data-scn="'+HUD.esc(s.id)+'"><div class="ar-scn__head"><b>'+HUD.esc(s.title)+'</b><span class="ar-scn__id">'+HUD.esc(s.id)+'</span></div>'+
      '<p class="ar-scn__desc">'+HUD.esc(s.desc||'')+'</p><div class="ar-scn__go">';
    if(s.variants&&s.variants.length)s.variants.forEach((v,i)=>{h+='<button class="sr-btn sr-btn--sm" data-start="'+HUD.esc(s.id)+'" data-variant="'+i+'">'+HUD.esc(v.label)+'</button>';});
    else h+='<button class="sr-btn sr-btn--sm sr-btn--primary" data-start="'+HUD.esc(s.id)+'" data-variant="0">Start</button>';
    h+='</div></div>';
  }
  pk.querySelector('#arScnList').innerHTML=h;
  pk.querySelector('#arTuneNow').textContent=tuneSummary();
  pk.hidden=false;byId('arOver').hidden=true;
  syncHud(true);
}
byId('arPicker').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-start]');
  if(b)startScenario(b.dataset.start,+b.dataset.variant||0);
});

/* ---------- the selected ship (bottom left) and the top bar ---------- */
function nerveBar(s){
  const v=Math.round(s.pilot.cool),st=S2.fn.coolState(s);
  return '<div class="ar-meter"><span>Nerve</span><i style="--v:'+v+'%;--c:var(--sr-'+(st==='cool'?'go':st==='panic'?'hazard':'gold')+')"></i><b>'+v+'</b></div>';
}
/* the AP meter: one pip per point; spent pips dim, Cool bonus pips gold (spending them costs the pilot their Cool) */
function apBar(s){
  if(!s.ap)return '';
  const spent=S2.apPlanned(s)+s.ap.used,tot=s.ap.max+s.ap.bonus;
  let pips='';
  for(let i=0;i<tot;i++)pips+='<i class="'+(i>=s.ap.max?'is-bonus ':'')+(i<spent?'is-spent':'')+'"></i>';
  return '<div class="ar-ap"><span>AP</span><span class="ar-ap__pips">'+pips+'</span><b>'+Math.max(0,tot-spent)+' left</b>'+
    (s.ap.bonus?'<em>'+(s.ap.bonusSpent?'Cool spent':'+'+s.ap.bonus+' Cool')+'</em>':'')+'</div>';
}
function shipCard(){
  const s=ship(A.sel),el=byId('arShip'),sim=A.sim;
  if(!s||!sim||!byId('arPicker').hidden){el.hidden=true;return;}
  el.hidden=false;
  const reb=s.faction==='reb',plan=sim.phase==='PLAN',isS=S2.fn.isStruct(s);
  const t=ship(s.target);
  let h='<div class="ar-ship__head"><b class="'+(reb?'is-reb':'is-heg')+'">'+HUD.esc(s.name)+'</b><span>'+HUD.esc(S2.CLS[s.cls].label)+
    (s.pilot.preset?' · '+s.pilot.preset:'')+' · L'+s.pilot.level+(s.doctrine?' · '+s.doctrine:'')+'</span></div>';
  if(!isS&&!S2.CLS[s.cls].mute)h+=nerveBar(s);
  h+='<div class="ar-ship__row">Hull '+Math.max(0,s.hull)+'/'+s.maxHull+' · Arm '+s.arm+' · Shd '+s.segs.F.val+'/'+s.segs.R.val+
    (s.crits.length?' · <span class="is-bad">'+s.crits.join(', ')+'</span>':'')+'</div>';
  if(reb||(A.possess&&!isS))h+=apBar(s);
  if(reb){
    h+='<div class="ar-ship__row">Target <b>'+(t&&t.alive?HUD.esc(t.name):'none')+'</b>'+(s.lock?' · lock ×'+s.lock.level:'')+
      (s.intUsed?' · interrupts '+s.intUsed:'')+'</div>';
    const ord=s.order?s.order.kind:'none',left=S2.apLeft(s);
    const act=(k,label,cost,on,extra)=>'<button class="sr-btn sr-btn--sm'+(on?' is-on':'')+'" data-act="'+k+'"'+(plan&&(on||left>=cost)&&!extra?'':' disabled')+'>'+label+' <b class="ar-cost">'+cost+'</b></button>';
    const st=S2.planEnd(s.id),e=S2.fn.envOf(s);
    h+='<div class="ar-ship__ctl">'+
      act('evade','Evade',T.AP_EVADE,s.stance.evade)+act('lockin','Lock in',T.AP_LOCKIN,s.stance.lockin)+act('boost','Boost shield',T.AP_BOOST,s.stance.boost)+
      act('shiftF','Angle fore'+(s.segs.F.at==='F'?'':' (aft)'),T.AP_SHIFT,s.shieldAt0&&s.segs.F.at!==s.shieldAt0.F)+
      act('shiftR','Angle aft'+(s.segs.R.at==='R'?'':' (fore)'),T.AP_SHIFT,s.shieldAt0&&s.segs.R.at!==s.shieldAt0.R)+
      (e.K?act('kturn','K-turn',T.AP_KTURN,false,!(st&&st.left>=3*S2.SU&&st.ap>=T.AP_KTURN)):'')+
      '</div><div class="ar-ship__ctl"><label>Order <select data-act="order"'+(plan?'':' disabled')+'>'+
      S2.ORDERS.map(o=>'<option value="'+o+'"'+(o===ord?' selected':'')+'>'+o+'</option>').join('')+'</select></label>'+
      (s.plan2.drawn?'<button class="sr-btn sr-btn--sm sr-btn--ghost" data-act="undo"'+(plan?'':' disabled')+'>Undo move <span class="sr-kbd">Z</span></button>'+
        '<button class="sr-btn sr-btn--sm sr-btn--ghost" data-act="clear"'+(plan?'':' disabled')+'>Clear</button>':'')+
      '<span class="ar-ship__hint">'+(plan?(s.plan2.drawn?s.plan2.arcs.length+' move'+(s.plan2.arcs.length>1?'s':'')+' set · drag from the gold handle for another':(s.order?'Flying: '+s.order.kind:'No moves: flies straight on')+' · drag from the ship to move'):'Click the ship to interrupt')+'</span></div>';
  }
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
}
byId('arShip').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||b.tagName==='SELECT')return;
  const s=ship(A.sel);if(!s)return;
  const a=b.dataset.act;
  let ok=true;
  if(a==='evade'||a==='lockin'||a==='boost')ok=S2.setStance(s.id,a,!s.stance[a]);
  else if(a==='shiftF'||a==='shiftR')ok=S2.planShift(s.id,a==='shiftF'?'F':'R');
  else if(a==='kturn')ok=!!S2.addKturn(s.id);
  else if(a==='undo')S2.undoMove(s.id);
  else if(a==='clear')S2.clearPath(s.id);
  if(!ok)toast('Not enough AP');
  syncHud(true);
});
byId('arShip').addEventListener('change',ev=>{
  const sl=ev.target.closest('select[data-act="order"]');if(!sl)return;
  const s=ship(A.sel);if(!s)return;
  const k=sl.value;
  const other=A.sim.ships.find(x=>x.alive&&x.faction==='reb'&&x!==s);
  const tgt=k==='pursue'?(s.target||((S2.WAPI.nearestFoe(s)||{}).id)):(k==='escort'||k==='follow')?(other&&other.id):null;
  if((k==='escort'||k==='follow')&&!tgt){toast('No other ship of yours to '+k);sl.value=s.order?s.order.kind:'none';return;}
  S2.setOrder(s.id,{kind:k,target:tgt});
  syncHud(true);
});
function statusText(){
  const sim=A.sim;if(!sim)return '';
  const o=S2.fn.objState();
  let obj='';
  if(o.cur==='survive')obj='Survive · '+Math.ceil(o.left)+' s left';
  else if(o.cur==='destroy')obj='Destroy · '+o.left+' left';
  else if(o.cur==='exit')obj='Exit the '+({E:'east',W:'west',N:'north',S:'south'}[(sim.objective.steps?sim.objective.steps[o.step]:sim.objective).edge])+' edge';
  if(o.of>1)obj+=' (step '+(o.step+1)+' of '+o.of+')';
  let ph='';
  if(sim.phase==='PLAN'){ph='PLAN · turn '+sim.turn;if(A.clockEnd)ph+=' · '+Math.max(0,Math.ceil((A.clockEnd-performance.now())/1000))+' s';}
  else if(sim.phase==='EXEC')ph=(sim.paused?'INTERRUPT':A.hold?'PAUSED':'EXEC')+' · turn '+sim.turn+' · '+sim.execT.toFixed(1)+' / '+T.EXEC_LEN+' s';
  else ph='OVER · '+(sim.result&&sim.result.win?'won':'lost');
  return '<b>'+ph+'</b><span>'+HUD.esc(obj)+'</span>';
}
function syncHud(force){
  const st=byId('arStatus'),sh=statusText();
  if(st.dataset.h!==sh){st.innerHTML=sh;st.dataset.h=sh;}
  const sim=A.sim,go=byId('arGo'),pz=byId('arPause');
  go.disabled=!sim||sim.phase!=='PLAN'||!byId('arPicker').hidden;
  pz.disabled=!sim||sim.phase!=='EXEC';
  pz.textContent=A.hold?'Resume':'Pause';
  shipCard();
  if(force||(sim&&sim.phase!=='PLAN')||Math.random()<0.5)readouts();
  syncInt();
}

/* ---------- interrupts (handoff §3.4): click your ship (or its number) during EXEC ---------- */
function openInt(id){
  const r=S2.interrupt(id);
  if(!r.ok){toast(r.why);return false;}
  A.sel=id;syncInt();return true;
}
function closeInt(){byId('arInt').hidden=true;A.juke=false;}
function syncInt(){
  const el=byId('arInt'),s=S2.pausedShip();
  if(!s){el.hidden=true;return;}
  el.hidden=false;
  const left=S2.apLeft(s),sn=S2.canSnap();
  const vb=(k,label,cost,why)=>'<button class="sr-btn sr-btn--sm" data-int="'+k+'"'+(why?' disabled title="'+why+'"':'')+'>'+label+(why&&why!=='not enough AP'?' · '+why:'')+' <b class="ar-cost">'+cost+'</b></button>';
  const h='<div class="ar-int__head">'+HUD.esc(s.name)+' · '+left+' AP left · nerve '+Math.round(s.pilot.cool)+'</div>'+
    (A.juke?'<div class="ar-int__hint">Drag one new move from the ship ('+T.AP_JUKE+' AP + the move)</div>':
    vb('snap','Snap Shot',T.AP_SNAP,sn.ok?'':sn.why)+
    vb('juke','Juke',T.AP_JUKE+'+',left<T.AP_JUKE+T.AP_STRAIGHT?'not enough AP':'')+
    vb('shiftF','Shift fore',T.AP_SHIFT_INT,left<T.AP_SHIFT_INT?'not enough AP':'')+
    vb('shiftR','Shift aft',T.AP_SHIFT_INT,left<T.AP_SHIFT_INT?'not enough AP':''))+
    '<button class="sr-btn sr-btn--sm sr-btn--ghost" data-int="cancel">Cancel <span class="sr-kbd">Esc</span></button>';
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
  if(A.juke){el.style.left='16px';el.style.top='16px';return;}   // out of the way of the Juke's envelope
  const [x,y]=toCss(s.x,s.y);
  el.style.left=Math.max(8,Math.min(cssW-el.offsetWidth-8,x+40))+'px';
  el.style.top=Math.max(8,Math.min(cssH-el.offsetHeight-8,y-el.offsetHeight/2))+'px';
}
function intVerb(v){
  let r={ok:true};
  if(v==='snap')r=S2.intSnap();
  else if(v==='juke'){A.juke=true;syncInt();return;}
  else if(v==='shiftF'||v==='shiftR')r=S2.intShift(v==='shiftF'?'F':'R');
  else if(v==='cancel')S2.intCancel();
  if(!r.ok)toast(r.why);
  onEvents(S2.drain());
  if(!S2.pausedShip())closeInt();
  syncHud(true);
}
byId('arInt').addEventListener('click',ev=>{const b=ev.target.closest('[data-int]');if(b)intVerb(b.dataset.int);});

/* ---------- input ---------- */
function evCss(ev){const r=cv.getBoundingClientRect();return [ev.clientX-r.left,ev.clientY-r.top];}
function shipAt(px,py){
  const w=toWorld(px,py);let best=null,bd=1e18;
  for(const s of (A.sim?A.sim.ships:[])){if(!s.alive)continue;const d=Math.hypot(s.x-w.x,s.y-w.y);if(d*A.cam.z<Math.max(30,24*s.size*iconBoost()*A.cam.z)&&d<bd){bd=d;best=s;}}
  return best;
}
/* the ship whose chain-end handle is under the pointer (the next drag starts there) */
function handleAt(px,py){
  if(!A.sim||A.sim.phase!=='PLAN')return null;
  for(const s of A.sim.ships){
    if(!s.alive||!s.plan2.drawn||!(s.faction==='reb'||A.possess))continue;
    const st=S2.planEnd(s.id),[x,y]=toCss(st.x,st.y);
    if(Math.hypot(x-px,y-py)<22)return s;
  }
  return null;
}
/* Moves (C-57): press on your ship (or the gold handle at the end of its moves), drag, release. The ghost follows
   the pointer inside the envelope and slides along its edge outside it; release sets one move. */
cv.addEventListener('pointerdown',ev=>{
  if(!A.sim)return;
  SR.audio.wake();
  cv.setPointerCapture(ev.pointerId);
  const [px,py]=evCss(ev),sim=A.sim,hs=ev.button===0?handleAt(px,py):null,s=hs||shipAt(px,py);
  const canMove=s&&sim.phase==='PLAN'&&ev.button===0&&(s.faction==='reb'||(A.possess&&s.faction==='heg'))&&!S2.fn.isStruct(s);
  const jk=s&&A.juke&&sim.paused&&sim.paused.id===s.id;
  if(canMove){A.drag={id:s.id,mode:'move',start:S2.planEnd(s.id),x0:px,y0:py,moved:false,mv:null};A.sel=s.id;return;}
  if(jk){A.drag={id:s.id,mode:'juke',start:{x:s.x,y:s.y,h:s.h,left:s.vel*(T.EXEC_LEN-sim.execT),ap:S2.apLeft(s)-T.AP_JUKE},x0:px,y0:py,moved:false,mv:null};return;}
  A.pan={x:px,y:py,moved:false,ship:s};
});
cv.addEventListener('pointermove',ev=>{
  const [px,py]=evCss(ev);
  if(A.drag){
    if(Math.hypot(px-A.drag.x0,py-A.drag.y0)>6)A.drag.moved=true;
    if(A.drag.moved){
      const w=toWorld(px,py);
      A.drag.mv=A.drag.mode==='juke'?S2.previewJuke(w.x,w.y):S2.previewMove(A.drag.id,w.x,w.y);
    }
    return;
  }
  if(A.pan){
    const dx=px-A.pan.x,dy=py-A.pan.y;
    if(Math.abs(dx)+Math.abs(dy)>5)A.pan.moved=true;
    if(A.pan.moved){A.cam.x-=dx/A.cam.z;A.cam.y-=dy/A.cam.z;clampCam();A.pan.x=px;A.pan.y=py;}
    return;
  }
  const h=handleAt(px,py)||shipAt(px,py);A.hover=h?h.id:null;cv.style.cursor=h?'pointer':'grab';
});
function endPointer(ev){
  const [px,py]=evCss(ev);
  if(A.drag){
    const d=A.drag;A.drag=null;
    const s=ship(d.id);
    if(d.moved&&s){
      const w=toWorld(px,py);
      if(d.mode==='juke'){const r=S2.intJuke(w.x,w.y);if(!r.ok)toast(r.why);else closeInt();onEvents(S2.drain());}
      else {const pv=S2.previewMove(s.id,w.x,w.y);if(pv&&pv.arc&&pv.ok)S2.addMove(s.id,w.x,w.y);else toast(pv?pv.why:'No move there');}
    } else click(s,px,py);
    syncHud(true);return;
  }
  if(A.pan){const p=A.pan;A.pan=null;if(!p.moved)click(shipAt(px,py),px,py);}
}
cv.addEventListener('pointerup',endPointer);
cv.addEventListener('pointercancel',()=>{A.drag=null;A.pan=null;});
cv.addEventListener('wheel',ev=>{
  ev.preventDefault();
  const [px,py]=evCss(ev),w0=toWorld(px,py);
  A.cam.z*=Math.exp(-ev.deltaY*0.0011);clampCam();
  const w1=toWorld(px,py);A.cam.x+=w0.x-w1.x;A.cam.y+=w0.y-w1.y;clampCam();
},{passive:false});
function click(s){
  const sim=A.sim;if(!sim)return;
  if(!s){return;}
  if(sim.phase==='EXEC'&&s.faction==='reb'&&!sim.paused){openInt(s.id);return;}
  if(sim.phase==='PLAN'&&s.faction==='heg'&&!A.possess){const me=ship(A.sel);if(me&&me.faction==='reb'&&S2.setTarget(me.id,s.id)){toast(me.name+' targets '+s.name);syncHud(true);return;}}
  A.sel=s.id;syncHud(true);
}
addEventListener('keydown',ev=>{
  if(SR.active!=='arena'||!A.sim)return;
  if(ev.target&&/INPUT|SELECT|TEXTAREA/.test(ev.target.tagName))return;
  const sim=A.sim;
  if(ev.key==='Escape'){if(sim.paused){intVerb('cancel');ev.preventDefault();}return;}
  if((ev.key==='Enter'||ev.key===' ')&&sim.phase==='PLAN'&&byId('arPicker').hidden){ev.preventDefault();execute();return;}
  if(ev.key==='p'||ev.key==='P'){togglePause();return;}
  if((ev.key==='z'||ev.key==='Z'||ev.key==='Backspace')&&sim.phase==='PLAN'&&A.sel){ev.preventDefault();S2.undoMove(A.sel);syncHud(true);return;}
  if((ev.key==='k'||ev.key==='K')&&sim.phase==='PLAN'&&A.sel){if(!S2.addKturn(A.sel))toast('No K-turn: needs the loop, 3 AP and the distance');syncHud(true);return;}
  if(/^[1-8]$/.test(ev.key)){
    const s=sim.ships.filter(x=>x.faction==='reb'&&x.alive)[+ev.key-1];if(!s)return;
    if(sim.phase==='EXEC'&&!sim.paused)openInt(s.id);else{A.sel=s.id;syncHud(true);}
  }
});
function togglePause(){if(A.sim&&A.sim.phase==='EXEC'){A.hold=!A.hold;syncHud(true);}}
let toastT=0;
function toast(msg){const t=byId('arToast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},2200);}

/* =====================================================================
   The designer panel (handoff §5): sliders, toggles, buttons and live read-outs, in the right-hand dock.
   Every slider reads and writes a named, getter-exposed SIM2 constant.
   ===================================================================== */
const SLIDERS=[
  ['EXEC_LEN','Exec length (s)',2,10,1],
  ['SIM_SPEED','Sim speed (×)',0.25,2,0.25],
  ['PLAN_CLOCK','Planning clock (s, 0 off)',0,60,30],
  ['AP_BASE','AP per round',2,12,1],
  ['AP_LEVELS','+1 AP per levels',1,10,1],
  ['COOL_AP','Cool bonus AP',0,5,1],
  ['AP_STRAIGHT','Straight move AP',0,5,1],
  ['AP_BANK','Bank move AP',0,5,1],
  ['AP_TURN','Turn move AP',0,6,1],
  ['AP_SNAP','Snap Shot AP',0,6,1],
  ['AP_JUKE','Juke AP (+ the move)',0,6,1],
  ['AP_SHIFT_INT','Shield Shift AP (mid-exec)',0,6,1],
  ['INT_FLOOR','Interrupt floor (nerve)',0,70,5],
  ['INT_CAP','Interrupt cap (0 none)',0,3,1],
  ['NERVE_GAIN','Nerve gain ×',0,3,0.25],
  ['NERVE_DRAIN','Nerve drain ×',0,3,0.25],
  ['ENEMY_N','Enemies per flight (0 scenario; on restart)',0,6,1],
  ['AI_NOISE','AI fitter noise',0,300,10],
];
const MORE=[
  ['AP_KTURN','K-turn AP',0,6,1],['AP_EVADE','Evade AP',0,5,1],['AP_LOCKIN','Lock in AP',0,5,1],['AP_BOOST','Boost shield AP',0,5,1],['AP_SHIFT','Angle shield AP (plan)',0,5,1],
  ['COOL_SPENT_TO','Nerve after spending Cool',30,69,1],['STRAIGHT_TOL','Straight tolerance (°)',0,20,1],
  ['SEG_TIME','Seconds per top-speed move',1,4,0.5],['PATH_SEGS','AI moves per round',1,4,1],['SNAP_BONUS','Snap Shot ATK',0,6,1],
  ['LOCK_TIME','Lock time (s)',0.5,4,0.25],['CALM_GAIN','Calm nerve gain',0,20,1],
  ['GUN_SHOTS','Gun shots per 6 s',1,4,1],['MSL_SHOTS','Missile shots per 6 s',1,3,1],
  ['GUARD_R','Guard radius',400,1600,50],['WING_FLOUNDER','Wing flounder (s)',0,10,1],['PREF_RANGE','Pursuit range',150,700,10],['OPP_FIRE','Opportunity fire (0/1)',0,1,1],
];
/* what Spawn offers: your ship classes, or the Hegemony's space_enemies rows (the same data the scenarios use) */
function spawnKinds(side){
  const ks=side==='heg'?Enemies.spaceRows.map(r=>r.id):['talon','cross','graf','scim','mote','fled'];
  return ks.map(k=>'<option value="'+k+'">'+k+'</option>').join('');
}
const sliderHtml=([k,label,lo,hi,step])=>'<label class="ar-sl"><span>'+label+'</span><input type="range" data-tune="'+k+'" min="'+lo+'" max="'+hi+'" step="'+step+'" value="'+T[k]+'"><b data-tv="'+k+'">'+T[k]+'</b></label>';
function buildPanel(){
  const P=byId('arPanel');
  let h='<section><h4>Run</h4><div class="ar-btns">'+
    '<button class="sr-btn sr-btn--sm" data-pb="same">Restart (same seed)</button>'+
    '<button class="sr-btn sr-btn--sm" data-pb="new">Restart (new seed)</button>'+
    '<button class="sr-btn sr-btn--sm" data-pb="picker">Back to picker</button>'+
    '<button class="sr-btn sr-btn--sm'+(A.possess?' is-on':'')+'" data-pb="possess">Possess</button>'+
    '<button class="sr-btn sr-btn--sm" data-pb="dump">Dump metrics</button></div>'+
    '<div class="ar-spawn"><select id="arSpSide"><option value="reb">Yours</option><option value="heg">Hegemony</option></select>'+
    '<select id="arSpKind">'+spawnKinds('reb')+'</select>'+
    '<select id="arSpPre">'+Object.keys(S2.PRESETS).map(k=>'<option'+(k==='regular'?' selected':'')+'>'+k+'</option>').join('')+'</select>'+
    '<select id="arSpDoc">'+Object.keys(S2.DOCTRINES).map(k=>'<option>'+k+'</option>').join('')+'</select>'+
    '<button class="sr-btn sr-btn--sm" data-pb="spawn">Spawn ship</button><button class="sr-btn sr-btn--sm" data-pb="despawn">Despawn selected</button></div></section>';
  h+='<section><h4>Numbers</h4>'+SLIDERS.map(sliderHtml).join('')+
    '<details><summary>More numbers</summary>'+MORE.map(sliderHtml).join('')+'</details>'+
    '<button class="sr-btn sr-btn--sm sr-btn--ghost" data-pb="reset">Reset numbers to defaults</button></section>';
  h+='<section><h4>Switches</h4>'+Object.keys(S2.DOCTRINES).map(k=>'<label class="ar-tg"><input type="checkbox" data-doc="'+k+'"'+(S2.DOC_OFF[k]?'':' checked')+'> Doctrine: '+k+'</label>').join('')+
    '<label class="ar-tg"><input type="checkbox" data-ui="tells"'+(A.ui.tells?' checked':'')+'> Doctrine tells</label>'+
    '<label class="ar-tg">Paths <select data-ui="paths">'+['all','hover','selected'].map(o=>'<option'+(o===A.ui.paths?' selected':'')+'>'+o+'</option>').join('')+'</select></label>'+
    '<label class="ar-tg">Resolution cards <select data-ui="cards">'+['verbose','quiet'].map(o=>'<option'+(o===A.ui.cards?' selected':'')+'>'+o+'</option>').join('')+'</select></label></section>';
  h+='<section><h4>Read-outs</h4><div id="arRead"></div></section>';
  P.innerHTML=h;
  readouts();
}
byId('arPanel').addEventListener('input',ev=>{
  const r=ev.target.closest('[data-tune]');
  if(r){S2.setTune(r.dataset.tune,+r.value);const b=byId('arPanel').querySelector('[data-tv="'+r.dataset.tune+'"]');if(b)b.textContent=T[r.dataset.tune];
    if(r.dataset.tune==='PLAN_CLOCK'&&A.sim&&A.sim.phase==='PLAN')A.clockEnd=T.PLAN_CLOCK>0?performance.now()+T.PLAN_CLOCK*1000:0;
    if(A.sim&&A.sim.phase==='PLAN')for(const s of A.sim.ships)if(s.alive&&s.faction==='reb'&&!s.plan2.drawn)S2.setOrder(s.id,s.order);   // re-plan to the new numbers
  }
});
byId('arPanel').addEventListener('change',ev=>{
  const d=ev.target.closest('[data-doc]');if(d){S2.setDoctrineOn(d.dataset.doc,d.checked);return;}
  if(ev.target.id==='arSpSide'){byId('arSpKind').innerHTML=spawnKinds(ev.target.value);return;}
  const u=ev.target.closest('[data-ui]');
  if(u){const k=u.dataset.ui;A.ui[k]=u.type==='checkbox'?u.checked:u.value;}
});
byId('arPanel').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-pb]');if(!b)return;
  const k=b.dataset.pb;
  if(k==='same')restart(true);
  else if(k==='new')restart(false);
  else if(k==='picker')openPicker();
  else if(k==='possess'){A.possess=!A.possess;b.classList.toggle('is-on',A.possess);toast(A.possess?'Possess: drag from an enemy to stage its next turn':'Possess off');}
  else if(k==='dump')dumpMetrics(true);
  else if(k==='reset'){S2.resetTune();buildPanel();}
  else if(k==='spawn'&&A.sim){
    const side=byId('arSpSide').value,kind=byId('arSpKind').value;
    const sh=S2.spawn({side,cls:kind,type:kind,preset:byId('arSpPre').value,doctrine:byId('arSpDoc').value,x:A.cam.x,y:A.cam.y,h:side==='heg'?Math.PI:0});
    if(sh){A.sel=sh.id;toast('Spawned '+sh.name);}
  }
  else if(k==='despawn'&&A.sel){S2.despawn(A.sel);A.sel=null;}
  syncHud(true);
});
function readouts(){
  const el=byId('arRead');if(!el||!A.sim)return;
  const sim=A.sim;
  const cur=sim.phase==='PLAN'?Math.round((performance.now()-A.planStart)/1000):null;
  let h='<div class="ar-ro">Planning this turn: <b>'+(cur==null?'—':cur+' s')+'</b></div>'+
    '<div class="ar-ro">Per turn: '+(A.planHist.length?A.planHist.map(ms=>(ms/1000).toFixed(1)+'s').join(', '):'—')+'</div>';
  h+='<table class="ar-tbl"><tr><th></th><th>Shots</th><th>Hits</th><th>In arc</th><th>AP</th><th>Nerve</th></tr>';
  for(const s of sim.ships){
    if(S2.fn.isStruct(s))continue;
    h+='<tr class="'+(s.faction==='reb'?'is-reb':'is-heg')+(s.alive?'':' is-dead')+'"><td>'+HUD.esc(s.name)+'</td><td>'+s.stats.shots+'</td><td>'+s.stats.hits+'</td><td>'+
      (s.faction==='reb'?(s.stats.arcTicks*T.TICK/1000).toFixed(1)+'s':'')+'</td><td>'+(s.ap&&s.faction==='reb'?(S2.apPlanned(s)+s.ap.used)+'/'+(s.ap.max+s.ap.bonus):'')+'</td><td>'+
      (S2.CLS[s.cls].mute?'—':Math.round(s.pilot.cool))+'</td></tr>';
  }
  h+='</table><div class="ar-ro ar-faint">Shots, hits and time in arc count this exec; AP is spent of the round’s total. '+A.metrics.length+' exec records this session.</div>';
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
}
function dumpMetrics(show){
  const out=JSON.stringify(A.metrics);
  try{console.log('ARENA_METRICS_DUMP '+out);}catch(e){}
  if(show){const w=byId('arDump');w.querySelector('textarea').value=out;w.hidden=false;}
  return A.metrics.slice();
}
byId('arDump').addEventListener('click',ev=>{if(ev.target.closest('[data-close]'))byId('arDump').hidden=true;});
byId('arOver').addEventListener('click',ev=>{
  const b=ev.target.closest('[data-ob]');if(!b)return;
  if(b.dataset.ob==='same')restart(true);else if(b.dataset.ob==='new')restart(false);else openPicker();
});
byId('arGo').addEventListener('click',execute);
byId('arPause').addEventListener('click',togglePause);
byId('arDockBtn').addEventListener('click',()=>{A.ui.dock=!A.ui.dock;ROOT.querySelector('.ar-shell').classList.toggle('is-nodock',!A.ui.dock);setTimeout(fitCanvas,0);});
/* the menu: back to the picker or the title (the title is a reload with the hash cleared: crude, as the lab allows) */
const menuEl=byId('arMenu');
menuEl.innerHTML=HUD.menuHtml([{id:'arMPick',icon:'missions',label:'Back to picker'},{id:'arMTitle',icon:'back',label:'Back to title'}]);
HUD.menuBind(menuEl,byId('arMenuBtn'));
byId('arMPick').addEventListener('click',openPicker);
byId('arMTitle').addEventListener('click',backToTitle);
function backToTitle(){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}location.reload();}

/* ---------- scene lifecycle ---------- */
function enter(){
  fitCanvas();camFit();
  openPicker();
}
function exit(){closeInt();}
SR.register('arena',{enter,exit,frame});

if(TEST){
  window.DBGarena={get A(){return A;},get sim(){return S2.S;},SIM2:S2,scenarios:ARENA_SCENARIOS,
    fn:{start:startScenario,restart,execute,openPicker,dumpMetrics,backToTitle:()=>{},
      go(){execute();return A.sim.phase;},
      manual(on){A.manual=!!on;},
      runExec(){S2.runExec();onEvents(S2.drain());return A.sim.phase;},
      runUntil(t){S2.runUntil(t);onEvents(S2.drain());return A.sim.execT;},
      interrupt:openInt,verb:intVerb,
      juke(x,y){A.juke=true;const r=S2.intJuke(x,y);onEvents(S2.drain());if(!S2.pausedShip())closeInt();return r;},
      addScenario(s){ARENA_SCENARIOS.push(s);if(!byId('arPicker').hidden)openPicker();return s;},
      pickerIds(){return [...byId('arPicker').querySelectorAll('[data-scn]')].map(e=>e.dataset.scn);},
      hash:S2.hash,setRng:S2.setRng,select(id){A.sel=id;syncHud(true);}}};
}
})();
