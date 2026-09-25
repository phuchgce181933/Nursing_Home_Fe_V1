import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, User, Mail, Phone, Send, AlertCircle, Bot, ChevronRight, Paperclip } from 'lucide-react';
import conversationService from '../services/conversation.service';
import { useToast } from '../hooks/useToast';
import AttachmentList from './chat/AttachmentList';

const AUTHENTICATED_PREFIXES = ['/admin', '/doctor', '/nurse', '/caregiver', '/pharmacist', '/family'];
// Auth pages aren't "browsing" pages either — a visitor here is either about to log in
// (and gets real messaging once authenticated) or resetting credentials, so the guest
// contact widget doesn't belong here any more than it does inside the dashboards.
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];
const STORAGE_KEY = 'guest_chat_conversation';

const SUGGESTION_DEFS = [
  { id: 'services', key: 'services', linkTo: '/services' },
  { id: 'pricing', key: 'pricing', linkTo: '/pricing' },
  { id: 'tour', key: 'tour', linkTo: '/contact' },
  { id: 'admission', key: 'admission', linkTo: '/contact' },
  { id: 'living', key: 'living', linkTo: '/living' },
];

function buildSuggestions(t) {
  return SUGGESTION_DEFS.map((def) => ({
    id: def.id,
    label: t(`guestChat.suggestions.${def.key}.label`),
    reply: [
      t(`guestChat.suggestions.${def.key}.reply1`),
      { text: t(`guestChat.suggestions.${def.key}.linkText`), to: def.linkTo },
      t(`guestChat.suggestions.${def.key}.reply2`),
    ],
  }));
}

function ReplyParts({ parts }) {
  return (parts || []).map((part, i) =>
    typeof part === 'string' ? (
      <React.Fragment key={i}>{part}</React.Fragment>
    ) : (
      <Link key={i} to={part.to} className="font-semibold text-navy-deep underline underline-offset-2 hover:opacity-80">
        {part.text}
      </Link>
    )
  );
}

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

// Khớp với utils/validators.js phía backend (EMAIL_REGEX / PHONE_REGEX) để tránh lệch
// giữa validate client và server — số Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^(\+84|0)[0-9]{8,10}$/;

const FIELD_BASE_CLASS =
  'w-full rounded-lg border bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2';
const FIELD_NORMAL_CLASS = `${FIELD_BASE_CLASS} border-outline-variant focus:border-navy-deep focus:ring-navy-deep/10`;
const FIELD_ERROR_CLASS = `${FIELD_BASE_CLASS} border-status-error/50 focus:border-status-error focus:ring-status-error/10`;
const PLAIN_INPUT_CLASS =
  'rounded-lg border border-outline-variant bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-navy-deep focus:outline-none focus:ring-2 focus:ring-navy-deep/10';

