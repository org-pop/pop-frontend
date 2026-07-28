import { api } from "./api.js";

export const addressService = {
  add: (userId, address) => api.post(`/addresses/user/${userId}`, address),
  getByUser: (userId) => api.get(`/addresses/user/${userId}`),
  delete: (addressId) => api.delete(`/addresses/${addressId}`),
};
