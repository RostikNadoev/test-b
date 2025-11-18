import React, { useState } from 'react';
import CardScreen from './CardScreen';
import cardBack1 from '../assets/MainPage/chest1/back.png';
import cardMain1 from '../assets/MainPage/chest1/main.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import star from '../assets/MainPage/star.svg';
import tonIcon from '../assets/Ton.svg';

import item1 from '../assets/MainPage/chest1/in/1-1.png';
import item2 from '../assets/MainPage/chest1/in/1-2.png';
import item3 from '../assets/MainPage/chest1/in/1-3.png';
import item4 from '../assets/MainPage/chest1/in/1-4.png';
import item5 from '../assets/MainPage/chest1/in/1-5.png';
import item6 from '../assets/MainPage/chest1/in/1-6.png';
import item7 from '../assets/MainPage/chest1/in/1-7.png';
import item8 from '../assets/MainPage/chest1/in/1-8.png';
import item9 from '../assets/MainPage/chest1/in/1-9.png';
import item10 from '../assets/MainPage/chest1/in/1-10.png';
import item11 from '../assets/MainPage/chest1/in/1-11.png';
import item12 from '../assets/MainPage/chest1/in/1-12.png';

export default function Card1Screen({ onNavigate, currentCardIndex = 0 }) {
  const [isSwitched, setIsSwitched] = useState(false);

  const handleCardClick = () => {
    console.log('Card 1 clicked! Opening spin page...');
    onNavigate('spin1'); // Переход на страницу спина 1
  };

  const handleSwitchClick = () => {
    setIsSwitched(!isSwitched);
  };

  // Определяем содержимое рамок для карты 1
  const frameContents = [
    { img: item1, price: '150 TON' },  // 1
    { img: item2, price: '80 TON' },   // 2
    { img: item3, price: '65 TON' },   // 3
    { img: item4, price: '7.5 TON' },  // 4
    { img: item5, price: '3 TON' },    // 5
    { img: item6, price: '2.5 TON' },  // 6
    { img: item7, price: '2.5 TON' },  // 7
    { img: item8, price: '1.7 TON' },  // 8
    { img: item9, price: '1.7 TON' },  // 9
    { img: item10, price: '1.7 TON' },   // 10
    { img: item11, price: '1.7 TON' },   // 11
    { img: item12, price: '1.7 TON' }, // 12
    { img: cardton1, price: '1.5 TON' },// 14
    { img: cardton1, price: '1 TON' }, // 15
    { img: cardton1, price: '0.5 TON' } // 16
  ];

  // Функция для получения класса стиля цены
  const getPriceClass = (priceStr) => {
    // Извлекаем числовое значение из строки цены
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));

    if (priceValue >= 501) {
      return 'item-price-gradient-3'; // Желто-оранжевый
    } else if (priceValue >= 51) {
      return 'item-price-gradient-2'; // Фиолетовый
    } else if (priceValue >= 11) {
      return 'item-price-gradient-1'; // Синий
    } else {
      return 'item-price'; // Обычный белый с синим бордером
    }
  };

  const frames = frameContents.map((content, index) => (
    <div key={index} className="item-frame">
      <div className="item-content">
        <img 
          src={content.img} 
          alt={`Item ${index + 1}`} 
          className="item-image"
          loading="lazy"
        />
        <div className={getPriceClass(content.price)}>{content.price}</div>
      </div>
    </div>
  ));

  return (
    <CardScreen 
      onNavigate={onNavigate}
      currentCardIndex={currentCardIndex}
    >
      <div className="card-detail-container">
        <div className="card-detail card-detail-0">
          <img 
            src={cardBack1}
            alt="Card 1" 
            className="card-detail-image"
            loading="lazy"
          />
          <img 
            src={cardMain1}
            alt="Main" 
            className="card-detail-main-image"
            loading="lazy"
          />
          <img 
            src={cardton1}
            alt="TON" 
            className="card-detail-ton-image"
            loading="lazy"
          />
          
          {/* Основная (правая) кнопка */}
          <div 
            className={`card-detail-button card-1-button-right card1-right ${isSwitched ? 'card1-right-switched' : ''}`} 
            onClick={handleCardClick}
          >
            <span className="card-detail-button-text">
              {isSwitched ? (
                <>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                  <span className="card-detail-button-number">100</span>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                </>
              ) : (
                <>
                  <span className="card-detail-button-number">2.5</span>
                  <span className="card-detail-button-ton">TON</span>
                </>
              )}
            </span>
          </div>
          
          {/* Переключатель (левая) кнопка */}
          <div 
            className={`card-detail-button card-1-button-left card1-left ${isSwitched ? 'card1-left-switched' : ''}`} 
            onClick={handleSwitchClick}
          >
            <span className="card-detail-button-text">
              {isSwitched ? (
                <img src={tonIcon} alt='ton' className='card-detail-star-icon-white' loading='lazy'/>
              ) : (
                <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
              )}
            </span>
          </div>
        </div>

        {/* Контейнер для рамок */}
        <div className="items-container">
          {frames}
        </div>
        
        {/* Блюр-зона над кнопкой Close */}
        <div className="blur-overlay"></div>
      </div>
    </CardScreen>
  );
}