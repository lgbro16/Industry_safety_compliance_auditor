// Centralized API configuration for SIF-GUARD
// When VITE_API_BASE_URL is set (e.g. deployed on Render), uses the full URL.
// When unset (local development), uses relative path to leverage Vite proxy.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function getApiUrl(endpoint) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}
