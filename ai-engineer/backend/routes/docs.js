const router = require('express').Router();
const { callClaude } = require('../services/ai');
const { addDoc, getDocs, getDoc } = require('../lib/store');

const DOC_SYSTEM = `You are a senior AI engineer writing professional technical documentation. 

Your docs are:
- Clear and precise with correct technical terminology
- Structured with proper headers, sections, and examples
- Include architecture diagrams in Mermaid or ASCII when relevant
- Production-ready and client-deliverable
- Follow industry standards for AI/ML documentation`;

const DOC_TYPES = {
  readme: 'Write a comprehensive README for this AI project. Include: overview, architecture, setup, API reference, examples, and deployment.',
  proposal: 'Write a professional AI project proposal. Include: executive summary, problem statement, proposed solution, technical approach, timeline, risks, and pricing guidance.',
  architecture: 'Write a technical architecture document for this AI system. Include: system overview, component diagram (Mermaid), data flow, technology choices with justification, and scaling considerations.',
  runbook: 'Write an operational runbook for this AI system. Include: deployment steps, monitoring, common issues and fixes, rollback procedure, and health checks.',
  api: 'Write API documentation for this AI service. Include: endpoint reference, request/response schemas, authentication, rate limits, error codes, and code examples in Python and JavaScript.',
  evaluation: 'Write an LLM evaluation plan and report. Include: evaluation methodology, metrics, test cases, results analysis, and recommendations.',
  fine_tuning: 'Write a fine-tuning strategy document. Include: when to fine-tune vs RAG, dataset requirements, training approach, evaluation plan, and deployment strategy.',
  rag: 'Write a RAG system design document. Include: chunking strategy, embedding model selection, vector DB choice, retrieval strategy, reranking, and evaluation approach.',
};

// POST /api/docs/generate
router.post('/generate', async (req, res) => {
  const { type, description, title, details } = req.body;
  if (!type || !description) return res.status(400).json({ error: 'type and description required' });

  const docInstruction = DOC_TYPES[type] || 'Write comprehensive technical documentation for this AI system.';
  const prompt = `${docInstruction}\n\nPROJECT/SYSTEM DESCRIPTION:\n${description}${details ? `\n\nADDITIONAL DETAILS:\n${details}` : ''}`;

  try {
    const result = await callClaude(prompt, [], DOC_SYSTEM, { maxTokens: 4000 });
    const doc = addDoc({ type, title: title || `${type} — ${new Date().toLocaleDateString()}`, content: result.text, description });
    res.json({ doc, model: result.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docs/prompt-library — generate a prompt library
router.post('/prompt-library', async (req, res) => {
  const { useCase, count = 5 } = req.body;
  if (!useCase) return res.status(400).json({ error: 'useCase required' });

  const libSystem = `You are a prompt engineering expert. Generate a professional prompt library with system prompts, user prompt templates, and few-shot examples. Format each prompt clearly with name, purpose, the prompt itself, and usage notes.`;
  const prompt = `Generate ${count} production-ready prompts for this use case:\n\n${useCase}\n\nFor each prompt include: name, purpose, system prompt, user prompt template, example input/output, and optimization notes.`;

  try {
    const result = await callClaude(prompt, [], libSystem, { maxTokens: 4000 });
    const doc = addDoc({ type: 'prompt-library', title: `Prompt Library: ${useCase.slice(0, 50)}`, content: result.text });
    res.json({ doc, model: result.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docs
router.get('/', (req, res) => res.json({ docs: getDocs() }));

// GET /api/docs/:id
router.get('/:id', (req, res) => {
  const doc = getDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'doc not found' });
  res.json({ doc });
});

module.exports = router;
