/* ============================================================
   SCREENS · 菜单与各屏幕
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 15 · 菜单与各屏幕
   ============================================================ */
let uiHits = [];
function menuItems(s){
  if(s===SCR.TITLE) return [
    {label:'开 始', act:()=>{ startGame(); }},
    {label:'烟品图鉴', act:()=>{ codexTab=0; codexScroll=0; push(SCR.CODEX); }},
    {label:'冷知识',   act:()=>{ codexTab=2; codexScroll=0; push(SCR.CODEX); }},
    {label:'设 置',   act:()=>{ push(SCR.SETTINGS); }},
    {label:'玩法说明', act:()=>{ codexTab=3; codexScroll=0; push(SCR.CODEX); }}
  ];
  if(s===SCR.PAUSE) return [
    {label:'继续', act:()=>{ pop(); }},
    {label:'重新开始', act:()=>{ startGame(); }},
    {label:'设置', act:()=>{ push(SCR.SETTINGS); }},
    {label:'回主菜单', act:()=>{ stack=[SCR.TITLE]; menuSel.title=0; }}
  ];
  if(s===SCR.RESULT) return [
    {label:'再来一根', act:()=>{ startGame(); }},
    {label:'看图鉴', act:()=>{ codexTab=0; codexScroll=0; push(SCR.CODEX); }},
    {label:'回主菜单', act:()=>{ stack=[SCR.TITLE]; menuSel.title=0; }}
  ];
  return [];
}
function settingsItems(){
  const onoff = v => v ? '开' : '关';
  return [
    {label:'音效', value:onoff(SET.sound), act:()=>{ SET.sound=!SET.sound; SFX.setMuted(!SET.sound); if(SET.sound) SFX.ui(); }},
    {label:'屏幕震动', value:onoff(SET.shake), act:()=>{ SET.shake=!SET.shake; }},
    {label:'闪屏效果', value:onoff(SET.flash), act:()=>{ SET.flash=!SET.flash; }},
    {label:'弹道辅助线', value:onoff(SET.guide), act:()=>{ SET.guide=!SET.guide; }},
    {label:'大字号', value:onoff(SET.bigText), act:()=>{ SET.bigText=!SET.bigText; }},
    {label:'清空记录', value:'', act:()=>{ BEST=0; seenBrands={}; seenTargets={}; save(); }},
    {label:'返回', value:'', act:()=>{ pop(); }}
  ];
}
function codexMaxScroll(){
  if(codexTab===0) return Math.max(0, BRANDS.length-4);
  if(codexTab===1) return Math.max(0, TARGETS.length-5);
  if(codexTab===2) return Math.max(0, KNOWLEDGE.length-4);
  if(codexTab===3) return Math.max(0, HELP_LINES.length - HELP_VISIBLE);
  return 0;
}
function hitUI(x,y){
  for(const h of uiHits){ if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h) return h.i; }
  return -1;
}
/* ------------------------------------------------------------
   回归诱惑文案 —— 有历史记录的玩家才显示
   ------------------------------------------------------------
   把"多久没来玩游戏"换算成"戒烟多少天"——这是这个游戏自带的
   黑色幽默：不抽烟的日子，按戒烟算。

   分档依据（按优先级）：
     1) 破纪录诱惑：离纪录越近，钩子越硬（最强"再来一局"动机）
     2) 老烟枪资历：累计根数是谈资
     3) 按间隔时长：越久越要用"验收""破例"这种词挑逗

   hot=1 的文案会呼吸闪烁，制造"它在催你"的感觉。

   返回 null = 纯新玩家，标题页不显示这一行。
   ------------------------------------------------------------ */
