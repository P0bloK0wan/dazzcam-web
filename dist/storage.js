const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
let connection;
async function db(){if(connection)return connection;const r=indexedDB.open('dazz-web',1);r.onupgradeneeded=()=>r.result.createObjectStore('media',{keyPath:'id'});connection=await request(r);return connection;}
export async function allMedia(){const d=await db();return (await request(d.transaction('media').objectStore('media').getAll())).sort((a,b)=>b.created-a.created);}
export async function saveMedia(item){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('media','readwrite');t.objectStore('media').put(item);t.oncomplete=()=>resolve(item);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Armazenamento indisponível'));});}
export async function removeMedia(id){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('media','readwrite');t.objectStore('media').delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
export async function clearMedia(){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('media','readwrite');t.objectStore('media').clear();t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
