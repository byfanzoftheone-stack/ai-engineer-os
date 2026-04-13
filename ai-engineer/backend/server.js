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

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
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

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AI Engineer OS — backend live on :${PORT}`));
