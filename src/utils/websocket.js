// utils/websocket.js
class CrashWebSocket {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.url = 'wss://your-backend-url.com/ws/crash'; // Замените на ваш URL
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        const token = localStorage.getItem('token');
        this.socket = new WebSocket(`${this.url}?token=${token}`);

        this.socket.onopen = () => {
          console.log('✅ Crash WebSocket connected');
          this.reconnectAttempts = 0;
          this.requestState();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('❌ Failed to parse WS message:', e);
          }
        };

        this.socket.onclose = (event) => {
          console.log(`ℹ️ WebSocket closed: ${event.code}`);
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  on(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType).push(handler);
  }

  off(eventType, handler) {
    if (this.messageHandlers.has(eventType)) {
      const handlers = this.messageHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  handleMessage(data) {
    // Вызываем общие обработчики для типа сообщения
    const handlers = this.messageHandlers.get(data.type) || [];
    handlers.forEach(handler => handler(data));
    
    // Логирование необработанных сообщений (кроме тиков)
    if (handlers.length === 0 && data.type !== 'tick') {
      console.log('📨 Unhandled WebSocket message type:', data.type, data);
    }
  }

  sendCommand(command) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(command));
      return true;
    }
    console.warn('⚠️ Cannot send command: WS not connected');
    return false;
  }

  requestState() {
    return this.sendCommand({ type: 'state' });
  }

  placeBet(currency, amount, autoCashout = null) {
    const command = {
      type: 'bet',
      currency: currency.toLowerCase(),
      amount: parseFloat(amount)
    };
    if (autoCashout && autoCashout >= 1.01) {
      command.auto_cashout = parseFloat(autoCashout);
    }
    return this.sendCommand(command);
  }

  cashout(betId) {
    return this.sendCommand({
      type: 'cashout',
      bet_id: parseInt(betId)
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Normal closure');
      this.socket = null;
    }
  }
}

export const crashWebSocket = new CrashWebSocket();