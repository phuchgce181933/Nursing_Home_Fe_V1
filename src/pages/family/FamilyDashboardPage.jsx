import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, CreditCard, Package, Users, Wallet, PlusCircle, Search, ChevronDown, Eye, Printer, X } from 'lucide-react';
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
  return formatMoney(monthlyPrice);
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1]?.[0]?.toUpperCase() || '?';
};

const INVOICE_STATUS_I18N = {
  PAID: 'familyDashboard.invoice.statusPaid',
  PARTIALLY_PAID: 'familyDashboard.invoice.statusPartiallyPaid',
  CANCELLED: 'familyDashboard.invoice.statusCancelled',
};

const matchesInvoiceFilter = (invoice, filter) => {
  const status = String(invoice?.status || '').toUpperCase();
  if (filter === 'all') return true;
  if (filter === 'paid') return status === 'PAID';
  return !['PAID', 'CANCELLED'].includes(status);
};

// Generate a user-friendly invoice label like "Dịch vụ tháng 6/2026" instead of raw invoice number
const getInvoiceLabel = (invoice) => {
  // Try to get the period date from billingPeriodStart or issuedAt
  const periodDate = invoice.billingPeriodStart
    ? new Date(invoice.billingPeriodStart)
    : (invoice.issuedAt ? new Date(invoice.issuedAt) : null);

  const invoiceType = String(invoice.type || '').toUpperCase();
  let prefix = '';

  if (invoiceType === 'MEDICATION') {
    prefix = 'Thuốc';
  } else if (invoiceType === 'SERVICE') {
    prefix = 'Dịch vụ';
  } else if (invoiceType === 'OTHER') {
    prefix = 'Chi phí khác';
  } else {
    prefix = 'Hóa đơn';
  }

  if (periodDate && !isNaN(periodDate.getTime())) {
    const month = periodDate.getMonth() + 1;
    const year = periodDate.getFullYear();
    return `${prefix} tháng ${month}/${year}`;
  }

  return prefix;
};

const INVOICE_GROUPS = [
  { key: 'service', i18nKey: 'familyDashboard.invoice.serviceInvoices', icon: '', theme: 'service', match: (inv) => inv.type === 'SERVICE' || !inv.type },
  { key: 'medication', i18nKey: 'familyDashboard.invoice.medicationInvoices', icon: '', theme: 'medication', match: (inv) => inv.type === 'MEDICATION' },
  { key: 'other', i18nKey: 'familyDashboard.invoice.otherInvoices', icon: '', theme: 'other', match: (inv) => inv.type && inv.type !== 'SERVICE' && inv.type !== 'MEDICATION' },
];

