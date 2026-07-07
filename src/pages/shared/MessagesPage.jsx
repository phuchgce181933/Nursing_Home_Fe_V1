import React, { useEffect, useState } from 'react';
import { Search, X, Plus, MessageCircle, User, Mail, Phone, FileText, Clock } from 'lucide-react';
import ConversationList from '../../components/chat/ConversationList';
import MessageList from '../../components/chat/MessageList';
import MessageInput from '../../components/chat/MessageInput';
import conversationService from '../../services/conversation.service';
import authService from '../../services/auth.service';
import socketService from '../../services/socket.service';
import { markConversationViewed } from '../../hooks/useUnreadConversations';

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100';

function conversationDisplayName(c) {
  return c?.guestName || c?.participantUserIds?.[0]?.fullName || c?.subject || 'Cuộc trò chuyện';
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN');
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState('');
  const [convQuery, setConvQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [msgQuery, setMsgQuery] = useState('');
  const [messageResults, setMessageResults] = useState([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);

  useEffect(() => {
    loadConversations();
    socketService.connect();
    const handleGuestConversation = (payload) => {
      loadConversations();
      if (payload && payload.conversationId && selected && String(payload.conversationId) === String(selected._id)) {
        loadMessages(selected._id);
      }
    };
    const handleGuestMessage = (payload) => {
      loadConversations();
      if (payload && payload.conversationId && selected && String(payload.conversationId) === String(selected._id)) {
        loadMessages(selected._id);
        markConversationViewed(selected._id);
      }
    };
    socketService.on('notification:guest_conversation', handleGuestConversation);
    socketService.on('notification:guest_message', handleGuestMessage);
    (async () => {
      try {
        const p = await authService.fetchProfile();
        const profile = p.data || p;
        setCurrentUserId(profile._id || profile.id || null);
        if (profile.role === 'admin') {
          try {
            socketService.connect();
            socketService.joinRoom('role:admin');
          } catch (e) {
            console.warn('Failed to join admin room', e);
          }
        }
      } catch (err) {
        console.warn('Unable to load profile for messages page', err?.message || err);
      }
    })();
    return () => {
      try {
        socketService.off('notification:guest_conversation', handleGuestConversation);
        socketService.off('notification:guest_message', handleGuestMessage);
      } catch (e) {}
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    setContactInfoOpen(false);
    if (!selected) return;
    setMessagesPage(1);
    setMessagesHasMore(true);
    loadMessages(selected._id, 1);
    markConversationViewed(selected._id);
    socketService.joinRoom(`conversation:${selected._id}`);
    const handler = (payload) => {
      if (payload.conversationId === selected._id) {
        setMessages((m) => [...m, payload.message]);
        markConversationViewed(selected._id);
      }
    };
    socketService.on('message:new', handler);
    return () => {
      socketService.leaveRoom(`conversation:${selected._id}`);
      socketService.off('message:new', handler);
    };
  }, [selected]);

  const loadConversations = async () => {
    try {
      const res = await conversationService.listConversations();
      setConversations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (conversationId, page = 1) => {
    try {
      const res = await conversationService.getMessages(conversationId, { page, limit: 50 });
      const items = res.data.items || [];
      const reversed = Array.isArray(items) ? items.slice().reverse() : items;
      if (page === 1) setMessages(reversed);
      else setMessages((prev) => [...reversed, ...prev]);
      if ((items && items.length) < 50) setMessagesHasMore(false);
      setMessagesPage(page);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMoreMessages = async () => {
    if (!selected || !messagesHasMore) return;
    await loadMessages(selected._id, messagesPage + 1);
  };

  const handleSelect = (c) => setSelected(c);

  const handleDeleteConversation = async (c) => {
    if (!c || !c._id) return;
    if (!window.confirm('Xác nhận xóa cuộc trò chuyện này?')) return;
    try {
      await conversationService.deleteConversation(c._id);
      await loadConversations();
      if (selected && String(selected._id) === String(c._id)) {
        setSelected(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Xóa thất bại', err);
      alert(err.response?.data?.message || err.message || 'Xóa thất bại');
    }
  };

  const handleSend = async ({ content, attachments = [] }) => {
    if (!selected) return;
    try {
      if (attachments && attachments.length > 0) {
        await conversationService.sendMessage(selected._id, { content, attachments }, true);
      } else {
        await conversationService.sendMessage(selected._id, { content });
      }
      await loadMessages(selected._id);
      markConversationViewed(selected._id);
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchConversations = async () => {
    try {
      if (!convQuery) return loadConversations();
      const res = await conversationService.searchConversations(convQuery);
      setConversations(res.data || []);
    } catch (err) {
      console.error('Search conv failed', err);
    }
  };

  const handleSearchMessages = async () => {
    try {
      if (!msgQuery) { setMessageResults([]); return; }
      setSearchingMessages(true);
      const res = await conversationService.searchMessages(msgQuery, selected?._id, { page: 1, limit: 50 });
      setMessageResults(res.data.items || []);
    } catch (err) {
      console.error('Search messages failed', err);
      setMessageResults([]);
    }
    setSearchingMessages(false);
  };

  const handleCreateConversation = async () => {
    try {
      const res = await conversationService.createConversation({ subject: newChatSubject });
      const conv = res.data || res;
      await loadConversations();
      setNewChatOpen(false);
      setNewChatSubject('');
      if (conv && conv._id) setSelected(conv);
    } catch (err) {
      console.error('Tạo cuộc trò chuyện thất bại', err);
      alert(err.response?.data?.message || err.message || 'Tạo cuộc trò chuyện thất bại');
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Conversation list panel */}
      <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-slate-100">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Giao tiếp</h2>
            <button
              type="button"
              onClick={() => setNewChatOpen((s) => !s)}
              title="Mở cuộc trò chuyện mới"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                newChatOpen ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              }`}
            >
              {newChatOpen ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>

          <div className="relative mt-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={convQuery}
              onChange={(e) => setConvQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchConversations()}
              placeholder="Tìm cuộc trò chuyện"
              className={`${INPUT_CLASS} pl-9`}
            />
            {convQuery && (
              <button
                type="button"
                onClick={() => { setConvQuery(''); loadConversations(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {newChatOpen && (
          <div className="border-b border-slate-100 bg-slate-50 p-3.5">
            <input
              value={newChatSubject}
              onChange={(e) => setNewChatSubject(e.target.value)}
              placeholder="Tiêu đề (tuỳ chọn)"
              className={`${INPUT_CLASS} mb-2`}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateConversation}
                className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                Tạo
              </button>
              <button
                onClick={() => setNewChatOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        <ConversationList items={conversations} onSelect={handleSelect} selectedId={selected?._id} onDelete={handleDeleteConversation} />
      </div>

      {/* Conversation panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="relative flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setContactInfoOpen((s) => !s)}
                className="flex min-w-0 items-center gap-3 rounded-lg py-1 pr-2 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <User size={17} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">{conversationDisplayName(selected)}</div>
                  {selected.subject && selected.guestName && (
                    <div className="truncate text-xs text-slate-400">{selected.subject}</div>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen((s) => !s)}
                title="Tìm tin nhắn"
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                  searchOpen ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Search size={16} />
              </button>

              {contactInfoOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setContactInfoOpen(false)} />
                  <div className="absolute left-5 top-[calc(100%+6px)] z-20 w-72 rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                        <User size={19} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{conversationDisplayName(selected)}</div>
                        <div className="text-xs text-slate-400">{selected.isGuest ? 'Khách liên hệ' : 'Người dùng hệ thống'}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      {selected.guestEmail || selected.participantUserIds?.[0]?.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="flex-shrink-0 text-slate-400" />
                          <span className="truncate">{selected.guestEmail || selected.participantUserIds?.[0]?.email}</span>
                        </div>
                      ) : null}
                      {selected.guestPhone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="flex-shrink-0 text-slate-400" />
                          <span>{selected.guestPhone}</span>
                        </div>
                      )}
                      {selected.subject && (
                        <div className="flex items-start gap-2">
                          <FileText size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                          <span className="whitespace-pre-wrap">{selected.subject}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="flex-shrink-0 text-slate-400" />
                        <span>Bắt đầu lúc {formatDateTime(selected.createdAt)}</span>
                      </div>
                      {!selected.guestEmail && !selected.guestPhone && !selected.participantUserIds?.[0]?.email && (
                        <span className="text-xs italic text-slate-400">Không có thông tin liên hệ bổ sung</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {searchOpen && (
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <input
                  value={msgQuery}
                  onChange={(e) => setMsgQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchMessages()}
                  placeholder="Tìm tin nhắn (toàn bộ hoặc trong 1 cuộc)"
                  className={`${INPUT_CLASS} flex-1`}
                />
                <button
                  onClick={handleSearchMessages}
                  disabled={searchingMessages}
                  className="flex-shrink-0 rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  Tìm
                </button>
                <button
                  onClick={() => { setMsgQuery(''); setMessageResults([]); }}
                  className="flex-shrink-0 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  Xóa
                </button>
              </div>
            )}

            {messageResults.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Kết quả tìm kiếm tin nhắn</div>
                <div className="flex flex-col gap-1">
                  {messageResults.map((m) => (
                    <div
                      key={m._id || Math.random()}
                      onClick={async () => {
                        try {
                          const conv = conversations.find((c) => String(c._id) === String(m.conversationId));
                          if (conv) setSelected(conv);
                          else {
                            const r = await conversationService.getConversation(m.conversationId);
                            setSelected(r.data || r);
                            await loadConversations();
                          }
                          await loadMessages(m.conversationId);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="text-sm text-slate-700">{m.content}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {m.isGuest ? `Khách: ${m.guestName || m.guestEmail || ''}` : (m.senderUserId?.fullName || m.senderUserId?.email || '')}
                        {' • '}
                        {m.sentAt ? new Date(m.sentAt).toLocaleString('vi-VN') : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <MessageList items={messages} currentUserId={currentUserId} onLoadMore={loadMoreMessages} />
                <MessageInput onSend={handleSend} />
              </>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-300">
            <MessageCircle size={48} strokeWidth={1.5} />
            <span className="text-sm text-slate-400">Chọn một cuộc trò chuyện để xem nội dung</span>
          </div>
        )}
      </div>
    </div>
  );
}
