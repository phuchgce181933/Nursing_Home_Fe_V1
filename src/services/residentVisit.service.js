/**
 * residentVisit.service.js
 * Dịch vụ kết nối API cho phân hệ Đặt lịch thăm cư dân (Resident Visit)
 *
 * Base URL: /api
 * Auth: Bearer Token (tự động được gắn bởi axiosClient interceptor)
 */

import axiosClient from '../api/axiosClient';

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY - Resident Visit (/api/family/visits)
// Quyền: family
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request a visit to an admitted resident (Family)
 * Đặt lịch thăm người thân đang lưu trú.
 *
 * @param {object} body
 * @param {string} body.residentId          - ID người thân cần thăm (BẮT BUỘC)
 * @param {string} body.visitorName         - Tên người đến thăm (BẮT BUỘC)
 * @param {string} body.visitorPhone        - Số điện thoại người đến thăm (BẮT BUỘC)
 * @param {string} body.requestedDate       - Ngày mong muốn thăm, phải là hôm nay hoặc tương lai (YYYY-MM-DD) (BẮT BUỘC)
 * @param {string} [body.requestedTimeSlot] - Khung giờ mong muốn, VD: "14:00-15:00"
 * @param {number} [body.numberOfVisitors]  - Số người đến thăm (1–20, mặc định: 1)
 * @param {string} [body.notes]             - Ghi chú thêm
 * @returns {object} { message, visit }
 */
const createVisit = async (body) => {
  const response = await axiosClient.post('/family/visits', body);
  return response.data;
};

/**
 * List own visit requests (Family)
 * Xem danh sách lịch thăm đã đặt (có phân trang).
 *
 * @param {object} params - Query parameters
 * @param {string} [params.residentId] - Lọc theo người thân
 * @param {string} [params.status]     - Lọc theo trạng thái: 'pending' | 'approved' | 'rejected' | 'cancelled'
 * @param {number} [params.page]       - Số trang (mặc định: 1)
 * @param {number} [params.limit]      - Số bản ghi / trang (mặc định: 20, tối đa: 100)
 * @returns {object} { data: Visit[], total, page, limit, totalPages }
 */
const getVisitHistory = async (params = {}) => {
  const response = await axiosClient.get('/family/visits', { params });
  return response.data;
};

/**
 * Cancel a pending or approved visit request (Family)
 * Hủy lịch thăm đã đặt. Chỉ hủy được khi đang ở trạng thái 'pending' hoặc 'approved'.
 *
 * @param {string} visitId - ID của lịch thăm
 * @param {object} [body]
 * @param {string} [body.cancellationReason] - Lý do hủy lịch (khuyến khích điền)
 * @returns {object} { message, visit }
 */
const cancelVisit = async (visitId, body = {}) => {
  const response = await axiosClient.patch(`/family/visits/${visitId}/cancel`, body);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// STAFF - Resident Visit (/api/resident-visits)
// Quyền: nurse (chỉ xem) | manager, admin (xem + duyệt/từ chối)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List resident visit requests (Nurse/Manager/Admin)
 * Xem danh sách tất cả yêu cầu thăm cư dân (có phân trang, lọc).
 *
 * @param {object} params - Query parameters
 * @param {string} [params.status]     - Lọc theo trạng thái: 'pending' | 'approved' | 'rejected' | 'cancelled'
 * @param {string} [params.residentId] - Lọc theo người thân
 * @param {number} [params.page]       - Số trang (mặc định: 1)
 * @param {number} [params.limit]      - Số bản ghi / trang (mặc định: 20, tối đa: 100)
 * @returns {object} { data: Visit[], total, page, limit, totalPages }
 */
const listVisits = async (params = {}) => {
  const response = await axiosClient.get('/resident-visits', { params });
  return response.data;
};

/**
 * Approve a pending visit request (Manager/Admin)
 * Phê duyệt yêu cầu thăm → Status chuyển thành 'approved'.
 *
 * @param {string} visitId - ID của lịch thăm
 * @returns {object} { message, visit }
 */
const approveVisit = async (visitId) => {
  const response = await axiosClient.patch(`/resident-visits/${visitId}/approve`);
  return response.data;
};

/**
 * Reject a pending visit request with reason (Manager/Admin)
 * Từ chối yêu cầu thăm kèm lý do → Status chuyển thành 'rejected'.
 *
 * @param {string} visitId - ID của lịch thăm
 * @param {object} body
 * @param {string} body.rejectionReason - Lý do từ chối (BẮT BUỘC)
 * @returns {object} { message, visit }
 */
const rejectVisit = async (visitId, body) => {
  const response = await axiosClient.patch(`/resident-visits/${visitId}/reject`, body);
  return response.data;
};

export default {
  // Family
  createVisit,
  getVisitHistory,
  cancelVisit,
  // Staff (Nurse / Manager / Admin)
  listVisits,
  approveVisit,
  rejectVisit,
};
