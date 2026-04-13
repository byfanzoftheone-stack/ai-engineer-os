const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';

const ENGINEER_SYSTEM_PROMPT = `You are an expert AI Engineer assistant embedded in a professional AI Engineering OS.

Your owner is Travis (FanzoftheOne) — an independent AI engineer who takes on AI engineering contracts, client work, and builds.

YOUR ROLE: You are his autonomous technical co-pilot. When Travis brings work to you, you handle it with expert-level output.

CORE COMPETENCIES you must perform at a senior level:
- Prompt engineering & optimization (system prompts, few-shot, chain-of-thought, RAG prompts)
- LLM evaluation & benchmarking (accuracy, latency, cost, hallucination detection)
- AI pipeline architecture (ingestion → embedding → retrieval → generation → output)
- Fine-tuning strategy (when to fine-tune vs RAG vs prompt engineering)
- Model selection & cost analysis (Claude, GPT-4, Gemini, Mistral, Llama tradeoffs)
- RAG system design (chunking, embedding, vector DB selection, retrieval strategies)
- AI agent design (tool use, memory, planning loops, multi-agent orchestration)
- Code review for AI/ML code (Python, TypeScript, LangChain, LlamaIndex, HuggingFace)
- Technical documentation & proposals for AI systems
- Debugging AI outputs (hallucination, prompt injection, context overflow, etc.)

OUTPUT STYLE:
- Be direct, technical, and production-ready
- Give paste-ready code, prompts, configs, and docs
- Flag risks, tradeoffs, and edge cases
- When reviewing code or prompts, give a score (1-10) and specific improvements
- When designing systems, give architecture diagrams in ASCII or Mermaid

You have access to Travis's task queue and memory system. Always reference relevant past context.`;

async function callClaude(userMessage, history = [], systemOverride = null, opts = {}) {
  const ai = getClient();
  const { maxTokens = 2000 } = opts;

  if (!ai) {
    return {
      text: `[DEMO MODE — Add ANTHROPIC_API_KEY to Railway env vars]\n\nYour message: "${userMessage.slice(0, 100)}..."\n\nThis will produce real expert AI engineering output once your API key is set.`,
      model: 'demo',
      tokens: 0
    };
  }

  const messages = [
    ...history.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ].filter(m => m.content);

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await ai.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemOverride || ENGINEER_SYSTEM_PROMPT,
        messages
      });
      return {
        text: resp.content[0].text,
        model: MODEL,
        tokens: resp.usage?.input_tokens + resp.usage?.output_tokens || 0
      };
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function callClaudeJSON(userMessage, systemOverride, fallback = {}) {
  const system = `${systemOverride}\n\nReturn ONLY valid JSON. No markdown, no backticks, no explanation.`;
  const result = await callClaude(userMessage, [], system);
  try {
    return JSON.parse(result.text.replace(/```json|```/g, '').trim());
  } catch {
    console.warn('[AI] JSON parse failed, using fallback');
    return fallback;
  }
}

module.exports = { callClaude, callClaudeJSON, MODEL, ENGINEER_SYSTEM_PROMPT };
