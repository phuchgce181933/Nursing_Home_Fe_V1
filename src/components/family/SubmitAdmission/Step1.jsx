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
        Thông tin cơ bản
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Họ và tên</label>
          <input placeholder="Nhập họ tên người được chăm sóc" {...field('fullName')} />
          {touched.fullName && errors.fullName && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.fullName}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Ngày sinh</label>
          <input type="date" {...field('dob')} />
          {touched.dob && errors.dob && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.dob}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Giới tính</label>
          <select {...selectField('gender')}>
            <option value="">Chọn giới tính</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
          {touched.gender && errors.gender && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.gender}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">CMND / Hộ chiếu / Số định danh</label>
          <input placeholder="Nhập số CMND/hộ chiếu" {...field('idNumber')} />
          {touched.idNumber && errors.idNumber && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.idNumber}</span>
            </div>
          )}
        </div>
        <div className="sap-field sap-field--full">
          <label className="sap-label">Địa chỉ hiện tại</label>
          <input placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành phố..." {...field('address')} />
          {touched.address && errors.address && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.address}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Quan hệ với người được chăm sóc</label>
          <select {...selectField('relationship')}>
            <option value="">Chọn quan hệ</option>
            <option value="child">Con</option>
            <option value="spouse">Vợ/Chồng</option>
            <option value="sibling">Anh/Chị/Em</option>
            <option value="legal_guardian">Người giám hộ</option>
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
