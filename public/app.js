const KEY = "myLifeQuest.netlify.v1";
const $ = id => document.getElementById(id);
const todayKey = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

// Firebase cloud sync config
const firebaseConfig = {
  apiKey: "AIzaSyCmdi5wzkTMS6uxRrnqnIIifh3qzVUI_oQ",
  authDomain: "my-life-quest-1472b.firebaseapp.com",
  projectId: "my-life-quest-1472b",
  storageBucket: "my-life-quest-1472b.firebasestorage.app",
  messagingSenderId: "113429228531",
  appId: "1:113429228531:web:29c5866f683427fa2d0086"
};

let firebaseReady = false;
let currentUser = null;
let cloudUnsubscribe = null;
let isApplyingCloudData = false;
let cloudSaveTimer = null;
let auth = null;
let provider = null;
let firestore = null;
let docRef = null;

async function initFirebaseCloudSync() {
  if (!window.firebaseModules) {
    window.addEventListener("firebase-modules-ready", initFirebaseCloudSync, { once: true });
    console.warn("Firebase modules not loaded yet.");
    return;
  }

  const {
    initializeApp,
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    getFirestore,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    serverTimestamp
  } = window.firebaseModules;

  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  provider = new GoogleAuthProvider();
  firestore = getFirestore(firebaseApp);
  firebaseReady = true;

  window.signInToQuest = async function () {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      modal("Login Error", `<p>${escapeHtml(error.message)}</p><button onclick="closeModal()">Close</button>`);
    }
  };

  window.signOutOfQuest = async function () {
    try {
      await signOut(auth);
    } catch (error) {
      modal("Sign Out Error", `<p>${escapeHtml(error.message)}</p><button onclick="closeModal()">Close</button>`);
    }
  };

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (cloudUnsubscribe) {
      cloudUnsubscribe();
      cloudUnsubscribe = null;
    }

    if (!user) {
      render();
      return;
    }

    docRef = doc(firestore, "users", user.uid, "appData", "main");
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const cloud = snap.data();
      if (cloud && cloud.db) {
        isApplyingCloudData = true;
        db = cloud.db;
        localStorage.setItem(KEY, JSON.stringify(db));
        isApplyingCloudData = false;
      }
    } else {
      await setDoc(docRef, {
        db,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    cloudUnsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (!data || !data.db) return;

      isApplyingCloudData = true;
      db = data.db;
      localStorage.setItem(KEY, JSON.stringify(db));
      isApplyingCloudData = false;
      render();
    });

    render();
  });
}

async function saveToCloudNow() {
  if (!currentUser || !docRef || isApplyingCloudData || !window.firebaseModules) return;
  const { setDoc, serverTimestamp } = window.firebaseModules;
  await setDoc(docRef, {
    db,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function queueCloudSave() {
  if (!currentUser || isApplyingCloudData) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    saveToCloudNow().catch(err => console.error("Cloud save failed:", err));
  }, 600);
}

function userStatusHtml() {
  if (!firebaseReady) {
    return `<span class="muted">Cloud sync loading...</span>`;
  }
  if (!currentUser) {
    return `<button class="secondary small" onclick="signInToQuest()">Sign in with Google</button><span class="muted"> Local-only until signed in.</span>`;
  }
  const name = currentUser.displayName || currentUser.email || "Signed in";
  return `<span class="pill">☁️ Cloud sync on</span><span class="muted">${escapeHtml(name)}</span> <button class="secondary small" onclick="signOutOfQuest()">Sign out</button>`;
}


let activeTab = "today";
let pomodoro = { seconds: 25 * 60, running: false, timer: null };

let db = JSON.parse(localStorage.getItem(KEY) || "null") || {
  settings: {
    dailyGoal: 50,
    vision: "I am building a calm, ordered, healthy life one small quest at a time.",
    streak: 0,
    lastActive: ""
  },
  tasks: [],
  routines: [],
  projects: [],
  goals: [],
  rewards: [
    { id: uid(), title: "Coffee treat", threshold: 100 },
    { id: uid(), title: "New book", threshold: 300 },
    { id: uid(), title: "Relaxing day trip", threshold: 800 }
  ],
  logs: {}
};

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
  queueCloudSave();
  render();
}
function log(day = todayKey()) {
  if (!db.logs[day]) db.logs[day] = { points: 0, completedTasks: [], completedRoutines: [], mood: 3, energy: 3, reflections: [] };
  return db.logs[day];
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}
function pointsFor(diff) { return diff === "Hard" ? 20 : diff === "Medium" ? 10 : 5; }
function percent(items, doneFn) { return items.length ? Math.round(items.filter(doneFn).length / items.length * 100) : 0; }
function totalPoints() { return Object.values(db.logs).reduce((s, day) => s + (day.points || 0), 0); }
function projectProgress(p) {
  const linked = db.tasks.filter(t => t.projectId === p.id);
  return linked.length ? Math.round(linked.reduce((s, t) => s + (t.percent || 0), 0) / linked.length) : 0;
}
function goalProgress(g) {
  const linked = db.tasks.filter(t => t.goalId === g.id);
  return linked.length ? Math.round(linked.reduce((s, t) => s + (t.percent || 0), 0) / linked.length) : 0;
}
function toast(msg) {
  $("toast").textContent = msg;
  $("toast").style.display = "block";
  setTimeout(() => $("toast").style.display = "none", 2600);
}
function modal(title, html) {
  const m = $("modal");
  m.innerHTML = `<div class="modalHead">${title}</div><div class="modalBody">${html}</div>`;
  m.showModal();
}
function closeModal() { $("modal").close(); }

