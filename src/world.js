/* ============================================================
 * 直立牛平原 M1 —— 牛棚镇世界搭建
 * window.buildWorld(scene) → { tickets, update(t) }
 * 梗：纸片太阳 / 方块棚屋 / 段子告示牌 / 晾衣绳 / 第7705棵草
 * ============================================================ */
(function () {
  'use strict';

  var W = null; // window.Data.WORLD（延迟引用）

  function signTexture(lines, w, h, bg, fg) {
    var c = document.createElement('canvas');
    c.width = (w || 256) * 2;
    c.height = (h || 128) * 2;
    var x = c.getContext('2d');
    x.fillStyle = bg || '#7a5a2a';
    x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = fg || '#f0e8d0';
    x.lineWidth = 6;
    x.strokeRect(8, 8, c.width - 16, c.height - 16);
    x.fillStyle = fg || '#f0e8d0';
    x.textAlign = 'center';
    x.font = 'bold 40px "Microsoft YaHei", sans-serif';
    lines.forEach(function (l, i) {
      x.fillText(l, c.width / 2, 60 + i * 48);
    });
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  function makeSign(scene, lines, pos, rotY, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var w = opts.w || 3.2, h = opts.h || 1.6;
    var board = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.08),
      new THREE.MeshBasicMaterial({ map: signTexture(lines, 256, 128, opts.bg, opts.fg) })
    );
    board.position.y = h / 2 + 0.7;
    g.add(board);
    if (opts.posts !== false) {
      var postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12),
        new THREE.MeshLambertMaterial({ color: 0x6a4a28 }));
      var postR = postL.clone();
      postL.position.set(-w / 2 + 0.2, 0.35, 0);
      postR.position.set(w / 2 - 0.2, 0.35, 0);
      g.add(postL); g.add(postR);
    }
    g.position.set(pos[0], 0, pos[1]);
    g.rotation.y = rotY || 0;
    scene.add(g);
    return g;
  }

  function makeHouse(scene, x, z, rotY, color) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 3.0),
      new THREE.MeshLambertMaterial({ color: color || 0xc8905a }));
    body.position.y = 1.2;
    g.add(body);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.5, 3.4),
      new THREE.MeshLambertMaterial({ color: 0x8a3a2a }));
    roof.position.y = 2.75;
    roof.rotation.z = 0;
    g.add(roof);
    var door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x4a2a12 }));
    door.position.set(0, 0.75, 1.52);
    g.add(door);
    var winL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xbfe3ff }));
    var winR = winL.clone();
    winL.position.set(-1.1, 1.6, 1.52);
    winR.position.set(1.1, 1.6, 1.52);
    g.add(winL); g.add(winR);
    g.position.set(x, 0, z);
    g.rotation.y = rotY || 0;
    scene.add(g);
    return g;
  }

  function makeClothesline(scene, x1, z1, x2, z2) {
    var dx = x2 - x1, dz = z2 - z1;
    var len = Math.sqrt(dx * dx + dz * dz);
    var g = new THREE.Group();
    var postMat = new THREE.MeshLambertMaterial({ color: 0x6a4a28 });
    var p1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), postMat);
    var p2 = p1.clone();
    p1.position.set(x1, 0.8, z1); p2.position.set(x2, 0.8, z2);
    scene.add(p1); scene.add(p2);
    var rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 6),
      new THREE.MeshBasicMaterial({ color: 0xddd8cc }));
    rope.position.set((x1 + x2) / 2, 1.5, (z1 + z2) / 2);
    var dir = new THREE.Vector3(dx, 0, dz).normalize();
    rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(rope);
    var sockMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc8 });
    for (var i = 1; i <= 2; i++) {
      var sock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.12), sockMat);
      sock.position.set(x1 + dx * (i / 3), 1.2 + Math.sin(i * 2.1) * 0.1, z1 + dz * (i / 3));
      g.add(sock);
    }
    scene.add(g);
  }

  function buildWorld(scene) {
    W = window.Data.WORLD;
    var B = W.bound;
    var out = { tickets: [] };

    // ---- 天空 ----
    scene.background = new THREE.Color(0xbfe3ff);
    scene.fog = new THREE.Fog(0xbfe3ff, 55, 130);

    // 纸片太阳
    var sun = new THREE.Mesh(
      new THREE.CircleGeometry(4, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
    );
    sun.position.set(28, 42, -60);
    sun.lookAt(0, 0, 0);
    scene.add(sun);

    // 云（方块云）
    var cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    [[-18, 12, -20], [10, 16, -30], [30, 13, -12], [-30, 15, 25]].forEach(function (p, i) {
      var c = new THREE.Group();
      for (var j = 0; j < 3; j++) {
        var b = new THREE.Mesh(new THREE.BoxGeometry(3 + j, 1.4, 1.6), cloudMat);
        b.position.set((j - 1) * 2.2, Math.sin(j) * 0.4, 0);
        c.add(b);
      }
      c.position.set(p[0], p[1], p[2]);
      c.userData.speed = 0.5 + i * 0.2;
      scene.add(c);
      out.clouds = out.clouds || [];
      out.clouds.push(c);
    });

    // ---- 地面 ----
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshLambertMaterial({ color: 0x7fae5e })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // ---- 方块草（比趴着的牛高） ----
    var grassMat = new THREE.MeshLambertMaterial({ color: 0x5f9e4a });
    var grass = [];
    for (var gi = 0; gi < W.grassCount; gi++) {
      var gx = (Math.random() * 2 - 1) * (B + 14);
      var gz = (Math.random() * 2 - 1) * (B + 14);
      if (Math.abs(gx) < B && Math.abs(gz) < B && Math.random() < 0.4) continue; // 镇内稀疏些
      if (gx > 28 && gx < 64 && gz > -15 && gz < 15) continue; // K 线交易场区域不留草
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, W.grassHeight, 0.09), grassMat);
      blade.position.set(gx, W.grassHeight / 2, gz);
      blade.userData.phase = Math.random() * 6.28;
      blade.userData.h = W.grassHeight;
      scene.add(blade);
      grass.push(blade);
    }
    out.grass = grass;

    // ---- 房子 ----
    makeHouse(scene, -9, -8, 0.3, 0xc8905a);
    makeHouse(scene, 10, -10, -0.4, 0xb88060);
    makeHouse(scene, -12, 9, 0.1, 0xd0a070);

    // ---- 晾衣绳（牛角袜） ----
    makeClothesline(scene, -6, -9, -2, -11);

    // ---- 镇口牌坊 ----
    var gate = new THREE.Group();
    var gMat = new THREE.MeshLambertMaterial({ color: 0x6a4a28 });
    var gL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5), gMat);
    var gR = gL.clone();
    gL.position.set(-4.5, 2, -16); gR.position.set(4.5, 2, -16);
    gate.add(gL); gate.add(gR);
    var gTop = new THREE.Mesh(new THREE.BoxGeometry(10, 1.1, 0.6), gMat);
    gTop.position.set(0, 4.6, -16);
    gate.add(gTop);
    var gSign = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 1.6, 0.1),
      new THREE.MeshBasicMaterial({ map: signTexture(['牛来镇'], 256, 96, '#8a3a2a', '#ffe89a') })
    );
    gSign.position.set(0, 4.9, -16.35);
    gate.add(gSign);
    scene.add(gate);

    // ---- 段子告示牌 ----
    makeSign(scene, ['本镇禁牛', '——除了你，因为你趴着看不见'], [-8, -2], 0.5, { w: 2.6, h: 1.6 });
    makeSign(scene, ['牛市入口，左转，', '再等几年'], [9, -3], -0.4, { w: 2.6, h: 1.6, bg: '#3a5a2a' });
    makeSign(scene, ['草浪区 · 蛇出没！', '跑快点，被咬会叫妈妈'], [13, -9], 0.2, { w: 2.8, h: 1.6, bg: '#4a3a1a' });

    // ---- 草浪区（高草，蛇追戏舞台）----
    var GA = W.grassArea;
    var tallMat = new THREE.MeshLambertMaterial({ color: 0x3f8e3a });
    for (var tg = 0; tg < 150; tg++) {
      var tx = GA.x1 + Math.random() * (GA.x2 - GA.x1);
      var tz = GA.z1 + Math.random() * (GA.z2 - GA.z1);
      var tall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.0, 0.22), tallMat);
      tall.position.set(tx, 1.0, tz);
      tall.userData.phase = Math.random() * 6.28;
      scene.add(tall);
      grass.push(tall); // 复用摆动动画
    }

    // ---- 蛇蜕皮（草浪区里，拿给玄学牛换卡）----
    var shed = new THREE.Group();
    var shedMat = new THREE.MeshLambertMaterial({ color: 0x9a9a92 });
    for (var si = 0; si < 3; si++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), shedMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.06 + si * 0.05;
      shed.add(ring);
    }
    shed.position.set(W.snakeShedSpot[0], 0.1, W.snakeShedSpot[1]);
    shed.userData.taken = false;
    scene.add(shed);
    out.shed = shed;

    // 第 7705 棵草（纪念首周票房）
    var special = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xffd970 }));
    special.position.set(3.5, 0.45, 5);
    scene.add(special);
    makeSign(scene, ['第 7705 棵草', '（首周票房纪念）'], [3.5, 5], 0, { w: 2.2, h: 1.6, bg: '#5a4a1a' });

    // ---- 贴图海告示（地图边界，移到西边） ----
    makeSign(scene, ['这里本来是悬崖，', '导演不会做悬崖'], [-B - 2, 0], Math.PI / 2, { w: 2.6, h: 1.6, bg: '#1a3a4a' });

    // ---- 围栏桩（东边留门，通向 K 线交易场） ----
    var fenceMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
    for (var fx = -B; fx <= B; fx += 3.2) {
      [-B, B].forEach(function (fz) {
        var p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), fenceMat);
        p.position.set(fx, 0.55, fz);
        scene.add(p);
        if (fz === B && fx > -4.5 && fx < 4.5) return; // 东门
        var p2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), fenceMat);
        p2.position.set(fz, 0.55, fx);
        scene.add(p2);
      });
    }

    // ---- K 线交易场 ----
    buildTradingGround(scene);
    // ---- 电影院废墟（M2c 选座购票） ----
    buildCinema(scene, out);
    // ---- 生物团场景件（M2d） ----
    buildCreatureScenery(scene, out);
    // 东门口的方向牌
    makeSign(scene, ['→ K 线交易场', '（红涨绿跌，绿多红少）'], [B + 3.5, 0], -Math.PI / 2, { w: 2.6, h: 1.6, bg: '#4a3a2a' });

    // ---- 副本广场（挂载的副本会出现在这里） ----
    var plzPad = new THREE.Mesh(new THREE.CircleGeometry(9, 24),
      new THREE.MeshLambertMaterial({ color: 0x8a8578 }));
    plzPad.rotation.x = -Math.PI / 2;
    plzPad.position.set(12, 0.02, 20);
    scene.add(plzPad);
    makeSign(scene, ['副本广场', '挂载即出现 · 开发者入口'], [12, 25], Math.PI, { w: 3, h: 1.6, bg: '#1a3a4a' });

    // ---- 草票（旋转发光） ----
    var ticketMat = new THREE.MeshLambertMaterial({ color: 0xffd970, emissive: 0x7a5a10 });
    window.Data.TICKET_SPOTS.forEach(function (sp) {
      var t = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.1), ticketMat);
      t.position.set(sp[0], 0.6, sp[1]);
      t.userData.taken = false;
      scene.add(t);
      out.tickets.push(t);
    });

    // ---- 更新（云 / 草 / 草票） ----
    out.update = function (t) {
      if (out.clouds) out.clouds.forEach(function (c) {
        c.position.x += c.userData.speed * 0.004;
        if (c.position.x > 40) c.position.x = -40;
      });
      grass.forEach(function (b) {
        b.rotation.x = Math.sin(t * 1.8 + b.userData.phase) * 0.1;
      });
      out.tickets.forEach(function (tk) {
        if (tk.userData.taken) return;
        tk.rotation.y += 0.03;
        tk.position.y = 0.6 + Math.sin(t * 2 + tk.position.x) * 0.08;
      });
      if (out.shed && !out.shed.userData.taken) {
        out.shed.rotation.y += 0.02;
      }
    };

    return out;
  }

  /* ---------- K 线交易场：地形本身就是 K 线图（红涨绿跌，绿多红少） ---------- */
  function buildTradingGround(scene) {
    // 地块
    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 30),
      new THREE.MeshLambertMaterial({ color: 0x8f9a86 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(46, 0.015, 0);
    scene.add(floor);

    // 从东门到交易场的小路
    var pathMat = new THREE.MeshLambertMaterial({ color: 0xa08050 });
    for (var pi = 0; pi < 2; pi++) {
      var seg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.4), pathMat);
      seg.rotation.x = -Math.PI / 2;
      seg.position.set(27.2 + pi * 2.2, 0.02 + pi * 0.001, 0);
      scene.add(seg);
    }

    // K 线柱子
    var redMat = new THREE.MeshLambertMaterial({ color: 0xd04a3a });
    var greenMat = new THREE.MeshLambertMaterial({ color: 0x3a9e5a });
    var wickMat = new THREE.MeshLambertMaterial({ color: 0x6a5a4a });
    for (var r = 0; r < 6; r++) {
      for (var c = 0; c < 6; c++) {
        var h = 1.2 + Math.random() * 6;
        var m = Math.random() < 0.35 ? redMat : greenMat; // 65% 绿（绿多红少梗）
        var px = 34 + c * 4.4, pz = -11 + r * 4.2;
        if (Math.abs(px - 46) < 3 && Math.abs(pz) < 3) continue; // 给大阳线柱留位
        var pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 1.1), m);
        pillar.position.set(px, h / 2, pz);
        scene.add(pillar);
        if (Math.random() < 0.4) {
          var wick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), wickMat);
          wick.position.set(px, h + 0.35, pz);
          scene.add(wick);
        }
      }
    }

    // 大阳线柱（最高点——奶龙原坑位）
    var big = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 2.2), redMat);
    big.position.set(46, 4.5, 0);
    scene.add(big);
    var wickBig = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), wickMat);
    wickBig.position.set(46, 9.8, 0);
    scene.add(wickBig);
    var platform = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 3.4),
      new THREE.MeshLambertMaterial({ color: 0x6a4a28 }));
    platform.position.set(46, 10.6, 0);
    scene.add(platform);
    var naiLongSign = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.3, 0.12),
      new THREE.MeshBasicMaterial({ map: signTexture(['奶龙休假', '柱子照旧'], 256, 96, '#8a3a2a', '#ffe89a') })
    );
    naiLongSign.position.set(46, 11.2, 0);
    scene.add(naiLongSign);

    // 刻字柱子（承载了太多人的梦想与眼泪）
    var carved = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 6, 1.2),
      new THREE.MeshLambertMaterial({ map: signTexture(['这根柱子承载了', '太多人的梦想与眼泪'], 128, 96, '#2a4a2a', '#cfd8b0') })
    );
    carved.position.set(38, 3, -11);
    scene.add(carved);

    // 交易场告示牌
    makeSign(scene, ['红涨绿跌', '——绿多红少，请勿参照反向牛'], [56, -9], -0.6, { w: 2.8, h: 1.6, bg: '#3a2a1a' });
    makeSign(scene, ['本场交易', '亏了不许哭'], [33, 10], 0.7, { w: 2.6, h: 1.6, bg: '#2a3a2a' });
  }

  /* ---------- 电影院废墟（M2c 选座购票舞台） ---------- */
  function buildCinema(scene, out) {
    var CX = window.Data.WORLD.cinemaPos[0], CZ = window.Data.WORLD.cinemaPos[1];
    var wallMat = new THREE.MeshLambertMaterial({ color: 0x8a8578 });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0x5a5548 });

    // 地面
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12),
      new THREE.MeshLambertMaterial({ color: 0x7a7568 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(CX, 0.02, CZ);
    scene.add(floor);

    // 三面墙（背面 + 两侧，留南面入口；侧面歪一块 = 废墟）
    var back = new THREE.Mesh(new THREE.BoxGeometry(13.4, 5, 0.4), wallMat);
    back.position.set(CX, 2.5, CZ - 5.8);
    scene.add(back);
    var sideL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 11.6), wallMat);
    sideL.position.set(CX - 6.5, 2.2, CZ);
    scene.add(sideL);
    var sideR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 11.6), wallMat);
    sideR.position.set(CX + 6.5, 2.2, CZ);
    sideR.rotation.z = 0.12; // 歪了（废墟）
    scene.add(sideR);
    var rubble = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), darkMat);
    rubble.position.set(CX + 5.5, 0.45, CZ + 3.5);
    rubble.rotation.x = 0.5;
    scene.add(rubble);

    // 银幕（最大的告示牌）
    var screen = new THREE.Mesh(
      new THREE.BoxGeometry(8, 4.2, 0.3),
      new THREE.MeshBasicMaterial({ map: signTexture(['《牛来》今日上映', '座无虚席 · 座位都拼成字了'], 256, 128, '#1a2a3a', '#ffe89a') })
    );
    screen.position.set(CX, 3.2, CZ - 5.55);
    scene.add(screen);

    // 门头招牌
    var marquee = new THREE.Mesh(
      new THREE.BoxGeometry(7, 1.4, 0.4),
      new THREE.MeshBasicMaterial({ map: signTexture(['牛来影院 · 烂到抽象', '反正满场'], 256, 96, '#3a1a1a', '#ffd970') })
    );
    marquee.position.set(CX, 5.4, CZ + 5.2);
    scene.add(marquee);

    // 座位（6 排 × 8 座，几个坏的/歪的）
    var seatMat = new THREE.MeshLambertMaterial({ color: 0x8a3a2a });
    for (var r = 0; r < 6; r++) {
      for (var c = 0; c < 8; c++) {
        var seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), seatMat);
        seat.position.set(CX - 3.5 + c * 1.0, 0.45, CZ - 4 + r * 1.1);
        if (Math.random() < 0.12) seat.rotation.z = (Math.random() - 0.5) * 0.6; // 坏座
        scene.add(seat);
      }
    }

    // 售票机（可交互）
    var machine = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.8), darkMat);
    body.position.y = 0.85;
    machine.add(body);
    var mScreen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xbfe3ff }));
    mScreen.position.set(0, 1.35, 0.42);
    machine.add(mScreen);
    var slot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
    slot.position.set(0, 0.55, 0.42);
    machine.add(slot);
    machine.position.set(window.Data.WORLD.machinePos[0], 0, window.Data.WORLD.machinePos[1]);
    machine.rotation.y = 0.4;
    scene.add(machine);
    makeSign(scene, ['售票机', '选座购票 · 5 草票/张'], [window.Data.WORLD.machinePos[0] - 2, window.Data.WORLD.machinePos[1]], 0.9, { w: 2.2, h: 1.4, bg: '#2a2a3a' });

    out.machine = machine;
    out.machinePos = new THREE.Vector3(window.Data.WORLD.machinePos[0], 0, window.Data.WORLD.machinePos[1]);

    // 修勾的坏座位（前排行 c=4，歪的那个）
    var broken = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55),
      new THREE.MeshLambertMaterial({ color: 0x5a3a2a }));
    broken.position.set(CX + 0.5, 0.45, CZ + 1.5);
    broken.rotation.z = 0.5;
    scene.add(broken);
    out.brokenSeat = { mesh: broken, pos: new THREE.Vector3(CX + 0.5, 0, CZ + 1.5) };
  }

  /* ---------- M2d 生物团场景件：水池 / 奶瓶 / 请勿按压牌 ---------- */
  function buildCreatureScenery(scene, out) {
    // 卡皮巴拉的水池（交易场南边）
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
      new THREE.MeshLambertMaterial({ color: 0x4a9ec8 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(54, 0.03, 6);
    scene.add(pool);
    var rimMat = new THREE.MeshLambertMaterial({ color: 0x8a8578 });
    [[54 - 2, 6], [54 + 2, 6], [54, 6 - 2], [54, 6 + 2]].forEach(function (p) {
      var rim = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 0.3), rimMat);
      rim.position.set(p[0], 0.06, p[1]);
      scene.add(rim);
    });
    // 奶瓶（喂奶娃）
    var milkMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    window.Data.MILK_SPOTS.forEach(function (sp) {
      var bottle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.16), milkMat);
      bottle.position.set(sp[0], 0.5, sp[1]);
      var cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x5a9ee8 }));
      cap.position.set(sp[0], 0.7, sp[1]);
      scene.add(bottle); scene.add(cap);
      out.milkBottles = out.milkBottles || [];
      out.milkBottles.push({ bottle: bottle, cap: cap, taken: false });
    });
    // 尖叫鸡的"请勿按压"牌
    makeSign(scene, ['请勿按压', '（按了会响）'], [2.4, 9.5], -0.3, { w: 2.4, h: 1.5, bg: '#5a1a1a' });
  }

  window.makeSignTex = signTexture;   // 给副本插件用的贴图工厂
  window.buildWorld = buildWorld;
})();
