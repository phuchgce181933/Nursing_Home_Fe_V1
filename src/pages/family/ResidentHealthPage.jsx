import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse, History, ClipboardList, CalendarDays,
  Search, Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown,
  Thermometer, Activity, Droplet, Wind, Scale, Gauge, Pill, CalendarClock, FileText,
} from 'lucide-react';
import residentService from '../../services/resident.service';
import familyPortalService from '../../services/familyPortal.service';
import '../../styles/family/ResidentHealthPage.css';

const TAB_KEYS = [
  { key: 'vitals', i18nKey: 'residentHealth.tabs.vitals', icon: HeartPulse },
  { key: 'history', i18nKey: 'residentHealth.tabs.history', icon: History },
  { key: 'daily', i18nKey: 'residentHealth.tabs.daily', icon: ClipboardList },
  { key: 'schedule', i18nKey: 'residentHealth.tabs.schedule', icon: CalendarDays },
  { key: 'medSchedule', i18nKey: 'residentHealth.tabs.medSchedule', icon: CalendarClock },
  { key: 'medHistory', i18nKey: 'residentHealth.tabs.medHistory', icon: Pill },
  { key: 'careNotes', i18nKey: 'residentHealth.tabs.careNotes', icon: FileText },
];

const CARE_NOTE_TYPE_LABELS = {
  meal: 'residentHealth.careNoteTypes.meal',
  activity: 'residentHealth.careNoteTypes.activity',
  daily_living: 'residentHealth.careNoteTypes.daily_living',
  health: 'residentHealth.careNoteTypes.health',
  general: 'residentHealth.careNoteTypes.general',
};

const CARE_NOTE_TYPE_VARIANT = {
  meal: 'info',
  activity: 'success',
  daily_living: 'info',
  health: 'danger',
  general: '',
};

const MED_STATUS_LABELS = {
  PENDING: 'residentHealth.medStatus.pending',
  TAKEN: 'residentHealth.medStatus.taken',
  LATE_TAKEN: 'residentHealth.medStatus.lateTaken',
  MISSED: 'residentHealth.medStatus.missed',
  SKIPPED: 'residentHealth.medStatus.skipped',
  OVERDUE: 'residentHealth.medStatus.overdue',
  REFUSED: 'residentHealth.medStatus.refused',
  HELD: 'residentHealth.medStatus.held',
  NOT_AVAILABLE: 'residentHealth.medStatus.notAvailable',
  DISCONTINUED: 'residentHealth.medStatus.discontinued',
};

const MED_STATUS_VARIANT = {
  TAKEN: 'success',
  LATE_TAKEN: 'info',
  PENDING: 'info',
  MISSED: 'danger',
  SKIPPED: 'danger',
  OVERDUE: 'danger',
  REFUSED: 'danger',
  HELD: 'warning',
  NOT_AVAILABLE: 'warning',
  DISCONTINUED: 'secondary',
};

// ── Daily activities / care schedule label maps (i18n keys) ──
const CARE_TASK_TYPE_LABELS = {
  morning_care: 'residentHealth.careTask.morningCare',
  medication: 'residentHealth.careTask.medication',
  physical_therapy: 'residentHealth.careTask.physicalTherapy',
  meal_assistance: 'residentHealth.careTask.mealAssistance',
  evening_check: 'residentHealth.careTask.eveningCheck',
  emergency_response: 'residentHealth.careTask.emergencyResponse',
};
const CARE_LEVEL_LABELS = { low: 'residentHealth.careLevel.low', medium: 'residentHealth.careLevel.medium', high: 'residentHealth.careLevel.high' };
const CARE_TASK_STATUS_LABELS = {
  pending: 'residentHealth.taskStatus.pending',
  in_progress: 'residentHealth.taskStatus.inProgress',
  completed: 'residentHealth.taskStatus.completed',
  skipped: 'residentHealth.taskStatus.skipped',
  missed: 'residentHealth.taskStatus.missed',
};

