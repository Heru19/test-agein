/* =============================================
   Personal Dashboard — app.js
   Vanilla JS | Local Storage | No frameworks
   ============================================= */

/* ── Storage helpers ────────────────────────── */
const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

/* =============================================
   NAME SCREEN (first-visit prompt)
   ============================================= */
(function initNameScreen() {
  const NAME_KEY = 'dashboard_username';
  const screen = document.getElementById('name-screen');
  const nameInput = document.getElementById('name-input');
  const submitBtn = document.getElementById('name-submit');

  function saveName() {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    storage.set(NAME_KEY, name);
    hideScreen();
    // Notify the clock module to update the greeting immediately
    document.dispatchEvent(new CustomEvent('nameUpdated', { detail: { name } }));
  }

  function hideScreen() {
    screen.classList.add('hidden');
    screen.setAttribute('aria-hidden', 'true');
  }

  // Show screen only if no name is stored yet
  const stored = storage.get(NAME_KEY, '');
  if (!stored) {
    screen.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 50);
  }

  submitBtn.addEventListener('click', saveName);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });
})();

/* =============================================
   GREETING & DATE/TIME
   ============================================= */
(function initClock() {
  const NAME_KEY = 'dashboard_username';
  const timeEl = document.getElementById('current-time');
  const dateEl = document.getElementById('current-date');
  const greetEl = document.getElementById('greeting-text');

  function greetingFor(hour, name) {
    const suffix = name ? `, ${name}!` : '!';
    if (hour < 12) return `☀️ Good morning${suffix}`;
    if (hour < 17) return `🌤️ Good afternoon${suffix}`;
    if (hour < 21) return `🌙 Good evening${suffix}`;
    return `🌜 Good night${suffix}`;
  }

  function tick() {
    const now = new Date();
    const name = storage.get(NAME_KEY, '');

    // Time
    timeEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Date
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Greeting with name
    greetEl.textContent = greetingFor(now.getHours(), name);
  }

  tick();
  setInterval(tick, 1000);

  // Update greeting immediately when a name is saved from the name screen
  document.addEventListener('nameUpdated', tick);
})();

/* =============================================
   FOCUS TIMER
   ============================================= */
(function initTimer() {
  const TOTAL = 25 * 60; // 25 minutes in seconds
  let remaining = TOTAL;
  let intervalId = null;
  let isRunning = false;

  const display = document.getElementById('timer-display');
  const btnStart = document.getElementById('timer-start');
  const btnStop = document.getElementById('timer-stop');
  const btnReset = document.getElementById('timer-reset');

  function format(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function render() {
    display.textContent = format(remaining);
    display.classList.toggle('running', isRunning && remaining > 0);
    display.classList.toggle('finished', remaining === 0);
  }

  function start() {
    if (isRunning || remaining === 0) return;
    isRunning = true;
    render();
    intervalId = setInterval(() => {
      remaining--;
      render();
      if (remaining === 0) {
        clearInterval(intervalId);
        isRunning = false;
        // Subtle notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus session complete! 🎉');
        }
      }
    }, 1000);
  }

  function stop() {
    if (!isRunning) return;
    clearInterval(intervalId);
    isRunning = false;
    render();
  }

  function reset() {
    clearInterval(intervalId);
    isRunning = false;
    remaining = TOTAL;
    render();
  }

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
  btnReset.addEventListener('click', reset);

  // Optional: request notification permission on first start
  btnStart.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, { once: true });

  render();
})();

/* =============================================
   TO-DO LIST
   ============================================= */
