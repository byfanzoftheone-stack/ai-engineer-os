const router = require('express').Router();
const { callClaude } = require('../services/ai');
const { addMemory } = require('../lib/store');

const REVIEW_SYSTEM = `You are a senior AI Engineer performing a professional code or prompt review.

For CODE reviews, analyze:
- Correctness of AI/ML logic
- Prompt construction quality
- Error handling and edge cases
- Token efficiency
- Security (prompt injection risks, API key exposure)
- Performance and cost optimization
- Best practices for the framework/library used

For PROMPT reviews, analyze:
- Clarity and specificity
- Role definition effectiveness
- Output format instructions
- Edge case handling
- Jailbreak/injection resistance
- Token efficiency
- Suggested improvements with examples

Always give:
1. Overall Score: X/10
2. Summary (2-3 sentences)
3. Issues Found (numbered, with severity: critical/major/minor)
4. Improved Version (paste-ready fixed code or prompt)
5. Explanation of key changes`;

// POST /api/review/code
router.post('/code', async (req, res) => {
  const { code, language, context } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  const prompt = `Please review this ${language || 'code'}:\n\n\`\`\`${language || ''}\n${code}\n\`\`\`${context ? `\n\nContext: ${context}` : ''}`;

  try {
    const result = await callClaude(prompt, [], REVIEW_SYSTEM, { maxTokens: 3000 });
    addMemory({ type: 'review', content: `Code review: ${result.text.slice(0, 200)}`, tags: ['review', 'code'] });
    res.json({ review: result.text, model: result.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/review/prompt
router.post('/prompt', async (req, res) => {
  const { prompt: userPrompt, goal, model } = req.body;
  if (!userPrompt) return res.status(400).json({ error: 'prompt required' });

  const reviewPrompt = `Please review this AI prompt${model ? ` (target model: ${model})` : ''}:\n\n---PROMPT START---\n${userPrompt}\n---PROMPT END---${goal ? `\n\nGoal of this prompt: ${goal}` : ''}`;

  try {
    const result = await callClaude(reviewPrompt, [], REVIEW_SYSTEM, { maxTokens: 3000 });
    addMemory({ type: 'review', content: `Prompt review: ${result.text.slice(0, 200)}`, tags: ['review', 'prompt'] });
    res.json({ review: result.text, model: result.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/review/architecture
router.post('/architecture', async (req, res) => {
  const { description, diagram } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });

  const archSystem = `You are a senior AI systems architect. Review AI system architectures for scalability, reliability, cost, and correctness. Give specific technical recommendations.`;
  const prompt = `Review this AI system architecture:\n\n${description}${diagram ? `\n\nDiagram:\n${diagram}` : ''}`;

  try {
    const result = await callClaude(prompt, [], archSystem, { maxTokens: 3000 });
    res.json({ review: result.text, model: result.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
