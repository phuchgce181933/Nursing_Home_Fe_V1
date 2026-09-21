/**
 * Tiện ích điền dữ liệu tự động vào mẫu điều khoản hợp đồng
 *
 * Dùng dữ liệu từ admission (người cao tuổi + người đại diện) để fill vào
 * template điều khoản. Các placeholder dạng {KEY} sẽ được thay bằng giá trị thực.
 *
 * Cách dùng:
 *   import { buildContractTerms } from '../../utils/contractTermsUtils';
 *   const terms = buildContractTerms(admission, servicePackage, startDate);
 */

import CONTRACT_TERMS_TEMPLATE from '../constants/contractTermsTemplate';

// ── Format helpers ──────────────────────────────────────────────────────────

const ROOM_TYPE_LABELS = {
  standard: 'Phòng Standard',
  premium: 'Phòng Premium',
  icu: 'Phòng ICU',
  isolation: 'Phòng Cách ly',
  'Phòng đơn': 'Phòng đơn',
  'Phòng đôi': 'Phòng đôi',
  'Phòng 3-4 người': 'Phòng 3-4 người',
  'Phòng VIP': 'Phòng VIP',
};

const fmtRoomType = (roomType) => {
  if (!roomType) return '……';
  // Nếu đã là tiếng Việt thì giữ nguyên
  if (ROOM_TYPE_LABELS[roomType]) return ROOM_TYPE_LABELS[roomType];
  // Ngược lại format từ key
  const formatted = ROOM_TYPE_LABELS[roomType.toLowerCase()];
  return formatted || roomType || '……';
};

