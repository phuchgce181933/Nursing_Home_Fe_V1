import { motion } from 'motion/react';
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

const getStatusLabel = (status) => {
  switch (status) {
    case 'new_request':
      return 'Yêu cầu mới';
    case 'consulting':
      return 'Đang tư vấn';
    case 'assessing':
      return 'Đang đánh giá';
    case 'contracting':
      return 'Ký hợp đồng';
    case 'checked_in':
      return 'Đã nhận vào ở';
    case 'cancelled':
      return 'Đã huỷ';
    default:
      return status || 'Yêu cầu mới';
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
    <motion.div
      className="sap-lockout"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* breadcrumbs */}
      <div className="sap-lockout__breadcrumbs">
        <span>Trang Gia đình</span>
        <ChevronRight size={12} />
        <span>Yêu cầu tiếp nhận</span>
        <ChevronRight size={12} />
        <span className="sap-lockout__breadcrumbs-active">Yêu cầu mới</span>
      </div>

      {/* page header */}
      <div className="sap-lockout__header">
        <h1 className="sap-page__title">Yêu cầu tiếp nhận mới</h1>
        <p className="sap-page__subtitle">
          Bắt đầu quá trình tiếp nhận chăm sóc cho người thân yêu của bạn với đội ngũ chuyên gia của chúng tôi.
        </p>
      </div>

      {/* duplicate banner */}
      <div className="sap-lockout__banner">
        <div className="sap-lockout__banner-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="sap-lockout__banner-content">
          <h3 className="sap-lockout__banner-title">Phát hiện yêu cầu bị trùng lặp</h3>
          <p className="sap-lockout__banner-text">
            Bạn đã có một yêu cầu tiếp nhận đang chờ xử lý cho cư dân này. Đội ngũ của chúng tôi hiện đang xem xét hồ sơ hiện có được gửi vào ngày <strong>{formatViDate(activeRequest?.createdAt || new Date())}</strong>. Để tránh nhầm lẫn, các yêu cầu tiếp theo cho cá nhân này tạm thời bị hạn chế.
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
            Xem yêu cầu đang chờ
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
            Quay lại chỉnh sửa
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* locked stepper cards */}
      <div className="sap-lockout__cards-grid">
        <div className="sap-lockout__card sap-lockout__card--complete">
          <div className="sap-lockout__card-header">
            <span className="sap-lockout__card-step">BƯỚC 01</span>
            <User size={18} className="sap-lockout__card-icon" />
          </div>
          <h4 className="sap-lockout__card-title">Thông tin cư dân</h4>
          <p className="sap-lockout__card-desc">
            Xác minh thông tin chi tiết của cư dân tương lai bao gồm lịch sử y tế và sở thích.
          </p>
          <div className="sap-lockout__card-badge is-complete">
            <Check size={14} />
            Đã hoàn thành
          </div>
        </div>

        <div className="sap-lockout__card sap-lockout__card--pending">
          <div className="sap-lockout__card-header">
            <span className="sap-lockout__card-step">BƯỚC 02</span>
            <ClipboardCheck size={18} className="sap-lockout__card-icon" />
          </div>
          <h4 className="sap-lockout__card-title">Hồ sơ chuẩn bị</h4>
          <p className="sap-lockout__card-desc">
            Tải lên CCCD, giấy tờ cư trú và các biểu mẫu đánh giá y tế gần đây.
          </p>
          <div className="sap-lockout__card-badge is-pending">
            <Clock size={14} />
            Chờ duyệt
          </div>
        </div>

        <div className="sap-lockout__card sap-lockout__card--locked">
          <div className="sap-lockout__card-header">
            <span className="sap-lockout__card-step">BƯỚC 03</span>
            <Lock size={18} className="sap-lockout__card-icon" />
          </div>
          <h4 className="sap-lockout__card-title">Khóa gửi hồ sơ</h4>
          <p className="sap-lockout__card-desc">
            Không thể tạo yêu cầu mới khi yêu cầu khác đang hoạt động.
          </p>
          <div className="sap-lockout__card-badge is-locked">
            <Lock size={12} />
            Khóa gửi hồ sơ
          </div>
        </div>
      </div>

      {/* recent requests table */}
      <div id="recent-requests-section" className="sap-lockout__table-section">
        <div className="sap-lockout__table-header">
          <h2 className="sap-lockout__table-title">Yêu cầu gần đây</h2>
          <button
            type="button"
            className="sap-lockout__table-link"
            onClick={() => navigate('/family/admission-requests')}
          >
            Xem toàn bộ lịch sử
            <Share2 size={12} style={{ marginLeft: 4 }} />
          </button>
        </div>

        <div className="sap-lockout__table-wrap">
          <table className="sap-lockout__table">
            <thead>
              <tr>
                <th>HỌ TÊN CƯ DÂN</th>
                <th>NGÀY GỬI</th>
                <th>TRẠNG THÁI</th>
                <th>MÃ ĐƠN</th>
                <th>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map((adm) => (
                <tr key={adm._id || adm.id}>
                  <td style={{ fontWeight: 600, color: '#1A365D' }}>
                    {adm.applicant?.fullName || 'N/A'}
                  </td>
                  <td>
                    {formatViDate(adm.createdAt)}
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
                      title="Xem chi tiết"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-8">
                    Không tìm thấy yêu cầu nào gần đây.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
