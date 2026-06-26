import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, CreditCard, Package, Users, Wallet, PlusCircle, Bell } from 'lucide-react';
import notificationsService from '../../services/notifications.service';
import '../../styles/family/NotificationPage.css';
import { useNavigate } from 'react-router-dom';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState({});
  const [currentResidentPayment, setCurrentResidentPayment] = useState(null);
  const [isBatchPaymentProcessing, setIsBatchPaymentProcessing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBellPanel, setShowBellPanel] = useState(false);
  const [bellItems, setBellItems] = useState([]);
  const [bellTab, setBellTab] = useState('all');
  const navigate = useNavigate();

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
    // load unread count for notifications
    const loadUnread = async () => {
      try {
        const res = await notificationsService.listNotifications({ isRead: false, limit: 1 });
        setUnreadCount(res.total || 0);
      } catch (e) {
        setUnreadCount(0);
      }
    };
    loadUnread();
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
      // Reload invoices for resident and wallet info
      const [updatedInvoices, updatedWallet] = await Promise.all([
        familyPortalService.getResidentInvoices(residentId),
        familyPortalService.getWalletBalance(),
      ]);
      setInvoicesList(prev => ({
        ...prev,
        [residentId]: Array.isArray(updatedInvoices) ? updatedInvoices : updatedInvoices?.data || [],
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
      const createdInvoice = await familyPortalService.createInvoice(resident._id, payload);
      
      // Reload invoices
      const updatedInvoices = await familyPortalService.getResidentInvoices(resident._id);
      setInvoicesList(prev => ({
        ...prev,
        [resident._id]: Array.isArray(updatedInvoices) ? updatedInvoices : updatedInvoices?.data || [],
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

  return (
    <div className="page-family-dashboard">
      <header className="page-header">
        <div>
          <h1>Trang Gia đình</h1>
          <p>Xem gói dịch vụ đã đăng ký và các khoản phí cần thanh toán cho cư dân của bạn.</p>
        </div>
        <div className="header-bell">
          <button title="Thông báo" className="notification-btn" onClick={async () => { setShowBellPanel(s => !s); if (!showBellPanel) {
              const res = await notificationsService.listNotifications({ page: 1, limit: 6 });
              setBellItems(res.items || []);
            } }}>
            <Bell size={20} />
          </button>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </div>
        {showBellPanel && (
          <div style={{ position: 'absolute', right: 24, top: 64, zIndex: 60 }}>
            <div className="notification-panel" style={{ width: 360 }}>
              <div className="panel-header">
                <div className="meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: 18 }}>Thông báo</strong>
                  <div style={{ marginTop: 8 }} className="bell-tabs">
                    <button className={bellTab === 'all' ? 'tab-btn active' : 'tab-btn'} onClick={() => setBellTab('all')}>Tất cả</button>
                    <button className={bellTab === 'unread' ? 'tab-btn active' : 'tab-btn'} onClick={() => setBellTab('unread')}>Chưa đọc</button>
                  </div>
                </div>
              </div>
              {bellTab === 'all' && (
                <div style={{ padding: '8px 12px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9aa4af', fontSize: 13 }}>
                  <div>Trước đó</div>
                  <div><a href="/family/notifications" style={{ color: '#7dd3fc', textDecoration: 'none' }}>Xem tất cả</a></div>
                </div>
              )}
              <div className="notification-list" style={{ paddingTop: 8 }}>
                {(() => {
                  const filtered = bellTab === 'all' ? bellItems : bellItems.filter(i => !i.isRead);
                  if (!filtered || filtered.length === 0) {
                    if (bellTab === 'unread') {
                      return (
                        <div className="empty-bell" style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}><Bell size={64} /></div>
                          <div style={{ marginTop: 14, fontSize: 16, color: '#cbd5e1' }}>Bạn không có thông báo nào</div>
                        </div>
                      );
                    }
                    return (
                      <div className="empty-bell" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><Bell size={48} /></div>
                        <div style={{ marginTop: 12, fontSize: 16, color: '#cbd5e1' }}>Bạn không có thông báo nào</div>
                      </div>
                    );
                  }
                  return filtered.slice(0, 4).map(n => (
                    <div key={n._id} className={`notification-item ${n.isRead ? '' : 'unread'}`}>
                      <div className="left">
                        <div className={`notification-dot ${n.isRead ? '' : 'unseen'}`} />
                        <div>
                          <div className="notification-title">{n.title}</div>
                          <div className="notification-content">{n.content}</div>
                          <div className="notification-time">{new Date(n.updatedAt || n.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
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
          const invoices = invoicesList[resident._id] || [];
          const hasServicePackage = Boolean(resident.servicePackage);
          
          // Separate invoices by type
          const serviceInvoices = invoices.filter(inv => inv.type === 'SERVICE' || !inv.type);
          const medicationInvoices = invoices.filter(inv => inv.type === 'MEDICATION');
          const otherInvoices = invoices.filter(inv => inv.type && inv.type !== 'SERVICE' && inv.type !== 'MEDICATION');
          
          // Get latest unpaid invoice (for primary action button)
          const latestUnpaidInvoice = invoices.find(inv => inv.status !== 'PAID');
          const latestInvoice = invoices[0] || null;

          return (
            <article key={resident._id} className="family-dashboard-card">
              <div className="card-header">
                <div>
                  <h2>{resident.fullName || resident.residentCode || 'Cư dân'}</h2>
                  <p className="text-muted">Mã: {resident.residentCode || 'N/A'}</p>
                </div>
                <div className="status-pill">
                  {latestInvoice ? (
                    latestInvoice.status === 'PAID' ? (
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
                  <span style={{ fontSize: '14px' }}>{resident.servicePackage || 'Chưa đăng ký gói dịch vụ'}</span>
                </div>
                {resident.servicePackage && getPackagePriceLabel(resident) && (
                  <div className="info-row">
                    <strong>Giá gói dịch vụ:</strong>
                    <span style={{ fontSize: '14px' }}>{getPackagePriceLabel(resident)}</span>
                  </div>
                )}
                <div className="info-row">
                  <strong>Tổng số hóa đơn:</strong>
                  <span style={{ fontSize: '14px' }}>{invoices.length}</span>
                </div>

                {/* SERVICE INVOICES */}
                {serviceInvoices.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                      📋 Hóa đơn dịch vụ
                    </div>
                    {serviceInvoices.map((invoice, idx) => {
                      const invoiceStatus = invoice?.status?.toString().toUpperCase?.();
                      const invoiceTotalAmount = invoice?.totalAmount ?? invoice?.total ?? 0;
                      return (
                        <div key={invoice._id || idx} style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Số hóa đơn:</strong>
                            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</span>
                          </div>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Ngày đến hạn:</strong>
                            <span>{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Trạng thái:</strong>
                            <span style={{ color: invoiceStatus === 'PAID' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                              {invoiceStatus === 'PAID' ? 'Đã thanh toán' : invoiceStatus === 'PARTIALLY_PAID' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
                            </span>
                          </div>
                          {(invoice.careServiceCost > 0 || invoice.roomCost > 0) && (
                            <div className="info-row" style={{ marginBottom: '6px', fontSize: '13px' }}>
                              <strong>Phí dịch vụ chăm sóc:</strong>
                              <span>{formatMoney(invoice.careServiceCost)}</span>
                            </div>
                          )}
                          {invoice.roomCost > 0 && (
                            <div className="info-row" style={{ marginBottom: '6px', fontSize: '13px' }}>
                              <strong>Phí xét nghiệm:</strong>
                              <span>{formatMoney(invoice.roomCost)}</span>
                            </div>
                          )}
                          {invoice.otherCost > 0 && (
                            <div className="info-row" style={{ marginBottom: '6px', fontSize: '13px' }}>
                              <strong>Chi phí khác:</strong>
                              <span>{formatMoney(invoice.otherCost)}</span>
                            </div>
                          )}
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
                          <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontWeight: 'bold', color: '#1e40af' }}>
                            <strong>Tổng:</strong>
                            <span>{formatMoney(invoiceTotalAmount)}</span>
                          </div>
                          {invoiceStatus !== 'PAID' && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="button button-primary"
                                onClick={() => handleOpenCheckout(resident._id, invoice._id)}
                              >
                                Thanh toán
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => handlePayWithWallet(resident._id, invoice._id, invoiceTotalAmount)}
                                disabled={isWalletPaymentProcessing || walletLoading}
                              >
                                {isWalletPaymentProcessing ? 'Đang...' : 'Thanh toán bằng ví'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* MEDICATION INVOICES */}
                {medicationInvoices.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                      💊 Hóa đơn thuốc
                    </div>
                    {medicationInvoices.map((invoice, idx) => {
                      const invoiceStatus = invoice?.status?.toString().toUpperCase?.();
                      const invoiceTotalAmount = invoice?.totalAmount ?? invoice?.total ?? 0;
                      return (
                        <div key={invoice._id || idx} style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Số hóa đơn:</strong>
                            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</span>
                          </div>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Ngày đến hạn:</strong>
                            <span>{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Trạng thái:</strong>
                            <span style={{ color: invoiceStatus === 'PAID' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                              {invoiceStatus === 'PAID' ? 'Đã thanh toán' : invoiceStatus === 'PARTIALLY_PAID' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
                            </span>
                          </div>
                          {invoice.medicationCost > 0 && (
                            <div className="info-row" style={{ marginBottom: '6px', fontSize: '13px' }}>
                              <strong>Phí thuốc:</strong>
                              <span>{formatMoney(invoice.medicationCost)}</span>
                            </div>
                          )}
                          {invoice.otherCost > 0 && (
                            <div className="info-row" style={{ marginBottom: '6px', fontSize: '13px' }}>
                              <strong>Chi phí khác:</strong>
                              <span>{formatMoney(invoice.otherCost)}</span>
                            </div>
                          )}
                          <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fecaca', fontWeight: 'bold', color: '#dc2626' }}>
                            <strong>Tổng:</strong>
                            <span>{formatMoney(invoiceTotalAmount)}</span>
                          </div>
                          {invoiceStatus !== 'PAID' && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="button button-primary"
                                onClick={() => handleOpenCheckout(resident._id, invoice._id)}
                              >
                                Thanh toán
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => handlePayWithWallet(resident._id, invoice._id, invoiceTotalAmount)}
                                disabled={isWalletPaymentProcessing || walletLoading}
                              >
                                {isWalletPaymentProcessing ? 'Đang...' : 'Thanh toán bằng ví'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* OTHER INVOICES */}
                {otherInvoices.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                      🧾 Hóa đơn khác
                    </div>
                    {otherInvoices.map((invoice, idx) => {
                      const invoiceStatus = invoice?.status?.toString().toUpperCase?.();
                      const invoiceTotalAmount = invoice?.totalAmount ?? invoice?.total ?? 0;
                      return (
                        <div key={invoice._id || idx} style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#fffaf0', borderRadius: '6px', border: '1px solid #f1e7d6' }}>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Số hóa đơn:</strong>
                            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</span>
                          </div>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Ngày đến hạn:</strong>
                            <span>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('vi-VN') : '-'}</span>
                          </div>
                          <div className="info-row" style={{ marginBottom: '6px' }}>
                            <strong>Trạng thái:</strong>
                            <span style={{ color: invoiceStatus === 'PAID' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                              {invoiceStatus === 'PAID' ? 'Đã thanh toán' : invoiceStatus === 'PARTIALLY_PAID' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
                            </span>
                          </div>
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
                          <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e6d8c3', fontWeight: 'bold', color: '#92400e' }}>
                            <strong>Tổng:</strong>
                            <span>{formatMoney(invoiceTotalAmount)}</span>
                          </div>
                          {invoiceStatus !== 'PAID' && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="button button-primary"
                                onClick={() => handleOpenCheckout(resident._id, invoice._id)}
                              >
                                Thanh toán
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => handlePayWithWallet(resident._id, invoice._id, invoiceTotalAmount)}
                                disabled={isWalletPaymentProcessing || walletLoading}
                              >
                                {isWalletPaymentProcessing ? 'Đang...' : 'Thanh toán bằng ví'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {invoices.length === 0 && (
                  <div className="info-row">
                    <strong>Trạng thái hóa đơn:</strong>
                    <span>Chưa có hóa đơn</span>
                  </div>
                )}
              </div>

              <div className="card-actions">
                {latestInvoice && latestInvoice.status === 'PAID' ? (
                  <button type="button" className="button button-secondary" disabled>
                    Đã thanh toán hết
                  </button>
                ) : hasServicePackage && PACKAGE_PRICES[resident.servicePackage] ? (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleCreateInvoice(resident)}
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
            </article>
          );
        })}
      </div>

      {/* Batch payment modal removed: per-invoice payment buttons are used instead */}
    </div>
  );
}

export default FamilyDashboardPage;
