// ============================================================
//  HabitFlow — app.js
//  This file controls everything the app does.
//  The HTML shows the structure, the CSS makes it pretty,
//  and this file makes it actually work.
// ============================================================

// ----------------------------------------------------------
// YOUR API KEY — get one free at console.groq.com
// Paste it between the quotes below
// ----------------------------------------------------------
const apiKey = process.env.AIHABITTRACKERAPIKEY;

// HABITS LIST
// This is where all habits are stored while the app is open.
// We also save them to localStorage so they survive a refresh.
// ----------------------------------------------------------
let habits = [];

// This controls which habit type is selected in the modal
// (slider, quit, or checkbox)
let selectedType = "slider";

// ----------------------------------------------------------
// STARTUP
// This runs automatically when the page finishes loading
// ----------------------------------------------------------
window.onload = function () {
  loadProfile();      // fill in profile fields from last time
  loadHabits();       // load saved habits from localStorage
  checkDailyReset();  // reset daily progress if it's a new day
  renderHabits();     // draw the habits on screen
  showFields("slider"); // show slider fields by default in modal
};


// ============================================================
//  PROFILE — save and load the user's personal info
// ============================================================

// Reads all profile inputs and saves them to localStorage
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

  // Show a "saved!" message for 2 seconds
  const saved = document.getElementById("profile-saved");
  saved.style.display = "block";
  setTimeout(() => saved.style.display = "none", 2000);
}

// Loads saved profile from localStorage and fills in the inputs
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
//  MODAL — the popup window for adding a new habit
// ============================================================

// Opens the modal and shows the correct fields for the selected type
function openModal() {
  document.getElementById("modal").classList.add("open");
  showFields(selectedType);
}

