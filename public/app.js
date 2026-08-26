const doneId = "done";
const openId = "horizon";
const priorities = [
  ["high", "High prio"],
  ["medium", "Medium prio"],
  ["someday", "Ooit"]
];

const defaultCategories = [
  { id: "high", label: "High prio", color: "#105bff" },
  { id: "medium", label: "Medium prio", color: "#8ccfff" },
  { id: "someday", label: "Ooit", color: "#ff403d" }
];

const state = {
  data: null,
  currentUser: null,
  currentUserId: null,
  activeView: { type: "all", id: "all" },
  search: ""
};

const els = {
  splashScreen: document.getElementById("splashScreen"),
  introVideo: document.getElementById("introVideo"),
  authShell: document.getElementById("authShell"),
  app: document.getElementById("planny-app"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  navList: document.getElementById("navList"),
  board: document.getElementById("board"),
  viewEyebrow: document.getElementById("viewEyebrow"),
  viewTitle: document.getElementById("viewTitle"),
  accountButton: document.getElementById("accountButton"),
  logoutButton: document.getElementById("logoutButton"),
  settingsButton: document.getElementById("settingsButton"),
  mobileOptionsButton: document.getElementById("mobileOptionsButton"),
  teamButton: document.getElementById("teamButton"),
  searchInput: document.getElementById("searchInput"),
  showTeamTasksToggle: document.getElementById("showTeamTasksToggle"),
  archiveButton: document.getElementById("archiveButton"),
  addTaskButton: document.getElementById("addTaskButton"),
  quickAddButton: document.getElementById("quickAddButton"),
  addProjectButton: document.getElementById("addProjectButton"),
  taskDialog: document.getElementById("taskDialog"),
  closeTaskButton: document.getElementById("closeTaskButton"),
  projectDialog: document.getElementById("projectDialog"),
  archiveDialog: document.getElementById("archiveDialog"),
  teamDialog: document.getElementById("teamDialog"),
  taskForm: document.getElementById("taskForm"),
  projectForm: document.getElementById("projectForm"),
  connectionForm: document.getElementById("connectionForm"),
  teamAccountForm: document.getElementById("teamAccountForm"),
  taskAssignees: document.getElementById("taskAssignees"),
  projectMembers: document.getElementById("projectMembers"),
  taskDialogTitle: document.getElementById("taskDialogTitle"),
  projectDialogTitle: document.getElementById("projectDialogTitle"),
  deleteTaskButton: document.getElementById("deleteTaskButton"),
  deleteProjectButton: document.getElementById("deleteProjectButton"),
  closeArchiveButton: document.getElementById("closeArchiveButton"),
  closeTeamButton: document.getElementById("closeTeamButton"),
  archiveList: document.getElementById("archiveList"),
  connectionList: document.getElementById("connectionList"),
  teamList: document.getElementById("teamList")
};

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function boot() {
  const response = await fetch("/api/session");
  if (!response.ok) throw new Error("Sessie kon niet worden geladen.");
  const payload = await response.json();
  if (!payload.user) {
    showAuth();
    startSplash();
    return;
  }
  finishSplash();
  state.currentUser = payload.user;
  state.currentUserId = payload.user.id;
  await loadState();
}

function showAuth() {
  state.data = null;
  state.currentUser = null;
  state.currentUserId = null;
  els.authShell.hidden = false;
  els.app.hidden = true;
}

function showApp() {
  els.authShell.hidden = true;
  els.app.hidden = false;
}

async function loadState() {
  const response = await fetch("/api/state");
  if (!response.ok) throw new Error("Planny kon de data niet laden.");
  state.data = normalizeState(await response.json());
  state.currentUserId = state.data.currentUserId || state.currentUser?.id;
  state.currentUser = userById(state.currentUserId) || state.currentUser;
  if (!canSeeCurrentView()) state.activeView = { type: "all", id: "all" };
  showApp();
  render();
}

async function saveState() {
  const response = await fetch("/api/state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state.data)
  });
  if (!response.ok) throw new Error("Planny kon niet bewaren.");
  state.data = normalizeState(await response.json());
  render();
}

function normalizeState(data) {
  const users = normalizeUsers(data.users);
  const userIds = new Set(users.map(user => user.id));
  return {
    ...data,
    version: data.version || 1,
    users,
    connections: (data.connections || []).map(normalizeConnection),
    userSettings: data.userSettings || {},
    currentUserId: data.currentUserId || "kelvin",
    projects: (data.projects || []).map(project => normalizeProject(project, userIds))
  };
}

function normalizeConnection(connection) {
  return {
    id: connection.id,
    requesterId: connection.requesterId,
    targetId: connection.targetId,
    status: connection.status || "pending",
    permissions: {
      canCreateProjects: Boolean(connection.permissions?.canCreateProjects),
      canCreateTasks: Boolean(connection.permissions?.canCreateTasks),
      canViewSharedProjects: connection.permissions?.canViewSharedProjects !== false,
      canViewAllTasks: Boolean(connection.permissions?.canViewAllTasks)
    },
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  };
}

function normalizeUsers(users) {
  const base = [
    { id: "kelvin", name: "Kelvin", initials: "K", email: "kelvin@planny.local" },
    { id: "wiebe", name: "Wiebe", initials: "W", email: "wiebe@planny.local" }
  ];
  const existing = Array.isArray(users) ? users : [];
  const byId = new Map([...base, ...existing].map(user => [
    user.id || slug(user.name),
    {
      id: user.id || slug(user.name),
      name: user.name || user.id || "Teamlid",
      initials: user.initials || initials(user.name || user.id),
      email: user.email || `${user.id || slug(user.name)}@planny.local`
    }
  ]));
  return [...byId.values()];
}

