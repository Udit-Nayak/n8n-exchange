import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  logout: (data) => api.post("/auth/logout", data),
  googleSignIn: (data) => api.post("/auth/google-signin", data),
  me: () => api.get("/auth/me"),
};

// ─── Workflows ────────────────────────────────────────────────────────────────
export const workflowAPI = {
  getAll: () => api.get("/workflows"),
  getOne: (id) => api.get(`/workflows/${id}`),
  create: (data) => api.post("/workflows", data),
  update: (id, data) => api.put(`/workflows/${id}`, data),
  delete: (id) => api.delete(`/workflows/${id}`),
  activate: (id) => api.patch(`/workflows/${id}/activate`),
  deactivate: (id) => api.patch(`/workflows/${id}/deactivate`),
  getExecutions: (id) => api.get(`/workflows/${id}/executions`),
};

// ─── Executions ───────────────────────────────────────────────────────────────
export const executionAPI = {
  getAll: (params) => api.get("/executions", { params }),
};

// ─── Portfolio ────────────────────────────────────────────────────────────────
export const portfolioAPI = {
  getPortfolio: () => api.get("/portfolio/portfolio"),
  getHoldings: () => api.get("/portfolio/holdings"),
  getTransactions: (params) => api.get("/portfolio/transactions", { params }),
  getTransactionStats: (params) => api.get("/portfolio/transactions/stats", { params }),
};

// ─── User ─────────────────────────────────────────────────────────────────────
export const userAPI = {
  updateProfile: (data) => api.put("/user/profile", data),
};

// ─── Prices ───────────────────────────────────────────────────────────────────
export const priceAPI = {
  getAll: () => api.get("/prices"),
  getBySymbol: (symbol) => api.get(`/prices/${symbol}`),
  getHistory: (symbol, params) => api.get(`/prices/${symbol}/history`, { params }),
};

export default api;
