/* ============================================================
 * 直立牛平原 —— 副本插件系统（给开发者用）
 *
 * 玩法：往 REGISTRY 加一个条目 = 一个新副本（键名 = 挂载文件名）
 * 挂载后：副本内容 + 传送门会出现在主线的【副本广场】
 * 终端里：mount <文件名> 挂载 / rm <文件名> 卸载 / ./<文件名> 查看
 * 开发者模板见 docs/DUNGEON.md，写好 PR 上来即可。
 *
 * 副本模块格式：
 *   'xxx.sh': {
 *     name: '副本显示名',
 *     desc: '一句话介绍（cat 时显示 / 进入副本时提示）',
 *     build: function (api) {
 *       // api: { scene, pos:{x,z}, makeSignTex(lines,w,h,bg,fg) }
 *       // 返回一个 THREE.Group（会被加到场景，卸载时自动移除）
 *     }
 *   }
 * ============================================================ */
(function () {
  'use strict';

  var REGISTRY = {
    // ---- 演示副本：牛来后花园（开发者请复制我当模板） ----
    'garden.sh': {
      name: '牛来后花园',
      desc: '演示副本：一圈栅栏 + 八朵花 + 一头看门牛。复制这个模板，写出你的副本吧。',
      build: function (api) {
        var g = new THREE.Group();
        g.position.set(api.pos.x, 0, api.pos.z);
        var fenceMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
        var flowerMat = new THREE.MeshLambertMaterial({ color: 0xff9ec8 });
        var stemMat = new THREE.MeshLambertMaterial({ color: 0x3a8e3a });
        // 围栏
        for (var i = 0; i < 8; i++) {
          var a = i / 8 * Math.PI * 2;
          var post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), fenceMat);
          post.position.set(Math.cos(a) * 3, 0.6, Math.sin(a) * 3);
          g.add(post);
        }
        // 花
        for (var j = 0; j < 8; j++) {
          var fa = j / 8 * Math.PI * 2 + 0.4;
          var stem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), stemMat);
          stem.position.set(Math.cos(fa) * 2.2, 0.2, Math.sin(fa) * 2.2);
          g.add(stem);
          var fl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), flowerMat);
          fl.position.set(Math.cos(fa) * 2.2, 0.42, Math.sin(fa) * 2.2);
          g.add(fl);
        }
        // 看门牛（复用模型工厂）
        if (window.makeCow) {
          var cow = window.makeCow({ upright: true, crawl: false, seed: 123, colors: { body: 0x8a6a4a, patch: 0x5a4a3a } });
          cow.position.set(0, 0, 0.5);
          g.add(cow);
        }
        // 牌子
        var sign = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 1.2, 0.1),
          new THREE.MeshBasicMaterial({ map: api.makeSignTex(['牛来后花园', '（演示副本）'], 256, 96, '#2a4a2a', '#ffe89a') })
        );
        sign.position.set(0, 2.2, -2.7);
        g.add(sign);
        var post2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), fenceMat);
        post2.position.set(0, 0.65, -2.7);
        g.add(post2);
        return g;
      }
    },

    // ---- 中式教育体验馆（玩梗副本，请勿当真） ----
    'edu.sh': {
      name: '中式教育体验馆',
      desc: '书山有路勤为径，题海无涯苦作舟。\n在这里重温被《五年高考三年模拟》支配的恐惧。（纯玩梗，学累了就出来吧）',
      build: function (api) {
        var g = new THREE.Group();
        g.position.set(api.pos.x, 0, api.pos.z);
        var wood = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
        var deskMat = new THREE.MeshLambertMaterial({ color: 0xa08050 });
        var paperMat = new THREE.MeshLambertMaterial({ color: 0xf0ece0 });
        // 黑板（今日作业）
        var board = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 0.15),
          new THREE.MeshBasicMaterial({ map: api.makeSignTex(['今日作业', '《五年高考三年模拟》第 1-500 页', '明天交'], 256, 128, '#1a3a2a', '#e8f0d8') }));
        board.position.set(0, 2.4, -3.3);
        g.add(board);
        [-2.4, 2.4].forEach(function (lx) {
          var leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), wood);
          leg.position.set(lx, 0.6, -3.3);
          g.add(leg);
        });
        // 衡水名言（黑板顶上）
        var motto = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 0.1),
          new THREE.MeshBasicMaterial({ map: api.makeSignTex(['只要学不死', '就往死里学'], 256, 80, '#4a2a1a', '#ffe89a') }));
        motto.position.set(0, 3.5, -3.25);
        g.add(motto);
        // 两排课桌：每桌一摞卷子 + 一本五三
        for (var r = 0; r < 2; r++) {
          for (var c = 0; c < 3; c++) {
            var dx = (c - 1) * 1.7, dz = 0.9 + r * 1.7;
            var desk = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.8, 0.6), deskMat);
            desk.position.set(dx, 0.4, dz); g.add(desk);
            var papers = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.72), paperMat);
            papers.position.set(dx, 0.9, dz); g.add(papers);
            var book = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.12),
              new THREE.MeshLambertMaterial({ color: 0xc03a2a }));
            book.position.set(dx, 1.14, dz); g.add(book);
          }
        }
        // 老师牛（持教鞭踱步）+ 学霸牛（埋头刷题，一点一点）
        var teacher = null, nerd = null, pointer = null;
        if (window.makeCow) {
          teacher = window.makeCow({ upright: true, crawl: false, seed: 999, colors: { body: 0x5a5a6a, patch: 0x3a3a4a } });
          teacher.position.set(-1.6, 0, -1.8);
          teacher.rotation.y = -0.5;
          g.add(teacher);
          pointer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.6), wood);
          pointer.position.set(-0.7, 1.5, -2.4);
          g.add(pointer);
          nerd = window.makeCow({ upright: false, crawl: true, seed: 777, colors: { body: 0xd8c8a0, patch: 0x9a8a6a } });
          nerd.position.set(1.7, 0, 1.0);
          g.add(nerd);
        }
        // 书山（书山有路勤为径）
        var bookCols = [0x3a7a3a, 0x7a5a3a, 0x3a5a8a, 0x8a3a3a];
        var bn = 0;
        for (var layer = 0; layer < 4; layer++) {
          for (var bx2 = -layer; bx2 <= layer; bx2 += 0.9) {
            var book2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 1.1),
              new THREE.MeshLambertMaterial({ color: bookCols[bn++ % 4] }));
            book2.position.set(bx2, 0.12 + layer * 0.24, 3.2);
            g.add(book2);
          }
        }
        var sign1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 0.1),
          new THREE.MeshBasicMaterial({ map: api.makeSignTex(['书山有路', '勤为径'], 256, 96, '#2a4a2a', '#ffe89a') }));
        sign1.position.set(0, 2.7, 3.2);
        g.add(sign1);
        // 题海（题海无涯苦作舟）
        var sea = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshLambertMaterial({ color: 0x5a8ec8 }));
        sea.rotation.x = -Math.PI / 2;
        sea.position.set(3.1, 0.05, -1.2);
        g.add(sea);
        var sign2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 0.1),
          new THREE.MeshBasicMaterial({ map: api.makeSignTex(['题海无涯', '苦作舟'], 256, 96, '#1a3a5a', '#cfd8e8') }));
        sign2.position.set(3.1, 1.7, 0.8);
        g.add(sign2);
        // 高考倒计时
        var count = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.1),
          new THREE.MeshBasicMaterial({ map: api.makeSignTex(['距离高考还有', '0 天', '（每天都在倒计时）'], 256, 96, '#5a1a1a', '#ffe89a') }));
        count.position.set(-3.1, 2.2, -0.6);
        g.add(count);
        // 动画：老师踱步/教鞭指来指去/学霸点头刷题
        g.userData.update = function (t) {
          if (teacher) {
            teacher.rotation.y = -0.5 + Math.sin(t * 1.2) * 0.12;
            pointer.position.x = -0.7 + Math.sin(t * 1.2) * 0.35;
          }
          if (nerd) nerd.rotation.x = Math.sin(t * 3) * 0.06;
        };
        return g;
      }
    }
  };

  // 传送门（副本广场上的入口）
  function buildPortal(scene, name, pos) {
    var g = new THREE.Group();
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.14, 8, 20),
      new THREE.MeshLambertMaterial({ color: 0x3a9ec8, emissive: 0x1a4a6a })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.6;
    g.add(ring);
    var postMat = new THREE.MeshLambertMaterial({ color: 0x5a4a3a });
    var pL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.3, 0.2), postMat);
    pL.position.set(-1.15, 1.15, 0);
    var pR = pL.clone();
    pR.position.x = 1.15;
    g.add(pL); g.add(pR);
    var sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.0, 0.08),
      new THREE.MeshBasicMaterial({ map: window.makeSignTex([name, '（副本）'], 256, 80, '#1a3a4a', '#bfe3ff') })
    );
    sign.position.set(0, 2.8, 0);
    g.add(sign);
    g.position.set(pos.x, 0, pos.z);
    scene.add(g);
    return g;
  }

  window.Dungeons = {
    REGISTRY: REGISTRY,
    buildPortal: buildPortal,
    names: function () { return Object.keys(REGISTRY); }
  };
})();
