# 吞云 · SMOKE CLASSIC

> 8-bit 像素风 · 抽烟主题 · 单局街机小游戏
> 会抽烟的人会心一笑，不抽烟的人看着有意思，顺便了解一点抽烟文化。

纯前端、零依赖、零构建。克隆下来双击 `index.html` 就能玩。

---

## 🎮 玩法

一根烟，三个动作，**手要稳、心要准**：

| 阶段 | 做什么 | 判定 |
|---|---|---|
| **点火** | 滑块来回跑，按住金区中心 | 越准分越高，完美点火 +120 |
| **吸气** | 长按鼓气，停在"七分饱"绿区 | 太浅没劲、太猛呛到 |
| **吐圈** | 拖动瞄准 + 长按蓄力，松手吐出烟圈 | 命中靶心 +260，环+不中就散了 |

三段全完美会点亮**完美链**，倍率最高 x3。

### 越抽越难

每抽完一根，**肺负载**增加，等级 +1，难度跟着涨：

- 点火滑块更快、金区更窄
- 吸气绿区整体收窄（"七分饱"越来越难拿捏）
- 4 级起绿区会**左右漂移**
- 6 级起靶子会**移动**
- 8 级起有**风偏**

肺负载满 100 → 这局结束。等级分四档：新手 / 熟手 / 老炮 / 传说。

### 别的

- **烟品图鉴**：抽到的烟会解锁图鉴条目（中华、555、细支……），还有冷知识和危害科普
- **本地排行榜**：前 5 名记录在本机 localStorage
- **彩蛋**：3% 概率遇到假烟

---

## ⌨️ 操作

### 桌面端

| 键 | 作用 |
|---|---|
| `空格` / `回车` | 点火 / 蓄力 / 确认 |
| `←` `→` | 瞄准 |
| `P` | 暂停 / 继续 |
| `R` | 重新开局 |
| `Esc` | 返回 |

也支持鼠标：点按 = 按住键，拖动 = 瞄准。

### 移动端

| 操作 | 作用 |
|---|---|
| 点按 | 点火 / 蓄力 |
| 长按 | 吸气鼓气 |
| 拖动 | 瞄准 |
| 右上角小键 | 暂停 |

横屏时画面会**自动旋转 90°** 以铺满屏幕（方向跟随设备 `screen.orientation.angle`），指针坐标会做逆变换换算，旋转后依然点得准。

---

## 📁 项目结构

```
.
├── index.html              # 页面外壳 + 响应式样式 + 按序加载所有模块
├── manifest.json           # PWA manifest
├── icon.svg                # 图标
├── package.json            # 仅用于 npm scripts（游戏本身零运行时依赖）
├── .github/workflows/
│   ├── ci.yml              # CI：语法校验 + 冒烟测试 + 浏览器 E2E
│   └── deploy.yml          # 自动发布到 GitHub Pages
├── scripts/
│   └── serve.mjs           # 零依赖静态服务器（本地预览）
├── test/
│   ├── smoke.mjs           # 零依赖冒烟测试（Node）
│   └── e2e.mjs             # Playwright 多视口 / 旋转方向验证
└── src/
    ├── core/               # 基础设施
    │   ├── const.js        #   常量与调色板
    │   ├── utils.js        #   工具函数
    │   ├── layout.js       #   桌面/移动端自适应布局
    │   ├── font.js         #   5×7 点阵拉丁 + 超采样中文渲染
    │   ├── sprites.js      #   像素精灵图集
    │   ├── audio.js        #   WebAudio 合成 8-bit 音效
    │   └── storage.js      #   设置与存档（localStorage）
    ├── data/
    │   └── content.js      #   烟品 / 靶子 / 冷知识 / 事件
    ├── game/
    │   ├── state.js        #   屏幕栈与全局状态
    │   ├── feel.js         #   手感：震屏 / 顿帧 / 闪屏 / 粒子 / 浮字
    │   ├── input.js        #   键鼠 / 触摸输入
    │   ├── rules.js        #   局内规则与计分
    │   └── update.js       #   逻辑推进
    ├── render/
    │   ├── draw.js         #   绘制原语
    │   ├── scene.js        #   游戏场景
    │   └── screens.js      #   标题 / 暂停 / 结算 / 设置 / 图鉴
    └── main.js             #   主循环与装配
```

### 为什么是 classic script 而不是 ES Module

`index.html` 里是一串 `<script src>`，不是 `<script type="module">`。
顶层 `const` / `let` / `function` 因此落在**全局词法环境**里，跨文件按 `index.html` 中的顺序共享——这也让 **`file://` 双击直接能跑**（ES Module 会被 CORS 挡掉）。

代价是所有顶层标识符必须全局唯一，且不能叫 `top`（`window.top` 不可重定义），当前用的是 `curScreen()`。

