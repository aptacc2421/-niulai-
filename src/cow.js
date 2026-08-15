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

  window.makeCow = makeCow;
  window.makeCat = makeCat;
  window.makeSnake = makeSnake;
})();
