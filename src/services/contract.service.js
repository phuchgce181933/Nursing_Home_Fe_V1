/**
 * contract.service.js
 * Dịch vụ kết nối API cho phân hệ Quản lý Hợp Đồng (Contract Management)
 * 
 * Refactored flow: Doctor khám xong → Tạo Hợp đồng → Xuất Hóa đơn
 * Base URL: /api
 * Auth: Bearer Token
 */

import axiosClient from '../api/axiosClient';

// ════════════════════════════════════════════════════════════════════════════
// UC-210: CREATE CONTRACT
// ════════════════════════════════════════════════════════════════════════════

/**
 * UC-210 | Admin Create Contract from Admission
 * Tạo hợp đồng nhập viện cho người cao tuổi từ admission đã có service package.
 * 
 * Flow mới: Doctor khám xong → status='contracting' → Admin tạo HĐ (bước này)
 * 
 * @param {string} admissionId - ID của yêu cầu nhập viện
 * @param {object} body
 * @param {string} [body.contractNumber]  - Số hợp đồng (tự động nếu không cung cấp)
 * @param {string} [body.startDate]       - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} [body.endDate]         - Ngày kết thúc (YYYY-MM-DD)
 * @param {number} [body.durationMonths]  - Thời hạn theo tháng
 * @param {number} [body.discountPercent] - Phần trăm giảm giá (0-100)
 * @param {string} [body.terms]           - Điều khoản hợp đồng
 * @param {string} [body.notes]           - Ghi chú
 * @returns {object} { message, contract }
 */
const createContractFromAdmission = async (admissionId, body = {}) => {
  const response = await axiosClient.post(
    `/admin/admission-contracts/from-admission/${admissionId}`,
    body
  );
  return response.data;
};

// ════════════════════════════════════════════════════════════════════════════
// UC-211: VIEW CONTRACT LIST
// ════════════════════════════════════════════════════════════════════════════

/**
 * UC-211 | Admin List Contracts
 * Xem danh sách hợp đồng với filter theo status, search, admissionId, residentId.
 * 
 * @param {object} params
 * @param {string} [params.status]      - CSV: 'active,expired,terminated,cancelled'
 * @param {string} [params.search]      - Tìm theo số HĐ
 * @param {string} [params.admissionId] - Filter theo admission
 * @param {string} [params.residentId]  - Filter theo resident
 * @param {number} [params.page]        - Trang (mặc định: 1)
 * @param {number} [params.limit]       - Số bản ghi/trang (mặc định: 20)
 * @returns {object} { data, total, page, limit, totalPages }
 */
const listContracts = async (params = {}) => {
  const response = await axiosClient.get('/admin/contracts', { params });
  return response.data;
};

// ════════════════════════════════════════════════════════════════════════════
// UC-212: VIEW CONTRACT DETAILS
// ════════════════════════════════════════════════════════════════════════════

/**
 * UC-212 | Get Contract Details
 * Xem chi tiết hợp đồng kèm danh sách hóa đơn và outstanding amount.
 * 
 * @param {string} contractId - ID của hợp đồng
 * @returns {object} { contract, invoices, outstandingAmount }
 */
const getContractDetails = async (contractId) => {
  const response = await axiosClient.get(`/admin/contracts/${contractId}`);
  return response.data;
};

// ════════════════════════════════════════════════════════════════════════════
// UC-213: RENEW CONTRACT
// ════════════════════════════════════════════════════════════════════════════

/**
 * UC-213 | Renew Contract
 * Gia hạn hợp đồng - tạo hợp đồng mới, hợp đồng cũ chuyển sang 'expired'.
 * 
 * @param {string} contractId - ID của hợp đồng hiện tại
 * @param {object} body
 * @param {string} [body.startDate]        - Ngày bắt đầu mới (mặc định: hôm nay)
 * @param {string} body.endDate            - Ngày kết thúc mới (BẮT BUỘC)
 * @param {number} [body.durationMonths]   - Thời hạn mới (tháng)
 * @param {number} [body.discountPercent]  - Phần trăm giảm giá mới
 * @param {string} [body.servicePackageId] - Đổi gói dịch vụ (nếu muốn)
 * @param {string} [body.terms]            - Điều khoản
 * @param {string} [body.notes]            - Ghi chú
 * @returns {object} { message, oldContract, newContract }
 */
