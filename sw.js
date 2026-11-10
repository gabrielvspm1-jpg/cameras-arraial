// Service worker mínimo: só permite instalar o app; não guarda nada em cache,
// assim o site sempre abre na versão mais nova.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
