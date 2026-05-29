import { useCallback, useEffect, useState } from 'react';
import residentService, { RESIDENT_DRUG_ALLERGIES_ROUTE_HINT } from '../../../../services/resident.service';
import ResidentContextBlock from '../../../../components/resident/ResidentContextBlock';
import { FaEye, FaPen } from 'react-icons/fa';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import '../../../../styles/admin/DrugAllergiesPage.css';
import '../../../../styles/admin/residentActionIcons.css';
import { GENDER_LABELS, RESIDENCY_LABELS } from '../_shared/residentLabels';

const parseCommaList = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const joinList = (items) => (Array.isArray(items) ? items.join(', ') : '');

export default function DrugAllergiesPage() {
  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [recordedFilter, setRecordedFilter] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [drugAllergiesInput, setDrugAllergiesInput] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [panelMsg, setPanelMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRouteHint, setShowRouteHint] = useState(false);
  const [viewPopup, setViewPopup] = useState(false);
  const [editPopup, setEditPopup] = useState(false);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setListLoading(true);
    setListError('');
    try {
      const params = {
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
      };
      if (recordedFilter === 'true') params.recorded = true;
      else if (recordedFilter === 'false') params.recorded = false;

      const res = await residentService.listDrugAllergies(params);
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      if (res._fallback) setShowRouteHint(true);
    } catch (e) {
      setListError(e.response?.data?.message || 'Không thể tải danh sách cư dân');
      setResidents([]);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [page, search, statusFilter, recordedFilter]);

  const loadDetail = useCallback(async (residentId) => {
    if (!residentId) {
      setDetailData(null);
      setDrugAllergiesInput('');
      return;
    }

    setDetailLoading(true);
    setDetailError('');
    setFormError('');
    try {
      const data = await residentService.getDrugAllergies(residentId);
      setDetailData(data);
      if (data._fallback) setShowRouteHint(true);
      setDrugAllergiesInput(joinList(data.drugAllergies?.drugAllergies));
    } catch (e) {
      const status = e?.response?.status;
      setDetailError(e.response?.data?.message || 'Không thể tải thông tin dị ứng thuốc');
      if (status === 404 || status === 400 || status === 403) setShowRouteHint(true);
      setDetailData(null);
      setDrugAllergiesInput('');
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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openViewPopup = (resident) => {
    const residentKey = resident._id || resident.residentCode;
    setSelectedId(residentKey);
    setPanelMsg('');
    setFormError('');
    setDetailError('');
    setViewPopup(true);
    loadDetail(residentKey);
  };

  const openEditPopup = (resident) => {
    const residentKey = resident._id || resident.residentCode;
    setSelectedId(residentKey);
    setPanelMsg('');
    setFormError('');
    setDetailError('');
    setEditPopup(true);
    loadDetail(residentKey);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setFormError('Chưa chọn cư dân');
      return;
    }
    const drugAllergies = parseCommaList(drugAllergiesInput);
    if (!drugAllergies.length) {
      setFormError('Vui lòng nhập ít nhất một dị ứng thuốc');
      return;
    }

    setSaving(true);
    setPanelMsg('');
    setFormError('');
    try {
      const res = await residentService.updateDrugAllergies(selectedId, { drugAllergies });
      if (res._fallback) setShowRouteHint(true);
      setPanelMsg(
        res._legacyAllergiesField
          ? `${res.message || 'Đã lưu'} — nên bật API PUT /residents/:id/drug-allergies trên backend để lưu đúng cột drugAllergies.`
          : res.message || 'Đã cập nhật dị ứng thuốc'
      );
      await refreshAfterSave();
      setEditPopup(false);
    } catch (e) {
      const status = e?.response?.status;
      setFormError(e.response?.data?.message || 'Cập nhật thất bại');
      if (status === 404 || status === 400 || status === 403) setShowRouteHint(true);
    } finally {
      setSaving(false);
    }
  };

  const selectedSummary = residents.find((r) => r._id === selectedId);
  const resident = detailData?.resident;
  const savedDrugAllergies = detailData?.drugAllergies?.drugAllergies || [];

  return (
    <AdminPageShell
      title="Quản lý dị ứng thuốc"
      subtitle="Ghi nhận dị ứng thuốc qua tab riêng (không ghi trên tab sức khỏe ban đầu khi nhập viện)."
    >
      <form className="resident-page__filters" onSubmit={handleSearch}>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Tìm kiếm</span>
            <input
              type="text"
              placeholder="Tên hoặc mã cư dân..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
            <span>Hồ sơ</span>
            <select
              value={recordedFilter}
              onChange={(e) => {
                setRecordedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả hồ sơ</option>
              <option value="false">Chưa ghi nhận</option>
              <option value="true">Đã ghi nhận</option>
            </select>
          </label>
          <div className="resident-page__filter-actions">
            <button type="submit" className="resident-page__button resident-page__button--primary">
              Áp dụng
            </button>
          </div>
        </div>
      </form>

      {listError && <div className="resident-page__error">{listError}</div>}
      {showRouteHint && (
        <p className="resident-page__hint-box">⚠️ {RESIDENT_DRUG_ALLERGIES_ROUTE_HINT}</p>
      )}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Dị ứng thuốc</th>
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
                  <td>{r.hasDrugAllergiesRecord ? `Đã ghi (${r.drugAllergiesCount || 0})` : 'Chưa ghi'}</td>
                  <td className="resident-action-cell">
                    <div className="resident-action-group">
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--view"
                        title="Xem chi tiết"
                        onClick={() => openViewPopup(r)}
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        className="resident-icon-btn resident-icon-btn--edit"
                        title="Sửa"
                        onClick={() => openEditPopup(r)}
                      >
                        <FaPen />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!listLoading && totalPages > 1 && (
          <div className="pagination">
            <span>
              {total} cư dân · Trang {page}/{totalPages}
            </span>
            <div className="pagination__btns">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
      {viewPopup && (
        <div className="modal-overlay" onClick={() => setViewPopup(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Chi tiết dị ứng thuốc</h2>
            <ResidentContextBlock
              resident={resident}
              summary={selectedSummary}
              showGender
              showStatus
            />
            {detailLoading ? (
              <div className="empty-state">Đang tải thông tin...</div>
            ) : detailError && !detailData ? (
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
                <div className="drug-allergies-current">
                  <h3>Dữ liệu hiện tại</h3>
                  {savedDrugAllergies.length ? (
                    <ul>
                      {savedDrugAllergies.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Chưa có dữ liệu dị ứng thuốc.</p>
                  )}
                </div>
                {detailData?.drugAllergies?.updatedAt && (
                  <p className="drug-allergies-panel__updated">
                    Cập nhật lần cuối: {formatLeaveDate(detailData.drugAllergies.updatedAt)}
                  </p>
                )}
              </>
            )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setViewPopup(false)}>
                Đóng
              </button>
              {selectedSummary && (
                <button
                  type="button"
                  className="btn-save"
                  onClick={() => {
                    setViewPopup(false);
                    openEditPopup(selectedSummary);
                  }}
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {editPopup && (
        <div className="modal-overlay" onClick={() => setEditPopup(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Cập nhật dị ứng thuốc</h2>
            <ResidentContextBlock
              resident={resident}
              summary={selectedSummary}
              showGender
              showStatus
            />
            {detailLoading ? (
              <div className="empty-state">Đang tải thông tin...</div>
            ) : detailError && !detailData ? (
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
                {panelMsg && <p className="form-success">{panelMsg}</p>}
                {formError && <p className="form-error">{formError}</p>}
                <form onSubmit={handleSave}>
                  <div className="form-group">
                    <label>Dị ứng thuốc (ngăn cách bằng dấu phẩy)</label>
                    <textarea
                      value={drugAllergiesInput}
                      onChange={(e) => setDrugAllergiesInput(e.target.value)}
                      placeholder="Ví dụ: Penicillin, Sulfonamide, Aspirin"
                      rows={5}
                    />
                  </div>
                  <div className="modal__actions">
                    <button type="button" className="btn-cancel" onClick={() => setEditPopup(false)}>
                      Đóng
                    </button>
                    <button type="submit" className="btn-save" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Cập nhật'}
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
