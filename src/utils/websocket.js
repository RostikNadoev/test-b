class CrashWebSocket {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.connectionPromise = null;
    this.token = null;
    this.pingInterval = null;
    this.lastPongTime = Date.now();
  }

  // Подключение к WebSocket
  async connect() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No JWT token found in localStorage');
      return Promise.reject('No token found');
    }

    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.token = token;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const WS_URL = 'wss://shamefully-gifted-catbird.cloudpub.ru/ws/crash';
        const url = `${WS_URL}?token=${token}`;
        
        console.log('🌐 Connecting to WebSocket:', url);
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.lastPongTime = Date.now();
          
          // Запускаем пинг для поддержания соединения
          this.startPingInterval();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Обработка pong для поддержания соединения
            if (data.type === 'pong') {
              this.lastPongTime = Date.now();
              return;
            }
            
            if (data.server_time_ms) {
              // console.log(`⏱️ Sync: Server ${data.server_time_ms} vs Local ${Date.now()}`);
            }
            
            this.handleMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error, 'Raw:', event.data);
          }
        };

        this.socket.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.isConnected = false;
          this.connectionPromise = null;
          this.stopPingInterval();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
              this.reconnectAttempts++;
              this.connect().catch(console.error);
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.connectionPromise = null;
          reject(error);
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  startPingInterval() {
    this.stopPingInterval();
    
    // Отправляем ping каждые 30 секунд
    this.pingInterval = setInterval(() => {
      if (this.isReady()) {
        // Проверяем, не зависло ли соединение
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > 60000) { // 60 секунд без pong
          console.log('No pong received for 60s, reconnecting...');
          this.reconnect();
          return;
        }
        
        this.sendCommand({ type: 'ping' });
      }
    }, 30000);
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  reconnect() {
    this.disconnect();
    setTimeout(() => {
      this.connect().catch(console.error);
    }, 100);
  }

  sendCommand(command) {
    if (!this.isReady()) {
      console.error('❌ WebSocket not connected, cannot send command:', command);
      return false;
    }

    try {
      const cleanCommand = Object.fromEntries(
        Object.entries(command).filter(([_, value]) => value !== null && value !== undefined)
      );
      const jsonCommand = JSON.stringify(cleanCommand);
      this.socket.send(jsonCommand);
      return true;
    } catch (error) {
      console.error('❌ Error sending command:', error);
      return false;
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
    const handlers = this.messageHandlers.get(data.type) || [];
    handlers.forEach(handler => handler(data));
    
    // Логируем только важные сообщения
    if (handlers.length === 0 && !['tick', 'pong'].includes(data.type)) {
      console.log('📨 Unhandled WebSocket message type:', data.type, data);
    }
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
    this.stopPingInterval();
    
    if (this.socket) {
      // Удаляем все обработчики перед закрытием
      this.messageHandlers.clear();
      
      try {
        this.socket.close(1000, 'User disconnected');
      } catch (error) {
        console.error('Error closing socket:', error);
      }
      
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
      console.log('🔌 WebSocket disconnected by user');
    }
  }

  isReady() {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
}

// Создаем и экспортируем единственный экземпляр
export const crashWebSocket = new CrashWebSocket();