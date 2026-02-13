import { authApi } from './api';

class PvpSocket {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
  }

  connect(gameId = null) {
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    const token = this.getToken();
    if (!token) {
      console.error('No token available');
      this.isConnecting = false;
      return;
    }

    const wsUrl = import.meta.env.VITE_WSP_URL;
    let url = `${wsUrl}?token=${token}`;
    
    if (gameId) {
      url += `&game_id=${gameId}`;
    }

    console.log(`🔗 Connecting to PvP WebSocket: ${wsUrl}`);

    try {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        console.log('✅ PvP WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 PvP WebSocket message:', data.type, data);
          this.emit(data.type, data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`❌ PvP WebSocket closed: ${event.code} ${event.reason}`);
        this.isConnecting = false;
        this.emit('disconnected', event);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect(gameId);
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ PvP WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      this.isConnecting = false;
    }
  }

  getToken() {
    const token = localStorage.getItem('token');
    console.log('🔑 Token from localStorage:', token ? '✓ Found' : '✗ Not found');
    return token;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
    this.isConnecting = false;
  }

  sendMessage(type, payload = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket is not connected');
      return false;
    }

    try {
      const message = JSON.stringify({ type, ...payload });
      console.log('📤 Sending WebSocket message:', { type, ...payload });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  // Команды
  join(inventoryIds) {
    console.log('🎮 [Socket] Joining with inventory IDs:', inventoryIds);
    
    if (!this.isConnected()) {
      console.error('❌ [Socket] WebSocket not connected');
      return false;
    }
    
    let allSuccess = true;
    
    if (Array.isArray(inventoryIds)) {
      // Отправляем каждый предмет отдельным сообщением
      inventoryIds.forEach((id, index) => {
        console.log(`📤 [Socket] Sending join #${index + 1} for inventory_id: ${id}`);
        const success = this.sendMessage('join', { inventory_id: id });
        if (!success) {
          allSuccess = false;
        }
      });
    } else {
      // Отправляем один предмет
      allSuccess = this.sendMessage('join', { inventory_id: inventoryIds });
    }
    
    return allSuccess;
  }

  leave(inventoryId = null) {
    console.log('🎮 [Socket] Leaving game', inventoryId ? `item ${inventoryId}` : 'all items');
    
    if (inventoryId) {
      return this.sendMessage('leave', { inventory_id: inventoryId });
    } else {
      return this.sendMessage('leave');
    }
  }

  requestState() {
    console.log('🔄 [Socket] Requesting state');
    return this.sendMessage('state');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    console.log(`📢 [Socket] Emitting event: ${event}`, data);
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
    
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => callback({ type: event, data }));
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  getCurrentUserId() {
    const user = authApi.getCurrentUser();
    return user ? user.id || user.user_id : null;
  }
}

const pvpSocket = new PvpSocket();
export default pvpSocket;