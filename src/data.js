/* ============================================================
 * 直立牛平原 M1 —— 数据文件（台词 / 语录卡 / 错别字池 / 配置）
 * 无框架、无构建；本文件定义 window.Data 全局
 * ============================================================ */
(function () {
  'use strict';

  // ---- 语录卡（M1 原型 3 张；完整版 36 张）----
  var CARDS = [
    { id: 'shoucuo',   name: '手搓五年',  type: '暖心', text: '妈妈说：画得再歪也是画，坚持五年就是传奇。', stand: 8 },
    { id: 'mamadongni',name: '妈妈懂你',  type: '暖心', text: '孩子，妈妈不懂动画，妈妈懂你。', stand: 8 },
    { id: 'jiangla',   name: '姜还是老的辣', type: '玄学', text: '哈气都能飘到屋顶，你怕什么站起来。', stand: 8 }
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
    }
  ];

  // ---- 草票 ----
  var TICKET_SPOTS = [
    [-4, -2], [-1, 3], [5, -1], [7, 5], [-7, -3]
  ];

  // ---- 世界配置 ----
  var WORLD = {
    bound: 26,            // 牛棚镇活动边界（±）
    grassCount: 160,
    grassHeight: 0.7     // 草比趴着的牛（镜头）高
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
