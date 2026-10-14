/* 视觉特效层
   ① 全屏背景星星 —— 缓慢闪烁，低透明度，不干扰阅读（内容之下）
   ② 右侧束带 —— 两根交叠，【自主缓慢扭动】 + 滚动加成
   ③ 右侧粒子 —— 轮廓跟随滚动进度，粒子各自速度不一，全体闪烁
   束带与粒子紧贴【内容区右边缘】（不是浏览器窗口最右）               */
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
        a: 0.08 + Math.random() * 0.30,        /* 低透明度 —— 不碍阅读 */
        ph: Math.random() * Math.PI * 2,
        sp: 0.003 + Math.random() * 0.013,     /* 各自闪烁频率 */
        tx: (Math.random() - 0.5) * 0.05,      /* 极缓漂移 */
        ty: -0.01 - Math.random() * 0.03,
        c: Math.random() < 0.28 ? '185,212,255' : '255,255,255'
      });
    }
  }

  /* ================= ②③ 右侧束带 + 粒子 ================= */
  var cv = document.getElementById('fx');
  var ctx = cv ? cv.getContext('2d') : null;
  var W = 0, H = 0;
  var parts = [], pCenter = [];
  var progress = 0, target = 0;

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
    var n = 58;
    parts = [];
    pCenter = [];
    for (var i = 0; i < n; i++) {
      parts.push({
        off: Math.random() * 2 - 1,                       /* 相对带中心的偏移 */
        x: W * (0.12 + Math.random() * 0.84),             /* 铺满整条右侧带 */
        r: 0.9 + Math.random() * 1.8,
        a: 0.55 + Math.random() * 0.45,
        col: PCOLORS[(Math.random() * PCOLORS.length) | 0],
        /* 各自速度不同 —— 造成粒子间相对运动 */
        sp: 0.004 + Math.random() * 0.022,
        amp: 3 + Math.random() * 17,
        ph: Math.random() * Math.PI * 2,
        /* 闪烁：频率/相位都不同 */
        bsp: 0.010 + Math.random() * 0.045,
        bph: Math.random() * Math.PI * 2,
        lag: 0.08 + Math.random() * 0.16,
        wob: 0.3 + Math.random() * 1.8
      });
      pCenter.push(0);
    }
  }

  var BAND_SPREAD = 0.36;   /* 粒子带纵向厚度（占屏高比例）*/

  /* 两根束带：分列左右两侧，摆幅刚好让它们在中部交叠 */
  var TW = {
    amp: 0.21,        /* 横向摆幅（画布宽比例）—— 太大两条会重合糊成一块 */
    freq: 0.0050,     /* 纵向频率 */
    w: 0.11,          /* 带宽 */
    spins: 1.4,       /* 滚动加成：滚完一屏扭转 1.4 圈 */
    idle: 0.0032,     /* 自主缓慢扭动速度（不滚动时也在动）*/
    centers: [0.26, 0.74]   /* 两条束带各自的中心位置 */
  };

  function band(index, t) {
    var cx = W * TW.centers[index];
    var amp = W * TW.amp;
    var halfW = W * TW.w * 0.5;
    var dir = index === 0 ? 1 : -1;

    /* 自主缓慢 + 滚动加成 */
    var phase = index * Math.PI * 0.85
              + t * TW.idle * dir
              + progress * Math.PI * 2 * TW.spins;

    function spine(y) {
      return cx
        + Math.sin(y * TW.freq + phase) * amp
        + Math.cos(y * TW.freq * 2.1 + phase * 1.3) * amp * 0.26;
    }

    var grad = ctx.createLinearGradient(0, 0, 0, H);
    if (index === 0) {
      grad.addColorStop(0.00, 'rgba(0,170,255,0)');
      grad.addColorStop(0.20, 'rgba(0,170,255,0.30)');
      grad.addColorStop(0.52, 'rgba(43,127,255,0.26)');
      grad.addColorStop(0.80, 'rgba(0,120,230,0.18)');
      grad.addColorStop(1.00, 'rgba(0,120,230,0)');
    } else {
      grad.addColorStop(0.00, 'rgba(0,212,255,0)');
      grad.addColorStop(0.20, 'rgba(0,212,255,0.30)');
      grad.addColorStop(0.52, 'rgba(100,170,255,0.26)');
      grad.addColorStop(0.80, 'rgba(0,150,255,0.18)');
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

  var t = 0;

  function frame() {
    t += 1;
    progress += (target - progress) * 0.16;

    /* ---------- 背景星星：各自闪烁 + 极缓漂移 ---------- */
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

        /* 闪烁：|sin| 让亮度在 0 → 1 之间起伏 */
        var sa = s.a * (0.25 + 0.75 * Math.abs(Math.sin(s.ph)));
        sctx.beginPath();
        sctx.arc(s.x, s.y, s.r, 0, 6.28318);
        sctx.fillStyle = 'rgba(' + s.c + ',' + sa + ')';
        sctx.fill();

        /* 稍大的星星带一圈极淡光晕 */
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

    band(0, t);
    band(1, t);

    /* 粒子带轮廓中心 = 滚动进度 × 屏高 */
    var center = progress * H;
    var spread = H * BAND_SPREAD * 0.5;

    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];

      /* 轮廓用统一缓动 → 视觉上"跟滑块一起动" */
      pCenter[j] += (center - pCenter[j]) * (0.10 + p.lag);

      /* 但每颗粒子有自己的速度 → 相互间有相对运动 */
      var drift = Math.sin(t * p.sp + p.ph) * p.amp;
      var py = pCenter[j] + p.off * spread + drift;
      if (py < -26 || py > H + 26) continue;

      var px = p.x + Math.sin(p.off * 6.2832 + t * p.sp * 2) * p.wob;

      /* 闪烁 */
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
    /* 减少动效：只画一帧静态图，滚动时重画 */
    frame();
    window.addEventListener('scroll', function () { frame(); }, { passive: true });
    return;
  }

  (function loop() {
    frame();
    requestAnimationFrame(loop);
  })();
})();
