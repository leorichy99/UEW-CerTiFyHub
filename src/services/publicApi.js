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
  confirm: (token, indexNumber) =>
    publicApi.post("/registry/public/confirm/confirm/", {
      token, index_number: indexNumber,
    }),
  dispute: (formData) =>
    publicApi.post("/registry/public/confirm/dispute/", formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default publicApi;
