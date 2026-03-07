import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './Header';
import rocketBack from '../assets/Plinko/Back.png';
import arrow from '../assets/SpinPage/arrow.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import modalCloseIcon from '../assets/Profile/close.png';
import tonIcon from '../assets/MainPage/ton.svg';
import switchr from '../assets/Rocket/switchr.svg';
import '../styles/UpgradeScreen.css';
import { usersApi, upgradeApi } from '../utils/api';
import { useDemo } from '../contexts/DemoContext';

export default function UpgradeScreen({ onNavigate }) {
  const { isDemoMode, demoInventory, addToDemoInventory, removeFromDemoInventory } = useDemo();
  
  const [myItem, setMyItem] = useState(null);
  const [targetItem, setTargetItem] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [arrowRotation, setArrowRotation] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winChance, setWinChance] = useState(0);

  // Состояния для данных из API
  const [myInventory, setMyInventory] = useState([]);
  const [targetOptions, setTargetOptions] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingChance, setIsLoadingChance] = useState(false);
  const [inventoryId, setInventoryId] = useState(null);

  const vibIntervalRef = useRef(null);

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(winChance / 100) * circumference} ${circumference}`;

  // Очистка интервала вибрации при размонтировании
  useEffect(() => {
    return () => {
      if (vibIntervalRef.current) {
        clearInterval(vibIntervalRef.current);
        vibIntervalRef.current = null;
      }
    };
  }, []);

  // Функция вибрации
  const triggerVibration = (type = 'light') => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg && tg.HapticFeedback) {
        if (type === 'impact') {
          tg.HapticFeedback.impactOccurred('light');
        } else if (type === 'notification') {
          tg.HapticFeedback.notificationOccurred('success');
        } else {
          tg.HapticFeedback.impactOccurred('medium');
        }
      }
    } catch (e) {
      console.log('Vibration error:', e);
    }
  };

  // Функция для умной вибрации
  const startSmartVibration = () => {
    if (vibIntervalRef.current) {
      clearTimeout(vibIntervalRef.current);
      vibIntervalRef.current = null;
    }

    const totalDuration = 4500;
    const startTime = Date.now();

    const scheduleVibration = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      const easedProgress = Math.pow(progress, 1.5);
      const currentInterval = 50 + (250 * easedProgress);

      triggerVibration('impact');

      if (elapsed < totalDuration - 100) {
        vibIntervalRef.current = setTimeout(scheduleVibration, currentInterval);
      } else {
        setTimeout(() => {
          triggerVibration('impact');
        }, 100);
      }
    };

    scheduleVibration();
  };

  // Функция для получения правильного URL изображения
  const getImageUrl = (imagePath) => {
    if (!imagePath) return cardton1;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/static/')) {
      return `${(import.meta.env.VITE_BACKEND_URL || 'https://shamefully-gifted-catbird.cloudpub.ru').replace(/\/$/, '')}${imagePath}`;
    }
    return imagePath.startsWith('./') ? imagePath : cardton1;
  };

  // Функция для получения изображения предмета
  const getItemImage = (item) => {
    return getImageUrl(item.image_url || item.img);
  };

  // Функция для форматирования цены (обрезание без округления)
  const formatPrice = (priceStr) => {
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    const currency = priceStr.includes('TON') ? ' TON' : '';
    
    if (priceValue >= 100) {
      const priceString = priceValue.toString();
      const [wholePart, decimalPart] = priceString.split('.');
      
      if (decimalPart) {
        return `${wholePart}.${decimalPart.substring(0, 1)}${currency}`;
      } else {
        return `${wholePart}${currency}`;
      }
    }
    
    return priceStr;
  };

  // Функция для получения класса цены в зависимости от значения
  const getPriceClass = (priceValue) => {
    const value = parseFloat(priceValue);
    if (value >= 501) return 'upgrade-price-gradient-3';
    if (value >= 51) return 'upgrade-price-gradient-2';
    if (value >= 11) return 'upgrade-price-gradient-1';
    return 'upgrade-price-default';
  };

  // Функция для расчета шанса на основе цен (для демо-режима)
  const calculateDemoChance = (sourcePrice, targetPrice) => {
    if (!sourcePrice || !targetPrice) return 0;
    
    // Чем больше разница в цене, тем меньше шанс
    const ratio = sourcePrice / targetPrice;
    
    // Базовый шанс: 50% при равных ценах
    // Уменьшается пропорционально разнице
    let chance = 50 * ratio;
    
    // Ограничиваем шанс от 5% до 80%
    return Math.min(80, Math.max(5, chance));
  };

  // Загрузка инвентаря пользователя
  const loadInventory = async () => {
    if (isDemoMode) {
      console.log('🎮 Демо-режим: загружаем инвентарь из DemoContext');
      setIsLoadingInventory(true);
      
      // Преобразуем демо-инвентарь в нужный формат
      const demoItems = demoInventory.map((item, index) => ({
        ...item,
        inventory_id: item.id || `demo_${index}`,
        index: item.index || `demo_${index}`,
        price_ton: parseFloat(item.price?.replace(/[^\d.-]/g, '')) || item.price_ton || 1,
        isDemo: true
      }));
      
      // Сортируем от дешевого к дорогому
      const sortedInventory = demoItems.sort((a, b) => {
        const priceA = parseFloat(a.price_ton || 0);
        const priceB = parseFloat(b.price_ton || 0);
        return priceA - priceB;
      });
      
      setMyInventory(sortedInventory);
      setIsLoadingInventory(false);
      return;
    }

    setIsLoadingInventory(true);
    try {
      const inventoryData = await usersApi.getInventory();
      console.log('📦 Inventory data received:', inventoryData);
      
      let items = [];
      if (Array.isArray(inventoryData)) {
        items = inventoryData;
      } else if (inventoryData?.inventory) {
        items = inventoryData.inventory;
      } else if (inventoryData?.items) {
        items = inventoryData.items;
      } else if (inventoryData?.data) {
        items = inventoryData.data;
      }
      
      console.log('📦 Processed items:', items);
      
      // Сортируем от дешевого к дорогому
      const sortedInventory = items.sort((a, b) => {
        const priceA = parseFloat(a.price_ton || a.item_value || 0);
        const priceB = parseFloat(b.price_ton || b.item_value || 0);
        return priceA - priceB;
      });
      
      setMyInventory(sortedInventory);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setMyInventory([]);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Загрузка опций апгрейда (целей)
  const loadUpgradeOptions = async (id) => {
    if (!id) return;
    
    // В демо-режиме тоже загружаем с API
    setIsLoadingOptions(true);
    try {
      const data = await upgradeApi.getOptions(id);
      console.log('📦 Upgrade options received:', data);
      
      // data содержит { inventory_id, source_item, options }
      let options = [];
      if (data?.options) {
        options = data.options;
      } else if (Array.isArray(data)) {
        options = data;
      }
      
      console.log('📦 Processed options:', options);
      
      // Сортируем цели от дешевого к дорогому
      const sortedOptions = options.sort((a, b) => {
        const priceA = parseFloat(a.price_ton || 0);
        const priceB = parseFloat(b.price_ton || 0);
        return priceA - priceB;
      });
      
      setTargetOptions(sortedOptions);
    } catch (error) {
      console.error('Failed to load upgrade options:', error);
      setTargetOptions([]);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // Загрузка шанса для выбранной цели
  const loadChance = async (id, targetIndex) => {
    if (!id || !targetIndex) return;
    
    // В демо-режиме рассчитываем шанс на основе цен
    if (isDemoMode && myItem && targetItem) {
      console.log('🎮 Демо-режим: рассчитываем шанс на основе цен');
      setIsLoadingChance(true);
      
      const sourcePrice = myItem.price_ton || 0;
      const targetPrice = targetItem.price_ton || 0;
      
      const chance = calculateDemoChance(sourcePrice, targetPrice);
      setWinChance(chance);
      
      setIsLoadingChance(false);
      return;
    }

    setIsLoadingChance(true);
    try {
      const data = await upgradeApi.calcChance(id, targetIndex);
      console.log('📦 Chance data:', data);
      
      // data содержит { theoretical_chance }
      const chance = data?.theoretical_chance || 0;
      setWinChance(chance);
    } catch (error) {
      console.error('Failed to calculate chance:', error);
    } finally {
      setIsLoadingChance(false);
    }
  };

  // Открытие модалки
  const openModal = (type) => {
    if (isSpinning) return;
    setIsClosing(false);
    setActiveModal(type);

    // Загружаем данные в зависимости от типа модалки
    if (type === 'my') {
      loadInventory();
    } else if (type === 'target' && myItem) {
      loadUpgradeOptions(myItem.inventory_id);
    }
  };

  // Закрытие модалки
  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
    }, 300);
  };

  // Обработчик выбора предмета из модалки
  const handleSelectItem = (item, type) => {
    setIsClosing(true);

    if (type === 'my') {
      // Выбран свой предмет
      setMyItem({
        ...item,
        inventory_id: item.inventory_id || item.id,
        image_url: getItemImage(item),
        price_ton: item.price_ton || item.item_value || 0,
        isDemo: item.isDemo || false
      });
      setInventoryId(item.inventory_id || item.id);
      setTargetItem(null);
      setWinChance(0);
    } else {
      // Выбран целевой предмет
      setTargetItem({
        ...item,
        image_url: getItemImage(item),
        price_ton: item.price_ton || 0,
        isDemo: item.isDemo || false
      });
      // Как только цель выбрана, запрашиваем шанс
      if (inventoryId && item.index) {
        loadChance(inventoryId, item.index);
      }
    }

    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
    }, 300);
  };

  // Обработчик нажатия кнопки UPGRADE
  const handleSpin = async () => {
    if (!myItem || !targetItem || isSpinning || !inventoryId) return;

    setIsSpinning(true);

    // ДЕМО РЕЖИМ - рандомный результат
    if (isDemoMode) {
      console.log('🎮 Демо-режим: симуляция апгрейда');
      
      // Определяем победу случайно на основе шанса
      const random = Math.random() * 100;
      const isWin = random <= winChance;

      // Запускаем вибрацию
      setTimeout(() => {
        startSmartVibration();
      }, 50);

      // Рассчитываем угол остановки
      const coloredDegrees = (winChance / 100) * 360;
      let finalAngle;
      if (isWin) {
        finalAngle = 2 + Math.random() * (coloredDegrees - 4);
      } else {
        finalAngle = coloredDegrees + 2 + Math.random() * (360 - coloredDegrees - 4);
      }

      const rotations = 360 * 6;
      const targetRotation = rotations + finalAngle;
      setArrowRotation(targetRotation);

      // Обрабатываем результат через 4.5 сек
      setTimeout(() => {
        if (vibIntervalRef.current) {
          clearTimeout(vibIntervalRef.current);
          vibIntervalRef.current = null;
        }

        triggerVibration(isWin ? 'notification' : 'impact');

        if (isWin) {
          // Добавляем выигранный предмет в демо-инвентарь
          addToDemoInventory(targetItem);
          setShowWinModal(true);
          
          // Удаляем исходный предмет из демо-инвентаря
          // Находим индекс предмета в демо-инвентаре
          const itemIndex = demoInventory.findIndex(
            item => item.id === myItem.id || item.index === myItem.index
          );
          if (itemIndex !== -1) {
            removeFromDemoInventory(itemIndex);
          }
        }

        // Возврат стрелки
        setTimeout(() => {
          setIsReturning(true);
          const nextFullCircle = Math.ceil(targetRotation / 360) * 360;
          setArrowRotation(nextFullCircle);

          setTimeout(() => {
            setIsReturning(false);
            setArrowRotation(0);
            setShowWinModal(false);
            // Сбрасываем выбор для новой попытки
            setMyItem(null);
            setTargetItem(null);
            setInventoryId(null);
            setWinChance(0);
            setIsSpinning(false);
          }, 1500);
        }, 1000);
      }, 4500);

      return;
    }

    // РЕАЛЬНЫЙ РЕЖИМ
    try {
      // Вызываем метод play
      const data = await upgradeApi.playUpgrade(inventoryId, targetItem.index);
      console.log('📦 Play result:', data);
      
      const isWin = data?.win === true;

      // Запускаем вибрацию
      setTimeout(() => {
        startSmartVibration();
      }, 50);

      // Рассчитываем угол остановки
      const coloredDegrees = (winChance / 100) * 360;
      let finalAngle;
      if (isWin) {
        finalAngle = 2 + Math.random() * (coloredDegrees - 4);
      } else {
        finalAngle = coloredDegrees + 2 + Math.random() * (360 - coloredDegrees - 4);
      }

      const rotations = 360 * 6;
      const targetRotation = rotations + finalAngle;
      setArrowRotation(targetRotation);

      // Останавливаем вибрацию и обрабатываем результат через 4.5 сек
      setTimeout(() => {
        if (vibIntervalRef.current) {
          clearTimeout(vibIntervalRef.current);
          vibIntervalRef.current = null;
        }

        triggerVibration(isWin ? 'notification' : 'impact');

        if (isWin) {
          setShowWinModal(true);
        }

        // Возврат стрелки
        setTimeout(() => {
          setIsReturning(true);
          const nextFullCircle = Math.ceil(targetRotation / 360) * 360;
          setArrowRotation(nextFullCircle);

          setTimeout(() => {
            setIsReturning(false);
            setArrowRotation(0);
            setShowWinModal(false);
            // Сбрасываем выбор для новой попытки
            setMyItem(null);
            setTargetItem(null);
            setInventoryId(null);
            setWinChance(0);
            setIsSpinning(false);
          }, 1500);
        }, 1000);
      }, 4500);

    } catch (error) {
      console.error('Upgrade failed:', error);
      setIsSpinning(false);
    }
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setActiveModal(null);
      setIsClosing(false);
    }
  };

  return (
    <div
      className="upgrade-screen"
      style={{ backgroundImage: `url(${rocketBack})` }}
    >
      <div className="upgrade-header-wrapper">
        <Header onNavigate={onNavigate} variant="upgrade" />
      </div>

      <main className="upgrade-content">
        <div className="upgrade-container">
          <div className="upgrade-wheel-section">
            <div className="upgrade-wheel-wrapper">
              <svg
                className="upgrade-wheel-svg"
                width="280"
                height="280"
                viewBox="0 0 280 280"
              >
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="20"
                />
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="url(#upgradeGradient)"
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  transform="rotate(-90 140 140)"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="upgradeGradient">
                    <stop offset="0%" stopColor="#f1bf28" />
                    <stop offset="100%" stopColor="#db7900" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="upgrade-chance-display">
                {isLoadingChance ? (
                  <span className="upgrade-chance-value">...</span>
                ) : (
                  <>
                    <span className="upgrade-chance-value">
                      {winChance.toFixed(2)}
                    </span>
                    <span className="upgrade-chance-symbol">%</span>
                  </>
                )}
              </div>

              <div
                className={`upgrade-arrow-container ${
                  isSpinning ? 'upgrade-is-spinning' : ''
                } ${isReturning ? 'upgrade-is-returning' : ''}`}
                style={{ transform: `rotate(${arrowRotation}deg)` }}
              >
                <img
                  src={arrow}
                  alt="Arrow"
                  className="upgrade-arrow"
                />
              </div>
            </div>
          </div>

          <div className="upgrade-items-selection">
            <div
              className="upgrade-item-slot"
              onClick={() => openModal('my')}
            >
              <div className="upgrade-slot-title">Your Item</div>
              <div
                className={`upgrade-slot-frame ${
                  myItem ? 'upgrade-has-item' : ''
                }`}
              >
                {myItem ? (
                  <>
                    <img
                      src={myItem.image_url}
                      alt="Mine"
                      className="upgrade-slot-item-image"
                      onError={(e) => e.target.src = cardton1}
                    />
                    <div className="upgrade-slot-item-price">
                      {myItem.price_ton || '??'} TON
                    </div>
                  </>
                ) : (
                  <div className="upgrade-slot-empty-text">
                    + Select
                  </div>
                )}
              </div>
            </div>

            <div className="upgrade-items-divider">
              <img
                src={switchr}
                alt="divider"
                className="upgrade-switch-icon"
              />
            </div>

            <div
              className={`upgrade-item-slot ${
                !myItem ? 'upgrade-disabled' : ''
              }`}
              onClick={() =>
                myItem && openModal('target')
              }
            >
              <div className="upgrade-slot-title">Target Item</div>
              <div
                className={`upgrade-slot-frame ${
                  targetItem ? 'upgrade-has-item' : ''
                }`}
              >
                {targetItem ? (
                  <>
                    <img
                      src={targetItem.image_url}
                      alt="Target"
                      className="upgrade-slot-item-image"
                      onError={(e) => e.target.src = cardton1}
                    />
                    <div className="upgrade-slot-item-price">
                      {targetItem.price_ton || '??'} TON
                    </div>
                  </>
                ) : (
                  <div className="upgrade-slot-empty-text">
                    + Select
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            className="upgrade-action-button"
            disabled={
              !myItem || !targetItem || isSpinning || isLoadingChance
            }
            onClick={handleSpin}
          >
            {isSpinning ? 'UPGRADING...' : 'UPGRADE'}
          </button>
        </div>
      </main>

      {/* Модалка выбора предмета */}
      {activeModal && (
        <div
          className="upgrade-modal-overlay"
          onClick={closeModal}
        >
          <div className="upgrade-modal-blur"></div>
          <div
            className={`upgrade-modal-content ${
              isClosing ? 'upgrade-closing' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
            onAnimationEnd={handleAnimationEnd}
          >
            <h2 className="upgrade-modal-title">
              {activeModal === 'my'
                ? 'SELECT YOUR ITEM'
                : 'SELECT TARGET ITEM'}
            </h2>

            {isLoadingInventory || isLoadingOptions ? (
              <div className="upgrade-modal-loading">
                <div className="upgrade-modal-spinner"></div>
                <p className="upgrade-modal-loading-text">Loading items...</p>
              </div>
            ) : (
              <div className="upgrade-inventory-grid">
                {(activeModal === 'my'
                  ? myInventory
                  : targetOptions
                ).length > 0 ? (
                  (activeModal === 'my'
                    ? myInventory
                    : targetOptions
                  ).map((item) => {
                    const priceValue = parseFloat(item.price_ton || item.item_value || 0);
                    const priceClass = getPriceClass(priceValue);
                    
                    return (
                      <div
                        key={item.index || item.id || Math.random()}
                        className="upgrade-inventory-item"
                        onClick={() =>
                          handleSelectItem(item, activeModal)
                        }
                      >
                        <img
                          src={getItemImage(item)}
                          alt={item.name || 'Item'}
                          className="upgrade-inventory-item-img"
                          onError={(e) => e.target.src = cardton1}
                        />
                        <div className={`upgrade-inventory-item-price ${priceClass}`}>
                          {formatPrice(`${priceValue} TON`)}
                          <img
                            src={tonIcon}
                            alt="ton"
                            className="upgrade-ton-icon-small"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="upgrade-empty-inventory-message">
                    No items available
                  </div>
                )}
              </div>
            )}

            <button
              className="upgrade-modal-close-btn"
              onClick={closeModal}
            >
              <img
                src={modalCloseIcon}
                alt="Close"
                className="upgrade-modal-close-icon"
              />
            </button>
          </div>
        </div>
      )}

      {/* Модалка победы */}
      {showWinModal && targetItem && (
        <div className="upgrade-win-modal-overlay">
          <div className="upgrade-win-modal">
            <h2 className="upgrade-win-title">YOU WON!</h2>
            <img
              src={targetItem.image_url}
              alt="win"
              className="upgrade-win-item-image"
              onError={(e) => e.target.src = cardton1}
            />
            <div className="upgrade-win-price">
              {targetItem.price_ton || '??'} TON
            </div>
          </div>
        </div>
      )}
    </div>
  );
}