function normalizeProject(project, userIds) {
  const sharedByDefault = ["melo", "alzheimer"].includes(String(project.name || "").toLowerCase());
  const fallbackMembers = sharedByDefault ? ["kelvin", "wiebe"] : ["kelvin"];
  const members = unique((project.members || fallbackMembers).filter(id => userIds.has(id)));
  return {
    ...project,
    color: project.color || "sea",
    summary: project.summary || "",
    members: members.length ? members : ["kelvin"],
    timerStartedAt: project.timerStartedAt || "",
    timeEntries: (project.timeEntries || []).map(normalizeTimeEntry),
    tasks: (project.tasks || []).map(task => normalizeTask(task))
  };
}

function normalizeTimeEntry(entry) {
  return {
    id: entry.id || createId("time"),
    name: entry.name || (entry.manual ? "Handmatig toegevoegd" : "Werksessie"),
    minutes: Math.max(1, Math.round(Number(entry.minutes || 1))),
    start: entry.start || "",
    end: entry.end || "",
    manual: Boolean(entry.manual),
    createdAt: entry.createdAt || entry.end || entry.start || nowIso(),
    updatedAt: entry.updatedAt || entry.createdAt || ""
  };
}

function normalizeTask(task) {
  const ownerId = userIdFromName(task.owner);
  const assignees = unique((task.assignees || [ownerId]).filter(Boolean));
  const createdBy = task.createdBy || ownerId || assignees[0] || "kelvin";
  return {
    ...task,
    status: task.status || openId,
    workflowStatus: task.workflowStatus || (task.status === doneId ? "done" : "todo"),
    priority: task.priority === "normal" ? "medium" : task.priority === "low" ? "someday" : (task.priority || "medium"),
    owner: task.owner || userById(assignees[0])?.name || "Kelvin",
    assignees: assignees.length ? assignees : ["kelvin"],
    createdBy,
    seenBy: Array.isArray(task.seenBy) ? task.seenBy : [createdBy],
    note: task.note || "",
    deadline: task.deadline || "",
    reminderMinutes: Number.isFinite(Number(task.reminderMinutes)) ? Number(task.reminderMinutes) : 0,
    reminderEmailEnabled: Boolean(task.reminderEmailEnabled)
  };
}

function render() {
  if (!state.data) return;
  document.body.dataset.theme = pageTheme();
  renderAccount();
  renderNav();
  renderBoard();
}

function pageTheme() {
  if (state.activeView.type === "settings") return "library";
  if (state.activeView.type === "project") {
    const id = String(state.activeView.id || "");
    const index = [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % 3;
    return `project-${index}`;
  }
  return "all";
}

function renderAccount() {
  const user = userById(state.currentUserId);
  els.accountButton.textContent = user?.name || "Account";
  els.showTeamTasksToggle.checked = showTeamTasks();
}

function renderNav() {
  const items = [navButton("ALL", hasUnreadProjects(), state.activeView.type === "all", () => {
    state.activeView = { type: "all", id: "all" };
    render();
  })];

  for (const project of projectsForCurrentUser()) {
    items.push(projectNavItem(project));
  }

  els.navList.replaceChildren(...items);
}

function renderBoard() {
  const { eyebrow, title } = currentHeader();
  els.viewEyebrow.textContent = eyebrow;
  els.viewTitle.textContent = title;

  if (state.activeView.type === "settings") {
    renderSettings();
    return;
  }

  if (state.activeView.type === "project") {
    const project = projectById(state.activeView.id);
    renderProjectView(project);
    return;
  }

  renderOverview();
}

function renderOverview() {
  const projects = projectsForOverview();
  const sections = projects.map(projectOverviewCard);
  if (!sections.length) {
    els.board.className = "board empty-board";
    els.board.replaceChildren(emptyPanel("Nog niks zichtbaar", "Maak een project of vraag iemand om een project met jou te delen."));
    return;
  }
  els.board.className = "board overview-board";
  els.board.replaceChildren(...sections);
}

function renderProjectView(project) {
  if (!project) {
    els.board.className = "board empty-board";
    els.board.replaceChildren(emptyPanel("Project niet gevonden", "Kies een ander project."));
    return;
  }
  const taskGrid = document.createElement("div");
  taskGrid.className = "priority-grid";
  taskGrid.replaceChildren(...currentCategories().map(category => priorityColumn(project, category.id, category.label, category.color)));
  els.board.className = "board project-board";
  els.board.replaceChildren(taskGrid, timeSessionsPanel(project));
}

function projectOverviewCard(project) {
  const section = document.createElement("section");
  section.className = "project-card";
  const tasks = openTasks(project).filter(task => taskMatchesView(project, task));
  const unread = hasUnreadProjectTasks(project);
  section.innerHTML = `
    <button class="project-title-button" type="button" data-unread="${unread}">
      <span>${escapeHtml(project.name)}</span>
      <small>${escapeHtml(projectMembersLabel(project))}</small>
    </button>
    <div class="project-task-scroll"></div>
  `;
  section.querySelector(".project-title-button").addEventListener("click", () => {
    state.activeView = { type: "project", id: project.id };
    markProjectSeen(project.id);
    render();
  });
  const stack = section.querySelector(".project-task-scroll");
  stack.replaceChildren(...(tasks.length ? tasks.map(task => taskCard(project, task, true)) : [emptyMiniTask(project)]));
  return section;
}

function priorityColumn(project, priority, label, color) {
  const section = document.createElement("section");
  section.className = "priority-column";
  const tasks = openTasks(project).filter(task => task.priority === priority);
  section.innerHTML = `
    <div class="column-head" style="--category-color: ${escapeHtml(color)}">
      <h2>${escapeHtml(label)}</h2>
      <span>${tasks.length}</span>
      <button type="button" title="Taak toevoegen">+</button>
    </div>
    <div class="column-scroll"></div>
  `;
  section.querySelector("button").addEventListener("click", () => openTaskDialog({ projectId: project.id, priority }));
  const scroll = section.querySelector(".column-scroll");
  scroll.replaceChildren(...(tasks.length ? tasks.map(task => taskCard(project, task, false)) : [emptyMiniTask(project, priority)]));
  enableTaskDropTarget(scroll, { projectId: project.id, priority });
  return section;
}

function taskCard(project, task, compact) {
  const article = document.createElement("article");
  article.className = `task-card ${compact ? "compact" : ""}`;
  article.tabIndex = 0;
  const assignees = task.assignees.map(id => userById(id)?.name || id).join(", ");
  const deadline = task.deadline ? new Date(task.deadline).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  article.innerHTML = `
    <button class="drag-handle" type="button" draggable="true" title="Taak verplaatsen" aria-label="Taak verplaatsen"><span></span><span></span></button>
    <button class="done-button" type="button" title="Naar archief">✓</button>
    <div class="task-copy">
      <h3>${escapeHtml(task.title || "Nieuwe taak")}</h3>
      ${task.note ? `<p>${escapeHtml(task.note)}</p>` : ""}
      ${deadline ? `<small class="task-deadline">Deadline ${escapeHtml(deadline)}</small>` : ""}
    </div>
    <div class="task-footer">
      <span>${escapeHtml(assignees)}</span>
    </div>
  `;
  article.addEventListener("click", () => openTaskDialog({ projectId: project.id, taskId: task.id }));
  article.addEventListener("keydown", event => {
    if (event.key === "Enter") openTaskDialog({ projectId: project.id, taskId: task.id });
  });
  article.querySelector(".done-button").addEventListener("click", event => {
    event.stopPropagation();
    archiveTask(project.id, task.id);
  });
  const handle = article.querySelector(".drag-handle");
  handle.addEventListener("click", event => event.stopPropagation());
  handle.addEventListener("dragstart", event => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-planny-task", JSON.stringify({ projectId: project.id, taskId: task.id }));
    const preview = article.cloneNode(true);
    preview.classList.add("drag-preview");
    preview.classList.remove("is-dragging");
    preview.style.width = `${article.getBoundingClientRect().width}px`;
    document.body.append(preview);
    event.dataTransfer.setDragImage(preview, 34, 28);
    window.setTimeout(() => preview.remove(), 1000);
    article.classList.add("is-dragging");
  });
  handle.addEventListener("dragend", () => article.classList.remove("is-dragging"));
  enableTaskDropTarget(article, { projectId: project.id, taskId: task.id, priority: task.priority });
  return article;
}