const HYGIENE_CATEGORY_LABELS = { personal: 'residentHealth.hygieneCategory.personal', environment: 'residentHealth.hygieneCategory.environment' };
const HYGIENE_ACTIVITY_LABELS = {
  bathing: 'residentHealth.hygieneActivity.bathing',
  oral_care: 'residentHealth.hygieneActivity.oralCare',
  grooming: 'residentHealth.hygieneActivity.grooming',
  toileting: 'residentHealth.hygieneActivity.toileting',
  diaper_change: 'residentHealth.hygieneActivity.diaperChange',
  room_tidy: 'residentHealth.hygieneActivity.roomTidy',
  bathroom_clean: 'residentHealth.hygieneActivity.bathroomClean',
  linen_change: 'residentHealth.hygieneActivity.linenChange',
  laundry: 'residentHealth.hygieneActivity.laundry',
};
const HYGIENE_COMPLETION_LABELS = {
  completed: 'residentHealth.hygieneCompletion.completed',
  partial: 'residentHealth.hygieneCompletion.partial',
  refused: 'residentHealth.hygieneCompletion.refused',
  assisted: 'residentHealth.hygieneCompletion.assisted',
};

const DAILY_MEAL_TYPE_LABELS = { breakfast: 'residentHealth.mealType.breakfast', lunch: 'residentHealth.mealType.lunch', dinner: 'residentHealth.mealType.dinner' };
const DAILY_INTAKE_STATUS_LABELS = { full: 'residentHealth.intakeStatus.full', partial: 'residentHealth.intakeStatus.partial', refused: 'residentHealth.intakeStatus.refused', assisted: 'residentHealth.intakeStatus.assisted' };

const BEHAVIOR_CATEGORY_LABELS = { mood: 'residentHealth.behaviorCategory.mood', behavior: 'residentHealth.behaviorCategory.behavior', abnormal: 'residentHealth.behaviorCategory.abnormal' };
const MOOD_LEVEL_LABELS = {
  calm: 'residentHealth.mood.calm', happy: 'residentHealth.mood.happy', neutral: 'residentHealth.mood.neutral', anxious: 'residentHealth.mood.anxious',
  sad: 'residentHealth.mood.sad', agitated: 'residentHealth.mood.agitated', confused: 'residentHealth.mood.confused', irritable: 'residentHealth.mood.irritable',
};
const BEHAVIOR_TYPE_LABELS = {
  cooperative: 'residentHealth.behavior.cooperative', withdrawn: 'residentHealth.behavior.withdrawn', restless: 'residentHealth.behavior.restless', wandering: 'residentHealth.behavior.wandering',
  verbal_outburst: 'residentHealth.behavior.verbalOutburst', physical_resistance: 'residentHealth.behavior.physicalResistance',
  sleep_disturbance: 'residentHealth.behavior.sleepDisturbance', appetite_change: 'residentHealth.behavior.appetiteChange',
  social_withdrawal: 'residentHealth.behavior.socialWithdrawal', repetitive_behavior: 'residentHealth.behavior.repetitiveBehavior', other: 'residentHealth.behavior.other',
};
const SEVERITY_LABELS = { normal: 'residentHealth.severity.normal', mild: 'residentHealth.severity.mild', moderate: 'residentHealth.severity.moderate', urgent: 'residentHealth.severity.urgent' };

