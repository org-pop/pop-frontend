import { api } from "./api.js";

export const orderService = {
  checkout: (userId) => api.post(`/orders/${userId}/checkout`),
  getByUser: (userId) => api.get(`/orders/${userId}`),
  getDetails: (orderId) => api.get(`/orders/${orderId}/details`),
  getItems: (orderId) => api.get(`/orders/${orderId}/items`),
  updateStatus: (orderId, status) =>
    api.put(`/orders/${orderId}/status`, undefined, { status }),
  cancel: (orderId) => api.delete(`/orders/${orderId}/cancel`),
};
