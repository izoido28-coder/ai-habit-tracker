// ============================================================
//  HabitFlow — app.js
//  Paste your FREE API key below (Gemini, Groq, or Anthropic)
// ============================================================

const AI_KEY = "YOUR_API_KEY_HERE"; // <-- replace this

// ── State ────────────────────────────────────────────────────
let habits = [];
let selectedType = "slider"; // current modal type

// ── Boot ─────────────────────────────────────────────────────
window.onload = function () {
  loadProfile();
  loadHabits();
  renderHabits();
  showFields("slider");
};

// ============================================================
//  PROFILE
// ============================================================
function saveProfile() {
  const profile = {
    name:   document.getElementById("p-name").value.trim(),
    gender: document.getElementById("p-gender").value,
    age:    document.getElementById("p-age").value,
    weight: document.getElementById("p-weight").value,
    height: document.getElementById("p-height").value,
    goal:   document.getElementById("p-goal").value.trim()
  };
  localStorage.setItem("profile", JSON.stringify(profile));
  const saved = document.getElementById("profile-saved");
  saved.style.display = "block";
  setTimeout(() => saved.style.display = "none", 2000);
}

function loadProfile() {
  const p = JSON.parse(localStorage.getItem("profile") || "{}");
  if (p.name)   document.getElementById("p-name").value   = p.name;
  if (p.gender) document.getElementById("p-gender").value = p.gender;
  if (p.age)    document.getElementById("p-age").value    = p.age;
  if (p.weight) document.getElementById("p-weight").value = p.weight;
  if (p.height) document.getElementById("p-height").value = p.height;
  if (p.goal)   document.getElementById("p-goal").value   = p.goal;
}

// ============================================================
//  MODAL
// ============================================================
function openModal() {
  document.getElementById("modal").classList.add("open");
  showFields(selectedType);
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  // reset form
  ["m-name","m-unit","m-max","m-goal-val","m-current","m-weeks","m-desc"]
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
}

function selectType(type, btn) {
  selectedType = type;
  document.querySelectorAll(".habit-type-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  showFields(type);
}

function showFields(type) {
  ["slider","quit","checkbox"].forEach(t => {
    document.getElementById("fields-"+t).style.display = t === type ? "block" : "none";
  });
}

// ============================================================
//  ADD HABIT
// ============================================================
function addHabit() {
  const name = document.getElementById("m-name").value.trim();
  if (!name) return;

  let habit = { id: Date.now(), name, type: selectedType, completed: false };

  if (selectedType === "slider") {
    habit.unit    = document.getElementById("m-unit").value || "units";
    habit.max     = parseFloat(document.getElementById("m-max").value) || 10;
    habit.goalVal = parseFloat(document.getElementById("m-goal-val").value) || 5;
    habit.current = 0;

  } else if (selectedType === "quit") {
    const startAmount = parseInt(document.getElementById("m-current").value) || 10;
    const weeks       = parseInt(document.getElementById("m-weeks").value) || 4;
    habit.startAmount = startAmount;
    habit.weeks       = weeks;
    habit.todayCount  = startAmount;
    habit.weekPlan    = buildQuitPlan(startAmount, weeks); // AI-style week plan
    habit.startDate   = new Date().toISOString();

  } else if (selectedType === "checkbox") {
    habit.desc = document.getElementById("m-desc").value.trim();
    habit.done = false;
  }

  habits.push(habit);
  saveHabits();
  renderHabits();
  closeModal();
}

// Simple linear quit plan (no API needed for this)
function buildQuitPlan(start, weeks) {
  const plan = [];
  for (let w = 1; w <= weeks; w++) {
    const target = Math.max(0, Math.round(start - (start / weeks) * w));
    plan.push({ week: w, dailyTarget: target });
  }
  return plan;
}

// ============================================================
//  DELETE
// ============================================================
function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  saveHabits();
  renderHabits();
}

// ============================================================
//  RENDER
// ============================================================
function renderHabits() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  if (habits.length === 0) {
    list.innerHTML = '<p style="color:#555;font-size:14px;text-align:center;margin-top:20px;">No habits yet. Add one above!</p>';
    return;
  }

  habits.forEach(habit => {
    const card = document.createElement("div");
    card.className = "habit-card";

    // Header
    card.innerHTML = `
      <div class="habit-header">
        <span class="habit-name">${habit.name}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="habit-type-tag">${labelFor(habit.type)}</span>
          <button class="delete-btn" onclick="deleteHabit(${habit.id})">✕</button>
        </div>
      </div>
    `;

    // Body based on type
    if (habit.type === "slider") {
      card.appendChild(buildSlider(habit));
    } else if (habit.type === "quit") {
      card.appendChild(buildQuit(habit));
    } else if (habit.type === "checkbox") {
      card.appendChild(buildCheckbox(habit));
    }

    list.appendChild(card);
  });
}

function labelFor(type) {
  return { slider: "📊 Tracker", quit: "🚭 Quit", checkbox: "✅ Task" }[type] || type;
}

// ── Slider card ──────────────────────────────────────────────
function buildSlider(habit) {
  const div = document.createElement("div");
  div.className = "slider-section";
  const pct = Math.round((habit.current / habit.max) * 100);

  div.innerHTML = `
    <div class="slider-value" id="sv-${habit.id}">${habit.current} ${habit.unit}</div>
    <div class="slider-labels">
      <span>0</span>
      <span>Goal: ${habit.goalVal} ${habit.unit}</span>
      <span>${habit.max}</span>
    </div>
    <input type="range" min="0" max="${habit.max}" step="0.1"
      value="${habit.current}"
      oninput="updateSlider(${habit.id}, this.value)"
      onchange="updateSlider(${habit.id}, this.value)" />
    <div style="font-size:12px;color:${pct >= 100 ? '#00cec9' : '#888'};margin-top:4px;">
      ${pct >= 100 ? "✓ Goal reached!" : `${pct}% of daily goal`}
    </div>
  `;
  return div;
}

