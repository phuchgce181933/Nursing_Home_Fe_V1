import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, RefreshCw, AlertCircle, Eye, CheckCircle, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import consultationRequestService from '../../services/consultationRequest.service';
import '../../styles/admin/AdminConsultationRequestsPage.css';

export default function AdminConsultationRequestsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '', from: '', to: '' });
  const [editingRequest, setEditingRequest] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const STATUS_OPTIONS = [
    { value: '', label: t('admin.consultationRequests.allStatuses', 'Tất cả trạng thái') },
    { value: 'open', label: t('admin.consultationRequests.statusNew', 'Yêu cầu mới') },
    { value: 'in_progress', label: t('admin.consultationRequests.statusInProgress', 'Đang xử lý') },
    { value: 'resolved', label: t('admin.consultationRequests.statusResolved', 'Đã xử lý') },
    { value: 'closed', label: t('admin.consultationRequests.statusClosed', 'Đã đóng') },
  ];

  const getStatusLabel = (value) => {
    switch (value) {
      case 'open':
        return t('admin.consultationRequests.statusNew', 'Yêu cầu mới');
      case 'in_progress':
        return t('admin.consultationRequests.statusInProgress', 'Đang xử lý');
      case 'resolved':
        return t('admin.consultationRequests.statusResolved', 'Đã xử lý');
      case 'closed':
        return t('admin.consultationRequests.statusClosed', 'Đã đóng');
      default:
        return value || '-';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open':
        return 'adm-status-badge-new';
      case 'in_progress':
        return 'adm-status-badge-in-progress';
      case 'resolved':
        return 'adm-status-badge-resolved';
      case 'closed':
        return 'adm-status-badge-closed';
      default:
        return 'adm-status-badge-default';
    }
  };

  const getAllowedStatusOptions = (currentStatus) => {
    const ordered = [
      { value: 'open', label: t('admin.consultationRequests.statusNew', 'Yêu cầu mới') },
      { value: 'in_progress', label: t('admin.consultationRequests.statusInProgress', 'Đang xử lý') },
      { value: 'resolved', label: t('admin.consultationRequests.statusResolved', 'Đã xử lý') },
      { value: 'closed', label: t('admin.consultationRequests.statusClosed', 'Đã đóng') },
    ];
    const currentIndex = ordered.findIndex((opt) => opt.value === currentStatus);
    return currentIndex === -1 ? ordered : ordered.slice(currentIndex);
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit,
        status: appliedFilters.status || undefined,
        search: appliedFilters.search || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
      };
      const res = await consultationRequestService.adminGetConsultationRequestList(params);
      setData(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || t('admin.consultationRequests.loadError', 'Không thể tải danh sách yêu cầu tư vấn.'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (editingRequest && !data.some((item) => item._id === editingRequest._id)) {
      setEditingRequest(null);
      setEditStatus('');
      setEditNotes('');
    }
  }, [data, editingRequest]);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, from, to });
    setEditingRequest(null);
    setEditStatus('');
    setEditNotes('');
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', from: '', to: '' });
    setEditingRequest(null);
    setEditStatus('');
    setEditNotes('');
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setEditStatus(request.status || 'open');
    setEditNotes(request.adminNotes || '');
  };

  const handleSave = async () => {
    if (!editingRequest) return;
    const notesChanged = editNotes.trim() !== (editingRequest.adminNotes || '').trim();
    const statusChanged = editStatus !== editingRequest.status;
    if (!notesChanged && !statusChanged) return;

    setSaving(true);
    try {
      await consultationRequestService.adminUpdateConsultationRequest(editingRequest._id, {
        status: editStatus,
        adminNotes: editNotes,
      });
      setEditingRequest(null);
      setEditStatus('');
      setEditNotes('');
      fetchRequests();
      alert(t('admin.consultationRequests.saveSuccess', 'Đã cập nhật yêu cầu tư vấn thành công.'));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || t('admin.consultationRequests.saveError', 'Không thể cập nhật yêu cầu tư vấn.'));
    } finally {
      setSaving(false);
    }
  };

  const isEditDirty = editingRequest
    ? editStatus !== editingRequest.status || editNotes.trim() !== (editingRequest.adminNotes || '').trim()
    : false;

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="adm-container admin-consultation-requests-page">
      <div className="adm-header">
        <div>
          <h1>{t('admin.consultationRequests.title', 'Yêu cầu tư vấn')}</h1>
          <p>{t('admin.consultationRequests.subtitle', 'Xem và quản lý các yêu cầu tư vấn được gửi từ khách hàng tiềm năng.')}</p>
        </div>
        <button onClick={fetchRequests} disabled={loading} className="adm-btn-refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.consultationRequests.reloadData', 'Reload Data')}
        </button>
      </div>

      <div className="adm-metrics-grid">
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Search size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.consultationRequests.totalRequests', 'Total Requests')}</span>
            <span className="adm-stat-value">{total}</span>
          </div>
        </div>
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <MessageCircle size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.consultationRequests.statusNew', 'New Requests')}</span>
            <span className="adm-stat-value">{data.filter((item) => item.status === 'open').length}</span>
          </div>
        </div>
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Filter size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.consultationRequests.statusInProgress', 'In Progress')}</span>
            <span className="adm-stat-value">{data.filter((item) => item.status === 'in_progress').length}</span>
          </div>
        </div>
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="adm-stat-label">{t('admin.consultationRequests.statusResolved', 'Resolved')}</span>
            <span className="adm-stat-value">{data.filter((item) => item.status === 'resolved').length}</span>
          </div>
        </div>
      </div>

      <div className="adm-filter-panel">
        <form onSubmit={handleApplyFilters}>
          <div className="adm-filter-grid">
            <div className="adm-filter-group">
              <div className="adm-filter-input-wrapper">
                <Search className="adm-filter-input-icon" size={16} />
                <input
                  type="text"
                  className="adm-filter-input"
                  placeholder={t('admin.consultationRequests.searchPlaceholder', 'Search name, phone, email, service...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="adm-filter-group">
              <select className="adm-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="adm-filter-row-secondary">
            <div className="adm-filter-date-group">
              <span className="adm-date-title"><Calendar size={13} className="text-slate-400" /> {t('admin.consultationRequests.createdRange', 'Created Date Range:')}</span>
              <input type="date" className="adm-date-input" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="text-slate-400 text-xs font-semibold">{t('admin.consultationRequests.to', 'to')}</span>
              <input type="date" className="adm-date-input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="adm-filter-actions">
              <button type="button" onClick={handleResetFilters} className="adm-btn-clear">{t('admin.consultationRequests.clearFilters', 'Clear Filters')}</button>
              <button type="submit" className="adm-btn-apply">{t('admin.consultationRequests.applyFilters', 'Apply Filters')}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="adm-table-card">
        {loading && data.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center bg-white" style={{ minHeight: '260px' }}>
            <RefreshCw className="animate-spin text-emerald-sage mb-3" size={32} />
            <p className="text-slate-500 text-sm">{t('admin.consultationRequests.loading', 'Loading consultation requests...')}</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '260px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">{t('admin.consultationRequests.errorOccurred', 'An error occurred')}</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '260px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}><Search size={30} /></div>
            <p className="text-slate-700 font-bold mb-1">{t('admin.consultationRequests.noRequestsFound', 'No consultation requests found')}</p>
            <p className="text-slate-400 text-xs max-w-sm">{t('admin.consultationRequests.noRequestsDesc', "We couldn't find any consultation requests matching your filters.")}</p>
          </div>
        ) : (
          <div className="adm-table-responsive">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('admin.consultationRequests.colName', 'Name')}</th>
                  <th>{t('admin.consultationRequests.colContact', 'Contact')}</th>
                  <th>{t('admin.consultationRequests.colServiceInterest', 'Service Interest')}</th>
                  <th>{t('admin.consultationRequests.colCreatedAt', 'Created')}</th>
                  <th>{t('admin.consultationRequests.colStatus', 'Status')}</th>
                  <th>{t('admin.consultationRequests.colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item._id} className="adm-table-row">
                    <td>{item.fullName || '-'}</td>
                    <td className="adm-contact-cell">
                      <div>{item.phone || '-'}</div>
                      <div>{item.email || '-'}</div>
                    </td>
                    <td className="adm-service-cell">
                      {item.serviceInterest || item.subject || item.message || '-'}
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <span className={`adm-status-badge ${getStatusBadgeClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-action adm-btn-action-icon"
                        title={t('admin.consultationRequests.manageTooltip', 'Quản lý yêu cầu')}
                        onClick={() => handleEdit(item)}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="adm-pagination-footer">
            <div className="pagination-info">
              {t('admin.consultationRequests.showing', 'Showing')} <span>{(page - 1) * limit + 1}</span> {t('admin.consultationRequests.to', 'to')} <span>{Math.min(page * limit, total)}</span> {t('admin.consultationRequests.of', 'of')} <span>{total}</span>
            </div>
            <div className="pagination-controls">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(p - 1, 1))}>{t('common.prev', 'Prev')}</button>
              <span>{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(p + 1, totalPages))}>{t('common.next', 'Next')}</button>
            </div>
          </div>
        )}
      </div>

      {editingRequest && (
        <div className="adm-edit-overlay" onClick={() => setEditingRequest(null)}>
          <div className="adm-edit-section" onClick={(e) => e.stopPropagation()}>
            <div className="adm-edit-header">
              <div>
                <h2>{t('admin.consultationRequests.editTitle', 'Edit Consultation Request')}</h2>
                <p>{t('admin.consultationRequests.editSubtitle', 'Update status and add admin notes for the selected request.')}</p>
              </div>
              <div className="adm-edit-current-status">
                <span className={`adm-status-badge ${getStatusBadgeClass(editingRequest.status)}`}>
                  {getStatusLabel(editingRequest.status)}
                </span>
              </div>
            </div>
            <div className="adm-edit-panel">
              <div className="adm-request-detail-summary">
                <div>
                  <span>{t('admin.consultationRequests.colName', 'Name')}</span>
                  <p>{editingRequest.fullName || '-'}</p>
                </div>
                <div>
                  <span>{t('admin.consultationRequests.colPhone', 'Phone')}</span>
                  <p>{editingRequest.phone || '-'}</p>
                </div>
                <div>
                  <span>{t('admin.consultationRequests.colEmail', 'Email')}</span>
                  <p>{editingRequest.email || '-'}</p>
                </div>
                <div>
                  <span>{t('admin.consultationRequests.colCreatedAt', 'Created')}</span>
                  <p>{formatDate(editingRequest.createdAt)}</p>
                </div>
                <div className="adm-request-detail-message">
                  <span>{t('admin.consultationRequests.colMessage', 'Message')}</span>
                  <p>{editingRequest.message ? editingRequest.message : t('admin.consultationRequests.noMessage', 'No message provided')}</p>
                </div>
              </div>
              <div className="adm-edit-grid">
                <div className="adm-edit-field">
                  <label className="adm-edit-label">{t('admin.consultationRequests.fieldStatus', 'Status')}</label>
                  <select className="adm-edit-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {getAllowedStatusOptions(editingRequest?.status || editStatus).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="adm-edit-field adm-edit-field--notes">
                  <label className="adm-edit-label">{t('admin.consultationRequests.fieldAdminNotes', 'Admin Notes')}</label>
                  <textarea
                    className="adm-edit-textarea"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
              <div className="adm-edit-actions">
                <button type="button" className="adm-btn-apply" disabled={saving || !isEditDirty} onClick={handleSave}>
                  {saving ? t('admin.consultationRequests.saving', 'Saving...') : t('admin.consultationRequests.save', 'Save')}
                </button>
                <button type="button" className="adm-btn-clear" disabled={saving} onClick={() => setEditingRequest(null)}>
                  {t('admin.consultationRequests.cancel', 'Cancel')}
                </button>
              </div>
              {!isEditDirty && (
                <p className="adm-edit-note">{t('admin.consultationRequests.editNoChanges', 'Vui lòng thay đổi trạng thái hoặc ghi chú trước khi lưu.')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
