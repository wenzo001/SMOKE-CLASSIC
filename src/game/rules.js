/* ============================================================
   RULES · 局内逻辑
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 11 · 局内逻辑
   ============================================================ */
function startGame(){
  stack = [SCR.GAME];
  G.phase='light'; G.t=0; G.phaseT=0;
  G.score=0; G.combo=0; G.bestCombo=0; G.level=1; G.lung=0; G.cigs=0;
  G.perfects=0; G.attempts=0; G.cigCount={};
  G.chain=0; G.bestChain=0; G.tier=0;
  G.fx.length=0; G.parts.length=0; G.smoke.length=0;
  G.pendingEvent=null; G.over=false; G.overT=0;
  G.shake=0; G.freeze=0; G.flash=0;
  newCigarette();
  save();                                          // 图鉴解锁进度落盘
}
function newCigarette(){
  const b = pick(BRANDS);
  G.brand = b;
  seenBrands[b.name] = (seenBrands[b.name]||0)+1;
  G.level = G.cigs+1;
  G.tier = tierOf(G.level);
  // 假烟彩蛋
  G.fake = Math.random() < 0.03;
  setupLight();
  G.phase='light'; G.phaseT=0;
  syncHud();
}
function setupLight(){
  const L = G.level, b = G.brand;
  G.light.track0 = 40; G.light.track1 = 280;
  G.light.target  = 160;
  // 难度递增：滑轨更快、金区更窄
  G.light.speed   = 78 + L*8.5 + (b?b.smooth*1.6:0);
  G.light.zone    = clamp(26 - L*1.15 - (b?(5-b.smooth)*0.8:0), 9, 28);
  G.light.x = G.light.track0;
  G.light.dir = 1;
  G.light.lit = false;
  G.attempts++;
}
function setupInhale(){
  const L = G.level, b = G.brand;
  // 理想区随等级收窄（"七分饱"越来越难拿捏）
  const w = clamp(36 - L*2.3 + (b?b.smooth*0.9:0), 10, 38);
  G.inhale.hi = 100 - clamp(8 + L*1.2, 8, 26);
  G.inhale.lo = G.inhale.hi - w;
  G.inhale.v = 0; G.inhale.holding=false; G.inhale.choked=false; G.inhale.idle = 0;
  G.inhale.driftAmp = L>=4 ? (L-3)*1.6 : 0;   // 高等级绿区左右漂移
  G.inhale.drift = 0;
  G.phase='inhale'; G.phaseT=0;
}
function setupExhale(){
  const L = G.level;
  const t = pick(TARGETS);
  seenTargets[t.id] = (seenTargets[t.id]||0)+1;
  const tx = rand(58, 278), ty = rand(132, 268);
  G.exhale.target = { x:tx, y:ty, r:clamp(21 - L*1.25, 7, 21), t, vx:0, vy:0 };
  // 高等级：靶子会动 / 有风偏
  if(L >= 6){
    const a = rand(0, Math.PI*2);
    G.exhale.target.vx = Math.cos(a)*rand(14,26);
    G.exhale.target.vy = Math.sin(a)*rand(10,18);
  }
  G.exhale.wind = L>=8 ? rand(-26,26) : 0;
  G.exhale.angle = clamp(Math.atan2(ty-392, tx-160), -Math.PI*0.94, -0.10);
  G.exhale.power = 0; G.exhale.charging=false; G.exhale.chargeT=0;
  G.exhale.ring = null; G.exhale.fired=false; G.exhale.over=false;
  G.phase='exhale'; G.phaseT=0;
}
const RING_G = 220;                       // 重力
const RING_DT = 1/50;                     // 固定步长（预览与飞行共用）
const ringSpeed = p => 170 + clamp(p,0,1)*280;
function doLight(){
  const L = G.light;
  const d = Math.abs(L.x - L.target);
  SFX.lighter();
  const perfect = d <= Math.max(3, L.zone*0.34);
  const good    = d <= L.zone;
  if(G.fake && good && !perfect){
    G.fake = false;
    popText(160, 210, '这味儿不对！', C.red, true);
    popText(160, 236, '老板，这烟是假的', C.dim);
    addTrauma(0.25); flash('#ff5555',0.5); SFX.fail();
    G.combo=0;
    syncHud();
    return;
  }
  if(perfect){
    addScore(120, 160, 210, C.gold, true);
    G.combo++; G.perfects++; bumpChain();
    L.lit = true;
    burst(L.target, 300, 16, C.gold, 90);
    addTrauma(0.4); hitStop(0.05); flash('#ffd447',0.45);
    popText(160, 210, '咔嚓！', C.gold, true);
    popText(160, 240, '完美点火', C.txt);
    SFX.perfect();
    G.phase='idle'; G.phaseT=0;
    G.pending = { kind:'toInhale', t:0.62 };
  } else if(good){
    addScore(45, 160, 210, C.cyan, false);
    G.chain = 0;
    L.lit = true;
    burst(L.target, 300, 7, C.ember, 55);
    addTrauma(0.16); SFX.good();
    popText(160, 215, '点着了', C.cyan);
    G.phase='idle'; G.phaseT=0;
    G.pending = { kind:'toInhale', t:0.52 };
  } else {
    SFX.miss(); addTrauma(0.1);
    popText(160, 215, '没点着', C.dim);
    // 火苗继续跑，重来一次
  }
  syncHud();
}
function releaseInhale(){
  if(!G.inhale.holding) return;
  G.inhale.holding=false;
  SFX.inhaleStop();
  const lo = G.inhale.lo + G.inhale.drift, hi = G.inhale.hi + G.inhale.drift;
  const v = G.inhale.v;
  if(v>=100){
    // 呛到
    G.inhale.choked = true;
    G.combo = 0; G.chain = 0;
    G.lung += 9;
    addTrauma(0.75); hitStop(0.12); flash('#ff6b5e',0.7);
    burst(160, 300, 26, C.smoke, 110);
    popText(160, 200, '咳！呛到了', C.red, true);
    popText(160, 232, '肺负担 +9', C.red);
    SFX.choke();
    syncHud();
    endCigarette(true);
    return;
  }
  if(v>=lo && v<=hi){
    const prec = 1 - Math.abs((v-lo)/Math.max(1,(hi-lo)) - 0.5)*2;  // 0..1
    const pts = Math.round(120 + 120*prec);
    addScore(pts, 160, 196, C.green, true);
    G.combo++; G.perfects++; bumpChain();
    addTrauma(0.35); hitStop(0.05); flash('#6bd97a',0.35);
    burst(160, 300, 12, C.smoke, 80);
    popText(160, 196, '刚刚好', C.green, true);
    popText(160, 226, '+'+pts, C.gold);
    SFX.perfect();
    G.phase='idle'; G.phaseT=0;
    G.pending = { kind:'toExhale', t:0.64 };
  } else {
    addScore(35, 160, 200, C.dim, false);
    G.combo = 0; G.chain = 0;
    popText(160, 200, v<lo ? '没吸到位' : '过猛了', C.dim);
    SFX.fail();
    G.phase='idle'; G.phaseT=0;
    G.pending = { kind:'toExhale', t:0.48 };
  }
  syncHud();
}
function fireRing(){
  const E = G.exhale;
  if(E.fired) return;
  // 力度不足：手滑了一下，不算失误，直接取消
  if(E.power < 0.18){ E.power = 0; E.charging=false; E.chargeT=0; return; }
  E.fired = true;
  const p = clamp(E.power, 0.12, 1);
  const sp = ringSpeed(p);
  E.ring = { x:160, y:392, vx:Math.cos(E.angle)*sp, vy:Math.sin(E.angle)*sp, alive:true, t:0, acc:0 };
  E.power = 0;
  SFX.exhale();
  addTrauma(0.12);
}
function endCigarette(choked){
  G.cigs++;
  G.cigCount[G.brand.name] = (G.cigCount[G.brand.name]||0)+1;
  // 肺负载随等级递增：越往后每根烟越"贵"
  const load = 4 + G.brand.tar*0.5 + G.level*0.55 + (choked?4:0);
  G.lung = clamp(G.lung + load, 0, 100);
  G.bestCombo = Math.max(G.bestCombo, G.combo);
  syncHud();
  if(G.lung >= 100){ gameOver(); return; }
  G.phase='idle'; G.phaseT=0;
  G.pendingEvent = Math.random()<0.42 ? weightedEvent() : null;
  G.eventT = G.pendingEvent ? 0 : -1;
  if(!G.pendingEvent){ G.pending = { kind:'nextCig', t:0.7 }; }
}
function weightedEvent(){
  const total = EVENTS.reduce((a,e)=>a+e.w,0);
  let r = Math.random()*total;
  for(const e of EVENTS){ r -= e.w; if(r<=0) return e; }
  return EVENTS[0];
}
function gameOver(){
  G.over = true; G.phase='idle';
  G.bestCombo = Math.max(G.bestCombo, G.combo);
  G.newBest = G.score > BEST;
  LAST = G.score;
  STATS.runs++; STATS.cigs += G.cigs; STATS.bestCombo = Math.max(STATS.bestCombo||0, G.bestCombo);
  // 本地排行榜
  TOP.push({ s:G.score, c:G.cigs, t:Date.now() });
  TOP.sort((a,b)=>b.s-a.s);
  TOP = TOP.slice(0,5);
  if(G.newBest){ BEST = G.score; SFX.record(); }
  else SFX.over();
  save();
  addTrauma(0.9); hitStop(0.14); flash('#ffffff',0.6);
  G.overT = 0;
  G.pending = { kind:'result', t:0.9 };
}
function addScore(pts,x,y,col,big){
  const mult = 1 + 0.25*Math.min(G.combo,8);
  let total = Math.round(pts*mult);
  G.score += total;
  bus.emit('score', G.score);
  syncHud();
  popText(x, y, '+'+total, col, big);
  if(G.combo>=3 && G.combo%3===0) popText(x, y-24, 'x'+mult.toFixed(2), C.gold, false);
}
/* 完美链：点火/吸气/吐圈 三段全完美 → 一根"好烟" */
function bumpChain(){
  G.chain++;
  G.bestChain = Math.max(G.bestChain, G.chain);
  if(G.chain === 3){
    G.chain = 0;
    const bonus = 300 + G.level*40;
    G.score += bonus;
    bus.emit('score', G.score);
    popText(160, 150, '完美一根！', C.gold, true);
    popText(160, 178, '三段全中 +'+bonus, C.green);
    burst(160, 300, 30, C.gold, 150);
    addTrauma(0.55); hitStop(0.09); flash('#ffd447',0.55);
    SFX.levelUp();
    syncHud();
  }
}
