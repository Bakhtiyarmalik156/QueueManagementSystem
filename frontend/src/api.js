import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
};

export const servicesApi = {
  list: () => api.get('/services'),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  remove: (id) => api.delete(`/services/${id}`),
};

export const countersApi = {
  list: () => api.get('/counters'),
  create: (data) => api.post('/counters', data),
  update: (id, data) => api.put(`/counters/${id}`, data),
  remove: (id) => api.delete(`/counters/${id}`),
  online: (id, online) => api.post(`/counters/${id}/online`, { online }),
};

export const ticketsApi = {
  create: (data) => api.post('/tickets', data),
  get: (id) => api.get(`/tickets/${id}`),
  listWaiting: (serviceId) => api.get('/tickets', { params: { serviceId } }),
  callNext: (counterId, serviceId) => api.post('/tickets/x/call', { counterId, serviceId }),
  recall: (id) => api.post(`/tickets/${id}/recall`),
  complete: (id) => api.post(`/tickets/${id}/complete`),
  skip: (id) => api.post(`/tickets/${id}/skip`),
  transfer: (id, data) => api.post(`/tickets/${id}/transfer`, data),
};

export const displayApi = {
  state: () => api.get('/display/state'),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: () => api.get('/admin/users'),
};