import axiosClient from '../api/axiosClient';

const listNotifications = (params = {}) =>
  axiosClient.get('/family/notifications', { params }).then((r) => r.data);

const markAsRead = (id) => axiosClient.patch(`/family/notifications/${id}/read`).then((r) => r.data);

const markManyAsRead = (ids) => axiosClient.post('/family/notifications/mark-read', { ids }).then((r) => r.data);

const deleteNotification = (id) => axiosClient.delete(`/family/notifications/${id}`).then((r) => r.data);

const deleteMany = (ids) => axiosClient.post('/family/notifications/delete', { ids }).then((r) => r.data);

const getSettings = () => axiosClient.get('/family/notifications/settings').then((r) => r.data);

const updateSettings = (payload) => axiosClient.post('/family/notifications/settings', payload).then((r) => r.data);

const getCategories = () => axiosClient.get('/family/notifications/categories').then((r) => r.data.categories || []);

export default {
  listNotifications,
  markAsRead,
  markManyAsRead,
  deleteNotification,
  deleteMany,
  getSettings,
  updateSettings,
  getCategories,
};
