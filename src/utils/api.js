import axios from 'axios';

// Base backend URL from environment variables
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

console.log('🌐 API Base URL:', API_BASE_URL);

// Create axios instance with basic settings
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Interceptor for adding token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token added to request header');
    } else {
      console.log('⚠️ Token not found, request without authorization');
    }
    return config;
  },
  (error) => {
    console.error('❌ Error in request interceptor:', error);
    return Promise.reject(error);
  }
);

// Interceptor for response handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ Error ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
        status: error.response.status,
        data: error.response.data
      });
      
      // Handle specific error cases
      if (error.response.status === 401) {
        console.warn('⚠️ Unauthorized, clearing local storage');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // You might want to redirect to login page here
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    } else if (error.request) {
      console.error('❌ No response from server:', error.request);
    } else {
      console.error('❌ Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Utility functions
export const formatBalance = (balance) => {
  if (balance === undefined || balance === null) return '0.0';
  
  const num = parseFloat(balance);
  return isNaN(num) ? '0.0' : num.toFixed(2);
};

export const formatUsername = (username, name) => {
  return username || name || 'User';
};

// API for authentication
export const authApi = {
  // Authorization via Telegram Mini App
  async login(initData) {
    try {
      console.log('🔐 Sending authorization request...');
      
      const response = await api.post('/api/v1/auth/telegram', { 
        init_data: initData 
      });
      
      console.log('✅ Authorization successful:', response.data);
      
      if (response.data.token) {
        // Save token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('💾 Token and user data saved to localStorage');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Authorization error:', error);
      
      // Clear localStorage in case of error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      throw error;
    }
  },

  // Get current user data
  async getMe() {
    try {
      console.log('👤 Requesting user data...');
      
      const response = await api.get('/api/v1/auth/me');
      
      console.log('✅ User data received:', response.data.user);
      
      // Update user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      
      // If token expired or invalid (401), clear localStorage
      if (error.response?.status === 401) {
        console.warn('⚠️ Token expired or invalid, clearing localStorage');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('token');
    const hasToken = !!token;
    console.log('🔍 Authentication check:', hasToken ? 'Authenticated' : 'Not authenticated');
    return hasToken;
  },

  // Logout
  logout() {
    console.log('👋 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🗑️ Data cleared from localStorage');
  },

  // Get user data from localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('👤 User data from localStorage:', user.username);
        return user;
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return null;
      }
    }
    console.log('👤 User data not found in localStorage');
    return null;
  },

  // Update user data
  updateUserData(newUserData) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...newUserData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('🔄 User data updated');
    }
  }
};

export const usersApi = {
  // Get user statistics
  async getStats() {
    try {
      console.log('📊 Requesting user statistics...');
      const response = await api.get('/api/v1/users/stats');
      console.log('✅ Statistics received:', response.data.stats);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  },

  // Get user inventory
  async getInventory() {
    try {
      console.log('🎒 Requesting user inventory...');
      const response = await api.get('/api/v1/users/inventory');
      console.log('✅ Inventory received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting inventory:', error);
      throw error;
    }
  },

  // Get user balance
  async getBalance() {
    try {
      console.log('💰 Requesting user balance...');
      const response = await api.get('/api/v1/users/balance');
      console.log('✅ Balance received:', response.data.balances);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting balance:', error);
      throw error;
    }
  },

  // Get user quests
  async getQuests() {
    try {
      console.log('🎯 Requesting user quests...');
      const response = await api.get('/api/v1/quests/');
      console.log('✅ Quests received:', response.data.quests?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting quests:', error);
      throw error;
    }
  },

  // Claim quest reward
  async claimQuest(questId) {
    try {
      console.log(`🎁 Claiming reward for quest ${questId}...`);
      const response = await api.post(`/api/v1/quests/${questId}/claim`, {});
      console.log('✅ Reward claimed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error claiming reward:', error);
      throw error;
    }
  },

  
};

export const starsApi = {
  async createInvoice(amount) {
    try {
      console.log(`💰 Creating invoice for ${amount} stars...`);
      
      // ⚠️ УБИРАЕМ умножение на 1000
      // Было: const amountInXTR = amount * 1000;
      // Стало: передаем amount как есть (звезды)
      const starsCount = amount; // Просто передаем количество звезд
      
      const response = await api.post('/api/v1/stars/create-invoice', {
        amount: starsCount  // Теперь это количество звезд, а не XTR
      });
      
      console.log('✅ Invoice created:', response.data.invoice_link);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      throw error;
    }
  },

  // Проверить статус инвойса (опционально)
  async checkInvoiceStatus(invoiceId) {
    try {
      console.log(`🔍 Checking invoice status for ${invoiceId}...`);
      const response = await api.get(`/api/v1/stars/invoice/${invoiceId}/status`);
      console.log('✅ Invoice status:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking invoice status:', error);
      throw error;
    }
  }
};

export const tonApi = {
  // Получить баланс TON
  async getBalance() {
    try {
      console.log('💰 Requesting TON balance...');
      const response = await api.get('/api/v1/ton/balance');
      console.log('✅ TON balance received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting TON balance:', error);
      throw error;
    }
  },

  // Создать депозит
  async createDeposit(amount) {
    try {
      console.log(`💰 Creating deposit for ${amount} TON...`);
      const response = await api.post('/api/v1/ton/deposit', {
        amount: parseFloat(amount)
      });
      console.log('✅ Deposit created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating deposit:', error);
      throw error;
    }
  },

  // Проверить статус депозита (опционально)
  async checkDepositStatus(depositId) {
    try {
      console.log(`🔍 Checking deposit status for ID ${depositId}...`);
      const response = await api.get(`/api/v1/ton/deposit/${depositId}/status`);
      console.log('✅ Deposit status:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking deposit status:', error);
      throw error;
    }
  }
};

export const casesApi = {
  // Получить список всех активных кейсов
  async getAllCases() {
    try {
      console.log('📦 Requesting all cases...');
      const response = await api.get('/api/v1/cases/');
      console.log('✅ Cases response received:', response.data);
      
      // Проверяем структуру ответа
      if (response.data && response.data.cases && Array.isArray(response.data.cases)) {
        console.log('✅ Cases array found, length:', response.data.cases.length);
        return response.data.cases;
      } else if (Array.isArray(response.data)) {
        console.log('✅ Cases is direct array, length:', response.data.length);
        return response.data;
      } else {
        console.warn('⚠️ Unexpected response structure:', response.data);
        // Возвращаем пустой массив или дефолтные данные
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting cases:', error);
      throw error;
    }
  },

  // Получить детали кейса + содержимое
  async getCaseById(caseId) {
    try {
      console.log(`📦 Requesting case ${caseId}...`);
      const response = await api.get(`/api/v1/cases/${caseId}`);
      console.log('✅ Case received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting case:', error);
      throw error;
    }
  },

  async openCase(caseId, currency = 'ton') {
    try {
      console.log(`🎰 Отправляем запрос: /api/v1/cases/${caseId}/open`);
      console.log(`💰 Currency: "${currency}"`);
      
      const requestBody = {
        currency: currency
      };
      
      console.log('📦 Тело запроса:', JSON.stringify(requestBody));
      
      const response = await api.post(`/api/v1/cases/${caseId}/open`, requestBody);
      
      console.log('✅ Ответ от сервера:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка при открытии кейса:', error);
      console.error('📡 Полный ответ сервера:', error.response?.data);
      throw error;
    }
  }
};


// Export base axios instance for other requests
export default api;