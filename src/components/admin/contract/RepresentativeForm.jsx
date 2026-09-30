import React from 'react';

/**
 * Form Người đại diện Người cao tuổi (Điều 2)
 *
 * Props:
 *  - representative: { fullName, relationship, citizenId, phone, email, address }
 *  - onChange: callback nhận object mới
 *  - admission: read-only data từ admission (requestedByName, requestedByPhone…)
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

export default function RepresentativeForm({ representative = {}, onChange, admission = {}, readOnly = false }) {
  const data = representative || {};
  // Dịch relationship sang tiếng Việt để hiển thị (nếu đang là tiếng Anh)
  const displayRelationship = fmtRelationshipVi(data.relationship);
  const set = (k, v) => onChange({ ...data, [k]: v });
  const ro = readOnly;

  return (
    <div className="ctc-section">
      <div className="ctc-section-header">
        <h4>👤 Người đại diện Người cao tuổi</h4>
      </div>

      {admission && (
        <div className="ctc-info-banner">
          <strong>Đã có từ hồ sơ đăng ký:</strong>
          {admission.requestedByName && <span> • Tên: {admission.requestedByName}</span>}
          {admission.requestedByPhone && <span> • SĐT: {admission.requestedByPhone}</span>}
          {admission.requestedByEmail && <span> • Email: {admission.requestedByEmail}</span>}
        </div>
      )}

      <div className="ctc-form-grid ctc-form-grid--2">
        <div className="ctc-field">
          <label>Họ và tên *</label>
          <input
            type="text"
            value={data.fullName || ''}
            onChange={(e) => set('fullName', e.target.value)}
            placeholder={admission?.requestedByName || 'Nguyễn Văn B'}
            required
          />
        </div>
        <div className="ctc-field">
          <label>Quan hệ với NCT *</label>
          <input
            type="text"
            list="relationship-suggestions-rep"
            value={displayRelationship}
            onChange={(e) => set('relationship', e.target.value)}
            placeholder="Con, Vợ/Chồng, Anh/Chị/Em…"
            required
          />
          <datalist id="relationship-suggestions-rep">
            <option value="Con" />
            <option value="Con trai" />
            <option value="Con gái" />
            <option value="Vợ/Chồng" />
            <option value="Chồng" />
            <option value="Vợ" />
            <option value="Cha/Mẹ" />
            <option value="Anh/Chị/Em" />
            <option value="Cháu" />
            <option value="Ông/Bà" />
            <option value="Người giám hộ" />
          </datalist>
        </div>
        <div className="ctc-field">
          <label>CCCD/Hộ chiếu</label>
          <input
            type="text"
            value={data.citizenId || ''}
            onChange={(e) => set('citizenId', e.target.value)}
            placeholder="079123456789"
          />
        </div>
        <div className="ctc-field">
          <label>Số điện thoại *</label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => set('phone', e.target.value)}
            placeholder={admission?.requestedByPhone || '0909xxxxxx'}
            required
          />
        </div>
        <div className="ctc-field">
          <label>Email</label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => set('email', e.target.value)}
            placeholder={admission?.requestedByEmail || 'email@example.com'}
          />
        </div>
        <div className="ctc-field">
          <label>Địa chỉ liên hệ</label>
          <input
            type="text"
            value={data.address || ''}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Số nhà, đường, phường, quận…"
          />
        </div>
      </div>
    </div>
  );
}