// Closes the modal and clears all the input fields
function closeModal() {
  document.getElementById("modal").classList.remove("open");

  // Clear all modal inputs
  ["m-name", "m-unit", "m-max", "m-goal-val", "m-current", "m-weeks", "m-desc"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
}

// Called when the user clicks Slider / Quit / Checkbox buttons
function selectType(type, btn) {
  selectedType = type;

  // Remove "active" style from all type buttons
  document.querySelectorAll(".habit-type-btn").forEach(b => b.classList.remove("active"));

  // Add "active" style to the clicked button
  btn.classList.add("active");

  // Show the right input fields for this type
  showFields(type);
}

// Shows only the fields for the chosen habit type, hides the rest
function showFields(type) {
  ["slider", "quit", "checkbox"].forEach(t => {
    const el = document.getElementById("fields-" + t);
    if (el) el.style.display = t === type ? "block" : "none";
  });
}


// ============================================================
//  ADD HABIT — runs when user clicks "Add Habit" in the modal
// ============================================================

function addHabit() {
  const name = document.getElementById("m-name").value.trim();

  // Don't add a habit with no name
  if (!name) return;

  // Every habit has these basic properties
  let habit = {
    id: Date.now(),       // unique ID based on current timestamp
    name: name,
    type: selectedType,
    completed: false,
    streak: 0,            // current streak in days
    bestStreak: 0,        // all-time best streak
    lastLoggedDate: null, // last date the user hit their goal
    completedToday: false // whether goal was hit today already
  };

  // Add extra properties depending on the habit type
  if (selectedType === "slider") {
    habit.unit    = document.getElementById("m-unit").value || "units";
    habit.max     = parseFloat(document.getElementById("m-max").value) || 10;
    habit.goalVal = parseFloat(document.getElementById("m-goal-val").value) || 5;
    habit.current = 0; // starts at 0

  } else if (selectedType === "quit") {
    const startAmount = parseInt(document.getElementById("m-current").value) || 10;
    const weeks       = parseInt(document.getElementById("m-weeks").value) || 4;

    habit.startAmount = startAmount;
    habit.weeks       = weeks;
    habit.todayCount  = startAmount;          // today starts at max
    habit.weekPlan    = buildQuitPlan(startAmount, weeks); // auto-generate plan
    habit.startDate   = new Date().toISOString();

  } else if (selectedType === "checkbox") {
    habit.desc = document.getElementById("m-desc").value.trim();
    habit.done = false;
  }

  // Add to list, save, and redraw
  habits.push(habit);
  saveHabits();
  renderHabits();
  closeModal();
}

// Automatically builds a week-by-week reduction plan for quit habits
// Example: 20 cigs/day → 0 in 4 weeks = reduce by 5 each week
function buildQuitPlan(start, weeks) {
  const plan = [];
  for (let w = 1; w <= weeks; w++) {
    const target = Math.max(0, Math.round(start - (start / weeks) * w));
    plan.push({ week: w, dailyTarget: target });
  }
  return plan;
}


// ============================================================
//  DELETE HABIT
// ============================================================

function deleteHabit(id) {
  // Remove the habit with this id from the list
  habits = habits.filter(h => h.id !== id);
  saveHabits();
  renderHabits();
}


// ============================================================
//  DAILY RESET — resets progress each new day
// ============================================================

function checkDailyReset() {
  const today = new Date().toDateString();
  const lastReset = localStorage.getItem("lastResetDate");

  // If we already reset today, do nothing
  if (lastReset === today) return;

  // It's a new day — reset daily completions for all habits
  habits.forEach(habit => {
    if (habit.type === "slider") {
      habit.current = 0;
      habit.completedToday = false;
    }
    if (habit.type === "checkbox") {
      habit.done = false;
      habit.completedToday = false;
    }
    if (habit.type === "quit") {
      // Reset today's count back to this week's target
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weekIndex = Math.min(
        Math.floor((Date.now() - new Date(habit.startDate)) / msPerWeek),
        habit.weeks - 1
      );
      habit.todayCount = habit.weekPlan[weekIndex]?.dailyTarget ?? habit.startAmount;
      habit.completedToday = false;
    }
  });

  localStorage.setItem("lastResetDate", today);
  saveHabits();
}


// ============================================================
//  STREAK — updates streak when a goal is hit
// ============================================================

function updateStreak(habit, goalMet) {
  if (!goalMet) return;           // didn't hit goal, no streak update
  if (habit.completedToday) return; // already counted today

  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (habit.lastLoggedDate === yesterdayStr) {
    // Continued the streak from yesterday
    habit.streak = (habit.streak || 0) + 1;
  } else {
    // Missed a day (or first ever completion) — start fresh
    habit.streak = 1;
  }

  // Update best streak if current streak beats it
  habit.bestStreak = Math.max(habit.streak, habit.bestStreak || 0);
  habit.lastLoggedDate = today;
  habit.completedToday = true;

  saveHabits();
}


// ============================================================
//  RENDER — draws all habits on the screen
// ============================================================

function renderHabits() {
  const list = document.getElementById("list");
  list.innerHTML = ""; // clear the screen first

  // If no habits, show a message
  if (habits.length === 0) {
    list.innerHTML = '<p style="color:#333;font-size:14px;text-align:center;margin-top:20px;">No habits yet. Add one!</p>';
    return;
  }

  // Loop through each habit and build its card
  habits.forEach(habit => {
    const card = document.createElement("div");
    card.className = "habit-card";

    // Build streak display — show fire emoji and count if streak > 0
    const streakHTML = habit.streak > 0
      ? `<span style="font-size:13px;color:#f97316;font-weight:600;">🔥 ${habit.streak} day streak</span>`
      : "";

    // Best streak badge — show if they have a best streak recorded
    const bestStreakHTML = habit.bestStreak > 1
      ? `<span style="font-size:11px;color:#a78bfa;" title="Your best streak">⭐ Best: ${habit.bestStreak}</span>`
      : "";

    // Every card has a header with the name, streak, type tag, and delete button
    card.innerHTML = `
      <div class="habit-header">
        <span class="habit-name">${habit.name}</span>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          ${bestStreakHTML}
          ${streakHTML}
          <span class="habit-type-tag">${labelFor(habit.type)}</span>
          <button class="delete-btn" onclick="deleteHabit(${habit.id})">✕</button>
        </div>
      </div>
    `;

    // Add the body of the card based on habit type
    if (habit.type === "slider")   card.appendChild(buildSlider(habit));
    if (habit.type === "quit")     card.appendChild(buildQuit(habit));
    if (habit.type === "checkbox") card.appendChild(buildCheckbox(habit));

    list.appendChild(card);
  });
}

// Returns a short label for each habit type
function labelFor(type) {
  if (type === "slider")   return "Tracker";
  if (type === "quit")     return "Quit";
  if (type === "checkbox") return "Task";
  return type;
}


// ============================================================
//  SLIDER CARD — drag to track progress (e.g. water, steps)
// ============================================================

function buildSlider(habit) {
  const div = document.createElement("div");
  div.className = "slider-section";

  // How far through the goal are we? (as a percentage)
  const pct = Math.round((habit.current / habit.goalVal) * 100);

  div.innerHTML = `
    <div class="slider-value" id="sv-${habit.id}">${habit.current} ${habit.unit}</div>
    <div class="slider-labels">
      <span>0</span>
      <span>Goal: ${habit.goalVal} ${habit.unit}</span>
      <span>${habit.max}</span>
    </div>
    <input type="range" min="0" max="${habit.max}" step="0.1"
      value="${habit.current}"
      oninput="updateSlider(${habit.id}, this.value)" />
    <div style="font-size:12px;color:${pct >= 100 ? '#22c55e' : '#555'};margin-top:6px;">
      ${pct >= 100 ? "✅ Goal reached!" : pct + "% of daily goal"}
    </div>
  `;
  return div;
}

// Called every time the slider moves — updates the displayed value and checks streak
function updateSlider(id, value) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  habit.current = parseFloat(value);
  document.getElementById("sv-" + id).textContent = `${habit.current} ${habit.unit}`;

  // Check if goal is met and update streak
  const goalMet = habit.current >= habit.goalVal;
  updateStreak(habit, goalMet);

  saveHabits();
  // Re-render only if streak changed (to update the fire badge without breaking the slider)
  if (goalMet && habit.completedToday) renderHabits();
}


