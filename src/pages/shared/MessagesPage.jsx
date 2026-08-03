import React, { useEffect, useState } from 'react';
import { Search, X, Plus, MessageCircle, User, Mail, Phone, FileText, Clock, AlertTriangle } from 'lucide-react';
import ConversationList from '../../components/chat/ConversationList';
import MessageList from '../../components/chat/MessageList';
import MessageInput from '../../components/chat/MessageInput';
import conversationService from '../../services/conversation.service';
import authService from '../../services/auth.service';
import socketService from '../../services/socket.service';
import { markConversationViewed } from '../../hooks/useUnreadConversations';

const INPUT_CLASS =
  'w-full rounded-lg border border-outline-variant bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-navy-deep focus:outline-none focus:ring-2 focus:ring-navy-deep/10';

function otherParticipant(c, currentUserId) {
  return (c?.participantUserIds || []).find((p) => String(p?._id) !== String(currentUserId)) || c?.participantUserIds?.[0];
}

function conversationDisplayName(c, currentUserId) {
  if (c?.guestName) return c.guestName;
  return otherParticipant(c, currentUserId)?.fullName || c?.subject || 'Cuộc trò chuyện';
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN');
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState('');
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [staffQuery, setStaffQuery] = useState('');
  const [selectedTargetUserId, setSelectedTargetUserId] = useState('');
  const [convQuery, setConvQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [msgQuery, setMsgQuery] = useState('');
  const [messageResults, setMessageResults] = useState([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(null);

  const isFamily = currentUserRole === 'family';

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
        setCurrentUserRole(profile.role || null);
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
    } finally {
      setConversationsLoading(false);
    }
  };

  const loadMessages = async (conversationId, page = 1) => {
    try {
      if (page === 1) setMessagesLoading(true);
      const res = await conversationService.getMessages(conversationId, { page, limit: 50 });
      const items = res.data.items || [];
      const reversed = Array.isArray(items) ? items.slice().reverse() : items;
      if (page === 1) setMessages(reversed);
      else setMessages((prev) => [...reversed, ...prev]);
      if ((items && items.length) < 50) setMessagesHasMore(false);
      setMessagesPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selected || !messagesHasMore) return;
    await loadMessages(selected._id, messagesPage + 1);
  };

  const handleSelect = (c) => setSelected(c);

  const requestDeleteConversation = (c) => {
    if (!c || !c._id) return;
    setPageError(null);
    setConfirmDeleteConv(c);
  };

  const handleDeleteConversation = async () => {
    const c = confirmDeleteConv;
    if (!c || !c._id) return;
    try {
      await conversationService.deleteConversation(c._id);
      await loadConversations();
      if (selected && String(selected._id) === String(c._id)) {
        setSelected(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Xóa thất bại', err);
      setPageError(err.response?.data?.message || err.message || 'Không thể xóa cuộc trò chuyện');
    } finally {
      setConfirmDeleteConv(null);
    }
  };

  const handleSend = async ({ content, attachments = [] }) => {
    if (!selected) return;
    setPageError(null);
    try {
      if (attachments && attachments.length > 0) {
        await conversationService.sendMessage(selected._id, { content, attachments }, true);
      } else {
        await conversationService.sendMessage(selected._id, { content });
      }
      // The message we just sent arrives back through the 'message:new' socket
      // listener (we're a member of the room too) — no need to also refetch the
      // full history here, that would just race the socket event.
      markConversationViewed(selected._id);
      await loadConversations();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || err.message || 'Không thể gửi tin nhắn';
      setPageError(message);
      // Re-throw so MessageInput knows the send failed and keeps the drafted text/files
      // instead of clearing them as if it had succeeded.
      throw new Error(message);
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

  const openNewChat = () => {
    const next = !newChatOpen;
    setNewChatOpen(next);
    if (next && !isFamily && staffDirectory.length === 0) {
      conversationService
        .getStaffDirectory()
        .then((res) => setStaffDirectory(res.data || []))
        .catch((err) => console.error('Không tải được danh bạ nhân viên', err));
    }
  };

  const handleCreateConversation = async () => {
    setPageError(null);
    try {
      let res;
      if (isFamily) {
        // Family always messages admin — no target picker (nurse/doctor direct chat removed).
        res = await conversationService.createConversation({ subject: newChatSubject });
      } else {
        if (!selectedTargetUserId) return;
        res = await conversationService.createStaffConversation(selectedTargetUserId, newChatSubject);
      }
      const conv = res.data || res;
      await loadConversations();
      setNewChatOpen(false);
      setNewChatSubject('');
      setSelectedTargetUserId('');
      setStaffQuery('');
      if (conv && conv._id) setSelected(conv);
    } catch (err) {
      console.error('Tạo cuộc trò chuyện thất bại', err);
      setPageError(err.response?.data?.message || err.message || 'Không thể tạo cuộc trò chuyện');
    }
  };

  const filteredStaffDirectory = staffQuery
    ? staffDirectory.filter((u) => (u.fullName || u.email || '').toLowerCase().includes(staffQuery.toLowerCase()))
    : staffDirectory;

  return (
    <div className="relative flex h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm">
      {pageError && (
        <div className="animate-slide-down absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-error/20 bg-white px-4 py-2.5 text-sm text-error shadow-lg">
          <AlertTriangle size={15} />
          {pageError}
          <button onClick={() => setPageError(null)} className="ml-1 rounded-full p-0.5 hover:bg-error/10">
            <X size={13} />
          </button>
        </div>
      )}

      {confirmDeleteConv && (
        <>
          <div className="absolute inset-0 z-40 bg-slate-900/20" onClick={() => setConfirmDeleteConv(null)} />
          <div className="animate-scale-in absolute left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-2xl">
            <div className="text-sm font-bold text-slate-800">Xóa cuộc trò chuyện?</div>
            <p className="mt-1.5 text-sm text-slate-500">Toàn bộ tin nhắn trong cuộc trò chuyện này sẽ bị xóa vĩnh viễn.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteConv(null)}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConversation}
                className="press-effect rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        </>
      )}

      {/* Conversation list panel */}
      <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-slate-100">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Giao tiếp</h2>
            <button
              type="button"
              onClick={openNewChat}
              title="Mở cuộc trò chuyện mới"
              className={`press-effect flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                newChatOpen ? 'bg-navy-deep text-white' : 'bg-navy-deep/10 text-navy-deep hover:bg-navy-deep/15'
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
          <div className="animate-slide-down border-b border-slate-100 bg-surface-container-low p-3.5">
            {isFamily ? (
              <>
                <input
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                  placeholder="Tiêu đề (tuỳ chọn)"
                  className={`${INPUT_CLASS} mb-2 bg-white`}
                />
                <div className="mb-2 text-xs font-medium text-slate-500">Gửi cho quản trị viên</div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateConversation}
                    className="press-effect flex-1 rounded-lg bg-navy-deep py-2 text-sm font-semibold text-white transition-colors hover:bg-[#132745]"
                  >
                    Tạo
                  </button>
                  <button
                    onClick={() => setNewChatOpen(false)}
                    className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={staffQuery}
                    onChange={(e) => setStaffQuery(e.target.value)}
                    placeholder="Tìm đồng nghiệp theo tên..."
                    className={`${INPUT_CLASS} bg-white pl-9`}
                  />
                </div>
                <div className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-outline-variant bg-white">
                  {filteredStaffDirectory.length === 0 ? (
                    <div className="px-3 py-3 text-center text-xs text-slate-400">Không tìm thấy đồng nghiệp phù hợp</div>
                  ) : (
                    filteredStaffDirectory.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => setSelectedTargetUserId(u._id)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          selectedTargetUserId === u._id ? 'bg-navy-deep/10 text-navy-deep' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate font-medium">{u.fullName || u.email}</span>
                        <span className="flex-shrink-0 text-[11px] uppercase text-slate-400">{u.role}</span>
                      </button>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateConversation}
                    disabled={!selectedTargetUserId}
                    className="press-effect flex-1 rounded-lg bg-navy-deep py-2 text-sm font-semibold text-white transition-colors hover:bg-[#132745] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Bắt đầu trò chuyện
                  </button>
                  <button
                    onClick={() => setNewChatOpen(false)}
                    className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <ConversationList
          items={conversations}
          loading={conversationsLoading}
          onSelect={handleSelect}
          selectedId={selected?._id}
          onDelete={requestDeleteConversation}
          currentUserId={currentUserId}
        />
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
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy-deep/10 text-navy-deep">
                  <User size={17} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">{conversationDisplayName(selected, currentUserId)}</div>
                  {selected.subject && selected.guestName && (
                    <div className="truncate text-xs text-slate-400">{selected.subject}</div>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen((s) => !s)}
                title="Tìm tin nhắn"
                data-tooltip="Tìm tin nhắn"
                className={`press-effect flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                  searchOpen ? 'bg-navy-deep text-white' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Search size={16} />
              </button>

              {contactInfoOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setContactInfoOpen(false)} />
                  <div className="animate-scale-in absolute left-5 top-[calc(100%+6px)] z-20 w-72 rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-navy-deep/10 text-navy-deep">
                        <User size={19} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{conversationDisplayName(selected, currentUserId)}</div>
                        <div className="text-xs text-slate-400">{selected.isGuest ? 'Khách liên hệ' : 'Người dùng hệ thống'}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      {selected.guestEmail || otherParticipant(selected, currentUserId)?.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="flex-shrink-0 text-slate-400" />
                          <span className="truncate">{selected.guestEmail || otherParticipant(selected, currentUserId)?.email}</span>
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
                      {!selected.guestEmail && !selected.guestPhone && !otherParticipant(selected, currentUserId)?.email && (
                        <span className="text-xs italic text-slate-400">Không có thông tin liên hệ bổ sung</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {searchOpen && (
              <div className="animate-slide-down flex items-center gap-2 border-b border-slate-100 bg-surface-container-low px-5 py-3">
                <input
                  value={msgQuery}
                  onChange={(e) => setMsgQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchMessages()}
                  placeholder="Tìm tin nhắn (toàn bộ hoặc trong 1 cuộc)"
                  className={`${INPUT_CLASS} flex-1 bg-white`}
                />
                <button
                  onClick={handleSearchMessages}
                  disabled={searchingMessages}
                  className="press-effect flex-shrink-0 rounded-lg bg-navy-deep px-3.5 py-2.5 text-sm font-medium text-white hover:bg-[#132745] disabled:opacity-60"
                >
                  Tìm
                </button>
                <button
                  onClick={() => { setMsgQuery(''); setMessageResults([]); }}
                  className="flex-shrink-0 rounded-lg border border-outline-variant px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  Xóa
                </button>
              </div>
            )}

            {messageResults.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Kết quả tìm kiếm tin nhắn</div>
                <div className="flex flex-col gap-1">
                  {messageResults.map((m, i) => (
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
                      className={`animate-fade-in-up delay-${(i % 6) + 1} glow-hover cursor-pointer rounded-lg border border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50`}
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
                <MessageList items={messages} loading={messagesLoading} currentUserId={currentUserId} onLoadMore={loadMoreMessages} />
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
