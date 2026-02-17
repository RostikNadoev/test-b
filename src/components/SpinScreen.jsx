import React, { useState, useEffect, useRef } from 'react';
import '../styles/SpinScreen.css';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';
import { casesApi, giftsApi } from '../utils/api';

import cardtonDefault from '../assets/MainPage/chest1/ton.png';
import arrow from '../assets/SpinPage/arrow.png';

export default function SpinScreen({ onNavigate, winData }) {
  const { 
    isDemoMode, 
    demoBalance, 
    removeFromDemoBalance, 
    addToDemoBalance, 
    addToDemoInventory 
  } = useDemo();
  
  const { balances, updateBalances } = useBalance();

  // Состояния
  const [isLoading, setIsLoading] = useState(true);
  const [caseItems, setCaseItems] = useState([]);
  const [winningItem, setWinningItem] = useState(null);
  const [frames, setFrames] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [particles, setParticles] = useState([]);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Данные из API
  const [payment, setPayment] = useState(null);
  const [drop, setDrop] = useState(null);
  const [result, setResult] = useState(null);
  const [netChange, setNetChange] = useState(null);
  const [balanceAfter, setBalanceAfter] = useState(null);
  const [inventoryItemId, setInventoryItemId] = useState(null);
  
  const scrollerRef = useRef(null);
  const animationRef = useRef(null);

  // Базовый URL
  const BASE_URL = 'https://shamefully-gifted-catbird.cloudpub.ru';

  // Функция для получения URL изображения
  const getImageUrl = (imagePath) => {
    if (!imagePath) return cardtonDefault;
    
    if (imagePath.startsWith('/static/')) {
      return `${BASE_URL}${imagePath}`;
    }
    
    if (imagePath.trim() === '') {
      return cardtonDefault;
    }
    
    return imagePath;
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Парсим winData
        const data = winData?.winData || winData;
        console.log('📦 SpinScreen winData:', data);
        
        if (!data) {
          console.error('❌ Нет данных для спина');
          setTimeout(() => onNavigate('cases'), 100);
          return;
        }
        
        // Сохраняем данные из API
        if (data.apiResponse) {
          const api = data.apiResponse;
          setPayment(api.payment);
          setDrop(api.drop);
          setResult(api.result);
          setNetChange(api.net_change);
          setBalanceAfter(api.balance_after);
          
          // Обновляем баланс в контексте
          if (api.balance_after && !isDemoMode) {
            updateBalances(api.balance_after);
          }
          
          // ID предмета в инвентаре (если есть)
          if (api.result?.inventory_add?.inventory_item_id) {
            setInventoryItemId(api.result.inventory_add.inventory_item_id);
          }
        }
        
        // Определяем выигрышный предмет
        let targetItem = null;
        
        if (data.winningItem) {
          targetItem = data.winningItem;
        } else if (data.drop) {
          // Формируем из drop
          const dropItem = data.drop;
          targetItem = {
            img: getImageUrl(dropItem.image_url),
            price: data.result?.reward 
              ? `${data.result.reward.amount} ${data.result.reward.currency.toUpperCase()}`
              : dropItem.title || 'Item',
            name: dropItem.title || 'Reward',
            item_type: dropItem.type,
            index: dropItem.case_item_id,
            rarity: 'common',
            image_url: dropItem.image_url,
            price_ton: data.result?.reward?.amount,
            id: dropItem.case_item_id
          };
        } else {
          // Демо режим или заглушка
          targetItem = {
            img: cardtonDefault,
            price: '1 TON',
            name: 'Demo Item',
            item_type: 'reward_ton',
            isDemo: true
          };
        }
        
        setWinningItem(targetItem);
        
        // Загружаем предметы кейса (для фреймов)
        try {
          const caseId = data.caseId || (data.apiResponse?.case_id);
          if (caseId) {
            // Здесь должен быть запрос на получение всех предметов кейса
            // Пока генерируем случайные
            const mockItems = [];
            for (let i = 0; i < 20; i++) {
              mockItems.push({
                img: cardtonDefault,
                price: `${(Math.random() * 5).toFixed(2)} TON`,
                name: `Item ${i + 1}`,
                item_type: Math.random() > 0.5 ? 'reward_ton' : 'tg_gift',
                id: i + 1
              });
            }
            setCaseItems(mockItems);
          }
        } catch (e) {
          console.warn('⚠️ Не удалось загрузить предметы кейса:', e);
          setCaseItems([]);
        }
        
      } catch (error) {
        console.error('❌ Ошибка загрузки данных спина:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [winData, onNavigate, isDemoMode, updateBalances]);

  // Генерация фреймов после загрузки
  useEffect(() => {
    if (isLoading || !winningItem) return;
    
    console.log('🎯 Генерация фреймов для:', winningItem.name);
    const generatedFrames = generateFrames(winningItem);
    setFrames(generatedFrames);
    
    // Запуск спина
    setTimeout(() => {
      startSpin();
    }, 200);
    
  }, [isLoading, winningItem]);

  // Генерация фреймов для анимации
  const generateFrames = (targetItem) => {
    const frames = [];
    const itemsForRandom = caseItems.length > 0 ? caseItems : [];
    
    // 95 случайных фреймов
    for (let i = 0; i < 95; i++) {
      if (itemsForRandom.length > 0) {
        const randomIndex = Math.floor(Math.random() * itemsForRandom.length);
        frames.push(itemsForRandom[randomIndex]);
      } else {
        frames.push({
          img: cardtonDefault,
          price: `${(Math.random() * 5).toFixed(2)} TON`,
          name: 'Random',
          item_type: 'reward_ton'
        });
      }
    }
    
    // Целевой предмет (3-й с конца)
    frames.push(targetItem);
    
    // Еще 2 случайных после
    for (let i = 0; i < 2; i++) {
      if (itemsForRandom.length > 0) {
        const randomIndex = Math.floor(Math.random() * itemsForRandom.length);
        frames.push(itemsForRandom[randomIndex]);
      } else {
        frames.push({
          img: cardtonDefault,
          price: `${(Math.random() * 5).toFixed(2)} TON`,
          name: 'Random',
          item_type: 'reward_ton'
        });
      }
    }
    
    console.log(`📊 Сгенерировано ${frames.length} фреймов, целевой индекс: ${frames.length - 3}`);
    return frames;
  };

  // Запуск спина
  const startSpin = () => {
    console.log('🎰 Запуск спина');
    
    // В демо-режиме списываем баланс
    if (isDemoMode && payment) {
      if (demoBalance < (payment.charged?.amount || 2)) {
        alert("Not enough TON in demo balance!");
        onNavigate('cases');
        return;
      }
      removeFromDemoBalance(payment.charged?.amount || 2);
    }

    setIsSpinning(true);
  };

  // Анимация спина
  useEffect(() => {
    if (!isSpinning || !scrollerRef.current || frames.length === 0) {
      return;
    }

    const scroller = scrollerRef.current;
    const frameElement = scroller.querySelector('.spin-item-frame');
    if (!frameElement) return;
    
    const frameWidth = frameElement.offsetWidth;
    const gap = 10;
    const totalFrameWidth = frameWidth + gap;
    const targetFrameIndex = frames.length - 3;
    const visibleWidth = scroller.offsetWidth;
    const targetScroll = targetFrameIndex * totalFrameWidth - (visibleWidth / 2) + (frameWidth / 2);

    console.log('📐 Анимация:', { targetFrameIndex, targetScroll });

    const duration = 8000;
    const glowStartTime = duration - 1500;
    const startTime = performance.now();
    const startScroll = scroller.scrollLeft;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      scroller.scrollLeft = startScroll + (targetScroll - startScroll) * easedProgress;

      if (elapsed >= glowStartTime) {
        const glowProgress = Math.min((elapsed - glowStartTime) / 1500, 1);
        setGlowOpacity(glowProgress);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        scroller.scrollLeft = targetScroll;
        setGlowOpacity(1);
        setIsSpinning(false);
        
        setTimeout(() => {
          setShowModal(true);
        }, 800);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, frames.length]);

  // Остановка анимации
  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsSpinning(false);
    setGlowOpacity(1);
    setTimeout(() => {
      setShowModal(true);
    }, 100);
  };

  // Пропуск анимации
  const handleSkip = () => {
    stopAnimation();
  };

  // Продажа предмета (для TON наград)
  const handleSell = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isDemoMode && winningItem) {
        // Демо режим
        const priceValue = parseFloat(winningItem.price.replace(/[^\d.-]/g, ''));
        addToDemoBalance(priceValue);
      } else if (winningItem && result?.reward) {
        // Реальный режим - предмет уже начислен, просто переходим назад
        console.log('💰 Предмет продан (уже начислен)');
      }
      
      setShowModal(false);
      onNavigate('cases');
      
    } catch (error) {
      console.error('❌ Ошибка продажи:', error);
      alert('Error selling item');
    } finally {
      setIsProcessing(false);
    }
  };

  // Добавление в инвентарь (для tg_gift)
  const handleAddToInventory = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isDemoMode && winningItem) {
        // Демо режим
        addToDemoInventory(winningItem);
      } else if (inventoryItemId) {
        // В реальном режиме предмет уже в инвентаре
        console.log(`📦 Предмет ${inventoryItemId} уже в инвентаре`);
      }
      
      setShowModal(false);
      onNavigate('cases');
      
    } catch (error) {
      console.error('❌ Ошибка:', error);
      alert('Error adding to inventory');
    } finally {
      setIsProcessing(false);
    }
  };

  // Проверка типа предмета
  const isTonReward = () => {
    if (!winningItem) return false;
    
    if (winningItem.item_type === 'reward_ton') return true;
    if (result?.reward) return true;
    
    return false;
  };

  // Создание снежинок
  useEffect(() => {
    const createParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 25; i++) {
        newParticles.push({
          id: i,
          left: Math.random() * 100,
          size: Math.random() * 4 + 2,
          opacity: Math.random() * 0.4 + 0.2,
          duration: Math.random() * 10 + 10,
          delay: Math.random() * -20,
          sway: Math.random() * 20 - 10
        });
      }
      return newParticles;
    };
    setParticles(createParticles());
  }, []);

  // Класс для цены
  const getPriceClass = (priceStr) => {
    if (!priceStr) return 'item-price';
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'item-price-gradient-3';
    if (priceValue >= 51) return 'item-price-gradient-2';
    if (priceValue >= 11) return 'item-price-gradient-1';
    return 'item-price';
  };

  if (isLoading) {
    return (
      <div className="spin-screen-content loading-spin">
        <div className="spinner"></div>
        <p>Loading spin...</p>
      </div>
    );
  }

  return (
    <div className="spin-screen-content">
      {/* Снежинки */}
      <div className="snow-particles-container">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="snow-particle"
            style={{
              left: `${particle.left}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              transform: `translateX(${particle.sway}px)`
            }}
          />
        ))}
      </div>

      {/* Контейнер с фреймами */}
      <div className="spin-frames-container">
        <div className="spin-arrow-container">
          <img src={arrow} alt="Arrow" className="spin-arrow" loading="lazy" />
        </div>

        <div
          className={`spin-frames-scroller ${isSpinning ? 'spinning' : ''}`}
          ref={scrollerRef}
        >
          {frames.map((content, index) => (
            <div
              key={index}
              className={`spin-item-frame ${
                index === frames.length - 3 && glowOpacity > 0 
                  ? 'spin-item-frame-glowing' 
                  : ''
              }`}
              style={{
                boxShadow: index === frames.length - 3 
                  ? `0 0 20px ${glowOpacity * 10}px rgba(58, 171, 237, ${glowOpacity * 0.8})` 
                  : undefined,
                border: index === frames.length - 3 
                  ? `3px solid rgba(58, 171, 237, ${glowOpacity})` 
                  : undefined
              }}
            >
              <div className="spin-item-content">
                <img 
                  src={content?.img || cardtonDefault} 
                  alt={`Item ${index + 1}`} 
                  className="spin-item-image" 
                  loading="lazy" 
                  onError={(e) => {
                    e.target.src = cardtonDefault;
                  }}
                />
                <div className={getPriceClass(content?.price || '0 TON')}>
                  {content?.price || '0 TON'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Кнопка пропуска */}
      <div className="spin-skip-footer">
        <button 
          className="spin-skip-button" 
          onClick={handleSkip}
          disabled={!isSpinning}
        >
          SKIP
        </button>
      </div>

      {/* Модальное окно с выигрышем */}
      {showModal && winningItem && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="winning-frame-large">
              <div className="winning-content-large">
                <img 
                  src={winningItem.img || cardtonDefault} 
                  alt="Winning Item" 
                  className="winning-image-large" 
                  loading="lazy" 
                  onError={(e) => {
                    e.target.src = cardtonDefault;
                  }}
                />
                <div className={`${getPriceClass(winningItem.price)} winning-price-large`}>
                  {winningItem.price}
                </div>
              </div>
              <div className="purple-border-overlay"></div>
            </div>
            
            {isTonReward() ? (
              <button 
                className="modal-secondary-button modal-single-button" 
                onClick={handleSell}
                disabled={isProcessing}
              >
                {isProcessing ? 'PROCESSING...' : `CLAIM ${winningItem.price}`}
              </button>
            ) : (
              <button 
                className="modal-exit-button" 
                onClick={handleAddToInventory}
                disabled={isProcessing}
              >
                {isProcessing ? 'PROCESSING...' : 'ADD TO INVENTORY'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}