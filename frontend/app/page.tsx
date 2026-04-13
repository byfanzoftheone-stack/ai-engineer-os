'use client';
import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'chat' | 'tasks' | 'review' | 'eval' | 'docs' | 'status';
type Task = { id: string; title: string; type: string; description: string; status: string; output?: string; createdAt: string; priority: string; };
type ChatMsg = { role: 'user' | 'assistant'; content: string; ts?: string; };
type Doc = { id: string; type: string; title: string; content: string; ts: string; };

// ─── API helpers ──────────────────────────────────────────────────────────────
async function post(path: string, body: object) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
async function get(path: string) {
  const r = await fetch(path);
  return r.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: 'bg-green-900 text-green-300 border-green-700',
    pending: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    running: 'bg-blue-900 text-blue-300 border-blue-700',
    failed: 'bg-red-900 text-red-300 border-red-700',
    live: 'bg-green-900 text-green-300 border-green-700',
    demo: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${colors[status] || 'bg-gray-800 text-gray-400 border-gray-600'}`}>
      {status}
    </span>
  );
}

function Output({ text }: { text: string }) {
  return (
    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap">
      {text}
    </pre>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block" />;
}

// ─── CHAT TAB ─────────────────────────────────────────────────────────────────
function ChatTab() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', content: "I'm your AI Engineering co-pilot. Drop any AI engineering task — prompt optimization, code review, system design, eval setup, RAG architecture, model comparisons. I handle it." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMsgs(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const data = await post('/api/chat', { message: msg });
      setMsgs(m => [...m, { role: 'assistant', content: data.response || data.error || 'No response' }]);
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Connection error. Check backend.' }]);
    }
    setLoading(false);
  }

  const QUICK = [
    'Design a RAG pipeline for customer support',
    'Review this prompt: "You are a helpful assistant"',
    'Compare GPT-4o vs Claude Sonnet for code generation',
    'Write a fine-tuning strategy for sentiment classification',
    'How do I evaluate LLM output quality at scale?',
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-cyan-900 border border-cyan-700 text-cyan-100'
                : 'bg-gray-900 border border-gray-700 text-gray-200'
            }`}>
              {m.role === 'assistant' && <div className="text-xs text-cyan-500 font-mono mb-1">AI ENGINEER OS</div>}
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-2">
              <Spinner /><span className="text-sm text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK.map((q, i) => (
          <button key={i} onClick={() => setInput(q)}
            className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded-full hover:border-cyan-600 hover:text-cyan-400 transition-colors">
            {q.slice(0, 35)}...
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Drop your AI engineering task here... (Enter to send)"
          rows={3}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none"
        />
        <button onClick={send} disabled={loading || !input.trim()}
          className="px-4 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm transition-colors">
          {loading ? <Spinner /> : 'RUN →'}
        </button>
      </div>
    </div>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('prompt_engineering');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const data = await get('/api/tasks');
    if (data.tasks) setTasks(data.tasks);
  }

  async function submit() {
    if (!title.trim() || !desc.trim()) return;
    setLoading(true);
    const data = await post('/api/tasks', { title, description: desc, type, priority, autoRun: true });
    if (data.task) { setTasks(t => [data.task, ...t]); setSelected(data.task); setTitle(''); setDesc(''); }
    setLoading(false);
  }

  const TYPES = ['prompt_engineering','code_review','architecture','evaluation','documentation','research','debugging','fine_tuning','rag_design'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="space-y-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="text-xs font-mono text-cyan-500 tracking-widest">NEW TASK</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title"
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={e => setType(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-600">
              {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-600">
              <option value="low">Low Priority</option>
              <option value="normal">Normal</option>
              <option value="high">High Priority</option>
              <option value="urgent">URGENT</option>
            </select>
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the task in detail — what you need built, reviewed, designed, or documented..." rows={5}
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
          <button onClick={submit} disabled={loading || !title.trim() || !desc.trim()}
            className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Running...</> : 'EXECUTE TASK →'}
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-64">
          {tasks.map(t => (
            <div key={t.id} onClick={() => setSelected(t)}
              className={`bg-gray-900 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${selected?.id === t.id ? 'border-cyan-600' : 'border-gray-700 hover:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-200 truncate">{t.title}</span>
                <Badge status={t.status} />
              </div>
              <div className="text-xs text-gray-500 font-mono">{t.type.replace(/_/g,' ')} · {new Date(t.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          {tasks.length === 0 && <div className="text-sm text-gray-600 text-center py-8">No tasks yet. Submit your first AI engineering task above.</div>}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-y-auto">
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-200">{selected.title}</span>
              <Badge status={selected.status} />
            </div>
            <div className="text-xs text-gray-500 font-mono">{selected.type} · {selected.priority}</div>
            <div className="text-sm text-gray-400 bg-gray-950 rounded p-3">{selected.description}</div>
            {selected.output && <><div className="text-xs font-mono text-cyan-500">OUTPUT</div><Output text={selected.output} /></>}
            {selected.status === 'running' && <div className="flex items-center gap-2 text-sm text-cyan-400"><Spinner /> AI is working on this task...</div>}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">Select a task to view output</div>
        )}
      </div>
    </div>
  );
}

// ─── REVIEW TAB ───────────────────────────────────────────────────────────────
function ReviewTab() {
  const [reviewType, setReviewType] = useState<'code' | 'prompt' | 'architecture'>('code');
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!input.trim()) return;
    setLoading(true); setResult('');
    const body: Record<string, string> = reviewType === 'code'
      ? { code: input, context }
      : reviewType === 'prompt'
      ? { prompt: input, goal: context }
      : { description: input };
    const data = await post(`/api/review/${reviewType}`, body);
    setResult(data.review || data.error || 'Error');
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['code', 'prompt', 'architecture'] as const).map(t => (
          <button key={t} onClick={() => setReviewType(t)}
            className={`px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${reviewType === t ? 'bg-cyan-900 border-cyan-600 text-cyan-300' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={12}
            placeholder={reviewType === 'code' ? 'Paste your AI/ML code here...' : reviewType === 'prompt' ? 'Paste the prompt you want reviewed...' : 'Describe the AI system architecture...'}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none font-mono" />
          <input value={context} onChange={e => setContext(e.target.value)}
            placeholder={reviewType === 'code' ? 'Context (what this code does)' : reviewType === 'prompt' ? 'Goal of this prompt' : ''}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
          <button onClick={submit} disabled={loading || !input.trim()}
            className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Reviewing...</> : `REVIEW ${reviewType.toUpperCase()} →`}
          </button>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-y-auto max-h-96">
          {result ? <Output text={result} /> : <div className="text-gray-600 text-sm h-full flex items-center justify-center">Review output will appear here</div>}
        </div>
      </div>
    </div>
  );
}

// ─── EVAL TAB ─────────────────────────────────────────────────────────────────
function EvalTab() {
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [promptText, setPromptText] = useState('');
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');
  const [expected, setExpected] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function runEval() {
    if (!promptText.trim() || !outputA.trim()) return;
    setLoading(true); setResult(null);
    if (mode === 'single') {
      const data = await post('/api/eval/run', { prompt: promptText, output: outputA, expectedOutput: expected });
      setResult(data.eval || data);
    } else {
      const data = await post('/api/eval/compare', { prompt: promptText, outputA, outputB });
      setResult(data.comparison || data);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['single', 'compare'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${mode === m ? 'bg-cyan-900 border-cyan-600 text-cyan-300' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
            {m === 'single' ? 'EVALUATE OUTPUT' : 'COMPARE MODELS'}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <textarea value={promptText} onChange={e => setPromptText(e.target.value)} rows={3}
          placeholder="The prompt that was sent to the model..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
        <div className={`grid gap-3 ${mode === 'compare' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <textarea value={outputA} onChange={e => setOutputA(e.target.value)} rows={6}
            placeholder={mode === 'compare' ? 'Model A output...' : 'Model output to evaluate...'}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none font-mono" />
          {mode === 'compare' && (
            <textarea value={outputB} onChange={e => setOutputB(e.target.value)} rows={6}
              placeholder="Model B output..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none font-mono" />
          )}
        </div>
        {mode === 'single' && (
          <textarea value={expected} onChange={e => setExpected(e.target.value)} rows={2}
            placeholder="Expected/ideal output (optional)"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
        )}
        <button onClick={runEval} disabled={loading || !promptText.trim() || !outputA.trim()}
          className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm transition-colors flex items-center justify-center gap-2">
          {loading ? <><Spinner /> Evaluating...</> : 'RUN EVALUATION →'}
        </button>
        {result && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="text-xs font-mono text-cyan-500">EVALUATION RESULT</div>
            {'scores' in result && result.scores && typeof result.scores === 'object' && (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(result.scores as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="bg-gray-950 rounded p-2 text-center">
                    <div className="text-lg font-bold text-cyan-400">{v}<span className="text-xs text-gray-500">/10</span></div>
                    <div className="text-xs text-gray-500">{k}</div>
                  </div>
                ))}
              </div>
            )}
            {'overall' in result && <div className="text-center text-2xl font-bold text-cyan-400">Overall: {String(result.overall)}/10 — <Badge status={(result.pass as boolean) ? 'complete' : 'failed'} /></div>}
            {'winner' in result && <div className="text-center text-xl font-bold text-cyan-400">Winner: Model {String(result.winner)}</div>}
            {'reasoning' in result && <Output text={String(result.reasoning || '')} />}
            {'issues' in result && Array.isArray(result.issues) && result.issues.length > 0 && (
              <div className="space-y-1">{(result.issues as string[]).map((issue, i) => (
                <div key={i} className="text-sm text-red-400 bg-red-950 border border-red-900 rounded px-3 py-1">⚠ {issue}</div>
              ))}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DOCS TAB ─────────────────────────────────────────────────────────────────
function DocsTab() {
  const [docType, setDocType] = useState('readme');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadDocs(); }, []);
  async function loadDocs() {
    const data = await get('/api/docs');
    if (data.docs) setDocs(data.docs);
  }

  async function generate() {
    if (!description.trim()) return;
    setLoading(true);
    const data = await post('/api/docs', { type: docType, description, title });
    if (data.doc) { setDocs(d => [data.doc, ...d]); setSelected(data.doc); setDescription(''); setTitle(''); }
    setLoading(false);
  }

  const DOC_TYPES = ['readme','proposal','architecture','runbook','api','evaluation','fine_tuning','rag'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="space-y-3">
        <select value={docType} onChange={e => setDocType(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-600">
          {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ').toUpperCase()}</option>)}
        </select>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title (optional)"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
          placeholder="Describe your AI system, project, or what you need documented in detail..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
        <button onClick={generate} disabled={loading || !description.trim()}
          className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm transition-colors flex items-center justify-center gap-2">
          {loading ? <><Spinner /> Generating...</> : 'GENERATE DOC →'}
        </button>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {docs.map(d => (
            <div key={d.id} onClick={() => setSelected(d)}
              className={`bg-gray-900 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${selected?.id === d.id ? 'border-cyan-600' : 'border-gray-700 hover:border-gray-600'}`}>
              <div className="text-sm text-gray-200 truncate">{d.title}</div>
              <div className="text-xs text-gray-500 font-mono">{d.type} · {new Date(d.ts).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-y-auto">
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-200">{selected.title}</span>
              <button onClick={() => navigator.clipboard.writeText(selected.content)}
                className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded hover:text-cyan-400 hover:border-cyan-700 transition-colors">
                COPY
              </button>
            </div>
            <Output text={selected.content} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">Generated docs appear here</div>
        )}
      </div>
    </div>
  );
}

// ─── STATUS TAB ───────────────────────────────────────────────────────────────
function StatusTab() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function load() {
      const data = await get('/api/status');
      setStatus(data);
    }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (!status) return <div className="flex items-center gap-2 text-gray-400"><Spinner /> Loading system status...</div>;

  const stats = status.stats as Record<string, unknown> || {};
  const tasks = stats.tasks as Record<string, number> || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'SYSTEM', value: String(status.system || ''), sub: `v${String(status.version || '1.0')}` },
          { label: 'AI STATUS', value: <Badge status={String(status.ai || 'demo')} />, sub: String(status.model || '') },
          { label: 'TASKS DONE', value: String(tasks.complete || 0), sub: `${tasks.failed || 0} failed` },
          { label: 'MEMORY', value: String(stats.memory || 0), sub: 'entries stored' },
        ].map((card, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="text-xs font-mono text-gray-500 tracking-widest mb-2">{card.label}</div>
            <div className="text-xl font-bold text-cyan-400">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="text-xs font-mono text-cyan-500 tracking-widest mb-4">CAPABILITIES</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            ['💬 AI Chat', 'Expert AI engineering conversations'],
            ['⚡ Task Engine', 'Auto-execute AI engineering tasks'],
            ['🔍 Code Review', 'Scored AI/ML code reviews'],
            ['📝 Prompt Review', 'Optimize prompts with AI feedback'],
            ['📊 LLM Eval', 'Evaluate and compare model outputs'],
            ['📄 Doc Generator', 'READMEs, proposals, architecture docs'],
            ['🏗️ RAG Design', 'Full RAG pipeline architecture'],
            ['🎯 Fine-Tuning', 'Fine-tuning strategy & dataset plans'],
            ['🧠 Memory', 'Context persisted across sessions'],
          ].map(([name, desc], i) => (
            <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-200">{name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="text-xs font-mono text-cyan-500 tracking-widest mb-3">ENV VARS REQUIRED</div>
        <div className="space-y-2 font-mono text-sm">
          {[
            { key: 'ANTHROPIC_API_KEY', where: 'Railway', desc: 'Your Anthropic API key — required for AI to work' },
            { key: 'FRONTEND_URL', where: 'Railway', desc: 'Your Vercel URL e.g. https://ai-engineer.vercel.app' },
            { key: 'NEXT_PUBLIC_API_URL', where: 'Vercel', desc: 'Your Railway URL e.g. https://ai-engineer-production.up.railway.app' },
          ].map(v => (
            <div key={v.key} className="flex items-start gap-3 bg-gray-950 border border-gray-800 rounded p-3">
              <div className="text-cyan-400 min-w-fit">{v.key}</div>
              <div className="text-gray-500">→</div>
              <div>
                <span className="text-yellow-400 text-xs">[{v.where}]</span>
                <span className="text-gray-400 ml-2 text-xs">{v.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-600 font-mono text-center">
        Last updated: {new Date(String(status.ts || '')).toLocaleString()} · Auto-refreshes every 15s
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'chat',   label: 'AI Chat',   icon: '💬' },
  { id: 'tasks',  label: 'Tasks',     icon: '⚡' },
  { id: 'review', label: 'Review',    icon: '🔍' },
  { id: 'eval',   label: 'Eval',      icon: '📊' },
  { id: 'docs',   label: 'Docs',      icon: '📄' },
  { id: 'status', label: 'Status',    icon: '🟢' },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-cyan-500 tracking-widest">FANZOFTHEONE</div>
          <div className="text-lg font-bold text-white leading-tight">AI Engineer OS</div>
        </div>
        <div className="text-xs font-mono text-gray-600">YOUR AUTONOMOUS ENGINEERING CO-PILOT</div>
      </header>

      {/* Tab Bar */}
      <nav className="border-b border-gray-800 bg-gray-950 px-4 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="h-full overflow-y-auto">
          {tab === 'chat'   && <ChatTab />}
          {tab === 'tasks'  && <TasksTab />}
          {tab === 'review' && <ReviewTab />}
          {tab === 'eval'   && <EvalTab />}
          {tab === 'docs'   && <DocsTab />}
          {tab === 'status' && <StatusTab />}
        </div>
      </main>
    </div>
  );
}
