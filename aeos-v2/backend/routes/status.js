const router = require('express').Router();
const { getTasks, getMemory, getEvals, getDocs } = require('../lib/store');

router.get('/', (req, res) => {
  const tasks = getTasks();
  res.json({
    system: 'AI Engineer OS',
    version: '1.0.0',
    ai: process.env.ANTHROPIC_API_KEY ? 'live' : 'demo',
    model: process.env.AI_MODEL || 'claude-sonnet-4-6',
    stats: {
      tasks: { total: tasks.length, pending: tasks.filter(t => t.status === 'pending').length, complete: tasks.filter(t => t.status === 'complete').length, failed: tasks.filter(t => t.status === 'failed').length },
      memory: getMemory().length,
      evals: getEvals().length,
      docs: getDocs().length,
    },
    ts: new Date().toISOString()
  });
});

module.exports = router;
