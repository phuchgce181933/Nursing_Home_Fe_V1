import { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  Loader2,
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
      return { label: 'Chờ duyệt' };
    case 'approved':
      return { label: 'Đã duyệt' };
    case 'rejected':
      return { label: 'Bị từ chối' };
    case 'cancelled':
      return { label: 'Đã hủy bởi gia đình' };
    default:
      return { label: status };
  }
};

// ftd-status-banner CSS chỉ định nghĩa biến thể pending/confirmed/completed/cancelled
// (từ tính năng Facility Tour) — dùng lại biến thể gần nhất về màu sắc.
const bannerStatusClass = (status) => {
  if (status === 'approved') return 'confirmed';
  if (status === 'rejected') return 'cancelled';
  return status;
};

export default function StaffVisitDetailDrawer({ isOpen, onClose, visit, canReview, onActionSuccess }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!isOpen || !visit) return null;

  const theme = getStatusTheme(visit.status);
  const isPending = visit.status === 'pending';

  const handleApprove = async () => {
    setActionError(null);
    setApproving(true);
    try {
      await residentVisitService.approveVisit(visit._id);
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.message || 'Không thể duyệt yêu cầu thăm.');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    setActionError(null);
    setRejecting(true);
    try {
      await residentVisitService.rejectVisit(visit._id, { rejectionReason: rejectionReason.trim() });
      setShowRejectModal(false);
      setRejectionReason('');
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.message || 'Không thể từ chối yêu cầu thăm.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className={`ftd-drawer-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
      <div className="ftd-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="ftd-drawer__header">
          <div className="ftd-drawer__header-title">
            <h3>Chi tiết Yêu cầu Thăm</h3>
            <span className="ftd-drawer__header-subtitle">
              Mã tham chiếu: #{visit._id?.substring(18).toUpperCase()}
            </span>
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

          {/* Resident info */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Người thân được thăm</div>
            <div className="ftd-detail-card">
              <div className="ftd-detail-card__header-row">
                <div className="ftd-detail-card__avatar" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <User size={16} />
                </div>
                <div>
                  <div className="ftd-detail-card__name">{visit.resident?.fullName || 'N/A'}</div>
                  <div className="ftd-detail-card__subtitle">
                    Mã cư dân: {visit.resident?.residentCode || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Family account info */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Tài khoản gia đình</div>
            <div className="ftd-detail-card">
              <div className="ftd-detail-list">
                <div className="ftd-detail-list__item">
                  <Mail size={14} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">{visit.familyAccount?.email || 'N/A'}</span>
                </div>
                <div className="ftd-detail-list__item">
                  <Phone size={14} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">{visit.familyAccount?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visitor Info */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Thông tin Người đến thăm</div>
            <div className="ftd-detail-card">
              <div className="ftd-detail-card__header-row">
                <div className="ftd-detail-card__avatar">
                  {visit.visitorName ? visit.visitorName.charAt(0).toUpperCase() : 'V'}
                </div>
                <div>
                  <div className="ftd-detail-card__name">{visit.visitorName}</div>
                  <div className="ftd-detail-card__subtitle">Người liên hệ</div>
                </div>
              </div>
              <div className="ftd-detail-list">
                <div className="ftd-detail-list__item">
                  <Phone size={14} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">{visit.visitorPhone}</span>
                </div>
                <div className="ftd-detail-list__item">
                  <Users size={14} className="ftd-detail-list__icon" />
                  <span className="ftd-detail-list__text">{visit.numberOfVisitors} người</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="ftd-drawer__section">
            <div className="ftd-drawer__section-title">Lịch mong muốn</div>
            <div className="ftd-detail-card">
              <div className="ftd-schedule-grid">
                <div className="ftd-schedule-item">
                  <Calendar size={14} className="ftd-schedule-item__icon" />
                  <div className="ftd-schedule-item__content">
                    <span className="ftd-schedule-item__label">Ngày</span>
                    <span className="ftd-schedule-item__value">{formatViDate(visit.requestedDate)}</span>
                  </div>
                </div>
                {visit.requestedTimeSlot && (
                  <div className="ftd-schedule-item">
                    <Clock size={14} className="ftd-schedule-item__icon" />
                    <div className="ftd-schedule-item__content">
                      <span className="ftd-schedule-item__label">Khung giờ</span>
                      <span className="ftd-schedule-item__value">{visit.requestedTimeSlot}</span>
                    </div>
                  </div>
                )}
              </div>
              {visit.notes && (
                <div className="ftd-notes-section">
                  <span className="ftd-notes-section__label">Ghi chú của gia đình</span>
                  <p className="ftd-notes-section__text">"{visit.notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation / Rejection widget */}
          {(visit.cancellationReason || visit.rejectionReason) && (
            <div className="ftd-drawer__section">
              <div className="ftd-drawer__section-title">Chi tiết hủy / từ chối</div>
              <div className="ftd-detail-card ftd-detail-card--health-alert" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
                <div className="ftd-cancellation-card__row flex items-start gap-3">
                  <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="ftd-cancellation-card__title text-red-800 font-bold" style={{ fontSize: '13.5px' }}>
                      {visit.rejectionReason ? 'Bị từ chối bởi nhân viên' : 'Đã hủy bởi gia đình'}
                    </div>
                    <p className="ftd-cancellation-card__text text-red-700 italic mt-1 font-medium" style={{ fontSize: '12.5px' }}>
                      "{visit.cancellationReason || visit.rejectionReason}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {actionError && (
            <div className="ftd-drawer__section">
              <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                <XCircle size={14} />
                <span>{actionError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer actions */}
        <div className="ftd-drawer__footer">
          {isPending && canReview ? (
            <div className="w-full flex gap-3">
              <button
                className="ftd-btn ftd-btn--danger-outline flex-1 flex justify-center items-center gap-1.5"
                onClick={() => setShowRejectModal(true)}
                disabled={approving}
              >
                Từ chối
              </button>
              <button
                className="ftd-btn ftd-btn--primary flex-1 flex justify-center items-center gap-1.5"
                style={{ backgroundColor: '#1B365D' }}
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Đang duyệt...
                  </>
                ) : (
                  'Duyệt yêu cầu'
                )}
              </button>
            </div>
          ) : isPending && !canReview ? (
            <div className="w-full text-center text-xs text-slate-500 font-medium py-1">
              Chỉ quản lý hoặc admin mới có quyền duyệt/từ chối yêu cầu này.
            </div>
          ) : (
            <button className="ftd-btn ftd-btn--primary w-full" onClick={onClose}>
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title text-red-800">Từ chối yêu cầu thăm</h4>
            <p className="arh-modal__text">
              Bạn có chắc muốn từ chối yêu cầu thăm của{' '}
              <strong className="text-slate-800">{visit.visitorName}</strong>? Vui lòng cung cấp lý do
              bên dưới. Tài khoản gia đình sẽ được thông báo.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '100px', borderColor: '#fca5a5' }}
                  placeholder="Nêu rõ lý do (vd: Khung giờ trùng với lịch khám bệnh của cư dân...)"
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
                  onClick={() => setShowRejectModal(false)}
                  disabled={rejecting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                  disabled={rejecting}
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
