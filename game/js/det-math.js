'use strict';
/* =====================================================================
   STAR REBELLION — DETERMINISTIC MATHS (det-math.js)
   The High Command sims (sim-hc.js, sim-hc35.js) shadow Math with this, so a run computes the same numbers in every
   browser and in node: JavaScript leaves sin, cos, atan2, hypot and the like to each engine, and their last bits
   differ, which a flight record's replay (tools/run-report.js) can't survive (docs/ARENA-HC35-FEEDBACK-1.md §3.7).
   Everything here is built from + − × ÷ and sqrt, which IEEE 754 makes exact everywhere. The kernels are fdlibm's
   (sin, cos, atan); accuracy is within a couple of ulps for the angles a fight produces. The rest of Math passes
   through unchanged.
   ===================================================================== */
window.SR_DMATH=(function(){
const M=globalThis.Math,D={};
for(const k of Object.getOwnPropertyNames(M))D[k]=M[k];
const sqrt=M.sqrt,floor=M.floor,abs=M.abs;
// range reduction to [−π/4, π/4] (Cody–Waite, two-part π/2: good for the angles a sim makes)
const INV_PIO2=6.36619772367581382433e-01,PIO2_1=1.57079632673412561417e+00,PIO2_1T=6.07710050650619224932e-11;
const S1=-1.66666666666666324348e-01,S2=8.33333333332248946124e-03,S3=-1.98412698298579493134e-04,S4=2.75573137070700676789e-06,S5=-2.50507602534068634195e-08,S6=1.58969099521155010221e-10;
const C1=4.16666666666666019037e-02,C2=-1.38888888888741095749e-03,C3=2.48015872894767294178e-05,C4=-2.75573143513906633035e-07,C5=2.08757232129817482790e-09,C6=-1.13596475577881948265e-11;
const ksin=x=>{const z=x*x,v=z*x,r=S2+z*(S3+z*(S4+z*(S5+z*S6)));return x+v*(S1+z*r);};
const kcos=x=>{const z=x*x,r=z*z*(C1+z*(C2+z*(C3+z*(C4+z*(C5+z*C6)))));return 1-0.5*z+r;};
function reduce(x){const n=floor(x*INV_PIO2+0.5);return [n,(x-n*PIO2_1)-n*PIO2_1T];}
D.sin=function(x){if(!isFinite(x))return NaN;const [n,y]=reduce(x),q=((n%4)+4)%4;return q===0?ksin(y):q===1?kcos(y):q===2?-ksin(y):-kcos(y);};
D.cos=function(x){if(!isFinite(x))return NaN;const [n,y]=reduce(x),q=((n%4)+4)%4;return q===0?kcos(y):q===1?-ksin(y):q===2?-kcos(y):ksin(y);};
D.tan=function(x){return D.sin(x)/D.cos(x);};
// atan (fdlibm s_atan.c)
const ATANHI=[4.63647609000806093515e-01,7.85398163397448278999e-01,9.82793723247329054082e-01,1.57079632679489655800e+00];
const ATANLO=[2.26987774529616870924e-17,3.06161699786838301793e-17,1.39033110312309984516e-17,6.12323399573676603587e-17];
const AT=[3.33333333333329318027e-01,-1.99999999998764832476e-01,1.42857142725034663711e-01,-1.11111104054623557880e-01,9.09088713343650656196e-02,
  -7.69187620504482999495e-02,6.66107313738753120669e-02,-5.83357013379057348645e-02,4.97687799461593236017e-02,-3.65315727442169155270e-02,1.62858201153657823623e-02];
D.atan=function(x){
  if(x!==x)return NaN;if(x===Infinity)return ATANHI[3]+ATANLO[3];if(x===-Infinity)return -ATANHI[3]-ATANLO[3];
  const neg=x<0;let ax=abs(x),id;
  if(ax<0.4375)id=-1;
  else if(ax<1.1875){if(ax<0.6875){id=0;ax=(2*ax-1)/(2+ax);}else{id=1;ax=(ax-1)/(ax+1);}}
  else if(ax<2.4375){id=2;ax=(ax-1.5)/(1+1.5*ax);}else{id=3;ax=-1/ax;}
  const z=ax*ax,w=z*z,s1=z*(AT[0]+w*(AT[2]+w*(AT[4]+w*(AT[6]+w*(AT[8]+w*AT[10]))))),s2=w*(AT[1]+w*(AT[3]+w*(AT[5]+w*(AT[7]+w*AT[9]))));
  const r=id<0?ax-ax*(s1+s2):ATANHI[id]-((ax*(s1+s2)-ATANLO[id])-ax);
  return neg?-r:r;
};
const PI=M.PI;
D.atan2=function(y,x){
  if(x!==x||y!==y)return NaN;
  if(x===0){if(y===0)return (1/x<0)?((1/y<0)?-PI:PI):y;return y>0?PI/2:-PI/2;}   // atan2(±0, -0) = ±π; (±0, +0) = ±0
  if(y===0)return x>0?y:((1/y<0)?-PI:PI);
  const a=D.atan(abs(y/x));
  return x>0?(y>0?a:-a):(y>0?PI-a:-(PI-a));
};
D.asin=function(x){if(x>1||x<-1)return NaN;return D.atan2(x,sqrt((1-x)*(1+x)));};
D.acos=function(x){if(x>1||x<-1)return NaN;return D.atan2(sqrt((1-x)*(1+x)),x);};
D.hypot=function(){let s=0;for(let i=0;i<arguments.length;i++){const v=+arguments[i];if(v===Infinity||v===-Infinity)return Infinity;s+=v*v;}return sqrt(s);};
D.pow=function(b,e){   // exact for the powers a sim uses (whole numbers and halves); the rest passes through
  if(e===0.5)return sqrt(b);if(e===2)return b*b;if(e===3)return b*b*b;if(e===1)return b;if(e===-1)return 1/b;
  if(Number.isInteger(e)&&abs(e)<=64){let r=1,p=b,n=abs(e);while(n){if(n&1)r*=p;p*=p;n>>=1;}return e<0?1/r:r;}
  return M.pow(b,e);
};
return Object.freeze(D);
})();
