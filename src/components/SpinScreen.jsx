import React, { useState, useEffect, useRef } from 'react';
import '../styles/SpinScreen.css';
import { useDemo } from '../contexts/DemoContext';
import { casesApi } from '../utils/api';

// Импортируем изображения для разных кейсов
import cardton1 from '../assets/MainPage/chest1/ton.png';
import cardton2 from '../assets/MainPage/chest2/ton.png';
import cardton3 from '../assets/MainPage/chest3/ton.png';
import arrow from '../assets/SpinPage/arrow.png';

// Маппинг изображений по ID кейса
const caseImages = {
  1: cardton1,
  2: cardton2,
  3: cardton3,
  4: cardton1,
  5: cardton2,
  6: cardton3
};

export default function SpinScreen({ onNavigate, caseId, winData, isDemo }) {
  const { 
    isDemoMode, 
    demoBalance, 
    removeFromDemoBalance, 
    addToDemoBalance, 
    addToDemoInventory 
  } = useDemo();

  const [isLoading, setIsLoading] = useState(true);
  const [caseItems, setCaseItems] = useState([]);
  const [winningItem, setWinningItem] = useState(null);
  const [frames, setFrames] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [particles, setParticles] = useState([]);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [hasCharged, setHasCharged] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const scrollerRef = useRef(null);
  const animationRef = useRef(null);

  // Определяем, какое изображение использовать для этого кейса
  const getDefaultImage = () => {
    return caseImages[caseId] || cardton1;
  };

  // Функция для получения URL изображения из API
  const getImageUrl = (imagePath) => {
    if (!imagePath) return getDefaultImage();
    
    if (imagePath.startsWith('/static/')) {
      return `https://shamefully-gifted-catbird.cloudpub.ru${imagePath}`;
    }
    
    if (imagePath.trim() === '') {
      return getDefaultImage();
    }
    
    return imagePath;
  };

  // Загрузка данных кейса из API
  useEffect(() => {
    const loadCaseData = async () => {
      if (!caseId && !winData) {
        console.error('❌ Нет caseId или winData');
        return;
      }

      try {
        setIsLoading(true);
        
        // Если есть winData, используем его для получения caseId
        const targetCaseId = winData?.caseId || caseId;
        
        if (targetCaseId) {
          console.log(`🔄 Загрузка данных кейса ${targetCaseId} для спина...`);
          const response = await casesApi.getCaseById(targetCaseId);
          console.log('📦 Данные кейса загружены, items count:', response.items?.length);
          
          if (response.items && response.items.length > 0) {
            // Преобразуем предметы в формат для отображения
            const items = response.items.map((item) => {
              // Определяем изображение
              let img = getDefaultImage();
              if (item.item_type === 'tg_gift' && item.image_url) {
                img = getImageUrl(item.image_url);
              }
              
              // Определяем цену
              let price = '0 TON';
              if (item.item_type === 'tg_gift') {
                price = `${item.price_ton} TON`;
              } else if (item.item_type === 'reward_ton') {
                price = item.name || `${item.price_ton} TON`;
              }
              
              return {
                img,
                price,
                name: item.name || 'Item',
                item_type: item.item_type,
                id: item.id,
                image_url: item.image_url,
                item_index: item.item_index,
                index: item.item_index,
                rarity: item.rarity || 'common',
                price_ton: item.price_ton
              };
            });
            
            console.log('✅ Создано предметов из API:', items.length);
            setCaseItems(items);
          }
        }
        
        // Если есть winData, устанавливаем выигрышный предмет
        if (winData?.winningItem) {
          console.log('📦 Используем winData для кейса');
          setWinningItem(winData.winningItem);
        }
        
      } catch (error) {
        console.error('❌ Ошибка загрузки данных кейса:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCaseData();
  }, [caseId, winData]);

  // Инициализация выигрышного предмета и запуск спина
  useEffect(() => {
    if (isLoading) return;
    
    console.log('🔄 SpinScreen инициализация');
    console.log('📦 winData получены:', winData);
    console.log('📦 caseItems загружены:', caseItems.length);
    
    const initializeData = () => {
      let targetItem = null;
      
      // Проверяем, демо ли режим
      const isDemoActive = isDemoMode || isDemo === true;
      
      // ПРОВЕРКА: ДЕМО РЕЖИМ
      if (isDemoActive && !winData?.winningItem) {
        console.log('🎮 ДЕМО РЕЖИМ: Используем случайный предмет из caseItems');
        if (caseItems.length > 0) {
          const randomIndex = Math.floor(Math.random() * caseItems.length);
          targetItem = { ...caseItems[randomIndex], isDemo: true };
        } else {
          targetItem = {
            img: getDefaultImage(),
            price: '1 TON',
            name: 'Demo Item',
            item_type: 'reward_ton',
            isDemo: true
          };
        }
      } 
      // РЕАЛЬНЫЙ РЕЖИМ С winData
      else if (!isDemoActive && winData?.winningItem) {
        console.log('📡 РЕАЛЬНЫЙ РЕЖИМ: Используем winData');
        
        const apiItem = winData.winningItem;
        
        console.log('🔍 Предмет из /open:', {
          индекс: apiItem.index,
          имя: apiItem.name,
          цена: apiItem.price,
          тип: apiItem.item_type
        });
        
        targetItem = {
          img: apiItem.img || getDefaultImage(),
          price: apiItem.price || '0 TON',
          name: apiItem.name || 'Reward',
          item_type: apiItem.item_type || 'reward_ton',
          index: apiItem.index,
          item_index: apiItem.index,
          rarity: apiItem.rarity || 'common',
          fromApi: true,
          isRealWin: true,
          originalWinData: winData
        };
        
        console.log('🎯 ИТОГОВЫЙ выигрышный предмет:', {
          имя: targetItem.name,
          цена: targetItem.price
        });
      } 
      // РЕАЛЬНЫЙ РЕЖИМ БЕЗ winData (ошибка)
      else if (!isDemoActive && !winData) {
        console.error('❌ РЕАЛЬНЫЙ РЕЖИМ: нет winData, возвращаем к кейсам');
        alert('Ошибка загрузки данных выигрыша. Пожалуйста, попробуйте снова.');
        setTimeout(() => onNavigate('cases'), 100);
        return;
      }
      
      setWinningItem(targetItem);
      
      // Генерируем фреймы, используя caseItems для случайных предметов
      const generatedFrames = generateFrames(targetItem);
      setFrames(generatedFrames);
      
      setTimeout(() => {
        console.log('▶️ ЗАПУСК СПИНА');
        console.log('🎯 Целевой предмет:', targetItem?.name, targetItem?.price);
        startSpin(targetItem);
      }, 200);
    };

    initializeData();
  }, [isLoading, isDemoMode, isDemo, winData, caseItems]);

  // Генерация фреймов для анимации
  const generateFrames = (targetItem) => {
    console.log('🖼️ Генерация фреймов для предмета:', targetItem?.name);
    
    const frames = [];
    
    // Если есть caseItems, используем их для случайных фреймов
    const itemsForRandom = caseItems.length > 0 ? caseItems : [];
    
    // 95 случайных фреймов (прокрутка)
    for (let i = 0; i < 95; i++) {
      if (itemsForRandom.length > 0) {
        const randomIndex = Math.floor(Math.random() * itemsForRandom.length);
        const randomItem = itemsForRandom[randomIndex];
        
        frames.push({
          img: randomItem.img,
          price: randomItem.price,
          name: randomItem.name,
          item_type: randomItem.item_type,
          id: randomItem.id,
          index: randomItem.index,
          rarity: randomItem.rarity
        });
      } else {
        frames.push({
          img: getDefaultImage(),
          price: '0.5 TON',
          name: 'Default',
          item_type: 'reward_ton'
        });
      }
    }
    
    // Целевой фрейм (выигранный предмет) - третий с конца
    console.log('🎯 Добавляем ЦЕЛЕВОЙ фрейм (3й с конца):', targetItem?.name);
    frames.push(targetItem);
    
    // Еще 2 случайных фрейма после выигрышного
    for (let i = 0; i < 2; i++) {
      if (itemsForRandom.length > 0) {
        const randomIndex = Math.floor(Math.random() * itemsForRandom.length);
        const randomItem = itemsForRandom[randomIndex];
        
        frames.push({
          img: randomItem.img,
          price: randomItem.price,
          name: randomItem.name,
          item_type: randomItem.item_type,
          id: randomItem.id,
          index: randomItem.index,
          rarity: randomItem.rarity
        });
      } else {
        frames.push({
          img: getDefaultImage(),
          price: '0.5 TON',
          name: 'Default',
          item_type: 'reward_ton'
        });
      }
    }
    
    console.log('📊 Всего фреймов:', frames.length);
    console.log('🎯 Индекс целевого фрейма:', frames.length - 3);
    
    return frames;
  };

  // Запуск спина
  const startSpin = (targetItem) => {
    console.log('🎰 Запуск спина');
    
    // В демо-режиме списываем баланс
    if ((isDemoMode || isDemo) && !hasCharged && targetItem) {
      const price = parseFloat(targetItem.price) || 2;
      if (demoBalance < price) {
        alert("Not enough TON in demo balance!");
        onNavigate('cases');
        return;
      }
      removeFromDemoBalance(price);
      setHasCharged(true);
    }

    setIsSpinning(true);
    console.log('✅ Спин запущен');
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

    console.log('📐 Параметры анимации:', {
      targetFrameIndex,
      targetItem: frames[targetFrameIndex]?.name
    });

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
        console.log('✅ Анимация завершена');
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

  // Продажа предмета (только для TON наград)
  const handleSell = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if ((isDemoMode || isDemo) && winningItem) {
      const priceValue = parseFloat(winningItem.price.replace(/[^\d.-]/g, ''));
      addToDemoBalance(priceValue);
      setShowModal(false);
      onNavigate('cases');
    } else if (winningItem && !isDemoMode) {
      setShowModal(false);
      onNavigate('cases');
    }

    setIsProcessing(false);
  };

  // Добавление в инвентарь (только для tg_gift)
  const handleAddToInventory = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if ((isDemoMode || isDemo) && winningItem) {
      addToDemoInventory(winningItem);
      setShowModal(false);
      onNavigate('cases');
    } else if (winningItem && !isDemoMode) {
      setShowModal(false);
      onNavigate('cases');
    }

    setIsProcessing(false);
  };

  // Проверка, является ли предмет TON наградой
  const isCardtonItem = (item) => {
    return item && item.item_type === 'reward_ton';
  };

  // Создание снежинок
  useEffect(() => {
    const createParticles = () => {
      const newParticles = [];
      const particleCount = 25;
      for (let i = 0; i < particleCount; i++) {
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
        <p>Loading spin data...</p>
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
                  src={content?.img || getDefaultImage()} 
                  alt={`Item ${index + 1}`} 
                  className="spin-item-image" 
                  loading="lazy" 
                  onError={(e) => {
                    console.error('Failed to load image:', content?.img);
                    e.target.src = getDefaultImage();
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

      {/* Модальное окно с выигрышем - УНИКАЛЬНЫЕ КЛАССЫ */}
      {showModal && winningItem && (
        <div className="spin-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="spin-modal-content">
            <div className="spin-winning-frame-large">
              <div className="spin-winning-content-large">
                <img 
                  src={winningItem.img || getDefaultImage()} 
                  alt="Winning Item" 
                  className="spin-winning-image-large" 
                  loading="lazy" 
                  onError={(e) => {
                    e.target.src = getDefaultImage();
                  }}
                />
                <div className={`${getPriceClass(winningItem.price)} spin-winning-price-large`}>
                  {winningItem.price}
                </div>
              </div>
              <div className="spin-purple-border-overlay"></div>
            </div>
            
            {isCardtonItem(winningItem) ? (
              <button 
                className="spin-modal-secondary-button spin-modal-single-button" 
                onClick={handleSell}
                disabled={isProcessing}
              >
                {isProcessing ? 'PROCESSING...' : `SELL FOR ${winningItem.price}`}
              </button>
            ) : (
              <button 
                className="spin-modal-exit-button" 
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