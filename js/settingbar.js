/**
 * Settingbar 设置面板
 * 齿轮图标 → 点击弹出设置面板 → 滑条控制 navbar / board 透明度
 * 未来可扩展更多设置项
 */
(function () {
  'use strict';

  var STORAGE_PREFIX = 'settingbar_';
  var DEFAULTS = {
    navbar_alpha: 0.5,
    board_alpha: 0.5
  };

  // ========== 存储 ==========

  function getSetting(key) {
    try {
      var val = localStorage.getItem(STORAGE_PREFIX + key);
      return val !== null ? parseFloat(val) : DEFAULTS[key];
    } catch (e) {
      return DEFAULTS[key];
    }
  }

  function setSetting(key, val) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, val);
    } catch (e) { /* 静默 */ }
  }

  // ========== 动态样式注入 ==========

  var dynamicStyleEl = null;

  function getDynamicStyleEl() {
    if (!dynamicStyleEl) {
      dynamicStyleEl = document.getElementById('settingbar-dynamic-style');
    }
    if (!dynamicStyleEl) {
      dynamicStyleEl = document.createElement('style');
      dynamicStyleEl.id = 'settingbar-dynamic-style';
      document.head.appendChild(dynamicStyleEl);
    }
    return dynamicStyleEl;
  }

  function updateDynamicStyles() {
    var navbarAlpha = getSetting('navbar_alpha');
    var boardAlpha = getSetting('board_alpha');

    // 同时注入日间/夜间规则，用与 board-glass.css 相同的特异性确保覆盖
    // 日间 navbar: #2f4154, 夜间: #1f3144
    // 日间 board:  #fff,     夜间: #252d38
    getDynamicStyleEl().textContent = [
      // Navbar — 日间 & 夜间
      '.top-nav-collapse { background-color: rgba(47, 65, 84, ' + navbarAlpha + ') !important; }',
      '.dropdown-collapse { background-color: rgba(47, 65, 84, ' + navbarAlpha + ') !important; }',
      '.navbar-col-show { background-color: rgba(47, 65, 84, ' + navbarAlpha + ') !important; }',
      '[data-user-color-scheme="dark"] .top-nav-collapse { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; }',
      '[data-user-color-scheme="dark"] .dropdown-collapse { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; }',
      '[data-user-color-scheme="dark"] .navbar-col-show { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; }',
      // Navbar — 系统夜间模式
      '@media (prefers-color-scheme: dark) { ' +
        ':root:not([data-user-color-scheme]) .top-nav-collapse { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; } ' +
        ':root:not([data-user-color-scheme]) .dropdown-collapse { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; } ' +
        ':root:not([data-user-color-scheme]) .navbar-col-show { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; } ' +
      '}',
      // Board — 日间
      '#board { background-color: rgba(255, 255, 255, ' + boardAlpha + ') !important; }',
      // Board — 手动夜间模式
      '[data-user-color-scheme="dark"] #board { background-color: rgba(37, 45, 56, ' + boardAlpha + ') !important; }',
      // Board — 系统夜间模式
      '@media (prefers-color-scheme: dark) { ' +
        ':root:not([data-user-color-scheme]) #board { background-color: rgba(37, 45, 56, ' + boardAlpha + ') !important; } ' +
      '}',
      // Settingbar 面板 — 透明度跟随 navbar
      '.settingbar-panel { background-color: rgba(47, 65, 84, ' + navbarAlpha + ') !important; }',
      '[data-user-color-scheme="dark"] .settingbar-panel { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; }',
      '@media (prefers-color-scheme: dark) { ' +
        ':root:not([data-user-color-scheme]) .settingbar-panel { background-color: rgba(31, 49, 68, ' + navbarAlpha + ') !important; } ' +
      '}'
    ].join('\n');
  }

  // ========== 面板构建 ==========

  function createSliderItem(label, key, min, max) {
    var currentVal = Math.round(getSetting(key) * 100);
    var div = document.createElement('div');
    div.className = 'settingbar-item';
    div.innerHTML =
      '<label class="settingbar-label">' +
        '<span>' + label + '</span>' +
        '<span class="settingbar-val" data-key="' + key + '">' + currentVal + '%</span>' +
      '</label>' +
      '<input type="range" class="settingbar-slider" data-key="' + key +
        '" min="' + min + '" max="' + max + '" value="' + currentVal + '">';
    return div;
  }

  function buildPanel() {
    var panel = document.createElement('div');
    panel.id = 'settingbar-panel';
    panel.className = 'settingbar-panel';

    panel.appendChild(createSliderItem('Navbar', 'navbar_alpha', 0, 100));
    panel.appendChild(createSliderItem('Board', 'board_alpha', 0, 100));

    return panel;
  }

  // ========== 面板定位 ==========

  function isMobile() {
    return window.innerWidth <= 991.98;
  }

  function repositionPanel(panel) {
    // 移动端由 CSS 控制居中，JS 不干预
    if (isMobile()) {
      panel.style.top = '';
      panel.style.right = '';
      return;
    }

    var navbar = document.getElementById('navbar');
    if (!navbar || !panel) return;

    var navRect = navbar.getBoundingClientRect();
    var gearBtn = document.getElementById('settingbar-toggle-btn');
    var gearRect = gearBtn ? gearBtn.getBoundingClientRect() : null;

    panel.style.top = navRect.bottom + 'px';
    if (gearRect) {
      panel.style.right = (window.innerWidth - gearRect.right) + 'px';
    }
  }

  // ========== 事件绑定 ==========

  function bindEvents(gearLi, panel) {
    var toggleLink = gearLi.querySelector('a');

    var _rafId = null;

    function startTracking() {
      if (_rafId) return;
      function tick() {
        repositionPanel(panel);
        _rafId = requestAnimationFrame(tick);
      }
      _rafId = requestAnimationFrame(tick);
    }

    function stopTracking() {
      if (_rafId) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
      }
    }

    // 点击齿轮 → 切换面板
    toggleLink.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var isOpen = panel.classList.toggle('settingbar-panel-show');
      gearLi.classList.toggle('settingbar-open', isOpen);
      if (isOpen) {
        repositionPanel(panel);
        startTracking();
      } else {
        stopTracking();
      }
    });

    // 面板内点击不冒泡
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    // 点击外部关闭面板
    document.addEventListener('click', function (e) {
      if (!gearLi.contains(e.target)) {
        panel.classList.remove('settingbar-panel-show');
        gearLi.classList.remove('settingbar-open');
        stopTracking();
      }
    });

    // 滑条事件
    panel.addEventListener('input', function (e) {
      var slider = e.target;
      if (!slider.classList.contains('settingbar-slider')) return;

      var key = slider.getAttribute('data-key');
      var val = parseInt(slider.value, 10) / 100;
      setSetting(key, val);

      // 更新数值显示
      var valEl = panel.querySelector('.settingbar-val[data-key="' + key + '"]');
      if (valEl) valEl.textContent = slider.value + '%';

      updateDynamicStyles();
    });
  }

  // ========== 入口 ==========

  function init() {
    var colorToggleBtn = document.getElementById('color-toggle-btn');
    if (!colorToggleBtn) return;

    // 创建齿轮图标
    var gearLi = document.createElement('li');
    gearLi.className = 'nav-item';
    gearLi.id = 'settingbar-toggle-btn';
    gearLi.innerHTML = '<a class="nav-link" target="_self" href="javascript:;" aria-label="Settings">' +
      '<i class="iconfont" id="settingbar-toggle-icon">' +
        '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M967.891937 410.798338h-54.2816a403.470211 403.470211 0 0 0-46.374351-109.877363l39.023949-39.113044a55.528941 55.528941 0 0 0 16.326801-39.513976c0-14.901268-5.835773-28.9784-16.326801-39.491702l-65.039915-64.973092c-21.093424-21.115698-57.956801-21.093424-78.961129-0.022274l-40.672221 40.427207a404.049333 404.049333 0 0 0-108.407282-44.013312V56.130337c0-30.804864-24.612707-56.130337-55.417571-56.130337h-91.946839c-30.804864 0-55.038914 25.325474-55.038914 56.130337v58.068171a405.16303 405.16303 0 0 0-108.652296 44.035586l-40.649946-40.427207c-21.07115-21.115698-57.956801-21.093424-79.094773-0.022274L117.383682 182.757706a56.130337 56.130337 0 0 0-16.371349 39.491701c0 14.901268 5.768951 28.933852 16.326801 39.469428l39.023949 39.20214a403.403389 403.403389 0 0 0-46.352077 109.877363H55.707132A55.506667 55.506667 0 0 0 0 466.305005v91.880017c0 30.827138 24.879995 55.038914 55.707132 55.038914h54.303874a405.408044 405.408044 0 0 0 46.307529 110.100102l-39.023949 39.268962c-10.557849 10.535575-16.349074 24.634981-16.349075 39.558524s5.813499 29.022948 16.349075 39.558523l65.039915 65.017641c10.557849 10.535575 24.56816 16.326801 39.469427 16.326801s28.933852-5.813499 39.491702-16.326801l40.828138-40.449481a406.655385 406.655385 0 0 0 108.652296 44.05786v58.001348c0 30.804864 24.23405 55.640311 55.038914 55.640311h91.946839a55.350749 55.350749 0 0 0 55.417571-55.640311v-58.023622a404.272073 404.272073 0 0 0 108.45183-44.035586l40.471755 40.360385a55.439845 55.439845 0 0 0 39.53625 16.371349c14.923542 0 28.9784-5.813499 39.513976-16.326801l65.039914-64.973093a55.640311 55.640311 0 0 0 16.349075-39.469428c0-14.923542-5.835773-28.933852-16.349075-39.491701l-38.979401-39.42488a407.056316 407.056316 0 0 0 46.329803-110.100102h54.303874c30.804864 0 56.130337-24.211776 56.130337-55.038914v-91.880017c0.022274-30.738042-25.280926-55.506667-56.085789-55.506667zM511.766124 687.151154c-97.515324 0-176.587823-78.337459-176.587824-174.895004 0-96.624366 79.072499-174.850456 176.587824-174.850455 97.537598 0 176.654645 78.226089 176.654645 174.850455-0.022274 96.579819-79.117047 174.895004-176.654645 174.895004z"/>' +
        '</svg>' +
      '</i></a>';

    // 插入到 color-toggle 后面
    colorToggleBtn.parentNode.insertBefore(gearLi, colorToggleBtn.nextSibling);

    // 构建设置面板
    var panel = buildPanel();
    gearLi.appendChild(panel);

    // 绑定事件
    bindEvents(gearLi, panel);

    // 应用初始样式
    updateDynamicStyles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();