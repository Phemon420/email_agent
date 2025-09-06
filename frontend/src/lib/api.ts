import axios, { AxiosResponse } from 'axios';

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'jwt_token';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management utilities
export const tokenUtils = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  
  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },
  
  isValid: (): boolean => {
    const token = tokenUtils.get();
    return !!token;
  }
};

// Request interceptor - Add authentication token to Authorization header
api.interceptors.request.use((config) => {
  const token = tokenUtils.get();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenUtils.remove();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authApi = {
  // OAuth authorization URL
  authorize: (): string => `${API_BASE_URL}/authorize`,
};

export const chatApi = {
  // Start new AI conversation stream
  startStream: (data: { 
    recipient: string[]; 
    content: string; 
  }): Promise<AxiosResponse> => {
    return api.post('/talk_with_ai_stream_start', data);
  },
  
  // Continue existing AI conversation stream
  continueStream: (data: { 
    recipient: string[]; 
    content: string; 
    session_id: string; 
  }): Promise<AxiosResponse> => {
    return api.post('/talk_with_ai_stream_continue', data);
  },
};

export const emailApi = {
  // Send email
  send: (data: { 
    recipient: string; 
    subject: string; 
    body: string; 
  }): Promise<AxiosResponse> => {
    return api.post('/send_email', data);
  },
};