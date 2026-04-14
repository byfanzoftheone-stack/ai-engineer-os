'use client';
import { useState, useEffect, useRef } from 'react';

type Tab = 'intake' | 'chat' | 'tasks' | 'review' | 'eval' | 'docs' | 'outputs' | 'status';
type Task = { id: string; title: string; type: string; description: string; status: string; output?: string; createdAt: string; priority: string; client?: string; filePath?: string; tokens?: number; };
type ChatMsg = { role: 'user' | 'assistant'; content: string; };
type Doc = { id: string; type: string; title: string; content: string; ts: string; };
type OutputFile = { client: string; date: string; file: string; path: string; meta: Record<string, string>; };
type IntakeQuestion = { id: string; question: string; type: 'choice' | 'text'; choices?: string[]; required: boolean; };
type IntakeResult = { understood: string; confidence: string; taskType: string; suggestedTitle: string; suggestedPriority: string; questionnaire: IntakeQuestion[]; autoFilled: Record<string, string>; readyToRun: boolean; missingInfo: string[]; };

async function post(path: string, body: object) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
async function get(path: string) {
  const r = await fetch(path);
  return r.json();
}

function Badge({ status }: { status: string }) {
  const c: Record<string, string> = {
    complete: 'bg-green-900 text-green-300 border-green-700', pending: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    running: 'bg-blue-900 text-blue-300 border-blue-700 animate-pulse', failed: 'bg-red-900 text-red-300 border-red-700',
    live: 'bg-green-900 text-green-300 border-green-700', demo: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    high: 'bg-orange-900 text-orange-300 border-orange-700', urgent: 'bg-red-900 text-red-300 border-red-700',
    high_confidence: 'bg-green-900 text-green-300 border-green-700', medium: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    low: 'bg-gray-800 text-gray-400 border-gray-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded border font-mono ${c[status] || 'bg-gray-800 text-gray-400 border-gray-600'}`}>{status}</span>;
}
function Output({ text }: { text: string }) {
  return <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 overflow-auto max-h-[500px] leading-relaxed whitespace-pre-wrap font-mono">{text}</pre>;
}
function Spinner() { return <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block" />; }

// ─── INTAKE ───────────────────────────────────────────────────────────────────
function IntakeTab({ onTaskCreated }: { onTaskCreated: (t: Task) => void }) {
  const [step, setStep] = useState<'input' | 'questionnaire' | 'running' | 'done'>('input');
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [createdTask, setCreatedTask] = useState<Task | null>(null);

  const EXAMPLES = [
    "Fix my prompt, it keeps hallucinating",
    "Client wants a chatbot for their law firm",
    "Review this Python code that calls OpenAI",
    "I need a proposal for an AI project",
    "Compare Claude vs GPT-4 for my use case",
    "My RAG system returns wrong chunks",
    "Level up my system prompt",
    "Build something to automate content creation",
    "Evaluate whether my AI outputs are good quality",
    "Design a fine-tuning strategy for my model",
  ];

  async function analyze() {
    if (!input.trim()) return;
    setAnalyzing(true);
    const result = await post('/api/intake', { _endpoint: 'analyze', input });
    setIntake(result);
    setAnswers({ priority: result.suggestedPriority || 'normal' });
    setStep('questionnaire');
    setAnalyzing(false);
  }

  async function execute() {
    if (!intake) return;
    setStep('running');
    const completion = await post('/api/intake', { _endpoint: 'complete', original: input, taskType: intake.taskType, suggestedTitle: answers.title || intake.suggestedTitle, answers });
    const taskResult = await post('/api/tasks', { title: completion.title || intake.suggestedTitle, type: completion.type || intake.taskType, description: completion.description, priority: answers.priority || intake.suggestedPriority, client: answers.client || 'personal', autoRun: true });
    setCreatedTask(taskResult.task);
    setStep('done');
    if (taskResult.task) onTaskCreated(taskResult.task);
  }

  function reset() { setStep('input'); setInput(''); setIntake(null); setAnswers({}); setCreatedTask(null); }

  if (step === 'input') return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-gray-900 border border-cyan-900 rounded-xl p-5">
        <div className="text-xs font-mono text-cyan-500 tracking-widest mb-1">WHAT DO YOU NEED?</div>
        <p className="text-xs text-gray-500 mb-4">Say it any way — voice-to-text, broken sentences, vague or specific. AI figures it out and builds the task for you.</p>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder="e.g. 'fix my prompt' or 'client needs an AI chatbot' or 'review this code' ..."
          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
        <button onClick={analyze} disabled={analyzing || !input.trim()}
          className="mt-3 w-full py-3 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm transition-colors flex items-center justify-center gap-2">
          {analyzing ? <><Spinner /> Analyzing...</> : '⚡ ANALYZE & BUILD TASK →'}
        </button>
      </div>
      <div>
        <div className="text-xs font-mono text-gray-600 tracking-widest mb-3">OR TAP A COMMON TASK</div>
        <div className="grid grid-cols-1 gap-2">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => { setInput(ex); }}
              className="text-left px-4 py-3 bg-gray-900 border border-gray-800 hover:border-cyan-800 hover:bg-gray-800 rounded-lg text-sm text-gray-300 transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === 'questionnaire' && intake) return (
    <div className="space-y-4 max-w-2xl">
      <div className={`rounded-xl p-4 border ${intake.confidence === 'high' ? 'bg-green-950 border-green-800' : 'bg-gray-900 border-gray-700'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs font-mono text-gray-400 tracking-widest">AI UNDERSTOOD THIS AS</div>
          <Badge status={intake.confidence} />
        </div>
        <div className="text-sm text-gray-200 mb-2">{intake.understood}</div>
        <div className="flex gap-2 flex-wrap">
          <Badge status={intake.taskType} />
          <Badge status={intake.suggestedPriority} />
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
        <div className="text-xs font-mono text-cyan-500 tracking-widest">CONFIRM & FILL IN</div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Task Title</label>
          <input defaultValue={intake.suggestedTitle} onChange={e => setAnswers(a => ({ ...a, title: e.target.value }))}
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-600" />
        </div>
        {intake.questionnaire.map(q => (
          <div key={q.id}>
            <label className="text-xs text-gray-400 block mb-1">{q.question}</label>
            {q.type === 'choice' && q.choices ? (
              <div className="flex flex-wrap gap-2">
                {q.choices.map(choice => (
                  <button key={choice} onClick={() => setAnswers(a => ({ ...a, [q.id]: choice }))}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${answers[q.id] === choice ? 'bg-cyan-900 border-cyan-600 text-cyan-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <textarea rows={3} placeholder={`Enter ${q.id}...`} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-600 resize-none" />
            )}
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Priority</label>
          <div className="flex gap-2">
            {['low','normal','high','urgent'].map(p => (
              <button key={p} onClick={() => setAnswers(a => ({ ...a, priority: p }))}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${(answers.priority || intake.suggestedPriority) === p ? 'bg-cyan-900 border-cyan-600 text-cyan-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-3 bg-gray-800 border border-gray-700 text-gray-400 rounded-lg text-sm hover:border-gray-600">← Back</button>
        <button onClick={execute} className="flex-1 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg font-mono text-sm flex items-center justify-center gap-2">
          ⚡ EXECUTE — AI HANDLES IT →
        </button>
      </div>
    </div>
  );

  if (step === 'running') return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Spinner /><div className="text-cyan-400 font-mono">Working on your task...</div>
      <div className="text-gray-500 text-xs">Full deliverables take 20-40 seconds</div>
    </div>
  );

  if (step === 'done' && createdTask) return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-green-950 border border-green-800 rounded-xl p-4">
        <div className="text-green-400 font-mono text-sm mb-1">✓ COMPLETE — OUTPUT SAVED TO FILE</div>
        <div className="text-gray-200 font-medium">{createdTask.title}</div>
        {createdTask.filePath && <div className="text-xs text-gray-500 font-mono mt-1">📁 {createdTask.filePath}</div>}
        {createdTask.tokens && <div className="text-xs text-gray-600 font-mono mt-0.5">{createdTask.tokens} tokens used</div>}
      </div>
      {createdTask.output && <Output text={createdTask.output} />}
      <div className="flex gap-3">
        <button onClick={reset} className="flex-1 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg font-mono text-sm">⚡ NEW TASK →</button>
        <button onClick={() => navigator.clipboard.writeText(createdTask.output || '')} className="px-6 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm hover:border-gray-600">COPY</button>
      </div>
    </div>
  );

  return null;
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function ChatTab() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'assistant', content: "I'm your AI Engineering co-pilot. Ask anything — prompt engineering, RAG design, model selection, code review, eval strategy, debugging. I give direct, technical, production-ready answers." }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput('');
    setMsgs(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const data = await post('/api/chat', { message: msg });
      setMsgs(m => [...m, { role: 'assistant', content: data.response || data.error || 'No response' }]);
    } catch { setMsgs(m => [...m, { role: 'assistant', content: 'Connection error.' }]); }
    setLoading(false);
  }

  const QUICK = ['Design a RAG pipeline with $300/mo budget', 'Review: "You are a helpful assistant."', 'GPT-4o vs Claude Sonnet for code gen?', 'How to detect hallucinations at scale?', 'Fine-tuning vs RAG — when to use each?'];

  return (
    <div className="flex flex-col h-full max-w-3xl" style={{ minHeight: '70vh' }}>
      <div className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ maxHeight: '60vh' }}>
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-cyan-900 border border-cyan-700 text-cyan-100' : 'bg-gray-900 border border-gray-700 text-gray-200'}`}>
              {m.role === 'assistant' && <div className="text-xs text-cyan-500 font-mono mb-1">AI ENGINEER OS</div>}
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-2"><Spinner /><span className="text-sm text-gray-400">Thinking...</span></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="flex flex-wrap gap-2 mb-3 mt-2">
        {QUICK.map((q, i) => <button key={i} onClick={() => setInput(q)} className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded-full hover:border-cyan-600 hover:text-cyan-400 transition-colors">{q}</button>)}
      </div>
      <div className="flex gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask anything AI engineering..." rows={3}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
        <button onClick={send} disabled={loading || !input.trim()} className="px-4 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm">
          {loading ? <Spinner /> : 'RUN →'}
        </button>
      </div>
    </div>
  );
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
function TasksTab({ newTask }: { newTask: Task | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [type, setType] = useState('prompt_engineering');
  const [priority, setPriority] = useState('normal'); const [client, setClient] = useState('personal'); const [loading, setLoading] = useState(false);
  const TYPES = ['prompt_engineering','code_review','architecture','evaluation','documentation','research','debugging','fine_tuning','rag_design'];

  useEffect(() => { loadTasks(); }, []);
  useEffect(() => { if (newTask) { setTasks(t => [newTask, ...t.filter(x => x.id !== newTask.id)]); setSelected(newTask); } }, [newTask]);

  async function loadTasks() { const d = await get('/api/tasks'); if (d.tasks) setTasks(d.tasks); }
  async function submit() {
    if (!title.trim() || !desc.trim()) return;
    setLoading(true);
    const d = await post('/api/tasks', { title, description: desc, type, priority, client, autoRun: true });
    if (d.task) { setTasks(t => [d.task, ...t]); setSelected(d.task); setTitle(''); setDesc(''); }
    setLoading(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="text-xs font-mono text-cyan-500 tracking-widest">MANUAL TASK</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={e => setType(e.target.value)} className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600">
              {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600">
              {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Task description..." className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
          <button onClick={submit} disabled={loading || !title.trim() || !desc.trim()} className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Running...</> : 'EXECUTE →'}
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tasks.map(t => (
            <div key={t.id} onClick={() => setSelected(t)} className={`bg-gray-900 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${selected?.id === t.id ? 'border-cyan-600' : 'border-gray-700 hover:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm text-gray-200 truncate">{t.title}</span><Badge status={t.status} />
              </div>
              <div className="flex gap-2 text-xs text-gray-500 font-mono">
                <span>{t.type?.replace(/_/g,' ')}</span>
                {t.client && t.client !== 'personal' && <span className="text-cyan-800">{t.client}</span>}
              </div>
            </div>
          ))}
          {tasks.length === 0 && <div className="text-sm text-gray-600 text-center py-8">No tasks yet.</div>}
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-y-auto max-h-[600px]">
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium text-gray-200">{selected.title}</span><Badge status={selected.status} />
            </div>
            {selected.filePath && <div className="text-xs text-gray-600 font-mono bg-gray-950 rounded p-2">📁 {selected.filePath}</div>}
            <div className="text-sm text-gray-400 bg-gray-950 rounded p-3">{selected.description}</div>
            {selected.output && (
              <><div className="flex justify-between"><span className="text-xs font-mono text-cyan-500">OUTPUT</span><button onClick={() => navigator.clipboard.writeText(selected.output||'')} className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded hover:text-cyan-400 transition-colors">COPY</button></div>
              <Output text={selected.output} /></>
            )}
            {selected.status === 'running' && <div className="flex items-center gap-2 text-sm text-cyan-400"><Spinner /> Working...</div>}
          </div>
        ) : <div className="h-full flex items-center justify-center text-gray-600 text-sm">Select a task</div>}
      </div>
    </div>
  );
}

// ─── REVIEW ───────────────────────────────────────────────────────────────────
function ReviewTab() {
  const [type, setType] = useState<'prompt'|'code'|'architecture'>('prompt');
  const [input, setInput] = useState(''); const [context, setContext] = useState(''); const [result, setResult] = useState<Record<string,unknown>|null>(null); const [loading, setLoading] = useState(false);
  async function submit() {
    if (!input.trim()) return; setLoading(true); setResult('');
    const body: Record<string,string> = type==='code'?{code:input,context}:type==='prompt'?{prompt:input,goal:context}:{description:input};
    const d = await post(`/api/review/${type}`, body);
    setResult(d.review||d.error||'Error'); setLoading(false);
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['prompt','code','architecture'] as const).map(t => <button key={t} onClick={() => setType(t)} className={`px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${type===t?'bg-cyan-900 border-cyan-600 text-cyan-300':'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}>{t.toUpperCase()}</button>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={10} placeholder={type==='code'?'Paste AI/ML code...':type==='prompt'?'Paste prompt to review...':'Describe architecture...'} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none font-mono" />
          <input value={context} onChange={e => setContext(e.target.value)} placeholder={type==='code'?'What does this do?':type==='prompt'?'Goal of prompt?':''} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
          <button onClick={submit} disabled={loading||!input.trim()} className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm flex items-center justify-center gap-2">{loading?<><Spinner/>Reviewing...</>:`REVIEW ${type.toUpperCase()} →`}</button>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-y-auto max-h-96">
          {result?<Output text={result}/>:<div className="text-gray-600 text-sm h-full flex items-center justify-center">Scored review appears here</div>}
        </div>
      </div>
    </div>
  );
}

// ─── EVAL ─────────────────────────────────────────────────────────────────────
function EvalTab() {
  const [mode, setMode] = useState<'single'|'compare'>('single');
  const [prompt, setPrompt] = useState(''); const [outA, setOutA] = useState(''); const [outB, setOutB] = useState(''); const [expected, setExpected] = useState('');
  const [result, setResult] = useState<Record<string,unknown>|null>(null); const [loading, setLoading] = useState(false);
  async function run() {
    if (!prompt.trim()||!outA.trim()) return; setLoading(true); setResult(null);
    const d = mode==='single' ? await post('/api/eval/run',{prompt,output:outA,expectedOutput:expected}) : await post('/api/eval/compare',{prompt,outputA:outA,outputB:outB});
    setResult(d.eval||d.comparison||d); setLoading(false);
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['single','compare'] as const).map(m => <button key={m} onClick={()=>setMode(m)} className={`px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${mode===m?'bg-cyan-900 border-cyan-600 text-cyan-300':'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}>{m==='single'?'EVALUATE':'COMPARE A vs B'}</button>)}
      </div>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={2} placeholder="Prompt sent to model..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
      <div className={`grid gap-3 ${mode==='compare'?'grid-cols-2':'grid-cols-1'}`}>
        <textarea value={outA} onChange={e=>setOutA(e.target.value)} rows={6} placeholder={mode==='compare'?'Model A output...':'Model output to evaluate...'} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none font-mono" />
        {mode==='compare'&&<textarea value={outB} onChange={e=>setOutB(e.target.value)} rows={6} placeholder="Model B output..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none font-mono" />}
      </div>
      {mode==='single'&&<textarea value={expected} onChange={e=>setExpected(e.target.value)} rows={2} placeholder="Expected output (optional)" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />}
      <button onClick={run} disabled={loading||!prompt.trim()||!outA.trim()} className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm flex items-center justify-center gap-2">{loading?<><Spinner/>Evaluating...</>:'RUN EVALUATION →'}</button>
      {result&&<div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
        <div className="text-xs font-mono text-cyan-500">RESULT</div>
        {'scores' in result&&result.scores&&typeof result.scores==='object'&&<div className="grid grid-cols-3 gap-2">{Object.entries(result.scores as Record<string,number>).map(([k,v])=><div key={k} className="bg-gray-950 rounded p-2 text-center"><div className="text-xl font-bold text-cyan-400">{v}<span className="text-xs text-gray-500">/10</span></div><div className="text-xs text-gray-500">{k}</div></div>)}</div>}
        {'overall' in result&&<div className="text-center text-2xl font-bold text-cyan-400">Overall: {String(result.overall)}/10</div>}
        {'winner' in result&&<div className="text-center text-2xl font-bold text-cyan-400">Winner: Model {String(result.winner)}</div>}
        {'reasoning' in result&&<Output text={String(result.reasoning||'')}/>}
      </div>}
    </div>
  );
}

// ─── DOCS ─────────────────────────────────────────────────────────────────────
function DocsTab() {
  const [docType, setDocType] = useState('proposal'); const [desc, setDesc] = useState(''); const [title, setTitle] = useState(''); const [client, setClient] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]); const [selected, setSelected] = useState<Doc|null>(null); const [loading, setLoading] = useState(false);
  const TYPES = ['readme','proposal','architecture','runbook','api','evaluation','fine_tuning','rag'];
  useEffect(()=>{get('/api/docs').then(d=>{if(d.docs)setDocs(d.docs)});},[]);
  async function generate() {
    if (!desc.trim()) return; setLoading(true);
    const d = await post('/api/docs',{type:docType,description:desc,title,client});
    if(d.doc){setDocs(x=>[d.doc,...x]);setSelected(d.doc);setDesc('');setTitle('');}
    setLoading(false);
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">{TYPES.map(t=><button key={t} onClick={()=>setDocType(t)} className={`px-3 py-2 rounded-lg text-xs font-mono border transition-colors ${docType===t?'bg-cyan-900 border-cyan-600 text-cyan-300':'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}>{t.replace(/_/g,' ').toUpperCase()}</button>)}</div>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Document title" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
        <input value={client} onChange={e=>setClient(e.target.value)} placeholder="Client name" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600" />
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={5} placeholder="Describe the AI system or project..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600 resize-none" />
        <button onClick={generate} disabled={loading||!desc.trim()} className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg font-mono text-sm flex items-center justify-center gap-2">{loading?<><Spinner/>Generating...</>:'GENERATE →'}</button>
        <div className="space-y-1 max-h-40 overflow-y-auto">{docs.map(d=><div key={d.id} onClick={()=>setSelected(d)} className={`border rounded px-3 py-2 cursor-pointer text-sm transition-colors ${selected?.id===d.id?'border-cyan-600 bg-cyan-950':'border-gray-700 bg-gray-900 hover:border-gray-600'}`}><span className="text-gray-200">{d.title}</span><span className="text-xs text-gray-500 ml-2 font-mono">{d.type}</span></div>)}</div>
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-y-auto max-h-[600px]">
        {selected?(<div className="space-y-3"><div className="flex justify-between items-center"><span className="font-medium text-gray-200">{selected.title}</span><button onClick={()=>navigator.clipboard.writeText(selected.content)} className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded hover:text-cyan-400 transition-colors">COPY</button></div><Output text={selected.content}/></div>)
        :<div className="h-full flex items-center justify-center text-gray-600 text-sm">Docs appear here</div>}
      </div>
    </div>
  );
}

// ─── OUTPUTS ──────────────────────────────────────────────────────────────────
function OutputsTab() {
  const [outputs, setOutputs] = useState<OutputFile[]>([]); const [selected, setSelected] = useState<OutputFile|null>(null); const [content, setContent] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(()=>{loadOutputs();},[]);
  async function loadOutputs(){const d=await get('/api/outputs');if(d.outputs)setOutputs(d.outputs);}
  async function viewFile(o:OutputFile){setSelected(o);setLoading(true);const d=await get(`/api/outputs?filePath=${encodeURIComponent(o.path)}`);setContent(d.content||'Could not load');setLoading(false);}
  const grouped=outputs.reduce<Record<string,Record<string,OutputFile[]>>>((acc,o)=>{if(!acc[o.client])acc[o.client]={};if(!acc[o.client][o.date])acc[o.client][o.date]=[];acc[o.client][o.date].push(o);return acc;},{});
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3 overflow-y-auto max-h-[600px]">
        <div className="flex items-center justify-between"><div className="text-xs font-mono text-cyan-500 tracking-widest">SAVED OUTPUTS ({outputs.length})</div><button onClick={loadOutputs} className="text-xs text-gray-500 hover:text-gray-300 font-mono">↻</button></div>
        {Object.keys(grouped).length===0&&<div className="text-sm text-gray-600 text-center py-12"><div className="text-3xl mb-2">📁</div>Complete a task and outputs appear here.<br/><span className="text-xs">Structured by client and date.</span></div>}
        {Object.entries(grouped).map(([client,dates])=>(
          <div key={client}>
            <div className="text-xs font-mono text-cyan-700 tracking-widest mb-2">📁 {client.toUpperCase()}</div>
            {Object.entries(dates).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,files])=>(
              <div key={date} className="mb-3">
                <div className="text-xs text-gray-600 font-mono mb-1">{date}</div>
                {files.map((f,i)=><div key={i} onClick={()=>viewFile(f)} className={`border rounded-lg px-3 py-2 cursor-pointer mb-1 transition-colors ${selected?.path===f.path?'border-cyan-600 bg-cyan-950':'border-gray-700 bg-gray-900 hover:border-gray-600'}`}><div className="text-sm text-gray-200 truncate">{f.meta?.title||f.file}</div><div className="text-xs text-gray-500 font-mono">{f.meta?.type||''}</div></div>)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-y-auto max-h-[600px]">
        {loading&&<div className="flex items-center gap-2 text-gray-400"><Spinner/>Loading...</div>}
        {!loading&&selected&&content&&<div className="space-y-3"><div className="flex justify-between"><span className="text-sm font-medium text-gray-200 truncate">{selected.meta?.title||selected.file}</span><button onClick={()=>navigator.clipboard.writeText(content)} className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded hover:text-cyan-400 transition-colors">COPY</button></div><div className="text-xs text-gray-600 font-mono">{selected.path}</div><Output text={content}/></div>}
        {!loading&&!selected&&<div className="h-full flex items-center justify-center text-gray-600 text-sm">Select a file to view</div>}
      </div>
    </div>
  );
}

// ─── STATUS ───────────────────────────────────────────────────────────────────
function StatusTab() {
  const [status,setStatus]=useState<Record<string,unknown>|null>(null);
  useEffect(()=>{const load=async()=>{const d=await get('/api/status');setStatus(d);};load();const t=setInterval(load,15000);return()=>clearInterval(t);},[]);
  if(!status)return<div className="flex items-center gap-2 text-gray-400"><Spinner/>Loading...</div>;
  const stats=status.stats as Record<string,unknown>||{};const tasks=stats.tasks as Record<string,number>||{};
  return(
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{label:'AI STATUS',value:<Badge status={String(status.ai||'demo')}/>,sub:String(status.model||'')},{label:'TASKS DONE',value:String(tasks.complete||0),sub:`${tasks.failed||0} failed`},{label:'MEMORY',value:String(stats.memory||0),sub:'entries'},{label:'DOCS',value:String(stats.docs||0),sub:'generated'}].map((c,i)=>(
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4"><div className="text-xs font-mono text-gray-500 tracking-widest mb-2">{c.label}</div><div className="text-xl font-bold text-cyan-400">{c.value}</div><div className="text-xs text-gray-500 mt-1">{c.sub}</div></div>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="text-xs font-mono text-cyan-500 tracking-widest mb-4">ENV VARS</div>
        <div className="space-y-2 font-mono text-sm">
          {[{key:'ANTHROPIC_API_KEY',where:'Railway',desc:'Your API key — required',req:true},{key:'FRONTEND_URL',where:'Railway',desc:'Your Vercel URL',req:true},{key:'NEXT_PUBLIC_API_URL',where:'Vercel',desc:'Your Railway URL',req:true},{key:'AI_MODEL',where:'Railway',desc:'Model override (optional)',req:false}].map(v=>(
            <div key={v.key} className="flex items-start gap-2 bg-gray-950 border border-gray-800 rounded p-3 flex-wrap">
              <span className="text-cyan-400">{v.key}</span>
              <span className={`text-xs px-2 py-0.5 rounded border font-mono ${v.req?'bg-red-950 text-red-400 border-red-800':'bg-gray-800 text-gray-500 border-gray-700'}`}>{v.req?'REQUIRED':'optional'}</span>
              <span className="text-yellow-600 text-xs">[{v.where}]</span>
              <span className="text-gray-500 text-xs">{v.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const TABS=[{id:'intake' as Tab,label:'New Task',icon:'⚡'},{id:'chat' as Tab,label:'Chat',icon:'💬'},{id:'tasks' as Tab,label:'Tasks',icon:'📋'},{id:'review' as Tab,label:'Review',icon:'🔍'},{id:'eval' as Tab,label:'Eval',icon:'📊'},{id:'docs' as Tab,label:'Docs',icon:'📄'},{id:'outputs' as Tab,label:'Outputs',icon:'📁'},{id:'status' as Tab,label:'Status',icon:'🟢'}];

export default function Home() {
  const [tab,setTab]=useState<Tab>('intake');
  const [latestTask,setLatestTask]=useState<Task|null>(null);
  return(
    <div className="min-h-screen flex flex-col bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div><div className="text-xs font-mono text-cyan-600 tracking-widest">FANZOFTHEONE</div><div className="text-lg font-bold text-white">AI Engineer OS</div></div>
        <div className="text-xs font-mono text-gray-600 hidden md:block">AUTONOMOUS AI ENGINEERING CO-PILOT</div>
      </header>
      <nav className="border-b border-gray-800 bg-gray-950 px-2 flex gap-0.5 overflow-x-auto sticky top-14 z-10">
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab===t.id?'border-cyan-500 text-cyan-400':'border-transparent text-gray-500 hover:text-gray-300'}`}><span>{t.icon}</span><span className="hidden sm:inline">{t.label}</span></button>)}
      </nav>
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {tab==='intake'&&<IntakeTab onTaskCreated={t=>{setLatestTask(t);}}/>}
        {tab==='chat'&&<ChatTab/>}
        {tab==='tasks'&&<TasksTab newTask={latestTask}/>}
        {tab==='review'&&<ReviewTab/>}
        {tab==='eval'&&<EvalTab/>}
        {tab==='docs'&&<DocsTab/>}
        {tab==='outputs'&&<OutputsTab/>}
        {tab==='status'&&<StatusTab/>}
      </main>
    </div>
  );
}