// ── Care note metadata label maps (i18n keys) ──
const NOTE_MEAL_TYPE_LABELS = { breakfast: 'residentHealth.noteMealType.breakfast', lunch: 'residentHealth.noteMealType.lunch', dinner: 'residentHealth.noteMealType.dinner', snack: 'residentHealth.noteMealType.snack' };
const NOTE_INTAKE_AMOUNT_LABELS = { none: 'residentHealth.noteIntake.none', little: 'residentHealth.noteIntake.little', half: 'residentHealth.noteIntake.half', most: 'residentHealth.noteIntake.most', all: 'residentHealth.noteIntake.all' };
const NOTE_APPETITE_LABELS = { poor: 'residentHealth.noteAppetite.poor', fair: 'residentHealth.noteAppetite.fair', good: 'residentHealth.noteAppetite.good', excellent: 'residentHealth.noteAppetite.excellent' };
const NOTE_ACTIVITY_TYPE_LABELS = {
  walking: 'residentHealth.noteActivity.walking', exercise: 'residentHealth.noteActivity.exercise', physiotherapy: 'residentHealth.noteActivity.physiotherapy', reading: 'residentHealth.noteActivity.reading',
  socializing: 'residentHealth.noteActivity.socializing', entertainment: 'residentHealth.noteActivity.entertainment', other: 'residentHealth.noteActivity.other',
};
const NOTE_PARTICIPATION_LABELS = { refused: 'residentHealth.noteParticipation.refused', assisted: 'residentHealth.noteParticipation.assisted', supervised: 'residentHealth.noteParticipation.supervised', independent: 'residentHealth.noteParticipation.independent' };
const NOTE_MOOD_LABELS = { happy: 'residentHealth.noteMood.happy', neutral: 'residentHealth.noteMood.neutral', sad: 'residentHealth.noteMood.sad', agitated: 'residentHealth.noteMood.agitated', anxious: 'residentHealth.noteMood.anxious' };
const NOTE_DAILY_LIVING_TYPE_LABELS = {
  bathing: 'residentHealth.noteDailyLiving.bathing', grooming: 'residentHealth.noteDailyLiving.grooming', dressing: 'residentHealth.noteDailyLiving.dressing', eating: 'residentHealth.noteDailyLiving.eating',
  mobility: 'residentHealth.noteDailyLiving.mobility', toileting: 'residentHealth.noteDailyLiving.toileting', sleeping: 'residentHealth.noteDailyLiving.sleeping', other: 'residentHealth.noteDailyLiving.other',
};
const NOTE_ASSISTANCE_LEVEL_LABELS = { independent: 'residentHealth.noteAssistance.independent', supervised: 'residentHealth.noteAssistance.supervised', assisted: 'residentHealth.noteAssistance.assisted', total_care: 'residentHealth.noteAssistance.totalCare' };
const NOTE_COMPLETION_STATUS_LABELS = { completed: 'residentHealth.noteCompletion.completed', partial: 'residentHealth.noteCompletion.partial', refused: 'residentHealth.noteCompletion.refused' };
const NOTE_CONSCIOUSNESS_LABELS = { alert: 'residentHealth.noteConsciousness.alert', confused: 'residentHealth.noteConsciousness.confused', drowsy: 'residentHealth.noteConsciousness.drowsy', unresponsive: 'residentHealth.noteConsciousness.unresponsive' };
const NOTE_FALL_RISK_LABELS = { low: 'residentHealth.noteFallRisk.low', medium: 'residentHealth.noteFallRisk.medium', high: 'residentHealth.noteFallRisk.high' };

