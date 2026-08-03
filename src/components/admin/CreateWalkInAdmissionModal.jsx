import { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import admissionService from '../../services/admission.service';

const emptyForm = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  citizenId: '',
  personalAddress: '',
  relationshipToRequester: '',
  requestedByName: '',
  requestedByEmail: '',
  requestedByPhone: '',
  preferredAdmissionDate: '',
  reasonForAdmission: '',
};

// For front-desk staff to register a walk-in family (no self-registered
// account yet) — a family account is auto-created and credentials sent by
// email/SMS once the admission reaches check-in (see adminCreateWalkInAdmission).
export default function CreateWalkInAdmissionModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) return setError('Vui lòng nhập họ tên người cao tuổi.');
    if (!form.relationshipToRequester.trim()) return setError('Vui lòng nhập quan hệ với người cao tuổi.');
    if (!form.requestedByName.trim()) return setError('Vui lòng nhập tên người nhà.');
    if (!form.requestedByEmail.trim() && !form.requestedByPhone.trim()) {
      return setError('Vui lòng nhập email hoặc số điện thoại của người nhà để hệ thống gửi tài khoản sau khi hoàn tất nhập viện.');
    }

    setSaving(true);
    try {
      await admissionService.adminCreateWalkInAdmission({
        applicant: {
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          citizenId: form.citizenId.trim() || undefined,
          personalAddress: form.personalAddress.trim() || undefined,
          relationshipToRequester: form.relationshipToRequester.trim(),
        },
        relationshipToRequester: form.relationshipToRequester.trim(),
        requestedByName: form.requestedByName.trim(),
        requestedByEmail: form.requestedByEmail.trim() || undefined,
        requestedByPhone: form.requestedByPhone.trim() || undefined,
        preferredAdmissionDate: form.preferredAdmissionDate || undefined,
        reasonForAdmission: form.reasonForAdmission.trim() || undefined,
      });
      setForm(emptyForm);
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo hồ sơ nhập viện.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose?.()}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={20} /> Tạo hồ sơ nhập viện (khách vãng lai)
          </h2>
          <button type="button" onClick={() => !saving && onClose?.()} aria-label="Đóng" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px' }}>
          Dành cho người nhà đến đăng ký trực tiếp, chưa có tài khoản trên hệ thống. Tài khoản sẽ được
          tự động tạo và gửi tới email/SĐT người nhà khi hoàn tất thủ tục nhập viện (check-in).
        </p>

        {error && (
          <div className="message message--error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="sap-section">
            <div className="sap-section__heading">Thông tin người cao tuổi</div>
            <div className="sap-grid-2">
              <div className="sap-field">
                <label className="sap-label">Họ và tên *</label>
                <input value={form.fullName} onChange={set('fullName')} placeholder="Nhập họ tên người cao tuổi" />
              </div>
              <div className="sap-field">
                <label className="sap-label">Ngày sinh</label>
                <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
              </div>
              <div className="sap-field">
                <label className="sap-label">Giới tính</label>
                <select value={form.gender} onChange={set('gender')}>
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div className="sap-field">
                <label className="sap-label">Số CCCD / Hộ chiếu</label>
                <input value={form.citizenId} onChange={set('citizenId')} placeholder="Nhập số định danh" />
              </div>
              <div className="sap-field sap-field--full">
                <label className="sap-label">Địa chỉ hiện tại</label>
                <input value={form.personalAddress} onChange={set('personalAddress')} placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố..." />
              </div>
              <div className="sap-field">
                <label className="sap-label">Quan hệ với người nhà *</label>
                <input value={form.relationshipToRequester} onChange={set('relationshipToRequester')} placeholder="VD: con trai, con gái..." />
              </div>
              <div className="sap-field">
                <label className="sap-label">Ngày dự kiến nhập viện</label>
                <input type="date" value={form.preferredAdmissionDate} onChange={set('preferredAdmissionDate')} />
              </div>
              <div className="sap-field sap-field--full">
                <label className="sap-label">Lý do nhập viện</label>
                <input value={form.reasonForAdmission} onChange={set('reasonForAdmission')} placeholder="Lý do cần nhập viện..." />
              </div>
            </div>
          </div>

          <div className="sap-section">
            <div className="sap-section__heading">Thông tin người nhà (để gửi tài khoản)</div>
            <div className="sap-grid-2">
              <div className="sap-field">
                <label className="sap-label">Họ và tên người nhà *</label>
                <input value={form.requestedByName} onChange={set('requestedByName')} placeholder="Nhập họ tên người nhà" />
              </div>
              <div />
              <div className="sap-field">
                <label className="sap-label">Email</label>
                <input type="email" value={form.requestedByEmail} onChange={set('requestedByEmail')} placeholder="email@example.com" />
              </div>
              <div className="sap-field">
                <label className="sap-label">Số điện thoại</label>
                <input value={form.requestedByPhone} onChange={set('requestedByPhone')} placeholder="0912345678" />
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Nhập ít nhất Email hoặc SĐT. Có Email → gửi tài khoản qua mail. Chỉ có SĐT → gửi qua SMS.
            </p>
          </div>

          <div className="modal-footer" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="button button--secondary" onClick={() => !saving && onClose?.()} disabled={saving}>
              Huỷ
            </button>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Đang tạo...' : 'Tạo hồ sơ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
