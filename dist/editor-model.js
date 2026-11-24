export function parseCube(source) {
  let size = 0;
  let min = [0, 0, 0];
  let max = [1, 1, 1];
  const values = [];
  for (const line of source.split(/\r?\n/)) {
    const [head, ...tail] = line.split('#')[0].trim().split(/\s+/);
    if (!head || head === 'TITLE') continue;
    if (head === 'LUT_3D_SIZE') { size = Number(tail[0]); continue; }
    if (head === 'DOMAIN_MIN') { min = tail.map(Number); continue; }
    if (head === 'DOMAIN_MAX') { max = tail.map(Number); continue; }
    const row = [head, ...tail].map(Number);
    if (row.length !== 3 || !row.every(Number.isFinite)) throw new Error('Formato LUT .cube inválido.');
    values.push(...row);
  }
  if (!Number.isInteger(size) || size < 2 || size > 65 || values.length !== size ** 3 * 3 ||
      min.length !== 3 || max.length !== 3 || !min.every((v,i) => Number.isFinite(v) && Number.isFinite(max[i]) && max[i] > v)) {
    throw new Error('Escolha uma LUT 3D válida, de 2 a 65 pontos por eixo.');
  }
  return {size, min, max, values: new Float32Array(values)};
}

export function applyCube(pixels, {size, min, max, values}) {
  const edge = size - 1;
  const axis = min.map((lower, i) => Float32Array.from({length:256}, (_, value) =>
    Math.max(0, Math.min(edge, (value / 255 - lower) / (max[i] - lower) * edge))));
  for (let i = 0; i < pixels.length; i += 4) {
    const r = axis[0][pixels[i]], g = axis[1][pixels[i+1]], b = axis[2][pixels[i+2]];
    const x = Math.floor(r), y = Math.floor(g), z = Math.floor(b);
    const dx = x < edge ? 3 : 0, dy = y < edge ? 3 * size : 0, dz = z < edge ? 3 * size * size : 0;
    const rx = r-x, gy = g-y, bz = b-z;
    for (let channel = 0; channel < 3; channel++) {
      const p = ((z*size+y)*size+x)*3+channel;
      const top = (values[p]*(1-rx)+values[p+dx]*rx)*(1-gy) +
        (values[p+dy]*(1-rx)+values[p+dy+dx]*rx)*gy;
      const bottom = (values[p+dz]*(1-rx)+values[p+dz+dx]*rx)*(1-gy) +
        (values[p+dz+dy]*(1-rx)+values[p+dz+dy+dx]*rx)*gy;
      pixels[i+channel] = (top*(1-bz)+bottom*bz)*255;
    }
  }
}

export const clipDuration = clip => (clip.end - clip.start) / clip.speed;
export const timelineDuration = clips => clips.reduce((sum,clip) => sum + clipDuration(clip), 0);

export function locateClip(clips, time) {
  let offset = 0;
  for (const [index, clip] of clips.entries()) {
    const duration = clipDuration(clip);
    if (time < offset + duration || index === clips.length - 1) {
      const local = Math.max(0, Math.min(duration, time - offset));
      return {index, clip, local, sourceTime: clip.start + local * clip.speed};
    }
    offset += duration;
  }
  return null;
}

export function splitClip(clips, time, newId) {
  const at = locateClip(clips, time);
  if (!at || at.sourceTime - at.clip.start < .05 || at.clip.end - at.sourceTime < .05) return clips;
  const next = clips.slice();
  next.splice(at.index, 1, {...at.clip, end:at.sourceTime}, {...at.clip, id:newId, start:at.sourceTime, transition:'none'});
  return next;
}

export function parseSrt(text) {
  const time = (h,m,s,ms) => +h*3600 + +m*60 + +s + Number('0.'+ms);
  return text.trim().split(/\r?\n\s*\r?\n/).flatMap(block => {
    const lines = block.split(/\r?\n/);
    const index = lines.findIndex(line => line.includes('-->'));
    const match = lines[index]?.match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
    if (!match) return [];
    const start = time(...match.slice(1,5));
    const end = time(...match.slice(5,9));
    const label = lines.slice(index+1).join('\n').trim();
    return end > start && label ? [{kind:'caption', start, end, text:label}] : [];
  });
}

export const slideName = (index, extension) => String(index+1).padStart(2,'0')+'.'+extension;
