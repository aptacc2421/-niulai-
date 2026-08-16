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
  async function gotoRetry(p, tries) {
    for (let i = 0; i < tries; i++) {
      try { await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle0', timeout: 90000 }); return; }
      catch (e) { if (i === tries - 1) throw e; console.log('goto 重试 ' + (i + 1)); await sleep(2000); }
    }
  }
  try {
    await gotoRetry(page, 3);
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

    // 方向核对（修复 A/D 反了）：A=屏幕左(+x)、D=屏幕右(-x)
    await page.evaluate(() => { window.Game.player.position.set(0, 0, 0); window.Game.camera.position.set(0, 1.0, -6.5); });
    await sleep(300);
    const p0 = await page.evaluate(() => ({ x: window.Game.player.position.x, z: window.Game.player.position.z }));
    await page.keyboard.down('a');
    await sleep(80);   // 短按：测初始方向（视角跟随会让长按变成左转画圈）
    const p1 = await page.evaluate(() => ({ x: window.Game.player.position.x, z: window.Game.player.position.z }));
    await page.keyboard.up('a');
    results.keysDir = (p1.x - p0.x) > 0.05;

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

    // 结局：站立值 100 + 全卡 + 4 票根 → 牛市来了
    await page.evaluate(() => {
      const G = window.Game;
      G.state.stand = 100;
      G.state.cards = window.Data.CARDS.map(function (c) { return c.id; });
      G.state.stubs = [0, 1, 2, 3];
    });
    await sleep(1500);
    results.ending = await page.evaluate(() => {
      const el = document.getElementById('ending');
      return !el.classList.contains('hidden') && document.getElementById('ending-title').textContent === '牛市来了';
    });

    results.stand = await page.evaluate(() => window.Game.state.stand >= 18);

    // 隐藏作弊终端（懂的都懂）：ls 发现文件 → ./spirit.sh 灵魂出体 → 变速 → q! 归位
    await page.evaluate(() => { window.Game.player.position.set(0, 0, 0); window.Game.player.visible = true; });
    const runCmd = async (cmd) => {
      await page.keyboard.press(':');
      await sleep(200);
      await page.keyboard.type(cmd);
      await page.keyboard.press('Enter');
      await sleep(300);
    };
    await runCmd('ls');
    const lsShows = await page.evaluate(() =>
      document.getElementById('cheat-out').textContent.indexOf('spirit.sh') >= 0);
    await runCmd('./spirit.sh');
    const spiritOn = await page.evaluate(() => window.Game.spirit() && !window.Game.player.visible);
    await page.keyboard.press(']');
    const ts2 = await page.evaluate(() => window.Game.timeScale());
    await page.keyboard.press('[');
    await page.keyboard.press('[');
    const ts05 = await page.evaluate(() => window.Game.timeScale());
    await page.keyboard.press('0');
    const ts1 = await page.evaluate(() => window.Game.timeScale());
    await runCmd('q!');
    const spiritOff = await page.evaluate(() => !window.Game.spirit() && window.Game.player.visible);
    results.cheat = lsShows && spiritOn && ts2 === 2 && ts05 === 0.5 && ts1 === 1 && spiritOff;

    await page.screenshot({ path: '/tmp/zhili_niu_smoke.png' });
    console.log('截图: /tmp/zhili_niu_smoke.png');

    // 手机触屏版冒烟（模拟 iPhone 视口 + 触屏）——先关掉桌面页释放 WebGL 资源
    await page.close();
    const mob = await browser.newPage();
    await mob.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mErr = [];
    mob.on('pageerror', e => mErr.push(e.message));
    await mob.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await sleep(3500);
    await mob.tap('#start-btn');
    await sleep(400);
    const touchUiShown = await mob.$eval('#touch-ui', el => !el.classList.contains('hidden'));
    // 左半屏摇杆：手指上推 → 前进
    const moved = await mob.evaluate(async () => {
      const G = window.Game;
      const z0 = G.player.position.z;
      const el = document.body;
      const mk = (type, x, y, id) => {
        const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent(type, {
          touches: (type === 'touchstart' || type === 'touchmove') ? [t] : [],
          changedTouches: [t], bubbles: true, cancelable: true
        }));
      };
      mk('touchstart', 60, 400, 1);
      for (let i = 0; i < 5; i++) { mk('touchmove', 60, 300, 1); await new Promise(r => setTimeout(r, 120)); }
      mk('touchend', 60, 300, 1);
      await new Promise(r => setTimeout(r, 300));
      return Math.abs(G.player.position.z - z0) > 0.5;
    });
    // 交互按钮
    await mob.evaluate(() => { window.Game.player.position.set(-2.2, 0, 0.5); });
    await sleep(300);
    await mob.tap('#btn-interact');
    await sleep(400);
    const dlgOn = await mob.evaluate(() => window.Dialogue.isActive());
    // 右半屏拖动 → 转视角
    const cam1 = await mob.evaluate(() => window.Game.camera.position.x);
    await mob.evaluate(() => {
      const el = document.body;
      const mk = (type, x, y) => {
        const t = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent(type, { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
      };
      mk('touchstart', 300, 400);
      mk('touchmove', 350, 400);
      mk('touchend', 350, 400);
    });
    await sleep(400);
    const cam2 = await mob.evaluate(() => window.Game.camera.position.x);
    results.mobile = touchUiShown && moved && dlgOn && Math.abs(cam2 - cam1) > 0.3 && mErr.length === 0;

    // 视角跟随（PUBG 式）：关掉对话 → 推摇杆 → 镜头应自动转向移动方向
    for (let i = 0; i < 12; i++) {
      const on = await mob.evaluate(() => window.Dialogue.isActive());
      if (!on) break;
      await mob.tap('#btn-interact'); await sleep(150);
    }
    // 传送到空旷处（避免对话按钮再触发附近 NPC）
    await mob.evaluate(() => { window.Game.player.position.set(20, 0, 20); });
    await sleep(400);
    const camA = await mob.evaluate(() => ({ x: window.Game.camera.position.x, z: window.Game.camera.position.z }));
    await mob.evaluate(async () => {
      const el = document.body;
      const mk = (type, x, y, id) => {
        const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent(type, { touches: (type === 'touchstart' || type === 'touchmove') ? [t] : [], changedTouches: [t], bubbles: true, cancelable: true }));
      };
      mk('touchstart', 60, 400, 4);
      for (let i = 0; i < 10; i++) { mk('touchmove', 40, 400, 4); await new Promise(r => setTimeout(r, 120)); }
      mk('touchend', 40, 400, 4);
      await new Promise(r => setTimeout(r, 500));
    });
    const camB = await mob.evaluate(() => ({ x: window.Game.camera.position.x, z: window.Game.camera.position.z }));
    results.follow = Math.abs(camB.x - camA.x) + Math.abs(camB.z - camA.z) > 0.5;

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
