/**
 * admission.service.js
 * Dịch vụ kết nối API cho phân hệ Quản lý Nhập Viện (Admission Management)
 *
 * Base URL: /api
 * Auth: Bearer Token (tự động được gắn bởi axiosClient interceptor)
 */

import axiosClient from '../api/axiosClient';

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY - Admission Requests (/api/family/admission-requests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UC-6.1 | Submit Admission Request
 * Gửi yêu cầu đăng ký nhập viện / lưu trú cho người thân.
 *
 * SCENARIO A – Người thân mới (chưa có hồ sơ):
 *   body = {
 *     applicant: {
 *       fullName: 'Nguyễn Văn A',          // BẮT BUỘC
 *       dateOfBirth: '1955-10-15',          // YYYY-MM-DD
 *       gender: 'male',                      // 'male' | 'female' | 'other' | 'unknown'
 *       citizenId: '012345678901',
 *       bloodType: 'O+',                     // 'A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'
 *       personalAddress: '123 Đường Láng...',
 *       relationshipToRequester: 'Bố',       // BẮT BUỘC
 *       allergies: ['Hải sản'],              // Mảng chuỗi
 *       chronicConditions: ['Cao huyết áp'],  // Mảng chuỗi
 *       initialHealthCondition: 'Đi lại cần gậy chống',
 *     },
 *     preferredAdmissionDate: '2026-06-01',  // YYYY-MM-DD
 *     reasonForAdmission: 'Lý do cần nhập viện...',
 *     requestedByPhone: '0987654321',
 *     notes: 'Ghi chú thêm...',
 *   }
 *
 * SCENARIO B – Người thân đã có hồ sơ trong hệ thống (đã có residentId):
 *   body = {
 *     residentId: '65f8a2b3c4d5e6f7a8b9c0d1', // BẮT BUỘC (khi dùng scenario này)
 *     relationshipToRequester: 'Mẹ',
 *     preferredAdmissionDate: '2026-06-10',
 *     reasonForAdmission: 'Lý do...',
 *     requestedByPhone: '0912345678',
 *     notes: 'Ghi chú...',
 *   }
 *
 * @param {object} body - Dữ liệu form
 * @returns {object} { message, admission }
 */
const submitAdmissionRequest = async (body) => {
  const response = await axiosClient.post('/family/admission-requests', body);
  return response.data;
};

/**
 * UC-6.1 | View Request History
 * Xem danh sách / lịch sử các yêu cầu nhập viện của Family (có phân trang).
 *
 * @param {object} params - Query parameters
 * @param {string} [params.status]  - Lọc theo trạng thái: 'new_request' | 'consulting' | 'assessing' | 'contracting' | 'checked_in' | 'cancelled'
 * @param {string} [params.search]  - Tìm theo mã đơn / tên người thân / CCCD
 * @param {string} [params.from]    - Từ ngày gửi đơn (YYYY-MM-DD)
 * @param {string} [params.to]      - Đến ngày gửi đơn (YYYY-MM-DD)
 * @param {number} [params.page]    - Số trang (mặc định: 1)
 * @param {number} [params.limit]   - Số bản ghi / trang (mặc định: 20, tối đa: 100)
 * @returns {object} { data: Admission[], total, page, limit, totalPages }
 */
const getAdmissionHistory = async (params = {}) => {
  const response = await axiosClient.get('/family/admission-requests', { params });
  return response.data;
};

/**
 * UC-6.1 | View Detail Request History
 * Xem chi tiết một yêu cầu nhập viện cụ thể của Family.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @returns {object} { admission }
 */
const getAdmissionDetail = async (admissionId) => {
  const response = await axiosClient.get(`/family/admission-requests/${admissionId}`);
  return response.data;
};

/**
 * UC-6.1 | Cancel Registration Request
 * Hủy một yêu cầu nhập viện (chỉ được hủy khi chưa checked_in và chưa cancelled).
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} [body]
 * @param {string} [body.cancellationReason] - Lý do hủy đơn (khuyến khích điền)
 * @returns {object} { message, admission }
 */
const cancelAdmissionRequest = async (admissionId, body = {}) => {
  const response = await axiosClient.patch(
    `/family/admission-requests/${admissionId}/cancel`,
    body
  );
  return response.data;
};

/**
 * UC-6.1 | Re-submit Previous Admission Request (Family)
 * Gửi lại yêu cầu nhập viện cho cùng một cư dân sau khi hợp đồng cũ đã kết thúc
 * (cư dân đã xuất viện hoặc hợp đồng bị hủy). Hệ thống tái sử dụng admission cũ
 * (giữ nguyên residentId, applicant, familyAccountId) và reset workflow để đi lại:
 * new_request → admin duyệt → bác sĩ khám → tạo hợp đồng mới.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện cũ
 * @param {object} [body]
 * @param {string} [body.reason] - Lý do gửi lại (tùy chọn, tối đa 500 ký tự)
 * @returns {object} { message, admission }
 */
const resubmitAdmissionRequest = async (admissionId, body = {}) => {
  const response = await axiosClient.post(
    `/family/admission-requests/${admissionId}/resubmit`,
    body
  );
  return response.data;
};

/**
 * Real-time check for duplicate citizenId
 * Kiểm tra xem CCCD/Hộ chiếu đã được sử dụng chưa (cả trong admissions lẫn residents)
 *
 * @param {string} citizenId - Số CCCD/Hộ chiếu cần kiểm tra
 * @returns {object} { duplicate: boolean, source: 'admission'|'resident'|null }
 */
const checkCitizenIdDuplicate = async (citizenId) => {
  if (!citizenId || !citizenId.trim()) {
    return { duplicate: false, source: null };
  }
  const response = await axiosClient.get('/family/admission-requests/check-citizen-id', {
    params: { citizenId: citizenId.trim() },
  });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN - Admission Requests (/api/admin/admission-requests)
// Quyền: admin | manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin | Views Admission Requests
 * Xem danh sách tất cả yêu cầu nhập viện (có phân trang, lọc, tìm kiếm).
 *
 * @param {object} params - Query parameters
 * @param {string} [params.status]            - Lọc theo trạng thái: 'new_request' | 'consulting' | 'assessing' | 'contracting' | 'checked_in' | 'cancelled'
 * @param {string} [params.eligibilityStatus] - Lọc theo mức điều kiện: 'pending' | 'eligible' | 'not_eligible'
 * @param {string} [params.search]            - Tìm theo mã đơn / tên / CCCD / SĐT
 * @param {string} [params.from]              - Từ ngày gửi đơn (YYYY-MM-DD)
 * @param {string} [params.to]               - Đến ngày gửi đơn (YYYY-MM-DD)
 * @param {number} [params.page]              - Số trang (mặc định: 1)
 * @param {number} [params.limit]             - Số bản ghi / trang (mặc định: 20, tối đa: 100)
 * @returns {object} { data: Admission[], total, page, limit, totalPages }
 */
const adminGetAdmissionList = async (params = {}) => {
  const response = await axiosClient.get('/admin/admission-requests', { params });
  return response.data;
};

/**
 * Admin | Create Walk-in Admission Request
 * Tạo hồ sơ nhập viện cho người nhà đến trực tiếp tại quầy, chưa có tài khoản
 * trên hệ thống. Khi hoàn tất check-in, hệ thống tự tạo tài khoản Family và
 * gửi mật khẩu tạm qua email (nếu có requestedByEmail) hoặc SMS (nếu chỉ có
 * requestedByPhone).
 *
 * @param {object} body
 * @param {object} body.applicant - Thông tin người cao tuổi (giống submitAdmissionRequest)
 * @param {string} body.requestedByName - Tên người nhà (BẮT BUỘC)
 * @param {string} [body.requestedByEmail] - Email người nhà (ưu tiên gửi qua mail nếu có)
 * @param {string} [body.requestedByPhone] - SĐT người nhà (dùng gửi SMS nếu không có email)
 * @param {string} [body.preferredAdmissionDate]
 * @param {string} [body.reasonForAdmission]
 * @param {string} [body.notes]
 * @returns {object} { message, admission }
 */
const adminCreateWalkInAdmission = async (body) => {
  const response = await axiosClient.post('/admin/admission-requests/walk-in', body);
  return response.data;
};

/**
 * Admin | See Requirements Details
 * Xem chi tiết một yêu cầu nhập viện (Admin/Manager, bao gồm thông tin tài khoản Family).
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @returns {object} { admission } (có thêm trường familyAccount)
 */
const adminGetAdmissionDetail = async (admissionId) => {
  const response = await axiosClient.get(`/admin/admission-requests/${admissionId}`);
  return response.data;
};

/**
 * Admin | Approves Admission Requests
 * Phê duyệt yêu cầu nhập viện → Status chuyển thành 'contracting'.
 * Chỉ duyệt được khi đơn đang ở trạng thái phù hợp (assessing / eligibility: eligible).
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} [body]
 * @param {string} [body.assignedServicePackage] - Tên gói dịch vụ gán kèm (không bắt buộc)
 * @param {string} [body.notes]                  - Ghi chú của Admin
 * @returns {object} { message, admission }
 */
const adminApproveAdmission = async (admissionId, body = {}) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/approve`,
    body
  );
  return response.data;
};

/**
 * Admin | Rejects Admission Requests (with reason)
 * Từ chối yêu cầu nhập viện kèm lý do → Status: 'cancelled', eligibilityStatus: 'not_eligible'.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} body.rejectionReason - Lý do từ chối (BẮT BUỘC)
 * @returns {object} { message, admission }
 */
const adminRejectAdmission = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/reject`,
    body
  );
  return response.data;
};

