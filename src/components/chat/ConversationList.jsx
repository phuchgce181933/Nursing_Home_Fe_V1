import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, User } from 'lucide-react';
import { isConversationUnread } from '../../hooks/useUnreadConversations';
import { formatDisplayTime, formatDisplayDate } from '../../utils/formatLocale';

const AVATAR_PALETTE = [
  'bg-navy-deep', 'bg-sage-healing', 'bg-status-info', 'bg-status-success', 'bg-status-warning', 'bg-status-error',
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

function displayName(c, currentUserId, fallback) {
  if (c.guestName) return c.guestName;
  const other = (c.participantUserIds || []).find((p) => String(p?._id) !== String(currentUserId));
  return other?.fullName || c.participantUserIds?.[0]?.fullName || c.subject || fallback;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? formatDisplayTime(dateStr)
    : formatDisplayDate(dateStr, { day: '2-digit', month: '2-digit' });
}

function ConversationSkeletonRow({ delay }) {
  return (
    <div className={`animate-fade-in delay-${delay} flex items-center gap-3 border-b border-slate-100 px-4 py-3`}>
      <div className="skeleton h-11 w-11 flex-shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="skeleton mb-2 h-3.5 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

export default function ConversationList({ items = [], loading = false, onSelect, selectedId, onDelete, currentUserId }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ConversationSkeletonRow key={i} delay={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-slate-400">
        {t('messagesPage.noConversations')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((c, i) => {
        const name = displayName(c, currentUserId, t('messagesPage.noName'));
        const active = selectedId === c._id;
        const unread = isConversationUnread(c);
        return (
          <div
            key={c._id}
            onClick={() => onSelect(c)}
            className={`animate-slide-down delay-${(i % 6) + 1} glow-hover group relative flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors ${
              active ? 'bg-navy-deep/10' : 'hover:bg-slate-50'
            }`}
          >
            <div className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(name)}`}>
              {initials(name) || <User size={18} />}
              {unread && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-status-error" />
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
                  {c.subject && c.guestName ? c.subject : c.isGuest ? t('messagesPage.guestContact') : t('messagesPage.defaultConversation')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(c); }}
              title={t('messagesPage.deleteConversationTitle')}
              data-tooltip={t('messagesPage.deleteTooltip')}
              className="flex-shrink-0 rounded-full p-1.5 text-slate-300 opacity-0 transition-all hover:bg-status-error/10 hover:text-status-error group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
