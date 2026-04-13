const router = require('express').Router();
const { callClaude } = require('../services/ai');
const { addChat, getHistory, addMemory } = require('../lib/store');

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const history = getHistory(20);

  // Inject relevant context if provided
  const fullMessage = context
    ? `CONTEXT FROM TASK/PROJECT:\n${context}\n\n---\nMY REQUEST:\n${message}`
    : message;

  addChat({ role: 'user', content: message });

  try {
    const result = await callClaude(fullMessage, history);
    addChat({ role: 'assistant', content: result.text });

    // Auto-save important responses to memory
    if (result.text.length > 300) {
      addMemory({
        type: 'conversation',
        content: `Q: ${message.slice(0, 100)}\nA: ${result.text.slice(0, 300)}`,
        tags: ['chat', 'auto']
      });
    }

    res.json({ response: result.text, model: result.model, tokens: result.tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/history
router.get('/history', (req, res) => {
  res.json({ history: getHistory(50) });
});

// DELETE /api/chat/history
router.delete('/history', (req, res) => {
  // Clear handled via store reset
  res.json({ cleared: true });
});

module.exports = router;
