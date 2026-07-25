import React, { useEffect, useRef, useState } from 'react';
import AttachmentList from './AttachmentList';

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function MessageSkeletonRow({ mine, delay }) {
  return (
    <div className={`animate-fade-in delay-${delay} flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`skeleton h-9 rounded-2xl ${mine ? 'w-40 rounded-tr-sm' : 'w-52 rounded-tl-sm'}`} />
    </div>
  );
}

export default function MessageList({ items = [], loading = false, currentUserId, onLoadMore }) {
  const ref = useRef();
  const loadingMoreRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const nearTop = el.scrollTop <= 60;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 60;
      setIsAtBottom(atBottom);
      if (nearTop && typeof onLoadMore === 'function' && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        Promise.resolve(onLoadMore()).finally(() => {
          setTimeout(() => { loadingMoreRef.current = false; }, 300);
        });
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onLoadMore]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isAtBottom) el.scrollTop = el.scrollHeight;
  }, [items, isAtBottom]);

  if (loading) {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <MessageSkeletonRow delay={1} />
        <MessageSkeletonRow mine delay={2} />
        <MessageSkeletonRow delay={3} />
        <MessageSkeletonRow mine delay={4} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div ref={ref} className="flex flex-1 items-center justify-center overflow-y-auto px-6 text-sm text-slate-400">
        Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
      </div>
    );
  }

  return (
    <div ref={ref} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
      {items.map((m) => {
        const isMine = m.senderUserId && String(m.senderUserId._id) === String(currentUserId);
        const senderLabel = m.senderUserId?.fullName || m.senderUserId?.email || m.guestName || m.guestEmail || 'Khách';
        return (
          <div key={m._id} className={`animate-fade-in-up flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
            {!isMine && (
              <span className="mb-1 px-1 text-[11px] font-medium text-slate-400">{senderLabel}</span>
            )}
            <div
              className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                isMine ? 'rounded-tr-sm bg-navy-deep text-white' : 'rounded-tl-sm bg-surface-container-low text-slate-700'
              }`}
            >
              {m.content}
              <AttachmentList attachments={m.attachments} hasText={!!m.content} isMine={isMine} />
            </div>
            <span className="mt-1 px-1 text-[10px] text-slate-400">{formatTime(m.sentAt || m.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