---

## 🛠 本地运行

不需要安装任何依赖，也没有构建步骤。

```bash
# 方式一：直接打开
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux

# 方式二：起个本地服务器（推荐，PWA manifest 需 http 环境）
node scripts/serve.mjs 8080
# → http://localhost:8080
```

### 跑测试

```bash
# 冒烟测试（零依赖，CI 的主要门禁）
node test/smoke.mjs

# 浏览器 E2E（需要 Playwright；不装则自动跳过）
npm install --no-save playwright
npx playwright install chromium
node test/e2e.mjs
```

冒烟测试会按 `index.html` 的顺序逐个加载模块到一个 stub DOM 里，然后：

1. 检查初始状态（画布尺寸、屏幕栈、调色板、难度分档、图鉴数据）
2. 检查流程（进游戏 → 阶段合法 → 分数/肺负载归零）
3. **模拟打完一整局**（自动完美点火 + 吸气 + 吐圈），验证得分增长与自然结束
4. 渲染全部 5 个界面，统计绘制调用，确认没有异常
5. 检查中文/拉丁字体度量

E2E 会在 4 种视口（桌面 / 平板 / 手机 / 横屏手机）下验证：

- 页面无 JS 报错
- 画布缩放正确、完整落在视口内
- 画面确实有像素内容（中文渲染没崩）
- 横屏触发旋转、旋转后包围盒横向
- **横屏两个方向（`orientation.angle` = 90 / 270）下画面上方都指向设备顶边**
- 指针逆变换能把屏幕坐标正确还原成游戏坐标

截图会输出到 `test/shots/`。

---

## 🚀 CI 与自动发布

仓库里配了两条 GitHub Actions：

**`ci.yml`** — 每次 push / PR 跑两个 job：

- `check`：对 `src/` 下所有 `.js` 执行 `node --check` 语法校验 → 跑 `test/smoke.mjs` 冒烟测试 → 校验 `index.html` 里引用的模块文件都真实存在
- `e2e`：装 Playwright + Chromium，跑 `test/e2e.mjs` 多视口 / 旋转方向验证，截图作为 artifact 上传

**`deploy.yml`** — 推到 `main`（或 `master`）自动发布到 GitHub Pages：

- 发布前先跑一遍冒烟测试，坏版本发不出去
- 静态站点直接以仓库根目录作为 Pages 产物
- 部署地址见 Actions 页面输出

### 启用 Pages

1. 仓库 → **Settings** → **Pages**
2. Source 选 **GitHub Actions**
3. 推 `main` 分支即自动发布

---

## 🧪 技术要点

**像素锐利的缩放** — 320×480 参考分辨率，按「设备像素」取整：让 `缩放系数 × dpr` 为整数，每个游戏像素恰好占整数个设备像素，边缘完全锐利、像素是方块。桌面 dpr=1 退回 4/3/2/1.5/1 阶梯。

**中文清晰度** — 中文没法用点阵图集，于是走**超采样降采样**：字号 ×3 渲染 → 3×3 块求 alpha 平均得覆盖率 → 阈值化（≥12px 用 128，其余 112）→ `source-in` 合成上色。阈值后只写「全不透明白」和「全透明黑」两种状态，避开 Canvas 预乘 alpha 的 un-premultiply 陷阱。

**横屏旋转方向** — 这里有个容易踩的坑：`screen.orientation.angle` 按规范是「屏幕相对自然方向**逆时针**旋转的角度」，而 CSS `rotate()` 正值是**顺时针**。两者方向相反，所以 CSS 角度必须取 `360 − angle`：

| `orientation.angle` | 设备顶边位置 | CSS 旋转 |
|---|---|---|
| 90° | 屏幕左 | `rotate(270deg)` |
| 270° | 屏幕右 | `rotate(90deg)` |

取反了会导致画面上下颠倒。指针逆变换的符号也要跟着 CSS 角度走（`r = sin θ`，90° → +1，270° → −1），否则 270° 那侧点击位置会整体镜像错位。

**弹道所见即所得** — 预览和飞行共用同一套固定步长积分（`RING_DT = 1/50`），所以瞄准线画到哪，烟圈就飞到哪。

**手感反馈** — trauma 平方衰减震屏、命中顿帧（hitStop）、闪屏、粒子爆发、浮字，参数集中在 `src/game/feel.js`。

**音效** — 全部用 WebAudio 实时合成（方波/三角波/噪声 buffer + biquad 滤波），零音频文件。

---

## ⚠️ 说明

这是一个**小游戏**，不是吸烟的正面宣传。游戏里的"烟"是抽象符号，玩法本身对健康是负向的，请勿当真。

---

## 📄 License

MIT
