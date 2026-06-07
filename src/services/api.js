import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

let refreshPromise = null;

// Request cache for deduplication
const requestCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Invalidate cache entries whose key contains the given substring
function invalidateCache(pattern) {
  for (const key of requestCache.keys()) {
    if (key.includes(pattern)) {
      requestCache.delete(key);
    }
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to inject JWT token and caching
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add caching for GET requests (skip blob responses – they corrupt in cache)
    if (config.method === 'get' && config.responseType !== 'blob') {
      const cacheKey = `${config.url}${JSON.stringify(config.params)}`;
      const cached = requestCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        config.adapter = () => Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          fromCache: true
        });
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    const method = response.config.method;
    // Invalidate related cache entries after any mutation
    if (method && method !== 'get') {
      const url = response.config.url || '';
      // Extract the resource base path, e.g. "/certificates/" from "/certificates/abc-123/"
      const basePath = url.split('/').slice(0, 2).join('/');
      if (basePath) invalidateCache(basePath);
    }
    // Cache successful GET responses (skip blobs)
    if (method === 'get' && !response.fromCache && response.config.responseType !== 'blob') {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params)}`;
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    if (!originalRequest) return Promise.reject(error);

    const url = String(originalRequest.url || "");
    const isAuthRequest = url.includes("/auth/token/");
    if (isAuthRequest) return Promise.reject(error);

    // Handle 403 Forbidden gracefully: tag the error and dispatch a global event
    // so the app can show a single user-friendly toast instead of raw JSON.
    if (status === 403) {
      error.isForbidden = true;
      error.friendlyMessage = "You don't have permission to perform this action.";
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("api:forbidden", {
              detail: { url, method: originalRequest.method },
            })
          );
        } catch (_) {
          // ignore
        }
      }
      return Promise.reject(error);
    }

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem("refreshToken");
    if (!refresh) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${API_BASE_URL}/auth/token/refresh/`,
            { refresh },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
          .then((res) => {
            const nextAccess = res?.data?.access;
            if (!nextAccess) throw new Error("No access token returned");
            localStorage.setItem("accessToken", nextAccess);
            return nextAccess;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const nextAccess = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccess}`;
      return api(originalRequest);
    } catch (e) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return Promise.reject(e);
    }
  },
);

export const authAPI = {
  login: (credentials) => api.post("/auth/token/", credentials),
  refreshToken: (refresh) => api.post("/auth/token/refresh/", { refresh }),
  me: () => api.get("/auth/me/"),
  passwordResetRequest: (email) => api.post("/auth/password-reset/", { email }),
  verifyResetToken: (token, email) => api.post("/auth/password-reset/verify/", { token, email }),
  passwordResetConfirm: (token, email, new_password) => api.post("/auth/password-reset/confirm/", { token, email, new_password }),
  // First-login account setup (public)
  setupAccount: (data) => api.post("/auth/setup-account/", data),
};

// Certificate API calls
export const certificateAPI = {
  // Get all certificates (paginated)
  getAll: (params) => api.get("/certificates/", { params }),

  // Get single certificate
  getOne: (id) => api.get(`/certificates/${id}/`),

  // Update certificate
  update: (id, data) => {
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    return api.patch(`/certificates/${id}/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Delete certificate
  delete: (id) => api.delete(`/certificates/${id}/`),

  // Download certificate PDF
  download: (id) => {
    return api.get(`/certificates/${id}/download/`, {
      responseType: "blob",
    });
  },

  // Get certificate PNG preview
  getPreview: (id) => {
    return api.get(`/certificates/${id}/preview/`, {
      responseType: "blob",
    });
  },

  // Regenerate PDF
  regenerate: (id) => api.post(`/certificates/${id}/regenerate/`),

  // Revoke / Reactivate
  revoke: (id) => api.post(`/certificates/${id}/revoke/`),
  reactivate: (id) => api.post(`/certificates/${id}/reactivate/`),

  // Bulk Issue
  bulkIssue: (data) => api.post("/certificates/bulk_issue/", data),

  // Bulk bundle download (multi-page PDF)
  bulkBundle: (certificate_ids) =>
    api.post(
      "/certificates/bulk_bundle/",
      { certificate_ids },
      { responseType: "blob" },
    ),
};

