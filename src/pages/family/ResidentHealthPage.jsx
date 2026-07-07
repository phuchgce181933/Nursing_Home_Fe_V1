import { useEffect, useState, useCallback } from 'react';
import {
  HeartPulse, History, ClipboardList, CalendarDays,
  Search, Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown,
  Thermometer, Activity, Droplet, Wind, Scale, Gauge, Pill, CalendarClock, FileText,
} from 'lucide-react';
import residentService from '../../services/resident.service';
import familyPortalService from '../../services/familyPortal.service';
import '../../styles/family/ResidentHealthPage.css';

const TABS = [
  { key: 'vitals', label: 'Chỉ số sinh hiệu', icon: HeartPulse },
  { key: 'history', label: 'Lịch sử sức khỏe', icon: History },
  { key: 'daily', label: 'Sinh hoạt hàng ngày', icon: ClipboardList },
  { key: 'schedule', label: 'Lịch chăm sóc', icon: CalendarDays },
  { key: 'medSchedule', label: 'Lịch dùng thuốc hôm nay', icon: CalendarClock },
  { key: 'medHistory', label: 'Lịch sử dùng thuốc', icon: Pill },
  { key: 'careNotes', label: 'Ghi chú chăm sóc', icon: FileText },
];

const CARE_NOTE_TYPE_LABELS = {
  meal: 'Bữa ăn',
  activity: 'Hoạt động',
  daily_living: 'Sinh hoạt hàng ngày',
  health: 'Sức khỏe',
  general: 'Chung',
};

const CARE_NOTE_TYPE_VARIANT = {
  meal: 'info',
  activity: 'success',
  daily_living: 'info',
  health: 'danger',
  general: '',
};

const MED_STATUS_LABELS = {
  PENDING: 'Chờ uống',
  TAKEN: 'Đã uống',
  LATE_TAKEN: 'Uống trễ',
  MISSED: 'Bỏ lỡ',
  SKIPPED: 'Bỏ qua',
  OVERDUE: 'Quá giờ',
};

const MED_STATUS_VARIANT = {
  TAKEN: 'success',
  LATE_TAKEN: 'info',
  PENDING: 'info',
  MISSED: 'danger',
  SKIPPED: 'danger',
  OVERDUE: 'danger',
};

// ── Daily activities / care schedule label maps ──
const CARE_TASK_TYPE_LABELS = {
  morning_care: 'Chăm sóc buổi sáng',
  medication: 'Cho thuốc',
  physical_therapy: 'Vật lý trị liệu',
  meal_assistance: 'Hỗ trợ bữa ăn',
  evening_check: 'Kiểm tra buổi tối',
  emergency_response: 'Ứng phó khẩn cấp',
};
const CARE_LEVEL_LABELS = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };
const CARE_TASK_STATUS_LABELS = {
  pending: 'Chờ thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  skipped: 'Bỏ qua',
  missed: 'Bỏ lỡ',
};

const HYGIENE_CATEGORY_LABELS = { personal: 'Vệ sinh cá nhân', environment: 'Dọn dẹp / môi trường' };
const HYGIENE_ACTIVITY_LABELS = {
  bathing: 'Tắm / rửa người',
  oral_care: 'Vệ sinh răng miệng',
  grooming: 'Chải tóc, thay quần áo',
  toileting: 'Hỗ trợ vệ sinh WC',
  diaper_change: 'Thay tã / băng vệ sinh',
  room_tidy: 'Dọn phòng, sắp xếp',
  bathroom_clean: 'Vệ sinh phòng tắm',
  linen_change: 'Thay ga, gối, khăn',
  laundry: 'Giặt / phơi đồ (hỗ trợ)',
};
const HYGIENE_COMPLETION_LABELS = {
  completed: 'Hoàn thành',
  partial: 'Một phần',
  refused: 'Không hợp tác / từ chối',
  assisted: 'Hỗ trợ hoàn thành',
};

const DAILY_MEAL_TYPE_LABELS = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối' };
const DAILY_INTAKE_STATUS_LABELS = { full: 'Ăn hết', partial: 'Ăn một phần', refused: 'Từ chối ăn', assisted: 'Hỗ trợ ăn' };

