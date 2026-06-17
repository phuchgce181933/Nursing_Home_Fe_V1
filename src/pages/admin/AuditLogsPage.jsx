import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw } from 'lucide-react';
import AdminPageShell from '../../components/admin/AdminPageShell';
import auditLogService from '../../services/auditLog.service';
import ListPagination from '../../components/ui/ListPagination';
import '../../styles/admin/AuditLogsPage.css';

const BUSINESS_MODULE_LABELS = {
  admission: 'Tiếp nhận cư dân',
  billing: 'Kế toán',
  health: 'Y tế',
  pharmacy: 'Dược',
  facility: 'Cơ sở',
  resident: 'Cư dân',
  servicePackage: 'Gói dịch vụ',
  servicepackage: 'Gói dịch vụ',
  careAppointment: 'Cuộc hẹn chăm sóc',
  facilityTour: 'Tham quan cơ sở',
  CareNote: 'Ghi chú chăm sóc',
  careNote: 'Ghi chú chăm sóc',
  activity: 'Hoạt động',
  incident: 'Sự cố',
  billingPayment: 'Thanh toán',
  billingInvoice: 'Hóa đơn',
  pharmacyMedication: 'Thuốc',
  pharmacySupplier: 'Nhà cung ứng',
};

const ROLE_LABELS = {
  doctor: 'Bác sĩ',
  nurse: 'Y tá',
  caregiver: 'Hộ lý',
  pharmacist: 'Dược sĩ',
  family: 'Gia đình',
  manager: 'Quản lý',
  admin: 'Admin',
  staff: 'Nhân viên',
};

const TARGET_ENTITY_LABELS = {
  Admission: 'Yêu cầu nhập viện',
  Resident: 'Cư dân',
  Invoice: 'Hóa đơn',
  Payment: 'Thanh toán',
  Medication: 'Thuốc',
  Supplier: 'Nhà cung ứng',
  ServicePackage: 'Gói dịch vụ',
  FacilityTour: 'Tour cơ sở',
  CareAppointment: 'Cuộc hẹn chăm sóc',
  CareNote: 'Ghi chú chăm sóc',
  Activity: 'Hoạt động',
  Incident: 'Sự cố',
  Building: 'Tòa nhà',
  Floor: 'Tầng',
  Room: 'Phòng',
  Bed: 'Giường',
  Equipment: 'Thiết bị',
  MedicalRecord: 'Hồ sơ y tế',
  MedicationDispense: 'Phát thuốc',
  Prescription: 'Đơn thuốc',
  Health: 'Y tế',
  Pharmacy: 'Dược',
  Servicepackage: 'Gói dịch vụ',
};

const formatDateTime = (value, locale) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const truncateText = (text, length = 60) => {
  if (!text) return '—';
  return text.length > length ? `${text.slice(0, length)}...` : text;
};