/**
 * Admin | Assign Consultant
 * Chỉ định nhân viên y tế (Doctor/Nurse) phụ trách tư vấn / thăm khám.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} body.consultantId - User ID của Doctor hoặc Nurse cần chỉ định (BẮT BUỘC)
 * @returns {object} { message, admission }
 */
const adminAssignConsultant = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/assign-consultant`,
    body
  );
  return response.data;
};

/**
 * Admin | Assign Service Package
 * Gán gói dịch vụ chăm sóc phù hợp cho người cao tuổi (trong quá trình xử lý đơn).
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} body.servicePackageId - ID của gói dịch vụ (BẮT BUỘC)
 * @returns {object} { message, admission }
 */
const adminAssignServicePackage = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/assign-service-package`,
    body
  );
  return response.data;
};

/**
 * Admin | Create Admission Contract
 * Tạo hợp đồng nhập viện cho người cao tuổi → Status chuyển thành 'contracting'.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} body.contractNumber     - Số hợp đồng (BẮT BUỘC)
 * @param {string} [body.contractStartDate] - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} [body.contractEndDate]   - Ngày kết thúc (YYYY-MM-DD)
 * @param {number} [body.contractDurationMonths]  - Thời hạn hợp đồng theo tháng
 * @param {number} [body.contractDiscountPercent] - Phần trăm giảm giá hợp đồng (0-100)
 * @param {string} [body.contractTerms]     - Điều khoản hợp đồng
 * @param {string} [body.notes]             - Ghi chú thêm
 * @returns {object} { message, admission }
 */
