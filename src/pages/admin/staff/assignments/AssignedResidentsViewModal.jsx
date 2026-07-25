import { useTranslation } from 'react-i18next';
import { formatAssignedResidentRoom, roleLabel } from './assignmentHelpers';

export default function AssignedResidentsViewModal({ staff, onClose }) {
  const { t } = useTranslation();

  if (!staff) return null;

  const residents = staff.staffProfile?.assignedResidentIds || [];

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal assigned-residents-view-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="assigned-residents-view-title"
      >
        <div className="assigned-residents-view-modal__header">
          <div>
            <h2 id="assigned-residents-view-title" className="modal__title">
              {t('admin.staff.assignments.residents.viewDetailTitle', { name: staff.fullName })}
            </h2>
            <div className="assigned-residents-view-modal__meta">
              <span className={`role-badge role-badge--${staff.role}`}>
                {roleLabel(t, staff.role)}
              </span>
              {residents.length > 0 && (
                <span className="assigned-residents-view-modal__count">
                  {t('admin.staff.assignments.residents.detailCount', { count: residents.length })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="assigned-residents-view-modal__body">
          {residents.length === 0 ? (
            <p className="empty-state">{t('admin.staff.assignments.residents.detailEmpty')}</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table assigned-residents-view-modal__table">
                <thead>
                  <tr>
                    <th>{t('admin.staff.assignments.residents.detailColName')}</th>
                    <th>{t('admin.staff.assignments.residents.detailColCode')}</th>
                    <th>{t('admin.staff.assignments.residents.detailColRoom')}</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r) => {
                    const id = typeof r === 'object' ? r._id : r;
                    const roomLabel = formatAssignedResidentRoom(r, t);
                    return (
                      <tr key={id}>
                        <td>
                          {r.fullName || t('admin.staff.assignments.residents.defaultResidentLabel')}
                        </td>
                        <td>{r.residentCode || '—'}</td>
                        <td>{roomLabel || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal__actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
