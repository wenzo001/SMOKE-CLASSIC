/* ============================================================
   DRAW · 绘制工具
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 13 · 绘制工具
   ============================================================ */
function rect(x,y,w,h,col){ ctx.fillStyle=col; ctx.fillRect(x|0,y|0,w|0,h|0); }
function frameRect(x,y,w,h,col){ ctx.fillStyle=col; ctx.fillRect(x|0,y|0,w|0,1); ctx.fillRect(x|0,(y+h-1)|0,w|0,1);
  ctx.fillRect(x|0,y|0,1,h|0); ctx.fillRect((x+w-1)|0,y|0,1,h|0); }
function panel(x,y,w,h,fill,edge,shadow){
  if(shadow!==false) rect(x+2,y+2,w,h,'rgba(0,0,0,.45)');
  rect(x,y,w,h,fill); frameRect(x,y,w,h,edge);
}
function text(str,x,y,o){ return drawText(str,x,y,o); }
/* 自适应字号：保证长中文文案永远不超出画布 */
function textFit(str,x,y,o){
  const maxW = (o && o.maxW) || (W-16);
  let size = o.size || 12;
  while(size > 9 && measureText(str, size) > maxW) size--;
  return drawText(str,x,y,Object.assign({},o,{size}));
}
function dither(x,y,w,h,c1,c2){ // 棋盘格纹理
  for(let j=0;j<h;j++) for(let i=0;i<w;i++){ if(((i+j)&1)===0) rect(x+i,y+j,1,1,c1); }
}
let scanPat = null;
function scanlines(){
  if(!scanPat){
    const c=document.createElement('canvas'); c.width=1; c.height=2;
    const g=c.getContext('2d');
    g.fillStyle='rgba(0,0,0,.20)'; g.fillRect(0,1,1,1);
    scanPat=ctx.createPattern(c,'repeat');
  }
  ctx.fillStyle=scanPat; ctx.fillRect(0,0,W,H);
}

/* 背景：远处霓虹 + 上升烟 */
const bgStars = Array.from({length:34},()=>({x:rand(0,W),y:rand(0,H),s:Math.random()<0.3?2:1,c:Math.random()<0.5?'#3a3358':'#2b2645'}));
const bgSmoke = Array.from({length:26},()=>({x:rand(0,W),y:rand(0,H),v:rand(6,18),a:rand(0.05,0.16)}));
function drawBackdrop(t){
  rect(0,0,W,H,C.bg);
  rect(0,0,W,60,'#191430');
  dither(0,60,W,3,'#221b3a',C.bg);
  for(const s of bgStars) rect(s.x|0,s.y|0,s.s,s.s,s.c);
  for(const s of bgSmoke){
    s.y -= s.v*0.016;
    if(s.y < -8){ s.y=H+8; s.x=rand(0,W); }
    ctx.fillStyle = 'rgba(200,190,220,'+s.a+')';
    ctx.fillRect(s.x|0, s.y|0, 2,2);
  }
}
