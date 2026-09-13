import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const INVOICE_GROUPS = [
  { key: 'service', i18nKey: 'familyDashboard.invoice.serviceInvoices', icon: '📋', theme: 'service', match: (inv) => inv.type === 'SERVICE' || !inv.type },
  { key: 'medication', i18nKey: 'familyDashboard.invoice.medicationInvoices', icon: '💊', theme: 'medication', match: (inv) => inv.type === 'MEDICATION' },
  { key: 'other', i18nKey: 'familyDashboard.invoice.otherInvoices', icon: '🧾', theme: 'other', match: (inv) => inv.type && inv.type !== 'SERVICE' && inv.type !== 'MEDICATION' },
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
      setOtpMaskedPhone(payload.maskedPhone || '');
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
      setOtpMaskedPhone(payload.maskedPhone || '');
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
          closePaymentModal();
        }
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
              onOpenPaymentModal={handleOpenPaymentModal}
              hasUnpaidServiceInvoice={hasUnpaidServiceInvoice}
              totalUnpaidCount={totalUnpaid}
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
          <h3 style={{ margin: 0 }}>💳 {t('familyDashboard.batchPayment.title') || 'Thanh toán hóa đơn'}</h3>
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
                    {inv.type === 'MEDICATION' ? '💊' : inv.type === 'SERVICE' || !inv.type ? '📋' : '🧾'}
                    {' '}
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
            💰 {t('familyDashboard.batchPayment.payAllWithWallet') || 'Thanh toán toàn bộ (Ví)'}
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
  onOpenCheckout, onPayWithWallet, onCreateInvoice, onOpenPaymentModal,
  hasUnpaidServiceInvoice, totalUnpaidCount, creatingInvoiceFor, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId,
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
                💳 {t('familyDashboard.invoice.payMultiple') || 'Thanh toán nhiều hóa đơn'} ({unpaidCount})
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

function InvoiceGroup({ group, invoices, resident, expandedInvoiceIds, onToggleInvoice, onOpenCheckout, onPayWithWallet, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId }) {
  const { t } = useTranslation();
  return (
    <div className={`family-invoice-group family-invoice-group--${group.theme}`}>
      <div className="family-invoice-group__title">{group.icon} {t(group.i18nKey)}</div>
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

function InvoiceRow({ invoice, theme, resident, isExpanded, onToggle, onOpenCheckout, onPayWithWallet, isWalletPaymentProcessing, walletLoading, checkoutLoadingInvoiceId }) {
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
        <span className="family-invoice-row__number">{invoice.invoiceNumber}</span>
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
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>{t('familyDashboard.invoice.itemsDetail')}</div>
              {invoice.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <div style={{ color: '#0f172a' }}>{it.description || it.name || t('familyDashboard.invoice.defaultItem')}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatMoney(it.amount)}</div>
                </div>
              ))}
            </div>
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
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
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
        </div>
      )}
    </div>
  );
}

export default FamilyDashboardPage;
