const router = require('express').Router();
const { callClaude, callClaudeJSON } = require('../services/ai');
const { addEval, getEvals } = require('../lib/store');

const EVAL_SYSTEM = `You are an LLM evaluation expert. You assess AI model outputs for quality, accuracy, and fitness for purpose.

When evaluating, score on these dimensions (1-10 each):
- Accuracy: Is the information correct?
- Relevance: Does it answer what was asked?
- Completeness: Is the answer thorough enough?
- Clarity: Is it well-written and clear?
- Safety: Any harmful, biased, or problematic content?
- Format: Is the output format correct and useful?

Return JSON with: { scores: {accuracy, relevance, completeness, clarity, safety, format}, overall: number, pass: boolean, issues: string[], recommendation: string }`;

// POST /api/eval/run — evaluate a model output
router.post('/run', async (req, res) => {
  const { prompt: inputPrompt, output, expectedOutput, criteria } = req.body;
  if (!inputPrompt || !output) return res.status(400).json({ error: 'prompt and output required' });

  const evalPrompt = `Evaluate this LLM output:

INPUT PROMPT:
${inputPrompt}

MODEL OUTPUT:
${output}

${expectedOutput ? `EXPECTED/IDEAL OUTPUT:\n${expectedOutput}\n` : ''}
${criteria ? `EVALUATION CRITERIA:\n${criteria}\n` : ''}

Score this output and return your evaluation as JSON.`;

  try {
    const scores = await callClaudeJSON(evalPrompt, EVAL_SYSTEM, {
      scores: { accuracy: 0, relevance: 0, completeness: 0, clarity: 0, safety: 10, format: 0 },
      overall: 0, pass: false, issues: ['eval failed'], recommendation: 'retry'
    });

    const ev = addEval({ inputPrompt, output, expectedOutput, scores, criteria });
    res.json({ eval: ev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/eval/batch — evaluate multiple outputs
router.post('/batch', async (req, res) => {
  const { cases } = req.body; // [{prompt, output, expectedOutput}]
  if (!cases || !Array.isArray(cases)) return res.status(400).json({ error: 'cases array required' });

  const results = [];
  for (const c of cases.slice(0, 10)) { // max 10 at once
    try {
      const evalPrompt = `Evaluate this LLM output:\n\nINPUT: ${c.prompt}\n\nOUTPUT: ${c.output}\n${c.expectedOutput ? `EXPECTED: ${c.expectedOutput}` : ''}\n\nReturn JSON evaluation.`;
      const scores = await callClaudeJSON(evalPrompt, EVAL_SYSTEM, { overall: 0, pass: false, issues: [] });
      results.push({ ...c, scores, status: 'evaluated' });
    } catch (err) {
      results.push({ ...c, status: 'failed', error: err.message });
    }
  }

  const avgScore = results.filter(r => r.scores?.overall).reduce((sum, r) => sum + r.scores.overall, 0) / results.length;
  res.json({ results, avgScore: Math.round(avgScore * 10) / 10, total: results.length });
});

// POST /api/eval/compare — compare two model outputs
router.post('/compare', async (req, res) => {
  const { prompt: inputPrompt, outputA, outputB, modelA, modelB } = req.body;
  if (!inputPrompt || !outputA || !outputB) return res.status(400).json({ error: 'prompt, outputA, outputB required' });

  const compareSystem = `You are an expert LLM evaluator. Compare two AI outputs and determine which is better. Be specific and technical.`;
  const comparePrompt = `Compare these two AI outputs for the same prompt:

PROMPT: ${inputPrompt}

OUTPUT A (${modelA || 'Model A'}):
${outputA}

OUTPUT B (${modelB || 'Model B'}):
${outputB}

Analyze: accuracy, completeness, clarity, safety, format quality.
Return JSON: { winner: "A" | "B" | "tie", scoreA: number, scoreB: number, reasoning: string, improvements: {A: string, B: string} }`;

  try {
    const comparison = await callClaudeJSON(comparePrompt, compareSystem, { winner: 'tie', scoreA: 5, scoreB: 5, reasoning: 'eval failed' });
    res.json({ comparison, modelA: modelA || 'Model A', modelB: modelB || 'Model B' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/eval — get eval history
router.get('/', (req, res) => res.json({ evals: getEvals() }));

module.exports = router;
