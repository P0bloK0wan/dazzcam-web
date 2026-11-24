import {download, studio} from './app.js';
import {loadProject, saveProject} from './storage.js';
import {locateClip, parseSrt, splitClip, timelineDuration} from './editor-model.js';
import {assetCatalog, bindFields, element, fileInput, importDemoPhoto, importMedia, prepareLut, resolveMedia} from './editor-media.js';
import {VideoCompositor} from './video-compositor.js';

const initial = () => ({id:'video',version:1,ratio:'16:9',clips:[],audio:[],overlays:[]});
const clipDefaults = {start:0,speed:1,volume:100,exposure:0,contrast:0,saturation:0,transition:'none'};
const seconds = time => Math.max(0,time).toFixed(1)+' s';

export function createVideoEditor(root, chooseAlbum, chooseCatalog) {
  root.innerHTML = `
    <div class="editor-heading"><h1>Montagem de vídeo</h1><div class="editor-tools">
      <label class="editor-file">Importar mídia<input data-import type="file" accept="video/*,image/*,audio/*" multiple></label>
      <button data-demo>Testar com amostra</button><button data-album>Do álbum</button><button data-catalog>Do catálogo</button>
      <button data-export class="primary">Exportar vídeo</button><button data-stop hidden>Cancelar</button>
    </div></div>
    <div class="editor-layout"><div class="editor-stage">
      <div class="editor-preview"><canvas aria-label="Prévia do vídeo"></canvas></div>
      <div class="editor-timeline">
        <div class="editor-tools"><button data-play>Reproduzir</button><output data-time>0.0 s</output>
          <button data-split>Dividir no cursor</button><button data-earlier>← Mover</button><button data-later>Mover →</button>
          <button data-remove>Remover item</button>
        </div>
        <label>Posição de reprodução <input data-seek type="range" min="0" max="0" step=".01" value="0"></label>
        <h2>Clipes</h2><div class="editor-strip" data-clips></div>
        <h2>Áudio</h2><div class="editor-strip" data-audio></div>
        <h2>Sobreposições</h2><div class="editor-strip" data-overlays></div>
        <div class="editor-tools"><button data-text>Adicionar texto</button><button data-caption>Adicionar legenda</button>
          <label class="editor-file">Importar SRT<input data-srt type="file" accept=".srt"></label>
          <label class="editor-file">Sobrepor imagem<input data-image type="file" accept="image/*"></label>
        </div>
      </div>
    </div><aside class="editor-inspector">
      <div class="editor-fields"><label>Proporção <select data-ratio><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option></select></label></div>
      <details data-clip-panel open><summary>Clipe selecionado</summary><div class="editor-fields">
        <label>Início na fonte · s <input data-field="start" type="number" min="0" step=".05"></label>
        <label>Fim na fonte · s <input data-field="end" type="number" min=".05" step=".05"></label>
        <label>Velocidade <input data-field="speed" type="number" min=".25" max="4" step=".05"></label>
        <label>Volume · % <input data-field="volume" type="range" min="0" max="150"></label>
        <label>Transição <select data-field="transition"><option value="none">Corte direto</option><option value="fade">Entrada do preto</option></select></label>
        <label>Exposição <input data-field="exposure" type="range" min="-2" max="2" step=".1"></label>
        <label>Contraste <input data-field="contrast" type="range" min="-60" max="60"></label>
        <label>Saturação <input data-field="saturation" type="range" min="-100" max="100"></label>
        <label>LUT do catálogo <select data-catalog-lut><option value="">Nenhuma</option></select></label>
        <label class="editor-file">Importar LUT<input data-lut type="file" accept=".cube"></label>
      </div></details>
      <details data-track-panel open><summary>Áudio selecionado</summary><div class="editor-fields">
        <label>Posição na linha do tempo · s <input data-field="start" type="number" min="0" step=".05"></label>
        <label>Duração · s <input data-field="duration" type="number" min=".05" step=".05"></label>
        <label>Volume · % <input data-field="volume" type="range" min="0" max="150"></label>
      </div></details>
      <details data-overlay-panel open><summary>Sobreposição selecionada</summary><div class="editor-fields">
        <label>Início · s <input data-field="start" type="number" min="0" step=".05"></label>
        <label>Fim · s <input data-field="end" type="number" min=".05" step=".05"></label>
        <label>Texto <textarea data-field="text"></textarea></label>
      </div></details>
    </aside></div><p data-status class="editor-status" role="status"></p>`;
  const $ = selector => root.querySelector(selector);
  const report = message => { $('[data-status]').textContent = message; };
  const compositor = new VideoCompositor($('canvas'));
  let project = initial(), selection = null, time = 0, playing = false, exporting = false, generation = 0;
  const ready = loadProject('video').then(saved => {
    if (saved?.version === 1) project = saved;
    refresh();
  }).catch(error => report(error.message));
  assetCatalog().then(assets => {
    for (const asset of assets.filter(asset => asset.kind === 'lut')) {
      $('[data-catalog-lut]').append(element('option',{value:asset.file},asset.id));
    }
    refresh();
  }).catch(() => { /* Local imports remain available offline. */ });

  function setTime(next) {
    time = Math.min(timelineDuration(project.clips),Math.max(0,next));
    $('[data-seek]').value = time;
    $('[data-time]').textContent = seconds(time)+' / '+seconds(timelineDuration(project.clips));
  }
  async function updatePreview() {
    const revision = ++generation;
    try {
      await compositor.prepare(structuredClone(project));
      if (revision === generation && !exporting && !playing) await compositor.seek(time);
    } catch (error) { report(error.message); }
  }
  function commit(update) {
    if (exporting) return;
    compositor.stop();
    update();
    saveProject(project).catch(error => report(error.message));
    refresh();
  }
  const active = key => selection?.key === key ? project[key].find(item => item.id === selection.id) : null;
  function updateField(key, field, value) {
    const item = active(key);
    if (!item) return;
    if (field === 'start') value = Math.max(0,Math.min(key === 'clips' || key === 'overlays' ? item.end-.05 : Infinity,value));
    if (field === 'end') value = Math.max(item.start+.05,Math.min(key === 'clips' ? item.length : Infinity,value));
    if (field === 'speed') value = Math.max(.25,Math.min(4,value));
    if (field === 'duration') value = Math.max(.05,Math.min(item.length,value));
    commit(() => { item[field] = value; });
  }
  function refresh() {
    const total = timelineDuration(project.clips);
    $('[data-seek]').max = total;
    setTime(time);
    $('[data-ratio]').value = project.ratio;
    for (const key of ['clips','audio','overlays']) {
      const strip = $('[data-'+key+']');
      strip.replaceChildren();
      for (const [index,item] of project[key].entries()) {
        const button = element('button',{},`${index+1}. ${item.name}`);
        button.setAttribute('aria-pressed',active(key) === item);
        button.onclick = () => {
          if (exporting) return;
          selection = {key,id:item.id};
          if (key === 'clips') setTime(timelineDuration(project.clips.slice(0,index)));
          else setTime(item.start);
          refresh();
        };
        strip.append(button);
      }
      if (!strip.children.length) strip.append(element('span',{},'Vazio'));
    }
    bindFields($('[data-clip-panel]'),active('clips'),(field,value) => updateField('clips',field,value));
    bindFields($('[data-track-panel]'),active('audio'),(field,value) => updateField('audio',field,value));
    bindFields($('[data-overlay-panel]'),active('overlays'),(field,value) => updateField('overlays',field,value));
    $('[data-overlay-panel] textarea').disabled = !active('overlays') || active('overlays').kind === 'image';
    $('[data-catalog-lut]').value = active('clips')?.lutFile || '';
    $('[data-catalog-lut]').disabled = !active('clips');
    $('[data-lut]').disabled = !active('clips');
    for (const selector of ['[data-earlier]','[data-later]']) $(selector).disabled = !active('clips');
    $('[data-remove]').disabled = !selection;
    for (const selector of ['[data-split]','[data-export]','[data-play]']) $(selector).disabled = !total || exporting;
    if (!playing && !exporting) updatePreview();
  }

  async function add(item) {
    await ready;
    if (!['photo','video','audio'].includes(item.type)) return;
    const media = await resolveMedia(item.id);
    const length = item.type === 'photo' ? 3 : media.element.duration;
    if (!Number.isFinite(length) || length < .05) throw new Error('Este arquivo não informa uma duração válida.');
    const id = crypto.randomUUID();
    const name = item.name || (item.type === 'audio' ? 'Áudio' : 'Mídia do álbum');
    commit(() => {
      if (item.type === 'audio') {
        project.audio.push({id,mediaId:item.id,name,start:time,duration:length,length,volume:100});
        selection = {key:'audio',id};
      } else {
        const start = timelineDuration(project.clips);
        project.clips.push({...clipDefaults,id,mediaId:item.id,name,end:length,length});
        selection = {key:'clips',id};
        time = start;
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
  $('[data-album]').onclick = () => chooseAlbum(['photo','video','audio'],add);
  $('[data-catalog]').onclick = () => chooseCatalog(['image','video','audio'],add);
  $('[data-ratio]').onchange = event => commit(() => { project.ratio = event.target.value; });
  $('[data-seek]').oninput = event => {
    if (exporting) return;
    compositor.stop();
    setTime(+event.target.value);
    compositor.seek(time).catch(error => report(error.message));
  };
  $('[data-play]').onclick = async () => {
    if (playing) return compositor.stop();
    if (exporting) return;
    playing = true;
    $('[data-play]').textContent = 'Pausar';
    try {
      await compositor.prepare(structuredClone(project));
      if (time >= compositor.duration-.01) setTime(0);
      await compositor.run(time,720,setTime);
    } catch (error) { report(error.message); }
    finally { playing = false; $('[data-play]').textContent = 'Reproduzir'; refresh(); }
  };
  $('[data-split]').onclick = () => {
    const id = crypto.randomUUID();
    const split = splitClip(project.clips,time,id);
    if (split === project.clips) return report('Coloque o cursor dentro de um clipe para dividir.');
    commit(() => { project.clips = split; selection = {key:'clips',id}; });
  };
  for (const [selector, delta] of [['[data-earlier]',-1],['[data-later]',1]]) {
    $(selector).onclick = () => {
      const index = project.clips.indexOf(active('clips')), next = index+delta;
      if (index < 0 || next < 0 || next >= project.clips.length) return;
      commit(() => {
        [project.clips[index],project.clips[next]] = [project.clips[next],project.clips[index]];
        time = timelineDuration(project.clips.slice(0,next));
      });
    };
  }
  $('[data-remove]').onclick = () => {
    if (!selection) return;
    commit(() => { project[selection.key] = project[selection.key].filter(item => item.id !== selection.id); selection = null; });
  };
  function overlay(kind, properties) {
    const id = crypto.randomUUID();
    const name = {caption:'Legenda',text:'Texto',image:'Imagem'}[kind];
    project.overlays.push({id,name,kind,start:time,end:time+3,text:name,...properties});
    selection = {key:'overlays',id};
  }
  $('[data-text]').onclick = () => commit(() => overlay('text',{}));
  $('[data-caption]').onclick = () => commit(() => overlay('caption',{}));
  fileInput($('[data-image]'),async ([file]) => {
    const item = await importMedia(file);
    if (item.type !== 'photo') throw new Error('Escolha uma imagem.');
    commit(() => overlay('image',{mediaId:item.id}));
  },report);
  fileInput($('[data-srt]'),async ([file]) => {
    const entries = parseSrt(await file.text());
    if (!entries.length) throw new Error('O arquivo SRT não contém legendas válidas.');
    commit(() => entries.forEach(entry => overlay('caption',entry)));
    report(entries.length+' legendas importadas.');
  },report);
  function setLut(source,file) {
    prepareLut(source);
    const clip = active('clips');
    if (clip) commit(() => Object.assign(clip,{lut:source,lutFile:file}));
  }
  fileInput($('[data-lut]'),async ([file]) => setLut(await file.text(),''),report);
  $('[data-catalog-lut]').onchange = async event => {
    const file = event.target.value;
    try {
      const response = file ? await fetch('./assets/studio/'+file) : null;
      if (response && !response.ok) throw new Error('LUT indisponível.');
      setLut(response ? await response.text() : '',file);
    } catch (error) { report(error.message); }
  };
  $('[data-stop]').onclick = () => compositor.stop();
  $('[data-export]').onclick = async () => {
    if (exporting) return;
    exporting = true;
    $('[data-stop]').hidden = false;
    refresh();
    try {
      await compositor.prepare(structuredClone(project));
      const blob = await compositor.export((current,total) => {
        setTime(current);
        report('Exportando '+Math.round(current/total*100)+'%…');
      });
      if (blob) {
        await studio.storeOutput(blob,'video',null,{camera:'video-editor'});
        download(blob,'montagem.'+(blob.type.startsWith('video/mp4') ? 'mp4' : 'webm'));
      }
      report(blob ? 'Vídeo exportado.' : 'Exportação cancelada.');
    } catch (error) { report(error.message); }
    finally { exporting = false; $('[data-stop]').hidden = true; refresh(); }
  };
  return {add,report,stop:() => compositor.stop()};
}
