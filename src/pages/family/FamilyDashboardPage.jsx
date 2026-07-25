import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, CreditCard, Package, Users, Wallet, PlusCircle, Search, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import residentService from '../../services/resident.service';
import familyPortalService from '../../services/familyPortal.service';
import '../../styles/family/FamilyDashboardPage.css';

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

const TOPUP_MIN = 10000;
const TOPUP_MAX = 500000000;

const PACKAGE_PRICES = {
  'Gói Cơ Bản': 8000000,
  'Gói Tiêu Chuẩn': 15000000,
  'Gói Cao Cấp': 25000000,
  'Gói VIP': 45000000,
};

const getPackagePrice = (resident) => {
  if (resident?.servicePackagePrice != null) return resident.servicePackagePrice;
  return PACKAGE_PRICES[resident?.servicePackage] || null;
};

const getPackagePriceLabel = (resident) => {
  const monthlyPrice = getPackagePrice(resident);
  if (monthlyPrice == null) return null;
  return `${formatMoney(monthlyPrice)} / tháng`;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1]?.[0]?.toUpperCase() || '?';
};

const INVOICE_STATUS_LABELS = {
  PAID: 'Đã thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
};

const getInvoiceStatusLabel = (status) => INVOICE_STATUS_LABELS[status] || 'Chưa thanh toán';

const INVOICE_GROUPS = [
  { key: 'service', label: 'Hóa đơn dịch vụ', icon: '📋', theme: 'service', match: (inv) => inv.type === 'SERVICE' || !inv.type },
  { key: 'medication', label: 'Hóa đơn thuốc', icon: '💊', theme: 'medication', match: (inv) => inv.type === 'MEDICATION' },
  { key: 'other', label: 'Hóa đơn khác', icon: '🧾', theme: 'other', match: (inv) => inv.type && inv.type !== 'SERVICE' && inv.type !== 'MEDICATION' },
];

