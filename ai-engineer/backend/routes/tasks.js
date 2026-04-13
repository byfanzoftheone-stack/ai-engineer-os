const router = require('express').Router();
const { callClaude, callClaudeJSON } = require('../services/ai');
const { addTask, getTasks, updateTask, getTask } = require('../lib/store');

const TASK_SYSTEM = `You are an expert AI Engineer. Your job is to complete the following AI engineering task with production-quality output.

Task types you handle:
- prompt_engineering: Write, optimize, or debug prompts
- code_review: Review AI/ML code and give scored feedback
- architecture: Design AI system architectures  
- evaluation: Design or run LLM evaluation plans
- documentation: Write technical AI docs, READMEs, proposals
- research: Analyze AI approaches, compare models/techniques
- debugging: Debug AI pipeline issues, hallucinations, failures
- fine_tuning: Plan fine-tuning strategies and datasets
- rag_design: Design RAG pipelines and retrieval strategies

Always produce complete, paste-ready deliverables. Include code, diagrams, configs as needed.`;

// GET /api/tasks
router.get('/', (req, res) => {
  const { status } = req.query;
  res.json({ tasks: getTasks(status ? { status } : {}) });
});

// POST /api/tasks — create and auto-run a task
router.post('/', async (req, res) => {
  const { title, type, description, priority = 'normal', autoRun = true } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });

  const task = addTask({ title, type: type || 'general', description, priority, status: 'pending' });

  if (!autoRun) return res.json({ task });

  // Auto-execute the task
  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString() });

  try {
    const prompt = `TASK TYPE: ${task.type}\nTASK TITLE: ${task.title}\n\nTASK DESCRIPTION:\n${task.description}\n\nDeliver complete, production-ready output now.`;
    const result = await callClaude(prompt, [], TASK_SYSTEM, { maxTokens: 3000 });

    updateTask(task.id, {
      status: 'complete',
      output: result.text,
      completedAt: new Date().toISOString(),
      tokens: result.tokens
    });

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
    const prompt = `TASK TYPE: ${task.type}\nTASK TITLE: ${task.title}\n\nTASK DESCRIPTION:\n${task.description}\n\nDeliver complete, production-ready output now.`;
    const result = await callClaude(prompt, [], TASK_SYSTEM, { maxTokens: 3000 });
    updateTask(task.id, { status: 'complete', output: result.text, completedAt: new Date().toISOString() });
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
