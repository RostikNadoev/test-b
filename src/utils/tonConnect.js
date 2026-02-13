// tonConnect.js - исправленная версия с правильным форматом payload
class TonConnectService {
  constructor() {
    this.tonConnectUI = null;
    this.buttonRootId = 'ton-connect-button';
    this.isInitializing = false;
    this.statusChangeCallbacks = [];
  }

  async init(options = {}) {
    if (this.tonConnectUI) return this.tonConnectUI;
    if (this.isInitializing) {
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
      
      const config = {
        manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
        language: 'en',
        uiPreferences: {
          theme: 'DARK',
          borderRadius: 's'
        },
        ...options
      };

      if (options.buttonRootId) {
        config.buttonRootId = options.buttonRootId;
      }

      console.log('🎯 Initializing TonConnectUI');
      
      this.tonConnectUI = new TonConnectUI(config);

      this.tonConnectUI.onStatusChange((wallet) => {
        console.log('🔄 TonConnectUI status changed:', wallet ? 'Connected' : 'Disconnected');
        
        if (wallet) {
          localStorage.setItem('ton_wallet', JSON.stringify(wallet));
        } else {
          localStorage.removeItem('ton_wallet');
        }
        
        this.statusChangeCallbacks.forEach(callback => callback(wallet));
        window.dispatchEvent(new CustomEvent('tonWalletStatusChanged', { detail: wallet }));
      });

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
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout (60 seconds)'));
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
      
      if (error.message.includes('cancelled') || error.message.includes('rejected')) {
        throw new Error('Connection cancelled by user');
      }
      
      throw error;
    }
  }

  renderButton(buttonRootId = 'ton-connect-button') {
    this.getUI(buttonRootId).then(ui => {
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

      console.log('📤 Preparing transaction...');
      
      // Проверяем формат amount - должен быть строкой
      const formattedMessages = transaction.messages.map((msg, index) => {
        const message = {
          address: msg.address,
          amount: msg.amount.toString() // Важно: строка!
        };
        
        // Логируем для отладки
        console.log(`📝 Message ${index}:`, {
          address: message.address,
          amount: message.amount,
          amountType: typeof message.amount
        });
        
        // Пробуем разные форматы payload
        if (msg.payload && typeof msg.payload === 'string' && msg.payload.trim() !== '') {
          try {
            const comment = msg.payload;
            console.log(`💬 Comment to send: "${comment}"`);
            
            // Способ 1: Просто текст (может работать с некоторыми кошельками)
            // message.payload = comment;
            
            // Способ 2: Специальный объект для текстового комментария
            message.payload = {
              type: 'comment',
              text: comment
            };
            
            console.log(`📝 Using comment payload:`, message.payload);
          } catch (error) {
            console.error('❌ Error creating payload:', error);
            console.log('⚠️ Sending without payload');
          }
        }
        
        return message;
      });
      
      const formattedTransaction = {
        validUntil: transaction.validUntil || Math.floor(Date.now() / 1000) + 600,
        messages: formattedMessages
      };
      
      console.log('🚀 Final transaction:', JSON.stringify(formattedTransaction, null, 2));
      
      const result = await ui.sendTransaction(formattedTransaction);
      
      console.log('✅ Transaction sent successfully');
      return result;
    } catch (error) {
      console.error('❌ sendTransaction error:', error);
      
      // Детальный анализ ошибки
      let errorMessage = 'Transaction failed';
      
      if (error.message) {
        console.error('Full error:', error);
        
        if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('Not enough balance')) {
          errorMessage = 'Not enough balance in wallet';
        } else if (error.message.includes('Invalid amount') || error.message.includes('amount')) {
          errorMessage = 'Invalid amount format. Amount must be a string in nanoTON';
        } else if (error.message.includes('payload')) {
          errorMessage = 'Invalid payload format';
        } else {
          errorMessage = `Transaction error: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Конвертация TON в нанотоны (строка)
  toNano(amount) {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum)) {
        throw new Error('Invalid amount');
      }
      
      // 1 TON = 1,000,000,000 нанотонов
      const nano = (amountNum * 1000000000).toFixed(0); // Без дробной части
      
      console.log(`💰 Converted ${amount} TON to ${nano} nanoTON`);
      
      // Проверяем, что сумма не слишком мала
      const nanoNum = BigInt(nano);
      if (nanoNum < 1000000n) { // Минимум 0.001 TON
        console.warn('⚠️ Amount is very small:', amount, 'TON');
      }
      
      return nano;
    } catch (error) {
      console.error('toNano error:', error);
      return '0';
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
    this.statusChangeCallbacks.push(callback);
    
    this.getUI().then(ui => {
      if (ui.connected && ui.wallet) {
        callback(ui.wallet);
      }
    });
    
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusChangeCallbacks.splice(index, 1);
      }
    };
  }

  cleanup() {
    if (this.tonConnectUI) {
      this.tonConnectUI = null;
    }
    this.statusChangeCallbacks = [];
  }
}

export const tonConnect = new TonConnectService();