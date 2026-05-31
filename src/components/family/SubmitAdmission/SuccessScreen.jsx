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

const formatViDate = (dateStr) => {
  if (!dateStr) return '';
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
        <h2 className="sap-success__title">Yêu cầu đã được gửi thành công!</h2>
        <p className="sap-success__desc">
          Cảm ơn bạn đã chọn <strong>An Nhiên Care Home</strong>. Đội ngũ tư vấn của chúng tôi sẽ xem xét đơn và liên hệ với bạn trong vòng <strong>24 giờ</strong> tới.
        </p>

        {/* detail cards row */}
        <div className="sap-success__summary-grid">
          <div className="sap-success__summary-card">
            <div className="sap-success__summary-card-icon">
              <User size={20} />
            </div>
            <div className="sap-success__summary-card-info">
              <span className="sap-success__summary-card-label">CƯ DÂN</span>
              <span className="sap-success__summary-card-value">{patientName}</span>
            </div>
          </div>

          <div className="sap-success__summary-card">
            <div className="sap-success__summary-card-icon">
              <Calendar size={20} />
            </div>
            <div className="sap-success__summary-card-info">
              <span className="sap-success__summary-card-label">NGÀY MONG MUỐN</span>
              <span className="sap-success__summary-card-value">
                {rawPrefDate ? formatViDate(rawPrefDate) : 'Chưa xác định'}
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
            <h4 className="sap-success__advice-title">Các bước tiếp theo</h4>
            <p className="sap-success__advice-text">
              Vui lòng chuẩn bị giấy tờ tùy thân và hồ sơ y tế gần nhất của cư dân để hỗ trợ buổi tư vấn sắp tới.
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
            Xem lịch sử yêu cầu
          </button>
          <button
            type="button"
            className="sap-btn sap-btn--outline sap-success__btn"
            onClick={() => navigate('/family/dashboard')}
          >
            <Home size={16} />
            Về trang tổng quan
          </button>
        </div>

        {/* line break divider */}
        <hr className="sap-success__divider" />

        {/* hotline section footer */}
        <div className="sap-success__hotline-footer">
          <div className="sap-success__hotline-left">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120"
              alt="Ảnh nhân viên hỗ trợ"
              className="sap-success__hotline-avatar"
            />
            <div className="sap-success__hotline-text">
              <span className="sap-success__hotline-label">Cần hỗ trợ khẩn cấp?</span>
              <span className="sap-success__hotline-number">Hotline: 1900 8888</span>
            </div>
          </div>
          <div className="sap-success__hotline-actions">
            <button type="button" className="sap-success__hotline-icon-btn" aria-label="Gửi tin nhắn hỗ trợ">
              <MessageSquare size={18} />
            </button>
            <button type="button" className="sap-success__hotline-icon-btn" aria-label="Chia sẻ thông tin">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
