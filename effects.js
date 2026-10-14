/* 右侧滚动联动特效
   - 束带扭动：3 条垂直光带，扭动相位由滚动进度驱动（不滚动就停住）
   - 粒子流：不规则蓝色粒子，随滚动从上往下流动
   - 滑块：右侧轨道上的滑块与滚动进度实时同步
   全部集中在页面右侧一条垂直带里。                                    */
(function () {
  'use strict';

  var canvas = document.getElementById('fx');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var thumb = document.getElementById('fxThumb');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0;
  var progress = 0;   /* 平滑后的进度 */
  var target = 0;     /* 真实滚动进度 */
  var parts = [];
  var COLORS = ['110,168,254', '167,139,250', '59,111,212', '126,196,255', '190,215,255'];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    var n = W < 190 ? 30 : 56;
    parts = [];
    for (var i = 0; i < n; i++) {
      parts.push({
        base: Math.random(),                 /* 归一化基准位置 0-1 */
        x: 0.10 + Math.random() * 0.80,      /* 横向位置 */
        r: 0.7 + Math.random() * 2.2,
        a: 0.22 + Math.random() * 0.58,
        ph: Math.random() * Math.PI * 2,
        wob: 0.04 + Math.random() * 0.14,    /* 横向摆动幅度 */
        c: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }
  }

  /* 三条垂直束带（位置 / 振幅 / 频率 / 宽度 / 透明度 / 滚动倍率）*/
  var BANDS = [
    { x: 0.28, amp: 0.15, freq: 0.0056, w: 0.10, a: 0.30, k: 1.0 },
    { x: 0.57, amp: 0.21, freq: 0.0041, w: 0.13, a: 0.24, k: -1.4 },
    { x: 0.79, amp: 0.13, freq: 0.0072, w: 0.08, a: 0.20, k: 1.8 }
  ];

  function band(cfg) {
    var cx = W * cfg.x;
    var amp = W * cfg.amp;
    var halfW = W * cfg.w * 0.5;
    var ph = progress * Math.PI * 2 * cfg.k;

    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.00, 'rgba(110,168,254,0)');
    grad.addColorStop(0.24, 'rgba(110,168,254,' + cfg.a + ')');
    grad.addColorStop(0.54, 'rgba(167,139,250,' + (cfg.a * 1.1) + ')');
    grad.addColorStop(0.80, 'rgba(59,111,212,' + (cfg.a * 0.8) + ')');
    grad.addColorStop(1.00, 'rgba(59,111,212,0)');

    function spine(y) {
      return cx
        + Math.sin(y * cfg.freq + ph) * amp
        + Math.cos(y * cfg.freq * 1.9 + ph * 1.5) * amp * 0.34;
    }

    var step = 8, y;
    ctx.beginPath();
    for (y = 0; y <= H; y += step) ctx.lineTo(spine(y) - halfW, y);
    for (y = H; y >= 0; y -= step) ctx.lineTo(spine(y) + halfW, y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    /* 中脊细高光，强化「束带」质感 */
    ctx.beginPath();
    for (y = 0; y <= H; y += step) {
      var xx = spine(y);
      if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(165,205,255,' + (cfg.a * 0.55) + ')';
    ctx.stroke();
  }

  function frame() {
    progress += (target - progress) * 0.14;

    ctx.clearRect(0, 0, W, H);

    var i;
    for (i = 0; i < BANDS.length; i++) band(BANDS[i]);

    /* 粒子随滚动从上往下流；progress 变化时才移动 */
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      var t = (p.base + progress * 1.7) % 1;
      var py = t * H;
      var px = p.x * W + Math.sin(t * 6.2832 + p.ph + progress * 6.2832) * p.wob * W * 0.5;
      var alpha = p.a * (0.48 + 0.52 * Math.sin(p.ph + progress * 12));

      if (p.r > 1.5) {
        ctx.beginPath();
        ctx.arc(px, py, p.r * 3.2, 0, 6.28318);
        ctx.fillStyle = 'rgba(' + p.c + ',' + (alpha * 0.14) + ')';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, 6.28318);
      ctx.fillStyle = 'rgba(' + p.c + ',' + alpha + ')';
      ctx.fill();
    }

    /* 滑块跟随滚动进度 */
    if (thumb && thumb.parentElement) {
      var travel = thumb.parentElement.clientHeight - thumb.offsetHeight;
      if (travel > 0) {
        thumb.style.transform = 'translateY(' + (progress * travel).toFixed(1) + 'px)';
      }
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

  /* reduce 模式：不跑动画循环，只画一次静态图 */
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
