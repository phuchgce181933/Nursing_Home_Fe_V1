import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, User, Mail, Phone, MessageSquare, Send, AlertCircle } from 'lucide-react';
import conversationService from '../services/conversation.service';
import { useToast } from '../hooks/useToast';

const AUTHENTICATED_PREFIXES = ['/admin', '/manager', '/doctor', '/nurse', '/caregiver', '/pharmacist', '/family'];
const STORAGE_KEY = 'guest_chat_conversation';

function readSavedConversation() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeSavedConversation(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage failures (e.g. private mode quota)
  }
}

const FIELD_BASE_CLASS =
  'w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2';
const FIELD_NORMAL_CLASS = `${FIELD_BASE_CLASS} border-slate-200 focus:border-violet-500 focus:ring-violet-100`;
const FIELD_ERROR_CLASS = `${FIELD_BASE_CLASS} border-red-300 focus:border-red-500 focus:ring-red-100`;
const PLAIN_INPUT_CLASS =
  'rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100';

export default function GuestChatWidget() {
  const location = useLocation();
  const isAuthenticatedArea = AUTHENTICATED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const pollRef = useRef(null);

  useEffect(() => {
    if (isAuthenticatedArea) return undefined;
    const saved = readSavedConversation();
    if (saved && saved.conversationId) {
      setConversation({ _id: saved.conversationId });
      setName(saved.name || '');
      setEmail(saved.email || '');
      setPhone(saved.phone || '');
      fetchMessages(saved.conversationId);
      startPolling(saved.conversationId);
    }
    return () => stopPolling();
  }, []);

  // Route can change client-side without unmounting this component (it's rendered
  // unconditionally in App.jsx) — make sure polling actually stops when hidden.
  useEffect(() => {
    if (isAuthenticatedArea) stopPolling();
  }, [isAuthenticatedArea]);

  const fetchMessages = async (convId) => {
    try {
      const res = await conversationService.getGuestMessages(convId, { page: 1, limit: 20 });
      const d = res.data || res;
      // backend already returns oldest-first, ready for top-to-bottom chat display
      setMessages(Array.isArray(d.items) ? d.items : []);
    } catch (e) {
      // ignore
    }
  };

  const startPolling = (convId) => {
    stopPolling();
    pollRef.current = setInterval(() => fetchMessages(convId), 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Vui lòng nhập họ tên';
    if (!email.trim() && !phone.trim()) nextErrors.contact = 'Vui lòng nhập email hoặc số điện thoại';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createConversation = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { guestName: name, guestEmail: email, guestPhone: phone, content: message };
      const res = await conversationService.createGuestConversation(payload);
      const data = res.data || res;
      const conv = data.conversation || data;
      setConversation(conv);
      if (data.message) setMessages([data.message]);
      writeSavedConversation({ conversationId: conv._id || conv.id, name, email, phone });
      startPolling(conv._id || conv.id);
      setMessage('');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Không thể tạo liên hệ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!conversation || !message) return;
    try {
      const res = await conversationService.sendGuestMessage(conversation._id || conversation.id, { content: message, guestName: name, guestEmail: email, guestPhone: phone });
      const d = res.data || res;
      setMessages((m) => [...m, d]);
      setMessage('');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Không gửi được', 'error');
    }
  };

  const isGuestMessage = (m) => !m.senderUserId;

  if (isAuthenticatedArea) return null;

  return (
    <div>
      <div className="fixed right-5 bottom-5 z-[9999]">
        {!open ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
            aria-label="Mở khung liên hệ tư vấn"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-purple-400 opacity-40 animate-ping" />
            <MessageCircle size={26} className="relative" />
          </button>
        ) : (
          <div className="flex h-[560px] max-h-[80vh] w-[380px] max-w-[90vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle size={19} />
                <span className="font-semibold">Liên hệ tư vấn</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); stopPolling(); }}
                aria-label="Đóng"
                className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!conversation ? (
                <div className="flex flex-col gap-3.5">
                  <p className="text-sm text-slate-500">
                    Để lại thông tin, đội ngũ An Nhiên sẽ liên hệ tư vấn cho bạn sớm nhất.
                  </p>

                  <Field icon={<User size={16} />} error={errors.name}>
                    <input
                      className={errors.name ? FIELD_ERROR_CLASS : FIELD_NORMAL_CLASS}
                      placeholder="Họ tên"
                      value={name}
                      onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((prev) => ({ ...prev, name: undefined })); }}
                    />
                  </Field>

                  <Field icon={<Mail size={16} />}>
                    <input
                      className={errors.contact ? FIELD_ERROR_CLASS : FIELD_NORMAL_CLASS}
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (errors.contact) setErrors((prev) => ({ ...prev, contact: undefined })); }}
                    />
                  </Field>

                  <Field icon={<Phone size={16} />} error={errors.contact}>
                    <input
                      className={errors.contact ? FIELD_ERROR_CLASS : FIELD_NORMAL_CLASS}
                      placeholder="Số điện thoại"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); if (errors.contact) setErrors((prev) => ({ ...prev, contact: undefined })); }}
                    />
                  </Field>

                  <Field icon={<MessageSquare size={16} />} align="top">
                    <textarea
                      className={`${FIELD_NORMAL_CLASS} resize-none`}
                      placeholder="Nội dung cần tư vấn..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                    />
                  </Field>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {messages.map((m) => {
                    const guest = isGuestMessage(m);
                    return (
                      <div key={m._id || m.id} className={`flex flex-col ${guest ? 'items-end' : 'items-start'}`}>
                        <span className="mb-1 px-1 text-[11px] font-medium text-slate-400">
                          {m.guestName || m.senderUserId?.fullName || (guest ? 'Bạn' : 'Tư vấn viên')}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                            guest
                              ? 'rounded-tr-sm bg-violet-600 text-white'
                              : 'rounded-tl-sm bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-3.5">
              {!conversation ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); createConversation(); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} />
                  {submitting ? 'Đang gửi...' : 'Bắt đầu chat'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                    placeholder="Nhập tin nhắn..."
                    className={`${PLAIN_INPUT_CLASS} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendMessage(); }}
                    aria-label="Gửi"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-700"
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon, align = 'center', error, children }) {
  return (
    <div>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 text-slate-400 ${align === 'top' ? 'top-3' : 'top-1/2 -translate-y-1/2'}`}>
          {icon}
        </span>
        {children}
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 pl-1 text-xs text-red-500">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
