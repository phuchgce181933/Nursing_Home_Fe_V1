import React, { useEffect, useState, useRef } from 'react';
import conversationService from '../services/conversation.service';

export default function GuestChatWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // subject removed per request
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const startPolling = (convId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
          const res = await conversationService.getGuestMessages(convId, { page: 1, limit: 20 });
          const d = res.data || res;
          const items = d.items || [];
          setMessages(Array.isArray(items) ? items.slice().reverse() : items);
      } catch (e) {
        // ignore
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const createConversation = async () => {
    if (!name || (!email && !phone)) return alert('Vui lòng nhập tên và email hoặc số điện thoại');
    try {
      const payload = { guestName: name, guestEmail: email, guestPhone: phone, content: message };
      const res = await conversationService.createGuestConversation(payload);
      const data = res.data || res;
      const conv = data.conversation || data;
      setConversation(conv);
      if (data.message) setMessages([data.message]);
      startPolling(conv._id || conv.id);
      setMessage('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Không thể tạo liên hệ');
    }
  };

  const sendMessage = async () => {
    if (!conversation) return alert('Chưa có cuộc trò chuyện');
    if (!message) return;
    try {
      const res = await conversationService.sendGuestMessage(conversation._id || conversation.id, { content: message, guestName: name, guestEmail: email, guestPhone: phone });
      const d = res.data || res;
        setMessages((m) => [...m, d]);
      setMessage('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Không gửi được');
    }
  };

  return (
    <div>
      {/* Floating button */}
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999 }}>
        {!open ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
            style={{ width: 64, height: 64, borderRadius: 32, background: '#a855f7', color: '#fff', border: 'none', boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}
          >
            Chat
          </button>
        ) : (
          <div style={{ width: 360, maxWidth: '90vw', height: 520, background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#6d28d9', color: '#fff' }}>
              <div>Liên hệ tư vấn</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); stopPolling(); }} style={{ background: 'transparent', color: '#fff', border: 'none' }}>Đóng</button>
              </div>
            </div>
            <div style={{ padding: 12, height: 'calc(100% - 120px)', overflowY: 'auto' }}>
              {!conversation ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <input placeholder="Họ tên" value={name} onChange={(e) => setName(e.target.value)} />
                  <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <textarea placeholder="Tin nhắn" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
                </div>
              ) : (
                <div>
                  <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #e6e6e6', padding: 8 }}>
                    {messages.map((m) => (
                      <div key={m._id || m.id} style={{ padding: 8, borderBottom: '1px solid #f1f1f1' }}>
                        <div style={{ fontSize: 12, color: '#334155' }}>{m.guestName || (m.senderUserId?.fullName)}</div>
                        <div style={{ marginTop: 4 }}>{m.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
              {!conversation ? (
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); createConversation(); }} style={{ flex: 1, padding: '10px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6 }}>
                  Bắt đầu chat
                </button>
              ) : (
                <>
                  <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nhập tin nhắn..." style={{ flex: 1, padding: 8 }} />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendMessage(); }} style={{ padding: '10px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>Gửi</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
