import { api } from "./api.js";

export const phoneService = {
  add: (userId, number) =>
    api.post(`/phones/user/${userId}`, undefined, { number }),
  getByUser: (userId) => api.get(`/phones/user/${userId}`),
  update: (phoneId, number) =>
    api.put(`/phones/${phoneId}`, undefined, { number }),
  delete: (phoneId) => api.delete(`/phones/${phoneId}`),
  deleteAllForUser: (userId) => api.delete(`/phones/user/${userId}`),
};