// ============================================================
//  QUIT CARD — track reduction over weeks (e.g. smoking)
// ============================================================

function buildQuit(habit) {
  const div = document.createElement("div");
  div.className = "quit-section";

  // Figure out which week we're currently in
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekIndex = Math.min(
    Math.floor((Date.now() - new Date(habit.startDate)) / msPerWeek),
    habit.weeks - 1
  );

  // What's the target for this week?
  const thisWeekTarget = habit.weekPlan[weekIndex]?.dailyTarget ?? 0;

  // Overall progress percentage
  const progressPct = Math.round(
    ((habit.startAmount - habit.todayCount) / habit.startAmount) * 100
  );

  // Build the week plan list
  let planHTML = habit.weekPlan.map((w, i) => `
    <span style="color:${i === weekIndex ? '#2563eb' : '#333'}">
      Week ${w.week}: ${w.dailyTarget}/day${i === weekIndex ? " — you are here" : ""}
    </span>
  `).join("");

  div.innerHTML = `
    <div class="quit-progress">
      <span>Today: <b>${habit.todayCount}</b></span>
      <span>This week's target: <b>${thisWeekTarget}</b></span>
      <span>Started at: ${habit.startAmount}</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${Math.min(progressPct, 100)}%"></div>
    </div>
    <div style="font-size:12px;color:#555;margin-top:4px;">${progressPct}% progress toward quitting</div>
    <div class="quit-today">
      <span>Today I had:</span>
      <input type="number" id="qt-${habit.id}" value="${habit.todayCount}" min="0" />
      <button onclick="updateQuit(${habit.id})">Update</button>
    </div>
    <div class="week-plan">${planHTML}</div>
  `;
  return div;
}

// Called when the user updates today's count for a quit habit
function updateQuit(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  habit.todayCount = parseInt(document.getElementById("qt-" + id).value) || 0;

  // Check if user is at or below this week's target (goal met = lower is better)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekIndex = Math.min(
    Math.floor((Date.now() - new Date(habit.startDate)) / msPerWeek),
    habit.weeks - 1
  );
  const target = habit.weekPlan[weekIndex]?.dailyTarget ?? 0;
  const goalMet = habit.todayCount <= target;
  updateStreak(habit, goalMet);

  saveHabits();
  renderHabits();
}


// ============================================================
//  CHECKBOX CARD — simple done / not done habit
// ============================================================

