const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (currentUser?.token) {
    headers.Authorization = `Bearer ${currentUser.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
}