export const registryAPI = {
  faculties: {
    getAll: (params) => api.get("/registry/faculties/", { params }),
    create: (data) => api.post("/registry/faculties/", data),
    update: (id, data) => api.patch(`/registry/faculties/${id}/`, data),
    delete: (id) => api.delete(`/registry/faculties/${id}/`),
  },
  departments: {
    getAll: (params) => api.get("/registry/departments/", { params }),
    create: (data) => api.post("/registry/departments/", data),
    update: (id, data) => api.patch(`/registry/departments/${id}/`, data),
    delete: (id) => api.delete(`/registry/departments/${id}/`),
  },
};

export const templateAPI = {
  getAll: () => api.get("/templates/"),
  getOne: (id) => api.get(`/templates/${id}/`),
  create: (data) => api.post("/templates/", data),
  update: (id, data) => api.patch(`/templates/${id}/`, data),
  delete: (id) => api.delete(`/templates/${id}/`),
  lock: (id) => api.post(`/templates/${id}/lock/`),
  unlock: (id) => api.post(`/templates/${id}/unlock/`),
  getSystemFonts: () => api.get("/templates/system-fonts/"),
};

// ── Authorisation References (Super Admin) ─────────────────────────────
export const authorisationAPI = {
  getAll: (params) => api.get("/users/authorisations/", { params }),
  getOne: (id) => api.get(`/users/authorisations/${id}/`),
  create: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, value);
    });
    return api.post("/users/authorisations/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  update: (id, data) => api.patch(`/users/authorisations/${id}/`, data),
};

// ── Account Provisioning (Super Admin) ──────────────────────────────────
export const accountAPI = {
  getAll: (params) => api.get("/users/accounts/", { params }),
  getOne: (id) => api.get(`/users/accounts/${id}/`),
  provision: (data) => api.post("/users/accounts/", data),
  updatePermissions: (id, data) => api.patch(`/users/accounts/${id}/permissions/`, data),
  deactivate: (id, data) => api.post(`/users/accounts/${id}/deactivate/`, data),
  reactivate: (id, data) => api.post(`/users/accounts/${id}/reactivate/`, data),
  unlock: (id) => api.post(`/users/accounts/${id}/unlock/`),
  regenerateCredential: (id) => api.post(`/users/accounts/${id}/regenerate-credential/`),
  getPermissionConstants: () => api.get("/users/permissions/"),
};

// ── SA Deactivation Confirmation ────────────────────────────────────────
export const saDeactivationAPI = {
  confirm: (token) => api.post(`/users/sa-deactivation/${token}/`),
};


// Super Admin API (analytics endpoints)
export const superAdminAPI = {
  getStats: () => api.get("/analytics/super-admin-stats/"),
  getGlobalAnalytics: (range = "30d") =>
    api.get("/analytics/global/", { params: { range } }),
  getAuditLogs: ({ category = "admin", search = "", date = "all", status = "all", page = 1, page_size = 20 } = {}) =>
    api.get("/analytics/audit-logs/", {
      params: { category, search, date, status, page, page_size },
    }),
};

// Profile API
export const profileAPI = {
  me: () => api.get('/auth/me/'),
  update: (data) => {
    const formData = new FormData();
    if (data.first_name !== undefined) formData.append('first_name', data.first_name);
    if (data.last_name !== undefined) formData.append('last_name', data.last_name);
    if (data.username !== undefined) formData.append('username', data.username);
    if (data.avatar instanceof File) formData.append('avatar', data.avatar);
    if (data.avatar === null) formData.append('avatar', '');
    return api.patch('/auth/me/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changePassword: (data) => api.post('/auth/change-password/', data),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get("/notifications/", { params }),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post("/notifications/mark-all-read/"),
  archive: (id) => api.post(`/notifications/${id}/archive/`),
  getUnreadCount: () => api.get("/notifications/unread-count/"),
  getPreferences: () => api.get("/notifications/preferences/"),
  updatePreferences: (data) => api.put("/notifications/preferences/", data),
  // Permanently delete all notifications (server should implement this endpoint)
  clearAll: () => api.post("/notifications/clear-all/"),
};


export default api;
