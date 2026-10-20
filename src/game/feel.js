/* ============================================================
   FEEL · 反馈工具（game-feel 规范）
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 9 · 反馈工具（game-feel 规范）
   ============================================================ */
function addTrauma(a){ G.shake = Math.min(1, G.shake + a); }
function shakeOffset(){
  if(!SET.shake) return [0,0];
  const s = G.shake*G.shake;                       // 平方 → 小事件几乎不晃
  const t = G.t;
  return [ 9*s*Math.sin(t*47.3) + 4*s*Math.sin(t*91.7),
          6*s*Math.sin(t*53.1) + 3*s*Math.sin(t*103.3) ];
}
function hitStop(sec){ G.freeze = Math.max(G.freeze, sec); }
function flash(col, amt){ if(!SET.flash) return; G.flash = amt; G.flashCol = col; }
function popText(x,y,text,col,big){ G.fx.push({x,y,text,col,t:0,dur:1.0,big:!!big}); }
function burst(x,y,n,col,spd){
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, s = rand(spd*0.35, spd);
    G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-18,life:rand(0.35,0.85),t:0,col,size:Math.random()<0.4?2:1});
  }
}
function trail(x,y,col){ G.smoke.push({x,y,col,t:0,life:rand(0.5,1.1)}); }
