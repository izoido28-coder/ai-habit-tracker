let habits = [];

function addHabit() {
  const input = document.getElementById("input");
  const value = input.value.trim();

  if (value === "") return;

  habits.push(value);
  input.value = "";

  render();
}

function deleteHabit(index) {
  habits.splice(index, 1);
  render();
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  habits.forEach((habit, i) => {
    const li = document.createElement("li");
    li.textContent = habit;

    const btn = document.createElement("button");
    btn.textContent = "x";
    btn.onclick = () => deleteHabit(i);

    li.appendChild(btn);
    list.appendChild(li);
  });
}
