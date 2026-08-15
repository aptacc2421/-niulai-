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
    makeSign(scene, ['前方草浪区', '蛇出没（M2 预告）'], [B - 4, -B + 4], -2.4, { w: 2.6, h: 1.6, bg: '#4a3a1a' });

    // 第 7705 棵草（纪念首周票房）
    var special = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xffd970 }));
    special.position.set(3.5, 0.45, 5);
    scene.add(special);
    makeSign(scene, ['第 7705 棵草', '（首周票房纪念）'], [3.5, 5], 0, { w: 2.2, h: 1.6, bg: '#5a4a1a' });

    // ---- 贴图海告示（地图边界） ----
    makeSign(scene, ['这里本来是悬崖，', '导演不会做悬崖'], [B + 2, 0], Math.PI / 2, { w: 2.6, h: 1.6, bg: '#1a3a4a' });

    // ---- 围栏桩 ----
    var fenceMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
    for (var fx = -B; fx <= B; fx += 3.2) {
      [-B, B].forEach(function (fz) {
        var p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), fenceMat);
        p.position.set(fx, 0.55, fz);
        scene.add(p);
        var p2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), fenceMat);
        p2.position.set(fz, 0.55, fx);
        scene.add(p2);
      });
    }

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
    };

    return out;
  }

  window.buildWorld = buildWorld;
})();
