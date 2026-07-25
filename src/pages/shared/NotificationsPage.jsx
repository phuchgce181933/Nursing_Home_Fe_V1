import React, { useEffect, useState } from 'react';
import { Settings, Bell, Trash2, CheckCheck, AlertTriangle, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import notificationsService from '../../services/notifications.service';

const CATEGORY_LABELS = {
  incident: 'Sự cố',
  health: 'Sức khỏe',
  appointment: 'Cuộc hẹn',
  activity: 'Hoạt động',
  billing: 'Thanh toán',
  message: 'Tin nhắn',
  system: 'Hệ thống',
};

const SELECT_CLASS =
  'rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-slate-600 transition-colors focus:border-navy-deep focus:outline-none focus:ring-2 focus:ring-navy-deep/10';

function NotificationSkeletonRow({ delay }) {
  return (
    <div className={`animate-fade-in delay-${delay} flex items-start gap-3 rounded-xl border border-slate-100 p-4`}>
      <div className="skeleton h-9 w-9 flex-shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

function NotificationsPage({ role = 'family' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterRead, setFilterRead] = useState('all');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settings, setSettings] = useState({ enabledCategories: [], deliveryChannels: [], doNotDisturb: false });
  const [markingAll, setMarkingAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'one'|'bulk', id? }

  const getNotificationTitle = (item) => item.title || item.subject || item.message || CATEGORY_LABELS[item.category] || 'Thông báo mới';
  const getNotificationContent = (item) => item.content || item.message || item.body || item.description || item.text || 'Nội dung đang cập nhật...';

  const buildQuery = (p = 1) => {
    const q = { page: p, limit };
    if (search) q.search = search;
    if (filterRead === 'unread') q.isRead = false;
    if (filterRead === 'read') q.isRead = true;
    if (category) q.category = category;
    return q;
  };

  const handleApplyFilters = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyFilters();
    }
  };

  const fetch = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsService.listNotifications(buildQuery(p), role);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || p);
      setSelected(new Set());
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(1);
    notificationsService.getCategories(role).then((cats) => setCategories(cats || [])).catch(() => setCategories([]));
  }, [search, filterRead, category, role]);

  const loadSettings = async () => {
    try {
      const s = await notificationsService.getSettings(role);
      setSettings(s || { enabledCategories: [], deliveryChannels: [], doNotDisturb: false });
    } catch (e) {
      setSettings({ enabledCategories: [], deliveryChannels: [], doNotDisturb: false });
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsService.markAsRead(id, role);
      setItems((prev) => prev.map((it) => (it._id === id ? { ...it, isRead: true } : it)));
      setSelected((s) => {
        const ns = new Set(s);
        ns.delete(id);
        return ns;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsService.deleteNotification(id, role);
      setItems((prev) => prev.filter((it) => it._id !== id));
      setSelected((s) => {
        const ns = new Set(s);
        ns.delete(id);
        return ns;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

  const toggleSelect = (id) => {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  };

  const allOnPageSelected = items.length > 0 && items.every((i) => selected.has(i._id));

  const toggleSelectPage = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((i) => i._id)));
  };

  const handleBulkMarkRead = async () => {
    if (!selected.size) return;
    try {
      await notificationsService.markManyAsRead(Array.from(selected), role);
      setItems((prev) => prev.map((it) => (selected.has(it._id) ? { ...it, isRead: true } : it)));
      setSelected(new Set());
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    try {
      await notificationsService.deleteMany(Array.from(selected), role);
      setItems((prev) => prev.filter((it) => !selected.has(it._id)));
      setSelected(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

  // Marks every unread notification in the inbox as read, not just the current page.
  const handleMarkAllInInbox = async () => {
    try {
      setMarkingAll(true);
      const res = await notificationsService.listNotifications({ isRead: false, limit: 500 }, role);
      const ids = (res.items || []).map((it) => it._id);
      if (ids.length) await notificationsService.markManyAsRead(ids, role);
      await fetch(page);
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const unreadOnPage = items.filter((i) => !i.isRead).length;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-deep/10 text-navy-deep">
            <Bell size={19} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Thông báo</h2>
            <p className="text-sm text-slate-400">Xem, lọc, đánh dấu và xóa thông báo của bạn</p>
          </div>
        </div>

        <div className="relative">
          <button
            title="Cài đặt thông báo"
            onClick={() => { setShowSettingsPanel((s) => !s); if (!showSettingsPanel) loadSettings(); }}
            className={`press-effect flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              showSettingsPanel ? 'bg-navy-deep text-white' : 'bg-surface-container-low text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Settings size={17} />
          </button>
          {showSettingsPanel && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSettingsPanel(false)} />
              <div className="animate-scale-in absolute right-0 top-[calc(100%+8px)] z-20 w-80 rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
                <div className="mb-3 text-sm font-bold text-slate-800">Cài đặt thông báo</div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={!!settings.doNotDisturb}
                    onChange={(e) => setSettings((s) => ({ ...s, doNotDisturb: e.target.checked }))}
                    className="h-4 w-4 rounded border-outline-variant"
                  />
                  Không làm phiền (tắt toàn bộ thông báo đẩy)
                </label>
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Loại thông báo muốn nhận
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <label
                        key={c}
                        className="flex items-center gap-1.5 rounded-full border border-outline-variant px-2.5 py-1 text-xs text-slate-600"
                      >
                        <input
                          type="checkbox"
                          checked={settings.enabledCategories?.includes(c)}
                          onChange={(e) => {
                            setSettings((s) => {
                              const set = new Set(s.enabledCategories || []);
                              if (e.target.checked) set.add(c); else set.delete(c);
                              return { ...s, enabledCategories: Array.from(set) };
                            });
                          }}
                          className="h-3.5 w-3.5"
                        />
                        {CATEGORY_LABELS[c] || c}
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => { await notificationsService.updateSettings(settings, role); setShowSettingsPanel(false); }}
                  className="press-effect mt-4 w-full rounded-lg bg-navy-deep py-2 text-sm font-semibold text-white transition-colors hover:bg-[#132745]"
                >
                  Lưu cài đặt
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-slate-500">
            <Search size={15} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleApplyFilters}
              placeholder="Tìm thông báo"
              className="w-36 border-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
            />
          </div>
          <select value={filterRead} onChange={(e) => setFilterRead(e.target.value)} className={SELECT_CLASS}>
            <option value="all">Tất cả</option>
            <option value="unread">Chưa đọc</option>
            <option value="read">Đã đọc</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLASS}>
            <option value="">Tất cả loại</option>
            {categories.map((c) => (<option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleSelectPage}
            disabled={!items.length}
            className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            {allOnPageSelected ? 'Bỏ chọn trang này' : 'Chọn trang này'}
          </button>
          <button
            onClick={handleBulkMarkRead}
            disabled={!selected.size}
            className="press-effect flex items-center gap-1.5 rounded-lg bg-status-success/10 px-3 py-2 text-xs font-semibold text-status-success transition-colors hover:bg-status-success/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck size={13} /> Đánh dấu đã đọc ({selected.size})
          </button>
          <button
            onClick={() => selected.size && setConfirmDelete({ type: 'bulk' })}
            disabled={!selected.size}
            className="press-effect flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={13} /> Xóa ({selected.size})
          </button>
          <button
            onClick={handleMarkAllInInbox}
            disabled={markingAll}
            className="press-effect rounded-lg border border-navy-deep/20 px-3 py-2 text-xs font-semibold text-navy-deep transition-colors hover:bg-navy-deep/5 disabled:opacity-60"
          >
            {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
          </button>
        </div>
      </div>

      {error && (
        <div className="animate-fade-in-up mb-4 flex items-center gap-2 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {confirmDelete && (
        <div className="animate-scale-in mb-4 flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3">
          <span className="text-sm text-error">
            {confirmDelete.type === 'bulk' ? `Xóa ${selected.size} thông báo đã chọn?` : 'Xóa thông báo này?'}
          </span>
          <div className="flex flex-shrink-0 gap-2">
            <button
              onClick={() => (confirmDelete.type === 'bulk' ? handleBulkDelete() : handleDelete(confirmDelete.id))}
              className="press-effect rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white"
            >
              Xóa
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-slate-500"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => <NotificationSkeletonRow key={i} delay={i} />)}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant py-16 text-center">
          <Bell size={40} strokeWidth={1.5} className="text-slate-300" />
          <span className="text-sm text-slate-400">Không có thông báo nào phù hợp</span>
        </div>
      ) : !error ? (
        <ul className="space-y-2.5">
          {items.map((n, i) => (
            <li
              key={n._id}
              className={`animate-fade-in-up delay-${(i % 6) + 1} glow-hover flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors ${
                n.isRead ? 'border-slate-100 bg-white' : 'border-navy-deep/10 bg-navy-deep/[0.03]'
              }`}
            >
              <div className="flex flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(n._id)}
                  onChange={() => toggleSelect(n._id)}
                  className="mt-1 h-4 w-4 flex-shrink-0 rounded border-outline-variant"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-bold text-slate-800">{getNotificationTitle(n)}</strong>
                    {!n.isRead && (
                      <span className="rounded-full bg-status-success px-2 py-0.5 text-[11px] font-semibold text-white">Mới</span>
                    )}
                    {n.category && (
                      <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {CATEGORY_LABELS[n.category] || n.category}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">{getNotificationContent(n)}</div>
                  <div className="mt-1.5 text-xs text-slate-400">{new Date(n.updatedAt || n.createdAt).toLocaleString('vi-VN')}</div>
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-col gap-1.5">
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n._id)}
                    title="Đánh dấu đã đọc"
                    className="press-effect flex h-7 w-7 items-center justify-center rounded-full bg-status-info/10 text-status-info transition-colors hover:bg-status-info/20"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete({ type: 'one', id: n._id })}
                  title="Xóa"
                  className="press-effect flex h-7 w-7 items-center justify-center rounded-full bg-error/10 text-error transition-colors hover:bg-error/20"
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
          <span>Trang {page}/{totalPages} — {total} thông báo{unreadOnPage > 0 ? ` (${unreadOnPage} chưa đọc trên trang này)` : ''}</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetch(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="press-effect flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => fetch(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="press-effect flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