export default function GuestChatWidget() {
  const { t } = useTranslation();
  const location = useLocation();
  const isAuthenticatedArea =
    AUTHENTICATED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix)) ||
    AUTH_ROUTES.includes(location.pathname);
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [files, setFiles] = useState([]);
  const pollRef = useRef(null);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, showSuggestions, botTyping, conversation]);

  const fetchMessages = async (convId) => {
    try {
      const res = await conversationService.getGuestMessages(convId, { page: 1, limit: 20 });
      const d = res.data || res;
      // backend already returns oldest-first, ready for top-to-bottom chat display
      const serverItems = Array.isArray(d.items) ? d.items : [];
      setMessages((prev) => {
        // Bot canned replies only exist client-side (never persisted) — carry them
        // over and re-sort by actual timestamp so a real reply that arrives later
        // (e.g. admin's) doesn't get displayed before a bot reply that fired earlier.
        const localBots = prev.filter((m) => m.isBot);
        return [...serverItems, ...localBots].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
      });
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
    if (!name.trim()) nextErrors.name = t('guestChat.errNameRequired');

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail && !trimmedPhone) {
      nextErrors.contact = t('guestChat.errContactRequired');
    } else {
      if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
        nextErrors.email = t('guestChat.errEmailInvalid');
      }
      if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
        nextErrors.phone = t('guestChat.errPhoneInvalid');
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createConversation = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { guestName: name, guestEmail: email, guestPhone: phone };
      const res = await conversationService.createGuestConversation(payload);
      const data = res.data || res;
      const conv = data.conversation || data;
      setConversation(conv);
      if (data.message) setMessages([data.message]);
      writeSavedConversation({ conversationId: conv._id || conv.id, name, email, phone });
      startPolling(conv._id || conv.id);
      setShowSuggestions(true);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || t('guestChat.errCreateFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!conversation || (!message.trim() && files.length === 0)) return;
    // Guest chose to type their own message instead of picking a suggestion — the
    // canned prompt is no longer relevant, so dismiss it instead of leaving it
    // stuck on screen underneath whatever they just sent.
    setShowSuggestions(false);
    try {
      const hasFiles = files.length > 0;
      const payload = { content: message, guestName: name, guestEmail: email, guestPhone: phone };
      if (hasFiles) payload.attachments = files;
      const res = await conversationService.sendGuestMessage(conversation._id || conversation.id, payload, hasFiles);
      const d = res.data || res;
      setMessages((m) => [...m, d]);
      setMessage('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || t('guestChat.errSendFailed'), 'error');
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Clicking a suggestion sends it as a real guest message (so admin still receives it
  // and can reply live), then shows a canned automatic reply after a short "typing" beat.
  const handleQuickReply = async (item) => {
    setShowSuggestions(false);
    try {
      const res = await conversationService.sendGuestMessage(conversation._id || conversation.id, {
        content: item.label,
        guestName: name,
        guestEmail: email,
        guestPhone: phone,
      });
      const d = res.data || res;
      setMessages((m) => [...m, d]);
    } catch (err) {
      console.error(err);
    }
    setBotTyping(true);
    setTimeout(() => {
      setBotTyping(false);
      setMessages((m) => [...m, { _id: `bot-${item.id}-${Date.now()}`, isBot: true, replyParts: item.reply, sentAt: new Date().toISOString() }]);
    }, 900);
  };

  const isGuestMessage = (m) => !m.senderUserId && !m.isBot;

  if (isAuthenticatedArea) return null;

  return (
    <div>
      <div className="fixed right-5 bottom-5 z-[9999]">
        {!open ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
            aria-label={t('guestChat.openWidget')}
            className="press-effect group relative flex h-14 w-14 items-center justify-center rounded-full bg-navy-deep text-white shadow-lg shadow-navy-deep/30 transition-transform duration-200 hover:scale-105"
          >
            <span className="absolute inset-0 rounded-full bg-navy-deep opacity-40 animate-ping" />
            <MessageCircle size={23} className="relative" />
          </button>
        ) : (
          <div
            className={`animate-scale-in flex w-[320px] max-w-[85vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 ${
              conversation ? 'h-[480px] max-h-[70vh]' : 'max-h-[85vh]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 bg-navy-deep px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} />
                <span className="text-sm font-semibold">{t('guestChat.headerTitle')}</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); stopPolling(); }}
                aria-label={t('guestChat.closeWidget')}
                className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-3.5">
              {!conversation ? (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-slate-500">
                    {t('guestChat.introText')}
                  </p>

                  <Field icon={<User size={16} />} error={errors.name}>
                    <input
                      className={errors.name ? FIELD_ERROR_CLASS : FIELD_NORMAL_CLASS}
                      placeholder={t('guestChat.namePlaceholder')}
                      value={name}
                      onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((prev) => ({ ...prev, name: undefined })); }}
                    />
                  </Field>

                  <Field icon={<Mail size={16} />} error={errors.email}>
                    <input
                      className={errors.email ? FIELD_ERROR_CLASS : FIELD_NORMAL_CLASS}
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEmail(v);
                        setErrors((prev) => {
                          if (!prev.email && !(prev.contact && (v.trim() || phone.trim()))) return prev;
                          const next = { ...prev };
                          delete next.email;
                          if (v.trim() || phone.trim()) delete next.contact;
                          return next;
                        });
                      }}
                    />
                  </Field>

                  <Field icon={<Phone size={16} />} error={errors.phone || errors.contact}>
                    <input
                      className={errors.phone || errors.contact ? FIELD_ERROR_CLASS : FIELD_NORMAL_CLASS}
                      placeholder={t('guestChat.phonePlaceholder')}
                      value={phone}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPhone(v);
                        setErrors((prev) => {
                          if (!prev.phone && !(prev.contact && (v.trim() || email.trim()))) return prev;
                          const next = { ...prev };
                          delete next.phone;
                          if (v.trim() || email.trim()) delete next.contact;
                          return next;
                        });
                      }}
                    />
                  </Field>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {messages.map((m) => {
                    if (m.isBot) {
                      return (
                        <div key={m._id} className="animate-fade-in-up flex items-start gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sage-healing/15 text-sage-healing">
                            <Bot size={15} />
                          </div>
                          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-surface-container-low px-3.5 py-2 text-sm leading-snug text-slate-700 shadow-sm">
                            <ReplyParts parts={m.replyParts} />
                          </div>
                        </div>
                      );
                    }
                    const guest = isGuestMessage(m);
                    return (
                      <div key={m._id || m.id} className={`animate-fade-in-up flex flex-col ${guest ? 'items-end' : 'items-start'}`}>
                        <span className="mb-1 px-1 text-[11px] font-medium text-slate-400">
                          {m.guestName || m.senderUserId?.fullName || (guest ? t('messagesPage.you') : t('messagesPage.consultant'))}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                            guest
                              ? 'rounded-tr-sm bg-navy-deep text-white'
                              : 'rounded-tl-sm bg-surface-container-low text-slate-700'
                          }`}
                        >
                          {m.content}
                          <AttachmentList attachments={m.attachments} hasText={!!m.content} isMine={guest} />
                        </div>
                      </div>
                    );
                  })}

                  {botTyping && (
                    <div className="animate-fade-in flex items-center gap-2">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sage-healing/15 text-sage-healing">
                        <Bot size={15} />
                      </div>
                      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-container-low px-3.5 py-2.5">
                        <span className="chat-typing-dot" />
                        <span className="chat-typing-dot" />
                        <span className="chat-typing-dot" />
                      </div>
                    </div>
                  )}

                  {showSuggestions && (
                    <div className="animate-fade-in-up flex flex-col gap-2 pt-1">
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sage-healing/15 text-sage-healing">
                          <Bot size={15} />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-surface-container-low px-3.5 py-2 text-sm text-slate-700 shadow-sm">
                          {t('guestChat.suggestionPrompt')}
                        </div>
                      </div>
                      <div className="ml-9 flex flex-col gap-1.5">
                        {buildSuggestions(t).map((item, i) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleQuickReply(item)}
                            className={`animate-fade-in-up delay-${Math.min(i + 1, 6)} press-effect flex items-center justify-between gap-2 rounded-xl border border-outline-variant bg-white px-3 py-2 text-left text-[12.5px] font-medium text-navy-deep transition-colors hover:bg-navy-deep/5`}
                          >
                            {item.label}
                            <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                  className="press-effect flex w-full items-center justify-center gap-2 rounded-xl bg-sage-healing py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} />
                  {submitting ? t('guestChat.sending') : t('guestChat.startChat')}
                </button>
              ) : (
                <div>
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
                      title={t('messagesPage.attachFile')}
                      data-tooltip={t('messagesPage.attachFile')}
                      className="press-effect flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-deep"
                    >
                      <Paperclip size={17} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setFiles(Array.from(e.target.files))}
                    />
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                      placeholder={t('messagesPage.messagePlaceholder')}
                      className={`${PLAIN_INPUT_CLASS} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendMessage(); }}
                      aria-label={t('guestChat.sendLabel')}
                      disabled={!message.trim() && files.length === 0}
                      className="press-effect flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-deep text-white transition-colors hover:bg-[#132745] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send size={16} />
                    </button>
                  </div>
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
