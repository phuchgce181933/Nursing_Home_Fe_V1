import { useCallback, useEffect, useState } from 'react';
import caregiverDietPlanService from '../../../services/caregiverDietPlan.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatVNDate } from '../../../utils/nutritionLabels';
import '../../../styles/caregiver/DietPlansPage.css';
import DietPlanDetailModal from './components/DietPlanDetailModal';

const today = () => getLocalDateString();

function StatusCell({ ok }) {
  return <span className={ok ? 'diet-plans-page__status-yes' : 'diet-plans-page__status-no'}>{ok ? '✓' : '—'}</span>;
}

function DietPlansPage() {
  const [workDate, setWorkDate] = useState(today());
  const [residentId, setResidentId] = useState('');
  const [search, setSearch] = useState('');
  const [residents, setResidents] = useState([]);
  const [rows, setRows] = useState([]);
  const [dayMeta, setDayMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const loadResidents = async () => {
    try {
      const res = await caregiverDietPlanService.listResidents();
      setResidents(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách cư dân');
    }
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await caregiverDietPlanService.listOverview({
        workDate,
        residentId: residentId || undefined,
        search: search.trim() || undefined,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setDayMeta({
        hasPublishedMealPlanDay: res.hasPublishedMealPlanDay,
        hasPublishedSpecialDietDay: res.hasPublishedSpecialDietDay,
        mealPlanDayTitle: res.mealPlanDayTitle,
        specialDietDayTitle: res.specialDietDayTitle,
      });
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chế độ ăn');
      setRows([]);
      setDayMeta(null);
    } finally {
      setLoading(false);
    }
  }, [workDate, residentId, search]);

  useEffect(() => {
    loadResidents();
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const openDetail = async (rid) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setError('');
    try {
      const data = await caregiverDietPlanService.getResidentPlan(rid, { workDate });
      setDetail(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết chế độ ăn');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  return (
    <div className="page card diet-plans-page">
      <h1 className="diet-plans-page__title">Xem chế độ ăn uống</h1>
      <p className="diet-plans-page__intro">
        Xem thực đơn và chế độ ăn đặc biệt đã được điều dưỡng publish cho cư dân phụ trách. Chỉ xem — không
        chỉnh sửa tại đây.
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="diet-plans-page__panel">
        <h3 className="diet-plans-page__panel-title">Bộ lọc</h3>
        <div className="diet-plans-page__filters">
          <label>
            Ngày
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </label>
          <label>
            Cư dân
            <select value={residentId} onChange={(e) => setResidentId(e.target.value)}>
              <option value="">Tất cả</option>
              {residents.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.fullName || r.residentCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tìm kiếm
            <input
              type="search"
              placeholder="Tên hoặc mã cư dân"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="diet-plans-page__filter-actions">
            <button type="button" className="btn-secondary" disabled={loading} onClick={loadOverview}>
              {loading ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>
        </div>
      </div>

      {dayMeta && (
        <p className="diet-plans-page__day-banner">
          Ngày {formatVNDate(workDate)}:{' '}
          {dayMeta.hasPublishedMealPlanDay
            ? `Có thực đơn publish${dayMeta.mealPlanDayTitle ? ` (${dayMeta.mealPlanDayTitle})` : ''}`
            : 'Chưa có thực đơn publish cho ngày này'}
          {' · '}
          {dayMeta.hasPublishedSpecialDietDay
            ? `Có chế độ đặc biệt${dayMeta.specialDietDayTitle ? ` (${dayMeta.specialDietDayTitle})` : ''}`
            : 'Chưa có chế độ đặc biệt publish'}
        </p>
      )}

      <div className="diet-plans-page__panel">
        <h3 className="diet-plans-page__panel-title">Cư dân phụ trách</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Cư dân</th>
              <th>Thực đơn</th>
              <th>Chế độ đặc biệt</th>
              <th>Giờ ăn riêng</th>
              <th>Dị ứng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Không có cư dân phù hợp bộ lọc
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.residentId}>
                  <td>
                    <div>{row.fullName || '—'}</div>
                    <div className="diet-plans-page__meal-meta">{row.residentCode || ''}</div>
                  </td>
                  <td>
                    <StatusCell ok={row.hasMealPlan} />
                    {row.hasMealPlan && (
                      <span className="diet-plans-page__meal-meta"> ({row.mealPlanMealCount} bữa)</span>
                    )}
                  </td>
                  <td>
                    <StatusCell ok={row.hasSpecialDiet} />
                    {row.hasSpecialDiet && (
                      <span className="diet-plans-page__meal-meta"> ({row.specialDietCount})</span>
                    )}
                  </td>
                  <td>
                    <StatusCell ok={row.hasMealTimeSchedule} />
                  </td>
                  <td>
                    {row.allergies?.length > 0 ? (
                      <span className="diet-plans-page__allergies">{row.allergies.join(', ')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="diet-plans-page__row-actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--edit"
                      onClick={() => openDetail(row.residentId)}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <DietPlanDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        workDate={workDate}
        onClose={closeDetail}
      />
    </div>
  );
}

export default DietPlansPage;
