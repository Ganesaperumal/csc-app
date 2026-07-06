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
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMsg,
          context: `Conversation History:\n${messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}`
        })
      });

      const data = await res.json();
      
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
      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 10px rgba(0, 242, 254, 0.6), 0 0 20px rgba(240, 147, 251, 0.6), 0 0 30px rgba(0, 242, 254, 0.4); }
          50% { box-shadow: 0 0 15px rgba(240, 147, 251, 0.8), 0 0 30px rgba(0, 242, 254, 0.8), 0 0 45px rgba(240, 147, 251, 0.6); }
          100% { box-shadow: 0 0 10px rgba(0, 242, 254, 0.6), 0 0 20px rgba(240, 147, 251, 0.6), 0 0 30px rgba(0, 242, 254, 0.4); }
        }
      `}</style>
      {isOpen ? (
        <div style={{ 
          width: '350px', 
          height: '500px', 
          backgroundColor: '#fff', 
          borderRadius: '16px', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', padding: '15px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none" stroke="url(#aiCircuitGradSm)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="aiCircuitGradSm" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2fe">
                      <animate attributeName="stop-color" values="#00f2fe;#4facfe;#00f2fe" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#f093fb">
                      <animate attributeName="stop-color" values="#f093fb;#f5576c;#f093fb" dur="3s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>
                </defs>
                <rect x="6" y="10" width="22" height="16" rx="4" strokeWidth="2.5" />
                <text x="17" y="18" dominantBaseline="central" fontSize="14" fontWeight="900" fontFamily="sans-serif" fill="url(#aiCircuitGradSm)" stroke="none" textAnchor="middle">AI</text>
                <text x="28" y="11" fontSize="11" stroke="none" fill="currentColor" textAnchor="middle">✨</text>
              </svg> 
              Transworld Intl - AI Assistant
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>
              &times;
            </button>
          </div>
          
          {/* Messages */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? '#4f46e5' : '#e2e8f0',
                color: msg.role === 'user' ? '#fff' : '#1e293b',
                padding: '10px 14px',
                borderRadius: '12px',
                maxWidth: '80%',
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: '#e2e8f0', color: '#64748b', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem' }}>
                Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSend} style={{ borderTop: '1px solid #e2e8f0', padding: '10px', display: 'flex', gap: '8px', background: '#fff' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '20px', outline: 'none', fontSize: '0.9rem', color: '#000' }}
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
            width: '65px', height: '65px', borderRadius: '35px',
            background: '#ffffff',
            border: '2px solid rgba(240, 147, 251, 0.3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s',
            animation: 'pulse-glow 3s infinite alternate'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="48" height="48" viewBox="0 0 36 36" fill="none" stroke="url(#aiCircuitGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="aiCircuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe">
                  <animate attributeName="stop-color" values="#00f2fe;#4facfe;#00f2fe" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#f093fb">
                  <animate attributeName="stop-color" values="#f093fb;#f5576c;#f093fb" dur="3s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            <rect x="6" y="10" width="22" height="16" rx="4" strokeWidth="2.5" />
            <text x="17" y="18" dominantBaseline="central" fontSize="14" fontWeight="900" fontFamily="sans-serif" fill="url(#aiCircuitGrad)" stroke="none" textAnchor="middle">AI</text>
            <text x="28" y="11" fontSize="11" stroke="none" fill="currentColor" textAnchor="middle">✨</text>
          </svg>
        </button>
      )}
    </div>
  );
}
