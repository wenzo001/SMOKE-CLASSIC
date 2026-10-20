/* ============================================================
   LAYOUT · 桌面 / 移动端自适应布局
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   1) 缩放策略
   ------------------------------------------------------------
   像素游戏的两难：整数倍缩放边缘锐利，但常常填不满屏幕；
   分数缩放填得满，但每个游戏像素会被拉成不等宽的条带。

   解法：按「设备像素」取整。屏幕上 1 个 CSS px = dpr 个设备 px，
   当 缩放系数 s × dpr 是整数时，每个游戏像素恰好占整数个设备
   像素 → 边缘完全锐利、像素为方块。
   于是先算出 sMax，再从中挑一个 s×dpr ∈ ℤ 的值。

   dpr = 1 的桌面没有这个红利，退回经典阶梯
   4 / 3 / 2 / 1.5 / 1（1.5 是"填得更满"的折中，浏览器做最近邻
   放大，边缘依然硬，只是像素宽度不均匀）。
   ------------------------------------------------------------ */
let LAYOUT_ROT = 0;         // 横屏旋转角度：0 / 90 / -90（度）
let LAYOUT_SCALE = 1;       // 当前 游戏像素 → CSS px 的倍率

function isTouchDevice(){
  return !!( (window.matchMedia && window.matchMedia('(pointer:coarse)').matches)
          || ('ontouchstart' in window) );
}

function pickScale(sMax, touch){
  if(!(sMax > 0)) return 0.2;
  const dpr = window.devicePixelRatio || 1;
  if(touch || dpr >= 2){
    const crisp = Math.floor(sMax * dpr) / dpr;   // s×dpr 为整数
    if(crisp >= 1) return crisp;
  }
  for(const c of [4, 3, 2, 1.5, 1]) if(c <= sMax) return c;
  return sMax;
}

/* ------------------------------------------------------------
   2) 布局应用
   ------------------------------------------------------------
   竖屏：机台在 flex 里居中，提示条在下方。
   横屏（仅触屏设备）：机台整体旋转 90°，让竖版 320×480 的画面
   铺满宽屏。

   旋转方向不靠猜，而是读设备上报的 screen.orientation.angle：
     angle = 90  → 设备顺时针转了 90°，设备顶边在屏幕右侧
     angle = 270 → 设备逆时针转了 90°，设备顶边在屏幕左侧
   竖版内容要"看起来正"，就得让画面上方指向设备顶边所在的那一侧，
   于是画面旋转角直接取 angle。
   ------------------------------------------------------------ */
const BEZEL_PAD = 20;          // #bezel 左右 padding 合计
const STAGE_GAP = 10;          // #stage 内 flex gap

function deviceAngle(){
  const o = window.screen && window.screen.orientation;
  if(o && typeof o.angle === 'number' && (o.angle === 90 || o.angle === 270)) return o.angle;
  // 拿不到就按常见握法（home 键在右）取 90
  return 90;
}

function layoutApply(){
  const stage = document.getElementById('stage');
  const bezel = document.getElementById('bezel');
  const hintEl = document.getElementById('hint');
  if(!stage || !bezel) return;

  const touch = isTouchDevice();
  const vw = window.innerWidth, vh = window.innerHeight;
  const landscape = vw > vh * 1.15;
  const rot = touch && landscape ? deviceAngle() : 0;

  LAYOUT_ROT = rot;
  document.body.classList.toggle('rot', rot !== 0);
  bezel.classList.toggle('rot', rot !== 0);
  if(rot) bezel.style.setProperty('--rot', rot + 'deg');

  // 可用区域 = stage 内容盒（已扣掉安全区 padding）
  const cs = getComputedStyle(stage);
  const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
  const padT = parseFloat(cs.paddingTop)  || 0, padB = parseFloat(cs.paddingBottom) || 0;
  const availW = Math.max(120, stage.clientWidth  - padL - padR);
  const availH = Math.max(120, stage.clientHeight - padT - padB);

  // 提示条占位（横屏时已隐藏）
  const hintH = (rot || !hintEl || !hintEl.offsetParent) ? 0 : hintEl.offsetHeight + STAGE_GAP;

  // 旋转后画布在屏幕上的占位变成 H×s 宽、W×s 高
  const sMax = rot
    ? Math.min((availW - BEZEL_PAD) / H, (availH - BEZEL_PAD) / W)
    : Math.min((availW - BEZEL_PAD) / W, (availH - hintH - BEZEL_PAD) / H);

  const s = pickScale(sMax, touch);
  LAYOUT_SCALE = s;
  cv.style.width  = (W * s) + 'px';
  cv.style.height = (H * s) + 'px';

  if(rot){
    // transform 不改变布局盒，旋转后无法再靠 flex 居中 → 绝对定位到内容盒中心
    bezel.style.left = (padL + availW / 2) + 'px';
    bezel.style.top  = (padT + availH / 2) + 'px';
  } else {
    bezel.style.left = '';
    bezel.style.top  = '';
  }
}

/* ------------------------------------------------------------
   3) 指针 → 游戏坐标
   ------------------------------------------------------------
   横屏时画布被旋转了 90°，浏览器的 getBoundingClientRect()
   返回的是旋转后的轴对齐包围盒（宽高互换），不能直接线性映射，
   必须手工做一次逆变换。

   CSS rotate(θ) 在屏幕坐标（x 右、y 下）下为
       (dx, dy) → (dx·cosθ − dy·sinθ, dx·sinθ + dy·cosθ)
   θ = ±90 时 cosθ = 0、sinθ = r（r = ±1），于是
       (dx, dy) → (−r·dy, r·dx)
   反解得
       dx =  r·(screenY − cy)
       dy = −r·(screenX − cx)
   再加回画布半宽/半高得到画布局部坐标，最后除以缩放倍率
   得到游戏像素坐标。
   ------------------------------------------------------------ */
function pointerToGame(clientX, clientY){
  const r = cv.getBoundingClientRect();
  if(LAYOUT_ROT){
    const s = LAYOUT_SCALE;
    const cw = W * s, ch = H * s;
    const rsign = LAYOUT_ROT > 0 ? 1 : -1;
    // 旋转 ±90° 后，包围盒中心仍是画布的视觉中心
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const dx =  rsign * (clientY - cy);
    const dy = -rsign * (clientX - cx);
    return { x:(cw / 2 + dx) / s, y:(ch / 2 + dy) / s };
  }
  return { x:(clientX - r.left) * W / r.width, y:(clientY - r.top) * H / r.height };
}

/* 首次进入时按设备类型给一句合适的操作提示 */
function layoutHint(){
  const hintEl = document.getElementById('hint');
  if(!hintEl) return;
  if(isTouchDevice()){
    hintEl.innerHTML = '<b>点按</b>屏幕操作 · <b>长按</b>吸气 · <b>拖动</b>瞄准 · 右上角小键暂停';
  } else {
    hintEl.innerHTML = '<b>空格/回车</b> 操作 · <b>P</b> 暂停 · <b>R</b> 重开 · <b>←→</b> 瞄准 · 手机直接点按/长按/拖动';
  }
}
