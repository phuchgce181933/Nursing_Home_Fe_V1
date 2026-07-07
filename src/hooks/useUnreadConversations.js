import { useCallback, useEffect, useRef, useState } from 'react';
import conversationService from '../services/conversation.service';
import socketService from '../services/socket.service';

const STORAGE_KEY = 'chat_last_viewed_conversations';
const VIEWED_EVENT = 'chat:conversationViewed';
const POLL_INTERVAL_MS = 20000;

function readLastViewedMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeLastViewedMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures (e.g. private mode quota)
  }
}

// Call when a conversation is opened/actively viewed so it stops counting as unread.
export function markConversationViewed(conversationId, when = new Date().toISOString()) {
  if (!conversationId) return;
  const map = readLastViewedMap();
  map[conversationId] = when;
  writeLastViewedMap(map);
  window.dispatchEvent(new Event(VIEWED_EVENT));
}

// Pure check for a single conversation — used to render a per-row unread dot.
export function isConversationUnread(conversation) {
  if (!conversation?.lastMessageAt || !conversation?._id) return false;
  const viewedAt = readLastViewedMap()[conversation._id];
  return !viewedAt || new Date(conversation.lastMessageAt) > new Date(viewedAt);
}

// Counts conversations (people), not messages, with activity since they were last viewed.
export default function useUnreadConversations(enabled) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await conversationService.listConversations();
      const items = res.data || res || [];
      const lastViewed = readLastViewedMap();
      const count = items.filter((c) => {
        if (!c.lastMessageAt) return false;
        const viewedAt = lastViewed[c._id];
        return !viewedAt || new Date(c.lastMessageAt) > new Date(viewedAt);
      }).length;
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
