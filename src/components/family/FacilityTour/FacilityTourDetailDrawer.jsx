import { useState } from 'react';
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

const getStatusTheme = (status) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Chờ duyệt',
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
    case 'confirmed':
      return {
        label: 'Đã xác nhận',
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    case 'completed':
      return {
        label: 'Đã hoàn tất',
        bg: 'bg-sky-50 text-sky-700',
        text: 'text-sky-700',
        dot: 'bg-sky-500',
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        bg: 'bg-red-50 text-error',
        text: 'text-error',
        dot: 'bg-error',
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
  }
};

export default function FacilityTourDetailDrawer({ isOpen, onClose, tour, onCancelSuccess }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  if (!isOpen || !tour) return null;

  const theme = getStatusTheme(tour.status);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setCancelError(null);
    setCancelling(true);

    try {
      await facilityTourService.cancelTour(tour._id, {
        cancellationReason: cancelReason.trim() || undefined,
      });
      if (onCancelSuccess) {
        onCancelSuccess();
      }
      setShowCancelConfirm(false);
      setCancelReason('');
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể huỷ yêu cầu tham quan.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  const isCancelled = tour.status === 'cancelled';

  const steps = [
    {
      key: 'submitted',
      title: 'Đã gửi yêu cầu',
      desc: `Lịch hẹn đăng ký ngày ${formatEnglishDate(tour.createdAt)}`,
      isDone: true,
      isActive: false,
    },
    {
      key: 'pending',
      title: 'Đang xem xét',
      desc: 'Nhân viên đang xem xét yêu cầu',
      isDone: tour.status !== 'pending',
      isActive: tour.status === 'pending',
    },
    {
      key: 'confirmed',
      title: isCancelled ? 'Yêu cầu đã hủy' : 'Lịch tham quan đã xác nhận',
      desc: isCancelled
        ? `Hủy ngày ${formatEnglishDate(tour.cancelledAt || tour.rejectedAt)}`
        : tour.status === 'confirmed' || tour.status === 'completed'
        ? `Xác nhận lịch vào ${formatEnglishDate(tour.preferredDate)}`
        : 'Đang chờ phê duyệt',
      isDone: tour.status === 'completed' || (isCancelled && true),
      isActive: tour.status === 'confirmed' || (isCancelled && true),
      isError: isCancelled,
    },
    {
      key: 'completed',
      title: 'Hoàn tất tham quan',
      desc: tour.status === 'completed' ? 'Hy vọng quý khách đã có chuyến tham quan tuyệt vời!' : 'Đang chờ diễn ra chuyến tham quan',
      isDone: tour.status === 'completed',
      isActive: tour.status === 'completed',
      hide: isCancelled,
    },
  ].filter(s => !s.hide);

  const canCancel = ['pending', 'confirmed'].includes(tour.status);

  return (
    <div className={`ftd-drawer-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
      <div className="ftd-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="ftd-drawer__header">
          <div className="ftd-drawer__header-title">
            <h3>Chi tiết Lịch hẹn Tham quan</h3>
            <span className="ftd-drawer__header-subtitle">Mã yêu cầu</span>
          </div>
          <button className="ftd-drawer__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="ftd-drawer__body">
          {/* Status Banner */}
          <div className="ftd-drawer__section">
            <div className={`ftd-status-banner ftd-status-banner--${tour.status}`}>
              <div className="ftd-status-banner__info">
                <span className="ftd-status-banner__label">Trạng thái hiện tại</span>
                <span className="ftd-status-banner__value">{theme.label}</span>
              </div>
              <div className={`ftd-status-banner__dot ftd-status-banner__dot--${tour.status} animate-pulse`} />
            </div>
          </div>

          {/* Visitor Details Card */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Thông tin Khách tham quan</div>
            <div className="ftd-detail-card">
              <div className="ftd-detail-card__header-row">
                <div className="ftd-detail-card__avatar">
                  {tour.contactName ? tour.contactName.charAt(0).toUpperCase() : 'V'}
                </div>
                <div>
                  <div className="ftd-detail-card__name">{tour.contactName}</div>
                  <div className="ftd-detail-card__subtitle">Người liên hệ chính</div>
                </div>
              </div>

              <div className="ftd-detail-list">
                <div className="ftd-detail-list__item">
                  <Phone size={15} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">{tour.contactPhone}</span>
                </div>
                {tour.contactEmail && (
                  <div className="ftd-detail-list__item">
                    <Mail size={15} className="ftd-detail-list__icon" />
                    <span className="ftd-detail-list__text">{tour.contactEmail}</span>
                  </div>
                )}
                <div className="ftd-detail-list__item">
                  <Users size={15} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">
                    {tour.numberOfVisitors} khách
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Details Card */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Thời gian Mong muốn</div>
            <div className="ftd-detail-card">
              <div className="ftd-schedule-grid">
                <div className="ftd-schedule-item">
                  <Calendar size={15} className="ftd-schedule-item__icon" />
                  <div className="ftd-schedule-item__content">
                    <span className="ftd-schedule-item__label">Ngày</span>
                    <span className="ftd-schedule-item__value">
                      {formatViDate(tour.preferredDate)}
                    </span>
                  </div>
                </div>

                {tour.preferredTimeSlot && (
                  <div className="ftd-schedule-item">
                    <Clock size={15} className="ftd-schedule-item__icon" />
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
                  <span className="ftd-notes-section__label">Ghi chú từ gia đình</span>
                  <p className="ftd-notes-section__text">
                    "{tour.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Confirmed Schedule Widget */}
          {tour.status === 'confirmed' && (
            <div className="ftd-drawer__section">
              <div className="ftd-drawer__section-title">Lịch hẹn đã xác nhận</div>
              <div className="ftd-detail-card ftd-detail-card--appointment">
                <div className="ftd-appointment-card__row">
                  {/* Calendar Widget */}
                  <div className="ftd-cal-widget flex-shrink-0">
                    <div className="ftd-cal-widget__month">
                      {tour.preferredDate ? new Date(tour.preferredDate).toLocaleDateString('vi-VN', { month: 'short' }).toUpperCase() : 'LỊCH HẸN'}
                    </div>
                    <div className="ftd-cal-widget__day">
                      {tour.preferredDate ? new Date(tour.preferredDate).getDate() : '??'}
                    </div>
                    <div className="ftd-cal-widget__year">
                      {tour.preferredDate ? new Date(tour.preferredDate).getFullYear() : '2026'}
                    </div>
                  </div>

                  <div>
                    <div className="ftd-appointment-card__title">Chuyến tham quan đã được xác nhận!</div>
                    <div className="ftd-appointment-card__subtitle">
                      Khung giờ: {tour.confirmedTimeSlot || tour.preferredTimeSlot || 'N/A'}
                    </div>
                    {tour.adminNotes && (
                      <div className="ftd-appointment-card__admin-notes">
                        <strong>Ghi chú từ nhân viên:</strong> "{tour.adminNotes}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rejection / Cancellation Widget */}
          {(tour.cancellationReason || tour.rejectionReason) && (
            <div className="ftd-drawer__section">
              <div className="ftd-drawer__section-title">Chi tiết Hủy lịch</div>
              <div className="ftd-detail-card ftd-detail-card--health-alert">
                <div className="ftd-cancellation-card__row">
                  <XCircle className="ftd-cancellation-card__icon" size={16} />
                  <div>
                    <div className="ftd-cancellation-card__title">
                      {tour.rejectionReason ? 'Bị từ chối bởi nhân viên' : 'Hủy bởi gia đình'}
                    </div>
                    <p className="ftd-cancellation-card__text">
                      "{tour.cancellationReason || tour.rejectionReason}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Stepper */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Tiến trình Tham quan</div>
            <div className="ftd-timeline">
              {steps.map((s, idx) => (
                <div key={s.key} className="ftd-timeline__node">
                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <div className={`ftd-timeline__line ${s.isDone ? 'is-done' : ''}`} />
                  )}

                  {/* Circle Node */}
                  <div
                    className={`ftd-timeline__circle ${s.isDone ? 'is-done' : ''} ${s.isActive ? 'is-active' : ''} ${s.isError ? 'is-error' : ''}`}
                  >
                    {s.isError ? (
                      <XCircle size={10} />
                    ) : s.isDone ? (
                      <CheckCircle size={10} />
                    ) : (
                      <div className="ftd-timeline__circle-dot" />
                    )}
                  </div>

                  {/* Node Description */}
                  <div className="ftd-timeline__content">
                    <div className={`ftd-timeline__node-title ${s.isActive ? 'is-active' : ''}`}>
                      {s.title}
                    </div>
                    <p className="ftd-timeline__node-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="ftd-drawer__footer">
          {showCancelConfirm ? (
            <form onSubmit={handleCancelSubmit} className="w-full flex flex-col gap-3.5">
              <span className="ftd-cancel-label">
                Vui lòng nhập lý do hủy yêu cầu:
              </span>
              <div>
                <textarea
                  className="ftd-cancel-textarea"
                  placeholder="Hãy chia sẻ lý do bạn cần hủy lịch..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  disabled={cancelling}
                />
              </div>

              {cancelError && (
                <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                  <AlertCircle size={14} />
                  <span>{cancelError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="ftd-btn ftd-btn--error flex-1"
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang hủy...
                    </>
                  ) : (
                    'Xác nhận Hủy'
                  )}
                </button>
                <button
                  type="button"
                  className="ftd-btn ftd-btn--secondary flex-1"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                >
                  Quay lại
                </button>
              </div>
            </form>
          ) : (
            <div className="w-full flex gap-3">
              {canCancel && (
                <button
                  className="ftd-btn ftd-btn--danger-outline"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Hủy yêu cầu
                </button>
              )}
              <button
                className={`ftd-btn ${
                  canCancel
                    ? 'ftd-btn--secondary'
                    : 'ftd-btn--primary'
                }`}
                onClick={onClose}
              >
                Đóng chi tiết
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
