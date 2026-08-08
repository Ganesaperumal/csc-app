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
          width: '360px', 
          height: '520px', 
          backgroundColor: 'rgba(255, 255, 255, 0.88)', 
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px', 
          boxShadow: '0 25px 50px rgba(31, 38, 135, 0.15), inset 0 2px 6px rgba(255, 255, 255, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1.5px solid rgba(255, 255, 255, 0.95)'
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', padding: '16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              TI AI Assistant
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.4rem', fontWeight: 'bold' }}>
              &times;
            </button>
          </div>
          
          {/* Messages */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(248, 250, 252, 0.6)' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? '#4f46e5' : '#ffffff',
                color: msg.role === 'user' ? '#fff' : '#0f172a',
                padding: '10px 14px',
                borderRadius: '14px',
                maxWidth: '82%',
                fontSize: '0.875rem',
                lineHeight: '1.45',
                whiteSpace: 'pre-wrap',
                border: msg.role === 'ai' ? '1px solid rgba(226, 232, 240, 0.8)' : 'none',
                boxShadow: msg.role === 'user' ? '0 4px 12px rgba(79,70,229,0.3)' : '0 2px 6px rgba(0,0,0,0.05)'
              }}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', color: '#64748b', padding: '10px 14px', borderRadius: '14px', fontSize: '0.8rem', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                ⚡ Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSend} style={{ borderTop: '1px solid rgba(226, 232, 240, 0.8)', padding: '12px', display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.95)' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI anything..."
              style={{ flex: 1, padding: '10px 14px', border: '1px solid rgba(203, 213, 225, 0.8)', borderRadius: '20px', outline: 'none', fontSize: '0.875rem', color: '#0f172a', background: '#ffffff' }}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1, boxShadow: '0 4px 12px rgba(79,70,229,0.4)' }}
            >
              ➤
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            border: '1px solid rgba(255,255,255,0.4)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45), inset 0 1px 1px rgba(255,255,255,0.6)',
            transition: 'transform 0.2s ease'
          }}
          title="Open AI Assistant"
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', lineHeight: 1 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', fontFamily: 'sans-serif' }}>A</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.5rem', lineHeight: 1 }}>✨</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', fontFamily: 'sans-serif', lineHeight: 1 }}>I</span>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
