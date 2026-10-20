/* ============================================================
   CONST · 常量与调色板
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 1 · 常量与调色板
   ============================================================ */
const W = 320, H = 480;                 // 参考分辨率（像素）
const cv  = document.getElementById('game');
const ctx = cv.getContext('2d', { alpha:false });
ctx.imageSmoothingEnabled = false;

const C = {
  bg:'#15111f', bg2:'#1d1830', panel:'#241d3a', panel2:'#2e2750',
  edge:'#4b3f7d', edge2:'#6c5ca8', edge3:'#8a7ac4',
  txt:'#eae4f8', dim:'#9a90bd', dim2:'#6f6695',
  gold:'#ffd447', gold2:'#ffb020',
  red:'#e2574c', red2:'#a8322c', green:'#6bd97a', cyan:'#5ec8e8',
  paper:'#f4f0e6', paper2:'#c3bca9', ember:'#ff8a3d', flame:'#ffe66d',
  smoke:'#c9c1dc', dark:'#0b0912', white:'#ffffff'
};
