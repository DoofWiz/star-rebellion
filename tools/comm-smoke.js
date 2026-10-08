/* Smoke test for the comm burst (docs/ui/SCREENS-HANDOFF.md §3): node tools/comm-smoke.js (needs NODE_PATH=$(npm root -g)).
   Each kind of information has one home: who and their cultivation, the channel, our narration as log lines, the
   source's words in one bubble, the lead a signal adds. With no signal, a quiet note and Close channel. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 await pg.evaluate(()=>window.SR.go('base',{}));
 await pg.waitForTimeout(600);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(()=>{
  const D=window.DBGbase,f=D.fn,G=D.G,out={};
  const $=s=>document.querySelector('#winCardB '+s),$$=s=>[...document.querySelectorAll('#winCardB '+s)];
  const clear=()=>{for(let i=0;i<10&&f.getWin();i++)f.closeWin();};
  const read=()=>({win:f.getWin(),cls:document.querySelector('#winCardB').className,
    who:!!$('.cm-who .cm-ava'),name:($('.cm-name')||{}).textContent,lvl:($('.cm-lvl')||{}).textContent,
    meter:$('.cm-meter')?$('.cm-meter').getAttribute('style'):'',gain:($('.cm-gain')||{}).textContent||'',
    chan:($('.cm-chan__top')||{}).textContent||'',wave:!!$('.cm-chan canvas#commStatic'),
    logs:$$('.cm-log').map(e=>e.textContent),bubbles:$$('.cm-bubble').length,tag:($('.cm-bubble .sr-tag')||{}).textContent||'',
    lead:$('.cm-lead')?[$('.cm-lead__k').textContent,$('.cm-lead__n').textContent,$('.cm-lead__m').textContent]:null,
    quiet:($('.cm-quiet')||{}).textContent||'',btns:$$('.sr-window__foot .sr-btn').map(e=>e.textContent).join(','),
    note:!!$('.sr-window__note'),quote:!!$('.sr-quote'),text:document.querySelector('#winCardB').textContent});
  clear();
  const src=G.sources.find(s=>s.alive);
  // ---- first contact with a signal waiting (Cass's story signal: Steal the Cross)
  src.contacted=false;src.cult=30;
  f.srcContact(src);
  out.sig=read();out.sigSrc=src.signal&&src.signal.kind;
  // ---- Acknowledge: the mission goes on the board; the channel stays open with the result and nothing waiting
  document.querySelector('#winCardB [data-follow]').click();
  out.after=read();out.board=G.missions.some(m=>m.id==='stealcross'||m.story==='stealcross'||m.name==='Steal the Cross');
  clear();
  // ---- a space lead from the pool
  src.signal={kind:'mission',mid:'toi',text:'“A flight instructor. Busy man.”'};src.contacted=true;
  f.srcContact(src);out.space=read();
  clear();src.signal=null;
  // ---- a contact with nothing waiting
  f.openWin('comm',{src,payload:{lines:['Coded burst to '+src.loc+'. Quiet line.']}});
  out.none=read();
  clear();
  // ---- a level-up fills the meter
  src.contacted=false;src.cult=98;src.signal=null;const l0=src.level;
  f.setRng(()=>0.99);f.srcContact(src);f.setRng(Math.random);
  out.up=[read(),l0,src.level];
  clear();
  // ---- Cass's first transmission uses the same bubble
  f.openWin('cassIntro');out.cass=read();
  clear();
  return out;
 });
 const s=r.sig;
 ok(s.win==='comm'&&/\bcm-win\b/.test(s.cls),'the comm burst is the cm-win window '+s.cls);
 ok(s.who&&s.name===r.sig.name&&/^Source · Level \d$/.test(s.lvl),'the who strip: avatar, name, source level '+[s.who,s.name,s.lvl]);
 ok(/--from:30;--to:33/.test(s.meter)&&s.gain==='Cultivation +3','the cultivation meter grows from old to new '+s.meter+' '+s.gain);
 ok(/Carrier locked/.test(s.chan)&&/Encrypted · rebel net · lag 4\.2s · voices masked/.test(s.chan)&&s.wave,'the channel strip holds the flavour and the waveform '+s.chan);
 ok(s.logs.length===1&&/^Coded burst to .+ is responding on our secure channel\.$/.test(s.logs[0]),'the narration is a log line '+s.logs);
 ok(s.bubbles===1&&s.tag==='Signal'&&!s.quote,'one bubble with the Signal tag, no old quote box '+[s.bubbles,s.tag,s.quote]);
 ok(s.lead&&s.lead[0]==='New Lead – Added to Mission Board'&&s.lead[1]==='Steal the Cross'&&/^Ground · \w+ risk · Akkaro · Dustfall$/.test(s.lead[2]),'the lead card '+s.lead);
 ok(s.btns==='Acknowledge'&&!s.note,'Acknowledge, no flavour text in the footer '+s.btns);
 ok(!/Cultivation increased/.test(s.text),'no bare "Cultivation increased." line');
 ok(r.board&&r.after.win==='comm'&&r.after.bubbles===0&&!r.after.lead&&r.after.quiet==='No signal waiting.'&&r.after.btns==='Close channel'&&/New mission on the board/.test(r.after.logs.join(' ')),
   'acknowledging puts the mission on the board and leaves a quiet channel '+JSON.stringify([r.board,r.after.logs,r.after.quiet,r.after.btns]));
 ok(r.space.lead&&/^Space · High risk/.test(r.space.lead[2]),'a space lead reads Space · risk '+(r.space.lead||[]).join('|'));
 ok(r.none.bubbles===0&&!r.none.lead&&r.none.quiet==='No signal waiting.'&&r.none.btns==='Close channel'&&!r.none.note&&r.none.gain==='','no signal: the quiet note and Close channel '+JSON.stringify([r.none.quiet,r.none.btns]));
 const [u,l0,l1]=r.up;
 ok(l1===l0+1&&/--to:100/.test(u.meter)&&u.lvl==='Source · Level '+l1&&u.gain==='Cultivation +2','a level-up fills the meter and names the new level '+[u.meter,u.lvl,u.gain]);
 ok(r.cass.win==='cassIntro'&&r.cass.bubbles===1&&/\bcm-win\b/.test(r.cass.cls)&&!r.cass.quote&&!r.cass.note&&r.cass.wave,'Cass’s transmission uses the comm bubble '+[r.cass.bubbles,r.cass.cls]);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('comm-smoke: all passed');
})();
