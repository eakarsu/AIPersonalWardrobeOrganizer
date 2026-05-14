import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Wardrobe Items
export const getWardrobeItems = (params) => api.get('/wardrobe-items', { params });
export const getWardrobeItem = (id) => api.get(`/wardrobe-items/${id}`);
export const createWardrobeItem = (formData) => api.post('/wardrobe-items', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateWardrobeItem = (id, formData) => api.put(`/wardrobe-items/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteWardrobeItem = (id) => api.delete(`/wardrobe-items/${id}`);
export const logWear = (id, data) => api.post(`/wardrobe-items/${id}/wear`, data);

// Outfits
export const getOutfits = (params) => api.get('/outfits', { params });
export const getOutfit = (id) => api.get(`/outfits/${id}`);
export const createOutfit = (data) => api.post('/outfits', data);
export const updateOutfit = (id, data) => api.put(`/outfits/${id}`, data);
export const deleteOutfit = (id) => api.delete(`/outfits/${id}`);
export const logOutfitWear = (id, data) => api.post(`/outfits/${id}/wear`, data);

// Wear Logs
export const getWearLogs = (params) => api.get('/wear-logs', { params });
export const createWearLog = (data) => api.post('/wear-logs', data);
export const deleteWearLog = (id) => api.delete(`/wear-logs/${id}`);

// Packing Lists
export const getPackingLists = () => api.get('/packing-lists');
export const getPackingList = (id) => api.get(`/packing-lists/${id}`);
export const createPackingList = (data) => api.post('/packing-lists', data);
export const updatePackingList = (id, data) => api.put(`/packing-lists/${id}`, data);
export const deletePackingList = (id) => api.delete(`/packing-lists/${id}`);

// AI
export const aiAutoTagPhoto = (formData) => api.post('/ai/auto-tag-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const aiOutfitSuggest = (data) => api.post('/ai/outfit-suggest', data);
export const aiPackingList = (data) => api.post('/ai/packing-list', data);
export const aiDeclutter = () => api.post('/ai/declutter-suggestions', {});
export const aiCostPerWear = () => api.post('/ai/cost-per-wear', {});
export const aiSeasonalAnalysis = (data) => api.post('/ai/seasonal-analysis', data);
export const aiStyleProfile = (data) => api.post('/ai/style-profile', data);
export const getAIHistory = (params) => api.get('/ai/history', { params });

// Stats
export const getStats = () => api.get('/stats');

export default api;
