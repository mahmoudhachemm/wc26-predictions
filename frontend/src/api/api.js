const API_BASE_URL = "http://192.168.1.13:5000/api";

export async function apiRequest(endpoint, options = {}) {
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (currentUser?.token) {
    headers.Authorization = `Bearer ${currentUser.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
}