'use strict';
/* =====================================================================
   STAR REBELLION — SR.hud  (shared in-mission HUD builders)
   Scene-agnostic helpers for the "Chunky Ops" mission HUD. Written for the
   ground scene first; the space scene reuses them unchanged. Everything
   here takes plain data and returns HTML strings or patches DOM it owns.
   It knows nothing about game rules.

   Load order: ui/sr-theme.js, ui/sr-hud.js, js/core.js (core exposes this
   as SR.hud). Styles: ui/sr-hud.css (tooltip behaviour, slot pointer rules,
   command-bar fitting, VS panel details).

   WIRING (see ground.js for the reference implementation)
     - Put class `sr-hud` on the scene's .sr-stage. Inside .sr-slot-bc keep, top to bottom: a pill (.sr-pill),
       an optional popover, a host <div class="sr-hud__host" id="vsHost" hidden> and a host
       <div class="sr-hud__host" id="ctlDock" hidden>. Swap the bar with H.render(dockHost, H.cmdbar({...})).
     - Call H.tips(sceneRoot) once so every [data-tip] element gets the floating tooltip.
     - Order cards and weapon cards are plain buttons: put your own data-* attributes in `attrs` and use one
       delegated click listener on the dock host. Digit keys: click the enabled card whose .sr-order__key matches.
     - Measure the dock (BOT slot height) when you frame the camera: keep the VS panel + bar above the fight.

   COMMAND BAR
     H.btn({id,label,icon,iconAfter,variant:'primary'|'danger'|'ghost'|'',size:'lg'|'sm'|'',go,disabled,soft,why,
            pressed,attn,cls,attrs,aria,key,tip})
        soft = looks disabled (aria-disabled) but stays clickable; why = reason shown in the tooltip
     H.order({ract,key,icon,label,family:'move|stance|nerve|util|fight',active,disabled,why,
              tip:{title,rule,nums:[{t,kind:'good|bad|...'}]},id,attrs})   -> '<button class="sr-order">'
     H.sep()                                  -> '<span class="sr-orders__sep">'
     H.cmdbar({who:{lead,name,hint}, mid:html, orders:[html...], go:{html,count,countTip:{title,rule}}, cls})
        who.lead = avatar html or an icon; count = html under the primary ("<b>1</b> of 3 ordered");
        mid = raw html between who and orders (the space scene puts its .sr-dial here);
        omit who/orders/go for a smaller bar
     H.render(host, html)                     -> sets innerHTML only when it changed (keeps hover/focus/animations)
     H.fitBar(host)                           -> tightens a desktop bar (.is-tight/.is-tighter/.is-bare, then .is-scroll) until the order cards fit; call after render and on resize
     H.tips(root)                             -> one delegated tooltip for every [data-tip] inside root. Disabled
                                                 cards keep their reason ("why") on hover. Call once per scene.
   VS PANEL (DOM replacement for the old canvas panel; docks above the bar in .sr-slot-bc)
     const vs=H.vs(hostEl);  vs.set({a:{name,initials,role,roleIcon,foe,mods:[{label,val,base}],shown,total,totalLabel},
                                      d:{...same...}, odds:{pct,need}|null, die:{face,state:'idle|rolling|hit|miss'},
                                      step:'Shot 1 of 6', stamp:{text,kind:'bad|action|foe|'}|null});  vs.el  vs.destroy()
        a = attacker (left), d = defender (right); foe:true paints a side in Hegemony blue.
        mods[i].val is a number (base rows are plain, others signed; positive green, negative orange);
        `shown` = how many rows are revealed so far (the rest keep their height but stay invisible);
        total is hidden until all rows are shown. Call set() as often as you like; unchanged parts are skipped.
   MENU / WINDOWS
     H.menuHtml(items)  items:[{id,icon,label,kbd,kind:'danger|debug'} | {sep:1} | {head:'text'}]
     H.menuBind(menuEl, buttonEl)             -> toggle on click, closes on outside press / Esc / item pick
     H.win(root,{id,title,size:'sm|lg',accent:'friend|foe|good|progress',body,foot,onOpen,onClose}) -> {el,body,foot,open,close}
        windows are .sr-scrim children of `root` (the scene's .sr-app); [data-close] elements close them
     H.confirm(root,{title,body,ok,cancel,danger,onOk,onClose}) -> modal question window (cancel is ghost, ok primary/danger)
     H.topWin(root)                           -> the open H.win inside root (for Esc handling), or null
     H.winHead(title,{tags,extra,close})      -> a window's title bar: tags html, extra buttons before the close button;
                                                 close = the close button's attributes (default data-close), false for none
     H.closeBtn(attrs)                        -> the ghost close button (attrs default data-close)
     H.winBody(html)  H.winFoot(buttons,note) -> body and action bar (note on the left, buttons right, primary last).
                                                 H.win builds its chrome from these; a scene that keeps one window and
                                                 re-renders it (the base) uses them directly.
   FEEDBACK
     H.banner(stageEl,{text,sub,color})       -> .sr-banner slam, removes itself (other .sr-banner nodes are left alone)
     H.toast(el,{html,icon,kind,ms})          -> fills the .sr-toast element el (kind: friend|foe|action|''), pops it in and
                                                 hides it again after ms (2800)
     H.comms(feedEl,{max:3,ttl:6000})         -> {push(html,kind:'friend|foe|good|action|bad'), clear()}
                                                 newest `max` lines show, older ones dim, every line expires after ttl
     H.phase(plateEl,{phase:'free|plan|exec|fight',status:'calm|alert',name,text,round,icon})
                                              -> patches .sr-phase (name = plate label, text = status words, icon = status icon name)
   MISC  H.tip(title,rule,why,key) -> ' data-tip=...' attribute string for any element
     H.tag(label,tone,icon)               -> '<span class="sr-tag sr-tag--tone">' (label is html)
     H.esc  H.ico(name,cls)  H.avatar({name,initials,cls,badge})  H.initials(name)  H.reduced (prefers-reduced-motion)
   ===================================================================== */
