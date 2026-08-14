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

    panel.appendChild(createSliderItem('Navbar', 'navbar_alpha', 10, 100));
    panel.appendChild(createSliderItem('Board', 'board_alpha', 0, 100));

    return panel;
  }

  // ========== 面板定位 ==========

  function repositionPanel(panel) {
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
          '<path d="M512 128c-26 0-52 6-76 18l-56 24-18 56c-12 4-22 10-32 16l-52-24-58 58 24 52c-6 10-10 20-14 32l-56 18-24 56 18 76 24 56 56 18c4 12 8 22 14 32l-24 52 58 58 52-24c10 6 20 12 32 16l18 56 56 24 76-18 56-24 18-56c12-4 22-10 32-16l52 24 58-58-24-52c6-10 10-20 14-32l56-18 24-56-18-76-24-56-56-18c-4-12-8-22-14-32l24-52-58-58-52 24c-10-6-20-12-32-16l-18-56-56-24-76 18z m0 64l48 16 12 40 18 10c24 14 48 22 74 24l44-18 28 28-18 44-10 18c-2 26 6 52 22 74l16 18 18 44-28 28-44-18-18 10c-24 2-50 12-72 26l-10 18-12 40-48 16-48-16-12-40-18-10c-24-14-48-22-74-24l-44 18-28-28 18-44 10-18c2-26-6-52-22-74l-16-18-18-44 28-28 44 18 18-10c24-2 50-12 72-26l10-18 12-40 48-16z"/>' +
          '<circle cx="512" cy="512" r="128"/>' +
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