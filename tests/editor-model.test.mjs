import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import test from 'node:test';
import {applyCube, locateClip, parseCube, parseSrt, slideName, splitClip, timelineDuration} from '../dist/editor-model.js';

test('LUT .cube respects channel ordering and alpha', () => {
  const rows = [];
  for (const b of [0,1]) for (const g of [0,1]) for (const r of [0,1]) rows.push([g,b,r].join(' '));
  const lut = parseCube('LUT_3D_SIZE 2\n'+rows.join('\n'));
  const pixel = new Uint8ClampedArray([255,128,32,200]);
  applyCube(pixel,lut);
  assert.deepEqual([...pixel],[128,32,255,200]);
  assert.throws(() => parseCube('LUT_3D_SIZE 2\n1 0 0'),/LUT 3D/);
});

test('timeline projects a split at double speed into source coordinates', () => {
  const clips = [{id:'original',start:2,end:10,speed:2,transition:'fade'}, {id:'second',start:0,end:3,speed:1}];
  assert.equal(locateClip(clips,4).clip.id,'second');
  const updated = splitClip(clips,1.5,'piece');
  assert.equal(updated[0].end,5);
  assert.equal(updated[1].start,5);
  assert.equal(updated[1].id,'piece');
  assert.equal(updated[1].transition,'none');
  assert.equal(timelineDuration(updated),timelineDuration(clips));
  assert.equal(splitClip(clips,4,'unused'),clips);
});

test('caption import and slide numbering preserve order', () => {
  const srt = '1\r\n00:00:01,300 --> 00:00:03,007\r\nOlá\r\nmundo\r\n\r\n2\r\n00:00:03,007 --> 00:00:05,000\r\nTudo certo';
  assert.deepEqual(parseSrt(srt),[
    {kind:'caption',start:1.3,end:3.007,text:'Olá\nmundo'},
    {kind:'caption',start:3.007,end:5,text:'Tudo certo'}
  ]);
  const names = Array.from({length:20},(_,i) => slideName(i,'png'));
  assert.equal(names[0],'01.png');
  assert.equal(names.at(-1),'20.png');
  assert.deepEqual([...names].sort(),names);
});

test('catalog entries use numeric filenames and preserve related sources', () => {
  const catalog = new URL('../dist/assets/studio/catalog.json',import.meta.url);
  const {assets} = JSON.parse(readFileSync(catalog));
  const byName = new Map(assets.map(item => [item.file,item]));
  assert.equal(assets.length,byName.size);
  for (const item of assets) {
    assert.match(item.file,/^\d+(\.\d+)?\.[a-z0-9]+$/);
    assert.equal(statSync(new URL(item.file,catalog)).size,item.bytes);
    assert.equal(item.id.split('.')[0],item.group);
  }
  const video = byName.get('500.1.mp4');
  assert.equal(video.group,byName.get('500.png').group);
  assert.equal(video.kind,'video');
  const sample = assets.find(item => item.kind === 'lut');
  assert.ok(parseCube(readFileSync(new URL(sample.file,catalog),'utf8')).size >= 2);
});