const humanizeAction = (value) => {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatActionLabel = (actionKey, displayAction, t) => {
  if (!actionKey && !displayAction) return '—';
  const translationKey = actionKey ? `admin.auditLogs.actionNames.${actionKey}` : null;
  const translated = translationKey ? t(translationKey) : null;
  if (translated && translated !== translationKey) {
    return translated;
  }
  return displayAction || humanizeAction(actionKey);
};

const formatBusinessModuleLabel = (moduleValue, t) => {
  if (!moduleValue) return '—';
  return BUSINESS_MODULE_LABELS[moduleValue] || moduleValue;
};

const formatRoleLabel = (roleValue) => {
  if (!roleValue) return '—';
  return ROLE_LABELS[roleValue] || roleValue;
};

const formatTargetLabel = (targetName, targetEntityType) => {
  if (targetName && targetName !== targetEntityType) {
    return targetName;
  }
  if (!targetEntityType) return '—';
  return TARGET_ENTITY_LABELS[targetEntityType] || targetEntityType;
};

export default function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [businessModule, setBusinessModule] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hideTechnical, setHideTechnical] = useState(true);
  const [filterOptions, setFilterOptions] = useState({ actions: [], businessModules: [], roles: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      action: action || undefined,
      businessModule: businessModule || undefined,
      actorRole: actorRole || undefined,
      fromDate: from || undefined,
      toDate: to || undefined,
      hideTechnical: hideTechnical || undefined,
    }),
    [page, limit, search, action, businessModule, actorRole, from, to, hideTechnical]
  );

  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await auditLogService.getAuditLogFilters({ hideTechnical });
      setFilterOptions({
        actions: options.actions || [],
        businessModules: options.businessModules || [],
        roles: options.roles || [],
      });
    } catch (err) {
      console.error('Load audit log filter options failed:', err);
    }
  }, [hideTechnical]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await auditLogService.getAuditLogs(filters);
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (!data.data || data.data.length === 0) {
        setSelectedLog(null);
      }
    } catch (err) {
      console.error('Load audit logs failed:', err);
      setError(err.response?.data?.message || t('admin.auditLogs.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setAction('');
    setBusinessModule('');
    setActorRole('');
    setFrom('');
    setTo('');
    setHideTechnical(true);
    setPage(1);
  };

  const handleRowClick = (log) => {
    setSelectedLog((current) => (current?._id === log._id ? null : log));
  };

  return (
    <AdminPageShell
      title={t('admin.auditLogs.title')}
      subtitle={t('admin.auditLogs.subtitle')}
    >
      <div className="audit-logs-page">
        <div className="audit-logs-page__toolbar">
          <form className="audit-logs-page__filters" onSubmit={handleSearchSubmit}>
            <div className="audit-logs-page__filter-item">
              <label>{t('admin.auditLogs.search')}</label>
              <div className="audit-logs-page__input-with-icon">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.auditLogs.searchPlaceholder')}
                />
              </div>
            </div>
            <div className="audit-logs-page__filter-item">
              <label>{t('admin.auditLogs.action')}</label>
              <input
                list="audit-action-options"
                value={action}
                onChange={(event) => setAction(event.target.value)}
                placeholder={t('admin.auditLogs.actionPlaceholder')}
              />
              <datalist id="audit-action-options">
                {filterOptions.actions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div className="audit-logs-page__filter-item">
              <label>{t('admin.auditLogs.businessModule')}</label>
              <select value={businessModule} onChange={(event) => setBusinessModule(event.target.value)}>
                <option value="">{t('admin.auditLogs.selectBusinessModule')}</option>
                {filterOptions.businessModules.length > 0 ? (
                  filterOptions.businessModules.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    {t('admin.auditLogs.noOptions')}
                  </option>
                )}
              </select>
            </div>
            <div className="audit-logs-page__filter-item">
              <label>{t('admin.auditLogs.role')}</label>
              <input
                list="audit-role-options"
                value={actorRole}
                onChange={(event) => setActorRole(event.target.value)}
                placeholder={t('admin.auditLogs.rolePlaceholder')}
              />
              <datalist id="audit-role-options">
                {filterOptions.roles.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div className="audit-logs-page__filter-item audit-logs-page__filter-checkbox">
              <label>{t('admin.auditLogs.hideTechnicalLabel')}</label>
              <div className="audit-logs-page__checkbox-row">
                <input
                  type="checkbox"
                  checked={hideTechnical}
                  onChange={(event) => setHideTechnical(event.target.checked)}
                />
                <span>{t('admin.auditLogs.hideTechnicalHelp')}</span>
              </div>
            </div>
            <div className="audit-logs-page__filter-item">
              <label>{t('admin.auditLogs.fromDate')}</label>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="audit-logs-page__filter-item">
              <label>{t('admin.auditLogs.toDate')}</label>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div className="audit-logs-page__filter-actions">
              <button type="submit" className="button button--primary" disabled={loading}>
                {t('admin.auditLogs.apply')}
              </button>
              <button type="button" className="button button--secondary" onClick={handleResetFilters} disabled={loading}>
                {t('admin.auditLogs.reset')}
              </button>
            </div>
          </form>

          <div className="audit-logs-page__actions">
            <button type="button" className="button button--secondary" onClick={loadLogs} disabled={loading}>
              <RefreshCw size={16} /> {t('admin.auditLogs.refresh')}
            </button>
          </div>
        </div>

        {error && <div className="audit-logs-page__alert">{error}</div>}

        <div className="audit-logs-page__table-card">
          <div className="audit-logs-page__table-wrapper">
            <table className="audit-logs-table">
              <thead>
                <tr>
                  <th>{t('admin.auditLogs.timestamp')}</th>
                  <th>{t('admin.auditLogs.displayAction')}</th>
                  <th>{t('admin.auditLogs.businessModule')}</th>
                  <th>{t('admin.auditLogs.performedBy')}</th>
                  <th>{t('admin.auditLogs.role')}</th>
                  <th>{t('admin.auditLogs.targetName')}</th>
                  <th>{t('admin.auditLogs.description')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log._id} className={selectedLog?._id === log._id ? 'selected' : ''} onClick={() => handleRowClick(log)}>
                          <td>{formatDateTime(log.createdAt, i18n.language === 'en' ? 'en-US' : 'vi-VN')}</td>
                      <td>{formatActionLabel(log.action, log.displayAction, t)}</td>
                      <td>{formatBusinessModuleLabel(log.businessModule || log.module, t)}</td>
                      <td>{log.performedBy || log.actorUserId || '—'}</td>
                      <td>{formatRoleLabel(log.performedByRole || log.actorRole)}</td>
                      <td>{formatTargetLabel(log.targetName, log.targetEntityType)}</td>
                      <td>{truncateText(log.description || log.afterData?.summary || log.action)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="audit-logs-page__empty-row">
                      {loading ? t('admin.auditLogs.loading') : t('admin.auditLogs.noResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ListPagination page={page} totalPages={totalPages} onPageChange={(nextPage) => setPage(nextPage)} total={total} hideWhenSinglePage={false} />
        </div>

        {selectedLog && (
          <section className="audit-logs-page__details">
            <div className="audit-logs-page__details-header">
              <h2>{t('admin.auditLogs.details')}</h2>
            </div>
            <div className="audit-logs-page__details-grid">
              <div>
                <strong>{t('admin.auditLogs.timestamp')}</strong>
                <p>{formatDateTime(selectedLog.createdAt, i18n.language === 'en' ? 'en-US' : 'vi-VN')}</p>
              </div>
              <div>
                <strong>{t('admin.auditLogs.displayAction')}</strong>
                <p>{formatActionLabel(selectedLog.action, selectedLog.displayAction, t)}</p>
              </div>
              <div>
                <strong>{t('admin.auditLogs.businessModule')}</strong>
                <p>{formatBusinessModuleLabel(selectedLog.businessModule || selectedLog.module, t)}</p>
              </div>
              <div>
                <strong>{t('admin.auditLogs.performedBy')}</strong>
                <p>{selectedLog.performedBy || selectedLog.actorUserId || '—'}</p>
              </div>
              <div>
                <strong>{t('admin.auditLogs.role')}</strong>
                <p>{formatRoleLabel(selectedLog.performedByRole || selectedLog.actorRole)}</p>
              </div>
              <div>
                <strong>{t('admin.auditLogs.targetName')}</strong>
                <p>{formatTargetLabel(selectedLog.targetName, selectedLog.targetEntityType)}</p>
              </div>
              <div>
                <strong>{t('admin.auditLogs.description')}</strong>
                <p>{selectedLog.description || '—'}</p>
              </div>
              <div className="audit-logs-page__details-section">
                <strong>{t('admin.auditLogs.businessDetails')}</strong>
                <pre>{selectedLog.afterData ? JSON.stringify(selectedLog.afterData, null, 2) : '—'}</pre>
              </div>
              <div className="audit-logs-page__details-section">
                <strong>{t('admin.auditLogs.technicalDetails')}</strong>
                <pre>{JSON.stringify({
                  requestMethod: selectedLog.requestMethod,
                  requestUrl: selectedLog.requestUrl,
                  statusCode: selectedLog.statusCode,
                  ipAddress: selectedLog.ipAddress,
                  userAgent: selectedLog.userAgent,
                  requestQuery: selectedLog.requestQuery,
                  requestParams: selectedLog.requestParams,
                  metadata: selectedLog.metadata,
                  beforeData: selectedLog.beforeData,
                }, null, 2)}</pre>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminPageShell>
  );
}