function updateSlider(id, value) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  habit.current = parseFloat(value);
  document.getElementById("sv-" + id).textContent = `${habit.current} ${habit.unit}`;
  saveHabits();
}

// ── Quit card ────────────────────────────────────────────────
function buildQuit(habit) {
  const div = document.createElement("div");
  div.className = "quit-section";

  // which week are we in?
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekIndex = Math.min(
    Math.floor((Date.now() - new Date(habit.startDate)) / msPerWeek),
    habit.weeks - 1
  );
  const thisWeekTarget = habit.weekPlan[weekIndex]?.dailyTarget ?? 0;
  const progressPct = Math.round(((habit.startAmount - habit.todayCount) / habit.startAmount) * 100);

  let planHTML = habit.weekPlan.map((w, i) =>
    `<span style="color:${i === weekIndex ? '#a29bfe' : '#555'}">
      Week ${w.week}: ${w.dailyTarget}/day${i === weekIndex ? " ← you are here" : ""}
    </span>`
  ).join("");

  div.innerHTML = `
    <div class="quit-progress">
      <span>Today: <b>${habit.todayCount}</b></span>
      <span>This week's target: <b>${thisWeekTarget}</b></span>
      <span>Start: ${habit.startAmount}</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${Math.min(progressPct,100)}%"></div>
    </div>
    <div style="font-size:12px;color:#888;margin-top:4px;">${progressPct}% progress toward quitting</div>
    <div class="quit-today">
      <span style="font-size:13px;">Today I had:</span>
      <input type="number" id="qt-${habit.id}" value="${habit.todayCount}" min="0" />
      <button onclick="updateQuit(${habit.id})">Update</button>
    </div>
    <div class="week-plan">${planHTML}</div>
  `;
  return div;
}

function updateQuit(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  habit.todayCount = parseInt(document.getElementById("qt-" + id).value) || 0;
  saveHabits();
  renderHabits();
}

// ── Checkbox card ────────────────────────────────────────────
function buildCheckbox(habit) {
  const div = document.createElement("div");
  div.className = "check-section";
  div.innerHTML = `
    <input type="checkbox" class="big-check" ${habit.done ? "checked" : ""}
      onchange="toggleCheckbox(${habit.id}, this.checked)" />
    <span class="check-label" style="text-decoration:${habit.done ? 'line-through' : 'none'};color:${habit.done ? '#00cec9' : '#ccc'}">
      ${habit.desc || "Mark as done"}
    </span>
  `;
  return div;
}

function toggleCheckbox(id, checked) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  habit.done = checked;
  saveHabits();
  renderHabits();
}

// ============================================================
//  SAVE / LOAD
// ============================================================
function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

function loadHabits() {
  const saved = localStorage.getItem("habits");
  if (saved) habits = JSON.parse(saved);
}

// ============================================================
//  AI — uses Anthropic API (free trial available)
//  Get free key: https://console.anthropic.com
//  Or use Gemini free: https://aistudio.google.com
// ============================================================
function getProfileText() {
  const p = JSON.parse(localStorage.getItem("profile") || "{}");
  if (!p.name) return "No profile saved yet.";
  return `Name: ${p.name}, Gender: ${p.gender}, Age: ${p.age}, Weight: ${p.weight}kg, Height: ${p.height}cm, Goal: ${p.goal}`;
}

function getHabitsText() {
  if (habits.length === 0) return "No habits tracked yet.";
  return habits.map(h => {
    if (h.type === "slider") return `${h.name}: ${h.current}/${h.goalVal} ${h.unit} today`;
    if (h.type === "quit")   return `${h.name}: had ${h.todayCount} today (started at ${h.startAmount}, goal: 0 in ${h.weeks} weeks)`;
    if (h.type === "checkbox") return `${h.name}: ${h.done ? "done ✓" : "not done yet"}`;
    return h.name;
  }).join("\n");
}

async function callAI(prompt) {
  // Using Anthropic API — swap for Gemini/Groq if preferred
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

function showAIResult(text) {
  const out = document.getElementById("ai-output");
  out.textContent = text;
  out.style.display = "block";
  document.getElementById("ai-loading").style.display = "none";
}

function showAILoading() {
  document.getElementById("ai-loading").style.display = "block";
  document.getElementById("ai-output").style.display = "none";
}

async function getTomorrowPlan() {
  showAILoading();
  const prompt = `
You are a helpful health coach. Based on this user's profile and today's habit progress, 
create a short, practical plan for tomorrow. Be specific and encouraging.

USER PROFILE:
${getProfileText()}

TODAY'S HABITS:
${getHabitsText()}

Write a short tomorrow's plan (5-8 bullet points max). Keep it motivating and personal.
  `;
  try {
    const result = await callAI(prompt);
    showAIResult(result);
  } catch (e) {
    showAIResult("⚠️ Could not reach AI. Check your API key in app.js\n\nError: " + e.message);
  }
}

async function getDailyTip() {
  showAILoading();
  const prompt = `
You are a concise health coach. Based on this user's profile and habits, 
give ONE specific, actionable tip for today. Max 3 sentences.

USER PROFILE:
${getProfileText()}

TODAY'S HABITS:
${getHabitsText()}
  `;
  try {
    const result = await callAI(prompt);
    showAIResult(result);
  } catch (e) {
    showAIResult("⚠️ Could not reach AI. Check your API key in app.js\n\nError: " + e.message);
  }
}
