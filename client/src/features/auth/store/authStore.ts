import { create } from "zustand";
import { LoginPayload,LoginResponse } from "../types/authTypes";
import { authServiceImpl } from "../services/authServiceImpl";

type AuthState = {
  user: LoginResponse["user"] | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  register: (payload: { name: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: LoginResponse["user"]) => void;
  initAuth: () => void; // Nova função para inicializar
}

export const userAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  // Inicializar autenticação do localStorage
  initAuth: () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    console.log('🔐 [AuthStore] Inicializando auth do localStorage:', {
      hasToken: !!token,
      hasUser: !!userStr
    });
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, loading: false });
        console.log('✅ [AuthStore] Usuário restaurado:', user.name);
      } catch (err) {
        console.error('❌ [AuthStore] Erro ao parsear usuário:', err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null, loading: false });
      }
    } else {
      set({ loading: false });
    }
  },

  login: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await authServiceImpl.login(payload);
      set({ user: response.user, token: response.token, loading: false });
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user)); // Salvar usuário também
      return true;
    } catch (err: any) {
      set({ error: err.message || "Login failed", loading: false });
      return false;
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await authServiceImpl.register(payload);
      set({ user: response.user, token: response.token, loading: false });
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user)); // Salvar usuário também
      return true;
    } catch (err: any) {
      set({ error: err.message || "Registration failed", loading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem("token");
    localStorage.removeItem("user"); // Remover usuário também
  },

  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ token: null, user: null });
      return;
    }
    
    set({ token, loading: true });
    try {
      const user = await authServiceImpl.me(token);
      set({ user, loading: false });
      localStorage.setItem("user", JSON.stringify(user)); // Salvar usuário também
    } catch (err) {
      // Token inválido/expirado
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      set({ token: null, user: null, loading: false });
    }
  },

  setUser: (user) => {
    set({ user });
    localStorage.setItem("user", JSON.stringify(user)); // Salvar usuário também
  },
}));