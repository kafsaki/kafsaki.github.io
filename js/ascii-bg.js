/**
 * ASCII 字符画背景渲染器 - 逐列揭示版
 * 每列从上到下逐字渲染，初始随机长度，最新字符为白色渐变到原色
 */
(function () {
  'use strict';

  var PATH_MAP = [
    { pattern: /^\/$/, name: 'bluecoffee' },
    { pattern: /^\/\d{4}\/\d{2}\/\d{2}\//, name: 'purple' },
    { pattern: /^\/archives\//, name: 'DarkRoom' },
    { pattern: /^\/categories\//, name: 'DarkRoom' },
    { pattern: /^\/tags\//, name: 'DarkRoom' },
    { pattern: /^\/about\//, name: 'DarkRoom' }
  ];

  function detectAsciiName() {
    var path = window.location.pathname;
    for (var i = 0; i < PATH_MAP.length; i++) {
      if (PATH_MAP[i].pattern.test(path)) {
        return PATH_MAP[i].name;
      }
    }
    return null;
  }

  function loadAsciiData(name) {
    return fetch('/data/ascii/' + name + '.json')
      .then(function (resp) {
        if (!resp.ok) throw new Error('Failed to load ' + name + '.json');
        return resp.json();
      });
  }

  /**
   * 解析十六进制颜色为 RGB
   */
  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }

  /**
   * RGB 转十六进制
   */
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    }).join('');
  }

  /**
   * 在两个颜色之间插值
   */
  function lerpColor(hex1, hex2, t) {
    var c1 = hexToRgb(hex1);
    var c2 = hexToRgb(hex2);
    return rgbToHex(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t
    );
  }

  /**
   * 逐列从上到下揭示字符画
   */
  function startReveal(banner, data) {
    var cols = data.cols;
    var rows = data.rows;
    var chars = data.chars;
    var colors = data.colors;
    var dominantColor = data.dominantColor || '#1a1a2e';

    // 设置 banner 背景色
    banner.style.backgroundColor = dominantColor;
    banner.style.backgroundImage = 'none';
    banner.style.position = 'relative';
    banner.style.overflow = 'hidden';

    // 计算 banner 遮罩叠加后的实际颜色（rgba(0,0,0,0.3) * 0.7）
    var rgb = hexToRgb(dominantColor);
    var darkenedColor = rgbToHex(
      Math.round(rgb.r * 0.7),
      Math.round(rgb.g * 0.7),
      Math.round(rgb.b * 0.7)
    );

    document.documentElement.style.setProperty('--ascii-body-bg', darkenedColor);

    // 创建 canvas
    var canvas = document.createElement('canvas');
    canvas.className = 'ascii-bg-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;';
    banner.insertBefore(canvas, banner.firstChild);

    var ctx = canvas.getContext('2d');

    // 每列揭示状态：已揭示行数、帧计数器、速度
    var columns = [];
    for (var c = 0; c < cols; c++) {
      columns.push({
        revealed: 0, // 初始为 0，从顶部开始揭示
        tick: 0,
        speed: 0.3 + Math.random() * 0.7  // 每帧前进的字符数
      });
    }

    var animationComplete = false;
    var animationId;
    var dims;

    /**
     * 计算尺寸，cover 模式始终填满 banner
     * 等宽字体字符宽 ≈ 0.6 * fontSize，字符高 ≈ 1.2 * fontSize
     */
    function calcDimensions() {
      var bw = banner.offsetWidth;
      var bh = banner.offsetHeight;
      if (bw === 0 || bh === 0) return null;

      var dpr = window.devicePixelRatio || 1;
      var fsByWidth = bw / (cols * 0.6);
      var fsByHeight = bh / (rows * 1.2);
      var fontSize = Math.max(fsByWidth, fsByHeight);

      var cellW = fontSize * 0.6;
      var cellH = fontSize * 1.2;
      var offsetX = (bw - cellW * cols) / 2;
      var offsetY = (bh - cellH * rows) / 2;

      canvas.width = bw * dpr;
      canvas.height = bh * dpr;
      canvas.style.width = bw + 'px';
      canvas.style.height = bh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      return { cellW: cellW, cellH: cellH, offsetX: offsetX, offsetY: offsetY, bw: bw, bh: bh };
    }

    dims = calcDimensions();
    if (!dims) return;

    /**
     * 绘制当前已揭示的所有字符
     */
    function renderAll() {
      if (!dims) return;

      ctx.fillStyle = dominantColor;
      ctx.fillRect(0, 0, dims.bw, dims.bh);

      if (dims.cellH <= 0) return;
      var fontSize = Math.max(8, dims.cellH * 0.9);
      ctx.font = fontSize + 'px "Courier New", Consolas, Menlo, monospace';
      ctx.textBaseline = 'top';

      var ox = dims.offsetX;
      var oy = dims.offsetY;
      var cw = dims.cellW;
      var ch = dims.cellH;

      for (var c = 0; c < cols; c++) {
        var col = columns[c];
        for (var r = 0; r < col.revealed && r < rows; r++) {
          ctx.fillStyle = colors[r][c];
          ctx.fillText(chars[r][c], ox + c * cw, oy + r * ch);
        }
      }
    }

    /**
     * 动画帧：推进每列揭示进度
     */
    function drawFrame() {
      if (!dims) { dims = calcDimensions(); if (!dims) { requestAnimationFrame(drawFrame); return; } }

      var allComplete = true;

      for (var c = 0; c < cols; c++) {
        var col = columns[c];
        if (col.revealed >= rows) continue;

        allComplete = false;
        col.tick += col.speed;
        while (col.tick >= 1 && col.revealed < rows) {
          col.revealed++;
          col.tick -= 1;
        }
      }

      renderAll();

      if (allComplete) {
        animationComplete = true;
        return;
      }

      animationId = requestAnimationFrame(drawFrame);
    }

    // 窗口 resize 时重新计算尺寸并重绘
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        dims = calcDimensions();
        renderAll();
      }, 150);
    });

    animationId = requestAnimationFrame(drawFrame);
  }

  function init() {
    var asciiName = detectAsciiName();
    if (!asciiName) return;

    loadAsciiData(asciiName).then(function (data) {
      var banner = document.querySelector('#banner');
      if (!banner) return;
      startReveal(banner, data);
    }).catch(function () {
      // 静默失败
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();