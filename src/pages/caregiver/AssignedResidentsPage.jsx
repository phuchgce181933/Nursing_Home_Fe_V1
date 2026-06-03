import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ResidentContextBlock from '../../components/resident/ResidentContextBlock';
import caregiverResidentService from '../../services/caregiverResident.service';
import { formatResidentAreaLine, pickDrugAllergiesList } from '../../utils/residentArea';
import '../../styles/caregiver/AssignedResidentsPage.css';

const GENDER_LABELS = { male: 'Nam', female: 'Nữ', other: 'Khác', unknown: 'Không rõ' };

function formatAllergies(row) {
  const drug = pickDrugAllergiesList(row);
  const food = (row.allergies || []).filter(
    (a) => !drug.some((d) => d.toLowerCase() === String(a).toLowerCase())
  );
  const parts = [];
  if (drug.length) parts.push(`Thuốc: ${drug.join(', ')}`);
  if (food.length) parts.push(`Khác: ${food.join(', ')}`);
  return parts.length ? parts.join(' · ') : '—';
}

function formatConditions(row) {
  const list = row.chronicConditions || [];
  return list.length ? list.join(', ') : '—';
}

function formatAdmittedAt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
}

function ResidentWarning({ resident }) {
  if (!resident) return null;
  const drug = pickDrugAllergiesList(resident);
  const food = (resident.allergies || []).filter(Boolean);
  const conditions = resident.chronicConditions || [];
  if (!drug.length && !food.length && !conditions.length) return null;

  return (
    <div className="assigned-residents-page__warning">
      {drug.length > 0 && (
        <p>
          <strong>Dị ứng thuốc:</strong> {drug.join(', ')}
        </p>
      )}
      {food.length > 0 && (
        <p>
          <strong>Dị ứng khác:</strong> {food.join(', ')}
        </p>
      )}
      {conditions.length > 0 && (
        <p>
          <strong>Bệnh nền:</strong> {conditions.join(', ')}
        </p>
      )}
    </div>
  );
}

function ResidentDetailModal({ residentId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!residentId) return;
    setLoading(true);
    setError('');
    caregiverResidentService
      .getResident(residentId)
      .then(setResident)
      .catch((e) => setError(e?.response?.data?.message || 'Không tải được thông tin cư dân'))
      .finally(() => setLoading(false));
  }, [residentId]);

  return (
    <div className="assigned-residents-page__modal-overlay" onClick={onClose}>
      <div
        className="assigned-residents-page__modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="assigned-residents-page__modal-header">
          <h3 className="assigned-residents-page__modal-title">Chi tiết cư dân</h3>
          <button type="button" className="assigned-residents-page__modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="assigned-residents-page__modal-body">
          {loading && <p>Đang tải...</p>}
          {error && <p className="form-error">{error}</p>}
          {!loading && !error && resident && (
            <>
              <ResidentWarning resident={resident} />
              <ResidentContextBlock resident={resident} showGender showStatus />
              <div className="assigned-residents-page__meta-block">
                {resident.bloodType && resident.bloodType !== 'unknown' && (
                  <p>
                    <strong>Nhóm máu:</strong> {resident.bloodType}
                  </p>
                )}
                {resident.initialHealthCondition && (
                  <p>
                    <strong>Tình trạng ban đầu:</strong> {resident.initialHealthCondition}
                  </p>
                )}
                <p>
                  <strong>Ngày nhập viện:</strong> {formatAdmittedAt(resident.admittedAt)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignedResidentsPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [residents, setResidents] = useState([]);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);

  const loadResidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await caregiverResidentService.listResidents({
        search: search || undefined,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setEmptyMessage(res.message || '');
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách cư dân');
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="page card assigned-residents-page">
      <h1 className="assigned-residents-page__title">Cư dân phụ trách</h1>
      <p className="assigned-residents-page__intro">
        Danh sách người cao tuổi được quản lý phân công cho bạn. Chỉ xem thông tin — không thể tự
        thêm hoặc bỏ phân công tại đây.
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="assigned-residents-page__panel">
        <form className="assigned-residents-page__toolbar" onSubmit={handleSearch}>
          <label>
            Tìm theo tên hoặc mã
            <input
              type="search"
              placeholder="Nhập tên hoặc mã cư dân..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            Tìm
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={() => {
              setSearchInput('');
              setSearch('');
            }}
          >
            Xóa lọc
          </button>
        </form>

        {!loading && residents.length === 0 && emptyMessage && (
          <p className="assigned-residents-page__empty-hint">{emptyMessage}</p>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Giới tính</th>
              <th>Khu vực</th>
              <th>Dị ứng</th>
              <th>Bệnh nền</th>
              <th>Ngày nhập viện</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="empty-state">
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && residents.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  {search ? 'Không tìm thấy cư dân phù hợp' : 'Chưa có cư dân trong danh sách phụ trách'}
                </td>
              </tr>
            )}
            {!loading &&
              residents.map((row) => {
                const allergies = formatAllergies(row);
                const hasAllergy = allergies !== '—';
                return (
                  <tr key={row._id}>
                    <td>{row.residentCode || '—'}</td>
                    <td>{row.fullName || '—'}</td>
                    <td>{GENDER_LABELS[row.gender] || row.gender || '—'}</td>
                    <td>{formatResidentAreaLine(row) || '—'}</td>
                    <td className={hasAllergy ? 'assigned-residents-page__allergy-tags' : undefined}>
                      {allergies}
                    </td>
                    <td>{formatConditions(row)}</td>
                    <td>{formatAdmittedAt(row.admittedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm btn--edit"
                        onClick={() => setDetailId(row._id)}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <p className="assigned-residents-page__intro">
        <Link to="/caregiver/meal-intake-notes">Ghi nhận bữa ăn</Link> chỉ áp dụng cho cư dân trong
        danh sách này.
      </p>

      {detailId && <ResidentDetailModal residentId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

export default AssignedResidentsPage;
