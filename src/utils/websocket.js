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
    this.shouldReconnect = true;
    this.pendingCommands = []; // Очередь команд на случай переподключения
  }

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
          this.shouldReconnect = true;
          
          this.setupPingInterval();
          
          // Отправляем накопившиеся команды
          this.pendingCommands.forEach(cmd => this.sendCommand(cmd));
          this.pendingCommands = [];
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
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
          this.clearPingInterval();
          
          if (this.shouldReconnect && !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
            console.log(`🔄 Attempting to reconnect in ${delay}ms (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
              this.reconnect();
            }, delay);
            
            this.reconnectAttempts++;
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  setupPingInterval() {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.isReady()) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
          console.error('Failed to send ping:', e);
        }
      }
    }, 30000);
  }

  clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  reconnect() {
    if (this.token && this.shouldReconnect) {
      this.connect().catch(console.error);
    }
  }

  sendCommand(command) {
    if (!this.isReady()) {
      console.log('📥 WebSocket not connected, queueing command:', command);
      this.pendingCommands.push(command);
      return false;
    }

    try {
      const cleanCommand = Object.fromEntries(
        Object.entries(command).filter(([_, value]) => value !== null && value !== undefined)
      );
      const jsonCommand = JSON.stringify(cleanCommand);
      console.log('📤 Sending command:', jsonCommand);
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
    if (data.type === 'pong') {
      return;
    }
    
    const handlers = this.messageHandlers.get(data.type) || [];
    handlers.forEach(handler => handler(data));
    
    if (handlers.length === 0 && data.type !== 'tick' && data.type !== 'timer') {
      console.log('📨 Unhandled WebSocket message type:', data.type, data);
    }
  }

  requestState() {
    console.log('📤 Requesting state...');
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
    
    console.log('📤 Placing bet:', command);
    return this.sendCommand(command);
  }

  cashout(betId) {
    const command = {
      type: 'cashout'
    };
    
    if (betId) {
      command.bet_id = parseInt(betId);
    }
    
    console.log('📤 Cashing out with command:', command);
    return this.sendCommand(command);
  }

  disconnect() {
    console.log('🔌 Disconnecting WebSocket by user');
    this.shouldReconnect = false;
    this.clearPingInterval();
    this.pendingCommands = [];
    
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
    
    this.isConnected = false;
    this.connectionPromise = null;
    this.messageHandlers.clear();
  }

  isReady() {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
}

export const crashWebSocket = new CrashWebSocket();