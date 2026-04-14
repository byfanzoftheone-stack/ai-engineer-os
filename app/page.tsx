'use client';

import { useState, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiResponse {
  result?: unknown;
  error?: string;
  message?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as Record<string, unknown>)['error'] as string || 'Request failed');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: (data as Record<string, unknown>)['message'] as string || '',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderResult = (result: unknown): React.ReactNode => {
    if (result === null || result === undefined) {
      return null;
    }
    if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
      return String(result);
    }
    const record = result as Record<string, unknown>;
    return (
      <div className="result-container">
        {Object.entries(record).map(([key, value]) => (
          <div key={key} className="result-item">
            <span className="result-key">{key}: </span>
            <span className="result-value">
              {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">AI Engineer OS</h1>

        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-400 text-center mt-32">
              Start a conversation with Claude...
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 ml-8'
                    : 'bg-gray-700 mr-8'
                }`}
              >
                <div className="text-xs text-gray-300 mb-1 capitalize">{msg.role}</div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))
          )}
          {loading && (
            <div className="bg-gray-700 mr-8 mb-4 p-3 rounded-lg">
              <div className="text-xs text-gray-300 mb-1">assistant</div>
              <div className="animate-pulse">Thinking...</div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}