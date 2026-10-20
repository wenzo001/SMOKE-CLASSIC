/* ============================================================
   FONT · 像素字体
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 3 · 像素字体
   5x7 点阵（拉丁/数字）+ 中文低分辨率渲染后硬阈值化 → 两种都是真像素字
   ============================================================ */
const FONT5 = {
'0':[0x3E,0x51,0x49,0x45,0x3E],'1':[0x00,0x42,0x7F,0x40,0x00],'2':[0x42,0x61,0x51,0x49,0x46],
'3':[0x21,0x41,0x45,0x4B,0x31],'4':[0x18,0x14,0x12,0x7F,0x10],'5':[0x27,0x45,0x45,0x45,0x39],
'6':[0x3C,0x4A,0x49,0x49,0x30],'7':[0x01,0x71,0x09,0x05,0x03],'8':[0x36,0x49,0x49,0x49,0x36],
'9':[0x06,0x49,0x49,0x29,0x1E],
'A':[0x7E,0x11,0x11,0x11,0x7E],'B':[0x7F,0x49,0x49,0x49,0x36],'C':[0x3E,0x41,0x41,0x41,0x22],
'D':[0x7F,0x41,0x41,0x22,0x1C],'E':[0x7F,0x49,0x49,0x49,0x41],'F':[0x7F,0x09,0x09,0x09,0x01],
'G':[0x3E,0x41,0x49,0x49,0x7A],'H':[0x7F,0x08,0x08,0x08,0x7F],'I':[0x00,0x41,0x7F,0x41,0x00],
'J':[0x20,0x40,0x41,0x3F,0x01],'K':[0x7F,0x08,0x14,0x22,0x41],'L':[0x7F,0x40,0x40,0x40,0x40],
'M':[0x7F,0x02,0x0C,0x02,0x7F],'N':[0x7F,0x04,0x08,0x10,0x7F],'O':[0x3E,0x41,0x41,0x41,0x3E],
'P':[0x7F,0x09,0x09,0x09,0x06],'Q':[0x3E,0x41,0x51,0x21,0x5E],'R':[0x7F,0x09,0x19,0x29,0x46],
'S':[0x46,0x49,0x49,0x49,0x31],'T':[0x01,0x01,0x7F,0x01,0x01],'U':[0x3F,0x40,0x40,0x40,0x3F],
'V':[0x1F,0x20,0x40,0x20,0x1F],'W':[0x3F,0x40,0x38,0x40,0x3F],'X':[0x63,0x14,0x08,0x14,0x63],
'Y':[0x07,0x08,0x70,0x08,0x07],'Z':[0x61,0x51,0x49,0x45,0x43],
' ':[0,0,0,0,0],'.':[0x00,0x60,0x60,0x00,0x00],',':[0x00,0x80,0x60,0x00,0x00],
'!':[0x00,0x00,0x5F,0x00,0x00],'?':[0x02,0x01,0x51,0x09,0x06],':':[0x00,0x36,0x36,0x00,0x00],
'-':[0x08,0x08,0x08,0x08,0x08],'+':[0x08,0x08,0x3E,0x08,0x08],'/':[0x20,0x10,0x08,0x04,0x02],
'(':[0x00,0x1C,0x22,0x41,0x00],')':[0x00,0x41,0x22,0x1C,0x00],'%':[0x23,0x13,0x08,0x64,0x62],
'*':[0x14,0x08,0x3E,0x08,0x14],'>':[0x41,0x22,0x14,0x08,0x00],'<':[0x08,0x14,0x22,0x41,0x00],
'=':[0x14,0x14,0x14,0x14,0x14],'#':[0x14,0x7F,0x14,0x7F,0x14],"'":[0x00,0x07,0x00,0x00,0x00],
'"':[0x00,0x07,0x00,0x07,0x00],'x':[0x44,0x28,0x10,0x28,0x44],'_':[0x40,0x40,0x40,0x40,0x40]
};
const FONT_ORDER = Object.keys(FONT5);
const FONT_IDX = {}; FONT_ORDER.forEach((c,i)=>FONT_IDX[c]=i);
const atlasCache = new Map();
function getAtlas(color){
  if(atlasCache.has(color)) return atlasCache.get(color);
  const c = document.createElement('canvas');
  c.width = FONT_ORDER.length*5; c.height = 7;
  const g = c.getContext('2d');
  g.fillStyle = color;
  for(let i=0;i<FONT_ORDER.length;i++){
    const cols = FONT5[FONT_ORDER[i]];
    for(let x=0;x<5;x++){
      const bits = cols[x];
      for(let y=0;y<7;y++) if(bits & (1<<y)) g.fillRect(i*5+x, y, 1, 1);
    }
  }
  atlasCache.set(color, c);
  return c;
}
const asciiScale = size => size>=26?4:size>=20?3:size>=14?2:1;

/* ------------------------------------------------------------
   中文字形：超采样渲染 → 覆盖率降采样 → 阈值化 → 不透明黑白掩码
   ------------------------------------------------------------
   为什么不用「直接 12px 渲染再硬阈值」：
   小字号中文在浏览器里会被 hinting 压成 1px 细笔画，一旦阈值化
   笔画就断成碎渣（"一根烟三口气"糊成一团）。

   为什么超采样：
   用 size*SS 的字号渲染（浏览器不会对大字号做细笔画 hinting），
   再按 SS×SS 块求 alpha 平均得到「该像素被笔画覆盖的比例」，
   相当于对字形做了一次面积抗锯齿 —— 覆盖率能保住细笔画的连续性。

   为什么阈值化后 RGB 要写 255/255/255 且 alpha 写 255（全不透明）：
   Canvas 是预乘 alpha 存储的。putImageData 写 RGB=255 + alpha=200 时，
   浏览器反预乘会算 255/0 → 无穷大 → alpha 被钳成 0（字全丢）。
   只输出「全黑全透明」和「全白全不透明」两种状态就没有歧义，
   颜色交给 globalCompositeOperation='source-in' 合成上去。
   ------------------------------------------------------------ */
