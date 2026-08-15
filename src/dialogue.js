/* ============================================================
 * 直立牛平原 M1 —— 对话系统 + 语录卡 + 图鉴 + 提示
 * window.Dialogue = { show, isActive, toast, updateHud, openCodex, closeCodex, cardFly }
 * 依赖 window.Game = { scene, camera, renderer, state, stand }
 * ============================================================ */
(function () {
  'use strict';

  var dlgEl = document.getElementById('dialogue');
  var dlgName = document.getElementById('dlg-name');
  var dlgText = document.getElementById('dlg-text');
  var dlgPortrait = document.getElementById('dlg-portrait');
  var dlgHint = document.getElementById('dlg-hint');
  var toastEl = document.getElementById('toast');
  var codexEl = document.getElementById('codex');
  var codexList = document.getElementById('codex-list');
  var standFill = document.getElementById('stand-fill');
  var standNeed = document.getElementById('stand-need');
  var standTip = document.getElementById('stand-tip');
  var cardCount = document.getElementById('card-count');
  var ticketCount = document.getElementById('grass-ticket');
  var stubCount = document.getElementById('stub-count');

  var active = false;
  var lines = [];
  var lineIdx = 0;
  var typing = false;
  var typeTimer = null;
  var onEnd = null;
  var currentNpcName = '';
  var portraitMap = {
    player: '🐮',
    daoyan: '🐂',
    mama: '🐄',
    laoniu: '🐮',
    maodie: '🌫️',
    gumin: '📈',
    jiucai: '🥬',
    xuanxue: '🔮',
    jingli: '🎬'
  };
  var haqiPuffs = [];

  // ---- 错别字（粗糙美学） ----
  function applyTypo(text) {
    if (Math.random() > 1 / 18) return text;
    var pool = window.Data.TYPOS;
    var t = pool[(Math.random() * pool.length) | 0];
    return text.split(t.from).join(t.to);
  }

  function stopTyping() {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    typing = false;
  }

  function typeLine(text, done) {
    var i = 0;
    dlgText.textContent = '';
    typing = true;
    typeTimer = setInterval(function () {
      i++;
      dlgText.textContent = text.slice(0, i);
      if (i >= text.length) {
        stopTyping();
        done();
      }
    }, 28);
  }

  function haqiAt(worldPos) {
    var G = window.Game;
    if (!G) return;
    window.AudioSys.haqi();
    for (var i = 0; i < 6; i++) {
      var p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 })
      );
      p.position.copy(worldPos);
      p.userData.vx = (Math.random() - 0.5) * 0.5;
      p.userData.vy = 0.3 + Math.random() * 0.4;
      p.userData.vz = (Math.random() - 0.5) * 0.5;
      p.userData.life = 1;
      G.scene.add(p);
      haqiPuffs.push(p);
    }
  }

  function stepLine() {
    if (lineIdx >= lines.length) {
      finish();
      return;
    }
    var ln = lines[lineIdx];
    var who = ln.who === 'player' ? '牛来' : (ln.whoName || currentNpcName);
    dlgName.textContent = who;
    dlgPortrait.textContent = portraitMap[ln.who] || '🐮';
    dlgHint.textContent = typing ? '' : '按 E / 空格 继续';
    var text = applyTypo(ln.text);
    var G = window.Game;
    if (ln.haqi && G && G.npcMeshes && G.npcMeshes.maodie) {
      haqiAt(G.npcMeshes.maodie.userData.getMouthPos());
    }
    typeLine(text, function () {
      dlgHint.textContent = '按 E / 空格 继续';
    });
  }

  function finish() {
    stopTyping();
    active = false;
    dlgEl.classList.add('hidden');
    if (onEnd) {
      var cb = onEnd; onEnd = null;
      cb();
    }
  }

  window.Dialogue = {
    show: function (npc, endCb) {
      lines = npc.lines || [];
      currentNpcName = npc.name || '';
      lineIdx = 0;
      onEnd = endCb || null;
      active = true;
      dlgEl.classList.remove('hidden');
      stepLine();
    },
    advance: function () {
      if (!active) return;
      if (typing) { stopTyping(); dlgText.textContent = lines[lineIdx].text; return; }
      lineIdx++;
      stepLine();
    },
    isActive: function () { return active; },

    update: function () {
      if (!haqiPuffs.length) return;
      var G = window.Game;
      for (var i = haqiPuffs.length - 1; i >= 0; i--) {
        var p = haqiPuffs[i];
        p.position.x += p.userData.vx * 0.03;
        p.position.y += p.userData.vy * 0.03;
        p.position.z += p.userData.vz * 0.03;
        p.userData.life -= 0.016;
        p.material.opacity = Math.max(0, 0.65 * p.userData.life);
        p.scale.multiplyScalar(1.015);
        if (p.userData.life <= 0) {
          G.scene.remove(p);
          haqiPuffs.splice(i, 1);
        }
      }
    },

    toast: function (text) {
      toastEl.textContent = text;
      toastEl.style.opacity = 1;
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(function () { toastEl.style.opacity = 0; }, 2200);
    },

    // 弹幕（被蛇咬时："全网都在找妈妈"）
    danmaku: function (text) {
      var el = document.createElement('div');
      el.textContent = text;
      el.style.cssText = 'position:fixed;z-index:75;font-size:34px;font-weight:bold;color:#ffe89a;' +
        'text-shadow:2px 2px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;' +
        'left:100%;top:' + (60 + Math.random() * 120) + 'px;white-space:nowrap;pointer-events:none;';
      document.body.appendChild(el);
      var t0 = performance.now();
      function anim(now) {
        var k = Math.min(1, (now - t0) / 2400);
        el.style.left = (100 - k * 130) + '%';
        el.style.opacity = k > 0.85 ? (1 - (k - 0.85) / 0.15) : 1;
        if (k < 1) requestAnimationFrame(anim); else el.remove();
      }
      requestAnimationFrame(anim);
    },

    // 卡片从 3D 嘴部飞到 HUD 右上角
    cardFly: function (worldPos, cardName) {
      var G = window.Game;
      if (!G) return;
      var v = worldPos.clone().project(G.camera);
      var sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      var sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      var el = document.createElement('div');
      el.textContent = '「' + cardName + '」';
      el.style.cssText = 'position:fixed;z-index:70;color:#ffe89a;font-size:15px;' +
        'text-shadow:1px 1px 0 #000;background:rgba(20,20,32,.85);border:2px solid #ffd970;' +
        'padding:6px 12px;left:' + sx + 'px;top:' + sy + 'px;pointer-events:none;';
      document.body.appendChild(el);
      var t0 = performance.now();
      var dur = 750;
      function anim(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        el.style.left = (sx + (window.innerWidth - 120 - sx) * e) + 'px';
        el.style.top = (sy + (16 - sy) * e) + 'px';
        el.style.opacity = (1 - k * 0.9);
        if (k < 1) requestAnimationFrame(anim);
        else { el.remove(); window.Dialogue.updateHud(); }
      }
      requestAnimationFrame(anim);
      window.Dialogue.updateHud();
    },

    updateHud: function () {
      var G = window.Game;
      if (!G) return;
      var s = G.state;
      standFill.style.width = Math.min(100, s.stand) + '%';
      standNeed.textContent = Math.max(0, 100 - s.stand);
      cardCount.textContent = s.cards.length;
      ticketCount.textContent = s.tickets;
      stubCount.textContent = s.stubs ? s.stubs.length : 0;
      if (s.stand >= 100) standTip.textContent = '你站起来了！';
      else if (s.stand >= 66) standTip.textContent = '快站起来了，镜头都高了';
      else if (s.stand >= 33) standTip.textContent = '半蹲了，能看到屋顶了';
      else standTip.textContent = '趴着走，草比牛高';
    },

    openCodex: function () {
      var s = window.Game.state;
      var byId = {};
      window.Data.CARDS.forEach(function (c) { byId[c.id] = c; });
      codexList.innerHTML = '';
      window.Data.CARDS.forEach(function (c) {
        var got = s.cards.indexOf(c.id) >= 0;
        var d = document.createElement('div');
        d.className = 'card-item' + (got ? '' : ' empty');
        if (got) {
          d.innerHTML = '<span class="cn">「' + c.name + '」</span><span class="ct">[' + c.type + ' · 站立+' + c.stand + ']</span>' +
            '<div class="cx">' + c.text + '</div>';
        } else {
          d.innerHTML = '？？？  ——还没听过的鸡汤';
        }
        codexList.appendChild(d);
      });
      codexEl.classList.remove('hidden');
    },
    closeCodex: function () {
      codexEl.classList.add('hidden');
    },
    codexOpen: function () {
      return !codexEl.classList.contains('hidden');
    }
  };
})();
