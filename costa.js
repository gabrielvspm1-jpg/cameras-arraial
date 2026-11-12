/* Ajuste de polígonos à linha da costa (OpenStreetMap natural=coastline: a terra fica à ESQUERDA do sentido da linha). */
(function(root){
  const CELL=150,STEP=6,RMAX=700;
  function mkProj(lat0,lon0){const kx=Math.cos(lat0*Math.PI/180)*111320,ky=110574;
    return{to:(la,lo)=>[(lo-lon0)*kx,(la-lat0)*ky],from:(x,y)=>[y/ky+lat0,x/kx+lon0]}}
  function build(ways,pj){
    const W=ways.map(w=>w.map(p=>pj.to(p[0],p[1]))),segs=[],grid=new Map();
    W.forEach((w,wi)=>{for(let i=0;i+1<w.length;i++){const s={wi,i,ax:w[i][0],ay:w[i][1],bx:w[i+1][0],by:w[i+1][1]};
      const id=segs.push(s)-1,x0=Math.floor(Math.min(s.ax,s.bx)/CELL),x1=Math.floor(Math.max(s.ax,s.bx)/CELL),y0=Math.floor(Math.min(s.ay,s.by)/CELL),y1=Math.floor(Math.max(s.ay,s.by)/CELL);
      for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const k=gx+','+gy;let a=grid.get(k);if(!a){a=[];grid.set(k,a)}a.push(id)}}});
    return{W,segs,grid}}
  const ln=(x,y)=>{const l=Math.hypot(x,y)||1;return[-y/l,x/l]}; // normal à esquerda
  function nearest(C,px,py,R){
    const gx=Math.floor(px/CELL),gy=Math.floor(py/CELL),maxr=Math.ceil(R/CELL);let best=null;const seen=new Set();
    for(let r=0;r<=maxr;r++){
      if(best&&best.d<=(r-1)*CELL)break;
      for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
        const a=C.grid.get((gx+dx)+','+(gy+dy));if(!a)continue;
        for(const id of a){if(seen.has(id))continue;seen.add(id);const s=C.segs[id],vx=s.bx-s.ax,vy=s.by-s.ay,L2=vx*vx+vy*vy;
          let t=L2?((px-s.ax)*vx+(py-s.ay)*vy)/L2:0;const raw=t;t=Math.max(0,Math.min(1,t));
          const qx=s.ax+vx*t,qy=s.ay+vy*t,d=Math.hypot(px-qx,py-qy);
          if(!best||d<best.d)best={d,s,t,raw,qx,qy,id}}}}
    if(!best||best.d>R)return null;
    const s=best.s,w=C.W[s.wi];let n=ln(s.bx-s.ax,s.by-s.ay);
    if(best.t<=0&&s.i>0){const m=ln(s.ax-w[s.i-1][0],s.ay-w[s.i-1][1]);n=[n[0]+m[0],n[1]+m[1]]}
    else if(best.t>=1&&s.i+2<w.length){const m=ln(w[s.i+2][0]-s.bx,w[s.i+2][1]-s.by);n=[n[0]+m[0],n[1]+m[1]]}
    const side=(px-best.qx)*n[0]+(py-best.qy)*n[1];
    best.sea=side<0&&best.d>0.05;best.pos=s.i+best.t;return best}
  function dp(pts,tol){
    if(pts.length<4)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
    while(st.length){const[a,b]=st.pop();let md=0,mi=-1;const[ax,ay]=pts[a],[bx,by]=pts[b],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1;
      for(let i=a+1;i<b;i++){const d=Math.abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/L;if(d>md){md=d;mi=i}}
      if(md>tol&&mi>0){keep[mi]=1;st.push([a,mi],[mi,b])}}
    return pts.filter((_,i)=>keep[i])}
  /* ring: [[lat,lon],...] (sem repetir o primeiro). ways: [[ [lat,lon],... ],...]. Retorna {ring, moved} */
  function refine(ring,ways){
    if(ring.length<3||!ways.length)return{ring,moved:0};
    const lat0=ring.reduce((a,p)=>a+p[0],0)/ring.length,lon0=ring.reduce((a,p)=>a+p[1],0)/ring.length,pj=mkProj(lat0,lon0),C=build(ways,pj);
    const P=ring.map(p=>pj.to(p[0],p[1])),D=[];
    for(let k=0;k<P.length;k++){const a=P[k],b=P[(k+1)%P.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/STEP));
      for(let j=0;j<n;j++)D.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n])}
    let moved=0;const N=D.map(p=>{const r=nearest(C,p[0],p[1],RMAX);if(r&&r.sea){moved++;return{x:r.qx,y:r.qy,wi:r.s.wi,pos:r.pos,snap:true}}return{x:p[0],y:p[1]}});
    const out=[];
    for(let i=0;i<N.length;i++){const p=N[i],q=out[out.length-1];
      if(p.snap&&q&&q.snap&&q.wi===p.wi&&q.pos!==p.pos&&Math.abs(q.pos-p.pos)<60){const w=C.W[p.wi],up=p.pos>q.pos;
        if(up){for(let v=Math.floor(q.pos)+1;v<=Math.floor(p.pos);v++)out.push({x:w[v][0],y:w[v][1],wi:p.wi,pos:v,snap:true})}
        else{for(let v=Math.ceil(q.pos)-1;v>=Math.ceil(p.pos);v--)out.push({x:w[v][0],y:w[v][1],wi:p.wi,pos:v,snap:true})}}
      out.push(p)}
    let pts=out.map(p=>[p.x,p.y]).filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>0.05);
    if(pts.length>6){let m=0,md=-1;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[0][0],pts[i][1]-pts[0][1]);if(d>md){md=d;m=i}}
      const A=dp(pts.slice(0,m+1),0.8),B=dp(pts.slice(m).concat([pts[0]]),0.8);pts=A.concat(B.slice(1,-1))}
    return{ring:pts.map(p=>pj.from(p[0],p[1])),moved}}
  const api={refine,build,nearest,mkProj};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Costa=api;
})(typeof self!=='undefined'?self:this);
