import {
  ChevronRight,
  AlertTriangle,
  User,
  Check,
  ClipboardCheck,
  Clock,
  Lock,
  Share2,
  Eye,
} from 'lucide-react';

const formatEnglishDate = (dateStr) => {
  if (!dateStr) return '';
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

const getStatusLabel = (status) => {
  switch (status) {
    case 'new_request':
      return 'Pending';
    case 'consulting':
      return 'Consulting';
    case 'assessing':
      return 'Assessing';
    case 'contracting':
      return 'Contracting';
    case 'checked_in':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Pending';
  }
};

export default function LockoutScreen({
  activeRequest,
  setDuplicateDetected,
  setStep,
  setFormData,
  setErrors,
  admissions = [],
  navigate,
}) {
  return (
    <div className="sap-lockout">
      {/* breadcrumbs */}
      <div className="sap-lockout__breadcrumbs">
        <span>Family Portal</span>
        <ChevronRight size={12} />
        <span>Admission Requests</span>
        <ChevronRight size={12} />
        <span className="sap-lockout__breadcrumbs-active">New Request</span>
      </div>

      {/* page header */}
      <div className="sap-lockout__header">
        <h1 className="sap-page__title">New Admission Request</h1>
        <p className="sap-page__subtitle">
          Initiate the transition process for your loved one with our specialist care team.
        </p>
      </div>

      {/* duplicate banner */}
      <div className="sap-lockout__banner">
        <div className="sap-lockout__banner-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="sap-lockout__banner-content">
          <h3 className="sap-lockout__banner-title">Duplicate Request Detected</h3>
          <p className="sap-lockout__banner-text">
            You already have a pending admission request for this person. Our team is currently reviewing the existing application submitted on <strong>{formatEnglishDate(activeRequest?.createdAt || new Date())}</strong>. To avoid confusion, further requests for this individual are restricted.
          </p>
        </div>
        <div className="sap-lockout__banner-actions">
          <button
            type="button"
            className="sap-lockout__banner-btn"
            onClick={() => {
              document.getElementById('recent-requests-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            View Pending Request
            <ChevronRight size={16} />
          </button>
              <button
                type="button"
                className="sap-lockout__banner-btn sap-lockout__banner-btn--edit"
                onClick={() => {
                  setDuplicateDetected(false);
                  setStep(1);
                  // Xóa trường định danh để phá vỡ điều kiện trùng lặp, mở lại biểu mẫu nhập liệu
                  setFormData((prev) => ({
                    ...prev,
                    idNumber: '',
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    idNumber: null,
                  }));
                }}
              >
                Go Back and Edit
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
    
          {/* locked stepper cards */}
          <div className="sap-lockout__cards-grid">
            <div className="sap-lockout__card sap-lockout__card--complete">
              <div className="sap-lockout__card-header">
                <span className="sap-lockout__card-step">STEP 01</span>
                <User size={18} className="sap-lockout__card-icon" />
              </div>
              <h4 className="sap-lockout__card-title">Applicant Information</h4>
              <p className="sap-lockout__card-desc">
                Verify the details of the future resident including medical history and preferences.
              </p>
              <div className="sap-lockout__card-badge is-complete">
                <Check size={14} />
                Complete
              </div>
            </div>
    
            <div className="sap-lockout__card sap-lockout__card--pending">
              <div className="sap-lockout__card-header">
                <span className="sap-lockout__card-step">STEP 02</span>
                <ClipboardCheck size={18} className="sap-lockout__card-icon" />
              </div>
              <h4 className="sap-lockout__card-title">Required Documents</h4>
              <p className="sap-lockout__card-desc">
                Upload ID, proof of residence, and recent medical evaluation forms.
              </p>
              <div className="sap-lockout__card-badge is-pending">
                <Clock size={14} />
                Pending Review
              </div>
            </div>
    
            <div className="sap-lockout__card sap-lockout__card--locked">
              <div className="sap-lockout__card-header">
                <span className="sap-lockout__card-step">STEP 03</span>
                <Lock size={18} className="sap-lockout__card-icon" />
              </div>
              <h4 className="sap-lockout__card-title">Submission Locked</h4>
              <p className="sap-lockout__card-desc">
                Cannot start a new request while another is active.
              </p>
              <div className="sap-lockout__card-badge is-locked">
                <Lock size={12} />
                Submission Locked
              </div>
            </div>
          </div>
    
          {/* recent requests table */}
          <div id="recent-requests-section" className="sap-lockout__table-section">
            <div className="sap-lockout__table-header">
              <h2 className="sap-lockout__table-title">Recent Requests</h2>
              <button
                type="button"
                className="sap-lockout__table-link"
                onClick={() => navigate('/family/admission-requests')}
              >
                View all history
                <Share2 size={12} style={{ marginLeft: 4 }} />
              </button>
            </div>
    
            <div className="sap-lockout__table-wrap">
              <table className="sap-lockout__table">
                <thead>
                  <tr>
                    <th>APPLICANT NAME</th>
                    <th>SUBMITTED ON</th>
                    <th>STATUS</th>
                    <th>REFERENCE ID</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((adm) => (
                    <tr key={adm._id || adm.id}>
                      <td style={{ fontWeight: 600, color: '#1A365D' }}>
                        {adm.applicant?.fullName || 'N/A'}
                      </td>
                      <td>
                        {formatEnglishDate(adm.createdAt)}
                      </td>
                      <td>
                        <span className={`sap-status-badge sap-status-badge--${adm.status}`}>
                          {getStatusLabel(adm.status)}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                        {adm.requestCode || `#ANH-${(adm._id || adm.id || '').substring(0, 4).toUpperCase()}`}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="sap-lockout__table-view-btn"
                          onClick={() => navigate(`/family/admission-requests`)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-8">
                    No recent requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
