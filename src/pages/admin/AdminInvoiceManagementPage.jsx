import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Eye, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import adminInvoiceService from '../../services/adminInvoice.service';
import residentService from '../../services/resident.service';
import { resolveApiError } from '../../utils/apiMessage';

export default function AdminInvoiceManagementPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [residentId, setResidentId] = useState('');
  const [residents, setResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [issueFrom, setIssueFrom] = useState('');
  const [issueTo, setIssueTo] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [sortBy, setSortBy] = useState('issuedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: status || undefined,
      residentId: residentId || undefined,
      issueFrom: issueFrom || undefined,
      issueTo: issueTo || undefined,
      dueFrom: dueFrom || undefined,
      dueTo: dueTo || undefined,
      minAmount: minAmount || undefined,
      maxAmount: maxAmount || undefined,
      isOverdue: isOverdue ? 'true' : undefined,
      sortBy,
      sortOrder,
    }),
    [page, limit, search, status, residentId, issueFrom, issueTo, dueFrom, dueTo, minAmount, maxAmount, isOverdue]
  );

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminInvoiceService.listInvoices(filters);
      setInvoices(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error(err);
      setError(resolveApiError(err, t, 'admin.dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    let active = true;
    const loadResidentOptions = async () => {
      setResidentsLoading(true);
      try {
        const residentResponse = await residentService.getResidentList({ page: 1, limit: 200 });
        if (!active) return;
        setResidents(residentResponse?.data || []);
      } catch (err) {
        console.error('Failed to load resident list:', err);
      } finally {
        if (active) setResidentsLoading(false);
      }
    };

    loadResidentOptions();
    return () => {
      active = false;
    };
  }, []);

  const formattedDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
  };

  const translateStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    const map = {
      draft: t('adminInvoices.statusDraft', 'Chưa xuất'),
      issued: t('adminInvoices.statusIssued'),
      partially_paid: t('adminInvoices.statusPartiallyPaid'),
      paid: t('adminInvoices.statusPaid'),
      overdue: t('adminInvoices.statusOverdue'),
      cancelled: t('adminInvoices.statusCancelled'),
    };
    return normalized ? map[normalized] || status : '-';
  };

  const getStatusBadgeClass = (status) => {
    const normalized = String(status || 'default').toLowerCase().replace(/_/g, '-');
    return `adm-status-badge adm-status-badge--${normalized}`;
  };

  const openDetail = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const closeDetail = () => {
    setSelectedInvoice(null);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setResidentId('');
    setIssueFrom('');
    setIssueTo('');
    setDueFrom('');
    setDueTo('');
    setMinAmount('');
    setMaxAmount('');
    setIsOverdue(false);
    setPage(1);
  };

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <DollarSign size={28} /> {t('adminInvoices.title')}
          </h1>
          <p>{t('adminInvoices.subtitle')}</p>
        </div>
        <div className="adm-header__buttons">
          <button type="button" className="adm-btn-secondary" onClick={handleResetFilters}>
            {t('adminInvoices.resetFilters')}
          </button>
          <button type="button" className="adm-btn-refresh" onClick={loadInvoices}>
            <RefreshCw size={18} /> {t('common.refresh')}
          </button>
        </div>
      </div>

      <div className="adm-filter-panel">
        <div className="adm-filter-grid">
          <div className="adm-filter-group">
            <label>{t('adminInvoices.invoiceNumberLabel')}</label>
            <div className="adm-filter-input-wrapper">
              <Search size={16} className="adm-filter-input-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('adminInvoices.searchPlaceholder')}
              />
            </div>
          </div>

          <div className="adm-filter-group">
            <label>{t('common.resident')}</label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
            >
              <option value="">{t('adminInvoices.allResidents')}</option>
              {residents.map((resident) => (
                <option key={resident._id} value={resident._id}>
                  {resident.fullName || resident.name || resident._id}
                </option>
              ))}
            </select>
            {residentsLoading && <div className="adm-filter-loading">{t('adminInvoices.loadingResidents')}</div>}
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.issueDateFromLabel')}</label>
            <input
              type="date"
              value={issueFrom}
              onChange={(e) => setIssueFrom(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.issueDateToLabel')}</label>
            <input
              type="date"
              value={issueTo}
              onChange={(e) => setIssueTo(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.dueDateFromLabel')}</label>
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.dueDateToLabel')}</label>
            <input
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.minAmountLabel')}</label>
            <input
              type="number"
              min="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.maxAmountLabel')}</label>
            <input
              type="number"
              min="0"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="adm-filter-group adm-filter-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={isOverdue}
                onChange={(e) => setIsOverdue(e.target.checked)}
              />
              {t('adminInvoices.overdueOnlyLabel')}
            </label>
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.sortByLabel')}</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="issuedAt">{t('adminInvoices.issuedAtLabel')}</option>
              <option value="dueDate">{t('adminInvoices.dueDateLabel')}</option>
              <option value="totalAmount">{t('adminInvoices.totalAmountLabel')}</option>
              <option value="invoiceNumber">{t('adminInvoices.invoiceNumberLabel')}</option>
            </select>
          </div>

          <div className="adm-filter-group">
            <label>{t('adminInvoices.sortOrderLabel')}</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">{t('adminInvoices.sortDesc')}</option>
              <option value="asc">{t('adminInvoices.sortAsc')}</option>
            </select>
          </div>

          <div className="adm-filter-group">
            <label>{t('common.status')}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('common.all')}</option>
              <option value="draft">{t('adminInvoices.statusDraft', 'Chưa xuất')}</option>
              <option value="issued">{t('adminInvoices.statusIssued')}</option>
              <option value="partially_paid">{t('adminInvoices.statusPartiallyPaid')}</option>
              <option value="paid">{t('adminInvoices.statusPaid')}</option>
              <option value="overdue">{t('adminInvoices.statusOverdue')}</option>
              <option value="cancelled">{t('adminInvoices.statusCancelled')}</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="adm-error-banner">{error}</div>}

      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{t('adminInvoices.invoiceNumberLabel')}</th>
              <th>{t('common.resident')}</th>
              <th>{t('adminInvoices.tableHeaderTotal')}</th>
              <th>{t('common.status')}</th>
              <th>{t('adminInvoices.issuedAtLabel')}</th>
              <th>{t('adminInvoices.dueDateLabel')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="adm-table-loading">
                  {t('common.loading')}
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="adm-table-empty">
                  {t('adminInvoices.emptyRow')}
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice._id}>
                  <td>{invoice.invoiceNumber || '-'}</td>
                  <td>{invoice.residentId?.fullName || invoice.residentId || '-'}</td>
                  <td>{invoice.totalAmount?.toLocaleString('vi-VN')}₫</td>
                  <td>
                    <span className={getStatusBadgeClass(invoice.status)}>{translateStatus(invoice.status)}</span>
                  </td>
                  <td>{formattedDate(invoice.issuedAt)}</td>
                  <td>{formattedDate(invoice.dueDate)}</td>
                  <td>
                    <button type="button" className="adm-btn-secondary" onClick={() => openDetail(invoice)}>
                      <Eye size={16} /> {t('adminInvoices.detailsButton')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="adm-pagination">
        <button type="button" className="adm-btn-pagination" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={16} />
        </button>
        <span>{t('common.pageOf', { page, totalPages })}</span>
        <button type="button" className="adm-btn-pagination" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight size={16} />
        </button>
      </div>

      {selectedInvoice && (
        <div className="adm-detail-overlay" onClick={closeDetail}>
          <div className="adm-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-detail-header">
              <h2>{t('adminInvoices.detailTitle')}</h2>
              <button type="button" className="adm-btn-secondary" onClick={closeDetail}>
                {t('common.close')}
              </button>
            </div>
            <div className="adm-detail-grid">
              <div className="adm-detail-item">
                <span className="adm-detail-label">{t('adminInvoices.invoiceNumberLabel')}</span>
                <span className="adm-detail-value">{selectedInvoice.invoiceNumber || '-'}</span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">{t('common.resident')}</span>
                <span className="adm-detail-value">{selectedInvoice.residentId?.fullName || selectedInvoice.residentId || '-'}</span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">{t('common.status')}</span>
                <span className="adm-detail-value">
                  <span className={getStatusBadgeClass(selectedInvoice.status)}>{translateStatus(selectedInvoice.status)}</span>
                </span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">{t('adminInvoices.totalAmountLabel')}</span>
                <span className="adm-detail-value">{selectedInvoice.totalAmount?.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">{t('adminInvoices.paymentPlanLabel')}</span>
                <span className="adm-detail-value">{selectedInvoice.paymentPlan === 'HALF_NOW' ? t('adminInvoices.paymentPlanHalfNow') : t('adminInvoices.paymentPlanFull')}</span>
              </div>
              {selectedInvoice.remainingAmount > 0 && (
                <div className="adm-detail-item">
                  <span className="adm-detail-label">{t('adminInvoices.remainingAmountLabel')}</span>
                  <span className="adm-detail-value">{selectedInvoice.remainingAmount?.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="adm-detail-item adm-detail-item--full">
                <span className="adm-detail-label">{t('adminInvoices.costBreakdownLabel')}</span>
                <span className="adm-detail-value">
                  {t('adminInvoices.costBreakdownValue', {
                    room: selectedInvoice.roomCost?.toLocaleString('vi-VN'),
                    service: selectedInvoice.careServiceCost?.toLocaleString('vi-VN'),
                    medication: selectedInvoice.medicationCost?.toLocaleString('vi-VN'),
                    other: selectedInvoice.otherCost?.toLocaleString('vi-VN'),
                  })}
                </span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">{t('adminInvoices.issuedAtLabel')}</span>
                <span className="adm-detail-value">{formattedDate(selectedInvoice.issuedAt)}</span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">{t('adminInvoices.dueDateLabel')}</span>
                <span className="adm-detail-value">{formattedDate(selectedInvoice.dueDate)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
