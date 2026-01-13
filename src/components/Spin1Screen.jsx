// components/Spin1Screen.jsx
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

  const [demoProbabilities, setDemoProbabilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [winningItem, setWinningItem] = useState(null);
  const [frameContents, setFrameContents] = useState([]);
  const scrollerRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false); // Изначально false
  const [targetItemIndex, setTargetItemIndex] = useState(null);
  const [frames, setFrames] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [particles, setParticles] = useState([]);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [hasCharged, setHasCharged] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const animationRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [actualWinningFrameItem, setActualWinningFrameItem] = useState(null);

  // Функция для получения URL изображения из API
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    
    // Если это статические файлы бэкенда, добавляем базовый URL
    if (imagePath.startsWith('/static/')) {
      return `${import.meta.env.VITE_BACKEND_URL || ''}${imagePath}`;
    }
    
    return imagePath;
  };

  // Загрузка данных кейса из API
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Загрузка данных кейса 1 для спина...');
        
        const response = await casesApi.getCaseById(1); // ID: 1
        console.log('📦 Данные кейса для спина:', response);
        
        if (response.items && response.items.length > 0) {
          // Преобразуем данные API в формат для демо
          const items = response.items.map((item, index) => {
            let img;
            let price;
            
            if (item.item_type === 'tg_gift') {
              // Для подарков Telegram используем изображения из API
              img = getImageUrl(item.image_url);
              price = `${item.price_ton} TON`;
            } else if (item.item_type === 'reward_ton') {
              // Для TON наград используем локальную картинку
              img = cardton1;
              price = `${item.price_ton} TON`;
            } else {
              img = cardton1;
              price = '0 TON';
            }
            
            // Определяем вероятность (используем drop_chance из API)
            const probability = (item.drop_chance || 1) / 100;
            
            return {
              img,
              price,
              probability,
              name: item.name || `Item ${index + 1}`,
              item_type: item.item_type,
              id: item.id,
              apiData: item
            };
          });
          
          console.log('✅ Созданы демо предметы:', items);
          setDemoProbabilities(items);
          setFrameContents(items);
          
          // Выбираем случайный предмет для демо
          if (isDemoMode) {
            const randomIndex = Math.floor(Math.random() * items.length);
            console.log('🎮 Демо режим: выбран случайный предмет, индекс:', randomIndex);
            const demoWinningItem = items[randomIndex];
            setWinningItem(demoWinningItem);
            setTargetItemIndex(randomIndex);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки данных кейса:', error);
        // Используем дефолтные демо данные
        setDemoProbabilities(getDefaultDemoProbabilities());
        setFrameContents(getDefaultDemoProbabilities());
      } finally {
        setIsLoading(false);
      }
    };

    // Дефолтные демо данные на случай ошибки
    const getDefaultDemoProbabilities = () => {
      return [
        { img: getImageUrl('/static/gifts/astralshard.png'), price: '150 TON', probability: 0.005, name: 'Astral Shard', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/iongem.png'), price: '80 TON', probability: 0.02, name: 'Ion Gem', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/gemsignet.png'), price: '65 TON', probability: 0.03, name: 'Gem Signet', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/sleighbell.png'), price: '7.5 TON', probability: 0.1, name: 'Sleigh Bell', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/santahat.png'), price: '3 TON', probability: 0.12, name: 'Santa Hat', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/cookieheart.png'), price: '2.5 TON', probability: 0.15, name: 'Cookie Heart', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/tamagadget.png'), price: '2.5 TON', probability: 0.15, name: 'Tama Gadget', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/candycane.png'), price: '1.7 TON', probability: 0.15, name: 'Candy Cane', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/xmasstocking.png'), price: '1.7 TON', probability: 0.15, name: 'Xmas Stocking', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/lolpop.png'), price: '1.7 TON', probability: 0.15, name: 'Lol Pop', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/bdaycandle.png'), price: '1.7 TON', probability: 0.15, name: 'B-day Candle', item_type: 'tg_gift' },
        { img: getImageUrl('/static/gifts/deskcalendar.png'), price: '1.7 TON', probability: 0.15, name: 'Desk Calendar', item_type: 'tg_gift' },
        { img: cardton1, price: '1.5 TON', probability: 0.15, name: 'TON 1.5', item_type: 'reward_ton' },
        { img: cardton1, price: '1 TON', probability: 0.15, name: 'TON 1', item_type: 'reward_ton' },
        { img: cardton1, price: '0.5 TON', probability: 0.15, name: 'TON 0.5', item_type: 'reward_ton' }
      ];
    };

    loadCaseData();
  }, []);

  // Инициализация и запуск спина
  useEffect(() => {
    if (isLoading) return;
    
    console.log('🔄 Spin1Screen инициализация, isDemoMode:', isDemoMode, 'winData:', winData);
    
    const initializeData = () => {
      if (!isDemoMode && winData?.winItem) {
        // Реальный режим - используем данные из API
        console.log('📡 Реальный режим, данные API:', winData.winItem);
        const apiItem = winData.winItem;
        
        // Создаем выигранный предмет из данных API
        const winItem = createWinningItemFromAPI(apiItem);
        console.log('🎯 Создан выигрышный предмет:', winItem);
        setWinningItem(winItem);
        
        // Создаем содержимое фреймов с выигранным предметом
        const contents = [...demoProbabilities];
        // Заменяем случайный предмет на выигранный
        const randomIndex = Math.floor(Math.random() * Math.min(contents.length, 10));
        contents[randomIndex] = winItem;
        setFrameContents(contents);
        
        // Запоминаем индекс выигранного предмета
        console.log('📊 Индекс выигрышного предмета:', randomIndex);
        setTargetItemIndex(randomIndex);
      } else if (isDemoMode && demoProbabilities.length > 0) {
        // Демо режим - используем демо предметы
        console.log('🎮 Демо режим: используем демо предметы');
        setFrameContents(demoProbabilities);
        const randomIndex = getRandomItemIndex();
        setWinningItem(demoProbabilities[randomIndex]);
        setTargetItemIndex(randomIndex);
      } else if (demoProbabilities.length > 0) {
        // Fallback - если нет winData в реальном режиме
        console.log('⚠️ Нет winData, используем демо предметы как fallback');
        setFrameContents(demoProbabilities);
        const randomIndex = getRandomItemIndex();
        setWinningItem(demoProbabilities[randomIndex]);
        setTargetItemIndex(randomIndex);
      }
      
      setIsInitialized(true);
      
      // Запускаем спин с небольшой задержкой
      setTimeout(() => {
        console.log('▶️ Запуск спина через 300мс');
        startSpin();
      }, 200);
    };

    initializeData();
  }, [isDemoMode, winData, demoProbabilities, isLoading]);

  // Создание выигранного предмета из данных API
  const createWinningItemFromAPI = (apiItem) => {
    console.log('🔧 Создание предмета из API:', apiItem);
    
    let img = cardton1;
    let price = '0 TON';
    let itemType = 'unknown';
    let name = apiItem.name || 'Item';
    
    if (apiItem.item_type === 'reward_ton') {
      // Для TON наград используем TON иконку
      itemType = 'reward_ton';
      img = cardton1;
      price = `${apiItem.price_ton || 0} TON`;
    } else if (apiItem.item_type === 'tg_gift') {
      // Для Telegram подарков используем изображения из API
      itemType = 'tg_gift';
      price = `${apiItem.price_ton || 0} TON`;
      img = getImageUrl(apiItem.image_url);
    }
    
    const result = {
      img,
      price,
      name,
      item_type: itemType,
      id: apiItem.id,
      apiData: apiItem
    };
    
    console.log('✅ Создан предмет:', result);
    return result;
  };

  // Проверка, является ли предмет TON наградой
  const isCardtonItem = (item) => {
    return item && (item.item_type === 'reward_ton' || item.img === cardton1);
  };

  const getRandomItemIndex = () => {
    console.log('🎲 Получение случайного индекса, targetItemIndex:', targetItemIndex);
    
    if (!isDemoMode && targetItemIndex !== null) {
      console.log('🎯 Используем предустановленный индекс:', targetItemIndex);
      return targetItemIndex;
    }

    if (isDemoMode && demoProbabilities.length > 0) {
      // В демо режиме выбираем по вероятностям
      const rand = Math.random();
      let cumulativeProbability = 0;
      for (let i = 0; i < demoProbabilities.length; i++) {
        cumulativeProbability += demoProbabilities[i].probability;
        if (rand <= cumulativeProbability) {
          console.log('🎮 Демо выбран индекс:', i);
          return i;
        }
      }
      const lastIndex = demoProbabilities.length - 1;
      console.log('🎮 Демо выбран последний индекс:', lastIndex);
      return lastIndex;
    }

    const randomIndex = Math.floor(Math.random() * frameContents.length);
    console.log('🎲 Случайный индекс:', randomIndex);
    return randomIndex;
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

  // Генерация фреймов для анимации
  const generateFrames = (targetIndex = 0) => {
    console.log('🖼️ Генерация фреймов, targetIndex:', targetIndex);
    
    const frames = [];
    
    // Получаем выигрышный предмет из frameContents
    const winningItemFromContents = frameContents[targetIndex] || frameContents[0];
    console.log('🎯 Выигрышный предмет для фреймов:', winningItemFromContents);
    setActualWinningFrameItem(winningItemFromContents);
    
    // 95 случайных фреймов
    for (let i = 0; i < 95; i++) {
      const randomIndex = Math.floor(Math.random() * frameContents.length);
      frames.push(frameContents[randomIndex]);
    }
    
    // Целевой фрейм (выигранный предмет) - третий с конца
    console.log('🎯 Добавляем целевой фрейм (3й с конца):', winningItemFromContents);
    frames.push(winningItemFromContents);
    
    // Еще 2 случайных фрейма
    for (let i = 0; i < 2; i++) {
      const randomIndex = Math.floor(Math.random() * frameContents.length);
      frames.push(frameContents[randomIndex]);
    }
    
    console.log('📊 Всего фреймов:', frames.length);
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

    const resultIndex = getRandomItemIndex();
    console.log('🎲 Результат индекса:', resultIndex);
    setTargetItemIndex(resultIndex);
    const newFrames = generateFrames(resultIndex);
    setFrames(newFrames);
    setIsSpinning(true);
    console.log('✅ Спин запущен, isSpinning:', true);
  };

  // Остановка анимации
  const stopAnimation = () => {
    console.log('🛑 Остановка анимации');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsSpinning(false);
    // Немедленно показываем модалку
    setGlowOpacity(1);
    setTimeout(() => {
      console.log('📱 Показываем модалку');
      setShowModal(true);
    }, 100);
  };

  // Пропуск анимации
  const handleSkip = () => {
    console.log('⏭️ Пропуск анимации');
    stopAnimation();
  };

  // Продажа предмета
  const handleSell = async () => {
    if (isProcessing) return;
    console.log('💰 Продажа предмета');
    setIsProcessing(true);

    // Используем actualWinningFrameItem вместо winningItem
    const itemToSell = actualWinningFrameItem || winningItem;
    
    if (isDemoMode && itemToSell) {
      // Демо режим
      const priceValue = parseFloat(itemToSell.price.replace(/[^\d.-]/g, ''));
      console.log('🎮 Демо продажа за:', priceValue);
      addToDemoBalance(priceValue);
      setShowModal(false);
      onNavigate('card1');
    } else if (itemToSell && !isDemoMode && itemToSell.apiData) {
      // Реальный режим - продажа через API
      try {
        console.log('📡 Реальная продажа:', itemToSell.apiData);
        // TODO: Реализовать API для продажи
        alert(`Successfully sold for ${itemToSell.price}!`);
        setShowModal(false);
        onNavigate('card1');
      } catch (error) {
        console.error('❌ Ошибка продажи:', error);
        alert('Error selling item. Please try again.');
      }
    }

    setIsProcessing(false);
  };

  // Добавление в инвентарь
  const handleAddToInventory = async () => {
    if (isProcessing) return;
    console.log('🎒 Добавление в инвентарь');
    setIsProcessing(true);

    // Используем actualWinningFrameItem вместо winningItem
    const itemToAdd = actualWinningFrameItem || winningItem;
    
    if (isDemoMode && itemToAdd) {
      // Демо режим
      console.log('🎮 Демо добавление в инвентарь');
      addToDemoInventory(itemToAdd);
      setShowModal(false);
      onNavigate('card1');
    } else if (winData?.inventoryAdded && !isDemoMode) {
      // В реальном режиме предмет уже добавлен через API
      console.log('📡 Предмет уже добавлен через API');
      setShowModal(false);
      onNavigate('card1');
    } else {
      // Если не добавлен, добавляем
      console.log('📝 Добавление в инвентарь');
      setShowModal(false);
      onNavigate('card1');
    }

    setIsProcessing(false);
  };

  // Анимация спина (работает и в демо и в реальном режиме)
  useEffect(() => {
    console.log('🎬 Эффект анимации, isSpinning:', isSpinning, 'targetItemIndex:', targetItemIndex, 'frames.length:', frames.length);
    
    if (!isSpinning || targetItemIndex === null || !scrollerRef.current || frames.length === 0) {
      console.log('⏸️ Анимация не запускается, условия:',
        'isSpinning:', isSpinning,
        'targetItemIndex:', targetItemIndex,
        'scrollerRef:', !!scrollerRef.current,
        'frames.length:', frames.length
      );
      return;
    }

    const scroller = scrollerRef.current;
    const frameElement = scroller.querySelector('.spin-item-frame');
    if (!frameElement) {
      console.log('❌ Не найден элемент фрейма');
      return;
    }
    
    const frameWidth = frameElement.offsetWidth;
    const gap = 10;
    const totalFrameWidth = frameWidth + gap;
    const targetFrameIndex = frames.length - 3; // Третий с конца
    const visibleWidth = scroller.offsetWidth;
    const targetScroll = targetFrameIndex * totalFrameWidth - (visibleWidth / 2) + (frameWidth / 2);

    console.log('📐 Параметры анимации:', {
      frameWidth,
      gap,
      totalFrameWidth,
      targetFrameIndex,
      visibleWidth,
      targetScroll
    });

    const duration = 8000; // Укороченная анимация
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
        // Показываем модалку с задержкой
        setTimeout(() => {
          console.log('📱 Показываем модалку после анимации');
          setShowModal(true);
        }, 800);
      }
    };

    console.log('▶️ Запуск анимации спина');
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      console.log('🧹 Очистка анимации');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, targetItemIndex, frames.length]);

  // Класс для цены
  const getPriceClass = (priceStr) => {
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'item-price-gradient-3';
    if (priceValue >= 51) return 'item-price-gradient-2';
    if (priceValue >= 11) return 'item-price-gradient-1';
    return 'item-price';
  };

  // Индекс целевого фрейма (третий с конца)
  const getTargetFrameIndex = () => frames.length - 3;

  // Получаем предмет из целевого фрейма
  const getWinningFrameItem = () => {
    const targetIndex = getTargetFrameIndex();
    return frames[targetIndex] || winningItem;
  };

  // Определяем, что показывать в модалке
  const modalItem = actualWinningFrameItem || getWinningFrameItem() || winningItem;

  if (isLoading) {
    return (
      <div className="spin-screen-content loading-spin">
        <div className="spinner"></div>
        <p>Loading spin data...</p>
      </div>
    );
  }

  console.log('🔄 Рендер Spin1Screen:', {
    isSpinning,
    isDemoMode,
    showModal,
    winningItem,
    actualWinningFrameItem,
    modalItem,
    framesLength: frames.length,
    glowOpacity
  });

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
                index === getTargetFrameIndex() && glowOpacity > 0 
                  ? 'spin-item-frame-glowing' 
                  : ''
              }`}
              style={{
                boxShadow: index === getTargetFrameIndex() 
                  ? `0 0 20px ${glowOpacity * 10}px rgba(58, 171, 237, ${glowOpacity * 0.8})` 
                  : undefined,
                border: index === getTargetFrameIndex() 
                  ? `3px solid rgba(58, 171, 237, ${glowOpacity})` 
                  : undefined
              }}
            >
              <div className="spin-item-content">
                <img 
                  src={content.img} 
                  alt={`Item ${index + 1}`} 
                  className="spin-item-image" 
                  loading="lazy" 
                  onError={(e) => {
                    console.error(`Failed to load image for item:`, content);
                    e.target.src = cardton1;
                  }}
                />
                <div className={getPriceClass(content.price)}>
                  {content.price}
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
      {showModal && modalItem && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="winning-frame-large">
              <div className="winning-content-large">
                <img 
                  src={modalItem.img} 
                  alt="Winning Item" 
                  className="winning-image-large" 
                  loading="lazy" 
                  onError={(e) => {
                    console.error(`Failed to load winning image:`, modalItem);
                    e.target.src = cardton1;
                  }}
                />
                <div className={`${getPriceClass(modalItem.price)} winning-price-large`}>
                  {modalItem.price}
                </div>
              </div>
              <div className="purple-border-overlay"></div>
            </div>
            
            {isCardtonItem(modalItem) ? (
              <button 
                className="modal-secondary-button modal-single-button" 
                onClick={handleSell}
                disabled={isProcessing}
              >
                {isProcessing ? 'PROCESSING...' : `SELL FOR ${modalItem.price}`}
              </button>
            ) : (
              <>
                <button 
                  className="modal-secondary-button" 
                  onClick={handleSell}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'PROCESSING...' : `SELL FOR ${modalItem.price}`}
                </button>
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