import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '../../../../utils/nutritionLabels';
import { rehabSessionTypeLabel } from '../../../../utils/rehabLabels';

function RehabScheduleDetailModal({ open, loading, detail, workDate, onClose }) {
  const { t, i18n } = useTranslation();
  const ns = 'caregiver.rehabSchedule.detailModal';
  const c = 'caregiver.common';

  if (!open) return null;

  const resident = detail?.resident;
  const schedule = detail?.schedule;
  const sessions = schedule?.sessions || [];

  return (
    <div className="rehab-schedule-page__modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="rehab-schedule-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rehab-schedule-page__modal-header">
          <h3 className="rehab-schedule-page__modal-title">
            {t(`${ns}.title`, { name: resident?.fullName || '...' })}
          </h3>
          <button type="button" className="rehab-schedule-page__modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>
        <div className="rehab-schedule-page__modal-body">
          {loading && <p>{t(`${c}.loadingDetail`)}</p>}
          {!loading && detail && (
            <>
              <p className="rehab-schedule-page__day-banner">
                <strong>{t(`${c}.dayLabel`)}:</strong> {formatLocaleDate(workDate, i18n.language)} ·{' '}
                <strong>{t(`${c}.codeLabel`)}:</strong> {resident?.residentCode || '—'}
                {schedule?.planTitle ? ` · ${schedule.planTitle}` : ''}
              </p>

              {(resident?.allergies?.length > 0 || resident?.chronicConditions?.length > 0) && (
                <p className="rehab-schedule-page__session-meta" style={{ marginBottom: 12 }}>
                  {resident.allergies?.length > 0 && (
                    <>
                      <strong>{t(`${ns}.allergies`)}:</strong> {resident.allergies.join(', ')}
                    </>
                  )}
                  {resident.chronicConditions?.length > 0 && (
                    <>
                      {resident.allergies?.length > 0 ? ' · ' : ''}
                      <strong>{t(`${ns}.chronicConditions`)}:</strong>{' '}
                      {resident.chronicConditions.join(', ')}
                    </>
                  )}
                </p>
              )}

              {!sessions.length && <p className="rehab-schedule-page__empty">{t(`${ns}.noSessions`)}</p>}

              {sessions.map((s, idx) => (
                <div key={`${s.scheduledTime}-${s.sessionType}-${idx}`} className="rehab-schedule-page__session-card">
                  <strong>
                    {s.scheduledTime} — {rehabSessionTypeLabel(s.sessionType, t)}
                    {s.sessionTitle ? `: ${s.sessionTitle}` : ''}
                  </strong>
                  <p className="rehab-schedule-page__session-meta">
                    {s.location ? `${t(`${ns}.location`)}: ${s.location}` : ''}
                    {s.durationMinutes
                      ? ` · ${t(`${ns}.minutes`, { count: s.durationMinutes })}`
                      : ''}
                    {s.leadStaffName ? ` · ${s.leadStaffName}` : ''}
                  </p>
                  {s.therapyGoals && (
                    <p className="rehab-schedule-page__session-meta">
                      <strong>{t(`${ns}.goals`)}:</strong> {s.therapyGoals}
                    </p>
                  )}
                  {s.caregiverAssistNote && (
                    <p className="rehab-schedule-page__assist-note">
                      <strong>{t(`${ns}.caregiverAssist`)}:</strong> {s.caregiverAssistNote}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RehabScheduleDetailModal;
