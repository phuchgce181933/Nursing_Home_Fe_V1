import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, RefreshCw, X, ChevronDown, FileText, Users, Layers, Clock,
  AlertCircle, Inbox,
} from 'lucide-react';
import AdminPageShell from '../../components/admin/AdminPageShell';
import auditLogService from '../../services/auditLog.service';
import ListPagination from '../../components/ui/ListPagination';
import ShiftAuditDetail, {
  formatShiftAuditDescription,
  isShiftAuditLog,
} from '../../components/admin/audit/ShiftAuditDetail';
import '../../styles/admin/AuditLogsPage.css';

const BUSINESS_MODULE_LABELS = {
  admission: 'admin.auditLogs.businessModules.admission',
  billing: 'admin.auditLogs.businessModules.billing',
  health: 'admin.auditLogs.businessModules.health',
  pharmacy: 'admin.auditLogs.businessModules.pharmacy',
  facility: 'admin.auditLogs.businessModules.facility',
  resident: 'admin.auditLogs.businessModules.resident',
  servicePackage: 'admin.auditLogs.businessModules.servicePackage',
  servicepackage: 'admin.auditLogs.businessModules.servicePackage',
  careAppointment: 'admin.auditLogs.businessModules.careAppointment',
  Shift: 'admin.auditLogs.businessModules.shift',
  shift: 'admin.auditLogs.businessModules.shift',
  facilityTour: 'admin.auditLogs.businessModules.facilityTour',
  CareNote: 'admin.auditLogs.businessModules.careNote',
  careNote: 'admin.auditLogs.businessModules.careNote',
  activity: 'admin.auditLogs.businessModules.activity',
  incident: 'admin.auditLogs.businessModules.incident',
  billingPayment: 'admin.auditLogs.businessModules.billingPayment',
  billingInvoice: 'admin.auditLogs.businessModules.billingInvoice',
  pharmacyMedication: 'admin.auditLogs.businessModules.pharmacyMedication',
  pharmacySupplier: 'admin.auditLogs.businessModules.pharmacySupplier',
};

const ROLE_LABELS = {
  doctor: 'admin.auditLogs.roles.doctor',
  nurse: 'admin.auditLogs.roles.nurse',
  caregiver: 'admin.auditLogs.roles.caregiver',
  pharmacist: 'admin.auditLogs.roles.pharmacist',
  family: 'admin.auditLogs.roles.family',
  admin: 'admin.auditLogs.roles.admin',
};

const TARGET_ENTITY_LABELS = {
  Admission: 'admin.auditLogs.targetEntities.Admission',
  Resident: 'admin.auditLogs.targetEntities.Resident',
  Invoice: 'admin.auditLogs.targetEntities.Invoice',
  Payment: 'admin.auditLogs.targetEntities.Payment',
  Medication: 'admin.auditLogs.targetEntities.Medication',
  Supplier: 'admin.auditLogs.targetEntities.Supplier',
  ServicePackage: 'admin.auditLogs.targetEntities.ServicePackage',
  FacilityTour: 'admin.auditLogs.targetEntities.FacilityTour',
  CareAppointment: 'admin.auditLogs.targetEntities.CareAppointment',
  Shift: 'admin.auditLogs.targetEntities.Shift',
  CareNote: 'admin.auditLogs.targetEntities.CareNote',
  Activity: 'admin.auditLogs.targetEntities.Activity',
  Incident: 'admin.auditLogs.targetEntities.Incident',
  Building: 'admin.auditLogs.targetEntities.Building',
  Floor: 'admin.auditLogs.targetEntities.Floor',
  Room: 'admin.auditLogs.targetEntities.Room',
  Bed: 'admin.auditLogs.targetEntities.Bed',
  Equipment: 'admin.auditLogs.targetEntities.Equipment',
  MedicalRecord: 'admin.auditLogs.targetEntities.MedicalRecord',
  MedicationDispense: 'admin.auditLogs.targetEntities.MedicationDispense',
  Prescription: 'admin.auditLogs.targetEntities.Prescription',
  Health: 'admin.auditLogs.targetEntities.Health',
  Pharmacy: 'admin.auditLogs.targetEntities.Pharmacy',
  Servicepackage: 'admin.auditLogs.targetEntities.Servicepackage',
};

