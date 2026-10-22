'use strict';
/* =====================================================================
   STAR REBELLION — Type 3.5's campaign scene (space35.js): SR.go('space35', {mission})
   docs/MAIN-SWITCH-HANDOFF.md S1. Type 3.5 (High Command Hands Off) as one of the game's scenes, with no Arena: no
   ruleset picker, no ruleset list, and the designer panel only with ?dev. The screens are arena-hc35.js on High
   Command's renderer (arena-hc.js); this file owns the scene and its loop.

     SR.go('space35', {mission})   a campaign mission ({kind:'space35', missionId, name, desc, opp, seed}): window 1 of
                                   its opportunity → the mission → the debrief → SR.endMission(result) → the base
     SR.go('space35', {})          the test opportunity (dev only: ?dev#arena, the title's Test bench, the Missions
                                   tab's Test opportunity card): the demo's board, its freighter and Patrol Sweep

   The scene owns no campaign state. S1's result is a test flight's ({kind:'space35', test:true, …}), which the base
   logs and nothing else; S6 makes it the campaign's mission result.
   ===================================================================== */
(function(){
const HC=()=>window.SR_ARENA_HC,X=()=>window.SR_ARENA_HC35;
const ROOT=document.getElementById('sc-space35');
let fromCampaign=false;
function enter(params){
  const mission=params&&params.mission;
  fromCampaign=!!mission;
  const panel=document.getElementById('hcPanel');if(panel)panel.hidden=!SR.dev;   // the designer panel: dev only
  if(X().active)X().close();
  if(mission)X().open({mission,onDone:r=>{fromCampaign=false;SR.endMission(r);}});
  else X().open();
}
function exit(){if(X()&&X().active)X().close();}
function frame(now){if(HC()&&HC().active)HC().frame(now);}
SR.register('space35',{enter,exit,frame});

if(SR.dev){
  // the debug hooks: DBGspace35 (DBGarena, the old name, for the tests that grew up in the Arena)
  window.DBGspace35=window.DBGarena={get hc(){return HC()&&HC().dbg;},get hc35(){return X()&&X().dbg;},
    get fromCampaign(){return fromCampaign;},ROOT,
    fn:{open35(){if(X().active)X().close();X().open();},backToTitle:()=>{}}};
}
})();
