import React, { useState } from 'react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    await onSend({ content: text.trim(), attachments: files });
    setText('');
    setFiles([]);
  };

  return (
    <div style={{ padding: 12, borderTop: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
        <button onClick={handleSend} style={{ padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}>
          Gửi
        </button>
      </div>
    </div>
  );
}
