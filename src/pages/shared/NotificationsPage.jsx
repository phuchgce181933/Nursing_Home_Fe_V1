import React, { useEffect, useState } from 'react';
import notificationsService from '../../services/notifications.service';
import '../../styles/family/NotificationPage.css';
import { Settings } from 'lucide-react';

function NotificationsPage({ role = 'family' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRead, setFilterRead] = useState('all'); // all, unread, read
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settings, setSettings] = useState({ enabledCategories: [], deliveryChannels: [], doNotDisturb: false });

  const buildQuery = (p = 1) => {
    const q = { page: p, limit };
    if (search) q.search = search;
    if (filterRead === 'unread') q.isRead = false;
    if (filterRead === 'read') q.isRead = true;
    if (category) q.category = category;
    return q;
  };

  const fetch = async (p = 1) => {
    setLoading(true);
    try {
      const res = await notificationsService.listNotifications(buildQuery(p));
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
    // load categories for filter
    notificationsService.getCategories().then((cats) => setCategories(cats || [])).catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterRead, category]);

  const loadSettings = async () => {
    try {
      const s = await notificationsService.getSettings();
      setSettings(s || { enabledCategories: [], deliveryChannels: [], doNotDisturb: false });
    } catch (e) {
      setSettings({ enabledCategories: [], deliveryChannels: [], doNotDisturb: false });
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsService.markAsRead(id);
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
      await notificationsService.deleteNotification(id);
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
      await notificationsService.markManyAsRead(Array.from(selected));
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
      await notificationsService.deleteMany(Array.from(selected));
      setItems((prev) => prev.filter((it) => !selected.has(it._id)));
      setSelected(new Set());
      setSelectAll(false);
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) return <div>Đang tải thông báo...</div>;

  const CATEGORY_LABELS = {
    incident: 'Sự cố',
    health: 'Sức khỏe',
    appointment: 'Cuộc hẹn',
    activity: 'Hoạt động',
    billing: 'Thanh toán',
    message: 'Tin nhắn',
    system: 'Hệ thống',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="page-title">Thông báo</h2>
          <div className="page-subtitle">Quản lý thông báo: xem, lọc, đánh dấu và xóa thông báo</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <button title="Cài đặt" className="notification-btn" onClick={() => { setShowSettingsPanel((s) => !s); if (!showSettingsPanel) loadSettings(); }}>
              <Settings size={18} />
            </button>
            {showSettingsPanel && (
              <div style={{ position: 'absolute', right: 0, marginTop: 8, zIndex: 60 }}>
                <div className="notification-panel" style={{ width: 360, background: '#071024' }}>
                  <div className="panel-header">
                    <div className="meta"><strong className="settings-header">Cài đặt thông báo</strong></div>
                  </div>
                  <div style={{ padding: 12 }}>
                    <div className="settings-row">
                      <label style={{ color: '#cfeaf0' }}>
                        <input type="checkbox" checked={!!settings.doNotDisturb} onChange={(e) => setSettings((s) => ({ ...s, doNotDisturb: e.target.checked }))} />{' '}
                        Không làm phiền
                      </label>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: '#cfeaf0', marginBottom: 6 }}>Loại thông báo (bật để nhận)</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {categories.map((c) => (
                          <label key={c} style={{ color: '#cfeaf0', fontSize: 13 }}>
                            <input type="checkbox" checked={settings.enabledCategories?.includes(c)} onChange={(e) => {
                              setSettings((s) => {
                                const set = new Set(s.enabledCategories || []);
                                if (e.target.checked) set.add(c); else set.delete(c);
                                return { ...s, enabledCategories: Array.from(set) };
                              });
                            }} /> {CATEGORY_LABELS[c] || c}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button onClick={async () => { await notificationsService.updateSettings(settings); setShowSettingsPanel(false); }} style={{ padding: '8px 10px', borderRadius: 8, background: '#0ea5a0', color: '#fff', border: 'none' }}>Lưu</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      
      <div className="filters-frame">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filterRead} onChange={(e) => setFilterRead(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
            <option value="all">Tất cả</option>
            <option value="unread">Chưa đọc</option>
            <option value="read">Đã đọc</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
            <option value="">Tất cả loại</option>
            {categories.map((c) => (<option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggleSelectAll} style={{ padding: '8px 10px', borderRadius: 8 }}>{selectAll ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button>
          <button onClick={handleBulkMarkRead} style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none' }} disabled={!selected.size}>
            Đánh dấu đã đọc
          </button>
          <button onClick={handleBulkDelete} style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none' }} disabled={!selected.size}>
            Xóa
          </button>
        </div>
      </div>

      {!items.length && <div>Không có thông báo</div>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((n) => (
          <li key={n._id} style={{ marginBottom: 12, opacity: n.isRead ? 0.8 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6', background: n.isRead ? '#ffffff' : '#f8fffb' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={selected.has(n._id)}
                  onChange={() => toggleSelect(n._id)}
                  style={{ width: 18, height: 18 }}
                />
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong style={{ fontSize: 15 }}>{n.title}</strong>
                    {!n.isRead && <span style={{ background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: 6, fontSize: 12 }}>Mới</span>}
                  </div>
                  <div style={{ marginTop: 6, color: '#374151' }}>{n.content}</div>
                  <small style={{ color: '#6b7280' }}>{new Date(n.updatedAt || n.createdAt).toLocaleString()}</small>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!n.isRead && <button onClick={() => handleMarkRead(n._id)} style={{ padding: '6px 10px', borderRadius: 8, background: '#06b6d4', color: '#fff', border: 'none' }}>Đã đọc</button>}
                <button onClick={() => { if (window.confirm('Xóa thông báo này?')) handleDelete(n._id); }} style={{ padding: '6px 10px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none' }}>Xóa</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div>Trang {page} / {totalPages} — {total} Thông báo</div>
        <div>
          <button onClick={() => fetch(Math.max(1, page - 1))} disabled={page <= 1} className="pager-btn prev" style={{ marginRight: 8 }}>
            Trước
          </button>
          <button onClick={() => fetch(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="pager-btn next">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