const BEHAVIOR_CATEGORY_LABELS = { mood: 'Tâm trạng', behavior: 'Hành vi', abnormal: 'Biểu hiện bất thường' };
const MOOD_LEVEL_LABELS = {
  calm: 'Bình tĩnh', happy: 'Vui vẻ', neutral: 'Trung tính', anxious: 'Lo âu',
  sad: 'Buồn', agitated: 'Kích động', confused: 'Lú lẫn', irritable: 'Cáu gắt',
};
const BEHAVIOR_TYPE_LABELS = {
  cooperative: 'Hợp tác', withdrawn: 'Thu mình', restless: 'Bồn chồn', wandering: 'Đi lang thang',
  verbal_outburst: 'La hét / nói to', physical_resistance: 'Chống đối thể chất',
  sleep_disturbance: 'Rối loạn giấc ngủ', appetite_change: 'Thay đổi ăn uống',
  social_withdrawal: 'Tránh giao tiếp', repetitive_behavior: 'Lặp lại hành vi', other: 'Khác',
};
const SEVERITY_LABELS = { normal: 'Bình thường', mild: 'Nhẹ', moderate: 'Trung bình', urgent: 'Cần xử lý gấp' };

// ── Care note metadata label maps (family "Ghi chú chăm sóc" tab detail) ──
const NOTE_MEAL_TYPE_LABELS = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối', snack: 'Bữa phụ' };
const NOTE_INTAKE_AMOUNT_LABELS = { none: 'Không ăn', little: 'Ăn một ít', half: 'Ăn một nửa', most: 'Ăn phần lớn', all: 'Ăn hết' };
const NOTE_APPETITE_LABELS = { poor: 'Kém', fair: 'Tạm ổn', good: 'Tốt', excellent: 'Rất tốt' };
const NOTE_ACTIVITY_TYPE_LABELS = {
  walking: 'Đi dạo', exercise: 'Tập thể dục', physiotherapy: 'Vật lý trị liệu', reading: 'Đọc sách',
  socializing: 'Giao lưu xã hội', entertainment: 'Giải trí', other: 'Khác',
};
const NOTE_PARTICIPATION_LABELS = { refused: 'Từ chối tham gia', assisted: 'Cần hỗ trợ', supervised: 'Cần giám sát', independent: 'Tự lực' };
const NOTE_MOOD_LABELS = { happy: 'Vui vẻ', neutral: 'Bình thường', sad: 'Buồn bã', agitated: 'Kích động', anxious: 'Lo âu' };
const NOTE_DAILY_LIVING_TYPE_LABELS = {
  bathing: 'Tắm rửa', grooming: 'Vệ sinh cá nhân', dressing: 'Mặc quần áo', eating: 'Ăn uống',
  mobility: 'Di chuyển', toileting: 'Đi vệ sinh', sleeping: 'Ngủ nghỉ', other: 'Khác',
};
const NOTE_ASSISTANCE_LEVEL_LABELS = { independent: 'Tự lực', supervised: 'Cần giám sát', assisted: 'Cần hỗ trợ', total_care: 'Hỗ trợ hoàn toàn' };
const NOTE_COMPLETION_STATUS_LABELS = { completed: 'Hoàn thành', partial: 'Một phần', refused: 'Từ chối' };
const NOTE_CONSCIOUSNESS_LABELS = { alert: 'Tỉnh táo', confused: 'Mơ hồ/Nhầm lẫn', drowsy: 'Lơ mơ/Buồn ngủ', unresponsive: 'Không phản ứng' };
const NOTE_FALL_RISK_LABELS = { low: 'Nguy cơ thấp', medium: 'Nguy cơ trung bình', high: 'Nguy cơ cao' };

