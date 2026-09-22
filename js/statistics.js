/* =========================================================
   حياتي — statistics.js
   Statistics + Achievements views with simple charts
   ========================================================= */

(function (global) {
  'use strict';

  const ACHIEVEMENTS = [
    { id: 'first_task',  name: 'أول مهمة مكتملة', desc: 'أنجزت أول مهمة',         icon: 'star' },
    { id: 'ten_tasks',   name: 'إنجاز 10 مهام',   desc: 'أنجزت 10 مهام',          icon: 'medal' },
    { id: 'fifty_tasks', name: 'إنجاز 50 مهمة',   desc: 'أنجزت 50 مهمة',          icon: 'trophy' },
    { id: 'streak_7',    name: '7 أيام متتالية',  desc: 'حافظت على سلسلة 7 أيام', icon: 'fire' },
    { id: 'streak_30',   name: '30 يومًا متتاليًا', desc: 'حافظت على سلسلة 30 يوم', icon: 'fire' },
    { id: 'week_clean',  name: 'أسبوع نظيف',      desc: 'أسبوع بدون مهام متأخرة', icon: 'shield' },
    { id: 'habit_5',     name: '5 عادات',          desc: 'أنشأت 5 عادات',          icon: 'leaf' },
    { id: 'day_perfect', name: 'يوم مثالي',        desc: 'أنجزت كل مهام يوم واحد', icon: 'sun' }
  ];

  function computeAchievements() {
    const tasks = Storage.getTasks();
    const habits = Storage.getHabits();
    const stats = Storage.getStats();
    const completed = (stats.completedTotal || 0);

    // streak today: any habit streak >= 7
    let maxHabitStreak = 0;
    habits.forEach(h => {
      const s = Habits.computeStreak(h.id);
      if (s > maxHabitStreak) maxHabitStreak = s;
    });

    // week clean: past 7 days no late tasks
    let weekClean = true;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const ds = DateH.toDateStr(DateH.addDays(today, -i));
      const dayTasks = tasks.filter(t => t.date === ds);
      const late = dayTasks.some(t => Tasks.isTaskLate(t));
      if (late) { weekClean = false; break; }
    }

    // perfect day: any day with all tasks done
    let perfectDay = false;
    if (stats.tasksByDay) {
      Object.keys(stats.tasksByDay).forEach(ds => {
        const x = stats.tasksByDay[ds];
        if (x.total > 0 && x.done === x.total) perfectDay = true;
      });
    }

    const map = {
      first_task:  completed >= 1,
      ten_tasks:   completed >= 10,
      fifty_tasks: completed >= 50,
      streak_7:    maxHabitStreak >= 7,
      streak_30:   maxHabitStreak >= 30,
      week_clean:  weekClean,
      habit_5:     habits.length >= 5,
      day_perfect: perfectDay
    };
    Storage.setAchievements(map);
    return map;
  }

  /* ---- Statistics view ---- */
  function renderStatisticsView(view) {
    const stats = Storage.getStats();
    const tasks = Storage.getTasks();
    const todayStr = DateH.todayStr();
    const todayTasks = tasks.filter(t => t.date === todayStr);
    const todayDone = todayTasks.filter(t => t.done).length;
    const todayPct = todayTasks.length ? Math.round((todayDone / todayTasks.length) * 100) : 0;

    const weekStart = DateH.weekStart(new Date());
    let weekDone = 0, weekTotal = 0;
    if (stats.tasksByDay) {
      for (let i = 0; i < 7; i++) {
        const ds = DateH.toDateStr(DateH.addDays(weekStart, i));
        if (stats.tasksByDay[ds]) {
          weekDone += stats.tasksByDay[ds].done || 0;
          weekTotal += stats.tasksByDay[ds].total || 0;
        }
      }
    }
    const weekPct = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0;

    const monthStart = DateH.monthStart(new Date());
    let monthDone = 0, monthTotal = 0;
    if (stats.tasksByDay) {
      const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        const ds = DateH.toDateStr(DateH.addDays(monthStart, i));
        if (stats.tasksByDay[ds]) {
          monthDone += stats.tasksByDay[ds].done || 0;
          monthTotal += stats.tasksByDay[ds].total || 0;
        }
      }
    }
    const monthPct = monthTotal ? Math.round((monthDone / monthTotal) * 100) : 0;

    const pending = tasks.filter(t => !t.done && !Tasks.isTaskLate(t)).length;
    const late = tasks.filter(t => Tasks.isTaskLate(t)).length;
    const completed = stats.completedTotal || 0;

    // Last 7 days bar chart
    const daysLabels = [];
    const daysData = [];
    const todayD = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = DateH.addDays(todayD, -i);
      const ds = DateH.toDateStr(d);
      const labels = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
      daysLabels.push(labels[d.getDay()]);
      if (stats.tasksByDay && stats.tasksByDay[ds]) {
        daysData.push(stats.tasksByDay[ds].done || 0);
      } else daysData.push(0);
    }
    const maxData = Math.max(1, ...daysData);

    const habitsDone = Storage.getHabits().filter(h => Storage.isHabitDone(h.id, todayStr)).length;
    const bestStreak = Math.max(stats.habitLongestStreak || 0, ...Storage.getHabits().map(h => Habits.computeStreak(h.id)));

    // compute achievements
    const achvMap = computeAchievements();
    const unlockedCount = Object.keys(achvMap).filter(k => achvMap[k]).length;

    view.innerHTML = `
      ${global.App.renderHeader('الإحصائيات')}
      <div class="stat-grid-2">
        <div class="stat-card-lg">
          <div class="icon" style="background:var(--brand-gradient-soft);color:var(--brand-primary);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></div>
          <div class="num">${completed}</div>
          <div class="lbl">مهام مكتملة</div>
        </div>
        <div class="stat-card-lg">
          <div class="icon" style="background:color-mix(in srgb, #18B26B 16%, transparent);color:#18B26B;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4.5 8-12a8 8 0 1 0-16 0c0 7.5 8 12 8 12z"/></svg></div>
          <div class="num">${pending}</div>
          <div class="lbl">مهام متبقية</div>
        </div>
        <div class="stat-card-lg">
          <div class="icon" style="background:color-mix(in srgb, #EF4F6B 16%, transparent);color:#EF4F6B;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 16v.5"/></svg></div>
          <div class="num">${late}</div>
          <div class="lbl">مهام متأخرة</div>
        </div>
      </div>

      <div class="stat-card-lg">
        <div class="dd-head"><div class="dd-title">إنجاز اليوم</div><div class="text-xs text-muted">${DateH.formatDateAr(new Date())}</div></div>
        <div class="donut-wrap">
          <svg width="120" height="120" viewBox="0 0 120 120" class="donut-svg">
            <defs>
              <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0066FF"/>
                <stop offset="100%" stop-color="#22B8FF"/>
              </linearGradient>
            </defs>
            <circle class="donut-bg" cx="60" cy="60" r="48"/>
            <circle class="donut-fg" cx="60" cy="60" r="48" stroke-dasharray="${2 * Math.PI * 48}" stroke-dashoffset="${2 * Math.PI * 48 * (1 - todayPct / 100)}"/>
          </svg>
          <div class="donut-center">
            <div class="num">${todayPct}%</div>
            <div class="lbl">${todayDone} من ${todayTasks.length} مهمة</div>
          </div>
        </div>
      </div>

      <div class="stat-grid-2">
        <div class="stat-card-lg">
          <div class="dd-title" style="font-size:13px;">إنجاز الأسبوع</div>
          <div class="num mt-12">${weekPct}%</div>
          <div class="lbl">${weekDone} من ${weekTotal} مهمة</div>
          <div class="tc-progress" style="max-width:none;margin-top:10px;">
            <div class="bar"><div class="bar-fill" style="width:${weekPct}%"></div></div>
          </div>
        </div>
        <div class="stat-card-lg">
          <div class="dd-title" style="font-size:13px;">إنجاز الشهر</div>
          <div class="num mt-12">${monthPct}%</div>
          <div class="lbl">${monthDone} من ${monthTotal} مهمة</div>
          <div class="tc-progress" style="max-width:none;margin-top:10px;">
            <div class="bar"><div class="bar-fill" style="width:${monthPct}%"></div></div>
          </div>
        </div>
      </div>

      <div class="stat-card-lg">
        <div class="dd-head"><div class="dd-title">آخر 7 أيام</div></div>
        <div class="bars-chart">
          ${daysData.map((v, i) => {
            const h = Math.round((v / maxData) * 100);
            return `<div class="bar-col"><div class="bar-box" style="height:${Math.max(4, h)}%"></div><div class="bar-lbl">${daysLabels[i]}</div></div>`;
          }).join('')}
        </div>
      </div>

      <div class="stat-grid-2">
        <div class="stat-card-lg">
          <div class="icon" style="background:linear-gradient(135deg,#F59E0B,#FBBF24);color:#fff;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5h4.5l-3.6 2.6 1.4 4.3-3.8-2.8-3.8 2.8 1.4-4.3L6 7.5h4.5z"/></svg></div>
          <div class="num">${habitsDone}</div>
          <div class="lbl">عادات اليوم</div>
        </div>
        <div class="stat-card-lg">
          <div class="icon" style="background:linear-gradient(135deg,#EF4F6B,#F87171);color:#fff;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5h4.5l-3.6 2.6 1.4 4.3-3.8-2.8-3.8 2.8 1.4-4.3L6 7.5h4.5z"/></svg></div>
          <div class="num">${bestStreak}</div>
          <div class="lbl">أطول سلسلة</div>
        </div>
      </div>

      <div class="section-title">
        <h2>الإنجازات</h2>
        <span class="text-xs text-muted">${unlockedCount} من ${ACHIEVEMENTS.length}</span>
      </div>
      <div id="achv-list"></div>
    `;

    const list = view.querySelector('#achv-list');
    ACHIEVEMENTS.forEach(a => {
      const unlocked = achvMap[a.id];
      const card = document.createElement('div');
      card.className = 'achv-card' + (unlocked ? '' : ' locked');
      const icon = achievementIconSvg(a.icon);
      card.innerHTML = `
        <div class="achv-icon">${icon}</div>
        <div class="achv-body">
          <div class="achv-name">${a.name}</div>
          <div class="achv-desc">${a.desc}</div>
        </div>
        <div class="achv-status ${unlocked ? 'unlocked' : 'locked'}">${unlocked ? 'مفتوح' : 'مقفل'}</div>
      `;
      list.appendChild(card);
    });
  }

  function achievementIconSvg(name) {
    const paths = {
      star:   'M12 3l1.8 5.5h5.5l-4.5 3.4 1.7 5.6L12 14.8 7.5 17.5l1.7-5.6L4.7 8.5h5.5z',
      medal:  'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9 13l-2 8 5-3 5 3-2-8',
      trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4zM16 6h4v2a4 4 0 0 1-4 4zM10 14h4l1 6h-6z',
      fire:   'M12 3s4 4 4 8a4 4 0 1 1-8 0c0-1 .3-2 .8-2.8C9 9 9 8 12 3z',
      shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
      leaf:   'M5 21c0-9 7-16 16-16 0 9-7 16-16 16zM7 19c4-2 8-6 10-10',
      sun:    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3v2M12 19v2M5 12H3M21 12h-2M6 6L4.5 4.5M19.5 4.5L18 6M6 18l-1.5 1.5M19.5 19.5L18 18'
    };
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + (paths[name] || paths.star) + '"/></svg>';
  }

  global.Statistics = {
    ACHIEVEMENTS,
    computeAchievements,
    renderStatisticsView,
    recompute: computeAchievements
  };
  global.Achievements = { recompute: computeAchievements };
})(window);
