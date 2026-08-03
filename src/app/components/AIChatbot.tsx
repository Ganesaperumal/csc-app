'use client';
import { useState, useRef, useEffect } from 'react';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: 'Hi! I am the Transworld Intl AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const isTrackPage = window.location.pathname.startsWith('/track/');
      const isDashboardJobPage = window.location.pathname.startsWith('/home/job/');
      
      let jobNumber = null;
      if (isTrackPage) {
        jobNumber = decodeURIComponent(window.location.pathname.replace('/track/', ''));
      } else if (isDashboardJobPage) {
        jobNumber = decodeURIComponent(window.location.pathname.replace('/home/job/', ''));
      }

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMsg,
          context: `Conversation History:\n${messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}`,
          provider: window.location.pathname.startsWith('/home') ? 'groq' : 'gemini',
          trackingJobNumber: jobNumber
        })
      });

      const data = await res.json().catch(() => ({}));
      
      if (res.status === 429) {
        setMessages(prev => [...prev, { role: 'ai', text: data.message || 'I am currently processing a high volume of requests. Please give me a minute and try again!' }]);
      } else if (res.ok && data.result) {
        setMessages(prev => [...prev, { role: 'ai', text: data.result }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: data.message || 'An error occurred. Please try again.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Network error connecting to the AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      {isOpen ? (
        <div style={{ 
          width: '350px', 
          height: '500px', 
          backgroundColor: 'var(--bg-color, #ffffff)', 
          borderRadius: '16px', 
          boxShadow: 'var(--glass-shadow, 0 10px 40px rgba(0,0,0,0.15))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color, #e2e8f0)'
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', padding: '15px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Static SVG icon — no SMIL animations for performance */}
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="10" width="22" height="16" rx="4" strokeWidth="2.5" stroke="#00f2fe" />
                <text x="17" y="22" dominantBaseline="central" fontSize="14" fontWeight="900" fontFamily="sans-serif" fill="#f093fb" stroke="none" textAnchor="middle">AI</text>
                <text x="28" y="11" fontSize="11" stroke="none" fill="white" textAnchor="middle">✨</text>
              </svg> 
              Transworld Intl - AI Assistant
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>
              &times;
            </button>
          </div>
          
          {/* Messages */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface-color, #f8fafc)' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? '#4f46e5' : 'var(--bg-color, #e2e8f0)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary, #1e293b)',
                padding: '10px 14px',
                borderRadius: '12px',
                maxWidth: '80%',
                fontSize: '0.9rem',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap',
                border: msg.role === 'ai' ? '1px solid var(--border-color, rgba(255,255,255,0.1))' : 'none'
              }}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--bg-color, #e2e8f0)', color: 'var(--text-secondary, #64748b)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem' }}>
                Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSend} style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', padding: '10px', display: 'flex', gap: '8px', background: 'var(--bg-color, #fff)' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              style={{ flex: 1, padding: '10px', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '20px', outline: 'none', fontSize: '0.9rem', color: 'var(--text-primary, #000)', background: 'var(--surface-color, #fff)' }}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1 }}
            >
              ➤
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
          title="Open AI Assistant"
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', lineHeight: 1 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4f46e5', fontFamily: 'sans-serif', textShadow: '0 0 0.5px #4f46e5, 0 0 0.5px #4f46e5' }}>A</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.5rem', lineHeight: 1 }}>✨</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4f46e5', fontFamily: 'sans-serif', lineHeight: 1, textShadow: '0 0 0.5px #4f46e5, 0 0 0.5px #4f46e5' }}>I</span>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