const adminCreateContract = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/create-contract`,
    body
  );
  return response.data;
};

const adminCancelContract = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/cancel-contract`,
    body
  );
  return response.data;
};

const adminChangeContractServicePackage = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/change-contract-service-package`,
    body
  );
  return response.data;
};

/**
 * Admin | Check-in Resident
 * Check-in nhận phòng cho người bệnh → Status chuyển thành 'checked_in'.
 * Tự động tạo / cập nhật hồ sơ Resident trong hệ thống.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} [body]
 * @param {string} [body.bedId]  - ID của giường được xếp
 * @param {string} [body.roomId] - ID của phòng được xếp
 * @returns {object} { message, admission, resident }
 */
const adminCheckInResident = async (admissionId, body = {}) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/check-in`,
    body
  );
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL STAFF - Admission Requests (/api/medical/admission-requests)
// Quyền: doctor | nurse (tùy endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UC-6.16 | Pre-admission Consultation (Doctor, Nurse)
 * Ghi nhận kết quả tư vấn trước nhập viện → Status chuyển sang 'consulting'.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} body.consultationNotes - Nội dung ghi chú tư vấn (BẮT BUỘC)
 * @param {string} [body.notes]           - Ghi chú chung (không bắt buộc)
 * @returns {object} { message, admission }
 */
