import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Plus, Edit3, Trash2, Filter, CalendarDays } from 'lucide-react';
import activityService from '../../services/activity.service';
import authService from '../../services/auth.service';
import residentService from '../../services/resident.service';
import '../../styles/admin/AdminAdmissionRequestsPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const toInputDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoString = (localDateTime) => {
  if (!localDateTime) return '';
  return new Date(localDateTime).toISOString();
};

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '', from: '', to: '' });

  const [residents, setResidents] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    scheduledAt: '',
    durationMinutes: 30,
    location: '',
    organizerStaffId: '',
    participantResidentIds: [],
    status: 'draft',
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
      };
      const res = await activityService.getActivityList(params);
      setActivities(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
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

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [residentResponse, staffResponse] = await Promise.all([
          residentService.getResidentList({ page: 1, limit: 200 }),
          authService.getStaffAccounts({ page: 1, limit: 500 }),
        ]);

        if (!active) return;

        setResidents(residentResponse?.data || []);
        setStaffOptions(staffResponse?.data || []);
      } catch (err) {
        console.error('Failed to load options:', err);
      } finally {
        if (active) setOptionsLoading(false);
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      category: '',
      description: '',
      scheduledAt: '',
      durationMinutes: 30,
      location: '',
      organizerStaffId: '',
      participantResidentIds: '',
      status: 'draft',
    });
    setFormError(null);
  };

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, from, to });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', from: '', to: '' });
  };

  const handleEdit = (activity) => {
    setEditingId(activity._id);
    setIsCreating(true);
    setForm({
      title: activity.title || '',
      category: activity.category || '',
      description: activity.description || '',
      scheduledAt: toInputDateTimeLocal(activity.scheduledAt),
      durationMinutes: activity.durationMinutes || 30,
      location: activity.location || '',
      organizerStaffId:
        activity.organizerStaffId?._id || activity.organizerStaffId || '',
      participantResidentIds: Array.isArray(activity.participantResidentIds)
        ? activity.participantResidentIds.map((id) => id.toString())
        : [],
      status: activity.status || 'draft',
    });
  };

  const handleDelete = async (activityId) => {
    if (!window.confirm('Bạn có chắc muốn xóa hoạt động này không?')) return;
    try {
      setLoading(true);
      await activityService.deleteActivity(activityId);
      fetchActivities();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || 'Không thể xóa hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (activity, newStatus) => {
    try {
      setLoading(true);
      await activityService.updateActivityStatus(activity._id, newStatus);
      fetchActivities();
    } catch (err) {
      console.error('Status update failed:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!form.scheduledAt) {
      setFormError('Scheduled date/time is required');
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      scheduledAt: toIsoString(form.scheduledAt),
      durationMinutes: Number(form.durationMinutes || 0),
      location: form.location.trim() || undefined,
      organizerStaffId: form.organizerStaffId ? form.organizerStaffId.trim() : undefined,
      participantResidentIds: Array.isArray(form.participantResidentIds)
        ? form.participantResidentIds.filter(Boolean)
        : [],
      status: form.status,
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await activityService.updateActivity(editingId, payload);
      } else {
        await activityService.createActivity(payload);
      }
      resetForm();
      setIsCreating(false);
      fetchActivities();
    } catch (err) {
      console.error('Submit activity failed:', err);
      setFormError(err.response?.data?.message || 'Có lỗi khi lưu hoạt động.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <CalendarDays size={26} />
            Activity Management
          </h1>
          <p>Quản lý hoạt động cho cư dân: tạo, chỉnh sửa, xóa, và cập nhật trạng thái.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setEditingId(null);
            setIsCreating((prev) => !prev);
          }}
          className="adm-btn-refresh"
        >
          <Plus size={16} />
          {isCreating ? 'Close Form' : 'Create Activity'}
        </button>
      </div>

      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters} className="adm-filter-grid">
          <div>
            <label className="text-sm font-semibold">Search</label>
            <div className="adm-filter-input-wrapper">
              <Search className="adm-filter-input-icon" size={14} />
              <input
                type="text"
                placeholder="Search title, category..."
                className="adm-filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Status</label>
            <select
              className="adm-filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">From</label>
            <input
              type="date"
              className="adm-filter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">To</label>
            <input
              type="date"
              className="adm-filter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-3" style={{ alignSelf: 'end' }}>
            <button type="button" className="adm-btn-refresh" onClick={handleResetFilters}>
              <RefreshCw size={14} /> Reset
            </button>
            <button type="submit" className="adm-btn-refresh">
              <Filter size={14} /> Apply
            </button>
          </div>
        </form>
      </div>

      {isCreating && (
        <div className="adm-filter-panel" style={{ marginBottom: '28px' }}>
          <h2 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
            {editingId ? 'Edit Activity' : 'Create Activity'}
          </h2>
          <form onSubmit={handleSubmit} className="adm-filter-grid">
            <div>
              <label className="text-sm font-semibold">Title</label>
              <input
                type="text"
                className="adm-filter-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Category</label>
              <input
                type="text"
                className="adm-filter-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Scheduled At</label>
              <input
                type="datetime-local"
                className="adm-filter-input"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                className="adm-filter-input"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Location</label>
              <input
                type="text"
                className="adm-filter-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Organizer Staff</label>
              <select
                className="adm-filter-select"
                value={form.organizerStaffId}
                onChange={(e) => setForm({ ...form, organizerStaffId: e.target.value })}
                disabled={optionsLoading}
              >
                <option value="">Select organizer staff</option>
                {staffOptions.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.fullName || staff.email} {staff.role ? `(${staff.role})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Participants</label>
              <select
                className="adm-filter-select"
                multiple
                size={6}
                value={form.participantResidentIds}
                onChange={(e) =>
                  setForm({
                    ...form,
                    participantResidentIds: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                disabled={optionsLoading}
              >
                {residents.map((resident) => (
                  <option key={resident._id} value={resident._id}>
                    {resident.fullName || 'Unnamed resident'}{resident.residentCode ? ` (${resident.residentCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Status</label>
              <select
                className="adm-filter-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.filter((item) => item.value).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label className="text-sm font-semibold">Description</label>
              <textarea
                rows="3"
                className="adm-filter-input"
                style={{ resize: 'vertical' }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {formError && (
              <div style={{ gridColumn: 'span 3', color: '#b91c1c' }}>{formError}</div>
            )}
            <div style={{ gridColumn: 'span 3', display: 'flex', gap: '12px' }}>
              <button type="button" className="adm-btn-refresh" onClick={() => { resetForm(); setIsCreating(false); }}>
                Cancel
              </button>
              <button type="submit" className="adm-btn-refresh" disabled={submitting}>
                {editingId ? 'Save Changes' : 'Create Activity'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="adm-table-card">
        <div className="adm-table-responsive">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    Loading activities...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    No activities found.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity._id} className="adm-table-row">
                    <td>{activity.title}</td>
                    <td>{activity.category || '-'}</td>
                    <td>{activity.scheduledAt ? new Date(activity.scheduledAt).toLocaleString() : '-'}</td>
                    <td>
                      <select
                        value={activity.status}
                        onChange={(e) => handleStatusChange(activity, e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '10px', borderColor: '#cbd5e1' }}
                      >
                        {STATUS_OPTIONS.filter((item) => item.value).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{(activity.participantResidentIds || []).length}</td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-refresh"
                        style={{ marginRight: '8px' }}
                        onClick={() => handleEdit(activity)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        className="adm-btn-refresh"
                        onClick={() => handleDelete(activity._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-header" style={{ marginTop: '18px', justifyContent: 'space-between' }}>
        <span>
          Showing page {page} of {totalPages} — {total} activities
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="adm-btn-refresh"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginTop: '16px' }}>{error}</div>}
    </div>
  );
}
