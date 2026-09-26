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
    for(const n in scenes){
      const el=document.getElementById('sc-'+n);
      if(el)containers[n]=el;
    }
    requestAnimationFrame(frame);
    go('base',{boot:true});
  }
  return {register,go,boot,endMission,persist,loadSave,wipeSave,audio,
    get active(){return active;},
    set mission(m){mission=m;},
    get mission(){return mission;}};
})();
