# 副本开发指南（Dungeon Plugin Guide）

> 给开发者用的：**写一个副本模块 → 挂载 → PR 上来，主线的副本广场就会出现你的副本**，玩家直接能玩到。
> 本文档假定你完全不懂这些也行——照抄模板改就行。

## 副本是什么

副本（dungeon）是一个**自包含的游戏内容模块**：栅栏、房子、NPC、机关……随便什么。挂载后，它和它的传送门会出现在主线的**副本广场**（地图东北方，坐标约 12, 20）。

玩家走到传送门按 **E** 就进入副本（传送到副本内部）。

## 最简单的流程

1. 打开 [`src/dungeons.js`](../src/dungeons.js)，在 `REGISTRY` 里加一个条目（键名就是挂载文件名）
2. 写好 `build(api)` 返回一个 `THREE.Group`（里面的模型就是你的副本）
3. 跑冒烟测试（可选）：`cd test && npm install && npm run smoke`
4. 开分支 → PR（base 选 main，记得附动图，见 [CONTRIBUTING.md](CONTRIBUTING.md)）

## 模板（复制这个改）

```js
// src/dungeons.js 的 REGISTRY 里加：
'你的副本.sh': {          // 键名 = 终端里的挂载文件名（如 mydungeon.sh）
  name: '副本显示名',      // 传送门牌子上、终端 ls 里显示的名字
  desc: '一句话介绍',      // cat 文件时 / 进入副本时显示
  build: function (api) {
    // api: { scene, pos: {x, z}（本副本在广场的坐标）, makeSignTex(lines,w,h,bg,fg) }
    var g = new THREE.Group();
    g.position.set(api.pos.x, 0, api.pos.z);   // 定位到广场自己的格子
    // —— 在这里用 THREE 造你的副本内容，全部 add 进 g ——
    // 例：一个方块
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshLambertMaterial({ color: 0xff6633 })));
    // 例：一个告示牌（文字贴图）
    var sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.1),
      new THREE.MeshBasicMaterial({ map: api.makeSignTex(['副本名', '副标题'], 256, 96, '#2a4a2a', '#ffe89a') }));
    sign.position.set(0, 2.5, 0);
    g.add(sign);
    return g;   // 挂载时自动加入场景，卸载时自动移除
  }
}
```

## 副本自带动画（可选）

想让副本里的东西动起来（老师踱步、风扇转、草摇……）？给返回的 group 加一个 `userData.update`：

```js
g.userData.update = function (t) {
  // 每帧调用；t 是游戏时间（变速齿轮会影响它）
  myCow.rotation.y = -0.5 + Math.sin(t * 1.2) * 0.1;   // 左右转
};
```

框架会在主循环里自动调用所有已挂载副本的 `update(t)`，卸载时自动停止。

## api 有什么

| 成员 | 说明 |
|---|---|
| `api.scene` | 游戏主场景（一般用不到，你返回的 group 会被自动加进去） |
| `api.pos` | 本副本在副本广场的格子坐标 `{x, z}`（group 用 `g.position.set(api.pos.x, 0, api.pos.z)` 定位） |
| `api.makeSignTex(lines, w, h, bg, fg)` | 造文字贴图：`lines` 是字符串数组（每行一句），`bg`/`fg` 是十六进制颜色字符串 |

## 可以用的全局工厂（都开着）

- `window.makeCow({upright, crawl, seed, colors})` — 方块牛
- `window.makeCat({seed})` — 耄耋同款老猫
- `window.makeSnake()` — 方块蛇
- `window.makeCreature(kind, seed)` — 奶娃/卡皮巴拉/菜狗……（kind 见 src/cow.js）
- `THREE` 全家桶：`THREE.BoxGeometry / CylinderGeometry / TorusGeometry / MeshLambertMaterial / MeshBasicMaterial`……

## 终端操作（给测试用的）

游戏里按 `:` 开隐藏终端（输入无回显），挂载/卸载副本：

```
$ ls /dungeons     # 看当前挂载的副本
$ mount 你的副本.sh # 挂载 → 副本广场出现传送门
$ rm 你的副本.sh   # 卸载 → 传送门和内容消失
$ cat 你的副本.sh  # 看副本介绍
```

## 注意

- 副本内容**必须全部放进返回的 group**，不要直接往 scene 里 add——不然卸载时清不掉
- 不要在 `build` 里用 `window.Game.state` 之外的外部闭包变量（副本要能独立挂载/卸载）
- 名字别用 `/`、`..` 等路径字符（它要当文件名用）
- 记得：**本项目 CC0 公有领域**，你贡献的副本也一并公有化