function readDraggedTask(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("application/x-planny-task"));
  } catch {
    return null;
  }
}

function enableTaskDropTarget(element, target) {
  element.addEventListener("dragover", event => {
    if (!event.dataTransfer.types.includes("application/x-planny-task")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    element.classList.add("is-drop-target");
  });
  element.addEventListener("dragleave", event => {
    if (!element.contains(event.relatedTarget)) element.classList.remove("is-drop-target");
  });
  element.addEventListener("drop", event => {
    event.preventDefault();
    element.classList.remove("is-drop-target");
    const source = readDraggedTask(event);
    if (!source || source.taskId === target.taskId && source.projectId === target.projectId) return;
    const before = target.taskId && event.clientY < element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2;
    moveTask(source, { ...target, beforeTaskId: before ? target.taskId : null, afterTaskId: before ? null : target.taskId });
  });
}

function moveTask(source, target) {
  const sourceProject = projectById(source.projectId);
  const targetProject = projectById(target.projectId);
  const task = taskById(sourceProject, source.taskId);
  if (!sourceProject || !targetProject || !task) return;
  sourceProject.tasks = sourceProject.tasks || [];
  targetProject.tasks = targetProject.tasks || [];
  sourceProject.tasks = sourceProject.tasks.filter(item => item.id !== task.id);
  task.priority = target.priority || task.priority;
  const targetIndex = target.beforeTaskId
    ? targetProject.tasks.findIndex(item => item.id === target.beforeTaskId)
    : target.afterTaskId
      ? targetProject.tasks.findIndex(item => item.id === target.afterTaskId) + 1
      : targetProject.tasks.length;
  targetProject.tasks.splice(Math.max(0, targetIndex), 0, task);
  saveState().catch(showError);
}

function timeSessionsPanel(project) {
  const panel = document.createElement("section");
  panel.className = "time-panel";
  const entries = project.timeEntries || [];
  const activeMinutes = activeTimerMinutes(project);
  const totalMinutes = totalProjectMinutes(project);
  panel.innerHTML = `
    <div class="time-panel-head">
      <div>
        <p class="eyebrow">Sessies</p>
        <h2>${escapeHtml(formatMinutes(totalMinutes))}</h2>
      </div>
      ${project.timerStartedAt ? `<span class="live-pill">Loopt ${escapeHtml(formatMinutes(activeMinutes))}</span>` : ""}
    </div>
    <div class="time-entry-list"></div>
  `;
  const list = panel.querySelector(".time-entry-list");
  list.replaceChildren(...(entries.length ? entries.map(entry => timeEntryRow(project, entry)) : [emptyTimeRow()]));
  return panel;
}

function timeEntryRow(project, entry) {
  const row = document.createElement("article");
  row.className = "time-entry-row";
  row.innerHTML = `
    <button class="time-entry-name" type="button" title="Dubbelklik om naam te wijzigen">
      <strong>${escapeHtml(entry.name)}</strong>
      <small>${escapeHtml(timeEntryMeta(entry))}</small>
    </button>
    <div class="time-entry-controls">
      <button class="soft-button" type="button">${escapeHtml(formatMinutes(entry.minutes))}</button>
      <button class="danger-button" type="button">Verwijder</button>
    </div>
  `;
  row.querySelector(".time-entry-name").addEventListener("dblclick", () => renameTimeEntry(project.id, entry.id));
  row.querySelector(".time-entry-controls .soft-button").addEventListener("click", () => editTimeEntryMinutes(project.id, entry.id));
  row.querySelector(".danger-button").addEventListener("click", () => deleteTimeEntry(project.id, entry.id));
  return row;
}

function emptyTimeRow() {
  const row = document.createElement("div");
  row.className = "empty-time-row";
  row.textContent = "Nog geen sessies.";
  return row;
}

function emptyMiniTask(project, priority = "medium") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "empty-mini-task";
  button.textContent = "+ taak";
  button.addEventListener("click", () => openTaskDialog({ projectId: project.id, priority }));
  return button;
}

