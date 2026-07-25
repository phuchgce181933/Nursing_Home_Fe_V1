import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import notificationsService from '../../services/notifications.service';

const POLL_INTERVAL_MS = 20000;
// Only roles that actually have a /{role}/notifications destination — manager and
// pharmacist don't have a notifications page today, so the bell stays hidden for them
// rather than linking to a dead end.
const SUPPORTED_ROLES = ['admin', 'doctor', 'nurse', 'caregiver', 'family'];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);

  const loadUnreadCount = async () => {
    try {
      const res = await notificationsService.listNotifications({ isRead: false, limit: 1 }, role);
      setUnreadCount(res.total || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!role || !SUPPORTED_ROLES.includes(role)) return;
    loadUnreadCount();
    const timer = setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const res = await notificationsService.listNotifications({ limit: 6 }, role);
      setItems(res.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) loadPreview();
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const handleItemClick = async (n) => {
    if (!n.isRead) {
      try {
        await notificationsService.markAsRead(n._id, role);
        setItems((prev) => prev.map((it) => (it._id === n._id ? { ...it, isRead: true } : it)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error(err);
      }
    }
    setOpen(false);
    navigate(`/${role}/notifications`);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      const res = await notificationsService.listNotifications({ isRead: false, limit: 500 }, role);
      const ids = (res.items || []).map((it) => it._id);
      if (ids.length) await notificationsService.markManyAsRead(ids, role);
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!role || !SUPPORTED_ROLES.includes(role)) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="Thông báo"
        onClick={toggleOpen}
        className={`press-effect relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          open ? 'bg-navy-deep text-white' : 'bg-surface-container-low text-slate-500 hover:bg-slate-200'
        }`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-scale-in absolute right-0 top-[calc(100%+8px)] z-30 w-80 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-800">Thông báo</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-navy-deep hover:underline"
              >
                <CheckCheck size={12} /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => <div key={i} className={`skeleton h-12 delay-${i}`} />)}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-300">
                <Bell size={32} strokeWidth={1.5} />
                <span className="text-xs text-slate-400">Bạn không có thông báo nào</span>
              </div>
            ) : (
              items.map((n, i) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`animate-fade-in-up delay-${(i % 6) + 1} flex w-full items-start gap-2.5 border-b border-slate-50 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                    n.isRead ? '' : 'bg-navy-deep/[0.03]'
                  }`}
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-navy-deep'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-slate-800">{n.title}</div>
                    <div className="line-clamp-2 text-xs text-slate-500">{n.content}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.updatedAt || n.createdAt)}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => { setOpen(false); navigate(`/${role}/notifications`); }}
            className="block w-full border-t border-slate-100 py-2.5 text-center text-xs font-semibold text-navy-deep hover:bg-slate-50"
          >
            Xem tất cả
          </button>
        </div>
      )}
    </div>
  );
}