const labelOf = (map, value) => (value ? (map[value] || value) : '—');

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatDateTime = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function ResidentHealthPage() {
  const [residents, setResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [residentsError, setResidentsError] = useState(null);
  const [activeTab, setActiveTab] = useState('vitals');

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingResidents(true);
        setResidentsError(null);
        const data = await residentService.getFamilyResidentList();
        const list = Array.isArray(data) ? data : [];
        setResidents(list);
        if (list.length > 0) setSelectedResidentId(list[0]._id);
      } catch (err) {
        setResidentsError(err?.response?.data?.message || err.message || 'Không thể tải danh sách người thân');
      } finally {
        setLoadingResidents(false);
      }
    };
    load();
  }, []);

  const selectedResident = residents.find((r) => r._id === selectedResidentId);

  if (loadingResidents) {
    return (
      <div className="rhp-loading">
        <Loader2 size={28} className="rhp-spin" />
        <span>Đang tải danh sách người thân...</span>
      </div>
    );
  }

  if (residentsError) {
    return (
      <div className="rhp-error-screen">
        <AlertCircle size={32} />
        <p>{residentsError}</p>
      </div>
    );
  }

  if (residents.length === 0) {
    return (
      <div className="rhp-error-screen">
        <AlertCircle size={32} />
        <p>Chưa có người thân nào được liên kết với tài khoản của bạn.</p>
      </div>
    );
  }

  return (
    <div className="rhp-page">
      <div className="rhp-header">
        <h1 className="rhp-header__title">Hồ Sơ Sức Khỏe Người Thân</h1>
        <p className="rhp-header__sub">Theo dõi chỉ số sức khỏe, sinh hoạt và lịch chăm sóc hàng ngày.</p>
      </div>

      {residents.length > 1 && (
        <div className="rhp-resident-selector">
          {residents.map((r) => (
            <button
              key={r._id}
              className={`rhp-resident-chip ${r._id === selectedResidentId ? 'rhp-resident-chip--active' : ''}`}
              onClick={() => setSelectedResidentId(r._id)}
            >
              {r.fullName}
            </button>
          ))}
        </div>
      )}

      {selectedResident && (
        <div className="rhp-resident-banner">
          <span className="rhp-resident-banner__name">{selectedResident.fullName}</span>
          <span className="rhp-resident-banner__code">Mã: {selectedResident.residentCode}</span>
        </div>
      )}

      <div className="rhp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`rhp-tab ${activeTab === tab.key ? 'rhp-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rhp-tab-content">
        {selectedResidentId && activeTab === 'vitals' && <VitalsTab residentId={selectedResidentId} />}
        {selectedResidentId && activeTab === 'history' && <HealthHistoryTab residentId={selectedResidentId} />}
        {selectedResidentId && activeTab === 'daily' && <DailyActivitiesTab residentId={selectedResidentId} />}
        {selectedResidentId && activeTab === 'schedule' && <CareScheduleTab residentId={selectedResidentId} />}
        {selectedResidentId && activeTab === 'medSchedule' && <DailyMedicationScheduleTab residentId={selectedResidentId} />}
        {selectedResidentId && activeTab === 'medHistory' && <MedicationHistoryTab residentId={selectedResidentId} />}
        {selectedResidentId && activeTab === 'careNotes' && <CareNotesTab residentId={selectedResidentId} />}
      </div>
    </div>
  );
}

/* ══════════════════════ TAB 1: VITALS ══════════════════════ */

const VITAL_FIELDS = [
  { key: 'bloodPressureSystolic', key2: 'bloodPressureDiastolic', icon: Gauge, label: 'Huyết áp', unit: 'mmHg', combine: true },
  { key: 'pulse', icon: Activity, label: 'Mạch', unit: 'lần/phút' },
  { key: 'temperatureCelsius', icon: Thermometer, label: 'Nhiệt độ', unit: '°C' },
  { key: 'oxygenSaturation', icon: Wind, label: 'SpO2', unit: '%' },
  { key: 'bloodSugar', icon: Droplet, label: 'Đường huyết', unit: 'mg/dL' },
  { key: 'weightKg', icon: Scale, label: 'Cân nặng', unit: 'kg' },
];

