import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, AlertCircle, Check } from 'lucide-react';

/**
 * Form quản lý danh sách người liên hệ khẩn cấp (Phụ lục 04).
 *
 * Props:
 *  - value: mảng contact hiện tại [{ fullName, relationship, phone, email, address, isPrimary }]
 *  - onChange: callback nhận mảng mới
 *  - maxContacts: số lượng tối đa (mặc định 3)
 *  - onSyncToResident: callback khi bấm "Đồng bộ vào quản lý thân nhân" - để parent xử lý API
 *  - syncStatus: 'idle' | 'saving' | 'success' | 'error'
 *  - relationshipOptions: danh sách gợi ý
 */

// Bảng dịch quan hệ sang tiếng Việt (không phân biệt hoa/thường)
const RELATIONSHIP_VI_MAP = {
  // Con
  child: 'Con',
  children: 'Con',
  son: 'Con trai',
  daughter: 'Con gái',
  'con': 'Con',
  'con trai': 'Con trai',
  'con gái': 'Con gái',
  'con gai': 'Con gái',
  // Vợ/Chồng
  spouse: 'Vợ/Chồng',
  husband: 'Chồng',
  wife: 'Vợ',
  'vợ/chồng': 'Vợ/Chồng',
  'vo/chong': 'Vợ/Chồng',
  'vợ': 'Vợ',
  'vo': 'Vợ',
  'chồng': 'Chồng',
  'chong': 'Chồng',
  // Cha/Mẹ
  parent: 'Cha/Mẹ',
  parents: 'Cha/Mẹ',
  father: 'Cha',
  mother: 'Mẹ',
  dad: 'Cha',
  mom: 'Mẹ',
  'cha/mẹ': 'Cha/Mẹ',
  'cha/me': 'Cha/Mẹ',
  'cha': 'Cha',
  'bố': 'Cha',
  'bo': 'Cha',
  'mẹ': 'Mẹ',
  'me': 'Mẹ',
  // Anh/Chị/Em
  sibling: 'Anh/Chị/Em',
  siblings: 'Anh/Chị/Em',
  brother: 'Anh/Em trai',
  sister: 'Chị/Em gái',
  'anh/chị/em': 'Anh/Chị/Em',
  'anh/chi/em': 'Anh/Chị/Em',
  'anh': 'Anh',
  'chị': 'Chị',
  'chi': 'Chị',
  'em': 'Em',
  // Cháu
  grandchild: 'Cháu',
  grandson: 'Cháu trai',
  granddaughter: 'Cháu gái',
  'cháu': 'Cháu',
  'chau': 'Cháu',
  // Ông/Bà
  grandparent: 'Ông/Bà',
  grandfather: 'Ông',
  grandmother: 'Bà',
  'ông/bà': 'Ông/Bà',
  'ong/ba': 'Ông/Bà',
  'ông': 'Ông',
  'ong': 'Ông',
  'bà': 'Bà',
  'ba': 'Bà',
  // Khác
  relative: 'Họ hàng',
  friend: 'Bạn',
  guardian: 'Người giám hộ',
  'người giám hộ': 'Người giám hộ',
  'nguoi giam ho': 'Người giám hộ',
  'họ hàng': 'Họ hàng',
  'ho hang': 'Họ hàng',
  'khác': 'Khác',
  'other': 'Khác',
};

