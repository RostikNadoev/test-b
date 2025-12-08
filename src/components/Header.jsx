import '../styles/Header.css';
import { useState, useRef, useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { authApi, formatBalance, tonApi } from '../utils/api';
import { tonConnect } from '../utils/tonConnect';

import ava from '../assets/MainPage/ava.jpg';
import ton from '../assets/MainPage/ton.svg';
import add_balance from '../assets/MainPage/add_balance.svg';
import modalCloseIcon from '../assets/Profile/close.svg';

export default function Header({ onNavigate }) {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [tonBalanceData, setTonBalanceData] = useState(null);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  
  const { isDemoMode, demoBalance } = useDemo();

  useEffect(() => {
    // Загружаем данные пользователя
    const loadUserData = () => {
      const userData = authApi.getCurrentUser();
      if (userData) setUser(userData);
    };

    loadUserData();
    
    // Проверяем кошелек если не в демо режиме
    if (!isDemoMode) {
      checkWalletStatus();
      
      // Слушаем изменения статуса кошелька
      tonConnect.onStatusChange((wallet) => {
        if (wallet) {
          console.log('🔔 Wallet connected:', wallet);
          setWalletInfo(wallet);
          refreshUserData();
          
          // Если модалка была открыта, закрываем ее
          if (isBalanceModalOpen) {
            setTimeout(() => {
              handleCloseBalanceModal();
            }, 500);
          }
        } else {
          console.log('🔔 Wallet disconnected');
          setWalletInfo(null);
          refreshUserData();
        }
      });
    }
    
    window.addEventListener('userUpdated', loadUserData);
    
    return () => {
      window.removeEventListener('userUpdated', loadUserData);
    };
  }, [isDemoMode]);

  const checkWalletStatus = async () => {
    try {
      const balanceData = await tonApi.getBalance();
      setTonBalanceData(balanceData);
      
      const connected = await tonConnect.isConnected();
      if (connected) {
        const wallet = await tonConnect.getWallet();
        setWalletInfo(wallet);
      }
    } catch (error) {
      console.log('Wallet check:', error.message);
    }
  };

  const refreshUserData = async () => {
    if (isDemoMode) return;
    
    try {
      const data = await authApi.getMe();
      setUser(data.user);
      
      const balanceData = await tonApi.getBalance();
      setTonBalanceData(balanceData);
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  // 🔥 ФУНКЦИЯ ПОДКЛЮЧЕНИЯ С ЗАКРЫТИЕМ МОДАЛКИ
  const handleConnectWallet = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log('🔄 Opening TonConnect modal...');
      
      // Закрываем нашу модалку ПЕРЕД открытием TonConnect
      handleCloseBalanceModal();
      
      // Даем время на анимацию закрытия
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Открываем TonConnect модалку
      const wallet = await tonConnect.connectWallet();
      
      if (wallet) {
        setWalletInfo(wallet);
        await refreshUserData();
        // Уведомление можно показывать, но модалка уже закрыта
        console.log(`✅ Connected to ${wallet.device?.appName || 'Wallet'}!`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      
      // Если ошибка не "таймаут" или "отмена", показываем alert
      if (!error.message.includes('timeout') && !error.message.includes('cancelled')) {
        alert(`❌ ${error.message}`);
      }
      
      // Снова открываем нашу модалку при ошибке
      setIsBalanceModalOpen(true);
      setIsClosing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔥 ФУНКЦИЯ ПОПОЛНЕНИЯ
  const handleTopUp = async () => {
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      
      // Создаем депозит
      const depositData = await tonApi.createDeposit(amountNum);
      const { to_address, amount, comment } = depositData.ton;
      
      // Проверяем подключение
      const connected = await tonConnect.isConnected();
      if (!connected) {
        throw new Error('Please connect wallet first');
      }
      
      // Закрываем нашу модалку перед отправкой транзакции
      handleCloseBalanceModal();
      
      // Даем время на анимацию
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Подготавливаем транзакцию
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: to_address,
            amount: tonConnect.toNano(amount),
            payload: comment
          }
        ]
      };
      
      // Отправляем транзакцию
      await tonConnect.sendTransaction(transaction);
      
      // Показываем уведомление (модалка уже закрыта)
      alert('✅ Transaction sent! Please confirm in your wallet.');
      
      // Обновляем данные через 5 секунд
      setTimeout(() => {
        refreshUserData();
      }, 5000);
      
    } catch (error) {
      console.error('Top up error:', error);
      
      // Снова открываем модалку при ошибке
      setIsBalanceModalOpen(true);
      setIsClosing(false);
      
      alert(`❌ ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenBalanceModal = () => {
    if (isDemoMode) return;
    
    setIsBalanceModalOpen(true);
    setIsClosing(false);
    
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const handleCloseBalanceModal = () => {
    setIsClosing(true);
    setTopUpAmount('');
    
    // Не сбрасываем сразу, ждем анимацию
    setTimeout(() => {
      if (isClosing) {
        setIsBalanceModalOpen(false);
        setIsClosing(false);
      }
    }, 300);
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setIsBalanceModalOpen(false);
      setIsClosing(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (!window.confirm('Disconnect wallet?')) return;
    
    try {
      await tonConnect.disconnect();
      setWalletInfo(null);
      await refreshUserData();
      alert('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Получаем данные
  const getUsername = () => {
    if (!user) return 'Loading...';
    
    if (isDemoMode) {
      return `[DEMO] ${user.username || user.name || 'User'}`;
    }
    
    return user.username || user.name || 'User';
  };

  const getBalance = () => {
    if (isDemoMode) return formatBalance(demoBalance);
    if (tonBalanceData?.balance !== undefined) return formatBalance(tonBalanceData.balance);
    if (user?.balance_ton !== undefined) return formatBalance(user.balance_ton);
    return '0.00';
  };

  const isWalletConnected = !!walletInfo;

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
            />
            
            <span className="user-username" onClick={() => onNavigate('profile')}>
              {getUsername()}
            </span>

            <div className="balance-container">
              <img src={ton} alt="TON" className="balance-icon" />
              <span className="balance-amount">{getBalance()}</span>
            </div>

            <div 
              className="add_balance-button" 
              onClick={handleOpenBalanceModal}
              title={isDemoMode ? "Demo mode" : "Top up"}
            >
              <img src={add_balance} alt="add" className="add_balance-icon" />
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
              
              {!isWalletConnected ? (
                // 🔥 ЭКРАН ПОДКЛЮЧЕНИЯ
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
                // 🔥 ЭКРАН ПОПОЛНЕНИЯ
                <>
                  <h2 className="balance-modal-title">Top Up Balance</h2>
                  <p className="balance-modal-instruction">Enter TON amount</p>
                  
                  <div className="balance-input-container">
                    <input
                      ref={inputRef}
                      type="text"
                      className="balance-input"
                      value={topUpAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d.]/g, '');
                        if (val.split('.').length <= 2) setTopUpAmount(val);
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
                    {isProcessing ? 'Processing...' : `Top Up ${topUpAmount || ''} TON`}
                  </button>
                  
                  <div className="wallet-info-display">
                    <p>Connected: <strong>{walletInfo?.device?.appName || 'Wallet'}</strong></p>
                    <button 
                      className="disconnect-btn"
                      onClick={handleDisconnectWallet}
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              )}
              
              <p className="balance-modal-note">
                Balance: <strong>{getBalance()} TON</strong>
              </p>
            </div>
            
            <button className="balance-modal-close-btn" onClick={handleCloseBalanceModal}>
              <img src={modalCloseIcon} alt="Close" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}