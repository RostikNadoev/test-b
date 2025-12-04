import axios from 'axios';

// Базовый URL бэкенда из переменных окружения
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL 

console.log('🌐 API Base URL:', API_BASE_URL);

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут
});

// Интерсептор для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Добавлен токен в заголовок запроса');
    } else {
      console.log('⚠️ Токен не найден, запрос без авторизации');
    }
    return config;
  },
  (error) => {
    console.error('❌ Ошибка в интерсепторе запроса:', error);
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ответов
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ Ошибка ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('❌ Нет ответа от сервера:', error.request);
    } else {
      console.error('❌ Ошибка настройки запроса:', error.message);
    }
    return Promise.reject(error);
  }
);

// Утилитарные функции
export const formatBalance = (balance) => {
  if (balance === undefined || balance === null) return '0.00';
  
  const num = parseFloat(balance);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

export const formatUsername = (username, name) => {
  return username || name || 'User';
};

// API для работы с аутентификацией
export const authApi = {
  // Авторизация через Telegram Mini App
  async login(initData) {
    try {
      console.log('🔐 Отправляем запрос на авторизацию...');
      
      const response = await api.post('/api/v1/auth/telegram', { 
        init_data: initData 
      });
      
      console.log('✅ Авторизация успешна:', response.data);
      
      if (response.data.token) {
        // Сохраняем токен и данные пользователя
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('💾 Токен и данные пользователя сохранены в localStorage');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
      
      // Очищаем localStorage в случае ошибки
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      throw error;
    }
  },

  // Получение данных текущего пользователя
  async getMe() {
    try {
      console.log('👤 Запрашиваем данные пользователя...');
      
      const response = await api.get('/api/v1/auth/me');
      
      console.log('✅ Данные пользователя получены:', response.data.user);
      
      // Обновляем данные пользователя в localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка получения данных пользователя:', error);
      
      // Если токен истек или невалиден (401), очищаем localStorage
      if (error.response?.status === 401) {
        console.warn('⚠️ Токен истек или невалиден, очищаем localStorage');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      throw error;
    }
  },

  // Проверяем, авторизован ли пользователь
  isAuthenticated() {
    const token = localStorage.getItem('token');
    const hasToken = !!token;
    console.log('🔍 Проверка авторизации:', hasToken ? 'Авторизован' : 'Не авторизован');
    return hasToken;
  },

  // Выход из системы
  logout() {
    console.log('👋 Выход из системы...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🗑️ Данные очищены из localStorage');
  },

  // Получаем данные пользователя из localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('👤 Данные пользователя из localStorage:', user.username);
        return user;
      } catch (error) {
        console.error('❌ Ошибка парсинга данных пользователя:', error);
        return null;
      }
    }
    console.log('👤 Данные пользователя не найдены в localStorage');
    return null;
  },

  // Обновление данных пользователя
  updateUserData(newUserData) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...newUserData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('🔄 Данные пользователя обновлены');
    }
  }
};

export const usersApi = {
  // Получение статистики пользователя
  async getStats() {
    try {
      console.log('📊 Запрашиваем статистику пользователя...');
      const response = await api.get('/api/v1/users/stats');
      console.log('✅ Статистика получена:', response.data.stats);
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      throw error;
    }
  },

  // Получение инвентаря пользователя (если есть такой endpoint)
  async getInventory() {
    try {
      console.log('🎒 Запрашиваем инвентарь пользователя...');
      const response = await api.get('/api/v1/users/inventory');
      console.log('✅ Инвентарь получен:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка получения инвентаря:', error);
      throw error;
    }
  }
};

// Экспортируем базовый экземпляр axios для других запросов
export default api;