function emptyPanel(title, text) {
  const panel = document.createElement("section");
  panel.className = "empty-panel";
  panel.innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p>`;
  return panel;
}

function openTaskDialog({ projectId = null, priority = "medium", taskId = null, assignees = null } = {}) {
  els.taskForm.reset();
  const fallbackProject = projectId ? projectById(projectId) : projectsForCurrentUser()[0];
  if (!fallbackProject) return;
  const task = taskId ? taskById(fallbackProject, taskId) : null;
  els.taskForm.dataset.projectId = fallbackProject.id;
  els.taskForm.dataset.taskId = task?.id || "";
  els.taskDialogTitle.textContent = task ? "Taak bewerken" : "Nieuwe taak";
  els.deleteTaskButton.hidden = !task;
  syncProjectOptions(fallbackProject.id);
  els.taskForm.elements.projectId.value = fallbackProject.id;
  syncPriorityOptions(task?.priority || priority);
  const selectedPriority = task?.priority || priority;
  els.taskForm.elements.priority.value = currentCategories().some(category => category.id === selectedPriority) ? selectedPriority : currentCategories()[0].id;
  els.taskForm.elements.title.value = task?.title || "";
  els.taskForm.elements.note.value = task?.note || "";
  els.taskForm.elements.deadline.value = task?.deadline || "";
  els.taskForm.elements.reminderMinutes.value = String(task?.reminderMinutes || 0);
  els.taskForm.elements.reminderEmailEnabled.checked = Boolean(task?.reminderEmailEnabled);
  renderTaskAssignees(fallbackProject, task?.assignees || assignees || defaultAssignees(fallbackProject));
  els.taskDialog.showModal();
  els.taskForm.elements.title.focus();
}

function openProjectDialog(projectId = null) {
  els.projectForm.reset();
  const project = projectId ? projectById(projectId) : null;
  els.projectForm.dataset.projectId = project?.id || "";
  els.projectDialogTitle.textContent = project ? "Project bewerken" : "Nieuw project";
  els.deleteProjectButton.hidden = !project;
  els.projectForm.elements.name.value = project?.name || "";
  els.projectForm.elements.summary.value = project?.summary || "";
  renderProjectMembers(project?.members || [state.currentUserId]);
  els.projectDialog.showModal();
}

function syncProjectOptions(selectedId) {
  els.taskForm.elements.projectId.replaceChildren(...projectsForCurrentUser().map(project => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    option.selected = project.id === selectedId;
    return option;
  }));
}

function syncPriorityOptions(selectedId) {
  els.taskForm.elements.priority.replaceChildren(...currentCategories().map(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    option.selected = category.id === selectedId;
    return option;
  }));
}

function currentCategories() {
  const configured = state.data?.userSettings?.[state.currentUserId]?.categories;
  if (!Array.isArray(configured) || !configured.length) return defaultCategories;
  return configured.slice(0, 5).map((category, index) => ({
    id: category.id || `category-${index + 1}`,
    label: String(category.label || `Categorie ${index + 1}`).trim(),
    color: category.color || defaultCategories[index % defaultCategories.length].color
  }));
}

function showTeamTasks() {
  return Boolean(state.data?.userSettings?.[state.currentUserId]?.showTeamTasks);
}

function renderSettings() {
  const categories = currentCategories();
  const panel = document.createElement("section");
  panel.className = "settings-screen";
  panel.innerHTML = `
    <form class="settings-card" id="settingsForm">
      <div class="settings-intro">
        <p class="eyebrow">Persoonlijk</p>
        <h2>Instellingen</h2>
        <p>Pas jouw planningscategorieën aan. Dit verandert alleen jouw dashboard.</p>
      </div>
      <label class="settings-count">
        <span>Aantal categorieën</span>
        <input name="categoryCount" type="number" min="1" max="5" value="${categories.length}" />
      </label>
      <div class="settings-category-list">
        ${categories.map((category, index) => `
          <div class="settings-category" data-category-row="${index}">
            <span class="settings-index">${index + 1}</span>
            <label><span>Naam</span><input name="categoryLabel-${index}" value="${escapeHtml(category.label)}" maxlength="32" /></label>
            <label class="color-field"><span>Kleur</span><input name="categoryColor-${index}" type="color" value="${escapeHtml(category.color)}" /></label>
          </div>
        `).join("")}
      </div>
      <div class="settings-actions">
        <span class="dialog-spacer"></span>
        <button class="primary-button" id="saveSettingsButton" type="button">Bewaar instellingen</button>
      </div>
    </form>
  `;
  const form = panel.querySelector("form");
  form.querySelector("[name=categoryCount]").addEventListener("change", () => {
    const count = Math.max(1, Math.min(5, Number(form.elements.categoryCount.value || 3)));
    form.elements.categoryCount.value = count;
    renderSettingsRows(form, count, categories);
  });
  const saveSettings = () => {
    const formData = new FormData(form);
    const count = Math.max(1, Math.min(5, Number(formData.get("categoryCount") || 3)));
    const next = Array.from({ length: count }, (_, index) => ({
      id: categories[index]?.id || `category-${index + 1}`,
      label: String(formData.get(`categoryLabel-${index}`) || `Categorie ${index + 1}`).trim(),
      color: String(formData.get(`categoryColor-${index}`) || defaultCategories[index % defaultCategories.length].color)
    }));
    state.data.userSettings = { ...(state.data.userSettings || {}), [state.currentUserId]: { categories: next } };
    saveState().catch(showError);
  };
  form.addEventListener("submit", event => {
    event.preventDefault();
    saveSettings();
  });
  form.querySelector("#saveSettingsButton").addEventListener("click", saveSettings);
  els.board.className = "board settings-board";
  els.board.replaceChildren(panel);
}

function renderSettingsRows(form, count, categories) {
  const list = form.querySelector(".settings-category-list");
  list.replaceChildren(...Array.from({ length: count }, (_, index) => {
    const category = categories[index] || defaultCategories[index % defaultCategories.length];
    const row = document.createElement("div");
    row.className = "settings-category";
    row.innerHTML = `
      <span class="settings-index">${index + 1}</span>
      <label><span>Naam</span><input name="categoryLabel-${index}" value="${escapeHtml(category.label)}" maxlength="32" /></label>
      <label class="color-field"><span>Kleur</span><input name="categoryColor-${index}" type="color" value="${escapeHtml(category.color)}" /></label>
    `;
    return row;
  }));
}

function renderTaskAssignees(project, selected) {
  const selectedSet = new Set(selected);
  const options = usersAllowedForProject(project, "canCreateTasks", selected);
  els.taskAssignees.replaceChildren(...options.map(userId => {
    const user = userById(userId);
    return checkboxPill("assignees", userId, user?.name || userId, selectedSet.has(userId));
  }));
}

function renderProjectMembers(selected) {
  const selectedSet = new Set(selected);
  const options = usersAllowedForProject(null, "canCreateProjects", selected);
  els.projectMembers.replaceChildren(...options.map(userId => {
    const user = userById(userId);
    return checkboxPill("members", user.id, user.name, selectedSet.has(user.id));
  }
  ));
}

function checkboxPill(name, value, label, checked) {
  const wrapper = document.createElement("label");
  wrapper.className = "check-pill";
  wrapper.innerHTML = `
    <input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${checked ? "checked" : ""} />
    <span>${escapeHtml(label)}</span>
  `;
  return wrapper;
}

function archiveTask(projectId, taskId) {
  const project = projectById(projectId);
  const task = taskById(project, taskId);
  task.status = doneId;
  task.workflowStatus = "done";
  task.updatedAt = nowIso();
  saveState().catch(showError);
}

function restoreTask(projectId, taskId) {
  const project = projectById(projectId);
  const task = taskById(project, taskId);
  task.status = openId;
  if (task.workflowStatus === "done") task.workflowStatus = "todo";
  task.updatedAt = nowIso();
  saveState().then(renderArchive).catch(showError);
}

function deleteTask(projectId, taskId) {
  const project = projectById(projectId);
  project.tasks = project.tasks.filter(task => task.id !== taskId);
  saveState().catch(showError);
}

function toggleTimer(projectId) {
  const project = projectById(projectId);
  if (project.timerStartedAt) {
    const minutes = Math.max(1, Math.round((Date.now() - new Date(project.timerStartedAt).getTime()) / 60000));
    project.timeEntries = project.timeEntries || [];
    project.timeEntries.unshift({
      id: createId("time"),
      name: "Werksessie",
      start: project.timerStartedAt,
      end: nowIso(),
      minutes,
      manual: false,
      createdAt: nowIso()
    });
    delete project.timerStartedAt;
  } else {
    project.timerStartedAt = nowIso();
  }
  project.updatedAt = nowIso();
  saveState().catch(showError);
}

function addManualTime(projectId) {
  const project = projectById(projectId);
  const input = prompt(`Hoeveel minuten toevoegen aan ${project.name}?`);
  if (!input) return;
  const minutes = Number(input.replace(",", "."));
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  project.timeEntries = project.timeEntries || [];
  project.timeEntries.unshift({
    id: createId("time"),
    name: "Handmatig toegevoegd",
    minutes: Math.round(minutes),
    manual: true,
    createdAt: nowIso()
  });
  project.updatedAt = nowIso();
  saveState().catch(showError);
}

function renameTimeEntry(projectId, entryId) {
  const entry = timeEntryById(projectById(projectId), entryId);
  const name = prompt("Naam van deze sessie", entry?.name || "Werksessie");
  if (!entry || name === null) return;
  const clean = name.trim();
  if (!clean) return;
  entry.name = clean;
  entry.updatedAt = nowIso();
  saveState().catch(showError);
}

function editTimeEntryMinutes(projectId, entryId) {
  const entry = timeEntryById(projectById(projectId), entryId);
  const input = prompt("Lengte in minuten", String(entry?.minutes || ""));
  if (!entry || input === null) return;
  const minutes = Number(input.replace(",", "."));
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  entry.minutes = Math.round(minutes);
  entry.updatedAt = nowIso();
  saveState().catch(showError);
}

function deleteTimeEntry(projectId, entryId) {
  const project = projectById(projectId);
  if (!project || !confirm("Sessie verwijderen?")) return;
  project.timeEntries = (project.timeEntries || []).filter(entry => entry.id !== entryId);
  project.updatedAt = nowIso();
  saveState().catch(showError);
}

function renderArchive() {
  const rows = [];
  for (const project of projectsForCurrentUser()) {
    for (const task of openTasks(project, true)) {
      if (task.status !== doneId) continue;
      const row = document.createElement("div");
      row.className = "archive-row";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <small>${escapeHtml(project.name)} · ${escapeHtml(task.assignees.map(id => userById(id)?.name || id).join(", "))}</small>
        </div>
        <button class="soft-button" type="button">Terug</button>
      `;
      row.querySelector("button").addEventListener("click", () => restoreTask(project.id, task.id));
      rows.push(row);
    }
  }
  els.archiveList.replaceChildren(...(rows.length ? rows : [emptyPanel("Archief is leeg", "Nog geen afgevinkte taken.")]));
}