const CJK_SS = 3;                       // 超采样倍率
const CJK_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Hiragino Sans GB",sans-serif';
/* 覆盖率阈值：字号越小笔画越容易断，适当降低阈值把细笔画"补粗"一点 */
const cjkThr = size => size >= 12 ? 128 : 112;

const cjkMaskCache = new Map();         // str|size -> {mask, w, h}
const cjkColorCache = new Map();        // str|size|color -> {canvas, w, h}
const cjkWidthCache = new Map();        // str|size -> width

function cjkMetrics(str, size){
  const key = str + '|' + size;
  if (cjkWidthCache.has(key)) return cjkWidthCache.get(key);
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = size + 'px ' + CJK_FONT;
  const wSmall = probe.measureText(str).width;
  const w = Math.max(1, Math.ceil(wSmall) + 2);
  const h = Math.ceil(size * 1.38) + 2;
  const res = { w, h, wSmall };
  cjkWidthCache.set(key, res);
  return res;
}

function getCjkMask(str, size){
  const key = str + '|' + size;
  if (cjkMaskCache.has(key)) return cjkMaskCache.get(key);

  const SS = CJK_SS;
  const m = cjkMetrics(str, size);
  const w = m.w, h = m.h;

  // 大画布：在 size*SS 字号下绘制，字形左缘与大画布 1*SS 对齐
  const big = document.createElement('canvas');
  const bigFont = size * SS + 'px ' + CJK_FONT;
  const probe = big.getContext('2d');
  probe.font = bigFont;
  const fwBig = probe.measureText(str).width;
  const bigW = Math.max(Math.ceil(fwBig), Math.ceil(m.wSmall) * SS) + 2 * SS;
  const bigH = h * SS;
  big.width = bigW; big.height = bigH;
  const bg = big.getContext('2d');
  bg.font = bigFont; bg.textBaseline = 'top'; bg.fillStyle = '#fff';
  bg.fillText(str, SS, SS);

  // 覆盖率降采样
  const bd = bg.getImageData(0, 0, bigW, bigH).data;
  const cov = new Float32Array(w * h);
  for (let y = 0; y < h; y++){
    for (let x = 0; x < w; x++){
      let sum = 0, n = 0;
      for (let sy = 0; sy < SS; sy++){
        const py = y * SS + sy; if (py >= bigH) continue;
        for (let sx = 0; sx < SS; sx++){
          const px = x * SS + sx; if (px >= bigW) continue;
          sum += bd[(py * bigW + px) * 4 + 3]; n++;
        }
      }
      cov[y * w + x] = n ? sum / n : 0;
    }
  }

  // 阈值化 → 只写「全不透明白」与「全透明黑」，避开预乘 alpha 歧义
  const mask = document.createElement('canvas');
  mask.width = w; mask.height = h;
  const mg = mask.getContext('2d');
  const img = mg.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++){
    const on = cov[i] > cjkThr(size);
    const o = i * 4;
    if (on){ d[o] = 255; d[o+1] = 255; d[o+2] = 255; d[o+3] = 255; }
    else   { d[o] = 0;   d[o+1] = 0;   d[o+2] = 0;   d[o+3] = 0;   }
  }
  mg.putImageData(img, 0, 0);

  const res = { mask, w, h };
  cjkMaskCache.set(key, res);
  return res;
}

function getCjk(str, size, color){
  const key = str + '|' + size + '|' + color;
  if (cjkColorCache.has(key)) return cjkColorCache.get(key);
  const { mask, w, h } = getCjkMask(str, size);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  const res = { canvas:c, w, h };
  cjkColorCache.set(key, res);
  return res;
}
const isAscii = ch => ch.charCodeAt(0) < 128;
function measureText(str, size){
  let w = 0, run = '';
  const flush = ()=>{ if(run){ w += run.length*6*asciiScale(size); run=''; } };
  for(const ch of str){
    if(isAscii(ch)) run += ch;
    else { flush(); w += cjkMetrics(ch, size).w; }
  }
  flush();
  return w;
}
function drawText(str, x, y, opt){
  const size = opt.size||14, color = opt.color||C.txt, align = opt.align||'left';
  str = String(str);
  const total = measureText(str, size);
  let px = align==='center' ? x - Math.round(total/2) : align==='right' ? x-total : x;
  let run = '', runX = px;
  const flush = ()=>{
    if(!run) return;
    const sc = asciiScale(size), atlas = getAtlas(color);
    const off = Math.round((size - 7*sc)/2);     // 拉丁字在中文行内垂直居中
    for(let i=0;i<run.length;i++){
      const idx = FONT_IDX[run[i]];
      if(idx !== undefined) ctx.drawImage(atlas, idx*5, 0, 5, 7, runX+i*6*sc, y+off, 5*sc, 7*sc);
    }
    run='';
  };
  for(const ch of str){
    if(isAscii(ch)){ run += ch; }
    else {
      flush();
      const s = getCjk(ch, size, color);
      ctx.drawImage(s.canvas, runX, y);
      runX += s.w;
    }
  }
  flush();
  return total;
}
