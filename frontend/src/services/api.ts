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
  requires2FA?: boolean;
  error?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    wins: number;
    losses: number;
    twoFactorEnabled: boolean;
  };
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

  // Helper method to get CSRF token from cookies
  private getCSRFToken(): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrfToken') {
        return value;
      }
    }
    return null;
  }

  // Helper method to make authenticated requests
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>
    };

    // Only set Content-Type if we have a body
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      const csrfToken = this.getCSRFToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    const config: RequestInit = {
      ...options,
	  mode: 'cors',             // Explicit for Firefox
      credentials: 'include', // Always include cookies
      headers
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
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async googleLogin(credential: string): Promise<LoginResponse> {
    try {
      const response = await this.makeRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential })
      });

      const result = await response.json();
      
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Google authentication failed' };
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
      
      return result;
    } catch (error) {
      console.error('2FA verify error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}) // Send empty JSON object to satisfy content-type
      });
    } catch (error) {
      console.error('Logout error:', error);
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
      const formData = new FormData();
      formData.append('file', file);

      // Add CSRF token for file upload
      const csrfToken = this.getCSRFToken();
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers,
        body: formData // Don't set Content-Type for FormData - browser sets it automatically
      });

      return await response.json();
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    // Check if we have the CSRF token cookie (accessToken is HTTP-only and can't be read by JS)
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => cookie.trim().startsWith('csrfToken='));
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();