window.SR_HUD=(function(){
  const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>ESC[c]);
  const ico=(n,cls)=>'<svg class="sr-ico'+(cls?' '+cls:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>';
  const reduced=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function initials(name){
    const w=String(name||'?').trim().split(/\s+/);
    return (w.length>1?w[0][0]+w[1][0]:w[0].slice(0,2)).toUpperCase();
  }
  function avatar(o){
    return '<span class="sr-avatar'+(o.cls?' '+o.cls:'')+'">'+(o.img?'<img class="bs-face" src="'+o.img+'" alt="">':esc(o.initials||initials(o.name)))+   // o.img: a portrait (data URL)
      (o.badge?'<span class="sr-avatar__role">'+ico(o.badge)+'</span>':'')+'</span>';
  }
  /* ---------- buttons & order cards ---------- */
  function tipAttr(t,why,key,label){
    if(!t&&!why)return '';
    const d={t:(t&&t.title)||label||'',r:(t&&t.rule)||'',n:(t&&t.nums)||null,w:why||'',k:key||''};
    return ' data-tip="'+esc(JSON.stringify(d))+'"';
  }
  function btn(o){
    let c='sr-btn';
    if(o.variant)c+=' sr-btn--'+o.variant;
    if(o.size)c+=' sr-btn--'+o.size;
    if(o.go)c+=' sr-btn--go';
    if(o.attn)c+=' sr-btn--attn';
    if(o.cls)c+=' '+o.cls;
    return '<button type="button" class="'+c+'"'+(o.id?' id="'+o.id+'"':'')+(o.pressed!=null?' aria-pressed="'+!!o.pressed+'"':'')+
      (o.disabled?' disabled':'')+(o.soft?' aria-disabled="true"':'')+
      tipAttr(o.tip,o.why,o.key,o.label)+(o.aria?' aria-label="'+esc(o.aria)+'"':'')+(o.attrs?' '+o.attrs:'')+'>'+
      (o.icon&&!o.iconAfter?ico(o.icon):'')+(o.label?esc(o.label):'')+(o.icon&&o.iconAfter?ico(o.icon):'')+'</button>';
  }
  function order(o){
    const c='sr-order'+(o.family?' sr-order--'+o.family:'')+(o.active?' is-active':'');
    return '<button type="button" class="'+c+'"'+(o.id?' id="'+o.id+'"':'')+(o.ract?' data-ract="'+o.ract+'"':'')+
      (o.disabled?' disabled aria-disabled="true"':'')+(o.active?' aria-pressed="true"':'')+
      tipAttr(o.tip,o.why,o.key,o.label)+' aria-label="'+esc(o.label+(o.why?'. '+o.why:''))+'"'+(o.attrs?' '+o.attrs:'')+'>'+
      (o.key?'<span class="sr-kbd sr-order__key">'+esc(o.key)+'</span>':'')+ico(o.icon)+esc(o.label)+'</button>';
  }
  const tip=(title,rule,why,key)=>tipAttr({title,rule},why,key,title);
  const tag=(label,tone,icon)=>'<span class="sr-tag'+(tone?' sr-tag--'+tone:'')+'">'+(icon?ico(icon):'')+label+'</span>';
  const sep=()=>'<span class="sr-orders__sep"></span>';
  function cmdbar(o){
    const w=o.who||{};
    let h='<div class="sr-cmdbar'+(o.cls?' '+o.cls:'')+'">';
    if(o.who)h+='<div class="sr-cmdbar__who">'+(w.lead||'')+'<div><div class="sr-cmdbar__name">'+esc(w.name||'')+'</div><div class="sr-cmdbar__hint">'+(w.hint||'')+'</div></div></div>';
    if(o.mid)h+=o.mid;
    if(o.orders&&o.orders.length)h+='<div class="sr-orders">'+o.orders.join('')+'</div>';
    if(o.go)h+='<div class="sr-cmdbar__go">'+(o.go.html||'')+(o.go.count?'<div class="sr-cmdbar__count"'+(o.go.countTip?tipAttr({title:o.go.countTip.title||'',rule:o.go.countTip.rule||''}):'')+'>'+o.go.count+'</div>':'')+'</div>';
    return h+'</div>';
  }
  /* set innerHTML only when it changed, so hover, focus and entry animations survive repeated syncs */
  function render(host,html){
    if(host.__h===html)return false;
    host.__h=html;host.innerHTML=html;return true;
  }
  /* tighten a desktop command bar until its order cards fit without scrolling */
  function fitBar(host){
    const bar=host.querySelector('.sr-cmdbar'),o=bar&&bar.querySelector('.sr-orders');
    if(!bar||!o)return;
    bar.classList.remove('is-scroll');
    for(const c of ['','is-tight','is-tighter','is-tighter is-bare']){
      bar.classList.remove('is-tight','is-tighter','is-bare');if(c)bar.classList.add(...c.split(' '));
      if(o.scrollWidth<=o.clientWidth+1)return;
    }
    bar.classList.add('is-scroll');            // still too wide: scroll, with a fade hint on the right
  }
  /* ---------- tooltips: one floating .sr-tip per scene root ---------- */
  function tips(root){
    if(root.__tips)return;root.__tips=1;
    const tip=document.createElement('div');
    tip.className='sr-tip';tip.hidden=true;tip.setAttribute('role','tooltip');
    root.appendChild(tip);
    let cur=null;
    function show(el){
      let d;try{d=JSON.parse(el.getAttribute('data-tip'));}catch(e){return;}
      let h='<div class="sr-tip__title">'+esc(d.t)+(d.k?'<span class="sr-kbd">'+esc(d.k)+'</span>':'')+'</div>';
      if(d.r)h+='<div class="sr-tip__rule">'+esc(d.r)+'</div>';
      if(d.n&&d.n.length)h+='<div class="sr-tip__nums">'+d.n.map(n=>'<span class="sr-tag sr-tag--'+(n.kind||'')+'">'+esc(n.t)+'</span>').join('')+'</div>';
      if(d.w)h+='<div class="sr-tip__why">'+esc(d.w)+'</div>';
      tip.innerHTML=h;tip.hidden=false;
      const rr=root.getBoundingClientRect(),er=el.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;
      let x=er.left-rr.left+er.width/2-tw/2,y=er.top-rr.top-th-10;
      if(el.hasAttribute('data-tip-right')){x=er.right-rr.left+12;y=er.top-rr.top+er.height/2-th/2;}   // menus: beside the row, not over its neighbours
      else if(y<8)y=er.bottom-rr.top+10;
      y=Math.max(8,Math.min(rr.height-th-8,y));
      x=Math.max(8,Math.min(rr.width-tw-8,x));
      tip.style.left=x+'px';tip.style.top=y+'px';
      cur=el;
    }
    function hide(){tip.hidden=true;cur=null;}
    root.addEventListener('pointermove',ev=>{
      if(ev.pointerType==='touch'){return;}
      if(!ev.target.closest||!ev.target.closest('.sr-cmdbar,.sr-orders,[data-tip]')){if(cur)hide();return;}
      /* rect hit-test instead of ev.target: disabled buttons swallow pointer events */
      let hit=null;
      for(const el of root.querySelectorAll('[data-tip]')){
        const r=el.getBoundingClientRect();
        if(ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom&&r.width>0){hit=el;break;}
      }
      if(!hit){if(cur)hide();return;}
      if(hit!==cur||tip.hidden)show(hit);
    });
    root.addEventListener('pointerleave',hide);
    root.addEventListener('pointerdown',hide,true);
    root.addEventListener('focusin',ev=>{const el=ev.target.closest&&ev.target.closest('[data-tip]');if(el&&ev.target.matches&&ev.target.matches(':focus-visible'))show(el);});
    root.addEventListener('focusout',hide);
  }
  /* ---------- VS panel ---------- */
  function sideSkel(k,foe){
    return '<div class="sr-vs__side'+(foe?' sr-vs__side--foe':'')+'" data-s="'+k+'">'+
      '<div class="sr-vs__who"><span class="sr-avatar" data-k="av"></span><div><div class="sr-vs__role" data-k="role"></div><div class="sr-vs__name" data-k="name"></div></div></div>'+
      '<div class="sr-vs__mods" data-k="mods"></div>'+
      '<div class="sr-vs__total"><span data-k="tl"></span><b data-k="tv"></b></div></div>';
  }
  function vs(host){
    host.innerHTML='<div class="sr-vs">'+sideSkel('a',false)+
      '<div class="sr-vs__mid"><div class="sr-vs__odds" data-k="odds"></div><div class="sr-vs__need" data-k="need"></div>'+
      '<div class="sr-die" data-k="die">'+ico('d20')+'<b>?</b></div><div class="sr-vs__step" data-k="step"></div>'+
      '<div class="sr-vs__stamp" data-k="stamp"></div></div>'+sideSkel('d',true)+'</div>';
    const el=host.firstChild,q=(s,k)=>el.querySelector((s?'[data-s="'+s+'"] ':'')+'[data-k="'+k+'"]');
    const memo={};
    const set=(k,v,fn)=>{if(memo[k]!==v){memo[k]=v;fn(v);}};
    function side(s,m){
      const root=el.querySelector('[data-s="'+s+'"]');
      set(s+'f',!!m.foe,v=>root.classList.toggle('sr-vs__side--foe',v));
      set(s+'av',(m.initials||'')+'|'+(m.foe?1:0),()=>{const a=q(s,'av');a.className='sr-avatar'+(m.foe?' sr-avatar--foe':'');a.textContent=m.initials||'';});
      set(s+'role',m.role+'|'+m.roleIcon,()=>{q(s,'role').innerHTML=ico(m.roleIcon)+esc(m.role);});
      set(s+'name',m.name,v=>{q(s,'name').textContent=v;});
      const key=(m.mods||[]).map(x=>x.label+'|'+x.val+'|'+(x.base?1:0)).join(';');
      set(s+'mods',key,()=>{
        q(s,'mods').innerHTML=(m.mods||[]).map(x=>{
          const cls=x.base?'':x.val>=0?' is-plus':' is-minus';
          return '<div class="sr-mod'+cls+'"><span>'+esc(x.label)+'</span><b>'+(x.base?'':x.val>=0?'+':'−')+Math.abs(x.val)+'</b></div>';
        }).join('');
        memo[s+'shown']=-1;
      });
      set(s+'shown',m.shown,v=>{[...q(s,'mods').children].forEach((r,i)=>r.classList.toggle('is-pending',i>=v));});
      set(s+'tl',m.totalLabel,v=>{q(s,'tl').textContent=v;});
      set(s+'tv',m.total==null?'':String(m.total),v=>{q(s,'tv').textContent=v;});
      q(s,'tv').parentNode.classList.toggle('is-pending',m.total==null);
    }
    function setModel(m){
      side('a',m.a);side('d',m.d);
      const o=m.odds,od=q('', 'odds'),nd=q('', 'need');
      set('odds',o?o.pct:null,()=>{
        if(!o){od.textContent='';od.className='sr-vs__odds is-pending';nd.textContent='';return;}
        od.className='sr-vs__odds'+(o.pct>=60?' is-good':o.pct<45?' is-bad':'');
        od.innerHTML=o.pct+'<small>%</small>';nd.textContent='Need '+o.need+'+ on a d20';
      });
      const die=q('','die'),st=m.die||{};
      set('dstate',st.state||'idle',v=>{
        die.classList.remove('is-rolling','is-hit','is-miss');
        if(v==='rolling'){void die.offsetWidth;if(!reduced)die.classList.add('is-rolling');}
        else if(v==='hit'||v==='miss')die.classList.add('is-'+v);
      });
      set('dface',st.face==null?'?':st.face,v=>{die.querySelector('b').textContent=v;});
      set('step',m.step||'',v=>{q('','step').textContent=v;});
      set('stamp',m.stamp?m.stamp.text+'|'+(m.stamp.kind||''):'',()=>{
        q('','stamp').innerHTML=m.stamp?'<span class="sr-stamp'+(m.stamp.kind?' sr-stamp--'+m.stamp.kind:'')+'">'+esc(m.stamp.text)+'</span>':'';
      });
    }
    return {el,set:setModel,destroy(){host.innerHTML='';}};
  }
  /* ---------- menu & windows ---------- */
  function menuHtml(items){
    return items.map(it=>it.sep?'<div class="sr-menu__sep"></div>':it.head?'<div class="sr-menu__head">'+esc(it.head)+'</div>':
      '<button type="button" class="sr-menu__item'+(it.kind?' sr-menu__item--'+it.kind:'')+'"'+(it.id?' id="'+it.id+'"':'')+'>'+
      (it.icon?ico(it.icon):'')+'<span>'+esc(it.label)+'</span>'+(it.kbd?'<span class="sr-kbd">'+esc(it.kbd)+'</span>':'')+'</button>').join('');
  }
  const menus=new Set();
  function closeMenus(except){for(const m of menus)if(m.el!==except&&!m.el.hidden){m.el.hidden=true;m.btn.setAttribute('aria-expanded','false');}}
  function menuBind(el,btn){
    const m={el,btn};menus.add(m);
    btn.setAttribute('aria-haspopup','menu');btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',ev=>{
      ev.stopPropagation();
      const open=el.hidden;closeMenus(el);el.hidden=!open;btn.setAttribute('aria-expanded',String(open));
      if(open){const f=el.querySelector('button');if(f&&ev.detail===0)f.focus();}
    });
    el.addEventListener('click',ev=>{if(ev.target.closest('button')){el.hidden=true;btn.setAttribute('aria-expanded','false');}});
    document.addEventListener('pointerdown',ev=>{if(!el.hidden&&!el.contains(ev.target)&&!btn.contains(ev.target)){el.hidden=true;btn.setAttribute('aria-expanded','false');}});
    el.addEventListener('keydown',ev=>{if(ev.key==='Escape'){el.hidden=true;btn.setAttribute('aria-expanded','false');btn.focus();ev.stopPropagation();}});
    return m;
  }
  const closeBtn=attrs=>'<button type="button" class="sr-btn sr-btn--icon sr-btn--sm sr-btn--ghost" '+(attrs||'data-close')+' aria-label="Close">'+ico('clear')+'</button>';
  const winHead=(title,o)=>{o=o||{};return '<div class="sr-window__head"><span class="sr-window__title">'+title+'</span>'+
    (o.tags?'<span class="sr-window__tags">'+o.tags+'</span>':'')+(o.extra||'')+(o.close===false?'':closeBtn(o.close))+'</div>';};
  const winBody=(html,attrs)=>'<div class="sr-window__body"'+(attrs?' '+attrs:'')+'>'+(html||'')+'</div>';
  const winFoot=(btns,note,attrs)=>'<div class="sr-window__foot"'+(attrs?' '+attrs:'')+'>'+(note?'<span class="sr-window__note">'+note+'</span>':'')+'<span class="sr-spacer"></span>'+(btns||'')+'</div>';
  function win(root,o){
    const old=o.id?root.querySelector('#'+o.id):null;
    if(old)old.remove();                       // rebuilt fresh so listeners never stack
    const el=document.createElement('div');if(o.id)el.id=o.id;root.appendChild(el);
    el.className='sr-scrim';el.hidden=true;el.setAttribute('data-srwin','1');
    el.innerHTML='<div class="sr-window'+(o.size?' sr-window--'+o.size:'')+(o.accent?' sr-window--'+o.accent:'')+'" role="dialog" aria-modal="true" aria-label="'+esc(o.title)+'">'+
      winHead(esc(o.title))+winBody(o.body,'data-body')+(o.foot?'<div class="sr-window__foot" data-foot>'+o.foot+'</div>':'')+'</div>';
    let back=null;
    const api={el,body:el.querySelector('[data-body]'),foot:el.querySelector('[data-foot]'),
      open(){back=document.activeElement;el.hidden=false;const f=el.querySelector('.sr-btn--primary,.sr-btn--danger,[data-close]');if(f)f.focus();if(o.onOpen)o.onOpen(api);},
      close(){if(el.hidden)return;el.hidden=true;if(back&&back.focus)try{back.focus();}catch(e){}if(o.onClose)o.onClose();}};
    el.addEventListener('click',ev=>{if(ev.target===el||ev.target.closest('[data-close]'))api.close();});
    return api;
  }
  function topWin(root){
    const l=[...root.querySelectorAll('[data-srwin]')].filter(e=>!e.hidden);
    return l.length?l[l.length-1]:null;
  }
  function confirm(root,o){
    const w=win(root,{id:o.id||'srConfirm',title:o.title,size:'sm',body:'<p class="sr-p">'+esc(o.body||'')+'</p>',onClose:o.onClose,
      foot:'<span class="sr-spacer"></span><button type="button" class="sr-btn sr-btn--ghost" data-close>'+esc(o.cancel||'Cancel')+'</button>'+
        '<button type="button" class="sr-btn sr-btn--'+(o.danger?'danger':'primary')+'" data-ok>'+esc(o.ok||'OK')+'</button>'});
    w.el.querySelector('[data-ok]').addEventListener('click',()=>{w.close();if(o.onOk)o.onOk();});
    w.open();
    return w;
  }
  /* ---------- feedback ---------- */
  function banner(stage,o){
    const old=stage.querySelector(':scope>.sr-banner[data-hud]');if(old)old.remove();
    const b=document.createElement('div');b.className='sr-banner';b.setAttribute('data-hud','1');b.setAttribute('aria-hidden','true');
    b.innerHTML='<div class="sr-banner__txt" style="--c:'+(o.color||'var(--sr-phase-plan)')+'">'+esc(o.text)+(o.sub?'<span class="sr-banner__sub">'+esc(o.sub)+'</span>':'')+'</div>';
    stage.appendChild(b);
    setTimeout(()=>{if(b.parentNode)b.remove();},reduced?900:1400);
    return b;
  }
  const TOAST={friend:'signal',foe:'skull',action:'star',good:'check'};
  function toast(el,o){
    const kind=o.kind===undefined?'friend':o.kind;
    el.className='sr-toast'+(kind&&kind!=='good'?' sr-toast--'+kind:'');
    el.innerHTML=ico(o.icon||TOAST[kind]||'signal')+'<span>'+(o.html||'')+'</span>';
    el.hidden=false;el.style.animation='none';void el.offsetWidth;el.style.animation='';   // restart the pop-in
    clearTimeout(el.__toastT);
    el.__toastT=setTimeout(()=>{el.hidden=true;},o.ms||2800);
    return el;
  }
  function comms(feed,o){
    o=Object.assign({max:3,ttl:6000},o||{});
    const rows=[];
    function refresh(){
      const live=rows.filter(r=>!r.dead);
      live.forEach((r,i)=>r.el.classList.toggle('is-old',i<live.length-1));
      live.slice(0,Math.max(0,live.length-o.max)).forEach(r=>{r.dead=1;r.el.classList.add('is-expired');});
      while(rows.length>12){const r=rows.shift();r.el.remove();}
    }
    return {
      push(html,kind){
        const e=document.createElement('div');e.className='sr-comm'+(kind?' sr-comm--'+kind:'');e.innerHTML=html;
        feed.appendChild(e);
        const r={el:e,dead:0};rows.push(r);
        setTimeout(()=>{r.dead=1;e.classList.add('is-expired');refresh();},o.ttl);
        refresh();
      },
      clear(){rows.splice(0).forEach(r=>r.el.remove());}
    };
  }
  function phase(el,o){
    el.dataset.phase=o.phase;el.dataset.status=o.status||'calm';
    const set=(s,t)=>{const n=el.querySelector(s);if(n&&n.textContent!==t)n.textContent=t;};
    set('.sr-phase__name',o.name||'');
    if(o.text!=null)set('.sr-phase__text',o.text);
    if(o.round!=null)set('.sr-phase__round',o.round);
    const u=el.querySelector('.sr-phase__status use');
    if(u&&o.icon)u.setAttribute('href','#i-'+o.icon);
  }
  return {esc,ico,initials,avatar,tip,tag,btn,order,sep,cmdbar,render,fitBar,tips,vs,menuHtml,menuBind,win,winHead,winBody,winFoot,closeBtn,topWin,confirm,banner,toast,comms,phase,reduced};
})();
