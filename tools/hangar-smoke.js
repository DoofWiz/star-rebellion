/* The bigger base and the 4 × 4 Hangar (DESIGN_BLOCKERS C-32): node tools/hangar-smoke.js (needs NODE_PATH=$(npm root -g)).
   - A new campaign is 14 × 18 with one Hangar section: a large pad (the derelict Graf's) and two small pads.
   - Large ships need large pads; small ships take small pads, then any large pad left. The derelict holds its pad.
   - Half a section flips between two small pads and one large pad, free, while every ship still has a pad.
   - A new section needs a 4 × 4 block of cleared floor, starts with four small pads and joins the Hangar beside it.
   - The Ready Lounge and Maintenance Bay take small pads. The market holds a pad of the right size.
   - An old 8 × 11 save is upgraded: the map grows, the cave hangar becomes floor, its ships and upgrades move to the new sections.
   - The map pans and zooms, and the map and walk-in draw without errors. */
const {chromium}=require('playwright');
const path=require('path');
const url='file://'+path.resolve(__dirname,'../game/index.html')+'#test';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(url);await pg.waitForTimeout(1200);
 const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
 const r=await pg.evaluate(async()=>{
  const D=window.DBGbase,f=D.fn,G=()=>D.G,out={};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clone=()=>JSON.parse(JSON.stringify(G()));
  const fresh=clone();
  const H=()=>G().rooms.filter(x=>x.key==='hangar');
  const pc=()=>{const c=f.padCounts();return c.L+'L'+c.S+'S';};
  // a new campaign
  const h0=H()[0];
  out.born=[G().rows,G().cols,H().length,h0.w,h0.h,h0.halves.join(''),pc(),f.fighterCap(),f.isLargeShip('graf'),f.isLargeShip('talon')].join();
  // the derelict holds the large pad; two fighters fill the small ones; a third has nowhere to go
  out.fits=[f.berthFree('talon',2),f.berthFree('talon',3),f.berthFree('graf')].join();
  G().fighters.push(f.newFighter({id:'h1',name:'Red One',cls:'talon',hull:100}));
  out.flipL=f.flipBlocked(h0,0);   // the derelict needs its large pad
  G().wreck.restored=true;G().fighters.push(f.newFighter({id:'graf',name:'Marta',cls:'graf',hull:70}));
  out.flipL2=f.flipBlocked(h0,0);  // so does the Marta
  G().fighters=G().fighters.filter(x=>x.cls!=='graf');
  out.flip=[f.flipHalf(h0,0),h0.halves.join(''),pc(),f.berthFree('graf'),f.flipHalf(h0,1),h0.halves.join(''),pc()].join();
  f.flipHalf(h0,0);f.flipHalf(h0,1);h0.halves=['L','S'];
  // the market holds a pad of the right size
  G().fighters.push(f.newFighter({id:'h2',name:'Red Two',cls:'talon',hull:100}));   // two fighters: the large pad is the last
  out.market=[f.padFree('graf'),f.padFree('talon'),f.padFree('talon',2)].join();
  G().fighters=G().fighters.filter(x=>x.id!=='h2');
  // a new section: needs a 4 × 4 block of floor
  out.noBlock=[String(f.hangarBlockAt(4,3)),(()=>{const c=G().credits;f.buildAt(4,3,'hangar');return G().credits===c&&H().length===1;})()].join();
  for(let r=6;r<10;r++)for(let c=13;c<17;c++)G().grid[r][c]={t:'floor'};
  const bl=f.hangarBlockAt(8,15);
  G().credits=99999;G().materials=99999;
  const c0=G().credits,cost=f.buildCostAt('hangar',8,15);
  f.buildAt(8,15,'hangar');
  const s2=H()[1];
  out.build=[bl&&bl.r,bl&&bl.c,bl&&bl.adj,s2&&s2.w,s2&&s2.halves.join(''),s2&&s2.build&&s2.build.days,c0-G().credits===cost.c,G().grid[9][16].room].join();
  delete s2.build;
  out.merged=[f.clusterOf(h0).length,pc(),f.fighterCap()].join();
  // the Ready Lounge and Maintenance Bay take small pads (the front-most first)
  h0.up=['lounge'];
  const lp=f.hangarPads().find(p=>p.conv==='lounge');
  out.lounge=[pc(),lp&&lp.rm===s2,lp&&lp.r,lp&&lp.c].join();
  h0.up=[];
  // an old save: 8 × 11, the cave hangar at rows 2-3, columns 1-2, four ships and a Refuelling Station
  const old=JSON.parse(JSON.stringify(fresh));
  old.v=5;old.rows=8;old.cols=11;
  old.grid=old.grid.slice(0,8).map(row=>row.slice(0,11));
  old.grid[4][10]={t:'rock'};old.grid[7][3]={t:'rock'};
  for(const [r,c] of [[2,9],[2,10],[3,9],[3,10],[5,8],[5,9],[5,10],[6,9],[6,10]])old.grid[r][c]={t:'rock'};
  old.rooms=old.rooms.filter(x=>x.key!=='hangar');
  old.rooms.push({id:'rm_2_1',key:'hangar',r:2,c:1,w:2,h:2,up:['refuel']},{id:'rm_4_9',key:'hangar',r:4,c:9,w:1,h:1,up:['refuel']});
  for(const [r,c] of [[2,1],[2,2],[3,1],[3,2],[4,9]])old.grid[r][c]={t:'room',room:'hangar'};
  old.grid[1][3]={t:'floor'};   // something the player dug: kept
  old.wreck={restored:true,restoring:0};
  old.fighters=['graf','talon','cross','talon','cross'].map((cls,i)=>({id:'o'+i,name:'Old '+i,cls,hull:100}));
  old.upq=[{key:'hangar',k:'arm',ids:['rm_2_1'],days:2}];
  f.restoreCampaign({campaign:old,started:true});
  const OH=H();
  out.mig=[G().v,G().rows,G().cols,G().grid[2][1].t,G().grid[4][9].t,G().grid[1][3].t,G().grid[4][10].t,OH.length,OH.map(x=>x.halves.join('')).join('|'),
    OH.every(x=>x.up.includes('refuel')),f.fleetFits(G().fighters.map(x=>x.cls)),G().upq[0].ids[0]===OH[0].id,G().grid[2][13].room].join();
  // the camera: zoom about a point, and the map and walk-in draw
  f.restoreCampaign({campaign:JSON.parse(JSON.stringify(fresh)),started:true});
  const cam=f.baseCam_(),z0=cam.z;f.zoomCam(2,400,400);out.zoom=[z0,cam.z>z0].join();
  f.zoomCam(0.1,400,400);out.zoomOut=cam.z;
  f.syncUI();await sleep(250);
  f.enterRoom('hangar');await sleep(250);f.exitRoomView();f.syncUI();
  return out;
 });
 ok(r.born==='14,18,1,4,4,LS,1L2S,3,true,false','a new campaign: 14 × 18, one 4 × 4 section with a large pad and two small '+r.born);
 ok(r.fits==='true,false,false','the derelict holds the large pad; two fighters fit, not three; no second hauler '+r.fits);
 ok(/large pad/.test(r.flipL)&&/large pad/.test(r.flipL2),'the large pad cannot be split under a hauler or the derelict '+r.flipL+' / '+r.flipL2);
 ok(r.flip==='true,SS,0L4S,false,true,SL,1L2S','halves flip free while every ship fits '+r.flip);
 ok(r.market==='true,true,false','the market holds a pad of the right size '+r.market);
 ok(r.noBlock==='null,true','no 4 × 4 floor: no section, nothing charged '+r.noBlock);
 ok(r.build==='6,13,true,4,SS,4,true,hangar','a section builds on a 4 × 4 floor block beside the Hangar '+r.build);
 ok(r.merged==='2,1L6S,7','the new section joins the Hangar with four small pads '+r.merged);
 ok(r.lounge==='1L5S,true,8,15','the Ready Lounge takes the front-most small pad '+r.lounge);
 ok(r.mig==='6,14,18,floor,floor,floor,floor,2,LS|SS,true,true,true,hangar','an old save gets the new ground and sections for its fleet '+r.mig);
 ok(r.zoom==='1,true'&&r.zoomOut===1,'the map zooms in about a point and back out to fit '+r.zoom+' '+r.zoomOut);
 if(errs.length)fails.push('PAGEERRORS '+errs.slice(0,3).join(' || '));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'hangar-smoke: all checks passed');
 await b.close();process.exit(fails.length?1:0);
})();