const fmtDate = (date) => {
  if (!date) return '……/……/…………';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const fmtDob = (date) => {
  if (!date) return '……/……/…………';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const fmtPhone = (phone) => phone?.trim() || '………………';
const fmtText = (val, fallback = '……') => val?.trim() || fallback;

/** Chuyển "2026-01-15" → "15/01/2026" cho điều khoản hợp đồng */
const fmtContractDate = (isoDateStr) => {
  if (!isoDateStr) return '……/……/20……';
  const [year, month, day] = isoDateStr.split('-');
  return `${day}/${month}/${year}`;
};

const fmtGender = (gender) => {
  const map = { male: 'Nam', female: 'Nữ', unknown: '……' };
  return map[gender] || gender || '……';
};

// Bảng dịch quan hệ sang tiếng Việt (không phân biệt hoa/thường, có dấu/không dấu)
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

const fmtRelationship = (rel) => {
  if (!rel) return '……';
  const trimmed = rel.trim();
  if (!trimmed) return '……';
  // Lookup trong bảng dịch (case-insensitive)
  const lower = trimmed.toLowerCase();
  if (RELATIONSHIP_VI_MAP[lower]) return RELATIONSHIP_VI_MAP[lower];
  // Nếu đã là tiếng Việt có dấu, kiểm tra match exact
  if (RELATIONSHIP_VI_MAP[trimmed]) return RELATIONSHIP_VI_MAP[trimmed];
  // Không tìm thấy → trả về nguyên giá trị (giả định đã là tiếng Việt)
  return trimmed;
};

/** Tạo dòng gói dịch vụ với tên + giá */
const fmtServicePackageLine = (pkg) => {
  if (!pkg) return '…… VNĐ/tháng';
  const price = pkg.monthlyPrice
    ? `${Number(pkg.monthlyPrice).toLocaleString('vi-VN')} VNĐ/tháng`
    : '…… VNĐ/tháng';
  const desc = fmtText(pkg.description, '');
  return `${price}${desc ? ` – ${desc}` : ''}`;
};

/** Format emergency contact list for Appendix 04 */
const fmtEmergencyContacts = (contacts) => {
  if (!contacts || contacts.length === 0) {
    return `1. ………………… – Quan hệ: ………… – SĐT: ………… – Địa chỉ: ………… – Ghi chú: …………
2. ………………… – Quan hệ: ………… – SĐT: ………… – Địa chỉ: ………… – Ghi chú: …………
3. ………………… – Quan hệ: ………… – SĐT: ………… – Địa chỉ: ………… – Ghi chú: …………`;
  }
  return contacts
    .slice(0, 3)
    .map((c, i) => `${i + 1}. ${fmtText(c.fullName)} – Quan hệ: ${fmtText(c.relationship)} – SĐT: ${fmtPhone(c.phone)} – Địa chỉ: ${fmtText(c.address)} – Ghi chú: …………`)
    .join('\n');
};

/** Format medication list for Appendix 06 */
const fmtMedicationList = (medications) => {
  if (!medications || medications.length === 0) {
    return `1. …………………… – Liều dùng/chỉ định: ………… – Thời điểm: ………… – Người kê: ………… – Ghi chú: …………
2. …………………… – Liều dùng/chỉ định: ………… – Thời điểm: ………… – Người kê: ………… – Ghi chú: …………
3. …………………… – Liều dùng/chỉ định: ………… – Thời điểm: ………… – Người kê: ………… – Ghi chú: …………`;
  }
  return medications
    .slice(0, 3)
    .map((m, i) => {
      const name = m.name || m.medicationName || m.tenThuoc || '……';
      const dose = m.dosage || m.dose || m.lieuDung || '……';
      const time = m.time || m.schedule || m.thoiGian || '……';
      const presc = m.prescribedBy || m.prescriber || m.bacSyChiDinh || '……';
      return `${i + 1}. ${fmtText(name)} – Liều dùng/chỉ định: ${fmtText(dose)} – Thời điểm: ${fmtText(time)} – Người kê: ${fmtText(presc)} – Ghi chú: …………`;
    })
    .join('\n');
};

/** Format allergies list */
const fmtAllergies = (allergies) => {
  if (!allergies || allergies.length === 0) return '□ Không  □ Có: …………………………………………';
  const list = allergies.join(', ');
  return `□ Không  □ Có: ${list}`;
};

/** Format chronic conditions list */
const fmtChronicConditions = (conditions) => {
  if (!conditions || conditions.length === 0) return '……';
  return conditions.join(', ');
};

/** Format health info for Appendix 05 */
const fmtHealthInfo = (admission) => {
  const medHistory = admission.applicant?.chronicConditions?.length
    ? admission.applicant.chronicConditions.join('; ')
    : '……';
  const allergies = admission.applicant?.allergies?.length
    ? admission.applicant.allergies.join('; ')
    : '……';
  const medications = admission.applicant?.currentMedications
    ? admission.applicant.currentMedications.join('; ')
    : '……';
  const diet = admission.applicant?.dietaryRequirements || '……';

  return {
    medicalHistory: medHistory,
    currentIllness: '……',
    allergies: allergies,
    medications: medications,
    diet: diet,
    mobilityLimitations: '……',
    specialCareNeeds: '……',
    other: '……',
  };
};

/** Format selfReliance level */
const fmtSelfReliance = (admission) => {
  // admission.applicant.initialHealthCondition may contain keywords
  const cond = admission.applicant?.initialHealthCondition?.toLowerCase() || '';
  if (cond.includes('tự lập') || cond.includes('tự lo')) return '□ Tự lập  □ Cần hỗ trợ  □ Cần chăm sóc nhiều';
  if (cond.includes('hỗ trợ')) return '□ Tự lập  ■ Cần hỗ trợ  □ Cần chăm sóc nhiều';
  if (cond.includes('chăm sóc')) return '□ Tự lập  □ Cần hỗ trợ  ■ Cần chăm sóc nhiều';
  return '□ Tự lập  □ Cần hỗ trợ  □ Cần chăm sóc nhiều';
};

// ── Main builder ────────────────────────────────────────────────────────────

/**
 * Build filled contract terms from admission data.
 *
 * @param {Object} admission - Admission document (from API)
 * @param {Object} servicePackage - ServicePackage document (optional, for price details)
 * @param {string} startDate - Contract start date (YYYY-MM-DD)
 * @param {string} endDate - Contract end date (YYYY-MM-DD)
 * @param {Object} resident - Resident document if already checked-in (optional)
 * @returns {string} Filled contract terms string
 */
export function buildContractTerms(admission, servicePackage, startDate, endDate, resident) {
  if (!admission) return CONTRACT_TERMS_TEMPLATE;

  const applicant = admission.applicant || {};
  const req = admission; // requestedBy fields directly on admission

  // Merge emergency contacts: resident.emergencyContacts takes priority,
  // fall back to requester info if not available
  const emergencyContacts = resident?.emergencyContacts?.length
    ? resident.emergencyContacts
    : null;

  // Build health info
  const healthInfo = fmtHealthInfo(admission);

  // ── Replacements map ──────────────────────────────────────────────────
  const replacements = {
    // Elderly person (Điều 2 & 3)
    '{ELDERLY_NAME}': fmtText(applicant.fullName),
    '{ELDERLY_DOB}': fmtDob(applicant.dateOfBirth),
    '{ELDERLY_CITIZEN_ID}': fmtText(applicant.citizenId),
    '{ELDERLY_ADDRESS}': fmtText(applicant.personalAddress),
    '{ELDERLY_HEALTH}': fmtText(applicant.initialHealthCondition),
    '{ELDERLY_SELF_RELIANCE}': fmtSelfReliance(admission),
    '{ELDERLY_ALLERGIES}': fmtAllergies(applicant.allergies),
    '{ELDERLY_CHRONIC}': fmtChronicConditions(applicant.chronicConditions),

    // Emergency contacts
    '{EMERGENCY_CONTACTS}': fmtEmergencyContacts(emergencyContacts),

    // Health info (Appendix 05)
    '{HEALTH_MEDICAL_HISTORY}': healthInfo.medicalHistory,
    '{HEALTH_ALLERGIES}': healthInfo.allergies,
    '{HEALTH_OTHER}': healthInfo.other,

    // Representative (Điều 2)
    '{REP_NAME}': fmtText(req.requestedByName),
    '{REP_RELATION}': fmtRelationship(applicant.relationshipToRequester),
    '{REP_CITIZEN_ID}': '…………',
    '{REP_PHONE}': fmtPhone(req.requestedByPhone),
    '{REP_EMAIL}': fmtText(req.requestedByEmail),
    '{REP_ADDRESS}': '……',

    // Service package (Điều 6, 7, Appendix 01)
    '{PKG_NAME}': fmtText(servicePackage?.name || admission.assignedServicePackage),
    '{PKG_PRICE}': servicePackage?.monthlyPrice
      ? Number(servicePackage.monthlyPrice).toLocaleString('vi-VN')
      : '………',
    '{PKG_PRICE_FULL}': servicePackage?.monthlyPrice
      ? `${Number(servicePackage.monthlyPrice).toLocaleString('vi-VN')} VNĐ/tháng`
      : '……… VNĐ/tháng',
    '{PKG_ROOM_TYPE}': fmtRoomType(servicePackage?.roomType),

    // Contract dates (Điều 9)
    '{CONTRACT_START}': fmtContractDate(startDate),
    '{CONTRACT_END}': fmtContractDate(endDate),
    '{CONTRACT_START_ISO}': startDate || '……/……/20……',
    '{CONTRACT_END_ISO}': endDate || '……/……/20……',
  };

  // Apply replacements
  let text = CONTRACT_TERMS_TEMPLATE;
  for (const [placeholder, value] of Object.entries(replacements)) {
    text = text.split(placeholder).join(value);
  }

  return text;
}

export default buildContractTerms;

// ═══════════════════════════════════════════════════════════════════════════════
// Build contract terms from structured form data
// ═══════════════════════════════════════════════════════════════════════════════

/** Build contract terms from structured form (used by ContractEditor) */
export function buildContractTermsFromForm(form, admission, startDate, endDate) {
  if (!form) return CONTRACT_TERMS_TEMPLATE;

  const rep = form.representative || {};
  const health = form.health || {};
  const pkg = form.package || {};
  const contacts = form.contacts || [];

  // Merge with admission data as fallback
  const applicant = admission?.applicant || {};
  const req = admission || {};

  const fmtF = (v, fallback) => v?.trim() || fallback;
  const fmtP = (v) => v ? `${Number(v).toLocaleString('vi-VN')} VNĐ/tháng` : '…… VNĐ/tháng';
  const fmtD = (iso) => {
    if (!iso) return '……/……/20……';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  // ── Representative ───────────────────────────────────────────
  const repName = fmtF(rep.fullName, req.requestedByName || '……');
  const repRelation = fmtRelationship(rep.relationship || applicant.relationshipToRequester);
  const repCitizenId = fmtF(rep.citizenId, '……');
  const repPhone = fmtF(rep.phone, req.requestedByPhone || '……');
  const repEmail = fmtF(rep.email, req.requestedByEmail || '……');
  const repAddress = fmtF(rep.address, '……');

  // ── Elderly (from admission) ─────────────────────────────────
  const eldName = fmtF(applicant.fullName);
  const eldDob = fmtDob(applicant.dateOfBirth);
  const eldCitizenId = fmtF(applicant.citizenId);
  const eldAddress = fmtF(applicant.personalAddress);
  const eldHealth = fmtF(applicant.initialHealthCondition);
  const eldAllergies = applicant.allergies?.length
    ? `□ Không  □ Có: ${applicant.allergies.join(', ')}`
    : '□ Không  □ Có: …………………………………………';
  const eldChronic = applicant.chronicConditions?.length
    ? applicant.chronicConditions.join(', ')
    : '……';

  // ── Emergency contacts ─────────────────────────────────────
  const fmtContact = (c, i) =>
    `${i + 1}. ${fmtF(c.fullName)} – Quan hệ: ${fmtRelationship(c.relationship)} – SĐT: ${fmtF(c.phone)} – Địa chỉ: ${fmtF(c.address)} – Ghi chú: …………`;

  const emergencyContactsText = contacts.length > 0
    ? contacts.map((c, i) => fmtContact(c, i)).join('\n')
    : `1. ………………… – Quan hệ: ………… – SĐT: ………… – Địa chỉ: ………… – Ghi chú: …………
2. ………………… – Quan hệ: ………… – SĐT: ………… – Địa chỉ: ………… – Ghi chú: …………
3. ………………… – Quan hệ: ………… – SĐT: ………… – Địa chỉ: ………… – Ghi chú: …………`;

  // ── Health info (Appendix 05) ───────────────────────────────
  const healthMedHistory = fmtF(health.medicalHistory || applicant.chronicConditions?.join('; '));
  const healthAllergies = fmtF(health.allergies || applicant.allergies?.join('; '));

  // ── Service package ─────────────────────────────────────────
  const pkgName = fmtF(pkg.name || pkg.servicePackage?.name || admission?.assignedServicePackage);
  const pkgPrice = pkg.monthlyPrice
    ? Number(pkg.monthlyPrice).toLocaleString('vi-VN')
    : '………';
  const pkgPriceFull = pkg.monthlyPrice
    ? `${Number(pkg.monthlyPrice).toLocaleString('vi-VN')} VNĐ/tháng`
    : '……… VNĐ/tháng';
  const pkgRoom = fmtRoomType(pkg.roomType);
  // ── Build the full text with all replacements ───────────
  const replacements = {
    // Điều 2 - Representative
    '{REP_NAME}': repName,
    '{REP_RELATION}': repRelation,
    '{REP_CITIZEN_ID}': repCitizenId,
    '{REP_PHONE}': repPhone,
    '{REP_EMAIL}': repEmail,
    '{REP_ADDRESS}': repAddress,

    // Điều 3 - Elderly
    '{ELDERLY_NAME}': eldName,
    '{ELDERLY_DOB}': eldDob,
    '{ELDERLY_CITIZEN_ID}': eldCitizenId,
    '{ELDERLY_ADDRESS}': eldAddress,
    '{ELDERLY_HEALTH}': eldHealth,
    '{ELDERLY_SELF_RELIANCE}': '□ Tự lập  □ Cần hỗ trợ  □ Cần chăm sóc nhiều',
    '{ELDERLY_ALLERGIES}': eldAllergies,
    '{ELDERLY_CHRONIC}': eldChronic,

    // Emergency contacts
    '{EMERGENCY_CONTACTS}': emergencyContactsText,

    // Health info
    '{HEALTH_MEDICAL_HISTORY}': healthMedHistory,
    '{HEALTH_ALLERGIES}': healthAllergies,
    '{HEALTH_OTHER}': fmtF(health.other),

    // Package
    '{PKG_NAME}': pkgName,
    '{PKG_PRICE}': pkgPrice,
    '{PKG_PRICE_FULL}': pkgPriceFull,
    '{PKG_ROOM_TYPE}': pkgRoom || '……',

    // Contract dates
    '{CONTRACT_START}': fmtD(startDate),
    '{CONTRACT_END}': fmtD(endDate),
  };

  let text = CONTRACT_TERMS_TEMPLATE;
  for (const [placeholder, value] of Object.entries(replacements)) {
    text = text.split(placeholder).join(value);
  }

  return text;
}

