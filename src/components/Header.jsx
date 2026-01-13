import '../styles/Header.css';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { authApi, formatBalance, tonApi, usersApi, starsApi } from '../utils/api';
import { tonConnect } from '../utils/tonConnect';

import ava from '../assets/MainPage/ava.jpg';
import ton from '../assets/MainPage/ton.svg';
import star from '../assets/MainPage/star1.png';
import add_balance from '../assets/MainPage/add_balance.svg';
import modalCloseIcon from '../assets/Profile/close.png';

export default function Header({ onNavigate }) {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [tonBalanceData, setTonBalanceData] = useState(null);
  const [starsBalance, setStarsBalance] = useState(null);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  
  const { isDemoMode, demoBalance } = useDemo();

  // 🔥 НОВЫЕ СОСТОЯНИЯ ДЛЯ ПЕРЕКЛЮЧАТЕЛЯ ВАЛЮТ
  const [activeCurrency, setActiveCurrency] = useState('ton'); // 'ton' или 'stars'
  const [invoiceLink, setInvoiceLink] = useState(null); // Для хранения ссылки на инвойс для stars

  // Флаг для предотвращения автоматического закрытия при подключении
  const shouldAutoCloseRef = useRef(false);

  // Получаем данные пользователя
  const getUsername = useCallback(() => {
    if (!user) return 'Loading...';
    
    if (isDemoMode) {
      return `[DEMO] ${user.username || user.name || 'User'}`;
    }
    
    return user.username || user.name || 'User';
  }, [user, isDemoMode]);

  const getBalance = useCallback(() => {
    if (isDemoMode) return formatBalance(demoBalance);
    if (tonBalanceData?.balance !== undefined) return formatBalance(tonBalanceData.balance);
    if (user?.balance_ton !== undefined) return formatBalance(user.balance_ton);
    return '0.0';
  }, [isDemoMode, demoBalance, tonBalanceData, user]);

  const getStarsBalance = useCallback(() => {
    if (isDemoMode) return '0'; // В демо режиме нет stars
    if (starsBalance !== null) return starsBalance.toString();
    if (user?.balance_stars !== undefined) return user.balance_stars.toString();
    return '0';
  }, [isDemoMode, starsBalance, user]);

  const isWalletConnected = !!walletInfo;
  const walletName = walletInfo?.device?.appName || walletInfo?.name || 'Wallet';

  // Загрузка данных пользователя
  const loadUserData = useCallback(() => {
    const userData = authApi.getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  // Обновление данных пользователя
  const refreshUserData = useCallback(async () => {
    if (isDemoMode) return;
    
    try {
      console.log('🔄 Refreshing user data...');
      const data = await authApi.getMe();
      setUser(data.user);
      
      // Загружаем балансы
      try {
        const balanceData = await usersApi.getBalance();
        if (balanceData.balances) {
          setTonBalanceData({ balance: balanceData.balances.ton });
          setStarsBalance(balanceData.balances.stars || 0);
        }
      } catch (balanceError) {
        console.error('❌ Error loading balances:', balanceError);
        // Если не удалось получить балансы через usersApi, пробуем через tonApi
        const tonBalance = await tonApi.getBalance();
        setTonBalanceData(tonBalance);
      }
      
      console.log('✅ User data refreshed:', data.user);
    } catch (error) {
      console.error('❌ Refresh error:', error);
    }
  }, [isDemoMode]);

  // Проверка статуса кошелька
  const checkWalletStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking wallet status...');
      
      // Загружаем балансы
      if (!isDemoMode) {
        try {
          const balanceData = await usersApi.getBalance();
          if (balanceData.balances) {
            setTonBalanceData({ balance: balanceData.balances.ton });
            setStarsBalance(balanceData.balances.stars || 0);
          }
        } catch (balanceError) {
          console.log('Using tonApi for balance...');
          const balanceData = await tonApi.getBalance();
          setTonBalanceData(balanceData);
        }
      }
      
      const connected = await tonConnect.isConnected();
      if (connected) {
        const wallet = await tonConnect.getWallet();
        console.log('✅ Wallet connected:', wallet?.device?.appName);
        setWalletInfo(wallet);
      } else {
        console.log('ℹ️ Wallet not connected');
        setWalletInfo(null);
      }
    } catch (error) {
      console.log('Wallet check error:', error.message);
    }
  }, [isDemoMode]);

  // 🔥 ОЧИСТКА СОСТОЯНИЯ ПРИ ЗАКРЫТИИ МОДАЛКИ
  const handleOpenBalanceModal = () => {
    if (isDemoMode) {
      alert('Demo mode is active. Connect wallet to use real TON.');
      return;
    }
    
    console.log('Opening balance modal...');
    setIsBalanceModalOpen(true);
    setIsClosing(false);
    setActiveCurrency('ton'); // Сбрасываем к TON при открытии
    setInvoiceLink(null); // Сбрасываем ссылку на инвойс
    
    shouldAutoCloseRef.current = false;
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleCloseBalanceModal = () => {
    console.log('Closing balance modal...');
    setIsClosing(true);
    setTopUpAmount('');
    setInvoiceLink(null); // Сбрасываем ссылку при закрытии
    
    setTimeout(() => { 
      if (isClosing) {
        setIsBalanceModalOpen(false);
        setIsClosing(false);
      }
    }, 300);
  };

// 🔥 ФУНКЦИЯ ДЛЯ STARS: СОЗДАНИЕ ИНВОЙСА (для мини-апп)
const handleCreateStarsInvoice = async () => {
  const amountNum = parseInt(topUpAmount);
  if (isNaN(amountNum) || amountNum <= 0) {
    alert('Пожалуйста, введите целое число звезд');
    return;
  }

  if (isProcessing) return;

  try {
    setIsProcessing(true);
    
    console.log(`💰 Creating invoice for ${amountNum} stars...`);
    const invoiceData = await starsApi.createInvoice(amountNum);
    
    if (!invoiceData.invoice_link) {
      throw new Error('Invoice link not received from server');
    }
    
    console.log('✅ Invoice created:', invoiceData.invoice_link);
    
    // 🔥 Ключевое исправление: используем Telegram WebApp API
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openInvoice) {
      console.log('📱 Using Telegram WebApp.openInvoice()');
      
      // Открываем инвойс через Telegram
      window.Telegram.WebApp.openInvoice(invoiceData.invoice_link, (status) => {
        console.log('💳 Payment status callback:', status);
        
        if (status === 'paid') {
          console.log('✅ Payment successful!');
          setTimeout(() => {
          }, 100);
          
          // Обновляем баланс
          refreshUserData();
          
          // Очищаем поле ввода
          setTopUpAmount('');
          setInvoiceLink(null);
        } else if (status === 'failed' || status === 'cancelled') {
          console.log('❌ Payment failed or cancelled:', status);
          setTimeout(() => {
            alert('Payment was cancelled or failed. Please try again.');
          }, 100);
        } else if (status === 'pending') {
          console.log('⏳ Payment pending');
        }
        
        setIsProcessing(false);
      });
    } else {
      console.log('⚠️ Telegram WebApp not available, using fallback');
      // Fallback для десктопа или других окружений
      window.open(invoiceData.invoice_link, '_blank');
      alert(`Invoice created! Please complete payment in the opened window.\n\nAfter payment, your balance will update automatically.`);
      
      // Очищаем поле ввода
      setTopUpAmount('');
      setInvoiceLink(invoiceData.invoice_link);
      
      // Периодически проверяем обновление баланса
      const checkInterval = setInterval(async () => {
        try {
          const newBalance = await usersApi.getBalance();
          if (newBalance.balances) {
            const currentStars = starsBalance || user?.balance_stars || 0;
            const newStars = newBalance.balances.stars || 0;
            
            if (newStars > currentStars) {
              console.log(`✅ Stars balance updated: ${newStars}`);
              setStarsBalance(newStars);
              setInvoiceLink(null);
              clearInterval(checkInterval);
              alert(`🎉 Payment successful! You received ${newStars - currentStars} stars!`);
            }
          }
        } catch (error) {
          console.log('Checking stars balance...');
        }
      }, 5000);
      
      // Останавливаем проверку через 2 минуты
      setTimeout(() => {
        clearInterval(checkInterval);
        refreshUserData();
      }, 120000);
      
      setIsProcessing(false);
    }
    
  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    alert(`❌ Error creating invoice: ${error.message}`);
    setIsProcessing(false);
  }
};

  // 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ ПОПОЛНЕНИЯ
  const handleTopUp = async () => {
    if (activeCurrency === 'stars') {
      await handleCreateStarsInvoice();
      return;
    }

    // ЛОГИКА ДЛЯ TON (остается как было)
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      
      console.log(`💰 Creating deposit for ${amountNum} TON...`);
      const depositData = await tonApi.createDeposit(amountNum);
      const { to_address, amount, comment } = depositData.ton;
      const depositId = depositData.deposit_id;
      
      console.log('💸 Deposit created:', depositData);
      console.log('📝 Comment for matching:', comment);
      
      const connected = await tonConnect.isConnected();
      if (!connected) {
        throw new Error('Please connect wallet first');
      }
      
      // Конвертируем amount в нанотоны (строку)
      const amountInNano = tonConnect.toNano(amount.toString());
      
      console.log('🔍 Debug info:', {
        amountFromAPI: amount,
        amountType: typeof amount,
        amountInNano: amountInNano,
        amountInNanoType: typeof amountInNano,
        comment: comment,
        commentType: typeof comment
      });
      
      // Пробуем разные варианты:
      
      // Вариант 1: Без payload (самый простой)
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: to_address,
            amount: amountInNano // Просто строка в нанотонах
            // Не добавляем payload - проверим работает ли без него
          }
        ]
      };
      
      console.log('📤 Transaction (without payload):', JSON.stringify(transaction, null, 2));
      
      // Если без payload не работает, попробуем с payload
      let result;
      try {
        console.log('🔄 Trying without payload first...');
        result = await tonConnect.sendTransaction(transaction);
      } catch (error) {
        console.log('❌ Failed without payload, trying with payload...');
        
        // Вариант 2: С payload
        const transactionWithPayload = {
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: to_address,
              amount: amountInNano,
              payload: comment
            }
          ]
        };
        
        console.log('📤 Transaction (with payload):', JSON.stringify(transactionWithPayload, null, 2));
        result = await tonConnect.sendTransaction(transactionWithPayload);
      }
      
      console.log('✅ Transaction result:', result);
      
      // Очищаем поле ввода
      setTopUpAmount('');
      
      // Показываем уведомление
      setTimeout(() => {
        alert(`✅ Transaction sent!\n\nDeposit ID: ${depositId}\nAmount: ${amount} TON\n\nIMPORTANT: If asked for comment, use: ${comment}`);
      }, 100);
      
      // Обновляем данные через 10 секунд
      setTimeout(() => {
        refreshUserData();
        console.log('🔄 Refreshing user data after transaction...');
      }, 10000);
      
    } catch (error) {
      console.error('❌ Top up error:', error);
      
      // Детальная информация об ошибке
      if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
        alert('❌ Transaction cancelled by user');
      } else if (error.message.includes('Not enough balance')) {
        alert('❌ Not enough balance in your wallet');
      } else if (error.message.includes('Invalid amount')) {
        alert('❌ Invalid amount. Please try with a different amount (e.g., 0.5, 1, 2)');
      } else {
        alert(`❌ ${error.message}\n\nPlease try with a different amount or contact support.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Эффект для инициализации
  useEffect(() => {
    console.log('🚀 Header mounted, demo mode:', isDemoMode);
    
    // Загружаем данные пользователя
    loadUserData();
    
    // Проверяем кошелек если не в демо режиме
    if (!isDemoMode) {
      checkWalletStatus();
      
      // Слушаем изменения статуса кошелька
      const unsubscribe = tonConnect.onStatusChange((wallet) => {
        console.log('📡 TonConnect status change:', wallet ? 'CONNECTED' : 'DISCONNECTED');
        
        if (wallet) {
          console.log('🔔 Wallet connected:', wallet);
          setWalletInfo(wallet);
          
          // Обновляем данные пользователя после подключения
          setTimeout(() => {
            refreshUserData();
          }, 1000);
          
          // Закрываем модалку только если флаг установлен
          if (shouldAutoCloseRef.current && isBalanceModalOpen) {
            console.log('Auto-closing balance modal after wallet connection...');
            handleCloseBalanceModal();
            shouldAutoCloseRef.current = false;
          }
        } else {
          console.log('🔔 Wallet disconnected');
          setWalletInfo(null);
          refreshUserData();
        }
      });
      
      return () => {
        console.log('🧹 Cleaning up TonConnect listener');
        unsubscribe();
      };
    }
    
    window.addEventListener('userUpdated', loadUserData);
    
    return () => {
      window.removeEventListener('userUpdated', loadUserData);
    };
  }, [isDemoMode, isBalanceModalOpen, loadUserData, checkWalletStatus, refreshUserData]);

  // Эффект для восстановления walletInfo из localStorage
  useEffect(() => {
    if (!isDemoMode) {
      try {
        const savedWallet = localStorage.getItem('ton_wallet');
        if (savedWallet) {
          const wallet = JSON.parse(savedWallet);
          console.log('🔍 Restored wallet from localStorage:', wallet?.device?.appName);
          setWalletInfo(wallet);
        }
      } catch (error) {
        console.error('Error restoring wallet:', error);
      }
    }
  }, [isDemoMode]);

  // 🔥 ФУНКЦИЯ ПОДКЛЮЧЕНИЯ КОШЕЛЬКА
  const handleConnectWallet = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log('🔄 Opening TonConnect modal...');
      
      shouldAutoCloseRef.current = true;
      handleCloseBalanceModal();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const wallet = await tonConnect.connectWallet();
      
      if (wallet) {
        console.log(`✅ Connected to ${wallet.device?.appName || 'Wallet'}!`);
        await refreshUserData();
        
        setTimeout(() => {
          alert(`✅ Connected to ${wallet.device?.appName || 'Wallet'}!`);
        }, 500);
      }
    } catch (error) {
      console.error('Connection error:', error);
      shouldAutoCloseRef.current = false;
      
      if (!error.message.includes('timeout') && !error.message.includes('cancelled')) {
        alert(`❌ ${error.message}`);
      } else if (error.message.includes('cancelled')) {
        console.log('User cancelled connection');
      }
      
      if (!error.message.includes('cancelled')) {
        setIsBalanceModalOpen(true);
        setIsClosing(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setIsBalanceModalOpen(false);
      setIsClosing(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (!window.confirm(`Disconnect ${walletName}?`)) return;
    
    try {
      await tonConnect.disconnect();
      setWalletInfo(null);
      await refreshUserData();
      alert(`${walletName} disconnected`);
    } catch (error) {
      console.error('Disconnect error:', error);
      alert(`Error disconnecting: ${error.message}`);
    }
  };

  // Обработчик нажатия Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isBalanceModalOpen) {
        handleCloseBalanceModal();
      }
    };

    if (isBalanceModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBalanceModalOpen]);

  return (
    <>
      <header className="header-outer">
        <div className="header-inner">
          <div className="user-info">
            <img 
              src={user?.photo_url || ava} 
              alt="User" 
              className="user-avatar" 
              onClick={() => onNavigate('profile')}
              style={{ cursor: 'pointer' }}
            />
            
            <span 
              className="user-username" 
              onClick={() => onNavigate('profile')}
              style={{ cursor: 'pointer' }}
            >
              {getUsername()}
            </span>

            {/* Контейнер для двух балансов */}
            <div className="balances-container">
              {/* Баланс TON */}
              <div className="balance-container ton-balance">
                <img src={ton} alt="TON" className="balance-icon" />
                <span className="balance-amount">{getBalance()}</span>
              </div>
              
              {/* Баланс Stars */}
              <div className="balance-container stars-balance">
                <div className="star-icon-circle">
                  <img src={star} alt="Stars" className="star-icon" />
                </div>
                <span className="balance-amount">{getStarsBalance()}</span>
              </div>
            </div>

            <div 
              className="add_balance-button" 
              onClick={handleOpenBalanceModal}
              title={isDemoMode ? "Demo mode - Connect wallet for real TON" : "Top up balance"}
              style={{ cursor: 'pointer' }}
            >
              <img src={add_balance} alt="Add balance" className="add_balance-icon" />
            </div>
          </div>
        </div>
      </header>

      {isBalanceModalOpen && !isDemoMode && (
        <div className="balance-modal-overlay" onClick={handleCloseBalanceModal}>
          <div className="balance-modal-blur-layer" />
          
          <div
            ref={modalRef}
            className={`balance-modal-content ${isClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onAnimationEnd={handleAnimationEnd}
          >
            <div className="balance-modal-body">
              
              {/* 🔥 КРАСИВЫЙ ПЕРЕКЛЮЧАТЕЛЬ ВАЛЮТ */}
              <div className="currency-switcher">
                <button 
                  className={`currency-tab ${activeCurrency === 'ton' ? 'active' : ''}`}
                  onClick={() => setActiveCurrency('ton')}
                >
                  <img src={ton} alt="TON" className="currency-icon" />
                  <span>TON</span>
                </button>
                <button 
                  className={`currency-tab ${activeCurrency === 'stars' ? 'active' : ''}`}
                  onClick={() => setActiveCurrency('stars')}
                >
                  <img src={star} alt="Stars" className="currency-icon" />
                  <span>STARS</span>
                </button>
              </div>
              
              {activeCurrency === 'ton' ? (
                // ====== КОНТЕНТ ДЛЯ TON ======
                !isWalletConnected ? (
                  <>
                    <h2 className="balance-modal-title">Connect TON Wallet</h2>
                    <p className="balance-modal-instruction">
                      Connect your wallet to top up balance
                    </p>
                    
                    <button 
                      className="balance-modal-action-btn"
                      onClick={handleConnectWallet}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Opening TonConnect...' : 'Connect Wallet'}
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="balance-modal-title">Top Up TON Balance</h2>
                    <p className="balance-modal-instruction">Enter TON amount</p>
                    
                    <div className="balance-input-container">
                      <input
                        ref={inputRef}
                        type="text"
                        className="balance-input"
                        value={topUpAmount}
                        onChange={(e) => {
                          let val = e.target.value;
                          
                          // Заменяем запятые на точки
                          val = val.replace(/,/g, '.');
                          
                          // Удаляем все символы кроме цифр и точек
                          val = val.replace(/[^\d.]/g, '');
                          
                          // Проверяем чтобы было не больше одной точки
                          if (val.split('.').length <= 2) setTopUpAmount(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && topUpAmount && !isNaN(parseFloat(topUpAmount))) {
                            handleTopUp();
                          }
                          // Также обрабатываем запятую
                          if (e.key === ',') {
                            e.preventDefault();
                            // Вставляем точку вместо запятой
                            const cursorPos = e.target.selectionStart;
                            const currentValue = e.target.value;
                            const newValue = currentValue.substring(0, cursorPos) + '.' + currentValue.substring(cursorPos);
                            setTopUpAmount(newValue);
                            
                            // Устанавливаем курсор после точки
                            setTimeout(() => {
                              e.target.selectionStart = e.target.selectionEnd = cursorPos + 1;
                            }, 0);
                          }
                        }}
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <span className="balance-input-suffix">TON</span>
                    </div>
                    
                    <button 
                      className="balance-modal-action-btn"
                      onClick={handleTopUp}
                      disabled={!topUpAmount || isNaN(parseFloat(topUpAmount)) || isProcessing}
                    >
                      {isProcessing ? 'Processing...' : `Top Up ${topUpAmount || '0'} TON`}
                    </button>
                  </>
                )
              ) : (
                // ====== КОНТЕНТ ДЛЯ STARS ======
                <>
                  <h2 className="balance-modal-title">Top Up STARS Balance</h2>
                  <p className="balance-modal-instruction">Enter STARS amount</p>
                  
                  <div className="balance-input-container">
                    <input
                      ref={inputRef}
                      type="text"
                      className="balance-input"
                      value={topUpAmount}
                      onChange={(e) => {
                        let val = e.target.value;
                        
                        // Разрешаем только целые числа для stars
                        val = val.replace(/[^\d]/g, '');
                        
                        // Удаляем ведущие нули
                        if (val.length > 1 && val.startsWith('0')) {
                          val = val.replace(/^0+/, '');
                        }
                        
                        setTopUpAmount(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && topUpAmount && !isNaN(parseInt(topUpAmount))) {
                          handleTopUp();
                        }
                      }}
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <span className="balance-input-suffix">STARS</span>
                  </div>
                  
                  <button 
                    className="balance-modal-action-btn stars-btn"
                    onClick={handleTopUp}
                    disabled={!topUpAmount || isNaN(parseInt(topUpAmount)) || parseInt(topUpAmount) <= 0 || isProcessing}
                  >
                    {isProcessing ? 'Creating invoice...' : `Top Up ${topUpAmount || '0'} STARS`}
                  </button>
                  
                  {/* 🔥 ССЫЛКА НА ИНВОЙС ЕСЛИ ОНА ЕСТЬ */}
                  {invoiceLink && (
                    <div className="invoice-info">
                      <p>Payment link generated. Click below to pay:</p>
                      <a 
                        href={invoiceLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="invoice-link"
                      >
                        Open Payment Page
                      </a>
                    </div>
                  )}
                </>
              )}
              
            </div>
            
            <button 
              className="balance-modal-close-btn" 
              onClick={handleCloseBalanceModal}
              disabled={isProcessing}
              title="Close"
            >
              <img src={modalCloseIcon} alt="Close" className='balance-modal-close-png' />
            </button>
          </div>
        </div>
      )}
    </>
  );
}