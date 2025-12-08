// tonConnect.js - единственный источник TonConnectUI
class TonConnectService {
  constructor() {
    this.tonConnectUI = null;
    this.buttonRootId = 'ton-connect-button';
    this.isInitializing = false;
  }

  async init(options = {}) {
    if (this.tonConnectUI) return this.tonConnectUI;
    if (this.isInitializing) {
      // Ждем завершения инициализации
      return new Promise(resolve => {
        const check = () => {
          if (this.tonConnectUI) {
            resolve(this.tonConnectUI);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }

    this.isInitializing = true;
    
    try {
      const { TonConnectUI } = await import('@tonconnect/ui');
      
      // Конфигурация
      const config = {
        manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
        language: 'en',
        uiPreferences: {
          theme: 'DARK',
          borderRadius: 's'
        },
        ...options
      };

      // Если передан rootId для кнопки, добавляем его
      if (options.buttonRootId) {
        config.buttonRootId = options.buttonRootId;
      }

      console.log('🎯 Initializing TonConnectUI with config:', config);
      
      this.tonConnectUI = new TonConnectUI(config);

      // Ждем восстановления соединения
      await this.tonConnectUI.connectionRestored;
      
      console.log('✅ TonConnectUI initialized, connected:', this.tonConnectUI.connected);
      
      return this.tonConnectUI;
    } catch (error) {
      console.error('❌ TonConnectUI initialization failed:', error);
      this.isInitializing = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async getUI(buttonRootId) {
    if (!this.tonConnectUI) {
      await this.init({ buttonRootId });
    } else if (buttonRootId && !this.tonConnectUI.uiOptions.buttonRootId) {
      // Если UI уже инициализирован, но нужно добавить кнопку
      this.tonConnectUI.uiOptions.buttonRootId = buttonRootId;
      this.tonConnectUI.render();
    }
    return this.tonConnectUI;
  }

  async isConnected() {
    try {
      const ui = await this.getUI();
      return ui.connected;
    } catch (error) {
      console.error('isConnected error:', error);
      return false;
    }
  }

  async getWallet() {
    try {
      const ui = await this.getUI();
      return ui.wallet;
    } catch (error) {
      console.error('getWallet error:', error);
      return null;
    }
  }

  async connectWallet() {
    try {
      const ui = await this.getUI();
      
      console.log('🔗 Opening connection modal...');
      ui.openModal();
      
      // Ждем подключения
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 60000);

        const unsubscribe = ui.onStatusChange((wallet) => {
          if (wallet) {
            clearTimeout(timeout);
            unsubscribe();
            console.log('✅ Wallet connected via modal:', wallet);
            resolve(wallet);
          }
        });
      });
    } catch (error) {
      console.error('connectWallet error:', error);
      throw error;
    }
  }

  // Альтернатива: ручное подключение через кнопку
  renderButton(buttonRootId = 'ton-connect-button') {
    this.getUI(buttonRootId).then(ui => {
      // Кнопка автоматически рендерится
      console.log('🔄 Rendering TonConnect button...');
    });
    
    return buttonRootId;
  }

  async sendTransaction(transaction) {
    try {
      const ui = await this.getUI();
      
      if (!ui.connected) {
        throw new Error('Wallet not connected');
      }

      console.log('📤 Sending transaction:', transaction);
      const result = await ui.sendTransaction(transaction);
      console.log('✅ Transaction sent:', result);
      return result;
    } catch (error) {
      console.error('sendTransaction error:', error);
      if (error.message.includes('User rejected')) {
        throw new Error('Transaction cancelled');
      }
      throw error;
    }
  }

  async disconnect() {
    try {
      const ui = await this.getUI();
      if (ui.connected) {
        await ui.disconnect();
        console.log('✅ Wallet disconnected');
        return true;
      }
      return false;
    } catch (error) {
      console.error('disconnect error:', error);
      throw error;
    }
  }

  onStatusChange(callback) {
    this.getUI().then(ui => {
      ui.onStatusChange(callback);
    });
  }

  toNano(amount) {
    try {
      return Math.floor(parseFloat(amount) * 1000000000).toString();
    } catch (error) {
      console.error('toNano error:', error);
      return '0';
    }
  }

  // Очистка
  cleanup() {
    if (this.tonConnectUI) {
      this.tonConnectUI = null;
    }
  }
}

export const tonConnect = new TonConnectService();