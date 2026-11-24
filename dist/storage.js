const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
let connection;
function db() {
  if (!connection) {
    const opening = indexedDB.open('dazz-web', 2);
    opening.onupgradeneeded = () => {
      if (!opening.result.objectStoreNames.contains('media')) {
        opening.result.createObjectStore('media', {keyPath: 'id'});
      }
      opening.result.createObjectStore('projects', {keyPath: 'id'});
    };
    connection = request(opening).then(database => {
      database.onversionchange = () => { database.close(); connection = null; };
      return database;
    }).catch(error => { connection = null; throw error; });
  }
  return connection;
}

export async function loadProject(id) {
  const database = await db();
  return request(database.transaction('projects').objectStore('projects').get(id));
}

export async function saveProject(project) {
  const snapshot = structuredClone(project);
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('projects', 'readwrite');
    transaction.objectStore('projects').put(snapshot);
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || new Error('Não foi possível salvar o rascunho.'));
  });
}

export async function getMedia(id) {
  const database = await db();
  return request(database.transaction('media').objectStore('media').get(id));
}

export async function allMedia(){const d=await db();return (await request(d.transaction('media').objectStore('media').getAll())).filter(item => !item.archived).sort((a,b)=>b.created-a.created);}
export async function saveMedia(item){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('media','readwrite');t.objectStore('media').put(item);t.oncomplete=()=>resolve(item);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Armazenamento indisponível'));});}
async function removeAlbumItems(id) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['media','projects'],'readwrite');
    const store = transaction.objectStore('media');
    const projects = transaction.objectStore('projects').getAll();
    projects.onsuccess = () => {
      const references = new Set(projects.result.flatMap(project =>
        ['layers','clips','audio','overlays'].flatMap(key =>
          (project[key] || []).map(entry => entry.mediaId)
        )
      ));
      const opening = id === undefined ? store.openCursor() : store.openCursor(IDBKeyRange.only(id));
      opening.onsuccess = () => {
        const cursor = opening.result;
        if (!cursor) return;
        if (references.has(cursor.primaryKey)) cursor.update({...cursor.value, archived:true});
        else cursor.delete();
        cursor.continue();
      };
    };
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || new Error('Não foi possível atualizar o álbum.'));
  });
}
export const removeMedia = id => removeAlbumItems(id);
export const clearMedia = () => removeAlbumItems();
