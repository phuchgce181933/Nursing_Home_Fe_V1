import { ClipboardCheck, Phone, AlertCircle, Info } from 'lucide-react';

const ADMISSION_REASONS = [
  { value: 'long_term_care', label: 'Long-term Care' },
  { value: 'rehabilitation', label: 'Rehabilitation & Therapy' },
  { value: 'post_surgery',   label: 'Post-surgery Recovery' },
  { value: 'hospice',        label: 'Hospice & Palliative Care' },
  { value: 'other',          label: 'Other Reason' },
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
        Admission Details
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Preferred Date</label>
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
            Contact Phone
          </label>
          <input type="tel" placeholder="Enter contact phone number" {...field('contactPhone')} />
          {touched.contactPhone && errors.contactPhone && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.contactPhone}</span>
            </div>
          )}
        </div>
        <div className="sap-field sap-field--full">
          <label className="sap-label">Reason for Admission</label>
          <select {...selectField('admissionReason')}>
            <option value="">Select main reason</option>
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
          <label className="sap-label">Additional Notes</label>
          <textarea
            rows={4}
            placeholder="Special requests regarding room, dietary requirements, assistance, etc..."
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
              Upon submission, our <strong>An Nhien Care Home</strong> specialist team will contact you within <strong>24 hours</strong> to verify the information and guide you through the next steps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
