import { HeartPulse, AlertCircle } from 'lucide-react';
import TagInput from './TagInput';
import ChronicSelector from './ChronicSelector';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function Step2({ data = {}, onChange, errors = {}, touched = {}, onBlur }) {
  const textareaField = (name) => ({
    value: data[name] ?? '',
    onChange: (e) => onChange(name, e.target.value),
    onBlur: () => onBlur?.(name),
    className: `sap-textarea ${touched[name] && errors[name] ? 'has-error' : ''}`,
  });

  return (
    <div className="sap-section">
      <div className="sap-section__heading">
        <HeartPulse size={16} />
        Medical Information
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Blood Type</label>
          <select
            className="sap-select"
            value={data.bloodType ?? ''}
            onChange={(e) => onChange('bloodType', e.target.value)}
          >
            <option value="">Select Blood Type</option>
            {BLOOD_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </select>
        </div>

        <div className="sap-field">
          <label className="sap-label">Allergies</label>
          <TagInput
            tags={data.allergies ?? []}
            onAdd={(v) => onChange('allergies', [...(data.allergies ?? []), v])}
            onRemove={(v) => onChange('allergies', (data.allergies ?? []).filter((x) => x !== v))}
            placeholder="Enter allergy and press Enter (e.g., Penicillin)..."
          />
        </div>

        <div className="sap-field sap-field--full">
          <label className="sap-label">Chronic Conditions</label>
          <ChronicSelector
            selected={data.chronicConditions ?? []}
            onChange={(v) => onChange('chronicConditions', v)}
          />
        </div>

        <div className="sap-field sap-field--full">
          <label className="sap-label">Current Health Summary</label>
          <textarea
            rows={4}
            placeholder="Describe basic health status, mobility, dietary assistance, etc..."
            {...textareaField('healthCondition')}
          />
          {touched.healthCondition && errors.healthCondition && (
            <div className="sap-field__error-message">
              <AlertCircle size={12} />
              <span>{errors.healthCondition}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
