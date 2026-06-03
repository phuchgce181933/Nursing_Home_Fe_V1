import { useCallback, useEffect, useState } from 'react';
import caregiverRehabilitationScheduleService from '../../../services/caregiverRehabilitationSchedule.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatVNDate } from '../../../utils/nutritionLabels';
import '../../../styles/caregiver/RehabilitationSchedulePage.css';
import RehabScheduleDetailModal from './components/RehabScheduleDetailModal';

const today = () => getLocalDateString();

function StatusCell({ ok }) {
  return (
    <span className={ok ? 'rehab-schedule-page__status-yes' : 'rehab-schedule-page__status-no'}>
      {ok ? '✓' : '—'}
    </span>
  );
}

function RehabilitationSchedulePage() {
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
      const res = await caregiverRehabilitationScheduleService.listResidents();
      setResidents(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách cư dân');
    }
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await caregiverRehabilitationScheduleService.listOverview({
        workDate,
        residentId: residentId || undefined,
        search: search.trim() || undefined,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setDayMeta({
        hasPublishedRehabDay: res.hasPublishedRehabDay,
        planTitle: res.planTitle,
      });
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được lịch phục hồi');
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
      const data = await caregiverRehabilitationScheduleService.getResidentSchedule(rid, { workDate });
      setDetail(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết lịch phục hồi');
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
    <div className="page card rehab-schedule-page">
      <h1 className="rehab-schedule-page__title">Lịch phục hồi chức năng</h1>
      <p className="rehab-schedule-page__intro">
        Xem lịch trị liệu / phục hồi đã publish cho cư dân phụ trách — giờ, địa điểm và ghi chú đưa đón. Chỉ
        xem, không chỉnh sửa.
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="rehab-schedule-page__panel">
        <h3 className="rehab-schedule-page__panel-title">Bộ lọc</h3>
        <div className="rehab-schedule-page__filters">
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
          <div className="rehab-schedule-page__filter-actions">
            <button type="button" className="btn-secondary" disabled={loading} onClick={loadOverview}>
              {loading ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>
        </div>
      </div>

      {dayMeta && (
        <p className="rehab-schedule-page__day-banner">
          Ngày {formatVNDate(workDate)}:{' '}
          {dayMeta.hasPublishedRehabDay
            ? `Có lịch phục hồi publish${dayMeta.planTitle ? ` (${dayMeta.planTitle})` : ''}`
            : 'Chưa có lịch phục hồi publish cho ngày này'}
        </p>
      )}

      <div className="rehab-schedule-page__panel">
        <h3 className="rehab-schedule-page__panel-title">Cư dân phụ trách</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Cư dân</th>
              <th>Có lịch PHCN</th>
              <th>Số buổi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Không có cư dân phù hợp bộ lọc
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.residentId}>
                  <td>
                    <div>{row.fullName || '—'}</div>
                    <div className="rehab-schedule-page__session-meta">{row.residentCode || ''}</div>
                  </td>
                  <td>
                    <StatusCell ok={row.hasRehabSchedule} />
                  </td>
                  <td>{row.sessionCount ?? 0}</td>
                  <td className="rehab-schedule-page__row-actions">
                    <button type="button" className="btn btn--sm btn--edit" onClick={() => openDetail(row.residentId)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <RehabScheduleDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        workDate={workDate}
        onClose={closeDetail}
      />
    </div>
  );
}

export default RehabilitationSchedulePage;
