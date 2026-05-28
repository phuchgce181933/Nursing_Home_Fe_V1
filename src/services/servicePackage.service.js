/**
 * servicePackage.service.js
 * Dịch vụ kết nối API cho phân hệ Quản lý Gói dịch vụ (Service Package)
 *
 * Base URL: /api
 * Auth: Bearer Token (tự động được gắn bởi axiosClient interceptor)
 */

import axiosClient from '../api/axiosClient';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / MANAGER - Service Packages (/api/admin/service-packages)
// Quyền: admin | manager
//
// MEDICAL STAFF (Doctor, Nurse) - Service Packages (/api/medical/service-packages)
// Quyền: doctor | nurse
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UC-6.20 | Create Service Package (Admin / Manager)
 * Tạo gói dịch vụ chăm sóc mới.
 *
 * @param {object} body
 * @param {string} body.name               - Tên gói dịch vụ (BẮT BUỘC, không trùng tên gói đang hoạt động)
 * @param {string} [body.description]      - Mô tả gói dịch vụ
 * @param {string} [body.tier]             - Cấp độ: 'basic' | 'standard' | 'premium' | 'vip' (mặc định: 'standard')
 * @param {string[]} [body.services]       - Danh sách dịch vụ bao gồm, VD: ["Chăm sóc y tế 24/7", "Vật lý trị liệu"]
 * @param {number} [body.monthlyPrice]     - Giá hàng tháng (VND)
 * @returns {object} { message, servicePackage }
 */
const createServicePackage = async (body) => {
  const response = await axiosClient.post('/admin/service-packages', body);
  return response.data;
};

/**
 * UC-6.23 | View Service Package (Admin, Doctor, Nurse)
 * Xem danh sách gói dịch vụ (có phân trang, lọc).
 * Admin/Manager dùng route /admin/service-packages.
 * Doctor/Nurse dùng route /medical/service-packages.
 *
 * @param {object} params - Query parameters
 * @param {string} [params.tier]      - Lọc theo cấp: 'basic' | 'standard' | 'premium' | 'vip'
 * @param {boolean} [params.isActive] - Lọc theo trạng thái kích hoạt (true / false)
 * @param {string} [params.search]    - Tìm theo tên / mã gói / mô tả
 * @param {number} [params.page]      - Số trang (mặc định: 1)
 * @param {number} [params.limit]     - Số bản ghi / trang (mặc định: 20, tối đa: 100)
 * @param {'admin'|'medical'} [role]  - Vai trò của người dùng để chọn đúng route (mặc định: 'admin')
 * @returns {object} { data: ServicePackage[], total, page, limit, totalPages }
 */
const getServicePackageList = async (params = {}, role = 'admin') => {
  const basePath = role === 'medical' ? '/medical/service-packages' : '/admin/service-packages';
  const response = await axiosClient.get(basePath, { params });
  return response.data;
};

/**
 * UC-6.27 | View Service Package Detail (Admin, Doctor, Nurse)
 * Xem chi tiết một gói dịch vụ.
 * Admin/Manager dùng route /admin/service-packages/:packageId.
 * Doctor/Nurse dùng route /medical/service-packages/:packageId.
 *
 * @param {string} packageId          - ID của gói dịch vụ
 * @param {'admin'|'medical'} [role]  - Vai trò của người dùng để chọn đúng route (mặc định: 'admin')
 * @returns {object} { servicePackage }
 */
const getServicePackageDetail = async (packageId, role = 'admin') => {
  const basePath = role === 'medical' ? '/medical/service-packages' : '/admin/service-packages';
  const response = await axiosClient.get(`${basePath}/${packageId}`);
  return response.data;
};

/**
 * UC-6.21 | Update Service Package (Admin / Manager)
 * Cập nhật thông tin gói dịch vụ hiện có.
 *
 * @param {string} packageId           - ID của gói dịch vụ
 * @param {object} body
 * @param {string} [body.name]         - Tên mới (không trùng với gói đang hoạt động khác)
 * @param {string} [body.description]  - Mô tả mới
 * @param {string} [body.tier]         - Cấp độ mới: 'basic' | 'standard' | 'premium' | 'vip'
 * @param {string[]} [body.services]   - Danh sách dịch vụ mới
 * @param {number} [body.monthlyPrice] - Giá hàng tháng mới (VND)
 * @returns {object} { message, servicePackage }
 */
const updateServicePackage = async (packageId, body) => {
  const response = await axiosClient.put(`/admin/service-packages/${packageId}`, body);
  return response.data;
};

/**
 * UC-6.22 | Delete Service Package (Admin / Manager)
 * Xóa mềm (soft delete) gói dịch vụ: isActive = false.
 * Gói đã xóa sẽ không hiển thị trong danh sách mặc định, không thể gán cho đơn nhập viện mới.
 *
 * @param {string} packageId - ID của gói dịch vụ cần xóa
 * @returns {object} { message, servicePackage }
 */
const deleteServicePackage = async (packageId) => {
  const response = await axiosClient.delete(`/admin/service-packages/${packageId}`);
  return response.data;
};

export default {
  createServicePackage,
  getServicePackageList,
  getServicePackageDetail,
  updateServicePackage,
  deleteServicePackage,
};
