import { useCallback, useEffect, useRef, useState } from 'react';
import conversationService from '../services/conversation.service';
import socketService from '../services/socket.service';

const VIEWED_EVENT = 'chat:conversationViewed';
const POLL_INTERVAL_MS = 20000;

// Call when a conversation is opened/actively viewed so it stops counting as unread.
// Marks all messages in it read on the server, then triggers a badge refresh.
export async function markConversationViewed(conversationId) {
  if (!conversationId) return;
  try {
    await conversationService.markMessagesRead(conversationId);
  } catch {
    // ignore — badge will just stay stale until the next poll/refresh
  }
  window.dispatchEvent(new Event(VIEWED_EVENT));
}

// Pure check for a single conversation — used to render a per-row unread dot.
// `unreadCount` is computed server-side (unread message count for the current user).
export function isConversationUnread(conversation) {
  return (conversation?.unreadCount || 0) > 0;
}

// Counts conversations (people), not messages, with unread activity.
export default function useUnreadConversations(enabled) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await conversationService.listConversations();
      const items = res.data || res || [];
      const count = items.filter((c) => (c.unreadCount || 0) > 0).length;
      setUnreadCount(count);
    } catch {
      // ignore — badge just stays at its last known value
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      return undefined;
    }

    refresh();
    window.addEventListener(VIEWED_EVENT, refresh);
    socketService.on('notification:guest_message', refresh);
    socketService.on('notification:guest_conversation', refresh);
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener(VIEWED_EVENT, refresh);
      socketService.off('notification:guest_message', refresh);
      socketService.off('notification:guest_conversation', refresh);
      clearInterval(pollRef.current);
    };
  }, [enabled, refresh]);

  return unreadCount;
}
