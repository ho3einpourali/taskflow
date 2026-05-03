class ThemeManager {
  constructor() {
    this.storageKey = "taskflow_theme";
    this.currentTheme = localStorage.getItem(this.storageKey) || "dark";
    this.toggle = document.getElementById("themeToggle");
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.toggle.addEventListener("change", () => this.toggleTheme());
  }

  toggleTheme() {
    this.currentTheme = this.toggle.checked ? "dark" : "light";
    this.applyTheme(this.currentTheme);
    localStorage.setItem(this.storageKey, this.currentTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.toggle.checked = theme === "dark";
  }
}

class DatabaseService {
  constructor() {
    this.storageKey = "kanban_tasks";
  }

  getAll() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.getDefaultData();
  }

  save(tasks) {
    localStorage.setItem(this.storageKey, JSON.stringify(tasks));
  }

  add(task) {
    const tasks = this.getAll();
    task.id = Date.now();
    task.createdAt = new Date().toLocaleDateString();
    tasks.push(task);
    this.save(tasks);
    return task;
  }

  update(id, updates) {
    const tasks = this.getAll();
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      this.save(tasks);
      return tasks[index];
    }
    return null;
  }

  delete(id) {
    const tasks = this.getAll().filter((t) => t.id !== id);
    this.save(tasks);
  }

  getDefaultData() {
    return [
      {
        id: 1,
        title: "Setup Angular Project",
        desc: "Initialize new project with CLI",
        priority: "high",
        column: "done",
        date: "2026-05-01",
      },
      {
        id: 2,
        title: "Design Database Schema",
        desc: "Create SQL tables for users and posts",
        priority: "high",
        column: "progress",
        date: "2026-05-02",
      },
      {
        id: 3,
        title: "Implement Auth Service",
        desc: "JWT authentication flow",
        priority: "medium",
        column: "todo",
        date: "2026-05-03",
      },
      {
        id: 4,
        title: "UI/UX Review",
        desc: "Check responsiveness on mobile",
        priority: "low",
        column: "review",
        date: "2026-05-03",
      },
    ];
  }
}

class KanbanBoard {
  constructor() {
    this.db = new DatabaseService();
    this.columns = [
      { id: "todo", title: "To Do", color: "#94a3b8" },
      { id: "progress", title: "In Progress", color: "#3b82f6" },
      { id: "review", title: "Review", color: "#f59e0b" },
      { id: "done", title: "Done", color: "#10b981" },
    ];
    this.init();
  }

  init() {
    this.render();
    this.setupForm();
  }

  render() {
    const board = document.getElementById("board");
    const tasks = this.db.getAll();

    board.innerHTML = this.columns
      .map((col) => {
        const colTasks = tasks.filter((t) => t.column === col.id);
        return `
                        <div class="column" 
                             id="${col.id}" 
                             ondragover="allowDrop(event)" 
                             ondrop="drop(event)" 
                             ondragleave="leaveDrop(event)">
                            <div class="column-header">
                                <div class="column-title">
                                    <span style="color: ${col.color}">●</span> ${col.title}
                                </div>
                                <span class="count-badge">${colTasks.length}</span>
                            </div>
                            <div class="cards-container" id="cards-${col.id}">
                                ${
                                  colTasks.length === 0
                                    ? '<div class="empty-state">Drop tasks here</div>'
                                    : colTasks
                                        .map((task) =>
                                          this.createCardHTML(task),
                                        )
                                        .join("")
                                }
                            </div>
                        </div>
                    `;
      })
      .join("");

    document.querySelectorAll(".task-card").forEach((card) => {
      card.setAttribute("draggable", "true");
      card.ondragstart = (e) => drag(e);
    });
  }

  createCardHTML(task) {
    return `
                    <div class="task-card" 
                         id="task-${task.id}" 
                         draggable="true" 
                         ondragstart="drag(event)">
                        <div class="task-title">${task.title}</div>
                        <div class="task-desc">${task.desc || ""}</div>
                        <div class="task-meta">
                            <span class="priority p-${task.priority}">${task.priority.toUpperCase()}</span>
                            <span>${task.date}</span>
                        </div>
                        <div class="task-actions">
                            <button class="action-btn" onclick="editTask(${task.id})">Edit</button>
                            <button class="action-btn delete-btn" onclick="deleteTask(${task.id})">Delete</button>
                        </div>
                    </div>
                `;
  }

  setupForm() {
    document.getElementById("taskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("taskId").value;
      const title = document.getElementById("taskTitle").value;
      const desc = document.getElementById("taskDesc").value;
      const priority = document.getElementById("taskPriority").value;
      const column = document.getElementById("taskColumn").value;

      if (id) {
        this.db.update(parseInt(id), { title, desc, priority, column });
      } else {
        this.db.add({
          title,
          desc,
          priority,
          column,
          date: new Date().toISOString().split("T")[0],
        });
      }

      closeModal();
      this.render();
    });
  }
}

let kanban;
let themeManager;
let draggedTaskId = null;

function drag(e) {
  draggedTaskId = parseInt(e.target.id.replace("task-", ""));
  e.target.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function allowDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}

function leaveDrop(e) {
  e.currentTarget.classList.remove("drag-over");
}

function drop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  const newColumn = e.currentTarget.id;
  if (draggedTaskId) {
    kanban.db.update(draggedTaskId, { column: newColumn });
    kanban.render();
  }
}

function openModal(taskId = null) {
  const modal = document.getElementById("taskModal");
  const form = document.getElementById("taskForm");
  form.reset();

  if (taskId) {
    const tasks = kanban.db.getAll();
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      document.getElementById("taskId").value = task.id;
      document.getElementById("taskTitle").value = task.title;
      document.getElementById("taskDesc").value = task.desc || "";
      document.getElementById("taskPriority").value = task.priority;
      document.getElementById("taskColumn").value = task.column;
      document.getElementById("modalTitle").innerText = "Edit Task";
    }
  } else {
    document.getElementById("taskId").value = "";
    document.getElementById("modalTitle").innerText = "Add New Task";
  }

  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("taskModal").style.display = "none";
}

function editTask(id) {
  openModal(id);
}

function deleteTask(id) {
  if (confirm("Are you sure you want to delete this task?")) {
    kanban.db.delete(id);
    kanban.render();
  }
}

document.getElementById("taskModal").addEventListener("click", (e) => {
  if (e.target.id === "taskModal") closeModal();
});

document.addEventListener("DOMContentLoaded", () => {
  themeManager = new ThemeManager();
  kanban = new KanbanBoard();
});
