/* =========================================================
   حياتي — app.js
   Main orchestrator: header, home view, settings, theme,
   bottom-nav wiring, notifications modal, global search
   ========================================================= */

(function (global) {
  'use strict';

  const App = {
    initialized: false,
    activeRoute: 'home'
  };

  /* ---------- Splash ---------- */
  function hideSplash() {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hide');
      splash.setAttribute('aria-hidden', 'true');
      setTimeout(() => splash.remove(), 600);
    }
    document.getElementById('app').hidden = false;
  }

  /* ---------- Theme ---------- */
  function applyTheme(mode) {
    let theme = mode;
    if (mode === 'auto') {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = theme === 'dark' ? '#0B1220' : '#0066FF';
  }

  function applyTextSize(size) {
    document.documentElement.classList.toggle('text-lg', size === 'large');
  }

  /* ---------- Header renderer ---------- */
  function renderHeader(title) {
    const user = Storage.getUser();
    const initial = (user.name || 'صديق').trim().charAt(0);
    const unread = Storage.getUnreadNotifsCount();
    return `
      <header class="app-header">
        <div class="brand">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">حياتي</span>
            <span class="brand-tag">نظّم يومك ببساطة</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" id="btn-search" aria-label="بحث">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          </button>
          <button class="icon-btn" id="btn-notif" aria-label="الإشعارات">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg>
            ${unread > 0 ? '<span class="badge"></span>' : ''}
          </button>
          <button class="avatar" id="btn-profile" aria-label="الحساب">${initial}</button>
        </div>
      </header>
    `;
  }

  function wireHeader(view) {
    const searchBtn = view.querySelector('#btn-search');
    const notifBtn   = view.querySelector('#btn-notif');
    const profBtn    = view.querySelector('#btn-profile');
    if (searchBtn) searchBtn.addEventListener('click', () => openSearchModal());
    if (notifBtn) notifBtn.addEventListener('click', () => openNotificationsModal());
    if (profBtn) profBtn.addEventListener('click', () => Router.navigate('settings'));
  }

  /* ---------- Home view ---------- */
  function renderHomeView(view) {
    const today = new Date();
    const greeting = DateH.greeting(today);
    const tasks = Storage.getTasks();
    const todayTasks = Tasks.filterToday(tasks);
    const done = todayTasks.filter(t => t.done).length;
    const total = todayTasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const remaining = total - done;
    const user = Storage.getUser();
    const initial = (user.name || 'صديق').trim().charAt(0);

    view.innerHTML = `
      <header class="app-header">
        <div class="brand">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">حياتي</span>
            <span class="brand-tag">نظّم يومك ببساطة</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" id="btn-search" aria-label="بحث">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          </button>
          <button class="icon-btn" id="btn-notif" aria-label="الإشعارات">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg>
            <span class="badge" style="display:none"></span>
          </button>
          <button class="avatar" id="btn-profile" aria-label="الحساب">${initial}</button>
        </div>
      </header>

      <div class="hero-card view-enter">
        <div class="hero-greeting">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>
          ${greeting} 👋
        </div>
        <h2 class="hero-title">أنجزت ${done} من ${total} مهام اليوم</h2>
        <p class="hero-sub">${remaining > 0 ? 'متبقي ' + remaining + ' مهام — خلّي يومك أخف خطوة بخطوة' : 'أحسنت! أنهيت كل مهام اليوم'}</p>
        <div class="hero-progress">
          <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-label"><span>${pct}% إنجاز</span><span>${done}/${total}</span></div>
        </div>
        <button class="hero-add-btn" id="hero-add">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          إضافة مهمة جديدة
        </button>
      </div>

      <div class="quick-row">
        <div class="quick-stat completed"><div class="num">${done}</div><div class="lbl">مكتملة</div></div>
        <div class="quick-stat pending"><div class="num">${remaining}</div><div class="lbl">متبقية</div></div>
        <div class="quick-stat late"><div class="num">${tasks.filter(t => Tasks.isTaskLate(t)).length}</div><div class="lbl">متأخرة</div></div>
      </div>

      <div class="tasks-stack">
        <div class="tasks-stack-header">
          <h2>مهام اليوم <span class="count-chip">${total}</span></h2>
          <button class="link" onclick="Router.navigate('all')">عرض الكل
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg>
          </button>
        </div>
        <div id="home-stack"></div>
      </div>
    `;

    wireHeader(view);
    view.querySelector('#hero-add').addEventListener('click', () => Tasks.openAddModal());

    // Render today's tasks (max 5 in stack)
    const stackContainer = view.querySelector('#home-stack');
    const sorted = Tasks.sortTasks(todayTasks, 'priority').slice(0, 5);
    if (sorted.length === 0) {
      stackContainer.innerHTML = `<div class="empty-state"><div class="empty-ill"><svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div class="empty-title">يومك فاضي</div><div class="empty-desc">ابدأ بإضافة أول مهمة، وستشعر بالإنجاز من أول خطوة</div><button class="btn mt-18" onclick="Tasks.openAddModal()">+ إضافة مهمة</button></div>`;
    } else {
      Tasks.renderStackedCards(stackContainer, sorted, { emptyMsg: '' });
    }
  }

  /* ---------- Settings view ---------- */
  function renderSettingsView(view) {
    const s = Storage.getSettings();
    const user = Storage.getUser();
    view.innerHTML = `
      ${renderHeader('الإعدادات')}
      <div class="section-title"><h2>الحساب</h2></div>
      <div class="settings-group">
        <button class="settings-row" id="s-name">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></div>
          <div class="sr-label">الاسم</div>
          <div class="sr-value">${Tasks.escapeHTML(user.name || 'صديق')}</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
      </div>

      <div class="section-title"><h2>الإعدادات</h2></div>
      <div class="settings-group">
        <div class="settings-row">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg></div>
          <div class="sr-label">الإشعارات</div>
          <button class="toggle ${s.notifications ? 'on' : ''}" data-toggle="notifications" aria-label="الإشعارات"></button>
        </div>
        <div class="settings-row">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4z M15 9a4 4 0 0 1 0 6"/></svg></div>
          <div class="sr-label">صوت التذكير</div>
          <button class="toggle ${s.reminderSound ? 'on' : ''}" data-toggle="reminderSound" aria-label="صوت"></button>
        </div>
        <div class="settings-row">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l1.5 4.5h4.5l-3.6 2.6 1.4 4.3-3.8-2.8-3.8 2.8 1.4-4.3L6 7.5h4.5z"/></svg></div>
          <div class="sr-label">الرسائل التحفيزية</div>
          <button class="toggle ${s.motivBanner ? 'on' : ''}" data-toggle="motivBanner" aria-label="التحفيز"></button>
        </div>
      </div>

      <div class="section-title"><h2>المظهر</h2></div>
      <div class="settings-group">
        <button class="settings-row" id="s-theme">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></div>
          <div class="sr-label">الوضع الليلي</div>
          <div class="sr-value">${s.darkMode === 'auto' ? 'تلقائي' : (s.darkMode === 'dark' ? 'مفعّل' : 'معطّل')}</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
        <button class="settings-row" id="s-textsize">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h6"/></svg></div>
          <div class="sr-label">حجم الخط</div>
          <div class="sr-value">${s.textSize === 'large' ? 'كبير' : 'عادي'}</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
      </div>

      <div class="section-title"><h2>التذكيرات</h2></div>
      <div class="settings-group">
        <button class="settings-row" id="s-reminders">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4M12 17v.5M5 5L3 3M21 21l-2-2"/></svg></div>
          <div class="sr-label">إدارة التذكيرات</div>
          <div class="sr-value">${Storage.getReminders().length} تذكير</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
      </div>

      <div class="section-title"><h2>البيانات</h2></div>
      <div class="settings-group">
        <button class="settings-row" id="s-export">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg></div>
          <div class="sr-label">تصدير البيانات</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
        <button class="settings-row" id="s-import">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21V9M7 14l5-5 5 5M4 3h16"/></svg></div>
          <div class="sr-label">استيراد البيانات</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
        <button class="settings-row" id="s-reset">
          <div class="sr-icon" style="background:color-mix(in srgb, #EF4F6B 14%, transparent);color:#EF4F6B;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/></svg></div>
          <div class="sr-label" style="color:#EF4F6B;">إعادة ضبط البيانات</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
      </div>

      <div class="section-title"><h2>عن التطبيق</h2></div>
      <div class="settings-group">
        <button class="settings-row" id="s-install-app">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 21h14"/></svg></div>
          <div class="sr-label">تثبيت التطبيق</div>
          <div class="sr-value">إضافة للشاشة الرئيسية</div>
          <div class="sr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 6l-6 6 6 6"/></svg></div>
        </button>
        <button class="settings-row" id="s-about">
          <div class="sr-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8v.5"/></svg></div>
          <div class="sr-label">عن حياتي</div>
          <div class="sr-value">الإصدار 1.0.0</div>
        </button>
      </div>

      <div style="height: 24px;"></div>
    `;

    wireHeader(view);

    // toggles
    view.querySelectorAll('.toggle[data-toggle]').forEach(t => {
      t.addEventListener('click', () => {
        const key = t.dataset.toggle;
        const s = Storage.getSettings();
        const next = !s[key];
        Storage.setSettings({ [key]: next });
        t.classList.toggle('on', next);
      });
    });

    // theme
    view.querySelector('#s-theme').addEventListener('click', () => {
      const order = ['auto', 'light', 'dark'];
      const s = Storage.getSettings();
      const idx = order.indexOf(s.darkMode);
      const next = order[(idx + 1) % 3];
      Storage.setSettings({ darkMode: next });
      applyTheme(next);
      App.refresh();
    });
    // text size
    view.querySelector('#s-textsize').addEventListener('click', () => {
      const s = Storage.getSettings();
      const next = s.textSize === 'large' ? 'normal' : 'large';
      Storage.setSettings({ textSize: next });
      applyTextSize(next);
      App.refresh();
    });
    // user name
    view.querySelector('#s-name').addEventListener('click', () => openNameModal());
    // reminders
    view.querySelector('#s-reminders').addEventListener('click', () => openRemindersModal());

    // export
    view.querySelector('#s-export').addEventListener('click', () => {
      const data = JSON.stringify(Storage.exportAll(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hayati-backup-' + DateH.todayStr() + '.json';
      a.click();
      URL.revokeObjectURL(url);
      Notifications.success('تم تصدير البيانات');
    });
    // import
    view.querySelector('#s-import').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json,.json';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const data = JSON.parse(r.result);
            if (confirm('استيراد البيانات سيستبدل بياناتك الحالية. متابعة؟')) {
              Storage.importAll(data);
              Notifications.success('تم استيراد البيانات');
              App.refresh();
            }
          } catch (e) {
            Notifications.error('ملف غير صالح');
          }
        };
        r.readAsText(f);
      };
      inp.click();
    });
    // reset
    view.querySelector('#s-reset').addEventListener('click', () => {
      if (confirm('سيتم حذف كل البيانات نهائيًا. متابعة؟')) {
        Storage.resetAll();
        Notifications.success('تمت إعادة الضبط');
        setTimeout(() => location.reload(), 600);
      }
    });
    // about
    view.querySelector('#s-about').addEventListener('click', () => openAboutModal());
    // install
    view.querySelector('#s-install-app').addEventListener('click', () => {
      const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
      if (isStandalone) {
        Notifications.toast('التطبيق مثبت بالفعل على جهازك', 'success');
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) showIOSInstallHint();
        else Notifications.info('افتح التطبيق على المتصفح ثم اختر "تثبيت" من القائمة');
      }
    });
  }

  /* ---------- Modals: name, reminders, about, search, notifs ---------- */
  function openNameModal() {
    const user = Storage.getUser();
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">الاسم</h3>
          <button class="sheet-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="field">
          <label>اسمك</label>
          <input class="input" id="nm-name" maxlength="40" placeholder="اكتب اسمك" value="${Tasks.escapeHTML(user.name || '')}" />
        </div>
        <button class="btn mt-12" id="nm-save">حفظ</button>
      </div>
    `;
    root.querySelector('.modal-backdrop').addEventListener('click', closeModals);
    root.querySelector('.sheet-close').addEventListener('click', closeModals);
    root.querySelector('#nm-save').addEventListener('click', () => {
      const name = root.querySelector('#nm-name').value.trim() || 'صديق';
      Storage.setUser({ name: name });
      Notifications.success('تم الحفظ');
      closeModals();
      App.refresh();
    });
  }

  function openRemindersModal() {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">التذكيرات</h3>
          <button class="sheet-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="section-title" style="margin-top:4px;">
          <h2 style="font-size:14px;">التذكيرات النشطة</h2>
          <button class="link" onclick="Reminders.openAddModal()">+ تذكير</button>
        </div>
        <div id="rm-list"></div>
        <button class="btn mt-12" id="rm-close">إغلاق</button>
      </div>
    `;
    root.querySelector('.modal-backdrop').addEventListener('click', closeModals);
    root.querySelector('.sheet-close').addEventListener('click', closeModals);
    root.querySelector('#rm-close').addEventListener('click', closeModals);
    Reminders.renderRemindersList(root.querySelector('#rm-list'));
  }

  function openAboutModal() {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">عن حياتي</h3>
          <button class="sheet-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div style="text-align:center; padding:20px 0;">
          <div class="splash-logo" style="margin:0 auto 16px; width:72px; height:72px; border-radius:22px;">
            <svg viewBox="0 0 64 64" width="44" height="44"><path d="M22 34 L29 41 L43 25" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <h2 style="font-size:24px;">حياتي</h2>
          <p class="text-muted text-sm mt-12">مساعدك الشخصي لتنظيم يومك وحياتك</p>
          <p class="text-muted text-xs mt-12">الإصدار 1.0.0 — تصميم وتطوير ليعمل بكفاءة على جميع الأجهزة</p>
        </div>
        <button class="btn mt-12" id="ab-close">حسنًا</button>
      </div>
    `;
    root.querySelector('.modal-backdrop').addEventListener('click', closeModals);
    root.querySelector('.sheet-close').addEventListener('click', closeModals);
    root.querySelector('#ab-close').addEventListener('click', closeModals);
  }

  function openSearchModal() {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">بحث سريع</h3>
          <button class="sheet-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="sr-input" type="search" placeholder="ابحث عن مهمة، عادة، أو تذكير..." autofocus />
        </div>
        <div id="sr-results" style="max-height:60vh; overflow-y:auto;"></div>
      </div>
    `;
    root.querySelector('.modal-backdrop').addEventListener('click', closeModals);
    root.querySelector('.sheet-close').addEventListener('click', closeModals);
    const input = root.querySelector('#sr-input');
    const results = root.querySelector('#sr-results');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { results.innerHTML = '<p class="text-muted text-sm" style="padding:20px; text-align:center;">اكتب للبحث...</p>'; return; }
      const tasks = Storage.getTasks().filter(t => (t.name + ' ' + (t.desc || '')).toLowerCase().indexOf(q) !== -1).slice(0, 8);
      const habits = Storage.getHabits().filter(h => h.name.toLowerCase().indexOf(q) !== -1).slice(0, 5);
      const reminders = Storage.getReminders().filter(r => r.text.toLowerCase().indexOf(q) !== -1).slice(0, 5);

      let html = '';
      if (tasks.length) {
        html += '<div class="text-xs text-muted fw-700 pb-12" style="padding:10px 4px 6px;">المهام</div>';
        html += tasks.map(t => {
          const c = Tasks.catMeta(t.category);
          return `<div class="list-card" data-open="task:${t.id}" style="cursor:pointer;"><button class="tc-check ${t.done ? 'task-card done' : ''}" style="background:${t.done ? '#18B26B' : 'transparent'};border-color:${t.done ? '#18B26B' : 'var(--border-strong)'};"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div style="flex:1;"><div class="fw-700 ${t.done ? 'text-muted' : ''}" style="${t.done ? 'text-decoration:line-through;' : ''}">${Tasks.escapeHTML(t.name)}</div><div class="text-xs text-muted">${c.name} • ${t.date}</div></div></div>`;
        }).join('');
      }
      if (habits.length) {
        html += '<div class="text-xs text-muted fw-700 pb-12" style="padding:14px 4px 6px;">العادات</div>';
        html += habits.map(h => `<div class="list-card" data-open="habit:${h.id}" style="cursor:pointer;"><div class="habit-icon" style="--habit-color:${h.color}; background:color-mix(in srgb, ${h.color} 14%, transparent); color:${h.color};">${Habits.iconSvg(h.icon, 18)}</div><div style="flex:1;"><div class="fw-700">${Tasks.escapeHTML(h.name)}</div><div class="text-xs text-muted">عادة</div></div></div>`).join('');
      }
      if (reminders.length) {
        html += '<div class="text-xs text-muted fw-700 pb-12" style="padding:14px 4px 6px;">التذكيرات</div>';
        html += reminders.map(r => `<div class="list-card" data-open="reminder:${r.id}" style="cursor:pointer;"><div class="reminder-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg></div><div style="flex:1;"><div class="fw-700">${Tasks.escapeHTML(r.text)}</div><div class="text-xs text-muted">${DateH.formatTimeFromStr(r.time)}</div></div></div>`).join('');
      }
      if (!html) html = '<p class="text-muted text-sm" style="padding:20px; text-align:center;">لا توجد نتائج مطابقة</p>';
      results.innerHTML = html;

      results.querySelectorAll('[data-open]').forEach(el => {
        el.addEventListener('click', () => {
          const [type, id] = el.dataset.open.split(':');
          closeModals();
          if (type === 'task') {
            Tasks.openEditModal(id);
          } else if (type === 'habit') {
            Habits.openEditModal(id);
          } else if (type === 'reminder') {
            Reminders.openEditModal(id);
          }
        });
      });
    });
    results.innerHTML = '<p class="text-muted text-sm" style="padding:20px; text-align:center;">اكتب للبحث...</p>';
    setTimeout(() => input.focus(), 100);
  }

  function openNotificationsModal() {
    Storage.markAllNotifsRead();
    Notifications.updateBadge();
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    const notifs = Storage.getNotifs();
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">الإشعارات</h3>
          <button class="sheet-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div id="nt-list" style="max-height:60vh; overflow-y:auto;"></div>
      </div>
    `;
    root.querySelector('.modal-backdrop').addEventListener('click', closeModals);
    root.querySelector('.sheet-close').addEventListener('click', closeModals);
    const list = root.querySelector('#nt-list');
    if (!notifs.length) {
      list.innerHTML = '<div class="empty-state" style="padding:30px 20px;"><div class="empty-ill"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg></div><div class="empty-title">لا إشعارات</div><div class="empty-desc">ستظهر هنا تنبيهات مهامك وعاداتك وتذكيراتك</div></div>';
    } else {
      list.innerHTML = notifs.map(n => {
        const d = new Date(n.time);
        return `<div class="list-card"><div class="reminder-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg></div><div style="flex:1;"><div class="fw-700" style="font-size:13.5px;">${Tasks.escapeHTML(n.title)}</div><div class="text-xs text-muted" style="margin-top:2px;">${Tasks.escapeHTML(n.body)}</div><div class="text-xs text-muted" style="margin-top:4px;">${DateH.formatTime(d)} • ${DateH.shortDate(d)}</div></div></div>`;
      }).join('');
    }
  }

  function closeModals() {
    const root = document.getElementById('modal-root');
    const sheet = root.querySelector('.modal-sheet');
    const bd = root.querySelector('.modal-backdrop');
    if (sheet) sheet.classList.add('closing');
    if (bd) bd.classList.add('closing');
    setTimeout(() => {
      root.innerHTML = '';
      root.classList.remove('active');
    }, 260);
  }

  /* ---------- Refresh current view ---------- */
  App.refresh = function () {
    if (global.Router && global.Router.current) {
      global.Router.navigate(global.Router.current, {}, true);
    }
    Notifications.updateBadge();
  };
  App.renderHeader = renderHeader;
  App.wireHeader = wireHeader;
  App.closeModals = closeModals;

  /* ---------- Seed demo data on first run ---------- */
  function seedIfEmpty() {
    if (Storage.isOnboarded()) return;
    const today = DateH.todayStr();
    Storage.addTask(Tasks.newTask({
      name: 'إنهاء تقرير الجودة',
      desc: 'مراجعة التقرير النهائي وإرساله للإدارة',
      category: 'work',
      priority: 'high',
      date: today,
      time: '10:30',
      duration: 60,
      progress: 25
    }));
    Storage.addTask(Tasks.newTask({
      name: 'قراءة 20 صفحة',
      desc: 'كتاب التطوير الذاتي',
      category: 'study',
      priority: 'mid',
      date: today,
      time: '14:00',
      duration: 45,
      progress: 0
    }));
    Storage.addTask(Tasks.newTask({
      name: 'تمارين رياضية',
      category: 'health',
      priority: 'mid',
      date: today,
      time: '07:00',
      duration: 30,
      progress: 100,
      done: true,
      completedAt: Date.now()
    }));
    Storage.addTask(Tasks.newTask({
      name: 'صلاة الضحى',
      category: 'worship',
      priority: 'low',
      date: today,
      time: '09:00',
      duration: 10,
      progress: 100,
      done: true,
      completedAt: Date.now()
    }));
    Storage.addTask(Tasks.newTask({
      name: 'شراء الخضروات',
      category: 'home',
      priority: 'low',
      date: DateH.addDaysStr(today, 1),
      time: '17:00',
      duration: 30,
      progress: 0
    }));
    Storage.addTask(Tasks.newTask({
      name: 'اجتماع الفريق',
      category: 'work',
      priority: 'high',
      date: DateH.addDaysStr(today, 1),
      time: '11:00',
      duration: 90,
      progress: 0
    }));
    Storage.addHabit(Habits.newHabit({
      name: 'قراءة القرآن',
      icon: 'spark',
      color: '#F59E0B',
      days: ['sun','mon','tue','wed','thu','fri','sat'],
      reminderTime: '05:30'
    }));
    Storage.addHabit(Habits.newHabit({
      name: 'الرياضة',
      icon: 'dumbbell',
      color: '#18B26B',
      days: ['sun','mon','wed','fri'],
      reminderTime: '07:00'
    }));
    Storage.addHabit(Habits.newHabit({
      name: 'شرب الماء',
      icon: 'drop',
      color: '#22B8FF',
      days: ['sun','mon','tue','wed','thu','fri','sat'],
      reminderTime: '09:00'
    }));
    // Seed some habit logs for past few days
    const hId = Storage.getHabits()[0].id;
    const todayD = new Date();
    Storage.toggleHabitLog(hId, DateH.toDateStr(DateH.addDays(todayD, -1)), true);
    Storage.toggleHabitLog(hId, DateH.toDateStr(DateH.addDays(todayD, -2)), true);
    Storage.toggleHabitLog(hId, DateH.toDateStr(DateH.addDays(todayD, -3)), true);

    Storage.addReminder(Reminders.newReminder({
      text: 'اذكر الله',
      time: '08:00',
      interval: 60,
      days: ['sun','mon','tue','wed','thu','fri','sat']
    }));
    Storage.addReminder(Reminders.newReminder({
      text: 'اشرب الماء',
      time: '09:00',
      interval: 90,
      days: ['sun','mon','tue','wed','thu','fri','sat']
    }));

    // seed initial stats
    const stats = Storage.getStats();
    stats.completedTotal = 2;
    stats.tasksByDay = {};
    stats.tasksByDay[today] = { done: 2, total: 4 };
    stats.habitLongestStreak = 3;
    Storage.setStats(stats);

    Storage.setOnboarded(true);
    Storage.setLastVisit(Date.now());
  }

  /* ---------- Init ---------- */
  App.init = function () {
    if (App.initialized) return;
    App.initialized = true;

    const settings = Storage.getSettings();
    applyTheme(settings.darkMode);
    applyTextSize(settings.textSize);

    // seed demo on first run
    seedIfEmpty();

    // register routes
    Router.register('home',       renderHomeView);
    Router.register('all',        Tasks.renderAllTasksView);
    Router.register('calendar',   Calendar.renderCalendarView);
    Router.register('habits',     Habits.renderHabitsView);
    Router.register('statistics', Statistics.renderStatisticsView);
    Router.register('settings',   renderSettingsView);

    // bottom nav
    document.querySelectorAll('.nav-item').forEach(b => {
      b.addEventListener('click', () => Router.navigate(b.dataset.route));
    });

    // init router
    Router.init();

    // notifications
    Notifications.updateBadge();
    Notifications.startTickers();

    // hide splash and show app
    setTimeout(() => {
      hideSplash();
      const lastVisit = Storage.getLastVisit();
      const today = DateH.todayStr();
      const lastVisitDate = lastVisit ? new Date(lastVisit) : null;
      const sameDay = lastVisitDate && DateH.toDateStr(lastVisitDate) === today;
      if (!sameDay) {
        setTimeout(() => Notifications.showMotivational(), 600);
      }
      Storage.setLastVisit(Date.now());
      setInterval(() => Notifications.checkEndOfDaySummary(), 60 * 1000);

      // Setup install prompt
      setupInstallPrompt();
    }, 1200);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered');
          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                Notifications.toast('تحديث متاح — سيتم تفعيله عند إعادة الفتح', 'info', { duration: 3500 });
              }
            });
          });
        })
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    }

    // Handle PWA shortcuts (e.g., ?action=add)
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'add') {
      setTimeout(() => Tasks.openAddModal(), 1500);
    }

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener && navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CHECK_REMINDERS') {
        Notifications.checkUpcomingTasks();
        Notifications.checkHabits();
        Notifications.checkReminders();
      }
    });
  };

  /* ---------- PWA Install Prompt ---------- */
  let deferredPrompt = null;

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      Notifications.toast('تم تثبيت حياتي بنجاح', 'success', { duration: 3000 });
      hideInstallBanner();
      deferredPrompt = null;
      // Track install
      const stats = Storage.getStats();
      stats.installedAt = Date.now();
      Storage.setStats(stats);
    });

    // If already installed (standalone), don't show banner
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }
    // iOS doesn't support beforeinstallprompt; show custom iOS instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      setTimeout(() => showIOSInstallHint(), 2000);
    }
  }

  function showInstallBanner() {
    let banner = document.getElementById('install-banner');
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.style.cssText = `
      position: fixed; bottom: calc(var(--safe-bottom, 0px) + 90px);
      left: 50%; transform: translateX(-50%);
      width: calc(100% - 32px); max-width: var(--max-w, 480px);
      background: var(--card, #fff); color: var(--text, #111);
      padding: 14px 16px; border-radius: 18px;
      box-shadow: 0 14px 36px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.10);
      display: flex; align-items: center; gap: 12px;
      z-index: 60; border: 1px solid var(--border, rgba(0,0,0,0.06));
      animation: bannerIn .4s cubic-bezier(.2,.8,.2,1);
    `;
    banner.innerHTML = `
      <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#0066FF,#22B8FF);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:13.5px;">ثبّت حياتي على جهازك</div>
        <div style="font-size:11.5px;color:var(--muted,#7B8797);margin-top:2px;">وصول أسرع ويعمل بدون إنترنت</div>
      </div>
      <button id="install-btn" style="background:linear-gradient(135deg,#0066FF,#22B8FF);color:#fff;border:0;padding:9px 14px;border-radius:11px;font-weight:700;font-size:13px;flex-shrink:0;">تثبيت</button>
      <button id="install-dismiss" style="background:transparent;border:0;padding:6px;color:var(--muted,#7B8797);flex-shrink:0;" aria-label="إغلاق">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    `;
    document.body.appendChild(banner);
    banner.querySelector('#install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'dismissed') {
        // keep banner hidden
      }
      deferredPrompt = null;
      hideInstallBanner();
    });
    banner.querySelector('#install-dismiss').addEventListener('click', () => {
      hideInstallBanner();
      // Don't show again for 7 days
      localStorage.setItem('hayati.installDismissed', Date.now().toString());
    });
  }

  function hideInstallBanner() {
    const b = document.getElementById('install-banner');
    if (b) {
      b.style.transition = 'opacity .3s ease, transform .3s ease';
      b.style.opacity = '0';
      b.style.transform = 'translateX(-50%) translateY(16px)';
      setTimeout(() => b.remove(), 300);
    }
  }

  function showIOSInstallHint() {
    const dismissed = localStorage.getItem('hayati.iosHintDismissed');
    if (dismissed && (Date.now() - parseInt(dismissed, 10)) < 7 * 24 * 3600 * 1000) return;

    const banner = document.createElement('div');
    banner.id = 'ios-install-hint';
    banner.style.cssText = `
      position: fixed; bottom: calc(var(--safe-bottom, 0px) + 90px);
      left: 50%; transform: translateX(-50%);
      width: calc(100% - 32px); max-width: var(--max-w, 480px);
      background: var(--card, #fff); color: var(--text, #111);
      padding: 14px 16px; border-radius: 18px;
      box-shadow: 0 14px 36px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.10);
      z-index: 60; border: 1px solid var(--border, rgba(0,0,0,0.06));
      animation: bannerIn .4s cubic-bezier(.2,.8,.2,1);
    `;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#0066FF,#22B8FF);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div style="flex:1;font-weight:700;font-size:13.5px;">ثبّت حياتي على الـ iPhone</div>
        <button id="ios-hint-dismiss" style="background:transparent;border:0;padding:4px;color:var(--muted,#7B8797);" aria-label="إغلاق">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <ol style="font-size:12px;color:var(--text-soft,#374);margin:0;padding-right:18px;line-height:1.7;">
        <li>اضغط زر المشاركة <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:middle;"><path d="M12 3v12M7 8l5-5 5 5M5 21h14" stroke-linecap="round" stroke-linejoin="round"/></svg> أسفل المتصفح</li>
        <li>اختر "إضافة إلى الشاشة الرئيسية" <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:middle;"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg></li>
        <li>اضغط "إضافة" — وستجد حياتي على شاشتك</li>
      </ol>
    `;
    document.body.appendChild(banner);
    banner.querySelector('#ios-hint-dismiss').addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('hayati.iosHintDismissed', Date.now().toString());
    });
    setTimeout(() => {
      if (banner.parentNode) banner.remove();
    }, 15000);
  }

  global.App = App;
  global.closeModals = closeModals;
  document.addEventListener('DOMContentLoaded', App.init);
})(window);
