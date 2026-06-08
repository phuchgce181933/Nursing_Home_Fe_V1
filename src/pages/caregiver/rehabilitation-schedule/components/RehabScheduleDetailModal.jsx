import { formatVNDate } from '../../../../utils/nutritionLabels';
import { rehabSessionTypeLabel } from '../../../../utils/rehabLabels';

function RehabScheduleDetailModal({ open, loading, detail, workDate, onClose }) {
  if (!open) return null;

  const resident = detail?.resident;
  const schedule = detail?.schedule;
  const sessions = schedule?.sessions || [];

  return (
    <div className="rehab-schedule-page__modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="rehab-schedule-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rehab-schedule-page__modal-header">
          <h3 className="rehab-schedule-page__modal-title">
            Lịch phục hồi — {resident?.fullName || '...'}
          </h3>
          <button type="button" className="rehab-schedule-page__modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>
        <div className="rehab-schedule-page__modal-body">
          {loading && <p>Đang tải chi tiết...</p>}
          {!loading && detail && (
            <>
              <p className="rehab-schedule-page__day-banner">
                <strong>Ngày:</strong> {formatVNDate(workDate)} · <strong>Mã:</strong>{' '}
                {resident?.residentCode || '—'}
                {schedule?.planTitle ? ` · ${schedule.planTitle}` : ''}
              </p>

              {(resident?.allergies?.length > 0 || resident?.chronicConditions?.length > 0) && (
                <p className="rehab-schedule-page__session-meta" style={{ marginBottom: 12 }}>
                  {resident.allergies?.length > 0 && (
                    <>
                      <strong>Dị ứng:</strong> {resident.allergies.join(', ')}
                    </>
                  )}
                  {resident.chronicConditions?.length > 0 && (
                    <>
                      {resident.allergies?.length > 0 ? ' · ' : ''}
                      <strong>Bệnh nền:</strong> {resident.chronicConditions.join(', ')}
                    </>
                  )}
                </p>
              )}

              {!sessions.length && (
                <p className="rehab-schedule-page__empty">
                  Chưa có buổi phục hồi publish cho cư dân này trong ngày.
                </p>
              )}

              {sessions.map((s, idx) => (
                <div key={`${s.scheduledTime}-${s.sessionType}-${idx}`} className="rehab-schedule-page__session-card">
                  <strong>
                    {s.scheduledTime} — {rehabSessionTypeLabel(s.sessionType)}
                    {s.sessionTitle ? `: ${s.sessionTitle}` : ''}
                  </strong>
                  <p className="rehab-schedule-page__session-meta">
                    {s.location ? `Địa điểm: ${s.location}` : ''}
                    {s.durationMinutes ? ` · ${s.durationMinutes} phút` : ''}
                    {s.leadStaffName ? ` · ${s.leadStaffName}` : ''}
                  </p>
                  {s.therapyGoals && (
                    <p className="rehab-schedule-page__session-meta">
                      <strong>Mục tiêu:</strong> {s.therapyGoals}
                    </p>
                  )}
                  {s.caregiverAssistNote && (
                    <p className="rehab-schedule-page__assist-note">
                      <strong>Hỗ trợ Caregiver:</strong> {s.caregiverAssistNote}
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
