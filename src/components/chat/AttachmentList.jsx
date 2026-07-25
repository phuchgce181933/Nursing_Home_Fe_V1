import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, X } from 'lucide-react';

// Shared between the internal chat (MessageList.jsx) and the public guest widget
// (GuestChatWidget.jsx) so both render attachments the same way: images show as an
// inline thumbnail that opens a same-page lightbox on click (no new browser tab —
// feels like "leaving" the chat), any other file type falls back to a plain download
// link with a truncated name so long filenames can't overflow the bubble.
export default function AttachmentList({ attachments, hasText, isMine }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  if (!attachments?.length) return null;

  return (
    <>
      <div className={`mt-2 flex flex-col gap-1.5 ${hasText ? 'border-t border-white/20 pt-2' : ''}`}>
        {attachments.map((a, i) => {
          const isImage = a.mimeType?.startsWith('image/');
          if (isImage) {
            return (
              <button key={i} type="button" onClick={() => setPreviewUrl(a.fileUrl)} className="block text-left">
                <img
                  src={a.fileUrl}
                  alt={a.fileName || 'Ảnh đính kèm'}
                  loading="lazy"
                  className="max-h-52 w-full max-w-[220px] cursor-zoom-in rounded-lg border border-black/5 object-cover transition-opacity hover:opacity-90"
                />
              </button>
            );
          }
          return (
            <a
              key={i}
              href={a.fileUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex min-w-0 items-center gap-1.5 text-xs underline underline-offset-2 ${
                isMine ? 'text-white/85' : 'text-navy-deep'
              }`}
            >
              <Paperclip size={12} className="flex-shrink-0" />
              <span className="min-w-0 truncate">{a.fileName}</span>
            </a>
          );
        })}
      </div>

      {previewUrl &&
        createPortal(
          // Rendered via portal straight into <body> — the chat widget's own entrance
          // animation leaves a lingering `transform` on its container (needed for the
          // "both" fill-mode to hold its final frame), which would otherwise create a
          // new containing block for a nested `position: fixed` overlay and make it
          // cover only the widget instead of the full viewport.
          <div
            className="animate-fade-in fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-6"
            onClick={() => setPreviewUrl(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              aria-label="Đóng"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X size={20} />
            </button>
            <img
              src={previewUrl}
              alt="Xem ảnh đầy đủ"
              onClick={(e) => e.stopPropagation()}
              className="animate-scale-in max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
          </div>,
          document.body
        )}
    </>
  );
}