const medicalRecordConsultation = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/medical/admission-requests/${admissionId}/consultation`,
    body
  );
  return response.data;
};

/**
 * UC-6.17 | Initial Assessment Scheduling (Doctor, Nurse)
 * Đặt lịch đánh giá sức khỏe ban đầu → Status chuyển sang 'assessing'.
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} body.scheduledAt                - Thời điểm đánh giá (ISO 8601, BẮT BUỘC, phải là tương lai)
 * @param {string} [body.initialAssessmentNotes]   - Ghi chú về buổi đánh giá
 * @param {string} [body.notes]                    - Ghi chú chung
 * @returns {object} { message, admission }
 */
const medicalScheduleAssessment = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/medical/admission-requests/${admissionId}/schedule-assessment`,
    body
  );
  return response.data;
};

/**
 * UC-6.19 | Evaluate Admission Eligibility (Doctor only)
 * Bác sĩ đánh giá điều kiện nhập viện của người cao tuổi.
 * Nếu 'not_eligible': đơn bị hủy tự động (status: 'cancelled').
 *
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} body.eligibilityStatus   - Kết quả: 'eligible' | 'not_eligible' (BẮT BUỘC)
 * @param {string} body.assessmentResult    - Mô tả kết quả đánh giá chi tiết (BẮT BUỘC)
 * @param {string} [body.rejectionReason]   - Lý do không đủ điều kiện (nếu not_eligible)
 * @param {string} [body.notes]             - Ghi chú thêm
 * @returns {object} { message, admission }
 */
const medicalEvaluateEligibility = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/medical/admission-requests/${admissionId}/evaluate-eligibility`,
    body
  );
  return response.data;
};

/**
 * Admin | List Staff Accounts
 * Lấy danh sách tài khoản nhân viên (để gán consultant).
 *
 * @param {object} params - Query parameters (role, isActive, search, page, limit)
 * @returns {object} { data: Staff[], total, page, limit, totalPages }
 */
const getStaffList = async (params = {}) => {
  const response = await axiosClient.get('/auth/staff', { params });
  return response.data;
};

/**
 * Admin | Update Contract Dates
 * Gia hạn hợp đồng bằng cách cập nhật ngày hết hạn.
 *
 * @param {string} admissionId - ID của admission
 * @param {object} body
 * @param {string} body.contractEndDate - Ngày hết hạn mới (ISO 8601 format) (BẮT BUỘC)
 * @returns {object} { message, admission }
 */
const updateAdmissionContractDates = async (admissionId, body) => {
  const response = await axiosClient.patch(
    `/admin/admission-requests/${admissionId}/extend-contract`,
    body
  );
  return response.data;
};

export default {
  // Family
  submitAdmissionRequest,
  getAdmissionHistory,
  getAdmissionDetail,
  cancelAdmissionRequest,
  resubmitAdmissionRequest,
  checkCitizenIdDuplicate,
  // Admin / Manager
  adminCreateWalkInAdmission,
  adminGetAdmissionList,
  adminGetAdmissionDetail,
  adminApproveAdmission,
  adminRejectAdmission,
  adminAssignConsultant,
  adminAssignServicePackage,
  adminCreateContract,
  adminCancelContract,
  adminChangeContractServicePackage,
  adminCheckInResident,
  getStaffList,
  updateAdmissionContractDates,
  // Medical Staff (Doctor / Nurse)
  medicalRecordConsultation,
  medicalScheduleAssessment,
  medicalEvaluateEligibility,
};
