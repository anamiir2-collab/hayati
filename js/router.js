/* =========================================================
   حياتي — router.js
   Lightweight hash router with view transitions
   ========================================================= */

(function (global) {
  'use strict';

  const routes = {};
  let currentRoute = null;
  let currentViewEl = null;

  function register(name, renderFn) {
    routes[name] = renderFn;
  }

  function getHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    return h || 'home';
  }

  function navigate(name, params) {
    if (name === currentRoute) {
      // re-render to refresh data
      render(name, params, true);
      return;
    }
    if (location.hash !== '#/' + name) {
      location.hash = '#/' + name;
    } else {
      render(name, params);
    }
  }

  function onHashChange() {
    const name = getHash();
    if (!routes[name]) {
      render('home');
      return;
    }
    render(name);
    updateNav(name);
  }

  function updateNav(name) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === name);
    });
  }

  function render(name, params, force) {
    if (!routes[name]) {
      console.warn('Route not found:', name);
      return;
    }
    if (currentRoute === name && !force) return;
    currentRoute = name;

    const container = document.getElementById('view-container');
    // fade out
    if (currentViewEl) {
      currentViewEl.style.opacity = '0';
      currentViewEl.style.transform = 'translateY(8px)';
    }

    setTimeout(() => {
      container.innerHTML = '';
      const view = document.createElement('div');
      view.className = 'view view-enter';
      container.appendChild(view);
      currentViewEl = view;
      routes[name](view, params || {});

      // scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });

      updateNav(name);
    }, currentViewEl ? 140 : 0);
  }

  function init() {
    window.addEventListener('hashchange', onHashChange);
    // initial
    setTimeout(() => {
      if (!location.hash) location.hash = '#/home';
      onHashChange();
    }, 0);
  }

  global.Router = { register, navigate, init, get current() { return currentRoute; } };
})(window);