async function callAgent(agent, payload) {
  const today = log();
  today.aiUses = today.aiUses || 0;
  if (today.aiUses >= 12) {
    throw new Error("Daily AI limit reached. This protects your credits. You can raise the limit in app.js later.");
  }
  const response = await fetch("/.netlify/functions/ai-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent, ...payload, globalVision: db.settings.vision })
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "AI failed");
  today.aiUses += 1;
  localStorage.setItem(KEY, JSON.stringify(db));
  return data.result;
}
async function withAI(buttonId, fn) {
  const btn = buttonId ? $(buttonId) : null;
  const old = btn ? btn.textContent : "";
  try {
    if (btn) { btn.disabled = true; btn.textContent = "Thinking..."; }
    await fn();
  } catch (err) {
    modal("AI Agent Error", `<p>${escapeHtml(err.message)}</p><p class="muted">Make sure your Netlify Environment Variable is named GEMINI_API_KEY, then redeploy.</p><button onclick="closeModal()">Close</button>`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = old; }
  }
}

function voiceTo(id) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return toast("Voice input is not available in this browser.");
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.onresult = e => {
    const txt = e.results[0][0].transcript;
    $(id).value = ($(id).value ? $(id).value + " " : "") + txt;
  };
  rec.start();
}

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(activeTab).classList.add("active");
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render();
  });
});
$("fab").onclick = () => quickAdd();
$("visionBtn").onclick = () => editVision();

function quickAdd() {
  if (activeTab === "routines") formRoutine();
  else if (activeTab === "projects") formProject();
  else if (activeTab === "goals") formGoal();
  else if (activeTab === "rewards") formReward();
  else formTask();
}

