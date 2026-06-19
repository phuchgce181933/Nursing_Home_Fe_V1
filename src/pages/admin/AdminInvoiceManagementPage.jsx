import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Eye, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import adminInvoiceService from '../../services/adminInvoice.service';
import residentService from '../../services/resident.service';

export default function AdminInvoiceManagementPage() {
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
      setError(err.response?.data?.message || 'Không thể tải danh sách hóa đơn.');
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
      issued: 'Đã phát hành',
      partially_paid: 'Đã thanh toán một phần',
      paid: 'Đã thanh toán',
      overdue: 'Quá hạn',
      cancelled: 'Đã hủy',
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
            <DollarSign size={28} /> Quản lý hóa đơn
          </h1>
          <p>Danh sách hóa đơn cho admin, lọc theo trạng thái và tìm kiếm theo mã hóa đơn.</p>
        </div>
        <div className="adm-header__buttons">
          <button type="button" className="adm-btn-secondary" onClick={handleResetFilters}>
            Reset bộ lọc
          </button>
          <button type="button" className="adm-btn-refresh" onClick={loadInvoices}>
            <RefreshCw size={18} /> Làm mới
          </button>
        </div>
      </div>

      <div className="adm-filter-panel">
        <div className="adm-filter-grid">
          <div className="adm-filter-group">
            <label>Mã hóa đơn</label>
            <div className="adm-filter-input-wrapper">
              <Search size={16} className="adm-filter-input-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mã hóa đơn"
              />
            </div>
          </div>

          <div className="adm-filter-group">
            <label>Cư dân</label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
            >
              <option value="">Tất cả cư dân</option>
              {residents.map((resident) => (
                <option key={resident._id} value={resident._id}>
                  {resident.fullName || resident.name || resident._id}
                </option>
              ))}
            </select>
            {residentsLoading && <div className="adm-filter-loading">Đang tải danh sách cư dân...</div>}
          </div>

          <div className="adm-filter-group">
            <label>Ngày phát hành từ</label>
            <input
              type="date"
              value={issueFrom}
              onChange={(e) => setIssueFrom(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>Ngày phát hành đến</label>
            <input
              type="date"
              value={issueTo}
              onChange={(e) => setIssueTo(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>Ngày đến hạn từ</label>
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>Ngày đến hạn đến</label>
            <input
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
            />
          </div>

          <div className="adm-filter-group">
            <label>Số tiền min</label>
            <input
              type="number"
              min="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="adm-filter-group">
            <label>Số tiền max</label>
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
              Chỉ hóa đơn quá hạn
            </label>
          </div>

          <div className="adm-filter-group">
            <label>Sắp xếp</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="issuedAt">Ngày phát hành</option>
              <option value="dueDate">Ngày đến hạn</option>
              <option value="totalAmount">Tổng tiền</option>
              <option value="invoiceNumber">Mã hóa đơn</option>
            </select>
          </div>

          <div className="adm-filter-group">
            <label>Thứ tự</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Giảm dần</option>
              <option value="asc">Tăng dần</option>
            </select>
          </div>

          <div className="adm-filter-group">
            <label>Trạng thái</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="issued">Đã phát hành</option>
              <option value="partially_paid">Đã thanh toán một phần</option>
              <option value="paid">Đã thanh toán</option>
              <option value="overdue">Quá hạn</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="adm-error-banner">{error}</div>}

      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Mã hóa đơn</th>
              <th>Cư dân</th>
              <th>Tổng</th>
              <th>Trạng thái</th>
              <th>Ngày phát hành</th>
              <th>Hạn thanh toán</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="adm-table-loading">
                  Đang tải...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="adm-table-empty">
                  Không có hóa đơn.
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
                      <Eye size={16} /> Chi tiết
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
        <span>{`Trang ${page} / ${totalPages}`}</span>
        <button type="button" className="adm-btn-pagination" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight size={16} />
        </button>
      </div>

      {selectedInvoice && (
        <div className="adm-detail-overlay" onClick={closeDetail}>
          <div className="adm-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-detail-header">
              <h2>Chi tiết hóa đơn</h2>
              <button type="button" className="adm-btn-secondary" onClick={closeDetail}>
                Đóng
              </button>
            </div>
            <div className="adm-detail-grid">
              <div className="adm-detail-item">
                <span className="adm-detail-label">Mã hóa đơn</span>
                <span className="adm-detail-value">{selectedInvoice.invoiceNumber || '-'}</span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">Cư dân</span>
                <span className="adm-detail-value">{selectedInvoice.residentId?.fullName || selectedInvoice.residentId || '-'}</span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">Trạng thái</span>
                <span className="adm-detail-value">
                  <span className={getStatusBadgeClass(selectedInvoice.status)}>{translateStatus(selectedInvoice.status)}</span>
                </span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">Tổng tiền</span>
                <span className="adm-detail-value">{selectedInvoice.totalAmount?.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="adm-detail-item adm-detail-item--full">
                <span className="adm-detail-label">Chi phí chi tiết</span>
                <span className="adm-detail-value">
                  Phòng: {selectedInvoice.roomCost?.toLocaleString('vi-VN')}₫ · Dịch vụ: {selectedInvoice.careServiceCost?.toLocaleString('vi-VN')}₫ · Thuốc: {selectedInvoice.medicationCost?.toLocaleString('vi-VN')}₫ · Khác: {selectedInvoice.otherCost?.toLocaleString('vi-VN')}₫
                </span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">Ngày phát hành</span>
                <span className="adm-detail-value">{formattedDate(selectedInvoice.issuedAt)}</span>
              </div>
              <div className="adm-detail-item">
                <span className="adm-detail-label">Hạn thanh toán</span>
                <span className="adm-detail-value">{formattedDate(selectedInvoice.dueDate)}</span>
              </div>
              <div className="adm-detail-item adm-detail-item--full">
                <span className="adm-detail-label">Ghi chú</span>
                <span className="adm-detail-value">{selectedInvoice.note || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
