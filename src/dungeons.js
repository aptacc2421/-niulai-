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
