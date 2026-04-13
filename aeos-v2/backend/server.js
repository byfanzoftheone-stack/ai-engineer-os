require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://ai-engineer.vercel.app',
].filter(Boolean);

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments (e.g. branch-name-project.vercel.app).
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '4mb' }));
app.use(morgan('short'));

// Health
app.get('/health', (req, res) => res.json({
  status: 'ok',
  system: 'AI Engineer OS',
  ai: process.env.ANTHROPIC_API_KEY ? 'claude-live' : 'demo-mode',
  ts: new Date().toISOString()
}));

// Routes
app.use('/api/chat',   require('./routes/chat'));
app.use('/api/tasks',  require('./routes/tasks'));
app.use('/api/review', require('./routes/review'));
app.use('/api/eval',   require('./routes/eval'));
app.use('/api/docs',   require('./routes/docs'));
app.use('/api/memory', require('./routes/memory'));
app.use('/api/status', require('./routes/status'));
app.use('/api/intake', require('./routes/intake'));
app.use('/api/outputs', require('./routes/outputs'));

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AI Engineer OS — backend live on :${PORT}`));
