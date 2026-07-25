import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Users,
  MessageSquare,
  ChevronLeft,
  Send,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import facilityTourService from '../../services/facilityTour.service';

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
];

export default function SubmitFacilityTourPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    preferredDate: '',
    preferredTimeSlot: TIME_SLOTS[0],
    numberOfVisitors: 1,
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value, currentFormData = formData) => {
    const val = typeof value === 'string' ? value.trim() : (value ?? '');

    switch (name) {
      case 'contactName':
        if (!val) return 'Tên liên hệ là bắt buộc';
        if (val.length < 2 || val.length > 50) return 'Tên phải từ 2 đến 50 ký tự';
        return null;

      case 'contactPhone':
        if (!val) return 'Số điện thoại là bắt buộc';
        if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(val))
          return 'Số điện thoại không hợp lệ (di động 10 chữ số bắt đầu bằng 03, 05, 07, 08 hoặc 09).';
        return null;

      case 'contactEmail':
        if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Địa chỉ email không hợp lệ';
        return null;

      case 'notes':
        if (val && val.length > 500) return 'Ghi chú thêm không được vượt quá 500 ký tự';
        return null;

      case 'preferredDate': {
        if (!val) return 'Ngày mong muốn là bắt buộc';
        const dateObj = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) return 'Ngày mong muốn phải là hôm nay hoặc trong tương lai';

        // Check if selected time slot has passed if preferredDate is today
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        if (val === todayStr && currentFormData.preferredTimeSlot) {
          const [startPart] = currentFormData.preferredTimeSlot.split(' - ');
          if (startPart) {
            const [startHour, startMinute] = startPart.split(':').map(Number);
            if (!isNaN(startHour) && !isNaN(startMinute)) {
              const now = new Date();
              const curHour = now.getHours();
              const curMin = now.getMinutes();
              if (curHour > startHour || (curHour === startHour && curMin >= startMinute)) {
                return 'Khung giờ chọn cho ngày hôm nay đã ở quá khứ';
              }
            }
          }
        }
        return null;
      }

      case 'numberOfVisitors':
        const visitors = parseInt(value, 10);
        if (isNaN(visitors) || visitors < 1 || visitors > 20) {
          return 'Số lượng người tham quan phải từ 1 đến 20';
        }
        return null;

      default:
        return null;
    }
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const setField = (name, value) => {
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);
    const error = validateField(name, value, nextFormData);
    let nextErrors = { ...errors, [name]: error };
    if (name === 'preferredTimeSlot' || name === 'preferredDate') {
      nextErrors.preferredDate = validateField('preferredDate', nextFormData.preferredDate, nextFormData);
    }
    if (touched[name] || touched.preferredDate || name === 'preferredTimeSlot') {
      setErrors(nextErrors);
    }
  };

  const validateForm = () => {
    const fields = ['contactName', 'contactPhone', 'contactEmail', 'preferredDate', 'numberOfVisitors', 'notes'];
    const formErrors = {};
    let isValid = true;

    fields.forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) {
        formErrors[f] = err;
        isValid = false;
      }
    });

    setErrors(formErrors);
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim() || undefined,
        preferredDate: formData.preferredDate,
        preferredTimeSlot: formData.preferredTimeSlot,
        numberOfVisitors: parseInt(formData.numberOfVisitors, 10),
        notes: formData.notes.trim() || undefined,
      };

      const res = await facilityTourService.scheduleTour(payload);
      setSubmittedData(res?.tour || payload);
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        className="sftp-success"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="sftp-success__card">
          <motion.div
            className="sftp-success__icon-box"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
          >
            <CheckCircle size={48} className="sftp-success__icon" />
          </motion.div>
          <h2 className="sftp-success__title">Đăng ký tham quan thành công</h2>
          <p className="sftp-success__desc">
            Yêu cầu tham quan cơ sở của bạn đã được gửi thành công đến ban quản lý.
            Chúng tôi sẽ sớm liên hệ với bạn để xác nhận lịch hẹn chính thức.
          </p>

          <div className="sftp-success__details">
            <div className="sftp-success__detail-row">
              <span className="sftp-success__detail-label">Tên liên hệ:</span>
              <strong className="sftp-success__detail-value">{submittedData?.contactName}</strong>
            </div>
            <div className="sftp-success__detail-row">
              <span className="sftp-success__detail-label">Ngày mong muốn:</span>
              <strong className="sftp-success__detail-value">
                {submittedData?.preferredDate
                  ? new Date(submittedData.preferredDate).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Chưa xác định'}
              </strong>
            </div>
            {submittedData?.preferredTimeSlot && (
              <div className="sftp-success__detail-row">
                <span className="sftp-success__detail-label">Khung giờ:</span>
                <strong className="sftp-success__detail-value">{submittedData.preferredTimeSlot}</strong>
              </div>
            )}
            <div className="sftp-success__detail-row">
              <span className="sftp-success__detail-label">Số người:</span>
              <strong className="sftp-success__detail-value">{submittedData?.numberOfVisitors}</strong>
            </div>
          </div>

          <div className="sftp-success__actions">
            <button
              onClick={() => navigate('/family/facility-tours')}
              className="sftp-btn sftp-btn--primary"
            >
              Xem lịch sử tham quan
            </button>
            <button
              onClick={() => navigate('/')}
              className="sftp-btn sftp-btn--outline"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <form className="sftp-page" onSubmit={handleSubmit} noValidate>
      {/* ── Header ── */}
      <div className="sftp-header">
        <h1 className="sftp-header__title">Đăng ký tham quan cơ sở</h1>
        <p className="sftp-header__subtitle">
          Ghé thăm viện dưỡng lão hiện đại của chúng tôi, trải nghiệm các tiêu chuẩn Nhật Bản và nhận tư vấn trực tiếp từ các chuyên gia y tế.
        </p>
      </div>

      {/* ── Form Card ── */}
      <div className="sftp-card">
        <div className="sftp-grid">
          {/* Contact Name */}
          <div className={`sftp-group ${errors.contactName && touched.contactName ? 'has-error' : ''}`}>
            <label className="sftp-label">Tên liên hệ <span className="sftp-required">*</span></label>
            <div className="sftp-input-wrap">
              <User size={16} className="sftp-input-icon" />
              <input
                type="text"
                className="sftp-input"
                placeholder="Nhập họ và tên"
                value={formData.contactName}
                onChange={(e) => setField('contactName', e.target.value)}
                onBlur={() => handleBlur('contactName')}
                disabled={submitting}
              />
            </div>
            {errors.contactName && touched.contactName && (
              <span className="sftp-error-text">{errors.contactName}</span>
            )}
          </div>

          {/* Contact Phone */}
          <div className={`sftp-group ${errors.contactPhone && touched.contactPhone ? 'has-error' : ''}`}>
            <label className="sftp-label">Số điện thoại liên hệ <span className="sftp-required">*</span></label>
            <div className="sftp-input-wrap">
              <Phone size={16} className="sftp-input-icon" />
              <input
                type="tel"
                className="sftp-input"
                placeholder="Nhập số điện thoại"
                value={formData.contactPhone}
                onChange={(e) => setField('contactPhone', e.target.value)}
                onBlur={() => handleBlur('contactPhone')}
                disabled={submitting}
              />
            </div>
            {errors.contactPhone && touched.contactPhone && (
              <span className="sftp-error-text">{errors.contactPhone}</span>
            )}
          </div>

          {/* Contact Email */}
          <div className={`sftp-group ${errors.contactEmail && touched.contactEmail ? 'has-error' : ''}`}>
            <label className="sftp-label">Email liên hệ</label>
            <div className="sftp-input-wrap">
              <Mail size={16} className="sftp-input-icon" />
              <input
                type="email"
                className="sftp-input"
                placeholder="Nhập địa chỉ email"
                value={formData.contactEmail}
                onChange={(e) => setField('contactEmail', e.target.value)}
                onBlur={() => handleBlur('contactEmail')}
                disabled={submitting}
              />
            </div>
            {errors.contactEmail && touched.contactEmail && (
              <span className="sftp-error-text">{errors.contactEmail}</span>
            )}
          </div>

          {/* Preferred Date */}
          <div className={`sftp-group ${errors.preferredDate && touched.preferredDate ? 'has-error' : ''}`}>
            <label className="sftp-label">
              Ngày mong muốn *{' '}
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal', marginLeft: '4px' }}>
                (Chọn ngày hôm nay hoặc tương lai)
              </span>
            </label>
            <div className="sftp-input-wrap">
              <Calendar size={16} className="sftp-input-icon" />
              <input
                type="date"
                className="sftp-input"
                value={formData.preferredDate}
                onChange={(e) => setField('preferredDate', e.target.value)}
                onBlur={() => handleBlur('preferredDate')}
                disabled={submitting}
              />
            </div>
            {errors.preferredDate && touched.preferredDate && (
              <span className="sftp-error-text">{errors.preferredDate}</span>
            )}
          </div>

          {/* Preferred Time Slot */}
          <div className="sftp-group">
            <label className="sftp-label">Khung giờ mong muốn</label>
            <div className="sftp-input-wrap">
              <Clock size={16} className="sftp-input-icon" />
              <select
                className="sftp-input sftp-select"
                value={formData.preferredTimeSlot}
                onChange={(e) => setField('preferredTimeSlot', e.target.value)}
                disabled={submitting}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Number of Visitors */}
          <div className={`sftp-group ${errors.numberOfVisitors && touched.numberOfVisitors ? 'has-error' : ''}`}>
            <label className="sftp-label">Số lượng người tham quan <span className="sftp-required">*</span></label>
            <div className="sftp-input-wrap">
              <Users size={16} className="sftp-input-icon" />
              <input
                type="number"
                className="sftp-input"
                min="1"
                max="20"
                value={formData.numberOfVisitors}
                onChange={(e) => setField('numberOfVisitors', e.target.value)}
                onBlur={() => handleBlur('numberOfVisitors')}
                disabled={submitting}
              />
            </div>
            {errors.numberOfVisitors && touched.numberOfVisitors && (
              <span className="sftp-error-text">{errors.numberOfVisitors}</span>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className={`sftp-group sftp-group--full ${errors.notes && touched.notes ? 'has-error' : ''}`}>
          <label className="sftp-label">Ghi chú thêm</label>
          <div className="sftp-input-wrap sftp-textarea-wrap">
            <MessageSquare size={16} className="sftp-input-icon sftp-textarea-icon" />
            <textarea
              className="sftp-input sftp-textarea"
              placeholder="Cho chúng tôi biết nếu bạn có bất kỳ yêu cầu đặc biệt nào..."
              rows={4}
              maxLength={500}
              value={formData.notes}
              onChange={(e) => setField('notes', e.target.value)}
              onBlur={() => handleBlur('notes')}
              disabled={submitting}
            />
          </div>
          <div className="sftp-char-count">{(formData.notes || '').length}/500</div>
          {errors.notes && touched.notes && (
            <span className="sftp-error-text">{errors.notes}</span>
          )}
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="sftp-error-banner">
            <AlertCircle size={16} className="sftp-error-banner__icon" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sftp-footer">
          <button
            type="button"
            className="sftp-btn sftp-btn--outline"
            onClick={() => navigate('/')}
            disabled={submitting}
          >
            <ChevronLeft size={16} />
            Quay lại
          </button>

          <button
            type="submit"
            className="sftp-btn sftp-btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="sftp-spinner" />
                Đang gửi yêu cầu...
              </>
            ) : (
              <>
                <Send size={16} />
                Đăng ký tham quan
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
