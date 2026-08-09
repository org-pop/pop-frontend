import { api } from "./api.js";

export const userService = {
  getAll: () => api.get("/api/users"),
  getById: (id) => api.get(`/api/users/${id}`),
  getByEmail: (email) => api.get(`/api/users/email/${encodeURIComponent(email)}`),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
};
