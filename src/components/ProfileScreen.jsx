// components/ProfileScreen.jsx - обновленная версия
import React, { useState, useEffect } from 'react';
import '../styles/ProfileScreen.css';
import { useDemo } from '../contexts/DemoContext';
import { authApi, usersApi } from '../utils/api';

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
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { 
    isDemoMode, 
    demoInventory, 
    toggleDemoMode,
    removeFromDemoInventory,
    addToDemoBalance,
    clearDemoInventory
  } = useDemo();

  // Загружаем данные пользователя и инвентарь
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Загружаем данные пользователя
        const user = authApi.getCurrentUser();
        setUserData(user);
        
        if (!isDemoMode) {
          // Загружаем инвентарь из API
          try {
            const inventoryData = await usersApi.getInventory();
            setInventory(inventoryData || []);
            setInventoryCount(inventoryData?.length || 0);
          } catch (error) {
            console.error('Error loading inventory:', error);
            setInventory([]);
            setInventoryCount(0);
          }
        } else {
          // В демо-режиме используем локальный инвентарь
          setInventory(demoInventory);
          setInventoryCount(demoInventory.length);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [isDemoMode, demoInventory.length]);

  // Функция для продажи предмета через API
  const handleSellItemApi = async (itemId) => {
    try {
      // TODO: Добавить API для продажи предметов
      // const response = await usersApi.sellItem(itemId);
      console.log('Selling item via API:', itemId);
      return true;
    } catch (error) {
      console.error('Error selling item:', error);
      return false;
    }
  };

  const calculateTotalValue = () => {
    if (isDemoMode) {
      if (!demoInventory.length) return 0;
      return demoInventory.reduce((total, item) => {
        const priceValue = parseFloat(item.price.replace(/[^\d.-]/g, ''));
        return total + priceValue;
      }, 0);
    } else {
      if (!inventory.length) return 0;
      return inventory.reduce((total, item) => {
        return total + (item.price_ton || 0);
      }, 0);
    }
  };

  const handleSellAll = async () => {
    if (isDemoMode) {
      const totalValue = calculateTotalValue();
      addToDemoBalance(totalValue);
      clearDemoInventory();
      setIsSellAllModalOpen(false);
    } else {
      // TODO: Реализовать продажу всех предметов через API
      console.log('Selling all items via API');
      setIsSellAllModalOpen(false);
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
    if (isDemoMode) {
      setSelectedItem({ ...item, index });
      setIsSellModalOpen(true);
    } else {
      // В реальном режиме можно показывать детали предмета
      console.log('Real mode item click:', item);
    }
  };

  const handleSellItem = async () => {
    if (selectedItem) {
      if (isDemoMode) {
        const priceValue = parseFloat(selectedItem.price.replace(/[^\d.-]/g, ''));
        addToDemoBalance(priceValue);
        removeFromDemoInventory(selectedItem.index);
      } else {
        // Продажа через API
        // const success = await handleSellItemApi(selectedItem.id);
        // if (success) {
        //   // Обновляем инвентарь
        //   const updatedInventory = inventory.filter(item => item.id !== selectedItem.id);
        //   setInventory(updatedInventory);
        //   setInventoryCount(updatedInventory.length);
        // }
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
    return inventoryCount;
  };

  // Функция для получения изображения предмета
  const getItemImage = (item) => {
    if (isDemoMode) {
      return item.img;
    } else {
      // В реальном режиме используем image_url из API или дефолтное изображение
      return item.image_url || gift;
    }
  };

  // Функция для получения цены предмета
  const getItemPrice = (item) => {
    if (isDemoMode) {
      return item.price;
    } else {
      return `${item.price_ton || 0} TON`;
    }
  };

  // Функция для получения класса цены
  const getPriceClass = (priceStr) => {
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'item-price-gradient-3';
    if (priceValue >= 51) return 'item-price-gradient-2';
    if (priceValue >= 11) return 'item-price-gradient-1';
    return 'item-price';
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

      {/* Контролы */}
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
      </div>

      <main className="profile-content">
        <div className='gift-balance-container'>
          <span className='gift-balance-title'>GIFT BALANCE:</span>
          {((isDemoMode && demoInventory.length > 0) || (!isDemoMode && inventory.length > 0)) && (
            <button 
              className="sell-all-button"
              onClick={() => setIsSellAllModalOpen(true)}
            >
              SELL ALL
            </button>
          )}
        </div>

        {/* Отображаем инвентарь */}
        {inventoryCount > 0 ? (
          <div className="inventory-container">
            <div className="items-grid">
              {(isDemoMode ? demoInventory : inventory).map((item, index) => (
                <div 
                  key={index} 
                  className={`inventory-item-frame ${newItems.has(index) ? 'new-item-pulse' : ''}`}
                  onClick={() => handleItemClick(item, index)}
                >
                  <div className="inventory-item-content">
                    <img 
                      src={getItemImage(item)} 
                      alt={`Item ${index + 1}`} 
                      className="inventory-item-image"
                      loading="lazy"
                    />
                    <div className={`inventory-item-price ${getPriceClass(getItemPrice(item))}`}>
                      {getItemPrice(item)}
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
        )}
      </main>

      {/* Футер */}
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
                <span className="profile-modal-username-link">
                  @bouncegifts
                </span>
                &ensp;bot, and the gift balance will be updated
              </p>
            </div>
            <button className="profile-modal-action-btn">
              ADD GIFT
            </button>
            <button className="profile-modal-close-btn" onClick={handleCloseModal}>
              <img src={modalCloseIcon} alt="Close" className="profile-modal-close-icon" />
            </button>
          </div>
        </div>
      )}

      {/* Остальные модальные окна аналогично */}
    </div>
  );
}