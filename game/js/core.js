'use strict';
/* =====================================================================
   STAR REBELLION — kernel
   Owns the scene manager, the shared WebAudio engine, the campaign
   save file (localStorage + hot snapshot), and the mission hand-off
   between the base layer and the combat scenes.
   ===================================================================== */
window.SR=(function(){
  /* ---------- audio: one engine for every scene ---------- */
  let AC=null,master=null,noiseBuf=null,muted=false;
  function ensure(){
    if(!AC){
      AC=new (window.AudioContext||window.webkitAudioContext)();
      const comp=AC.createDynamicsCompressor();
      comp.threshold.value=-16;comp.knee.value=18;comp.ratio.value=7;
      comp.attack.value=0.002;comp.release.value=0.18;
      master=AC.createGain();master.gain.value=0.95;
      master.connect(comp);comp.connect(AC.destination);
      const len=AC.sampleRate*1.6;noiseBuf=AC.createBuffer(1,len,AC.sampleRate);
      const d=noiseBuf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    }
    return AC;
  }
  function envG(v,t,at){
    const g=AC.createGain();
    const t0=AC.currentTime+(at||0);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(v,t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+t);
    g.connect(master);
    return g;
  }
  const audio={
    off(){return muted||!AC;},
    muted(){return muted;},
    setMuted(m){muted=!!m;if(!muted)audio.wake();},
    wake(){ensure();if(AC&&AC.state==='suspended')AC.resume();},
    osc(type,f0,f1,v,t,at){
      if(muted||!AC)return;
      const o=AC.createOscillator();
      o.type=type;
      const t0=AC.currentTime+(at||0);
      o.frequency.setValueAtTime(f0,t0);
      if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+t);
      o.connect(envG(v,t,at));
      o.start(t0);o.stop(t0+t+0.05);
    },
    nz(ft,fr,q,v,t,at,sw){
      if(muted||!AC)return;
      const s=AC.createBufferSource(),f=AC.createBiquadFilter();
      s.buffer=noiseBuf;s.playbackRate.value=0.8+Math.random()*0.4;
      f.type=ft;f.frequency.setValueAtTime(fr,AC.currentTime+(at||0));f.Q.value=q;
      if(sw)f.frequency.exponentialRampToValueAtTime(sw,AC.currentTime+(at||0)+t);
      s.connect(f).connect(envG(v,t,at));
      s.start(AC.currentTime+(at||0));s.stop(AC.currentTime+(at||0)+t+0.05);
    },
    /* the small sounds every scene shares */
    tick(){if(audio.off())return;audio.osc('square',1500,1300,0.02,0.045);},
    dice(){if(audio.off())return;for(let i=0;i<5;i++)audio.nz('bandpass',2200,3,0.04,0.03,i*0.12*(1+i*0.15));},
  };
  /* ---------- small helpers every scene shares (SR.util) ----------
     Pure helpers only: anything that reads a scene's own state (its log, its floaters, its unit list) stays in the scene.
     rint and pick take the random source as an argument, so a scene can pass the rng its tests swap out. */
  const util={
    scoped:root=>id=>root.querySelector('#'+id),            // a scene's byId: ids are looked up inside its own root
    rint:(lo,hi,rng)=>lo+Math.floor((rng||Math.random)()*(hi-lo+1)),
    pick:(arr,rng)=>arr[Math.floor((rng||Math.random)()*arr.length)],
    clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),
    dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    /* a small seeded generator: the same seed gives the same sequence (the market, a campaign's draws) */
    mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};},
    /* FNV-1a: a string to a stable 32-bit number (seeds from ids and names) */
    hashStr(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;},
  };
  /* ---------- durable save ---------- */
  const SAVE_KEY='star-rebellion-campaign-v1';
  let snap=null;
  function persist(payload){
    snap=payload;
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(payload));}catch(e){}
  }
  function loadSave(){
    try{
      const hot=window.claude?.hot?.data??null;
      if(hot&&hot.campaign)return hot;
    }catch(e){}
    try{
      const s=localStorage.getItem(SAVE_KEY);
      if(s){const d=JSON.parse(s);if(d&&d.campaign)return d;}
    }catch(e){}
    return null;
  }
  function wipeSave(){
    snap=null;
    try{localStorage.removeItem(SAVE_KEY);}catch(e){}
  }
  try{window.claude?.hot?.snapshot?.(()=>snap);}catch(e){}
  /* ---------- scenes ---------- */
  const scenes={},containers={};
  let active=null,mission=null;
  function register(name,api){scenes[name]=api;}
  function go(name,params){
    if(active&&scenes[active]&&scenes[active].exit){
      try{scenes[active].exit();}catch(e){console.error(e);}
    }
    const prev=active;
    active=name;
    for(const k in containers)containers[k].hidden=(k!==name);
    scenes[name].enter(params||{},prev);
  }
  function endMission(result){go('base',{debrief:result});}
  function frame(now){
    requestAnimationFrame(frame);
    const s=scenes[active];
    if(s&&s.frame){try{s.frame(now);}catch(e){console.error(e);}}
  }
  function boot(){
    if(window.SR_THEME)window.SR_THEME.sync();
    for(const n in scenes){
      const el=document.getElementById('sc-'+n);
      if(el)containers[n]=el;
    }
    requestAnimationFrame(frame);
    go('base',{boot:true});
  }
  /* ---------- shared briefing furniture ----------
     Every scene builds its mission-brief objectives and squad cards
     through these, so the player sees one consistent language. */
  const GEAR={
    akli:{n:'Akli AR',i:'rifle'},
    cowboy:{n:'Cowboy No.4',i:'pistol'},
    carbine:{n:'Peacekeeper Carbine',i:'rifle'},
    scatter:{n:'Varmint Shotgun',i:'shotgun'},
    longiron:{n:'Longhorn ’28',i:'rifle'},
    sidearm:{n:'Sidearm',i:'pistol'},
    unarmed:{n:'Bare hands',i:null},
    plasma:{n:'Plasma',i:'plasma'},
    ballistic:{n:'Ballistic',i:'shell'},
    missile:{n:'Missile',i:'missile'},
  };
  /* kit sprite names; the sprite is inlined at the top of index.html */
  const ICON={rifle:'gun',pistol:'pistol',shotgun:'gun',plasma:'plasma',shell:'ballistic',missile:'missile',ship:'ship'};
  function icon(k){return ICON[k]?window.SR_HUD.ico(ICON[k]):'';}
  const ui={
    icon,
    gearChips(list){
      return (list||[]).map(w=>{const g=GEAR[w]||{n:w,i:null};return {icon:g.i,label:g.n};});
    },
    squadCard(o){
      let h='<div class="sr-squadcard"><span class="sr-avatar'+(o.pilot?' sr-avatar--pilot':'')+'">'+window.SR_HUD.initials(o.name||'?')+'</span><div>';
      h+='<div class="sr-squadcard__name">'+o.name+'</div>';
      h+='<div class="sr-squadcard__role">'+(o.role||(o.pilot?'Pilot':''))+'</div>';
      h+='<div class="sr-squadcard__gear">';
      for(const c of o.chips||[])h+='<span class="sr-gear">'+(c.icon?icon(c.icon):'')+'<span>'+c.label+'</span></span>';
      h+='</div></div></div>';
      return h;
    },
    objRows(list){
      return (list||[]).map(o=>{
        const t=(typeof o==='string')?{text:o}:o;
        return '<div class="sr-obj'+(t.sub?' sr-obj--note':'')+'"><span class="sr-obj__mark"></span><span>'+t.text+'</span></div>';
      }).join('');
    },
  };
  /* phones: coarse pointers get tap-first hints */
  const touch=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
  return {theme:window.SR_THEME,hud:window.SR_HUD,util,register,go,boot,endMission,persist,loadSave,wipeSave,audio,ui,touch,
    get active(){return active;},
    set mission(m){mission=m;},
    get mission(){return mission;}};
})();
