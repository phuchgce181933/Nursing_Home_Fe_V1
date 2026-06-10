import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import residentService, { RESIDENT_INITIAL_HEALTH_ROUTE_HINT } from '../../../../services/resident.service';
import { FaEye, FaPen } from 'react-icons/fa';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import '../../../../styles/admin/InitialHealthPage.css';
import '../../../../styles/admin/residentActionIcons.css';
import { GENDER_LABELS, RESIDENCY_LABELS } from '../_shared/residentLabels';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

const BLOOD_TYPE_LABELS = {
  unknown: 'Chưa xác định',
};

const emptyForm = () => ({
  bloodType: '',
  initialHealthCondition: '',
});

export default function InitialHealthPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const residentBase = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [recordedFilter, setRecordedFilter] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [panelMsg, setPanelMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewPopup, setViewPopup] = useState(null);
  const [editPopup, setEditPopup] = useState(false);
  const [usingFallbackApi, setUsingFallbackApi] = useState(false);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setListLoading(true);
    setListError('');
    try {
      const params = {
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      };
      if (recordedFilter === 'true') params.recorded = true;
      else if (recordedFilter === 'false') params.recorded = false;

      const res = await residentService.listInitialHealth(params);
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      if (res._fallback) setUsingFallbackApi(true);
    } catch (e) {
      setListError(e.response?.data?.message || 'Không thể tải danh sách cư dân');
      setResidents([]);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, recordedFilter]);

  const loadDetail = useCallback(async (residentId) => {
    if (!residentId) {
      setHealthData(null);
      setForm(emptyForm());
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    setFormError('');
    try {
      const data = await residentService.getInitialHealth(residentId);
      setHealthData(data);
      if (data._fallback) setUsingFallbackApi(true);
      const h = data.initialHealth || {};
      setForm({
        bloodType: h.bloodType && h.bloodType !== 'unknown' ? h.bloodType : h.bloodType || '',
        initialHealthCondition: h.initialHealthCondition || '',
      });
    } catch (e) {
      const status = e?.response?.status;
      setDetailError(e.response?.data?.message || 'Không thể tải thông tin sức khỏe');
      if (status === 404 || status === 403) setUsingFallbackApi(true);
      setHealthData(null);
      setForm(emptyForm());
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshAfterSave = useCallback(async () => {
    const tasks = [loadList({ silent: true })];
    if (selectedId) tasks.push(loadDetail(selectedId));
    await Promise.all(tasks);
  }, [selectedId, loadList, loadDetail]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleSelect = (r) => {
    setSelectedId(r._id);
    setPanelMsg('');
    setFormError('');
    setDetailError('');
  };

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const validateForm = () => {
    const desc = form.initialHealthCondition.trim();
    if (!desc) return 'Mô tả tình trạng khi nhập viện là bắt buộc';
    if (desc.length < 10) return 'Mô tả phải có ít nhất 10 ký tự';
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setFormError('Chưa chọn cư dân');
      return;
    }
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setFormError('');
    setPanelMsg('');
    try {
      const payload = {
        initialHealthCondition: form.initialHealthCondition.trim(),
      };
      if (form.bloodType) payload.bloodType = form.bloodType;

      const res = await residentService.recordInitialHealth(selectedId, payload);
      if (res._fallback) setUsingFallbackApi(true);
      setPanelMsg(res.message || 'Đã lưu tình trạng sức khỏe ban đầu');
      await refreshAfterSave();
      setEditPopup(false);
    } catch (e) {
      const status = e?.response?.status;
      setFormError(e.response?.data?.message || 'Lưu thất bại');
      if (status === 404 || status === 405 || status === 403) setUsingFallbackApi(true);
    } finally {
      setSaving(false);
    }
  };

  const openViewPopup = async (r, e) => {
    e?.stopPropagation();
    if (!r.hasInitialHealthRecord) {
      setViewPopup({
        loading: false,
        error: '',
        summary: r,
        resident: null,
        initialHealth: null,
        notRecorded: true,
      });
      return;
    }
    const residentKey = r._id || r.residentCode;
    setViewPopup({ loading: true, error: '', summary: r, resident: null, initialHealth: null });
    try {
      const data = await residentService.getInitialHealth(residentKey);
      if (data._fallback) setUsingFallbackApi(true);
      setViewPopup({
        loading: false,
        error: '',
        summary: r,
        resident: data.resident,
        initialHealth: data.initialHealth,
      });
    } catch (err) {
      setViewPopup({
        loading: false,
        error: err.response?.data?.message || 'Không thể tải chi tiết',
        summary: r,
        resident: null,
        initialHealth: null,
      });
    }
  };

  const openEditPopup = (r, e) => {
    e?.stopPropagation();
    const residentKey = r._id || r.residentCode;
    setSelectedId(residentKey);
    setPanelMsg('');
    setFormError('');
    setDetailError('');
    setEditPopup(true);
    loadDetail(residentKey);
  };

  const selectedSummary = residents.find((r) => r._id === selectedId);
  const resident = healthData?.resident;
  const hasRecord = healthData?.initialHealth?.hasInitialHealthRecord;

  return (
    <AdminPageShell
      title={t('admin.residents.initialHealth.title')}
      subtitle={t('admin.residents.initialHealth.subtitle')}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Tìm kiếm</span>
            <input
              type="search"
              placeholder="Tên hoặc mã cư dân..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="resident-page__filter">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="admitted">Đang điều trị</option>
              <option value="pending">Chờ nhập viện</option>
              <option value="discharged">Đã xuất viện</option>
              <option value="">Tất cả trạng thái</option>
            </select>
          </label>
          <label className="resident-page__filter">
            <span>Ghi nhận</span>
            <select
              value={recordedFilter}
              onChange={(e) => {
                setRecordedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả (đã/chưa ghi)</option>
              <option value="false">Chưa ghi nhận</option>
              <option value="true">Đã ghi nhận</option>
            </select>
          </label>
        </div>
      </div>

      {listError && <div className="resident-page__error">{listError}</div>}
      {usingFallbackApi && (
        <p className="resident-page__hint-box">⚠️ {RESIDENT_INITIAL_HEALTH_ROUTE_HINT}</p>
      )}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Trạng thái ghi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Đang tải...
                </td>
              </tr>
            )}
            {!listLoading && residents.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Không có cư dân nào
                </td>
              </tr>
            )}
            {!listLoading &&
              residents.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.residentCode}</td>
                  <td style={{ fontWeight: 600 }}>{r.fullName}</td>
                  <td>
                    <span
                      className={`health-badge ${
                        r.hasInitialHealthRecord ? 'health-badge--recorded' : 'health-badge--pending'
                      }`}
                    >
                      {r.hasInitialHealthRecord ? 'Đã ghi nhận' : 'Chưa ghi nhận'}
                    </span>
                  </td>
                  <td className="resident-action-cell">
                    <div className="resident-action-group">
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--view"
                        title="Xem chi tiết"
                        onClick={(e) => openViewPopup(r, e)}
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--edit"
                        title="Sửa"
                        onClick={(e) => openEditPopup(r, e)}
                      >
                        <FaPen />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!listLoading && residents.length > 0 && (
          <ListPagination
            page={page}
            totalPages={Math.max(totalPages, 1)}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>

      {viewPopup && (
        <div className="modal-overlay" onClick={() => setViewPopup(null)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Tình trạng sức khỏe khi nhập viện</h2>
            {viewPopup.loading && (
              <p className="empty-state" style={{ padding: '16px 0' }}>
                Đang tải...
              </p>
            )}
            {!viewPopup.loading && viewPopup.error && (
              <p className="form-error">{viewPopup.error}</p>
            )}
            {!viewPopup.loading && viewPopup.notRecorded && (
              <>
                <div className="detail-row">
                  <strong>Cư dân:</strong> {viewPopup.summary.fullName} ({viewPopup.summary.residentCode})
                </div>
                <p className="empty-state" style={{ padding: '24px 0' }}>
                  Chưa ghi nhận tình trạng khi nhập viện.
                </p>
              </>
            )}
            {!viewPopup.loading &&
              !viewPopup.error &&
              !viewPopup.notRecorded &&
              viewPopup.resident && (
                <>
                  <div className="detail-row">
                    <strong>Cư dân:</strong> {viewPopup.resident.fullName} ({viewPopup.resident.residentCode})
                  </div>
                  <div className="detail-row">
                    <strong>Giới tính:</strong>{' '}
                    {GENDER_LABELS[viewPopup.resident.gender] || viewPopup.resident.gender || '—'}
                  </div>
                  <div className="detail-row">
                    <strong>Trạng thái:</strong>{' '}
                    {RESIDENCY_LABELS[viewPopup.resident.residencyStatus] ||
                      viewPopup.resident.residencyStatus ||
                      '—'}
                  </div>
                  <hr className="modal-divider" />
                  <div className="detail-row">
                    <strong>Nhóm máu:</strong>{' '}
                    {BLOOD_TYPE_LABELS[viewPopup.initialHealth?.bloodType] ||
                      viewPopup.initialHealth?.bloodType ||
                      '—'}
                  </div>
                  <div className="detail-row">
                    <strong>Mô tả tình trạng khi nhập viện:</strong>
                  </div>
                  <div className="health-description">
                    {viewPopup.initialHealth?.initialHealthCondition || '—'}
                  </div>
                  {viewPopup.initialHealth?.updatedAt && (
                    <div className="detail-row detail-row--muted">
                      Cập nhật lần cuối: {formatLeaveDate(viewPopup.initialHealth.updatedAt)}
                    </div>
                  )}
                </>
              )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setViewPopup(null)}>
                Đóng
              </button>
              {!viewPopup.loading && viewPopup.summary && (
                <button
                  type="button"
                  className="btn-save"
                  onClick={() => {
                    const summary = viewPopup.summary;
                    setViewPopup(null);
                    openEditPopup(summary);
                  }}
                >
                  {viewPopup.notRecorded ? 'Ghi nhận' : 'Chỉnh sửa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {editPopup && (
        <div className="modal-overlay" onClick={() => setEditPopup(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">
              {hasRecord ? 'Cập nhật tình trạng nhập viện' : 'Ghi nhận tình trạng nhập viện'}
            </h2>
            {detailLoading ? (
              <div className="empty-state">Đang tải thông tin...</div>
            ) : detailError && !healthData ? (
              <div className="empty-state">
                <p>{detailError}</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ marginTop: 12 }}
                  onClick={() => loadDetail(selectedId)}
                >
                  Thử tải lại
                </button>
              </div>
            ) : (
              <>
                <p className="initial-health-panel__subtitle">
                  {selectedSummary?.fullName || resident?.fullName}
                  {' · '}
                  {selectedSummary?.residentCode || resident?.residentCode}
                  {resident?.age != null && ` · ${resident.age} tuổi`}
                  {resident?.gender && ` · ${GENDER_LABELS[resident.gender] || resident.gender}`}
                </p>
                {panelMsg && <p className="form-success">{panelMsg}</p>}
                {formError && <p className="form-error">{formError}</p>}
                <form onSubmit={handleSave}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nhóm máu</label>
                      <select
                        value={form.bloodType}
                        onChange={(e) => setField('bloodType', e.target.value)}
                      >
                        <option value="">— Giữ nguyên / chưa xác định —</option>
                        {BLOOD_TYPES.map((bt) => (
                          <option key={bt} value={bt}>
                            {BLOOD_TYPE_LABELS[bt] || bt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group form-grid--full">
                      <label>Mô tả tình trạng khi nhập viện *</label>
                      <textarea
                        value={form.initialHealthCondition}
                        onChange={(e) => setField('initialHealthCondition', e.target.value)}
                        placeholder="Ví dụ: Khỏe mạnh, hoạt động bình thường; hoặc: Yếu, cần chăm sóc 1-1..."
                        rows={6}
                        required
                      />
                      <span className="form-hint">
                        {form.initialHealthCondition.trim().length}/10 ký tự tối thiểu
                      </span>
                    </div>
                    <p className="initial-health-related-tabs">
                      Bệnh lý nền / tiền sử trước vào viện:{' '}
                      <Link to={`${residentBase}/residents/pre-existing-conditions`}>
                        Bệnh lý nền &amp; tiền sử bệnh
                      </Link>
                      {' · '}
                      Dị ứng thuốc:{' '}
                      <Link to={`${residentBase}/residents/drug-allergies`}>Quản lý dị ứng thuốc</Link>
                    </p>
                  </div>
                  <div className="modal__actions">
                    <button type="button" className="btn-cancel" onClick={() => setEditPopup(false)}>
                      Đóng
                    </button>
                    <button type="submit" className="btn-save" disabled={saving}>
                      {saving ? 'Đang lưu...' : hasRecord ? 'Cập nhật' : 'Ghi nhận'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
