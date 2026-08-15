/* ============================================================
 * 直立牛平原 M1 —— 角色模型工厂（方块拼装 · 低模 · 手搓风）
 * window.makeCow(opts) / window.makeCat(opts)
 * 梗：T-pose 前腿 / 同手同脚爬行 / 固定微笑 / 滑步 / 抖动线条
 * ============================================================ */
(function () {
  'use strict';

  // mulberry32 种子随机
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mat(color) {
    return new THREE.MeshLambertMaterial({ color: color });
  }

  function makeBox(w, h, d, color, r, jx, jy, jz) {
    var g = new THREE.BoxGeometry(w, h, d);
    var m = new THREE.Mesh(g, mat(color));
    m.position.set(jx || 0, jy || 0, jz || 0);
    if (r) { m.rotation.x = r[0] || 0; m.rotation.y = r[1] || 0; m.rotation.z = r[2] || 0; }
    return m;
  }

  function shadowDisc(radius) {
    var g = new THREE.CircleGeometry(radius, 12);
    var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    return m;
  }

  /* ---------- 牛 ---------- */
  function makeCow(opts) {
    opts = opts || {};
    var R = rng(opts.seed || 1);
    var bodyC = opts.colors ? opts.colors.body : 0xc8a06a;
    var patchC = opts.colors ? opts.colors.patch : 0x8a5a2a;
    var group = new THREE.Group();
    var scale = opts.scale || 1;
    var jank = (opts.jank === undefined) ? 1 : opts.jank; // 抖动幅度
    var parts = { legs: [], front: [], ears: [], tail: null };

    var jit = function (a) { return (R() - 0.5) * 0.06 * jank; };

    if (opts.upright) {
      // ---- 直立牛（T-pose）----
      var body = makeBox(1.15, 0.85, 0.62, bodyC, null, jit(), 1.15 + jit(), jit());
      group.add(body);
      var chest = makeBox(0.5, 0.75, 0.5, bodyC, [0, 0, 0.12], 0, 1.35, 0.45);
      group.add(chest);
      var head = makeBox(0.52, 0.44, 0.52, bodyC, [0.05, 0, 0], jit(), 1.82, 0.72);
      group.add(head);
      var snout = makeBox(0.3, 0.26, 0.34, 0xe8dcc8, [0, 0, 0], 0, 1.76, 1.0);
      group.add(snout);
      // 眼
      var eyeL = makeBox(0.07, 0.07, 0.03, 0x1a1a1a, null, -0.14, 1.92, 0.92);
      var eyeR = makeBox(0.07, 0.07, 0.03, 0x1a1a1a, null, 0.14, 1.92, 0.92);
      group.add(eyeL); group.add(eyeR);
      // 固定微笑（官方微笑：一条白色斜条）
      var smile = makeBox(0.14, 0.03, 0.02, 0xffffff, [0, 0, 0.5], 0, 1.68, 1.04);
      group.add(smile);
      // 耳
      var earL = makeBox(0.16, 0.1, 0.04, bodyC, [0.3, 0, 0], -0.3, 1.95, 0.5);
      var earR = makeBox(0.16, 0.1, 0.04, bodyC, [-0.3, 0, 0], 0.3, 1.95, 0.5);
      group.add(earL); group.add(earR); parts.ears = [earL, earR];
      // 角（部分牛有）
      if (opts.horns !== false && R() > 0.3) {
        var hornL = makeBox(0.08, 0.18, 0.08, 0xeee8dc, [0, 0, -0.35], -0.16, 2.06, 0.62);
        var hornR = makeBox(0.08, 0.18, 0.08, 0xeee8dc, [0, 0, 0.35], 0.16, 2.06, 0.62);
        group.add(hornL); group.add(hornR);
      }
      // 后腿（走路摆动）
      var legL = makeBox(0.24, 0.8, 0.28, bodyC, null, -0.32, 0.42, -0.2);
      var legR = makeBox(0.24, 0.8, 0.28, bodyC, null, 0.32, 0.42, -0.2);
      legL.position.x += jit(); legR.position.x += jit();
      group.add(legL); group.add(legR); parts.legs = [legL, legR];
      // 前腿 T-pose（水平张开，微扇动 = 手搓摆不出第二个姿势）
      var armL = makeBox(0.9, 0.2, 0.2, bodyC, [0, 0, 0.12], -0.9, 1.05, 0.45);
      var armR = makeBox(0.9, 0.2, 0.2, bodyC, [0, 0, -0.12], 0.9, 1.05, 0.45);
      group.add(armL); group.add(armR); parts.front = [armL, armR];
      // 尾
      var tail = makeBox(0.08, 0.5, 0.08, bodyC, [0.25, 0, 0], 0, 1.2, -0.45);
      group.add(tail); parts.tail = tail;
      // 花斑
      var patch = makeBox(0.5, 0.2, 0.4, patchC, null, 0, 1.55, 0.1);
      group.add(patch);
    } else {
      // ---- 爬行牛（四脚着地，同手同脚）----
      var body = makeBox(1.5, 0.68, 0.72, bodyC, null, jit(), 0.6 + jit(), jit());
      group.add(body);
      var head = makeBox(0.48, 0.42, 0.5, bodyC, [0.06, 0, 0], jit(), 0.58, 0.95);
      group.add(head);
      var snout = makeBox(0.3, 0.24, 0.34, 0xe8dcc8, [0, 0, 0], 0, 0.52, 1.2);
      group.add(snout);
      var eyeL = makeBox(0.07, 0.07, 0.03, 0x1a1a1a, null, -0.13, 0.68, 1.12);
      var eyeR = makeBox(0.07, 0.07, 0.03, 0x1a1a1a, null, 0.13, 0.68, 1.12);
      group.add(eyeL); group.add(eyeR);
      var smile = makeBox(0.14, 0.03, 0.02, 0xffffff, [0, 0, 0.5], 0, 0.44, 1.24);
      group.add(smile);
      var earL = makeBox(0.16, 0.1, 0.04, bodyC, [0.35, 0, 0], -0.28, 0.72, 0.8);
      var earR = makeBox(0.16, 0.1, 0.04, bodyC, [-0.35, 0, 0], 0.28, 0.72, 0.8);
      group.add(earL); group.add(earR); parts.ears = [earL, earR];
      if (opts.horns !== false && R() > 0.3) {
        var hornL = makeBox(0.07, 0.16, 0.07, 0xeee8dc, [0, 0, -0.35], -0.15, 0.82, 0.85);
        var hornR = makeBox(0.07, 0.16, 0.07, 0xeee8dc, [0, 0, 0.35], 0.15, 0.82, 0.85);
        group.add(hornL); group.add(hornR);
      }
      // 四条腿：同手同脚（同侧一起摆）
      var legFL = makeBox(0.2, 0.55, 0.24, bodyC, null, -0.42, 0.28, 0.55);
      var legFR = makeBox(0.2, 0.55, 0.24, bodyC, null, 0.42, 0.28, 0.55);
      var legBL = makeBox(0.2, 0.55, 0.24, bodyC, null, -0.42, 0.28, -0.55);
      var legBR = makeBox(0.2, 0.55, 0.24, bodyC, null, 0.42, 0.28, -0.55);
      [legFL, legFR, legBL, legBR].forEach(function (l) { group.add(l); });
      parts.legs = [legFL, legFR, legBL, legBR];
      var tail = makeBox(0.08, 0.45, 0.08, bodyC, [0.3, 0, 0], 0, 0.7, -0.95);
      group.add(tail); parts.tail = tail;
      var patch = makeBox(0.45, 0.16, 0.5, patchC, null, 0, 0.85, 0.15);
      group.add(patch);
    }

    var shadow = shadowDisc(opts.upright ? 0.85 : 0.95);
    group.add(shadow);
    group.scale.setScalar(scale);
    group.userData.jank = jank;

    // 动画
    var phase = R() * 6.28;
    var idleBreath = 0;
    group.userData.update = function (t, moving, speed) {
      var s = (speed || 2.2);
      if (parts.legs) {
        if (moving) {
          parts.legs.forEach(function (l, i) {
            if (opts.upright) {
              l.rotation.x = Math.sin(t * s * 1.4 + phase + i * Math.PI) * 0.45;
            } else {
              // 同手同脚：左侧两条同相位，右侧两条同相位（反相）
              var side = (i === 0 || i === 2) ? 0 : Math.PI;
              l.rotation.x = Math.sin(t * s * 1.4 + phase + side) * 0.5;
            }
          });
          if (parts.front) {
            parts.front.forEach(function (a, i) {
              a.rotation.z = (i === 0 ? 1 : -1) * (0.12 + Math.sin(t * s * 1.4 + phase) * 0.08);
            });
          }
          body.position.y += Math.sin(t * s * 2.8 + phase) * 0.03;
          // 滑步梗：身体轻微前后漂移
          body.position.z += Math.sin(t * s * 1.8 + phase * 2) * 0.01;
        } else {
          parts.legs.forEach(function (l) { l.rotation.x *= 0.8; });
          body.position.y += Math.sin(t * 1.6 + phase) * 0.006; // 呼吸
        }
      }
      if (parts.tail) parts.tail.rotation.z = Math.sin(t * 2.2 + phase) * 0.35;
      if (parts.ears) parts.ears.forEach(function (e, i) {
        e.rotation.z = (i === 0 ? 1 : -1) * Math.sin(t * 2.6 + phase) * 0.08;
      });
    };

    // 嘴部世界坐标（卡片飞出的起点 / 哈气起点）
    group.userData.getMouthPos = function () {
      var p = new THREE.Vector3(0, opts.upright ? 1.7 : 0.55, opts.upright ? 1.05 : 1.25);
      group.localToWorld(p);
      return p;
    };

    return group;
  }

  /* ---------- 耄耋（老猫，坐着，戴老花镜） ---------- */
  function makeCat(opts) {
    opts = opts || {};
    var R = rng(opts.seed || 44);
    var gray = opts.colors ? opts.colors.body : 0x9a9a92;
    var cream = opts.colors ? opts.colors.patch : 0xe8e2d8;
    var group = new THREE.Group();
    var jit = function (a) { return (R() - 0.5) * 0.05; };
    var state = { awake: false, eyeMeshes: [] };

    // 身体（坐着）
    var body = makeBox(0.55, 0.5, 0.5, gray, [0.1, 0, 0], jit(), 0.6, jit());
    group.add(body);
    // 白肚皮
    var belly = makeBox(0.3, 0.34, 0.1, cream, [0.1, 0, 0], 0, 0.55, 0.24);
    group.add(belly);
    // 头
    var head = makeBox(0.4, 0.36, 0.38, gray, [0.08, 0, 0], jit(), 1.02, jit());
    group.add(head);
    // 耳
    var earL = makeBox(0.12, 0.14, 0.1, gray, [0, 0, -0.4], -0.14, 1.24, -0.05);
    var earR = makeBox(0.12, 0.14, 0.1, gray, [0, 0, 0.4], 0.14, 1.24, -0.05);
    var earInL = makeBox(0.07, 0.08, 0.06, 0xc8a0a0, [0, 0, -0.4], -0.14, 1.24, -0.05);
    var earInR = makeBox(0.07, 0.08, 0.06, 0xc8a0a0, [0, 0, 0.4], 0.14, 1.24, -0.05);
    [earL, earR, earInL, earInR].forEach(function (m) { group.add(m); });
    // 眼睛：闭眼 = 白色细条；睁眼 = 黑方块
    var eyeL = makeBox(0.09, 0.03, 0.02, 0xffffff, [0, 0, 0], -0.09, 1.1, 0.18);
    var eyeR = makeBox(0.09, 0.03, 0.02, 0xffffff, [0, 0, 0], 0.09, 1.1, 0.18);
    group.add(eyeL); group.add(eyeR);
    state.eyeMeshes = [eyeL, eyeR];
    // 老花镜（两块小圆片 + 镜腿 = 方块）
    var lensL = makeBox(0.12, 0.12, 0.02, 0xbfe3ff, null, -0.09, 1.08, 0.2);
    var lensR = makeBox(0.12, 0.12, 0.02, 0xbfe3ff, null, 0.09, 1.08, 0.2);
    var bridge = makeBox(0.14, 0.02, 0.02, 0x5a4a3a, null, 0, 1.12, 0.2);
    group.add(lensL); group.add(lensR); group.add(bridge);
    // 胡须（耷拉）
    [1, 2].forEach(function (i) {
      var wL = makeBox(0.3, 0.012, 0.012, 0xddd8cc, [0, 0, 0.5], -0.3, 1.0 - i * 0.05, 0.12);
      var wR = makeBox(0.3, 0.012, 0.012, 0xddd8cc, [0, 0, -0.5], 0.3, 1.0 - i * 0.05, 0.12);
      group.add(wL); group.add(wR);
    });
    // 尾巴（绕到身前）
    var tail = makeBox(0.08, 0.4, 0.08, gray, [0.5, 0, 0], 0, 0.3, 0.28);
    group.add(tail);
    // 影子
    var shadow = shadowDisc(0.6);
    group.add(shadow);
    group.scale.setScalar(opts.scale || 1);

    // 呼吸
    group.userData.update = function (t) {
      body.scale.y = 1 + Math.sin(t * 1.4) * 0.015;
      head.rotation.z = Math.sin(t * 1.4 + 0.5) * 0.04;
      tail.rotation.z = Math.sin(t * 1.1) * 0.12;
    };

    group.userData.wake = function () {
      state.awake = true;
      state.eyeMeshes.forEach(function (m) {
        m.scale.set(1, 3, 1);            // 变圆（睁眼）
        m.material.color.setHex(0x1a1a1a);
      });
    };
    group.userData.isAwake = function () { return state.awake; };

    group.userData.getMouthPos = function () {
      var p = new THREE.Vector3(0, 0.95, 0.2);
      group.localToWorld(p);
      return p;
    };

    return group;
  }

  /* ---------- 方块蛇（手搓物理：只会直着冲，不会转弯） ---------- */
  function makeSnake() {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x8a8a8a });
    var bellyMat = new THREE.MeshLambertMaterial({ color: 0xc8c8b8 });
    var tongueMat = new THREE.MeshLambertMaterial({ color: 0xd04a3a });
    var segs = [];
    for (var i = 0; i < 7; i++) {
      var s = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), bodyMat);
      s.position.set(0, 0.17, -i * 0.3);
      group.add(s);
      segs.push(s);
    }
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.4), bodyMat);
    head.position.set(0, 0.19, 0.28);
    group.add(head);
    var eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
    eyeL.position.set(-0.12, 0.3, 0.46);
    group.add(eyeL);
    var eyeR = eyeL.clone();
    eyeR.position.x = 0.12;
    group.add(eyeR);
    var tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.3), tongueMat);
    tongue.position.set(0, 0.14, 0.55);
    group.add(tongue);
    var belly = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 2.4), bellyMat);
    belly.position.set(0, 0.02, -0.85);
    group.add(belly);
    var shadow = shadowDisc(1.0);
    group.add(shadow);

    group.userData.update = function (t, phase) {
      segs.forEach(function (s, i) {
        s.position.y = 0.17 + Math.sin(t * 6 + i * 0.9) * 0.03;
        s.rotation.y = Math.sin(t * 3 + i * 0.7) * 0.12;
      });
      tongue.position.z = 0.55 + (phase === 'chase' ? 0.12 : 0);
    };
    return group;
  }

  /* ============================================================
   * 奇奇怪怪生物团（M2d）—— 全是方块拼装，低模手搓风
   * 每个工厂返回 { group, update(t, extra), getMouthPos() }
   * ============================================================ */
  function bx(w, h, d, color, x, y, z, rx, ry, rz) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x || 0, y || 0, z || 0);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    return m;
  }
  function creatureBase(scale) {
    var g = new THREE.Group();
    g.scale.setScalar(scale || 1);
    var sh = shadowDisc(0.7);
    g.add(sh);
    g.userData.getMouthPos = function () {
      var p = new THREE.Vector3(0, 0.9, 0.35);
      g.localToWorld(p);
      return p;
    };
    return g;
  }

  // 奶娃：捧腹大笑的奶白团子（笑到后仰 + 捂肚子）
  function makeNaiwa() {
    var g = creatureBase(0.9);
    var body = bx(0.7, 0.66, 0.6, 0xf0e6d0, 0, 0.55, 0);
    g.add(body);
    var head = bx(0.55, 0.5, 0.5, 0xf0e6d0, 0, 1.18, 0.05, -0.35, 0, 0);
    g.add(head);
    var tuft = bx(0.08, 0.12, 0.08, 0x5a3a2a, 0, 1.5, 0.02);
    g.add(tuft);
    var eyeL = bx(0.06, 0.05, 0.03, 0x2a2a2a, -0.13, 1.28, 0.28);
    var eyeR = bx(0.06, 0.05, 0.03, 0x2a2a2a, 0.13, 1.28, 0.28);
    g.add(eyeL); g.add(eyeR);
    // 双手捂肚子（笑）
    var handL = bx(0.14, 0.14, 0.12, 0xf0e6d0, -0.28, 0.55, 0.2);
    var handR = bx(0.14, 0.14, 0.12, 0xf0e6d0, 0.28, 0.55, 0.2);
    g.add(handL); g.add(handR);
    var mouth = bx(0.16, 0.05, 0.03, 0x8a3a2a, 0, 1.08, 0.27, 0, 0, 0.3);
    g.add(mouth);
    g.userData.update = function (t, extra) {
      body.scale.y = 1 + Math.abs(Math.sin(t * 5)) * 0.08;   // 笑到肚子抖
      head.rotation.z = Math.sin(t * 4.2) * 0.15;
      head.rotation.x = -0.35 + Math.sin(t * 3.4) * 0.08;    // 笑到后仰
      if (extra === 'follow') {
        head.rotation.x = -0.5;                              // 跟班时笑得更猛
        body.scale.y = 1 + Math.abs(Math.sin(t * 7)) * 0.12;
      }
    };
    return g;
  }

  // 卡皮巴拉：情绪稳定水豚（泡水里）
  function makeKapybara() {
    var g = creatureBase(1.0);
    var body = bx(1.15, 0.6, 0.72, 0x8a6a42, 0, 0.25, 0);
    g.add(body);
    var head = bx(0.42, 0.36, 0.4, 0x8a6a42, 0, 0.62, 0.35);
    g.add(head);
    var nose = bx(0.18, 0.08, 0.14, 0x5a3a22, 0, 0.62, 0.56);
    g.add(nose);
    var eyeL = bx(0.05, 0.05, 0.03, 0x1a1a1a, -0.12, 0.72, 0.5);
    var eyeR = bx(0.05, 0.05, 0.03, 0x1a1a1a, 0.12, 0.72, 0.5);
    g.add(eyeL); g.add(eyeR);
    var earL = bx(0.08, 0.06, 0.04, 0x6a4e2c, -0.2, 0.82, 0.3);
    var earR = bx(0.08, 0.06, 0.04, 0x6a4e2c, 0.2, 0.82, 0.3);
    g.add(earL); g.add(earR);
    g.userData.update = function (t) {
      body.scale.y = 1 + Math.sin(t * 1.2) * 0.02;   // 深呼吸
      head.rotation.y = Math.sin(t * 0.4) * 0.15;    // 偶尔缓缓转头
    };
    return g;
  }

  // 菜狗：卷心菜包裹的方块狗
  function makeCaigou() {
    var g = creatureBase(0.95);
    var body = bx(0.8, 0.6, 0.7, 0x5f9e4a, 0, 0.42, 0);
    g.add(body);
    // 菜叶（头周围的叶片）
    [-0.5, 0.5].forEach(function (s) {
      g.add(bx(0.1, 0.5, 0.72, 0x4a8e3a, s * 0.45, 0.5, 0, 0, 0, s * -0.3));
      g.add(bx(0.8, 0.5, 0.1, 0x4a8e3a, 0, 0.5, s * 0.4, 0, s * 0.3, 0));
    });
    var head = bx(0.36, 0.34, 0.36, 0x6fae5a, 0, 0.85, 0.42);
    g.add(head);
    var eyeL = bx(0.05, 0.05, 0.03, 0x1a1a1a, -0.1, 0.9, 0.6);
    var eyeR = bx(0.05, 0.05, 0.03, 0x1a1a1a, 0.1, 0.9, 0.6);
    g.add(eyeL); g.add(eyeR);
    var nose = bx(0.08, 0.06, 0.04, 0x2a1a1a, 0, 0.82, 0.6);
    g.add(nose);
    var tail = bx(0.08, 0.2, 0.08, 0x5f9e4a, 0, 0.55, -0.45, 0.4, 0, 0);
    g.add(tail);
    g.userData.update = function (t) {
      tail.rotation.z = Math.sin(t * 3) * 0.3;
      head.rotation.y = Math.sin(t * 1.5) * 0.1;
    };
    return g;
  }

  // 尖叫鸡：黄色橡胶鸡，嘴是按钮
  function makeJianjiaoji() {
    var g = creatureBase(0.95);
    var body = bx(0.55, 0.7, 0.55, 0xffd23a, 0, 0.55, 0);
    g.add(body);
    var head = bx(0.34, 0.3, 0.34, 0xffd23a, 0, 1.05, 0.08);
    g.add(head);
    var comb = bx(0.1, 0.14, 0.06, 0xd03a2a, 0, 1.28, 0.08);
    g.add(comb);
    var beak = bx(0.2, 0.12, 0.16, 0xff8a2a, 0, 1.0, 0.26);
    g.add(beak);
    var button = bx(0.14, 0.06, 0.1, 0xd03a2a, 0, 1.05, 0.36);
    g.add(button);
    var eyeL = bx(0.05, 0.06, 0.03, 0x1a1a1a, -0.1, 1.14, 0.24);
    var eyeR = bx(0.05, 0.06, 0.03, 0x1a1a1a, 0.1, 1.14, 0.24);
    g.add(eyeL); g.add(eyeR);
    var wingL = bx(0.14, 0.3, 0.06, 0xffc020, -0.4, 0.55, 0, 0, 0, -0.2);
    var wingR = bx(0.14, 0.3, 0.06, 0xffc020, 0.4, 0.55, 0, 0, 0, 0.2);
    g.add(wingL); g.add(wingR);
    g.userData.update = function (t) {
      body.scale.y = 1 + Math.sin(t * 2.2) * 0.03;
      wingL.rotation.z = Math.sin(t * 3) * 0.08 - 0.2;
      wingR.rotation.z = -Math.sin(t * 3) * 0.08 + 0.2;
    };
    return g;
  }

  // 吗喽：搬砖的打工人
  function makeMalou() {
    var g = creatureBase(0.95);
    var body = bx(0.5, 0.55, 0.45, 0x8a7a6a, 0, 0.55, 0);
    g.add(body);
    var head = bx(0.4, 0.38, 0.4, 0x9a8a7a, 0, 1.0, 0);
    g.add(head);
    var face = bx(0.26, 0.24, 0.06, 0xc8b8a0, 0, 1.0, 0.22);
    g.add(face);
    var eyeL = bx(0.05, 0.05, 0.03, 0x1a1a1a, -0.07, 1.06, 0.25);
    var eyeR = bx(0.05, 0.05, 0.03, 0x1a1a1a, 0.07, 1.06, 0.25);
    g.add(eyeL); g.add(eyeR);
    var brick = bx(0.42, 0.22, 0.26, 0xc88a4a, 0, 0.5, 0.3);
    g.add(brick);
    var armL = bx(0.14, 0.3, 0.12, 0x8a7a6a, -0.3, 0.62, 0.28, 0, 0, 0.4);
    var armR = bx(0.14, 0.3, 0.12, 0x8a7a6a, 0.3, 0.62, 0.28, 0, 0, -0.4);
    g.add(armL); g.add(armR);
    var tail = bx(0.06, 0.3, 0.06, 0x8a7a6a, 0, 0.7, -0.3, 0.5, 0, 0);
    g.add(tail);
    g.userData.update = function (t) {
      body.position.y = 0.55 + Math.abs(Math.sin(t * 2.4)) * 0.06; // 搬砖颠颠
      tail.rotation.x = 0.5 + Math.sin(t * 2) * 0.15;
    };
    return g;
  }

  // 绿头鱼：头占 80% 的大头鱼（头套）
  function makeLvouyu() {
    var g = creatureBase(1.0);
    var head = bx(0.85, 0.8, 0.85, 0x3a9e5a, 0, 0.85, 0);
    g.add(head);
    var eyeL = bx(0.16, 0.16, 0.05, 0xffffff, -0.2, 1.0, 0.42);
    var eyeR = bx(0.16, 0.16, 0.05, 0xffffff, 0.2, 1.0, 0.42);
    g.add(eyeL); g.add(eyeR);
    var pupL = bx(0.07, 0.07, 0.04, 0x1a1a1a, -0.2, 1.0, 0.46);
    var pupR = bx(0.07, 0.07, 0.04, 0x1a1a1a, 0.2, 1.0, 0.46);
    g.add(pupL); g.add(pupR);
    var mouth = bx(0.2, 0.06, 0.05, 0x2a2a2a, 0, 0.68, 0.42);
    g.add(mouth);
    var tail = bx(0.3, 0.12, 0.2, 0x3a9e5a, 0, 0.3, -0.6);
    g.add(tail);
    g.userData.update = function (t) {
      head.position.y = 0.85 + Math.sin(t * 2) * 0.02;
      tail.rotation.y = Math.sin(t * 2.4) * 0.25;
    };
    return g;
  }

  // 修勾：流泪小狗（眼泪常挂）
  function makeXiugou() {
    var g = creatureBase(0.95);
    var body = bx(0.8, 0.55, 0.5, 0xd8c8a8, 0, 0.4, 0);
    g.add(body);
    var head = bx(0.42, 0.4, 0.4, 0xd8c8a8, 0, 0.82, 0.28);
    g.add(head);
    var earL = bx(0.1, 0.16, 0.08, 0xb8a888, -0.22, 1.0, 0.2, -0.3, 0, 0);
    var earR = bx(0.1, 0.16, 0.08, 0xb8a888, 0.22, 1.0, 0.2, 0.3, 0, 0);
    g.add(earL); g.add(earR);
    var eyeL = bx(0.07, 0.06, 0.03, 0x1a1a1a, -0.12, 0.92, 0.46);
    var eyeR = bx(0.07, 0.06, 0.03, 0x1a1a1a, 0.12, 0.92, 0.46);
    g.add(eyeL); g.add(eyeR);
    // 两滴眼泪（半透明浅蓝）
    var tearMat = new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.75 });
    var tearL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.04), tearMat);
    tearL.position.set(-0.14, 0.78, 0.46);
    var tearR = tearL.clone();
    tearR.position.x = 0.14;
    g.add(tearL); g.add(tearR);
    var nose = bx(0.08, 0.06, 0.04, 0x2a1a1a, 0, 0.72, 0.46);
    g.add(nose);
    var tail = bx(0.06, 0.18, 0.06, 0xd8c8a8, 0, 0.5, -0.28, -0.5, 0, 0);
    g.add(tail);
    g.userData.update = function (t) {
      tail.rotation.x = -0.5 - Math.sin(t * 2.4) * 0.1;
      head.rotation.y = Math.sin(t * 1.2) * 0.08;      // 抽泣摇头
    };
    return g;
  }

  // 猪猪侠：粉猪 + 红披风
  function makeZhuzhu() {
    var g = creatureBase(1.0);
    var body = bx(0.7, 0.62, 0.6, 0xf0a8b8, 0, 1.0, 0);
    g.add(body);
    var head = bx(0.5, 0.46, 0.48, 0xf0a8b8, 0, 1.45, 0.1);
    g.add(head);
    var snout = bx(0.22, 0.16, 0.1, 0xe890a0, 0, 1.42, 0.35);
    g.add(snout);
    var earL = bx(0.1, 0.1, 0.04, 0xf0a8b8, -0.2, 1.7, 0.05, 0, 0, -0.3);
    var earR = bx(0.1, 0.1, 0.04, 0xf0a8b8, 0.2, 1.7, 0.05, 0, 0, 0.3);
    g.add(earL); g.add(earR);
    // 红披风
    var cape = bx(0.8, 0.5, 0.06, 0xd03a3a, 0, 0.95, -0.28, 0, 0, 0.1);
    g.add(cape);
    var legL = bx(0.18, 0.4, 0.18, 0xf0a8b8, -0.2, 0.4, 0.1);
    var legR = bx(0.18, 0.4, 0.18, 0xf0a8b8, 0.2, 0.4, 0.1);
    g.add(legL); g.add(legR);
    g.userData.update = function (t) {
      cape.rotation.z = 0.1 + Math.sin(t * 2) * 0.05;  // 披风飘
      body.scale.y = 1 + Math.sin(t * 1.8) * 0.02;
    };
    return g;
  }

  // 大熊猫花花：啃竹子
  function makeHuahua() {
    var g = creatureBase(1.1);
    var body = bx(0.9, 0.85, 0.85, 0xf2f2f2, 0, 0.7, 0);
    g.add(body);
    var head = bx(0.6, 0.55, 0.55, 0xf2f2f2, 0, 1.35, 0.05);
    g.add(head);
    var patchL = bx(0.16, 0.14, 0.05, 0x1a1a1a, -0.2, 1.42, 0.3);
    var patchR = bx(0.16, 0.14, 0.05, 0x1a1a1a, 0.2, 1.42, 0.3);
    g.add(patchL); g.add(patchR);
    var earL = bx(0.16, 0.14, 0.08, 0x1a1a1a, -0.28, 1.62, 0.02);
    var earR = bx(0.16, 0.14, 0.08, 0x1a1a1a, 0.28, 1.62, 0.02);
    g.add(earL); g.add(earR);
    var armL = bx(0.2, 0.5, 0.2, 0x1a1a1a, -0.45, 0.65, 0.2, 0.3, 0, 0);
    var armR = bx(0.2, 0.5, 0.2, 0x1a1a1a, 0.45, 0.65, 0.2, -0.3, 0, 0);
    g.add(armL); g.add(armR);
    // 竹子（绿色细条）
    var bamboo = bx(0.09, 0.9, 0.09, 0x3a9e5a, 0, 1.15, 0.35, 0.2, 0, 0);
    g.add(bamboo);
    g.userData.update = function (t) {
      head.rotation.z = Math.sin(t * 1.6) * 0.06;      // 慢慢嚼
      bamboo.rotation.x = 0.2 + Math.sin(t * 2) * 0.05;
    };
    return g;
  }

  // 隐藏怪：网线管里的哈气生物（耄耋远亲）
  function makeHaqimiao() {
    var g = creatureBase(0.8);
    var body = bx(0.5, 0.46, 0.5, 0x9a9a92, 0, 0.45, 0);
    g.add(body);
    var head = bx(0.4, 0.38, 0.4, 0x9a9a92, 0, 0.92, 0);
    g.add(head);
    var earL = bx(0.12, 0.12, 0.08, 0x9a9a92, -0.16, 1.16, -0.02, 0, 0, -0.4);
    var earR = bx(0.12, 0.12, 0.08, 0x9a9a92, 0.16, 1.16, -0.02, 0, 0, 0.4);
    g.add(earL); g.add(earR);
    var eyeL = bx(0.06, 0.03, 0.02, 0xffffff, -0.1, 0.98, 0.2);
    var eyeR = bx(0.06, 0.03, 0.02, 0xffffff, 0.1, 0.98, 0.2);
    g.add(eyeL); g.add(eyeR);
    var tail = bx(0.06, 0.3, 0.06, 0x9a9a92, 0, 0.3, 0.3, 0.6, 0, 0);
    g.add(tail);
    g.userData.update = function (t) {
      body.scale.y = 1 + Math.sin(t * 1.4) * 0.02;
      tail.rotation.x = 0.6 + Math.sin(t * 1.8) * 0.1;
    };
    return g;
  }

  // 统一入口
  window.makeCreature = function (kind, seed) {
    var map = {
      baby: makeNaiwa, kapybara: makeKapybara, caigou: makeCaigou,
      jianjiaoji: makeJianjiaoji, malou: makeMalou, lvouyu: makeLvouyu,
      xiugou: makeXiugou, zhuzhu: makeZhuzhu, huahua: makeHuahua,
      haqimiao: makeHaqimiao
    };
    var fn = map[kind] || makeCaigou;
    var g = fn();
    if (seed !== undefined) g.rotation.y = (seed % 360) * Math.PI / 180;
    return g;
  };

  window.makeCow = makeCow;
  window.makeCat = makeCat;
  window.makeSnake = makeSnake;
})();
