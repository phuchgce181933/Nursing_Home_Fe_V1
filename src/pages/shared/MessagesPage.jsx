import React, { useEffect, useState } from 'react';
import ConversationList from '../../components/chat/ConversationList';
import MessageList from '../../components/chat/MessageList';
import MessageInput from '../../components/chat/MessageInput';
import conversationService from '../../services/conversation.service';
import authService from '../../services/auth.service';
import socketService from '../../services/socket.service';
import familyPortalService from '../../services/familyPortal.service';

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [residents, setResidents] = useState([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState('');
  const [convQuery, setConvQuery] = useState('');
  const [msgQuery, setMsgQuery] = useState('');
  const [messageResults, setMessageResults] = useState([]);
  const [searchingMessages, setSearchingMessages] = useState(false);

  useEffect(() => {
    loadConversations();
    // connect socket
    socketService.connect();
    const handleGuestConversation = (payload) => {
      // refresh conversation list when a guest creates a conversation
      loadConversations();
      // if currently viewing that conversation, reload messages
      if (payload && payload.conversationId && selected && String(payload.conversationId) === String(selected._id)) {
        loadMessages(selected._id);
      }
    };

    const handleGuestMessage = (payload) => {
      // refresh conversations and messages as appropriate
      loadConversations();
      if (payload && payload.conversationId && selected && String(payload.conversationId) === String(selected._id)) {
        loadMessages(selected._id);
      }
    };
    socketService.on('notification:guest_conversation', handleGuestConversation);
    socketService.on('notification:guest_message', handleGuestMessage);
    // load current profile id for message alignment
    (async () => {
      try {
        const p = await authService.fetchProfile();
        const profile = p.data || p;
        setCurrentUserId(profile._id || profile.id || null);
        // if admin, ensure we join admin room to receive guest notifications
        if (profile.role === 'admin') {
          try {
            socketService.connect();
            socketService.joinRoom('role:admin');
          } catch (e) {
            console.warn('Failed to join admin room', e);
          }
        }
        // family residents not required for admin-only conversations
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
    if (!selected) return;
    // reset paging on new selection
    setMessagesPage(1);
    setMessagesHasMore(true);
    loadMessages(selected._id, 1);
    socketService.joinRoom(`conversation:${selected._id}`);
    const handler = (payload) => {
      if (payload.conversationId === selected._id) {
        setMessages((m) => [...m, payload.message]);
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
    setLoading(true);
    try {
      const res = await conversationService.getMessages(conversationId, { page, limit: 50 });
      const items = res.data.items || [];
      const reversed = Array.isArray(items) ? items.slice().reverse() : items;
      if (page === 1) {
        setMessages(reversed);
      } else {
        // prepend older messages
        setMessages((prev) => [...reversed, ...prev]);
      }
      // if returned fewer than limit, no more
      if ((items && items.length) < 50) setMessagesHasMore(false);
      setMessagesPage(page);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadMoreMessages = async () => {
    if (!selected || !messagesHasMore) return;
    const next = messagesPage + 1;
    await loadMessages(selected._id, next);
  };

  const handleSelect = (c) => {
    setSelected(c);
  };

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
      const hasFiles = attachments && attachments.length > 0;
      const payload = hasFiles ? { content } : { content };
      if (hasFiles) {
        await conversationService.sendMessage(selected._id, { content, attachments }, true);
      } else {
        await conversationService.sendMessage(selected._id, payload);
      }
      // reload messages
      await loadMessages(selected._id);
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: 0 }}>
      <div style={{ width: 300, borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
          <div style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700 }}>Conversations</div>
              <button onClick={() => setNewChatOpen((s) => !s)} style={{ fontSize: 12, padding: '6px 8px' }}>
                {newChatOpen ? 'Đóng' : 'Mở cuộc trò chuyện mới'}
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <input value={convQuery} onChange={(e) => setConvQuery(e.target.value)} placeholder="Tìm cuộc trò chuyện" style={{ width: '100%', padding: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={async () => {
                  try {
                    if (!convQuery) return loadConversations();
                    const res = await conversationService.searchConversations(convQuery);
                    setConversations(res.data || []);
                  } catch (err) {
                    console.error('Search conv failed', err);
                  }
                }} style={{ padding: '6px 8px' }}>Tìm</button>
                <button onClick={() => { setConvQuery(''); loadConversations(); }} style={{ padding: '6px 8px' }}>Clear</button>
              </div>
            </div>
          </div>
        {newChatOpen && (
          <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: 8 }}>
              <input value={newChatSubject} onChange={(e) => setNewChatSubject(e.target.value)} placeholder="Tiêu đề (tuỳ chọn)" style={{ width: '100%', padding: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
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
                }}
                style={{ padding: '8px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6 }}
              >
                Tạo
              </button>
              <button onClick={() => setNewChatOpen(false)} style={{ padding: '8px 12px' }}>
                Hủy
              </button>
            </div>
          </div>
        )}
        <ConversationList items={conversations} onSelect={handleSelect} selectedId={selected?._id} onDelete={handleDeleteConversation} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={msgQuery} onChange={(e) => setMsgQuery(e.target.value)} placeholder="Tìm tin nhắn (toàn bộ hoặc trong 1 cuộc)" style={{ flex: 1, padding: 8 }} />
          <button onClick={async () => {
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
          }} style={{ padding: '8px 12px' }}>Tìm tin nhắn</button>
          <button onClick={() => { setMsgQuery(''); setMessageResults([]); }} style={{ padding: '8px 12px' }}>Clear</button>
        </div>

        {messageResults && messageResults.length > 0 ? (
          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Kết quả tìm kiếm tin nhắn</div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {messageResults.map((m) => (
                <div key={m._id || Math.random()} style={{ padding: 8, borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={async () => {
                  try {
                    // select conversation and load messages
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
                }}>
                  <div style={{ fontSize: 13, color: '#0f172a' }}>{m.content}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{m.isGuest ? `Guest: ${m.guestName || m.guestEmail || ''}` : (m.senderUserId?.fullName || m.senderUserId?.email || '')} • {m.sentAt ? new Date(m.sentAt).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          selected ? (
          <>
            <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>{selected.subject || 'Conversation'}</div>
            <div style={{ flex: 1 }}>
              <MessageList items={messages} currentUserId={currentUserId} onLoadMore={loadMoreMessages} />
            </div>
            <MessageInput onSend={handleSend} />
          </>
          ) : (
            <div style={{ padding: 24 }}>Chọn cuộc trò chuyện để xem nội dung</div>
          )
        )}
      </div>
    </div>
  );
}