const ACTION_CATEGORY_KEYWORDS = {
  create: ['CREATE', 'ADD', 'REGISTER', 'RECORD', 'CHECK_IN', 'ASSIGN'],
  update: ['UPDATE', 'EDIT', 'MODIFY', 'APPROVE', 'REJECT', 'TRANSFER', 'EVALUATE', 'PRE_ADMISSION'],
  delete: ['DELETE', 'REMOVE', 'CANCEL'],
};

const getActionCategory = (action) => {
  if (!action) return 'other';
  const upper = String(action).toUpperCase();
  if (upper.startsWith('REQUEST_')) return 'system';
  for (const [category, keywords] of Object.entries(ACTION_CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => upper.includes(kw))) return category;
  }
  return 'other';
};

const ACTION_CATEGORY_LABELS = {
  create: 'admin.auditLogs.actionCategories.create',
  update: 'admin.auditLogs.actionCategories.update',
  delete: 'admin.auditLogs.actionCategories.delete',
  system: 'admin.auditLogs.actionCategories.system',
  other: 'admin.auditLogs.actionCategories.other',
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
    second: '2-digit',
  });
};

const formatShortTime = (value, t, locale) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('admin.auditLogs.timeAgo.justNow');
  if (diffMin < 60) return t('admin.auditLogs.timeAgo.minutesAgo', { count: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('admin.auditLogs.timeAgo.hoursAgo', { count: diffHour });
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
};

const truncateText = (text, length = 50) => {
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
  if (translated && translated !== translationKey) return translated;
  return displayAction || humanizeAction(actionKey);
};

const formatBusinessModuleLabel = (moduleValue, t) => {
  if (!moduleValue) return '—';
  const i18nKey = BUSINESS_MODULE_LABELS[moduleValue];
  return i18nKey ? t(i18nKey) : moduleValue;
};

const formatRoleLabel = (roleValue, t) => {
  if (!roleValue) return '—';
  const i18nKey = ROLE_LABELS[roleValue];
  return i18nKey ? t(i18nKey) : roleValue;
};

const formatTargetLabel = (targetName, targetEntityType, t) => {
  if (targetName && targetName !== targetEntityType) return targetName;
  if (!targetEntityType) return '—';
  const i18nKey = TARGET_ENTITY_LABELS[targetEntityType];
  return i18nKey ? t(i18nKey) : targetEntityType;
};

const IGNORED_DIFF_KEYS = new Set([
  '_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
]);

function collectGenericChanges(beforeData, afterData) {
  if (!beforeData && !afterData) return [];
  const before = beforeData || {};
  const after = afterData || {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const rows = [];
  for (const key of keys) {
    if (IGNORED_DIFF_KEYS.has(key)) continue;
    const bVal = before[key];
    const aVal = after[key];
    const bStr = bVal !== undefined && bVal !== null ? (typeof bVal === 'object' ? JSON.stringify(bVal) : String(bVal)) : '';
    const aStr = aVal !== undefined && aVal !== null ? (typeof aVal === 'object' ? JSON.stringify(aVal) : String(aVal)) : '';
    rows.push({ key, before: bStr, after: aStr, changed: bStr !== aStr });
  }
  return rows;
}

function formatFieldKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function GenericChangeDiff({ log, t }) {
  const beforeData = log.beforeData;
  const afterData = log.afterData;
  const hasBoth = beforeData && afterData;
  const dataOnly = afterData || beforeData;

  if (hasBoth) {
    const rows = collectGenericChanges(beforeData, afterData);
    if (rows.length === 0) return <p style={{ color: '#94a3b8', fontSize: 13 }}>—</p>;
    return (
      <table className="al-diff">
        <thead>
          <tr>
            <th>{t('admin.auditLogs.shiftDetail.fieldLabel')}</th>
            <th>{t('admin.auditLogs.shiftDetail.before')}</th>
            <th>{t('admin.auditLogs.shiftDetail.after')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.changed ? 'al-diff__row--changed' : undefined}>
              <td>{formatFieldKey(row.key)}</td>
              <td>{row.changed ? <span className="al-diff__val--old">{row.before || '—'}</span> : (row.before || '—')}</td>
              <td>{row.changed ? <span className="al-diff__val--new">{row.after || '—'}</span> : (row.after || '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (dataOnly && typeof dataOnly === 'object') {
    const entries = Object.entries(dataOnly).filter(([k]) => !IGNORED_DIFF_KEYS.has(k));
    if (entries.length === 0) return <p style={{ color: '#94a3b8', fontSize: 13 }}>—</p>;
    return (
      <div className="al-data-list">
        {entries.map(([key, val]) => (
          <div key={key} className="al-data-row">
            <span className="al-data-row__key">{formatFieldKey(key)}</span>
            <span className="al-data-row__val">
              {val !== null && val !== undefined
                ? (typeof val === 'object' ? JSON.stringify(val) : String(val))
                : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <p style={{ color: '#94a3b8', fontSize: 13 }}>—</p>;
}

function ActionBadge({ action }) {
  const { t } = useTranslation();
  const category = getActionCategory(action);
  const i18nKey = ACTION_CATEGORY_LABELS[category];
  return (
    <span className={`al-action-badge al-action-badge--${category}`}>
      <span className="al-action-badge__dot" />
      {t(i18nKey)}
    </span>
  );
}

function RoleTag({ role }) {
  const { t } = useTranslation();
  if (!role) return null;
  const i18nKey = ROLE_LABELS[role];
  const label = i18nKey ? t(i18nKey) : role;
  const isKnownRole = !!i18nKey;
  return <span className={`al-role-tag ${isKnownRole ? `al-role-tag--${role}` : ''}`}>{label}</span>;
}

export default function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (action) count++;
    if (businessModule) count++;
    if (actorRole) count++;
    if (from) count++;
    if (to) count++;
    if (!hideTechnical) count++;
    return count;
  }, [search, action, businessModule, actorRole, from, to, hideTechnical]);

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

  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    if (selectedLog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedLog]);

  const handleSearchSubmit = (e) => { e.preventDefault(); setPage(1); };

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

  const openDrawer = (log) => setSelectedLog(log);
  const closeDrawer = () => setSelectedLog(null);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeDrawer();
  };

  const latestTime = logs.length > 0 ? formatShortTime(logs[0].createdAt, t, locale) : '—';

  return (
    <AdminPageShell
      title={t('admin.auditLogs.title')}
      subtitle={t('admin.auditLogs.subtitle')}
    >
      <div className="al-page">
        {/* ── KPI Summary Cards ── */}
        <div className="al-kpi-grid">
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--primary">
              <FileText size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.totalEvents')}</span>
              <span className="al-kpi-card__value">{total.toLocaleString()}</span>
              <span className="al-kpi-card__sub">{t('admin.auditLogs.kpi.matchingFilters')}</span>
            </div>
          </div>
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--blue">
              <Layers size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.pages')}</span>
              <span className="al-kpi-card__value">{page} / {totalPages}</span>
              <span className="al-kpi-card__sub">{limit} {t('admin.auditLogs.kpi.perPage')}</span>
            </div>
          </div>
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--amber">
              <Users size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.activeFilters')}</span>
              <span className="al-kpi-card__value">{activeFilterCount}</span>
              <span className="al-kpi-card__sub">{activeFilterCount > 0 ? t('admin.auditLogs.kpi.filtersApplied') : t('admin.auditLogs.kpi.noFilters')}</span>
            </div>
          </div>
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--slate">
              <Clock size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.latestActivity')}</span>
              <span className="al-kpi-card__value" style={{ fontSize: 16 }}>{latestTime}</span>
              <span className="al-kpi-card__sub">{t('admin.auditLogs.kpi.mostRecent')}</span>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <form className="al-filter-bar" onSubmit={handleSearchSubmit}>
          <div className="al-filter-bar__group al-filter-bar__group--search">
            <span className="al-filter-bar__label">{t('admin.auditLogs.search')}</span>
            <div className="al-filter-bar__input-wrap">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.auditLogs.searchPlaceholder')}
              />
            </div>
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--module">
            <span className="al-filter-bar__label">{t('admin.auditLogs.businessModule')}</span>
            <select value={businessModule} onChange={(e) => setBusinessModule(e.target.value)}>
              <option value="">{t('admin.auditLogs.selectBusinessModule')}</option>
              {filterOptions.businessModules.map((opt) => (
                <option key={opt} value={opt}>{BUSINESS_MODULE_LABELS[opt] ? t(BUSINESS_MODULE_LABELS[opt]) : opt}</option>
              ))}
            </select>
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--role">
            <span className="al-filter-bar__label">{t('admin.auditLogs.role')}</span>
            <select value={actorRole} onChange={(e) => setActorRole(e.target.value)}>
              <option value="">{t('admin.auditLogs.kpi.allRoles')}</option>
              {filterOptions.roles.map((opt) => (
                <option key={opt} value={opt}>{ROLE_LABELS[opt] ? t(ROLE_LABELS[opt]) : opt}</option>
              ))}
            </select>
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--date">
            <span className="al-filter-bar__label">{t('admin.auditLogs.fromDate')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--date">
            <span className="al-filter-bar__label">{t('admin.auditLogs.toDate')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="al-filter-bar__actions">
            <button
              type="button"
              className={`al-filter-advanced__toggle ${showAdvanced ? 'al-filter-advanced__toggle--open' : ''}`}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <ChevronDown size={14} />
            </button>
            <button type="submit" className="al-filter-bar__btn al-filter-bar__btn--primary" disabled={loading}>
              {t('admin.auditLogs.apply')}
            </button>
            <button type="button" className="al-filter-bar__btn al-filter-bar__btn--secondary" onClick={handleResetFilters} disabled={loading}>
              {t('admin.auditLogs.reset')}
            </button>
            <button type="button" className="al-filter-bar__btn al-filter-bar__btn--secondary al-filter-bar__btn--icon" onClick={loadLogs} disabled={loading} title={t('admin.auditLogs.refresh')}>
              <RefreshCw size={14} />
            </button>
          </div>
        </form>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="al-filter-advanced">
            <div className="al-filter-bar__group" style={{ flex: '0 1 200px' }}>
              <span className="al-filter-bar__label">{t('admin.auditLogs.action')}</span>
              <input
                list="al-action-opts"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder={t('admin.auditLogs.actionPlaceholder')}
                style={{
                  width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
                  borderRadius: 10, background: '#f8fafc', color: '#1e293b', fontSize: 13,
                }}
              />
              <datalist id="al-action-opts">
                {filterOptions.actions.map((opt) => <option key={opt} value={opt} />)}
              </datalist>
            </div>
            <label className="al-checkbox-row">
              <input
                type="checkbox"
                checked={hideTechnical}
                onChange={(e) => setHideTechnical(e.target.checked)}
              />
              {t('admin.auditLogs.hideTechnicalHelp')}
            </label>
          </div>
        )}

        {/* ── Error Alert ── */}
        {error && (
          <div className="al-alert">
            <AlertCircle size={16} />
            {error}
            <button className="al-alert__retry" onClick={loadLogs}>{t('admin.auditLogs.refresh')}</button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="al-table-card">
          <div className="al-table-wrapper">
            {loading ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="al-skeleton-row">
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                  </div>
                ))}
              </div>
            ) : logs.length > 0 ? (
              <table className="al-table">
                <thead>
                  <tr>
                    <th>{t('admin.auditLogs.timestamp')}</th>
                    <th>{t('admin.auditLogs.kpi.type')}</th>
                    <th>{t('admin.auditLogs.displayAction')}</th>
                    <th>{t('admin.auditLogs.businessModule')}</th>
                    <th>{t('admin.auditLogs.performedBy')}</th>
                    <th>{t('admin.auditLogs.targetName')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      className={selectedLog?._id === log._id ? 'al-row--selected' : ''}
                      onClick={() => openDrawer(log)}
                    >
                      <td className="al-cell-time">
                        {formatDateTime(log.createdAt, locale)}
                      </td>
                      <td>
                        <ActionBadge action={log.action} />
                      </td>
                      <td>{formatActionLabel(log.action, log.displayAction, t)}</td>
                      <td>{formatBusinessModuleLabel(log.businessModule || log.module, t)}</td>
                      <td>
                        <div className="al-actor">
                          <span className="al-actor__name">{log.performedBy || log.actorUserId || '—'}</span>
                          <RoleTag role={log.performedByRole || log.actorRole} />
                        </div>
                      </td>
                      <td className="al-cell-target">
                        {formatTargetLabel(log.targetName, log.targetEntityType, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="al-empty">
                <div className="al-empty__icon">
                  <Inbox size={28} />
                </div>
                <p className="al-empty__title">{t('admin.auditLogs.noResults')}</p>
                <p className="al-empty__text">{t('admin.auditLogs.kpi.tryAdjustFilters')}</p>
              </div>
            )}
          </div>

          {!loading && logs.length > 0 && (
            <div className="al-table-footer">
              <ListPagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
                total={total}
                hideWhenSinglePage={false}
              />
            </div>
          )}
        </div>

        {/* ── Detail Drawer ── */}
        <div
          className={`al-drawer-backdrop ${selectedLog ? 'is-open' : ''}`}
          onClick={handleBackdropClick}
        >
          {selectedLog && (
            <div className="al-drawer">
              <div className="al-drawer__header">
                <div className="al-drawer__header-info">
                  <h3 className="al-drawer__header-title">
                    {t('admin.auditLogs.details')}
                    <ActionBadge action={selectedLog.action} />
                  </h3>
                  <span className="al-drawer__header-sub">
                    {formatDateTime(selectedLog.createdAt, locale)}
                  </span>
                </div>
                <button className="al-drawer__close" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>

              <div className="al-drawer__body">
                {/* Summary */}
                <div className="al-section">
                  <h4 className="al-section__title">{t('admin.auditLogs.kpi.summary')}</h4>
                  <div className="al-detail-grid">
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.displayAction')}</span>
                      <span className="al-detail-item__value">
                        {formatActionLabel(selectedLog.action, selectedLog.displayAction, t)}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.businessModule')}</span>
                      <span className="al-detail-item__value">
                        {formatBusinessModuleLabel(selectedLog.businessModule || selectedLog.module, t)}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.performedBy')}</span>
                      <span className="al-detail-item__value">
                        {selectedLog.performedBy || selectedLog.actorUserId || '—'}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.role')}</span>
                      <span className="al-detail-item__value">
                        <RoleTag role={selectedLog.performedByRole || selectedLog.actorRole} />
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.targetName')}</span>
                      <span className="al-detail-item__value">
                        {formatTargetLabel(selectedLog.targetName, selectedLog.targetEntityType, t)}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.timestamp')}</span>
                      <span className="al-detail-item__value">
                        {formatDateTime(selectedLog.createdAt, locale)}
                      </span>
                    </div>
                    {(selectedLog.description || (isShiftAuditLog(selectedLog))) && (
                      <div className="al-detail-item al-detail-item--full">
                        <span className="al-detail-item__label">{t('admin.auditLogs.description')}</span>
                        <span className="al-detail-item__value">
                          {isShiftAuditLog(selectedLog)
                            ? formatShiftAuditDescription(selectedLog, t)
                            : (selectedLog.description || '—')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Changes */}
                <div className="al-section">
                  <h4 className="al-section__title">{t('admin.auditLogs.businessDetails')}</h4>
                  {isShiftAuditLog(selectedLog) ? (
                    <ShiftAuditDetail log={selectedLog} />
                  ) : (
                    <GenericChangeDiff log={selectedLog} t={t} />
                  )}
                </div>

                {/* Technical Details */}
                <details className="al-technical">
                  <summary>{t('admin.auditLogs.technicalDetails')}</summary>
                  <div className="al-technical__body">
                    {selectedLog.requestMethod && (
                      <div className="al-technical__row">
                        <span className="al-technical__label">Method</span>
                        <span className="al-technical__value">{selectedLog.requestMethod}</span>
                      </div>
                    )}
                    {selectedLog.requestUrl && (
                      <div className="al-technical__row">
                        <span className="al-technical__label">URL</span>
                        <span className="al-technical__value">{selectedLog.requestUrl}</span>
                      </div>
                    )}
                    {selectedLog.statusCode && (
                      <div className="al-technical__row">
                        <span className="al-technical__label">Status</span>
                        <span className="al-technical__value">{selectedLog.statusCode}</span>
                      </div>
                    )}
                    {selectedLog.ipAddress && (
                      <div className="al-technical__row">
                        <span className="al-technical__label">IP</span>
                        <span className="al-technical__value">{selectedLog.ipAddress}</span>
                      </div>
                    )}
                    {selectedLog.userAgent && (
                      <div className="al-technical__row">
                        <span className="al-technical__label">User Agent</span>
                        <span className="al-technical__value">{selectedLog.userAgent}</span>
                      </div>
                    )}
                    {(selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0) && (
                      <>
                        <div className="al-technical__row">
                          <span className="al-technical__label">Metadata</span>
                          <span className="al-technical__value" />
                        </div>
                        <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                      </>
                    )}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
