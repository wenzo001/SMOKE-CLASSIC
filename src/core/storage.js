/* ============================================================
   STORAGE · 设置 & 存档
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 7 · 设置 & 存档
   ============================================================ */
const DEF_SET = { sound:true, shake:true, flash:true, guide:true, bigText:true };
let SET = Object.assign({}, DEF_SET);
let BEST = 0, seenBrands = {}, seenTargets = {};
let TOP = [];                       // 本地排行榜（前 5）
let STATS = { runs:0, cigs:0, bestCombo:0, lastPlay:0 };   // 累计统计
let LAST = 0;                      // 上一局得分
try{
  const raw = localStorage.getItem('smoke_classic_v1');
  if(raw){
    const o = JSON.parse(raw);
    if(o.set) SET = Object.assign({}, DEF_SET, o.set);
    BEST = o.best||0;
    seenBrands = o.seenBrands||{};
    seenTargets = o.seenTargets||{};
    TOP = o.top||[];
    STATS = Object.assign({runs:0,cigs:0,bestCombo:0,lastPlay:0}, o.stats||{});
    LAST = o.last||0;
  }
}catch(e){}
function save(){
  try{
    localStorage.setItem('smoke_classic_v1', JSON.stringify({
      set:SET, best:BEST, seenBrands, seenTargets, top:TOP, stats:STATS, last:LAST
    }));
  }catch(e){}
}
