(()=>{
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- build the bonsai as a 3D point cloud ---------- */
let seed=11;const R=()=>(seed=seed*16807%2147483647)/2147483647;
const P=[];                                   // x,y,z,type,rnd
const add=(x,y,z,t)=>P.push(x,y,z,t,R());     // types: 0 wood, 1 leaf, 2 pot, 3 soil
const trunk=t=>({x:Math.sin(t*2.6)*3.5-t*2,y:t*24,z:Math.cos(t*2)*2.2});
for(let i=0;i<=70;i++){
  const t=i/70,c=trunk(t),r=2.7-1.6*t+Math.max(0,.12-t)*9;
  for(let j=0;j<12;j++){const a=j/12*6.283,rr=r*(1+(R()-.5)*.3);add(c.x+Math.cos(a)*rr,c.y,c.z+Math.sin(a)*rr,0)}
}
const pad=(cx,cy,cz,rx,ry,n)=>{
  for(let i=0;i<n;i++){
    const th=R()*6.283,ph=Math.acos(2*R()-1),k=.72+.28*R(),cp=Math.cos(ph),sp=Math.sin(ph);
    add(cx+rx*k*sp*Math.cos(th),cy+ry*k*(cp<0?cp*.55:cp),cz+rx*k*sp*Math.sin(th),1);
  }
};
const branch=(ts,az,len,rise,rx,n)=>{
  const b=trunk(ts);let e;
  for(let k=0;k<=24;k++){
    const u=k/24,x=b.x+Math.cos(az)*len*u,z=b.z+Math.sin(az)*len*u,y=b.y+rise*Math.sin(u*1.4),r=.95*(1-u)+.3;
    for(let j=0;j<5;j++){const a=j*1.257;add(x+Math.cos(a)*r,y+Math.sin(a)*r*.6,z+Math.sin(a)*r,0)}
    e=[x,y,z];
  }
  pad(e[0],e[1]+1.6,e[2],rx,3,n);
};
branch(.30,2.6,12,3,6.5,520);
branch(.45,-.5,13.5,4.5,7.2,540);
branch(.60,.9,11,4,6.2,480);
branch(.75,-2.3,10,3.5,5.8,440);
const top=trunk(1);pad(top.x,27.5,top.z,8,3.8,700);
for(let y=-4;y<=0;y+=.4){const r=7+(y+4)/4*2;for(let j=0;j<56;j++){const a=j/56*6.283;add(Math.cos(a)*r,y,Math.sin(a)*r,2)}}
for(let i=0;i<320;i++){const a=R()*6.283,r=8.4*Math.sqrt(R());add(Math.cos(a)*r,-.3,Math.sin(a)*r,3)}

/* ---------- swords ---------- */
const swords=[
  {R:26,H:20,tilt:.45,v:.55,a:0},
  {R:31,H:15,tilt:-.5,v:-.42,a:2.1},
  {R:21,H:25,tilt:.9,v:.7,a:4.2}
];

/* ---------- ascii renderer ---------- */
const L=10, RAMPS=[".:-=+*#%@",".,:;ioO&%#@",".:-=+#",".,:;","-=+*#@","*",".."];
const COLS=[[[96,68,44],[226,186,136]],[[38,84,68],[191,227,210]],[[70,82,98],[182,196,214]],[[52,42,36],[110,92,78]],
            [[110,120,132],[244,248,252]],[[150,30,28],[240,80,70]],[[110,120,132],[244,248,252]]];
const pal=[];
COLS.forEach((c,t)=>{for(let l=0;l<L;l++){const u=l/(L-1),m=i=>Math.round(c[0][i]+(c[1][i]-c[0][i])*u);pal.push(`rgba(${m(0)},${m(1)},${m(2)},${t===6?.55:.95})`)}});

let W,H,cw,chh,cols,rows,S,zb,ch,col,FS;
const D=100;
function resize(){
  const dpr=Math.min(devicePixelRatio||1,2);
  W=innerWidth;H=innerHeight;
  cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  FS=W<640?10:12;
  ctx.font=`${FS}px "JetBrains Mono",monospace`;ctx.textBaseline='top';
  cw=ctx.measureText('M').width;chh=FS*1.2;
  cols=Math.ceil(W/cw)+1;rows=Math.ceil(H/chh)+1;
  zb=new Float32Array(cols*rows);ch=new Uint8Array(cols*rows);col=new Uint16Array(cols*rows);
  S=Math.min(H*.62/42,W*.92/66);
}

let cyaw=1,syaw=0,cp=1,sp=0;
function put(x,y,z,t,rnd,bo){
  const xr=x*cyaw-z*syaw,zr=x*syaw+z*cyaw,yc=y-17,y2=yc*cp-zr*sp,z2=yc*sp+zr*cp;
  const f=D/(D+z2),gx=((W/2+xr*f*S)/cw)|0,gy=((H*(W<640?.34:.52)-y2*f*S)/chh)|0;
  if(gx<0||gy<0||gx>=cols||gy>=rows)return;
  const i=gy*cols+gx;if(z2>=zb[i])return;zb[i]=z2;
  let b=bo!==undefined?bo:(1-(z2+38)/76*.62)*(.55+.45*rnd);
  b=b<.05?.05:b>1?1:b;
  if(t===1)b*=.78+.22*Math.min(1,Math.max(0,y/36));
  if(t===4||t===5)b=.4+.6*b;
  const rp=RAMPS[t];
  ch[i]=rp.charCodeAt(Math.min(rp.length-1,(b*rp.length)|0));
  col[i]=t*L+Math.min(L-1,(b*L)|0);
}

let yaw=.6,tx=.5,ty=.5,px=.5,py=.5,boost=1,drag=false,last=0;
function draw(dt){
  px+=(tx-px)*.06;py+=(ty-py)*.06;
  const a=yaw+(px-.5)*.5,p=.2+(py-.5)*.3;
  cyaw=Math.cos(a);syaw=Math.sin(a);cp=Math.cos(p);sp=Math.sin(p);
  zb.fill(1e9);
  for(let i=0;i<P.length;i+=5)put(P[i],P[i+1],P[i+2],P[i+3],P[i+4]);
  swords.forEach(s=>{
    s.a+=dt*s.v*boost;
    const sg=Math.sign(s.v),T=s.tilt,cT=Math.cos(T),sT=Math.sin(T);
    const pos=q=>{const z0=s.R*Math.sin(q);return[s.R*Math.cos(q),s.H-z0*sT,z0*cT]};
    const dir=q=>{const dz=Math.cos(q)*sg;return[-Math.sin(q)*sg,-dz*sT,dz*cT]};
    const c=pos(s.a),d=dir(s.a),o=[c[0]-d[0]*7.5,c[1]-d[1]*7.5,c[2]-d[2]*7.5];
    const l=[d[1]*sT-d[2]*cT,-d[0]*sT,d[0]*cT];
    for(let i=0;i<=44;i++){
      const t=i/44,bx=o[0]+d[0]*t*16,by=o[1]+d[1]*t*16,bz=o[2]+d[2]*t*16,bo=i===44?1:undefined;
      put(bx,by,bz,4,.5,bo);
      if(t<.7){const w=.5*(1-t/.7);put(bx+l[0]*w,by+l[1]*w,bz+l[2]*w,4,.7);put(bx-l[0]*w,by-l[1]*w,bz-l[2]*w,4,.3)}
    }
    for(let g=-5;g<=5;g++)put(o[0]+l[0]*g*.55,o[1]+l[1]*g*.55,o[2]+l[2]*g*.55,4,.8);
    for(let g=1;g<=10;g++)put(o[0]-d[0]*g*.45,o[1]-d[1]*g*.45,o[2]-d[2]*g*.45,5,.5);
    for(let k=1;k<=22;k++){
      const q=s.a-sg*k*.05,pp=pos(q),dd=dir(q);
      put(pp[0]+dd[0]*8.5,pp[1]+dd[1]*8.5,pp[2]+dd[2]*8.5,6,0,(1-k/22)*.85);
    }
  });
  ctx.clearRect(0,0,W,H);
  for(let i=0,n=cols*rows;i<n;i++){
    if(zb[i]<1e8){ctx.fillStyle=pal[col[i]];ctx.fillText(String.fromCharCode(ch[i]),(i%cols)*cw,((i/cols)|0)*chh)}
  }
}
function loop(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  boost+=(1-boost)*Math.min(1,dt*1.4);
  yaw+=dt*.16;
  draw(dt);requestAnimationFrame(loop);
}
function start(){
  resize();
  if(reduce){draw(0)}else requestAnimationFrame(t=>{last=t;loop(t)});
}
addEventListener('resize',()=>{resize();if(reduce)draw(0)});

/* ---------- interaction ---------- */
const skip=e=>e.target.closest('a,button,.glass');
addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&!skip(e))drag=true;if(!skip(e))boost=3.2});
addEventListener('pointerup',()=>drag=false);
addEventListener('pointermove',e=>{
  tx=e.clientX/innerWidth;ty=e.clientY/innerHeight;
  if(drag)yaw+=e.movementX*.008;
  document.querySelectorAll('.glass,.btn').forEach(el=>{
    const r=el.getBoundingClientRect();
    el.style.setProperty('--mx',(e.clientX-r.left)+'px');
    el.style.setProperty('--my',(e.clientY-r.top)+'px');
  });
});

(document.fonts&&document.fonts.load?document.fonts.load('12px "JetBrains Mono"'):Promise.resolve()).catch(()=>{}).then(start);
})();
