const router = require('express').Router();
const { listOutputs, readOutput } = require('../lib/fileOutput');
const path = require('path');

// GET /api/outputs — list all saved outputs structured by client/date
router.get('/', (req, res) => {
  const outputs = listOutputs();
  res.json({ outputs, total: outputs.length });
});

// GET /api/outputs/content?path=...
router.get('/content', (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  const content = readOutput(filePath);
  if (!content) return res.status(404).json({ error: 'file not found' });
  res.json({ content, filePath });
});

module.exports = router;
