# AI Engineer OS — by FanzoftheOne

Your autonomous AI engineering co-pilot. Drop client work in, it handles it.

## What This Does

| Tool | What It Handles |
|------|----------------|
| **AI Chat** | Expert AI engineering conversations — architecture, debugging, strategy |
| **Task Engine** | Submit a task, AI auto-executes and delivers production output |
| **Code Review** | Scored reviews of AI/ML code with fixes |
| **Prompt Review** | Score and optimize any prompt |
| **LLM Eval** | Evaluate or compare model outputs with scores |
| **Doc Generator** | READMEs, proposals, architecture docs, runbooks, RAG designs |

---

## Deploy in 3 Steps

### Quick Setup Files (Copy/Paste)

Use these checked-in templates to set local or dashboard values fast:

- `backend/.env.example`
- `frontend/.env.local.example`

For local testing:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Then replace placeholder URLs/keys with your actual Railway + Vercel values.

### Step 1 — Backend on Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Point to the `backend/` folder
3. Add these environment variables in Railway dashboard:

```
ANTHROPIC_API_KEY   = sk-ant-...          ← YOUR KEY (required)
FRONTEND_URL        = https://YOUR-APP.vercel.app  ← add after Vercel deploy
PORT                = 3001                ← Railway sets this automatically
AI_MODEL            = claude-sonnet-4-6   ← optional, this is the default
```

4. Railway build command: `npm install`
5. Railway start command: `node server.js`
6. Copy your Railway URL — looks like: `https://ai-engineer-os-production.up.railway.app`

---

### Step 2 — Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Root Directory** to `frontend`
3. Add this environment variable in Vercel dashboard:

```
NEXT_PUBLIC_API_URL = https://YOUR-RAILWAY-URL.up.railway.app  ← from Step 1
```

4. Vercel build command: `npm run build`
5. Vercel output directory: `.next`
6. Vercel install command: `npm install`
7. Deploy — copy your Vercel URL

---

### Step 3 — Wire Them Together

Go back to Railway → your service → Variables → add:
```
FRONTEND_URL = https://YOUR-APP.vercel.app  ← your Vercel URL from Step 2
```

Redeploy Railway. Done.

---

## Environment Variables — Full Reference

### Railway (Backend)

| Variable | Required | Value | Description |
|----------|----------|-------|-------------|
| `ANTHROPIC_API_KEY` | ✅ YES | `sk-ant-api03-...` | Your Anthropic API key from console.anthropic.com |
| `FRONTEND_URL` | ✅ YES | `https://yourapp.vercel.app` | Your Vercel frontend URL for CORS |
| `PORT` | auto | `3001` | Railway sets this, don't override |
| `AI_MODEL` | optional | `claude-sonnet-4-6` | Claude model to use |

### Vercel (Frontend)

| Variable | Required | Value | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ YES | `https://yourapp-production.up.railway.app` | Your Railway backend URL |

---

## Build Commands Reference

### Backend (Railway)
- **Install:** `npm install`
- **Start:** `node server.js`
- **Dev:** `npm run dev`

### Frontend (Vercel)
- **Install:** `npm install`
- **Build:** `npm run build`
- **Start:** `npm start`
- **Dev:** `npm run dev`

---

## API Endpoints

All endpoints served from Railway backend:

```
GET  /health                    System health check
POST /api/chat                  AI engineering chat
GET  /api/chat/history          Chat history
GET  /api/tasks                 List tasks
POST /api/tasks                 Create + auto-run task
GET  /api/tasks/:id             Get task + output
POST /api/tasks/:id/run         Re-run task
POST /api/review/code           Review AI/ML code
POST /api/review/prompt         Review & optimize prompt
POST /api/review/architecture   Review system architecture
POST /api/eval/run              Evaluate model output
POST /api/eval/compare          Compare two model outputs
POST /api/eval/batch            Batch evaluate outputs
POST /api/docs/generate         Generate technical doc
POST /api/docs/prompt-library   Generate prompt library
GET  /api/docs                  List generated docs
GET  /api/memory                View stored memory
POST /api/memory                Add memory entry
GET  /api/memory/search?q=...   Search memory
GET  /api/status                System status + stats
```

---

## Task Types

When submitting tasks, use these type values:

| Type | Use For |
|------|---------|
| `prompt_engineering` | Write, optimize, debug prompts |
| `code_review` | Review AI/ML code |
| `architecture` | Design AI system architectures |
| `evaluation` | Design LLM eval plans |
| `documentation` | Technical docs, proposals |
| `research` | AI approach analysis, model comparisons |
| `debugging` | Debug AI pipeline issues |
| `fine_tuning` | Fine-tuning strategy |
| `rag_design` | RAG pipeline design |

---

## Example: Bring Client Work In

```bash
# Submit a task via API
curl -X POST https://YOUR-RAILWAY-URL.up.railway.app/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design RAG pipeline for client legal docs",
    "type": "rag_design",
    "priority": "high",
    "description": "Client has 50k legal documents in PDF. Need RAG system for Q&A. Budget is $500/mo. Must cite sources. Users are lawyers not engineers.",
    "autoRun": true
  }'
```

The system runs it, delivers production output, stores it. You review and deliver to client.

---

Built by FanzoftheOne — AI Engineer OS v1.0.0
