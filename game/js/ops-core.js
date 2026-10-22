/* =====================================================================
   SR_OPS: the opportunity grammar and the background simulation, for every mission mode (docs/OPPORTUNITY-SYSTEM.md;
   built first for Type 3.5, docs/ARENA-HC35-FEEDBACK-3.md). Mode-agnostic: nothing here knows about ships, wings or a
   sim state. A mode reaches it through an adapter (space: sim-hc35.js) that says what "in trouble" means, who leads
   whom, and how to give a unit a job.
   - the vocabulary: thing types, tags, verbs and their families (§3);
   - derive(): the primaries an opportunity offers, and the objects an order can take (§3.3, §4);
   - the help decisions: whether a unit in trouble asks, and whether a leader sends help (§5.2), as a seeded score
   ===================================================================== */
(function(){
'use strict';
/* the families (§3.3, the designer's names); surrender: the default answer to a crew's offer (playtest 3, §3.5) */
const FAMILIES={take:{name:'Take it',surrender:'take'},deny:{name:'Deny it',surrender:'no'},use:{name:'Use it',surrender:'no'},bait:{name:'Bait with it',surrender:'spare'}};
const FAMILY_OF_NAME=Object.fromEntries(Object.entries(FAMILIES).map(([k,f])=>[f.name,k]));
const TYPES=['vessel','craft','person','structure','cargo','force','area','point'];
const TAGS=['destructible','disableable','boardable','capturable','extractable','lootable','surrenders','calls-help','escapes','crashable','taggable','hackable','ambushable'];
/* the verbs as primaries (§3.3): family, what the object needs, and the fallbacks (the next best, in order; a fallback
   from another family is allowed: Ambush → Clear the escort) */
const VERBS={
  steal:  {family:'take',needs:['boardable','escapes'],fallbacks:['strip','pirate']},
  pirate: {family:'take',needs:['surrenders','lootable'],fallbacks:['strip','steal']},
  strip:  {family:'take',needs:['lootable'],fallbacks:['steal','pirate']},
  destroy:{family:'deny',needs:['destructible'],notType:'force',fallbacks:['crash']},   // a force is Cleared, not Destroyed
  crash:  {family:'deny',needs:['crashable'],fallbacks:['destroy']},
  clear:  {family:'deny',type:'force',needs:['destructible'],fallbacks:[]},
  tag:    {family:'use',needs:['taggable','escapes'],fallbacks:[]},
  ambush: {family:'bait',type:'force',needs:['ambushable'],fallbacks:['clear:escort']},
};
/* the verbs as orders (§4): what the object picker offers. 'friendly' objects (wings) come from the adapter */
const ORDER_OBJ={
  destroy:t=>has(t,'destructible')&&t.side!=='reb',disable:t=>has(t,'disableable'),board:t=>has(t,'boardable'),haul:t=>has(t,'lootable'),
  intimidate:t=>has(t,'surrenders'),tag:t=>has(t,'taggable'),suppress:t=>(t.parts||[]).includes('turrets')||(t.type==='force'&&!!t.guards),
  ambush:t=>has(t,'ambushable'),escort:t=>t.type==='vessel'&&has(t,'boardable'),
};
const has=(t,tag)=>!!t&&(t.tags||[]).includes(tag);
const thing=(opp,id)=>(opp.cast||[]).find(t=>t.id===id)||null;
function applies(verb,t){const v=VERBS[verb];if(!v||!t)return false;if(v.type&&t.type!==v.type)return false;if(v.notType&&t.type===v.notType)return false;return v.needs.every(n=>has(t,n));}
/* the primaries an opportunity offers: the verbs of its allowed families that apply to its key object; with no key
   object, to any force, structure or area (a primary on a non-key thing carries its object: {verb, obj}) */
function primaries(opp){
  const out=[],fams=opp.families||Object.keys(FAMILIES),key=opp.key&&thing(opp,opp.key);
  for(const k in VERBS){const v=VERBS[k];if(!fams.includes(v.family))continue;
    // with a key object: the verbs that apply to it, and Bait's verbs on the force it draws in (the key is the bait)
    if(key){if(applies(k,key))out.push({verb:k,obj:key.id});else if(v.type==='force'&&v.family==='bait'){const f=(opp.cast||[]).find(t=>applies(k,t));if(f)out.push({verb:k,obj:f.id});}}
    else{const f=(opp.cast||[]).find(t=>['force','structure','area'].includes(t.type)&&t.side!=='reb'&&applies(k,t));if(f)out.push({verb:k,obj:f.id});}}
  return out;
}
/* the objects an order's picker lists (§4): only the cast things the verb applies to */
function objectsFor(opp,verb){const f=ORDER_OBJ[verb];return f?(opp.cast||[]).filter(f):[];}
/* a primary's fallbacks, as {verb, obj} (a 'verb:obj' entry names its object) */
function fallbacks(verb){return ((VERBS[verb]||{}).fallbacks||[]).map(x=>{const [v,o]=x.split(':');return {verb:v,obj:o||null};});}

/* =====================================================================
   The help decisions (§5.2, playtest 3 §3.4.1). Weights are placeholders, set by the mode (its Duties panel)
   ===================================================================== */
const WEIGHTS={AID_BASE:0.3,AID_THRESH:0.5,ASK_THRESH:0.3,AID_NOISE:0.1,
  P_EAGER:0.25,P_EVEN:0,P_STEADY:-0.05,P_NERVOUS:-0.15,FRIEND:0.3,RIVAL:-0.3,
  T_PINNED2:0.2,T_LOWHULL:0.2,T_GREEN:0.1,J_WAITING:0.2,J_CRITICAL:-1,H_HURT:-0.3,D_PER_K:0.1,D_FREE:1500,URGENT:-0.2};
/* traits: what each adds to helping (aid) and to asking (ask); unknown traits count 0 */
const TRAIT_AID={protective:{aid:0.3,ask:0},reckless:{aid:0.1,ask:-0.2},'by-the-book':{aid:-0.1,ask:0.05},green:{aid:0,ask:0.1},proud:{aid:0,ask:-0.25},loyal:{aid:0.2,ask:0},cold:{aid:-0.25,ask:0},coward:{aid:-0.3,ask:0.2}};
const PERSONA={eager:'P_EAGER',even:'P_EVEN',steady:'P_STEADY',nervous:'P_NERVOUS'};
/* the one mapping table (docs/MAIN-SWITCH-HANDOFF.md decision 10, S6): a rebel's Character and Rebel Traits to what they
   do in Type 3.5. aid: the help weights' key above (TRAIT_AID); pair: a relationship with another pilot (friend or rival).
   The persona (eager, steady, even) is High Command's own, read from the same keys (sim-hc.js personalityOf: reckless,
   brave, hothead are eager; steady, cautious, veteran are steady). A key not here does nothing in 3.5 (C-89 lists them).
   Placeholders: the designer's to change */
const TRAIT_MAP={
  reckless:{aid:'reckless'},hothead:{aid:'proud'},cautious:{aid:'by-the-book'},loyal:{aid:'loyal'},empathetic:{aid:'protective'},
  cynical:{aid:'cold'},pragmatic:{aid:'by-the-book'},selfpres:{aid:'coward'},cowardly:{aid:'coward'},hegsoldier:{aid:'by-the-book'},
  hegofficer:{aid:'by-the-book'},panicky:{aid:'coward'},vengeful:{aid:'reckless'},avenging:{aid:'reckless'},hardened:{aid:'cold'},
  desens:{aid:'cold'},decorated:{aid:'proud'},hero:{aid:'proud'},celebrity:{aid:'proud'},
  friends:{pair:'friend'},love:{pair:'friend'},family:{pair:'friend'},oldfriends:{pair:'friend'},battlebros:{pair:'friend'},
  mentored:{pair:'friend'},mentoring:{pair:'friend'},owes:{pair:'friend'},saved:{pair:'friend'},rivals:{pair:'rival'},
  brave:{},steady:{},veteran:{}};
/* a pilot's 3.5 traits from their rebel traits ([{k, with}]); idOf(rebel id) is the partner's unit id, if they fly. A rookie
   (level 2 or lower) is green */
function traitsOf(tr,level,idOf){
  const out=[];
  for(const t of tr||[]){const m=TRAIT_MAP[t.k];if(!m)continue;
    if(m.aid&&!out.includes(m.aid))out.push(m.aid);
    if(m.pair&&t.with){const id=idOf?idOf(t.with):null;if(id)out.push({k:m.pair,with:id});}}
  if((level||1)<=2&&!out.includes('green'))out.push('green');
  return out;
}
/* a unit as the core sees it: {id, persona, traits:[k or {k:'friend'|'rival', with:id}], hull (0–1), green} ;
   trouble: {attackers, pinned}; job: 'waiting'|'ordinary'|'critical'; dist: between helper and unit; urgent: the
   primary nearly done */
function traitSum(u,key,other){let s=0;for(const t of u.traits||[]){if(typeof t==='string'){const w=TRAIT_AID[t];if(w)s+=w[key]||0;}
  else if(key==='aid'&&other&&t.with===other.id)s+=t.k==='friend'?WEIGHTS.FRIEND:t.k==='rival'?WEIGHTS.RIVAL:0;}return s;}
function troubleTerms(u,tr){const W=WEIGHTS;let s=0;if(tr.attackers>=2)s+=W.T_PINNED2;if(u.hull<0.25)s+=W.T_LOWHULL;if(u.green)s+=W.T_GREEN;return s;}
/* would the leader (or a helper) help this unit? returns {score, ok, top:[two biggest factors]} */
function aidScore(c,rng){
  const W=WEIGHTS,f=[];const add=(k,v)=>{if(v)f.push([k,v]);};
  add('base',W.AID_BASE);add('persona',W[PERSONA[c.decider.persona]]||0);add('traits',traitSum(c.decider,'aid',c.unit));
  add('their trouble',troubleTerms(c.unit,c.trouble));add('the job',c.job==='waiting'?W.J_WAITING:c.job==='critical'?W.J_CRITICAL:0);
  add('own hurt',c.helper&&c.helper.hull<0.4?W.H_HURT:0);add('distance',-W.D_PER_K*Math.max(0,(c.dist-W.D_FREE)/1000));add('urgency',c.urgent?W.URGENT:0);
  const noise=((rng?rng():0.5)*2-1)*W.AID_NOISE;
  const score=f.reduce((a,x)=>a+x[1],0)+noise;
  return {score,ok:c.job!=='critical'&&score>=W.AID_THRESH,top:f.filter(x=>x[0]!=='base').sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,2).map(x=>x[0]+' '+(x[1]>0?'+':'')+x[1].toFixed(2))};
}
/* would the unit in trouble call for help? */
function askScore(u,tr,rng){
  const W=WEIGHTS,s=W.AID_BASE*0.5+(W[PERSONA[u.persona]]||0)+traitSum(u,'ask')+troubleTerms(u,tr)+(tr.pinned?0.1:0)+((rng?rng():0.5)*2-1)*W.AID_NOISE;
  return {score:s,ok:s>=W.ASK_THRESH};
}
/* the leader's call on a unit in trouble: who goes (the nearest one or two candidates that pass), or the leader, or
   nobody. cands: [{unit, job, dist}] (the leader among them, flagged self); returns {send:[ids], self:bool, why, top} */
function decideAid(leader,unit,trouble,cands,opt,rng){
  opt=opt||{};const n=trouble.attackers>=2?2:1,go=[],why=[];let best=null;
  const sorted=cands.slice().sort((a,b)=>a.dist-b.dist);
  for(const c of sorted){const r=aidScore({decider:leader,helper:c.unit,unit,trouble,job:c.job,dist:c.dist,urgent:opt.urgent},rng);
    if(!best||r.score>best.score)best=r;if(r.ok&&go.length<n)go.push(c);}
  if(!go.length)return {send:[],self:false,refused:true,top:best?best.top:[],score:best?best.score:0};
  return {send:go.map(c=>c.unit.id),self:go.some(c=>c.self),refused:false,top:best.top,score:best.score};
}

/* a tiny self-check for node (playtest 3 test 12): a stub adapter, no ships */
function selfTest(){
  const rng=(s=>()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;});
  const lead={id:'sera',persona:'even',traits:['protective'],hull:1},ollo={id:'ollo',persona:'nervous',traits:['green','proud'],hull:0.6,green:true},brask={id:'brask',persona:'even',traits:[],hull:1};
  const a=decideAid(lead,ollo,{attackers:2,pinned:true},[{unit:brask,job:'waiting',dist:1200},{unit:lead,job:'waiting',dist:900,self:true}],{},rng(7));
  const b=decideAid(lead,ollo,{attackers:2,pinned:true},[{unit:brask,job:'waiting',dist:1200},{unit:lead,job:'waiting',dist:900,self:true}],{},rng(7));
  const c=decideAid(lead,ollo,{attackers:2,pinned:true},[{unit:brask,job:'critical',dist:1200}],{},rng(7));
  return {sends:a.send.length>0,same:JSON.stringify(a)===JSON.stringify(b),critical:c.refused};
}
const api={FAMILIES,FAMILY_OF_NAME,TYPES,TAGS,VERBS,ORDER_OBJ,WEIGHTS,TRAIT_AID,TRAIT_MAP,traitsOf,has,thing,applies,primaries,objectsFor,fallbacks,aidScore,askScore,decideAid,selfTest};
if(typeof window!=='undefined')window.SR_OPS=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
