import { ClipboardCheck, Phone, AlertCircle, Info } from 'lucide-react';

const ADMISSION_REASONS = [
  { value: 'long_term_care', label: 'Chăm sóc dài hạn / Long-term care' },
  { value: 'rehabilitation', label: 'Phục hồi chức năng / Rehab' },
  { value: 'post_surgery',   label: 'Chăm sóc sau phẫu thuật / Post-surgery' },
  { value: 'hospice',        label: 'Chăm sóc cuối đời / Hospice' },
  { value: 'other',          label: 'Khác / Other' },
];

export default function Step3({ data = {}, onChange, errors = {}, touched = {}, onBlur }) {
  const field = (name) => ({
    value: data[name] ?? '',
    onChange: (e) => onChange(name, e.target.value),
    onBlur: () => onBlur?.(name),
    className: `sap-input ${touched[name] && errors[name] ? 'has-error' : ''}`,
  });

  const selectField = (name) => ({
    value: data[name] ?? '',
    onChange: (e) => onChange(name, e.target.value),
    onBlur: () => onBlur?.(name),
    className: `sap-select ${touched[name] && errors[name] ? 'has-error' : ''}`,
  });

  const textareaField = (name) => ({
    value: data[name] ?? '',
    onChange: (e) => onChange(name, e.target.value),
    onBlur: () => onBlur?.(name),
    className: `sap-textarea ${touched[name] && errors[name] ? 'has-error' : ''}`,
  });

  return (
    <div className="sap-section">
      <div className="sap-section__heading">
        <ClipboardCheck size={16} />
        Chi tiết nhập viện / Admission Details
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Ngày dự kiến nhập viện / Preferred Date</label>
          <input type="date" {...field('preferredDate')} />
          {touched.preferredDate && errors.preferredDate && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.preferredDate}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">
            <Phone size={13} style={{ display: 'inline', marginRight: 4 }} />
            Số điện thoại liên hệ / Contact Phone
          </label>
          <input type="tel" placeholder="Nhập số điện thoại" {...field('contactPhone')} />
          {touched.contactPhone && errors.contactPhone && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.contactPhone}</span>
            </div>
          )}
        </div>
        <div className="sap-field sap-field--full">
          <label className="sap-label">Lý do nhập viện / Reason for Admission</label>
          <select {...selectField('admissionReason')}>
            <option value="">Chọn lý do chính</option>
            {ADMISSION_REASONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {touched.admissionReason && errors.admissionReason && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.admissionReason}</span>
            </div>
          )}
        </div>
        <div className="sap-field sap-field--full">
          <label className="sap-label">Ghi chú thêm / Additional Notes</label>
          <textarea
            rows={4}
            placeholder="Yêu cầu đặc biệt về phòng ở, chế độ dinh dưỡng, v.v..."
            {...textareaField('additionalNotes')}
          />
          {touched.additionalNotes && errors.additionalNotes && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.additionalNotes}</span>
            </div>
          )}
        </div>

        <div className="sap-field sap-field--full">
          <div className="sap-info-alert">
            <Info size={18} className="sap-info-alert__icon" />
            <p>
              Sau khi gửi yêu cầu, đội ngũ chuyên viên của{' '}
              <strong>ElderCare</strong> sẽ liên hệ với bạn trong vòng{' '}
              <strong>24 giờ</strong> để xác nhận thông tin và hướng dẫn các
              bước tiếp theo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
