/* ============================================================
   UPDATE · 更新
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 12 · 更新
   ============================================================ */
function update(dt){
  G.t += dt;
  // trauma 衰减
  G.shake = Math.max(0, G.shake - 1.6*dt);
  G.flash = Math.max(0, G.flash - dt*3.2);
  // 粒子
  for(let i=G.parts.length-1;i>=0;i--){
    const p=G.parts[i]; p.t+=dt;
    if(p.t>=p.life){ G.parts.splice(i,1); continue; }
    p.vy += 260*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
  }
  // 烟雾
  for(let i=G.smoke.length-1;i>=0;i--){
    const s=G.smoke[i]; s.t+=dt; s.y -= 26*dt; s.x += Math.sin((s.t+s.x)*0.05)*10*dt;
    if(s.t>=s.life) G.smoke.splice(i,1);
  }
  // 浮字
  for(let i=G.fx.length-1;i>=0;i--){
    const f=G.fx[i]; f.t+=dt; f.y -= 26*dt;
    if(f.t>=f.dur) G.fx.splice(i,1);
  }
  // 事件卡
  if(curScreen()!==SCR.GAME) return;
  if(G.pendingEvent){
    G.eventT += dt;
    if(G.eventT>2.4){
      const e = G.pendingEvent; G.pendingEvent=null; G.eventT=-1;
      G.score = Math.max(0, G.score + e.s);
      G.lung = clamp(G.lung + e.l, 0, 100);
      syncHud();
      if(G.lung>=100){ gameOver(); return; }
      newCigarette();
    }
  }
  // 阶段切换计时器（不用 setTimeout，避免暂停/重开时穿透）
  if(G.pending){
    G.pending.t -= dt;
    if(G.pending.t <= 0){
      const k = G.pending.kind; G.pending = null;
      if(k==='toInhale') setupInhale();
      else if(k==='toExhale') setupExhale();
      else if(k==='endCig') endCigarette(false);
      else if(k==='nextCig') newCigarette();
      else if(k==='result'){ stack=[SCR.RESULT]; menuSel.result=0; }
    }
  }
  if(G.over){ G.overT+=dt; return; }
  const ph = G.phase;
  if(ph==='light'){
    const L=G.light;
    if(!L.lit){
      L.x += L.dir*L.speed*dt;
      if(L.x>=L.track1){ L.x=L.track1; L.dir=-1; }
      if(L.x<=L.track0){ L.x=L.track0; L.dir=1; }
    }
  } else if(ph==='inhale'){
    const I=G.inhale;
    if(I.holding){
      I.v += 62*dt;
      if(I.v>=100) I.v=100;
      I.idle = 0;
      // 吸气时火星更亮，烟雾被"吸"进去
      if(Math.random() < 0.6)
        G.smoke.push({x:160+rand(-5,5), y:292, col:'#d8d0e8', t:0, life:0.45});
    } else {
      I.idle += dt;
      if(I.v>0) I.v = Math.max(0, I.v - 30*dt);   // 犹豫：劲会散
      if(I.idle > 12){ I.holding = true; releaseInhale(); }   // 久不动作 → 自动松口
    }
    if(I.driftAmp>0) I.drift = Math.sin(G.t*0.9)*I.driftAmp;
    SFX.inhaleLevel(I.holding? clamp(I.v/100,0,1) : 0);
  } else if(ph==='exhale'){
    const E=G.exhale;
    if(E.charging){
      E.chargeT += dt;
      E.power = clamp(E.chargeT/0.85, 0, 1);
    }
    // 靶子：释放前静止，释放后开始移动（难度递增）
    if(E.target){
      const T=E.target;
      if(E.ring && E.ring.alive){ T.x += T.vx*dt; T.y += T.vy*dt; }
      T.x = clamp(T.x, 30, 290); T.y = clamp(T.y, 118, 276);
    }
    if(E.ring && E.ring.alive){
      const r=E.ring, T=E.target;
      // 固定步长积分：与弹道预览完全一致，所见即所得
      r.acc += dt;
      while(r.acc >= RING_DT && r.alive){
        r.acc -= RING_DT;
        r.t += RING_DT;
        r.vy += RING_G*RING_DT;
        r.vx += E.wind*RING_DT;               // 风偏
        r.x += r.vx*RING_DT;
        r.y += r.vy*RING_DT;
        if(Math.random()<0.6) trail(r.x,r.y,C.smoke);
        const d = Math.hypot(r.x-T.x, r.y-T.y);
        if(d < T.r+5){
          r.alive=false; E.over=true;
          const perfect = d < T.r*0.62;
          if(perfect){
            addScore(260, T.x, T.y-18, C.gold, true);
            G.combo++; G.perfects++; bumpChain();
            burst(T.x,T.y,24,C.gold,130); addTrauma(0.6); hitStop(0.07); flash('#ffd447',0.5);
            popText(T.x, T.y-26, '正中靶心！', C.gold, true);
            SFX.hit();
          } else {
            addScore(110, T.x, T.y-18, C.green, false);
            G.combo++;
            burst(T.x,T.y,12,C.green,80); addTrauma(0.3); SFX.near();
            popText(T.x, T.y-24, '命中', C.green);
          }
          syncHud();
          G.pending = { kind:'endCig', t:0.72 };
        } else if(r.y>H+30 || r.x<-40 || r.x>W+40 || r.t>4){
          r.alive=false; E.over=true;
          G.combo = 0; G.chain = 0;
          addTrauma(0.12);
          popText(160, 250, '烟圈散了', C.dim);
          popText(160, 278, '抽了口寂寞', C.dim2);
          SFX.fail();
          syncHud();
          G.pending = { kind:'endCig', t:0.76 };
        }
      }
    }
  }
}
