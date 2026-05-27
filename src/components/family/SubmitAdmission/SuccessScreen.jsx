import {
  Check,
  User,
  Calendar,
  Info,
  History,
  Home,
  MessageSquare,
  Share2,
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

export default function SuccessScreen({ submittedData = {}, formData = {}, navigate }) {
  const patientName = submittedData?.applicant?.fullName || formData.fullName || 'N/A';
  const rawPrefDate = submittedData?.preferredAdmissionDate || formData.preferredDate;

  return (
    <div className="sap-success">
      <div className="sap-success__card">
        {/* circle checked icon */}
        <div className="sap-success__icon-wrap">
          <Check size={36} />
        </div>

        {/* success message */}
        <h2 className="sap-success__title">Request Submitted Successfully!</h2>
        <p className="sap-success__desc">
          Thank you for choosing <strong>An Nhien Care Home</strong>. Our advisory team will review your application and contact you within the next <strong>24 hours</strong>.
        </p>

        {/* detail cards row */}
        <div className="sap-success__summary-grid">
          <div className="sap-success__summary-card">
            <div className="sap-success__summary-card-icon">
              <User size={20} />
            </div>
            <div className="sap-success__summary-card-info">
              <span className="sap-success__summary-card-label">RESIDENT</span>
              <span className="sap-success__summary-card-value">{patientName}</span>
            </div>
          </div>

          <div className="sap-success__summary-card">
            <div className="sap-success__summary-card-icon">
              <Calendar size={20} />
            </div>
            <div className="sap-success__summary-card-info">
              <span className="sap-success__summary-card-label">PREFERRED DATE</span>
              <span className="sap-success__summary-card-value">
                {rawPrefDate ? formatEnglishDate(rawPrefDate) : 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* advice block */}
        <div className="sap-success__advice-box">
          <div className="sap-success__advice-icon">
            <Info size={18} />
          </div>
          <div className="sap-success__advice-content">
            <h4 className="sap-success__advice-title">Next Steps</h4>
            <p className="sap-success__advice-text">
              Please prepare the resident's identification documents and most recent medical records to facilitate our upcoming consultation.
            </p>
          </div>
        </div>

        {/* navigation buttons */}
        <div className="sap-success__actions">
          <button
            type="button"
            className="sap-btn sap-btn--primary sap-success__btn"
            onClick={() => navigate('/family/admission-requests')}
          >
            <History size={16} />
            View Request History
          </button>
          <button
            type="button"
            className="sap-btn sap-btn--outline sap-success__btn"
            onClick={() => navigate('/family/dashboard')}
          >
            <Home size={16} />
            Back to Dashboard
          </button>
        </div>

        {/* line break divider */}
        <hr className="sap-success__divider" />

        {/* hotline section footer */}
        <div className="sap-success__hotline-footer">
          <div className="sap-success__hotline-left">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120"
              alt="Support Staff Avatar"
              className="sap-success__hotline-avatar"
            />
            <div className="sap-success__hotline-text">
              <span className="sap-success__hotline-label">Need Urgent Support?</span>
              <span className="sap-success__hotline-number">Hotline: 1900 8888</span>
            </div>
          </div>
          <div className="sap-success__hotline-actions">
            <button type="button" className="sap-success__hotline-icon-btn" aria-label="Send support message">
              <MessageSquare size={18} />
            </button>
            <button type="button" className="sap-success__hotline-icon-btn" aria-label="Share information">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
