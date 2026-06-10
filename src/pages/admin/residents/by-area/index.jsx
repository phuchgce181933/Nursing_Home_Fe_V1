import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Building2, MapPin, Download } from 'lucide-react';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import facilityService, { getFacilityErrorMessage } from '../../../../services/facility.service';
import residentService, { RESIDENT_AREA_ROUTE_HINT } from '../../../../services/resident.service';
import { FaEye } from 'react-icons/fa';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import '../../../../styles/admin/residentActionIcons.css';
import { GENDER_LABELS, RESIDENCY_LABELS } from '../_shared/residentLabels';
import { formatResidentAreaLine, pickDrugAllergiesList } from '../../../../utils/residentArea';
import {
  exportResidentListToCSV,
  exportResidentListToPDF,
} from '../../../../utils/residentListExport';
import { useAuth } from '../../../../hooks/useAuth';

const STATUS_FILTER_LABELS = {
  admitted: 'Đang điều trị',
  pending: 'Chờ nhập viện',
  discharged: 'Đã xuất viện',
  '': 'Tất cả trạng thái',
};

function ResidentDetailModal({ loading, error, resident, onClose }) {
  if (!loading && !error && !resident) return null;

  const area = resident?.area;
  const drugAllergiesList = pickDrugAllergiesList(resident);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Chi tiết cư dân</h2>

        {loading && <p className="empty-state">Đang tải...</p>}
        {!loading && error && <p className="form-error">{error}</p>}

        {!loading && !error && resident && (
          <>
            <div className="modal__section">Thông tin cơ bản</div>
            <div className="detail-row"><strong>Mã:</strong> {resident.residentCode}</div>
            <div className="detail-row"><strong>Họ tên:</strong> {resident.fullName}</div>
            <div className="detail-row">
              <strong>Ngày sinh:</strong>{' '}
              {resident.dateOfBirth ? formatLeaveDate(resident.dateOfBirth) : '—'}
              {resident.age != null && ` (${resident.age} tuổi)`}
            </div>
            <div className="detail-row">
              <strong>Giới tính:</strong> {GENDER_LABELS[resident.gender] || resident.gender || '—'}
            </div>
            <div className="detail-row">
              <strong>Trạng thái:</strong>{' '}
              <span className={`residency-badge residency-badge--${resident.residencyStatus || 'default'}`}>
                {RESIDENCY_LABELS[resident.residencyStatus] || resident.residencyStatus}
              </span>
            </div>

            <div className="modal__section">Khu vực</div>
            <div className="detail-row">
              <strong>Tòa:</strong> {area?.building?.name || area?.building?.code || '—'}
            </div>
            <div className="detail-row">
              <strong>Tầng:</strong> {area?.floor?.label || area?.floor?.name || '—'}
            </div>
            <div className="detail-row">
              <strong>Phòng:</strong> {area?.room?.label || (area?.room?.roomNumber ? `Phòng ${area.room.roomNumber}` : '—')}
            </div>
            <div className="detail-row">
              <strong>Giường:</strong> {area?.bed?.bedCode || '—'}
            </div>

            <div className="modal__section">Sức khỏe khi nhập viện</div>
            <div className="detail-row">
              <strong>Nhóm máu:</strong>{' '}
              {resident.bloodType && resident.bloodType !== 'unknown' ? resident.bloodType : '—'}
            </div>
            <div className="detail-row">
              <strong>Tình trạng khi nhập viện:</strong>
            </div>
            <div className="health-description">
              {resident.initialHealthCondition || '—'}
            </div>

            <div className="modal__section">Bệnh lý &amp; tiền sử (trước vào viện)</div>
            <div className="detail-row">
              <strong>Bệnh lý nền / mạn tính:</strong>
              {resident.chronicConditions?.length ? (
                <div className="detail-tags">
                  {resident.chronicConditions.map((c) => (
                    <span key={c} className="detail-tag">{c}</span>
                  ))}
                </div>
              ) : '—'}
            </div>
            <div className="detail-row">
              <strong>Tiền sử bệnh:</strong>
              {Array.isArray(resident.medicalHistory) && resident.medicalHistory.length ? (
                <div className="detail-tags">
                  {resident.medicalHistory.map((item) => (
                    <span key={item} className="detail-tag">{item}</span>
                  ))}
                </div>
              ) : typeof resident.medicalHistory === 'string' && resident.medicalHistory.trim() ? (
                <div className="health-description">{resident.medicalHistory}</div>
              ) : (
                '—'
              )}
            </div>

            <div className="modal__section">Dị ứng thuốc</div>
            <div className="detail-row">
              <strong>Thuốc dị ứng:</strong>
              {drugAllergiesList.length ? (
                <div className="detail-tags">
                  {drugAllergiesList.map((d) => (
                    <span key={d} className="detail-tag">{d}</span>
                  ))}
                </div>
              ) : (
                <span className="detail-row--muted">Chưa ghi nhận dị ứng thuốc</span>
              )}
            </div>

            <div className="modal__section">Khác</div>
            <div className="detail-row"><strong>CCCD:</strong> {resident.citizenId || '—'}</div>
            <div className="detail-row"><strong>BHYT:</strong> {resident.insuranceNumber || '—'}</div>
            <div className="detail-row"><strong>Địa chỉ:</strong> {resident.personalAddress || '—'}</div>
            <div className="detail-row">
              <strong>Ngày nhập viện:</strong>{' '}
              {resident.admittedAt ? formatLeaveDate(resident.admittedAt) : '—'}
            </div>
            <div className="detail-row">
              <strong>Gói dịch vụ:</strong> {resident.servicePackage || '—'}
            </div>
            <div className="detail-row">
              <strong>Liên hệ khẩn cấp:</strong> {resident.emergencyContactCount ?? 0}
            </div>
          </>
        )}

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

export default function ResidentsByAreaPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [page, setPage] = useState(1);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [floorId, setFloorId] = useState('');
  const [roomId, setRoomId] = useState('');

  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [detailModal, setDetailModal] = useState(null);
  const [usingFallbackApi, setUsingFallbackApi] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    facilityService
      .listBuildings({ activeOnly: true })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBuildings(list);
        if (list.length && !buildingId) setBuildingId(list[0]._id);
      })
      .catch(() => setBuildings([]));
  }, []);

  const loadSummary = useCallback(async () => {
    if (!buildingId) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await residentService.getAreaSummary({
        buildingId,
        status: statusFilter || undefined,
      });
      setSummary(data);
      if (data?._fallback) setUsingFallbackApi(true);
    } catch (e) {
      setSummaryError(e.response?.data?.message || getFacilityErrorMessage(e, 'Không tải được tổng quan khu vực'));
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [buildingId, statusFilter]);

  const loadList = useCallback(async () => {
    if (!buildingId && !floorId && !roomId) {
      setResidents([]);
      return;
    }
    setListLoading(true);
    setListError('');
    try {
      const res = await residentService.listByArea({
        buildingId: buildingId || undefined,
        floorId: floorId || undefined,
        roomId: roomId || undefined,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 0);
      if (res?._fallback) setUsingFallbackApi(true);
    } catch (e) {
      setListError(e.response?.data?.message || 'Không thể tải danh sách cư dân');
      setResidents([]);
    } finally {
      setListLoading(false);
    }
  }, [buildingId, floorId, roomId, debouncedSearch, statusFilter, page]);

  useEffect(() => {
    setFloorId('');
    setRoomId('');
    setPage(1);
    setUsingFallbackApi(false);
  }, [buildingId, statusFilter]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => { loadList(); }, [loadList]);

  const selectFloor = (id) => {
    setFloorId(id);
    setRoomId('');
    setPage(1);
  };

  const selectRoom = (fId, rId) => {
    setFloorId(fId);
    setRoomId(rId);
    setPage(1);
  };

  const selectAllBuilding = () => {
    setFloorId('');
    setRoomId('');
    setPage(1);
  };

  const openDetail = async (residentId) => {
    setDetailModal({ loading: true, error: '', resident: null });
    try {
      const data = await residentService.getResidentDetail(residentId);
      setDetailModal({ loading: false, error: '', resident: data.resident });
    } catch (e) {
      setDetailModal({
        loading: false,
        error: e.response?.data?.message || 'Không thể tải chi tiết',
        resident: null,
      });
    }
  };

  const activeFilterLabel = roomId
    ? summary?.floors
        ?.flatMap((f) => f.rooms.map((r) => ({ floor: f, room: r })))
        ?.find(({ room }) => String(room._id) === String(roomId))?.room.label
    : floorId
      ? summary?.floors?.find((f) => String(f._id) === String(floorId))?.label
      : buildings.find((b) => String(b._id) === String(buildingId))?.name || 'Toàn tòa';

  const buildExportFilterSummary = () => {
    const parts = [];
    if (activeFilterLabel) parts.push(`Khu vực: ${activeFilterLabel}`);
    parts.push(`Trạng thái: ${STATUS_FILTER_LABELS[statusFilter] || statusFilter || 'Tất cả'}`);
    if (search) parts.push(`Tìm kiếm: "${search}"`);
    return parts.join(' | ');
  };

  const handleExport = async (format) => {
    if (!buildingId) {
      alert('Vui lòng chọn tòa nhà trước khi xuất.');
      return;
    }
    try {
      setExporting(true);
      setListError('');
      const rows = await residentService.fetchAllResidentsByAreaForExport({
        buildingId,
        floorId: floorId || undefined,
        roomId: roomId || undefined,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      });
      if (!rows.length) {
        alert('Không có dữ liệu để xuất.');
        return;
      }
      const meta = {
        title: 'DANH SÁCH CƯ DÂN THEO KHU VỰC',
        filterSummary: buildExportFilterSummary(),
        exportedBy: user?.fullName || user?.email || '—',
        buildingLabel: activeFilterLabel,
        buildingId,
        summaryStats: {
          totalInBuilding: summary?.totalResidents ?? 0,
          floorCount: summary?.floors?.length ?? 0,
          filteredCount: rows.length,
        },
      };
      if (format === 'csv') {
        exportResidentListToCSV(rows, meta);
      } else {
        exportResidentListToPDF(rows, meta);
      }
    } catch (e) {
      console.error('Failed to export residents by area:', e);
      setListError(e.response?.data?.message || 'Không thể xuất danh sách cư dân.');
    } finally {
      setExporting(false);
    }
  };

  const floorOptions = summary?.floors || [];
  const selectedFloor = floorOptions.find((f) => String(f._id) === String(floorId));
  const roomOptions = floorId
    ? selectedFloor?.rooms || []
    : floorOptions.flatMap((f) => f.rooms || []);

  const pageStats = useMemo(
    () => [
      {
        label: 'Tổng trong tòa',
        value: String(summary?.totalResidents ?? 0).padStart(2, '0'),
        icon: <Building2 size={20} />,
      },
      {
        label: 'Số tầng',
        value: String(summary?.floors?.length ?? 0).padStart(2, '0'),
        icon: <MapPin size={20} />,
        iconClass: 'resident-stat__icon--admitted',
      },
      {
        label: 'Đang lọc',
        value: String(total).padStart(2, '0'),
        icon: <MapPin size={20} />,
        iconClass: 'resident-stat__icon--pending',
      },
    ],
    [summary, total]
  );

  return (
    <AdminPageShell
      title={t('admin.residents.byArea.title')}
      subtitle={t('admin.residents.byArea.subtitle')}
      actions={
        <>
          <button
            type="button"
            className="resident-page__button resident-page__button--ghost"
            onClick={() => {
              loadSummary();
              loadList();
            }}
            disabled={listLoading || exporting}
          >
            <RefreshCw size={16} className={listLoading ? 'spin' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            className="resident-page__button resident-page__button--export"
            onClick={() => handleExport('csv')}
            disabled={listLoading || exporting || !buildingId}
            title="Xuất danh sách Excel (CSV)"
          >
            <Download size={16} />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            type="button"
            className="resident-page__button resident-page__button--export-pdf"
            onClick={() => handleExport('pdf')}
            disabled={listLoading || exporting || !buildingId}
            title="Xuất báo cáo PDF"
          >
            <Download size={16} />
            Xuất PDF
          </button>
        </>
      }
      stats={summary ? pageStats : undefined}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Tòa nhà</span>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              disabled={!buildings.length}
            >
              {!buildings.length && <option value="">— Không có tòa —</option>}
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>{b.name || b.code}</option>
              ))}
            </select>
          </label>
          <label className="resident-page__filter">
            <span>Trạng thái</span>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="admitted">Đang điều trị</option>
              <option value="pending">Chờ nhập viện</option>
              <option value="discharged">Đã xuất viện</option>
              <option value="">Tất cả trạng thái</option>
            </select>
          </label>
          <label className="resident-page__filter">
            <span>Tầng</span>
            <select value={floorId} onChange={(e) => selectFloor(e.target.value)}>
              <option value="">Tất cả tầng</option>
              {floorOptions.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.label || f.name || `Tầng ${f.floorNumber}`}
                </option>
              ))}
            </select>
          </label>
          <label className="resident-page__filter">
            <span>Phòng</span>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Tất cả phòng</option>
              {roomOptions.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.label || `Phòng ${r.roomNumber}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Tìm kiếm</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="search"
                placeholder="Tên hoặc mã cư dân..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <div className="resident-page__filter-actions">
            <button
              type="button"
              className="resident-page__button resident-page__button--ghost"
              onClick={selectAllBuilding}
            >
              Bỏ lọc khu vực
            </button>
          </div>
        </div>
      </div>

      {usingFallbackApi && (
        <p className="resident-page__hint-box">⚠️ {RESIDENT_AREA_ROUTE_HINT}</p>
      )}

      {(summaryError || listError) && (
        <div className="resident-page__error">{summaryError || listError}</div>
      )}

      {summary && activeFilterLabel && (
        <p className="resident-page__hint">Đang lọc: <strong>{activeFilterLabel}</strong></p>
      )}

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Khu vực</th>
              <th>Dị ứng thuốc</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr><td colSpan={6} className="resident-page__empty">Đang tải...</td></tr>
            )}
            {!listLoading && !buildingId && (
              <tr><td colSpan={6} className="resident-page__empty">Chọn tòa nhà để xem cư dân</td></tr>
            )}
            {!listLoading && buildingId && residents.length === 0 && (
              <tr><td colSpan={6} className="resident-page__empty">Không có cư dân trong khu vực này</td></tr>
            )}
            {!listLoading && residents.map((r) => (
              <tr key={r._id} className="resident-page__table-row">
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.residentCode}</td>
                <td style={{ fontWeight: 600 }}>{r.fullName}</td>
                <td>{formatResidentAreaLine(r) || '—'}</td>
                <td>
                  {r.hasDrugAllergiesRecord
                    ? `Đã ghi (${r.drugAllergiesCount ?? pickDrugAllergiesList(r).length ?? 0})`
                    : 'Chưa ghi'}
                </td>
                <td>
                  <span className={`residency-badge residency-badge--${r.residencyStatus || 'default'}`}>
                    {RESIDENCY_LABELS[r.residencyStatus] || r.residencyStatus || '—'}
                  </span>
                </td>
                <td className="resident-action-cell">
                  <button
                    type="button"
                    className="resident-icon-btn resident-icon-btn--view"
                    title="Xem chi tiết"
                    onClick={() => openDetail(r._id)}
                  >
                    <FaEye />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!listLoading && residents.length > 0 && (
        <ListPagination
          page={page}
          totalPages={Math.max(totalPages, 1)}
          total={total}
          onPageChange={setPage}
        />
      )}

      {detailModal && (
        <ResidentDetailModal
          loading={detailModal.loading}
          error={detailModal.error}
          resident={detailModal.resident}
          onClose={() => setDetailModal(null)}
        />
      )}
    </AdminPageShell>
  );
}
