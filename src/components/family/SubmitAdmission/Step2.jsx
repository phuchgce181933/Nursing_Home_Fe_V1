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
        Tình trạng y tế / Medical Status
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Nhóm máu / Blood Type</label>
          <select
            className="sap-select"
            value={data.bloodType ?? ''}
            onChange={(e) => onChange('bloodType', e.target.value)}
          >
            <option value="">Chọn nhóm máu</option>
            {BLOOD_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </select>
        </div>

        <div className="sap-field">
          <label className="sap-label">Dị ứng / Allergies</label>
          <TagInput
            tags={data.allergies ?? []}
            onAdd={(v) => onChange('allergies', [...(data.allergies ?? []), v])}
            onRemove={(v) => onChange('allergies', (data.allergies ?? []).filter((x) => x !== v))}
            placeholder="Nhập và nhấn Enter (VD: Kháng sinh)..."
          />
        </div>

        <div className="sap-field sap-field--full">
          <label className="sap-label">Bệnh mãn tính / Chronic Conditions</label>
          <ChronicSelector
            selected={data.chronicConditions ?? []}
            onChange={(v) => onChange('chronicConditions', v)}
          />
        </div>

        <div className="sap-field sap-field--full">
          <label className="sap-label">Tình trạng sức khỏe hiện tại / Initial Health Condition</label>
          <textarea
            rows={4}
            placeholder="Mô tả sơ lược về sức khỏe, khả năng đi lại, ăn uống..."
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
