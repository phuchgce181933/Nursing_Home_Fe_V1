import React from 'react';

export default function ConversationList({ items = [], onSelect, selectedId, onDelete }) {
  return (
    <div style={{ width: 300, borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
      <div style={{ padding: 12, fontWeight: 700 }}>Conversations</div>
      {items.map((c) => (
        <div
          key={c._id}
          style={{
            padding: 12,
            cursor: 'pointer',
            background: selectedId === c._id ? '#eef2ff' : 'transparent',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div onClick={() => onSelect(c)} style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{c.subject || 'No subject'}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ''}</div>
          </div>
          <div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(c); }}
              style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              title="Xóa cuộc trò chuyện"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
