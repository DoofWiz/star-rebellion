'use strict';
/* =====================================================================
   STAR REBELLION — the Type 3.5 test bench (hc35-bench.js), dev only
   What is left of the Arena's scene (archive/arena/arena.js) after the switch to main (docs/MAIN-SWITCH-HANDOFF.md
   S0): the 'arena' scene opens Type 3.5's opportunity board straight away, with no ruleset picker, and drives High
   Command's loop. It is reached only with ?dev in the URL (?dev#arena, or the title's Test bench button): SR.bootArena
   does nothing for players. The designer panel, the flight recorder's download and tools/run-report.js live here.
   S1 replaces it with the campaign's own scene (SR.go('space35', {mission})).
   Nothing here touches G or the campaign save.
   ===================================================================== */
(function(){
const HC=()=>window.SR_ARENA_HC,X=()=>window.SR_ARENA_HC35;
function open(){if(X().active)X().close();X().open();}
function frame(now){if(HC()&&HC().active)HC().frame(now);}
function enter(){open();}
function exit(){if(X()&&X().active)X().close();}
SR.register('arena',{enter,exit,frame});

if(SR.dev){
  window.DBGarena={get hc(){return HC()&&HC().dbg;},get hc35(){return X()&&X().dbg;},
    fn:{open35:open,backToTitle:()=>{}}};
}
})();
