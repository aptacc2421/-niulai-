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
    state: { stand: 10, cards: [], tickets: 0, shedSnake: 0, stubs: [], patternSeen: [], milk: 0, xiugouTalked: false, seatFixed: false, saveJoked: false },
    npcMeshes: {},
    touchInput: { x: 0, z: 0 }   // 手机摇杆输入（x=左右，z=前后）
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
    // 旧存档补默认字段
    G.state.stubs = G.state.stubs || [];
    G.state.patternSeen = G.state.patternSeen || [];
    G.state.shedSnake = G.state.shedSnake || 0;
    G.state.milk = G.state.milk || 0;
    G.state.xiugouTalked = G.state.xiugouTalked || false;
    G.state.seatFixed = G.state.seatFixed || false;
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
  G.save = save;
  // 触屏/外部接口（手机控制层调用）
  G.interact = function () { interact(); };
  G.orbit = function (dx) { camYaw += dx * 0.005; };
  G.toggleDirector = function () { toggleDirectorMode(); };

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

  // 游荡牛（可反复对话）：镇上 1 头 + K 线交易场 1 头
  var wanderers = [
    { mesh: null, home: [-3, -5], bounds: [-B, B, -B, B] },
    { mesh: null, home: [42, 2], bounds: [30, 60, -14, 14] }
  ];
  wanderers.forEach(function (w) {
    w.mesh = window.makeCow({
      upright: true, crawl: false,
      seed: 99 + Math.abs(w.home[0]),
      colors: w.home[0] > 0 ? { body: 0xb8a888, patch: 0x7a6a5a } : { body: 0x9a8a7a, patch: 0x6a5a4a }
    });
    w.mesh.position.set(w.home[0], 0, w.home[1]);
    w.state = { target: null, wait: 0 };
    G.scene.add(w.mesh);
  });

  /* ---------------- 草浪区：蛇（M2b 蛇追戏） ---------------- */
  var GA = window.Data.WORLD.grassArea;
  var snake = window.makeSnake();
  snake.position.set(window.Data.WORLD.snakeSpawn[0], 0, window.Data.WORLD.snakeSpawn[1]);
  G.scene.add(snake);
  var snakeState = {
    phase: 'idle', facing: 0, stuckT: 0, scareT: 0, coolT: 0,
    escapedOnce: false, caughtOnce: false, seqT: -1,
    mom: null, momStepT: 0, momLeaveT: 0, sticker: null, stickerT: 0
  };
  G.snake = snake;
  G.snakeState = snakeState;

  /* ---------------- 奇奇怪怪生物团（M2d） ---------------- */
  var creatures = [];
  window.Data.CREATURES.forEach(function (def) {
    var cm = window.makeCreature(def.kind, def.pos[0] * 7 + def.pos[1] * 13);
    cm.position.set(def.pos[0], 0, def.pos[1]);
    G.scene.add(cm);
    if (def.id === 'haqimiao') cm.visible = false; // 隐藏怪
    creatures.push({ def: def, mesh: cm });
  });
  G.creatures = creatures;
  var hiddenRevealed = false;
  var naiwaFollower = false;
  G.naiwaFollower = function () { return naiwaFollower; };
  var shakeT = 0;
  // 隐藏怪解锁检测：用 setInterval（rAF 被节流/后台标签页时依然生效）
  setInterval(function () {
    if (hiddenRevealed) return;
    var allCreatures = true;
    window.Data.CREATURE_CARD_IDS.forEach(function (cid) {
      if (G.state.cards.indexOf(cid) < 0) allCreatures = false;
    });
    if (allCreatures) {
      hiddenRevealed = true;
      creatures.forEach(function (cr) {
        if (cr.def.id === 'haqimiao') {
          cr.mesh.visible = true;
          window.AudioSys.haqi();
          window.Dialogue.toast('网线管里传来一阵哈气声……一个圆滚滚的身影钻了出来');
        }
      });
    }
  }, 400);

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
    if (e.key === 'Escape') {
      if (window.TicketUI.isOpen()) window.TicketUI.close();
      else window.Dialogue.closeCodex();
    }
    if (e.key === 'm' || e.key === 'M') toggleDirectorMode();
    if (e.key === 'k' || e.key === 'K') {
      var muted = window.AudioSys.toggleMute();
      window.Dialogue.toast(muted ? '已静音（牛也不叫了）' : '已开音（牛的哞声回来了）');
    }
    if (e.key === 'f' || e.key === 'F') window.AudioSys.boom();
    if (e.key === 'q' || e.key === 'Q') camYaw -= 0.35;
    if (e.key === 'r' || e.key === 'R') camYaw += 0.35;
  });
  window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('resize', function () {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 鼠标右键拖拽旋转视角
  var orbitDrag = false, orbitLastX = 0;
  G.renderer.domElement.addEventListener('mousedown', function (e) {
    if (e.button === 2) { orbitDrag = true; orbitLastX = e.clientX; }
  });
  window.addEventListener('mousemove', function (e) {
    if (orbitDrag) {
      camYaw += (e.clientX - orbitLastX) * 0.005;
      orbitLastX = e.clientX;
    }
  });
  window.addEventListener('mouseup', function (e) {
    if (e.button === 2) orbitDrag = false;
  });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------------- 交互 ---------------- */
  function nearestInteractable() {
    // 售票机优先（M2c 选座购票）
    if (world.machinePos && world.machinePos.distanceTo(player.position) < 2.4) {
      return { kind: 'machine', ref: null };
    }
    // 修勾的坏座位（M2d）
    if (G.state.xiugouTalked && !G.state.seatFixed && world.brokenSeat &&
        world.brokenSeat.pos.distanceTo(player.position) < 1.9) {
      return { kind: 'seat', ref: null };
    }
    var best = null, bestD = 1.9;
    // 生物团（用 XZ 距离，屋顶的猪猪侠也能对话）
    creatures.forEach(function (cr) {
      if (!cr.mesh.visible) return;
      var dx = cr.mesh.position.x - player.position.x;
      var dz = cr.mesh.position.z - player.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) { bestD = d; best = { kind: 'creature', ref: cr }; }
    });
    npcs.forEach(function (n) {
      var d = n.mesh.position.distanceTo(player.position);
      if (d < bestD) { bestD = d; best = { kind: 'npc', ref: n }; }
    });
    wanderers.forEach(function (w) {
      var d = w.mesh.position.distanceTo(player.position);
      if (d < bestD) { bestD = d; best = { kind: 'npc', ref: { def: { name: '路人牛', lines: null }, mesh: w.mesh } }; }
    });
    return best;
  }

  // 生物对话（特殊逻辑：修勾修座 / 奶娃跟班 / 尖叫鸡特效）
  function buildCreatureLines(cr) {
    var card = null;
    window.Data.CARDS.forEach(function (c) { if (c.id === cr.def.card) card = c; });
    var cc = cr.def.id;
    var cardLine = function (extra) {
      return { who: cc, text: (extra || card.text), card: cr.def.card, stand: card ? card.stand : 0 };
    };
    if (cc === 'xiugou') {
      if (G.state.seatFixed) return [
        { who: 'player', text: '座位修好了！' },
        cardLine('呜……谢谢你把我的座位修好了。')
      ];
      return [
        { who: 'player', text: '小狗，你怎么哭成这样？' },
        { who: 'xiugou', text: '呜……我的座位坏了，就在那边，第三个，歪的那个……' }
      ];
    }
    if (cc === 'naiwa') {
      return [
        { who: 'player', text: '你怎么笑成这样？' },
        cardLine(naiwaFollower ? '哈哈哈哈……我在你后面笑了好久了！' : card.text)
      ];
    }
    if (cc === 'haqimiao') {
      return [
        { who: 'player', text: '（网线管里传来哈气声）……你是谁？' },
        { who: 'haqimiao', haqi: true, text: '哈——……' },
        { who: 'player', text: '……' },
        cardLine('哈——（它跟耄耋学会了）')
      ];
    }
    if (cc === 'jianjiaoji') return [
      { who: 'player', text: '这鸡……真的能按吗？' },
      cardLine('（按钮就在嘴上）')
    ];
    if (cc === 'kapybara') return [
      { who: 'player', text: '你泡在水里不冷吗？' },
      cardLine()
    ];
    if (cc === 'caigou') return [
      { who: 'player', text: '你……是棵菜？' },
      cardLine()
    ];
    if (cc === 'malou') return [
      { who: 'player', text: '你搬的砖是给谁的？' },
      cardLine()
    ];
    if (cc === 'lvouyu') return [
      { who: 'player', text: '你的头套能摘下来吗？' },
      cardLine()
    ];
    if (cc === 'zhuzhu') return [
      { who: 'player', text: '猪猪侠？你怎么在这？' },
      cardLine()
    ];
    if (cc === 'huahua') return [
      { who: 'player', text: '花花！看这边！' },
      cardLine()
    ];
    return [
      { who: 'player', text: '……你好？' },
      cardLine()
    ];
  }

  function interact() {
    if (window.Dialogue.isActive()) return;
    var it = nearestInteractable();
    if (!it) return;
    if (it.kind === 'machine') {
      window.TicketUI.open();
      return;
    }
    if (it.kind === 'seat') {
      // 修好修勾的座位
      G.state.seatFixed = true;
      window.AudioSys.ding();
      window.Dialogue.toast('你把歪掉的座位掰正了（修好了）');
      save();
      return;
    }
    if (it.kind === 'creature') {
      var cr = it.ref;
      if (cr.def.id === 'xiugou') G.state.xiugouTalked = true;
      // 尖叫鸡：按下去 → 全屏鸡叫 + 周围牛弹跳 + 镜头抖
      if (cr.def.id === 'jianjiaoji') {
        window.AudioSys.scream();
        shakeT = 0.5;
        window.Dialogue.toast('啊————！！！（周围牛全部弹跳 1 米）');
        [npcs, wanderers, creatures].forEach(function (list) {
          list.forEach(function (o) {
            if (o.mesh.position.distanceTo(player.position) < 8) {
              o.mesh.userData.bounceT = 0.5;
            }
          });
        });
      }
      // 奶娃：有 5 瓶奶 → 跟班
      if (cr.def.id === 'naiwa' && G.state.milk >= 5 && !naiwaFollower) {
        G.state.milk -= 5;
        naiwaFollower = true;
        window.Dialogue.toast('奶娃喝饱了，决定跟着你！（成就：带娃上班）');
      }
      ref = { def: { id: cr.def.id, name: cr.def.name, lines: buildCreatureLines(cr) }, mesh: cr.mesh };
    } else {
      var ref = it.ref;
    }
    if (it.kind === 'npc' && !ref.def.lines) {
      // 路人牛随机语录
      var lines = window.Data.PASSERBY_LINES.map(function (txt) { return { who: 'passerby', whoName: '路人牛', text: txt }; });
      ref.def = { name: '路人牛', lines: lines };
    }
    // 玄学牛：有蛇蜕皮就换卡，没有就闲聊
    if (ref.def.id === 'xuanxue') {
      if (G.state.shedSnake > 0) {
        G.state.shedSnake--;
        ref.def.lines = [
          { who: 'player', text: '大师，我捡到一条蛇蜕的皮……' },
          { who: 'xuanxue', text: '（掐指一算）蛇都脱皮了，说明春天不远了。这皮，我收下了。', card: 'xuanxue', stand: 5 }
        ];
      } else {
        ref.def.lines = [
          { who: 'player', text: '大师，牛市什么时候来？' },
          { who: 'xuanxue', text: '天机不可泄露。但你可以先把草票攒着。', stand: 2 }
        ];
      }
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

  // 尖叫鸡把周围牛弹起来（1 米）
  function bounceEase(mesh, dt) {
    if (mesh.userData.bounceT > 0) {
      mesh.userData.bounceT -= dt;
      var k = Math.max(0, mesh.userData.bounceT) / 0.5;
      mesh.position.y = Math.sin((1 - k) * Math.PI) * 1.2;
      if (mesh.userData.bounceT <= 0) mesh.position.y = 0;
    }
  }

  function updatePhysics(dt, t) {
    wobbleTimer -= dt;
    if (wobbleTimer <= 0) {
      wobbleTimer = 3 + Math.random() * 5;
      wobbleAmp = 0.05 + Math.random() * 0.04; // 微弱速度波动（手感优先，保留一点糙）
    }
    if (tripping > 0) {
      tripping -= dt;
      return 0; // 平地摔：不能动
    }
    if (G.state.stand < 30) {
      tripTimer -= dt;
      if (tripTimer <= 0) {
        tripTimer = 2.5 + Math.random() * 2.5;
        if (Math.random() < 0.12) {
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
  var camYaw = 0;      // 镜头朝向（鼠标右键 / Q / R 旋转）
  var curSpeed = 0;    // 当前速度（加减速平滑）

  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    var canMove = updatePhysics(dt, t) && !window.Dialogue.isActive() && !window.Dialogue.codexOpen() && !window.TicketUI.isOpen() && snakeState.seqT < 0;

    // 移动：镜头相对（W=往屏幕里走，A=屏幕左，D=屏幕右）
    var ix = 0, iz = 0;
    if (canMove) {
      if (keys['w'] || keys['arrowup']) iz += 1;
      if (keys['s'] || keys['arrowdown']) iz -= 1;
      if (keys['a'] || keys['arrowleft']) ix -= 1;
      if (keys['d'] || keys['arrowright']) ix += 1;
      if (G.touchInput) { ix += G.touchInput.x; iz += G.touchInput.z; } // 手机摇杆
    }
    // 相机相对方向向量
    var fwd = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
    var rgt = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    var move = new THREE.Vector3().addScaledVector(fwd, iz).addScaledVector(rgt, ix);
    var moving = move.lengthSq() > 0;
    if (moving) {
      move.normalize();
      var maxSpeed = 3.4 * (1 + Math.sin(t * 0.7) * wobbleAmp); // 微弱速度波动（保留一点糙）
      if (G.state.stand >= 66) maxSpeed *= 1.25;
      curSpeed += (maxSpeed - curSpeed) * Math.min(1, dt * 7);   // 加速平滑
      player.position.addScaledVector(move, curSpeed * dt);
      var target = Math.atan2(move.x, move.z);
      var diff = target - facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facing += diff * Math.min(1, dt * 10);
      player.rotation.y = facing;
      if (Math.random() < dt * 2.2) window.AudioSys.step();
    } else {
      curSpeed *= Math.max(0, 1 - dt * 6);                        // 松手减速
    }
    // 边界（东边通向 K 线交易场，可走更远）
    player.position.x = Math.max(-B, Math.min(B + 36, player.position.x));
    player.position.z = Math.max(-B, Math.min(B, player.position.z));

    // 动画
    player.userData.update(t, moving, 2.2);
    npcs.forEach(function (n) {
      n.mesh.userData.update(t, false, 0);
      bounceEase(n.mesh, dt);
    });
    wanderers.forEach(function (w) {
      w.mesh.userData.update(t, true, 1.4);
      bounceEase(w.mesh, dt);
    });
    // 生物团：动画 / 奶娃跟班 / 弹跳
    creatures.forEach(function (cr) {
      if (naiwaFollower && cr.def.id === 'naiwa') {
        var target = new THREE.Vector3(player.position.x - 1.1, 0, player.position.z + 0.9);
        cr.mesh.position.lerp(target, 1 - Math.pow(0.001, dt));
        cr.mesh.rotation.y = Math.atan2(player.position.x - cr.mesh.position.x, player.position.z - cr.mesh.position.z);
        cr.mesh.userData.update(t, 'follow');
      } else {
        cr.mesh.userData.update(t);
      }
      bounceEase(cr.mesh, dt);
    });
    updatePasserby(dt);
    updateSnake(dt, t);
    if (shakeT > 0) shakeT -= dt;
    // 草票拾取
    world.tickets.forEach(function (tk) {
      if (tk.userData.taken) return;
      if (tk.position.distanceTo(player.position) < 1.15) {
        tk.userData.taken = true;
        tk.visible = false;
        G.state.tickets++;
        window.AudioSys.ding();
        window.Dialogue.toast('捡到草票 +1（电影院买票用）');
        window.Dialogue.updateHud();
        save();
      }
    });
    // 奶瓶拾取（喂奶娃）
    if (world.milkBottles) {
      world.milkBottles.forEach(function (mb) {
        if (mb.taken) return;
        if (mb.bottle.position.distanceTo(player.position) < 1.15) {
          mb.taken = true;
          mb.bottle.visible = false;
          mb.cap.visible = false;
          G.state.milk = (G.state.milk || 0) + 1;
          window.AudioSys.ding();
          window.Dialogue.toast('奶瓶 +1（给奶娃喝，还差 ' + Math.max(0, 5 - G.state.milk) + ' 瓶）');
          save();
        }
      });
    }
    // 蛇蜕皮拾取（拿给玄学牛换卡）
    if (world.shed && !world.shed.userData.taken) {
      if (world.shed.position.distanceTo(player.position) < 1.15) {
        world.shed.userData.taken = true;
        world.shed.visible = false;
        G.state.shedSnake = (G.state.shedSnake || 0) + 1;
        window.AudioSys.ding();
        window.Dialogue.toast('蛇蜕皮 +1（拿去给玄学牛换卡）');
        save();
      }
    }

    // 相机：镜头高度 = 站立值；镜头相对 camYaw 平滑跟随（不再被朝向甩来甩去）
    var camH = 0.5 + (G.state.stand / 100) * 1.75;
    var camDist = 6.5;
    var camX = player.position.x - Math.sin(camYaw) * camDist;
    var camZ = player.position.z - Math.cos(camYaw) * camDist;
    camX += Math.sin(t * 3.1) * 0.02; camZ += Math.cos(t * 2.7) * 0.02; // 手持抖动
    if (shakeT > 0) { camX += (Math.random() - 0.5) * 0.5; camZ += (Math.random() - 0.5) * 0.5; } // 尖叫鸡镜头抖
    var lerpK = 1 - Math.pow(0.0001, dt);
    G.camera.position.x += (camX - G.camera.position.x) * lerpK;
    G.camera.position.y += (camH - G.camera.position.y) * lerpK;
    G.camera.position.z += (camZ - G.camera.position.z) * lerpK;
    var roll = tripping > 0 ? tripDir * 0.5 * (tripping / 0.7) : 0;
    G.camera.lookAt(player.position.x, 1.0, player.position.z);
    G.camera.rotation.z += roll;

    // 交互提示
    if (canMove) {
      var it = nearestInteractable();
      if (it) {
        if (it.kind === 'machine') {
          promptEl.innerHTML = '按 <b>E</b> 购票（5 草票/张）';
        } else if (it.kind === 'seat') {
          promptEl.innerHTML = '按 <b>E</b> 修座位（掰正它）';
        } else {
          var nm = it.ref.def ? (it.ref.def.name || '路人牛') : '路人牛';
          promptEl.innerHTML = '按 <b>E</b> 与 ' + nm + ' 对话';
        }
        promptEl.classList.remove('hidden');
      } else promptEl.classList.add('hidden');
    } else promptEl.classList.add('hidden');

    world.update(t);
    window.Dialogue.update();
    G.renderer.render(G.scene, G.camera);
  }

  function updatePasserby(dt) {
    wanderers.forEach(function (w) {
      var st = w.state;
      st.wait -= dt;
      if (!st.target) {
        var bx = w.bounds;
        st.target = new THREE.Vector3(bx[0] + Math.random() * (bx[1] - bx[0]), 0, bx[2] + Math.random() * (bx[3] - bx[2]));
        st.wait = 0;
      }
      if (st.wait <= 0) {
        var to = new THREE.Vector3().subVectors(st.target, w.mesh.position);
        if (to.length() < 0.5) { st.target = null; st.wait = 1.5 + Math.random() * 3; }
        else {
          to.normalize();
          w.mesh.position.addScaledVector(to, 1.3 * dt);
          w.mesh.rotation.y = Math.atan2(to.x, to.z);
        }
      }
    });
  }

  /* ---------------- M2b 蛇追戏 ---------------- */
  function awardCard(cardId, fromMesh) {
    var card = null;
    window.Data.CARDS.forEach(function (c) { if (c.id === cardId) card = c; });
    if (!card || G.state.cards.indexOf(card.id) >= 0) return;
    G.state.cards.push(card.id);
    G.state.stand += card.stand;
    window.AudioSys.ding();
    var mouth = (fromMesh && fromMesh.userData.getMouthPos)
      ? fromMesh.userData.getMouthPos()
      : new THREE.Vector3(player.position.x, 1.2, player.position.z);
    window.Dialogue.cardFly(mouth, card.name);
    window.Dialogue.toast('获得语录卡「' + card.name + '」站立值 +' + card.stand);
    window.Dialogue.updateHud();
    save();
  }

  function startSnakeBite() {
    snakeState.seqT = 0;
    G.state.stand = Math.max(0, G.state.stand - 5);
    window.AudioSys.momCry();
    window.Dialogue.danmaku('全网都在找妈妈');
    window.Dialogue.toast('被蛇咬了一口！站立值 -5（牛生艰难，但不致命）');
    window.Dialogue.updateHud();
    save();
  }

  function updateSnake(dt, t) {
    snake.userData.update(t, snakeState.phase);

    // 创可贴倒计时
    if (snakeState.sticker) {
      snakeState.stickerT -= dt;
      if (snakeState.stickerT <= 0) { player.remove(snakeState.sticker); snakeState.sticker = null; }
    }
    if (snakeState.coolT > 0) snakeState.coolT -= dt;

    // ---- 被咬后的妈妈救场序列 ----
    if (snakeState.seqT >= 0) {
      snakeState.seqT += dt;
      if (snakeState.seqT < 2.2) {
        if (!snakeState.mom) {
          snakeState.mom = window.makeCow({ upright: true, crawl: false, seed: 23, colors: { body: 0xe8dcc8, patch: 0xc8a06a } });
          snakeState.mom.position.set(10, 0, -18);
          G.scene.add(snakeState.mom);
        }
        var mom = snakeState.mom;
        var to = new THREE.Vector3(player.position.x, 0, player.position.z).sub(mom.position);
        if (to.length() > 1.2) {
          to.normalize();
          mom.position.addScaledVector(to, 9 * dt);
          mom.rotation.y = Math.atan2(to.x, to.z);
          snakeState.momStepT -= dt;
          if (snakeState.momStepT <= 0) {
            snakeState.momStepT = 0.22;
            window.AudioSys.bigStep(0.12);
          }
        } else {
          // 妈妈到场：蛇怂、贴创可贴、牛来回入口
          snakeState.phase = 'scared';
          snakeState.coolT = 5;
          window.Dialogue.toast('蛇：我错了……我妈也这样。');
          window.Dialogue.toast('妈妈牛：被蛇咬了？来，妈妈看看。（站立值 +5）');
          G.state.stand += 5;
          var sticker = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.04),
            new THREE.MeshBasicMaterial({ color: 0xe8dcc8 }));
          sticker.position.set(0, 1.15, 0.4);
          player.add(sticker);
          snakeState.sticker = sticker;
          snakeState.stickerT = 5;
          player.position.set(window.Data.WORLD.grassEnter[0], 0, window.Data.WORLD.grassEnter[1]);
          if (!snakeState.caughtOnce) {
            snakeState.caughtOnce = true;
            window.Dialogue.toast('成就解锁：「叫妈妈」');
          }
          snakeState.momLeaveT = 2.5;
          window.Dialogue.updateHud();
          save();
        }
      } else if (snakeState.seqT < 5.0) {
        if (snakeState.mom) {
          snakeState.momLeaveT -= dt;
          if (snakeState.momLeaveT <= 0) {
            G.scene.remove(snakeState.mom);
            snakeState.mom = null;
          }
        }
      } else {
        snakeState.seqT = -1; // 序列结束
      }
      return;
    }

    var px = player.position.x, pz = player.position.z;
    var inGrass = px > GA.x1 && px < GA.x2 && pz > GA.z1 && pz < GA.z2;

    // 进入草浪区 → 蛇开始追
    if (snakeState.phase === 'idle' && inGrass && snakeState.coolT <= 0) {
      snakeState.phase = 'chase';
      window.Dialogue.toast('🐍 蛇来了！快跑！');
      window.AudioSys.haqi();
    }

    if (snakeState.phase === 'chase') {
      var dx = px - snake.position.x, dz = pz - snake.position.z;
      var targetF = Math.atan2(dx, dz);
      var df = targetF - snakeState.facing;
      while (df > Math.PI) df -= Math.PI * 2;
      while (df < -Math.PI) df += Math.PI * 2;
      snakeState.facing += Math.max(-1.2 * dt, Math.min(1.2 * dt, df)); // 转向受限（手搓物理）
      snake.rotation.y = snakeState.facing;
      snake.position.x += Math.sin(snakeState.facing) * 4.3 * dt;
      snake.position.z += Math.cos(snakeState.facing) * 4.3 * dt;
      // 撞草浪边界卡住 3 秒（不会转弯）
      if (snake.position.x < GA.x1 || snake.position.x > GA.x2 ||
          snake.position.z < GA.z1 || snake.position.z > GA.z2) {
        snakeState.phase = 'stuck';
        snakeState.stuckT = 3;
      }
      // 咬到
      if (Math.abs(dx) < 1.4 && Math.abs(dz) < 1.4) startSnakeBite();
    } else if (snakeState.phase === 'stuck') {
      snakeState.stuckT -= dt;
      if (snakeState.stuckT <= 0) snakeState.phase = inGrass ? 'chase' : 'idle';
    } else if (snakeState.phase === 'scared') {
      var sp = window.Data.WORLD.snakeSpawn;
      var back = new THREE.Vector3(sp[0], 0, sp[1]).sub(snake.position);
      if (back.length() < 0.5) snakeState.phase = 'idle';
      else { back.normalize(); snake.position.addScaledVector(back, 6 * dt); }
    }

    // 逃出草浪区 → 脱险
    if ((snakeState.phase === 'chase' || snakeState.phase === 'stuck') && !inGrass) {
      snakeState.phase = 'idle';
      snakeState.coolT = 4;
      if (!snakeState.escapedOnce) {
        snakeState.escapedOnce = true;
        awardCard('paodekuai', snake);
      }
      window.Dialogue.toast('甩掉蛇了！');
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
