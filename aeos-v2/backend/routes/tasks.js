const router = require('express').Router();
const { callClaude, callClaudeJSON } = require('../services/ai');
const { addTask, getTasks, updateTask, getTask } = require('../lib/store');
const { saveOutput } = require('../lib/fileOutput');

const TASK_SYSTEM = `You are a senior AI Engineer delivering production work for a client.

Your output must be COMPLETE and IMMEDIATELY USABLE — not a summary, not bullet points of what to do.

TASK TYPES AND WHAT COMPLETE MEANS:

prompt_engineering → Deliver the actual optimized prompts, ready to paste. Include: system prompt, user prompt template, few-shot examples if needed, notes on what changed and why.

code_review → Full scored review (X/10). List every issue with line numbers. Give the FIXED version of the code, not just notes.

architecture → Full architecture doc with: system diagram (Mermaid or ASCII), component descriptions, tech choices with justification, data flow, API contracts, deployment plan.

evaluation → Complete eval plan WITH test cases written out. Include: metrics, scoring rubric, sample inputs/outputs, pass/fail criteria.

documentation → Full document ready to send to client. Write the entire thing. Professional, complete.

research → Thorough technical comparison. Include: decision matrix, pros/cons table, recommendation with reasoning, cost analysis.

debugging → Root cause analysis + the fix. Give corrected code or prompt. Explain why it was failing.

fine_tuning → Full strategy: when to fine-tune vs RAG, dataset requirements, training approach, eval plan, estimated costs, timeline.

rag_design → Complete RAG system design: chunking strategy, embedding model selection, vector DB recommendation, retrieval strategy, reranking approach, eval methodology, estimated costs.

ALWAYS end with:
---
**Deliverable Summary:** One sentence of what was produced.
**Client Handoff Ready:** Yes/No and why if No.`;

// GET /api/tasks
router.get('/', (req, res) => {
  const { status } = req.query;
  res.json({ tasks: getTasks(status ? { status } : {}) });
});

// POST /api/tasks — create and auto-run a task
router.post('/', async (req, res) => {
  const { title, type, description, priority = 'normal', autoRun = true, client = 'personal' } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });

  const task = addTask({ title, type: type || 'general', description, priority, status: 'pending', client });

  if (!autoRun) return res.json({ task });

  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString() });

  try {
    const prompt = `CLIENT: ${client}\nTASK TYPE: ${task.type}\nTASK TITLE: ${task.title}\nPRIORITY: ${priority}\n\nTASK DESCRIPTION:\n${task.description}\n\nDeliver complete, production-ready, client-handoff-quality output now.`;
    const result = await callClaude(prompt, [], TASK_SYSTEM, { maxTokens: 4000 });

    const updated = updateTask(task.id, {
      status: 'complete',
      output: result.text,
      completedAt: new Date().toISOString(),
      tokens: result.tokens,
      client
    });

    // Save to structured file system
    const filePath = saveOutput(updated);
    if (filePath) updateTask(task.id, { filePath });

    res.json({ task: getTask(task.id) });
  } catch (err) {
    updateTask(task.id, { status: 'failed', error: err.message });
    res.status(500).json({ error: err.message, task: getTask(task.id) });
  }
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'task not found' });
  res.json({ task });
});

// POST /api/tasks/:id/run — re-run a task
router.post('/:id/run', async (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'task not found' });

  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString() });

  try {
    const prompt = `CLIENT: ${task.client || 'personal'}\nTASK TYPE: ${task.type}\nTASK TITLE: ${task.title}\n\nTASK DESCRIPTION:\n${task.description}\n\nDeliver complete, production-ready output now.`;
    const result = await callClaude(prompt, [], TASK_SYSTEM, { maxTokens: 4000 });
    const updated = updateTask(task.id, { status: 'complete', output: result.text, completedAt: new Date().toISOString(), tokens: result.tokens });
    const filePath = saveOutput(updated);
    if (filePath) updateTask(task.id, { filePath });
    res.json({ task: getTask(task.id) });
  } catch (err) {
    updateTask(task.id, { status: 'failed', error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', (req, res) => {
  const task = updateTask(req.params.id, req.body);
  if (!task) return res.status(404).json({ error: 'task not found' });
  res.json({ task });
});

module.exports = router;
