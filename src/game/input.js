/* ============================================================
   INPUT · 输入
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 10 · 输入
   ============================================================ */
let pointerDown = false, lastPress = 0;
window.addEventListener('keydown', e=>{
  if(e.repeat){ if(curScreen()===SCR.GAME && G.phase==='exhale'){ adjustAngle(e.key); e.preventDefault(); } return; }
  const k = e.key;
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(k)) e.preventDefault();
  SFX.init(); SFX.resume();
  const s = curScreen();
  if(s===SCR.GAME){
    if(k==='p'||k==='Escape'){ if(curScreen()!==SCR.PAUSE){ push(SCR.PAUSE); SFX.back(); } return; }
    if(k==='r'){ startGame(); SFX.select(); return; }
    if(k===' '||k==='Enter'){
      if(G.phase==='light') doLight();
      else if(G.phase==='inhale'){ G.inhale.holding = true; SFX.inhaleStart(); }
      else if(G.phase==='exhale'){ G.exhale.charging = true; G.exhale.chargeT = 0; }
    }
    if(G.phase==='exhale' && (k==='ArrowUp'||k==='ArrowDown'||k==='w'||k==='s')) adjustAngle(k);
  }
  else if(s===SCR.TITLE) menuKey(k);
  else if(s===SCR.PAUSE) menuKey(k);
  else if(s===SCR.RESULT) menuKey(k);
  else if(s===SCR.SETTINGS) settingsKey(k);
  else if(s===SCR.CODEX) codexKey(k);
});
window.addEventListener('keyup', e=>{
  const k = e.key.toLowerCase();  if(curScreen()===SCR.GAME && G.phase==='inhale' && G.inhale.holding) releaseInhale();
  if(curScreen()===SCR.GAME && G.phase==='exhale' && G.exhale.charging){ G.exhale.charging=false; fireRing(); }
});
function adjustAngle(k){
  const d = (k==='ArrowUp'||k==='w') ? -1 : (k==='ArrowDown'||k==='s') ? 1 : 0;
  if(!d) return;
  G.exhale.angle = clamp(G.exhale.angle + d*0.022, -Math.PI*0.94, -0.10);
}
function menuKey(k){
  const s = curScreen();
  const items = menuItems(s);
  if(k==='r' && (s===SCR.RESULT || s===SCR.PAUSE)){ SFX.select(); startGame(); return; }
  if(k==='ArrowUp'||k==='w'){ menuSel[s] = (menuSel[s]-1+items.length)%items.length; SFX.ui(); }
  else if(k==='ArrowDown'||k==='s'){ menuSel[s] = (menuSel[s]+1)%items.length; SFX.ui(); }
  else if(k===' '||k==='Enter'){ SFX.select(); items[menuSel[s]].act(); }
  else if(k==='Escape'||k==='Backspace'){ SFX.back(); if(s===SCR.PAUSE) pop(); else if(s===SCR.RESULT){ stack=[SCR.TITLE]; menuSel.title=0; } }
}
function settingsKey(k){
  const items = settingsItems();
  if(k==='ArrowUp'||k==='w'){ menuSel.settings=(menuSel.settings-1+items.length)%items.length; SFX.ui(); }
  else if(k==='ArrowDown'||k==='s'){ menuSel.settings=(menuSel.settings+1)%items.length; SFX.ui(); }
  else if(k===' '||k==='Enter'){ SFX.select(); items[menuSel.settings].act(); }
  else if(k==='ArrowLeft'||k==='a'){ const it=items[menuSel.settings]; if(it.left){ SFX.ui(); it.left(); save(); } }
  else if(k==='ArrowRight'||k==='d'){ const it=items[menuSel.settings]; if(it.right){ SFX.ui(); it.right(); save(); } }
  else if(k==='Escape'){ SFX.back(); pop(); }
}
function codexKey(k){
  if(k==='Escape'){ SFX.back(); pop(); return; }
  if(k==='ArrowLeft'||k==='a'){ codexTab=(codexTab+3)%4; codexScroll=0; SFX.ui(); return; }
  if(k==='ArrowRight'||k==='d'){ codexTab=(codexTab+1)%4; codexScroll=0; SFX.ui(); return; }
  if(k==='ArrowUp'||k==='w'){ codexScroll=Math.max(0,codexScroll-1); SFX.ui(); }
  if(k==='ArrowDown'||k==='s'){ codexScroll=Math.min(codexMaxScroll(),codexScroll+1); SFX.ui(); }
}
/* 指针 */
function canvasPos(e){
  return pointerToGame(e.clientX, e.clientY);
}
cv.addEventListener('pointerdown', e=>{
  e.preventDefault();
  cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  const p = canvasPos(e);
  pointerDown = true;
  SFX.init(); SFX.resume();
  const s = curScreen();
  if(s===SCR.GAME){
    if(p.x>=290 && p.x<=318 && p.y>=2 && p.y<=22){ push(SCR.PAUSE); SFX.back(); return; }
    if(G.pendingEvent){ G.eventT = 99; return; }     // 点击跳过事件卡
    if(G.phase==='light') doLight();
    else if(G.phase==='inhale'){ G.inhale.holding=true; SFX.inhaleStart(); }
    else if(G.phase==='exhale'){ aimAt(p.x,p.y); G.exhale.charging=true; G.exhale.chargeT=0; }
    return;
  }  if(s===SCR.CODEX){
    const hit = hitUI(p.x,p.y);
    if(hit>=0){ codexTab = hit; codexScroll = 0; SFX.ui(); }
    else { codexDrag = true; codexDragY = p.y; codexDragS = codexScroll; }
    return;
  }
  const items = (s===SCR.SETTINGS) ? settingsItems() : menuItems(s);
  const hit = hitUI(p.x,p.y);
  if(hit>=0 && items[hit]){ menuSel[s] = hit; SFX.select(); items[hit].act(); }
});
cv.addEventListener('pointermove', e=>{
  const p = canvasPos(e);
  if(curScreen()===SCR.CODEX && codexDrag){
    codexScroll = clamp(codexDragS + Math.round((codexDragY - p.y)/22), 0, codexMaxScroll());
    return;
  }
  if(curScreen()===SCR.GAME && G.phase==='exhale') aimAt(p.x,p.y);
});
cv.addEventListener('pointerup', e=>{
  e.preventDefault();
  pointerDown = false;
  codexDrag = false;
  if(curScreen()===SCR.GAME){
    if(G.phase==='inhale' && G.inhale.holding) releaseInhale();
    if(G.phase==='exhale' && G.exhale.charging){ G.exhale.charging=false; fireRing(); }
  }
});
cv.addEventListener('pointercancel', ()=>{ pointerDown=false; codexDrag=false; if(curScreen()===SCR.GAME&&G.phase==='inhale'&&G.inhale.holding) releaseInhale(); });
cv.addEventListener('contextmenu', e=>e.preventDefault());
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden && curScreen()===SCR.GAME){ push(SCR.PAUSE); }
});
function aimAt(x,y){
  const ox=160, oy=392;
  let a = Math.atan2(y-oy, x-ox);
  if(y > oy-8) a = G.exhale.angle;            // 手指在下方 → 保持原角度
  G.exhale.angle = clamp(a, -Math.PI*0.94, -0.10);
}
