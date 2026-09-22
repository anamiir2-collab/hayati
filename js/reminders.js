/* =========================================================
   حياتي — reminders.js
   Reminder CRUD, recurring interval notifications
   ========================================================= */

(function (global) {
  'use strict';

  function newReminder(data) {
    return Object.assign({
      id: Storage.uid('r'),
      text: '',
      time: '08:00',
      interval: 0,        // 0 means once, otherwise minutes (5,10,30,60,...)
      days: ['sun','mon','tue','wed','thu','fri','sat'],  // days to show on
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, data || {});
  }

  function saveReminder(r) {
    if (!r.text || !r.text.trim()) { Notifications.warn('اكتب نص التذكير'); return null; }
    const existing = r.id ? Storage.getReminders().find(x => x.id === r.id) : null;
    if (existing) {
      Storage.updateReminder(r.id, r);
      Notifications.success('تم تحديث التذكير');
    } else {
      if (!r.id) r.id = Storage.uid('r');
      Storage.addReminder(r);
      Notifications.success('تمت إضافة التذكير');
    }
    return r;
  }

  function deleteReminder(id) {
    Storage.deleteReminder(id);
    Notifications.toast('تم حذف التذكير', 'warning');
  }

  function toggleEnabled(id) {
    const r = Storage.getReminders().find(x => x.id === id);
    if (!r) return;
    Storage.updateReminder(id, { enabled: !r.enabled });
  }

  /* ---- Reminders management view (inside settings or own route) ---- */
  function renderRemindersList(container) {
    container.innerHTML = '';
    const reminders = Storage.getReminders();
    if (!reminders.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-ill"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg></div><div class="empty-title">لا توجد تذكيرات</div><div class="empty-desc">أنشئ تذكيرًا يظهر على فترات، مثل ذكر الله أو شرب الماء</div><button class="btn mt-18" onclick="Reminders.openAddModal()">+ إضافة تذكير</button></div>`;
      return;
    }
    reminders.forEach(r => {
      const card = document.createElement('div');
      card.className = 'reminder-card';
      const daysLabel = (r.days && r.days.length === 7) ? 'كل يوم' : (r.days || []).map(d => ({sun:'أحد',mon:'إثنين',tue:'ثلاثاء',wed:'أربعاء',thu:'خميس',fri:'جمعة',sat:'سبت'}[d])).join('، ');
      const intervalLabel = r.interval > 0 ? ('كل ' + r.interval + ' دقيقة') : 'مرة واحدة';
      card.innerHTML = `
        <div class="reminder-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z M10 21h4"/></svg>
        </div>
        <div class="reminder-info">
          <div class="reminder-name">${Tasks.escapeHTML(r.text)}</div>
          <div class="reminder-meta">${DateH.formatTimeFromStr(r.time)} • ${intervalLabel} • ${daysLabel}</div>
        </div>
        <button class="toggle ${r.enabled ? 'on' : ''}" data-toggle aria-label="تفعيل/إيقاف"></button>
        <button class="habit-act-btn" data-edit aria-label="تعديل"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h4L18 6l-4-4L4 16v4z M14 6l4 4"/></svg></button>
      `;
      card.querySelector('[data-toggle]').addEventListener('click', () => {
        toggleEnabled(r.id);
        global.App.refresh();
      });
      card.querySelector('[data-edit]').addEventListener('click', () => {
        openEditModal(r.id);
      });
      container.appendChild(card);
    });
  }

  /* ---- Modal ---- */
  function openAddModal() { renderReminderModal(newReminder(), false); }
  function openEditModal(id) {
    const r = Storage.getReminders().find(x => x.id === id);
    if (!r) return;
    renderReminderModal(r, true);
  }

  function renderReminderModal(r, isEdit) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    const dayNames = { sun:'الأحد', mon:'الإثنين', tue:'الثلاثاء', wed:'الأربعاء', thu:'الخميس', fri:'الجمعة', sat:'السبت' };
    const intervals = [0, 5, 10, 15, 30, 60, 120, 180];
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3 class="sheet-title">${isEdit ? 'تعديل التذكير' : 'إضافة تذكير'}</h3>
          <button class="sheet-close" aria-label="إغلاق"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="field">
          <label>نص التذكير</label>
          <input class="input" id="rf-text" maxlength="80" placeholder="مثال: اذكر الله" value="${Tasks.escapeHTML(r.text)}" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>وقت البداية</label>
            <input class="input" type="time" id="rf-time" value="${r.time}" />
          </div>
          <div class="field">
            <label>التكرار كل</label>
            <select class="select" id="rf-interval">
              ${intervals.map(v => `<option value="${v}" ${r.interval === v ? 'selected' : ''}>${v === 0 ? 'مرة واحدة' : v + ' دقيقة'}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label>أيام الظهور</label>
          <div class="chip-group" id="rf-days">
            ${Object.keys(dayNames).map(d => `<button type="button" class="chip-opt ${(r.days || []).indexOf(d) !== -1 ? 'active' : ''}" data-val="${d}">${dayNames[d]}</button>`).join('')}
          </div>
        </div>
        <div class="flex gap-10 mt-12">
          ${isEdit ? '<button class="btn btn-danger btn-sm" id="rf-delete" style="flex:0 0 auto;width:auto;padding:12px 16px;">حذف</button>' : ''}
          <button class="btn" id="rf-save" style="flex:1;">حفظ التذكير</button>
        </div>
      </div>
    `;
    root.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    root.querySelector('.sheet-close').addEventListener('click', closeModal);
    root.querySelectorAll('#rf-days .chip-opt').forEach(b => b.addEventListener('click', () => b.classList.toggle('active')));
    root.querySelector('#rf-save').addEventListener('click', () => {
      const text = root.querySelector('#rf-text').value.trim();
      if (!text) { Notifications.warn('اكتب نص التذكير'); return; }
      const days = Array.from(root.querySelectorAll('#rf-days .chip-opt.active')).map(x => x.dataset.val);
      const updated = Object.assign({}, r, {
        text: text,
        time: root.querySelector('#rf-time').value || '08:00',
        interval: parseInt(root.querySelector('#rf-interval').value, 10) || 0,
        days: days
      });
      const saved = saveReminder(updated);
      if (saved) {
        closeModal();
        global.App.refresh();
      }
    });
    if (isEdit) {
      root.querySelector('#rf-delete').addEventListener('click', () => {
        if (confirm('حذف التذكير؟')) {
          deleteReminder(r.id);
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

  global.Reminders = {
    newReminder, saveReminder, deleteReminder, toggleEnabled,
    renderRemindersList, openAddModal, openEditModal, closeModal
  };
})(window);
