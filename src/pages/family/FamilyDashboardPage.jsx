import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, CreditCard, Package, Users, Wallet, PlusCircle } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import residentService from '../../services/resident.service';
import familyPortalService from '../../services/familyPortal.service';
import '../../styles/family/FamilyDashboardPage.css';

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

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

function FamilyDashboardPage() {
  const [residents, setResidents] = useState([]);
  const [billingSummaries, setBillingSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingInvoiceFor, setCreatingInvoiceFor] = useState(null);
  const [walletInfo, setWalletInfo] = useState({ balance: 0, totalTopup: 0, totalSpent: 0 });
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState(null);
  const [topupAmount, setTopupAmount] = useState(500000);
  const [isTopupProcessing, setIsTopupProcessing] = useState(false);
  const [isWalletPaymentProcessing, setIsWalletPaymentProcessing] = useState(false);

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

    const loadSummaries = async () => {
      const entries = await Promise.all(
        residents.map(async (resident) => {
          try {
            const payload = await familyPortalService.getResidentBillingSummary(resident._id);
            return [resident._id, payload];
          } catch {
            return [resident._id, null];
          }
        })
      );
      setBillingSummaries(Object.fromEntries(entries));
    };

    loadSummaries();
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

  const handleOpenCheckout = (residentId, invoiceId) => {
    if (!invoiceId) return;
    const token = getAuthToken();
    const url = `/api/residents/${residentId}/invoices/payos/checkout/${invoiceId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
  };

  const handleWalletTopup = async () => {
    if (!topupAmount || topupAmount <= 0) {
      setWalletError('Số tiền nạp phải lớn hơn 0');
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
      setIsWalletPaymentProcessing(true);
      await familyPortalService.payInvoice(residentId, invoiceId, {
        paymentMethod: 'wallet',
        amount,
      });
      const [updatedSummary, updatedWallet] = await Promise.all([
        familyPortalService.getResidentBillingSummary(residentId),
        familyPortalService.getWalletBalance(),
      ]);
      setBillingSummaries((prev) => ({
        ...prev,
        [residentId]: updatedSummary,
      }));
      setWalletInfo(updatedWallet);
    } catch (err) {
      console.error('Wallet payment failed:', err);
      setWalletError(err?.response?.data?.message || err.message || 'Không thể thanh toán bằng ví');
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
      const response = await familyPortalService.createInvoice(resident._id, payload);
      const createdInvoice = response.data;
      setBillingSummaries((prev) => ({
        ...prev,
        [resident._id]: {
          ...prev[resident._id],
          latestInvoice: createdInvoice,
          invoiceCount: (prev[resident._id]?.invoiceCount || 0) + 1,
        },
      }));
      const token = getAuthToken();
      const checkoutUrl = `/api/residents/${resident._id}/invoices/payos/checkout/${createdInvoice._id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(checkoutUrl, '_blank');
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError(err?.response?.data?.message || err.message || 'Không thể tạo hóa đơn');
    } finally {
      setCreatingInvoiceFor(null);
    }
  };

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
                min="1000"
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

      <div className="family-dashboard-grid">
        {residents.map((resident) => {
          const summary = billingSummaries[resident._id] || {};
          const invoice = summary.latestInvoice;
          const hasServicePackage = Boolean(resident.servicePackage);

          return (
            <article key={resident._id} className="family-dashboard-card">
              <div className="card-header">
                <div>
                  <h2>{resident.fullName || resident.residentCode || 'Cư dân'}</h2>
                  <p className="text-muted">Mã: {resident.residentCode || 'N/A'}</p>
                </div>
                <div className="status-pill">
                  {invoice ? (
                    invoice.status === 'paid' ? (
                      <span className="status-paid"><CheckCircle size={16} /> Đã thanh toán</span>
                    ) : (
                      <span className="status-due"><CreditCard size={16} /> Chưa thanh toán</span>
                    )
                  ) : (
                    <span className="status-empty"><Package size={16} /> Chưa có hóa đơn</span>
                  )}
                </div>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <strong>Gói dịch vụ:</strong>
                  <span>{resident.servicePackage || 'Chưa đăng ký gói dịch vụ'}</span>
                </div>
                {resident.servicePackage && getPackagePriceLabel(resident) && (
                  <div className="info-row">
                    <strong>Giá gói dịch vụ:</strong>
                    <span>{getPackagePriceLabel(resident)}</span>
                  </div>
                )}
                <div className="info-row">
                  <strong>Số hóa đơn:</strong>
                  <span>{summary.invoiceCount != null ? summary.invoiceCount : '...'}</span>
                </div>
                {invoice ? (
                  <>
                    <div className="info-row">
                      <strong>Hóa đơn mới nhất:</strong>
                      <span>{invoice.invoiceNumber}</span>
                    </div>
                    <div className="info-row">
                      <strong>Ngày đến hạn:</strong>
                      <span>{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="info-row info-row--status">
                      <strong>Trạng thái thanh toán:</strong>
                      <span>{invoice.status === 'paid' ? 'Đã đóng' : invoice.status === 'partially_paid' ? 'Đã đóng một phần' : 'Chưa đóng'}</span>
                    </div>
                    <div className="info-row info-row--fee">
                      <strong>Phí xét nghiệm / khám:</strong>
                      <span>{formatMoney(invoice.roomCost)} <small>{invoice.status === 'paid' ? '(Đã đóng)' : '(Chưa đóng)'}</small></span>
                    </div>
                    <div className="info-row info-row--fee">
                      <strong>Phí thuốc:</strong>
                      <span>{formatMoney(invoice.medicationCost)} <small>{invoice.status === 'paid' ? '(Đã đóng)' : '(Chưa đóng)'}</small></span>
                    </div>
                    <div className="info-row info-row--fee">
                      <strong>Phí dịch vụ chăm sóc:</strong>
                      <span>{formatMoney(invoice.careServiceCost)} <small>{invoice.status === 'paid' ? '(Đã đóng)' : '(Chưa đóng)'}</small></span>
                    </div>
                    <div className="info-row info-row--fee">
                      <strong>Chi phí khác:</strong>
                      <span>{formatMoney(invoice.otherCost)} <small>{invoice.status === 'paid' ? '(Đã đóng)' : '(Chưa đóng)'}</small></span>
                    </div>
                    <div className="info-row info-row--total">
                      <strong>Tổng phí phải trả:</strong>
                      <span>{formatMoney(invoice.totalAmount)} <small>{invoice.status === 'paid' ? '(Đã đóng)' : invoice.status === 'partially_paid' ? '(Thanh toán một phần)' : '(Chưa đóng)'}</small></span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="info-row">
                      <strong>Trạng thái hóa đơn:</strong>
                      <span>Chưa có hóa đơn</span>
                    </div>
                    {hasServicePackage && (
                      <div className="info-row">
                        <strong>Thanh toán gói dịch vụ:</strong>
                        <span>Chưa phát hành hóa đơn cho gói dịch vụ đã đăng ký. Vui lòng liên hệ quản lý để nhận hóa đơn và thực hiện thanh toán.</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="card-actions">
                {invoice ? (
                  invoice.status !== 'paid' ? (
                    <>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => handleOpenCheckout(resident._id, invoice._id)}
                      >
                        Thanh toán qua PayOS
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => handlePayWithWallet(resident._id, invoice._id, invoice.totalAmount)}
                        disabled={walletLoading || isWalletPaymentProcessing || walletInfo.balance < invoice.totalAmount}
                      >
                        {isWalletPaymentProcessing ? 'Đang thanh toán...' : 'Thanh toán bằng ví'}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="button button-secondary" disabled>
                      Đã thanh toán
                    </button>
                  )
                ) : hasServicePackage && PACKAGE_PRICES[resident.servicePackage] ? (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleCreateInvoice(resident)}
                    disabled={creatingInvoiceFor === resident._id}
                  >
                    {creatingInvoiceFor === resident._id ? 'Đang tạo hóa đơn...' : 'Tạo hóa đơn và thanh toán'}
                  </button>
                ) : (
                  <button type="button" className="button button-secondary" disabled>
                    {hasServicePackage ? 'Chưa có thông tin giá gói' : 'Chưa có khoản phí'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default FamilyDashboardPage;