function FamilyDashboardPage() {
  const { t } = useTranslation();
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
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState(new Set()); // Set<string> invoice _ids
  const [currentResidentPayment, setCurrentResidentPayment] = useState(null);
  const [isBatchPaymentProcessing, setIsBatchPaymentProcessing] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('unpaid');
  const [expandedResidentIds, setExpandedResidentIds] = useState(new Set());
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState(new Set());
  const [checkoutLoadingInvoiceId, setCheckoutLoadingInvoiceId] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null); // { invoice, resident }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [totalPreviewData, setTotalPreviewData] = useState(null); // { resident, invoices }
  const [totalPreviewLoading, setTotalPreviewLoading] = useState(false);
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
        setError(err?.response?.data?.message || err.message || t('familyDashboard.resident.loadError'));
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
        setWalletError(err?.response?.data?.message || err.message || t('familyDashboard.wallet.loading'));
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
      setError(err?.response?.data?.message || err.message || t('familyDashboard.invoice.checkoutError'));
    } finally {
      setCheckoutLoadingInvoiceId(null);
    }
  };

  // Handle preview invoice details
  const handleOpenInvoicePreview = async (residentId, invoiceId) => {
    if (!invoiceId) return;
    try {
      setPreviewLoading(true);
      setError(null);
      const invoiceDetail = await familyPortalService.getInvoiceDetail(residentId, invoiceId);
      // Find the resident
      const resident = residents.find(r => r._id === residentId) || {};
      setPreviewInvoice({ invoice: invoiceDetail, resident });
    } catch (err) {
      console.error('Failed to load invoice preview:', err);
      setError(err?.response?.data?.message || err.message || t('familyDashboard.invoice.previewError'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeInvoicePreview = () => {
    setPreviewInvoice(null);
  };

  // Handle preview of all invoices for a resident (total bill)
  const handleOpenTotalPreview = async (residentId) => {
    try {
      setTotalPreviewLoading(true);
      setError(null);
      // Load all invoice details for this resident
      const resident = residents.find(r => r._id === residentId) || {};
      const invoiceIds = (invoicesList[residentId] || []).map(inv => inv._id);
      // Fetch full details for each invoice
      const enrichedInvoices = await Promise.all(
        invoiceIds.map(async (invId) => {
          try {
            const detail = await familyPortalService.getInvoiceDetail(residentId, invId);
            return detail;
          } catch {
            return (invoicesList[residentId] || []).find(inv => inv._id === invId) || null;
          }
        })
      );
      setTotalPreviewData({ resident, invoices: enrichedInvoices.filter(Boolean) });
    } catch (err) {
      console.error('Failed to load total preview:', err);
      setError(err?.response?.data?.message || err.message || 'Không thể tải hóa đơn tổng');
    } finally {
      setTotalPreviewLoading(false);
    }
  };

  const closeTotalPreview = () => {
    setTotalPreviewData(null);
  };

  const handleWalletTopup = async () => {
    if (!topupAmount || topupAmount <= 0) {
      setWalletError(t('familyDashboard.wallet.topupPositive'));
      return;
    }
    if (topupAmount < TOPUP_MIN) {
      setWalletError(t('familyDashboard.wallet.topupMin', { min: formatMoney(TOPUP_MIN) }));
      return;
    }
    if (topupAmount > TOPUP_MAX) {
      setWalletError(t('familyDashboard.wallet.topupMax', { max: formatMoney(TOPUP_MAX) }));
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
      setWalletError(err?.response?.data?.message || err.message || t('familyDashboard.wallet.topupError'));
    } finally {
      setIsTopupProcessing(false);
    }
  };

  const handlePayWithWallet = async (residentId, invoiceId, amount) => {
    if (walletInfo.balance < amount) {
      setWalletError(t('familyDashboard.wallet.insufficientBalance'));
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
      setOtpMaskedPhone(payload.maskedRecipient || '');
      setOtpCode('');
      setPendingWalletPayment({ residentId, invoiceIds: [invoiceId], amount });
      setShowOtpModal(true);
    } catch (err) {
      console.error('Wallet payment failed:', err);
      setWalletError(err?.response?.data?.message || err.message || t('familyDashboard.wallet.paymentOtpError'));
    } finally {
      setIsWalletPaymentProcessing(false);
    }
  };

  const handleVerifyWalletOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError(t('familyDashboard.otp.emptyError'));
      return;
    }

    if (!otpId) {
      setOtpError(t('familyDashboard.otp.invalidError'));
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
      // Thanh toán theo lô: đóng luôn hộp thoại chọn hóa đơn sau khi trả xong.
      if (showPaymentModal) closePaymentModal();
    } catch (err) {
      console.error('OTP verification failed:', err);
      setOtpError(err?.response?.data?.message || err.message || t('familyDashboard.otp.verifyError'));
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
      setOtpMaskedPhone(payload.maskedRecipient || '');
      setOtpCode('');
    } catch (err) {
      console.error('OTP resend failed:', err);
      setOtpError(err?.response?.data?.message || err.message || t('familyDashboard.otp.resendError'));
    } finally {
      setIsWalletPaymentProcessing(false);
    }
  };

  const handleCreateInvoice = async (resident) => {
    const packagePrice = getPackagePrice(resident);
    if (!packagePrice) {
      setError(t('familyDashboard.invoice.packageError'));
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
      setError(err?.response?.data?.message || err.message || t('familyDashboard.invoice.createError'));
    } finally {
      setCreatingInvoiceFor(null);
    }
  };

  const handleOpenPaymentModal = (resident) => {
    const invoices = invoicesList[resident._id] || [];
    const unpaid = invoices.filter(
      (inv) => !['PAID', 'CANCELLED'].includes(String(inv.status || '').toUpperCase())
    );

    if (unpaid.length === 0) {
      setError(t('familyDashboard.invoice.noUnpaid'));
      return;
    }

    setCurrentResidentPayment({
      resident,
      unpaidInvoices: unpaid,
    });

    // Mặc định: chọn tất cả hóa đơn chưa thanh toán
    setSelectedInvoiceIds(new Set(unpaid.map((inv) => inv._id)));
    setWalletError(null);
    setShowPaymentModal(true);
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!currentResidentPayment) return;
    const { unpaidInvoices } = currentResidentPayment;
    const allIds = unpaidInvoices.map((inv) => inv._id);
    const allSelected = allIds.every((id) => selectedInvoiceIds.has(id));
    if (allSelected) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(allIds));
    }
  };

  const closePaymentModal = () => {
    if (isBatchPaymentProcessing) return;
    setShowPaymentModal(false);
    setCurrentResidentPayment(null);
    setSelectedInvoiceIds(new Set());
  };

  const handleBatchPayment = async (paymentMethod) => {
    if (!currentResidentPayment) return;

    const { resident, unpaidInvoices } = currentResidentPayment;
    const invoiceIds = unpaidInvoices
      .filter((inv) => selectedInvoiceIds.has(inv._id))
      .map((inv) => inv._id);

    if (invoiceIds.length === 0) {
      setWalletError(t('familyDashboard.wallet.selectPackage'));
      return;
    }

    // Tính tổng tiền các hóa đơn được chọn
    let totalAmount = 0;
    unpaidInvoices.forEach((inv) => {
      if (selectedInvoiceIds.has(inv._id)) {
        totalAmount += Number(inv.totalAmount || 0);
      }
    });

    if (paymentMethod === 'wallet') {
      if (walletInfo.balance < totalAmount) {
        setWalletError(t('familyDashboard.wallet.insufficientDetail', { need: formatMoney(totalAmount), have: formatMoney(walletInfo.balance) }));
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
          closePaymentModal();
        }
      } else {
        // Thanh toán bằng ví phải qua OTP: chỉ xin mã ở bước này, ví sẽ bị trừ
        // sau khi người dùng nhập đúng mã trong hộp thoại xác thực.
        const payload = await familyPortalService.initiateWalletPayment({
          amount: totalAmount,
          invoiceIds,
        });

        setOtpId(payload.otpId);
        setOtpMaskedPhone(payload.maskedRecipient || '');
        setOtpCode('');
        setOtpError(null);
        setPendingWalletPayment({ residentId: resident._id, invoiceIds, amount: totalAmount });
        setShowOtpModal(true);
      }
    } catch (err) {
      console.error('Batch payment error:', err);
      setWalletError(err?.response?.data?.message || err.message || t('familyDashboard.wallet.batchError'));
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
  const visibleResidentCount = filteredResidents.filter((resident) => {
    if (invoiceFilter === 'all') return true;
    return (invoicesList[resident._id] || []).some((invoice) => matchesInvoiceFilter(invoice, invoiceFilter));
  }).length;

  return (
    <div className="page-family-dashboard">
      <header className="page-header">
        <div>
          <h1>{t('familyDashboard.title')}</h1>
          <p>{t('familyDashboard.subtitle')}</p>
        </div>
      </header>

      <section className="wallet-summary-card">
        <div className="wallet-summary-header">
          <div>
            <h2>{t('familyDashboard.wallet.title')}</h2>
            <p>{t('familyDashboard.wallet.subtitle')}</p>
          </div>
          <div className="wallet-icon">
            <Wallet size={24} />
          </div>
        </div>

        <div className="wallet-summary-body">
          {walletLoading ? (
            <div className="wallet-loading">{t('familyDashboard.wallet.loading')}</div>
          ) : (
            <>
              <div className="wallet-balance-row">
                <span>{t('familyDashboard.wallet.currentBalance')}</span>
                <strong>{formatMoney(walletInfo.balance)}</strong>
              </div>
              <div className="wallet-metrics-row">
                <div>
                  <span>{t('familyDashboard.wallet.totalTopup')} </span>
                  <strong>{formatMoney(walletInfo.totalTopup)}</strong>
                </div>
                <div>
                  <span>{t('familyDashboard.wallet.totalSpent')} </span>
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
            <label htmlFor="wallet-topup-amount">{t('familyDashboard.wallet.topupLabel')}</label>
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
                {isTopupProcessing ? t('familyDashboard.wallet.topupProcessing') : t('familyDashboard.wallet.topupButton')}
                <PlusCircle size={16} />
              </button>
            </div>
            <span className="wallet-topup-hint">
              {t('familyDashboard.wallet.topupHint', { min: formatMoney(TOPUP_MIN), max: formatMoney(TOPUP_MAX) })}
            </span>
          </div>
        </div>
      </section>

      {loading && (
        <div className="loading-state">{t('familyDashboard.resident.loading')}</div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {!loading && residents.length === 0 && (
        <div className="alert alert-info">
          <Users size={18} /> {t('familyDashboard.resident.noResidents')}
        </div>
      )}

      {residents.length > 0 && (
        <div className="family-resident-toolbar">
          <div className="family-resident-search">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('familyDashboard.resident.searchPlaceholder')}
              value={residentSearch}
              onChange={(event) => setResidentSearch(event.target.value)}
            />
          </div>
          <label className="family-invoice-filter">
            <span>{t('familyDashboard.resident.filterLabel')}</span>
            <select value={invoiceFilter} onChange={(event) => setInvoiceFilter(event.target.value)}>
              <option value="unpaid">{t('familyDashboard.resident.filterUnpaid')}</option>
              <option value="paid">{t('familyDashboard.resident.filterPaid')}</option>
              <option value="all">{t('familyDashboard.resident.filterAll')}</option>
            </select>
          </label>
          <span className="family-resident-count">{t('familyDashboard.resident.count', { visible: visibleResidentCount, total: residents.length })}</span>
        </div>
      )}

      <div className="family-resident-list">
        {filteredResidents.length === 0 && !loading && residents.length > 0 && (
          <div className="alert alert-info">
            <Users size={18} /> {t('familyDashboard.resident.noSearchResults')}
          </div>
        )}
        {filteredResidents.map((resident) => {
          const allInvoices = invoicesList[resident._id] || [];
          const invoices = allInvoices.filter((invoice) => matchesInvoiceFilter(invoice, invoiceFilter));
          if (invoiceFilter !== 'all' && invoices.length === 0) return null;
          const hasServicePackage = Boolean(resident.servicePackage);
          const hasUnpaidServiceInvoice = allInvoices.some((invoice) =>
            (invoice.type === 'SERVICE' || !invoice.type) && matchesInvoiceFilter(invoice, 'unpaid')
          );
          const latestInvoice = invoices[0] || null;
          const totalUnpaid = allInvoices.filter(
            (inv) => !['PAID', 'CANCELLED'].includes(String(inv.status || '').toUpperCase())
          ).length;

          // Compute grand totals for all invoices of this resident
          const grandTotalAll = allInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
          const grandTotalUnpaid = allInvoices
            .filter((inv) => !['PAID', 'CANCELLED'].includes(String(inv.status || '').toUpperCase()))
            .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

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
              onOpenInvoicePreview={handleOpenInvoicePreview}
              onPayWithWallet={handlePayWithWallet}
              onCreateInvoice={handleCreateInvoice}
              onOpenPaymentModal={handleOpenPaymentModal}
              hasUnpaidServiceInvoice={hasUnpaidServiceInvoice}
              totalUnpaidCount={totalUnpaid}
              creatingInvoiceFor={creatingInvoiceFor}
              isWalletPaymentProcessing={isWalletPaymentProcessing}
              walletLoading={walletLoading}
              checkoutLoadingInvoiceId={checkoutLoadingInvoiceId}
              grandTotalAll={grandTotalAll}
              grandTotalUnpaid={grandTotalUnpaid}
              onOpenTotalPreview={() => handleOpenTotalPreview(resident._id)}
            />
          );
        })}
      </div>

      {/* OTP verification modal for wallet payments */}
      {showOtpModal && (
        <div className="otp-modal-backdrop" onClick={() => setShowOtpModal(false)}>
          <div className="otp-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t('familyDashboard.otp.title')}</h3>
            <p>{t('familyDashboard.otp.sentTo')} <strong>{otpMaskedPhone || '***'}.</strong></p>
            <label htmlFor="wallet-otp-code">{t('familyDashboard.otp.label')}</label>
            <input
              id="wallet-otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder={t('familyDashboard.otp.placeholder')}
              className="otp-input"
              maxLength={6}
            />
            {otpError && <div className="otp-error">{otpError}</div>}
            <div className="otp-actions">
              <button type="button" className="button button-secondary" onClick={handleResendWalletOtp} disabled={isWalletPaymentProcessing}>
                {t('familyDashboard.otp.resend')}
              </button>
              <button type="button" className="button button-primary" onClick={handleVerifyWalletOtp} disabled={isOtpVerifying}>
                {isOtpVerifying ? t('familyDashboard.otp.verifying') : t('familyDashboard.otp.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Thanh toán nhiều hóa đơn (chọn từng hóa đơn + thanh toán toàn bộ) */}
      {showPaymentModal && currentResidentPayment && (
        <BatchPaymentModal
          resident={currentResidentPayment.resident}
          invoices={currentResidentPayment.unpaidInvoices}
          selectedInvoiceIds={selectedInvoiceIds}
          onToggleInvoice={toggleInvoiceSelection}
          onToggleSelectAll={toggleSelectAll}
          onClose={closePaymentModal}
          onPay={handleBatchPayment}
          isProcessing={isBatchPaymentProcessing}
          walletBalance={walletInfo.balance}
          walletError={walletError}
        />
      )}

      {/* Modal: Xem trước hóa đơn */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice.invoice}
          resident={previewInvoice.resident}
          onClose={closeInvoicePreview}
          onCheckout={() => {
            closeInvoicePreview();
            handleOpenCheckout(previewInvoice.resident._id, previewInvoice.invoice._id);
          }}
          onPayWithWallet={() => {
            closeInvoicePreview();
            handlePayWithWallet(previewInvoice.resident._id, previewInvoice.invoice._id, previewInvoice.invoice.totalAmount || 0);
          }}
        />
      )}

      {/* Modal: Xem trước hóa đơn tổng */}
      {totalPreviewData && (
        <TotalInvoicePreviewModal
          resident={totalPreviewData.resident}
          invoices={totalPreviewData.invoices}
          onClose={closeTotalPreview}
        />
      )}
    </div>
  );
}

/* ══════════════════════ Batch payment modal ══════════════════════ */

function BatchPaymentModal({
  resident, invoices, selectedInvoiceIds,
  onToggleInvoice, onToggleSelectAll,
  onClose, onPay, isProcessing, walletBalance, walletError,
}) {
  const { t } = useTranslation();
  const totalSelected = invoices
    .filter((inv) => selectedInvoiceIds.has(inv._id))
    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const selectedCount = invoices.filter((inv) => selectedInvoiceIds.has(inv._id)).length;
  const allSelected = invoices.length > 0 && selectedCount === invoices.length;
  const insufficientWallet = walletBalance < totalSelected;

  return (
    <div className="otp-modal-backdrop" onClick={onClose}>
      <div
        className="otp-modal batch-payment-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, width: '95%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{t('familyDashboard.batchPayment.title') || 'Thanh toán hóa đơn'}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: '#64748b',
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p style={{ margin: '0 0 12px', color: '#475569', fontSize: '0.9rem' }}>
          {t('familyDashboard.batchPayment.subtitle', { name: resident?.fullName || resident?.residentCode || '' }) ||
            `Chọn hóa đơn cần thanh toán cho ${resident?.fullName || ''}.`}
        </p>

        {/* Chọn tất cả */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            background: '#f1f5f9',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <div
            role="button"
            tabIndex={isProcessing ? -1 : 0}
            onClick={() => !isProcessing && onToggleSelectAll()}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!isProcessing) onToggleSelectAll();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              disabled={isProcessing}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            {allSelected
              ? (t('familyDashboard.batchPayment.deselectAll') || 'Bỏ chọn tất cả')
              : (t('familyDashboard.batchPayment.selectAll') || 'Chọn tất cả')}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            {t('familyDashboard.batchPayment.selectedCount', { selected: selectedCount, total: invoices.length }) ||
              `${selectedCount}/${invoices.length} đã chọn`}
          </span>
        </div>

        {/* Danh sách hóa đơn */}
        <div
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {invoices.map((inv) => {
            const checked = selectedInvoiceIds.has(inv._id);
            const status = String(inv.status || '').toUpperCase();
            const remaining = Number(inv.remainingAmount ?? inv.totalAmount ?? 0);
            const isPartial = status === 'PARTIALLY_PAID';
            const rowClickable = !isProcessing;
            const handleRowClick = (e) => {
              // Tránh trigger 2 lần khi click thẳng vào checkbox
              if (e.target.tagName === 'INPUT') return;
              if (!rowClickable) return;
              onToggleInvoice(inv._id);
            };
            return (
              <div
                key={inv._id}
                role="button"
                tabIndex={rowClickable ? 0 : -1}
                onClick={handleRowClick}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    if (rowClickable) onToggleInvoice(inv._id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: rowClickable ? 'pointer' : 'not-allowed',
                  background: checked ? '#eff6ff' : '#fff',
                  transition: 'background 0.15s ease',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleInvoice(inv._id)}
                  disabled={isProcessing}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                    {inv.invoiceNumber || inv._id}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                    {inv.type === 'MEDICATION'
                      ? (t('familyDashboard.invoice.medicationInvoices') || 'Hóa đơn thuốc')
                      : (t('familyDashboard.invoice.serviceInvoices') || 'Hóa đơn dịch vụ')}
                    {isPartial && (
                      <span style={{ marginLeft: 6, color: '#d97706', fontWeight: 600 }}>
                        (còn {formatMoney(remaining)})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                    {formatMoney(Number(inv.totalAmount || 0))}
                  </div>
                  {isPartial && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      đã trả {formatMoney(Number(inv.totalAmount || 0) - remaining)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tổng tiền */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <span style={{ fontWeight: 600, color: '#065f46' }}>
            {t('familyDashboard.batchPayment.totalLabel') || 'Tổng tiền thanh toán'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#047857' }}>
            {formatMoney(totalSelected)}
          </strong>
        </div>

        {walletError && (
          <div
            style={{
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#b91c1c',
              fontSize: '0.85rem',
              marginBottom: 10,
            }}
          >
            {walletError}
          </div>
        )}

        {/* Nút thanh toán */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onPay('payos')}
            disabled={isProcessing || selectedCount === 0}
            style={{ flex: 1, minWidth: 140 }}
          >
            {isProcessing ? (t('familyDashboard.batchPayment.batchProcessing') || 'Đang xử lý…') : (t('familyDashboard.batchPayment.payWithPayOS') || 'Thanh toán PayOS')}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => onPay('wallet')}
            disabled={isProcessing || selectedCount === 0 || insufficientWallet}
            title={insufficientWallet ? (t('familyDashboard.wallet.insufficientBalance') || 'Số dư ví không đủ') : ''}
            style={{
              flex: 1,
              minWidth: 160,
              opacity: insufficientWallet ? 0.5 : 1,
            }}
          >
            {t('familyDashboard.batchPayment.payAllWithWallet') || 'Thanh toán toàn bộ (Ví)'}
            <span style={{ fontSize: '0.75rem', opacity: 0.85, marginLeft: 6 }}>
              ({formatMoney(walletBalance)})
            </span>
          </button>
        </div>

        {insufficientWallet && selectedCount > 0 && (
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>
            {t('familyDashboard.wallet.insufficientDetail', {
              need: formatMoney(totalSelected),
              have: formatMoney(walletBalance),
            }) || `Số dư ví không đủ (cần ${formatMoney(totalSelected)}, có ${formatMoney(walletBalance)}).`}
          </p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════ Resident list row (accordion) ══════════════════════ */

function ResidentListItem({
  resident, invoices, latestInvoice, hasServicePackage,
  isExpanded, onToggle, expandedInvoiceIds, onToggleInvoice,
  onOpenCheckout, onOpenInvoicePreview, onPayWithWallet, onCreateInvoice, onOpenPaymentModal,
  hasUnpaidServiceInvoice, totalUnpaidCount, creatingInvoiceFor, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId,
  grandTotalAll, grandTotalUnpaid, onOpenTotalPreview,
}) {
  const { t } = useTranslation();
  const unpaidCount = totalUnpaidCount ?? invoices.filter((inv) => !['PAID', 'CANCELLED'].includes(String(inv.status || '').toUpperCase())).length;

  return (
    <article className={`family-resident-row ${isExpanded ? 'family-resident-row--open' : ''}`}>
      <button type="button" className="family-resident-row__header" onClick={onToggle}>
        <span className="family-resident-avatar">{getInitials(resident.fullName)}</span>
        <span className="family-resident-row__identity">
          <span className="family-resident-row__name">{resident.fullName || resident.residentCode || t('familyDashboard.resident.defaultName')}</span>
          <span className="family-resident-row__code">{t('familyDashboard.resident.code', { code: resident.residentCode || 'N/A' })}</span>
        </span>
        <span className="family-resident-row__package">
          {resident.servicePackage || t('familyDashboard.resident.noPackage')}
        </span>
        <span className="family-resident-row__invoice-count">
          {unpaidCount > 0 ? t('familyDashboard.resident.unpaidCount', { count: invoices.length, unpaid: unpaidCount }) : t('familyDashboard.resident.invoiceCount', { count: invoices.length })}
        </span>
        <ChevronDown size={18} className="family-resident-row__chevron" />
      </button>

      {isExpanded && (
        <div className="family-resident-row__body">
          {resident.servicePackage && getPackagePriceLabel(resident) && (
            <div className="info-row">
              <strong>{t('familyDashboard.resident.packagePrice')}</strong>
              <span style={{ fontSize: '14px' }}>{getPackagePriceLabel(resident)}</span>
            </div>
          )}

          {/* Tổng hóa đơn tất cả dịch vụ */}
          {invoices.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, marginTop: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Hóa đơn tổng</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>{invoices.length} hóa đơn</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  {grandTotalUnpaid > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 2 }}>Còn nợ</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>{formatMoney(grandTotalUnpaid)}</div>
                    </>
                  )}
                  {grandTotalUnpaid === 0 && invoices.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 2 }}>Đã thanh toán</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>{formatMoney(grandTotalAll)}</div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTotalPreview && onOpenTotalPreview()}
                  style={{ padding: '5px 10px', fontSize: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Xem trước hóa đơn tổng"
                >
                  <Eye size={13} /> Xem trước
                </button>
              </div>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="info-row">
              <strong>{t('familyDashboard.resident.invoiceStatus')}</strong>
              <span>{t('familyDashboard.resident.noInvoices')}</span>
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
                  onOpenInvoicePreview={onOpenInvoicePreview}
                  onPayWithWallet={onPayWithWallet}
                  isWalletPaymentProcessing={isWalletPaymentProcessing}
                  walletLoading={walletLoading}
                  checkoutLoadingInvoiceId={checkoutLoadingInvoiceId}
                />
              );
            })
          )}

          <div className="family-resident-row__actions">
            {unpaidCount >= 2 && (
              <button
                type="button"
                className="button button-primary"
                onClick={() => onOpenPaymentModal(resident)}
              >
                {t('familyDashboard.invoice.payMultiple') || 'Thanh toán nhiều hóa đơn'} ({unpaidCount})
              </button>
            )}
            {latestInvoice && latestInvoice.status === 'PAID' ? (
              <button type="button" className="button button-secondary" disabled>
                {t('familyDashboard.invoice.allPaid')}
              </button>
            ) : latestInvoice && latestInvoice.status === 'CANCELLED' ? (
              <button type="button" className="button button-secondary" disabled>
                {t('familyDashboard.invoice.cancelled')}
              </button>
            ) : hasUnpaidServiceInvoice ? (
              <button type="button" className="button button-secondary" disabled>
                {t('familyDashboard.invoice.hasUnpaid')}
              </button>
            ) : hasServicePackage && PACKAGE_PRICES[resident.servicePackage] ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => onCreateInvoice(resident)}
                disabled={creatingInvoiceFor === resident._id}
              >
                {creatingInvoiceFor === resident._id ? t('familyDashboard.invoice.creating') : t('familyDashboard.invoice.create')}
              </button>
            ) : (
              <button type="button" className="button button-secondary" disabled>
                {hasServicePackage ? t('familyDashboard.invoice.noPriceInfo') : t('familyDashboard.invoice.noCharges')}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/* ══════════════════════ Invoice group + row (nested accordion) ══════════════════════ */

function InvoiceGroup({ group, invoices, resident, expandedInvoiceIds, onToggleInvoice, onOpenCheckout, onOpenInvoicePreview, onPayWithWallet, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId }) {
  const { t } = useTranslation();
  return (
    <div className={`family-invoice-group family-invoice-group--${group.theme}`}>
      <div className="family-invoice-group__title">{t(group.i18nKey)}</div>
      {invoices.map((invoice, idx) => (
        <InvoiceRow
          key={invoice._id || idx}
          invoice={invoice}
          theme={group.theme}
          resident={resident}
          isExpanded={expandedInvoiceIds.has(invoice._id)}
          onToggle={() => onToggleInvoice(invoice._id)}
          onOpenCheckout={onOpenCheckout}
          onOpenInvoicePreview={onOpenInvoicePreview}
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
    { key: 'careServiceCost', i18nKey: 'familyDashboard.invoice.careServiceCost', showIf: (inv) => inv.careServiceCost > 0 || inv.roomCost > 0 },
    { key: 'roomCost', i18nKey: 'familyDashboard.invoice.roomCost' },
    { key: 'otherCost', i18nKey: 'familyDashboard.invoice.otherCost' },
  ],
  medication: [
    { key: 'medicationCost', i18nKey: 'familyDashboard.invoice.medicationCost' },
    { key: 'otherCost', i18nKey: 'familyDashboard.invoice.otherCost' },
  ],
  other: [],
};

function InvoiceRow({ invoice, theme, resident, isExpanded, onToggle, onOpenCheckout, onOpenInvoicePreview, onPayWithWallet, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId }) {
  const { t } = useTranslation();
  const invoiceStatus = invoice?.status?.toString().toUpperCase?.();
  const invoiceTotalAmount = invoice?.totalAmount ?? invoice?.total ?? 0;
  const isPaid = invoiceStatus === 'PAID';
  const isCancelled = invoiceStatus === 'CANCELLED';
  const costFields = INVOICE_COST_FIELDS_BY_THEME[theme] || [];
  const isCheckoutLoading = checkoutLoadingInvoiceId === invoice._id;

  return (
    <div className={`family-invoice-row ${isExpanded ? 'family-invoice-row--open' : ''}`}>
      <button type="button" className="family-invoice-row__summary" onClick={onToggle}>
        <span className="family-invoice-row__number">{getInvoiceLabel(invoice)}</span>
        <span className="family-invoice-row__due">
          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('vi-VN') : '-'}
        </span>
        <span className={`family-invoice-row__status ${isPaid ? 'is-paid' : isCancelled ? 'is-cancelled' : 'is-due'}`}>
          {INVOICE_STATUS_I18N[invoiceStatus] ? t(INVOICE_STATUS_I18N[invoiceStatus]) : t('familyDashboard.invoice.statusUnpaid')}
        </span>
        <span className="family-invoice-row__total">{formatMoney(invoiceTotalAmount)}</span>
        <ChevronDown size={16} className="family-invoice-row__chevron" />
      </button>

      {isExpanded && (
        <div className="family-invoice-row__detail">
          {/* Invoice number for reference */}
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
            Mã: {invoice.invoiceNumber}
          </div>
          {costFields.map((field) => (
            (field.showIf ? field.showIf(invoice) : invoice[field.key] > 0) && (
              <div className="info-row" key={field.key} style={{ marginBottom: '6px', fontSize: '13px' }}>
                <strong>{t(field.i18nKey)}:</strong>
                <span>{formatMoney(invoice[field.key])}</span>
              </div>
            )
          ))}
          {invoice.items && invoice.items.length > 0 && (
            <div style={{ marginTop: '8px', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 600 }}>{t('familyDashboard.invoice.itemsDetail')}</div>
              {/* Table container with horizontal scroll */}
              <div style={{ overflowX: 'auto' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 50px 50px 1fr 1fr 55px 1fr 1fr', gap: 4, fontSize: 11, fontWeight: 600, color: '#64748b', paddingBottom: 6, borderBottom: '1px solid #e2e8f0', alignItems: 'center', minWidth: 700 }}>
                  <span style={{ textAlign: 'center' }}>STT</span>
                  <span>Tên thuốc</span>
                  <span style={{ textAlign: 'center' }}>ĐVT</span>
                  <span style={{ textAlign: 'center' }}>SL</span>
                  <span style={{ textAlign: 'right' }}>Đơn giá</span>
                  <span style={{ textAlign: 'right' }}>TT chưa thuế</span>
                  <span style={{ textAlign: 'center' }}>Thuế</span>
                  <span style={{ textAlign: 'right' }}>Tiền thuế</span>
                  <span style={{ textAlign: 'right' }}>Thành tiền</span>
                </div>
                {invoice.items.map((it, i) => {
                  const price = Number(it.price) || Number(it.unitPrice) || Number(it.amount) || 0;
                  const quantity = Number(it.quantity) || 1;
                  const taxRate = Number(it.taxRate) || 0.05;
                  const beforeTax = price * quantity;
                  const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
                  const subtotal = beforeTax + taxAmt;

                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 50px 50px 1fr 1fr 55px 1fr 1fr', gap: 4, fontSize: 13, padding: '8px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center', minWidth: 700 }}>
                      <div style={{ textAlign: 'center', color: '#64748b' }}>{i + 1}</div>
                      <div style={{ color: '#0f172a' }}>
                        <div>{it.description || it.name || t('familyDashboard.invoice.defaultItem')}</div>
                        {it.dosage && <div style={{ fontSize: 11, color: '#64748b' }}>{it.dosage} {it.unit || ''} • {it.frequency || 1}×/ngày</div>}
                      </div>
                      <div style={{ textAlign: 'center', color: '#64748b' }}>{it.unit || 'lần'}</div>
                      <div style={{ textAlign: 'center', color: '#0f172a', fontWeight: 600 }}>{quantity}</div>
                      <div style={{ textAlign: 'right', color: '#64748b' }}>{formatMoney(price)}</div>
                      <div style={{ textAlign: 'right', color: '#64748b' }}>{formatMoney(beforeTax)}</div>
                      <div style={{ textAlign: 'center', color: '#64748b' }}>{(taxRate * 100).toFixed(0)}%</div>
                      <div style={{ textAlign: 'right', color: '#64748b' }}>{formatMoney(taxAmt)}</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatMoney(subtotal)}</div>
                    </div>
                  );
                })}
                {/* Total */}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '2px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 14, fontWeight: 700, color: '#047857' }}>
                    <span>Tổng cộng (đã bao gồm VAT):</span>
                    <span style={{ width: 120, textAlign: 'right' }}>{formatMoney(invoiceTotalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Display prescription items for medication invoices that don't have items populated yet */}
          {!invoice.items || invoice.items.length === 0 && invoice.prescriptionId && (
            (() => {
              const presItems = invoice.prescriptionId?.items || [];
              if (presItems.length === 0) return null;
              return (
                <div style={{ marginTop: '8px', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 600 }}>{t('familyDashboard.invoice.itemsDetail')}</div>
                  {/* Table container with horizontal scroll */}
                  <div style={{ overflowX: 'auto' }}>
                    {/* Header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 50px 50px 1fr 1fr 55px 1fr 1fr', gap: 4, fontSize: 11, fontWeight: 600, color: '#64748b', paddingBottom: 6, borderBottom: '1px solid #e2e8f0', alignItems: 'center', minWidth: 700 }}>
                      <span style={{ textAlign: 'center' }}>STT</span>
                      <span>Tên thuốc</span>
                      <span style={{ textAlign: 'center' }}>ĐVT</span>
                      <span style={{ textAlign: 'center' }}>SL</span>
                      <span style={{ textAlign: 'right' }}>Đơn giá</span>
                      <span style={{ textAlign: 'right' }}>TT chưa thuế</span>
                      <span style={{ textAlign: 'center' }}>Thuế</span>
                      <span style={{ textAlign: 'right' }}>Tiền thuế</span>
                      <span style={{ textAlign: 'right' }}>Thành tiền</span>
                    </div>
                    {presItems.filter(item => item.isActive !== false).map((it, i) => {
                      const medName = it.medicationId?.name || it.medicationName || it.name || `Thuốc ${i + 1}`;
                      const price = Number(it.price) || Number(it.unitPrice) || 0;
                      const quantity = Number(it.quantity) || 1;
                      const taxRate = Number(it.taxRate) || 0.05;
                      const beforeTax = price * quantity;
                      const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
                      const subtotal = beforeTax + taxAmt;

                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 50px 50px 1fr 1fr 55px 1fr 1fr', gap: 4, fontSize: 13, padding: '8px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center', minWidth: 700 }}>
                          <div style={{ textAlign: 'center', color: '#64748b' }}>{i + 1}</div>
                          <div style={{ color: '#0f172a' }}>
                            <div>{medName}</div>
                            {it.dosage && <div style={{ fontSize: 11, color: '#64748b' }}>{it.dosage} {it.unit || ''} • {it.frequency || 1}×/ngày</div>}
                          </div>
                          <div style={{ textAlign: 'center', color: '#64748b' }}>{it.unit || 'viên'}</div>
                          <div style={{ textAlign: 'center', color: '#0f172a', fontWeight: 600 }}>{quantity}</div>
                          <div style={{ textAlign: 'right', color: '#64748b' }}>{price > 0 ? formatMoney(price) : '—'}</div>
                          <div style={{ textAlign: 'right', color: '#64748b' }}>{beforeTax > 0 ? formatMoney(beforeTax) : '—'}</div>
                          <div style={{ textAlign: 'center', color: '#64748b' }}>{(taxRate * 100).toFixed(0)}%</div>
                          <div style={{ textAlign: 'right', color: '#64748b' }}>{taxAmt > 0 ? formatMoney(taxAmt) : '—'}</div>
                          <div style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{subtotal > 0 ? formatMoney(subtotal) : '—'}</div>
                        </div>
                      );
                    })}
                    {/* Total */}
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '2px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 14, fontWeight: 700, color: '#047857' }}>
                        <span>Tổng cộng (đã bao gồm VAT):</span>
                        <span style={{ width: 120, textAlign: 'right' }}>{formatMoney(invoiceTotalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
          <div className={`family-invoice-row__grand-total family-invoice-row__grand-total--${theme}`}>
            <strong>{t('familyDashboard.invoice.grandTotal')}</strong>
            <span>{formatMoney(invoiceTotalAmount)}</span>
          </div>
          {isCancelled && (
            <div className="info-row" style={{ marginTop: '8px', color: '#64748b' }}>
              <strong>{t('familyDashboard.invoice.cancelReason')}</strong>
              <span>{invoice.cancellationReason || t('familyDashboard.invoice.defaultCancelReason')}</span>
            </div>
          )}
          {!isPaid && !isCancelled && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onOpenInvoicePreview(resident._id, invoice._id)}
                title={t('familyDashboard.invoice.preview') || 'Xem trước hóa đơn'}
              >
                <Eye size={14} style={{ marginRight: 4 }} />
                {t('familyDashboard.invoice.preview') || 'Xem trước'}
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => onOpenCheckout(resident._id, invoice._id)}
                disabled={isCheckoutLoading}
              >
                {isCheckoutLoading ? t('familyDashboard.invoice.checkoutLoading') : t('familyDashboard.invoice.checkout')}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onPayWithWallet(resident._id, invoice._id, invoiceTotalAmount)}
                disabled={isWalletPaymentProcessing || walletLoading}
              >
                {isWalletPaymentProcessing ? t('familyDashboard.invoice.walletPayProcessing') : t('familyDashboard.invoice.walletPay')}
              </button>
            </div>
          )}
          {isPaid && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onOpenInvoicePreview(resident._id, invoice._id)}
                title={t('familyDashboard.invoice.preview') || 'Xem trước hóa đơn'}
              >
                <Eye size={14} style={{ marginRight: 4 }} />
                {t('familyDashboard.invoice.preview') || 'Xem trước'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ Invoice Preview Modal ══════════════════════ */

function InvoicePreviewModal({ invoice, resident, onClose, onCheckout, onPayWithWallet }) {
  const { t } = useTranslation();
  const invoiceStatus = invoice?.status?.toString().toUpperCase?.();
  const invoiceTotalAmount = invoice?.totalAmount ?? invoice?.total ?? 0;
  const isPaid = invoiceStatus === 'PAID';
  const isCancelled = invoiceStatus === 'CANCELLED';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const invoiceType = String(invoice.type || '').toUpperCase();
    const isMedication = invoiceType === 'MEDICATION';

    // Build items HTML
    let itemsHtml = '';
    const presItems = invoice.prescriptionId?.items || [];
    
    if (presItems.length > 0) {
      // Calculate totals
      let totalPills = 0;
      let totalDays = 0;
      let totalBeforeTax = 0;
      let totalTax = 0;
      presItems.forEach(it => {
        const qty = Number(it.quantity) || 0;
        const freq = Number(it.frequency) || 0;
        const dur = Number(it.duration) || 0;
        if (qty > 0) {
          totalPills += qty;
        } else if (freq > 0 && dur > 0) {
          totalPills += freq * dur;
        }
        if (dur > 0) totalDays = Math.max(totalDays, dur);
        
        // Calculate price and tax
        const medPrice = Number(it.price) || Number(it.medicationId?.price) || 0;
        const taxRate = Number(it.taxRate) || 0.05;
        const beforeTax = medPrice * qty;
        const taxAmt = beforeTax * taxRate;
        totalBeforeTax += beforeTax;
        totalTax += taxAmt;
      });
      
      itemsHtml = presItems.map((it, i) => {
        const medName = it.medicationId?.name || it.medicationName || `Thuốc ${i + 1}`;
        const qty = Number(it.quantity) || 0;
        const medPrice = Number(it.price) || Number(it.medicationId?.price) || 0;
        const taxRate = Number(it.taxRate) || 0.05;
        const beforeTax = medPrice * qty;
        const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
        const subtotal = beforeTax + taxAmt;

        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${medName}</strong><br/><span style="font-size:11px;color:#555;">${it.dosage || ''} ${it.unit || ''} • ${it.frequency || 1}×/ngày</span></td>
            <td style="text-align:center;">${it.unit || 'viên'}</td>
            <td style="text-align:center;">${qty}</td>
            <td style="text-align:right;">${medPrice > 0 ? formatMoney(medPrice) : '-'}</td>
            <td style="text-align:right;">${beforeTax > 0 ? formatMoney(beforeTax) : '-'}</td>
            <td style="text-align:center;">${(taxRate * 100).toFixed(0)}%</td>
            <td style="text-align:right;">${taxAmt > 0 ? formatMoney(taxAmt) : '-'}</td>
            <td style="text-align:right; font-weight:700;">${subtotal > 0 ? formatMoney(subtotal) : '-'}</td>
          </tr>
        `;
      }).join('');
      
      // Add summary row for medications
      if (totalPills > 0 || totalDays > 0) {
        itemsHtml += `
          <tr style="background: #f0fdf4; font-weight: bold;">
            <td colspan="8">Tổng cộng: ${totalPills} viên ${totalDays > 0 ? `/ ${totalDays} ngày` : ''}</td>
            <td>${formatMoney(invoiceTotalAmount)}</td>
          </tr>
        `;
      }
    } else {
      // Show cost breakdown instead - for service invoices
      const costRows = [];
      
      // Show individual items if available (from medical charges)
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((it, i) => {
          const price = Number(it.amount) || Number(it.price) || 0;
          const quantity = Number(it.quantity) || 1;
          const taxRate = 0.05;
          const beforeTax = price * quantity;
          const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
          const subtotal = beforeTax + taxAmt;
          const itemName = it.description || it.name || `Dịch vụ ${i + 1}`;
          const unit = it.unit || 'lần';
          costRows.push(`<tr><td style="text-align:center;">${i + 1}</td><td>${itemName}</td><td style="text-align:center;">${unit}</td><td style="text-align:center;">${quantity}</td><td style="text-align:right;">${formatMoney(price)}</td><td style="text-align:right;">${formatMoney(beforeTax)}</td><td style="text-align:center;">5%</td><td style="text-align:right;">${formatMoney(taxAmt)}</td><td style="text-align:right; font-weight:700;">${formatMoney(subtotal)}</td></tr>`);
        });
      } else {
        // Fallback to summary costs
        if (invoice.careServiceCost > 0) {
          costRows.push(`<tr><td style="text-align:center;">1</td><td>Chi phí chăm sóc</td><td style="text-align:center;">tháng</td><td style="text-align:center;">1</td><td style="text-align:right;">${formatMoney(invoice.careServiceCost)}</td><td style="text-align:right;">${formatMoney(invoice.careServiceCost)}</td><td style="text-align:center;">0%</td><td style="text-align:right;">0 đ</td><td style="text-align:right;">${formatMoney(invoice.careServiceCost)}</td></tr>`);
        }
        if (invoice.roomCost > 0) {
          costRows.push(`<tr><td style="text-align:center;">2</td><td>Chi phí phòng</td><td style="text-align:center;">tháng</td><td style="text-align:center;">1</td><td style="text-align:right;">${formatMoney(invoice.roomCost)}</td><td style="text-align:right;">${formatMoney(invoice.roomCost)}</td><td style="text-align:center;">0%</td><td style="text-align:right;">0 đ</td><td style="text-align:right;">${formatMoney(invoice.roomCost)}</td></tr>`);
        }
        if (invoice.medicationCost > 0) {
          costRows.push(`<tr><td style="text-align:center;">3</td><td>Chi phí thuốc</td><td style="text-align:center;">tháng</td><td style="text-align:center;">1</td><td style="text-align:right;">${formatMoney(invoice.medicationCost)}</td><td style="text-align:right;">${formatMoney(invoice.medicationCost)}</td><td style="text-align:center;">0%</td><td style="text-align:right;">0 đ</td><td style="text-align:right;">${formatMoney(invoice.medicationCost)}</td></tr>`);
        }
        if (invoice.otherCost > 0) {
          costRows.push(`<tr><td style="text-align:center;">4</td><td>Chi phí khác</td><td style="text-align:center;">tháng</td><td style="text-align:center;">1</td><td style="text-align:right;">${formatMoney(invoice.otherCost)}</td><td style="text-align:right;">${formatMoney(invoice.otherCost)}</td><td style="text-align:center;">0%</td><td style="text-align:right;">0 đ</td><td style="text-align:right;">${formatMoney(invoice.otherCost)}</td></tr>`);
        }
      }
      itemsHtml = costRows.join('') || '<tr><td colspan="9">Không có chi tiết</td></tr>';
    }

    const periodDate = invoice.billingPeriodStart
      ? new Date(invoice.billingPeriodStart)
      : (invoice.issuedAt ? new Date(invoice.issuedAt) : null);
    const periodStr = periodDate
      ? `tháng ${periodDate.getMonth() + 1}/${periodDate.getFullYear()}`
      : '';

    const LOGO_URL = 'https://res.cloudinary.com/dhcrddnss/image/upload/c_crop,x_385,y_150,w_1250,h_1250,q_auto,f_auto/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${isMedication ? 'Đơn thuốc' : 'Hóa đơn'} - ${invoice.invoiceNumber || invoice._id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; padding: 20px; color: #000; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .header-logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 8px; }
          .header h1 { font-size: 22px; text-transform: uppercase; margin-bottom: 5px; font-weight: 700; }
          .header p { font-size: 12px; color: #555; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .info-box { border: 1px solid #ccc; padding: 10px; }
          .info-box h3 { font-size: 13px; color: #555; margin-bottom: 5px; }
          .info-box p { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #1e40af; color: white; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { font-weight: 500; }
          .total-row { font-weight: bold; font-size: 16px; }
          .total-row td { border-top: 2px solid #000; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
          .status-paid { background: #d4edda; color: #155724; }
          .status-unpaid { background: #fff3cd; color: #856404; }
          .status-cancelled { background: #f8d7da; color: #721c24; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { padding: 0; }
            th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_URL}" alt="Logo" class="header-logo" />
          <h1>${isMedication ? 'ĐƠN THUỐC' : 'HÓA ĐƠN'}</h1>
          <p>Nursing Home Management System</p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Người bệnh</h3>
            <p>${resident?.fullName || 'N/A'}</p>
            <p style="font-size: 12px; color: #555;">Mã: ${resident?.residentCode || 'N/A'}</p>
          </div>
          <div class="info-box">
            <h3>${isMedication ? 'Đơn thuốc' : 'Hóa đơn'}</h3>
            <p>Mã: ${invoice.invoiceNumber || invoice._id}</p>
            <p style="font-size: 12px; color: #555;">${periodStr}</p>
          </div>
          <div class="info-box">
            <h3>Ngày lập</h3>
            <p>${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('vi-VN') : '-'}</p>
          </div>
          <div class="info-box">
            <h3>Trạng thái</h3>
            <p>
              <span class="status ${isPaid ? 'status-paid' : isCancelled ? 'status-cancelled' : 'status-unpaid'}">
                ${isPaid ? 'Đã thanh toán' : isCancelled ? 'Đã hủy' : 'Chưa thanh toán'}
              </span>
            </p>
          </div>
        </div>

        ${invoice.diagnosisNote || invoice.prescriptionId?.diagnosisNote ? `
        <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #1e40af;">Chẩn đoán / Ghi chú:</strong>
          <p style="margin-top: 5px; color: #1e293b;">${invoice.diagnosisNote || invoice.prescriptionId?.diagnosisNote}</p>
        </div>
        ` : ''}

        <h3 style="margin-bottom: 10px;">Chi tiết ${isMedication ? 'đơn thuốc' : 'hóa đơn'}</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align:center;">STT</th>
              <th>Tên thuốc</th>
              <th style="width: 50px; text-align:center;">ĐVT</th>
              <th style="width: 45px; text-align:center;">SL</th>
              <th style="width: 95px; text-align:right;">Đơn giá</th>
              <th style="width: 110px; text-align:right;">Thành tiền chưa thuế</th>
              <th style="width: 60px; text-align:center;">Thuế suất</th>
              <th style="width: 90px; text-align:right;">Tiền thuế</th>
              <th style="width: 110px; text-align:right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="total-row">
              <td colspan="8" style="text-align: right;">TỔNG CỘNG (đã bao gồm VAT):</td>
              <td>${formatMoney(invoiceTotalAmount)}</td>
            </tr>
          </tbody>
        </table>

        ${isCancelled && invoice.cancellationReason ? `
          <div style="background: #f8d7da; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
            <strong>Lý do hủy:</strong> ${invoice.cancellationReason}
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated by Nursing Home Management System</p>
          <p>${new Date().toLocaleString('vi-VN')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="otp-modal-backdrop" onClick={onClose}>
      <div
        className="otp-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 900, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <h3 style={{ margin: 0 }}>
            {String(invoice.type || '').toUpperCase() === 'MEDICATION'
              ? (t('familyDashboard.invoice.medicationPreview') || 'Xem đơn thuốc')
              : (t('familyDashboard.invoice.invoicePreview') || 'Xem hóa đơn')}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handlePrint}
              className="button button-secondary"
              title="In hóa đơn"
              style={{ padding: '6px 12px' }}
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: '#64748b',
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Invoice Info Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Người bệnh</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{resident?.fullName || 'N/A'}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{String(invoice.type || '').toUpperCase() === 'MEDICATION' ? 'Đơn thuốc' : 'Hóa đơn'}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{getInvoiceLabel(invoice)}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Ngày lập</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('vi-VN') : '-'}
            </div>
            {invoice.dueDate && (
              <div style={{ fontSize: 12, color: '#d97706' }}>
                Hạn: {new Date(invoice.dueDate).toLocaleDateString('vi-VN')}
              </div>
            )}
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Trạng thái</div>
            <span
              className={`family-invoice-row__status ${isPaid ? 'is-paid' : isCancelled ? 'is-cancelled' : 'is-due'}`}
              style={{ fontSize: 13, padding: '4px 10px' }}
            >
              {isPaid ? (t('familyDashboard.invoice.statusPaid') || 'Đã thanh toán')
                : isCancelled ? (t('familyDashboard.invoice.statusCancelled') || 'Đã hủy')
                : (t('familyDashboard.invoice.statusUnpaid') || 'Chưa thanh toán')}
            </span>
          </div>
        </div>

        {/* Diagnosis Note - for medication invoices */}
        {(invoice.diagnosisNote || invoice.prescriptionId?.diagnosisNote) && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#1e40af', marginBottom: 4, fontWeight: 600 }}>
               Chẩn đoán / Ghi chú
            </div>
            <div style={{ fontSize: 13, color: '#1e293b' }}>
              {invoice.diagnosisNote || invoice.prescriptionId?.diagnosisNote}
            </div>
          </div>
        )}

        {/* Items List - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e40af', color: 'white' }}>
              <tr>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600 }}>STT</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Tên thuốc</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600 }}>ĐVT</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600 }}>SL</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600 }}>Đơn giá</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600 }}>TT chưa thuế</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600 }}>Thuế</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600 }}>Tiền thuế</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11, fontWeight: 600 }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {/* Show items from invoice or prescription */}
              {(invoice.prescriptionId?.items?.length > 0) ? (
                (() => {
                  const items = invoice.prescriptionId.items;
                  let totalPills = 0;
                  let totalDays = 0;
                  
                  // Calculate totals
                  items.forEach(it => {
                    const qty = Number(it.quantity) || 0;
                    const freq = Number(it.frequency) || 0;
                    const dur = Number(it.duration) || 0;
                    
                    if (qty > 0) {
                      totalPills += qty;
                    } else if (freq > 0 && dur > 0) {
                      totalPills += freq * dur;
                    }
                    if (dur > 0) totalDays = Math.max(totalDays, dur);
                  });
                  
                  return (
                    <>
                      {items.map((it, i) => {
                        const medName = it.medicationId?.name || it.medicationName || `Thuốc ${i + 1}`;
                        const qty = Number(it.quantity) || 0;
                        const medPrice = Number(it.price) || Number(it.medicationId?.price) || 0;
                        const taxRate = Number(it.taxRate) || 0.05;
                        const beforeTax = medPrice * qty;
                        const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
                        const subtotal = beforeTax + taxAmt;

                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>{i + 1}</td>
                            <td style={{ padding: '8px', fontSize: 12, verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{medName}</div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>{it.dosage || ''} {it.unit || ''} • {it.frequency || 1}×/ngày</div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>{it.unit || 'viên'}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>{qty}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>{medPrice > 0 ? formatMoney(medPrice) : '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>{beforeTax > 0 ? formatMoney(beforeTax) : '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>{(taxRate * 100).toFixed(0)}%</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>{taxAmt > 0 ? formatMoney(taxAmt) : '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{subtotal > 0 ? formatMoney(subtotal) : '-'}</td>
                          </tr>
                        );
                      })}
                      {/* Summary row for medications */}
                      {String(invoice.type || '').toUpperCase() === 'MEDICATION' && (totalPills > 0 || totalDays > 0) && (
                        <tr style={{ background: '#f0fdf4', borderTop: '2px solid #22c55e' }}>
                          <td colSpan="8" style={{ padding: '10px 8px', fontWeight: 600, color: '#166534', fontSize: 12 }}>
                            Tổng cộng: {totalPills} viên {totalDays > 0 ? `/ ${totalDays} ngày` : ''}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#166534', fontSize: 12 }}>
                            {formatMoney(invoiceTotalAmount)}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()
              ) : (
                <>
                  {/* Show items from medical charges if available */}
                  {invoice.items && invoice.items.length > 0 ? (
                    <>
                      {/* Individual items */}
                      {invoice.items.map((it, i) => {
                        const price = Number(it.amount) || 0;
                        const quantity = Number(it.quantity) || 1;
                        const itemName = it.description || it.name || `Dịch vụ ${i + 1}`;
                        const unit = it.unit || 'lần';
                        const taxAmt = Math.round(price * quantity * 0.05 * 100) / 100;
                        const subtotal = price * quantity + taxAmt;
                        return (
                          <tr key={`mc-${i}`} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>{i + 1}</td>
                            <td style={{ padding: '8px', fontSize: 12 }}>{itemName}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>{unit}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>{quantity}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(price)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(price * quantity)}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>5%</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(taxAmt)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {/* Show cost breakdown for service invoices */}
                      {invoice.careServiceCost > 0 && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>1</td>
                          <td style={{ padding: '8px', fontSize: 12 }}>{t('familyDashboard.invoice.careServiceCost')}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>tháng</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>1</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.careServiceCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.careServiceCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>0%</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>0 đ</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{formatMoney(invoice.careServiceCost)}</td>
                        </tr>
                      )}
                      {invoice.roomCost > 0 && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>2</td>
                          <td style={{ padding: '8px', fontSize: 12 }}>{t('familyDashboard.invoice.roomCost')}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>tháng</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>1</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.roomCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.roomCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>0%</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>0 đ</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{formatMoney(invoice.roomCost)}</td>
                        </tr>
                      )}
                      {invoice.medicationCost > 0 && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>3</td>
                          <td style={{ padding: '8px', fontSize: 12 }}>{t('familyDashboard.invoice.medicationCost')}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>tháng</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>1</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.medicationCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.medicationCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>0%</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>0 đ</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{formatMoney(invoice.medicationCost)}</td>
                        </tr>
                      )}
                      {invoice.otherCost > 0 && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>4</td>
                          <td style={{ padding: '8px', fontSize: 12 }}>{t('familyDashboard.invoice.otherCost')}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>tháng</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>1</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.otherCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatMoney(invoice.otherCost)}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>0%</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>0 đ</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{formatMoney(invoice.otherCost)}</td>
                        </tr>
                      )}
                    </>
                  )}
                </>
              )}
            </tbody>
            {/* Tổng cộng - chỉ hiện khi là hóa đơn dịch vụ (không phải đơn thuốc) */}
            {!invoice.prescriptionId?.items?.length && (
              <tfoot style={{ background: '#ecfdf5' }}>
                <tr>
                  <td colSpan="8" style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#166534' }}>
                    TỔNG CỘNG:
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#166534' }}>
                    {formatMoney(invoiceTotalAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Action Buttons */}
        {!isPaid && !isCancelled && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="button button-secondary" onClick={onClose}>
              {t('common.cancel') || 'Đóng'}
            </button>
            <button type="button" className="button button-secondary" onClick={onPayWithWallet}>
               {t('familyDashboard.invoice.walletPay') || 'Thanh toán ví'}
            </button>
            <button type="button" className="button button-primary" onClick={onCheckout}>
              {t('familyDashboard.invoice.checkout') || 'Thanh toán PayOS'}
            </button>
          </div>
        )}
        {(isPaid || isCancelled) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="button button-secondary" onClick={onClose}>
              {t('common.close') || 'Đóng'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════ Total Invoice Preview Modal ══════════════════════ */

function TotalInvoicePreviewModal({ resident, invoices, onClose }) {
  const { t } = useTranslation();

  // Separate SERVICE and MEDICATION invoices
  const allServiceInvoices = invoices.filter(
    (inv) => String(inv.type || '').toUpperCase() !== 'MEDICATION'
  );
  const medicationInvoices = invoices.filter(
    (inv) => String(inv.type || '').toUpperCase() === 'MEDICATION'
  );

  // Separate clinical/paraclinical invoices (has items) from basic service invoices
  const clinicalInvoices = allServiceInvoices.filter(inv => inv.items && inv.items.length > 0);
  const basicServiceInvoices = allServiceInvoices.filter(inv => !inv.items || inv.items.length === 0);

  // Compute combined service invoice: earliest start date → latest end date
  const getDateValue = (v) => (v ? new Date(v).getTime() : null);

  const serviceStartDates = allServiceInvoices
    .map((inv) => getDateValue(inv.billingPeriodStart || inv.issuedAt))
    .filter(Boolean);
  const serviceEndDates = allServiceInvoices
    .map((inv) => getDateValue(inv.billingPeriodEnd || inv.dueDate || inv.issuedAt))
    .filter(Boolean);

  const combinedServiceStart = serviceStartDates.length
    ? new Date(Math.min(...serviceStartDates))
    : null;
  const combinedServiceEnd = serviceEndDates.length
    ? new Date(Math.max(...serviceEndDates))
    : null;

  // Sum basic service invoice fields (invoices WITHOUT items)
  const combinedCareServiceCost = basicServiceInvoices.reduce(
    (s, inv) => s + Number(inv.careServiceCost || 0), 0
  );
  const combinedRoomCost = basicServiceInvoices.reduce(
    (s, inv) => s + Number(inv.roomCost || 0), 0
  );
  const combinedMedicationCost = basicServiceInvoices.reduce(
    (s, inv) => s + Number(inv.medicationCost || 0), 0
  );
  const combinedOtherCost = basicServiceInvoices.reduce(
    (s, inv) => s + Number(inv.otherCost || 0), 0
  );
  const combinedServiceTotal = basicServiceInvoices.reduce(
    (s, inv) => s + Number(inv.totalAmount || 0), 0
  );
  const combinedServiceUnpaid = basicServiceInvoices
    .filter((inv) => !['PAID', 'CANCELLED'].includes(String(inv.status || '').toUpperCase()))
    .reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);

  // Clinical invoices total
  const clinicalTotal = clinicalInvoices.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);
  const clinicalUnpaid = clinicalInvoices
    .filter((inv) => !['PAID', 'CANCELLED'].includes(String(inv.status || '').toUpperCase()))
    .reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);

  // Overall grand total
  const grandTotalAll = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const grandTotalUnpaid = invoices
    .filter((inv) => !['PAID', 'CANCELLED'].includes(String(inv.status || '').toUpperCase()))
    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  // ── Print ───────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    const formatVnd = (n) =>
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

    // ── Build unified 9-column table rows ─────────────────────────────────
    // Helper: build a section-header row spanning all 9 columns
    const sectionHeader = (label, bgColor, textColor) =>
      `<tr><td colspan="9" style="font-weight:700; padding:7px 10px; background:${bgColor}; color:${textColor}; font-size:12px;">${label}</td></tr>`;

    // Helper: build a line-item row
    const itemRow = (stt, name, unit, qty, unitPrice, subtotal, taxRate, taxAmt, total, bg) =>
      `<tr style="background:${bg || '#fff'};">
        <td style="padding:5px 8px; text-align:center; font-size:12px;">${stt}</td>
        <td style="padding:5px 8px; font-size:12px;">${name}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px;">${unit}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px;">${qty}</td>
        <td style="padding:5px 8px; text-align:right; font-size:12px;">${unitPrice > 0 ? formatVnd(unitPrice) : '-'}</td>
        <td style="padding:5px 8px; text-align:right; font-size:12px;">${subtotal > 0 ? formatVnd(subtotal) : '-'}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px;">${taxRate > 0 ? `${(taxRate * 100).toFixed(0)}%` : '0%'}</td>
        <td style="padding:5px 8px; text-align:right; font-size:12px;">${taxAmt > 0 ? formatVnd(taxAmt) : '0 đ'}</td>
        <td style="padding:5px 8px; text-align:right; font-size:12px; font-weight:600;">${total > 0 ? formatVnd(total) : '-'}</td>
      </tr>`;

    // Helper: build a section-total row spanning last 2 columns
    const sectionTotal = (label, total, bg) =>
      `<tr style="background:${bg};">
        <td colspan="8" style="text-align:right; font-weight:700; padding:6px 10px; font-size:12px;">${label}</td>
        <td style="text-align:right; font-weight:700; padding:6px 10px; font-size:12px;">${formatVnd(total)}</td>
      </tr>`;

    const tableHeader = `<tr>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:center; width:40px;">STT</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px;">Tên thuốc / Dịch vụ</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:center; width:55px;">ĐVT</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:center; width:45px;">SL</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:right; width:90px;">Đơn giá</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:right; width:105px;">TT chưa thuế</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:center; width:50px;">Thuế</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:right; width:90px;">Tiền thuế</th>
      <th style="padding:5px 8px; background:#1e293b; color:#fff; font-size:11px; text-align:right; width:105px;">Thành tiền</th>
    </tr>`;

    let tableBody = '';
    let globalStt = 1;

    // ── 1. Dịch vụ Lâm sàng & Cận lâm sàng ──────────────────────────────
    if (clinicalInvoices.length > 0) {
      tableBody += sectionHeader(
        `Hóa đơn Dịch vụ Lâm sàng & Cận lâm sàng (${clinicalInvoices.length} hóa đơn)`,
        '#fef3c7', '#92400e'
      );
      clinicalInvoices.forEach((inv) => {
        const invItems = inv.items || [];
        invItems.forEach((it, i) => {
          const price = Number(it.amount) || 0;
          const quantity = Number(it.quantity) || 1;
          const itemName = it.description || it.name || `Dịch vụ ${i + 1}`;
          const unit = it.unit || 'lần';
          const taxRate = 0.05;
          const beforeTax = price;
          const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
          const subtotal = beforeTax + taxAmt;
          tableBody += itemRow(globalStt++, itemName, unit, quantity, beforeTax, beforeTax, taxRate, taxAmt, subtotal, '#fffbeb');
        });
        // If no items, show as a single summary row
        if (invItems.length === 0) {
          const total = Number(inv.totalAmount) || 0;
          const taxAmt = Math.round(total * 0.05 * 100) / 100;
          tableBody += itemRow(globalStt++, `${inv.invoiceNumber || inv._id}`, '-', 1, total - taxAmt, total - taxAmt, 0.05, taxAmt, total, '#fffbeb');
        }
      });
      tableBody += sectionTotal('Tổng dịch vụ lâm sàng & cận lâm sàng', clinicalTotal, '#fef9c3');
    }

    // ── 2. Dịch vụ cơ bản ────────────────────────────────────────────────
    if (basicServiceInvoices.length > 0) {
      tableBody += sectionHeader(
        `Hóa đơn Dịch vụ Cơ bản (${basicServiceInvoices.length} hóa đơn)`,
        '#dcfce7', '#166534'
      );
      // Care service cost
      if (combinedCareServiceCost > 0) {
        tableBody += itemRow(globalStt++, 'Chi phí dịch vụ chăm sóc', 'tháng', 1, combinedCareServiceCost, combinedCareServiceCost, 0, 0, combinedCareServiceCost, '#f0fdf4');
      }
      if (combinedRoomCost > 0) {
        tableBody += itemRow(globalStt++, 'Chi phí phòng', 'tháng', 1, combinedRoomCost, combinedRoomCost, 0, 0, combinedRoomCost, '#f0fdf4');
      }
      if (combinedOtherCost > 0) {
        tableBody += itemRow(globalStt++, 'Chi phí khác', '-', 1, combinedOtherCost, combinedOtherCost, 0, 0, combinedOtherCost, '#f0fdf4');
      }
      tableBody += sectionTotal('Tổng dịch vụ cơ bản', combinedServiceTotal, '#dcfce7');
    }

    // ── 3. Thuốc ──────────────────────────────────────────────────────────
    if (medicationInvoices.length > 0) {
      tableBody += sectionHeader(
        `Hóa đơn Thuốc (${medicationInvoices.length} hóa đơn)`,
        '#dbeafe', '#1d4ed8'
      );
      medicationInvoices.forEach((inv) => {
        const presItems = inv.prescriptionId?.items || [];
        const activeItems = presItems.filter(it => it.isActive !== false);
        if (activeItems.length > 0) {
          activeItems.forEach((it) => {
            const medName = it.medicationId?.name || it.medicationName || `Thuốc`;
            const qty = Number(it.quantity) || 1;
            const medPrice = Number(it.price) || Number(it.medicationId?.price) || 0;
            const taxRate = Number(it.taxRate) || 0.05;
            const beforeTax = medPrice * qty;
            const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
            const subtotal = beforeTax + taxAmt;
            tableBody += itemRow(
              globalStt++,
              `${medName}${it.dosage ? `<br/><span style="font-size:10px;color:#555;">${it.dosage} ${it.unit || ''} · ${it.frequency || 1}×/ngày</span>` : ''}`,
              it.unit || 'viên',
              qty,
              medPrice,
              beforeTax,
              taxRate,
              taxAmt,
              subtotal,
              '#eff6ff'
            );
          });
        }
        // If no items, show total
        if (activeItems.length === 0) {
          const total = Number(inv.totalAmount) || 0;
          const taxAmt = Math.round(total * 0.05 * 100) / 100;
          tableBody += itemRow(globalStt++, `${inv.invoiceNumber || inv._id}`, '-', 1, total - taxAmt, total - taxAmt, 0.05, taxAmt, total, '#eff6ff');
        }
      });
    }

    const LOGO_URL = 'https://res.cloudinary.com/dhcrddnss/image/upload/c_crop,x_385,y_150,w_1250,h_1250,q_auto,f_auto/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hóa đơn tổng hợp - ${resident?.fullName || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; padding: 20px; color: #000; }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 12px; }
          .header-logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 8px; }
          .header h1 { font-size: 18px; text-transform: uppercase; margin-bottom: 4px; font-weight: 700; }
          .header p { font-size: 11px; color: #555; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
          .info-box { border: 1px solid #ccc; padding: 8px 10px; }
          .info-box h3 { font-size: 10px; color: #777; margin-bottom: 2px; text-transform: uppercase; }
          .info-box p { font-size: 13px; font-weight: bold; }
          .info-box .sub { font-size: 10px; color: #777; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #000; }
          .grand-total-row td { border-top: 2px solid #000; }
          .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #666; }
          @media print {
            body { padding: 0; }
            @page { size: A4; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_URL}" alt="Logo" class="header-logo" />
          <h1>HÓA ĐƠN TỔNG HỢP</h1>
          <p>Nursing Home Management System</p>
          <p style="font-size:11px; margin-top:6px; color:#333;">
            <strong>Địa chỉ:</strong> Số 47, Đường D17, Khu dân cư Hồng Loan, Phường Hưng Phú, TP Cần Thơ
            &nbsp;|&nbsp;
            <strong>SDT:</strong> 0833040158
            &nbsp;|&nbsp;
            <strong>Mã số thuế:</strong> 0311770883
          </p>
          <p style="font-size:11px; margin-top:2px; color:#333;">
            <strong>Số tài khoản:</strong> 10142609159617789 KienLongBank - Ngân hàng TMCP Kiên Long
          </p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Người bệnh</h3>
            <p>${resident?.fullName || 'N/A'}</p>
            <p class="sub">Mã: ${resident?.residentCode || 'N/A'}</p>
          </div>
          <div class="info-box">
            <h3>Ngày lập</h3>
            <p>${new Date().toLocaleDateString('vi-VN')}</p>
            <p class="sub">${new Date().toLocaleTimeString('vi-VN')}</p>
          </div>
          <div class="info-box">
            <h3>Tổng hóa đơn</h3>
            <p>${invoices.length} hóa đơn</p>
            <p class="sub">${invoices.filter(i => !['PAID','CANCELLED'].includes(String(i.status||'').toUpperCase())).length} chưa thanh toán</p>
          </div>
        </div>

        <table>
          <thead>${tableHeader}</thead>
          <tbody>
            ${tableBody}
            <tr class="grand-total-row" style="background:#ecfdf5;">
              <td colspan="8" style="font-weight:700; font-size:15px; text-align:right; padding:10px; color:#065f46;">TỔNG CỘNG:</td>
              <td style="font-weight:700; font-size:15px; text-align:right; padding:10px; color:#065f46;">${formatVnd(grandTotalAll)}</td>
            </tr>
            ${grandTotalUnpaid > 0 ? `
            <tr style="background:#fef2f2;">
              <td colspan="8" style="font-weight:700; font-size:13px; text-align:right; padding:8px; color:#dc2626;">CÒN NỢ:</td>
              <td style="font-weight:700; font-size:13px; text-align:right; padding:8px; color:#dc2626;">${formatVnd(grandTotalUnpaid)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>

        <div class="footer">
          <p>Hóa đơn được tạo tự động bởi Nursing Home Management System</p>
          <p>${new Date().toLocaleString('vi-VN')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="otp-modal-backdrop" onClick={onClose}>
      <div
        className="otp-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 900, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Hóa đơn tổng hợp</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handlePrint} className="button button-secondary" title="In hóa đơn" style={{ padding: '6px 12px' }}>
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', padding: 0, lineHeight: 1 }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Patient Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Người bệnh</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{resident?.fullName || 'N/A'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Mã: {resident?.residentCode || 'N/A'}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tổng hóa đơn</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{invoices.length} hóa đơn</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        {/* Invoice List */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>

          {/* ── Clinical/Paraclinical invoices ── */}
          {clinicalInvoices.length > 0 && (
            <div style={{ marginBottom: 16, border: '1px solid #d97706', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fef3c7', borderBottom: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#92400e' }}>Hóa đơn Dịch vụ Lâm sàng & Cận lâm sàng</div>
                    <div style={{ fontSize: 11, color: '#a16207' }}>{clinicalInvoices.length} hóa đơn</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{formatMoney(clinicalTotal)}</div>
                  {clinicalUnpaid > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: '#fff3cd', color: '#856404' }}>
                      Còn nợ {formatMoney(clinicalUnpaid)}
                    </span>
                  )}
                  {clinicalUnpaid === 0 && (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: '#d4edda', color: '#155724' }}>
                      Đã thanh toán
                    </span>
                  )}
                </div>
              </div>
              {/* Invoice details */}
              <div style={{ padding: '8px 12px' }}>
                {clinicalInvoices.map((inv) => {
                  const invItems = inv.items || [];
                  const invStatus = String(inv.status || '').toUpperCase();
                  const isPaid = invStatus === 'PAID';
                  const isCancelled = invStatus === 'CANCELLED';
                  
                  return (
                    <div key={inv._id} style={{ marginBottom: 10, padding: '8px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fcd34d' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                          {inv.invoiceNumber || inv._id} — {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('vi-VN') : ''}
                        </div>
                        <span style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, fontWeight: 600, background: isPaid ? '#d4edda' : isCancelled ? '#f8d7da' : '#fff3cd', color: isPaid ? '#155724' : isCancelled ? '#721c24' : '#856404' }}>
                          {isPaid ? 'Đã Thanh Toán' : isCancelled ? 'Đã hủy' : 'Chưa Thanh Toán'}
                        </span>
                      </div>
                      {invItems.map((it, i) => {
                        const price = Number(it.amount) || 0;
                        const quantity = Number(it.quantity) || 1;
                        const itemName = it.description || it.name || `Dịch vụ ${i + 1}`;
                        const unit = it.unit || 'lần';
                        const taxAmt = Math.round(price * quantity * 0.05 * 100) / 100;
                        const subtotal = price * quantity + taxAmt;
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                            <span>{itemName} ({quantity} {unit})</span>
                            <span style={{ fontWeight: 600 }}>{formatMoney(subtotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Basic SERVICE invoices ── */}
          {basicServiceInvoices.length > 0 && (
            <div style={{ marginBottom: 16, border: '1px solid #16a34a', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#dcfce7', borderBottom: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#166534' }}>Hóa đơn dịch vụ cơ bản</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {combinedServiceStart && combinedServiceEnd
                        ? `Từ ngày ${combinedServiceStart.toLocaleDateString('vi-VN')} đến ngày ${combinedServiceEnd.toLocaleDateString('vi-VN')}`
                        : `${basicServiceInvoices.length} hóa đơn`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{formatMoney(combinedServiceTotal)}</div>
                  {combinedServiceUnpaid > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: '#fff3cd', color: '#856404' }}>
                      Còn nợ {formatMoney(combinedServiceUnpaid)}
                    </span>
                  )}
                  {combinedServiceUnpaid === 0 && (
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: '#d4edda', color: '#155724' }}>
                      Đã thanh toán
                    </span>
                  )}
                </div>
              </div>
              {/* Cost breakdown */}
              <div style={{ padding: '8px 12px' }}>
                {combinedCareServiceCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Chi phí chăm sóc</span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(combinedCareServiceCost)}</span>
                  </div>
                )}
                {combinedRoomCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Chi phí phòng</span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(combinedRoomCost)}</span>
                  </div>
                )}
                {combinedMedicationCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Chi phí thuốc</span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(combinedMedicationCost)}</span>
                  </div>
                )}
                {combinedOtherCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Chi phí khác</span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(combinedOtherCost)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Individual MEDICATION invoices ── */}
          {medicationInvoices.map((inv) => {
            const presItems = inv.prescriptionId?.items || [];
            const invStatus = String(inv.status || '').toUpperCase();
            const isPaid = invStatus === 'PAID';
            const isCancelled = invStatus === 'CANCELLED';

            return (
              <div key={inv._id} style={{ marginBottom: 16, border: '1px solid #2563eb', borderRadius: 8, overflow: 'hidden' }}>
                {/* Invoice header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#dbeafe', borderBottom: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1d4ed8' }}>Hóa đơn thuốc</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {inv.invoiceNumber || inv._id} — {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('vi-VN') : '-'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{formatMoney(inv.totalAmount)}</div>
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: isPaid ? '#d4edda' : isCancelled ? '#f8d7da' : '#fff3cd', color: isPaid ? '#155724' : isCancelled ? '#721c24' : '#856404' }}>
                      {isPaid ? 'Đã thanh toán' : isCancelled ? 'Đã hủy' : 'Chưa thanh toán'}
                    </span>
                  </div>
                </div>
                {/* Medication items */}
                {presItems.length > 0 ? (
                  <div style={{ overflowX: 'auto', padding: '8px 12px' }}>
                    {/* 9-column table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 55px 50px 1fr 1fr 50px 1fr 1fr', gap: 4, padding: '3px 0', borderBottom: '2px solid #bfdbfe', fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 4, minWidth: 700 }}>
                      <div style={{ textAlign: 'center' }}>STT</div>
                      <div>Tên thuốc</div>
                      <div style={{ textAlign: 'center' }}>ĐVT</div>
                      <div style={{ textAlign: 'center' }}>SL</div>
                      <div style={{ textAlign: 'right' }}>Đơn giá</div>
                      <div style={{ textAlign: 'right' }}>TT chưa thuế</div>
                      <div style={{ textAlign: 'center' }}>Thuế</div>
                      <div style={{ textAlign: 'right' }}>Tiền thuế</div>
                      <div style={{ textAlign: 'right' }}>Thành tiền</div>
                    </div>
                    {presItems.filter(it => it.isActive !== false).map((it, i) => {
                      const medName = it.medicationId?.name || it.medicationName || `Thuốc ${i + 1}`;
                      const qty = Number(it.quantity) || 1;
                      const medPrice = Number(it.price) || Number(it.medicationId?.price) || 0;
                      const taxRate = Number(it.taxRate) || 0.05;
                      const beforeTax = medPrice * qty;
                      const taxAmt = Math.round(beforeTax * taxRate * 100) / 100;
                      const subtotal = beforeTax + taxAmt;
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 55px 50px 1fr 1fr 50px 1fr 1fr', gap: 4, padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13, alignItems: 'center', minWidth: 700 }}>
                          <div style={{ textAlign: 'center', color: '#64748b' }}>{i + 1}</div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            <div>{medName}</div>
                            {it.dosage && <div style={{ fontSize: 11, color: '#94a3b8' }}>{it.dosage} {it.unit || ''} · {it.frequency || 1}×/ngày</div>}
                          </div>
                          <div style={{ textAlign: 'center', color: '#64748b' }}>{it.unit || 'viên'}</div>
                          <div style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{qty}</div>
                          <div style={{ textAlign: 'right', color: medPrice > 0 ? '#475569' : '#94a3b8' }}>{medPrice > 0 ? formatMoney(medPrice) : '-'}</div>
                          <div style={{ textAlign: 'right', color: '#475569' }}>{beforeTax > 0 ? formatMoney(beforeTax) : '-'}</div>
                          <div style={{ textAlign: 'center', color: '#64748b' }}>{(taxRate * 100).toFixed(0)}%</div>
                          <div style={{ textAlign: 'right', color: '#475569' }}>{taxAmt > 0 ? formatMoney(taxAmt) : '-'}</div>
                          <div style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{subtotal > 0 ? formatMoney(subtotal) : '-'}</div>
                        </div>
                      );
                    })}
                    {/* Subtotal row */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, paddingTop: 6, borderTop: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                        <span>Tổng thuốc (đã VAT):</span>
                        <span style={{ minWidth: 120, textAlign: 'right' }}>{formatMoney(inv.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', fontSize: 13, color: '#94a3b8' }}>
                    Không có chi tiết thuốc
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grand Total */}
        <div style={{ padding: '14px 16px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 16, color: '#065f46' }}>TỔNG CỘNG:</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#047857' }}>{formatMoney(grandTotalAll)}</span>
          </div>
          {grandTotalUnpaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 13, color: '#dc2626' }}>Còn nợ:</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#dc2626' }}>{formatMoney(grandTotalUnpaid)}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="button button-secondary" onClick={onClose}>
            {t('common.close') || 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FamilyDashboardPage;
