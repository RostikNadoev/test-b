// components/MainScreen.jsx - полная исправленная версия
import MainLayout from './MainLayout';
import middle from '../assets/MainPage/middle.png';
import cardBack1 from '../assets/MainPage/chest1/back.png';
import cardBack2 from '../assets/MainPage/chest1/back2.png';
import cardBack3 from '../assets/MainPage/chest1/back3.png';
import cardMain1 from '../assets/MainPage/chest1/main.png';
import cardMain2 from '../assets/MainPage/chest2/main.png'; 
import cardMain3 from '../assets/MainPage/chest3/main.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import cardton2 from '../assets/MainPage/chest2/ton.png';
import cardton3 from '../assets/MainPage/chest3/ton.png';
// Импортируем изображения для кнопок
import gameCard1 from '../assets/MainPage/game-card-1.png';
import { useState, useEffect, useRef } from 'react';
import { casesApi } from '../utils/api';

const TOTAL = 3;

const cardImages = [cardBack1, cardBack2, cardBack3];
const cardMainImages = [cardMain1, cardMain2, cardMain3];
const cardTonImages = [cardton1, cardton2, cardton3];

export default function MainScreen({ onNavigate, initialCardIndex = 2 }) {
  const [currentIndex, setCurrentIndex] = useState(initialCardIndex);
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(2);
  const [casesData, setCasesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const cardWidthRef = useRef(240);
  const touchStartX = useRef(0);
  const cooldownRef = useRef(false);

  // Загружаем данные кейсов с бэка
  useEffect(() => {
    const loadCases = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Loading cases from API...');
        
        const cases = await casesApi.getAllCases();
        console.log('📦 Raw API response for cases:', cases);
        
        if (!cases || !Array.isArray(cases)) {
          console.warn('⚠️ Cases data is not an array:', cases);
          // Используем дефолтные данные для демо
          const defaultCases = [
            { id: 1, name: "Light Blue Case", price_ton: 2, price_stars: 200, is_active: true },
            { id: 2, name: "Purple Case", price_ton: 4, price_stars: 400, is_active: true },
            { id: 3, name: "Blue Case", price_ton: 5, price_stars: 500, is_active: true }
          ];
          setCasesData(defaultCases);
          return;
        }
        
        // Фильтруем активные кейсы
        const activeCases = cases.filter(caseItem => caseItem.is_active);
        console.log('✅ Active cases from API:', activeCases);
        
        if (activeCases.length === 0) {
          console.warn('⚠️ No active cases found, using defaults');
          // Используем дефолтные данные
          const defaultCases = [
            { id: 1, name: "Light Blue Case", price_ton: 2, price_stars: 200, is_active: true },
            { id: 2, name: "Purple Case", price_ton: 4, price_stars: 400, is_active: true },
            { id: 3, name: "Blue Case", price_ton: 5, price_stars: 500, is_active: true }
          ];
          setCasesData(defaultCases);
          return;
        }
        
        // Сортируем по ID
        activeCases.sort((a, b) => a.id - b.id);
        console.log('📊 Sorted active cases:', activeCases);
        
        // Берем первые 3 кейса
        const firstThreeCases = activeCases.slice(0, 3);
        console.log('🎯 First three cases:', firstThreeCases);
        
        setCasesData(firstThreeCases);
        
      } catch (error) {
        console.error('❌ Error loading cases:', error);
        // Используем дефолтные данные в случае ошибки
        const defaultCases = [
          { id: 1, name: "Light Blue Case", price_ton: 2, price_stars: 200, is_active: true },
          { id: 2, name: "Purple Case", price_ton: 4, price_stars: 400, is_active: true },
          { id: 3, name: "Blue Case", price_ton: 5, price_stars: 500, is_active: true }
        ];
        setCasesData(defaultCases);
      } finally {
        setIsLoading(false);
      }
    };

    loadCases();
  }, []);

  useEffect(() => {
    setCurrentIndex(initialCardIndex);
    setActiveCardIndex(2);
    setOffset(0);
  }, [initialCardIndex]);

  useEffect(() => {
    const updateCardWidth = () => {
      const card = document.querySelector('.card');
      if (card) {
        const style = window.getComputedStyle(card);
        const width = parseFloat(style.width);
        const gap = 15;
        cardWidthRef.current = width + gap;
      }
    };
    updateCardWidth();
    window.addEventListener('resize', updateCardWidth);
    return () => window.removeEventListener('resize', updateCardWidth);
  }, []);

  const handleAnimationEnd = () => {
    if (Math.abs(offset) >= cardWidthRef.current) {
      const direction = offset > 0 ? -1 : 1;
      setCurrentIndex((prev) => (prev + direction + TOTAL) % TOTAL);
      setOffset(0);
      setTimeout(() => setActiveCardIndex(2), 10);
    }
    setIsAnimating(false);
  };

  const startCooldown = () => {
    cooldownRef.current = true;
    setIsAnimating(true);
    setTimeout(() => {
      cooldownRef.current = false;
    }, 900);
  };

  const goToNext = () => {
    if (cooldownRef.current) return;
    startCooldown();
    setOffset((prev) => prev - cardWidthRef.current);
    setActiveCardIndex(-1);
  };

  const goToPrev = () => {
    if (cooldownRef.current) return;
    startCooldown();
    setOffset((prev) => prev + cardWidthRef.current);
    setActiveCardIndex(-1);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (cooldownRef.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 10) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
  };

  const handleMouseDown = (e) => {
    touchStartX.current = e.clientX;
  };

  const handleMouseUp = (e) => {
    if (cooldownRef.current) return;
    const diff = touchStartX.current - e.clientX;
    if (Math.abs(diff) > 10) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
  };

  const handleCardClick = (cardId) => {
    if (cooldownRef.current) return;
    
    console.log(`🖱️ Card ${cardId} clicked`);
    console.log(`📊 Cases data:`, casesData);
    
    // Получаем данные кейса по позиции (0, 1, 2)
    const caseData = casesData[cardId];
    console.log(`🔍 Case data for position ${cardId}:`, caseData);
    
    if (!caseData) {
      console.warn(`❌ No case data found for position ${cardId}`);
      alert('Case data is loading. Please try again in a moment.');
      return;
    }
    
    if (!caseData.is_active) {
      console.warn(`❌ Case ${caseData.id} is not active`);
      alert('This case is not available at the moment');
      return;
    }
    
    console.log(`✅ Case ${caseData.id} is available, navigating...`);
    
    // Переходим на соответствующую страницу карточки
    // cardId соответствует позиции: 0 -> card1, 1 -> card2, 2 -> card3
    switch(cardId) {
      case 0:
        console.log(`🎯 Navigating to card1 with API ID: ${caseData.id}`);
        onNavigate('card1', currentIndex);
        break;
      case 1:
        console.log(`🎯 Navigating to card2 with API ID: ${caseData.id}`);
        onNavigate('card2', currentIndex);
        break;
      case 2:
        console.log(`🎯 Navigating to card3 with API ID: ${caseData.id}`);
        onNavigate('card3', currentIndex);
        break;
      default:
        console.warn(`⚠️ Unknown card ID: ${cardId}`);
        break;
    }
  };

  // Обработчик клика по картинкам-кнопкам
  const handleImageButtonClick = (buttonNumber) => {
    console.log(`🎯 Image button ${buttonNumber} clicked`);
    // Пока что просто логируем, можно добавить функционал позже
    alert(`Image button ${buttonNumber} clicked - functionality coming soon!`);
  };

  const getCards = () => {
    const cards = [];
    for (let i = -1; i <= 3; i++) {
      const id = (currentIndex + i + TOTAL) % TOTAL;
      cards.push(id);
    }
    return cards;
  };

  const cards = getCards();

  const getMainImageClass = (id) => {
    switch(id) {
      case 0: return 'card-main-image card-main-1';
      case 1: return 'card-main-image card-main-2';
      case 2: return 'card-main-image card-main-3';
      default: return 'card-main-image';
    }
  };

  // Функция для получения текста кнопки из данных API
  const getButtonText = (cardPosition) => {
    const caseData = casesData[cardPosition];
    console.log(`💰 Getting price for card position ${cardPosition}:`, caseData);
    
    if (!caseData) {
      console.log(`⚠️ No case data for position ${cardPosition}, showing loading...`);
      return '... TON';
    }
    
    const priceTon = caseData.price_ton;
    console.log(`💵 Price TON for position ${cardPosition}: ${priceTon}`);
    
    if (priceTon === undefined || priceTon === null) {
      console.warn(`❌ price_ton is undefined for case ${caseData.id}`);
      return '0.0 TON';
    }
    
    // Форматируем цену: если целое число, показываем без десятичных, иначе с 1-2 знаками
    let formattedPrice;
    if (Number.isInteger(priceTon)) {
      formattedPrice = priceTon.toString();
    } else {
      // Для дробных чисел показываем 1-2 знака после запятой
      formattedPrice = parseFloat(priceTon).toFixed(2);
      // Убираем лишние нули в конце
      formattedPrice = formattedPrice.replace(/\.?0+$/, '');
    }
    
    return `${formattedPrice} TON`;
  };

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="main">
      {/* Заменяем баннер на две картинки-кнопки */}
      <div className="banner-images-container">
        <div 
          className="banner-image-button"
          onClick={() => handleImageButtonClick(1)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard1} 
            alt="Game Card 1" 
            className="banner-image"
            loading="lazy"
          />
        </div>
        
        <div 
          className="banner-image-button button-2"
          onClick={() => handleImageButtonClick(2)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard1} 
            alt="Game Card 2 (temporary)" 
            className="banner-image"
            loading="lazy"
          />
        </div>
      </div>

      <div
        className="cards-slider"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <div
          className="cards-slider-inner"
          style={{
            transform: `translateX(${offset}px)`,
            transition: isAnimating ? 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)' : 'none',
          }}
          onTransitionEnd={handleAnimationEnd}
        >
          {cards.map((id, index) => (
            <div 
              key={index}
              className={`card card-${id} ${index === activeCardIndex ? 'card--active' : ''}`}
              onClick={() => handleCardClick(id)}
              style={{ cursor: 'pointer' }}
            >
              <img 
                src={cardImages[id]}
                alt={`Card ${id + 1}`} 
                className="card-image"
                loading="lazy"
              />
              {cardMainImages[id] && (
                <img 
                  src={cardMainImages[id]}
                  alt="Main" 
                  className={getMainImageClass(id)}
                  loading="lazy"
                />
              )}
              {cardTonImages[id] && (
                <img 
                  src={cardTonImages[id]}
                  alt="TON" 
                  className="card-ton-image"
                  loading="lazy"
                />
              )}
              <div 
                className="card-button" 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`🎯 Card button clicked for card ${id}`);
                  handleCardClick(id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="card-button-text">
                  <span className="card-button-number">
                    {getButtonText(id).split(' ')[0]}
                  </span>
                  <span className="card-button-ton">
                    {' '}TON
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <img 
          src={middle} 
          alt="decoration" 
          className="middle-decoration"
          loading="lazy"
        />
      </div>
    </MainLayout>
  );
}