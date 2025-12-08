// components/MainScreen.jsx - обновленная версия
import MainLayout from './MainLayout';
import banner from '../assets/MainPage/banner.png';
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
import { useState, useEffect, useRef } from 'react';

const TOTAL = 3;

const cardImages = [cardBack1, cardBack2, cardBack3];
const cardMainImages = [cardMain1, cardMain2, cardMain3];
const cardTonImages = [cardton1, cardton2, cardton3];

export default function MainScreen({ onNavigate, initialCardIndex = 2 }) { // Добавляем пропс initialCardIndex
  const [currentIndex, setCurrentIndex] = useState(initialCardIndex); // Используем initialCardIndex
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(2);
  const cardWidthRef = useRef(240);
  const touchStartX = useRef(0);
  const cooldownRef = useRef(false);

  // Добавляем эффект для обновления состояния при изменении initialCardIndex
  useEffect(() => {
    setCurrentIndex(initialCardIndex);
    setActiveCardIndex(2); // Сбрасываем активную карточку в центр
    setOffset(0); // Сбрасываем смещение
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

  // Добавляем обработчик клика по карточке
  const handleCardClick = (cardId) => {
    if (cooldownRef.current) return;
    
    // Переходим на соответствующую страницу карточки, передавая текущий индекс
    switch(cardId) {
      case 0:
        onNavigate('card1', currentIndex);
        break;
      case 1:
        onNavigate('card2', currentIndex);
        break;
      case 2:
        onNavigate('card3', currentIndex);
        break;
      default:
        break;
    }
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

  const getButtonText = (id) => {
    switch(id) {
      case 0: return '0.1 TON';
      case 1: return '5 TON';
      case 2: return '4 TON';
      default: return '';
    }
  };

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="main">
      <div className="banner-section">
        <img src={banner} alt="banner" className="banner-png" loading="lazy" />
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
                  handleCardClick(id);
                }}
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