/* ============================================================
   UTILS · 工具
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 2 · 工具
   ============================================================ */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp =(a,b,t)=>a+(b-a)*t;
const rand =(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const pick =a=>a[Math.floor(Math.random()*a.length)];
const easeOut =t=>1-Math.pow(1-t,3);
const easeIn  =t=>t*t*t;
const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeBack =t=>{const c=1.70158+1;return 1+c*Math.pow(t-1,3)+1.70158*Math.pow(t-1,2);};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
