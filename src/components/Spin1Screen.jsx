import React, { useState, useEffect, useRef } from 'react';
import '../styles/SpinScreen.css';
import { useDemo } from '../contexts/DemoContext';
import { casesApi } from '../utils/api';

import cardton1 from '../assets/MainPage/chest1/ton.png';
import arrow from '../assets/SpinPage/arrow.png';

export default function Spin1Screen({ onNavigate, winData }) {
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

  // Функция для получения URL изображения из API
  const getImageUrl = (imagePath) => {
    if (!imagePath) return cardton1;
    
    if (imagePath.startsWith('/static/')) {
      return `${import.meta.env.VITE_BACKEND_URL || ''}${imagePath}`;
    }
    
    if (imagePath.trim() === '') {
      return cardton1;
    }
    
    return imagePath;
  };

  // Загрузка данных кейса из API
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Загрузка данных кейса 1 для спина...');
        
        const response = await casesApi.getCaseById(1);
        console.log('📦 Данные кейса загружены, items count:', response.items?.length);
        
        if (response.items && response.items.length > 0) {
          const items = response.items.map((item) => {
            let img = cardton1;
            let price = '0 TON';
            
            if (item.item_type === 'tg_gift') {
              img = getImageUrl(item.image_url);
              price = `${item.price_ton} TON`;
            } else if (item.item_type === 'reward_ton') {
              // Для TON наград используем имя как цену
              price = item.name || `${item.price_ton} TON`;
            }
            
            return {
              img,
              price,
              name: item.name || 'Item',
              item_type: item.item_type,
              id: item.id,
              image_url: item.image_url,
              item_index: item.item_index, // Ключевое поле для сопоставления
              index: item.item_index, // Дублируем для удобства
              rarity: item.rarity || 'common',
              price_ton: item.price_ton // Сохраняем цену
            };
          });
          
          console.log('✅ Создано предметов из API:', items.length);
          setCaseItems(items);
        } else {
          console.error('⚠️ Нет предметов в ответе API!');
          setCaseItems([]);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки данных кейса:', error);
        setCaseItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCaseData();
  }, []);

  // Инициализация выигрышного предмета и запуск спина
  useEffect(() => {
    if (isLoading) return;
    
    console.log('🔄 Spin1Screen инициализация');
    console.log('📦 winData получены:', winData);
    console.log('📦 caseItems загружены:', caseItems.length);
    
    const initializeData = () => {
      let targetItem = null;
      
      // ПРОВЕРКА: winData может быть объектом с ключом winData (из Card1Screen) или просто winData
      const actualWinData = winData?.winData || winData;
      const isDemoFromParams = winData?.isDemo === true;
      
      console.log('🔍 actualWinData:', actualWinData);
      console.log('🔍 isDemoFromParams:', isDemoFromParams);
      
      // ПРОВЕРКА: ДЕМО РЕЖИМ (из параметров или контекста)
      if ((isDemoMode || isDemoFromParams) && !actualWinData?.winningItem) {
        console.log('🎮 ДЕМО РЕЖИМ: Используем случайный предмет');
        if (caseItems.length > 0) {
          const randomIndex = Math.floor(Math.random() * caseItems.length);
          targetItem = { ...caseItems[randomIndex], isDemo: true };
        } else {
          targetItem = {
            img: cardton1,
            price: '1 TON',
            name: 'Demo Item',
            item_type: 'reward_ton',
            isDemo: true
          };
        }
      } 
      // РЕАЛЬНЫЙ РЕЖИМ С winData
      else if (!isDemoMode && actualWinData?.winningItem) {
        console.log('📡 РЕАЛЬНЫЙ РЕЖИМ: Используем winData');
        
        const apiItem = actualWinData.winningItem;
        const apiIndex = apiItem.index; // index из ответа /open
        
        console.log('🔍 Предмет из /open:', {
          индекс: apiIndex,
          имя: apiItem.name,
          цена: apiItem.price,
          тип: apiItem.item_type,
          картинка: apiItem.img
        });
        
        // Используем готовый предмет из winData (уже обработанный в Card1Screen)
        targetItem = {
          img: apiItem.img || cardton1,
          price: apiItem.price || '0 TON',
          name: apiItem.name || 'Reward',
          item_type: apiItem.item_type || 'reward_ton',
          index: apiIndex,
          item_index: apiIndex,
          rarity: apiItem.rarity || 'common',
          fromApi: true,
          isRealWin: true,
          originalWinData: actualWinData
        };
        
        console.log('🎯 ИТОГОВЫЙ выигрышный предмет:', {
          имя: targetItem.name,
          цена: targetItem.price,
          изображение: targetItem.img
        });
        
      } 
      // РЕАЛЬНЫЙ РЕЖИМ БЕЗ winData (ошибка)
      else if (!isDemoMode && !actualWinData) {
        console.error('❌ РЕАЛЬНЫЙ РЕЖИМ: нет winData, возвращаем к кейсу');
        alert('Ошибка загрузки данных выигрыша. Пожалуйста, попробуйте снова.');
        setTimeout(() => onNavigate('card1'), 100);
        return;
      }
      
      // Устанавливаем выигрышный предмет
      setWinningItem(targetItem);
      
      // Генерируем фреймы для анимации
      const generatedFrames = generateFrames(targetItem);
      setFrames(generatedFrames);
      
      // Запускаем спин
      setTimeout(() => {
        console.log('▶️ ЗАПУСК СПИНА');
        console.log('🎯 Целевой предмет:', targetItem?.name, targetItem?.price);
        startSpin();
      }, 200);
    };

    initializeData();
  }, [isLoading, isDemoMode, winData, caseItems, onNavigate]);

  // Генерация фреймов для анимации
  const generateFrames = (targetItem) => {
    console.log('🖼️ Генерация фреймов для предмета:', targetItem?.name, 'цена:', targetItem?.price);
    
    const frames = [];
    
    // Используем caseItems для случайных фреймов
    const itemsForRandom = caseItems.length > 0 ? caseItems : [];
    
    // 95 случайных фреймов (прокрутка)
    for (let i = 0; i < 95; i++) {
      if (itemsForRandom.length > 0) {
        const randomIndex = Math.floor(Math.random() * itemsForRandom.length);
        frames.push(itemsForRandom[randomIndex]);
      } else {
        // Fallback если нет предметов
        frames.push({
          img: cardton1,
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
        frames.push(itemsForRandom[randomIndex]);
      }
    }
    
    console.log('📊 Всего фреймов:', frames.length);
    console.log('🎯 Индекс целевого фрейма:', frames.length - 3);
    
    // Логируем последние 5 фреймов для проверки
    console.log('🔍 Последние 5 фреймов:', frames.slice(-5).map(f => ({
      name: f.name,
      price: f.price
    })));
    
    return frames;
  };

  // Запуск спина
  const startSpin = () => {
    console.log('🎰 Запуск спина, isDemoMode:', isDemoMode);
    
    if (isDemoMode && !hasCharged) {
      if (demoBalance < 2) {
        alert("Not enough TON in demo balance!");
        onNavigate('card1');
        return;
      }
      removeFromDemoBalance(2);
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
      targetItem: frames[targetFrameIndex]?.name,
      targetPrice: frames[targetFrameIndex]?.price
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
        console.log('🎯 Проверка - целевой фрейм:', {
          имя: frames[targetFrameIndex]?.name,
          цена: frames[targetFrameIndex]?.price
        });
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

    if (isDemoMode && winningItem) {
      const priceValue = parseFloat(winningItem.price.replace(/[^\d.-]/g, ''));
      addToDemoBalance(priceValue);
      setShowModal(false);
      onNavigate('card1');
    } else if (winningItem && !isDemoMode) {
      setShowModal(false);
      onNavigate('card1');
    }

    setIsProcessing(false);
  };

  // Добавление в инвентарь (только для tg_gift)
  const handleAddToInventory = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (isDemoMode && winningItem) {
      addToDemoInventory(winningItem);
      setShowModal(false);
      onNavigate('card1');
    } else if (winningItem && !isDemoMode) {
      setShowModal(false);
      onNavigate('card1');
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
                  src={content?.img || cardton1} 
                  alt={`Item ${index + 1}`} 
                  className="spin-item-image" 
                  loading="lazy" 
                  onError={(e) => {
                    e.target.src = cardton1;
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
                  src={winningItem.img || cardton1} 
                  alt="Winning Item" 
                  className="winning-image-large" 
                  loading="lazy" 
                  onError={(e) => {
                    e.target.src = cardton1;
                  }}
                />
                <div className={`${getPriceClass(winningItem.price)} winning-price-large`}>
                  {winningItem.price}
                </div>
              </div>
              <div className="purple-border-overlay"></div>
            </div>
            
            {isCardtonItem(winningItem) ? (
              <button 
                className="modal-secondary-button modal-single-button" 
                onClick={handleSell}
                disabled={isProcessing}
              >
                {isProcessing ? 'PROCESSING...' : `SELL FOR ${winningItem.price}`}
              </button>
            ) : (
              <>
                <button 
                  className="modal-exit-button" 
                  onClick={handleAddToInventory}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'PROCESSING...' : 'ADD TO INVENTORY'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}