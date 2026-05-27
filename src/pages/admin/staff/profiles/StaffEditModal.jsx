import { useRef, useState } from 'react';
import { ALL_STAFF_ROLE_OPTIONS } from '../../../../constants/rolePolicy';

const PASSWORD_REGEX_LETTER = /[a-zA-Z]/;
const PASSWORD_REGEX_DIGIT = /[0-9]/;

export default function StaffEditModal({
  form,
  onChange,
  onSave,
  onClose,
  error,
  roleOptions = ALL_STAFF_ROLE_OPTIONS,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [pwError, setPwError] = useState('');
  const fileRef = useRef();

  const set = (field, value) => onChange({ ...form, [field]: value });

  const handlePasswordChange = (val) => {
    set('password', val);
    if (!val) { setPwError(''); return; }
    if (val.length < 8) { setPwError('Ít nhất 8 ký tự'); return; }
    if (!PASSWORD_REGEX_LETTER.test(val)) { setPwError('Phải có ít nhất 1 chữ cái'); return; }
    if (!PASSWORD_REGEX_DIGIT.test(val)) { setPwError('Phải có ít nhất 1 chữ số'); return; }
    setPwError('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) set('avatarFile', file);
  };

  const handleSave = () => {
    if (pwError) return;
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scroll" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Cập nhật hồ sơ nhân viên</h2>

        {error && <p className="form-error">{error}</p>}

        {/* ── Thông tin cá nhân (User model) ── */}
        <div className="form-section-title">Thông tin cá nhân</div>
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>Họ và tên *</label>
            <input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="0912345678"
            />
          </div>

          <div className="form-group">
            <label>Giới tính</label>
            <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">—</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div className="form-group">
            <label>Ngày sinh</label>
            <input
              type="date"
              value={form.dateOfBirth || ''}
              onChange={(e) => set('dateOfBirth', e.target.value)}
            />
          </div>

          <div className="form-group form-grid--full">
            <label>Địa chỉ</label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Số nhà, đường, phường..."
            />
          </div>

          {/* Avatar — thuộc User.avatarUrl */}
          <div className="form-group form-grid--full">
            <label>Ảnh đại diện</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(form.avatarFile || form.avatarUrl) && (
                <img
                  src={form.avatarFile ? URL.createObjectURL(form.avatarFile) : form.avatarUrl}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                />
              )}
              <button type="button" className="btn-outline-sm" onClick={() => fileRef.current?.click()}>
                {form.avatarFile ? 'Đổi ảnh' : 'Chọn ảnh'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
          </div>
        </div>

        {/* ── Thông tin chuyên môn (StaffProfile model) ── */}
        <div className="form-section-title">Thông tin chuyên môn</div>
        <div className="form-grid">
          {/* role: quyền hệ thống — thuộc User.role */}
          <div className="form-group">
            <label>
              Vai trò hệ thống *
              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.7rem', marginLeft: 4 }}>
                (ảnh hưởng quyền truy cập)
              </span>
            </label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* roleCategory: chức danh cụ thể — thuộc StaffProfile.roleCategory */}
          <div className="form-group">
            <label>
              Chức danh
              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.7rem', marginLeft: 4 }}>
                (VD: Điều dưỡng trưởng)
              </span>
            </label>
            <input
              value={form.roleCategory}
              onChange={(e) => set('roleCategory', e.target.value)}
              placeholder="Điều dưỡng trưởng, Nội khoa..."
            />
          </div>

          {/* specialty — thuộc StaffProfile.specialty */}
          <div className="form-group form-grid--full">
            <label>Chuyên môn</label>
            <input
              value={form.specialty}
              onChange={(e) => set('specialty', e.target.value)}
              placeholder="Nội khoa, Hồi sức cấp cứu..."
            />
          </div>
        </div>

        {/* ── Bảo mật ── */}
        <div className="form-section-title">Bảo mật</div>
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label>
              Đặt lại mật khẩu
              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.7rem', marginLeft: 4 }}>
                (để trống nếu không đổi)
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password || ''}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Tối thiểu 8 ký tự, có chữ và số"
                style={{ paddingRight: 64, width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b',
                }}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            {pwError && <span className="field-error">{pwError}</span>}
          </div>
        </div>

        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSave} disabled={!!pwError}>Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
}
