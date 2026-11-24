import {locateClip, clipDuration, timelineDuration} from './editor-model.js';
import {mediaSize, paintMedia, paintText, prepareLut, resolveMedia} from './editor-media.js';

export class VideoCompositor {
  constructor(canvas) {
    this.canvas = canvas;
    this.currentTime = 0;
    this.media = new Map();
    this.nodes = new Map();
    this.revision = 0;
  }

  async prepare(project) {
    this.project = project;
    this.duration = timelineDuration(project.clips);
    const ids = new Set([
      ...project.clips.map(clip => clip.mediaId),
      ...project.audio.map(track => track.mediaId),
      ...project.overlays.map(layer => layer.mediaId).filter(Boolean)
    ]);
    await Promise.all([...ids].map(async id => {
      if (!this.media.has(id)) this.media.set(id, await resolveMedia(id));
    }));
  }

  audioGraph() {
    if (this.audio) return this.audio;
    this.audio = new AudioContext();
    this.output = this.audio.createMediaStreamDestination();
    this.monitor = this.audio.createGain();
    this.monitor.connect(this.audio.destination);
    return this.audio;
  }

  node(element) {
    if (!this.nodes.has(element)) {
      const source = this.audio.createMediaElementSource(element);
      const gain = this.audio.createGain();
      source.connect(gain);
      gain.connect(this.output);
      gain.connect(this.monitor);
      this.nodes.set(element,gain);
    }
    return this.nodes.get(element);
  }

  pauseMedia(exceptions = new Set()) {
    for (const {element} of this.media.values()) {
      if (!exceptions.has(element)) element.pause?.();
    }
  }

  useMedia(entry, time, speed, volume, running, exceptions) {
    if (!entry || entry.item.type === 'photo') return;
    const {element} = entry;
    exceptions.add(element);
    const current = Math.max(0, Math.min(time, (element.duration || time)-.01));
    if (Math.abs(element.currentTime-current) > (running && !element.paused ? .30 : .025)) {
      element.currentTime = current;
    }
    element.playbackRate = speed;
    if (this.audio) this.node(element).gain.value = volume;
    if (running && element.paused) element.play().catch(() => {});
    if (!running) element.pause();
  }

  frame(time, edge = 720, running = false) {
    if (!this.project) return;
    const {ratio,clips,overlays,audio} = this.project;
    const [w,h] = mediaSize(ratio,edge);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = '#0c0f0f';
    ctx.fillRect(0,0,w,h);
    const at = locateClip(clips,time);
    const playing = new Set();
    if (at) {
      const {clip,sourceTime,local} = at;
      const media = this.media.get(clip.mediaId);
      this.useMedia(media,sourceTime,clip.speed,clip.volume/100,running,playing);
      if (media) paintMedia(ctx,media.element,0,0,w,h,{...clip,lut:prepareLut(clip.lut)});
      const fade = Math.min(.35,clipDuration(clip)/2);
      if (clip.transition === 'fade' && local < fade) {
        ctx.fillStyle = `rgba(0,0,0,${1-local/fade})`;
        ctx.fillRect(0,0,w,h);
      }
    }
    for (const track of audio) {
      const local = time-track.start;
      if (local >= 0 && local < track.duration) {
        this.useMedia(this.media.get(track.mediaId),local,1,track.volume/100,running,playing);
      }
    }
    for (const layer of overlays) {
      if (time < layer.start || time >= layer.end) continue;
      if (layer.kind === 'image') {
        const entry = this.media.get(layer.mediaId);
        if (entry) paintMedia(ctx,entry.element,w*.61,h*.06,w*.32,h*.32);
      } else {
        paintText(ctx,layer.text,w/2,h*(layer.kind === 'caption' ? .84 : .20),Math.max(16,h*.055),w*.90);
      }
    }
    this.pauseMedia(playing);
    this.currentTime = time;
  }

  async seek(time) {
    const revision = ++this.revision;
    this.frame(time);
    const at = locateClip(this.project?.clips || [],time);
    const media = this.media.get(at?.clip.mediaId)?.element;
    if (media?.tagName === 'VIDEO' && media.readyState < 2 || media?.seeking) {
      await new Promise(resolve => {
        const controller = new AbortController();
        const done = () => { clearTimeout(timer); controller.abort(); resolve(); };
        const timer = setTimeout(done,700);
        for (const event of ['seeked','loadeddata','error']) media.addEventListener(event,done,{once:true,signal:controller.signal});
      });
      if (revision === this.revision) this.frame(time);
    }
  }

  stop() {
    this.revision++;
    this.cancel?.();
    this.pauseMedia();
  }

  async run(from, edge, notify, onBegin = () => {}) {
    if (!this.duration) throw new Error('Adicione um clipe à linha do tempo.');
    this.stop();
    const revision = this.revision;
    await this.audioGraph().resume();
    if (revision !== this.revision) return false;
    this.frame(from,edge);
    return new Promise((resolve,reject) => {
      let request;
      const start = performance.now()-from*1000;
      const finish = complete => {
        cancelAnimationFrame(request);
        this.pauseMedia();
        this.cancel = null;
        resolve(complete);
      };
      this.cancel = () => finish(false);
      const tick = now => {
        try {
          const current = Math.min(this.duration,(now-start)/1000);
          this.frame(current,edge,current < this.duration);
          notify(current,this.duration);
          if (current >= this.duration) finish(true);
          else request = requestAnimationFrame(tick);
        } catch (error) {
          finish(false);
          reject(error);
        }
      };
      try {
        onBegin();
        tick(performance.now());
      } catch (error) {
        this.stop();
        reject(error);
      }
    });
  }

  async export(notify) {
    if (!window.MediaRecorder || !this.canvas.captureStream) {
      throw new Error('Este navegador não oferece exportação de vídeo. Use uma versão atual do Chrome, Edge ou Safari.');
    }
    this.audioGraph();
    const previousMonitor = this.monitor.gain.value;
    this.monitor.gain.value = 0;
    const stream = this.canvas.captureStream(30);
    const audioTrack = this.output.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);
    const mimeType = [
      'video/mp4;codecs=avc1.42001e,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/webm','video/mp4'
    ].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream,mimeType ? {mimeType,videoBitsPerSecond:6000000} : {});
    const chunks = [];
    const recorded = new Promise((resolve,reject) => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => resolve(new Blob(chunks,{type:recorder.mimeType}));
      recorder.onerror = event => { this.stop(); reject(event.error || new Error('Falha na exportação.')); };
    });
    recorded.catch(() => {});
    try {
      const complete = await this.run(0,1080,notify,() => recorder.start(500));
      if (!complete && recorder.state === 'inactive') return null;
      if (recorder.state !== 'inactive') recorder.stop();
      const blob = await recorded;
      if (!complete) return null;
      if (!blob.size) throw new Error('O navegador gerou um vídeo vazio.');
      return blob;
    } finally {
      if (recorder.state !== 'inactive') recorder.stop();
      stream.getVideoTracks().forEach(track => track.stop());
      this.monitor.gain.value = previousMonitor;
    }
  }
}
