/**
 * AI Engineer OS — Intake Route
 * 
 * This is the smart front door. Instead of filling out forms,
 * you describe what you need in plain English (or broken English, 
 * voice-to-text, whatever) and the AI figures out:
 * - What kind of task this is
 * - What questions to ask next
 * - Pre-filled selectable choices
 * - Confidence level it understood you
 */

const router = require('express').Router();
const { callClaudeJSON, callClaude } = require('../services/ai');

const INTAKE_SYSTEM = `You are the intake brain for an AI Engineering OS. Your job is to understand what Travis needs — even if described vaguely, in broken sentences, or via voice-to-text — and classify it into actionable work.

Travis is an AI engineer. He builds AI systems, takes client contracts, does prompt engineering, code reviews, system design, RAG pipelines, evals, documentation, debugging, fine-tuning strategy, and AI architecture work.

When he says something like:
- "fix this prompt it's not working" → prompt_engineering, needs prompt pasted
- "client wants a chatbot for their website" → architecture + documentation  
- "is this code good" → code_review
- "compare models for my use case" → research
- "the output is hallucinating" → debugging
- "write me a proposal" → documentation
- "level up this system" → architecture + code_review
- "build me something for X" → architecture

Your job: Analyze the input and return a structured intake form WITH pre-filled suggestions so Travis just picks and confirms rather than typing everything from scratch.

Return JSON exactly like this:
{
  "understood": "Plain English summary of what you think they want",
  "confidence": "high|medium|low",
  "taskType": "prompt_engineering|code_review|architecture|evaluation|documentation|research|debugging|fine_tuning|rag_design|general",
  "suggestedTitle": "A good title for this task",
  "suggestedPriority": "urgent|high|normal|low",
  "questionnaire": [
    {
      "id": "client",
      "question": "Who is this for?",
      "type": "choice",
      "choices": ["Personal/Portfolio", "Client Work", "Job Application"],
      "required": true
    },
    {
      "id": "scope",
      "question": "What level of output do you need?",
      "type": "choice", 
      "choices": ["Quick answer/advice", "Full deliverable (paste-ready)", "Complete project package"],
      "required": true
    }
  ],
  "autoFilled": {
    "type": "already determined from input",
    "title": "already determined from input"
  },
  "readyToRun": false,
  "missingInfo": ["list of what else is needed to execute"]
}`;

// POST /api/intake/analyze
// Send: { input: "describe what you need in any words" }
// Returns: questionnaire with pre-filled choices
router.post('/analyze', async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'input required' });

  try {
    const result = await callClaudeJSON(
      `Analyze this request and return the intake form:\n\n"${input}"`,
      INTAKE_SYSTEM,
      {
        understood: input,
        confidence: 'low',
        taskType: 'general',
        suggestedTitle: 'New Task',
        suggestedPriority: 'normal',
        questionnaire: [],
        autoFilled: {},
        readyToRun: false,
        missingInfo: ['Please describe what you need']
      }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/intake/complete
// Send: { original: "...", answers: { client: "...", scope: "...", ... } }
// Returns: final task ready to execute
router.post('/complete', async (req, res) => {
  const { original, taskType, suggestedTitle, answers } = req.body;
  if (!original) return res.status(400).json({ error: 'original input required' });

  const COMPLETE_SYSTEM = `You are building a complete, detailed AI engineering task brief from a short description and questionnaire answers.

Expand the input into a full, detailed task description that gives enough context for an expert AI engineer to deliver production-quality work. Be specific, technical, and thorough. Include any implicit requirements you can infer.`;

  try {
    const result = await callClaude(
      `Original request: "${original}"\nTask type: ${taskType}\nAnswers: ${JSON.stringify(answers, null, 2)}\n\nBuild a complete, detailed task description.`,
      [],
      COMPLETE_SYSTEM,
      { maxTokens: 800 }
    );

    res.json({
      title: suggestedTitle || 'AI Engineering Task',
      type: taskType || 'general',
      description: result.text,
      priority: answers?.priority || 'normal',
      client: answers?.client || 'personal',
      ready: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/intake/quick
// For when confidence is high — skip questionnaire and go straight to task
router.post('/quick', async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'input required' });

  const QUICK_SYSTEM = `You are an AI engineering task builder. Convert a brief description into a complete task JSON ready for execution. Be thorough in the description — expand what was asked into full requirements.

Return JSON: { title: string, type: string, description: string, priority: string }`;

  try {
    const result = await callClaudeJSON(
      `Convert this to a complete task: "${input}"`,
      QUICK_SYSTEM,
      { title: input.slice(0, 60), type: 'general', description: input, priority: 'normal' }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
