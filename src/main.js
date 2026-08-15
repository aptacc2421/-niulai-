/* ============================================================
 * 直立牛平原 M1 —— 主程序
 * 镜头高度 = 站立值 / 草浪蛇影预告 / 手搓物理 / 导演模式
 * ============================================================ */
(function () {
  'use strict';

  var loadingEl = document.getElementById('loading');
  var loadingText = document.getElementById('loading-text');
  var loadingFill = document.getElementById('loading-fill');
  var titleEl = document.getElementById('title');
  var startBtn = document.getElementById('start-btn');
  var hudEl = document.getElementById('hud');
  var promptEl = document.getElementById('prompt');

  var G = {
    scene: null, camera: null, renderer: null,
    state: { stand: 10, cards: [], tickets: 0, saveJoked: false },
    npcMeshes: {}
  };
  window.Game = G;

  var SAVE_KEY = 'zhili_niu_m1_v1';

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && typeof d.stand === 'number') G.state = d;
      }
    } catch (e) {}
  }
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(G.state));
      if (!G.state.saveJoked) {
        G.state.saveJoked = true;
        window.Dialogue.toast('正在保存……保存失败（导演说不用保存，手搓就行）');
      }
    } catch (e) {}
  }

  /* ---------------- 场景 ---------------- */
  G.scene = new THREE.Scene();
  G.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 300);
  G.renderer = new THREE.WebGLRenderer({ antialias: true });
  G.renderer.setSize(window.innerWidth, window.innerHeight);
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.body.appendChild(G.renderer.domElement);

  G.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x7a9e6a, 1.0));
  var sunLight = new THREE.DirectionalLight(0xfff2cc, 0.85);
  sunLight.position.set(20, 30, 10);
  G.scene.add(sunLight);

  var world = window.buildWorld(G.scene);
  var B = window.Data.WORLD.bound;

  /* ---------------- 主角牛来（爬行牛） ---------------- */
  var player = window.makeCow({ upright: false, crawl: true, seed: 7, colors: { body: 0xa86a3a, patch: 0xe8dcc8 }, horns: true });
  player.position.set(0, 0, 12);
  G.scene.add(player);
  G.player = player; // 调试/测试用

  /* ---------------- NPC ---------------- */
  var npcs = []; // { def, mesh, kind, talked }
  window.Data.NPCS.forEach(function (def) {
    var mesh;
    if (def.kind === 'cat') mesh = window.makeCat({ seed: def.seed, colors: def.colors, scale: def.scale });
    else mesh = window.makeCow({ upright: def.upright, crawl: def.crawl, seed: def.seed, colors: def.colors, scale: def.scale, horns: def.id === 'mama' });
    mesh.position.set(def.pos[0], 0, def.pos[1]);
    mesh.rotation.y = def.rot || 0;
    G.scene.add(mesh);
    G.npcMeshes[def.id] = mesh;
    npcs.push({ def: def, mesh: mesh, talked: false });
  });

  // 路人牛（游荡，可反复对话）
  var passerby = window.makeCow({ upright: true, crawl: false, seed: 99, colors: { body: 0x9a8a7a, patch: 0x6a5a4a } });
  passerby.position.set(-3, 0, -5);
  G.scene.add(passerby);
  var passerbyState = { target: null, wait: 0 };

  /* ---------------- 输入 ---------------- */
  var keys = {};
  var codexOpen = false;
  window.addEventListener('keydown', function (e) {
    if (['Tab', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
      if (window.Dialogue.isActive()) window.Dialogue.advance();
      else interact();
    }
    if (e.key === 'Tab') {
      if (window.Dialogue.codexOpen()) window.Dialogue.closeCodex();
      else window.Dialogue.openCodex();
    }
    if (e.key === 'Escape') window.Dialogue.closeCodex();
    if (e.key === 'm' || e.key === 'M') toggleDirectorMode();
    if (e.key === 'k' || e.key === 'K') {
      var muted = window.AudioSys.toggleMute();
      window.Dialogue.toast(muted ? '已静音（牛也不叫了）' : '已开音（牛的哞声回来了）');
    }
    if (e.key === 'f' || e.key === 'F') window.AudioSys.boom();
  });
  window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('resize', function () {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------- 交互 ---------------- */
  function nearestInteractable() {
    var best = null, bestD = 1.9;
    npcs.forEach(function (n) {
      var d = n.mesh.position.distanceTo(player.position);
      if (d < bestD) { bestD = d; best = { kind: 'npc', ref: n }; }
    });
    var dp = passerby.position.distanceTo(player.position);
    if (dp < bestD) best = { kind: 'npc', ref: { def: { name: '路人牛', lines: null }, mesh: passerby, talked: true } };
    return best;
  }

  function interact() {
    if (window.Dialogue.isActive()) return;
    var it = nearestInteractable();
    if (!it) return;
    var ref = it.ref;
    if (it.kind === 'npc' && !ref.def.lines) {
      // 路人牛随机语录
      var lines = window.Data.PASSERBY_LINES.map(function (txt) { return { who: 'passerby', whoName: '路人牛', text: txt }; });
      ref.def = { name: '路人牛', lines: lines };
    }
    // 耄耋醒来
    if (ref.def.id === 'maodie') ref.mesh.userData.wake();
    window.Dialogue.show(ref.def, function () {
      // 结算：取最后一条带奖励的
      var cardId = null, stand = 0;
      (ref.def.lines || []).forEach(function (ln) {
        if (ln.card) cardId = ln.card;
        if (ln.stand) stand = Math.max(stand, ln.stand);
      });
      if (cardId) {
        var card = null;
        window.Data.CARDS.forEach(function (c) { if (c.id === cardId) card = c; });
        if (card && G.state.cards.indexOf(card.id) < 0) {
          G.state.cards.push(card.id);
          G.state.stand += card.stand;
          window.AudioSys.ding();
          window.Dialogue.cardFly(ref.mesh.userData.getMouthPos(), card.name);
          window.Dialogue.toast('获得语录卡「' + card.name + '」站立值 +' + card.stand);
        }
      } else if (stand > 0) {
        G.state.stand += stand;
        window.Dialogue.toast('站立值 +' + stand);
      }
      window.Dialogue.updateHud();
      save();
    });
  }

  /* ---------------- 导演模式（M：线稿） ---------------- */
  var directorMode = false;
  function toggleDirectorMode() {
    directorMode = !directorMode;
    G.scene.traverse(function (o) {
      if (o.isMesh && o.material && o.material.wireframe !== undefined) {
        o.material.wireframe = directorMode;
      }
    });
    window.Dialogue.toast(directorMode ? '导演模式：全部变线稿（手搓彩蛋）' : '退出导演模式');
  }

  /* ---------------- 手搓物理 ---------------- */
  var wobbleTimer = 2 + Math.random() * 5;
  var wobbleAmp = 0;
  var tripTimer = 0, tripping = 0, tripDir = 1;

  function updatePhysics(dt, t) {
    wobbleTimer -= dt;
    if (wobbleTimer <= 0) {
      wobbleTimer = 3 + Math.random() * 5;
      wobbleAmp = 0.25 + Math.random() * 0.3;
    }
    if (tripping > 0) {
      tripping -= dt;
      return 0; // 平地摔：不能动
    }
    if (G.state.stand < 30) {
      tripTimer -= dt;
      if (tripTimer <= 0) {
        tripTimer = 1.1 + Math.random() * 1.6;
        if (Math.random() < 0.35) {
          tripping = 0.7;
          tripDir = Math.random() < 0.5 ? 1 : -1;
          window.Dialogue.toast('牛生艰难，但不致命');
          window.AudioSys.boom();
        }
      }
    }
    return 1;
  }

  /* ---------------- 主循环 ---------------- */
  var clock = new THREE.Clock();
  var facing = 0;

  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    var canMove = updatePhysics(dt, t) && !window.Dialogue.isActive() && !window.Dialogue.codexOpen();

    // 移动
    var dx = 0, dz = 0;
    if (canMove) {
      if (keys['w'] || keys['arrowup']) dz -= 1;
      if (keys['s'] || keys['arrowdown']) dz += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
    }
    var moving = dx !== 0 || dz !== 0;
    if (moving) {
      var len = Math.sqrt(dx * dx + dz * dz);
      var speed = 3.4 * (1 + Math.sin(t * 0.7) * wobbleAmp); // 速度随机波动（糙）
      if (G.state.stand >= 66) speed *= 1.25;
      player.position.x += (dx / len) * speed * dt;
      player.position.z += (dz / len) * speed * dt;
      var target = Math.atan2(dx, dz);
      var diff = target - facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facing += diff * 8 * dt;
      player.rotation.y = facing;
      if (Math.random() < dt * 2.2) window.AudioSys.step();
    }
    // 边界（贴图海在界外）
    player.position.x = Math.max(-B, Math.min(B, player.position.x));
    player.position.z = Math.max(-B, Math.min(B, player.position.z));

    // 动画
    player.userData.update(t, moving, 2.2);
    npcs.forEach(function (n) {
      n.mesh.userData.update(t, false, 0);
    });
    passerby.userData.update(t, true, 1.4);
    updatePasserby(dt);

    // 草票拾取
    world.tickets.forEach(function (tk) {
      if (tk.userData.taken) return;
      if (tk.position.distanceTo(player.position) < 1.15) {
        tk.userData.taken = true;
        tk.visible = false;
        G.state.tickets++;
        window.AudioSys.ding();
        window.Dialogue.toast('捡到草票 +1（买票用，M2 开放）');
        window.Dialogue.updateHud();
        save();
      }
    });

    // 相机：镜头高度 = 站立值
    var camH = 0.5 + (G.state.stand / 100) * 1.75;
    var camDist = 6.2;
    var camX = player.position.x - Math.sin(facing) * camDist;
    var camZ = player.position.z - Math.cos(facing) * camDist;
    camX += Math.sin(t * 3.1) * 0.02; camZ += Math.cos(t * 2.7) * 0.02; // 手持抖动
    var roll = tripping > 0 ? tripDir * 0.5 * (tripping / 0.7) : 0;
    G.camera.position.set(camX, camH, camZ);
    G.camera.lookAt(player.position.x, 1.0, player.position.z);
    G.camera.rotation.z += roll;

    // 交互提示
    if (canMove) {
      var it = nearestInteractable();
      if (it) {
        var nm = it.ref.mesh.userData && it.ref.def ? it.ref.def.name : '路人牛';
        promptEl.innerHTML = '按 <b>E</b> 与 ' + nm + ' 对话';
        promptEl.classList.remove('hidden');
      } else promptEl.classList.add('hidden');
    } else promptEl.classList.add('hidden');

    world.update(t);
    window.Dialogue.update();
    G.renderer.render(G.scene, G.camera);
  }

  function updatePasserby(dt) {
    var st = passerbyState;
    st.wait -= dt;
    if (!st.target) {
      st.target = new THREE.Vector3((Math.random() * 2 - 1) * (B - 4), 0, (Math.random() * 2 - 1) * (B - 4));
      st.wait = 0;
    }
    if (st.wait <= 0) {
      var to = new THREE.Vector3().subVectors(st.target, passerby.position);
      if (to.length() < 0.5) { st.target = null; st.wait = 1.5 + Math.random() * 3; }
      else {
        to.normalize();
        passerby.position.addScaledVector(to, 1.3 * dt);
        passerby.rotation.y = Math.atan2(to.x, to.z);
      }
    }
  }

  /* ---------------- 加载 & 标题 ---------------- */
  var loadPct = 0;
  var loadTimer = setInterval(function () {
    loadPct += 8 + Math.random() * 14;
    if (loadPct >= 95 && loadPct < 100) { loadPct = 95; } // 卡 5% 梗
    loadPct = Math.min(100, loadPct);
    loadingFill.style.width = loadPct + '%';
    loadingText.textContent = loadPct >= 100 ? '加载完成——双击好评' : '正在加载牛… ' + Math.floor(loadPct) + '%';
    if (loadPct >= 100) {
      clearInterval(loadTimer);
      setTimeout(function () {
        loadingEl.classList.add('hidden');
        titleEl.classList.remove('hidden');
      }, 300);
    }
  }, 110);

  startBtn.addEventListener('click', function () {
    titleEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    window.AudioSys.init();
    window.Dialogue.updateHud();
    window.Dialogue.toast('M1 原型：去找牛们聊聊天，攒站立值');
  });

  loadSave();
  window.Dialogue.updateHud();
  loop();
})();
