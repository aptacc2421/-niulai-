/* ============================================================
 * 直立牛平原 M3a —— 手机触屏控制
 * 左半屏：虚拟摇杆（移动）· 右半屏：拖动转视角
 * 按钮：对话 / 图鉴 / 导演 / 哞 / 静音
 * ============================================================ */
(function () {
  'use strict';

  var ui = document.getElementById('touch-ui');
  if (!ui) return;

  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!isTouch && window.innerWidth >= 700) return; // 只有触屏设备（或窄窗口）才启用

  var G = window.Game;
  var base = document.getElementById('joy-base');
  var knob = document.getElementById('joy-knob');
  var joy = { active: false, id: -1 };
  var orbit = { active: false, id: -1, lastX: 0, lastY: 0 };
  var HALF = window.innerWidth * 0.5;

  ui.classList.remove('hidden');
  document.body.classList.add('touch-mode');
  G.isOrbiting = function () { return orbit.active; };

  function setJoy(clientX, clientY) {
    var r = base.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = clientX - cx, dy = clientY - cy;
    var len = Math.sqrt(dx * dx + dy * dy);
    var max = r.width / 2 - 12;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    G.touchInput.x = dx / max;
    G.touchInput.z = -dy / max;   // 手指上推 = 前进
  }

  function resetJoy() {
    joy.active = false;
    knob.style.transform = 'translate(0,0)';
    base.style.opacity = 0.55;
    G.touchInput.x = 0;
    G.touchInput.z = 0;
  }

  function onTouchStart(t) {
    // 按钮/摇杆本体上的触摸不接管
    if (t.target && t.target.closest && t.target.closest('button, #joy-base, #joy-knob')) return;
    if (t.clientX < HALF && !joy.active) {
      var r = base.getBoundingClientRect();
      base.style.left = (t.clientX - r.width / 2) + 'px';
      base.style.top = (t.clientY - r.height / 2) + 'px';
      base.style.opacity = 1;
      joy.active = true; joy.id = t.identifier;
      setJoy(t.clientX, t.clientY);
    } else if (t.clientX >= HALF && !orbit.active) {
      orbit.active = true; orbit.id = t.identifier; orbit.lastX = t.clientX; orbit.lastY = t.clientY;
    }
  }

  document.addEventListener('touchstart', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) onTouchStart(e.changedTouches[i]);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (joy.active && t.identifier === joy.id) setJoy(t.clientX, t.clientY);
      if (orbit.active && t.identifier === orbit.id) {
        G.orbit(t.clientX - orbit.lastX, t.clientY - orbit.lastY);   // 水平转向 + 竖直俯仰
        orbit.lastX = t.clientX;
        orbit.lastY = t.clientY;
      }
    }
    e.preventDefault(); // 防止页面滚动
  }, { passive: false });

  function onTouchEnd(t) {
    if (joy.active && t.identifier === joy.id) resetJoy();
    if (orbit.active && t.identifier === orbit.id) orbit.active = false;
  }
  document.addEventListener('touchend', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) onTouchEnd(e.changedTouches[i]);
  }, { passive: true });
  document.addEventListener('touchcancel', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) onTouchEnd(e.changedTouches[i]);
  }, { passive: true });

  // 按钮
  document.getElementById('btn-interact').addEventListener('click', function () {
    if (window.Dialogue.isActive()) window.Dialogue.advance();
    else G.interact();
  });
  document.getElementById('btn-codex').addEventListener('click', function () {
    if (window.Dialogue.codexOpen()) window.Dialogue.closeCodex();
    else window.Dialogue.openCodex();
  });
  document.getElementById('btn-director').addEventListener('click', function () { G.toggleDirector(); });
  document.getElementById('btn-boom').addEventListener('click', function () { window.AudioSys.boom(); });
  var muteBtn = document.getElementById('btn-mute');
  muteBtn.addEventListener('click', function () {
    muteBtn.textContent = window.AudioSys.toggleMute() ? '🔇' : '🔊';
  });
})();
