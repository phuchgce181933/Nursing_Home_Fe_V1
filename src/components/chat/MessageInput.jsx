import React, { useRef, useState } from 'react';
import { Paperclip, Send, X, AlertTriangle } from 'lucide-react';

const MAX_CONTENT_LENGTH = 5000;
const MAX_ATTACHMENTS = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await onSend({ content: text.trim(), attachments: files });
      setText('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Không thể gửi tin nhắn, vui lòng thử lại');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > MAX_ATTACHMENTS) {
      setError(`Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} tệp`);
      return;
    }
    const oversized = selected.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(`Tệp "${oversized.name}" vượt quá dung lượng tối đa 10MB`);
      return;
    }
    setError(null);
    setFiles(selected);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-slate-100 bg-white p-3">
      {error && (
        <div className="animate-fade-in-up mb-2 flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-1.5 text-xs text-error">
          <AlertTriangle size={13} /> {error}
        </div>
      )}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={i} className="animate-scale-in flex items-center gap-1 rounded-full bg-navy-deep/10 py-1 pl-2.5 pr-1.5 text-xs text-navy-deep">
              {f.name}
              <button type="button" onClick={() => removeFile(i)} className="rounded-full p-0.5 hover:bg-navy-deep/15">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Đính kèm tệp"
          data-tooltip="Đính kèm tệp"
          className="press-effect flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-deep"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="relative flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
            placeholder="Nhập tin nhắn..."
            maxLength={MAX_CONTENT_LENGTH}
            className="w-full rounded-full border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-navy-deep focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-deep/10"
          />
          {text.length > MAX_CONTENT_LENGTH - 200 && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
              {text.length}/{MAX_CONTENT_LENGTH}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || (!text.trim() && files.length === 0)}
          className="press-effect flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-deep text-white transition-colors hover:bg-[#132745] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}