const labelOf = (t, map, value) => (value ? (map[value] ? t(map[value]) : value) : '—');

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
  const { t } = useTranslation();
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
        setResidentsError(err?.response?.data?.message || err.message || t('residentHealth.loadError'));
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
        <span>{t('residentHealth.loading')}</span>
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
        <p>{t('residentHealth.noResidents')}</p>
      </div>
    );
  }

  return (
    <div className="rhp-page">
      <div className="rhp-header">
        <h1 className="rhp-header__title">{t('residentHealth.title')}</h1>
        <p className="rhp-header__sub">{t('residentHealth.subtitle')}</p>
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
          <span className="rhp-resident-banner__code">{t('residentHealth.residentCode', { code: selectedResident.residentCode })}</span>
        </div>
      )}

      <div className="rhp-tabs">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.key}
            className={`rhp-tab ${activeTab === tab.key ? 'rhp-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            {t(tab.i18nKey)}
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
  { key: 'bloodPressureSystolic', key2: 'bloodPressureDiastolic', icon: Gauge, i18nKey: 'residentHealth.vitals.bp', unit: 'mmHg', combine: true },
  { key: 'pulse', icon: Activity, i18nKey: 'residentHealth.vitals.pulse', unit: 'bpm' },
  { key: 'temperatureCelsius', icon: Thermometer, i18nKey: 'residentHealth.vitals.temperature', unit: '°C' },
  { key: 'oxygenSaturation', icon: Wind, i18nKey: 'residentHealth.vitals.spo2', unit: '%' },
  { key: 'bloodSugar', icon: Droplet, i18nKey: 'residentHealth.vitals.bloodSugar', unit: 'mg/dL' },
  { key: 'weightKg', icon: Scale, i18nKey: 'residentHealth.vitals.weight', unit: 'kg' },
];

function VitalsTab({ residentId }) {
  const { t } = useTranslation();
  const [vitals, setVitals] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setVitals(undefined);
    setError(null);
    familyPortalService.getVitals(residentId)
      .then((data) => { if (!cancelled) setVitals(data || null); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || err.message || t('residentHealth.vitals.error')); });
    return () => { cancelled = true; };
  }, [residentId]);

  if (error) return <TabError message={error} />;
  if (vitals === undefined) return <TabLoading />;
  if (vitals === null) {
    return <TabEmpty message={t('residentHealth.vitals.empty')} />;
  }

  return (
    <div className="rhp-vitals">
      <p className="rhp-vitals__measured-at">
        {t('residentHealth.vitals.measuredAt')} <strong>{formatDateTime(vitals.measuredAt)}</strong>
        {vitals.abnormalFlag && <span className="rhp-badge rhp-badge--warning">{t('residentHealth.vitals.abnormal')}</span>}
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
                <span className="rhp-vital-card__label">{t(f.i18nKey)}</span>
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
          <strong>{t('residentHealth.vitals.doctorNote')}</strong> {vitals.summary}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ TAB 2: HEALTH HISTORY ══════════════════════ */

function HealthHistoryTab({ residentId }) {
  const { t } = useTranslation();
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setData(undefined);
    setError(null);
    familyPortalService.getHealthHistory(residentId, { search: search || undefined, page, limit: 10 })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || t('residentHealth.history.error')));
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
          placeholder={t('residentHealth.history.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">{t('residentHealth.history.search')}</button>
      </form>

      {data === undefined ? (
        <TabLoading />
      ) : data.data.length === 0 ? (
        <TabEmpty message={t('residentHealth.history.empty')} />
      ) : (
        <>
          <div className="rhp-history-list">
            {data.data.map((rec) => (
              <div key={rec._id} className="rhp-history-item">
                <div className="rhp-history-item__head">
                  <span className="rhp-history-item__date">{formatDateTime(rec.measuredAt)}</span>
                  {rec.abnormalFlag && <span className="rhp-badge rhp-badge--warning">{t('residentHealth.history.abnormal')}</span>}
                </div>
                <div className="rhp-history-item__vitals">
                  <span>{t('residentHealth.history.bp')}: {rec.bloodPressureSystolic ?? '—'}/{rec.bloodPressureDiastolic ?? '—'} mmHg</span>
                  <span>{t('residentHealth.history.pulse')}: {rec.pulse ?? '—'} bpm</span>
                  <span>{t('residentHealth.history.temperature')}: {rec.temperatureCelsius ?? '—'} °C</span>
                  <span>{t('residentHealth.history.spo2')}: {rec.oxygenSaturation ?? '—'}%</span>
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
  const { t } = useTranslation();
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
      .catch((err) => setError(err?.response?.data?.message || err.message || t('residentHealth.daily.error')));
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
            title={t('residentHealth.daily.careTasks')}
            items={data.careTasks}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(item) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(t, CARE_TASK_TYPE_LABELS, item.taskType)}</span>
                <span className="rhp-daily-item__meta">{item.scheduledTime} · {labelOf(t, CARE_TASK_STATUS_LABELS, item.status)}</span>
              </>
            )}
            renderDetail={(item) => (
              <>
                <DetailRow label={t('residentHealth.labels.careLevel')} value={labelOf(t, CARE_LEVEL_LABELS, item.careLevel)} />
                <DetailRow label={t('residentHealth.labels.performedBy')} value={item.staffProfileId?.userId?.fullName} />
                <DetailRow label={t('residentHealth.labels.notes')} value={item.notes} />
              </>
            )}
          />
          <DailySection
            sectionKey="hygiene"
            title={t('residentHealth.daily.hygiene')}
            items={data.hygieneRecords}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(h) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(t, HYGIENE_ACTIVITY_LABELS, h.activityType)}</span>
                <span className="rhp-daily-item__meta">{labelOf(t, HYGIENE_COMPLETION_LABELS, h.completionStatus)}</span>
              </>
            )}
            renderDetail={(h) => (
              <>
                <DetailRow label={t('residentHealth.labels.group')} value={labelOf(t, HYGIENE_CATEGORY_LABELS, h.activityCategory)} />
                <DetailRow label={t('residentHealth.labels.recordedAt')} value={formatDateTime(h.recordedAt)} />
                <DetailRow label={t('residentHealth.labels.recordedBy')} value={h.recordedByStaffId?.userId?.fullName} />
                <DetailRow label={t('residentHealth.labels.notes')} value={h.notes} />
              </>
            )}
          />
          <DailySection
            sectionKey="meal"
            title={t('residentHealth.daily.meals')}
            items={data.mealIntakeNotes}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(m) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(t, DAILY_MEAL_TYPE_LABELS, m.mealType)}</span>
                <span className="rhp-daily-item__meta">{labelOf(t, DAILY_INTAKE_STATUS_LABELS, m.intakeStatus)}{m.portionPercent != null ? ` · ${m.portionPercent}%` : ''}</span>
              </>
            )}
            renderDetail={(m) => (
              <>
                <DetailRow label={t('residentHealth.labels.dish')} value={m.plannedMealName} />
                <DetailRow label={t('residentHealth.labels.recordedAt')} value={formatDateTime(m.recordedAt)} />
                <DetailRow label={t('residentHealth.labels.recordedBy')} value={m.recordedByStaffId?.userId?.fullName} />
                <DetailRow label={t('residentHealth.labels.notes')} value={m.notes} />
              </>
            )}
          />
          <DailySection
            sectionKey="behavior"
            title={t('residentHealth.daily.behavior')}
            items={data.behaviorRecords}
            expanded={expanded}
            onToggle={toggle}
            renderSummary={(b) => (
              <>
                <span className="rhp-daily-item__title">{labelOf(t, BEHAVIOR_CATEGORY_LABELS, b.observationCategory)}</span>
                <span className="rhp-daily-item__meta">{formatDateTime(b.observedAt)}</span>
              </>
            )}
            renderDetail={(b) => (
              <>
                <DetailRow label={t('residentHealth.noteDetail.mood')} value={labelOf(t, MOOD_LEVEL_LABELS, b.moodLevel)} />
                <DetailRow label={t('residentHealth.noteDetail.activityType')} value={labelOf(t, BEHAVIOR_TYPE_LABELS, b.behaviorType)} />
                <DetailRow label={t('residentHealth.noteDetail.status')} value={labelOf(t, SEVERITY_LABELS, b.severity)} />
                <DetailRow label={t('residentHealth.labels.recordedBy')} value={b.recordedByStaffId?.userId?.fullName} />
                <DetailRow label={t('residentHealth.labels.notes')} value={b.notes} />
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}

function DailySection({ sectionKey, title, items, expanded, onToggle, renderSummary, renderDetail }) {
  const { t } = useTranslation();
  return (
    <div className="rhp-daily-section">
      <h4 className="rhp-daily-section__title">{title}</h4>
      {(!items || items.length === 0) ? (
        <p className="rhp-daily-section__empty">{t('residentHealth.daily.noRecords')}</p>
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
  const { t } = useTranslation();
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
      .catch((err) => setError(err?.response?.data?.message || err.message || t('residentHealth.schedule.error')));
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
        <TabEmpty message={t('residentHealth.schedule.empty')} />
      ) : (
        days.map((day) => (
          <div key={day._id} className="rhp-schedule-day">
            <h4 className="rhp-schedule-day__title">
              {day.title || t('residentHealth.schedule.defaultTitle')} — {formatDate(day.workDate)}
            </h4>
            {(!day.entries || day.entries.length === 0) ? (
              <p className="rhp-daily-section__empty">{t('residentHealth.schedule.noEntries')}</p>
            ) : (
              <div className="rhp-schedule-entries">
                {day.entries.map((entry) => {
                  const isOpen = expanded.has(entry._id);
                  return (
                    <div key={entry._id} className={`rhp-schedule-entry-wrap ${isOpen ? 'rhp-schedule-entry-wrap--open' : ''}`}>
                      <button type="button" className="rhp-schedule-entry" onClick={() => toggle(entry._id)}>
                        <span className="rhp-schedule-entry__time">{entry.scheduledTime}</span>
                        <span className="rhp-schedule-entry__task">{labelOf(t, CARE_TASK_TYPE_LABELS, entry.taskType)}</span>
                        <span className="rhp-badge">{labelOf(t, CARE_LEVEL_LABELS, entry.careLevel)}</span>
                        <ChevronDown size={14} className="rhp-schedule-entry__chevron" />
                      </button>
                      {isOpen && (
                        <div className="rhp-schedule-entry__detail">
                          <DetailRow label={t('residentHealth.labels.performedBy')} value={entry.staffProfileId?.userId?.fullName} />
                          <DetailRow label={t('residentHealth.labels.notes')} value={entry.notes} />
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
  const { t } = useTranslation();
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(undefined);
    setError(null);
    familyPortalService.getDailyMedicationSchedule(residentId, { date })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || t('residentHealth.medSchedule.error')));
  }, [residentId, date]);

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-daily">
      <DatePickerBar date={date} onChange={setDate} />

      {data === undefined ? (
        <TabLoading />
      ) : !data.schedules || data.schedules.length === 0 ? (
        <TabEmpty message={t('residentHealth.medSchedule.empty')} />
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
              {MED_STATUS_LABELS[s.status] ? t(MED_STATUS_LABELS[s.status]) : s.status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

/* ══════════════════════ TAB 6: MEDICATION USAGE HISTORY ══════════════════════ */

function MedicationHistoryTab({ residentId }) {
  const { t } = useTranslation();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setData(undefined);
    setError(null);
    familyPortalService.getMedicationHistory(residentId, { from: from || undefined, to: to || undefined })
      .then((res) => setData(res))
      .catch((err) => setError(err?.response?.data?.message || err.message || t('residentHealth.medHistory.error')));
  }, [residentId, from, to]);

  useEffect(() => { load(); }, [load]);

  if (error) return <TabError message={error} />;

  return (
    <div className="rhp-history">
      <form className="rhp-search-bar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label style={{ fontSize: 13, color: '#475569' }}>{t('residentHealth.medHistory.fromDate')}</label>
        <input type="date" value={from} max={to || todayStr()} onChange={(e) => setFrom(e.target.value)} />
        <label style={{ fontSize: 13, color: '#475569' }}>{t('residentHealth.medHistory.toDate')}</label>
        <input type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)} />
        <button type="submit">{t('residentHealth.medHistory.filter')}</button>
      </form>

      {data === undefined ? (
        <TabLoading />
      ) : (
        <>
          <div className="rhp-med-compliance">
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">{data.summary.total}</span>
              <span className="rhp-med-stat-card__label">{t('residentHealth.medHistory.totalDoses')}</span>
            </div>
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">{data.summary.taken}</span>
              <span className="rhp-med-stat-card__label">{t('residentHealth.medHistory.taken')}</span>
            </div>
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">{data.summary.missed}</span>
              <span className="rhp-med-stat-card__label">{t('residentHealth.medHistory.missed')}</span>
            </div>
            <div className="rhp-med-stat-card">
              <span className="rhp-med-stat-card__value">
                {data.summary.complianceRate != null ? `${data.summary.complianceRate}%` : '—'}
              </span>
              <span className="rhp-med-stat-card__label">{t('residentHealth.medHistory.complianceRate')}</span>
            </div>
          </div>

          {data.lowCompliance && (
            <p className="rhp-badge rhp-badge--warning" style={{ marginBottom: 12, marginLeft: 0 }}>
              {t('residentHealth.medHistory.lowCompliance')}
            </p>
          )}

          {data.records.length === 0 ? (
            <TabEmpty message={t('residentHealth.medHistory.empty')} />
          ) : (
            data.records.map((r) => (
              <div key={r._id} className="rhp-med-item">
                <div>
                  <div className="rhp-med-item__name">{r.medicationName}</div>
                  <div className="rhp-med-item__meta">
                    {r.dosage} · {r.route || '—'} · {formatDateTime(r.scheduledTime)}
                    {r.missedReason && ` · ${t('residentHealth.medHistory.reason', { reason: r.missedReason })}`}
                  </div>
                </div>
                <span className={`rhp-badge rhp-badge--${MED_STATUS_VARIANT[r.status] || 'info'}`}>
                  {MED_STATUS_LABELS[r.status] ? t(MED_STATUS_LABELS[r.status]) : r.status}
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

function renderNoteMetadata(note, t) {
  const meta = note.metadata || {};
  const nt = note.noteType;

  if (nt === 'meal') {
    return (
      <>
        <DetailRow label={t('residentHealth.noteDetail.mealType')} value={labelOf(t, NOTE_MEAL_TYPE_LABELS, meta.mealType)} />
        <DetailRow label={t('residentHealth.noteDetail.intakeAmount')} value={labelOf(t, NOTE_INTAKE_AMOUNT_LABELS, meta.intakeAmount)} />
        <DetailRow label={t('residentHealth.noteDetail.appetite')} value={labelOf(t, NOTE_APPETITE_LABELS, meta.appetite)} />
      </>
    );
  }
  if (nt === 'activity') {
    return (
      <>
        <DetailRow label={t('residentHealth.noteDetail.activityType')} value={labelOf(t, NOTE_ACTIVITY_TYPE_LABELS, meta.activityType)} />
        <DetailRow label={t('residentHealth.noteDetail.duration')} value={meta.duration != null ? t('residentHealth.noteDetail.durationMin', { min: meta.duration }) : null} />
        <DetailRow label={t('residentHealth.noteDetail.participationLevel')} value={labelOf(t, NOTE_PARTICIPATION_LABELS, meta.participationLevel)} />
        <DetailRow label={t('residentHealth.noteDetail.mood')} value={labelOf(t, NOTE_MOOD_LABELS, meta.mood)} />
      </>
    );
  }
  if (nt === 'daily_living') {
    return (
      <>
        <DetailRow label={t('residentHealth.noteDetail.category')} value={labelOf(t, NOTE_DAILY_LIVING_TYPE_LABELS, meta.activityType)} />
        <DetailRow label={t('residentHealth.noteDetail.assistanceLevel')} value={labelOf(t, NOTE_ASSISTANCE_LEVEL_LABELS, meta.assistanceLevel)} />
        <DetailRow label={t('residentHealth.noteDetail.status')} value={labelOf(t, NOTE_COMPLETION_STATUS_LABELS, meta.completionStatus)} />
        <DetailRow label={t('residentHealth.noteDetail.duration')} value={meta.duration != null ? t('residentHealth.noteDetail.durationMin', { min: meta.duration }) : null} />
        <DetailRow label={t('residentHealth.noteDetail.mood')} value={labelOf(t, NOTE_MOOD_LABELS, meta.mood)} />
      </>
    );
  }
  if (nt === 'health') {
    return (
      <>
        {Array.isArray(meta.symptoms) && meta.symptoms.length > 0 && (
          <DetailRow label={t('residentHealth.noteDetail.symptoms')} value={meta.symptoms.join(', ')} />
        )}
        <DetailRow label={t('residentHealth.noteDetail.consciousness')} value={labelOf(t, NOTE_CONSCIOUSNESS_LABELS, meta.consciousness)} />
        <DetailRow label={t('residentHealth.noteDetail.fallRisk')} value={labelOf(t, NOTE_FALL_RISK_LABELS, meta.fallRisk)} />
        <DetailRow label={t('residentHealth.noteDetail.painLevel')} value={meta.painLevel != null ? t('residentHealth.noteDetail.painValue', { level: meta.painLevel }) : null} />
        <DetailRow label={t('residentHealth.noteDetail.temperature')} value={meta.temperature != null ? t('residentHealth.noteDetail.temperatureValue', { temp: meta.temperature }) : null} />
        <DetailRow label={t('residentHealth.noteDetail.pulse')} value={meta.pulse != null ? t('residentHealth.noteDetail.pulseValue', { pulse: meta.pulse }) : null} />
        <DetailRow label={t('residentHealth.noteDetail.skinCondition')} value={meta.skinCondition} />
        <DetailRow label={t('residentHealth.noteDetail.physicalChanges')} value={meta.physicalChanges} />
        <DetailRow label={t('residentHealth.noteDetail.observations')} value={meta.observations} />
      </>
    );
  }
  return null;
}

function CareNotesTab({ residentId }) {
  const { t } = useTranslation();
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
      .catch((err) => setError(err?.response?.data?.message || err.message || t('residentHealth.careNotes.error')));
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
          placeholder={t('residentHealth.careNotes.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">{t('residentHealth.careNotes.search')}</button>
      </form>

      <div className="rhp-type-filter">
        <button
          className={`rhp-type-chip ${noteType === '' ? 'rhp-type-chip--active' : ''}`}
          onClick={() => handleTypeFilter('')}
        >
          {t('residentHealth.careNotes.all')}
        </button>
        {Object.entries(CARE_NOTE_TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`rhp-type-chip ${noteType === key ? 'rhp-type-chip--active' : ''}`}
            onClick={() => handleTypeFilter(key)}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {data === undefined ? (
        <TabLoading />
      ) : data.data.length === 0 ? (
        <TabEmpty message={t('residentHealth.careNotes.empty')} />
      ) : (
        <>
          <div className="rhp-history-list">
            {data.data.map((note) => {
              const metaContent = renderNoteMetadata(note, t);
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
                      {CARE_NOTE_TYPE_LABELS[note.noteType] ? t(CARE_NOTE_TYPE_LABELS[note.noteType]) : note.noteType}
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
                    {t('residentHealth.careNotes.recordedBy')} {note.authorStaffId?.userId?.fullName || '—'}
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
  const { t } = useTranslation();
  return (
    <div className="rhp-date-bar">
      <label>{t('residentHealth.common.selectDate')}</label>
      <input type="date" value={date} onChange={(e) => onChange(e.target.value)} max={todayStr()} />
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="rhp-pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={14} /></button>
      <span>{t('residentHealth.common.page', { current: page, total: totalPages })}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={14} /></button>
    </div>
  );
}

function TabLoading() {
  const { t } = useTranslation();
  return (
    <div className="rhp-tab-loading">
      <Loader2 size={22} className="rhp-spin" />
      <span>{t('residentHealth.common.loading')}</span>
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
