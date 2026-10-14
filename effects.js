/* 右侧滚动联动特效（贴浏览器原生滚动条）
   - 两根竖向束带【交叠】扭转，相位由滚动进度驱动
   - 一条粒子带沿滚动条上下移动 —— 位置 = 滚动进度，直观显示"看到哪了 / 还剩多少"
   - 不滚动 → 完全静止
   只占网页最右侧一条窄带。                                            */
(function () {
  'use strict';

  var canvas = document.getElementById('fx');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0;
  var progress = 0;
  var target = 0;
  var parts = [];

  var PCOLORS = [
    [0, 170, 255],
    [0, 212, 255],
    [43, 127, 255],
    [0, 240, 255],
    [70, 160, 255]
  ];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  /* 数十个粒子，围绕"粒子带中心"分布 —— 中心随滚动从顶滑到底 */
  function build() {
    var n = 54;
    parts = [];
    for (var i = 0; i < n; i++) {
      parts.push({
        off: Math.random() * 2 - 1,          /* -1 ~ 1：相对带中心的纵向偏移 */
        x: W * (0.28 + Math.random() * 0.64),
        r: 0.9 + Math.random() * 1.7,
        a: 0.62 + Math.random() * 0.38,
        col: PCOLORS[(Math.random() * PCOLORS.length) | 0],
        wob: 0.4 + Math.random() * 2.0,
        lag: 0.4 + Math.random() * 0.9       /* 每颗粒子的跟随延迟系数 */
      });
    }
  }

  var BAND_SPREAD = 0.34;   /* 粒子带纵向厚度（占屏高比例）*/

  /* 两根束带：同中心、相位差 π → 沿纵向交叠穿插 */
  var TW = {
    cx: 0.36,
    amp: 0.30,
    freq: 0.0050,
    w: 0.32,
    spins: 1.5
  };

  function band(index) {
    var cx = W * TW.cx;
    var amp = W * TW.amp;
    var halfW = W * TW.w * 0.5;
    var phase = index * Math.PI + progress * Math.PI * 2 * TW.spins;

    function spine(y) {
      return cx
        + Math.sin(y * TW.freq + phase) * amp
        + Math.cos(y * TW.freq * 2.1 + phase * 1.3) * amp * 0.26;
    }

    var grad = ctx.createLinearGradient(0, 0, 0, H);
    if (index === 0) {
      grad.addColorStop(0.00, 'rgba(0,170,255,0)');
      grad.addColorStop(0.20, 'rgba(0,170,255,0.40)');
      grad.addColorStop(0.52, 'rgba(43,127,255,0.34)');
      grad.addColorStop(0.80, 'rgba(0,120,230,0.24)');
      grad.addColorStop(1.00, 'rgba(0,120,230,0)');
    } else {
      grad.addColorStop(0.00, 'rgba(0,212,255,0)');
      grad.addColorStop(0.20, 'rgba(0,212,255,0.40)');
      grad.addColorStop(0.52, 'rgba(100,170,255,0.34)');
      grad.addColorStop(0.80, 'rgba(0,150,255,0.24)');
      grad.addColorStop(1.00, 'rgba(0,150,255,0)');
    }

    var step = 6, y;

    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    for (y = 0; y <= H; y += step) ctx.lineTo(spine(y) - halfW, y);
    for (y = H; y >= 0; y -= step) ctx.lineTo(spine(y) + halfW, y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.beginPath();
    for (y = 0; y <= H; y += step) {
      var xx = spine(y);
      if (y === 0) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = index === 0
      ? 'rgba(120,210,255,0.55)'
      : 'rgba(170,240,255,0.55)';
    ctx.stroke();
  }

  var smoothCenters = [];

  function frame() {
    progress += (target - progress) * 0.18;

    ctx.clearRect(0, 0, W, H);

    band(0);
    band(1);

    /* 粒子带中心：直接映射滚动进度 → 屏高比例 */
    var center = progress * H;
    var spread = H * BAND_SPREAD * 0.5;

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];

      /* 每颗粒子有自己的跟随延迟，形成"拖尾"层次 */
      if (smoothCenters[i] === undefined) smoothCenters[i] = center;
      smoothCenters[i] += (center - smoothCenters[i]) * (0.10 + p.lag * 0.16);

      var py = smoothCenters[i] + p.off * spread;
      if (py < -24 || py > H + 24) continue;

      var px = p.x + Math.sin(p.off * 6.2832 + progress * 9) * p.wob;
      var rgb = p.col[0] + ',' + p.col[1] + ',' + p.col[2];

      ctx.beginPath();
      ctx.arc(px, py, p.r * 3.6, 0, 6.28318);
      ctx.fillStyle = 'rgba(' + rgb + ',' + (p.a * 0.17) + ')';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, 6.28318);
      ctx.fillStyle = 'rgba(' + rgb + ',' + p.a + ')';
      ctx.fill();
    }
  }

  function readScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (reduce) progress = target;
  }

  resize();
  readScroll();

  window.addEventListener('resize', function () { resize(); readScroll(); });
  window.addEventListener('scroll', readScroll, { passive: true });

  if (reduce) {
    frame();
    window.addEventListener('scroll', function () { frame(); }, { passive: true });
    return;
  }

  (function loop() {
    frame();
    requestAnimationFrame(loop);
  })();
})();
