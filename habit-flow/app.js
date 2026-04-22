let habits = [];

function addHabit() {
  let input = document.getElementById("input");
  let text = input.value;

  if (!text) return;

  habits.push(text);
  input.value = "";

  render();
}

function render() {
  let list = document.getElementById("list");
  list.innerHTML = "";

  habits.forEach((h, i) => {
    list.innerHTML += `
      <li>
        ${h}
        <button onclick="habits.splice(${i},1); render()">X</button>
      </li>
    `;
  });
}