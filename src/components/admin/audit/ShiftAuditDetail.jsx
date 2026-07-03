import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toVNDateString } from '../../../utils/dateUtils';
import '../../../styles/admin/ShiftManagementPage.css';

const SHIFT_AUDIT_ACTIONS = new Set(['UPDATE_SHIFT', 'CANCEL_SHIFT']);

export const isShiftAuditLog = (log) =>
  Boolean(log && (SHIFT_AUDIT_ACTIONS.has(log.action) || log.businessModule === 'Shift' || log.module === 'Shift'));

const FIELD_CONFIG = {
  workDate: { labelKey: 'fields.workDate', valueKey: 'workDate', format: 'date' },
  assignedStaffId: { labelKey: 'fields.staffName', valueKey: 'staffName', format: 'text' },
  shiftTemplateId: { labelKey: 'fields.shiftTemplate', valueKey: 'name', format: 'text' },
  startTime: { labelKey: 'fields.startTime', valueKey: 'startTime', format: 'text' },
  endTime: { labelKey: 'fields.endTime', valueKey: 'endTime', format: 'text' },
  status: { labelKey: 'fields.status', valueKey: 'status', format: 'status' },
  name: { labelKey: 'fields.name', valueKey: 'name', format: 'text' },
  totalHours: { labelKey: 'fields.totalHours', valueKey: 'totalHours', format: 'text' },
};

export const formatShiftFieldLabel = (field, t) => {
  const config = FIELD_CONFIG[field];
  if (config) {
    return t(`admin.auditLogs.shiftDetail.${config.labelKey}`, field);
  }
  return field;
};

export const formatShiftAuditDescription = (log, t) => {
  if (!isShiftAuditLog(log)) return log.description || '—';

  const target = log.targetName || '—';

  if (log.action === 'UPDATE_SHIFT') {
    const fields = log.metadata?.fieldsChanged || [];
    const labels = [...new Set(
      fields
        .filter((field) => field !== '_id' && FIELD_CONFIG[field])
        .map((field) => formatShiftFieldLabel(field, t))
    )];
    if (labels.length > 0) {
      return t('admin.auditLogs.shiftDetail.descriptionUpdate', {
        target,
        fields: labels.join(', '),
      });
    }
    return t('admin.auditLogs.shiftDetail.descriptionUpdateNoFields', { target });
  }

  if (log.action === 'CANCEL_SHIFT') {
    const reason = log.metadata?.reason;
    if (reason) {
      return t('admin.auditLogs.shiftDetail.descriptionCancel', { target, reason });
    }
    return t('admin.auditLogs.shiftDetail.descriptionCancelNoReason', { target });
  }

  return log.description || '—';
};

const formatDateDisplay = (value, locale) => {
  const vn = toVNDateString(value);
  if (!vn) return '—';
  const [y, m, d] = vn.split('-');
  if (locale === 'en') return `${m}/${d}/${y}`;
  return `${d}/${m}/${y}`;
};

const getFieldValue = (snapshot, field, format, locale) => {
  if (!snapshot) return '—';
  const config = FIELD_CONFIG[field] || { valueKey: field, format: 'text' };
  const raw = snapshot[config.valueKey ?? field];
  if (raw === undefined || raw === null || raw === '') return '—';
  if (config.format === 'date' || format === 'date') return formatDateDisplay(raw, locale);
  return String(raw);
};

const collectChangedFields = (beforeData, afterData, fieldsChanged) => {
  if (Array.isArray(fieldsChanged) && fieldsChanged.length > 0) {
    return fieldsChanged;
  }
  if (!beforeData || !afterData) return [];
  const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
  return [...keys].filter((key) => {
    if (key === '_id') return false;
    return JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key]);
  });
};

function ShiftStatusBadge({ status, t }) {
  if (!status) return '—';
  const label = t(`admin.staff.shifts.shiftStatus.${status}`, status);
  return (
    <span className={`status-badge status-badge--shift-${status}`}>
      {label}
    </span>
  );
}

