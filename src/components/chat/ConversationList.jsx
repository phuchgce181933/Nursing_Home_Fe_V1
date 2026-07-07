import React from 'react';
import { Trash2, User } from 'lucide-react';
import { isConversationUnread } from '../../hooks/useUnreadConversations';

const AVATAR_PALETTE = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
];

function avatarColor(seed) {
  if (!seed) return AVATAR_PALETTE[0];
  const code = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

function initials(name) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]];
  return chars.join('').toUpperCase();
}

function displayName(c) {
  return c.guestName || c.participantUserIds?.[0]?.fullName || c.subject || 'Không có tên';
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function ConversationList({ items = [], onSelect, selectedId, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-slate-400">
        Chưa có cuộc trò chuyện nào
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((c) => {
        const name = displayName(c);
        const active = selectedId === c._id;
        const unread = isConversationUnread(c);
        return (
          <div
            key={c._id}
            onClick={() => onSelect(c)}
            className={`group relative flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors ${
              active ? 'bg-violet-50' : 'hover:bg-slate-50'
            }`}
          >
            <div className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(name)}`}>
              {initials(name) || <User size={18} />}
              {unread && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {name}
                </span>
                <span className="flex-shrink-0 text-[11px] text-slate-400">{formatTime(c.lastMessageAt)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className={`truncate text-xs ${unread ? 'font-semibold text-slate-600' : 'text-slate-400'}`}>
                  {c.subject && c.guestName ? c.subject : c.isGuest ? 'Khách liên hệ' : 'Cuộc trò chuyện'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(c); }}
              title="Xóa cuộc trò chuyện"
              className="flex-shrink-0 rounded-full p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
