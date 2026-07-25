/**
 * residentPhoto.service.js
 * Dịch vụ kết nối API cho phân hệ Album ảnh cư dân (Resident Photo)
 *
 * Base URL: /api
 * Auth: Bearer Token (tự động được gắn bởi axiosClient interceptor)
 */

import axiosClient from '../api/axiosClient';

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY - Resident Photo (/api/family/residents/:residentId/photos)
// Quyền: family (chỉ xem)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List photos uploaded by caregivers for a resident (Family)
 * Xem album ảnh của người thân do caregiver tải lên.
 *
 * @param {string} residentId - ID người thân
 * @returns {object} { success, data: Photo[] } - Photo: { _id, url, caption, uploadedAt }
 */
const listPhotosForFamily = async (residentId) => {
  const response = await axiosClient.get(`/family/residents/${residentId}/photos`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// CAREGIVER - Resident Photo (/api/caregiver/residents/:id/photos)
// Quyền: caregiver (chỉ với resident được phân công)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List photos uploaded for an assigned resident (Caregiver)
 *
 * @param {string} residentId - ID người thân được phân công chăm sóc
 * @returns {object} { success, data: Photo[] }
 */
const listPhotosForCaregiver = async (residentId) => {
  const response = await axiosClient.get(`/caregiver/residents/${residentId}/photos`);
  return response.data;
};

/**
 * Upload one or more photos for an assigned resident (Caregiver)
 * Tải lên (tối đa 10 ảnh/lần), kèm 1 chú thích chung áp dụng cho tất cả ảnh trong lần tải.
 *
 * @param {string} residentId - ID người thân được phân công chăm sóc
 * @param {File[]} files      - Danh sách file ảnh (jpg, png, webp)
 * @param {string} [caption]  - Chú thích chung cho các ảnh vừa tải lên
 * @returns {object} { success, data: Photo[] }
 */
const addPhotos = async (residentId, files, caption) => {
  const fd = new FormData();
  (files || []).forEach((file) => fd.append('photos', file));
  if (caption) fd.append('caption', caption);

  const response = await axiosClient.post(`/caregiver/residents/${residentId}/photos`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Delete a photo from an assigned resident (Caregiver)
 *
 * @param {string} residentId - ID người thân được phân công chăm sóc
 * @param {string} photoId    - ID của ảnh cần xóa
 * @returns {object} { success, deleted }
 */
const deletePhoto = async (residentId, photoId) => {
  const response = await axiosClient.delete(`/caregiver/residents/${residentId}/photos/${photoId}`);
  return response.data;
};

export default {
  // Family
  listPhotosForFamily,
  // Caregiver
  listPhotosForCaregiver,
  addPhotos,
  deletePhoto,
};
