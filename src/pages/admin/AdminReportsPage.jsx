import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  FileText,
  HeartPulse,
  AlertTriangle,
  Activity,
  DollarSign,
  Clock5,
  Download,
  Save,
  RefreshCw,
  Search,
  CalendarDays,
} from 'lucide-react';
import reportService from '../../services/report.service';
import '../../styles/admin/AdminReportsPage.css';

const REPORT_TYPES = [
  { key: 'summary', i18nKey: 'adminReports.reportSummary', icon: FileText },
  { key: 'resident-count', i18nKey: 'adminReports.reportResidentCount', icon: BarChart3 },
  { key: 'health-status', i18nKey: 'adminReports.reportHealthStatus', icon: HeartPulse },
  { key: 'incidents', i18nKey: 'adminReports.reportIncidents', icon: AlertTriangle },
  { key: 'care-activity', i18nKey: 'adminReports.reportCareActivity', icon: Activity },
  { key: 'financial', i18nKey: 'adminReports.reportFinancial', icon: DollarSign },
  { key: 'time-series', i18nKey: 'adminReports.reportTimeSeries', icon: Clock5 },
  { key: 'compare', i18nKey: 'adminReports.reportCompare', icon: BarChart3 },
];

const TIME_SERIES_METRICS = [
  { value: 'incidents', i18nKey: 'adminReports.metricIncidents' },
  { value: 'residentAdmissions', i18nKey: 'adminReports.metricAdmissions' },
  { value: 'activities', i18nKey: 'adminReports.metricActivities' },
  { value: 'invoiceRevenue', i18nKey: 'adminReports.metricInvoiceRevenue' },
  { value: 'payments', i18nKey: 'adminReports.metricPayments' },
];

const TODAY_ISO = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

