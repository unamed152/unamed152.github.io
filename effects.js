/* 右侧滚动联动特效（贴浏览器原生滚动条）
   - 两根竖向束带【交叠】扭转，相位由滚动进度驱动 —— 不滚动就完全静止
   - 数十个小而高饱和的蓝色粒子沿滚动条纵向分布，随滚动整体位移
   只占网页最右侧一条窄带，不挡滚动条操作。                            */
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

  /* 高饱和度蓝 */
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

  /* 数十个粒子，纵向均匀铺开（各占一格），随滚动整体下移 */
  function build() {
    var n = 56;
    parts = [];
    for (var i = 0; i < n; i++) {
      parts.push({
        base: (i + Math.random() * 0.8) / n,
        x: W * (0.34 + Math.random() * 0.58),
        r: 0.9 + Math.random() * 1.6,
        a: 0.60 + Math.random() * 0.40,
        col: PCOLORS[(Math.random() * PCOLORS.length) | 0],
        wob: 0.5 + Math.random() * 2.2
      });
    }
  }

  /* 两根束带：中心相同、相位差 π → 沿纵向互相交叠 */
  var TW = {
    cx: 0.38,      /* 束带中心（canvas 宽比例）*/
    amp: 0.30,     /* 横向摆幅 */
    freq: 0.0050,  /* 纵向频率（越小波形越长）*/
    w: 0.34,       /* 带宽 */
    spins: 1.5     /* 滚完一屏扭转 1.5 圈 */
  };

  function band(index) {
    var cx = W * TW.cx;
    var amp = W * TW.amp;
    var halfW = W * TW.w * 0.5;
    var phase = index * Math.PI + progress * Math.PI * 2 * TW.spins;

    /* spine = 两条不同频率正弦叠加，产生不规则的扭转感 */
    function spine(y) {
      return cx
        + Math.sin(y * TW.freq + phase) * amp
        + Math.cos(y * TW.freq * 2.1 + phase * 1.3) * amp * 0.26;
    }

    var grad = ctx.createLinearGradient(0, 0, 0, H);
    if (index === 0) {
      grad.addColorStop(0.00, 'rgba(0,170,255,0)');
      grad.addColorStop(0.20, 'rgba(0,170,255,0.38)');
      grad.addColorStop(0.52, 'rgba(43,127,255,0.34)');
      grad.addColorStop(0.80, 'rgba(0,120,230,0.24)');
      grad.addColorStop(1.00, 'rgba(0,120,230,0)');
    } else {
      grad.addColorStop(0.00, 'rgba(0,212,255,0)');
      grad.addColorStop(0.20, 'rgba(0,212,255,0.38)');
      grad.addColorStop(0.52, 'rgba(100,170,255,0.34)');
      grad.addColorStop(0.80, 'rgba(0,150,255,0.24)');
      grad.addColorStop(1.00, 'rgba(0,150,255,0)');
    }

    var step = 6, y;

    /* 交叠处更亮：用 lighter 叠加 */
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    for (y = 0; y <= H; y += step) ctx.lineTo(spine(y) - halfW, y);
    for (y = H; y >= 0; y -= step) ctx.lineTo(spine(y) + halfW, y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    /* 中脊高光 */
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

  function frame() {
    progress += (target - progress) * 0.16;

    ctx.clearRect(0, 0, W, H);

    band(0);
    band(1);

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var t = (p.base + progress) % 1;
      if (t < 0) t += 1;

      var py = t * H;
      var px = p.x + Math.sin(t * 6.2832 + progress * 6.2832) * p.wob;
      var rgb = p.col[0] + ',' + p.col[1] + ',' + p.col[2];

      /* 外发光 */
      ctx.beginPath();
      ctx.arc(px, py, p.r * 3.6, 0, 6.28318);
      ctx.fillStyle = 'rgba(' + rgb + ',' + (p.a * 0.17) + ')';
      ctx.fill();

      /* 核心 */
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

  /* reduce：不跑循环，只在滚动时重画一帧 */
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
