// Service worker: deixa o app abrir sem internet.
// - arquivos do próprio site: tenta a internet (até 4 s); se falhar, usa a cópia guardada
// - bibliotecas (Leaflet, Firebase): ficam guardadas
// - pedaços do mapa já vistos: ficam guardados
const V='cam-v42',T='cam-tiles-v1';
const CORE=['./','index.html','relatorio.js','firebase-config.js','manifest.webmanifest','icon-192.png','icon-512.png','brasao.png','fotos/001.jpg','fotos/004.jpg','fotos/002.jpg','fotos/003.jpg','papel-timbrado.jpg','zoneamento.json','fotos/005.jpg','fotos/007.jpg','fotos/008.jpg','fotos/009.jpg','fotos/010.jpg','fotos/011.jpg','fotos/013.jpg','fotos/014.jpg','fotos/015.jpg','fotos/017.jpg','fotos/018.jpg','fotos/030.jpg','fotos/031.jpg','fotos/035.jpg','fotos/036.jpg','fotos/037.jpg','fotos/038.jpg','fotos/039.jpg','fotos/040.jpg','fotos/041.jpg','fotos/042.jpg','fotos/043.jpg','fotos/044.jpg','fotos/045.jpg','fotos/048.jpg','fotos/049.jpg','fotos/050.jpg','fotos/051.jpg'];
const LIBS=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>Promise.allSettled(CORE.concat(LIBS).map(u=>c.add(u)))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==T).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
let puts=0;
async function trim(){const c=await caches.open(T),ks=await c.keys();if(ks.length>3000)for(const k of ks.slice(0,ks.length-2500))await c.delete(k)}
async function tile(req){const c=await caches.open(T),m=await c.match(req);if(m)return m;const r=await fetch(req);if(r&&(r.ok||r.type==='opaque')){c.put(req,r.clone());if(++puts%100===0)trim()}return r}
async function lib(req){const c=await caches.open(V),m=await c.match(req);if(m)return m;const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}
async function own(req){const c=await caches.open(V);const f=fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone());return r});f.catch(()=>{});
  try{return await Promise.race([f,new Promise((_,j)=>setTimeout(j,4000))])}
  catch(e){const m=(await c.match(req,{ignoreSearch:true}))||(req.mode==='navigate'&&((await c.match('index.html'))||(await c.match('./'))));return m||f}}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.hostname==='tile.openstreetmap.org'||u.hostname==='server.arcgisonline.com')return e.respondWith(tile(r));
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com')return e.respondWith(lib(r));
  if(u.hostname==='unpkg.com'||(u.hostname==='www.gstatic.com'&&u.pathname.indexOf('/firebasejs/')===0))return e.respondWith(lib(r));
  if(u.origin===location.origin)return e.respondWith(own(r));
});
