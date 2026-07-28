import { api } from "./api.js";

export const paymentService = {
  create: (orderId, method) =>
    api.post(`/payments/order/${orderId}`, undefined, { method }),
  process: (paymentId) => api.post(`/payments/${paymentId}/process`),
  approve: (paymentId) => api.post(`/payments/${paymentId}/approve`),
  decline: (paymentId) => api.post(`/payments/${paymentId}/decline`),
  refund: (paymentId) => api.post(`/payments/${paymentId}/refund`),
  getByOrder: (orderId) => api.get(`/payments/order/${orderId}`),
  getByStatus: (status) => api.get(`/payments/status/${status}`),
  updateStatus: (paymentId, status) =>
    api.put(`/payments/${paymentId}/status`, undefined, { status }),
};