function welcomeBack(){
  // 平滑升级：老存档没有 lastPlay，但有成绩 → 给一句通用回归
  if(!STATS.lastPlay){
    if(STATS.runs > 0 || BEST > 0) return {t:'老玩家，回来续上了', c:C.cyan, hot:0};
    return null;
  }
  const gap  = Date.now() - STATS.lastPlay;
  const mins = gap / 60000, days = gap / 86400000;
  const d    = Math.round(days);

  // 当天还在玩 → 先报"今天第几局"（连续玩的时候这才是玩家关心的），
  // 破纪录诱惑留给隔天再来的场景
  if(mins < 30)  return {t:'手还没热呢，再来一根？', c:C.cyan, hot:0};
  if(days < 1){
    if(STATS.runs >= 5) return {t:'今天第 '+STATS.runs+' 局，你是真闷', c:C.cyan, hot:0};
    return {t:'今天第 '+STATS.runs+' 局，不差这一根', c:C.cyan, hot:0};
  }
  // 破天了 → 破纪录诱惑优先（最强的"再来一局"钩子）
  if(LAST > 0 && LAST >= BEST)       return {t:'上局 '+LAST+' 分就是纪录，还能更高？', c:C.gold, hot:1};
  if(LAST > 0 && BEST - LAST <= 300) return {t:'离纪录只差 '+(BEST-LAST)+' 分，就一口', c:C.gold, hot:1};
  if(days < 2)   return {t:'歇了一天，手生了没', c:C.green, hot:0};
  // 老烟枪资历（跨天 + 累计过百才拿出来说）
  if(STATS.cigs >= 100) return {t:'老烟枪档案：累计 '+STATS.cigs+' 根，歇 '+d+' 天了', c:C.gold, hot:1};
  if(days < 4)   return {t:'戒烟 '+d+' 天了，想抽不', c:C.green, hot:1};
  if(days < 8)   return {t:'戒烟 '+d+' 天，你现在来了', c:C.gold, hot:1};
  if(days < 30)  return {t:'都 '+d+' 天没碰了，今天破例？', c:C.gold, hot:1};
  if(days < 120) return {t:'戒烟 '+d+' 天，烟瘾还在吗', c:C.red, hot:1};
  return {t:'戒烟 '+d+' 天了，今天是来验收的吗', c:C.red, hot:1};
}
function drawTitle(){
  drawBackdrop(G.t);
  // 右下角：燃烧的烟 + 上升烟雾（不压住菜单）
  for(let i=0;i<8;i++){
    const x = 282+Math.sin(G.t*1.2+i)*7;
    const y = 352 - ((G.t*20+i*24)%240);
    ctx.globalAlpha = 0.26 - ((G.t*20+i*24)%240)/240*0.20;
    rect(x|0,y|0,3,3,'#cfc7e0');
  }
  ctx.globalAlpha=1;
  drawCigarette(286, 366, 0.22, true);
  drawSprite('flame1', 282, 350);

  /* ------------------------------------------------------------
     标题：单字《闷》做成"印章 + 街机框"
     ------------------------------------------------------------
     《闷》是双关——既是抽烟的动作（"闷一口"），也是无聊的意思
     （"闷得慌"）。它既是名字，也是这游戏要治的病。

     单字撑不起原来"吞云"的双字结构，于是给它一个框：
     外框金色（街机厅招牌感），内层微光，四角做像素角标，
     整体随呼吸缩放。字比框大一圈，像压在招牌上。

     右侧挂一枚小红印"解闷"——把双关当场点破，
     免得新玩家只看到一个不知所谓的字。
     ------------------------------------------------------------ */
  const t = 1 + Math.sin(G.t*2)*0.018;
  ctx.save();
  ctx.translate(160, 76); ctx.scale(t,t); ctx.translate(-160,-76);
  // 外框 + 内框（框宽收到 56，贴合 50px 字的视觉宽度）
  rect(132, 34, 56, 84, 'rgba(255,212,71,.07)');
  frameRect(132, 34, 56, 84, C.gold2);
  frameRect(135, 37, 50, 78, 'rgba(255,212,71,.28)');
  // 四角像素角标
  rect(132,34,3,3,C.gold); rect(185,34,3,3,C.gold);
  rect(132,115,3,3,C.gold); rect(185,115,3,3,C.gold);
  // 字（50px 渲染；y 往下挪是因为中文字体 ascent 有留白，否则视觉偏上）
  text('闷', 160, 46, {size:50, color:C.gold, align:'center'});
  // 右侧小红印：解 / 闷
  rect(196, 52, 36, 48, '#a8322c');
  frameRect(196, 52, 36, 48, C.gold2);
  text('解', 214, 55, {size:14, color:C.paper, align:'center'});
  text('闷', 214, 76, {size:14, color:C.paper, align:'center'});
  ctx.restore();

  rect(80, 124, 160, 1, C.gold2);
  drawText('SMOKE CLASSIC', 160, 132, {size:14, color:C.cyan, align:'center'});
  text('一 根 烟 · 三 口 气', 160, 154, {size:12, color:C.dim, align:'center'});
  // 菜单
  const items = menuItems(SCR.TITLE);
  const bx=58, bw=204, bh=32, by=176;
  panel(bx-8, by-10, bw+16, items.length*bh+18, '#1a1630', C.edge);
  uiHits = [];
  items.forEach((it,i)=>{
    const y = by + i*bh;
    const sel = menuSel.title===i;
    if(sel){ rect(bx, y, bw, 26, 'rgba(107,217,122,.13)'); frameRect(bx,y,bw,26,C.edge3); }
    text((sel?'▶ ':'  ')+it.label, bx+14, y+7, {size:14, color: sel?C.gold:C.txt});
    uiHits.push({x:bx,y,w:bw,h:26,i});
  });
  /* ------------------------------------------------------------
     数据区（340 起，到 424 让给底部提示）
     ------------------------------------------------------------
     行1 最高分 + 上局（合并一行，省空间）
     行2 称号（金色）
     行3 进度条 + 累计统计
     行4 回归诱惑文案（新玩家没有，位置留空）
     ------------------------------------------------------------ */
  textFit('最高分 '+BEST+(LAST>0 ? ' · 上局 '+LAST : ''), 160, 340,
    {size:12, color:C.dim2, align:'center'});
  // 解闷等级
  {
    const ti = titleOf(STATS.cigs), next = titleNext(STATS.cigs);
    text(TITLES[ti].n, 160, 362, {size:13, color:C.gold, align:'center'});
    const cur = TITLES[ti].c, nxt = next > 0 ? TITLES[ti+1].c : TITLES[ti].c;
    const prog = next > 0 ? clamp((STATS.cigs-cur)/(nxt-cur), 0, 1) : 1;
    rect(60, 384, 200, 4, '#241d3a');
    rect(60, 384, Math.round(200*prog), 4, C.gold2);
    textFit('累计 '+STATS.cigs+' 根 · '+STATS.runs+' 局'+
      (next > 0 ? ' · 再 '+next+' 根 → '+TITLES[ti+1].n : ' · 已满级'),
      160, 392, {size:10, color:C.dim2, align:'center'});
  }
  // 回归诱惑文案：有历史记录才出现，hot 文案呼吸闪烁
  const wb = welcomeBack();
  if(wb){
    const a = wb.hot ? 0.6 + 0.4*Math.sin(G.t*3.4) : 1;
    ctx.globalAlpha = a;
    // 小卡片：左侧彩条标语气，右侧渐隐，和上面的数据行拉开 8px
    rect(34, 412, 252, 22, 'rgba(255,255,255,.05)');
    frameRect(34, 412, 252, 22, 'rgba(255,255,255,.07)');
    rect(34, 412, 3, 22, wb.c);
    textFit('» '+wb.t, 46, 417, {size:11, color:wb.c, maxW:232});
    ctx.globalAlpha = 1;
  }
  // 底部说明
  textFit('空格 / 点击 开始', 160, 434, {size:11, color:C.dim, align:'center'});
  rect(0, 448, W, 1, 'rgba(120,90,200,.25)');
  textFit('吸烟有害健康 · 仅为文化梗娱乐 · 不含任何烟草广告', 160, 456,
    {size:10, color:'#5a527a', align:'center'});
}
function drawPause(){
  ctx.globalAlpha=0.72; rect(0,0,W,H,'#07060d'); ctx.globalAlpha=1;
  const items = menuItems(SCR.PAUSE);
  const bw=170, bh=34, by=176;
  panel(160-bw/2-10, by-16, bw+20, items.length*bh+32, 'rgba(30,24,50,.96)', C.edge3);
  text('暂 停', 160, by-8, {size:16, color:C.gold, align:'center'});
  uiHits=[];
  items.forEach((it,i)=>{
    const y = by + 8 + i*bh;
    const sel = menuSel.pause===i;
    if(sel){ rect(160-bw/2, y, bw, 26, 'rgba(107,217,122,.13)'); frameRect(160-bw/2,y,bw,26,C.edge3); }
    text((sel?'▶ ':'  ')+it.label, 160-bw/2+16, y+8, {size:14, color: sel?C.gold:C.txt});
    uiHits.push({x:160-bw/2,y,w:bw,h:26,i});
  });
  textFit('↑↓ 选择 · 空格 确认 · P 继续', 160, 400, {size:12, color:C.dim2, align:'center'});
}
function drawResult(){
  ctx.globalAlpha=0.78; rect(0,0,W,H,'#07060d'); ctx.globalAlpha=1;
  const isBest = G.newBest;
  panel(20, 26, 280, 428, 'rgba(26,21,44,.97)', C.edge3);
  text('本局结算', 160, 36, {size:14, color:C.dim, align:'center'});
  drawText(String(G.score), 160, 54, {size:26, color:C.gold, align:'center'});
  if(isBest){ text('★ 新纪录 ★', 160, 90, {size:12, color:C.red, align:'center'}); }
  else text('最高 '+BEST, 160, 90, {size:12, color:C.dim2, align:'center'});
  rect(40,110,240,1,'rgba(120,90,200,.3)');

  const rank = G.cigs>=13 ? '仙人跳 · 大佬' : G.cigs>=9 ? '资深老炮' : G.cigs>=6 ? '老烟枪' : G.cigs>=3 ? '有点门道' : '试烟新手';
  const rows = [
    ['抽了', G.cigs+' 根'],
    ['最高连击', 'x'+(1+0.25*Math.min(G.bestCombo,8)).toFixed(2)],
    ['完美一根', G.perfectCigs>=1 ? '达成 ×'+G.perfectCigs : '未达成'],
    ['完美率', G.attempts?Math.round(G.perfects/Math.max(1,G.attempts)*100)+'%':'—'],
    ['评价', rank]
  ];
  rows.forEach((r,i)=>{
    const y = 120+i*18;
    text(r[0], 44, y, {size:12, color:C.dim2});
    text(r[1], 276, y, {size:12, color: i===4?C.gold : (i===2 && G.perfectCigs>=1?C.gold:C.txt), align:'right'});
  });
  rect(40,214,240,1,'rgba(120,90,200,.3)');

  // 本局目标：达成高亮，未达成也不骂人，只告诉你差多少
  if(G.goal){
    const ok = G.goalDone;
    text('目标', 44, 222, {size:12, color:C.dim2});
    textFit(G.goal.name+' · '+G.goal.desc, 150, 222, {size:12, color: ok?C.gold:C.dim, align:'center'});
    text(ok ? '达成 +'+G.goalBonus : '未达成', 276, 222, {size:12,
      color: ok?C.gold:C.dim2, align:'right'});
    if(ok){ rect(40,218,240,18,'rgba(255,212,71,.10)'); }
  }
  rect(40,246,240,1,'rgba(120,90,200,.3)');

  // 抽过的牌子
  const names = Object.keys(G.cigCount).sort((a,b)=>G.cigCount[b]-G.cigCount[a]);
  text('抽过', 44, 254, {size:12, color:C.dim2});
  if(!names.length) text('——', 276, 254, {size:12, color:C.dim, align:'right'});
  else{
    let x = 44, row = 0, shown = 0;
    for(let i=0;i<names.length;i++){
      const n = names[i];
      const b = BRANDS.find(bb=>bb.name===n);
      const label = n + '×' + G.cigCount[n];
      const w = measureText(label,12)+10;
      if(x + w > 286){ row++; x = 44; if(row > 1) break; }
      const y = 270 + row*18;
      rect(x, y, w, 15, '#1a1630'); frameRect(x,y,w,15,b?b.color:C.edge);
      text(label, x+w/2, y+1, {size:12, color:C.txt, align:'center'});
      x += w+5; shown++;
    }
    if(shown < names.length) text('+'+(names.length-shown), Math.min(x+2, 284), 270, {size:12, color:C.dim2});
  }
  // 排行榜（前 3）
  rect(40,312,240,1,'rgba(120,90,200,.3)');
  text('本机排行', 44, 320, {size:12, color:C.dim2});
  if(!TOP.length) text('还没有记录', 276, 320, {size:12, color:C.dim, align:'right'});
  else TOP.slice(0,3).forEach((r,i)=>{
    const y = 336+i*15;
    const mine = r.s === G.score && r.c === G.cigs;
    text((i+1)+'.', 44, y, {size:12, color: i===0?C.gold:C.dim2});
    drawText(String(r.s), 66, y, {size:12, color: mine?C.gold:C.txt});
    text(r.c+' 根', 276, y, {size:12, color: mine?C.gold:C.dim, align:'right'});
  });
  // 解闷等级：累计根数 → 称号，附带"距下一级还差几根"的进度条
  const total = STATS.cigs;
  const ti = titleOf(total);
  const next = titleNext(total);
  text(TITLES[ti].n, 44, 384, {size:12, color:C.gold});
  if(next > 0){
    const cur = TITLES[ti].c, nxt = TITLES[ti+1].c;
    text('还差 '+next+' 根', 276, 384, {size:11, color:C.dim2, align:'right'});
    const bx=44, bw2=200, prog = clamp((total-cur)/(nxt-cur), 0, 1);
    rect(bx, 398, bw2, 5, '#241d3a');
    rect(bx, 398, Math.round(bw2*prog), 5, C.gold2);
  } else {
    text('已满级', 276, 384, {size:11, color:C.gold2, align:'right'});
  }

  // 按钮（3 项收在 408~466，底部提示 470 不越界）
  const items = menuItems(SCR.RESULT);
  const bw=180, bh=20, by=408;
  uiHits=[];
  items.forEach((it,i)=>{
    const y = by + i*bh;
    const sel = menuSel.result===i;
    if(sel){ rect(160-bw/2, y, bw, 17, 'rgba(107,217,122,.13)'); frameRect(160-bw/2,y,bw,17,C.edge3); }
    text((sel?'▶ ':'  ')+it.label, 160-bw/2+16, y+2, {size:12, color: sel?C.gold:C.txt});
    uiHits.push({x:160-bw/2,y,w:bw,h:17,i});
  });
  // 底部提示（底层 HUD 阶段提示条已被 NO_HINT 关掉，不会撞字）
  textFit('空格 / R = 立刻再来一根', 160, 466, {size:11, color:C.dim, align:'center'});
}
function drawSettings(){
  drawBackdrop(G.t);
  panel(30, 92, 260, 250, 'rgba(26,21,44,.95)', C.edge3);
  text('设 置', 160, 106, {size:16, color:C.gold, align:'center'});
  const items = settingsItems();
  uiHits=[];
  items.forEach((it,i)=>{
    const y = 134+i*30;
    const sel = menuSel.settings===i;
    if(sel){ rect(42, y-4, 236, 24, 'rgba(107,217,122,.12)'); frameRect(42,y-4,236,24,C.edge3); }
    text((sel?'▶ ':'  ')+it.label, 54, y, {size:12, color: sel?C.gold:C.txt});
    if(it.value) text(it.value, 266, y, {size:12, color: sel?C.cyan:C.dim, align:'right'});
    uiHits.push({x:42,y:y-4,w:236,h:24,i});
  });
  textFit('←→ 切换 · ↑↓ 选择 · Esc 返回', 160, 356, {size:12, color:C.dim2, align:'center'});
  textFit('晕动症 / 光敏感？可关掉震动与闪屏', 160, 376, {size:12, color:'#5a527a', align:'center'});
}
function drawCodex(){
  drawBackdrop(G.t);
  const tabs = ['烟品图鉴','靶子图鉴','冷知识','玩法'];
  // 标签
  uiHits=[];
  tabs.forEach((tb,i)=>{
    const w = 68, x = 16+i*(w+6);
    const sel = codexTab===i;
    rect(x, 10, w, 20, sel? C.panel2 : '#1a1630');
    frameRect(x, 10, w, 20, sel?C.edge3:C.edge);
    text(tb, x+w/2, 15, {size:12, color: sel?C.gold:C.dim, align:'center'});
    uiHits.push({x,y:10,w,h:20,i});
  });
  panel(12, 38, 296, 412, 'rgba(24,19,42,.95)', C.edge);
  if(codexTab===0) codexBrands();
  else if(codexTab===1) codexTargets();
  else if(codexTab===2) codexKnow();
  else codexHelp();
  textFit('←→ 切页 · ↑↓ 滚动 · Esc 返回', 160, 456, {size:12, color:C.dim2, align:'center'});
}
function codexBrands(){
  const start = codexScroll;
  BRANDS.forEach((b,i)=>{
    if(i<start || i>=start+4) return;
    const y = 50 + (i-start)*86;
    const seen = seenBrands[b.name];
    panel(20, y, 280, 76, '#1d1832', C.edge);
    rect(24, y+4, 10, 68, b.color);
    frameRect(24, y+4, 10, 68, b.color);
    if(!seen){
      text('？？？', 44, y+12, {size:14, color:C.dim2});
      text('还没抽过这一款', 44, y+36, {size:12, color:'#5a527a'});
      return;
    }
    text(b.name, 44, y+8, {size:14, color:C.txt});
    text('焦油', 44, y+30, {size:12, color:C.dim2});
    for(let k=0;k<10;k++) rect(82+k*6, y+29, 5, 6, k < Math.round(b.tar/20*10) ? (k>6?C.red:C.gold2) : '#2a2440');
    text('社交', 44, y+48, {size:12, color:C.dim2});
    for(let k=0;k<5;k++) rect(82+k*6, y+47, 5, 6, k<b.social?C.cyan:'#2a2440');
    text('后劲', 44, y+64, {size:12, color:C.dim2});
    for(let k=0;k<6;k++) rect(82+k*6, y+63, 5, 6, k<(6-b.smooth)?C.green:'#2a2440');
    wrapText(b.desc, 160, y+14, 132, 12, 4);
  });
}
function codexTargets(){
  const start = codexScroll;
  TARGETS.forEach((t,i)=>{
    if(i<start || i>=start+5) return;
    const y = 50 + (i-start)*76;
    const seen = seenTargets[t.id];
    panel(20, y, 280, 70, '#1d1832', C.edge);
    if(t.spr) drawSprite(t.spr, 34, y+10); else { rect(38,y+12,16,24,'#3b3f55'); frameRect(38,y+12,16,24,'#5c6480'); }
    if(!seen){
      text('？？？', 66, y+16, {size:14, color:C.dim2});
      text('还没吐到过这儿', 66, y+38, {size:12, color:'#5a527a'});
      return;
    }
    text(t.name, 66, y+12, {size:14, color:C.gold});
    wrapText(t.desc, 66, y+34, 224, 12, 2);
  });
}
function codexKnow(){
  const start = codexScroll;
  KNOWLEDGE.forEach((k,i)=>{
    if(i<start || i>=start+4) return;
    const y = 50 + (i-start)*86;
    panel(20, y, 280, 78, '#1d1832', C.edge);
    text('· '+k.t, 30, y+8, {size:13, color:C.gold});
    wrapText(k.c, 30, y+30, 260, 12, 3);
  });
}
/* 玩法说明页的内容（模块级，滚动上限由它算出，避免手写行数失同步） */
const HELP_LINES = [
  ['为什么叫"闷"', C.gold],
  ['这游戏是给排队、通勤、摸鱼时无聊的人', C.txt],
  ['做的。"闷"是抽烟的动作，也是无聊的意思', C.dim],
  ['——名字就是它要治的病。', C.txt],
  ['玩法：一根烟，三段考校', C.gold],
  ['每根烟都要依次完成三步，手上功夫全靠这', C.txt],
  ['三步，缺一不可。', C.dim],
  ['① 点：火苗在滑轨上来回跑，对准烟头按', C.txt],
  ['　 空格/点击。压在金区里算完美点火。', C.dim],
  ['② 吸：按住不放，横条往右涨，松手时', C.txt],
  ['　 落进绿区。吸太猛会呛到，肺负担 +9。', C.dim],
  ['③ 吐：拖动瞄准，按住蓄力，松手吐烟圈，', C.txt],
  ['　 套住靶子得分。', C.dim],
  ['计分与上头', C.gold],
  ['连击越高倍率越高（最高 x3.00），任何失', C.txt],
  ['误都会清零。', C.dim],
  ['三段全完美 = "完美一根"，额外大奖。', C.txt],
  ['HUD 上的三格金条就是当前链。', C.dim],
  ['难度递增', C.gold],
  ['第 1 根是"新手"：火苗慢、绿区宽、靶子大。', C.txt],
  ['越往后火苗越快、绿区越窄、靶子越小越会', C.txt],
  ['动、还可能起风。肺负担也越抽越重。', C.dim],
  ['肺到 100 本局结束，所以单局有天然长度。', C.txt],
  ['每根都不一样', C.gold],
  ['约每 4 根有 1 根是特殊烟：细支金区更宽、', C.txt],
  ['薄荷绿区会跳舞、雪茄高风险高回报、茶烟低', C.dim],
  ['害低分、老炮存货全段加难。求稳还是求分，', C.txt],
  ['你自己定。', C.dim],
  ['解闷等级', C.gold],
  ['累计抽烟根数换称号：排队见习 → 通勤老手', C.txt],
  ['→ 摸鱼大师 → 休息区之王 → 解闷传说 → 无', C.dim],
  ['聊终结者（500 根）。', C.txt],
  ['每局开局抽一个目标（零呛咳 / 3 次完美一', C.txt],
  ['根 / 抽满 12 根 / 8000 分），达成有奖励分。', C.dim],
  ['操作', C.gold],
  ['键盘：空格/回车 操作，方向键瞄准，', C.txt],
  ['P 暂停，R 重开。', C.dim],
  ['手机：点按/长按/拖动，屏上也有暂停键。', C.txt],
  ['', C.txt]
];
const HELP_VISIBLE = 22;         // 一屏能显示的行数
const HELP_LINE_H = 16;          // 行高：22 行 × 16 = 352，从 y=48 排到 400，留在面板内
function codexHelp(){
  const lines = HELP_LINES;
  const scroll = clamp(codexScroll, 0, Math.max(0, lines.length-HELP_VISIBLE));
  lines.forEach((l,i)=>{
    if(i<scroll || i>=scroll+HELP_VISIBLE) return;   // 必须同时裁上下界
    text(l[0], 24, 48+(i-scroll)*HELP_LINE_H, {size:12, color:l[1]});
  });
  if(scroll > 0) text('▲', 292, 44, {size:12, color:C.dim2, align:'right'});
  if(scroll < lines.length-HELP_VISIBLE) text('▼', 292, 432, {size:12, color:C.dim2, align:'right'});
}
function wrapText(str, x, y, maxW, size, maxLines){
  const chars = Array.from(str);
  let line = '', ln = 0;
  for(const ch of chars){
    if(measureText(line+ch, size) > maxW){
      text(line, x, y+ln*(size+4), {size, color:C.dim});
      ln++; line = ch;
      if(ln>=maxLines-1) break;
    } else line += ch;
  }
  if(ln<maxLines) text(line, x, y+ln*(size+4), {size, color:C.dim});
}
/* 图鉴标签点击在主 pointerdown 处理里完成（uiHits 已含页签） */
