/* ============================================================
   SPRITES · 精灵（8-bit 点阵）
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 4 · 精灵（8-bit 点阵）
   ============================================================ */
const SPR = {
  lighter:{w:12,h:16,pal:{m:'#9aa2ba',d:'#454b60',l:'#5c6480',L:'#e2e7f5'},
    rows:['............','..mmmmmmmm..','..mlLLLLlm..','..ml....lm..','..m.l..l.m..','..ml....lm..',
          '..mLLLLLLm..','..mmmmmmmm..','..mmmmmmmm..','..mmd..dmm..','..mmd..dmm..','..mmmmmmmm..',
          '..mmmmmmmm..','..mmmmmmmm..','..mmmmmmmm..','..dddddddd..']},
  flame0:{w:8,h:12,pal:{y:'#ffe66d',O:'#ff9f1c',W:'#fff6d0'},
    rows:['...yy...','..yOoy..','..yOOy..','..yOOy..','.yOWWOy.','.yOOWOy.','.yOWWOy.','.yOOWOy.',
          '..yOOy..','..yOOy..','...yy...','........']},
  flame1:{w:8,h:12,pal:{y:'#ffe66d',O:'#ff9f1c',W:'#fff6d0'},
    rows:['..yyy...','..yOoy..','..yOOy..','.yOOWy..','.yOWWOy.','yOOWWOy.','.yOWWOy.','.yOOWOy.',
          '..yOOy..','..yOoy..','...yy...','........']},
  flame2:{w:8,h:12,pal:{y:'#ffe66d',O:'#ff9f1c',W:'#fff6d0'},
    rows:['...yy...','..yOoy..','..yOOy..','..yOOy..','..yOOWy.','.yOOWWOy','.yOWWOy.','..yOOWy.',
          '..yOOy..','..yOoy..','...yy...','........']},
  ashtray:{w:16,h:10,pal:{d:'#6a6f88',L:'#c6cce0',D:'#3a3f55'},
    rows:['................','..dd........dd..','.dLLd......dLLd.','.dLLLddddddLLLd.','dDDDDDDDDDDDDDDd',
          'dDDDDDDDDDDDDDDd','dDDDDDDDDDDDDDDd','.dDDDDDDDDDDDDd.','..dddddddddddd..','................']},
  trashcan:{w:16,h:16,pal:{d:'#5b6078',L:'#aeb5cb',D:'#2e3348'},
    rows:['..dddddddddddd..','..dLLLLLLLLLLd..','...dLLLLLLLLd...','...dLddddddLd...','...dLdLLLLdLd...',
          '...dLdLLLLdLd...','...dLdLLLLdLd...','...dLdLLLLdLd...','...dLdLLLLdLd...','...dLdLLLLdLd...',
          '...dLdLLLLdLd...','...dLdLLLLdLd...','...dLdLLLLdLd...','...dLdLLLLdLd...','...dddddddddd...',
          '................']},
  sign:{w:16,h:16,pal:{L:'#eef1f8',r:'#d8463c'},
    rows:['..LLLLLLLLLLLL..','.LLLLLLLLLLLLLL.','LLLrrrrrrrrrrLLL','LLrrrrrrrrrrrrLL','LLrrrrrrrrrrrrLL',
          'LLrrrrrrrrrrrrLL','LLrrrrrrrrrrrrLL','LLrrrrrrrrrrrrLL','LLrrrrrrrrrrrrLL','LLrrrrrrrrrrrrLL',
          'LLrrrrrrrrrrrrLL','LLrrrrrrrrrrrrLL','.LLLLLLLLLLLLLL.','..LLLLLLLLLLLL..','................',
          '................']},
  door:{w:16,h:20,pal:{d:'#4a4f66',L:'#dfe4f2',b:'#8a5a3c',y:'#ffd447'},
    rows:['..dddddddddddd..','..dLLLLLLLLLLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..',
          '..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..',
          '..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLbbbbbbbbLd..',
          '..dLbbbbbbbbLd..','..dLbbbbbbbbLd..','..dLLLLLLLLLLd..','..dddddddddddd..','................']},
  cat:{w:16,h:16,pal:{m:'#3a3350',M:'#6d5f8f',e:'#ffe66d',w:'#ff9f9c'},
    rows:['................','................','..m..........m..','..mm........mm..','..mm........mm..',
          '...mm......mm...','...mmmmmmmmmm...','..mMMMMMMMMMMm..','..mMMMMMMMMMMm..','..mMMeeMMeeMMm..',
          '..mMMMMMMMMMMm..','..mMMwwwwMMMMm..','..mMMMMMMMMMMm..','..mMMMMMMMMMMm..','...mMMMMMMMMm...',
          '................']},
  hydrant:{w:16,h:16,pal:{r:'#8f2a24',R:'#d94a3d',d:'#3b3f52'},
    rows:['......rrrr......','.....rRRRRr.....','....rrRRRRrr....','...rrrRRRRrrr...','..rrrrRRRRrrrr..',
          '..rrrrRRRRrrrr..','..rrrrRRRRrrrr..','..rrrrRRRRrrrr..','..rrrrRRRRrrrr..','..rrrrRRRRrrrr..',
          '...rrrrrrrrrr...','...rrrrrrrrrr...','..rRRRrrrrRRRr..','..rrrrrrrrrrrr..','..rrrrrrrrrrrr..',
          '...dddddddddd...']},
  pigeon:{w:16,h:16,pal:{g:'#6b6f86',G:'#aab0c6',w:'#ffd447',r:'#d9948a',R:'#f0b3aa'},
    rows:['................','................','....gg..........','...gGGg.........','...gGGgg.ggg....',
          '...gGGGGGGGGg...','..gGGGGGGGGGg..','..gGGwwGGGGGGGg.','..gGGGGGGGGGGGg.','..ggGGGGGGGGGGg.',
          '...gGGGGGGGGg...','....gGGGGGGGg...','....ggGGGGGg....','..rrr..gg.gg....','.rRRr...gg......',
          '..rr............']}
};
function drawSprite(name, x, y){
  const s = SPR[name]; if(!s) return;
  for(let j=0;j<s.h;j++){
    const row = s.rows[j];
    for(let i=0;i<s.w;i++){
      const ch = row[i]; if(ch==='.') continue;
      const col = s.pal[ch]; if(!col) continue;
      ctx.fillStyle = col; ctx.fillRect(x+i, y+j, 1, 1);
    }
  }
}