function FamilyDashboardPage() {
  const [residents, setResidents] = useState([]);
  const [invoicesList, setInvoicesList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingInvoiceFor, setCreatingInvoiceFor] = useState(null);
  const [walletInfo, setWalletInfo] = useState({ balance: 0, totalTopup: 0, totalSpent: 0 });
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState(null);
  const [topupAmount, setTopupAmount] = useState(500000);
  const [isTopupProcessing, setIsTopupProcessing] = useState(false);
  const [isWalletPaymentProcessing, setIsWalletPaymentProcessing] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpId, setOtpId] = useState(null);
  const [otpMaskedPhone, setOtpMaskedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [pendingWalletPayment, setPendingWalletPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState({});
  const [currentResidentPayment, setCurrentResidentPayment] = useState(null);
  const [isBatchPaymentProcessing, setIsBatchPaymentProcessing] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [expandedResidentIds, setExpandedResidentIds] = useState(new Set());
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState(new Set());
  const [checkoutLoadingInvoiceId, setCheckoutLoadingInvoiceId] = useState(null);
  const navigate = useNavigate();

  const toggleResident = (residentId) => {
    setExpandedResidentIds((prev) => {
      const next = new Set(prev);
      if (next.has(residentId)) next.delete(residentId);
      else next.add(residentId);
      return next;
    });
  };

  const toggleInvoice = (invoiceId) => {
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  useEffect(() => {
    const loadResidents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await residentService.getFamilyResidentList();
        setResidents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    loadResidents();
  }, []);

  useEffect(() => {
    if (residents.length === 0) return;

    const loadInvoices = async () => {
      const entries = await Promise.all(
        residents.map(async (resident) => {
          try {
            const invoices = await familyPortalService.getResidentInvoices(resident._id);
            return [resident._id, Array.isArray(invoices) ? invoices : invoices?.data || []];
          } catch {
            return [resident._id, []];
          }
        })
      );
      setInvoicesList(Object.fromEntries(entries));
    };

    loadInvoices();
  }, [residents]);

  useEffect(() => {
    const loadWallet = async () => {
      try {
        setWalletLoading(true);
        setWalletError(null);
        const payload = await familyPortalService.getWalletBalance();
        setWalletInfo(payload);
      } catch (err) {
        setWalletError(err?.response?.data?.message || err.message || 'Không thể tải số dư ví');
      } finally {
        setWalletLoading(false);
      }
    };

    loadWallet();
  }, []);

  const handleOpenCheckout = async (residentId, invoiceId) => {
    if (!invoiceId) return;
    try {
      setCheckoutLoadingInvoiceId(invoiceId);
      setError(null);
      const payload = await familyPortalService.getInvoicePaymentUrl(residentId, invoiceId);
      if (payload?.paymentUrl) {
        window.open(payload.paymentUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to get checkout URL:', err);
      setError(err?.response?.data?.message || err.message || 'Không thể mở trang thanh toán');
    } finally {
      setCheckoutLoadingInvoiceId(null);
    }
  };

  const handleWalletTopup = async () => {
    if (!topupAmount || topupAmount <= 0) {
      setWalletError('Số tiền nạp phải lớn hơn 0');
      return;
    }
    if (topupAmount < TOPUP_MIN) {
      setWalletError(`Số tiền nạp tối thiểu là ${formatMoney(TOPUP_MIN)}`);
      return;
    }
    if (topupAmount > TOPUP_MAX) {
      setWalletError(`Số tiền nạp tối đa là ${formatMoney(TOPUP_MAX)}`);
      return;
    }

    try {
      setIsTopupProcessing(true);
      setWalletError(null);
      const payload = await familyPortalService.generateWalletTopupUrl(topupAmount);
      if (payload?.checkoutUrl) {
        window.open(payload.checkoutUrl, '_blank');
      }
    } catch (err) {
      console.error('Wallet topup error:', err);
      setWalletError(err?.response?.data?.message || err.message || 'Không thể tạo yêu cầu nạp tiền');
    } finally {
      setIsTopupProcessing(false);
    }
  };

  const handlePayWithWallet = async (residentId, invoiceId, amount) => {
    if (walletInfo.balance < amount) {
      setWalletError('Số dư ví không đủ để thanh toán hóa đơn.');
      return;
    }

    try {
      setWalletError(null);
      setOtpError(null);
      setIsWalletPaymentProcessing(true);

      const payload = await familyPortalService.initiateWalletPayment({
        amount,
        invoiceIds: [invoiceId],
      });

      setOtpId(payload.otpId);
      setOtpMaskedPhone(payload.maskedPhone || '');
      setOtpCode('');
      setPendingWalletPayment({ residentId, invoiceIds: [invoiceId], amount });
      setShowOtpModal(true);
    } catch (err) {
      console.error('Wallet payment failed:', err);
      setWalletError(err?.response?.data?.message || err.message || 'Không thể gửi yêu cầu OTP xác thực');
    } finally {
      setIsWalletPaymentProcessing(false);
    }
  };

  const handleVerifyWalletOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError('Vui lòng nhập mã OTP.');
      return;
    }

    if (!otpId) {
      setOtpError('OTP không hợp lệ. Vui lòng thử lại.');
      return;
    }

    try {
      setOtpError(null);
      setIsOtpVerifying(true);
      await familyPortalService.verifyWalletPayment({ otpId, code: otpCode });

      if (pendingWalletPayment?.residentId) {
        const updatedInvoices = await familyPortalService.getResidentInvoices(pendingWalletPayment.residentId);
        setInvoicesList(prev => ({
          ...prev,
          [pendingWalletPayment.residentId]: Array.isArray(updatedInvoices) ? updatedInvoices : updatedInvoices?.data || [],
        }));
      }
      const updatedWallet = await familyPortalService.getWalletBalance();
      setWalletInfo(updatedWallet);
      setShowOtpModal(false);
      setOtpId(null);
      setOtpMaskedPhone('');
      setOtpCode('');
      setPendingWalletPayment(null);
    } catch (err) {
      console.error('OTP verification failed:', err);
      setOtpError(err?.response?.data?.message || err.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handleResendWalletOtp = async () => {
    if (!pendingWalletPayment) return;
    try {
      setOtpError(null);
      setIsWalletPaymentProcessing(true);
      const payload = await familyPortalService.initiateWalletPayment({
        amount: pendingWalletPayment.amount,
        invoiceIds: pendingWalletPayment.invoiceIds,
      });
      setOtpId(payload.otpId);
      setOtpMaskedPhone(payload.maskedPhone || '');
      setOtpCode('');
    } catch (err) {
      console.error('OTP resend failed:', err);
      setOtpError(err?.response?.data?.message || err.message || 'Không thể gửi lại mã OTP');
    } finally {
      setIsWalletPaymentProcessing(false);
    }
  };

  const handleCreateInvoice = async (resident) => {
    const packagePrice = getPackagePrice(resident);
    if (!packagePrice) {
      setError('Không xác định được giá gói dịch vụ. Vui lòng kiểm tra thông tin gói.');
      return;
    }

    setCreatingInvoiceFor(resident._id);
    try {
      const payload = {
        careServiceCost: packagePrice,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const createdInvoice = await familyPortalService.createInvoice(resident._id, payload);
      
      // Reload invoices
      const updatedInvoices = await familyPortalService.getResidentInvoices(resident._id);
      setInvoicesList(prev => ({
        ...prev,
        [resident._id]: Array.isArray(updatedInvoices) ? updatedInvoices : updatedInvoices?.data || [],
      }));
      
      const paymentPayload = await familyPortalService.getInvoicePaymentUrl(resident._id, createdInvoice._id);
      if (paymentPayload?.paymentUrl) {
        window.open(paymentPayload.paymentUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError(err?.response?.data?.message || err.message || 'Không thể tạo hóa đơn');
    } finally {
      setCreatingInvoiceFor(null);
    }
  };

  const handleOpenPaymentModal = (resident) => {
    const invoices = invoicesList[resident._id] || [];
    const serviceInvoices = invoices.filter(inv => (inv.type === 'SERVICE' || !inv.type) && inv.status !== 'PAID');
    const medicationInvoices = invoices.filter(inv => inv.type === 'MEDICATION' && inv.status !== 'PAID');

    if (serviceInvoices.length === 0 && medicationInvoices.length === 0) {
      setError('Không có hóa đơn chưa thanh toán để thanh toán.');
      return;
    }

    setCurrentResidentPayment({
      resident,
      serviceInvoices,
      medicationInvoices,
    });
    
    // Default: select both if both exist
    const defaultSelection = {};
    if (serviceInvoices.length > 0) defaultSelection.service = true;
    if (medicationInvoices.length > 0) defaultSelection.medication = true;
    setSelectedPackages(defaultSelection);
    setShowPaymentModal(true);
  };

  const handleBatchPayment = async (paymentMethod) => {
    if (!currentResidentPayment) return;

    const { resident, serviceInvoices, medicationInvoices } = currentResidentPayment;
    const invoiceIds = [];

    if (selectedPackages.service && serviceInvoices.length > 0) {
      invoiceIds.push(...serviceInvoices.map(inv => inv._id));
    }
    if (selectedPackages.medication && medicationInvoices.length > 0) {
      invoiceIds.push(...medicationInvoices.map(inv => inv._id));
    }

    if (invoiceIds.length === 0) {
      setWalletError('Vui lòng chọn ít nhất một gói để thanh toán.');
      return;
    }

    // Calculate total amount
    let totalAmount = 0;
    if (selectedPackages.service) {
      serviceInvoices.forEach(inv => {
        totalAmount += inv.totalAmount || 0;
      });
    }
    if (selectedPackages.medication) {
      medicationInvoices.forEach(inv => {
        totalAmount += inv.totalAmount || 0;
      });
    }

    if (paymentMethod === 'wallet') {
      if (walletInfo.balance < totalAmount) {
        setWalletError(`Số dư ví không đủ. Cần ${formatMoney(totalAmount)}, hiện có ${formatMoney(walletInfo.balance)}`);
        return;
      }
    }

    try {
      setWalletError(null);
      setIsBatchPaymentProcessing(true);

      if (paymentMethod === 'payos') {
        // Call batch payment endpoint with PayOS method
        const response = await familyPortalService.batchPayment(resident._id, {
          invoiceIds,
          paymentMethod: 'payos',
        });

        if (response.checkoutUrl) {
          // Redirect to PayOS checkout
          window.open(response.checkoutUrl, '_blank');
          setShowPaymentModal(false);
        }
      } else {
        // For wallet payment
        const response = await familyPortalService.batchPayment(resident._id, {
          invoiceIds,
          paymentMethod: 'wallet',
        });

        if (response) {
          setWalletError(null);
          // Reload invoices
          const updatedInvoices = await familyPortalService.getResidentInvoices(resident._id);
          setInvoicesList(prev => ({
            ...prev,
            [resident._id]: Array.isArray(updatedInvoices) ? updatedInvoices : updatedInvoices?.data || [],
          }));
          // Reload wallet
          const updatedWallet = await familyPortalService.getWalletBalance();
          setWalletInfo(updatedWallet);
          setShowPaymentModal(false);
        }
      }
    } catch (err) {
      console.error('Batch payment error:', err);
      setWalletError(err?.response?.data?.message || err.message || 'Không thể thanh toán theo gói');
    } finally {
      setIsBatchPaymentProcessing(false);
    }
  };

  const residentSearchQuery = residentSearch.trim().toLowerCase();
  const filteredResidents = residentSearchQuery
    ? residents.filter((resident) =>
        (resident.fullName || '').toLowerCase().includes(residentSearchQuery) ||
        (resident.residentCode || '').toLowerCase().includes(residentSearchQuery)
      )
    : residents;

  return (
    <div className="page-family-dashboard">
      <header className="page-header">
        <div>
          <h1>Trang Gia đình</h1>
          <p>Xem gói dịch vụ đã đăng ký và các khoản phí cần thanh toán cho cư dân của bạn.</p>
        </div>
      </header>

      <section className="wallet-summary-card">
        <div className="wallet-summary-header">
          <div>
            <h2>Ví điện tử</h2>
            <p>Quản lý số dư và nạp tiền nhanh bằng PayOS.</p>
          </div>
          <div className="wallet-icon">
            <Wallet size={24} />
          </div>
        </div>

        <div className="wallet-summary-body">
          {walletLoading ? (
            <div className="wallet-loading">Đang tải số dư ví...</div>
          ) : (
            <>
              <div className="wallet-balance-row">
                <span>Số dư hiện tại</span>
                <strong>{formatMoney(walletInfo.balance)}</strong>
              </div>
              <div className="wallet-metrics-row">
                <div>
                  <span>Tổng đã nạp </span>
                  <strong>{formatMoney(walletInfo.totalTopup)}</strong>
                </div>
                <div>
                  <span>Tổng đã chi </span>
                  <strong> {formatMoney(walletInfo.totalSpent)}</strong>
                </div>
              </div>
            </>
          )}

          {walletError && (
            <div className="alert alert-error wallet-alert">
              <AlertTriangle size={16} /> {walletError}
            </div>
          )}

          <div className="wallet-topup-form">
            <label htmlFor="wallet-topup-amount">Số tiền nạp (VND)</label>
            <div className="wallet-topup-input-group">
              <input
                id="wallet-topup-amount"
                type="number"
                min={TOPUP_MIN}
                max={TOPUP_MAX}
                step="1000"
                value={topupAmount}
                onChange={(event) => setTopupAmount(Number(event.target.value))}
              />
              <button
                type="button"
                className="button button-primary"
                onClick={handleWalletTopup}
                disabled={isTopupProcessing || walletLoading}
              >
                {isTopupProcessing ? 'Đang tạo yêu cầu...' : 'Nạp tiền vào ví'}
                <PlusCircle size={16} />
              </button>
            </div>
            <span className="wallet-topup-hint">
              Tối thiểu {formatMoney(TOPUP_MIN)} · Tối đa {formatMoney(TOPUP_MAX)}
            </span>
          </div>
        </div>
      </section>

      {loading && (
        <div className="loading-state">Đang tải thông tin cư dân...</div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {!loading && residents.length === 0 && (
        <div className="alert alert-info">
          <Users size={18} /> Bạn chưa liên kết với cư dân nào trong hệ thống.
        </div>
      )}

      {residents.length > 0 && (
        <div className="family-resident-toolbar">
          <div className="family-resident-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã cư dân..."
              value={residentSearch}
              onChange={(event) => setResidentSearch(event.target.value)}
            />
          </div>
          <span className="family-resident-count">{filteredResidents.length}/{residents.length} cư dân</span>
        </div>
      )}

      <div className="family-resident-list">
        {filteredResidents.length === 0 && !loading && residents.length > 0 && (
          <div className="alert alert-info">
            <Users size={18} /> Không tìm thấy cư dân phù hợp với từ khóa tìm kiếm.
          </div>
        )}
        {filteredResidents.map((resident) => {
          const invoices = invoicesList[resident._id] || [];
          const hasServicePackage = Boolean(resident.servicePackage);
          const latestInvoice = invoices[0] || null;

          return (
            <ResidentListItem
              key={resident._id}
              resident={resident}
              invoices={invoices}
              latestInvoice={latestInvoice}
              hasServicePackage={hasServicePackage}
              isExpanded={expandedResidentIds.has(resident._id)}
              onToggle={() => toggleResident(resident._id)}
              expandedInvoiceIds={expandedInvoiceIds}
              onToggleInvoice={toggleInvoice}
              onOpenCheckout={handleOpenCheckout}
              onPayWithWallet={handlePayWithWallet}
              onCreateInvoice={handleCreateInvoice}
              creatingInvoiceFor={creatingInvoiceFor}
              isWalletPaymentProcessing={isWalletPaymentProcessing}
              walletLoading={walletLoading}
              checkoutLoadingInvoiceId={checkoutLoadingInvoiceId}
            />
          );
        })}
      </div>

      {/* OTP verification modal for wallet payments */}
      {showOtpModal && (
        <div className="otp-modal-backdrop" onClick={() => setShowOtpModal(false)}>
          <div className="otp-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Xác thực thanh toán bằng SMS OTP</h3>
            <p>Chúng tôi đã gửi mã OTP đến số <strong>{otpMaskedPhone || '***'}.</strong></p>
            <label htmlFor="wallet-otp-code">Mã OTP</label>
            <input
              id="wallet-otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder="Nhập mã OTP"
              className="otp-input"
              maxLength={6}
            />
            {otpError && <div className="otp-error">{otpError}</div>}
            <div className="otp-actions">
              <button type="button" className="button button-secondary" onClick={handleResendWalletOtp} disabled={isWalletPaymentProcessing}>
                Gửi lại mã OTP
              </button>
              <button type="button" className="button button-primary" onClick={handleVerifyWalletOtp} disabled={isOtpVerifying}>
                {isOtpVerifying ? 'Đang xác thực...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ Resident list row (accordion) ══════════════════════ */

function ResidentListItem({
  resident, invoices, latestInvoice, hasServicePackage,
  isExpanded, onToggle, expandedInvoiceIds, onToggleInvoice,
  onOpenCheckout, onPayWithWallet, onCreateInvoice,
  creatingInvoiceFor, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId,
}) {
  const unpaidCount = invoices.filter((inv) => inv.status !== 'PAID').length;

  return (
    <article className={`family-resident-row ${isExpanded ? 'family-resident-row--open' : ''}`}>
      <button type="button" className="family-resident-row__header" onClick={onToggle}>
        <span className="family-resident-avatar">{getInitials(resident.fullName)}</span>
        <span className="family-resident-row__identity">
          <span className="family-resident-row__name">{resident.fullName || resident.residentCode || 'Cư dân'}</span>
          <span className="family-resident-row__code">Mã: {resident.residentCode || 'N/A'}</span>
        </span>
        <span className="family-resident-row__package">
          {resident.servicePackage || 'Chưa đăng ký gói dịch vụ'}
        </span>
        <span className="family-resident-row__invoice-count">
          {invoices.length} hóa đơn{unpaidCount > 0 ? ` · ${unpaidCount} chưa thanh toán` : ''}
        </span>
        <span className="status-pill">
          {latestInvoice ? (
            latestInvoice.status === 'PAID' ? (
              <span className="status-paid"><CheckCircle size={16} /> Đã thanh toán</span>
            ) : (
              <span className="status-due"><CreditCard size={16} /> Chưa thanh toán</span>
            )
          ) : (
            <span className="status-empty"><Package size={16} /> Chưa có hóa đơn</span>
          )}
        </span>
        <ChevronDown size={18} className="family-resident-row__chevron" />
      </button>

      {isExpanded && (
        <div className="family-resident-row__body">
          {resident.servicePackage && getPackagePriceLabel(resident) && (
            <div className="info-row">
              <strong>Giá gói dịch vụ:</strong>
              <span style={{ fontSize: '14px' }}>{getPackagePriceLabel(resident)}</span>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="info-row">
              <strong>Trạng thái hóa đơn:</strong>
              <span>Chưa có hóa đơn</span>
            </div>
          ) : (
            INVOICE_GROUPS.map((group) => {
              const groupInvoices = invoices.filter(group.match);
              if (groupInvoices.length === 0) return null;
              return (
                <InvoiceGroup
                  key={group.key}
                  group={group}
                  invoices={groupInvoices}
                  resident={resident}
                  expandedInvoiceIds={expandedInvoiceIds}
                  onToggleInvoice={onToggleInvoice}
                  onOpenCheckout={onOpenCheckout}
                  onPayWithWallet={onPayWithWallet}
                  isWalletPaymentProcessing={isWalletPaymentProcessing}
                  walletLoading={walletLoading}
                  checkoutLoadingInvoiceId={checkoutLoadingInvoiceId}
                />
              );
            })
          )}

          <div className="family-resident-row__actions">
            {latestInvoice && latestInvoice.status === 'PAID' ? (
              <button type="button" className="button button-secondary" disabled>
                Đã thanh toán hết
              </button>
            ) : hasServicePackage && PACKAGE_PRICES[resident.servicePackage] ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => onCreateInvoice(resident)}
                disabled={creatingInvoiceFor === resident._id}
              >
                {creatingInvoiceFor === resident._id ? 'Đang tạo hóa đơn...' : 'Tạo hóa đơn'}
              </button>
            ) : (
              <button type="button" className="button button-secondary" disabled>
                {hasServicePackage ? 'Chưa có thông tin giá gói' : 'Chưa có khoản phí'}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/* ══════════════════════ Invoice group + row (nested accordion) ══════════════════════ */

function InvoiceGroup({ group, invoices, resident, expandedInvoiceIds, onToggleInvoice, onOpenCheckout, onPayWithWallet, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId }) {
  return (
    <div className={`family-invoice-group family-invoice-group--${group.theme}`}>
      <div className="family-invoice-group__title">{group.icon} {group.label}</div>
      {invoices.map((invoice, idx) => (
        <InvoiceRow
          key={invoice._id || idx}
          invoice={invoice}
          theme={group.theme}
          resident={resident}
          isExpanded={expandedInvoiceIds.has(invoice._id)}
          onToggle={() => onToggleInvoice(invoice._id)}
          onOpenCheckout={onOpenCheckout}
          onPayWithWallet={onPayWithWallet}
          isWalletPaymentProcessing={isWalletPaymentProcessing}
          walletLoading={walletLoading}
          checkoutLoadingInvoiceId={checkoutLoadingInvoiceId}
        />
      ))}
    </div>
  );
}

const INVOICE_COST_FIELDS_BY_THEME = {
  service: [
    { key: 'careServiceCost', label: 'Phí dịch vụ chăm sóc', showIf: (inv) => inv.careServiceCost > 0 || inv.roomCost > 0 },
    { key: 'roomCost', label: 'Phí xét nghiệm' },
    { key: 'otherCost', label: 'Chi phí khác' },
  ],
  medication: [
    { key: 'medicationCost', label: 'Phí thuốc' },
    { key: 'otherCost', label: 'Chi phí khác' },
  ],
  other: [],
};

function InvoiceRow({ invoice, theme, resident, isExpanded, onToggle, onOpenCheckout, onPayWithWallet, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId }) {
  const invoiceStatus = invoice?.status?.toString().toUpperCase?.();
  const invoiceTotalAmount = invoice?.totalAmount ?? invoice?.total ?? 0;
  const isPaid = invoiceStatus === 'PAID';
  const costFields = INVOICE_COST_FIELDS_BY_THEME[theme] || [];
  const isCheckoutLoading = checkoutLoadingInvoiceId === invoice._id;

  return (
    <div className={`family-invoice-row ${isExpanded ? 'family-invoice-row--open' : ''}`}>
      <button type="button" className="family-invoice-row__summary" onClick={onToggle}>
        <span className="family-invoice-row__number">{invoice.invoiceNumber}</span>
        <span className="family-invoice-row__due">
          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('vi-VN') : '-'}
        </span>
        <span className={`family-invoice-row__status ${isPaid ? 'is-paid' : 'is-due'}`}>
          {getInvoiceStatusLabel(invoiceStatus)}
        </span>
        <span className="family-invoice-row__total">{formatMoney(invoiceTotalAmount)}</span>
        <ChevronDown size={16} className="family-invoice-row__chevron" />
      </button>

      {isExpanded && (
        <div className="family-invoice-row__detail">
          {costFields.map((field) => (
            (field.showIf ? field.showIf(invoice) : invoice[field.key] > 0) && (
              <div className="info-row" key={field.key} style={{ marginBottom: '6px', fontSize: '13px' }}>
                <strong>{field.label}:</strong>
                <span>{formatMoney(invoice[field.key])}</span>
              </div>
            )
          ))}
          {invoice.items && invoice.items.length > 0 && (
            <div style={{ marginTop: '8px', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Chi tiết khoản phí:</div>
              {invoice.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <div style={{ color: '#0f172a' }}>{it.description || it.name || 'Khoản phí'}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatMoney(it.amount)}</div>
                </div>
              ))}
            </div>
          )}
          <div className={`family-invoice-row__grand-total family-invoice-row__grand-total--${theme}`}>
            <strong>Tổng:</strong>
            <span>{formatMoney(invoiceTotalAmount)}</span>
          </div>
          {!isPaid && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button button-primary"
                onClick={() => onOpenCheckout(resident._id, invoice._id)}
                disabled={isCheckoutLoading}
              >
                {isCheckoutLoading ? 'Đang mở...' : 'Thanh toán'}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onPayWithWallet(resident._id, invoice._id, invoiceTotalAmount)}
                disabled={isWalletPaymentProcessing || walletLoading}
              >
                {isWalletPaymentProcessing ? 'Đang...' : 'Thanh toán bằng ví'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FamilyDashboardPage;