const renewContract = async (contractId, body) => {
  const response = await axiosClient.patch(`/admin/contracts/${contractId}/renew`, body);
  return response.data;
};

// ════════════════════════════════════════════════════════════════════════════
// UC-214: TERMINATE CONTRACT
// ════════════════════════════════════════════════════════════════════════════

/**
 * UC-214 | Terminate Contract
 * Chấm dứt hợp đồng, hủy các hóa đơn chưa thanh toán.
 * 
 * @param {string} contractId - ID của hợp đồng
 * @param {object} body
 * @param {string} body.reason - Lý do chấm dứt (BẮT BUỘC)
 * @returns {object} { message, contract }
 */
const terminateContract = async (contractId, body) => {
  const response = await axiosClient.patch(`/admin/contracts/${contractId}/terminate`, body);
  return response.data;
};

// ════════════════════════════════════════════════════════════════════════════
// UC-128: CREATE INVOICE FROM CONTRACT (NEW - Tách bạch khỏi Contract)
// ════════════════════════════════════════════════════════════════════════════

/**
 * UC-128 | Create Invoice from Contract
 * 
 * Bước 3 của luồng mới: Doctor khám → Tạo HĐ (bước 2) → Tạo Hóa đơn (bước này)
 * 
 * Sau khi hợp đồng được tạo, gọi API này để xuất hóa đơn dịch vụ.
 * Hóa đơn sẽ được tính dựa trên monthlyFee × durationMonths × (1 - discountPercent/100).
 * 
 * @param {string} contractId - ID của hợp đồng
 * @param {object} [body]
 * @param {number} [body.careServiceCost]    - Override monthly fee (mặc định: contract.monthlyFee)
 * @param {number} [body.durationMonths]     - Override duration (mặc định: contract.durationMonths)
 * @param {number} [body.roomCost]           - Phí phòng (optional)
 * @param {string} [body.billingPeriodStart] - Ngày bắt đầu tính phí (mặc định: contract.startDate)
 * @param {string} [body.billingPeriodEnd]   - Ngày kết thúc tính phí (mặc định: contract.endDate)
 * @param {string} [body.dueDate]            - Hạn thanh toán
 * @param {string} [body.paymentPlan]        - 'FULL' | 'HALF_NOW' (mặc định: 'FULL')
 * @returns {object} { message, invoice, contract }
 */
const createInvoiceFromContract = async (contractId, body = {}) => {
  const response = await axiosClient.post(
    `/admin/contracts/${contractId}/create-invoice`,
    body
  );
  return response.data;
};

// ════════════════════════════════════════════════════════════════════════════
// UC-215: VIEW CONTRACT HISTORY
// ════════════════════════════════════════════════════════════════════════════

/**
 * UC-215 | Get Contract History for Admission
 * Xem lịch sử tất cả hợp đồng + hóa đơn của một admission.
 *
 * @param {string} admissionId - ID của admission
 * @returns {object} { contracts, invoices }
 */
const getContractHistory = async (admissionId) => {
  const response = await axiosClient.get(`/admin/contracts/history/${admissionId}`);
  return response.data;
};

// ════════════════════════════════════════════════════════════════════════════
// ISSUE INVOICES — flip DRAFT → ISSUED cho cả hợp đồng
// ════════════════════════════════════════════════════════════════════════════

/**
 * Xuất (issue) tất cả hóa đơn DRAFT của một hợp đồng.
 * Khi hợp đồng vừa tạo, các hóa đơn ở trạng thái DRAFT (chưa xuất) — chỉ Admin thấy.
 * Hàm này chuyển sang ISSUED (đã xuất) để gia đình (Family portal) nhìn thấy và thanh toán được.
 *
 * @param {string} contractId - ID của hợp đồng
 * @param {object} [body]
 * @param {string[]} [body.invoiceIds] - Danh sách invoiceId cụ thể cần xuất. Nếu bỏ trống thì xuất tất cả DRAFT.
 * @returns {object} { message, contractId, contractNumber, issuedCount, issuedInvoiceIds }
 */
