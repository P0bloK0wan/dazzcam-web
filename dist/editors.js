import {allMedia} from './storage.js';
import {assetCatalog, element, importMedia} from './editor-media.js';
import {createPhotoEditor} from './photo-editor.js';
import {createVideoEditor} from './video-editor.js';

const picker = element('dialog',{className:'editor-asset-picker'});
document.body.append(picker);
let pickerRequest = 0;

async function choose(title, items, label, select, empty, thumbnail) {
  const request = ++pickerRequest;
  const close = element('button',{type:'button'},'Fechar');
  close.onclick = () => picker.close();
  const list = element('div',{className:'editor-asset-list'});
  const notice = element('p',{role:'status'},'Carregando…');
  picker.replaceChildren(element('h2',{},title),close,notice,list);
  if (!picker.open) picker.showModal();
  try {
    const entries = await items();
    if (request !== pickerRequest || !picker.open) return;
    notice.textContent = entries.length ? '' : empty;
    const fragment = document.createDocumentFragment();
    for (const item of entries) {
      const button = element('button',{type:'button'},label(item));
      if (thumbnail?.(item)) button.prepend(element('img',{src:thumbnail(item),alt:'',loading:'lazy'}));
      button.onclick = async () => {
        button.disabled = true;
        try { await select(item); picker.close(); }
        catch (error) { notice.textContent = error.message; }
        finally { button.disabled = false; }
      };
      fragment.append(button);
    }
    list.append(fragment);
  } catch (error) { notice.textContent = error.message; }
}
const chooseAlbum = (types,add) => choose('Biblioteca local',
  async () => (await allMedia()).filter(item => types.includes(item.type)),
  item => item.name || `${item.camera} · ${new Date(item.created).toLocaleString('pt-BR')}`,
  add,'Nenhuma mídia compatível no álbum.');
const extensionMime = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',
  mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav'};
const chooseCatalog = (types,add) => choose('Catálogo de mídia',
  async () => (await assetCatalog()).filter(item => types.includes(item.kind)),
  item => `${item.id} · ${{image:'Imagem',audio:'Áudio',video:'Vídeo'}[item.kind]}`,
  async item => {
    const response = await fetch('./assets/studio/'+item.file);
    if (!response.ok) throw new Error('Não foi possível carregar o recurso.');
    const type = extensionMime[item.file.split('.').at(-1)];
    const file = new File([await response.blob()],item.file,{type});
    await add(await importMedia(file));
  },
  'O catálogo está indisponível.',
  item => item.kind === 'image' ? './assets/studio/'+item.file : '');

const photo = createPhotoEditor(document.querySelector('#photo-editor-view'),chooseAlbum,chooseCatalog);
const video = createVideoEditor(document.querySelector('#video-editor-view'),chooseAlbum,chooseCatalog);

document.addEventListener('studio:view',event => {
  for (const button of document.querySelectorAll('.studio-navigation button')) {
    if (button.dataset.view === event.detail) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  }
  if (event.detail !== 'video-editor') video.stop();
});
document.addEventListener('studio:media',event => {
  const {mode,item} = event.detail;
  const editor = mode === 'photo' ? photo : video;
  editor.add(item).catch(error => editor.report(error.message));
});
