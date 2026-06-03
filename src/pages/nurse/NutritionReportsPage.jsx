import { useCallback, useEffect, useState } from 'react';
import nutritionReportService from '../../services/nutritionReport.service';
import { getLocalDateString } from '../../utils/dateUtils';
import {
  dietTypeLabel,
  formatVNDate,
  formatVNDateTime,
  intakeStatusLabel,
  mealTypeLabel,
} from '../../utils/nutritionLabels';
import '../../styles/nurse/NutritionReportsPage.css';

const today = () => getLocalDateString();
const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalDateString(d);
};

function NutritionReportsPage() {
  const [to, setTo] = useState(today());
  const [from, setFrom] = useState(addDays(today(), -6));
  const [search, setSearch] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [summary, setSummary] = useState(null);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const queryParams = useCallback(
    () => ({
      from,
      to,
      search: search.trim() || undefined,
      missingMealPlan: missingOnly ? 'true' : undefined,
      limit: 100,
    }),
    [from, to, search, missingOnly]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, listRes] = await Promise.all([
        nutritionReportService.getSummary({ from, to }),
        nutritionReportService.listResidents(queryParams()),
      ]);
      setSummary(summaryRes || null);
      setResidents(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được báo cáo dinh dưỡng');
      setSummary(null);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, queryParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setLast7Days = () => {
    const end = today();
    setTo(end);
    setFrom(addDays(end, -6));
  };

  const setTodayOnly = () => {
    const d = today();
    setFrom(d);
    setTo(d);
  };

  const openDetail = async (residentId) => {
    setDetailLoading(true);
    setError('');
    try {
      const data = await nutritionReportService.getResidentReport(residentId, { from, to });
      setDetail(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết cư dân');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetail(null);

  const StatusCell = ({ ok }) => (
    <span className={ok ? 'nutrition-reports__status-yes' : 'nutrition-reports__status-no'}>
      {ok ? '✓' : '—'}
    </span>
  );

  return (
    <div className="page card nutrition-reports">
      <h1 className="nutrition-reports__title">Báo cáo dinh dưỡng</h1>
      <p className="nutrition-reports__intro">
        Xem tổng hợp thực đơn, chế độ ăn đặc biệt, giờ ăn đã publish và ghi chú ăn uống của cư dân trong khoảng thời gian
        bạn chọn (chỉ đọc).
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="nutrition-reports__filters">
        <label>
          Từ ngày
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          Tìm cư dân
          <input
            type="search"
            placeholder="Tên hoặc mã"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
          />
          Chỉ thiếu thực đơn
        </label>
        <div className="nutrition-reports__filter-actions">
          <button type="button" className="btn-secondary" onClick={setLast7Days}>
            7 ngày
          </button>
          <button type="button" className="btn-secondary" onClick={setTodayOnly}>
            Hôm nay
          </button>
          <button type="button" className="btn-primary" onClick={loadData} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="nutrition-reports__kpi-grid">
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.totalAdmittedResidents ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Cư dân đang ở</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithMealPlan ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Có thực đơn publish</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithSpecialDiet ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Có chế độ ăn đặc biệt</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithMealTimeSchedule ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Có lịch giờ ăn</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.totalMealIntakeRecords ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Ghi nhận intake (CG)</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.residentsWithMealIntake ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Cư dân có intake</div>
          </div>
          <div className="nutrition-reports__kpi">
            <div className="nutrition-reports__kpi-value">{summary.totalMealNotes ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Ghi chú meal (text)</div>
          </div>
          <div className="nutrition-reports__kpi nutrition-reports__kpi--warn">
            <div className="nutrition-reports__kpi-value">{summary.residentsMissingMealPlan ?? 0}</div>
            <div className="nutrition-reports__kpi-label">Thiếu thực đơn publish</div>
          </div>
        </div>
      )}

      <div className="nutrition-reports__table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cư dân</th>
              <th>Mã</th>
              <th>Thực đơn</th>
              <th>Chế độ đặc biệt</th>
              <th>Giờ ăn</th>
              <th>Intake (CG)</th>
              <th>Ghi chú meal</th>
              <th />
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
                  Không có cư dân phù hợp bộ lọc
                </td>
              </tr>
            )}
            {!loading &&
              residents.map((row) => (
                <tr key={row.residentId}>
                  <td>{row.fullName || '—'}</td>
                  <td>{row.residentCode || '—'}</td>
                  <td>
                    <StatusCell ok={row.hasMealPlan} />
                  </td>
                  <td>
                    <StatusCell ok={row.hasSpecialDiet} />
                  </td>
                  <td>
                    <StatusCell ok={row.hasMealTimeSchedule} />
                  </td>
                  <td>{row.mealIntakeCount ?? 0}</td>
                  <td>{row.mealNotesCount ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--sm meal-page__btn-view"
                      onClick={() => openDetail(row.residentId)}
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {(detailLoading || detail) && (
        <div className="nutrition-reports__modal-overlay" onClick={!detailLoading ? closeDetail : undefined}>
          <div className="nutrition-reports__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="nutrition-reports__modal-header">
              <h3 className="nutrition-reports__modal-title">
                Chi tiết dinh dưỡng — {detail?.resident?.fullName || '...'}
              </h3>
              {!detailLoading && (
                <button type="button" className="nutrition-reports__modal-close" onClick={closeDetail}>
                  ×
                </button>
              )}
            </div>
            <div className="nutrition-reports__modal-body">
              {detailLoading && <p>Đang tải chi tiết...</p>}
              {!detailLoading && detail && (
                <>
                  <p className="nutrition-reports__resident-meta">
                    <strong>Mã:</strong> {detail.resident?.residentCode || '—'} ·{' '}
                    <strong>Khoảng:</strong> {formatVNDate(detail.period?.from)} – {formatVNDate(detail.period?.to)}
                    {detail.resident?.allergies?.length > 0 && (
                      <>
                        {' '}
                        · <strong>Dị ứng:</strong> {detail.resident.allergies.join(', ')}
                      </>
                    )}
                    {detail.resident?.chronicConditions?.length > 0 && (
                      <>
                        {' '}
                        · <strong>Bệnh nền:</strong> {detail.resident.chronicConditions.join(', ')}
                      </>
                    )}
                  </p>
                  <p className="nutrition-reports__resident-meta">
                    {detail.summary?.mealPlanMealCount ?? 0} bữa có thực đơn ·{' '}
                    {detail.summary?.mealIntakeCount ?? 0} ghi nhận intake ·{' '}
                    {detail.summary?.mealNotesCount ?? 0} ghi chú meal ·{' '}
                    {detail.summary?.daysWithData ?? 0} ngày có dữ liệu
                  </p>

                  {(!detail.days || detail.days.length === 0) && (
                    <p className="empty-state">Chưa có dữ liệu dinh dưỡng publish trong khoảng này.</p>
                  )}

                  {Array.isArray(detail.days) &&
                    detail.days.map((day) => (
                      <div key={day.workDate} className="nutrition-reports__day-block">
                        <h3 className="nutrition-reports__day-title">{formatVNDate(day.workDate)}</h3>

                        {day.mealTimeSchedule && (
                          <div className="nutrition-reports__subsection">
                            <h4>Giờ ăn</h4>
                            <p>
                              Sáng {day.mealTimeSchedule.breakfastTime} · Trưa{' '}
                              {day.mealTimeSchedule.lunchTime} · Tối {day.mealTimeSchedule.dinnerTime}
                              {day.mealTimeSchedule.notes ? ` — ${day.mealTimeSchedule.notes}` : ''}
                            </p>
                          </div>
                        )}

                        {day.mealPlanEntries?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>Thực đơn</h4>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Bữa</th>
                                  <th>Món</th>
                                  <th>Giờ</th>
                                  <th>Kcal</th>
                                  <th>Ghi chú</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.mealPlanEntries.map((m, idx) => (
                                  <tr key={`${day.workDate}-meal-${idx}`}>
                                    <td>{mealTypeLabel(m.mealType)}</td>
                                    <td>{m.mealName}</td>
                                    <td>{m.mealTime || '—'}</td>
                                    <td>{m.calories ?? '—'}</td>
                                    <td>{m.nutritionNote || m.stageNote || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {day.specialDietEntries?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>Chế độ ăn đặc biệt</h4>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Loại</th>
                                  <th>Hạn chế</th>
                                  <th>Mục tiêu</th>
                                  <th>Giờ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.specialDietEntries.map((d, idx) => (
                                  <tr key={`${day.workDate}-diet-${idx}`}>
                                    <td>{dietTypeLabel(d.dietType)}</td>
                                    <td>
                                      {Array.isArray(d.restrictions) ? d.restrictions.join(', ') || '—' : '—'}
                                    </td>
                                    <td>{d.nutritionGoal || '—'}</td>
                                    <td>{d.effectiveTime || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {day.mealIntakeNotes?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>Ghi nhận intake (Caregiver)</h4>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Bữa</th>
                                  <th>Món dự kiến</th>
                                  <th>Tình trạng</th>
                                  <th>% ăn</th>
                                  <th>Ghi chú</th>
                                  <th>Thời gian</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.mealIntakeNotes.map((row) => (
                                  <tr key={row._id}>
                                    <td>{mealTypeLabel(row.mealType)}</td>
                                    <td>{row.plannedMealName || '—'}</td>
                                    <td>{intakeStatusLabel(row.intakeStatus)}</td>
                                    <td>
                                      {row.intakeStatus === 'partial' && row.portionPercent != null
                                        ? `${row.portionPercent}%`
                                        : '—'}
                                    </td>
                                    <td>{row.notes || '—'}</td>
                                    <td>{formatVNDateTime(row.recordedAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {day.mealNotes?.length > 0 && (
                          <div className="nutrition-reports__subsection">
                            <h4>Ghi chú ăn uống (text)</h4>
                            {day.mealNotes.map((n) => (
                              <div key={n._id} className="nutrition-reports__note">
                                <time>{formatVNDateTime(n.noteAt)}</time>
                                {n.authorName && <span>{n.authorName}: </span>}
                                {n.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NutritionReportsPage;
