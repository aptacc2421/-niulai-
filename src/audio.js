/* ============================================================
 * 直立牛平原 M1 —— WebAudio 音效（零素材，全合成）
 * window.AudioSys = { init, 哞, 叮, 哈气, 脚步, 口琴BGM, 静音切换 }
 * ============================================================ */
(function () {
  'use strict';

  var ctx = null;
  var muted = false;
  var bgmTimer = null;
  var nextNoteTime = 0;
  var noteIdx = 0;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(c) {
    var len = c.sampleRate * 0.5;
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // 哞 —— 低音降调
  function sfxBoom() {
    if (muted) return;
    try {
      var c = ac(), t = c.currentTime;
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(62, t + 0.35);
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      env(g, t, 0.02, 0.28, 0.4);
      o.connect(lp); lp.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.45);
    } catch (e) {}
  }

  // 叮 —— 语录卡入罐
  function sfxDing() {
    if (muted) return;
    try {
      var c = ac(), t = c.currentTime;
      [880, 1320].forEach(function (f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        env(g, t + i * 0.07, 0.005, 0.2, 0.18);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.2);
      });
    } catch (e) {}
  }

  // 哈气 —— 气声 + 一点低音
  function sfxHaqi() {
    if (muted) return;
    try {
      var c = ac(), t = c.currentTime;
      var src = c.createBufferSource(); src.buffer = noiseBuffer(c);
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      src.connect(lp); lp.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + 0.55);
      var o = c.createOscillator(), g2 = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.45);
      env(g2, t, 0.05, 0.1, 0.45);
      o.connect(g2); g2.connect(c.destination);
      o.start(t); o.stop(t + 0.5);
    } catch (e) {}
  }

  // 脚步 —— 短促噪声
  function sfxStep() {
    if (muted) return;
    try {
      var c = ac(), t = c.currentTime;
      var src = c.createBufferSource(); src.buffer = noiseBuffer(c);
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(lp); lp.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + 0.06);
    } catch (e) {}
  }

  // 口琴 BGM：C E G A G E 循环，偶尔跑调一个音
  var MELODY = [261.6, 329.6, 392.0, 440.0, 392.0, 329.6];
  function scheduleBgm() {
    if (muted) return;
    var c = ac();
    while (nextNoteTime < c.currentTime + 0.6) {
      var f = MELODY[noteIdx % MELODY.length];
      if (Math.random() < 0.06) f = f * 1.06; // 跑调一下（糙）
      var o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = f;
      lp.type = 'lowpass'; lp.frequency.value = 1400;
      env(g, nextNoteTime, 0.04, 0.045, 0.42);
      o.connect(lp); lp.connect(g); g.connect(c.destination);
      o.start(nextNoteTime); o.stop(nextNoteTime + 0.45);
      nextNoteTime += 0.42 + Math.random() * 0.05;
      noteIdx++;
    }
  }

  function startBgm() {
    if (bgmTimer) return;
    nextNoteTime = ac().currentTime + 0.1;
    scheduleBgm();
    bgmTimer = setInterval(scheduleBgm, 400);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  window.AudioSys = {
    init: function () { ac(); startBgm(); },
    boom: sfxBoom,
    ding: sfxDing,
    haqi: sfxHaqi,
    step: sfxStep,
    toggleMute: toggleMute,
    isMuted: function () { return muted; }
  };
})();