const buildSavePayload = (reportType, filters, reportData, t) => ({
  reportType,
  title: t('adminReports.saveReportTitle', { type: reportType }),
  filters,
  periodStart: filters.from,
  periodEnd: filters.to,
  summaryMetrics: reportData?.summary || reportData || {},
  chartData: reportData?.series || {},
});

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [currentType, setCurrentType] = useState('summary');
  const [reportData, setReportData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(TODAY_ISO());
  const [metric, setMetric] = useState('incidents');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const filters = useMemo(
    () => ({ from: from || undefined, to: to || undefined, metric, search: search || undefined, status: status || undefined, severity: severity || undefined, page, limit }),
    [from, to, metric, search, status, severity, page, limit]
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = null;
      switch (currentType) {
        case 'resident-count':
          data = await reportService.getResidentCountReport(filters);
          break;
        case 'health-status':
          data = await reportService.getHealthStatusReport(filters);
          break;
        case 'incidents':
          data = await reportService.getIncidentReport(filters);
          break;
        case 'care-activity':
          data = await reportService.getCareActivityReport(filters);
          break;
        case 'financial':
          data = await reportService.getFinancialReport(filters);
          break;
        case 'time-series':
          data = await reportService.getTimeSeriesReport(filters);
          break;
        case 'compare':
          data = await reportService.getComparisonReport(filters);
          break;
        default:
          data = await reportService.getSummaryReport(filters);
      }
      setReportData(data);
      if (data?.totalPages) {
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('adminReports.errorLoadReport'));
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [currentType, filters]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await reportService.getReportHistory({ page: 1, limit: 8 });
      setHistoryData(data);
    } catch (err) {
      console.error('Không tải được lịch sử báo cáo:', err);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleExport = async () => {
    try {
      const csv = await reportService.exportReport({ type: currentType, ...filters });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const fileName = `baocao-${currentType}-${Date.now()}.csv`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError(t('adminReports.errorExportReport'));
    }
  };

  const handleSaveHistory = async () => {
    if (!reportData) return;
    setSaving(true);
    setError(null);
    setSuccessMessage('');
    try {
      await reportService.saveReportHistory(buildSavePayload(currentType, filters, reportData, t));
      setSuccessMessage(t('adminReports.successSaveHistory'));
      loadHistory();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('adminReports.errorSaveHistory'));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = (() => { const found = REPORT_TYPES.find((item) => item.key === currentType); return found ? t(found.i18nKey) : currentType; })();

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div className="adm-header__title-wrap">
          <div className="adm-header__badge">Admin Analytics</div>
          <h1>
            <FileText size={28} /> {t('adminReports.title')}
          </h1>
          <p>{t('adminReports.subtitle')}</p>
        </div>
        <div className="adm-header__buttons">
          <button type="button" className="adm-btn-refresh" onClick={loadReport}>
            <RefreshCw size={18} /> {t('adminReports.refresh')}
          </button>
          <button type="button" className="adm-btn-refresh" onClick={handleExport}>
            <Download size={18} /> {t('adminReports.exportCsv')}
          </button>
          <button type="button" className="adm-btn-refresh" onClick={handleSaveHistory} disabled={saving || !reportData}>
            <Save size={18} /> {saving ? t('adminReports.saving') : t('adminReports.saveHistory')}
          </button>
        </div>
      </div>

      <div className="adm-report-tabs">
        {REPORT_TYPES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`adm-report-tab ${currentType === item.key ? 'adm-report-tab--active' : ''}`}
              onClick={() => {
                setCurrentType(item.key);
                setPage(1);
              }}
            >
              <Icon size={18} /> {t(item.i18nKey)}
            </button>
          );
        })}
      </div>

      <div className="adm-filter-panel">
        <div className="adm-filter-panel__header">
          <div>
            <div className="adm-section-eyebrow">{t('adminReports.filterSection')}</div>
            <h2>{t('adminReports.filterDesc')}</h2>
          </div>
          <div className="adm-filter-panel__hint">
            <CalendarDays size={16} /> {t('adminReports.filterHint')}
          </div>
        </div>
        <div className="adm-filter-grid">
          <div className="adm-filter-group">
            <label>{t('adminReports.filterFrom')}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="adm-filter-group">
            <label>{t('adminReports.filterTo')}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(currentType === 'time-series' || currentType === 'compare') && (
            <div className="adm-filter-group">
              <label>{t('adminReports.filterMetric')}</label>
              <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                {TIME_SERIES_METRICS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.i18nKey)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {currentType === 'incidents' && (
            <>
              <div className="adm-filter-group">
                <label>{t('adminReports.filterStatus')}</label>
                <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="open, investigating, resolved..." />
              </div>
              <div className="adm-filter-group">
                <label>{t('adminReports.filterSeverity')}</label>
                <input value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="low, medium, high, critical" />
              </div>
            </>
          )}
          {(currentType === 'incidents' || currentType === 'care-activity') && (
            <div className="adm-filter-group">
              <label>{t('adminReports.filterSearch')}</label>
              <div className="adm-filter-input-wrapper">
                <Search size={16} className="adm-filter-input-icon" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('adminReports.filterSearchPlaceholder')} />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="adm-alert adm-alert--danger">{error}</div>}
      {successMessage && <div className="adm-alert adm-alert--success">{successMessage}</div>}

      <div className="adm-metrics-grid">
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ background: '#e2f8f2', color: '#0f766e' }}>
            <FileText size={20} />
          </div>
          <div>
            <span className="adm-stat-label">{t('adminReports.statCurrentReport')}</span>
            <div className="adm-stat-value">{currentTitle}</div>
          </div>
        </div>
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="adm-stat-label">{t('adminReports.statStatus')}</span>
            <div className="adm-stat-value">{loading ? t('adminReports.statLoading') : t('adminReports.statReady')}</div>
          </div>
        </div>
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ background: 'rgba(15, 118, 110, 0.08)', color: '#0f766e' }}>
            <Clock5 size={20} />
          </div>
          <div>
            <span className="adm-stat-label">{t('adminReports.statTime')}</span>
            <div className="adm-stat-value">{from || t('adminReports.statNone')} → {to || t('adminReports.statNone')}</div>
          </div>
        </div>
        <div className="adm-card-stat">
          <div className="adm-stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Save size={20} />
          </div>
          <div>
            <span className="adm-stat-label">{t('adminReports.statHistory')}</span>
            <div className="adm-stat-value">{historyData?.total || 0}</div>
          </div>
        </div>
      </div>

      <div className="adm-report-content">
        {loading && <div className="adm-loading">{t('adminReports.loadingReport')}</div>}

        {!loading && reportData && (
          <>
            {currentType === 'summary' && (
              <div className="adm-summary-grid">
                <div className="adm-summary-card adm-summary-card--accent">
                  <span className="adm-summary-card__label">{t('adminReports.totalResidents')}</span>
                  <div>{reportData.totalResidents ?? '-'}</div>
                </div>
                <div className="adm-summary-card adm-summary-card--rose">
                  <span className="adm-summary-card__label">{t('adminReports.totalIncidents')}</span>
                  <div>{reportData.totalIncidents ?? '-'}</div>
                </div>
                <div className="adm-summary-card adm-summary-card--green">
                  <span className="adm-summary-card__label">{t('adminReports.totalActivities')}</span>
                  <div>{reportData.totalActivities ?? '-'}</div>
                </div>
                <div className="adm-summary-card adm-summary-card--violet">
                  <span className="adm-summary-card__label">{t('adminReports.totalRevenue')}</span>
                  <div>{formatCurrency(reportData.invoiceSummary?.totalAmount)}</div>
                </div>
              </div>
            )}

            {currentType === 'resident-count' && (
              <div className="adm-table-card">
                <h2>{t('adminReports.residentDistribution')}</h2>
                <div className="adm-data-grid">
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.totalResidentCount')}</div>
                    <div className="adm-data-block__value">{reportData.totalResidents ?? 0}</div>
                  </div>
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.byStatus')}</div>
                    <ul>
                      {reportData.statuses?.map((item) => (
                        <li key={item.residencyStatus}>{item.residencyStatus}: {item.count}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {currentType === 'health-status' && (
              <div className="adm-table-card">
                <h2>{t('adminReports.healthReport')}</h2>
                <div className="adm-data-grid">
                  <div className="adm-data-block">
                    <strong>{t('adminReports.totalRecords')}</strong>
                    <div>{reportData.totalRecords}</div>
                  </div>
                  <div className="adm-data-block">
                    <strong>{t('adminReports.abnormalRecords')}</strong>
                    <div>{reportData.abnormalRecords}</div>
                  </div>
                  <div className="adm-data-block">
                    <strong>{t('adminReports.abnormalRatio')}</strong>
                    <div>{Math.round((reportData.abnormalRatio || 0) * 100)}%</div>
                  </div>
                </div>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>{t('adminReports.colResident')}</th>
                      <th>{t('adminReports.colRecordCount')}</th>
                      <th>{t('adminReports.colAbnormal')}</th>
                      <th>{t('adminReports.colRatio')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topResidents?.map((item) => (
                      <tr key={item.residentId} className="adm-table-row">
                        <td>{item.residentName || t('adminReports.unknown')}</td>
                        <td>{item.totalRecords}</td>
                        <td>{item.abnormalCount}</td>
                        <td>{Math.round((item.abnormalRatio || 0) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {currentType === 'incidents' && (
              <div className="adm-table-card">
                <h2>{t('adminReports.incidentList')}</h2>
                <div className="adm-table-responsive">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>{t('adminReports.colDate')}</th>
                        <th>{t('adminReports.colResidentName')}</th>
                        <th>{t('adminReports.colIncidentType')}</th>
                        <th>{t('adminReports.colSeverity')}</th>
                        <th>{t('adminReports.colStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.incidents?.map((incident) => (
                        <tr key={incident._id} className="adm-table-row">
                          <td>{incident.incidentAt ? new Date(incident.incidentAt).toLocaleDateString() : '-'}</td>
                          <td>{incident.residentId?.fullName || '-'}</td>
                          <td>{incident.incidentType}</td>
                          <td>{incident.severity}</td>
                          <td>{incident.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentType === 'care-activity' && (
              <div className="adm-table-card">
                <h2>{t('adminReports.careActivityTitle')}</h2>
                <div className="adm-data-grid">
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.totalActivityCount')}</div>
                    <div className="adm-data-block__value">{reportData.totalActivities}</div>
                  </div>
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.byActivityStatus')}</div>
                    <ul>
                      {reportData.tasksByStatus?.map((item) => (
                        <li key={item.status}>{item.status}: {item.count}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.byTaskType')}</div>
                    <ul>
                      {reportData.tasksByType?.map((item) => (
                        <li key={item.taskType}>{item.taskType}: {item.count}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {currentType === 'financial' && (
              <div className="adm-table-card">
                <div className="adm-section-head">
                  <div>
                    <div className="adm-section-eyebrow">{t('adminReports.financialSection')}</div>
                    <h2>{t('adminReports.financialReport')}</h2>
                  </div>
                </div>
                <div className="adm-data-grid">
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.invoices')}</div>
                    <div className="adm-data-block__value">{reportData.invoiceSummary?.totalInvoices ?? 0}</div>
                  </div>
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.totalInvoiceAmount')}</div>
                    <div className="adm-data-block__value">{formatCurrency(reportData.invoiceSummary?.totalAmount)}</div>
                  </div>
                  <div className="adm-data-block">
                    <div className="adm-data-block__title">{t('adminReports.payments')}</div>
                    <div className="adm-data-block__value">{reportData.paymentSummary?.totalPayments ?? 0}</div>
                  </div>
                </div>
                <div className="adm-data-block adm-data-block--wide">
                  <div className="adm-data-block__title">{t('adminReports.outstandingAmount')}</div>
                  <div className="adm-data-block__value">{formatCurrency(reportData.invoiceSummary?.outstandingAmount)}</div>
                </div>
              </div>
            )}

            {(currentType === 'time-series' || currentType === 'compare') && (
              <div className="adm-table-card">
                <h2>{currentType === 'time-series' ? t('adminReports.timeSeriesTitle') : t('adminReports.compareTitle')}</h2>
                <div className="adm-data-grid">
                  <div className="adm-data-block">
                    <strong>{t('adminReports.metricLabel')}</strong>
                    <div>{t(TIME_SERIES_METRICS.find((item) => item.value === metric)?.i18nKey || '')}</div>
                  </div>
                  <div className="adm-data-block">
                    <strong>{t('adminReports.dataLabel')}</strong>
                    <div>{currentType === 'time-series' ? reportData.series?.length ?? 0 : reportData.currentSeries?.length ?? 0} {t('adminReports.dataPoints')}</div>
                  </div>
                </div>
                <div className="adm-chart-card">
                  {currentType === 'time-series' ? (
                    <div className="adm-chart-wrapper">
                      {reportData.series?.length ? (
                        <div className="adm-chart-grid">
                          {reportData.series.map((item) => {
                            const value = Number(item.value || 0);
                            const maxValue = Math.max(...reportData.series.map((row) => Number(row.value || 0)), 1);
                            const height = Math.max(8, Math.round((value / maxValue) * 100));
                            return (
                              <div key={item.period} className="adm-chart-col">
                                <div className="adm-chart-bar" style={{ height: `${height}%` }} />
                                <span className="adm-chart-col-label">{item.period}</span>
                                <span className="adm-chart-col-value">{item.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div>{t('adminReports.noChartData')}</div>
                      )}
                    </div>
                  ) : (
                    <div className="adm-chart-wrapper">
                      {reportData.currentSeries?.length ? (
                        <div className="adm-chart-grid adm-chart-grid--compare">
                          <div className="adm-chart-legend">
                            <span><span className="adm-chart-legend-dot adm-chart-legend-dot--current" /> {t('adminReports.currentLabel')}</span>
                            <span><span className="adm-chart-legend-dot adm-chart-legend-dot--previous" /> {t('adminReports.previousLabel')}</span>
                          </div>
                          {(() => {
                            const previousMap = new Map(reportData.previousSeries?.map((item) => [item.period, Number(item.value || 0)]));
                            const items = reportData.currentSeries.map((item) => ({
                              period: item.period,
                              current: Number(item.value || 0),
                              previous: previousMap.get(item.period) ?? 0,
                            }));
                            const maxValue = Math.max(
                              ...items.flatMap((row) => [row.current, row.previous]),
                              1
                            );
                            return items.map((item) => (
                              <div key={item.period} className="adm-compare-row">
                                <div className="adm-compare-label">{item.period}</div>
                                <div className="adm-compare-bars">
                                  <div className="adm-compare-bar adm-compare-bar--current" style={{ width: `${Math.round((item.current / maxValue) * 100)}%` }}>
                                    <span>{item.current}</span>
                                  </div>
                                  <div className="adm-compare-bar adm-compare-bar--previous" style={{ width: `${Math.round((item.previous / maxValue) * 100)}%` }}>
                                    <span>{item.previous}</span>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <div>{t('adminReports.noCompareData')}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="adm-table-responsive">
                  {currentType === 'time-series' ? (
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>{t('adminReports.colPeriod')}</th>
                          <th>{t('adminReports.colValue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.series?.map((item) => (
                          <tr key={item.period} className="adm-table-row">
                            <td>{item.period}</td>
                            <td>{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>{t('adminReports.colPeriod')}</th>
                          <th>{t('adminReports.currentLabel')}</th>
                          <th>{t('adminReports.previousLabel')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const previousMap = new Map(reportData.previousSeries?.map((item) => [item.period, item.value]));
                          return reportData.currentSeries?.map((item) => (
                            <tr key={item.period} className="adm-table-row">
                              <td>{item.period}</td>
                              <td>{item.value}</td>
                              <td>{previousMap.get(item.period) ?? 0}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="adm-table-card adm-table-card--history">
        <div className="adm-section-head">
          <div>
            <div className="adm-section-eyebrow">{t('adminReports.historySection')}</div>
            <h2>{t('adminReports.reportHistory')}</h2>
          </div>
        </div>
        <div className="adm-table-responsive">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('adminReports.colTitle')}</th>
                <th>{t('adminReports.colReportType')}</th>
                <th>{t('adminReports.colCreatedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {historyData?.items?.length ? (
                historyData.items.map((item) => (
                  <tr key={item._id} className="adm-table-row">
                    <td>{item.title}</td>
                    <td>
                      <span className="adm-pill">{item.reportType}</span>
                    </td>
                    <td>{new Date(item.generatedAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="adm-empty-state">
                    {t('adminReports.noHistorySaved')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
