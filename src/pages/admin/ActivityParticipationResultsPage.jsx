import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Filter, RefreshCw, BarChart3, Search } from 'lucide-react';
import activityService from '../../services/activity.service';
import residentService from '../../services/resident.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

export default function ActivityParticipationResultsPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('completed');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: 'completed' });

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    participantResultNotes: '',
    status: 'completed'
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [residents, setResidents] = useState({});

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status || undefined,
      };
      const res = await activityService.getActivityList(params);
      setActivities(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);

      // Load residents
      if (res?.data?.length > 0) {
        const residentIds = new Set();
        res.data.forEach(activity => {
          if (activity.participantResidentIds?.length > 0) {
            activity.participantResidentIds.forEach(id => residentIds.add(id));
          }
        });

        if (residentIds.size > 0) {
          const residentList = await residentService.getResidentList({ page: 1, limit: 100 });
          const residentMap = {};
          residentList?.data?.forEach(resident => {
            residentMap[resident._id] = resident;
          });
          setResidents(residentMap);
        }
      }
    } catch (err) {
      console.error('Fetch activities failed:', err);
      setError(err.response?.data?.message || 'Could not load activities.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status: statusFilter });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('completed');
    setPage(1);
    setAppliedFilters({ search: '', status: 'completed' });
  };

  const handleEdit = (activity) => {
    setEditingId(activity._id);
    setForm({
      participantResultNotes: activity.participantResultNotes || '',
      status: activity.status || 'completed'
    });
    setFormError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      participantResultNotes: '',
      status: 'completed'
    });
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!form.participantResultNotes.trim()) {
      setFormError('Vui lòng nhập kết quả tham gia');
      return;
    }

    try {
      setSubmitting(true);
      await activityService.recordParticipationResult(editingId, {
        participantResultNotes: form.participantResultNotes.trim(),
        status: form.status
      });
      
      handleCancel();
      fetchActivities();
      alert('Đã lưu kết quả tham gia thành công!');
    } catch (err) {
      console.error('Submit failed:', err);
      setFormError(err.response?.data?.message || 'Có lỗi khi lưu kết quả.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <CheckCircle size={26} />
            Kết quả tham gia hoạt động
          </h1>
          <p>Ghi nhận và quản lý kết quả tham gia hoạt động của cư dân.</p>
        </div>
      </div>

      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters} className="adm-filter-grid">
          <div>
            <label className="text-sm font-semibold">Tìm kiếm</label>
            <div className="adm-filter-input-wrapper">
              <Search className="adm-filter-input-icon" size={14} />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề..."
                className="adm-filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Trạng thái</label>
            <select
              className="adm-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="scheduled">Đã lên lịch</option>
            </select>
          </div>

          <div className="flex items-end gap-3" style={{ alignSelf: 'end' }}>
            <button type="button" className="adm-btn-refresh" onClick={handleResetFilters}>
              <RefreshCw size={14} /> Đặt lại
            </button>
            <button type="submit" className="adm-btn-refresh">
              <Filter size={14} /> Áp dụng
            </button>
          </div>
        </form>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-responsive">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Tiêu đề hoạt động</th>
                <th>Ngày diễn ra</th>
                <th>Người tham gia</th>
                <th>Kết quả</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    Đang tải hoạt động...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    Không tìm thấy hoạt động nào.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity._id} className="adm-table-row">
                    <td style={{ fontWeight: 500 }}>{activity.title}</td>
                    <td>
                      {activity.scheduledAt ? new Date(activity.scheduledAt).toLocaleString('vi-VN') : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {activity.participantResidentIds?.length || 0}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activity.participantResultNotes || '---'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: activity.status === 'completed' ? '#d1fae5' : '#fef3c7',
                        color: activity.status === 'completed' ? '#065f46' : '#92400e',
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        {activity.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-refresh"
                        onClick={() => handleEdit(activity)}
                        disabled={editingId === activity._id}
                      >
                        <BarChart3 size={14} /> Ghi nhận
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{ marginTop: 0 }}>Ghi nhận kết quả tham gia</h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="text-sm font-semibold">Kết quả tham gia</label>
                <textarea
                  rows="6"
                  className="adm-filter-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Nhập kết quả tham gia (ví dụ: Hoạt động diễn ra tốt, cư dân rất vui vẻ...)"
                  value={form.participantResultNotes}
                  onChange={(e) => setForm({ ...form, participantResultNotes: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="text-sm font-semibold">Trạng thái</label>
                <select
                  className="adm-filter-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="completed">Đã hoàn thành</option>
                  <option value="ongoing">Đang diễn ra</option>
                  <option value="cancelled">Đã huỷ</option>
                </select>
              </div>

              {formError && (
                <div style={{ color: '#b91c1c', marginBottom: '16px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="adm-btn-refresh"
                  onClick={handleCancel}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="adm-btn-refresh"
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu kết quả'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="adm-header" style={{ marginTop: '18px', justifyContent: 'space-between' }}>
        <span>
          Trang {page} / {totalPages} — {total} hoạt động
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Trước
          </button>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Tiếp
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginTop: '16px' }}>{error}</div>}
    </div>
  );
}
