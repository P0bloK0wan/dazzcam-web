import test from 'node:test';
import assert from 'node:assert/strict';
import {cropRect,cameras} from '../dist/renderer.js';
test('portrait image crops to landscape without going outside image',()=>{const r=cropRect(1000,2000,'4:3');assert.equal(r.w/r.h,4/3);assert.equal(r.x,0);assert.equal(r.y,625);});
test('landscape image crops to portrait and zoom stays centered',()=>{const r=cropRect(2000,1000,'9:16',2);assert.equal(r.w/r.h,9/16);assert.equal(r.x+r.w/2,1000);assert.equal(r.y+r.h/2,500);assert.equal(r.h,500);});
test('original ratio retains full original image',()=>assert.deepEqual(cropRect(1234,987,'original'),{x:0,y:0,w:1234,h:987}));
test('camera identifiers are unique',()=>assert.equal(new Set(cameras.map(c=>c.id)).size,cameras.length));
