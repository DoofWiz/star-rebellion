'use strict';
/* =====================================================================
   STAR REBELLION — title screen.
   Not a scene: a layer over everything that holds the game back until
   the player starts it. It opens on the developer's mark: a Graf hauler
   crosses the sky and its wake paints PERCHANG in behind it; the mark
   holds, fades, and then the game's logo lands. The logo is a rebel badge — flame crest, STAR,
   a red ribbon carrying REBELLION — that crashes down onto the screen
   like a stamp: shake, flash, shockwave, debris, then it sits there
   slightly crooked the way a stamp lands. #test and #deploy boot
   straight past it, and prefers-reduced-motion gets the settled frame.
   ===================================================================== */
window.SR_INTRO=(function(){
  const SA=window.SR_ART,CC=SA.C,U=SA.util;
  const RM=SR.hud.reduced;
  let el=null,cv=null,c2=null,W=0,H=0,dpr=1;
  let bg=null,badge=null,raf=0,t0=0,skipTo=0,ready=false,leaving=false,onStartCb=null;
  let stars=[],nextFly=0,fly=null,impactFired=false,impactAt=0,debris=[];
  let dev=null;   // the developer's mark (art/brand/perchang.webp); without it the badge lands straight away

  const STAMP_MS=380,SETTLE_MS=260,TILT=-0.045;
  const DEV_IN=350,DEV_FLY=2100,DEV_HOLD=900,DEV_OUT=600,DEV_GAP=250;   // the mark: fade up, the fly-past, hold, fade
  let STAMP_AT=600,READY_AT=1900;
  let markImg=null;   // loaded in time for the opening, or not used at all
  const timeline=()=>{dev=markImg;STAMP_AT=dev?DEV_IN+DEV_FLY+DEV_HOLD+DEV_OUT+DEV_GAP:600;READY_AT=STAMP_AT+1300;};

  /* the rebellion flag from the game's own icon set (i-revflame, 24x24) */
  const FLAG_POLE=new Path2D('M6 21.5V3.5');
  const FLAG=new Path2D('M6 4c2.6-.9 4.6.9 7.4 0l6-.6-3.1 2.9 4.1 1.6-4 1.6 2.6 3.1-5.6-.5C10.6 13 8.6 11.3 6 12.2Z');

  function size(){
    dpr=Math.min(2,window.devicePixelRatio||1);
    W=el.clientWidth;H=el.clientHeight;
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    buildBg();buildBadge();
  }
  /* the backdrop never changes: stars, a thin nebula, the planet rim — drawn once */
  function buildBg(){
    bg=document.createElement('canvas');
    bg.width=cv.width;bg.height=cv.height;
    const b=bg.getContext('2d');
    b.setTransform(dpr,0,0,dpr,0,0);
    b.fillStyle='#04060d';b.fillRect(0,0,W,H);
    const rn=U.mkRng(77);
    for(const [x,y,r,col] of [[W*0.2,H*0.25,W*0.5,'#1a1438'],[W*0.85,H*0.1,W*0.4,'#0e1a30']]){
      const g=b.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,U.rgba(col,0.5));g.addColorStop(1,U.rgba(col,0));
      b.fillStyle=g;b.fillRect(0,0,W,H);
    }
    stars=[];
    for(let i=0;i<190;i++){
      const s={x:rn()*W,y:rn()*H*0.86,r:0.5+rn()*1.3,a:0.25+rn()*0.6,ph:rn()*7,sp:0.4+rn()*1.2,
        col:rn()<0.08?CC.gold:rn()<0.16?CC.hegHi:'#e8ecf6'};
      stars.push(s);
      b.globalAlpha=s.a;b.fillStyle=s.col;
      b.beginPath();b.arc(s.x,s.y,s.r,0,7);b.fill();
    }
    b.globalAlpha=1;
    // the rock, seen from upstairs: a dusty rim along the bottom of the sky
    const R0=Math.max(380,W*0.55),py=H+R0*0.80;
    SA.planet(b,W/2,py,R0,'#b9865a',{tex:'dunes'});
    const g2=b.createRadialGradient(W/2,py,R0*0.94,W/2,py,R0*1.14);
    g2.addColorStop(0,U.rgba('#ffb347',0.18));g2.addColorStop(1,U.rgba('#ffb347',0));
    b.fillStyle=g2;b.fillRect(0,0,W,H);
  }
  /* fit a word into a width by shrinking its font */
  function fitFont(g,txt,px,maxW){
    g.font='400 '+px+'px Bungee, "Exo 2", sans-serif';
    const w=g.measureText(txt).width;
    if(w>maxW){px=Math.floor(px*maxW/w);g.font='400 '+px+'px Bungee, "Exo 2", sans-serif';}
    return px;
  }
  /* the badge itself, pre-rendered once: a stitched rebel patch with the ribbon through it */
  function buildBadge(){
    const Rb=Math.round(Math.max(120,Math.min(W*0.30,H*0.22,270)));
    const tail=Rb*0.34,rw=Rb*2.3,rh=Rb*0.5,ry=Rb*0.34;   // the ribbon runs wider than the disc
    const bw=Math.ceil(rw+tail*2+40),bh=Math.ceil(Rb*2+60);
    const oc=document.createElement('canvas');
    oc.width=Math.round(bw*dpr);oc.height=Math.round(bh*dpr);
    const g=oc.getContext('2d');
    g.setTransform(dpr,0,0,dpr,0,0);
    g.translate(bw/2,bh/2);
    g.lineJoin='round';g.lineCap='round';
    // disc: ink drop, cream rim, deep night field with its own few stars
    g.beginPath();g.arc(4,6,Rb,0,7);g.fillStyle=U.rgba(CC.ink,0.5);g.fill();
    g.beginPath();g.arc(0,0,Rb,0,7);g.fillStyle='#e8dfc8';g.fill();
    g.lineWidth=7;g.strokeStyle=CC.ink;g.stroke();
    g.beginPath();g.arc(0,0,Rb-13,0,7);g.fillStyle='#141b2c';g.fill();
    g.lineWidth=3;g.strokeStyle=U.rgba(CC.ink,0.8);g.stroke();
    // stitching on the rim
    g.save();g.strokeStyle=U.rgba('#141b2c',0.55);g.lineWidth=2.2;g.setLineDash([5,6]);
    g.beginPath();g.arc(0,0,Rb-6.5,0,7);g.stroke();g.restore();
    const rn=U.mkRng(9);
    g.save();g.beginPath();g.arc(0,0,Rb-14,0,7);g.clip();
    for(let i=0;i<34;i++){const a=0.25+rn()*0.5;g.globalAlpha=a;g.fillStyle=rn()<0.12?CC.gold:'#dfe6f4';
      g.beginPath();g.arc((rn()*2-1)*Rb*0.92,(rn()*2-1)*Rb*0.92,0.7+rn()*1.2,0,7);g.fill();}
    g.globalAlpha=1;
    // cel shade: the disc's lower-left falls into shadow
    g.beginPath();g.arc(0,0,Rb-13,0,7);
    g.beginPath();g.arc(0,0,Rb-13,0,7);g.arc(-Rb*0.16,-Rb*0.18,(Rb-13)*1.04,0,7);
    g.fillStyle=U.rgba(CC.ink,0.28);g.fill('evenodd');
    g.restore();
    // the flag flies at the crest
    const fs2=(Rb*0.62)/18;
    g.save();
    g.translate(-10*fs2,-Rb*0.88);
    g.scale(fs2,fs2);
    g.lineWidth=2.25;g.strokeStyle='#f4f0e6';g.stroke(FLAG_POLE);
    g.save();g.shadowColor=CC.rebel;g.shadowBlur=7;g.fillStyle=CC.rebel;g.fill(FLAG);g.restore();
    g.restore();
    // STAR, spaced wide between crest and ribbon
    {
      const px=fitFont(g,'STAR',Math.round(Rb*0.26),Rb*1.1);
      g.textAlign='center';g.textBaseline='alphabetic';
      const sp=px*0.42,ws=[...'STAR'].map(ch=>g.measureText(ch).width);
      const tw=ws.reduce((a,b)=>a+b,0)+sp*3;
      let x=-tw/2;
      for(let i=0;i<4;i++){
        g.lineWidth=Math.max(4,px*0.16);g.strokeStyle=CC.ink;
        g.strokeText('STAR'[i],x+ws[i]/2,-Rb*0.02);
        g.fillStyle='#f4f0e6';g.fillText('STAR'[i],x+ws[i]/2,-Rb*0.02);
        x+=ws[i]+sp;
      }
    }
    // the ribbon: notched tails first, then the band, then the word
    const notch=rh*0.42;
    for(const sx of [-1,1]){
      g.beginPath();
      g.moveTo(sx*(rw/2-6),ry-rh/2+6);
      g.lineTo(sx*(rw/2+tail),ry-rh/2+6);
      g.lineTo(sx*(rw/2+tail-notch),ry+6*0);
      g.lineTo(sx*(rw/2+tail),ry+rh/2-6);
      g.lineTo(sx*(rw/2-6),ry+rh/2-6);
      g.closePath();
      g.fillStyle=U.shade(CC.rebel,-0.32);g.fill();
      g.lineWidth=5;g.strokeStyle=CC.ink;g.stroke();
    }
    U.rr(g,-rw/2,ry-rh/2,rw,rh,8);
    g.fillStyle=CC.rebel;g.fill();
    g.save();
    U.rr(g,-rw/2,ry-rh/2,rw,rh,8);g.clip();
    g.fillStyle=U.shade(CC.rebel,-0.25);g.fillRect(-rw/2,ry+rh*0.22,rw,rh);
    g.restore();
    U.rr(g,-rw/2,ry-rh/2,rw,rh,8);
    g.lineWidth=6;g.strokeStyle=CC.ink;g.stroke();
    {
      const px=fitFont(g,'REBELLION',Math.round(rh*0.72),rw*0.92);
      g.textAlign='center';g.textBaseline='middle';
      g.lineWidth=Math.max(4,px*0.14);g.strokeStyle=CC.ink;
      g.strokeText('REBELLION',0,ry+rh*0.04);
      g.fillStyle='#f4f0e6';g.fillText('REBELLION',0,ry+rh*0.04);
    }
    // three small stars close the badge out
    for(const [sx,sy,sr] of [[-Rb*0.3,Rb*0.74,Rb*0.05],[0,Rb*0.80,Rb*0.065],[Rb*0.3,Rb*0.74,Rb*0.05]])
      SA.star(g,sx,sy,sr,'#e8dfc8');
    // a stamp never lands clean: worn flecks ground out of the paint
    g.globalCompositeOperation='destination-out';
    const rn2=U.mkRng(31);
    for(let i=0;i<46;i++){
      const a=rn2()*Math.PI*2,d=Rb*(0.55+rn2()*0.48);
      g.globalAlpha=0.25+rn2()*0.5;
      g.beginPath();g.arc(Math.cos(a)*d*(rw/2/Rb*0.8),Math.sin(a)*d*0.9,0.8+rn2()*2.0,0,7);g.fill();
    }
    g.globalCompositeOperation='source-over';g.globalAlpha=1;
    badge={cv:oc,w:bw,h:bh,Rb};
  }
  const clamp=k=>SR.util.clamp(k,0,1);
  const easeIO=k=>k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;

  /* the developer's mark: a Graf crosses the sky and its wake paints the word in behind it */
  function drawDev(t,now){
    if(!dev||t>=STAMP_AT)return;
    const lw=Math.min(W*0.7,640),lh=lw*dev.naturalHeight/dev.naturalWidth;
    const cx=W/2,cy=H*0.44,x0=cx-lw/2;
    const kf=clamp((t-DEV_IN)/DEV_FLY);
    const sx=-220+(W+440)*(0.15*kf+0.85*easeIO(kf));   // it comes in fast, eases over the word, and goes
    const sy=cy+lh*0.02+Math.sin(now/260)*1.5;
    const rx=sx-lh*0.45;                                 // the paint dries a little behind the engines
    const out=clamp((t-(DEV_IN+DEV_FLY+DEV_HOLD))/DEV_OUT);
    // the word, as far as the wake has reached
    if(rx>x0){
      c2.save();
      c2.beginPath();c2.rect(0,0,Math.max(0,rx),H);c2.clip();
      c2.globalAlpha=1-out;
      c2.translate(cx,cy);c2.scale(1+0.05*out,1+0.05*out);
      c2.drawImage(dev,-lw/2,-lh/2,lw,lh);
      c2.restore();
    }
    if(kf<=0||kf>=1)return;
    // the wake: a hot streak trailing the engines, brightest where the paint is going on
    c2.save();
    c2.globalCompositeOperation='lighter';
    const tl=Math.min(lw*0.55,360);
    const g=c2.createLinearGradient(sx-tl,0,sx,0);
    g.addColorStop(0,'rgba(255,90,20,0)');g.addColorStop(0.7,'rgba(255,120,40,0.35)');g.addColorStop(1,'rgba(255,230,190,0.7)');
    c2.fillStyle=g;c2.fillRect(sx-tl,sy-lh*0.06,tl,lh*0.12);
    if(rx>x0-30&&rx<x0+lw+30){
      const rg=c2.createRadialGradient(rx,cy,0,rx,cy,lh*0.9);
      rg.addColorStop(0,'rgba(255,170,90,0.55)');rg.addColorStop(1,'rgba(255,69,0,0)');
      c2.fillStyle=rg;c2.fillRect(rx-lh,cy-lh,lh*2,lh*2);
    }
    c2.restore();
    SA.ship(c2,'graf',sx,sy,0.02,lh*0.95/27,now/1000,{livery:'rebel',boost:true});
  }

  function spawnDebris(cx,cy){
    const rn=U.mkRng(5);
    for(let i=0;i<22;i++){
      const a=rn()*Math.PI*2,v=120+rn()*260;
      debris.push({x:cx+Math.cos(a)*badge.Rb*0.9,y:cy+Math.sin(a)*badge.Rb*0.55,
        vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.6-60-rn()*80,r:1.5+rn()*2.6,
        col:rn()<0.3?CC.rebel:rn()<0.5?'#e8dfc8':'#8a7a60',t0:impactAt,dur:600+rn()*500});
    }
  }
  function tick(now){
    if(leaving)return;
    raf=requestAnimationFrame(tick);
    let t=now-t0;
    if(RM)t=99999;else if(skipTo&&t<skipTo)t=skipTo;
    const cx=W/2,cy=H*0.42;
    c2.setTransform(dpr,0,0,dpr,0,0);
    // the whole frame kicks for a beat after the badge lands
    if(impactFired&&!RM){
      const ki=(now-impactAt)/300;
      if(ki<1){const amp=(1-ki)*7;c2.translate((Math.sin(now/13)*amp)|0,(Math.cos(now/17)*amp)|0);}
    }
    c2.drawImage(bg,0,0,W,H);
    c2.save();
    for(let i=0;i<stars.length;i+=3){
      const s=stars[i],tw=0.5+0.5*Math.sin(now/700*s.sp+s.ph);
      c2.globalAlpha=s.a*tw*0.8;c2.fillStyle=s.col;
      c2.beginPath();c2.arc(s.x,s.y,s.r*1.4,0,7);c2.fill();
    }
    c2.restore();
    drawDev(t,now);
    // traffic behind the badge
    if(!RM){
      if(t>STAMP_AT+900&&now>nextFly){nextFly=now+8000+Math.random()*7000;fly={t0:now,y:H*(0.1+Math.random()*0.16),dir:Math.random()<0.5?1:-1,kind:Math.random()<0.35?'graf':'mote'};}
      if(fly){
        const k=(now-fly.t0)/5200;
        if(k>1)fly=null;
        else{const fx=fly.dir>0?-120+k*(W+240):W+120-k*(W+240);
          SA.ship(c2,fly.kind,fx,fly.y,fly.dir>0?0.03:Math.PI-0.03,fly.kind==='graf'?1.2:0.8,now/1000,fly.kind==='graf'?{livery:'civ',boost:true}:{livery:'heg'});}
      }
    }
    // the stamp: it falls from the player's face into the sky
    const ks=clamp((t-STAMP_AT)/STAMP_MS);
    if(ks>0){
      let sc,rot,al;
      if(ks<1){
        const k2=ks*ks;                 // accelerating all the way in
        sc=2.7-1.7*k2;rot=TILT*2.2-TILT*1.2*k2;al=0.25+0.75*k2;
      } else {
        const kb=clamp((t-STAMP_AT-STAMP_MS)/SETTLE_MS);
        sc=1+0.05*(1-kb)*Math.sin(kb*Math.PI*3);rot=TILT;al=1;
        if(!impactFired){impactFired=true;impactAt=now;spawnDebris(cx,cy);}
      }
      if(RM){sc=1;rot=TILT;al=1;if(!impactFired)impactFired=true;}
      c2.save();
      c2.translate(cx,cy+(ks>=1&&!RM?Math.sin(now/1100)*3:0));
      c2.rotate(rot);c2.scale(sc,sc);c2.globalAlpha=al;
      c2.drawImage(badge.cv,-badge.w/2,-badge.h/2,badge.w,badge.h);
      c2.restore();
    }
    // the landing: flash, shockwave, debris
    if(impactFired&&!RM){
      const ki=(now-impactAt)/420;
      if(ki<0.4){c2.fillStyle='rgba(255,246,224,'+(0.3*(1-ki/0.4))+')';c2.fillRect(0,0,W,H);}
      if(ki<1){
        c2.save();
        c2.globalAlpha=0.6*(1-ki);
        c2.lineWidth=5*(1-ki)+1.5;c2.strokeStyle='#e8dfc8';
        c2.beginPath();c2.ellipse(cx,cy+badge.Rb*0.3,badge.Rb*(1.15+ki*1.3),badge.Rb*(0.5+ki*0.6),0,0,7);c2.stroke();
        c2.restore();
      }
      for(const d of debris){
        const kd=(now-d.t0)/d.dur;
        if(kd<0||kd>1)continue;
        c2.globalAlpha=0.9*(1-kd);
        c2.fillStyle=d.col;
        c2.beginPath();c2.arc(d.x+d.vx*kd*(d.dur/1000),d.y+d.vy*kd*(d.dur/1000)+260*kd*kd,d.r*(1-kd*0.5),0,7);c2.fill();
      }
      c2.globalAlpha=1;
      debris=debris.filter(d=>now-d.t0<d.dur);
    }
    if(dev&&t<DEV_IN){c2.fillStyle='rgba(0,0,0,'+(1-t/DEV_IN)+')';c2.fillRect(0,0,W,H);}   // up from black
    el.dataset.stage=t<STAMP_AT?'dev':'title';
    if(t>READY_AT&&!ready){ready=true;el.classList.add('is-ready');const btn=el.querySelector('#splashStart');if(btn)btn.focus({preventScroll:true});}
  }
  function start(){
    if(leaving)return;
    leaving=true;
    try{
      SR.audio.wake();
      SR.audio.osc('triangle',320,640,0.1,0.22);
      SR.audio.osc('sine',110,70,0.16,0.4,0.05);
    }catch(e){}
    el.classList.add('is-leaving');
    const done=()=>{cancelAnimationFrame(raf);if(el){el.remove();el=null;}if(onStartCb)onStartCb();};
    if(RM)done();else setTimeout(done,460);
  }
  function show(onStart){
    onStartCb=onStart;
    el=document.createElement('div');
    el.id='splash';
    el.innerHTML='<canvas></canvas><div class="splash__ui">'+
      '<button type="button" class="sr-btn sr-btn--primary sr-btn--lg" id="splashStart">Start game</button></div>';
    document.body.appendChild(el);
    cv=el.querySelector('canvas');c2=cv.getContext('2d');
    try{const sv=SR.loadSave();if(sv&&sv.started)el.querySelector('#splashStart').textContent='Continue';}catch(e){}
    el.querySelector('#splashStart').addEventListener('click',start);
    el.addEventListener('pointerdown',ev=>{   // a tap skips the developer's mark; a second slams the badge home early
      if(ready||ev.target.id==='splashStart')return;
      const t=performance.now()-t0;
      skipTo=(dev&&t<STAMP_AT&&skipTo<STAMP_AT)?STAMP_AT:STAMP_AT+STAMP_MS+SETTLE_MS+20;
    });
    addEventListener('keydown',function onKey(ev){
      if(!el){removeEventListener('keydown',onKey);return;}
      if((ev.key==='Enter'||ev.key===' ')&&ready&&!leaving){ev.preventDefault();start();}
    });
    addEventListener('resize',()=>{if(el)size();});
    size();
    // Bungee first, but the title never waits long for the network
    const fonts=(document.fonts&&document.fonts.load)?
      Promise.all([document.fonts.load('400 90px Bungee'),document.fonts.load('600 16px "Exo 2"')]).catch(()=>{}):Promise.resolve();
    const mark=new Promise(r=>{const im=new Image();im.onload=()=>{markImg=im;r();};im.onerror=()=>r();im.src='art/brand/perchang.webp';});
    Promise.race([Promise.all([fonts,mark]),new Promise(r=>setTimeout(r,900))]).then(()=>{
      timeline();
      buildBadge();           // rebuild with the real face on
      t0=performance.now();raf=requestAnimationFrame(tick);
    });
  }
  return {show};
})();
