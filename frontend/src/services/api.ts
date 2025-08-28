// API Base URL - using the backend HTTPS endpoint (Docker maps to port 443)
const API_BASE_URL = 'https://localhost:4444/api'; //Work on cluster
// const API_BASE_URL = 'https://localhost:443/api';

// Types for API requests and responses
export interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  requires2FA?: boolean;
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface Setup2FAResponse {
  success: boolean;
  qrCode?: string;
  secret?: string;
  error?: string;
}

export interface Verify2FAResponse {
  success: boolean;
  backupCodes?: string[];
  message?: string;
  error?: string;
}

export interface Verify2FARequest {
  token: string;
}

// API Service Class
export class ApiService {
  private static instance: ApiService;
  
  private constructor() {}
  
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Helper method to make authenticated requests
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    return response;
  }

  // Authentication methods
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success && result.token) {
        localStorage.setItem('token', result.token);
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      return await response.json();
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async setup2FA(): Promise<Setup2FAResponse> {
    try {
      const response = await this.makeRequest('/auth/2fa/setup', {
        method: 'POST',
        body: JSON.stringify({}) // Send empty JSON object
      });

      return await response.json();
    } catch (error) {
      console.error('2FA setup error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async verify2FA(data: Verify2FARequest): Promise<Verify2FAResponse> {
    try {
      const response = await this.makeRequest('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success && result.token) {
        localStorage.setItem('token', result.token);
      }
      
      return result;
    } catch (error) {
      console.error('2FA verify error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
    }
  }

  // Profile methods
  async getProfile(): Promise<any> {
    try {
      const response = await this.makeRequest('/profile');
      return await response.json();
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  async updateDisplayName(displayName: string): Promise<any> {
    try {
      const response = await this.makeRequest('/profile/display-name', {
        method: 'POST',
        body: JSON.stringify({ displayName })
      });
      return await response.json();
    } catch (error) {
      console.error('Update display name error:', error);
      throw error;
    }
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<any> {
    try {
      const response = await this.makeRequest('/profile/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      return await response.json();
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  async uploadAvatar(file: File): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      return await response.json();
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  clearAuth(): void {
    localStorage.removeItem('token');
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();