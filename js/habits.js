/* =========================================================
   حياتي — habits.js
   Habit CRUD, streaks, weekly view, daily log
   ========================================================= */

(function (global) {
  'use strict';

  const HABIT_ICONS = [
    { id: 'book',     name: 'قراءة',    color: '#0066FF', icon: 'book' },
    { id: 'quran',    name: 'قرآن',     color: '#F59E0B', icon: 'spark' },
    { id: 'sport',    name: 'رياضة',    color: '#18B26B', icon: 'dumbbell' },
    { id: 'water',    name: 'ماء',      color: '#22B8FF', icon: 'drop' },
    { id: 'sleep',    name: 'نوم مبكر', color: '#7C5CFC', icon: 'moon' },
    { id: 'walk',     name: 'مشي',      color: '#18B26B', icon: 'walk' },
    { id: 'pray',     name: 'صلاة',     color: '#F59E0B', icon: 'spark' },
    { id: 'meditate', name: 'تأمل',     color: '#7C5CFC', icon: 'leaf' },
    { id: 'study',    name: 'مذاكرة',   color: '#0066FF', icon: 'book' },
    { id: 'no-smoke', name: 'لا تدخين', color: '#EF4F6B', icon: 'ban' }
  ];

  const ICON_PATHS = {
    book: 'M5 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H5z M5 4v14',
    spark: 'M12 3l1.8 5.5h5.5l-4.5 3.4 1.7 5.6L12 14.8 7.5 17.5l1.7-5.6L4.7 8.5h5.5z',
    dumbbell: 'M3 12l2-2v-2h2v2h10v-2h2v2l2 2-2 2v2h-2v-2H7v2H5v-2z',
    drop: 'M12 3s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    walk: 'M13 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 21l1-6 3 3v4M14 13l3 1 2-3',
    leaf: 'M5 21c0-9 7-16 16-16 0 9-7 16-16 16zM7 19c4-2 8-6 10-10',
    ban: 'M5 5l14 14M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z'
  };

  function iconSvg(name, size) {
    size = size || 22;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICON_PATHS[name] || ICON_PATHS.spark) + '"/></svg>';
  }

  function newHabit(data) {
    return Object.assign({
      id: Storage.uid('h'),
      name: '',
      icon: 'spark',
      color: '#0066FF',
      days: ['sun','mon','tue','wed','thu','fri','sat'],  // every day by default
      reminderTime: '08:00',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, data || {});
  }

  /* Compute streak (consecutive days up to today with logs) */
  function computeStreak(habitId) {
    const logs = Storage.getHabitLogs();
    const habitLog = logs[habitId] || {};
    let streak = 0;
    let cur = new Date();
    // If today not done, start from yesterday
    if (!habitLog[DateH.toDateStr(cur)]) {
      cur = DateH.addDays(cur, -1);
    }
    while (true) {
      const s = DateH.toDateStr(cur);
      if (habitLog[s]) {
        streak++;
        cur = DateH.addDays(cur, -1);
      } else break;
      if (streak > 365) break;
    }
    return streak;
  }

  function computeCommitment(habitId, days) {
    days = days || 30;
    const logs = Storage.getHabitLogs();
    const habitLog = logs[habitId] || {};
    let done = 0;
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const s = DateH.toDateStr(DateH.addDays(today, -i));
      if (habitLog[s]) done++;
    }
    return Math.round((done / days) * 100);
  }

  function lastDoneDate(habitId) {
    const logs = Storage.getHabitLogs();
    const habitLog = logs[habitId] || {};
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const s = DateH.toDateStr(DateH.addDays(today, -i));
      if (habitLog[s]) return s;
    }
    return null;
  }

  function saveHabit(h) {
    if (!h.name || !h.name.trim()) { Notifications.warn('اكتب اسم العادة'); return null; }
    const existing = h.id ? Storage.getHabits().find(x => x.id === h.id) : null;
    if (existing) {
      Storage.updateHabit(h.id, h);
      Notifications.success('تم تحديث العادة');
    } else {
      if (!h.id) h.id = Storage.uid('h');
      Storage.addHabit(h);
      Notifications.success('تمت إضافة العادة');
    }
    return h;
  }

  function deleteHabit(id) {
    Storage.deleteHabit(id);
    Notifications.toast('تم حذف العادة', 'warning');
  }

  function toggleToday(habitId, dateStr) {
    const today = DateH.todayStr();
    if (!dateStr) dateStr = today;
    const done = Storage.toggleHabitLog(habitId, dateStr);
    if (done && dateStr === today) {
      Notifications.success('أحسنت! تم تنفيذ عادة اليوم');
      // update streak stat
      const stats = Storage.getStats();
      const streak = computeStreak(habitId);
      if (streak > (stats.habitLongestStreak || 0)) {
        stats.habitLongestStreak = streak;
        Storage.setStats(stats);
      }
    }
    if (global.Achievements && global.Achievements.recompute) global.Achievements.recompute();
    return done;
  }

  /* ---- Habits view ---- */
  function renderHabitsView(view) {
    view.innerHTML = `
      ${global.App.renderHeader('العادات')}
      <div class="section-title">
        <h2>عاداتي</h2>
        <button class="link" onclick="Habits.openAddModal()">+ عادة جديدة</button>
      </div>
      <div id="habits-list"></div>
    `;
    refreshList(view);
  }

  function refreshList(view) {
    const container = view.querySelector('#habits-list');
    const habits = Storage.getHabits();
    if (!habits.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-ill">${iconSvg('spark', 46)}</div><div class="empty-title">لا توجد عادات بعد</div><div class="empty-desc">ابدأ ببناء عادة جديدة، فالعادة الواحدة قد تغيّر يومك كله</div><button class="btn mt-18" onclick="Habits.openAddModal()">+ إضافة عادة</button></div>`;
      return;
    }
    container.innerHTML = '';
    habits.forEach(h => container.appendChild(renderHabitCard(h)));
  }

  function renderHabitCard(h) {
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.style.setProperty('--habit-color', h.color);
    card.tabIndex = 0;

    const streak = computeStreak(h.id);
    const commit = computeCommitment(h.id, 30);
    const last = lastDoneDate(h.id);
    const today = DateH.todayStr();
    const isToday = Storage.isHabitDone(h.id, today);
    const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];
    const todayIdx = new Date().getDay();
    const todayKey = dayMap[todayIdx];

    // last 7 days mini calendar
    const todayD = new Date();
    let weekHtml = '';
    for (let i = 6; i >= 0; i--) {
      const d = DateH.addDays(todayD, -i);
      const s = DateH.toDateStr(d);
      const dayName = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'][d.getDay()];
      const isDone = Storage.isHabitDone(h.id, s);
      const isT = s === today;
      weekHtml += `<div class="habit-day ${isDone ? 'done' : ''} ${isT ? 'today' : ''}"><span class="d-num">${d.getDate()}</span>${dayName}</div>`;
    }

    card.innerHTML = `
      <div class="habit-head">
        <div class="habit-icon">${iconSvg(h.icon, 24)}</div>
        <div class="habit-info">
          <div class="habit-name">${Tasks.escapeHTML(h.name)}</div>
          <div class="habit-meta">آخر مرة: ${last ? DateH.shortDate(DateH.parseDateStr(last)) : 'لم تُنفّذ بعد'}</div>
        </div>
        ${streak > 0 ? `<div class="habit-streak">🔥 ${streak} يوم</div>` : ''}
      </div>
      <div class="habit-week">${weekHtml}</div>
      <div class="habit-foot">
        <span>نسبة الالتزام: <span class="pct-num">${commit}%</span></span>
        <div class="habit-actions">
          <button class="habit-act-btn" data-act="today" aria-label="تنفيذ اليوم" title="تنفيذ اليوم">
            ${isToday
              ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#18B26B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>'
              : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}
          </button>
          <button class="habit-act-btn" data-act="edit" aria-label="تعديل">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h4L18 6l-4-4L4 16v4z M14 6l4 4"/></svg>
          </button>
          <button class="habit-act-btn" data-act="delete" aria-label="حذف">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13"/></svg>
          </button>
        </div>
      </div>
    `;

    card.querySelector('[data-act="today"]').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleToday(h.id);
      global.App.refresh();
    });
    card.querySelector('[data-act="edit"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(h.id);
    });
    card.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('حذف العادة "' + h.name + '"؟')) {
        deleteHabit(h.id);
        global.App.refresh();
      }
    });

    return card;
  }

  /* ---- Add/Edit modal ---- */
  function openAddModal() {
    renderHabitModal(newHabit(), false);
  }
  function openEditModal(id) {
    const h = Storage.getHabits().find(x => x.id === id);
    if (!h) return;
    renderHabitModal(h, true);
  }

  function renderHabitModal(h, isEdit) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    const dayNames = { sun:'الأحد', mon:'الإثنين', tue:'الثلاثاء', wed:'الأربعاء', thu:'الخميس', fri:'الجمعة', sat:'السبت' };
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">${isEdit ? 'تعديل العادة' : 'إضافة عادة جديدة'}</h3>
          <button class="sheet-close" aria-label="إغلاق"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="field">
          <label>اسم العادة</label>
          <input class="input" id="hf-name" maxlength="50" placeholder="مثال: قراءة القرآن" value="${Tasks.escapeHTML(h.name)}" />
        </div>
        <div class="field">
          <label>الأيقونة</label>
          <div class="chip-group" id="hf-icons">
            ${HABIT_ICONS.map(ic => `<button type="button" class="chip-opt ${h.icon === ic.icon ? 'active' : ''}" data-icon="${ic.icon}" data-color="${ic.color}" style="${h.icon === ic.icon ? '' : ''}">${iconSvg(ic.icon, 18)} ${ic.name}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>أيام التكرار</label>
          <div class="chip-group" id="hf-days">
            ${Object.keys(dayNames).map(d => `<button type="button" class="chip-opt ${(h.days || []).indexOf(d) !== -1 ? 'active' : ''}" data-val="${d}">${dayNames[d]}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>وقت التذكير</label>
          <input class="input" type="time" id="hf-time" value="${h.reminderTime || '08:00'}" />
        </div>
        <div class="flex gap-10 mt-12">
          ${isEdit ? '<button class="btn btn-danger btn-sm" id="hf-delete" style="flex:0 0 auto;width:auto;padding:12px 16px;">حذف</button>' : ''}
          <button class="btn" id="hf-save" style="flex:1;">حفظ العادة</button>
        </div>
      </div>
    `;

    root.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    root.querySelector('.sheet-close').addEventListener('click', closeModal);

    let selectedIcon = h.icon || 'spark';
    let selectedColor = h.color || '#0066FF';

    root.querySelectorAll('#hf-icons .chip-opt').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('#hf-icons .chip-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      selectedIcon = b.dataset.icon;
      selectedColor = b.dataset.color;
    }));
    root.querySelectorAll('#hf-days .chip-opt').forEach(b => b.addEventListener('click', () => b.classList.toggle('active')));

    root.querySelector('#hf-save').addEventListener('click', () => {
      const name = root.querySelector('#hf-name').value.trim();
      if (!name) { Notifications.warn('اكتب اسم العادة'); return; }
      const days = Array.from(root.querySelectorAll('#hf-days .chip-opt.active')).map(x => x.dataset.val);
      const updated = Object.assign({}, h, {
        name: name,
        icon: selectedIcon,
        color: selectedColor,
        days: days,
        reminderTime: root.querySelector('#hf-time').value || '08:00'
      });
      const saved = saveHabit(updated);
      if (saved) {
        closeModal();
        global.App.refresh();
      }
    });

    if (isEdit) {
      root.querySelector('#hf-delete').addEventListener('click', () => {
        if (confirm('حذف العادة؟')) {
          deleteHabit(h.id);
          closeModal();
          global.App.refresh();
        }
      });
    }
  }

  function closeModal() {
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

  global.Habits = {
    HABIT_ICONS, iconSvg,
    newHabit, saveHabit, deleteHabit,
    computeStreak, computeCommitment, lastDoneDate,
    toggleToday,
    renderHabitsView, openAddModal, openEditModal, closeModal
  };
})(window);
