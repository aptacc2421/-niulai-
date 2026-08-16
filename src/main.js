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
  window.GAME_VERSION = 'v0.5.1';

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
    G.state.endingShown = G.state.endingShown || false;
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
  G.orbit = function (dx, dy) {
    camYaw += dx * 0.005;
    if (dy !== undefined) camPitch = Math.max(-1.2, Math.min(1.2, camPitch - dy * 0.005)); // 竖直拖动 = 俯仰
  };
  G.toggleDirector = function () { toggleDirectorMode(); };
  G.yaw = function () { return camYaw; };
  G.pitch = function () { return camPitch; };

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

  /* ---------------- 结局系统（站立值 100 → 站起来 / 牛市来了） ---------------- */
  var endingShown = false;
  function showEnding(title, text) {
    if (endingShown) return;
    endingShown = true;
    G.state.endingShown = true;
    save();
    document.getElementById('ending-title').textContent = title;
    document.getElementById('ending-text').textContent = text;
    document.getElementById('ending').classList.remove('hidden');
    window.Dialogue.updateHud();
    // 全平原"哞"声合唱
    window.AudioSys.boom();
    setTimeout(function () { window.AudioSys.boom(); }, 250);
    setTimeout(function () { window.AudioSys.boom(); }, 500);
    setTimeout(function () { window.AudioSys.boom(); }, 750);
  }
  setInterval(function () {
    if (endingShown) return;
    if (G.state.endingShown) { endingShown = true; return; }
    if (G.state.stand < 100) return;
    var allCards = window.Data.CARDS.every(function (c) { return G.state.cards.indexOf(c.id) >= 0; });
    var allStubs = (G.state.stubs || []).length >= 4;
    if (allCards && allStubs) {
      showEnding('牛市来了', '牛来站起来的瞬间，K 线交易场所有柱子变红，钟声响起。\n那一天，平原上所有牛都说：牛来了。\n\n本文纯属虚构，投资需谨慎。');
    } else {
      showEnding('站起来了', '牛来第一次用后腿站立，整个平原的牛都停下看它。\n那一天，平原上所有牛都说：牛来了。');
    }
  }, 500);
  document.getElementById('ending-restart').addEventListener('click', function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    location.reload();
  });

  /* ---------------- 输入 ---------------- */
  var keys = {};
  var codexOpen = false;

  // ---- 隐藏作弊终端（懂的都懂；挂了个假文件系统，输入无回显像 sudo 密码） ----
  var cheatEl = document.getElementById('cheat-console');
  var cheatOut = document.getElementById('cheat-out');
  var cheatInput = document.getElementById('cheat-input');
  var cheatOpen = false;
  var spirit = false;          // 灵魂出体
  var autoBoom = false;        // 无限哞
  var autoBoomT = 0;
  var timeScale = 1;           // 变速齿轮
  var gameT = 0;
  G.spirit = function () { return spirit; };
  G.timeScale = function () { return timeScale; };

  // 假文件系统（作弊清单藏在里面，靠 ls 自己发现）
  var CHEAT_HANDLERS = {};
  function toggleSpirit() { spirit = !spirit; player.visible = !spirit; if (!spirit) camPitch = 0; }
  function toggleYes() { autoBoom = !autoBoom; }
  function rmRf() {
    window.Dialogue.toast('rm -rf /：你已删库跑路（存档清空，系统即将重启）');
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    setTimeout(function () { location.reload(); }, 900);
  }
  function npmInstall() {
    var ov = document.createElement('div');
    ov.id = 'npm-overlay';
    ov.textContent = 'npm install…\n⠋ 正在安装 217 个依赖（其中 216 个用不上）';
    document.body.appendChild(ov);
    setTimeout(function () { ov.remove(); }, 3000);
  }
  function forcePush() { G.state.stand = 100; window.Dialogue.updateHud(); save(); }
  function cycleSpeed() {
    var seq = [1, 2, 4, 0.5, 0.25];
    timeScale = seq[(seq.indexOf(timeScale) + 1) % seq.length];
    cheatPrint('speed.conf：当前 ×' + timeScale);
  }
  /* ---------------- 副本插件系统（给开发者：挂载即出现在副本广场，主线可见） ---------------- */
  var PLZ = { x: 12, z: 20 };
  var dungeonInstances = {};
  var inDungeon = false;
  var currentDungeon = null;
  G.dungeonInstances = dungeonInstances;
  G.inDungeon = function () { return inDungeon; };
  function mountDungeon(name, silent) {
    if (dungeonInstances[name]) return;
    var reg = window.Dungeons.REGISTRY[name];
    if (!reg) return;
    var slot = { x: PLZ.x + VFS.mountedDungeons.indexOf(name) * 3.6 - 1.8, z: PLZ.z };
    var api = {
      scene: G.scene, pos: slot,
      makeSignTex: function (lines, w, h, bg, fg) {
        return window.makeSignTex ? window.makeSignTex(lines, w, h, bg, fg) : null;
      }
    };
    var content = reg.build ? reg.build(api) : null;
    if (content) G.scene.add(content);
    // 传送门可偏移（放在副本门口），进入点/房间边界相对 slot
    var po = reg.portalOffset || [0, 0];
    var portalPos = { x: slot.x + po[0], z: slot.z + po[1] };
    var portal = window.Dungeons.buildPortal(G.scene, reg.name, portalPos);
    dungeonInstances[name] = {
      portal: portal, content: content, name: reg.name, slot: slot, portalPos: portalPos,
      enter: reg.enterPos || [0, 0],
      bounds: reg.boundsRel ? { x1: slot.x + reg.boundsRel.x1, x2: slot.x + reg.boundsRel.x2, z1: slot.z + reg.boundsRel.z1, z2: slot.z + reg.boundsRel.z2 } : null
    };
    if (!silent) window.Dialogue.toast('已挂载副本「' + reg.name + '」：副本广场出现传送门');
  }
  function unmountDungeon(name) {
    var inst = dungeonInstances[name];
    if (!inst) return false;
    G.scene.remove(inst.portal);
    if (inst.content) G.scene.remove(inst.content);
    delete dungeonInstances[name];
    return true;
  }

  // ---- 假文件系统（挂载式：/cheats 作弊区 + /dungeons 副本区，/lib 是库） ----
  var VFS = {
    cwd: '/dungeons',
    libCheats: {
      'spirit.sh':     { desc: '#!/bin/bash\n# 灵魂出体（肉身留在原地）\n# 用法：./spirit.sh', run: toggleSpirit },
      'speed.conf':    { desc: '变速配置：当前 ×' + timeScale + '（] 加速 / [ 减速 / 0 复位）', run: cycleSpeed },
      'yes.bin':       { desc: '二进制：哞。', run: toggleYes },
      'npm.sh':        { desc: '#!/bin/bash\nnpm install\n# 会装上 217 个依赖（216 个用不上）', run: npmInstall },
      'force_push.sh': { desc: '#!/bin/bash\ngit push --force\n# 没人拦得住你。', run: forcePush },
      'rm_rf.tar':     { desc: '⚠ 危险文件：删库跑路。', run: rmRf },
      'hint.txt':      { desc: '提示：cat 一下每个文件。\n提示：mount 挂载 / rm 拔掉，试试看。', run: function () { cheatPrint('提示：cat 一下每个文件，mount/rm 试试看。'); } }
    },
    mountedCheats: ['spirit.sh', 'speed.conf', 'yes.bin', 'npm.sh', 'force_push.sh', 'rm_rf.tar', 'hint.txt'],
    mountedDungeons: window.Dungeons.names().slice()   // 副本默认全部挂载
  };
  // 初始挂载全部副本（主线副本广场直接显示）
  window.Dungeons.names().forEach(function (n) { mountDungeon(n, true); });
  // 走出副本房间 → 自动离开副本（setInterval，rAF 被节流时也生效）
  setInterval(function () {
    if (!inDungeon || !currentDungeon) return;
    var inst = dungeonInstances[currentDungeon];
    if (!inst) { inDungeon = false; currentDungeon = null; return; }
    var cb = inst.bounds;
    if (cb && (player.position.x < cb.x1 || player.position.x > cb.x2 ||
               player.position.z < cb.z1 || player.position.z > cb.z2)) {
      inDungeon = false;
      var dn = currentDungeon;
      currentDungeon = null;
      window.Dialogue.toast('离开副本「' + inst.name + '」，回到副本广场');
    }
  }, 400);

  function vfsNorm(p) {
    var parts = [];
    (p || '').split('/').forEach(function (s) {
      if (!s || s === '.') return;
      if (s === '..') parts.pop();
      else parts.push(s);
    });
    return '/' + parts.join('/');
  }
  function vfsName(p) { return String(p).replace(/^\/+/, '').split('/').pop(); }
  function vfsKind(n) {
    if (VFS.libCheats[n]) return 'cheat';
    if (window.Dungeons.REGISTRY[n]) return 'dungeon';
    return null;
  }
  function vfsDesc(n) {
    if (VFS.libCheats[n]) return VFS.libCheats[n].desc;
    var reg = window.Dungeons.REGISTRY[n];
    return reg ? reg.desc : null;
  }
  function vfsMounted(n) {
    var k = vfsKind(n);
    if (k === 'cheat') return VFS.mountedCheats.indexOf(n) >= 0;
    if (k === 'dungeon') return VFS.mountedDungeons.indexOf(n) >= 0;
    return false;
  }
  function vfsLs(dir) {
    var d = vfsNorm(dir);
    if (d === '/') { cheatPrint('bin/   cheats/   dungeons/   lib/'); return; }
    if (d === '/cheats') {
      cheatPrint('总用量 42');
      if (!VFS.mountedCheats.length) cheatPrint('（空——去 /lib 看看有什么可 mount 的）');
      VFS.mountedCheats.forEach(function (n) {
        var size = (n.length * 13 + 128) % 900 + 128;
        cheatPrint('-rwxr-xr-x 1 root root ' + size + ' 牛来 ' + n);
      });
      return;
    }
    if (d === '/dungeons') {
      cheatPrint('总用量 64');
      if (!VFS.mountedDungeons.length) cheatPrint('（空——去 /lib 看看有什么可 mount 的副本）');
      VFS.mountedDungeons.forEach(function (n) {
        var reg = window.Dungeons.REGISTRY[n];
        var size = (n.length * 19 + 256) % 1200 + 256;
        cheatPrint('-rwxr-xr-x 1 root root ' + size + ' 牛来 ' + n + '    ← ' + (reg ? reg.name : ''));
      });
      return;
    }
    if (d === '/lib') {
      cheatPrint('总用量 96');
      Object.keys(VFS.libCheats).forEach(function (n) {
        cheatPrint('-r--r--r-- 1 root root 512 牛来 ' + n + (vfsMounted(n) ? '  [已挂载]' : '') + '    (cheat)');
      });
      Object.keys(window.Dungeons.REGISTRY).forEach(function (n) {
        cheatPrint('-r--r--r-- 1 root root 768 牛来 ' + n + (vfsMounted(n) ? '  [已挂载]' : '') + '    (副本)');
      });
      return;
    }
    if (d === '/bin') { cheatPrint('ls  cat  rm  mount  cd  pwd  exit  wq  q!'); return; }
    cheatPrint('ls: ' + d + ': 没有那个目录');
  }
  function vfsCat(name) {
    var n = vfsName(name);
    var d = vfsDesc(n);
    if (d === null) { cheatPrint('cat: ' + name + ': 没有那个文件'); return; }
    cheatPrint(d);
  }
  function vfsRun(name) {
    var n = vfsName(name);
    var k = vfsKind(n);
    if (!k) { cheatPrint('bash: ' + name + ': 没有那个文件或目录'); return; }
    if (!vfsMounted(n)) { cheatPrint('bash: ' + name + ': 未挂载（试试 mount ' + n + '）'); return; }
    if (k === 'cheat' && VFS.libCheats[n].run) { VFS.libCheats[n].run(); return; }
    if (k === 'dungeon') {
      cheatPrint('副本「' + window.Dungeons.REGISTRY[n].name + '」：' + vfsDesc(n));
      cheatPrint('它在副本广场（坐标 ' + PLZ.x + ', ' + PLZ.z + '），走过去按 E 进入。');
      return;
    }
    cheatPrint(vfsDesc(n));
  }
  function vfsRm(argStr) {
    var args = (argStr || '').trim().split(/\s+/).filter(Boolean);
    if (!args.length) { cheatPrint('用法：rm <文件名>（卸载，从挂载区拔掉）'); return; }
    if (args.indexOf('-rf') >= 0 && args[args.length - 1] === '/') {
      cheatPrint('rm: 拒绝删除根目录（就算这是游戏也不行）');
      return;
    }
    var n = vfsName(args[args.length - 1]);
    var k = vfsKind(n);
    if (!k) { cheatPrint('rm: ' + n + ': 没有那个文件'); return; }
    if (!vfsMounted(n)) { cheatPrint('rm: ' + n + ': 没挂载，拔啥呢'); return; }
    if (k === 'cheat') {
      VFS.mountedCheats.splice(VFS.mountedCheats.indexOf(n), 1);
      cheatPrint('已卸载 /cheats/' + n + '（拔掉电源了）');
    } else {
      unmountDungeon(n);
      VFS.mountedDungeons.splice(VFS.mountedDungeons.indexOf(n), 1);
      cheatPrint('已卸载 /dungeons/' + n + '（副本已从副本广场移除）');
    }
  }
  function vfsMount(name) {
    var n = vfsName(name);
    if (!n) { cheatPrint('用法：mount <文件名>（从 /lib 挂载）'); return; }
    var k = vfsKind(n);
    if (!k) { cheatPrint('mount: /lib/' + n + ' 不存在'); return; }
    if (vfsMounted(n)) { cheatPrint('mount: ' + n + ' 已经挂载了'); return; }
    if (k === 'cheat') {
      VFS.mountedCheats.push(n);
      cheatPrint('已挂载 /cheats/' + n);
    } else {
      VFS.mountedDungeons.push(n);
      mountDungeon(n);
      cheatPrint('已挂载 /dungeons/' + n + '（副本出现在副本广场）');
    }
  }
  function vfsCd(p) {
    if (!p || p === '~') { VFS.cwd = '/dungeons'; return; }
    var d = vfsNorm((p[0] === '/' ? '' : VFS.cwd + '/') + p);
    if (d === '/' || d === '/bin' || d === '/cheats' || d === '/dungeons' || d === '/lib') VFS.cwd = d;
    else cheatPrint('cd: ' + p + ': 没有那个目录');
  }
  function cheatPrint(text) {
    cheatOut.textContent += (cheatOut.textContent ? '\n' : '') + text;
    cheatOut.scrollTop = cheatOut.scrollHeight;
  }
  function openCheat() {
    cheatOpen = true;
    cheatEl.classList.remove('hidden');
    cheatOut.textContent = '';
    cheatInput.value = '';
    cheatInput.focus();
  }
  function closeCheat() {
    cheatOpen = false;
    cheatEl.classList.add('hidden');
    cheatInput.blur();
  }
  function setSpeed(v) { timeScale = v; }   // 变速静默生效
  function runCheat() {
    var c = (cheatInput.value || '').trim();
    cheatPrint('$ ' + c);   // 回显（真终端风格）
    if (!c) return;
    if (c.toLowerCase().indexOf('sudo ') === 0) c = c.slice(5).trim();  // sudo 前缀（梗）
    var parts = c.trim().split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var arg = parts.slice(1).join(' ');
    if (cmd === 'ls') { vfsLs(arg || VFS.cwd); return; }
    if (cmd === 'cat') { if (arg) vfsCat(arg); else cheatPrint('用法：cat <文件>'); return; }
    if (cmd === 'rm') { vfsRm(arg); return; }
    if (cmd === 'mount') { vfsMount(arg); return; }
    if (cmd === 'cd') { vfsCd(arg); return; }
    if (cmd === 'pwd') { cheatPrint(VFS.cwd); return; }
    if (cmd === 'exit' || cmd === 'quit') { closeCheat(); return; }
    if (cmd === 'wq') { toggleSpirit(); return; }
    if (cmd === 'q!') { spirit = false; player.visible = true; camPitch = 0; return; }
    if (cmd.indexOf('./') === 0) { vfsRun(cmd.slice(2) + (arg ? ' ' + arg : '')); return; }
    if (cmd === 'sh') { vfsRun(arg); return; }
    cheatPrint('bash: ' + cmd + ': 未找到命令（提示：试试 ls）');
  }

  window.addEventListener('keydown', function (e) {
    if (cheatOpen) {
      if (e.key === 'Enter' && !e.isComposing) { runCheat(); cheatInput.value = ''; }  // 执行后保持打开（真终端行为）
      else if (e.key === 'Escape' || e.key === ':' || e.key === '：') closeCheat();
      return; // 控制台打开时忽略游戏键
    }
    if (['Tab', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    // 变速齿轮（隐藏键）
    if (e.key === ']' || e.key === '}') setSpeed(Math.min(4, timeScale * 2));
    if (e.key === '[' || e.key === '{') setSpeed(Math.max(0.25, timeScale / 2));
    if (e.key === '0') setSpeed(1);
    // 隐藏控制台
    if (e.key === ':' || e.key === '：') { e.preventDefault(); openCheat(); return; }
    // 灵魂出体模式下：只保留移动/升降键，屏蔽 E/Q/R/M/F/K 等快捷键（Q 只下降、不再甩镜头）
    if (spirit) return;
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

  // 鼠标右键拖拽旋转视角（水平=转向，竖直=俯仰）
  var orbitDrag = false, orbitLastX = 0, orbitLastY = 0;
  G.renderer.domElement.addEventListener('mousedown', function (e) {
    if (e.button === 2) { orbitDrag = true; orbitLastX = e.clientX; orbitLastY = e.clientY; }
  });
  window.addEventListener('mousemove', function (e) {
    if (orbitDrag) {
      camYaw += (e.clientX - orbitLastX) * 0.005;
      camPitch = Math.max(-1.2, Math.min(1.2, camPitch - (e.clientY - orbitLastY) * 0.005));
      orbitLastX = e.clientX;
      orbitLastY = e.clientY;
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
    // 副本传送门（挂载的副本）
    var best = null, bestD = 1.9;
    Object.keys(dungeonInstances).forEach(function (name) {
      var ip = dungeonInstances[name].portal.position;
      var dx = ip.x - player.position.x, dz = ip.z - player.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 2.3) { best = { kind: 'dungeon', ref: name }; bestD = 0; }
    });
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
    if (it.kind === 'dungeon') {
      // 进入副本（传送进副本内部；走出去自动离开）
      var inst = dungeonInstances[it.ref];
      var reg = window.Dungeons.REGISTRY[it.ref];
      if (inst && reg) {
        player.position.set(inst.slot.x + inst.enter[0], 0, inst.slot.z + inst.enter[1]);
        inDungeon = true;
        currentDungeon = it.ref;
        window.Dialogue.toast('进入副本「' + inst.name + '」：' + reg.desc + (inst.bounds ? '（想出去就往墙外走）' : ''));
      }
      return;
    }
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
  var camPitch = 0;    // 镜头俯仰（拖动上下；灵魂模式抬头/低头）
  var curSpeed = 0;    // 当前速度（加减速平滑）

  function loop() {
    requestAnimationFrame(loop);
    var rawDt = Math.min(clock.getDelta(), 0.05);
    var dt = Math.min(rawDt * timeScale, 0.1);   // 变速齿轮（] 加速 / [ 减速 / 0 恢复）
    gameT += dt;
    var t = gameT;
    var canMove = updatePhysics(dt, t) && !window.Dialogue.isActive() && !window.Dialogue.codexOpen() && !window.TicketUI.isOpen() && snakeState.seqT < 0 && !spirit;

    // 移动：镜头相对（W=往屏幕里走，A=屏幕左，D=屏幕右）
    var ix = 0, iz = 0;
    if (!cheatOpen) {
      if (keys['w'] || keys['arrowup']) iz += 1;
      if (keys['s'] || keys['arrowdown']) iz -= 1;
      if (keys['a'] || keys['arrowleft']) ix -= 1;
      if (keys['d'] || keys['arrowright']) ix += 1;
      if (G.touchInput) { ix += G.touchInput.x; iz += G.touchInput.z; } // 手机摇杆
    }
    // 相机相对方向向量（屏幕右 = fwd × up，已核对：A=屏幕左 / D=屏幕右）
    var fwd = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
    var rgt = new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw));
    var move = new THREE.Vector3().addScaledVector(fwd, iz).addScaledVector(rgt, ix);
    var moving = move.lengthSq() > 0;

    // 灵魂出体（wq）：自由飞行，上天入地
    if (spirit) {
      player.visible = false;
      // 视线方向（含俯仰，拖动上下可抬头/低头）
      var lookDir = new THREE.Vector3(
        Math.sin(camYaw) * Math.cos(camPitch),
        Math.sin(camPitch),
        Math.cos(camYaw) * Math.cos(camPitch)
      );
      var fdir = new THREE.Vector3().addScaledVector(lookDir, iz).addScaledVector(rgt, ix);
      if (keys['e'] || keys['E']) fdir.y += 1;   // 上升
      if (keys['q'] || keys['Q']) fdir.y -= 1;   // 下降
      if (fdir.lengthSq() > 0) {
        fdir.normalize();
        G.camera.position.addScaledVector(fdir, 7 * dt);  // 不受边界限制，能飞出地图
      }
      G.camera.lookAt(G.camera.position.clone().add(lookDir));
      world.update(t);
      window.Dialogue.update();
      G.renderer.render(G.scene, G.camera);
      return; // 灵魂模式跳过常规逻辑
    }

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

    // yes：无限哞（终端压力）
    if (autoBoom) {
      autoBoomT -= dt;
      if (autoBoomT <= 0) { autoBoomT = 0.7; window.AudioSys.boom(); }
    }

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
    // 副本内容动画（副本可自带动画：group.userData.update = function(t){...}）
    Object.keys(dungeonInstances).forEach(function (dn) {
      var c = dungeonInstances[dn].content;
      if (c && c.userData && c.userData.update) c.userData.update(t);
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

    // 视角跟随（PUBG 式）：移动时镜头慢慢转到移动方向；手动拖动（鼠标右键/触屏右半屏）时暂停，松手后继续跟随
    if (moving && !orbitDrag && !(G.isOrbiting && G.isOrbiting())) {
      var followDiff = facing - camYaw;
      while (followDiff > Math.PI) followDiff -= Math.PI * 2;
      while (followDiff < -Math.PI) followDiff += Math.PI * 2;
      camYaw += followDiff * Math.min(1, dt * 4);
    }

    // 相机：镜头高度 = 站立值；镜头相对 camYaw 平滑跟随（不再被朝向甩来甩去）
    var camH = 0.5 + (G.state.stand / 100) * 1.75;
    var camDist = inDungeon ? 4.6 : 6.5;   // 副本内镜头拉近（房间小，别穿墙）
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
        } else if (it.kind === 'dungeon') {
          var inst = dungeonInstances[it.ref];
          promptEl.innerHTML = '按 <b>E</b> 进入副本「' + (inst ? inst.name : it.ref) + '」';
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

  // 标题屏显示版本号（用于判断是否是最新部署）
  document.getElementById('title-version').textContent = 'v' + (window.GAME_VERSION || '').replace('v', '');

  loadSave();
  window.Dialogue.updateHud();
  loop();
})();
