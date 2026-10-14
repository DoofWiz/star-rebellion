'use strict';
/* =====================================================================
   STAR REBELLION — SPACE FX KIT  sr-space-fx.js  v1
   The juice layer for real-time space combat (the Arena's High Command
   ruleset; docs/art/HC-VFX-BRIEF.md and HC-VFX-HANDOFF.md). Everything
   that moves, flashes, burns, smokes, warps or pops over the map:
   engine flames, muzzle flashes, bolts and missiles, impacts, chaff,
   explosions, warp-in and jump-out, station art and states, the
   backdrop, rocks, status badges and the camera shake.

   Rules of the house, applied to space
   1. One ink, one light. Hulls keep their ink and their top-left cel
      light (the sprite bake does that). Effects are chunky shapes with
      bright cores, never generic bloom.
   2. Red is ours, blue is theirs. Rebel fire and flame run warm; the
      Hegemony's and the drones' run cold. Gold stays the player's
      command colour and is never an effect.
   3. Effects carry the saturation; the world stays quiet. The backdrop,
      rocks and stations sit low-contrast; bolts, fire, shields and
      warnings get the colour.
   4. Swap, don't redraw. Every look is a row in a table (FXDEF, the
      TUNE block, SR_ART.STATIONS); a new effect is data plus one small
      draw function.
   5. The simulation is read-only. This module never touches S, never
      reads S.rng (it has its own), and draws the same fight whatever
      it does. Game-time effects freeze on pause; UI pulses run on real
      time.

   Performance (the §8 rules): no shadowBlur per frame — every glow is
   baked once into a sprite and drawImage'd, 'lighter' for additive
   light; particles come from a fixed pool with no per-frame allocation;
   hull bodies are cached sprites (baked with SR_ART.ship still:true)
   with the live layers drawn on top; LOD by zoom; everything culls to
   the view.
   ===================================================================== */