function editVision() {
  modal("Vision & Daily Goal", `
    <label>Global long-term vision</label>
    <textarea id="vText">${escapeHtml(db.settings.vision)}</textarea>
    <button class="small secondary" onclick="voiceTo('vText')">🎙 Voice</button>
    <label>Daily points goal</label>
    <input id="vGoal" type="number" value="${db.settings.dailyGoal}">
    <br><br>
    <button onclick="db.settings.vision=$('vText').value; db.settings.dailyGoal=Number($('vGoal').value||50); closeModal(); save();">Save</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}

function formTask(t = {}) {
  modal(t.id ? "Edit Task" : "Add Task", `
    <label>Title</label><input id="fTitle" value="${escapeHtml(t.title || "")}">
    <button class="small secondary" onclick="voiceTo('fTitle')">🎙 Voice</button>
    <label>Notes</label><textarea id="fNotes">${escapeHtml(t.notes || "")}</textarea>
    <div class="grid">
      <div><label>Due date/time</label><input id="fDue" type="datetime-local" value="${t.due || ""}"></div>
      <div><label>Difficulty</label><select id="fDiff">${["Easy", "Medium", "Hard"].map(x => `<option ${t.difficulty === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
    </div>
    <label>Subtasks, one per line</label><textarea id="fSubs">${(t.subtasks || []).map(s => escapeHtml(s.title || s)).join("\n")}</textarea>
    <div class="row"><button id="taskBreakBtn" class="secondary" onclick="aiBreakTask()">AI Break Into Steps</button></div>
    <div class="grid">
      <div><label>Project</label><select id="fProject"><option value="">None</option>${db.projects.map(p => `<option value="${p.id}" ${t.projectId === p.id ? "selected" : ""}>${escapeHtml(p.title)}</option>`).join("")}</select></div>
      <div><label>Goal</label><select id="fGoal"><option value="">None</option>${db.goals.map(g => `<option value="${g.id}" ${t.goalId === g.id ? "selected" : ""}>${escapeHtml(g.title)}</option>`).join("")}</select></div>
    </div>
    <br><button onclick="saveTask('${t.id || ""}')">Save</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}
async function aiBreakTask() {
  await withAI("taskBreakBtn", async () => {
    const result = await callAgent("taskBreaker", { text: $("fTitle").value + "\n" + $("fNotes").value });
    $("fTitle").value = result.title || $("fTitle").value;
    $("fDiff").value = result.difficulty || $("fDiff").value;
    $("fSubs").value = (result.subtasks || []).join("\n");
    toast("Task broken into small steps.");
  });
}
function saveTask(id) {
  const obj = id ? db.tasks.find(t => t.id === id) : { id: uid(), percent: 0 };
  Object.assign(obj, {
    title: $("fTitle").value.trim() || "Untitled task",
    notes: $("fNotes").value.trim(),
    due: $("fDue").value,
    difficulty: $("fDiff").value,
    subtasks: $("fSubs").value.split("\n").map(x => x.trim()).filter(Boolean).map(title => ({ id: uid(), title, done: false })),
    projectId: $("fProject").value || "",
    goalId: $("fGoal").value || ""
  });
  if (!id) db.tasks.push(obj);
  closeModal(); save();
}

function formRoutine(r = {}) {
  modal(r.id ? "Edit Routine" : "Add Routine", `
    <label>Title</label><input id="rTitle" value="${escapeHtml(r.title || "")}">
    <button class="small secondary" onclick="voiceTo('rTitle')">🎙 Voice</button>
    <label>Time</label><input id="rTime" type="time" value="${r.time || "07:00"}">
    <label>Recurrence</label><select id="rRec">${["Daily", "Weekdays", "Weekends"].map(x => `<option ${r.recurrence === x ? "selected" : ""}>${x}</option>`).join("")}</select>
    <label>Subtasks, one per line</label><textarea id="rSubs">${(r.subtasks || []).map(s => escapeHtml(s.title || s)).join("\n")}</textarea>
    <br><button onclick="saveRoutine('${r.id || ""}')">Save</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}
function saveRoutine(id) {
  const obj = id ? db.routines.find(r => r.id === id) : { id: uid() };
  Object.assign(obj, {
    title: $("rTitle").value.trim() || "Untitled routine",
    time: $("rTime").value,
    recurrence: $("rRec").value,
    subtasks: $("rSubs").value.split("\n").map(x => x.trim()).filter(Boolean).map(title => ({ id: uid(), title, done: false }))
  });
  if (!id) db.routines.push(obj);
  closeModal(); save();
}

function formProject(p = {}) {
  modal(p.id ? "Edit Project" : "Add Project", `
    <label>Project title</label><input id="pTitle" value="${escapeHtml(p.title || "")}">
    <label>Project vision</label><textarea id="pVision">${escapeHtml(p.vision || "")}</textarea>
    <label>Describe project for AI Project Breaker</label><textarea id="pBreak" placeholder="Example: declutter my bedroom closet and create a simple laundry system"></textarea>
    <button class="small secondary" onclick="voiceTo('pBreak')">🎙 Voice</button>
    <br><br>
    <button onclick="saveProject('${p.id || ""}', false)">Save</button>
    <button id="projectAIBtn" class="secondary" onclick="saveProject('${p.id || ""}', true)">Save + AI Break Project</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}
async function saveProject(id, useAI) {
  const isNew = !id;
  const obj = id ? db.projects.find(p => p.id === id) : { id: uid() };
  obj.title = $("pTitle").value.trim() || "Untitled project";
  obj.vision = $("pVision").value.trim();
  if (isNew) db.projects.push(obj);

  const description = $("pBreak").value.trim();
  if (useAI && description) {
    await withAI("projectAIBtn", async () => {
      const result = await callAgent("projectBreaker", { text: description });
      obj.title = result.title || obj.title;
      obj.vision = result.vision || obj.vision;
      (result.tasks || []).forEach(task => db.tasks.push({
        id: uid(),
        title: task.title || "Project task",
        notes: task.notes || "",
        due: "",
        difficulty: ["Easy", "Medium", "Hard"].includes(task.difficulty) ? task.difficulty : "Medium",
        percent: 0,
        subtasks: (task.subtasks || []).map(title => ({ id: uid(), title, done: false })),
        projectId: obj.id,
        goalId: ""
      }));
      closeModal(); save(); toast("Project created with AI tasks.");
    });
    return;
  }
  closeModal(); save();
}

function formGoal(g = {}) {
  modal(g.id ? "Edit Goal" : "Add Goal", `
    <label>Goal title</label><input id="gTitle" value="${escapeHtml(g.title || "")}">
    <label>Goal vision</label><textarea id="gVision">${escapeHtml(g.vision || "")}</textarea>
    <label>Describe goal for AI Goal Breaker</label><textarea id="gBreak" placeholder="Example: get stronger and more consistent with workouts"></textarea>
    <button class="small secondary" onclick="voiceTo('gBreak')">🎙 Voice</button>
    <br><br>
    <button onclick="saveGoal('${g.id || ""}', false)">Save</button>
    <button id="goalAIBtn" class="secondary" onclick="saveGoal('${g.id || ""}', true)">Save + AI Break Goal</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}
async function saveGoal(id, useAI) {
  const isNew = !id;
  const obj = id ? db.goals.find(g => g.id === id) : { id: uid() };
  obj.title = $("gTitle").value.trim() || "Untitled goal";
  obj.vision = $("gVision").value.trim();
  if (isNew) db.goals.push(obj);

  const description = $("gBreak").value.trim();
  if (useAI && description) {
    await withAI("goalAIBtn", async () => {
      const result = await callAgent("goalBreaker", { text: description });
      obj.title = result.title || obj.title;
      obj.vision = result.vision || obj.vision;
      (result.tasks || []).forEach(task => db.tasks.push({
        id: uid(),
        title: task.title || "Goal task",
        notes: task.notes || "",
        due: "",
        difficulty: ["Easy", "Medium", "Hard"].includes(task.difficulty) ? task.difficulty : "Medium",
        percent: 0,
        subtasks: (task.subtasks || []).map(title => ({ id: uid(), title, done: false })),
        projectId: "",
        goalId: obj.id
      }));
      closeModal(); save(); toast("Goal created with AI tasks.");
    });
    return;
  }
  closeModal(); save();
}

function formReward(r = {}) {
  modal(r.id ? "Edit Reward" : "Add Reward", `
    <label>Reward</label><input id="rwTitle" value="${escapeHtml(r.title || "")}">
    <label>Point threshold</label><input id="rwThreshold" type="number" value="${r.threshold || 100}">
    <br><br><button onclick="saveReward('${r.id || ""}')">Save</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}
function saveReward(id) {
  const obj = id ? db.rewards.find(r => r.id === id) : { id: uid() };
  obj.title = $("rwTitle").value.trim() || "Untitled reward";
  obj.threshold = Number($("rwThreshold").value || 100);
  if (!id) db.rewards.push(obj);
  closeModal(); save();
}

async function completeTask(id, amount = 100) {
  const t = db.tasks.find(x => x.id === id);
  if (!t) return;
  const before = t.percent || 0;
  t.percent = Math.max(t.percent || 0, amount);
  if (before < 100 && t.percent >= 100 && !log().completedTasks.includes(id)) {
    log().completedTasks.push(id);
    log().points += pointsFor(t.difficulty);
  } else if (amount < 100 && before < amount) {
    log().points += Math.ceil(pointsFor(t.difficulty) * 0.5);
  }
  db.settings.lastActive = todayKey();
  save();

  const itemVision = t.projectId ? (db.projects.find(p => p.id === t.projectId)?.vision || db.settings.vision)
    : t.goalId ? (db.goals.find(g => g.id === t.goalId)?.vision || db.settings.vision)
    : db.settings.vision;

  try {
    const result = await callAgent("affirmation", { text: t.title, itemVision });
    modal(result.title || "✨ Quest progress!", `
      <p>${escapeHtml(result.message || "You made progress. That counts.")}</p>
      <p class="muted">${escapeHtml(result.visionMessage || itemVision)}</p>
      <button onclick="closeModal()">Keep going 🌿</button>
    `);
  } catch {
    modal("✨ Quest progress!", `
      <p>You made progress. That counts.</p>
      <p class="muted">Start with the end in mind: ${escapeHtml(itemVision)}</p>
      <button onclick="closeModal()">Keep going 🌿</button>
    `);
  }
}
function completeRoutine(id) {
  if (!log().completedRoutines.includes(id)) {
    log().completedRoutines.push(id);
    log().points += 5;
  }
  save();
  modal("🔥 Routine complete", `<p>Beautiful follow-through. Your future self is being cared for.</p><button onclick="closeModal()">Done</button>`);
}
function remove(type, id) {
  db[type] = db[type].filter(x => x.id !== id);
  save();
}

function startPomodoro() {
  if (pomodoro.running) return;
  pomodoro.running = true;
  pomodoro.timer = setInterval(() => {
    pomodoro.seconds -= 1;
    if (pomodoro.seconds <= 0) {
      clearInterval(pomodoro.timer);
      pomodoro.running = false;
      pomodoro.seconds = 25 * 60;
      log().points += 5;
      save();
      modal("⏱ Pomodoro complete", `<p>You earned 5 focus points.</p><button onclick="closeModal()">Nice</button>`);
    }
    renderToday();
  }, 1000);
}
function resetPomodoro() {
  clearInterval(pomodoro.timer);
  pomodoro = { seconds: 25 * 60, running: false, timer: null };
  renderToday();
}
function pomodoroLabel() {
  const m = Math.floor(pomodoro.seconds / 60).toString().padStart(2, "0");
  const s = (pomodoro.seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

async function planDay() {
  await withAI("planBtn", async () => {
    const openItems = [
      ...db.routines.map(r => ({ type: "routine", title: r.title, time: r.time })),
      ...db.tasks.filter(t => (t.percent || 0) < 100).slice(0, 12).map(t => ({ type: "task", title: t.title, difficulty: t.difficulty, due: t.due }))
    ];
    const result = await callAgent("dailyPlanner", { mood: log().mood, energy: log().energy, items: openItems });
    modal("🧭 AI Daily Planner", `
      <p>${escapeHtml(result.summary || "")}</p>
      <h3>Minimum Viable Day</h3>
      ${(result.minimumViableDay || []).map(x => `<div class="item">${escapeHtml(x)}</div>`).join("")}
      <h3>Priority Plan</h3>
      ${(result.priorityPlan || []).map(x => `<div class="item"><b>${escapeHtml(x.title)}</b><br><span class="muted">${escapeHtml(x.timeBlock || "")} — ${escapeHtml(x.why || "")}</span></div>`).join("")}
      <p class="muted">${escapeHtml(result.encouragement || "")}</p>
      <button onclick="closeModal()">Use this plan</button>
    `);
  });
}
async function suggestRoutine() {
  modal("AI Routine Suggester", `
    <label>What do you need help with?</label>
    <textarea id="routineNeed" placeholder="Example: I need an easy morning routine before work"></textarea>
    <button class="small secondary" onclick="voiceTo('routineNeed')">🎙 Voice</button>
    <br><br>
    <button id="routineSuggestBtn" onclick="runRoutineSuggester()">Suggest Routines</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}
async function runRoutineSuggester() {
  await withAI("routineSuggestBtn", async () => {
    const result = await callAgent("routineSuggester", { text: $("routineNeed").value });
    (result.routines || []).forEach(r => db.routines.push({
      id: uid(),
      title: r.title || "Suggested routine",
      time: r.time || "07:00",
      recurrence: r.recurrence || "Daily",
      subtasks: (r.subtasks || []).map(title => ({ id: uid(), title, done: false }))
    }));
    closeModal(); save(); toast("AI routines added.");
  });
}
async function weeklyInsights() {
  await withAI("weeklyBtn", async () => {
    const result = await callAgent("weeklyInsights", { data: { logs: db.logs, tasks: db.tasks, routines: db.routines, projects: db.projects, goals: db.goals } });
    modal("📊 Weekly AI Insights", `
      <h3>Wins</h3>${(result.wins || []).map(x => `<div class="item">${escapeHtml(x)}</div>`).join("")}
      <h3>Patterns</h3>${(result.patterns || []).map(x => `<div class="item">${escapeHtml(x)}</div>`).join("")}
      <h3>Suggestions</h3>${(result.suggestions || []).map(x => `<div class="item">${escapeHtml(x)}</div>`).join("")}
      <p class="muted">${escapeHtml(result.visionTieIn || "")}</p>
      <button onclick="closeModal()">Close</button>
    `);
  });
}
function reflectionForm() {
  modal("End-of-Day Reflection", `
    <label>What happened today?</label>
    <textarea id="reflectionText"></textarea>
    <button class="small secondary" onclick="voiceTo('reflectionText')">🎙 Voice</button>
    <br><br>
    <button id="reflectBtn" onclick="runReflection()">Reflect with AI</button>
    <button class="secondary" onclick="closeModal()">Cancel</button>
  `);
}
async function runReflection() {
  await withAI("reflectBtn", async () => {
    const text = $("reflectionText").value;
    const result = await callAgent("reflection", { text });
    log().reflections.push({ date: todayKey(), text, result });
    save();
    modal("🌙 Reflection Coach", `
      <p><b>Affirmation:</b> ${escapeHtml(result.affirmation || "")}</p>
      <p><b>Pattern:</b> ${escapeHtml(result.pattern || "")}</p>
      <p><b>Tomorrow:</b> ${escapeHtml(result.tomorrow || "")}</p>
      <button onclick="closeModal()">Close</button>
    `);
  });
}

function itemTask(t) {
  return `<div class="item ${(t.percent || 0) >= 100 ? "done" : ""}">
    <div class="between">
      <div>
        <div class="title">${escapeHtml(t.title)}</div>
        <div class="muted">${t.difficulty} · ${pointsFor(t.difficulty)} pts ${t.due ? "· due " + t.due.replace("T", " ") : ""}</div>
      </div>
      <button class="small" onclick="completeTask('${t.id}',100)">✓</button>
    </div>
    ${t.notes ? `<p class="muted">${escapeHtml(t.notes)}</p>` : ""}
    ${(t.subtasks || []).length ? `<div class="muted">${t.subtasks.map(s => "• " + escapeHtml(s.title || s)).join("<br>")}</div>` : ""}
    <div class="progress"><div class="bar" style="width:${t.percent || 0}%"></div></div>
    <div class="row" style="margin-top:8px">
      <button class="small secondary" onclick="completeTask('${t.id}',50)">Partial</button>
      <button class="small secondary" onclick="formTask(db.tasks.find(t=>t.id==='${t.id}'))">Edit</button>
      <button class="small danger" onclick="remove('tasks','${t.id}')">Delete</button>
    </div>
  </div>`;
}
function routineItem(r) {
  const done = log().completedRoutines.includes(r.id);
  return `<div class="item ${done ? "done" : ""}">
    <div class="between">
      <div><div class="title">${escapeHtml(r.title)}</div><div class="muted">${r.time || ""} · ${r.recurrence || "Daily"}</div></div>
      <button class="small" onclick="completeRoutine('${r.id}')">✓</button>
    </div>
    ${(r.subtasks || []).length ? `<div class="muted">${r.subtasks.map(s => "• " + escapeHtml(s.title || s)).join("<br>")}</div>` : ""}
    <div class="row" style="margin-top:8px">
      <button class="small secondary" onclick="formRoutine(db.routines.find(r=>r.id==='${r.id}'))">Edit</button>
      <button class="small danger" onclick="remove('routines','${r.id}')">Delete</button>
    </div>
  </div>`;
}
function metric(name, pct) {
  return `<div class="metric"><span>${name}</span><strong>${pct}%</strong><div class="progress"><div class="bar" style="width:${pct}%"></div></div></div>`;
}


function parseDueDateValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function topTasksForToday() {
  const open = db.tasks.filter(t => (t.percent || 0) < 100);
  const scoreTask = (t) => {
    const due = parseDueDateValue(t.due);
    const dueScore = due ? Math.max(0, 10000000000000 - Math.abs(due - new Date())) : 0;
    const difficultyScore = t.difficulty === "Hard" ? 30 : t.difficulty === "Medium" ? 20 : 10;
    const projectBoost = t.projectId || t.goalId ? 8 : 0;
    return dueScore + difficultyScore + projectBoost;
  };
  return open.sort((a, b) => scoreTask(b) - scoreTask(a)).slice(0, 3);
}

function nextActionTasks() {
  return db.tasks
    .filter(t => (t.percent || 0) < 100)
    .sort((a, b) => {
      const ad = parseDueDateValue(a.due);
      const bd = parseDueDateValue(b.due);
      if (ad && bd) return ad - bd;
      if (ad) return -1;
      if (bd) return 1;
      return pointsFor(b.difficulty) - pointsFor(a.difficulty);
    })
    .slice(0, 5);
}

function activeProjectsList() {
  return db.projects
    .map(p => ({ ...p, progress: projectProgress(p), openCount: db.tasks.filter(t => t.projectId === p.id && (t.percent || 0) < 100).length }))
    .filter(p => p.progress < 100 || p.openCount > 0)
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, 4);
}

function weekStartDate() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKeyFromDate(d) {
  return d.toISOString().slice(0, 10);
}

function weeklyStats() {
  const start = weekStartDate();
  let points = 0;
  let activeDays = 0;
  let completedTasks = 0;
  let completedRoutines = 0;
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKeyFromDate(d);
    const dayLog = db.logs[key] || { points: 0, completedTasks: [], completedRoutines: [] };
    const dayPoints = dayLog.points || 0;
    points += dayPoints;
    completedTasks += (dayLog.completedTasks || []).length;
    completedRoutines += (dayLog.completedRoutines || []).length;
    if (dayPoints > 0) activeDays += 1;
    days.push({ key, points: dayPoints });
  }

  return { points, activeDays, completedTasks, completedRoutines, days };
}

function calculateStreak() {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = dateKeyFromDate(d);
    const dayLog = db.logs[key];
    if (dayLog && (dayLog.points || 0) > 0) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function miniTaskCard(t) {
  return `<div class="item">
    <div class="between">
      <div>
        <div class="title">${escapeHtml(t.title)}</div>
        <div class="muted">${t.difficulty || "Easy"} · ${pointsFor(t.difficulty)} pts${t.due ? " · " + escapeHtml(t.due.replace("T", " ")) : ""}</div>
      </div>
      <button class="small" onclick="completeTask('${t.id}',100)">✓</button>
    </div>
  </div>`;
}

function renderToday() {
  const l = log();
  const taskPct = percent(db.tasks, t => (t.percent || 0) >= 100);
  const routinePct = percent(db.routines, r => l.completedRoutines.includes(r.id));
  const projectPct = db.projects.length ? Math.round(db.projects.reduce((s, p) => s + projectProgress(p), 0) / db.projects.length) : 0;
  const goalPct = db.goals.length ? Math.round(db.goals.reduce((s, g) => s + goalProgress(g), 0) / db.goals.length) : 0;
  const combined = Math.round((taskPct + routinePct + projectPct + goalPct) / 4);

  const top3 = topTasksForToday();
  const nextActions = nextActionTasks();
  const activeProjects = activeProjectsList();
  const week = weeklyStats();
  const streak = calculateStreak();
  const weeklyGoal = Math.max(1, db.settings.dailyGoal * 7);
  const weeklyPct = Math.min(100, Math.round(week.points / weeklyGoal * 100));

  $("today").innerHTML = `
    <div class="card">
      <div class="between" style="margin-bottom:10px"><div>${userStatusHtml()}</div><button class="secondary small" onclick="saveToCloudNow().then(()=>toast('Cloud sync saved.')).catch(e=>toast('Cloud sync failed.'))">Sync Now</button></div>
      <div class="between">
        <div><b>Quest Points</b><strong style="font-size:2rem;display:block">${l.points}</strong><span class="muted">Today goal: ${db.settings.dailyGoal} · Lifetime: ${totalPoints()} · AI uses today: ${l.aiUses || 0}/12</span></div>
        <button id="planBtn" onclick="planDay()">Plan My Day</button>
      </div>
      <div class="progress"><div class="bar" style="width:${Math.min(100, Math.round(l.points / db.settings.dailyGoal * 100))}%"></div></div>
      <p class="muted">🌟 ${escapeHtml(db.settings.vision)}</p>
    </div>

    <div class="grid">
      <div class="metric"><span>🔥 Streak</span><strong>${streak}</strong><span class="muted">Active days in a row</span></div>
      <div class="metric"><span>🏆 Weekly Progress</span><strong>${weeklyPct}%</strong><div class="progress"><div class="bar" style="width:${weeklyPct}%"></div></div><span class="muted">${week.points}/${weeklyGoal} pts · ${week.activeDays}/7 active days</span></div>
      ${metric("Routines", routinePct)}
      ${metric("Tasks", taskPct)}
      ${metric("Projects", projectPct)}
      ${metric("Goals", goalPct)}
    </div>

    <div class="card">
      <div class="between"><b>⭐ Today's Top 3</b><span class="muted">Most important next wins</span></div>
      ${top3.length ? top3.map(miniTaskCard).join("") : `<div class="empty">No top tasks yet. Tap + to add tasks.</div>`}
    </div>

    <div class="card">
      <div class="between"><b>🚀 Active Projects</b><button class="secondary small" onclick="activeTab='projects'; document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $('projects').classList.add('active'); document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active')); document.querySelector('nav button[data-tab=projects]').classList.add('active'); render();">View All</button></div>
      ${activeProjects.length ? activeProjects.map(p => `<div class="item"><div class="between"><div><div class="title">${escapeHtml(p.title)}</div><div class="muted">${p.openCount} open actions</div></div><strong>${p.progress}%</strong></div><div class="progress"><div class="bar" style="width:${p.progress}%"></div></div></div>`).join("") : `<div class="empty">No active projects yet.</div>`}
    </div>

    <div class="card">
      <div class="between"><b>➡️ Next Actions</b><span class="muted">Small steps to keep moving</span></div>
      ${nextActions.length ? nextActions.map(miniTaskCard).join("") : `<div class="empty">No next actions yet.</div>`}
    </div>

    <div class="card">
      <div class="between"><b>📊 Weekly Progress</b><button id="weeklyBtn" class="secondary small" onclick="weeklyInsights()">AI Weekly Insights</button></div>
      <div class="progress"><div class="bar" style="width:${weeklyPct}%"></div></div>
      <p class="muted">${week.points} points this week · ${week.completedTasks} tasks completed · ${week.completedRoutines} routines completed</p>
      <div class="grid">
        ${week.days.map(d => `<div class="metric"><span>${d.key.slice(5)}</span><strong>${d.points}</strong><span class="muted">pts</span></div>`).join("")}
      </div>
    </div>

    <div class="card">
      <div class="between"><b>Pomodoro Focus</b><strong>${pomodoroLabel()}</strong></div>
      <div class="row"><button onclick="startPomodoro()">Start</button><button class="secondary" onclick="resetPomodoro()">Reset</button></div>
    </div>

    <div class="card">
      <div class="between"><b>Mood & Energy</b><button class="secondary small" onclick="reflectionForm()">Reflect</button></div>
      <label>Mood: ${l.mood}</label><input type="range" min="1" max="5" value="${l.mood}" oninput="log().mood=Number(this.value); save()">
      <label>Energy: ${l.energy}</label><input type="range" min="1" max="5" value="${l.energy}" oninput="log().energy=Number(this.value); save()">
    </div>

    <div class="card"><b>Today's Routines</b>${db.routines.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map(routineItem).join("") || `<div class="empty">No routines yet.</div>`}</div>
  `;
}
function renderTasks() {
  $("tasks").innerHTML = `<div class="card between"><b>Tasks</b><button onclick="formTask()">Add Task</button></div>${db.tasks.map(itemTask).join("") || `<div class="card empty">No tasks yet.</div>`}`;
}
function renderRoutines() {
  $("routines").innerHTML = `<div class="card between"><b>Routines</b><div class="row"><button onclick="formRoutine()">Add</button><button class="secondary" onclick="suggestRoutine()">AI Suggest</button></div></div>${db.routines.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map(routineItem).join("") || `<div class="card empty">No routines yet.</div>`}`;
}
function renderProjects() {
  $("projects").innerHTML = `<div class="card between"><b>Projects</b><button onclick="formProject()">Add Project</button></div>` + 
  (db.projects.map(p => `<div class="card">
    <div class="between"><b>${escapeHtml(p.title)}</b><span>${projectProgress(p)}%</span></div>
    <p class="muted">${escapeHtml(p.vision || "No project vision yet.")}</p>
    <div class="progress"><div class="bar" style="width:${projectProgress(p)}%"></div></div>
    ${db.tasks.filter(t => t.projectId === p.id).map(itemTask).join("")}
    <br><button class="small secondary" onclick="formProject(db.projects.find(p=>p.id==='${p.id}'))">Edit</button>
    <button class="small danger" onclick="remove('projects','${p.id}')">Delete</button>
  </div>`).join("") || `<div class="card empty">No projects yet.</div>`);
}
function renderGoals() {
  $("goals").innerHTML = `<div class="card between"><b>Goals</b><button onclick="formGoal()">Add Goal</button></div>` + 
  (db.goals.map(g => `<div class="card">
    <div class="between"><b>${escapeHtml(g.title)}</b><span>${goalProgress(g)}%</span></div>
    <p class="muted">${escapeHtml(g.vision || "No goal vision yet.")}</p>
    <div class="progress"><div class="bar" style="width:${goalProgress(g)}%"></div></div>
    ${db.tasks.filter(t => t.goalId === g.id).map(itemTask).join("")}
    <br><button class="small secondary" onclick="formGoal(db.goals.find(g=>g.id==='${g.id}'))">Edit</button>
    <button class="small danger" onclick="remove('goals','${g.id}')">Delete</button>
  </div>`).join("") || `<div class="card empty">No goals yet.</div>`);
}
function renderRewards() {
  const total = totalPoints();
  $("rewards").innerHTML = `<div class="card between"><div><b>Reward Vault</b><div class="muted">Lifetime points: ${total}</div></div><button onclick="formReward()">Add Reward</button></div>` + 
  db.rewards.sort((a,b)=>a.threshold-b.threshold).map(r => {
    const unlocked = total >= r.threshold;
    const pct = Math.min(100, Math.round(total / r.threshold * 100));
    return `<div class="card"><div class="between"><b>${unlocked ? "🔓" : "🔒"} ${escapeHtml(r.title)}</b><span class="gold">${r.threshold} pts</span></div><div class="progress"><div class="bar" style="width:${pct}%"></div></div><br><button class="small secondary" onclick="formReward(db.rewards.find(r=>r.id==='${r.id}'))">Edit</button> <button class="small danger" onclick="remove('rewards','${r.id}')">Delete</button></div>`;
  }).join("");
}
function renderProgress() {
  const days = Object.keys(db.logs).sort().slice(-14);
  $("progress").innerHTML = `
    <div class="card between"><div><b>Vision & Progress</b><div class="muted">Review patterns, wins, and next steps.</div></div><button id="weeklyBtn" onclick="weeklyInsights()">AI Weekly Insights</button></div>
    <div class="grid">
      <div class="metric"><span>Lifetime Points</span><strong>${totalPoints()}</strong></div>
      <div class="metric"><span>Open Tasks</span><strong>${db.tasks.filter(t=>(t.percent||0)<100).length}</strong></div>
      <div class="metric"><span>Projects</span><strong>${db.projects.length}</strong></div>
      <div class="metric"><span>Goals</span><strong>${db.goals.length}</strong></div>
    </div>
    <div class="card"><b>Last 14 Days</b>${days.map(d => `<div class="item"><div class="between"><b>${d}</b><span>${db.logs[d].points || 0} pts</span></div><div class="muted">Mood ${db.logs[d].mood || 3}/5 · Energy ${db.logs[d].energy || 3}/5</div></div>`).join("") || `<div class="empty">No progress logs yet.</div>`}</div>
  `;
}
function render() {
  renderToday(); renderTasks(); renderRoutines(); renderProjects(); renderGoals(); renderRewards(); renderProgress();
}
render();

initFirebaseCloudSync();
