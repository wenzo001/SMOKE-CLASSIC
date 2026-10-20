/* ============================================================
   E2E · 真实浏览器验证（Playwright，非 CI 必需）
   ------------------------------------------------------------
   验证内容：
     1) 桌面 / 平板 / 手机 / 横屏手机 4 种视口下布局正确
     2) 页面无 JS 报错（会捕获 getElementByById / CJK_THR 这类致命错）
     3) 中文确实渲染出来了（canvas 里有非背景像素）
     4) 横屏时画布被旋转 90°，指针逆变换换算正确
   用法：node test/e2e.mjs
   ============================================================ */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = path.join(ROOT, 'test', 'shots');
fs.mkdirSync(OUT, { recursive: true });

/* 优先用项目本地安装的 playwright，其次用 npx 缓存里的 */
let chromium;
const CANDIDATES = [
  'playwright',
  'C:/Users/lhcz-fu/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.js',
  'C:/Users/lhcz-fu/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright/index.js',
];
for (const p of CANDIDATES) {
  const spec = p.startsWith('C:') || p.startsWith('/') ? pathToFileURL(p).href : p;
  try {
    const m = await import(spec);
    chromium = m.chromium || (m.default && m.default.chromium);
    if (chromium) break;
  } catch (e) { /* next */ }
}
if (!chromium) {
  console.error('✗ 未找到 playwright，跳过 E2E');
  console.error('  可用：npx -y playwright@latest install chromium 后重试');
  process.exit(0);
}

const URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
/* dpr 用 2 而不是 3：3× 渲染缓冲在内存紧张的机器上会把 headless 挤爆，
   而缩放逻辑对 dpr≥2 的处理路径完全相同，测 2 已足够 */
const VIEWS = [
  { name: 'desktop',  width: 1440, height: 900,  dpr: 1, mobile: false },
  { name: 'tablet',   width: 834,  height: 1112, dpr: 2, mobile: true  },
  { name: 'phone',    width: 390,  height: 844,  dpr: 2, mobile: true  },
  { name: 'phone-ls', width: 844,  height: 390,  dpr: 2, mobile: true  },
];

const fails = [];
const check = (name, cond, extra) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (extra && !cond ? ' → ' + extra : ''));
  if (!cond) fails.push(name);
};

const browser = await chromium.launch();
/** 截图失败不该让整个测试崩掉（内存吃紧时 headless 容易被杀） */
async function shoot(page, file){
  try { await page.screenshot({ path: path.join(OUT, file), timeout: 15000 }); }
  catch (e) { console.log('    (截图失败：' + file + ' — ' + e.message.split('\n')[0] + ')'); }
}
for (const v of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.dpr,
    isMobile: v.mobile,
    hasTouch: v.mobile,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(700);
  } catch (e) {
    console.log('\n[' + v.name + '] 加载失败：' + e.message.split('\n')[0]);
    fails.push(v.name + ' 页面加载');
    await ctx.close().catch(()=>{});
    continue;
  }

  console.log('\n[' + v.name + '] ' + v.width + '×' + v.height + ' @' + v.dpr + 'x');
  check('无 JS 报错', errors.length === 0, errors.join(' | '));

  let info;
  try {
    info = await page.evaluate(() => {
      const cv = document.getElementById('game');
      const r  = cv.getBoundingClientRect();
      const bezel = document.getElementById('bezel');
      const br = bezel.getBoundingClientRect();
      return {
        rot: getComputedStyle(bezel).getPropertyValue('--rot').trim(),
        bodyRot: document.body.classList.contains('rot'),
        cw: cv.style.width, ch: cv.style.height,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        bezelRect: { x: br.x, y: br.y, w: br.width, h: br.height },
        vw: innerWidth, vh: innerHeight,
        scale: (typeof LAYOUT_SCALE !== 'undefined') ? LAYOUT_SCALE : null,
        // 画布里有多少非背景像素（验证真的画了东西，尤其中文）
        ink: (() => {
          const c = document.getElementById('game');
          const g = c.getContext('2d');
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let n = 0;
          for (let i = 0; i < d.length; i += 4){
            if (d[i] > 40 || d[i+1] > 40 || d[i+2] > 40) n++;
          }
          return n;
        })(),
      };
    });
  } catch (e) {
    console.log('\n[' + v.name + '] 渲染检查失败：' + e.message.split('\n')[0]);
    fails.push(v.name + ' 渲染检查');
    await ctx.close().catch(()=>{});
    continue;
  }

  check('画布尺寸已设置', !!info.cw && !!info.ch, info.cw + '×' + info.ch);
  check('缩放倍率 ≥ 1', info.scale >= 1, String(info.scale));
  check('画布在视口内', info.rect.w <= v.width + 2 && info.rect.h <= v.height + 2,
    JSON.stringify(info.rect));
  check('画面有实际内容（像素非空）', info.ink > 500, String(info.ink));

  if (v.name === 'phone-ls'){
    check('横屏触发旋转', info.bodyRot === true, 'rot=' + info.rot);
    // 旋转后包围盒宽高应互换（近似 480:320）
    const ratio = info.rect.w / info.rect.h;
    check('旋转后包围盒呈横向', ratio > 1.3, 'ratio=' + ratio.toFixed(2));
  } else {
    check('竖屏不旋转', info.bodyRot === false, 'rot=' + info.rot);
    const ratio = info.rect.w / info.rect.h;
    check('竖屏包围盒呈纵向', ratio < 1.3, 'ratio=' + ratio.toFixed(2));
  }

  // 指针逆变换：把屏幕坐标反算回游戏坐标，应落在画布内
  const ptr = await page.evaluate(() => {
    const cv = document.getElementById('game');
    const r = cv.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const p = pointerToGame(cx, cy);
    return { x: p.x, y: p.y, W, H };
  });
  check('指针反算命中画布中心', Math.abs(ptr.x - ptr.W / 2) < 6 && Math.abs(ptr.y - ptr.H / 2) < 6,
    JSON.stringify(ptr));

  await shoot(page, v.name + '.png');
  await ctx.close().catch(()=>{});
}

