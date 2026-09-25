import React from 'react';

const ACTIVITY_CATEGORY_OPTIONS = [
  { value: 'Giải trí', i18nKey: 'adminActivities.catEntertainment' },
  { value: 'Thể dục', i18nKey: 'adminActivities.catExercise' },
  { value: 'Nghệ thuật', i18nKey: 'adminActivities.catArt' },
  { value: 'Giáo dục', i18nKey: 'adminActivities.catEducation' },
  { value: 'Xã hội', i18nKey: 'adminActivities.catSocial' },
  { value: 'Tâm linh', i18nKey: 'adminActivities.catSpiritual' },
  { value: 'Y tế', i18nKey: 'adminActivities.catMedical' },
  { value: 'Khác', i18nKey: 'adminActivities.catOther' },
];

const STATUS_OPTIONS = [
  { value: 'draft', i18nKey: 'adminActivities.statusDraft' },
  { value: 'scheduled', i18nKey: 'adminActivities.statusScheduled' },
  { value: 'ongoing', i18nKey: 'adminActivities.statusOngoing' },
  { value: 'completed', i18nKey: 'adminActivities.statusCompleted' },
  { value: 'cancelled', i18nKey: 'adminActivities.statusCancelled' },
];

export default function BulkEditActivityModal({
  bulkEditActivity,
  bulkEditForm,
  setBulkEditForm,
  bulkEditError,
  bulkSubmitting,
  bulkSubmit,
  onClose,
  t,
  staffOptions,
  residents,
  isActivityStaff,
}) {
  if (!bulkEditActivity) return null;
  const seriesId = bulkEditActivity.seriesId || bulkEditActivity._id;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 className="modal__title" style={{ margin: 0 }}>{t('adminActivities.bulkEditTitle')}</h2>
          <button type="button" className="adm-btn-refresh" onClick={onClose} style={{ border: 'none' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p className="form-hint" style={{ marginBottom: '16px' }}>
          {t('adminActivities.bulkEditDescription', { title: typeof bulkEditActivity.title === 'string' ? bulkEditActivity.title : '', seriesId: typeof seriesId === 'string' || typeof seriesId === 'number' ? seriesId.toString() : '' })}
        </p>
        {typeof bulkEditError === 'string' && <p className="form-error" style={{ marginBottom: '12px' }}>{bulkEditError}</p>}
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>{t('adminActivities.fieldTitle')}</label>
            <input type="text" className="adm-filter-input"
              style={{ width: '100%', maxWidth: 'none' }}
              value={bulkEditForm.title}
              onChange={(e) => setBulkEditForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>{t('adminActivities.fieldCategory')}</label>
            <select className="adm-filter-select" value={bulkEditForm.category}
              onChange={(e) => setBulkEditForm((p) => ({ ...p, category: e.target.value, categoryOther: e.target.value === 'Khác' ? p.categoryOther : '' }))}>
              <option value="">{t('adminActivities.fieldCategoryPlaceholder')}</option>
              {ACTIVITY_CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{t(item.i18nKey)}</option>
              ))}
            </select>
            {bulkEditForm.category === 'Khác' && (
              <input type="text" className="adm-filter-input" style={{ marginTop: '8px' }} value={bulkEditForm.categoryOther}
                onChange={(e) => setBulkEditForm((p) => ({ ...p, categoryOther: e.target.value }))}
                placeholder={t('adminActivities.fieldCategoryOtherPlaceholder')} />
            )}
          </div>
          <div className="form-group">
            <label>{t('adminActivities.fieldLocation')}</label>
            <input type="text" className="adm-filter-input"
              style={{ width: '100%', maxWidth: 'none' }}
              value={bulkEditForm.location}
              onChange={(e) => setBulkEditForm((p) => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>{t('adminActivities.fieldStatus')}</label>
            <select className="adm-filter-select" value={bulkEditForm.status}
              onChange={(e) => setBulkEditForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="">{t('adminActivities.bulkKeepStatus')}</option>
              {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>{t(o.i18nKey)}</option>
              ))}
            </select>
          </div>
          <div className="form-group form-grid--full">
            <label>{t('adminActivities.fieldOrganizerStaff')}</label>
            <div className="adm-participant-picker">
              {staffOptions.filter(isActivityStaff).map((staff) => {
                const checked = bulkEditForm.organizerStaffIds.includes(staff._id);
                return (
                  <label key={staff._id} className={`adm-participant-option${checked ? ' selected' : ''}`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => {
                        const cur = bulkEditForm.organizerStaffIds;
                        setBulkEditForm((p) => ({
                          ...p,
                          organizerStaffIds: checked ? cur.filter((id) => id !== staff._id) : [...cur, staff._id],
                        }));
                      }} style={{ width: 16, height: 16 }} />
                    <span>{staff.fullName || staff.email || t('adminActivities.staffFallback')} {staff.role ? `(${staff.role})` : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="form-group form-grid--full">
            <label>{t('adminActivities.fieldSupportStaff')}</label>
            <div className="adm-participant-picker">
              {staffOptions.filter(isActivityStaff).filter((staff) => !bulkEditForm.organizerStaffIds.includes(staff._id)).map((staff) => {
                const checked = bulkEditForm.supportStaffIds.includes(staff._id);
                return (
                  <label key={staff._id} className={`adm-participant-option${checked ? ' selected' : ''}`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => {
                        const cur = bulkEditForm.supportStaffIds;
                        setBulkEditForm((p) => ({
                          ...p,
                          supportStaffIds: checked ? cur.filter((id) => id !== staff._id) : [...cur, staff._id],
                        }));
                      }} style={{ width: 16, height: 16 }} />
                    <span>{staff.fullName || staff.email || t('adminActivities.staffFallback')} {staff.role ? `(${staff.role})` : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="form-group form-grid--full">
            <label>{t('adminActivities.fieldParticipants')}</label>
            <div className="adm-participant-picker">
              {residents.map((r) => {
                const checked = bulkEditForm.participantResidentIds.includes(r._id);
                return (
                  <label key={r._id} className={`adm-participant-option${checked ? ' selected' : ''}`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => {
                        const cur = bulkEditForm.participantResidentIds;
                        setBulkEditForm((p) => ({
                          ...p,
                          participantResidentIds: checked ? cur.filter((id) => id !== r._id) : [...cur, r._id],
                        }));
                      }} style={{ width: 16, height: 16 }} />
                    <span>{r.fullName || r.residentCode || t('adminActivities.residentFallback')}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>{t('adminActivities.cancel')}</button>
          <button type="button" className="btn-save" onClick={bulkSubmit} disabled={bulkSubmitting}>
            {bulkSubmitting ? t('adminActivities.saving') : t('adminActivities.bulkSave')}
          </button>
        </div>
      </div>
    </div>
  );
}
