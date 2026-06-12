import React, { useEffect, useRef, useState } from 'react';

export default function MessageList({ items = [], currentUserId, onLoadMore }) {
  const ref = useRef();
  const isAutoScrollRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const nearTop = el.scrollTop <= 60;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 60;
      setIsAtBottom(atBottom);
      // if user scrolled to top, request older messages
      if (nearTop && typeof onLoadMore === 'function' && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        Promise.resolve(onLoadMore()).finally(() => {
          // allow subsequent loads after a short delay
          setTimeout(() => {
            loadingMoreRef.current = false;
          }, 300);
        });
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    // initial check
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onLoadMore]);

  // When items change: auto-scroll to bottom only if user is at bottom
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isAtBottom) {
      // scroll to bottom
      el.scrollTop = el.scrollHeight;
    }
  }, [items, isAtBottom]);
  const rendered = items.map((m) => {
    const isMine = m.senderUserId && String(m.senderUserId._id) === String(currentUserId);
    const senderLabel = m.senderUserId?.fullName || m.senderUserId?.email || m.guestName || m.guestEmail || 'Guest';
    return (
      <div key={m._id} style={{ marginBottom: 12, display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
        <div style={{ maxWidth: '70%', background: isMine ? '#dcfce7' : '#f1f5f9', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>{senderLabel}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
          {m.attachments?.length ? (
            <div style={{ marginTop: 8 }}>
              {m.attachments.map((a, i) => (
                <div key={i}>
                  <a href={a.fileUrl} target="_blank" rel="noreferrer">
                    {a.fileName}
                  </a>
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{new Date(m.sentAt || m.createdAt).toLocaleString()}</div>
        </div>
      </div>
    );
  });

  return (
    <div ref={ref} style={{ padding: 12, height: '40%', overflowY: 'auto'}}>
      {rendered}
    </div>
  );
}