function renderTeam() {
  renderConnections();
  const rows = state.data.users.map(user => {
    const sharedProjects = state.data.projects.filter(project => project.members.includes(user.id));
    const row = document.createElement("div");
    row.className = "archive-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <small>${escapeHtml(user.email || user.id)} · ${sharedProjects.length} gedeelde projecten</small>
      </div>
      <span class="team-initials">${escapeHtml(user.initials || initials(user.name))}</span>
    `;
    return row;
  });
  els.teamList.replaceChildren(...rows);
}

function renderConnections() {
  const rows = (state.data.connections || []).map(connection => {
    const otherId = connection.requesterId === state.currentUserId ? connection.targetId : connection.requesterId;
    const other = userById(otherId);
    const incoming = connection.targetId === state.currentUserId && connection.status === "pending";
    const outgoing = connection.requesterId === state.currentUserId && connection.status === "pending";
    const row = document.createElement("div");
    row.className = "connection-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(other?.name || otherId)}</strong>
        <small>${escapeHtml(connectionStatusLabel(connection, incoming, outgoing))}</small>
        <p>${escapeHtml(permissionLabel(connection.permissions))}</p>
      </div>
      <div class="connection-actions"></div>
    `;
    const actions = row.querySelector(".connection-actions");
    if (incoming) {
      const accept = document.createElement("button");
      accept.className = "primary-button";
      accept.type = "button";
      accept.textContent = "Accepteer";
      accept.addEventListener("click", () => respondConnection(connection.id, "accept"));
      const decline = document.createElement("button");
      decline.className = "soft-button";
      decline.type = "button";
      decline.textContent = "Weiger";
      decline.addEventListener("click", () => respondConnection(connection.id, "decline"));
      actions.append(accept, decline);
    }
    return row;
  });
  els.connectionList.replaceChildren(...(rows.length ? rows : [emptyPanel("Geen connecties", "Zoek iemand op e-mail en stuur een request met rechten.")]));
}

