import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  DollarSign,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import medicalChargeService from '../../services/medicalCharge.service';
import adminInvoiceService from '../../services/adminInvoice.service';
import residentService from '../../services/resident.service';
import '../../styles/admin/AdminCommon.css';

export default function AdminMedicalChargesPage() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedCharges, setSelectedCharges] = useState(new Set());
  const [residents, setResidents] = useState({});
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const loadCharges = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await medicalChargeService.listCharges({
        page: 1,
        limit: 500,
        billingStatus: statusFilter || undefined,
      });
      setCharges(result.data || []);
      setSelectedCharges(new Set());
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải danh sách khoản phí.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadResidents = useCallback(async () => {
    try {
      const result = await residentService.getResidentList({ page: 1, limit: 500 });
      const residentMap = {};
      (result.data || []).forEach((r) => {
        residentMap[r._id] = r;
      });
      setResidents(residentMap);
    } catch (err) {
      console.error('Failed to load residents:', err);
    }
  }, []);

  useEffect(() => {
    loadCharges();
    loadResidents();
  }, [loadCharges, loadResidents]);

  const filteredCharges = charges.filter((c) => {
    const resident = residents[c.residentId];
    const residentName = resident?.fullName || '';
    const matchSearch =
      c.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
      residentName.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const normalizeChargeId = (id) => String(id);

  const toggleChargeSelection = (chargeId) => {
    const normalizedId = normalizeChargeId(chargeId);
    setSelectedCharges((prev) => {
      const nextSelection = new Set(prev);
      if (nextSelection.has(normalizedId)) {
        nextSelection.delete(normalizedId);
      } else {
        nextSelection.add(normalizedId);
      }
      return nextSelection;
    });
  };

  const toggleAllSelection = () => {
    setSelectedCharges((prev) => {
      const visiblePendingChargeIds = filteredCharges
        .filter((c) => c.billingStatus === 'PENDING')
        .map((c) => normalizeChargeId(c._id));
      const allVisibleSelected = visiblePendingChargeIds.every((id) => prev.has(id));
      return allVisibleSelected ? new Set() : new Set(visiblePendingChargeIds);
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { color: '#f59e0b', label: 'Chờ tạo hóa đơn', icon: AlertCircle },
      BILLED: { color: '#3b82f6', label: 'Đã lập hóa đơn', icon: FileText },
      PAID: { color: '#10b981', label: 'Đã thanh toán', icon: CheckCircle },
      CANCELLED: { color: '#ef4444', label: 'Hủy', icon: AlertCircle },
    };
    const config = statusMap[status] || { color: '#6b7280', label: status };
    const Icon = config.icon || AlertCircle;
    return (
      <span style={{ color: config.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value || 0);
  };

  const handleGenerateInvoice = async () => {
    if (selectedCharges.size === 0) {
      setError('Vui lòng chọn ít nhất một khoản phí.');
      return;
    }

    const chargeIds = Array.from(selectedCharges);
    const groupedByResident = {};
    chargeIds.forEach((chargeId) => {
      const charge = charges.find((c) => c._id === chargeId);
      if (charge) {
        if (!groupedByResident[charge.residentId]) {
          groupedByResident[charge.residentId] = [];
        }
        groupedByResident[charge.residentId].push(charge);
      }
    });

    if (Object.keys(groupedByResident).length > 1) {
      setError('Vui lòng chỉ chọn khoản phí của một cư dân để tạo hóa đơn.');
      return;
    }

    try {
      setGeneratingInvoice(true);
      setError('');

      const residentId = Object.keys(groupedByResident)[0];
      const chargesForResident = groupedByResident[residentId];

      // Create invoice
      const invoiceData = {
        items: chargesForResident.map((c) => ({
          chargeId: c._id,
          description: c.serviceName,
          amount: c.totalPrice,
          category: c.category,
        })),
        periodStart: new Date(),
        periodEnd: new Date(),
      };

      const result = await adminInvoiceService.createInvoice(residentId, invoiceData);

      setSuccess(
        `Tạo hóa đơn thành công! Số hóa đơn: ${result.data?.invoiceNumber || 'N/A'}`
      );
      setSelectedCharges(new Set());

      setTimeout(() => {
        loadCharges();
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tạo hóa đơn.');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const totalSelected = Array.from(selectedCharges).reduce((sum, chargeId) => {
    const charge = charges.find((c) => normalizeChargeId(c._id) === chargeId);
    return sum + (charge?.totalPrice || 0);
  }, 0);

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <DollarSign size={28} /> Khoản Phí Y Tế
          </h1>
          <p>
            Xem các khoản phí tự động tạo khi bác sĩ hoàn tất khám. Chọn để tạo hóa đơn gửi gia
            đình.
          </p>
        </div>
        <div className="adm-header__buttons">
          <button
            className="adm-btn-primary"
            onClick={handleGenerateInvoice}
            disabled={selectedCharges.size === 0 || generatingInvoice}
          >
            <FileText size={16} /> Tạo hóa đơn ({selectedCharges.size})
          </button>
          <button className="adm-btn-refresh" onClick={loadCharges}>
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </div>

      {error && <div className="adm-error-banner">{error}</div>}
      {success && <div className="adm-success-banner">{success}</div>}

      <div className="adm-filters">
        <input
          type="text"
          placeholder="Tìm theo tên dịch vụ hoặc cư dân..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="adm-filter-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="adm-filter-select"
        >
          <option value="PENDING">Chờ tạo hóa đơn</option>
          <option value="BILLED">Đã lập hóa đơn</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="">Tất cả</option>
        </select>
      </div>

      {selectedCharges.size > 0 && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#166534', fontWeight: '600' }}>
            Đã chọn {selectedCharges.size} khoản. Tổng: {formatCurrency(totalSelected)}
          </span>
          <button
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={handleGenerateInvoice}
            disabled={generatingInvoice}
          >
            {generatingInvoice ? 'Đang tạo...' : 'Tạo hóa đơn ngay'}
          </button>
        </div>
      )}

      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={
                    selectedCharges.size > 0 &&
                    selectedCharges.size ===
                      filteredCharges.filter((c) => c.billingStatus === 'PENDING').length
                  }
                  onChange={toggleAllSelection}
                />
              </th>
              <th>Cư dân</th>
              <th>Dịch vụ</th>
              <th>Danh mục</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Tổng tiền</th>
              <th>Ngày thực hiện</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                  Đang tải...
                </td>
              </tr>
            ) : filteredCharges.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                  Không có khoản phí nào.
                </td>
              </tr>
            ) : (
              filteredCharges.map((charge) => {
                const resident = residents[charge.residentId];
                return (
                  <tr key={charge._id}>
                    <td style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedCharges.has(normalizeChargeId(charge._id))}
                        onChange={() => toggleChargeSelection(charge._id)}
                        disabled={charge.billingStatus !== 'PENDING'}
                      />
                    </td>
                    <td>{resident?.fullName || charge.residentId || '-'}</td>
                    <td>{charge.serviceName}</td>
                    <td>{charge.category}</td>
                    <td>{charge.quantity}</td>
                    <td>{formatCurrency(charge.unitPrice)}</td>
                    <td style={{ fontWeight: '600', color: '#059669' }}>
                      {formatCurrency(charge.totalPrice)}
                    </td>
                    <td>{formatDate(charge.performedAt)}</td>
                    <td>{getStatusBadge(charge.billingStatus)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
