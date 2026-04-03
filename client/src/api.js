import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

// Attach JWT token from localStorage to every request
API.interceptors.request.use(cfg => {
    const token = localStorage.getItem('cv_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

// Response interceptor — auto-logout on 401, centralized error logging
API.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('cv_token');
            localStorage.removeItem('cv_user');
            window.location.href = '/';
        }
        console.error(`[API ${err.config?.method?.toUpperCase()} ${err.config?.url}]`, err.response?.data?.error || err.message);
        return Promise.reject(err);
    }
);

// ── Auth ──
export const loginUser = (data) => API.post('/auth/login', data).then(r => r.data);
export const registerUser = (data) => API.post('/auth/register', data).then(r => r.data);
export const updateProfile = (data) => API.put('/auth/profile', data).then(r => r.data);
export const changePassword = (data) => API.put('/auth/change-password', data).then(r => r.data);
export const requestAccountDeletion = () => API.post('/auth/request-deletion').then(r => r.data);
export const cancelAccountDeletion = () => API.post('/auth/cancel-deletion').then(r => r.data);
export const getAccountStatus = () => API.get('/auth/account-status').then(r => r.data);
export const forgotPassword = (data) => API.post('/auth/forgot-password', data).then(r => r.data);
export const resetPassword = (token, data) => API.post(`/auth/reset-password/${token}`, data).then(r => r.data);

// ── Analytics ──
export const getProfitAnalytics = () => API.get('/analytics/profit').then(r => r.data);

// ── Cards ──
export const getCards = () => API.get('/cards').then(r => r.data);
export const createCard = (data) => API.post('/cards', data).then(r => r.data);
export const updateCard = (id, d) => API.put(`/cards/${id}`, d).then(r => r.data);
export const deleteCard = (id) => API.delete(`/cards/${id}`).then(r => r.data);

// ── Transactions ──
export const getTransactions = (p) => API.get('/transactions', { params: p }).then(r => r.data);
export const createTransaction = (d) => API.post('/transactions', d).then(r => r.data);
export const deleteTransaction = (id) => API.delete(`/transactions/${id}`).then(r => r.data);

// ── Summary ──
export const getSummary = (from_date, to_date) => API.get('/summary', { params: { from_date, to_date } }).then(r => r.data);

// ── Orders ──
export const getOrders = (params) => API.get('/orders', { params }).then(r => r.data);
export const addOrder = (data) => API.post('/orders', data).then(r => r.data);
export const updateOrder = (id, d) => API.put(`/orders/${id}`, d).then(r => r.data);
export const deleteOrder = (id) => API.delete(`/orders/${id}`).then(r => r.data);

// ── Sellers ──
export const getSellers = () => API.get('/sellers').then(r => r.data);
export const getSeller = (id) => API.get(`/sellers/${id}`).then(r => r.data);
export const addSeller = (data) => API.post('/sellers', data).then(r => r.data);
export const updateSeller = (id, d) => API.put(`/sellers/${id}`, d).then(r => r.data);
export const deleteSeller = (id) => API.delete(`/sellers/${id}`).then(r => r.data);

// ── Seller Payments ──
export const getSellerLedger = (sellerId) => API.get(`/sellers/${sellerId}/payment`).then(r => r.data);

export const addSellerPayment = (data) => API.post('/sellers/payment', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
}).then(r => r.data);

export const updateSellerPayment = (id, data) => API.put(`/sellers/payment/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
}).then(r => r.data);

export const deleteSellerPayment = (id) => API.delete(`/sellers/payment/${id}`).then(r => r.data);
