import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import facilityTourService from '../../../services/facilityTour.service';

const formatViDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

const cleanCancellationReason = (reason) => {
  if (!reason) return '';
  return reason.replace(/^\[Admin rejected\]\s*/i, '').replace(/^\[Doctor evaluation\]\s*/i, '');
};

const getStatusTheme = (status) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Chờ xét duyệt',
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
    case 'confirmed':
      return {
        label: 'Đã duyệt & Xác nhận',
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    case 'completed':
      return {
        label: 'Đã hoàn thành',
        bg: 'bg-sky-50 text-sky-700',
        text: 'text-sky-700',
        dot: 'bg-sky-500',
      };
    case 'cancelled':
      return {
        label: 'Đã huỷ / Từ chối',
        bg: 'bg-red-50 text-error',
        text: 'text-error',
        dot: 'bg-error',
      };
    default:
      return {
        label: status || 'Không xác định',
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
  }
};

const TIME_SLOTS_OPTIONS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
];

export default function AdminTourDetailDrawer({ isOpen, onClose, tourId, onActionSuccess }) {
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [confirmedTimeSlot, setConfirmedTimeSlot] = useState('');
  const [customTimeSlot, setCustomTimeSlot] = useState('');
  const [isCustomSlot, setIsCustomSlot] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!isOpen || !tourId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await facilityTourService.adminGetTourDetail(tourId);
        setTour(res?.tour || null);

        if (res?.tour) {
          const preSlot = res.tour.preferredTimeSlot;
          if (TIME_SLOTS_OPTIONS.includes(preSlot)) {
            setConfirmedTimeSlot(preSlot);
            setIsCustomSlot(false);
          } else {
            setConfirmedTimeSlot('custom');
            setCustomTimeSlot(preSlot || '');
            setIsCustomSlot(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch admin tour details:', err);
        setError('Không thể kết nối máy chủ để tải thông tin yêu cầu tham quan.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, tourId]);

  if (!isOpen) return null;

  const handleApproveSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!tourId) return;

    setApproving(true);
    try {
      const finalSlot = isCustomSlot ? customTimeSlot.trim() : confirmedTimeSlot;
      await facilityTourService.adminApproveTour(tourId, {
        confirmedTimeSlot: finalSlot || undefined,
        adminNotes: adminNotes.trim() || undefined,
      });

      setShowApproveModal(false);
      setAdminNotes('');
      if (onActionSuccess) {
        onActionSuccess();
      }

      const res = await facilityTourService.adminGetTourDetail(tourId);
      setTour(res?.tour || null);
    } catch (err) {
      console.error('Failed to approve tour request:', err);
      alert(err.response?.data?.message || 'Đã xảy ra lỗi khi duyệt yêu cầu tham quan. Vui lòng thử lại.');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!tourId || !rejectionReason.trim()) return;

    setRejecting(true);
    try {
      await facilityTourService.adminRejectTour(tourId, {
        rejectionReason: rejectionReason.trim(),
      });

      setShowRejectModal(false);
      setRejectionReason('');
      if (onActionSuccess) {
        onActionSuccess();
      }

      const res = await facilityTourService.adminGetTourDetail(tourId);
      setTour(res?.tour || null);
    } catch (err) {
      console.error('Failed to reject tour request:', err);
      alert(err.response?.data?.message || 'Đã xảy ra lỗi khi từ chối yêu cầu tham quan.');
    } finally {
      setRejecting(false);
    }
  };

  const handleCompleteSubmit = async () => {
    if (!tourId) return;
    setCompleting(true);
    try {
      await facilityTourService.adminCompleteTour(tourId);
      if (onActionSuccess) onActionSuccess();
      const res = await facilityTourService.adminGetTourDetail(tourId);
      setTour(res?.tour || null);
    } catch (err) {
      console.error('Failed to complete tour:', err);
      alert(err.response?.data?.message || 'Đã xảy ra lỗi khi xác nhận hoàn tất tham quan.');
    } finally {
      setCompleting(false);
    }
  };

  const isPending = tour?.status === 'pending';
  const isConfirmed = tour?.status === 'confirmed';
  const isCancellable = ['pending', 'confirmed'].includes(tour?.status || '');
  const theme = tour ? getStatusTheme(tour.status) : null;

  return (
    <div className={`ftd-drawer-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
      <div className="ftd-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="ftd-drawer__header">
          <div className="ftd-drawer__header-title">
            <h3>Chi tiết tour - Quản trị</h3>
            <span className="ftd-drawer__header-subtitle">
              Mã tham chiếu: {tour ? `#${tour._id.substring(18).toUpperCase()}` : ''}
            </span>
          </div>
          <button className="ftd-drawer__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="ftd-drawer__body">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="animate-spin text-emerald-700 mb-3" size={32} />
              <p className="text-sm font-semibold">Đang tải thông tin yêu cầu tham quan...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="text-red-500 mx-auto mb-3" size={36} />
              <p className="text-sm font-bold text-slate-800 mb-1">Tải thất bại</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all">
                Đóng
              </button>
            </div>
          ) : !tour ? (
            <p className="p-6 text-center text-slate-400 text-xs">Không tìm thấy yêu cầu tham quan.</p>
          ) : (
            <>
              {/* Status Banner */}
              <div className="ftd-drawer__section">
                <div className={`ftd-status-banner ftd-status-banner--${tour.status}`}>
                  <div className="ftd-status-banner__info">
                    <span className="ftd-status-banner__label">Trạng thái hiện tại</span>
                    <span className="ftd-status-banner__value">{theme?.label}</span>
                  </div>
                  <div className={`ftd-status-banner__dot ftd-status-banner__dot--${tour.status} animate-pulse`} />
                </div>
              </div>

              {/* Family Account info */}
              <div className="ftd-drawer__section">
                <div className="ftd-drawer__section-title">Thông tin tài khoản gia đình</div>
                <div className="ftd-detail-card">
                  <div className="ftd-detail-card__header-row">
                    <div className="ftd-detail-card__avatar" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <User size={16} />
                    </div>
                    <div>
                      <div className="ftd-detail-card__name">
                        {tour.familyAccount?.fullName || 'Người dùng đã đăng ký'}
                      </div>
                      <div className="ftd-detail-card__subtitle">Tài khoản thành viên gia đình</div>
                    </div>
                  </div>
                  <div className="ftd-detail-list">
                    <div className="ftd-detail-list__item">
                      <Mail size={14} className="ftd-detail-list__icon" />
                      <span className="ftd-detail-list__text">
                        {tour.familyAccount?.email || 'N/A'}
                      </span>
                    </div>
                    <div className="ftd-detail-list__item">
                      <Phone size={14} className="ftd-detail-list__icon" />
                      <span className="ftd-detail-list__text">
                        {tour.familyAccount?.phone || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visitor Contact Info */}
              <div className="ftd-drawer__section">
                <div className="ftd-drawer__section-title">Thông tin liên hệ khách tham quan</div>
                <div className="ftd-detail-card">
                  <div className="ftd-detail-card__header-row">
                    <div className="ftd-detail-card__avatar">
                      {tour.contactName ? tour.contactName.charAt(0).toUpperCase() : 'V'}
                    </div>
                    <div>
                      <div className="ftd-detail-card__name">{tour.contactName}</div>
                      <div className="ftd-detail-card__subtitle">Người liên hệ</div>
                    </div>
                  </div>

                  <div className="ftd-detail-list">
                    <div className="ftd-detail-list__item">
                      <Phone size={14} className="ftd-detail-list__icon" />
                      <span className="ftd-detail-list__text">{tour.contactPhone}</span>
                    </div>
                    {tour.contactEmail && (
                      <div className="ftd-detail-list__item">
                        <Mail size={14} className="ftd-detail-list__icon" />
                        <span className="ftd-detail-list__text">{tour.contactEmail}</span>
                      </div>
                    )}
                    <div className="ftd-detail-list__item">
                      <Users size={14} className="ftd-detail-list__icon" />
                      <span className="ftd-detail-list__text">
                        {tour.numberOfVisitors} người tham quan
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferred Schedule Card */}
              <div className="ftd-drawer__section">
                <div className="ftd-drawer__section-title">Lịch mong muốn</div>
                <div className="ftd-detail-card">
                  <div className="ftd-schedule-grid">
                    <div className="ftd-schedule-item">
                      <Calendar size={14} className="ftd-schedule-item__icon" />
                      <div className="ftd-schedule-item__content">
                        <span className="ftd-schedule-item__label">Ngày</span>
                        <span className="ftd-schedule-item__value">
                          {formatViDate(tour.preferredDate)}
                        </span>
                      </div>
                    </div>

                    {tour.preferredTimeSlot && (
                      <div className="ftd-schedule-item">
                        <Clock size={14} className="ftd-schedule-item__icon" />
                        <div className="ftd-schedule-item__content">
                          <span className="ftd-schedule-item__label">Khung giờ</span>
                          <span className="ftd-schedule-item__value">
                            {tour.preferredTimeSlot}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {tour.notes && (
                    <div className="ftd-notes-section">
                      <span className="ftd-notes-section__label">Ghi chú của gia đình</span>
                      <p className="ftd-notes-section__text">
                        "{tour.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approved/Confirmed Schedule widget */}
              {tour.status === 'confirmed' && (
                <div className="ftd-drawer__section">
                  <div className="ftd-drawer__section-title">Lịch hẹn đã xác nhận</div>
                  <div className="ftd-detail-card ftd-detail-card--appointment">
                    <div className="ftd-appointment-card__row">
                      <div className="ftd-cal-widget flex-shrink-0">
                        <div className="ftd-cal-widget__month">
                          {tour.preferredDate ? new Date(tour.preferredDate).toLocaleDateString('vi-VN', { month: 'short' }).toUpperCase() : 'THĂM'}
                        </div>
                        <div className="ftd-cal-widget__day">
                          {tour.preferredDate ? new Date(tour.preferredDate).getDate() : '??'}
                        </div>
                        <div className="ftd-cal-widget__year">
                          {tour.preferredDate ? new Date(tour.preferredDate).getFullYear() : '2026'}
                        </div>
                      </div>

                      <div>
                        <div className="ftd-appointment-card__title" style={{ color: '#2d6a4f' }}>
                          Lịch hẹn đã được xác nhận!
                        </div>
                        <div className="ftd-appointment-card__subtitle" style={{ fontWeight: '600' }}>
                          Khung giờ: {tour.confirmedTimeSlot || tour.preferredTimeSlot || 'N/A'}
                        </div>
                        {tour.adminNotes && (
                          <div className="ftd-appointment-card__admin-notes mt-2 p-2 bg-white/70 rounded border border-emerald-100">
                            <strong>Ghi chú quản trị:</strong> "{tour.adminNotes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancellation/Rejection widget */}
              {(tour.cancellationReason || tour.rejectionReason) && (
                <div className="ftd-drawer__section">
                  <div className="ftd-drawer__section-title">Chi tiết huỷ/từ chối</div>
                  <div className="ftd-detail-card ftd-detail-card--health-alert" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
                    <div className="ftd-cancellation-card__row flex items-start gap-3">
                      <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <div className="ftd-cancellation-card__title text-red-800 font-bold" style={{ fontSize: '13.5px' }}>
                          {tour.rejectionReason ? 'Bị từ chối bởi nhân viên' : 'Đã huỷ bởi gia đình'}
                        </div>
                        <p className="ftd-cancellation-card__text text-red-700 italic mt-1 font-medium" style={{ fontSize: '12.5px' }}>
                          "{cleanCancellationReason(tour.cancellationReason || tour.rejectionReason)}"
                        </p>
                        <div className="text-[11px] text-red-500 mt-2">
                          Ngày: {formatViDate(tour.cancelledAt || tour.rejectedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer actions */}
        <div className="ftd-drawer__footer">
          {isPending ? (
            <div className="w-full flex gap-3">
              <button
                className="ftd-btn ftd-btn--danger-outline flex-1 flex justify-center items-center gap-1.5"
                onClick={() => setShowRejectModal(true)}
              >
                Từ chối
              </button>
              <button
                className="ftd-btn ftd-btn--primary flex-1 flex justify-center items-center gap-1.5"
                style={{ backgroundColor: '#1B365D' }}
                onClick={() => setShowApproveModal(true)}
              >
                Duyệt tour
              </button>
            </div>
          ) : isConfirmed ? (
            <div className="w-full flex gap-3">
              <button
                className="ftd-btn ftd-btn--danger-outline flex-1 flex justify-center items-center gap-1.5"
                onClick={() => setShowRejectModal(true)}
                disabled={completing}
              >
                Từ chối
              </button>
              <button
                className="ftd-btn flex-1 flex justify-center items-center gap-1.5"
                style={{ backgroundColor: '#059669', color: '#fff', border: 'none' }}
                onClick={handleCompleteSubmit}
                disabled={completing}
              >
                {completing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    Xác nhận đã tham quan
                  </>
                )}
              </button>
            </div>
          ) : (
            <button className="ftd-btn ftd-btn--primary w-full" onClick={onClose}>
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Approve Modal Backdrop */}
      {showApproveModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowApproveModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Duyệt yêu cầu tham quan</h4>
            <p className="arh-modal__text">
              Xác nhận lịch tham quan cho <strong className="text-slate-800">{tour?.contactName}</strong> vào ngày <strong className="text-emerald-700">{formatViDate(tour?.preferredDate)}</strong>.
            </p>

            <form onSubmit={handleApproveSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Khung giờ xác nhận
                </label>

                {!isCustomSlot ? (
                  <div className="flex flex-col gap-2">
                    <select
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm font-sans"
                      style={{ minHeight: '42px', fontFamily: "'Inter', sans-serif" }}
                      value={confirmedTimeSlot}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomSlot(true);
                          setConfirmedTimeSlot('custom');
                        } else {
                          setConfirmedTimeSlot(e.target.value);
                        }
                      }}
                    >
                      {TIME_SLOTS_OPTIONS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                      <option value="custom">-- Khung giờ tuỳ chỉnh --</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm font-sans"
                      placeholder="vd: 09:30 - 11:30"
                      value={customTimeSlot}
                      onChange={(e) => setCustomTimeSlot(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-[#2D6A4F] text-left underline font-medium self-start"
                      onClick={() => {
                        setIsCustomSlot(false);
                        setConfirmedTimeSlot(TIME_SLOTS_OPTIONS[0]);
                      }}
                    >
                      Chọn từ danh sách
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Ghi chú quản trị <span className="text-slate-400 font-normal italic text-[11px] ml-1">(tùy chọn)</span>
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Địa điểm gặp mặt, nhân viên tiếp đón, hoặc hướng dẫn cho khách tham quan..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowApproveModal(false);
                    setAdminNotes('');
                  }}
                  disabled={approving}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={approving}
                >
                  {approving && <Loader2 className="animate-spin mr-1" size={13} />}
                  Xác nhận duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal Backdrop */}
      {showRejectModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title text-red-800">Từ chối yêu cầu tham quan</h4>
            <p className="arh-modal__text">
              Bạn có chắc muốn từ chối yêu cầu tham quan của <strong className="text-slate-800">{tour?.contactName}</strong>? Vui lòng cung cấp lý do bên dưới. Tài khoản gia đình sẽ được thông báo.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '100px', borderColor: '#fca5a5' }}
                  placeholder="Nêu rõ lý do (vd: Cơ sở đã hết chỗ vào ngày này, đang có công trình xây dựng tại khu A...)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="adm-btn-clear flex-1"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  disabled={rejecting}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center bg-red-600 hover:bg-red-700"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#dc2626' }}
                  disabled={rejecting || !rejectionReason.trim()}
                >
                  {rejecting && <Loader2 className="animate-spin mr-1" size={13} />}
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
