/* ============================================================
 * 直立牛平原 M1 —— 冒烟测试（自包含：内置静态服务器 + 无头浏览器）
 * 用法：cd test && npm install && npm run smoke
 * 验证：加载 → 开始 → 移动 → 导演牛对话得卡 → 耄耋哈气对话得卡 → 无 JS 报错
 * ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.json': 'application/json', '.md': 'text/plain'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (p.endsWith('/') || !path.extname(p)) p = path.join(p, 'index.html');
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const errors = [];
  const server = await serve();
  const port = server.address().port;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const results = {};
  try {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle0', timeout: 90000 });
    await sleep(3500);
    await page.click('#start-btn');
    await sleep(300);
    results.hud = await page.$eval('#hud', el => !el.classList.contains('hidden'));

    const info = await page.evaluate(() => {
      const G = window.Game;
      return { nodes: G ? G.scene.children.length : -1, player: !!(G && G.player), maodie: !!(G && G.npcMeshes && G.npcMeshes.maodie) };
    });
    results.scene = info.nodes > 50 && info.player && info.maodie;

    const z0 = await page.evaluate(() => window.Game.player.position.z);
    await page.keyboard.down('w');
    await sleep(1000);
    await page.keyboard.up('w');
    const z1 = await page.evaluate(() => window.Game.player.position.z);
    results.move = Math.abs(z1 - z0) > 0.5;

    async function talkWith(px, pz) {
      await page.evaluate(([x, z]) => { window.Game.player.position.set(x, 0, z); }, [px, pz]);
      await sleep(300);
      await page.keyboard.press('e');
      await sleep(400);
      for (let i = 0; i < 20; i++) {
        const on = await page.evaluate(() => window.Dialogue.isActive());
        if (!on) break;
        await page.keyboard.press('e');
        await sleep(150);
      }
      await sleep(1200);
    }
    await talkWith(-2.2, 0.5);                       // 导演牛
    results.daoyan = await page.evaluate(() => window.Game.state.cards.length >= 1);
    await talkWith(-6.2, 4.5);                       // 耄耋（哈气）
    results.maodie = await page.evaluate(() => window.Game.state.cards.length >= 2);
    await talkWith(39.8, -5.5);                      // 股民牛（K 线交易场）
    results.gumin = await page.evaluate(() => window.Game.state.cards.length >= 3);
    await talkWith(49.8, 6.5);                       // 韭菜牛（K 线交易场）
    results.jiucai = await page.evaluate(() => window.Game.state.cards.length >= 4);

    // M2b 蛇追戏：进入草浪区触发追逐 → 逃出得卡
    const snake = await page.evaluate(async () => {
      const G = window.Game;
      G.player.position.set(20, 0, -20);             // 进入草浪区
      await new Promise(r => setTimeout(r, 500));
      const phase = G.snakeState.phase;              // 应为 'chase'
      G.player.position.set(5, 0, -20);              // 逃出
      await new Promise(r => setTimeout(r, 900));
      return { phase, escaped: G.state.cards.indexOf('paodekuai') >= 0 };
    });
    results.snake = snake.phase === 'chase' && snake.escaped;

    // M2b 被咬 → 妈妈救场序列
    const bite = await page.evaluate(async () => {
      const G = window.Game;
      G.snakeState.coolT = 0;                        // 清除逃出后的冷却，确保触发追逐
      G.snakeState.phase = 'idle';
      G.player.position.set(24, 0, -14);
      G.snake.position.set(24.6, 0, -13.4);
      await new Promise(r => setTimeout(r, 600));
      const seq = G.snakeState.seqT >= 0;
      await new Promise(r => setTimeout(r, 6500));   // 等救场走完
      return { seq, momGone: !G.snakeState.mom, stand: G.state.stand };
    });
    results.mom = bite.seq && bite.momGone;

    // M2b 蛇蜕皮 → 玄学牛换卡
    await page.evaluate(() => { window.Game.state.shedSnake = 1; window.Game.player.position.set(-18.2, 0, 6.5); });
    await sleep(300);
    await page.keyboard.press('e');
    await sleep(400);
    for (let i = 0; i < 20; i++) {
      const on = await page.evaluate(() => window.Dialogue.isActive());
      if (!on) break;
      await page.keyboard.press('e');
      await sleep(150);
    }
    await sleep(1200);
    results.xuanxue = await page.evaluate(() => window.Game.state.cards.indexOf('xuanxue') >= 0);

    // M2c 选座购票：开售票机 → 选空座 → 确认购票
    await page.evaluate(() => {
      window.Game.state.tickets = 15;
      window.Game.player.position.set(42.5, 0, -17.5);
    });
    await sleep(300);
    await page.keyboard.press('e');
    await sleep(500);
    const ticketOpen = await page.evaluate(() => window.TicketUI.isOpen());
    await page.evaluate(() => {
      const s = document.querySelector('#ticket-grid .ticket-seat.empty');
      if (s) s.click();
    });
    await sleep(200);
    await page.evaluate(() => {
      const b = document.getElementById('ticket-buy');
      if (b) b.click();
    });
    await sleep(800);
    const ticket = await page.evaluate(() => ({
      stubs: window.Game.state.stubs.length,
      tickets: window.Game.state.tickets
    }));
    results.ticket = ticketOpen && ticket.stubs >= 1 && ticket.tickets === 10;

    // M2c 影院经理牛（关掉购票界面再对话，站立值 +2）
    await page.keyboard.press('Escape');
    await sleep(200);
    const standBefore = await page.evaluate(() => window.Game.state.stand);
    await talkWith(42.2, -13.8);
    const standAfter = await page.evaluate(() => window.Game.state.stand);
    results.jingli = standAfter >= standBefore + 2;

    // M2d 生物团
    await talkWith(53.8, 6.5);                        // 卡皮巴拉
    results.kapybara = await page.evaluate(() => window.Game.state.cards.indexOf('kapybara') >= 0);

    // 奶娃：喂 5 瓶奶 → 跟班 + 卡片
    await page.evaluate(() => { window.Game.state.milk = 5; window.Game.player.position.set(-12.2, 0, -13.5); });
    await sleep(300);
    await page.keyboard.press('e'); await sleep(400);
    for (let i = 0; i < 10; i++) {
      const on = await page.evaluate(() => window.Dialogue.isActive());
      if (!on) break;
      await page.keyboard.press('e'); await sleep(150);
    }
    await sleep(1000);
    results.naiwa = await page.evaluate(() =>
      window.Game.state.cards.indexOf('naiwa') >= 0 && window.Game.naiwaFollower());

    // 修勾：先修座位再对话得卡
    await page.evaluate(() => { window.Game.state.xiugouTalked = true; window.Game.player.position.set(40.2, 0, -22.0); });
    await sleep(200);
    await page.keyboard.press('e'); await sleep(400);
    for (let i = 0; i < 10; i++) {
      const on = await page.evaluate(() => window.Dialogue.isActive());
      if (!on) break;
      await page.keyboard.press('e'); await sleep(150);
    }
    await sleep(300);
    await page.evaluate(() => { window.Game.player.position.set(48.6, 0, -18.4); }); // 坏座位
    await sleep(300);
    await page.keyboard.press('e'); await sleep(400);
    const seatFixed = await page.evaluate(() => window.Game.state.seatFixed);
    await page.evaluate(() => { window.Game.player.position.set(40.2, 0, -22.0); });
    await sleep(300);
    await page.keyboard.press('e'); await sleep(400);
    for (let i = 0; i < 10; i++) {
      const on = await page.evaluate(() => window.Dialogue.isActive());
      if (!on) break;
      await page.keyboard.press('e'); await sleep(150);
    }
    await sleep(800);
    results.xiugou = seatFixed && await page.evaluate(() => window.Game.state.cards.indexOf('xiugou') >= 0);

    // 尖叫鸡：对话得卡（顺带全屏鸡叫 + 周围牛弹跳）
    await page.evaluate(() => { window.Game.player.position.set(0.2, 0, 9.5); });
    await sleep(300);
    await page.keyboard.press('e'); await sleep(400);
    for (let i = 0; i < 10; i++) {
      const on = await page.evaluate(() => window.Dialogue.isActive());
      if (!on) break;
      await page.keyboard.press('e'); await sleep(150);
    }
    await sleep(800);
    results.jianjiaoji = await page.evaluate(() => window.Game.state.cards.indexOf('jianjiaoji') >= 0);

    // 隐藏怪：集齐生物卡 → 网线管钻出 → 对话得卡
    await page.evaluate(() => {
      window.Game.state.cards = window.Data.CREATURE_CARD_IDS.slice();
      window.Game.player.position.set(-24.2, 0, -1.5);
    });
    await sleep(2500);
    const hiddenVisible = await page.evaluate(() => {
      const cr = window.Game.creatures.find(c => c.def.id === 'haqimiao');
      return cr ? cr.mesh.visible : false;
    });
    await page.keyboard.press('e'); await sleep(400);
    for (let i = 0; i < 12; i++) {
      const on = await page.evaluate(() => window.Dialogue.isActive());
      if (!on) break;
      await page.keyboard.press('e'); await sleep(150);
    }
    await sleep(800);
    results.hidden = hiddenVisible && await page.evaluate(() => window.Game.state.cards.indexOf('haqimiao') >= 0);

    results.stand = await page.evaluate(() => window.Game.state.stand >= 18);

    await page.screenshot({ path: '/tmp/zhili_niu_smoke.png' });
    console.log('截图: /tmp/zhili_niu_smoke.png');
  } catch (e) {
    errors.push('exception: ' + e.message);
  }

  results.noJsErrors = errors.length === 0;
  console.log('冒烟测试结果:', JSON.stringify(results, null, 2));
  if (errors.length) console.log('JS 错误:\n' + errors.join('\n'));
  const pass = Object.values(results).every(v => v === true);
  console.log(pass ? '=== 冒烟测试 PASS ===' : '=== 冒烟测试 FAIL ===');

  await browser.close();
  server.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('测试崩溃:', e.message); process.exit(2); });
