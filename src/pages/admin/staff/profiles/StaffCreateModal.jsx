import { useRef, useState } from 'react';
import { ALL_STAFF_ROLE_OPTIONS } from '../../../../constants/rolePolicy';

// Mirror backend validators
const PHONE_REGEX = /^(\+84|0)[0-9]{8,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const validate = (form) => {
  const errs = {};

  if (!form.fullName.trim()) errs.fullName = 'Họ tên không được để trống';
  else if (form.fullName.trim().length < 2) errs.fullName = 'Họ tên ít nhất 2 ký tự';
  else if (form.fullName.trim().length > 100) errs.fullName = 'Họ tên tối đa 100 ký tự';

  if (!form.email.trim()) errs.email = 'Email không được để trống';
  else if (!EMAIL_REGEX.test(form.email.trim())) errs.email = 'Email không hợp lệ';

  if (!form.password) errs.password = 'Mật khẩu không được để trống';
  else if (form.password.length < 8) errs.password = 'Mật khẩu ít nhất 8 ký tự';
  else if (!/[a-zA-Z]/.test(form.password)) errs.password = 'Mật khẩu phải chứa ít nhất 1 chữ cái';
  else if (!/[0-9]/.test(form.password)) errs.password = 'Mật khẩu phải chứa ít nhất 1 chữ số';

  if (!form.role) errs.role = 'Vui lòng chọn vai trò';

  if (form.phone && !PHONE_REGEX.test(form.phone.trim())) {
    errs.phone = 'Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)';
  }

  if (form.username && !USERNAME_REGEX.test(form.username.trim())) {
    errs.username = 'Username 3–30 ký tự, chỉ chữ cái, số và dấu gạch dưới';
  }

  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errs.dateOfBirth = 'Ngày sinh không hợp lệ';
    } else if (dob > new Date()) {
      errs.dateOfBirth = 'Ngày sinh không thể trong tương lai';
    } else {
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 18);
      if (dob > minAge) errs.dateOfBirth = 'Nhân viên phải ít nhất 18 tuổi';
    }
  }

  return errs;
};

const emptyForm = {
  fullName: '', email: '', password: '', role: 'nurse',
  phone: '', username: '', gender: '', dateOfBirth: '',
  address: '', specialty: '', certifications: '',
};

export default function StaffCreateModal({
  onSave,
  onClose,
  serverError,
  roleOptions = ALL_STAFF_ROLE_OPTIONS,
}) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef();

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const certList = form.certifications
      ? form.certifications.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    onSave({
      ...form,
      certifications: certList,
      avatarFile: avatarFile || undefined,
    });
  };

  const field = (label, key, props = {}) => (
    <div className={`form-group${props.full ? ' form-grid--full' : ''}`}>
      <label>{label}</label>
      <input
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        {...(({ full, ...rest }) => rest)(props)}
      />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide modal--scroll" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Thêm nhân viên mới</h2>

        {serverError && <p className="form-error">{serverError}</p>}

        {/* Avatar upload */}
        <div className="avatar-upload">
          <div
            className="avatar-upload__preview"
            onClick={() => fileRef.current?.click()}
            title="Chọn ảnh đại diện"
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="preview" className="avatar-upload__img" />
              : <span className="avatar-upload__placeholder">📷</span>}
          </div>
          <div>
            <button type="button" className="btn-outline-sm" onClick={() => fileRef.current?.click()}>
              Chọn ảnh đại diện
            </button>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>
              JPG, PNG, WebP — tối đa 5MB
            </p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        <div className="form-section-title">Thông tin đăng nhập</div>
        <div className="form-grid">
          {field('Email *', 'email', { placeholder: 'nhanvien@example.com', type: 'email' })}
          {field('Mật khẩu *', 'password', { placeholder: 'Tối thiểu 8 ký tự, có chữ và số', type: 'password' })}
          {field('Username', 'username', { placeholder: 'Tùy chọn, 3–30 ký tự' })}
        </div>

        <div className="form-section-title">Thông tin cá nhân</div>
        <div className="form-grid">
          {field('Họ và tên *', 'fullName', { placeholder: 'Nguyễn Văn A', full: true })}
          {field('Số điện thoại', 'phone', { placeholder: '0912345678' })}
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
            <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
          </div>
          {field('Địa chỉ', 'address', { placeholder: 'Số nhà, đường, phường...', full: true })}
        </div>

        <div className="form-section-title">Thông tin chuyên môn</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Vai trò *</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && <span className="field-error">{errors.role}</span>}
          </div>
          {field('Chuyên môn', 'specialty', { placeholder: 'Nội khoa, Hồi sức...' })}
          {field('Chứng chỉ', 'certifications', { placeholder: 'BLS, ACLS, ... (cách nhau bằng dấu phẩy)', full: true })}
        </div>

        <div className="modal__actions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSubmit}>Tạo tài khoản</button>
        </div>
      </div>
    </div>
  );
}
