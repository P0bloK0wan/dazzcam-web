const assert = require('node:assert/strict');
const {mkdtemp, readFile, rm} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {chromium} = require('playwright');

const base = process.env.TEST_URL || 'http://127.0.0.1:5173';
const assets = join(__dirname, '..', 'dist', 'assets', 'studio');

function sampleAudio() {
  const sampleRate = 16000, samples = sampleRate;
  const wav = Buffer.alloc(44+samples*2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(sampleRate,24); wav.writeUInt32LE(sampleRate*2,28);
  wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36);
  wav.writeUInt32LE(samples*2,40);
  for (let i=0; i<samples; i++) wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/sampleRate)*6000),44+i*2);
  return {name:'teste.wav',mimeType:'audio/wav',buffer:wav};
}

async function main() {
  const output = await mkdtemp(join(tmpdir(), 'dazz-studio-'));
  const chromiumOptions = {
    args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],
    ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})
  };
  const browser = await chromium.launch(chromiumOptions);
  try {
    const context = await browser.newContext({
      viewport:{width:1440,height:1000}, acceptDownloads:true, permissions:['camera','microphone']
    });
    if (process.env.TEST_STATIC_FIXTURE === '1') {
      const dist = join(__dirname,'..','dist');
      const mime = {html:'text/html',css:'text/css',js:'text/javascript',jpg:'image/jpeg',png:'image/png',
        svg:'image/svg+xml',json:'application/json',webmanifest:'application/manifest+json'};
      await context.route(base+'/**', async route => {
        const resource = new URL(route.request().url()).pathname;
        const name = resource === '/' ? 'index.html' : resource.slice(1);
        try { await route.fulfill({body:await readFile(join(dist,name)),contentType:mime[name.split('.').at(-1)]}); }
        catch { await route.fulfill({status:404,body:''}); }
      });
    }
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',error => errors.push(error.message));
    const go = mode => page.locator(`.studio-navigation [data-view="${mode}"]`).click();
    const photo = page.locator('#photo-editor-view');
    const video = page.locator('#video-editor-view');
    const capture = page.locator('#shutter');

    await page.goto(base);
    await page.locator('#desk-demo').click();
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#preview');
      return canvas.getContext('2d').getImageData(40,40,1,1).data[3] === 255;
    });
    await capture.click();
    await page.waitForFunction(() => document.querySelector('#album-count').textContent === '1');
    await go('gallery');
    await page.locator('.gallery-card').first().click();
    await page.locator('#media-send-photo').click();
    await photo.locator('[data-layers] button').first().waitFor();

    await photo.locator('[data-layout]').click();
    await photo.getByRole('button',{name:/Modelo 02 ·/}).click();
    assert.equal(await photo.locator('[data-slides] button').count(),6);
    await photo.locator('[data-import]').setInputFiles(join(assets,'340.jpg'));
    await photo.getByRole('button',{name:'340.jpg',exact:true}).waitFor();
    const zip = page.waitForEvent('download');
    await photo.locator('[data-export]').click();
    await (await zip).saveAs(join(output,'slides.zip'));
    const zipBytes = await readFile(join(output,'slides.zip'));
    assert.equal(zipBytes.readUInt32LE(0),0x04034b50);
    for (let i=1;i<=6;i++) assert.ok(zipBytes.includes(Buffer.from('0'+i+'.png')));

    await go('video-editor');
    await video.locator('[data-import]').setInputFiles(join(assets,'335.jpg'));
    await video.locator('[data-clips] button').first().waitFor();
    await video.locator('[data-clip-panel] [data-field=end]').fill('0.8');
    await video.locator('[data-clip-panel] [data-field=end]').press('Tab');
    await video.locator('[data-import]').setInputFiles(sampleAudio());
    await video.getByRole('button',{name:/1\. teste\.wav/}).waitFor();
    await video.locator('[data-srt]').setInputFiles({
      name:'legenda.srt', mimeType:'text/plain',
      buffer:Buffer.from('1\n00:00:00,000 --> 00:00:00,750\nTeste de legenda\n')
    });
    await video.getByRole('button',{name:/1\. Legenda/}).waitFor();
    const videoDownload = page.waitForEvent('download',{timeout:9000}).catch(async error => {
      throw new Error((await video.locator('[data-status]').textContent())+' | '+errors.join(' | '),{cause:error});
    });
    await video.locator('[data-export]').click();
    const result = await videoDownload;
    const file = join(output,result.suggestedFilename());
    await result.saveAs(file);
    const bytes = await readFile(file);
    assert.ok(bytes.length > 0);
    const playback = await page.evaluate(async ({encoded,mime}) => {
      const data = Uint8Array.from(atob(encoded),character => character.charCodeAt(0));
      const media = document.createElement('video');
      media.muted = true;
      media.src = URL.createObjectURL(new Blob([data],{type:mime}));
      try {
        await media.play();
        const canvas = document.createElement('canvas');
        canvas.width = 12; canvas.height = 12;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(media,0,0,12,12);
        const pixels = ctx.getImageData(0,0,12,12).data;
        const colors = new Set();
        for (let i=0; i<pixels.length; i+=4) colors.add(pixels.slice(i,i+3).join());
        const audio = new OfflineAudioContext(1,44100,44100);
        const decoded = await audio.decodeAudioData(data.buffer.slice(0));
        const samples = decoded.getChannelData(0);
        const peak = samples.reduce((max,sample) => Math.max(max,Math.abs(sample)),0);
        return {width:media.videoWidth,height:media.videoHeight,colors:colors.size,peak};
      }
      finally { media.pause(); URL.revokeObjectURL(media.src); }
    },{encoded:bytes.toString('base64'),mime:result.suggestedFilename().endsWith('.mp4') ? 'video/mp4':'video/webm'});
    assert.equal(playback.width,1920);
    assert.equal(playback.height,1080);
    assert.ok(playback.colors > 10,JSON.stringify(playback));
    assert.ok(playback.peak > .04,JSON.stringify(playback));

    await page.reload();
    await go('photo-editor');
    await photo.getByRole('button',{name:'340.jpg',exact:true}).waitFor();
    assert.equal(await photo.locator('[data-slides] button').count(),6);

    await page.setViewportSize({width:390,height:844});
    await go('camera');
    await page.locator('#desk-start').click();
    await page.waitForFunction(() => document.querySelector('#source-video').srcObject?.active);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await go('video-editor');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('Câmera, álbum, carrossel ZIP, legendas, vídeo 1080p reproduzível e rascunhos verificados.');
  } finally {
    await browser.close();
    await rm(output,{recursive:true,force:true});
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
