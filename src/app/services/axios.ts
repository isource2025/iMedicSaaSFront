import axios from 'axios';

// Create an axios instance with custom configuration
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the headers
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: any) => {
    // Any status code that lie within the range of 2xx
    return response;
  },
  (error: any) => {
    // Handle different error scenarios
    const { response } = error;
    
    if (response) {
      // Handle unauthorized errors
      if (response.status === 401) {
        // Clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
      
      // Handle forbidden errors
      if (response.status === 403) {
        console.error('Permission denied.');
      }
      
      // Handle server errors
      if (response.status >= 500) {
        console.error('Server error. Please try again later.');
      }
    } else {
      // Handle network errors
      console.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Helper functions for common API calls
export const apiService = {
  get: <T>(url: string, config?: any) => 
    axiosInstance.get<T>(url, config),
  
  post: <T>(url: string, data?: any, config?: any) => 
    axiosInstance.post<T>(url, data, config),
  
  put: <T>(url: string, data?: any, config?: any) => 
    axiosInstance.put<T>(url, data, config),
  
  delete: <T>(url: string, config?: any) => 
    axiosInstance.delete<T>(url, config),
  
  patch: <T>(url: string, data?: any, config?: any) => 
    axiosInstance.patch<T>(url, data, config)
};

export default axiosInstance;
