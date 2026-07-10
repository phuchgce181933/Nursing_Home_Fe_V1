import axiosClient from '../api/axiosClient';

const base = () => '/conversations';
// public guest endpoints are mounted under /api/family/conversations (no auth needed)
const publicGuestBase = () => '/family/conversations';

const createConversation = async (payload) => {
  const response = await axiosClient.post(`${base()}`, payload);
  return response.data;
};

const createGuestConversation = async (payload, withFiles = false) => {
  const urlBase = `${publicGuestBase()}`;
  if (withFiles) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((it) => form.append(k, it));
      else form.append(k, v);
    });
    const response = await axiosClient.post(`${urlBase}/guest`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  }
  const response = await axiosClient.post(`${urlBase}/guest`, payload);
  return response.data;
};

const listConversations = async (params = {}) => {
  const response = await axiosClient.get(`${base()}`, { params });
  return response.data;
};

const getConversation = async (id) => {
  const response = await axiosClient.get(`${base()}/${id}`);
  return response.data;
};

const getMessages = async (conversationId, params = {}) => {
  const response = await axiosClient.get(`${base()}/${conversationId}/messages`, { params });
  return response.data;
};

const getGuestMessages = async (conversationId, params = {}) => {
  const response = await axiosClient.get(`${publicGuestBase()}/guest/${conversationId}/messages`, { params });
  return response.data;
};

const sendMessage = async (conversationId, payload, withFiles = false) => {
  if (withFiles) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => form.append(k, item));
      } else {
        form.append(k, v);
      }
    });
    const response = await axiosClient.post(`${base()}/${conversationId}/messages`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
  const response = await axiosClient.post(`${base()}/${conversationId}/messages`, payload);
  return response.data;
};

const searchConversations = async (q) => {
  const response = await axiosClient.get(`${base()}/search`, { params: { q } });
  return response.data;
};

const searchMessages = async (q, conversationId = null, params = {}) => {
  const query = { q, ...params };
  if (conversationId) query.conversationId = conversationId;
  const response = await axiosClient.get(`${base()}/messages/search`, { params: query });
  return response.data;
};

const sendGuestMessage = async (conversationId, payload, withFiles = false) => {
  const urlBase = `${publicGuestBase()}`;
  if (withFiles) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((it) => form.append(k, it));
      else form.append(k, v);
    });
    const response = await axiosClient.post(`${urlBase}/guest/${conversationId}/messages`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  }
  const response = await axiosClient.post(`${urlBase}/guest/${conversationId}/messages`, payload);
  return response.data;
};

const deleteConversation = async (conversationId) => {
  const response = await axiosClient.delete(`${base()}/${conversationId}`);
  return response.data;
};

export default {
  createConversation,
  createGuestConversation,
  listConversations,
  getConversation,
  getMessages,
  getGuestMessages,
  sendMessage,
  sendGuestMessage,
  deleteConversation,
  searchConversations,
  searchMessages,
};