function connectionStatusLabel(connection, incoming, outgoing) {
  if (connection.status === "accepted") return "Verbonden";
  if (connection.status === "declined") return "Geweigerd";
  if (incoming) return "Wil met jou verbinden";
  if (outgoing) return "Wacht op toestemming";
  return "Open request";
}

function permissionLabel(permissions) {
  const labels = [];
  if (permissions?.canViewSharedProjects) labels.push("gedeelde projecten zien");
  if (permissions?.canCreateTasks) labels.push("taken maken");
  if (permissions?.canCreateProjects) labels.push("projecten maken");
  if (permissions?.canViewAllTasks) labels.push("alle taken zien");
  return labels.length ? labels.join(" · ") : "geen extra rechten";
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Er ging iets mis.");
  return body;
}

function useAuthPayload(payload) {
  state.currentUser = payload.user;
  state.currentUserId = payload.user.id;
  if (payload.state) {
    state.data = normalizeState(payload.state);
    showApp();
    render();
  }
}

async function respondConnection(connectionId, action) {
  const payload = await postJson("/api/connections/respond", { connectionId, action });
  state.data = normalizeState(payload);
  renderTeam();
  render();
}

els.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(els.loginForm);
  try {
    useAuthPayload(await postJson("/api/login", {
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || "")
    }));
    await loadState();
  } catch (error) {
    showError(error);
  }
});

els.signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(els.signupForm);
  try {
    useAuthPayload(await postJson("/api/accounts", {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
      login: true
    }));
    await loadState();
  } catch (error) {
    showError(error);
  }
});

els.connectionForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(els.connectionForm);
  try {
    const payload = await postJson("/api/connections", {
      targetEmail: String(form.get("targetEmail") || "").trim(),
      permissions: {
        canViewSharedProjects: Boolean(form.get("canViewSharedProjects")),
        canCreateTasks: Boolean(form.get("canCreateTasks")),
        canCreateProjects: Boolean(form.get("canCreateProjects")),
        canViewAllTasks: Boolean(form.get("canViewAllTasks"))
      }
    });
    state.data = normalizeState(payload);
    els.connectionForm.reset();
    els.connectionForm.elements.canViewSharedProjects.checked = true;
    els.connectionForm.elements.canCreateTasks.checked = true;
    renderTeam();
    render();
  } catch (error) {
    showError(error);
  }
});

els.taskForm.elements.projectId.addEventListener("change", event => {
  const project = projectById(event.target.value);
  renderTaskAssignees(project, defaultAssignees(project));
});

els.taskForm.addEventListener("submit", event => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.taskDialog.close();
    return;
  }
  const form = new FormData(els.taskForm);
  const project = projectById(String(form.get("projectId")));
  const taskId = els.taskForm.dataset.taskId;
  const selectedAssignees = form.getAll("assignees").map(String);
  const assignees = selectedAssignees.length ? selectedAssignees : [state.currentUserId];
  const payload = {
    title: String(form.get("title")).trim(),
    note: String(form.get("note") || "").trim(),
    priority: String(form.get("priority") || "medium"),
    deadline: String(form.get("deadline") || ""),
    reminderMinutes: Number(form.get("reminderMinutes") || 0),
    reminderEmailEnabled: Boolean(form.get("reminderEmailEnabled")),
    assignees,
    owner: assignees.map(id => userById(id)?.name || id).join(", "),
    status: openId,
    updatedAt: nowIso()
  };

  if (taskId) {
    Object.assign(taskById(project, taskId), payload);
  } else {
    project.tasks = project.tasks || [];
    project.tasks.unshift({
      id: createId("task"),
      ...payload,
      createdBy: state.currentUserId,
      seenBy: [state.currentUserId],
      createdAt: nowIso()
    });
  }
  els.taskDialog.close();
  saveState().catch(showError);
});

