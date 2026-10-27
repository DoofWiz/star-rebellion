'use strict';
/* =====================================================================
   STAR REBELLION — the Space Combat FTUE (first-time user experience)
   The designer's doc "Space Combat FTUE" (Google Drive, FTUE folder, 22 October). The first time the player plans Torch
   the Depots (Type 3.5's planning windows, arena-hc35.js), an intro window of four pages with Next and Previous, two of
   them with a looping animation that fades in and out (the doc's "smooth gifs", drawn live with the game's ship art);
   then the contextual steps through the four planning windows: a coach card beside what it explains (Got it / Next),
   or a pointer at what to click. A step shows only while its window is on screen, is skipped once the player is past
   it, and waits if they go back. Launching ends it; the base marks it seen (base.js ftue35Done).
   The copy is the doc's (lightly edited for the buttons' real labels). It isn't in the text workbook yet (C-90 item 5).
   ===================================================================== */
window.SR_FTUE35=(function(){
  const INTRO=[
    {t:'Space missions',h:'Like Ground Missions, <b>Space Missions</b> need an <b>Objective</b>, a <b>Team</b> and a <b>Plan</b>.',art:'trio'},
    {t:'Pilots and Wings',h:'<b>Pilots</b> fly <b>ships</b> into battle. Pilots are organised into <b>Wings</b>. Each Wing has a <b>Wing Leader</b>.',art:'wing'},
    {t:'Your orders',h:'Your Wings will attempt to achieve the <b>Objective</b> you set for the mission and any <b>Secondary Objectives</b> you set. They will follow the <b>Rules of Engagement</b> you set. Finally, they will attempt to follow the <b>Plan</b> you set as closely as possible.',art:'attack'},
    {t:'In the field',h:'No plan survives first contact with the enemy. Your <b>Wing Leaders</b> will make decisions in the field that may require a new plan to best achieve your objective.',art:null},
  ];
  // stage: where the planning windows are (1: window 1's primary, 2: its secondaries, 3: rules, 4: wings & assets, 5: the plan)
  const fam=name=>root=>[...root.querySelectorAll('.h35-fam')].find(s=>((s.querySelector('.h35-panel__head')||{}).textContent||'').trim()===name)||null;
  const STEPS=[
    {stage:1,at:'.h35-fams',title:'Primary Objective',text:'First, you need to decide what your <b>Primary Objective</b> is. This is the ultimate goal of the mission. Each kind of Opportunity has a possible array of Objectives.',btn:'Next'},
    {stage:1,at:fam('Take it'),title:'Take',text:'<b>Take</b> Objectives involve stealing something in the opportunity.',btn:'Next'},
    {stage:1,at:fam('Deny it'),title:'Deny',text:'<b>Deny</b> Objectives involve destroying something in the opportunity.',btn:'Next'},
    {stage:1,at:fam('Use it'),title:'Use',text:'<b>Use</b> Objectives involve making a utility out of something in the opportunity.',btn:'Next'},
    {stage:1,at:fam('Bait with it'),title:'Bait',text:'<b>Bait</b> Objectives involve using the opportunity to reach something else.',btn:'Next'},
    {stage:1,at:'[data-primary="destroy"]',text:'In this opportunity, destroying the fuel depots is the relevant objective type, so select it.',ring:true,until:B=>B.plan&&B.plan.primary==='destroy'},
    {stage:1,at:'[data-act="next"]',point:'Next: Secondaries',ring:true},
    {stage:2,at:'.h35-panel--main',title:'Secondary Objectives',text:'<b>Secondary Objectives</b> are extra objectives you can set for your team to try and achieve for bonus rewards. You can set up to 2, or none at all.',btn:'Got it'},
    {stage:2,at:'[data-act="next"]',point:'Next: Rules',ring:true},
    {stage:3,at:'.h35-trows',title:'Rules of Engagement',text:'<b>Rules of Engagement</b> give extra parameters for your Pilots to follow during the mission.',btn:'Got it'},
    {stage:3,at:'[data-act="next"]',point:'Next: Wings & assets',ring:true},
    {stage:4,at:'.h35-wcols',title:'Wings',text:'<b>Wings</b> are the Squads of Space. Assign Wings from your available Roster to the mission. Set each Wing to <b>Strike</b> or stay back in <b>Reserve</b> to be called in during the mission.',btn:'Got it'},
    {stage:4,at:'.h35-abar',title:'Assets',text:'<b>Assets</b> are items, ships or crafted objects the Revolution possesses that could benefit the mission. They grant <b>Commander Powers</b> you can use during the mission.',btn:'Got it'},
    {stage:4,at:'[data-act="next"]',point:'Next: The plan',ring:true},
    {stage:5,at:'.h35-wing',title:'Planning',text:'<b>Planning</b> sets the orders for each wing during the mission. This is their role in achieving the Primary Objective. Give each Wing an <b>Executive Order</b> that they will attempt to accomplish. Give each Wing a <b>Secondary Order</b> that will become active based on a trigger during the mission.',btn:'Got it'},
    {stage:5,at:'[data-act="launch"]',point:'Start the mission',ring:true},
  ];
  const RM=()=>matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let F=null;   // the running FTUE: {B, root, onDone, page, i, raf, t0, el:{...}}

  function start(o){
    stop();
    F={B:o.B,root:o.root,onDone:o.onDone||null,page:0,i:0,raf:0,t0:performance.now(),done:false};
    const L=document.createElement('div');L.id='ftue35';L.innerHTML=
      '<div class="f35-intro" hidden><div class="f35-scrim"></div><div class="sr-window f35-win" role="dialog" aria-modal="true" aria-labelledby="f35Title">'+
        '<div class="sr-window__head"><div class="sr-window__title" id="f35Title"></div><span class="f35-page"></span></div>'+
        '<div class="sr-window__body"><div class="f35-art"><canvas width="560" height="220"></canvas></div><p class="f35-text"></p></div>'+
        '<div class="sr-window__foot"><button type="button" class="sr-btn sr-btn--ghost" data-f35="prev">Previous</button><span class="sr-spacer"></span><button type="button" class="sr-btn sr-btn--primary" data-f35="next">Next</button></div></div></div>'+
      '<div class="f35-ring" hidden></div>'+
      '<div class="sr-pointer f35-ptr" hidden><span class="sr-pointer__label"></span><span class="sr-pointer__arrow"></span></div>'+
      '<div class="sr-coach f35-coach" role="status" hidden></div>';
    document.body.appendChild(L);
    F.el={layer:L,intro:L.querySelector('.f35-intro'),title:L.querySelector('#f35Title'),pg:L.querySelector('.f35-page'),art:L.querySelector('.f35-art'),cv:L.querySelector('canvas'),
      text:L.querySelector('.f35-text'),prev:L.querySelector('[data-f35="prev"]'),next:L.querySelector('[data-f35="next"]'),ring:L.querySelector('.f35-ring'),ptr:L.querySelector('.f35-ptr'),coach:L.querySelector('.f35-coach')};
    L.addEventListener('click',onClick);
    F.intro=true;showPage(0);
    F.raf=requestAnimationFrame(tick);
  }
  function stop(){if(!F)return;cancelAnimationFrame(F.raf);F.el.layer.remove();F=null;}
  const modal=()=>!!(F&&F.intro);
  function onClick(ev){
    const b=ev.target.closest('button');if(!b||!F)return;
    const a=b.getAttribute('data-f35');
    if(a==='prev'&&F.page>0)showPage(F.page-1);
    else if(a==='next'){if(F.page<INTRO.length-1)showPage(F.page+1);else{F.intro=false;F.el.intro.hidden=true;}}
    else if(a==='got'){F.i++;}
  }
  function showPage(p){
    F.page=p;F.t0=performance.now();const P=INTRO[p],E=F.el;
    E.intro.hidden=false;E.title.textContent=P.t;E.pg.textContent=(p+1)+' / '+INTRO.length;E.text.innerHTML=P.h;
    E.art.hidden=!P.art;E.prev.disabled=p===0;E.next.textContent=p===INTRO.length-1?'Got it':'Next';
    if(P.art)draw(P.art,0);
    E.next.focus();
  }
  // where the planning windows are, as a stage (see STEPS)
  function stageOf(B){if(B.screen!=='brief')return 99;return B.step===1?(B.part===2?2:1):B.step+1;}
  function tick(now){
    if(!F)return;F.raf=requestAnimationFrame(tick);
    const E=F.el,B=F.B;
    if(B.screen==='live'||B.screen==='debrief'){finish();return;}   // launched: it's done
    if(F.intro){const P=INTRO[F.page];if(P.art)draw(P.art,(now-F.t0)/1000);hideAll();return;}
    // the current step: skipped once the player is past it (or it's satisfied), hidden while they've gone back
    let s=STEPS[F.i];
    while(s&&(stageOf(B)>s.stage||(s.until&&s.until(B)))){F.i++;s=STEPS[F.i];}
    if(!s){hideAll();return;}
    if(stageOf(B)<s.stage||B.screen!=='brief'){hideAll();return;}
    const el=typeof s.at==='function'?s.at(F.root):F.root.querySelector(s.at);
    const rc=el&&el.getBoundingClientRect();
    if(!rc||rc.width<2||rc.height<2){hideAll();return;}
    if(s.ring)placeRing(rc);else E.ring.hidden=true;
    if(s.point){E.coach.hidden=true;pointAt(rc,s.point);}
    else{E.ptr.hidden=true;coachAt(rc,s);}
  }
  function finish(){const cb=F.onDone;stop();if(cb)try{cb();}catch(e){}}
  function hideAll(){const E=F.el;E.ring.hidden=true;E.ptr.hidden=true;E.coach.hidden=true;}
  function placeRing(rc){const r=F.el.ring;r.hidden=false;r.style.left=(rc.left-6)+'px';r.style.top=(rc.top-6)+'px';r.style.width=(rc.width+12)+'px';r.style.height=(rc.height+12)+'px';}
  // a pointer at what to click (as base.js pointAt): above it, or below when it sits low
  function pointAt(rc,label){
    const el=F.el.ptr;el.hidden=false;el.querySelector('.sr-pointer__label').textContent=label;
    el.style.left=(rc.left+rc.width/2)+'px';
    const h=el.offsetHeight||50,below=rc.top-h-8<4;
    el.classList.toggle('below',below);el.style.top=below?(rc.top+rc.height+8)+'px':(rc.top-h-8)+'px';
  }
  // a coach card beside what it explains (as base.js coachAt): beside, else above, else below, kept on screen
  function coachAt(rc,s){
    const el=F.el.coach;el.hidden=false;
    const html=(s.title?'<div class="sr-coach__head"><span class="sr-coach__title">'+s.title+'</span><span class="f35-n">'+(F.i+1)+' / '+STEPS.length+'</span></div>':'')+
      '<span class="f35-coach__txt">'+s.text+'</span>'+(s.btn?'<div class="sr-coach__foot"><button type="button" class="sr-btn" data-f35="got">'+s.btn+'</button></div>':'');
    if(el.__html!==html){el.innerHTML=html;el.__html=html;}
    const w=el.offsetWidth||320,h=el.offsetHeight||100,top=8,bot=innerHeight-8;
    const side=rc.left+rc.width+w+28<=innerWidth,above=!side&&(rc.top-h-16>=top||rc.top+rc.height+16+h>bot);
    el.classList.toggle('sr-coach--tail-left',side);el.classList.toggle('sr-coach--tail-down',above);el.classList.toggle('sr-coach--tail-up',!side&&!above);
    if(side){el.style.left=(rc.left+rc.width+18)+'px';el.style.top=Math.max(top,Math.min(bot-h,rc.top+Math.min(rc.height/2,40)-22))+'px';}
    else{el.style.left=Math.max(8,Math.min(innerWidth-w-8,rc.left+rc.width/2-40))+'px';el.style.top=Math.max(top,Math.min(bot-h,above?rc.top-h-16:rc.top+rc.height+16))+'px';}
  }

  /* ---------- the intro's animations: a loop that fades in and out (reduced motion: one still frame) ---------- */
  const STARS=Array.from({length:70},(_,i)=>({x:(i*397)%560,y:(i*211)%220,z:0.3+((i*53)%10)/14}));
  const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
  function draw(kind,t){
    const cv=F.el.cv,g=cv.getContext('2d'),W=cv.width,H=cv.height,SA=window.SR_ART;
    const LOOP=kind==='attack'?6:5,still=RM(),u=still?(kind==='attack'?2.9:2.5):t%LOOP,fade=still?1:Math.min(ease(u/0.6),ease((LOOP-u)/0.6));
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.fillStyle='#070818';g.fillRect(0,0,W,H);
    for(const s of STARS){const x=((s.x-u*60*s.z)%W+W)%W;g.fillStyle='rgba(200,210,255,'+(0.25+0.5*s.z)+')';g.fillRect(x,s.y,1.6*s.z,1.6*s.z);}
    g.globalAlpha=fade;
    const ship=(art,x,y,h,sc,liv)=>{try{SA.ship(g,art,x,y,h,sc,u,{livery:liv||'rebel',sized:true});}catch(e){}};
    if(kind==='trio'){
      const words=[['OBJECTIVE','What the job is'],['TEAM','Who flies it'],['PLAN','How they do it']];
      words.forEach(([a,b],i)=>{const x=W*(i+0.5)/3,y=H/2+Math.sin(u*2+i)*4,p=ease((u-0.3*i)/0.6);g.globalAlpha=fade*p;
        g.fillStyle='rgba(255,196,64,0.12)';g.strokeStyle='#ffc440';g.lineWidth=2;g.beginPath();g.arc(x,y-14,38,0,6.283);g.fill();g.stroke();
        g.fillStyle='#ffc440';g.font='22px Bungee, sans-serif';g.textAlign='center';g.fillText(String(i+1),x,y-6);
        g.font='800 15px sans-serif';g.fillStyle='#fff';g.fillText(a,x,y+46);g.font='13px sans-serif';g.fillStyle='rgba(220,226,255,.75)';g.fillText(b,x,y+66);});
    }
    if(kind==='wing'){
      // a wing of three in formation, crossing the frame; the leader marked
      const cx=-60+(W+120)*(u/LOOP),cy=H/2+Math.sin(u*1.3)*8,F3=[[0,0],[-62,-40],[-62,40]];
      F3.forEach(([dx,dy],i)=>ship('cross',cx+dx,cy+dy+Math.sin(u*2.2+i)*3,0,1.15));
      g.strokeStyle='#ffc440';g.lineWidth=2;g.setLineDash([5,4]);g.beginPath();g.arc(cx,cy,30,0,6.283);g.stroke();g.setLineDash([]);
      g.fillStyle='#ffc440';g.font='800 12px sans-serif';g.textAlign='left';g.fillText('WING LEADER',cx+36,cy+4);g.textAlign='center';
      g.fillStyle='rgba(220,226,255,.8)';g.font='12px sans-serif';g.fillText('DAGGER WING',cx-62,cy+72);
    }
    if(kind==='attack'){
      // the wing flies at the enemy and opens fire; one of them goes up
      const k=ease(u/2.4),cx=40+k*170,cy=H/2,F3=[[0,0],[-50,-34],[-50,34]];
      const foes=[[430,70],[470,120],[425,165]],hit=u>=3.2;
      foes.forEach(([x,y],i)=>{if(i===1&&hit)return;ship('mote',x+Math.sin(u+i)*5,y+Math.cos(u*1.2+i)*5,Math.PI,1.05,'heg');});
      F3.forEach(([dx,dy],i)=>ship('cross',cx+dx,cy+dy,0,1.1));
      if(u>1.4&&u<3.6)for(let b=0;b<6;b++){const p=((u*3+b/6)%1),[fx,fy]=F3[b%3],sx=cx+fx+18,sy=cy+fy,tx=470,ty=120;g.strokeStyle='#ffd27a';g.lineWidth=2.2;g.beginPath();
        const x=sx+(tx-sx)*p,y=sy+(ty-sy)*p;g.moveTo(x,y);g.lineTo(x-14,y-(ty-sy)/(tx-sx)*14);g.stroke();}
      if(hit&&u<4.4){const r=(u-3.2)*70;g.fillStyle='rgba(255,200,90,'+Math.max(0,0.9-(u-3.2))+')';g.beginPath();g.arc(470,120,r*0.6,0,6.283);g.fill();
        g.strokeStyle='rgba(255,240,200,'+Math.max(0,1-(u-3.2))+')';g.lineWidth=3;g.beginPath();g.arc(470,120,r,0,6.283);g.stroke();}
    }
    g.globalAlpha=1;
  }
  return {start,stop,modal,STEPS,INTRO,active:()=>!!F,state:()=>F?{intro:F.intro,page:F.page,i:F.i}:null};
})();
