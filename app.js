"use strict";

const taskNames = ["Task A", "Task B", "Task C", "Task D", "Task E"];
const noteForm = document.querySelector("#note-form");
const taskForm = document.querySelector("#task-form");
const taskInputs = document.querySelector("#task-inputs");
const publishedNotes = document.querySelector("#published-notes");
const taskList = document.querySelector("#task-list");
const notificationButton = document.querySelector("#notification-button");

let notes = readStorage("personal-notes");
let tasks = readStorage("personal-tasks");

function readStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? []; }
  catch { return []; }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function createTaskInputs() {
  taskInputs.innerHTML = taskNames.map((name, index) => `
    <div class="task-row">
      <strong>${name}</strong>
      <div>
        <label for="task-${index}-details">Details</label>
        <input id="task-${index}-details" type="text" placeholder="What needs to be done?" required>
      </div>
      <div>
        <label for="task-${index}-reminder">Reminder</label>
        <input id="task-${index}-reminder" type="datetime-local" required>
      </div>
    </div>
  `).join("");
}

function renderNotes() {
  if (notes.length === 0) {
    publishedNotes.className = "empty-state";
    publishedNotes.textContent = "No notes published yet.";
    return;
  }
  publishedNotes.className = "";
  publishedNotes.innerHTML = notes.map((note) => `
    <article class="note">
      <div class="item-actions">
        <h3>${escapeHtml(note.title)}</h3>
        <button class="danger" type="button" data-delete-note="${note.id}">Delete</button>
      </div>
      <p>${escapeHtml(note.content)}</p>
      <small>Published ${new Date(note.publishedAt).toLocaleString()}</small>
    </article>
  `).join("");
}

function renderTasks() {
  if (tasks.length === 0) {
    taskList.className = "empty-state";
    taskList.textContent = "No task reminders saved yet.";
    return;
  }
  taskList.className = "";
  taskList.innerHTML = tasks.map((task) => `
    <article class="task-item ${task.completed ? "completed" : ""}">
      <div class="item-actions">
        <div>
          <h3>${escapeHtml(task.name)}</h3>
          <p>${escapeHtml(task.details)}</p>
          <small>Reminder: ${new Date(task.reminderAt).toLocaleString()}</small>
        </div>
        <label class="checkbox-label">
          <input type="checkbox" data-complete-task="${task.id}" ${task.completed ? "checked" : ""}>
          Done
        </label>
      </div>
    </article>
  `).join("");
}

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.querySelector("#note-title").value.trim();
  const content = document.querySelector("#note-content").value.trim();
  notes.unshift({ id: crypto.randomUUID(), title, content, publishedAt: new Date().toISOString() });
  saveStorage("personal-notes", notes);
  noteForm.reset();
  renderNotes();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  tasks = taskNames.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    details: document.querySelector(`#task-${index}-details`).value.trim(),
    reminderAt: document.querySelector(`#task-${index}-reminder`).value,
    completed: false,
    notificationSent: false
  }));
  saveStorage("personal-tasks", tasks);
  taskForm.reset();
  renderTasks();
  checkReminders();
});

publishedNotes.addEventListener("click", (event) => {
  const noteId = event.target.dataset.deleteNote;
  if (!noteId) return;
  notes = notes.filter((note) => note.id !== noteId);
  saveStorage("personal-notes", notes);
  renderNotes();
});

taskList.addEventListener("change", (event) => {
  const taskId = event.target.dataset.completeTask;
  if (!taskId) return;
  tasks = tasks.map((task) => task.id === taskId ? { ...task, completed: event.target.checked } : task);
  saveStorage("personal-tasks", tasks);
  renderTasks();
});

notificationButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return;
  }
  const permission = await Notification.requestPermission();
  notificationButton.textContent = permission === "granted" ? "Notifications enabled" : "Notifications blocked";
});

function checkReminders() {
  const now = Date.now();
  let tasksChanged = false;
  tasks = tasks.map((task) => {
    const isDue = new Date(task.reminderAt).getTime() <= now;
    if (isDue && !task.completed && !task.notificationSent) {
      showReminder(task);
      tasksChanged = true;
      return { ...task, notificationSent: true };
    }
    return task;
  });
  if (tasksChanged) saveStorage("personal-tasks", tasks);
}

function showReminder(task) {
  const message = `${task.name}: ${task.details}`;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Task reminder", { body: message });
  } else {
    alert(message);
  }
}

createTaskInputs();
renderNotes();
renderTasks();
checkReminders();
setInterval(checkReminders, 30_000);
