export const cameras = [
 {id:'classic',name:'D Classic',family:'Foto',color:'#d0a36a',filter:[1.03,1.12,.83,9],grain:.18,vignette:.3,desc:'Tons quentes, textura de filme e lembranças de verão.'},
 {id:'ccdr',name:'CCD R',family:'Digital',color:'#a5b6c0',filter:[1.08,1.14,1.2,-5],grain:.06,vignette:.1,desc:'Flash direto e cores vivas de uma compacta digital.'},
 {id:'dhalf',name:'D Half',family:'Foto',color:'#b9b590',filter:[1.05,.93,.82,5],grain:.2,vignette:.2,desc:'Duas lembranças em um mesmo quadro.'},
 {id:'instc',name:'Inst C',family:'Instantânea',color:'#ded7bf',filter:[1.07,.88,.78,7],grain:.1,vignette:.18,desc:'Cores suaves e a clássica moldura instantânea.',frame:'instant'},
 {id:'instsq',name:'Inst SQ',family:'Instantânea',color:'#b6b6aa',filter:[1.05,.92,.8,3],grain:.1,vignette:.2,desc:'Filme instantâneo em formato quadrado.',frame:'instant'},
 {id:'dblack',name:'D Black',family:'Foto',color:'#777b7b',filter:[1,1.25,0,0],grain:.23,vignette:.32,desc:'Preto e branco com contraste e grão marcantes.'},
 {id:'s67',name:'S 67',family:'Foto',color:'#9b806a',filter:[1.03,1.05,.92,2],grain:.09,vignette:.2,desc:'Tons delicados inspirados no médio formato.'},
 {id:'135ne',name:'135 NE',family:'Foto',color:'#818f68',filter:[1.04,.97,.9,8],grain:.2,vignette:.22,desc:'Negativo de 35 mm, com verdes suaves e calor.'},
 {id:'ofm',name:'OFM',family:'Foto',color:'#aaa9a1',filter:[1.02,1.12,.86,-3],grain:.12,vignette:.14,desc:'Uma interpretação de filme cinematográfico.'},
 {id:'grd',name:'GR D',family:'Digital',color:'#84827c',filter:[1,1.18,.85,0],grain:.07,vignette:.16,desc:'Detalhes definidos para fotografar o cotidiano.'},
 {id:'kino',name:'Kino',family:'Vídeo',color:'#b8ac8f',filter:[1.02,1.15,.85,4],grain:.22,vignette:.32,desc:'Cinema de bolso com textura e tons nostálgicos.'},
 {id:'8mm',name:'8 mm',family:'Vídeo',color:'#a98755',filter:[1.02,1.2,.65,14],grain:.32,vignette:.45,desc:'Grão, vinheta e cores quentes de filme de 8 mm.'},
 {id:'16mm',name:'16 mm',family:'Vídeo',color:'#8b968c',filter:[1.03,1.12,.8,6],grain:.2,vignette:.26,desc:'Textura de cinema com contraste equilibrado.'},
 {id:'vhs',name:'VHS',family:'Vídeo',color:'#8c95b0',filter:[1.06,.93,.76,-5],grain:.14,vignette:.15,desc:'Linhas de varredura e memória de fita analógica.'},
 {id:'original',name:'Original',family:'Digital',color:'#d5d5d5',filter:[1,1,1,0],grain:0,vignette:0,desc:'A imagem como ela chega à câmera.'}
];
export const defaults = {camera:'classic',exposure:0,contrast:0,saturation:0,temperature:0,grain:20,vignette:25,leak:0,frame:'none',ratio:'4:3',timestamp:false,grid:false,timer:0,zoom:1,mirror:true,negative:true,quality:1920,sound:true};
export function cropRect(sw,sh,ratio,zoom=1){const r=ratio==='original'?sw/sh:ratio.split(':').map(Number).reduce((a,b)=>a/b);let w=sw,h=sw/r;if(h>sh){h=sh;w=sh*r;}w/=zoom;h/=zoom;return {x:(sw-w)/2,y:(sh-h)/2,w,h};}
export function render(canvas, source, settings, options={}){
 const s={...defaults,...settings},c=cameras.find(c=>c.id===s.camera)||cameras[0];
 const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;if(!sw||!sh)return;
 const crop=cropRect(sw,sh,s.ratio,s.zoom),max=options.max||s.quality;
 const scale=Math.min(1,max/Math.max(crop.w,crop.h));const w=Math.max(1,Math.round(crop.w*scale)),h=Math.max(1,Math.round(crop.h*scale));
 const frame=s.frame==='auto'?(c.frame||'none'):s.frame;
 const border=frame==='none'?0:Math.round(w*.045),bottom=frame==='instant'?Math.round(w*.19):border;
 if(canvas.width!==w+2*border||canvas.height!==h+border+bottom){canvas.width=w+2*border;canvas.height=h+border+bottom;}
 const ctx=canvas.getContext('2d');ctx.save();ctx.fillStyle=frame==='film'?'#14130f':'#f4f1e7';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(border,border);
 ctx.save();if(options.mirror){ctx.translate(w,0);ctx.scale(-1,1);}
 const [b,contrast,sat,hue]=c.filter;
 ctx.filter=`brightness(${b*Math.pow(2,s.exposure)}) contrast(${contrast*(1+s.contrast/100)}) saturate(${sat*(1+s.saturation/100)}) sepia(${Math.max(0,s.temperature)/300}) hue-rotate(${hue+s.temperature/10+(s.tint||0)}deg)`;
 ctx.drawImage(source,crop.x,crop.y,crop.w,crop.h,0,0,w,h);ctx.restore();
 if(s.prism){ctx.save();ctx.globalAlpha=.14;ctx.globalCompositeOperation='screen';ctx.drawImage(source,crop.x,crop.y,crop.w,crop.h,w*.05,0,w,h);ctx.restore();}if(options.overlay){ctx.save();ctx.globalAlpha=.5;ctx.drawImage(options.overlay,0,0,w,h);ctx.restore();}
 const vg=Math.min(.85,c.vignette*s.vignette/25);if(vg){const g=ctx.createRadialGradient(w/2,h/2,w*.2,w/2,h/2,Math.max(w,h)*.75);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(0,0,0,${vg})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 if(s.leak>0){const g=ctx.createLinearGradient(0,0,w*.8,h*.3);g.addColorStop(0,`rgba(255,75,12,${s.leak/130})`);g.addColorStop(.35,`rgba(255,168,54,${s.leak/400})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 const grain=c.grain*s.grain/20;if(grain){ctx.save();ctx.globalAlpha=Math.min(.22,grain*.28);let seed=options.seed||23;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const count=Math.min(14000,w*h/40);for(let i=0;i<count;i++){ctx.fillStyle=i%2?'#fff':'#000';const size=1+w/700;ctx.fillRect(random()*w,random()*h,size,size);}ctx.restore();}
 if(c.id==='vhs'){ctx.fillStyle='#0002';for(let y=0;y<h;y+=5)ctx.fillRect(0,y,w,1);}
 if(s.timestamp){ctx.save();ctx.font=`${Math.max(11,w*.025)}px monospace`;ctx.textAlign='right';ctx.fillStyle='#ffad52';ctx.shadowColor='#9b2800';ctx.shadowBlur=3;ctx.fillText(new Date(options.date||Date.now()).toLocaleDateString('pt-BR'),w-w*.04,h-h*.04);ctx.restore();}
 ctx.restore();
 if(frame==='film'){ctx.fillStyle='#eee8d6';const step=canvas.height/14;for(let y=step/2;y<canvas.height;y+=step){ctx.fillRect(border*.3,y,border*.4,step*.35);ctx.fillRect(canvas.width-border*.7,y,border*.4,step*.35);}}
}
export function blobFromCanvas(canvas,type='image/jpeg'){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível exportar a imagem.')),type,.94));}
