/* ============================================================
 * 直立牛平原 M1 —— 数据文件（台词 / 语录卡 / 错别字池 / 配置）
 * 无框架、无构建；本文件定义 window.Data 全局
 * ============================================================ */
(function () {
  'use strict';

  // ---- 语录卡（M2b 后 7 张；完整版 36 张）----
  var CARDS = [
    { id: 'shoucuo',   name: '手搓五年',  type: '暖心', text: '妈妈说：画得再歪也是画，坚持五年就是传奇。', stand: 8 },
    { id: 'mamadongni',name: '妈妈懂你',  type: '暖心', text: '孩子，妈妈不懂动画，妈妈懂你。', stand: 8 },
    { id: 'jiangla',   name: '姜还是老的辣', type: '玄学', text: '哈气都能飘到屋顶，你怕什么站起来。', stand: 8 },
    { id: 'gumin',     name: '别怕站不起来', type: '暖心', text: '别怕站不起来，大 A 都等了这么多年了，不差这一会儿。', stand: 8 },
    { id: 'jiucai',    name: '牛走了，韭菜还在', type: '毒鸡汤', text: '他们说牛来了，我冲进去，然后牛走了。', stand: 3 },
    { id: 'paodekuai', name: '跑得快不如喊得响', type: '暖心', text: '蛇：你跑什么？ 我：你追什么？', stand: 8 },
    { id: 'xuanxue',   name: '牛市会来的', type: '玄学', text: '牛市会来的，就像春天会来，只是这个春天比较……漫长。', stand: 5 }
  ];

  // ---- 错别字池（每 ~18 句随机出现 1 个，粗糙美学）----
  var TYPOS = [
    { from: '票房', to: '票方' },
    { from: '坚持', to: '间持' },
    { from: '动画', to: '动划' },
    { from: '的',   to: '得' }
  ];

  // ---- 耄耋 哈气对话（策划文档 9.5 脚本）----
  var MAODIE_LINES = [
    { who: 'player', text: '老猫，他们说我生下来就站不起来，说牛市来了我也站不起来。' },
    { who: 'maodie', haqi: true, text: '哈——……' },
    { who: 'player', text: '……你是说我确实站不起来？' },
    { who: 'maodie', haqi: true, text: '哈气都能飘到屋顶，你怕什么站起来。' },
    { who: 'player', text: '……？' },
    { who: 'maodie', haqi: true, text: '哈——' },
    { who: 'player', text: '它好像说了什么，又好像什么都没说。', card: 'jiangla', stand: 8 }
  ];

  // ---- 路人牛 随机语录 ----
  var PASSERBY_LINES = [
    '走开走开，别挡道，我是直立牛。',
    '哎，趴着的那头，你妈妈喊你回家吃饭。',
    '今天的草，还是昨天的草。',
    '听说有头牛的电影票房 7705 块，笑死我了。',
    '你趴着不累吗？……哦，你站不起来，打扰了。'
  ];

  // ---- NPC 定义 ----
  var NPCS = [
    {
      id: 'daoyan', name: '导演牛', kind: 'cow', upright: true, crawl: false,
      seed: 11, colors: { body: 0xc8a06a, patch: 0x8a5a2a },
      pos: [-2, 0], rot: 0.4, scale: 1.0,
      lines: [
        { who: 'player', text: '你好，听说你画了五年动画？' },
        { who: 'daoyan', text: '五年，就我和我妈，纯手搓。发行方劝我别上了，我说不行，得上。' },
        { who: 'player', text: '后来呢？' },
        { who: 'daoyan', text: '票房 7705 块。后来……突然就爆了。他们说，烂到抽象也是火。' },
        { who: 'player', text: '那你难过吗？' },
        { who: 'daoyan', text: '我妈说，画得再歪也是画，坚持五年就是传奇。', card: 'shoucuo', stand: 8 }
      ]
    },
    {
      id: 'mama', name: '妈妈牛', kind: 'cow', upright: true, crawl: false,
      seed: 22, colors: { body: 0xe8dcc8, patch: 0xc8a06a },
      pos: [3, -4], rot: -0.6, scale: 1.05,
      lines: [
        { who: 'player', text: '妈妈，他们都说我站不起来……' },
        { who: 'mama', text: '孩子，妈妈不懂动画，妈妈懂你。', card: 'mamadongni', stand: 8 }
      ]
    },
    {
      id: 'laoniu', name: '爬行老牛', kind: 'cow', upright: false, crawl: true,
      seed: 33, colors: { body: 0x9a9a92, patch: 0x7a7a72 },
      pos: [6, 2], rot: -2.2, scale: 0.95,
      lines: [
        { who: 'player', text: '老爷爷，你也是爬着走的？' },
        { who: 'laoniu', text: '爬了三十年咯。牛市没等到，但等到了你。', stand: 5 }
      ]
    },
    {
      id: 'maodie', name: '耄耋', kind: 'cat', upright: true, crawl: false,
      seed: 44, colors: { body: 0x9a9a92, patch: 0xe8e2d8 },
      pos: [-6, 4], rot: 1.2, scale: 1.0,
      lines: MAODIE_LINES
    },
    {
      id: 'gumin', name: '股民牛', kind: 'cow', upright: true, crawl: false,
      seed: 55, colors: { body: 0xd8c8a0, patch: 0x8a5a2a },
      pos: [40, -6], rot: 0.9, scale: 1.0,
      lines: [
        { who: 'player', text: '大哥，这些柱子都是干什么的？' },
        { who: 'gumin', text: 'K 线。红的是涨，绿的是跌。我盯着它们看了十年，柱子都认识我了。' },
        { who: 'player', text: '那……牛市来了吗？' },
        { who: 'gumin', text: '别怕站不起来，大 A 都等了这么多年了，不差这一会儿。', card: 'gumin', stand: 8 }
      ]
    },
    {
      id: 'jiucai', name: '韭菜牛', kind: 'cow', upright: false, crawl: true,
      seed: 66, colors: { body: 0x4a7a4a, patch: 0x9a3a2a },
      pos: [50, 6], rot: -1.0, scale: 0.95,
      lines: [
        { who: 'player', text: '你怎么也趴着？' },
        { who: 'jiucai', text: '韭菜嘛……都是趴着被割的。他们说牛来了，我冲进去，然后牛走了。', card: 'jiucai', stand: 3 }
      ]
    },
    {
      id: 'xuanxue', name: '玄学牛', kind: 'cow', upright: true, crawl: false,
      seed: 77, colors: { body: 0x8a7a9a, patch: 0x5a4a6a },
      pos: [-18, 6], rot: -0.5, scale: 1.0,
      lines: [
        { who: 'player', text: '大师，牛市什么时候来？' },
        { who: 'xuanxue', text: '天机不可泄露。但你可以先把草票攒着。', stand: 2 }
      ]
    }
  ];

  // ---- 草票 ----
  var TICKET_SPOTS = [
    [-4, -2], [-1, 3], [5, -1], [7, 5], [-7, -3],
    [44, -4], [52, 8], [38, 8]
  ];

  // ---- 世界配置 ----
  var WORLD = {
    bound: 26,            // 牛棚镇活动边界（±）
    grassCount: 160,
    grassHeight: 0.7,    // 草比趴着的牛（镜头）高
    // 草浪区（蛇追戏舞台）
    grassArea: { x1: 14, x2: 34, z1: -25, z2: -11 },
    grassEnter: [13, -19],
    snakeSpawn: [24, -14],
    snakeShedSpot: [28, -20]
  };

  window.Data = {
    CARDS: CARDS,
    TYPOS: TYPOS,
    MAODIE_LINES: MAODIE_LINES,
    PASSERBY_LINES: PASSERBY_LINES,
    NPCS: NPCS,
    TICKET_SPOTS: TICKET_SPOTS,
    WORLD: WORLD
  };
})();
