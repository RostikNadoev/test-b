import React, { useState, useEffect } from 'react';
import '../styles/ProfileScreen.css';
import { useDemo } from '../contexts/DemoContext';
import { authApi, usersApi, giftsApi, starsApi } from '../utils/api';
import { tonConnect } from '../utils/tonConnect';

import ava from '../assets/MainPage/ava.jpg';
import tonGift from '../assets/Profile/ton-gift.svg';
import modalCloseIcon from '../assets/Profile/close.png'; 
import giftchange from '../assets/Profile/giftchange.png';
import gift from '../assets/Profile/gift.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import starIcon from '../assets/MainPage/star1.png';

export default function ProfileScreen({ onNavigate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [startY, setStartY] = useState(null);
  const [currentY, setCurrentY] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSellAllModalOpen, setIsSellAllModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [newItems, setNewItems] = useState(new Set());
  const [userData, setUserData] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sellingItem, setSellingItem] = useState(false);
  const [sellingAll, setSellingAll] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState(null);
  const [starsBalance, setStarsBalance] = useState(0);
  const [checkingBalance, setCheckingBalance] = useState(false);
  
  const { 
    isDemoMode, 
    demoInventory, 
    toggleDemoMode,
    removeFromDemoInventory,
    addToDemoBalance,
    clearDemoInventory
  } = useDemo();

  useEffect(() => {
    const checkWalletStatus = async () => {
      if (!isDemoMode) {
        try {
          const connected = await tonConnect.isConnected();
          if (connected) {
            const wallet = await tonConnect.getWallet();
            setWalletInfo(wallet);
          } else {
            setWalletInfo(null);
          }
        } catch (error) {
          console.error('Error checking wallet status:', error);
        }
      }
    };

    checkWalletStatus();

    const unsubscribe = tonConnect.onStatusChange((wallet) => {
      setWalletInfo(wallet);
    });

    return () => {
      unsubscribe();
    };
  }, [isDemoMode]);

  useEffect(() => {
    loadUserData();
  }, [isDemoMode]);

  // Загружаем баланс звезд при открытии модалки вывода
  useEffect(() => {
    if (isWithdrawModalOpen && !isDemoMode && selectedItem) {
      loadStarsBalance();
      
      // Проверяем, есть ли у выбранного предмета статус withdraw_pending
      if (selectedItem.status === 'withdraw_pending' && selectedItem.locked_until) {
        setWithdrawResult({
          locked_until: selectedItem.locked_until,
          withdraw_req_id: selectedItem.withdraw_req_id
        });
      } else {
        setWithdrawResult(null);
      }
    }
  }, [isWithdrawModalOpen, selectedItem, isDemoMode]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      const user = authApi.getCurrentUser();
      setUserData(user);
      
      if (!isDemoMode) {
        try {
          const inventoryData = await usersApi.getInventory();
          
          let items = [];
          
          if (Array.isArray(inventoryData)) {
            items = inventoryData;
          } else if (inventoryData && Array.isArray(inventoryData.inventory)) {
            items = inventoryData.inventory;
          } else if (inventoryData && Array.isArray(inventoryData.items)) {
            items = inventoryData.items;
          }
          
          setInventory(items);
          
          try {
            const balanceData = await usersApi.getBalance();
            if (balanceData && balanceData.balances) {
              authApi.updateUserData({
                balance_ton: balanceData.balances.ton || 0,
                balance_stars: balanceData.balances.stars || 0
              });
              setStarsBalance(balanceData.balances.stars || 0);
            }
          } catch (balanceError) {
            console.error('Ошибка загрузки баланса:', balanceError);
          }
        } catch (error) {
          console.error('Ошибка загрузки инвентаря:', error);
          setInventory([]);
        }
      } else {
        setInventory(demoInventory);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStarsBalance = async () => {
    if (isDemoMode) return;
    
    try {
      setCheckingBalance(true);
      const balanceData = await usersApi.getBalance();
      if (balanceData && balanceData.balances) {
        setStarsBalance(balanceData.balances.stars || 0);
        authApi.updateUserData({
          balance_stars: balanceData.balances.stars || 0
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки баланса звезд:', error);
    } finally {
      setCheckingBalance(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || imagePath.trim() === '') return cardton1;
    
    if (imagePath.startsWith('/static/')) {
      const baseUrl = 'https://shamefully-gifted-catbird.cloudpub.ru';
      return `${baseUrl}${imagePath}`;
    }
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    return cardton1;
  };

  const getItemImage = (item) => {
    if (isDemoMode) {
      return item.img || cardton1;
    } else {
      if (item.item_type === 'tg_gift' && item.image_url) {
        return getImageUrl(item.image_url);
      } else if (item.item_type === 'reward_ton') {
        return cardton1;
      } else if (item.image_url) {
        return getImageUrl(item.image_url);
      }
      
      return cardton1;
    }
  };

  const getItemPrice = (item) => {
    if (isDemoMode) {
      return item.price || '0 TON';
    } else {
      if (item.item_type === 'tg_gift') {
        return `${item.price_ton || 0} TON`;
      } else if (item.item_type === 'reward_ton') {
        return `${item.price_ton || 0} TON`;
      }
      return '0 TON';
    }
  };

  const getPriceClass = (priceStr) => {
    if (!priceStr) return 'item-price';
    const priceValue = parseFloat(priceStr.toString().replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'item-price-gradient-3';
    if (priceValue >= 51) return 'item-price-gradient-2';
    if (priceValue >= 11) return 'item-price-gradient-1';
    return 'item-price';
  };

  // Функция для получения отсортированного инвентаря
  const getSortedInventory = () => {
    const items = isDemoMode ? demoInventory : inventory;
    
    return [...items].sort((a, b) => {
      const priceA = parseFloat(getItemPrice(a).replace(/[^\d.-]/g, ''));
      const priceB = parseFloat(getItemPrice(b).replace(/[^\d.-]/g, ''));
      return priceB - priceA; // По убыванию (сначала дорогие)
    });
  };

  const handleSellItemApi = async (item) => {
    try {
      setSellingItem(true);
      
      if (item.item_type !== 'tg_gift') {
        alert('This item cannot be sold');
        return false;
      }
      
      const inventoryId = item.inventory_id || item.id;
      if (!inventoryId) {
        alert('Error: Missing item ID');
        return false;
      }
      
      const result = await giftsApi.sellGiftForTon(inventoryId);
      
      if (result.success) {
        if (result.balance_ton !== undefined) {
          const user = authApi.getCurrentUser();
          if (user) {
            authApi.updateUserData({
              balance_ton: result.balance_ton
            });
          }
        }
        
        setInventory(prev => prev.filter(i => 
          (i.inventory_id || i.id) !== inventoryId
        ));
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('❌ Error selling item:', error);
      
      let errorMessage = 'Error selling item. Please try again.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      alert(errorMessage);
      return false;
    } finally {
      setSellingItem(false);
    }
  };

  const handleSellAllApi = async () => {
    try {
      setSellingAll(true);
      
      const giftsToSell = inventory.filter(item => 
        item.item_type === 'tg_gift'
      );
      
      if (giftsToSell.length === 0) {
        alert('No items to sell');
        return;
      }
      
      let totalSold = 0;
      let totalPrice = 0;
      
      for (const item of giftsToSell) {
        try {
          const inventoryId = item.inventory_id || item.id;
          if (!inventoryId) continue;
          
          const result = await giftsApi.sellGiftForTon(inventoryId);
          
          if (result.success) {
            totalSold++;
            totalPrice += parseFloat(result.sell_ton || item.price_ton || 0);
            
            if (result.balance_ton !== undefined) {
              const user = authApi.getCurrentUser();
              if (user) {
                authApi.updateUserData({
                  balance_ton: result.balance_ton
                });
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error selling item ${item.id}:`, error);
        }
      }
      
      setInventory(prev => prev.filter(item => 
        item.item_type !== 'tg_gift'
      ));
      
    } catch (error) {
      console.error('❌ Error in mass sell:', error);
    } finally {
      setSellingAll(false);
      setIsSellAllModalOpen(false);
    }
  };

  const calculateTotalValue = () => {
    const items = isDemoMode ? demoInventory : inventory;
    
    if (isDemoMode) {
      if (!items.length) return 0;
      return items.reduce((total, item) => {
        const priceValue = parseFloat(item.price?.replace(/[^\d.-]/g, '') || '0');
        return total + priceValue;
      }, 0);
    } else {
      if (!items.length) return 0;
      return items.reduce((total, item) => {
        if (item.item_type === 'tg_gift') {
          return total + (item.price_ton || 0);
        }
        return total;
      }, 0);
    }
  };

  const handleSellAll = async () => {
    if (isDemoMode) {
      const totalValue = calculateTotalValue();
      addToDemoBalance(totalValue);
      clearDemoInventory();
      setInventory([]);
      setIsSellAllModalOpen(false);
    } else {
      await handleSellAllApi();
    }
  };

  const handleOpenWithdraw = () => {
    if (isDemoMode) {
      alert('Withdraw is not available in demo mode');
      return;
    }
    
    setWithdrawResult(null);
    setIsSellModalOpen(false);
    setIsWithdrawModalOpen(true);
  };

  const handleWithdraw = async () => {
    if (isDemoMode || !selectedItem) return;
    
    // Если предмет уже в статусе withdraw_pending, ничего не делаем
    if (selectedItem.status === 'withdraw_pending') {
      alert('This item is already pending withdrawal');
      setWithdrawing(false);
      return;
    }
    
    try {
      setWithdrawing(true);
      
      // 1. Получаем inventory_id
      const inventoryId = selectedItem.inventory_id || selectedItem.id;
      if (!inventoryId) {
        alert('❌ Error: Missing item ID');
        setWithdrawing(false);
        return;
      }
      
      console.log(`🎮 Starting withdrawal for item ${inventoryId}...`);
      
      // 2. Вызываем API для вывода
      const result = await giftsApi.withdrawItem(inventoryId);
      
      // 3. Проверяем, нужно ли пополнить баланс
      if (result.need_topup) {
        console.log('💰 Need to top up stars:', result);
        
        // Открываем invoice для пополнения
        if (result.invoice_link) {
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(result.invoice_link);
          } else {
            window.open(result.invoice_link, '_blank');
          }
          
          // Показываем сообщение о необходимости пополнить баланс
          alert(`⚠️ Insufficient Stars balance!\n\nNeed: ${result.topup_amount} Stars\nFee: ${result.withdraw_fee} Stars\n\nPlease complete the payment in Telegram to continue.`);
        } else {
          alert(`⚠️ Insufficient Stars balance! Need ${result.topup_amount || 50} Stars.`);
        }
        
        setWithdrawing(false);
        return;
      }
      
      // 4. Если вывод успешен (вариант B - Stars хватает)
      if (result.ok || result.mode === 'manual') {
        console.log('✅ Withdrawal successful:', result);
        
        // Сохраняем результат для отображения
        setWithdrawResult(result);
        
        // Обновляем баланс звезд если он вернулся в ответе
        if (result.balance_stars !== undefined) {
          authApi.updateUserData({
            balance_stars: result.balance_stars
          });
          setStarsBalance(result.balance_stars);
        }
        
        // Обновляем инвентарь через API
        await loadUserData();
        
        // Показываем сообщение об успехе
        alert('✅ Withdrawal request created successfully!\n\nThe item will be withdrawn within 24 hours.');
        
        // Обновляем выбранный предмет с новым статусом
        const updatedItem = {
          ...selectedItem,
          status: 'withdraw_pending',
          locked_until: result.locked_until,
          withdraw_req_id: result.withdraw_req_id
        };
        setSelectedItem(updatedItem);
      } else {
        alert(`❌ Error: ${result.message || 'Failed to withdraw item'}`);
      }
      
    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      
      let errorMessage = 'Error withdrawing item. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setWithdrawing(false);
    }
  };

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

  const handleItemClick = (item, index) => {
    // Всегда можно нажать на предмет, независимо от статуса
    setSelectedItem({ ...item, originalIndex: index });
    setIsSellModalOpen(true);
  };

  const handleSellItem = async () => {
    if (selectedItem) {
      if (isDemoMode) {
        const priceValue = parseFloat(selectedItem.price?.replace(/[^\d.-]/g, '') || '0');
        addToDemoBalance(priceValue);
        removeFromDemoInventory(selectedItem.originalIndex);
        
        setInventory(prev => prev.filter((_, i) => i !== selectedItem.originalIndex));
        
      } else {
        await handleSellItemApi(selectedItem);
      }
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
        console.warn('Invalid avatar URL:', userData.photo_url);
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
    if (isDemoMode) {
      return demoInventory.length;
    } else {
      return inventory.filter(item => item.item_type === 'tg_gift').length;
    }
  };

  const getUserStars = () => {
    return starsBalance;
  };

  const openTelegramBot = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink('https://t.me/bouncegifts');
    } else {
      window.open('https://t.me/bouncegifts', '_blank');
    }
  };

  const handleConnectWallet = async () => {
    if (isWalletConnecting || isDemoMode) return;
    
    try {
      setIsWalletConnecting(true);
      setIsSellModalOpen(false);
      setIsSellAllModalOpen(false);
      
      const wallet = await tonConnect.connectWallet();
      
      if (wallet) {
        setWalletInfo(wallet);
        alert(`Connected to ${wallet.device?.appName || 'Wallet'}!`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      if (!error.message.includes('cancelled')) {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (!window.confirm('Disconnect wallet?')) return;
    
    try {
      await tonConnect.disconnect();
      setWalletInfo(null);
      alert('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const formatWalletAddress = (address) => {
    if (!address) return '';
    if (address.length <= 9) return address;
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  const refreshUserData = async () => {
    try {
      setRefreshing(true);
      await loadUserData();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  const canSellItem = (item) => {
    if (isDemoMode) return true;
    
    return item.item_type === 'tg_gift' && item.status !== 'withdraw_pending';
  };

  const getItemsToDisplay = () => {
    return getSortedInventory();
  };

  // Форматирование locked_until для отображения
  const formatLockedUntil = (lockedUntil) => {
    if (!lockedUntil) return '';
    
    const date = new Date(lockedUntil);
    const now = new Date();
    const diffMs = date - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m`;
    } else if (diffMins > 0) {
      return `${diffMins}m`;
    } else {
      return 'Expired';
    }
  };

  // Проверяем, есть ли у выбранного предмета активный вывод
  const hasActiveWithdraw = () => {
    return selectedItem?.status === 'withdraw_pending' || withdrawResult !== null;
  };

  return (
    <div className="profile-screen">
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
        
        {!isDemoMode && (
          <button 
            className="refresh-data-button"
            onClick={refreshUserData}
            disabled={refreshing}
          >
            {refreshing ? 'Loading...' : '↻ Refresh'}
          </button>
        )}
      </div>

      <div className="wallet-connect-section">
        {!isDemoMode ? (
          walletInfo ? (
            <div className="wallet-info-section">
              <div className="connected-wallet-info-profile">
                <div className="wallet-status connected">
                  <span className="wallet-name">
                    {walletInfo.device?.appName || walletInfo.name || 'Wallet'}
                  </span>
                </div>
                <div className="wallet-address">
                  {formatWalletAddress(walletInfo.account?.address || '')}
                </div>
                <button 
                  className="disconnect-wallet-btn-profile"
                  onClick={handleDisconnectWallet}
                  disabled={isWalletConnecting}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="connect-wallet-btn-profile"
              onClick={handleConnectWallet}
              disabled={isWalletConnecting}
            >
              {isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )
        ) : (
          <div className="wallet-info-section">
            <div className="connected-wallet-info-profile">
              <div className="wallet-address" style={{ opacity: 0.6 }}>
                Disable Demo to connect wallet
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="profile-content">
        <div className='gift-balance-container'>
          <span className='gift-balance-title'>GIFT BALANCE:</span>
          {getItemsToDisplay().length > 0 && (
            <button 
              className="sell-all-button"
              onClick={() => setIsSellAllModalOpen(true)}
              disabled={sellingAll}
            >
              {sellingAll ? 'SELLING...' : 'SELL ALL'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-inventory">
            <div className="spinner"></div>
            <p>Loading inventory...</p>
          </div>
        ) : getItemsToDisplay().length > 0 ? (
          <div className="inventory-container">
            <div className="items-grid">
              {getItemsToDisplay().map((item, index) => (
                <div 
                  key={index} 
                  className={`inventory-item-frame ${newItems.has(index) ? 'new-item-pulse' : ''}`}
                  onClick={() => handleItemClick(item, index)}
                  title={item.status === 'withdraw_pending' ? 'Item is pending withdrawal (click to view)' : 'Click to sell/withdraw'}
                >
                  <div className="inventory-item-content">
                    <div className="inventory-item-image-wrapper">
                      <img 
                        src={getItemImage(item)} 
                        alt={item.name || 'Item'} 
                        className="inventory-item-image"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Failed to load image:', item);
                          e.target.src = cardton1;
                        }}
                      />
                    </div>
                    <div className={`inventory-item-price ${getPriceClass(getItemPrice(item))}`}>
                      {getItemPrice(item)}
                    </div>
                    {item.name && (
                      <div className="inventory-item-name">
                        {item.name}
                      </div>
                    )}
                    {/* Отображаем статус, если есть */}
                    {item.status === 'withdraw_pending' && (
                      <div className="inventory-item-status pending">
                        PENDING
                      </div>
                    )}
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
        )}
      </main>

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
                  onClick={openTelegramBot}
                >
                  @bouncegifts
                </span>
                &ensp;bot, and the gift balance will be updated
              </p>
            </div>
            <button 
              className="profile-modal-action-btn"
              onClick={openTelegramBot}
            >
              ADD GIFT
            </button>
            <button className="profile-modal-close-btn" onClick={handleCloseModal}>
              <img src={modalCloseIcon} alt="Close" className="profile-modal-close-icon" />
            </button>
          </div>
        </div>
      )}

      {isSellModalOpen && selectedItem && (
        <div className="sell-modal-overlay" onClick={() => setIsSellModalOpen(false)}>
          <div className="sell-modal-blur-layer"></div>
          <div 
            className="sell-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sell-item-frame">
              <div className="sell-item-content">
                <img 
                  src={getItemImage(selectedItem)} 
                  alt={selectedItem.name || 'Item'} 
                  className="sell-item-image"
                  onError={(e) => {
                    e.target.src = cardton1;
                  }}
                />
                <div className={`sell-item-price ${getPriceClass(getItemPrice(selectedItem))}`}>
                  {getItemPrice(selectedItem)}
                </div>
              </div>
            </div>
            
            <button 
              className={`sell-modal-button ${!canSellItem(selectedItem) ? 'sell-modal-button--disabled' : ''}`}
              onClick={handleSellItem}
              disabled={sellingItem || !canSellItem(selectedItem)}
              style={!canSellItem(selectedItem) ? { opacity: 0.5, pointerEvents: 'none' } : {}}
            >
              {sellingItem ? 'PROCESSING...' : `SELL FOR ${getItemPrice(selectedItem)}`}
            </button>
            
            {!isDemoMode && (
              <button 
                className="withdraw-modal-button"
                onClick={handleOpenWithdraw}
                disabled={sellingItem}
              >
                WITHDRAW
              </button>
            )}
            
            <button 
              className="sell-modal-close-btn"
              onClick={() => setIsSellModalOpen(false)}
              disabled={sellingItem}
            >
              <img src={modalCloseIcon} alt="Close" className="sell-modal-close-icon" />
            </button>
          </div>
        </div>
      )}

      {isWithdrawModalOpen && selectedItem && (
        <div className="withdraw-modal-overlay" onClick={() => !withdrawing && setIsWithdrawModalOpen(false)}>
          <div className="withdraw-modal-blur-layer"></div>
          <div 
            className={`withdraw-modal-content ${hasActiveWithdraw() ? 'withdraw-modal-content--with-lock' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="withdraw-modal-header">
              <div className="withdraw-modal-star-container">
                <img src={starIcon} alt="Star" className="withdraw-modal-star-icon" />
                <span className="withdraw-modal-star-text">
                  {checkingBalance ? 'Loading...' : `${getUserStars()} / 50 STARS`}
                </span>
              </div>
              <h3 className="withdraw-modal-title">WITHDRAW</h3>
            </div>
            
            <div className="withdraw-modal-body">
              <div className="withdraw-info-box">
                <p className="withdraw-info-text">
                  Withdrawal will be processed within a <span className="withdraw-time">few minutes</span>
                </p>
              </div>
              
              {/* Блок с информацией о locked-статусе */}
              {hasActiveWithdraw() && (
                <div className="withdraw-lock-info">
                  <div className="withdraw-lock-icon">🔒</div>
                  <div className="withdraw-lock-text">
                    <p className="withdraw-lock-title">Item is locked for withdrawal</p>
                    {selectedItem.locked_until && (
                      <p className="withdraw-lock-timer">
                        Unlocks in: {formatLockedUntil(selectedItem.locked_until)}
                      </p>
                    )}
                    {selectedItem.withdraw_req_id && (
                      <p className="withdraw-lock-req-id">
                        Request ID: {selectedItem.withdraw_req_id}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="withdraw-item-preview">
                <div className="withdraw-item-frame">
                  <div className="withdraw-item-content">
                    <img 
                      src={getItemImage(selectedItem)} 
                      alt={selectedItem?.name || 'Item'} 
                      className="withdraw-item-image"
                      onError={(e) => {
                        e.target.src = cardton1;
                      }}
                    />
                    <div className={`withdraw-item-price ${getPriceClass(getItemPrice(selectedItem))}`}>
                      {getItemPrice(selectedItem)}
                    </div>
                    {selectedItem?.name && (
                      <div className="withdraw-item-name">
                        {selectedItem.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="withdraw-action-section">
                <button 
                  className={`withdraw-action-button ${hasActiveWithdraw() ? 'withdraw-action-button--disabled' : ''}`}
                  onClick={handleWithdraw}
                  disabled={withdrawing || hasActiveWithdraw()}
                >
                  {withdrawing ? (
                    'PROCESSING...'
                  ) : hasActiveWithdraw() ? (
                    'ALREADY IN WITHDRAWAL'
                  ) : (
                    <>
                      PAY <span className="withdraw-price">50 STARS</span> AND WITHDRAW
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <button 
              className="withdraw-modal-close-btn"
              onClick={() => setIsWithdrawModalOpen(false)}
              disabled={withdrawing}
            >
              <img src={modalCloseIcon} alt="Close" className="withdraw-modal-close-icon" />
            </button>
          </div>
        </div>
      )}

      {isSellAllModalOpen && (
        <div className="sell-all-modal-overlay" onClick={() => !sellingAll && setIsSellAllModalOpen(false)}>
          <div className="sell-all-modal-blur-layer"></div>
          <div 
            className="sell-all-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="sell-all-modal-title">
              Sell All Items ({getItemsToDisplay().length})<br />
              Total: {calculateTotalValue().toFixed(2)} TON
            </h3>
            
            <div className="sell-all-modal-buttons">
              <button 
                className="sell-all-cancel-button"
                onClick={() => setIsSellAllModalOpen(false)}
                disabled={sellingAll}
              >
                Cancel
              </button>
              <button 
                className="sell-all-confirm-button"
                onClick={handleSellAll}
                disabled={sellingAll}
              >
                {sellingAll ? 'WAIT..' : 'Sell All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}