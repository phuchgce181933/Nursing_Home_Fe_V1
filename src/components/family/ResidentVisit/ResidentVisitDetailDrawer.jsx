import { useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import residentVisitService from '../../../services/residentVisit.service';

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
      return { label: 'Chờ duyệt', bg: 'bg-slate-100', text: 'text-slate-600' };
    case 'approved':
      return { label: 'Đã được duyệt', bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' };
    case 'rejected':
      return { label: 'Bị từ chối', bg: 'bg-red-50 text-error', text: 'text-error' };
    case 'cancelled':
      return { label: 'Đã hủy', bg: 'bg-red-50 text-error', text: 'text-error' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-600' };
  }
};

const CANCELLABLE_STATUSES = ['pending', 'approved'];

// ftd-status-banner CSS only defines pending/confirmed/completed/cancelled variants
// (from the Facility Tour feature) — map resident-visit statuses onto the closest
// existing visual variant instead of duplicating the CSS for approved/rejected.
const bannerStatusClass = (status) => {
  if (status === 'approved') return 'confirmed';
  if (status === 'rejected') return 'cancelled';
  return status;
};

export default function ResidentVisitDetailDrawer({ isOpen, onClose, visit, onCancelSuccess }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  if (!isOpen || !visit) return null;

  const theme = getStatusTheme(visit.status);
  const canCancel = CANCELLABLE_STATUSES.includes(visit.status);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setCancelError(null);
    setCancelling(true);

    try {
      await residentVisitService.cancelVisit(visit._id, {
        cancellationReason: cancelReason.trim() || undefined,
      });
      if (onCancelSuccess) onCancelSuccess();
      setShowCancelConfirm(false);
      setCancelReason('');
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể hủy lịch thăm.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  const residentName = visit.resident?.fullName || 'Người thân';

  return (
    <div className={`ftd-drawer-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
      <div className="ftd-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="ftd-drawer__header">
          <div className="ftd-drawer__header-title">
            <h3>Chi tiết Lịch thăm</h3>
            <span className="ftd-drawer__header-subtitle">Thăm {residentName}</span>
          </div>
          <button className="ftd-drawer__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="ftd-drawer__body">
          {/* Status Banner */}
          <div className="ftd-drawer__section">
            <div className={`ftd-status-banner ftd-status-banner--${bannerStatusClass(visit.status)}`}>
              <div className="ftd-status-banner__info">
                <span className="ftd-status-banner__label">Trạng thái hiện tại</span>
                <span className="ftd-status-banner__value">{theme.label}</span>
              </div>
              <div className={`ftd-status-banner__dot ftd-status-banner__dot--${bannerStatusClass(visit.status)} animate-pulse`} />
            </div>
          </div>

          {/* Visitor Details Card */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Thông tin Người đến thăm</div>
            <div className="ftd-detail-card">
              <div className="ftd-detail-card__header-row">
                <div className="ftd-detail-card__avatar">
                  {visit.visitorName ? visit.visitorName.charAt(0).toUpperCase() : 'V'}
                </div>
                <div>
                  <div className="ftd-detail-card__name">{visit.visitorName}</div>
                  <div className="ftd-detail-card__subtitle">Thăm {residentName}</div>
                </div>
              </div>

              <div className="ftd-detail-list">
                <div className="ftd-detail-list__item">
                  <Phone size={15} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">{visit.visitorPhone}</span>
                </div>
                <div className="ftd-detail-list__item">
                  <Users size={15} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">{visit.numberOfVisitors} khách</span>
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
                    <span className="ftd-schedule-item__value">{formatViDate(visit.requestedDate)}</span>
                  </div>
                </div>

                {visit.requestedTimeSlot && (
                  <div className="ftd-schedule-item">
                    <Clock size={15} className="ftd-schedule-item__icon" />
                    <div className="ftd-schedule-item__content">
                      <span className="ftd-schedule-item__label">Khung giờ</span>
                      <span className="ftd-schedule-item__value">{visit.requestedTimeSlot}</span>
                    </div>
                  </div>
                )}
              </div>

              {visit.notes && (
                <div className="ftd-notes-section">
                  <span className="ftd-notes-section__label">Ghi chú từ gia đình</span>
                  <p className="ftd-notes-section__text">"{visit.notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Rejection / Cancellation Widget */}
          {(visit.cancellationReason || visit.rejectionReason) && (
            <div className="ftd-drawer__section">
              <div className="ftd-drawer__section-title">Chi tiết Hủy / Từ chối</div>
              <div className="ftd-detail-card ftd-detail-card--health-alert">
                <div className="ftd-cancellation-card__row">
                  <XCircle className="ftd-cancellation-card__icon" size={16} />
                  <div>
                    <div className="ftd-cancellation-card__title">
                      {visit.rejectionReason ? 'Bị từ chối bởi nhân viên' : 'Hủy bởi gia đình'}
                    </div>
                    <p className="ftd-cancellation-card__text">
                      "{visit.cancellationReason || visit.rejectionReason}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {visit.status === 'approved' && (
            <div className="ftd-drawer__section">
              <div className="ftd-detail-card">
                <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                  <CheckCircle size={16} />
                  Lịch thăm đã được duyệt. Vui lòng đến đúng ngày và khung giờ đã đăng ký.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="ftd-drawer__footer">
          {showCancelConfirm ? (
            <form onSubmit={handleCancelSubmit} className="w-full flex flex-col gap-3.5">
              <span className="ftd-cancel-label">Vui lòng nhập lý do hủy lịch thăm:</span>
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
                <button type="submit" className="ftd-btn ftd-btn--error flex-1" disabled={cancelling}>
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
                <button className="ftd-btn ftd-btn--danger-outline" onClick={() => setShowCancelConfirm(true)}>
                  Hủy lịch thăm
                </button>
              )}
              <button
                className={`ftd-btn ${canCancel ? 'ftd-btn--secondary' : 'ftd-btn--primary'}`}
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
