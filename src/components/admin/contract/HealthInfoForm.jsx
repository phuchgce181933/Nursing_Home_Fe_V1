import React from 'react';

/**
 * Form Thông tin sức khỏe ban đầu (Phụ lục 05)
 *
 * Props:
 *  - health: object { medicalHistory, allergies, other }
 *  - onChange: callback nhận object mới
 *  - applicant: object admission.applicant (read-only data đã có)
 */
export default function HealthInfoForm({ health = {}, onChange, applicant = {}, readOnly = false }) {
  const data = health || {};
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div className="ctc-section">
      <div className="ctc-section-header">
        <h4>🏥 Thông tin sức khỏe ban đầu</h4>
      </div>

      {applicant && (
        <div className="ctc-info-banner">
          <strong>Đã có từ hồ sơ đăng ký:</strong>
          {applicant.initialHealthCondition && <span> • Tình trạng: {applicant.initialHealthCondition}</span>}
          {applicant.allergies?.length > 0 && <span> • Dị ứng: {applicant.allergies.join(', ')}</span>}
          {applicant.chronicConditions?.length > 0 && <span> • Bệnh nền: {applicant.chronicConditions.join(', ')}</span>}
        </div>
      )}

      <div className="ctc-form-grid ctc-form-grid--2">
        <div className="ctc-field ctc-field--full">
          <label>Tiền sử bệnh</label>
          <textarea
            rows={2}
            value={data.medicalHistory || ''}
            onChange={(e) => set('medicalHistory', e.target.value)}
            placeholder={applicant?.chronicConditions?.join('; ') || 'Các bệnh đã mắc trước đây…'}
          />
        </div>
        <div className="ctc-field ctc-field--full">
          <label>Dị ứng</label>
          <textarea
            rows={2}
            value={data.allergies || ''}
            onChange={(e) => set('allergies', e.target.value)}
            placeholder={applicant?.allergies?.join(', ') || 'Dị ứng thuốc, thức ăn, môi trường…'}
          />
        </div>
        <div className="ctc-field ctc-field--full">
          <label>Thông tin khác</label>
          <textarea
            rows={2}
            value={data.other || ''}
            onChange={(e) => set('other', e.target.value)}
            placeholder="Thông tin bổ sung khác cần lưu ý…"
          />
        </div>
      </div>
    </div>
  );
}