els.projectForm.addEventListener("submit", event => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.projectDialog.close();
    return;
  }
  const form = new FormData(els.projectForm);
  const projectId = els.projectForm.dataset.projectId;
  const selectedMembers = form.getAll("members").map(String);
  const members = selectedMembers.length ? selectedMembers : [state.currentUserId];
  const payload = {
    name: String(form.get("name")).trim(),
    summary: String(form.get("summary") || "").trim(),
    members,
    updatedAt: nowIso()
  };

  if (projectId) {
    Object.assign(projectById(projectId), payload);
  } else {
    const project = {
      id: createId("project"),
      color: "sea",
      ...payload,
      createdAt: nowIso(),
      tasks: [],
      timeEntries: []
    };
    state.data.projects.unshift(project);
    state.activeView = { type: "project", id: project.id };
  }
  els.projectDialog.close();
  saveState().catch(showError);
});

els.deleteTaskButton.addEventListener("click", () => {
  const projectId = els.taskForm.elements.projectId.value;
  const taskId = els.taskForm.dataset.taskId;
  if (!taskId || !confirm("Taak verwijderen?")) return;
  els.taskDialog.close();
  deleteTask(projectId, taskId);
});

document.getElementById("taskCancelButton")?.addEventListener("click", () => {
  els.taskDialog.close();
});

els.closeTaskButton?.addEventListener("click", () => els.taskDialog.close());

els.deleteProjectButton.addEventListener("click", () => {
  const projectId = els.projectForm.dataset.projectId;
  if (!projectId || !confirm("Project verwijderen?")) return;
  state.data.projects = state.data.projects.filter(project => project.id !== projectId);
  state.activeView = { type: "all", id: "all" };
  els.projectDialog.close();
  saveState().catch(showError);
});

els.addTaskButton.addEventListener("click", () => openTaskDialog(taskDefaultsFromView()));
els.mobileOptionsButton?.addEventListener("click", () => {
  const expanded = els.mobileOptionsButton.getAttribute("aria-expanded") === "true";
  els.mobileOptionsButton.setAttribute("aria-expanded", String(!expanded));
  document.querySelector(".top-actions")?.classList.toggle("is-expanded", !expanded);
});
els.quickAddButton.addEventListener("click", () => openTaskDialog(taskDefaultsFromView()));
els.addProjectButton.addEventListener("click", () => openProjectDialog());
els.settingsButton.addEventListener("click", () => {
  state.activeView = { type: "settings", id: "settings" };
  render();
});
els.teamButton.addEventListener("click", () => {
  renderTeam();
  els.teamDialog.showModal();
});
els.accountButton.addEventListener("click", () => {
  renderTeam();
  els.teamDialog.showModal();
});
els.logoutButton.addEventListener("click", async () => {
  await postJson("/api/logout", {}).catch(() => null);
  state.activeView = { type: "all", id: "all" };
  showAuth();
});
els.showTeamTasksToggle.addEventListener("change", event => {
  const current = state.data.userSettings?.[state.currentUserId] || {};
  state.data.userSettings = {
    ...(state.data.userSettings || {}),
    [state.currentUserId]: { ...current, showTeamTasks: event.target.checked }
  };
  saveState().catch(showError);
});
els.archiveButton.addEventListener("click", () => {
  renderArchive();
  els.archiveDialog.showModal();
});
els.closeArchiveButton.addEventListener("click", () => els.archiveDialog.close());
els.closeTeamButton.addEventListener("click", () => els.teamDialog.close());
els.teamAccountForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(els.teamAccountForm);
  try {
    const payload = await postJson("/api/accounts", {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
      login: false
    });
    state.data = normalizeState(payload.state);
    els.teamAccountForm.reset();
    renderTeam();
    render();
  } catch (error) {
    showError(error);
  }
});
els.searchInput.addEventListener("input", event => {
  state.search = event.target.value;
  renderBoard();
});

function currentHeader() {
  if (state.activeView.type === "settings") {
    return { eyebrow: "Persoonlijk", title: "Instellingen" };
  }
  if (state.activeView.type === "project") {
    const project = projectById(state.activeView.id);
    return { eyebrow: projectMembersLabel(project), title: project?.name || "Project" };
  }
  const user = userById(state.currentUserId);
  return { eyebrow: "Jouw dashboard", title: user?.name || "All" };
}

function taskDefaultsFromView() {
  if (state.activeView.type === "project") return { projectId: state.activeView.id };
  return {};
}

function defaultAssignees(project) {
  if (project.members.includes(state.currentUserId)) return [state.currentUserId];
  return [project.members[0]];
}

function projectsForOverview() {
  return projectsForCurrentUser();
}

function projectsForCurrentUser() {
  return state.data.projects.filter(project => project.members.includes(state.currentUserId));
}

function usersAllowedForProject(project, permission, selected = []) {
  const ids = new Set([state.currentUserId, ...(selected || [])]);
  if (project) {
    for (const memberId of project.members || []) {
      if (memberId === state.currentUserId || hasAcceptedPermission(memberId, permission)) ids.add(memberId);
    }
  }
  for (const connection of state.data.connections || []) {
    if (connection.status !== "accepted") continue;
    const otherId = connection.requesterId === state.currentUserId ? connection.targetId : connection.requesterId;
    if (hasAcceptedPermission(otherId, permission)) ids.add(otherId);
  }
  return [...ids].filter(id => userById(id));
}

function hasAcceptedPermission(otherId, permission) {
  if (otherId === state.currentUserId) return true;
  const connection = connectionWith(otherId);
  return Boolean(connection && connection.status === "accepted" && connection.permissions?.[permission]);
}

function connectionWith(otherId) {
  return (state.data.connections || []).find(connection =>
    (connection.requesterId === state.currentUserId && connection.targetId === otherId) ||
    (connection.targetId === state.currentUserId && connection.requesterId === otherId)
  );
}

