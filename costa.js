/* Recorte de zonas pela linha da costa (OpenStreetMap natural=coastline: a TERRA fica à ESQUERDA do sentido da linha).
   Método: varredura em linhas (resolução h) -> máscara terra∩zona -> contorno; vértices rente à costa são encaixados na costa. */
(function(root){
  const CELL=150;
  function mkProj(lat0,lon0){const kx=Math.cos(lat0*Math.PI/180)*111320,ky=110574;
    return{to:(la,lo)=>[(lo-lon0)*kx,(la-lat0)*ky],from:(x,y)=>[y/ky+lat0,x/kx+lon0]}}
  function prepare(ways,lat0,lon0){
    const pj=mkProj(lat0,lon0),W=ways.map(w=>w.map(p=>pj.to(p[0],p[1]))),segs=[],grid=new Map();
    W.forEach((w,wi)=>{for(let i=0;i+1<w.length;i++){const s={wi,i,ax:w[i][0],ay:w[i][1],bx:w[i+1][0],by:w[i+1][1]};
      const id=segs.push(s)-1,x0=Math.floor(Math.min(s.ax,s.bx)/CELL),x1=Math.floor(Math.max(s.ax,s.bx)/CELL),y0=Math.floor(Math.min(s.ay,s.by)/CELL),y1=Math.floor(Math.max(s.ay,s.by)/CELL);
      for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const k=gx+','+gy;let a=grid.get(k);if(!a){a=[];grid.set(k,a)}a.push(id)}}});
    return{pj,W,segs,grid}}
  const ln=(x,y)=>{const l=Math.hypot(x,y)||1;return[-y/l,x/l]};
  function nearest(C,px,py,R){
    const gx=Math.floor(px/CELL),gy=Math.floor(py/CELL),maxr=Math.ceil(R/CELL);let best=null;const seen=new Set();
    for(let r=0;r<=maxr;r++){
      if(best&&best.d<=(r-1)*CELL)break;
      for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
        const a=C.grid.get((gx+dx)+','+(gy+dy));if(!a)continue;
        for(const id of a){if(seen.has(id))continue;seen.add(id);const s=C.segs[id],vx=s.bx-s.ax,vy=s.by-s.ay,L2=vx*vx+vy*vy;
          let t=L2?((px-s.ax)*vx+(py-s.ay)*vy)/L2:0;t=Math.max(0,Math.min(1,t));
          const qx=s.ax+vx*t,qy=s.ay+vy*t,d=Math.hypot(px-qx,py-qy);
          if(!best||d<best.d)best={d,s,t,qx,qy}}}}
    if(!best||best.d>R)return null;
    const s=best.s,w=C.W[s.wi];let n=ln(s.bx-s.ax,s.by-s.ay);
    if(best.t<=0&&s.i>0){const m=ln(s.ax-w[s.i-1][0],s.ay-w[s.i-1][1]);n=[n[0]+m[0],n[1]+m[1]]}
    else if(best.t>=1&&s.i+2<w.length){const m=ln(w[s.i+2][0]-s.bx,w[s.i+2][1]-s.by);n=[n[0]+m[0],n[1]+m[1]]}
    best.land=((px-best.qx)*n[0]+(py-best.qy)*n[1])>=0;best.pos=s.i+best.t;return best}
  function dp(pts,tol){
    if(pts.length<3)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
    while(st.length){const[a,b]=st.pop();let md=0,mi=-1;const[ax,ay]=pts[a],[bx,by]=pts[b],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1;
      for(let i=a+1;i<b;i++){const d=Math.abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/L;if(d>md){md=d;mi=i}}
      if(md>tol&&mi>0){keep[mi]=1;st.push([a,mi],[mi,b])}}
    return pts.filter((_,i)=>keep[i])}
  const area=r=>{let a=0;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length];a+=p[0]*q[1]-q[0]*p[1]}return a/2};
  /* ring: [[lat,lon],...]. Retorna {pieces:[[[lat,lon],...],...], changed} */
  function clip(ring,C){
    if(ring.length<3||!C.segs.length)return{pieces:[ring],changed:false};
    const P=ring.map(p=>C.pj.to(p[0],p[1]));
    let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;P.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])});
    const h=Math.max(3,Math.max(x1-x0,y1-y0)/1400),pad=2;x0-=pad*h;y0-=pad*h;
    const Wc=Math.ceil((x1-x0)/h)+pad+1,Hc=Math.ceil((y1-y0)/h)+pad+1;
    const rowP=Array.from({length:Hc},()=>[]),rowC=Array.from({length:Hc},()=>[]);
    const addCross=(arr,ax,ay,bx,by,type)=>{if(ay===by)return;const lo=Math.min(ay,by),hi=Math.max(ay,by);
      let r0=Math.max(0,Math.ceil((lo-y0)/h-.5)),r1=Math.min(Hc-1,Math.floor((hi-y0)/h-.5));
      for(let r=r0;r<=r1;r++){const yc=y0+(r+.5)*h;if(!(yc>=lo&&yc<hi))continue;const t=(yc-ay)/(by-ay);arr[r].push([ax+(bx-ax)*t,type?(by>ay?1:-1):0])}};
    for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];addCross(rowP,a[0],a[1],b[0],b[1],false)}
    for(const s of C.segs){if(Math.max(s.ay,s.by)<y0||Math.min(s.ay,s.by)>y0+Hc*h||Math.max(s.ax,s.bx)<x0-1e5)continue;addCross(rowC,s.ax,s.ay,s.bx,s.by,true)}
    const mask=new Uint8Array(Wc*Hc);let nP=0,nM=0;
    for(let r=0;r<Hc;r++){
      const pc=rowP[r].map(e=>e[0]).sort((a,b)=>a-b);if(pc.length<2)continue;
      const cc=rowC[r].sort((a,b)=>a[0]-b[0]);let land;const spans=[];
      if(cc.length){let cur=cc[0][1]>0;/* subida: oeste é terra */ spans.push([-1e18,cc[0][0],cur]);
        for(let k=0;k<cc.length;k++){const st=cc[k][1]<0; /* descida: leste é terra */ spans.push([cc[k][0],k+1<cc.length?cc[k+1][0]:1e18,st])}}
      else{const yc=y0+(r+.5)*h,xm=(pc[0]+pc[pc.length-1])/2,n=nearest(C,xm,yc,20000);land=n?n.land:true;spans.push([-1e18,1e18,land])}
      for(let k=0;k+1<pc.length;k+=2){let a=pc[k],b=pc[k+1];
        const ca=Math.max(0,Math.ceil((a-x0)/h-.5)),cb=Math.min(Wc-1,Math.floor((b-x0)/h-.5));
        for(let c=ca;c<=cb;c++){nP++;const xc=x0+(c+.5)*h;let ok=false;
          for(const sp of spans){if(xc>=sp[0]&&xc<sp[1]){ok=sp[2];break}}
          if(ok){mask[r*Wc+c]=1;nM++}}}}
    if(!nP)return{pieces:[ring],changed:false};
    if(nM>=nP*0.997||nP-nM<300/(h*h))return{pieces:[ring],changed:false};
    /* contorno */
    const V=Wc+1,out=new Map(),ed=[];
    const addE=(a,b)=>{const e={a,b,used:false};ed.push(e);let l=out.get(a);if(!l){l=[];out.set(a,l)}l.push(e)};
    const M=(r,c)=>r>=0&&r<Hc&&c>=0&&c<Wc&&mask[r*Wc+c]===1;
    for(let r=0;r<Hc;r++)for(let c=0;c<Wc;c++){if(!mask[r*Wc+c])continue;
      if(!M(r-1,c))addE(r*V+c,r*V+c+1);if(!M(r,c+1))addE(r*V+c+1,(r+1)*V+c+1);
      if(!M(r+1,c))addE((r+1)*V+c+1,(r+1)*V+c);if(!M(r,c-1))addE((r+1)*V+c,r*V+c)}
    const rings=[];
    for(const e0 of ed){if(e0.used)continue;const pts=[];let e=e0;
      while(e&&!e.used){e.used=true;pts.push(e.a);const l=out.get(e.b)||[];e=l.find(x=>!x.used)||null;if(e&&e.a===e0.a&&false)break}
      if(pts.length>3)rings.push(pts.map(k=>[x0+(k%V)*h,y0+Math.floor(k/V)*h]))}
    const minA=Math.max(150,40*h*h),res=[];
    for(const R of rings){const A=area(R);if(A<minA)continue; /* anti-horário = terra; horário = lagoa/furo (ignorado) */
      /* encaixe na costa */
      const S=R.map(p=>{const n=nearest(C,p[0],p[1],2.2*h);return n?{x:n.qx,y:n.qy,wi:n.s.wi,pos:n.pos,snap:true}:{x:p[0],y:p[1],snap:false}});
      const o=[];for(const p of S){const q=o[o.length-1];
        if(p.snap&&q&&q.snap&&q.wi===p.wi&&q.pos!==p.pos&&Math.abs(q.pos-p.pos)<80){const w=C.W[p.wi];
          if(p.pos>q.pos){for(let v=Math.floor(q.pos)+1;v<=Math.floor(p.pos);v++)o.push({x:w[v][0],y:w[v][1],wi:p.wi,pos:v,snap:true})}
          else{for(let v=Math.ceil(q.pos)-1;v>=Math.ceil(p.pos);v--)o.push({x:w[v][0],y:w[v][1],wi:p.wi,pos:v,snap:true})}}
        o.push(p)}
      /* simplificação por trechos */
      const n=o.length;let st=0;while(st<n&&o[st].snap===o[(st+n-1)%n].snap&&st<n-1)st++;
      const rot=o.slice(st).concat(o.slice(0,st)),runs=[];
      for(const p of rot){const l=runs[runs.length-1];if(l&&l.s===p.snap)l.p.push([p.x,p.y]);else runs.push({s:p.snap,p:[[p.x,p.y]]})}
      let fin=[];
      if(runs.length===1){const pts=runs[0].p,tol=runs[0].s?0.8:Math.max(1,1.3*h);let m=0,md=-1;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[0][0],pts[i][1]-pts[0][1]);if(d>md){md=d;m=i}}
        fin=dp(pts.slice(0,m+1),tol).slice(0,-1).concat(dp(pts.slice(m).concat([pts[0]]),tol).slice(0,-1))}
      else runs.forEach((ru,i)=>{const nx=runs[(i+1)%runs.length].p[0],pts=ru.p.concat([nx]);const d=dp(pts,ru.s?0.8:Math.max(1,1.3*h));fin=fin.concat(d.slice(0,-1))});
      fin=fin.filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>0.05);
      if(fin.length>=3&&Math.abs(area(fin))>=minA)res.push({A:Math.abs(area(fin)),r:fin.map(p=>C.pj.from(p[0],p[1]))})}
    res.sort((a,b)=>b.A-a.A);
    if(!res.length)return{pieces:[ring],changed:false};
    return{pieces:res.map(x=>x.r),changed:true}}
  const api={prepare,clip,nearest};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Costa=api;
})(typeof self!=='undefined'?self:this);
