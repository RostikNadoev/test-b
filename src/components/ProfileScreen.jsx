import React, { useState, useEffect } from 'react';
import '../styles/ProfileScreen.css';
import { useDemo } from '../contexts/DemoContext';

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
  
  const { 
    isDemoMode, 
    demoGiftCount, 
    demoInventory, 
    toggleDemoMode,
    removeFromDemoInventory,
    addToDemoBalance,
    formatBalance,
    clearDemoInventory
  } = useDemo();

  // Функция для расчета общей суммы инвентаря
  const calculateTotalValue = () => {
    if (!demoInventory.length) return 0;
    return demoInventory.reduce((total, item) => {
      const priceValue = parseFloat(item.price.replace(/[^\d.-]/g, ''));
      return total + priceValue;
    }, 0);
  };

 // Функция для продажи всех предметов
const handleSellAll = () => {
  const totalValue = calculateTotalValue();
  addToDemoBalance(totalValue);
  // Очищаем инвентарь используя функцию из контекста
  clearDemoInventory();
  setIsSellAllModalOpen(false);
};

  // Эффект для анимации новых предметов
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

  // Функция для перехода к боту
  const handleOpenProfile = () => {
    const username = "bouncegifts";
    const url = `https://t.me/${username}`;
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Обработчик клика по предмету в инвентаре
  const handleItemClick = (item, index) => {
    if (!isDemoMode) return;
    setSelectedItem({ ...item, index });
    setIsSellModalOpen(true);
  };

  // Обработчик продажи предмета
  const handleSellItem = () => {
    if (selectedItem) {
      const priceValue = parseFloat(selectedItem.price.replace(/[^\d.-]/g, ''));
      addToDemoBalance(priceValue);
      removeFromDemoInventory(selectedItem.index);
      setIsSellModalOpen(false);
      setSelectedItem(null);
    }
  };

  // Touch / Mouse handlers for swipe-to-close
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

  return (
    <div className="profile-screen">
      {/* Основной контент профиля */}
      <div className="profile-header">
        <div className="profile-username">Username</div>
        <div className="profile-id">ID: 123456</div>
      </div>

      <div className="profile-main-row">
        <div className="profile-avatar-container">
          <img src={ava} alt="User" className="profile-avatar" loading="lazy" />
        </div>

        <div className="gifts-container">
          <div className="gifts-box">
            <img src={tonGift} alt="TON Gift" className="gifts-icon" />
            <span className="gifts-count">
              {isDemoMode ? demoInventory.length : 27}
            </span>
          </div>

          <button className="add-button" onClick={handleOpenModal}>
            <span className="add-button-text">ADD</span>
          </button>
        </div>
      </div>

      {/* Тумблер DEMO режима */}
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

        {/* Отображаем инвентарь или пустое состояние */}
        {isDemoMode && demoInventory.length > 0 ? (
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

      {/* Модальное окно добавления гифтов */}
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

      {/* Модальное окно продажи предмета */}
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

      {/* Модальное окно продажи всех предметов */}
      {isSellAllModalOpen && (
        <div className="sell-all-modal-overlay" onClick={() => setIsSellAllModalOpen(false)}>
          <div className="sell-all-modal-blur-layer"></div>
          
          <div 
            className="sell-all-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="sell-all-modal-title">Are you sure you want to sell all for {formatBalance(calculateTotalValue())} TON?</h2>
            
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

// Вспомогательная функция для классов цен
const getPriceClass = (priceStr) => {
  const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
  if (priceValue >= 501) return 'item-price-gradient-3';
  if (priceValue >= 51) return 'item-price-gradient-2';
  if (priceValue >= 11) return 'item-price-gradient-1';
  return 'item-price';
};