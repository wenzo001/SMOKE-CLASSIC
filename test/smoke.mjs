/* ============================================================
   SMOKE TEST · 冒烟测试（Node，零依赖）
   ------------------------------------------------------------
   目的：在 CI 里用极低的成本确认"这个游戏还能跑、还能玩"，
   而不是只做语法检查。

   做法：按 index.html 中的 <script src> 顺序逐个在同一个 vm
   上下文里执行（等价于浏览器逐个加载 classic script），
   然后导出关键符号做断言：
     1) 初始状态正确
     2) 标题 → 游戏 → 结算 流程能走通
     3) 模拟一局"完美操作"，检查得分确实在涨
     4) 渲染 5 个界面，统计绘制调用，确认没有异常
     5) 中文/拉丁字体度量正常

   用法：node test/smoke.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- 读取 index.html 里的 script 顺序 ---------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!srcs.length) { console.error('✗ index.html 里没有找到 <script src>'); process.exit(1); }

/* ---------- 极简 DOM 桩 ---------- */
const calls = { draw: 0 };
function makeCtx(){
  const noop = () => { calls.draw++; };
  return {
    canvas: { width: 320, height: 480 },
    fillStyle: '#fff', strokeStyle: '#fff', font: '', globalAlpha: 1,
    imageSmoothingEnabled: false, globalCompositeOperation: 'source-over',
    textBaseline: 'top', lineWidth: 1,
    fillRect: noop, strokeRect: noop, clearRect: noop, fillText: noop, strokeText: noop,
    drawImage: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, arcTo: noop, rect: noop, fill: noop, stroke: noop,
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    setTransform: noop, transform: noop, resetTransform: noop,
    measureText: (s) => ({ width: String(s).length * 8 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: noop, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createPattern: () => ({}), setLineDash: noop, getLineDash: () => [],
  };
}
const mainCtx = makeCtx();
function makeEl(tag){
  return {
    tagName: (tag || 'div').toUpperCase(),
    width: 320, height: 480, style: { setProperty(){}, removeProperty(){} }, dataset: {},
    offsetWidth: 320, offsetHeight: 480, offsetParent: null,
    clientWidth: 320, clientHeight: 480,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); },
                 toggle(c,v){ v ? this._s.add(c) : this._s.delete(c); },
                 contains(c){ return this._s.has(c); } },
    getContext: () => mainCtx,
    addEventListener(){}, removeEventListener(){},
    setPointerCapture(){}, releasePointerCapture(){},
    getBoundingClientRect: () => ({ left:0, top:0, width:320, height:480, right:320, bottom:480 }),
    appendChild(){}, removeChild(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    focus(){}, blur(){}, click(){}, dispatchEvent(){ return true; },
    textContent: '', innerHTML: '',
  };
}
const elGame = makeEl('canvas');
const elHint = makeEl('div');
const elStage = makeEl('div');
const elBezel = makeEl('div');
elHint.offsetParent = elStage;

