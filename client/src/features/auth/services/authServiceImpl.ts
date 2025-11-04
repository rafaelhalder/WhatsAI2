import { AuthService } from "./AuthService";
import { LoginPayload, LoginResponse } from "../types/authTypes";
import axios from "axios";

// Use relative URL in development to leverage Vite proxy
// In production, use full URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || "/api";

export const authServiceImpl: AuthService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const response = await axios.post<{
        success: boolean;
        data: {
          token: string;
          user: {
            id: string;
            name: string;
            email: string;
            role: string;
            plan?: string;
          };
        };
      }>(
        `${API_URL}/auth/login`,
        payload,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
      
      if (!response.data.success) {
        throw new Error("Login failed");
      }

      return {
        token: response.data.data.token,
        user: {
          id: response.data.data.user.id,
          name: response.data.data.user.name,
          email: response.data.data.user.email,
          plan: response.data.data.user.plan?.toLowerCase() || 'free', // Normalizar para minúsculo
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Login failed";
        throw new Error(message);
      }
      const message = error instanceof Error ? error.message : "Login failed";
      throw new Error(message);
    }
  },

  async register(payload: { name: string; email: string; password: string }): Promise<LoginResponse> {
    try {
      const response = await axios.post<{
        success: boolean;
        data: {
          token: string;
          user: {
            id: string;
            name: string;
            email: string;
            role: string;
            plan?: string;
          };
        };
      }>(
        `${API_URL}/auth/register`,
        payload,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.data.success) {
        throw new Error("Registration failed");
      }

      return {
        token: response.data.data.token,
        user: {
          id: response.data.data.user.id,
          name: response.data.data.user.name,
          email: response.data.data.user.email,
          plan: response.data.data.user.plan?.toLowerCase() || 'free', // Normalizar para minúsculo
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Registration failed";
        throw new Error(message);
      }
      const message = error instanceof Error ? error.message : "Registration failed";
      throw new Error(message);
    }
  },

  async me(token: string): Promise<LoginResponse["user"]> {
    try {
      const response = await axios.get<{
        success: boolean;
        data: {
          id: string;
          name: string;
          email: string;
          role: string;
          plan?: string;
        };
      }>(
        `${API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.data.success) {
        throw new Error("Failed to get user data");
      }

      return {
        id: response.data.data.id,
        name: response.data.data.name,
        email: response.data.data.email,
        plan: response.data.data.plan?.toLowerCase() || 'free', // Normalizar para minúsculo
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Failed to get user data";
        throw new Error(message);
      }
      const message = error instanceof Error ? error.message : "Failed to get user data";
      throw new Error(message);
    }
  }
}