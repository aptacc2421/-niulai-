/* ============================================================
 * 直立牛平原 M2c —— 选座购票（满场座位拼成字）
 * window.TicketUI = { open, close, isOpen }
 * 依赖 window.Game.state（tickets / stubs / patternSeen）+ Data.SHOWTIMES
 * ============================================================ */
(function () {
  'use strict';

  var overlay = null;
  var selected = -1;
  var patternCache = {};
  var COLS = 10, ROWS = 8;

  function getG() { return window.Game; }

  // 用画布渲染汉字 → 采样到座位网格（这样"牛/来/牛来/发"都是标准字形）
  function seatPattern(ch) {
    if (patternCache[ch]) return patternCache[ch];
    var cv = document.createElement('canvas');
    cv.width = COLS * 10; cv.height = ROWS * 10;
    var x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#000';
    x.font = 'bold ' + Math.round(ROWS * 10 / ch.length * 0.92) + 'px "Microsoft YaHei", sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ch, cv.width / 2, cv.height / 2 + 2);
    var data = x.getImageData(0, 0, cv.width, cv.height).data;
    var seats = {};
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var dark = 0, total = 0;
        for (var dy = 0; dy < 10; dy += 2) {
          for (var dx = 0; dx < 10; dx += 2) {
            var idx = ((r * 10 + dy) * cv.width + c * 10 + dx) * 4;
            total++;
            if (data[idx] < 128) dark++;
          }
        }
        if (dark / total > 0.45) seats[r * COLS + c] = true;
      }
    }
    patternCache[ch] = seats;
    return seats;
  }

  function currentShow() {
    var s = getG().state;
    var idx = Math.min(s.stubs.length, window.Data.SHOWTIMES.length - 1);
    return { idx: idx, info: window.Data.SHOWTIMES[idx] };
  }

  function save() {
    try { localStorage.setItem('zhili_niu_m1_v1', JSON.stringify(getG().state)); } catch (e) {}
  }

  function build() {
    var s = getG().state;
    var show = currentShow();
    var sold = seatPattern(show.info.ch);
    selected = -1;

    overlay = document.createElement('div');
    overlay.id = 'ticket-ui';
    overlay.innerHTML =
      '<div class="ticket-box">' +
      '<div class="ticket-title">' + show.info.name + '</div>' +
      '<div class="ticket-sub">场次 ' + (show.idx + 1) + '/4 · 满场拼字：<b>' + show.info.ch + '</b>' +
        (show.info.gold ? '（金漆座位）' : '') + '</div>' +
      '<div class="ticket-screen">↑ 银幕 ↑</div>' +
      '<div class="ticket-grid" id="ticket-grid"></div>' +
      '<div class="ticket-foot">' +
        '<span>草票 <b id="ticket-cash">' + s.tickets + '</b> · 票根 <b>' + (s.stubs ? s.stubs.length : 0) + '</b>/4</span>' +
        '<span><button id="ticket-buy">确认购票（5 草票）</button> <button id="ticket-refund" class="refund">退票</button></span>' +
      '</div>' +
      '<div class="ticket-hint">选一个白色座位 → 确认购票 · Esc 关闭</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var grid = overlay.querySelector('#ticket-grid');
    for (var i = 0; i < COLS * ROWS; i++) {
      var cell = document.createElement('div');
      var row = Math.floor(i / COLS) + 1, col = (i % COLS) + 1;
      cell.className = 'ticket-seat ' + (sold[i] ? 'sold' : 'empty');
      cell.title = row + ' 排 ' + col + ' 座' + (sold[i] ? '（已被「' + show.info.ch + '」字占走）' : '');
      cell.dataset.idx = i;
      if (show.info.gold && !sold[i]) cell.classList.add('gold');
      cell.addEventListener('click', function () {
        var idx = parseInt(this.dataset.idx, 10);
        if (sold[idx]) { window.Dialogue.toast('这个座位被「' + show.info.ch + '」字占了'); return; }
        selected = idx;
        grid.querySelectorAll('.ticket-seat').forEach(function (el) { el.classList.remove('picked'); });
        this.classList.add('picked');
      });
      grid.appendChild(cell);
    }

    overlay.querySelector('#ticket-buy').addEventListener('click', buy);
    overlay.querySelector('#ticket-refund').addEventListener('click', function () {
      window.Dialogue.toast('退票？你确定？外面三十公里还有人要来。');
    });

    // 记录看过的拼字（成就「满座牛字」）
    s.patternSeen = s.patternSeen || [];
    if (s.patternSeen.indexOf(show.idx) < 0) s.patternSeen.push(show.idx);
  }

  function buy() {
    var s = getG().state;
    if (selected < 0) { window.Dialogue.toast('先选个座位（白色格子）'); return; }
    if (s.tickets < 5) { window.Dialogue.toast('草票不够！去草地上捡，还差 ' + (5 - s.tickets) + ' 张'); return; }
    var show = currentShow();
    s.tickets -= 5;
    s.stubs = s.stubs || [];
    s.stubs.push(show.idx);
    var row = Math.floor(selected / COLS) + 1, col = (selected % COLS) + 1;
    var seatNo = (show.idx === 0) ? '7 排 0 座 5 号（售票机显示故障）' : row + ' 排 ' + col + ' 座';
    window.AudioSys.ding();
    window.Dialogue.toast('购票成功！票根 · ' + seatNo);
    if (show.idx === 0 && row === 7 && col === 5) window.Dialogue.toast('成就解锁：「首周票房」');
    if (s.stubs.length >= 4) window.Dialogue.toast('成就解锁：「一票难求」');
    if (s.patternSeen && s.patternSeen.length >= 4) window.Dialogue.toast('成就解锁：「满座牛字」');
    save();
    window.Dialogue.updateHud();
    close();
    open(); // 重开：解锁下一场次
  }

  window.TicketUI = {
    open: function () { if (overlay) return; build(); },
    close: function () { if (overlay) { overlay.remove(); overlay = null; selected = -1; } },
    isOpen: function () { return !!overlay; }
  };
})();