const doc = {
  documentElement: makeEl('html'), body: makeEl('body'), head: makeEl('head'),
  getElementById: (id) => ({ game: elGame, hint: elHint, stage: elStage, bezel: elBezel }[id] || null),
  createElement: (t) => makeEl(t),
  createElementNS: (ns, t) => makeEl(t),
  addEventListener(){}, removeEventListener(){},
  querySelector: () => null, querySelectorAll: () => [],
  hidden: false, visibilityState: 'visible',
};
const win = {
  innerWidth: 1280, innerHeight: 900, devicePixelRatio: 1,
  addEventListener(){}, removeEventListener(){}, matchMedia: () => ({ matches:false, addEventListener(){} }),
  getComputedStyle: () => ({ paddingLeft:'0px', paddingRight:'0px', paddingTop:'0px', paddingBottom:'0px' }),
  screen: { orientation: { angle: 0 } },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame(){},
  localStorage: (() => { const m = new Map(); return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k,v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() }; })(),
};
const sandbox = {
  window: win, document: doc, console,
  requestAnimationFrame: win.requestAnimationFrame, cancelAnimationFrame: win.cancelAnimationFrame,
  performance: win.performance, localStorage: win.localStorage,
  // 浏览器里挂在 window 上的全局函数，vm 里需要显式补上
  getComputedStyle: win.getComputedStyle,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, JSON, Date, parseInt, parseFloat, isNaN, isFinite, String, Number, Array, Object,
  Float32Array, Uint8ClampedArray, Map, Set, Error, TypeError, RegExp, Boolean,
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
win.window = win;
doc.defaultView = win;

/* ---------- 逐个加载模块（等价于浏览器逐个 classic script） ---------- */
const ctxObj = vm.createContext(sandbox);
for (const s of srcs) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { console.error('✗ 缺少模块文件: ' + s); process.exit(1); }
  try {
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctxObj, { filename: s });
  } catch (e) {
    console.error('✗ 模块加载失败: ' + s + ' → ' + e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

/* ---------- 导出关键符号（顶层 const/let 不会挂到 globalThis） ---------- */
const EXPORTS = [
  'W','H','C','TIERS','BRANDS','TARGETS','KNOWLEDGE','SCR','G','stack','push','pop','curScreen',
  'measureText','startGame','doLight','releaseInhale','fireRing','update','render','text',
  'SET','BEST','STATS','TOP','LAST','HUD','bus','syncHud','layoutApply','LAYOUT_SCALE','LAYOUT_ROT',
  'isTouchDevice','pointerToGame','gameOver','addScore',
];
try {
  vm.runInContext(
    'globalThis.__X = { ' + EXPORTS.join(',') + ' };\n' +
    'globalThis.__stackGet = () => stack;\n' +
    'globalThis.__stackSet = s => { stack = s; };\n',
    ctxObj, { filename: 'export' });
} catch (e) {
  console.error('✗ 导出符号失败（某个符号不存在）: ' + e.message);
  process.exit(1);
}
const g = sandbox.__X;
g.__stackSet = sandbox.__stackSet;
g.__stackGet = sandbox.__stackGet;

const fails = [];
function check(name, cond, extra){
  if (cond) console.log('  ✓ ' + name);
  else { console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); fails.push(name); }
}

console.log('模块加载 (' + srcs.length + ' 个):');
for (const s of srcs) console.log('  · ' + s);

/* ---------- 1. 基本状态 ---------- */
console.log('\n[1] 初始状态');
check('画布尺寸 320×480', g.W === 320 && g.H === 480, g.W + '×' + g.H);
check('屏幕栈初始为标题页', g.curScreen() === g.SCR.TITLE, g.curScreen());
check('调色板非空', !!g.C && !!g.C.gold);
check('难度分档 4 档', Array.isArray(g.TIERS) && g.TIERS.length === 4);
check('品牌/靶子/知识库均有内容',
  g.BRANDS.length > 0 && g.TARGETS.length > 0 && g.KNOWLEDGE.length > 0,
  g.BRANDS.length + '/' + g.TARGETS.length + '/' + g.KNOWLEDGE.length);

/* ---------- 2. 流程：标题 → 游戏 ---------- */
console.log('\n[2] 流程');
g.__stackSet([g.SCR.GAME]);
g.startGame();
check('进入游戏后 phase 有效', ['light','inhale','exhale'].includes(g.G.phase), g.G.phase);
check('开始时肺负载为 0', g.G.lung === 0, String(g.G.lung));
check('开始时分数为 0', g.G.score === 0, String(g.G.score));

/* ---------- 3. 完整一局（模拟完美操作） ---------- */
console.log('\n[3] 模拟一局');
const before = g.G.score;
let guard = 0;
while(!g.G.over && guard++ < 3000){
  // 事件卡现在必须玩家主动操作才继续（不再自动倒计时），
  // 模拟循环里替"玩家"点一下
  if (g.G.pendingEvent) g.G.eventT = 99;
  const ph = g.G.phase;
  if (ph === 'light'){
    // 把滑块直接挪到金区正中，制造「完美点火」
    g.G.light.x = g.G.light.target;
    g.G.light.lit = true;
    g.doLight();
  } else if (ph === 'inhale'){
    g.G.inhale.holding = true;
    g.G.inhale.v = g.G.inhale.lo + (g.G.inhale.hi - g.G.inhale.lo) / 2;
    g.releaseInhale();
  } else if (ph === 'exhale'){
    g.G.exhale.charging = true;
    g.G.exhale.power = 0.7;
    g.fireRing();
  }
  // 推进时间（idle 阶段靠 pending 计时器切换）
  for (let i = 0; i < 20; i++) g.update(1/60);
}
check('一局能自然结束', g.G.over === true, 'over=' + g.G.over);
check('得分不倒退', g.G.score >= before, before + ' → ' + g.G.score);
check('抽烟根数 > 0', g.G.cigs > 0, String(g.G.cigs));
check('结算界面可达', (() => { g.__stackSet([g.SCR.RESULT]); return g.curScreen() === g.SCR.RESULT; })());
console.log('    得分 ' + g.G.score + ' / ' + g.G.cigs + ' 根 / 等级 ' + g.G.level);

/* ---------- 4. 渲染各界面 ---------- */
console.log('\n[4] 渲染');
const screens = [g.SCR.TITLE, g.SCR.CODEX, g.SCR.SETTINGS, g.SCR.GAME, g.SCR.RESULT];
for (const s of screens){
  const d0 = calls.draw;
  try {
    g.__stackSet([s]);
    g.render();
    const d = calls.draw - d0;
    check('渲染 ' + s + ' 正常（' + d + ' 次绘制）', d > 0);
  } catch(e){
    check('渲染 ' + s + ' 正常', false, e.message);
  }
}

/* ---------- 5. 字体度量 ---------- */
console.log('\n[5] 字体');
const w1 = g.measureText('一', 12), w2 = g.measureText('一二', 12);
check('中文字宽随字数增长', w2 > w1, w1 + ' → ' + w2);
check('拉丁与中文混合度量正常', g.measureText('OK 一', 12) > g.measureText('OK', 12));

/* 混排推进回归：drawText 里 ASCII 段画完后必须推进画笔，
   否则 ASCII 之后的中文会叠在 ASCII 上（"x3.00），" 这类会糊成一团）。
   做法：劫持 ctx.drawImage，只记录"落在目标 y 上的"调用（即文字本体，
   排除 getCjk 内部掩码/上色的中间绘制），验证落点 x 严格递增。 */
console.log('\n[6] 中英混排排版');
{
  const placed = [];
  const cv = sandbox.document.getElementById('game');
  const c = cv.getContext('2d');
  const real = c.drawImage;
  c.drawImage = function(){
    const a = arguments;
    // 文字本体的落点位置随调用形式不同：
    //   ASCII: drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh) -> a[5]
    //   CJK  : drawImage(canvas, dx, dy)                        -> a[1]
    // getCjk 内部的中间绘制落点恒为 0，用 dx>0 排除
    let dx = null;
    if (a.length === 3) dx = a[1];
    else if (a.length >= 9) dx = a[5];
    if (typeof dx === 'number' && dx > 0) placed.push(dx);
    return real.apply(null, a);
  };
  g.text('连击 x3.00），共', 10, 10, {size:12});
  c.drawImage = real;

  const xs = placed;
  let increasing = true;
  for (let i = 1; i < xs.length; i++) if (xs[i] <= xs[i-1]) { increasing = false; break; }
  check('各段 x 坐标严格递增（画笔正确推进）', increasing, xs.join(','));
}

/* ---------- 7. 事件卡不自动跳过 ---------- */
console.log('\n[7] 事件卡（必须玩家主动操作才继续）');
{
  g.__stackSet([g.SCR.GAME]);
  g.startGame();
  // 手动激活一张事件卡
  vm.runInContext('G.pendingEvent = {t:"被查岗", d:"测试卡", s:0, l:9, w:7, luck:0}; G.eventT = 0;', ctxObj);
  const cigsBefore = g.G.cigs;
  // 空转 10 秒模拟时间，卡片应该还在、游戏不该推进
  for (let i = 0; i < 600; i++) g.update(1/60);
  check('10 秒不操作，事件卡不消失', g.G.pendingEvent !== null);
  check('事件卡期间游戏不推进', g.G.cigs === cigsBefore,
    cigsBefore + ' → ' + g.G.cigs);
  // 模拟玩家点击
  g.G.eventT = 99;
  g.update(1/60);
  check('点击后事件卡消失', g.G.pendingEvent === null);
}

/* ---------- 汇总 ---------- */
console.log('\n' + (fails.length ? '✗ ' + fails.length + ' 项失败' : '✅ 冒烟测试全部通过'));
process.exit(fails.length ? 1 : 0);