window.SR_SPACE_FX=(function(){
  const SA=window.SR_ART;if(!SA)return null;
  const TAU=Math.PI*2,C=SA.C,U=SA.util,{rgba,shade}=U;
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const lerp=(a,b,k)=>a+(b-a)*k;
  const ease=SA.ease;

  /* =================================================================
     TUNE — every number the designer may want to move, in one table.
     Read live (nothing is copied), so a panel slider on any of these
     works. All placeholders.
     ================================================================= */
  const TUNE={
    poolCap:768,            // live particles, hard cap; past it the smallest die first
    oneshotCap:72,          // live one-shot effects
    lodOut:0.25,            // below this zoom: big reads only
    lodIn:1.0,              // above this zoom: extra detail
    flameLen:2.4,           // engine flame length × the engine's radius at full speed
    flameBoost:2.1,         // × again while boosting
    flameFlick:0.3,         // flame length flicker amount
    trailSecs:1.3,          // the motion trail's life (matches the sim's buffer)
    boltGlow:5,             // the bolt's soft stroke width (px at z 1)
    boltCore:2,             // the bolt's hot core width
    missileSmoke:0.028,     // seconds of game time between missile smoke puffs
    missileWobble:2.2,      // visual wobble (world units) in hard turns
    trailSmokeAt:0.25,      // hull fraction at or under which a ship streams a smoke trail
    trailFireAt:0.10,       //  … and burns: fire licks the hull and the smoke turns black
    trailSmokeRate:9,       // smoke-trail puffs a second (the fire adds its own on top)
    smokeStage2:3,          // stage fallback when hullFrac isn't on the view object
    smokeStage3:7,
    spiralChance:0.5,       // the chance a killed fighter careens off in a death spiral first
    spiralSecs:2,           //  … for this long, then the explosion fires where it ends
    spiralSpin:7,           // the corpse's tumble rate, rad/s
    laserLen:70,            // a laser dart's beam length (world units)
    muzzleDur:0.085,        // seconds a muzzle flash lives
    sparkN:6,               // sparks per armour/hull bolt hit
    shardN:5,               // hex shards per shield hit
    boomDur:0.95,           // a fighter kill, start to faded
    boomDebris:9,           // debris chunks per fighter kill
    stationBoomDur:2.8,     // a station death, multi-stage
    warpOutDur:0.6, warpInDur:0.55,
    chaffFlares:6, chaffGlints:12,
    shakeBoom:0.28, shakeMissile:0.16, shakeCollide:0.2, shakeStation:0.6,
    shakeNear:1600,         // world units: full shake inside this range of the camera, fading to 0 at 3×
    screenFlash:0.1,        // peak alpha of the big-kill screen flash (0 disables)
    nebulaAlpha:0.5,        // the backdrop nebula's strength (it is painted very dark already)
    starFar:0.55,           // the far star layer's parallax (1 = locked to the world)
  };

  /* ---------- the module's own clock and RNG (never the sim's) ---------- */
  let GT=0,NOW=0,LASTRDT=16;
  let seedN=7;const R=()=>{seedN^=seedN<<13;seedN>>>=0;seedN^=seedN>>>17;seedN^=seedN<<5;seedN>>>=0;return seedN/4294967296;};
  const rs=(a,b)=>a+R()*(b-a);

  /* =================================================================
     SPRITE BAKERY — glows, rings, puffs, flares and shards, baked once
     to small offscreen canvases. This is where the shadowBlur budget
     lives: at bake time only.
     ================================================================= */
  const SPR=new Map();
  function bake(key,sz,draw){let s=SPR.get(key);if(!s){const cv=document.createElement('canvas');cv.width=cv.height=sz;const g=cv.getContext('2d');g.translate(sz/2,sz/2);draw(g,sz/2);s={cv,half:sz/2};SPR.set(key,s);}return s;}
  const glowDot=col=>bake('glow|'+col,48,(g,r)=>{const gr=g.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(0.25,col);gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.fillRect(-r,-r,2*r,2*r);});
  const softRing=col=>bake('ring|'+col,96,(g,r)=>{g.strokeStyle=col;g.lineWidth=7;g.shadowColor=col;g.shadowBlur=10;g.beginPath();g.arc(0,0,r-12,0,TAU);g.stroke();g.shadowBlur=0;g.strokeStyle='#ffffff';g.lineWidth=2.4;g.stroke();});
  const inkRing=col=>bake('inkring|'+col,96,(g,r)=>{g.lineWidth=10;g.strokeStyle=C.ink;g.beginPath();g.arc(0,0,r-10,0,TAU);g.stroke();g.lineWidth=5.5;g.strokeStyle=col;g.stroke();});
  const flare=col=>bake('flare|'+col,64,(g,r)=>{g.shadowColor=col;g.shadowBlur=8;g.fillStyle='#ffffff';for(const a of[0,Math.PI/2]){g.save();g.rotate(a);g.beginPath();g.moveTo(-r+6,0);g.lineTo(0,-3);g.lineTo(r-6,0);g.lineTo(0,3);g.closePath();g.fill();g.restore();}g.shadowBlur=0;g.fillStyle=col;g.beginPath();g.arc(0,0,5,0,TAU);g.fill();});
  const puff=(col,edge)=>bake('puff|'+col+'|'+(edge?1:0),44,(g,r)=>{g.beginPath();for(let i=0;i<9;i++){const a=i/9*TAU,q=r*(0.62+0.16*Math.sin(i*2.7));g.lineTo(Math.cos(a)*q,Math.sin(a)*q);}g.closePath();g.fillStyle=col;g.fill();if(edge){g.lineWidth=3;g.lineJoin='round';g.strokeStyle=C.ink;g.stroke();}g.beginPath();g.arc(-r*0.2,-r*0.22,r*0.34,0,TAU);g.fillStyle='rgba(255,255,255,0.28)';g.fill();});
  const hexPop=col=>bake('hex|'+col,72,(g,r)=>{g.shadowColor=col;g.shadowBlur=8;for(const q of[r-16,r-28]){g.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU+Math.PI/6;g.lineTo(Math.cos(a)*q,Math.sin(a)*q);}g.closePath();g.lineWidth=q===r-16?4:2.4;g.strokeStyle=col;g.stroke();}g.shadowBlur=0;});
  const shard=col=>bake('shard|'+col,20,(g,r)=>{g.beginPath();for(let i=0;i<3;i++){const a=i/3*TAU;g.lineTo(Math.cos(a)*r*0.8,Math.sin(a)*r*0.8);}g.closePath();g.fillStyle=rgba(col,0.6);g.fill();g.lineWidth=2;g.strokeStyle=col;g.stroke();});
  const glint=()=>bake('glint',16,(g,r)=>{g.strokeStyle='#ffffff';g.lineWidth=2;g.beginPath();g.moveTo(-r+2,0);g.lineTo(r-2,0);g.moveTo(0,-r+2);g.lineTo(0,r-2);g.stroke();});
  const streak=col=>bake('streak|'+col,64,(g,r)=>{const gr=g.createLinearGradient(-r,0,r,0);gr.addColorStop(0,rgba(col,0));gr.addColorStop(0.6,rgba(col,0.6));gr.addColorStop(1,'#ffffff');g.fillStyle=gr;g.fillRect(-r,-5,2*r,10);});
  const sparkBit=col=>bake('spark|'+col,18,(g,r)=>{g.fillStyle='#fffbe6';g.fillRect(-r+2,-1.6,2*r-4,3.2);g.fillStyle=col;g.fillRect(-r+2,-0.8,r,1.6);});
  /* fire tones (the staged fireball), ink-edged, cel */
  const FIRE=['#fff3b0','#ffb347','#e0603a'];

  /* =================================================================
     THE PARTICLE POOL — one fixed array, no allocation per frame.
     kinds: sprite particles (spr + tint baked in) and debris chunks
     (their own tiny canvas, cut from the dead ship, see explode()).
     pr: 0 small dressing · 1 ordinary · 2 must-keep (big reads).
     ================================================================= */
  const POOL=[];for(let i=0;i<1024;i++)POOL.push({on:0,x:0,y:0,vx:0,vy:0,age:0,life:1,s0:1,s1:1,spr:null,rot:0,spin:0,drag:0,add:0,pr:1,al:1,cv:null});
  let pLive=0;
  function emit(spr,x,y,vx,vy,life,s0,s1,o){
    const cap=Math.min(TUNE.poolCap,POOL.length);let p=null;
    for(let i=0;i<cap;i++){const q=POOL[i];if(!q.on){p=q;break;}}
    if(!p){let worst=null,wv=1e9;for(let i=0;i<24;i++){const q=POOL[(i*41)%cap];const v=q.pr*10+q.s0;if(v<wv){wv=v;worst=q;}}p=worst;pLive--;}
    o=o||{};p.on=1;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.age=0;p.life=life;p.s0=s0;p.s1=s1==null?s0:s1;
    p.spr=spr;p.rot=o.rot||0;p.spin=o.spin||0;p.drag=o.drag||0;p.add=o.add?1:0;p.pr=o.pr==null?1:o.pr;p.al=o.al==null?1:o.al;p.cv=o.cv||null;
    pLive++;return p;
  }
  function poolUpdate(dt){
    if(dt<=0)return;
    const cap=POOL.length;
    for(let i=0;i<cap;i++){const p=POOL[i];if(!p.on)continue;
      p.age+=dt;if(p.age>=p.life){p.on=0;p.cv=null;pLive--;continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.drag){const m=1-Math.min(0.9,p.drag*dt);p.vx*=m;p.vy*=m;}
      if(p.spin)p.rot+=p.spin*dt;
    }
  }
  function poolDraw(c,view){
    const z=view.z,x0=view.cx-view.W/2/z-80,x1=view.cx+view.W/2/z+80,y0=view.cy-view.H/2/z-80,y1=view.cy+view.H/2/z+80;
    const lod=view.lod;
    for(let pass=0;pass<2;pass++){
      c.globalCompositeOperation=pass?'source-over':'lighter';
      for(let i=0;i<POOL.length;i++){const p=POOL[i];
        if(!p.on||(pass?p.add:!p.add))continue;
        if(p.x<x0||p.x>x1||p.y<y0||p.y>y1)continue;
        const k=p.age/p.life,sz=lerp(p.s0,p.s1,k);
        if(lod===0&&p.pr===0)continue;
        if(sz*z<0.6&&p.pr<2)continue;
        c.globalAlpha=p.al*(k<0.12?k/0.12:1-Math.max(0,(k-0.6)/0.4));
        const img=p.cv||p.spr.cv,half=p.cv?p.cv.width/2:p.spr.half;
        if(p.rot||p.spin){c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.drawImage(img,-sz,-sz,2*sz,2*sz);c.restore();}
        else c.drawImage(img,p.x-sz,p.y-sz,2*sz,2*sz);
      }
    }
    c.globalCompositeOperation='source-over';c.globalAlpha=1;
  }

  /* =================================================================
     ONE-SHOTS — short structured effects (a flash, a staged fireball,
     a warp, a command pulse). Each is a row in FXDEF: a layer, a life,
     and one draw(ctx, e, k, view). k runs 0..1 in game time.
     ================================================================= */
  let OS=[];
  function oneshot(kind,x,y,o){
    if(OS.length>=TUNE.oneshotCap)OS.shift();
    const e=Object.assign({kind,x,y,t0:GT,dur:(FXDEF[kind]&&FXDEF[kind].dur)||0.5},o||{});
    OS.push(e);return e;
  }
  const drawSpr=(c,s,x,y,sz,al,add,rot)=>{if(al<=0)return;c.globalAlpha=al;if(add)c.globalCompositeOperation='lighter';if(rot){c.save();c.translate(x,y);c.rotate(rot);c.drawImage(s.cv,-sz,-sz,2*sz,2*sz);c.restore();}else c.drawImage(s.cv,x-sz,y-sz,2*sz,2*sz);if(add)c.globalCompositeOperation='source-over';c.globalAlpha=1;};
  /* the staged cel fireball: flash → ink-edged fire puffs cooling yellow → orange → red → smoke */
  function fireball(c,x,y,k,size,seed){
    if(k<0.12)drawSpr(c,glowDot('#fffbe6'),x,y,size*(0.6+3*k),(1-k/0.12),1);
    const fk=Math.min(1,k/0.6);
    if(fk<1){const r=size*(0.35+0.85*ease.outCubic(fk));let sd=seed|0||7;const rr2=()=>{sd^=sd<<13;sd>>>=0;sd^=sd>>>17;sd^=sd<<5;sd>>>=0;return sd/4294967296;};
      c.globalAlpha=fk>0.7?(1-fk)/0.3:1;
      for(let i=0;i<7;i++){const a=i/7*TAU+rr2()*0.8,d=r*0.55,tone=FIRE[Math.min(2,Math.floor(fk*3))];
        drawSpr(c,puff(tone,1),x+Math.cos(a)*d,y+Math.sin(a)*d*0.85,r*0.5,1,0);}
      drawSpr(c,puff(fk<0.35?'#fffbe6':FIRE[0],1),x,y,r*0.55,1,0);
      c.globalAlpha=1;}
    if(k>0.1&&k<0.6)drawSpr(c,softRing('#fffbe6'),x,y,size*(0.4+2.2*ease.outCubic((k-0.1)/0.5)),(1-(k-0.1)/0.5)*0.9,1);
  }
  const FXDEF={
    muzzle:{layer:'over',dur:TUNE.muzzleDur,draw(c,e,k){drawSpr(c,flare(e.col),e.x,e.y,e.r*(1.1-k*0.5),1-k,1,e.rot);}},
    hexsplash:{layer:'over',dur:0.35,draw(c,e,k){drawSpr(c,hexPop(C.shield),e.x,e.y,e.r*(0.5+k*0.9),1-k,1);}},
    boomS:{layer:'over',dur:0.55,draw(c,e,k,v){fireball(c,e.x,e.y,k,e.size,e.seed);}},
    boom:{layer:'over',dur:TUNE.boomDur,draw(c,e,k,v){
      fireball(c,e.x,e.y,k,e.size,e.seed);
      if(e.chunks)for(const ch of e.chunks){const d=ease.outCubic(k)*e.size*1.6,w=e.chunkW*(1-k*0.35);
        c.save();c.translate(e.x+Math.cos(ch.a)*d,e.y+Math.sin(ch.a)*d);c.rotate(ch.r0+k*ch.spin);c.globalAlpha=k>0.6?(1-k)/0.4:1;c.drawImage(ch.cv,-w,-w,2*w,2*w);c.restore();c.globalAlpha=1;}
      if(k>0.08)drawSpr(c,softRing(C.hazard),e.x,e.y,e.size*(0.5+2.6*ease.outCubic(k)),(1-k)*0.7,1);
    }},
    boomStation:{layer:'over',dur:TUNE.stationBoomDur,draw(c,e,k,v){
      let sd=e.seed|0;const rr2=()=>{sd^=sd<<13;sd>>>=0;sd^=sd>>>17;sd^=sd<<5;sd>>>=0;return sd/4294967296;};
      for(let i=0;i<4;i++){const kk=(k-i*0.16)/0.5;if(kk>0&&kk<1)fireball(c,e.x+(rr2()-0.5)*e.size*1.4,e.y+(rr2()-0.5)*e.size*1.2,kk,e.size*(0.6+rr2()*0.5),e.seed+i*31);}
      const rk=ease.outCubic(Math.min(1,k*1.4));
      drawSpr(c,inkRing(C.hazard),e.x,e.y,e.size*(0.6+4.5*rk),(1-k)*0.9,0);
      if(k<0.2)drawSpr(c,glowDot('#fffbe6'),e.x,e.y,e.size*3*(1-k/0.2),1,1);
    }},
    spiral:{layer:'over',dur:2,draw(c,e,k,v){
      const p=spiralPos(e,k);
      // the corpse: the stage-3 hull tumbling, trailing its own light
      c.save();c.translate(p.x,p.y);c.rotate(e.h0+k*e.dur*e.spin*(1+k*1.5));c.globalAlpha=1;
      c.drawImage(e.cv,-e.whalf,-e.whalf,2*e.whalf,2*e.whalf);c.restore();
      const fl=0.7+0.3*Math.sin(v.now/41);
      drawSpr(c,puff(FIRE[1],0),p.x,p.y,e.sc*8*fl,0.9,1);
      drawSpr(c,puff('#fff3b0',0),p.x,p.y,e.sc*4*fl,0.95,1);
      // fire and smoke dropped along the path (game-time gated, so pause freezes the stream)
      const step=0.045;
      while(GT-e.t0>e.emitN*step&&e.emitN*step<e.dur){const q=spiralPos(e,(e.emitN*step)/e.dur);e.emitN++;
        emit(puff('#3a3a42',1),q.x+rs(-4,4),q.y+rs(-4,4),rs(-10,10),rs(-10,10),rs(1,1.7),e.sc*4,e.sc*12,{drag:0.4,pr:1,al:0.85});
        if(e.emitN%2)emit(puff(FIRE[1+(e.emitN%4?0:1)],1),q.x,q.y,rs(-16,16),rs(-16,16),rs(0.3,0.5),e.sc*4,e.sc*1.5,{pr:1});
        if(e.emitN%3===0)emit(glowDot('#ffb347'),q.x,q.y,rs(-60,60),rs(-60,60),rs(0.4,0.8),3.5,1,{add:1,pr:0});}
    }},
    wreck:{layer:'under',dur:7,draw(c,e,k){if(!e.cv)return;c.save();c.translate(e.x,e.y);c.rotate(e.h||0);c.globalAlpha=0.85*(1-ease.outCubic(k));c.drawImage(e.cv,-e.whalf,-e.whalf,2*e.whalf,2*e.whalf);c.restore();c.globalAlpha=1;}},
    warpout:{layer:'over',dur:TUNE.warpOutDur,draw(c,e,k){
      const col=e.faction==='reb'?C.go:C.hegHi;
      if(k<0.5&&e.cv){const st=1+ease.outCubic(k/0.5)*3.4,sq=1-k/0.5*0.8;c.save();c.translate(e.x,e.y);c.rotate(e.vh);c.scale(st,Math.max(0.12,sq));c.globalAlpha=1-k/0.5*0.6;c.drawImage(e.cv,-e.whalf,-e.whalf,2*e.whalf,2*e.whalf);c.restore();c.globalAlpha=1;}
      if(k<0.35)drawSpr(c,glowDot(col),e.x,e.y,e.size*(0.6+k*2),0.9,1);
      if(k>0.2)drawSpr(c,softRing(col),e.x,e.y,e.size*(0.4+2.4*ease.outCubic((k-0.2)/0.8)),(1-k)*0.9,1);
      if(k>0.3&&k<0.5)drawSpr(c,streak(col),e.x,e.y,e.size*3,(1-(k-0.3)/0.2)*0.8,1,e.vh);
    }},
    warpin:{layer:'over',dur:TUNE.warpInDur,draw(c,e,k){
      const col=e.faction==='reb'?C.go:C.heg;
      if(k<0.35){const h=e.size*3.4*(1-k/0.35)+4;c.save();c.translate(e.x,e.y);c.rotate(e.vh+Math.PI/2);drawSpr(c,streak('#ffffff'),0,0,h,0.95,1,0);c.restore();}
      if(k<0.2)drawSpr(c,glowDot(col),e.x,e.y,e.size*2.4*(1-k/0.2)+e.size*0.5,1,1);
      drawSpr(c,softRing(col),e.x,e.y,e.size*(0.3+2.6*ease.outCubic(k)),(1-k)*0.85,1);
    }},
    kturn:{layer:'over',dur:0.4,draw(c,e,k){drawSpr(c,softRing('#fffbe6'),e.x,e.y,e.size*(0.4+1.4*ease.outCubic(k)),(1-k)*0.8,1);}},
    ignite:{layer:'over',dur:0.3,draw(c,e,k){drawSpr(c,softRing(e.col),e.x,e.y,e.size*(0.3+1.1*ease.outCubic(k)),(1-k)*0.9,1,0);}},
    support:{layer:'over',dur:0.8,draw(c,e,k){drawSpr(c,hexPop(C.shield),e.x,e.y,e.size*(0.5+1.8*ease.outCubic(k)),1-k,1);drawSpr(c,softRing(C.shield),e.x,e.y,e.size*(0.4+2.4*ease.outCubic(k)),(1-k)*0.7,1);}},
    repair:{layer:'over',dur:1.2,draw(c,e,k){drawSpr(c,softRing(C.go),e.x,e.y,e.size*(0.4+1.2*Math.sin(k*Math.PI)),Math.sin(k*Math.PI)*0.8,1);}},
    steady:{layer:'over',dur:0.7,draw(c,e,k){drawSpr(c,softRing(C.go),e.x,e.y,e.size*(0.5+1.4*ease.outCubic(k)),(1-k)*0.7,1);}},
    override:{layer:'over',dur:0.6,draw(c,e,k){drawSpr(c,inkRing(C.gold),e.x,e.y,e.size*(0.5+1.6*ease.outCubic(k)),1-k,0);drawSpr(c,flare(C.gold),e.x,e.y,e.size*0.7*(1-k),1-k,1);}},
    recall:{layer:'over',dur:0.9,draw(c,e,k){for(let i=0;i<3;i++){const u=(k*2+i/3)%1,x=lerp(e.x,e.tx,u),y=lerp(e.y,e.ty,u);drawSpr(c,glowDot(C.go),x,y,26*(1-u*0.5),(1-u)*0.8,1);}}},
    recon:{layer:'under',dur:1.6,draw(c,e,k,v){const w=ease.outCubic(k);c.save();c.globalAlpha=(1-k)*0.5;c.strokeStyle=C.hazard;c.lineWidth=26/v.z;c.beginPath();
      const u=e.dir==='W'?lerp(e.x1,e.x0,w):e.dir==='E'?lerp(e.x0,e.x1,w):0;const uy=e.dir==='N'?lerp(e.y1,e.y0,w):e.dir==='S'?lerp(e.y0,e.y1,w):0;
      if(e.dir==='E'||e.dir==='W'){c.moveTo(u,e.y0);c.lineTo(u,e.y1);}else{c.moveTo(e.x0,uy);c.lineTo(e.x1,uy);}c.stroke();c.restore();}},
    decoy:{layer:'over',dur:0.6,draw(c,e,k){drawSpr(c,softRing(C.shield),e.x,e.y,60*(0.4+1.6*ease.outCubic(k)),(1-k)*0.9,1);}},
    objpulse:{layer:'over',dur:0.9,draw(c,e,k){drawSpr(c,softRing(e.ok?C.go:C.hazard),e.x,e.y,e.size*(0.5+2*ease.outCubic(k)),(1-k)*0.9,1);}},
    capture:{layer:'over',dur:0.9,draw(c,e,k){drawSpr(c,softRing(C.rebelHi),e.x,e.y,90*(0.4+1.8*ease.outCubic(k)),(1-k)*0.9,1);}},
    shaken:{layer:'over',dur:0.4,draw(c,e,k){drawSpr(c,flare('#ffffff'),e.x,e.y,22*(1-k*0.4),1-k,1,k*2);}},
    crunch:{layer:'over',dur:0.4,draw(c,e,k){drawSpr(c,flare('#fffbe6'),e.x,e.y,e.size*(1-k*0.4),1-k,1);}},
  };
  function osDraw(c,layer,view){
    for(let i=0;i<OS.length;i++){const e=OS[i],d=FXDEF[e.kind];if(!d||d.layer!==layer)continue;
      const k=(GT-e.t0)/e.dur;if(k<0||k>1)continue;
      d.draw(c,e,k,view);
    }
  }

  /* =================================================================
     CAMERA SHAKE — trauma model (the kit's Shake), fed by events with a
     position: full strength near the camera, fading to nothing at
     3 × shakeNear. The renderer asks for the offset once a frame with
     camShake(view) and applies it to the camera, never the sim.
     ================================================================= */
  const SHK=SA.Shake({maxX:9,maxY:7,maxA:0.01,decay:2.4,freq:26});
  let shakeOn=true,shakePend=[];
  function addShake(amt,x,y){shakePend.push({amt,x,y});if(shakePend.length>16)shakePend.shift();}
  function camShake(view){
    for(const s of shakePend){const d=Math.hypot(s.x-view.cx,s.y-view.cy);SHK.add(s.amt*clamp(1-(d-TUNE.shakeNear)/(TUNE.shakeNear*2),0,1));}
    shakePend.length=0;
    if(view.reduced||!shakeOn)return {x:0,y:0,a:0};
    return SHK.offset(view.now/1000);
  }

  /* =================================================================
     HULLS — cached sprites (SR_ART.ship, still:true: no baked flames,
     no frozen smoke, lights steady) plus the live layers: engine
     flames along the line of flight, blinking lights, bank squash,
     ability and critical tells, damage smoke and fire from the pool.
     ================================================================= */
  const HULLS=new Map();let hullCap=700;
  const ANG_B=72,SCALE_B=Math.log(1.08),ART_R=52;
  const DMG_OF=[0,0.3,0.55,0.8];   // damage stage → SR_ART.ship damage
  const HULL_PX_CAP=3.0;   // bake ceiling: past this the sprite upsamples (a touch soft at zoom ≥ 1 on DPR 2, and
                           // bakes cost and weigh a quarter of what uncapped ones would). placeholder
  function hullSprite(art,livery,px,angI,stage){
    const pb=Math.min(HULL_PX_CAP,Math.exp(Math.round(Math.log(px)/SCALE_B)*SCALE_B));
    const key=art+'|'+livery+'|'+pb.toFixed(3)+'|'+angI+'|'+stage;
    let sp=HULLS.get(key);
    if(!sp){const half=Math.ceil(pb*ART_R)+2,cv=document.createElement('canvas');cv.width=cv.height=half*2;
      SA.ship(cv.getContext('2d'),art,half,half,angI*TAU/ANG_B,pb,0,{livery,damage:DMG_OF[stage]||0,still:true});
      sp={cv,half,pb};
      if(HULLS.size>hullCap)HULLS.delete(HULLS.keys().next().value);
      HULLS.set(key,sp);}
    return sp;
  }
  /* per-ship visual state, keyed by id (the view objects are rebuilt each frame) */
  const AUX=new Map();
  function auxOf(s){let a=AUX.get(s.id);if(!a){a={seed:(U.hashStr(String(s.id))%997)/997*TAU,smokeT:0,feedT:0,crackT:0};AUX.set(s.id,a);}return a;}
  const artScale=s=>(0.7+0.09*(s.size||4))*1.6*0.85*1.35*(s.iconBoost||1);
  const engColOf=s=>{const D=SA.SHIPS[s.art],lv=D&&D.liveries[s.livery]||D&&Object.values(D.liveries)[0];return lv&&lv.acc===C.heg?C.hegHi:'#ffb347';};
  /* the engine flame: one baked sprite per colour (warm lobe, hot core), one drawImage per engine,
     stretched to length and drawn additively — the whole ship's engines share one composite switch */
  const flameSpr=col=>bake('flame|'+col,64,(g,r)=>{
    g.translate(r*0.8,0);   // the nozzle sits near +x; the flame body runs to −x
    const lobe=(w,h,c2,a)=>{g.globalAlpha=a;g.fillStyle=c2;g.beginPath();g.moveTo(0,-h);g.quadraticCurveTo(-w*0.5,-h*0.7,-w,0);g.quadraticCurveTo(-w*0.5,h*0.7,0,h);g.quadraticCurveTo(w*0.14,0,0,-h);g.fill();};
    g.shadowColor=col;g.shadowBlur=6;lobe(r*1.7,11,col,0.95);g.shadowBlur=0;lobe(r*1.05,6.5,'#fffbe6',1);g.globalAlpha=1;});
  function flameAt(c,ex,ey,er,back,len,col,wob){
    const f=er*len*(1+wob),sp=flameSpr(col);
    c.save();c.translate(ex,ey);c.rotate(back);
    c.drawImage(sp.cv,-f*2+er*0.6,-er*1.2,f*2.4,er*2.4);
    c.restore();
  }
  function shipBody(c,s,view){
    const D=SA.SHIPS[s.art];if(!D){return;}
    const z=view.z,sc=artScale(s),px=sc*z*view.dpr;
    const a=auxOf(s),lod=view.lod;
    const h=s.h,vh=s.vh==null?h:s.vh;
    // bank: hard turns squash the hull; a barrel roll runs the squash through a full flip
    let roll=clamp(s.turnFrac||0,-1,1)*0.55;
    if(s.rollT!=null)roll=Math.sin(clamp(s.rollT,0,1)*Math.PI)*(s.rollT<0.5?1:-1);
    const sq=1-0.38*Math.abs(roll);
    // controls critical: the hull wobbles (visual only; off under reduced motion)
    const wobble=!view.reduced&&s.crits&&s.crits.indexOf('controls')>=0?Math.sin(view.now/70+a.seed)*0.035:0;
    // --- engine flames, behind the hull, along the line of flight ---
    const dead=s.panic==='freeze'?0.22:1;
    const engCrit=s.crits&&s.crits.indexOf('engine')>=0;
    let len=TUNE.flameLen*(0.35+0.65*(s.speedFrac==null?0.7:s.speedFrac))*dead*(s.boost?TUNE.flameBoost:1);
    if(engCrit&&Math.sin(view.now/60+a.seed*9)>0.2)len*=0.25;   // sputter
    if(s.panic==='flee')len*=1+0.5*Math.sin(view.now/40+a.seed);   // ragged burn
    const col=engColOf(s);
    if((len>0.1&&lod>0)||s.boost){
      c.save();c.translate(s.x,s.y);c.rotate(h);c.scale(sc,sc);c.globalCompositeOperation='lighter';
      const wob=TUNE.flameFlick*Math.sin(view.t*31+a.seed*7);
      for(const[ex,ey,er]of D.engines)flameAt(c,ex,ey,er,(vh-h),len,col,wob);   // the flame body extends on −x: back along the line of flight
      c.globalCompositeOperation='source-over';c.restore();
    }
    if(s.boost){drawSpr(c,streak(col),s.x-Math.cos(vh)*sc*22,s.y-Math.sin(vh)*sc*22,sc*26,0.5,1,vh);}
    if(s.driftT){const side=Math.sin(view.t*18+a.seed)>0?1:-1;   // side thrusters: the nose is off the line of flight
      drawSpr(c,glowDot(col),s.x+Math.cos(h+side*Math.PI/2)*sc*8,s.y+Math.sin(h+side*Math.PI/2)*sc*8,sc*5,0.7,1);}
    // --- the hull: cached sprite, squashed in the ship's own frame ---
    const angI=((Math.round(h/TAU*ANG_B)%ANG_B)+ANG_B)%ANG_B;
    const sp=hullSprite(s.art,s.livery,px,angI,clamp(s.damageStage|0,0,3)),k=(px/sp.pb)/(z*view.dpr);
    c.save();c.translate(s.x,s.y);c.rotate(h+wobble);c.scale(1,sq);c.rotate(-angI*TAU/ANG_B);c.scale(k,k);c.drawImage(sp.cv,-sp.half,-sp.half);c.restore();
    // --- live lights: blink on real time (frozen sprites were weakness no. 1) ---
    if(lod>0){const tg=s.crits&&s.crits.indexOf('targeting')>=0;
      c.save();c.translate(s.x,s.y);c.rotate(h);c.scale(sc,sc);
      c.globalCompositeOperation='lighter';
      for(const[nx,ny,nc]of D.lights||[]){const on=Math.sin(view.now/333+(ny>0?1.6:0)+a.seed)>-0.2&&!(s.damageStage>=3&&Math.sin(view.now/59)>0);
        if(on){const g=glowDot(nc);c.globalAlpha=0.9;c.drawImage(g.cv,nx-2.6,ny-2.6,5.2,5.2);}}
      if(D.slit&&!s.drone){const pul=0.5+0.5*Math.sin(view.now/420+a.seed);c.globalAlpha=0.35*pul;const g=glowDot(C.hegHi);c.drawImage(g.cv,D.slit[0]-5,D.slit[1]-3,10,6);}
      if(D.scanner){const flick=tg?Math.sin(view.now/47)>0:true;if(flick){c.globalAlpha=0.8;c.drawImage(glowDot(C.hegHi).cv,D.scanner[0]-3.4,D.scanner[1]-3.4,6.8,6.8);}}
      if(D.searchlight&&tg&&Math.sin(view.now/63)>0.3){c.globalAlpha=0.9;c.drawImage(glowDot('#fff3c8').cv,D.searchlight[0]-3,D.searchlight[1]-3,6,6);}
      c.globalCompositeOperation='source-over';c.globalAlpha=1;
      // cockpit critical: the cracked canopy, drawn over the glass
      if(D.canopy&&s.crits&&s.crits.indexOf('cockpit')>=0){const[cx0,cy0,rx]=D.canopy;c.strokeStyle='rgba(255,255,255,0.85)';c.lineWidth=0.8;c.beginPath();c.moveTo(cx0-rx*0.6,cy0-1);c.lineTo(cx0,cy0);c.lineTo(cx0+rx*0.5,cy0-1.4);c.moveTo(cx0,cy0);c.lineTo(cx0+rx*0.2,cy0+1.6);c.stroke();}
      c.restore();}
    // wing leader: a small cream chevron off the port bow (the command layer stays gold)
    if(s.lead&&lod>0){c.save();c.translate(s.x,s.y);c.font='800 '+(11/z)+'px "Exo 2",sans-serif';c.textAlign='center';c.lineWidth=3/z;c.strokeStyle=C.ink;c.strokeText('★',0,-sc*30);c.fillStyle='#f4f0e6';c.fillText('★',0,-sc*30);c.restore();}
    // pinned: a pulsing hazard ring (steady under reduced motion)
    if(s.pinned){const pr=sc*36*(view.reduced?1:1+0.1*Math.sin(view.now/140));drawSpr(c,inkRing(C.hazard),s.x,s.y,pr,view.reduced?0.8:0.6+0.35*Math.sin(view.now/140),0);}
    // --- the hurt read (game time: freezes on pause). hullFrac is the truth when the view carries it:
    //     ≤ trailSmokeAt (25%) the ship STREAMS a smoke trail — puffs dropped in its wake that hang and grow,
    //     a ribbon you read at any zoom; ≤ trailFireAt (10%) it BURNS: fire licks the hull, embers, black smoke.
    //     Stage 2/3 is the fallback for callers without hullFrac (the old subtle puffs were weakness-level read).
    const stg=s.damageStage|0,hf=s.hullFrac;
    const smoking=hf!=null?hf<=TUNE.trailSmokeAt:stg>=2,burning=hf!=null?hf<=TUNE.trailFireAt:stg>=3;
    if(burning){   // fire on the hull itself, every frame: one flickering additive lobe amidships (cheap, loud)
      const fl=0.75+0.25*Math.sin(view.now/47+a.seed*9);
      drawSpr(c,puff(FIRE[1],0),s.x-Math.cos(vh)*sc*6,s.y-Math.sin(vh)*sc*6,sc*7*fl,0.85,1);
      drawSpr(c,puff('#fff3b0',0),s.x-Math.cos(vh)*sc*4,s.y-Math.sin(vh)*sc*4,sc*3.6*fl,0.9,1);
    }
    if(smoking&&GT>a.smokeT){
      a.smokeT=GT+1/(TUNE.trailSmokeRate*(lod===0?0.5:1));
      const bx=s.x-Math.cos(vh)*sc*16+rs(-4,4),by=s.y-Math.sin(vh)*sc*16+rs(-4,4);
      // trail smoke: dropped in the wake with almost no velocity, so it hangs as a ribbon behind the flight path
      emit(puff(burning?'#3a3a42':'#7a7a82',1),bx,by,rs(-8,8),rs(-8,8),rs(1.3,2),sc*4,sc*13,{drag:0.4,pr:1,al:burning?0.9:0.75});
      if(burning){emit(puff(FIRE[1+(R()<0.5?0:1)],1),bx,by,rs(-14,14),rs(-14,14),rs(0.3,0.5),sc*4,sc*1.6,{pr:1});
        emit(glowDot('#ffb347'),bx,by,-Math.cos(vh)*rs(20,70)+rs(-30,30),-Math.sin(vh)*rs(20,70)+rs(-30,30),rs(0.4,0.9),3.5,1,{add:1,pr:0});}
    }
    if(s.crits&&s.crits.indexOf('feed')>=0&&GT>a.feedT){a.feedT=GT+rs(0.5,1.3);const m=(D.mounts&&D.mounts.primary&&D.mounts.primary[0])||[8,0];
      const mx=s.x+(Math.cos(h)*m[0]-Math.sin(h)*m[1])*sc,my=s.y+(Math.sin(h)*m[0]+Math.cos(h)*m[1])*sc;
      for(let i=0;i<3;i++)emit(sparkBit('#ffd866'),mx,my,rs(-60,60),rs(-60,60),0.3,4,2,{add:1,rot:R()*TAU,pr:0});}
    if(s.crits&&s.crits.indexOf('emitter')>=0&&GT>a.crackT){a.crackT=GT+rs(0.4,1);emit(shard(C.shield),s.x+rs(-1,1)*sc*20,s.y+rs(-1,1)*sc*20,rs(-30,30),rs(-30,30),0.35,5,2,{add:1,spin:6,pr:0});}
  }

  /* =================================================================
     TRAILS — the motion ribbon behind each ship, tinted by its engine,
     denser with speed, fading over trailSecs. Replaces drawTrail.
     ================================================================= */
  function drawTrail(c,s,view){
    const tr=s.trail;if(!tr||tr.length<2)return;
    const col=engColOf(s),z=view.z,al=0.14+0.3*(s.speedFrac==null?0.6:s.speedFrac);
    c.save();c.lineCap='round';
    c.strokeStyle=rgba(col,al*0.35);c.lineWidth=4/z;c.beginPath();
    for(let i=0;i<tr.length;i++){const q=tr[i];i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);}c.lineTo(s.x,s.y);c.stroke();
    c.strokeStyle=rgba('#fffbe6',al);c.lineWidth=1.8/z;c.stroke();
    c.restore();
  }

  /* =================================================================
     BOLTS AND MISSILES — called per object by the renderer.
     ================================================================= */
  function drawBolt(c,p,view){
    const P=SA.PROJ[p.style],st=(P&&SA.STYLE[P.style])||SA.STYLE[p.faction==='reb'?'bhord':'autocom'],core=st[0],glow=st[1];
    const ra=view.ra==null?1:view.ra,dt=view.tick==null?0.05:view.tick;
    const x=p.x-p.vx*(1-ra)*dt,y=p.y-p.vy*(1-ra)*dt,sp=Math.hypot(p.vx,p.vy)||1;
    const born=Math.max(0,(x-p.x0)*(p.vx/sp)+(y-p.y0)*(p.vy/sp));
    const fade=p.life?clamp((p.life-p.age)/0.12,0,1):1;
    if(P&&P.type==='slaser'){   // a laser: a coherent beam-dart — hard edges, a white filament, no tracer taper
      const BL=Math.min(P.len||TUNE.laserLen,born),hx=x-p.vx/sp*BL,hy=y-p.vy/sp*BL;
      c.lineCap='butt';
      c.globalAlpha=0.3*fade;c.strokeStyle=glow;c.lineWidth=Math.max(7,4.5/view.z);
      c.beginPath();c.moveTo(hx,hy);c.lineTo(x,y);c.stroke();
      c.globalAlpha=0.85*fade;c.lineWidth=Math.max(2.6,1.6/view.z);c.stroke();
      c.globalAlpha=fade;c.strokeStyle='#ffffff';c.lineWidth=Math.max(1,0.7/view.z);c.stroke();
      if(view.lod>1)drawSpr(c,flare(glow),x,y,Math.max(7,5/view.z),0.9*fade,1,Math.atan2(p.vy,p.vx)+Math.PI/4);
      c.globalAlpha=1;return;
    }
    const L=Math.min(26,born),tx=x-p.vx/sp*L,ty=y-p.vy/sp*L;
    c.globalAlpha=0.4*fade;c.lineCap='round';c.strokeStyle=glow;c.lineWidth=Math.max(TUNE.boltGlow,3/view.z);
    c.beginPath();c.moveTo(tx,ty);c.lineTo(x,y);c.stroke();
    c.globalAlpha=fade;c.strokeStyle=core;c.lineWidth=Math.max(TUNE.boltCore,1.2/view.z);c.stroke();
    if(view.lod>1)drawSpr(c,glowDot(glow),x,y,Math.max(6,4/view.z),0.9*fade,0);   // the hot cap only up close
    c.globalAlpha=1;
  }
  const MAUX=new WeakMap();
  function drawMissile(c,m,view){
    const col=m.faction==='reb'?C.psi:C.hazard;
    let a=MAUX.get(m);if(!a){a={t:GT,px:m.x,py:m.y};MAUX.set(m,a);}
    const ra=view.ra==null?1:view.ra,x=m.px!=null?m.px+(m.x-m.px)*ra:m.x,y=m.py!=null?m.py+(m.y-m.py)*ra:m.y;
    // tracking smoke, from the pool: the best particles we spend (brief §6.2)
    while(GT-a.t>TUNE.missileSmoke){a.t+=TUNE.missileSmoke;
      const u=clamp((GT-a.t)/0.1,0,1),sx=lerp(x,a.px,u),sy=lerp(y,a.py,u);
      emit(puff('#9aa0b4',0),sx-Math.cos(m.h)*10,sy-Math.sin(m.h)*10,rs(-8,8),rs(-8,8),rs(0.8,1.4),3.5,10,{drag:0.8,pr:1,al:0.55});
      if(R()<0.3)emit(glowDot(col),sx,sy,rs(-10,10),rs(-10,10),0.2,5,2,{add:1,pr:0});
    }
    a.px=x;a.py=y;
    const wob=Math.sin(view.t*40)*TUNE.missileWobble*(view.reduced?0:1);
    const wx=x+Math.cos(m.h+Math.PI/2)*wob,wy=y+Math.sin(m.h+Math.PI/2)*wob;
    drawSpr(c,glowDot(col),wx-Math.cos(m.h)*10,wy-Math.sin(m.h)*10,10,0.95,1);   // the motor
    const mz=Math.max(1,0.6/view.z);
    c.save();c.translate(wx,wy);c.rotate(m.h);c.scale(mz,mz);
    c.beginPath();c.moveTo(11,0);c.lineTo(-7,-4);c.lineTo(-4,0);c.lineTo(-7,4);c.closePath();
    c.fillStyle=col;c.fill();c.lineWidth=1.6;c.strokeStyle=C.ink;c.stroke();
    c.fillStyle='#fffbe6';c.fillRect(2,-1,5,2);
    c.restore();
  }

  /* =================================================================
     CHAFF — a cloud per sim entry: hot flares and silver glints,
     deterministic from the cloud's id, twinkling on real time.
     ================================================================= */
  function drawChaffCloud(c,f,view){
    const dur=Math.max(0.1,f.until-f.t0),k=clamp((view.t-f.t0)/dur,0,1),r=40+170*ease.outCubic(k);
    let sd=(f.id*2654435761)>>>0||1;const rr2=()=>{sd^=sd<<13;sd>>>=0;sd^=sd>>>17;sd^=sd<<5;sd>>>=0;return sd/4294967296;};
    c.globalCompositeOperation='lighter';
    for(let i=0;i<TUNE.chaffFlares;i++){const a=rr2()*TAU,d=r*Math.sqrt(rr2()),tw=0.5+0.5*Math.sin(view.now/90+i*2.1);
      const g=glowDot(i%3?C.hazard:'#fffbe6');c.globalAlpha=(1-k)*tw;const sz=9+rr2()*7;c.drawImage(g.cv,f.x+Math.cos(a)*d-sz,f.y+Math.sin(a)*d-sz,2*sz,2*sz);}
    c.globalCompositeOperation='source-over';
    if(view.lod>0){const gl=glint();for(let i=0;i<TUNE.chaffGlints;i++){const a=rr2()*TAU,d=r*Math.sqrt(rr2()),tw=Math.sin(view.now/70+i*3.3)>0.3;
      if(!tw)continue;c.globalAlpha=(1-k)*0.9;const sz=(2+rr2()*2.5)/Math.max(view.z,0.15)*0.6+2;c.drawImage(gl.cv,f.x+Math.cos(a)*d-sz,f.y+Math.sin(a)*d-sz,2*sz,2*sz);}}
    c.globalAlpha=1;
  }

  /* =================================================================
     STATIONS — cached SR_ART.station bakes plus live layers: the dome
     pulse, damage fires, the relay's jam link to the jump point, and
     boarding clamps. A station's view object (built by the renderer):
     {id, art:'relay'|'lastlight'|'reactor', x, y, h, size,
      hullFrac, damageStage 0..3, dark, ours, boardProg, jam:{x,y}|null}
     ================================================================= */
  const STSPR=new Map();const stAux=new Map();
  function stationSprite(art,px,h,stage,dark,ours){
    const pb=Math.exp(Math.round(Math.log(px)/SCALE_B)*SCALE_B);
    const key=art+'|'+pb.toFixed(3)+'|'+h.toFixed(2)+'|'+stage+'|'+(dark?1:0)+(ours?1:0);
    let sp=STSPR.get(key);
    if(!sp){const half=Math.ceil(pb*44)+2,cv=document.createElement('canvas');cv.width=cv.height=half*2;
      SA.station(cv.getContext('2d'),art,half,half,h,pb,0,{damage:DMG_OF[stage]||0,dark,ours,still:true});
      sp={cv,half,pb};if(STSPR.size>60)STSPR.delete(STSPR.keys().next().value);STSPR.set(key,sp);}
    return sp;
  }
  function station(c,st,view){
    const D=SA.STATIONS[st.art];if(!D)return;
    const sc=artScale({size:st.size||12,iconBoost:st.iconBoost||1}),px=sc*view.z*view.dpr;
    const stage=st.damageStage!=null?st.damageStage|0:st.hullFrac!=null?(st.hullFrac>0.7?0:st.hullFrac>0.45?1:st.hullFrac>0.2?2:3):0;
    if(st.jam&&!st.dark)drawJamLink(c,st,sc,view);   // under its own hull; faint, so crossing a ship earlier in the loop is fine
    const sp=stationSprite(st.art,px,st.h||0,clamp(stage,0,3),!!st.dark,!!st.ours),k=(px/sp.pb)/(view.z*view.dpr);
    c.save();c.translate(st.x,st.y);c.scale(k,k);c.drawImage(sp.cv,-sp.half,-sp.half);c.restore();
    // live layers
    let a=stAux.get(st.id||st.art);if(!a){a={smokeT:0};stAux.set(st.id||st.art,a);}
    if(!st.dark){const dome=D.parts.find(p=>p.dome);
      if(dome&&view.lod>0){const pul=0.5+0.5*Math.sin(view.now/(dome.core?520:380));
        drawSpr(c,glowDot(dome.glow||C.hegHi),st.x+dome.dome[0]*sc,st.y+dome.dome[1]*sc,sc*dome.dome[2]*1.5*pul+sc*3,0.4*pul+0.2,1);}}
    if(stage>=2&&GT>a.smokeT){a.smokeT=GT+1/((stage>=3?TUNE.smokeStage3:TUNE.smokeStage2));
      const bx=st.x+rs(-1,1)*sc*16,by=st.y+rs(-1,1)*sc*14;
      emit(puff('#7a7a82',1),bx,by,rs(-8,8),-rs(10,26),rs(1.4,2.2),sc*3,sc*10,{drag:0.6,pr:0,al:0.8});
      if(stage>=3)emit(puff(FIRE[2],1),bx,by,rs(-10,10),rs(-10,10),rs(0.3,0.5),sc*3,sc*1.4,{pr:1});}
  }
  /* the relay's jam: a pulse running the dashed link from its emitter to the jump point */
  function drawJamLink(c,st,sc,view){
    const D=SA.STATIONS[st.art],h=st.h||0;
    const em=D&&D.emitter?{x:st.x+(Math.cos(h)*D.emitter[0]-Math.sin(h)*D.emitter[1])*sc,y:st.y+(Math.sin(h)*D.emitter[0]+Math.cos(h)*D.emitter[1])*sc}:st;
    c.save();c.globalAlpha=0.35;c.setLineDash([10/view.z,16/view.z]);c.lineWidth=2/view.z;c.strokeStyle=C.hazard;
    c.beginPath();c.moveTo(em.x,em.y);c.lineTo(st.jam.x,st.jam.y);c.stroke();c.setLineDash([]);c.restore();
    for(let i=0;i<2;i++){const u=((view.t*0.22)+i*0.5)%1;
      drawSpr(c,glowDot(C.hazard),lerp(em.x,st.jam.x,u),lerp(em.y,st.jam.y,u),26*(1-u*0.4),(1-u)*0.5,1);}
    if(view.lod>0)drawSpr(c,softRing(C.hazard),em.x,em.y,22+14*((view.t*0.8)%1),0.5*(1-(view.t*0.8)%1),1);
  }
  /* boarding: docking clamps and marines crossing, between the marine Graf and the station */
  function drawBoardLink(c,a,b,prog,view){
    const ang=Math.atan2(b.y-a.y,b.x-a.x);
    c.save();c.lineCap='round';
    c.strokeStyle=rgba(C.steel,0.9);c.lineWidth=5/view.z;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    c.strokeStyle=rgba(C.ink,0.6);c.lineWidth=1.6/view.z;c.stroke();
    c.restore();
    for(let i=0;i<3;i++){const u=((view.t*0.35)+i/3)%1;if(u>prog+0.15)continue;
      drawSpr(c,glowDot(C.rebelHi),lerp(a.x,b.x,u),lerp(a.y,b.y,u),8,0.9,1);}
    const px=lerp(a.x,b.x,0.5),py=lerp(a.y,b.y,0.5);
    c.save();c.translate(px,py-18/view.z);
    c.font='800 '+(11/view.z)+'px "Exo 2",sans-serif';c.textAlign='center';
    c.lineWidth=3.5/view.z;c.strokeStyle=C.ink;const txt='BOARDING '+Math.round(prog*100)+'%';
    c.strokeText(txt,0,0);c.fillStyle=C.rebelHi;c.fillText(txt,0,0);c.restore();
  }

  /* =================================================================
     THE BACKDROP — the void, a whisper of nebula, two star layers
     (one with parallax, for depth), dust motes up close, and the map
     border. Quiet: the fight carries the colour. Needs view.mapW,
     view.mapH, view.margin.
     ================================================================= */
  const STAR_TW=8400,STAR_TH=6000,STAR_N=1680;
  const starBands=[[],[],[],[]];const farStars=[];let nebCv=null;
  function buildBackdrop(){
    for(const b of starBands)b.length=0;farStars.length=0;
    const r=U.mkRng(99);
    for(let i=0;i<STAR_N;i++){const st={x:r()*STAR_TW,y:r()*STAR_TH,r:0.7+r()*1.1};starBands[Math.floor(r()*4)].push(st);}
    const r2=U.mkRng(41);
    for(let i=0;i<420;i++)farStars.push({x:r2()*STAR_TW,y:r2()*STAR_TH,r:0.5+r2()*0.7});
    nebCv=document.createElement('canvas');nebCv.width=512;nebCv.height=384;
    const g=nebCv.getContext('2d'),rn=U.mkRng(7);
    for(let i=0;i<5;i++){const rr2=60+rn()*80,x=rr2+30+rn()*(452-2*rr2),y=rr2+20+rn()*(344-2*rr2);
      const gr=g.createRadialGradient(x,y,0,x,y,rr2);
      const col=i%2?'#1b1240':'#16224a';
      gr.addColorStop(0,rgba(col,0.9));gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.fillRect(x-rr2,y-rr2,rr2*2,rr2*2);}
  }
  function tileStars(c,list,x0,y0,x1,y1,W,H,budget,fn){
    const i0=Math.floor(x0/STAR_TW),i1=Math.floor(x1/STAR_TW),j0=Math.floor(y0/STAR_TH),j1=Math.floor(y1/STAR_TH);
    const m=Math.max(1,Math.ceil((i1-i0+1)*(j1-j0+1)*list.length/budget));
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const ox=i*STAR_TW,oy=j*STAR_TH;
      for(let n=0;n<list.length;n+=m){const st=list[n],x=st.x+ox,y=st.y+oy;if(x<x0||x>x1||y<y0||y>y1)continue;fn(x,y,st);}}
  }
  function backdrop(c,view){
    if(!nebCv)buildBackdrop();
    const W=view.mapW,H=view.mapH,z=view.z;
    c.fillStyle=C.void;c.fillRect(0,0,W,H);
    // the nebula, far behind (parallax 0.3), barely there
    const npx=view.cx*0.7,npy=view.cy*0.7;   // drawn offset so it slides slower than the world
    c.globalAlpha=TUNE.nebulaAlpha;
    c.drawImage(nebCv,npx-W*0.35,npy-H*0.3,W*1.1,H*1.05);
    c.globalAlpha=1;
    const hw=view.W/2/z+8,hh=view.H/2/z+8;
    // far stars: parallax starFar, square motes, faint
    const fp=TUNE.starFar,fox=view.cx*(1-fp),foy=view.cy*(1-fp);
    c.fillStyle='#aeb8e6';c.globalAlpha=0.3;c.beginPath();
    tileStars(c,farStars,view.cx-hw-fox,view.cy-hh-foy,view.cx+hw-fox,view.cy+hh-foy,W,H,2200,(x,y,st)=>{const r=st.r/Math.max(z,0.35);c.rect(x+fox-r,y+foy-r,2*r,2*r);});
    c.fill();c.globalAlpha=1;
    // the near field: four brightness bands, locked to the world (as today)
    c.fillStyle='#dfe6ff';
    const x0=Math.max(0,view.cx-hw),x1=Math.min(W,view.cx+hw),y0=Math.max(0,view.cy-hh),y1=Math.min(H,view.cy+hh);
    for(let b=0;b<4;b++){c.globalAlpha=0.3+0.13*b;c.beginPath();
      tileStars(c,starBands[b],x0,y0,x1,y1,W,H,6000,(x,y,st)=>{const r=st.r/Math.max(z,0.35);c.rect(x-r,y-r,2*r,2*r);});c.fill();}
    c.globalAlpha=1;
    // the map border, as before
    c.strokeStyle=rgba(C.seam,0.9);c.lineWidth=3/z;c.setLineDash([16/z,12/z]);
    c.strokeRect(view.margin,view.margin,W-2*view.margin,H-2*view.margin);c.setLineDash([]);
  }

  /* =================================================================
     ROCKS — cel asteroids, baked once each (their shape never changes):
     base tone, dark facets, a lit face toward the screen's top left,
     craters, ink edge. Quiet by design.
     ================================================================= */
  const ROCKCV=new WeakMap();   // keyed on the rock's verts array (stable in the sim), not the wrapper object
  function rock(c,r,view){
    let sp=ROCKCV.get(r.verts);
    if(!sp){const px=2,half=Math.ceil(r.r*1.15*px)+4,cv=document.createElement('canvas');cv.width=cv.height=half*2;
      const g=cv.getContext('2d');g.translate(half,half);g.scale(px,px);g.rotate(r.rot||0);
      const n=r.verts.length,P=[];for(let i=0;i<n;i++){const a=i/n*TAU,rr2=r.r*r.verts[i];P.push([Math.cos(a)*rr2,Math.sin(a)*rr2]);}
      const path=()=>{g.beginPath();P.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();};
      const B=SA.BIOME.rock;
      path();g.fillStyle=shade(B.boulder,-0.25);g.fill();
      g.save();path();g.clip();
      path();g.translate(-r.r*0.16,-r.r*0.16);path();g.fillStyle=B.boulder;g.fill();
      g.translate(-r.r*0.1,-r.r*0.1);path();g.fillStyle=B.boulderHi;g.globalAlpha=0.5;g.fill();g.globalAlpha=1;
      g.setTransform(px,0,0,px,half,half);g.rotate(r.rot||0);
      const rn=U.mkRng((r.x*7+r.y*13)|0);
      g.fillStyle='rgba(8,10,20,0.4)';
      for(let i=0;i<3;i++){const a=rn()*TAU,d=r.r*0.55*Math.sqrt(rn());g.beginPath();g.ellipse(Math.cos(a)*d,Math.sin(a)*d,r.r*(0.08+rn()*0.1),r.r*(0.06+rn()*0.07),rn()*3,0,TAU);g.fill();}
      g.restore();
      path();g.lineWidth=3;g.lineJoin='round';g.strokeStyle=C.ink;g.stroke();
      sp={cv,half,px};ROCKCV.set(r.verts,sp);}
    c.drawImage(sp.cv,r.x-sp.half/sp.px,r.y-sp.half/sp.px,sp.cv.width/sp.px,sp.cv.height/sp.px);
  }

  /* =================================================================
     STATUS BADGES — the 12 glyphs, filled and chunky (the brief's ask:
     real art, not stroke placeholders). badge(ctx, key, x, y, r, k):
     k is the 0..1 pop. Screen space; colour tones match arena-hc's.
     ================================================================= */
  const BTONE={shields:'shield',lockin:'psi',boost:'gold',drift:'gold',kturn:'gold',barrel:'gold',fieldrep:'go',missile:'psi',evade:'hazard',chaff:'goldHi',dodge:'hazard',breakoff:'text'};
  const BDRAW={
    shields(g){g.beginPath();g.moveTo(0,-8);g.lineTo(7,-5);g.lineTo(7,1);g.quadraticCurveTo(7,7,0,9);g.quadraticCurveTo(-7,7,-7,1);g.lineTo(-7,-5);g.closePath();g.fill();gcut(g,()=>{g.beginPath();g.moveTo(0,-4);g.lineTo(0,5);g.moveTo(-3.5,0.5);g.lineTo(3.5,0.5);g.stroke();});},
    lockin(g){g.beginPath();g.arc(0,0,7.5,0,TAU);g.lineWidth=3;g.stroke();g.beginPath();g.arc(0,0,2.6,0,TAU);g.fill();},
    boost(g){g.beginPath();g.moveTo(-7,-7);g.lineTo(-1,0);g.lineTo(-7,7);g.lineTo(-4.4,7);g.lineTo(1.6,0);g.lineTo(-4.4,-7);g.closePath();g.fill();g.beginPath();g.moveTo(1,-7);g.lineTo(7,0);g.lineTo(1,7);g.lineTo(3.6,7);g.lineTo(9.6,0);g.lineTo(3.6,-7);g.closePath();g.fill();},
    drift(g){g.lineWidth=3;g.beginPath();g.moveTo(-7,7);g.quadraticCurveTo(-5,-5,7,-6);g.stroke();g.beginPath();g.moveTo(3,-9);g.lineTo(8.5,-6);g.lineTo(3,-3);g.closePath();g.fill();},
    kturn(g){g.lineWidth=3;g.beginPath();g.moveTo(-5,8);g.lineTo(-5,-2);g.arc(0,-2,5,Math.PI,0);g.lineTo(5,2);g.stroke();g.beginPath();g.moveTo(1.5,1);g.lineTo(8.5,1);g.lineTo(5,6.5);g.closePath();g.fill();},
    barrel(g){g.lineWidth=3;g.beginPath();g.ellipse(0,0,7.5,5,0,0.6,TAU-0.6);g.stroke();g.beginPath();g.moveTo(7.8,-4.4);g.lineTo(8.6,1.4);g.lineTo(3.4,-1);g.closePath();g.fill();},
    fieldrep(g){g.save();g.rotate(0.7);g.beginPath();g.rect(-2,-9,4,12);g.fill();g.beginPath();g.arc(0,5,4.4,0.5,Math.PI-0.5,true);g.lineWidth=3.4;g.stroke();g.restore();},
    missile(g){g.save();g.rotate(-Math.PI/4);g.beginPath();g.moveTo(8,0);g.lineTo(-4,-3.4);g.lineTo(-2,0);g.lineTo(-4,3.4);g.closePath();g.fill();g.beginPath();g.moveTo(-5,0);g.lineTo(-9,0);g.lineWidth=2.4;g.stroke();g.restore();},
    evade(g){g.lineWidth=3;g.beginPath();g.moveTo(-6,7);g.quadraticCurveTo(0,4,0,-1);g.quadraticCurveTo(0,-6,6,-7);g.stroke();g.beginPath();g.moveTo(2.4,-9.6);g.lineTo(8.6,-7.2);g.lineTo(3.4,-3.4);g.closePath();g.fill();},
    chaff(g){for(const[x,y]of[[-5,-5],[2,-7],[6,-2],[-7,1],[0,0],[5,4],[-3,6],[2,8]]){g.save();g.translate(x,y);g.rotate((x*y)%3);g.fillRect(-1.8,-0.9,3.6,1.8);g.restore();}},
    dodge(g){g.lineWidth=3;g.beginPath();g.moveTo(-8,6);g.lineTo(6,-8);g.stroke();g.beginPath();g.moveTo(-8,-7);g.lineTo(-3.4,-2.4);g.moveTo(2.4,3.4);g.lineTo(7,8);g.lineWidth=2.4;g.stroke();},
    breakoff(g){g.lineWidth=3;g.beginPath();g.moveTo(-8,6);g.lineTo(-2,0);g.lineTo(2,4);g.lineTo(8,-5);g.stroke();g.beginPath();g.moveTo(4,-8);g.lineTo(9.5,-8);g.lineTo(9.5,-2.5);g.closePath();g.fill();},
  };
  function gcut(g,fn){g.save();g.globalCompositeOperation='destination-out';g.lineWidth=2.2;g.lineCap='round';fn();g.restore();}
  function badge(c,key,x,y,r,k){
    const tone=BTONE[key]||'text',col=tone==='text'?C.text:C[tone]||C.text;
    const pop=ease.outBack(clamp(k,0,1));
    c.save();c.translate(x,y);c.scale(pop,pop);
    c.beginPath();c.arc(0,1.6,r,0,TAU);c.fillStyle=C.ink;c.fill();
    c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=C.night||'#10132e';c.fill();c.lineWidth=2;c.strokeStyle=col;c.stroke();
    c.fillStyle=col;c.strokeStyle=col;c.lineCap='round';c.lineJoin='round';
    c.save();c.scale(r/13,r/13);(BDRAW[key]||BDRAW.evade)(c);c.restore();
    c.restore();
  }

  /* =================================================================
     LOCK MARKS — the one read that must be instant with a dozen ships
     locking at once, so the design is binary at a glance:
       acquiring  two THIN ARCS, slowly rotating, closing onto the ring
                  — rotating = not yet, always
       locked     they SNAP to four short corner ticks and a solid
                  diamond, dead still and brighter — still = locked
     plus one small pop ring at the instant of the flip. Gold for the
     player's locks (command colour), hazard for a lock on the player.
     lockMark(ctx, x, y, r, k, {locked, hostile, flipAge, alpha}, view)
       r the ring radius (world units), k the 0..1 progress while
       acquiring, flipAge seconds since the lock completed (the pop).
     ================================================================= */
  function lockMark(c,x,y,r,k,o,view){
    o=o||{};const col=o.hostile?C.hazard:C.gold,z=view.z,al=o.alpha==null?1:o.alpha;
    c.save();c.translate(x,y);
    if(!o.locked){
      const R2=r*(1+0.55*(1-clamp(k,0,1))),rot=view.reduced?0:(view.now/1400)%TAU;
      c.rotate(rot);c.globalAlpha=0.55*al;c.strokeStyle=col;c.lineWidth=1.6/z;c.lineCap='butt';
      for(const a0 of[0,Math.PI]){c.beginPath();c.arc(0,0,R2,a0-0.6,a0+0.6);c.stroke();}
    } else {
      c.globalAlpha=0.95*al;c.strokeStyle=col;c.lineWidth=2.2/z;c.lineCap='square';
      const L=r*0.3;
      for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.beginPath();c.moveTo(r,r-L);c.lineTo(r,r);c.lineTo(r-L,r);c.stroke();}
      c.beginPath();c.moveTo(0,-r-7/z);c.lineTo(4.5/z,-r-14/z);c.lineTo(0,-r-21/z);c.lineTo(-4.5/z,-r-14/z);c.closePath();
      c.fillStyle=col;c.fill();c.lineWidth=1.4/z;c.strokeStyle=C.ink;c.stroke();
      if(o.flipAge!=null&&o.flipAge<0.3){const kk=o.flipAge/0.3;
        c.globalAlpha=(1-kk)*0.8*al;c.lineWidth=2/z;c.strokeStyle=col;c.beginPath();c.arc(0,0,r*(1+0.5*kk),0,TAU);c.stroke();}
    }
    c.restore();c.globalAlpha=1;
  }

  /* =================================================================
     EVENTS — one-shots the renderer sends (the §9 list). Everything
     spends from the pool and the one-shot list; nothing reads the sim.
     ================================================================= */
  function cutChunks(art,livery,size,stage){
    // debris cut from the ship's own hull (brief §11 Q2): bake the body once, slice three wedges
    const px=3,half=Math.ceil(px*ART_R)+2,src=document.createElement('canvas');src.width=src.height=half*2;
    try{SA.ship(src.getContext('2d'),art,half,half,0,px,0,{livery,damage:DMG_OF[Math.min(3,stage+1)],still:true});}catch(e){return null;}
    const out=[];const cuts=[[-Math.PI,-Math.PI/3],[-Math.PI/3,Math.PI/3],[Math.PI/3,Math.PI]];
    for(let i=0;i<3;i++){const cv=document.createElement('canvas');cv.width=cv.height=half*2;const g=cv.getContext('2d');
      g.translate(half,half);g.beginPath();g.moveTo(0,0);g.arc(0,0,half,cuts[i][0],cuts[i][1]);g.closePath();g.clip();g.drawImage(src,-half,-half);
      out.push({cv,half,a:(cuts[i][0]+cuts[i][1])/2+rs(-0.4,0.4),r0:rs(0,TAU),spin:rs(-5,5)});}
    return out;
  }
  function fighterBoom(x,y,d,size,livery){
    const ib=d.iconBoost||1;   // the renderer's icon boost, so the debris matches the hulls it draws (arena-hc C-73)
    const chunks=d.art?cutChunks(d.art,livery,d.size,d.stage||1):null;
    const e=oneshot('boom',x,y,{size,seed:(R()*1e6)|0});
    if(chunks){e.chunks=chunks;e.chunkW=ART_R*artScale({size:d.size||4,iconBoost:ib})*0.6;}
    for(let i=0;i<TUNE.boomDebris;i++){const a=rs(0,TAU),v=rs(60,220);
      emit(puff('#5a5a62',1),x,y,Math.cos(a)*v,Math.sin(a)*v,rs(0.6,1.2),4,3,{spin:rs(-9,9),rot:a,drag:0.6,pr:0});}
    for(let i=0;i<10;i++)emit(glowDot('#ffb347'),x,y,rs(-240,240),rs(-240,240),rs(0.4,0.9),5,2,{add:1,drag:0.8,pr:1});
    emit(puff('#7a7a82',1),x,y,rs(-14,14),rs(-14,14),1.6,size*0.4,size*0.95,{pr:1,al:0.7});
    addShake(TUNE.shakeBoom,x,y);flashAt(x,y,0.5);
  }
  /* the death spiral: the corpse careens off on a wild, tightening curl (a path baked once at the kill, so pause
     and timescale replay it exactly), tumbling and streaming fire, then the real explosion fires where it ends.
     Visual only — the sim's kill, the SPLASH floater and the scoring all happened at the moment of death. */
  function deathSpiral(x,y,d,size,livery){
    const sc=artScale({size:d.size||4,iconBoost:d.iconBoost||1});
    let cv=null;try{   // the corpse's own bake: stage-3 scorch, powered down (a dead ship goes dark)
      const px=2.5,half=Math.ceil(px*ART_R)+2;cv=document.createElement('canvas');cv.width=cv.height=half*2;
      SA.ship(cv.getContext('2d'),d.art,half,half,0,px,0,{livery,damage:0.85,still:true,off:true});
    }catch(e){cv=null;}
    if(!cv){fighterBoom(x,y,d,size,livery);return;}
    const dur=Math.max(0.4,TUNE.spiralSecs),vh0=d.vh!=null?d.vh:d.h!=null?d.h:R()*TAU;
    const v0=Math.max(120,(d.speed||0)*0.7+140),curl=(R()<0.5?-1:1)*rs(1.2,2.6),N=32,path=new Array(N+1);
    let px2=x,py2=y,hd=vh0+rs(-0.3,0.3);
    for(let i=0;i<=N;i++){path[i]={x:px2,y:py2};const t=i/N*dur,st=dur/N,v=v0*(1-0.55*(i/N));
      hd+=curl*t*st*2.2;px2+=Math.cos(hd)*v*st;py2+=Math.sin(hd)*v*st;}
    const e=oneshot('spiral',x,y,{dur,path,cv,whalf:sc*ART_R,h0:d.h||vh0,spin:(curl<0?-1:1)*TUNE.spiralSpin,
      sc,size,emitN:0,boomD:{art:d.art,size:d.size,stage:d.stage},livery});
    for(let i=0;i<5;i++)emit(sparkBit('#ffd866'),x,y,rs(-160,160),rs(-160,160),rs(0.2,0.4),5,2,{add:1,rot:R()*TAU,drag:1.5,pr:1});
    addShake(TUNE.shakeBoom*0.5,x,y);
  }
  const spiralPos=(e,k)=>{const u=clamp(k,0,1)*(e.path.length-1),i=u|0,f=u-i,a=e.path[i],b=e.path[Math.min(i+1,e.path.length-1)];
    return {x:lerp(a.x,b.x,f),y:lerp(a.y,b.y,f)};};
  function event(kind,d){
    d=d||{};const x=d.x||0,y=d.y||0,ib=d.iconBoost||1;   // ib: the renderer's icon boost, so booms match the hulls it draws (arena-hc C-73)
    switch(kind){
      case 'muzzle':{const st=SA.STYLE[d.style]||SA.STYLE.bhord;
        oneshot('muzzle',x,y,{col:st[1],r:d.r||15,rot:d.h||0});
        for(let i=0;i<2;i++)emit(glowDot(st[1]),x,y,Math.cos(d.h||0)*rs(60,140)+rs(-40,40),Math.sin(d.h||0)*rs(60,140)+rs(-40,40),0.16,5,2,{add:1,pr:0});
        break;}
      case 'boltHit':{const st=SA.STYLE[d.style]||SA.STYLE.bhord;
        if(d.surface==='shield'){oneshot('hexsplash',x,y,{r:d.r||26});
          for(let i=0;i<TUNE.shardN;i++)emit(shard(C.shield),x,y,rs(-90,90),rs(-90,90),rs(0.3,0.5),5,2,{add:1,spin:rs(-8,8),rot:R()*TAU,pr:0});}
        else{const back=(d.dir||0)+Math.PI;
          for(let i=0;i<TUNE.sparkN;i++){const a=back+rs(-0.8,0.8),v=rs(90,260);
            emit(sparkBit(st[1]),x,y,Math.cos(a)*v,Math.sin(a)*v,rs(0.2,0.4),5,2,{add:1,rot:a,drag:2,pr:0});}
          emit(glowDot('#fffbe6'),x,y,0,0,0.12,10,4,{add:1,pr:1});
          emit(puff(d.surface==='hull'?'#8a8a92':'#b8c0cc',0),x,y,Math.cos(back)*30,Math.sin(back)*30,0.5,5,10,{pr:0,al:0.6});}
        break;}
      case 'missileLaunch':{const col=d.faction==='reb'?C.psi:C.hazard;
        oneshot('ignite',x,y,{size:22,col});
        for(let i=0;i<4;i++)emit(puff('#9aa0b4',0),x,y,rs(-40,40),rs(-40,40),rs(0.5,0.9),6,14,{drag:1.5,pr:0,al:0.7});
        break;}
      case 'missileHit':{oneshot('boomS',x,y,{size:(d.size||0.7)*60*ib,seed:(R()*1e6)|0});
        for(let i=0;i<6;i++)emit(glowDot('#ffb347'),x,y,rs(-180,180),rs(-180,180),rs(0.3,0.7),5,2,{add:1,drag:1,pr:1});
        emit(puff('#7a7a82',1),x,y,rs(-20,20),rs(-20,20),1.2,16,34,{pr:1,al:0.7});
        addShake(TUNE.shakeMissile,x,y);break;}
      case 'missileMiss':oneshot('boomS',x,y,{size:28*ib,seed:(R()*1e6)|0});break;
      case 'missileShaken':oneshot('shaken',x,y,{});break;
      case 'chaff':{for(let i=0;i<10;i++)emit(glowDot(i%3?C.hazard:'#fffbe6'),x,y,rs(-120,120),rs(-120,120),rs(0.3,0.6),7,3,{add:1,drag:1.4,pr:1});break;}
      case 'explode':{const size=(0.7+0.09*(d.size||4))*34*(d.struct?2.6:1)*ib;
        if(d.struct){oneshot('boomStation',x,y,{size,seed:(R()*1e6)|0});
          const art=d.art&&SA.STATIONS[d.art]?d.art:null;
          if(art){const px2=2.2,half=Math.ceil(px2*44)+2,cv=document.createElement('canvas');cv.width=cv.height=half*2;
            const g=cv.getContext('2d');SA.station(g,art,half,half,d.h||0,px2,0,{damage:1,dark:true,still:true});
            g.globalCompositeOperation='source-atop';g.fillStyle='rgba(10,8,8,0.72)';g.fillRect(0,0,half*2,half*2);
            const sc2=artScale({size:d.size||12,iconBoost:ib});
            oneshot('wreck',x,y,{cv,whalf:sc2*44,h:d.h||0});
          }
          for(let i=0;i<26;i++)emit(puff(i%3?'#8a8a92':'#5a5a62',1),x+rs(-size,size)*0.5,y+rs(-size,size)*0.4,rs(-70,70),rs(-90,-10),rs(1.5,3),8,26,{drag:0.5,pr:1,al:0.8});
          for(let i=0;i<22;i++)emit(glowDot('#ffb347'),x,y,rs(-260,260),rs(-260,260),rs(0.5,1.2),6,2,{add:1,drag:0.8,pr:1});
          addShake(TUNE.shakeStation,x,y);flashAt(x,y,1);}
        else{
          const livery=d.livery||(d.faction==='reb'?'rebel':'heg');
          const wantSpiral=d.spiral!=null?!!d.spiral:R()<TUNE.spiralChance;   // size above already carries ib
          if(wantSpiral&&d.art){deathSpiral(x,y,d,size,livery);}
          else fighterBoom(x,y,d,size,livery);}
        break;}
      case 'collide':{oneshot('crunch',x,y,{size:26*ib});
        for(let i=0;i<8;i++)emit(sparkBit('#ffd866'),x,y,rs(-200,200),rs(-200,200),rs(0.2,0.4),5,2,{add:1,rot:R()*TAU,drag:1.5,pr:1});
        for(let i=0;i<4;i++)emit(puff('#8a8a92',1),x,y,rs(-60,60),rs(-60,60),rs(0.5,0.9),5,11,{pr:0,al:0.7});
        addShake(TUNE.shakeCollide,x,y);break;}
      case 'rockHit':event('collide',d);break;
      case 'jumpOut':{const s=d.ship||d;const sc=artScale(s);
        let cv=null;try{cv=hullSprite(s.art,s.livery,sc*2,((Math.round((s.h||0)/TAU*ANG_B)%ANG_B)+ANG_B)%ANG_B,0).cv;}catch(e){}
        const e=oneshot('warpout',s.x,s.y,{faction:s.faction,vh:s.vh||s.h||0,size:sc*30});
        if(cv){e.cv=cv;e.whalf=sc*ART_R;}
        for(let i=0;i<5;i++)emit(glowDot(s.faction==='reb'?C.go:C.hegHi),s.x,s.y,rs(-60,60),rs(-60,60),0.4,6,2,{add:1,pr:1});
        break;}
      case 'warpIn':{const s=d.ship||d;const sc=artScale(s);
        oneshot('warpin',s.x,s.y,{faction:s.faction,vh:(s.vh||s.h||0),size:sc*30});
        for(let i=0;i<6;i++)emit(glowDot(s.faction==='reb'?C.go:C.heg),s.x,s.y,rs(-90,90),rs(-90,90),0.45,7,2,{add:1,pr:1});
        if(s.faction!=='reb')addShake(0.08,s.x,s.y);
        break;}
      case 'ability':{const s=d.ship||{},sc=artScale(s),col=engColOf(s.art?s:{art:'mote',livery:'heg'});
        if(d.key==='boost')oneshot('ignite',x,y,{size:sc*22,col});
        else if(d.key==='kturn')oneshot('kturn',x,y,{size:sc*24});
        else if(d.key==='barrel')for(let i=0;i<5;i++)emit(sparkBit('#fffbe6'),x,y,rs(-120,120),rs(-120,120),0.25,4,2,{add:1,rot:R()*TAU,pr:0});
        else if(d.key==='shields')oneshot('support',x,y,{size:sc*30});
        else if(d.key==='fieldrep'){oneshot('repair',x,y,{size:sc*26});
          for(let i=0;i<6;i++)emit(sparkBit(C.go),x+rs(-14,14)*sc*0.6,y+rs(-14,14)*sc*0.6,rs(-40,40),rs(-40,40),rs(0.3,0.6),4,1.5,{add:1,rot:R()*TAU,pr:0});}
        else if(d.key==='lockin')oneshot('steady',x,y,{size:sc*24});
        break;}
      case 'command':{
        if(d.key==='support')oneshot('support',x,y,{size:40});
        else if(d.key==='override')oneshot('override',x,y,{size:34});
        else if(d.key==='recall')oneshot('recall',x,y,{tx:d.tx==null?x:d.tx,ty:d.ty==null?y:d.ty});
        else if(d.key==='recon')oneshot('recon',0,0,{dir:d.edge||'E',x0:d.x0,x1:d.x1,y0:d.y0,y1:d.y1});
        else if(d.key==='decoy')oneshot('decoy',x,y,{});
        break;}
      case 'capture':if(d.done)oneshot('capture',x,y,{});break;
      case 'board':break;   // continuous: the renderer calls drawBoardLink while it runs
      case 'objective':oneshot('objpulse',x,y,{ok:!d.failed,size:70});break;
      case 'steady':oneshot('steady',x,y,{size:30});break;
      case 'lockFull':case 'lockWarn':break;   // the command layer owns locks (arena-hc drawLocks)
    }
  }
  /* the big-kill screen flash (reduced motion: off) */
  let flashT=-9,flashAmt=0;
  function flashAt(x,y,amt){flashT=NOW;flashAmt=amt;}
  function screenLayer(c,view){
    if(view.reduced||TUNE.screenFlash<=0)return;
    const k=(view.now-flashT)/180;
    if(k>=0&&k<1){c.globalAlpha=TUNE.screenFlash*flashAmt*(1-k);c.fillStyle='#fffbe6';c.fillRect(0,0,view.W,view.H);c.globalAlpha=1;}
  }

  /* =================================================================
     THE API
     ================================================================= */
  let msDraw=0,msUpd=0;
  function reset(){
    for(const p of POOL){p.on=0;p.cv=null;}pLive=0;OS.length=0;AUX.clear();stAux.clear();
    GT=0;SHK.trauma=0;shakePend.length=0;flashT=-9;
    if(!nebCv)buildBackdrop();
  }
  function update(dtGame,dtReal){
    const t0=performance.now();
    GT+=dtGame||0;NOW+=dtReal||0;LASTRDT=dtReal||16;
    SHK.update((dtReal||16)/1000);
    poolUpdate(dtGame||0);
    for(let i=OS.length-1;i>=0;i--){const e=OS[i];if(GT-e.t0>e.dur){OS.splice(i,1);
      if(e.kind==='spiral'){const p=spiralPos(e,1);fighterBoom(p.x,p.y,e.boomD,e.size,e.livery);}}}
    msUpd=msUpd*0.9+(performance.now()-t0)*0.1;
  }
  function drawLayer(c,layer,view){
    const t0=performance.now();
    view=normView(view);
    if(layer==='under'){osDraw(c,'under',view);}
    else if(layer==='over'){poolDraw(c,view);osDraw(c,'over',view);}
    else if(layer==='screen'){screenLayer(c,view);}
    msDraw=msDraw*0.9+(performance.now()-t0)*0.1;
  }
  function normView(v){
    if(v.lod==null)v.lod=v.z<TUNE.lodOut?0:v.z>=TUNE.lodIn?2:1;
    if(v.t==null)v.t=GT;if(v.now==null)v.now=NOW;
    return v;
  }
  function stats(){return {particles:pLive,oneshots:OS.length,spritesCached:HULLS.size+SPR.size+STSPR.size,msLastDraw:+msDraw.toFixed(2),msLastUpdate:+msUpd.toFixed(2)};}

  return {
    reset,update,event,
    drawLayer,backdrop:(c,v)=>backdrop(c,normView(v)),rock:(c,r,v)=>rock(c,r,normView(v)),
    shipBody:(c,s,v)=>shipBody(c,s,normView(v)),station:(c,s,v)=>station(c,s,normView(v)),
    drawBolt:(c,p,v)=>drawBolt(c,p,normView(v)),drawMissile:(c,m,v)=>drawMissile(c,m,normView(v)),
    drawTrail:(c,s,v)=>drawTrail(c,s,normView(v)),drawChaffCloud:(c,f,v)=>drawChaffCloud(c,f,normView(v)),
    drawBoardLink:(c,a,b,k,v)=>drawBoardLink(c,a,b,k,normView(v)),
    badge,lockMark:(c,x,y,r,k,o,v)=>lockMark(c,x,y,r,k,o,normView(v)),camShake:v=>camShake(normView(v)),
    setShake(v){shakeOn=!!v;},stats,
    TUNE,   // live tunables: a panel slider on any field works
    fn:{emit,oneshot,fireball,hullSprite,cutChunks,addShake,pool_:()=>POOL,os_:()=>OS},   // for the guide and tests
  };
})();
