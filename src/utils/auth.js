export const getAuthToken = () => localStorage.getItem('authToken');
export const setAuthToken = (token) => localStorage.setItem('authToken', token);
export const removeAuthToken = () => localStorage.removeItem('authToken');

/** Best-effort role from JWT payload (client guard only; server enforces permissions). */
export const getAuthRole = () => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ? String(payload.role).toLowerCase() : null;
  } catch {
    return null;
  }
};
