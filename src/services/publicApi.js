/**
 * Unauthenticated axios client for the public confirmation flow.
 *
 * Distinct from `services/api.js` so it never sends Authorization headers
 * and never triggers the auth-related response interceptors (refresh,
 * forbid-toasts, redirect-to-login).
 */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const confirmationAPI = {
  lookup: (token, indexNumber) =>
    publicApi.get("/registry/public/confirm/lookup/", {
      params: { token, index_number: indexNumber },
    }),
  confirm: (token, indexNumber, nameOrder) =>
    publicApi.post("/registry/public/confirm/confirm/", {
      token, index_number: indexNumber, name_order: nameOrder,
    }),
  dispute: (token, indexNumber, note, disputes) =>
    publicApi.post("/registry/public/confirm/dispute/", {
      token, index_number: indexNumber, note, disputes,
    }),
  uploadProof: (token, indexNumber, file) => {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('index_number', indexNumber);
    formData.append('file', file);
    return publicApi.post("/registry/public/confirm/upload-proof/", formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default publicApi;
