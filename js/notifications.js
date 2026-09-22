/* =========================================================
   حياتي — notifications.js
   In-app toast notifications, motivational banners,
   scheduled task reminders (timer-based)
   ========================================================= */

(function (global) {
  'use strict';

  const MOTIVATIONALS = [
    'خطوة صغيرة اليوم تصنع فرقًا كبيرًا غدًا',
    'ابدأ بمهمة واحدة فقط',
    'أنت قادر على إنجاز يومك',
    'ركّز على مهمة واحدة في كل مرة',
    'الإنجاز يبدأ بخطوة',
    'نظّم يومك، تغيّر حياتك',
    'لا تؤجل ما يمكنك إنجازه اليوم',
    'كل يوم فرصة جديدة لتكون أفضل',
    'الاستمرارية أقوى من الموهبة',
    'استرخِ، أنت تتقدّم'
  ];

  let toastTimers = [];
  let reminderInterval = null;
  let reminderLastTick = {};

  function el(id) { return document.getElementById(id); }

  function toast(message, type, opts) {
    type = type || 'default';
    opts = opts || {};
    const container = el('toast-container');
    if (!container) return;

    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.setAttribute('role', 'status');

    const iconSvg = (type === 'success')
      ? '<svg class="t-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : (type === 'info')
      ? '<svg class="t-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : (type === 'warning')
      ? '<svg class="t-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '';

    t.innerHTML = iconSvg + '<span>' + message + '</span>';
    container.appendChild(t);

    const duration = opts.duration || 2400;
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  function success(msg) { toast(msg, 'success'); }
  function info(msg)    { toast(msg, 'info'); }
  function warn(msg)    { toast(msg, 'warning'); }
  function error(msg)   { toast(msg, 'default'); }

  /* Motivational banner — appears once per session on app open */
  function showMotivational() {
    const s = Storage.getSettings();
    if (!s.motivBanner) return;
    const banner = el('motiv-banner');
    if (!banner) return;
    const text = MOTIVATIONALS[Math.floor(Math.random() * MOTIVATIONALS.length)];
    banner.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6L5.7 21 8 14.8 2 9.4h7.6z" fill="currentColor"/></svg>' + text;
    banner.hidden = false;
    setTimeout(() => {
      banner.style.transition = 'opacity .4s ease, transform .4s ease';
      banner.style.opacity = '0';
      banner.style.transform = 'translate(-50%, -16px)';
      setTimeout(() => {
        banner.hidden = true;
        banner.style.opacity = '';
        banner.style.transform = '';
      }, 400);
    }, 3500);
  }

  /* Add a notification to in-app log + badge */
  function pushNotif(notif) {
    const n = Storage.addNotif(notif);
    updateBadge();
    return n;
  }

  function updateBadge() {
    const unread = Storage.getUnreadNotifsCount();
    document.querySelectorAll('.icon-btn .badge').forEach(b => {
      b.style.display = unread > 0 ? 'block' : 'none';
    });
  }

  /* Check upcoming tasks (10 min before) and emit toast + notif */
  function checkUpcomingTasks() {
    const tasks = Storage.getTasks();
    const now = new Date();
    tasks.forEach(t => {
      if (t.done) return;
      if (!t.date || !t.time) return;
      const dt = new Date(t.date + 'T' + t.time);
      const diffMin = Math.round((dt - now) / 60000);
      if (diffMin > 0 && diffMin <= 10) {
        const key = t.id + '_' + diffMin;
        if (reminderLastTick[key]) return;
        reminderLastTick[key] = true;
        toast('⏰ لديك مهمة بعد ' + diffMin + ' دقيقة: ' + t.name, 'info', { duration: 3500 });
        pushNotif({
          title: 'تذكير بمهمة',
          body: 'لديك مهمة "' + t.name + '" بعد ' + diffMin + ' دقيقة',
          icon: 'task'
        });
      }
    });
  }

  /* Check habit reminders (today, not done yet, around its time) */
  function checkHabits() {
    const habits = Storage.getHabits();
    const today = DateH.todayStr();
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    habits.forEach(h => {
      if (Storage.isHabitDone(h.id, today)) return;
      // day-of-week match (0 Sun..6 Sat) -> store as ['sun','mon'...]
      const dayMap = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
      const todayDow = now.getDay();
      const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][todayDow];
      if (h.days && h.days.length && h.days.indexOf(dayKey) === -1) return;
      if (!h.reminderTime) return;
      const [hH, hM] = h.reminderTime.split(':').map(Number);
      const habitMin = hH * 60 + hM;
      if (Math.abs(curMin - habitMin) <= 1 && !reminderLastTick['habit_' + h.id + '_' + today]) {
        reminderLastTick['habit_' + h.id + '_' + today] = true;
        toast('حان وقت عادة اليوم: ' + h.name, 'info', { duration: 3500 });
        pushNotif({ title: 'عادة', body: 'حان وقت: ' + h.name, icon: 'habit' });
      }
    });
  }

  /* Check reminders (recurring text reminders) */
  function checkReminders() {
    const reminders = Storage.getReminders();
    const now = new Date();
    reminders.forEach(r => {
      if (!r.enabled) return;
      const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];
      const dayKey = dayMap[now.getDay()];
      if (r.days && r.days.length && r.days.indexOf(dayKey) === -1) return;
      const curMin = now.getHours() * 60 + now.getMinutes();
      const [hH, hM] = r.time.split(':').map(Number);
      const startMin = hH * 60 + hM;
      if (curMin < startMin) return;
      // recurring interval
      const diffMin = curMin - startMin;
      if (r.interval && diffMin % r.interval === 0 && diffMin >= 0) {
        const key = 'rem_' + r.id + '_' + now.toDateString() + '_' + curMin;
        if (reminderLastTick[key]) return;
        reminderLastTick[key] = true;
        toast(r.text + ' — ' + DateH.formatTimeFromStr(r.time), 'info', { duration: 4000 });
        pushNotif({ title: 'تذكير', body: r.text, icon: 'reminder' });
      }
    });
  }

  function startTickers() {
    // Every minute
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(() => {
      const s = Storage.getSettings();
      if (s.notifications) {
        checkUpcomingTasks();
        checkHabits();
        checkReminders();
      }
    }, 60 * 1000);
    // immediate first tick after 5 seconds (after splash)
    setTimeout(() => {
      const s = Storage.getSettings();
      if (s.notifications) {
        checkUpcomingTasks();
        checkHabits();
        checkReminders();
      }
    }, 5000);
  }

  /* Show end-of-day summary if user completed most tasks */
  function checkEndOfDaySummary() {
    const tasks = Storage.getTasks();
    const today = DateH.todayStr();
    const todayTasks = tasks.filter(t => t.date === today);
    if (todayTasks.length === 0) return;
    const done = todayTasks.filter(t => t.done).length;
    const pct = Math.round((done / todayTasks.length) * 100);
    const now = new Date();
    if (now.getHours() >= 20 && pct >= 70) {
      const key = 'summary_' + today;
      if (reminderLastTick[key]) return;
      reminderLastTick[key] = true;
      toast('أحسنت، أنجزت ' + pct + '% من مهامك اليوم', 'success', { duration: 4000 });
    }
  }

  global.Notifications = {
    toast, success, info, warn, error,
    showMotivational,
    pushNotif,
    updateBadge,
    startTickers,
    checkUpcomingTasks,
    checkEndOfDaySummary
  };
})(window);
