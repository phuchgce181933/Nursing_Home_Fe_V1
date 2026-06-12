import React, { useState, useEffect } from 'react';
import conversationService from '../../services/conversation.service';
import familyPortalService from '../../services/familyPortal.service';

export default function GuestContact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [residentId, setResidentId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [residents, setResidents] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await familyPortalService.getFamilyResidents();
        setResidents(r.data || r || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const createGuest = async () => {
    if (!name || (!email && !phone)) return alert('Vui lòng nhập tên và email hoặc số điện thoại');
    try {
      const payload = { guestName: name, guestEmail: email, guestPhone: phone, residentId, subject, content: message };
      const res = await conversationService.createGuestConversation(payload);
      const data = res.data || res;
      setConversation(data.conversation || data);
      if (data.message) setMessages([data.message]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Không thể tạo liên hệ');
    }
  };

  const sendGuestMsg = async () => {
    if (!conversation) return alert('Chưa có cuộc trò chuyện.');
    if (!message) return;
    try {
      const res = await conversationService.sendGuestMessage(conversation._id, { content: message, guestName: name, guestEmail: email, guestPhone: phone });
      const data = res.data || res;
      setMessages((m) => [...m, data]);
      setMessage('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Không gửi được');
    }
  };

  const loadGuestMessages = async (convId) => {
    try {
      const res = await conversationService.getGuestMessages(convId, { page: 1, limit: 50 });
      const d = res.data || res;
      const items = d.items || [];
      setMessages(Array.isArray(items) ? items.slice().reverse() : items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (conversation) loadGuestMessages(conversation._id);
  }, [conversation]);

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <h2>Liên hệ với Nhà dưỡng lão (Anonymous)</h2>
      {!conversation ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <input placeholder="Họ tên" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select value={residentId} onChange={(e) => setResidentId(e.target.value)}>
            <option value="">Chọn cư dân (tuỳ chọn)</option>
            {residents.map((r) => (
              <option key={r._id} value={r._id}>
                {r.fullName || r.name}
              </option>
            ))}
          </select>
          <input placeholder="Tiêu đề" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea placeholder="Tin nhắn" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          <div>
            <button onClick={createGuest} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff' }}>
              Gửi liên hệ
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 12 }}>
            <strong>Cuộc trò chuyện:</strong> {conversation.subject || 'Không có tiêu đề'}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', padding: 8, marginBottom: 8 }}>
            {messages.map((m) => (
              <div key={m._id || m.id} style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, color: '#334155' }}>{m.guestName || (m.senderUserId?.fullName || m.senderUserId?.fullName)}</div>
                <div style={{ marginTop: 4 }}>{m.content}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nhập tin nhắn..." style={{ flex: 1 }} />
            <button onClick={sendGuestMsg} style={{ padding: '8px 12px', background: '#10b981', color: '#fff' }}>
              Gửi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