export default function ShiftAuditDetail({ log }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const beforeData = log.beforeData || null;
  const afterData = log.afterData || null;
  const snapshot = afterData || beforeData;
  const isCancel = log.action === 'CANCEL_SHIFT';
  const isUpdate = log.action === 'UPDATE_SHIFT';

  const diffRows = useMemo(() => {
    const fields = collectChangedFields(beforeData, afterData, log.metadata?.fieldsChanged);
    return fields
      .filter((field) => FIELD_CONFIG[field] || field !== '_id')
      .map((field) => {
        const config = FIELD_CONFIG[field] || { labelKey: field, valueKey: field, format: 'text' };
        const beforeVal = getFieldValue(beforeData, field, config.format, locale);
        const afterVal = getFieldValue(afterData, field, config.format, locale);
        return {
          field,
          label: t(`admin.auditLogs.shiftDetail.${config.labelKey}`, field),
          beforeVal,
          afterVal,
          beforeRaw: beforeData?.[config.valueKey ?? field],
          afterRaw: afterData?.[config.valueKey ?? field],
          format: config.format,
          changed: beforeVal !== afterVal,
        };
      });
  }, [beforeData, afterData, log.metadata?.fieldsChanged, locale, t]);

  if (!snapshot) return <p>—</p>;

  const workDate = formatDateDisplay(snapshot.workDate, locale);
  const timeRange =
    snapshot.startTime && snapshot.endTime
      ? `${snapshot.startTime} – ${snapshot.endTime}`
      : '—';

  return (
    <div className="audit-shift-detail">
      <h3 className="audit-shift-detail__title">
        {t('admin.auditLogs.shiftDetail.summaryTitle')}
      </h3>

      <div className="audit-shift-detail__summary">
        <div className="audit-shift-detail__summary-item">
          <span className="audit-shift-detail__label">{t('admin.auditLogs.shiftDetail.fields.name')}</span>
          <span className="audit-shift-detail__value">{snapshot.name || '—'}</span>
        </div>
        <div className="audit-shift-detail__summary-item">
          <span className="audit-shift-detail__label">{t('admin.auditLogs.shiftDetail.fields.workDate')}</span>
          <span className="audit-shift-detail__value">{workDate}</span>
        </div>
        <div className="audit-shift-detail__summary-item">
          <span className="audit-shift-detail__label">{t('admin.auditLogs.shiftDetail.timeRange')}</span>
          <span className="audit-shift-detail__value">{timeRange}</span>
        </div>
        <div className="audit-shift-detail__summary-item">
          <span className="audit-shift-detail__label">{t('admin.auditLogs.shiftDetail.fields.staffName')}</span>
          <span className="audit-shift-detail__value">{snapshot.staffName || '—'}</span>
        </div>
        <div className="audit-shift-detail__summary-item">
          <span className="audit-shift-detail__label">{t('admin.auditLogs.shiftDetail.fields.status')}</span>
          <span className="audit-shift-detail__value">
            <ShiftStatusBadge status={snapshot.status} t={t} />
          </span>
        </div>
      </div>

      {isCancel && (
        <div className="audit-shift-cancel">
          <strong>{t('admin.auditLogs.shiftDetail.cancelledTitle')}</strong>
          {log.metadata?.reason && (
            <p>
              <span className="audit-shift-detail__label">{t('admin.auditLogs.shiftDetail.cancelReason')}: </span>
              {log.metadata.reason}
            </p>
          )}
          <div className="audit-shift-cancel__status">
            <ShiftStatusBadge status={log.metadata?.previousStatus || beforeData?.status} t={t} />
            <span className="audit-shift-cancel__arrow">→</span>
            <ShiftStatusBadge status="cancelled" t={t} />
          </div>
        </div>
      )}

      {isUpdate && diffRows.length > 0 && (
        <div className="audit-shift-diff-wrap">
          <h4 className="audit-shift-diff__title">{t('admin.auditLogs.shiftDetail.changesTitle')}</h4>
          <table className="audit-shift-diff">
            <thead>
              <tr>
                <th>{t('admin.auditLogs.shiftDetail.fieldLabel')}</th>
                <th>{t('admin.auditLogs.shiftDetail.before')}</th>
                <th>{t('admin.auditLogs.shiftDetail.after')}</th>
              </tr>
            </thead>
            <tbody>
              {diffRows.map((row) => (
                <tr
                  key={row.field}
                  className={row.changed ? 'audit-shift-diff__row--changed' : undefined}
                >
                  <td>{row.label}</td>
                  <td>
                    {row.format === 'status' ? (
                      <ShiftStatusBadge status={row.beforeRaw} t={t} />
                    ) : (
                      row.beforeVal
                    )}
                  </td>
                  <td>
                    {row.format === 'status' ? (
                      <ShiftStatusBadge status={row.afterRaw} t={t} />
                    ) : (
                      row.afterVal
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isUpdate && log.metadata?.changeReason && (
        <div className="audit-shift-reason">
          <strong>{t('admin.auditLogs.shiftDetail.changeReason')}</strong>
          <p>{log.metadata.changeReason}</p>
        </div>
      )}
    </div>
  );
}
