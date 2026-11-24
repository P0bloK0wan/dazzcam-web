import {blobFromCanvas} from './renderer.js';
import {download, studio, zipMedia} from './app.js';
import {loadProject, saveProject} from './storage.js';
import {slideName} from './editor-model.js';
import {assetCatalog, bindFields, element, fileInput, importDemoPhoto, importMedia, mediaSize, paintMedia, paintText, prepareLut, resolveMedia} from './editor-media.js';

const initial = () => ({id:'photo', version:1, slides:1, ratio:'4:5', background:'#252a29', layers:[]});
const layerDefaults = {x:0,y:0,width:100,height:100,rotation:0,zoom:1,exposure:0,contrast:0,saturation:0,opacity:100};
const copy = value => structuredClone(value);

export function createPhotoEditor(root, chooseAlbum, chooseCatalog) {
  root.innerHTML = `
    <div class="editor-heading"><h1>Foto e carrossel</h1><div class="editor-tools">
      <label class="editor-file">Adicionar foto<input type="file" accept="image/*" multiple data-import></label>
      <button data-demo>Testar com amostra</button><button data-album>Do álbum</button><button data-catalog>Do catálogo</button><button data-layout disabled>Modelos</button><button data-undo>Desfazer</button><button data-redo>Refazer</button>
      <select aria-label="Formato de imagem" data-format><option value="png">PNG</option><option value="jpg">JPEG</option></select>
      <button class="primary" data-export>Exportar</button>
    </div></div>
    <div class="editor-layout">
      <div class="editor-stage">
        <div class="editor-preview"><canvas aria-label="Prévia do slide"></canvas></div>
        <div class="editor-timeline"><h2>Slides</h2><div class="editor-strip" data-slides></div></div>
        <div class="editor-timeline"><h2>Camadas</h2><div class="editor-strip" data-layers></div>
          <div class="editor-tools"><button data-text>Adicionar texto</button><button data-overlay>Adicionar adesivo</button><button data-remove>Remover camada</button></div>
        </div>
      </div>
      <aside class="editor-inspector">
        <details open><summary>Carrossel</summary><div class="editor-fields">
          <label>Slides <input data-project="slides" type="number" min="1" max="20" value="1"></label>
          <label>Proporção <select data-project="ratio"><option>4:5</option><option>1:1</option><option>9:16</option><option>16:9</option><option>3:4</option></select></label>
          <label>Fundo <input data-project="background" type="color"></label>
        </div></details>
        <details open><summary>Posição e recorte</summary><div class="editor-fields" data-position>
          <label>Posição horizontal · % de um slide <input data-field="x" type="number" min="-100" max="2100" step="1"></label>
          <label>Posição vertical · % <input data-field="y" type="number" min="-100" max="200" step="1"></label>
          <label>Largura · % <input data-field="width" type="number" min="1" max="2000"></label>
          <label>Altura · % <input data-field="height" type="number" min="1" max="200"></label>
          <label>Rotação <select data-field="rotation"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label>
          <label>Zoom de recorte <input data-field="zoom" type="range" min="1" max="4" step=".05"></label>
          <label>Opacidade <input data-field="opacity" type="range" min="0" max="100"></label>
        </div></details>
        <details><summary>Cor e acabamento</summary><div class="editor-fields" data-color>
          <label>Exposição <input data-field="exposure" type="range" min="-2" max="2" step=".1"></label>
          <label>Contraste <input data-field="contrast" type="range" min="-60" max="60"></label>
          <label>Saturação <input data-field="saturation" type="range" min="-100" max="100"></label>
          <label>Moldura <select data-field="frame"><option value="">Nenhuma</option><option value="white">Branca</option><option value="dark">Escura</option></select></label>
          <label>Textura <select data-texture><option value="">Nenhuma</option></select></label>
          <label>LUT do catálogo <select data-catalog-lut><option value="">Nenhuma</option></select></label>
          <label class="editor-file">Importar LUT<input data-lut type="file" accept=".cube"></label>
        </div></details>
        <details data-text-panel><summary>Texto</summary><div class="editor-fields" data-copy>
          <label>Texto <textarea data-field="text"></textarea></label><label>Cor <input data-field="color" type="color"></label>
          <label>Tamanho · % <input data-field="size" type="number" min="1" max="80"></label>
        </div></details>
      </aside>
    </div><p data-status class="editor-status" role="status"></p>`;
  const $ = selector => root.querySelector(selector);
  const report = message => { $('[data-status]').textContent = message; };
  const canvas = $('canvas');
  const undo = [], redo = [];
  let project = initial(), selected = null, slide = 0, generation = 0;
  let mediaAssets = [];
  let layouts = [];
  fetch('./assets/studio/layouts.json').then(response => response.ok ? response.json() : [])
    .then(items => {
      layouts = items;
      for (const ratio of new Set(items.map(item => item.ratio))) {
        const select = $('[data-project="ratio"]');
        if (![...select.options].some(option => option.value === ratio)) {
          const [w,h] = ratio.split(':');
          select.append(element('option',{value:ratio},w+' × '+h));
        }
      }
      $('[data-layout]').disabled = !layouts.length;
      refresh();
    }).catch(() => {});

  const ready = loadProject('photo').then(saved => {
    if (saved?.version === 1) project = saved;
    selected = project.layers[0]?.id;
    refresh();
  }).catch(error => report(error.message));
  assetCatalog().then(assets => {
    mediaAssets = assets;
    for (const asset of assets) {
      if (asset.category === 'frame' && asset.kind === 'image') $('[data-field=frame]').append(element('option',{value:asset.file},asset.id));
      if (asset.kind === 'lut') $('[data-catalog-lut]').append(element('option',{value:asset.file},asset.id));
      if (['texture','grain','leak','dust'].includes(asset.category) && asset.kind === 'image') {
        $('[data-texture]').append(element('option',{value:asset.file},asset.id));
      }
    }
    refresh();
  }).catch(() => { /* Local imports remain available offline. */ });

  function persist() {
    saveProject(project).catch(error => report(error.message));
  }
  function commit(update) {
    undo.push(copy(project));
    if (undo.length > 40) undo.shift();
    redo.length = 0;
    update();
    persist();
    refresh();
  }
  function history(from,to) {
    if (!from.length) return;
    to.push(project);
    project = from.pop();
    persist();
    refresh();
  }
  const active = () => project.layers.find(layer => layer.id === selected);
  function patch(key,value) {
    if (!active()) return;
    const field = root.querySelector(`[data-field="${key}"]`);
    if (field?.min && field.type === 'number') value = Math.max(+field.min, Math.min(+field.max,value));
    commit(() => { active()[key] = key === 'rotation' ? Number(value) : value; });
  }
  const overlays = new Map();
  function decoration(file) {
    if (!overlays.has(file)) {
      const image = new Image();
      image.src = './assets/studio/'+file;
      overlays.set(file,image.decode().then(() => image).catch(() => null));
    }
    return overlays.get(file);
  }
  async function draw(target, index, edge, snapshot, showSlots = false) {
    const [w,h] = mediaSize(snapshot.ratio,edge);
    const prepared = await Promise.all(snapshot.layers.map(async layer => {
      const media = layer.mediaId ? await resolveMedia(layer.mediaId).catch(() => null) : null;
      const overlay = layer.asset ? await decoration(layer.asset) : null;
      const texture = layer.texture ? await decoration(layer.texture) : null;
      const frame = layer.frame?.includes('.') ? await decoration(layer.frame) : null;
      return {layer, media, overlay, texture, frame};
    }));
    target.width = w;
    target.height = h;
    const ctx = target.getContext('2d');
    ctx.fillStyle = snapshot.background;
    ctx.fillRect(0,0,w,h);
    for (const {layer,media,overlay,texture,frame} of prepared) {
      const x = (layer.x/100-index)*w, y = layer.y*h/100, lw = layer.width*w/100, lh = layer.height*h/100;
      if (x+lw <= 0 || x >= w) continue;
      ctx.save();
      ctx.globalAlpha = (layer.opacity ?? 100)/100;
      if (layer.kind === 'photo' && !layer.mediaId && showSlots) {
        ctx.fillStyle = '#84929538';
        ctx.fillRect(x,y,lw,lh);
        ctx.strokeStyle = '#dbe0df';
        ctx.setLineDash([7,5]);
        ctx.strokeRect(x+2,y+2,Math.max(0,lw-4),Math.max(0,lh-4));
        paintText(ctx,layer.name,x+lw/2,y+lh/2,Math.min(20,lh*.24),lw*.9);
      } else if (layer.kind === 'text') {
        paintText(ctx,layer.text,x+lw/2,y+lh/2,h*layer.size/100,lw,layer.color);
      } else if (overlay) {
        const scale = Math.min(lw/overlay.naturalWidth,lh/overlay.naturalHeight);
        const ow=overlay.naturalWidth*scale, oh=overlay.naturalHeight*scale;
        ctx.drawImage(overlay,x+(lw-ow)/2,y+(lh-oh)/2,ow,oh);
      } else if (media) {
        paintMedia(ctx,media.element,x,y,lw,lh,{...layer,lut:prepareLut(layer.lut)});
        if (texture) {
          ctx.globalCompositeOperation = 'soft-light';
          ctx.drawImage(texture,x,y,lw,lh);
          ctx.globalCompositeOperation = 'source-over';
        }
        if (frame) ctx.drawImage(frame,x,y,lw,lh);
        else if (layer.frame) {
          ctx.strokeStyle = layer.frame === 'white' ? '#fff7e8' : '#181818';
          ctx.lineWidth = Math.max(2,w*.015);
          ctx.strokeRect(x+ctx.lineWidth/2,y+ctx.lineWidth/2,lw-ctx.lineWidth,lh-ctx.lineWidth);
        }
      }
      ctx.restore();
    }
  }
  async function redraw() {
    const request = ++generation;
    const draft = document.createElement('canvas');
    try {
      await draw(draft,slide,800,copy(project),true);
      if (request !== generation) return;
      canvas.width = draft.width;
      canvas.height = draft.height;
      canvas.getContext('2d').drawImage(draft,0,0);
    } catch (error) { report(error.message); }
  }
  function refresh() {
    slide = Math.min(slide,project.slides-1);
    if (!active()) selected = project.layers.at(-1)?.id;
    const ratios = $('[data-project="ratio"]');
    if (![...ratios.options].some(option => option.value === project.ratio)) {
      ratios.append(element('option',{value:project.ratio},project.ratio));
    }
    for (const input of root.querySelectorAll('[data-project]')) input.value = project[input.dataset.project];
    const slideStrip = $('[data-slides]');
    slideStrip.replaceChildren();
    for (let index=0; index<project.slides; index++) {
      const button = element('button',{},String(index+1));
      button.setAttribute('aria-pressed',index === slide);
      button.onclick = () => { slide = index; refresh(); };
      slideStrip.append(button);
    }
    const layerStrip = $('[data-layers]');
    layerStrip.replaceChildren();
    for (const layer of project.layers) {
      const button = element('button',{},layer.name);
      button.setAttribute('aria-pressed',layer.id === selected);
      button.onclick = () => { selected = layer.id; refresh(); };
      layerStrip.append(button);
    }
    bindFields($('[data-position]'),active(),patch);
    const photo = active()?.kind === 'photo' ? active() : null;
    bindFields($('[data-color]'),photo,patch);
    bindFields($('[data-copy]'),active()?.kind === 'text' ? active() : null,patch);
    $('[data-texture]').value = photo?.texture || '';
    $('[data-catalog-lut]').value = photo?.lutFile || '';
    for (const selector of ['[data-lut]','[data-texture]','[data-catalog-lut]']) $(selector).disabled = !photo;
    $('[data-remove]').disabled = !active();
    $('[data-undo]').disabled = !undo.length;
    $('[data-redo]').disabled = !redo.length;
    redraw();
  }

  async function add(item) {
    await ready;
    await resolveMedia(item.id);
    commit(() => {
      const empty = layer => layer?.kind === 'photo' && !layer.mediaId;
      const slot = empty(active()) ? active() : project.layers.find(empty);
      if (slot) {
        Object.assign(slot,{mediaId:item.id,name:item.name || 'Foto do álbum'});
        selected = slot.id;
        slide = Math.max(0,Math.floor(slot.x/100));
      } else {
        const id = crypto.randomUUID();
        project.layers.push({...layerDefaults,id,kind:'photo',mediaId:item.id,name:item.name || 'Foto do álbum',x:slide*100});
        selected = id;
      }
    });
  }
  fileInput($('[data-import]'),async files => {
    for (const file of files) await add(await importMedia(file));
  },report);
  $('[data-demo]').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await add(await importDemoPhoto()); }
    catch (error) { report(error.message); }
    finally { button.disabled = false; }
  };
  $('[data-album]').onclick = () => chooseAlbum(['photo'],add);
  $('[data-catalog]').onclick = () => chooseCatalog(['image'],add);
  for (const input of root.querySelectorAll('[data-project]')) {
    input.onchange = () => commit(() => {
      const key=input.dataset.project;
      project[key] = key === 'slides' ? Math.min(20,Math.max(1,Math.round(+input.value))) : input.value;
    });
  }
  $('[data-undo]').onclick = () => history(undo,redo);
  $('[data-redo]').onclick = () => history(redo,undo);
  $('[data-remove]').onclick = () => commit(() => { project.layers = project.layers.filter(layer => layer.id !== selected); });
  $('[data-text]').onclick = () => {
    commit(() => {
      selected = crypto.randomUUID();
      project.layers.push({...layerDefaults,id:selected,kind:'text',name:'Texto',text:'Seu texto',color:'#ffffff',size:8,
        x:slide*100+10,y:40,width:80,height:20});
    });
    $('[data-text-panel]').open = true;
    $('[data-copy] textarea').focus();
    $('[data-copy] textarea').select();
  };
  const picker = element('dialog');
  picker.className = 'editor-asset-picker';
  root.append(picker);
  $('[data-layout]').onclick = () => {
    picker.replaceChildren(element('h2',{},'Modelos de carrossel'));
    const close = element('button',{},'Fechar');
    close.onclick = () => picker.close();
    picker.append(close);
    const list = element('div',{className:'editor-asset-list'});
    for (const layout of layouts) {
      const label = `Modelo ${layout.id} · ${layout.slides} ${layout.slides === 1 ? 'slide' : 'slides'} · ${layout.slots.length} fotos`;
      const button = element('button',{},label);
      button.onclick = () => {
        commit(() => {
          const photos = project.layers.filter(layer => layer.kind === 'photo' && layer.mediaId);
          const other = project.layers.filter(layer => layer.kind !== 'photo');
          const mapped = layout.slots.map((bounds,index) => ({
            ...layerDefaults, id:crypto.randomUUID(),kind:'photo',name:'Foto '+(index+1),...photos[index],...bounds
          }));
          const extra = photos.slice(mapped.length);
          extra.forEach((photo,index) => {
            photo.x = (layout.slides+index)*100;
            photo.y = 0; photo.width = 100; photo.height = 100;
          });
          project.layers = [...mapped,...extra,...other];
          project.slides = Math.min(20,layout.slides+extra.length);
          project.ratio = layout.ratio;
          project.background = layout.background;
          slide = 0;
          selected = mapped.find(layer => !layer.mediaId)?.id || mapped[0]?.id;
        });
        report('Modelo aplicado. Adicione fotos para preencher os espaços.');
        picker.close();
      };
      list.append(button);
    }
    picker.append(list);
    picker.showModal();
  };
  $('[data-overlay]').onclick = () => {
    picker.replaceChildren(element('h2',{},'Adesivos'));
    const close = element('button',{},'Fechar');
    close.onclick = () => picker.close();
    picker.append(close);
    const grid = element('div',{className:'editor-asset-grid'});
    for (const asset of mediaAssets.filter(item => item.category === 'sticker')) {
      const button = element('button',{title:asset.id});
      const image = element('img',{src:'./assets/studio/'+asset.file,alt:'Adesivo '+asset.id,loading:'lazy'});
      button.append(image);
      button.onclick = () => {
        commit(() => {
          selected = crypto.randomUUID();
          project.layers.push({...layerDefaults,id:selected,kind:'sticker',name:asset.id,asset:asset.file,
            x:slide*100+30,y:30,width:40,height:40});
        });
        picker.close();
      };
      grid.append(button);
    }
    if (!grid.children.length) grid.append(element('p',{},'Catálogo indisponível. Importe um PNG transparente como foto.'));
    picker.append(grid);
    picker.showModal();
  };
  $('[data-texture]').onchange = event => patch('texture',event.target.value);
  const setLut = (source,file) => {
    prepareLut(source);
    if (active()?.kind !== 'photo') return;
    commit(() => Object.assign(active(),{lut:source,lutFile:file}));
  };
  $('[data-catalog-lut]').onchange = async event => {
    const file = event.target.value;
    try {
      const response = file ? await fetch('./assets/studio/'+file) : null;
      if (response && !response.ok) throw new Error('LUT indisponível.');
      setLut(response ? await response.text() : '',file);
    } catch (error) { report(error.message); }
  };
  fileInput($('[data-lut]'),async ([file]) => setLut(await file.text(),''),report);
  $('[data-export]').onclick = async event => {
    if (!project.layers.some(layer => layer.kind !== 'photo' || layer.mediaId)) return report('Adicione uma foto ou outra camada para exportar.');
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const snapshot = copy(project);
      const out = document.createElement('canvas');
      const extension = $('[data-format]').value;
      const items = [];
      for (let index=0; index<snapshot.slides; index++) {
        report(`Exportando slide ${index+1} de ${snapshot.slides}…`);
        await draw(out,index,1080,snapshot);
        items.push({blob:await blobFromCanvas(out,extension === 'png' ? 'image/png' : 'image/jpeg')});
      }
      if (items.length === 1) {
        await studio.storeOutput(items[0].blob,'photo',null,{camera:'photo-editor'});
        download(items[0].blob,'foto.'+extension);
      } else {
        download(await zipMedia(items,(_,index) => slideName(index,extension)),'carrossel.zip');
      }
      report('Exportação concluída.');
    } catch (error) { report(error.message); }
    finally { button.disabled = false; }
  };
  return {add, report};
}
