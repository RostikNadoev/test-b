import '../styles/Header.css';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';
import { authApi, formatBalance, tonApi, usersApi, starsApi } from '../utils/api';
import { tonConnect } from '../utils/tonConnect';

import ava from '../assets/MainPage/ava.jpg';
import ton from '../assets/MainPage/ton.svg';
import tonBack from '../assets/MainPage/tonblack.svg'; // Импортируем новую иконку
import star from '../assets/MainPage/star1.png';
import add_balance from '../assets/MainPage/add_balance.svg';
import add_balance_black from '../assets/MainPage/add_button_black.svg'; // Импортируем черную иконку
import modalCloseIcon from '../assets/Profile/close.png';

export default function Header({ onNavigate, variant = 'default' }) {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  
  const { isDemoMode, demoBalance } = useDemo();
  const { balances, loadBalances } = useBalance();

  const [activeCurrency, setActiveCurrency] = useState('ton');
  const [invoiceLink, setInvoiceLink] = useState(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressData, setProgressData] = useState({
    games: { current: 10, target: 10 },
    stars: { current: 2400, target: 2500 }
  });
  const shouldAutoCloseRef = useRef(false);

  // Определяем класс для варианта header
  const headerClass = variant === 'cases' || variant === 'plinko' || variant === 'spin'
    ? 'header-outer header-special' 
    : 'header-outer';

  // Определяем какую иконку использовать для кнопки добавления баланса
  const addBalanceIcon = variant === 'cases' || variant === 'plinko' || variant === 'spin'
    ? add_balance_black 
    : add_balance;

  const getUsername = useCallback(() => {
    if (!user) return 'Loading...';
    
    if (isDemoMode) {
      return `[DEMO] ${user.username || user.name || 'User'}`;
    }
    
    return user.username || user.name || 'User';
  }, [user, isDemoMode]);

  const getBalance = useCallback(() => {
    if (isDemoMode) return formatBalance(demoBalance);
    return formatBalance(balances.ton || 0);
  }, [isDemoMode, demoBalance, balances]);

  const getStarsBalance = useCallback(() => {
    if (isDemoMode) return '0';
    
    const starsValue = balances.stars || 0;
    const stringValue = starsValue.toString();
    const integerPart = stringValue.split('.')[0];
    
    return integerPart || '0';
  }, [isDemoMode, balances]);

  const isWalletConnected = !!walletInfo;
  const walletName = walletInfo?.device?.appName || walletInfo?.name || 'Wallet';

  const loadUserData = useCallback(() => {
    const userData = authApi.getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  const refreshUserData = useCallback(async () => {
    if (isDemoMode) return;
    
    try {
      console.log('🔄 Refreshing user data in Header...');
      const data = await authApi.getMe();
      setUser(data.user);
      
      // Загружаем балансы через контекст
      await loadBalances();
      
      console.log('✅ User data refreshed:', data.user);
    } catch (error) {
      console.error('❌ Refresh error:', error);
    }
  }, [isDemoMode, loadBalances]);

  const checkWalletStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking wallet status...');
      
      if (!isDemoMode) {
        await loadBalances();
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
  }, [isDemoMode, loadBalances]);

  const handleOpenBalanceModal = () => {
    if (isDemoMode) {
      alert('Demo mode is active. Connect wallet to use real TON.');
      return;
    }
    
    console.log('Opening balance modal...');
    setIsBalanceModalOpen(true);
    setIsClosing(false);
    setActiveCurrency('ton');
    setInvoiceLink(null);
    
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
    setInvoiceLink(null);
    
    setTimeout(() => { 
      if (isClosing) {
        setIsBalanceModalOpen(false);
        setIsClosing(false);
      }
    }, 300);
  };

  const handleOpenProgressModal = () => {
    setIsProgressModalOpen(true);
  };

  const handleCloseProgressModal = () => {
    setIsProgressModalOpen(false);
  };

  const handleCreateStarsInvoice = async () => {
    const amountNum = parseInt(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid stars amount');
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
      
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openInvoice) {
        console.log('📱 Using Telegram WebApp.openInvoice()');
        
        window.Telegram.WebApp.openInvoice(invoiceData.invoice_link, (status) => {
          console.log('💳 Payment status callback:', status);
          
          if (status === 'paid') {
            console.log('✅ Payment successful!');
            
            // Обновляем баланс
            setTimeout(() => {
              loadBalances();
            }, 1500);
            
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
        window.open(invoiceData.invoice_link, '_blank');
        alert('Invoice created! Please complete payment in the opened window.');
        
        setTopUpAmount('');
        setInvoiceLink(invoiceData.invoice_link);
        
        const checkInterval = setInterval(async () => {
          try {
            await loadBalances();
          } catch (error) {
            console.log('Checking stars balance...');
          }
        }, 5000);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          loadBalances();
        }, 120000);
        
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      alert(`❌ Error creating invoice: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleTopUp = async () => {
    if (activeCurrency === 'stars') {
      await handleCreateStarsInvoice();
      return;
    }

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
      
      const connected = await tonConnect.isConnected();
      if (!connected) {
        throw new Error('Please connect wallet first');
      }
      
      const amountInNano = tonConnect.toNano(amount.toString());
      
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: to_address,
            amount: amountInNano
          }
        ]
      };
      
      let result;
      try {
        result = await tonConnect.sendTransaction(transaction);
      } catch (error) {
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
        result = await tonConnect.sendTransaction(transactionWithPayload);
      }
      
      console.log('✅ Transaction result:', result);
      
      setTopUpAmount('');
      
      setTimeout(() => {
        alert(`✅ Transaction sent!\n\nDeposit ID: ${depositId}\nAmount: ${amount} TON\n\nIMPORTANT: If asked for comment, use: ${comment}`);
      }, 100);
      
      // Обновляем баланс через 10 секунд
      setTimeout(() => {
        loadBalances();
        console.log('🔄 Refreshing user data after transaction...');
      }, 10000);
      
    } catch (error) {
      console.error('❌ Top up error:', error);
      
      if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
        alert('❌ Transaction cancelled by user');
      } else if (error.message.includes('Not enough balance')) {
        alert('❌ Not enough balance in your wallet');
      } else if (error.message.includes('Invalid amount')) {
        alert('❌ Invalid amount. Please try with a different amount');
      } else {
        alert(`❌ ${error.message}\n\nPlease try with a different amount or contact support.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

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

  useEffect(() => {
    console.log('🚀 Header mounted, demo mode:', isDemoMode);
    
    loadUserData();
    
    if (!isDemoMode) {
      checkWalletStatus();
      
      const unsubscribe = tonConnect.onStatusChange((wallet) => {
        console.log('📡 TonConnect status change:', wallet ? 'CONNECTED' : 'DISCONNECTED');
        
        if (wallet) {
          console.log('🔔 Wallet connected:', wallet);
          setWalletInfo(wallet);
          
          setTimeout(() => {
            refreshUserData();
          }, 1000);
          
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
      
      // Слушаем событие обновления баланса
      const handleBalanceUpdate = () => {
        console.log('💰 Balance update event received in Header');
        loadBalances();
      };
      
      window.addEventListener('balanceUpdate', handleBalanceUpdate);
      
      return () => {
        console.log('🧹 Cleaning up listeners');
        unsubscribe();
        window.removeEventListener('balanceUpdate', handleBalanceUpdate);
      };
    }
    
    window.addEventListener('userUpdated', loadUserData);
    
    return () => {
      window.removeEventListener('userUpdated', loadUserData);
    };
  }, [isDemoMode, isBalanceModalOpen, loadUserData, checkWalletStatus, refreshUserData, loadBalances]);

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

  const formatUsername = (username) => {
    if (!username) return '...';
    if (username.length <= 3) return username;
    return username.substring(0, 3) + '...';
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isBalanceModalOpen) {
        handleCloseBalanceModal();
      }
      if (e.key === 'Escape' && isProgressModalOpen) {
        handleCloseProgressModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBalanceModalOpen, isProgressModalOpen]);

  // Загружаем данные о прогрессе (заглушка)
  useEffect(() => {
    if (activeCurrency === 'stars' && isBalanceModalOpen) {
      // Здесь должен быть API запрос для получения данных о прогрессе
      // Для демо используем статические данные
      setProgressData({
        games: { current: 10, target: 10 },
        stars: { current: 2400, target: 2500 }
      });
    }
  }, [activeCurrency, isBalanceModalOpen]);

  return (
    <>
      <header className={headerClass}>
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
            >
              {formatUsername(getUsername())}
            </span>

            <div className="balances-container">
              <div className="balance-container ton-balance">
                <img 
                  src={variant === 'cases' || variant === 'plinko' || variant === 'spin' ? tonBack : ton} 
                  alt="TON" 
                  className="balance-icon" 
                />
                <span className="balance-amount">{getBalance()}</span>
              </div>
              
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
              <img src={addBalanceIcon} alt="Add balance" className="add_balance-icon" />
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
                !isWalletConnected ? (
                  <>
                    <h2 className="balance-modal-titlec">Connect TON Wallet</h2>
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
                    <p className="balance-modal-instruction">Enter amount</p>
                    <div className="balance-input-container">
                      <input
                        ref={inputRef}
                        type="text"
                        className="balance-input"
                        value={topUpAmount}
                        onChange={(e) => {
                          let val = e.target.value;
                          val = val.replace(/,/g, '.');
                          val = val.replace(/[^\d.]/g, '');
                          if (val.split('.').length <= 2) setTopUpAmount(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && topUpAmount && !isNaN(parseFloat(topUpAmount))) {
                            handleTopUp();
                          }
                          if (e.key === ',') {
                            e.preventDefault();
                            const cursorPos = e.target.selectionStart;
                            const currentValue = e.target.value;
                            const newValue = currentValue.substring(0, cursorPos) + '.' + currentValue.substring(cursorPos);
                            setTopUpAmount(newValue);
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
                <>
                  <h2 className="balance-modal-title">Manage STARS Balance</h2>
                  <p className="balance-modal-instruction">Enter amount</p>
                  <div className="balance-input-container">
                    <input
                      ref={inputRef}
                      type="text"
                      className="balance-input"
                      value={topUpAmount}
                      onChange={(e) => {
                        let val = e.target.value;
                        val = val.replace(/[^\d]/g, '');
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
                  </div>

                  <div className="stars-actions">
                    <button
                      className="balance-modal-action-btn stars-btn"
                      onClick={handleTopUp}
                      disabled={!topUpAmount || isNaN(parseInt(topUpAmount)) || parseInt(topUpAmount) <= 0 || isProcessing}
                    >
                      {isProcessing ? 'Creating invoice...' : `Top Up ${topUpAmount || '0'} STARS`}
                    </button>
                    
                    <div className="withdraw-row">
                      <button
                        className="balance-modal-action-btn stars-withdraw-btn"
                        onClick={() => {
                          alert('Withdraw feature coming soon!');
                        }}
                        disabled={!topUpAmount || isNaN(parseInt(topUpAmount)) || parseInt(topUpAmount) <= 0 || isProcessing}
                      >
                        Withdraw {topUpAmount || '0'} STARS
                      </button>
                      
                      <button
                        className="info-button"
                        onClick={handleOpenProgressModal}
                        title="View progress requirements"
                      >
                        ?
                      </button>
                    </div>
                  </div>

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
              <img src={modalCloseIcon} alt="Close" className="balance-modal-close-png" />
            </button>
          </div>
        </div>
      )}

      {isProgressModalOpen && (
        <div className="progress-modal-overlay" onClick={handleCloseProgressModal}>
          <div className="progress-modal-blur-layer" />
          <div
            className="progress-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="progress-modal-header">
              <h3 className="progress-modal-title">
                To unlock stars withdraw you need:
              </h3>
              <button
                className="progress-modal-close-btn"
                onClick={handleCloseProgressModal}
              >
                <img src={modalCloseIcon} alt="Close" className="progress-modal-close-icon" />
              </button>
            </div>
            
            <div className="progress-tasks-container">
              {/* Task 1: Play games */}
              <div className="progress-task">
                <div className="task-header">
                  <div className="task-name-container">
                    <span className="task-name">Play any 10 games</span>
                  </div>
                  <div className="task-count">
                    {progressData.games.current}/{progressData.games.target}
                    {progressData.games.current >= progressData.games.target && (
                      <span className="task-complete">✓</span>
                    )}
                  </div>
                </div>
                <div className="progress-container">
                  <div 
                    className="progress-bar"
                    style={{ 
                      width: `${(progressData.games.current / progressData.games.target) * 100}%` 
                    }}
                  >
                    <div className="progress-shimmer"></div>
                  </div>
                </div>
              </div>
              
              {/* Task 2: Place stars */}
              <div className="progress-task">
                <div className="task-header">
                  <div className="task-name-container">
                    <span className="task-name-place">
                      Place 2500 
                      <img src={star} alt="Stars" className="task-icon-stars" />
                    </span>
                  </div>
                  <div className="task-count">
                    {progressData.stars.current.toLocaleString()}/{progressData.stars.target.toLocaleString()}
                    {progressData.stars.current >= progressData.stars.target && (
                      <span className="task-complete">✓</span>
                    )}
                  </div>
                </div>
                <div className="progress-container">
                  <div 
                    className="progress-bar"
                    style={{ 
                      width: `${(progressData.stars.current / progressData.stars.target) * 100}%` 
                    }}
                  >
                    <div className="progress-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}