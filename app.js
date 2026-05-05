// List where all the habits will be saved
let habits = [];

// When the page opens, load saved habits
window.onload = function () {
  loadHabits();
  renderHabits();
};

// Add a new habit
function addHabit() {
  const input = document.getElementById("input");
  const habitText = input.value.trim();

  // Do not add an empty habit
  if (habitText === "") {
    return;
  }

  // Add the habit to the list
  habits.push({
    text: habitText,
    completed: false
  });

  // Clear the input box
  input.value = "";

  saveHabits();
  renderHabits();
}

// Delete a habit
function deleteHabit(index) {
  habits.splice(index, 1);

  saveHabits();
  renderHabits();
}

// Mark a habit as complete or incomplete
function toggleHabit(index) {
  habits[index].completed = !habits[index].completed;

  saveHabits();
  renderHabits();
}

// Save habits in localStorage
function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

// Load habits from localStorage
function loadHabits() {
  const savedHabits = localStorage.getItem("habits");

  if (savedHabits) {
    habits = JSON.parse(savedHabits);
  }
}

// Show the habits on the page
function renderHabits() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  habits.forEach(function (habit, index) {
    const li = document.createElement("li");
    li.textContent = habit.text;

    // If the habit is completed, add a class
    if (habit.completed) {
      li.classList.add("completed");
    }

    // Click on the habit to mark it complete/incomplete
    li.onclick = function () {
      toggleHabit(index);
    };

    // Create delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "x";

    // Delete the habit when clicking the button
    deleteButton.onclick = function (event) {
      event.stopPropagation();
      deleteHabit(index);
    };

    li.appendChild(deleteButton);
    list.appendChild(li);
  });
}
