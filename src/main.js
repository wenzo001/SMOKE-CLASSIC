/* ============================================================
   MAIN · 主渲染 & 主循环
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 16 · 主渲染 & 主循环
   ============================================================ */
function render(){
  const s = curScreen();
  if(s===SCR.TITLE)   drawTitle();
  else if(s===SCR.CODEX)   drawCodex();
  else if(s===SCR.SETTINGS) drawSettings();
  else if(s===SCR.GAME)   renderGame();
  else if(s===SCR.PAUSE){ renderGame(); drawPause(); }
  else if(s===SCR.RESULT){ renderGame(); drawResult(); }
  scanlines();
}
function resize(){
  layoutApply();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', ()=>setTimeout(resize,180));
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', resize);
}

let last = performance.now(), acc = 0;
const STEP = 1000/60;
function frame(now){
  let dt = now - last; last = now;
  if(dt > 250) dt = STEP;                    // 切回前台不跳帧
  // 命中停顿：短暂冻结时间，但输入仍然可响应
  if(G.freeze > 0){
    G.freeze = Math.max(0, G.freeze - dt/1000);
    render();
    requestAnimationFrame(frame);
    return;
  }
  acc += dt;
  let guard = 0;
  while(acc >= STEP && guard++ < 6){ acc -= STEP; update(STEP/1000); }
  render();
  requestAnimationFrame(frame);
}
layoutHint();
resize();
requestAnimationFrame(frame);

// 首次交互解锁音频
window.addEventListener('pointerdown', ()=>{ SFX.init(); SFX.resume(); }, {once:true});
window.addEventListener('keydown', ()=>{ SFX.init(); SFX.resume(); }, {once:true});
