import { User, AlertCircle } from 'lucide-react';

export default function Step1({ data = {}, onChange, errors = {}, touched = {}, onBlur }) {
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

  return (
    <div className="sap-section">
      <div className="sap-section__heading">
        <User size={16} />
        Thông tin cơ bản / Basic Info
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Họ và tên / Full Name</label>
          <input placeholder="Nhập tên người nhập viện" {...field('fullName')} />
          {touched.fullName && errors.fullName && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.fullName}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Ngày sinh / Date of Birth</label>
          <input type="date" {...field('dob')} />
          {touched.dob && errors.dob && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.dob}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Giới tính / Gender</label>
          <select {...selectField('gender')}>
            <option value="">Chọn giới tính</option>
            <option value="male">Nam / Male</option>
            <option value="female">Nữ / Female</option>
            <option value="other">Khác / Other</option>
          </select>
          {touched.gender && errors.gender && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.gender}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">CCCD / Passport / ID Number</label>
          <input placeholder="Nhập số định danh" {...field('idNumber')} />
          {touched.idNumber && errors.idNumber && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.idNumber}</span>
            </div>
          )}
        </div>
        <div className="sap-field sap-field--full">
          <label className="sap-label">Địa chỉ hiện tại / Current Address</label>
          <input placeholder="Số nhà, tên đường, phường/xã..." {...field('address')} />
          {touched.address && errors.address && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.address}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Mối quan hệ / Relationship</label>
          <select {...selectField('relationship')}>
            <option value="">Chọn mối quan hệ</option>
            <option value="child">Con cái / Child</option>
            <option value="spouse">Vợ/Chồng / Spouse</option>
            <option value="sibling">Anh chị em / Sibling</option>
            <option value="legal_guardian">Người giám hộ / Guardian</option>
          </select>
          {touched.relationship && errors.relationship && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.relationship}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
