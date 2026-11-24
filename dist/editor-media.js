import {getMedia, saveMedia} from './storage.js';
import {parseCube, applyCube} from './editor-model.js';

const cache = new Map();
const luts = new Map();

export async function importMedia(file) {
  const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' :
    file.type.startsWith('image/') ? 'photo' : null;
  if (!type) throw new Error('Escolha uma imagem, vídeo ou áudio compatível.');
  const item = {id:crypto.randomUUID(), name:file.name, created:Date.now(), blob:file, type, camera:'Importado'};
  await decode(item);
  try {
    await saveMedia(item);
  } catch (error) {
    forget(item.id);
    throw error;
  }
  return item;
}

function decode(item) {
  if (cache.has(item.id)) return cache.get(item.id);
  const url = URL.createObjectURL(item.blob);
  const element = document.createElement(item.type === 'photo' ? 'img' : item.type);
  const loading = new Promise((resolve, reject) => {
    element.addEventListener(item.type === 'photo' ? 'load' : 'loadedmetadata', async () => {
      if (item.type !== 'photo' && !Number.isFinite(element.duration)) await recoverDuration(element);
      resolve({item, element, url});
    }, {once:true});
    element.addEventListener('error', () => reject(new Error('O navegador não conseguiu abrir esta mídia.')), {once:true});
    element.preload = 'auto';
    element.playsInline = true;
    element.src = url;
  }).catch(error => {
    URL.revokeObjectURL(url);
    cache.delete(item.id);
    throw error;
  });
  cache.set(item.id, loading);
  return loading;
}

function recoverDuration(media) {
  return new Promise(resolve => {
    const controller = new AbortController();
    const finish = () => { clearTimeout(timer); controller.abort(); media.currentTime = 0; resolve(); };
    const timer = setTimeout(finish,1800);
    for (const event of ['durationchange','seeked','error']) {
      media.addEventListener(event,() => {
        if (Number.isFinite(media.duration) || event === 'error') finish();
      },{signal:controller.signal});
    }
    try { media.currentTime = 1e10; } catch { finish(); }
  });
}

export async function resolveMedia(id) {
  if (cache.has(id)) return cache.get(id);
  const item = await getMedia(id);
  if (!item) throw new Error('Uma mídia do projeto foi removida do álbum.');
  return decode(item);
}

export async function forget(id) {
  const entry = cache.get(id);
  cache.delete(id);
  const media = await entry?.catch(() => null);
  if (!media) return;
  media.element.pause?.();
  URL.revokeObjectURL(media.url);
}

export function prepareLut(source) {
  if (!source) return null;
  if (!luts.has(source)) luts.set(source, parseCube(source));
  return luts.get(source);
}

const work = document.createElement('canvas');
const context = work.getContext('2d', {willReadFrequently:true});

export function paintMedia(ctx, element, x, y, width, height, options = {}) {
  const sourceWidth = element.videoWidth || element.naturalWidth;
  const sourceHeight = element.videoHeight || element.naturalHeight;
  if (!sourceWidth || !sourceHeight || (element.tagName === 'VIDEO' && element.readyState < 2)) return;
  const rotation = options.rotation || 0;
  const swap = rotation % 180 !== 0;
  const w = swap ? height : width;
  const h = swap ? width : height;
  const zoom = options.zoom || 1;
  const scale = Math.max(w/sourceWidth, h/sourceHeight) * zoom;
  const sw = w/scale, sh = h/scale;
  const sx = (sourceWidth-sw)/2, sy = (sourceHeight-sh)/2;
  const filter = `brightness(${2 ** (options.exposure || 0)}) contrast(${100+(options.contrast || 0)}%) saturate(${100+(options.saturation || 0)}%)`;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x,y,width,height);
  ctx.clip();
  ctx.translate(x+width/2,y+height/2);
  ctx.rotate(rotation*Math.PI/180);
  const lut = options.lut;
  if (lut) {
    const factor = Math.min(1,1080 / Math.max(w,h));
    const ww = Math.max(1, Math.round(w*factor)), wh = Math.max(1, Math.round(h*factor));
    if (work.width !== ww || work.height !== wh) { work.width = ww; work.height = wh; }
    context.clearRect(0,0,ww,wh);
    context.filter = filter;
    context.drawImage(element,sx,sy,sw,sh,0,0,ww,wh);
    const pixels = context.getImageData(0,0,ww,wh);
    applyCube(pixels.data,lut);
    context.putImageData(pixels,0,0);
    ctx.drawImage(work,-w/2,-h/2,w,h);
  } else {
    ctx.filter = filter;
    ctx.drawImage(element,sx,sy,sw,sh,-w/2,-h/2,w,h);
    ctx.filter = 'none';
  }
  ctx.restore();
}

export function paintText(ctx, text, x, y, size, width, color = '#fff') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = size*.13;
  const lines = text.split('\n');
  lines.forEach((line,index) => ctx.fillText(line,x,y+index*size*1.2,width));
  ctx.restore();
}

export function mediaSize(ratio, edge) {
  const [w,h] = ratio.split(':').map(Number);
  return w >= h ? [edge, Math.round(edge*h/w)] : [Math.round(edge*w/h),edge];
}

export function element(tag, attributes = {}, label) {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(attributes)) node[key] = value;
  if (label !== undefined) node.textContent = label;
  return node;
}

export function fileInput(input, handler, report) {
  input.onchange = async () => {
    const files = Array.from(input.files);
    input.value = '';
    if (!files.length) return;
    try { await handler(files); } catch (error) { report(error.message); }
  };
}

export function bindFields(root, state, update) {
  for (const input of root.querySelectorAll('[data-field]')) {
    const key = input.dataset.field;
    const type = input.type;
    input.value = state?.[key] ?? '';
    input.disabled = !state;
    input.onchange = () => update(key, ['range','number'].includes(type) ? Number(input.value) : input.value);
  }
}

export async function assetCatalog() {
  const response = await fetch('./assets/studio/catalog.json');
  if (!response.ok) return [];
  return (await response.json()).assets;
}
