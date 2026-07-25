import axiosClient from '../api/axiosClient';

// Family keeps its own scoped endpoint; every other role uses the generic staff inbox.
const buildBase = (role) => (role === 'family' ? '/family/notifications' : '/notifications');

const listNotifications = (params = {}, role = 'family') =>
  axiosClient.get(buildBase(role), { params }).then((r) => r.data);

const markAsRead = (id, role = 'family') =>
  axiosClient.patch(`${buildBase(role)}/${id}/read`).then((r) => r.data);

const markManyAsRead = (ids, role = 'family') =>
  axiosClient.post(`${buildBase(role)}/mark-read`, { ids }).then((r) => r.data);

const deleteNotification = (id, role = 'family') =>
  axiosClient.delete(`${buildBase(role)}/${id}`).then((r) => r.data);

const deleteMany = (ids, role = 'family') =>
  axiosClient.post(`${buildBase(role)}/delete`, { ids }).then((r) => r.data);

const getSettings = (role = 'family') =>
  axiosClient.get(`${buildBase(role)}/settings`).then((r) => r.data);

const updateSettings = (payload, role = 'family') =>
  axiosClient.post(`${buildBase(role)}/settings`, payload).then((r) => r.data);

const getCategories = (role = 'family') =>
  axiosClient.get(`${buildBase(role)}/categories`).then((r) => r.data.categories || []);

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
