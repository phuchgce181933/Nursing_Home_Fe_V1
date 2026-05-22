/**
 * facilityTour.service.js
 * Dịch vụ kết nối API cho phân hệ Đặt lịch tham quan cơ sở (Facility Tour)
 *
 * Base URL: /api
 * Auth: Bearer Token (tự động được gắn bởi axiosClient interceptor)
 */

import axiosClient from '../api/axiosClient';

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY - Facility Tour (/api/family/tours)
// Quyền: family
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedule Facility Tour
 * Đặt lịch tham quan cơ sở dưỡng lão (Family).
 *
 * @param {object} body
 * @param {string} body.contactName         - Tên người liên hệ (BẮT BUỘC)
 * @param {string} body.contactPhone         - Số điện thoại liên hệ (BẮT BUỘC)
 * @param {string} body.preferredDate        - Ngày mong muốn tham quan, phải là tương lai (YYYY-MM-DD) (BẮT BUỘC)
 * @param {string} [body.contactEmail]       - Email liên hệ
 * @param {string} [body.preferredTimeSlot]  - Khung giờ mong muốn, VD: "08:00-10:00"
 * @param {number} [body.numberOfVisitors]   - Số người tham quan (1–20, mặc định: 1)
 * @param {string} [body.notes]              - Ghi chú thêm
 * @returns {object} { message, tour }
 */
const scheduleTour = async (body) => {
  const response = await axiosClient.post('/family/tours', body);
  return response.data;
};

/**
 * View the history of facility tour requests
 * Xem lịch sử đặt lịch tham quan cơ sở (Family, có phân trang).
 *
 * @param {object} params - Query parameters
 * @param {string} [params.status] - Lọc theo trạng thái: 'pending' | 'confirmed' | 'completed' | 'cancelled'
 * @param {string} [params.from]   - Lọc preferredDate >= from (YYYY-MM-DD)
 * @param {string} [params.to]     - Lọc preferredDate <= to (YYYY-MM-DD)
 * @param {number} [params.page]   - Số trang (mặc định: 1)
 * @param {number} [params.limit]  - Số bản ghi / trang (mặc định: 20, tối đa: 100)
 * @returns {object} { data: Tour[], total, page, limit, totalPages }
 */
const getTourHistory = async (params = {}) => {
  const response = await axiosClient.get('/family/tours', { params });
  return response.data;
};

/**
 * Cancel the request for a facility tour
 * Hủy lịch tham quan cơ sở dưỡng lão (Family).
 * Chỉ hủy được khi tour đang ở trạng thái 'pending' hoặc 'confirmed'.
 *
 * @param {string} tourId - ID của lịch tham quan
 * @param {object} [body]
 * @param {string} [body.cancellationReason] - Lý do hủy lịch (khuyến khích điền)
 * @returns {object} { message, tour }
 */
const cancelTour = async (tourId, body = {}) => {
  const response = await axiosClient.patch(`/family/tours/${tourId}/cancel`, body);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN - Facility Tour (/api/admin/tours)
// Quyền: admin | manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * View tour requirements (Admin)
 * Xem danh sách tất cả yêu cầu tham quan cơ sở (có phân trang, lọc, tìm kiếm).
 *
 * @param {object} params - Query parameters
 * @param {string} [params.status] - Lọc theo trạng thái: 'pending' | 'confirmed' | 'completed' | 'cancelled'
 * @param {string} [params.search] - Tìm theo tên / SĐT / email liên hệ
 * @param {string} [params.from]   - Lọc từ ngày (YYYY-MM-DD)
 * @param {string} [params.to]     - Lọc đến ngày (YYYY-MM-DD)
 * @param {number} [params.page]   - Số trang (mặc định: 1)
 * @param {number} [params.limit]  - Số bản ghi / trang (mặc định: 20, tối đa: 100)
 * @returns {object} { data: Tour[], total, page, limit, totalPages }
 */
const adminGetTourList = async (params = {}) => {
  const response = await axiosClient.get('/admin/tours', { params });
  return response.data;
};

/**
 * View detail tour requirements (Admin)
 * Xem chi tiết một yêu cầu tham quan (Admin, bao gồm thông tin tài khoản Family).
 *
 * @param {string} tourId - ID của lịch tham quan
 * @returns {object} { tour } (có thêm trường familyAccount)
 */
const adminGetTourDetail = async (tourId) => {
  const response = await axiosClient.get(`/admin/tours/${tourId}`);
  return response.data;
};

/**
 * Approve Tour Request (Admin)
 * Phê duyệt yêu cầu tham quan → Status chuyển thành 'confirmed'.
 *
 * @param {string} tourId - ID của lịch tham quan
 * @param {object} [body]
 * @param {string} [body.confirmedTimeSlot] - Khung giờ xác nhận, VD: "09:00-11:00"
 * @param {string} [body.adminNotes]        - Ghi chú của Admin
 * @returns {object} { message, tour }
 */
const adminApproveTour = async (tourId, body = {}) => {
  const response = await axiosClient.patch(`/admin/tours/${tourId}/approve`, body);
  return response.data;
};

/**
 * Reject Tour Request (Admin)
 * Từ chối yêu cầu tham quan kèm lý do → Status chuyển thành 'cancelled'.
 *
 * @param {string} tourId - ID của lịch tham quan
 * @param {object} body
 * @param {string} body.rejectionReason - Lý do từ chối (BẮT BUỘC)
 * @returns {object} { message, tour }
 */
const adminRejectTour = async (tourId, body) => {
  const response = await axiosClient.patch(`/admin/tours/${tourId}/reject`, body);
  return response.data;
};

export default {
  // Family
  scheduleTour,
  getTourHistory,
  cancelTour,
  // Admin / Manager
  adminGetTourList,
  adminGetTourDetail,
  adminApproveTour,
  adminRejectTour,
};
