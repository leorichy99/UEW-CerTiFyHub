import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

let refreshPromise = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    if (!originalRequest) return Promise.reject(error);

    const url = String(originalRequest.url || "");
    const isAuthRequest = url.includes("/auth/token/");
    if (isAuthRequest) return Promise.reject(error);

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
  register: (data) => api.post("/auth/register/", data),
  me: () => api.get("/auth/me/"),
};

// Certificate API calls
export const certificateAPI = {
  // Get all certificates
  getAll: () => api.get("/certificates/"),

  // Get single certificate
  getOne: (id) => api.get(`/certificates/${id}/`),

  // Create certificate
  create: (data) => {
    const formData = new FormData();

    // Append text fields
    formData.append("student_name", data.student_name);
    formData.append("degree_type", data.degree_type);
    formData.append("honors", data.honors);
    formData.append("program", data.program);
    formData.append("date_awarded", data.date_awarded);

    // Append files if they exist
    if (data.university_logo) {
      formData.append("university_logo", data.university_logo);
    }
    if (data.vc_signature) {
      formData.append("vc_signature", data.vc_signature);
    }
    if (data.registrar_signature) {
      formData.append("registrar_signature", data.registrar_signature);
    }

    return api.post("/certificates/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

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

  // Regenerate PDF
  regenerate: (id) => api.post(`/certificates/${id}/regenerate/`),

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

export const studentAPI = {
  getAll: () => api.get("/students/"),
  getOne: (id) => api.get(`/students/${id}/`),
  create: (data) => api.post("/students/", data),
  update: (id, data) => api.patch(`/students/${id}/`, data),
  delete: (id) => api.delete(`/students/${id}/`),
  bulkCreate: (students) => api.post("/students/bulk_create/", { students }),
};

export const templateAPI = {
  getAll: () => api.get("/templates/"),
  getOne: (id) => api.get(`/templates/${id}/`),
  create: (data) => api.post("/templates/", data),
  update: (id, data) => api.patch(`/templates/${id}/`, data),
  delete: (id) => api.delete(`/templates/${id}/`),
};

export default api;
