const API = "http://localhost:5000/api/admin";
const TOKEN_KEY = "adminToken";
const ADMIN_KEY = "adminProfile";

export const getAdminToken = () => localStorage.getItem(TOKEN_KEY) || "";

export const setAdminSession = ({ token, admin }) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (admin) {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  }
};

export const clearAdminSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
};

export const getAdminProfileFromStorage = () => {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

export const registerAdmin = async (payload) => {
  const response = await fetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Registration failed.");
  }

  return data;
};

export const loginAdmin = async (payload) => {
  const response = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Login failed.");
  }

  return data;
};

export const fetchAdminMe = async () => {
  const token = getAdminToken();

  if (!token) {
    throw new Error("No admin token.");
  }

  const response = await fetch(`${API}/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Unauthorized");
  }

  return data?.admin || null;
};

export const updateAdminProfile = async (formData) => {
  const token = getAdminToken();

  if (!token) {
    throw new Error("Unauthorized");
  }

  const response = await fetch(`${API}/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Failed to update profile.");
  }

  return data;
};

export const requestAdminPasswordReset = async (payload) => {
  const response = await fetch(`${API}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseClone = response.clone();
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    const text = await responseClone.text();
    if (!response.ok) {
      throw new Error(text || "Request failed.");
    }
    return { message: text || "Request sent." };
  }

  if (!response.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data;
};

export const resetAdminPassword = async (payload) => {
  const response = await fetch(`${API}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseClone = response.clone();
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    const text = await responseClone.text();
    if (!response.ok) {
      throw new Error(text || "Reset failed.");
    }
    return { message: text || "Password reset succeeded." };
  }

  if (!response.ok) {
    throw new Error(data?.message || "Reset failed.");
  }

  return data;
};
