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
        Thông tin y tế
      </div>

      <div className="sap-grid-2">
        <div className="sap-field">
          <label className="sap-label">Nhóm máu</label>
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
          <label className="sap-label">Dị ứng</label>
          <TagInput
            tags={data.allergies ?? []}
            onAdd={(v) => onChange('allergies', [...(data.allergies ?? []), v])}
            onRemove={(v) => onChange('allergies', (data.allergies ?? []).filter((x) => x !== v))}
            placeholder="Nhập tác nhân dị ứng rồi bấm Enter (ví dụ: Penicillin)..."
          />
        </div>

        <div className="sap-field sap-field--full">
          <label className="sap-label">Bệnh lý mãn tính</label>
          <ChronicSelector
            selected={data.chronicConditions ?? []}
            onChange={(v) => onChange('chronicConditions', v)}
          />
        </div>

        <div className="sap-field sap-field--full">
          <label className="sap-label">Tóm tắt sức khỏe hiện tại</label>
          <textarea
            rows={4}
            placeholder="Mô tả trạng thái sức khỏe cơ bản, khả năng vận động, hỗ trợ ăn uống, v.v..."
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
