import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Trash2, CheckSquare, Settings, Filter, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import notificationsService from '../../services/notifications.service';
import '../../styles/family/NotificationPage.css';
import { CATEGORY_LABELS, ROLE_NOTIFICATION_CONFIG } from '../../config/notificationConfig';

function NotificationsPage({ role = 'family' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterRead, setFilterRead] = useState('all');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settings, setSettings] = useState({ enabledCategories: [], deliveryChannels: [], doNotDisturb: false });

  const config = ROLE_NOTIFICATION_CONFIG[role] || ROLE_NOTIFICATION_CONFIG.family;

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
    try {
      const res = await notificationsService.listNotifications(buildQuery(p), role);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || p);
      setSelected(new Set());
      setSelectAll(false);
    } catch (err) {
      console.error('Failed to load notifications', err);
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

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
      return;
    }
    const allIds = new Set(items.map((i) => i._id));
    setSelected(allIds);
    setSelectAll(true);
  };

  const handleBulkMarkRead = async () => {
    if (!selected.size) return;
    try {
      await notificationsService.markManyAsRead(Array.from(selected), role);
      setItems((prev) => prev.map((it) => (selected.has(it._id) ? { ...it, isRead: true } : it)));
      setSelected(new Set());
      setSelectAll(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Xóa ${selected.size} thông báo đã chọn?`)) return;
    try {
      await notificationsService.deleteMany(Array.from(selected), role);
      setItems((prev) => prev.filter((it) => !selected.has(it._id)));
      setSelected(new Set());
      setSelectAll(false);
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) return <div className="notification-loading">Đang tải thông báo...</div>;

  return (
    <div className="notification-page">
      <div className="notification-header">
        <div className="notification-title-group">
          <Bell size={28} className="notification-title-icon" />
          <div>
            <h2 className="page-title">Thông báo</h2>
            <p className="page-subtitle">Quản lý thông báo dành cho {role === 'family' ? 'Gia đình' : role === 'admin' ? 'Admin' : role === 'doctor' ? 'Bác sĩ' : role === 'nurse' ? 'Y tá' : 'Người dùng'}</p>
          </div>
        </div>

        {config.canConfigureSettings && (
          <div className="notification-settings-wrapper">
            <button title="Cài đặt" className="notification-btn" onClick={() => { setShowSettingsPanel((s) => !s); if (!showSettingsPanel) loadSettings(); }}>
              <Settings size={18} />
            </button>
            {showSettingsPanel && (
              <div className="notification-panel card-panel">
                <div className="panel-header">
                  <div className="meta"><strong className="settings-header">Cài đặt thông báo</strong></div>
                </div>
                <div className="settings-container">
                  <div className="settings-row">
                    <label className="settings-label">
                      <input type="checkbox" checked={!!settings.doNotDisturb} onChange={(e) => setSettings((s) => ({ ...s, doNotDisturb: e.target.checked }))} />{' '}
                      Không làm phiền
                    </label>
                  </div>
                  <div className="settings-row settings-checkbox-grid">
                    <div className="settings-label">Loại thông báo (bật để nhận)</div>
                    <div className="settings-checkbox-list">
                      {categories.filter((c) => config.visibleCategories.includes(c)).map((c) => (
                        <label key={c} className="settings-checkbox-item">
                          <input type="checkbox" checked={settings.enabledCategories?.includes(c)} onChange={(e) => {
                            setSettings((s) => {
                              const set = new Set(s.enabledCategories || []);
                              if (e.target.checked) set.add(c); else set.delete(c);
                              return { ...s, enabledCategories: Array.from(set) };
                            });
                          }} />
                          <span>{CATEGORY_LABELS[c] || c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="settings-footer">
                    <button onClick={async () => { await notificationsService.updateSettings(settings, role); setShowSettingsPanel(false); }} className="settings-save-btn">Lưu</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="notification-toolbar card-panel notification-filter-panel">
        <div className="notification-search-box">
          <Search size={16} />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Tìm thông báo" />
        </div>
        <div className="notification-filter-controls">
          <div className="notification-filter-group">
            <button type="button" className="filter-pill" onClick={handleApplyFilters}><Filter size={16} /> Lọc</button>
            <select value={filterRead} onChange={(e) => setFilterRead(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="unread">Chưa đọc</option>
              <option value="read">Đã đọc</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Tất cả loại</option>
              {categories.filter((c) => config.visibleCategories.includes(c)).map((c) => (<option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>))}
            </select>
          </div>
          <div className="notification-bulk-actions">
            <button onClick={toggleSelectAll} className="text-btn text-btn--icon">
              <CheckSquare size={16} /> {selectAll ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            <button onClick={handleBulkMarkRead} disabled={!selected.size} className="action-btn action-btn--success">
              <CheckSquare size={16} /> Đánh dấu đã đọc
            </button>
            <button onClick={handleBulkDelete} disabled={!selected.size} className="action-btn action-btn--danger">
              <Trash2 size={16} /> Xóa
            </button>
          </div>
        </div>
      </div>

      {!items.length && <div className="notification-empty">Không có thông báo</div>}

      <ul className="notification-list">
        {items.map((n) => (
          <li key={n._id} className={`notification-item ${n.isRead ? 'read' : 'unread'}`}>
            <div className="notification-item-left">
              <input type="checkbox" checked={selected.has(n._id)} onChange={() => toggleSelect(n._id)} />
              <div className="notification-item-meta">
                <div className="notification-item-title-row">
                  <span className="notification-item-title">{getNotificationTitle(n)}</span>
                  {!n.isRead && <span className="notification-badge-new">Mới</span>}
                </div>
                <p className="notification-item-content">{getNotificationContent(n)}</p>
                <div className="notification-item-footer">
                  <span className="notification-category-chip">{CATEGORY_LABELS[n.category] || n.category}</span>
                  <span>{new Date(n.updatedAt || n.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="notification-item-actions">
              {!n.isRead && (
                <button type="button" onClick={() => handleMarkRead(n._id)} className="notification-action-btn notification-action-btn--read">
                  <CheckCircle2 size={16} />
                  <span>Đã đọc</span>
                </button>
              )}
              <button type="button" onClick={() => { if (window.confirm('Xóa thông báo này?')) handleDelete(n._id); }} className="notification-action-btn notification-action-btn--delete">
                <Trash2 size={16} />
                <span>Xóa</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="notification-footer card-panel">
        <div>{total} thông báo • Trang {page} / {totalPages}</div>
        <div className="pagination-actions">
          <button type="button" onClick={() => fetch(Math.max(1, page - 1))} disabled={page <= 1}>
            <ArrowLeft size={16} /> Trước
          </button>
          <button type="button" onClick={() => fetch(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            Sau <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
