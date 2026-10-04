'use strict';
/* =====================================================================
   STAR REBELLION — title screen.
   Not a scene: a layer over everything that holds the game back until
   the player starts it. The logo builds itself out of the Bobbleheads
   kit (starfield, a dusty planet rim, a hauler crossing behind the
   letters), then the Start button fades up. #test and #deploy boot
   straight past it, and prefers-reduced-motion gets the settled frame.
   ===================================================================== */
window.SR_INTRO=(function(){
  const SA=window.SR_ART,CC=SA.C,U=SA.util;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  let el=null,cv=null,c2=null,W=0,H=0,dpr=1;
  let bg=null,raf=0,t0=0,skipTo=0,ready=false,leaving=false,onStartCb=null;
  let stars=[],nextFly=0,fly=null;

  /* the rebellion flag from the game's own icon set (i-revflame, 24x24) */
  const FLAG_POLE=new Path2D('M6 21.5V3.5');
  const FLAG=new Path2D('M6 4c2.6-.9 4.6.9 7.4 0l6-.6-3.1 2.9 4.1 1.6-4 1.6 2.6 3.1-5.6-.5C10.6 13 8.6 11.3 6 12.2Z');

  function size(){
    dpr=Math.min(2,window.devicePixelRatio||1);
    W=el.clientWidth;H=el.clientHeight;
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    buildBg();
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
  const clamp=k=>Math.max(0,Math.min(1,k));
  const back=k=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(k-1,3)+c1*Math.pow(k-1,2);} // easeOutBack
  const easeO=k=>1-Math.pow(1-k,3);

  /* one word, letter by letter, dropped in from above with a little overshoot */
  function word(txt,font,cy,prog,stag,fill,px){
    c2.font=font;c2.textBaseline='alphabetic';
    const gap=px*0.08;
    const ws=[...txt].map(ch=>c2.measureText(ch).width);
    const total=ws.reduce((a,b)=>a+b,0)+gap*(txt.length-1);
    let x=(W-total)/2;
    for(let i=0;i<txt.length;i++){
      const e=clamp((prog-i*stag)/0.32);
      if(e>0){
        const k=back(e);
        c2.save();
        c2.globalAlpha=clamp(e*1.6);
        c2.translate(x+ws[i]/2,cy-(1-k)*px*0.9);
        c2.lineJoin='round';c2.lineWidth=Math.max(5,px*0.085);c2.strokeStyle=CC.ink;
        c2.strokeText(txt[i],-ws[i]/2,0);
        c2.fillStyle=fill;
        c2.fillText(txt[i],-ws[i]/2,0);
        c2.restore();
      }
      x+=ws[i]+gap;
    }
    return total;
  }
  function tick(now){
    if(leaving)return;
    raf=requestAnimationFrame(tick);
    let t=now-t0;
    if(RM)t=99999;else if(skipTo&&t<skipTo)t=skipTo;
    c2.setTransform(dpr,0,0,dpr,0,0);
    c2.drawImage(bg,0,0,W,H);
    // twinkle over the baked stars
    c2.save();
    for(let i=0;i<stars.length;i+=3){
      const s=stars[i],tw=0.5+0.5*Math.sin(now/700*s.sp+s.ph);
      c2.globalAlpha=s.a*tw*0.8;c2.fillStyle=s.col;
      c2.beginPath();c2.arc(s.x,s.y,s.r*1.4,0,7);c2.fill();
    }
    c2.restore();
    // a hauler crosses behind the letters once, then the odd patrol drifts by
    if(!RM){
      if(t>500&&t<3400){
        const k=(t-500)/2900,fx=-160+k*(W+320);
        SA.ship(c2,'graf',fx,H*0.26+Math.sin(now/300)*4,0.06,1.5,now/1000,{livery:'civ',boost:true});
      }
      if(t>4000&&now>nextFly){nextFly=now+8000+Math.random()*7000;fly={t0:now,y:H*(0.12+Math.random()*0.2),dir:Math.random()<0.5?1:-1};}
      if(fly){
        const k=(now-fly.t0)/5200;
        if(k>1)fly=null;
        else{const fx=fly.dir>0?-80+k*(W+160):W+80-k*(W+160);
          SA.ship(c2,'mote',fx,fly.y,fly.dir>0?0.03:Math.PI-0.03,0.8,now/1000,{livery:'heg'});}
      }
    }
    // the logo block
    const base=Math.min(760,W*0.92);
    const sPx=Math.round(base*0.082),rPx=Math.round(base*0.152);
    const cy=H*0.40;
    word('STAR','400 '+sPx+'px Bungee, "Exo 2", sans-serif',cy-rPx*0.92,(t-700)/900,0.17,'#f4f0e6',sPx);
    const rw=word('REBELLION','400 '+rPx+'px Bungee, "Exo 2", sans-serif',cy,(t-1150)/1100,0.09,CC.rebel,rPx);
    // the underline sweeps out, then breathes
    const uk=clamp((t-2150)/300);
    if(uk>0){
      const w2=rw*easeO(uk),glow=0.55+0.2*Math.sin(now/900);
      c2.save();
      c2.shadowColor=CC.rebel;c2.shadowBlur=12*glow;
      c2.fillStyle=CC.rebelHi;
      c2.fillRect(W/2-w2/2,cy+rPx*0.28,w2,Math.max(3,rPx*0.045));
      c2.restore();
    }
    // the flag ignites over the title (the glyph spans y 3.5–21.5 of its 24-box)
    const fk=clamp((t-2050)/400);
    if(fk>0){
      const fs2=(sPx*1.75)/18,footY=cy-rPx*0.92-sPx*1.5;
      const flick=RM?1:0.82+0.18*Math.sin(now/90)+0.06*Math.sin(now/37);
      c2.save();
      c2.translate(W/2-10*fs2,footY-21.5*fs2);
      c2.scale(fs2,fs2);
      c2.globalAlpha=fk;
      c2.lineWidth=2.25;c2.lineCap='round';c2.strokeStyle='#f4f0e6';
      c2.stroke(FLAG_POLE);
      c2.save();
      c2.globalAlpha=fk*flick;
      c2.shadowColor=CC.rebel;c2.shadowBlur=8;
      c2.fillStyle=CC.rebel;c2.fill(FLAG);
      c2.restore();
      c2.restore();
    }
    if(t>2450&&!ready){ready=true;el.classList.add('is-ready');const btn=el.querySelector('#splashStart');if(btn)btn.focus({preventScroll:true});}
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
    el.addEventListener('pointerdown',ev=>{   // a tap anywhere hurries the logo along
      if(!ready&&ev.target.id!=='splashStart')skipTo=2500;
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
    Promise.race([fonts,new Promise(r=>setTimeout(r,900))]).then(()=>{
      t0=performance.now();raf=requestAnimationFrame(tick);
    });
  }
  return {show};
})();
