import '../styles/Header.css';
import { useState, useRef, useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { authApi, formatBalance, formatUsername } from '../utils/api';

import ava from '../assets/MainPage/ava.jpg';
import ton from '../assets/MainPage/ton.svg';
import add_balance from '../assets/MainPage/add_balance.svg';
import modalCloseIcon from '../assets/Profile/close.svg';

export default function Header({ onNavigate }) {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [user, setUser] = useState(null);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  
  const { isDemoMode, demoBalance } = useDemo();

  // Загружаем данные пользователя
  useEffect(() => {
    const loadUserData = () => {
      const userData = authApi.getCurrentUser();
      if (userData) {
        setUser(userData);
        console.log('👤 Загружены данные пользователя в Header:', userData.username);
      } else {
        console.log('👤 Данные пользователя не найдены в Header');
      }
    };

    // Загружаем данные при монтировании
    loadUserData();
    
    // Слушаем изменения в localStorage для синхронизации между вкладками
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        console.log('🔄 Обнаружено изменение данных пользователя в localStorage');
        loadUserData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Слушаем кастомные события для обновления данных
    const handleUserUpdate = () => {
      console.log('🔄 Получено событие обновления пользователя');
      loadUserData();
    };
    
    window.addEventListener('userUpdated', handleUserUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  // Функция для форматирования баланса
  const getFormattedBalance = () => {
    if (isDemoMode) {
      return formatBalance(demoBalance);
    }
    
    if (user?.balance_ton !== undefined) {
      return formatBalance(user.balance_ton);
    }
    
    return '0.00';
  };

  // Получаем username пользователя
  const getUsername = () => {
    if (isDemoMode) return 'Demo User';
    
    if (user) {
      return formatUsername(user.username, user.name);
    }
    
    return 'Loading...';
  };

  // Получаем аватар пользователя
  const getAvatar = () => {
    if (isDemoMode) return ava;
    
    if (user?.photo_url) {
      // Проверяем, является ли URL валидным
      try {
        new URL(user.photo_url);
        return user.photo_url;
      } catch (error) {
        console.warn('⚠️ Некорректный URL аватара:', user.photo_url);
        return ava;
      }
    }
    
    return ava;
  };

  // Обновление данных пользователя (для кнопки обновления, если нужно)
  const refreshUserData = async () => {
    if (isDemoMode) return;
    
    try {
      console.log('🔄 Обновляем данные пользователя...');
      const data = await authApi.getMe();
      setUser(data.user);
      
      // Отправляем событие для других компонентов
      window.dispatchEvent(new Event('userUpdated'));
      
      console.log('✅ Данные пользователя обновлены');
    } catch (error) {
      console.error('❌ Ошибка обновления данных пользователя:', error);
    }
  };

  const handleOpenBalanceModal = () => {
    if (isDemoMode) {
      console.log('ℹ️ В демо-режиме пополнение баланса недоступно');
      return;
    }
    
    console.log('💰 Открываем модальное окно пополнения баланса');
    setIsBalanceModalOpen(true);
    setIsClosing(false);
    
    // Фокусируемся на поле ввода
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleCloseBalanceModal = () => {
    console.log('❌ Закрываем модальное окно пополнения баланса');
    setIsClosing(true);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setIsBalanceModalOpen(false);
      setIsClosing(false);
      setTopUpAmount('');
      console.log('✅ Модальное окно полностью закрыто');
    }
  };

  const handleTopUp = () => {
    if (!topUpAmount || isDemoMode) return;
    
    console.log(`💰 Пополнение баланса на ${topUpAmount} TON`);
    
    // Здесь будет логика пополнения баланса через API
    // Пока просто закрываем модалку
    handleCloseBalanceModal();
    
    // Можно показать уведомление об успехе
    alert(`Баланс успешно пополнен на ${topUpAmount} TON`);
  };

  const handleInputChange = (e) => {
    // Разрешаем только цифры
    const value = e.target.value.replace(/[^\d]/g, '');
    setTopUpAmount(value);
  };

  const handleModalClick = (e) => {
    // Если клик не по инпуту, снимаем фокус
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      inputRef.current.blur();
    }
  };

  // Обработчик клика по аватару или имени пользователя
  const handleUserClick = () => {
    console.log('👤 Переход в профиль пользователя');
    onNavigate('profile');
  };

  return (
    <>
      <header className="header-outer">
        <div className="header-inner">
          <div className="user-info">
            {/* Аватар пользователя */}
            <img 
              src={getAvatar()} 
              alt="User" 
              className="user-avatar" 
              loading="lazy" 
              onClick={handleUserClick}
              title={isDemoMode ? "Демо-режим" : "Перейти в профиль"}
            />
            
            {/* Имя пользователя */}
            <span 
              className="user-username" 
              onClick={handleUserClick}
              title={isDemoMode ? "Демо-режим" : user?.telegram_id ? `ID: ${user.telegram_id}` : "Пользователь"}
            >
              {getUsername()}
            </span>

            {/* Баланс TON */}
            <div className="balance-container" title={`Баланс: ${getFormattedBalance()} TON`}>
              <img src={ton} alt="TON" className="balance-icon" />
              <span className="balance-amount">
                {getFormattedBalance()}
              </span>
            </div>

            {/* Кнопка пополнения баланса */}
            <div 
              className="add_balance-button" 
              onClick={handleOpenBalanceModal}
              title={isDemoMode ? "В демо-режиме недоступно" : "Пополнить баланс"}
            >
              <img src={add_balance} alt="add" className="add_balance-icon" />
            </div>
            
            {/* Кнопка обновления данных (опционально) */}
            {!isDemoMode && user && (
              <button 
                className="refresh-user-btn"
                onClick={refreshUserData}
                title="Обновить данные"
              >
                ↻
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Модальное окно пополнения баланса (только в обычном режиме) */}
      {isBalanceModalOpen && !isDemoMode && (
        <div className="balance-modal-overlay">
          <div className="balance-modal-blur-layer"></div>

          <div
            ref={modalRef}
            className={`balance-modal-content ${isClosing ? 'closing' : ''}`}
            onClick={handleModalClick}
            onAnimationEnd={handleAnimationEnd}
          >
            <div className="balance-modal-body">
              <h2 className="balance-modal-title">Top up Ton balance</h2>
              <p className="balance-modal-instruction">Enter the amount</p>
              
              <div className="balance-input-container">
                <input
                  ref={inputRef}
                  type="text"
                  className="balance-input"
                  value={topUpAmount}
                  onChange={handleInputChange}
                  placeholder="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="6"
                  autoFocus
                />
                <span className="balance-input-suffix">TON</span>
              </div>

              <div className="balance-presets">
                <button className="balance-preset-btn" onClick={() => setTopUpAmount('10')}>10</button>
                <button className="balance-preset-btn" onClick={() => setTopUpAmount('50')}>50</button>
                <button className="balance-preset-btn" onClick={() => setTopUpAmount('100')}>100</button>
                <button className="balance-preset-btn" onClick={() => setTopUpAmount('500')}>500</button>
              </div>

              <button 
                className={`balance-modal-action-btn ${!topUpAmount ? 'disabled' : ''}`}
                onClick={handleTopUp}
                disabled={!topUpAmount}
              >
                <span className="balance-btn-text">
                  Top up 
                  {topUpAmount && (
                    <>
                      <img src={ton} alt="TON" className="balance-btn-ton-icon" />
                      {topUpAmount}
                    </>
                  )}
                </span>
              </button>
              
              <p className="balance-modal-note">
                Текущий баланс: <strong>{getFormattedBalance()} TON</strong>
              </p>
            </div>

            <button className="balance-modal-close-btn" onClick={handleCloseBalanceModal}>
              <img src={modalCloseIcon} alt="Close" className="balance-modal-close-icon" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}