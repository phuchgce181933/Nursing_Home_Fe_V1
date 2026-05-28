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

const formatEnglishDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
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
        label: 'Pending Review',
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
    case 'confirmed':
      return {
        label: 'Approved & Confirmed',
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-sky-50 text-sky-700',
        text: 'text-sky-700',
        dot: 'bg-sky-500',
      };
    case 'cancelled':
      return {
        label: 'Cancelled / Rejected',
        bg: 'bg-red-50 text-error',
        text: 'text-error',
        dot: 'bg-error',
      };
    default:
      return {
        label: status || 'Unknown',
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

  // Administrative action states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [confirmedTimeSlot, setConfirmedTimeSlot] = useState('');
  const [customTimeSlot, setCustomTimeSlot] = useState('');
  const [isCustomSlot, setIsCustomSlot] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Fetch tour detail when opened or tourId changed
  useEffect(() => {
    if (!isOpen || !tourId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await facilityTourService.adminGetTourDetail(tourId);
        setTour(res?.tour || null);
        
        // Initialize default confirmed time slot
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
        setError('Could not connect to the server to load tour request details.');
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
      
      // Re-fetch detail
      const res = await facilityTourService.adminGetTourDetail(tourId);
      setTour(res?.tour || null);
    } catch (err) {
      console.error('Failed to approve tour request:', err);
      alert(err.response?.data?.message || 'An error occurred while approving the tour request. Please try again.');
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
      
      // Re-fetch detail
      const res = await facilityTourService.adminGetTourDetail(tourId);
      setTour(res?.tour || null);
    } catch (err) {
      console.error('Failed to reject tour request:', err);
      alert(err.response?.data?.message || 'An error occurred while rejecting the tour request.');
    } finally {
      setRejecting(false);
    }
  };

  const isPending = tour?.status === 'pending';
  const isCancellable = ['pending', 'confirmed'].includes(tour?.status || '');
  const theme = tour ? getStatusTheme(tour.status) : null;

  return (
    <div className={`ftd-drawer-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
      <div className="ftd-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="ftd-drawer__header">
          <div className="ftd-drawer__header-title">
            <h3>Administrative Tour Details</h3>
            <span className="ftd-drawer__header-subtitle">
              Reference ID: {tour ? `#${tour._id.substring(18).toUpperCase()}` : ''}
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
              <p className="text-sm font-semibold">Retrieving tour requirement details...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="text-red-500 mx-auto mb-3" size={36} />
              <p className="text-sm font-bold text-slate-800 mb-1">Load Failed</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all">
                Close Drawer
              </button>
            </div>
          ) : !tour ? (
            <p className="p-6 text-center text-slate-400 text-xs">No tour requests found.</p>
          ) : (
            <>
              {/* Status Banner */}
              <div className="ftd-drawer__section">
                <div className={`ftd-status-banner ftd-status-banner--${tour.status}`}>
                  <div className="ftd-status-banner__info">
                    <span className="ftd-status-banner__label">Current Status</span>
                    <span className="ftd-status-banner__value">{theme?.label}</span>
                  </div>
                  <div className={`ftd-status-banner__dot ftd-status-banner__dot--${tour.status} animate-pulse`} />
                </div>
              </div>

              {/* Family Account info */}
              <div className="ftd-drawer__section">
                <div className="ftd-drawer__section-title">Family Account Profile</div>
                <div className="ftd-detail-card">
                  <div className="ftd-detail-card__header-row">
                    <div className="ftd-detail-card__avatar" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <User size={16} />
                    </div>
                    <div>
                      <div className="ftd-detail-card__name">
                        {tour.familyAccount?.fullName || 'Registered User'}
                      </div>
                      <div className="ftd-detail-card__subtitle">Family Member Account</div>
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
                <div className="ftd-drawer__section-title">Visitor Contact Info</div>
                <div className="ftd-detail-card">
                  <div className="ftd-detail-card__header-row">
                    <div className="ftd-detail-card__avatar">
                      {tour.contactName ? tour.contactName.charAt(0).toUpperCase() : 'V'}
                    </div>
                    <div>
                      <div className="ftd-detail-card__name">{tour.contactName}</div>
                      <div className="ftd-detail-card__subtitle">Contact Person</div>
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
                        {tour.numberOfVisitors} visitor{tour.numberOfVisitors > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferred Schedule Card */}
              <div className="ftd-drawer__section">
                <div className="ftd-drawer__section-title">Preferred Schedule</div>
                <div className="ftd-detail-card">
                  <div className="ftd-schedule-grid">
                    <div className="ftd-schedule-item">
                      <Calendar size={14} className="ftd-schedule-item__icon" />
                      <div className="ftd-schedule-item__content">
                        <span className="ftd-schedule-item__label">Date</span>
                        <span className="ftd-schedule-item__value">
                          {formatEnglishDate(tour.preferredDate)}
                        </span>
                      </div>
                    </div>

                    {tour.preferredTimeSlot && (
                      <div className="ftd-schedule-item">
                        <Clock size={14} className="ftd-schedule-item__icon" />
                        <div className="ftd-schedule-item__content">
                          <span className="ftd-schedule-item__label">Time Slot</span>
                          <span className="ftd-schedule-item__value">
                            {tour.preferredTimeSlot}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {tour.notes && (
                    <div className="ftd-notes-section">
                      <span className="ftd-notes-section__label">Family Notes</span>
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
                  <div className="ftd-drawer__section-title">Confirmed Appointment</div>
                  <div className="ftd-detail-card ftd-detail-card--appointment">
                    <div className="ftd-appointment-card__row">
                      <div className="ftd-cal-widget flex-shrink-0">
                        <div className="ftd-cal-widget__month">
                          {tour.preferredDate ? new Date(tour.preferredDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : 'VISIT'}
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
                          Appointment is Confirmed!
                        </div>
                        <div className="ftd-appointment-card__subtitle" style={{ fontWeight: '600' }}>
                          Time Slot: {tour.confirmedTimeSlot || tour.preferredTimeSlot || 'N/A'}
                        </div>
                        {tour.adminNotes && (
                          <div className="ftd-appointment-card__admin-notes mt-2 p-2 bg-white/70 rounded border border-emerald-100">
                            <strong>Admin Notes:</strong> "{tour.adminNotes}"
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
                  <div className="ftd-drawer__section-title">Cancellation Details</div>
                  <div className="ftd-detail-card ftd-detail-card--health-alert" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
                    <div className="ftd-cancellation-card__row flex items-start gap-3">
                      <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <div className="ftd-cancellation-card__title text-red-800 font-bold" style={{ fontSize: '13.5px' }}>
                          {tour.rejectionReason ? 'Rejected by Staff' : 'Cancelled by Family'}
                        </div>
                        <p className="ftd-cancellation-card__text text-red-700 italic mt-1 font-medium" style={{ fontSize: '12.5px' }}>
                          "{tour.cancellationReason || tour.rejectionReason}"
                        </p>
                        <div className="text-[11px] text-red-500 mt-2">
                          Date: {formatEnglishDate(tour.cancelledAt || tour.rejectedAt)}
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
                Reject Tour
              </button>
              <button
                className="ftd-btn ftd-btn--primary flex-1 flex justify-center items-center gap-1.5"
                style={{ backgroundColor: '#1B365D' }}
                onClick={() => setShowApproveModal(true)}
              >
                Approve Tour
              </button>
            </div>
          ) : (
            <button className="ftd-btn ftd-btn--primary w-full" onClick={onClose}>
              Close Details
            </button>
          )}
        </div>
      </div>

      {/* Approve Modal Backdrop */}
      {showApproveModal && (
        <div className="arh-modal-backdrop" onClick={() => setShowApproveModal(false)}>
          <div className="arh-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="arh-modal__title">Approve Facility Tour Request</h4>
            <p className="arh-modal__text">
              Confirm the tour schedule for <strong className="text-slate-800">{tour?.contactName}</strong> on <strong className="text-emerald-700">{formatEnglishDate(tour?.preferredDate)}</strong>.
            </p>

            <form onSubmit={handleApproveSubmit}>
              {/* Confirmed Time Slot Option Selector */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Confirmed Time Slot
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
                      <option value="custom">-- Custom Time Slot --</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm font-sans"
                      placeholder="e.g., 09:30 - 11:30"
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
                      Choose from list
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Administrative Notes <span className="text-slate-400 font-normal italic text-[11px] ml-1">(optional)</span>
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Provide meeting point, responsible receptionist, or guidelines for the visitor..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              {/* Footer buttons */}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#1B365D' }}
                  disabled={approving}
                >
                  {approving && <Loader2 className="animate-spin mr-1" size={13} />}
                  Confirm Approval
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
            <h4 className="arh-modal__title text-red-800">Reject Tour Request</h4>
            <p className="arh-modal__text">
              Are you sure you want to reject the tour request from <strong className="text-slate-800">{tour?.contactName}</strong>? Please provide a reason below. This will notify the family account.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="arh-modal__textarea"
                  style={{ minHeight: '100px', borderColor: '#fca5a5' }}
                  placeholder="State the reason clearly (e.g., Nursing home fully booked on this date, construction work active in block A...)"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-apply flex-1 justify-center bg-red-600 hover:bg-red-700"
                  style={{ borderRadius: '20px', padding: '10px 24px', backgroundColor: '#dc2626' }}
                  disabled={rejecting || !rejectionReason.trim()}
                >
                  {rejecting && <Loader2 className="animate-spin mr-1" size={13} />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
