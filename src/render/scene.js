/* ============================================================
   SCENE · 游戏画面
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 14 · 游戏画面
   ============================================================ */
function renderGame(){
  const sh = shakeOffset();
  ctx.save();
  ctx.translate(sh[0]|0, sh[1]|0);
  drawBackdrop(G.t);
  if(G.phase==='light')   drawLight();
  else if(G.phase==='inhale') drawInhale();
  else if(G.phase==='exhale') drawExhale();
  else drawIdle();
  drawParticles();
  drawSmoke();
  drawFX();
  ctx.restore();
  drawHUD();
  if(G.pendingEvent) drawEventCard();
  if(G.over) drawOver();
  if(G.flash>0){ ctx.globalAlpha=clamp(G.flash,0,1); rect(0,0,W,H,G.flashCol); ctx.globalAlpha=1; }
}
/* withHint=false 时不画底部提示条 —— 暂停/结算页有自己的提示文案，
   不关掉的话两行字会叠在同一个 y 上。 */
let NO_HINT = false;                 // 由 main.js 的 render() 设置
function drawHUD(){
  const S_ = SET.bigText;
  // 顶栏
  rect(0,0,W,36,'rgba(12,9,22,.88)');
  ctx.fillStyle='rgba(120,90,200,.35)'; ctx.fillRect(0,36,W,1);
  text('分数', 6, 4, {size:14, color:C.dim2});
  drawText(String(HUD.score), 40, 3, {size:14, color:C.gold});
  text('最高', 110, 6, {size:12, color:C.dim2});
  drawText(String(HUD.best), 140, 5, {size:12, color:C.dim});
  // 连击
  if(HUD.combo>0){
    text('连击', 194, 6, {size:12, color:C.dim2});
    drawText('x'+(1+0.25*Math.min(HUD.combo,8)).toFixed(2), 226, 4, {size:14, color:C.gold});
  }
  // 暂停键
  panel(292,3,24,18, C.panel, C.edge, false);
  rect(297,7,3,9,C.txt); rect(304,7,3,9,C.txt);
  // 第二行：第几根 / 等级 / 品牌
  text('第'+(HUD.cig+1)+'根 Lv'+HUD.level, 6, 21, {size:12, color:C.dim});
  // 难度档
  const tier = TIERS[clamp(G.tier,0,TIERS.length-1)];
  const tw = measureText(tier.name,12)+8;
  panel(96, 19, tw, 14, '#1a1630', tier.color, false);
  text(tier.name, 96+tw/2, 20, {size:12, color:tier.color, align:'center'});
  // 完美链进度（3 段全中 = 完美一根）
  if(G.chain>0){
    for(let i=0;i<3;i++){
      const px = 96+tw+8+i*9;
      rect(px, 22, 7, 7, i < G.chain ? C.gold : '#2a2440');
    }
  }
  if(HUD.brand) text(HUD.brand, 288, 21, {size:12, color:C.dim, align:'right'});
  // 肺负载：右侧竖条（不挡场地）
  const lx=304, ly=52, lh=236;
  text('肺', lx+6, ly-16, {size:12, color:C.dim2, align:'center'});
  rect(lx, ly, 12, lh, '#0e0b18'); frameRect(lx, ly, 12, lh, C.edge);
  const danger = HUD.lung>=80;
  const col = danger ? C.red : HUD.lung>=55 ? C.gold2 : C.green;
  const fh = Math.round((lh-2)*clamp(HUD.lung,0,100)/100);
  for(let i=0;i<fh;i++){
    if(i%6===5) continue;                      // 分段感
    const yy = ly+lh-1-i;
    rect(lx+1, yy, 10, 1, col);
    if(Math.floor(i/6)%2===1) rect(lx+1, yy, 10, 1, 'rgba(255,255,255,.20)');
  }
  if(danger) text('!', lx+6, ly+lh+2, {size:14, color:C.red, align:'center'});
}
function drawHint(s){
  if(NO_HINT) return;                       // 暂停/结算时底下已有自己的提示文案
  const y = 452;
  rect(0, 440, W, 22, 'rgba(12,9,22,.75)');
  textFit(s, W/2, y, {size: SET.bigText?14:12, color:C.dim, align:'center'});
}
function drawIdle(){
  // 阶段间空白：显示香烟与烟雾
  drawCigarette(160, 300, 0, false);
  drawSmoke();
}
function drawCigarette(x, y, angle, burning){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  // 烟身
  rect(-3,-2, 6, 46, C.paper);
  rect(-3, 40, 6, 6, C.ember);         // 滤嘴
  rect(2,-2, 1, 46, C.paper2);
  if(burning){
    rect(-3,-6, 6, 4, C.ember);
    rect(-1,-8, 2, 2, C.flame);
  }
  ctx.restore();
}
function drawLight(){
  const L = G.light;
  // 滑轨
  rect(L.track0-4, 92, (L.track1-L.track0)+8, 14, '#2a2440');
  frameRect(L.track0-4, 92, (L.track1-L.track0)+8, 14, C.edge);
  dither(L.track0-2, 94, L.track1-L.track0+4, 10, '#332c4c', '#2a2440');
  // 黄金区
  const gx = L.target - L.zone;
  rect(gx, 92, L.zone*2, 14, 'rgba(255,212,71,.22)');
  frameRect(gx, 92, L.zone*2, 14, C.gold);
  // 垂直引导线
  for(let y=110;y<300;y+=6) rect(L.target, y, 1, 3, 'rgba(140,120,200,.30)');
  // 标记
  text('对准这里', L.target, 108, {size:12, color:C.gold, align:'center'});
  // 火焰
  const fl = 'flame'+(Math.floor(G.t*12)%3);
  const fx = (L.x|0) - 4;
  drawSprite(fl, fx, 84);
  if(L.lit) drawSprite('flame0', L.target-4, 106);
  // 香烟
  drawCigarette(160, 300, 0, L.lit);
  // 打火机
  drawSprite('lighter', 140, 350);
  text('打火机', 146, 368, {size:12, color:C.dim2, align:'center'});
  drawHint('按 空格 / 点击屏幕，让火苗对准烟头');
}
function drawInhale(){
  const I = G.inhale;
  const bx=30, bw=260, by=186, bh=32;
  const lo = I.lo+I.drift, hi = I.hi+I.drift;
  const y0 = by+1, h0 = bh-2;
  // 轨道底
  rect(bx, by, bw, bh, '#0e0b18');
  // 刻度（横轴 = 吸入量 0..100）
  for(let p=25;p<100;p+=25){
    const px = bx+1+Math.round((bw-2)*p/100);
    rect(px, by+1, 1, h0, 'rgba(255,255,255,.07)');
  }
  // 填充（横轴推进）
  const fw = Math.round((bw-2)*clamp(I.v,0,100)/100);
  const over = I.v>=92;
  rect(bx+1, y0, fw, h0, over ? C.red : C.cyan);
  rect(bx+1, y0, fw, Math.round(h0*0.35), 'rgba(255,255,255,.18)');
  // 理想区：画在填充【之上】，永远可见
  const zx0 = bx+1+Math.round((bw-2)*clamp(lo,0,100)/100);
  const zx1 = bx+1+Math.round((bw-2)*clamp(hi,0,100)/100);
  const zw = Math.max(3, zx1-zx0);
  rect(zx0, y0, zw, h0, 'rgba(107,217,122,.28)');
  frameRect(zx0, y0, zw, h0, C.green);
  for(let i=0;i<3;i++) rect(zx0+2+i*4, y0+h0+2, 2, 2, C.green);
  // 游标头
  if(I.v>0) rect(bx+1+fw-1, y0-4, 3, h0+8, over?C.red:C.gold);
  // 文字
  text('吸入 '+Math.round(I.v), bx, by-18, {size:12, color: over?C.red:C.txt});
  text('按住 空格 / 长按屏幕', bx+bw, by-18, {size:12, color:C.dim2, align:'right'});
  text('理想区', zx0+zw/2, by+bh+8, {size:12, color:C.green, align:'center'});
  // 香烟（吸的时候火星变亮）
  drawCigarette(160, 300, 0, true);
  drawHint('松手时落进绿区 · 老烟枪的"七分饱"');
}
function drawExhale(){
  const E = G.exhale;
  const T = E.target;
  const ox=160, oy=392;
  // 目标
  if(T){
    if(T.t.spr){
      drawSprite(T.t.spr, T.x-8, T.y-8);
    } else {
      // 电梯门
      rect(T.x-8,T.y-12,16,24,'#3b3f55'); frameRect(T.x-8,T.y-12,16,24,'#5c6480');
      rect(T.x-6,T.y-10,12,20,'#20242f'); rect(T.x-1,T.y-4,1,8,'#8a90a8');
    }
    // 靶圈
    ctx.strokeStyle = T.r>12?C.gold:C.red;
    ctx.globalAlpha=0.5; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(T.x+0.5,T.y+0.5,T.r,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
    text(T.t.name, T.x, T.y+16, {size:12, color:C.dim, align:'center'});
  }
  // 轨迹预览 + 最近点标记（轨迹扫过靶圈时变金）
  if(SET.guide && !E.fired){
    const sp = ringSpeed(E.power);
    let x=ox, y=oy, vx=Math.cos(E.angle)*sp, vy=Math.sin(E.angle)*sp;
    const dt=RING_DT; let best=null, bestD=1e9;
    for(let i=0;i<220;i++){
      vy += RING_G*dt; vx += E.wind*dt;
      x += vx*dt; y += vy*dt;
      if(i%2===0) rect(x-1,y-1,2,2,'rgba(255,212,71,.50)');
      if(T){
        const d = Math.hypot(x-T.x, y-T.y);
        if(d<bestD){ bestD=d; best={x,y}; }
      }
      if(x<-24||x>W+24||y<-24||y>H+24) break;
    }
    if(best){
      const on = bestD < T.r+5;
      const col = on ? C.gold : C.cyan;
      rect(best.x-6, best.y-1, 13, 2, col);
      rect(best.x-1, best.y-6, 2, 13, col);
      rect(best.x-3, best.y-3, 6, 6, on?'rgba(255,212,71,.35)':'rgba(94,200,232,.22)');
      if(on) text('就是这儿', best.x, best.y-20, {size:12, color:C.gold, align:'center'});
    }
  }
  // 风力指示
  if(Math.abs(E.wind) > 0.5){
    const dir = E.wind>0?1:-1;
    const wcx = 160;
    text('风', wcx, 108, {size:12, color:C.cyan, align:'center'});
    for(let i=0;i<3;i++){
      const px = wcx - 14 + dir*(6+i*7);
      rect(px, 118, 4, 1, C.cyan);
    }
  }
  // 力度条（常驻，方便读数）
  {
    const pw=110, px=ox-pw/2, py=420;
    rect(px,py,pw,8,'#0e0b18'); frameRect(px,py,pw,8,C.edge);
    rect(px+1,py+1,Math.round((pw-2)*E.power),6, E.power>0.85?C.red:C.gold);
    text('力度', px-4, py, {size:12, color:C.dim2, align:'right'});
  }
  // 手 + 烟
  ctx.save();
  ctx.translate(ox, oy+6);
  // 拳头
  rect(-7,-4,14,12,'#d99a68'); rect(-7,-4,14,3,'#e8b182');
  rect(-7,4,14,4,'#b87a4e');
  ctx.rotate(E.angle+Math.PI/2);
  rect(-2,-26,4,30,C.paper);
  rect(-2,2,4,6,C.ember);
  rect(-2,-32,4,6,'#ff8a3d');
  rect(-1,-30,2,2,C.flame);
  ctx.restore();
  // 烟圈
  if(E.ring && E.ring.alive){
    const r=E.ring;
    ctx.strokeStyle=C.paper; ctx.globalAlpha=0.85; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(r.x,r.y,6,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
  }
  drawHint('拖动瞄准 · 按住蓄力 · 松手吐烟圈');
}
function drawParticles(){
  for(const p of G.parts){
    const a = 1-p.t/p.life;
    ctx.globalAlpha = clamp(a,0,1);
    rect(p.x|0,p.y|0,p.size,p.size,p.col);
  }
  ctx.globalAlpha=1;
}
function drawSmoke(){
  for(const s of G.smoke){
    const a = 1-s.t/s.life;
    ctx.globalAlpha = clamp(a*0.55,0,1);
    rect(s.x|0,s.y|0,2,2,s.col);
  }
  ctx.globalAlpha=1;
}
function drawFX(){
  for(const f of G.fx){
    const k = f.t/f.dur;
    const a = k<0.15 ? k/0.15 : 1-(k-0.15)/0.85;
    ctx.globalAlpha = clamp(a,0,1);
    if(f.big) drawText(f.text, f.x, f.y, {size:16, color:f.col, align:'center'});
    else      drawText(f.text, f.x, f.y, {size:12, color:f.col, align:'center'});
  }
  ctx.globalAlpha=1;
}
function drawEventCard(){
  const e = G.pendingEvent;
  const k = clamp(G.eventT/0.28,0,1);
  const y = 168 - (1-easeOut(k))*30;
  panel(28,y,264,100, 'rgba(30,24,50,.97)', C.edge3);
  text(e.luck ? '今天手气不错' : '路上遇到点事', W/2, y+8, {size:12, color: e.luck?C.green:C.dim2, align:'center'});
  text(e.t, W/2, y+24, {size:14, color:C.gold, align:'center'});
  wrapText(e.d, 46, y+46, 228, 12, 2);
  const chips=[];
  if(e.s) chips.push({t:(e.s>0?'分数 +':'分数 ')+e.s, c: e.s>0?C.gold:C.red});
  if(e.l) chips.push({t:(e.l>0?'肺 +':'肺 ')+e.l, c: e.l>0?C.red:C.green});
  const cw = 62, gap = 8;
  let cx = Math.round(W/2 - (chips.length*cw + (chips.length-1)*gap)/2);
  for(const ch of chips){
    panel(cx, y+72, cw, 14, '#191430', ch.c, false);
    text(ch.t, cx+cw/2, y+73, {size:12, color:ch.c, align:'center'});
    cx += cw + gap;
  }
  text('点击跳过', W/2, y+88, {size:10, color:C.dim2, align:'center'});}
function drawOver(){
  const k = clamp(G.overT*1.6,0,1);
  ctx.globalAlpha = k*0.55;
  rect(0,0,W,H,'#07060d');
  ctx.globalAlpha=1;
  text('肺到极限了', W/2, 210, {size:16, color:C.red, align:'center'});
  text('今天到此为止', W/2, 236, {size:12, color:C.dim, align:'center'});
}
