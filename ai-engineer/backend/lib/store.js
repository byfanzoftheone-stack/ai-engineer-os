/**
 * AI Engineer OS — In-Memory Store
 * Persists within Railway instance. Reset on redeploy.
 * For production: swap with PostgreSQL/Redis.
 */

const store = {
  tasks: [],
  memory: [],
  chatHistory: [],
  evals: [],
  docs: [],
};

// TASKS
function addTask(task) {
  const t = { id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'pending', ...task };
  store.tasks.unshift(t);
  return t;
}
function getTasks(filter = {}) {
  let tasks = [...store.tasks];
  if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
  return tasks.slice(0, 100);
}
function updateTask(id, updates) {
  const idx = store.tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  store.tasks[idx] = { ...store.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  return store.tasks[idx];
}
function getTask(id) { return store.tasks.find(t => t.id === id) || null; }

// MEMORY
function addMemory(entry) {
  const m = { id: Date.now().toString(), ts: new Date().toISOString(), ...entry };
  store.memory.unshift(m);
  if (store.memory.length > 500) store.memory = store.memory.slice(0, 500);
  return m;
}
function getMemory(limit = 20) { return store.memory.slice(0, limit); }
function searchMemory(query) {
  const q = query.toLowerCase();
  return store.memory.filter(m =>
    (m.content || '').toLowerCase().includes(q) ||
    (m.tags || []).some(t => t.toLowerCase().includes(q))
  ).slice(0, 10);
}

// CHAT HISTORY
function addChat(msg) {
  store.chatHistory.push({ ...msg, ts: new Date().toISOString() });
  if (store.chatHistory.length > 200) store.chatHistory = store.chatHistory.slice(-200);
}
function getHistory(limit = 30) { return store.chatHistory.slice(-limit); }

// EVALS
function addEval(ev) {
  const e = { id: Date.now().toString(), ts: new Date().toISOString(), ...ev };
  store.evals.unshift(e);
  return e;
}
function getEvals() { return store.evals.slice(0, 50); }

// DOCS
function addDoc(doc) {
  const d = { id: Date.now().toString(), ts: new Date().toISOString(), ...doc };
  store.docs.unshift(d);
  return d;
}
function getDocs() { return store.docs.slice(0, 50); }
function getDoc(id) { return store.docs.find(d => d.id === id) || null; }

module.exports = {
  addTask, getTasks, updateTask, getTask,
  addMemory, getMemory, searchMemory,
  addChat, getHistory,
  addEval, getEvals,
  addDoc, getDocs, getDoc,
};