(function initTodo() {
  const STORAGE_KEY = 'dashboard_todos';
  let tasks = storage.get(STORAGE_KEY, []); // [{ id, text, done }]

  const listEl = document.getElementById('todo-list');
  const inputEl = document.getElementById('todo-input');
  const addBtn = document.getElementById('todo-add');

  const modal = document.getElementById('edit-modal');
  const editInput = document.getElementById('edit-input');
  const editSave = document.getElementById('edit-save');
  const editCancel = document.getElementById('edit-cancel');
  let editingId = null;

  /* ── Persistence ── */
  function save() {
    storage.set(STORAGE_KEY, tasks);
  }

  /* ── Render ── */
  function render() {
    listEl.innerHTML = '';

    if (tasks.length === 0) {
      listEl.innerHTML = '<li class="todo-empty">No tasks yet. Add one above!</li>';
      return;
    }

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = `todo-item${task.done ? ' done' : ''}`;
      li.dataset.id = task.id;

      // Checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', 'Mark task as done');
      checkbox.addEventListener('change', () => toggleDone(task.id));

      // Text
      const textEl = document.createElement('span');
      textEl.className = 'task-text';
      textEl.textContent = task.text;

      // Actions
      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.title = 'Edit task';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => openEdit(task.id));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon danger';
      delBtn.title = 'Delete task';
      delBtn.setAttribute('aria-label', 'Delete task');
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', () => deleteTask(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(checkbox);
      li.appendChild(textEl);
      li.appendChild(actions);
      listEl.appendChild(li);
    });
  }

  /* ── Actions ── */
  function addTask() {
    const text = inputEl.value.trim();
    if (!text) return;
    tasks.push({ id: Date.now(), text, done: false });
    save();
    render();
    inputEl.value = '';
    inputEl.focus();
  }

  function toggleDone(id) {
    tasks = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    save();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
  }

  function openEdit(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    editingId = id;
    editInput.value = task.text;
    modal.classList.remove('hidden');
    editInput.focus();
  }

  function closeEdit() {
    modal.classList.add('hidden');
    editingId = null;
  }

  function saveEdit() {
    const text = editInput.value.trim();
    if (!text || editingId === null) return;
    tasks = tasks.map((t) => t.id === editingId ? { ...t, text } : t);
    save();
    render();
    closeEdit();
  }

  /* ── Events ── */
  addBtn.addEventListener('click', addTask);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

  editSave.addEventListener('click', saveEdit);
  editCancel.addEventListener('click', closeEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') closeEdit();
  });

  // Close modal on backdrop click
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEdit(); });

  render();
})();

/* =============================================
   QUICK LINKS
   ============================================= */
(function initLinks() {
  const STORAGE_KEY = 'dashboard_links';
  let links = storage.get(STORAGE_KEY, []); // [{ id, name, url }]

  const gridEl = document.getElementById('links-grid');
  const nameInput = document.getElementById('link-name-input');
  const urlInput = document.getElementById('link-url-input');
  const addBtn = document.getElementById('link-add');

  /* ── Persistence ── */
  function save() {
    storage.set(STORAGE_KEY, links);
  }

  /* ── Helpers ── */
  function faviconUrl(url) {
    try {
      const origin = new URL(url).origin;
      return `${origin}/favicon.ico`;
    } catch {
      return '';
    }
  }

  function sanitizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      // Allow only http/https
      const parsed = new URL(
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : 'https://' + trimmed
      );
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.href;
    } catch {
      return null;
    }
  }

  /* ── Render ── */
  function render() {
    gridEl.innerHTML = '';

    if (links.length === 0) {
      gridEl.innerHTML = '<p class="links-empty">No links yet. Add your favourites above!</p>';
      return;
    }

    links.forEach((link) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'link-wrapper';

      const anchor = document.createElement('a');
      anchor.className = 'link-pill';
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.title = link.url;

      const img = document.createElement('img');
      img.src = faviconUrl(link.url);
      img.alt = '';
      img.width = 16;
      img.height = 16;
      // Hide broken favicon images gracefully
      img.onerror = () => { img.style.display = 'none'; };

      const label = document.createElement('span');
      label.textContent = link.name;

      anchor.appendChild(img);
      anchor.appendChild(label);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon danger';
      delBtn.title = 'Remove link';
      delBtn.setAttribute('aria-label', `Remove ${link.name}`);
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => deleteLink(link.id));

      wrapper.appendChild(anchor);
      wrapper.appendChild(delBtn);
      gridEl.appendChild(wrapper);
    });
  }

  /* ── Actions ── */
  function addLink() {
    const name = nameInput.value.trim();
    const url = sanitizeUrl(urlInput.value);

    if (!name) {
      nameInput.focus();
      return;
    }
    if (!url) {
      urlInput.focus();
      return;
    }

    links.push({ id: Date.now(), name, url });
    save();
    render();
    nameInput.value = '';
    urlInput.value = '';
    nameInput.focus();
  }

  function deleteLink(id) {
    links = links.filter((l) => l.id !== id);
    save();
    render();
  }

  /* ── Events ── */
  addBtn.addEventListener('click', addLink);
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });

  render();
})();
