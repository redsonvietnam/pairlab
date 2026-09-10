const form = document.querySelector('#task-form');
const input = document.querySelector('#title');
const list = document.querySelector('#tasks');
const status = document.querySelector('#status');

function renderTasks(tasks) {
  list.replaceChildren();
  if (tasks.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No tasks yet.';
    empty.className = 'empty';
    list.append(empty);
    return;
  }

  for (const task of tasks) {
    const item = document.createElement('li');
    item.textContent = task.title;
    list.append(item);
  }
}

async function loadTasks() {
  status.textContent = 'Loading…';
  const response = await fetch('/api/tasks');
  if (!response.ok) throw new Error('Could not load tasks');
  renderTasks(await response.json());
  status.textContent = '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;

  status.textContent = 'Saving…';
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });

  if (!response.ok) {
    status.textContent = 'Could not save task.';
    return;
  }

  input.value = '';
  await loadTasks();
});

loadTasks().catch((error) => {
  console.error(error);
  status.textContent = 'Could not connect to the server.';
});
