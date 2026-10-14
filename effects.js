/* 背景特效：蓝色粒子 + 束带扭转
   - 单个 canvas 绘制，无外部依赖
   - 尊重 prefers-reduced-motion（用户关掉动画时自动跳过）
   - 移动端自动降低粒子数；页面隐藏时暂停，省电                      */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('fx');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var W = 0, H = 0, t = 0, parts = [], COLORS = [];
  var running = true, rafId = 0;

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
    COLORS = ['110,168,254', '167,139,250', '59,111,212', '126,196,255', '190,215,255'];
    var narrow = W < 700;
    var count = Math.max(30, Math.min(narrow ? 50 : 115, Math.round((W * H) / 19000)));
    parts = [];
    for (var i = 0; i < count; i++) {
      parts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.7 + Math.random() * 2.3,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.06 - Math.random() * 0.24,
        a: 0.16 + Math.random() * 0.52,
        ph: Math.random() * Math.PI * 2,
        sp: 0.008 + Math.random() * 0.018,
        c: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }
  }

  /* 三条「束带」：上下两条同相位正弦波构成一条扭动的光带 */
  var RIBBONS = [
    { y: 0.22, amp: 54, freq: 0.0030, sp: 0.34, w: 44, a: 0.22 },
    { y: 0.50, amp: 70, freq: 0.0022, sp: -0.26, w: 56, a: 0.17 },
    { y: 0.78, amp: 38, freq: 0.0042, sp: 0.44, w: 34, a: 0.14 }
  ];

  function ribbon(cfg) {
    var baseY = H * cfg.y;
    var grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0.00, 'rgba(110,168,254,0)');
    grad.addColorStop(0.26, 'rgba(110,168,254,' + cfg.a + ')');
    grad.addColorStop(0.52, 'rgba(167,139,250,' + (cfg.a * 1.15) + ')');
    grad.addColorStop(0.78, 'rgba(59,111,212,' + (cfg.a * 0.85) + ')');
    grad.addColorStop(1.00, 'rgba(59,111,212,0)');

    var ph = t * cfg.sp * 0.02;
    var step = 7;

    function waveY(x) {
      var w1 = Math.sin(x * cfg.freq + ph) * cfg.amp;
      var w2 = Math.cos(x * cfg.freq * 1.73 + ph * 1.4) * cfg.amp * 0.34;
      return baseY + w1 + w2;
    }

    ctx.beginPath();
    var x;
    for (x = 0; x <= W; x += step) ctx.lineTo(x, waveY(x));
    for (x = W; x >= 0; x -= step) ctx.lineTo(x, waveY(x) + cfg.w);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    /* 上下沿描一条细高光，让「带」有实感 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(150,195,255,' + (cfg.a * 0.55) + ')';
    ctx.beginPath();
    for (x = 0; x <= W; x += step) {
      var yy = waveY(x);
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    var i;
    for (i = 0; i < RIBBONS.length; i++) ribbon(RIBBONS[i]);

    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.ph += p.sp;

      if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
      if (p.x < -12) p.x = W + 12;
      if (p.x > W + 12) p.x = -12;

      var alpha = p.a * (0.55 + 0.45 * Math.sin(p.ph));

      if (p.r > 1.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.28318);
        ctx.fillStyle = 'rgba(' + p.c + ',' + (alpha * 0.11) + ')';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.28318);
      ctx.fillStyle = 'rgba(' + p.c + ',' + alpha + ')';
      ctx.fill();
    }

    t += 1;
    rafId = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);

  /* 页面隐藏时暂停，回来再继续（不会重复启动循环） */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(rafId);
    } else if (!running) {
      running = true;
      rafId = requestAnimationFrame(frame);
    }
  });

  rafId = requestAnimationFrame(frame);
})();
