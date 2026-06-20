import { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import nutritionReportService from '../../services/nutritionReport.service';
import { getLocalDateString } from '../../utils/dateUtils';
import {
  dietTypeLabel,
  formatLocaleDate,
  formatLocaleDateTime,
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

/* ---------- animated counter ---------- */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target == null) return;
    const num = Number(target) || 0;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * num));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

function KpiCard({ icon, value, label, color, delay }) {
  const display = useCountUp(value);
  return (
    <div className="nr-kpi" style={{ animationDelay: `${delay}ms` }}>
      <div className="nr-kpi__icon" style={{ background: color + '18', color }}>
        {icon}
      </div>
      <div className="nr-kpi__body">
        <span className="nr-kpi__value" style={{ color }}>{display}</span>
        <span className="nr-kpi__label">{label}</span>
      </div>
    </div>
  );
}

function StatusCell({ ok }) {
  return (
    <span className={ok ? 'nr-status nr-status--yes' : 'nr-status nr-status--no'}>
      {ok ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.1" />
          <path d="M5.5 8h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/* ---------- KPI config ---------- */
const KPI_CONFIG = [
  { key: 'totalAdmittedResidents', label: 'Cu dan dang o', icon: '👤', color: '#3b5bdb' },
  { key: 'residentsWithMealPlan', label: 'Co thuc don publish', icon: '📋', color: '#0891b2' },
  { key: 'residentsWithSpecialDiet', label: 'Co che do an dac biet', icon: '🍽', color: '#7c3aed' },
  { key: 'residentsWithMealTimeSchedule', label: 'Co lich gio an', icon: '⏰', color: '#0d9488' },
  { key: 'totalMealIntakeRecords', label: 'Ghi nhan intake (CG)', icon: '📝', color: '#2563eb' },
  { key: 'residentsWithMealIntake', label: 'Cu dan co intake', icon: '🧑‍⚕️', color: '#059669' },
  { key: 'totalMealNotes', label: 'Ghi chu meal (text)', icon: '💬', color: '#6366f1' },
  { key: 'residentsMissingMealPlan', label: 'Thieu thuc don publish', icon: '⚠️', color: '#dc2626' },
];

/* Vietnamese label map (avoid unicode in JSX source that could break build) */
const KPI_LABELS = {
  totalAdmittedResidents: 'Cư dân đang ở',
  residentsWithMealPlan: 'Có thực đơn publish',
  residentsWithSpecialDiet: 'Có chế độ ăn đặc biệt',
  residentsWithMealTimeSchedule: 'Có lịch giờ ăn',
  totalMealIntakeRecords: 'Ghi nhận intake (CG)',
  residentsWithMealIntake: 'Cư dân có intake',
  totalMealNotes: 'Ghi chú meal (text)',
  residentsMissingMealPlan: 'Thiếu thực đơn publish',
};

function NutritionReportsPage() {
  const { t, i18n } = useTranslation();
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

  return (
    <div className="nr-page">
      {/* ---- Page header ---- */}
      <div className="nr-header">
        <div className="nr-header__text">
          <h1 className="nr-header__title">Báo cáo dinh dưỡng</h1>
          <p className="nr-header__sub">
            Xem tổng hợp thực đơn, chế độ ăn đặc biệt, giờ ăn đã publish và ghi chú ăn uống của cư dân trong khoảng thời gian bạn chọn.
          </p>
        </div>
      </div>

      {error && <div className="nr-error">{error}</div>}

      {/* ---- Filter bar ---- */}
      <div className="nr-filters">
        <div className="nr-filters__group">
          <label className="nr-filters__label">
            <span>Từ ngày</span>
            <input type="date" className="nr-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="nr-filters__label">
            <span>Đến ngày</span>
            <input type="date" className="nr-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="nr-filters__label">
            <span>Tìm cư dân</span>
            <input
              type="search"
              className="nr-input"
              placeholder="Tên hoặc mã"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="nr-filters__checkbox">
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(e) => setMissingOnly(e.target.checked)}
            />
            <span>Chỉ thiếu thực đơn</span>
          </label>
        </div>
        <div className="nr-filters__actions">
          <button type="button" className="nr-btn nr-btn--ghost" onClick={setLast7Days}>
            7 ngày gần nhất
          </button>
          <button type="button" className="nr-btn nr-btn--ghost" onClick={setTodayOnly}>
            Hôm nay
          </button>
          <button type="button" className="nr-btn nr-btn--primary" onClick={loadData} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </div>

      {/* ---- KPI grid ---- */}
      {summary && (
        <div className="nr-kpi-grid">
          {KPI_CONFIG.map((cfg, i) => (
            <KpiCard
              key={cfg.key}
              icon={cfg.icon}
              value={summary[cfg.key] ?? 0}
              label={KPI_LABELS[cfg.key]}
              color={cfg.color}
              delay={i * 80}
            />
          ))}
        </div>
      )}

      {/* ---- Residents table ---- */}
      <div className="nr-table-card">
        <div className="nr-table-card__header">
          <h2 className="nr-table-card__title">Danh sách cư dân</h2>
          <span className="nr-table-card__count">{residents.length} kết quả</span>
        </div>
        <div className="nr-table-wrap">
          <table className="nr-table">
            <thead>
              <tr>
                <th>Cư dân</th>
                <th>Mã</th>
                <th>Thực đơn</th>
                <th>Chế độ đặc biệt</th>
                <th>Giờ ăn</th>
                <th>Intake (CG)</th>
                <th>Ghi chú meal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="nr-table__empty">
                    <div className="nr-spinner" />
                    <span>Đang tải dữ liệu...</span>
                  </td>
                </tr>
              )}
              {!loading && residents.length === 0 && (
                <tr>
                  <td colSpan={8} className="nr-table__empty">
                    Không có cư dân phù hợp bộ lọc
                  </td>
                </tr>
              )}
              {!loading &&
                residents.map((row, i) => (
                  <tr key={row.residentId} className="nr-table__row" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="nr-table__name">{row.fullName || '—'}</td>
                    <td><code className="nr-code">{row.residentCode || '—'}</code></td>
                    <td><StatusCell ok={row.hasMealPlan} /></td>
                    <td><StatusCell ok={row.hasSpecialDiet} /></td>
                    <td><StatusCell ok={row.hasMealTimeSchedule} /></td>
                    <td className="nr-table__num">{row.mealIntakeCount ?? 0}</td>
                    <td className="nr-table__num">{row.mealNotesCount ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        className="nr-btn nr-btn--sm nr-btn--primary"
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
      </div>

      {/* ---- Detail modal ---- */}
      {(detailLoading || detail) && (
        <div className="nr-overlay" onClick={!detailLoading ? closeDetail : undefined}>
          <div className="nr-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* modal header */}
            <div className="nr-modal__header">
              <div className="nr-modal__header-left">
                <div className="nr-modal__avatar">
                  {(detail?.resident?.fullName || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="nr-modal__title">
                    {detail?.resident?.fullName || '...'}
                  </h3>
                  <span className="nr-modal__subtitle">Chi tiết dinh dưỡng</span>
                </div>
              </div>
              {!detailLoading && (
                <button type="button" className="nr-modal__close" onClick={closeDetail}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* modal body */}
            <div className="nr-modal__body">
              {detailLoading && (
                <div className="nr-modal__loading">
                  <div className="nr-spinner nr-spinner--lg" />
                  <p>Đang tải chi tiết...</p>
                </div>
              )}
              {!detailLoading && detail && (
                <>
                  {/* resident meta */}
                  <div className="nr-meta">
                    <div className="nr-meta__item">
                      <span className="nr-meta__key">Mã</span>
                      <span className="nr-meta__val">{detail.resident?.residentCode || '—'}</span>
                    </div>
                    <div className="nr-meta__item">
                      <span className="nr-meta__key">Khoảng</span>
                      <span className="nr-meta__val">{formatLocaleDate(detail.period?.from, i18n.language)} – {formatLocaleDate(detail.period?.to, i18n.language)}</span>
                    </div>
                    {detail.resident?.allergies?.length > 0 && (
                      <div className="nr-meta__item">
                        <span className="nr-meta__key">Dị ứng</span>
                        <span className="nr-meta__val nr-meta__val--tag">{detail.resident.allergies.join(', ')}</span>
                      </div>
                    )}
                    {detail.resident?.chronicConditions?.length > 0 && (
                      <div className="nr-meta__item">
                        <span className="nr-meta__key">Bệnh nền</span>
                        <span className="nr-meta__val nr-meta__val--tag">{detail.resident.chronicConditions.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* summary chips */}
                  <div className="nr-chips">
                    <span className="nr-chip">{detail.summary?.mealPlanMealCount ?? 0} bữa có thực đơn</span>
                    <span className="nr-chip">{detail.summary?.mealIntakeCount ?? 0} ghi nhận intake</span>
                    <span className="nr-chip">{detail.summary?.mealNotesCount ?? 0} ghi chú meal</span>
                    <span className="nr-chip">{detail.summary?.daysWithData ?? 0} ngày có dữ liệu</span>
                  </div>

                  {(!detail.days || detail.days.length === 0) && (
                    <p className="nr-empty">Chưa có dữ liệu dinh dưỡng publish trong khoảng này.</p>
                  )}

                  {/* day blocks */}
                  {Array.isArray(detail.days) &&
                    detail.days.map((day) => (
                      <div key={day.workDate} className="nr-day">
                        <div className="nr-day__header">
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <rect x="1" y="3" width="16" height="14" rx="3" stroke="#3b5bdb" strokeWidth="1.5" />
                            <path d="M1 7h16" stroke="#3b5bdb" strokeWidth="1.5" />
                            <path d="M5 1v4M13 1v4" stroke="#3b5bdb" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <span>{formatLocaleDate(day.workDate, i18n.language)}</span>
                        </div>

                        {/* meal time schedule */}
                        {day.mealTimeSchedule && (
                          <div className="nr-sub nr-sub--time">
                            <h4 className="nr-sub__title">Giờ ăn</h4>
                            <div className="nr-sub__content">
                              <span className="nr-time-tag">Sáng {day.mealTimeSchedule.breakfastTime}</span>
                              <span className="nr-time-tag">Trưa {day.mealTimeSchedule.lunchTime}</span>
                              <span className="nr-time-tag">Tối {day.mealTimeSchedule.dinnerTime}</span>
                              {day.mealTimeSchedule.notes && (
                                <span className="nr-time-note">{day.mealTimeSchedule.notes}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* meal plan entries */}
                        {day.mealPlanEntries?.length > 0 && (
                          <div className="nr-sub nr-sub--plan">
                            <h4 className="nr-sub__title">Thực đơn</h4>
                            <div className="nr-sub__content">
                              <table className="nr-subtable">
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
                          </div>
                        )}

                        {/* special diet entries */}
                        {day.specialDietEntries?.length > 0 && (
                          <div className="nr-sub nr-sub--diet">
                            <h4 className="nr-sub__title">Chế độ ăn đặc biệt</h4>
                            <div className="nr-sub__content">
                              <table className="nr-subtable">
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
                                      <td>{Array.isArray(d.restrictions) ? d.restrictions.join(', ') || '—' : '—'}</td>
                                      <td>{d.nutritionGoal || '—'}</td>
                                      <td>{d.effectiveTime || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* meal intake notes */}
                        {day.mealIntakeNotes?.length > 0 && (
                          <div className="nr-sub nr-sub--intake">
                            <h4 className="nr-sub__title">Ghi nhận intake (Caregiver)</h4>
                            <div className="nr-sub__content">
                              <table className="nr-subtable">
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
                                      <td>{formatLocaleDateTime(row.recordedAt, i18n.language)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* meal notes */}
                        {day.mealNotes?.length > 0 && (
                          <div className="nr-sub nr-sub--notes">
                            <h4 className="nr-sub__title">Ghi chú ăn uống (text)</h4>
                            <div className="nr-sub__content">
                              {day.mealNotes.map((n) => (
                                <div key={n._id} className="nr-note">
                                  <time className="nr-note__time">{formatLocaleDateTime(n.noteAt, i18n.language)}</time>
                                  <div className="nr-note__body">
                                    {n.authorName && <strong className="nr-note__author">{n.authorName}: </strong>}
                                    {n.content}
                                  </div>
                                </div>
                              ))}
                            </div>
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
