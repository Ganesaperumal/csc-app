'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '../dashboard.module.css';
import { getUserColor } from '@/lib/colorUtils';

interface Message {
  id: string;
  sender_email: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export default function GroupChat({ user }: { user: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [canChat, setCanChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user profile for chat access
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('profiles').select('chat_access, role').eq('id', user.id).single();
      if (data) {
        setCanChat(data.role === 'Viewer' ? false : data.chat_access);
      } else {
        // Fallback for new users before profile is fetched
        setCanChat(user?.user_metadata?.chat_enabled !== false && user?.user_metadata?.role !== 'Viewer');
      }
    };
    fetchProfile();

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('group_chat')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setMessages(data.reverse());
    };
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase.channel('public:group_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      // Use setTimeout to ensure DOM has fully painted the flex layout before scrolling
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !canChat) return;

    const { error } = await supabase.from('group_chat').insert({
      sender_id: user.id,
      sender_email: user.email,
      message: newMessage
    });

    if (!error) setNewMessage('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-color)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-color)' }}>
      <div style={{ padding: '0.75rem', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
        🤝 CSC Team Colab
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.map(msg => {
          const isMe = msg.sender_id === user.id;
          const senderName = msg.sender_email ? msg.sender_email.split('@')[0] : 'Unknown';
          const userColor = getUserColor(senderName);
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <span style={{ fontSize: '0.65rem', color: isMe ? 'var(--text-secondary)' : userColor.text, marginBottom: '2px', fontWeight: isMe ? 400 : 600 }}>
                {senderName}
              </span>
              <div style={{ 
                background: isMe ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : userColor.bg, 
                color: isMe ? 'white' : 'var(--text-primary)',
                border: isMe ? 'none' : `1px solid ${userColor.text}40`,
                padding: '0.5rem 0.75rem', 
                borderRadius: '12px',
                borderTopRightRadius: isMe ? '4px' : '12px',
                borderTopLeftRadius: !isMe ? '4px' : '12px',
                fontSize: '0.85rem',
                maxWidth: '85%',
                wordBreak: 'break-word',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', padding: '0.5rem', background: 'var(--surface-color)', borderTop: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={canChat ? "Type a message..." : "Chat disabled"}
          disabled={!canChat}
          style={{ flex: 1, minWidth: 0, padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={!canChat || !newMessage.trim()} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#4f46e5', marginLeft: '0.5rem', cursor: canChat ? 'pointer' : 'not-allowed' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
  );
}