function VitalsTab({ residentId }) {
  const [vitals, setVitals] = useState(undefined); // undefined = loading, null = no data
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setVitals(undefined);
    setError(null);
    familyPortalService.getVitals(residentId)
      .then((data) => { if (!cancelled) setVitals(data || null); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || err.message || 'Không thể tải chỉ số sức khỏe'); });
    return () => { cancelled = true; };
  }, [residentId]);

  if (error) return <TabError message={error} />;
  if (vitals === undefined) return <TabLoading />;
  if (vitals === null) {
    return <TabEmpty message="Chưa có dữ liệu đo chỉ số sinh hiệu cho người thân của bạn." />;
  }

  return (
    <div className="rhp-vitals">
      <p className="rhp-vitals__measured-at">
        Đo lúc: <strong>{formatDateTime(vitals.measuredAt)}</strong>
        {vitals.abnormalFlag && <span className="rhp-badge rhp-badge--warning">Có chỉ số bất thường</span>}
      </p>
      <div className="rhp-vitals-grid">
        {VITAL_FIELDS.map((f) => {
          const value = f.combine
            ? (vitals[f.key] != null && vitals[f.key2] != null ? `${vitals[f.key]}/${vitals[f.key2]}` : null)
            : vitals[f.key];
          return (
            <div key={f.key} className="rhp-vital-card">
              <div className="rhp-vital-card__icon"><f.icon size={20} /></div>
              <div className="rhp-vital-card__body">
                <span className="rhp-vital-card__label">{f.label}</span>
                <span className="rhp-vital-card__value">
                  {value != null ? value : '—'} <span className="rhp-vital-card__unit">{value != null ? f.unit : ''}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {vitals.summary && (
        <div className="rhp-vitals__summary">
          <strong>Ghi chú của bác sĩ:</strong> {vitals.summary}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ TAB 2: HEALTH HISTORY ══════════════════════ */

function HealthHistoryTab({ residentId }) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setData(undefined);
    setError(null);
    familyPortalService.getHealthHistory(residentId, { search: search || undefined, page, limit: 10 })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Không thể tải lịch sử sức khỏe'));
  }, [residentId, search, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-history">
      <form className="rhp-search-bar" onSubmit={handleSearchSubmit}>
        <Search size={15} />
        <input
          type="text"
          placeholder="Tìm theo nội dung ghi chú sức khỏe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Tìm</button>
      </form>

      {data === undefined ? (
        <TabLoading />
      ) : data.data.length === 0 ? (
        <TabEmpty message="Không tìm thấy bản ghi sức khỏe nào." />
      ) : (
        <>
          <div className="rhp-history-list">
            {data.data.map((rec) => (
              <div key={rec._id} className="rhp-history-item">
                <div className="rhp-history-item__head">
                  <span className="rhp-history-item__date">{formatDateTime(rec.measuredAt)}</span>
                  {rec.abnormalFlag && <span className="rhp-badge rhp-badge--warning">Bất thường</span>}
                </div>
                <div className="rhp-history-item__vitals">
                  <span>Huyết áp: {rec.bloodPressureSystolic ?? '—'}/{rec.bloodPressureDiastolic ?? '—'} mmHg</span>
                  <span>Mạch: {rec.pulse ?? '—'} lần/phút</span>
                  <span>Nhiệt độ: {rec.temperatureCelsius ?? '—'} °C</span>
                  <span>SpO2: {rec.oxygenSaturation ?? '—'}%</span>
                </div>
                {rec.summary && <p className="rhp-history-item__summary">{rec.summary}</p>}
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/* ══════════════════════ TAB 3: DAILY ACTIVITIES ══════════════════════ */

function DailyActivitiesTab({ residentId }) {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    setData(undefined);
    setError(null);
    setExpanded(new Set());
    familyPortalService.getDailyActivities(residentId, { date })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Không thể tải nhật ký sinh hoạt'));
  }, [residentId, date]);

  const toggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-daily">
      <DatePickerBar date={date} onChange={setDate} />

      {data === undefined ? (
        <TabLoading />
      ) : (
        <div className="rhp-daily-sections">
          <DailySection
            sectionKey="task"
            title="Nhiệm vụ chăm sóc"
            items={data.careTasks}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(t) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(CARE_TASK_TYPE_LABELS, t.taskType)}</span>
                <span className="rhp-daily-item__meta">{t.scheduledTime} · {labelOf(CARE_TASK_STATUS_LABELS, t.status)}</span>
              </>
            )}
            renderDetail={(t) => (
              <>
                <DetailRow label="Cấp độ chăm sóc" value={labelOf(CARE_LEVEL_LABELS, t.careLevel)} />
                <DetailRow label="Thực hiện bởi" value={t.staffProfileId?.userId?.fullName} />
                <DetailRow label="Ghi chú" value={t.notes} />
              </>
            )}
          />
          <DailySection
            sectionKey="hygiene"
            title="Vệ sinh cá nhân"
            items={data.hygieneRecords}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(h) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(HYGIENE_ACTIVITY_LABELS, h.activityType)}</span>
                <span className="rhp-daily-item__meta">{labelOf(HYGIENE_COMPLETION_LABELS, h.completionStatus)}</span>
              </>
            )}
            renderDetail={(h) => (
              <>
                <DetailRow label="Nhóm" value={labelOf(HYGIENE_CATEGORY_LABELS, h.activityCategory)} />
                <DetailRow label="Ghi nhận lúc" value={formatDateTime(h.recordedAt)} />
                <DetailRow label="Ghi nhận bởi" value={h.recordedByStaffId?.userId?.fullName} />
                <DetailRow label="Ghi chú" value={h.notes} />
              </>
            )}
          />
          <DailySection
            sectionKey="meal"
            title="Bữa ăn"
            items={data.mealIntakeNotes}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(m) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(DAILY_MEAL_TYPE_LABELS, m.mealType)}</span>
                <span className="rhp-daily-item__meta">{labelOf(DAILY_INTAKE_STATUS_LABELS, m.intakeStatus)}{m.portionPercent != null ? ` · ${m.portionPercent}%` : ''}</span>
              </>
            )}
            renderDetail={(m) => (
              <>
                <DetailRow label="Món ăn" value={m.plannedMealName} />
                <DetailRow label="Ghi nhận lúc" value={formatDateTime(m.recordedAt)} />
                <DetailRow label="Ghi nhận bởi" value={m.recordedByStaffId?.userId?.fullName} />
                <DetailRow label="Ghi chú" value={m.notes} />
              </>
            )}
          />
          <DailySection
            sectionKey="behavior"
            title="Quan sát hành vi"
            items={data.behaviorRecords}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(b) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(BEHAVIOR_CATEGORY_LABELS, b.observationCategory)}</span>
                <span className="rhp-daily-item__meta">{formatDateTime(b.observedAt)}</span>
              </>
            )}
            renderDetail={(b) => (
              <>
                <DetailRow label="Tâm trạng" value={labelOf(MOOD_LEVEL_LABELS, b.moodLevel)} />
                <DetailRow label="Loại hành vi" value={labelOf(BEHAVIOR_TYPE_LABELS, b.behaviorType)} />
                <DetailRow label="Mức độ" value={labelOf(SEVERITY_LABELS, b.severity)} />
                <DetailRow label="Ghi nhận bởi" value={b.recordedByStaffId?.userId?.fullName} />
                <DetailRow label="Ghi chú" value={b.notes} />
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}

function DailySection({ sectionKey, title, items, expanded, onToggle, renderSummary, renderDetail }) {
  return (
    <div className="rhp-daily-section">
      <h4 className="rhp-daily-section__title">{title}</h4>
      {(!items || items.length === 0) ? (
        <p className="rhp-daily-section__empty">Chưa có ghi nhận</p>
      ) : (
        <div className="rhp-daily-section__list">
          {items.map((item, i) => {
            const key = `${sectionKey}:${item._id || i}`;
            const isOpen = expanded.has(key);
            return (
              <div key={key} className={`rhp-daily-item ${isOpen ? 'rhp-daily-item--open' : ''}`}>
                <button type="button" className="rhp-daily-item__summary" onClick={() => onToggle(key)}>
                  <span className="rhp-daily-item__summary-text">{renderSummary(item)}</span>
                  <ChevronDown size={14} className="rhp-daily-item__chevron" />
                </button>
                {isOpen && <div className="rhp-daily-item__detail">{renderDetail(item)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ TAB 4: CARE SCHEDULE ══════════════════════ */

function CareScheduleTab({ residentId }) {
  const [date, setDate] = useState(todayStr());
  const [days, setDays] = useState(undefined);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    setDays(undefined);
    setError(null);
    setExpanded(new Set());
    familyPortalService.getCareSchedule(residentId, { date })
      .then((res) => setDays(Array.isArray(res) ? res : []))
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Không thể tải lịch chăm sóc'));
  }, [residentId, date]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-schedule">
      <DatePickerBar date={date} onChange={setDate} />

      {days === undefined ? (
        <TabLoading />
      ) : days.length === 0 ? (
        <TabEmpty message="Chưa có lịch chăm sóc nào được công bố cho ngày này." />
      ) : (
        days.map((day) => (
          <div key={day._id} className="rhp-schedule-day">
            <h4 className="rhp-schedule-day__title">
              {day.title || 'Lịch chăm sóc'} — {formatDate(day.workDate)}
            </h4>
            {(!day.entries || day.entries.length === 0) ? (
              <p className="rhp-daily-section__empty">Chưa có mục nào cho người thân của bạn trong ngày này</p>
            ) : (
              <div className="rhp-schedule-entries">
                {day.entries.map((entry) => {
                  const isOpen = expanded.has(entry._id);
                  return (
                    <div key={entry._id} className={`rhp-schedule-entry-wrap ${isOpen ? 'rhp-schedule-entry-wrap--open' : ''}`}>
                      <button type="button" className="rhp-schedule-entry" onClick={() => toggle(entry._id)}>
                        <span className="rhp-schedule-entry__time">{entry.scheduledTime}</span>
                        <span className="rhp-schedule-entry__task">{labelOf(CARE_TASK_TYPE_LABELS, entry.taskType)}</span>
                        <span className="rhp-badge">{labelOf(CARE_LEVEL_LABELS, entry.careLevel)}</span>
                        <ChevronDown size={14} className="rhp-schedule-entry__chevron" />
                      </button>
                      {isOpen && (
                        <div className="rhp-schedule-entry__detail">
                          <DetailRow label="Thực hiện bởi" value={entry.staffProfileId?.userId?.fullName} />
                          <DetailRow label="Ghi chú" value={entry.notes} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ══════════════════════ TAB 5: DAILY MEDICATION SCHEDULE ══════════════════════ */

function DailyMedicationScheduleTab({ residentId }) {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(undefined);
    setError(null);
    familyPortalService.getDailyMedicationSchedule(residentId, { date })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Không thể tải lịch dùng thuốc'));
  }, [residentId, date]);

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-daily">
      <DatePickerBar date={date} onChange={setDate} />

      {data === undefined ? (
        <TabLoading />
      ) : !data.schedules || data.schedules.length === 0 ? (
        <TabEmpty message="Không có lịch dùng thuốc nào cho ngày này." />
      ) : (
        data.schedules.map((s) => (
          <div key={s.id} className="rhp-med-item">
            <div>
              <div className="rhp-med-item__name">{s.medicationName}</div>
              <div className="rhp-med-item__meta">
                {s.dosage} · {s.route || '—'} · {formatDateTime(s.scheduledTime)}
                {s.markedBy?.fullName && ` · ${s.markedBy.fullName}`}
              </div>
            </div>
            <span className={`rhp-badge rhp-badge--${MED_STATUS_VARIANT[s.status] || 'info'}`}>
              {MED_STATUS_LABELS[s.status] || s.status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

/* ══════════════════════ TAB 6: MEDICATION USAGE HISTORY ══════════════════════ */

function MedicationHistoryTab({ residentId }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setData(undefined);
    setError(null);
    familyPortalService.getMedicationHistory(residentId, { from: from || undefined, to: to || undefined })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Không thể tải lịch sử dùng thuốc'));
  }, [residentId, from, to]);

  useEffect(() => { load(); }, [load]);

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-history">
      <form className="rhp-search-bar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label style={{ fontSize: 13, color: '#475569' }}>Từ ngày</label>
        <input type="date" value={from} max={to || todayStr()} onChange={(e) => setFrom(e.target.value)} />
        <label style={{ fontSize: 13, color: '#475569' }}>Đến ngày</label>
        <input type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)} />
        <button type="submit">Lọc</button>
      </form>

      {data === undefined ? (
        <TabLoading />
      ) : (
        <>
          <div className="rhp-med-compliance">
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">{data.summary.total}</span>
              <span className="rhp-med-stat-card__label">Tổng số liều</span>
            </div>
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">{data.summary.taken}</span>
              <span className="rhp-med-stat-card__label">Đã uống</span>
            </div>
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">{data.summary.missed}</span>
              <span className="rhp-med-stat-card__label">Bỏ lỡ</span>
            </div>
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">
                {data.summary.complianceRate != null ? `${data.summary.complianceRate}%` : '—'}
              </span>
              <span className="rhp-med-stat-card__label">Tỷ lệ tuân thủ</span>
            </div>
          </div>

          {data.lowCompliance && (
            <p className="rhp-badge rhp-badge--warning" style={{ marginBottom: 12, marginLeft: 0 }}>
              Tỷ lệ tuân thủ dùng thuốc đang thấp hơn 80%
            </p>
          )}

          {data.records.length === 0 ? (
            <TabEmpty message="Không có bản ghi dùng thuốc nào trong khoảng thời gian này." />
          ) : (
            data.records.map((r) => (
              <div key={r._id} className="rhp-med-item">
                <div>
                  <div className="rhp-med-item__name">{r.medicationName}</div>
                  <div className="rhp-med-item__meta">
                    {r.dosage} · {r.route || '—'} · {formatDateTime(r.scheduledTime)}
                    {r.missedReason && ` · Lý do: ${r.missedReason}`}
                  </div>
                </div>
                <span className={`rhp-badge rhp-badge--${MED_STATUS_VARIANT[r.status] || 'info'}`}>
                  {MED_STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════ TAB 7: CARE NOTES ══════════════════════ */

function renderNoteMetadata(note) {
  const meta = note.metadata || {};
  const nt = note.noteType;

  if (nt === 'meal') {
    return (
      <>
        <DetailRow label="Bữa ăn" value={labelOf(NOTE_MEAL_TYPE_LABELS, meta.mealType)} />
        <DetailRow label="Lượng ăn" value={labelOf(NOTE_INTAKE_AMOUNT_LABELS, meta.intakeAmount)} />
        <DetailRow label="Khả năng ăn uống" value={labelOf(NOTE_APPETITE_LABELS, meta.appetite)} />
      </>
    );
  }
  if (nt === 'activity') {
    return (
      <>
        <DetailRow label="Loại hoạt động" value={labelOf(NOTE_ACTIVITY_TYPE_LABELS, meta.activityType)} />
        <DetailRow label="Thời lượng" value={meta.duration != null ? `${meta.duration} phút` : null} />
        <DetailRow label="Mức độ tham gia" value={labelOf(NOTE_PARTICIPATION_LABELS, meta.participationLevel)} />
        <DetailRow label="Tâm trạng" value={labelOf(NOTE_MOOD_LABELS, meta.mood)} />
      </>
    );
  }
  if (nt === 'daily_living') {
    return (
      <>
        <DetailRow label="Phân loại" value={labelOf(NOTE_DAILY_LIVING_TYPE_LABELS, meta.activityType)} />
        <DetailRow label="Mức độ trợ giúp" value={labelOf(NOTE_ASSISTANCE_LEVEL_LABELS, meta.assistanceLevel)} />
        <DetailRow label="Trạng thái" value={labelOf(NOTE_COMPLETION_STATUS_LABELS, meta.completionStatus)} />
        <DetailRow label="Thời lượng" value={meta.duration != null ? `${meta.duration} phút` : null} />
        <DetailRow label="Tâm trạng" value={labelOf(NOTE_MOOD_LABELS, meta.mood)} />
      </>
    );
  }
  if (nt === 'health') {
    return (
      <>
        {Array.isArray(meta.symptoms) && meta.symptoms.length > 0 && (
          <DetailRow label="Triệu chứng" value={meta.symptoms.join(', ')} />
        )}
        <DetailRow label="Trạng thái ý thức" value={labelOf(NOTE_CONSCIOUSNESS_LABELS, meta.consciousness)} />
        <DetailRow label="Nguy cơ té ngã" value={labelOf(NOTE_FALL_RISK_LABELS, meta.fallRisk)} />
        <DetailRow label="Mức độ đau" value={meta.painLevel != null ? `${meta.painLevel}/10` : null} />
        <DetailRow label="Nhiệt độ" value={meta.temperature != null ? `${meta.temperature}°C` : null} />
        <DetailRow label="Mạch" value={meta.pulse != null ? `${meta.pulse} bpm` : null} />
        <DetailRow label="Tình trạng da" value={meta.skinCondition} />
        <DetailRow label="Thay đổi thể chất" value={meta.physicalChanges} />
        <DetailRow label="Quan sát bổ sung" value={meta.observations} />
      </>
    );
  }
  return null;
}

function CareNotesTab({ residentId }) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [noteType, setNoteType] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(new Set());

  const load = useCallback(() => {
    setData(undefined);
    setError(null);
    familyPortalService.getCareNotes(residentId, {
      search: search || undefined,
      noteType: noteType || undefined,
      page,
      limit: 10,
    })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Không thể tải ghi chú chăm sóc'));
  }, [residentId, search, noteType, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleTypeFilter = (type) => {
    setNoteType(type);
    setPage(1);
  };

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-history">
      <form className="rhp-search-bar" onSubmit={handleSearchSubmit}>
        <Search size={15} />
        <input
          type="text"
          placeholder="Tìm theo nội dung ghi chú chăm sóc..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Tìm</button>
      </form>

      <div className="rhp-type-filter">
        <button
          className={`rhp-type-chip ${noteType === '' ? 'rhp-type-chip--active' : ''}`}
          onClick={() => handleTypeFilter('')}
        >
          Tất cả
        </button>
        {Object.entries(CARE_NOTE_TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`rhp-type-chip ${noteType === key ? 'rhp-type-chip--active' : ''}`}
            onClick={() => handleTypeFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {data === undefined ? (
        <TabLoading />
      ) : data.data.length === 0 ? (
        <TabEmpty message="Không tìm thấy ghi chú chăm sóc nào." />
      ) : (
        <>
          <div className="rhp-history-list">
            {data.data.map((note) => {
              const metaContent = renderNoteMetadata(note);
              const isOpen = expanded.has(note._id);
              return (
                <div
                  key={note._id}
                  className={`rhp-history-item ${metaContent ? 'rhp-history-item--clickable' : ''} ${isOpen ? 'rhp-history-item--open' : ''}`}
                  onClick={metaContent ? () => toggle(note._id) : undefined}
                  role={metaContent ? 'button' : undefined}
                  tabIndex={metaContent ? 0 : undefined}
                  onKeyDown={metaContent ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(note._id); } } : undefined}
                >
                  <div className="rhp-history-item__head">
                    <span className={`rhp-badge rhp-badge--${CARE_NOTE_TYPE_VARIANT[note.noteType] || 'info'}`}>
                      {CARE_NOTE_TYPE_LABELS[note.noteType] || note.noteType}
                    </span>
                    <span className="rhp-history-item__date" style={{ marginLeft: 8 }}>
                      {formatDateTime(note.noteAt)}
                    </span>
                    {metaContent && <ChevronDown size={14} className="rhp-history-item__chevron" />}
                  </div>
                  <p className="rhp-history-item__summary" style={{ fontStyle: 'normal', color: '#1e293b' }}>
                    {note.content}
                  </p>
                  <span className="rhp-med-item__meta">
                    Ghi nhận bởi: {note.authorStaffId?.userId?.fullName || '—'}
                  </span>
                  {isOpen && metaContent && (
                    <div className="rhp-history-item__detail" onClick={(e) => e.stopPropagation()}>
                      {metaContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/* ══════════════════════ Shared helpers ══════════════════════ */

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="rhp-detail-row">
      <span className="rhp-detail-row__label">{label}:</span>
      <span className="rhp-detail-row__value">{value}</span>
    </div>
  );
}

function DatePickerBar({ date, onChange }) {
  return (
    <div className="rhp-date-bar">
      <label>Chọn ngày:</label>
      <input type="date" value={date} onChange={(e) => onChange(e.target.value)} max={todayStr()} />
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="rhp-pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={14} /></button>
      <span>Trang {page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={14} /></button>
    </div>
  );
}

function TabLoading() {
  return (
    <div className="rhp-tab-loading">
      <Loader2 size={22} className="rhp-spin" />
      <span>Đang tải...</span>
    </div>
  );
}

function TabError({ message }) {
  return (
    <div className="rhp-tab-error">
      <AlertCircle size={22} />
      <span>{message}</span>
    </div>
  );
}

function TabEmpty({ message }) {
  return (
    <div className="rhp-tab-empty">
      <span>{message}</span>
    </div>
  );
}