function buildCheckbox(habit) {
  const div = document.createElement("div");
  div.className = "check-section";

  div.innerHTML = `
    <input type="checkbox" class="big-check"
      ${habit.done ? "checked" : ""}
      onchange="toggleCheckbox(${habit.id}, this.checked)" />
    <span class="check-label"
      style="text-decoration:${habit.done ? 'line-through' : 'none'};
             color:${habit.done ? '#22c55e' : '#ccc'}">
      ${habit.desc || "Mark as done"}
    </span>
  `;
  return div;
}

// Called when the user checks or unchecks a checkbox habit
function toggleCheckbox(id, checked) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  habit.done = checked;
  updateStreak(habit, checked); // checking = goal met, unchecking = not
  saveHabits();
  renderHabits();
}


// ============================================================
//  SAVE & LOAD — persist habits to localStorage
// ============================================================

// Saves the habits array as a JSON string in the browser
function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

// Loads habits from the browser and parses them back into an array
function loadHabits() {
  const saved = localStorage.getItem("habits");
  if (saved) habits = JSON.parse(saved);
}


// ============================================================
//  AI COACH — sends habit + profile data to Groq API
// ============================================================

// Builds a text summary of the user's profile for the AI prompt
function getProfileText() {
  const p = JSON.parse(localStorage.getItem("profile") || "{}");
  if (!p.name) return "No profile saved yet.";
  return `Name: ${p.name}, Gender: ${p.gender}, Age: ${p.age}, Weight: ${p.weight}kg, Height: ${p.height}cm, Goal: ${p.goal}`;
}

// Builds a text summary of today's habit progress for the AI prompt
function getHabitsText() {
  if (habits.length === 0) return "No habits tracked yet.";

  return habits.map(h => {
    if (h.type === "slider")
      return `${h.name}: ${h.current} out of ${h.goalVal} ${h.unit} today (streak: ${h.streak || 0} days)`;
    if (h.type === "quit")
      return `${h.name}: had ${h.todayCount} today (started at ${h.startAmount}, goal is 0 in ${h.weeks} weeks, streak: ${h.streak || 0} days)`;
    if (h.type === "checkbox")
      return `${h.name}: ${h.done ? "done" : "not done yet"} (streak: ${h.streak || 0} days)`;
    return h.name;
  }).join("\n");
}

// The actual API call — sends a prompt to Groq and returns the response
async function callAI(prompt) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Groq API error");
  }

  return data.choices[0].message.content;
}

// Shows the AI response on screen
function showAIResult(text) {
  const out = document.getElementById("ai-output");
  out.textContent = text;
  out.style.display = "block";
  document.getElementById("ai-loading").style.display = "none";
}

// Shows "Thinking..." while waiting for the AI
function showAILoading() {
  document.getElementById("ai-loading").style.display = "block";
  document.getElementById("ai-output").style.display = "none";
}

// Button 1 — generates a plan for tomorrow based on today's progress
async function getTomorrowPlan() {
  showAILoading();

  const prompt = `
You are a helpful health coach. Based on this user's profile and today's habit progress,
create a short practical plan for tomorrow. Be specific and encouraging.
If they have any active streaks, acknowledge them and encourage keeping them going.

USER PROFILE:
${getProfileText()}

TODAY'S HABITS:
${getHabitsText()}

Write a short tomorrow's plan (5 to 8 bullet points). Keep it motivating and personal.
  `;

  try {
    const result = await callAI(prompt);
    showAIResult(result);
  } catch (e) {
    // If something goes wrong, show the error instead of crashing
    showAIResult("Could not reach AI. Check your API key in app.js\n\nError: " + e.message);
  }
}

// Button 2 — gives one specific tip based on today's progress
async function getDailyTip() {
  showAILoading();

  const prompt = `
You are a concise health coach. Based on this user's profile and habits,
give ONE specific actionable tip for today. Maximum 3 sentences.
If they have an active streak on any habit, mention it briefly to keep them motivated.

USER PROFILE:
${getProfileText()}

TODAY'S HABITS:
${getHabitsText()}
  `;

  try {
    const result = await callAI(prompt);
    showAIResult(result);
  } catch (e) {
    showAIResult("Could not reach AI. Check your API key in app.js\n\nError: " + e.message);
  }
}

