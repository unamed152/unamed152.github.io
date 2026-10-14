/* 视觉特效层
   ① 全屏背景星星 —— 缓慢闪烁，低透明度，不干扰阅读（内容之下）
   ② 右侧【单条】束带 —— 屏高内恰好扭 2 个完整波，自主缓慢扭 + 滚动加成
   ③ 右侧粒子群 —— 铺满「内容右边缘 → 滚动条」整片区域，各自速度 + 闪烁
      跟随策略：越靠近滚动条的粒子跟得越快，越远的跟得越慢（形成拖尾层次）
   */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= ① 全屏背景星星 ================= */
  var scv = document.getElementById('stars');
  var sctx = scv ? scv.getContext('2d') : null;
  var stars = [], SW = 0, SH = 0;

  function starResize() {
    if (!sctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    SW = scv.clientWidth;
    SH = scv.clientHeight;
    scv.width = Math.round(SW * dpr);
    scv.height = Math.round(SH * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    starBuild();
  }

  function starBuild() {
    var n = Math.max(70, Math.min(200, Math.round((SW * SH) / 11000)));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * SW,
        y: Math.random() * SH,
        r: 0.5 + Math.random() * 1.5,
        a: 0.08 + Math.random() * 0.30,
        ph: Math.random() * Math.PI * 2,
        sp: 0.003 + Math.random() * 0.013,
        tx: (Math.random() - 0.5) * 0.05,
        ty: -0.01 - Math.random() * 0.03,
        c: Math.random() < 0.28 ? '185,212,255' : '255,255,255'
      });
    }
  }

  /* ================= ②③ 单条束带 + 粒子群 ================= */
  var cv = document.getElementById('fx');
  var ctx = cv ? cv.getContext('2d') : null;
  var W = 0, H = 0;
  var parts = [], pCenter = [];
  var progress = 0, target = 0, t = 0;

  var PCOLORS = [
    [0, 170, 255], [0, 212, 255], [43, 127, 255], [0, 240, 255], [90, 175, 255]
  ];

  function fxResize() {
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fxBuild();
  }

  function fxBuild() {
    var n = 120;                       /* 粒子数量（原 58 → 120）*/
    parts = [];
    pCenter = [];
    for (var i = 0; i < n; i++) {
      var xr = Math.random();          /* 0 = 内容右边缘, 1 = 滚动条 */
      parts.push({
        xr: xr,
        x: W * (0.02 + xr * 0.96),     /* 铺满整片区域 */
        off: Math.random() * 2 - 1,    /* 相对带中心的纵向偏移 */
        r: 0.8 + Math.random() * 1.7,
        a: 0.55 + Math.random() * 0.45,
        col: PCOLORS[(Math.random() * PCOLORS.length) | 0],
        sp: 0.004 + Math.random() * 0.022,
        amp: 3 + Math.random() * 17,
        ph: Math.random() * Math.PI * 2,
        bsp: 0.010 + Math.random() * 0.045,
        bph: Math.random() * Math.PI * 2,
        /* ★ 跟随速度：越靠右（越近滚动条）跟得越快 */
        ease: 0.030 + xr * 0.215,
        wob: 0.3 + Math.random() * 1.8
      });
      pCenter.push(0);
    }
  }

  var BAND_SPREAD = 0.34;              /* 粒子带纵向厚度（占屏高比例）*/

  /* 单条束带 */
  var TW = {
    cx: 0.50,          /* 居中（区域只有一条带子）*/
    amp: 0.15,         /* 横向摆幅 */
    w: 0.20,           /* 带宽（变宽）*/
    waves: 2,          /* ★ 屏幕高度内恰好扭 2 个完整波 */
    spins: 1.2,        /* 滚动加成：滚完一屏扭转 1.2 圈 */
    idle: 0.0026       /* 自主缓慢扭动速度 */
  };

  function band() {
    var cx = W * TW.cx;
    var amp = W * TW.amp;
    var halfW = W * TW.w * 0.5;
    /* 频率由屏高反推：屏高内正好 TW.waves 个完整波 */
    var freq = TW.waves * Math.PI * 2 / H;
    var phase = t * TW.idle + progress * Math.PI * 2 * TW.spins;

    function spine(y) {
      return cx
        + Math.sin(y * freq + phase) * amp
        + Math.cos(y * freq * 1.9 + phase * 1.3) * amp * 0.20;
    }

    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.00, 'rgba(0,170,255,0)');
    grad.addColorStop(0.18, 'rgba(0,170,255,0.30)');
    grad.addColorStop(0.50, 'rgba(70,150,255,0.28)');
    grad.addColorStop(0.82, 'rgba(0,150,255,0.22)');
    grad.addColorStop(1.00, 'rgba(0,150,255,0)');

    var step = 6, y;

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
    ctx.strokeStyle = 'rgba(140,205,255,0.50)';
    ctx.stroke();
  }

  function frame() {
    t += 1;
    progress += (target - progress) * 0.16;

    /* ---------- 背景星星 ---------- */
    if (sctx) {
      sctx.clearRect(0, 0, SW, SH);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.ph += s.sp;
        s.x += s.tx;
        s.y += s.ty;
        if (s.y < -4) { s.y = SH + 4; s.x = Math.random() * SW; }
        if (s.x < -4) s.x = SW + 4;
        if (s.x > SW + 4) s.x = -4;

        var sa = s.a * (0.25 + 0.75 * Math.abs(Math.sin(s.ph)));
        sctx.beginPath();
        sctx.arc(s.x, s.y, s.r, 0, 6.28318);
        sctx.fillStyle = 'rgba(' + s.c + ',' + sa + ')';
        sctx.fill();

        if (s.r > 1.2) {
          sctx.beginPath();
          sctx.arc(s.x, s.y, s.r * 3.2, 0, 6.28318);
          sctx.fillStyle = 'rgba(' + s.c + ',' + (sa * 0.16) + ')';
          sctx.fill();
        }
      }
    }

    /* ---------- 右侧 ---------- */
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    band();

    var center = progress * H;
    var spread = H * BAND_SPREAD * 0.5;

    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];

      /* ★ 各自缓动：靠右的跟得快，靠左的跟得慢 */
      pCenter[j] += (center - pCenter[j]) * p.ease;

      var drift = Math.sin(t * p.sp + p.ph) * p.amp;
      var py = pCenter[j] + p.off * spread + drift;
      if (py < -26 || py > H + 26) continue;

      var px = p.x + Math.sin(p.off * 6.2832 + t * p.sp * 2) * p.wob;

      var blink = 0.30 + 0.70 * Math.abs(Math.sin(t * p.bsp + p.bph));
      var a = p.a * blink;
      var rgb = p.col[0] + ',' + p.col[1] + ',' + p.col[2];

      ctx.beginPath();
      ctx.arc(px, py, p.r * 3.8, 0, 6.28318);
      ctx.fillStyle = 'rgba(' + rgb + ',' + (a * 0.18) + ')';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, 6.28318);
      ctx.fillStyle = 'rgba(' + rgb + ',' + a + ')';
      ctx.fill();
    }
  }

  function readScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (reduce) progress = target;
  }

  starResize();
  fxResize();
  readScroll();

  window.addEventListener('resize', function () {
    starResize(); fxResize(); readScroll();
  });
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
