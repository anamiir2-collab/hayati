/* =========================================================
   حياتي — tasks.js
   Task CRUD, stacked 3D cards, filters, search, completion
   ========================================================= */

(function (global) {
  'use strict';

  const CATEGORIES = [
    { id: 'work',     name: 'عمل',     color: '#0066FF', icon: 'briefcase' },
    { id: 'study',    name: 'دراسة',    color: '#7C5CFC', icon: 'book' },
    { id: 'personal', name: 'شخصي',    color: '#22B8FF', icon: 'user' },
    { id: 'health',   name: 'صحة',    color: '#18B26B', icon: 'heart' },
    { id: 'worship',  name: 'عبادة',   color: '#F59E0B', icon: 'spark' },
    { id: 'home',     name: 'منزل',    color: '#EF4F6B', icon: 'home' },
    { id: 'other',    name: 'أخرى',    color: '#7B8797', icon: 'tag' }
  ];
  const PRIORITIES = [
    { id: 'high', name: 'عالية',   color: '#EF4F6B' },
    { id: 'mid',  name: 'متوسطة', color: '#F59E0B' },
    { id: 'low',  name: 'منخفضة', color: '#18B26B' }
  ];
  const REPEATS = [
    { id: 'none',   name: 'لا تتكرر' },
    { id: 'daily',  name: 'يوميًا' },
    { id: 'weekly', name: 'أسبوعيًا' },
    { id: 'monthly',name: 'شهريًا' },
    { id: 'custom', name: 'أيام محددة' }
  ];
  const PROGRESS_OPTS = [0, 25, 50, 75, 100];

  function catMeta(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]; }
  function priMeta(id) { return PRIORITIES.find(p => p.id === id) || PRIORITIES[1]; }

  /* Icon SVG paths */
  const ICON_PATHS = {
    briefcase: 'M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
    book:      'M5 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H5z M5 4v14',
    user:      'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 21a7 7 0 0 1 14 0',
    heart:     'M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z',
    spark:     'M12 3l1.8 5.5h5.5l-4.5 3.4 1.7 5.6L12 14.8 7.5 17.5l1.7-5.6L4.7 8.5h5.5z',
    home:      'M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
    tag:       'M3 12l9-9 9 9-9 9z'
  };
  function iconSvg(name, size) {
    size = size || 18;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICON_PATHS[name] || ICON_PATHS.tag) + '"/></svg>';
  }

  function newTask(data) {
    return Object.assign({
      id: Storage.uid('t'),
      name: '',
      desc: '',
      category: 'work',
      priority: 'mid',
      date: DateH.todayStr(),
      time: '09:00',
      duration: 30,
      progress: 0,
      repeat: 'none',
      repeatDays: [],
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, data || {});
  }

  function isTaskLate(t) {
    if (t.done) return false;
    if (!t.date) return false;
    if (t.date < DateH.todayStr()) return true;
    return false;
  }

  function isTaskToday(t) {
    return t.date === DateH.todayStr();
  }

  function filterToday(tasks) {
    return tasks.filter(t => t.date === DateH.todayStr());
  }

  function sortTasks(tasks, by) {
    by = by || 'priority';
    const arr = tasks.slice();
    const priWeight = { high: 0, mid: 1, low: 2 };
    if (by === 'priority') {
      arr.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const w = (priWeight[a.priority] || 1) - (priWeight[b.priority] || 1);
        if (w !== 0) return w;
        return (a.time || '').localeCompare(b.time || '');
      });
    } else if (by === 'date') {
      arr.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '');
      });
    } else if (by === 'category') {
      arr.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (a.category || '').localeCompare(b.category || '');
      });
    }
    return arr;
  }

  /* Mark task complete (with optional progress) */
  function completeTask(id) {
    const t = Storage.getTasks().find(x => x.id === id);
    if (!t) return;
    Storage.updateTask(id, { done: true, progress: 100, completedAt: Date.now() });
    // update stats
    const stats = Storage.getStats();
    stats.completedTotal = (stats.completedTotal || 0) + 1;
    const dayKey = t.date;
    if (!stats.tasksByDay) stats.tasksByDay = {};
    if (!stats.tasksByDay[dayKey]) stats.tasksByDay[dayKey] = { done: 0, total: 0 };
    stats.tasksByDay[dayKey].done++;
    Storage.setStats(stats);
    // handle repeats
    if (t.repeat && t.repeat !== 'none') {
      spawnRepeatedTask(t);
    }
    // recompute achievements (handled elsewhere)
    if (global.Achievements && global.Achievements.recompute) global.Achievements.recompute();
    Notifications.success('تم إنجاز المهمة');
  }

  function uncompleteTask(id) {
    const t = Storage.getTasks().find(x => x.id === id);
    if (!t) return;
    Storage.updateTask(id, { done: false, progress: 0, completedAt: null });
    const stats = Storage.getStats();
    if (stats.completedTotal > 0) stats.completedTotal--;
    if (stats.tasksByDay && stats.tasksByDay[t.date]) {
      if (stats.tasksByDay[t.date].done > 0) stats.tasksByDay[t.date].done--;
    }
    Storage.setStats(stats);
    Notifications.toast('تم استرجاع المهمة', 'info');
  }

  function spawnRepeatedTask(t) {
    let nextDate = t.date;
    if (t.repeat === 'daily') {
      nextDate = DateH.addDaysStr(t.date, 1);
    } else if (t.repeat === 'weekly') {
      nextDate = DateH.addDaysStr(t.date, 7);
    } else if (t.repeat === 'monthly') {
      const d = DateH.parseDateStr(t.date);
      d.setMonth(d.getMonth() + 1);
      nextDate = DateH.toDateStr(d);
    } else if (t.repeat === 'custom' && t.repeatDays && t.repeatDays.length) {
      // find next matching dow
      const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];
      let cur = DateH.parseDateStr(t.date);
      for (let i = 1; i <= 14; i++) {
        cur = DateH.addDays(cur, 1);
        const k = dayMap[cur.getDay()];
        if (t.repeatDays.indexOf(k) !== -1) {
          nextDate = DateH.toDateStr(cur);
          break;
        }
      }
    }
    if (nextDate !== t.date) {
      Storage.addTask(newTask({
        name: t.name, desc: t.desc, category: t.category, priority: t.priority,
        date: nextDate, time: t.time, duration: t.duration, progress: 0,
        repeat: t.repeat, repeatDays: t.repeatDays
      }));
    }
  }

  function deleteTask(id) {
    Storage.deleteTask(id);
    Notifications.toast('تم حذف المهمة', 'warning');
  }

  function saveTask(t) {
    if (!t.name || !t.name.trim()) {
      Notifications.warn('اكتب اسم المهمة');
      return null;
    }
    // Check if this task already exists in storage
    const existing = t.id ? Storage.getTasks().find(x => x.id === t.id) : null;
    if (existing) {
      Storage.updateTask(t.id, t);
      Notifications.success('تم تحديث المهمة');
    } else {
      // New task — ensure it has a unique id
      if (!t.id) t.id = Storage.uid('t');
      const stats = Storage.getStats();
      const dayKey = t.date;
      if (!stats.tasksByDay) stats.tasksByDay = {};
      if (!stats.tasksByDay[dayKey]) stats.tasksByDay[dayKey] = { done: 0, total: 0 };
      stats.tasksByDay[dayKey].total++;
      if (t.done) stats.tasksByDay[dayKey].done++;
      Storage.setStats(stats);
      Storage.addTask(t);
      Notifications.success('تمت إضافة المهمة');
    }
    return t;
  }

  /* ---- Rendering: stacked task cards ---- */
  function renderStackedCards(container, tasks, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!tasks.length) {
      container.innerHTML = emptyTasksHTML(opts.emptyMsg || 'يومك فاضي');
      return;
    }
    const list = document.createElement('div');
    list.className = 'stack-list';
    tasks.forEach((t, i) => {
      const card = renderTaskCard(t, i);
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  function emptyTasksHTML(msg) {
    return '<div class="empty-state"><div class="empty-ill"><svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div class="empty-title">' + (msg || 'يومك فاضي') + '</div><div class="empty-desc">ابدأ بإضافة أول مهمة، وستشعر بالإنجاز من أول خطوة</div><button class="btn mt-18" onclick="Tasks.openAddModal()">+ إضافة مهمة</button></div>';
  }

  function renderTaskCard(t, idx) {
    const c = catMeta(t.category);
    const p = priMeta(t.priority);
    const card = document.createElement('div');
    card.className = 'task-card' + (t.done ? ' done' : '');
    card.style.setProperty('--cat-color', c.color);
    card.style.setProperty('--pri-color', p.color);
    card.dataset.id = t.id;
    card.tabIndex = 0;
    card.setAttribute('aria-label', 'مهمة: ' + t.name + ' ' + (t.done ? 'مكتملة' : ''));

    // stacked layer effect — only the first few cards visibly layered
    if (idx === 0) card.classList.add('layer-1');
    else if (idx === 1) card.classList.add('layer-2');
    else if (idx === 2) card.classList.add('layer-3');
    else card.classList.add('layer-' + Math.min(idx + 1, 8));

    card.innerHTML = `
      <div class="tc-top">
        <span class="tc-cat"><span class="dot"></span>${c.name}</span>
        <span class="tc-pri"><span class="ind"></span>${p.name}</span>
      </div>
      <div class="tc-mid">
        <button class="tc-check" aria-label="إكمال المهمة">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="tc-body">
          <div class="tc-name">${escapeHTML(t.name)}</div>
          ${t.desc ? '<div class="tc-desc">' + escapeHTML(t.desc) + '</div>' : ''}
        </div>
      </div>
      <div class="tc-bottom">
        <span class="tc-meta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          ${t.time ? DateH.formatTimeFromStr(t.time) : ''}
        </span>
        <div class="tc-progress">
          <div class="bar"><div class="bar-fill" style="width:${t.progress || 0}%"></div></div>
          <div class="pct">${t.progress || 0}%</div>
        </div>
      </div>
      <div class="tc-handle"></div>
    `;

    // Click on card body (not checkbox) -> open edit modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.tc-check')) return;
      openEditModal(t.id);
    });

    // Click checkbox -> toggle
    const checkBtn = card.querySelector('.tc-check');
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (t.done) {
        uncompleteTask(t.id);
      } else {
        checkBtn.classList.add('done-anim');
        // animation, then complete
        card.classList.add('exit');
        setTimeout(() => {
          completeTask(t.id);
          global.App.refresh();
        }, 380);
      }
    });

    // Long-press to delete
    let pressTimer = null;
    card.addEventListener('pointerdown', () => {
      pressTimer = setTimeout(() => {
        if (confirm('حذف المهمة "' + t.name + '"؟')) {
          deleteTask(t.id);
          global.App.refresh();
        }
      }, 600);
    });
    card.addEventListener('pointerup',    () => clearTimeout(pressTimer));
    card.addEventListener('pointerleave', () => clearTimeout(pressTimer));

    return card;
  }

  /* ---- Modal: add / edit task ---- */
  function openAddModal(prefill) {
    const t = newTask(prefill || {});
    renderTaskModal(t, false);
  }

  function openEditModal(id) {
    const t = Storage.getTasks().find(x => x.id === id);
    if (!t) return;
    renderTaskModal(t, true);
  }

  function renderTaskModal(t, isEdit) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">${isEdit ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
          <button class="sheet-close" aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        <div class="field">
          <label>اسم المهمة</label>
          <input class="input" id="tf-name" maxlength="80" placeholder="مثال: إنهاء تقرير الجودة" value="${escapeAttr(t.name)}" />
        </div>

        <div class="field">
          <label>الوصف (اختياري)</label>
          <textarea class="textarea" id="tf-desc" maxlength="500" placeholder="أضف تفاصيل المهمة...">${escapeHTML(t.desc || '')}</textarea>
        </div>

        <div class="field">
          <label>التصنيف</label>
          <div class="chip-group" id="tf-cat">
            ${CATEGORIES.map(c => `<button type="button" class="chip-opt ${t.category === c.id ? 'active' : ''}" data-val="${c.id}">${c.name}</button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>الأولوية</label>
          <div class="chip-group" id="tf-pri">
            ${PRIORITIES.map(p => `<button type="button" class="chip-opt ${t.priority === p.id ? 'active' : ''}" data-val="${p.id}">${p.name}</button>`).join('')}
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>التاريخ</label>
            <input class="input" type="date" id="tf-date" value="${t.date}" />
          </div>
          <div class="field">
            <label>الوقت</label>
            <input class="input" type="time" id="tf-time" value="${t.time || ''}" />
          </div>
        </div>

        <div class="field">
          <label>مدة المهمة (دقيقة)</label>
          <input class="input" type="number" id="tf-duration" min="5" max="600" step="5" value="${t.duration || 30}" />
        </div>

        <div class="field">
          <label>نسبة الإنجاز</label>
          <div class="pct-options" id="tf-progress">
            ${PROGRESS_OPTS.map(v => `<button type="button" class="pct-opt ${(t.progress || 0) === v ? 'active' : ''}" data-val="${v}">${v}%</button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>تكرار المهمة</label>
          <div class="chip-group" id="tf-repeat">
            ${REPEATS.map(r => `<button type="button" class="chip-opt ${t.repeat === r.id ? 'active' : ''}" data-val="${r.id}">${r.name}</button>`).join('')}
          </div>
        </div>

        <div class="field hidden" id="tf-repeatdays-wrap">
          <label>أيام التكرار</label>
          <div class="chip-group" id="tf-repeatdays">
            ${['sun','mon','tue','wed','thu','fri','sat'].map(d => {
              const names = { sun:'الأحد', mon:'الإثنين', tue:'الثلاثاء', wed:'الأربعاء', thu:'الخميس', fri:'الجمعة', sat:'السبت' };
              return `<button type="button" class="chip-opt ${(t.repeatDays || []).indexOf(d) !== -1 ? 'active' : ''}" data-val="${d}">${names[d]}</button>`;
            }).join('')}
          </div>
        </div>

        <div class="flex gap-10 mt-12">
          ${isEdit ? '<button class="btn btn-danger btn-sm" id="tf-delete" style="flex:0 0 auto;width:auto;padding:12px 16px;">حذف</button>' : ''}
          <button class="btn" id="tf-save" style="flex:1;">حفظ المهمة</button>
        </div>
      </div>
    `;

    // toggle repeat days
    const repeatWrap = root.querySelector('#tf-repeatdays-wrap');
    function updateRepeatDays() {
      const sel = root.querySelector('#tf-repeat .chip-opt.active');
      repeatWrap.classList.toggle('hidden', !(sel && sel.dataset.val === 'custom'));
    }
    updateRepeatDays();

    // Event wiring
    root.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    root.querySelector('.sheet-close').addEventListener('click', closeModal);

    root.querySelectorAll('#tf-cat .chip-opt').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('#tf-cat .chip-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    }));
    root.querySelectorAll('#tf-pri .chip-opt').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('#tf-pri .chip-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    }));
    root.querySelectorAll('#tf-repeat .chip-opt').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('#tf-repeat .chip-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      updateRepeatDays();
    }));
    root.querySelectorAll('#tf-repeatdays .chip-opt').forEach(b => b.addEventListener('click', () => b.classList.toggle('active')));
    root.querySelectorAll('#tf-progress .pct-opt').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('#tf-progress .pct-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    }));

    root.querySelector('#tf-save').addEventListener('click', () => {
      const name = root.querySelector('#tf-name').value.trim();
      if (!name) { Notifications.warn('اكتب اسم المهمة'); return; }
      const cat = root.querySelector('#tf-cat .chip-opt.active').dataset.val;
      const pri = root.querySelector('#tf-pri .chip-opt.active').dataset.val;
      const rep = root.querySelector('#tf-repeat .chip-opt.active').dataset.val;
      const repDays = Array.from(root.querySelectorAll('#tf-repeatdays .chip-opt.active')).map(x => x.dataset.val);
      const progress = parseInt(root.querySelector('#tf-progress .pct-opt.active').dataset.val, 10) || 0;

      const updated = Object.assign({}, t, {
        name: name,
        desc: root.querySelector('#tf-desc').value.trim(),
        category: cat,
        priority: pri,
        date: root.querySelector('#tf-date').value,
        time: root.querySelector('#tf-time').value || '',
        duration: parseInt(root.querySelector('#tf-duration').value, 10) || 30,
        progress: progress,
        repeat: rep,
        repeatDays: repDays,
        done: progress === 100 ? true : t.done
      });

      const saved = saveTask(updated);
      if (saved) {
        closeModal();
        global.App.refresh();
      }
    });

    if (isEdit) {
      root.querySelector('#tf-delete').addEventListener('click', () => {
        if (confirm('حذف المهمة؟')) {
          deleteTask(t.id);
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

  function escapeHTML(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function escapeAttr(s) { return escapeHTML(s); }

  /* ---- All Tasks view ---- */
  function renderAllTasksView(view, params) {
    view.innerHTML = `
      ${global.App.renderHeader('كل المهام')}
      <div class="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="at-search" type="search" placeholder="ابحث عن مهمة..." aria-label="البحث" />
      </div>
      <div class="tabs" id="at-tabs">
        <button class="tab active" data-filter="all">الكل</button>
        <button class="tab" data-filter="today">اليوم</button>
        <button class="tab" data-filter="upcoming">القادمة</button>
        <button class="tab" data-filter="done">المكتملة</button>
        <button class="tab" data-filter="late">المتأخرة</button>
      </div>
      <div class="chips-row" id="at-sort">
        <button class="chip active" data-sort="priority">الأولوية</button>
        <button class="chip" data-sort="date">التاريخ</button>
        <button class="chip" data-sort="category">التصنيف</button>
      </div>
      <div id="at-list" class="stack-list"></div>
    `;

    let curFilter = params && params.filter || 'all';
    let curSort = 'priority';
    let curQuery = '';

    function refresh() {
      let tasks = Storage.getTasks();
      const today = DateH.todayStr();
      if (curFilter === 'today') tasks = tasks.filter(t => t.date === today);
      else if (curFilter === 'upcoming') tasks = tasks.filter(t => t.date > today);
      else if (curFilter === 'done') tasks = tasks.filter(t => t.done);
      else if (curFilter === 'late') tasks = tasks.filter(t => isTaskLate(t));
      if (curQuery) {
        const q = curQuery.toLowerCase();
        tasks = tasks.filter(t => (t.name + ' ' + (t.desc || '')).toLowerCase().indexOf(q) !== -1);
      }
      tasks = sortTasks(tasks, curSort);
      renderStackedCards(view.querySelector('#at-list'), tasks, { emptyMsg: 'لا توجد مهام مطابقة' });
    }

    view.querySelectorAll('#at-tabs .tab').forEach(t => t.addEventListener('click', () => {
      view.querySelectorAll('#at-tabs .tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      curFilter = t.dataset.filter;
      refresh();
    }));
    view.querySelectorAll('#at-sort .chip').forEach(c => c.addEventListener('click', () => {
      view.querySelectorAll('#at-sort .chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      curSort = c.dataset.sort;
      refresh();
    }));
    view.querySelector('#at-search').addEventListener('input', (e) => {
      curQuery = e.target.value;
      refresh();
    });

    // sync tab state if provided
    if (params && params.filter) {
      view.querySelectorAll('#at-tabs .tab').forEach(x => x.classList.toggle('active', x.dataset.filter === params.filter));
    }
    refresh();
  }

  /* Expose */
  global.Tasks = {
    CATEGORIES, PRIORITIES, REPEATS, PROGRESS_OPTS,
    catMeta, priMeta, iconSvg,
    newTask, saveTask, deleteTask, completeTask, uncompleteTask,
    isTaskLate, isTaskToday, filterToday, sortTasks,
    renderStackedCards, renderTaskCard,
    openAddModal, openEditModal, closeModal,
    renderAllTasksView,
    escapeHTML
  };
})(window);
