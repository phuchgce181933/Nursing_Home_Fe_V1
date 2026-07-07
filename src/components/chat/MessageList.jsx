import React, { useEffect, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageList({ items = [], currentUserId, onLoadMore }) {
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
          <div key={m._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
            {!isMine && (
              <span className="mb-1 px-1 text-[11px] font-medium text-slate-400">{senderLabel}</span>
            )}
            <div
              className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                isMine ? 'rounded-tr-sm bg-violet-600 text-white' : 'rounded-tl-sm bg-slate-100 text-slate-700'
              }`}
            >
              {m.content}
              {m.attachments?.length ? (
                <div className={`mt-2 flex flex-col gap-1 ${m.content ? 'border-t border-white/20 pt-2' : ''}`}>
                  {m.attachments.map((a, i) => (
                    <a
                      key={i}
                      href={a.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1.5 text-xs underline underline-offset-2 ${
                        isMine ? 'text-violet-100' : 'text-violet-600'
                      }`}
                    >
                      <Paperclip size={12} />
                      {a.fileName}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <span className="mt-1 px-1 text-[10px] text-slate-400">{formatTime(m.sentAt || m.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