function hasUnreadProjects() {
  return projectsForCurrentUser().some(project => hasUnreadProjectTasks(project));
}

function hasUnreadProjectTasks(project) {
  return (project.tasks || []).some(task =>
    task.status !== doneId &&
    task.createdBy &&
    task.createdBy !== state.currentUserId &&
    !(task.seenBy || []).includes(state.currentUserId)
  );
}

function markProjectSeen(projectId) {
  const project = projectById(projectId);
  if (!project) return;
  let changed = false;
  for (const task of project.tasks || []) {
    if (task.createdBy === state.currentUserId || task.status === doneId) continue;
    task.seenBy = Array.isArray(task.seenBy) ? task.seenBy : [];
    if (!task.seenBy.includes(state.currentUserId)) {
      task.seenBy.push(state.currentUserId);
      changed = true;
    }
  }
  if (changed) saveState().catch(showError);
}

function visibleTasks({ userId = null, includeDone = false } = {}) {
  return projectsForCurrentUser().flatMap(project =>
    (project.tasks || [])
      .filter(task => includeDone || task.status !== doneId)
      .filter(task => !userId || task.assignees.includes(userId))
      .map(task => ({ project, task }))
  );
}

function taskMatchesView(project, task) {
  if (task.status === doneId) return false;
  const query = state.search.trim().toLowerCase();
  if (!query) return true;
  const users = task.assignees.map(id => userById(id)?.name || id).join(" ");
  return `${project.name} ${task.title} ${task.note || ""} ${users}`.toLowerCase().includes(query);
}

function openTasks(project, includeDone = false) {
  return (project.tasks || [])
    .filter(task => includeDone || task.status !== doneId)
    .filter(task => showTeamTasks() || task.assignees.includes(state.currentUserId));
}

function canSeeCurrentView() {
  if (state.activeView.type !== "project") return true;
  return projectById(state.activeView.id)?.members.includes(state.currentUserId);
}

function projectById(id) {
  return state.data.projects.find(project => project.id === id);
}

function taskById(project, taskId) {
  return project?.tasks?.find(task => task.id === taskId);
}

function userById(id) {
  return state.data?.users?.find(user => user.id === id);
}

function userIdFromName(name) {
  const clean = String(name || "").toLowerCase();
  if (clean.includes("wiebe")) return "wiebe";
  if (clean.includes("kelvin")) return "kelvin";
  return slug(name || "kelvin");
}

function navButton(label, unread, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-button";
  button.dataset.active = String(active);
  button.dataset.unread = String(Boolean(unread));
  button.innerHTML = `<span>${escapeHtml(label)}</span>`;
  button.addEventListener("click", onClick);
  return button;
}

function projectNavItem(project) {
  const item = document.createElement("div");
  item.className = "nav-project-item";
  const active = state.activeView.type === "project" && state.activeView.id === project.id;
  const projectButton = navButton(projectInitials(project), hasUnreadProjectTasks(project), active, () => {
    state.activeView = { type: "project", id: project.id };
    markProjectSeen(project.id);
    render();
  });
  projectButton.title = project.name;
  const timerButton = document.createElement("button");
  timerButton.className = "rail-mini-button";
  timerButton.type = "button";
  timerButton.title = project.timerStartedAt ? "Stop timer" : "Start timer";
  timerButton.textContent = project.timerStartedAt ? "■" : "▶";
  timerButton.addEventListener("click", () => toggleTimer(project.id));

  const addButton = document.createElement("button");
  addButton.className = "rail-mini-button";
  addButton.type = "button";
  addButton.title = "Tijd achteraf toevoegen";
  addButton.textContent = "+";
  addButton.addEventListener("click", () => addManualTime(project.id));

  const controls = document.createElement("div");
  controls.className = "rail-timer-actions";
  controls.append(timerButton, addButton);
  item.append(projectButton, controls);
  enableTaskDropTarget(item, { projectId: project.id });
  return item;
}

function projectInitials(project) {
  const name = String(project.name || "").trim();
  if (name.length <= 5) return name;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words.map(word => word[0]).join("").slice(0, 5);
    if (initials.length > 1) return initials.toUpperCase();
  }
  return name.slice(0, 5).toUpperCase();
}

function projectMembersLabel(project) {
  return (project?.members || []).map(id => userById(id)?.name || id).join(" + ");
}

function timeEntryById(project, entryId) {
  return project?.timeEntries?.find(entry => entry.id === entryId);
}

function activeTimerMinutes(project) {
  if (!project?.timerStartedAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(project.timerStartedAt).getTime()) / 60000));
}

function totalProjectMinutes(project) {
  const entries = project.timeEntries || [];
  return entries.reduce((sum, entry) => sum + Number(entry.minutes || 0), 0) + activeTimerMinutes(project);
}

function timeEntryMeta(entry) {
  const date = entry.end || entry.createdAt || entry.start;
  const label = date ? new Date(date).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" }) : "geen datum";
  return `${label} · ${entry.manual ? "handmatig" : "getimed"}`;
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}u ${rest}m` : `${hours}u`;
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "user";
}

function initials(value) {
  return String(value || "T")
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function unique(values) {
  return [...new Set(values)];
}

function finishSplash() {
  if (!els.splashScreen || els.splashScreen.dataset.finished) return;
  els.splashScreen.dataset.finished = "true";
  els.splashScreen.classList.add("is-hidden");
  window.setTimeout(() => els.splashScreen.remove(), 650);
}

function startSplash() {
  if (!els.introVideo || !els.splashScreen) return;
  els.introVideo.addEventListener("ended", finishSplash, { once: true });
  els.introVideo.addEventListener("error", finishSplash, { once: true });
  window.setTimeout(finishSplash, 5000);
  els.introVideo.play().catch(() => finishSplash());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(error) {
  console.error(error);
  alert(error.message || "Er ging iets mis.");
}

boot().catch(showError);
