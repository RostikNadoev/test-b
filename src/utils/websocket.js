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
        const WS_URL = 'wss://bouncecase.duckdns.org/ws/crash';
        const url = `${WS_URL}?token=${token}`;
        
        console.log('🌐 Connecting to WebSocket:', url);
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
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
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
              this.reconnect();
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
            this.reconnectAttempts++;
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

  reconnect() {
    if (this.token) {
      this.connect().catch(console.error);
    }
  }

  sendCommand(command) {
    if (!this.isConnected || this.socket?.readyState !== WebSocket.OPEN) {
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
    
    if (handlers.length === 0 && data.type !== 'tick') {
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
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
      this.messageHandlers.clear();
      console.log('🔌 WebSocket disconnected by user');
    }
  }

  isReady() {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
}

export const crashWebSocket = new CrashWebSocket();