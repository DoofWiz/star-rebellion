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
  const ICONS=/*@ICONS@*/{};
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