// ============================================================
//  POMODORO FOCUS MODE
// ============================================================

const WORK_MINS = 25;
const BREAK_MINS = 5;
const TOTAL_SESSIONS = 4;
const RING_CIRCUMFERENCE = 339.3;

let focusInterval = null;
let focusRunning  = false;
let focusIsBreak  = false;
let focusSession  = 0;
let focusSecsLeft = WORK_MINS * 60;

function openFocus() {
  document.getElementById("focus-overlay").classList.add("open");
  updateFocusDisplay();
}

function closeFocus() {
  document.getElementById("focus-overlay").classList.remove("open");
  pauseFocus();
}

function toggleFocus() {
  focusRunning ? pauseFocus() : startFocus();
}

function startFocus() {
  focusRunning = true;
  document.getElementById("focus-start-btn").textContent = "⏸ Pause";
  focusInterval = setInterval(() => {
    focusSecsLeft--;
    if (focusSecsLeft <= 0) {
      clearInterval(focusInterval);
      focusRunning = false;
      playBeep();
      if (!focusIsBreak) {
        markSessionDone(focusSession);
        if (focusSession < TOTAL_SESSIONS - 1) {
          focusIsBreak = true;
          focusSecsLeft = BREAK_MINS * 60;
          updateFocusDisplay();
          startFocus();
        } else {
          focusSession = 0; focusIsBreak = false;
          focusSecsLeft = WORK_MINS * 60;
          updateFocusDisplay();
          document.getElementById("focus-start-btn").textContent = "▶ Start";
          resetDots();
        }
      } else {
        focusIsBreak = false;
        focusSession++;
        focusSecsLeft = WORK_MINS * 60;
        updateFocusDisplay();
        document.getElementById("focus-start-btn").textContent = "▶ Start";
      }
      return;
    }
    updateFocusDisplay();
  }, 1000);
}

function pauseFocus() {
  clearInterval(focusInterval);
  focusRunning = false;
  document.getElementById("focus-start-btn").textContent = "▶ Start";
}

function resetFocus() {
  pauseFocus();
  focusSession = 0; focusIsBreak = false;
  focusSecsLeft = WORK_MINS * 60;
  resetDots(); updateFocusDisplay();
}

function updateFocusDisplay() {
  const mins = Math.floor(focusSecsLeft / 60);
  const secs = focusSecsLeft % 60;
  document.getElementById("focus-timer").textContent =
    String(mins).padStart(2,"0") + ":" + String(secs).padStart(2,"0");

  const label    = document.getElementById("focus-mode-label");
  const ringFill = document.getElementById("focus-ring-fill");

  if (focusIsBreak) {
    label.textContent = "BREAK"; label.className = "focus-mode-label break";
    ringFill.className = "focus-ring-fill break";
  } else {
    label.textContent = "WORK SESSION"; label.className = "focus-mode-label";
    ringFill.className = "focus-ring-fill";
  }

  document.getElementById("focus-session-count").textContent = focusIsBreak
    ? "Break — next: Session " + (focusSession + 2)
    : "Session " + (focusSession + 1) + " of " + TOTAL_SESSIONS;

  const total = focusIsBreak ? BREAK_MINS * 60 : WORK_MINS * 60;
  const offset = RING_CIRCUMFERENCE - ((total - focusSecsLeft) / total) * RING_CIRCUMFERENCE;
  ringFill.style.strokeDashoffset = offset;

  for (let i = 0; i < TOTAL_SESSIONS; i++) {
    const dot = document.getElementById("fdot-" + i);
    if (!dot) continue;
    dot.className = i < focusSession ? "focus-dot done" : i === focusSession ? "focus-dot active" : "focus-dot";
  }
}

function markSessionDone(i) {
  const dot = document.getElementById("fdot-" + i);
  if (dot) dot.className = "focus-dot done";
}

function resetDots() {
  for (let i = 0; i < TOTAL_SESSIONS; i++) {
    const dot = document.getElementById("fdot-" + i);
    if (dot) dot.className = i === 0 ? "focus-dot active" : "focus-dot";
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
  } catch(e) {}
}