/* ---------- 布局方向专项：横屏两个方向都要正立 ---------- */
console.log('\n[5] 横屏方向（画面上方必须指向设备顶边）');
for (const angle of [90, 270]){
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // 覆盖 screen.orientation.angle，模拟设备往两侧转
  await page.addInitScript(a => {
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      get: () => ({ angle: a, type: a === 90 ? 'landscape-primary' : 'landscape-secondary' }),
    });
  }, angle);
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(500);
  } catch (e) {
    console.log('  ! angle=' + angle + ' 加载失败：' + e.message.split('\n')[0]);
    fails.push('angle=' + angle + ' 页面加载');
    await ctx.close().catch(()=>{});
    continue;
  }

  let r;
  try {
    r = await page.evaluate(() => {
      const cv = document.getElementById('game');
      const bezel = document.getElementById('bezel');
      const rot = parseFloat(getComputedStyle(bezel).getPropertyValue('--rot')) || 0;
      const rect = cv.getBoundingClientRect();
      const cy = rect.y + rect.height / 2;
      // 旋转后，屏幕的水平轴对应游戏的垂直轴：
      //   屏幕左边缘 / 右边缘 → 游戏的上边缘 / 下边缘（哪一端对哪一端取决于旋转方向）
      const pLeft  = pointerToGame(rect.x, cy);
      const pRight = pointerToGame(rect.x + rect.width, cy);
      return {
        rot, angle: screen.orientation.angle,
        leftY: pLeft.y, rightY: pRight.y,
        leftX: pLeft.x, rightX: pRight.x,
      };
    });
  } catch (e) {
    console.log('  ! angle=' + angle + ' 检查失败：' + e.message.split('\n')[0]);
    fails.push('angle=' + angle + ' 方向检查');
    await ctx.close().catch(()=>{});
    continue;
  }

  check('angle=' + angle + ' 无 JS 报错', errors.length === 0, errors.join(' | '));
  // angle=90 → 设备顶边在屏幕左 → 画面上方应指向屏幕左
  // angle=270 → 设备顶边在屏幕右 → 画面上方应指向屏幕右
  const wantLeft = (angle === 90);
  const edgeY = wantLeft ? r.leftY : r.rightY;
  const otherY = wantLeft ? r.rightY : r.leftY;
  check('angle=' + angle + ' 画面上方指向设备顶边一侧',
    edgeY < 20 && otherY > 460,
    'leftY=' + r.leftY.toFixed(1) + ' rightY=' + r.rightY.toFixed(1));
  check('angle=' + angle + ' CSS 旋转角与设备角互补', r.rot === (360 - angle) % 360,
    'rot=' + r.rot);

  await shoot(page, 'ls-angle-' + angle + '.png');
  await ctx.close().catch(()=>{});
}

await browser.close().catch(()=>{});

console.log('\n' + (fails.length ? '✗ ' + fails.length + ' 项失败' : '✅ E2E 全部通过'));
console.log('截图输出：' + OUT);
process.exit(fails.length ? 1 : 0);
