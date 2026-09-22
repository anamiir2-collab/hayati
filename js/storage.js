/* =========================================================
   حياتي — storage.js
   localStorage wrapper with namespacing and JSON safety
   ========================================================= */

(function (global) {
  'use strict';

  const NS = 'hayati.';
  const KEYS = {
    TASKS:        NS + 'tasks',
    HABITS:       NS + 'habits',
    HABIT_LOGS:   NS + 'habitLogs',
    REMINDERS:    NS + 'reminders',
    ACHIEVEMENTS: NS + 'achievements',
    SETTINGS:     NS + 'settings',
    STATS:        NS + 'stats',
    NOTIFS:       NS + 'notifs',
    USER:         NS + 'user',
    ONBOARDED:    NS + 'onboarded',
    LAST_VISIT:   NS + 'lastVisit',
    SEEN_NOTIFS:  NS + 'seenNotifs'
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('storage.read failed', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('storage.write failed', key, e);
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /* Default data structures */
  const DEFAULTS = {
    tasks:        [],
    habits:        [],
    habitLogs:     {},  // { habitId: { 'YYYY-MM-DD': true } }
    reminders:     [],
    achievements:  null, // computed, but cached
    settings: {
      darkMode:       'auto',     // auto | light | dark
      language:       'ar',
      startOfDay:     '06:00',
      notifications:  true,
      reminderSound:  true,
      motivBanner:    true,
      textSize:       'normal',  // normal | large
      userName:       ''
    },
    stats: {
      completedTotal:   0,
      bestStreak:        0,
      tasksByDay:        {},   // { 'YYYY-MM-DD': { done: N, total: N } }
      habitLongestStreak: 0
    },
    user: {
      name: 'صديق',
      avatar: ''
    },
    notifs:       [],
    seenNotifs:   {}
  };

  /* API */
  const Storage = {
    KEYS,
    DEFAULTS,
    uid,

    /* Tasks */
    getTasks()        { return read(KEYS.TASKS, DEFAULTS.tasks); },
    setTasks(v)       { return write(KEYS.TASKS, v); },
    addTask(task) {
      const tasks = Storage.getTasks();
      tasks.unshift(task);
      Storage.setTasks(tasks);
      return task;
    },
    updateTask(id, patch) {
      const tasks = Storage.getTasks();
      const i = tasks.findIndex(t => t.id === id);
      if (i >= 0) {
        tasks[i] = Object.assign({}, tasks[i], patch, { updatedAt: Date.now() });
        Storage.setTasks(tasks);
        return tasks[i];
      }
      return null;
    },
    deleteTask(id) {
      const tasks = Storage.getTasks().filter(t => t.id !== id);
      Storage.setTasks(tasks);
    },

    /* Habits */
    getHabits()      { return read(KEYS.HABITS, DEFAULTS.habits); },
    setHabits(v)     { write(KEYS.HABITS, v); },
    addHabit(h) {
      const arr = Storage.getHabits();
      arr.unshift(h);
      Storage.setHabits(arr);
      return h;
    },
    updateHabit(id, patch) {
      const arr = Storage.getHabits();
      const i = arr.findIndex(h => h.id === id);
      if (i >= 0) {
        arr[i] = Object.assign({}, arr[i], patch, { updatedAt: Date.now() });
        Storage.setHabits(arr);
        return arr[i];
      }
      return null;
    },
    deleteHabit(id) {
      Storage.setHabits(Storage.getHabits().filter(h => h.id !== id));
      const logs = Storage.getHabitLogs();
      delete logs[id];
      Storage.setHabitLogs(logs);
    },

    /* Habit logs: { habitId: { 'YYYY-MM-DD': true } } */
    getHabitLogs()   { return read(KEYS.HABIT_LOGS, DEFAULTS.habitLogs); },
    setHabitLogs(v)  { write(KEYS.HABIT_LOGS, v); },
    toggleHabitLog(habitId, dateStr, value) {
      const logs = Storage.getHabitLogs();
      if (!logs[habitId]) logs[habitId] = {};
      if (value == null) value = !logs[habitId][dateStr];
      if (value) logs[habitId][dateStr] = true;
      else delete logs[habitId][dateStr];
      Storage.setHabitLogs(logs);
      return !!logs[habitId][dateStr];
    },
    isHabitDone(habitId, dateStr) {
      const logs = Storage.getHabitLogs();
      return !!(logs[habitId] && logs[habitId][dateStr]);
    },

    /* Reminders */
    getReminders()    { return read(KEYS.REMINDERS, DEFAULTS.reminders); },
    setReminders(v)   { write(KEYS.REMINDERS, v); },
    addReminder(r) {
      const arr = Storage.getReminders();
      arr.unshift(r);
      Storage.setReminders(arr);
      return r;
    },
    updateReminder(id, patch) {
      const arr = Storage.getReminders();
      const i = arr.findIndex(r => r.id === id);
      if (i >= 0) {
        arr[i] = Object.assign({}, arr[i], patch, { updatedAt: Date.now() });
        Storage.setReminders(arr);
        return arr[i];
      }
      return null;
    },
    deleteReminder(id) {
      Storage.setReminders(Storage.getReminders().filter(r => r.id !== id));
    },

    /* Settings */
    getSettings()    { return Object.assign({}, DEFAULTS.settings, read(KEYS.SETTINGS, {})); },
    setSettings(patch) {
      const cur = Storage.getSettings();
      const next = Object.assign({}, cur, patch);
      write(KEYS.SETTINGS, next);
      return next;
    },

    /* Stats */
    getStats()    { return Object.assign({}, DEFAULTS.stats, read(KEYS.STATS, {})); },
    setStats(patch) {
      const cur = Storage.getStats();
      const next = Object.assign({}, cur, patch);
      write(KEYS.STATS, next);
      return next;
    },

    /* User */
    getUser()     { return Object.assign({}, DEFAULTS.user, read(KEYS.USER, {})); },
    setUser(patch) {
      const cur = Storage.getUser();
      const next = Object.assign({}, cur, patch);
      write(KEYS.USER, next);
      return next;
    },

    /* Achievements */
    getAchievements()  { return read(KEYS.ACHIEVEMENTS, null); },
    setAchievements(v) { write(KEYS.ACHIEVEMENTS, v); },

    /* Onboarding */
    isOnboarded()       { return read(KEYS.ONBOARDED, false); },
    setOnboarded(v)     { write(KEYS.ONBOARDED, v === true); },

    /* Last visit for daily banner / streak reset */
    getLastVisit() { return read(KEYS.LAST_VISIT, null); },
    setLastVisit(d) { write(KEYS.LAST_VISIT, d); },

    /* Notifications (in-app log) */
    getNotifs()       { return read(KEYS.NOTIFS, []); },
    setNotifs(v)      { write(KEYS.NOTIFS, v); },
    addNotif(n) {
      const arr = Storage.getNotifs();
      arr.unshift(Object.assign({ id: uid('n'), time: Date.now(), read: false }, n));
      Storage.setNotifs(arr.slice(0, 100));
      return n;
    },
    markNotifRead(id) {
      const arr = Storage.getNotifs();
      const i = arr.findIndex(n => n.id === id);
      if (i >= 0) { arr[i].read = true; Storage.setNotifs(arr); }
    },
    markAllNotifsRead() {
      const arr = Storage.getNotifs().map(n => Object.assign({}, n, { read: true }));
      Storage.setNotifs(arr);
    },
    getUnreadNotifsCount() {
      return Storage.getNotifs().filter(n => !n.read).length;
    },

    /* Export / Import */
    exportAll() {
      const data = {};
      Object.keys(KEYS).forEach(k => {
        data[k] = read(KEYS[k], null);
      });
      return data;
    },
    importAll(data) {
      if (!data || typeof data !== 'object') return false;
      Object.keys(KEYS).forEach(k => {
        if (data[k] !== undefined && data[k] !== null) write(KEYS[k], data[k]);
      });
      return true;
    },
    resetAll() {
      Object.keys(KEYS).forEach(k => remove(KEYS[k]));
    }
  };

  /* Date helpers (shared) */
  const DateH = {
    todayStr() {
      const d = new Date();
      return DateH.toDateStr(d);
    },
    toDateStr(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    },
    parseDateStr(s) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    },
    addDaysStr(s, n) {
      const d = DateH.parseDateStr(s);
      d.setDate(d.getDate() + n);
      return DateH.toDateStr(d);
    },
    addDays(d, n) {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x;
    },
    formatTime(date) {
      let h = date.getHours();
      const m = String(date.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'م' : 'ص';
      h = h % 12; if (h === 0) h = 12;
      return h + ':' + m + ' ' + ampm;
    },
    formatTimeFromStr(time) {
      // time = "HH:MM"
      const [hStr, m] = time.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'م' : 'ص';
      h = h % 12; if (h === 0) h = 12;
      return h + ':' + m + ' ' + ampm;
    },
    formatDateAr(date) {
      const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      const days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
      return days[date.getDay()] + '، ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
    },
    shortDate(date) {
      const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      return date.getDate() + ' ' + months[date.getMonth()];
    },
    greeting(date) {
      const h = date.getHours();
      if (h >= 5 && h < 12) return 'صباح الخير';
      if (h >= 12 && h < 18) return 'مساء الخير';
      if (h >= 18 && h < 22) return 'مساء الخير';
      return 'ليلة هادئة';
    },
    isToday(s) { return s === DateH.todayStr(); },
    isPast(s) { return s < DateH.todayStr(); },
    isFuture(s) { return s > DateH.todayStr(); },
    weekStart(date) {
      const d = new Date(date);
      const day = d.getDay(); // 0 Sunday
      d.setDate(d.getDate() - day);
      d.setHours(0,0,0,0);
      return d;
    },
    monthStart(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
  };

  global.Storage = Storage;
  global.DateH = DateH;
})(window);
