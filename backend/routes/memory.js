const router = require('express').Router();
const { addMemory, getMemory, searchMemory } = require('../lib/store');

router.get('/', (req, res) => res.json({ memory: getMemory(50) }));
router.post('/', (req, res) => {
  const { content, tags, type } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const m = addMemory({ content, tags: tags || [], type: type || 'manual' });
  res.json({ memory: m });
});
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  res.json({ results: searchMemory(q) });
});

module.exports = router;
