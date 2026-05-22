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
        Basic Information
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Full Name</label>
          <input placeholder="Enter resident's full name" {...field('fullName')} />
          {touched.fullName && errors.fullName && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.fullName}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Date of Birth</label>
          <input type="date" {...field('dob')} />
          {touched.dob && errors.dob && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.dob}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Gender</label>
          <select {...selectField('gender')}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {touched.gender && errors.gender && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.gender}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Citizen ID / Passport / ID Number</label>
          <input placeholder="Enter ID number" {...field('idNumber')} />
          {touched.idNumber && errors.idNumber && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.idNumber}</span>
            </div>
          )}
        </div>
        <div className="sap-field sap-field--full">
          <label className="sap-label">Current Address</label>
          <input placeholder="Street address, ward, district, city..." {...field('address')} />
          {touched.address && errors.address && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.address}</span>
            </div>
          )}
        </div>
        <div className="sap-field">
          <label className="sap-label">Relationship to Resident</label>
          <select {...selectField('relationship')}>
            <option value="">Select Relationship</option>
            <option value="child">Child</option>
            <option value="spouse">Spouse</option>
            <option value="sibling">Sibling</option>
            <option value="legal_guardian">Guardian</option>
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
