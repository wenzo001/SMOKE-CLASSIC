/* ============================================================
   AUDIO · 音频（WebAudio 合成 8-bit 音效）
   ------------------------------------------------------------
   本文件为 classic script（非 ES Module），顶层 const/let/function
   落在全局词法环境，跨文件按 index.html 中的 script 顺序共享。
   依赖顺序：core → data → game → render → main
   ============================================================ */
'use strict';

/* ============================================================
   SECTION 5 · 音频（WebAudio 合成 8-bit 音效）
   ============================================================ */
const SFX = (function(){
  let ac = null, master = null, noiseBuf = null;
  let muted = false, inhaleSrc = null, inhaleGain = null;
  function init(){
    if(ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.3; master.connect(ac.destination);
    const len = ac.sampleRate * 1.2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
  }
  function resume(){ if(ac && ac.state === 'suspended') ac.resume(); }
  function tone(freq, dur, type, vol, slideTo){
    if(!ac || muted) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type||'square';
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), ac.currentTime+dur);
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime((vol||0.3), ac.currentTime+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ac.currentTime+dur+0.02);
  }
  function seq(notes, step, type, vol){
    notes.forEach((n,i)=>setTimeout(()=>tone(n, step*1.6, type||'square', vol||0.26), i*step*1000));
  }
  function noise(dur, vol, f0, f1, type){
    if(!ac || muted) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const flt = ac.createBiquadFilter(); flt.type = type||'lowpass';
    const t = ac.currentTime;
    flt.frequency.setValueAtTime(f0||1200, t);
    if(f1) flt.frequency.exponentialRampToValueAtTime(Math.max(60,f1), t+dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol||0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    s.connect(flt); flt.connect(g); g.connect(master);
    s.start(); s.stop(t+dur+0.02);
  }
  return {
    init, resume,
    get muted(){ return muted; },
    setMuted(v){ muted = v; if(v) this.inhaleStop(); },
    ui(){ tone(660,0.05,'square',0.2); },
    select(){ tone(880,0.05,'square',0.22); setTimeout(()=>tone(1180,0.05,'square',0.16),40); },
    back(){ tone(400,0.07,'square',0.18,260); },
    lighter(){ noise(0.06,0.22,5200,700); tone(160,0.05,'square',0.12,90); },
    perfect(){ seq([784,988,1319],0.055,'square',0.26); },
    good(){ seq([659,880],0.06,'square',0.22); },
    miss(){ tone(240,0.16,'square',0.18,150); },
    inhaleStart(){
      if(!ac||muted||inhaleSrc) return;
      inhaleSrc = ac.createBufferSource(); inhaleSrc.buffer = noiseBuf; inhaleSrc.loop = true;
      const flt = ac.createBiquadFilter(); flt.type='bandpass'; flt.frequency.value=520; flt.Q.value=0.9;
      inhaleGain = ac.createGain(); inhaleGain.gain.value = 0;
      inhaleSrc.connect(flt); flt.connect(inhaleGain); inhaleGain.connect(master);
      inhaleSrc.start();
    },
    inhaleLevel(v){ if(inhaleGain) inhaleGain.gain.setTargetAtTime(v*0.16, ac.currentTime, 0.05); },
    inhaleStop(){
      if(!inhaleSrc) return;
      try{ inhaleSrc.stop(); }catch(e){}
      inhaleSrc = null; inhaleGain = null;
    },
    choke(){ noise(0.34,0.34,900,180); tone(300,0.3,'sawtooth',0.22,90); },
    exhale(){ noise(0.3,0.24,2400,420,'bandpass'); },
    hit(){ seq([659,880,1047,1319],0.05,'square',0.28); },
    near(){ seq([523,659],0.06,'square',0.2); },
    fail(){ tone(330,0.18,'triangle',0.2,180); },
    levelUp(){ seq([523,659,784,1047],0.06,'square',0.24); },
    event(){ seq([440,554,659],0.05,'triangle',0.2); },
    over(){ seq([392,330,262,196],0.13,'triangle',0.26); },
    record(){ seq([1047,1319,1568,2093],0.08,'square',0.28); }
  };
})();
