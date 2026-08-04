import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Filter, RefreshCw, BarChart3, Search } from 'lucide-react';
import activityService from '../../services/activity.service';
import residentService from '../../services/resident.service';
import { useToast } from '../../hooks/useToast';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

export default function ActivityParticipationResultsPage() {
  const { showToast } = useToast();
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
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState(null);
  const [editingOccurrenceOptions, setEditingOccurrenceOptions] = useState([]);
  const [form, setForm] = useState({
    attendanceRecords: [],
    participationRecords: [],
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [residents, setResidents] = useState({});

  const toDateKey = useCallback((value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const toDateOnlyISOString = useCallback((value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day)).toISOString();
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
  }, []);

  const buildAttendanceDraftFromActivity = useCallback((activity, targetOccurrenceDate = null) => {
    if (!activity) {
      return {
        attendanceRecords: [],
        participationRecords: [],
      };
    }

    const targetKey = toDateKey(targetOccurrenceDate);

    const findForResident = (records = [], residentId) => {
      // prefer record matching target occurrenceDate, then undated
      const byDate = (records || []).find((r) => r && r.residentId && String(r.residentId) === String(residentId) && r.occurrenceDate && toDateKey(r.occurrenceDate) === targetKey);
      if (byDate) return byDate;
      const noDate = (records || []).find((r) => r && r.residentId && String(r.residentId) === String(residentId) && !r.occurrenceDate);
      return noDate || null;
    };

    const existingAttendance = activity.attendanceRecords || [];
    const existingParticipation = activity.participationRecords || [];

    const participantIds = activity.participantResidentIds || [];
    return {
      attendanceRecords: participantIds.map((residentId) => {
        const rec = findForResident(existingAttendance, residentId);
        return {
          residentId,
          status: rec?.status || 'present',
          note: rec?.note || '',
        };
      }),
      participationRecords: participantIds.map((residentId) => {
        const rec = findForResident(existingParticipation, residentId);
        return {
          residentId,
          participationLevel: rec?.participationLevel || 'active',
          comment: rec?.comment || '',
          incident: rec?.incident || '',
        };
      }),
    };
  }, []);

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
      setError(err.response?.data?.message || 'Không thể tải danh sách hoạt động.');
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

  const updateAttendanceRecord = (residentId, field, value) => {
    setForm((prev) => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.map((record) =>
        record.residentId === residentId ? { ...record, [field]: value } : record,
      ),
    }));
  };

  const updateParticipationRecord = (residentId, field, value) => {
    setForm((prev) => ({
      ...prev,
      participationRecords: prev.participationRecords.map((record) =>
        record.residentId === residentId ? { ...record, [field]: value } : record,
      ),
    }));
  };

  const handleEdit = (activity) => {
    // choose latest occurrenceDate from activity records, fallback to scheduledAt
    const occDates = [];
    (activity.attendanceRecords || []).forEach((r) => { if (r?.occurrenceDate) occDates.push(new Date(r.occurrenceDate)); });
    (activity.participationRecords || []).forEach((r) => { if (r?.occurrenceDate) occDates.push(new Date(r.occurrenceDate)); });
    let chosen = null;
    if (occDates.length > 0) {
      const unique = [...new Set(occDates.map((d) => toDateKey(d)).filter(Boolean))];
      setEditingOccurrenceOptions(unique);
      const max = occDates.reduce((a, b) => (a > b ? a : b));
      chosen = toDateKey(max);
    } else if (activity.scheduledAt) {
      chosen = toDateKey(activity.scheduledAt);
    }

    setEditingId(activity._id);
    setEditingOccurrenceDate(chosen);
    setForm(buildAttendanceDraftFromActivity(activity, chosen));
    setFormError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingOccurrenceDate(null);
    setForm({
      attendanceRecords: [],
      participationRecords: [],
    });
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError(null);

    try {
      setSubmitting(true);
      const payload = {
        attendanceRecords: (form.attendanceRecords || []).map((r) => ({ ...r })),
        participationRecords: (form.participationRecords || []).map((r) => ({ ...r })),
      };
      // attach occurrenceDate if we have one selected
      if (editingOccurrenceDate) {
        const occurrenceDateOnly = toDateOnlyISOString(editingOccurrenceDate);
        payload.attendanceRecords = payload.attendanceRecords.map((r) => ({ ...r, occurrenceDate: occurrenceDateOnly }));
        payload.participationRecords = payload.participationRecords.map((r) => ({ ...r, occurrenceDate: occurrenceDateOnly }));
      }

      await activityService.recordParticipationResult(editingId, payload);

      handleCancel();
      fetchActivities();
      showToast('Đã lưu kết quả tham gia thành công!', 'success');
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
                <th>Có mặt và vắng</th>
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
                        {(() => {
                          // show latest occurrenceDate if any, otherwise scheduledAt
                          const occs = (activity.attendanceRecords || []).map(r => r?.occurrenceDate).filter(Boolean)
                            .concat((activity.participationRecords || []).map(r => r?.occurrenceDate).filter(Boolean));
                          if (occs.length > 0) {
                            const dates = occs.map(d => new Date(d));
                            const max = dates.reduce((a,b) => (a > b ? a : b));
                            return max.toLocaleDateString('vi-VN');
                          }
                          return activity.scheduledAt ? new Date(activity.scheduledAt).toLocaleDateString('vi-VN') : '-';
                        })()}
                      </td>
                    <td style={{ textAlign: 'center' }}>
                      {activity.participantResidentIds?.length || 0}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activity.attendanceRecords?.length > 0 ? (
                        (() => {
                          const presentCount = activity.attendanceRecords.filter((record) => record.status !== 'absent').length;
                          const absentCount = activity.attendanceRecords.filter((record) => record.status === 'absent').length;
                          return `Có mặt: ${presentCount}, Vắng: ${absentCount}`;
                        })()
                      ) : (
                        '---'
                      )}
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
        <div className="adm-modal-overlay">
          <div className="adm-modal">
            <div className="adm-modal-header">
              <h2>Ghi nhận</h2>
              <button type="button" className="adm-btn-refresh" onClick={handleCancel} style={{ whiteSpace: 'nowrap' }}>
                Đóng
              </button>
            </div>

            <form onSubmit={handleSubmit} className="adm-modal-body">
                    {editingOccurrenceOptions.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <label className="text-sm font-semibold">Chọn ngày</label>
                        <select className="adm-filter-select" value={editingOccurrenceDate || ''} onChange={(e) => {
                          const val = e.target.value || null;
                          setEditingOccurrenceDate(val);
                          const act = activities.find(a => a._id === editingId);
                          setForm(buildAttendanceDraftFromActivity(act, val));
                        }}>
                          {editingOccurrenceOptions.map((opt) => {
                            const rawDate = new Date(`${opt}T00:00:00`);
                            return (
                              <option key={opt} value={opt}>{rawDate.toLocaleDateString('vi-VN')}</option>
                            );
                          })}
                        </select>
                      </div>
                    )}
              {form.attendanceRecords.length > 0 && (
                <div className="adm-modal-section">
                  <label className="text-sm font-semibold">Ghi nhận từng cư dân</label>
                  <div className="adm-table-responsive">
                    <table className="adm-table adm-participation-table">
                      <thead>
                        <tr>
                          <th>Cư dân</th>
                          <th>Điểm danh</th>
                          <th>Mức độ tham gia</th>
                          <th>Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.attendanceRecords.map((record) => {
                          const resident = residents[record.residentId];
                          const participation = form.participationRecords.find((item) => item.residentId === record.residentId) || { participationLevel: 'active', comment: '', incident: '' };

                          return (
                            <tr key={record.residentId}>
                              <td>{resident?.fullName || record.residentId}</td>
                              <td>
                                <select
                                  className="adm-filter-select"
                                  value={record.status}
                                  onChange={(e) => updateAttendanceRecord(record.residentId, 'status', e.target.value)}
                                >
                                  <option value="present">Có mặt</option>
                                  <option value="absent">Vắng mặt</option>
                                  <option value="late">Muộn</option>
                                  <option value="left_early">Về sớm</option>
                                </select>
                              </td>
                              <td>
                                <select
                                  className="adm-filter-select"
                                  value={participation.participationLevel}
                                  onChange={(e) => updateParticipationRecord(record.residentId, 'participationLevel', e.target.value)}
                                >
                                  <option value="passive">Không tham gia</option>
                                  <option value="partial">Tham gia TB</option>
                                  <option value="active">Thường xuyên tham gia</option>
                                </select>
                              </td>
                              <td>
                                <textarea
                                  rows="2"
                                  className="adm-filter-input"
                                  value={participation.comment}
                                  onChange={(e) => updateParticipationRecord(record.residentId, 'comment', e.target.value)}
                                  placeholder="Nhận xét..."
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {formError && (
                <div className="adm-form-message">
                  {formError}
                </div>
              )}
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