const issueInvoices = async (contractId, body = {}) => {
  const response = await axiosClient.post(`/admin/contracts/${contractId}/issue-invoices`, body);
  return response.data;
};

/**
 * Tính lại giá cho các hóa đơn DRAFT của hợp đồng dựa trên monthlyFee hiện tại
 * (lấy từ contract hoặc servicePackage). Hóa đơn đã xuất không bị ảnh hưởng.
 *
 * @param {string} contractId
 * @returns {object} { message, monthlyFee, perInvoiceGross, updatedCount, skippedCount, updatedInvoiceIds }
 */
const recalculateContractInvoices = async (contractId) => {
  const response = await axiosClient.post(`/admin/contracts/${contractId}/recalculate-invoices`);
  return response.data;
};

/**
 * Xuất hóa đơn ra file HTML (in / lưu PDF).
 * Tải blob từ backend, tạo object URL và mở tab mới để hiển thị.
 *
 * @param {string} invoiceId - ID của hóa đơn
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
const exportInvoice = async (invoiceId) => {
  const response = await axiosClient.get(
    `/admin/contracts/invoices/${invoiceId}/export`,
    { responseType: 'blob' }
  );
  // Lấy filename từ header Content-Disposition nếu có
  const dispo = response.headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/.exec(dispo);
  const filename = match ? match[1] : `invoice-${invoiceId}.html`;
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/html' });
  return { blob, filename };
};

/**
 * Cập nhật giá cho hóa đơn DRAFT (trước khi xuất).
 * Chỉ áp dụng được khi hóa đơn đang ở trạng thái DRAFT.
 *
 * @param {string} invoiceId
 * @param {object} body - { careServiceCost, billingPeriodStart, reason }
 * @returns {object} { message, invoiceId, before, after }
 */
const updateInvoice = async (invoiceId, body = {}) => {
  const response = await axiosClient.patch(
    `/admin/contracts/invoices/${invoiceId}`,
    body
  );
  return response.data;
};

/**
 * Dừng (xóa mềm) hóa đơn DRAFT trước khi xuất.
 * Hóa đơn sẽ bị ẩn khỏi danh sách nhưng vẫn còn trong DB.
 *
 * @param {string} invoiceId
 * @param {object} body - { reason }
 * @returns {object} { message, invoiceId, deletedAt }
 */
const cancelInvoice = async (invoiceId, body = {}) => {
  const response = await axiosClient.patch(
    `/admin/contracts/invoices/${invoiceId}/cancel`,
    body
  );
  return response.data;
};

/**
 * Chuyển trạng thái hóa đơn (Admin).
 * Các bước chuyển cho phép:
 *  - DRAFT → ISSUED    (xuất hóa đơn, family sẽ thấy được)
 *  - DRAFT → CANCELLED
 *  - ISSUED → DRAFT    (thu hồi khỏi family)
 *  - ISSUED → PAID     (đánh dấu đã thanh toán)
 *  - ISSUED → CANCELLED
 *  - PARTIALLY_PAID → ISSUED (hoàn tác thanh toán một phần)
 *  - PARTIALLY_PAID → PAID
 *  - CANCELLED → DRAFT (khôi phục)
 *
 * @param {string} invoiceId
 * @param {object} body - { status, reason? }
 * @returns {object} { message, invoiceId, previousStatus, newStatus }
 */
const transitionInvoice = async (invoiceId, body) => {
  console.log('🔄 [TRANSITION_FE_SVC] PATCH /admin/contracts/invoices/:id/transition', { invoiceId, body });
  try {
    const response = await axiosClient.patch(
      `/admin/contracts/invoices/${invoiceId}/transition`,
      body
    );
    console.log('🔄 [TRANSITION_FE_SVC] response', response.data);
    return response.data;
  } catch (err) {
    console.error('🔄 [TRANSITION_FE_SVC] error', err?.response?.status, err?.response?.data);
    throw err;
  }
};

export default {
  createContractFromAdmission,
  listContracts,
  getContractDetails,
  renewContract,
  terminateContract,
  createInvoiceFromContract,
  getContractHistory,
  issueInvoices,
  recalculateContractInvoices,
  exportInvoice,
  updateInvoice,
  cancelInvoice,
  transitionInvoice,
};
