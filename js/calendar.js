/* =========================================================
   حياتي — calendar.js
   Monthly calendar with task indicators and day detail
   ========================================================= */

(function (global) {
  'use strict';

  let viewMonth = null; // { year, month } 0-based month
  let selectedDate = null;

  function renderCalendarView(view) {
    if (!viewMonth) {
      const d = new Date();
      viewMonth = { year: d.getFullYear(), month: d.getMonth() };
    }
    if (!selectedDate) selectedDate = DateH.todayStr();

    view.innerHTML = `
      ${global.App.renderHeader('التقويم')}
      <div class="calendar-card">
        <div class="cal-head">
          <button class="cal-nav" id="cal-prev" aria-label="الشهر السابق"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>
          <div class="cal-title" id="cal-title"></div>
          <button class="cal-nav" id="cal-next" aria-label="الشهر التالي"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button>
        </div>
        <div class="cal-weekdays">
          <span>الأحد</span><span>الإثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>الجمعة</span><span>السبت</span>
        </div>
        <div class="cal-grid" id="cal-grid"></div>
      </div>
      <div id="day-detail"></div>
    `;

    drawCalendar(view);
    drawDayDetail(view);

    view.querySelector('#cal-prev').addEventListener('click', () => {
      viewMonth.month--;
      if (viewMonth.month < 0) { viewMonth.month = 11; viewMonth.year--; }
      drawCalendar(view);
    });
    view.querySelector('#cal-next').addEventListener('click', () => {
      viewMonth.month++;
      if (viewMonth.month > 11) { viewMonth.month = 0; viewMonth.year++; }
      drawCalendar(view);
    });
  }

  function drawCalendar(view) {
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    view.querySelector('#cal-title').textContent = monthNames[viewMonth.month] + ' ' + viewMonth.year;

    const grid = view.querySelector('#cal-grid');
    grid.innerHTML = '';

    const first = new Date(viewMonth.year, viewMonth.month, 1);
    const startDay = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const todayStr = DateH.todayStr();

    // tasks by date for this month
    const tasks = Storage.getTasks();
    const tasksByDate = {};
    tasks.forEach(t => {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = 0;
      tasksByDate[t.date]++;
    });

    // leading blanks (prev month days)
    for (let i = 0; i < startDay; i++) {
      const prevDate = new Date(viewMonth.year, viewMonth.month, -(startDay - 1 - i));
      const el = document.createElement('button');
      el.className = 'cal-day muted';
      el.textContent = prevDate.getDate();
      el.tabIndex = -1;
      grid.appendChild(el);
    }

    // current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewMonth.year, viewMonth.month, d);
      const ds = DateH.toDateStr(date);
      const el = document.createElement('button');
      el.className = 'cal-day';
      if (tasksByDate[ds]) el.classList.add('has-tasks');
      if (ds === todayStr) el.classList.add('today');
      if (ds === selectedDate) el.classList.add('selected');
      el.textContent = d;
      el.setAttribute('aria-label', 'يوم ' + d);
      el.addEventListener('click', () => {
        selectedDate = ds;
        drawCalendar(view);
        drawDayDetail(view);
      });
      grid.appendChild(el);
    }

    // trailing to fill 6 rows? keep simple: fill current row only
    const total = startDay + daysInMonth;
    const trailing = (7 - (total % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      const el = document.createElement('button');
      el.className = 'cal-day muted';
      el.textContent = i;
      el.tabIndex = -1;
      grid.appendChild(el);
    }
  }

  function drawDayDetail(view) {
    const container = view.querySelector('#day-detail');
    const ds = selectedDate;
    const date = DateH.parseDateStr(ds);
    const todayStr = DateH.todayStr();

    const tasks = Storage.getTasks().filter(t => t.date === ds);
    const habits = Storage.getHabits();
    const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];
    const dayKey = dayMap[date.getDay()];
    const habitsToday = habits.filter(h => !h.days || h.days.length === 0 || h.days.indexOf(dayKey) !== -1);

    container.innerHTML = `
      <div class="day-detail">
        <div class="dd-head">
          <div class="dd-title">${ds === todayStr ? 'اليوم' : DateH.formatDateAr(date)}</div>
          ${ds === todayStr ? '' : '<button class="btn btn-ghost btn-sm" onclick="Calendar.goToday()">اليوم</button>'}
        </div>
        <div id="dd-tasks"></div>
        <div id="dd-habits"></div>
      </div>
    `;
    const tEl = container.querySelector('#dd-tasks');
    const hEl = container.querySelector('#dd-habits');

    if (tasks.length === 0) {
      tEl.innerHTML = '<div class="text-sm text-muted pb-12" style="padding:14px 0;">لا توجد مهام في هذا اليوم</div>';
    } else {
      const list = document.createElement('div');
      list.className = 'stack-list';
      Tasks.renderStackedCards(list, Tasks.sortTasks(tasks, 'priority'), { emptyMsg: '' });
      tEl.appendChild(list);
    }

    if (habitsToday.length) {
      hEl.innerHTML = '<div class="section-title"><h2>عادات اليوم</h2></div>';
      const wrap = document.createElement('div');
      habitsToday.forEach(h => {
        const isDone = Storage.isHabitDone(h.id, ds);
        const card = document.createElement('div');
        card.className = 'list-card';
        card.innerHTML = `
          <button class="tc-check ${isDone ? 'task-card done' : ''}" style="background:${isDone ? '#18B26B' : 'transparent'};border-color:${isDone ? '#18B26B' : 'var(--border-strong)'};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div style="flex:1;">
            <div class="fw-700">${Tasks.escapeHTML(h.name)}</div>
            <div class="text-xs text-muted">${isDone ? 'تم تنفيذها' : 'بانتظار التنفيذ'}</div>
          </div>
        `;
        const checkBtn = card.querySelector('.tc-check');
        checkBtn.addEventListener('click', () => {
          Storage.toggleHabitLog(h.id, ds);
          drawDayDetail(view);
        });
        wrap.appendChild(card);
      });
      hEl.appendChild(wrap);
    }
  }

  function goToday() {
    const d = new Date();
    viewMonth = { year: d.getFullYear(), month: d.getMonth() };
    selectedDate = DateH.todayStr();
    global.App.refresh();
  }

  global.Calendar = { renderCalendarView, goToday };
})(window);
