<script id="hsl-theme-boot">
  /* ==========================================================================
     HorizonSimLabs — 主题脚本（配合 assets/theme.css）
     · 在 <head> 里尽早执行，避免浅色模式先闪一下深色
     · 主题三态：跟随系统（默认）/ 深色 / 浅色，前两者由 localStorage 记住
     · 提供 window.HSLTheme.onChange(fn)，供地图页在切换后重绘 ECharts
     ========================================================================== */
  (function () {
    var KEY = 'hsl-theme';
    var VALID = ['dark', 'light'];

    function mql() {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)'));
    }
    function systemTheme() { return (mql() && mql().matches) ? 'light' : 'dark'; }
    function savedTheme() {
      try { var v = localStorage.getItem(KEY); return VALID.indexOf(v) >= 0 ? v : null; } catch (e) { return null; }
    }

    var listeners = [];

    function paintButtons(theme) {
      var btns = document.querySelectorAll('[data-theme-toggle]');
      var label = theme === 'light' ? '切换到深色' : '切换到浅色';
      for (var i = 0; i < btns.length; i++) {
        btns[i].setAttribute('title', label);
        btns[i].setAttribute('aria-label', label);
        if (!btns[i].dataset.painted) {
          btns[i].innerHTML = '<span class="hsl-i-sun">☀</span><span class="hsl-i-moon">☾</span>';
          btns[i].dataset.painted = '1';
        }
      }
    }

    function apply(theme, persist) {
      document.documentElement.setAttribute('data-theme', theme);
      if (persist) { try { localStorage.setItem(KEY, theme); } catch (e) {} }
      paintButtons(theme);
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](theme); } catch (e) {}
      }
      try { window.dispatchEvent(new CustomEvent('hsl:themechange', { detail: { theme: theme } })); } catch (e) {}
    }

    function toggle() {
      apply(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
    }

    /* —— 立即设定（同步，在 head 中执行）—— */
    apply(savedTheme() || systemTheme(), false);

    /* —— 跟随系统变化（用户没手动选过才跟）—— */
    if (window.matchMedia) {
      var m = mql();
      var onSys = function (e) { if (!savedTheme()) apply(e.matches ? 'light' : 'dark', false); };
      if (m.addEventListener) m.addEventListener('change', onSys);
      else if (m.addListener) m.addListener(onSys);
    }

    /* —— 绑定切换按钮 —— */
    document.addEventListener('DOMContentLoaded', function () {
      paintButtons(document.documentElement.getAttribute('data-theme'));
      var btns = document.querySelectorAll('[data-theme-toggle]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation(); toggle();
        });
      }
    });

    window.HSLTheme = {
      current: function () { return document.documentElement.getAttribute('data-theme') || 'dark'; },
      isDark: function () { return this.current() !== 'light'; },
      toggle: toggle,
      set: function (t) { apply(VALID.indexOf(t) >= 0 ? t : 'dark', true); },
      reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} apply(systemTheme(), false); },
      onChange: function (fn) {
        listeners.push(fn);
        try { fn(this.current()); } catch (e) {}
      },
      /* 读取当前主题下的 CSS 变量（地图配色用） */
      color: function (name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name);
        v = (v || '').trim();
        return v || fallback || '';
      }
    };
  })();
</script>

<style id="hsl-theme-toggle-style">
  .hsl-theme-toggle {
    position: relative; display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; padding: 0; border-radius: 50%; cursor: pointer;
    border: 1px solid var(--line); background: var(--panel); color: var(--text);
    box-shadow: var(--shadow-sm); font-size: 1rem; line-height: 1; font-family: inherit;
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    transition: transform .32s var(--ease), border-color .25s ease, box-shadow .25s ease;
  }
  .hsl-theme-toggle:hover { transform: rotate(-16deg) scale(1.08); border-color: var(--line-strong); box-shadow: var(--shadow-md); }
  .hsl-theme-toggle:active { transform: scale(.93); }
  .hsl-theme-toggle:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; }
  .hsl-theme-toggle .hsl-i-sun { display: none; }
  :root[data-theme="light"] .hsl-theme-toggle .hsl-i-sun { display: inline; }
  :root[data-theme="light"] .hsl-theme-toggle .hsl-i-moon { display: none; }
  .hsl-theme-float { position: fixed; top: 16px; right: 16px; z-index: 10001; }
</style>
