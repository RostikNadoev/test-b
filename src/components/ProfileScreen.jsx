import React, { useState, useEffect } from 'react';
import '../styles/ProfileScreen.css';
import { useDemo } from '../contexts/DemoContext';
import { authApi, tonApi } from '../utils/api';
import { tonConnect } from '../utils/tonConnect';

import ava from '../assets/MainPage/ava.jpg';
import tonGift from '../assets/Profile/ton-gift.svg';
import foot from '../assets/MainPage/foot.png';
import footover from '../assets/MainPage/foot-on.svg';
import closeIcon from '../assets/MainPage/close.svg';
import modalCloseIcon from '../assets/Profile/close.svg'; 
import giftchange from '../assets/Profile/giftchange.png';
import gift from '../assets/Profile/gift.png';

export default function ProfileScreen({ onNavigate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [startY, setStartY] = useState(null);
  const [currentY, setCurrentY] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSellAllModalOpen, setIsSellAllModalOpen] = useState(false);
  const [newItems, setNewItems] = useState(new Set());
  const [userData, setUserData] = useState(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [walletInfo, setWalletInfo] = useState(null);
  const [tonBalanceData, setTonBalanceData] = useState(null);
  
  const { 
    isDemoMode, 
    demoInventory, 
    toggleDemoMode,
    removeFromDemoInventory,
    addToDemoBalance,
    clearDemoInventory
  } = useDemo();

  // Загружаем данные пользователя и информацию о кошельке
  useEffect(() => {
    const loadUserDataAndWallet = async () => {
      try {
        setLoading(true);
        
        // Загружаем данные пользователя
        const user = authApi.getCurrentUser();
        setUserData(user);
        
        if (!isDemoMode) {
          // Загружаем баланс TON и статус кошелька
          try {
            const balanceData = await tonApi.getBalance();
            setTonBalanceData(balanceData);
            
            // Если кошелек подключен через TonConnect
            if (balanceData.wallet_connected) {
              const connected = await tonConnect.isConnected();
              if (connected) {
                const wallet = await tonConnect.getWallet();
                setWalletInfo(wallet);
              }
            }
          } catch (error) {
            console.error('Error loading TON balance:', error);
          }
          
          // Загружаем статистику
          await loadUserStats();
        } else {
          // В демо-режиме
          setInventoryCount(demoInventory.length);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserDataAndWallet();
    
    // Слушаем изменения статуса TonConnect
    const handleStatusChange = (wallet) => {
      if (wallet) {
        setWalletInfo(wallet);
        // Обновляем данные о балансе
        tonApi.getBalance().then(data => setTonBalanceData(data));
      } else {
        setWalletInfo(null);
      }
    };
    
    tonConnect.onStatusChange(handleStatusChange);
    
    return () => {
      // Очистка слушателя
    };
  }, [isDemoMode, demoInventory.length]);

  // Функция загрузки статистики
  const loadUserStats = async () => {
    try {
      const api = (await import('../utils/api')).default;
      const response = await api.get('/api/v1/users/stats');
      if (response.data?.stats?.inventory_count !== undefined) {
        setInventoryCount(response.data.stats.inventory_count);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      setInventoryCount(0);
    }
  };

  // Обновление данных пользователя
  const refreshUserData = async () => {
    if (isDemoMode) return;
    
    try {
      const data = await authApi.getMe();
      setUserData(data.user);
      
      // Обновляем данные о кошельке
      try {
        const balanceData = await tonApi.getBalance();
        setTonBalanceData(balanceData);
        
        if (balanceData.wallet_connected) {
          const connected = await tonConnect.isConnected();
          if (connected) {
            const wallet = await tonConnect.getWallet();
            setWalletInfo(wallet);
          }
        }
      } catch (error) {
        console.error('Error updating wallet info:', error);
      }
      
      await loadUserStats();
      
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
    }
  };

  // 🔥 ФУНКЦИЯ ПОДКЛЮЧЕНИЯ КОШЕЛЬКА
  const handleConnectWallet = async () => {
    if (isDemoMode) return;
    
    try {
      await tonConnect.connectWallet();
      
      // Ждем подключения
      setTimeout(async () => {
        const connected = await tonConnect.isConnected();
        if (connected) {
          const wallet = await tonConnect.getWallet();
          setWalletInfo(wallet);
          await refreshUserData();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // 🔥 ФУНКЦИЯ ОТКЛЮЧЕНИЯ КОШЕЛЬКА
  const handleDisconnectWallet = async () => {
    if (isDemoMode) return;
    
    if (!window.confirm('Are you sure you want to disconnect your wallet?')) {
      return;
    }
    
    try {
      await tonConnect.disconnect();
      setWalletInfo(null);
      await refreshUserData();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const calculateTotalValue = () => {
    if (!demoInventory.length) return 0;
    return demoInventory.reduce((total, item) => {
      const priceValue = parseFloat(item.price.replace(/[^\d.-]/g, ''));
      return total + priceValue;
    }, 0);
  };

  const handleSellAll = () => {
    const totalValue = calculateTotalValue();
    addToDemoBalance(totalValue);
    clearDemoInventory();
    setIsSellAllModalOpen(false);
  };

  useEffect(() => {
    if (demoInventory.length > 0) {
      const lastItemIndex = demoInventory.length - 1;
      setNewItems(prev => new Set(prev).add(lastItemIndex));
      
      const timer = setTimeout(() => {
        setNewItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(lastItemIndex);
          return newSet;
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [demoInventory.length]);

  const handleClose = () => {
    onNavigate('main');
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsClosing(false);
  };

  const handleCloseModal = () => {
    setIsClosing(true);
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setIsModalOpen(false);
      setIsClosing(false);
    }
  };

  const handleOpenProfile = () => {
    const username = "bouncegifts";
    const url = `https://t.me/${username}`;
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleItemClick = (item, index) => {
    if (!isDemoMode) return;
    setSelectedItem({ ...item, index });
    setIsSellModalOpen(true);
  };

  const handleSellItem = () => {
    if (selectedItem) {
      const priceValue = parseFloat(selectedItem.price.replace(/[^\d.-]/g, ''));
      addToDemoBalance(priceValue);
      removeFromDemoInventory(selectedItem.index);
      setIsSellModalOpen(false);
      setSelectedItem(null);
    }
  };

  const handleTouchStart = (e) => {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
    setCurrentY(clientY);
  };

  const handleTouchMove = (e) => {
    if (startY === null) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setCurrentY(clientY);
    if (e.cancelable) e.preventDefault();
  };

  const handleTouchEnd = () => {
    if (startY === null || currentY === null) {
      setStartY(null);
      setCurrentY(null);
      return;
    }

    const deltaY = currentY - startY;
    if (deltaY > 60) {
      handleCloseModal();
    }

    setStartY(null);
    setCurrentY(null);
  };

  const getUsername = () => {
    if (!userData) return 'Loading...';
    
    const username = userData.username || userData.name || 'User';
    
    if (isDemoMode) {
      return `[DEMO] ${username}`;
    }
    
    return username;
  };

  const getAvatar = () => {
    if (userData?.photo_url) {
      try {
        new URL(userData.photo_url);
        return userData.photo_url;
      } catch (error) {
        console.warn('Некорректный URL аватара:', userData.photo_url);
        return ava;
      }
    }
    return ava;
  };

  const getUserId = () => {
    if (userData?.id) {
      return userData.id.toString();
    }
    if (userData?.telegram_id) {
      return userData.telegram_id.toString();
    }
    return 'Loading...';
  };

  const getGiftsCount = () => {
    if (isDemoMode) return demoInventory.length;
    return inventoryCount;
  };

  return (
    <div className="profile-screen">
      {/* Основной контент профиля */}
      <div className="profile-header">
        <div className="profile-username">{getUsername()}</div>
        <div className="profile-id">ID: {getUserId()}</div>
      </div>

      <div className="profile-main-row">
        <div className="profile-avatar-container">
          <img 
            src={getAvatar()} 
            alt="User" 
            className="profile-avatar" 
            loading="lazy" 
          />
        </div>

        <div className="gifts-container">
          <div className="gifts-box">
            <img src={tonGift} alt="TON Gift" className="gifts-icon" />
            <span className="gifts-count">
              {getGiftsCount()}
            </span>
          </div>

          <button 
            className="add-button" 
            onClick={handleOpenModal}
            disabled={isDemoMode}
            style={isDemoMode ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            <span className="add-button-text">ADD</span>
          </button>
        </div>
      </div>

      {/* 🔥 Кнопка подключения кошелька - всегда видна, но disabled в демо */}
      <div className="wallet-connect-section">
        {!walletInfo ? (
          <button 
            className="connect-wallet-btn-profile"
            onClick={handleConnectWallet}
            disabled={isDemoMode}
            style={isDemoMode ? { 
              opacity: 0.6, 
              cursor: 'not-allowed',
              background: 'linear-gradient(135deg, #888, #999)'
            } : {}}
          >
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info-section">
            <div className="connected-wallet-info-profile">
              <div className="wallet-status connected">
                <span className="wallet-status-indicator">🟢</span>
                <span className="wallet-name">{walletInfo.name}</span>
              </div>
              <div className="wallet-address">
                {walletInfo.account.address.slice(0, 6)}...{walletInfo.account.address.slice(-4)}
              </div>
              <button 
                className="disconnect-wallet-btn-profile"
                onClick={handleDisconnectWallet}
                disabled={isDemoMode}
                style={isDemoMode ? { 
                  opacity: 0.6, 
                  cursor: 'not-allowed',
                  background: 'linear-gradient(135deg, #888, #999)'
                } : {}}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ряд с тумблером DEMO и кнопкой Refresh */}
      <div className="controls-row">
        <div className="demo-toggle-container">
          <span className={`demo-toggle-label ${isDemoMode ? 'demo-toggle-label--active' : ''}`}>
            DEMO
          </span>
          <div 
            className={`demo-toggle ${isDemoMode ? 'demo-toggle--active' : ''}`}
            onClick={toggleDemoMode}
          >
            <div className="demo-toggle-slider"></div>
          </div>
        </div>

        {/* Кнопка обновления данных - всегда видна, но disabled в демо */}
        <button 
          className="refresh-data-button"
          onClick={refreshUserData}
          disabled={isDemoMode || loading}
          style={isDemoMode ? { 
            opacity: 0.6, 
            cursor: 'not-allowed',
            background: 'linear-gradient(135deg, #888, #999)'
          } : {}}
        >
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <main className="profile-content">
        <div className='gift-balance-container'>
          <span className='gift-balance-title'>GIFT BALANCE:</span>
          {isDemoMode && demoInventory.length > 0 && (
            <button 
              className="sell-all-button"
              onClick={() => setIsSellAllModalOpen(true)}
            >
              SELL ALL
            </button>
          )}
        </div>

        {/* Отображаем инвентарь */}
        {isDemoMode ? (
          demoInventory.length > 0 ? (
            <div className="demo-inventory-container">
              <div className="items-grid">
                {demoInventory.map((item, index) => (
                  <div 
                    key={index} 
                    className={`inventory-item-frame ${newItems.has(index) ? 'new-item-pulse' : ''}`}
                    onClick={() => handleItemClick(item, index)}
                  >
                    <div className="inventory-item-content">
                      <img 
                        src={item.img} 
                        alt={`Item ${index + 1}`} 
                        className="inventory-item-image"
                        loading="lazy"
                      />
                      <div className={`inventory-item-price ${getPriceClass(item.price)}`}>
                        {item.price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='empty-gifts-container'>
              <div className="empty-gifts-animation-wrapper">
                <img
                  src={gift}
                  className="empty-gifts-animation"
                  alt="Empty gifts animation"
                  loading="lazy"
                />
              </div>
              <div className="empty-gifts-text">
                <p className="no-gifts-text">No gifts yet.</p>
                <p className="how-to-add-text" onClick={handleOpenModal}>How to add?</p>
              </div>
            </div>
          )
        ) : (
          <div className="real-inventory-info">
            <div className="empty-gifts-container">
              <div className="empty-gifts-animation-wrapper">
                <img
                  src={gift}
                  className="empty-gifts-animation"
                  alt="Empty gifts animation"
                  loading="lazy"
                />
              </div>
              <div className="empty-gifts-text">
                <p className="no-gifts-text">No gifts yet.</p>
                <p className="how-to-add-text" onClick={handleOpenModal}>How to add?</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="profile-footer">
        <div className="footer-close-container">
          <div className="footer-close-item" onClick={handleClose}>
            <div className="footer-close-indicator"></div>
            <div className="footer-close-wrapper">
              <img src={foot} alt="block" className="footer-close-block" />
              <img src={closeIcon} alt="CLOSE" className="footer-close-icon" />
              <img src={footover} alt="decoration" className="footer-close-overlay" />
            </div>
            <span className="footer-close-label">CLOSE</span>
          </div>
        </div>
      </footer>

      {/* Модальные окна */}
      {isModalOpen && (
        <div className="profile-modal-overlay" onClick={handleCloseModal}>
          <div className="profile-modal-blur-layer"></div>
          <div
            className={`profile-modal-content ${isClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onAnimationEnd={handleAnimationEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
          >
            <img src={giftchange} alt="" className="profile-modal-top-decor" />
            <div className="profile-modal-body">
              <h2 className="profile-modal-title">ADD GIFTS</h2>
              <p className="profile-modal-instruction">
                Send the gift to the&ensp;
                <span 
                  className="profile-modal-username-link"
                  onClick={handleOpenProfile}
                >
                  @bouncegifts
                </span>
                &ensp;bot, and the gift balance will be updated
              </p>
            </div>
            <button className="profile-modal-action-btn" onClick={handleOpenProfile}>
              ADD GIFT
            </button>
            <button className="profile-modal-close-btn" onClick={handleCloseModal}>
              <img src={modalCloseIcon} alt="Close" className="profile-modal-close-icon" />
            </button>
          </div>
        </div>
      )}

      {isSellModalOpen && selectedItem && isDemoMode && (
        <div className="sell-modal-overlay" onClick={() => setIsSellModalOpen(false)}>
          <div className="sell-modal-blur-layer"></div>
          <div 
            className="sell-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sell-item-frame">
              <div className="sell-item-content">
                <img 
                  src={selectedItem.img} 
                  alt="Selected Item" 
                  className="sell-item-image"
                  loading="lazy"
                />
                <div className={`sell-item-price ${getPriceClass(selectedItem.price)}`}>
                  {selectedItem.price}
                </div>
              </div>
            </div>
            <button className="sell-modal-button" onClick={handleSellItem}>
              SELL FOR {selectedItem.price}
            </button>
            <button 
              className="sell-modal-close-btn"
              onClick={() => setIsSellModalOpen(false)}
            >
              <img src={modalCloseIcon} alt="Close" className="sell-modal-close-icon" />
            </button>
          </div>
        </div>
      )}

      {isSellAllModalOpen && isDemoMode && (
        <div className="sell-all-modal-overlay" onClick={() => setIsSellAllModalOpen(false)}>
          <div className="sell-all-modal-blur-layer"></div>
          <div 
            className="sell-all-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="sell-all-modal-title">
              Are you sure you want to sell all for {calculateTotalValue().toFixed(2)} TON?
            </h2>
            <div className="sell-all-modal-buttons">
              <button 
                className="sell-all-cancel-button"
                onClick={() => setIsSellAllModalOpen(false)}
              >
                NO
              </button>
              <button 
                className="sell-all-confirm-button"
                onClick={handleSellAll}
              >
                SELL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getPriceClass = (priceStr) => {
  const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
  if (priceValue >= 501) return 'item-price-gradient-3';
  if (priceValue >= 51) return 'item-price-gradient-2';
  if (priceValue >= 11) return 'item-price-gradient-1';
  return 'item-price';
};