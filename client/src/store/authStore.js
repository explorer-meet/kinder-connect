import { create } from 'zustand';
import api from '../api/api';

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    role: (user.role || '').toLowerCase(),
  };
};

const useAuthStore = create((set) => ({
  user: normalizeUser(JSON.parse(localStorage.getItem('user'))),
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      const normalizedUser = normalizeUser(user);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));

      set({ token, user: normalizedUser, loading: false });
      return { success: true, user: normalizedUser };
    } catch (err) {
      const error = err.response?.data?.error || 'Login failed';
      set({ error, loading: false });
      return { success: false, error };
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;

      const normalizedUser = normalizeUser(user);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));

      set({ token, user: normalizedUser, loading: false });
      return { success: true, user: normalizedUser };
    } catch (err) {
      const error = err.response?.data?.error || 'Registration failed';
      set({ error, loading: false });
      return { success: false, error };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  getUser: async () => {
    try {
      const response = await api.get('/auth/me');
      const normalizedUser = normalizeUser(response.data);
      set({ user: normalizedUser });
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch (err) {
      // If token is invalid or backend is unreachable, clear auth
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null });
      console.error('Failed to get user:', err.message);
    }
  },
}));

export default useAuthStore;