/** Chuyển giá trị quan hệ sang tiếng Việt (để hiển thị trong form) */
const fmtRelationshipVi = (rel) => {
  if (!rel) return '';
  const trimmed = rel.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (RELATIONSHIP_VI_MAP[lower]) return RELATIONSHIP_VI_MAP[lower];
  if (RELATIONSHIP_VI_MAP[trimmed]) return RELATIONSHIP_VI_MAP[trimmed];
  return trimmed;
};
export default function EmergencyContactsForm({
  value = [],
  onChange,
  maxContacts = 3,
  onSyncToResident,
  syncStatus = 'idle',
  relationshipOptions = [],
  readOnly = false,
}) {
  const contacts = value || [];
  const ro = readOnly;

  const emptyContact = () => ({
    fullName: '',
    relationship: '',
    phone: '',
    email: '',
    address: '',
    isPrimary: false,
  });

  const addContact = () => {
    if (contacts.length >= maxContacts) return;
    onChange([...contacts, emptyContact()]);
  };

  const removeContact = (index) => {
    const next = contacts.filter((_, i) => i !== index);
    onChange(next);
  };

  const updateContact = (index, field, fieldValue) => {
    const next = contacts.map((c, i) =>
      i === index ? { ...c, [field]: fieldValue } : c
    );
    onChange(next);
  };

  const setPrimary = (index) => {
    const next = contacts.map((c, i) => ({
      ...c,
      isPrimary: i === index,
    }));
    onChange(next);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...contacts];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index) => {
    if (index === contacts.length - 1) return;
    const next = [...contacts];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    onChange(next);
  };

  return (
    <div className="ctc-section">
      <div className="ctc-section-header">
        <h4>
          <UserPlus size={16} />
          Người liên hệ khẩn cấp
        </h4>
        <button
          type="button"
          className="ctc-btn ctc-btn--primary"
          onClick={addContact}
          disabled={contacts.length >= maxContacts}
        >
          <Plus size={14} />
          Thêm người ({contacts.length}/{maxContacts})
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="ctc-empty">
          <AlertCircle size={14} />
          <span>Chưa có người liên hệ khẩn cấp. Bấm "Thêm người" để bắt đầu.</span>
        </div>
      ) : (
        <div className="ctc-contact-list">
          {contacts.map((c, i) => (
            <div key={i} className={`ctc-contact-card${c.isPrimary ? ' ctc-contact-card--primary' : ''}`}>
              <div className="ctc-contact-row">
                <div className="ctc-contact-num">{i + 1}</div>
                <div className="ctc-contact-fields">
                  <div className="ctc-field">
                    <label>Họ và tên *</label>
                    <input
                      type="text"
                      value={c.fullName || ''}
                      onChange={(e) => updateContact(i, 'fullName', e.target.value)}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                  <div className="ctc-field">
                    <label>Quan hệ *</label>
                    <input
                      type="text"
                      list="relationship-suggestions"
                      value={fmtRelationshipVi(c.relationship)}
                      onChange={(e) => updateContact(i, 'relationship', e.target.value)}
                      placeholder="Con, Vợ/Chồng, Anh/Chị/Em…"
                      required
                    />
                  </div>
                </div>
                <div className="ctc-contact-actions">
                  <button
                    type="button"
                    className="ctc-icon-btn"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    title="Lên"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="ctc-icon-btn"
                    onClick={() => moveDown(i)}
                    disabled={i === contacts.length - 1}
                    title="Xuống"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    className={`ctc-icon-btn${c.isPrimary ? ' ctc-icon-btn--active' : ''}`}
                    onClick={() => setPrimary(i)}
                    title={c.isPrimary ? 'Đang là liên hệ chính' : 'Đặt làm liên hệ chính'}
                  >
                    {c.isPrimary ? <Check size={14} /> : '★'}
                  </button>
                  <button
                    type="button"
                    className="ctc-icon-btn ctc-icon-btn--danger"
                    onClick={() => removeContact(i)}
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="ctc-contact-row">
                <div className="ctc-contact-num"></div>
                <div className="ctc-contact-fields ctc-contact-fields--3">
                  <div className="ctc-field">
                    <label>Số điện thoại *</label>
                    <input
                      type="tel"
                      value={c.phone || ''}
                      onChange={(e) => updateContact(i, 'phone', e.target.value)}
                      placeholder="0909xxxxxx"
                      required
                    />
                  </div>
                  <div className="ctc-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={c.email || ''}
                      onChange={(e) => updateContact(i, 'email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="ctc-field">
                    <label>Địa chỉ</label>
                    <input
                      type="text"
                      value={c.address || ''}
                      onChange={(e) => updateContact(i, 'address', e.target.value)}
                      placeholder="Số nhà, đường, phường, quận…"
                    />
                  </div>
                </div>
                <div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {onSyncToResident && (
        <div className="ctc-sync-bar">
          <button
            type="button"
            className="ctc-btn ctc-btn--sync"
            onClick={onSyncToResident}
            disabled={contacts.length === 0 || syncStatus === 'saving'}
          >
            {syncStatus === 'saving' ? 'Đang đồng bộ…' : 'Đồng bộ vào Quản lý thân nhân'}
          </button>
          {syncStatus === 'success' && (
            <span className="ctc-sync-msg ctc-sync-msg--success">
              <Check size={12} />
              Đã lưu vào hồ sơ người cao tuổi
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="ctc-sync-msg ctc-sync-msg--error">
              <AlertCircle size={12} />
              Lỗi đồng bộ — kiểm tra kết nối
            </span>
          )}
          <span className="ctc-sync-hint">
            Lưu các liên hệ này vào hồ sơ người cao tuổi (trang Quản lý thân nhân)
          </span>
        </div>
      )}
    </div>
  );
}
