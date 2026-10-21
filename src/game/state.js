/* ============================================================
   STATE · 屏幕栈 & 全局状态
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 8 · 屏幕栈 & 全局状态
   ============================================================ */
const SCR = { TITLE:'title', CODEX:'codex', SETTINGS:'settings', GAME:'game', PAUSE:'pause', RESULT:'result' };
let stack = [SCR.TITLE];
const push = s => { stack.push(s); };
const pop  = () => { if(stack.length>1) stack.pop(); };
const curScreen = () => stack[stack.length-1];

const G = {
  phase:'light',            // light | inhale | exhale | idle
  t:0, phaseT:0,
  score:0, combo:0, bestCombo:0, level:1, lung:0, cigs:0,
  perfects:0, attempts:0, chain:0, bestChain:0, tier:0,
  chokes:0, perfectCigs:0,          // 单局目标统计
  special:null,                     // 当前特殊烟（null = 普通烟）
  goal:null, goalDone:false, goalBonus:0,
  brand:null, cigCount:{},
  light:{x:0,dir:1,target:160,zone:22,track0:40,track1:280,speed:100,lit:false},
  inhale:{v:0,holding:false,lo:55,hi:85,drift:0,driftAmp:0,choked:false},
  exhale:{angle:-Math.PI/4, power:0, charging:false, chargeT:0, ring:null, target:null, fired:false, over:false, wind:0},
  fx:[], parts:[], smoke:[],
  eventT:0, pendingEvent:null, pending:null, newBest:false,
  over:false, overT:0, shake:0, shakeT:0, freeze:0, flash:0, flashCol:'#fff',
  started:false, mouse:{x:160,y:240}, keyAngle:0
};
const TIERS = [
  {name:'新手',  min:1,  color:'#6bd97a'},
  {name:'熟手',  min:5,  color:'#5ec8e8'},
  {name:'老炮',  min:9,  color:'#ffd447'},
  {name:'传说',  min:13, color:'#e2574c'}
];
function tierOf(level){
  let t = 0;
  for(let i=0;i<TIERS.length;i++) if(level >= TIERS[i].min) t = i;
  return t;
}
let menuSel = { title:0, pause:0, result:0, settings:0, codex:0 };
let codexTab = 0, codexScroll = 0;
let codexDrag = false, codexDragY = 0, codexDragS = 0;

/* ---- 事件总线：HUD 只在事件触发时刷新，不做每帧轮询 ---- */
const bus = (function(){
  const map = {};
  return {
    on(k,f){ (map[k]=map[k]||[]).push(f); },
    emit(k,v){ (map[k]||[]).forEach(f=>f(v)); }
  };
})();
const HUD = { score:0, best:0, combo:0, lung:0, cig:0, level:1, brand:'' };
bus.on('score', v=>{ HUD.score = v; });
bus.on('hud',   ()=>{ HUD.best=BEST; HUD.combo=G.combo; HUD.lung=G.lung; HUD.cig=G.cigs; HUD.level=G.level; HUD.brand=G.brand?G.brand.name:''; });
function syncHud(){ bus.emit('hud'); }
